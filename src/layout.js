/** Shared submarine dimensions and zone map. Z+ is aft. */

export const HULL = {
  length: 22.0,
  radius: 1.52,
  centerY: 1.12,
  deckY: 0.0,
  ceilingY: 2.16,
  innerWidth: 2.55,
  ribSpacing: 0.82,
  skin: 0.045,
};

export const ZONES = {
  bow: { z0: 0.0, z1: 0.38 },
  control: { z0: 0.38, z1: 4.55 },
  corridor: { z0: 4.55, z1: 8.15 },
  crew: { z0: 8.15, z1: 13.25 },
  electrical: { z0: 13.25, z1: 16.05 },
  engine: { z0: 16.05, z1: 21.65 },
  stern: { z0: 21.65, z1: 22.0 },
};

export const BULKHEADS = [4.55, 8.15, 13.25, 16.05];

export const HATCH = {
  width: 0.98,
  height: 1.82,
  centerY: 0.98,
  thickness: 0.14,
};

export const PLAYER = {
  eyeHeight: 1.7,
  radius: 0.2,
  height: 1.74,
  walkSpeed: 1.55,
};

export const PALETTE = {
  hullWarm: 0xc6c1b2,
  hullWarmDark: 0x9a9588,
  hullGreen: 0x6f7668,
  hullGreenDark: 0x4e554a,
  steel: 0x4c5156,
  gunmetal: 0x35383d,
  machinery: 0x45505a,
  machineryDark: 0x2b3238,
  safetyOrange: 0xc25a2a,
  safetyYellow: 0xc4a04a,
  rubber: 0x262422,
  rubberWorn: 0x322e2a,
  instrumentGreen: 0x3dba6e,
  amber: 0xe0a030,
  cyan: 0x4aa8b8,
  waterDeep: 0x061820,
  waterMid: 0x0a3340,
  fabricNavy: 0x3a4450,
  fabricOlive: 0x5a5840,
  leather: 0x3a2c22,
  bakelite: 0x2a241c,
  brass: 0x8a7040,
  rust: 0x6a3a22,
};

export const VIEWS = {
  controlRoom: {
    position: [0.06, 1.58, 3.85],
    target: [0.0, 1.22, 0.7],
    fov: 60,
  },
  corridor: {
    position: [0.0, 1.62, 5.05],
    target: [0.0, 1.35, 7.7],
    fov: 64,
  },
  crewQuarters: {
    position: [0.12, 1.6, 8.55],
    target: [-0.15, 1.15, 11.4],
    fov: 62,
  },
  engineRoom: {
    position: [0.05, 1.64, 16.45],
    target: [0.1, 1.15, 19.8],
    fov: 64,
  },
  machineryCloseup: {
    position: [-0.42, 1.38, 18.15],
    target: [-0.55, 0.95, 19.55],
    fov: 50,
  },
  sonarConsole: {
    position: [-0.12, 1.5, 2.95],
    target: [-0.7, 1.12, 1.85],
    fov: 50,
  },
  forwardViewport: {
    position: [0.0, 1.58, 1.85],
    target: [0.0, 1.25, -1.4],
    fov: 58,
  },
  porthole: {
    position: [0.18, 1.52, 6.35],
    target: [1.15, 1.35, 6.55],
    fov: 50,
  },
  aftWide: {
    position: [0.0, 1.72, 16.7],
    target: [0.05, 1.05, 21.1],
    fov: 68,
  },
  walking: {
    position: [0.0, 1.7, 9.9],
    target: [0.0, 1.45, 12.6],
    fov: 66,
  },
};

export function hullXAtY(y, inset = 0) {
  const dy = y - HULL.centerY;
  const r = HULL.radius - inset;
  const inside = r * r - dy * dy;
  if (inside <= 0) return 0;
  return Math.sqrt(inside);
}

export function zoneAt(z) {
  for (const [name, zone] of Object.entries(ZONES)) {
    if (z >= zone.z0 && z < zone.z1) return name;
  }
  return z < 0 ? "bow" : "stern";
}
