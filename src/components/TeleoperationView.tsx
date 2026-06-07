import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Video, Radio, Camera, AlertTriangle, Lock, Octagon, Keyboard, Gamepad2, Hand, Check, X } from 'lucide-react';
import { doc, onSnapshot, updateDoc, runTransaction } from 'firebase/firestore';
import { db } from '../firebase';
import { vehicleName } from '../config/vehicles';
import { getIceServers } from '../lib/iceServers';
import { stepDrive } from '../lib/driveModel';
import { useToast } from './ToastProvider';
import { PLACES_BY_PROJECT } from '../config/places';
import type { WorkspaceProject } from '../types';

// Cadence at which the operator stamps a liveness heartbeat onto the vehicle
// document. The vehicle's deadman watchdog (TestVehicleScreen) zeroes throttle
// if it stops seeing fresh heartbeats — see DEADMAN_TIMEOUT_MS there.
const HEARTBEAT_INTERVAL_MS = 1000;
// Min delay between control writes while dragging a slider, to avoid a Firestore
// write on every pixel of pointer movement.
const CONTROL_WRITE_DEBOUNCE_MS = 80;
// A control lock whose heartbeat is older than this is treated as abandoned
// (e.g. the holding operator's tab crashed), so the vehicle can be reclaimed.
const CONTROL_LOCK_TIMEOUT_MS = 6000;

// --- Keyboard / gamepad driving model (RD UX #1) ---
// The steering/throttle integration math lives in ../lib/driveModel (stepDrive),
// so it can be unit-tested independently of React.
const CONTROL_LOOP_MS = 50;            // 20 Hz input integration loop
const GAMEPAD_DEADZONE = 0.15;

interface ControlRequest {
  sessionId: string;
  operator: string;
  at: number;
}

interface ControlLock {
  sessionId: string;
  operator: string;
  heartbeat: number;
  request?: ControlRequest | null;
}

interface TeleoperationViewProps {
  vehicleId: string;
  onExit: () => void;
  project?: WorkspaceProject;
  operatorEmail?: string | null;
}

