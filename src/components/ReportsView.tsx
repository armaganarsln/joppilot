import React, { useState } from 'react';
import { FileText, Download, Calendar, RefreshCw, Send, CheckCircle } from 'lucide-react';

interface ReportTemplate {
  id: string;
  name: string;
  cadence: 'Daily' | 'Weekly' | 'Monthly' | 'Annual';
  recipients: string;
  lastSentDate: string;
  description: string;
  status: 'idle' | 'generating' | 'success';
}

const INITIAL_REPORT_TEMPLATES: ReportTemplate[] = [
  {
    id: 'REP-DFS-001',
    name: 'Daily Ops Performance Report',
    cadence: 'Daily',
    recipients: 'sarah.o@erz.zuerich.ch, armaganarsln@gmail.com',
    lastSentDate: '2026-05-22 23:55',
    description: 'Autonomous vehicle telemetry logs, route mileage completed, weight totals cleared by JÖP-01 & JÖP-02 in Alt-Wiedikon.',
    status: 'idle'
  },
  {
    id: 'REP-DFS-002',
    name: 'Monthly ERZ Performance Audit',
    cadence: 'Monthly',
    recipients: 'christian.keller@zuerich.ch, daniela.j@zuerich.ch',
    lastSentDate: '2026-05-01 08:30',
    description: 'Long-term PET, glass & paper collection metrics, public sector carbon offset index, and street lane noise levels vs baselines.',
    status: 'idle'
  },
  {
    id: 'REP-DFS-003',
    name: 'Autonomous Safety & Disengagement Log',
    cadence: 'Weekly',
    recipients: 'safety-monitoring@bafu.admin.ch, stefan.gross@joppli.com',
    lastSentDate: '2026-05-19 18:00',
    description: 'Granular evaluation of disengagements, Minimal Risk Maneuvers (MRMs), remote pilot takeovers, and assistance requests.',
    status: 'idle'
  },
  {
    id: 'REP-DFS-004',
    name: 'BAFU Annual Legal Compliance Export',
    cadence: 'Annual',
    recipients: 'bafu-compliance@admin.ch, erz-legal@zuerich.ch',
    lastSentDate: '2025-12-31 16:30',
    description: 'Federal logistical certification compliance, battery lifecycle status reports, and environmental safety bounds audit.',
    status: 'idle'
  }
];

