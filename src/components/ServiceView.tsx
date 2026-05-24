import React, { useState } from 'react';
import { Wrench, CheckCircle, Calendar, ShieldAlert, Cpu, Sparkles, Plus, TrendingUp } from 'lucide-react';

interface ServiceRecord {
  id: string;
  date: string;
  vehicle: 'JÖP-01' | 'JÖP-02';
  type: 'scheduled' | 'repair' | 'recall';
  description: string;
  partsUsed: string;
  cost: number; // CHF
  technician: string;
}

const INITIAL_SERVICE_LOG: ServiceRecord[] = [
  {
    id: 'SRV-8821',
    date: '2026-05-18',
    vehicle: 'JÖP-01',
    type: 'scheduled',
    description: 'Scheduled multi-point autonomous hub maintenance and gear recalibration.',
    partsUsed: 'Bearing grease, drive seals, wheel sensors',
    cost: 480,
    technician: 'Beat Meyer (ERZ Depot East)'
  },
  {
    id: 'SRV-8819',
    date: '2026-04-12',
    vehicle: 'JÖP-02',
    type: 'repair',
    description: 'Replacing damaged rear ultra-sonic proximity node following pavement scrape.',
    partsUsed: 'Ultrasonic module UX-400, frame clip',
    cost: 290,
    technician: 'Beat Meyer (ERZ Depot East)'
  },
  {
    id: 'SRV-8798',
    date: '2026-03-05',
    vehicle: 'JÖP-01',
    type: 'recall',
    description: 'Mandatory firmware recall swap regarding safe brake actuator pressure valve thresholds.',
    partsUsed: 'Brake cylinder seal pack, updated firmware ROM',
    cost: 0, // covered
    technician: 'Stefan Gross (Jöppli Munich)'
  },
  {
    id: 'SRV-8750',
    date: '2026-01-20',
    vehicle: 'JÖP-02',
    type: 'scheduled',
    description: 'Semi-annual deep diagnostic checkup and cleaning of optics. Battery equalization done.',
    partsUsed: 'Optic lens kit, active carbon filters',
    cost: 650,
    technician: 'Beat Meyer (ERZ Depot East)'
  }
];

interface MaintenanceStatus {
  vehicle: 'JÖP-01' | 'JÖP-02';
  lastServiceDate: string;
  currentOdometer: number; // km
  serviceIntervalKm: number; // e.g. 10000
  serviceIntervalMonths: number; // 6 months
}

