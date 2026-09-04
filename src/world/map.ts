/**
 * Authored geography of Bahía Vista.
 *
 * The world is a 20 km x 20 km square centred on the bay. +X is east, +Z is south (Three.js
 * right-handed, Y up), so "north" is -Z. All units are metres.
 *
 * The landmasses are composed from signed-distance primitives (negative inside land) with organic
 * noise, then turned into a heightfield + zone map. Everything here is deterministic.
 */
import { clamp, fbm2, lerp, perlin2, ridged2, smin, smoothstep } from '../core/noise';
import { Rng } from '../core/seed';

export const WORLD_SIZE = 20000;
export const MAP_N = 2048;
export const CELL = WORLD_SIZE / MAP_N;
export const HALF = WORLD_SIZE / 2;

export enum Zone {
  OCEAN = 0,
  BAY = 1,
  BEACH = 2,
  MANGROVE = 3,
  PARK = 4,
  RES_LOW = 5,
  RES_MID = 6,
  DOWNTOWN = 7,
  HOTEL = 8,
  INDUSTRIAL = 9,
  AIRPORT = 10,
  GOLF = 11,
  ROCK = 12,
  LOT = 13,
  CONSTRUCTION = 14,
  STADIUM = 15,
  MARINA = 16,
  SANDBAR = 17,
  ROAD = 18,
  WETLAND_FLAT = 19,
}

export type Vec2 = [number, number];

export interface District {
  id: string;
  zone: Zone;
  cx: number;
  cz: number;
  hw: number;
  hh: number;
  rot: number;
  /** street grid spacing along local x / z (0 = no generated streets) */
  gridX: number;
  gridZ: number;
  /** building density 0..1 */
  density: number;
  /** min / max building height (m) for procedural fill */
  hMin: number;
  hMax: number;
}

export type RoadClass = 'highway' | 'causeway' | 'arterial' | 'street' | 'runway' | 'taxiway' | 'lane';

export interface RoadSpec {
  id: string;
  pts: Vec2[];
  cls: RoadClass;
  width: number;
  lanes: number;
  /** traffic vehicles per km */
  traffic: number;
}

export interface BridgeSpec {
  id: string;
  pts: Vec2[];
  width: number;
  /** low deck height above water */
  deck: number;
  /** if > 0, an arched high span rises to this height at archT */
  archHeight: number;
  archT: number;
  archLength: number;
  lanes: number;
  traffic: number;
}

export interface MarinaSpec { id: string; x: number; z: number; rot: number; piers: number; pierLen: number; }
export interface RunwaySpec { id: string; a: Vec2; b: Vec2; width: number; }
export interface Poi { id: string; kind: string; x: number; z: number; rot: number; size: number; }
export interface ChannelSpec { id: string; pts: Vec2[]; width: number; depth: number; boats: number; speed: number; bx: number; bz: number; br: number; }

function withBounds(c: Omit<ChannelSpec, 'bx' | 'bz' | 'br'>): ChannelSpec {
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const [x, z] of c.pts) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z); }
  const bx = (minX + maxX) / 2, bz = (minZ + maxZ) / 2;
  return { ...c, bx, bz, br: Math.max(maxX - minX, maxZ - minZ) / 2 + c.width + 80 };
}

interface Landmass {
  id: string;
  sd: (x: number, z: number) => number;
  /** bounding circle for fast rejection */
  bx: number;
  bz: number;
  br: number;
  /** metres of gently sloping sand before land reaches full height (0 = seawall) */
  beach: number;
  /** full land height */
  height: number;
  /** slope of seabed away from shore (m depth per m distance) */
  seabed: number;
  /** maximum depth this landmass' shelf reaches before the regional depth takes over */
  shelf: number;
  rocky?: boolean;
  wet?: boolean; // mangrove character: low, muddy, no beach
}

// ---------------------------------------------------------------- SDF helpers

function sdBox(px: number, pz: number, cx: number, cz: number, hw: number, hh: number, rot: number, r = 0): number {
  const c = Math.cos(-rot), s = Math.sin(-rot);
  const dx = px - cx, dz = pz - cz;
  const lx = dx * c - dz * s, lz = dx * s + dz * c;
  const qx = Math.abs(lx) - hw + r, qz = Math.abs(lz) - hh + r;
  const ox = Math.max(qx, 0), oz = Math.max(qz, 0);
  return Math.hypot(ox, oz) + Math.min(Math.max(qx, qz), 0) - r;
}

/** Organic island: ellipse whose radius is modulated by angular noise. */
function sdIsland(px: number, pz: number, cx: number, cz: number, rx: number, rz: number, rot: number, seed: number, rough = 0.18): number {
  const c = Math.cos(-rot), s = Math.sin(-rot);
  const dx = px - cx, dz = pz - cz;
  const lx = dx * c - dz * s, lz = dx * s + dz * c;
  const ang = Math.atan2(lz / rz, lx / rx);
  const n = fbm2(Math.cos(ang) * 1.7 + seed * 13.1, Math.sin(ang) * 1.7 + seed * 7.3, 4);
  const n2 = perlin2(Math.cos(ang) * 4.1 + seed, Math.sin(ang) * 4.1 - seed);
  const radial = 1 + rough * n + rough * 0.35 * n2;
  const k = Math.hypot(lx / (rx * radial), lz / (rz * radial));
  // approximate distance: scale by mean radius
  return (k - 1) * Math.min(rx, rz) * radial;
}

function sdSegment(px: number, pz: number, ax: number, az: number, bx: number, bz: number): number {
  const abx = bx - ax, abz = bz - az;
  const apx = px - ax, apz = pz - az;
  const t = clamp((apx * abx + apz * abz) / (abx * abx + abz * abz || 1), 0, 1);
  return Math.hypot(apx - abx * t, apz - abz * t);
}

function sdPolyline(px: number, pz: number, pts: Vec2[]): number {
  let d = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    d = Math.min(d, sdSegment(px, pz, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]));
  }
  return d;
}

