import type { MaterialType, WorkspaceProject } from '../types';

// Recycling collection points per workspace. Zürich entries are modeled on the
// public Swiss Recycling Map (recycling-map.ch) and ERZ Wertstoff-Sammelstellen
// for Alt-Wiedikon / Kreis 3; Glarus entries on the Glarus municipal collection
// network. Place names are real; GPS coordinates are approximate operational
// reference points (the live recycling-map.ch data is client-rendered and not
// fetchable server-side), not survey-grade fixes.

export type PlaceType = 'depot' | 'drop_off' | 'collection_point' | 'charger' | 'odd_geofence';

export interface Place {
  id: string;
  name: string;
  type: PlaceType;
  lat: number;
  lng: number;
  address: string;
  description: string;
  materials: MaterialType[];
  hours?: string;
  accessCode?: string;
  meta: string;
}

export interface PlacesConfig {
  /** Heading subtitle shown above the list. */
  networkLabel: string;
  /** Label in the schematic map's bottom-left chip. */
  gridLabel: string;
  /** Geographic bounds used to plot pins on the schematic map (north = top). */
  bounds: { latMin: number; latMax: number; lngMin: number; lngMax: number };
  places: Place[];
}

const ZURICH_PLACES: Place[] = [
  {
    id: 'PLC-01',
    name: 'Jöppli Wiedikon HQ & Depot',
    type: 'depot',
    lat: 47.3712,
    lng: 8.5185,
    address: 'Birmensdorferstrasse 180, 8003 Zürich',
    description: 'Primary charging depot, spare-parts warehousing, hardware workshop, and local teleoperator control station.',
    materials: ['PET', 'glass', 'paper', 'aluminium', 'e-waste', 'textiles'],
    hours: '24/7 (staffed Mon–Sat 06:00–22:00)',
    accessCode: 'DE-8003-G2',
    meta: 'Contains 2 HighPower DC chargers and safety simulators',
  },
  {
    id: 'PLC-02',
    name: 'ERZ Sammelstelle Schmiede Wiedikon',
    type: 'drop_off',
    lat: 47.3705,
    lng: 8.5170,
    address: 'Schmiede Wiedikon, 8003 Zürich',
    description: 'ERZ-managed bulk transfer drop-off with sorting stations and cardboard compactors. Primary hand-off point for full Jöppli loads.',
    materials: ['PET', 'glass', 'paper', 'aluminium', 'e-waste'],
    hours: 'Mon–Sat 07:00–20:00',
    accessCode: 'ERZ-HUB-SWM1',
    meta: 'PET, glass and electronic-waste collection silos',
  },
  {
    id: 'PLC-03',
    name: 'Goldbrunnenplatz Wertstoff-Sammelstelle',
    type: 'collection_point',
    lat: 47.3686,
    lng: 8.5118,
    address: 'Goldbrunnenplatz, 8055 Zürich',
    description: 'Public ERZ neighbourhood collection point. Unstaffed kerbside containers for household recyclables.',
    materials: ['glass', 'aluminium', 'textiles'],
    hours: 'Mon–Sat 07:00–20:00',
    meta: 'Glass (clear/green/brown), tin & aluminium, textiles bank',
  },
  {
    id: 'PLC-04',
    name: 'Idaplatz Quartier Collection Point',
    type: 'collection_point',
    lat: 47.3672,
    lng: 8.5145,
    address: 'Idaplatz, 8003 Zürich',
    description: 'Square-side neighbourhood Sammelstelle serving the lower Wiedikon residential blocks.',
    materials: ['glass', 'aluminium', 'PET'],
    hours: 'Mon–Sat 07:00–20:00',
    meta: 'Glass and metal banks; seasonal textiles container',
  },
  {
    id: 'PLC-05',
    name: 'Lochergut Recycling Bank',
    type: 'collection_point',
    lat: 47.3745,
    lng: 8.5165,
    address: 'Badenerstrasse 230 (Lochergut), 8004 Zürich',
    description: 'High-density estate collection bank on the northern ODD edge. High PET throughput from surrounding towers.',
    materials: ['PET', 'glass', 'paper', 'aluminium'],
    hours: 'Mon–Sat 07:00–20:00',
    meta: 'High-volume PET and paper; underground glass containers',
  },
  {
    id: 'PLC-06',
    name: 'Kalkbreite Central Street Chargers',
    type: 'charger',
    lat: 47.3728,
    lng: 8.5154,
    address: 'Kalkbreitestrasse 10, 8003 Zürich',
    description: 'Public secondary AC destination charging points with authorized docking protocols for autonomous Jöpplis.',
    materials: [],
    hours: '24/7',
    accessCode: 'EV-ZRH-KB9',
    meta: '4 × 11 kW AC charging hookups',
  },
  {
    id: 'PLC-07',
    name: 'Alt-Wiedikon ODD Operational Boundary',
    type: 'odd_geofence',
    lat: 47.3700,
    lng: 8.5140,
    address: 'Geofenced district range (Alt-Wiedikon)',
    description: 'Authorized Operating Design Domain (ODD): maximum 30 km/h zones, paved municipal pathways only.',
    materials: [],
    meta: 'Area: 1.4 km², maximum safe speed override: 18 km/h',
  },
];

