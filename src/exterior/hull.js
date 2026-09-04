// Exterior hull (workstream EXT-A). Every surface reads from spec.js and is emitted into z-chunked,
// LOD-layered merged meshes (hull_util.ChunkSet):
//  * the seven lofted faces of hullSection become fields of armour plates (skin quads with per-plate
//    tints at the far level; raised chamfered slabs 0.35–0.9 m at the near level),
//  * cuts in the skin for the hangar mouth (open hole + well walls), the reactor bulb, the docking
//    recess and the dorsal / ventral channels (recessed floors, walls, ribs, pipes, lights),
//  * the lateral side trench with its "city" of 10–40 m machinery blocks (large blocks merged, small
//    sub-blocks instanced), stanchions, a service pipe and lit window bands,
//  * edge rails along the dorsal and ventral corners, a hardened bow tip cap and armour belts,
//  * the stern: closed hull face with soot around the nozzles and the aft faces of the terraces.
// Superstructure, tower and engines live in their own modules; greebles / weapons are EXT-B's layers.
import * as THREE from "three";
import { Kit, rng } from "../kit.js";
import { PALETTE } from "../materials.js";
import { HULL, TRENCH, hullSection, hullTopY, hullBottomY, hullHalfWidth, TERRACES, VENTRAL, HANGAR } from "../spec.js";
import { ChunkSet, plateField, channel, ensureExtMaterials, C, shade, mixC, jitter, plateTone, fieldNoise, TEXEL, EMIT } from "./hull_util.js";
import { buildSuperstructure, terraceBaseHalfWidth, tierLevels, tierWallX, hexa } from "./superstructure.js";
import { buildTower } from "./tower.js";
import { buildEngines, engineSoot, HOUSING } from "./engines.js";

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const UP = V(0, 1, 0);
const DOWN = V(0, -1, 0);
const Z = V(0, 0, 1);
const MACH = 1 / 12; // machinery tile ≈ 12 m
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const smooth = (a, b, x) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

// ---------------------------------------------------------------------------
// hull geometry shorthands (all linear in z: every face of the loft is a plane through the bow tip)
// ---------------------------------------------------------------------------
const w = hullHalfWidth;
const yT = hullTopY;
const yB = hullBottomY;
const lipY = (z) => yB(z) + TRENCH.lipV * (yT(z) - yB(z)); // trench ceiling
const floorY = (z) => yB(z) + TRENCH.floorV * (yT(z) - yB(z)); // trench floor
const wallX = (z) => TRENCH.wallU * w(z); // trench back wall
const trenchDepth = (z) => TRENCH.depthU * w(z);
const topX = (z) => 0.72 * w(z); // dorsal plate edge
const botX = (z) => 0.62 * w(z); // ventral plate edge
const T0 = TERRACES[0];
const footprint = (z) => (z >= T0.zFront ? terraceBaseHalfWidth(T0, z) : 0);
const perp = (dx, dy) => V(-dy, dx, 0).normalize();
const UPPER_N = perp(0.28 * HULL.halfWidthStern, -(1 - TRENCH.lipV) * HULL.thicknessStern); // outward normal of the upper slope
const LOWER_N = perp(-0.38 * HULL.halfWidthStern, -TRENCH.floorV * HULL.thicknessStern); // outward normal of the lower slope
const UPPER_T = V(0.28 * HULL.halfWidthStern, -(1 - TRENCH.lipV) * HULL.thicknessStern, 0).normalize(); // along the upper slope, outward-down
const LOWER_T = V(0.38 * HULL.halfWidthStern, TRENCH.floorV * HULL.thicknessStern, 0).normalize(); // along the lower slope from the bottom edge, outward-up

const CAP_Z = -958; // hardened bow tip cap ends here
const BELTS = [
  [-930, 1.0, 6],
  [-892, 0.8, 5],
  [-848, 0.7, 5],
]; // [z, proud, length]
// channels cut into the dorsal / ventral plates
const MOAT = { zA: -380, zB: 585, halfW: 7, depth: 4.5, xc: (z) => footprint(z) + 9 };
const OUTER = { zA: -640, zB: 575, halfW: 5, depth: 3.5, xc: (z) => topX(z) - 24 };
const VENT = { zA: -560, zB: 570, halfW: 5.5, depth: 4, xc: (z) => 0.31 * w(z) };
const RB = VENTRAL.reactorBulb;
const BULB_R = Math.sqrt(RB.r * RB.r - (yB(RB.z) - RB.yCenter) ** 2); // bulb / plate intersection radius
const BULB_HALF = 69;
const DOCK = VENTRAL.dockingRecess;
const MOUTH = HANGAR.opening;

// ---------------------------------------------------------------------------
// paint
// ---------------------------------------------------------------------------
const hash2 = (x, z) => {
  let n = (Math.floor(x / 3) * 374761393 + Math.floor(z / 3) * 668265263) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
};
/**
 * Skin tint: two low-frequency paint layers (150 m and 380 m, ±4 % each) so the plating has a slow
 * tonal drift rather than a per-tile quilt, a few replaced plates one step darker, and soot toward
 * the stern (the engine wash reaches ~100 m forward along the dorsal and ventral plates).
 */
const paint = (base, alt, seed) => (x, y, z) => {
  let c = shade(base, (0.96 + fieldNoise(x, z, 150, seed) * 0.08) * (0.97 + fieldNoise(x + 3000, z, 380, seed + 1) * 0.06));
  const h = hash2(x, z);
  if (h < 0.06) c = mixC(c, alt, 0.35);
  else if (h > 0.96) c = shade(c, 1.04);
  return shade(c, 1 - 0.38 * smooth(480, 600, z) * (0.7 + 0.3 * fieldNoise(x, z, 40, seed + 2)));
};
const slabTint = (r, base) => mixC(plateTone(r), base, 0.5);
const nearBelt = (z) => z < CAP_Z + 4 || BELTS.some(([bz, , len]) => Math.abs(z - bz) < len / 2 + 3.5);

