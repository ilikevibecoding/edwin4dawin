// Dorsal superstructure: the three terraced levels (level 1 buried into the plateau), turret shoulders,
// cornices and base recess bands, and the "city" of blocky buildings, caps, bridges and roof machinery on
// every roof strip. Level walls get deck window rows, pilasters, hatches and recessed openings.
import * as THREE from "three";
import { IMP } from "../core/palette.js";
import { CITY, TOWER, topY } from "../core/layout.js";
import { prism } from "../core/kit.js";
import { weather, blocked } from "./common.js";
import { dressWall } from "./greebles.js";

const _c = new THREE.Color();
const hwAt = (z) => CITY.halfWidthAt(z);

/** Extrude a plan polygon (x,z pairs) from y0 to y1. */
export function prismPlan(kit, mat, pts, y0, y1, opts = {}) {
  const g = prism(pts, y1 - y0);
  g.rotateX(Math.PI / 2);
  return kit.add(mat, g, { pos: [0, (y0 + y1) / 2, 0], uv: "world", texel: 1 / 30, ...opts });
}

function trap(z0, z1, hw0, hw1, grow = 0) {
  return [
    [-hw0 - grow, z0 - grow],
    [hw0 + grow, z0 - grow],
    [hw1 + grow, z1 + grow],
    [-hw1 - grow, z1 + grow],
  ];
}

export const SHOULDER = { z0: -200, z1: 262, w: 28, y0: 26, y1: 56 };

/** Heavy turret sites on the shoulders: { x, y, z, yaw } (yaw 0 faces the bow). */
export function turretSites() {
  const out = [];
  for (const z of CITY.turbolasers) {
    for (const side of [-1, 1]) {
      // yaw: rotation about +Y; negative for starboard so the barrels point forward-outboard
      out.push({ x: side * (hwAt(z) + SHOULDER.w * 0.55), y: SHOULDER.y1, z, yaw: -side * (0.35 + 0.25 * ((z + 330) / 800)) });
    }
  }
  return out;
}

