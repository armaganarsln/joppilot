import React from 'react';
import { Vehicle, CollectionRequest, OperatorProfile } from '../types';
import { MapContainer, TileLayer, Marker, Polyline, Tooltip, CircleMarker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Crosshair, Plus, Minus } from 'lucide-react';
import { LOCATIONS, GLARUS_LOCATIONS } from '../mockData';

interface MapAreaProps {
  vehicles: Vehicle[];
  selectedVehicleId: string | null;
  onSelectVehicle: (id: string) => void;
  requests?: CollectionRequest[];
  onAssignRequest?: (reqId: string, vehicleId: string) => void;
  currentUserProfile?: OperatorProfile | null;
}

// Custom icon using L.divIcon with rotating truck
const createVehicleIcon = (vehicle: Vehicle, isSelected: boolean) => {
  const bgColor = isSelected ? 'bg-joppli-blue text-white shadow-xl shadow-joppli-blue/20 scale-110 z-[1000]' : 'bg-white text-joppli-blue border-[3px] border-joppli-blue/30 shadow-md z-[500]';
  const alertBadge = vehicle.status === 'alert' ? '<span class="absolute -top-1.5 -right-1.5 w-4 h-4 bg-joppli-red rounded-full border-2 border-white animate-pulse shadow-md"></span>' : '';
  const nameBadgeClass = isSelected ? 'bg-joppli-dark text-white' : 'bg-white text-joppli-dark border border-joppli-grey';
  
  // Rotate truck to heading if set, default to 0
  const heading = vehicle.heading || 0;
  
  const html = `
    <div class="relative w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${bgColor}" style="margin-left: -24px; margin-top: -24px;">
      <div class="transition-transform duration-300 ease-out flex items-center justify-center" style="transform: rotate(${heading}deg);">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 17h4V5H2v12h3"/><path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5"/><path d="M14 17h1"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>
      </div>
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

// Custom trash bin icon with ping/radar effect
const createTrashBinIcon = (material: string) => {
  let color = 'bg-joppli-blue';
  if (material === 'PET') color = 'bg-amber-500';
  else if (material === 'glass') color = 'bg-emerald-500';
  else if (material === 'paper') color = 'bg-blue-500';
  else if (material === 'e-waste') color = 'bg-rose-500';
  else if (material === 'aluminium') color = 'bg-zinc-500';
  else if (material === 'textiles') color = 'bg-purple-500';

  const html = `
    <div class="relative w-8 h-8 rounded-full flex items-center justify-center border-2 border-white shadow-md text-white transition-all scale-100 hover:scale-110 hover:shadow-lg ${color}" style="margin-left: -16px; margin-top: -16px;">
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
      <span class="absolute -top-1 -right-1 flex h-2.5 w-2.5">
        <span class="animate-ping absolute inline-flex h-full w-full rounded-full ${color} opacity-75"></span>
        <span class="relative inline-flex rounded-full h-2.5 w-2.5 ${color}"></span>
      </span>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'bg-transparent border-0',
    iconSize: [0, 0],
    iconAnchor: [0, 0]
  });
};

// Recenters the map when the workspace changes (city switch).
const ChangeMapView: React.FC<{ center: [number, number] }> = ({ center }) => {
  const map = useMap();
  React.useEffect(() => {
    map.setView(center, 15);
  }, [center[0], center[1], map]);
  return null;
};

// Pans (and gently zooms) to follow the selected vehicle.
const FollowVehicle: React.FC<{ target: [number, number] | null }> = ({ target }) => {
  const map = useMap();
  React.useEffect(() => {
    if (target) {
      map.flyTo(target, Math.max(map.getZoom(), 16), { duration: 0.6 });
    }
  }, [target?.[0], target?.[1], map]);
  return null;
};

