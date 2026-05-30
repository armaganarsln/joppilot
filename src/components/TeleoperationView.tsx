import React, { useState, useEffect, useRef } from 'react';
import { Video, Radio, Camera, LogOut, Loader2 } from 'lucide-react';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface TeleoperationViewProps {
  vehicleId: string;
  onExit: () => void;
}

export const TeleoperationView: React.FC<TeleoperationViewProps> = ({ vehicleId, onExit }) => {
  const [latency, setLatency] = useState(42);
  const [speed, setSpeed] = useState(0);
  const [steering, setSteering] = useState(0); // -45 to 45 deg
  const [throttle, setThrottle] = useState(0); // 0 to 100%
  const [battery, setBattery] = useState(82.4);
  const [isTestActive, setIsTestActive] = useState(false);
  const [p2pConnected, setP2pConnected] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const candAdded = useRef<Set<string>>(new Set());

  // Listen to the live vehicle document from Firestore
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'test_vehicles', vehicleId), (snapshot) => {
      if (!snapshot.exists()) return;
      const data = snapshot.data();
      if (data.isActive) {
        setIsTestActive(true);
        setBattery(data.battery);
        setSpeed(data.speed || 0);
      } else {
        setIsTestActive(false);
      }
    });

    return () => unsub();
  }, [vehicleId]);

  // Live WebRTC Signaling Connection with the phone
  useEffect(() => {
    const unsubSignaling = onSnapshot(doc(db, 'webrtc_signaling', vehicleId), async (snapshot) => {
      if (!snapshot.exists()) return;
      const data = snapshot.data();

      // If there is an SDP offer from the phone, and we have not established a local RTCPeerConnection
      if (data.offer && !pcRef.current) {
        try {
          const pc = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
          });
          pcRef.current = pc;

          // Connection status monitoring
          pc.onconnectionstatechange = () => {
            if (pc.connectionState === 'connected') {
              setP2pConnected(true);
            } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
              setP2pConnected(false);
            }
          };

          // Handle incoming remote media tracks (the camera stream)
          pc.ontrack = (event) => {
            if (videoRef.current && event.streams[0]) {
              videoRef.current.srcObject = event.streams[0];
            }
          };

          // Generate operator local ICE candidates list
          const localCandidates: RTCIceCandidateInit[] = [];
          pc.onicecandidate = async (event) => {
            if (event.candidate) {
              localCandidates.push(event.candidate.toJSON());
              await updateDoc(doc(db, 'webrtc_signaling', vehicleId), {
                candidates_operator: JSON.stringify(localCandidates),
                updatedAt: Date.now()
              }).catch(() => {});
            }
          };

          // Parse and apply offer SDP
          const offerSdp = JSON.parse(data.offer);
          await pc.setRemoteDescription(new RTCSessionDescription(offerSdp));

          // Create answering SDP
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          // Write answer SDP back to Firestore signaling channel
          await updateDoc(doc(db, 'webrtc_signaling', vehicleId), {
            answer: JSON.stringify({ sdp: answer.sdp, type: answer.type }),
            updatedAt: Date.now()
          });

        } catch (err) {
          console.error("Failed to construct WebRTC peer connection answerer loop:", err);
        }
      }

      // Sync and add ICE candidates generated on the vehicle-phone side
      if (data.candidates_vehicle && pcRef.current) {
        try {
          const vehicleCandidates: RTCIceCandidateInit[] = JSON.parse(data.candidates_vehicle);
          vehicleCandidates.forEach((cand) => {
            const candString = JSON.stringify(cand);
            if (!candAdded.current.has(candString)) {
              pcRef.current?.addIceCandidate(new RTCIceCandidate(cand))
                .catch(() => {});
              candAdded.current.add(candString);
            }
          });
        } catch (err) {
          console.error("Applying phone ICE candidates failed:", err);
        }
      }
    });

    return () => {
      unsubSignaling();
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
      candAdded.current.clear();
      setP2pConnected(false);
    };
  }, [vehicleId]);

  // Fake telemetry when simulator is offline
  useEffect(() => {
    if (isTestActive) return;

    const interval = setInterval(() => {
      setLatency(38 + Math.random() * 8);
      // Simulate slow manual cruise speed based on current throttle
      setSpeed((throttle / 100) * 12);
    }, 500);

    return () => clearInterval(interval);
  }, [isTestActive, throttle]);

  // Write Steering Slider change directly to Firestore
  const handleSteeringChange = async (val: number) => {
    setSteering(val);
    if (isTestActive) {
      await updateDoc(doc(db, 'test_vehicles', vehicleId), {
        steeringAngle: val,
        updatedAt: Date.now()
      }).catch(() => {});
    }
  };

  // Write Throttle Slider change directly to Firestore
  const handleThrottleChange = async (val: number) => {
    setThrottle(val);
    if (isTestActive) {
      await updateDoc(doc(db, 'test_vehicles', vehicleId), {
        throttle: val,
        updatedAt: Date.now()
      }).catch(() => {});
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0c0d12] text-white font-sans flex flex-col uppercase tracking-widest overflow-hidden">
      
      {/* Upper HUD */}
      <div className="h-16 border-b border-white/10 bg-[#14151b]/95 backdrop-blur-md px-6 flex items-center justify-between shrink-0 absolute top-0 w-full z-20">
        <div className="flex items-center gap-6">
          <div className="flex flex-col">
             <span className="text-[10px] text-white/50 font-bold mb-0.5">Teleoperation Active</span>
             <div className="flex items-center gap-2">
               <span className="w-2.5 h-2.5 rounded-full bg-joppli-red animate-pulse shadow-[0_0_8px_rgba(245,80,69,0.8)]"></span>
               <span className="font-mono font-black text-base text-[#f5f5f7]">{vehicleId === 'v1' ? 'JÖP-01' : 'JÖP-02'}</span>
             </div>
          </div>
          <div className="h-8 w-px bg-white/20"></div>
          <div className="flex gap-6">
             <div className="flex flex-col">
               <span className="text-[10px] text-white/50 mb-0.5">Link Status</span>
               <span className="text-xs font-black text-joppli-green flex items-center gap-1.5">
                 <Radio className="w-3.5 h-3.5" /> {isTestActive ? (p2pConnected ? "P2P VIDEO ONLINE" : "SIGNALING CONNECTING") : "LOCAL MODE"}
               </span>
             </div>
             <div className="flex flex-col">
               <span className="text-[10px] text-white/50 mb-0.5">Latency</span>
               <span className="text-xs font-black font-mono text-white">
                 {isTestActive ? "18 ms" : `${latency.toFixed(0)} ms`}
               </span>
             </div>
          </div>
        </div>

        <button 
          onClick={onExit}
          className="flex items-center gap-2 px-5 py-2 bg-white/5 hover:bg-joppli-red border border-white/10 hover:border-joppli-red rounded-lg text-xs font-bold transition-all shrink-0 uppercase tracking-widest"
        >
          End Teleop Session
        </button>
      </div>

      {/* Camera Live Feed Window */}
      <div className="flex-1 relative flex items-center justify-center bg-black/90">
        {isTestActive ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="absolute inset-0 w-full h-full object-cover z-0"
          />
        ) : (
          <div className="z-0 flex flex-col items-center opacity-15">
            <Video className="w-16 h-16 mb-2 text-white" />
            <span className="font-mono text-xs">Awaiting hardware connect...</span>
            <span className="text-[10px] text-white/70 mt-1">Open Test Mode on simulated phone to stream video</span>
          </div>
        )}

        {/* Video stream futuristic overlay elements */}
        {isTestActive && (
          <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.15)_50%)] bg-[length:100%_4px] pointer-events-none opacity-20 z-10"></div>
        )}

        {/* HUD Crosshairs */}
        <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center opacity-35">
          <div className="w-20 h-px bg-joppli-green"></div>
          <div className="h-20 w-px bg-joppli-green"></div>
          <div className="absolute w-16 h-16 border border-joppli-green rounded-full"></div>
        </div>

        {/* Label Placement */}
        <div className="absolute top-20 left-6 bg-black/75 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-white/10 z-20 flex items-center gap-2 shadow-lg">
          <Camera className="w-4 h-4 text-white/60" />
          <span className="text-[10px] font-bold text-[#f5f5f7]">MAIN FRONT CAM (STREAM)</span>
          <span className="w-2 h-2 rounded-full bg-joppli-green animate-pulse"></span>
        </div>

        {/* Live on-screen telemetry overlay */}
        <div className="absolute bottom-40 left-6 z-20 w-52 font-mono text-xs bg-black/65 p-4 rounded-xl border border-white/5 backdrop-blur-sm flex flex-col gap-1.5">
          <div className="flex justify-between text-joppli-green font-bold"><span>SPD</span><span>{(speed * 3.6).toFixed(1)} KM/H</span></div>
          <div className="flex justify-between text-white/60"><span>RPM</span><span>{Math.floor(1100 + speed * 150)}</span></div>
          <div className="flex justify-between text-white/60"><span>STR_CMD</span><span>{steering > 0 ? `R ${steering}°` : steering < 0 ? `L ${Math.abs(steering)}°` : "0°"}</span></div>
          <div className="flex justify-between text-joppli-blue font-bold"><span>BATTERY</span><span>{battery}%</span></div>
          <div className="flex justify-between text-white/40 text-[9px] border-t border-white/10 pt-1.5 mt-1"><span>CORES</span><span>ARMv8-A DUAL</span></div>
        </div>
      </div>

      {/* Operator Cockpit Industrial Bottom Selector Panel */}
      <div className="absolute bottom-0 inset-x-0 h-36 bg-[#14151b] border-t border-white/10 z-30 flex items-center px-6 gap-6 pb-2 shadow-2xl">
          
          {/* INTERACTIVE STEERING WHEEL SLIDER CONTROL */}
          <div className="flex flex-col justify-center shrink-0 border-r border-white/10 pr-6 h-full w-56">
            <span className="text-[10px] font-black text-white/50 mb-3 tracking-widest uppercase">Steering Cockpit Angle</span>
            
            <div className="flex items-center gap-4">
              <input 
                type="range"
                min="-45"
                max="45"
                value={steering}
                onChange={(e) => handleSteeringChange(Number(e.target.value))}
                className="flex-1 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-joppli-green outline-none"
              />
              <span className="text-xs font-mono font-black text-joppli-green w-10 text-right">
                {steering > 0 ? 'R' : steering < 0 ? 'L' : ''}{Math.abs(steering)}°
              </span>
            </div>

            <div className="flex justify-between text-[9px] text-white/30 font-bold mt-2">
              <span>LEFT MAX</span>
              <button 
                onClick={() => handleSteeringChange(0)}
                className="hover:text-joppli-green transition-colors text-white/50"
              >
                RESET CENTER
              </button>
              <span>RIGHT MAX</span>
            </div>
          </div>

          {/* INTERACTIVE PEDAL THROTTLE PROGRESSIVE SLIDER */}
          <div className="flex flex-col justify-center shrink-0 border-r border-white/10 pr-6 h-full w-56">
            <span className="text-[10px] font-black text-white/50 mb-3 tracking-widest uppercase">Progressive Throttle / ACC</span>
            
            <div className="flex items-center gap-4">
              <input 
                type="range"
                min="0"
                max="100"
                value={throttle}
                onChange={(e) => handleThrottleChange(Number(e.target.value))}
                className="flex-1 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-joppli-blue outline-none"
              />
              <span className="text-xs font-mono font-black text-joppli-blue w-12 text-right">
                {throttle}%
              </span>
            </div>

            <div className="flex justify-between text-[9px] text-white/30 font-bold mt-2">
              <span>0% (COAST)</span>
              <button 
                onClick={() => handleThrottleChange(0)}
                className="hover:text-joppli-blue transition-colors text-white/50"
              >
                CUT THROTTLE
              </button>
              <span>100% (FULL)</span>
            </div>
          </div>

          {/* AUXILIARY BACKUP CHANNELS (FRONT LEFT, REAR, FRONT RIGHT) */}
          <div className="flex-1 h-full flex items-center justify-center gap-3 px-2">
            {[
              { name: 'LEFT SIDE CAM', id: 'left' },
              { name: 'REAR CH-2 CAM', id: 'rear' },
              { name: 'RIGHT SIDE CAM', id: 'right' }
            ].map(cam => (
               <div key={cam.id} className="h-24 flex-1 bg-black/60 rounded-xl border border-white/10 relative overflow-hidden flex items-center justify-center max-w-[200px] shadow-lg">
                  <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm px-1.5 py-0.5 rounded text-[8px] font-black font-mono text-white/70">
                    {cam.name}
                  </div>
                  <div className="w-full h-px bg-white/5 absolute top-1/2"></div>
                  <div className="h-full w-px bg-white/5 absolute left-1/2"></div>
                  <span className="text-[9px] text-white/20 font-bold font-mono">STAND-BY CH</span>
               </div>
            ))}
          </div>

      </div>
    </div>
  );
};
