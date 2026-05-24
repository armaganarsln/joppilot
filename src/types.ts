export type VehicleStatus = 'idle' | 'on_route' | 'charging' | 'alert';

export interface Location {
  id: string;
  lat: number;
  lng: number;
  label: string;
}

export interface Vehicle {
  id: string;
  name: string;
  status: VehicleStatus;
  battery: number;
  capacity: number;
  location: Location;
  route: Location[];
  isTestVehicleActive?: boolean;
  avState?: string;
  heading?: number;
}

export type MaterialType = 'PET' | 'glass' | 'paper' | 'aluminium' | 'e-waste' | 'textiles';

export interface CollectionRequest {
  id: string;
  address: string;
  material: MaterialType;
  timeWindow: string;
  location: Location;
}

export type AlertType = 'warning' | 'error' | 'info';

export interface Alert {
  id: string;
  message: string;
  type: AlertType;
  timestamp: Date;
  read: boolean;
}
