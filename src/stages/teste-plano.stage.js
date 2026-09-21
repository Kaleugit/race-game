/**
 * @module stages/teste-plano
 * @summary Hidden near-flat test stage (CA-003 proof): data only, one sand and one mud zone.
 * Reachable only via ?stage=teste-plano; omitted from listStages().
 */
export default {
  id: 'teste-plano',
  name: 'Teste Plano',
  order: 99,
  hidden: true,
  track: {
    finishX: 200,
    noise: [{ amp: 0.05, freq: 0.08, phase: 0 }],
    slopes: [],
    features: [],
  },
  surfaces: {
    default: 'dirt',
    zones: [
      { from: 60, to: 90, type: 'sand' },
      { from: 120, to: 150, type: 'mud' },
    ],
  },
  visuals: {
    background: '/img/cerrado.jpg',
    mudLayer: false,
    palette: { ground: 0x3a2f1e, zones: { sand: 0xd8c38a, mud: 0x4a3322 } },
  },
  bot: { difficulty: 0.5 },
};
