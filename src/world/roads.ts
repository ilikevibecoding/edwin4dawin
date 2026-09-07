import * as THREE from 'three';
import { GLSL_NOISE } from '../render/shaders/common.glsl';
import { Rng, hash2 } from '../core/seed';
import { clamp } from '../core/noise';
import { Zone, type District, type RoadClass, type RoadSpec, type Vec2, type WorldMap } from './map';
import { balanceGroundIbl } from './terrain';

export interface RoadSegment {
  a: Vec2;
  b: Vec2;
  width: number;
  cls: RoadClass;
  lanes: number;
  traffic: number;
  /** deck height above terrain (0 for ground roads) */
  lift: number;
}

const CLASS_WIDTH: Record<RoadClass, number> = { highway: 22, causeway: 22, arterial: 15, street: 10, lane: 7, runway: 45, taxiway: 18 };

/** height of the carriageway surface over the terrain (the strip floats clear of the ground mesh) */
export const ROAD_LIFT = 0.15;

function isLandSegment(map: WorldMap, a: Vec2, b: Vec2, margin = 0.6): boolean {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const n = Math.max(2, Math.ceil(len / 15));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t;
    if (map.heightAt(x, z) < margin) return false;
  }
  return true;
}

/** Trim a segment to its land portion (from either end). Returns null if nothing remains. */
function trimToLand(map: WorldMap, a: Vec2, b: Vec2): [Vec2, Vec2] | null {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const n = Math.max(2, Math.ceil(len / 10));
  let first = -1, last = -1;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t;
    const land = map.heightAt(x, z) >= 0.8;
    if (land && first < 0) first = i;
    if (land) last = i;
  }
  if (first < 0 || last - first < 3) return null;
  const ta = first / n, tb = last / n;
  return [[a[0] + (b[0] - a[0]) * ta, a[1] + (b[1] - a[1]) * ta], [a[0] + (b[0] - a[0]) * tb, a[1] + (b[1] - a[1]) * tb]];
}

export interface Block { x0: number; x1: number; z0: number; z1: number; streetWidth: number; }

/** Generates the district street grids and combines them with authored roads. Districts earlier
 *  in the list take priority: streets and blocks of a later district are dropped where they fall
 *  inside an earlier one (parks and golf courses stay free of the surrounding suburb's grid). Island
 *  settlements with a `track` get a sandy lane and small lots along it instead of a grid. */
export function buildRoadNetwork(map: WorldMap): { segments: RoadSegment[]; streetsByDistrict: Map<string, RoadSegment[]>; blocksByDistrict: Map<string, Block[]>; graph: RoadGraph } {
  const segments: RoadSegment[] = [];
  const streetsByDistrict = new Map<string, RoadSegment[]>();
  const blocksByDistrict = new Map<string, Block[]>();
  for (const r of map.roads) {
    for (let i = 0; i < r.pts.length - 1; i++) {
      segments.push({ a: r.pts[i], b: r.pts[i + 1], width: r.width, cls: r.cls, lanes: r.lanes, traffic: r.traffic, lift: 0 });
    }
  }
  const rng = new Rng('lots');
  const ownedBy = (d: District, x: number, z: number) => map.districtAt(x, z) === d;
  for (const d of map.districts) {
    const c = Math.cos(d.rot), s = Math.sin(d.rot);
    const toWorld = (lx: number, lz: number): Vec2 => [d.cx + lx * c - lz * s, d.cz + lx * s + lz * c];
    const toLocal = (x: number, z: number): Vec2 => { const dx = x - d.cx, dz = z - d.cz; return [dx * c + dz * s, -dx * s + dz * c]; };
    if (d.track) {
      // sandy lane following the island, split at water gaps; small lots alternate sides along it
      const list: RoadSegment[] = [];
      const blocks: Block[] = [];
      let side = 1;
      let carry = 0;
      for (let i = 0; i < d.track.length - 1; i++) {
        const a = d.track[i], b = d.track[i + 1];
        const t = trimToLand(map, a, b);
        if (t) { const seg: RoadSegment = { a: t[0], b: t[1], width: 7, cls: 'lane', lanes: 2, traffic: 0.6, lift: 0 }; segments.push(seg); list.push(seg); }
        const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
        const [la0, lz0] = toLocal(a[0], a[1]), [la1, lz1] = toLocal(b[0], b[1]);
        const alongX = Math.abs(la1 - la0) >= Math.abs(lz1 - lz0);
        for (let sPos = carry; sPos < len - 12; sPos += rng.range(42, 58)) {
          const u = sPos / len;
          const lx = la0 + (la1 - la0) * u, lz = lz0 + (lz1 - lz0) * u;
          side = -side;
          const off = 6;
          const depth = 46, half = 20;
          const block: Block = alongX
            ? { x0: lx - half, x1: lx + half, z0: Math.min(lz + side * off, lz + side * (off + depth)), z1: Math.max(lz + side * off, lz + side * (off + depth)), streetWidth: 7 }
            : { z0: lz - half, z1: lz + half, x0: Math.min(lx + side * off, lx + side * (off + depth)), x1: Math.max(lx + side * off, lx + side * (off + depth)), streetWidth: 7 };
          const [wx, wz] = toWorld((block.x0 + block.x1) / 2, (block.z0 + block.z1) / 2);
          if (map.heightAt(wx, wz) < 1.2 || !ownedBy(d, wx, wz)) continue;
          blocks.push(block);
          carry = 0;
        }
      }
      streetsByDistrict.set(d.id, list);
      blocksByDistrict.set(d.id, blocks);
      continue;
    }
    const grid = map.grids.get(d.id);
    if (!grid) continue;
    const list: RoadSegment[] = [];
    const width = d.zone === Zone.DOWNTOWN ? 14 : d.zone === Zone.RES_MID || d.zone === Zone.HOTEL ? 12 : d.zone === Zone.INDUSTRIAL ? 12 : 9;
    const cls: RoadClass = 'street';
    const { xs, zs } = grid;
    const addStreet = (a: Vec2, b: Vec2) => {
      const t = trimToLand(map, a, b);
      if (!t) return;
      const mid: Vec2 = [(t[0][0] + t[1][0]) / 2, (t[0][1] + t[1][1]) / 2];
      if (!ownedBy(d, mid[0], mid[1])) return;
      const seg: RoadSegment = { a: t[0], b: t[1], width, cls, lanes: 2, traffic: d.zone === Zone.DOWNTOWN ? 4 : 1.5, lift: 0 };
      segments.push(seg); list.push(seg);
    };
    // streets along local z, split at each cross street so water gaps and other districts can be trimmed
    for (const x of xs) for (let i = 0; i < zs.length - 1; i++) addStreet(toWorld(x, zs[i]), toWorld(x, zs[i + 1]));
    for (const z of zs) for (let i = 0; i < xs.length - 1; i++) addStreet(toWorld(xs[i], z), toWorld(xs[i + 1], z));
    streetsByDistrict.set(d.id, list);
    const blocks: Block[] = [];
    for (let i = 0; i < xs.length - 1; i++) for (let j = 0; j < zs.length - 1; j++) {
      const [wx, wz] = toWorld((xs[i] + xs[i + 1]) / 2, (zs[j] + zs[j + 1]) / 2);
      if (!ownedBy(d, wx, wz)) continue;
      blocks.push({ x0: xs[i], x1: xs[i + 1], z0: zs[j], z1: zs[j + 1], streetWidth: width });
    }
    blocksByDistrict.set(d.id, blocks);
  }
  // runways & taxiways
  for (const r of map.runways) {
    segments.push({ a: r.a, b: r.b, width: r.width, cls: 'runway', lanes: 0, traffic: 0, lift: 0 });
  }
  const graph = buildRoadGraph(map, segments);
  return { segments, streetsByDistrict, blocksByDistrict, graph };
}

// ------------------------------------------------------------------ road graph (chains, intersections, corners)

/** A polyline of stitched segments of one class and width: the unit the carriageway strips, the intersections
 *  and the sidewalks are built on. `s0..s1` is the along range actually paved (a chain that ends on another
 *  road is cut back to that road's edge so the two carriageways meet without overlapping). */
export interface RoadChain {
  id: number;
  segs: RoadSegment[];
  pts: Vec2[];
  /** cumulative along-distance at each polyline vertex */
  cum: number[];
  length: number;
  width: number;
  hw: number;
  cls: RoadClass;
  lanes: number;
  lift: number;
  /** intersections on this chain, sorted by along */
  nodes: ChainNode[];
  s0: number;
  s1: number;
  /** along-positions of the carriageway mesh rows and the surface height at each row's two edges (side -1, +1),
   *  filled by buildRoadMeshes so the sidewalks meet the pavement edge exactly */
  rows: number[];
  rowY: [number[], number[]];
}

/** one intersection as seen from one chain: where it is along the chain, how far its box reaches on each side
 *  (before / after the node) and which markings the chain draws there (ROAD_F_* bits) */
export interface ChainNode { node: RoadNode; s: number; hMinus: number; hPlus: number; flags: number }

/** A half-road leaving a node: the chain, the along-position of the node on it, the unit direction of the ray
 *  (away from the node) and whether the chain continues in that direction (`sign` = +1 toward increasing along). */
