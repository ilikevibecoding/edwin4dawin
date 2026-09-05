// Tactical operations: a dim blue planning room. Central holo-table whose emitter dish throws a visible
// projection cone up into a hologram volume (target rings, a wireframe wedge cruiser, a ringed planet,
// a scanning plane) that turns slowly and lights the consoles round it; a fleet-status wall of mixed
// displays over a console counter; six edge-lit standing consoles ringing the table; a raised officers'
// step along the aft wall; a coffered ceiling with a lit rim over the table so the upper half of the
// room reads; red status lamps as the only warm accent.
import * as THREE from "three";
import { roomShell, wallConsole, wallLightBar } from "../shell.js";
import { pointLight, WALL_T } from "../lib.js";
import { PALETTE as P } from "../../materials.js";
import { customWall, wallScreen, cabinet, podium, chair, handrail, floorStrip, stencil, effects, downlight } from "./commandKit.js";

export function build(kit, ctx, room) {
  const shell = roomShell(kit, ctx, room, { style: "light", skipWalls: ["-z"], ceiling: false, lights: false, seed: 11 });
  const y0 = shell.y0;
  const { x0, x1, z0, z1, height: h } = room;
  const yTop = y0 + h;
  const cx = (x0 + x1) / 2; // -13
  const cz = (z0 + z1) / 2; // 511
  const W = x1 - x0;
  const T = WALL_T;

  // ------------------------------------------------------------ ceiling: lighter plate, beams, lit coffer over the table
  kit.boxMM("painted", [x0 - T, yTop, z0 - T], [x1 + T, yTop + 0.12, z1 + T], { color: P.slate, uv: "world", texel: 0.5 });
  for (const bz of [506.2, 515.8]) kit.box("paintedMetal", cx, yTop - 0.12, bz, W, 0.24, 0.3, { color: P.darkMetal, texel: 1.2 });
  for (const bx of [-19.6, -6.4]) kit.box("paintedMetal", bx, yTop - 0.12, cz, 0.3, 0.24, z1 - z0, { color: P.darkMetal, texel: 1.2 });
  // coffer: hanging black frame with a blue rim on its inner faces and underside, darker inner plate
  const cw = 4.8;
  const cd = 3.6;
  for (const s of [-1, 1]) {
    kit.box("satinBlack", cx, yTop - 0.11, cz + s * (cd / 2 - 0.1), cw, 0.22, 0.2);
    kit.box("emitBlueSoft", cx, yTop - 0.225, cz + s * (cd / 2 - 0.1), cw - 0.5, 0.01, 0.12, { uv: "keep" });
    kit.box("emitBlue", cx, yTop - 0.16, cz + s * (cd / 2 - 0.205), cw - 0.44, 0.03, 0.01);
    kit.box("satinBlack", cx + s * (cw / 2 - 0.1), yTop - 0.11, cz, 0.2, 0.22, cd - 0.4);
    kit.box("emitBlueSoft", cx + s * (cw / 2 - 0.1), yTop - 0.225, cz, 0.12, 0.01, cd - 0.8, { uv: "keep" });
    kit.box("emitBlue", cx + s * (cw / 2 - 0.205), yTop - 0.16, cz, 0.01, 0.03, cd - 0.44);
  }
  kit.box("paintedMetal", cx, yTop - 0.01, cz, cw - 0.4, 0.02, cd - 0.4, { color: P.darkMetal, texel: 1 });
  // cool light channels either side of the coffer, blue downlights over the consoles and the step
  for (const lz of [508.2, 513.8]) {
    kit.box("satinBlack", cx, yTop - 0.03, lz, W - 1.4, 0.06, 0.46);
    kit.box("emitCoolSoft", cx, yTop - 0.06, lz, W - 1.6, 0.02, 0.34, { uv: "keep" });
  }
  for (const [dx, dz] of [[cx - 2.6, cz - 3.4], [cx + 2.6, cz - 3.4], [cx - 2.6, cz + 3.4], [cx + 2.6, cz + 3.4], [cx - 4.6, cz], [cx + 4.6, cz]]) downlight(kit, dx, yTop, dz, 0.6, 0.6, "emitBlueSoft");
  downlight(kit, cx - 5, yTop, z1 - 1.3, 0.6, 0.25, "emitBlueSoft");
  downlight(kit, cx + 5, yTop, z1 - 1.3, 0.6, 0.25, "emitBlueSoft");
  downlight(kit, x1 - 2.2, yTop, cz, 0.6, 1.2, "emitCoolSoft");

  // ------------------------------------------------------------ fleet-status wall (forward, -z)
  const fleet = customWall(kit, room, "-z", y0, { styles: { panel: 0.92, strip: 0.08 }, paints: [[P.gunmetal, 0.7], [P.slate, 0.3]], seed: 41 });
  const F = fleet.frame; // u = x - x0, 0..22
  const big = ["screen7", "screen8", "screen4"];
  [5, 11, 17].forEach((u, i) => {
    wallScreen(F, u, 2.27, 3.4, 1.7, big[i], { leds: false });
    F.box("emitRed", u - 1.78, 3.2, 0.05, 0.05, 0.05, 0.02);
    F.box("emitRed", u + 1.78, 3.2, 0.05, 0.05, 0.05, 0.02);
  });
  const consoleMats = ["screen3", "screen9", "screen4", "screen8"];
  for (let k = 0; k < 8; k++) {
    wallConsole(F, 3.25 + 2.15 * k, 1.4, consoleMats[k % 4]);
    if (k < 7) F.box("leds", 4.325 + 2.15 * k, 0.9, 0.03, 0.5, 0.035, 0.01, { uv: "keep" });
  }
  for (const u of [1.3, 20.7]) {
    for (let r = 0; r < 3; r++) wallScreen(F, u, 1.45 + r * 0.62, 0.9, 0.42, ["screen0", "screen8", "screen1"][r], { bezel: 0.04, housing: 0.06 });
    F.box("satinBlack", u, 3.2, 0.03, 1.1, 0.16, 0.06);
    F.box("emitBlueSoft", u, 3.2, 0.062, 1.0, 0.08, 0.01, { uv: "keep" });
  }
  F.box("satinBlack", 11, 3.18, 0.02, 18.4, 0.05, 0.04);

  // ------------------------------------------------------------ side walls
  const Wf = shell.frames["-x"].frame; // u = z1 - z, 0..18
  wallScreen(Wf, 9, 1.95, 4.0, 2.0, "screen8", { leds: true });
  Wf.box("emitRed", 6.8, 3.0, 0.04, 0.05, 0.05, 0.02);
  Wf.box("emitRed", 11.2, 3.0, 0.04, 0.05, 0.05, 0.02);
  cabinet(Wf, 2.6, 1.5, 2.2, 0.6, { color: P.creamDark, label: 9, lamp: "emitBlue", band: P.tealPaint });
  cabinet(Wf, 15.4, 1.5, 2.2, 0.6, { color: P.creamDark, label: 6, lamp: "emitBlue", band: P.tealPaint });
  wallConsole(Wf, 5.1, 1.4, "screen7");
  wallConsole(Wf, 12.9, 1.4, "screen9");
  wallLightBar(Wf, 0.5, 5.6, 2.95, "emitCoolSoft");
  wallLightBar(Wf, 12.4, 17.5, 2.95, "emitCoolSoft");
  stencil(Wf, 4.6, 2.6, 0.5, 0);
  stencil(Wf, 13.4, 2.6, 0.5, 14);

  const E = shell.frames["+x"].frame; // u = z - z0, 0..18, door at u 8..10
  wallScreen(E, 4, 1.95, 2.2, 1.2, "screen5", { leds: true });
  for (const du of [-1.35, 1.35]) {
    E.box("satinBlack", 4 + du, 1.95, 0.03, 0.14, 1.3, 0.06);
    E.box("emitRed", 4 + du, 1.95, 0.062, 0.06, 1.16, 0.01);
  }
  cabinet(E, 1.15, 1.6, 2.1, 0.5, { color: P.cream, doors: 2, label: 8, lamp: "emitRed" });
  cabinet(E, 16.8, 1.6, 2.1, 0.5, { color: P.cream, doors: 2, label: 1, lamp: "emitBlue" });
  wallConsole(E, 12.4, 1.4, "screen9");
  wallConsole(E, 14.4, 1.4, "screen0");
  wallScreen(E, 13.4, 2.15, 1.6, 0.8, "screen7", { bezel: 0.05 });
  wallLightBar(E, 0.4, 7.4, 2.95, "emitCoolSoft");
  wallLightBar(E, 10.6, 17.6, 2.95, "emitCoolSoft");
  stencil(E, 7.3, 1.9, 0.45, 5);
  stencil(E, 10.7, 1.9, 0.45, 10);

  // ------------------------------------------------------------ holo-table: plinth, body, lit rim, radar inlay, emitter dish
  const tw = 2.6;
  const td = 1.7;
  const yt = y0 + 0.97; // table surface
  kit.box("metal", cx, y0 + 0.04, cz, tw - 0.2, 0.08, td - 0.2, { color: P.darkMetal });
  kit.box("emitBlueSoft", cx, y0 + 0.05, cz, tw - 0.25, 0.02, td - 0.25, { uv: "keep" });
  kit.box("satinBlack", cx, y0 + 0.48, cz, tw, 0.8, td);
  kit.box("satinBlack", cx, y0 + 0.92, cz, tw + 0.1, 0.08, td + 0.1);
  kit.box("darkGloss", cx, y0 + 0.965, cz, tw - 0.2, 0.01, td - 0.2);
  kit.box("screen8", cx, yt + 0.002, cz, tw - 0.5, 0.004, td - 0.5, { uv: "keep" });
  for (const s of [-1, 1]) {
    kit.box("emitBlue", cx, yt, cz + s * (td / 2 - 0.09), tw - 0.2, 0.014, 0.03);
    kit.box("emitBlue", cx + s * (tw / 2 - 0.09), yt, cz, 0.03, 0.014, td - 0.2);
    kit.box("emitBlue", cx, y0 + 0.885, cz + s * (td / 2 + 0.056), tw - 0.3, 0.02, 0.01);
    kit.box("leds", cx, y0 + 0.6, cz + s * (td / 2 + 0.006), 1.8, 0.04, 0.01, { uv: "keep" });
    kit.box("darkGloss", cx - 0.7, y0 + 0.78, cz + s * (td / 2 + 0.008), 0.6, 0.16, 0.012);
    kit.box("screen8", cx - 0.7, y0 + 0.78, cz + s * (td / 2 + 0.016), 0.54, 0.12, 0.004, { uv: "keep" });
    kit.box("darkGloss", cx + 0.7, y0 + 0.78, cz + s * (td / 2 + 0.008), 0.6, 0.16, 0.012);
    kit.box("screen7", cx + 0.7, y0 + 0.78, cz + s * (td / 2 + 0.016), 0.54, 0.12, 0.004, { uv: "keep" });
    kit.box("emitRed", cx + s * 1.05, y0 + 0.78, cz - td / 2 - 0.012, 0.05, 0.05, 0.01);
    // end faces: schematic readouts
    kit.box("darkGloss", cx + s * (tw / 2 + 0.008), y0 + 0.72, cz, 0.012, 0.22, 0.9);
    kit.box("screen9", cx + s * (tw / 2 + 0.016), y0 + 0.72, cz, 0.004, 0.18, 0.84, { uv: "keep" });
  }
  // emitter dish in the middle of the table: black ring, lit lens, steel bezel
  kit.cyl("satinBlack", cx, yt + 0.03, cz, 0.46, 0.06, "y", { segments: 32 });
  kit.cyl("metal", cx, yt + 0.062, cz, 0.44, 0.01, "y", { color: P.steel, segments: 32 });
  kit.cyl("emitBlueSoft", cx, yt + 0.07, cz, 0.36, 0.01, "y", { segments: 32, uv: "keep" });
  kit.add("emitBlue", new THREE.TorusGeometry(0.4, 0.01, 6, 48).rotateX(Math.PI / 2), { pos: [cx, yt + 0.068, cz] });
  kit.collider([cx - tw / 2 - 0.05, y0, cz - td / 2 - 0.05], [cx + tw / 2 + 0.05, y0 + 1.05, cz + td / 2 + 0.05], "holotable");
  buildHologram(ctx, cx, yt + 0.075, cz);

  // ------------------------------------------------------------ standing consoles ringing the table (operators stand outside the ring)
  podium(kit, cx - 2.6, y0, cz - 2.6, "-z", { screen: "screen8", rear: "screen9" });
  podium(kit, cx + 2.6, y0, cz - 2.6, "-z", { screen: "screen7", rear: "screen4" });
  podium(kit, cx - 2.6, y0, cz + 2.6, "+z", { screen: "screen4", rear: "screen7" });
  podium(kit, cx + 2.6, y0, cz + 2.6, "+z", { screen: "screen9", rear: "screen8" });
  podium(kit, cx - 3.9, y0, cz, "-x", { screen: "screen7", rear: "screen8", w: 1.3 });
  podium(kit, cx + 3.9, y0, cz, "+x", { screen: "screen8", rear: "screen7", w: 1.3 });
  // west-end officer chairs facing the table
  chair(kit, cx - 6.4, y0, cz - 1.0, "+x");
  chair(kit, cx - 6.4, y0, cz + 1.0, "+x");

  // guide strips from the door to the table
  floorStrip(kit, [x1 - 1.6, cz - 1.0], [cx + 4.9, cz - 1.0], y0, "emitBlueSoft", { w: 0.04 });
  floorStrip(kit, [x1 - 1.6, cz + 1.0], [cx + 4.9, cz + 1.0], y0, "emitBlueSoft", { w: 0.04 });

  // ------------------------------------------------------------ raised officers' step along the aft wall
  const stepY = y0 + 0.36;
  const sz0 = z1 - 2.6;
  kit.boxMM("deck", [x0 - 0.1, y0, sz0], [x1 + 0.1, stepY, z1 + 0.1], { color: P.impGrey, uv: "world", texel: 1 });
  kit.floor(x0, sz0, x1, z1, stepY);
  kit.boxMM("satinBlack", [x0, y0, sz0 - 0.05], [x1, stepY, sz0 + 0.01]);
  kit.box("emitBlueSoft", cx, y0 + 0.2, sz0 - 0.056, x1 - x0 - 0.6, 0.03, 0.012, { uv: "keep" });
  kit.box("metal", cx, stepY, sz0 + 0.04, x1 - x0, 0.02, 0.1, { color: P.steel });
  handrail(kit, [x0 + 0.4, sz0 + 0.12], [cx - 3.6, sz0 + 0.12], stepY, { h: 0.95, postEvery: 2.2 });
  handrail(kit, [cx + 3.6, sz0 + 0.12], [x1 - 0.4, sz0 + 0.12], stepY, { h: 0.95, postEvery: 2.2 });
  for (const x of [cx - 8, cx - 4.8, cx - 1.6, cx + 1.6, cx + 4.8, cx + 8]) chair(kit, x, stepY, z1 - 1.05, "-z");
  // briefing shelf behind the chairs
  kit.boxMM("satinBlack", [x0 + 1.6, stepY + 0.7, z1 - 0.55], [x1 - 1.6, stepY + 0.76, z1 - 0.02]);
  kit.boxMM("metal", [x0 + 1.6, stepY + 0.76, z1 - 0.55], [x1 - 1.6, stepY + 0.78, z1 - 0.02], { color: P.steel });
  for (const x of [x0 + 2.0, cx, x1 - 2.0]) kit.boxMM("satinBlack", [x - 0.06, stepY, z1 - 0.5], [x + 0.06, stepY + 0.7, z1 - 0.04]);
  kit.collider([x0 + 1.6, stepY, z1 - 0.6], [x1 - 1.6, stepY + 0.8, z1], "shelf");
  effects(kit, cx - 6.4, stepY + 0.78, z1 - 0.3, "datapad", 0.3);
  effects(kit, cx - 3.1, stepY + 0.78, z1 - 0.28, "mug");
  effects(kit, cx + 0.4, stepY + 0.78, z1 - 0.3, "stack", -0.2);
  effects(kit, cx + 3.6, stepY + 0.78, z1 - 0.28, "datapad", -0.5);
  effects(kit, cx + 6.9, stepY + 0.78, z1 - 0.3, "mug");
  // aft wall dressing above the shelf
  const A = shell.frames["+z"].frame; // u = x1 - x
  wallLightBar(A, 0.6, 9.4, 2.95, "emitCoolSoft");
  wallLightBar(A, 12.6, 21.4, 2.95, "emitCoolSoft");
  [3.5, 11, 18.5].forEach((u, i) => wallScreen(A, u, 2.15, 1.6, 0.9, ["screen7", "screen5", "screen9"][i], { bezel: 0.05 }));
  A.box("emitRed", 9.9, 2.15, 0.04, 0.05, 0.6, 0.02);
  A.box("emitRed", 12.1, 2.15, 0.04, 0.05, 0.6, 0.02);
  stencil(A, 7.2, 1.9, 0.4, 15);
  stencil(A, 14.8, 1.9, 0.4, 7);

  // ------------------------------------------------------------ lights: dim blue with a red accent
  // few, strong, long-reach practicals (the pool only runs 14 point lights): a 2x3 teal grid hung half a
  // metre under the ceiling so the plate shows lit pools, a strong blue fixture inside the hologram volume
  // that keys the console faces, cool fill over the fleet wall and just inside the door
  const L = ctx.lights;
  for (const gx of [cx - 5.5, cx + 5.5]) for (const gz of [cz - 6, cz, cz + 6]) L.teal.push(pointLight(0x8fbfff, 23, 15, [gx, yTop - 0.6, gz]));
  L.teal.push(pointLight(0x5aa0ff, 16, 7, [cx, y0 + 1.95, cz]));
  L.cool.push(pointLight(0xdfe8ff, 11, 12, [cx - 6.5, y0 + 2.9, z0 + 1.8]));
  L.cool.push(pointLight(0xdfe8ff, 11, 12, [cx + 6.5, y0 + 2.9, z0 + 1.8]));
  L.cool.push(pointLight(0xdfe8ff, 13, 10, [x1 - 2.2, yTop - 0.5, cz]));
  L.warm.push(pointLight(0xff4030, 4, 6, [x1 - 0.8, y0 + 2.3, z0 + 4]));
  return shell;
}

