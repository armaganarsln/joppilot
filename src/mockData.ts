import { Location, CollectionRequest, Vehicle } from './types';

export const LOCATIONS: Record<string, Location> = {
  DEPOT: { id: 'l_depot', lat: 47.3712, lng: 8.5185, label: 'Alt-Wiedikon Depot' },
  A1: { id: 'l_a1', lat: 47.3725, lng: 8.5200, label: 'Birmensdorferstr. 140' },
  A2: { id: 'l_a2', lat: 47.3740, lng: 8.5220, label: 'Zweierstrasse 106' },
  A3: { id: 'l_a3', lat: 47.3705, lng: 8.5170, label: 'Schmiede Wiedikon' },
  A4: { id: 'l_a4', lat: 47.3685, lng: 8.5130, label: 'Goldbrunnenplatz' },
  A5: { id: 'l_a5', lat: 47.3728, lng: 8.5154, label: 'Kalkbreite' },
  A6: { id: 'l_a6', lat: 47.3660, lng: 8.4980, label: 'Triemli' },
};

export const INITIAL_VEHICLES: Vehicle[] = [
  {
    id: 'v1',
    name: 'JÖP-01',
    status: 'idle',
    battery: 100,
    capacity: 0,
    location: { ...LOCATIONS.DEPOT, lat: LOCATIONS.DEPOT.lat + 0.0002, lng: LOCATIONS.DEPOT.lng + 0.0002 },
    route: [],
  },
  {
    id: 'v2',
    name: 'JÖP-02',
    status: 'idle',
    battery: 82,
    capacity: 45,
    location: { ...LOCATIONS.DEPOT, lat: LOCATIONS.DEPOT.lat - 0.0002, lng: LOCATIONS.DEPOT.lng - 0.0002 },
    route: [],
  }
];

export const INITIAL_REQUESTS: CollectionRequest[] = [
  {
    id: 'req_1',
    address: 'Birmensdorferstrasse 140',
    material: 'PET',
    timeWindow: '14:00 - 15:00',
    location: LOCATIONS.A1
  },
  {
    id: 'req_2',
    address: 'Zweierstrasse 106',
    material: 'glass',
    timeWindow: '14:30 - 15:30',
    location: LOCATIONS.A2
  },
  {
    id: 'req_3',
    address: 'Schmiede Wiedikon',
    material: 'paper',
    timeWindow: '15:00 - 16:00',
    location: LOCATIONS.A3
  },
  {
    id: 'req_4',
    address: 'Goldbrunnenplatz',
    material: 'e-waste',
    timeWindow: '16:00 - 17:00',
    location: LOCATIONS.A4
  }
];

// GLARUS CITY WORKSPACE LOCATIONS & TELEMETRY MOCK DATA
export const GLARUS_LOCATIONS: Record<string, Location> = {
  DEPOT: { id: 'gl_depot', lat: 47.0406, lng: 9.0682, label: 'Glarus Depot' },
  A1: { id: 'gl_a1', lat: 47.0425, lng: 9.0700, label: 'Hauptstrasse 12' },
  A2: { id: 'gl_a2', lat: 47.0440, lng: 9.0720, label: 'Burgstrasse 8' },
  A3: { id: 'gl_a3', lat: 47.0405, lng: 9.0670, label: 'Landsgemeindeplatz' },
  A4: { id: 'gl_a4', lat: 47.0385, lng: 9.0630, label: 'Zaunplatz' },
  A5: { id: 'gl_a5', lat: 47.0428, lng: 9.0654, label: 'Ennenda Depot' },
  A6: { id: 'gl_a6', lat: 47.0360, lng: 9.0480, label: 'Riedern' },
};

export const GLARUS_VEHICLES: Vehicle[] = [
  {
    id: 'v1',
    name: 'GL-01',
    status: 'idle',
    battery: 100,
    capacity: 0,
    location: { ...GLARUS_LOCATIONS.DEPOT, lat: GLARUS_LOCATIONS.DEPOT.lat + 0.0002, lng: GLARUS_LOCATIONS.DEPOT.lng + 0.0002 },
    route: [],
  },
  {
    id: 'v2',
    name: 'GL-02',
    status: 'idle',
    battery: 82,
    capacity: 45,
    location: { ...GLARUS_LOCATIONS.DEPOT, lat: GLARUS_LOCATIONS.DEPOT.lat - 0.0002, lng: GLARUS_LOCATIONS.DEPOT.lng - 0.0002 },
    route: [],
  }
];

export const GLARUS_REQUESTS: CollectionRequest[] = [
  {
    id: 'req_1',
    address: 'Hauptstrasse 12',
    material: 'PET',
    timeWindow: '14:00 - 15:00',
    location: GLARUS_LOCATIONS.A1
  },
  {
    id: 'req_2',
    address: 'Burgstrasse 8',
    material: 'glass',
    timeWindow: '14:30 - 15:30',
    location: GLARUS_LOCATIONS.A2
  },
  {
    id: 'req_3',
    address: 'Landsgemeindeplatz',
    material: 'paper',
    timeWindow: '15:00 - 16:00',
    location: GLARUS_LOCATIONS.A3
  },
  {
    id: 'req_4',
    address: 'Zaunplatz',
    material: 'e-waste',
    timeWindow: '16:00 - 17:00',
    location: GLARUS_LOCATIONS.A4
  }
];
