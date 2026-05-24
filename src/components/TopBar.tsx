import React, { useState } from 'react';
import { Bell, Search, HelpCircle, Plus } from 'lucide-react';
import { Alert, Vehicle, CollectionRequest } from '../types';

interface TopBarProps {
  alerts: Alert[];
  vehicles: Vehicle[];
  requests: CollectionRequest[];
  onLogout: () => void;
  onClearAlerts: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ alerts, onClearAlerts }) => {
  const [showAlerts, setShowAlerts] = useState(false);

  return (
    <header className="h-16 bg-white border-b border-joppli-grey flex items-center justify-between px-6 shrink-0 z-10 w-full shadow-sm">
      <div className="flex items-center gap-4 flex-1">
        <div className="relative w-[400px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-joppli-dark/40" />
          <input 
            type="text" 
            placeholder="Search vehicles, smart bins, incident reports..." 
            className="w-full pl-9 pr-4 py-1.5 bg-white border border-joppli-grey rounded-md text-sm font-medium text-joppli-dark focus:outline-none focus:border-joppli-blue focus:ring-1 focus:ring-joppli-blue transition-colors placeholder:text-joppli-dark/40"
          />
        </div>
      </div>
      
      <div className="flex items-center gap-3 h-full">
        <button className="w-8 h-8 rounded-full border border-joppli-grey flex items-center justify-center text-joppli-dark hover:bg-joppli-light transition-colors">
          <HelpCircle className="w-4 h-4" />
        </button>
        <button className="w-8 h-8 rounded-full border border-joppli-grey flex items-center justify-center text-joppli-dark hover:bg-joppli-light transition-colors">
          <Plus className="w-4 h-4" />
        </button>
        
        <div className="h-6 w-px bg-joppli-grey mx-1"></div>
        
        <div className="relative">
          <button 
            onClick={() => setShowAlerts(!showAlerts)}
            className={`relative w-8 h-8 rounded-full flex items-center justify-center transition-colors ${showAlerts ? 'bg-joppli-grey text-joppli-dark' : 'text-joppli-dark hover:bg-joppli-light'}`}
          >
            <Bell className="w-4 h-4" />
            {alerts.filter(a => !a.read).length > 0 && <span className="absolute top-1 right-1 w-2 h-2 border-[1.5px] border-white bg-joppli-red rounded-full"></span>}
          </button>
          
          {showAlerts && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-joppli-grey rounded-xl shadow-xl shadow-joppli-dark/5 overflow-hidden z-[100] flex flex-col">
              <div className="px-4 py-3 border-b border-joppli-grey flex items-center justify-between bg-joppli-light">
                <span className="font-bold text-sm">Notifications</span>
                <button onClick={onClearAlerts} className="text-xs text-joppli-blue hover:underline font-bold">Mark all read</button>
              </div>
              <div className="max-h-80 overflow-y-auto p-2">
                {alerts.length === 0 ? (
                   <div className="p-4 text-center text-sm font-medium text-joppli-dark/50">No notifications</div>
                ) : alerts.map(alert => (
                  <div key={alert.id} className={`p-3 rounded-lg mb-1 text-sm ${alert.read ? 'opacity-60' : 'bg-joppli-light'}`}>
                    <div className="flex items-start gap-2">
                      <div className={`w-2 h-2 mt-1.5 rounded-full shrink-0 ${alert.read ? 'bg-joppli-grey' : alert.type === 'warning' ? 'bg-joppli-yellow' : alert.type === 'error' ? 'bg-joppli-red' : 'bg-joppli-blue'}`}></div>
                      <p className="font-medium flex-1 text-joppli-dark">{alert.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
