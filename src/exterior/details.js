// Exterior surface detail: greebles concentrated where an ISD has them (trench machinery, city and
// tower base, bow sensor cluster, plateau edges), maintenance hatches with lit rims, recessed service
// ports, soot streaks under machinery, conduit runs, trench docking bays, radiator panels, sensor
// arrays / antenna clusters and navigation lights. Everything is placed on the plate anchors exported
// by hull.js so it sits exactly on the armour, and lives in the hull's z-chunks as InstancedMesh with
// `userData.lod` so the distance LOD keeps working (one draw call per material per chunk).
import * as THREE from "three";
import { rng } from "../kit.js";
import { HULL, halfWidth, dorsalH, ventralH, skinPoint, CHUNKS, chunkIndex, CITY, TOWER, HANGAR, REACTOR, PLATE_LIFT } from "./dims.js";
import { instancedMesh, frameItem, boxItem, decalItem, decalGeometry, mergeParts, unitPipeGeometry, grey } from "./batch.js";
import { makeSurface, trenchWallX, plateauStreak } from "./hull.js";

const _p = new THREE.Vector3();
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _m = new THREE.Matrix4();
const _e = new THREE.Euler();
const TAPER = HULL.halfWidthStern / HULL.length; // dx/dz of the hull edge

/** Instance placed in a plate anchor's frame: offsets (ox, oy, oz) from the plate's top centre. */
function onPlate(a, ox, oy, oz, sx, sy, sz, c) {
  _p.copy(a.p).addScaledVector(a.X, ox).addScaledVector(a.Y, oy).addScaledVector(a.Z, oz);
  return frameItem(_p, a.X, a.Y, a.Z, sx, sy, sz, c);
}

/** Instance in world space with an arbitrary Euler rotation. */
function worldItem(x, y, z, sx, sy, sz, rx, ry, rz, c) {
  _p.set(x, y, z);
  _q.setFromEuler(_e.set(rx, ry, rz));
  _s.set(sx, sy, sz);
  return { m: _m.compose(_p, _q, _s).clone(), c };
}

/**
 * Uniformly scaled matrix from an anchor frame (for instanced geometry that is not symmetric: dishes).
 * A left-handed frame gets its Z flipped so the geometry never renders inside out.
 */
function frameMatrix(center, X, Y, Z, sc) {
  const det = X.x * (Y.y * Z.z - Y.z * Z.y) - Y.x * (X.y * Z.z - X.z * Z.y) + Z.x * (X.y * Y.z - X.z * Y.y);
  const f = det < 0 ? -1 : 1;
  return new THREE.Matrix4().makeBasis(X.clone().multiplyScalar(sc), Y.clone().multiplyScalar(sc), Z.clone().multiplyScalar(f * sc)).setPosition(center);
}

/** Box standing on a plateau skin (side +1 dorsal / -1 ventral) at (x, z), `lift` above the skin (the
 *  default sinks it 5 cm into the plate tops). */
const LIFT = PLATE_LIFT - 0.05;
function plateauItem(side, x, z, sx, sy, sz, c, yaw = 0, lift = LIFT) {
  const sk = skinPoint(x, z, side);
  _p.set(sk.x, sk.y + side * (lift + sy / 2), sk.z);
  _q.setFromEuler(_e.set(side > 0 ? 0 : Math.PI, yaw, 0));
  _s.set(sx, sy, sz);
  return { m: _m.compose(_p, _q, _s).clone(), c };
}

const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Decals lie this far above a plate anchor's top (over the ±3 % thickness spread of its neighbours). */
const DECAL_ABOVE_PLATE = 0.15;

/**
 * Private stream for a streak's segment split, seeded by one draw `r` of the detail stream (the one
 * the old single-strip code made), so the greebles laid out after the streak keep their places.
 */
const subRng = (r) => rng(Math.floor(r * 4294967296));

/**
 * Soot streak trailing aft (+Z) from (ox, oz0) in a plate anchor's frame: 1–3 offset segments of the
 * soft streak-mask decal, each with its own width, strength (0.15–0.35 multiply) and mask variant.
 */
function anchorStreak(rand, a, ox, oz0, w, len, list) {
  const parts = len > 9 ? 2 + (rand() < 0.4 ? 1 : 0) : 1 + (rand() < 0.5 ? 1 : 0);
  let z = oz0;
  for (let p = 0; p < parts; p++) {
    const l = (len / parts) * (1.1 + rand() * 0.5);
    _p.copy(a.p)
      .addScaledVector(a.X, ox + (rand() - 0.5) * w * 0.6)
      .addScaledVector(a.Y, DECAL_ABOVE_PLATE)
      .addScaledVector(a.Z, z + l / 2);
    list.push(decalItem(_p, a.X, a.Z, w * (0.7 + rand() * 0.6), l, [0.15 + rand() * 0.2, Math.floor(rand() * 4) / 4, 0]));
    z += l * (0.75 + rand() * 0.2);
  }
}

/**
 * Soot fan behind a landmark on a plateau: three narrow streaks side by side (staggered lengths and
 * strengths) instead of one flat dark slab, so the fan has soft lanes and tapered ends.
 */
function plateauFan(rand, side, x, z0, w, len, list) {
  for (const t of [-0.3, 0.02, 0.3]) {
    const l = len * (0.6 + rand() * 0.55);
    const item = plateauStreak(side, x + t * w + (rand() - 0.5) * w * 0.12, z0 + rand() * 2, w * (0.36 + rand() * 0.14), l, 0.15 + rand() * 0.2, Math.floor(rand() * 4));
    if (item) list.push(item);
  }
}

/**
 * True when every corner of the yaw-rotated sx × sz footprint centred at (x, z) lies on the plateau of
 * `side` with `margin` metres to spare (the wedge narrows toward the bow, so a long housing centred on
 * the plateau can still hang its forward end out past the bevel into space).
 */
function footprintOnPlateau(side, x, z, sx, sz, yaw, margin = 1.5) {
  const sp = side > 0 ? HULL.plateauDorsal : HULL.plateauVentral;
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  for (const [ex, ez] of [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ]) {
    const lx = (ex * sx) / 2;
    const lz = (ez * sz) / 2;
    const wx = x + lx * c + lz * s;
    const wz = z - lx * s + lz * c;
    if (wz < HULL.bowZ + 3 || wz > HULL.sternZ - 3) return false;
    if (Math.abs(wx) > halfWidth(wz) * sp - margin) return false;
  }
  return true;
}

/** Shrink a footprint (length only, or both axes) until it sits on the plateau; null if it would lose > 55 %. */
function fitPlateau(side, x, z, sx, sz, yaw, both = true) {
  let fx = 1;
  let fz = 1;
  for (let i = 0; i < 12; i++) {
    if (footprintOnPlateau(side, x, z, sx * fx, sz * fz, yaw)) return [sx * fx, sz * fz];
    fz *= 0.88;
    if (both) fx *= 0.88;
    if (fz < 0.45) return null;
  }
  return null;
}

/** Lit panes are 0.8 m wide on a 1.5 m pitch inside a cluster. */
const WINDOW_W = 0.8;
const WINDOW_PITCH = 1.5;

/**
 * Windows along a run of length `len` (offsets centred on 0) in clusters of 2–4 panes with dark gaps of
 * 4–10 m between the clusters, so about a fifth of the run is lit — the sparse Imperial pattern, not a
 * continuous strip. `place(t)` builds the pane at offset t.
 */
export function windowCluster(rand, len, place) {
  const half = len / 2;
  let t = -half + rand() * 2.5;
  while (t < half - WINDOW_W) {
    const n = 2 + Math.floor(rand() * 3);
    for (let i = 0; i < n && t < half - WINDOW_W; i++, t += WINDOW_PITCH) place(t + WINDOW_W / 2);
    t += 4 + rand() * 6;
  }
}

/** Instance tint for a lit pane: ~70 % warm white (null), 15 % amber, 15 % cool blue-white. */
export function windowTint(rand) {
  const r = rand();
  return r < 0.15 ? [1, 0.66, 0.34] : r < 0.3 ? [0.62, 0.8, 1.0] : null;
}

