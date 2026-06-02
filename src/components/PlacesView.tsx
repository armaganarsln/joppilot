import React, { useState, useEffect } from 'react';
import { MapPin, Info, Compass, Award, Clock, Recycle } from 'lucide-react';
import type { MaterialType, WorkspaceProject } from '../types';
import { PLACES_BY_PROJECT, type Place, type PlaceType } from '../config/places';

interface PlacesViewProps {
  project?: WorkspaceProject;
}

// Tailwind chip colors per material, aligned with the map markers in MapArea.
const MATERIAL_CHIP: Record<MaterialType, string> = {
  PET: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  glass: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  paper: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  aluminium: 'bg-zinc-500/10 text-zinc-600 border-zinc-500/20',
  'e-waste': 'bg-rose-500/10 text-rose-600 border-rose-500/20',
  textiles: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
};

const TYPE_LABEL: Record<PlaceType, string> = {
  depot: 'Depot',
  drop_off: 'Drop Off',
  collection_point: 'Sammelstelle',
  charger: 'Charger',
  odd_geofence: 'ODD Geofence',
};

// Plots a pin on the schematic map from its real lat/lng within the workspace's
// geographic bounds (north = top).
type Bounds = { latMin: number; latMax: number; lngMin: number; lngMax: number };
const pinPos = (p: Place, bounds: Bounds) => {
  const left = ((p.lng - bounds.lngMin) / (bounds.lngMax - bounds.lngMin)) * 100;
  const top = ((bounds.latMax - p.lat) / (bounds.latMax - bounds.latMin)) * 100;
  return { left: `${Math.min(94, Math.max(6, left))}%`, top: `${Math.min(92, Math.max(8, top))}%` };
};

const typeIconBg = (type: PlaceType) =>
  type === 'depot' ? 'bg-joppli-dark text-white' :
  type === 'drop_off' ? 'bg-joppli-green text-white' :
  type === 'collection_point' ? 'bg-emerald-600 text-white' :
  type === 'charger' ? 'bg-joppli-blue text-white' :
  'bg-joppli-yellow text-joppli-dark';

