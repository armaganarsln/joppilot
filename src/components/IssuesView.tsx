import React, { useState } from 'react';
import { AlertCircle, Clock, CheckCircle2, Trash2, Plus, Send, RefreshCw } from 'lucide-react';

interface Issue {
  id: string;
  title: string;
  vehicle: 'JÖP-01' | 'JÖP-02';
  status: 'open' | 'investigating' | 'resolved';
  priority: 'low' | 'medium' | 'high';
  reporter: string;
  date: string;
}

const INITIAL_ISSUES: Issue[] = [
  { id: 'ISS-160312', title: 'Suspension squeak on rear axle', vehicle: 'JÖP-02', status: 'open', priority: 'medium', reporter: 'Robert Watkins', date: '2 hours ago' },
  { id: 'ISS-160311', title: 'Battery draining faster than usual', vehicle: 'JÖP-01', status: 'investigating', priority: 'high', reporter: 'System Alert', date: '1 day ago' },
  { id: 'ISS-160309', title: 'Scratched side panel from tight turn', vehicle: 'JÖP-01', status: 'open', priority: 'low', reporter: 'Sarah Oconnor', date: '2 days ago' },
  { id: 'ISS-160288', title: 'Navigation system losing GPS signal', vehicle: 'JÖP-02', status: 'resolved', priority: 'high', reporter: 'Mike Chen', date: '5 days ago' },
];