// ---------------------------------------------------------------------------
// Detail geometry library (metres; instanced with near-uniform scale)
// ---------------------------------------------------------------------------
export function radiatorGeometry() {
  const parts = [new THREE.BoxGeometry(14, 0.6, 9).translate(0, 0.3, 0)];
  for (let i = 0; i < 11; i++) parts.push(new THREE.BoxGeometry(0.35, 2.6, 8.2).translate(-6 + i * 1.2, 1.9, 0));
  parts.push(new THREE.BoxGeometry(13.6, 0.5, 0.8).translate(0, 3.2, -4.2));
  parts.push(new THREE.BoxGeometry(13.6, 0.5, 0.8).translate(0, 3.2, 4.2));
  return mergeParts(parts, 0.1);
}

/**
 * Sensor array: a low, wide housing with a tilted phased-array slab on a drum, a small tracking dish
 * and two short whips (no mast — the old radar ball on a 16 m spire read as a lattice tower).
 */
export function sensorArrayGeometry() {
  const parts = [];
  parts.push(new THREE.BoxGeometry(7, 1.8, 6).translate(0, 0.9, 0));
  parts.push(new THREE.CylinderGeometry(2.4, 2.8, 2.6, 16).translate(0, 3.1, 0.4));
  const slab = new THREE.BoxGeometry(5.2, 3.6, 0.7);
  slab.rotateX(-0.55);
  slab.translate(0, 5.6, -0.4);
  parts.push(slab);
  parts.push(new THREE.BoxGeometry(5.6, 0.5, 1.6).translate(0, 4.2, 0.9));
  const dish = new THREE.CylinderGeometry(1.7, 0.3, 0.7, 14, 1, true);
  dish.rotateX(-1.0);
  dish.translate(2.6, 3.4, -1.9);
  parts.push(dish);
  parts.push(new THREE.CylinderGeometry(0.2, 0.3, 1.6, 6).translate(2.6, 2.6, -1.6));
  for (const s of [-1, 1]) {
    parts.push(new THREE.CylinderGeometry(0.08, 0.16, 3.6, 6).translate(s * 2.9, 3.6, 2.2));
    parts.push(new THREE.BoxGeometry(1.4, 1.2, 1.4).translate(s * 2.6, 2.4, 1.9));
  }
  return mergeParts(parts, 0.1);
}

/** Antenna cluster: a ring of short whips around a 9 m rod with cross-arms (a comm array, not a mast). */
export function antennaClusterGeometry() {
  const parts = [new THREE.BoxGeometry(3, 1, 3).translate(0, 0.5, 0)];
  const n = 5;
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2;
    const h = 4 + (k % 3) * 1.6;
    parts.push(new THREE.CylinderGeometry(0.08, 0.22, h, 6).translate(Math.cos(a) * 1.0, h / 2 + 1, Math.sin(a) * 1.0));
  }
  parts.push(new THREE.CylinderGeometry(0.12, 0.34, 9, 6).translate(0, 5.5, 0));
  parts.push(new THREE.BoxGeometry(1.8, 0.25, 0.25).translate(0, 9.2, 0));
  parts.push(new THREE.BoxGeometry(0.25, 0.25, 1.8).translate(0, 8.0, 0));
  return mergeParts(parts, 0.1);
}

/** Small tracking dish on a pedestal (~4 m), for the dish clusters inside the greeble groups. */
export function dishGeometry() {
  const parts = [new THREE.BoxGeometry(1.8, 1.0, 1.8).translate(0, 0.5, 0)];
  parts.push(new THREE.CylinderGeometry(0.28, 0.4, 1.8, 8).translate(0, 1.9, 0));
  const dish = new THREE.CylinderGeometry(2.2, 0.35, 0.8, 16, 1, true);
  dish.rotateX(-0.85);
  dish.translate(0, 3.4, -0.9);
  parts.push(dish);
  const boom = new THREE.CylinderGeometry(0.08, 0.08, 2.4, 6);
  boom.rotateX(-0.85);
  boom.translate(0, 3.9, -1.7);
  parts.push(boom);
  parts.push(new THREE.BoxGeometry(0.9, 0.6, 0.9).translate(1.1, 1.3, 0.8));
  return mergeParts(parts, 0.1);
}

/** Right-triangular prism: triangle (0,0)-(1,0)-(0,1) in xy, depth 1 along z, for buttresses. */
export function wedgeGeometry() {
  const shape = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(1, 0), new THREE.Vector2(0, 1)]);
  const g = new THREE.ExtrudeGeometry(shape, { depth: 1, bevelEnabled: false });
  g.translate(0, 0, -0.5);
  return mergeParts([g], 0.1);
}

/** Heavy turbolaser layout on the dorsal plateau (shared with superstructure.js so greebles keep clear). */
export const HEAVY_TURRETS = { zs: [230, 330, 440, 550], offset: 40, scale: 2.0, padR: 25 };
/**
 * Command tower neck: one centred XY-trapezoid prism rising from the tier-0 top (half-width hwB) to the
 * bridge module (hwT) over z0..z1. Shared so nothing else is placed inside it.
 */
export const TOWER_PRISM = { hwB: 108, hwT: 84, z0: 562, z1: 654 };
/** Shoulder terraces where tier 0 meets the plateau: outward extent beyond the tier wall and height. */
export const TERRACES = [
  { out: 13, h: 6 },
  { out: 6.5, h: 12 },
];
export function heavyTurretX(z) {
  const t0 = CITY.tiers[0];
  return t0.hw0 + ((t0.hw1 - t0.hw0) * (z - t0.zs)) / (t0.ze - t0.zs) + HEAVY_TURRETS.offset;
}