export function buildCity(kit, tiers, rand) {
  const walls = [];
  const levelPlans = [];
  CITY.levels.forEach((lv, i) => {
    const z0 = lv.z0;
    const z1 = CITY.z1 - lv.inset * 0.5;
    const hw0 = Math.max(8, hwAt(z0) - lv.inset);
    const hw1 = hwAt(z1) - lv.inset;
    const y0 = i === 0 ? 24 : lv.y0;
    const y1 = lv.y1;
    levelPlans.push({ z0, z1, hw0, hw1, y0: lv.y0, y1 });
    const c = weather(_c.copy(IMP.hullMid).lerp(IMP.hullLight, 0.08 + i * 0.05), 0, (z0 + z1) / 2, 40).clone();
    prismPlan(kit, "hull", trap(z0, z1, hw0, hw1), y0, y1, { color: c, texel: 1 / 36 });
    // dark recess band at the (visible) base and a light cornice at the top
    prismPlan(kit, "hullDark", trap(z0 + 1, z1 - 1, hw0, hw1, 0.9), lv.y0, lv.y0 + 2.4, { color: IMP.hullShadow, texel: 1 / 12 });
    prismPlan(kit, "hull", trap(z0, z1, hw0, hw1, 1.2), y1 - 1.3, y1, { color: c.clone().lerp(IMP.hullLight, 0.2), texel: 1 / 12 });
    // walls (clockwise in plan): front, starboard, back, port
    const wy0 = i === 0 ? 40 : lv.y0 + 2.6;
    walls.push({ ax: -hw0, az: z0, bx: hw0, bz: z0, y0: wy0, y1: y1 - 1.3, nx: 0, nz: -1, front: true });
    walls.push({ ax: hw0, az: z0, bx: hw1, bz: z1, y0: wy0, y1: y1 - 1.3 });
    walls.push({ ax: hw1, az: z1, bx: -hw1, bz: z1, y0: wy0, y1: y1 - 1.3, nx: 0, nz: 1 });
    walls.push({ ax: -hw1, az: z1, bx: -hw0, bz: z0, y0: wy0, y1: y1 - 1.3 });
  });

  // turret shoulders either side of level 1
  for (const side of [-1, 1]) {
    const S = SHOULDER;
    const pts = [
      [side * (hwAt(S.z0) - 0.5), S.z0],
      [side * (hwAt(S.z0) + S.w), S.z0],
      [side * (hwAt(S.z1) + S.w), S.z1],
      [side * (hwAt(S.z1) - 0.5), S.z1],
    ];
    const c = weather(_c.copy(IMP.hullMid).lerp(IMP.hullLight, 0.1), side * 200, 30, 40).clone();
    prismPlan(kit, "hull", pts, S.y0, S.y1, { color: c, texel: 1 / 36 });
    prismPlan(kit, "hull", pts.map(([x, z]) => [x + side * 1.0, z + (z > 0 ? 1 : -1)]), S.y1 - 1.2, S.y1, { color: c.clone().lerp(IMP.hullLight, 0.2), texel: 1 / 12 });
    const ox0 = side * (hwAt(S.z0) + S.w);
    const ox1 = side * (hwAt(S.z1) + S.w);
    // outer wall (from the plateau up), front and back faces
    if (side > 0) {
      walls.push({ ax: ox0, az: S.z0, bx: ox1, bz: S.z1, y0: S.y0 + 10, y1: S.y1 - 1.2 });
      walls.push({ ax: side * hwAt(S.z0), az: S.z0, bx: ox0, bz: S.z0, y0: S.y0 + 10, y1: S.y1 - 1.2, nx: 0, nz: -1 });
      walls.push({ ax: ox1, az: S.z1, bx: side * hwAt(S.z1), bz: S.z1, y0: S.y0 + 10, y1: S.y1 - 1.2, nx: 0, nz: 1 });
    } else {
      walls.push({ ax: ox1, az: S.z1, bx: ox0, bz: S.z0, y0: S.y0 + 10, y1: S.y1 - 1.2 });
      walls.push({ ax: ox0, az: S.z0, bx: side * hwAt(S.z0), bz: S.z0, y0: S.y0 + 10, y1: S.y1 - 1.2, nx: 0, nz: -1 });
      walls.push({ ax: side * hwAt(S.z1), az: S.z1, bx: ox1, bz: S.z1, y0: S.y0 + 10, y1: S.y1 - 1.2, nx: 0, nz: 1 });
    }
  }

  // dress every wall: deck window rows, pilasters, hatches; the plateau hides anything below the hull
  const floorFn = (x, z) => topY(x, z);
  for (const w of walls) {
    const long = Math.hypot(w.bx - w.ax, w.bz - w.az) > 200;
    dressWall(tiers, rand, w, { nx: w.nx, nz: w.nz, rows: 6, occupancy: long ? 0.16 : 0.22, pilasterEvery: long ? 16 : 11, floorFn, warm: 0.12, density: 0.8 });
    if (w.front) recessPanels(tiers, rand, w, 2 + Math.floor(rand() * 2));
  }

  // ---- the city: buildings on the roof strips
  const neck = TOWER.neck[0];
  const excl = (x0, x1, z0, z1) => !(x1 < -neck.x - 4 || x0 > neck.x + 4 || z1 < neck.z0 - 4 || z0 > neck.z1 + 4);
  // level 3 roof: the main city, rows across the width
  fillRoof(kit, tiers, rand, CITY.levels[2].y1, levelPlans[2].z0 + 6, levelPlans[2].z1 - 6, (z) => Math.max(0, hwAt(z) - 45 - 4), { minH: 5, maxH: 30, rowPitch: [22, 34], exclude: excl, tall: true });
  // level 1 / level 2 roof strips (outside the next level's footprint) + their front aprons
  fillStrips(kit, tiers, rand, CITY.levels[0].y1, levelPlans[1].z0, levelPlans[0].z1 - 4, (z) => hwAt(z) - 22 + 3, (z) => hwAt(z) - 3, { minH: 3, maxH: 11 });
  fillRoof(kit, tiers, rand, CITY.levels[0].y1, levelPlans[0].z0 + 5, levelPlans[1].z0 - 4, (z) => Math.max(0, hwAt(z) - 4), { minH: 3, maxH: 12, rowPitch: [14, 20], exclude: () => false });
  fillStrips(kit, tiers, rand, CITY.levels[1].y1, levelPlans[2].z0, levelPlans[1].z1 - 4, (z) => hwAt(z) - 45 + 3, (z) => hwAt(z) - 22 - 3, { minH: 3, maxH: 12 });
  fillRoof(kit, tiers, rand, CITY.levels[1].y1, levelPlans[1].z0 + 5, levelPlans[2].z0 - 4, (z) => Math.max(0, hwAt(z) - 22 - 4), { minH: 3, maxH: 12, rowPitch: [14, 20], exclude: () => false });
  // shoulders: low machinery between the heavy turrets
  for (const side of [-1, 1]) {
    for (let z = SHOULDER.z0 + 14; z < SHOULDER.z1 - 10; z += 9 + rand() * 8) {
      if (CITY.turbolasers.some((tz) => Math.abs(tz - z) < 26)) continue;
      const x = side * (hwAt(z) + 4 + rand() * (SHOULDER.w - 8));
      const s = [3 + rand() * 6, 1.5 + rand() * 4, 3 + rand() * 7];
      tiers.mid.place(rand() < 0.7 ? "box" : "boxDark", { pos: [x, SHOULDER.y1, z], scale: s, color: _c.copy(IMP.hullMid).lerp(rand() < 0.5 ? IMP.hullLight : IMP.hullDark, rand() * 0.3) });
    }
  }
  return { walls, levelPlans };
}

