// Restricted Intelligence Room — a secure vestibule (partition walls, scanner arch with a sweeping red beam)
// opens onto the analysis room: a conference table with an embedded holo projector (red wireframe threat
// globe with orbiting markers), eight chairs, computer banks on every wall, a secure locker row, a threat
// board on the aft wall. Red ceiling strips, RESTRICTED stencils, cold red practical lights. Accent red.
import * as THREE from "three";
import { IMP } from "../../core/palette.js";
import { Placer } from "../../core/props.js";
import { screenRect, ledRect, DECAL } from "../../textures.js";
import { Instancer, chairProto, lightBand, screenArray } from "./tactical.js";

export const meta = { id: "intelligence", stream: "tower-rooms" };

const AXIS_X = -50; // secure door centre on the forward wall
const VEST_D = 3.6; // vestibule depth

export function build(ctx) {
  const { kit, props } = ctx;
  const { x0, x1, z0, z1 } = ctx.inner;
  const fy = ctx.floor;
  const cx = AXIS_X;
  const vz1 = z0 + VEST_D;
  const TABLE_Z = 222.2;

  ctx.shell({
    floorMat: "deckGrey",
    floorColor: IMP.plateDark,
    stripSpacing: 4.2,
    ceiling: { stripMat: "emitRed", stripW: 0.22 },
    seed: 13,
    walls: {
      zmin: { styles: { plate: 0.7, panel: 0.2, hatch: 0.1 } },
      zmax: { styles: { plate: 0.7, panel: 0.15, screen: 0.15 } },
      xmin: { styles: { plate: 0.75, panel: 0.15, vent: 0.1 } },
      xmax: { styles: { plate: 0.75, panel: 0.15, vent: 0.1 } },
    },
  });
  for (const side of ["zmin", "zmax", "xmin", "xmax"]) lightBand(ctx.wall(side));

  const inst = new Instancer(ctx);
  const chair = chairProto(inst, "intel_chair", { color: IMP.fabricBlack });

  // ---- vestibule: partition walls, scanner arch, threshold ----
  {
    for (const s of [-1, 1]) {
      const px = cx + s * 2.8;
      kit.boxMM("plate", [px - 0.15, fy, z0], [px + 0.15, fy + ctx.h, vz1], { color: IMP.plateDark, uv: "world", texel: 1 });
      kit.boxMM("paintedMetal", [px - 0.18, fy, z0], [px + 0.18, fy + 0.35, vz1 + 0.03], { color: IMP.black, texel: 1 });
      kit.boxMM("paintedMetal", [px - 0.18, fy + ctx.h - 0.3, z0], [px + 0.18, fy + ctx.h, vz1 + 0.03], { color: IMP.black, texel: 1 });
      // end post with a red slit facing the room
      kit.boxMM("paintedMetal", [px - 0.2, fy, vz1 - 0.05], [px + 0.2, fy + ctx.h, vz1 + 0.25], { color: IMP.black, texel: 1 });
      kit.boxMM("emitRed", [px - 0.02, fy + 0.5, vz1 + 0.25], [px + 0.02, fy + 1.9, vz1 + 0.262], { uv: "keep" });
      kit.collider([px - 0.2, fy, z0], [px + 0.2, fy + ctx.h, vz1 + 0.25], "partition");
      // RESTRICTED on the vestibule side, warning on the room side of each post
      const inner = new Placer(kit, [px - s * 0.16, fy, z0 + 1.0], s > 0 ? -Math.PI / 2 : Math.PI / 2);
      inner.decal(0, 2.4, 0.005, 0.9, 0.9, DECAL.RESTRICTED);
      inner.decal(0, 1.2, 0.005, 0.6, 0.6, DECAL.TEXT_C);
      const outer = new Placer(kit, [px + s * 0.16, fy, (z0 + vz1) / 2 + 0.6], s > 0 ? Math.PI / 2 : -Math.PI / 2);
      outer.decal(0, 2.6, 0.005, 1.1, 1.1, DECAL.EMBLEM_RED);
      const face = new Placer(kit, [px, fy, vz1 + 0.26], 0);
      face.decal(0, 2.4, 0.005, 0.34, 0.34, DECAL.RESTRICTED);
    }
    scannerArch(ctx, [cx, fy, z0 + 1.9]);
    // vestibule deck: gloss strip with a red edge, hazard threshold where the room begins
    kit.boxMM("darkGloss", [cx - 1.4, fy + 0.002, z0 + 0.1], [cx + 1.4, fy + 0.012, vz1 - 0.6]);
    for (const s of [-1, 1]) kit.boxMM("emitRed", [cx + s * 1.42 - 0.012, fy + 0.003, z0 + 0.1], [cx + s * 1.42 + 0.012, fy + 0.013, vz1 - 0.6], { uv: "keep" });
    kit.boxMM("hazardRed", [cx - 2.6, fy + 0.003, vz1 - 0.2], [cx + 2.6, fy + 0.011, vz1 + 0.3], { texel: 2 });
    // inside the door: RESTRICTED over the opening, deck code beside it
    const W = ctx.wall("zmin");
    const u = (x) => x - x0;
    W.frame.decal(u(cx), 3.3, 0.06, 1.0, 1.0, DECAL.RESTRICTED);
    W.frame.decal(u(cx + 1.9), 2.2, 0.06, 0.5, 0.5, DECAL.DECK_A);
    W.frame.decal(u(cx - 1.9), 2.2, 0.06, 0.5, 0.5, DECAL.NUMBER3);
    // computer banks on the forward wall outside the vestibule
    for (const s of [-1, 1]) {
      props.computerBank(kit, { pos: [cx + s * 4.65, fy, z0 + 0.6], yaw: 0, w: 3.0, h: 2.4, d: 0.6, seed: 61 + s, accent: "emitRed" });
      props.computerBank(kit, { pos: [cx + s * 7.75, fy, z0 + 0.6], yaw: 0, w: 2.9, h: 2.4, d: 0.6, seed: 63 + s, accent: "emitRed" });
    }
  }

  // ---- conference table with embedded holo projector ----
  {
    // security perimeter inlay under the table zone
    kit.boxMM("darkGloss", [cx - 3.9, fy + 0.002, TABLE_Z - 3.0], [cx + 3.9, fy + 0.012, TABLE_Z + 3.0]);
    const edge = (a, b) => kit.boxMM("emitRed", a, b, { uv: "keep" });
    edge([cx - 3.92, fy + 0.003, TABLE_Z - 3.02], [cx + 3.92, fy + 0.013, TABLE_Z - 3.0]);
    edge([cx - 3.92, fy + 0.003, TABLE_Z + 3.0], [cx + 3.92, fy + 0.013, TABLE_Z + 3.02]);
    edge([cx - 3.92, fy + 0.003, TABLE_Z - 3.02], [cx - 3.9, fy + 0.013, TABLE_Z + 3.02]);
    edge([cx + 3.9, fy + 0.003, TABLE_Z - 3.02], [cx + 3.92, fy + 0.013, TABLE_Z + 3.02]);
    conferenceTable(ctx, [cx, fy, TABLE_Z], 4.8, 1.9);
    for (const dx of [-1.5, 0, 1.5]) {
      chair(cx + dx, fy, TABLE_Z + 1.45, 0);
      chair(cx + dx, fy, TABLE_Z - 1.45, Math.PI);
    }
    chair(cx + 3.05, fy, TABLE_Z, Math.PI / 2);
    chair(cx - 3.05, fy, TABLE_Z, -Math.PI / 2);
  }

  // ---- port wall (xmin): analysis banks forward, secure lockers aft ----
  {
    const W = ctx.wall("xmin");
    const u = (z) => z1 - z;
    for (const [z, sd] of [[217.2, 71], [220.4, 72]]) props.computerBank(kit, { pos: [x0 + 0.6, fy, z], yaw: Math.PI / 2, w: 3.0, h: 2.4, d: 0.6, seed: sd, accent: "emitRed" });
    props.lockerRow(kit, W.frame, u(227.3), 6, { lw: 0.6, h: 2.0, d: 0.5, color: IMP.plateDark });
    W.frame.box("paintedMetal", u(225.5), 2.12, 0.25, 3.7, 0.12, 0.5, { color: IMP.black, texel: 1 });
    W.frame.box("emitRed", u(225.5), 2.05, 0.3, 3.3, 0.03, 0.02, { uv: "keep" });
    W.frame.decal(u(225.5), 2.9, 0.06, 0.8, 0.8, DECAL.WARNING);
    W.frame.decal(u(222.0), 3.2, 0.06, 0.8, 0.8, DECAL.RESTRICTED);
    kit.boxMM("hazard", [x0 + 0.55, fy + 0.003, 223.4], [x0 + 1.1, fy + 0.009, 227.4], { texel: 1.5 });
  }

  // ---- starboard wall (xmax): signals banks + a tall data board ----
  {
    const W = ctx.wall("xmax");
    const u = (z) => z - z0;
    for (const [z, sd] of [[217.2, 73], [220.4, 74], [226.0, 75]]) props.computerBank(kit, { pos: [x1 - 0.6, fy, z], yaw: -Math.PI / 2, w: 3.0, h: 2.4, d: 0.6, seed: sd, accent: "emitRed" });
    screenArray(W.frame, u(223.2), 1.9, 1, 2, 1.5, 1.1, [5, 12]);
    W.frame.decal(u(223.2), 3.5, 0.06, 0.8, 0.8, DECAL.RESTRICTED);
    W.frame.decal(u(218.0), 3.3, 0.06, 0.6, 0.6, DECAL.TEXT_B);
  }

  // ---- aft wall (zmax): threat board in the centre, banks either side ----
  {
    const W = ctx.wall("zmax");
    const u = (x) => x1 - x;
    screenArray(W.frame, u(cx), 2.05, 3, 2, 1.45, 0.95, [5, 12, 3, 1, 5, 13]);
    W.frame.box("paintedMetal", u(cx), 3.55, 0.1, 5.3, 0.14, 0.24, { color: IMP.black, texel: 1 });
    W.frame.box("emitRed", u(cx), 3.5, 0.12, 4.9, 0.02, 0.18, { uv: "keep" });
    W.frame.decal(u(cx), 4.0, 0.06, 0.8, 0.8, DECAL.EMBLEM_RED);
    for (const s of [-1, 1]) {
      props.computerBank(kit, { pos: [cx + s * 4.6, fy, z1 - 0.6], yaw: Math.PI, w: 3.0, h: 2.4, d: 0.6, seed: 81 + s, accent: "emitRed" });
      props.computerBank(kit, { pos: [cx + s * 7.7, fy, z1 - 0.6], yaw: Math.PI, w: 2.9, h: 2.4, d: 0.6, seed: 83 + s, accent: "emitRed" });
      W.frame.decal(u(cx + s * 6.2), 3.2, 0.06, 0.6, 0.6, s < 0 ? DECAL.TEXT_A : DECAL.TEXT_C);
    }
    // analyst station facing the board
    props.consoleStation(kit, { pos: [cx, fy, z1 - 1.9], yaw: Math.PI, w: 3.0, d: 0.85, h: 1.0, screens: 3, accent: "emitRed", seed: 91, screenSet: [5, 12, 1] });
    chair(cx, fy, z1 - 2.55, Math.PI);
  }

  // ---- lights: cold red practicals, two pale keys over the table ----
  ctx.light(0xff4a3a, 16, 9, [cx, fy + 3.2, z0 + 1.9], { decay: 1.6 });
  ctx.light(0xffe2dc, 32, 16, [cx - 1.4, fy + 3.9, TABLE_Z], { decay: 1.5 });
  ctx.light(0xffe2dc, 32, 16, [cx + 1.4, fy + 3.9, TABLE_Z], { decay: 1.5 });
  ctx.light(0xff5545, 22, 14, [x0 + 3.0, fy + 3.8, 218.5], { decay: 1.4 });
  ctx.light(0xff5545, 22, 14, [x1 - 3.0, fy + 3.8, 218.5], { decay: 1.4 });
  ctx.light(0xff5545, 22, 14, [x0 + 3.0, fy + 3.8, 225.5], { decay: 1.4 });
  ctx.light(0xff5545, 22, 14, [x1 - 3.0, fy + 3.8, 225.5], { decay: 1.4 });
  inst.build();
}

