// Wrangler-inspired 2-door. +X right, +Y up, +Z forward. Metres. Origin on
// the ground between the axles.

export const SPEC = {
  wheelRadius: 0.42,
  wheelWidth: 0.32,
  rimRadius: 0.22,
  wheelbase: 2.46,
  frontAxleZ: 1.23,
  rearAxleZ: -1.23,
  trackHalf: 0.82,
  axleY: 0.42,

  bodyHalfWidth: 0.78,
  flareHalfWidth: 0.96,
  floorY: 0.58,
  frameY: 0.46,

  noseZ: 2.12,
  tailZ: -2.05,
  hoodY: 1.18,
  hoodFrontZ: 1.92,
  hoodRearZ: 0.78,
  beltY: 1.22,
  roofY: 1.86,
  cabFrontZ: 0.72,
  cabRearZ: -0.78,
  windshieldLean: 0.22,

  grilleTopY: 1.14,
  grilleBottomY: 0.78,
};

SPEC.wheelPositions = [
  { name: 'FL', x: SPEC.trackHalf, z: SPEC.frontAxleZ, steer: true },
  { name: 'FR', x: -SPEC.trackHalf, z: SPEC.frontAxleZ, steer: true },
  { name: 'RL', x: SPEC.trackHalf, z: SPEC.rearAxleZ, steer: false },
  { name: 'RR', x: -SPEC.trackHalf, z: SPEC.rearAxleZ, steer: false },
];
