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
  /** organic island settlement: a sandy lane (world coordinates) replaces the street grid; small
   *  lots are laid out along it by the road network builder */
  track?: Vec2[];
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
/** Residential canal: a straight dredged cut with vertical banks. Streets listed in `culverts`
 *  (world x positions, canals run east-west) pass over it on a short land bridge. */
export interface CanalSpec { id: string; a: Vec2; b: Vec2; width: number; depth: number; culverts: number[]; culvertHalf: number; }
export interface LakeSpec { id: string; cx: number; cz: number; rx: number; rz: number; rot: number; seed: number; }
/** Street centre lines of a district in district-local coordinates. */
export interface GridLines { xs: number[]; zs: number[]; }
/** The port island: a rotated rounded box with seawalls on every side (half sizes in metres). The
 *  north quay (local -hh) carries the container cranes, the south quay (local +hh) the cruise berth. */
export const PORT_ISLAND = { cx: -1150, cz: -3050, hw: 950, hh: 300, rot: 0.04 } as const;

function withBounds(c: Omit<ChannelSpec, 'bx' | 'bz' | 'br'>): ChannelSpec {
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const [x, z] of c.pts) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z); }
  const bx = (minX + maxX) / 2, bz = (minZ + maxZ) / 2;
  // margin covers the half width plus the 150 m shoulder of a narrow cut
  return { ...c, bx, bz, br: Math.max(maxX - minX, maxZ - minZ) / 2 + c.width + 160 };
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
  /** small natural island: dense continuous canopy, sheltered coves grow a mangrove fringe */
  isle?: boolean;
  /** wooded key of the inner bay: a thin sand rim, solid low hammock canopy, no glades, a narrow shelf */
  key?: boolean;
}

/** Authored dense-forest classes (WorldMap.canopy). The planter reads them for density and species mix,
 *  the city keeps its lots out of them. */
export enum Canopy {
  NONE = 0,
  /** tall hardwood hammock on the shore side of Garza's causeway approach */
  HAMMOCK = 1,
  /** small wooded key: low dense canopy under a mangrove rim */
  KEY = 2,
  /** mainland bay-shore fringe in front of the suburbs */
  SHORE = 3,
  /** low mangrove thicket (the northern end of the hammock belt, where tall crowns would rise into the
   *  bridge approach) */
  SCRUB = 4,
}

// ---------------------------------------------------------------- SDF helpers

