// Pure control-integration math for teleoperation driving, extracted from
// TeleoperationView so the safety-critical behaviour can be unit-tested without
// React/DOM. One call advances steering & throttle by a single control tick.

export const STEER_MIN = -45;
export const STEER_MAX = 45;
export const STEER_STEP = 3;            // deg per tick while a steer key is held
export const STEER_CENTER_STEP = 4;     // deg per tick auto-centering on release
export const THROTTLE_STEP = 4;         // % per tick while accelerating
export const THROTTLE_BRAKE_STEP = 8;   // % per tick while braking
export const THROTTLE_COAST_STEP = 2;   // % per tick decay when no input

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export interface DriveState {
  steer: number;    // degrees, [-45, 45]
  throttle: number; // percent, [0, 100]
}

export interface DriveInput {
  steerInput: number;    // -1 left, 0 none, +1 right (or analog stick in [-1,1])
  throttleInput: number; // -1 brake, 0 none, +1 accelerate
  estop?: boolean;       // when true, both axes are forced to 0
}

/**
 * Advance the drive state by one control tick. Steering moves toward the input
 * and auto-centers when released; throttle accelerates, brakes, or coasts down.
 * Under e-stop, everything is forced to zero.
 */
export function stepDrive(state: DriveState, input: DriveInput): DriveState {
  if (input.estop) {
    return { steer: 0, throttle: 0 };
  }

  // Steering
  let steer = state.steer;
  if (input.steerInput !== 0) {
    steer = clamp(steer + Math.sign(input.steerInput) * STEER_STEP, STEER_MIN, STEER_MAX);
  } else if (steer !== 0) {
    const dir = steer > 0 ? -1 : 1;
    const next = steer + dir * STEER_CENTER_STEP;
    // Snap to 0 once we cross center, so it doesn't oscillate.
    steer = (steer > 0) === (next > 0) ? next : 0;
  }

  // Throttle
  let throttle = state.throttle;
  if (input.throttleInput > 0) {
    throttle = clamp(throttle + THROTTLE_STEP, 0, 100);
  } else if (input.throttleInput < 0) {
    throttle = clamp(throttle - THROTTLE_BRAKE_STEP, 0, 100);
  } else if (throttle > 0) {
    throttle = clamp(throttle - THROTTLE_COAST_STEP, 0, 100);
  }

  return { steer, throttle };
}

/** Whether a control lock is stale (abandoned) given the current time. */
export function isLockStale(heartbeat: number | undefined, now: number, timeoutMs: number): boolean {
  if (heartbeat === undefined) return true;
  return now - heartbeat > timeoutMs;
}