/** Distance to a polyline where the width varies linearly per vertex (widths array). */
function sdVarPolyline(px: number, pz: number, pts: Vec2[], widths: number[]): number {
  let best = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1];
    const abx = bx - ax, abz = bz - az;
    const apx = px - ax, apz = pz - az;
    const t = clamp((apx * abx + apz * abz) / (abx * abx + abz * abz || 1), 0, 1);
    const d = Math.hypot(apx - abx * t, apz - abz * t) - lerp(widths[i], widths[i + 1], t);
    best = Math.min(best, d);
  }
  return best;
}

// ---------------------------------------------------------------- authored geography

/** The mainland coast runs north-south along x ≈ -2500 with bays and headlands. */
function mainlandCoastX(z: number): number {
  let x = -2500 + 320 * fbm2(z / 3400 + 3.1, 0.37, 3) + 110 * fbm2(z / 800 + 9.2, 1.1, 3);
  // downtown peninsula pushes into the bay
  x += 520 * Math.exp(-(((z + 3800) / 900) ** 2));
  // stadium / bayfront park headland
  x += 220 * Math.exp(-(((z + 2500) / 500) ** 2));
  // southern residential shore with canals sits a little further west
  x -= 250 * smoothstep(1200, 2400, z) * (1 - smoothstep(3200, 4200, z));
  return x;
}

const RIVER: Vec2[] = [[-2100, -3050], [-2900, -2900], [-3700, -2650], [-4600, -2150], [-5500, -1500], [-6500, -700]];
const RIVER_W = [95, 80, 62, 50, 40, 32];

export function createLandmasses(): Landmass[] {
  const L: Landmass[] = [];

  L.push({
    id: 'mainland', bx: -6000, bz: 0, br: 20000,
    sd: (x, z) => {
      let d = x - mainlandCoastX(z);
      // the river carves into the mainland
      const r = sdVarPolyline(x, z, RIVER, RIVER_W);
      d = Math.max(d, -r);
      return d;
    },
    beach: 40, height: 3.2, seabed: 0.02, shelf: 3.2,
  });

  // Barrier island: long, thin, curving to a south-west pointing tip where the reference bridge lands.
  const barrier: Vec2[] = [[2750, -8200], [2700, -6800], [2640, -5400], [2600, -4000], [2520, -2600], [2400, -1500], [2250, -900], [2050, -500]];
  const barrierW = [280, 420, 460, 430, 380, 330, 240, 90];
  L.push({
    id: 'barrier', bx: 2500, bz: -4200, br: 5200,
    sd: (x, z) => {
      const d = sdVarPolyline(x, z, barrier, barrierW);
      const n = 60 * fbm2(x / 700 + 1.2, z / 700 + 4.4, 3);
      return d + n;
    },
    beach: 90, height: 2.6, seabed: 0.012, shelf: 6,
  });

  // Hero island ("Isla Garza") - reference near island with a lagoon and beaches.
  L.push({
    id: 'garza', bx: 300, bz: 2400, br: 1500,
    sd: (x, z) => {
      let d = sdIsland(x, z, 300, 2400, 780, 360, 0.08, 11, 0.16);
      d = smin(d, sdIsland(x, z, -350, 2520, 320, 210, -0.2, 12, 0.22), 120);
      d = smin(d, sdIsland(x, z, 980, 2330, 300, 230, 0.3, 13, 0.25), 140);
      // interior lagoon
      const lagoon = sdIsland(x, z, 470, 2380, 150, 95, 0.4, 14, 0.3);
      d = Math.max(d, -lagoon + 15);
      return d;
    },
    beach: 70, height: 2.4, seabed: 0.01, shelf: 3.5,
  });

  // Islands west of Garza on the southern causeway chain.
  L.push({ id: 'isla-b', bx: -1350, bz: 2560, br: 800, sd: (x, z) => sdIsland(x, z, -1350, 2560, 420, 260, 0.05, 21, 0.2), beach: 50, height: 2.3, seabed: 0.012, shelf: 3.5 });

  // Southern Key: big island with beach east, mangroves west, airstrip, golf.
  L.push({
    id: 'southkey', bx: 1900, bz: 5700, br: 3200,
    sd: (x, z) => {
      let d = sdIsland(x, z, 1900, 5700, 1500, 1050, 0.25, 31, 0.14);
      d = smin(d, sdIsland(x, z, 1000, 6400, 700, 500, -0.3, 32, 0.24), 300);
      d = smin(d, sdIsland(x, z, 2900, 4900, 500, 700, 0.5, 33, 0.18), 260);
      return d;
    },
    beach: 80, height: 2.8, seabed: 0.014, shelf: 6, rocky: true,
  });

  // Isla Tortuga: low island where the reference bridge lands before continuing to the barrier tip.
  L.push({ id: 'tortuga', bx: 1180, bz: -830, br: 900, sd: (x, z) => sdIsland(x, z, 1180, -830, 520, 300, 0.35, 51, 0.2), beach: 55, height: 2.3, seabed: 0.012, shelf: 3.5 });

  // Port island (hard seawalls) in the north-west of the bay, off downtown.
  L.push({ id: 'port', bx: -1150, bz: -3050, br: 1300, sd: (x, z) => sdBox(x, z, -1150, -3050, 950, 300, 0.04, 30), beach: 0, height: 3.0, seabed: 0.06, shelf: 6 });

  // Northern causeway hop islands.
  L.push({ id: 'isla-n1', bx: -450, bz: -3900, br: 700, sd: (x, z) => sdIsland(x, z, -450, -3900, 330, 200, 0.1, 41, 0.2), beach: 45, height: 2.3, seabed: 0.012, shelf: 3.5 });
  L.push({ id: 'isla-n2', bx: 700, bz: -4000, br: 750, sd: (x, z) => sdIsland(x, z, 700, -4000, 360, 210, -0.15, 42, 0.2), beach: 45, height: 2.3, seabed: 0.012, shelf: 3.5 });
  L.push({ id: 'isla-n3', bx: 1550, bz: -4100, br: 600, sd: (x, z) => sdIsland(x, z, 1550, -4100, 260, 170, 0.2, 43, 0.22), beach: 45, height: 2.3, seabed: 0.012, shelf: 3.5 });

  // Bay-side finger islands of the barrier island (canal estates).
  for (let i = 0; i < 5; i++) {
    const z0 = -3000 + i * 330;
    L.push({ id: `finger-${i}`, bx: 1870 - i * 25, bz: z0, br: 520, sd: (x, z) => sdBox(x, z, 1870 - i * 25, z0, 300, 95, 0.02, 40), beach: 25, height: 2.4, seabed: 0.05, shelf: 3.5 });
  }

  // Mangrove islets: north-west shore and south-west flats.
  const rng = new Rng('mangrove-islets');
  const clusters: [number, number, number, number, number][] = [
    [-1700, -1800, 900, 600, 9],
    [-1500, 1300, 800, 500, 8],
    [-500, -6200, 1800, 900, 12],
    [900, -6600, 1200, 700, 8],
    [700, 4300, 700, 450, 6],
    [-1000, 4600, 1100, 600, 7],
  ];
  for (const [cx, cz, sx, sz, n] of clusters) {
    for (let i = 0; i < n; i++) {
      const ix = cx + rng.gauss() * sx * 0.45, iz = cz + rng.gauss() * sz * 0.45;
      const rx = rng.range(70, 240), rz = rng.range(60, 180), rot = rng.range(0, Math.PI), seed = rng.int(100, 900);
      L.push({ id: `mang-${cx}-${i}`, bx: ix, bz: iz, br: Math.max(rx, rz) * 1.6 + 60, sd: (x, z) => sdIsland(x, z, ix, iz, rx, rz, rot, seed, 0.35), beach: 0, height: 0.55, seabed: 0.004, shelf: 1.6, wet: true });
    }
  }

  return L;
}