export interface RoadRay { chain: RoadChain; s: number; dir: Vec2; sign: 1 | -1; angle: number; stub: boolean }

/** The curb return between two angularly adjacent rays of a node: the point `c` where the two carriageway edges
 *  would meet, the tangent points `ta` / `tb` on those edges, the arc between them (from ta to tb) and the
 *  along-position / side of each tangent point on its chain (sidewalk runs stop and start there). */
export interface RoadCorner {
  node: RoadNode; a: RoadRay; b: RoadRay; c: Vec2; ta: Vec2; tb: Vec2; arc: Vec2[]; r: number;
  /** centre of the curb-return arc (inside the block corner, `r` from both carriageway edges) */
  o: Vec2;
  sA: number; sideA: number; sB: number; sideB: number;
  /** distance from the node to `c` measured along each ray (the reach of the crossing road along this one) */
  reachA: number; reachB: number;
}

export interface RoadNode {
  id: number;
  x: number;
  z: number;
  rays: RoadRay[];
  corners: RoadCorner[];
  /** traffic signals (mast arms) rather than stop signs */
  signal: boolean;
  /** the chains that stop here when the node is not signalised (two-way / all-way stop) */
  stops: Set<RoadChain>;
  /** highest road class present: 2 arterial, 1 street, 0 lane */
  rank: number;
  zone: Zone | null;
}

export interface RoadGraph { chains: RoadChain[]; nodes: RoadNode[] }

/** marking flags carried per (chain, node) into the carriageway shader (`aIsect.w`) */
export const ROAD_F_BOX = 1;          // suppress lines inside the intersection box (the crossing road runs through it)
export const ROAD_F_LADDER = 2;       // ladder crosswalk on both sides of the box
export const ROAD_F_LINES = 4;        // two-line crosswalk
export const ROAD_F_STOP = 8;         // stop bar on the approach half
export const ROAD_F_ARROWS = 16;      // lane arrows on the approach lanes
export const ROAD_F_EDGE_MINUS = 32;  // T junction: break the edge line on the across < 0 side
export const ROAD_F_EDGE_PLUS = 64;   // T junction: break the edge line on the across > 0 side

const GRAPH_CLASSES = new Set<RoadClass>(['arterial', 'street', 'lane']);

/** Stitch consecutive segments of one polyline into chains (same class, width and lift, shared end point). */
function stitchChains(segments: RoadSegment[]): RoadChain[] {
  const chains: RoadChain[] = [];
  let last: RoadChain | null = null;
  for (const s of segments) {
    if (Math.hypot(s.b[0] - s.a[0], s.b[1] - s.a[1]) < 1) continue;
    const prev = last && last.segs[last.segs.length - 1];
    if (last && prev && prev.cls === s.cls && prev.width === s.width && prev.lift === s.lift && prev.b[0] === s.a[0] && prev.b[1] === s.a[1]) {
      last.segs.push(s);
    } else {
      last = { id: chains.length, segs: [s], pts: [], cum: [], length: 0, width: s.width, hw: s.width * 0.5, cls: s.cls, lanes: s.lanes, lift: s.lift, nodes: [], s0: 0, s1: 0, rows: [], rowY: [[], []] };
      chains.push(last);
    }
  }
  for (const c of chains) {
    c.pts = [c.segs[0].a, ...c.segs.map((s) => s.b)];
    let acc = 0;
    c.cum.push(0);
    for (let i = 0; i < c.pts.length - 1; i++) { acc += Math.hypot(c.pts[i + 1][0] - c.pts[i][0], c.pts[i + 1][1] - c.pts[i][1]); c.cum.push(acc); }
    c.length = acc;
    c.s1 = acc;
  }
  return chains;
}

/** Point and unit direction of a chain at along-position `s` (clamped). */
export function chainFrame(c: RoadChain, s: number): { x: number; z: number; dx: number; dz: number; seg: number } {
  const n = c.pts.length;
  let i = 0;
  while (i < n - 2 && c.cum[i + 1] < s) i++;
  const [ax, az] = c.pts[i], [bx, bz] = c.pts[i + 1];
  const len = c.cum[i + 1] - c.cum[i] || 1;
  const t = clamp((s - c.cum[i]) / len, 0, 1);
  return { x: ax + (bx - ax) * t, z: az + (bz - az) * t, dx: (bx - ax) / len, dz: (bz - az) / len, seg: i };
}

/** Intersection of segments p+t*r and q+u*w (t, u in [0,1] with tolerance `eps` in metres), or null. */
function segIntersect(p: Vec2, r: Vec2, q: Vec2, w: Vec2, eps: number): { t: number; u: number } | null {
  const den = r[0] * w[1] - r[1] * w[0];
  if (Math.abs(den) < 1e-9) return null;
  const qx = q[0] - p[0], qz = q[1] - p[1];
  const t = (qx * w[1] - qz * w[0]) / den, u = (qx * r[1] - qz * r[0]) / den;
  const lr = Math.hypot(r[0], r[1]), lw = Math.hypot(w[0], w[1]);
  const et = eps / lr, eu = eps / lw;
  if (t < -et || t > 1 + et || u < -eu || u > 1 + eu) return null;
  return { t: clamp(t, 0, 1), u: clamp(u, 0, 1) };
}

const RANK: Partial<Record<RoadClass, number>> = { arterial: 2, street: 1, lane: 0 };

/** Curb-return radius by the classes meeting at a corner. */
function cornerRadius(a: RoadChain, b: RoadChain): number {
  const r = Math.max(RANK[a.cls] ?? 0, RANK[b.cls] ?? 0);
  return r >= 2 ? 6 : r === 1 ? 4.5 : 3;
}

/**
 * Intersections of the ground road network. Every place where two chains cross or one ends on another becomes
 * a node with rays (half-roads) sorted by angle; adjacent rays get a curb-return corner. Stubs (chains ending on
 * another road) are cut back to that road's edge. Nodes on arterials and in the dense districts are signalised,
 * the rest are stop-controlled on the minor road; the per-chain node records carry the marking flags the
 * carriageway shader draws (box suppression, crosswalks, stop bars, arrows).
 */
