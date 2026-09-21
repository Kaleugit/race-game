// Pure track query built from stage data. No three.js, no DOM.
// Height math moved verbatim from the pre-migration src/main.js trackHeight.

export const SURFACE_TYPES = ['dirt', 'mud', 'sand'];
export const FEATURE_TYPES = ['bell', 'valley', 'plateau', 'wave', 'asym'];

function featureContribution(f, x) {
  const t = x - f.x;
  switch (f.type) {
    case 'bell': {
      if (Math.abs(t) >= f.w) return 0;
      const k = Math.cos(t * Math.PI / (2 * f.w));
      return f.h * k * k;
    }
    case 'valley': {
      if (Math.abs(t) >= f.w) return 0;
      const k = Math.cos(t * Math.PI / (2 * f.w));
      return -f.h * k * k;
    }
    case 'plateau': {
      const absT = Math.abs(t);
      if (absT >= f.w) return 0;
      const transition = f.w * 0.5;
      const flatLimit = f.w - transition;
      if (absT <= flatLimit) return f.h;
      const u = (f.w - absT) / transition;
      const smooth = u * u * (3 - 2 * u);
      return f.h * smooth;
    }
    case 'wave': {
      if (Math.abs(t) >= f.w) return 0;
      const env = Math.cos(t * Math.PI / (2 * f.w));
      const count = f.count || 3;
      return f.h * env * env * Math.sin(t * Math.PI * count / f.w);
    }
    case 'asym': {
      const leftFactor = f.leftFactor != null ? f.leftFactor : 0.4;
      if (t < 0) {
        const wL = f.w * leftFactor;
        if (t <= -wL) return 0;
        const k = Math.cos(t * Math.PI / (2 * wL));
        return f.h * k * k;
      } else {
        if (t >= f.w) return 0;
        const k = Math.cos(t * Math.PI / (2 * f.w));
        return f.h * k * k;
      }
    }
    default:
      return 0;
  }
}

function rampEase(u) {
  if (u <= 0) return 0;
  if (u >= 1) return 1;
  const a = 0.25;
  const slope = 1 / (1 - a);
  if (u < a) {
    const t = u / a;
    return slope * a * 0.5 * t * t;
  }
  if (u > 1 - a) {
    const t = (1 - u) / a;
    return 1 - slope * a * 0.5 * t * t;
  }
  return slope * a * 0.5 + slope * (u - a);
}

function baseElevation(slopes, x) {
  let h = 0;
  for (const s of slopes) {
    const t = (x - (s.x - s.w / 2)) / s.w;
    h += s.dh * rampEase(t);
  }
  return h;
}

/**
 * Builds the track query for a stage.
 * Surface zones are half-open [from, to); first matching zone wins.
 * @param {object} stage stage data (see src/stages/*.stage.js)
 */
export function createTrack(stage) {
  const { finishX, noise = [], slopes = [], features = [] } = stage.track;
  const surfaces = stage.surfaces || {};
  const defaultSurface = surfaces.default || 'dirt';
  const zones = surfaces.zones || [];

  function heightAt(x) {
    let h = baseElevation(slopes, x);
    for (const n of noise) {
      h += Math.sin(x * n.freq + n.phase) * n.amp;
    }
    for (const f of features) {
      h += featureContribution(f, x);
    }
    return h;
  }

  function slopeAt(x) {
    return (heightAt(x + 1) - heightAt(x - 1)) / 2;
  }

  function surfaceAt(x) {
    for (const z of zones) {
      if (x >= z.from && x < z.to) return z.type;
    }
    return defaultSurface;
  }

  return { heightAt, slopeAt, surfaceAt, finishX };
}
