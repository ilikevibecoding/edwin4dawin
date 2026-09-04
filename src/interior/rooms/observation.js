// Observation gallery: a tall, quiet viewing room beside the bridge. The whole forward wall is glass in
// slim black mullions over a low sill, with a raised viewing terrace and a leaning rail along it. Rows of
// benches face the view, pilasters with lit slots and low floor light line the side walls, star-chart
// displays flank the aft door and a slowly turning astrogation globe stands in the centre aisle. Dim cool
// light so the view dominates, with cool space-light keys coming in through the glass.
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { roomShell, wallLightBar, wallConsole } from "../shell.js";
import { pointLight, windowSpot, wallFrame } from "../lib.js";
import { PALETTE as P } from "../../materials.js";
import { wallScreen, bench, handrail, floorStrip, pilaster, podium, downlight, stencil, commPanel, cabinet, effects } from "./commandKit.js";

export function build(kit, ctx, room) {
  const shell = roomShell(kit, ctx, room, { style: "light", skipWalls: ["-z"], ceiling: false, lights: false, seed: 71 });
  const y0 = shell.y0;
  const { x0, x1, z0, z1, height: h } = room;
  const yTop = y0 + h;
  const cx = (x0 + x1) / 2;
  const W = x1 - x0;

  // ------------------------------------------------------------ forward glass wall
  const gx0 = x0 + 0.5;
  const gx1 = x1 - 0.5;
  const gy0 = y0 + 0.6;
  const gy1 = y0 + 4.4;
  const sillD = 1.3; // deep enough to swallow the exterior bay lining that pokes through the plane
  const stepH = 0.3;
  kit.boxMM("satinBlack", [x0 - 0.16, y0, z0 - 0.02], [x1 + 0.16, gy0, z0 + sillD]);
  kit.boxMM("metal", [x0 - 0.16, gy0 - 0.03, z0 + sillD - 0.1], [x1 + 0.16, gy0 + 0.015, z0 + sillD + 0.02], { color: P.steel });
  kit.boxMM("emitCoolSoft", [gx0, y0 + stepH + 0.1, z0 + sillD], [gx1, y0 + stepH + 0.15, z0 + sillD + 0.012], { uv: "keep" });
  kit.collider([x0 - 0.16, y0, z0 - 0.3], [x1 + 0.16, gy0, z0 + sillD], "sill");
  // header over the glass (hides the lining top and the ceiling seam) with a cove line washing the panes
  kit.boxMM("satinBlack", [x0 - 0.16, gy1 - 0.32, z0 - 0.02], [x1 + 0.16, yTop + 0.12, z0 + sillD]);
  kit.boxMM("emitCoolSoft", [gx0, gy1 - 0.326, z0 + 0.7], [gx1, gy1 - 0.32, z0 + 0.9], { uv: "keep" });
  // mullions: end posts, five verticals, bottom transom, a slim mid rail above eye level
  kit.boxMM("satinBlack", [x0 - 0.16, gy0, z0 - 0.06], [gx0, gy1, z0 + 0.16]);
  kit.boxMM("satinBlack", [gx1, gy0, z0 - 0.06], [x1 + 0.16, gy1, z0 + 0.16]);
  const bays = 6;
  const bayW = (gx1 - gx0) / bays;
  for (let k = 1; k < bays; k++) {
    const mx = gx0 + k * bayW;
    kit.boxMM("satinBlack", [mx - 0.06, gy0, z0 - 0.06], [mx + 0.06, gy1, z0 + 0.16]);
  }
  kit.boxMM("satinBlack", [gx0, gy0, z0 - 0.06], [gx1, gy0 + 0.08, z0 + 0.16]);
  kit.boxMM("satinBlack", [gx0, y0 + 2.6, z0 - 0.04], [gx1, y0 + 2.66, z0 + 0.1]);
  kit.add("glass", new THREE.PlaneGeometry(gx1 - gx0, gy1 - gy0), { pos: [cx, (gy0 + gy1) / 2, z0 + 0.03] });
  kit.collider([x0 - 0.16, y0, z0 - 0.3], [x1 + 0.16, yTop, z0 + 0.1], "glass");
  // leaning rail standing on the sill, posts on the mullion lines
  handrail(kit, [gx0, z0 + sillD - 0.3], [gx1, z0 + sillD - 0.3], gy0, { h: 0.7, postEvery: bayW });

  // ------------------------------------------------------------ viewing terrace (auto-stepped riser)
  const tz1 = z0 + 4.6;
  kit.boxMM("deck", [x0, y0, z0 + sillD - 0.05], [x1, y0 + stepH, tz1], { color: P.impGreyDark, uv: "world", texel: 1 });
  kit.floor(x0, z0 + sillD, x1, tz1, y0 + stepH);
  kit.boxMM("satinBlack", [x0, y0, tz1 - 0.03], [x1, y0 + stepH - 0.01, tz1 + 0.04]);
  kit.boxMM("metal", [x0, y0 + stepH - 0.03, tz1 - 0.14], [x1, y0 + stepH + 0.008, tz1 + 0.05], { color: P.steel });
  kit.boxMM("emitCoolSoft", [x0 + 0.4, y0 + 0.1, tz1 + 0.04], [x1 - 0.4, y0 + 0.15, tz1 + 0.052], { uv: "keep" });
  // terrace-level side consoles and star charts
  const Wt = wallFrame(kit, [x0, z1], [x0, z0], y0 + stepH).frame;
  const Et = wallFrame(kit, [x1, z0], [x1, z1], y0 + stepH).frame;
  const uW = (z) => z1 - z;
  const uE = (z) => z - z0;
  wallConsole(Wt, uW(z0 + 3.3), 1.4, "screen4");
  wallConsole(Et, uE(z0 + 3.3), 1.4, "screen4");
  wallScreen(Wt, uW(z0 + 3.3), 2.15, 1.5, 0.9, "screen1", { leds: false });
  wallScreen(Et, uE(z0 + 3.3), 2.15, 1.5, 0.9, "screen1", { leds: false });

  // ------------------------------------------------------------ seating facing the view
  // three full rows, then a fourth on the starboard side only: the port half of that row is the
  // astrogation globe, kept off the door's sightline so the glass owns the view from the entrance
  const rows = [z0 + 7.8, z0 + 12.0, z0 + 16.2];
  for (const rz of rows) for (const bx of [x0 + 5.3, x0 + 8.6, x1 - 8.6, x1 - 5.3]) bench(kit, bx, y0, rz, "-z", { len: 3.0, color: P.fabricTeal });
  const gz = z0 + 20.4;
  for (const bx of [x1 - 8.6, x1 - 5.3]) bench(kit, bx, y0, gz, "-z", { len: 3.0, color: P.fabricTeal });
  // low guide lights along the centre aisle and the side aisles
  for (const gx of [cx - 1.7, cx + 1.7]) floorStrip(kit, [gx, tz1 + 0.6], [gx, z1 - 2.2], y0, "emitCoolSoft", { w: 0.05 });
  for (const gx of [x0 + 0.75, x1 - 0.75]) floorStrip(kit, [gx, tz1 + 0.6], [gx, z1 - 2.4], y0, "emitCoolSoft", { w: 0.05 });

  // ------------------------------------------------------------ side walls: pilasters, benches, displays
  const Wf = shell.frames["-x"].frame; // u = z1 - z
  const Ef = shell.frames["+x"].frame; // u = z - z0
  const pz = [z0 + 6, z0 + 11, z0 + 16, z0 + 21];
  for (const z of pz) {
    pilaster(kit, x0, z, y0, h, "+x");
    pilaster(kit, x1, z, y0, h, "-x");
  }
  const sideZ = [z0 + 8.5, z0 + 13.5, z0 + 18.5];
  const sideDecals = [[9, 4], [0, 9], [12, 0]];
  sideZ.forEach((z, i) => {
    bench(kit, x0 + 0.3, y0, z, "+x", { len: 2.4, back: false, color: P.fabricTeal });
    bench(kit, x1 - 0.3, y0, z, "-x", { len: 2.4, back: false, color: P.fabricTeal });
    wallLightBar(Wf, uW(z) - 1.3, uW(z) + 1.3, 2.6, "emitCoolSoft");
    wallLightBar(Ef, uE(z) - 1.3, uE(z) + 1.3, 2.6, "emitCoolSoft");
    stencil(Wf, uW(z), 1.75, 0.42, sideDecals[i][0]);
    stencil(Ef, uE(z), 1.75, 0.42, sideDecals[i][1]);
  });
  // high bars between pilasters (the 4.5 m walls need an upper register)
  const bars = (F, us, v) => {
    for (let i = 0; i + 1 < us.length; i++) wallLightBar(F, us[i] + 0.5, us[i + 1] - 0.5, v, "emitCoolSoft");
  };
  bars(Wf, [0, ...pz.map(uW).sort((a, b) => a - b), z1 - z0], 3.7);
  bars(Ef, [0, ...pz.map(uE), z1 - z0], 3.7);
  // by the door: info consoles, a comm panel and a pressure-door stencil
  wallConsole(Wf, uW(z1 - 1.7), 1.4, "screen0");
  wallConsole(Ef, uE(z1 - 1.7), 1.4, "screen1");
  commPanel(Wf, uW(z1 - 0.6), 1.45, { screen: "screen3", accent: "emitBlue" });
  stencil(Ef, uE(z1 - 0.6), 1.7, 0.4, 8);
  // ceiling coves along both side walls
  for (const [xa, xb] of [[x0, x0 + 0.3], [x1 - 0.3, x1]]) {
    kit.boxMM("satinBlack", [xa, yTop - 0.1, z0 + 1.4], [xb, yTop, z1 - 0.3]);
    kit.boxMM("emitCoolSoft", [xa + 0.05, yTop - 0.106, z0 + 1.5], [xb - 0.05, yTop - 0.1, z1 - 0.4], { uv: "keep" });
  }

  // ------------------------------------------------------------ aft wall: star-chart displays flanking the door
  const A = shell.frames["+z"].frame; // u = x1 - x, door at u 11.1..12.9
  const uA = (x) => x1 - x;
  const chartX = [x1 - 3.3, x1 - 6.5, x1 - 9.7, x0 + 9.7, x0 + 6.5, x0 + 3.3];
  chartX.forEach((x, i) => {
    wallScreen(A, uA(x), 2.15, 2.5, 1.45, i % 2 ? "screen1" : "screen4", { leds: false });
    A.box("emitBlue", uA(x) - 1.34, 2.95, 0.05, 0.05, 0.05, 0.02);
    A.box("emitBlue", uA(x) + 1.34, 2.95, 0.05, 0.05, 0.05, 0.02);
  });
  for (const [ua, ub] of [[2.0, 10.9], [13.1, 22.0]]) {
    const uc = (ua + ub) / 2;
    const L = ub - ua;
    A.box("satinBlack", uc, 0.41, 0.22, L, 0.82, 0.44);
    A.box("metal", uc, 0.84, 0.23, L + 0.04, 0.04, 0.48, { color: P.gunmetal });
    A.box("darkGloss", uc, 0.32, 0.445, L - 0.2, 0.34, 0.01);
    A.box("leds", uc, 0.62, 0.445, L * 0.8, 0.035, 0.01, { uv: "keep" });
    A.collider(ua, ub, 0, 0.86, 0, 0.5, "plinth");
  }
  effects(kit, x1 - 4.0, y0 + 0.86, z1 - 0.3, "datapad", 0.3);
  effects(kit, x1 - 7.6, y0 + 0.86, z1 - 0.3, "stack", -0.2);
  effects(kit, x0 + 4.4, y0 + 0.86, z1 - 0.3, "canister");
  effects(kit, x0 + 8.2, y0 + 0.86, z1 - 0.32, "frame", Math.PI);
  stencil(A, 12.0, 2.75, 0.55, 0);
  wallLightBar(A, 10.8, 13.2, 3.25, "emitCoolSoft");
  wallLightBar(A, 0.6, 10.6, 3.7, "emitCoolSoft");
  wallLightBar(A, 13.4, 23.4, 3.7, "emitCoolSoft");
  cabinet(A, 0.9, 1.2, 2.0, 0.5, { color: P.cream, label: 13, lamp: "emitRed", band: P.orange });
  cabinet(A, 23.1, 1.2, 2.0, 0.5, { color: P.cream, label: 4, lamp: "emitBlue", band: P.tealPaint });

  // ------------------------------------------------------------ astrogation globe and chart lecterns (port side of the last row)
  const gx = x0 + 7.0;
  kit.cyl("metal", gx, y0 + 0.05, gz, 0.72, 0.1, "y", { color: P.darkMetal, segments: 24 });
  kit.cyl("satinBlack", gx, y0 + 0.5, gz, 0.55, 0.8, "y", { segments: 24 });
  kit.cyl("metal", gx, y0 + 0.915, gz, 0.58, 0.03, "y", { color: P.steel, segments: 24 });
  kit.add("emitBlue", new THREE.TorusGeometry(0.46, 0.015, 8, 48).rotateX(Math.PI / 2), { pos: [gx, y0 + 0.935, gz] });
  kit.add("leds", new THREE.CylinderGeometry(0.56, 0.56, 0.04, 24, 1, true), { pos: [gx, y0 + 0.6, gz], uv: "keep" });
  kit.collider([gx - 0.72, y0, gz - 0.72], [gx + 0.72, y0 + 0.95, gz + 0.72], "globe");
  buildGlobe(ctx, gx, y0 + 1.75, gz);
  podium(kit, gx - 3.4, y0, gz, "+z", { screen: "screen4" });
  podium(kit, gx + 2.4, y0, gz, "+z", { screen: "screen1" });

  // ------------------------------------------------------------ ceiling: dark plate, beams on the pilaster lines, downlights
  kit.boxMM("paintedMetal", [x0 - 0.16, yTop, z0 - 0.16], [x1 + 0.16, yTop + 0.12, z1 + 0.16], { color: P.gunmetal, uv: "world", texel: 0.7 });
  for (const bz of pz) kit.box("paintedMetal", cx, yTop - 0.17, bz, W, 0.34, 0.36, { color: P.darkMetal, texel: 1.2 });
  for (const dz of [z0 + 3.6, ...sideZ, z1 - 2.2]) {
    downlight(kit, cx - 6, yTop, dz, 1.4, 0.4, "emitCoolSoft");
    downlight(kit, cx + 6, yTop, dz, 1.4, 0.4, "emitCoolSoft");
  }

  // ------------------------------------------------------------ light: dim and cool, keys from outside the glass
  // one practical per downlight (ten, so the 14-slot pool holds the whole gallery), strong enough that
  // the benches and deck read under a 4.5 m ceiling while staying well below the glow of the glass
  for (const lz of [z0 + 3.6, ...sideZ, z1 - 2.2]) for (const lx of [cx - 6, cx + 6]) ctx.lights.cool.push(pointLight(0xb8ccff, 16, 14, [lx, yTop - 0.8, lz]));
  ctx.lights.teal.push(pointLight(0x6fb4ff, 3.0, 5, [gx, y0 + 1.6, gz]));
  for (const sx of [cx - 6, cx, cx + 6]) ctx.lights.spots.push(windowSpot(0x9fc6ff, 30, [sx, y0 + 3.2, z0 - 4], [sx, y0 + 0.3, z0 + 9], 0.55));
  return shell;
}

