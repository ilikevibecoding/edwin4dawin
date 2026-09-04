// Armament and sensors: eight heavy octuple turbolaser turrets on the shoulders (merged geometry, cast
// shadows), medium twin turrets along the terrace edges / plateau / belly (instanced), point-defence guns
// along the trench lips and terrace edges (instanced), tractor beam projectors under the bow, sensor domes.
import * as THREE from "three";
import { mergeGeometries, mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import { IMP } from "../core/palette.js";
import { CITY, halfWidth, topY } from "../core/layout.js";
import { prism } from "../core/kit.js";
import { rayPoint, surfaceMatrix, surfY, blocked, HW } from "./common.js";
import { turretSites } from "./city.js";
import { ringOfBoxes } from "./greebles.js";

const _c = new THREE.Color();
const _m = new THREE.Matrix4();
const _m2 = new THREE.Matrix4();
const _m3 = new THREE.Matrix4();

const cylY = (r, h, seg = 16, y0 = 0) => new THREE.CylinderGeometry(r, r, h, seg, 1, false).translate(0, y0 + h / 2, 0);

/** Barrel along −z from z=z0 back to z0−len at (x, y), radius r (local space). */
function barrel(x, y, z0, len, r, seg = 8) {
  const g = new THREE.CylinderGeometry(r * 0.85, r, len, seg, 1, false);
  g.rotateX(Math.PI / 2);
  g.translate(x, y, z0 - len / 2);
  return g;
}

/** Instanced weapon prototypes (real scale, base at y=0, facing −z). */
export const WEAPON_PROTOS = {
  turretMed: {
    mat: "hull",
    texel: 1 / 4,
    geo: () => {
      const body = prism(
        [
          [-3.2, 1.2],
          [3.2, 1.2],
          [3.2, 3.6],
          [1.6, 4.4],
          [-2.6, 4.4],
          [-3.2, 3.4],
        ],
        6.2,
      );
      // profile is in (z,y) extruded along x: rotate so local x -> z (extrude is non-indexed → index it)
      body.rotateY(Math.PI / 2);
      const parts = [cylY(4.2, 1.2, 20), mergeVertices(body), new THREE.BoxGeometry(5.4, 1.6, 1.4).translate(0, 3.0, -3.4)];
      for (const bx of [-1.3, 1.3]) parts.push(barrel(bx, 3.1, -3.8, 9.5, 0.42), new THREE.TorusGeometry(0.55, 0.14, 6, 10).translate(bx, 3.1, -13.1));
      parts.push(new THREE.SphereGeometry(0.9, 10, 6).translate(1.6, 4.6, 1.2));
      const g = mergeGeometries(parts, false);
      // elevate barrels+body slightly: whole assembly pitched up 6° about the base ring centre height
      return g;
    },
  },
  turretPD: {
    mat: "hullDark",
    texel: 1 / 2,
    geo: () => mergeGeometries([cylY(1.5, 0.6, 12), new THREE.SphereGeometry(1.15, 12, 8).translate(0, 1.6, 0), barrel(0, 1.8, -0.8, 4.2, 0.22, 6), barrel(0.6, 1.4, -0.6, 2.8, 0.14, 5), new THREE.BoxGeometry(0.4, 1.2, 0.4).translate(0, 2.6, 0.6)], false),
  },
  tractor: {
    mat: "hull",
    texel: 1 / 4,
    geo: () => {
      // emitter axis: local (0, 0.6, −0.8) = outward (away from the belly) and forward
      const dishG = new THREE.CylinderGeometry(4.5, 1.2, 2.2, 24, 1, true);
      dishG.rotateX(-0.93);
      dishG.translate(0, 6.5, -4.5);
      const rim = new THREE.TorusGeometry(4.5, 0.4, 8, 24);
      rim.rotateX(-0.93);
      rim.translate(0, 6.5 + 0.66, -4.5 - 0.88);
      return mergeGeometries([new THREE.BoxGeometry(9, 5, 9).translate(0, 2.5, 0), cylY(3.2, 2.5, 16, 5), dishG, rim, cylY(0.6, 3, 8, 7.5), new THREE.BoxGeometry(1.2, 1.2, 3.5).translate(0, 5.6, -2)], false);
    },
  },
  bigDome: { mat: "hull", texel: 1 / 4, geo: () => mergeGeometries([cylY(1.02, 0.12, 28), new THREE.SphereGeometry(1, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, 0.12, 0), new THREE.TorusGeometry(0.72, 0.03, 4, 28).rotateX(Math.PI / 2).translate(0, 0.82, 0)], false) },
};

/** Heavy octuple turbolaser turret at the given site (merged into the base kit). */
function heavyTurret(kit, site, rand) {
  const parts = [];
  const light = _c.copy(IMP.hullLight).lerp(IMP.hullMid, 0.2).clone();
  const dark = IMP.hullDark;
  const add = (mat, geo, color) => parts.push({ mat, geo, color });
  add("hullDark", cylY(12.5, 2.4, 32), dark);
  add("hull", cylY(11.2, 1.6, 32, 2.4), IMP.hullMid);
  add("hull", cylY(8.6, 0.8, 32, 4.0), light);
  const body = prism(
    [
      [-9.5, 4.6],
      [9.5, 4.6],
      [9.5, 11.5],
      [5.0, 14.2],
      [-6.5, 14.2],
      [-9.5, 11.2],
    ],
    19,
  );
  body.rotateY(Math.PI / 2);
  add("hull", body, light);
  add("hullDark", new THREE.BoxGeometry(17.5, 4.6, 3.4).translate(0, 9.6, -9.2), dark);
  // 8 barrels in two rows, elevated 10° about the trunnion at (0, 9.6, −8)
  const el = new THREE.Matrix4().makeTranslation(0, 9.6, -8).multiply(new THREE.Matrix4().makeRotationX(-0.17)).multiply(new THREE.Matrix4().makeTranslation(0, -9.6, 8));
  for (const by of [8.4, 11.0]) {
    for (const bx of [-6.3, -2.1, 2.1, 6.3]) {
      const b = barrel(bx, by, -9.5, 26, 0.85, 10);
      b.applyMatrix4(el);
      add("hullDark", b, dark);
      const ring = new THREE.TorusGeometry(1.15, 0.28, 6, 14).translate(bx, by, -34.2);
      ring.applyMatrix4(el);
      add("hull", ring, IMP.hullMid);
      const collar = new THREE.CylinderGeometry(1.25, 1.25, 1.8, 10).rotateX(Math.PI / 2).translate(bx, by, -12.5);
      collar.applyMatrix4(el);
      add("hull", collar, IMP.hullMid);
    }
  }
  // roof detail: sensor dome, rangefinder box, hatches
  add("hull", new THREE.SphereGeometry(1.9, 14, 8).translate(4, 14.4, 2), IMP.hullLight);
  add("hullDark", new THREE.BoxGeometry(3.4, 1.4, 5).translate(-4.5, 14.9, 1), dark);
  add("hullDark", new THREE.BoxGeometry(0.3, 4, 0.3).translate(-4.5, 17.5, 1), dark);
  add("hullDark", new THREE.BoxGeometry(6, 0.5, 4).translate(0, 14.3, 5.5), dark);
  add("hull", new THREE.BoxGeometry(2, 3, 6).translate(7.5, 5.6, 5), IMP.hullMid);
  add("hull", new THREE.BoxGeometry(2, 3, 6).translate(-7.5, 5.6, 5), IMP.hullMid);
  _m.makeTranslation(site.x, site.y, site.z).multiply(_m2.makeRotationY(site.yaw));
  for (const p of parts) kit.addAt(p.mat, p.geo, _m, { color: p.color, uv: "world", texel: 1 / 8 });
  void rand;
}

export function buildWeapons(kit, tiers, rand) {
  // ---- heavy turrets on the shoulders
  for (const s of turretSites()) heavyTurret(kit, s, rand);

  // ---- medium turrets: level-1 roof edge, plateau ahead of the city, belly
  const med = [];
  for (const side of [-1, 1]) {
    for (let z = -290; z < 445; z += 92) {
      const x = side * (CITY.halfWidthAt(z) - 7);
      med.push({ pos: [x, CITY.levels[0].y1, z], yaw: -side * 0.5, sign: 1, flat: true });
    }
  }
  for (const [s, u] of [
    [0.3, 0.36],
    [-0.3, 0.36],
    [0.32, 0.26],
    [-0.32, 0.26],
    [0.6, 0.62],
    [-0.6, 0.62],
    [0.62, 0.8],
    [-0.62, 0.8],
  ]) {
    const [x, z] = rayPoint(s, u);
    med.push({ x, z, yaw: -Math.sign(s) * 0.7, sign: 1 });
  }
  for (const [s, u] of [
    [0.55, 0.3],
    [-0.55, 0.3],
    [0.5, 0.58],
    [-0.5, 0.58],
  ]) {
    const [x, z] = rayPoint(s, u);
    med.push({ x, z, yaw: -Math.sign(s) * 0.6, sign: -1 });
  }
  for (const t of med) {
    if (t.flat) {
      tiers.base.place("turretMed", { pos: t.pos, rot: [0, t.yaw, 0], color: IMP.hullLight });
      tiers.mid.place("boxDark", { pos: [t.pos[0], t.pos[1], t.pos[2]], scale: [11, 0.6, 11], color: IMP.hullDark });
    } else {
      const y = surfY(t.sign, t.x, t.z);
      if (blocked(t.x, y + t.sign * 4, t.z)) continue;
      tiers.base.placeM("turretMed", surfaceMatrix(t.sign, t.x, t.z, t.yaw, 1, 0.6, _m), IMP.hullLight);
      tiers.mid.placeM("slabDark", surfaceMatrix(t.sign, t.x, t.z, 0, [12, 0.8, 12], 0, _m), IMP.hullDark);
      ringOfBoxes(tiers, rand, t.sign, t.x, t.z, 8.5, 6, { lift: 0.8, size: 1.6 });
    }
  }

  // ---- point-defence guns: trench top lip, terrace edges
  for (const side of [-1, 1]) {
    for (let u = 0.16; u < 0.96; u += 0.05 + rand() * 0.03) {
      const [, z] = rayPoint(side, u);
      const x = side * (halfWidth(z) - 4.2);
      tiers.near.place("turretPD", { pos: [x, topY(x, z) + 0.9, z], rot: [0, -side * (0.9 + rand() * 0.6), 0], color: IMP.hullDark });
    }
  }
  for (const lv of [1, 2]) {
    const L = CITY.levels[lv];
    const z1 = CITY.z1 - L.inset * 0.5;
    for (const side of [-1, 1]) {
      for (let z = L.z0 + 30; z < z1 - 20; z += 55 + rand() * 30) {
        const x = side * (CITY.halfWidthAt(z) - L.inset - 3);
        tiers.near.place("turretPD", { pos: [x, L.y1, z], rot: [0, -side * 1.1, 0], color: IMP.hullDark });
      }
    }
  }

  // ---- tractor beam projectors under the bow (four, angled forward-down)
  for (const [s, u] of [
    [0.32, 0.19],
    [-0.32, 0.19],
    [0.55, 0.26],
    [-0.55, 0.26],
  ]) {
    const [x, z] = rayPoint(s, u);
    tiers.base.placeM("tractor", surfaceMatrix(-1, x, z, 0, 1, 0, _m), IMP.hullLight);
    tiers.mid.placeM("slabDark", surfaceMatrix(-1, x, z, 0, [14, 0.7, 14], 0, _m), IMP.hullDark);
  }

  // ---- sensor domes: two large on the aft plateau, smaller ones along the level-1 roof and the bow
  for (const side of [-1, 1]) {
    const x = side * 235;
    const z = 484;
    tiers.base.placeM("bigDome", surfaceMatrix(1, x, z, 0, 9, 0, _m), IMP.hullLight);
    tiers.mid.placeM("slabDark", surfaceMatrix(1, x, z, 0, [22, 0.8, 22], 0, _m), IMP.hullDark);
    for (const z2 of [-120, 120, 340]) {
      const x2 = side * (CITY.halfWidthAt(z2) - 14);
      tiers.base.place("bigDome", { pos: [x2, CITY.levels[0].y1, z2], scale: 4.5, color: IMP.hullLight });
    }
  }
  for (const [s, u] of [
    [0.15, 0.1],
    [-0.15, 0.1],
    [0, 0.06],
  ]) {
    const [x, z] = rayPoint(s, u);
    tiers.base.placeM("bigDome", surfaceMatrix(1, x, z, 0, 3 + rand() * 2, 1.2, _m), IMP.hullLight);
  }
  void HW;
  void _m3;
}