const MaterialChips: React.FC<{ materials: MaterialType[]; className?: string }> = ({ materials, className = '' }) => {
  if (materials.length === 0) return null;
  return (
    <div className={`flex flex-wrap gap-1 ${className}`}>
      {materials.map((m) => (
        <span key={m} className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${MATERIAL_CHIP[m]}`}>
          {m}
        </span>
      ))}
    </div>
  );
};

export const PlacesView: React.FC<PlacesViewProps> = ({ project = 'zurich' }) => {
  const config = PLACES_BY_PROJECT[project] ?? PLACES_BY_PROJECT.zurich;
  const { places, bounds, networkLabel, gridLabel } = config;
  const [selectedId, setSelectedId] = useState<string>(places[0].id);

  // When the workspace changes, reset the selection to that city's first place.
  useEffect(() => {
    setSelectedId(places[0].id);
  }, [project, places]);

  const selectedPlace = places.find(p => p.id === selectedId) ?? places[0];
  const setSelectedPlace = (p: Place) => setSelectedId(p.id);

  return (
    <div className="flex-1 overflow-hidden font-sans flex text-joppli-dark bg-joppli-light">

      {/* Places List (Left section) */}
      <div className="w-full max-w-xs sm:w-72 md:w-80 border-r border-joppli-grey bg-white flex flex-col shrink-0">
        <div className="p-4 border-b border-joppli-grey flex items-center gap-2.5">
          <Compass className="w-6 h-6 text-joppli-blue" />
          <div>
            <h1 className="text-base font-black uppercase tracking-wider text-joppli-dark">Places & Geofences</h1>
            <span className="text-[10px] text-joppli-dark/50 uppercase tracking-widest font-extrabold">{networkLabel}</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-joppli-grey">
          {places.map(place => {
            const isSelected = selectedPlace.id === place.id;
            return (
              <button
                key={place.id}
                onClick={() => setSelectedPlace(place)}
                aria-pressed={isSelected}
                className={`w-full text-left p-4 hover:bg-joppli-light/40 transition-colors flex items-start gap-3.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-joppli-blue focus-visible:ring-inset ${
                  isSelected ? 'bg-joppli-light/70 border-r-4 border-r-joppli-blue' : ''
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${typeIconBg(place.type)}`}>
                  {place.type === 'collection_point' ? <Recycle className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-mono font-bold text-joppli-dark/40 uppercase">{place.id}</span>
                    <span className="text-[8px] font-black uppercase tracking-widest text-joppli-dark/50 font-mono">
                      {TYPE_LABEL[place.type]}
                    </span>
                  </div>
                  <h3 className="text-xs font-black uppercase tracking-wide text-joppli-dark mt-0.5 truncate leading-tight">
                    {place.name}
                  </h3>
                  <p className="text-[11px] text-joppli-dark/60 mt-1 truncate font-medium">
                    {place.address}
                  </p>
                  <MaterialChips materials={place.materials} className="mt-2" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Map Simulation & Details (Right section) */}
      <div className="flex-1 flex flex-col p-6 overflow-y-auto">

        {/* Schematic Mock Radar Map */}
        <div className="w-full max-w-4xl h-80 bg-[#1e2029] border border-joppli-grey rounded-xl relative overflow-hidden flex items-center justify-center mb-6 shadow-inner">
          <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:16px_16px]"></div>

          {/* Circular radar rings */}
          <div className="absolute w-[400px] h-[400px] border border-white/[0.04] rounded-full flex items-center justify-center">
            <div className="w-[250px] h-[250px] border border-white/[0.04] rounded-full flex items-center justify-center">
              <div className="w-[120px] h-[120px] border border-white/[0.04] rounded-full"></div>
            </div>
          </div>

          {/* ODD Geofence outline */}
          <svg className="absolute inset-0 w-full h-full opacity-30 select-none pointer-events-none" viewBox="0 0 800 320">
            <polygon
              points="150,80 350,50 620,130 580,260 280,290 120,220"
              fill="#6DBA32"
              fillOpacity="0.1"
              stroke="#6DBA32"
              strokeWidth="2"
              strokeDasharray="4 4"
            />
            <text x="30" y="40" fill="#ffffff" fillOpacity="0.3" fontSize="10" fontFamily="monospace">N 47° 22’</text>
            <text x="30" y="55" fill="#ffffff" fillOpacity="0.3" fontSize="10" fontFamily="monospace">E 8° 31’</text>
          </svg>

          {/* Place pins positioned from real lat/lng */}
          {places.map(place => {
            const isSelected = selectedPlace.id === place.id;
            return (
              <button
                key={place.id}
                onClick={() => setSelectedPlace(place)}
                aria-label={place.name}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group transition-all focus:outline-none"
                style={pinPos(place, bounds)}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-transform ${
                  isSelected ? 'scale-125 ring-4 ring-joppli-blue' : 'group-hover:scale-110'
                } ${typeIconBg(place.type)}`}>
                  {place.type === 'collection_point' ? <Recycle className="w-4 h-4" /> : <MapPin className="w-4.5 h-4.5" />}
                </div>
                <span className="mt-1.5 px-2 py-0.5 rounded bg-black/80 font-mono text-[9px] text-white tracking-wider font-extrabold uppercase border border-white/10 shadow whitespace-nowrap">
                  {place.id}
                </span>
              </button>
            );
          })}

          <div className="absolute bottom-3 left-4 bg-black/60 backdrop-blur-md border border-white/15 px-3 py-1.5 rounded-lg text-[9px] font-mono text-white/70 uppercase font-black tracking-widest">
            {gridLabel}
          </div>
        </div>

        {/* Selected Place Details Block */}
        <div className="bg-white border border-joppli-grey rounded-xl shadow-sm p-6 max-w-4xl text-joppli-dark flex flex-col md:flex-row gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-mono font-bold text-joppli-dark/40 uppercase">{selectedPlace.id}</span>
              <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border ${
                selectedPlace.type === 'depot' ? 'bg-joppli-dark text-white border-joppli-dark/10' :
                selectedPlace.type === 'drop_off' ? 'bg-joppli-green/10 text-joppli-green border-joppli-green/20' :
                selectedPlace.type === 'collection_point' ? 'bg-emerald-600/10 text-emerald-700 border-emerald-600/20' :
                selectedPlace.type === 'charger' ? 'bg-joppli-blue/10 text-joppli-blue border-joppli-blue/20' :
                'bg-joppli-yellow/10 text-joppli-yellow border-joppli-yellow/20'
              }`}>
                {TYPE_LABEL[selectedPlace.type]}
              </span>
            </div>

            <h2 className="text-xl font-extrabold text-joppli-dark uppercase tracking-wide mb-2">
              {selectedPlace.name}
            </h2>

            <p className="text-sm font-medium text-joppli-dark/70 mb-4 leading-relaxed">
              {selectedPlace.description}
            </p>

            {selectedPlace.materials.length > 0 && (
              <div className="mb-4">
                <span className="block text-[10px] text-joppli-dark/40 uppercase tracking-widest font-black mb-1.5">Accepted Materials</span>
                <MaterialChips materials={selectedPlace.materials} />
              </div>
            )}

            <div className="space-y-2 border-t border-joppli-grey pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="block text-[10px] text-joppli-dark/40 uppercase tracking-widest font-black">Physical Address</span>
                  <span className="font-semibold">{selectedPlace.address}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-joppli-dark/40 uppercase tracking-widest font-black">GPS Coordinates</span>
                  <span className="font-mono font-bold">{selectedPlace.lat.toFixed(5)}° N, {selectedPlace.lng.toFixed(5)}° E</span>
                </div>
              </div>
            </div>
          </div>

          {/* Details Sidebar container within card */}
          <div className="w-full md:w-64 bg-joppli-light/40 border border-joppli-grey rounded-xl p-4 shrink-0 flex flex-col justify-between">
            <div>
              {selectedPlace.hours && (
                <>
                  <span className="block text-[10px] text-joppli-dark/40 uppercase tracking-widest font-black mb-1.5">Opening Hours</span>
                  <div className="text-xs font-semibold text-joppli-dark flex items-center gap-1.5 mb-4">
                    <Clock className="w-4 h-4 text-joppli-green" />
                    <span>{selectedPlace.hours}</span>
                  </div>
                </>
              )}

              <span className="block text-[10px] text-joppli-dark/40 uppercase tracking-widest font-black mb-1.5">Access Scope</span>
              <div className="text-xs font-semibold text-joppli-dark flex items-center gap-1.5 mb-4">
                <Award className="w-4 h-4 text-joppli-blue" />
                <span>{selectedPlace.accessCode || 'No Gate Lock Required'}</span>
              </div>

              <span className="block text-[10px] text-joppli-dark/40 uppercase tracking-widest font-black mb-1">Station Notes</span>
              <p className="text-xs text-joppli-dark/65 font-medium italic mb-4">
                "{selectedPlace.meta}"
              </p>
            </div>

            <div className="text-[10px] font-bold uppercase tracking-wider text-joppli-dark/40 border-t border-joppli-grey pt-3 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-joppli-dark/30 shrink-0" />
              <span>Source: ERZ / recycling-map.ch · coords approx.</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
