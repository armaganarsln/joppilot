import React, { useState } from 'react';
import { Vehicle } from '../types';
import { Settings, ShieldAlert, Cpu, Network, Map as MapIcon, ChevronLeft, Power, AlertTriangle, AlertCircle, CheckCircle2, History, Radio } from 'lucide-react';

interface VehicleDetailViewProps {
  vehicleId: string;
  onRemoteDrive: () => void;
  onBack: () => void;
}

export const VehicleDetailView: React.FC<VehicleDetailViewProps> = ({ vehicleId, onRemoteDrive, onBack }) => {
  return (
    <div className="flex-1 overflow-y-auto p-6 bg-joppli-light font-sans flex flex-col items-center">
      <div className="w-full max-w-5xl mb-6">
        <button onClick={onBack} className="flex items-center gap-2 text-joppli-dark/60 hover:text-joppli-dark font-medium text-sm transition-colors mb-4">
          <ChevronLeft className="w-4 h-4" /> Back to Fleet
        </button>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-black text-joppli-dark">{vehicleId}</h1>
            <span className="bg-joppli-green/10 text-joppli-green font-bold text-xs px-3 py-1 rounded-full uppercase tracking-widest border border-joppli-green/20">AUTONOMOUS</span>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={onRemoteDrive}
              className="flex items-center gap-2 px-4 py-2 bg-joppli-dark text-white rounded-lg text-sm font-bold shadow-sm hover:bg-joppli-blue transition-all"
            >
              <Radio className="w-4 h-4" /> Remote Drive
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-joppli-red/10 text-joppli-red border border-joppli-red/20 rounded-lg text-sm font-bold shadow-sm hover:bg-joppli-red hover:text-white transition-all">
              <Power className="w-4 h-4" /> Take out of service
            </button>
          </div>
        </div>
      </div>

      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* State Summary Panel */}
        <div className="bg-white rounded-2xl p-6 border border-joppli-grey shadow-sm flex flex-col gap-4">
          <h3 className="text-sm font-bold text-joppli-dark/50 uppercase tracking-widest">Current Trip</h3>
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Battery</span>
            <span className="text-lg font-black text-joppli-green">82%</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Capacity</span>
            <span className="text-lg font-black text-joppli-blue">45%</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Lat / Lng</span>
            <span className="font-mono text-xs text-joppli-dark/60 font-bold">47.3712, 8.5135</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Current Route</span>
            <span className="text-xs font-bold text-joppli-dark bg-joppli-grey px-2 py-1 rounded">R-349-B</span>
          </div>
        </div>

        {/* Sensor Health Grid */}
        <div className="bg-white rounded-2xl p-6 border border-joppli-grey shadow-sm col-span-1 md:col-span-2">
          <h3 className="text-sm font-bold text-joppli-dark/50 uppercase tracking-widest mb-4">Sensor Health Grid</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { id: 'cam_front', name: 'Front Camera', state: 'OK', cal: 'In Tolerance' },
              { id: 'cam_rear', name: 'Rear Camera', state: 'OK', cal: 'In Tolerance' },
              { id: 'lidar_top', name: 'Top LIDAR', state: 'OK', cal: 'In Tolerance' },
              { id: 'cam_left', name: 'Left Camera', state: 'DEGRADED', cal: 'Needs Check' },
              { id: 'cam_right', name: 'Right Camera', state: 'OK', cal: 'In Tolerance' },
              { id: 'imu_0', name: 'IMU Primary', state: 'OK', cal: 'In Tolerance' },
              { id: 'gnss_rtk', name: 'RTK GPS', state: 'OK', cal: 'In Tolerance' },
              { id: 'radar_front', name: 'Front Radar', state: 'OK', cal: 'In Tolerance' },
            ].map(s => (
              <div key={s.id} className="border border-joppli-grey rounded-xl p-3 flex flex-col gap-1">
                <span className="text-xs font-bold text-joppli-dark truncate">{s.name}</span>
                <div className="flex items-center gap-1.5 mt-1">
                  <div className={`w-2 h-2 rounded-full ${s.state === 'OK' ? 'bg-joppli-green' : 'bg-joppli-yellow'}`}></div>
                  <span className={`text-[10px] font-bold tracking-widest uppercase ${s.state === 'OK' ? 'text-joppli-green' : 'text-joppli-yellow'}`}>{s.state}</span>
                </div>
                <span className="text-[10px] text-joppli-dark/50 font-medium mt-1">Cal: {s.cal}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Software Stack */}
        <div className="bg-white rounded-2xl p-6 border border-joppli-grey shadow-sm">
          <div className="flex justify-between items-center mb-4">
             <h3 className="text-sm font-bold text-joppli-dark/50 uppercase tracking-widest">Software Stack</h3>
             <span className="w-2 h-2 rounded-full bg-joppli-green shrink-0"></span>
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-bold text-joppli-dark/70">Autonomy Core</span>
                <span className="font-mono font-bold">Jöppilot 2026.04</span>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-bold text-joppli-dark/70">ECU Firmware</span>
                <span className="font-mono font-bold">v1.4.2</span>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-bold text-joppli-dark/70">HD Map Version</span>
                <span className="font-mono font-bold">AW-24Q3-V2</span>
              </div>
            </div>
            <div className="pt-4 border-t border-joppli-grey mt-2">
              <div className="text-xs font-bold text-joppli-blue flex items-center justify-between">
                Update Queued (Jöppilot 2026.05) <button className="underline">Review</button>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Disengagements */}
        <div className="bg-white rounded-2xl p-6 border border-joppli-grey shadow-sm col-span-1 md:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-bold text-joppli-dark/50 uppercase tracking-widest">Recent Disengagements (30 Days)</h3>
            <button className="text-xs font-bold text-joppli-blue">View Audit Log</button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-medium text-joppli-dark">
              <thead>
                <tr className="text-left text-xs text-joppli-dark/40 uppercase tracking-widest border-b border-joppli-grey">
                  <th className="pb-2 font-bold">Date / Time</th>
                  <th className="pb-2 font-bold">Cause Code</th>
                  <th className="pb-2 font-bold">Resolution</th>
                  <th className="pb-2 font-bold text-right">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-joppli-grey">
                <tr className="hover:bg-joppli-light transition-colors">
                  <td className="py-3 font-mono text-xs">Today, 14:22:04</td>
                  <td className="py-3"><span className="bg-joppli-red/10 text-joppli-red px-2 py-0.5 rounded text-xs font-bold">unmapped_obstacle</span></td>
                  <td className="py-3">Remote Operator Approved</td>
                  <td className="py-3 text-right"><button className="text-joppli-blue font-bold text-xs underline flex items-center justify-end gap-1"><History className="w-3 h-3" /> Trip Rec</button></td>
                </tr>
                <tr className="hover:bg-joppli-light transition-colors">
                  <td className="py-3 font-mono text-xs">Oct 2, 09:15:12</td>
                  <td className="py-3"><span className="bg-joppli-yellow/10 text-joppli-yellow px-2 py-0.5 rounded text-xs font-bold">pedestrian_intent_unclear</span></td>
                  <td className="py-3">Self-Resolved (Timeout)</td>
                  <td className="py-3 text-right"><button className="text-joppli-blue font-bold text-xs underline flex items-center justify-end gap-1"><History className="w-3 h-3" /> Trip Rec</button></td>
                </tr>
                <tr className="hover:bg-joppli-light transition-colors">
                  <td className="py-3 font-mono text-xs">Sep 28, 11:40:00</td>
                  <td className="py-3"><span className="bg-joppli-red/10 text-joppli-red px-2 py-0.5 rounded text-xs font-bold">safety_driver_takeover</span></td>
                  <td className="py-3">Manual Intervention</td>
                  <td className="py-3 text-right"><button className="text-joppli-blue font-bold text-xs underline flex items-center justify-end gap-1"><History className="w-3 h-3" /> Trip Rec</button></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
