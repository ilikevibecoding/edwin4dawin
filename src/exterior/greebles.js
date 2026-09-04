// Instanced greeble prototype library (local space: origin at the base, +Y up, unit-ish sizes scaled per
// instance) and the scatter routines that dress the armour plates with sub-plates, hatches, pipes, vents,
// domes and antennae. Everything here is instanced; tiers decide the LOD reach.
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { IMP } from "../core/palette.js";
import { prism } from "../core/kit.js";
import { halfWidth } from "../core/layout.js";
import { rayPoint, surfaceMatrix, surfaceNormal, basisMatrix, surfY, blocked } from "./common.js";

const box = (w, h, d, y0 = 0) => new THREE.BoxGeometry(w, h, d).translate(0, y0 + h / 2, 0);

function cylZ(r, len, seg = 10) {
  const g = new THREE.CylinderGeometry(r, r, len, seg, 1, false);
  g.rotateX(Math.PI / 2);
  g.translate(0, r, 0);
  return g;
}
function cylY(r, h, seg = 10, y0 = 0) {
  return new THREE.CylinderGeometry(r, r, h, seg, 1, false).translate(0, y0 + h / 2, 0);
}
function merge(list) {
  return mergeGeometries(list, false);
}

/** name → { mat, texel, geo() } */
export const PROTOS = {
  box: { mat: "hull", texel: 1 / 4, geo: () => box(1, 1, 1) },
  boxDark: { mat: "hullDark", texel: 1 / 4, geo: () => box(1, 1, 1) },
  slab: { mat: "hull", texel: 1 / 3, geo: () => box(1, 1, 1) },
  slabDark: { mat: "hullDark", texel: 1 / 3, geo: () => box(1, 1, 1) },
  pipeZ: { mat: "hullDark", texel: 1 / 3, geo: () => cylZ(0.5, 1, 10) },
  pipeZLight: { mat: "hull", texel: 1 / 3, geo: () => cylZ(0.5, 1, 10) },
  pipeY: { mat: "hullDark", texel: 1 / 3, geo: () => cylY(0.5, 1, 10) },
  hatch: { mat: "hullDark", texel: 1 / 2, geo: () => merge([cylY(1, 0.3, 20), cylY(0.55, 0.2, 12, 0.3), box(0.25, 0.12, 1.4, 0.5)]) },
  dome: { mat: "hull", texel: 1 / 2, geo: () => new THREE.SphereGeometry(1, 14, 7, 0, Math.PI * 2, 0, Math.PI / 2) },
  domeDark: { mat: "hullDark", texel: 1 / 2, geo: () => new THREE.SphereGeometry(1, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2) },
  tank: {
    mat: "hull",
    texel: 1 / 3,
    geo: () => {
      const g = new THREE.CapsuleGeometry(1, 2, 3, 12);
      g.rotateX(Math.PI / 2);
      g.translate(0, 1, 0);
      return merge([g, box(0.6, 0.6, 1.2, 0)]);
    },
  },
  vent: { mat: "hullDark", texel: 1 / 2, geo: () => merge([box(1, 0.45, 1), box(0.86, 0.1, 0.12, 0.45).translate(0, 0, -0.3), box(0.86, 0.1, 0.12, 0.45), box(0.86, 0.1, 0.12, 0.45).translate(0, 0, 0.3)]) },
  radiator: {
    mat: "hullDark",
    texel: 1 / 2,
    geo: () => {
      const parts = [box(1, 0.12, 1)];
      for (let i = 0; i < 6; i++) parts.push(box(0.07, 1, 0.9, 0.12).translate(-0.45 + i * 0.18, 0, 0));
      return merge(parts);
    },
  },
  antenna: { mat: "hullDark", texel: 1, geo: () => merge([cylY(0.06, 1, 6), new THREE.SphereGeometry(0.12, 6, 4).translate(0, 1, 0), box(0.5, 0.04, 0.04, 0.7)]) },
  mastSmall: { mat: "hullDark", texel: 1, geo: () => merge([cylY(0.12, 1, 6), box(0.02, 0.6, 0.02, 1.0), box(0.9, 0.05, 0.05, 0.55), box(0.05, 0.05, 0.9, 0.8)]) },
  bracket: {
    mat: "hullDark",
    texel: 1 / 2,
    geo: () => {
      const g = prism(
        [
          [0, 0],
          [1, 1],
          [0, 1],
        ],
        0.3,
      );
      return g;
    },
  },
  dish: {
    mat: "hull",
    texel: 1 / 2,
    geo: () => {
      const bowl = new THREE.CylinderGeometry(1, 0.25, 0.3, 20, 1, true);
      bowl.translate(0, 0.65, 0);
      return merge([bowl, cylY(0.12, 0.5, 6), cylY(0.05, 1.0, 5, 0.5)]);
    },
  },
  cone: { mat: "hullDark", texel: 1 / 2, geo: () => new THREE.ConeGeometry(1, 1, 12).translate(0, 0.5, 0) },
  ring: {
    mat: "hull",
    texel: 1 / 2,
    geo: () => {
      const t = new THREE.TorusGeometry(1, 0.14, 6, 24);
      t.rotateX(Math.PI / 2);
      t.translate(0, 0.14, 0);
      return t;
    },
  },
  sensorBall: { mat: "hull", texel: 1 / 2, geo: () => merge([cylY(0.3, 0.7, 8), new THREE.SphereGeometry(1, 14, 8).translate(0, 1.6, 0)]) },
  // wall-mounted: local +Z is the wall's outward normal, origin at the wall
  window: { mat: "emitWin", uv: "keep", geo: () => new THREE.BoxGeometry(1.1, 0.55, 0.16).translate(0, 0, 0.08) },
  windowWarm: { mat: "emitWinWarm", uv: "keep", geo: () => new THREE.BoxGeometry(1.1, 0.55, 0.16).translate(0, 0, 0.08) },
  windowDim: { mat: "emitWinDim", uv: "keep", geo: () => new THREE.BoxGeometry(1.0, 0.5, 0.14).translate(0, 0, 0.07) },
  windowTall: { mat: "emitWin", uv: "keep", geo: () => new THREE.BoxGeometry(0.7, 1.6, 0.16).translate(0, 0, 0.08) },
  portLight: { mat: "emitPort", uv: "keep", geo: () => new THREE.BoxGeometry(0.7, 0.35, 0.2).translate(0, 0, 0.1) },
  coldLight: { mat: "emitBlueCold", uv: "keep", geo: () => new THREE.BoxGeometry(1, 0.25, 0.2).translate(0, 0, 0.1) },
  wallBox: { mat: "hull", texel: 1 / 3, geo: () => new THREE.BoxGeometry(1, 1, 1).translate(0, 0, 0.5) },
  wallBoxDark: { mat: "hullDark", texel: 1 / 3, geo: () => new THREE.BoxGeometry(1, 1, 1).translate(0, 0, 0.5) },
  wallPipe: { mat: "hullDark", texel: 1 / 3, geo: () => new THREE.CylinderGeometry(0.5, 0.5, 1, 8).translate(0, 0, 0.5) },
  wallVent: {
    mat: "hullDark",
    texel: 1 / 2,
    geo: () => {
      const parts = [new THREE.BoxGeometry(1, 1, 0.25).translate(0, 0, 0.125)];
      for (let i = 0; i < 4; i++) parts.push(new THREE.BoxGeometry(0.86, 0.09, 0.1).translate(0, -0.36 + i * 0.24, 0.3));
      return merge(parts);
    },
  },
  wallHatch: { mat: "hullDark", texel: 1 / 2, geo: () => merge([new THREE.BoxGeometry(1, 1, 0.16).translate(0, 0, 0.08), new THREE.BoxGeometry(0.7, 0.7, 0.1).translate(0, 0, 0.2), new THREE.BoxGeometry(0.12, 0.5, 0.06).translate(0.42, 0, 0.19)]) },
  // unit Y cylinder centred at the origin (scale [r, len, r], orient with a quaternion)
  trenchPipe: { mat: "hullDark", texel: 1 / 3, geo: () => new THREE.CylinderGeometry(1, 1, 1, 10, 1, false) },
  emitBayBar: { mat: "emitBay", uv: "keep", geo: () => new THREE.BoxGeometry(1, 0.3, 0.2).translate(0, 0, 0.1) },
};

