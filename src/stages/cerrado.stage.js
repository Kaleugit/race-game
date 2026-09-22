/**
 * @module stages/cerrado
 * @summary Cerrado stage data (EP-005-02, shortened in EP-008-01): open savanna on red earth — fast
 * flats, one big chapada (table-top plateau) with an escarpment climb and a big drop, termite-mound
 * kickers, a gully and two hand-placed loose-sand stretches (RF-011) that cut traction, sized for a
 * 30–45 s race with the reference driver (CA-009). Bot slightly harder than Mata Atlântica.
 */
export default {
  id: 'cerrado',
  name: 'Cerrado',
  order: 2,
  hidden: false,
  track: {
    finishX: 1360,
    // Gentle, long-wavelength undulation: open savanna, not forest ruts.
    noise: [
      { amp: 0.25, freq: 0.03, phase: 0.9 },
      { amp: 0.08, freq: 0.11, phase: 2.3 },
    ],
    slopes: [
      // Run-up across the savanna, then a shallow sandy lowland.
      { x: 250,  w: 60,  dh: -2.0 },
      // The chapada: escarpment climb, long flat table, big drop off the edge.
      { x: 520,  w: 70,  dh: 14 },
      { x: 820,  w: 40,  dh: -15 },
      // Red-earth plain with a sandy riverbed (vereda).
      { x: 1000, w: 50,  dh: 2.0 },
      { x: 1200, w: 40,  dh: -2.5 },
    ],
    features: [
      // Opening: termite mounds (cupinzeiros) as small kickers.
      { x: 90,  type: 'bell',   w: 3,  h: 0.7 },
      { x: 140, type: 'asym',   w: 5,  h: 1.1, leftFactor: 0.4 },
      { x: 190, type: 'bell',   w: 3,  h: 0.8 },
      // Sandy lowland: soft dunes.
      { x: 300, type: 'wave',   w: 14, h: 0.35, count: 3 },
      { x: 360, type: 'valley', w: 10, h: 0.6 },
      { x: 420, type: 'bell',   w: 6,  h: 0.6 },
      // Chapada climb bumps and a crest kicker.
      { x: 505, type: 'bell',   w: 4,  h: 0.5 },
      { x: 560, type: 'asym',   w: 6,  h: 1.0, leftFactor: 0.5 },
      // Chapada table: fast, with rock ledges.
      { x: 640, type: 'plateau', w: 14, h: 0.8 },
      { x: 700, type: 'asym',    w: 6,  h: 1.3, leftFactor: 0.4 },
      { x: 760, type: 'bell',    w: 3,  h: 0.7 },
      // Plain below the escarpment: gully (voçoroca) and a mound.
      { x: 900,  type: 'valley', w: 8,  h: 1.2 },
      { x: 960,  type: 'bell',   w: 3,  h: 0.9 },
      // Vereda: sandy riverbed with soft ripples.
      { x: 1080, type: 'wave',   w: 16, h: 0.3, count: 4 },
      { x: 1140, type: 'valley', w: 12, h: 0.7 },
      // Final run: a termite mound and a last kicker.
      { x: 1250, type: 'bell',   w: 3,  h: 0.8 },
      { x: 1300, type: 'asym',   w: 6,  h: 1.4, leftFactor: 0.4 },
    ],
  },
  surfaces: {
    default: 'dirt',
    zones: [
      { from: 270,  to: 440,  type: 'sand' }, // sandy lowland before the chapada
      { from: 1030, to: 1180, type: 'sand' }, // vereda riverbed
    ],
  },
  visuals: {
    background: '/img/cerrado.jpg',
    mudLayer: false,
    palette: { ground: 0x5a2616, zones: { sand: 0xd9b27a } },
  },
  bot: { difficulty: 0.9 },
};
