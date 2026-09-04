// Tactical operations: a dim blue planning room. Central holo-table with a slowly turning hologram,
// a fleet-status wall of blue screens over a console counter, standing consoles ringing the table,
// a raised officers' step along the aft wall with chairs, red status lamps as the only warm accent.
import * as THREE from "three";
import { roomShell, wallConsole, wallLightBar } from "../shell.js";
import { pointLight } from "../lib.js";
import { PALETTE as P } from "../../materials.js";
import { customWall, wallScreen, cabinet, podium, chair, handrail, floorStrip, stencil, effects, downlight } from "./commandKit.js";

export function build(kit, ctx, room) {
  const shell = roomShell(kit, ctx, room, { style: "light", skipWalls: ["-z"], lightRows: 2, lightMat: "emitBlueSoft", lights: false, seed: 11 });
  const y0 = shell.y0;
  const { x0, x1, z0, z1, height: h } = room;
  const cx = (x0 + x1) / 2; // -13
  const cz = (z0 + z1) / 2; // 511

  // ------------------------------------------------------------ fleet-status wall (forward, -z)
  const fleet = customWall(kit, room, "-z", y0, { styles: { panel: 0.92, strip: 0.08 }, paints: [[P.gunmetal, 0.7], [P.slate, 0.3]], seed: 41 });
  const F = fleet.frame; // u = x - x0, 0..22
  for (const u of [5, 11, 17]) {
    wallScreen(F, u, 2.27, 3.4, 1.7, "screen4", { leds: false });
    F.box("emitRed", u - 1.78, 3.2, 0.05, 0.05, 0.05, 0.02);
    F.box("emitRed", u + 1.78, 3.2, 0.05, 0.05, 0.05, 0.02);
  }
  for (let k = 0; k < 8; k++) {
    wallConsole(F, 3.25 + 2.15 * k, 1.4, k % 2 ? "screen4" : "screen3");
    if (k < 7) F.box("leds", 4.325 + 2.15 * k, 0.9, 0.03, 0.5, 0.035, 0.01, { uv: "keep" });
  }
  for (const u of [1.3, 20.7]) {
    for (let r = 0; r < 3; r++) wallScreen(F, u, 1.45 + r * 0.62, 0.9, 0.42, ["screen0", "screen4", "screen1"][r], { bezel: 0.04, housing: 0.06 });
    F.box("satinBlack", u, 3.2, 0.03, 1.1, 0.16, 0.06);
    F.box("emitBlueSoft", u, 3.2, 0.062, 1.0, 0.08, 0.01, { uv: "keep" });
  }
  F.box("satinBlack", 11, 3.18, 0.02, 18.4, 0.05, 0.04);

  // ------------------------------------------------------------ side walls
  const W = shell.frames["-x"].frame; // u = z1 - z, 0..18
  wallScreen(W, 9, 1.95, 4.0, 2.0, "screen4", { leds: true });
  W.box("emitRed", 6.8, 3.0, 0.04, 0.05, 0.05, 0.02);
  W.box("emitRed", 11.2, 3.0, 0.04, 0.05, 0.05, 0.02);
  cabinet(W, 2.6, 1.5, 2.2, 0.6, { color: P.creamDark, label: 9, lamp: "emitBlue", band: P.tealPaint });
  cabinet(W, 15.4, 1.5, 2.2, 0.6, { color: P.creamDark, label: 6, lamp: "emitBlue", band: P.tealPaint });
  wallConsole(W, 5.1, 1.4, "screen4");
  wallConsole(W, 12.9, 1.4, "screen4");
  wallLightBar(W, 0.5, 5.6, 2.95, "emitBlueSoft");
  wallLightBar(W, 12.4, 17.5, 2.95, "emitBlueSoft");
  stencil(W, 4.6, 2.6, 0.5, 0);
  stencil(W, 13.4, 2.6, 0.5, 14);

  const E = shell.frames["+x"].frame; // u = z - z0, 0..18, door at u 8..10
  wallScreen(E, 4, 1.95, 2.2, 1.2, "screen5", { leds: true });
  for (const du of [-1.35, 1.35]) {
    E.box("satinBlack", 4 + du, 1.95, 0.03, 0.14, 1.3, 0.06);
    E.box("emitRed", 4 + du, 1.95, 0.062, 0.06, 1.16, 0.01);
  }
  cabinet(E, 1.15, 1.6, 2.1, 0.5, { color: P.cream, doors: 2, label: 8, lamp: "emitRed" });
  cabinet(E, 16.8, 1.6, 2.1, 0.5, { color: P.cream, doors: 2, label: 1, lamp: "emitBlue" });
  wallConsole(E, 12.4, 1.4, "screen4");
  wallConsole(E, 14.4, 1.4, "screen0");
  wallLightBar(E, 0.4, 7.4, 2.95, "emitBlueSoft");
  wallLightBar(E, 10.6, 17.6, 2.95, "emitBlueSoft");
  stencil(E, 7.3, 1.9, 0.45, 5);
  stencil(E, 10.7, 1.9, 0.45, 10);

  // ------------------------------------------------------------ holo-table
  const tw = 2.5;
  const td = 1.6;
  kit.box("metal", cx, y0 + 0.04, cz, tw - 0.2, 0.08, td - 0.2, { color: P.darkMetal });
  kit.box("emitBlueSoft", cx, y0 + 0.05, cz, tw - 0.25, 0.02, td - 0.25, { uv: "keep" });
  kit.box("satinBlack", cx, y0 + 0.48, cz, tw, 0.8, td);
  kit.box("satinBlack", cx, y0 + 0.92, cz, tw + 0.1, 0.08, td + 0.1);
  kit.box("darkGloss", cx, y0 + 0.965, cz, tw - 0.2, 0.01, td - 0.2);
  for (const s of [-1, 1]) {
    kit.box("emitBlue", cx, y0 + 0.97, cz + s * (td / 2 - 0.12), tw - 0.3, 0.012, 0.02);
    kit.box("emitBlue", cx + s * (tw / 2 - 0.12), y0 + 0.97, cz, 0.02, 0.012, td - 0.3);
    kit.box("leds", cx, y0 + 0.6, cz + s * (td / 2 + 0.006), 1.8, 0.04, 0.01, { uv: "keep" });
    kit.box("darkGloss", cx - 0.7, y0 + 0.78, cz + s * (td / 2 + 0.008), 0.6, 0.16, 0.012);
    kit.box("screen4", cx - 0.7, y0 + 0.78, cz + s * (td / 2 + 0.016), 0.54, 0.12, 0.004, { uv: "keep" });
    kit.box("darkGloss", cx + 0.7, y0 + 0.78, cz + s * (td / 2 + 0.008), 0.6, 0.16, 0.012);
    kit.box("leds", cx + 0.7, y0 + 0.78, cz + s * (td / 2 + 0.016), 0.5, 0.05, 0.004, { uv: "keep" });
    kit.box("emitRed", cx + s * 1.05, y0 + 0.78, cz - td / 2 - 0.012, 0.05, 0.05, 0.01);
  }
  kit.collider([cx - tw / 2 - 0.05, y0, cz - td / 2 - 0.05], [cx + tw / 2 + 0.05, y0 + 1.0, cz + td / 2 + 0.05], "holotable");
  buildHologram(ctx, cx, y0 + 0.97, cz);

  // ceiling ring fixture over the table
  const yTop = y0 + h;
  for (const s of [-1, 1]) {
    kit.box("satinBlack", cx, yTop - 0.08, cz + s * 1.1, 3.2, 0.16, 0.12);
    kit.box("emitBlue", cx, yTop - 0.17, cz + s * 1.1, 3.0, 0.01, 0.04);
    kit.box("satinBlack", cx + s * 1.6, yTop - 0.08, cz, 0.12, 0.16, 2.32);
    kit.box("emitBlue", cx + s * 1.6, yTop - 0.17, cz, 0.04, 0.01, 2.1);
  }

  // ------------------------------------------------------------ standing consoles around the table
  podium(kit, cx - 2.6, y0, cz - 2.6, "-z", { screen: "screen4" });
  podium(kit, cx + 2.6, y0, cz - 2.6, "-z", { screen: "screen3" });
  podium(kit, cx - 2.6, y0, cz + 2.6, "+z", { screen: "screen4" });
  podium(kit, cx + 2.6, y0, cz + 2.6, "+z", { screen: "screen0" });
  podium(kit, cx - 3.9, y0, cz, "-x", { screen: "screen4", w: 1.3 });
  podium(kit, cx + 3.9, y0, cz, "+x", { screen: "screen4", w: 1.3 });
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
  wallLightBar(A, 0.6, 9.4, 2.95, "emitBlueSoft");
  wallLightBar(A, 12.6, 21.4, 2.95, "emitBlueSoft");
  for (const u of [3.5, 11, 18.5]) wallScreen(A, u, 2.15, 1.6, 0.9, u === 11 ? "screen5" : "screen4", { bezel: 0.05 });
  A.box("emitRed", 9.9, 2.15, 0.04, 0.05, 0.6, 0.02);
  A.box("emitRed", 12.1, 2.15, 0.04, 0.05, 0.6, 0.02);
  stencil(A, 7.2, 1.9, 0.4, 15);
  stencil(A, 14.8, 1.9, 0.4, 7);
  downlight(kit, cx - 5, yTop, z1 - 1.3, 0.6, 0.25, "emitBlueSoft");
  downlight(kit, cx + 5, yTop, z1 - 1.3, 0.6, 0.25, "emitBlueSoft");

  // ------------------------------------------------------------ lights: dim blue with a red accent
  // few, strong, long-reach practicals: the pool only runs 14 point lights, and inverse-square falloff
  // with a short cutoff leaves isolated hot spots, so a 2x3 grid with a 15 m reach lights the whole room
  const L = ctx.lights;
  for (const gx of [cx - 5.5, cx + 5.5]) for (const gz of [cz - 6, cz, cz + 6]) L.teal.push(pointLight(0x8fbfff, 15, 15, [gx, y0 + 2.9, gz]));
  L.teal.push(pointLight(0x4a8dff, 5.0, 6, [cx, y0 + 1.9, cz]));
  L.cool.push(pointLight(0xdfe8ff, 9, 12, [cx - 6.5, y0 + 3.1, z0 + 1.8]));
  L.cool.push(pointLight(0xdfe8ff, 9, 12, [cx + 6.5, y0 + 3.1, z0 + 1.8]));
  L.warm.push(pointLight(0xff4030, 4, 6, [x1 - 0.8, y0 + 2.3, z0 + 4]));
  return shell;
}

