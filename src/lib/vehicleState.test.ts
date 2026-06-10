import { describe, it, expect } from 'vitest';
import { deriveVehicleState } from './vehicleState';
import type { Vehicle } from '../types';

const base: Vehicle = {
  id: 'v1',
  name: 'JÖP-01',
  status: 'idle',
  battery: 80,
  capacity: 40,
  location: { id: 'l', lat: 47.37, lng: 8.51, label: 'Depot' },
  route: [],
};

describe('deriveVehicleState', () => {
  it('marks a live test-vehicle link ONLINE and simulation DEGRADED', () => {
    expect(deriveVehicleState({ ...base, isTestVehicleActive: true }).connectivity).toBe('ONLINE');
    expect(deriveVehicleState(base).connectivity).toBe('DEGRADED');
  });

  it('latches SAFE_STOPPED on MRM and reports SAFE_STOP mode with ERROR health', () => {
    const s = deriveVehicleState({ ...base, avState: 'MRM', battery: 90 });
    expect(s.safeStopped).toBe(true);
    expect(s.opMode).toBe('SAFE_STOP');
    expect(s.health).toBe('ERROR');
  });

  it('maps manual teleop to REMOTE_DRIVE and assistance to SUPERVISED_ASSIST', () => {
    expect(deriveVehicleState({ ...base, avState: 'MANUAL' }).opMode).toBe('REMOTE_DRIVE');
    expect(deriveVehicleState({ ...base, avState: 'ASSISTANCE_REQUESTED' }).opMode).toBe('SUPERVISED_ASSIST');
  });

  it('degrades health on low battery without changing mode', () => {
    const s = deriveVehicleState({ ...base, battery: 15, status: 'on_route' });
    expect(s.health).toBe('DEGRADED');
    expect(s.opMode).toBe('MISSION_AUTONOMOUS');
  });

  it('maps charging and idle statuses to their modes', () => {
    expect(deriveVehicleState({ ...base, status: 'charging' }).opMode).toBe('CHARGING');
    expect(deriveVehicleState(base).opMode).toBe('IDLE');
  });
});
