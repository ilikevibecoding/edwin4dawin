// Emergency Escape Pods — white/green accent. Eight launch-tube hatches along the aft wall (circular doors with
// radial seams and locking dogs inside a steel collar, hazard ring, status/countdown panel beside each, launch
// indicator strip and pod code overhead); two tubes stand empty and open after launch. A green evacuation route
// runs from the blast door to a ringed muster point with the Imperial emblem and on to every hatch, with white
// route arrows. Vac-suit lockers (some open with suits hanging inside), oxygen bottle racks, emergency supply
// cabinets and evac-kit pallets line the side walls; a pod status board and life-support terminals sit by the
// door; two octagonal columns with light slots flank the muster point. Green emergency strips overhead, white
// key lights in the hall, green practicals along the pod row and a shadow spot on the muster ring.
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { IMP } from "../../core/palette.js";
import { Placer, consoleStation, computerBank, wallPanel, pillar, crate, pipeRun } from "../../core/props.js";
import { DECAL, decalRect, screenRect, ledRect } from "../../textures.js";

export const meta = { id: "escape_pods", stream: "crew-rooms" };

const B = (sx, sy, sz, x = 0, y = 0, z = 0) => new THREE.BoxGeometry(sx, sy, sz).translate(x, y, z);
function CZ(r, len, z, seg = 32, open = false) {
  return new THREE.CylinderGeometry(r, r, len, seg, 1, open).rotateX(Math.PI / 2).translate(0, 0, z);
}
const RING = (r0, r1, z, seg = 40) => new THREE.RingGeometry(r0, r1, seg).translate(0, 0, z);
/** Mirror a geometry so its inside faces render (and point the normals inward). */
function inside(g) {
  g.scale(-1, 1, 1);
  const n = g.attributes.normal;
  for (let i = 0; i < n.count; i++) n.setXYZ(i, -n.getX(i), -n.getY(i), -n.getZ(i));
  return g;
}
// kit.proto strips the colour attribute while the shared materials use vertex colours (instances would read
// black): give every prototype a white colour attribute so the per-instance tint multiplies correctly.
function proto(kit, name, mat, geos, opts = {}) {
  kit.proto(name, mat, Array.isArray(geos) ? mergeGeometries(geos, false) : geos, opts);
  const g = kit.protos.get(name).geo;
  g.setAttribute("color", new THREE.BufferAttribute(new Uint8Array(g.attributes.position.count * 3).fill(255), 3, true));
}

const WHITE = new THREE.Color("#d9dee6");
const STEEL_LIGHT = new THREE.Color("#b4bac2");
const RED_BOTTLE = new THREE.Color("#b8352c");
const GREEN_LIGHT = 0x6cff9c;
const PLANE = (w, h) => new THREE.PlaneGeometry(w, h);
const FLAT = (yaw = 0) => [-Math.PI / 2, 0, yaw]; // floor decal rotation; yaw π/2 points the arrow toward -Z

