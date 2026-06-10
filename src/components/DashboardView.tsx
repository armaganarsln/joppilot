import React, { useEffect, useState } from "react";
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
import { collection, doc, limit, onSnapshot, orderBy, query, setDoc, updateDoc } from "firebase/firestore";
import { Check, X, FileClock, Octagon, CornerUpRight } from "lucide-react";
import { db } from "../firebase";
import { deriveVehicleState, MANEUVER_CATALOG } from "../lib/vehicleState";
import type { OperatorProfile, Vehicle, ManeuverProposal, ManeuverKind } from "../types";

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
  vehicles?: Vehicle[];
}

// A maneuver awaiting an operator verdict, joined with its vehicle.
interface PendingProposalRow {
  vehicleId: string;
  vehicleName: string;
  proposal: ManeuverProposal;
}

// One remote-operation session from the audit log (teleop_sessions).
interface SessionRow {
  id: string;
  vehicleId: string;
  operator: string;
  startedAt: number;
  endedAt?: number;
  status: string;
  estopCount?: number;
  events?: { t: string; at: number }[];
}

const timeAgo = (ts: number): string => {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
};

const formatDuration = (ms: number): string => {
  const s = Math.max(0, Math.round(ms / 1000));
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
};

// Per-axis badge palettes for the three-dimensional vehicle state matrix.
const CONNECTIVITY_STYLE: Record<string, string> = {
  ONLINE: 'bg-joppli-green/10 text-joppli-green border-joppli-green/25',
  DEGRADED: 'bg-joppli-yellow/10 text-joppli-yellow border-joppli-yellow/30',
  OFFLINE: 'bg-joppli-red/10 text-joppli-red border-joppli-red/25',
};
const HEALTH_STYLE: Record<string, string> = {
  OK: 'bg-joppli-green/10 text-joppli-green border-joppli-green/25',
  DEGRADED: 'bg-joppli-yellow/10 text-joppli-yellow border-joppli-yellow/30',
  ERROR: 'bg-joppli-red/10 text-joppli-red border-joppli-red/25',
};

