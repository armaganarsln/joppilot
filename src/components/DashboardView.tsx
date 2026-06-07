import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area
} from "recharts";
import type { OperatorProfile } from "../types";

const mockVolume = [
  { name: 'Aug', pet: 120, glass: 80, paper: 200, general: 300 },
  { name: 'Sep', pet: 130, glass: 90, paper: 210, general: 310 },
  { name: 'Oct', pet: 110, glass: 75, paper: 190, general: 290 },
  { name: 'Nov', pet: 150, glass: 100, paper: 230, general: 340 },
  { name: 'Dec', pet: 160, glass: 110, paper: 250, general: 360 },
  { name: 'Jan', pet: 140, glass: 95, paper: 220, general: 320 },
];

const mockRecyclingRate = [
  { name: 'Aug', rate: 58, target: 60 },
  { name: 'Sep', rate: 59, target: 60 },
  { name: 'Oct', rate: 61, target: 62 },
  { name: 'Nov', rate: 63, target: 62 },
  { name: 'Dec', rate: 65, target: 64 },
];

interface DashboardViewProps {
  currentUserProfile?: OperatorProfile | null;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ currentUserProfile }) => {
  const isGlarus = currentUserProfile?.project === 'glarus';
  const titleText = isGlarus ? "Glarus Operations" : "ERZ Operations";
  const subtitleText = isGlarus ? "Municipal Waste Collection & Performance" : "Waste Collection & Recycling Performance";
  const generalWasteName = isGlarus ? "Sackgebühr Glarus" : "Züri-Sack";
  const recyclingTargetName = isGlarus ? "Glarus Target" : "ERZ Target";
  const strategyTitle = isGlarus ? "Zero Waste Strategy Glarus 2030" : "Zero Waste Strategy 2030";
  const strategyDescription = isGlarus ? "On track to reduce general waste footprint by 12% in Glarus." : "On track to reduce general waste footprint by 15% this quarter.";
  const strategyMilestone = isGlarus ? "68%" : "74%";
  const strategyMilestoneValue = isGlarus ? 68 : 74;
  const operationalLogTitle = isGlarus ? "Operational Log & Glarus Reports" : "Operational Log & Züri-Wie-Neu Reports";

  const recentIncidents = isGlarus ? [
    { name: 'Werkhof Glarus', action: 'reported overloaded bio-bin', text: 'Location: Hauptstrasse 12. Requesting immediate pickup.', time: '18 mins ago', type: 'collection' },
    { name: 'GL-02 Operator', action: 'completed emergency glass pickup', text: 'Cleared shattered glass near Glarus Landsgemeindeplatz.', time: '2 hours ago', type: 'resolved' },
    { name: 'Citizen Report (Glarus-Safe)', action: 'flagged illegal dumping', text: 'Furniture dumped at recycling depot Ennenda.', time: '3 hours ago', type: 'issue' },
    { name: 'Glarus Dispatch', action: 'rerouted GL-02', text: 'Rerouted to cover missed paper collections in Sector B.', time: '1 day ago', type: 'dispatch' },
  ] : [
    { name: 'Werkhof Hagenholz', action: 'reported overloaded bio-bin', text: 'Location: Birmensdorferstrasse 140. Requesting immediate pickup.', time: '18 mins ago', type: 'collection' },
    { name: 'JÖP-02 Operator', action: 'completed emergency glass pickup', text: 'Cleared shattered glass near Schmiede Wiedikon tram stop.', time: '2 hours ago', type: 'resolved' },
    { name: 'Citizen Report (Züri-Wie-Neu)', action: 'flagged illegal dumping', text: 'Furniture dumped at recycling station Werd.', time: '3 hours ago', type: 'issue' },
    { name: 'ERZ Dispatch', action: 'rerouted JÖP-02', text: 'Rerouted to cover missed cardboard collections in Sector C.', time: '1 day ago', type: 'dispatch' },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-joppli-light font-sans">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-joppli-dark uppercase tracking-wide">{titleText}</h1>
          <p className="text-xs font-bold text-joppli-dark/50 uppercase tracking-widest mt-1">{subtitleText}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl">
        {/* Collections */}
        <div className="bg-white rounded-2xl p-5 shadow-xl shadow-joppli-dark/2 border border-joppli-grey/50 hover:border-joppli-blue transition-all cursor-default">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-bold text-joppli-dark/80">Pending Collections</h3>
          </div>
          <div className="flex justify-around items-end h-24">
            <div className="flex flex-col items-center">
              <span className="text-4xl font-bold font-mono text-joppli-yellow">14</span>
              <span className="text-xs font-medium text-joppli-dark/60 mt-1">Scheduled</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-4xl font-bold font-mono text-joppli-red">3</span>
              <span className="text-xs font-medium text-joppli-dark/60 mt-1">Urgent/Overfull</span>
            </div>
          </div>
        </div>

        {/* Vehicles */}
        <div className="bg-white rounded-2xl p-5 shadow-xl shadow-joppli-dark/2 border border-joppli-grey/50 hover:border-joppli-blue transition-all cursor-default">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-bold text-joppli-dark/80">Collection Fleet</h3>
            <button className="text-xs font-bold text-joppli-blue hover:underline btn-tactile">View Fleet</button>
          </div>
          <div className="space-y-4 mt-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-joppli-dark/70">Routing/Active</span>
              <span className="bg-joppli-green/20 text-joppli-green font-black font-mono text-xs px-2.5 py-0.5 rounded-full">1</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-joppli-dark/70">Charging at Depot</span>
              <span className="bg-joppli-yellow/20 text-joppli-yellow font-black font-mono text-xs px-2.5 py-0.5 rounded-full">1</span>
            </div>
            <div className="flex justify-between items-center">
               <span className="text-sm font-medium text-joppli-dark/70">Total Fleet Assets</span>
               <span className="bg-joppli-dark/20 text-joppli-dark/60 font-black font-mono text-xs px-2.5 py-0.5 rounded-full">2</span>
            </div>
          </div>
        </div>

        {/* Volume Collected */}
        <div className="bg-white rounded-2xl p-5 shadow-xl shadow-joppli-dark/2 border border-joppli-grey/50 hover:border-joppli-blue lg:col-span-2 transition-all cursor-default">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-bold text-joppli-dark/80">Volume Collected (Tons)</h3>
            <button className="text-xs font-bold text-joppli-blue hover:underline btn-tactile">Full Report</button>
          </div>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mockVolume}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ededed" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#749eca', fontFamily: 'Geist Mono'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#749eca', fontFamily: 'Geist Mono'}} width={25} />
                <Tooltip cursor={{fill: '#f4f7fb'}} contentStyle={{border: 'none', borderRadius: '16px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.05)'}} />
                <Bar dataKey="paper" stackId="a" fill="#326CB8" name="Karton/Papier" />
                <Bar dataKey="pet" stackId="a" fill="#6DBA32" name="PET/Plastik" />
                <Bar dataKey="general" stackId="a" fill="#0F1116" name={generalWasteName} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recycling Rate */}
        <div className="bg-white rounded-2xl p-5 shadow-xl shadow-joppli-dark/2 border border-joppli-grey/50 hover:border-joppli-blue lg:col-span-2 transition-all cursor-default">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-bold text-joppli-dark/80">Recycling Rate (%)</h3>
            <button className="text-xs font-bold text-joppli-blue hover:underline btn-tactile">Metrics</button>
          </div>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockRecyclingRate}>
                <defs>
                  <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6DBA32" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6DBA32" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ededed" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#749eca', fontFamily: 'Geist Mono'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#749eca', fontFamily: 'Geist Mono'}} domain={['dataMin - 5', 'dataMax + 5']} width={25} />
                <Tooltip contentStyle={{border: 'none', borderRadius: '16px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.05)'}} />
                <Area type="monotone" dataKey="rate" stroke="#6DBA32" fillOpacity={1} fill="url(#colorRate)" name="Actual Rate" strokeWidth={2} />
                <Line type="monotone" dataKey="target" stroke="#0F1116" strokeDasharray="3 3" name={recyclingTargetName} dot={false} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Incidents & Reports */}
        <div className="bg-white rounded-2xl p-5 shadow-xl shadow-joppli-dark/2 border border-joppli-grey/50 col-span-1 md:col-span-2 lg:col-span-2 lg:row-span-2 transition-all">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-bold text-joppli-dark/80">{operationalLogTitle}</h3>
          </div>
          <div className="space-y-6">
            {recentIncidents.map((incident, i) => (
              <div key={i} className="flex gap-4 p-3 rounded-xl hover:bg-joppli-light transition-colors">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-bold text-xs uppercase
                  ${incident.type === 'collection' ? 'bg-joppli-yellow/10 text-joppli-yellow' : 
                    incident.type === 'resolved' ? 'bg-joppli-green/10 text-joppli-green' :
                    incident.type === 'issue' ? 'bg-joppli-red/10 text-joppli-red' :
                    'bg-joppli-blue/10 text-joppli-blue'
                  }
                `}>
                  {incident.name.substring(0,2)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <p className="text-sm text-joppli-dark">
                      <span className="font-bold">{incident.name}</span> <span className="text-joppli-dark/60">{incident.action}</span>
                    </p>
                    <span className="text-xs text-joppli-dark/40 font-mono whitespace-nowrap ml-2">{incident.time}</span>
                  </div>
                  <p className="text-sm text-joppli-dark mt-1 font-medium">{incident.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Open Issues (Vertical) */}
        <div className="bg-white rounded-2xl p-5 shadow-xl shadow-joppli-dark/2 border border-joppli-grey/50 flex flex-col hover:border-joppli-blue transition-all cursor-default">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-bold text-joppli-dark/80">Smart Bins & Infrastructure</h3>
          </div>
          <div className="flex justify-around items-end h-24 mt-2">
            <div className="flex flex-col items-center">
              <span className="text-4xl font-bold font-mono text-joppli-yellow">28</span>
              <span className="text-xs font-medium text-joppli-dark/60 mt-1">Sensors Offline</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-4xl font-bold font-mono text-joppli-red">6</span>
              <span className="text-xs font-medium text-joppli-dark/60 mt-1">Damaged Bins</span>
            </div>
          </div>
        </div>

        {/* Target Summary */}
        <div className="bg-white rounded-2xl p-5 shadow-xl shadow-joppli-dark/2 border border-joppli-grey/50 flex flex-col justify-center items-center hover:border-joppli-blue transition-all cursor-default relative overflow-hidden">
             <div className="absolute top-0 right-0 w-24 h-24 bg-joppli-green/5 rounded-bl-full pointer-events-none"></div>
             <h3 className="text-sm font-bold text-joppli-dark/80 self-start mb-4">{strategyTitle}</h3>
             <div className="w-full mt-2">
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-joppli-dark">Current Milestone</span>
                  <span className="text-joppli-green font-mono">{strategyMilestone}</span>
                </div>
                <div className="w-full h-2 bg-joppli-grey rounded-full overflow-hidden">
                   <div className="h-full bg-joppli-green rounded-full" style={{ width: `${strategyMilestoneValue}%` }}></div>
                </div>
                <p className="text-xs text-joppli-dark/60 mt-4 text-center">{strategyDescription}</p>
             </div>
          </div>
      </div>
    </div>
  );
};
