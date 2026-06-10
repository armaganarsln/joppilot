export type VehicleStatus = 'idle' | 'on_route' | 'charging' | 'alert';

// ---- Plan v2 vehicle state model: three orthogonal dimensions ----
// (Connectivity / Health / Operational Mode, with SAFE_STOPPED as a latched
// health flag.) Derived from live telemetry in lib/vehicleState.ts.
export type ConnectivityState = 'OFFLINE' | 'DEGRADED' | 'ONLINE';
export type HealthState = 'OK' | 'DEGRADED' | 'ERROR';
export type OperationalMode =
  | 'IDLE'
  | 'MISSION_AUTONOMOUS'
  | 'SUPERVISED_ASSIST'
  | 'REMOTE_DRIVE'
  | 'CHARGING'
  | 'MAINTENANCE'
  | 'SAFE_STOP';

export interface VehicleStateV2 {
  connectivity: ConnectivityState;
  health: HealthState;
  opMode: OperationalMode;
  safeStopped: boolean;
}

// ---- Mode 1 supervision: maneuver proposed by the vehicle, confirmed or
// rejected by the remote operator (OAD-compliant public-road model). ----
export type ManeuverKind =
  | 'overtake_parked'
  | 'unprotected_turn'
  | 'construction_pass'
  | 'reverse_dock';

export interface ManeuverProposal {
  id: string;
  kind: ManeuverKind;
  label: string;
  proposedAt: number;
  status: 'pending' | 'confirmed' | 'rejected';
  decidedBy?: string;
  decidedAt?: number;
}

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
