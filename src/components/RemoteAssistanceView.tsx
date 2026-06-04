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
  
  const isV1 = selectedVehicleId === 'v1';
  const binColor = isV1 ? '#F59E0B' : '#475569';
  const cabColor = '#F3F4F6';

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
          <div className={`h-44 rounded-2xl border p-3 relative overflow-hidden flex flex-col justify-end shrink-0 transition-colors duration-300 ${
            avState === 'ASSISTANCE_REQUESTED' ? 'bg-[#1e1315] border-[#EF4444]/30' : 'bg-[#101116] border-white/10'
          }`}>
            <style dangerouslySetInnerHTML={{ __html: `
              @keyframes radarSweep {
                from { transform: rotate(-50deg); }
                to { transform: rotate(50deg); }
              }
              .radar-sweep-line {
                animation: radarSweep 2.5s ease-in-out infinite alternate;
                transform-origin: 175px 115px;
              }
              @keyframes blinkRed {
                0% { opacity: 0.15; }
                50% { opacity: 0.45; }
                100% { opacity: 0.15; }
              }
              .hazard-glow {
                animation: blinkRed 1s infinite;
              }
            `}} />

            <div className="absolute top-3 left-3 flex items-center gap-2 z-10">
              <span className={`w-1.5 h-1.5 rounded-full ${avState === 'ASSISTANCE_REQUESTED' ? 'bg-[#EF4444] animate-pulse' : 'bg-[#10B981]'}`}></span>
              <span className="font-mono text-[9px] font-black uppercase tracking-wider text-white/70">
                {avState === 'ASSISTANCE_REQUESTED' ? 'LIDAR: OBSTACLE DETECTED' : 'LIDAR: ENVIRONMENT NOMINAL'}
              </span>
            </div>

            <span className="absolute top-3 right-3 bg-black/50 px-2.5 py-1 rounded font-mono text-[8px] font-black text-white/50 tracking-widest border border-white/5 z-10">
              HD MAP & TARGET VECTOR
            </span>

            {/* SVG Lidar Grid Display */}
            <div className="absolute inset-0 w-full h-full flex items-center justify-center pointer-events-none">
              <svg width="350" height="176" viewBox="0 0 350 176" fill="none" className="w-full h-full">
                {/* Radar Grid Center: (175, 115) */}
                <g opacity="0.15">
                  {/* Concentric Range Rings */}
                  <circle cx="175" cy="115" r="30" stroke="#fff" strokeWidth="1" strokeDasharray="2 2" />
                  <circle cx="175" cy="115" r="65" stroke="#fff" strokeWidth="1" strokeDasharray="3 3" />
                  <circle cx="175" cy="115" r="105" stroke="#fff" strokeWidth="1" strokeDasharray="3 3" />
                  <circle cx="175" cy="115" r="145" stroke="#fff" strokeWidth="1" strokeDasharray="4 4" />
                  
                  {/* Grid Lines */}
                  <line x1="175" y1="115" x2="30" y2="30" stroke="#fff" strokeWidth="1" strokeDasharray="2 2" />
                  <line x1="175" y1="115" x2="175" y2="10" stroke="#fff" strokeWidth="1" strokeDasharray="2 2" />
                  <line x1="175" y1="115" x2="320" y2="30" stroke="#fff" strokeWidth="1" strokeDasharray="2 2" />
                </g>

                {/* Range Labels */}
                <g fill="rgba(255,255,255,0.3)" fontSize="7" fontFamily="monospace" fontWeight="bold">
                  <text x="178" y="80">5m</text>
                  <text x="178" y="45">10m</text>
                  <text x="178" y="15">15m</text>
                </g>

                {/* Radar Sweep Line */}
                <line x1="175" y1="115" x2="175" y2="5" stroke={avState === 'ASSISTANCE_REQUESTED' ? '#EF4444' : '#10B981'} strokeWidth="1.5" opacity="0.3" className="radar-sweep-line" />

                {/* Static Environment Echo Points (Walls/Curb) */}
                <g fill="#10B981" opacity="0.25">
                  <circle cx="60" cy="40" r="1.5" />
                  <circle cx="65" cy="45" r="1" />
                  <circle cx="70" cy="50" r="1.5" />
                  
                  <circle cx="280" cy="55" r="1" />
                  <circle cx="285" cy="50" r="1.5" />
                  <circle cx="290" cy="45" r="1" />
                </g>

                {/* Trajectory corridor */}
                {avState === 'ASSISTANCE_REQUESTED' ? (
                  <>
                    {/* Bounded danger corridor */}
                    <path d="M163,115 C163,80 152,50 148,45 L202,45 C198,50 187,80 187,115 Z" fill="rgba(239, 68, 68, 0.04)" stroke="rgba(239, 68, 68, 0.25)" strokeWidth="1.5" strokeDasharray="3 3" />
                    
                    {/* Obstacle warning cone */}
                    <polygon points="175,95 148,45 202,45" fill="rgba(239, 68, 68, 0.12)" stroke="#EF4444" strokeWidth="1" strokeDasharray="1 3" className="hazard-glow" />

                    {/* Threat Point Cloud Cluster */}
                    <g fill="#EF4444" className="hazard-glow">
                      <circle cx="160" cy="42" r="1.5" />
                      <circle cx="166" cy="41" r="2" />
                      <circle cx="172" cy="40" r="1.5" />
                      <circle cx="178" cy="40" r="2" />
                      <circle cx="184" cy="41" r="1.5" />
                      <circle cx="190" cy="43" r="2" />
                    </g>
                    
                    {/* Obstacle Bounding Box */}
                    <rect x="148" y="32" width="54" height="12" fill="rgba(239, 68, 68, 0.25)" stroke="#EF4444" strokeWidth="1.5" rx="1" />
                    
                    {/* Threat Label Overlay */}
                    <g fill="#EF4444" fontSize="7" fontFamily="monospace" fontWeight="bold">
                      <rect x="135" y="16" width="80" height="12" fill="#1e1315" stroke="#EF4444" strokeWidth="1" rx="2" />
                      <text x="140" y="24" fill="#EF4444">WARN: STOP 4.2m</text>
                    </g>
                  </>
                ) : (
                  <>
                    {/* Safe forward corridor */}
                    <path d="M163,115 C163,80 158,50 153,10 L197,10 C192,50 187,80 187,115 Z" fill="rgba(16, 185, 129, 0.06)" stroke="rgba(16, 185, 129, 0.3)" strokeWidth="1.5" strokeDasharray="4 2" />
                    
                    {/* Safe tracking corridor centerline */}
                    <path d="M175,115 C175,80 175,50 175,10" stroke="#10B981" strokeWidth="1.5" opacity="0.6" strokeDasharray="6 3" />
                  </>
                )}

                {/* Center Vehicle Icon (facing up/North) */}
                <g transform="translate(175, 115) scale(0.95)" className="z-10">
                  {/* Wheels */}
                  <rect x="-14" y="-12" width="3.5" height="6" rx="1" fill="#030712" />
                  <rect x="10.5" y="-12" width="3.5" height="6" rx="1" fill="#030712" />
                  <rect x="-14" y="6" width="3.5" height="7" rx="1" fill="#030712" />
                  <rect x="10.5" y="6" width="3.5" height="7" rx="1" fill="#030712" />
                  
                  {/* Mirrors */}
                  <line x1="-12" y1="-10" x2="-18" y2="-10" stroke="#374151" strokeWidth="1.5" />
                  <circle cx="-18.5" cy="-10" r="1" fill="#374151" />
                  <line x1="12" y1="-10" x2="18" y2="-10" stroke="#374151" strokeWidth="1.5" />
                  <circle cx="18.5" cy="-10" r="1" fill="#374151" />
                  
                  {/* Chassis */}
                  <rect x="-12" y="-14" width="24" height="26" rx="2" fill="#1F2937" />
                  
                  {/* Cargo bin */}
                  <rect x="-11.5" y="-1" width="23" height="12" rx="1" fill={binColor} stroke="#1F2937" strokeWidth="1" />
                  
                  {/* Driver cab */}
                  <path d="M-11 -1v-7.5C-11 -10.5 -9.5 -12 -7.5 -12h15c2 0 3.5 1.5 3.5 3.5V-1h-22z" fill={cabColor} />
                  {/* Windshield */}
                  <path d="M-9 -6.5v-1C-9 -9 -8 -10 -6.5 -10h13c1.5 0 2.5 1 2.5 2.5v1H-9z" fill="#111827" opacity="0.9" />
                  
                  {/* Dashboard status light */}
                  <circle cx="0" cy="-15" r="1.5" fill={avState === 'ASSISTANCE_REQUESTED' ? '#EF4444' : '#10B981'} />
                </g>
              </svg>
            </div>

            {/* Bottom-left telemetry info Overlay */}
            <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm px-2.5 py-1.5 rounded-lg border border-white/5 font-mono text-[9px] leading-tight text-white/80 z-10 space-y-0.5">
              <div>VEHICLE: <span className="font-bold text-joppli-blue">{currentVehicleName}</span></div>
              <div>ODD STATUS: <span className={`font-bold ${avState === 'ASSISTANCE_REQUESTED' ? 'text-joppli-red' : 'text-joppli-green'}`}>{
                avState === 'ASSISTANCE_REQUESTED' ? 'STAND-BY/HOLD' : 'ACTIVE/GO'
              }</span></div>
            </div>

            {/* Bottom-right coordinates / sensor status */}
            <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-sm px-2.5 py-1.5 rounded-lg border border-white/5 font-mono text-[9px] leading-tight text-white/50 text-right z-10 space-y-0.5">
              <div>LIDAR: <span className="font-bold text-[#10B981]">ON</span></div>
              <div>STEER: <span className="font-bold text-white">0.0°</span></div>
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