export function buildRoadGraph(map: WorldMap, segments: RoadSegment[]): RoadGraph {
  const chains = stitchChains(segments);
  const graphChains = chains.filter((c) => GRAPH_CLASSES.has(c.cls));
  // spatial hash of chain segments
  const CELL = 250;
  const hash = new Map<number, { c: RoadChain; i: number }[]>();
  const key = (x: number, z: number) => Math.floor((x + 10000) / CELL) * 4096 + Math.floor((z + 10000) / CELL);
  for (const c of graphChains) {
    for (let i = 0; i < c.pts.length - 1; i++) {
      const [ax, az] = c.pts[i], [bx, bz] = c.pts[i + 1];
      const x0 = Math.floor((Math.min(ax, bx) - 2 + 10000) / CELL), x1 = Math.floor((Math.max(ax, bx) + 2 + 10000) / CELL);
      const z0 = Math.floor((Math.min(az, bz) - 2 + 10000) / CELL), z1 = Math.floor((Math.max(az, bz) + 2 + 10000) / CELL);
      for (let kx = x0; kx <= x1; kx++) for (let kz = z0; kz <= z1; kz++) {
        const k = kx * 4096 + kz;
        let list = hash.get(k);
        if (!list) { list = []; hash.set(k, list); }
        list.push({ c, i });
      }
    }
  }
  // raw incidences: (point, chain, along) for every crossing / touching pair
  interface Inc { x: number; z: number; c: RoadChain; s: number }
  const incs: Inc[] = [];
  const EPS = 1.2;
  const seen = new Set<number>();
  const segKey = (e: { c: RoadChain; i: number }) => e.c.id * 64 + Math.min(e.i, 63);
  for (const list of hash.values()) {
    for (let p = 0; p < list.length; p++) for (let q = p + 1; q < list.length; q++) {
      const A = list[p], B = list[q];
      if (A.c === B.c) continue;
      const ka = segKey(A), kb = segKey(B);
      const pairKey = (Math.min(ka, kb)) * 2097152 + Math.max(ka, kb);
      if (seen.has(pairKey)) continue;
      seen.add(pairKey);
      const pa = A.c.pts[A.i], pb = A.c.pts[A.i + 1], qa = B.c.pts[B.i], qb = B.c.pts[B.i + 1];
      const hit = segIntersect(pa, [pb[0] - pa[0], pb[1] - pa[1]], qa, [qb[0] - qa[0], qb[1] - qa[1]], EPS);
      if (!hit) continue;
      const x = pa[0] + (pb[0] - pa[0]) * hit.t, z = pa[1] + (pb[1] - pa[1]) * hit.t;
      const sA = A.c.cum[A.i] + hit.t * (A.c.cum[A.i + 1] - A.c.cum[A.i]);
      const sB = B.c.cum[B.i] + hit.u * (B.c.cum[B.i + 1] - B.c.cum[B.i]);
      incs.push({ x, z, c: A.c, s: sA }, { x, z, c: B.c, s: sB });
    }
  }
  // cluster incidences into nodes (points within 3 m)
  const NODE_CELL = 3;
  const buckets = new Map<number, Inc[][]>();
  const clusters: Inc[][] = [];
  for (const inc of incs) {
    const bx = Math.floor(inc.x / NODE_CELL), bz = Math.floor(inc.z / NODE_CELL);
    let found: Inc[] | null = null;
    for (let dx = -1; dx <= 1 && !found; dx++) for (let dz = -1; dz <= 1 && !found; dz++) {
      const list = buckets.get((bx + dx) * 100003 + (bz + dz));
      if (!list) continue;
      for (const cl of list) if (Math.hypot(cl[0].x - inc.x, cl[0].z - inc.z) < 3) { found = cl; break; }
    }
    if (found) { found.push(inc); continue; }
    const cl = [inc];
    clusters.push(cl);
    const k = bx * 100003 + bz;
    let list = buckets.get(k);
    if (!list) { list = []; buckets.set(k, list); }
    list.push(cl);
  }
  const nodes: RoadNode[] = [];
  for (const cl of clusters) {
    // one incidence per chain (the along positions of duplicates agree within the cluster radius)
    const byChain = new Map<RoadChain, Inc>();
    let sx = 0, sz = 0;
    for (const inc of cl) { sx += inc.x; sz += inc.z; if (!byChain.has(inc.c)) byChain.set(inc.c, inc); }
    const x = sx / cl.length, z = sz / cl.length;
    const rays: RoadRay[] = [];
    for (const [c, inc] of byChain) {
      const s = clamp(inc.s, 0, c.length);
      const f = chainFrame(c, Math.min(s + 0.5, c.length));
      const g = chainFrame(c, Math.max(s - 0.5, 0));
      if (s < c.length - 1.5) rays.push({ chain: c, s, dir: [f.dx, f.dz], sign: 1, angle: 0, stub: s < 1.5 });
      if (s > 1.5) rays.push({ chain: c, s, dir: [-g.dx, -g.dz], sign: -1, angle: 0, stub: s > c.length - 1.5 });
    }
    if (rays.length < 3) continue;
    for (const r of rays) r.angle = Math.atan2(r.dir[1], r.dir[0]);
    rays.sort((a, b) => a.angle - b.angle);
    let rank = 0;
    for (const r of rays) rank = Math.max(rank, RANK[r.chain.cls] ?? 0);
    const node: RoadNode = { id: nodes.length, x, z, rays, corners: [], signal: false, stops: new Set(), rank, zone: map.districtAt(x, z)?.zone ?? null };
    nodes.push(node);
  }
  // corners between angularly adjacent rays
  for (const node of nodes) {
    const n = node.rays.length;
    for (let i = 0; i < n; i++) {
      const A = node.rays[i], B = node.rays[(i + 1) % n];
      let theta = B.angle - A.angle;
      if (theta <= 0) theta += Math.PI * 2;
      if (theta > Math.PI * 0.94 || theta < Math.PI / 6) continue; // straight-through or too sharp for a return
      const r = cornerRadius(A.chain, B.chain);
      const t = r / Math.tan(theta / 2);
      // edge lines facing the wedge: A's on its +n side, B's on its -n side (n = dir rotated by +90 deg)
      const nA: Vec2 = [-A.dir[1], A.dir[0]], nB: Vec2 = [-B.dir[1], B.dir[0]];
      const pA: Vec2 = [node.x + nA[0] * A.chain.hw, node.z + nA[1] * A.chain.hw];
      const pB: Vec2 = [node.x - nB[0] * B.chain.hw, node.z - nB[1] * B.chain.hw];
      // solve pA + u*dirA = pB + v*dirB
      const den = A.dir[0] * B.dir[1] - A.dir[1] * B.dir[0];
      if (Math.abs(den) < 1e-6) continue;
      const qx = pB[0] - pA[0], qz = pB[1] - pA[1];
      const u = (qx * B.dir[1] - qz * B.dir[0]) / den;
      const c: Vec2 = [pA[0] + A.dir[0] * u, pA[1] + A.dir[1] * u];
      const ta: Vec2 = [c[0] + A.dir[0] * t, c[1] + A.dir[1] * t];
      const tb: Vec2 = [c[0] + B.dir[0] * t, c[1] + B.dir[1] * t];
      // arc centre: along the wedge bisector from c
      const bis: Vec2 = [A.dir[0] + B.dir[0], A.dir[1] + B.dir[1]];
      const bl = Math.hypot(bis[0], bis[1]) || 1;
      const oc = r / Math.sin(theta / 2);
      const o: Vec2 = [c[0] + (bis[0] / bl) * oc, c[1] + (bis[1] / bl) * oc];
      const a0 = Math.atan2(ta[1] - o[1], ta[0] - o[0]);
      let a1 = Math.atan2(tb[1] - o[1], tb[0] - o[0]);
      // sweep the short way round
      while (a1 - a0 > Math.PI) a1 -= Math.PI * 2;
      while (a1 - a0 < -Math.PI) a1 += Math.PI * 2;
      const steps = Math.max(3, Math.ceil(Math.abs(a1 - a0) * r / 1.2));
      const arc: Vec2[] = [];
      for (let k = 0; k <= steps; k++) { const a = a0 + (a1 - a0) * (k / steps); arc.push([o[0] + Math.cos(a) * r, o[1] + Math.sin(a) * r]); }
      const reachA = (c[0] - node.x) * A.dir[0] + (c[1] - node.z) * A.dir[1];
      const reachB = (c[0] - node.x) * B.dir[0] + (c[1] - node.z) * B.dir[1];
      const sA = A.s + A.sign * ((ta[0] - node.x) * A.dir[0] + (ta[1] - node.z) * A.dir[1]);
      const sB = B.s + B.sign * ((tb[0] - node.x) * B.dir[0] + (tb[1] - node.z) * B.dir[1]);
      node.corners.push({ node, a: A, b: B, c, ta, tb, arc, r, o, sA, sideA: A.sign, sB, sideB: -B.sign, reachA, reachB });
    }
  }
  // control type and per-chain node records
  for (const node of nodes) {
    const chainsHere = [...new Set(node.rays.map((r) => r.chain))];
    const arterial = node.rank >= 2;
    const dense = node.zone === Zone.DOWNTOWN;
    const mid = node.zone === Zone.RES_MID || node.zone === Zone.HOTEL;
    const fourWay = node.rays.length >= 4;
    const h = hash2(Math.round(node.x), Math.round(node.z), 77);
    if (node.rank === 0) node.signal = false;
    else if (arterial) node.signal = chainsHere.filter((c) => c.cls !== 'lane').length >= 2;
    else if (dense) node.signal = fourWay || h < 0.5;
    else if (mid) node.signal = fourWay ? h < 0.55 : h < 0.2;
    else node.signal = false;
    if (!node.signal) {
      // stops: stubs always; at a 4-way of equal rank the chain nearer north-south stops (two-way stop)
      const through = chainsHere.filter((c) => node.rays.filter((r) => r.chain === c).length === 2);
      for (const c of chainsHere) if (!through.includes(c)) node.stops.add(c);
      if (through.length >= 2) {
        const ranked = through.slice().sort((a, b) => (RANK[a.cls] ?? 0) - (RANK[b.cls] ?? 0) || a.hw - b.hw);
        const minor = ranked[0], major = ranked[ranked.length - 1];
        if ((RANK[minor.cls] ?? 0) < (RANK[major.cls] ?? 0) || minor.hw < major.hw) node.stops.add(minor);
        else {
          // equal rank: pick by the chain's heading (alternating with a node hash so no district is uniform)
          const pick = through.slice().sort((a, b) => { const fa = chainFrame(a, 1), fb = chainFrame(b, 1); return Math.abs(fa.dx) - Math.abs(fb.dx); })[h < 0.7 ? 0 : 1];
          node.stops.add(pick);
        }
      }
    }
    for (const c of chainsHere) {
      const raysOf = node.rays.filter((r) => r.chain === c);
      const s = raysOf[0].s;
      const through = raysOf.length === 2;
      // reach of the crossing roads along this chain on each side (from the corner points)
      let hMinus = 0, hPlus = 0;
      for (const k of node.corners) {
        if (k.a.chain === c) { if (k.a.sign > 0) hPlus = Math.max(hPlus, k.reachA); else hMinus = Math.max(hMinus, k.reachA); }
        if (k.b.chain === c) { if (k.b.sign > 0) hPlus = Math.max(hPlus, k.reachB); else hMinus = Math.max(hMinus, k.reachB); }
      }
      // a stub's box reaches to the far corner on its own side only
      const others = chainsHere.filter((o) => o !== c);
      const crossHw = others.reduce((m, o) => Math.max(m, o.hw), 0);
      if (hMinus === 0) hMinus = crossHw;
      if (hPlus === 0) hPlus = crossHw;
      let flags = 0;
      // the crossing road runs through the box when another chain passes through this node
      const otherThrough = others.some((o) => node.rays.filter((r) => r.chain === o).length === 2);
      if (otherThrough) flags |= ROAD_F_BOX;
      else if (through) {
        // T junction seen from the through road: each stem opens the edge line on its side
        const f = chainFrame(c, s);
        for (const stem of node.rays) {
          if (stem.chain === c) continue;
          const cross = -f.dz * stem.dir[0] + f.dx * stem.dir[1]; // stem on the right (+across) side of the chain?
          flags |= cross > 0 ? ROAD_F_EDGE_PLUS : ROAD_F_EDGE_MINUS;
        }
      }
      const urban = node.zone === Zone.DOWNTOWN || node.zone === Zone.RES_MID || node.zone === Zone.HOTEL || node.zone === Zone.INDUSTRIAL;
      if (node.signal) {
        flags |= ROAD_F_STOP | ROAD_F_LADDER;
        if (c.lanes >= 4) flags |= ROAD_F_ARROWS;
      } else {
        if (node.stops.has(c)) flags |= ROAD_F_STOP;
        if (urban && (node.rank >= 1)) flags |= ROAD_F_LINES;
      }
      c.nodes.push({ node, s, hMinus, hPlus, flags });
    }
  }
  for (const c of chains) {
    c.nodes.sort((a, b) => a.s - b.s);
    // stubs are cut back to the edge of the road they end on
    for (const cn of c.nodes) {
      if (cn.s < 1.5) c.s0 = Math.max(c.s0, Math.min(cn.s + cn.hPlus, c.length * 0.5));
      if (cn.s > c.length - 1.5) c.s1 = Math.min(c.s1, Math.max(cn.s - cn.hMinus, c.length * 0.5));
    }
  }
  return { chains, nodes };
}

