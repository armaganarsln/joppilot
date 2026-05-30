import React, { useState, useEffect, useRef } from 'react';
import { Camera, Compass, Battery, MapPin, AlertOctagon, RotateCcw, Volume2, Truck, ChevronDown, Check, CornerRightUp } from 'lucide-react';
import { doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { vehicleName } from '../config/vehicles';

// Minimal typing for the non-standard Battery Status API (not in TS DOM lib).
interface BatteryManager extends EventTarget {
  level: number;
}
type NavigatorWithBattery = Navigator & { getBattery: () => Promise<BatteryManager> };

// If no operator heartbeat is seen for this long while under MANUAL control, the
// deadman watchdog zeroes throttle/steering and reverts to a safe stop. Must be
// comfortably larger than the operator's HEARTBEAT_INTERVAL_MS (currently 1s).
const DEADMAN_TIMEOUT_MS = 2500;

interface TestVehicleScreenProps {
  onBack: () => void;
}

export const TestVehicleScreen: React.FC<TestVehicleScreenProps> = ({ onBack }) => {
  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const [avState, setAvState] = useState<'AUTONOMOUS' | 'ASSISTANCE_REQUESTED' | 'REMOTE_OPERATING' | 'MRM' | 'MANUAL'>('AUTONOMOUS');
  const [assistanceCause, setAssistanceCause] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number; speed: number }>({ lat: 47.3712, lng: 8.5135, speed: 0 });
  const [heading, setHeading] = useState<number>(0);
  const [battery, setBattery] = useState<number>(87);
  const [showCauseDropdown, setShowCauseDropdown] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [gpsActive, setGpsActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Overlays for operator interactions
  const [operatorCommand, setOperatorCommand] = useState<string | null>(null);
  const [showCommandOverlay, setShowCommandOverlay] = useState(false);
  const [steeringAngle, setSteeringAngle] = useState<number>(0);
  const [throttle, setThrottle] = useState<number>(0);
  const [linkLost, setLinkLost] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const candAdded = useRef<Set<string>>(new Set());
  const lastCommandRef = useRef<string | null>(null);
  const lastCommandTimestampRef = useRef<number>(0);
  // Tracks the last command sequence number we acted on, and the freshest
  // operator heartbeat we've observed (for the deadman watchdog).
  const lastCommandSeqRef = useRef<number>(-1);
  const lastHeartbeatRef = useRef<number>(0);
  const avStateRef = useRef(avState);
  avStateRef.current = avState;

  // Beep synthesis using Web Audio API
  const playBeep = (type: 'success' | 'alert') => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      if (type === 'success') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, audioCtx.currentTime); // high pitch
        gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
      } else {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(320, audioCtx.currentTime); // low pitch rumble
        gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.6);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.6);
      }
    } catch (err) {
      console.warn("Audio Context playback not allowed yet, context suspended:", err);
    }
  };

  // Setup battery state
  useEffect(() => {
    // Attempt standard browser battery API
    if ('getBattery' in navigator) {
      (navigator as NavigatorWithBattery).getBattery().then((bat: BatteryManager) => {
        setBattery(Math.round(bat.level * 100));
        bat.addEventListener('levelchange', () => {
          setBattery(Math.round(bat.level * 100));
        });
      });
    }
  }, []);

  // WebRTC & Stream Setup once local vehicle selection is active
  useEffect(() => {
    if (!vehicleId) return;

    let watchId: number;
    let orientationHandler: (e: DeviceOrientationEvent) => void;

    const initializeMediaAndSignaling = async () => {
      try {
        // 1. Get user media (facing environment for front bumper perspective)
        const constraints = {
          video: { 
            facingMode: 'environment',
            width: { ideal: 640 },
            height: { ideal: 480 },
            frameRate: { ideal: 24 }
          },
          audio: false
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints)
          .catch(() => {
            // Fallback to front camera or any generic camera
            return navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          });

        localStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setCameraActive(true);

        // 2. Setup RTCPeerConnection
        const pc = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });
        pcRef.current = pc;

        stream.getTracks().forEach(track => pc.addTrack(track, stream));

        // 3. Setup geolocation tracking (Alt-Wiedikon standard simulated walk)
        let lastLat = 47.3712;
        let lastLng = 8.5135;
        let lastTime = Date.now();

        if (navigator.geolocation) {
          watchId = navigator.geolocation.watchPosition(
            (pos) => {
              let currentSpeed = pos.coords.speed || 0;
              // If stationary or device can't compute fast enough, let's derive it
              if (currentSpeed === 0 && lastLat !== 0) {
                const distanceRatio = Math.sqrt(Math.pow(pos.coords.latitude - lastLat, 2) + Math.pow(pos.coords.longitude - lastLng, 2)) * 111000; // rough meters
                const deltaSec = (Date.now() - lastTime) / 1000;
                if (deltaSec > 0 && distanceRatio > 0.5) {
                  currentSpeed = distanceRatio / deltaSec;
                }
              }

              setCoords({
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
                speed: currentSpeed
              });
              setGpsActive(true);

              lastLat = pos.coords.latitude;
              lastLng = pos.coords.longitude;
              lastTime = Date.now();
            },
            (err) => {
              console.warn("Geolocation watch error:", err);
              // Fallback walk simulation helper
              setGpsActive(true);
            },
            { enableHighAccuracy: true, maximumAge: 1000, timeout: 5000 }
          );
        }

        // 4. Heading tracking (Orientation API)
        orientationHandler = (e: DeviceOrientationEvent) => {
          let h = 0;
          if (e.alpha !== null) {
            h = 360 - e.alpha; // standard math for alpha heading compass approximation
          }
          setHeading(Math.floor(h));
        };
        window.addEventListener('deviceorientation', orientationHandler);

        // 5. Generate SDP Offer
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        // Define candidate tracking
        const localCandidates: RTCIceCandidateInit[] = [];
        pc.onicecandidate = async (event) => {
          if (event.candidate) {
            localCandidates.push(event.candidate.toJSON());
            await updateDoc(doc(db, 'webrtc_signaling', vehicleId), {
              candidates_vehicle: JSON.stringify(localCandidates),
              updatedAt: Date.now()
            }).catch(() => {});
          }
        };

        // Initialize Signaling Documents in Firestore
        await setDoc(doc(db, 'webrtc_signaling', vehicleId), {
          id: vehicleId,
          offer: JSON.stringify({ sdp: offer.sdp, type: offer.type }),
          answer: null,
          candidates_vehicle: JSON.stringify([]),
          candidates_operator: JSON.stringify([]),
          updatedAt: Date.now()
        });

      } catch (err) {
        console.error("Signaling & media init failed:", err);
        setErrorMsg(err instanceof Error ? err.message : String(err));
      }
    };

    initializeMediaAndSignaling();

    // Cleanup logic
    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
      if (orientationHandler) window.removeEventListener('deviceorientation', orientationHandler);

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (pcRef.current) {
        pcRef.current.close();
      }
    };
  }, [vehicleId]);

  // Main listener for receiving commands & steering updates from operator
  useEffect(() => {
    if (!vehicleId) return;

    // Listen to vehicle state doc in Firestore
    const unsubVehicle = onSnapshot(doc(db, 'test_vehicles', vehicleId), (snapshot) => {
      if (!snapshot.exists()) return;
      const data = snapshot.data();

      // Steering angle & throttle overlay
      if (typeof data.steeringAngle === 'number') {
        setSteeringAngle(data.steeringAngle);
      }
      if (typeof data.throttle === 'number') {
        setThrottle(data.throttle);
      }

      // Record operator liveness for the deadman watchdog.
      if (typeof data.operatorHeartbeat === 'number') {
        lastHeartbeatRef.current = data.operatorHeartbeat;
        setLinkLost(false);
      }

      // Act on a new operator command. We key off a monotonic sequence number
      // (operatorCommandSeq) instead of comparing wall-clock timestamps across
      // two devices, which clock skew would otherwise break. Falls back to the
      // timestamp only for legacy writes that predate the sequence field.
      if (data.operatorCommand) {
        const seq = typeof data.operatorCommandSeq === 'number' ? data.operatorCommandSeq : null;
        const cmdTime = data.operatorCommandTimestamp ?? 0;
        const isNew = seq !== null
          ? seq > lastCommandSeqRef.current
          : cmdTime !== lastCommandTimestampRef.current;

        if (isNew) {
          if (seq !== null) lastCommandSeqRef.current = seq;
          lastCommandTimestampRef.current = cmdTime;
          setOperatorCommand(data.operatorCommand);
          setShowCommandOverlay(true);

          if (data.operatorCommand === 'TAKE_OVER') {
            setAvState('MANUAL');
            lastHeartbeatRef.current = Date.now(); // grace period for first heartbeat
            playBeep('alert');
          } else {
            playBeep('success');
            if (data.operatorCommand === 'PROCEED') {
              setAvState('AUTONOMOUS');
            }
          }

          // Automatically auto-clear flash overlay after 3 seconds
          setTimeout(() => {
            setShowCommandOverlay(false);
          }, 3000);
        }
      }
    });

    // Listen to WebRTC signaling responses
    const unsubSignaling = onSnapshot(doc(db, 'webrtc_signaling', vehicleId), async (snapshot) => {
      if (!snapshot.exists()) return;
      const data = snapshot.data();

      const pc = pcRef.current;
      if (!pc) return;

      // 1. Process Answer
      if (data.answer && !pc.remoteDescription) {
        try {
          const sdpAnswer = JSON.parse(data.answer);
          await pc.setRemoteDescription(new RTCSessionDescription(sdpAnswer));
        } catch (err) {
          console.error("Setting remote SDP answer failed:", err);
        }
      }

      // 2. Process Operator ICE candidates
      if (data.candidates_operator) {
        try {
          const remoteCandidates: RTCIceCandidateInit[] = JSON.parse(data.candidates_operator);
          remoteCandidates.forEach((cand) => {
            const candString = JSON.stringify(cand);
            if (!candAdded.current.has(candString)) {
              pc.addIceCandidate(new RTCIceCandidate(cand))
                .catch(e => console.warn("Failed to add remote candidate:", e));
              candAdded.current.add(candString);
            }
          });
        } catch (err) {
          console.error("Setting operator candidates failed:", err);
        }
      }
    });

    return () => {
      unsubVehicle();
      unsubSignaling();
    };
  }, [vehicleId]);

  // Deadman watchdog: while under MANUAL teleop control, if the operator's
  // heartbeat goes stale (link loss), zero the controls and revert to a safe
  // stop instead of holding the last throttle command indefinitely.
  useEffect(() => {
    if (!vehicleId) return;

    const watchdog = setInterval(() => {
      if (avStateRef.current !== 'MANUAL') return;
      const sinceHeartbeat = Date.now() - lastHeartbeatRef.current;
      if (lastHeartbeatRef.current > 0 && sinceHeartbeat > DEADMAN_TIMEOUT_MS) {
        setLinkLost(true);
        setThrottle(0);
        setSteeringAngle(0);
        setAvState('MRM'); // minimal-risk maneuver (safe stop)
        playBeep('alert');
        updateDoc(doc(db, 'test_vehicles', vehicleId), {
          throttle: 0,
          steeringAngle: 0,
          avState: 'MRM',
          updatedAt: Date.now(),
        }).catch(() => {});
      }
    }, 500);

    return () => clearInterval(watchdog);
  }, [vehicleId]);

  // Upload telemetry updates to Firestore
  useEffect(() => {
    if (!vehicleId) return;

    const interval = setInterval(async () => {
      // Periodic upload of telemetry
      const docRef = doc(db, 'test_vehicles', vehicleId);
      await setDoc(docRef, {
        id: vehicleId,
        name: vehicleName(vehicleId),
        isActive: true,
        avState,
        lat: coords.lat,
        lng: coords.lng,
        speed: coords.speed,
        heading,
        battery,
        assistanceCause: avState === 'ASSISTANCE_REQUESTED' ? assistanceCause : null,
        updatedAt: Date.now()
      }, { merge: true }).catch(err => console.error(err));
    }, 500);

    return () => clearInterval(interval);
  }, [vehicleId, avState, coords, heading, battery, assistanceCause]);

  // Button Action handlers that modify Firestore
  const handleRequestAssistance = async (cause: string) => {
    if (!vehicleId) return;
    setAvState('ASSISTANCE_REQUESTED');
    setAssistanceCause(cause);
    setShowCauseDropdown(false);

    await updateDoc(doc(db, 'test_vehicles', vehicleId), {
      avState: 'ASSISTANCE_REQUESTED',
      assistanceCause: cause,
      operatorCommand: null,
      updatedAt: Date.now()
    }).catch(err => console.error(err));
  };

  const handleManualEngage = async () => {
    if (!vehicleId) return;
    setAvState('MANUAL');
    setAssistanceCause(null);
    await updateDoc(doc(db, 'test_vehicles', vehicleId), {
      avState: 'MANUAL',
      assistanceCause: null,
      operatorCommand: null,
      updatedAt: Date.now()
    }).catch(err => console.error(err));
  };

  const handleTriggerMrm = async () => {
    if (!vehicleId) return;
    setAvState('MRM');
    setAssistanceCause(null);
    await updateDoc(doc(db, 'test_vehicles', vehicleId), {
      avState: 'MRM',
      assistanceCause: null,
      operatorCommand: null,
      updatedAt: Date.now()
    }).catch(err => console.error(err));
  };

  const handleBackToAutonomous = async () => {
    if (!vehicleId) return;
    setAvState('AUTONOMOUS');
    setAssistanceCause(null);
    await updateDoc(doc(db, 'test_vehicles', vehicleId), {
      avState: 'AUTONOMOUS',
      assistanceCause: null,
      operatorCommand: null,
      updatedAt: Date.now()
    }).catch(err => console.error(err));
  };

  const handleExitSimulation = async () => {
    if (vehicleId) {
      // Tear down active status
      await setDoc(doc(db, 'test_vehicles', vehicleId), {
        id: vehicleId,
        isActive: false,
        updatedAt: Date.now()
      }, { merge: true }).catch(() => {});
    }
    onBack();
  };

  // If no vehicle is selected yet, show setup screen
  if (!vehicleId) {
    return (
      <div className="min-h-screen bg-[#0d0e12] text-white flex flex-col justify-center items-center px-4 font-sans uppercase tracking-widest">
        <div className="w-full max-w-md bg-[#161820] border border-white/10 rounded-2xl p-8 shadow-2xl flex flex-col items-center">
          <Truck className="w-16 h-16 text-joppli-blue mb-4 animate-bounce" />
          <h2 className="text-xl font-black tracking-widest text-[#f5f5f7] mb-2 text-center">jöppilot testbed</h2>
          <p className="text-[10px] text-white/50 text-center mb-8">Phone Hardware Teleoperation Stand-In</p>

          <span className="text-[11px] font-bold text-white/60 mb-3 self-start">Select Target Vehicle:</span>
          <div className="flex gap-4 w-full mb-8">
            <button
              onClick={() => setVehicleId('v1')}
              className="flex-1 py-4 border-2 border-white/10 hover:border-joppli-blue bg-[#1e202b] rounded-xl font-bold font-mono text-lg transition-all"
            >
              JÖP-01
            </button>
            <button
              onClick={() => setVehicleId('v2')}
              className="flex-1 py-4 border-2 border-white/10 hover:border-joppli-blue bg-[#1e202b] rounded-xl font-bold font-mono text-lg transition-all"
            >
              JÖP-02
            </button>
          </div>

          <button
            onClick={onBack}
            className="text-xs text-white/40 hover:text-white font-bold transition-all underline shrink-0 mt-2"
          >
            Cancel and Return Portal
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white font-sans flex flex-col uppercase tracking-widest overflow-hidden select-none">
      
      {/* Dynamic Command Flash Overlay */}
      {showCommandOverlay && operatorCommand && (
        <div className="fixed inset-0 bg-[#f55045]/90 backdrop-blur-md z-[60] flex flex-col justify-center items-center animate-fade-in text-center p-8">
          <AlertOctagon className="w-24 h-24 text-white mb-6 animate-bounce" />
          <span className="text-xl text-white/70 font-bold mb-2">OPERATOR TRANSMITTED COMMAND:</span>
          <span className="text-6xl font-black text-white tracking-widest bg-black/40 px-8 py-4 rounded-3xl animate-pulse">
            {operatorCommand.replace('_', ' ')}
          </span>
          <span className="text-xs text-white/50 mt-12">AUTONOMY ENGAGING IN ACCORDANCE...</span>
        </div>
      )}

      {/* Deadman / link-loss safety banner */}
      {linkLost && (
        <div className="fixed top-0 inset-x-0 z-[70] bg-joppli-red text-white px-6 py-2 flex items-center justify-center gap-3 shadow-lg animate-pulse">
          <AlertOctagon className="w-4 h-4" />
          <span className="text-xs font-black tracking-widest">
            OPERATOR LINK LOST — SAFE STOP ENGAGED (MRM)
          </span>
        </div>
      )}

      {/* Top Tablet-HUD */}
      <div className="h-20 bg-[#14151b] border-b border-white/10 px-6 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-4">
          <span className="font-extrabold text-[#f5f5f7] tracking-wider text-sm flex items-center gap-2">
            <Truck className="w-5 h-5 text-joppli-green" /> {vehicleName(vehicleId ?? 'v1')}
          </span>
          <div className="h-6 w-px bg-white/20"></div>
          <span className="text-[10px] text-white/50 font-bold">Simulator Active</span>
        </div>

        {/* Big AV State Badge */}
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-white/40 text-right font-medium">AV STATUS BLOCK:</span>
          <div className={`px-4 py-2 rounded-xl text-xs font-black shadow-lg tracking-widest ${
            avState === 'AUTONOMOUS' ? 'bg-joppli-green text-joppli-dark shadow-joppli-green/20' :
            avState === 'ASSISTANCE_REQUESTED' ? 'bg-joppli-red text-white animate-pulse shadow-joppli-red/30' :
            avState === 'REMOTE_OPERATING' ? 'bg-joppli-blue text-white shadow-joppli-blue/20' :
            avState === 'MRM' ? 'bg-[#9a28eb] text-white animate-pulse' :
            'bg-joppli-yellow text-joppli-dark'
          }`}>
            {avState}
          </div>
        </div>

        <button
          onClick={handleExitSimulation}
          className="px-4 py-1.5 bg-white/5 hover:bg-joppli-red hover:text-white border border-white/10 rounded-lg text-[10px] font-bold transition-all shrink-0"
        >
          Exit Simulation
        </button>
      </div>

      {/* Camera Live Feed & Telemetry Box Area */}
      <div className="flex-1 relative bg-neutral-900 flex items-center justify-center">
        {/* Full View Camera Feed */}
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted
          className="absolute inset-0 w-full h-full object-cover scale-x-100 z-0 bg-[#0c0d10]"
        />

        {/* Video feed overlay grid effect to make it look futuristic */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] pointer-events-none opacity-40 z-10"></div>

        {/* Virtual Horizon Crosshairs */}
        <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center opacity-30">
          <div className="w-24 h-px bg-joppli-green"></div>
          <div className="h-24 w-px bg-joppli-green"></div>
          <div className="absolute w-12 h-12 border border-joppli-green rounded-full"></div>
        </div>

        {/* Bottom Left Telemetry readout block */}
        <div className="absolute bottom-6 left-6 bg-black/75 backdrop-blur-sm border border-white/10 p-4 rounded-xl z-20 w-72 font-mono text-xs flex flex-col gap-2 shadow-2xl">
          <div className="flex justify-between items-center text-joppli-green">
            <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> GPS READOUT</span>
            <span className="font-bold">{coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}</span>
          </div>
          <div className="flex justify-between items-center text-joppli-blue">
            <span className="flex items-center gap-1.5"><Compass className="w-3.5 h-3.5" /> SPEED/HEADING</span>
            <span className="font-bold">{(coords.speed * 3.6).toFixed(1)} KM/H / {heading}°</span>
          </div>
          <div className="flex justify-between items-center text-joppli-yellow">
            <span className="flex items-center gap-1.5"><Battery className="w-3.5 h-3.5" /> DEVICE BATT</span>
            <span className="font-bold">{battery}%</span>
          </div>
          <div className="mt-2 border-t border-white/10 pt-2 flex justify-between items-center text-white/50 text-[10px]">
            <span>CAMERA LINK:</span>
            <span className={cameraActive ? "text-joppli-green font-bold" : "text-joppli-red font-bold"}>
              {cameraActive ? "ACTIVE" : "OFFLINE"}
            </span>
          </div>
        </div>

        {/* Steering & Throttle Live Overlay Received from Operator */}
        <div className="absolute bottom-6 right-6 bg-black/85 backdrop-blur-sm border border-white/15 p-4 rounded-2xl z-20 min-w-[200px] shadow-2xl flex flex-col gap-3 font-mono">
          <span className="text-[10px] text-white/50 font-bold border-b border-white/10 pb-1 flex items-center gap-1.5">
            <Volume2 className="w-3.5 h-3.5 text-joppli-green" /> REMOTE INGRESS FEED
          </span>
          
          {/* Virtual Steering angle rotation wheel visual */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-white/40 font-bold">WHEEL ANGLE:</span>
            <div className="flex items-center gap-2">
              <span className={`text-[11px] font-bold ${steeringAngle !== 0 ? 'text-joppli-green' : 'text-white/60'}`}>
                {steeringAngle > 0 ? 'R' : steeringAngle < 0 ? 'L' : 'C'} {Math.round(Math.abs(steeringAngle))}°
              </span>
              <div 
                className="w-6 h-6 border-2 border-dashed border-white/50 rounded-full flex items-center justify-center transition-transform" 
                style={{ transform: `rotate(${steeringAngle}deg)` }}
              >
                <div className="w-1 h-3 bg-joppli-green rounded-full"></div>
              </div>
            </div>
          </div>

          {/* Virtual Throttle vertical bar indicator */}
          <div className="flex flex-col gap-1 mt-1">
            <div className="flex justify-between text-[10px] text-white/40 font-bold">
              <span>ACCEL THROTTLE:</span>
              <span className="text-joppli-blue font-bold">{Math.round(throttle)}%</span>
            </div>
            <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-joppli-blue transition-all" 
                style={{ width: `${throttle}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid Action Selector Buttons (Four Big Buttons at Bottom) */}
      <div className="bg-[#14151b] border-t border-white/10 p-6 flex flex-col md:flex-row gap-4 shrink-0 z-20">
        
        {/* BUTTON 1: REQUEST ASSISTANCE with Dropdown cause selector */}
        <div className="relative flex-1">
          <button
            onClick={() => setShowCauseDropdown(!showCauseDropdown)}
            className="w-full py-4 px-4 bg-joppli-red hover:bg-[#d4372e] text-white rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-between gap-2 shadow-lg transition-all"
          >
            <span>Request Assistance</span>
            <ChevronDown className="w-4 h-4 shrink-0" />
          </button>

          {showCauseDropdown && (
            <div className="absolute bottom-20 left-0 w-full bg-[#1c1d26] border border-white/10 rounded-xl shadow-2xl z-30 overflow-hidden flex flex-col animate-fade-in">
              {[
                { code: 'unmapped_obstacle', label: 'Unmapped Obstacle' },
                { code: 'pedestrian_intent_unclear', label: 'Pedestrian Intent Unclear' },
                { code: 'construction_zone', label: 'Construction Zone' },
                { code: 'ambiguous_right_of_way', label: 'Ambiguous Right of Way' }
              ].map((cause) => (
                <button
                  key={cause.code}
                  onClick={() => handleRequestAssistance(cause.code)}
                  className="w-full text-left py-3.5 px-4 text-xs font-bold hover:bg-white/5 border-b border-white/5 text-white/80 hover:text-white transition-colors"
                >
                  {cause.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* BUTTON 2: ENGAGE MANUAL */}
        <button
          onClick={handleManualEngage}
          className="flex-1 py-4 px-4 bg-[#232631] hover:bg-[#2d313f] text-white border border-white/10 rounded-xl font-bold text-xs uppercase tracking-widest transition-all"
        >
          Engage Manual
        </button>

        {/* BUTTON 3: TRIGGER MRM */}
        <button
          onClick={handleTriggerMrm}
          className="flex-1 py-4 px-4 bg-[#7d19c4] hover:bg-[#8e25dd] text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all"
        >
          Trigger MRM
        </button>

        {/* BUTTON 4: BACK TO AUTONOMOUS */}
        <button
          onClick={handleBackToAutonomous}
          className="flex-1 py-4 px-4 bg-[#263e18] hover:bg-[#345521] text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all"
        >
          Back To Autonomous
        </button>

      </div>
    </div>
  );
};