export const ServiceView: React.FC = () => {
  const [logs, setLogs] = useState<ServiceRecord[]>(INITIAL_SERVICE_LOG);
  const [isAdding, setIsAdding] = useState(false);

  // Form states
  const [newVehicle, setNewVehicle] = useState<'JÖP-01' | 'JÖP-02'>('JÖP-01');
  const [newType, setNewType] = useState<'scheduled' | 'repair' | 'recall'>('scheduled');
  const [newDesc, setNewDesc] = useState('');
  const [newParts, setNewParts] = useState('');
  const [newCost, setNewCost] = useState('250');
  const [newTech, setNewTech] = useState('Armağan Arslan');

  // Hardcoded real Jöppli current status
  const fleetOdometer: MaintenanceStatus[] = [
    { vehicle: 'JÖP-01', lastServiceDate: '2026-05-18', currentOdometer: 1420, serviceIntervalKm: 10000, serviceIntervalMonths: 6 },
    { vehicle: 'JÖP-02', lastServiceDate: '2026-01-20', currentOdometer: 9840, serviceIntervalKm: 10000, serviceIntervalMonths: 6 }
  ];

  const handlePublishService = (e: React.FormEvent) => {
    e.preventDefault();
    const newRecord: ServiceRecord = {
      id: `SRV-${Math.floor(8822 + Math.random() * 200)}`,
      date: new Date().toISOString().slice(0, 10),
      vehicle: newVehicle,
      type: newType,
      description: newDesc,
      partsUsed: newParts || 'None',
      cost: Number(newCost) || 0,
      technician: newTech
    };
    setLogs([newRecord, ...logs]);
    setIsAdding(false);
    setNewDesc('');
    setNewParts('');
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-joppli-light font-sans flex flex-col items-center">
      <div className="w-full max-w-5xl">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Wrench className="w-8 h-8 text-joppli-dark" />
            <div>
              <h1 className="text-2xl font-black text-joppli-dark uppercase tracking-wide">Maintenance & Service</h1>
              <p className="text-xs text-joppli-dark/50 uppercase tracking-widest font-bold">Diagnostics, Component Swaps & Repairs Log</p>
            </div>
          </div>

          {!isAdding && (
            <button
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-2 px-4 py-2 bg-joppli-dark text-white rounded-lg text-sm font-bold shadow-sm hover:bg-joppli-blue transition-all uppercase tracking-widest"
            >
              <Plus className="w-4 h-4" /> Log Service
            </button>
          )}

          {isAdding && (
            <button
              onClick={() => setIsAdding(false)}
              className="px-3 py-1.5 border border-joppli-grey bg-white text-joppli-dark hover:bg-joppli-light rounded-lg text-xs font-bold transition-all uppercase tracking-widest"
            >
              Back to History
            </button>
          )}
        </div>

        {/* Dynamic Odometer Interval Status cards */}
        {!isAdding && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {fleetOdometer.map(status => {
              const kmLeft = status.serviceIntervalKm - (status.currentOdometer % status.serviceIntervalKm);
              const percentDriven = ((status.currentOdometer % status.serviceIntervalKm) / status.serviceIntervalKm) * 100;
              const isDueSoon = kmLeft < 500;
              
              return (
                <div key={status.vehicle} className={`p-5 rounded-xl border bg-white shadow-sm flex flex-col justify-between relative overflow-hidden ${isDueSoon ? 'border-joppli-red/30 bg-joppli-red/[0.01]' : 'border-joppli-grey'}`}>
                  {isDueSoon && (
                    <div className="absolute top-0 right-0 bg-joppli-red text-white text-[8px] tracking-widest font-black uppercase px-3.5 py-1">
                      Service Due Soon
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm font-black text-joppli-dark uppercase">{status.vehicle} Diagnostics</span>
                      <span className="text-xs text-joppli-dark/60 font-mono font-bold">Odometer: {status.currentOdometer.toLocaleString()} km</span>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-xs mb-1 font-bold">
                          <span className="text-joppli-dark/50 uppercase tracking-wider">Interval Progress (10K km Limit)</span>
                          <span className={`${isDueSoon ? 'text-joppli-red' : 'text-joppli-dark'}`}>{status.currentOdometer % status.serviceIntervalKm} / 10,000 km</span>
                        </div>
                        <div className="w-full h-2 bg-joppli-grey rounded-full overflow-hidden">
                          <div className={`h-full transition-all duration-500 ${isDueSoon ? 'bg-joppli-red' : 'bg-joppli-blue'}`} style={{ width: `${percentDriven}%` }}></div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs font-medium text-joppli-dark/65 bg-joppli-light/50 p-2.5 rounded-lg border border-joppli-grey/40">
                        <span>Last Shop Visit: <strong>{status.lastServiceDate}</strong></span>
                        <span className="text-joppli-blue font-bold tracking-wide">{kmLeft.toLocaleString()} km left before next check</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Add Record Form */}
        {isAdding && (
          <form onSubmit={handlePublishService} className="bg-white border border-joppli-grey rounded-xl shadow-sm p-6 mb-8 text-joppli-dark">
            <h2 className="text-base font-black uppercase tracking-wider mb-4 border-b border-joppli-grey/50 pb-2">
              Log Maintenance Operations
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-joppli-dark/60 mb-1">Target Asset</label>
                <select
                  value={newVehicle}
                  onChange={e => setNewVehicle(e.target.value as any)}
                  className="w-full px-3 py-2 border border-joppli-grey rounded-lg text-sm font-bold text-joppli-dark focus:outline-none focus:border-joppli-blue bg-white"
                >
                  <option value="JÖP-01">JÖP-01</option>
                  <option value="JÖP-02">JÖP-02</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-joppli-dark/60 mb-1">Service Class</label>
                <select
                  value={newType}
                  onChange={e => setNewType(e.target.value as any)}
                  className="w-full px-3 py-2 border border-joppli-grey rounded-lg text-sm font-bold text-joppli-dark uppercase focus:outline-none focus:border-joppli-blue bg-white"
                >
                  <option value="scheduled">Scheduled checks</option>
                  <option value="repair">Break/Fix repairs</option>
                  <option value="recall">Component Recall updates</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-joppli-dark/60 mb-1">Incurred Cost (CHF)</label>
                <input
                  type="number"
                  required
                  value={newCost}
                  onChange={e => setNewCost(e.target.value)}
                  className="w-full px-3 py-2 border border-joppli-grey rounded-lg text-sm font-bold focus:outline-none focus:border-joppli-blue bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-joppli-dark/60 mb-1">Description of Operations</label>
                <input
                  type="text"
                  required
                  placeholder="What diagnostic or replacement scope was covered?"
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-joppli-grey rounded-lg text-sm focus:outline-none focus:border-joppli-blue bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-joppli-dark/60 mb-1">Depot Technicians & Sign-off</label>
                <input
                  type="text"
                  required
                  value={newTech}
                  onChange={e => setNewTech(e.target.value)}
                  className="w-full px-3 py-2 border border-joppli-grey rounded-lg text-sm font-bold uppercase focus:outline-none focus:border-joppli-blue bg-white"
                />
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-xs font-bold uppercase tracking-widest text-joppli-dark/60 mb-1">Spare Parts Consumed</label>
              <input
                type="text"
                placeholder="e.g. Brake Pads SK-19, optical cleaner spray, none"
                value={newParts}
                onChange={e => setNewParts(e.target.value)}
                className="w-full px-3 py-2 border border-joppli-grey rounded-lg text-sm focus:outline-none focus:border-joppli-blue bg-white animate-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-joppli-grey/50">
              <button
                type="submit"
                className="px-4 py-2 bg-joppli-blue text-white rounded-lg text-xs font-bold uppercase hover:bg-joppli-blue/95 transition-colors"
              >
                Log Operations Record
              </button>
            </div>
          </form>
        )}

        {/* Service Logs Table */}
        <div className="bg-white border border-joppli-grey rounded-xl shadow-sm overflow-hidden mb-8">
          <div className="px-4 py-3 bg-joppli-light/40 border-b border-joppli-grey flex justify-between items-center">
            <span className="text-xs font-black uppercase tracking-widest text-joppli-dark/60">Historic Depot Workshop Logs</span>
            <span className="text-[10px] bg-joppli-dark/10 px-2 py-0.5 rounded-full font-bold font-mono text-joppli-dark/60">
              {logs.length} ACTIONS
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs text-joppli-dark">
              <thead>
                <tr className="border-b border-joppli-grey/80 bg-joppli-light/20 uppercase font-black text-joppli-dark/50 hover:bg-transparent">
                  <th className="p-3 pl-4">Date</th>
                  <th className="p-3">Vehicle</th>
                  <th className="p-3">Class</th>
                  <th className="p-3">Description</th>
                  <th className="p-3">Consumed Parts</th>
                  <th className="p-3">Technician</th>
                  <th className="p-3 pr-4 text-right">Cost (CHF)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-joppli-grey">
                {logs.map(log => (
                  <tr key={log.id} className="hover:bg-joppli-light/20 transition-colors font-medium">
                    <td className="p-3 pl-4 whitespace-nowrap font-mono">{log.date}</td>
                    <td className="p-3 whitespace-nowrap">
                      <span className="bg-joppli-blue/10 text-joppli-blue font-bold px-2 py-0.5 rounded font-mono">
                        {log.vehicle}
                      </span>
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black tracking-widest uppercase border ${
                        log.type === 'scheduled' ? 'bg-joppli-green/10 text-joppli-green border-joppli-green/20' :
                        log.type === 'recall' ? 'bg-joppli-yellow/10 text-joppli-yellow border-joppli-yellow/20' :
                        'bg-joppli-red/10 text-joppli-red border-joppli-red/20'
                      }`}>
                        {log.type}
                      </span>
                    </td>
                    <td className="p-3 max-w-[200px] truncate">{log.description}</td>
                    <td className="p-3 font-mono italic text-[11px] text-joppli-dark/60">{log.partsUsed}</td>
                    <td className="p-3 whitespace-nowrap text-joppli-dark/70 font-semibold">{log.technician}</td>
                    <td className="p-3 pr-4 text-right font-mono font-bold whitespace-nowrap">
                      {log.cost === 0 ? 'COVERED' : `${log.cost.toLocaleString()}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};