/** Alternating plate / skip strips from sorted cuts; the strip count only depends on the cut count. */
function cutStrips(sMax, cuts) {
  const out = [];
  let s = 0;
  for (const [a, b] of cuts) {
    const a1 = Math.min(Math.max(s, a), sMax);
    const b1 = Math.min(Math.max(a1, b), sMax);
    out.push({ s0: s, s1: a1, kind: "plate" });
    out.push({ s0: a1, s1: b1, kind: "skip" });
    s = b1;
  }
  out.push({ s0: s, s1: sMax, kind: "plate" });
  return out;
}
const inRange = (z, a, b) => z >= a && z <= b;
function topCutsBase(z) {
  const cuts = [];
  if (z >= T0.zFront) cuts.push([0, footprint(z) - 1]);
  if (inRange(z, MOAT.zA, MOAT.zB)) cuts.push([MOAT.xc(z) - MOAT.halfW, MOAT.xc(z) + MOAT.halfW]);
  if (inRange(z, OUTER.zA, OUTER.zB)) cuts.push([OUTER.xc(z) - OUTER.halfW, OUTER.xc(z) + OUTER.halfW]);
  return cuts;
}
// large recessed service hatches on the dorsal plate, in lanes clear of the channels / footprint
const HATCHES = (() => {
  const out = [];
  const r = rng(4242);
  const zEndCh = Math.min(MOAT.zB, OUTER.zB) - 3;
  for (let z = -920; z < 540; z += 60 + r() * 70) {
    const len = 14 + r() * 12;
    const z1 = z + len;
    // lanes (centreline xc(z), max half-width): forward plate, between the channels, outboard lane
    const lanes = [];
    if (z1 < T0.zFront - 6) for (const k of [0.28, 0.55]) lanes.push({ xc: (zz) => k * topX(zz), hwMax: 8 });
    if (z > MOAT.zA + 3 && z1 < zEndCh) lanes.push({ xc: (zz) => (MOAT.xc(zz) + MOAT.halfW + OUTER.xc(zz) - OUTER.halfW) / 2, hwMax: 8.5 });
    if (z > OUTER.zA + 3 && z1 < OUTER.zB - 3) lanes.push({ xc: (zz) => (OUTER.xc(zz) + OUTER.halfW + topX(zz) - 4.5) / 2, hwMax: 4 });
    if (!lanes.length) continue;
    const lane = lanes[Math.floor(r() * lanes.length)];
    const hw = Math.min(lane.hwMax, 4 + r() * 4.5);
    const ok = [z, z1].every((zz) => {
      const xc = lane.xc(zz);
      if (xc + hw > topX(zz) - 4.5 || xc - hw < 3) return false;
      return topCutsBase(zz).every(([a, b]) => xc + hw + 2.5 < a || xc - hw - 2.5 > b);
    });
    if (ok) out.push({ z0: z, z1, xc: lane.xc, hw, depth: 1.4 });
  }
  return out;
})();
function topCuts(z) {
  const cuts = topCutsBase(z);
  for (const h of HATCHES) if (inRange(z, h.z0, h.z1)) cuts.push([h.xc(z) - h.hw, h.xc(z) + h.hw]);
  return cuts.sort((a, b) => a[0] - b[0]);
}
function botCuts(z) {
  const cuts = [];
  if (inRange(z, MOUTH.z0, MOUTH.z1)) cuts.push([0, MOUTH.x1]);
  if (Math.abs(z - RB.z) <= BULB_HALF) cuts.push([0, Math.sqrt(Math.max(0, BULB_R * BULB_R - (z - RB.z) ** 2)) - 1.5]);
  if (inRange(z, DOCK.z - DOCK.hl, DOCK.z + DOCK.hl)) cuts.push([0, DOCK.hw]);
  if (inRange(z, VENT.zA, VENT.zB)) cuts.push([VENT.xc(z) - VENT.halfW, VENT.xc(z) + VENT.halfW]);
  return cuts;
}

// ---------------------------------------------------------------------------
// plated skins of the seven lofted faces
// ---------------------------------------------------------------------------
function buildSkins(ctx) {
  const { chunks, rand } = ctx;
  const { hullLight: L, hullMid: M, hullDark: D, hullTrench: T } = PALETTE;
  const zStart = CAP_Z - 2;
  const zEnd = HULL.zStern;
  const splits = [T0.zFront, MOAT.zA, MOAT.zB, OUTER.zA, OUTER.zB, VENT.zA, VENT.zB, MOUTH.z0, MOUTH.z1, RB.z - BULB_HALF, RB.z + BULB_HALF, DOCK.z - DOCK.hl, DOCK.z + DOCK.hl, ...HATCHES.flatMap((h) => [h.z0, h.z1])];
  const full = () => [{ s0: 0, s1: 1, kind: "plate" }];
  const bare = () => [{ s0: 0, s1: 1, kind: "bare" }];

  // dorsal plate
  plateField(chunks, rand, {
    zStart,
    zEnd,
    rowLen: [7, 12],
    zSplits: splits,
    strips: (z) => cutStrips(topX(z), topCuts(z)),
    point: (z, s) => V(s, yT(z), z),
    normal: UP,
    cellW: 8,
    slabP: 0.42,
    slabH: [0.35, 0.9],
    skinKey: "hullPlate",
    slabKeys: ["hullPlate", "exta_plate2"],
    tint: paint(L, M, 3),
    slabTint,
    slabOK: (x, y, z) => !nearBelt(z) && Math.abs(x) < topX(z) - 3.6 && !(z >= T0.zFront && Math.abs(x) < footprint(z) + 2.6) && !HATCHES.some((h) => z > h.z0 - 5 && z < h.z1 + 5 && Math.abs(Math.abs(x) - h.xc(z)) < h.hw + 5),
  });
  // upper slope
  plateField(chunks, rand, {
    zStart,
    zEnd,
    rowLen: [7, 12],
    strips: full,
    point: (z, s) => V(topX(z) + s * (w(z) - topX(z)), yT(z) + s * (lipY(z) - yT(z)), z),
    normal: UPPER_N,
    cellW: 9,
    slabP: 0.4,
    slabH: [0.35, 0.8],
    skinKey: "exta_plate2",
    slabKeys: ["exta_plate2", "hullPlate1"],
    tint: paint(shade(L, 0.97), M, 7),
    slabTint,
    slabOK: (x, y, z) => !nearBelt(z) && y < yT(z) - 1.9,
  });
  // trench: ceiling (lip underside), back wall, floor — bare dark skins, the city goes on top
  const trench = (point, normal, key, tint, texel) =>
    plateField(chunks, rand, { zStart, zEnd, rowLen: [16, 32], strips: bare, point, normal, cellW: 40, skinKey: key, slabKeys: [key], tint: () => tint, texel });
  trench((z, s) => V(w(z) + s * (wallX(z) - w(z)), lipY(z), z), DOWN, "hullGreeble", shade(D, 0.9), TEXEL * 2);
  // wall and floor at ~0.35 albedo: the canyon reads as a dark band even where the sun reaches in
  trench((z, s) => V(wallX(z), lipY(z) + s * (floorY(z) - lipY(z)), z), V(1, 0, 0), "exta_machinery", mixC(D, M, 0.3), MACH);
  trench((z, s) => V(wallX(z) + s * (w(z) - wallX(z)), floorY(z), z), UP, "hullGreeble", mixC(T, D, 0.3), TEXEL * 2);
  // lower slope
  plateField(chunks, rand, {
    zStart,
    zEnd,
    rowLen: [7, 12],
    strips: full,
    point: (z, s) => V(w(z) + s * (botX(z) - w(z)), floorY(z) + s * (yB(z) - floorY(z)), z),
    normal: LOWER_N,
    cellW: 9,
    slabP: 0.38,
    slabH: [0.35, 0.8],
    skinKey: "hullPlate1",
    slabKeys: ["hullPlate1", "exta_plate2"],
    tint: paint(mixC(L, M, 0.35), M, 11),
    slabTint,
    slabOK: (x, y, z) => !nearBelt(z) && y > yB(z) + 1.0,
  });
  // ventral plate
  const nearFrame = (x, z, hw, z0, z1) => Math.abs(x) < hw + 6 && z > z0 - 6 && z < z1 + 6;
  plateField(chunks, rand, {
    zStart,
    zEnd,
    rowLen: [7, 12],
    zSplits: splits,
    strips: (z) => cutStrips(botX(z), botCuts(z)),
    point: (z, s) => V(s, yB(z), z),
    normal: DOWN,
    cellW: 9,
    slabP: 0.36,
    slabH: [0.35, 0.8],
    skinKey: "hullPlate",
    slabKeys: ["hullPlate", "hullPlate1"],
    tint: paint(mixC(L, M, 0.5), M, 13),
    slabTint,
    slabOK: (x, y, z) => !nearBelt(z) && Math.abs(x) < botX(z) - 3 && !nearFrame(x, z, MOUTH.x1, MOUTH.z0, MOUTH.z1) && !nearFrame(x, z, DOCK.hw, DOCK.z - DOCK.hl, DOCK.z + DOCK.hl) && Math.hypot(x, z - RB.z) > BULB_R + 14,
  });
}

