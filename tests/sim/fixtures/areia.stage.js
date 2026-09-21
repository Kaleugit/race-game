// Node-only sim fixture (not in src/stages/, never shown in the game): near-flat track with a
// dirt run-up [0, 100) followed by a long sand stretch [100, 300). Used by tests/sim/parts.test.js.
export const SAND_FROM = 100;
export const SAND_TO = 300;

export default {
  id: 'areia-fixture',
  name: 'Areia (fixture)',
  order: 999,
  hidden: true,
  track: {
    finishX: SAND_TO,
    noise: [{ amp: 0.05, freq: 0.08, phase: 0 }],
    slopes: [],
    features: [],
  },
  surfaces: {
    default: 'dirt',
    zones: [{ from: SAND_FROM, to: SAND_TO, type: 'sand' }],
  },
  visuals: {
    background: '/img/cerrado.jpg',
    mudLayer: false,
    palette: { ground: 0x3a2f1e, zones: { sand: 0xd8c38a } },
  },
  bot: { difficulty: 0.5 },
};
