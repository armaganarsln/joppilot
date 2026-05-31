import React, { useState, useEffect, useRef } from 'react';
import { Camera, Video, AlertTriangle, Play, Pause, Route, Check, RefreshCcw } from 'lucide-react';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Vehicle, WorkspaceProject } from '../types';
import { vehicleName } from '../config/vehicles';
import { getIceServers } from '../lib/iceServers';

interface RemoteAssistanceViewProps {
  vehicles: Vehicle[];
  onRemoteDrive?: (vehicleId: string) => void;
  project?: WorkspaceProject;
}

export const RemoteAssistanceView: React.FC<RemoteAssistanceViewProps> = ({ vehicles, onRemoteDrive, project }) => {
  const [selectedVehicleId, setSelectedVehicleId] = useState<'v1' | 'v2'>('v2');
  const [isTestActive, setIsTestActive] = useState(false);
  const [avState, setAvState] = useState('ASSISTANCE_REQUESTED');
  const [assistanceCause, setAssistanceCause] = useState('construction_zone');
  const [p2pConnected, setP2pConnected] = useState(false);
  const [auditLogs, setAuditLogs] = useState<Array<{ text: string, time: string, type: 'info' | 'alert' | 'success' }>>([
    { text: 'System on-route checkpoint logged', time: '14:22:04', type: 'info' },
    { text: 'Unmapped obstacle detected by ultrasonic array', time: '14:22:06', type: 'alert' }
  ]);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const candAdded = useRef<Set<string>>(new Set());
  // Monotonic command counter so the vehicle detects new commands without
  // cross-device wall-clock comparison (see TestVehicleScreen).
  const commandSeqRef = useRef(0);

  const currentVehicleName = vehicleName(selectedVehicleId, project ?? 'zurich');

  // Listen to selected vehicle changes from firestore
  useEffect(() => {
    // Check if the selected vehicle currently has an active simulator in Firestore
    const unsub = onSnapshot(doc(db, 'test_vehicles', selectedVehicleId), (snapshot) => {
      if (!snapshot.exists()) {
        setIsTestActive(false);
        return;
      }
      const data = snapshot.data();
      if (data.isActive) {
        setIsTestActive(true);
        setAvState(data.avState || 'AUTONOMOUS');
        setAssistanceCause(data.assistanceCause || 'unmapped_obstacle');
      } else {
        setIsTestActive(false);
      }
    });

    return () => unsub();
  }, [selectedVehicleId]);

  // Subscribe to WebRTC stream from vehicle
  useEffect(() => {
    if (!isTestActive) {
      setP2pConnected(false);
      return;
    }

    const unsubSignaling = onSnapshot(doc(db, 'webrtc_signaling', selectedVehicleId), async (snapshot) => {
      if (!snapshot.exists()) return;
      const data = snapshot.data();

      // If an offer is present from the phone and we have not constructed our connection yet
      if (data.offer && !pcRef.current) {
        try {
          const pc = new RTCPeerConnection({
            iceServers: await getIceServers()
          });
          pcRef.current = pc;

          pc.onconnectionstatechange = () => {
            if (pc.connectionState === 'connected') {
              setP2pConnected(true);
            } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
              setP2pConnected(false);
            }
          };

          // Capture phone camera stream track and bind to FRONT video element
          pc.ontrack = (event) => {
            if (videoRef.current && event.streams[0]) {
              videoRef.current.srcObject = event.streams[0];
            }
          };

          // Generate operator peer candidates list
          const localCandidates: RTCIceCandidateInit[] = [];
          pc.onicecandidate = async (event) => {
            if (event.candidate) {
              localCandidates.push(event.candidate.toJSON());
              await updateDoc(doc(db, 'webrtc_signaling', selectedVehicleId), {
                candidates_operator: JSON.stringify(localCandidates),
                updatedAt: Date.now()
              }).catch(() => {});
            }
          };

          // Apply phone offer
          const offerSdp = JSON.parse(data.offer);
          await pc.setRemoteDescription(new RTCSessionDescription(offerSdp));

          // Generate answer
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          // Update answer back in firestore
          await updateDoc(doc(db, 'webrtc_signaling', selectedVehicleId), {
            answer: JSON.stringify({ sdp: answer.sdp, type: answer.type }),
            updatedAt: Date.now()
          });

        } catch (err) {
          console.error("Failed to construct remote connection in RemoteAssistanceView:", err);
        }
      }

      // Sync ICE candidates
      if (data.candidates_vehicle && pcRef.current) {
        try {
          const remoteCandidates: RTCIceCandidateInit[] = JSON.parse(data.candidates_vehicle);
          remoteCandidates.forEach((cand) => {
            const candStr = JSON.stringify(cand);
            if (!candAdded.current.has(candStr)) {
              pcRef.current?.addIceCandidate(new RTCIceCandidate(cand))
                .catch(() => {});
              candAdded.current.add(candStr);
            }
          });
        } catch (err) {
          console.error("Applying ICE candidates failed:", err);
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
  }, [selectedVehicleId, isTestActive]);

  // Command Writers
  const sendOperatorCommand = async (command: 'PROCEED' | 'WAIT' | 'REROUTE' | 'TAKE_OVER') => {
    // Add command locally to Audit logs
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    setAuditLogs(prev => [
      { text: `Transmitted Command: ${command.replace('_', ' ')}`, time: timeStr, type: 'success' },
      ...prev
    ]);

    // Push to Firestore
    commandSeqRef.current += 1;
    await updateDoc(doc(db, 'test_vehicles', selectedVehicleId), {
      operatorCommand: command,
      operatorCommandSeq: commandSeqRef.current,
      operatorCommandTimestamp: Date.now(),
      avState: command === 'TAKE_OVER' ? 'MANUAL' : command === 'PROCEED' ? 'AUTONOMOUS' : avState,
      updatedAt: Date.now()
    }).catch(err => console.error("Firestore command push failed (non-blocking outside testbed mode):", err));
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0d0e12] text-white font-sans">
      
      {/* Top Warning Banner */}
      <div className={`px-6 py-3 flex items-center justify-between shrink-0 shadow-md z-10 transition-colors ${avState === 'ASSISTANCE_REQUESTED' ? 'bg-joppli-red' : 'bg-joppli-dark border-b border-white/10'}`}>
        <div className="flex items-center gap-4">
          <AlertTriangle className="w-5 h-5 text-white animate-pulse" />
          <span className="font-extrabold text-xs tracking-widest uppercase">AV ADVISORY: {avState}</span>
          <span className="text-white/40 font-bold">|</span>
          
          {/* Target vehicle selectors */}
          <div className="flex bg-black/30 rounded-lg p-0.5 border border-white/10 shrink-0">
            <button
              onClick={() => setSelectedVehicleId('v1')}
              className={`px-3 py-1 font-mono text-xs font-black rounded-md ${selectedVehicleId === 'v1' ? 'bg-white text-[#0f1016]' : 'text-white/60 hover:text-white'}`}
            >
              JÖP-01
            </button>
            <button
              onClick={() => setSelectedVehicleId('v2')}
              className={`px-3 py-1 font-mono text-xs font-black rounded-md ${selectedVehicleId === 'v2' ? 'bg-white text-[#0f1016]' : 'text-white/60 hover:text-white'}`}
            >
              JÖP-02
            </button>
          </div>

          <span className="text-white/40 font-bold">|</span>
          <span className="font-bold text-xs uppercase text-[#f5f5f7]">
            {isTestActive ? "Test Sim Active" : "Static Simulator Mode"}
          </span>

          {isTestActive && (
            <span className="px-2 py-0.5 bg-white text-joppli-red rounded font-black text-[9px] animate-pulse">
              TEST ACTIVE
            </span>
          )}
        </div>
        <span className="font-mono font-bold bg-black/20 px-3 py-1 rounded-lg text-xs tracking-wider">
          REASON CODE: {assistanceCause.replace('_', ' ')}
        </span>
      </div>

      <div className="flex flex-1 overflow-hidden">
        
        {/* Main Teleoperation / Feeds Panel */}
        <div className="flex-1 flex flex-col p-4 gap-4 overflow-y-auto">
          {/* Camera feeds (4-pane grid layout) */}
          <div className="grid grid-cols-2 gap-3 min-h-[350px] flex-1">
            
            {/* FRONT CAM (Our WebRTC or local loader endpoint) */}
            <div className="bg-black/60 rounded-2xl border border-white/10 p-1 relative overflow-hidden flex items-center justify-center min-h-[160px]">
              <div className="absolute top-3 left-3 bg-black/75 backdrop-blur-sm px-2 py-1 rounded-lg text-[9px] font-black tracking-widest text-[#f5f5f7] z-10 flex items-center gap-1.5">
                FRONT CH-1 (TELEOP) 
                <span className={isTestActive ? "text-joppli-green" : "text-joppli-yellow"}>●</span>
              </div>

              {isTestActive ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover rounded-xl"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-white/20">
                  <Video className="w-10 h-10 mb-2" />
                  <span className="font-mono text-[10px] tracking-widest text-center">NO HARDWARE ATTACHED</span>
                  <span className="text-[9px] text-white/40 mt-1">Activate "Test Vehicle Mode" on simulated mobile</span>
                </div>
              )}

              {/* Grid HUD overlays */}
              <div className="absolute inset-x-0 h-px bg-joppli-green/10 top-1/2 pointer-events-none"></div>
              <div className="absolute inset-y-0 w-px bg-joppli-green/10 left-1/2 pointer-events-none"></div>
            </div>

            {/* REAR CAM Placeholder */}
            <div className="bg-black/40 rounded-2xl border border-white/10 relative overflow-hidden flex items-center justify-center min-h-[160px]">
              <div className="absolute top-3 left-3 bg-black/75 backdrop-blur-sm px-2 py-1 rounded-lg text-[9px] font-black tracking-widest text-white/50 z-10">
                REAR CH-2 CAM <span className="text-white/30">●</span>
              </div>
              <div className="w-full h-full flex flex-col items-center justify-center text-white/10">
                <Video className="w-10 h-10 mb-2" />
                <span className="font-mono text-[10px]">STAND-BY DATASTREAM</span>
              </div>
            </div>

            {/* LEFT CAM Placeholder */}
            <div className="bg-black/40 rounded-2xl border border-white/10 relative overflow-hidden flex items-center justify-center min-h-[160px]">
              <div className="absolute top-3 left-3 bg-black/75 backdrop-blur-sm px-2 py-1 rounded-lg text-[9px] font-black tracking-widest text-white/50 z-10">
                LEFT CH-3 CAM <span className="text-white/30">●</span>
              </div>
              <div className="w-full h-full flex flex-col items-center justify-center text-white/10">
                <Video className="w-10 h-10 mb-2" />
                <span className="font-mono text-[10px]">STAND-BY DATASTREAM</span>
              </div>
            </div>

            {/* RIGHT CAM Placeholder */}
            <div className="bg-black/40 rounded-2xl border border-white/10 relative overflow-hidden flex items-center justify-center min-h-[160px]">
              <div className="absolute top-3 left-3 bg-black/75 backdrop-blur-sm px-2 py-1 rounded-lg text-[9px] font-black tracking-widest text-white/50 z-10">
                RIGHT CH-4 CAM <span className="text-white/30">●</span>
              </div>
              <div className="w-full h-full flex flex-col items-center justify-center text-white/10">
                <Video className="w-10 h-10 mb-2" />
                <span className="font-mono text-[10px]">STAND-BY DATASTREAM</span>
              </div>
            </div>

          </div>

          {/* Bottom map / lidar trajectory */}
          <div className="h-44 bg-[#14151c] rounded-2xl border border-white/10 p-3 relative overflow-hidden flex flex-col justify-end shrink-0">
            <span className="absolute top-3 right-3 bg-black/50 px-2 py-1 rounded text-[9px] font-bold text-white/40 tracking-wider">
              HD MAP / TRAJECTORY ARCS
            </span>
            <div className="flex-1 w-full flex items-center justify-center relative">
              <div className="w-full h-12 bg-white/5 absolute transform -rotate-6"></div>
              <div className="w-10 h-6 bg-joppli-blue border-2 border-white rounded absolute z-10 flex items-center justify-center text-[8px] font-mono font-bold">
                {currentVehicleName}
              </div>
              <div className="w-8 h-8 rounded bg-joppli-red/20 border border-joppli-red absolute translate-x-16 translate-y-4 flex items-center justify-center text-[7px] text-joppli-red font-black">
                OBS
              </div>
            </div>
          </div>
        </div>

        {/* Resolution Actions Panel */}
        <div className="w-80 border-l border-white/10 bg-[#14151c] flex flex-col shrink-0">
          <div className="p-4 border-b border-white/10">
            <h3 className="font-extrabold text-sm text-[#f5f5f7] uppercase tracking-wider mb-1">autonomy controls</h3>
            <p className="text-[10px] text-white/50 lowercase tracking-normal">Direct signal path to {currentVehicleName}.</p>
          </div>

          {/* Operator commands selectors */}
          <div className="p-4 flex flex-col gap-3 flex-1 overflow-y-auto">
            
            <button 
              onClick={() => sendOperatorCommand('PROCEED')}
              className="w-full py-4 bg-joppli-green text-joppli-dark rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-[#5fa22a] transition-all flex flex-col items-center gap-1 shadow-md"
            >
              <Check className="w-4 h-4" />
              Approve Proceed
            </button>

            <button 
              onClick={() => sendOperatorCommand('WAIT')}
              className="w-full py-3 bg-white/5 border border-white/10 hover:border-white/20 text-[#f5f5f7] rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-white/10 transition-all flex items-center justify-center gap-2"
            >
              <Pause className="w-4 h-4" /> Wait (Hold Pos)
            </button>

            <button 
              onClick={() => sendOperatorCommand('REROUTE')}
              className="w-full py-3 bg-white/5 border border-white/10 hover:border-white/20 text-[#f5f5f7] rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-white/10 transition-all flex items-center justify-center gap-2"
            >
              <Route className="w-4 h-4" /> Reroute Trajectory
            </button>

            <button 
              onClick={() => {
                sendOperatorCommand('TAKE_OVER');
                onRemoteDrive?.(selectedVehicleId);
              }}
              className="w-full py-3 border border-joppli-red/30 bg-joppli-red/10 hover:bg-joppli-red/25 text-joppli-red rounded-xl font-black uppercase tracking-widest text-xs hover:text-white transition-all flex items-center justify-center gap-2 mt-4"
            >
              <AlertTriangle className="w-4 h-4" /> Take Over (Manual)
            </button>
          </div>

          {/* Real-time Audit logs */}
          <div className="p-4 border-t border-white/10 bg-black/20 shrink-0">
            <span className="text-[9px] font-black text-white/40 tracking-wider uppercase block mb-3">Audit Log Readout</span>
            <div className="space-y-3 max-h-32 overflow-y-auto">
              {auditLogs.map((log, idx) => (
                <div key={idx} className="flex gap-2">
                   <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${log.type === 'alert' ? 'bg-joppli-red' : log.type === 'success' ? 'bg-joppli-green' : 'bg-joppli-blue'}`}></div>
                   <div>
                     <p className="text-[11px] text-white/90 leading-tight font-medium lowercase first-letter:uppercase">{log.text}</p>
                     <p className="text-[9px] text-white/30 font-mono">{log.time}</p>
                   </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