// ---------------------------------------------------------------------------------------------------
// Scatter over armour plates
// plate: { sign, s0, s1, u0, u1, thick, color: THREE.Color, big: bool }
// ---------------------------------------------------------------------------------------------------
const _c = new THREE.Color();
const _m = new THREE.Matrix4();
const _n = new THREE.Vector3();

/** metres per unit s and per unit u around a plate centre */
function plateScale(p) {
  const uc = (p.u0 + p.u1) / 2;
  const [, zc] = rayPoint((p.s0 + p.s1) / 2, uc);
  const mS = Math.max(1, halfWidth(zc)); // metres per unit s
  const mU = 1560; // metres per unit u (≈ ray length)
  return { mS, mU, zc };
}

/** Sub-plates (mid tier) and small machinery (near tier) on every plate. */
export function dressPlates(tiers, rand, plates, { subDensity = 1, greebleDensity = 1 } = {}) {
  for (const p of plates) {
    const { mS, mU } = plateScale(p);
    const w = (p.s1 - p.s0) * mS; // plate width (m)
    const l = (p.u1 - p.u0) * mU; // plate length (m)
    if (w < 6 || l < 6) continue;
    const area = w * l;
    const lift = p.thick;
    const sign = p.sign;
    // --- sub-plates: 1–3 raised panels covering part of the plate
    const nSub = Math.min(3, Math.max(1, Math.round((area / 1600) * subDensity)));
    for (let i = 0; i < nSub; i++) {
      const fw = 0.25 + rand() * 0.45;
      const fl = 0.25 + rand() * 0.45;
      const cs = p.s0 + (p.s1 - p.s0) * (fw / 2 + rand() * (1 - fw));
      const cu = p.u0 + (p.u1 - p.u0) * (fl / 2 + rand() * (1 - fl));
      const [x, z] = rayPoint(cs, cu);
      const sw = Math.max(2.5, w * fw - 1.5);
      const sl = Math.max(2.5, l * fl - 1.5);
      const th = 0.35 + rand() * 0.55;
      _c.copy(p.color).lerp(rand() < 0.5 ? IMP.hullLight : IMP.hullDark, 0.1 + rand() * 0.2);
      if (Math.abs(surfaceNormal(sign, x, z, _n).y) < 0.9) continue; // long slabs need a near-flat surface
      surfaceMatrix(sign, x, z, 0, [sw, th, sl], lift, _m);
      if (!blocked(x, surfY(sign, x, z), z)) tiers.mid.placeM(rand() < 0.8 ? "slab" : "slabDark", _m, _c);
    }
    // --- near greebles: clustered along one seam edge and a few loose pieces
    const n = Math.min(14, Math.max(2, Math.round((area / 900) * greebleDensity)));
    const edgeSide = rand() < 0.5 ? 0 : 1; // cluster near s0 or s1 edge
    for (let i = 0; i < n; i++) {
      const clustered = rand() < 0.55;
      let cs, cu;
      if (clustered) {
        const inset = (1.5 + rand() * 3) / mS;
        cs = edgeSide ? p.s1 - inset : p.s0 + inset;
        cu = p.u0 + (p.u1 - p.u0) * (0.08 + rand() * 0.84);
      } else {
        cs = p.s0 + (p.s1 - p.s0) * (0.12 + rand() * 0.76);
        cu = p.u0 + (p.u1 - p.u0) * (0.1 + rand() * 0.8);
      }
      const [x, z] = rayPoint(cs, cu);
      const y = surfY(sign, x, z);
      if (blocked(x, y + sign * 3, z)) continue;
      // the hull edge curls down steeply: nothing tall on slopes over ~35°
      if (Math.abs(surfaceNormal(sign, x, z, _n).y) < 0.82) continue;
      const k = rand();
      const yaw = rand() < 0.75 ? 0 : Math.PI / 2;
      if (k < 0.3) {
        const s = [1.2 + rand() * 3.5, 0.6 + rand() * 2.2, 1.5 + rand() * 4];
        _c.copy(p.color).lerp(rand() < 0.5 ? IMP.hullLight : IMP.hullShadow, 0.15 + rand() * 0.25);
        tiers.near.placeM(rand() < 0.6 ? "box" : "boxDark", surfaceMatrix(sign, x, z, yaw, s, lift, _m), _c);
      } else if (k < 0.5) {
        const len = 4 + rand() * Math.min(40, l * 0.6);
        const r = 0.25 + rand() * 0.5;
        tiers.near.placeM(rand() < 0.7 ? "pipeZ" : "pipeZLight", surfaceMatrix(sign, x, z, 0, [r * 2, r * 2, len], lift, _m), _c.copy(IMP.hullDark).lerp(IMP.hullMid, rand() * 0.5));
      } else if (k < 0.65) {
        const r = 0.9 + rand() * 1.6;
        tiers.near.placeM("hatch", surfaceMatrix(sign, x, z, rand() * Math.PI, [r, 1, r], lift, _m), _c.copy(IMP.hullDark).lerp(IMP.hullMid, rand() * 0.4));
      } else if (k < 0.78) {
        const s = 1.2 + rand() * 2.5;
        tiers.near.placeM("vent", surfaceMatrix(sign, x, z, yaw, [s, s * 0.8, s], lift, _m), _c.copy(IMP.hullShadow).lerp(IMP.hullDark, rand() * 0.6));
      } else if (k < 0.86) {
        const r = 0.8 + rand() * 1.8;
        tiers.near.placeM(rand() < 0.5 ? "dome" : "domeDark", surfaceMatrix(sign, x, z, 0, [r, r * 0.8, r], lift, _m), _c.copy(p.color).lerp(IMP.hullLight, rand() * 0.3));
      } else if (k < 0.92) {
        const s = 1 + rand() * 2.5;
        tiers.near.placeM("radiator", surfaceMatrix(sign, x, z, yaw, [s, s * 0.6, s], lift, _m), _c.copy(IMP.hullShadow));
      } else if (k < 0.97 && sign > 0) {
        const h = 2 + rand() * 6;
        tiers.near.placeM("antenna", surfaceMatrix(sign, x, z, rand() * Math.PI, [1, h, 1], lift, _m), _c.copy(IMP.hullDark));
      } else {
        const s = 1.2 + rand() * 2;
        tiers.near.placeM("tank", surfaceMatrix(sign, x, z, yaw, [s * 0.5, s * 0.5, s], lift, _m), _c.copy(p.color).lerp(IMP.hullLight, 0.2));
      }
    }
  }
}

