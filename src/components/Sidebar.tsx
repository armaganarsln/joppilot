import React from 'react';
import { Vehicle } from '../types';
import { Battery, BatteryCharging, BatteryWarning, Navigation, MapPin } from 'lucide-react';

interface SidebarProps {
  vehicles: Vehicle[];
  selectedVehicleId: string | null;
  onSelectVehicle: (id: string) => void;
}

const getStatusColor = (status: string, isSelected: boolean) => {
  if (isSelected) return 'bg-white/20 text-white';
  switch (status) {
    case 'idle': return 'bg-yellow-100 text-yellow-800';
    case 'on_route': return 'bg-indigo-200 text-indigo-900';
    case 'charging': return 'bg-teal-200 text-teal-900';
    case 'alert': return 'bg-pink-200 text-pink-900';
    default: return 'bg-gray-200 text-gray-800';
  }
};

const getStatusLabel = (status: string) => {
  return status.replace('_', ' ').toUpperCase();
};

export const Sidebar: React.FC<SidebarProps> = ({ vehicles, selectedVehicleId, onSelectVehicle }) => {
  return (
    <aside className="w-72 flex flex-col shrink-0 h-full z-10">
      <div className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-indigo-50 flex-1 flex flex-col">
        <p className="text-[10px] font-black uppercase tracking-widest text-indigo-300 mb-6">Active Fleet</p>
        
        <div className="flex-1 overflow-y-auto space-y-4">
          {vehicles.map(v => {
            const isSelected = selectedVehicleId === v.id;
            return (
              <button
                key={v.id}
                onClick={() => onSelectVehicle(v.id)}
                className={`w-full text-left p-5 rounded-[1.5rem] transition-all font-bold ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 border border-transparent' 
                    : 'bg-indigo-50 text-indigo-900 border border-indigo-100 hover:bg-indigo-100/70'
                }`}
              >
                <div className="flex justify-between items-center mb-4">
                  <span className="font-black text-lg tracking-tight">{v.name}</span>
                  <span className={`text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-widest ${getStatusColor(v.status, isSelected)}`}>
                    {getStatusLabel(v.status)}
                  </span>
                </div>
                
                <div className={`flex items-center gap-4 text-sm ${isSelected ? 'text-indigo-200' : 'text-indigo-400'}`}>
                  <div className="flex items-center gap-1.5">
                    {v.status === 'charging' ? (
                      <BatteryCharging className="w-4 h-4 text-teal-400" />
                    ) : v.battery < 20 ? (
                      <BatteryWarning className="w-4 h-4 text-pink-400" />
                    ) : (
                      <Battery className="w-4 h-4" />
                    )}
                    <span className={`font-bold ${v.battery < 20 && !isSelected ? 'text-pink-500' : ''}`}>{v.battery}%</span>
                  </div>
                  
                  <div className="flex items-center gap-1.5">
                    <Navigation className="w-4 h-4" />
                    <span>{v.route.length} stops</span>
                  </div>
                </div>
                
                {v.route.length > 0 && (
                  <div className={`mt-5 pt-4 border-t ${isSelected ? 'border-white/20' : 'border-indigo-200/50'}`}>
                    <div className={`text-[10px] font-black uppercase tracking-widest mb-2 ${isSelected ? 'text-indigo-300' : 'text-indigo-400'}`}>Target Destination</div>
                    <div className={`flex items-start gap-2 text-sm font-bold ${isSelected ? 'text-white' : 'text-indigo-900'}`}>
                      <MapPin className={`w-4 h-4 shrink-0 mt-0.5 ${isSelected ? 'text-teal-400' : 'text-indigo-600'}`} />
                      <span className="truncate">{v.route[0].label}</span>
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
        
        <div className="mt-6 pt-6 border-t border-indigo-50">
            <div className="bg-yellow-50 p-4 rounded-[1.5rem] border-2 border-yellow-100">
              <div className="flex justify-between text-xs font-black text-yellow-700 mb-2">
                <span>Depot Storage</span>
                <span>84%</span>
              </div>
              <div className="w-full h-2 bg-yellow-200 rounded-full overflow-hidden">
                <div className="h-full bg-yellow-500 w-[84%]"></div>
              </div>
              <button className="w-full mt-4 bg-yellow-400 text-yellow-900 hover:bg-yellow-500 transition-colors text-[10px] uppercase font-black py-2 rounded-xl shadow-sm tracking-widest">Manage Storage</button>
            </div>
        </div>
      </div>
    </aside>
  );
};
