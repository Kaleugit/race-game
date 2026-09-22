/**
 * @module stages/livre-teste
 * @summary Hidden short free-roam stage (EP-008-13), the `mode: 'free'` twin of `teste-plano`:
 * 180 m with one sand and one mud hazard so the e2e can reach the free-roam end screen in seconds
 * instead of driving the real 5 km. Reachable only via `?stage=livre-teste`; never on the map.
 */
export default {
  id: 'livre-teste',
  name: 'Livre Teste',
  mode: 'free',
  order: 98,
  hidden: true,
  track: {
    finishX: 180,
    noise: [{ amp: 0.06, freq: 0.09, phase: 0.3 }],
    slopes: [],
    features: [
      { x: 55, type: 'bell', w: 4, h: 0.5 },
      { x: 130, type: 'wave', w: 10, h: 0.25, count: 3 },
    ],
  },
  surfaces: {
    default: 'dirt',
    zones: [
      { from: 50, to: 80, type: 'sand' },
      { from: 110, to: 140, type: 'mud' },
    ],
  },
  visuals: {
    background: '/img/cloud-forest-landscape.jpg',
    mudLayer: false,
    palette: { ground: 0x2e2a1c, zones: { mud: 0x3b2a1a, sand: 0xd9b27a } },
  },
};
