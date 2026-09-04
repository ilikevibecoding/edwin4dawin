// The iconic side trench: the recessed band between the dorsal and ventral lips, packed with conduit
// bundles along the back wall, equipment boxes in clusters, vertical struts between the lips, recessed
// hangar / vent mouths with lit lintels, docking rings with guidance lights and a sparse window row.
import * as THREE from "three";
import { IMP } from "../core/palette.js";
import { HULL, halfWidth } from "../core/layout.js";
import { BOW, TR, faceMatrix, blocked } from "./common.js";

const _c = new THREE.Color();
const _m = new THREE.Matrix4();

export function buildTrench(kit, tiers, rand) {
  const zCorner = HULL.sternCornerZ;
  for (const side of [-1, 1]) {
    // back wall line: x = side * (hw(z) - depth); outward normal tilts toward the bow as the wedge widens
    const dz = zCorner - BOW;
    const dx = side * HULL.halfWidthStern;
    const len = Math.hypot(dx, dz);
    const ux = dx / len;
    const uz = dz / len;
    let nx = uz;
    let nz = -ux;
    if (nx * side < 0) {
      nx = -nx;
      nz = -nz;
    }
    const yaw = Math.atan2(nx, nz);
    const rot = [0, yaw, 0];
    const wallX = (z) => side * (halfWidth(z) - TR.depth);
    const at = (z, y, out = 0.05) => [wallX(z) + nx * out, y, z + nz * out];
    const zA = BOW + 0.06 * dz;
    const zB = zCorner - 6;

    // vertical struts between the lips every ~24 m (mid tier: they carry the rhythm from 1 km)
    for (let z = zA + 8; z < zB; z += 21 + rand() * 7) {
      const w = 1.2 + rand() * 1.2;
      tiers.mid.place("wallBox", { pos: at(z, 0, 0), rot, scale: [w, TR.y1 - TR.y0 - 0.2, 2.2 + rand() * 2.4], color: _c.copy(IMP.hullMid).lerp(IMP.hullDark, 0.3 + rand() * 0.3) });
    }
    // long conduit bundles along the wall at three heights, segmented with gaps and radius changes
    for (const [y, r0] of [
      [3.6, 0.55],
      [-0.6, 0.75],
      [-3.9, 0.45],
    ]) {
      let z = zA + rand() * 30;
      while (z < zB - 20) {
        const seg = 40 + rand() * 90;
        const r = r0 * (0.8 + rand() * 0.5);
        const zc = z + seg / 2;
        if (zc > zB) break;
        const pos = at(zc, y + (rand() - 0.5) * 0.4, r + 0.4);
        tiers.near.placeM("trenchPipe", trenchPipeMatrix(pos, ux, uz, r, seg, _m), _c.copy(IMP.hullDark).lerp(IMP.hullMid, rand() * 0.45));
        if (rand() < 0.5) tiers.near.placeM("trenchPipe", trenchPipeMatrix(at(zc, y + r * 2.1, r * 0.8 + 0.4), ux, uz, r * 0.8, seg * 0.8, _m), _c.copy(IMP.hullShadow).lerp(IMP.hullDark, rand() * 0.6));
        // pipe clamps
        for (let k = 0.15; k < 1; k += 0.28) {
          const zz = z + seg * k;
          tiers.near.place("wallBoxDark", { pos: at(zz, y, 0), rot, scale: [1.2, r * 2.6 + 0.6, r * 2 + 0.9], color: IMP.hullShadow });
        }
        z += seg + 6 + rand() * 40;
      }
    }
    // equipment clusters against the back wall
    for (let z = zA; z < zB; z += 9 + rand() * 14) {
      const n = 1 + Math.floor(rand() * 3);
      for (let i = 0; i < n; i++) {
        const y = TR.y0 + 1.5 + rand() * (TR.y1 - TR.y0 - 3);
        const zz = z + (rand() - 0.5) * 8;
        const k = rand();
        if (k < 0.4) tiers.near.place(rand() < 0.6 ? "wallBox" : "wallBoxDark", { pos: at(zz, y, 0), rot, scale: [2 + rand() * 6, 1.5 + rand() * 4, 1 + rand() * 4], color: _c.copy(IMP.hullMid).lerp(rand() < 0.5 ? IMP.hullLight : IMP.hullShadow, 0.1 + rand() * 0.35) });
        else if (k < 0.62) tiers.near.place("wallVent", { pos: at(zz, y, 0), rot, scale: [2.5 + rand() * 4, 2 + rand() * 3, 1], color: IMP.hullShadow });
        else if (k < 0.8) tiers.near.place("wallHatch", { pos: at(zz, y, 0), rot, scale: [2 + rand() * 2.5, 2 + rand() * 2.5, 1], color: _c.copy(IMP.hullDark).lerp(IMP.hullMid, rand() * 0.4) });
        else if (k < 0.92) tiers.near.placeM("tank", faceMatrix(...at(zz, y, 0.2), nx, 0, nz, rand() < 0.5 ? 0 : Math.PI / 2, [1.2 + rand(), 1.2 + rand(), 2 + rand() * 4], _m), _c.copy(IMP.hullMid).lerp(IMP.hullLight, 0.15));
        else tiers.near.placeM("dome", faceMatrix(...at(zz, y, 0.1), nx, 0, nz, 0, 0.8 + rand() * 1.4, _m), _c.copy(IMP.hullLight));
      }
    }
    // recessed hangar / vent mouths with a frame and a cold light bar (every 130–220 m)
    for (let z = zA + 90 + rand() * 60; z < zB - 40; z += 130 + rand() * 90) {
      const w = 9 + rand() * 9;
      const h = 6.5 + rand() * 2;
      const y = (TR.y0 + TR.y1) / 2 + (rand() - 0.5) * 1.5;
      const p = at(z, y, 0.02);
      tiers.mid.place("wallBoxDark", { pos: p, rot, scale: [w, h, 0.2], color: new THREE.Color(0x07080b) });
      tiers.mid.place("wallBoxDark", { pos: at(z, y + h / 2 + 0.5, 0), rot, scale: [w + 1.6, 1.0, 1.8], color: IMP.hullDark });
      tiers.mid.place("wallBoxDark", { pos: at(z - w / 2 - 0.6, y, 0), rot, scale: [1.2, h + 1.2, 1.4], color: IMP.hullDark });
      tiers.mid.place("wallBoxDark", { pos: at(z + w / 2 + 0.6, y, 0), rot, scale: [1.2, h + 1.2, 1.4], color: IMP.hullDark });
      tiers.mid.place("coldLight", { pos: at(z, y + h / 2 - 0.25, 0.25), rot, scale: [w * 0.85, 0.8, 1] });
      if (rand() < 0.5) tiers.mid.place("emitBayBar", { pos: at(z, y - h / 2 + 0.3, 0.2), rot, scale: [w * 0.7, 1, 1] });
    }
    // docking rings with guidance lights (every ~300 m)
    for (let z = zA + 200 + rand() * 80; z < zB - 60; z += 260 + rand() * 120) {
      const p = at(z, 0.2, 0.1);
      if (blocked(p[0], p[1], p[2])) continue;
      tiers.mid.placeM("ring", faceMatrix(p[0], p[1], p[2], nx, 0, nz, 0, [3.2, 1.6, 3.2], _m), IMP.hullLight);
      tiers.mid.place("wallBoxDark", { pos: at(z, 0.2, 0), rot, scale: [5.6, 5.6, 0.3], color: IMP.hullShadow });
      for (const [ox, oy] of [
        [-4.2, 0],
        [4.2, 0],
        [0, 4.2],
        [0, -4.2],
      ]) tiers.mid.place("portLight", { pos: at(z + ox, 0.2 + oy, 0.15), rot, scale: [0.9, 0.9, 1] });
    }
    // a sparse window row (crew galleries look out of the trench)
    for (let z = zA + 20; z < zB; z += 3.4) {
      if (rand() < 0.78) continue;
      const p = at(z, 1.9 + (rand() - 0.5) * 0.3, 0.05);
      tiers.mid.place(rand() < 0.2 ? "windowWarm" : "windowDim", { pos: p, rot, scale: [1, 0.8, 1] });
    }
  }
}

/** Matrix for a unit Y-cylinder (trenchPipe proto) lying along the wall direction (ux, uz) at pos. */
function trenchPipeMatrix(pos, ux, uz, r, len, out) {
  // local +Y → (ux, 0, uz)
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(ux, 0, uz));
  return out.compose(new THREE.Vector3(pos[0], pos[1], pos[2]), q, new THREE.Vector3(r, len, r));
}