// ---------------------------------------------------------------------------------------------------
/** Scanner arch: two pillars, lintel with a red emissive bar, status screens, and a sweeping scan beam. */
function scannerArch(ctx, pos) {
  const { kit } = ctx;
  const [x, y, z] = pos;
  const H = 2.75;
  const half = 1.4;
  for (const s of [-1, 1]) {
    const px = x + s * half;
    kit.box("paintedMetal", px, y + H / 2, z, 0.4, H, 0.5, { color: IMP.black, texel: 1 });
    kit.box("plate", px, y + H / 2, z, 0.3, H - 0.4, 0.42, { color: IMP.plateDark, uv: "world", texel: 1 });
    kit.box("emitRed", px - s * 0.201, y + 1.5, z, 0.002, 1.8, 0.05, { uv: "keep" });
    kit.box("darkGloss", px, y + 1.35, z + 0.26, 0.26, 0.5, 0.02);
    kit.box("leds", px, y + 1.2, z + 0.272, 0.2, 0.08, 0.005, { uv: "keep", uvRect: ledRect(s > 0 ? 2 : 6) });
    kit.box("screen", px, y + 1.48, z + 0.272, 0.2, 0.16, 0.005, { uv: "keep", uvRect: screenRect(s > 0 ? 5 : 12) });
    kit.collider([px - 0.2, y, z - 0.25], [px + 0.2, y + H + 0.4, z + 0.25], "arch");
  }
  kit.box("paintedMetal", x, y + H + 0.2, z, 2 * half + 0.4, 0.4, 0.5, { color: IMP.black, texel: 1 });
  kit.box("plate", x, y + H + 0.2, z, 2 * half - 0.2, 0.3, 0.42, { color: IMP.plateDark, uv: "world", texel: 1 });
  kit.box("emitRed", x, y + H - 0.005, z, 2 * half - 0.4, 0.01, 0.12, { uv: "keep" });
  kit.box("hazardRed", x, y + 0.003, z, 2 * half - 0.4, 0.006, 0.8, { texel: 2 });
  // the beam: a thin additive red sheet that sweeps the opening top to bottom
  const beamMat = new THREE.MeshBasicMaterial({ color: 0xff3b2f, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const beam = new THREE.Mesh(new THREE.PlaneGeometry(2 * half - 0.42, 0.03), beamMat);
  beam.position.set(x, y + 1.5, z);
  ctx.add(beam);
  let t = 0;
  ctx.animate((dt) => {
    t += dt;
    const k = 0.5 - 0.5 * Math.cos(t * 1.4);
    beam.position.y = y + 0.25 + k * (H - 0.5);
    beamMat.opacity = 0.25 + 0.15 * Math.sin(t * 20);
  });
}

/** Conference table: two black pedestals, gloss top with a steel edge, embedded projector + threat globe. */
function conferenceTable(ctx, pos, L, Wd) {
  const { kit } = ctx;
  const [x, y, z] = pos;
  const H = 0.76;
  for (const s of [-1, 1]) {
    kit.box("paintedMetal", x + s * (L / 2 - 0.7), y + (H - 0.1) / 2, z, 0.5, H - 0.1, Wd - 0.5, { color: IMP.black, texel: 1 });
    kit.box("plate", x + s * (L / 2 - 0.7), y + (H - 0.1) / 2, z, 0.4, H - 0.3, Wd - 0.6, { color: IMP.plateDark, uv: "world", texel: 1 });
  }
  kit.box("paintedMetal", x, y + H - 0.09, z, L - 1.0, 0.1, Wd - 0.8, { color: IMP.black, texel: 1 });
  kit.box("metal", x, y + H - 0.03, z, L, 0.06, Wd, { color: IMP.steelDark });
  kit.box("darkGloss", x, y + H + 0.005, z, L - 0.1, 0.01, Wd - 0.1);
  kit.box("emitRed", x, y + H + 0.011, z + Wd / 2 - 0.12, L - 0.6, 0.002, 0.02, { uv: "keep" });
  kit.box("emitRed", x, y + H + 0.011, z - Wd / 2 + 0.12, L - 0.6, 0.002, 0.02, { uv: "keep" });
  // embedded projector: inset disc with a red ring and a lit emitter
  kit.cyl("paintedMetal", x, y + H + 0.02, z, 0.42, 0.03, "y", { color: IMP.black, segments: 24 });
  kit.add("emitRed", new THREE.RingGeometry(0.36, 0.4, 32).rotateX(-Math.PI / 2), { pos: [x, y + H + 0.037, z], uv: "keep" });
  kit.cyl("darkGloss", x, y + H + 0.04, z, 0.3, 0.01, "y", { segments: 24 });
  kit.cyl("emitWhite", x, y + H + 0.046, z, 0.06, 0.006, "y", { segments: 12 });
  // seat-side data pads
  for (const dx of [-1.5, 0, 1.5]) for (const s of [-1, 1]) {
    kit.box("screen", x + dx, y + H + 0.012, z + s * (Wd / 2 - 0.45), 0.5, 0.004, 0.3, { uv: "keep", uvRect: screenRect(dx === 0 ? 12 : 5) });
  }
  kit.collider([x - L / 2, y, z - Wd / 2], [x + L / 2, y + H + 0.05, z + Wd / 2], "table");

  // threat globe hologram
  const red = 0xff5a4a;
  const lineMat = new THREE.LineBasicMaterial({ color: red, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false });
  const faceMat = new THREE.MeshBasicMaterial({ color: red, transparent: true, opacity: 0.08, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const markMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
  const g = new THREE.Group();
  const gy = y + H + 0.85;
  g.position.set(x, gy, z);
  const R = 0.5;
  g.add(new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(R, 2)), lineMat));
  g.add(new THREE.Mesh(new THREE.SphereGeometry(R * 0.98, 24, 16), faceMat));
  const equator = new THREE.Mesh(new THREE.TorusGeometry(R * 1.35, 0.006, 6, 72).rotateX(Math.PI / 2), lineMat);
  g.add(equator);
  const scan = new THREE.Mesh(new THREE.TorusGeometry(R * 1.05, 0.008, 6, 72), lineMat); // vertical ring
  g.add(scan);
  const marks = [];
  for (let i = 0; i < 3; i++) {
    const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.05), markMat);
    const phi = 0.6 + i * 0.9;
    const th = i * 2.1;
    m.position.set(R * 1.02 * Math.sin(phi) * Math.cos(th), R * 1.02 * Math.cos(phi), R * 1.02 * Math.sin(phi) * Math.sin(th));
    marks.push(m);
    g.add(m);
  }
  const coneMat = new THREE.MeshBasicMaterial({ color: red, transparent: true, opacity: 0.05, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const cone = new THREE.Mesh(new THREE.CylinderGeometry(R * 1.3, 0.08, gy - R * 0.9 - (y + H + 0.05), 32, 1, true), coneMat);
  cone.position.set(x, (gy - R * 0.9 + y + H + 0.05) / 2, z);
  ctx.add(g);
  ctx.add(cone);
  let t = 0;
  ctx.animate((dt) => {
    t += dt;
    g.rotation.y = t * 0.25;
    scan.rotation.y = t * 0.9;
    scan.rotation.x = Math.sin(t * 0.4) * 0.3;
    for (let i = 0; i < marks.length; i++) {
      const s = 0.8 + 0.5 * Math.max(0, Math.sin(t * 3 + i * 2.1));
      marks[i].scale.setScalar(s);
    }
    lineMat.opacity = 0.7 + 0.1 * Math.sin(t * 13) * Math.sin(t * 3.7);
    faceMat.opacity = 0.06 + 0.03 * Math.sin(t * 5);
  });
}
