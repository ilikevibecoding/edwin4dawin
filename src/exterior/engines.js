// Stern: seven engine bells (two-stage nozzle profile, longitudinal ribs, rings, collar, mount struts),
// glowing throats with a depth gradient shader, and the machinery filling the stern face between them
// (conduit bundles, ducts, radiator grilles, recessed vents, hatches) plus the angled corner faces.
import * as THREE from "three";
import { IMP } from "../core/palette.js";
import { ENGINES, HULL, topY, ventralY, sternZAt } from "../core/layout.js";
import { STERN, HW } from "./common.js";
import { dressWall } from "./greebles.js";

const _c = new THREE.Color();
const _m = new THREE.Matrix4();
const _m2 = new THREE.Matrix4();

function engineList() {
  return [...ENGINES.main.map((e) => ({ ...e, main: true })), ...ENGINES.aux.map((e) => ({ ...e, main: false }))];
}

export function buildEngines(kit, tiers, rand) {
  const heat = _c.copy(IMP.hullDark).lerp(new THREE.Color("#5a4a42"), 0.35).clone();
  for (const e of engineList()) {
    const L = e.main ? ENGINES.nozzleLen : ENGINES.nozzleLen * 0.5;
    const seg = e.main ? 48 : 28;
    const r = e.r;
    const z0 = STERN;
    // bell: throat section then flare (radiusTop = aft end after the +90° X rotation)
    const zA = z0 + L * 0.45;
    const zB = z0 + L;
    kit.add("hullDark", new THREE.CylinderGeometry(r * 0.95, r * 0.8, L * 0.45, seg, 1, true), { pos: [e.x, e.y, (z0 + zA) / 2], rot: [Math.PI / 2, 0, 0], color: heat, uv: "scale", uvScale: [6, 1] });
    kit.add("hullDark", new THREE.CylinderGeometry(r * 1.03, r * 0.95, L * 0.55, seg, 1, true), { pos: [e.x, e.y, (zA + zB) / 2], rot: [Math.PI / 2, 0, 0], color: _c.copy(heat).lerp(IMP.hullShadow, 0.3), uv: "scale", uvScale: [6, 1] });
    // inner throat with the glow gradient (deep = bright), core disc at the bottom
    const throat = new THREE.CylinderGeometry(r * 0.93, r * 0.34, L * 0.82, seg, 1, true);
    kit.add("engineGlow", throat, { pos: [e.x, e.y, z0 + L * 0.15 + L * 0.41], rot: [Math.PI / 2, 0, 0], uv: "keep" });
    const disc = new THREE.CircleGeometry(r * 0.35, seg);
    const duv = disc.attributes.uv;
    for (let i = 0; i < duv.count; i++) duv.setY(i, 0);
    kit.add("engineGlow", disc, { pos: [e.x, e.y, z0 + L * 0.15], uv: "keep" });
    // rings following the bell profile
    for (const [k, rr] of [
      [0.03, r * 0.82],
      [0.45, r * 0.96],
      [0.72, r * 1.0],
      [0.985, r * 1.04],
    ]) {
      kit.add("hull", new THREE.TorusGeometry(rr + 0.4, e.main ? 1.5 : 0.8, 8, seg), { pos: [e.x, e.y, z0 + L * k], color: _c.copy(IMP.hullMid).lerp(IMP.hullDark, 0.4), uv: "scale", uvScale: [10, 1] });
    }
    // lip: a thick rim at the aft end
    kit.add("hullDark", new THREE.TorusGeometry(r * 1.0, e.main ? 2.2 : 1.1, 10, seg), { pos: [e.x, e.y, zB - (e.main ? 1.2 : 0.6)], color: _c.copy(heat).lerp(IMP.hullShadow, 0.5), uv: "scale", uvScale: [10, 1] });
    // longitudinal ribs on both bell stages (tilted to follow the flare)
    const nRib = e.main ? 16 : 10;
    for (let i = 0; i < nRib; i++) {
      const a = (i / nRib) * Math.PI * 2;
      for (const [ra, rb, za, zb] of [
        [r * 0.8, r * 0.95, z0 + 1, zA],
        [r * 0.95, r * 1.03, zA, zB - 2],
      ]) {
        const len = zb - za;
        const rm = (ra + rb) / 2 + (e.main ? 0.9 : 0.5);
        const tilt = Math.atan2(rb - ra, len);
        _m.makeRotationZ(a).multiply(_m2.makeTranslation(rm, 0, (za + zb) / 2)).multiply(_m2.makeRotationY(tilt));
        const g = new THREE.BoxGeometry(e.main ? 1.8 : 0.9, e.main ? 1.4 : 0.7, len * 0.96);
        _m2.makeTranslation(e.x, e.y, 0).multiply(_m);
        kit.addAt("hull", g, _m2, { color: _c.copy(IMP.hullMid).lerp(IMP.hullDark, 0.35), uv: "world", texel: 1 / 8 });
      }
    }
    // collar plate on the stern face and four mount struts
    kit.add("hull", new THREE.CylinderGeometry(r * 1.12, r * 1.18, 2.4, seg), { pos: [e.x, e.y, z0 + 1.2], rot: [Math.PI / 2, 0, 0], color: _c.copy(IMP.hullMid).lerp(IMP.hullDark, 0.3), uv: "scale", uvScale: [8, 1] });
    for (let i = 0; i < 4; i++) {
      const a = Math.PI / 4 + (i * Math.PI) / 2;
      const len = L * 0.4;
      const rm = r * 0.92 + (e.main ? 2.5 : 1.3);
      _m.makeRotationZ(a).multiply(_m2.makeTranslation(rm, 0, len / 2 + 1)).multiply(_m2.makeRotationY(0.16));
      _m2.makeTranslation(e.x, e.y, z0).multiply(_m);
      kit.addAt("hullDark", new THREE.BoxGeometry(e.main ? 3 : 1.5, e.main ? 4 : 2, len), _m2, { color: IMP.hullDark, uv: "world", texel: 1 / 8 });
    }
  }

  // ---- stern face machinery (flat section |x| ≤ sternFlatX)
  const engines = engineList();
  const clear = (x, y, pad = 3) => engines.every((e) => Math.hypot(x - e.x, y - e.y) > e.r * 1.2 + pad);
  const zf = STERN + 0.05;
  const placeWall = (name, x, y, scale, color, tier = tiers.near, rot = [0, 0, 0]) => tier.place(name, { pos: [x, y, zf], rot, scale, color });
  const yTop = (x) => topY(x, STERN);
  const yBot = (x) => ventralY(x, STERN);
  // big structural elements: horizontal deck lines across the face (mid tier)
  for (const y of [-58, -30, 24, 44]) {
    for (let x = -HULL.sternFlatX + 8; x < HULL.sternFlatX - 8; x += 26 + rand() * 16) {
      if (!clear(x, y, 6) || y > yTop(x) - 3 || y < yBot(x) + 3) continue;
      placeWall("wallBox", x, y, [18 + rand() * 12, 2.2 + rand() * 1.5, 1.2 + rand()], _c.copy(IMP.hullDark).lerp(IMP.hullMid, rand() * 0.5), tiers.mid);
    }
  }
  // conduit bundles, ducts, grilles, vents, hatches
  for (let i = 0; i < 420; i++) {
    const x = -HULL.sternFlatX + 6 + rand() * (HULL.sternFlatX * 2 - 12);
    const y = yBot(x) + 4 + rand() * (yTop(x) - yBot(x) - 8);
    if (!clear(x, y)) continue;
    const k = rand();
    if (k < 0.22) {
      const len = 8 + rand() * 30;
      const r = 0.6 + rand() * 1.2;
      if (!clear(x, y + len / 2, 2) || !clear(x, y - len / 2, 2)) continue;
      placeWall("wallPipe", x, y, [r, len, r], IMP.hullDark, tiers.near, [Math.PI / 2, 0, 0]);
      if (rand() < 0.6) placeWall("wallPipe", x + r * 2.2, y + 2, [r * 0.8, len * 0.8, r * 0.8], IMP.hullShadow, tiers.near, [Math.PI / 2, 0, 0]);
    } else if (k < 0.42) {
      placeWall("wallBox", x, y, [4 + rand() * 9, 3 + rand() * 6, 1.5 + rand() * 3.5], _c.copy(IMP.hullDark).lerp(IMP.hullMid, rand() * 0.5), tiers.mid);
    } else if (k < 0.62) {
      placeWall("wallVent", x, y, [4 + rand() * 8, 3 + rand() * 6, 1.2], IMP.hullShadow, tiers.near);
    } else if (k < 0.78) {
      placeWall("wallBoxDark", x, y, [6 + rand() * 10, 5 + rand() * 8, 0.3], new THREE.Color(0x1a1c20), tiers.mid);
      placeWall("wallBoxDark", x, y + 3 + rand() * 4, [7 + rand() * 10, 0.8, 1.2], IMP.hullDark, tiers.mid);
    } else if (k < 0.9) {
      placeWall("wallHatch", x, y, [2 + rand() * 3, 2 + rand() * 3, 1], _c.copy(IMP.hullDark).lerp(IMP.hullMid, rand() * 0.4), tiers.near);
    } else {
      placeWall("coldLight", x, y, [3 + rand() * 6, 1, 1], 0xffffff, tiers.mid);
    }
  }
  // angled corner faces (|x| 330..450): sparse machinery with the local outward normal
  for (const side of [-1, 1]) {
    const x0 = side * HULL.sternFlatX;
    const x1 = side * HW;
    const z0 = sternZAt(x0);
    const z1 = sternZAt(x1);
    const dx = x1 - x0;
    const dz = z1 - z0;
    const len = Math.hypot(dx, dz);
    // outward normal: +z and +side x
    let nx = -dz / len;
    let nz = dx / len;
    if (nz < 0) {
      nx = -nx;
      nz = -nz;
    }
    const yb = ventralY(x0 * 0.98, z0 - 1) + 4;
    const yt = topY(x0 * 0.98, z0 - 1) - 3;
    const a = side > 0 ? [x0, z0] : [x1, z1];
    const b = side > 0 ? [x1, z1] : [x0, z0];
    dressWall(tiers, rand, { ax: a[0], az: a[1], bx: b[0], bz: b[1], y0: yb, y1: yt }, { nx, nz, windows: true, occupancy: 0.15, rows: 9, pilasters: true, pilasterEvery: 14, machinery: true, density: 1.4, warm: 0 });
  }
}

/** Per-frame engine glow flicker (drives the shared shader uniform). */
export function updateEngines(M, t) {
  const u = M.engineGlow.uniforms;
  u.time.value = t;
  u.power.value = 0.94 + 0.06 * Math.sin(t * 7.3) + 0.04 * Math.sin(t * 19.1);
}
