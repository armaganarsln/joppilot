import React from 'react';
import { Vehicle } from '../types';
import { MapContainer, TileLayer, Marker, Polyline, Tooltip, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import { LOCATIONS } from '../mockData';

interface MapAreaProps {
  vehicles: Vehicle[];
  selectedVehicleId: string | null;
  onSelectVehicle: (id: string) => void;
}

// Custom icon using L.divIcon
const createVehicleIcon = (vehicle: Vehicle, isSelected: boolean) => {
  const bgColor = isSelected ? 'bg-joppli-blue text-white shadow-xl shadow-joppli-blue/20 scale-110 z-[1000]' : 'bg-white text-joppli-blue border-[3px] border-joppli-blue/30 shadow-md z-[500]';
  const alertBadge = vehicle.status === 'alert' ? '<span class="absolute -top-1.5 -right-1.5 w-4 h-4 bg-joppli-red rounded-full border-2 border-white animate-pulse shadow-md"></span>' : '';
  const nameBadgeClass = isSelected ? 'bg-joppli-dark text-white' : 'bg-white text-joppli-dark border border-joppli-grey';
  
  const html = `
    <div class="relative w-12 h-12 rounded-2xl flex items-center justify-center transition-transform ${bgColor}" style="margin-left: -24px; margin-top: -24px;">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 17h4V5H2v12h3"/><path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5"/><path d="M14 17h1"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>
      ${alertBadge}
      <div class="absolute -bottom-8 whitespace-nowrap px-3 py-1 rounded-full text-[10px] uppercase font-black tracking-widest shadow-lg ${nameBadgeClass}">
        ${vehicle.name}
      </div>
    </div>
  `;
  
  return L.divIcon({
    html,
    className: 'bg-transparent border-0',
    iconSize: [0, 0],
    iconAnchor: [0, 0]
  });
};

export const MapArea: React.FC<MapAreaProps> = ({ vehicles, selectedVehicleId, onSelectVehicle }) => {
  const centerLat = 47.3712;
  const centerLng = 8.5135; // Alt-Wiedikon area

  return (
    <div className="flex-1 relative overflow-hidden h-full z-0 bg-white">
      <MapContainer 
        center={[centerLat, centerLng]} 
        zoom={15} 
        style={{ height: '100%', width: '100%', zIndex: 1 }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />

        {/* Draw stationary locations */}
        {Object.values(LOCATIONS).map((loc) => (
          <CircleMarker 
            key={loc.id} 
            center={[loc.lat, loc.lng]} 
            radius={6} 
            pathOptions={{ fillColor: '#326CB8', color: '#326CB8', weight: 2, fillOpacity: 0.3 }}
          >
            <Tooltip direction="top" offset={[0, -10]} opacity={1} permanent={false} className="font-bold text-joppli-dark border-none shadow-md rounded-xl">
              {loc.label}
            </Tooltip>
          </CircleMarker>
        ))}

        {/* Draw Routes */}
        {vehicles.map(v => {
          if (v.route.length === 0) return null;
          
          const positions: [number, number][] = [
            [v.location.lat, v.location.lng],
            ...v.route.map(p => [p.lat, p.lng] as [number, number])
          ];

          return (
            <Polyline 
              key={`route-${v.id}`}
              positions={positions}
              pathOptions={{ 
                color: v.id === selectedVehicleId ? '#326CB8' : '#749eca', 
                weight: v.id === selectedVehicleId ? 4 : 2,
                dashArray: '8, 8',
                opacity: v.id === selectedVehicleId ? 0.8 : 0.4
              }}
            />
          );
        })}

        {/* Vehicles */}
        {vehicles.map(v => (
          <Marker 
            key={v.id} 
            position={[v.location.lat, v.location.lng]}
            icon={createVehicleIcon(v, v.id === selectedVehicleId)}
            eventHandlers={{
              click: () => onSelectVehicle(v.id)
            }}
          />
        ))}
      </MapContainer>
    </div>
  );
};