export const DashboardView: React.FC<DashboardViewProps> = ({ currentUserProfile, vehicles = [] }) => {
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

  // ---- Plan v2 live panels: supervision queue, state matrix, session audit ----
  const [proposals, setProposals] = useState<PendingProposalRow[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);

  // Mode 1 supervision queue: every vehicle maneuver awaiting a verdict.
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'test_vehicles'), (snap) => {
      const rows: PendingProposalRow[] = [];
      snap.forEach((d) => {
        const data = d.data();
        const mp = data.maneuverProposal as ManeuverProposal | undefined;
        if (mp && mp.status === 'pending') {
          rows.push({ vehicleId: d.id, vehicleName: data.name || d.id, proposal: mp });
        }
      });
      rows.sort((a, b) => a.proposal.proposedAt - b.proposal.proposedAt);
      setProposals(rows);
    }, () => {});
    return () => unsub();
  }, []);

  // Remote-session audit log: most recent sessions first.
  useEffect(() => {
    const q = query(collection(db, 'teleop_sessions'), orderBy('startedAt', 'desc'), limit(5));
    const unsub = onSnapshot(q, (snap) => {
      const rows: SessionRow[] = [];
      snap.forEach((d) => rows.push(d.data() as SessionRow));
      setSessions(rows);
    }, () => {});
    return () => unsub();
  }, []);

  const decideManeuver = (row: PendingProposalRow, decision: 'confirmed' | 'rejected') => {
    updateDoc(doc(db, 'test_vehicles', row.vehicleId), {
      maneuverProposal: {
        ...row.proposal,
        status: decision,
        decidedBy: currentUserProfile?.email ?? 'dispatch',
        decidedAt: Date.now(),
      },
      updatedAt: Date.now(),
    }).catch(() => {});
  };

  // Demo affordance: stage a pending proposal for the first fleet vehicle so
  // the Mode 1 confirm/reject flow can be shown without a live test vehicle.
  const injectDemoProposal = () => {
    const v = vehicles[0];
    if (!v) return;
    const kinds = Object.keys(MANEUVER_CATALOG) as ManeuverKind[];
    const kind = kinds[Math.floor(Math.random() * kinds.length)];
    setDoc(doc(db, 'test_vehicles', v.id), {
      id: v.id,
      name: v.name,
      // Don't flip a live test vehicle inactive; only stamp the flag when the
      // doc may not exist yet (rules require the full telemetry schema).
      ...(v.isTestVehicleActive ? {} : { isActive: false }),
      avState: v.avState ?? 'AUTONOMOUS',
      lat: v.location.lat,
      lng: v.location.lng,
      speed: 0,
      heading: v.heading ?? 0,
      battery: v.battery,
      maneuverProposal: {
        id: `m_${Date.now()}`,
        kind,
        label: MANEUVER_CATALOG[kind],
        proposedAt: Date.now(),
        status: 'pending',
      },
      updatedAt: Date.now(),
    }, { merge: true }).catch(() => {});
  };

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

      {/* ---- Remote Operations & Safety (Plan v2) ---- */}
      <div className="mt-10 max-w-7xl">
        <div className="mb-4">
          <h2 className="text-sm font-black text-joppli-dark uppercase tracking-widest">Remote Operations & Safety</h2>
          <p className="text-[10px] font-bold text-joppli-dark/40 uppercase tracking-widest mt-0.5">
            OAD Mode 1 Supervision · Vehicle State Matrix · Session Audit
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Supervision queue — Mode 1 maneuver confirmation */}
          <div className="bg-white rounded-2xl p-5 shadow-xl shadow-joppli-dark/2 border border-joppli-grey/50">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-joppli-dark/80 flex items-center gap-2">
                <CornerUpRight className="w-4 h-4 text-joppli-yellow" />
                Supervision Queue — Mode 1
              </h3>
              <button
                onClick={injectDemoProposal}
                className="text-xs font-bold text-joppli-blue hover:underline btn-tactile"
                title="Stage a demo maneuver proposal for the first fleet vehicle"
              >
                Inject demo proposal
              </button>
            </div>

            {proposals.length === 0 ? (
              <div className="py-8 text-center text-xs font-bold text-joppli-dark/40 uppercase tracking-wide">
                No maneuvers awaiting confirmation
              </div>
            ) : (
              <div className="space-y-3">
                {proposals.map((row) => (
                  <div key={`${row.vehicleId}_${row.proposal.id}`} className="p-3 border border-joppli-yellow/40 bg-joppli-yellow/5 rounded-xl">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-joppli-dark truncate">
                          {row.vehicleName} <span className="text-joppli-dark/50 font-medium">proposes</span> {row.proposal.label}
                        </p>
                        <p className="text-[10px] font-bold text-joppli-dark/40 uppercase tracking-wider mt-0.5">
                          {timeAgo(row.proposal.proposedAt)} · vehicle holding position
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => decideManeuver(row, 'confirmed')}
                          className="flex items-center gap-1 px-3 py-1.5 bg-joppli-green text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-joppli-green/85 transition-colors btn-tactile"
                        >
                          <Check className="w-3 h-3" /> Confirm
                        </button>
                        <button
                          onClick={() => decideManeuver(row, 'rejected')}
                          className="flex items-center gap-1 px-3 py-1.5 bg-joppli-red text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-joppli-red/85 transition-colors btn-tactile"
                        >
                          <X className="w-3 h-3" /> Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <p className="text-[10px] text-joppli-dark/40 mt-4">
              Under the Swiss OAD, public-road operation is supervised: the vehicle proposes maneuvers and a remote operator in Switzerland confirms them. Direct driving (Mode 2) stays zone-gated to private ground.
            </p>
          </div>

          {/* Fleet state matrix — three orthogonal dimensions */}
          <div className="bg-white rounded-2xl p-5 shadow-xl shadow-joppli-dark/2 border border-joppli-grey/50">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-joppli-dark/80">Fleet State Matrix</h3>
              <span className="text-[9px] font-black uppercase tracking-widest text-joppli-dark/35">Connectivity · Health · Mode</span>
            </div>
            <div className="space-y-2.5">
              {vehicles.map((v) => {
                const s = deriveVehicleState(v);
                return (
                  <div key={v.id} className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-joppli-grey/60 hover:bg-joppli-light/60 transition-colors">
                    <span className="font-bold text-sm text-joppli-dark w-16 shrink-0">{v.name}</span>
                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      <span className={`px-2 py-0.5 rounded-lg border text-[9px] font-black uppercase tracking-wider ${CONNECTIVITY_STYLE[s.connectivity]}`}>
                        {s.connectivity}
                      </span>
                      <span className={`px-2 py-0.5 rounded-lg border text-[9px] font-black uppercase tracking-wider ${HEALTH_STYLE[s.health]}`}>
                        {s.health}
                      </span>
                      <span className="px-2 py-0.5 rounded-lg border border-joppli-blue/25 bg-joppli-blue/10 text-joppli-blue text-[9px] font-black uppercase tracking-wider font-mono">
                        {s.opMode.replace(/_/g, ' ')}
                      </span>
                      {s.safeStopped && (
                        <span className="px-2 py-0.5 rounded-lg border border-joppli-red/30 bg-joppli-red text-white text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                          <Octagon className="w-2.5 h-2.5" /> SAFE_STOPPED
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] text-joppli-dark/40 mt-4">
              Plan v2 models vehicle state on three orthogonal axes. SAFE_STOPPED latches after a minimal-risk maneuver and clears only through maintenance — not when the link recovers.
            </p>
          </div>

          {/* Remote-session audit log */}
          <div className="bg-white rounded-2xl p-5 shadow-xl shadow-joppli-dark/2 border border-joppli-grey/50 lg:col-span-2">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-joppli-dark/80 flex items-center gap-2">
                <FileClock className="w-4 h-4 text-joppli-blue" />
                Remote Session Audit
              </h3>
              <span className="text-[9px] font-black uppercase tracking-widest text-joppli-dark/35">Last {sessions.length} sessions</span>
            </div>

            {sessions.length === 0 ? (
              <div className="py-8 text-center text-xs font-bold text-joppli-dark/40 uppercase tracking-wide">
                No recorded teleoperation sessions yet
              </div>
            ) : (
              <div className="divide-y divide-joppli-grey/60">
                {sessions.map((s) => (
                  <div key={s.id} className="py-2.5 flex items-center justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-joppli-dark truncate lowercase">{s.operator}</p>
                      <p className="text-[10px] font-bold text-joppli-dark/40 uppercase tracking-wider">
                        {s.vehicleId} · {timeAgo(s.startedAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {s.status === 'active' ? (
                        <span className="px-2 py-0.5 rounded-lg bg-joppli-green/10 border border-joppli-green/25 text-joppli-green text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-joppli-green animate-ping"></span> Live
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-lg bg-joppli-grey text-joppli-dark/60 text-[9px] font-black uppercase tracking-wider font-mono">
                          {formatDuration((s.endedAt ?? s.startedAt) - s.startedAt)}
                        </span>
                      )}
                      <span className={`px-2 py-0.5 rounded-lg border text-[9px] font-black uppercase tracking-wider ${
                        (s.estopCount ?? 0) > 0
                          ? 'bg-joppli-red/10 border-joppli-red/25 text-joppli-red'
                          : 'bg-joppli-grey/60 border-transparent text-joppli-dark/45'
                      }`}>
                        {s.estopCount ?? 0} E-STOP
                      </span>
                      <span className="px-2 py-0.5 rounded-lg bg-joppli-blue/10 border border-joppli-blue/25 text-joppli-blue text-[9px] font-black uppercase tracking-wider font-mono">
                        {s.events?.length ?? 0} EVENTS
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <p className="text-[10px] text-joppli-dark/40 mt-4">
              Every remote session appends to an audit record (control handoffs, E-STOPs, geofence events, maneuver verdicts). Production stores tamper-evident WORM recordings of video, commands and telemetry.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};