/** Large dark recessed openings with a cold light bar (shuttered hangar / vent mouths) on a wall. */
function recessPanels(tiers, rand, w, n) {
  const dx = w.bx - w.ax;
  const dz = w.bz - w.az;
  const len = Math.hypot(dx, dz);
  const ux = dx / len;
  const uz = dz / len;
  const yaw = Math.atan2(w.nx, w.nz);
  const h = w.y1 - w.y0;
  for (let i = 0; i < n; i++) {
    const pw = Math.min(len * 0.3, 10 + rand() * 14);
    const ph = Math.min(h * 0.6, 5 + rand() * 6);
    const u = len * (0.15 + 0.7 * ((i + 0.5) / n)) + (rand() - 0.5) * 4;
    const y = w.y0 + h * 0.5 + (rand() - 0.5) * (h * 0.3);
    const pos = [w.ax + ux * u + w.nx * 0.05, y, w.az + uz * u + w.nz * 0.05];
    if (blocked(pos[0], pos[1], pos[2])) continue;
    tiers.mid.place("wallBoxDark", { pos, rot: [0, yaw, 0], scale: [pw, ph, 0.3], color: IMP.hullShadow.clone().multiplyScalar(0.6) });
    tiers.mid.place("wallBoxDark", { pos: [pos[0] + w.nx * 0.3, y + ph / 2 + 0.4, pos[2] + w.nz * 0.3], rot: [0, yaw, 0], scale: [pw + 1.2, 0.8, 1.4], color: IMP.hullDark });
    tiers.mid.place("coldLight", { pos: [pos[0] + w.nx * 0.32, y - ph / 2 + 0.5, pos[2] + w.nz * 0.32], rot: [0, yaw, 0], scale: [pw * 0.8, 1, 1] });
  }
}

/** Rows of blocky buildings across a roof; taller near the centre line. */
function fillRoof(kit, tiers, rand, y, zA, zB, halfW, { minH, maxH, rowPitch, exclude, tall = false }) {
  let z = zA;
  while (z < zB) {
    const pitch = rowPitch[0] + rand() * (rowPitch[1] - rowPitch[0]);
    const zc = z + pitch / 2;
    const w = halfW(zc);
    if (w > 6) {
      let x = -w + rand() * 4;
      let prev = null;
      while (x < w) {
        const fw = Math.min(6 + rand() * 16, w - x);
        const fd = Math.max(5, pitch - 6 - rand() * 4);
        if (fw < 4) break;
        const cx = x + fw / 2;
        if (!exclude(x, x + fw, zc - fd / 2, zc + fd / 2)) {
          const centre = 1 - Math.abs(cx) / Math.max(w, 1);
          const h = minH + (maxH - minH) * (0.25 + 0.75 * centre) * (0.45 + rand() * 0.55);
          const b = building(kit, tiers, rand, cx, y, zc, fw, fd, h, tall);
          if (prev && b && prev.h > 9 && b.h > 9) {
            const gap = x - (prev.x + prev.w / 2);
            if (gap > 3 && gap < 13) {
              const by = y + Math.min(prev.h, b.h) * (0.55 + rand() * 0.25);
              tiers.mid.place("box", { pos: [x - gap / 2, by, zc + (rand() - 0.5) * (fd * 0.4)], scale: [gap + 1.2, 1.8 + rand(), 2.4 + rand() * 1.5], color: _c.copy(IMP.hullMid).lerp(IMP.hullLight, 0.2) });
            }
          }
          prev = b ? { x: cx, w: fw, h: b.h } : null;
        } else prev = null;
        x += fw + 3 + rand() * 7;
      }
    }
    z += pitch;
  }
}

