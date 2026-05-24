import React from 'react';
import { CollectionRequest, Vehicle } from '../types';
import { Plus, Package, Clock, MapPin } from 'lucide-react';

interface BottomPanelProps {
  requests: CollectionRequest[];
  selectedVehicleId: string | null;
  onAddToRoute: (req: CollectionRequest) => void;
  vehicles: Vehicle[];
}

const materialColors: Record<string, string> = {
  PET: 'bg-blue-100 text-blue-800 border-blue-200',
  glass: 'bg-green-100 text-green-800 border-green-200',
  paper: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  'e-waste': 'bg-pink-100 text-pink-800 border-pink-200',
  aluminium: 'bg-teal-100 text-teal-800 border-teal-200',
  textiles: 'bg-yellow-100 text-yellow-800 border-yellow-200',
};

export const BottomPanel: React.FC<BottomPanelProps> = ({ requests, selectedVehicleId, onAddToRoute, vehicles }) => {
  const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="p-6 flex justify-between items-center shrink-0">
        <h3 className="text-xl font-black text-indigo-900 italic">Incoming Requests</h3>
        
        <div className="flex gap-4 items-center">
          {selectedVehicle && (
            <div className="text-sm font-bold">
              <span className="text-indigo-400 mr-2">Selected for routing:</span>
              <span className="text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">{selectedVehicle.name}</span>
            </div>
          )}
          <span className="text-indigo-600 bg-indigo-50 border border-indigo-100 text-xs px-3 py-1 rounded-full font-black uppercase tracking-widest">
            {requests.length} open
          </span>
        </div>
      </div>
      
      <div className="flex-1 overflow-x-auto px-6 pb-6 flex gap-4 items-start">
        {requests.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center text-indigo-300 font-bold text-sm bg-indigo-50/50 rounded-[1.5rem] border-2 border-dashed border-indigo-100">
            No active collection requests. All caught up!
          </div>
        ) : (
          requests.map(req => (
            <div key={req.id} className="min-w-[280px] bg-white border-2 border-indigo-50 rounded-[1.5rem] p-5 flex flex-col shrink-0 hover:shadow-lg hover:shadow-indigo-100/50 hover:border-indigo-100 transition-all">
              <div className="flex justify-between items-start mb-4">
                <span className={`text-[10px] px-3 py-1.5 rounded-full font-black uppercase tracking-widest border ${materialColors[req.material] || 'bg-gray-100 text-gray-800'}`}>
                  {req.material}
                </span>
                <div className="flex items-center text-xs text-indigo-400 gap-1.5 font-bold bg-indigo-50 px-3 py-1.5 rounded-full">
                  <Clock className="w-3.5 h-3.5" />
                  {req.timeWindow}
                </div>
              </div>
              
              <div className="flex items-start gap-3 text-sm text-indigo-900 font-bold mb-6 h-10">
                <div className="p-1.5 bg-pink-100 rounded-lg shrink-0 mt-0.5">
                  <MapPin className="w-4 h-4 text-pink-500" />
                </div>
                <span className="line-clamp-2">{req.address}</span>
              </div>
              
              <button
                disabled={!selectedVehicleId}
                onClick={() => onAddToRoute(req)}
                className={`mt-auto w-full py-3 rounded-2xl flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest transition-all ${
                  selectedVehicleId 
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-xl shadow-indigo-200' 
                    : 'bg-indigo-50 text-indigo-300 cursor-not-allowed border border-indigo-100'
                }`}
              >
                <Plus className="w-4 h-4" />
                Add to Route
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