export function sdBox(px: number, pz: number, cx: number, cz: number, hw: number, hh: number, rot: number, r = 0): number {
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

/** Isla Garza's main body (the reference hero island): long axis north-south. */
const G = { cx: 195, cz: 2520, rx: 262, rz: 380, rot: 0.05 } as const;
/** Low sandy spit off Garza's north shore that carries the causeway approach; the bridge abutment
 *  sits at its northern end. */
export const GARZA_SPIT: [Vec2, Vec2] = [[55, 2190], [-5, 1790]];
const GARZA_SPIT_HW = 42;
/** Garza's interior lagoon (negative inside the water). Shared by the landmass SDF (which cuts it
 *  out of the land) and the seabed pass (which gives it a proper turquoise depth). */
export function garzaLagoon(x: number, z: number): number {
  return sdIsland(x, z, 200, 2380, 100, 62, 0.5, 15, 0.25);
}

/** The approach highway across Garza (garza-hwy-2), north-bound: causeway landing, island spine, spit. */
const GARZA_APPROACH: Vec2[] = [[-10, 2600], [10, 2450], [30, 2300], [GARZA_SPIT[0][0], GARZA_SPIT[0][1]], [GARZA_SPIT[1][0], GARZA_SPIT[1][1]]];
/** x of the approach highway's centre line at z (z decreases along the road). */
function garzaRoadX(z: number): number {
  const P = GARZA_APPROACH;
  if (z >= P[0][1]) return P[0][0];
  for (let i = 0; i < P.length - 1; i++) {
    const [ax, az] = P[i], [bx, bz] = P[i + 1];
    if (z <= az && z >= bz) return lerp(ax, bx, (az - z) / (az - bz));
  }
  return P[P.length - 1][0];
}
/** Signed distance (negative inside) to the hammock belt on the shore (west) side of the approach highway:
 *  the reference's dark tree wall behind the road. It begins 22 m west of the centre line, so the shoulder
 *  keeps a grass and sand margin in front of the tree line, and runs 80-135 m deep from the main body's west
 *  shore up the spit, narrowing away over the spit's northern third. The depth wanders along the road so the
 *  outer shore is not a ruled edge. */
export function garzaBeltSd(x: number, z: number, grow = 0): number {
  if (z < 1700 || z > 2650) return 100;
  const u = garzaRoadX(z) - x;
  const taper = smoothstep(1840, 1990, z) * (1 - smoothstep(2440, 2530, z));
  const depth = (85 + 50 * (0.5 + 0.5 * fbm2(z / 150 + 2.0, 0.3, 2))) * taper;
  const inner = 22;
  // `grow` pushes the outer shore and the ends out (the canopy mask reaches the roughened waterline) but
  // never the road-side edge
  return Math.max(inner - u, u - (inner + depth) - grow, 1855 - grow - z, z - 2520 - grow);
}

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

/** x of the river centre line at a given z (the river's z is monotonic). */
function riverX(z: number): number {
  for (let i = 0; i < RIVER.length - 1; i++) {
    const [ax, az] = RIVER[i], [bx, bz] = RIVER[i + 1];
    if (z >= az && z <= bz) return lerp(ax, bx, (z - az) / (bz - az));
  }
  return z < RIVER[0][1] ? RIVER[0][0] : RIVER[RIVER.length - 1][0];
}

/** Western edge of the suburbs: beyond it the mainland is sawgrass marsh with tree islands. */
function wetlandEdgeX(z: number): number {
  return -9000 + 320 * fbm2(z / 2600 + 1.3, 0.8, 3);
}

export function createLakes(): LakeSpec[] {
  return [
    { id: 'lake-north', cx: -5900, cz: -6600, rx: 480, rz: 330, rot: 0.3, seed: 61 },
    { id: 'lake-west', cx: -7550, cz: 550, rx: 520, rz: 300, rot: -0.2, seed: 62 },
    { id: 'lake-south', cx: -4300, cz: 4300, rx: 380, rz: 260, rot: 0.5, seed: 63 },
    // retention lakes and borrow pits of the inland subdivisions: the flat hinterland behind the skyline
    // is broken by water the way a drained coastal plain is
    { id: 'lake-nres-a', cx: -6350, cz: -4500, rx: 260, rz: 170, rot: 0.15, seed: 64 },
    { id: 'lake-nres-b', cx: -4650, cz: -6250, rx: 210, rz: 150, rot: -0.35, seed: 65 },
    { id: 'lake-nres-c', cx: -7300, cz: -5900, rx: 330, rz: 200, rot: 0.6, seed: 66 },
    { id: 'lake-wres', cx: -6300, cz: -3350, rx: 240, rz: 160, rot: -0.1, seed: 67 },
    { id: 'lake-mres', cx: -5750, cz: -750, rx: 300, rz: 190, rot: 0.25, seed: 68 },
    { id: 'lake-nres2', cx: -6150, cz: -8100, rx: 280, rz: 190, rot: -0.5, seed: 69 },
    { id: 'lake-far-n', cx: -8300, cz: -7100, rx: 230, rz: 160, rot: 0.4, seed: 70 },
    { id: 'lake-fsres', cx: -6000, cz: 5300, rx: 260, rz: 170, rot: -0.3, seed: 71 },
  ];
}

export function createLandmasses(): Landmass[] {
  const L: Landmass[] = [];
  const lakes = createLakes();

  L.push({
    id: 'mainland', bx: -6000, bz: 0, br: 20000,
    sd: (x, z) => {
      let d = x - mainlandCoastX(z);
      // the river carves into the mainland
      const r = sdVarPolyline(x, z, RIVER, RIVER_W);
      d = Math.max(d, -r);
      // inland lakes
      for (const lk of lakes) {
        if (Math.abs(x - lk.cx) > lk.rx * 1.6 || Math.abs(z - lk.cz) > lk.rz * 1.8) continue;
        d = Math.max(d, -sdIsland(x, z, lk.cx, lk.cz, lk.rx, lk.rz, lk.rot, lk.seed, 0.22));
      }
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
    beach: 62, height: 2.6, seabed: 0.012, shelf: 6,
  });

  // Hero island ("Isla Garza") - reference near island: a lumpy key elongated north-south (about
  // 950 m long, 600-650 m wide) with a lagoon in its northern half, a settlement on the south-west
  // lobe, the park and marina on the north-east lobe and a low sandy spit carrying the causeway
  // approach off its north shore.
  L.push({
    id: 'garza', bx: 190, bz: 2450, br: 1000,
    sd: (x, z) => {
      let d = sdIsland(x, z, G.cx, G.cz, G.rx, G.rz, G.rot, 11, 0.14);
      d = smin(d, sdIsland(x, z, 260, 2900, 160, 150, 0.1, 12, 0.2), 110);   // southern tip lobe
      d = smin(d, sdIsland(x, z, -10, 2740, 115, 120, 0.3, 13, 0.25), 100);  // south-west lobe (settlement)
      d = smin(d, sdIsland(x, z, 390, 2500, 100, 150, 0.0, 17, 0.2), 110);   // east lobe (exposed beach)
      d = smin(d, sdIsland(x, z, 375, 2160, 85, 115, 0.2, 14, 0.2), 110);    // north-east lobe (park, marina)
      d = smin(d, sdIsland(x, z, 130, 2240, 110, 85, -0.1, 16, 0.2), 100);   // north lobe (spit root)
      d = smin(d, sdSegment(x, z, GARZA_SPIT[0][0], GARZA_SPIT[0][1], GARZA_SPIT[1][0], GARZA_SPIT[1][1]) - GARZA_SPIT_HW, 60);
      // hammock belt on the shore side of the approach highway (the spit's west half and the main body's
      // north-west shore); its outer shore is roughened here so the belt does not read as a road embankment
      d = smin(d, garzaBeltSd(x, z) + 14 * fbm2(x / 70 + 1.0, z / 70 - 2.0, 2), 45);
      // interior lagoon; its distance is steepened so only a narrow sandy rim surrounds the pond
      d = Math.max(d, -garzaLagoon(x, z) * 2.5 + 12);
      return d;
    },
    beach: 70, height: 2.4, seabed: 0.01, shelf: 3.5, isle: true,
  });

  // Islands west of Garza on the southern causeway chain.
  L.push({ id: 'isla-b', bx: -1350, bz: 2560, br: 800, sd: (x, z) => sdIsland(x, z, -1350, 2560, 420, 260, 0.05, 21, 0.2), beach: 50, height: 2.3, seabed: 0.012, shelf: 3.5, isle: true });

  // Southern Key: big island with beach east, mangroves west, airstrip, golf.
  L.push({
    id: 'southkey', bx: 1900, bz: 5700, br: 3200,
    sd: (x, z) => {
      let d = sdIsland(x, z, 1900, 5700, 1500, 1050, 0.25, 31, 0.14);
      d = smin(d, sdIsland(x, z, 1000, 6400, 700, 500, -0.3, 32, 0.24), 300);
      d = smin(d, sdIsland(x, z, 2900, 4900, 500, 700, 0.5, 33, 0.18), 260);
      return d;
    },
    beach: 80, height: 2.8, seabed: 0.014, shelf: 6, rocky: true, isle: true,
  });

  // Isla Tortuga: low island where the reference bridge lands before continuing to the barrier tip.
  // A causeway embankment of fill carries the bridge landing out to the reference bridge's end.
  L.push({
    id: 'tortuga', bx: 1180, bz: -830, br: 900,
    sd: (x, z) => smin(sdIsland(x, z, 1180, -830, 520, 300, 0.35, 51, 0.2), sdSegment(x, z, 985, -410, 1150, -650) - 56, 60),
    beach: 55, height: 2.3, seabed: 0.012, shelf: 3.5, isle: true,
  });

  // Port island (hard seawalls) in the north-west of the bay, off downtown.
  const P = PORT_ISLAND;
  L.push({ id: 'port', bx: P.cx, bz: P.cz, br: 1300, sd: (x, z) => sdBox(x, z, P.cx, P.cz, P.hw, P.hh, P.rot, 30), beach: 0, height: 3.0, seabed: 0.06, shelf: 6 });

  // Northern causeway hop islands.
  L.push({ id: 'isla-n1', bx: -450, bz: -3900, br: 750, sd: (x, z) => sdIsland(x, z, -450, -3900, 375, 200, 0.1, 41, 0.2), beach: 45, height: 2.3, seabed: 0.012, shelf: 3.5, isle: true });
  L.push({ id: 'isla-n2', bx: 700, bz: -4000, br: 800, sd: (x, z) => sdIsland(x, z, 700, -4000, 400, 210, -0.15, 42, 0.2), beach: 45, height: 2.3, seabed: 0.012, shelf: 3.5, isle: true });
  L.push({ id: 'isla-n3', bx: 1550, bz: -4100, br: 650, sd: (x, z) => sdIsland(x, z, 1550, -4100, 315, 170, 0.2, 43, 0.22), beach: 45, height: 2.3, seabed: 0.012, shelf: 3.5, isle: true });

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

  // Wooded keys of the inner bay (the reference's scatter of islets behind the causeway): small hammocks
  // with a thin sand rim and a mangrove edge, thickest in the water west of Garza's approach, a few east of
  // the bridge and along the south bayfront, plus two larger keys mid-bay. Candidates are rejected within
  // reach of the marked channels (boats), the causeways and bridges, the seaplane lane and other land.
  {
    const keyRng = new Rng('bay-keys');
    const channels = createChannels();
    const bridges = createBridges();
    const lane: Vec2[] = [[-2400, 3300], [1600, 3300]];
    const clear = (cx: number, cz: number, r: number): boolean => {
      for (const c of channels) if (sdPolyline(cx, cz, c.pts) < c.width * 0.5 + 170 + r) return false;
      for (const b of bridges) if (sdPolyline(cx, cz, b.pts) < 230 + r) return false;
      if (sdPolyline(cx, cz, lane) < 420 + r) return false;
      for (const lm of L) {
        if (Math.hypot(cx - lm.bx, cz - lm.bz) - lm.br > r + 150) continue;
        if (lm.sd(cx, cz) < r + 150) return false;
      }
      return true;
    };
    const addKey = (id: string, cx: number, cz: number, rx: number, rz: number, rot: number, seed: number): boolean => {
      if (!clear(cx, cz, Math.max(rx, rz))) return false;
      L.push({ id, bx: cx, bz: cz, br: Math.max(rx, rz) * 1.5 + 50, sd: (x, z) => sdIsland(x, z, cx, cz, rx, rz, rot, seed, 0.3), beach: 12, height: 1.9, seabed: 0.018, shelf: 1.8, isle: true, key: true });
      return true;
    };
    addKey('key-west', -1250, 650, 150, 105, 0.35, 501);
    addKey('key-mid', -600, 1900, 125, 90, -0.4, 502);
    const regions: [number, number, number, number, number][] = [
      [-2250, -350, 250, 2350, 30],
      [550, 1500, 950, 1800, 7],
      [-2000, -700, -1400, 150, 9],
    ];
    for (const [x0, x1, z0, z1, n] of regions) {
      let placed = 0;
      for (let tries = 0; tries < n * 12 && placed < n; tries++) {
        const cx = keyRng.range(x0, x1), cz = keyRng.range(z0, z1);
        const rx = keyRng.range(28, 72) * (keyRng.chance(0.65) ? 0.75 : 1), rz = rx * keyRng.range(0.55, 1);
        if (addKey(`key-${x0}-${placed}`, cx, cz, rx, rz, keyRng.range(0, Math.PI), keyRng.int(100, 900))) placed++;
      }
    }
  }

  return L;
}

// ---------------------------------------------------------------- districts, roads, bridges

/** Districts are listed in priority order: where two overlap, the earlier one defines the zone and
 *  the later one's street grid / lots are suppressed inside it. */
export function createDistricts(): District[] {
  const D: District[] = [];
  const add = (d: District) => D.push(d);
  // dense core
  add({ id: 'downtown', zone: Zone.DOWNTOWN, cx: -2650, cz: -3900, hw: 750, hh: 620, rot: 0.02, gridX: 130, gridZ: 110, density: 0.92, hMin: 40, hMax: 260 });
  add({ id: 'brickell', zone: Zone.RES_MID, cx: -2900, cz: -2350, hw: 550, hh: 420, rot: 0.02, gridX: 120, gridZ: 120, density: 0.85, hMin: 25, hMax: 120 });
  add({ id: 'midtown', zone: Zone.RES_MID, cx: -3500, cz: -5300, hw: 900, hh: 700, rot: 0.0, gridX: 120, gridZ: 140, density: 0.8, hMin: 12, hMax: 60 });
  // special-use districts take priority over the residential fabric around them
  add({ id: 'construction-dt', zone: Zone.CONSTRUCTION, cx: -2250, cz: -4250, hw: 70, hh: 60, rot: 0.02, gridX: 0, gridZ: 0, density: 0, hMin: 0, hMax: 0 });
  add({ id: 'construction-dt2', zone: Zone.CONSTRUCTION, cx: -3150, cz: -3550, hw: 65, hh: 55, rot: 0.02, gridX: 0, gridZ: 0, density: 0, hMin: 0, hMax: 0 });
  add({ id: 'construction-hotel', zone: Zone.CONSTRUCTION, cx: 2480, cz: -2450, hw: 60, hh: 60, rot: -0.1, gridX: 0, gridZ: 0, density: 0, hMin: 0, hMax: 0 });
  add({ id: 'stadium-lot', zone: Zone.LOT, cx: -2900, cz: -2000, hw: 330, hh: 260, rot: 0.0, gridX: 0, gridZ: 0, density: 0, hMin: 0, hMax: 0 });
  add({ id: 'bayfront-park', zone: Zone.PARK, cx: -2050, cz: -4300, hw: 170, hh: 380, rot: 0.02, gridX: 0, gridZ: 0, density: 0, hMin: 0, hMax: 0 });
  add({ id: 'industrial-river', zone: Zone.INDUSTRIAL, cx: -3300, cz: -3050, hw: 700, hh: 380, rot: -0.1, gridX: 170, gridZ: 160, density: 0.6, hMin: 6, hMax: 16 });
  add({ id: 'industrial-port', zone: Zone.INDUSTRIAL, cx: -1150, cz: -3050, hw: 950, hh: 300, rot: 0.04, gridX: 0, gridZ: 0, density: 0.5, hMin: 6, hMax: 14 });
  add({ id: 'airport', zone: Zone.AIRPORT, cx: -7800, cz: -1400, hw: 1100, hh: 900, rot: 0.0, gridX: 0, gridZ: 0, density: 0, hMin: 0, hMax: 0 });
  add({ id: 'airstrip', zone: Zone.AIRPORT, cx: 2500, cz: 5750, hw: 700, hh: 130, rot: 0.55, gridX: 0, gridZ: 0, density: 0, hMin: 0, hMax: 0 });
  // inland parks and golf courses break up the sprawl
  add({ id: 'inland-golf', zone: Zone.GOLF, cx: -5200, cz: -3950, hw: 480, hh: 380, rot: 0.1, gridX: 0, gridZ: 0, density: 0, hMin: 0, hMax: 0 });
  add({ id: 'west-golf', zone: Zone.GOLF, cx: -6300, cz: 3600, hw: 500, hh: 400, rot: -0.15, gridX: 0, gridZ: 0, density: 0, hMin: 0, hMax: 0 });
  add({ id: 'north-park', zone: Zone.PARK, cx: -4350, cz: -6650, hw: 380, hh: 300, rot: 0.0, gridX: 0, gridZ: 0, density: 0, hMin: 0, hMax: 0 });
  add({ id: 'south-park', zone: Zone.PARK, cx: -4950, cz: 2150, hw: 420, hh: 280, rot: 0.0, gridX: 0, gridZ: 0, density: 0, hMin: 0, hMax: 0 });
  add({ id: 'garza-park', zone: Zone.PARK, cx: 365, cz: 2160, hw: 120, hh: 105, rot: 0.2, gridX: 0, gridZ: 0, density: 0, hMin: 0, hMax: 0 });
  add({ id: 'barrier-golf', zone: Zone.GOLF, cx: 2680, cz: -5300, hw: 420, hh: 520, rot: 0.0, gridX: 0, gridZ: 0, density: 0, hMin: 0, hMax: 0 });
  add({ id: 'southkey-golf', zone: Zone.GOLF, cx: 1300, cz: 6300, hw: 550, hh: 420, rot: -0.3, gridX: 0, gridZ: 0, density: 0, hMin: 0, hMax: 0 });
  // mainland suburbs: density falls off from the core toward the western marsh. Every subdivision has its
  // own slight grid rotation and spacing, so from altitude the hinterland is a patchwork of differently
  // aligned street grids with wedges of scrub between them instead of one lattice to the horizon (the two
  // canal districts stay axis-aligned: their canals are laid out in the grid's frame)
  add({ id: 'north-res', zone: Zone.RES_LOW, cx: -5600, cz: -5400, hw: 2100, hh: 1800, rot: 0.07, gridX: 95, gridZ: 140, density: 0.75, hMin: 4, hMax: 11 });
  add({ id: 'west-res', zone: Zone.RES_LOW, cx: -5300, cz: -2700, hw: 1500, hh: 1150, rot: 0.0, gridX: 100, gridZ: 130, density: 0.75, hMin: 4, hMax: 12 });
  add({ id: 'mid-res', zone: Zone.RES_LOW, cx: -4900, cz: -900, hw: 1400, hh: 600, rot: -0.05, gridX: 105, gridZ: 140, density: 0.55, hMin: 4, hMax: 10 });
  add({ id: 'south-res', zone: Zone.RES_LOW, cx: -4200, cz: 1300, hw: 1700, hh: 1500, rot: 0.0, gridX: 105, gridZ: 135, density: 0.7, hMin: 4, hMax: 10 });
  add({ id: 'far-west-res', zone: Zone.RES_LOW, cx: -7950, cz: -4200, hw: 650, hh: 3000, rot: -0.06, gridX: 110, gridZ: 150, density: 0.45, hMin: 4, hMax: 10 });
  add({ id: 'west-res-2', zone: Zone.RES_LOW, cx: -7750, cz: 900, hw: 850, hh: 2000, rot: 0.05, gridX: 115, gridZ: 150, density: 0.4, hMin: 4, hMax: 9 });
  add({ id: 'far-south-res', zone: Zone.RES_LOW, cx: -6600, cz: 4300, hw: 2000, hh: 1400, rot: 0.06, gridX: 105, gridZ: 140, density: 0.55, hMin: 4, hMax: 10 });
  add({ id: 'south-shore-res', zone: Zone.RES_LOW, cx: -3900, cz: 3900, hw: 1400, hh: 900, rot: -0.07, gridX: 105, gridZ: 135, density: 0.6, hMin: 4, hMax: 10 });
  add({ id: 'far-south-res-2', zone: Zone.RES_LOW, cx: -4800, cz: 6500, hw: 2000, hh: 1200, rot: 0.04, gridX: 110, gridZ: 140, density: 0.5, hMin: 4, hMax: 9 });
  add({ id: 'far-south-res-4', zone: Zone.RES_LOW, cx: -7700, cz: 6700, hw: 900, hh: 1000, rot: -0.08, gridX: 120, gridZ: 150, density: 0.38, hMin: 4, hMax: 9 });
  add({ id: 'south-edge-res', zone: Zone.RES_LOW, cx: -5500, cz: 8800, hw: 3100, hh: 1100, rot: 0.03, gridX: 120, gridZ: 150, density: 0.35, hMin: 4, hMax: 9 });
  add({ id: 'north-res-2', zone: Zone.RES_LOW, cx: -4800, cz: -8000, hw: 2400, hh: 800, rot: -0.06, gridX: 100, gridZ: 140, density: 0.55, hMin: 4, hMax: 10 });
  add({ id: 'far-north-res', zone: Zone.RES_LOW, cx: -7950, cz: -8000, hw: 650, hh: 800, rot: 0.08, gridX: 120, gridZ: 150, density: 0.4, hMin: 4, hMax: 9 });
  add({ id: 'north-edge-res', zone: Zone.RES_LOW, cx: -5500, cz: -9400, hw: 3100, hh: 600, rot: 0.04, gridX: 120, gridZ: 150, density: 0.35, hMin: 4, hMax: 9 });
  add({ id: 'south-bayfront', zone: Zone.RES_MID, cx: -3000, cz: -900, hw: 480, hh: 650, rot: 0.0, gridX: 120, gridZ: 130, density: 0.6, hMin: 8, hMax: 35 });
  // barrier island
  add({ id: 'hotel-south', zone: Zone.HOTEL, cx: 2330, cz: -1500, hw: 330, hh: 1250, rot: -0.12, gridX: 130, gridZ: 110, density: 0.85, hMin: 20, hMax: 110 });
  add({ id: 'hotel-mid', zone: Zone.HOTEL, cx: 2600, cz: -3800, hw: 300, hh: 1300, rot: -0.03, gridX: 130, gridZ: 105, density: 0.85, hMin: 25, hMax: 130 });
  add({ id: 'barrier-res', zone: Zone.RES_LOW, cx: 2650, cz: -6900, hw: 350, hh: 1200, rot: 0.0, gridX: 90, gridZ: 110, density: 0.7, hMin: 4, hMax: 12 });
  add({ id: 'finger-res', zone: Zone.RES_LOW, cx: 1820, cz: -2340, hw: 330, hh: 760, rot: 0.02, gridX: 0, gridZ: 0, density: 0.7, hMin: 4, hMax: 9 });
  // island settlements: a sandy lane through the canopy instead of a street grid
  add({
    id: 'garza-res', zone: Zone.RES_LOW, cx: 40, cz: 2770, hw: 200, hh: 170, rot: 0.1, gridX: 0, gridZ: 0, density: 0.55, hMin: 4, hMax: 9,
    track: [[-10, 2600], [-60, 2690], [-60, 2780], [20, 2800], [110, 2830], [200, 2800]],
  });
  add({
    id: 'tortuga-res', zone: Zone.RES_LOW, cx: 1180, cz: -830, hw: 420, hh: 230, rot: 0.35, gridX: 0, gridZ: 0, density: 0.55, hMin: 4, hMax: 10,
    track: [[1156, -656], [1031, -714], [886, -842], [891, -1000], [1062, -1033], [1225, -952], [1340, -885]],
  });
  add({
    id: 'isla-b-res', zone: Zone.RES_LOW, cx: -1350, cz: 2560, hw: 330, hh: 190, rot: 0.05, gridX: 0, gridZ: 0, density: 0.5, hMin: 4, hMax: 9,
    track: [[-1500, 2577], [-1480, 2680], [-1320, 2720], [-1180, 2660], [-1140, 2547]],
  });
  add({ id: 'southkey-res', zone: Zone.RES_LOW, cx: 2200, cz: 5300, hw: 700, hh: 500, rot: 0.25, gridX: 130, gridZ: 150, density: 0.6, hMin: 4, hMax: 10 });
  add({
    id: 'isla-n-res', zone: Zone.RES_LOW, cx: 700, cz: -4000, hw: 300, hh: 160, rot: -0.15, gridX: 0, gridZ: 0, density: 0.5, hMin: 4, hMax: 9,
    track: [[700, -3990], [640, -4075], [760, -4125], [880, -4085], [1030, -4030]],
  });
  add({
    id: 'isla-n1-res', zone: Zone.RES_LOW, cx: -450, cz: -3900, hw: 270, hh: 150, rot: 0.1, gridX: 0, gridZ: 0, density: 0.5, hMin: 4, hMax: 9,
    track: [[-450, -3880], [-520, -3975], [-400, -4030], [-270, -3985], [-150, -3900]],
  });
  return D;
}

/** Street centre lines for every gridded district, in district-local coordinates. Shared by the
 *  road network builder and the canal layout so canals sit in block interiors. */
export function computeDistrictGrids(districts: District[]): Map<string, GridLines> {
  const rng = new Rng('streets');
  const out = new Map<string, GridLines>();
  for (const d of districts) {
    if (d.gridX <= 0 || d.gridZ <= 0) continue;
    // slight irregularity in spacing keeps the grid from looking machine-made; the low-rise suburbs also
    // merge the odd pair of blocks into a superblock (a school, a church lot, a strip of shops), which
    // breaks the even rhythm of the street lattice seen from altitude
    const superP = d.zone === Zone.RES_LOW ? 0.11 : 0;
    const xs: number[] = [];
    for (let x = -d.hw; x <= d.hw + 1; x += d.gridX * rng.range(0.9, 1.15) * (rng.chance(superP) ? 1.8 : 1)) xs.push(Math.min(x, d.hw));
    const zs: number[] = [];
    for (let z = -d.hh; z <= d.hh + 1; z += d.gridZ * rng.range(0.9, 1.15) * (rng.chance(superP) ? 1.7 : 1)) zs.push(Math.min(z, d.hh));
    out.set(d.id, { xs, zs });
  }
  return out;
}

/** Residential canals in block interiors of the south shore (opening to the bay) and along the
 *  river through the western suburbs. */
export function createCanals(districts: District[], grids: Map<string, GridLines>): CanalSpec[] {
  const C: CanalSpec[] = [];
  const rng = new Rng('canals');
  const south = districts.find((d) => d.id === 'south-res');
  const sg = south && grids.get(south.id);
  if (south && sg) {
    // district streets plus the authored avenue (x = -3400) cross the canals on culverts
    const culverts = [...sg.xs.map((x) => south.cx + x), -3400];
    for (let j = 3; j < sg.zs.length - 3; j += 2) {
      const z = south.cz + (sg.zs[j] + sg.zs[j + 1]) / 2;
      const len = rng.range(1100, 1900);
      const x1 = south.cx + south.hw;
      C.push({ id: `canal-s-${j}`, a: [x1 + 320, z], b: [x1 - len, z], width: 24, depth: 2.6, culverts, culvertHalf: 9.5 });
    }
  }
  const west = districts.find((d) => d.id === 'west-res');
  const wg = west && grids.get(west.id);
  if (west && wg) {
    const culverts = wg.xs.map((x) => west.cx + x);
    for (let j = 1; j < wg.zs.length - 1; j++) {
      const z = west.cz + (wg.zs[j] + wg.zs[j + 1]) / 2;
      if (z < -2650 || z > -1650) continue;
      if (j % 2 === 0) continue;
      const rx = riverX(z);
      const len = rng.range(700, 1200);
      if (rx - len > west.cx - west.hw + 120) C.push({ id: `canal-w-${j}`, a: [rx + 90, z], b: [rx - len, z], width: 20, depth: 2.4, culverts, culvertHalf: 8.5 });
      if (j % 4 === 1 && rx + 500 < west.cx + west.hw - 150) C.push({ id: `canal-e-${j}`, a: [rx - 90, z], b: [Math.min(rx + rng.range(450, 700), west.cx + west.hw - 150), z], width: 18, depth: 2.4, culverts, culvertHalf: 8.5 });
    }
  }
  return C;
}

export function createRoads(): RoadSpec[] {
  const R: RoadSpec[] = [];
  // Coastal highway on the southern chain (reference left edge) and across Garza.
  R.push({ id: 'south-hwy-mainland', cls: 'highway', width: 22, lanes: 4, traffic: 14, pts: [[-6900, 2650], [-6000, 2650], [-4500, 2700], [-3400, 2700], [-2790, 2690]] });
  R.push({ id: 'garza-hwy', cls: 'highway', width: 22, lanes: 4, traffic: 14, pts: [[-1650, 2590], [-1050, 2540], [-990, 2537]] });
  // across Garza: from the western causeway landing up the island's spine, west of the lagoon, and out
  // along the sandy spit to the reference bridge abutment
  R.push({ id: 'garza-hwy-2', cls: 'highway', width: 22, lanes: 4, traffic: 14, pts: [[-10, 2600], [10, 2450], [30, 2300], [GARZA_SPIT[0][0], GARZA_SPIT[0][1]], [GARZA_SPIT[1][0], GARZA_SPIT[1][1]]] });
  // island arterial skirting the lagoon's north shore, ending in a turnaround loop in the park; spur to the marina
  R.push({ id: 'garza-east', cls: 'arterial', width: 14, lanes: 2, traffic: 5, pts: [[30, 2300], [150, 2265], [280, 2235], [355, 2185], [385, 2160], [400, 2195], [370, 2220], [335, 2205], [355, 2185]] });
  R.push({ id: 'garza-marina-rd', cls: 'street', width: 9, lanes: 2, traffic: 2, pts: [[355, 2185], [395, 2125], [420, 2075]] });
  R.push({ id: 'tortuga-rd', cls: 'highway', width: 22, lanes: 4, traffic: 12, pts: [[980, -400], [1200, -720], [1415, -1015]] });
  // Downtown arterials: the bayshore follows the coast ~60 m inland; both north-south arterials cross the river on bridges
  R.push({ id: 'dt-bayshore', cls: 'arterial', width: 16, lanes: 4, traffic: 10, pts: [[-3400, -5300], [-2900, -5150], [-2560, -4950], [-2420, -4700], [-2330, -4450], [-2260, -4200], [-2200, -3900], [-2100, -3700], [-2150, -3450], [-2200, -3300], [-2380, -3110]] });
  R.push({ id: 'dt-bayshore-s', cls: 'arterial', width: 16, lanes: 4, traffic: 10, pts: [[-2470, -2870], [-2450, -2600], [-2550, -2200], [-2680, -1800], [-2760, -1500], [-3350, -1500]] });
  R.push({ id: 'dt-avenue', cls: 'arterial', width: 16, lanes: 4, traffic: 9, pts: [[-3400, -9900], [-3400, -7300], [-3400, -6000], [-3400, -4600], [-3350, -3500], [-3330, -2900]] });
  R.push({ id: 'dt-avenue-s', cls: 'arterial', width: 16, lanes: 4, traffic: 9, pts: [[-3290, -2650], [-3350, -1500], [-3400, 0], [-3400, 1600], [-3400, 2700]] });
  R.push({ id: 'north-cw-approach', cls: 'arterial', width: 15, lanes: 4, traffic: 7, pts: [[-3400, -6000], [-2900, -6350], [-2545, -6626]] });
  R.push({ id: 'west-arterial', cls: 'arterial', width: 15, lanes: 4, traffic: 7, pts: [[-6800, -9900], [-6800, -7000], [-6800, -4000], [-6800, -300], [-6900, 1500], [-6900, 2650]] });
  R.push({ id: 'north-arterial', cls: 'arterial', width: 15, lanes: 4, traffic: 7, pts: [[-9900, -5300], [-8500, -5300], [-6800, -5300], [-4400, -5300], [-3400, -5300]] });
  R.push({ id: 'airport-rd', cls: 'arterial', width: 14, lanes: 2, traffic: 6, pts: [[-6800, -2050], [-7300, -2050], [-7800, -2050]] });
  R.push({ id: 'mid-arterial', cls: 'arterial', width: 15, lanes: 4, traffic: 7, pts: [[-9900, -300], [-8500, -300], [-6800, -300], [-5500, -300], [-4400, -320], [-3400, -300]] });
  R.push({ id: 'south-arterial', cls: 'arterial', width: 15, lanes: 4, traffic: 6, pts: [[-9900, 1200], [-8500, 1200], [-6900, 1200], [-5000, 1250], [-3400, 1300]] });
  // Barrier island spine road (Collins-like) and beach road
  // the spine ends in a turnaround loop at the island's northern tip and meets the Tortuga bridge at the southern tip
  R.push({ id: 'barrier-spine', cls: 'arterial', width: 16, lanes: 4, traffic: 10, pts: [[2720, -8000], [2680, -6600], [2620, -5200], [2600, -4000], [2520, -2600], [2400, -1500], [2260, -800], [2050, -500]] });
  R.push({ id: 'barrier-spine-loop', cls: 'street', width: 10, lanes: 2, traffic: 2, pts: [[2720, -8000], [2775, -8060], [2760, -8135], [2695, -8145], [2660, -8080], [2720, -8000]] });
  R.push({ id: 'barrier-beach-rd', cls: 'street', width: 10, lanes: 2, traffic: 4, pts: [[2680, -6600], [2900, -6400], [2880, -5200], [2850, -4000], [2790, -2700], [2650, -1500], [2400, -1500]] });
  // Southern key: loop road plus a spur to the golf club
  R.push({ id: 'southkey-rd', cls: 'arterial', width: 14, lanes: 2, traffic: 5, pts: [[1465, 4695], [1600, 5000], [1900, 5400], [2300, 5700], [2700, 6100], [2600, 6350], [2200, 6450], [1700, 6250], [1500, 5900], [1900, 5400]] });
  R.push({ id: 'southkey-rd-2', cls: 'street', width: 10, lanes: 2, traffic: 3, pts: [[1500, 5900], [1250, 6200]] });
  R.push({ id: 'southkey-marina-rd', cls: 'street', width: 9, lanes: 2, traffic: 2, pts: [[1600, 5000], [1420, 4880], [1260, 4780]] });
  // Island streets
  R.push({ id: 'isla-n-rd', cls: 'arterial', width: 14, lanes: 2, traffic: 6, pts: [[-760, -3880], [-450, -3880], [-150, -3900]] });
  R.push({ id: 'isla-n2-rd', cls: 'arterial', width: 14, lanes: 2, traffic: 6, pts: [[380, -3980], [700, -3990], [1030, -4030]] });
  R.push({ id: 'isla-n3-rd', cls: 'arterial', width: 14, lanes: 2, traffic: 6, pts: [[1335, -4082], [1550, -4100], [1780, -4120]] });
  // Port roads
  R.push({ id: 'port-rd', cls: 'arterial', width: 14, lanes: 2, traffic: 5, pts: [[-2050, -3050], [-1600, -3050], [-1150, -3050], [-700, -3060], [-260, -3070]] });
  return R;
}

export function createBridges(): BridgeSpec[] {
  const B: BridgeSpec[] = [];
  // Reference bridge: Garza north shore -> barrier tip, long low causeway with an arched channel span.
  // (the abutment is the northern end of Garza's sandy spit; the arch stays over the arch-channel)
  B.push({ id: 'garza-bridge', pts: [[GARZA_SPIT[1][0], GARZA_SPIT[1][1]], [330, 1250], [700, 300], [980, -400]], width: 30, deck: 8, archHeight: 26, archT: 0.51, archLength: 560, lanes: 6, traffic: 16 });
  B.push({ id: 'tortuga-bridge', pts: [[1415, -1015], [1800, -600], [2050, -500]], width: 22, deck: 7, archHeight: 18, archT: 0.45, archLength: 380, lanes: 4, traffic: 12 });
  // Southern chain hops: the long low causeway from Isla B lands on Garza's west shore
  B.push({ id: 'garza-west', pts: [[-990, 2537], [-10, 2600]], width: 22, deck: 6, archHeight: 0, archT: 0.5, archLength: 0, lanes: 4, traffic: 14 });
  B.push({ id: 'islab-west', pts: [[-2790, 2690], [-2100, 2650], [-1650, 2590]], width: 22, deck: 7, archHeight: 18, archT: 0.45, archLength: 360, lanes: 4, traffic: 14 });
  // Northern causeway (downtown -> barrier) with hops
  B.push({ id: 'north-cw-1', pts: [[-2100, -3700], [-1500, -3780], [-760, -3880]], width: 24, deck: 8, archHeight: 26, archT: 0.4, archLength: 480, lanes: 6, traffic: 14 });
  B.push({ id: 'north-cw-2', pts: [[-150, -3900], [380, -3980]], width: 24, deck: 8, archHeight: 0, archT: 0.5, archLength: 0, lanes: 6, traffic: 14 });
  B.push({ id: 'north-cw-3', pts: [[1030, -4030], [1335, -4082]], width: 24, deck: 8, archHeight: 0, archT: 0.5, archLength: 0, lanes: 6, traffic: 14 });
  B.push({ id: 'north-cw-4', pts: [[1780, -4120], [2200, -4080], [2600, -4000]], width: 24, deck: 8, archHeight: 20, archT: 0.5, archLength: 380, lanes: 6, traffic: 14 });
  // Far north causeway to the barrier island's residential end
  B.push({ id: 'far-north-cw', pts: [[-2545, -6626], [-1000, -6750], [500, -6800], [1800, -6850], [2650, -6900]], width: 18, deck: 7, archHeight: 16, archT: 0.55, archLength: 360, lanes: 4, traffic: 7 });
  // Port bridge from downtown
  B.push({ id: 'port-bridge', pts: [[-2200, -3300], [-2050, -3050]], width: 14, deck: 6, archHeight: 0, archT: 0.5, archLength: 0, lanes: 2, traffic: 5 });
  // River crossings of the downtown arterials (low girder spans)
  B.push({ id: 'bayshore-river', pts: [[-2380, -3110], [-2470, -2870]], width: 16, deck: 6, archHeight: 0, archT: 0.5, archLength: 0, lanes: 4, traffic: 10 });
  B.push({ id: 'avenue-river', pts: [[-3330, -2900], [-3290, -2650]], width: 16, deck: 6, archHeight: 0, archT: 0.5, archLength: 0, lanes: 4, traffic: 9 });
  return B;
}

export function createMarinas(): MarinaSpec[] {
  return [
    // bases sit on the shoreline; piers extend along `rot` into the water (props snap them to the water's edge)
    { id: 'dt-marina', x: -2150, z: -4150, rot: Math.PI * 0.5, piers: 7, pierLen: 110 },
    { id: 'garza-marina', x: 420, z: 2035, rot: 0, piers: 5, pierLen: 90 },
    { id: 'barrier-marina', x: 2075, z: -1400, rot: -Math.PI * 0.5, piers: 6, pierLen: 100 },
    { id: 'south-marina', x: -2760, z: 2950, rot: Math.PI * 0.5, piers: 4, pierLen: 80 },
    { id: 'southkey-marina', x: 1238, z: 4730, rot: 0.09, piers: 4, pierLen: 80 },
    { id: 'north-marina', x: -2535, z: -5600, rot: Math.PI * 0.5, piers: 5, pierLen: 90 },
  ];
}

export function createRunways(): RunwaySpec[] {
  return [
    { id: 'rwy-09', a: [-8800, -1350], b: [-6950, -1350], width: 50 },
    { id: 'rwy-13', a: [-8500, -2150], b: [-7073, -896], width: 42 },
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
    { id: 'ref-boats', pts: [[-200, 3550], [300, 3250], [520, 2950], [800, 2600], [1200, 2250]], width: 40, depth: 4, boats: 3, speed: 18 },
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
    { id: 'terminal', kind: 'terminal', x: -7800, z: -1900, rot: 0, size: 220 },
    { id: 'hangars', kind: 'hangars', x: -7400, z: -2250, rot: 0, size: 120 },
    { id: 'cranes-port', kind: 'cranes', x: -1150, z: -3330, rot: 0, size: 1600 },
    { id: 'cruise', kind: 'cruise', x: -900, z: -2780, rot: 0, size: 300 },
    { id: 'tanks', kind: 'tanks', x: -3600, z: -3100, rot: 0, size: 160 },
    { id: 'seaplane-base', kind: 'seaplane', x: -2050, z: -4700, rot: Math.PI * 0.5, size: 60 },
    { id: 'golf-club', kind: 'clubhouse', x: 1215, z: 6250, rot: -0.3, size: 30 },
  ];
}

// ---------------------------------------------------------------- urban gradient

interface CorridorBox { pts: Vec2[]; hw: number; minX: number; maxX: number; minZ: number; maxZ: number }
interface UrbanFields { urban: District[]; corridors: CorridorBox[] }
const _urbanCache = new WeakMap<District[], UrbanFields>();
function urbanFields(districts: District[], roads: RoadSpec[]): UrbanFields {
  let f = _urbanCache.get(districts);
  if (f) return f;
  const corridors = roads.filter((r) => r.cls === 'highway' || r.cls === 'arterial').map((r) => {
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const [px, pz] of r.pts) { minX = Math.min(minX, px); maxX = Math.max(maxX, px); minZ = Math.min(minZ, pz); maxZ = Math.max(maxZ, pz); }
    return { pts: r.pts, hw: r.width * 0.5, minX: minX - 400, maxX: maxX + 400, minZ: minZ - 400, maxZ: maxZ + 400 };
  });
  f = { urban: districts.filter((d) => d.zone === Zone.DOWNTOWN || d.zone === Zone.RES_MID), corridors };
  _urbanCache.set(districts, f);
  return f;
}

export interface UrbanSample {
  /** 0..1 urban intensity: 1 in the downtown / mid-rise cores, falling off through the outer ring and along the
   *  arterials into the house-scale suburbs; frayed by noise so no edge follows a district rectangle */
  urban: number;
  /** distance (m) to the edge of the nearest highway / arterial, capped at 400 */
  corridor: number;
  /** signed distance (m) to the nearest downtown / mid-rise district (negative inside) */
  edgeD: number;
}

/** The urban gradient of the sprawl, shared by the city fill (which building types a block gets) and the
 *  ground shading (how the ground under them reads from altitude), so the ragged city edge is the same in both. */
export function urbanGradient(districts: District[], roads: RoadSpec[], x: number, z: number): UrbanSample {
  const f = urbanFields(districts, roads);
  let corridor = 400;
  for (const r of f.corridors) {
    if (x < r.minX || x > r.maxX || z < r.minZ || z > r.maxZ) continue;
    corridor = Math.min(corridor, sdPolyline(x, z, r.pts) - r.hw);
  }
  let edgeD = 5000, size = 1000;
  for (const u of f.urban) {
    const d = sdBox(x, z, u.cx, u.cz, u.hw, u.hh, u.rot);
    if (d < edgeD) { edgeD = d; size = Math.min(u.hw, u.hh); }
  }
  const un = 0.5 + 0.5 * perlin2(x / 380 + 3.3, z / 380 - 7.1);
  let urban: number;
  if (edgeD < 0) {
    // inside a core the edge frays inward: the outer 150-500 m of the district lose urbanity where the noise is
    // low (no deeper than a third of a small district's half-size, so the island cores keep their centres)
    const depth = Math.min(180 + 380 * un, size * 0.35);
    const fray = smoothstep(-depth, -30, edgeD) * (0.25 + 0.75 * (1 - un));
    urban = 1 - 0.85 * fray;
  } else {
    urban = (1 - smoothstep(100, 1100, edgeD)) * (0.4 + 0.7 * un) + (1 - smoothstep(20, 140, corridor)) * (0.25 + 0.5 * un);
  }
  return { urban: clamp(urban, 0, 1), corridor, edgeD };
}

// ---------------------------------------------------------------- generation

export interface WorldMapData {
  n: number;
  height: Float32Array;
  zone: Uint8Array;
  /** 0..255 vegetation / moisture: canopy density used by the planter and the ground shading */
  veg: Uint8Array;
  /** distance to nearest land in metres (positive over water, negative over land) */
  coast: Float32Array;
  /** 0..255 wave exposure of the nearest shore (0 = sheltered flat / mangrove cove, 255 = open ocean) */
  exposure: Uint8Array;
  /** authored dense-forest class per cell (Canopy) */
  canopy: Uint8Array;
  districts: District[];
  roads: RoadSpec[];
  bridges: BridgeSpec[];
  marinas: MarinaSpec[];
  runways: RunwaySpec[];
  channels: ChannelSpec[];
  pois: Poi[];
  canals: CanalSpec[];
  lakes: LakeSpec[];
  grids: Map<string, GridLines>;
}

export class WorldMap implements WorldMapData {
  n = MAP_N;
  height = new Float32Array(MAP_N * MAP_N);
  zone = new Uint8Array(MAP_N * MAP_N);
  veg = new Uint8Array(MAP_N * MAP_N);
  coast = new Float32Array(MAP_N * MAP_N);
  exposure = new Uint8Array(MAP_N * MAP_N);
  canopy = new Uint8Array(MAP_N * MAP_N);
  districts = createDistricts();
  roads = createRoads();
  bridges = createBridges();
  marinas = createMarinas();
  runways = createRunways();
  channels = createChannels();
  pois = createPois();
  landmasses = createLandmasses();
  lakes = createLakes();
  grids = computeDistrictGrids(this.districts);
  canals = createCanals(this.districts, this.grids);

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

  /** canopy density 0..1 */
  vegAt(x: number, z: number): number {
    const [cx, cz] = this.toCell(x, z);
    const ix = clamp(Math.round(cx), 0, MAP_N - 1), iz = clamp(Math.round(cz), 0, MAP_N - 1);
    return this.veg[iz * MAP_N + ix] / 255;
  }

  /** authored dense-forest class at a point (Canopy.NONE outside the belts, keys and shore fringes) */
  canopyAt(x: number, z: number): Canopy {
    const [cx, cz] = this.toCell(x, z);
    const ix = clamp(Math.round(cx), 0, MAP_N - 1), iz = clamp(Math.round(cz), 0, MAP_N - 1);
    return this.canopy[iz * MAP_N + ix] as Canopy;
  }

  /** wave exposure 0..1 */
  exposureAt(x: number, z: number): number {
    const [cx, cz] = this.toCell(x, z);
    const ix = clamp(Math.round(cx), 0, MAP_N - 1), iz = clamp(Math.round(cz), 0, MAP_N - 1);
    return this.exposure[iz * MAP_N + ix] / 255;
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
    // broad seagrass/sand flats (1-2 m) that read as pale turquoise patches from the air
    depth -= 2.4 * smoothstep(0.12, 0.42, fbm2(x / 650 + 9.0, z / 650 + 2.0, 3));
    // patch reefs and sand holes mottle the shelf at 150-300 m scales (only readable while it is shallow)
    depth += 0.8 * fbm2(x / 190 + 8.8, z / 190 - 4.4, 3);
    // outer-shelf reef banks: knolls of coral and seagrass that rise to 1.5-3 m out of the 4-7 m shelf in
    // 200-500 m patches, so the blue outside the beach terraces is mottled with turquoise and olive
    depth -= 2.3 * smoothstep(0.22, 0.58, fbm2(x / 330 + 2.0, z / 330 - 7.0, 3) + 0.25 * perlin2(x / 120 - 5.0, z / 120 + 2.0)) * smoothstep(2.6, 4.2, depth);
    depth = Math.max(depth, 0.7);
    // ocean beyond the barrier island / south key: continental shelf ramp. The shelf break wanders in
    // two dimensions and the ramp is long, so deep water arrives as tongues and lobes, not along a line.
    const oceanEdge = 3380 + 380 * fbm2(z / 3000, 0.5, 2) + 170 * fbm2(z / 1100 + 3.1, 2.2, 3);
    const east = x - oceanEdge + 420 * fbm2(x / 1300 + 4.4, z / 1000 - 6.6, 3) + 130 * perlin2(x / 330 + 1.1, z / 330 - 3.3);
    if (east > 0) depth += east * 0.004 + 2.5 * smoothstep(0, 1300, east) + 3.0 * smoothstep(500, 2300, east) + 15 * smoothstep(1400, 4500, east) + 1.5 * ridged2(x / 600 + 1.0, z / 260, 3) * smoothstep(0, 900, east);
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
    const cSize = CELL * cStep; // metres per coarse cell
    // Pass 1: coarse landmass SDF + nearest landmass id (SDFs are smooth so bilinear upsampling is safe)
    const cSd = new Float32Array(coarseN * coarseN);
    const cId = new Int16Array(coarseN * coarseN);
    const cDepth = new Float32Array(coarseN * coarseN);
    const cLandNoise = new Float32Array(coarseN * coarseN);
    const cRelief = new Float32Array(coarseN * coarseN);
    const cSeabed = new Float32Array(coarseN * coarseN);
    const cShelf = new Float32Array(coarseN * coarseN);
    const cExpo = new Float32Array(coarseN * coarseN);
    for (let j = 0; j < coarseN; j++) {
      const z = -HALF + (j + 0.5) * cSize;
      for (let i = 0; i < coarseN; i++) {
        const x = -HALF + (i + 0.5) * cSize;
        let best = Infinity, id = -1;
        for (let k = 0; k < L.length; k++) {
          const lm = L[k];
          // cheap bounding-circle rejection: the true distance can't be smaller than this
          const bound = Math.hypot(x - lm.bx, z - lm.bz) - lm.br;
          if (bound > best) continue;
          const d = lm.sd(x, z);
          if (d < best) { best = d; id = k; }
        }
        const ci = j * coarseN + i;
        cSd[ci] = best;
        cId[ci] = id;
        cSeabed[ci] = L[id].seabed;
        cShelf[ci] = L[id].shelf;
        cDepth[ci] = this.regionalDepth(x, z);
        cLandNoise[ci] = fbm2(x / 260, z / 260, 3);
        // gentle mainland relief: long undulations, a low coastal ridge 1-2 km inland, no mountains
        if (id === 0 && best < 0) {
          const inland = -best;
          const r = 2.0 * fbm2(x / 1500 + 2.0, z / 1500 - 1.0, 3) + 0.9 * fbm2(x / 420 + 7.0, z / 420 + 3.0, 3);
          const ridge = 2.2 * Math.exp(-(((inland - 1500) / 1000) ** 2));
          cRelief[ci] = smoothstep(150, 1100, inland) * (1.6 + r + ridge);
        } else cRelief[ci] = 0;
      }
      if (onProgress && (j & 31) === 0) onProgress((j / coarseN) * 0.3);
    }

    // Pass 1b: wave exposure. From each near-shore cell, march outward in 8 directions and
    // accumulate the depth-weighted length of open water (fetch); the mean of the three longest
    // fetches is the exposure. Sheltered coves and shallow flats end up near 0, open ocean near 1.
    {
      const nDir = 8, steps = 40, stepM = 200;
      const dxs: number[] = [], dzs: number[] = [];
      for (let k = 0; k < nDir; k++) { const a = (k / nDir) * Math.PI * 2 + 0.2; dxs.push(Math.cos(a)); dzs.push(Math.sin(a)); }
      const fetches = new Float32Array(nDir);
      const sampleSd = (x: number, z: number): number => {
        const ci = Math.floor((x + HALF) / cSize), cj = Math.floor((z + HALF) / cSize);
        if (ci < 0 || cj < 0 || ci >= coarseN || cj >= coarseN) return ci < 0 ? -1000 : 1000; // west edge is land, others open sea
        return cSd[cj * coarseN + ci];
      };
      const sampleDepth = (x: number, z: number, sd: number): number => {
        const ci = clamp(Math.floor((x + HALF) / cSize), 0, coarseN - 1), cj = clamp(Math.floor((z + HALF) / cSize), 0, coarseN - 1);
        const k = cj * coarseN + ci;
        return Math.min(cDepth[k], 0.05 + Math.max(sd, 0) * cSeabed[k] + (L[cId[k]].beach === 0 ? cShelf[k] : 0));
      };
      for (let j = 0; j < coarseN; j++) {
        const z = -HALF + (j + 0.5) * cSize;
        for (let i = 0; i < coarseN; i++) {
          const ci = j * coarseN + i;
          const sd0 = cSd[ci];
          if (sd0 < -450) { cExpo[ci] = 0; continue; }
          const x = -HALF + (i + 0.5) * cSize;
          for (let k = 0; k < nDir; k++) {
            let fetch = 0, left = sd0 >= 0;
            for (let t = 1; t <= steps; t++) {
              const px = x + dxs[k] * t * stepM, pz = z + dzs[k] * t * stepM;
              const sd = sampleSd(px, pz);
              if (sd < 0) {
                if (!left) { if (t * stepM > 600) break; continue; }
                break;
              }
              left = true;
              const depth = px > HALF || pz > HALF || pz < -HALF ? 25 : sampleDepth(px, pz, sd);
              fetch += stepM * smoothstep(0.5, 12, depth);
            }
            fetches[k] = fetch;
          }
          // mean of the three longest fetches
          let f0 = 0, f1 = 0, f2 = 0;
          for (let k = 0; k < nDir; k++) {
            const f = fetches[k];
            if (f > f0) { f2 = f1; f1 = f0; f0 = f; } else if (f > f1) { f2 = f1; f1 = f; } else if (f > f2) f2 = f;
          }
          const e = (f0 + f1 + f2) / (3 * steps * stepM);
          cExpo[ci] = smoothstep(0.04, 0.8, e);
        }
      }
      if (onProgress) onProgress(0.35);
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
    // unit gradient of the coarse coast distance at the last sampled cell: points offshore
    let sNx = 0, sNz = 1;
    const shoreNormal = (): void => {
      const i00 = sZ0 * coarseN + sX0, i10 = i00 + 1, i01 = i00 + coarseN, i11 = i01 + 1;
      const gx = lerp(cSd[i10] - cSd[i00], cSd[i11] - cSd[i01], sTz);
      const gz = lerp(cSd[i01] - cSd[i00], cSd[i11] - cSd[i10], sTx);
      const len = Math.hypot(gx, gz);
      if (len > 1e-6) { sNx = gx / len; sNz = gz / len; } else { sNx = 0; sNz = 1; }
    };

    const channels = this.channels;
    const runways = this.runways;
    const districts = this.districts;
    const lakes = this.lakes;
    const canals = this.canals;
    const canalBounds = canals.map((c) => ({ minX: Math.min(c.a[0], c.b[0]) - c.width, maxX: Math.max(c.a[0], c.b[0]) + c.width, z: c.a[1] }));
    const marinas = this.marinas;
    const bridges = this.bridges;
    // through roads that may cross the western marsh, with bounding boxes for quick rejection
    const embankments = this.roads.filter((r) => r.cls === 'highway' || r.cls === 'arterial').map((r) => {
      let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
      for (const [px, pz] of r.pts) { minX = Math.min(minX, px); maxX = Math.max(maxX, px); minZ = Math.min(minZ, pz); maxZ = Math.max(maxZ, pz); }
      const pad = r.width * 0.5 + 20;
      return { pts: r.pts, hw: r.width * 0.5, minX: minX - pad, maxX: maxX + pad, minZ: minZ - pad, maxZ: maxZ + pad };
    });

    // Pass 2: full-resolution heights, zones
    for (let j = 0; j < n; j++) {
      const z = -HALF + (j + 0.5) * CELL;
      const wetEdge = wetlandEdgeX(z);
      for (let i = 0; i < n; i++) {
        const x = -HALF + (i + 0.5) * CELL;
        const idx = j * n + i;
        let [sd, id] = sampleCoarse(i + 0.5, j + 0.5);
        const lm = L[id];
        const expo = bilerp(cExpo, sTx, sTz, sX0, sZ0);
        // fine shoreline detail (only matters within a few dozen metres of the coast)
        if (Math.abs(sd) < 90 && (lm.beach > 0 || lm.wet)) {
          const fine = 9 * perlin2(x / 60 + 3.3, z / 60 - 1.7) + 4 * perlin2(x / 21 + 8.1, z / 21 + 2.2);
          sd += fine * (lm.wet ? 1.8 : 1.0);
        }
        this.coast[idx] = sd;
        this.exposure[idx] = Math.round(255 * clamp(expo, 0, 1));
        const landNoise = bilerp(cLandNoise, sTx, sTz, sX0, sZ0);

        // lake shores are grassy, not sandy
        let lakeShore = 0;
        if (id === 0 && sd > -160) {
          for (const lk of lakes) {
            if (Math.abs(x - lk.cx) > lk.rx * 1.5 + 160 || Math.abs(z - lk.cz) > lk.rz * 1.6 + 160) continue;
            const d = sdIsland(x, z, lk.cx, lk.cz, lk.rx, lk.rz, lk.rot, lk.seed, 0.22);
            lakeShore = Math.max(lakeShore, 1 - smoothstep(0, 140, d));
          }
        }

        let h: number;
        let zone: Zone;
        let veg = 0;
        let canopyCls = Canopy.NONE;
        if (sd < 0) {
          // LAND
          const inland = -sd;
          // district containing this cell (priority order); hard urban districts meet the water with
          // a seawall instead of a beach
          let dist: District | null = null;
          for (const d of districts) {
            if (sdBox(x, z, d.cx, d.cz, d.hw, d.hh, d.rot) < 0) { dist = d; break; }
          }
          // authored dense forest (0..1): the hammock belt on the shore side of Garza's approach highway, the
          // wooded keys, and the mainland's bay-shore fringe in front of the suburbs (south of the stadium
          // headland, clear of the marinas and the bridge landings). It narrows the beach to a rim, takes
          // priority over the district lots and the seawalls, and is planted solid by the vegetation.
          let forest = 0;
          if (lm.id === 'garza') {
            forest = 1 - smoothstep(-8, 4, garzaBeltSd(x, z, 34));
            if (forest > 0.5) canopyCls = z > 2025 ? Canopy.HAMMOCK : Canopy.SCRUB;
          } else if (lm.key) {
            forest = 1;
            canopyCls = Canopy.KEY;
          } else if (id === 0 && x > -3400 && z > -1800 && z < 3400 && inland < 160) {
            const fw = 70 + 55 * (0.5 + 0.5 * perlin2(x / 260 + 4.0, z / 260 - 1.0));
            forest = (1 - smoothstep(fw - 25, fw + 15, inland)) * smoothstep(-1750, -1550, z) * (1 - smoothstep(3150, 3350, z));
            if (forest > 0) {
              for (const ma of marinas) forest *= smoothstep(150, 260, Math.hypot(x - ma.x, z - ma.z));
              for (const b of bridges) forest *= smoothstep(45, 85, sdPolyline(x, z, b.pts));
              if (forest > 0.5) canopyCls = Canopy.SHORE;
            }
          }
          const seawall = forest < 0.5 && dist !== null && (dist.zone === Zone.DOWNTOWN || dist.zone === Zone.RES_MID || dist.zone === Zone.INDUSTRIAL || dist.zone === Zone.LOT || dist.zone === Zone.CONSTRUCTION || dist.zone === Zone.STADIUM || dist.zone === Zone.MARINA || (dist.zone === Zone.HOTEL && expo < 0.3));
          if (lm.wet) {
            h = 0.15 + lm.height * smoothstep(0, 60, inland) + 0.15 * perlin2(x / 30, z / 30);
            zone = Zone.MANGROVE;
            veg = 255;
          } else if (lm.beach === 0) {
            h = lm.height + 0.2 * perlin2(x / 40, z / 40);
            zone = Zone.INDUSTRIAL;
            veg = 10;
          } else {
            // beach width follows wave exposure: wide sandy beaches face open water, sheltered
            // sides are narrow or fringed with mangroves. A slow along-shore swell in the width (600 m)
            // lets the canopy reach almost to the water in places and opens broad sand aprons in others,
            // so no island wears its beach as a ring of constant width
            const widthNoise = Math.max(0.25 + 0.4 * expo, 0.45 + 0.9 * (0.5 + 0.5 * perlin2(x / 600 + 5.2, z / 600 - 1.3)) + 0.35 * perlin2(x / 240 + 1.7, z / 240 - 4.1) + 0.15 * perlin2(x / 90 + 6.3, z / 90 + 2.4));
            // the forest belts meet the water over a 7 m rim of sand and mud instead of a beach apron
            const beachW = lerp(seawall ? 5 : lm.beach * (0.45 + 1.4 * expo) * widthNoise * (lakeShore > 0 ? 1.6 : 1.0), 7, forest);
            // beach cusps wobble the profile a few metres so the wet band, tide lines and dune toe do not
            // run as concentric contour rings; a low berm crests the upper beach of exposed shores
            const cusp = inland + 5 * perlin2(x / 42 + 7.7, z / 42 - 3.3) * smoothstep(3, 12, inland);
            const ramp = smoothstep(0, beachW, cusp);
            h = 0.25 + (lm.height - 0.25) * ramp + 0.6 * landNoise * ramp + 0.12 * perlin2(x / 18, z / 18);
            h += 0.18 * expo * smoothstep(0.3, 0.55, ramp) * (1 - smoothstep(0.6, 0.85, ramp)) * (0.5 + 0.5 * perlin2(x / 60 + 3.0, z / 60 - 5.0));
            // dunes on ocean-facing beaches of the barrier island / south key
            if (lm.id === 'barrier' || lm.id === 'southkey') {
              const dune = smoothstep(30, 70, inland) * (1 - smoothstep(90, 160, inland)) * (0.4 + 0.6 * expo);
              h += 2.2 * dune * (0.6 + 0.4 * ridged2(x / 140, z / 140, 3));
            }
            zone = ramp < 0.45 ? Zone.BEACH : Zone.RES_LOW;
            veg = ramp < 0.45 ? 20 : 150;
            if (lakeShore > 0 && zone === Zone.BEACH) { zone = Zone.PARK; veg = 120; }
            if (inland < 60 && lakeShore === 0) {
              // sheltered coves of natural islands: low mangrove fringe instead of sand
              if (lm.isle && expo < 0.24) {
                const fringeN = perlin2(x / 150 + 4.4, z / 150 - 2.9);
                if (fringeN > 0.12) {
                  const fw = 18 + 22 * (0.5 + 0.5 * fringeN);
                  if (inland < fw) {
                    zone = Zone.MANGROVE;
                    h = Math.min(h, 0.3 + 0.5 * smoothstep(0, fw, inland)) + 0.1 * perlin2(x / 12, z / 12);
                    veg = 255;
                  }
                }
              }
              // occasional rocky shoreline segments on exposed shores
              if (zone === Zone.BEACH) {
                const rockN = fbm2(x / 210 + 9.0, z / 210 - 4.0, 2);
                const rocky = lm.rocky ? (x > 2400 && ridged2(x / 90 + 5, z / 90 + 5, 3) > 0.62) : (rockN > 0.36 && expo > 0.3);
                if (rocky && inland < 26) {
                  zone = Zone.ROCK;
                  h = 0.3 + 1.1 * smoothstep(0, 22, inland) + 0.9 * ridged2(x / 14, z / 14, 2) * (1 - smoothstep(20, 26, inland));
                  veg = 0;
                }
              }
            }
            // Garza's causeway spit is a bare sand bank (too low for the planters' dune palms) rather than canopy,
            // except where the hammock belt stands on its shore side
            if (lm.id === 'garza' && forest < 0.5 && z < GARZA_SPIT[0][1] + 60 && sdSegment(x, z, GARZA_SPIT[0][0], GARZA_SPIT[0][1], GARZA_SPIT[1][0], GARZA_SPIT[1][1]) < GARZA_SPIT_HW + 40) {
              const spitT = smoothstep(GARZA_SPIT[0][1] + 60, GARZA_SPIT[0][1] - 40, z);
              if (spitT > 0.5) { zone = Zone.BEACH; veg = 15; }
              const bank = lerp(0.3, 0.8 + 0.08 * perlin2(x / 40, z / 40), smoothstep(0, 16, inland));
              h = lerp(h, Math.max(h, bank), spitT);
            }
          }
          // mainland relief and the western marsh
          if (id === 0) {
            const relief = bilerp(cRelief, sTx, sTz, sX0, sZ0) * (1 - lakeShore);
            h += relief + 0.25 * perlin2(x / 95 + 2.0, z / 95) * smoothstep(0, 0.5, relief);
            const wetF = smoothstep(wetEdge + 160, wetEdge - 160, x);
            if (wetF > 0) {
              const pool = perlin2(x / 70 + 1.0, z / 70 + 5.0);
              const hw = pool < -0.32 ? -0.25 : 0.35 + 0.4 * (0.5 + 0.5 * pool) + 0.05 * perlin2(x / 9, z / 9);
              h = lerp(h, hw, wetF);
              if (wetF > 0.5) { zone = Zone.WETLAND_FLAT; }
              // roads cross the marsh on a low fill embankment
              let dr = Infinity;
              for (const r of embankments) {
                if (x < r.minX || x > r.maxX || z < r.minZ || z > r.maxZ) continue;
                dr = Math.min(dr, sdPolyline(x, z, r.pts) - r.hw);
              }
              if (dr < 16) { h = Math.max(h, lerp(1.4 + 0.1 * perlin2(x / 30, z / 30), h, smoothstep(3, 16, dr))); if (dr < 6) veg = Math.min(veg, 30); }
            }
          }
          // districts override the generic zone once fully on land
          let inDistrict = false;
          if (h > 1.4 && dist !== null && forest < 0.5) {
            const d = dist;
            inDistrict = true;
            zone = d.zone;
            if (d.zone === Zone.DOWNTOWN) { h = Math.max(h, 3.6); veg = 30; }
            else if (d.zone === Zone.GOLF) { h += 2.5 * fbm2(x / 180, z / 180, 3) + 1.5; veg = 255; }
            else if (d.zone === Zone.PARK) veg = 120 + Math.floor(100 * smoothstep(-0.1, 0.4, landNoise));
            else if (d.zone === Zone.AIRPORT) { h = lerp(h, 2.8 + 0.05 * perlin2(x / 50, z / 50), smoothstep(0, -150, sdBox(x, z, d.cx, d.cz, d.hw, d.hh, d.rot))); veg = 35; }
            else if (d.zone === Zone.LOT || d.zone === Zone.CONSTRUCTION || d.zone === Zone.INDUSTRIAL) veg = 5;
            else if (d.zone === Zone.HOTEL) veg = 60;
            else if (d.zone === Zone.RES_MID) veg = 60;
            else if (d.track) veg = Math.floor((185 + 70 * smoothstep(-0.3, 0.4, landNoise)) * (1 - 0.6 * smoothstep(0.22, 0.5, perlin2(x / 95 + 5.0, z / 95 - 2.0)))); // island lots hide under the canopy
            else veg = 70 + Math.floor(115 * smoothstep(-0.25, 0.45, landNoise));
          }
          // runways are dead flat
          for (const r of runways) {
            const d = sdSegment(x, z, r.a[0], r.a[1], r.b[0], r.b[1]);
            if (d < r.width * 0.5 + 60) { h = lerp(h, 2.9, smoothstep(r.width * 0.5 + 60, r.width * 0.5 + 10, d)); }
          }
          // fallback generic land: forest / scrub with clearings
          if (zone === Zone.RES_LOW && !inDistrict) {
            zone = Zone.PARK;
            veg = Math.floor(150 + 105 * smoothstep(-0.35, 0.3, landNoise));
            if (lm.isle && forest < 0.5) {
              // dense island canopy thinning into the odd sandy glade
              const glade = perlin2(x / 95 + 5.0, z / 95 - 2.0);
              veg = Math.floor(Math.min(255, veg + 45) * (1 - 0.55 * smoothstep(0.22, 0.5, glade)));
              if (glade > 0.44 && h > 1.6) { zone = Zone.BEACH; veg = 15; }
            }
            if (lakeShore > 0) veg = Math.min(veg, 160);
          }
          // the authored forest is a closed canopy
          if (forest > 0.5 && (zone === Zone.PARK || zone === Zone.MANGROVE)) veg = 255;
          else canopyCls = Canopy.NONE;
          if (zone === Zone.WETLAND_FLAT) {
            const isle = smoothstep(0.5, 0.64, 0.5 + 0.5 * fbm2(x / 240 + 3.0, z / 240 + 8.0, 3));
            veg = Math.floor(40 + 215 * isle);
            if (h < 0) veg = 0;
          }
          // residential canals: vertical-banked cuts through the suburbs (streets culvert them)
          for (let ci = 0; ci < canals.length; ci++) {
            const cb = canalBounds[ci];
            if (Math.abs(z - cb.z) > canals[ci].width || x < cb.minX || x > cb.maxX) continue;
            const c = canals[ci];
            const d = sdSegment(x, z, c.a[0], c.a[1], c.b[0], c.b[1]);
            if (d >= c.width * 0.5) continue;
            let culvert = false;
            for (const sx of c.culverts) if (Math.abs(x - sx) < c.culvertHalf) { culvert = true; break; }
            if (culvert) continue;
            h = -(0.5 + (c.depth - 0.5) * smoothstep(c.width * 0.5, c.width * 0.5 - 6, d));
            zone = Zone.BAY;
            veg = 0;
          }
        } else {
          // WATER
          const regional = bilerp(cDepth, sTx, sTz, sX0, sZ0);
          // seabed slope / shelf interpolated across landmass boundaries so no depth steps appear
          const seabed = bilerp(cSeabed, sTx, sTz, sX0, sZ0);
          const shelf = bilerp(cShelf, sTx, sTz, sX0, sZ0);
          let depth: number;
          // mangrove islets and the bay keys stand on a narrow shelf: a pale rim, then the bay's own depth
          if (lm.wet || lm.key) depth = Math.min(regional, 0.05 + sd * seabed);
          else if (lm.beach === 0) depth = Math.min(regional, shelf + sd * seabed);
          else {
            // Beach-fringed shores: a nearshore slope (steeper on exposed beaches, broad sand flats on
            // sheltered ones) runs down onto a shallow turquoise terrace that reaches 200-600 m offshore,
            // then drops off softly to the regional depth. The terrace is mottled by patch reefs and sand
            // holes, and sand channels cut across its edge, so the shelf break is ragged, not a band.
            const slopeK = 0.45 + 0.95 * expo;
            const nearshore = 0.05 + sd * seabed * slopeK;
            shoreNormal();
            const plateau = 1.9 + 0.5 * perlin2(x / 330 + 2.0, z / 330 - 7.0) + sd * 0.0012;
            const base = smin(nearshore, plateau, 0.7);
            let terrace = base;
            const offshoreF = smoothstep(50, 160, sd);
            const mottle = 0.6 * fbm2(x / 150 + 5.5, z / 150 + 1.5, 3) + 0.4 * perlin2(x / 70 - 3.3, z / 70 + 8.8);
            terrace += (0.7 * mottle + 1.1 * smoothstep(-0.45, -0.8, mottle) - 0.5 * smoothstep(0.45, 0.8, mottle)) * offshoreF;
            // shelf edge: distance and width wander along the coast; a noise field sampled at the point's
            // projection onto the edge is constant along shore normals, which gives cross-shelf spurs and
            // grooves rather than blobs
            const edgeDist = clamp(400 + 130 * fbm2(x / 520 + 3.7, z / 520 - 2.1, 3) + 210 * fbm2(x / 1700 + 1.0, z / 1700 + 8.0, 2), 200, 620);
            const edgeW = 170 + 110 * (0.5 + 0.5 * perlin2(x / 300 - 1.0, z / 300 + 6.0));
            const ex = x - sNx * (sd - edgeDist), ez = z - sNz * (sd - edgeDist);
            // the channels meander and pinch off (the second term follows the point itself, not its
            // projection), so they read as sand channels between reef patches rather than comb teeth
            const groove = 0.5 * perlin2(ex / 150 + 2.2, ez / 150 - 9.9) + 0.3 * perlin2(x / 95 - 4.4, z / 95 + 1.7) + 0.2 * perlin2(x / 260 + 7.7, z / 260 - 3.1);
            const edgeT = smoothstep(edgeDist - edgeW, edgeDist + edgeW, sd + 200 * groove);
            terrace += 1.4 * smoothstep(0.3, 0.7, -groove) * smoothstep(edgeDist - 320, edgeDist - 60, sd);
            // crescentic longshore bars off exposed beaches: pale streaks that come and go along the shore
            if (expo > 0.35 && sd < 300) {
              const shoreX = x - sNx * sd, shoreZ = z - sNz * sd;
              const bar = Math.max(0, Math.sin(sd / 38 + 1.6 * perlin2(shoreX / 120 + 4.0, shoreZ / 120 - 1.0)));
              const present = smoothstep(-0.25, 0.3, perlin2(shoreX / 260 + 5.5, shoreZ / 260 + 2.5));
              terrace -= 0.35 * bar * bar * present * smoothstep(0.35, 0.7, expo) * smoothstep(20, 60, sd) * (1 - smoothstep(160, 300, sd));
            }
            // the mottling and bars never shoal the terrace into an awash flat; the waterline keeps its own profile
            terrace = Math.max(terrace, Math.min(base, 0.45));
            depth = lerp(Math.min(terrace, regional), regional, edgeT);
          }
          // Garza's interior lagoon is a proper turquoise pond, not an awash flat
          if (Math.abs(x - 190) < 260 && Math.abs(z - 2380) < 220) {
            const lag = garzaLagoon(x, z);
            if (lag < 0) depth = Math.max(depth, 0.5 + 1.7 * smoothstep(0, -45, lag));
          }
          // sandbars / tidal flats south-west of Garza (reference lower-left) and near the mouth
          const flat = Math.max(
            1 - Math.hypot((x + 350) / 520, (z - 3250) / 260),
            1 - Math.hypot((x - 2500) / 700, (z - 3300) / 300),
            1 - Math.hypot((x - 1200) / 600, (z - 1500) / 260),
          );
          if (flat > 0) {
            const bar = smoothstep(0, 0.45, flat) * (0.6 + 0.4 * fbm2(x / 130 + 7, z / 130 - 3, 3));
            depth = lerp(depth, -0.12 + 0.6 * (1 - bar), bar * 0.94);
          }
          // dredged channels (cut through the flats, so the marked routes stay navigable). The wide
          // offshore sea lane is a natural deep-water passage, not a dredged cut: its flanks slope over a
          // few hundred metres and wander, so it does not draw a straight edge along the ocean beaches.
          for (const c of channels) {
            if (Math.abs(x - c.bx) > c.br || Math.abs(z - c.bz) > c.br) continue;
            const wide = c.width >= 200;
            let d = sdPolyline(x, z, c.pts) - c.width * 0.5;
            // the lips wander by up to ~200 m; the noise fades out inside the lane so its authored depth holds
            if (wide) {
              d += (80 * fbm2(x / 380 + 1.5, z / 380 - 2.5, 2) + 130 * perlin2(x / 1100 + 3.3, z / 1100 - 6.1)) * smoothstep(-c.width * 0.3, 0, d);
              if (d < 220) {
                let t = smoothstep(-c.width * 0.1, 220, d);
                // the lane's flanks are steep near the lip and level out: the deep colour stays with the lane
                t = 1 - (1 - t) * (1 - t);
                depth = Math.max(depth, c.depth * (1 - t) + depth * t);
              }
            } else if (d < 150) {
              // dredged cut: a steep lip down to the authored depth within ~25 m, then a long shoulder
              // (scour, spoil banks) levelling into the flats over 150 m. The old single 60 m ramp put the
              // whole 1-3 m colour transition of the water into ~20 m, so every cut drew a hard-edged dark
              // band across the bay (read as a cloud-shadow rectangle at night)
              const sh = Math.min(Math.max(3.2, depth), c.depth);
              const lip = 1 - smoothstep(-c.width * 0.1, 25, d);
              const shoulder = 1 - smoothstep(0, 150, d);
              depth = Math.max(depth, depth + (sh - depth) * shoulder * shoulder + (c.depth - sh) * lip);
            }
          }
          // dredged marina basins so the piers stand in navigable water
          for (const ma of marinas) {
            if (Math.abs(x - ma.x) > 420 || Math.abs(z - ma.z) > 420) continue;
            const dirX = Math.sin(ma.rot), dirZ = -Math.cos(ma.rot);
            const reach = ma.pierLen * 0.5 + 40;
            const db = sdBox(x, z, ma.x + dirX * reach, ma.z + dirZ * reach, ma.piers * 14 + 40, reach + 10, ma.rot);
            if (db < 40) depth = Math.max(depth, 2.6 * (1 - smoothstep(-5, 40, db)));
          }
          // canal mouths keep their dredged depth where they meet shallow shore water
          for (let ci = 0; ci < canals.length; ci++) {
            const cb = canalBounds[ci];
            if (Math.abs(z - cb.z) > canals[ci].width || x < cb.minX || x > cb.maxX) continue;
            const c = canals[ci];
            const d = sdSegment(x, z, c.a[0], c.a[1], c.b[0], c.b[1]);
            if (d < c.width * 0.5) depth = Math.max(depth, 0.5 + (c.depth - 0.5) * smoothstep(c.width * 0.5, c.width * 0.5 - 6, d));
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
        this.canopy[idx] = canopyCls;
      }
      if (onProgress && (j & 63) === 0) onProgress(0.35 + (j / n) * 0.65);
    }
  }
}
