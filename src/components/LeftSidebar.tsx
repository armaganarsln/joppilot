import React from "react";
import {
  LayoutDashboard,
  Map,
  Truck,
  Package,
  AlertTriangle,
  FileText,
  Settings,
  ChevronDown,
  Wrench,
  Droplets,
  Users,
  MapPin,
} from "lucide-react";
import { Menu, X, Check } from "lucide-react";
import { useState } from "react";
import type { OperatorProfile, WorkspaceProject } from "../types";

interface LeftSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  currentUserProfile?: OperatorProfile | null;
  isAdmin?: boolean;
  activeProject?: WorkspaceProject;
  onProjectChange?: (project: WorkspaceProject) => void;
}

const WORKSPACES: { id: WorkspaceProject; logo: string; title: string; subtitle: string }[] = [
  { id: 'zurich', logo: 'ERZ', title: 'Jöppli x ERZ', subtitle: 'Stadt Zürich' },
  { id: 'glarus', logo: 'GL', title: 'Jöppli x Glarus', subtitle: 'Glarus Operations' },
];

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  activeTab,
  onTabChange,
  currentUserProfile,
  isAdmin = false,
  activeProject,
  onProjectChange,
}) => {
  // On small screens the sidebar is an off-canvas drawer toggled by a hamburger.
  const [mobileOpen, setMobileOpen] = useState(false);
  // The workspace switcher dropdown (top-left). Only admins may switch cities.
  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState(false);
  // Active workspace = the effective project (switcher override or assigned).
  const activeId: WorkspaceProject = activeProject ?? currentUserProfile?.project ?? 'zurich';
  const isGlarus = activeId === 'glarus';
  const logoText = isGlarus ? 'GL' : 'ERZ';
  const headerTitle = isGlarus ? 'Jöppli x Glarus' : 'Jöppli x ERZ';
  const headerSubtitle = isGlarus ? 'Glarus Operations' : 'Stadt Zürich';
  const headerLogoBg = isGlarus ? 'bg-joppli-yellow text-joppli-dark' : 'bg-joppli-blue text-white';
  // Only admins can switch workspaces (operators are scoped to their own city).
  const canSwitch = isAdmin && !!onProjectChange;

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "dispatch", label: "Map & Dispatch", icon: Map },
    { id: "vehicles", label: "Vehicles", icon: Truck },
    { id: "inspections", label: "Inspections", icon: CheckCircle },
    { id: "issues", label: "Issues", icon: AlertTriangle },
    { id: "reminders", label: "Reminders", icon: Bell },
    { id: "service", label: "Service", icon: Wrench },
    { id: "fuel", label: "Charging & Energy", icon: Droplets },
    { id: "users", label: "Contacts & Users", icon: Users },
    { id: "inventory", label: "Parts & Inventory", icon: Package },
    { id: "places", label: "Places", icon: MapPin },
    { id: "reports", label: "Reports", icon: FileText },
  ];

  const handleNav = (tab: string) => {
    onTabChange(tab);
    setMobileOpen(false); // auto-close the drawer after navigating on mobile
  };

  return (
    <>
      {/* Mobile hamburger — only visible below md */}
      <button
        onClick={() => setMobileOpen(true)}
        aria-label="Open navigation menu"
        className="md:hidden fixed top-3 left-3 z-[1200] w-10 h-10 rounded-lg bg-joppli-dark text-white flex items-center justify-center shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-joppli-blue"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Backdrop behind the drawer on mobile */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-[1200] bg-black/50 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <div
        className={`w-64 bg-joppli-dark text-white flex flex-col h-full shrink-0 font-sans z-[1300] transition-transform duration-200
          max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:shadow-2xl
          ${mobileOpen ? 'max-md:translate-x-0' : 'max-md:-translate-x-full'}`}
      >
        <div className="relative p-4">
          <div className="flex items-center justify-between">
            {/* Workspace switcher button (functional for admins) */}
            <button
              onClick={() => canSwitch && setShowWorkspaceMenu(v => !v)}
              disabled={!canSwitch}
              aria-haspopup={canSwitch ? 'menu' : undefined}
              aria-expanded={canSwitch ? showWorkspaceMenu : undefined}
              title={canSwitch ? 'Switch workspace' : undefined}
              className={`flex items-center gap-3 flex-1 min-w-0 -m-1 p-1 rounded-lg transition-colors ${canSwitch ? 'hover:bg-white/5 cursor-pointer' : 'cursor-default'}`}
            >
              <div className={`w-10 h-10 rounded-full ${headerLogoBg} flex items-center justify-center overflow-hidden font-black text-xs shrink-0`}>
                {logoText}
              </div>
              <div className="flex flex-col items-start min-w-0">
                <span className="font-bold text-sm truncate">{headerTitle}</span>
                <span className="text-xs text-white/50 truncate">{headerSubtitle}</span>
              </div>
              {canSwitch && (
                <ChevronDown className={`w-4 h-4 text-white/50 shrink-0 transition-transform ${showWorkspaceMenu ? 'rotate-180' : ''}`} />
              )}
            </button>

            {/* Close button on mobile */}
            <button
              onClick={() => setMobileOpen(false)}
              aria-label="Close navigation menu"
              className="md:hidden text-white/60 hover:text-white ml-2 shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Workspace dropdown */}
          {canSwitch && showWorkspaceMenu && (
            <>
              <div className="fixed inset-0 z-[1] " onClick={() => setShowWorkspaceMenu(false)} aria-hidden="true" />
              <div role="menu" className="absolute left-4 right-4 mt-2 z-[2] bg-[#3a3d4d] border border-white/10 rounded-xl shadow-2xl overflow-hidden">
                {WORKSPACES.map(ws => {
                  const selected = ws.id === activeId;
                  return (
                    <button
                      key={ws.id}
                      role="menuitemradio"
                      aria-checked={selected}
                      onClick={() => {
                        setShowWorkspaceMenu(false);
                        if (!selected) onProjectChange?.(ws.id);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${selected ? 'bg-white/10' : 'hover:bg-white/5'}`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-[10px] shrink-0 ${ws.id === 'glarus' ? 'bg-joppli-yellow text-joppli-dark' : 'bg-joppli-blue text-white'}`}>
                        {ws.logo}
                      </div>
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="text-sm font-bold truncate">{ws.title}</span>
                        <span className="text-[10px] text-white/50 truncate">{ws.subtitle}</span>
                      </div>
                      {selected && <Check className="w-4 h-4 text-joppli-green shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <div className="flex-1 overflow-y-auto py-4 flex flex-col px-3 gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNav(item.id)}
                className={`flex items-center justify-between w-full px-3 py-2 rounded-lg transition-colors text-sm font-medium ${
                  isActive
                    ? "bg-joppli-blue text-white"
                    : "text-[#a2bfdb] hover:bg-white/10 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4" />
                  {item.label}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
};

// Add missing icons that were not imported at the top
function CheckCircle(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function Bell(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}