// ---------------------------------------------------------------- districts, roads, bridges

export function createDistricts(): District[] {
  const D: District[] = [];
  const add = (d: District) => D.push(d);
  add({ id: 'downtown', zone: Zone.DOWNTOWN, cx: -2650, cz: -3900, hw: 750, hh: 620, rot: 0.02, gridX: 130, gridZ: 110, density: 0.92, hMin: 40, hMax: 260 });
  add({ id: 'brickell', zone: Zone.RES_MID, cx: -2900, cz: -2350, hw: 550, hh: 420, rot: 0.02, gridX: 120, gridZ: 120, density: 0.85, hMin: 25, hMax: 120 });
  add({ id: 'midtown', zone: Zone.RES_MID, cx: -3500, cz: -5300, hw: 900, hh: 700, rot: 0.0, gridX: 120, gridZ: 140, density: 0.8, hMin: 12, hMax: 60 });
  add({ id: 'north-res', zone: Zone.RES_LOW, cx: -5600, cz: -5400, hw: 2100, hh: 1800, rot: 0.0, gridX: 95, gridZ: 140, density: 0.75, hMin: 4, hMax: 11 });
  add({ id: 'west-res', zone: Zone.RES_LOW, cx: -5300, cz: -2700, hw: 1500, hh: 1150, rot: 0.0, gridX: 100, gridZ: 130, density: 0.75, hMin: 4, hMax: 12 });
  add({ id: 'south-res', zone: Zone.RES_LOW, cx: -4200, cz: 1300, hw: 1700, hh: 1500, rot: 0.0, gridX: 105, gridZ: 135, density: 0.7, hMin: 4, hMax: 10 });
  add({ id: 'far-west-res', zone: Zone.RES_LOW, cx: -8600, cz: -4200, hw: 1300, hh: 3000, rot: 0.0, gridX: 100, gridZ: 140, density: 0.65, hMin: 4, hMax: 10 });
  add({ id: 'far-south-res', zone: Zone.RES_LOW, cx: -7200, cz: 4300, hw: 2600, hh: 1400, rot: 0.0, gridX: 105, gridZ: 140, density: 0.6, hMin: 4, hMax: 10 });
  add({ id: 'south-shore-res', zone: Zone.RES_LOW, cx: -3900, cz: 3900, hw: 1400, hh: 900, rot: 0.0, gridX: 105, gridZ: 135, density: 0.6, hMin: 4, hMax: 10 });
  add({ id: 'far-south-res-2', zone: Zone.RES_LOW, cx: -4800, cz: 6500, hw: 2000, hh: 1200, rot: 0.0, gridX: 110, gridZ: 140, density: 0.5, hMin: 4, hMax: 9 });
  add({ id: 'north-res-2', zone: Zone.RES_LOW, cx: -4800, cz: -8000, hw: 2400, hh: 800, rot: 0.0, gridX: 100, gridZ: 140, density: 0.55, hMin: 4, hMax: 10 });
  add({ id: 'south-bayfront', zone: Zone.RES_MID, cx: -3000, cz: -900, hw: 480, hh: 650, rot: 0.0, gridX: 120, gridZ: 130, density: 0.6, hMin: 8, hMax: 35 });
  add({ id: 'industrial-river', zone: Zone.INDUSTRIAL, cx: -3300, cz: -3050, hw: 700, hh: 380, rot: -0.1, gridX: 170, gridZ: 160, density: 0.6, hMin: 6, hMax: 16 });
  add({ id: 'industrial-port', zone: Zone.INDUSTRIAL, cx: -1150, cz: -3050, hw: 950, hh: 300, rot: 0.04, gridX: 0, gridZ: 0, density: 0.5, hMin: 6, hMax: 14 });
  add({ id: 'hotel-south', zone: Zone.HOTEL, cx: 2330, cz: -1500, hw: 330, hh: 1250, rot: -0.12, gridX: 130, gridZ: 110, density: 0.85, hMin: 20, hMax: 110 });
  add({ id: 'hotel-mid', zone: Zone.HOTEL, cx: 2600, cz: -3800, hw: 300, hh: 1300, rot: -0.03, gridX: 130, gridZ: 105, density: 0.85, hMin: 25, hMax: 130 });
  add({ id: 'barrier-res', zone: Zone.RES_LOW, cx: 2650, cz: -6900, hw: 350, hh: 1200, rot: 0.0, gridX: 90, gridZ: 110, density: 0.7, hMin: 4, hMax: 12 });
  add({ id: 'barrier-golf', zone: Zone.GOLF, cx: 2680, cz: -5300, hw: 420, hh: 520, rot: 0.0, gridX: 0, gridZ: 0, density: 0, hMin: 0, hMax: 0 });
  add({ id: 'garza-res', zone: Zone.RES_LOW, cx: -120, cz: 2420, hw: 260, hh: 180, rot: 0.08, gridX: 110, gridZ: 120, density: 0.5, hMin: 4, hMax: 9 });
  add({ id: 'garza-park', zone: Zone.PARK, cx: 1000, cz: 2330, hw: 300, hh: 240, rot: 0.3, gridX: 0, gridZ: 0, density: 0, hMin: 0, hMax: 0 });
  add({ id: 'southkey-res', zone: Zone.RES_LOW, cx: 2200, cz: 5300, hw: 700, hh: 500, rot: 0.25, gridX: 100, gridZ: 120, density: 0.6, hMin: 4, hMax: 10 });
  add({ id: 'southkey-golf', zone: Zone.GOLF, cx: 1300, cz: 6300, hw: 550, hh: 420, rot: -0.3, gridX: 0, gridZ: 0, density: 0, hMin: 0, hMax: 0 });
  add({ id: 'airport', zone: Zone.AIRPORT, cx: -7100, cz: -1400, hw: 1600, hh: 900, rot: 0.0, gridX: 0, gridZ: 0, density: 0, hMin: 0, hMax: 0 });
  add({ id: 'airstrip', zone: Zone.AIRPORT, cx: 2500, cz: 5750, hw: 700, hh: 130, rot: 0.55, gridX: 0, gridZ: 0, density: 0, hMin: 0, hMax: 0 });
  add({ id: 'stadium-lot', zone: Zone.LOT, cx: -2900, cz: -2000, hw: 330, hh: 260, rot: 0.0, gridX: 0, gridZ: 0, density: 0, hMin: 0, hMax: 0 });
  add({ id: 'bayfront-park', zone: Zone.PARK, cx: -2050, cz: -4300, hw: 170, hh: 380, rot: 0.02, gridX: 0, gridZ: 0, density: 0, hMin: 0, hMax: 0 });
  add({ id: 'finger-res', zone: Zone.RES_LOW, cx: 1820, cz: -2340, hw: 330, hh: 760, rot: 0.02, gridX: 0, gridZ: 0, density: 0.7, hMin: 4, hMax: 9 });
  add({ id: 'tortuga-res', zone: Zone.RES_LOW, cx: 1180, cz: -830, hw: 420, hh: 230, rot: 0.35, gridX: 100, gridZ: 110, density: 0.55, hMin: 4, hMax: 10 });
  add({ id: 'isla-b-res', zone: Zone.RES_LOW, cx: -1350, cz: 2560, hw: 330, hh: 190, rot: 0.05, gridX: 100, gridZ: 100, density: 0.5, hMin: 4, hMax: 9 });
  add({ id: 'isla-n-res', zone: Zone.RES_LOW, cx: 700, cz: -4000, hw: 300, hh: 160, rot: -0.15, gridX: 100, gridZ: 100, density: 0.5, hMin: 4, hMax: 9 });
  add({ id: 'isla-n1-res', zone: Zone.RES_LOW, cx: -450, cz: -3900, hw: 270, hh: 150, rot: 0.1, gridX: 100, gridZ: 100, density: 0.5, hMin: 4, hMax: 9 });
  add({ id: 'construction-dt', zone: Zone.CONSTRUCTION, cx: -2250, cz: -4250, hw: 70, hh: 60, rot: 0.02, gridX: 0, gridZ: 0, density: 0, hMin: 0, hMax: 0 });
  add({ id: 'construction-dt2', zone: Zone.CONSTRUCTION, cx: -3150, cz: -3550, hw: 65, hh: 55, rot: 0.02, gridX: 0, gridZ: 0, density: 0, hMin: 0, hMax: 0 });
  add({ id: 'construction-hotel', zone: Zone.CONSTRUCTION, cx: 2480, cz: -2450, hw: 60, hh: 60, rot: -0.1, gridX: 0, gridZ: 0, density: 0, hMin: 0, hMax: 0 });
  return D;
}