// Floating map controls: zoom in/out + recenter on the whole fleet.
const MapControls: React.FC<{ vehicles: Vehicle[]; fallback: [number, number] }> = ({ vehicles, fallback }) => {
  const map = useMap();

  const recenterFleet = () => {
    const pts = vehicles.map((v) => [v.location.lat, v.location.lng] as [number, number]);
    if (pts.length === 0) {
      map.flyTo(fallback, 15, { duration: 0.6 });
    } else if (pts.length === 1) {
      map.flyTo(pts[0], 15, { duration: 0.6 });
    } else {
      map.flyToBounds(L.latLngBounds(pts), { padding: [80, 80], maxZoom: 16, duration: 0.6 });
    }
  };

  const btn = 'w-9 h-9 bg-white hover:bg-joppli-light border border-joppli-grey rounded-lg shadow-md flex items-center justify-center text-joppli-dark transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-joppli-blue';

  return (
    <div className="absolute top-4 right-4 z-[500] flex flex-col gap-2">
      <button onClick={() => map.zoomIn()} className={btn} aria-label="Zoom in" title="Zoom in"><Plus className="w-4 h-4" /></button>
      <button onClick={() => map.zoomOut()} className={btn} aria-label="Zoom out" title="Zoom out"><Minus className="w-4 h-4" /></button>
      <button onClick={recenterFleet} className={btn} aria-label="Recenter on fleet" title="Recenter on fleet"><Crosshair className="w-4 h-4 text-joppli-blue" /></button>
    </div>
  );
};

export const MapArea: React.FC<MapAreaProps> = ({ 
  vehicles, 
  selectedVehicleId, 
  onSelectVehicle, 
  requests = [], 
  onAssignRequest,
  currentUserProfile
}) => {
  const isGlarus = currentUserProfile?.project === 'glarus';
  const centerLat = isGlarus ? 47.0406 : 47.3712;
  const centerLng = isGlarus ? 9.0682 : 8.5135;
  const activeLocations = isGlarus ? GLARUS_LOCATIONS : LOCATIONS;

  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId);
  const followTarget: [number, number] | null = selectedVehicle
    ? [selectedVehicle.location.lat, selectedVehicle.location.lng]
    : null;

  return (
    <div className="flex-1 relative overflow-hidden h-full z-0 bg-white">
      {/* Animated route style injected locally */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes routeFlow {
          from {
            stroke-dashoffset: 24;
          }
          to {
            stroke-dashoffset: 0;
          }
        }
        .animated-route-line {
          animation: routeFlow 1.2s linear infinite;
        }
      `}} />

      <MapContainer 
        center={[centerLat, centerLng]} 
        zoom={15} 
        style={{ height: '100%', width: '100%', zIndex: 1 }}
        zoomControl={false}
      >
        <ChangeMapView center={[centerLat, centerLng]} />
        <FollowVehicle target={followTarget} />
        <MapControls vehicles={vehicles} fallback={[centerLat, centerLng]} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />

        {/* Draw stationary locations (Depots, hubs) */}
        {Object.values(activeLocations).map((loc) => {
          // Skip drawing pickup locations that are already represented as trash marker requests
          const isRequestLocation = requests.some(r => r.location.id === loc.id);
          if (isRequestLocation) return null;

          return (
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
          );
        })}

        {/* Draw active trash request markers */}
        {requests.map((req) => {
          // Generate a stable visual fill percentage based on the request ID
          const fillPercentage = 75 + (parseInt(req.id.replace(/\D/g, '') || '0') % 21);

          return (
            <Marker
              key={req.id}
              position={[req.location.lat, req.location.lng]}
              icon={createTrashBinIcon(req.material)}
            >
              <Popup>
                <div className="p-2 min-w-[200px] font-sans">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[9px] font-black uppercase tracking-wider text-joppli-dark/60">{req.material} Request</span>
                    <span className="text-[10px] font-black bg-joppli-red/10 text-joppli-red px-1.5 py-0.5 rounded animate-pulse">{fillPercentage}% Full</span>
                  </div>
                  <h4 className="font-bold text-sm mb-0.5 leading-snug text-joppli-dark">{req.address}</h4>
                  <p className="text-[10px] text-joppli-dark/60 mb-3">Time Window: {req.timeWindow}</p>
                  
                  <div className="space-y-1.5">
                    {vehicles.map(v => (
                      <button
                        key={v.id}
                        onClick={() => {
                          if (onAssignRequest) {
                            onAssignRequest(req.id, v.id);
                          }
                        }}
                        className="w-full py-1.5 bg-joppli-dark hover:bg-joppli-blue text-white rounded text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-1"
                      >
                        Deploy {v.name}
                      </button>
                    ))}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

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
                weight: v.id === selectedVehicleId ? 5 : 3,
                dashArray: '8, 8',
                opacity: v.id === selectedVehicleId ? 0.9 : 0.5,
                className: 'animated-route-line'
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