// ---------------------------------------------------------------------------
// dorsal / ventral channels
// ---------------------------------------------------------------------------
function buildChannels(ctx) {
  const { chunks, rand } = ctx;
  channel(chunks, rand, { ...MOAT, yAt: yT, up: true, floorKey: "exta_machinery", floorTint: mixC(PALETTE.hullDark, PALETTE.hullMid, 0.55), ribStep: 16, lightStep: 36 });
  channel(chunks, rand, { ...OUTER, yAt: yT, up: true, ribStep: 18, lightStep: 48 });
  channel(chunks, rand, { ...VENT, yAt: yB, up: false, floorKey: "exta_machinery", floorTint: mixC(PALETTE.hullDark, PALETTE.hullMid, 0.55), ribStep: 18, lightStep: 44 });
}
/** Recessed dorsal service hatches: cut, raised frame, two bevelled hatch leaves, hinge blocks. */
function buildHatches(ctx) {
  const { chunks, rand } = ctx;
  const { hullDark: D, hullMid: M } = PALETTE;
  const w = 1.6;
  for (const h of HATCHES) {
    const xc = h.xc;
    channel(chunks, rand, { zA: h.z0, zB: h.z1, xc, halfW: h.hw, depth: h.depth, yAt: yT, up: true, ribs: false, pipe: false, lights: false, floorKey: "exta_machinery", floorTint: mixC(D, M, 0.5), wallTint: D });
    const zm = (h.z0 + h.z1) / 2;
    const far = chunks.batch(zm, "far", "hullPlate1");
    const near = chunks.batch(zm, "near", "hullGreeble");
    const yF = (z) => yT(z) - h.depth;
    for (const side of [1, -1]) {
      const X = (z, off) => side * (xc(z) + off);
      const bar = (x0f, x1f, za, zb) => {
        const c = [V(x0f(za), yT(za), za), V(x1f(za), yT(za), za), V(x1f(zb), yT(zb), zb), V(x0f(zb), yT(zb), zb)];
        hexa(far, c, c.map((p) => V(p.x, p.y + 0.5, p.z)), mixC(D, M, 0.4), TEXEL, { skipBottom: true });
      };
      bar((z) => X(z, h.hw + 0.05), (z) => X(z, h.hw + 0.05 + w), h.z0 - w, h.z1 + w);
      bar((z) => X(z, -h.hw - 0.05 - w), (z) => X(z, -h.hw - 0.05), h.z0 - w, h.z1 + w);
      bar((z) => X(z, -h.hw - 0.05), (z) => X(z, h.hw + 0.05), h.z0 - w, h.z0 - 0.05);
      bar((z) => X(z, -h.hw - 0.05), (z) => X(z, h.hw + 0.05), h.z1 + 0.05, h.z1 + w);
      for (const [za, zb] of [
        [h.z0 + 0.8, zm - 0.3],
        [zm + 0.3, h.z1 - 0.8],
      ]) {
        const c = [V(X(za, -h.hw + 0.8), yF(za), za), V(X(za, h.hw - 0.8), yF(za), za), V(X(zb, h.hw - 0.8), yF(zb), zb), V(X(zb, -h.hw + 0.8), yF(zb), zb)];
        near.frustum(c, UP, 0.45, 0.6, mixC(M, D, 0.5), TEXEL);
      }
      for (const zz of [h.z0 + 3, h.z1 - 3]) for (const s of [-1, 1]) near.box(X(zz, s * (h.hw - 0.9)), yF(zz) + 0.5, zz, 1.2, 1.0, 2.4, D, TEXEL * 3, { skip: new Set(["-y"]) });
    }
  }
}