export const TeleoperationView: React.FC<TeleoperationViewProps> = ({ vehicleId, onExit, project, operatorEmail }) => {
  const [latency, setLatency] = useState(42);
  const [speed, setSpeed] = useState(0);
  const [steering, setSteering] = useState(0); // -45 to 45 deg
  const [throttle, setThrottle] = useState(0); // 0 to 100%
  const [battery, setBattery] = useState(82.4);
  const [isTestActive, setIsTestActive] = useState(false);
  const [p2pConnected, setP2pConnected] = useState(false);
  const [linkDegraded, setLinkDegraded] = useState(false);
  const [heading, setHeading] = useState(0);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [isBraking, setIsBraking] = useState(false);
  // Email of another operator currently holding the control lock, or null if we
  // hold it / it is free. Drives the lockout overlay and disables the controls.
  const [lockedBy, setLockedBy] = useState<string | null>(null);
  const [estopEngaged, setEstopEngaged] = useState(false);
  const [inputMode, setInputMode] = useState<'idle' | 'keyboard' | 'gamepad'>('idle');
  // When we hold control and another operator requests it, this names them so we
  // can show the grant/deny banner. When we're locked out, tracks our own pending request.
  const [incomingRequest, setIncomingRequest] = useState<ControlRequest | null>(null);
  const [requestPending, setRequestPending] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const candAdded = useRef<Set<string>>(new Set());
  // Monotonic counter so the vehicle can detect a genuinely new command without
  // relying on cross-device wall-clock comparison (which clock skew breaks).
  const commandSeqRef = useRef(0);
  const controlWriteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingControlRef = useRef<{ steeringAngle?: number; throttle?: number }>({});
  // Unique per tab/session so two windows (even same user) can't both hold control.
  const sessionIdRef = useRef<string>(
    typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `s_${Date.now()}_${Math.random()}`
  );
  // True while this session owns the control lock (gates all control writes).
  const hasControlRef = useRef(false);
  // Currently-held keys and the live steering/throttle values the input loop integrates.
  const keysRef = useRef<Set<string>>(new Set());
  const steerRef = useRef(0);
  const throttleRef = useRef(0);
  const estopRef = useRef(false);
  // Set when we voluntarily hand control to a requesting operator, so our lock
  // loop yields instead of immediately re-claiming.
  const yieldToRef = useRef<string | null>(null);

  const { success: toastSuccess, warning: toastWarning, info: toastInfo } = useToast();

  const displayName = vehicleName(vehicleId, project ?? 'zurich');
  const operatorLabel = operatorEmail ?? 'operator';

  // Debounced write of steering/throttle control inputs to Firestore.
  const flushControlWrite = useCallback(() => {
    const payload = pendingControlRef.current;
    pendingControlRef.current = {};
    if (Object.keys(payload).length === 0) return;
    updateDoc(doc(db, 'test_vehicles', vehicleId), {
      ...payload,
      operatorHeartbeat: Date.now(),
      updatedAt: Date.now(),
    }).catch(() => {});
  }, [vehicleId]);

  const queueControlWrite = useCallback((patch: { steeringAngle?: number; throttle?: number }) => {
    if (!isTestActive || !hasControlRef.current) return;
    pendingControlRef.current = { ...pendingControlRef.current, ...patch };
    if (controlWriteTimerRef.current) return;
    controlWriteTimerRef.current = setTimeout(() => {
      controlWriteTimerRef.current = null;
      flushControlWrite();
    }, CONTROL_WRITE_DEBOUNCE_MS);
  }, [isTestActive, flushControlWrite]);

  // Emergency stop (RD UX #2): immediately zero controls and trigger a minimal-
  // risk maneuver, bypassing the debounce. Engaging E-STOP also latches until
  // explicitly released so a held throttle key can't immediately re-accelerate.
  const engageEstop = useCallback(() => {
    if (!estopRef.current) toastWarning(`EMERGENCY STOP engaged — ${displayName} held`);
    estopRef.current = true;
    setEstopEngaged(true);
    steerRef.current = 0;
    throttleRef.current = 0;
    setSteering(0);
    setThrottle(0);
    keysRef.current.clear();
    if (!isTestActive || !hasControlRef.current) return;
    commandSeqRef.current += 1;
    updateDoc(doc(db, 'test_vehicles', vehicleId), {
      steeringAngle: 0,
      throttle: 0,
      avState: 'MRM',
      operatorCommand: 'WAIT',
      operatorCommandSeq: commandSeqRef.current,
      operatorCommandTimestamp: Date.now(),
      operatorHeartbeat: Date.now(),
      updatedAt: Date.now(),
    }).catch(() => {});
  }, [isTestActive, vehicleId, displayName, toastWarning]);

  const releaseEstop = useCallback(() => {
    estopRef.current = false;
    setEstopEngaged(false);
    if (!isTestActive || !hasControlRef.current) return;
    commandSeqRef.current += 1;
    updateDoc(doc(db, 'test_vehicles', vehicleId), {
      avState: 'MANUAL',
      operatorCommand: 'TAKE_OVER',
      operatorCommandSeq: commandSeqRef.current,
      operatorCommandTimestamp: Date.now(),
      operatorHeartbeat: Date.now(),
      updatedAt: Date.now(),
    }).catch(() => {});
  }, [isTestActive, vehicleId]);

  // Listen to the live vehicle document from Firestore
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'test_vehicles', vehicleId), (snapshot) => {
      if (!snapshot.exists()) return;
      const data = snapshot.data();
      if (data.isActive) {
        setIsTestActive(true);
        setBattery(data.battery);
        setSpeed(data.speed || 0);
        setHeading(data.heading || 0);
        setLat(data.lat || null);
        setLng(data.lng || null);

        // Check geofence violation and force E-stop
        const activeProj = project ?? 'zurich';
        const bounds = PLACES_BY_PROJECT[activeProj]?.bounds;
        if (bounds && data.lat && data.lng) {
          const isOutside = data.lat < bounds.latMin || data.lat > bounds.latMax || data.lng < bounds.lngMin || data.lng > bounds.lngMax;
          if (isOutside && !estopRef.current && hasControlRef.current) {
            engageEstop();
            toastWarning("GEOFENCE VIOLATION: Automatic Safety Halt engaged!");
          }
        }
      } else {
        setIsTestActive(false);
      }
    });

    return () => unsub();
  }, [vehicleId, project, engageEstop, toastWarning]);

  // Single-operator control lock (RD-7). Atomically claim the vehicle on a
  // dedicated `control_locks/{vehicleId}` doc so two operators can't drive the
  // same vehicle. A transaction makes the claim race-free; the lock auto-expires
  // when its heartbeat goes stale (CONTROL_LOCK_TIMEOUT_MS), so a crashed tab
  // doesn't strand the vehicle. We then refresh our own heartbeat on a timer.
  useEffect(() => {
    const lockRef = doc(db, 'control_locks', vehicleId);
    const mySession = sessionIdRef.current;
    let active = true;

    const tryAcquire = async () => {
      try {
        const result = await runTransaction(db, async (tx) => {
          const snap = await tx.get(lockRef);
          const now = Date.now();
          const current = snap.exists() ? (snap.data() as ControlLock) : null;
          const isMine = current?.sessionId === mySession;
          const isStale = !current || now - current.heartbeat > CONTROL_LOCK_TIMEOUT_MS;

          if (current && !isMine && !isStale) {
            // Someone else holds control. If we've queued a request, attach it so
            // the holder sees it; otherwise just observe. Preserve an existing
            // request from another operator.
            const request = requestPending
              ? { sessionId: mySession, operator: operatorLabel, at: now }
              : current.request ?? null;
            tx.set(lockRef, { ...current, request }, { merge: true });
            return { acquired: false, holder: current.operator, request: current.request ?? null };
          }

          // We hold (or can take) the lock. If we've chosen to yield to a
          // requester, step aside and let their session claim it next tick.
          if (isMine && yieldToRef.current && current?.request?.sessionId === yieldToRef.current) {
            tx.delete(lockRef);
            return { acquired: false, holder: current.request.operator, request: null, yielded: true };
          }

          const request = isMine ? current?.request ?? null : null;
          tx.set(lockRef, { sessionId: mySession, operator: operatorLabel, heartbeat: now, request });
          return { acquired: true, holder: operatorLabel, request };
        });

        if (!active) return;
        // Toast when we gain control after previously being locked out.
        if (result.acquired && !hasControlRef.current && lockedBy !== null) {
          toastSuccess(`You now have control of ${displayName}`);
          setRequestPending(false);
        }
        hasControlRef.current = result.acquired;
        setLockedBy(result.acquired ? null : result.holder);
        // Surface an incoming request only while WE hold control.
        setIncomingRequest(
          result.acquired && result.request && result.request.sessionId !== mySession
            ? result.request
            : null
        );
        if ((result as { yielded?: boolean }).yielded) {
          yieldToRef.current = null;
        }
      } catch {
        // Transient contention/offline — keep prior state and retry next tick.
      }
    };

    tryAcquire();
    const interval = setInterval(tryAcquire, HEARTBEAT_INTERVAL_MS);

    return () => {
      active = false;
      clearInterval(interval);
      // Release the lock if we held it, so the next operator can claim instantly.
      if (hasControlRef.current) {
        runTransaction(db, async (tx) => {
          const snap = await tx.get(lockRef);
          if (snap.exists() && (snap.data() as ControlLock).sessionId === mySession) {
            tx.delete(lockRef);
          }
        }).catch(() => {});
      }
      hasControlRef.current = false;
    };
  }, [vehicleId, operatorLabel, requestPending]);

  // Locked-out operator asks the current holder for control (RD UX #3).
  const requestControl = useCallback(() => {
    setRequestPending(true);
    toastInfo('Control request sent to the current operator');
  }, [toastInfo]);

  // Holder grants control to the requester: stop driving and yield the lock.
  const grantControl = useCallback(() => {
    if (incomingRequest) {
      yieldToRef.current = incomingRequest.sessionId;
      toastInfo(`Handing control of ${displayName} to ${incomingRequest.operator}`);
      setIncomingRequest(null);
    }
  }, [incomingRequest, displayName, toastInfo]);

  // Holder dismisses the request without giving up control.
  const denyControl = useCallback(async () => {
    setIncomingRequest(null);
    if (!hasControlRef.current) return;
    await updateDoc(doc(db, 'control_locks', vehicleId), { request: null }).catch(() => {});
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
            iceServers: await getIceServers()
          });
          pcRef.current = pc;

          // Connection status monitoring
          pc.onconnectionstatechange = () => {
            if (pc.connectionState === 'connected') {
              setP2pConnected(true);
              setLinkDegraded(false);
            } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
              setP2pConnected(false);
              setLinkDegraded(true);
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

  // Local cruise simulation when no real simulator/hardware is attached.
  useEffect(() => {
    if (isTestActive) return;
    const interval = setInterval(() => {
      setLatency(38 + Math.random() * 8);
      setSpeed((throttle / 100) * 12);
    }, 500);
    return () => clearInterval(interval);
  }, [isTestActive, throttle]);

  // While connected: stamp a liveness heartbeat and measure real RTT from
  // WebRTC stats so the latency readout reflects the actual link.
  useEffect(() => {
    if (!isTestActive) return;

    const heartbeat = setInterval(async () => {
      // Only the controlling operator stamps the vehicle's deadman heartbeat.
      if (hasControlRef.current) {
        await updateDoc(doc(db, 'test_vehicles', vehicleId), {
          operatorHeartbeat: Date.now(),
          updatedAt: Date.now(),
        }).catch(() => {});
      }

      const pc = pcRef.current;
      if (pc && pc.connectionState === 'connected') {
        try {
          const stats = await pc.getStats();
          stats.forEach((report) => {
            if (report.type === 'candidate-pair' && report.nominated && typeof report.currentRoundTripTime === 'number') {
              setLatency(report.currentRoundTripTime * 1000); // s -> ms
            }
          });
        } catch {
          /* getStats unsupported / transient — keep last reading */
        }
      }
    }, HEARTBEAT_INTERVAL_MS);

    return () => clearInterval(heartbeat);
  }, [isTestActive, vehicleId]);

  // Keyboard + gamepad driving (RD UX #1). Keys/triggers feed a fixed-rate loop
  // that integrates steering and throttle, auto-centers steering on release, and
  // lets throttle coast down. Spacebar is the emergency stop (RD UX #2).
  useEffect(() => {
    const DRIVE_KEYS = new Set([
      'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd', ' ',
    ]);

    const onKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (!DRIVE_KEYS.has(key)) return;
      e.preventDefault();
      if (key === ' ') {
        // Spacebar toggles emergency stop.
        if (estopRef.current) releaseEstop(); else engageEstop();
        return;
      }
      if (!keysRef.current.has(key)) {
        keysRef.current.add(key);
        setInputMode('keyboard');
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key.toLowerCase());
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    const loop = setInterval(() => {
      const keys = keysRef.current;
      let steerInput = 0; // -1 left, +1 right
      let throttleInput = 0; // -1 brake, +1 accelerate

      // Poll gamepad if present (left stick X = steer, RT/LT = throttle/brake).
      const pads = typeof navigator !== 'undefined' && navigator.getGamepads ? navigator.getGamepads() : [];
      const pad = pads && Array.from(pads).find((p) => p);
      if (pad) {
        const stickX = pad.axes[0] ?? 0;
        if (Math.abs(stickX) > GAMEPAD_DEADZONE) {
          steerInput = stickX;
          setInputMode('gamepad');
        }
        const rt = pad.buttons[7]?.value ?? 0; // right trigger = accelerate
        const lt = pad.buttons[6]?.value ?? 0; // left trigger = brake
        if (rt > GAMEPAD_DEADZONE || lt > GAMEPAD_DEADZONE) {
          throttleInput = rt - lt;
          setInputMode('gamepad');
        }
        if (pad.buttons[1]?.pressed && !estopRef.current) engageEstop(); // B button = E-STOP
      }

      // Keyboard overrides/augments.
      if (keys.has('arrowleft') || keys.has('a')) steerInput = -1;
      if (keys.has('arrowright') || keys.has('d')) steerInput = 1;
      if (keys.has('arrowup') || keys.has('w')) throttleInput = 1;
      if (keys.has('arrowdown') || keys.has('s')) throttleInput = -1;

      setIsBraking(throttleInput < 0);

      // Integrate one control tick using the shared, unit-tested drive model.
      const next = stepDrive(
        { steer: steerRef.current, throttle: throttleRef.current },
        { steerInput, throttleInput, estop: estopRef.current }
      );
      steerRef.current = next.steer;
      throttleRef.current = next.throttle;

      const newSteer = Math.round(steerRef.current);
      const newThrottle = Math.round(throttleRef.current);
      setSteering((prev) => (prev !== newSteer ? newSteer : prev));
      setThrottle((prev) => (prev !== newThrottle ? newThrottle : prev));

      if (hasControlRef.current && !estopRef.current) {
        queueControlWrite({ steeringAngle: newSteer, throttle: newThrottle });
      }
    }, CONTROL_LOOP_MS);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      clearInterval(loop);
      keysRef.current.clear();
    };
  }, [engageEstop, releaseEstop, queueControlWrite]);

  // Steering slider — local state updates instantly; writes are debounced.
  // Also syncs the input-loop ref so keyboard/gamepad and slider stay coherent.
  const handleSteeringChange = (val: number) => {
    if (estopRef.current) return;
    steerRef.current = val;
    setSteering(val);
    queueControlWrite({ steeringAngle: val });
  };

  // Throttle slider — local state updates instantly; writes are debounced.
  const handleThrottleChange = (val: number) => {
    if (estopRef.current) return;
    throttleRef.current = val;
    setThrottle(val);
    queueControlWrite({ throttle: val });
  };

  // Safe handback: zero the controls, clear the heartbeat, and hand the vehicle
  // back to autonomy before tearing down the session.
  const handleExit = useCallback(async () => {
    if (controlWriteTimerRef.current) {
      clearTimeout(controlWriteTimerRef.current);
      controlWriteTimerRef.current = null;
    }
    if (isTestActive && hasControlRef.current) {
      commandSeqRef.current += 1;
      await updateDoc(doc(db, 'test_vehicles', vehicleId), {
        steeringAngle: 0,
        throttle: 0,
        avState: 'AUTONOMOUS',
        operatorCommand: 'PROCEED',
        operatorCommandSeq: commandSeqRef.current,
        operatorCommandTimestamp: Date.now(),
        operatorHeartbeat: null,
        updatedAt: Date.now(),
      }).catch(() => {});
    }
    onExit();
  }, [isTestActive, vehicleId, onExit]);

  const renderCompassTape = () => {
    // 1 degree = 2.5px. Total width of 360 degrees = 900px.
    const degreeWidth = 2.5;
    const translation = -heading * degreeWidth;
    
    const tapeMarks = [
      { deg: 0, label: 'N' }, { deg: 30, label: '30' }, { deg: 60, label: '60' },
      { deg: 90, label: 'E' }, { deg: 120, label: '120' }, { deg: 150, label: '150' },
      { deg: 180, label: 'S' }, { deg: 210, label: '210' }, { deg: 240, label: '240' },
      { deg: 270, label: 'W' }, { deg: 300, label: '300' }, { deg: 330, label: '330' }
    ];

    // Normalized display direction
    const displayDir = heading >= 337.5 || heading < 22.5 ? 'N' :
                       heading >= 22.5 && heading < 67.5 ? 'NE' :
                       heading >= 67.5 && heading < 112.5 ? 'E' :
                       heading >= 112.5 && heading < 157.5 ? 'SE' :
                       heading >= 157.5 && heading < 202.5 ? 'S' :
                       heading >= 202.5 && heading < 247.5 ? 'SW' :
                       heading >= 247.5 && heading < 292.5 ? 'W' : 'NW';

    return (
      <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 w-80 h-12 bg-black/60 backdrop-blur-sm rounded-xl border border-white/10 flex flex-col items-center justify-between py-1 px-4 overflow-hidden select-none shadow-lg">
        {/* Active heading read-out */}
        <span className="text-[11px] font-black font-mono text-joppli-green">
          {Math.round(heading)}° {displayDir}
        </span>
        
        {/* Moving Tape */}
        <div className="w-full relative h-5 overflow-hidden flex justify-center">
          {/* Centered tick pointer */}
          <div className="absolute top-0 bottom-0 w-px bg-joppli-green z-10"></div>
          
          <div 
            className="flex absolute h-full items-end transition-transform duration-100 ease-out"
            style={{ 
              transform: `translateX(${translation}px)`,
              width: `${360 * degreeWidth}px`
            }}
          >
            {[-1, 0, 1].map((multiplier) => (
              <div 
                key={multiplier} 
                className="absolute flex items-end h-full"
                style={{ left: `${multiplier * 360 * degreeWidth}px`, width: `${360 * degreeWidth}px` }}
              >
                {tapeMarks.map((mark) => (
                  <div 
                    key={mark.deg} 
                    className="absolute flex flex-col items-center justify-end h-full" 
                    style={{ left: `${mark.deg * degreeWidth}px`, transform: 'translateX(-50%)' }}
                  >
                    <span className="text-[8px] font-black font-mono leading-none text-white/50 mb-0.5">{mark.label}</span>
                    <div className={`w-0.5 ${mark.deg % 90 === 0 ? 'h-2 bg-white/75' : 'h-1 bg-white/30'}`}></div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const activeProj = project ?? 'zurich';
  const bounds = PLACES_BY_PROJECT[activeProj]?.bounds;
  const isGeofenceViolated = !!(bounds && lat !== null && lng !== null && (
    lat < bounds.latMin || lat > bounds.latMax || lng < bounds.lngMin || lng > bounds.lngMax
  ));

  return (
    <div className="fixed inset-0 z-50 bg-[#0c0d12] text-white font-sans flex flex-col uppercase tracking-widest overflow-hidden">

      {/* Control-lock lockout: another operator is already driving this vehicle */}
      {lockedBy && (
        <div className="absolute inset-0 z-[60] bg-black/80 backdrop-blur-md flex flex-col items-center justify-center text-center p-8">
          <div className="w-16 h-16 rounded-full bg-joppli-yellow/15 border border-joppli-yellow/30 flex items-center justify-center text-joppli-yellow mb-6">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black tracking-widest text-[#f5f5f7]">Vehicle Under Active Control</h2>
          <p className="mt-3 text-sm text-white/60 font-medium normal-case tracking-normal max-w-sm">
            <span className="font-bold text-joppli-yellow lowercase">{lockedBy}</span> currently holds the control
            lock for {displayName}. You are viewing the live feed in read-only mode. Control transfers automatically
            if their session ends or their link drops.
          </p>
          <div className="mt-8 flex items-center gap-3">
            <button
              onClick={requestControl}
              disabled={requestPending}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                requestPending
                  ? 'bg-joppli-yellow/15 border border-joppli-yellow/30 text-joppli-yellow cursor-default'
                  : 'bg-joppli-blue hover:bg-joppli-blue/80 text-white'
              }`}
            >
              <Hand className="w-4 h-4" />
              {requestPending ? 'Request Sent — Awaiting Holder…' : 'Request Control'}
            </button>
            <button
              onClick={handleExit}
              className="flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/15 rounded-xl text-xs font-bold uppercase tracking-widest transition-all"
            >
              Exit
            </button>
          </div>
        </div>
      )}

      {/* Incoming control-request banner — shown to the operator holding control */}
      {incomingRequest && !lockedBy && (
        <div className="absolute top-16 inset-x-0 z-[55] flex justify-center px-4 pt-3 pointer-events-none">
          <div className="pointer-events-auto bg-[#14151b] border border-joppli-blue/40 rounded-2xl shadow-2xl px-5 py-3 flex items-center gap-4 animate-fade-in">
            <Hand className="w-5 h-5 text-joppli-blue shrink-0" />
            <div className="normal-case tracking-normal">
              <p className="text-xs font-bold text-[#f5f5f7]">Control requested</p>
              <p className="text-[11px] text-white/55 lowercase">{incomingRequest.operator} wants to take over {displayName}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={denyControl}
                className="flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[10px] font-bold uppercase tracking-widest text-white/70 transition-all"
              >
                <X className="w-3.5 h-3.5" /> Dismiss
              </button>
              <button
                onClick={grantControl}
                className="flex items-center gap-1.5 px-3 py-2 bg-joppli-green hover:bg-joppli-green/80 text-joppli-dark rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
              >
                <Check className="w-3.5 h-3.5" /> Hand Over
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upper HUD */}
      <div className="h-16 border-b border-white/10 bg-[#14151b]/95 backdrop-blur-md px-6 flex items-center justify-between shrink-0 absolute top-0 w-full z-20">
        <div className="flex items-center gap-6">
          <div className="flex flex-col">
             <span className="text-[10px] text-white/50 font-bold mb-0.5">Teleoperation Active</span>
             <div className="flex items-center gap-2">
               <span className="w-2.5 h-2.5 rounded-full bg-joppli-red animate-pulse shadow-[0_0_8px_rgba(245,80,69,0.8)]"></span>
               <span className="font-mono font-black text-base text-[#f5f5f7]">{displayName}</span>
             </div>
          </div>
          <div className="h-8 w-px bg-white/20"></div>
          <div className="flex gap-6">
             <div className="flex flex-col">
               <span className="text-[10px] text-white/50 mb-0.5">Link Status</span>
               <span className={`text-xs font-black flex items-center gap-1.5 ${linkDegraded ? 'text-joppli-red' : 'text-joppli-green'}`}>
                 {linkDegraded
                   ? <><AlertTriangle className="w-3.5 h-3.5 animate-pulse" /> LINK DEGRADED</>
                   : <><Radio className="w-3.5 h-3.5" /> {isTestActive ? (p2pConnected ? "P2P VIDEO ONLINE" : "SIGNALING CONNECTING") : "LOCAL MODE"}</>
                 }
               </span>
             </div>
             <div className="flex flex-col">
               <span className="text-[10px] text-white/50 mb-0.5">Latency</span>
               <span className={`text-xs font-black font-mono ${latency > 250 ? 'text-joppli-red' : 'text-white'}`}>
                 {`${latency.toFixed(0)} ms`}
               </span>
             </div>
             <div className="flex flex-col">
               <span className="text-[10px] text-white/50 mb-0.5">Input</span>
               <span className="text-xs font-black flex items-center gap-1.5 text-white/80">
                 {inputMode === 'gamepad'
                   ? <><Gamepad2 className="w-3.5 h-3.5 text-joppli-green" /> GAMEPAD</>
                   : <><Keyboard className="w-3.5 h-3.5 text-joppli-blue" /> WASD / ARROWS</>
                 }
               </span>
             </div>
          </div>
        </div>

        <button
          onClick={handleExit}
          className="flex items-center gap-2 px-5 py-2 bg-white/5 hover:bg-joppli-red border border-white/10 hover:border-joppli-red rounded-lg text-xs font-bold transition-all btn-tactile shrink-0 uppercase tracking-widest"
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

        {/* Scrolling Compass Tape Overlay */}
        {isTestActive && renderCompassTape()}

        {/* Dynamic Steering HUD Reticle */}
        <div className={`absolute inset-0 pointer-events-none z-10 flex items-center justify-center opacity-75 ${estopEngaged ? 'hidden' : ''}`}>
          {/* Main crosshair lines */}
          <div className="w-20 h-px bg-white/10"></div>
          <div className="h-20 w-px bg-white/10"></div>
          
          {/* Rotating steering indicator */}
          <div 
            className="absolute transition-transform duration-75 ease-out flex items-center justify-center"
            style={{ transform: `rotate(${steering}deg)` }}
          >
            {/* Outer dashed ring */}
            <div className="w-28 h-28 border-2 border-dashed border-joppli-green/20 rounded-full flex items-center justify-center">
              {/* Left/Right pitch markers */}
              <div className="absolute left-0 w-2.5 h-0.5 bg-joppli-green"></div>
              <div className="absolute right-0 w-2.5 h-0.5 bg-joppli-green"></div>
              {/* Top pointer */}
              <div className="absolute top-1.5 w-1 h-2 bg-joppli-green rounded-full shadow-[0_0_8px_rgba(109,186,50,0.4)]"></div>
            </div>
            {/* Inner dynamic target indicator */}
            <div className="w-10 h-10 border border-joppli-green/45 rounded-full flex items-center justify-center shadow-[0_0_8px_rgba(109,186,50,0.2)]">
              <div className="w-1.5 h-1.5 bg-joppli-green rounded-full shadow-[0_0_6px_rgba(109,186,50,0.8)]"></div>
            </div>
          </div>
        </div>

        {/* Left Side: Braking HUD Bar */}
        {isTestActive && (
          <div className="absolute left-6 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-2 bg-black/60 backdrop-blur-sm p-3 rounded-2xl border border-white/10 shadow-lg select-none">
            <span className="text-[8px] font-black text-joppli-red tracking-wider">BRAKE</span>
            <div className="w-3.5 h-32 bg-white/10 rounded-full overflow-hidden flex flex-col justify-end">
              <div 
                className="w-full bg-joppli-red rounded-full transition-all duration-100 ease-out"
                style={{ height: `${isBraking ? 100 : 0}%` }}
              ></div>
            </div>
            <span className="text-[9px] font-mono font-bold text-joppli-red">{isBraking ? 'ON' : 'OFF'}</span>
          </div>
        )}

        {/* Right Side: Throttle/Power HUD Bar */}
        {isTestActive && (
          <div className="absolute right-6 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-2 bg-black/60 backdrop-blur-sm p-3 rounded-2xl border border-white/10 shadow-lg select-none">
            <span className="text-[8px] font-black text-joppli-blue tracking-wider">POWER</span>
            <div className="w-3.5 h-32 bg-white/10 rounded-full overflow-hidden flex flex-col justify-end">
              <div 
                className="w-full bg-joppli-blue rounded-full transition-all duration-100 ease-out"
                style={{ height: `${throttle}%` }}
              ></div>
            </div>
            <span className="text-[9px] font-mono font-bold text-joppli-blue">{throttle}%</span>
          </div>
        )}

        {/* Geofence violation warning banner */}
        {isTestActive && isGeofenceViolated && (
          <div className="absolute top-36 left-1/2 -translate-x-1/2 z-20 bg-joppli-red/90 text-white font-black text-[10px] tracking-widest px-6 py-2.5 rounded-full border border-white/20 shadow-2xl animate-pulse flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>WARNING: ODD GEOFENCE VIOLATION DETECTED</span>
          </div>
        )}

        {/* Top-Right HUD Stats & Signal Quality Gauge */}
        {isTestActive && (
          <div className="absolute top-20 right-6 bg-black/75 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-white/10 z-20 flex items-center gap-3 shadow-lg font-mono text-[9px] text-white/70 select-none">
            <div className="flex items-center gap-1">
              <span>RTT</span>
              <span className={`font-bold ${latency > 200 ? 'text-joppli-red animate-pulse' : latency > 100 ? 'text-joppli-yellow' : 'text-joppli-green'}`}>
                {latency.toFixed(0)}ms
              </span>
            </div>
            <div className="w-px h-3 bg-white/20"></div>
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((bar) => {
                const active = latency < 300 && (
                  bar === 1 ||
                  (bar === 2 && latency < 200) ||
                  (bar === 3 && latency < 120) ||
                  (bar === 4 && latency < 80) ||
                  (bar === 5 && latency < 50)
                );
                return (
                  <div 
                    key={bar} 
                    className={`w-0.5 rounded-sm ${active ? 'bg-joppli-green' : 'bg-white/25'}`}
                    style={{ height: `${bar * 2 + 2}px` }}
                  ></div>
                );
              })}
            </div>
            <span className={`font-bold text-[8px] tracking-widest ${latency > 200 ? 'text-joppli-red' : 'text-joppli-green'}`}>
              {latency > 200 ? 'POOR' : latency > 100 ? 'FAIR' : 'EXCELLENT'}
            </span>
          </div>
        )}

        {/* Emergency-stop screen overlay */}
        {estopEngaged && (
          <div className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center bg-joppli-red/15 border-4 border-joppli-red animate-pulse">
            <div className="flex flex-col items-center gap-2 bg-black/60 px-8 py-5 rounded-2xl">
              <Octagon className="w-12 h-12 text-joppli-red" />
              <span className="text-2xl font-black tracking-widest text-white">EMERGENCY STOP</span>
              <span className="text-[10px] text-white/60 normal-case tracking-normal">Vehicle held in minimal-risk maneuver — press Resume or Spacebar to continue</span>
            </div>
          </div>
        )}

        {/* Label Placement */}
        <div className="absolute top-20 left-6 bg-black/75 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-white/10 z-20 flex items-center gap-2 shadow-lg">
          <Camera className="w-4 h-4 text-white/60" />
          <span className="text-[10px] font-bold text-[#f5f5f7]">MAIN FRONT CAM (STREAM)</span>
          <span className="w-2 h-2 rounded-full bg-joppli-green animate-pulse"></span>
        </div>

        {/* Live on-screen telemetry overlay */}
        <div className="absolute bottom-40 left-6 z-20 w-52 font-mono text-xs bg-black/65 p-4 rounded-2xl border border-white/5 backdrop-blur-sm flex flex-col gap-1.5">
          <div className="flex justify-between text-joppli-green font-bold"><span>SPD</span><span>{(speed * 3.6).toFixed(1)} KM/H</span></div>
          <div className="flex justify-between text-white/60"><span>RPM</span><span>{Math.floor(1100 + speed * 150)}</span></div>
          <div className="flex justify-between text-white/60"><span>STR_CMD</span><span>{steering > 0 ? `R ${steering}°` : steering < 0 ? `L ${Math.abs(steering)}°` : "0°"}</span></div>
          <div className="flex justify-between text-joppli-blue font-bold"><span>BATTERY</span><span>{battery}%</span></div>
          <div className="flex justify-between text-white/40 text-[9px] border-t border-white/10 pt-1.5 mt-1"><span>CORES</span><span>ARMv8-A DUAL</span></div>
        </div>
      </div>

      {/* Operator Cockpit Industrial Bottom Selector Panel.
          Scrolls horizontally on narrow screens so the fixed-width control
          blocks don't clip on tablets. */}
      <div className="absolute bottom-0 inset-x-0 h-36 bg-[#14151b] border-t border-white/10 z-30 flex items-center px-4 md:px-6 gap-4 md:gap-6 pb-2 shadow-2xl overflow-x-auto">
          
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

          {/* EMERGENCY STOP (RD UX #2) */}
          <div className="flex flex-col justify-center items-center shrink-0 border-r border-white/10 pr-6 h-full">
            <button
              onClick={() => (estopEngaged ? releaseEstop() : engageEstop())}
              className={`w-24 h-24 rounded-full flex flex-col items-center justify-center gap-1 font-black uppercase tracking-widest text-xs transition-all border-4 shadow-lg btn-tactile ${
                estopEngaged
                  ? 'bg-white text-joppli-red border-joppli-red animate-pulse'
                  : 'bg-joppli-red text-white border-white/80 hover:bg-joppli-red/90 shadow-joppli-red/30'
              }`}
            >
              <Octagon className="w-6 h-6" />
              {estopEngaged ? 'Resume' : 'E-Stop'}
            </button>
            <span className="text-[8px] text-white/35 font-bold mt-2 tracking-widest">SPACEBAR</span>
          </div>

          {/* AUXILIARY BACKUP CHANNELS (FRONT LEFT, REAR, FRONT RIGHT) */}
          <div className="flex-1 h-full flex items-center justify-center gap-3 px-2">
            {[
              { name: 'LEFT SIDE CAM', id: 'left' },
              { name: 'REAR CH-2 CAM', id: 'rear' },
              { name: 'RIGHT SIDE CAM', id: 'right' }
            ].map(cam => (
               <div key={cam.id} className="h-24 flex-1 bg-black/60 rounded-2xl border border-white/10 relative overflow-hidden flex items-center justify-center max-w-[200px] shadow-lg">
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
