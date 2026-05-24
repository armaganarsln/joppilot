import React, { useState } from 'react';
import { Bell, CheckCircle2, Clock, AlertCircle, Plus, Calendar, Trash2 } from 'lucide-react';

interface Reminder {
  id: string;
  title: string;
  vehicle?: 'JÖP-01' | 'JÖP-02' | 'All Vehicles';
  dueDate: string;
  status: 'UPCOMING' | 'DUE SOON' | 'OVERDUE' | 'COMPLETED';
  responsible: string;
  description: string;
}

const INITIAL_REMINDERS: Reminder[] = [
  {
    id: 'REM-001',
    title: 'LIDAR Sensor Calibration',
    vehicle: 'JÖP-01',
    dueDate: '2026-06-15',
    status: 'UPCOMING',
    responsible: 'Armağan Arslan',
    description: 'Ensure precision mapping. Mandatory calibration required every 90 operational days.'
  },
  {
    id: 'REM-002',
    title: 'LIDAR Sensor Calibration',
    vehicle: 'JÖP-02',
    dueDate: '2026-05-28',
    status: 'DUE SOON',
    responsible: 'Robert Watkins',
    description: 'Hardware precision alignment on JÖP-02. Needs backup verification on Alt-Wiedikon test track.'
  },
  {
    id: 'REM-003',
    title: 'ROS Software Stack OTA Window',
    vehicle: 'All Vehicles',
    dueDate: '2026-05-25',
    status: 'DUE SOON',
    responsible: 'Armağan Arslan',
    description: 'Pushing OTA build stability package v4.2.1-lts. Safe operator override testing ready.'
  },
  {
    id: 'REM-004',
    title: 'ERZ Monthly Sustainability Performance Report',
    dueDate: '2026-05-31',
    status: 'UPCOMING',
    responsible: 'Sarah Oconnor',
    description: 'Aggregate bin clearance ratios, e-waste/PET sorting accuracy analytics for Stadt Zürich.'
  },
  {
    id: 'REM-005',
    title: 'BAFU Annual Safety Certification Export',
    dueDate: '2026-05-20',
    status: 'OVERDUE',
    responsible: 'Armağan Arslan',
    description: 'Immediate regulatory declaration required detailing zero severe ODD boundary excursions.'
  },
  {
    id: 'REM-006',
    title: 'Safety Operator License & Renewal',
    dueDate: '2026-06-01',
    status: 'UPCOMING',
    responsible: 'Mike Chen',
    description: 'Recertification hours on simulator control system required for remote pilot backup.'
  },
  {
    id: 'REM-007',
    title: 'Zurich Cantonal Logistics Fleet Insurance',
    vehicle: 'All Vehicles',
    dueDate: '2026-07-12',
    status: 'UPCOMING',
    responsible: 'ERZ Stadt Zürich',
    description: 'Renew corporate spatial autonomy liability package policy details.'
  }
];