// ---------------------------------------------------------------------------
// edge rails along the dorsal and ventral corners (continuous armour belts, chunked)
// ---------------------------------------------------------------------------
function rail(b, cAt, tA, nA, tB, nB, wA, wB, h, tint, z0, z1, cap0, cap1) {
  const dot = nA.dot(nB);
  const mitre = nA.clone().add(nB).multiplyScalar(h / (1 + dot));
  const A = (z) => cAt(z).addScaledVector(tA, wA);
  const B = (z) => cAt(z).addScaledVector(tB, wB);
  const A2 = (z) => A(z).addScaledVector(nA, h);
  const B2 = (z) => B(z).addScaledVector(nB, h);
  const Cc = (z) => cAt(z).add(mitre);
  b.quad(A2(z0), Cc(z0), Cc(z1), A2(z1), tint, TEXEL, nA);
  b.quad(Cc(z0), B2(z0), B2(z1), Cc(z1), tint, TEXEL, nB);
  b.quad(A(z0), A(z1), A2(z1), A2(z0), tint, TEXEL, tA);
  b.quad(B(z0), B(z1), B2(z1), B2(z0), tint, TEXEL, tB);
  if (cap0) b.fan([A(z0), cAt(z0), B(z0), B2(z0), Cc(z0), A2(z0)], tint, TEXEL, V(0, 0, -1));
  if (cap1) b.fan([A(z1), cAt(z1), B(z1), B2(z1), Cc(z1), A2(z1)], tint, TEXEL, Z);
}
function buildRails(ctx) {
  const { chunks } = ctx;
  const zEdges = [CAP_Z + 2, ...chunks.edges.filter((z) => z > CAP_Z + 2), HULL.zStern];
  const tint = mixC(PALETTE.hullDark, PALETTE.hullMid, 0.35);
  for (let i = 0; i < zEdges.length - 1; i++) {
    const z0 = zEdges[i];
    const z1 = zEdges[i + 1];
    const b = chunks.batch((z0 + z1) / 2, "far", "hullPlate1");
    const first = i === 0;
    const last = i === zEdges.length - 2;
    for (const side of [1, -1]) {
      const S = (v) => V(v.x * side, v.y, v.z);
      rail(b, (z) => V(side * topX(z), yT(z), z), V(-side, 0, 0), UP, S(UPPER_T), S(UPPER_N), 3.0, 3.0, 1.1, tint, z0, z1, first, last);
      rail(b, (z) => V(side * botX(z), yB(z), z), V(-side, 0, 0), DOWN, S(LOWER_T), S(LOWER_N), 2.5, 2.5, 0.9, tint, z0, z1, first, last);
    }
    // running lights on the rails: white every ~64 m, red at the bow end, so the hull outline reads
    // on the shadow side as well
    const em = chunks.batch((z0 + z1) / 2, "far", "exta_emit");
    for (let z = Math.ceil((z0 + 20) / 64) * 64; z < z1 - 6; z += 64) {
      const col = z < -800 ? EMIT.red : EMIT.white;
      for (const side of [1, -1]) {
        em.box(side * (topX(z) - 1.5), yT(z) + 1.1 + 0.35, z, 1.4, 0.7, 1.4, col, 1, { skip: new Set(["-y"]) });
        em.box(side * (botX(z) - 1.2), yB(z) - 0.9 - 0.35, z, 1.4, 0.7, 1.4, col, 1, { skip: new Set(["+y"]) });
      }
    }
  }
}

