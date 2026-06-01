import { describe, it, expect } from 'vitest';
import {
  stepDrive, isLockStale,
  STEER_STEP, STEER_MAX, THROTTLE_STEP, THROTTLE_BRAKE_STEP, THROTTLE_COAST_STEP,
} from './driveModel';

describe('stepDrive — steering', () => {
  it('steers right toward the max and clamps', () => {
    let s = { steer: 0, throttle: 0 };
    s = stepDrive(s, { steerInput: 1, throttleInput: 0 });
    expect(s.steer).toBe(STEER_STEP);
    // Drive it past the limit; it must clamp at STEER_MAX.
    for (let i = 0; i < 50; i++) s = stepDrive(s, { steerInput: 1, throttleInput: 0 });
    expect(s.steer).toBe(STEER_MAX);
  });

  it('auto-centers when steering is released and snaps to 0', () => {
    let s = { steer: 9, throttle: 0 };
    s = stepDrive(s, { steerInput: 0, throttleInput: 0 });
    expect(s.steer).toBeLessThan(9);
    for (let i = 0; i < 10; i++) s = stepDrive(s, { steerInput: 0, throttleInput: 0 });
    expect(s.steer).toBe(0); // settles exactly at center, no oscillation
  });
});

describe('stepDrive — throttle', () => {
  it('accelerates, brakes harder than it accelerates, and coasts down', () => {
    let s = { steer: 0, throttle: 0 };
    s = stepDrive(s, { steerInput: 0, throttleInput: 1 });
    expect(s.throttle).toBe(THROTTLE_STEP);

    s = { steer: 0, throttle: 50 };
    s = stepDrive(s, { steerInput: 0, throttleInput: -1 });
    expect(s.throttle).toBe(50 - THROTTLE_BRAKE_STEP);

    s = { steer: 0, throttle: 50 };
    s = stepDrive(s, { steerInput: 0, throttleInput: 0 });
    expect(s.throttle).toBe(50 - THROTTLE_COAST_STEP);
  });

  it('never goes below 0 or above 100', () => {
    let s = { steer: 0, throttle: 1 };
    s = stepDrive(s, { steerInput: 0, throttleInput: -1 });
    expect(s.throttle).toBe(0);

    s = { steer: 0, throttle: 99 };
    for (let i = 0; i < 5; i++) s = stepDrive(s, { steerInput: 0, throttleInput: 1 });
    expect(s.throttle).toBe(100);
  });
});

describe('stepDrive — emergency stop', () => {
  it('forces both axes to zero regardless of input', () => {
    const s = stepDrive({ steer: 40, throttle: 80 }, { steerInput: 1, throttleInput: 1, estop: true });
    expect(s).toEqual({ steer: 0, throttle: 0 });
  });
});

describe('isLockStale', () => {
  it('treats a missing heartbeat as stale', () => {
    expect(isLockStale(undefined, 1000, 6000)).toBe(true);
  });
  it('is fresh within the timeout and stale beyond it', () => {
    expect(isLockStale(1000, 5000, 6000)).toBe(false); // 4s old < 6s
    expect(isLockStale(1000, 8000, 6000)).toBe(true);  // 7s old > 6s
  });
});
