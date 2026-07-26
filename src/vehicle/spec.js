// ---------------------------------------------------------------------------
// Single source of truth for the truck's proportions. Every part module reads
// from here so the body, wheels and bolt-on gear always line up.
//
// Space: +X right, +Y up, +Z forward (nose). Origin on the ground between the
// axles. Units are metres.
// ---------------------------------------------------------------------------

export const SPEC = {
  // --- running gear --------------------------------------------------------
  wheelRadius: 0.445,
  wheelWidth: 0.335,
  rimRadius: 0.235,
  wheelbase: 3.06,
  frontAxleZ: 1.53,
  rearAxleZ: -1.53,
  trackHalf: 0.845, // hub centre from centreline
  axleY: 0.445,
  suspensionTravel: 0.11,

  // --- hull ----------------------------------------------------------------
  bodyHalfWidth: 0.88,
  frameY: 0.5, // top of the frame rails
  frameHalfWidth: 0.42,
  floorY: 0.62,
  noseZ: 2.44,
  tailZ: -2.5,

  hoodY: 1.3,
  hoodFrontZ: 2.18,
  hoodRearZ: 0.98,
  beltlineY: 1.33, // top of the doors / bottom of the glass

  windshieldBottomZ: 0.92,
  windshieldTopZ: 0.44,
  roofY: 2.02,
  cabFrontZ: 0.95,
  cabRearZ: -0.86,

  bedFloorY: 1.0,
  bedTopY: 1.44,
  bedFrontZ: -0.92,
  bedRearZ: -2.4,

  grilleTopY: 1.28,
  grilleBottomY: 0.86,
};

SPEC.wheelPositions = [
  { name: 'FL', x: SPEC.trackHalf, z: SPEC.frontAxleZ, steer: true },
  { name: 'FR', x: -SPEC.trackHalf, z: SPEC.frontAxleZ, steer: true },
  { name: 'RL', x: SPEC.trackHalf, z: SPEC.rearAxleZ, steer: false },
  { name: 'RR', x: -SPEC.trackHalf, z: SPEC.rearAxleZ, steer: false },
];