const GLARUS_PLACES: Place[] = [
  {
    id: 'GLP-01',
    name: 'Jöppli Glarus HQ & Depot',
    type: 'depot',
    lat: 47.0406,
    lng: 9.0682,
    address: 'Hauptstrasse, 8750 Glarus',
    description: 'Glarus charging depot, spare-parts store and teleoperator station for the cantonal fleet.',
    materials: ['PET', 'glass', 'paper', 'aluminium', 'e-waste', 'textiles'],
    hours: '24/7 (staffed Mon–Sat 07:00–19:00)',
    accessCode: 'DE-8750-G1',
    meta: 'Contains 2 HighPower DC chargers and safety simulators',
  },
  {
    id: 'GLP-02',
    name: 'Ennenda Wertstoff-Sammelstelle',
    type: 'drop_off',
    lat: 47.0428,
    lng: 9.0654,
    address: 'Ennenda Depot, 8755 Ennenda',
    description: 'Main municipal drop-off across the Linth for bulk recyclables and full-fleet hand-off.',
    materials: ['PET', 'glass', 'paper', 'aluminium', 'e-waste'],
    hours: 'Mon–Sat 08:00–18:00',
    accessCode: 'GL-HUB-ENN1',
    meta: 'PET, glass and electronic-waste collection silos',
  },
  {
    id: 'GLP-03',
    name: 'Landsgemeindeplatz Collection Point',
    type: 'collection_point',
    lat: 47.0405,
    lng: 9.0670,
    address: 'Landsgemeindeplatz, 8750 Glarus',
    description: 'Central square neighbourhood Sammelstelle serving the Glarus old town.',
    materials: ['glass', 'aluminium', 'textiles'],
    hours: 'Mon–Sat 08:00–18:00',
    meta: 'Glass (clear/green/brown), tin & aluminium, textiles bank',
  },
  {
    id: 'GLP-04',
    name: 'Zaunplatz Quartier Collection Point',
    type: 'collection_point',
    lat: 47.0385,
    lng: 9.0630,
    address: 'Zaunplatz, 8750 Glarus',
    description: 'Square-side collection bank serving the southern residential blocks of Glarus.',
    materials: ['glass', 'aluminium', 'PET'],
    hours: 'Mon–Sat 08:00–18:00',
    meta: 'Glass and metal banks; seasonal textiles container',
  },
  {
    id: 'GLP-05',
    name: 'Riedern Recycling Bank',
    type: 'collection_point',
    lat: 47.0360,
    lng: 9.0480,
    address: 'Riedern, 8755 Ennenda',
    description: 'Outlying recycling bank on the western edge of the operating domain.',
    materials: ['PET', 'glass', 'paper', 'aluminium'],
    hours: 'Mon–Sat 08:00–18:00',
    meta: 'PET and paper; underground glass containers',
  },
  {
    id: 'GLP-06',
    name: 'Glarus Bahnhof Street Chargers',
    type: 'charger',
    lat: 47.0440,
    lng: 9.0680,
    address: 'Bahnhofstrasse, 8750 Glarus',
    description: 'Public AC destination charging points near the station with authorized docking for autonomous Jöpplis.',
    materials: [],
    hours: '24/7',
    accessCode: 'EV-GL-BHF3',
    meta: '4 × 11 kW AC charging hookups',
  },
  {
    id: 'GLP-07',
    name: 'Glarus Town ODD Operational Boundary',
    type: 'odd_geofence',
    lat: 47.0406,
    lng: 9.0660,
    address: 'Geofenced district range (Glarus town)',
    description: 'Authorized Operating Design Domain (ODD): maximum 30 km/h zones, paved municipal pathways only.',
    materials: [],
    meta: 'Area: 1.1 km², maximum safe speed override: 18 km/h',
  },
];

export const PLACES_BY_PROJECT: Record<WorkspaceProject, PlacesConfig> = {
  zurich: {
    networkLabel: 'Wiedikon Recycling Network · ERZ / Recycling Map',
    gridLabel: 'Alt-Wiedikon ODD Telemetry Grid',
    bounds: { latMin: 47.365, latMax: 47.376, lngMin: 8.508, lngMax: 8.521 },
    places: ZURICH_PLACES,
  },
  glarus: {
    networkLabel: 'Glarus Recycling Network · Municipal Collection',
    gridLabel: 'Glarus Town ODD Telemetry Grid',
    bounds: { latMin: 47.034, latMax: 47.046, lngMin: 9.046, lngMax: 9.072 },
    places: GLARUS_PLACES,
  },
};
