import React, { useState } from 'react';
import { ClipboardCheck, CheckCircle2, AlertTriangle, XCircle, Plus, Eye, ArrowLeft, Send } from 'lucide-react';

interface InspectionItem {
  name: string;
  status: 'PASS' | 'FLAG' | 'NA';
  notes: string;
}

interface Inspection {
  id: string;
  date: string;
  vehicle: 'JÖP-01' | 'JÖP-02';
  operator: string;
  status: 'PASS' | 'FLAGGED' | 'FAILED';
  duration: string;
  checklist: Record<string, InspectionItem>;
}

const INITIAL_INSPECTIONS: Inspection[] = [
  {
    id: 'INSP-2026-004',
    date: '2026-05-23 06:15',
    vehicle: 'JÖP-01',
    operator: 'Armağan Arslan',
    status: 'PASS',
    duration: '12 min',
    checklist: {
      sensor_check: { name: 'Sensor Visual Check (LIDAR, cameras lens free of dirt)', status: 'PASS', notes: 'All lenses cleaned.' },
      calibration: { name: 'Calibration Verification (GNSS/RTK fixed state)', status: 'PASS', notes: 'RTK locked in under 20 seconds.' },
      brake_test: { name: 'Brake Response Test (dynamic stop 5km/h)', status: 'PASS', notes: 'Brake deceleration within normal 1.2m bounds.' },
      boot_log: { name: 'Software Boot Log Review (ROS node diagnostic startup)', status: 'PASS', notes: 'Zero hardware exceptions reported on bus.' },
      tire_pressure: { name: 'Tire Pressure Inspection (all 4 wheels within 3.2 bar)', status: 'PASS', notes: 'All tyres equalized.' },
      damage_walkaround: { name: 'Body Damage Walkaround (housing integrity, mirrors)', status: 'PASS', notes: 'No major scuffs or cracks.' }
    }
  },
  {
    id: 'INSP-2026-003',
    date: '2026-05-22 17:45',
    vehicle: 'JÖP-02',
    operator: 'Robert Rüegg',
    status: 'FLAGGED',
    duration: '15 min',
    checklist: {
      sensor_check: { name: 'Sensor Visual Check (LIDAR, cameras lens free of dirt)', status: 'PASS', notes: 'Front wide camera lens had water spots but cleared.' },
      calibration: { name: 'Calibration Verification (GNSS/RTK fixed state)', status: 'PASS', notes: 'GNSS fixed precision within 0.02m.' },
      brake_test: { name: 'Brake Response Test (dynamic stop 5km/h)', status: 'PASS', notes: 'Braking responsive.' },
      boot_log: { name: 'Software Boot Log Review (ROS node diagnostic startup)', status: 'FLAG', notes: 'Node: controller_driver triggered latency warning.' },
      tire_pressure: { name: 'Tire Pressure Inspection (all 4 wheels within 3.2 bar)', status: 'PASS', notes: 'Checked OK.' },
      damage_walkaround: { name: 'Body Damage Walkaround (housing integrity, mirrors)', status: 'PASS', notes: 'Walkaround clear.' }
    }
  },
  {
    id: 'INSP-2026-002',
    date: '2026-05-22 06:00',
    vehicle: 'JÖP-01',
    operator: 'Armağan Arslan',
    status: 'PASS',
    duration: '10 min',
    checklist: {
      sensor_check: { name: 'Sensor Visual Check (LIDAR, cameras lens free of dirt)', status: 'PASS', notes: 'Everything clear.' },
      calibration: { name: 'Calibration Verification (GNSS/RTK fixed state)', status: 'PASS', notes: 'RTK lock established.' },
      brake_test: { name: 'Brake Response Test (dynamic stop 5km/h)', status: 'PASS', notes: 'Tested and certified.' },
      boot_log: { name: 'Software Boot Log Review (ROS node diagnostic startup)', status: 'PASS', notes: 'Clean firmware startup.' },
      tire_pressure: { name: 'Tire Pressure Inspection (all 4 wheels within 3.2 bar)', status: 'PASS', notes: 'All OK.' },
      damage_walkaround: { name: 'Body Damage Walkaround (housing integrity, mirrors)', status: 'PASS', notes: 'All fine.' }
    }
  },
  {
    id: 'INSP-2026-001',
    date: '2026-05-21 06:10',
    vehicle: 'JÖP-02',
    operator: 'Selin Yılmaz',
    status: 'FAILED',
    duration: '18 min',
    checklist: {
      sensor_check: { name: 'Sensor Visual Check (LIDAR, cameras lens free of dirt)', status: 'FLAG', notes: 'Rear radar mud blockage.' },
      calibration: { name: 'Calibration Verification (GNSS/RTK fixed state)', status: 'PASS', notes: 'OK.' },
      brake_test: { name: 'Brake Response Test (dynamic stop 5km/h)', status: 'FLAG', notes: 'Slight delay observed.' },
      boot_log: { name: 'Software Boot Log Review (ROS node diagnostic startup)', status: 'PASS', notes: 'OK.' },
      tire_pressure: { name: 'Tire Pressure Inspection (all 4 wheels within 3.2 bar)', status: 'PASS', notes: 'Checked OK.' },
      damage_walkaround: { name: 'Body Damage Walkaround (housing integrity, mirrors)', status: 'FLAG', notes: 'Front bumper panel is slightly detached after route 4 run.' }
    }
  }
];

