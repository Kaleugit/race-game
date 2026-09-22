/**
 * @module stages/mata-atlantica
 * @summary Mata Atlântica stage data (EP-005-01, shortened in EP-008-01): the prototype opening
 * (0–830 m, verbatim from the pre-migration src/main.js, including the big serra jump) followed by
 * the signature forest sections — riverbank mud, a second serra climb with a big jump and a mud
 * bog — sized for a 30–45 s race with the reference driver (CA-009).
 */
export default {
  id: 'mata-atlantica',
  name: 'Mata Atlântica',
  order: 1,
  hidden: false,
  track: {
    finishX: 1400,
    noise: [
      { amp: 0.18, freq: 0.06, phase: 0 },
      { amp: 0.10, freq: 0.13, phase: 1.7 },
      { amp: 0.05, freq: 0.31, phase: 0.4 },
    ],
    slopes: [
      // Prototype opening (verbatim): the steep serra climb at 220 and its big jump down at 298.5.
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
      // Riverbank descent into the first mud stretch.
      { x: 900,  w: 30, dh: -2.0 },
      // Second serra: a long, drivable climb, a crest kicker and a big jump into the valley.
      { x: 1080, w: 90, dh: 10 },
      { x: 1165, w: 30, dh: -11 },
      // Short rise out of the mud bog to the finish.
      { x: 1330, w: 20, dh: 1.5 },
    ],
    features: [
      // Prototype opening (verbatim).
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
      // Riverbank: roots and ruts in the mud.
      { x: 945,  type: 'wave',   w: 10, h: 0.25, count: 4 },
      { x: 975,  type: 'valley', w: 7,  h: 0.7 },
      // Second serra: bumps on the climb, crest kicker.
      { x: 1060, type: 'bell',   w: 5,  h: 0.6 },
      { x: 1110, type: 'wave',   w: 8,  h: 0.3, count: 3 },
      { x: 1140, type: 'asym',   w: 5,  h: 1.2, leftFactor: 0.5 },
      // Mud bog: dips and a buried log.
      { x: 1245, type: 'valley', w: 10, h: 0.8 },
      { x: 1275, type: 'bell',   w: 3,  h: 0.5 },
      { x: 1300, type: 'valley', w: 8,  h: 0.6 },
      // Final run: a last bump before the line.
      { x: 1360, type: 'bell',   w: 3,  h: 0.8 },
    ],
  },
  surfaces: {
    default: 'dirt',
    zones: [
      { from: 930,  to: 1000, type: 'mud' }, // riverbank
      { from: 1220, to: 1320, type: 'mud' }, // mud bog below the second jump
    ],
  },
  visuals: {
    background: '/img/misty-tropical-jungle.jpg',
    mudLayer: true,
    palette: { ground: 0x1a2818, zones: { mud: 0x3b2a1a } },
  },
  bot: { difficulty: 0.5 },
};