export function createRoads(): RoadSpec[] {
  const R: RoadSpec[] = [];
  // Coastal highway on the southern chain (reference left edge) and across Garza.
  R.push({ id: 'south-hwy-mainland', cls: 'highway', width: 22, lanes: 4, traffic: 14, pts: [[-6000, 2650], [-4500, 2700], [-3400, 2720], [-2500, 2680]] });
  R.push({ id: 'garza-hwy', cls: 'highway', width: 22, lanes: 4, traffic: 14, pts: [[-1650, 2590], [-1050, 2540], [-620, 2520]] });
  R.push({ id: 'garza-hwy-2', cls: 'highway', width: 22, lanes: 4, traffic: 14, pts: [[-420, 2500], [-200, 2350], [-40, 2060]] });
  R.push({ id: 'garza-east', cls: 'arterial', width: 14, lanes: 2, traffic: 5, pts: [[-200, 2350], [200, 2470], [600, 2420], [1000, 2200]] });
  R.push({ id: 'tortuga-rd', cls: 'highway', width: 22, lanes: 4, traffic: 12, pts: [[980, -400], [1200, -720], [1480, -1050]] });
  // Downtown arterials
  R.push({ id: 'dt-bayshore', cls: 'arterial', width: 16, lanes: 4, traffic: 10, pts: [[-2200, -4600], [-2150, -4200], [-2100, -3700], [-2200, -3300], [-2500, -2900], [-2650, -2400], [-2700, -1800], [-2650, -1200]] });
  R.push({ id: 'dt-avenue', cls: 'arterial', width: 16, lanes: 4, traffic: 9, pts: [[-3400, -6000], [-3400, -4600], [-3350, -3500], [-3300, -2600], [-3350, -1500], [-3400, 0], [-3400, 1600], [-3400, 2700]] });
  R.push({ id: 'west-arterial', cls: 'arterial', width: 15, lanes: 4, traffic: 7, pts: [[-6800, -7000], [-6800, -4000], [-6800, -300], [-6900, 1500], [-6900, 2650]] });
  R.push({ id: 'north-arterial', cls: 'arterial', width: 15, lanes: 4, traffic: 7, pts: [[-8500, -5300], [-6800, -5300], [-4400, -5300], [-3400, -5300]] });
  R.push({ id: 'airport-rd', cls: 'arterial', width: 14, lanes: 2, traffic: 6, pts: [[-6800, -300], [-6500, -400], [-6200, -500], [-5700, -420]] });
  R.push({ id: 'mid-arterial', cls: 'arterial', width: 15, lanes: 4, traffic: 7, pts: [[-8500, -300], [-6800, -300], [-5500, -300], [-4400, -320], [-3400, -300]] });
  R.push({ id: 'south-arterial', cls: 'arterial', width: 15, lanes: 4, traffic: 6, pts: [[-8500, 1200], [-6900, 1200], [-5000, 1250], [-3400, 1300]] });
  // Barrier island spine road (Collins-like) and beach road
  R.push({ id: 'barrier-spine', cls: 'arterial', width: 16, lanes: 4, traffic: 10, pts: [[2720, -8000], [2680, -6600], [2620, -5200], [2600, -4000], [2520, -2600], [2400, -1500], [2260, -800], [2050, -420]] });
  R.push({ id: 'barrier-beach-rd', cls: 'street', width: 10, lanes: 2, traffic: 4, pts: [[2900, -6500], [2880, -5200], [2850, -4000], [2790, -2700], [2650, -1500], [2480, -900]] });
  // Southern key
  R.push({ id: 'southkey-rd', cls: 'arterial', width: 14, lanes: 2, traffic: 5, pts: [[1400, 4550], [1600, 5000], [1900, 5400], [2300, 5700], [2700, 6100], [3000, 6500]] });
  R.push({ id: 'southkey-rd-2', cls: 'street', width: 10, lanes: 2, traffic: 3, pts: [[1900, 5400], [1500, 5900], [1100, 6400]] });
  // Island streets
  R.push({ id: 'isla-n-rd', cls: 'arterial', width: 14, lanes: 2, traffic: 6, pts: [[-780, -3880], [-450, -3880], [-130, -3900]] });
  R.push({ id: 'isla-n2-rd', cls: 'arterial', width: 14, lanes: 2, traffic: 6, pts: [[360, -3980], [700, -3990], [1050, -4030]] });
  R.push({ id: 'isla-n3-rd', cls: 'arterial', width: 14, lanes: 2, traffic: 6, pts: [[1300, -4080], [1550, -4100], [1800, -4120]] });
  // Port roads
  R.push({ id: 'port-rd', cls: 'arterial', width: 14, lanes: 2, traffic: 5, pts: [[-2050, -3050], [-1600, -3050], [-1150, -3050], [-700, -3060], [-260, -3070]] });
  return R;
}

