export const SEED = 44021;

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function rand() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hash2(x, y, seed = SEED) {
  const n = Math.sin(x * 127.1 + y * 311.7 + seed * 0.001) * 43758.5453;
  return n - Math.floor(n);
}

export const LAYOUT = {
  hullRadius: 1.26,
  hullCenterY: 0.99,
  floorY: 0,
  length: 22.0,
  bowZ: 0.0,
  sternZ: 22.0,
  eyeHeight: 1.7,
  corridorWidth: 1.08,
  hatchWidth: 0.66,
  hatchHeight: 1.5,
  hatchSill: 0.06,
  rooms: {
    control: { z0: 0.18, z1: 4.4 },
    corridor: { z0: 4.4, z1: 8.2 },
    crew: { z0: 8.2, z1: 13.1 },
    passage: { z0: 13.1, z1: 16.2 },
    engine: { z0: 16.2, z1: 21.8 },
  },
};

export function hullHalfWidthAt(y) {
  const dy = y - LAYOUT.hullCenterY;
  const r = LAYOUT.hullRadius;
  const inner = r * r - dy * dy;
  return inner > 0 ? Math.sqrt(inner) : 0;
}

export const PALETTE = {
  hull: 0xc6c2b4,
  hullGreen: 0x7d846c,
  hullShadow: 0x8d897c,
  steel: 0x6d7176,
  gunmetal: 0x3a3e44,
  oily: 0x2a2c30,
  machineBlue: 0x4a5560,
  rubber: 0x1c1d1f,
  deck: 0x2a2622,
  safetyOrange: 0xb46a32,
  safetyYellow: 0xb49a4a,
  warningRed: 0x8a3030,
  instrumentGreen: 0x6fbf7a,
  instrumentAmber: 0xd4a24a,
  instrumentCyan: 0x5aa8b0,
  waterDeep: 0x06141c,
  waterMid: 0x0b2a33,
  fabric: 0x5a5346,
  leather: 0x3d2f26,
  plastic: 0x2d3230,
  bakelite: 0x2a221c,
};

export const ART = {
  direction:
    "Used, maintained, cramped expedition submarine. Industrial realism, not sci-fi. Warm off-white hull, desaturated naval green panels, gunmetal machinery, restrained amber/green instruments, deep blue-green exterior spill.",
};
