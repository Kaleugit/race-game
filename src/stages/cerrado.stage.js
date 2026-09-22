/**
 * @module stages/cerrado
 * @summary Cerrado stage data (EP-005-02): open savanna on red earth — long fast flats, two
 * chapadas (table-top plateaus) with escarpment climbs and big drops, termite-mound kickers,
 * gully dips and hand-placed loose-sand stretches (RF-011) that cut traction, sized for a
 * 60–90 s race with the reference driver (CA-009). Bot slightly harder than Mata Atlântica.
 */
export default {
  id: 'cerrado',
  name: 'Cerrado',
  order: 2,
  hidden: false,
  track: {
    finishX: 2800,
    // Gentle, long-wavelength undulation: open savanna, not forest ruts.
    noise: [
      { amp: 0.25, freq: 0.03, phase: 0.9 },
      { amp: 0.08, freq: 0.11, phase: 2.3 },
    ],
    slopes: [
      // Run-up across the savanna, then a shallow sandy lowland.
      { x: 250,  w: 60,  dh: -2.0 },
      // First chapada: escarpment climb, long flat table, big drop off the edge.
      { x: 520,  w: 70,  dh: 14 },
      { x: 820,  w: 40,  dh: -15 },
      // Rolling red-earth plain with a long sandy riverbed (vereda).
      { x: 1150, w: 50,  dh: 2.0 },
      { x: 1350, w: 40,  dh: -2.5 },
      // Second, higher chapada in two steps, table top with kickers, drop into the valley.
      { x: 1650, w: 60,  dh: 9 },
      { x: 1780, w: 50,  dh: 8 },
      { x: 2080, w: 45,  dh: -18 },
      // Final savanna run to the line.
      { x: 2450, w: 60,  dh: 1.5 },
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
      // Plain below the escarpment: gully (voçoroca) and mounds.
      { x: 900,  type: 'valley', w: 8,  h: 1.2 },
      { x: 960,  type: 'bell',   w: 3,  h: 0.9 },
      { x: 1010, type: 'wave',   w: 10, h: 0.3, count: 3 },
      { x: 1080, type: 'asym',   w: 6,  h: 1.4, leftFactor: 0.4 },
      // Vereda: sandy riverbed with soft ripples.
      { x: 1230, type: 'wave',   w: 16, h: 0.3, count: 4 },
      { x: 1290, type: 'valley', w: 12, h: 0.7 },
      // Plain before the second chapada.
      { x: 1420, type: 'bell',    w: 4,  h: 1.0 },
      { x: 1480, type: 'valley',  w: 7,  h: 1.0 },
      { x: 1540, type: 'plateau', w: 10, h: 0.9 },
      // Second chapada: step bumps and table-top kickers.
      { x: 1720, type: 'bell',    w: 4,  h: 0.6 },
      { x: 1850, type: 'asym',    w: 6,  h: 1.2, leftFactor: 0.4 },
      { x: 1920, type: 'asym',    w: 6,  h: 1.5, leftFactor: 0.4 },
      { x: 1990, type: 'plateau', w: 12, h: 1.0 },
      // Valley below: sand pan and gullies.
      { x: 2180, type: 'valley', w: 10, h: 1.0 },
      { x: 2240, type: 'wave',   w: 14, h: 0.35, count: 3 },
      { x: 2320, type: 'bell',   w: 4,  h: 1.1 },
      // Final run: termite mounds and a last kicker.
      { x: 2530, type: 'bell',   w: 3,  h: 0.8 },
      { x: 2600, type: 'asym',   w: 6,  h: 1.4, leftFactor: 0.4 },
      { x: 2680, type: 'wave',   w: 12, h: 0.3, count: 3 },
    ],
  },
  surfaces: {
    default: 'dirt',
    zones: [
      { from: 270,  to: 440,  type: 'sand' }, // sandy lowland before the first chapada
      { from: 1180, to: 1330, type: 'sand' }, // vereda riverbed
      { from: 2150, to: 2280, type: 'sand' }, // sand pan below the second chapada
    ],
  },
  visuals: {
    background: '/img/cerrado.jpg',
    mudLayer: false,
    palette: { ground: 0x5a2616, zones: { sand: 0xd9b27a } },
  },
  bot: { difficulty: 0.6 },
};