export const InspectionsView: React.FC = () => {
  const [inspections, setInspections] = useState<Inspection[]>(INITIAL_INSPECTIONS);
  const [selectedInspection, setSelectedInspection] = useState<Inspection | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // New Inspection Form State
  const [activeNewVehicle, setActiveNewVehicle] = useState<'JÖP-01' | 'JÖP-02'>('JÖP-01');
  const [newOperator, setNewOperator] = useState('Armağan Arslan');
  const [newChecklist, setNewChecklist] = useState<Record<string, { name: string; status: 'PASS' | 'FLAG' | 'NA'; notes: string }>>({
    sensor_check: { name: 'Sensor Visual Check (LIDAR, cameras lens free of dirt)', status: 'PASS', notes: '' },
    calibration: { name: 'Calibration Verification (GNSS/RTK fixed state)', status: 'PASS', notes: '' },
    brake_test: { name: 'Brake Response Test (dynamic stop 5km/h)', status: 'PASS', notes: '' },
    boot_log: { name: 'Software Boot Log Review (ROS node diagnostic startup)', status: 'PASS', notes: '' },
    tire_pressure: { name: 'Tire Pressure Inspection (all 4 wheels within 3.2 bar)', status: 'PASS', notes: '' },
    damage_walkaround: { name: 'Body Damage Walkaround (housing integrity, mirrors)', status: 'PASS', notes: '' }
  });

  const handleStatusChange = (key: string, field: 'PASS' | 'FLAG' | 'NA') => {
    setNewChecklist(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        status: field
      }
    }));
  };

  const handleNotesChange = (key: string, notes: string) => {
    setNewChecklist(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        notes
      }
    }));
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Determine overall status
    const statuses = Object.values(newChecklist).map((item: any) => item.status);
    let finalStatus: 'PASS' | 'FLAGGED' | 'FAILED' = 'PASS';
    if (statuses.includes('FLAG')) {
      finalStatus = 'FLAGGED';
    }
    // Simple logic: if anyone chooses FAILED, or let's say a critical item has bad flags, we can flag or fail.
    // Let's say if there are flags, status is FLAGGED. If there are multiple flags or bad notes, FAILED can be manual.
    // For simplicity, we assign based on FLAG/PASS count.
    const flagCount = statuses.filter(s => s === 'FLAG').length;
    if (flagCount > 2) {
      finalStatus = 'FAILED';
    } else if (flagCount > 0) {
      finalStatus = 'FLAGGED';
    }

    const newInsp: Inspection = {
      id: `INSP-2026-0${inspections.length + 1}`,
      date: new Date().toISOString().slice(0, 16).replace('T', ' '),
      vehicle: activeNewVehicle,
      operator: newOperator,
      status: finalStatus,
      duration: '11 min',
      checklist: newChecklist
    };

    setInspections([newInsp, ...inspections]);
    setIsCreating(false);
    // Reset form
    setNewChecklist({
      sensor_check: { name: 'Sensor Visual Check (LIDAR, cameras lens free of dirt)', status: 'PASS', notes: '' },
      calibration: { name: 'Calibration Verification (GNSS/RTK fixed state)', status: 'PASS', notes: '' },
      brake_test: { name: 'Brake Response Test (dynamic stop 5km/h)', status: 'PASS', notes: '' },
      boot_log: { name: 'Software Boot Log Review (ROS node diagnostic startup)', status: 'PASS', notes: '' },
      tire_pressure: { name: 'Tire Pressure Inspection (all 4 wheels within 3.2 bar)', status: 'PASS', notes: '' },
      damage_walkaround: { name: 'Body Damage Walkaround (housing integrity, mirrors)', status: 'PASS', notes: '' }
    });
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-joppli-light font-sans flex flex-col items-center">
      <div className="w-full max-w-5xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <ClipboardCheck className="w-8 h-8 text-joppli-blue" />
            <div>
              <h1 className="text-2xl font-black text-joppli-dark uppercase tracking-wide">Pre-Trip Safety Inspections</h1>
              <p className="text-xs text-joppli-dark/50 uppercase tracking-widest font-bold">ERZ Zurich Municipal Operations</p>
            </div>
          </div>
          
          {!isCreating && !selectedInspection && (
            <button
              onClick={() => setIsCreating(true)}
              className="flex items-center gap-2 px-4 py-2 bg-joppli-dark text-white rounded-lg text-sm font-bold shadow-sm hover:bg-joppli-blue hover:text-white transition-all uppercase tracking-widest"
            >
              <Plus className="w-4 h-4" /> Start Inspection
            </button>
          )}

          {(isCreating || selectedInspection) && (
            <button
              onClick={() => {
                setIsCreating(false);
                setSelectedInspection(null);
              }}
              className="flex items-center gap-2 px-3 py-1.5 border border-joppli-grey bg-white text-joppli-dark hover:bg-joppli-light rounded-lg text-xs font-bold transition-all uppercase tracking-widest"
            >
              <ArrowLeft className="w-4 h-4" /> Back to History
            </button>
          )}
        </div>

        {/* 1. DETAIL VIEW */}
        {selectedInspection && (
          <div className="bg-white border border-joppli-grey rounded-xl shadow-sm overflow-hidden p-6 mb-8">
            <div className="flex justify-between items-start border-b border-joppli-grey/50 pb-4 mb-6">
              <div>
                <span className="text-xs font-mono text-joppli-dark/40 uppercase tracking-widest">{selectedInspection.id}</span>
                <h2 className="text-xl font-extrabold text-joppli-dark tracking-tight uppercase">Shift Checklist</h2>
                <div className="flex items-center gap-3 text-xs mt-1 text-joppli-dark/60 font-medium">
                  <span className="bg-joppli-blue/10 text-joppli-blue font-bold px-2 py-0.5 rounded">{selectedInspection.vehicle}</span>
                  <span>Operator: <strong>{selectedInspection.operator}</strong></span>
                  <span>•</span>
                  <span>Completed: {selectedInspection.date}</span>
                  <span>•</span>
                  <span>Duration: {selectedInspection.duration}</span>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[10px] text-joppli-dark/40 font-bold uppercase tracking-wider mb-1">Result</span>
                <span className={`px-4 py-1 rounded-full text-xs font-bold tracking-widest uppercase border ${
                  selectedInspection.status === 'PASS' ? 'bg-joppli-green/10 text-joppli-green border-joppli-green/20' :
                  selectedInspection.status === 'FLAGGED' ? 'bg-joppli-yellow/10 text-joppli-yellow border-joppli-yellow/20' :
                  'bg-joppli-red/10 text-joppli-red border-joppli-red/20'
                }`}>
                  {selectedInspection.status}
                </span>
              </div>
            </div>

            {/* Checklist items in details */}
            <div className="space-y-4">
              {Object.entries(selectedInspection.checklist).map(([key, item]: [string, any]) => (
                <div key={key} className="p-4 rounded-lg bg-joppli-light/50 border border-joppli-grey/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-joppli-dark uppercase tracking-wide">{item.name}</h3>
                    <p className="text-xs text-joppli-dark/60 mt-1 italic">
                      {item.notes ? `"${item.notes}"` : 'No operator annotations provided.'}
                    </p>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    <span className={`px-3 py-1 rounded text-xs font-black tracking-widest uppercase ${
                      item.status === 'PASS' ? 'bg-joppli-green text-white' :
                      item.status === 'FLAG' ? 'bg-joppli-yellow text-joppli-dark' :
                      'bg-joppli-grey text-joppli-dark/60'
                    }`}>
                      {item.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 2. CREATION VIEW */}
        {isCreating && (
          <form onSubmit={handleFormSubmit} className="bg-white border border-joppli-grey rounded-xl shadow-sm overflow-hidden p-6 mb-8 text-joppli-dark">
            <h2 className="text-lg font-black uppercase tracking-wider mb-4 border-b border-joppli-grey/50 pb-2 flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-joppli-blue" />
              Perform Safety Pre-Trip Scan
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-joppli-dark/60 mb-1">Select Vehicle</label>
                <div className="flex gap-2">
                  {(['JÖP-01', 'JÖP-02'] as const).map(v => (
                    <button
                      type="button"
                      key={v}
                      onClick={() => setActiveNewVehicle(v)}
                      className={`flex-1 py-2.5 rounded-lg border font-bold text-sm tracking-wider uppercase transition-colors ${
                        activeNewVehicle === v 
                          ? 'bg-joppli-blue text-white border-joppli-blue' 
                          : 'bg-white text-joppli-dark border-joppli-grey hover:bg-joppli-light'
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-joppli-dark/60 mb-1">Safety Operator Name</label>
                <input
                  type="text"
                  required
                  value={newOperator}
                  onChange={e => setNewOperator(e.target.value)}
                  className="w-full px-3 py-2 border border-joppli-grey rounded-lg focus:outline-none focus:border-joppli-blue text-sm uppercase font-bold text-joppli-dark"
                />
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <span className="block text-xs font-bold uppercase tracking-widest text-joppli-dark/50">Verification Items Checklist</span>
              {Object.entries(newChecklist).map(([key, item]: [string, any]) => (
                <div key={key} className="p-4 rounded-xl border border-joppli-grey items-start flex flex-col gap-3">
                  <div className="flex w-full justify-between items-center bg-joppli-light/40 py-1 px-2 rounded">
                    <span className="text-xs font-bold text-joppli-dark uppercase tracking-wide">{item.name}</span>
                    <div className="flex bg-white rounded border border-joppli-grey overflow-hidden font-mono text-[10px] uppercase">
                      {(['PASS', 'FLAG', 'NA'] as const).map(f => (
                        <button
                          type="button"
                          key={f}
                          onClick={() => handleStatusChange(key, f)}
                          className={`px-3 py-1 font-extrabold border-r last:border-0 transition-colors ${
                            item.status === f
                              ? f === 'PASS' ? 'bg-joppli-green text-white' : f === 'FLAG' ? 'bg-joppli-yellow text-joppli-dark' : 'bg-joppli-dark text-white'
                              : 'text-joppli-dark/60 hover:bg-joppli-light'
                          }`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>
                  <input
                    type="text"
                    placeholder="Operator log notes (optional / required if flagged)"
                    value={item.notes}
                    onChange={e => handleNotesChange(key, e.target.value)}
                    className="w-full text-xs border border-joppli-grey/60 px-2 py-1.5 rounded focus:outline-none focus:border-joppli-blue font-sans text-joppli-dark bg-joppli-light/20"
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 border-t border-joppli-grey/50 pt-4">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-4 py-2 border border-joppli-grey/80 rounded-lg text-xs font-bold uppercase hover:bg-joppli-light transition-colors text-joppli-dark"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-joppli-blue text-white rounded-lg text-xs font-bold uppercase hover:bg-joppli-blue/90 transition-colors flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" /> Submit Safety Report
              </button>
            </div>
          </form>
        )}

        {/* 3. HISTORY LIST VIEW */}
        {!isCreating && !selectedInspection && (
          <div className="bg-white border border-joppli-grey rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 bg-joppli-light/40 border-b border-joppli-grey flex justify-between items-center">
              <span className="text-xs font-black uppercase tracking-widest text-joppli-dark/60">Safety Shift Audits Log</span>
              <span className="text-[10px] bg-joppli-dark/10 text-joppli-dark font-mono font-bold px-2 py-0.5 rounded-full">
                {inspections.length} RECORDS
              </span>
            </div>

            <div className="divide-y divide-joppli-grey">
              {inspections.map(insp => (
                <div key={insp.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 group hover:bg-joppli-light/30 transition-colors">
                  <div className="flex items-start gap-3.5">
                    <div className="mt-1">
                      {insp.status === 'PASS' ? (
                        <CheckCircle2 className="w-5 h-5 text-joppli-green" />
                      ) : insp.status === 'FLAGGED' ? (
                        <AlertTriangle className="w-5 h-5 text-joppli-yellow" />
                      ) : (
                        <XCircle className="w-5 h-5 text-joppli-red" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-joppli-dark">{insp.id}</span>
                        <span className="text-xs font-black font-mono text-joppli-blue px-2 py-0.5 rounded bg-joppli-blue/5 border border-joppli-blue/10">
                          {insp.vehicle}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-joppli-dark/50 mt-1 uppercase tracking-wider font-bold">
                        <span>{insp.date}</span>
                        <span>•</span>
                        <span>{insp.operator}</span>
                        <span>•</span>
                        <span>{insp.duration} scan</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-4 shrink-0">
                    <span className={`px-3 py-0.5 rounded text-[10px] font-black tracking-widest border uppercase ${
                      insp.status === 'PASS' ? 'bg-joppli-green/10 text-joppli-green border-joppli-green/10' :
                      insp.status === 'FLAGGED' ? 'bg-joppli-yellow/10 text-joppli-yellow border-joppli-yellow/10' :
                      'bg-joppli-red/10 text-joppli-red border-joppli-red/10'
                    }`}>
                      {insp.status}
                    </span>
                    
                    <button
                      onClick={() => setSelectedInspection(insp)}
                      className="flex items-center gap-1 px-2.5 py-1 text-joppli-dark/60 hover:text-joppli-dark border border-joppli-grey bg-white hover:bg-joppli-light rounded text-xs font-bold transition-all uppercase tracking-wider"
                    >
                      <Eye className="w-3.5 h-3.5" /> Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