// ---------------------------------------------------------------------------
// bow: hardened tip cap + armour belts wrapping the whole section outline
// ---------------------------------------------------------------------------
/** Closed section outline at z as [x, y] pairs (starboard top-centre → bottom-centre, then port). */
function outline(z) {
  const s = hullSection(Math.max(z, HULL.zBow + 0.01));
  const pts = s.map((p) => [p.x, p.y]);
  for (let i = s.length - 2; i >= 1; i--) pts.push([-s[i].x, s[i].y]);
  return pts;
}
/** Mitre-offset a closed polygon outward by d. */
function mitreOffset(poly, d) {
  const n = poly.length;
  let area = 0;
  for (let i = 0; i < n; i++) {
    const [x0, y0] = poly[i];
    const [x1, y1] = poly[(i + 1) % n];
    area += x0 * y1 - x1 * y0;
  }
  const sgn = area > 0 ? 1 : -1;
  const normals = [];
  for (let i = 0; i < n; i++) {
    const [x0, y0] = poly[i];
    const [x1, y1] = poly[(i + 1) % n];
    const len = Math.hypot(x1 - x0, y1 - y0) || 1;
    normals.push([(sgn * (y1 - y0)) / len, (-sgn * (x1 - x0)) / len]);
  }
  return poly.map(([x, y], i) => {
    const [ax, ay] = normals[(i - 1 + n) % n];
    const [bx, by] = normals[i];
    const k = d / Math.max(0.25, 1 + ax * bx + ay * by);
    return [x + (ax + bx) * k, y + (ay + by) * k];
  });
}
function outlineBand(batch, z0, z1, d, tint, { cap0 = true, cap1 = true } = {}) {
  const p0 = outline(z0);
  const p1 = outline(z1);
  const q0 = mitreOffset(p0, d);
  const q1 = mitreOffset(p1, d);
  const P = (arr, k, z) => V(arr[k][0], arr[k][1], z);
  const n = p0.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const hint = V((q1[i][0] + q1[j][0] - p1[i][0] - p1[j][0]) / 2, (q1[i][1] + q1[j][1] - p1[i][1] - p1[j][1]) / 2, 0);
    batch.quad(P(q0, i, z0), P(q0, j, z0), P(q1, j, z1), P(q1, i, z1), tint, TEXEL, hint);
    if (cap0) batch.quad(P(p0, i, z0), P(p0, j, z0), P(q0, j, z0), P(q0, i, z0), tint, TEXEL, V(0, 0, -1));
    if (cap1) batch.quad(P(p1, i, z1), P(p1, j, z1), P(q1, j, z1), P(q1, i, z1), tint, TEXEL, Z);
  }
}
function buildBow(ctx) {
  const { chunks, rand } = ctx;
  const D = PALETTE.hullDark;
  const b = chunks.batch(CAP_Z, "far", "hullPlate1");
  const zc0 = HULL.zBow + 0.8;
  // cap shell from just behind the tip to CAP_Z, closed at the tip by a cone to a sharp apex
  outlineBand(b, zc0, CAP_Z, 0.45, mixC(D, PALETTE.hullTrench, 0.3), { cap0: false, cap1: true });
  const q = mitreOffset(outline(zc0), 0.45);
  const apex = V(0, (yT(zc0) + yB(zc0)) / 2, HULL.zBow - 3.5);
  for (let i = 0; i < q.length; i++) {
    const j = (i + 1) % q.length;
    const hint = V((q[i][0] + q[j][0]) / 2, (q[i][1] + q[j][1]) / 2 - apex.y, -0.3);
    b.tri(V(q[i][0], q[i][1], zc0), V(q[j][0], q[j][1], zc0), apex, mixC(D, PALETTE.hullTrench, 0.3), TEXEL, hint);
  }
  // armour belts
  for (const [z, d, len] of BELTS) outlineBand(chunks.batch(z, "far", "hullPlate1"), z - len / 2, z + len / 2, d, jitter(D, rand, 0.06));
  // heavy reinforcement plates on the dorsal and ventral faces behind the cap (near level)
  const nb = chunks.batch(CAP_Z + 20, "near", "hullPlate1");
  for (let z = CAP_Z + 8; z < -860; z += 12) {
    if (BELTS.some(([bz, , len]) => z + 9 > bz - len / 2 - 2 && z < bz + len / 2 + 2)) continue;
    for (const side of [1, -1]) {
      for (const [yAt, nrm, edge] of [
        [yT, UP, topX],
        [yB, DOWN, botX],
      ]) {
        const x0 = side * 1.5;
        const x1 = side * (edge(z) - 4);
        if (Math.abs(x1 - x0) < 4) continue;
        const P = (x, zz) => V(x, yAt(zz), zz);
        nb.frustum([P(x0, z), P(x1, z), P(x1, z + 9), P(x0, z + 9)], nrm, 0.7 + rand() * 0.4, 0.8, jitter(mixC(D, PALETTE.hullMid, 0.4), rand, 0.05), TEXEL);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// stern: closed hull face with soot around the nozzles, aft faces of the terraces
// ---------------------------------------------------------------------------
function buildStern(ctx) {
  const { chunks } = ctx;
  const z = HULL.zStern;
  const s = hullSection(z);
  const { hullDark: D, hullMid: M, hullLight: L } = PALETTE;
  const far = chunks.batch(z - 1, "far", "hullPlate1");
  // stern face in the hull's mid tone with real soot: the wash from each nozzle blackens the plating
  // to ~30 % of its albedo at the lips and fades over ~75 m (secondaries ~32 m)
  const soot = (p) => shade(mixC(M, L, 0.25), 1 - 0.72 * engineSoot(p.x, p.y));
  const H = HOUSING;
  const xUpper = (y) => s[1].x + (s[2].x - s[1].x) * ((s[1].y - y) / (s[1].y - s[2].y));
  const xLower = (y) => s[6].x + (s[5].x - s[6].x) * ((y - s[6].y) / (s[5].y - s[6].y));
  far.grid(V(-xUpper(H.y1), H.y1, z), V(xUpper(H.y1), H.y1, z), V(s[1].x, s[1].y, z), V(-s[1].x, s[1].y, z), 48, 4, soot, TEXEL, Z);
  far.grid(V(-xLower(H.y0), H.y0, z), V(xLower(H.y0), H.y0, z), V(s[6].x, s[6].y, z), V(-s[6].x, s[6].y, z), 48, 4, soot, TEXEL, Z);
  for (const side of [1, -1]) {
    const X = (x) => side * x;
    const pts = [V(X(H.hw), -8, z), V(X(H.hw), H.y1, z), V(X(xUpper(H.y1)), H.y1, z), V(X(s[2].x), s[2].y, z), V(X(s[3].x), s[3].y, z), V(X(s[4].x), s[4].y, z), V(X(s[5].x), s[5].y, z), V(X(xLower(H.y0)), H.y0, z), V(X(H.hw), H.y0, z)];
    far.fan(pts, soot(V(X(H.hw + 50), -8, z)), TEXEL, Z);
    // recessed panels + a vent grille on each wing
    const dark = chunks.batch(z - 1, "far", "exta_machinery");
    dark.box(X(H.hw + 40), 10, z - 0.8, 40, 14, 1.6, mixC(D, PALETTE.hullTrench, 0.5), MACH, { skip: new Set(["-z"]) });
    dark.box(X(H.hw + 40), -30, z - 0.8, 40, 14, 1.6, mixC(D, PALETTE.hullTrench, 0.5), MACH, { skip: new Set(["-z"]) });
  }
  // terraces: stepped aft faces with a window band per tier
  const lights = chunks.batch(z - 1, "far", "cityLights");
  TERRACES.forEach((t, ti) => {
    const lv = tierLevels(t, z);
    for (let k = 0; k < lv.length - 1; k++) {
      const yLo = lv[k];
      const yHi = lv[k + 1];
      const xLo = tierWallX(t, z, yHi, yLo);
      const xHi = tierWallX(t, z, yHi, yHi);
      const tint = shade(k % 2 ? M : mixC(M, L, 0.4), 0.92 + 0.08 * fieldNoise(ti * 50, k * 30, 40, 5));
      far.quad(V(-xLo, yLo, z), V(xLo, yLo, z), V(xHi, yHi, z), V(-xHi, yHi, z), tint, TEXEL, Z);
      const yc = yLo + (yHi - yLo) * 0.5;
      const xw = tierWallX(t, z, yHi, yc) * 0.86;
      lights.addGeometry(new THREE.PlaneGeometry(xw * 2, 2.6), { pos: [0, yc, z + 0.35], uv: "scale", uvScale: [(xw * 2) / 40, 0.34] });
    }
  });
}

// ---------------------------------------------------------------------------
// ventral features: hangar mouth well, docking recess, reactor bulb
// ---------------------------------------------------------------------------
/**
 * Additive floodlight pool on the ventral plate: a fan that follows yB (the plate is sloped in z),
 * bright centre fading to black at the rim, hung just under the tallest slab so no plate cuts it.
 */
function ventralPool(batch, cx, cz, R, color, { dy = 0.95, segs = 20 } = {}) {
  const black = new THREE.Color(0x000000);
  const c0 = batch.vertex(cx, yB(cz) - dy, cz, 0, -1, 0, 0, 0, C(color));
  const rim = [];
  for (let s = 0; s <= segs; s++) {
    const a = (s / segs) * Math.PI * 2;
    const z = cz + R * Math.sin(a);
    rim.push(batch.vertex(cx + R * Math.cos(a), yB(z) - dy, z, 0, -1, 0, 0, 0, black));
  }
  for (let s = 0; s < segs; s++) batch.face(c0, rim[s + 1], rim[s]);
}
/**
 * Additive wash strip along the edge a→b (each [x, z]), spreading in direction (nx, nz): black at the
 * edge, `color` at `peak` m, black again at `end` m — no hard line anywhere. Follows yB.
 */
function ventralWash(batch, [ax, az], [bx, bz], [nx, nz], peak, end, color, dy = 0.95) {
  const black = new THREE.Color(0x000000);
  const c = C(color);
  const row = (d, col) => [batch.vertex(ax + nx * d, yB(az + nz * d) - dy, az + nz * d, 0, -1, 0, 0, 0, col), batch.vertex(bx + nx * d, yB(bz + nz * d) - dy, bz + nz * d, 0, -1, 0, 0, 0, col)];
  const r0 = row(0, black);
  const r1 = row(peak, c);
  const r2 = row(end, black);
  for (const [p, q] of [
    [r0, r1],
    [r1, r2],
  ]) {
    batch.face(p[0], p[1], q[1]);
    batch.face(p[0], q[1], q[0]);
  }
}
/** Raised frame (4 bars) around a rectangular cut in the ventral plate. */
function ventralFrame(chunks, hw, z0, z1, width, proud, tint) {
  const b = chunks.batch((z0 + z1) / 2, "far", "hullPlate1");
  const bar = (x0, x1, za, zb) => {
    const c = [V(x0, yB(za), za), V(x1, yB(za), za), V(x1, yB(zb), zb), V(x0, yB(zb), zb)];
    hexa(b, c, c.map((p) => V(p.x, p.y - proud, p.z)), tint, TEXEL, { skipBottom: true });
  };
  bar(hw + 0.1, hw + 0.1 + width, z0 - width, z1 + width);
  bar(-hw - 0.1 - width, -hw - 0.1, z0 - width, z1 + width);
  bar(-hw - 0.1, hw + 0.1, z0 - width, z0 - 0.1);
  bar(-hw - 0.1, hw + 0.1, z1 + 0.1, z1 + width);
}
function buildHangarMouth(ctx) {
  const { chunks } = ctx;
  const o = MOUTH;
  const yF = HANGAR.floorY;
  const { hullDark: D, hullMid: M } = PALETTE;
  const th = 0.6;
  const zm = (o.z0 + o.z1) / 2;
  const wall = chunks.batch(zm, "far", "exta_machinery");
  const yLo = (z) => yB(z) - 0.9;
  for (const s of [-1, 1]) {
    const x = s * o.x1;
    const b = [V(x, yLo(o.z0), o.z0), V(x + s * th, yLo(o.z0), o.z0), V(x + s * th, yLo(o.z1), o.z1), V(x, yLo(o.z1), o.z1)];
    hexa(wall, b, b.map((p) => V(p.x, yF, p.z)), mixC(D, M, 0.3), MACH, { skipTop: true });
  }
  for (const [z, s] of [
    [o.z0, -1],
    [o.z1, 1],
  ]) {
    const b = [V(o.x0 - th, yLo(z), z), V(o.x1 + th, yLo(z), z), V(o.x1 + th, yLo(z), z + s * th), V(o.x0 - th, yLo(z), z + s * th)];
    hexa(wall, b, b.map((p) => V(p.x, yF, p.z)), mixC(D, M, 0.3), MACH, { skipTop: true });
  }
  ventralFrame(chunks, o.x1 + th, o.z0 - th, o.z1 + th, 3.2, 0.9, mixC(PALETTE.hullDark, PALETTE.hullMid, 0.3));
  // approach lights: white pairs along the sides, red across the fore / aft bars
  const em = chunks.batch(zm, "far", "exta_emit");
  for (let z = o.z0 + 5; z < o.z1; z += 10) for (const s of [-1, 1]) em.box(s * (o.x1 + th + 1.7), yB(z) - 1.25, z, 1.2, 0.6, 1.2, EMIT.white, 1);
  for (const s of [-1, 1]) {
    const z = s > 0 ? o.z1 + th + 1.7 : o.z0 - th - 1.7;
    for (let x = o.x0 + 6; x < o.x1; x += 12) em.box(x, yB(z) - 1.25, z, 1.2, 0.6, 1.2, EMIT.red, 1);
  }
  // the approach lights wash the plating outboard of the frame (white along the sides, red fore / aft)
  const wash = chunks.batch(zm, "mid", "exta_pool");
  const xo = o.x1 + th + 3.3;
  const white = C(0xfff2dc).multiplyScalar(0.05);
  const red = C(0xff5030).multiplyScalar(0.035);
  for (const s of [-1, 1]) ventralWash(wash, [s * xo, o.z0 - 3], [s * xo, o.z1 + 3], [s, 0], 4, 18, white);
  ventralWash(wash, [-xo, o.z0 - th - 3.3], [xo, o.z0 - th - 3.3], [0, -1], 4, 18, red);
  ventralWash(wash, [-xo, o.z1 + th + 3.3], [xo, o.z1 + th + 3.3], [0, 1], 4, 18, red);
}
function buildDockingRecess(ctx) {
  const { chunks } = ctx;
  const d = DOCK;
  const { hullDark: D, hullTrench: T } = PALETTE;
  const z0 = d.z - d.hl;
  const z1 = d.z + d.hl;
  const yC = (z) => yB(z) + d.depth;
  const wall = chunks.batch(d.z, "far", "exta_machinery");
  const ceil = chunks.batch(d.z, "far", "hullGreeble");
  ceil.quad(V(-d.hw, yC(z0), z0), V(d.hw, yC(z0), z0), V(d.hw, yC(z1), z1), V(-d.hw, yC(z1), z1), T, TEXEL * 1.5, DOWN);
  for (const s of [-1, 1]) {
    const x = s * d.hw;
    wall.quad(V(x, yB(z0), z0), V(x, yB(z1), z1), V(x, yC(z1), z1), V(x, yC(z0), z0), D, MACH, V(-s, 0, 0));
  }
  wall.quad(V(-d.hw, yB(z0), z0), V(d.hw, yB(z0), z0), V(d.hw, yC(z0), z0), V(-d.hw, yC(z0), z0), D, MACH, Z);
  wall.quad(V(-d.hw, yB(z1), z1), V(d.hw, yB(z1), z1), V(d.hw, yC(z1), z1), V(-d.hw, yC(z1), z1), D, MACH, V(0, 0, -1));
  // docking port on the ceiling: ring, hatch disc, four clamps, blue beacon
  const mid = chunks.batch(d.z, "mid", "hullGreeble");
  const yP = yC(d.z);
  mid.addGeometry(new THREE.TorusGeometry(9, 1.3, 10, 48), { pos: [0, yP - 1.3, d.z], rot: [Math.PI / 2, 0, 0], color: D, texel: TEXEL * 3 });
  mid.disc(V(0, yP - 0.6, d.z), DOWN, 7.8, 40, T, TEXEL * 3);
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + Math.PI / 4;
    mid.box(Math.cos(a) * 12.5, yP - 1.6, d.z + Math.sin(a) * 12.5, 3, 3, 3, D, TEXEL * 3, { skip: new Set(["+y"]) });
  }
  const em = chunks.batch(d.z, "mid", "exta_emit");
  em.box(0, yP - 0.9, d.z, 2.2, 0.6, 2.2, EMIT.blue, 1);
  for (let z = z0 + 6; z < z1; z += 10) for (const s of [-1, 1]) em.box(s * (d.hw - 0.5), yB(z) + 2.5, z, 0.8, 0.8, 1.4, EMIT.white, 1);
  ventralFrame(chunks, d.hw, z0, z1, 3.0, 0.8, mixC(PALETTE.hullDark, PALETTE.hullMid, 0.3));
}
function buildReactorBulb(ctx) {
  const { chunks } = ctx;
  const r = RB;
  const { hullLight: L, hullMid: M, hullDark: D } = PALETTE;
  const yPlate = yB(r.z);
  const far = chunks.batch(r.z, "far", "hullPlate");
  // only the part below the plate: theta from the cut latitude to the lower pole
  const theta0 = Math.acos((yPlate - r.yCenter) / r.r) - 0.08;
  far.addGeometry(new THREE.SphereGeometry(r.r, 64, 40, 0, Math.PI * 2, theta0, Math.PI - theta0), { pos: [r.x, r.yCenter, r.z], colorFn: (x, y) => shade(L, 0.88 + 0.12 * clamp01((yPlate - y) / r.r)) });
  // collar following the sloped plate
  const collar = chunks.batch(r.z, "far", "hullPlate1");
  const R0 = BULB_R + 2.8;
  const R1 = BULB_R - 0.5;
  const nSeg = 72;
  const pt = (a, R, dy) => V(r.x + R * Math.cos(a), yB(r.z + R * Math.sin(a)) - dy, r.z + R * Math.sin(a));
  for (let i = 0; i < nSeg; i++) {
    const a0 = (i / nSeg) * Math.PI * 2;
    const a1 = ((i + 1) / nSeg) * Math.PI * 2;
    const n0 = V(Math.cos(a0), 0, Math.sin(a0));
    const n1 = V(Math.cos(a1), 0, Math.sin(a1));
    collar.quadV(
      [
        { p: pt(a0, R0, -0.4), n: n0, c: D },
        { p: pt(a1, R0, -0.4), n: n1, c: D },
        { p: pt(a1, R0, 3.6), n: n1, c: D },
        { p: pt(a0, R0, 3.6), n: n0, c: D },
      ],
      TEXEL * 2,
    );
    collar.quad(pt(a0, R0, 3.6), pt(a1, R0, 3.6), pt(a1, R1, 3.6), pt(a0, R1, 3.6), D, TEXEL * 2, DOWN);
  }
  // equatorial ring, meridian ribs, pole cap
  const trim = chunks.batch(r.z, "far", "hullGreeble");
  trim.addGeometry(new THREE.TorusGeometry(Math.sqrt(r.r * r.r - 16) + 0.3, 1.5, 10, 72), { pos: [r.x, r.yCenter - 4, r.z], rot: [Math.PI / 2, 0, 0], color: D, texel: TEXEL * 3 });
  const mid = chunks.batch(r.z, "mid", "hullGreeble");
  for (let i = 0; i < 8; i++) {
    const g = new THREE.TorusGeometry(r.r + 0.4, 0.7, 8, 28, Math.PI / 2 - 0.05);
    g.rotateX(Math.PI);
    g.rotateY((i / 8) * Math.PI * 2 + Math.PI / 8);
    mid.addGeometry(g, { pos: [r.x, r.yCenter, r.z], color: mixC(M, D, 0.5), texel: TEXEL * 3 });
  }
  const yPole = r.yCenter - r.r;
  trim.tube(V(r.x, yPole + 1.5, r.z), V(r.x, yPole - 3.5, r.z), 7, 5.5, 24, D, TEXEL * 3, { cap1: true });
  const em = chunks.batch(r.z, "far", "exta_emit");
  em.box(r.x, yPole - 4.0, r.z, 1.4, 1.0, 1.4, EMIT.red, 1);
  // floodlights on the collar's underside ring the bulb so it reads against the unlit belly
  const pool = chunks.batch(r.z, "mid", "exta_pool");
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + Math.PI / 12;
    const R = (R0 + R1) / 2;
    em.box(r.x + R * Math.cos(a), yB(r.z + R * Math.sin(a)) - 3.6 - 0.3, r.z + R * Math.sin(a), 1.2, 0.6, 1.2, EMIT.white, 1, { skip: new Set(["+y"]) });
    // and the pool each one throws on the plating outboard of the collar
    const Rp = R0 + 7;
    ventralPool(pool, r.x + Rp * Math.cos(a), r.z + Rp * Math.sin(a), 12, C(0xfff2dc).multiplyScalar(0.16));
  }
  // four gusset fins between the plate and the sphere
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    const q = new THREE.Quaternion().setFromAxisAngle(UP, -a);
    const cx = r.x + Math.cos(a) * (BULB_R + 1.5);
    const cz = r.z + Math.sin(a) * (BULB_R + 1.5);
    const yTop = yB(cz) + 0.3;
    trim.box(cx, yTop - 8, cz, 20, 16, 3.6, mixC(D, M, 0.3), TEXEL * 2, { quat: q, skip: new Set(["+y"]) });
  }
}

// ---------------------------------------------------------------------------
// lateral trench city
// ---------------------------------------------------------------------------
function buildTrenchCity(ctx) {
  const { chunks, rand, kit } = ctx;
  const { hullDark: D, hullMid: M, hullTrench: T } = PALETTE;
  const k = (TRENCH.wallU * HULL.halfWidthStern) / HULL.length; // dx/dz of the trench wall
  const phi = Math.atan(k);
  const nrmLen = Math.hypot(1, k);
  const subGeo = () => new THREE.BoxGeometry(1, 1, 1);
  const mat = new THREE.Matrix4();
  const quat = new THREE.Quaternion();
  const pos = new THREE.Vector3();
  const scl = new THREE.Vector3();
  const win = (batch, side, z0, z1, x0, x1, y, h) => {
    // window band on a face parallel to the trench wall, offset 0.3 m outward
    const g = new THREE.PlaneGeometry(Math.hypot(z1 - z0, x1 - x0) - 1.0, h);
    const n = V(side, 0, -k * side).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(Z, n);
    batch.addGeometry(g, { pos: [(x0 + x1) / 2 + n.x * 0.3, y, (z0 + z1) / 2 + n.z * 0.3], quat: q, uv: "scale", uvScale: [(z1 - z0) / 40, 0.34] });
  };
  let z = -540 + rand() * 8;
  let prevEnd = { 1: null, [-1]: null };
  while (z < 594) {
    const len = 10 + rand() * 30;
    const z1 = Math.min(z + len, 597);
    if (z1 - z < 6) break;
    const zm = (z + z1) / 2;
    const depthN = trenchDepth(zm);
    const hN = lipY(zm) - floorY(zm);
    const d = 1.5 + rand() * Math.max(0.5, depthN - 3.2);
    const hang = rand() < 0.28;
    // building heights vary from squat plant (a quarter of the canyon) to full-height towers
    const hr = rand();
    const hFrac = hr < 0.18 ? 0.97 : hr < 0.5 ? 0.25 + rand() * 0.25 : 0.5 + rand() * 0.42;
    const lvl = z1 - z >= 16 ? "far" : "mid";
    const light = rand() < 0.3;
    // the machinery texture is itself dark, so its tint stays in the mid range
    const tint = jitter(light ? mixC(M, D, 0.4) : mixC(M, D, 0.2 + rand() * 0.6), rand, 0.06);
    const key = light ? "hullPlate1" : "exta_machinery";
    for (const side of [1, -1]) {
      const yLo = (zz) => (hang ? lipY(zz) - hFrac * hN : floorY(zz) - 0.3);
      const yHi = (zz) => (hang ? lipY(zz) + 0.3 : floorY(zz) + hFrac * hN);
      const P = (zz, dx, yy) => V(side * (wallX(zz) - 0.3 + dx), yy, zz);
      const b = [P(z, 0, yLo(z)), P(z, d, yLo(z)), P(z1, d, yLo(z1)), P(z1, 0, yLo(z1))];
      const t = [P(z, 0, yHi(z)), P(z, d, yHi(z)), P(z1, d, yHi(z1)), P(z1, 0, yHi(z1))];
      hexa(chunks.batch(zm, lvl, key), b, t, tint, key === "exta_machinery" ? MACH : TEXEL, { skipBottom: !hang, skipTop: hang, skipSides: new Set([3]) });
      // lit bands on the block's outer face: one for squat blocks, two or three storeys on towers
      if (rand() < 0.65 && z1 - z > 9) {
        const bh = yHi(zm) - yLo(zm);
        const rows = bh > 18 ? 3 : bh > 9 ? 2 : 1;
        for (let r = 0; r < rows; r++) {
          if (r > 0 && rand() < 0.3) continue;
          const yw = yLo(zm) + bh * ((r + 0.5) / rows) + (rand() - 0.5) * (bh / rows) * 0.3;
          win(chunks.batch(zm, "mid", "cityLights"), side, z, z1, side * (wallX(z) - 0.3 + d), side * (wallX(z1) - 0.3 + d), yw, 1.6);
        }
      }
      // window rows on the back wall in the gap before this block (two heights on the tall canyon wall)
      const pe = prevEnd[side];
      if (pe !== null && z - pe > 7) {
        const zg0 = pe + 1.2;
        const zg1 = z - 1.2;
        const zgm = (zg0 + zg1) / 2;
        for (const f of hN > 14 ? [0.3, 0.62] : [0.55]) {
          if (rand() < 0.2) continue;
          win(chunks.batch(zgm, "mid", "cityLights"), side, zg0, zg1, side * wallX(zg0), side * wallX(zg1), floorY(zgm) + hN * f, 1.8);
        }
      }
      prevEnd[side] = z1;
      // instanced sub-blocks on the outer face
      const nSub = 1 + Math.floor(rand() * 3);
      for (let i = 0; i < nSub; i++) {
        const zz = z + 2 + rand() * Math.max(0.5, z1 - z - 4);
        const sd = 1.2 + rand() * 2.4;
        const sh = 1.6 + rand() * Math.min(4.5, hFrac * hN * 0.5);
        const sl = 2.5 + rand() * 5;
        const yc = yLo(zz) + 0.4 + sh / 2 + rand() * Math.max(0.1, yHi(zz) - yLo(zz) - sh - 0.8);
        const face = side * (wallX(zz) - 0.3 + d);
        const nx = side / nrmLen;
        const nz = -k / nrmLen;
        pos.set(face + nx * (sd / 2 - 0.15), yc, zz + nz * (sd / 2 - 0.15));
        quat.setFromAxisAngle(UP, side * phi);
        scl.set(sd, sh, sl);
        mat.compose(pos, quat, scl);
        kit.instance("exta_trench_sub", "exta_machinery", subGeo, mat, jitter(mixC(D, M, 0.6), rand, 0.08));
      }
    }
    z = z1 + 2 + rand() * 6;
  }
  // stanchions (floor to ceiling) and a service pipe along the wall, per chunk
  const zEdges = [-520, ...chunks.edges.filter((e) => e > -520), 596];
  for (let i = 0; i < zEdges.length - 1; i++) {
    const z0 = zEdges[i];
    const z1 = zEdges[i + 1];
    const mid = chunks.batch((z0 + z1) / 2, "mid", "hullGreeble");
    for (const side of [1, -1]) {
      const X = (zz, off) => side * (wallX(zz) + off);
      const yP = (zz) => floorY(zz) + (lipY(zz) - floorY(zz)) * 0.78;
      const r = Math.min(1.1, 0.02 * w((z0 + z1) / 2));
      mid.tube(V(X(z0, 1.6 + r), yP(z0), z0), V(X(z1, 1.6 + r), yP(z1), z1), r, r, 10, D, TEXEL * 4);
      for (let zz = z0 + 12 + rand() * 10; zz < z1 - 4; zz += 24 + rand() * 14) {
        const dN = trenchDepth(zz);
        mid.box(X(zz, dN * 0.55), (floorY(zz) + lipY(zz)) / 2, zz, 1.4, lipY(zz) - floorY(zz) - 0.2, 1.4, mixC(D, T, 0.5), TEXEL * 4, { skip: new Set(["+y", "-y"]) });
      }
      // amber work lights along the lip underside: the trench is in the lip's shadow most of the
      // time, so this row is what draws the trench line at medium range
      const em = chunks.batch((z0 + z1) / 2, "mid", "exta_emit");
      for (let zz = z0 + 6 + rand() * 6; zz < z1 - 3; zz += 26 + rand() * 10) {
        em.box(X(zz, trenchDepth(zz) * 0.8), lipY(zz) - 0.3, zz, 0.9, 0.5, 0.9, EMIT.amber, 1, { skip: new Set(["+y"]) });
      }
    }
  }
}

// ---------------------------------------------------------------------------
// assembly
// ---------------------------------------------------------------------------
export function buildExterior(scene, materials) {
  ensureExtMaterials(materials);
  const group = new THREE.Group();
  group.name = "exterior";
  scene.add(group);
  const rand = rng(9880);
  const kit = new Kit(materials);
  const hull = new ChunkSet("hull", HULL.zBow, HULL.zStern, 4);
  const tower = new ChunkSet("tower", 200, 400, 1, { near: 1000, mid: 2600 });
  const engines = new ChunkSet("engines", 540, 720, 1, { near: 1600, mid: 4000 });

  const ctx = { chunks: hull, rand, kit };
  buildSkins(ctx);
  buildChannels(ctx);
  buildHatches(ctx);
  buildRails(ctx);
  buildBow(ctx);
  buildStern(ctx);
  buildHangarMouth(ctx);
  buildDockingRecess(ctx);
  buildReactorBulb(ctx);
  buildTrenchCity(ctx);
  buildSuperstructure({ chunks: hull, rand });
  buildTower({ chunks: tower, rand });
  buildEngines({ chunks: engines, rand });

  const meshes = [];
  let triangles = 0;
  for (const cs of [hull, tower, engines]) {
    const r = cs.build(group, materials);
    meshes.push(...r.meshes);
    triangles += r.triangles;
  }
  for (const m of kit.build(group, { castShadow: true, receiveShadow: true })) {
    meshes.push(m);
    const g = m.geometry;
    triangles += ((g.index ? g.index.count : g.attributes.position.count) / 3) * (m.isInstancedMesh ? m.count : 1);
  }
  group.userData.updaters = group.userData.updaters || [];

  return {
    group,
    meshes,
    triangles,
    /** per-frame hook for detail layers (LOD swaps, glow flicker) */
    update(camera, dt, t) {
      materials.exta_glow.opacity = 0.86 + 0.1 * Math.sin(t * 9.1) * Math.sin(t * 2.3) + 0.04 * Math.sin(t * 17.0);
      materials.engineGlow.opacity = 0.82 + 0.1 * Math.sin(t * 6.7 + 1);
      for (const fn of group.userData.updaters || []) fn(camera, dt, t);
    },
  };
}

export { hullHalfWidth };