// ------------------------------------------------------------------ carriageway shader

const ROAD_FRAG_PARS = /* glsl */ `
varying vec2 vRoadUv;   // x across (-1..1), y along (metres)
varying vec3 vRoadInfo; // lanes, width, class
varying vec4 vIsect;    // along of the nearest intersection, box reach before / after it, marking flags
varying vec3 vWorldPosR;
${GLSL_NOISE}
float aaLine(float d, float h, float fw) { return clamp((min(h, d + 0.5 * fw) - max(-h, d - 0.5 * fw)) / fw, 0.0, 1.0); }
float aaStep(float edge, float x, float fw) { return clamp((x - edge) / fw + 0.5, 0.0, 1.0); }
float flagBit(float flags, float bit) { return mod(floor(flags / bit + 0.01), 2.0); }
/** distance to the nearest border between the cells of a jittered grid (F2 - F1 of the Worley set): the polygon
 *  network of alligator cracking */
float cellEdge(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  float d1 = 8.0, d2 = 8.0;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec2 g = vec2(float(x), float(y));
    vec2 r = g + hash22(i + g) - f;
    float d = dot(r, r);
    if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d;
  }
  return sqrt(d2) - sqrt(d1);
}
/** straight arrow pointing toward +u: shaft u in [0, 2.4], head to 3.6; v across (metres) */
float arrowStraight(vec2 p, float fw) {
  float shaft = aaLine(p.y, 0.15, fw) * aaLine(p.x - 1.2, 1.2, fw);
  float hw = 0.6 * clamp((3.6 - p.x) / 1.2, 0.0, 1.0);
  float head = aaStep(2.4, p.x, fw) * aaStep(p.x, 3.6, fw) * aaStep(abs(p.y), hw, fw);
  return max(shaft, head);
}
/** left-turn arrow: shaft toward +u, then a barb toward -v */
float arrowLeft(vec2 p, float fw) {
  float shaft = aaLine(p.y, 0.15, fw) * aaLine(p.x - 1.0, 1.0, fw);
  float bar = aaLine(p.x - 2.0, 0.15, fw) * aaLine(p.y + 0.4, 0.4, fw);
  float hw = 0.55 * clamp((p.y + 1.6) / 0.8, 0.0, 1.0);
  float head = aaStep(-1.6, p.y, fw) * aaStep(p.y, -0.8, fw) * aaStep(abs(p.x - 2.0), hw, fw);
  return max(max(shaft, bar), head);
}
`;
const ROAD_FRAG_MAIN = /* glsl */ `
float roadCrown = 0.0; // signed 2 % cross-fall of the carriageway, applied to the normal after normal_fragment_maps
{
  float lanes = vRoadInfo.x;
  float width = vRoadInfo.y;
  float cls = vRoadInfo.z;
  float across = vRoadUv.x; // -1..1
  float along = vRoadUv.y;
  float hw = width * 0.5;
  float xm = across * hw; // metres from centre
  vec2 wp = vWorldPosR.xz;
  float fwX = max(fwidth(xm), 1e-4);
  float fwA = max(fwidth(along), 1e-4);
  float fp = max(length(fwidth(wp)), 1e-4); // metres per pixel on the ground
  float n = fbm3(wp * 0.15);
  // 60 cm grain and 8 cm aggregate, each band-limited so it does not sparkle from altitude
  float n2 = mix(vnoise(wp * 1.7), 0.5, smoothstep(0.15, 0.5, fp));
  float n3 = mix(vnoise(wp * 12.0), 0.5, smoothstep(0.03, 0.12, fp));
  // aged asphalt: the binder has weathered to a warm dark grey, paler where the aggregate shows
  vec3 asphalt = mix(vec3(0.105, 0.105, 0.11), vec3(0.175, 0.172, 0.168), n) * (0.92 + 0.16 * n2) * (0.93 + 0.14 * n3);
  // paving history: 50-100 m patches were laid at different times and have weathered to different greys
  asphalt *= 0.88 + 0.24 * fbm3(wp * 0.017 + 5.0);
  // causeways and highways are pale, sun-bleached concrete-asphalt
  if (cls > 2.5 && cls < 4.5) asphalt = mix(vec3(0.30, 0.30, 0.29), vec3(0.40, 0.39, 0.37), n) * (0.94 + 0.12 * n2);
  if (cls < 0.5) {
    // island lane: packed sand and shell with twin wheel ruts, grass creeping in from the verges
    vec3 sand = mix(vec3(0.62, 0.56, 0.44), vec3(0.72, 0.66, 0.52), n) * (0.92 + 0.16 * n2);
    float rut = exp(-pow((abs(xm) - width * 0.22) * 2.2, 2.0));
    sand *= 1.0 - 0.14 * rut;
    float verge = smoothstep(0.55, 1.0, abs(across)) * (0.5 + 0.5 * n2);
    float crown = smoothstep(0.05, 0.16, 0.16 - abs(xm) / max(width, 1.0)) * smoothstep(0.3, 0.7, fbm3(wp * 0.6 + 2.0));
    diffuseColor.rgb = mix(sand, vec3(0.30, 0.36, 0.16) * (0.85 + 0.3 * n2), max(verge * 0.8, crown * 0.5));
    roughnessFactor = 0.95;
  } else if (cls > 4.5) {
    // runway: concrete, centre line dashes, threshold bars
    vec3 concrete = mix(vec3(0.33, 0.33, 0.32), vec3(0.42, 0.41, 0.4), n) * (0.94 + 0.12 * n2);
    float centre = aaLine(xm, 0.45, fwX) * mix(aaLine((fract(along / 60.0) - 0.25) * 60.0, 15.0, fwA), 0.5, smoothstep(10.0, 30.0, fwA));
    float edge = aaLine(abs(xm) - (hw - 0.7), 0.5, fwX);
    // skid marks near the touchdown zone
    float rubber = smoothstep(0.55, 0.8, fbm3(wp * 0.05 + 3.0)) * step(abs(xm), width * 0.28) * 0.35;
    // 7.5 m slab grid with sealed joints, alternate slabs a shade apart, gone once a joint is under a pixel
    float slabJ = max(aaLine((fract(along / 7.5) - 0.5) * 7.5, 0.03, fwA), aaLine((fract(xm / 7.5 + 0.5) - 0.5) * 7.5, 0.03, fwX)) * (1.0 - smoothstep(0.15, 0.5, fp));
    float slabTone = 0.96 + 0.08 * hash12(floor(vec2(along / 7.5, xm / 7.5 + 0.5)));
    concrete *= slabTone * (1.0 - 0.25 * slabJ);
    diffuseColor.rgb = mix(concrete * (1.0 - rubber), vec3(0.85), max(centre, edge) * 0.8);
    roughnessFactor = 0.85;
  } else {
    // ---- intersection geometry: a = distance outside the intersection box (negative inside), appr = 1 on the
    //      half of the road whose traffic is heading for the node (right-hand traffic: xm > 0 travels +along)
    float dI = along - vIsect.x;
    float reach = dI < 0.0 ? vIsect.y : vIsect.z;
    float flags = vIsect.w;
    float fBox = flagBit(flags, 1.0), fLadder = flagBit(flags, 2.0), fLines = flagBit(flags, 4.0), fStop = flagBit(flags, 8.0), fArrows = flagBit(flags, 16.0);
    float fEdgeM = flagBit(flags, 32.0), fEdgeP = flagBit(flags, 64.0);
    float a = abs(dI) - reach;
    float appr = dI < 0.0 ? aaStep(0.0, xm, fwX) : aaStep(xm, 0.0, fwX);
    float sgn = dI < 0.0 ? 1.0 : -1.0;
    float marked = fLadder + fLines + fStop + fArrows;
    // inside the box (a crossing road runs through) the surface is the plain, evenly polished asphalt of the
    // junction: no lines, no lane-locked wear, so the two overlapping carriageways shade identically
    float inBox = fBox * (1.0 - aaStep(0.0, a, fwA));
    // repaving history along the road: stretches laid in different years, from fresh black to faded pale grey (two
    // band systems, ~96 m and ~61 m, so the joins fall irregularly; 2 m transitions), the junction box left neutral
    // so both carriageways through it shade alike; this is the tone the city reads from the air
    float bandK = (along + 41.0 * cls) / 96.0;
    float bk = floor(bandK), bf = fract(bandK);
    float band = mix(hash11(bk + 7.0 * cls), hash11(bk + 1.0 + 7.0 * cls), aaStep(0.99, bf, max(fwA / 96.0, 0.02)));
    float bandK2 = (along + 23.0 * cls + 17.0) / 61.0;
    float bk2 = floor(bandK2), bf2 = fract(bandK2);
    float band2 = mix(hash11(bk2 * 1.7 + 3.0 * cls), hash11((bk2 + 1.0) * 1.7 + 3.0 * cls), aaStep(0.98, bf2, max(fwA / 61.0, 0.03)));
    asphalt *= mix(1.0, (0.6 + 0.66 * band) * (0.9 + 0.2 * band2), 1.0 - inBox);
    // a frontage street beside a highway (class code + 0.25): the old dark local street the highway was built past —
    // no bright repaving bands, three quarters of the tone, its dashes worn to a trace
    float frontage = step(0.2, fract(cls));
    asphalt *= mix(1.0, 0.74 / max(0.6 + 0.66 * band, 0.6), frontage);
    // utility trench scars: a 1.1 m strip of fresh (dark) or concrete-filled (pale) trench running 20-55 m along the
    // road in 40 % of 60 m cells, and a transverse cut across the whole road in 15 % of them
    float trench = 0.0, trenchTone = 1.0;
    for (int k = 0; k < 2; k++) {
      float tc = floor((along + 11.0 * cls) / 60.0) - float(k);
      vec2 th = hash22(vec2(tc, 2.0 + cls));
      float th2 = hash11(tc * 2.3 + cls);
      float ta = (tc + th.x * 0.6) * 60.0 - 11.0 * cls, tl = 20.0 + 35.0 * th2;
      float tx = (th.y - 0.5) * (width - 3.0);
      float lon = step(th.x, 0.4) * aaLine(along - ta - 0.5 * tl, 0.5 * tl, fwA) * aaLine(xm - tx, 0.55, fwX);
      float trn = step(0.85, th.y) * aaLine(along - (tc + th2) * 60.0 + 11.0 * cls, 0.45, fwA);
      float t = max(lon, trn);
      if (t > trench) { trench = t; trenchTone = th2 > 0.7 ? 1.35 : 0.62; }
    }
    trench *= (1.0 - inBox) * (1.0 - smoothstep(1.2, 3.0, fp));
    // ---- surface: tyre paths, patch repairs, seams, cracks (all band-limited to the pixel footprint)
    // lanes as the traffic drives them (traffic.ts): the 4-lane arterials 2.6 and 5.8 m from the centre at a 3.2 m
    // pitch either side of the 2 m kerbed median (streets.ts buildMedians; lane edges 1.0 / 4.2 / 7.4 m), other 4-lane
    // roads 1.5 and 4.7 m, streets 1.8 m with a parking lane outside 3.6 m
    float median = (cls > 1.5 && cls < 2.5 && lanes >= 3.5) ? 1.0 : 0.0;
    float laneO = median > 0.5 ? 1.0 : -0.1; // |xm| of the inner lane's inner edge
    float laneW = lanes >= 3.5 ? 3.2 : 3.4;
    float lp = lanes >= 3.5 ? mod(abs(xm) - laneO + laneW, laneW) : mod(abs(xm) - 0.1 + laneW, laneW);
    float wheel = mix(exp(-pow((abs(lp - laneW * 0.5) - 0.8) * 3.2, 2.0)), 0.2, smoothstep(0.6, 2.5, fwX));
    float laneMask = lanes >= 3.5 ? step(abs(xm), laneO + 2.0 * laneW + 0.1) * step(laneO, abs(xm)) : step(abs(xm), 3.6);
    wheel *= laneMask;
    // the traffic polishes the binder off the aggregate: the wheel paths are the paler bands of a lane, and the
    // strip between them, where the sumps drip, is the darkest — a pale-dark-pale rhythm per lane that reads as
    // lane structure from the air as well as at eye level
    float drip = mix(exp(-pow((lp - laneW * 0.5) * 2.6, 2.0)), 0.25, smoothstep(0.6, 2.5, fwX)) * laneMask;
    // at eye level (footprint under 5 cm/px) the rhythm is half again as strong and a 2 m mottle of binder bleed and
    // spilt fuel sits on it; both are gone by the time a pixel covers 30 cm, so the aerial tone is untouched
    float nearF = 1.0 - smoothstep(0.05, 0.3, fp);
    float mottle = (fbm3(wp * 0.45 + 17.0) - 0.5) * 0.16 * nearF;
    float wear = 1.0 + ((0.26 * wheel - 0.12 * drip) * (1.0 + 0.5 * nearF) + mottle) * (1.0 - inBox);
    // mill-and-fill: one lane re-laid over 12-40 m in a third of the 48 m cells of every lane — fresh black or
    // bleached pale against its neighbours, inside a sealed 5 cm joint. The tonal patchwork of a maintained street
    // at eye level (the round 11 read: one tone with crisp paint) and the lane-wide patches the aerial read wants;
    // the joint is gone by 0.4 m/px, the tone stays
    float laneIdx = (floor(abs(xm) / laneW) + 0.5) * sign(xm);
    float mfc = floor((along + 17.0 * laneIdx + 5.0 * cls) / 48.0);
    vec2 mfh = hash22(vec2(mfc * 1.3 + laneIdx * 7.1, cls + 3.0));
    float mfLen = 12.0 + 28.0 * hash11(mfc * 2.7 + laneIdx * 3.3 + cls);
    float mfMid = (mfc + mfh.x * 0.6) * 48.0 - 17.0 * laneIdx - 5.0 * cls + 0.5 * mfLen;
    float mfOn = step(mfh.y, 0.33) * laneMask * (1.0 - inBox);
    float mfOuter = aaLine(along - mfMid, 0.5 * mfLen, fwA) * aaLine(lp - laneW * 0.5, laneW * 0.5 - 0.02, fwX) * mfOn;
    float mfInner = aaLine(along - mfMid, 0.5 * mfLen - 0.06, fwA) * aaLine(lp - laneW * 0.5, laneW * 0.5 - 0.08, fwX) * mfOn;
    float mfJoint = max(mfOuter - mfInner, 0.0) * (1.0 - smoothstep(0.15, 0.4, fp));
    float mfTone = mix(0.72, 1.22, hash11(mfc * 4.1 + laneIdx * 1.7 + 2.0 * cls));
    // patch repairs: 5 x 3 m cells of the road frame, 7 % of them re-laid darker or bleached paler
    vec2 pc = floor(vec2(along / 5.0, (xm + hw) / 3.0));
    vec2 pf = fract(vec2(along / 5.0, (xm + hw) / 3.0));
    float ph = hash12(pc + cls * 13.0);
    float pin = aaStep(0.08, pf.x, fwA / 5.0) * aaStep(pf.x, 0.92, fwA / 5.0) * aaStep(0.1, pf.y, fwX / 3.0) * aaStep(pf.y, 0.9, fwX / 3.0);
    float repair = step(0.93, ph) * pin * (1.0 - smoothstep(0.4, 1.5, fp)) * (1.0 - inBox);
    float patchTone = ph > 0.965 ? 1.3 : 0.7;
    // sealed longitudinal joint at every lane edge (a 4.5 cm tar line, black: under the painted lines where there are
    // any, in the open between the double yellow) and transverse joints every ~27 m
    float seam = mix(aaLine(min(lp, laneW - lp), 0.045, fwX), 0.0, smoothstep(0.3, 1.0, fwX));
    float tseam = mix(aaLine((fract(along / 27.0) - 0.5) * 27.0, 0.04, fwA), 0.0, smoothstep(0.3, 1.0, fwA)) * step(0.4, hash11(floor(along / 27.0) + cls));
    // cracking where a low-frequency zone says the pavement is old: thin dark ridges, and at eye level the polygon
    // network of alligator cracking (0.4 m cells) in the worst of it; both gone once a pixel covers 35 cm
    float crackZone = smoothstep(0.55, 0.72, fbm3(wp * 0.045 + 3.0));
    float cr = abs(vnoise(wp * 0.7) - 0.5);
    float crackFade = 1.0 - smoothstep(0.08, 0.35, fp);
    float crack = (1.0 - smoothstep(0.0, 0.018 + fp * 0.8, cr)) * crackZone * crackFade;
    if (crackZone > 0.02 && fp < 0.35) {
      float ce = cellEdge(wp * 2.4 + 3.0);
      float alligator = (1.0 - smoothstep(0.0, 0.03 + fp * 1.2, ce)) * smoothstep(0.35, 0.8, crackZone) * crackFade * step(0.45, fbm3(wp * 0.11 + 6.0));
      crack = max(crack, alligator);
    }
    // the gutter: 0.9 m of grime graded to the kerb — silt and rubber dust streaked along by the run-off, browner
    // than the asphalt — with leaf litter and grit in the last 0.5 m (warm 5-15 cm flecks, gone by 0.15 m/px)
    float gutter = smoothstep(hw - 0.9, hw - 0.2, abs(xm)) * (1.0 - inBox);
    float gStreak = mix(vnoise(vec2(along * 0.6, xm * 3.0) + 9.0), 0.5, smoothstep(0.3, 1.2, fwA));
    float litterMask = smoothstep(hw - 0.55, hw - 0.3, abs(xm)) * (1.0 - inBox) * (1.0 - smoothstep(0.05, 0.15, fp));
    float litter = step(0.74, vnoise(wp * 9.0 + 4.0)) * litterMask;
    float grit = step(0.62, vnoise(wp * 14.0 + 8.0)) * litterMask;
    vec3 surf = asphalt * wear;
    surf = mix(surf, asphalt * mfTone * wear, mfInner * 0.85);
    surf = mix(surf, asphalt * patchTone, repair * 0.9);
    surf = mix(surf, asphalt * trenchTone, trench * 0.9);
    // a cracked zone is also a shade darker as a whole (the cracks themselves are gone from the air)
    surf *= 1.0 - (0.38 * max(seam, tseam) + 0.45 * mfJoint + 0.35 * crack + 0.07 * crackZone) * (1.0 - inBox);
    surf *= 1.0 - 0.14 * smoothstep(0.6, 0.75, fbm3(wp * 0.04 + 8.0)) * (1.0 - inBox);
    surf = mix(surf, surf * vec3(0.78, 0.74, 0.68) * (0.85 + 0.3 * gStreak), gutter);
    surf = mix(surf, vec3(0.30, 0.22, 0.10) * (0.8 + 0.4 * n3), litter * 0.85);
    surf = mix(surf, vec3(0.34, 0.32, 0.29), grit * 0.5);
    // ---- markings, each box-filtered over the pixel footprint and faded out where they stop at junctions
    float wearM = (0.6 + 0.4 * smoothstep(0.3, 0.7, fbm3(wp * 0.35 + 11.0))) * (1.0 - 0.45 * frontage);
    float lineOK = mix(1.0, aaStep(5.0, a, fwA), fBox + fStop + fLadder + fLines > 0.5 ? 1.0 : 0.0);
    float edgeOK = mix(1.0, aaStep(4.0, a, fwA), fBox + fLadder + fLines > 0.5 ? 1.0 : 0.0);
    // T junctions break the edge line on the stem side only
    float tGap = 1.0 - aaStep(0.0, a, fwA);
    edgeOK *= 1.0 - tGap * (across > 0.0 ? fEdgeP : fEdgeM);
    vec3 white = vec3(0.86, 0.86, 0.84), yellow = vec3(0.86, 0.66, 0.16);
    float whiteC = 0.0, yellowC = 0.0;
    float dashPulse = mix(aaLine((fract(along / 12.0) - 0.125) * 12.0, 1.5, fwA), 0.25, smoothstep(2.0, 6.0, fwA));
    if (lanes >= 3.5) {
      // divided arterial: double yellow centre, dashed white lane line, solid white edge line
      float dbl = aaLine(abs(xm) - 0.2, 0.06, fwX);
      yellowC = dbl * lineOK;
      float laneLine = aaLine(abs(xm) - (laneO + laneW), 0.06, fwX) * dashPulse * lineOK;
      float edgeLine = aaLine(abs(xm) - (median > 0.5 ? min(7.1, hw - 0.4) : min(6.35, hw - 0.45)), 0.06, fwX) * edgeOK;
      whiteC = max(laneLine, edgeLine);
      // the ghost of the previous lane line where a repaving band was re-striped 45 cm over, its dashes out of step
      float ghostPulse = mix(aaLine((fract((along + 4.0) / 12.0) - 0.125) * 12.0, 1.5, fwA), 0.25, smoothstep(2.0, 6.0, fwA));
      float ghost = step(0.6, hash11(bk * 3.7 + 2.0 + cls)) * aaLine(abs(xm) - (laneO + laneW + 0.45), 0.07, fwX) * ghostPulse * lineOK;
      whiteC = max(whiteC, 0.22 * ghost);
    } else if (width >= 11.5) {
      // dense-district street: solid double yellow and the white line of the parking lane
      yellowC = aaLine(abs(xm) - 0.2, 0.06, fwX) * lineOK;
      whiteC = aaLine(abs(xm) - 3.6, 0.06, fwX) * edgeOK;
      // blacked-out old parking-lane line 40 cm inboard on half the repaving bands
      float ghost = step(0.5, hash11(bk * 3.7 + 2.0 + cls)) * aaLine(abs(xm) - 3.2, 0.07, fwX) * edgeOK;
      whiteC = max(whiteC, 0.18 * ghost);
    } else {
      // local street: a dashed yellow centre only
      yellowC = aaLine(xm, 0.07, fwX) * dashPulse * lineOK;
    }
    if (marked > 0.5) {
      // crosswalk: two transverse lines 3 m apart, ladder bars between them where signalised
      float cw1 = aaLine(a - 0.65, 0.15, fwA), cw2 = aaLine(a - 3.65, 0.15, fwA);
      float span = aaStep(abs(xm), hw - 0.35, fwX);
      float bars = aaLine((fract((xm + hw) / 1.2) - 0.5) * 1.2, 0.3, fwX) * aaLine(a - 2.15, 1.35, fwA);
      bars = mix(bars, 0.5 * aaLine(a - 2.15, 1.35, fwA), smoothstep(0.4, 1.0, fwX));
      // continuous across the centreline (the centre lines stop 5 m short of the box, so nothing overlaps)
      float xwalk = (fLadder + fLines) * max(cw1, cw2) * span;
      xwalk = max(xwalk, fLadder * bars * aaStep(abs(xm), hw - 0.3, fwX));
      // stop bar across the approach half, 4.5 m out (behind the crosswalk)
      float stopBar = fStop * appr * aaLine(a - 4.5, 0.3, fwA) * aaStep(0.35, abs(xm), fwX) * aaStep(abs(xm), hw - 0.35, fwX);
      float junction = max(xwalk, stopBar);
      // lane arrows on the approach lanes of arterials, 8-12 m before the stop bar
      if (fArrows > 0.5 && lanes >= 3.5) {
        float u = 11.5 - a;
        float lane0 = laneO + 1.6, lane1 = laneO + 1.6 + laneW;
        float v0 = (abs(xm) - lane0), v1 = (abs(xm) - lane1);
        float fwArrow = max(fwX, fwA);
        float arrows = max(arrowLeft(vec2(u, v0), fwArrow), arrowStraight(vec2(u, v1), fwArrow)) * appr * (1.0 - smoothstep(0.25, 0.7, fp));
        junction = max(junction, arrows);
      }
      whiteC = max(whiteC, junction);
    }
    // paint ages: worn thin along the wheel paths, and the whole marking fades to a stain from the air. On a third
    // of the repaving bands the stripes are the old coat — half as bright and, at eye level, flaked away in 0.8 m
    // bites — where the fresh bands carry crisp new paint: the re-striped and the not-yet-re-striped side by side
    float oldPaint = step(0.66, hash11(bk * 5.3 + 11.0 + cls));
    float flake = mix(1.0, 0.25 + 0.75 * step(0.42, vnoise(wp * 1.3 + 21.0)), oldPaint * (1.0 - smoothstep(0.1, 0.4, fp)));
    wearM *= mix(1.0, 0.55, oldPaint) * flake;
    whiteC *= wearM * (1.0 - 0.35 * wheel);
    yellowC *= wearM * (1.0 - 0.3 * wheel);
    diffuseColor.rgb = mix(surf, white, whiteC * 0.92);
    diffuseColor.rgb = mix(diffuseColor.rgb, yellow, yellowC * 0.92);
    // ---- ironwork: manhole covers in the lanes, gully gratings along the kerbs (gone once they are a pixel)
    float ironFade = 1.0 - smoothstep(0.22, 0.6, fp);
    if (ironFade > 0.0 && cls < 2.5) {
      // a manhole in 70 % of 26 m cells, where the utilities run: on the centreline (the sewer, between the yellow
      // lines) or in a lane's centre between the wheel paths, never in a wheel path or the gutter
      float mc = floor(along / 26.0);
      float mh = hash11(mc * 3.1 + cls * 7.0);
      vec2 mo = hash22(vec2(mc, cls * 5.0));
      float ma = (mc + 0.2 + mo.x * 0.6) * 26.0;
      float laneC = (lanes >= 3.5 ? laneO + 1.6 + laneW * step(0.5, hash11(mc * 0.7 + cls)) : 1.8);
      float mx = (mo.y < 0.35 ? 0.0 : (mo.y < 0.68 ? -laneC : laneC)) + (hash11(mc * 5.9 + cls) - 0.5) * 0.3;
      mx = clamp(mx, -(hw - 1.6), hw - 1.6);
      float md = length(vec2(along - ma, xm - mx));
      float manhole = step(0.3, mh) * (1.0 - smoothstep(0.32 - fp, 0.32 + fp, md)) * ironFade * (1.0 - inBox);
      float rim = manhole * smoothstep(0.2, 0.3, md);
      // cast iron polished by the traffic: paler and warmer than the aged asphalt around it, a brighter rim ring
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.21, 0.19, 0.17) * (0.85 + 0.45 * rim), manhole);
      // 15 cm valve and survey covers, one per 9 m in half the cells, gone once they are a pixel
      float vc = floor(along / 9.0 + 0.5);
      vec2 vo = hash22(vec2(vc, 9.0 + cls));
      float va = (vc + vo.x * 0.8 - 0.4) * 9.0, vx = (vo.y - 0.5) * (width - 2.4);
      float vd = length(vec2(along - va, xm - vx));
      float valve = step(0.45, hash11(vc * 1.9 + cls)) * (1.0 - smoothstep(0.15 - fp, 0.15 + fp, vd)) * (1.0 - smoothstep(0.06, 0.2, fp)) * (1.0 - inBox);
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.20, 0.19, 0.17) * (0.8 + 0.5 * smoothstep(0.08, 0.14, vd)), valve);
      manhole = max(manhole, valve);
      float gc = floor(along / 24.0);
      float ga = (gc + 0.3 + hash11(gc * 1.7 + cls) * 0.4) * 24.0;
      float gx = hw - 0.45;
      float grate = aaLine(along - ga, 0.45, fwA) * aaLine(abs(xm) - gx, 0.22, fwX) * ironFade * (1.0 - inBox);
      float slots = mix(step(0.5, fract((along - ga) / 0.16)), 0.5, smoothstep(0.05, 0.12, fp));
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.10, 0.10, 0.11) * (0.6 + 0.8 * slots), grate);
      roughnessFactor = mix(0.93, 0.55, max(manhole, grate));
    } else roughnessFactor = 0.93;
    // open aggregate is matte (no sky sheen at grazing angles); the wheel paths are polished — at eye level to a
    // sheen band that the crown shifts across the road — and fresh patches and paint are smoother still
    roughnessFactor -= (0.1 + 0.14 * nearF) * wheel * (1.0 - inBox);
    roughnessFactor = mix(roughnessFactor, 0.72, max(whiteC, yellowC) * 0.6 + repair * 0.4 + trench * 0.3 + mfInner * 0.3 * step(mfTone, 1.0));
    roughnessFactor += 0.06 * n2 - 0.03;
    // the carriageway's 2 % crown, softened over the centre metre, flat through the junction boxes
    roadCrown = 0.02 * clamp(xm / 0.5, -1.0, 1.0) * (1.0 - inBox);
  }
}
`;
/** Applied after normal_fragment_maps: the surface falls from the centreline to both kerbs, so the shading normal
 *  leans toward the centre and the specular band (the sky's sheen on the polished wheel paths) shifts across the
 *  road as on a real street. The across direction is the world-space gradient of the across coordinate. */
