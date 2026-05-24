import React from 'react';
import { Map, Zap, CheckCircle, Clock } from 'lucide-react';

export const PilotArea: React.FC = () => {
  return (
    <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-8 bg-white/50">
      <div>
        <h2 className="text-3xl font-black text-indigo-900 tracking-tight">Alt-Wiedikon Pilot Program</h2>
        <p className="text-indigo-400 font-bold mt-1">Operating parameters for the current localized fleet test.</p>
      </div>

      <div className="flex gap-8">
        <div className="w-1/3 flex flex-col gap-6">
          <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-indigo-50">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-300 mb-6">Sector Details</h3>
            <div className="space-y-4">
              <div className="flex gap-4">
                <Map className="w-5 h-5 text-indigo-400 shrink-0" />
                <div>
                  <h4 className="font-bold text-indigo-900 text-sm">Operating Zone</h4>
                  <p className="text-xs text-indigo-400 mt-1">Zürich, Alt-Wiedikon (Kreis 3). Bound by Birmensdorferstrasse and Uetlibergstrasse.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <Clock className="w-5 h-5 text-indigo-400 shrink-0" />
                <div>
                  <h4 className="font-bold text-indigo-900 text-sm">Active Hours</h4>
                  <p className="text-xs text-indigo-400 mt-1">08:00 - 18:00 Daily</p>
                </div>
              </div>
              <div className="flex gap-4">
                <Zap className="w-5 h-5 text-indigo-400 shrink-0" />
                <div>
                  <h4 className="font-bold text-indigo-900 text-sm">Charging Infrastructure</h4>
                  <p className="text-xs text-indigo-400 mt-1">1 Depot (Schmiede Wiedikon) with 4 rapid charge points.</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-pink-500 rounded-[2rem] p-6 shadow-md border border-pink-400 text-white">
            <h3 className="text-lg font-black tracking-tight mb-2">Phase 1 Status</h3>
            <p className="text-sm font-medium text-pink-100 mb-6">Testing autonomous routing and community pickup points.</p>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-pink-400/50 pb-2">
                <span className="text-xs font-bold uppercase tracking-widest text-pink-200">Start Date</span>
                <span className="font-bold text-sm">01.05.2026</span>
              </div>
              <div className="flex items-center justify-between border-b border-pink-400/50 pb-2">
                <span className="text-xs font-bold uppercase tracking-widest text-pink-200">Vehicles</span>
                <span className="font-bold text-sm">2 Active (JÖP-01, JÖP-02)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-widest text-pink-200">Completion</span>
                <span className="font-bold text-sm">45%</span>
              </div>
              <div className="w-full h-2 bg-pink-600 rounded-full mt-2 overflow-hidden">
                <div className="h-full bg-white w-[45%]"></div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 bg-white rounded-[2.5rem] p-8 shadow-sm border border-indigo-50">
          <h3 className="text-xl font-black text-indigo-900 tracking-tight mb-8">System Requirements Checklist</h3>
          
          <div className="space-y-4">
             <div className="flex items-start gap-4 p-4 rounded-2xl bg-indigo-50/50">
               <CheckCircle className="w-5 h-5 text-teal-500 shrink-0 mt-0.5" />
               <div>
                 <h4 className="font-bold text-indigo-900 text-sm">Municipal Approval (ERZ)</h4>
                 <p className="text-xs text-indigo-400 mt-1">Temporary permit granted for low-speed autonomous operation on minor residential streets.</p>
               </div>
             </div>
             
             <div className="flex items-start gap-4 p-4 rounded-2xl bg-indigo-50/50">
               <CheckCircle className="w-5 h-5 text-teal-500 shrink-0 mt-0.5" />
               <div>
                 <h4 className="font-bold text-indigo-900 text-sm">Telemetry Integration</h4>
                 <p className="text-xs text-indigo-400 mt-1">Real-time GPS tracking and battery monitoring successfully linked to dashboard.</p>
               </div>
             </div>
             
             <div className="flex items-start gap-4 p-4 rounded-2xl bg-white border-2 border-dashed border-indigo-100">
               <div className="w-5 h-5 rounded-full border-2 border-indigo-300 shrink-0 mt-0.5"></div>
               <div>
                 <h4 className="font-bold text-indigo-500 text-sm">Dynamic Rerouting Agent (Phase 2)</h4>
                 <p className="text-xs text-indigo-300 mt-1">AI-driven route adjustments based on real-time traffic and incoming requests. Pending final tests.</p>
               </div>
             </div>
             
             <div className="flex items-start gap-4 p-4 rounded-2xl bg-white border-2 border-dashed border-indigo-100">
               <div className="w-5 h-5 rounded-full border-2 border-indigo-300 shrink-0 mt-0.5"></div>
               <div>
                 <h4 className="font-bold text-indigo-500 text-sm">Resident App Integration</h4>
                 <p className="text-xs text-indigo-300 mt-1">Directly receive collection requests from residents via the Jöppli mobile app.</p>
               </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};