export const RemindersView: React.FC = () => {
  const [reminders, setReminders] = useState<Reminder[]>(INITIAL_REMINDERS);
  const [isAdding, setIsAdding] = useState(false);
  
  // Create reminder state
  const [newTitle, setNewTitle] = useState('');
  const [newVehicle, setNewVehicle] = useState<'JÖP-01' | 'JÖP-02' | 'All Vehicles' | 'None'>('None');
  const [newDueDate, setNewDueDate] = useState('');
  const [newResponsible, setNewResponsible] = useState('Armağan Arslan');
  const [newDesc, setNewDesc] = useState('');

  const toggleComplete = (id: string) => {
    setReminders(prev => prev.map(rem => {
      if (rem.id === id) {
        const targetStatus = rem.status === 'COMPLETED' ? 'UPCOMING' : 'COMPLETED';
        return { ...rem, status: targetStatus };
      }
      return rem;
    }));
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const activeVeh = newVehicle === 'None' ? undefined : newVehicle;
    
    // Auto status based on date
    const today = new Date();
    const due = new Date(newDueDate);
    const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    let computedStatus: Reminder['status'] = 'UPCOMING';
    if (diffDays < 0) {
      computedStatus = 'OVERDUE';
    } else if (diffDays <= 5) {
      computedStatus = 'DUE SOON';
    }

    const newReminderItem: Reminder = {
      id: `REM-0${reminders.length + 10}`,
      title: newTitle,
      vehicle: activeVeh,
      dueDate: newDueDate,
      status: computedStatus,
      responsible: newResponsible,
      description: newDesc
    };

    setReminders([newReminderItem, ...reminders]);
    setIsAdding(false);
    setNewTitle('');
    setNewDueDate('');
    setNewDesc('');
  };

  const deleteReminder = (id: string) => {
    setReminders(prev => prev.filter(r => r.id !== id));
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-joppli-light font-sans flex flex-col items-center">
      <div className="w-full max-w-5xl">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Bell className="w-8 h-8 text-joppli-red" />
            <div>
              <h1 className="text-2xl font-black text-joppli-dark uppercase tracking-wide">Operational Reminders</h1>
              <p className="text-xs text-joppli-dark/50 uppercase tracking-widest font-bold">Regulatory Audits & Service Deadlines</p>
            </div>
          </div>

          {!isAdding && (
            <button
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-2 px-4 py-2 bg-joppli-dark text-white rounded-lg text-sm font-bold shadow-sm hover:bg-joppli-blue transition-all uppercase tracking-widest"
            >
              <Plus className="w-4 h-4" /> Add Task
            </button>
          )}

          {isAdding && (
            <button
              onClick={() => setIsAdding(false)}
              className="px-3 py-1.5 border border-joppli-grey bg-white text-joppli-dark hover:bg-joppli-light rounded-lg text-xs font-bold transition-all uppercase tracking-widest"
            >
              Cancel
            </button>
          )}
        </div>

        {/* Create Form */}
        {isAdding && (
          <form onSubmit={handleCreate} className="bg-white border border-joppli-grey rounded-xl shadow-sm p-6 mb-8 text-joppli-dark">
            <h2 className="text-base font-black uppercase tracking-wider mb-4 border-b border-joppli-grey/50 pb-2">
              Dispatch New Operational Directive
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-joppli-dark/60 mb-1">Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. LIDAR Mirror Alignment"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-joppli-grey rounded-lg text-sm font-bold text-joppli-dark uppercase placeholder:low-case focus:outline-none focus:border-joppli-blue bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-joppli-dark/60 mb-1">Assigned Asset</label>
                <select
                  value={newVehicle}
                  onChange={e => setNewVehicle(e.target.value as any)}
                  className="w-full px-3 py-2 border border-joppli-grey rounded-lg text-sm font-bold text-joppli-dark uppercase focus:outline-none focus:border-joppli-blue bg-white"
                >
                  <option value="None">None / General</option>
                  <option value="JÖP-01">JÖP-01</option>
                  <option value="JÖP-02">JÖP-02</option>
                  <option value="All Vehicles">All Vehicles</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-joppli-dark/60 mb-1">Due Date</label>
                <input
                  type="date"
                  required
                  value={newDueDate}
                  onChange={e => setNewDueDate(e.target.value)}
                  className="w-full px-3 py-2 border border-joppli-grey rounded-lg text-sm font-bold text-joppli-dark focus:outline-none focus:border-joppli-blue bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-joppli-dark/60 mb-1">Responsible Agent</label>
                <input
                  type="text"
                  required
                  value={newResponsible}
                  onChange={e => setNewResponsible(e.target.value)}
                  className="w-full px-3 py-2 border border-joppli-grey rounded-lg text-sm font-bold text-joppli-dark uppercase focus:outline-none focus:border-joppli-blue bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-joppli-dark/60 mb-1">Directive Details</label>
                <input
                  type="text"
                  placeholder="Task scope details..."
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-joppli-grey rounded-lg text-sm font-medium text-joppli-dark focus:outline-none focus:border-joppli-blue bg-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-joppli-grey/50">
              <button
                type="submit"
                className="px-4 py-2 bg-joppli-blue text-white rounded-lg text-xs font-bold uppercase hover:bg-joppli-blue/95 transition-colors"
              >
                Publish Directive
              </button>
            </div>
          </form>
        )}

        {/* Reminders List & Kanban Layout */}
        <div className="grid grid-cols-1 gap-4">
          {reminders.map(rem => {
            const isCompleted = rem.status === 'COMPLETED';
            return (
              <div
                key={rem.id}
                className={`p-5 rounded-xl border bg-white transition-all shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  isCompleted 
                    ? 'border-joppli-green/20 opacity-60 bg-joppli-light/10' 
                    : rem.status === 'OVERDUE' 
                      ? 'border-joppli-red/30 bg-joppli-red/[0.01]' 
                      : 'border-joppli-grey'
                }`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="text-[10px] bg-joppli-dark/10 px-2 py-0.5 rounded font-mono font-bold text-joppli-dark/60">
                      {rem.id}
                    </span>
                    {rem.vehicle && (
                      <span className="text-[10px] bg-joppli-blue/10 text-joppli-blue px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                        {rem.vehicle}
                      </span>
                    )}
                    <span className={`px-2 py-0.5 rounded text-[9px] font-black tracking-widest border ${
                      isCompleted ? 'bg-joppli-green/10 text-joppli-green border-joppli-green/20' :
                      rem.status === 'OVERDUE' ? 'bg-joppli-red/10 text-joppli-red border-joppli-red/20 animate-pulse' :
                      rem.status === 'DUE SOON' ? 'bg-joppli-yellow/10 text-joppli-yellow border-joppli-yellow/20' :
                      'bg-joppli-dark/5 text-joppli-dark/60 border-joppli-dark/10'
                    }`}>
                      {rem.status}
                    </span>
                  </div>

                  <h3 className={`text-sm font-black uppercase tracking-wide ${isCompleted ? 'line-through text-joppli-dark/40' : 'text-joppli-dark'}`}>
                    {rem.title}
                  </h3>
                  
                  <p className="text-xs text-joppli-dark/65 mt-1 max-w-2xl font-medium">
                    {rem.description}
                  </p>

                  <div className="flex items-center gap-4 text-xs mt-3 text-joppli-dark/50 font-bold uppercase tracking-wider">
                    <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-joppli-blue/70" /> {rem.dueDate}</span>
                    <span>•</span>
                    <span>Responsible: {rem.responsible}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 border-t md:border-t-0 border-joppli-grey/40 pt-3 md:pt-0 shrink-0">
                  <button
                    onClick={() => toggleComplete(rem.id)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold uppercase transition-all tracking-wider ${
                      isCompleted 
                        ? 'bg-joppli-green/10 text-joppli-green border border-joppli-green/20 hover:bg-joppli-green/25' 
                        : 'bg-joppli-dark text-white hover:bg-joppli-blue'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" /> {isCompleted ? 'Completed' : 'Resolve'}
                  </button>
                  
                  <button
                    onClick={() => deleteReminder(rem.id)}
                    className="p-2 text-joppli-dark/30 hover:text-joppli-red hover:bg-joppli-red/10 rounded-lg transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