/**
 * Machinery run along a seam line between two plan points on the dorsal/ventral surface: alternating boxes,
 * pipes and vents, hugging the surface (near tier).
 */
export function seamRun(tiers, rand, sign, x0, z0, x1, z1, { lift = 0, scale = 1, step = 6 } = {}) {
  const len = Math.hypot(x1 - x0, z1 - z0);
  const n = Math.max(1, Math.floor(len / step));
  const dirYaw = Math.atan2(-(x1 - x0), -(z1 - z0));
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const x = x0 + (x1 - x0) * t;
    const z = z0 + (z1 - z0) * t;
    const y = surfY(sign, x, z);
    if (blocked(x, y + sign * 3, z)) continue;
    if (Math.abs(surfaceNormal(sign, x, z, _n).y) < 0.82) continue;
    const k = rand();
    if (k < 0.45) {
      const s = [(1 + rand() * 2) * scale, (0.8 + rand() * 1.6) * scale, (2 + rand() * 3) * scale];
      tiers.near.placeM(rand() < 0.6 ? "box" : "boxDark", surfaceMatrix(sign, x, z, dirYaw, s, lift, _m), _c.copy(IMP.hullMid).lerp(rand() < 0.5 ? IMP.hullLight : IMP.hullShadow, rand() * 0.35));
    } else if (k < 0.75) {
      const r = (0.3 + rand() * 0.4) * scale;
      tiers.near.placeM("pipeZ", surfaceMatrix(sign, x, z, dirYaw, [r * 2, r * 2, step * (1 + rand())], lift, _m), _c.copy(IMP.hullDark));
    } else if (k < 0.9) {
      const s = (1 + rand() * 1.5) * scale;
      tiers.near.placeM("vent", surfaceMatrix(sign, x, z, dirYaw, [s, s * 0.7, s], lift, _m), _c.copy(IMP.hullShadow));
    } else {
      const r = (0.7 + rand()) * scale;
      tiers.near.placeM("hatch", surfaceMatrix(sign, x, z, 0, [r, 1, r], lift, _m), _c.copy(IMP.hullDark));
    }
  }
}

