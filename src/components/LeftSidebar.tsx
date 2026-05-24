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

interface LeftSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  activeTab,
  onTabChange,
}) => {
  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "dispatch", label: "Map & Dispatch", icon: Map },
    { id: "vehicles", label: "Vehicles", icon: Truck, hasDropdown: true },
    {
      id: "inspections",
      label: "Inspections",
      icon: CheckCircle,
      hasDropdown: true,
    },
    { id: "issues", label: "Issues", icon: AlertTriangle, hasDropdown: true },
    { id: "reminders", label: "Reminders", icon: Bell, hasDropdown: true },
    { id: "service", label: "Service", icon: Wrench, hasDropdown: true },
    {
      id: "fuel",
      label: "Charging & Energy",
      icon: Droplets,
      hasDropdown: true,
    },
    { id: "users", label: "Contacts & Users", icon: Users, hasDropdown: true },
    {
      id: "inventory",
      label: "Parts & Inventory",
      icon: Package,
      hasDropdown: true,
    },
    { id: "places", label: "Places", icon: MapPin },
    { id: "reports", label: "Reports", icon: FileText },
  ];

  return (
    <div className="w-64 bg-joppli-dark text-white flex flex-col h-full shrink-0 font-sans">
      <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-joppli-blue flex items-center justify-center overflow-hidden">
            <span className="font-black text-white text-xs">ERZ</span>
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-sm">Jöppli x ERZ</span>
            <span className="text-xs text-white/50">Stadt Zürich</span>
          </div>
        </div>
        <ChevronDown className="w-4 h-4 text-white/50" />
      </div>

      <div className="flex-1 overflow-y-auto py-4 flex flex-col px-3 gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
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
              {item.hasDropdown && (
                <ChevronDown className="w-3.5 h-3.5 opacity-50" />
              )}
            </button>
          );
        })}
      </div>
    </div>
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