/** Single file of buildings along a strip bounded by inner / outer half widths (both sides). */
function fillStrips(kit, tiers, rand, y, zA, zB, innerW, outerW, { minH, maxH }) {
  for (const side of [-1, 1]) {
    let z = zA + 4;
    while (z < zB - 4) {
      const fd = 6 + rand() * 12;
      const zc = z + fd / 2;
      const wi = innerW(zc);
      const wo = outerW(zc);
      const avail = wo - wi;
      if (avail > 5) {
        const fw = Math.min(avail - 1, 5 + rand() * 9);
        const cx = side * (wi + 0.5 + rand() * (avail - fw - 1) + fw / 2);
        const h = minH + rand() * (maxH - minH);
        building(kit, tiers, rand, cx, y, zc, fw, fd, h, false);
      }
      z += fd + 3 + rand() * 8;
    }
  }
}

/** One building: block (+cap, +base band), window rows on two faces, roof machinery. Returns { h }. */
function building(kit, tiers, rand, cx, y, cz, fw, fd, h, tall) {
  if (blocked(cx, y + h / 2, cz)) return null;
  const tier = h >= 9 ? tiers.base : tiers.mid;
  const c = weather(_c.copy(IMP.hullMid).lerp(rand() < 0.6 ? IMP.hullLight : IMP.hullDark, 0.05 + rand() * 0.2), cx, cz, 60).clone();
  if (rand() < 0.12) c.lerp(IMP.hullBlue, 0.4);
  tier.place("box", { pos: [cx, y, cz], scale: [fw, h, fd], color: c });
  if (rand() < 0.3) tiers.mid.place("boxDark", { pos: [cx, y, cz], scale: [fw + 0.8, 1.2 + rand(), fd + 0.8], color: IMP.hullShadow });
  let top = y + h;
  if (rand() < 0.4) {
    const cw = fw * (0.4 + rand() * 0.4);
    const cd = fd * (0.4 + rand() * 0.4);
    const ch = 1.5 + rand() * (tall ? 6 : 3);
    const ox = (rand() - 0.5) * (fw - cw) * 0.8;
    const oz = (rand() - 0.5) * (fd - cd) * 0.8;
    tiers.mid.place("box", { pos: [cx + ox, top, cz + oz], scale: [cw, ch, cd], color: c.clone().lerp(IMP.hullLight, 0.15) });
    if (ch > 3) top += ch;
  }
  // window decks on the two long faces
  if (h >= 8) {
    const alongX = fw >= fd;
    const walls = alongX
      ? [
          { ax: cx - fw / 2, az: cz - fd / 2, bx: cx + fw / 2, bz: cz - fd / 2, y0: y, y1: y + h, nx: 0, nz: -1 },
          { ax: cx + fw / 2, az: cz + fd / 2, bx: cx - fw / 2, bz: cz + fd / 2, y0: y, y1: y + h, nx: 0, nz: 1 },
        ]
      : [
          { ax: cx + fw / 2, az: cz - fd / 2, bx: cx + fw / 2, bz: cz + fd / 2, y0: y, y1: y + h, nx: 1, nz: 0 },
          { ax: cx - fw / 2, az: cz + fd / 2, bx: cx - fw / 2, bz: cz - fd / 2, y0: y, y1: y + h, nx: -1, nz: 0 },
        ];
    for (const w of walls) dressWall(tiers, rand, w, { nx: w.nx, nz: w.nz, rows: 5.5, occupancy: 0.2, pilasters: false, machinery: rand() < 0.5, firstRow: 3, density: 0.6 });
  }
  // roof machinery
  const n = 1 + Math.floor(rand() * 3);
  for (let i = 0; i < n; i++) {
    const px = cx + (rand() - 0.5) * (fw - 2);
    const pz = cz + (rand() - 0.5) * (fd - 2);
    const k = rand();
    if (k < 0.4) tiers.near.place("vent", { pos: [px, top, pz], rot: [0, rand() < 0.5 ? 0 : Math.PI / 2, 0], scale: [1 + rand() * 2, 0.8 + rand(), 1 + rand() * 2], color: IMP.hullShadow });
    else if (k < 0.7) tiers.near.place("boxDark", { pos: [px, top, pz], scale: [1 + rand() * 2.5, 0.6 + rand() * 2, 1 + rand() * 2.5], color: _c.copy(IMP.hullDark).lerp(IMP.hullMid, rand() * 0.4) });
    else if (k < 0.85) tiers.near.place("antenna", { pos: [px, top, pz], rot: [0, rand() * Math.PI, 0], scale: [1, 2 + rand() * 5, 1], color: IMP.hullDark });
    else tiers.near.place("dome", { pos: [px, top, pz], scale: 0.8 + rand() * 1.5, color: c });
  }
  return { h };
}
