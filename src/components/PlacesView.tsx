import React, { useState } from 'react';
import { MapPin, Info, Compass, ShieldAlert, Award } from 'lucide-react';

interface Place {
  id: string;
  name: string;
  type: 'depot' | 'drop_off' | 'charger' | 'odd_geofence';
  lat: number;
  lng: number;
  address: string;
  description: string;
  accessCode?: string;
  meta: string;
}

const SHIFT_PLACES: Place[] = [
  {
    id: 'PLC-01',
    name: 'Jöppli Munich-Zurich HQ & Depot',
    type: 'depot',
    lat: 47.3712,
    lng: 8.5185,
    address: 'Birmensdorferstrasse 180, 8003 Zürich',
    description: 'Primary charging depot, spare parts warehousing, hardware workshop, and local teleoperator control station.',
    accessCode: 'DE-8003-G2',
    meta: 'Contains 2 HighPower DC chargers, safety simulators'
  },
  {
    id: 'PLC-02',
    name: 'ERZ Stadt Zürich Drop-Off Center Schmiede',
    type: 'drop_off',
    lat: 47.3705,
    lng: 8.5170,
    address: 'Schmiede Wiedikon Recycler Hub, 8003 Zürich',
    description: 'Bulk transfer drop-off center managed by Stadt Zürich ERZ. Features sorting stations, cardboard compactors.',
    accessCode: 'ERZ-HUB-SWM1',
    meta: 'PET, glass, and electronic waste collection silos'
  },
  {
    id: 'PLC-03',
    name: 'Wiedikon Central Street Chargers',
    type: 'charger',
    lat: 47.3728,
    lng: 8.5154,
    address: 'Kalkbreitestrasse 10, 8003 Zürich',
    description: 'Public secondary AC destination charger points. Safe authorized docking protocols for autonomous recycling Jöpplis.',
    accessCode: 'EV-ZRH-KB9',
    meta: '11 kW AC charging hookups'
  },
  {
    id: 'PLC-04',
    name: 'Alt-Wiedikon ODD Operational Boundary Geofence',
    type: 'odd_geofence',
    lat: 47.3710,
    lng: 8.5140,
    address: 'Geofenced district range (Alt-Wiedikon)',
    description: 'Authorized Operating Design Domain (ODD). Includes limits: maximal 30 km/h zones, paved municipal pathways only.',
    meta: 'Area: 1.4 sq km, maximum safe speed override: 18 km/h'
  }
];