// Faint blue additive hologram: a wedge cruiser outlined in thin bars over target rings, a small
// wireframe planet with two rings, all inside a translucent projection volume. Turns slowly.
function buildHologram(ctx, x, y, z) {
  const holo = new THREE.Group();
  holo.name = "hologram";
  holo.position.set(x, y, z);
  const barMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0x8fc4ff).multiplyScalar(1.7), transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false });
  const dimMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0x6fb4ff).multiplyScalar(0.9), transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false });
  const volMat = new THREE.MeshBasicMaterial({ color: 0x2a5fbf, transparent: true, opacity: 0.07, blending: THREE.AdditiveBlending, depthWrite: false });
  const lineMat = new THREE.LineBasicMaterial({ color: new THREE.Color(0x8fc4ff).multiplyScalar(1.3), transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false });

  const vol = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.35, 1.3), volMat);
  vol.position.y = 0.7;
  holo.add(vol);
  const ringGeos = [];
  for (const r of [0.35, 0.7, 1.0]) {
    const g = new THREE.TorusGeometry(r, 0.006, 6, 64);
    g.rotateX(Math.PI / 2);
    g.translate(0, 0.012, 0);
    ringGeos.push(g);
  }
  holo.add(new THREE.Mesh(mergeGeos(ringGeos), dimMat));

  // wedge cruiser outline
  const L = 1.5;
  const Wd = 0.8;
  const yc = 0.72;
  const N = [0, yc, -L / 2];
  const AL = [-Wd / 2, yc, L / 2];
  const AR = [Wd / 2, yc, L / 2];
  const R = [0, yc + 0.2, L / 2];
  const edges = [[N, AL], [N, AR], [AL, AR], [N, R], [R, AL], [R, AR]];
  // conning tower: a small box outline on the ridge with a neck bar
  const tx = 0;
  const ty = yc + 0.2;
  const tz = 0.42;
  const tw = 0.18;
  const th = 0.1;
  const tb = ty + 0.08;
  edges.push([[tx, ty, tz], [tx, tb, tz]]);
  const c = [[tx - tw / 2, tb, tz - 0.07], [tx + tw / 2, tb, tz - 0.07], [tx + tw / 2, tb, tz + 0.07], [tx - tw / 2, tb, tz + 0.07]];
  for (let i = 0; i < 4; i++) {
    edges.push([c[i], c[(i + 1) % 4]]);
    edges.push([c[i], [c[i][0], tb + th, c[i][2]]]);
    edges.push([[c[i][0], tb + th, c[i][2]], [c[(i + 1) % 4][0], tb + th, c[(i + 1) % 4][2]]]);
  }
  const barGeos = edges.map(([a, b]) => barBetween(a, b, 0.014));
  // engine bells: three tiny bars across the stern
  for (const ex of [-0.22, 0, 0.22]) barGeos.push(barBetween([ex, yc + 0.06, L / 2], [ex, yc + 0.06, L / 2 + 0.08], 0.03));
  const ship = new THREE.Mesh(mergeGeos(barGeos), barMat);
  holo.add(ship);

  // planet with rings, off to the side
  const planet = new THREE.Group();
  planet.position.set(0.72, 0.95, -0.25);
  planet.add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(0.2, 1)), lineMat));
  const pr = [];
  for (const [r, tilt] of [[0.3, 0.35], [0.36, 0.35]]) {
    const g = new THREE.TorusGeometry(r, 0.004, 6, 48);
    g.rotateX(Math.PI / 2 + tilt);
    pr.push(g);
  }
  planet.add(new THREE.Mesh(mergeGeos(pr), dimMat));
  holo.add(planet);

  // projection cone from the table surface: four faint bars up to the volume
  const cone = [];
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) cone.push(barBetween([sx * 1.05, 0.0, sz * 0.6], [sx * 1.05, 1.35, sz * 0.6], 0.006));
  holo.add(new THREE.Mesh(mergeGeos(cone), dimMat));

  let t = 0;
  ctx.dynamic.push({
    object: holo,
    update(dt) {
      t += dt;
      holo.rotation.y += dt * 0.12;
      ship.position.y = Math.sin(t * 0.7) * 0.02;
      planet.rotation.y -= dt * 0.3;
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