export function createBridges(): BridgeSpec[] {
  const B: BridgeSpec[] = [];
  // Reference bridge: Garza north shore -> barrier tip, long low causeway with an arched channel span.
  B.push({ id: 'garza-bridge', pts: [[-40, 2060], [330, 1250], [700, 300], [980, -400]], width: 22, deck: 7, archHeight: 24, archT: 0.55, archLength: 520, lanes: 4, traffic: 12 });
  B.push({ id: 'tortuga-bridge', pts: [[1480, -1050], [1800, -600], [2050, -500]], width: 22, deck: 7, archHeight: 18, archT: 0.45, archLength: 380, lanes: 4, traffic: 12 });
  // Southern chain hops
  B.push({ id: 'garza-west', pts: [[-620, 2520], [-420, 2500]], width: 22, deck: 6, archHeight: 0, archT: 0.5, archLength: 0, lanes: 4, traffic: 14 });
  B.push({ id: 'islab-west', pts: [[-2500, 2680], [-2100, 2650], [-1650, 2590]], width: 22, deck: 7, archHeight: 18, archT: 0.45, archLength: 360, lanes: 4, traffic: 14 });
  // Garza -> Southern Key
  B.push({ id: 'southkey-bridge', pts: [[1000, 2200], [1150, 3000], [1300, 3800], [1400, 4550]], width: 16, deck: 8, archHeight: 22, archT: 0.35, archLength: 420, lanes: 2, traffic: 5 });
  // Northern causeway (downtown -> barrier) with hops
  B.push({ id: 'north-cw-1', pts: [[-2100, -3700], [-1500, -3780], [-780, -3880]], width: 24, deck: 8, archHeight: 26, archT: 0.4, archLength: 480, lanes: 6, traffic: 14 });
  B.push({ id: 'north-cw-2', pts: [[-130, -3900], [360, -3980]], width: 24, deck: 8, archHeight: 0, archT: 0.5, archLength: 0, lanes: 6, traffic: 14 });
  B.push({ id: 'north-cw-3', pts: [[1050, -4030], [1300, -4080]], width: 24, deck: 8, archHeight: 0, archT: 0.5, archLength: 0, lanes: 6, traffic: 14 });
  B.push({ id: 'north-cw-4', pts: [[1800, -4120], [2200, -4080], [2600, -4000]], width: 24, deck: 8, archHeight: 20, archT: 0.5, archLength: 380, lanes: 6, traffic: 14 });
  // Far north causeway to the barrier island's residential end
  B.push({ id: 'far-north-cw', pts: [[-2300, -6700], [-1000, -6750], [500, -6800], [1800, -6850], [2650, -6900]], width: 18, deck: 7, archHeight: 16, archT: 0.55, archLength: 360, lanes: 4, traffic: 7 });
  // Port bridge from downtown
  B.push({ id: 'port-bridge', pts: [[-2200, -3300], [-2050, -3050]], width: 14, deck: 6, archHeight: 0, archT: 0.5, archLength: 0, lanes: 2, traffic: 5 });
  return B;
}

