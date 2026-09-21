// Headless race harness: drives one createCarPhysics instance on a stage with a fixed dt.
import { createTrack } from '../../src/track/track.js';
import { createCarPhysics } from '../../src/physics/car-physics.js';
import { BASE_PARAMS } from '../../src/physics/params.js';

/**
 * Runs a race until the car crosses finishX, the chassis hits the ground, or maxTime elapses.
 * driver(state, t) -> input ({ up, down, left, right, space }; `locked` defaults to false).
 * initialState: fields assigned onto the car state after creation (e.g. { infiniteTurbo: true }).
 * Returns { finished, finishTime, maxSpeed, crashed, samples } (one sample per step).
 */
export function runRace({ stage, params = BASE_PARAMS, driver, dt = 1 / 60, maxTime = 180, initialState = {} }) {
  const track = createTrack(stage);
  const car = createCarPhysics({ track, params });
  Object.assign(car.state, initialState);
  const samples = [];
  let t = 0;
  let maxSpeed = -Infinity;
  let crashed = false;
  while (t < maxTime) {
    const input = { locked: false, ...driver(car.state, t) };
    const events = car.step(dt, input);
    t += dt;
    const s = car.state;
    maxSpeed = Math.max(maxSpeed, s.speed);
    samples.push({ t, x: s.x, speed: s.speed, y: s.y, rot: s.rot, suspY: s.suspY, airborne: s.airborne });
    if (events.chassisContact) { crashed = true; break; }
    if (s.finished) break;
  }
  const finished = car.state.finished;
  return { finished, finishTime: finished ? t : null, maxSpeed, crashed, samples };
}
