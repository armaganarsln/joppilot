// Plan v2 vehicle state model: Connectivity, Health and Operational Mode are
// three orthogonal dimensions (plus a latched SAFE_STOPPED flag), derived here
// from the telemetry fields the prototype already tracks so every view renders
// the same state matrix. Pure functions, unit-tested without React.

import type { Vehicle, VehicleStateV2, ManeuverKind } from '../types';

export function deriveVehicleState(v: Vehicle): VehicleStateV2 {
  // Connectivity: a live test-vehicle link is ONLINE; the simulated fleet runs
  // on the local tick (no uplink hardware), which we surface as DEGRADED so the
  // dashboard honestly distinguishes real telemetry from simulation.
  const connectivity = v.isTestVehicleActive ? 'ONLINE' : 'DEGRADED';

  // SAFE_STOPPED latches whenever the vehicle has tripped its minimal-risk
  // maneuver; it only clears through maintenance, not by the link recovering.
  const safeStopped = v.avState === 'MRM';

  const health = safeStopped || v.status === 'alert'
    ? 'ERROR'
    : v.battery <= 20
      ? 'DEGRADED'
      : 'OK';

  let opMode: VehicleStateV2['opMode'];
  if (safeStopped) opMode = 'SAFE_STOP';
  else if (v.avState === 'MANUAL') opMode = 'REMOTE_DRIVE';
  else if (v.avState === 'ASSISTANCE_REQUESTED') opMode = 'SUPERVISED_ASSIST';
  else if (v.status === 'charging') opMode = 'CHARGING';
  else if (v.status === 'on_route' || v.avState === 'AUTONOMOUS') opMode = 'MISSION_AUTONOMOUS';
  else if (v.status === 'alert') opMode = 'MAINTENANCE';
  else opMode = 'IDLE';

  return { connectivity, health, opMode, safeStopped };
}

// Maneuver catalog for Mode 1 supervision. The vehicle proposes one of these;
// the operator confirms or rejects it from the control center.
export const MANEUVER_CATALOG: Record<ManeuverKind, string> = {
  overtake_parked: 'Overtake parked delivery van',
  unprotected_turn: 'Unprotected left turn across tram lane',
  construction_pass: 'Pass through signed construction zone',
  reverse_dock: 'Reverse into collection bay',
};
