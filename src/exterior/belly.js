// Ventral detail: the flat belly plate with the two bay wells (shaft walls, lit rims, strip lights,
// containment fields), structural ribs where the plate blends into the hull, docking ports and machinery
// clusters around the wells, the reactor bulb with panel lines / collar / struts / surface hatches.
import * as THREE from "three";
import { IMP } from "../core/palette.js";
import { BAYS, BELLY_PLATE, REACTOR_BULB, ventralY } from "../core/layout.js";
import { surfaceMatrix, blocked, weather } from "./common.js";

const _c = new THREE.Color();
const _m = new THREE.Matrix4();

export function buildBelly(kit, tiers, rand, materials) {
  const B = BELLY_PLATE;
  const w = B.x1 - B.x0;
  const d = B.z1 - B.z0;
  // ---- plate with the well holes (ShapeGeometry in XY facing +Z → rotate to lie in XZ facing down)
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2, -d / 2);
  shape.lineTo(w / 2, -d / 2);
  shape.lineTo(w / 2, d / 2);
  shape.lineTo(-w / 2, d / 2);
  shape.closePath();
  for (const b of Object.values(BAYS)) {
    const hx = (b.x0 + b.x1) / 2 - (B.x0 + B.x1) / 2;
    const hy = (b.z0 + b.z1) / 2 - (B.z0 + B.z1) / 2;
    const hw = b.x1 - b.x0;
    const hh = b.z1 - b.z0;
    const p = new THREE.Path();
    p.moveTo(hx - hw / 2, hy - hh / 2);
    p.lineTo(hx - hw / 2, hy + hh / 2);
    p.lineTo(hx + hw / 2, hy + hh / 2);
    p.lineTo(hx + hw / 2, hy - hh / 2);
    p.closePath();
    shape.holes.push(p);
  }
  const plate = new THREE.ShapeGeometry(shape, 4);
  plate.rotateX(Math.PI / 2);
  const plateColor = weather(_c.copy(IMP.hullDark).lerp(IMP.hullMid, 0.35), 0, 40, -60).clone();
  kit.add("hullDark", plate, { pos: [(B.x0 + B.x1) / 2, B.y - 0.15, (B.z0 + B.z1) / 2], uv: "world", texel: 1 / 60, color: plateColor });
  // raised sub-plates on the flat plate (mid), machinery (near)
  for (let i = 0; i < 26; i++) {
    const x = B.x0 + 6 + rand() * (w - 12);
    const z = B.z0 + 6 + rand() * (d - 12);
    const sx = 6 + rand() * 14;
    const sz = 8 + rand() * 22;
    if (Object.values(BAYS).some((b) => x + sx / 2 > b.x0 - 5 && x - sx / 2 < b.x1 + 5 && z + sz / 2 > b.z0 - 5 && z - sz / 2 < b.z1 + 5)) continue;
    tiers.mid.placeM("slab", surfaceMatrix(-1, x, z, 0, [sx, 0.5 + rand() * 0.5, sz], 0.15, _m), _c.copy(plateColor).lerp(rand() < 0.5 ? IMP.hullLight : IMP.hullShadow, 0.15 + rand() * 0.15));
  }
  for (let i = 0; i < 90; i++) {
    const x = B.x0 + 4 + rand() * (w - 8);
    const z = B.z0 + 4 + rand() * (d - 8);
    if (Object.values(BAYS).some((b) => x > b.x0 - 6 && x < b.x1 + 6 && z > b.z0 - 6 && z < b.z1 + 6)) continue;
    const k = rand();
    if (k < 0.35) tiers.near.placeM("boxDark", surfaceMatrix(-1, x, z, rand() < 0.5 ? 0 : Math.PI / 2, [1.5 + rand() * 3, 0.8 + rand() * 2, 2 + rand() * 4], 0.6, _m), _c.copy(IMP.hullDark).lerp(IMP.hullMid, rand() * 0.4));
    else if (k < 0.6) tiers.near.placeM("pipeZ", surfaceMatrix(-1, x, z, rand() < 0.7 ? 0 : Math.PI / 2, [1, 1, 6 + rand() * 20], 0.6, _m), IMP.hullDark);
    else if (k < 0.8) tiers.near.placeM("hatch", surfaceMatrix(-1, x, z, rand() * 3, [1.2 + rand(), 1, 1.2 + rand()], 0.6, _m), IMP.hullDark);
    else tiers.near.placeM("vent", surfaceMatrix(-1, x, z, 0, [2 + rand() * 2, 1.2, 2 + rand() * 2], 0.6, _m), IMP.hullShadow);
  }
  // ---- wells: shaft walls, lit rim, strip lights (kept from the first pass, thickened)
  for (const b of Object.values(BAYS)) {
    kit.boxMM("hullDark", [b.x0 - 3, b.bellyY - 1, b.z0 - 3], [b.x0, b.deckY, b.z1 + 3], { color: IMP.hullShadow, texel: 1 / 8 });
    kit.boxMM("hullDark", [b.x1, b.bellyY - 1, b.z0 - 3], [b.x1 + 3, b.deckY, b.z1 + 3], { color: IMP.hullShadow, texel: 1 / 8 });
    kit.boxMM("hullDark", [b.x0 - 3, b.bellyY - 1, b.z0 - 3], [b.x1 + 3, b.deckY, b.z0], { color: IMP.hullShadow, texel: 1 / 8 });
    kit.boxMM("hullDark", [b.x0 - 3, b.bellyY - 1, b.z1], [b.x1 + 3, b.deckY, b.z1 + 3], { color: IMP.hullShadow, texel: 1 / 8 });
    // mouth frame: a wide bevelled collar around the opening
    kit.boxMM("hull", [b.x0 - 6, b.bellyY - 1.6, b.z0 - 6], [b.x0 - 3, b.bellyY - 0.9, b.z1 + 6], { color: IMP.hullMid, texel: 1 / 10 });
    kit.boxMM("hull", [b.x1 + 3, b.bellyY - 1.6, b.z0 - 6], [b.x1 + 6, b.bellyY - 0.9, b.z1 + 6], { color: IMP.hullMid, texel: 1 / 10 });
    kit.boxMM("hull", [b.x0 - 6, b.bellyY - 1.6, b.z0 - 6], [b.x1 + 6, b.bellyY - 0.9, b.z0 - 3], { color: IMP.hullMid, texel: 1 / 10 });
    kit.boxMM("hull", [b.x0 - 6, b.bellyY - 1.6, b.z1 + 3], [b.x1 + 6, b.bellyY - 0.9, b.z1 + 6], { color: IMP.hullMid, texel: 1 / 10 });
    for (const [x0, x1, z0, z1] of [
      [b.x0 - 3.2, b.x0 - 2.4, b.z0 - 3, b.z1 + 3],
      [b.x1 + 2.4, b.x1 + 3.2, b.z0 - 3, b.z1 + 3],
      [b.x0 - 3, b.x1 + 3, b.z0 - 3.2, b.z0 - 2.4],
      [b.x0 - 3, b.x1 + 3, b.z1 + 2.4, b.z1 + 3.2],
    ]) {
      kit.boxMM("emitBay", [x0, b.bellyY - 1.9, z0], [x1, b.bellyY - 1.5, z1]);
    }
    for (let y = b.bellyY + 4; y < b.deckY - 2; y += 6) {
      kit.boxMM("emitWin", [b.x0 - 0.05, y, b.z0 + 2], [b.x0 + 0.1, y + 0.4, b.z1 - 2]);
      kit.boxMM("emitWin", [b.x1 - 0.1, y, b.z0 + 2], [b.x1 + 0.05, y + 0.4, b.z1 - 2]);
    }
    // guidance lights + machinery clusters around the mouth
    for (let z = b.z0 - 2; z <= b.z1 + 2; z += 8) {
      for (const x of [b.x0 - 8, b.x1 + 8]) {
        tiers.mid.place("portLight", { pos: [x, b.bellyY - 0.6, z], rot: [Math.PI / 2, 0, 0], scale: [1.2, 1, 1] });
      }
    }
    for (let i = 0; i < 16; i++) {
      const side = rand() < 0.5 ? -1 : 1;
      const x = side > 0 ? b.x1 + 7 + rand() * 12 : b.x0 - 7 - rand() * 12;
      const z = b.z0 - 4 + rand() * (b.z1 - b.z0 + 8);
      if (x < B.x0 + 2 || x > B.x1 - 2) continue;
      tiers.near.placeM(rand() < 0.6 ? "boxDark" : "tank", surfaceMatrix(-1, x, z, rand() < 0.5 ? 0 : Math.PI / 2, [1.5 + rand() * 3, 1 + rand() * 2, 2 + rand() * 5], 0.7, _m), _c.copy(IMP.hullDark).lerp(IMP.hullMid, rand() * 0.5));
    }
  }
  // ---- docking ports on the plate (ring, dark disc, four lights)
  for (const [x, z] of [
    [-42, -96],
    [42, -96],
    [-44, 186],
    [44, 186],
  ]) {
    tiers.base.placeM("ring", surfaceMatrix(-1, x, z, 0, [4, 1.2, 4], 0.4, _m), IMP.hullLight);
    tiers.mid.placeM("slabDark", surfaceMatrix(-1, x, z, 0, [7, 0.4, 7], 0.2, _m), IMP.hullShadow);
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2;
      tiers.mid.place("portLight", { pos: [x + Math.cos(a) * 5.5, B.y - 0.7, z + Math.sin(a) * 5.5], rot: [Math.PI / 2, 0, 0] });
    }
  }
  // ---- ribs where the plate blends into the hull (perimeter, angled)
  const m = B.margin;
  for (let z = B.z0 + 6; z < B.z1 - 4; z += 14) {
    for (const side of [-1, 1]) {
      const xIn = side * (B.x1 + 1);
      const xOut = side * (B.x1 + m - 1);
      const yIn = B.y;
      const yOut = ventralY(xOut, z) + 0.2;
      const len = Math.hypot(xOut - xIn, yOut - yIn);
      const ang = Math.atan2(yOut - yIn, xOut - xIn);
      tiers.mid.place("box", { pos: [(xIn + xOut) / 2, (yIn + yOut) / 2 - 0.9, z], rot: [0, 0, ang], scale: [len, 1.8, 2.4], color: IMP.hullDark });
    }
  }
  for (let x = B.x0 + 6; x < B.x1 - 4; x += 14) {
    for (const side of [-1, 1]) {
      const zIn = side > 0 ? B.z1 + 1 : B.z0 - 1;
      const zOut = side > 0 ? B.z1 + m - 1 : B.z0 - m + 1;
      const yIn = B.y;
      const yOut = ventralY(x, zOut) + 0.2;
      const len = Math.hypot(zOut - zIn, yOut - yIn);
      const ang = -Math.atan2(yOut - yIn, zOut - zIn);
      tiers.mid.place("box", { pos: [x, (yIn + yOut) / 2 - 0.9, (zIn + zOut) / 2], rot: [ang, 0, 0], scale: [2.4, 1.8, len], color: IMP.hullDark });
    }
  }

  // ---- reactor bulb
  {
    const R = REACTOR_BULB;
    const bulbColor = weather(_c.copy(IMP.hullMid).lerp(IMP.hullLight, 0.08), 0, R.z, -100).clone();
    kit.add("hull", new THREE.SphereGeometry(R.r, 56, 36), { pos: [R.x, R.y, R.z], color: bulbColor, uv: "scale", uvScale: [14, 7] });
    // collar at the hull line, latitude rings, meridians, bottom cap
    const yHull = ventralY(R.x, R.z) - 0.8;
    const rc = Math.sqrt(Math.max(1, R.r * R.r - (R.y - yHull) * (R.y - yHull)));
    kit.add("hullDark", new THREE.TorusGeometry(rc + 1.0, 3.2, 10, 72), { pos: [R.x, yHull - 0.4, R.z], rot: [Math.PI / 2, 0, 0], color: IMP.hullDark, uv: "scale", uvScale: [40, 1] });
    for (const dy of [-22, -46, -66]) {
      const rr = Math.sqrt(R.r * R.r - dy * dy) + 0.2;
      kit.add("hullDark", new THREE.TorusGeometry(rr, 0.7, 6, 72), { pos: [R.x, R.y + dy, R.z], rot: [Math.PI / 2, 0, 0], color: IMP.hullDark, uv: "scale", uvScale: [40, 1] });
    }
    for (let k = 0; k < 6; k++) {
      // one arc = a full meridian across the bottom pole (−171° … −9°), six of them every 30°
      const arc = new THREE.TorusGeometry(R.r + 0.2, 0.6, 6, 48, Math.PI * 0.9);
      arc.rotateZ(-Math.PI * 0.95);
      kit.add("hullDark", arc, { pos: [R.x, R.y, R.z], rot: [0, (k / 6) * Math.PI, 0], color: IMP.hullDark, uv: "scale", uvScale: [40, 1] });
    }
    kit.add("hull", new THREE.CylinderGeometry(9, 12, 5, 24), { pos: [R.x, R.y - R.r + 1.5, R.z], color: IMP.hullMid, uv: "scale", uvScale: [8, 1] });
    kit.add("hullDark", new THREE.SphereGeometry(6, 16, 10), { pos: [R.x, R.y - R.r - 0.5, R.z], color: IMP.hullDark, uv: "scale", uvScale: [4, 2] });
    // struts from the hull down onto the bulb shoulder
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + Math.PI / 8;
      const r0 = rc + 26;
      const x0 = R.x + Math.cos(a) * r0;
      const z0 = R.z + Math.sin(a) * r0;
      const y0 = ventralY(x0, z0) - 0.5;
      const lat = -0.55;
      const x1 = R.x + Math.cos(a) * R.r * Math.cos(lat) * 0.98;
      const z1 = R.z + Math.sin(a) * R.r * Math.cos(lat) * 0.98;
      const y1 = R.y + Math.sin(lat) * R.r * 0.98;
      const from = new THREE.Vector3(x0, y0, z0);
      const to = new THREE.Vector3(x1, y1, z1);
      const len = from.distanceTo(to);
      const mid = from.clone().lerp(to, 0.5);
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize());
      kit.add("hullDark", new THREE.BoxGeometry(3.2, len, 4.5), { pos: mid.toArray(), quat: q, color: IMP.hullDark, uv: "world", texel: 1 / 8 });
    }
    // hatches / boxes on the bulb surface (oriented by the sphere normal)
    for (let i = 0; i < 70; i++) {
      const a = rand() * Math.PI * 2;
      const lat = -1.35 + rand() * 1.0; // lower hemisphere
      const nx = Math.cos(a) * Math.cos(lat);
      const ny = Math.sin(lat);
      const nz = Math.sin(a) * Math.cos(lat);
      const px = R.x + nx * R.r;
      const py = R.y + ny * R.r;
      const pz = R.z + nz * R.r;
      if (py > yHull - 3) continue;
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(nx, ny, nz));
      const k = rand();
      if (k < 0.4) tiers.near.place("hatch", { pos: [px, py, pz], quat: q, scale: [1.5 + rand() * 2, 1, 1.5 + rand() * 2], color: IMP.hullDark });
      else if (k < 0.7) tiers.mid.place("slab", { pos: [px, py, pz], quat: q, scale: [4 + rand() * 8, 0.5, 4 + rand() * 8], color: _c.copy(bulbColor).lerp(rand() < 0.5 ? IMP.hullLight : IMP.hullDark, 0.2) });
      else if (k < 0.85) tiers.near.place("vent", { pos: [px, py, pz], quat: q, scale: [2 + rand() * 2, 1, 2 + rand() * 2], color: IMP.hullShadow });
      else tiers.near.place("boxDark", { pos: [px, py, pz], quat: q, scale: [2 + rand() * 3, 1 + rand() * 2, 2 + rand() * 3], color: IMP.hullDark });
    }
  }

  // ---- containment fields (animated shader) at the belly line of both wells
  const fields = [];
  for (const b of Object.values(BAYS)) {
    const f = new THREE.Mesh(new THREE.PlaneGeometry(b.x1 - b.x0, b.z1 - b.z0), materials.field);
    f.rotation.x = -Math.PI / 2;
    f.position.set((b.x0 + b.x1) / 2, b.bellyY - 0.5, (b.z0 + b.z1) / 2);
    f.renderOrder = 5;
    fields.push(f);
  }
  void blocked;
  return { fields };
}
