import React, { useState, useRef, useEffect } from 'react';
import { Bell, Search, HelpCircle, Plus, LogOut, ShieldCheck, User as UserIcon } from 'lucide-react';
import { Alert, Vehicle, CollectionRequest, OperatorProfile } from '../types';
import type { User as FirebaseUser } from 'firebase/auth';

interface TopBarProps {
  alerts: Alert[];
  vehicles: Vehicle[];
  requests: CollectionRequest[];
  currentUser: FirebaseUser | null;
  currentUserProfile?: OperatorProfile | null;
  isAdmin: boolean;
  onLogout: () => void;
  onClearAlerts: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ 
  alerts, 
  currentUser, 
  currentUserProfile,
  isAdmin, 
  onLogout, 
  onClearAlerts 
}) => {
  const [showAlerts, setShowAlerts] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [dropdownAvatarError, setDropdownAvatarError] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const alertsRef = useRef<HTMLDivElement>(null);

  // Reset image errors when active user changes
  useEffect(() => {
    setAvatarError(false);
    setDropdownAvatarError(false);
  }, [currentUser]);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowProfileDropdown(false);
      }
      if (alertsRef.current && !alertsRef.current.contains(event.target as Node)) {
        setShowAlerts(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute User Display Information
  const email = currentUser?.email || 'operator@joeppli.ch';
  const photoURL = currentUser?.photoURL || null;
  
  // Try to generate a clean display name
  let displayName = currentUser?.displayName || '';
  if (!displayName) {
    const prefix = email.split('@')[0];
    displayName = prefix.charAt(0).toUpperCase() + prefix.slice(1);
  }

  // Generate initials
  const initials = displayName
    .split(' ')
    .map((n: string) => n.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase();

  // Dynamic privilege label
  let privilegeLabel = isAdmin ? 'System Admin' : 'Operator';
  if (currentUserProfile) {
    const projectLabel = currentUserProfile.project === 'zurich' ? 'Zürich' : 'Glarus';
    const roleLabel = currentUserProfile.role === 'admin' ? 'Admin' : 'Operator';
    privilegeLabel = `${projectLabel} ${roleLabel}`;
  }

  return (
    <header className="h-16 bg-white border-b border-joppli-grey flex items-center justify-between px-6 shrink-0 z-10 w-full shadow-sm">
      {/* Search Bar */}
      <div className="flex items-center gap-4 flex-1">
        <div className="relative w-[360px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-joppli-dark/40" />
          <input 
            type="text" 
            placeholder="Search vehicles, smart bins, incident reports..." 
            className="w-full pl-9 pr-4 py-1.5 bg-white border border-joppli-grey rounded-xl text-sm font-semibold text-joppli-dark focus:outline-none focus:border-joppli-blue focus:ring-1 focus:ring-joppli-blue transition-colors placeholder:text-joppli-dark/30 uppercase placeholder:low-case"
          />
        </div>
      </div>
      
      {/* Utility Actions */}
      <div className="flex items-center gap-3.5 h-full">
        <button className="w-8 h-8 rounded-full border border-joppli-grey flex items-center justify-center text-joppli-dark hover:bg-joppli-light transition-colors cursor-pointer">
          <HelpCircle className="w-4 h-4 text-joppli-dark/60" />
        </button>
        <button className="w-8 h-8 rounded-full border border-joppli-grey flex items-center justify-center text-joppli-dark hover:bg-joppli-light transition-colors cursor-pointer">
          <Plus className="w-4 h-4 text-joppli-dark/60" />
        </button>
        
        <div className="h-6 w-px bg-joppli-grey mx-0.5"></div>
        
        {/* Notifications Alert Popover */}
        <div className="relative" ref={alertsRef}>
          <button 
            onClick={() => setShowAlerts(!showAlerts)}
            className={`relative w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
              showAlerts ? 'bg-joppli-grey text-joppli-dark' : 'text-joppli-dark hover:bg-joppli-light'
            }`}
          >
            <Bell className="w-4 h-4 text-joppli-dark/70" />
            {alerts.filter(a => !a.read).length > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 border-[2px] border-white bg-joppli-red rounded-full"></span>
            )}
          </button>
          
          {showAlerts && (
            <div className="absolute right-0 mt-3.5 w-85 bg-white border border-joppli-grey rounded-2xl shadow-xl shadow-joppli-dark/5 overflow-hidden z-[100] flex flex-col">
              <div className="px-4 py-3 border-b border-joppli-grey flex items-center justify-between bg-joppli-light">
                <span className="font-black text-xs uppercase tracking-widest text-joppli-dark/70">System Diagnostics</span>
                <button 
                  onClick={onClearAlerts} 
                  className="text-[10px] text-joppli-blue hover:underline font-black uppercase tracking-wider"
                >
                  Mark all read
                </button>
              </div>
              <div className="max-h-80 overflow-y-auto p-2">
                {alerts.length === 0 ? (
                   <div className="p-6 text-center text-xs font-bold text-joppli-dark/45 uppercase tracking-wide">No active alerts</div>
                ) : (
                  alerts.map(alert => (
                    <div key={alert.id} className={`p-3 rounded-xl mb-1 text-xs border border-transparent ${alert.read ? 'opacity-55' : 'bg-joppli-light/50 border-joppli-grey/40'}`}>
                      <div className="flex items-start gap-2.5">
                        <div className={`w-2.5 h-2.5 mt-1 rounded-full shrink-0 ${
                          alert.read ? 'bg-joppli-grey' : 
                          alert.type === 'warning' ? 'bg-joppli-yellow border border-white' : 
                          alert.type === 'error' ? 'bg-joppli-red border border-white animate-ping' : 
                          'bg-joppli-blue border border-white'
                        }`}></div>
                        <p className="font-bold flex-1 text-joppli-dark uppercase leading-relaxed text-[10px] tracking-wide">{alert.message}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="h-6 w-px bg-joppli-grey mx-0.5"></div>

        {/* Profile Dropdown Menu */}
        <div className="relative h-full flex items-center" ref={dropdownRef}>
          <button 
            onClick={() => setShowProfileDropdown(!showProfileDropdown)}
            className="flex items-center gap-3.5 pl-2.5 pr-1.5 py-1.5 rounded-2xl hover:bg-joppli-light transition-all cursor-pointer text-left border border-transparent hover:border-joppli-grey/60"
          >
            {/* User Profile Avatar */}
            {photoURL && !avatarError ? (
              <img 
                src={photoURL} 
                alt={displayName} 
                onError={() => setAvatarError(true)}
                className="w-8 h-8 rounded-full border border-joppli-grey/50 shadow-sm shrink-0 object-cover" 
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-joppli-dark text-white flex items-center justify-center font-bold text-xs shrink-0 border border-joppli-dark">
                {initials}
              </div>
            )}

            {/* User Description Info */}
            <div className="hidden md:flex flex-col select-none pr-1">
              <span className="font-black text-xs tracking-tight text-joppli-dark truncate max-w-[120px] uppercase">
                {displayName}
              </span>
              <span className={`text-[8px] font-black uppercase tracking-wider flex items-center gap-1 ${
                isAdmin ? 'text-joppli-green' : 'text-joppli-blue'
              }`}>
                {isAdmin && <ShieldCheck className="w-2.5 h-2.5 inline" />}
                {privilegeLabel}
              </span>
            </div>
          </button>

          {/* Premium Profile Dropdown Panel */}
          {showProfileDropdown && (
            <div className="absolute right-0 top-[60px] w-72 bg-white border border-joppli-grey rounded-2xl shadow-xl shadow-joppli-dark/5 overflow-hidden z-[100] p-4 text-joppli-dark">
              {/* Header */}
              <div className="flex items-center gap-3 pb-3 border-b border-joppli-grey/60 mb-3">
                {photoURL && !dropdownAvatarError ? (
                  <img 
                    src={photoURL} 
                    alt={displayName} 
                    onError={() => setDropdownAvatarError(true)}
                    className="w-11 h-11 rounded-full border border-joppli-grey object-cover" 
                  />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-joppli-dark text-white flex items-center justify-center font-bold text-sm">
                    {initials}
                  </div>
                )}
                <div className="flex flex-col min-w-0">
                  <span className="font-black text-sm uppercase truncate">{displayName}</span>
                  <span className="text-[10px] text-joppli-dark/50 truncate font-semibold">{email}</span>
                </div>
              </div>

              {/* Status Badge */}
              <div className="mb-4">
                <span className="text-[8px] font-black uppercase tracking-widest text-joppli-dark/40 block mb-1">Privilege Status</span>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                  isAdmin 
                    ? 'bg-joppli-green/10 text-joppli-green border-joppli-green/20' 
                    : 'bg-joppli-blue/10 text-joppli-blue border-joppli-blue/20'
                }`}>
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {privilegeLabel}
                </span>
              </div>

              {/* Actions */}
              <div className="pt-2 border-t border-joppli-grey/50">
                <button
                  onClick={() => {
                    setShowProfileDropdown(false);
                    onLogout();
                  }}
                  className="w-full py-2 bg-white hover:bg-joppli-red/5 hover:text-joppli-red text-joppli-dark/85 border border-joppli-grey hover:border-joppli-red/20 rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out of Terminal
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