export function createMarinas(): MarinaSpec[] {
  return [
    { id: 'dt-marina', x: -2000, z: -4150, rot: Math.PI * 0.5, piers: 7, pierLen: 110 },
    { id: 'garza-marina', x: 420, z: 2035, rot: 0, piers: 5, pierLen: 90 },
    { id: 'barrier-marina', x: 2080, z: -1400, rot: Math.PI * 0.5, piers: 6, pierLen: 100 },
    { id: 'south-marina', x: -2350, z: 2950, rot: Math.PI, piers: 4, pierLen: 80 },
    { id: 'southkey-marina', x: 1200, z: 5150, rot: -0.9, piers: 4, pierLen: 80 },
    { id: 'north-marina', x: -2050, z: -5600, rot: Math.PI * 0.5, piers: 5, pierLen: 90 },
  ];
}

export function createRunways(): RunwaySpec[] {
  return [
    { id: 'rwy-09', a: [-8450, -1350], b: [-5750, -1350], width: 50 },
    { id: 'rwy-13', a: [-7900, -2150], b: [-6250, -700], width: 42 },
    { id: 'strip-southkey', a: [1950, 5450], b: [3100, 6100], width: 24 },
  ];
}

export function createChannels(): ChannelSpec[] {
  return ([
    // main shipping channel from the bay mouth to the port
    { id: 'ship-channel', pts: [[4200, 2200], [3000, 1600], [2000, 600], [1000, -1200], [200, -2600], [-450, -3350]], width: 180, depth: 14, boats: 3, speed: 5 },
    // intracoastal along the barrier island bay side
    { id: 'intracoastal', pts: [[1800, -7600], [1900, -6200], [1950, -4500], [2000, -3200], [1950, -1800], [1850, -800], [1700, 200]], width: 110, depth: 6, boats: 8, speed: 9 },
    // reference channel under the Garza bridge arch and toward the mouth
    { id: 'garza-channel', pts: [[-1000, 3300], [200, 3250], [1000, 3100], [1900, 2400], [2600, 1400], [3400, 400]], width: 90, depth: 7, boats: 9, speed: 12 },
    { id: 'arch-channel', pts: [[-1200, 1200], [-300, 1000], [500, 750], [1400, 300], [2400, -100]], width: 100, depth: 8, boats: 6, speed: 11 },
    { id: 'ref-boats', pts: [[-500, 3650], [200, 3450], [900, 3150], [1600, 2750]], width: 40, depth: 4, boats: 3, speed: 15 },
    // south-west flats route
    { id: 'flats-route', pts: [[-2100, 3400], [-1200, 3500], [-300, 3600], [700, 3700], [1500, 4100]], width: 40, depth: 3, boats: 5, speed: 10 },
    // bay crossing pleasure route
    { id: 'bay-route', pts: [[-1900, -4300], [-1200, -2500], [-600, -600], [0, 1200], [500, 1900]], width: 60, depth: 4, boats: 7, speed: 9 },
    { id: 'north-route', pts: [[-1800, -5900], [-800, -5200], [200, -4600], [1200, -4600], [1900, -5200]], width: 60, depth: 4, boats: 5, speed: 8 },
    { id: 'ocean-route', pts: [[3800, -8000], [3700, -5000], [3600, -2000], [3700, 1000], [3900, 4000], [4100, 7000]], width: 300, depth: 25, boats: 4, speed: 6 },
  ] as Omit<ChannelSpec, 'bx' | 'bz' | 'br'>[]).map(withBounds);
}

export function createPois(): Poi[] {
  return [
    { id: 'stadium', kind: 'stadium', x: -2900, z: -2450, rot: 0.15, size: 150 },
    { id: 'lighthouse', kind: 'lighthouse', x: 3250, z: 5300, rot: 0, size: 30 },
    { id: 'terminal', kind: 'terminal', x: -7100, z: -1900, rot: 0, size: 220 },
    { id: 'hangars', kind: 'hangars', x: -6300, z: -2000, rot: 0, size: 120 },
    { id: 'cranes-port', kind: 'cranes', x: -1150, z: -3330, rot: 0, size: 1600 },
    { id: 'cruise', kind: 'cruise', x: -900, z: -2780, rot: 0, size: 300 },
    { id: 'tanks', kind: 'tanks', x: -3600, z: -3100, rot: 0, size: 160 },
    { id: 'seaplane-base', kind: 'seaplane', x: -2050, z: -4700, rot: Math.PI * 0.5, size: 60 },
  ];
}

// ---------------------------------------------------------------- generation

export interface WorldMapData {
  n: number;
  height: Float32Array;
  zone: Uint8Array;
  /** 0..255 vegetation / moisture */
  veg: Uint8Array;
  /** distance to nearest land in metres (positive over water, negative over land) */
  coast: Float32Array;
  districts: District[];
  roads: RoadSpec[];
  bridges: BridgeSpec[];
  marinas: MarinaSpec[];
  runways: RunwaySpec[];
  channels: ChannelSpec[];
  pois: Poi[];
}

export class WorldMap implements WorldMapData {
  n = MAP_N;
  height = new Float32Array(MAP_N * MAP_N);
  zone = new Uint8Array(MAP_N * MAP_N);
  veg = new Uint8Array(MAP_N * MAP_N);
  coast = new Float32Array(MAP_N * MAP_N);
  districts = createDistricts();
  roads = createRoads();
  bridges = createBridges();
  marinas = createMarinas();
  runways = createRunways();
  channels = createChannels();
  pois = createPois();
  landmasses = createLandmasses();

  /** world x,z -> map cell coordinates (float) */
  toCell(x: number, z: number): [number, number] {
    return [((x + HALF) / WORLD_SIZE) * MAP_N, ((z + HALF) / WORLD_SIZE) * MAP_N];
  }

  heightAt(x: number, z: number): number {
    const [cx, cz] = this.toCell(x, z);
    const x0 = clamp(Math.floor(cx), 0, MAP_N - 2), z0 = clamp(Math.floor(cz), 0, MAP_N - 2);
    const fx = clamp(cx - x0, 0, 1), fz = clamp(cz - z0, 0, 1);
    const h = this.height;
    const a = h[z0 * MAP_N + x0], b = h[z0 * MAP_N + x0 + 1];
    const c = h[(z0 + 1) * MAP_N + x0], d = h[(z0 + 1) * MAP_N + x0 + 1];
    return lerp(lerp(a, b, fx), lerp(c, d, fx), fz);
  }

