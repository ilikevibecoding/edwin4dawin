// Star Destroyer dimensional model shared by the exterior builders, the interior layout and the
// camera director. Metres. Bow at z = -800, stern at z = +760 (engines to +800), trench at y = 0.
export const HULL = {
  bowZ: -800,
  sternZ: 760,
  engineZ: 800,
  halfWidthStern: 460,
  trenchHalf: 8, // trench band y ∈ [-8, 8]
  trenchInset: 5, // trench wall sits this far inside the bevel edge
  plateauDorsal: 0.6, // fraction of the half-width that is flat plateau (dorsal)
  plateauVentral: 0.66,
  length: 1560,
};

export function halfWidth(z) {
  const t = (z - HULL.bowZ) / HULL.length;
  return Math.max(0.5, HULL.halfWidthStern * t);
}

/** Dorsal plateau height above the trench centre line at z. */
export function dorsalH(z) {
  const t = (z - HULL.bowZ) / HULL.length;
  return 14 + 40 * t;
}

/** Ventral plateau depth below the trench centre line at z (positive number). */
export function ventralH(z) {
  const t = (z - HULL.bowZ) / HULL.length;
  return 20 + 32 * t;
}

/** Surface point + unit normal on the dorsal (side=+1) or ventral (side=-1) skin at (x, z). */
export function skinPoint(x, z, side = 1) {
  const w = halfWidth(z);
  const s = Math.min(1, Math.abs(x) / w);
  const sp = side > 0 ? HULL.plateauDorsal : HULL.plateauVentral;
  const H = side > 0 ? dorsalH(z) : ventralH(z);
  const T = HULL.trenchHalf;
  let y;
  let nx = 0;
  let ny = side;
  if (s <= sp) y = side * H;
  else {
    const k = (s - sp) / (1 - sp); // 0 at plateau edge, 1 at trench lip
    y = side * (H - (H - T) * k);
    // bevel normal: tilt outward. run = (1 - sp) * w, rise = H - T
    const run = (1 - sp) * w;
    const rise = H - T;
    const len = Math.hypot(run, rise);
    nx = Math.sign(x) * (rise / len);
    ny = side * (run / len);
  }
  return { x, y, z, nx, ny, nz: 0 };
}

// Superstructure ("city") tiers on the dorsal plateau: plan trapezoids (half-widths at z0 / z1) and
// heights above the plateau. Tier 0 is the base.
export const CITY = {
  z0: 130,
  z1: 700,
  tiers: [
    { hw0: 62, hw1: 128, h: 26, zs: 130, ze: 700 },
    { hw0: 40, hw1: 96, h: 24, zs: 220, ze: 690 },
    { hw0: 28, hw1: 62, h: 22, zs: 330, ze: 680 },
  ],
  canyonHalf: 9, // central slot along the top tier
};

export function cityTopY(z) {
  let y = dorsalH(z);
  for (const t of CITY.tiers) if (z >= t.zs && z <= t.ze) y += t.h;
  return y;
}

// Command tower
export const TOWER = {
  neck: { x: 38, z0: 562, z1: 648, yTop: 166 },
  bridge: { x: 112, z0: 590, z1: 652, y0: 166, y1: 200 },
  windows: { x: 24, y0: 181.5, y1: 186.5, z: 590 }, // bridge windows on the front face (interior deck 1 floor at 180)
  domes: { r: 22, x: 72, y: 203, z: 621 },
  mast: { r: 2.2, y0: 200, y1: 262, z: 621 },
};

// Engines (stern face)
export const ENGINES = {
  main: [
    { x: -178, y: 6, r: 40 },
    { x: 0, y: 8, r: 42 },
    { x: 178, y: 6, r: 40 },
  ],
  secondary: [
    { x: -90, y: 44, r: 15 },
    { x: 90, y: 44, r: 15 },
    { x: -272, y: -6, r: 16 },
    { x: 272, y: -6, r: 16 },
  ],
  z0: 740,
  z1: 800,
};

// Ventral reactor bulb
export const REACTOR = { x: 0, z: 260, r: 72 };

// Ventral hangar module: a box hanging below the ventral plateau with the bay opening in its floor.
// Matches layout.js HANGAR_OPENING (deck 5 origin z = 95, opening local z -130..-60 → world -35..+35).
export const HANGAR = {
  module: { x: 44, z0: -70, z1: 70, bottomY: -40 },
  opening: { x: 22, z0: -35, z1: 35 },
  interiorCeilingY: 0,
  deckY: -30,
};

// Chunking for LOD / culling along z
export const CHUNKS = 8;
export function chunkIndex(z) {
  return Math.min(CHUNKS - 1, Math.max(0, Math.floor(((z - HULL.bowZ) / (HULL.sternZ - HULL.bowZ)) * CHUNKS)));
}
export function chunkCenterZ(i) {
  return HULL.bowZ + ((i + 0.5) / CHUNKS) * (HULL.sternZ - HULL.bowZ);
}