export const IssuesView: React.FC = () => {
  const [issues, setIssues] = useState<Issue[]>(INITIAL_ISSUES);
  const [activeFilter, setActiveFilter] = useState<'All' | 'Open' | 'Investigating' | 'Resolved'>('All');
  const [isAdding, setIsAdding] = useState(false);

  // Form State
  const [newTitle, setNewTitle] = useState('');
  const [newVehicle, setNewVehicle] = useState<'JÖP-01' | 'JÖP-02'>('JÖP-01');
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [newReporter, setNewReporter] = useState('Armağan Arslan');

  // Counts
  const countAll = issues.length;
  const countOpen = issues.filter(i => i.status === 'open').length;
  const countInvestigating = issues.filter(i => i.status === 'investigating').length;
  const countResolved = issues.filter(i => i.status === 'resolved').length;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newIssueItem: Issue = {
      id: `ISS-${160000 + Math.floor(Math.random() * 9000)}`,
      title: newTitle,
      vehicle: newVehicle,
      status: 'open',
      priority: newPriority,
      reporter: newReporter,
      date: 'Just now'
    };

    setIssues([newIssueItem, ...issues]);
    setIsAdding(false);
    setNewTitle('');
  };

  const cycleStatus = (id: string) => {
    setIssues(prev => prev.map(issue => {
      if (issue.id === id) {
        let nextStatus: Issue['status'] = 'open';
        if (issue.status === 'open') nextStatus = 'investigating';
        else if (issue.status === 'investigating') nextStatus = 'resolved';
        return { ...issue, status: nextStatus };
      }
      return issue;
    }));
  };

  const deleteIssue = (id: string) => {
    setIssues(prev => prev.filter(i => i.id !== id));
  };

  const filteredIssues = issues.filter(issue => {
    if (activeFilter === 'All') return true;
    return issue.status === activeFilter.toLowerCase();
  });

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-joppli-light font-sans flex flex-col items-center">
      <div className="w-full max-w-5xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-joppli-dark uppercase tracking-wide">Incident & Hardware Issues</h1>
            <p className="text-xs text-joppli-dark/50 uppercase tracking-widest font-bold">Real-time Asset Disruption Log</p>
          </div>
          
          {!isAdding && (
            <button 
              onClick={() => setIsAdding(true)}
              className="px-4 py-2 bg-joppli-red text-white rounded-lg text-sm font-bold hover:bg-joppli-red/90 transition-colors shadow-sm uppercase tracking-widest flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Report Issue
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

        {/* Report Issue Form */}
        {isAdding && (
          <form onSubmit={handleCreate} className="bg-white border border-joppli-grey rounded-xl shadow-sm p-6 mb-8 text-joppli-dark">
            <h2 className="text-base font-black uppercase tracking-wider mb-4 border-b border-joppli-grey/50 pb-2 flex items-center gap-2 text-joppli-red">
              <AlertCircle className="w-5 h-5" />
              Report Fleet Disruption / Mechanical Issue
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-joppli-dark/60 mb-1">Issue Description</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Squeaking noise in front-left tire"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-joppli-grey rounded-lg text-sm font-bold text-joppli-dark uppercase placeholder:low-case focus:outline-none focus:border-joppli-blue bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-joppli-dark/60 mb-1">Affected Vehicle</label>
                <div className="flex gap-2">
                  {(['JÖP-01', 'JÖP-02'] as const).map(v => (
                    <button
                      type="button"
                      key={v}
                      onClick={() => setNewVehicle(v)}
                      className={`flex-1 py-2 rounded-lg border font-bold text-xs tracking-widest uppercase transition-all ${
                        newVehicle === v 
                          ? 'bg-joppli-blue text-white border-joppli-blue' 
                          : 'bg-white text-joppli-dark border-joppli-grey hover:bg-joppli-light'
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-joppli-dark/60 mb-1">Severity / Priority</label>
                <div className="flex bg-white rounded border border-joppli-grey overflow-hidden font-mono text-[10px] uppercase">
                  {(['low', 'medium', 'high'] as const).map(p => (
                    <button
                      type="button"
                      key={p}
                      onClick={() => setNewPriority(p)}
                      className={`flex-1 py-2 font-extrabold border-r last:border-0 transition-colors uppercase tracking-widest ${
                        newPriority === p
                          ? p === 'high' ? 'bg-joppli-red text-white' : p === 'medium' ? 'bg-joppli-yellow text-joppli-dark' : 'bg-joppli-dark text-white'
                          : 'text-joppli-dark/60 hover:bg-joppli-light'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-joppli-dark/60 mb-1">Reporting Agent</label>
                <input
                  type="text"
                  required
                  value={newReporter}
                  onChange={e => setNewReporter(e.target.value)}
                  className="w-full px-3 py-2 border border-joppli-grey rounded-lg text-sm font-bold text-joppli-dark uppercase focus:outline-none focus:border-joppli-blue bg-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-joppli-grey/50">
              <button
                type="submit"
                className="px-4 py-2 bg-joppli-red text-white rounded-lg text-xs font-bold uppercase hover:bg-joppli-red/90 transition-all flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" /> Submit Disruption Report
              </button>
            </div>
          </form>
        )}

        {/* Status Tab Counters */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { filter: 'All', count: countAll },
            { filter: 'Open', count: countOpen },
            { filter: 'Investigating', count: countInvestigating },
            { filter: 'Resolved', count: countResolved }
          ].map((tab, i) => {
            const isSelected = activeFilter === tab.filter;
            return (
              <div 
                key={tab.filter} 
                onClick={() => setActiveFilter(tab.filter as any)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  isSelected 
                    ? 'bg-white border-joppli-red/30 shadow-md scale-102 font-black' 
                    : 'bg-white/50 border-joppli-grey text-joppli-dark/60 hover:bg-white hover:border-joppli-dark/15'
                }`}
              >
                <div className={`text-2xl font-light mb-1 ${isSelected ? 'text-joppli-red font-semibold' : ''}`}>
                  {tab.count}
                </div>
                <div className="text-[10px] font-bold uppercase tracking-widest">{tab.filter}</div>
              </div>
            );
          })}
        </div>

        {/* Issues List */}
        <div className="bg-white border border-joppli-grey rounded-xl shadow-sm overflow-hidden flex flex-col">
          {filteredIssues.length === 0 && (
            <div className="text-center py-12 text-joppli-dark/40 font-bold text-sm uppercase tracking-wide">
              No issues found in this state.
            </div>
          )}

          {filteredIssues.map((issue, idx) => (
            <div 
              key={issue.id} 
              className={`p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 group hover:bg-joppli-light/30 transition-colors ${
                idx !== filteredIssues.length - 1 ? 'border-b border-joppli-grey' : ''
              }`}
            >
              <div className="flex items-center gap-4 flex-1">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  issue.status === 'resolved' ? 'bg-joppli-green/10 text-joppli-green' : 
                  issue.priority === 'high' ? 'bg-joppli-red/10 text-joppli-red' : 
                  'bg-joppli-yellow/10 text-joppli-yellow'
                }`}>
                  {issue.status === 'resolved' ? <CheckCircle2 className="w-5 h-5" /> : 
                   issue.status === 'investigating' ? <Clock className="w-5 h-5 animate-pulse" /> : 
                   <AlertCircle className="w-5 h-5" />}
                </div>
                
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-xs font-bold text-joppli-dark/50 uppercase font-mono">{issue.id}</span>
                    <span className="font-bold text-joppli-dark text-sm uppercase tracking-wide">{issue.title}</span>
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                      issue.priority === 'high' ? 'bg-joppli-red/10 text-joppli-red' :
                      issue.priority === 'medium' ? 'bg-joppli-yellow/10 text-joppli-yellow' :
                      'bg-joppli-dark/5 text-joppli-dark/60'
                    }`}>
                      {issue.priority} Priority
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-bold text-joppli-dark/60 uppercase tracking-wider">
                    <span className="text-joppli-blue bg-joppli-blue/10 px-2 py-0.5 rounded font-black">{issue.vehicle}</span>
                    <span>Reporter: {issue.reporter}</span>
                    <span>•</span>
                    <span>{issue.date}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between md:justify-end gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-joppli-grey/40 shrink-0">
                <span className={`px-3 py-0.5 rounded text-[10px] font-black tracking-widest border uppercase ${
                  issue.status === 'resolved' ? 'bg-joppli-green/10 text-joppli-green border-joppli-green/10' :
                  issue.status === 'investigating' ? 'bg-joppli-yellow/10 text-joppli-yellow border-joppli-yellow/10' :
                  'bg-joppli-red/10 text-joppli-red border-joppli-red/10'
                }`}>
                  {issue.status}
                </span>

                <button 
                  onClick={() => cycleStatus(issue.id)}
                  title="Cycle Status (Open -> Investigating -> Resolved)"
                  className="flex items-center gap-1 px-2.5 py-1.5 text-joppli-dark/60 hover:text-joppli-dark border border-joppli-grey bg-white hover:bg-joppli-light rounded text-[10px] font-black uppercase tracking-widest transition-all"
                >
                  <RefreshCw className="w-3 h-3" /> Step
                </button>

                <button 
                  onClick={() => deleteIssue(issue.id)}
                  className="p-2 text-joppli-dark/30 hover:text-joppli-red hover:bg-joppli-red/10 rounded-lg transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
