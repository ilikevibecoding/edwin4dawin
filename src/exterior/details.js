// Exterior surface detail: greebles concentrated where an ISD has them (trench machinery, city and
// tower base, bow sensor cluster, plateau edges), maintenance hatches with lit rims, recessed service
// ports, soot streaks under machinery, conduit runs, trench docking bays, radiator panels, sensor
// arrays / antenna clusters and navigation lights. Everything is placed on the plate anchors exported
// by hull.js so it sits exactly on the armour, and lives in the hull's z-chunks as InstancedMesh with
// `userData.lod` so the distance LOD keeps working (one draw call per material per chunk).
import * as THREE from "three";
import { rng } from "../kit.js";
import { HULL, halfWidth, dorsalH, ventralH, skinPoint, CHUNKS, chunkIndex, CITY, TOWER } from "./dims.js";
import { instancedMesh, frameItem, boxItem, mergeParts, unitPipeGeometry, grey } from "./batch.js";

const _p = new THREE.Vector3();
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

  const per = Array.from({ length: CHUNKS }, () => ({ boxes: [], lights: [], pipes: [], reds: [] }));
  const city = { boxes: [], lights: [], pipes: [], reds: [] };
  const global = { radiators: [], sensors: [], antennas: [], wedges: [], reds: [] };
  let greebles = 0;

  // --- city tier tops: dense, organised machinery on the tier plating (blocks, towers with window
  // strips, hatches, ports, conduits) — the "city" of the superstructure
  for (const a of sup.anchors) {
    const r = rand();
    if (r < 0.62 && a.w > 4 && a.l > 4) {
      const tower = rand() < 0.18;
      const gw = 2 + rand() * Math.min(6, a.w * 0.6);
      const gd = 2 + rand() * Math.min(7, a.l * 0.6);
      const gh = tower ? 6 + rand() * 12 : 1 + rand() * 3.2;
      const ox = (rand() - 0.5) * Math.max(0, a.w - gw - 1);
      const oz = (rand() - 0.5) * Math.max(0, a.l - gd - 1);
      const k = rand() < 0.15 ? 0.3 + rand() * 0.1 : 0.58 + rand() * 0.3;
      city.boxes.push(onPlate(a, ox, gh / 2 - 0.15, oz, gw, gh, gd, grey(k, 1.02)));
      greebles++;
      if (tower) {
        for (let y = 2.5; y < gh - 1.5; y += 3.2) {
          if (rand() < 0.3) continue;
          city.lights.push(onPlate(a, ox, y, oz + gd / 2 + 0.06, gw * 0.6, 0.35, 0.16, null));
          if (rand() < 0.5) city.lights.push(onPlate(a, ox + gw / 2 + 0.06, y, oz, 0.16, 0.35, gd * 0.6, null));
        }
        if (rand() < 0.5) city.boxes.push(onPlate(a, ox, gh + 2.5, oz, 0.4, 5, 0.4, grey(0.4)));
      } else if (rand() < 0.45) {
        city.boxes.push(onPlate(a, ox + (rand() - 0.5) * gw * 0.5, gh + 0.4, oz + (rand() - 0.5) * gd * 0.5, gw * 0.4, 0.9, gd * 0.4, grey(k * 0.8)));
        greebles++;
      }
    } else if (r < 0.7 && a.w > 6 && a.l > 6) {
      const hw = 3.2 + rand() * 1.2;
      const hl = 2.4 + rand() * 0.8;
      const ox = (rand() - 0.5) * (a.w - hw - 1.5);
      const oz = (rand() - 0.5) * (a.l - hl - 1.5);
      city.boxes.push(onPlate(a, ox, 0.14, oz, hw, 0.45, hl, grey(a.tone * (rand() < 0.5 ? 0.9 : 1.05))));
      city.lights.push(onPlate(a, ox, 0.02, oz, hw + 0.7, 0.12, hl + 0.7, null));
      greebles += 2;
    } else if (r < 0.77 && a.w > 5 && a.l > 5) {
      city.boxes.push(onPlate(a, (rand() - 0.5) * (a.w - 3.5), 0.08, (rand() - 0.5) * (a.l - 3.5), 1.6 + rand(), 0.2, 1.6 + rand(), grey(0.16, 1.1)));
      greebles++;
    } else if (r < 0.83 && a.w > 6 && a.l > 9) {
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

  // --- pass over plate anchors: hatches, ports, greebles + streaks, conduits, crease detail
  for (let ci = 0; ci < CHUNKS; ci++) {
    for (const a of hull.anchors[ci]) {
      const out = per[ci];
      const x = a.p.x;
      const z = a.p.z;
      const tone = a.tone;
      // density weights
      let dens = 0.05;
      const edgeDist = a.isPlateau ? Math.min(a.u, 1 - a.u) : a.u;
      if (edgeDist < 0.07) dens += 0.3;
      if (!a.isPlateau && a.u > 0.85) dens += 0.15; // trench lip machinery
      if (a.side > 0 && a.isPlateau && z > CITY.z0 - 60 && z < CITY.z1 + 40 && Math.abs(x) < cityHW(Math.min(Math.max(z, CITY.z0), CITY.z1)) + 55) dens += 0.45;
      if (z < -620) dens += 0.25;
      if (z > 640) dens += 0.2;
      if (a.side < 0) dens *= 0.55;
      if (a.raised) dens *= 0.4;
      if (a.w < 6 || a.l < 6) dens *= 0.3;

      // maintenance hatch (~4 m) with a thin lit rim
      if (a.w >= 8 && a.l >= 8 && rand() < (a.isPlateau ? 0.07 : 0.045)) {
        const hw = 3.6 + rand() * 1.4;
        const hl = 2.6 + rand() * 1.0;
        const ox = (rand() - 0.5) * (a.w - hw - 2);
        const oz = (rand() - 0.5) * (a.l - hl - 2);
        out.boxes.push(onPlate(a, ox, 0.16, oz, hw, 0.5, hl, grey(tone * (rand() < 0.5 ? 0.9 : 1.05), 1.0)));
        out.lights.push(onPlate(a, ox, 0.02, oz, hw + 0.8, 0.12, hl + 0.8, null));
        greebles += 2;
      }
      // recessed service port (dark, flush)
      if (rand() < 0.035 && a.w > 6 && a.l > 6) {
        const slot = rand() < 0.4;
        const pw = slot ? 1.2 : 2.2 + rand() * 1.2;
        const pl = slot ? 4 + rand() * 4 : 2.2 + rand() * 1.2;
        out.boxes.push(onPlate(a, (rand() - 0.5) * (a.w - pw - 2), 0.08, (rand() - 0.5) * (a.l - pl - 2), pw, 0.2, pl, grey(0.16, 1.1)));
        greebles++;
      }
      // machinery greebles (+ soot streak aft of the larger ones)
      if (rand() < dens) {
        const tower = rand() < 0.12;
        const gw = 1.5 + rand() * Math.min(5, a.w * 0.45);
        const gd = 1.5 + rand() * Math.min(6, a.l * 0.45);
        const gh = tower ? 4 + rand() * 6 : 0.8 + rand() * 2.8;
        const ox = (rand() - 0.5) * Math.max(0, a.w - gw - 1.2);
        const oz = (rand() - 0.5) * Math.max(0, a.l - gd - 1.2);
        const k = rand() < 0.2 ? 0.28 + rand() * 0.1 : 0.5 + rand() * 0.3;
        out.boxes.push(onPlate(a, ox, gh / 2 - 0.15, oz, gw, gh, gd, grey(k, 1.02)));
        greebles++;
        if (rand() < 0.5) {
          // a smaller module on top / beside
          out.boxes.push(onPlate(a, ox + (rand() - 0.5) * gw * 0.6, gh + 0.3, oz + (rand() - 0.5) * gd * 0.6, gw * 0.35, 0.8, gd * 0.35, grey(k * 0.8)));
          greebles++;
        }
        if (rand() < 0.4) {
          const sl = 5 + rand() * 9;
          // streaks trail aft (+z); the anchor's Z axis points +z on both skins
          out.boxes.push(onPlate(a, ox, 0.03, oz + gd / 2 + sl / 2 + 0.2, gw * 0.7, 0.06, sl, grey(tone * 0.72, 0.98)));
          greebles++;
        }
        if (tower && rand() < 0.6) {
          // window strip on the tower module
          out.lights.push(onPlate(a, ox, gh * 0.6, oz + gd / 2 + 0.05, gw * 0.55, 0.35, 0.2, null));
        }
      }
      // conduit run along a plate
      if (a.w > 10 && a.l > 12 && rand() < 0.05) {
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

  // --- plateau crease lip (raised rail along the plateau / bevel edge) per chunk and side
  for (const side of [1, -1]) {
    const sp = side > 0 ? HULL.plateauDorsal : HULL.plateauVentral;
    const step = (HULL.sternZ - HULL.bowZ) / CHUNKS;
    for (let ci = 0; ci < CHUNKS; ci++) {
      const z0 = HULL.bowZ + ci * step + (ci === 0 ? 30 : 0);
      const z1 = HULL.bowZ + (ci + 1) * step;
      for (const s of [-1, 1]) {
        const xa = s * sp * halfWidth(z0);
        const xb = s * sp * halfWidth(z1);
        const ya = side * (side > 0 ? dorsalH(z0) : ventralH(z0));
        const yb = side * (side > 0 ? dorsalH(z1) : ventralH(z1));
        const len = Math.hypot(xb - xa, yb - ya, z1 - z0);
        const dir = new THREE.Vector3(xb - xa, yb - ya, z1 - z0).normalize();
        const up = new THREE.Vector3(0, side, 0);
        const across = new THREE.Vector3().crossVectors(up, dir).normalize();
        const c = new THREE.Vector3((xa + xb) / 2, (ya + yb) / 2, (z0 + z1) / 2).addScaledVector(up, 1.9);
        per[ci].boxes.push(frameItem(c, across, up, dir, 1.1, 0.7, len, grey(0.78, 1.02)));
      }
    }
  }

  // --- trench: machinery blocks, pipes, lit slots, struts, docking bays
  const T = HULL.trenchHalf;
  const dockZ = [-190, 110, 430];
  for (const s of [-1, 1]) {
    const yaw = s * Math.atan(TAPER);
    for (let z = HULL.bowZ + 60; z < HULL.sternZ - 8; z += 5 + rand() * 5) {
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
        out.boxes.push(worldItem(s * (xw + d / 2 - 0.6), y + h / 2, z + (rand() - 0.5) * 4, d, h, len, 0, yaw, 0, grey(rand() < 0.25 ? 0.25 + rand() * 0.1 : 0.48 + rand() * 0.3)));
        greebles++;
      }
      if (rand() < 0.5) {
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
      const x = s * (cityHW(z) + 40 + rand() * (hw - cityHW(z) - 70));
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

  // --- buttresses / structural supports along the tier-0 face and around the tower base
  {
    const t0 = CITY.tiers[0];
    for (const s of [-1, 1]) {
      for (let z = t0.zs + 18; z < t0.ze - 14; z += 24 + rand() * 8) {
        const hw = cityHW(z);
        const base = dorsalH(z) + 1.6;
        const h = 7 + rand() * 5;
        const w = 5 + rand() * 3;
        // wedge: vertical face against the tier wall, sloping face outward
        _p.set(s * (hw + 0.2), base, z);
        _q.setFromEuler(_e.set(0, s > 0 ? 0 : Math.PI, 0));
        _s.set(w, h, 3.5 + rand() * 2);
        global.wedges.push({ m: _m.compose(_p, _q, _s).clone(), c: grey(0.7 + rand() * 0.1) });
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
  group.add(instancedMesh(boxGeo, materials.exteriorRed, global.reds, { name: "navLights" }));
  greebles += global.radiators.length + global.sensors.length + global.antennas.length + global.wedges.length;

  return { group, lod0, stats: { greebles } };
}
