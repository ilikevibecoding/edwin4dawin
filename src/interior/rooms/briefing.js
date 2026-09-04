// Crew briefing room (deck B, port, x -20..-2 / z 526..540, h 3.4). A sunken amphitheatre: the door
// opens onto a landing behind the top row, and three tiers of bench seating with writing ledges step
// DOWN toward the west wall, which carries the framed holo-screen wall between two hanging banners.
// A central aisle stair runs from the door straight to the stage, where a lectern on a low dais and a
// floor holo-projector (visible cone, slowly turning wire-frame wedge) stand in front of the screen.
// An overhead projector truss over the aisle carries the room's cool blue-white downlights.
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { roomShell, wallLightBar, wallConsole } from "../shell.js";
import { PALETTE } from "../../materials.js";
import { pointLight, Frame, WALL_T } from "../lib.js";
import { ceilingPlate, stencil, downlight, bench, standFrame, holoMaterial, locker, UP } from "./aftProps.js";

export function build(kit, ctx, room, lib) {
  const shell = roomShell(kit, ctx, room, { style: "light", lights: false, ceiling: false, floor: false, seed: 41 });
  const { y0, yTop, frames } = shell;
  const { x0, x1, z0, z1 } = room;
  const wt = WALL_T;
  const fX = frames["+x"].frame; // door wall, u = z - z0
  const fW = frames["-x"].frame; // screen wall, u = z1 - z
  const fN = frames["-z"].frame; // forward side wall, u = x - x0
  const fS = frames["+z"].frame; // aft side wall, u = x1 - x
  const L1 = y0 - 0.36;
  const L2 = y0 - 0.72;
  const aisle = [532.1, 533.9]; // aligned with the door
  const tiers = [
    { xw: -7.8, y: y0 }, // top row, on the landing level
    { xw: -10.6, y: L1 },
    { xw: -13.4, y: L2 }, // front row, on the stage level
  ];
  const lower = (frame, dy) => new Frame(kit, frame.pos(0, dy, 0), frame.U, frame.V);

  // ------------------------------------------------------------ floors: stage slab, two raised blocks, aisle stairs, pit wall bands
  const deckOpts = { color: PALETTE.impGreyDark, uv: "world", texel: 1 };
  kit.boxMM("deck", [x0 - wt, L2 - 0.12, z0 - wt], [x1 + wt, L2, z1 + wt], deckOpts);
  kit.floor(x0 - wt, z0 - wt, -10.6, z1 + wt, L2);
  kit.boxMM("deck", [-10.6, L2 - 0.12, z0 - wt], [-7.8, L1, z1 + wt], deckOpts);
  kit.floor(-10.6, z0 - wt, -7.8, z1 + wt, L1);
  kit.boxMM("deck", [-7.8, L2 - 0.12, z0 - wt], [x1 + wt, y0, z1 + wt], deckOpts);
  kit.floor(-7.8, z0 - wt, x1 + wt, z1 + wt, y0);
  for (let i = 0; i < tiers.length - 1; i++) {
    const { xw, y } = tiers[i];
    const yl = tiers[i + 1].y;
    // riser face: satin band, steel nosing, blue step light along the top edge (either side of the aisle)
    kit.boxMM("satinBlack", [xw - 0.03, yl, z0], [xw, y - 0.02, z1]);
    kit.boxMM("metal", [xw - 0.04, y - 0.02, z0], [xw + 0.06, y + 0.005, z1], { color: PALETTE.steel, texel: 2 });
    for (const [za, zb] of [[z0 + 0.3, aisle[0] - 0.05], [aisle[1] + 0.05, z1 - 0.3]]) kit.boxMM("emitBlueSoft", [xw - 0.035, y - 0.09, za], [xw - 0.025, y - 0.05, zb], { uv: "keep" });
    // aisle stair down onto the next tier, with satin stringers and a hazard nosing at the top
    kit.stairs("deck", xw - 0.72, aisle[0], xw, aisle[1], yl, y, "x", { color: PALETTE.impGreyDark });
    for (const z of aisle) kit.boxMM("satinBlack", [xw - 0.74, yl, z - 0.025], [xw + 0.02, y + 0.02, z + 0.025]);
    kit.boxMM("hazard", [xw - 0.12, y + 0.001, aisle[0]], [xw, y + 0.006, aisle[1]], { texel: 2 });
  }
  // wall bands below the panelled walls (the shell's panels start at y0): west wall + side walls of the pit
  const band = (min, max) => {
    kit.boxMM("painted", min, max, { color: PALETTE.gunmetal, uv: "world", texel: 0.8 });
  };
  band([x0 - wt, L2, z0 - wt], [x0 + 0.03, y0 + 0.01, z1 + wt]);
  band([x0 - wt, L2, z0 - wt], [-7.8, y0 + 0.01, z0 + 0.03]);
  band([x0 - wt, L2, z1 - 0.03], [-7.8, y0 + 0.01, z1 + wt]);
  kit.boxMM("metal", [x0, y0 - 0.01, z0], [x0 + 0.05, y0 + 0.02, z1], { color: PALETTE.steel, texel: 2 });
  kit.boxMM("metal", [x0, y0 - 0.01, z0], [-7.8, y0 + 0.02, z0 + 0.05], { color: PALETTE.steel, texel: 2 });
  kit.boxMM("metal", [x0, y0 - 0.01, z1 - 0.05], [-7.8, y0 + 0.02, z1], { color: PALETTE.steel, texel: 2 });
  kit.boxMM("emitBlueSoft", [x0 + 0.03, L2 + 0.05, z0 + 0.3], [x0 + 0.04, L2 + 0.09, z1 - 0.3], { uv: "keep" });
  kit.boxMM("emitBlueSoft", [x0 + 0.3, L2 + 0.05, z0 + 0.03], [-13.4, L2 + 0.09, z0 + 0.04], { uv: "keep" });
  kit.boxMM("emitBlueSoft", [x0 + 0.3, L2 + 0.05, z1 - 0.04], [-13.4, L2 + 0.09, z1 - 0.03], { uv: "keep" });

  // ------------------------------------------------------------ ceiling, channels, downlights
  ceilingPlate(kit, room, yTop);
  for (const z of [529.4, 536.6]) {
    kit.box("satinBlack", (x0 + x1) / 2, yTop - 0.03, z, 16.4, 0.06, 0.3);
    kit.box("emitBlueSoft", (x0 + x1) / 2, yTop - 0.06, z, 16.2, 0.02, 0.18, { uv: "keep" });
  }
  // six strong downlights over the seating and stage (the dark deck and teal fabric swallow light), a
  // can pair over the landing by the door, small cans over the banners, and the screen's own glow
  for (const x of [-15.6, -11.2, -6.8]) for (const z of [530.4, 535.6]) {
    downlight(kit, x, yTop, z, "emitCoolSoft", 0.11);
    ctx.lights.cool.push(pointLight(0xc4d6ff, 15, 15, [x, yTop - 0.35, z]));
  }
  for (const z of [531.5, 534.5]) downlight(kit, -3.4, yTop, z, "emitCoolSoft", 0.1);
  ctx.lights.cool.push(pointLight(0xdfe8ff, 8, 10, [-3.4, yTop - 0.3, 533]));
  for (const z of [528.2, 537.8]) {
    downlight(kit, x0 + 0.8, yTop, z, "emitCoolSoft", 0.09);
    ctx.lights.cool.push(pointLight(0xdfe8ff, 5, 7, [x0 + 0.8, yTop - 0.3, z]));
  }
  ctx.lights.cool.push(pointLight(0x7fb0ff, 8, 12, [x0 + 0.8, y0 + 1.6, 533]));

  // ------------------------------------------------------------ holo-screen wall (west) between two banners
  {
    const f = fW;
    const uc = 7.0; // z = 533
    f.box("satinBlack", uc, 1.0, 0.07, 7.4, 3.3, 0.14);
    f.box("metal", uc, 1.0, 0.142, 7.2, 3.1, 0.006, { color: PALETTE.darkMetal, texel: 2 });
    f.box("screen4", uc, 1.05, 0.148, 4.4, 2.4, 0.006, { uv: "keep" });
    for (const u of [4.3, 9.7]) {
      f.box("screen7", u, 1.75, 0.148, 1.5, 1.1, 0.006, { uv: "keep" });
      f.box("screen9", u, 0.4, 0.148, 1.5, 1.0, 0.006, { uv: "keep" });
      f.box("satinBlack", u, 1.13, 0.152, 1.54, 0.04, 0.008);
    }
    for (const u of [5.1, 8.9]) f.box("satinBlack", u, 1.05, 0.152, 0.06, 2.44, 0.008);
    for (let k = 0; k < 10; k++) f.box(k % 3 === 1 ? "emitAmber" : "emitBlue", 3.7 + k * 0.72, 2.5, 0.145, 0.16, 0.03, 0.01);
    f.box("leds", uc, -0.36, 0.145, 6.8, 0.04, 0.01, { uv: "keep" });
    // base cabinet standing on the stage floor, steel top, vent slots
    f.box("satinBlack", uc, -0.46, 0.16, 7.4, 0.52, 0.32);
    f.box("metal", uc, -0.2, 0.17, 7.5, 0.03, 0.34, { color: PALETTE.steel, texel: 2 });
    for (let u = 4.0; u < 10.1; u += 0.6) for (let k = 0; k < 4; k++) f.box("metal", u, -0.62 + k * 0.06, 0.325, 0.4, 0.015, 0.01, { color: PALETTE.gunmetal });
    f.collider(3.2, 10.8, -0.72, 2.7, 0, 0.36, "holoWall");
    // banners: rod on brackets, dark red fabric, cream heraldic plate with the ship's motto, weighted hem
    for (const u of [2.2, 11.8]) {
      f.cylU("metal", u, 2.95, 0.22, 0.02, 1.2, { color: PALETTE.steel, segments: 8 });
      for (const du of [-0.55, 0.55]) f.box("metal", u + du, 2.95, 0.11, 0.05, 0.05, 0.22, { color: PALETTE.gunmetal });
      f.box("fabric", u, 1.55, 0.22, 0.92, 2.75, 0.03, { color: PALETTE.fabricOrange, uv: "world", texel: 1.2 });
      f.box("fabric", u, 0.4, 0.24, 0.92, 0.1, 0.012, { color: PALETTE.fabricCream, uv: "world", texel: 1.2 });
      f.box("fabric", u, 0.22, 0.24, 0.92, 0.04, 0.012, { color: PALETTE.fabricCream, uv: "world", texel: 1.2 });
      stencil(f, u, 2.1, 0.5, 14, { color: PALETTE.cream, n: 0.236, mat: "fabric" });
      f.box("satinBlack", u, 0.15, 0.22, 0.96, 0.06, 0.05);
      f.collider(u - 0.5, u + 0.5, -0.72, 3.0, 0, 0.3, "banner");
    }
    wallLightBar(f, 0.5, 13.5, 3.1, "emitCoolSoft");
  }

  // ------------------------------------------------------------ stage: dais with lectern, holo-projector with cone + wire-frame wedge
  {
    // dais (one 0.16 m step) under the lectern, stage right
    const dx0 = -18.6;
    const dx1 = -16.6;
    const dz0 = 534.6;
    const dz1 = 536.6;
    kit.boxMM("deck", [dx0, L2, dz0], [dx1, L2 + 0.16, dz1], deckOpts);
    kit.floor(dx0, dz0, dx1, dz1, L2 + 0.16);
    kit.boxMM("satinBlack", [dx0 - 0.02, L2, dz0 - 0.02], [dx1 + 0.02, L2 + 0.14, dz0 + 0.02]);
    kit.boxMM("satinBlack", [dx1, L2, dz0 - 0.02], [dx1 + 0.02, L2 + 0.14, dz1 + 0.02]);
    kit.boxMM("satinBlack", [dx0 - 0.02, L2, dz1], [dx1 + 0.02, L2 + 0.14, dz1 + 0.02]);
    kit.boxMM("hazard", [dx0, L2 + 0.161, dz0], [dx1, L2 + 0.166, dz0 + 0.08], { texel: 3 });
    kit.boxMM("hazard", [dx1 - 0.08, L2 + 0.161, dz0], [dx1, L2 + 0.166, dz1], { texel: 3 });
    const lx = -17.6;
    const lz = 535.6;
    const f = standFrame(kit, lx, L2 + 0.16, lz, "+x");
    f.box("satinBlack", 0, 0.55, 0, 0.72, 1.1, 0.5);
    f.box("metal", 0, 0.03, 0, 0.8, 0.06, 0.6, { color: PALETTE.darkMetal, texel: 2 });
    f.box("painted", 0, 0.6, 0.255, 0.56, 0.7, 0.01, { color: PALETTE.creamDark, uv: "keep" });
    stencil(f, 0, 0.62, 0.36, 14, { color: PALETTE.orange, n: 0.26 });
    f.box("emitBlue", 0, 1.02, 0.257, 0.5, 0.025, 0.01);
    f.box("satinBlack", 0, 1.14, -0.02, 0.78, 0.06, 0.56, { tilt: 0.3 });
    f.box("screen9", 0, 1.17, -0.03, 0.44, 0.26, 0.01, { tilt: 0.3, uv: "keep" });
    f.box("leds", 0, 1.13, 0.2, 0.5, 0.03, 0.01, { tilt: 0.3, uv: "keep" });
    f.cylV("metal", 0.28, 1.34, -0.14, 0.008, 0.36, { color: PALETTE.steel, segments: 6 });
    f.box("rubber", 0.28, 1.53, -0.14, 0.03, 0.05, 0.03, { color: PALETTE.rubber });
    kit.collider([lx - 0.32, L2, lz - 0.42], [lx + 0.32, L2 + 1.4, lz + 0.42], "lectern");
    downlight(kit, lx, yTop, lz, "emitCoolSoft", 0.11);
    ctx.lights.cool.push(pointLight(0xdfe8ff, 6, 9, [lx, yTop - 0.4, lz]));
  }
  {
    const px = -16.0;
    const pz = 533.0;
    const py = L2;
    // base: cast drum on a plinth, steel bezel, blue emitter ring and lens, side status strips
    kit.cyl("metal", px, py + 0.03, pz, 0.62, 0.06, "y", { color: PALETTE.darkMetal, segments: 28 });
    kit.cyl("satinBlack", px, py + 0.2, pz, 0.46, 0.34, "y", { segments: 28 });
    kit.cyl("metal", px, py + 0.38, pz, 0.4, 0.03, "y", { color: PALETTE.steel, segments: 28 });
    kit.add("emitBlue", new THREE.TorusGeometry(0.32, 0.022, 8, 36), { pos: [px, py + 0.39, pz], rot: [Math.PI / 2, 0, 0] });
    kit.cyl("emitBlue", px, py + 0.395, pz, 0.12, 0.02, "y", { segments: 18 });
    kit.cyl("darkGloss", px, py + 0.41, pz, 0.09, 0.01, "y", { segments: 18 });
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
      kit.box("leds", px + Math.cos(a) * 0.4, py + 0.22, pz + Math.sin(a) * 0.4, 0.22, 0.03, 0.01, { rot: [0, -a + Math.PI / 2, 0], uv: "keep" });
      kit.box("metal", px + Math.cos(a) * 0.5, py + 0.08, pz + Math.sin(a) * 0.5, 0.16, 0.1, 0.12, { rot: [0, -a + Math.PI / 2, 0], color: PALETTE.gunmetal });
    }
    kit.boxMM("hazard", [px - 0.75, py + 0.001, pz - 0.75], [px + 0.75, py + 0.006, pz - 0.68], { texel: 3 });
    kit.boxMM("hazard", [px - 0.75, py + 0.001, pz + 0.68], [px + 0.75, py + 0.006, pz + 0.75], { texel: 3 });
    kit.collider([px - 0.62, py, pz - 0.62], [px + 0.62, py + 0.42, pz + 0.62], "projector");
    // projection cone (visible, two nested shells) and a faint disc where the image sits
    const coneMat = holoMaterial(0x3a78e0, 0.07);
    const cone = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 0.12, 2.0, 32, 1, true), coneMat);
    cone.position.set(px, py + 0.42 + 1.0, pz);
    const innerMat = holoMaterial(0x6fa8ff, 0.05);
    const inner = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.1, 1.5, 24, 1, true), innerMat);
    inner.position.set(px, py + 0.42 + 0.75, pz);
    const discMat = holoMaterial(0x7fb8ff, 0.12);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(0.9, 36).rotateX(-Math.PI / 2), discMat);
    disc.position.set(px, py + 1.45, pz);
    // wire-frame wedge: hull edges as thin boxes, solid tower / bridge / engine details
    const wire = [];
    const edge = (a, b, t = 0.014) => {
      const A = new THREE.Vector3(...a);
      const B = new THREE.Vector3(...b);
      const d = new THREE.Vector3().subVectors(B, A);
      const g = new THREE.BoxGeometry(t, d.length(), t);
      g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, d.clone().normalize()));
      g.translate((A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2);
      wire.push(g);
    };
    const N = [0, 0.02, -1.0];
    const SL = [-0.6, 0, 0.7];
    const SR = [0.6, 0, 0.7];
    const UL = [-0.38, 0.17, 0.7];
    const UR = [0.38, 0.17, 0.7];
    const TB = [0, 0.2, 0.4];
    const TS = [0, 0.17, 0.7];
    edge(N, SL);
    edge(N, SR);
    edge(SL, SR);
    edge(N, UL);
    edge(N, UR);
    edge(UL, UR);
    edge(SL, UL);
    edge(SR, UR);
    edge(N, TB, 0.01);
    edge(TB, TS, 0.01);
    // frame lines across the hull (bottom cross-members and side ribs), thinner than the outline
    for (const t of [0.35, 0.6]) {
      const z = -1.0 + 1.7 * t;
      const w = 0.6 * t;
      edge([-w, 0, z], [w, 0, z], 0.008);
    }
    for (const dz of [0.15, 0.4]) {
      const t = (dz + 1.0) / 1.7;
      const w = 0.6 * t;
      edge([-w, 0.005, dz], [-w * 0.6, 0.17 * t, dz], 0.008);
      edge([w, 0.005, dz], [w * 0.6, 0.17 * t, dz], 0.008);
    }
    const tower = new THREE.BoxGeometry(0.16, 0.16, 0.16);
    tower.translate(0, 0.28, 0.42);
    const neck = new THREE.BoxGeometry(0.1, 0.08, 0.1);
    neck.translate(0, 0.4, 0.42);
    const bridge = new THREE.BoxGeometry(0.44, 0.05, 0.12);
    bridge.translate(0, 0.46, 0.42);
    const globes = [-0.15, 0.15].map((x) => new THREE.SphereGeometry(0.035, 10, 6).translate(x, 0.52, 0.42));
    const engines = [-0.3, 0, 0.3].map((x) => new THREE.TorusGeometry(0.055, 0.01, 6, 16).translate(x, 0.07, 0.72));
    const wedgeMat = holoMaterial(0x9fd0ff, 0.85);
    const wedge = new THREE.Mesh(mergeGeometries([...wire, tower, neck, bridge, ...globes, ...engines], false), wedgeMat);
    wedge.position.set(px, py + 1.5, pz);
    const ringMat = holoMaterial(0x4a8dff, 0.45);
    const rings = new THREE.Mesh(mergeGeometries([new THREE.TorusGeometry(0.55, 0.008, 6, 48).rotateX(Math.PI / 2), new THREE.TorusGeometry(0.85, 0.006, 6, 56).rotateX(Math.PI / 2)], false), ringMat);
    rings.position.set(px, py + 1.2, pz);
    const group = new THREE.Group();
    group.name = "holoProjector";
    group.add(cone, inner, disc, wedge, rings);
    for (const m of group.children) m.castShadow = m.receiveShadow = false;
    const glow = pointLight(0x4a8dff, 3.0, 8, [px, py + 1.4, pz]);
    ctx.lights.teal.push(glow);
    const glowBase = glow.intensity;
    let t = 0;
    ctx.dynamic.push({
      object: group,
      update(dt) {
        t += dt;
        wedge.rotation.y = t * 0.3;
        rings.rotation.y = -t * 0.15;
        const p = 0.5 + 0.5 * Math.sin(t * 0.9);
        coneMat.opacity = 0.055 + 0.03 * p;
        innerMat.opacity = 0.04 + 0.03 * (1 - p);
        wedgeMat.opacity = 0.72 + 0.22 * p;
        wedge.position.y = py + 1.5 + 0.03 * Math.sin(t * 0.7);
        glow.intensity = glowBase * (0.75 + 0.25 * p);
      },
    });
  }

  // ------------------------------------------------------------ tiers: ledges with modesty panels and personal displays, benches
  const segs = [[z0 + 0.4, aisle[0] - 0.15], [aisle[1] + 0.15, z1 - 0.4]];
  for (const { xw, y } of tiers) {
    for (const [za, zb] of segs) {
      const zc = (za + zb) / 2;
      const len = zb - za;
      // writing ledge at the tier's front edge: satin top, steel nosing, painted modesty panel with a
      // teal stripe, LED strip, pedestal legs
      kit.boxMM("satinBlack", [xw + 0.04, y + 0.73, za], [xw + 0.46, y + 0.77, zb]);
      kit.boxMM("metal", [xw + 0.04, y + 0.77, za], [xw + 0.09, y + 0.785, zb], { color: PALETTE.steel, texel: 2 });
      kit.boxMM("painted", [xw + 0.04, y + 0.02, za], [xw + 0.09, y + 0.73, zb], { color: PALETTE.creamDark, uv: "world", texel: 0.8 });
      kit.boxMM("painted", [xw + 0.03, y + 0.36, za], [xw + 0.04, y + 0.42, zb], { color: PALETTE.tealPaint, uv: "keep" });
      kit.boxMM("leds", [xw + 0.03, y + 0.66, za + 0.2], [xw + 0.04, y + 0.69, zb - 0.2], { uv: "keep" });
      for (let z = za + 0.3; z < zb; z += 2.2) kit.boxMM("satinBlack", [xw + 0.1, y, z], [xw + 0.4, y + 0.73, z + 0.08]);
      // displays tilted toward the seats (frame runs along the ledge, normal toward +x)
      const lf = new Frame(kit, new THREE.Vector3(xw + 0.25, y + 0.77, zb), new THREE.Vector3(0, 0, -1), UP);
      for (let u = 0.6; u < len - 0.3; u += 1.15) {
        lf.box("darkGloss", u, 0.13, 0.0, 0.36, 0.24, 0.02, { tilt: -0.55 });
        lf.box("screen4", u, 0.135, 0.012, 0.32, 0.2, 0.004, { tilt: -0.55, uv: "keep" });
        lf.box("leds", u, 0.01, 0.06, 0.3, 0.016, 0.06, { uv: "keep" });
      }
      kit.collider([xw, y, za], [xw + 0.5, y + 0.82, zb], "ledge");
      bench(kit, "z", zc, xw + 1.05, y, len, { facing: -1, depth: 0.5, color: PALETTE.fabricTeal });
    }
  }
  // seat-row numbers stencilled on the aisle ends of the benches' plinths
  for (const { xw, y } of tiers) for (const z of aisle) {
    const f = new Frame(kit, new THREE.Vector3(xw + 1.05, y, z), new THREE.Vector3(z < 533 ? 1 : -1, 0, 0), UP);
    f.box("leds", 0, 0.2, 0.03, 0.3, 0.02, 0.006, { uv: "keep" });
  }

  // ------------------------------------------------------------ overhead projector truss over the aisle
  {
    const ty = yTop - 0.5;
    kit.boxMM("satinBlack", [-14.4, ty - 0.11, 532.89], [-5.6, ty + 0.11, 533.11]);
    for (const x of [-12.6, -7.4]) kit.boxMM("satinBlack", [x - 0.08, ty - 0.08, 530.0], [x + 0.08, ty + 0.08, 536.0]);
    for (const x of [-13.8, -10.0, -6.2]) kit.boxMM("satinBlack", [x - 0.03, ty + 0.1, 532.97], [x + 0.03, yTop, 533.03]);
    for (const x of [-12.6, -7.4]) for (const z of [530.1, 535.9]) kit.boxMM("satinBlack", [x - 0.03, ty + 0.08, z - 0.03], [x + 0.03, yTop, z + 0.03]);
    kit.cyl("rubber", -10.0, ty - 0.16, 533.15, 0.02, 8.6, "x", { color: PALETTE.rubber, segments: 6 });
    // main projector aimed west at the screen wall, a tracking camera unit and two truss downlights
    const pxr = -8.6;
    kit.box("paintedMetal", pxr, ty - 0.32, 533, 0.74, 0.34, 0.52, { color: PALETTE.darkMetal, texel: 2 });
    kit.box("painted", pxr, ty - 0.32, 533, 0.6, 0.26, 0.46, { color: PALETTE.slate, uv: "keep" });
    kit.cyl("darkGloss", pxr - 0.4, ty - 0.32, 533, 0.1, 0.1, "x", { segments: 16 });
    kit.add("emitBlue", new THREE.TorusGeometry(0.1, 0.012, 6, 24), { pos: [pxr - 0.45, ty - 0.32, 533], rot: [0, Math.PI / 2, 0] });
    kit.box("leds", pxr, ty - 0.35, 533.27, 0.3, 0.03, 0.006, { uv: "keep" });
    kit.box("emitTeal", pxr + 0.2, ty - 0.35, 532.73, 0.03, 0.03, 0.006);
    kit.box("paintedMetal", -13.6, ty - 0.24, 533, 0.4, 0.2, 0.3, { color: PALETTE.darkMetal, texel: 2 });
    kit.cyl("darkGloss", -13.82, ty - 0.24, 533, 0.06, 0.06, "x", { segments: 12 });
    kit.box("emitRed", -13.84, ty - 0.24, 533.1, 0.01, 0.02, 0.02);
    for (const x of [-12.6, -7.4]) for (const z of [530.6, 535.4]) {
      kit.cyl("satinBlack", x, ty - 0.2, z, 0.14, 0.24, "y", { segments: 14 });
      kit.cyl("emitCoolSoft", x, ty - 0.325, z, 0.11, 0.012, "y", { segments: 14, uv: "keep" });
    }
  }

  // ------------------------------------------------------------ landing behind the top row: sign-in kiosk, bench, lockers, door wall
  {
    // sign-in kiosk right of the door
    const kx = -3.3;
    const kz = 530.6;
    const f = standFrame(kit, kx, y0, kz, "+z");
    f.box("satinBlack", 0, 0.55, 0, 0.5, 1.1, 0.36);
    f.box("metal", 0, 0.03, 0, 0.6, 0.06, 0.46, { color: PALETTE.darkMetal, texel: 2 });
    f.box("satinBlack", 0, 1.14, 0.02, 0.54, 0.06, 0.4, { tilt: 0.5 });
    f.box("screen9", 0, 1.17, 0.03, 0.4, 0.26, 0.01, { tilt: 0.5, uv: "keep" });
    f.box("leds", 0, 0.9, 0.185, 0.4, 0.03, 0.01, { uv: "keep" });
    f.box("emitBlue", 0.18, 1.05, 0.185, 0.04, 0.04, 0.01);
    kit.collider([kx - 0.3, y0, kz - 0.25], [kx + 0.3, y0 + 1.3, kz + 0.25], "kiosk");
    // door wall (+x): technician console forward of the door, waiting bench + lockers aft of it
    wallConsole(fX, 2.6, 1.6, "screen10");
    stencil(fX, 2.6, 2.0, 0.42, 9, { color: PALETTE.creamDark });
    wallLightBar(fX, 0.5, 5.6, 2.7, "emitCoolSoft");
    bench(kit, "z", 536.0, x1 - 0.3, y0, 2.4, { facing: -1, depth: 0.5, color: PALETTE.fabricTeal });
    stencil(fX, 10.0, 1.7, 0.5, 0, { color: PALETTE.creamDark });
    locker(fX, 12.0, 0.9, 2.1, { color: PALETTE.cream, band: PALETTE.tealPaint, decal: 6 });
    locker(fX, 13.0, 0.9, 2.1, { color: PALETTE.creamDark, band: PALETTE.tealPaint, decal: 9 });
    wallLightBar(fX, 8.4, 13.6, 2.7, "emitCoolSoft");
  }

  // ------------------------------------------------------------ side walls, stepped with the tiers
  {
    // forward wall (-z): stage-level technician console + sector map, tier panels, landing comm panel
    const fN2 = lower(fN, -0.72);
    wallConsole(fN2, 2.4, 1.6, "screen8");
    stencil(fN2, 2.4, 2.0, 0.42, 6, { color: PALETTE.creamDark });
    fN2.box("satinBlack", 5.2, 2.05, 0.04, 2.2, 1.3, 0.08);
    fN2.box("screen7", 5.2, 2.05, 0.082, 2.04, 1.14, 0.006, { uv: "keep" });
    fN2.box("leds", 5.2, 1.32, 0.05, 1.8, 0.04, 0.02, { uv: "keep" });
    fN2.collider(4.0, 6.4, 1.3, 2.8, 0, 0.1, "map");
    wallLightBar(fN2, 0.5, 6.4, 3.1, "emitCoolSoft");
    fN2.box("metal", 8.0, 1.5, 0.06, 1.8, 1.1, 0.12, { color: PALETTE.gunmetal, texel: 1.5 });
    for (let k = 0; k < 6; k++) fN2.box(k % 2 ? "emitBlue" : "emitAmber", 7.4 + (k % 3) * 0.2, 1.8 - Math.floor(k / 3) * 0.16, 0.125, 0.1, 0.06, 0.01);
    fN2.box("leds", 8.4, 1.5, 0.125, 0.8, 0.04, 0.01, { uv: "keep" });
    for (let k = 0; k < 6; k++) fN2.box("metal", 8.0, 1.05 + k * 0.06, 0.07, 1.4, 0.02, 0.06, { color: PALETTE.steel, tilt: 0.5 });
    fN2.collider(7.0, 9.0, 0.9, 2.1, 0, 0.15, "panel");
    wallLightBar(fN2, 6.8, 9.2, 2.7, "emitCoolSoft");
    const fN1 = lower(fN, -0.36);
    fN1.box("satinBlack", 10.8, 1.75, 0.04, 2.0, 0.9, 0.08);
    fN1.box("screen4", 10.4, 1.75, 0.082, 1.0, 0.7, 0.006, { uv: "keep" });
    for (let k = 0; k < 4; k++) fN1.box(k % 2 ? "emitBlue" : "emitWhite", 11.35, 2.02 - k * 0.14, 0.082, 0.14, 0.05, 0.006);
    fN1.box("leds", 10.8, 1.22, 0.05, 1.6, 0.04, 0.02, { uv: "keep" });
    fN1.collider(9.7, 11.9, 1.2, 2.3, 0, 0.1, "commPanel");
    wallLightBar(fN1, 9.6, 12.0, 2.7, "emitCoolSoft");
    stencil(fN, 13.4, 1.7, 0.5, 14, { color: PALETTE.cream });
    stencil(fN, 14.9, 1.7, 0.42, 12, { color: PALETTE.creamDark });
    fN.box("metal", 16.6, 1.2, 0.08, 1.4, 1.4, 0.16, { color: PALETTE.gunmetal, texel: 1.5 });
    fN.box("painted", 16.6, 1.2, 0.165, 1.2, 1.2, 0.01, { color: PALETTE.impRed, uv: "keep" });
    stencil(fN, 16.6, 1.45, 0.5, 13, { color: PALETTE.cream, n: 0.17 });
    fN.box("metal", 16.6, 0.85, 0.19, 0.5, 0.05, 0.05, { color: PALETTE.steel });
    fN.box("emitRed", 17.1, 1.75, 0.172, 0.05, 0.05, 0.01);
    fN.collider(15.8, 17.4, 0, 2.0, 0, 0.2, "fireCabinet");
    wallLightBar(fN, 12.6, 17.6, 2.7, "emitCoolSoft");
  }
  {
    // aft wall (+z): landing panels, tier vents, stage-level data rack and console
    fS.box("satinBlack", 2.6, 1.75, 0.04, 2.4, 1.1, 0.08);
    fS.box("screen1", 2.1, 1.75, 0.082, 1.2, 0.9, 0.006, { uv: "keep" });
    for (let k = 0; k < 6; k++) fS.box(k % 2 ? "emitBlue" : "emitAmber", 3.1 + (k % 2) * 0.24, 2.1 - Math.floor(k / 2) * 0.2, 0.082, 0.16, 0.08, 0.006);
    fS.box("leds", 2.6, 1.12, 0.05, 2.0, 0.04, 0.02, { uv: "keep" });
    fS.collider(1.3, 3.9, 1.1, 2.4, 0, 0.1, "statusPanel");
    stencil(fS, 4.6, 1.75, 0.5, 0, { color: PALETTE.creamDark });
    wallLightBar(fS, 0.5, 5.5, 2.7, "emitCoolSoft");
    const fS1 = lower(fS, -0.36);
    for (let k = 0; k < 2; k++) {
      const u = 6.6 + k * 1.1;
      fS1.box("metal", u, 1.6, 0.06, 0.9, 1.2, 0.12, { color: PALETTE.gunmetal, texel: 1.5 });
      for (let s = 0; s < 8; s++) fS1.box("metal", u, 1.15 + s * 0.1, 0.09, 0.7, 0.02, 0.08, { color: PALETTE.steel, tilt: 0.5 });
      fS1.box("painted", u, 2.05, 0.125, 0.7, 0.2, 0.01, { color: PALETTE.creamDark, uv: "keep" });
      fS1.box(k ? "emitTeal" : "emitOrange", u + 0.25, 2.05, 0.132, 0.03, 0.03, 0.01);
    }
    fS1.collider(6.0, 8.3, 0, 2.3, 0, 0.15, "vents");
    wallLightBar(fS1, 5.9, 8.4, 2.7, "emitCoolSoft");
    const fS2 = lower(fS, -0.72);
    fS2.box("satinBlack", 9.8, 1.7, 0.04, 1.6, 1.2, 0.08);
    fS2.box("screen10", 9.8, 1.9, 0.082, 1.4, 0.6, 0.006, { uv: "keep" });
    for (let k = 0; k < 8; k++) fS2.box(k % 3 ? "emitBlue" : "emitAmber", 9.25 + k * 0.16, 1.35, 0.082, 0.1, 0.05, 0.006);
    fS2.box("leds", 9.8, 1.2, 0.05, 1.3, 0.04, 0.02, { uv: "keep" });
    fS2.collider(8.9, 10.7, 1.0, 2.4, 0, 0.1, "dataPanel");
    wallLightBar(fS2, 8.8, 10.8, 2.7, "emitCoolSoft");
    locker(fS2, 12.2, 0.9, 2.2, { color: PALETTE.creamDark, band: PALETTE.tealPaint, decal: 9 });
    locker(fS2, 13.2, 0.9, 2.2, { color: PALETTE.cream, band: PALETTE.tealPaint, decal: 6 });
    wallConsole(fS2, 15.6, 1.6, "screen4");
    stencil(fS2, 15.6, 2.0, 0.42, 12, { color: PALETTE.creamDark });
    stencil(fS2, 17.2, 1.7, 0.42, 1, { color: PALETTE.cream });
    wallLightBar(fS2, 11.4, 17.6, 3.1, "emitCoolSoft");
  }
  return shell;
}
