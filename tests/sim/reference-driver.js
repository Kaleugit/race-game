// Reference input "acelerar + turbo, correções mínimas" (CA-004 / CA-009): the benchmark a skilled
// human reaches on a stage. Deterministic, no randomness. Reused by EP-005 stage tuning (CA-009).
// `up` and `space` always held (the natural human policy since EP-008-05: the tank recharges whenever
// the turbo is not burning, so holding Space is as good as any tapping pattern); in the air it
// corrects only when the attitude is more than 0.6 rad off the slope under the car.
export const REFERENCE_AIR_TOLERANCE = 0.6;

const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

// Returns a harness driver (state, t) -> input for a track built from the same stage.
export function createReferenceDriver(track) {
  return (s) => {
    const err = s.airborne ? wrap(s.rot - Math.atan(track.slopeAt(s.x))) : 0;
    return {
      up: true,
      space: true,
      left: err < -REFERENCE_AIR_TOLERANCE,
      right: err > REFERENCE_AIR_TOLERANCE,
    };
  };
}
