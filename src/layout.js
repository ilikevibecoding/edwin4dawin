/** Shared spatial constants. Forward is -Z, aft is +Z, starboard +X, up +Y. */

export const SEED = 0x5a17;

export const HULL = {
  length: 22.0,
  radius: 1.64,
  centerY: 1.14,
  floorY: 0,
  deckThickness: 0.055,
  ceilingY: 2.2,
  innerHalfWidth: 1.18,
};

export const ZONES = {
  control: { z0: -10.6, z1: -6.15, name: 'CONTROL' },
  corridor: { z0: -6.15, z1: -2.05, name: 'PASSAGE' },
  crew: { z0: -2.05, z1: 2.35, name: 'BERTHING' },
  electrical: { z0: 2.35, z1: 5.15, name: 'ELECTRICAL' },
  engine: { z0: 5.15, z1: 11.4, name: 'PROPULSION' },
};

export const BULKHEADS = [-6.15, -2.05, 2.35, 5.15];

export const HATCH = {
  width: 0.72,
  height: 1.58,
  sill: 0.08,
};

export const PLAYER = {
  eyeHeight: 1.7,
  radius: 0.2,
  height: 1.78,
  walkSpeed: 1.55,
  spawn: { x: 0.08, y: 1.7, z: -8.55 },
};

export const PALETTE = {
  hullWarm: '#c6c0b2',
  hullGreen: '#6e7a68',
  hullGray: '#9a9b93',
  steel: '#4a4e53',
  gunmetal: '#3a3d42',
  machineBlue: '#4a5560',
  rubber: '#1c1d1f',
  deck: '#2a2926',
  safetyOrange: '#b56a32',
  safetyYellow: '#b59a45',
  warningRed: '#8a2f2a',
  instrumentGreen: '#7dff9a',
  instrumentAmber: '#ffb347',
  instrumentCyan: '#6fd4d0',
  waterDeep: '#02131c',
  waterMid: '#0a3a42',
  waterNear: '#1a6a6a',
};

export function hullXAtY(y, inset = 0.04) {
  const dy = y - HULL.centerY;
  const r = HULL.radius - inset;
  const inner = r * r - dy * dy;
  if (inner <= 0) return 0.2;
  return Math.sqrt(inner);
}