const ROAD_FRAG_CROWN = /* glsl */ `
if (roadCrown != 0.0) {
  vec3 gA = dFdx(vWorldPosR) * dFdx(vRoadUv.x) + dFdy(vWorldPosR) * dFdy(vRoadUv.x);
  if (dot(gA, gA) > 1e-14) {
    vec3 acrossV = normalize((viewMatrix * vec4(normalize(gA), 0.0)).xyz);
    normal = normalize(normal - acrossV * roadCrown);
  }
}
`;

/** Chain frame at `s` with the mitred cross vector (the strip's across direction, scaled at polyline bends so the
 *  edges stay parallel to the centre line). */
export function frameAt(c: RoadChain, cross: Vec2[], s: number): { x: number; z: number; cx: number; cz: number } {
  const n = c.pts.length;
  let i = 0;
  while (i < n - 2 && c.cum[i + 1] < s) i++;
  const [ax, az] = c.pts[i], [bx, bz] = c.pts[i + 1];
  const len = c.cum[i + 1] - c.cum[i] || 1;
  const t = clamp((s - c.cum[i]) / len, 0, 1);
  const c0 = cross[i], c1 = cross[i + 1];
  return { x: ax + (bx - ax) * t, z: az + (bz - az) * t, cx: c0[0] + (c1[0] - c0[0]) * t, cz: c0[1] + (c1[1] - c0[1]) * t };
}