  zoneAt(x: number, z: number): Zone {
    const [cx, cz] = this.toCell(x, z);
    const ix = clamp(Math.round(cx), 0, MAP_N - 1), iz = clamp(Math.round(cz), 0, MAP_N - 1);
    return this.zone[iz * MAP_N + ix] as Zone;
  }

  coastAt(x: number, z: number): number {
    const [cx, cz] = this.toCell(x, z);
    const ix = clamp(Math.round(cx), 0, MAP_N - 1), iz = clamp(Math.round(cz), 0, MAP_N - 1);
    return this.coast[iz * MAP_N + ix];
  }

  isLand(x: number, z: number): boolean {
    return this.heightAt(x, z) > 0.05;
  }

  districtAt(x: number, z: number): District | null {
    for (const d of this.districts) {
      if (sdBox(x, z, d.cx, d.cz, d.hw, d.hh, d.rot) < 0) return d;
    }
    return null;
  }

  /** Regional water depth (positive metres) ignoring shore shelves. */
  regionalDepth(x: number, z: number): number {
    // bay is shallow and turquoise; deepens towards the mouth and the ocean.
    let depth = 3.0 + 2.6 * (0.5 + 0.5 * fbm2(x / 1100, z / 1100, 3)) + 1.2 * fbm2(x / 350 + 4.0, z / 350, 2);
    // ocean beyond the barrier island / south key: continental shelf ramp
    const oceanEdge = 3050 + 200 * fbm2(z / 4000, 0.5, 2);
    const east = x - oceanEdge;
    if (east > 0) depth = Math.max(depth, 4 + east * 0.011 + 6 * smoothstep(600, 1800, east) + 14 * smoothstep(1800, 4500, east));
    // bay mouth (between barrier tip and south key) is deeper
    const mouth = smoothstep(-400, 1400, x + 300 * fbm2(z / 1200, 3.3, 2)) * (1 - smoothstep(0.4, 1.4, Math.hypot((x - 2600) / 2600, (z - 1900) / 2400)));
    depth += 4.5 * mouth;
    // south of the south key the water is open ocean
    const south = smoothstep(7200, 9400, z + 400 * fbm2(x / 3000, 1.7, 2));
    depth += 18 * south;
    const north = smoothstep(8300, 9800, -z + 400 * fbm2(x / 3000, 5.1, 2));
    depth += 10 * north;
    // sand ridges near the mouth make turquoise streaks
    const ridge = ridged2(x / 900 + 2.0, z / 380 + 1.0, 3);
    depth -= 1.6 * ridge * mouth;
    return depth;
  }

