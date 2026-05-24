import React from 'react';
import { MapPin, Sun, CloudRain, Clock, Save } from 'lucide-react';

export const OddSettingsView: React.FC = () => {
  return (
    <div className="flex-1 overflow-y-auto p-6 bg-joppli-light font-sans flex flex-col items-center">
      <div className="w-full max-w-4xl mb-6">
        <h1 className="text-2xl font-bold text-joppli-dark">Operational Design Domain (ODD)</h1>
        <p className="text-sm font-medium text-joppli-dark/60 mt-1">Configure environmental constraints for autonomous routing.</p>
      </div>

      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Geofence Map placeholder */}
        <div className="bg-white rounded-xl border border-joppli-grey p-4 shadow-sm flex flex-col md:col-span-2">
           <h3 className="text-sm font-bold text-joppli-dark">Approved Geofence Area</h3>
           <p className="text-xs text-joppli-dark/60 mt-1 mb-4">Routes outside this polygon will be strictly rejected by the semantic planner.</p>
           <div className="w-full h-64 bg-[#e8e4e1] rounded-lg border border-joppli-grey relative overflow-hidden flex items-center justify-center">
             <span className="font-bold text-joppli-dark/40 absolute">Interactive Map Placeholder</span>
             {/* Fake polygon */}
             <div className="absolute inset-0 m-4 border-2 border-joppli-blue bg-joppli-blue/10 border-dashed rounded-lg transform rotate-2"></div>
           </div>
        </div>

        {/* Time of Day */}
        <div className="bg-white rounded-xl border border-joppli-grey p-5 shadow-sm">
           <h3 className="text-sm font-bold text-joppli-dark flex items-center gap-2 mb-4"><Clock className="w-4 h-4 text-joppli-blue" /> Operating Hours</h3>
           <div className="space-y-4">
             <div>
               <label className="text-xs font-bold text-joppli-dark/60 uppercase tracking-widest block mb-1">Start Time</label>
               <input type="time" defaultValue="06:00" className="w-full px-3 py-2 bg-joppli-light border border-joppli-grey rounded-md font-mono text-sm" />
             </div>
             <div>
               <label className="text-xs font-bold text-joppli-dark/60 uppercase tracking-widest block mb-1">End Time</label>
               <input type="time" defaultValue="22:00" className="w-full px-3 py-2 bg-joppli-light border border-joppli-grey rounded-md font-mono text-sm" />
             </div>
           </div>
        </div>

        {/* Weather Restrictions */}
        <div className="bg-white rounded-xl border border-joppli-grey p-5 shadow-sm">
           <h3 className="text-sm font-bold text-joppli-dark flex items-center gap-2 mb-4"><CloudRain className="w-4 h-4 text-joppli-blue" /> Weather Conditions</h3>
           <div className="space-y-3 relative">
             <div className="absolute inset-y-0 left-3 border-l-2 border-joppli-grey pointer-events-none"></div>
             
             <label className="flex items-center gap-3 relative z-10 cursor-pointer">
               <input type="checkbox" defaultChecked className="w-4 h-4 rounded text-joppli-blue focus:ring-joppli-blue bg-white border-joppli-grey" />
               <span className="text-sm font-medium text-joppli-dark">Allow operation in light rain</span>
             </label>
             <label className="flex items-center gap-3 relative z-10 cursor-pointer text-joppli-dark/50">
               <input type="checkbox" disabled className="w-4 h-4 rounded text-joppli-blue focus:ring-joppli-blue bg-joppli-light border-joppli-grey" />
               <span className="text-sm font-medium line-through">Allow operation in heavy rain / snow</span>
             </label>
             <label className="flex items-center gap-3 relative z-10 cursor-pointer">
               <input type="checkbox" defaultChecked className="w-4 h-4 rounded text-joppli-blue focus:ring-joppli-blue bg-white border-joppli-grey" />
               <span className="text-sm font-medium text-joppli-dark">Allow night operation</span>
             </label>
             <label className="flex items-center gap-3 relative z-10 cursor-pointer text-joppli-dark/50">
               <input type="checkbox" disabled className="w-4 h-4 rounded text-joppli-blue focus:ring-joppli-blue bg-joppli-light border-joppli-grey" />
               <span className="text-sm font-medium line-through">Allow operation in dense fog</span>
             </label>
           </div>
        </div>
        
         <div className="md:col-span-2 flex justify-end">
          <button className="flex items-center gap-2 px-6 py-2 bg-joppli-green text-joppli-dark rounded-lg text-sm font-bold hover:bg-joppli-green/90 transition-colors shadow-sm">
            <Save className="w-4 h-4" /> Save ODD Profile
          </button>
        </div>
      </div>
    </div>
  );
};
