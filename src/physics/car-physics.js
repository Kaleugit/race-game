/**
 * @module physics/car-physics
 * @summary Per-instance car physics (turbo, speed, vertical/bounce, chassis contact, rotation,
 * suspension). No DOM, no three.js, no randomness. Math moved verbatim from the
 * pre-extraction src/main.js update* functions, in the same order.
 */

/**
 * Creates one car physics instance on a track.
 * `input` has the shape of main.js `keys` plus `locked` (countdown / crash settling).
 * Dev toggles `state.suspensionEnabled` / `state.infiniteTurbo` survive `reset()`.
 * @summary Build a car physics instance: `{ state, step(dt, input), reset() }`.
 * @param {{ track: { heightAt: Function, slopeAt: Function, finishX: number }, params: object }} options
 */
export function createCarPhysics({ track, params }) {
  const p = params;
  const state = {
    suspensionEnabled: true,
    infiniteTurbo: false,
  };

  function reset() {
    state.x = 0;
    state.speed = 0;
    state.y = 0;
    state.vy = 0;
    state.rot = 0;
    state.angVel = 0;
    state.airborne = false;
    state.airTime = 0;
    state.bounceLevel = 1;
    state.lean = 0;
    state.slopeRotVisual = 0;
    state.suspY = 0;
    state.suspVy = 0;
    state.prevTrackH = 0;
    state.fuel = 1.0;
    state.turboActive = false;
    // Latched on the first chassis-ground contact; suppresses further checks until reset().
    state.chassisLatched = false;
    state.finished = false;
  }

  function updateTurbo(dt, input) {
    if (input.locked) {
      state.turboActive = false;
      return;
    }
    if (state.infiniteTurbo) {
      state.fuel = 1;
      state.turboActive = input.space;
    } else if (input.space && state.fuel > 0) {
      state.turboActive = true;
      state.fuel = Math.max(0, state.fuel - p.TURBO_DEPLETE * dt);
    } else {
      state.turboActive = false;
      if (!input.space) state.fuel = Math.min(1, state.fuel + p.TURBO_RECHARGE * dt);
    }
  }

  function updateSpeed(dt, input) {
    let accel, maxSpeed;
    const inputLocked = input.locked;
    if (!inputLocked && input.up && state.turboActive) {
      accel = p.accelTurbo;
      maxSpeed = p.maxSpeedTurbo;
    } else if (!inputLocked && state.turboActive) {
      accel = p.accelTurboOnly;
      maxSpeed = p.maxSpeedTurboOnly;
    } else if (!inputLocked && input.up) {
      accel = p.accelNormal;
      maxSpeed = p.maxSpeedNormal;
    } else {
      accel = 0;
      maxSpeed = p.maxSpeedTurbo;
    }

    if (accel > 0 && state.speed < maxSpeed) state.speed += accel * dt;
    if (!inputLocked && input.down) {
      if (state.speed > 0) state.speed -= p.brake * dt;
      else state.speed -= p.reverseAccel * dt;
    }

    if (!state.airborne) {
      const slope = track.slopeAt(state.x);
      const slopeAngle = Math.atan(slope);
      state.speed -= p.GRAVITY * 0.8 * Math.sin(slopeAngle) * dt;
    }

    state.speed -= Math.sign(state.speed) * p.drag * dt;

    if (accel > 0 && state.speed > maxSpeed) {
      state.speed = Math.max(maxSpeed, state.speed - (state.speed - maxSpeed) * 2.5 * dt);
    }
    const speedCap = p.maxSpeedTurbo * 1.6;
    state.speed = Math.max(-p.maxReverse, Math.min(speedCap, state.speed));
  }

  function computeAvg(x) {
    return (track.heightAt(x + 1) + track.heightAt(x - 1)) / 2;
  }

  // Returns { landed, chassisContact } for this frame.
  function updatePhysics(dt) {
    let landed = false;
    const prevX = state.x;
    state.x += state.speed * dt;

    const avg = computeAvg(state.x);
    const avgPrev = computeAvg(prevX);
    const groundVy = dt > 0 ? (avg - avgPrev) / dt : 0;

    const leanLift = Math.abs(Math.sin(state.lean)) + 0.5 * Math.cos(state.lean) - 0.5;
    const groundLevel = avg + leanLift;

    state.vy -= p.GRAVITY * dt;
    state.y += state.vy * dt;

    if (state.y <= groundLevel) {
      const wasAirborne = state.airborne;
      const ballVy = state.vy;
      const airTime = state.airTime;
      landed = wasAirborne;
      state.y = groundLevel;
      state.vy = groundVy;
      state.airborne = false;
      state.airTime = 0;
      if (!wasAirborne) state.bounceLevel = 1;
      if (wasAirborne && ballVy < groundVy) {
        const impactSpeed = groundVy - ballVy;
        const intensity = state.bounceLevel;
        let r = state.rot;
        r = ((r + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
        state.suspVy -= (3 + impactSpeed * 0.4) * intensity;
        if (airTime >= p.BOUNCE_MIN_AIRTIME && intensity > 0.05) {
          const t = Math.min(airTime, p.BOUNCE_AIRTIME_CAP);
          const bounceFactor = (0.2 + t * 0.3) * intensity * p.BOUNCE_CHASSIS_SCALE;
          state.vy = groundVy + impactSpeed * bounceFactor;
          state.airborne = true;
          state.bounceLevel *= p.BOUNCE_DECAY;
          state.angVel = 0;
        } else {
          state.rot = r;
          state.bounceLevel = 1;
          state.angVel = 0;
        }
      }
    } else {
      state.airborne = true;
      state.airTime += dt;
    }

    const chassisContact = checkChassisHitbox();
    if (chassisContact) state.chassisLatched = true;
    return { landed, chassisContact };
  }

  // Reads rot after this frame's landing wrap and suspY from the previous frame (as before).
  function checkChassisHitbox() {
    if (state.chassisLatched) return false;
    const cosA = Math.cos(state.rot);
    const sinA = Math.sin(state.rot);
    const wheelLift = Math.max(0, cosA) * 0.5 * (1 - cosA);
    const cy = state.y + p.CAR_HALF_HEIGHT + wheelLift;
    const yOff = state.suspY;
    for (const [lx, ly] of p.CHASSIS_HITBOX) {
      const ay = ly + yOff;
      const wx = cosA * lx - sinA * ay;
      const wy = cy + sinA * lx + cosA * ay;
      const gh = track.heightAt(state.x + wx);
      if (wy <= gh) return true;
    }
    return false;
  }

  function updateRotation(dt, input, inputLocked) {
    if (state.airborne) {
      if (!inputLocked && input.left) state.angVel += p.AIR_TORQUE * dt;
      if (!inputLocked && input.right) state.angVel -= p.AIR_TORQUE * dt;
      state.angVel *= 0.992;
      state.rot += state.angVel * dt;
    } else if (inputLocked) {
      state.angVel *= Math.max(0, 1 - 4 * dt);
      if (Math.abs(state.angVel) < 0.05) state.angVel = 0;
      state.rot += state.angVel * dt;
    } else {
      let leanInput = 0;
      if (input.left && input.up) {
        const forwardSpeed = Math.max(0, state.speed);
        const factor = 1 - Math.min(1, forwardSpeed / p.maxSpeedNormal);
        leanInput = p.GROUND_LEAN * factor;
      }
      if (input.right && input.down) {
        const reverseSpeed = Math.max(0, -state.speed);
        const factor = 1 - Math.min(1, reverseSpeed / p.maxReverse);
        leanInput = -p.GROUND_LEAN * factor;
      }
      const k = Math.min(1, 12 * dt);
      state.lean += (leanInput - state.lean) * k;

      const slope = track.slopeAt(state.x);
      const slopeRot = Math.atan(slope);
      state.slopeRotVisual += (slopeRot - state.slopeRotVisual) * k;
      state.rot = state.slopeRotVisual + state.lean;
    }
  }

  function updateSuspension(dt) {
    if (!state.suspensionEnabled) {
      state.suspY = 0;
      state.suspVy = 0;
      state.prevTrackH = track.heightAt(state.x);
      return;
    }

    const tH = track.heightAt(state.x);

    if (state.airborne) {
      const decay = Math.max(0, 1 - 7 * dt);
      state.suspY *= decay;
      state.suspVy *= decay;
    } else {
      const groundDelta = tH - state.prevTrackH;
      state.suspY -= groundDelta;

      state.suspVy -= p.SUSP_K * state.suspY * dt;
      state.suspVy *= Math.max(0, 1 - p.SUSP_DAMP * dt);
      state.suspY += state.suspVy * dt;

      if (state.suspY > p.SUSP_MAX_EXTEND) {
        state.suspY = p.SUSP_MAX_EXTEND;
        if (state.suspVy > 0) state.suspVy = 0;
      }
      if (state.suspY < -p.SUSP_MAX_COMPRESS) {
        state.suspY = -p.SUSP_MAX_COMPRESS;
        if (state.suspVy < 0) state.suspVy = 0;
      }
    }

    state.prevTrackH = tH;
  }

  /**
   * Advances one frame. `finished` is informational only (never locks input).
   * @summary Step the car by `dt` seconds; returns `{ chassisContact, landed, righted }`.
   */
  function step(dt, input) {
    updateTurbo(dt, input);
    updateSpeed(dt, input);
    const { landed, chassisContact } = updatePhysics(dt);
    // Chassis contact locks input from this frame's rotation on (old triggerCrash set crashSettling mid-frame).
    updateRotation(dt, input, input.locked || chassisContact);
    updateSuspension(dt);
    if (state.x >= track.finishX) state.finished = true;
    return { chassisContact, landed, righted: false };
  }

  reset();
  return { state, step, reset };
}
