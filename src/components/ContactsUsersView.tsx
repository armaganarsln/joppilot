import React, { useState } from 'react';
import { Users, Mail, Shield, ShieldCheck, Activity, Search } from 'lucide-react';

interface Contact {
  name: string;
  role: string;
  email: string;
  permissions: 'System Admin' | 'Fleet Controller' | 'Field Operator' | 'Partner Read-Only';
  lastActive: string;
}

export const ContactsUsersView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'operators' | 'safety' | 'erz' | 'hardware'>('operators');
  const [searchTerm, setSearchTerm] = useState('');

  const contactsData: Record<'operators' | 'safety' | 'erz' | 'hardware', Contact[]> = {
    operators: [
      { name: 'Armağan Arslan', role: 'Founding Operator / Tech Lead', email: 'armaganarsln@gmail.com', permissions: 'System Admin', lastActive: 'Active Now' },
      { name: 'Sarah Oconnor', role: 'Senior Dispatcher', email: 'sarah.o@erz.zuerich.ch', permissions: 'Fleet Controller', lastActive: '12 mins ago' },
      { name: 'Mike Chen', role: 'Support Controller', email: 'mike.chen@joppli.com', permissions: 'Fleet Controller', lastActive: '2 hours ago' }
    ],
    safety: [
      { name: 'Robert Watkins', role: 'Safety Backup Operator', email: 'robert.w@joppli.com', permissions: 'Field Operator', lastActive: '2 days ago' },
      { name: 'Beat Meyer', role: 'Depot Fleet Operations Coordinator', email: 'beat.meyer@erz.zuerich.ch', permissions: 'System Admin', lastActive: '4 hours ago' }
    ],
    erz: [
      { name: 'Christian Keller', role: 'ERZ Stadt Zürich Smart Waste Director', email: 'christian.keller@zuerich.ch', permissions: 'Partner Read-Only', lastActive: '3 days ago' },
      { name: 'Daniela Janser', role: 'Alt-Wiedikon Recycling Inspector', email: 'daniela.j@zuerich.ch', permissions: 'Partner Read-Only', lastActive: 'Yesterday' }
    ],
    hardware: [
      { name: 'Stefan Gross', role: 'Jöppli OEM Support Lead', email: 'stefan.gross@joppli.com', permissions: 'System Admin', lastActive: '5 days ago' },
      { name: 'Hans Müller', role: 'LIDAR Optics Specialist', email: 'h.mueller@velodyne-eu.ch', permissions: 'Field Operator', lastActive: '1 week ago' }
    ]
  };

  const filteredContacts = contactsData[activeSubTab].filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-joppli-light font-sans flex flex-col items-center">
      <div className="w-full max-w-5xl">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8 text-joppli-blue" />
            <div>
              <h1 className="text-2xl font-black text-joppli-dark uppercase tracking-wide">Contacts & Users</h1>
              <p className="text-xs text-joppli-dark/50 uppercase tracking-widest font-bold">Authorized Fleet Operators, Field Drivers & Municipal Partners</p>
            </div>
          </div>
        </div>

        {/* Filters and SubTabs Bar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b border-joppli-grey/80 pb-4">
          <div className="flex flex-wrap bg-white rounded-xl border border-joppli-grey/60 p-1.5 gap-1 shadow-sm">
            {[
              { id: 'operators', label: 'Fleet Operators' },
              { id: 'safety', label: 'Safety Backup Drivers' },
              { id: 'erz', label: 'ERZ Partners' },
              { id: 'hardware', label: 'Hardware Partners' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveSubTab(tab.id as any);
                  setSearchTerm('');
                }}
                className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${
                  activeSubTab === tab.id
                    ? 'bg-joppli-dark text-white'
                    : 'text-joppli-dark/60 hover:bg-joppli-light hover:text-joppli-dark'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 text-joppli-dark/40 absolute left-3.5 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter names or emails..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-white text-xs border border-joppli-grey rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:border-joppli-blue text-joppli-dark uppercase placeholder:low-case search-cancel:hidden"
            />
          </div>
        </div>

        {/* Contacts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredContacts.map(contact => (
            <div key={contact.email} className="bg-white border border-joppli-grey rounded-xl shadow-sm hover:shadow transition-shadow p-5 flex items-start gap-4">
              
              {/* Profile placeholder avatar */}
              <div className="w-12 h-12 rounded-full bg-joppli-blue/10 flex items-center justify-center font-black text-joppli-blue text-sm shrink-0 uppercase tracking-tighter">
                {contact.name.split(' ').map(n => n[0]).join('')}
              </div>

              {/* Info details */}
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <h3 className="font-extrabold text-sm text-joppli-dark truncate uppercase tracking-wide">
                    {contact.name}
                  </h3>
                  <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border shrink-0 ${
                    contact.permissions === 'System Admin' ? 'bg-joppli-red/10 text-joppli-red border-joppli-red/20' :
                    contact.permissions === 'Fleet Controller' ? 'bg-joppli-blue/10 text-joppli-blue border-joppli-blue/20' :
                    'bg-joppli-dark/10 text-joppli-dark/60 border-joppli-dark/20'
                  }`}>
                    {contact.permissions}
                  </span>
                </div>

                <div className="text-xs font-semibold text-joppli-dark/60 mt-0.5 uppercase tracking-wider">
                  {contact.role}
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-joppli-dark/50 mt-3 font-medium">
                  <Mail className="w-3.5 h-3.5 text-joppli-dark/40 shrink-0" />
                  <span className="truncate select-all lowercase">{contact.email}</span>
                </div>

                <div className="flex items-center gap-1.5 text-[10px] text-joppli-dark/40 mt-1 font-bold uppercase tracking-wider">
                  <ShieldCheck className="w-3.5 h-3.5 text-joppli-green shrink-0" />
                  <span>Last seen: {contact.lastActive}</span>
                </div>
              </div>

            </div>
          ))}

          {filteredContacts.length === 0 && (
            <div className="col-span-1 md:col-span-2 py-12 flex flex-col items-center justify-center text-joppli-dark/40 border border-dashed border-joppli-grey rounded-xl bg-white/40">
              <Users className="w-8 h-8 mb-2 opacity-50 text-joppli-dark/30" />
              <span className="text-sm font-bold uppercase tracking-widest">No profiles found matching search</span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
