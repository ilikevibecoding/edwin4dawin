// Crew briefing room (deck B, port, x -20..-2 / z 526..540, h 3.4). Three tiers of bench seating with
// writing ledges step up toward the aft wall and face a framed blue holo-screen wall on the forward
// wall; a lectern and a floor holo-projector (faint additive cone with a slowly turning wedge) sit in
// front of it. An overhead projector truss carries the room's cool blue-white downlights.
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { roomShell, wallLightBar, wallConsole } from "../shell.js";
import { PALETTE } from "../../materials.js";
import { pointLight, Frame } from "../lib.js";
import { ceilingPlate, stencil, downlight, bench, standFrame, holoMaterial, locker } from "./aftProps.js";

export function build(kit, ctx, room, lib) {
  const shell = roomShell(kit, ctx, room, { style: "light", lights: false, ceiling: false, seed: 41 });
  const { y0, yTop, frames } = shell;
  const { x0, x1, z0, z1 } = room;
  const fX = frames["+x"].frame; // door wall, u = z - z0
  const fW = frames["-x"].frame; // far side wall, u = z1 - z
  const fN = frames["-z"].frame; // screen wall, u = x - x0
  const fS = frames["+z"].frame; // aft wall behind the top tier, u = x1 - x
  const aisle = [-11.8, -10.2];

  // ------------------------------------------------------------ ceiling, channels, downlights
  ceilingPlate(kit, room, yTop);
  for (const z of [530.6, 537.4]) {
    kit.box("satinBlack", (x0 + x1) / 2, yTop - 0.03, z, 16.4, 0.06, 0.3);
    kit.box("emitBlueSoft", (x0 + x1) / 2, yTop - 0.06, z, 16.2, 0.02, 0.18, { uv: "keep" });
  }
  const downs = [[-15, 532.6], [-7, 532.6], [-15, 536.2], [-7, 536.2], [-15, 539.0], [-7, 539.0]];
  for (const [x, z] of downs) {
    downlight(kit, x, yTop, z, "emitCoolSoft", 0.11);
    ctx.lights.cool.push(pointLight(0xc4d6ff, 6.5, 13, [x, yTop - 0.35, z]));
  }
  ctx.lights.cool.push(pointLight(0x7fb0ff, 7, 12, [-11, y0 + 2.1, 527.8]));
  ctx.lights.cool.push(pointLight(0xdfe8ff, 4, 9, [-16.6, yTop - 0.4, 528.8]));

  // ------------------------------------------------------------ holo-screen wall (forward)
  {
    fN.box("satinBlack", 9, 1.92, 0.07, 9.4, 2.7, 0.14);
    fN.box("metal", 9, 1.92, 0.142, 9.2, 2.5, 0.006, { color: PALETTE.darkMetal, texel: 2 });
    fN.box("screen4", 9, 1.9, 0.148, 4.4, 2.2, 0.006, { uv: "keep" });
    for (const u of [5.65, 12.35]) {
      fN.box("screen4", u, 1.35, 0.148, 2.2, 1.1, 0.006, { uv: "keep" });
      fN.box("screen4", u, 2.47, 0.148, 2.2, 1.1, 0.006, { uv: "keep" });
      fN.box("satinBlack", u, 1.91, 0.152, 2.24, 0.04, 0.008);
    }
    for (const u of [6.78, 11.22]) fN.box("satinBlack", u, 1.9, 0.152, 0.06, 2.24, 0.008);
    for (let k = 0; k < 8; k++) fN.box(k % 3 === 1 ? "emitAmber" : "emitBlue", 5.2 + k * 1.1, 3.26, 0.145, 0.16, 0.03, 0.01);
    fN.box("satinBlack", 9, 0.28, 0.14, 9.4, 0.56, 0.28);
    fN.box("leds", 9, 0.4, 0.285, 8.8, 0.04, 0.01, { uv: "keep" });
    fN.box("metal", 9, 0.57, 0.15, 9.5, 0.03, 0.3, { color: PALETTE.steel, texel: 2 });
    fN.collider(4.2, 13.8, 0, 3.4, 0, 0.32, "holoWall");
    // flanks: technician console (near the door side) and a data rack (far side)
    wallConsole(fN, 15.8, 1.6, "screen4");
    stencil(fN, 15.8, 2.0, 0.42, 6, { color: PALETTE.creamDark });
    wallLightBar(fN, 14.4, 17.4, 2.7, "emitCoolSoft");
    locker(fN, 1.6, 0.9, 2.2, { color: PALETTE.creamDark, band: PALETTE.tealPaint, decal: 9 });
    locker(fN, 2.6, 0.9, 2.2, { color: PALETTE.cream, band: PALETTE.tealPaint, decal: 6 });
    wallLightBar(fN, 0.5, 3.6, 2.7, "emitCoolSoft");
  }

  // ------------------------------------------------------------ lectern
  {
    const lx = -16.6;
    const lz = 528.6;
    const f = standFrame(kit, lx, y0, lz, "+z");
    f.box("satinBlack", 0, 0.55, 0, 0.72, 1.1, 0.5);
    f.box("metal", 0, 0.03, 0, 0.8, 0.06, 0.6, { color: PALETTE.darkMetal, texel: 2 });
    f.box("painted", 0, 0.6, 0.255, 0.56, 0.7, 0.01, { color: PALETTE.creamDark, uv: "keep" });
    stencil(f, 0, 0.62, 0.36, 2, { color: PALETTE.orange, n: 0.26 });
    f.box("emitBlue", 0, 1.02, 0.257, 0.5, 0.025, 0.01);
    f.box("satinBlack", 0, 1.14, -0.02, 0.78, 0.06, 0.56, { tilt: 0.3 });
    f.box("screen4", 0, 1.17, -0.03, 0.44, 0.26, 0.01, { tilt: 0.3, uv: "keep" });
    f.box("leds", 0, 1.13, 0.2, 0.5, 0.03, 0.01, { tilt: 0.3, uv: "keep" });
    f.cylV("metal", 0.28, 1.34, -0.14, 0.008, 0.36, { color: PALETTE.steel, segments: 6 });
    f.box("rubber", 0.28, 1.53, -0.14, 0.03, 0.05, 0.03, { color: PALETTE.rubber });
    kit.collider([lx - 0.42, y0, lz - 0.32], [lx + 0.42, y0 + 1.2, lz + 0.32], "lectern");
  }

  // ------------------------------------------------------------ holo-projector with cone + wedge
  {
    const px = -11;
    const pz = 528.9;
    kit.cyl("satinBlack", px, y0 + 0.15, pz, 0.42, 0.3, "y", { segments: 24 });
    kit.cyl("metal", px, y0 + 0.02, pz, 0.5, 0.04, "y", { color: PALETTE.darkMetal, segments: 24 });
    kit.cyl("metal", px, y0 + 0.31, pz, 0.36, 0.02, "y", { color: PALETTE.steel, segments: 24 });
    kit.add("emitBlue", new THREE.TorusGeometry(0.3, 0.018, 8, 32), { pos: [px, y0 + 0.32, pz], rot: [Math.PI / 2, 0, 0] });
    kit.cyl("emitBlue", px, y0 + 0.325, pz, 0.1, 0.02, "y", { segments: 16 });
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
      kit.box("leds", px + Math.cos(a) * 0.36, y0 + 0.2, pz + Math.sin(a) * 0.36, 0.2, 0.03, 0.01, { rot: [0, -a + Math.PI / 2, 0], uv: "keep" });
    }
    kit.collider([px - 0.45, y0, pz - 0.45], [px + 0.45, y0 + 0.35, pz + 0.45], "projector");
    const coneMat = holoMaterial(0x3a78e0, 0.035);
    const cone = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 0.11, 2.1, 28, 1, true), coneMat);
    cone.position.set(px, y0 + 0.34 + 1.05, pz);
    const wedgeMat = holoMaterial(0x8fc4ff, 0.5);
    const shape = new THREE.Shape();
    shape.moveTo(0, 0.75);
    shape.lineTo(0.42, -0.6);
    shape.lineTo(0.18, -0.7);
    shape.lineTo(-0.18, -0.7);
    shape.lineTo(-0.42, -0.6);
    shape.closePath();
    const hull = new THREE.ExtrudeGeometry(shape, { depth: 0.06, bevelEnabled: false });
    hull.rotateX(-Math.PI / 2);
    const tower = new THREE.BoxGeometry(0.16, 0.08, 0.14).toNonIndexed();
    tower.translate(0, 0.08, 0.3);
    const wedge = new THREE.Mesh(mergeGeometries([hull.index ? hull.toNonIndexed() : hull, tower], false), wedgeMat);
    wedge.position.set(px, y0 + 1.55, pz);
    const ringMat = holoMaterial(0x4a8dff, 0.4);
    const rings = new THREE.Mesh(mergeGeometries([new THREE.TorusGeometry(0.55, 0.008, 6, 48).rotateX(Math.PI / 2), new THREE.TorusGeometry(0.85, 0.006, 6, 56).rotateX(Math.PI / 2)], false), ringMat);
    rings.position.set(px, y0 + 1.25, pz);
    const group = new THREE.Group();
    group.name = "holoProjector";
    group.add(cone, wedge, rings);
    for (const m of group.children) m.castShadow = m.receiveShadow = false;
    const glow = pointLight(0x4a8dff, 2.4, 8, [px, y0 + 1.3, pz]);
    ctx.lights.teal.push(glow);
    const glowBase = glow.intensity;
    let t = 0;
    ctx.dynamic.push({
      object: group,
      update(dt) {
        t += dt;
        wedge.rotation.y = t * 0.35;
        rings.rotation.y = -t * 0.15;
        const p = 0.5 + 0.5 * Math.sin(t * 0.9);
        coneMat.opacity = 0.025 + 0.02 * p;
        wedgeMat.opacity = 0.42 + 0.14 * p;
        wedge.position.y = y0 + 1.55 + 0.03 * Math.sin(t * 0.7);
        glow.intensity = glowBase * (0.75 + 0.25 * p);
      },
    });
  }

  // ------------------------------------------------------------ tiers: platforms, aisle stairs, ledges, benches
  const tiers = [
    { zf: 529.8, zb: 534.2, y: y0 },
    { zf: 534.2, zb: 537.1, y: y0 + 0.36 },
    { zf: 537.1, zb: 540.0, y: y0 + 0.72 },
  ];
  const segs = [[-19.0, aisle[0] - 0.2], [aisle[1] + 0.2, -3.0]];
  for (let i = 0; i < tiers.length; i++) {
    const { zf, zb, y } = tiers[i];
    if (i > 0) {
      kit.boxMM("deck", [x0, y0, zf], [x1, y, zb], { color: PALETTE.impGreyDark, uv: "world", texel: 1 });
      kit.floor(x0, zf, x1, zb, y);
      kit.boxMM("satinBlack", [x0, y0, zf - 0.03], [x1, y - 0.02, zf], {});
      kit.boxMM("metal", [x0, y - 0.02, zf - 0.04], [x1, y + 0.005, zf + 0.06], { color: PALETTE.steel, texel: 2 });
      for (const [xa, xb] of [[x0 + 0.3, aisle[0] - 0.05], [aisle[1] + 0.05, x1 - 0.3]]) kit.boxMM("emitBlueSoft", [xa, y - 0.09, zf - 0.035], [xb, y - 0.05, zf - 0.025], { uv: "keep" });
      kit.stairs("deck", aisle[0], zf - 0.7, aisle[1], zf, tiers[i - 1].y, y, "z", { color: PALETTE.impGreyDark });
      for (const s of [0, 1]) kit.boxMM("satinBlack", [aisle[s] - 0.025, tiers[i - 1].y, zf - 0.72], [aisle[s] + 0.025, y + 0.02, zf + 0.02]);
      kit.boxMM("hazard", [aisle[0], tiers[i - 1].y + 0.001, zf - 0.72], [aisle[1], tiers[i - 1].y + 0.006, zf - 0.6], { texel: 2 });
    }
    for (const [xa, xb] of segs) {
      const xc = (xa + xb) / 2;
      const len = xb - xa;
      bench(kit, "x", xc, zf + 1.05, y, len, { facing: -1, depth: 0.5, color: PALETTE.fabricTeal });
      // writing ledge with a modesty panel, pedestals and personal displays tilted toward the seats
      kit.boxMM("satinBlack", [xa, y + 0.73, zf + 0.28], [xb, y + 0.77, zf + 0.62]);
      kit.boxMM("metal", [xa, y + 0.77, zf + 0.58], [xb, y + 0.785, zf + 0.62], { color: PALETTE.steel, texel: 2 });
      kit.boxMM("painted", [xa, y + 0.02, zf + 0.3], [xb, y + 0.73, zf + 0.34], { color: PALETTE.creamDark, uv: "world", texel: 0.8 });
      kit.boxMM("painted", [xa, y + 0.36, zf + 0.29], [xb, y + 0.42, zf + 0.3], { color: PALETTE.tealPaint, uv: "keep" });
      kit.boxMM("leds", [xa + 0.2, y + 0.66, zf + 0.29], [xb - 0.2, y + 0.69, zf + 0.3], { uv: "keep" });
      for (let x = xa + 0.3; x < xb; x += 2.2) kit.boxMM("satinBlack", [x, y, zf + 0.34], [x + 0.08, y + 0.73, zf + 0.6]);
      const lf = new Frame(kit, new THREE.Vector3(xa, y + 0.77, zf + 0.47), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0));
      for (let u = 0.6; u < len - 0.3; u += 1.15) {
        lf.box("darkGloss", u, 0.13, 0.0, 0.36, 0.24, 0.02, { tilt: -0.55 });
        lf.box("screen4", u, 0.135, 0.012, 0.32, 0.2, 0.004, { tilt: -0.55, uv: "keep" });
        lf.box("leds", u, 0.01, 0.06, 0.3, 0.016, 0.06, { uv: "keep" });
      }
      kit.collider([xa, y, zf + 0.26], [xb, y + 0.82, zf + 0.64], "ledge");
    }
  }

  // ------------------------------------------------------------ overhead projector truss
  {
    const ty = yTop - 0.5;
    kit.boxMM("satinBlack", [-11.11, ty - 0.11, 529], [-10.89, ty + 0.11, 536.2]);
    for (const z of [530.6, 535.2]) kit.boxMM("satinBlack", [-14.2, ty - 0.08, z - 0.08], [-7.8, ty + 0.08, z + 0.08]);
    for (const z of [529.2, 531.6, 534.0, 536.0]) kit.boxMM("satinBlack", [-11.03, ty + 0.1, z - 0.03], [-10.97, yTop, z + 0.03]);
    for (const x of [-14.1, -7.9]) for (const z of [530.6, 535.2]) kit.boxMM("satinBlack", [x - 0.03, ty + 0.08, z - 0.03], [x + 0.03, yTop, z + 0.03]);
    kit.cyl("rubber", -11.15, ty - 0.16, 532.6, 0.02, 7.0, "z", { color: PALETTE.rubber, segments: 6 });
    // main projector aimed at the screen wall, a tracking camera unit and two truss downlights
    const pz = 530.6;
    kit.box("paintedMetal", -11, ty - 0.32, pz, 0.52, 0.34, 0.74, { color: PALETTE.darkMetal, texel: 2 });
    kit.box("painted", -11, ty - 0.32, pz, 0.46, 0.26, 0.6, { color: PALETTE.slate, uv: "keep" });
    kit.cyl("darkGloss", -11, ty - 0.32, pz - 0.4, 0.1, 0.1, "z", { segments: 16 });
    kit.add("emitBlue", new THREE.TorusGeometry(0.1, 0.012, 6, 24), { pos: [-11, ty - 0.32, pz - 0.45] });
    kit.box("leds", -10.73, ty - 0.35, pz, 0.006, 0.03, 0.3, { uv: "keep" });
    kit.box("emitTeal", -11.27, ty - 0.35, pz + 0.2, 0.006, 0.03, 0.03);
    kit.box("paintedMetal", -11, ty - 0.24, 535.2, 0.3, 0.2, 0.4, { color: PALETTE.darkMetal, texel: 2 });
    kit.cyl("darkGloss", -11, ty - 0.24, 534.98, 0.06, 0.06, "z", { segments: 12 });
    kit.box("emitRed", -11.1, ty - 0.24, 534.96, 0.02, 0.02, 0.01);
    for (const x of [-13.6, -8.4]) {
      kit.cyl("satinBlack", x, ty - 0.2, 530.6, 0.14, 0.24, "y", { segments: 14 });
      kit.cyl("emitCoolSoft", x, ty - 0.325, 530.6, 0.11, 0.012, "y", { segments: 14, uv: "keep" });
    }
  }

  // ------------------------------------------------------------ side walls: consoles, panels, cabinets
  {
    // door wall (+x): technician wall console forward of the door, cabinets over tier 2, panel over tier 3
    wallConsole(fX, 2.6, 1.6, "screen4");
    stencil(fX, 2.6, 2.0, 0.42, 9, { color: PALETTE.creamDark });
    wallLightBar(fX, 0.5, 5.6, 2.7, "emitCoolSoft");
    const fX2 = new Frame(kit, fX.pos(0, 0.36, 0), fX.U, fX.V);
    locker(fX2, 9.2, 0.9, 2.0, { color: PALETTE.cream, band: PALETTE.tealPaint, decal: 6 });
    locker(fX2, 10.2, 0.9, 2.0, { color: PALETTE.creamDark, band: PALETTE.tealPaint, decal: 9 });
    const fX3 = new Frame(kit, fX.pos(0, 0.72, 0), fX.U, fX.V);
    fX3.box("metal", 12.6, 1.5, 0.05, 1.8, 1.1, 0.1, { color: PALETTE.gunmetal, texel: 1.5 });
    fX3.box("darkGloss", 12.2, 1.6, 0.105, 0.7, 0.5, 0.02);
    fX3.box("screen1", 12.2, 1.6, 0.117, 0.62, 0.42, 0.004, { uv: "keep" });
    for (let k = 0; k < 6; k++) fX3.box(k % 2 ? "emitBlue" : "emitAmber", 12.9 + (k % 3) * 0.16, 1.75 - Math.floor(k / 3) * 0.14, 0.106, 0.08, 0.05, 0.01);
    fX3.box("leds", 13.1, 1.35, 0.106, 0.6, 0.04, 0.01, { uv: "keep" });
    fX3.box("painted", 12.6, 1.05, 0.103, 1.6, 0.06, 0.01, { color: PALETTE.orange, uv: "keep" });
    for (let k = 0; k < 6; k++) fX3.box("metal", 12.6, 0.62 + k * 0.06, 0.06, 1.2, 0.02, 0.06, { color: PALETTE.steel, tilt: 0.5 });
    fX3.collider(11.6, 13.6, 0, 2.1, 0, 0.13, "panel");
    wallLightBar(fX3, 8.4, 13.8, 2.0, "emitCoolSoft");
  }
  {
    // far wall (-x): console in the presentation zone, sector map over tier 1, panels + fire cabinet aft
    wallConsole(fW, 12.2, 1.6, "screen4");
    stencil(fW, 12.2, 2.0, 0.42, 12, { color: PALETTE.creamDark });
    wallLightBar(fW, 10.6, 13.8, 2.7, "emitCoolSoft");
    fW.box("satinBlack", 7.8, 1.75, 0.04, 2.6, 1.5, 0.08);
    fW.box("screen4", 7.8, 1.75, 0.082, 2.44, 1.34, 0.006, { uv: "keep" });
    fW.box("leds", 7.8, 0.92, 0.05, 2.0, 0.04, 0.02, { uv: "keep" });
    fW.collider(6.4, 9.2, 0.9, 2.6, 0, 0.1, "map");
    wallLightBar(fW, 6.2, 9.4, 2.7, "emitCoolSoft");
    const fW2 = new Frame(kit, fW.pos(0, 0.36, 0), fW.U, fW.V);
    fW2.box("metal", 4.3, 1.2, 0.08, 1.8, 1.4, 0.16, { color: PALETTE.gunmetal, texel: 1.5 });
    fW2.box("painted", 4.3, 1.2, 0.165, 1.6, 1.2, 0.01, { color: PALETTE.impRed, uv: "keep" });
    stencil(fW2, 4.3, 1.45, 0.5, 13, { color: PALETTE.cream, n: 0.17 });
    fW2.box("metal", 4.3, 0.85, 0.19, 0.5, 0.05, 0.05, { color: PALETTE.steel });
    fW2.box("emitRed", 4.9, 1.75, 0.172, 0.05, 0.05, 0.01);
    fW2.collider(3.3, 5.3, 0, 2.0, 0, 0.2, "fireCabinet");
    const fW3 = new Frame(kit, fW.pos(0, 0.72, 0), fW.U, fW.V);
    for (let k = 0; k < 2; k++) {
      const u = 0.9 + k * 1.1;
      fW3.box("metal", u, 1.4, 0.06, 0.9, 1.2, 0.12, { color: PALETTE.gunmetal, texel: 1.5 });
      for (let s = 0; s < 8; s++) fW3.box("metal", u, 0.95 + s * 0.1, 0.09, 0.7, 0.02, 0.08, { color: PALETTE.steel, tilt: 0.5 });
      fW3.box("painted", u, 1.85, 0.125, 0.7, 0.2, 0.01, { color: PALETTE.creamDark, uv: "keep" });
      fW3.box(k ? "emitTeal" : "emitOrange", u + 0.25, 1.85, 0.132, 0.03, 0.03, 0.01);
    }
    fW3.collider(0.3, 2.6, 0, 2.1, 0, 0.15, "vents");
    wallLightBar(fW3, 0.4, 5.6, 2.0, "emitCoolSoft");
  }
  {
    // aft wall behind the top tier: comm panels, stencils, a long light bar
    const fS3 = new Frame(kit, fS.pos(0, 0.72, 0), fS.U, fS.V);
    for (const u of [3.2, 9.0, 14.8]) {
      fS3.box("satinBlack", u, 1.55, 0.04, 1.3, 0.7, 0.08);
      fS3.box("screen4", u - 0.2, 1.55, 0.082, 0.76, 0.5, 0.006, { uv: "keep" });
      for (let k = 0; k < 4; k++) fS3.box(k % 2 ? "emitBlue" : "emitWhite", u + 0.42, 1.72 - k * 0.11, 0.082, 0.12, 0.04, 0.006);
      fS3.box("leds", u, 1.15, 0.05, 1.0, 0.04, 0.02, { uv: "keep" });
    }
    stencil(fS3, 6.1, 1.6, 0.5, 14, { color: PALETTE.cream });
    stencil(fS3, 11.9, 1.6, 0.5, 0, { color: PALETTE.creamDark });
    wallLightBar(fS3, 1.0, 17.0, 2.15, "emitCoolSoft");
    fS3.collider(0.5, 17.5, 1.1, 2.0, 0, 0.1, "commPanels");
  }
  return shell;
}
