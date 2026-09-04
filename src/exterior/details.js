// Exterior surface detail: greebles concentrated where an ISD has them (trench machinery, city and
// tower base, bow sensor cluster, plateau edges), maintenance hatches with lit rims, recessed service
// ports, soot streaks under machinery, conduit runs, trench docking bays, radiator panels, sensor
// arrays / antenna clusters and navigation lights. Everything is placed on the plate anchors exported
// by hull.js so it sits exactly on the armour, and lives in the hull's z-chunks as InstancedMesh with
// `userData.lod` so the distance LOD keeps working (one draw call per material per chunk).
import * as THREE from "three";
import { rng } from "../kit.js";
import { HULL, halfWidth, dorsalH, ventralH, skinPoint, CHUNKS, chunkIndex, CITY, TOWER, HANGAR, REACTOR } from "./dims.js";
import { instancedMesh, frameItem, boxItem, mergeParts, unitPipeGeometry, grey } from "./batch.js";
import { makeSurface } from "./hull.js";

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

/** Box standing on a plateau skin (side +1 dorsal / -1 ventral) at (x, z), `lift` above the plate tops. */
function plateauItem(side, x, z, sx, sy, sz, c, yaw = 0, lift = 1.4) {
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

/** Individual windows (0.8 m wide on a 1.5 m pitch) centred along a run of length `len`; `place(t)` builds
 *  the window at offset t. Runs of separate panes read as lit galleries instead of blooming into bars. */
const WINDOW_W = 0.8;
const WINDOW_PITCH = 1.5;
function windowRun(len, place) {
  const n = Math.max(1, Math.floor((len - WINDOW_W) / WINDOW_PITCH) + 1);
  const t0 = (-(n - 1) * WINDOW_PITCH) / 2;
  for (let i = 0; i < n; i++) place(t0 + i * WINDOW_PITCH);
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

export function sensorArrayGeometry() {
  const parts = [];
  parts.push(new THREE.BoxGeometry(5, 1.6, 5).translate(0, 0.8, 0));
  parts.push(new THREE.CylinderGeometry(0.45, 0.7, 16, 8).translate(0, 9.6, 0));
  parts.push(new THREE.BoxGeometry(2.4, 1.4, 2.4).translate(0, 17.8, 0));
  const dish = new THREE.CylinderGeometry(5.5, 0.8, 1.4, 20, 1, true);
  dish.rotateX(-0.9);
  dish.translate(0, 19.6, -1.6);
  parts.push(dish);
  const boom = new THREE.CylinderGeometry(0.16, 0.16, 5.6, 6);
  boom.rotateX(-0.9);
  boom.translate(0, 20.6, -3.4);
  parts.push(boom);
  for (const s of [-1, 1]) {
    parts.push(new THREE.CylinderGeometry(0.12, 0.3, 9, 6).translate(s * 1.4, 22, 0.6));
    parts.push(new THREE.BoxGeometry(0.4, 0.4, 3.2).translate(s * 1.4, 24.5, 0.6));
    parts.push(new THREE.BoxGeometry(1.2, 3.2, 1.2).translate(s * 2.6, 3.2, -1.2));
  }
  return mergeParts(parts, 0.1);
}

export function antennaClusterGeometry() {
  const parts = [new THREE.BoxGeometry(3, 1, 3).translate(0, 0.5, 0)];
  const n = 5;
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2;
    const h = 8 + (k % 3) * 4;
    parts.push(new THREE.CylinderGeometry(0.1, 0.28, h, 6).translate(Math.cos(a) * 1.0, h / 2 + 1, Math.sin(a) * 1.0));
  }
  parts.push(new THREE.CylinderGeometry(0.14, 0.4, 22, 6).translate(0, 12, 0));
  parts.push(new THREE.BoxGeometry(2.2, 0.3, 0.3).translate(0, 21, 0));
  parts.push(new THREE.BoxGeometry(0.3, 0.3, 2.2).translate(0, 19, 0));
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

  const per = Array.from({ length: CHUNKS }, () => ({ boxes: [], lights: [], windows: [], pipes: [], reds: [] }));
  const city = { boxes: [], lights: [], pipes: [], reds: [] };
  const global = { radiators: [], sensors: [], antennas: [], wedges: [], reds: [], dim: [] };
  let greebles = 0;

  // --- city tier tops: dense, organised machinery on the tier plating (blocks, towers and long halls
  // with window strips, hatches, ports, conduits) — the "city" of the superstructure
  for (const a of sup.anchors) {
    const r = rand();
    if (r < 0.68 && a.w > 4 && a.l > 4) {
      const kind = rand();
      const tower = kind < 0.26;
      const hall = !tower && kind < 0.5 && a.l > 9;
      const gw = hall ? 3 + rand() * Math.min(4, a.w * 0.5) : 2 + rand() * Math.min(6, a.w * 0.6);
      const gd = hall ? Math.min(a.l - 2, 9 + rand() * 10) : 2 + rand() * Math.min(7, a.l * 0.6);
      // towers up to ~38 m so the city roofline breaks above the next tier instead of reading as a slab
      const gh = tower ? (rand() < 0.35 ? 22 + rand() * 16 : 9 + rand() * 12) : hall ? 3 + rand() * 3 : 1.5 + rand() * 3.5;
      const ox = (rand() - 0.5) * Math.max(0, a.w - gw - 1);
      const oz = (rand() - 0.5) * Math.max(0, a.l - gd - 1);
      // mostly mid greys with a third of the blocks dark, so the city does not bleach to white in the sun
      const k = rand() < 0.3 ? 0.3 + rand() * 0.12 : 0.5 + rand() * 0.24;
      city.boxes.push(onPlate(a, ox, gh / 2 - 0.15, oz, gw, gh, gd, grey(k, 1.02)));
      greebles++;
      if (tower || hall) {
        for (let y = 2.2; y < gh - 1.2; y += 3.2) {
          if (rand() < 0.3) continue;
          if (tower) city.lights.push(onPlate(a, ox, y, oz + gd / 2 + 0.06, gw * 0.6, 0.35, 0.16, null));
          if (hall || rand() < 0.5) city.lights.push(onPlate(a, ox + gw / 2 + 0.06, y, oz, 0.16, 0.35, gd * 0.7, null));
        }
        if (tower && rand() < 0.5) city.boxes.push(onPlate(a, ox, gh + 2.5, oz, 0.4, 5, 0.4, grey(0.4)));
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
  const tryCluster = (side, kind) => {
    const r = kind === "complex" ? 14 + rand() * 10 : kind === "gallery" ? 10 + rand() * 6 : 6 + rand() * 9;
    for (let tries = 0; tries < 30; tries++) {
      const z = -700 + rand() * 1430;
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
  for (let i = 0; i < 12; i++) tryCluster(1, "complex");
  for (let i = 0; i < 14; i++) tryCluster(1, "gallery");
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
      const n = 1 + Math.floor(rand() * 2);
      for (let k = 0; k < n; k++) {
        const tw = 4.5 + rand() * 4;
        const td = tw * (0.8 + rand() * 0.6);
        const th = 14 + rand() * 16;
        const tx = c.x + (rand() - 0.5) * c.r;
        const tz = c.z + (rand() - 0.5) * c.r;
        const tone = rand() < 0.5 ? 0.3 + rand() * 0.12 : 0.5 + rand() * 0.15;
        out.boxes.push(plateauItem(side, tx, tz, tw, th, td, grey(tone, 1.02)));
        out.boxes.push(plateauItem(side, tx, tz, tw * 0.6, 2.2, td * 0.6, grey(tone * 0.8), 0, 1.4 + th));
        out.boxes.push(plateauItem(side, tx, tz, 0.5, 6, 0.5, grey(0.4), 0, 1.4 + th + 2.2));
        for (let y = 3; y < th - 2; y += 3.4) {
          if (rand() < 0.3) continue;
          windowRun(tw * 0.55, (t) => out.windows.push(plateauItem(side, tx + t, tz + td / 2 + 0.1, WINDOW_W, 1.0, 0.2, null, 0, y)));
        }
        // soot fan trailing aft of the tower base
        out.boxes.push(plateauItem(side, tx, tz + td / 2 + 7, tw * 1.1, 0.06, 12 + rand() * 8, grey(0.42, 0.98), 0, 0.02));
        greebles += 4;
      }
      // a pair of big low housings and a pipe manifold across the complex
      for (let k = 0; k < 2; k++) {
        const bw = 6 + rand() * 6;
        out.boxes.push(plateauItem(side, c.x + (rand() - 0.5) * c.r * 1.2, c.z + (rand() - 0.5) * c.r * 1.2, bw, 3 + rand() * 3, 5 + rand() * 6, grey(0.36 + rand() * 0.2, 1.02), c.yaw));
        greebles++;
      }
      const pl = c.r * 1.6;
      const sk = skinPoint(c.x, c.z, side);
      out.pipes.push(worldItem(sk.x, sk.y + side * 2.0, sk.z, 0.55, 0.55, pl, 0, c.yaw + Math.PI / 2, 0, grey(0.45)));
      greebles++;
    } else if (c.kind === "gallery") {
      const gl = 18 + rand() * 22;
      const gw = 5 + rand() * 3;
      const gh = 3.5 + rand() * 2;
      const tone = 0.4 + rand() * 0.2;
      out.boxes.push(plateauItem(side, c.x, c.z, gw, gh, gl, grey(tone, 1.02), c.yaw));
      out.boxes.push(plateauItem(side, c.x, c.z, gw * 0.35, 0.8, gl - 3, grey(tone * 0.8), c.yaw, 1.4 + gh));
      for (const sx of [-1, 1]) {
        let z0 = -gl / 2 + 2;
        while (z0 < gl / 2 - 3) {
          const run = Math.min(gl / 2 - 1 - z0, 3 + rand() * 6);
          const mid = z0 + run / 2;
          windowRun(run, (t) => {
            const cx = c.x + Math.cos(c.yaw) * sx * (gw / 2 + 0.08) + Math.sin(c.yaw) * (mid + t);
            const cz = c.z - Math.sin(c.yaw) * sx * (gw / 2 + 0.08) + Math.cos(c.yaw) * (mid + t);
            out.windows.push(plateauItem(side, cx, cz, 0.16, 0.9, WINDOW_W, null, c.yaw, 1.4 + gh * 0.5));
          });
          z0 += run + 1.5 + rand() * 4;
        }
      }
      // end blocks and a couple of vents on the roof
      for (const e of [-1, 1]) out.boxes.push(plateauItem(side, c.x + Math.sin(c.yaw) * e * (gl / 2 + 2), c.z + Math.cos(c.yaw) * e * (gl / 2 + 2), gw + 2, gh * 0.7, 3.5, grey(0.3, 1.04), c.yaw));
      for (let k = 0; k < 3; k++) out.boxes.push(plateauItem(side, c.x + (rand() - 0.5) * gw * 0.5, c.z + (rand() - 0.5) * (gl - 6), 1.6, 1.2, 1.6, grey(0.2, 1.1), 0, 1.4 + gh));
      out.boxes.push(plateauItem(side, c.x, c.z + gl / 2 + 8, gw * 0.9, 0.06, 14, grey(0.42, 0.98), 0, 0.02));
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

      // maintenance hatch (~4 m) with a thin lit rim
      if (a.w >= 8 && a.l >= 8 && rand() < (a.isPlateau ? 0.05 : 0.035)) {
        const hw = 3.6 + rand() * 1.4;
        const hl = 2.6 + rand() * 1.0;
        const ox = (rand() - 0.5) * (a.w - hw - 2);
        const oz = (rand() - 0.5) * (a.l - hl - 2);
        out.boxes.push(onPlate(a, ox, 0.16, oz, hw, 0.5, hl, grey(tone * (rand() < 0.5 ? 0.9 : 1.05), 1.0)));
        global.dim.push(onPlate(a, ox, 0.02, oz, hw + 0.8, 0.12, hl + 0.8, null));
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
      // machinery greebles: bigger, darker and taller than before so they read at medium range,
      // up to two per plate inside a cluster, soot streak aft of the larger ones
      const nG = dens > 0.6 ? 1 + (rand() < dens - 0.5 ? 1 : 0) : rand() < dens ? 1 : 0;
      for (let g = 0; g < nG; g++) {
        const tower = rand() < (dens > 0.5 ? 0.16 : 0.08);
        const gw = 2 + rand() * Math.min(6, a.w * 0.5);
        const gd = 2 + rand() * Math.min(7, a.l * 0.5);
        const gh = tower ? 7 + rand() * 12 : 1.4 + rand() * 4.2;
        const ox = (rand() - 0.5) * Math.max(0, a.w - gw - 1.2);
        const oz = (rand() - 0.5) * Math.max(0, a.l - gd - 1.2);
        const k = rand() < 0.3 ? 0.26 + rand() * 0.1 : 0.42 + rand() * 0.26;
        out.boxes.push(onPlate(a, ox, gh / 2 - 0.15, oz, gw, gh, gd, grey(k, 1.02)));
        greebles++;
        if (rand() < 0.5) {
          // a smaller module on top / beside
          out.boxes.push(onPlate(a, ox + (rand() - 0.5) * gw * 0.6, gh + 0.3, oz + (rand() - 0.5) * gd * 0.6, gw * 0.35, 0.8, gd * 0.35, grey(k * 0.8)));
          greebles++;
        }
        if ((gh > 3 || tower) && rand() < 0.55) {
          const sl = 6 + rand() * 12;
          // streaks trail aft (+z); the anchor's Z axis points +z on both skins
          out.boxes.push(onPlate(a, ox, 0.03, oz + gd / 2 + sl / 2 + 0.2, gw * 0.8, 0.06, sl, grey(tone * 0.6, 0.98)));
          greebles++;
        }
        if (tower && rand() < 0.7) {
          // window strips on the tower module
          for (let y = 2.5; y < gh - 1.5; y += 3.2) out.lights.push(onPlate(a, ox, y, oz + gd / 2 + 0.05, gw * 0.55, 0.35, 0.2, null));
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
          per[ci].boxes.push(frameItem(c, across, up, dir, 1.0, 0.6, len, grey(0.44 + rand() * 0.1, 1.02)));
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
        const c = surf.at(u, z, new THREE.Vector3()).addScaledVector(Y, 1.5);
        const f = { p: c, X, Y, Z };
        const out = per[chunkIndex(z)];
        const W = 18 + rand() * 14;
        const L = 8 + rand() * 6;
        const frame = grey(0.6, 1.02);
        out.boxes.push(onPlate(f, 0, 1.2, 0, W, 0.6, L, grey(0.13, 1.08)));
        for (const t of [-1, 1]) {
          out.boxes.push(onPlate(f, 0, 1.2, t * (L / 2 + 0.6), W + 2.4, 1.2, 1.2, frame));
          out.boxes.push(onPlate(f, t * (W / 2 + 0.6), 1.2, 0, 1.2, 1.2, L, frame));
        }
        const nl = Math.floor(L / 2);
        for (let k = 0; k < nl; k++) out.boxes.push(onPlate(f, 0, 1.55, -L / 2 + (k + 0.5) * (L / nl), W - 1.5, 0.3, 0.5, grey(0.5, 1.02)));
        out.lights.push(onPlate(f, W / 2 + 1.9, 1.0, 0, 0.5, 0.3, L * 0.8, null));
        greebles += 6 + nl;
      }
    }
  }

  // --- trench: machinery blocks, long galleries with window strips, pipes, lit slots, struts, docking bays
  const T = HULL.trenchHalf;
  const dockZ = [-190, 110, 430];
  for (const s of [-1, 1]) {
    const yaw = s * Math.atan(TAPER);
    // galleries: 20–40 m long blocks along the wall, mid grey, with clustered runs of lit windows
    for (let z = HULL.bowZ + 90; z < HULL.sternZ - 50; z += 70 + rand() * 90) {
      const gl = 20 + rand() * 20;
      const zc = z + gl / 2;
      if (dockZ.some((d) => Math.abs(zc - d) < gl / 2 + 18)) continue;
      const xw = halfWidth(zc) - HULL.trenchInset;
      const out = per[chunkIndex(zc)];
      const gh = 3 + rand() * 1.6;
      const gy = -T + 2 + rand() * (2 * T - gh - 4);
      const gd = 1.4 + rand() * 0.8;
      out.boxes.push(worldItem(s * (xw + gd / 2), gy + gh / 2, zc, gd, gh, gl, 0, yaw, 0, grey(0.38 + rand() * 0.14, 1.02)));
      out.boxes.push(worldItem(s * (xw + gd + 0.3), gy + gh + 0.4, zc, 0.6, 0.5, gl - 2, 0, yaw, 0, grey(0.3)));
      let t = -gl / 2 + 1.5;
      while (t < gl / 2 - 2) {
        const run = Math.min(gl / 2 - 1 - t, 2 + rand() * 5);
        const lz = zc + t + run / 2;
        windowRun(run, (u) => {
          const wz = lz + u;
          const wx = halfWidth(wz) - HULL.trenchInset + gd * 1.045 + 0.1;
          out.windows.push(worldItem(s * wx, gy + gh * 0.5, wz, 0.16, 1.0, WINDOW_W, 0, yaw, 0, null));
        });
        t += run + 1 + rand() * 3;
      }
      greebles += 3;
    }
    for (let z = HULL.bowZ + 30; z < HULL.sternZ - 8; z += 5 + rand() * 5) {
      const xw = halfWidth(z) - HULL.trenchInset;
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
          const xw2 = halfWidth(zc) - HULL.trenchInset;
          out.pipes.push(worldItem(s * (xw2 + 1.2 + r), y, zc, r, r, len, 0, yaw, 0, grey(0.45 + rand() * 0.2)));
          greebles++;
        }
      }
    }
    // docking bays: dark recessed door, lit rim, apron ledge, flanking blocks, red markers
    for (const zb of dockZ) {
      const xw = halfWidth(zb) - HULL.trenchInset;
      const ci = chunkIndex(zb);
      const out = per[ci];
      out.boxes.push(worldItem(s * (xw + 0.35), 0.5, zb, 0.7, 9.5, 22, 0, yaw, 0, grey(0.09, 1.1)));
      out.boxes.push(worldItem(s * (xw + 0.5), 0.5, zb, 0.5, 7.5, 5.5, 0, yaw, 0, grey(0.2, 1.05)));
      for (const yy of [-4.6, 5.6]) out.lights.push(worldItem(s * (xw + 0.9), yy, zb, 0.5, 0.35, 23.4, 0, yaw, 0, null));
      for (const zz of [-11.7, 11.7]) out.lights.push(worldItem(s * (xw + 0.9), 0.5, zb + zz, 0.5, 10.2, 0.35, 0, yaw, 0, null));
      out.boxes.push(worldItem(s * (xw + 2.6), -5.6, zb, 5.2, 1.0, 26, 0, yaw, 0, grey(0.45)));
      for (const zz of [-15.5, 15.5]) out.boxes.push(worldItem(s * (xw + 2.0), 0, zb + zz, 4, 2 * T - 1, 3.5, 0, yaw, 0, grey(0.36)));
      for (const zz of [-13.5, 13.5]) out.reds.push(worldItem(s * (xw + 1.3), 6.4, zb + zz, 0.8, 0.6, 0.8, 0, yaw, 0, null));
      greebles += 5;
    }
  }

  // --- bow sensor cluster + antenna clusters + sensor arrays along the plateau shoulders
  const placeSensor = (x, z, side, scale, yaw, list) => {
    const sk = skinPoint(x, z, side);
    _p.set(sk.x, sk.y + side * 1.4, sk.z);
    _q.setFromEuler(_e.set(side > 0 ? 0 : Math.PI, yaw, 0));
    _s.setScalar(scale);
    list.push({ m: _m.compose(_p, _q, _s).clone(), c: grey(0.66, 1.02) });
  };
  placeSensor(0, -728, 1, 1.15, 0, global.sensors);
  placeSensor(-6, -690, 1, 0.7, 0.6, global.antennas);
  placeSensor(7, -672, 1, 0.8, -0.4, global.antennas);
  placeSensor(0, -700, -1, 0.9, 0, global.sensors);
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
      _p.set(sk.x, sk.y + 1.6, sk.z);
      _q.setFromEuler(_e.set(0, rand() < 0.5 ? 0 : Math.PI / 2, 0));
      _s.setScalar(0.9 + rand() * 0.4);
      global.radiators.push({ m: _m.compose(_p, _q, _s).clone(), c: grey(0.5 + rand() * 0.1, 1.04) });
    }
    for (let k = 0; k < 3; k++) {
      const z = 420 + k * 90;
      const hw = halfWidth(z) * HULL.plateauVentral;
      const sk = skinPoint(s * (hw * 0.55), z, -1);
      _p.set(sk.x, sk.y - 1.5, sk.z);
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

  // --- navigation lights: red port / green-ish white starboard, bow and stern markers (static)
  for (const [x, y, z] of [
    [-halfWidth(700) + 2, 10, 700],
    [halfWidth(700) - 2, 10, 700],
    [0, dorsalH(-790) + 1.5, -790],
    [0, -ventralH(-790) - 1.5, -790],
    [0, TOWER.mast.y1 + 4, TOWER.mast.z],
  ]) {
    global.reds.push(boxItem(x, y, z, 1.6, 1.6, 1.6, null));
  }

  // --- build meshes: per chunk (LOD 0) into the hull chunk groups
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const pipeGeo = unitPipeGeometry(8);
  for (let ci = 0; ci < CHUNKS; ci++) {
    const cg = hull.chunkGroups[ci];
    const p = per[ci];
    if (p.boxes.length) cg.add(instancedMesh(boxGeo, materials.hullDark, p.boxes, { name: "detailBoxes", lod: 0 }));
    if (p.lights.length) cg.add(instancedMesh(boxGeo, materials.exteriorLight, p.lights, { name: "detailLights", lod: 0 }));
    if (p.windows.length) cg.add(instancedMesh(boxGeo, materials.ext_window, p.windows, { name: "detailWindows", lod: 0 }));
    if (p.pipes.length) cg.add(instancedMesh(pipeGeo, materials.hullDark, p.pipes, { name: "detailPipes", lod: 0 }));
    if (p.reds.length) cg.add(instancedMesh(boxGeo, materials.exteriorRed, p.reds, { name: "detailReds", lod: 0 }));
  }
  if (city.boxes.length) lod0.add(instancedMesh(boxGeo, materials.hullDark, city.boxes, { name: "cityBoxes", castShadow: true }));
  if (city.lights.length) lod0.add(instancedMesh(boxGeo, materials.exteriorLight, city.lights, { name: "cityLights" }));
  if (city.pipes.length) lod0.add(instancedMesh(pipeGeo, materials.hullDark, city.pipes, { name: "cityPipes" }));
  lod0.add(instancedMesh(radiatorGeometry(), materials.hullDark, global.radiators, { name: "radiators", castShadow: true }));
  lod0.add(instancedMesh(sensorArrayGeometry(), materials.hullDark, global.sensors, { name: "sensorArrays", castShadow: true }));
  lod0.add(instancedMesh(antennaClusterGeometry(), materials.hullDark, global.antennas, { name: "antennaClusters" }));
  lod0.add(instancedMesh(wedgeGeometry(), materials.hull, global.wedges, { name: "buttresses", castShadow: true }));
  if (global.dim.length) lod0.add(instancedMesh(boxGeo, materials.ext_dimLight, global.dim, { name: "hatchLamps" }));
  group.add(instancedMesh(boxGeo, materials.exteriorRed, global.reds, { name: "navLights" }));
  greebles += global.radiators.length + global.sensors.length + global.antennas.length + global.wedges.length;

  return { group, lod0, stats: { greebles } };
}
