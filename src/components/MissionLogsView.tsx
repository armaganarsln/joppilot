import React from 'react';
import { Route, Map as MapIcon, ChevronRight, Activity, Camera, AlertTriangle } from 'lucide-react';

export const MissionLogsView: React.FC = () => {
  return (
    <div className="flex-1 overflow-y-auto p-6 bg-joppli-light font-sans flex flex-col items-center">
      <div className="w-full max-w-5xl mb-6">
        <h1 className="text-2xl font-bold text-joppli-dark">Mission Logs</h1>
        <p className="text-sm font-medium text-joppli-dark/60 mt-1">Timeline and telemetry review for recent fleet missions.</p>
      </div>

      <div className="w-full max-w-5xl bg-white border border-joppli-grey rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-joppli-light/50 border-b border-joppli-grey text-joppli-dark/60 font-bold uppercase tracking-widest text-[10px]">
             <tr>
               <th className="px-6 py-4 text-left font-bold">Mission ID</th>
               <th className="px-6 py-4 text-left font-bold">Vehicle</th>
               <th className="px-6 py-4 text-left font-bold">Duration</th>
               <th className="px-6 py-4 text-left font-bold">Metrics</th>
               <th className="px-6 py-4 text-left font-bold">Incidents</th>
               <th className="px-6 py-4 text-right">Review</th>
             </tr>
          </thead>
          <tbody className="divide-y divide-joppli-grey">
            {[
              { id: 'M-20261002-A', v: 'JÖP-01', t: '52m', d: '14.2 km', coll: '1.2t', i: 0 },
              { id: 'M-20261002-B', v: 'JÖP-02', t: '1h 14m', d: '22.1 km', coll: '0.8t', i: 1 },
              { id: 'M-20261002-C', v: 'JÖP-04', t: '34m', d: '8.5 km', coll: '0.4t', i: 2 },
            ].map(m => (
              <tr key={m.id} className="hover:bg-joppli-light/50 transition-colors group">
                <td className="px-6 py-4 font-mono font-bold text-joppli-blue text-xs">{m.id}</td>
                <td className="px-6 py-4 font-bold text-joppli-dark">{m.v}</td>
                <td className="px-6 py-4 font-medium text-joppli-dark/80">{m.t}</td>
                <td className="px-6 py-4">
                  <span className="text-xs font-medium text-joppli-dark/60 block">{m.d}</span>
                  <span className="text-xs font-medium text-joppli-green block">{m.coll}</span>
                </td>
                <td className="px-6 py-4">
                  {m.i > 0 ? (
                    <span className="bg-joppli-red/10 text-joppli-red font-bold text-xs px-2 py-0.5 rounded flex items-center gap-1 w-max">
                       <AlertTriangle className="w-3 h-3" /> {m.i} Alerts
                    </span>
                  ) : (
                    <span className="text-joppli-dark/40 text-xs font-medium">Clear</span>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="text-xs font-bold text-joppli-dark hover:text-joppli-blue flex items-center justify-end gap-1 transition-colors w-full">
                    View Timeline <ChevronRight className="w-3 h-3" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Visual Placeholder for a timeline */}
      <div className="w-full max-w-5xl mt-6">
        <h2 className="text-sm font-bold text-joppli-dark/60 uppercase tracking-widest mb-3">Timeline Preview (M-20261002-B)</h2>
        <div className="bg-white border text-left border-joppli-grey rounded-xl shadow-sm p-6 relative overflow-hidden">
           <div className="w-full h-1 bg-joppli-grey absolute top-1/2 left-0 transform -translate-y-1/2"></div>
           <div className="w-[80%] h-1 bg-joppli-blue absolute top-1/2 left-0 transform -translate-y-1/2"></div>
           
           <div className="flex justify-between relative z-10 -ml-2 -mr-2">
             <div className="flex flex-col items-center">
               <span className="text-[10px] font-mono text-joppli-dark/50 mb-1">09:00</span>
               <div className="w-4 h-4 rounded-full bg-joppli-blue border-4 border-white shadow-sm"></div>
               <span className="text-[10px] font-bold mt-1">START</span>
             </div>
             
             <div className="flex flex-col items-center ml-20">
               <span className="text-[10px] font-mono text-joppli-dark/50 mb-1">09:12</span>
               <div className="w-4 h-4 rounded-full bg-joppli-green border-4 border-white shadow-sm"></div>
               <span className="text-[10px] font-bold mt-1">PICKUP #1</span>
             </div>

             <div className="flex flex-col items-center">
               <span className="text-[10px] font-mono text-joppli-dark/50 mb-1">09:44</span>
               <div className="w-4 h-4 rounded-full bg-joppli-red border-4 border-white shadow-sm"></div>
               <span className="text-[10px] font-bold mt-1 text-joppli-red">MRM TRIGGER</span>
             </div>
             
             <div className="flex flex-col items-center">
               <span className="text-[10px] font-mono text-joppli-dark/50 mb-1">10:14</span>
               <div className="w-4 h-4 rounded-full bg-joppli-grey border-4 border-white shadow-sm"></div>
               <span className="text-[10px] font-bold mt-1 text-joppli-dark/50">END</span>
             </div>
           </div>
        </div>
      </div>
    </div>
  );
};