// Additive blue hologram standing on the emitter dish: a projection cone rising from the lens into the
// volume, three target rings at increasing heights, a wireframe wedge cruiser well above the table, a
// small ringed planet, and a scanning plane that sweeps up and down. Turns slowly.
function buildHologram(ctx, x, y, z) {
  const holo = new THREE.Group();
  holo.name = "hologram";
  holo.position.set(x, y, z);
  const barMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0x9fd0ff).multiplyScalar(2.4), transparent: true, opacity: 1.0, blending: THREE.AdditiveBlending, depthWrite: false });
  const dimMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0x6fb4ff).multiplyScalar(1.2), transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false });
  const coneMat = new THREE.MeshBasicMaterial({ color: 0x3a78d8, transparent: true, opacity: 0.11, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const coreMat = new THREE.MeshBasicMaterial({ color: 0x5a9aff, transparent: true, opacity: 0.08, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const scanMat = new THREE.MeshBasicMaterial({ color: 0x6fb4ff, transparent: true, opacity: 0.14, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const lineMat = new THREE.LineBasicMaterial({ color: new THREE.Color(0x9fd0ff).multiplyScalar(1.8), transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });

  // projection cone from the lens up to the volume, and a tighter bright core
  const cone = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 0.3, 1.6, 48, 1, true), coneMat);
  cone.position.y = 0.8;
  holo.add(cone);
  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.14, 1.5, 32, 1, true), coreMat);
  core.position.y = 0.75;
  holo.add(core);
  // target rings climbing the volume
  const ringGeos = [];
  for (const [r, ry] of [[0.55, 0.42], [0.85, 0.84], [1.08, 1.28]]) {
    const g = new THREE.TorusGeometry(r, 0.009, 6, 72);
    g.rotateX(Math.PI / 2);
    g.translate(0, ry, 0);
    ringGeos.push(g);
  }
  for (const a of [0, Math.PI / 2]) {
    const g = new THREE.BoxGeometry(2.3, 0.006, 0.006);
    g.rotateY(a);
    g.translate(0, 0.84, 0);
    ringGeos.push(g);
  }
  holo.add(new THREE.Mesh(mergeGeos(ringGeos), dimMat));
  // scanning plane
  const scan = new THREE.Mesh(new THREE.CircleGeometry(1.12, 48).rotateX(-Math.PI / 2), scanMat);
  holo.add(scan);

  // wedge cruiser outline, high in the volume
  const L = 2.0;
  const Wd = 1.1;
  const yc = 1.02;
  const N = [0, yc, -L / 2];
  const AL = [-Wd / 2, yc, L / 2];
  const AR = [Wd / 2, yc, L / 2];
  const R = [0, yc + 0.26, L / 2];
  const edges = [[N, AL], [N, AR], [AL, AR], [N, R], [R, AL], [R, AR]];
  // conning tower: a small box outline on the ridge with a neck bar
  const tx = 0;
  const ty = yc + 0.26;
  const tz = 0.55;
  const tw = 0.24;
  const th = 0.13;
  const tb = ty + 0.1;
  edges.push([[tx, ty, tz], [tx, tb, tz]]);
  const c = [[tx - tw / 2, tb, tz - 0.09], [tx + tw / 2, tb, tz - 0.09], [tx + tw / 2, tb, tz + 0.09], [tx - tw / 2, tb, tz + 0.09]];
  for (let i = 0; i < 4; i++) {
    edges.push([c[i], c[(i + 1) % 4]]);
    edges.push([c[i], [c[i][0], tb + th, c[i][2]]]);
    edges.push([[c[i][0], tb + th, c[i][2]], [c[(i + 1) % 4][0], tb + th, c[(i + 1) % 4][2]]]);
  }
  // hull section lines across the wedge
  for (const f of [0.3, 0.55, 0.8]) {
    const zz = -L / 2 + f * L;
    const hw = (Wd / 2) * f;
    edges.push([[-hw, yc, zz], [hw, yc, zz]]);
    edges.push([[-hw, yc, zz], [0, yc + 0.26 * f, zz]]);
    edges.push([[hw, yc, zz], [0, yc + 0.26 * f, zz]]);
  }
  const barGeos = edges.map(([a, b]) => barBetween(a, b, 0.02));
  // engine bells: three bars across the stern
  for (const ex of [-0.3, 0, 0.3]) barGeos.push(barBetween([ex, yc + 0.08, L / 2], [ex, yc + 0.08, L / 2 + 0.12], 0.045));
  const ship = new THREE.Mesh(mergeGeos(barGeos), barMat);
  holo.add(ship);

  // planet with rings, off to the side
  const planet = new THREE.Group();
  planet.position.set(1.0, 1.42, -0.5);
  planet.add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(0.26, 1)), lineMat));
  const pr = [];
  for (const [r, tilt] of [[0.38, 0.35], [0.46, 0.35]]) {
    const g = new THREE.TorusGeometry(r, 0.006, 6, 56);
    g.rotateX(Math.PI / 2 + tilt);
    pr.push(g);
  }
  planet.add(new THREE.Mesh(mergeGeos(pr), dimMat));
  holo.add(planet);

  let t = 0;
  ctx.dynamic.push({
    object: holo,
    update(dt) {
      t += dt;
      holo.rotation.y += dt * 0.12;
      ship.position.y = Math.sin(t * 0.7) * 0.025;
      planet.rotation.y -= dt * 0.3;
      scan.position.y = 0.9 + Math.sin(t * 0.45) * 0.62;
      scanMat.opacity = 0.09 + 0.05 * Math.sin(t * 2.1);
    },
  });
}

const _dir = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _Z = new THREE.Vector3(0, 0, 1);
function barBetween(a, b, t) {
  _dir.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const len = _dir.length();
  _dir.normalize();
  _q.setFromUnitVectors(_Z, _dir);
  const g = new THREE.BoxGeometry(t, t, len);
  g.applyQuaternion(_q);
  g.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
  return g;
}

function mergeGeos(geos) {
  const list = geos.map((g) => (g.index ? g.toNonIndexed() : g));
  let total = 0;
  for (const g of list) total += g.attributes.position.count;
  const pos = new Float32Array(total * 3);
  let off = 0;
  for (const g of list) {
    pos.set(g.attributes.position.array, off * 3);
    off += g.attributes.position.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  return out;
}