export function build(ctx) {
  const { kit, floor: F, ceil } = ctx;
  const { x0, x1, z0, z1 } = ctx.inner; // 8.25..61.75, -205.75..-178.25
  const DX = 34.5; // blast door centre line
  const MZ = -190.0; // muster point
  // white key lights: a pair over the entry equipment either side of the door, a pair over the locker walls
  const KEY_LIGHTS = [[24.0, -183.5], [45.0, -183.5], [12.5, -191.5], [56.5, -191.5]];
  const rand = ctx.rand;
  const black = { color: IMP.black, texel: 1 };

  // pods: eight tubes along the aft wall; two have launched (open tubes)
  const PODS = [];
  for (let i = 0; i < 8; i++) PODS.push({ x: 12.0 + i * 6.5, launched: i === 2 || i === 5 });
  const tubeOpenings = PODS.filter((p) => p.launched).map((p) => ({ type: "arch", u0: p.x - 1.3 - x0, u1: p.x + 1.3 - x0, v0: 0.3, v1: 2.95 }));

  ctx.shell({ floorMat: "deckGrey", floorColor: IMP.plateDark, stripSpacing: 5.5, seed: 91, ceiling: { stripMat: "emitGreen" }, walls: { zmin: { openings: tubeOpenings } }, wallStyles: { plate: 0.72, panel: 0.12, vent: 0.08, hatch: 0.08 } });

  // lighter boarding strip along the pod row with a hazard border
  kit.boxMM("deckGrey", [x0 + 0.2, F + 0.002, z0 + 0.2], [x1 - 0.2, F + 0.014, z0 + 3.6], { color: IMP.plate, texel: 0.5 });
  kit.boxMM("hazard", [x0 + 0.2, F + 0.015, z0 + 3.45], [x1 - 0.2, F + 0.021, z0 + 3.6], { texel: 3 });

  // ---- prototypes: hatch door assembly -------------------------------------------------------------------
  proto(kit, "hatch_door", "plate", CZ(1.2, 0.12, 0.06, 40), { texel: 1 });
  {
    const seams = [];
    for (let k = 0; k < 8; k++) {
      const a = (k * Math.PI) / 4;
      seams.push(B(0.03, 1.0, 0.02, 0, 0.65, 0.13).applyMatrix4(new THREE.Matrix4().makeRotationZ(a)));
    }
    proto(kit, "hatch_seam", "paintedMetal", seams, { texel: 1 });
  }
  {
    const dogs = [];
    for (let k = 0; k < 4; k++) {
      const a = Math.PI / 4 + (k * Math.PI) / 2;
      dogs.push(B(0.14, 0.22, 0.05, 0, 1.08, 0.145).applyMatrix4(new THREE.Matrix4().makeRotationZ(a)));
    }
    proto(kit, "hatch_hub", "metal", [CZ(0.3, 0.08, 0.16, 24), CZ(0.12, 0.04, 0.22, 12), ...dogs], { texel: 2 });
  }
  proto(kit, "hatch_ring", "emitGreen", RING(1.2, 1.27, 0.125), { uv: "keep" });
  proto(kit, "hatch_ring_red", "emitRed", RING(1.2, 1.27, 0.125), { uv: "keep" });
  // collar: outer barrel in front of the face plate, inside-faced inner barrel back to the wall plane, front ring
  proto(kit, "collar", "metal", [CZ(1.32, 0.5, 0.25, 40, true), inside(CZ(1.28, 1.4, -0.2, 40, true)), RING(1.28, 1.32, 0.5, 40)], { texel: 1 });
  proto(kit, "collar_lip", "paintedMetal", RING(1.32, 1.46, 0.5, 40), { texel: 1 });
  proto(kit, "hatch_hazard", "hazard", RING(1.34, 1.62, 0.005, 40), { texel: 3 });
  // housing face plate: 3.3 x 3.5 plate with a round cut-out for the collar (hatch centre 1.6 m up)
  {
    const shape = new THREE.Shape();
    shape.moveTo(-1.65, -1.6);
    shape.lineTo(1.65, -1.6);
    shape.lineTo(1.65, 1.9);
    shape.lineTo(-1.65, 1.9);
    shape.closePath();
    const hole = new THREE.Path();
    hole.absarc(0, 0, 1.32, 0, Math.PI * 2, true);
    shape.holes.push(hole);
    proto(kit, "hatch_face", "plate", new THREE.ShapeGeometry(shape, 40), { texel: 1 });
  }
  // vac-suit (for the open lockers): torso, helmet, arms, legs, boots — faces +Z
  proto(kit, "suit", "fabric", [B(0.42, 0.62, 0.26, 0, 1.45, 0), B(0.12, 0.56, 0.14, -0.29, 1.4, 0), B(0.12, 0.56, 0.14, 0.29, 1.4, 0), B(0.17, 0.72, 0.2, -0.11, 0.78, 0), B(0.17, 0.72, 0.2, 0.11, 0.78, 0), B(0.18, 0.14, 0.28, -0.11, 0.35, 0.03), B(0.18, 0.14, 0.28, 0.11, 0.35, 0.03)], { texel: 2 });
  proto(kit, "suit_helmet", "plate", [new THREE.SphereGeometry(0.17, 14, 10).translate(0, 1.93, 0), B(0.3, 0.1, 0.16, 0, 1.55, -0.08)], { texel: 3 });
  proto(kit, "suit_visor", "darkGloss", B(0.22, 0.1, 0.06, 0, 1.94, 0.15), { texel: 3 });
  proto(kit, "suit_led", "emitGreen", B(0.08, 0.03, 0.01, 0.1, 1.6, 0.135), { uv: "keep" });
  // oxygen bottle
  proto(kit, "o2", "metal", [new THREE.CylinderGeometry(0.09, 0.09, 0.62, 12).translate(0, 0.31, 0), new THREE.CylinderGeometry(0.04, 0.04, 0.08, 8).translate(0, 0.66, 0)], { texel: 2 });
  proto(kit, "o2_cap", "emitGreen", new THREE.CylinderGeometry(0.045, 0.045, 0.02, 8).translate(0, 0.71, 0), { uv: "keep" });

  // ---- pod hatches along the aft wall -------------------------------------------------------------------
  const zmin = ctx.wall("zmin").frame; // u = x - x0
  const HY = F + 1.6; // hatch centre height
  PODS.forEach((p, i) => {
    const px = p.x;
    const zf = z0 + 0.9; // housing front face
    // housing: hollow black frame (sides, head, plinth) with the plated face plate and its round cut-out set just
    // behind the frame fronts, so the launched tubes read straight through the collar; angular cap on top
    kit.box("paintedMetal", px - 1.6, F + 1.75, z0 + 0.45, 0.1, 3.5, 0.9, black);
    kit.box("paintedMetal", px + 1.6, F + 1.75, z0 + 0.45, 0.1, 3.5, 0.9, black);
    kit.box("paintedMetal", px, F + 3.45, z0 + 0.45, 3.3, 0.1, 0.9, black);
    kit.box("paintedMetal", px, F + 0.19, z0 + 0.45, 3.3, 0.38, 0.9, black);
    kit.place("hatch_face", { pos: [px, HY, zf - 0.012], color: IMP.plateDark });
    kit.box("paintedMetal", px, F + 3.55, z0 + 0.4, 3.5, 0.14, 0.86, { color: IMP.trim, texel: 1 });
    kit.collider([px - 1.65, F, z0], [px + 1.65, F + 3.6, zf + 0.5], "pod");
    // collar + rings
    kit.place("collar", { pos: [px, HY, zf], color: IMP.steelDark });
    kit.place("collar_lip", { pos: [px, HY, zf], color: IMP.black });
    kit.place("hatch_hazard", { pos: [px, HY, zf] });
    if (!p.launched) {
      kit.place("hatch_door", { pos: [px, HY, zf], color: WHITE });
      kit.place("hatch_seam", { pos: [px, HY, zf], color: IMP.black });
      kit.place("hatch_hub", { pos: [px, HY, zf], color: IMP.steel });
      kit.place("hatch_ring", { pos: [px, HY, zf] });
    } else {
      // empty launch tube receding through the wall: inside-faced barrel, ribs, glowing end cap
      kit.place("hatch_ring_red", { pos: [px, HY, zf] });
      kit.add("plate", inside(CZ(1.19, 3.6, 0, 32, true)), { pos: [px, HY, zf - 1.7], color: IMP.plateDark, uv: "world", texel: 1 });
      for (const dz of [-0.45, -1.15, -1.85, -2.55, -3.2]) kit.add("paintedMetal", RING(1.06, 1.2, 0, 32), { pos: [px, HY, zf + dz], color: IMP.trim, texel: 1 });
      // guide-light strips down the barrel between the ribs
      for (let k = 0; k < 4; k++) {
        const a = Math.PI / 4 + (k * Math.PI) / 2;
        kit.add("emitRed", B(0.04, 0.02, 3.3, 0, 1.1, 0).applyMatrix4(new THREE.Matrix4().makeRotationZ(a)), { pos: [px, HY, zf - 1.75], uv: "keep" });
      }
      kit.add("paintedMetal", CZ(1.19, 0.04, 0, 32), { pos: [px, HY, zf - 3.5], color: IMP.black, texel: 1 });
      kit.add("emitRed", RING(0.9, 1.05, 0, 32), { pos: [px, HY, zf - 3.45], uv: "keep" });
      kit.add("emitRed", RING(0.4, 0.5, 0, 24), { pos: [px, HY, zf - 3.45], uv: "keep" });
    }
    // status / countdown panel on the wall to the right of the housing
    const u = px + 2.25 - x0;
    zmin.box("paintedMetal", u, 1.9, 0.06, 0.8, 1.5, 0.12, black);
    zmin.box("darkGloss", u, 1.9, 0.125, 0.7, 1.4, 0.01);
    zmin.box("screen", u, 2.3, 0.132, 0.56, 0.36, 0.005, { uv: "keep", uvRect: screenRect(p.launched ? 5 : 6) });
    zmin.box("leds", u, 1.86, 0.132, 0.56, 0.1, 0.005, { uv: "keep", uvRect: ledRect(p.launched ? 10 : 12) });
    zmin.box(p.launched ? "emitRed" : "emitGreen", u - 0.22, 1.55, 0.132, 0.1, 0.1, 0.005);
    zmin.box(p.launched ? "emitRed" : "emitGreen", u, 1.55, 0.132, 0.1, 0.1, 0.005);
    zmin.box(p.launched ? "emitRed" : "emitWhiteSoft", u + 0.22, 1.55, 0.132, 0.1, 0.1, 0.005, { uv: "keep" });
    zmin.decal(u, 1.3, 0.132, 0.34, 0.34, p.launched ? DECAL.WARNING : DECAL.SPEC_PLATE);
    // launch indicator strip + pod code overhead
    const uc = px - x0;
    zmin.box("paintedMetal", uc, 3.85, 0.15, 2.8, 0.3, 0.3, black);
    zmin.box(p.launched ? "emitRed" : "emitGreen", uc, 3.85, 0.305, 2.4, 0.08, 0.01);
    zmin.box("leds", uc, 3.72, 0.305, 1.4, 0.05, 0.005, { uv: "keep", uvRect: ledRect(p.launched ? 10 : 14) });
    zmin.decal(uc - 0.3, 4.2, 0.06, 0.5, 0.5, DECAL.NUMBER0 + Math.floor(i / 4));
    zmin.decal(uc + 0.3, 4.2, 0.06, 0.5, 0.5, DECAL.NUMBER0 + (i % 4));
    // boarding mark: dark pad with a route arrow into the hatch
    kit.boxMM("deckBlack", [px - 1.3, F + 0.016, z0 + 1.45], [px + 1.3, F + 0.024, z0 + 3.4], { color: IMP.darkMetal, texel: 0.5 });
    kit.add("decal", PLANE(1.1, 1.1), { pos: [px, F + 0.03, z0 + 2.5], rot: FLAT(Math.PI / 2), uv: "keep", uvRect: decalRect(DECAL.ARROW) });
    if (p.launched) {
      kit.boxMM("hazardRed", [px - 1.3, F + 0.025, z0 + 1.45], [px + 1.3, F + 0.031, z0 + 1.6], { texel: 3 });
      kit.boxMM("hazardRed", [px - 1.3, F + 0.025, z0 + 3.25], [px + 1.3, F + 0.031, z0 + 3.4], { texel: 3 });
    }
  });
  // green practical housings along the pod row (under the three green points)
  for (const lx of [15.25, 34.75, 54.25]) {
    kit.box("paintedMetal", lx, ceil - 0.12, z0 + 3.4, 2.2, 0.24, 0.5, black);
    kit.box("emitGreen", lx, ceil - 0.245, z0 + 3.4, 2.0, 0.01, 0.34, { uv: "keep" });
  }
  // services over the pod row: conduits feeding the tubes
  pipeRun(kit, { points: [[x0 + 0.6, ceil - 0.45, z0 + 1.9], [x1 - 0.6, ceil - 0.45, z0 + 1.9]], r: 0.1, clamps: 3.25, color: IMP.steelDark });
  pipeRun(kit, { points: [[x0 + 0.6, ceil - 0.7, z0 + 1.9], [x1 - 0.6, ceil - 0.7, z0 + 1.9]], r: 0.06, clamps: 3.25, color: IMP.gunmetal });
  for (const p of PODS) kit.cyl("metal", p.x, ceil - 0.45 - 0.35, z0 + 1.9, 0.06, 0.9, "y", { color: IMP.steelDark, segments: 8 });

  // ---- evacuation route: green lane lines, white arrows, ringed muster point ------------------------------
  const lane = (ax, az, bx, bz) => kit.boxMM("emitGreen", [Math.min(ax, bx) - 0.04, F + 0.004, Math.min(az, bz) - 0.04], [Math.max(ax, bx) + 0.04, F + 0.012, Math.max(az, bz) + 0.04], {});
  const arrow = (x, z, yaw) => kit.add("decal", PLANE(1.0, 1.0), { pos: [x, F + 0.02, z], rot: FLAT(yaw), uv: "keep", uvRect: decalRect(DECAL.ARROW) });
  const RZ = -202.1; // route line along the pod row
  lane(DX, z1 - 2.4, DX, MZ + 4.1);
  lane(DX, MZ - 4.1, DX, RZ);
  lane(PODS[0].x, RZ, PODS[7].x, RZ);
  for (const p of PODS) lane(p.x, RZ, p.x, z0 + 3.6);
  arrow(DX, -182.6, Math.PI / 2);
  arrow(DX, -184.6, Math.PI / 2);
  arrow(DX, -196.0, Math.PI / 2);
  arrow(DX, -199.5, Math.PI / 2);
  for (const x of [32.0, 27.5, 21.5, 15.0]) arrow(x, RZ + 0.7, Math.PI);
  for (const x of [37.0, 41.5, 47.5, 54.0]) arrow(x, RZ + 0.7, 0);
  {
    const R = new Placer(kit, [DX, F, MZ], 0);
    kit.add("emitGreen", RING(3.85, 4.0, 0, 72), { pos: [DX, F + 0.005, MZ], rot: FLAT(), uv: "keep" });
    kit.add("emitWhiteSoft", RING(1.35, 1.45, 0, 48), { pos: [DX, F + 0.005, MZ], rot: FLAT(), uv: "keep" });
    kit.add("decal", PLANE(2.3, 2.3), { pos: [DX, F + 0.014, MZ], rot: FLAT(), uv: "keep", uvRect: decalRect(DECAL.EMBLEM) });
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + Math.PI / 8;
      const mx = Math.cos(a) * 2.75;
      const mz = Math.sin(a) * 2.75;
      R.box("hazard", mx, 0.006, mz, 0.6, 0.006, 0.08, { texel: 3, rot: [0, -a, 0] });
      R.box("hazard", mx, 0.006, mz, 0.08, 0.006, 0.6, { texel: 3, rot: [0, -a, 0] });
    }
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2;
      R.decal(Math.cos(a) * 3.3, 0.014, Math.sin(a) * 3.3, 0.5, 0.5, DECAL.NUMBER0 + k, { rot: FLAT(-a - Math.PI / 2) });
    }
  }
  // columns with light slots flanking the muster point, evac-kit pallets at their feet
  for (const [cx, s] of [[21.5, 1], [47.5, -1]]) {
    pillar(kit, { pos: [cx, F, MZ], h: ctx.h, w: 0.9, slot: true, color: IMP.plateDark });
    kit.box("paintedMetal", cx, F + 2.7, MZ + s * 0.51, 0.5, 0.3, 0.06, { ...black, rot: [0, 0, 0] });
    kit.box("emitGreen", cx, F + 2.7, MZ + s * 0.545, 0.4, 0.06, 0.01, {});
    kit.add("decal", PLANE(0.5, 0.5), { pos: [cx, F + 2.25, MZ + s * 0.46], rot: [0, s > 0 ? 0 : Math.PI, 0], uv: "keep", uvRect: decalRect(DECAL.ARROW) });
    const kx = cx - s * 1.6;
    kit.box("paintedMetal", kx, F + 0.07, MZ + 1.4, 1.5, 0.14, 1.2, { color: IMP.trim, texel: 1 });
    crate(kit, { pos: [kx - 0.3, F + 0.14, MZ + 1.4], yaw: 0.08, size: [0.8, 0.6, 0.9], band: false, decal: DECAL.WARNING, color: WHITE });
    crate(kit, { pos: [kx + 0.45, F + 0.14, MZ + 1.35], yaw: -0.12, size: [0.6, 0.5, 0.8], band: false, decal: DECAL.TEXT_C, color: WHITE });
    crate(kit, { pos: [kx - 0.2, F + 0.74, MZ + 1.45], yaw: 0.2, size: [0.7, 0.45, 0.7], band: true, decal: DECAL.HAZARD_BAND, color: IMP.plateLight });
    kit.collider([kx - 0.8, F, MZ + 0.8], [kx + 0.8, F + 1.3, MZ + 2.0], "pallet");
  }
  // squad assembly boxes either side of the ring (thin green outlines with a squad number)
  for (const [bx, bz, n] of [[DX - 7.5, MZ - 2.6, 0], [DX - 7.5, MZ + 2.6, 1], [DX + 7.5, MZ - 2.6, 2], [DX + 7.5, MZ + 2.6, 3]]) {
    const hw = 1.9;
    const hd = 1.5;
    lane(bx - hw, bz - hd, bx + hw, bz - hd);
    lane(bx - hw, bz + hd, bx + hw, bz + hd);
    lane(bx - hw, bz - hd, bx - hw, bz + hd);
    lane(bx + hw, bz - hd, bx + hw, bz + hd);
    kit.add("decal", PLANE(0.6, 0.6), { pos: [bx, F + 0.014, bz], rot: FLAT(bx < DX ? -Math.PI / 2 : Math.PI / 2), uv: "keep", uvRect: decalRect(DECAL.NUMBER0 + n) });
  }
  // free-standing emergency equipment pylons facing the route: screen, indicator row, extinguishers in brackets
  function evacPylon(x, z, yaw) {
    const P = new Placer(kit, [x, F, z], yaw);
    P.box("paintedMetal", 0, 0.95, 0, 0.7, 1.9, 0.7, black);
    P.box("plate", 0, 1.05, 0.355, 0.6, 1.5, 0.02, { color: IMP.plateDark, uv: "world", texel: 1 });
    P.box("emitGreen", 0, 1.93, 0, 0.74, 0.06, 0.74, {});
    P.box("paintedMetal", 0, 2.02, 0, 0.6, 0.12, 0.6, black);
    P.box("screen", 0, 1.5, 0.372, 0.46, 0.3, 0.005, { uv: "keep", uvRect: screenRect(6) });
    P.box("leds", 0, 1.24, 0.372, 0.46, 0.06, 0.005, { uv: "keep", uvRect: ledRect(12) });
    P.decal(0, 0.8, 0.372, 0.4, 0.4, DECAL.TEXT_A);
    P.box("hazard", 0, 0.15, 0, 0.74, 0.1, 0.74, { texel: 3 });
    P.box("plate", 0, 1.2, -0.355, 0.6, 1.2, 0.02, { color: IMP.plateDark, uv: "world", texel: 1 });
    P.decal(0, 1.35, -0.372, 0.44, 0.44, DECAL.EMBLEM, { rot: [0, Math.PI, 0] });
    P.box("emitGreen", 0, 0.75, -0.37, 0.4, 0.03, 0.01, {});
    for (const s of [-1, 1]) {
      const p = P.world(s * 0.46, 0.12, 0);
      kit.place("o2", { pos: [p.x, p.y, p.z], color: RED_BOTTLE });
      kit.place("o2_cap", { pos: [p.x, p.y, p.z] });
      P.box("metal", s * 0.4, 0.55, 0, 0.12, 0.04, 0.24, { color: IMP.steel });
      P.box("metal", s * 0.4, 0.25, 0, 0.12, 0.04, 0.24, { color: IMP.steel });
    }
    P.collider([-0.62, 0, -0.4], [0.62, 2.1, 0.4], "pylon");
  }
  evacPylon(DX - 8.5, -184.5, Math.PI / 2);
  evacPylon(DX + 8.5, -184.5, -Math.PI / 2);
  // hanging evacuation signs over the route and the pod row: double-sided boards with arrows and green edges
  // the ARROW decal points +X in texture space; the back face is turned about Y, which mirrors X
  function evacSign(x, z, split) {
    const S = new Placer(kit, [x, ceil - 0.95, z], 0);
    S.box("paintedMetal", 0, 0, 0, 2.4, 0.6, 0.12, black);
    S.box("emitGreen", 0, 0.33, 0, 2.4, 0.04, 0.12, {});
    S.box("emitGreen", 0, -0.33, 0, 2.4, 0.04, 0.12, {});
    for (const s of [-1, 1]) {
      const flip = s > 0 ? 0 : Math.PI;
      S.box("darkGloss", 0, 0, s * 0.065, 2.2, 0.46, 0.01);
      S.decal(0, 0, s * 0.072, 0.44, 0.44, DECAL.EMBLEM, { rot: [0, flip, 0] });
      if (split) {
        S.decal(0.7, 0, s * 0.072, 0.44, 0.44, DECAL.ARROW, { rot: [0, flip, s > 0 ? 0 : Math.PI] });
        S.decal(-0.7, 0, s * 0.072, 0.44, 0.44, DECAL.ARROW, { rot: [0, flip, s > 0 ? Math.PI : 0] });
      } else {
        S.decal(0.7, 0, s * 0.072, 0.44, 0.44, DECAL.ARROW, { rot: [0, flip, Math.PI / 2] });
        S.decal(-0.7, 0, s * 0.072, 0.44, 0.44, DECAL.TEXT_A, { rot: [0, flip, 0] });
      }
    }
    for (const dx of [-0.9, 0.9]) S.box("metal", dx, 0.65, 0, 0.04, 0.7, 0.04, { color: IMP.steelDark });
  }
  evacSign(DX, -185.0, false);
  evacSign(21.5, -199.0, true);
  evacSign(47.5, -199.0, true);

  // ---- entry wall: status board, life-support bank, stencils -----------------------------------------------
  const zmax = ctx.wall("zmax").frame; // u = x1 - x
  {
    zmax.decal(x1 - DX, 3.85, 0.07, 1.0, 1.0, DECAL.EMBLEM);
    zmax.decal(x1 - (DX - 2.7), 3.45, 0.07, 0.7, 0.7, DECAL.WARNING);
    zmax.decal(x1 - (DX + 2.7), 3.45, 0.07, 0.7, 0.7, DECAL.TEXT_A);
    // pod status board: traffic-board listing + status bars + one indicator per pod
    const bu = x1 - 40.5;
    zmax.box("paintedMetal", bu, 2.45, 0.05, 4.4, 2.3, 0.1, black);
    zmax.box("darkGloss", bu, 2.45, 0.105, 4.2, 2.1, 0.01);
    zmax.box("screen", bu - 1.0, 2.75, 0.112, 2.0, 1.3, 0.005, { uv: "keep", uvRect: screenRect(7) });
    zmax.box("screen", bu + 1.1, 2.75, 0.112, 1.8, 1.3, 0.005, { uv: "keep", uvRect: screenRect(3) });
    for (let i = 0; i < 8; i++) {
      const iu = bu - 1.75 + i * 0.5;
      zmax.box(PODS[i].launched ? "emitRed" : "emitGreen", iu, 1.75, 0.112, 0.16, 0.16, 0.005);
      zmax.decal(iu, 1.5, 0.112, 0.22, 0.22, DECAL.NUMBER0 + (i % 4));
    }
    zmax.box("leds", bu + 1.1, 1.62, 0.112, 1.6, 0.08, 0.005, { uv: "keep", uvRect: ledRect(3) });
    zmax.box("emitGreen", bu, 3.55, 0.112, 4.2, 0.03, 0.005);
    // life-support / launch-control bank and terminal on the other side of the door
    computerBank(kit, { pos: [DX - 6.6, F, z1 - 0.62], yaw: Math.PI, w: 3.2, h: 2.4, d: 0.6, seed: 71, accent: "emitGreen" });
    consoleStation(kit, { pos: [DX - 10.8, F, z1 - 1.1], yaw: Math.PI, w: 1.8, d: 0.8, h: 1.0, screens: 2, accent: "emitGreen", seed: 73, screenSet: [11, 6] });
    wallPanel(kit, zmax, x1 - (DX - 10.8), 2.2, { w: 1.2, h: 0.7, accent: "emitGreen", seed: 75 });
    wallPanel(kit, zmax, x1 - (DX + 9.3), 1.9, { w: 1.0, h: 0.6, accent: "emitGreen", seed: 77 });
  }

  // ---- side walls: vac-suit lockers, O2 racks, supply cabinets, breathing-mask boards ------------------------
  /** Tall white vac-suit locker at frame u; open ones show a suit hanging inside. */
  function suitLocker(frame, u, open, n) {
    const H = 2.3;
    const D = 0.62;
    frame.box("paintedMetal", u, H / 2, D / 2, 0.8, H, D, black);
    frame.box("plate", u, H / 2, D / 2 - 0.02, 0.72, H - 0.12, D, { color: IMP.plateDark, uv: "world", texel: 1 });
    frame.box("paintedMetal", u, H - 0.08, D / 2, 0.8, 0.06, D + 0.04, { color: IMP.trim, texel: 1 });
    if (!open) {
      frame.box("plate", u, H / 2, D + 0.005, 0.7, H - 0.16, 0.02, { color: WHITE, uv: "world", texel: 1 });
      frame.box("metal", u + 0.26, 1.15, D + 0.03, 0.03, 0.18, 0.04, { color: IMP.steel });
      for (let k = 0; k < 3; k++) frame.box("metal", u, 1.95 - k * 0.07, D + 0.02, 0.36, 0.014, 0.02, { color: IMP.steelDark });
      frame.box("emitGreen", u - 0.25, 2.05, D + 0.02, 0.06, 0.06, 0.01);
    } else {
      // door swung open (perpendicular to the wall), suit inside, green cabin light
      frame.box("plate", u - 0.36, H / 2, D + 0.36, 0.02, H - 0.16, 0.7, { color: WHITE, uv: "world", texel: 1 });
      frame.box("emitGreen", u - 0.36 - 0.011, 2.05, D + 0.06, 0.01, 0.06, 0.06);
      const w = frame.pos(u, 0, D * 0.55);
      const q = frame.quat();
      kit.place("suit", { pos: [w.x, w.y, w.z], quat: q, color: WHITE });
      kit.place("suit_helmet", { pos: [w.x, w.y, w.z], quat: q, color: WHITE });
      kit.place("suit_visor", { pos: [w.x, w.y, w.z], quat: q });
      kit.place("suit_led", { pos: [w.x, w.y, w.z], quat: q });
      frame.box("emitWhiteSoft", u, H - 0.16, D / 2, 0.4, 0.01, 0.3, { uv: "keep" });
    }
    frame.decal(u, 0.55, D + 0.02, 0.24, 0.24, DECAL.NUMBER0 + (n % 4));
    frame.box("leds", u, 0.3, D + 0.02, 0.5, 0.05, 0.005, { uv: "keep", uvRect: ledRect(open ? 8 : 12) });
  }
  /** Open bottle rack: black back and cheeks, two shelves with retaining bars; `colors` picks the bottle tints. */
  function o2Rack(frame, u0, n, colors = [STEEL_LIGHT, WHITE], decal = DECAL.WARNING) {
    const w = n * 0.28 + 0.2;
    const uc = u0 + w / 2;
    frame.box("paintedMetal", uc, 0.95, 0.03, w, 1.9, 0.06, black);
    frame.box("plate", uc, 0.95, 0.065, w - 0.1, 1.7, 0.01, { color: IMP.plateDark, uv: "world", texel: 1 });
    frame.box("paintedMetal", u0 + 0.03, 0.95, 0.22, 0.06, 1.9, 0.44, black);
    frame.box("paintedMetal", u0 + w - 0.03, 0.95, 0.22, 0.06, 1.9, 0.44, black);
    frame.box("hazard", uc, 1.88, 0.22, w, 0.05, 0.44, { texel: 3 });
    for (const v of [0.1, 1.0]) {
      frame.box("metal", uc, v, 0.24, w - 0.1, 0.04, 0.36, { color: IMP.steelDark });
      frame.box("metal", uc, v + 0.5, 0.4, w - 0.1, 0.03, 0.03, { color: IMP.steel });
      for (let i = 0; i < n; i++) {
        if (rand() < 0.15) continue;
        const p = frame.pos(u0 + 0.24 + i * 0.28, v + 0.02, 0.24);
        kit.place("o2", { pos: [p.x, p.y, p.z], color: colors[Math.floor(rand() * colors.length)] });
        kit.place("o2_cap", { pos: [p.x, p.y, p.z] });
      }
    }
    frame.decal(uc, 1.79, 0.07, 0.14, 0.14, decal);
    frame.collider(u0, u0 + w, 0, 1.95, 0, 0.45, "o2");
  }
  /** Supply cabinet: open black carcass, glass doors over three stocked shelves, solid trim doors below. */
  function supplyCabinet(frame, u, w = 1.6, decal = DECAL.WARNING) {
    const D = 0.56;
    frame.box("paintedMetal", u, 1.15, 0.03, w, 2.3, 0.06, black);
    frame.box("plate", u, 1.45, 0.065, w - 0.16, 1.3, 0.01, { color: IMP.plateDark, uv: "world", texel: 1 });
    frame.box("paintedMetal", u - w / 2 + 0.04, 1.15, D / 2, 0.08, 2.3, D, black);
    frame.box("paintedMetal", u + w / 2 - 0.04, 1.15, D / 2, 0.08, 2.3, D, black);
    frame.box("paintedMetal", u, 2.26, D / 2, w, 0.08, D, black);
    frame.box("paintedMetal", u, 0.04, D / 2, w, 0.08, D, black);
    // glass doors over the stocked shelves (0.85..2.05), header above, solid doors below
    frame.box("paintedMetal", u, 2.15, D - 0.01, w - 0.16, 0.2, 0.02, { color: IMP.trim, texel: 1 });
    frame.box("paintedMetal", u, 0.45, D - 0.01, w - 0.16, 0.74, 0.02, { color: IMP.trim, texel: 1 });
    frame.box("paintedMetal", u, 0.83, D - 0.01, w - 0.16, 0.04, 0.02, black);
    frame.box("paintedMetal", u, 2.03, D - 0.01, w - 0.16, 0.04, 0.02, black);
    frame.box("paintedMetal", u, 1.45, D - 0.005, 0.03, 1.2, 0.01, black);
    frame.box("glass", u, 1.45, D + 0.005, w - 0.16, 1.2, 0.006, { uv: "keep" });
    frame.box("metal", u - 0.06, 1.45, D + 0.02, 0.02, 0.24, 0.03, { color: IMP.steel });
    frame.box("metal", u + 0.06, 1.45, D + 0.02, 0.02, 0.24, 0.03, { color: IMP.steel });
    for (let r = 0; r < 3; r++) {
      const v = 0.87 + r * 0.4;
      frame.box("metal", u, v, D / 2, w - 0.16, 0.02, D - 0.1, { color: IMP.steelDark });
      for (let i = 0; i < Math.floor((w - 0.3) / 0.28); i++) {
        const cu = u - (w - 0.3) / 2 + 0.16 + i * 0.28;
        if (rand() < 0.2) continue;
        frame.box("plate", cu, v + 0.11, 0.3, 0.22, 0.2, 0.22, { color: rand() < 0.5 ? WHITE : IMP.plateLight, uv: "world", texel: 2 });
        if (rand() < 0.5) frame.box("emitRed", cu, v + 0.11, 0.415, 0.1, 0.03, 0.005);
      }
    }
    frame.box("emitGreen", u - w / 2 + 0.2, 2.15, D + 0.005, 0.06, 0.06, 0.01);
    frame.box("leds", u, 0.6, D + 0.005, w - 0.5, 0.06, 0.005, { uv: "keep", uvRect: ledRect(15) });
    frame.decal(u, 0.3, D + 0.005, 0.3, 0.3, decal);
    frame.collider(u - w / 2, u + w / 2, 0, 2.35, 0, 0.6, "cabinet");
  }
  function maskBoard(frame, u) {
    frame.box("paintedMetal", u, 1.6, 0.03, 1.4, 0.9, 0.06, black);
    for (let i = 0; i < 4; i++) {
      const mu = u - 0.5 + i * 0.34;
      frame.box("plate", mu, 1.72, 0.1, 0.2, 0.26, 0.14, { color: WHITE, uv: "world", texel: 2 });
      frame.box("darkGloss", mu, 1.78, 0.175, 0.16, 0.08, 0.02);
      frame.cylN("metal", mu, 1.5, 0.08, 0.03, 0.16, { color: IMP.steelDark, segments: 8 });
    }
    frame.box("leds", u, 1.25, 0.065, 0.9, 0.05, 0.005, { uv: "keep", uvRect: ledRect(6) });
    frame.decal(u + 0.55, 1.25, 0.065, 0.2, 0.2, DECAL.TEXT_B);
  }
  /** Stretcher rack: two folded stretchers (white boards with black handles) clipped to the wall. */
  function stretcherRack(frame, u) {
    frame.box("paintedMetal", u, 1.1, 0.04, 1.3, 1.9, 0.08, black);
    for (const du of [-0.3, 0.3]) {
      frame.box("plate", u + du, 1.1, 0.15, 0.36, 1.8, 0.06, { color: WHITE, uv: "world", texel: 1 });
      frame.box("hazardRed", u + du, 1.1, 0.185, 0.36, 0.12, 0.005, { texel: 3 });
      for (const dv of [-0.95, 0.95]) frame.cylN("metal", u + du, 1.1 + dv, 0.15, 0.025, 0.14, { color: IMP.black, segments: 8 });
      for (const dv of [0.45, 1.75]) frame.box("metal", u + du, dv, 0.1, 0.44, 0.04, 0.16, { color: IMP.steelDark });
    }
    frame.decal(u, 2.2, 0.085, 0.3, 0.3, DECAL.TEXT_B);
    frame.collider(u - 0.65, u + 0.65, 0, 2.1, 0, 0.25, "stretchers");
  }
  {
    // long entry wall: fire-suppression bottles, stretchers and a supply cabinet port of the door; cabinets, a mask
    // board and spare oxygen starboard of the status board
    o2Rack(zmax, x1 - 19.6, 5, [RED_BOTTLE], DECAL.HAZARD_BAND);
    stretcherRack(zmax, x1 - 15.6);
    supplyCabinet(zmax, x1 - 11.8, 1.8, DECAL.TEXT_C);
    zmax.decal(x1 - 17.4, 3.0, 0.07, 0.7, 0.7, DECAL.RESTRICTED);
    wallPanel(kit, zmax, x1 - 13.6, 2.6, { w: 1.2, h: 0.6, accent: "emitRed", seed: 85 });
    supplyCabinet(zmax, x1 - 46.6, 1.8);
    supplyCabinet(zmax, x1 - 48.6, 1.8, DECAL.TEXT_C);
    maskBoard(zmax, x1 - 51.6);
    o2Rack(zmax, x1 - 56.4, 5);
    zmax.decal(x1 - 47.6, 3.0, 0.07, 0.8, 0.8, DECAL.TEXT_B);
    zmax.decal(x1 - 54.0, 3.0, 0.07, 0.6, 0.6, DECAL.NUMBER2);
  }
  {
    const xmax = ctx.wall("xmax").frame; // u = z - z0
    let n = 0;
    for (let u = 5.2; u < 11.0; u += 0.82) suitLocker(xmax, u, n === 2 || n === 5, n++);
    xmax.collider(4.8, 11.0, 0, 2.3, 0, 0.7, "lockers");
    o2Rack(xmax, 12.0, 6);
    supplyCabinet(xmax, 15.4, 1.8);
    maskBoard(xmax, 17.6);
    xmax.decal(8.0, 3.0, 0.06, 0.8, 0.8, DECAL.TEXT_B);
    xmax.decal(13.2, 3.0, 0.06, 0.7, 0.7, DECAL.NUMBER1);
    wallPanel(kit, xmax, 20.0, 1.8, { w: 1.0, h: 0.6, accent: "emitGreen", seed: 79 });
    stretcherRack(xmax, 22.6);
    crate(kit, { pos: [x1 - 1.3, F, z0 + 25.0], yaw: -0.1, size: [1.1, 0.7, 1.0], band: true, decal: DECAL.TEXT_C, color: IMP.plateLight });
    crate(kit, { pos: [x1 - 1.3, F + 0.7, z0 + 25.0], yaw: 0.2, size: [0.8, 0.5, 0.8], band: false, decal: DECAL.WARNING, color: WHITE });
    // bench in front of the lockers for suiting up
    kit.boxMM("paintedMetal", [x1 - 1.9, F + 0.42, z0 + 5.4], [x1 - 1.5, F + 0.47, z0 + 10.6], black);
    for (const bz of [z0 + 5.6, z0 + 8.0, z0 + 10.4]) kit.box("paintedMetal", x1 - 1.7, F + 0.21, bz, 0.3, 0.42, 0.1, { color: IMP.trim, texel: 1 });
    kit.collider([x1 - 1.95, F, z0 + 5.3], [x1 - 1.45, F + 0.5, z0 + 10.7], "bench");
    pipeRun(kit, { points: [[x1 - 0.4, ceil - 0.4, z0 + 4.2], [x1 - 0.4, ceil - 0.4, z1 - 0.6]], r: 0.08, clamps: 3.0, color: IMP.steelDark });
  }
  {
    const xmin = ctx.wall("xmin").frame; // u = z1 - z
    let n = 0;
    for (let u = 16.4; u < 22.2; u += 0.82) suitLocker(xmin, u, n === 1 || n === 4, n++);
    xmin.collider(16.0, 22.2, 0, 2.3, 0, 0.7, "lockers");
    o2Rack(xmin, 23.0, 5);
    supplyCabinet(xmin, 13.6, 1.8);
    maskBoard(xmin, 10.8);
    xmin.decal(19.3, 3.0, 0.06, 0.8, 0.8, DECAL.TEXT_B);
    xmin.decal(8.2, 2.8, 0.06, 0.9, 0.9, DECAL.EMBLEM);
    wallPanel(kit, xmin, 6.0, 1.8, { w: 1.0, h: 0.6, accent: "emitGreen", seed: 83 });
    stretcherRack(xmin, 4.4);
    kit.boxMM("paintedMetal", [x0 + 1.5, F + 0.42, z1 - 22.0], [x0 + 1.9, F + 0.47, z1 - 16.6], black);
    for (const bz of [z1 - 21.8, z1 - 19.3, z1 - 16.8]) kit.box("paintedMetal", x0 + 1.7, F + 0.21, bz, 0.3, 0.42, 0.1, { color: IMP.trim, texel: 1 });
    kit.collider([x0 + 1.45, F, z1 - 22.1], [x0 + 1.95, F + 0.5, z1 - 16.5], "bench");
    pipeRun(kit, { points: [[x0 + 0.4, ceil - 0.4, z0 + 4.2], [x0 + 0.4, ceil - 0.4, z1 - 0.6]], r: 0.08, clamps: 3.0, color: IMP.steelDark });
    // ration and water crates by the port lockers
    crate(kit, { pos: [x0 + 1.4, F, z1 - 8.6], yaw: 0.1, size: [1.2, 0.8, 1.0], band: true, decal: DECAL.TEXT_C, color: IMP.plateLight });
    crate(kit, { pos: [x0 + 1.4, F + 0.8, z1 - 8.6], yaw: -0.15, size: [0.9, 0.6, 0.8], band: false, decal: DECAL.WARNING, color: WHITE });
  }

  // ---- ceiling fixtures under the white points ---------------------------------------------------------------
  for (const [lx, lz] of KEY_LIGHTS) {
    kit.box("paintedMetal", lx, ceil - 0.08, lz, 2.2, 0.16, 0.9, black);
    kit.box("emitWhiteSoft", lx, ceil - 0.165, lz, 2.0, 0.01, 0.7, { uv: "keep" });
  }
  kit.box("paintedMetal", DX, ceil - 0.15, MZ + 2.5, 0.6, 0.3, 0.6, black);
  kit.cyl("emitWhite", DX, ceil - 0.305, MZ + 2.5, 0.2, 0.01, "y", { segments: 20 });

  // ---- lights (8: 7 points + a shadow spot on the muster ring) -------------------------------------------------
  for (const [lx, lz] of KEY_LIGHTS) ctx.light(0xeef2ff, 64, 28, [lx, ceil - 0.55, lz], { decay: 1.6 });
  ctx.light(GREEN_LIGHT, 36, 16, [15.25, ceil - 0.5, z0 + 3.4], { decay: 1.6 });
  ctx.light(GREEN_LIGHT, 36, 16, [34.75, ceil - 0.5, z0 + 3.4], { decay: 1.6 });
  ctx.light(GREEN_LIGHT, 36, 16, [54.25, ceil - 0.5, z0 + 3.4], { decay: 1.6 });
  ctx.spot(0xffffff, 170, 13, 0.62, [DX, ceil - 0.35, MZ + 2.5], [DX, F, MZ], { penumbra: 0.5, shadow: true, mapSize: 1024 });
}