/** Mitred cross vectors per polyline vertex of a chain (segment normal at the ends, clamped mitre inside). */
export function chainCross(c: RoadChain): Vec2[] {
  const m = c.pts.length;
  const dirs: Vec2[] = [];
  for (let i = 0; i < m - 1; i++) {
    const dx = c.pts[i + 1][0] - c.pts[i][0], dz = c.pts[i + 1][1] - c.pts[i][1];
    const len = Math.hypot(dx, dz) || 1;
    dirs.push([dx / len, dz / len]);
  }
  const cross: Vec2[] = [];
  for (let i = 0; i < m; i++) {
    const d0 = dirs[Math.max(0, i - 1)], d1 = dirs[Math.min(m - 2, i)];
    let nx = -(d0[1] + d1[1]), nz = d0[0] + d1[0];
    const nl = Math.hypot(nx, nz) || 1;
    nx /= nl; nz /= nl;
    const cosHalf = Math.max(0.5, nx * -d1[1] + nz * d1[0]);
    cross.push([nx / cosHalf, nz / cosHalf]);
  }
  return cross;
}

/** Along-positions where the strip needs a row between `sa` and `sb`: the ends, every polyline vertex inside and
 *  steps of at most `step` metres between them. */
export function rowPositions(c: RoadChain, sa: number, sb: number, step: number): number[] {
  const breaks = [sa];
  for (const s of c.cum) if (s > sa + 0.01 && s < sb - 0.01) breaks.push(s);
  breaks.push(sb);
  const out: number[] = [];
  for (let i = 0; i < breaks.length - 1; i++) {
    const a = breaks[i], b = breaks[i + 1];
    const n = Math.max(1, Math.ceil((b - a) / step));
    for (let k = 0; k < n; k++) out.push(a + ((b - a) * k) / n);
  }
  out.push(sb);
  return out;
}