/**
 * Dress a vertical wall (world-space) with pilasters, hatches, vents, pipes and window rows.
 * wall: { ax, az, bx, bz, y0, y1 } — the wall runs from plan point a to b; (nx, nz) is its outward normal
 * (defaults to the right-hand side of a→b seen from above, i.e. walk the footprint clockwise in plan with
 * +x right / +z down). rows: window row pitch; occupancy: probability.
 */
export function dressWall(tiers, rand, wall, opts = {}) {
  const dx = wall.bx - wall.ax;
  const dz = wall.bz - wall.az;
  const len = Math.hypot(dx, dz);
  const h = wall.y1 - wall.y0;
  if (len < 4 || h < 3) return;
  const ux = dx / len;
  const uz = dz / len;
  const { nx = uz, nz = -ux, rows = 6, occupancy = 0.3, windows = true, pilasters = true, machinery = true, warm = 0.15, tier = "mid", firstRow = 3.5, pilasterEvery = 12, tint = IMP.hullMid, greebleTier = "near", floorFn = null, density = 1 } = opts;
  const yaw = Math.atan2(nx, nz);
  const at = (u, y, out = 0.02) => [wall.ax + ux * u + nx * out, y, wall.az + uz * u + nz * out];
  const rot = [0, yaw, 0];
  const ok = (pos) => !blocked(pos[0], pos[1], pos[2]) && (!floorFn || pos[1] > floorFn(pos[0], pos[2]) + 1.2);
  // window rows: some rows dark, windows in runs so they read as decks, not confetti
  if (windows) {
    const wtier = tiers[tier];
    for (let y = wall.y0 + firstRow; y < wall.y1 - 2; y += rows) {
      if (rand() < 0.3) continue; // unlit deck
      const warmRow = rand() < warm;
      let run = 0;
      for (let u = 2.5; u < len - 2; u += 3.2) {
        if (run <= 0) {
          if (rand() < occupancy) run = 1 + Math.floor(rand() * 4);
          else run = -(1 + Math.floor(rand() * 5));
        }
        const lit = run > 0;
        run = lit ? run - 1 : run + 1;
        if (!lit) continue;
        const pos = at(u, y + (rand() - 0.5) * 0.2, 0.04);
        if (!ok(pos)) continue;
        wtier.place(warmRow ? "windowWarm" : rand() < 0.15 ? "windowDim" : "window", { pos, rot });
      }
    }
  }
  if (pilasters) {
    for (let u = pilasterEvery * 0.5; u < len - 1; u += pilasterEvery) {
      const pos = at(u, (wall.y0 + wall.y1) / 2, 0);
      if (blocked(pos[0], pos[1], pos[2])) continue;
      const w = 1.2 + rand() * 1.4;
      const depth = 0.8 + rand() * 1.2;
      _c.copy(tint).lerp(rand() < 0.5 ? IMP.hullLight : IMP.hullDark, 0.1 + rand() * 0.2);
      tiers[tier].place(rand() < 0.85 ? "wallBox" : "wallBoxDark", { pos, rot, scale: [w, h - 0.4, depth], color: _c });
    }
  }
  if (machinery) {
    const gt = tiers[greebleTier];
    const n = Math.max(1, Math.round(((len * h) / 260) * density));
    for (let i = 0; i < n; i++) {
      const u = 2 + rand() * (len - 4);
      const y = wall.y0 + 1.5 + rand() * (h - 3);
      const pos = at(u, y, 0);
      if (!ok(pos)) continue;
      const k = rand();
      if (k < 0.35) gt.place("wallHatch", { pos, rot, scale: [1.6 + rand() * 1.6, 1.6 + rand() * 1.4, 1], color: _c.copy(IMP.hullDark).lerp(IMP.hullMid, rand() * 0.5) });
      else if (k < 0.65) gt.place("wallVent", { pos, rot, scale: [1.5 + rand() * 2.5, 1 + rand() * 1.5, 1], color: _c.copy(IMP.hullShadow) });
      else if (k < 0.85) gt.place("wallBoxDark", { pos, rot, scale: [1 + rand() * 3, 1 + rand() * 2, 0.5 + rand() * 1.5], color: _c.copy(IMP.hullDark).lerp(IMP.hullShadow, rand() * 0.5) });
      else gt.place("wallPipe", { pos, rot: [Math.PI / 2, yaw, 0], scale: [0.5 + rand() * 0.5, 3 + rand() * 12, 0.5 + rand() * 0.5], color: _c.copy(IMP.hullDark) });
    }
  }
}

/** Place a ring of surface-hugging boxes around a point (e.g. around a turret base or a dome). */
export function ringOfBoxes(tiers, rand, sign, cx, cz, r, count, { lift = 0, size = 2 } = {}) {
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + rand() * 0.3;
    const x = cx + Math.cos(a) * r;
    const z = cz + Math.sin(a) * r;
    const y = surfY(sign, x, z);
    if (blocked(x, y + sign * 2, z)) continue;
    const s = size * (0.7 + rand() * 0.6);
    tiers.near.placeM("boxDark", surfaceMatrix(sign, x, z, -a, [s, s * 0.6, s * 1.4], lift, _m), _c.copy(IMP.hullDark).lerp(IMP.hullMid, rand() * 0.4));
  }
}

export { surfaceNormal, basisMatrix, _n as tmpNormal };
