/**
 * @module stages/terra-livre
 * @summary Free-roam stage data (EP-008-13): a 5 km cross-country run with no opponent — ten
 * hand-placed 500 m sections that keep rotating the terrain (rolling dirt, a ridge climb with a crest
 * kicker, a mud swamp, dunes, rock steps, a jump park descent, alternating mud/sand traps, the serra
 * climb, a downhill jump park and a fast run-in). `mode: 'free'` is what tells the game to run it
 * without a bot, without a result and without touching the progress (src/main.js); it carries no
 * `bot` block for that reason. `hidden: true` keeps it out of `listStages()` (the race ladder and the
 * CA-004/CA-009 sim tests); the map screen reaches it by id through the MODO LIVRE card.
 * The 21 mud/sand zones are hazards on a dirt stage, so EP-008-12 gives each one a warning sign for
 * free — the first hazard starts at 140 m, well past the 20 m a sign needs.
 */
export default {
  id: 'terra-livre',
  name: 'Terra Livre',
  mode: 'free',
  order: 50,
  hidden: true,
  track: {
    finishX: 5000,
    // Two long wavelengths: the ground is never perfectly flat over 5 km, but never busy either.
    noise: [
      { amp: 0.22, freq: 0.05, phase: 0.4 },
      { amp: 0.09, freq: 0.13, phase: 1.7 },
    ],
    // Elevation: ridge (600-900), swamp basin, dunes, rock plateau, long descent, serra, big drop.
    // Net elevation over the 5 km is ~+1 m, so the run neither sinks nor climbs away.
    slopes: [
      { x: 240,  w: 80,  dh: 3 },
      { x: 430,  w: 70,  dh: -4 },
      { x: 640,  w: 110, dh: 18 },  // ridge climb
      { x: 880,  w: 70,  dh: -16 }, // drop off the ridge
      { x: 1050, w: 90,  dh: -4 },  // into the swamp basin
      { x: 1450, w: 80,  dh: 5 },
      { x: 1620, w: 100, dh: 6 },   // dune field rise
      { x: 1850, w: 90,  dh: -7 },
      { x: 2100, w: 120, dh: 12 },  // rock plateau
      { x: 2420, w: 70,  dh: -3 },
      { x: 2620, w: 140, dh: -18 }, // long descent
      { x: 2950, w: 60,  dh: 4 },
      { x: 3150, w: 90,  dh: -5 },
      { x: 3400, w: 80,  dh: 6 },
      { x: 3650, w: 130, dh: 22 },  // serra, first step
      { x: 3900, w: 110, dh: 14 },  // serra, second step
      { x: 4150, w: 120, dh: -20 }, // downhill jump park
      { x: 4400, w: 100, dh: -14 },
      { x: 4650, w: 90,  dh: 5 },
      { x: 4880, w: 60,  dh: -3 },
    ],
    features: [
      // 0-500 m: opening on rolling dirt, a puddle and a sandy wash.
      { x: 60,   type: 'bell',    w: 4,  h: 0.6 },
      { x: 110,  type: 'wave',    w: 12, h: 0.3,  count: 3 },
      { x: 165,  type: 'valley',  w: 8,  h: 0.7 },
      { x: 220,  type: 'asym',    w: 6,  h: 1.1,  leftFactor: 0.45 },
      { x: 290,  type: 'bell',    w: 5,  h: 0.8 },
      { x: 365,  type: 'wave',    w: 14, h: 0.35, count: 4 },
      { x: 430,  type: 'valley',  w: 10, h: 0.8 },
      { x: 480,  type: 'bell',    w: 4,  h: 0.9 },
      // 500-1000 m: ridge climb, crest kicker and the jump off the far side.
      { x: 540,  type: 'asym',    w: 7,  h: 1.2,  leftFactor: 0.4 },
      { x: 590,  type: 'bell',    w: 5,  h: 0.7 },
      { x: 660,  type: 'plateau', w: 12, h: 0.8 },
      { x: 700,  type: 'asym',    w: 6,  h: 1.4,  leftFactor: 0.35 },
      { x: 790,  type: 'wave',    w: 16, h: 0.4,  count: 4 },
      { x: 860,  type: 'bell',    w: 4,  h: 0.9 },
      { x: 915,  type: 'asym',    w: 7,  h: 1.5,  leftFactor: 0.35 },
      { x: 970,  type: 'valley',  w: 12, h: 1.0 },
      // 1000-1500 m: swamp basin, deep ruts and soft ripples.
      { x: 1030, type: 'bell',    w: 4,  h: 0.6 },
      { x: 1110, type: 'valley',  w: 14, h: 1.1 },
      { x: 1180, type: 'wave',    w: 16, h: 0.3,  count: 5 },
      { x: 1260, type: 'bell',    w: 5,  h: 0.8 },
      { x: 1340, type: 'valley',  w: 12, h: 1.0 },
      { x: 1400, type: 'wave',    w: 14, h: 0.35, count: 4 },
      { x: 1470, type: 'asym',    w: 6,  h: 1.2,  leftFactor: 0.4 },
      // 1500-2000 m: dunes, long soft crests.
      { x: 1530, type: 'bell',    w: 6,  h: 0.9 },
      { x: 1600, type: 'wave',    w: 18, h: 0.45, count: 3 },
      { x: 1670, type: 'bell',    w: 8,  h: 1.2 },
      { x: 1740, type: 'valley',  w: 10, h: 0.8 },
      { x: 1820, type: 'wave',    w: 18, h: 0.5,  count: 3 },
      { x: 1880, type: 'asym',    w: 7,  h: 1.3,  leftFactor: 0.4 },
      { x: 1950, type: 'bell',    w: 5,  h: 0.7 },
      // 2000-2500 m: rock steps and ledges on the plateau.
      { x: 2020, type: 'plateau', w: 14, h: 0.9 },
      { x: 2080, type: 'asym',    w: 6,  h: 1.2,  leftFactor: 0.45 },
      { x: 2150, type: 'plateau', w: 12, h: 1.0 },
      { x: 2210, type: 'valley',  w: 10, h: 1.1 },
      { x: 2290, type: 'wave',    w: 12, h: 0.35, count: 3 },
      { x: 2360, type: 'bell',    w: 4,  h: 0.9 },
      { x: 2450, type: 'wave',    w: 14, h: 0.35, count: 4 },
      // 2500-3000 m: the descent, used as a jump park.
      { x: 2520, type: 'asym',    w: 7,  h: 1.4,  leftFactor: 0.35 },
      { x: 2600, type: 'bell',    w: 5,  h: 0.8 },
      { x: 2670, type: 'asym',    w: 8,  h: 1.6,  leftFactor: 0.3 },
      { x: 2750, type: 'wave',    w: 16, h: 0.4,  count: 4 },
      { x: 2830, type: 'valley',  w: 12, h: 1.2 },
      { x: 2900, type: 'bell',    w: 5,  h: 0.9 },
      { x: 2960, type: 'asym',    w: 6,  h: 1.2,  leftFactor: 0.4 },
      // 3000-3500 m: alternating mud and sand traps on broken ground.
      { x: 3040, type: 'bell',    w: 4,  h: 0.7 },
      { x: 3090, type: 'valley',  w: 10, h: 0.9 },
      { x: 3220, type: 'wave',    w: 16, h: 0.35, count: 5 },
      { x: 3300, type: 'bell',    w: 6,  h: 1.0 },
      { x: 3410, type: 'valley',  w: 12, h: 1.0 },
      { x: 3470, type: 'asym',    w: 7,  h: 1.3,  leftFactor: 0.4 },
      // 3500-4000 m: the serra, two climbing steps.
      { x: 3540, type: 'bell',    w: 5,  h: 0.8 },
      { x: 3620, type: 'plateau', w: 10, h: 0.7 },
      { x: 3700, type: 'asym',    w: 6,  h: 1.1,  leftFactor: 0.45 },
      { x: 3780, type: 'wave',    w: 14, h: 0.3,  count: 3 },
      { x: 3860, type: 'bell',    w: 5,  h: 0.9 },
      { x: 3930, type: 'valley',  w: 10, h: 0.8 },
      // 4000-4500 m: downhill jump park, the biggest kickers of the run.
      { x: 4020, type: 'asym',    w: 8,  h: 1.5,  leftFactor: 0.3 },
      { x: 4100, type: 'bell',    w: 5,  h: 0.9 },
      { x: 4180, type: 'asym',    w: 8,  h: 1.6,  leftFactor: 0.3 },
      { x: 4260, type: 'valley',  w: 12, h: 1.2 },
      { x: 4330, type: 'wave',    w: 14, h: 0.4,  count: 4 },
      { x: 4400, type: 'asym',    w: 7,  h: 1.4,  leftFactor: 0.35 },
      { x: 4470, type: 'bell',    w: 5,  h: 0.8 },
      // 4500-5000 m: fast run-in with a last ramp before the 5 km marker.
      { x: 4540, type: 'plateau', w: 12, h: 0.8 },
      { x: 4610, type: 'wave',    w: 16, h: 0.35, count: 4 },
      { x: 4700, type: 'bell',    w: 5,  h: 0.9 },
      { x: 4780, type: 'valley',  w: 10, h: 0.9 },
      { x: 4840, type: 'wave',    w: 14, h: 0.3,  count: 4 },
      { x: 4920, type: 'asym',    w: 7,  h: 1.5,  leftFactor: 0.35 },
    ],
  },
  surfaces: {
    default: 'dirt',
    // Every zone is at least 20 m from the previous one, so each gets its own warning sign.
    zones: [
      { from: 140,  to: 190,  type: 'mud' },
      { from: 330,  to: 400,  type: 'sand' },
      { from: 560,  to: 620,  type: 'mud' },
      { from: 760,  to: 820,  type: 'sand' },
      { from: 1080, to: 1230, type: 'mud' },
      { from: 1300, to: 1420, type: 'mud' },
      { from: 1560, to: 1700, type: 'sand' },
      { from: 1780, to: 1900, type: 'sand' },
      { from: 2260, to: 2320, type: 'mud' },
      { from: 2420, to: 2480, type: 'sand' },
      { from: 2700, to: 2800, type: 'sand' },
      { from: 2900, to: 2960, type: 'mud' },
      { from: 3060, to: 3120, type: 'mud' },
      { from: 3180, to: 3260, type: 'sand' },
      { from: 3380, to: 3440, type: 'mud' },
      { from: 3620, to: 3700, type: 'sand' },
      { from: 3880, to: 3940, type: 'mud' },
      { from: 4120, to: 4220, type: 'sand' },
      { from: 4340, to: 4420, type: 'mud' },
      { from: 4560, to: 4660, type: 'sand' },
      { from: 4800, to: 4880, type: 'mud' },
    ],
  },
  visuals: {
    background: '/img/cloud-forest-landscape.jpg',
    mudLayer: false,
    palette: { ground: 0x2e2a1c, zones: { mud: 0x3b2a1a, sand: 0xd9b27a } },
  },
};
