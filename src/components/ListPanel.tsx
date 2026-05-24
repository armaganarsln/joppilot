import React from 'react';
import { Vehicle, CollectionRequest } from '../types';
import { Battery, Package, MapPin, Truck, Check } from 'lucide-react';

interface ListPanelProps {
  vehicles: Vehicle[];
  requests: CollectionRequest[];
  mode: 'vehicles' | 'tasks';
  onModeChange: (mode: 'vehicles' | 'tasks') => void;
  selectedVehicleId: string | null;
  onSelectVehicle: (id: string) => void;
  onAddToRoute: (reqId: string, vehicleId: string) => void;
  onRemoteDrive?: (vehicleId: string) => void;
}

export const ListPanel: React.FC<ListPanelProps> = ({ 
  vehicles, requests, mode, onModeChange, selectedVehicleId, onSelectVehicle, onAddToRoute, onRemoteDrive
}) => {
  return (
    <div className="w-80 bg-white border-r border-joppli-grey flex flex-col h-full shrink-0 z-10 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
      <div className="p-4 border-b border-joppli-grey flex gap-2 shrink-0">
        <button 
          onClick={() => onModeChange('vehicles')}
          className={`flex-1 py-1.5 text-xs font-bold uppercase tracking-widest rounded-lg transition-colors ${mode === 'vehicles' ? 'bg-joppli-dark text-white' : 'bg-joppli-grey/50 text-joppli-dark/60 hover:bg-joppli-grey'}`}
        >
          Fleet
        </button>
        <button 
          onClick={() => onModeChange('tasks')}
          className={`flex-1 py-1.5 text-xs font-bold uppercase tracking-widest rounded-lg transition-colors relative ${mode === 'tasks' ? 'bg-joppli-dark text-white' : 'bg-joppli-grey/50 text-joppli-dark/60 hover:bg-joppli-grey'}`}
        >
          Tasks
          {requests.length > 0 && (
             <span className={`absolute top-1.5 right-2 w-2 h-2 rounded-full ${mode === 'tasks' ? 'bg-joppli-green' : 'bg-joppli-red'}`}></span>
          )}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {mode === 'vehicles' && vehicles.map(v => {
          const isSelected = v.id === selectedVehicleId;
          return (
            <div 
              key={v.id}
              onClick={() => onSelectVehicle(v.id)}
              className={`p-4 border rounded-xl cursor-pointer transition-all ${isSelected ? 'border-joppli-blue shadow-md' : 'border-joppli-grey hover:border-joppli-dark/20 hover:shadow-sm'}`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded bg-joppli-grey/50 flex items-center justify-center">
                    <Truck className="w-4 h-4 text-joppli-dark" />
                  </div>
                  <span className="font-bold text-joppli-dark flex items-center gap-1.5 leading-none">
                    {v.name}
                    {v.isTestVehicleActive && (
                      <span className="px-1.5 py-0.5 bg-joppli-red/10 text-joppli-red text-[8px] font-black uppercase tracking-wider rounded border border-joppli-red/25 animate-pulse shrink-0 scale-95 origin-left">
                        TEST ACTIVE
                      </span>
                    )}
                  </span>
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${v.status === 'on_route' ? 'bg-joppli-blue/10 text-joppli-blue' : 'bg-joppli-grey text-joppli-dark/60'}`}>
                  {v.status.replace('_', ' ')}
                </span>
              </div>
              
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                     <span className="text-joppli-dark/60 flex items-center gap-1"><Battery className="w-3 h-3" /> Battery</span>
                     <span className="font-bold text-joppli-dark">{v.battery}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-joppli-grey rounded-full overflow-hidden">
                     <div className="h-full bg-joppli-green" style={{ width: `${v.battery}%` }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                     <span className="text-joppli-dark/60 flex items-center gap-1"><Package className="w-3 h-3" /> Capacity</span>
                     <span className="font-bold text-joppli-dark">{v.capacity}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-joppli-grey rounded-full overflow-hidden">
                     <div className="h-full bg-joppli-blue" style={{ width: `${v.capacity}%` }}></div>
                  </div>
                </div>
              </div>

              {isSelected && (
                <div className="mt-4 border-t border-joppli-grey/50 pt-3">
                  <button 
                    onClick={(e) => { e.stopPropagation(); onRemoteDrive?.(v.id); }}
                    className="w-full py-2 bg-joppli-dark text-white rounded font-bold text-xs uppercase tracking-widest hover:bg-joppli-blue transition-colors flex items-center justify-center gap-2"
                  >
                     Remote Drive
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {mode === 'tasks' && requests.length === 0 && (
          <div className="text-center py-12 text-joppli-dark/40 font-bold text-sm">
            No pending tasks.
          </div>
        )}

        {mode === 'tasks' && requests.map(req => (
          <div key={req.id} className="p-4 border border-joppli-grey rounded-xl bg-joppli-light">
            <div className="flex items-start gap-3">
              <div className="mt-0.5"><MapPin className="w-4 h-4 text-joppli-red" /></div>
              <div className="flex-1">
                <p className="font-bold text-joppli-dark text-sm">{req.address}</p>
                <div className="flex gap-2 mt-2">
                  <span className="text-[10px] bg-white border border-joppli-grey px-2 py-0.5 rounded uppercase font-bold text-joppli-dark/60">{req.material}</span>
                  <span className="text-[10px] bg-white border border-joppli-grey px-2 py-0.5 rounded uppercase font-bold text-joppli-dark/60">{req.timeWindow}</span>
                </div>
                
                {selectedVehicleId && (
                  <button 
                    onClick={() => onAddToRoute(req.id, selectedVehicleId)}
                    className="mt-4 w-full py-2 bg-joppli-blue text-white rounded font-bold text-xs hover:bg-joppli-blue/90 transition-colors flex items-center justify-center gap-2"
                  >
                    <Check className="w-3 h-3" />
                    Assign to {vehicles.find(v => v.id === selectedVehicleId)?.name}
                  </button>
                )}
                {!selectedVehicleId && (
                  <div className="mt-4 text-[10px] text-center text-joppli-dark/40 font-bold uppercase">
                    Select a vehicle first
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
