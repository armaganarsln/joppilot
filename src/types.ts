export type VehicleStatus = 'idle' | 'on_route' | 'charging' | 'alert';

// ---- Operator / workspace access model ----
export type OperatorRole = 'admin' | 'operator';
export type OperatorStatus = 'pending' | 'approved' | 'rejected';
export type WorkspaceProject = 'zurich' | 'glarus';

export interface OperatorProfile {
  uid: string;
  email: string | null;
  role: OperatorRole;
  status: OperatorStatus;
  project: WorkspaceProject;
  createdAt?: string;
}

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