/** All roads in one merged vertex buffer, indexed per ROAD_CHUNK cell (one draw call per cell in view).
 *  Each chain is a strip that follows the height field at 15 m steps; its rows are split at the midpoints
 *  between successive intersections so every vertex carries the nearest intersection (`aIsect`: along, box
 *  reach before / after, marking flags) as a constant, and stubs stop at the edge of the road they end on.
 *  Curb-return fillets fill the corner between two roads with plain asphalt. */
export function buildRoadMeshes(map: WorldMap, graph: RoadGraph, material: THREE.Material): THREE.Mesh[] {
  const pos: number[] = [], uv: number[] = [], info: number[] = [], isect: number[] = [], idx: number[] = [], nrm: number[] = [];
  let vcount = 0;
  const clsId = (c: RoadClass) => (c === 'highway' || c === 'causeway' ? 3 : c === 'arterial' ? 2 : c === 'runway' ? 5 : c === 'taxiway' ? 6 : c === 'lane' ? 0 : 1);
  const NONE = [-1e5, 0, 0, 0];
  const highways = graph.chains.filter((c) => c.cls === 'highway' || c.cls === 'causeway');
  for (const chain of graph.chains) {
    if (chain.s1 - chain.s0 < 1) continue;
    const cross = chainCross(chain);
    const hw = chain.hw, cid = clsId(chain.cls), lanes = chain.lanes, lift = chain.lift;
    // a street running beside a highway (its edge within 8 m of the shoulder, parallel) is a frontage street: the
    // shader takes the flag from the fraction of the class code (+0.25) and tones it down — beside the pale
    // highway it read as 22 m of bright pavement from the air (highway agent's request 3)
    const frontageAt = (s: number): boolean => {
      if (chain.cls !== 'street') return false;
      const f = chainFrame(chain, s);
      for (const h of highways) {
        const g = highwayGap(h, f.x, f.z, f.dx, f.dz);
        if (g !== null && g < hw + 8) return true;
      }
      return false;
    };
    // regions of constant nearest-intersection: split at the midpoints between successive nodes
    const regions: { sa: number; sb: number; att: number[] }[] = [];
    const nodes = chain.nodes.filter((cn) => cn.s >= chain.s0 - 60 && cn.s <= chain.s1 + 60);
    if (!nodes.length) regions.push({ sa: chain.s0, sb: chain.s1, att: NONE });
    else {
      let sa = chain.s0;
      for (let i = 0; i < nodes.length; i++) {
        const sb = i < nodes.length - 1 ? clamp((nodes[i].s + nodes[i + 1].s) / 2, chain.s0, chain.s1) : chain.s1;
        if (sb > sa + 0.01) regions.push({ sa, sb, att: [nodes[i].s, nodes[i].hMinus, nodes[i].hPlus, nodes[i].flags] });
        sa = sb;
      }
    }
    chain.rows.length = 0; chain.rowY[0].length = 0; chain.rowY[1].length = 0;
    for (const rg of regions) {
      let first = true;
      for (const s of rowPositions(chain, rg.sa, rg.sb, 15)) {
        const f = frameAt(chain, cross, s);
        const frontage = frontageAt(s);
        chain.rows.push(s);
        for (const side of [-1, 1]) {
          const px = f.x + f.cx * hw * side, pz = f.z + f.cz * hw * side;
          const h = map.heightAt(px, pz) + ROAD_LIFT + lift;
          chain.rowY[side < 0 ? 0 : 1].push(h);
          pos.push(px, h, pz);
          nrm.push(0, 1, 0);
          uv.push(side, s);
          info.push(lanes, chain.width, cid + (frontage ? 0.25 : 0));
          isect.push(rg.att[0], rg.att[1], rg.att[2], rg.att[3]);
        }
        vcount += 2;
        if (!first) idx.push(vcount - 4, vcount - 3, vcount - 2, vcount - 2, vcount - 3, vcount - 1);
        first = false;
      }
    }
  }
  // corner fillets: a fan from the edge-line corner point over the curb-return arc, plain asphalt
  for (const node of graph.nodes) {
    for (const k of node.corners) {
      const ch = k.a.chain;
      const cid = clsId(ch.cls);
      const base = vcount;
      const put = (p: Vec2) => {
        pos.push(p[0], map.heightAt(p[0], p[1]) + ROAD_LIFT + ch.lift, p[1]);
        nrm.push(0, 1, 0);
        uv.push(0, 0);
        info.push(ch.lanes, ch.width, cid);
        isect.push(0, 1e4, 1e4, ROAD_F_BOX);
        vcount++;
      };
      put(k.c);
      for (const p of k.arc) put(p);
      // orientation: keep the fan facing up (+y) whatever the sweep direction
      const o = k.arc[0], p1 = k.arc[k.arc.length - 1];
      const ccw = (o[0] - k.c[0]) * (p1[1] - k.c[1]) - (o[1] - k.c[1]) * (p1[0] - k.c[0]);
      for (let i = 1; i < k.arc.length; i++) {
        if (ccw < 0) idx.push(base, base + i, base + i + 1);
        else idx.push(base, base + i + 1, base + i);
      }
    }
  }
  // one vertex buffer, one index range per ROAD_CHUNK-metre cell (triangles bucketed by centroid, in their
  // original order) so the renderer frustum-culls the network instead of drawing all ~250 k triangles
  // wherever the camera looks; each chunk carries the bounds of its own vertices
  const position = new THREE.Float32BufferAttribute(pos, 3);
  const normal = new THREE.Float32BufferAttribute(nrm, 3);
  const roadUv = new THREE.Float32BufferAttribute(uv, 2);
  const roadInfo = new THREE.Float32BufferAttribute(info, 3);
  const roadIsect = new THREE.Float32BufferAttribute(isect, 4);
  const chunks = new Map<number, number[]>();
  for (let t = 0; t < idx.length; t += 3) {
    const a = idx[t], b = idx[t + 1], c = idx[t + 2];
    const cx = (pos[a * 3] + pos[b * 3] + pos[c * 3]) / 3, cz = (pos[a * 3 + 2] + pos[b * 3 + 2] + pos[c * 3 + 2]) / 3;
    const key = Math.floor((cx + 10000) / ROAD_CHUNK) * 4096 + Math.floor((cz + 10000) / ROAD_CHUNK);
    let list = chunks.get(key);
    if (!list) { list = []; chunks.set(key, list); }
    list.push(a, b, c);
  }
  const meshes: THREE.Mesh[] = [];
  const box = new THREE.Box3(), v = new THREE.Vector3();
  for (const list of chunks.values()) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', position);
    g.setAttribute('normal', normal);
    g.setAttribute('aRoadUv', roadUv);
    g.setAttribute('aRoadInfo', roadInfo);
    g.setAttribute('aIsect', roadIsect);
    g.setIndex(list);
    box.makeEmpty();
    for (const i of list) box.expandByPoint(v.set(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]));
    g.boundingBox = box.clone();
    g.boundingSphere = box.getBoundingSphere(new THREE.Sphere());
    const mesh = new THREE.Mesh(g, material);
    mesh.receiveShadow = true;
    mesh.castShadow = false;
    mesh.renderOrder = 2;
    mesh.matrixAutoUpdate = false;
    meshes.push(mesh);
  }
  return meshes;
}

