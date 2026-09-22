// Frozen copy of src/stages/mata-atlantica.stage.js at 53b4164 (before the EP-005-01 redesign).
// Pins the migration/physics-equivalence goldens (EP-002-01 height fixture, EP-003-01 physics
// goldens) and old-track scenarios to the track they were recorded on. Never edit.
/**
 * @module tests/sim/fixtures/mata-atlantica-legacy
 * @summary Mata Atlântica stage data, migrated verbatim from the pre-migration src/main.js
 * (SLOPES, FEATURES, FINISH_LINE_X, trackHeight noise, background, ground color).
 */
export default {
  id: 'mata-atlantica-legacy',
  name: 'Mata Atlântica',
  order: 1,
  hidden: true,
  track: {
    finishX: 620,
    noise: [
      { amp: 0.18, freq: 0.06, phase: 0 },
      { amp: 0.10, freq: 0.13, phase: 1.7 },
      { amp: 0.05, freq: 0.31, phase: 0.4 },
    ],
    slopes: [
      { x: 80,  w: 40, dh: 1.5 },
      { x: 200, w: 15, dh: 1.0 },
      { x: 290, w: 30, dh: -2.0 },
      { x: 400, w: 12, dh: 2.0 },
      { x: 500, w: 25, dh: -1.5 },
      { x: 220,   w: 40, dh: 25 },
      { x: 298.5, w: 57, dh: -25 },
      { x: 600, w: 8,  dh: -1.5 },
      { x: 720, w: 40, dh: 0.5 },
      { x: 820, w: 6,  dh: 1.0 },
    ],
    features: [
      { x: 75,  type: 'wave',    w: 6,  h: 0.2, count: 3 },
      { x: 95,  type: 'bell',    w: 3,  h: 0.7 },
      { x: 130, type: 'valley',  w: 6,  h: 0.6 },
      { x: 165, type: 'plateau', w: 8,  h: 1.0 },
      { x: 200, type: 'bell',    w: 3,  h: 0.8 },
      { x: 240, type: 'asym',    w: 6,  h: 1.4, leftFactor: 0.4 },
      { x: 285, type: 'wave',    w: 5,  h: 0.2, count: 3 },
      { x: 340, type: 'plateau', w: 10, h: 0.8 },
      { x: 370, type: 'bell',    w: 4,  h: 1.2 },
      { x: 400, type: 'bell',    w: 2.5, h: 1.0 },
      { x: 430, type: 'valley',  w: 6,  h: 0.8 },
      { x: 460, type: 'wave',    w: 8,  h: 0.3, count: 4 },
      { x: 500, type: 'plateau', w: 8,  h: 0.6 },
      { x: 640, type: 'wave',    w: 10, h: 0.4, count: 3 },
      { x: 680, type: 'valley',  w: 6,  h: 0.9 },
      { x: 710, type: 'wave',    w: 8,  h: 0.3, count: 4 },
      { x: 740, type: 'plateau', w: 6,  h: 0.8 },
      { x: 780, type: 'bell',    w: 4,  h: 1.4 },
      { x: 825, type: 'bell',    w: 3,  h: 0.8 },
    ],
  },
  surfaces: { default: 'dirt', zones: [] },
  visuals: {
    background: '/img/misty-tropical-jungle.jpg',
    mudLayer: true,
    palette: { ground: 0x1a2818, zones: {} },
  },
  bot: { difficulty: 0.5 },
};