// ---------------------------------------------------------------------------
// Placement
// ---------------------------------------------------------------------------
export function buildDetails(materials, hull, sup) {
  const rand = rng(9091);
  const group = new THREE.Group();
  group.name = "details";
  const lod0 = new THREE.Group();
  lod0.name = "details_lod0";
  group.add(lod0);

  // `big` holds the coarse landmarks (cluster blocks, galleries, soot fans, bevel intakes, crease rail)
  // that stay visible past the fine-greeble LOD so the clusters still read as knots at medium range
  const per = Array.from({ length: CHUNKS }, () => ({ boxes: [], big: [], lights: [], windows: [], pipes: [], reds: [], docks: [], dishes: [], streaks: [] }));
  const city = { boxes: [], lights: [], pipes: [], reds: [] };
  const global = { radiators: [], sensors: [], antennas: [], wedges: [], dim: [] };
  let greebles = 0;

  // --- city tier tops: dense, organised machinery on the tier plating (blocks, low wide towers and
  // long halls with window strips, hatches, ports, conduits) — the "city" of the superstructure. The
  // ISD superstructure is low-rise: no block rises above ~1.4 tier heights, footprints are at least
  // 0.6 of the height, and every tower stands in a group (podium + annex), never as a lone post.
  const tallBlocks = [
    { ti: 0, s: -1, z: 262, w: 18, d: 18, h: 30 },
    { ti: 0, s: 1, z: 384, w: 18, d: 18, h: 30 },
    { ti: 1, s: 1, z: 392, w: 18, d: 18, h: 30 },
    { ti: 1, s: -1, z: 476, w: 18, d: 20, h: 32 },
  ];
  const nearTallBlock = (x, z) => tallBlocks.some((b) => Math.abs(z - b.z) < b.d / 2 + 14 && Math.abs(x - b.s * b.x) < b.w / 2 + 3);
  for (const b of tallBlocks) {
    const t = CITY.tiers[b.ti];
    const hw = t.hw0 + ((t.hw1 - t.hw0) * (b.z - t.zs)) / (t.ze - t.zs);
    b.x = hw - (b.ti === 0 ? 12 : 8) - b.w / 2;
    const x = b.s * b.x;
    const y0 = sup.tierTops[b.ti];
    const tone = 0.46 + rand() * 0.12;
    city.boxes.push(boxItem(x, y0 + b.h / 2, b.z, b.w, b.h, b.d, grey(tone, 1.02)));
    city.boxes.push(boxItem(x, y0 + b.h + 1.2, b.z, b.w * 0.7, 2.4, b.d * 0.7, grey(tone * 0.85, 1.02)));
    city.boxes.push(boxItem(x, y0 + b.h + 5.5, b.z, 0.6, 6, 0.6, grey(0.4)));
    // setback plinth at the base, a lower annex block aft of it, vertical ribs on the long faces
    city.boxes.push(boxItem(x, y0 + 3, b.z, b.w + 2.4, 6, b.d + 2.4, grey(tone * 0.9, 1.02)));
    city.boxes.push(boxItem(x, y0 + b.h * 0.22, b.z + b.d / 2 + 5.5, b.w * 0.8, b.h * 0.44, 11, grey(tone * 1.06, 1.02)));
    for (let k = -1; k <= 1; k += 2) city.boxes.push(boxItem(x + (k * (b.w + 0.6)) / 2, y0 + b.h / 2, b.z, 0.6, b.h - 2, 1.4, grey(0.62, 1.02)));
    // storeys of clustered 0.8 m panes on one long face and the outer flank (a fifth of each row lit)
    for (let y = 8; y < b.h - 3; y += 3.4) {
      if (rand() < 0.25) continue;
      const zf = b.z + (b.d / 2 + 0.06) * (rand() < 0.5 ? 1 : -1);
      windowCluster(rand, b.w * 0.8, (t) => city.lights.push(boxItem(x + t, y0 + y, zf, WINDOW_W, 1.0, 0.16, windowTint(rand))));
      windowCluster(rand, b.d * 0.8, (t) => city.lights.push(boxItem(x + (b.w / 2 + 0.06) * b.s, y0 + y, b.z + t, 0.16, 1.0, WINDOW_W, windowTint(rand))));
    }
    greebles += 7;
  }
  for (const a of sup.anchors) {
    if (nearTallBlock(a.p.x, a.p.z)) continue;
    const r = rand();
    if (r < 0.68 && a.w > 4 && a.l > 4) {
      const kind = rand();
      const tower = kind < 0.13;
      const hall = !tower && kind < 0.42 && a.l > 9;
      const gw = tower ? 6 + rand() * Math.min(8, a.w * 0.7) : hall ? 3 + rand() * Math.min(4, a.w * 0.5) : 2 + rand() * Math.min(6, a.w * 0.6);
      const gd = tower ? 6 + rand() * Math.min(8, a.l * 0.7) : hall ? Math.min(a.l - 2, 9 + rand() * 10) : 2 + rand() * Math.min(7, a.l * 0.6);
      // low-rise: towers 9–24 m but never taller than 1/0.6 of their mean footprint
      let gh = tower ? (rand() < 0.25 ? 20 + rand() * 6 : 9 + rand() * 11) : hall ? 3 + rand() * 3 : 1.5 + rand() * 3.5;
      if (tower) gh = Math.min(gh, (gw + gd) / 2 / 0.6);
      const ox = (rand() - 0.5) * Math.max(0, a.w - gw - 1);
      const oz = (rand() - 0.5) * Math.max(0, a.l - gd - 1);
      // mostly mid greys with a third of the blocks dark, so the city does not bleach to white in the sun
      const k = rand() < 0.3 ? 0.3 + rand() * 0.12 : 0.5 + rand() * 0.24;
      city.boxes.push(onPlate(a, ox, gh / 2 - 0.15, oz, gw, gh, gd, grey(k, 1.02)));
      greebles++;
      if (tower || hall) {
        for (let y = 2.2; y < gh - 1.2; y += 3.2) {
          if (rand() < 0.3) continue;
          if (tower) windowCluster(rand, gw * 0.8, (t) => city.lights.push(onPlate(a, ox + t, y, oz + gd / 2 + 0.06, WINDOW_W, 1.0, 0.16, windowTint(rand))));
          if (hall || rand() < 0.5) windowCluster(rand, gd * 0.85, (t) => city.lights.push(onPlate(a, ox + gw / 2 + 0.06, y, oz + t, 0.16, 1.0, WINDOW_W, windowTint(rand))));
        }
        if (tower) {
          // stepped crown (a setback top storey) rather than a needle; a short mast on a few; a
          // one-storey annex against a flank when the plate has room, so the tower is part of a block
          city.boxes.push(onPlate(a, ox, gh + 0.9, oz, gw * 0.65, 1.8, gd * 0.65, grey(k * 0.85, 1.02)));
          if (rand() < 0.3) city.boxes.push(onPlate(a, ox, gh + 3.6, oz, 0.4, 4, 0.4, grey(0.4)));
          const aw = 3 + rand() * 3;
          const sgn = ox > 0 ? -1 : 1;
          if (Math.abs(ox + sgn * (gw / 2 + aw / 2)) + aw / 2 < a.w / 2 - 0.5) {
            city.boxes.push(onPlate(a, ox + sgn * (gw / 2 + aw / 2), gh * 0.2, oz, aw, gh * 0.4, gd * 0.85, grey(k * 1.05, 1.02)));
            greebles++;
          }
          greebles++;
        }
        if (hall) {
          // roof detail: a ridge and a couple of vents
          city.boxes.push(onPlate(a, ox, gh + 0.3, oz, gw * 0.3, 0.7, gd - 1.5, grey(k * 0.85)));
          city.boxes.push(onPlate(a, ox + gw * 0.3, gh + 0.2, oz - gd * 0.3, gw * 0.3, 0.5, 1.6, grey(0.2, 1.1)));
          greebles += 2;
        }
      } else if (rand() < 0.5) {
        city.boxes.push(onPlate(a, ox + (rand() - 0.5) * gw * 0.5, gh + 0.4, oz + (rand() - 0.5) * gd * 0.5, gw * 0.4, 0.9, gd * 0.4, grey(k * 0.8)));
        greebles++;
      }
    } else if (r < 0.75 && a.w > 6 && a.l > 6) {
      const hw = 3.2 + rand() * 1.2;
      const hl = 2.4 + rand() * 0.8;
      const ox = (rand() - 0.5) * (a.w - hw - 1.5);
      const oz = (rand() - 0.5) * (a.l - hl - 1.5);
      city.boxes.push(onPlate(a, ox, 0.14, oz, hw, 0.45, hl, grey(a.tone * (rand() < 0.5 ? 0.9 : 1.05))));
      global.dim.push(onPlate(a, ox, 0.02, oz, hw + 0.7, 0.12, hl + 0.7, null));
      greebles += 2;
    } else if (r < 0.81 && a.w > 5 && a.l > 5) {
      city.boxes.push(onPlate(a, (rand() - 0.5) * (a.w - 3.5), 0.08, (rand() - 0.5) * (a.l - 3.5), 1.6 + rand(), 0.2, 1.6 + rand(), grey(0.16, 1.1)));
      greebles++;
    } else if (r < 0.88 && a.w > 6 && a.l > 9) {
      const rr = 0.25 + rand() * 0.3;
      const ox = (rand() - 0.5) * (a.w - 2.5);
      _p.copy(a.p).addScaledVector(a.X, ox).addScaledVector(a.Y, rr + 0.1);
      city.pipes.push(frameItem(_p, a.X, a.Y, a.Z, rr, rr, a.l - 1.2, grey(0.42 + rand() * 0.18)));
      greebles++;
    }
  }

  // city footprint half-width at z (tier 0)
  const cityHW = (z) => {
    const t0 = CITY.tiers[0];
    if (z < t0.zs || z > t0.ze) return 0;
    return t0.hw0 + ((t0.hw1 - t0.hw0) * (z - t0.zs)) / (t0.ze - t0.zs);
  };

  // --- greeble clusters: machinery groups (8–30 m), a few 20–40 m complexes with towers, and long
  // galleries, on both plateaus; the plateau between them stays sparse so the eye gets scale from
  // the contrast (dense knots of machinery on wide clean armour)
  const clusters = [];
  const turretClear = (x, z) => HEAVY_TURRETS.zs.some((tz) => Math.hypot(Math.abs(x) - heavyTurretX(tz), z - tz) < HEAVY_TURRETS.padR + 12);
  const tryCluster = (side, kind, zRange = [-700, 730]) => {
    const r = kind === "complex" ? 14 + rand() * 10 : kind === "gallery" ? 10 + rand() * 6 : 6 + rand() * 9;
    for (let tries = 0; tries < 30; tries++) {
      const z = zRange[0] + rand() * (zRange[1] - zRange[0]);
      const hw = halfWidth(z) * (side > 0 ? HULL.plateauDorsal : HULL.plateauVentral) - r - 5;
      if (hw < 6) continue;
      let x = (rand() * 2 - 1) * hw;
      if (side > 0) {
        const chw = cityHW(Math.min(Math.max(z, CITY.z0), CITY.z1));
        if (z > CITY.z0 - 30 && z < CITY.z1 + 30 && Math.abs(x) < chw + r + 8) {
          // push it beside the city rather than rejecting: the city surroundings should be busiest
          x = Math.sign(x || 1) * (chw + r + 8 + rand() * 20);
          if (Math.abs(x) > hw) continue;
        }
        if (turretClear(x, z)) continue;
      } else {
        if (Math.abs(x) < HANGAR.module.x + r + 6 && z > HANGAR.module.z0 - r - 6 && z < HANGAR.module.z1 + r + 6) continue;
        if (Math.hypot(x, z - REACTOR.z) < REACTOR.r + r + 6) continue;
      }
      if (clusters.some((c) => c.side === side && Math.hypot(c.x - x, c.z - z) < c.r + r + 12)) continue;
      const c = { side, kind, x, z, r, yaw: (rand() - 0.5) * 0.5 };
      clusters.push(c);
      return c;
    }
    return null;
  };
  // three complexes are forced into the forward half of the dorsal plateau (it was nearly empty next
  // to the busy aft half), the rest land anywhere
  for (let i = 0; i < 3; i++) tryCluster(1, "complex", [-640, -180]);
  for (let i = 0; i < 10; i++) tryCluster(1, "complex");
  for (let i = 0; i < 4; i++) tryCluster(1, "gallery", [-600, -100]);
  for (let i = 0; i < 11; i++) tryCluster(1, "gallery");
  for (let i = 0; i < 46; i++) tryCluster(1, "group");
  for (let i = 0; i < 4; i++) tryCluster(-1, "complex");
  for (let i = 0; i < 6; i++) tryCluster(-1, "gallery");
  for (let i = 0; i < 22; i++) tryCluster(-1, "group");
  const clusterWeight = (side, x, z) => {
    let w = 0;
    for (const c of clusters) {
      if (c.side !== side) continue;
      const d = Math.hypot(c.x - x, c.z - z);
      if (d < c.r + 6) w += 1 - smoothstep(c.r * 0.5, c.r + 6, d);
    }
    return Math.min(1, w);
  };
  // cluster landmarks: towers (complex), long galleries with window strips (gallery), soot behind them
  for (const c of clusters) {
    const out = per[chunkIndex(c.z)];
    const side = c.side;
    if (c.kind === "complex") {
      // one or two wide-footprint machinery towers per complex (height ≤ 1.6 × the footprint, so none
      // reads as a needle), each on a one-storey podium with a lower annex against one flank so it is
      // not a lone post; only squat housings on the ventral side (nothing hangs below the hull)
      const n = 1 + Math.floor(rand() * 2);
      for (let k = 0; k < n; k++) {
        const tw = 9 + rand() * 6;
        const td = tw * (0.8 + rand() * 0.6);
        const th = side > 0 ? Math.min(9 + rand() * 12, Math.min(tw, td) * 1.6) : 4 + rand() * 4;
        const tx = c.x + (rand() - 0.5) * c.r;
        const tz = c.z + (rand() - 0.5) * c.r;
        if (!footprintOnPlateau(side, tx, tz, tw + 3, td + 3, 0)) continue;
        const tone = rand() < 0.5 ? 0.3 + rand() * 0.12 : 0.5 + rand() * 0.15;
        out.big.push(plateauItem(side, tx, tz, tw, th, td, grey(tone, 1.02)));
        out.big.push(plateauItem(side, tx, tz, tw + 3, 2.6, td + 3, grey(tone * 0.9, 1.02)));
        out.big.push(plateauItem(side, tx, tz, tw * 0.6, 2.2, td * 0.6, grey(tone * 0.8), 0, LIFT + th));
        out.big.push(plateauItem(side, tx, tz, 0.5, 6, 0.5, grey(0.4), 0, LIFT + th + 2.2));
        const ax = tx + (rand() < 0.5 ? -1 : 1) * (tw / 2 + 3.5);
        if (footprintOnPlateau(side, ax, tz, 7, td * 0.8, 0)) out.big.push(plateauItem(side, ax, tz, 7, th * 0.45, td * 0.8, grey(tone * 1.05, 1.02)));
        for (let y = 4.5; y < th - 2; y += 3.4) {
          if (rand() < 0.3) continue;
          windowCluster(rand, tw * 0.6, (t) => out.windows.push(plateauItem(side, tx + t, tz + td / 2 + 0.1, WINDOW_W, 1.0, 0.2, windowTint(rand), 0, y)));
        }
        // soot fan trailing aft of the tower base (soft multiply decals, not a flat slab)
        if (footprintOnPlateau(side, tx, tz + td / 2 + 7, tw * 1.1, 20, 0)) {
          const r = rand();
          plateauFan(subRng(r), side, tx, tz + td / 2 + 0.5, tw * 1.1, 12 + r * 8, out.streaks);
        }
        greebles += 5;
      }
      // a pair of big low housings and a pipe manifold across the complex
      for (let k = 0; k < 2; k++) {
        const hx = c.x + (rand() - 0.5) * c.r * 1.2;
        const hz = c.z + (rand() - 0.5) * c.r * 1.2;
        const fitH = fitPlateau(side, hx, hz, 6 + rand() * 6, 5 + rand() * 6, c.yaw);
        if (!fitH) continue;
        out.big.push(plateauItem(side, hx, hz, fitH[0], 3 + rand() * 3, fitH[1], grey(0.36 + rand() * 0.2, 1.02), c.yaw));
        greebles++;
      }
      const fitP = fitPlateau(side, c.x, c.z, 0.55, c.r * 1.6, c.yaw + Math.PI / 2, false);
      if (fitP) {
        const sk = skinPoint(c.x, c.z, side);
        out.pipes.push(worldItem(sk.x, sk.y + side * (LIFT + 0.6), sk.z, 0.55, 0.55, fitP[1], 0, c.yaw + Math.PI / 2, 0, grey(0.45)));
        greebles++;
      }
    } else if (c.kind === "gallery") {
      const gw = 5 + rand() * 3;
      const fitG = fitPlateau(side, c.x, c.z, gw + 2, 18 + rand() * 22 + 8, c.yaw, false);
      if (!fitG) continue;
      const gl = fitG[1] - 8; // the end blocks add 4 m at each end
      if (gl < 10) continue;
      const gh = 3.5 + rand() * 2;
      const tone = 0.4 + rand() * 0.2;
      out.big.push(plateauItem(side, c.x, c.z, gw, gh, gl, grey(tone, 1.02), c.yaw));
      out.big.push(plateauItem(side, c.x, c.z, gw * 0.35, 0.8, gl - 3, grey(tone * 0.8), c.yaw, LIFT + gh));
      for (const sx of [-1, 1]) {
        windowCluster(rand, gl - 4, (t) => {
          const cx = c.x + Math.cos(c.yaw) * sx * (gw / 2 + 0.08) + Math.sin(c.yaw) * t;
          const cz = c.z - Math.sin(c.yaw) * sx * (gw / 2 + 0.08) + Math.cos(c.yaw) * t;
          out.windows.push(plateauItem(side, cx, cz, 0.16, 0.9, WINDOW_W, windowTint(rand), c.yaw, LIFT + gh * 0.5));
        });
      }
      // end blocks and a couple of vents on the roof
      for (const e of [-1, 1]) out.big.push(plateauItem(side, c.x + Math.sin(c.yaw) * e * (gl / 2 + 2), c.z + Math.cos(c.yaw) * e * (gl / 2 + 2), gw + 2, gh * 0.7, 3.5, grey(0.3, 1.04), c.yaw));
      for (let k = 0; k < 3; k++) out.big.push(plateauItem(side, c.x + (rand() - 0.5) * gw * 0.5, c.z + (rand() - 0.5) * (gl - 6), 1.6, 1.2, 1.6, grey(0.2, 1.1), 0, LIFT + gh));
      // (the old slab made no draw here, so the fan's stream is seeded from the gallery's position)
      if (footprintOnPlateau(side, c.x, c.z + gl / 2 + 8, gw, 14, 0)) plateauFan(rng((Math.abs(c.x) * 977 + Math.abs(c.z) * 131 + (side > 0 ? 0 : 50000)) >>> 0), side, c.x, c.z + gl / 2 + 2.5, gw * 0.9, 14, out.streaks);
      greebles += 8;
    }
  }

  // --- pass over plate anchors: hatches, ports, greebles + streaks, conduits
  for (let ci = 0; ci < CHUNKS; ci++) {
    for (const a of hull.anchors[ci]) {
      const out = per[ci];
      const x = a.p.x;
      const z = a.p.z;
      const tone = a.tone;
      // density: sparse plateau, dense inside the clusters, moderate around the city / bow / stern
      const edgeDist = a.isPlateau ? Math.min(a.u, 1 - a.u) : a.u;
      let dens = 0.012;
      if (a.isPlateau) dens += 0.85 * clusterWeight(a.side, x, z);
      if (edgeDist < 0.06) dens += 0.07;
      if (!a.isPlateau && a.u > 0.85) dens += 0.12; // trench lip machinery
      if (a.side > 0 && a.isPlateau && z > CITY.z0 - 40 && z < CITY.z1 + 30 && Math.abs(x) < cityHW(Math.min(Math.max(z, CITY.z0), CITY.z1)) + 40) dens += 0.3;
      if (z < -640) dens += 0.2;
      if (z > 660) dens += 0.15;
      if (a.side < 0) dens *= 0.6;
      if (a.raised) dens *= 0.4;
      if (a.w < 6 || a.l < 6) dens *= 0.3;
      if (a.isPlateau && a.side > 0 && turretClear(x, z)) dens = 0;

      // maintenance hatch (~4 m) with a thin lit rim; on the ventral plateau the hatches sit centred
      // on their plate with a fixed margin so they read as part of the plate grid, not as stickers
      if (a.w >= 8 && a.l >= 8 && rand() < (a.isPlateau ? 0.05 : 0.035)) {
        const ventral = a.side < 0 && a.isPlateau;
        const hw = ventral ? Math.min(a.w - 4, 4.8) : 3.6 + rand() * 1.4;
        const hl = ventral ? Math.min(a.l - 4, 3.6) : 2.6 + rand() * 1.0;
        const ox = ventral ? 0 : (rand() - 0.5) * (a.w - hw - 2);
        const oz = ventral ? 0 : (rand() - 0.5) * (a.l - hl - 2);
        out.boxes.push(onPlate(a, ox, 0.16, oz, hw, 0.5, hl, grey(tone * (rand() < 0.5 ? 0.9 : 1.05), 1.0)));
        // the lit amber rim only where crews work at night: the hangar approach lane (ventral, abeam
        // of the module) and the heavy-turret bases; elsewhere a dark unlit rim (the lit ones scattered
        // over the dorsal plates read as stray landing markers)
        const lane = ventral && Math.abs(x) < HANGAR.module.x + 40 && z > HANGAR.module.z0 - 80 && z < HANGAR.module.z1 + 40;
        const turretBase = a.side > 0 && a.isPlateau && HEAVY_TURRETS.zs.some((tz) => Math.hypot(Math.abs(x) - heavyTurretX(tz), z - tz) < HEAVY_TURRETS.padR + 26);
        if (lane || turretBase) global.dim.push(onPlate(a, ox, 0.02, oz, hw + 0.8, 0.12, hl + 0.8, null));
        else out.boxes.push(onPlate(a, ox, 0.02, oz, hw + 0.8, 0.12, hl + 0.8, grey(0.3, 1.02)));
        greebles += 2;
      }
      // recessed service port (dark, flush)
      if (rand() < 0.03 && a.w > 6 && a.l > 6) {
        const slot = rand() < 0.4;
        const pw = slot ? 1.2 : 2.2 + rand() * 1.2;
        const pl = slot ? 4 + rand() * 4 : 2.2 + rand() * 1.2;
        out.boxes.push(onPlate(a, (rand() - 0.5) * (a.w - pw - 2), 0.08, (rand() - 0.5) * (a.l - pl - 2), pw, 0.2, pl, grey(0.16, 1.1)));
        greebles++;
      }
      // machinery greebles with varied footprints — long low housings (6–20 m), blocks, a few tall
      // 30 m blocks inside the clusters, saddle-mounted pipe runs and small dish clusters — up to two
      // per plate inside a cluster, soot streak aft of the larger ones
      const nG = dens > 0.6 ? 1 + (rand() < dens - 0.5 ? 1 : 0) : rand() < dens ? 1 : 0;
      for (let g = 0; g < nG; g++) {
        const kr = rand();
        const kind = kr < 0.3 && a.l > 9 ? "housing" : kr < 0.36 && dens > 0.5 && a.w > 7 ? "tall" : kr < 0.47 && a.l > 8 ? "pipe" : kr < 0.55 ? "dish" : kr < 0.66 ? "tower" : "block";
        const k = rand() < 0.3 ? 0.26 + rand() * 0.1 : 0.42 + rand() * 0.26;
        if (kind === "pipe") {
          // pipe on two saddles along the plate, with a valve block
          const r = 0.35 + rand() * 0.4;
          const len = Math.min(a.l - 1.5, 6 + rand() * 12);
          const ox = (rand() - 0.5) * (a.w - 2.5);
          _p.copy(a.p).addScaledVector(a.X, ox).addScaledVector(a.Y, r + 0.9);
          out.pipes.push(frameItem(_p, a.X, a.Y, a.Z, r, r, len, grey(0.4 + rand() * 0.2)));
          for (const t of [-0.38, 0.38]) out.boxes.push(onPlate(a, ox, 0.5, t * len, r * 2.8, 1.0, 1.0, grey(0.32)));
          out.boxes.push(onPlate(a, ox, r + 0.9, (rand() - 0.5) * len * 0.4, r * 3.2, r * 3.2, 1.6, grey(0.3, 1.04)));
          greebles += 4;
          continue;
        }
        if (kind === "dish") {
          const ox = (rand() - 0.5) * Math.max(0, a.w - 5);
          const oz = (rand() - 0.5) * Math.max(0, a.l - 5);
          _p.copy(a.p).addScaledVector(a.X, ox).addScaledVector(a.Z, oz);
          const sc = 0.8 + rand() * 0.6;
          const m = frameMatrix(_p, a.X, a.Y, a.Z, sc).multiply(new THREE.Matrix4().makeRotationY(rand() * Math.PI * 2));
          out.dishes.push({ m, c: grey(0.58 + rand() * 0.12, 1.02) });
          greebles++;
          continue;
        }
        const housing = kind === "housing";
        const tall = kind === "tall";
        const tower = kind === "tower";
        // tall blocks keep an aspect of about 2 (wide footprints, dorsal only up to ~26 m); the ventral
        // side gets squat versions so nothing dangles under the hull
        const ventral = a.side < 0;
        const gw = housing ? 2.2 + rand() * 2.4 : tall ? Math.min(a.w - 1.5, 8 + rand() * 5) : 2 + rand() * Math.min(6, a.w * 0.5);
        const gd = housing ? Math.min(a.l - 1.5, 6 + rand() * 14) : tall ? Math.min(a.l - 1.5, 8 + rand() * 5) : 2 + rand() * Math.min(7, a.l * 0.5);
        let gh = housing ? 1.5 + rand() * 1.8 : tall ? (ventral ? 6 + rand() * 4 : 16 + rand() * 8) : tower ? (ventral ? 4 + rand() * 4 : 7 + rand() * 10) : 1.4 + rand() * 4.2;
        if (tall || tower) gh = Math.min(gh, (gw + gd) / 2 / 0.6); // footprint aspect ≥ 0.6: no needles
        const ox = (rand() - 0.5) * Math.max(0, a.w - gw - 1.2);
        const oz = (rand() - 0.5) * Math.max(0, a.l - gd - 1.2);
        (tall || housing ? out.big : out.boxes).push(onPlate(a, ox, gh / 2 - 0.15, oz, gw, gh, gd, grey(k, 1.02)));
        greebles++;
        if (housing) {
          // roof ridge + end caps: reads as a long service housing, not a cube
          out.boxes.push(onPlate(a, ox, gh + 0.3, oz, gw * 0.4, 0.6, gd - 1.2, grey(k * 0.8)));
          for (const e of [-1, 1]) out.boxes.push(onPlate(a, ox, gh * 0.5, oz + (e * (gd + 0.5)) / 2, gw + 0.8, gh * 0.9, 0.6, grey(k * 0.9, 1.02)));
          greebles += 3;
        } else if (rand() < 0.5) {
          // a smaller module on top / beside
          out.boxes.push(onPlate(a, ox + (rand() - 0.5) * gw * 0.6, gh + 0.3, oz + (rand() - 0.5) * gd * 0.6, gw * 0.35, 0.8, gd * 0.35, grey(k * 0.8)));
          greebles++;
        }
        if (tall) {
          out.boxes.push(onPlate(a, ox, gh + 0.8, oz, gw * 0.6, 1.6, gd * 0.6, grey(k * 0.85)));
          for (let y = 3; y < gh - 2; y += 3.4) {
            if (rand() < 0.3) continue;
            windowCluster(rand, gw * 0.8, (t) => out.windows.push(onPlate(a, ox + t, y, oz + gd / 2 + 0.1, WINDOW_W, 1.0, 0.2, windowTint(rand))));
          }
          greebles++;
        }
        if ((gh > 3 || tower) && rand() < 0.55) {
          // soot streak trailing aft (+z; the anchor's Z axis points +z on both skins): soft multiply
          // decal segments over the plates, not a flat dark strip
          const r = rand();
          anchorStreak(subRng(r), a, ox, oz + gd / 2 + 0.2, gw * 0.8, 6 + r * 12, out.streaks);
          greebles++;
        }
        if (tower && rand() < 0.7) {
          // storeys of separate panes on the tower module
          for (let y = 2.5; y < gh - 1.5; y += 3.2) windowCluster(rand, gw * 0.8, (t) => out.windows.push(onPlate(a, ox + t, y, oz + gd / 2 + 0.05, WINDOW_W, 1.0, 0.2, windowTint(rand))));
        }
      }
      // conduit run along a plate (mostly inside the clusters)
      if (a.w > 10 && a.l > 12 && rand() < 0.02 + 0.08 * dens) {
        const r = 0.3 + rand() * 0.35;
        const ox = (rand() - 0.5) * (a.w - 3);
        const len = a.l - 1.5;
        _p.copy(a.p).addScaledVector(a.X, ox).addScaledVector(a.Y, r + 0.1);
        out.pipes.push(frameItem(_p, a.X, a.Y, a.Z, r, r, len, grey(0.42 + rand() * 0.18)));
        for (const t of [-0.35, 0.35]) out.boxes.push(onPlate(a, ox, r * 0.6, t * len, r * 2.6, r * 1.2, 0.8, grey(0.35)));
        greebles += 3;
      }
    }
  }

  // --- plateau crease lip: a broken, mid-grey rail along the plateau / bevel edge (segments with gaps,
  // so it does not draw one continuous white line along the whole ship)
  for (const side of [1, -1]) {
    const sp = side > 0 ? HULL.plateauDorsal : HULL.plateauVentral;
    for (let ci = 0; ci < CHUNKS; ci++) {
      const step = (HULL.sternZ - HULL.bowZ) / CHUNKS;
      let z = HULL.bowZ + ci * step + (ci === 0 ? 40 : 0);
      const zEnd = HULL.bowZ + (ci + 1) * step;
      while (z < zEnd - 6) {
        const seg = Math.min(zEnd - z, 22 + rand() * 40);
        const z0 = z;
        const z1 = z + seg;
        z = z1 + 5 + rand() * 12;
        for (const s of [-1, 1]) {
          const xa = s * sp * halfWidth(z0);
          const xb = s * sp * halfWidth(z1);
          const ya = side * (side > 0 ? dorsalH(z0) : ventralH(z0));
          const yb = side * (side > 0 ? dorsalH(z1) : ventralH(z1));
          const len = Math.hypot(xb - xa, yb - ya, z1 - z0);
          const dir = new THREE.Vector3(xb - xa, yb - ya, z1 - z0).normalize();
          const up = new THREE.Vector3(0, side, 0);
          const across = new THREE.Vector3().crossVectors(up, dir).normalize();
          const c = new THREE.Vector3((xa + xb) / 2, (ya + yb) / 2, (z0 + z1) / 2).addScaledVector(up, 1.8);
          per[ci].big.push(frameItem(c, across, up, dir, 1.0, 0.6, len, grey(0.44 + rand() * 0.1, 1.02)));
        }
      }
    }
  }

  // --- bevel landmarks: large louvred intake / vent housings on the bevels with a lit slot on the
  // trench side (the eye needs a few big repeated features to read the 1,600 m at medium range)
  for (const side of [1, -1]) {
    for (const s of [-1, 1]) {
      const surf = makeSurface(side, s < 0 ? "bevelL" : "bevelR");
      const zs = side > 0 ? [-470, -250, -40, 170, 380, 590] : [-380, -120, 140, 400, 620];
      for (const z0 of zs) {
        const z = z0 + (rand() - 0.5) * 30;
        const u = 0.3 + rand() * 0.3;
        surf.at(u + 0.01, z, _b);
        surf.at(u - 0.01, z, _a);
        const X = _b.clone().sub(_a).normalize();
        surf.at(u, z + 1, _b);
        surf.at(u, z - 1, _a);
        const Z = _b.clone().sub(_a).normalize();
        const Y = new THREE.Vector3().crossVectors(Z, X).normalize();
        if (Y.dot(surf.hint) < 0) Y.negate();
        const c = surf.at(u, z, new THREE.Vector3()).addScaledVector(Y, PLATE_LIFT);
        const f = { p: c, X, Y, Z };
        const out = per[chunkIndex(z)];
        const W = 18 + rand() * 14;
        const L = 8 + rand() * 6;
        const frame = grey(0.6, 1.02);
        out.big.push(onPlate(f, 0, 1.2, 0, W, 0.6, L, grey(0.13, 1.08)));
        for (const t of [-1, 1]) {
          out.big.push(onPlate(f, 0, 1.2, t * (L / 2 + 0.6), W + 2.4, 1.2, 1.2, frame));
          out.big.push(onPlate(f, t * (W / 2 + 0.6), 1.2, 0, 1.2, 1.2, L, frame));
        }
        const nl = Math.floor(L / 2);
        for (let k = 0; k < nl; k++) out.big.push(onPlate(f, 0, 1.55, -L / 2 + (k + 0.5) * (L / nl), W - 1.5, 0.3, 0.5, grey(0.5, 1.02)));
        out.lights.push(onPlate(f, W / 2 + 1.9, 1.0, 0, 0.5, 0.3, L * 0.8, null));
        greebles += 6 + nl;
      }
    }
  }

  // --- trench: machinery blocks, long galleries with window strips, pipes, lit slots, struts, docking bays.
  // Every origin is pinned to the inner wall (trenchWallX) so nothing floats in front of it.
  const T = HULL.trenchHalf;
  const dockZ = [-190, 110, 430];
  for (const s of [-1, 1]) {
    const yaw = s * Math.atan(TAPER);
    // galleries: 20–40 m long blocks along the wall, mid grey, with clustered runs of lit windows
    for (let z = HULL.bowZ + 90; z < HULL.sternZ - 50; z += 70 + rand() * 90) {
      const gl = 20 + rand() * 20;
      const zc = z + gl / 2;
      if (dockZ.some((d) => Math.abs(zc - d) < gl / 2 + 18)) continue;
      const xw = trenchWallX(zc);
      const out = per[chunkIndex(zc)];
      const gh = 3 + rand() * 1.6;
      const gy = -T + 2 + rand() * (2 * T - gh - 4);
      const gd = 1.4 + rand() * 0.8;
      out.big.push(worldItem(s * (xw + gd / 2), gy + gh / 2, zc, gd, gh, gl, 0, yaw, 0, grey(0.38 + rand() * 0.14, 1.02)));
      out.big.push(worldItem(s * (xw + gd + 0.3), gy + gh + 0.4, zc, 0.6, 0.5, gl - 2, 0, yaw, 0, grey(0.3)));
      windowCluster(rand, gl - 3, (u) => {
        const wz = zc + u;
        const wx = trenchWallX(wz) + gd * 1.045 + 0.1;
        out.windows.push(worldItem(s * wx, gy + gh * 0.5, wz, 0.16, 1.0, WINDOW_W, 0, yaw, 0, windowTint(rand)));
      });
      greebles += 3;
    }
    for (let z = HULL.bowZ + 60; z < HULL.sternZ - 8; z += 5 + rand() * 5) {
      const xw = trenchWallX(z);
      const ci = chunkIndex(z);
      const out = per[ci];
      const nearDock = dockZ.some((d) => Math.abs(z - d) < 16);
      if (nearDock) continue;
      const n = rand() < 0.75 ? 1 + Math.floor(rand() * 3) : 0;
      for (let k = 0; k < n; k++) {
        const h = 1.2 + rand() * 4.5;
        const d = 1.2 + rand() * 3.6;
        const y = -T + 0.8 + rand() * (2 * T - h - 1.6);
        const len = 1.5 + rand() * 5;
        out.boxes.push(worldItem(s * (xw + d / 2 - 0.6), y + h / 2, z + (rand() - 0.5) * 4, d, h, len, 0, yaw, 0, grey(rand() < 0.2 ? 0.24 + rand() * 0.08 : 0.34 + rand() * 0.22)));
        greebles++;
      }
      if (rand() < 0.55) {
        out.lights.push(worldItem(s * (xw + 0.25), -T + 1 + rand() * (2 * T - 2), z, 0.4, 0.3, 1.5 + rand() * 3, 0, yaw, 0, null));
      }
      if (rand() < 0.18) {
        // vertical strut spanning the trench height
        out.boxes.push(worldItem(s * (xw + 1.1), 0, z, 2.2, 2 * T - 0.4, 1.6, 0, yaw, 0, grey(0.4)));
        greebles++;
      }
      if (rand() < 0.16) {
        // long pipe run along the wall
        const r = 0.35 + rand() * 0.55;
        const len = 18 + rand() * 50;
        const y = -T + 1.5 + rand() * (2 * T - 3);
        const zc = z + len / 2;
        if (zc + len / 2 < HULL.sternZ - 6 && !dockZ.some((d) => Math.abs(zc - d) < len / 2 + 14)) {
          const xw2 = trenchWallX(zc);
          out.pipes.push(worldItem(s * (xw2 + 1.2 + r), y, zc, r, r, len, 0, yaw, 0, grey(0.45 + rand() * 0.2)));
          greebles++;
        }
      }
    }
    // docking bays: a hangarette standing proud of the wall with an open front — lit deck, dark back
    // wall with a few windows, ceiling with two light strips, flanking pylons, cargo on the deck and a
    // dim rim frame around the opening (0.6× the exterior light), so the bay reads as a lit room with a
    // floor, not a glowing empty frame
    for (const zb of dockZ) {
      const xw = trenchWallX(zb);
      const ci = chunkIndex(zb);
      const out = per[ci];
      const BW = 22; // opening width (along z)
      const BH = 9.5; // opening height
      const BD = 6.5; // how far the bay stands out from the wall
      const yF = -BH / 2 + 0.5; // deck level
      const yC = BH / 2 + 0.5; // ceiling level
      // local frame: u along the wall (z), out = s * x. Boxes are yawed with the wall.
      const place = (dOut, y, dz, sx, sy, sz, c, list = out.boxes) => list.push(worldItem(s * (xw + dOut), y, zb + dz, sx, sy, sz, 0, yaw, 0, c));
      place(0.4, 0.5, 0, 0.8, BH - 0.4, BW - 0.6, grey(0.2, 1.04)); // back wall
      place(BD / 2, yF - 0.35, 0, BD, 0.7, BW + 1.2, grey(0.5, 1.0)); // deck slab
      place(BD / 2, yC + 0.45, 0, BD, 0.9, BW + 1.2, grey(0.34, 1.02)); // ceiling slab
      for (const zz of [-1, 1]) place(BD / 2, 0.5, zz * (BW / 2 + 0.9), BD, BH + 1.6, 1.8, grey(0.42, 1.02)); // side walls
      place(BD / 2, yF + 0.02, 0, BD - 1.2, 0.05, BW - 2, grey(0.62, 0.98)); // pale deck paint
      for (const zz of [-BW / 4, BW / 4]) out.lights.push(worldItem(s * (xw + BD * 0.45), yC - 0.08, zb + zz, 3.2, 0.14, 0.5, 0, yaw, 0, null)); // ceiling strips
      for (const zz of [-7, -2.5, 3, 7.5]) out.windows.push(worldItem(s * (xw + 0.85), 3.4, zb + zz, 0.2, 1.0, WINDOW_W, 0, yaw, 0, null)); // back-wall windows
      out.windows.push(worldItem(s * (xw + 0.85), -1.2, zb - 6, 0.2, 2.2, 3.0, 0, yaw, 0, null)); // control-room glass
      // cargo / fuel drums on the deck
      for (const [dz, w, h] of [
        [-6, 2.2, 1.8],
        [-3.4, 1.6, 2.4],
        [5, 2.6, 1.6],
        [7.6, 1.4, 1.4],
      ])
        place(1.6 + rand() * (BD - 3.6), yF + h / 2, dz, w, h, w, grey(0.3 + rand() * 0.25, 1.02));
      // rim frame at the opening edge (dim emitter) and its dark backing
      for (const yy of [yF - 0.9, yC + 1.0]) out.docks.push(worldItem(s * (xw + BD + 0.15), yy, zb, 0.3, 0.3, BW + 1.6, 0, yaw, 0, null));
      for (const zz of [-1, 1]) out.docks.push(worldItem(s * (xw + BD + 0.15), 0.5, zb + zz * (BW / 2 + 0.7), 0.3, BH + 1.6, 0.3, 0, yaw, 0, null));
      // flanking pylons spanning the trench height + apron ledge under the deck
      for (const zz of [-1, 1]) place(2.0, 0, zz * (BW / 2 + 3.2), 4, 2 * T - 0.4, 3.4, grey(0.36));
      place(BD / 2 + 1.0, yF - 1.5, 0, BD + 2, 1.4, BW + 6, grey(0.44));
      for (const zz of [-1, 1]) out.reds.push(worldItem(s * (xw + BD - 0.4), yC + 1.9, zb + zz * (BW / 2 - 1), 0.6, 0.5, 0.6, 0, yaw, 0, null));
      greebles += 14;
    }
  }

  // --- bow sensor cluster + antenna clusters + sensor arrays along the plateau shoulders
  const placeSensor = (x, z, side, scale, yaw, list) => {
    const sk = skinPoint(x, z, side);
    _p.set(sk.x, sk.y + side * LIFT, sk.z);
    _q.setFromEuler(_e.set(side > 0 ? 0 : Math.PI, yaw, 0));
    _s.setScalar(scale);
    list.push({ m: _m.compose(_p, _q, _s).clone(), c: grey(0.66, 1.02) });
  };
  // bow: one low sensor housing well back from the tip (no masts / yardarms at the point, nothing
  // hanging under the bow)
  placeSensor(0, -700, 1, 1.0, 0, global.sensors);
  for (const s of [-1, 1]) {
    for (const z of [-420, -150, 60, 330, 560]) {
      const hw = halfWidth(z) * HULL.plateauDorsal;
      placeSensor(s * (hw - 14), z, 1, 0.75 + rand() * 0.35, s * (0.8 + rand() * 0.6), global.sensors);
    }
    for (const z of [-560, -300, -30, 210, 470, 690]) {
      const hw = halfWidth(z) * HULL.plateauDorsal;
      placeSensor(s * (hw - 26 - rand() * 20), z, 1, 0.7 + rand() * 0.4, rand() * 6, global.antennas);
    }
    for (const z of [-250, 120, 520]) {
      const hw = halfWidth(z) * HULL.plateauVentral;
      placeSensor(s * (hw - 20), z, -1, 0.8, rand() * 6, global.antennas);
    }
  }
  // sensor arrays / antenna clusters on the city tier tops (outboard of the next tier)
  for (const s of [-1, 1]) {
    for (const [ti, z, ant] of [
      [0, 200, 0],
      [0, 420, 1],
      [0, 640, 0],
      [1, 300, 1],
      [1, 520, 0],
      [2, 380, 1],
      [2, 470, 0],
    ]) {
      const t = CITY.tiers[ti];
      const hw = t.hw0 + ((t.hw1 - t.hw0) * (z - t.zs)) / (t.ze - t.zs);
      _p.set(s * (hw - 8), sup.tierTops[ti] + 1.0, z);
      _q.setFromEuler(_e.set(0, s * 1.2 + rand() * 0.6, 0));
      _s.setScalar(0.6 + rand() * 0.2);
      (ant ? global.antennas : global.sensors).push({ m: _m.compose(_p, _q, _s).clone(), c: grey(0.7) });
    }
  }

  // --- radiator panels: aft dorsal plateau (heat exchangers beside the engine block), a few ventral
  for (const s of [-1, 1]) {
    for (let k = 0; k < 5; k++) {
      const z = 520 + k * 44 + rand() * 10;
      const hw = halfWidth(z) * HULL.plateauDorsal;
      const x0 = Math.max(cityHW(z) + 40, heavyTurretX(550) + HEAVY_TURRETS.padR + 14);
      const x = s * (x0 + rand() * Math.max(4, hw - x0 - 30));
      const sk = skinPoint(x, z, 1);
      _p.set(sk.x, sk.y + PLATE_LIFT + 0.1, sk.z);
      _q.setFromEuler(_e.set(0, rand() < 0.5 ? 0 : Math.PI / 2, 0));
      _s.setScalar(0.9 + rand() * 0.4);
      global.radiators.push({ m: _m.compose(_p, _q, _s).clone(), c: grey(0.5 + rand() * 0.1, 1.04) });
    }
    for (let k = 0; k < 3; k++) {
      const z = 420 + k * 90;
      const hw = halfWidth(z) * HULL.plateauVentral;
      const sk = skinPoint(s * (hw * 0.55), z, -1);
      _p.set(sk.x, sk.y - PLATE_LIFT - 0.05, sk.z);
      _q.setFromEuler(_e.set(Math.PI, rand() * 3, 0));
      _s.setScalar(1.0);
      global.radiators.push({ m: _m.compose(_p, _q, _s).clone(), c: grey(0.48, 1.04) });
    }
  }

  // --- buttresses / structural supports along the tier-0 face, standing on the upper shoulder terrace
  {
    const t0 = CITY.tiers[0];
    const top = TERRACES[TERRACES.length - 1];
    for (const s of [-1, 1]) {
      for (let z = t0.zs + 18; z < t0.ze - 14; z += 24 + rand() * 8) {
        const hw = cityHW(z);
        const base = dorsalH(z) + top.h + 0.2;
        const h = 7 + rand() * 5;
        const w = Math.min(top.out - 0.8, 4.5 + rand() * 2);
        // wedge: vertical face against the tier wall, sloping face outward
        _p.set(s * (hw + 0.2), base, z);
        _q.setFromEuler(_e.set(0, s > 0 ? 0 : Math.PI, 0));
        _s.set(w, h, 3.5 + rand() * 2);
        global.wedges.push({ m: _m.compose(_p, _q, _s).clone(), c: grey(0.6 + rand() * 0.1) });
      }
    }
  }

  // --- navigation lights: red port / green starboard abeam, warm white bow (dorsal + ventral) and
  // stern-corner markers, red beacon on the mast. Each is a 0.8 m unshaded lamp (ext_navLamp, HDR
  // instance colour) with an additive glow point on it (ext_navGlow), so they read as lights.
  const red = [3.0, 0.3, 0.2];
  const green = [0.4, 3.0, 0.9];
  const white = [3.0, 2.5, 1.9];
  const navs = [
    { p: [-halfWidth(700) + 2, 10, 700], c: red },
    { p: [halfWidth(700) - 2, 10, 700], c: green },
    { p: [-halfWidth(-200) + 2, 9, -200], c: red },
    { p: [halfWidth(-200) - 2, 9, -200], c: green },
    { p: [0, dorsalH(-790) + PLATE_LIFT + 0.4, -790], c: white },
    { p: [0, -ventralH(-790) - PLATE_LIFT - 0.4, -790], c: white },
    { p: [-270, dorsalH(HULL.sternZ - 4) + PLATE_LIFT + 0.8, HULL.sternZ - 4], c: white },
    { p: [270, dorsalH(HULL.sternZ - 4) + PLATE_LIFT + 0.8, HULL.sternZ - 4], c: white },
    { p: [0, TOWER.mast.y1 + 4, TOWER.mast.z], c: red },
  ];
  const navGeo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
  group.add(instancedMesh(navGeo, materials.ext_navLamp, navs.map((n) => boxItem(n.p[0], n.p[1], n.p[2], 1, 1, 1, n.c)), { name: "navLights" }));
  {
    const pg = new THREE.BufferGeometry();
    pg.setAttribute("position", new THREE.Float32BufferAttribute(navs.flatMap((n) => n.p), 3));
    pg.setAttribute("color", new THREE.Float32BufferAttribute(navs.flatMap((n) => n.c.map((v) => Math.min(1, v / 3) * 0.85 + 0.15)), 3));
    const glows = new THREE.Points(pg, materials.ext_navGlow);
    glows.name = "navGlows";
    glows.frustumCulled = false;
    glows.renderOrder = 7;
    group.add(glows);
  }

  // --- build meshes: per chunk (LOD 0) into the hull chunk groups
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const pipeGeo = unitPipeGeometry(8);
  const dishGeo = dishGeometry();
  const streakGeo = decalGeometry();
  for (let ci = 0; ci < CHUNKS; ci++) {
    const cg = hull.chunkGroups[ci];
    const p = per[ci];
    // soot-streak decals (the hull's plateau streaks + the detail streaks and fans) in one multiply
    // mesh per chunk, LOD'd with the plates they lie on
    const streaks = hull.streaks[ci].concat(p.streaks);
    if (streaks.length) cg.add(instancedMesh(streakGeo, materials.ext_streak, streaks, { name: "streakDecals", lod: 1, receiveShadow: false }));
    if (p.boxes.length) cg.add(instancedMesh(boxGeo, materials.hullDark, p.boxes, { name: "detailBoxes", lod: 0 }));
    if (p.big.length) cg.add(instancedMesh(boxGeo, materials.hullDark, p.big, { name: "detailBig", lod: 3, castShadow: true }));
    if (p.lights.length) cg.add(instancedMesh(boxGeo, materials.exteriorLight, p.lights, { name: "detailLights", lod: 0 }));
    if (p.windows.length) cg.add(instancedMesh(boxGeo, materials.ext_window, p.windows, { name: "detailWindows", lod: 0 }));
    if (p.pipes.length) cg.add(instancedMesh(pipeGeo, materials.hullDark, p.pipes, { name: "detailPipes", lod: 0 }));
    if (p.reds.length) cg.add(instancedMesh(boxGeo, materials.exteriorRed, p.reds, { name: "detailReds", lod: 0 }));
    if (p.docks.length) cg.add(instancedMesh(boxGeo, materials.ext_dockLight, p.docks, { name: "detailDocks", lod: 0 }));
    if (p.dishes.length) cg.add(instancedMesh(dishGeo, materials.hullDark, p.dishes, { name: "detailDishes", lod: 0 }));
  }
  if (city.boxes.length) lod0.add(instancedMesh(boxGeo, materials.hullDark, city.boxes, { name: "cityBoxes", castShadow: true }));
  if (city.lights.length) lod0.add(instancedMesh(boxGeo, materials.ext_window, city.lights, { name: "cityLights" }));
  if (city.pipes.length) lod0.add(instancedMesh(pipeGeo, materials.hullDark, city.pipes, { name: "cityPipes" }));
  lod0.add(instancedMesh(radiatorGeometry(), materials.hullDark, global.radiators, { name: "radiators", castShadow: true }));
  lod0.add(instancedMesh(sensorArrayGeometry(), materials.hullDark, global.sensors, { name: "sensorArrays", castShadow: true }));
  lod0.add(instancedMesh(antennaClusterGeometry(), materials.hullDark, global.antennas, { name: "antennaClusters" }));
  lod0.add(instancedMesh(wedgeGeometry(), materials.hull, global.wedges, { name: "buttresses", castShadow: true }));
  if (global.dim.length) lod0.add(instancedMesh(boxGeo, materials.ext_dimLight, global.dim, { name: "hatchLamps" }));
  greebles += global.radiators.length + global.sensors.length + global.antennas.length + global.wedges.length;

  return { group, lod0, stats: { greebles } };
}