export const PlacesView: React.FC = () => {
  const [selectedPlace, setSelectedPlace] = useState<Place>(SHIFT_PLACES[0]);

  return (
    <div className="flex-1 overflow-hidden font-sans flex text-joppli-dark bg-joppli-light">
      
      {/* Places List (Left section) */}
      <div className="w-96 border-r border-joppli-grey bg-white flex flex-col shrink-0">
        <div className="p-4 border-b border-joppli-grey flex items-center gap-2.5">
          <Compass className="w-6 h-6 text-joppli-blue" />
          <div>
            <h1 className="text-base font-black uppercase tracking-wider text-joppli-dark">Places & Geofences</h1>
            <span className="text-[10px] text-joppli-dark/50 uppercase tracking-widest font-extrabold">Asset Operational Boundaries</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-joppli-grey">
          {SHIFT_PLACES.map(place => {
            const isSelected = selectedPlace.id === place.id;
            return (
              <button
                key={place.id}
                onClick={() => setSelectedPlace(place)}
                className={`w-full text-left p-4 hover:bg-joppli-light/40 transition-colors flex items-start gap-3.5 ${
                  isSelected ? 'bg-joppli-light/70 border-r-4 border-r-joppli-blue' : ''
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  place.type === 'depot' ? 'bg-joppli-dark text-white' :
                  place.type === 'drop_off' ? 'bg-joppli-green text-white' :
                  place.type === 'charger' ? 'bg-joppli-blue text-white' :
                  'bg-joppli-yellow text-joppli-dark'
                }`}>
                  <MapPin className="w-4 h-4" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-mono font-bold text-joppli-dark/40 uppercase">{place.id}</span>
                    <span className="text-[8px] font-black uppercase tracking-widest text-joppli-dark/50 font-mono">
                      {place.type.replace('_', ' ')}
                    </span>
                  </div>
                  <h3 className="text-xs font-black uppercase tracking-wide text-joppli-dark mt-0.5 truncate leading-tight">
                    {place.name}
                  </h3>
                  <p className="text-[11px] text-joppli-dark/60 mt-1 truncate font-medium">
                    {place.address}
                  </p>
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

          {/* ODD Geofence outline simulated as an SVG path inside */}
          <svg className="absolute inset-0 w-full h-full opacity-30 select-none pointer-events-none" viewBox="0 0 800 320">
            <polygon 
              points="150,80 350,50 620,130 580,260 280,290 120,220" 
              fill="#6DBA32" 
              fillOpacity="0.1" 
              stroke="#6DBA32" 
              strokeWidth="2" 
              strokeDasharray="4 4"
            />
            {/* Compass rose mock text */}
            <text x="30" y="40" fill="#ffffff" fillOpacity="0.3" fontSize="10" fontFamily="monospace">N 47° 22’</text>
            <text x="30" y="55" fill="#ffffff" fillOpacity="0.3" fontSize="10" fontFamily="monospace">E 8° 31’</text>
          </svg>

          {/* Place pins positioning based on relative coords */}
          {SHIFT_PLACES.map(place => {
            let top = '50%';
            let left = '50%';
            if (place.id === 'PLC-01') { top = '40%'; left = '45%'; }
            if (place.id === 'PLC-02') { top = '65%'; left = '55%'; }
            if (place.id === 'PLC-03') { top = '30%'; left = '65%'; }
            if (place.id === 'PLC-04') { top = '25%'; left = '25%'; }

            const isSelected = selectedPlace.id === place.id;
            return (
              <button
                key={place.id}
                onClick={() => setSelectedPlace(place)}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group transition-all"
                style={{ top, left }}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-transform ${
                  isSelected ? 'scale-125 ring-4 ring-joppli-blue' : 'group-hover:scale-110'
                } ${
                  place.type === 'depot' ? 'bg-joppli-dark text-white' :
                  place.type === 'drop_off' ? 'bg-joppli-green text-white' :
                  place.type === 'charger' ? 'bg-joppli-blue text-white' :
                  'bg-joppli-yellow text-joppli-dark'
                }`}>
                  <MapPin className="w-4.5 h-4.5" />
                </div>
                <span className="mt-1.5 px-2 py-0.5 rounded bg-black/80 font-mono text-[9px] text-white tracking-wider font-extrabold uppercase border border-white/10 shadow whitespace-nowrap">
                  {place.id}
                </span>
              </button>
            );
          })}

          <div className="absolute bottom-3 left-4 bg-black/60 backdrop-blur-md border border-white/15 px-3 py-1.5 rounded-lg text-[9px] font-mono text-white/70 uppercase font-black tracking-widest">
            Alt-Wiedikon ODD Telemetry Grid
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
                selectedPlace.type === 'charger' ? 'bg-joppli-blue/10 text-joppli-blue border-joppli-blue/20' :
                'bg-joppli-yellow/10 text-joppli-yellow border-joppli-yellow/20'
              }`}>
                {selectedPlace.type.replace('_', ' ')}
              </span>
            </div>

            <h2 className="text-xl font-extrabold text-joppli-dark uppercase tracking-wide mb-2">
              {selectedPlace.name}
            </h2>

            <p className="text-sm font-medium text-joppli-dark/70 mb-4 leading-relaxed">
              {selectedPlace.description}
            </p>

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

            <div className="text-[10px] font-bold uppercase tracking-wider text-joppli-dark/40 border-t border-joppli-grey pt-3/5 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-joppli-dark/30 shrink-0" />
              <span>Checked on May 23, 2026</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
