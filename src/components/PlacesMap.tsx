import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polygon, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { Place, PlaceType } from '../config/places';

// Marker hex colors per place type (mirrors the Tailwind classes used elsewhere).
const TYPE_COLOR: Record<PlaceType, string> = {
  depot: '#2D2F3B',
  drop_off: '#6DBA32',
  collection_point: '#059669',
  charger: '#326CB8',
  odd_geofence: '#FFCB00',
};

// A small circular pin built with L.divIcon so it matches the app's visual style.
const placeIcon = (place: Place, isSelected: boolean) => {
  const color = TYPE_COLOR[place.type];
  const size = isSelected ? 34 : 26;
  const ring = isSelected ? 'box-shadow:0 0 0 4px rgba(50,108,184,0.35);' : '';
  return L.divIcon({
    className: 'bg-transparent border-0',
    html: `
      <div style="width:${size}px;height:${size}px;margin-left:-${size / 2}px;margin-top:-${size / 2}px;
                  background:${color};border:2px solid #fff;border-radius:9999px;${ring}
                  display:flex;align-items:center;justify-content:center;color:#fff;
                  font:700 9px/1 ui-sans-serif,system-ui;box-shadow:0 2px 6px rgba(0,0,0,0.3);">
        ${place.id.replace(/^.*-/, '')}
      </div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
};

// A helper component to handle Leaflet size invalidation when the container resizes
const ResizeMap: React.FC = () => {
  const map = useMap();

  React.useEffect(() => {
    const container = map.getContainer();
    if (!container) return;

    const resizeObserver = new ResizeObserver(() => {
      // Invalidate the map size so Leaflet recalculates layout and loads tiles
      map.invalidateSize();
    });

    resizeObserver.observe(container);

    // Initial invalidation after mounting to resolve any immediate layout/flex delays
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 100);

    return () => {
      resizeObserver.disconnect();
      clearTimeout(timer);
    };
  }, [map]);

  return null;
};

// Recenters/zooms the map to fit all places whenever the workspace changes.
const FitBounds: React.FC<{ places: Place[] }> = ({ places }) => {
  const map = useMap();
  React.useEffect(() => {
    if (places.length === 0) return;
    const pts = places.map((p) => [p.lat, p.lng] as [number, number]);
    map.flyToBounds(L.latLngBounds(pts), { padding: [50, 50], maxZoom: 16, duration: 0.5 });
  }, [places, map]);
  return null;
};

interface PlacesMapProps {
  places: Place[];
  selectedId: string;
  onSelect: (place: Place) => void;
}

export const PlacesMap: React.FC<PlacesMapProps> = ({ places, selectedId, onSelect }) => {
  const center: [number, number] = [places[0].lat, places[0].lng];
  const geofence = places.find((p) => p.type === 'odd_geofence');

  // A rough operational polygon around the collection points (visual ODD hint).
  const fencePts = places
    .filter((p) => p.type !== 'odd_geofence')
    .map((p) => [p.lat, p.lng] as [number, number]);

  return (
    <div className="w-full max-w-4xl h-80 rounded-xl overflow-hidden border border-joppli-grey mb-6 shadow-inner relative z-0">
      <MapContainer center={center} zoom={14} style={{ height: '100%', width: '100%' }} zoomControl={true}>
        <ResizeMap />
        <FitBounds places={places} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
        />

        {/* ODD operational boundary hint */}
        {geofence && fencePts.length >= 3 && (
          <Polygon
            positions={fencePts}
            pathOptions={{ color: '#6DBA32', weight: 2, dashArray: '6 6', fillOpacity: 0.06 }}
          />
        )}

        {places.map((place) => (
          <Marker
            key={place.id}
            position={[place.lat, place.lng]}
            icon={placeIcon(place, place.id === selectedId)}
            eventHandlers={{ click: () => onSelect(place) }}
          >
            <Popup>
              <div className="font-sans min-w-[160px]">
                <div className="text-[9px] font-black uppercase tracking-wider text-joppli-dark/50">{place.id}</div>
                <div className="font-bold text-sm text-joppli-dark leading-snug">{place.name}</div>
                <div className="text-[11px] text-joppli-dark/60 mt-0.5">{place.address}</div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};
