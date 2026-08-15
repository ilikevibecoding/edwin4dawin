/** Spatial contract for the pressure hull. All rooms share these dimensions. */

export const LAYOUT = {
  hullRadius: 1.26,
  hullCenterY: 1.1,
  hullLength: 21.6,
  hullZMin: -9.0,
  hullZMax: 12.6,
  deckY: 0,
  deckThickness: 0.045,
  ceilingClearance: 2.18,
  eyeHeight: 1.7,
  corridorWidth: 1.08,
  hatchRadius: 0.52,
  ribSpacing: 0.78,
  playerRadius: 0.2,
  playerHeight: 1.78,
};

export const ROOMS = {
  control: { z0: 9.15, z1: 12.45, name: 'CONTROL' },
  corridor: { z0: 5.35, z1: 9.15, name: 'PASSAGE' },
  crew: { z0: 1.15, z1: 5.35, name: 'BERTHING' },
  passage: { z0: -1.55, z1: 1.15, name: 'ELECTRICAL' },
  engine: { z0: -8.75, z1: -1.55, name: 'PROPULSION' },
};

export const BULKHEADS = [9.15, 5.35, 1.15, -1.55];

export const PALETTE = {
  hullWarm: '#c2b49a',
  hullWarmDark: '#8d826c',
  hullGreen: '#6f7464',
  hullGreenDark: '#4d5246',
  primer: '#6a5340',
  steel: '#3c4148',
  steelLight: '#6d737c',
  gunmetal: '#2a2e33',
  oily: '#1c1f23',
  machineBlue: '#3d4a55',
  rubber: '#1a1b1d',
  rubberWorn: '#2a2622',
  safetyOrange: '#c25a28',
  safetyYellow: '#c4a032',
  warningRed: '#9a2b24',
  fabric: '#5b4a3a',
  fabricLight: '#7a6550',
  blanket: '#4a3f38',
  leather: '#3a2c24',
  plastic: '#2b2f33',
  bakelite: '#2a221c',
  glass: '#8aa8b0',
  instrumentGreen: '#3d8a58',
  instrumentAmber: '#d09a28',
  instrumentCyan: '#3f9aa8',
  waterDeep: '#06141c',
  waterMid: '#0a2a32',
  waterNear: '#163c44',
};

export const START_POSE = {
  x: 0,
  y: LAYOUT.eyeHeight,
  z: 10.55,
  yaw: 0,
  pitch: 0.04,
};

export function hullXAtHeight(y, margin = 0.08) {
  const dy = y - LAYOUT.hullCenterY;
  const r = LAYOUT.hullRadius - margin;
  const inner = r * r - dy * dy;
  if (inner <= 0) return 0.2;
  return Math.sqrt(inner);
}

export function insideHull(x, y, z, margin = 0.06) {
  if (z < LAYOUT.hullZMin + 0.12 || z > LAYOUT.hullZMax - 0.12) return false;
  const dx = x;
  const dy = y - LAYOUT.hullCenterY;
  return dx * dx + dy * dy < (LAYOUT.hullRadius - margin) ** 2;
}