export const ReportsView: React.FC = () => {
  const [reports, setReports] = useState<ReportTemplate[]>(INITIAL_REPORT_TEMPLATES);
  const [downloadMsg, setDownloadMsg] = useState<string | null>(null);

  const handleGenerate = (id: string) => {
    setReports(prev => prev.map(rep => {
      if (rep.id === id) {
        return { ...rep, status: 'generating' };
      }
      return rep;
    }));

    setTimeout(() => {
      setReports(prev => prev.map(rep => {
        if (rep.id === id) {
          return {
            ...rep,
            status: 'success',
            lastSentDate: new Date().toISOString().slice(0, 16).replace('T', ' ')
          };
        }
        return rep;
      }));

      // Reset to idle after 3 seconds
      setTimeout(() => {
        setReports(prev => prev.map(rep => {
          if (rep.id === id) {
            return { ...rep, status: 'idle' };
          }
          return rep;
        }));
      }, 3000);
    }, 1500);
  };

  const handleDownloadFile = (reportName: string) => {
    setDownloadMsg(`Downloading the compiled document of "${reportName}" now...`);
    setTimeout(() => {
      setDownloadMsg(null);
    }, 2500);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-joppli-light font-sans flex flex-col items-center">
      <div className="w-full max-w-5xl">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <FileText className="w-8 h-8 text-joppli-blue" />
            <div>
              <h1 className="text-2xl font-black text-joppli-dark uppercase tracking-wide">Stakeholder Reports</h1>
              <p className="text-xs text-joppli-dark/50 uppercase tracking-widest font-bold">Zürich Municipality ERZ & Federal BAFU Audits</p>
            </div>
          </div>
        </div>

        {/* Temporary toast notification for mock downloads */}
        {downloadMsg && (
          <div className="fixed bottom-6 right-6 z-50 bg-joppli-dark text-white text-xs font-bold uppercase tracking-widest px-5 py-3 rounded-lg border border-white/20 shadow-xl animate-fade-in flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-joppli-green animate-bounce" />
            <span>{downloadMsg}</span>
          </div>
        )}

        {/* Reports Templates Card Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {reports.map(report => (
            <div key={report.id} className="bg-white border border-joppli-grey rounded-xl shadow-sm p-6 flex flex-col justify-between relative overflow-hidden hover:shadow-md transition-shadow">
              
              <div>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <span className="text-[10px] text-joppli-dark/50 font-mono font-bold uppercase">{report.id}</span>
                    <h3 className="text-sm font-black text-joppli-dark uppercase tracking-wide mt-0.5">{report.name}</h3>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[9px] bg-joppli-blue/10 text-joppli-blue border border-joppli-blue/15 font-black tracking-widest uppercase font-mono">
                    {report.cadence}
                  </span>
                </div>

                <p className="text-xs text-joppli-dark/65 font-medium leading-relaxed mb-4">
                  {report.description}
                </p>

                <div className="space-y-1.5 text-[10px] font-bold uppercase tracking-wider text-joppli-dark/50 bg-joppli-light/40 p-3 rounded-lg border border-joppli-grey/40 mb-5">
                  <div className="truncate">
                    <span className="text-joppli-dark/30">Subscribed Recipients:</span> <span className="lowercase font-mono text-joppli-dark/70 font-medium">{report.recipients}</span>
                  </div>
                  <div>
                    <span>Last Synced & Sent:</span> <span className="text-joppli-blue font-mono">{report.lastSentDate}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2.5 border-t border-joppli-grey/50 pt-4">
                <button
                  onClick={() => handleDownloadFile(report.name)}
                  className="flex-1 py-2 text-center bg-white border border-joppli-grey hover:bg-joppli-light rounded-lg text-xs font-bold uppercase tracking-wider text-joppli-dark transition-all flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5 text-joppli-dark/60" /> Download
                </button>
                
                <button
                  onClick={() => handleGenerate(report.id)}
                  disabled={report.status !== 'idle'}
                  className={`flex-1 py-2 text-center rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                    report.status === 'success' 
                      ? 'bg-joppli-green text-white' 
                      : report.status === 'generating' 
                        ? 'bg-joppli-yellow text-joppli-dark' 
                        : 'bg-joppli-dark text-white hover:bg-joppli-blue'
                  }`}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${report.status === 'generating' ? 'animate-spin' : ''}`} />
                  {report.status === 'generating' ? 'Re-compiling' : report.status === 'success' ? 'Finished' : 'Generate Now'}
                </button>
              </div>

            </div>
          ))}
        </div>

        {/* Historic Download Table */}
        <div className="bg-white border border-joppli-grey rounded-xl shadow-sm overflow-hidden mb-6">
          <div className="px-4 py-3 bg-joppli-light/40 border-b border-joppli-grey flex justify-between items-center">
            <span className="text-xs font-black uppercase tracking-widest text-joppli-dark/60">Recent Compiled File Assets</span>
            <span className="text-[10px] font-mono font-bold bg-joppli-dark/10 text-joppli-dark px-2 py-0.5 rounded-full">
              4 RECORDS
            </span>
          </div>

          <div className="divide-y divide-joppli-grey text-xs">
            {[
              { title: 'Alt-Wiedikon Fleet Performance Excel Export (JÖP-01 & JÖP-02)', date: '2026-05-22 23:55', size: '1.2 MB', ext: 'XLSX' },
              { title: 'Federal Environment Office Regulatory BAFU Safety Submission Draft', date: '2026-05-19 18:00', size: '3.4 MB', ext: 'PDF' },
              { title: 'Recycling Carbon Offsetting Municipal Carbon Ratios Index', date: '2026-05-01 08:30', size: '940 KB', ext: 'CSV' },
              { title: 'Chassis Hub Diagnostic Log Report', date: '2026-04-18 09:15', size: '20.4 MB', ext: 'ZIP' }
            ].map((file, idx) => (
              <div key={idx} className="p-4 flex items-center justify-between group hover:bg-joppli-light/20 transition-colors">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-lg bg-joppli-light border border-joppli-grey flex items-center justify-center shrink-0 font-mono font-bold text-[9px] text-joppli-dark/50">
                    {file.ext}
                  </div>
                  <div>
                    <h4 className="font-extrabold uppercase text-joppli-dark text-sm tracking-wide">{file.title}</h4>
                    <div className="flex gap-2 text-[10px] font-bold text-joppli-dark/40 uppercase mt-0.5 tracking-wider font-mono">
                      <span>{file.date}</span>
                      <span>•</span>
                      <span>{file.size}</span>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => handleDownloadFile(file.title)}
                  className="w-8 h-8 rounded-lg border border-joppli-grey flex items-center justify-center text-joppli-dark/40 hover:text-joppli-dark hover:border-joppli-dark hover:bg-white transition-all pointer-events-auto opacity-0 group-hover:opacity-100 shadow-sm"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