// Faint blue additive astrogation globe: wireframe sphere with marker stars and three tilted hyperlane
// rings over a projection column. Turns slowly.
function buildGlobe(ctx, x, y, z) {
  const g = new THREE.Group();
  g.name = "astrogationGlobe";
  g.position.set(x, y, z);
  const lineMat = new THREE.LineBasicMaterial({ color: new THREE.Color(0x8fc4ff).multiplyScalar(1.3), transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false });
  const dimMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0x6fb4ff).multiplyScalar(0.9), transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false });
  const volMat = new THREE.MeshBasicMaterial({ color: 0x2a5fbf, transparent: true, opacity: 0.06, blending: THREE.AdditiveBlending, depthWrite: false });
  const dotMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xbfe0ff).multiplyScalar(1.8), transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
  g.add(new THREE.Mesh(new THREE.SphereGeometry(0.64, 24, 16), volMat));
  const col = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.42, 0.8, 16, 1, true), volMat);
  col.position.y = -0.42;
  g.add(col);
  const globe = new THREE.Group();
  globe.add(new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.SphereGeometry(0.6, 16, 10)), lineMat));
  const dots = [];
  for (let i = 0; i < 16; i++) {
    const th = i * 2.399;
    const ph = 0.4 + ((i * 0.53) % 2.3);
    const d = new THREE.BoxGeometry(0.035, 0.035, 0.035);
    d.translate(0.6 * Math.sin(ph) * Math.cos(th), 0.6 * Math.cos(ph), 0.6 * Math.sin(ph) * Math.sin(th));
    dots.push(d);
  }
  globe.add(new THREE.Mesh(mergeGeometries(dots, false), dotMat));
  g.add(globe);
  const rings = [];
  for (const [r, tilt] of [[0.76, 0.3], [0.86, -0.55], [0.96, 1.15]]) {
    const t = new THREE.TorusGeometry(r, 0.005, 6, 72);
    t.rotateX(Math.PI / 2 + tilt);
    rings.push(t);
  }
  const ringMesh = new THREE.Mesh(mergeGeometries(rings, false), dimMat);
  g.add(ringMesh);
  ctx.dynamic.push({
    object: g,
    update(dt) {
      globe.rotation.y += dt * 0.15;
      ringMesh.rotation.y -= dt * 0.06;
    },
  });
}
