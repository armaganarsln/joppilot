import React from 'react';
import { Vehicle } from '../types';
import { Truck, Battery, Package, MapPin, MoreVertical, Filter, ChevronRight } from 'lucide-react';

interface VehiclesViewProps {
  vehicles: Vehicle[];
  onSelectVehicle?: (id: string) => void;
}

export const VehiclesView: React.FC<VehiclesViewProps> = ({ vehicles, onSelectVehicle }) => {
  return (
    <div className="flex-1 overflow-y-auto p-6 bg-joppli-light font-sans">
      <div className="flex items-center justify-between mb-6 max-w-7xl">
        <h1 className="text-2xl font-bold text-joppli-dark">Fleet Vehicles & Health</h1>
        <div className="flex gap-2">
           <button className="flex items-center gap-2 px-4 py-2 bg-white border border-joppli-grey rounded-lg text-sm font-medium hover:bg-joppli-grey/50 transition-colors shadow-sm">
             <Filter className="w-4 h-4" /> Filter
           </button>
           <button className="px-4 py-2 bg-joppli-dark text-white rounded-lg text-sm font-bold hover:bg-joppli-dark/90 transition-colors shadow-sm">
             Provision Vehicle
           </button>
        </div>
      </div>

      <div className="bg-white border text-left border-joppli-grey rounded-xl shadow-sm overflow-hidden max-w-7xl">
        <table className="w-full text-sm">
          <thead className="bg-joppli-light/50 border-b border-joppli-grey text-joppli-dark/60 font-bold uppercase tracking-widest text-xs">
            <tr>
              <th className="px-6 py-4 text-left font-bold">Vehicle Info</th>
              <th className="px-6 py-4 text-left font-bold">AV State</th>
              <th className="px-6 py-4 text-left font-bold mb-hide">Battery/Cap</th>
              <th className="px-6 py-4 text-left font-bold mb-hide">Firmware</th>
              <th className="px-6 py-4 text-right">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-joppli-grey">
            {vehicles.map((v) => (
              <tr 
                key={v.id} 
                className="hover:bg-joppli-light/60 transition-colors group cursor-pointer"
                onClick={() => onSelectVehicle && onSelectVehicle(v.id)}
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg border flex items-center justify-center shrink-0 ${v.status === 'alert' ? 'bg-joppli-red/10 border-joppli-red/20 text-joppli-red' : 'bg-joppli-light border-joppli-grey text-joppli-dark/70'}`}>
                      <Truck className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-joppli-dark flex items-center gap-2">
                        {v.name}
                        {v.status === 'alert' && <span className="w-2 h-2 bg-joppli-red rounded-full animate-pulse"></span>}
                      </div>
                      <div className="text-xs text-joppli-dark/50 mt-0.5 uppercase tracking-widest font-mono">ID: {v.id.substring(0, 8)}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                    v.status === 'on_route' ? 'bg-joppli-green/10 text-joppli-green border border-joppli-green/20' : 
                    v.status === 'alert' ? 'bg-joppli-red/10 text-joppli-red border border-joppli-red/20' :
                    'bg-joppli-blue/10 text-joppli-blue border border-joppli-blue/20'
                  }`}>
                    {v.status === 'alert' ? 'ASSISTANCE' : v.status === 'on_route' ? 'AUTONOMOUS' : 'IDLE / DEPOT'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 focus">
                      <Battery className={`w-4 h-4 ${v.battery < 20 ? 'text-joppli-red' : 'text-joppli-green'}`} />
                      <span className="font-medium text-xs">{v.battery}%</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-joppli-dark">
                       <Package className="w-4 h-4 text-joppli-blue" />
                       <span className="font-medium text-xs">{v.capacity}%</span>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                   <div className="font-mono text-xs bg-joppli-grey/50 px-2 py-1 rounded text-joppli-dark inline-block">AW-2026.04</div>
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="p-2 text-joppli-dark/40 hover:text-joppli-dark rounded-lg hover:bg-joppli-grey/50 transition-all">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