/** Gap (m) between the point (x, z) and the edge of highway chain `h` where the local direction (dx, dz) runs
 *  parallel to it (|cos| > 0.9) and the point is within 60 m of its centreline; null elsewhere. */
export function highwayGap(h: RoadChain, x: number, z: number, dx: number, dz: number): number | null {
  let best: number | null = null;
  for (let i = 0; i < h.pts.length - 1; i++) {
    const [ax, az] = h.pts[i], [bx, bz] = h.pts[i + 1];
    const ex = bx - ax, ez = bz - az, l2 = ex * ex + ez * ez;
    if (l2 < 1) continue;
    const t = clamp(((x - ax) * ex + (z - az) * ez) / l2, 0, 1);
    const d = Math.hypot(x - (ax + ex * t), z - (az + ez * t));
    if (d > 60) continue;
    const l = Math.sqrt(l2);
    if (Math.abs((dx * ex + dz * ez) / l) < 0.9) continue;
    const gap = d - h.hw;
    if (best === null || gap < best) best = gap;
  }
  return best;
}

/** Road network chunk size (m): a cell is one draw call when in view. */
const ROAD_CHUNK = 3000;

/** Surface height of a chain's carriageway edge (side -1 / +1) at along `s`, interpolated between the mesh rows
 *  (exact where the sidewalk shares a row with the pavement). */
export function roadEdgeY(c: RoadChain, s: number, side: number): number {
  const rows = c.rows, ys = c.rowY[side < 0 ? 0 : 1];
  const n = rows.length;
  if (n === 0) return ROAD_LIFT + c.lift;
  if (s <= rows[0]) return ys[0];
  if (s >= rows[n - 1]) return ys[n - 1];
  let lo = 0, hi = n - 1;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (rows[mid] <= s) lo = mid; else hi = mid; }
  const span = rows[hi] - rows[lo];
  const t = span > 1e-6 ? (s - rows[lo]) / span : 0;
  return ys[lo] + (ys[hi] - ys[lo]) * t;
}

/** Street-lamp light pools at night: a ground-plane irradiance map of every lamp (built by the streets system,
 *  sqrt-encoded 8-bit texels a few metres wide) sampled by the road and sidewalk materials, plus the warm lamp colour
 *  already scaled by the night factor. `uLampRect` = (x0, z0, 1 / width, 1 / depth) of the map in world metres. */
export interface RoadLightUniforms { uLampMap: THREE.IUniform<THREE.Texture>; uLampRect: THREE.IUniform<THREE.Vector4>; uLampColor: THREE.IUniform<THREE.Vector3> }
export function createRoadLightUniforms(): RoadLightUniforms {
  const empty = new THREE.DataTexture(new Uint8Array([0]), 1, 1, THREE.RedFormat, THREE.UnsignedByteType);
  empty.needsUpdate = true;
  return { uLampMap: { value: empty }, uLampRect: { value: new THREE.Vector4(0, 0, 0, 0) }, uLampColor: { value: new THREE.Vector3(0, 0, 0) } };
}
export const GLSL_LIGHT_POOLS = /* glsl */ `
uniform sampler2D uLampMap;
uniform vec4 uLampRect;
uniform vec3 uLampColor;
/** irradiance of the street lamps on the ground at p (the map stores sqrt of the pooled intensity) */
vec3 lampPools(vec3 p) {
  vec2 uv = (p.xz - uLampRect.xy) * uLampRect.zw;
  float m = texture2D(uLampMap, uv).r;
  return uLampColor * (m * m);
}
`;

export function createRoadMaterial(lights: RoadLightUniforms): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, metalness: 0.0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uLampMap = lights.uLampMap;
    shader.uniforms.uLampRect = lights.uLampRect;
    shader.uniforms.uLampColor = lights.uLampColor;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec2 aRoadUv; attribute vec3 aRoadInfo; attribute vec4 aIsect; varying vec2 vRoadUv; varying vec3 vRoadInfo; varying vec4 vIsect; varying vec3 vWorldPosR;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvRoadUv = aRoadUv; vRoadInfo = aRoadInfo; vIsect = aIsect; vWorldPosR = (modelMatrix * vec4(position, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${ROAD_FRAG_PARS}\n${GLSL_LIGHT_POOLS}`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>\n${ROAD_FRAG_MAIN}`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>\n${ROAD_FRAG_CROWN}`)
      // the lamp pools are added as emitted light of the surface (albedo-tinted), after the lit shading
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * lampPools(vWorldPosR);');
    balanceGroundIbl(shader);
  };
  mat.customProgramCacheKey = () => 'road-v5';
  return mat;
}

export { clamp, CLASS_WIDTH };
export type { District };