  generate(onProgress?: (p: number) => void): void {
    const n = MAP_N;
    const L = this.landmasses;
    const coarseN = 512;
    const cStep = n / coarseN;
    // Pass 1: coarse landmass SDF + nearest landmass id (SDFs are smooth so bilinear upsampling is safe)
    const cSd = new Float32Array(coarseN * coarseN);
    const cId = new Int16Array(coarseN * coarseN);
    const cDepth = new Float32Array(coarseN * coarseN);
    const cLandNoise = new Float32Array(coarseN * coarseN);
    for (let j = 0; j < coarseN; j++) {
      const z = -HALF + (j + 0.5) * CELL * cStep;
      for (let i = 0; i < coarseN; i++) {
        const x = -HALF + (i + 0.5) * CELL * cStep;
        let best = Infinity, id = -1;
        for (let k = 0; k < L.length; k++) {
          const lm = L[k];
          // cheap bounding-circle rejection: the true distance can't be smaller than this
          const bound = Math.hypot(x - lm.bx, z - lm.bz) - lm.br;
          if (bound > best) continue;
          const d = lm.sd(x, z);
          if (d < best) { best = d; id = k; }
        }
        cSd[j * coarseN + i] = best;
        cId[j * coarseN + i] = id;
        cDepth[j * coarseN + i] = this.regionalDepth(x, z);
        cLandNoise[j * coarseN + i] = fbm2(x / 260, z / 260, 3);
      }
      if (onProgress && (j & 31) === 0) onProgress((j / coarseN) * 0.35);
    }

    const bilerp = (arr: Float32Array, fx: number, fz: number, x0: number, z0: number): number => {
      const i00 = z0 * coarseN + x0;
      return lerp(lerp(arr[i00], arr[i00 + 1], fx), lerp(arr[i00 + coarseN], arr[i00 + coarseN + 1], fx), fz);
    };
    let sTx = 0, sTz = 0, sX0 = 0, sZ0 = 0;
    const sampleCoarse = (cx: number, cz: number): [number, number] => {
      const fx = clamp(cx / cStep - 0.5, 0, coarseN - 1.001), fz = clamp(cz / cStep - 0.5, 0, coarseN - 1.001);
      const x0 = Math.floor(fx), z0 = Math.floor(fz);
      const tx = fx - x0, tz = fz - z0;
      sTx = tx; sTz = tz; sX0 = x0; sZ0 = z0;
      const sd = bilerp(cSd, tx, tz, x0, z0);
      const i00 = z0 * coarseN + x0, i10 = i00 + 1, i01 = i00 + coarseN, i11 = i01 + 1;
      // nearest id: take the corner with smallest sd
      let id = cId[i00], m = cSd[i00];
      if (cSd[i10] < m) { m = cSd[i10]; id = cId[i10]; }
      if (cSd[i01] < m) { m = cSd[i01]; id = cId[i01]; }
      if (cSd[i11] < m) { m = cSd[i11]; id = cId[i11]; }
      return [sd, id];
    };

    const channels = this.channels;
    const runways = this.runways;
    const districts = this.districts;

    // Pass 2: full-resolution heights, zones
    for (let j = 0; j < n; j++) {
      const z = -HALF + (j + 0.5) * CELL;
      for (let i = 0; i < n; i++) {
        const x = -HALF + (i + 0.5) * CELL;
        const idx = j * n + i;
        let [sd, id] = sampleCoarse(i + 0.5, j + 0.5);
        const lm = L[id];
        // fine shoreline detail (only matters within a few dozen metres of the coast)
        if (Math.abs(sd) < 90 && (lm.beach > 0 || lm.wet)) {
          const fine = 9 * perlin2(x / 60 + 3.3, z / 60 - 1.7) + 4 * perlin2(x / 21 + 8.1, z / 21 + 2.2);
          sd += fine * (lm.wet ? 1.8 : 1.0);
        }
        this.coast[idx] = sd;
        const landNoise = bilerp(cLandNoise, sTx, sTz, sX0, sZ0);

        let h: number;
        let zone: Zone;
        let veg = 0;
        if (sd < 0) {
          // LAND
          const inland = -sd;
          if (lm.wet) {
            h = 0.15 + lm.height * smoothstep(0, 60, inland) + 0.15 * perlin2(x / 30, z / 30);
            zone = Zone.MANGROVE;
            veg = 200;
          } else if (lm.beach === 0) {
            h = lm.height + 0.2 * perlin2(x / 40, z / 40);
            zone = Zone.INDUSTRIAL;
            veg = 10;
          } else {
            const beachW = lm.beach * (0.55 + 0.9 * (0.5 + 0.5 * perlin2(x / 240 + 1.7, z / 240 - 4.1)));
            const ramp = smoothstep(0, beachW, inland);
            h = 0.25 + (lm.height - 0.25) * ramp + 0.6 * landNoise * ramp + 0.12 * perlin2(x / 18, z / 18);
            // dunes on ocean-facing beaches of the barrier island / south key
            if (lm.id === 'barrier' || lm.id === 'southkey') {
              const dune = smoothstep(30, 70, inland) * (1 - smoothstep(90, 160, inland));
              h += 2.2 * dune * (0.6 + 0.4 * ridged2(x / 140, z / 140, 3));
            }
            zone = ramp < 0.45 ? Zone.BEACH : Zone.RES_LOW;
            veg = ramp < 0.45 ? 20 : 150;
            if (lm.rocky && ramp < 0.5) {
              const rock = ridged2(x / 90 + 5, z / 90 + 5, 3);
              if (rock > 0.62 && x > 2400) { zone = Zone.ROCK; h += 1.4 * (rock - 0.6) * 4; veg = 0; }
            }
          }
          // districts override the generic zone once fully on land
          let inDistrict = false;
          if (h > 1.4) {
            for (const d of districts) {
              if (sdBox(x, z, d.cx, d.cz, d.hw, d.hh, d.rot) < 0) {
                inDistrict = true;
                zone = d.zone;
                if (d.zone === Zone.DOWNTOWN) { h = Math.max(h, 3.6); veg = 30; }
                else if (d.zone === Zone.GOLF) { h += 2.5 * fbm2(x / 180, z / 180, 3) + 1.5; veg = 255; }
                else if (d.zone === Zone.PARK) veg = 230;
                else if (d.zone === Zone.AIRPORT) { h = 2.8 + 0.05 * perlin2(x / 50, z / 50); veg = 120; }
                else if (d.zone === Zone.LOT || d.zone === Zone.CONSTRUCTION || d.zone === Zone.INDUSTRIAL) veg = 5;
                else if (d.zone === Zone.HOTEL) veg = 60;
                else if (d.zone === Zone.RES_MID) veg = 70;
                else veg = 150;
                break;
              }
            }
          }
          // runways are dead flat
          for (const r of runways) {
            const d = sdSegment(x, z, r.a[0], r.a[1], r.b[0], r.b[1]);
            if (d < r.width * 0.5 + 60) { h = lerp(h, 2.9, smoothstep(r.width * 0.5 + 60, r.width * 0.5 + 10, d)); }
          }
          // fallback generic land: grass / scrub
          if (zone === Zone.RES_LOW && !inDistrict) {
            zone = Zone.PARK;
            veg = 200 + Math.floor(40 * perlin2(x / 120, z / 120));
          }
        } else {
          // WATER
          const regional = bilerp(cDepth, sTx, sTz, sX0, sZ0);
          let depth: number;
          if (lm.wet) depth = Math.min(regional, 0.05 + sd * lm.seabed);
          else if (lm.beach === 0) depth = Math.min(regional, lm.shelf + sd * lm.seabed);
          else depth = Math.min(regional, 0.05 + sd * lm.seabed);
          // dredged channels
          for (const c of channels) {
            if (Math.abs(x - c.bx) > c.br || Math.abs(z - c.bz) > c.br) continue;
            const d = sdPolyline(x, z, c.pts) - c.width * 0.5;
            if (d < 60) depth = Math.max(depth, c.depth * (1 - smoothstep(-c.width * 0.1, 60, d)) + depth * smoothstep(-c.width * 0.1, 60, d));
          }
          // sandbars / tidal flats south-west of Garza (reference lower-left) and near the mouth
          const flat = Math.max(
            1 - Math.hypot((x + 350) / 520, (z - 3250) / 260),
            1 - Math.hypot((x - 2500) / 700, (z - 3300) / 300),
            1 - Math.hypot((x - 1200) / 600, (z - 1500) / 260),
          );
          if (flat > 0) {
            const bar = smoothstep(0, 0.5, flat) * (0.55 + 0.45 * fbm2(x / 130 + 7, z / 130 - 3, 3));
            depth = lerp(depth, -0.15 + 0.5 * (1 - bar), bar * 0.9);
          }
          depth += 0.08 * perlin2(x / 45, z / 45);
          h = -depth;
          zone = h > -0.35 ? Zone.SANDBAR : depth > 9 ? Zone.OCEAN : Zone.BAY;
          if (h > 0) zone = Zone.SANDBAR;
          veg = 0;
        }
        this.height[idx] = h;
        this.zone[idx] = zone;
        this.veg[idx] = clamp(veg, 0, 255);
      }
      if (onProgress && (j & 63) === 0) onProgress(0.35 + (j / n) * 0.65);
    }
  }
}
