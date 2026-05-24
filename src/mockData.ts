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
