import React from 'react';
import { AlertCircle, Clock, CheckCircle2, MoreHorizontal, MessageSquare } from 'lucide-react';

const mockIssues = [
  { id: 'ISS-160312', title: 'Suspension squeak on rear axle', vehicle: 'JÖP-02', status: 'open', priority: 'medium', reporter: 'Robert Watkins', date: '2 hours ago' },
  { id: 'ISS-160311', title: 'Battery draining faster than usual', vehicle: 'JÖP-01', status: 'investigating', priority: 'high', reporter: 'System Alert', date: '1 day ago' },
  { id: 'ISS-160309', title: 'Scratched side panel from tight turn', vehicle: 'JÖP-01', status: 'open', priority: 'low', reporter: 'Sarah Oconnor', date: '2 days ago' },
  { id: 'ISS-160288', title: 'Navigation system losing GPS signal', vehicle: 'JÖP-02', status: 'resolved', priority: 'high', reporter: 'Mike Chen', date: '5 days ago' },
];

export const IssuesView: React.FC = () => {
  return (
    <div className="flex-1 overflow-y-auto p-6 bg-joppli-light font-sans">
      <div className="flex items-center justify-between mb-6 max-w-5xl">
        <h1 className="text-2xl font-bold text-joppli-dark">Issues</h1>
        <button className="px-4 py-2 bg-joppli-red text-white rounded-lg text-sm font-bold hover:bg-joppli-red/90 transition-colors shadow-sm">
          Report Issue
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6 max-w-5xl">
        {['All', 'Open', 'Investigating', 'Resolved'].map((tab, i) => (
          <div key={tab} className={`p-4 rounded-xl border ${i === 1 ? 'bg-white border-joppli-red/20 shadow-sm' : 'bg-white/50 border-joppli-grey text-joppli-dark/60'}`}>
            <div className="text-2xl font-light mb-1">{[4, 2, 1, 1][i]}</div>
            <div className="text-xs font-bold uppercase tracking-widest">{tab}</div>
          </div>
        ))}
      </div>

      <div className="bg-white border border-joppli-grey rounded-xl shadow-sm overflow-hidden flex flex-col max-w-5xl">
        {mockIssues.map((issue, idx) => (
          <div key={issue.id} className={`p-4 flex items-center justify-between group hover:bg-joppli-light/50 transition-colors ${idx !== mockIssues.length - 1 ? 'border-b border-joppli-grey' : ''}`}>
             <div className="flex items-center gap-4 flex-1">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  issue.status === 'resolved' ? 'bg-joppli-green/10 text-joppli-green' : 
                  issue.priority === 'high' ? 'bg-joppli-red/10 text-joppli-red' : 
                  'bg-joppli-yellow/10 text-joppli-yellow'
                }`}>
                  {issue.status === 'resolved' ? <CheckCircle2 className="w-5 h-5" /> : 
                   issue.priority === 'high' ? <AlertCircle className="w-5 h-5" /> : 
                   <Clock className="w-5 h-5" />}
                </div>
                
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-joppli-dark/50 uppercase">{issue.id}</span>
                    <span className="font-bold text-joppli-dark text-sm">{issue.title}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-medium text-joppli-dark/60">
                    <span className="text-joppli-blue bg-joppli-blue/10 px-2 py-0.5 rounded font-bold uppercase tracking-widest">{issue.vehicle}</span>
                    <span>Reported by {issue.reporter}</span>
                    <span>•</span>
                    <span>{issue.date}</span>
                  </div>
                </div>
             </div>

             <div className="flex items-center gap-4">
                <div className="flex items-center gap-1 text-joppli-dark/40 hover:text-joppli-dark transition-colors cursor-pointer opacity-0 group-hover:opacity-100">
                  <MessageSquare className="w-4 h-4" />
                  <span className="text-xs font-bold">{Math.floor(Math.random() * 5)}</span>
                </div>
                <button className="p-2 text-joppli-dark/40 hover:text-joppli-dark rounded-lg hover:bg-joppli-grey/50 transition-all opacity-0 group-hover:opacity-100">
                  <MoreHorizontal className="w-5 h-5" />
                </button>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
};
