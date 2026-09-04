// Life support: air / water / waste processing (deck B, starboard, x 2..24 / z 542..556, h 3.6).
// A grated service trench runs the length of the room from the door, with two branch trenches feeding
// the pump stations. North of it, four cylindrical air scrubbers stand on stepped plinths under a pipe
// manifold; south of it a water-reclamation vat with a glowing sight-window, double-sided filter racks and
// a waste processor. Rectangular supply ducts with grilles and a round return duct run under the
// ceiling, and the far wall is a floor-to-ceiling valve manifold around the master status board.
import * as THREE from "three";
import { roomShell, wallLightBar, wallConsole } from "../shell.js";
import { PALETTE } from "../../materials.js";
import { pointLight, Frame, WALL_T } from "../lib.js";
import { stencil, floorStencil, gratedTrench, grateQuad, pipeRun, valveWheel, gauge, crate, locker, standFrame, workLamp, UP } from "./aftProps.js";

export function build(kit, ctx, room, lib) {
  const shell = roomShell(kit, ctx, room, { style: "dark", lights: false, floor: false, lightRows: 2, lightMat: "emitCoolSoft", seed: 71 });
  const { y0, yTop, frames } = shell;
  const { x0, x1, z0, z1 } = room;
  const wt = WALL_T;
  const fW = frames["-x"].frame; // door wall, u = z1 - z
  const fE = frames["+x"].frame; // manifold wall, u = z - z0
  const fN = frames["-z"].frame; // forward wall behind the scrubbers, u = x - x0
  const fS = frames["+z"].frame; // aft wall, u = x1 - x
  const yP = y0 + 0.36; // scrubber plinth level
  const deckOpts = { color: PALETTE.impGreyDark, uv: "world", texel: 1 };

  // ------------------------------------------------------------ lights: cold white mains, cyan accents
  // The dark shell swallows light, so the mains are strong and low work lamps hang over the machinery
  // (added further down with the ducts they hang from).
  ctx.lights.cool.push(pointLight(0xd8e4ff, 18, 16, [4.6, yTop - 0.5, 546.0]));
  ctx.lights.cool.push(pointLight(0xd8e4ff, 18, 16, [4.6, yTop - 0.5, 552.5]));
  ctx.lights.cool.push(pointLight(0xd8e4ff, 18, 16, [9.5, yTop - 0.5, 549.0]));
  ctx.lights.cool.push(pointLight(0xd8e4ff, 18, 16, [14.5, yTop - 0.5, 549.0]));
  ctx.lights.cool.push(pointLight(0xd8e4ff, 18, 16, [19.5, yTop - 0.5, 549.0]));
  ctx.lights.cool.push(pointLight(0xd8e4ff, 14, 14, [22.4, yTop - 0.5, 545.0]));
  ctx.lights.cool.push(pointLight(0xd8e4ff, 14, 14, [22.4, yTop - 0.5, 553.0]));
  ctx.lights.teal.push(pointLight(0x5fe0ff, 4, 8, [7.0, y0 + 2.2, 551.6]));
  ctx.lights.teal.push(pointLight(0x5fe0ff, 4, 8, [13.0, y0 + 1.4, 546.0]));
  ctx.lights.teal.push(pointLight(0x5fe0ff, 4, 8, [18.2, y0 + 1.2, 552.0]));
  ctx.lights.teal.push(pointLight(0x5fe0ff, 3, 7, [7.4, y0 + 2.6, 544.4]));
  ctx.lights.teal.push(pointLight(0x5fe0ff, 3, 7, [18.5, y0 + 2.6, 544.4]));

  // ------------------------------------------------------------ floor slabs around the trenches, trenches, walkable surface
  const T = { a: 4.2, b: 22.4, c: 549.0, w: 1.6 }; // main trench along x
  const TN = { a: 543.6, b: 548.2, c: 13.0, w: 1.2 }; // north branch along z
  const TS = { a: 549.8, b: 554.2, c: 18.2, w: 1.2 }; // south branch along z
  const slab = (xa, za, xb, zb) => kit.boxMM("deck", [xa, y0 - 0.12, za], [xb, y0, zb], deckOpts);
  slab(x0 - wt, z0 - wt, TN.c - TN.w / 2, T.c - T.w / 2);
  slab(TN.c + TN.w / 2, z0 - wt, x1 + wt, T.c - T.w / 2);
  slab(TN.c - TN.w / 2, z0 - wt, TN.c + TN.w / 2, TN.a);
  slab(x0 - wt, T.c + T.w / 2, TS.c - TS.w / 2, z1 + wt);
  slab(TS.c + TS.w / 2, T.c + T.w / 2, x1 + wt, z1 + wt);
  slab(TS.c - TS.w / 2, TS.b, TS.c + TS.w / 2, z1 + wt);
  slab(x0 - wt, T.c - T.w / 2, T.a, T.c + T.w / 2);
  slab(T.b, T.c - T.w / 2, x1 + wt, T.c + T.w / 2);
  kit.floor(x0 - wt, z0 - wt, x1 + wt, z1 + wt, y0);
  gratedTrench(kit, T.a, T.b, T.c, T.w, y0, { depth: 0.55 });
  gratedTrench(kit, TN.a, TN.b, TN.c, TN.w, y0, { depth: 0.55, axis: "z" });
  gratedTrench(kit, TS.a, TS.b, TS.c, TS.w, y0, { depth: 0.55, axis: "z" });
  floorStencil(kit, 3.2, y0, 547.2, 0.8, 15, Math.PI / 2);
  floorStencil(kit, 3.2, y0, 550.8, 0.8, 15, Math.PI / 2);

  // ------------------------------------------------------------ scrubber plinths with steps
  const plinth = (xa, xb, sx0, sx1) => {
    const zf = 546.4;
    kit.boxMM("deck", [xa, y0, z0], [xb, yP, zf], deckOpts);
    kit.floor(xa, z0, xb, zf, yP);
    kit.boxMM("satinBlack", [xa, y0 + 0.02, zf - 0.01], [xb, yP - 0.06, zf + 0.02]);
    kit.boxMM("hazard", [xa, yP - 0.012, zf - 0.1], [xb, yP + 0.002, zf + 0.03], { texel: 3 });
    kit.boxMM("emitTeal", [xa + 0.3, y0 + 0.1, zf + 0.02], [xb - 0.3, y0 + 0.13, zf + 0.03], { uv: "keep" });
    kit.stairs("deck", sx0, zf + 0.72, sx1, zf, y0, yP, "z", { color: PALETTE.impGreyDark });
    kit.boxMM("hazard", [sx0, y0 + 0.17, zf + 0.64], [sx1, y0 + 0.185, zf + 0.74], { texel: 3 });
    for (const x of [sx0 - 0.03, sx1 + 0.03]) kit.boxMM("satinBlack", [x - 0.03, y0, zf], [x + 0.03, yP + 0.9, zf + 0.72]);
    for (const x of [sx0, sx1]) kit.cyl("metal", x, yP + 0.85, zf + 0.36, 0.02, 0.76, "z", { color: PALETTE.steel, segments: 8 });
    kit.collider([xa, y0, zf - 0.1], [sx0 - 0.05, yP, zf], "plinth");
    kit.collider([sx1 + 0.05, y0, zf - 0.1], [xb, yP, zf], "plinth");
    kit.collider([xa - 0.05, y0, z0], [xa, yP, zf], "plinth");
    kit.collider([xb, y0, z0], [xb + 0.05, yP, zf], "plinth");
    kit.collider([sx0 - 0.08, y0, zf], [sx0 - 0.02, yP + 1.0, zf + 0.74], "rail");
    kit.collider([sx1 + 0.02, y0, zf], [sx1 + 0.08, yP + 1.0, zf + 0.74], "rail");
  };
  plinth(4.0, 10.8, 7.6, 8.8);
  plinth(15.2, 22.0, 18.0, 19.2);

  // ------------------------------------------------------------ scrubber tanks with manifolds, gauges and ladders
  const tank = (tx, tz, ladder) => {
    const r = 1.1;
    kit.cyl("metal", tx, yP + 0.06, tz, r + 0.08, 0.12, "y", { color: PALETTE.darkMetal, segments: 28 });
    kit.cyl("painted", tx, yP + 1.27, tz, r, 2.3, "y", { color: PALETTE.slate, segments: 28, uv: "world", texel: 0.7 });
    for (const v of [0.6, 1.5, 2.3]) kit.cyl("metal", tx, yP + v, tz, r + 0.03, 0.08, "y", { color: PALETTE.steel, segments: 28 });
    const dome = new THREE.SphereGeometry(r, 28, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    dome.scale(1, 0.32, 1);
    kit.add("painted", dome, { pos: [tx, yP + 2.42, tz], color: PALETTE.slate, uv: "world", texel: 0.7 });
    kit.cyl("metal", tx, yP + 2.85, tz, 0.36, 0.14, "y", { color: PALETTE.darkMetal, segments: 16 });
    for (const dx of [-0.45, 0.45]) {
      kit.cyl("metal", tx + dx, yP + 2.92, tz, 0.09, 0.45, "y", { color: PALETTE.steel, segments: 10 });
      kit.cyl("metal", tx + dx, yP + 2.78, tz, 0.13, 0.05, "y", { color: PALETTE.darkMetal, segments: 10 });
    }
    kit.cyl("hazard", tx, yP + 0.22, tz, r + 0.005, 0.1, "y", { segments: 28, texel: 3 });
    // front instrument cluster on a frame tangent to the shell (aisle side); boxes reach back into the
    // shell so nothing floats where the surface curves away from the tangent plane
    const f = standFrame(kit, tx, yP, tz + r, "+z");
    const fg = new Frame(kit, f.pos(0, 0, 0.06), f.U, f.V);
    f.box("satinBlack", 0, 1.35, -0.03, 0.9, 0.7, 0.18);
    f.box("darkGloss", -0.18, 1.2, 0.065, 0.42, 0.26, 0.01);
    f.box("screen6", -0.18, 1.2, 0.072, 0.36, 0.2, 0.004, { uv: "keep" });
    gauge(fg, 0.26, 1.5, 0.11, "emitTeal");
    gauge(fg, 0.26, 1.2, 0.08, "emitAmber");
    f.box("leds", -0.18, 1.5, 0.065, 0.4, 0.04, 0.008, { uv: "keep" });
    f.box("emitTeal", 0, 1.74, 0.03, 0.8, 0.03, 0.06);
    f.box("painted", 0, 2.15, -0.06, 0.6, 0.6, 0.14, { color: PALETTE.cream, uv: "keep" });
    stencil(f, 0, 2.15, 0.44, 4, { plate: false, n: 0.012 });
    f.box("painted", 0, 0.7, -0.06, 0.5, 0.5, 0.14, { color: PALETTE.creamDark, uv: "keep" });
    stencil(f, 0, 0.7, 0.36, 12, { plate: false, n: 0.012 });
    // inlet pipe with a hand valve and a drain into the plinth
    f.cylN("metal", 0.85, 0.9, 0.125, 0.07, 1.15, { color: PALETTE.steel, segments: 12 });
    f.cylV("metal", 0.85, 0.42, 0.68, 0.07, 0.9, { color: PALETTE.steel, segments: 12 });
    const vp = f.pos(0.85, 0.9, 0.7);
    valveWheel(kit, vp.x, vp.y, vp.z, "+z", 0.15);
    f.cylV("metal", -0.85, 0.5, 0.5, 0.05, 1.0, { color: PALETTE.orange, segments: 10 });
    f.cylN("metal", -0.85, 1.0, 0.0, 0.05, 1.0, { color: PALETTE.orange, segments: 10 });
    if (ladder) {
      for (let k = 0; k < 8; k++) kit.cyl("metal", tx - r - 0.15, yP + 0.5 + k * 0.3, tz, 0.015, 0.4, "z", { color: PALETTE.steel, segments: 6 });
      for (const dz of [-0.2, 0.2]) kit.cyl("metal", tx - r - 0.15, yP + 1.5, tz + dz, 0.02, 2.6, "y", { color: PALETTE.steel, segments: 6 });
    }
    kit.collider([tx - r - 0.25, yP, tz - r - 0.05], [tx + r + 0.05, yP + 3.0, tz + r + 0.75], "tank");
  };
  const tanks = [[5.9, 544.4, true], [8.9, 544.4, false], [17.0, 544.4, true], [20.1, 544.4, false]];
  for (const [tx, tz, l] of tanks) tank(tx, tz, l);
  // ceiling headers above the tanks, risers and cross-overs to the aft wall
  pipeRun(kit, "x", 4.2, 22.0, 544.4, y0 + 3.35, 0.14, { color: PALETTE.steel, step: 2.4 });
  pipeRun(kit, "x", 4.2, 22.0, 543.6, y0 + 3.2, 0.1, { color: PALETTE.orange, step: 3.0 });
  for (const [tx] of tanks) for (const dx of [-0.45, 0.45]) kit.cyl("metal", tx + dx, y0 + 3.2, 544.4, 0.13, 0.05, "y", { color: PALETTE.darkMetal, segments: 10 });
  for (const x of [5.2, 12.0, 21.4]) pipeRun(kit, "z", 543.6, 555.4, x, y0 + 3.42, 0.08, { color: PALETTE.steel, step: 3.0 });
  pipeRun(kit, "x", 2.6, 23.4, 555.6, y0 + 3.05, 0.12, { color: PALETTE.gunmetal, step: 2.4 });

  // ------------------------------------------------------------ supply ducts with grilles, intake bells and a round return duct
  for (const dz of [546.6, 551.4]) {
    kit.box("paintedMetal", 12.8, y0 + 3.05, dz, 19.6, 0.5, 0.9, { color: PALETTE.gunmetal, texel: 1 });
    for (let x = 4.6; x < 22.4; x += 3.2) {
      kit.box("metal", x, y0 + 3.05, dz, 0.08, 0.56, 0.96, { color: PALETTE.darkMetal, texel: 2 });
      kit.box("satinBlack", x + 1.6, y0 + 2.795, dz, 0.9, 0.02, 0.7);
      const g = new THREE.PlaneGeometry(0.8, 0.6);
      g.rotateX(Math.PI / 2);
      grateQuad(kit, g, [x + 1.6, y0 + 2.782, dz], 0.8, 0.6);
    }
    kit.box("leds", 12.8, y0 + 2.8, dz + 0.42, 18.0, 0.02, 0.03, { uv: "keep" });
  }
  for (const [tx] of tanks) {
    kit.cyl("metal", tx, y0 + 2.6, 546.6, 0.22, 0.4, "y", { color: PALETTE.gunmetal, segments: 14 });
    kit.add("metal", new THREE.CylinderGeometry(0.22, 0.36, 0.3, 14), { pos: [tx, y0 + 2.25, 546.6], color: PALETTE.darkMetal, uv: "scale", uvScale: [2, 0.3] });
    const g = new THREE.CircleGeometry(0.3, 14);
    g.rotateX(Math.PI / 2);
    grateQuad(kit, g, [tx, y0 + 2.094, 546.6], 0.6, 0.6);
    kit.add("emitTeal", new THREE.TorusGeometry(0.32, 0.01, 4, 20), { pos: [tx, y0 + 2.1, 546.6], rot: [Math.PI / 2, 0, 0], uv: "keep" });
  }
  // cage work lamps hung from the ducts and the ceiling over the machinery
  workLamp(kit, ctx, 13.4, yTop, 545.0, { drop: 0.95, intensity: 12, distance: 10 });
  workLamp(kit, ctx, 8.2, y0 + 2.8, 551.4, { drop: 0.4, intensity: 12, distance: 10 });
  workLamp(kit, ctx, 13.6, y0 + 2.8, 551.4, { drop: 0.4, intensity: 12, distance: 10 });
  workLamp(kit, ctx, 20.6, yTop, 553.2, { drop: 0.95, intensity: 12, distance: 10 });
  pipeRun(kit, "z", 542.2, 555.8, 12.6, y0 + 2.5, 0.28, { color: PALETTE.gunmetal, step: 2.4 });
  for (const z of [545.0, 553.0]) {
    kit.cyl("metal", 12.6, y0 + 2.5, z, 0.34, 0.5, "z", { color: PALETTE.darkMetal, segments: 12 });
    kit.box("leds", 12.6, y0 + 2.5, z, 0.7, 0.03, 0.04, { uv: "keep" });
  }

  // ------------------------------------------------------------ pump stations beside the north branch trench
  const pump = (px, pz, mirror) => {
    const s = mirror ? -1 : 1;
    kit.box("metal", px, y0 + 0.08, pz, 1.3, 0.16, 1.0, { color: PALETTE.darkMetal, texel: 2 });
    kit.box("hazard", px, y0 + 0.11, pz, 1.32, 0.05, 1.02, { texel: 3 });
    kit.cyl("painted", px - s * 0.2, y0 + 0.62, pz, 0.3, 0.8, "x", { color: PALETTE.impGreyDark, segments: 16, uv: "world", texel: 1 });
    for (const dx of [-0.35, 0.15]) kit.cyl("metal", px - s * 0.2 + s * dx, y0 + 0.62, pz, 0.33, 0.06, "x", { color: PALETTE.steel, segments: 16 });
    kit.box("satinBlack", px - s * 0.2, y0 + 0.98, pz, 0.5, 0.12, 0.3);
    kit.box("leds", px - s * 0.2, y0 + 1.0, pz + 0.155, 0.36, 0.03, 0.006, { uv: "keep" });
    kit.box("emitTeal", px - s * 0.4, y0 + 1.05, pz + 0.155, 0.06, 0.04, 0.006);
    kit.box("painted", px + s * 0.42, y0 + 0.55, pz, 0.46, 0.94, 0.7, { color: PALETTE.slate, uv: "world", texel: 1 });
    kit.box("metal", px + s * 0.42, y0 + 1.03, pz, 0.5, 0.04, 0.74, { color: PALETTE.steel, texel: 2 });
    // outlet: up from the head, across to the trench and down through a floor fitting in the grate
    const ox = px + s * 1.2;
    kit.cyl("metal", px + s * 0.42, y0 + 1.35, pz, 0.08, 0.6, "y", { color: PALETTE.steel, segments: 10 });
    kit.cyl("metal", px + s * 0.42, y0 + 1.65, pz, 0.11, 0.08, "y", { color: PALETTE.darkMetal, segments: 10 });
    kit.cyl("metal", (px + s * 0.42 + ox) / 2, y0 + 1.65, pz, 0.08, Math.abs(ox - px - s * 0.42), "x", { color: PALETTE.steel, segments: 10 });
    kit.cyl("metal", ox, y0 + 0.85, pz, 0.08, 1.6, "y", { color: PALETTE.steel, segments: 10 });
    kit.cyl("metal", ox, y0 + 0.04, pz, 0.14, 0.08, "y", { color: PALETTE.darkMetal, segments: 12 });
    kit.cyl("metal", px + s * 0.65, y0 + 0.25, pz + 0.05, 0.08, 1.1, "y", { color: PALETTE.orange, segments: 10 });
    valveWheel(kit, px + s * 0.42, y0 + 0.75, pz + 0.36, "+z", 0.14);
    stencil(standFrame(kit, px + s * 0.42, y0, pz + 0.35, "+z"), 0, 0.3, 0.24, 5, { plate: false });
    kit.collider([px - 0.7, y0, pz - 0.55], [px + 0.7, y0 + 1.2, pz + 0.55], "pump");
  };
  pump(11.5, 545.6, false);
  pump(14.5, 545.6, true);
  // trench-side handrail posts at the branch mouths
  for (const [x, z] of [[12.15, 543.9], [13.85, 543.9], [17.35, 554.0], [19.05, 554.0]]) {
    kit.cyl("satinBlack", x, y0 + 0.5, z, 0.03, 1.0, "y", { segments: 8 });
    kit.cyl("emitTeal", x, y0 + 1.02, z, 0.035, 0.04, "y", { segments: 8 });
  }

  // ------------------------------------------------------------ water reclamation vat with a sight-window
  {
    const vx = 7.0;
    const vz = 554.2;
    const r = 1.5;
    kit.cyl("metal", vx, y0 + 0.08, vz, r + 0.1, 0.16, "y", { color: PALETTE.darkMetal, segments: 32 });
    kit.cyl("painted", vx, y0 + 1.46, vz, r, 2.6, "y", { color: PALETTE.impGreyDark, segments: 32, uv: "world", texel: 0.7 });
    for (const v of [0.4, 1.4, 2.5]) kit.cyl("metal", vx, y0 + v, vz, r + 0.03, 0.1, "y", { color: PALETTE.steel, segments: 32 });
    kit.cyl("metal", vx, y0 + 2.8, vz, r + 0.06, 0.08, "y", { color: PALETTE.darkMetal, segments: 32 });
    kit.box("hazard", vx, y0 + 0.24, vz, 2 * r + 0.06, 0.1, 0.3, { texel: 3 });
    // hatch, agitator motor and feed pipes on the lid
    kit.cyl("metal", vx - 0.6, y0 + 2.9, vz + 0.4, 0.38, 0.12, "y", { color: PALETTE.steel, segments: 16 });
    kit.box("metal", vx - 0.6, y0 + 2.98, vz + 0.4, 0.5, 0.04, 0.08, { color: PALETTE.darkMetal });
    kit.box("painted", vx + 0.5, y0 + 3.05, vz - 0.2, 0.6, 0.5, 0.6, { color: PALETTE.slate, uv: "world", texel: 1 });
    kit.cyl("metal", vx + 0.5, y0 + 3.4, vz - 0.2, 0.2, 0.2, "y", { color: PALETTE.darkMetal, segments: 12 });
    kit.cyl("metal", vx - 0.4, y0 + 3.2, vz - 0.6, 0.1, 0.8, "y", { color: PALETTE.steel, segments: 10 });
    kit.cyl("metal", vx - 0.4, y0 + 2.9, vz - 0.6, 0.14, 0.06, "y", { color: PALETTE.darkMetal, segments: 10 });
    // sight-window on the aisle side: a protruding viewport housing (border boxes + back plate, collar
    // filling the gap to the curved shell), glowing liquid with a dark level line, recessed glass
    const f = standFrame(kit, vx, y0, vz - r, "-z");
    f.box("satinBlack", 0, 1.5, 0.0, 0.84, 1.64, 0.1);
    f.box("satinBlack", 0, 1.5, 0.01, 0.8, 1.6, 0.02);
    for (const du of [-0.35, 0.35]) f.box("satinBlack", du, 1.5, 0.07, 0.1, 1.6, 0.14);
    for (const dv of [-0.745, 0.745]) f.box("satinBlack", 0, 1.5 + dv, 0.07, 0.8, 0.11, 0.14);
    f.box("emitTeal", 0, 1.22, 0.03, 0.6, 0.84, 0.006, { uv: "keep" });
    f.box("darkGloss", 0, 1.94, 0.03, 0.6, 0.6, 0.006);
    f.box("satinBlack", 0, 1.645, 0.04, 0.6, 0.03, 0.004);
    f.box("glass", 0, 1.5, 0.12, 0.6, 1.38, 0.01);
    for (const dv of [-0.745, 0.745]) for (const du of [-0.35, 0.35]) f.cylN("metal", du, 1.5 + dv, 0.15, 0.025, 0.02, { color: PALETTE.steel, segments: 8 });
    // level gauge, controls and a stencil beside the window
    f.box("satinBlack", -0.95, 1.75, 0.03, 0.5, 0.9, 0.06);
    gauge(f, -0.95, 1.95, 0.12, "emitTeal");
    f.box("darkGloss", -0.95, 1.5, 0.065, 0.36, 0.22, 0.01);
    f.box("screen6", -0.95, 1.5, 0.072, 0.3, 0.16, 0.004, { uv: "keep" });
    stencil(f, 0.95, 1.9, 0.44, 12, { color: PALETTE.cream, n: 0.04 });
    stencil(f, 0.95, 1.3, 0.32, 15, { color: PALETTE.creamDark, n: 0.04 });
    f.box("emitTeal", 0, 2.55, 0.04, 1.6, 0.03, 0.02);
    // ladder to the lid on the east side
    for (let k = 0; k < 9; k++) kit.cyl("metal", vx + r + 0.15, y0 + 0.4 + k * 0.3, vz, 0.015, 0.4, "z", { color: PALETTE.steel, segments: 6 });
    for (const dz of [-0.2, 0.2]) kit.cyl("metal", vx + r + 0.15, y0 + 1.5, vz + dz, 0.02, 2.9, "y", { color: PALETTE.steel, segments: 6 });
    kit.collider([vx - r - 0.1, y0, vz - r - 0.12], [vx + r + 0.3, y0 + 3.0, vz + r + 0.1], "vat");
    // pedestal console in front of the vat
    const c = standFrame(kit, 9.4, y0, 552.2, "-z");
    c.box("satinBlack", 0, 0.5, 0, 0.7, 1.0, 0.4);
    c.box("satinBlack", 0, 1.08, 0.05, 0.74, 0.22, 0.5, { tilt: -0.5 });
    c.box("screen6", 0, 1.1, 0.16, 0.6, 0.16, 0.01, { tilt: -0.5, uv: "keep" });
    c.box("leds", 0, 0.9, 0.205, 0.5, 0.04, 0.01, { uv: "keep" });
    kit.collider([9.0, y0, 551.9], [9.8, y0 + 1.2, 552.5], "console");
  }

  // ------------------------------------------------------------ filter racks: free-standing double-sided + wall rack, spent-filter crates
  const filterRow = (xa, xb, y, z, dir) => {
    for (let x = xa + 0.2; x < xb - 0.1; x += 0.36) {
      kit.cyl("painted", x, y + 0.13, z, 0.11, 0.46, "z", { color: PALETTE.impWhite, segments: 12, uv: "world", texel: 2 });
      kit.cyl("metal", x, y + 0.13, z + dir * 0.2, 0.115, 0.04, "z", { color: PALETTE.steel, segments: 12 });
      kit.cyl("metal", x, y + 0.13, z - dir * 0.2, 0.115, 0.04, "z", { color: PALETTE.gunmetal, segments: 12 });
    }
  };
  {
    const xa = 10.6;
    const xb = 15.4;
    const xm = (xa + xb) / 2;
    const rz = 553.0;
    kit.box("metal", xm, y0 + 0.06, rz, xb - xa + 0.2, 0.12, 1.1, { color: PALETTE.gunmetal, texel: 2 });
    kit.box("satinBlack", xm, y0 + 1.1, rz, xb - xa, 2.1, 0.08);
    kit.box("metal", xm, y0 + 2.17, rz, xb - xa + 0.1, 0.06, 1.1, { color: PALETTE.gunmetal, texel: 2 });
    for (const x of [xa, xb]) kit.box("satinBlack", x, y0 + 1.1, rz, 0.08, 2.1, 1.1);
    for (const s of [-1, 1]) {
      for (const v of [0.5, 1.05, 1.6]) {
        kit.box("metal", xm, y0 + v, rz + s * 0.29, xb - xa, 0.04, 0.5, { color: PALETTE.gunmetal, texel: 2 });
        kit.box("leds", xm, y0 + v + 0.03, rz + s * 0.53, xb - xa - 0.4, 0.02, 0.006, { uv: "keep" });
        filterRow(xa, xb, y0 + v + 0.02, rz + s * 0.3, s);
      }
      kit.box("emitTeal", xm, y0 + 2.12, rz + s * 0.5, xb - xa - 0.3, 0.02, 0.02);
      const f = new Frame(kit, new THREE.Vector3(s > 0 ? xb : xa, y0, rz + s * 0.06), new THREE.Vector3(-s, 0, 0), UP);
      stencil(f, 0.6, 1.95, 0.3, 12, { plate: false });
      stencil(f, xb - xa - 0.6, 1.95, 0.3, 6, { plate: false });
    }
    kit.collider([xa - 0.1, y0, rz - 0.6], [xb + 0.1, y0 + 2.2, rz + 0.6], "filterRack");
    // wall rack against the aft wall behind it
    const wr = new Frame(kit, new THREE.Vector3(xb + 0.4, y0, z1), new THREE.Vector3(-1, 0, 0), UP); // u = xb + 0.4 - x
    const len = xb - xa + 0.8;
    wr.box("satinBlack", len / 2, 1.1, 0.03, len, 2.1, 0.06);
    for (const v of [0.5, 1.05, 1.6]) {
      wr.box("metal", len / 2, v, 0.28, len, 0.04, 0.5, { color: PALETTE.gunmetal, texel: 2 });
      filterRow(xa - 0.4, xb + 0.4, y0 + v + 0.02, z1 - 0.3, -1);
      wr.box("leds", len / 2, v + 0.03, 0.53, len - 0.4, 0.02, 0.006, { uv: "keep" });
    }
    wr.box("metal", len / 2, 2.15, 0.28, len, 0.05, 0.54, { color: PALETTE.darkMetal, texel: 2 });
    wr.collider(0, len, 0, 2.2, 0, 0.6, "wallRack");
    wallLightBar(fS, x1 - xb - 0.6, x1 - xa + 0.6, 2.7, "emitCoolSoft");
    stencil(fS, x1 - xm, 2.45, 0.4, 6, { color: PALETTE.creamDark });
    crate(kit, 16.3, y0 + 0.28, 555.3, 0.9, 0.56, 0.7, PALETTE.impGreyDark, { decal: 12, face: "-z", collide: true });
    crate(kit, 16.3, y0 + 0.84, 555.3, 0.9, 0.56, 0.7, PALETTE.slate, { decal: 9, face: "-z", band: false, collide: true });
  }

  // ------------------------------------------------------------ waste processor and auxiliary pump at the south branch
  {
    const wx = 21.0;
    const wz = 554.6;
    kit.box("metal", wx, y0 + 0.08, wz, 2.6, 0.16, 2.0, { color: PALETTE.darkMetal, texel: 2 });
    kit.box("paintedMetal", wx, y0 + 0.85, wz, 2.4, 1.4, 1.8, { color: PALETTE.gunmetal, texel: 1 });
    kit.box("metal", wx, y0 + 1.58, wz, 2.5, 0.06, 1.9, { color: PALETTE.steel, texel: 2 });
    kit.add("metal", new THREE.CylinderGeometry(0.62, 0.3, 0.7, 18), { pos: [wx - 0.4, y0 + 1.96, wz + 0.1], color: PALETTE.slate, uv: "scale", uvScale: [3, 0.7] });
    kit.cyl("metal", wx - 0.4, y0 + 2.36, wz + 0.1, 0.66, 0.1, "y", { color: PALETTE.steel, segments: 18 });
    kit.cyl("metal", wx - 0.4, y0 + 2.9, wz + 0.1, 0.18, 1.0, "y", { color: PALETTE.steel, segments: 12 });
    kit.cyl("metal", wx + 0.7, y0 + 2.0, wz - 0.4, 0.14, 0.8, "y", { color: PALETTE.orange, segments: 12 });
    kit.cyl("metal", wx + 0.7, y0 + 2.4, (wz - 0.4 + 551.6) / 2, 0.14, wz - 0.4 - 551.6, "z", { color: PALETTE.orange, segments: 12 });
    kit.cyl("metal", wx + 0.7, y0 + 2.62, 551.6, 0.14, 0.45, "y", { color: PALETTE.orange, segments: 12 });
    kit.cyl("metal", wx + 0.7, y0 + 2.4, wz - 0.4, 0.18, 0.1, "z", { color: PALETTE.darkMetal, segments: 12 });
    kit.box("hazard", wx, y0 + 0.3, wz, 2.42, 0.1, 1.82, { texel: 3 });
    const f = standFrame(kit, wx, y0 + 0.16, wz - 0.9, "-z");
    f.box("satinBlack", 0.6, 1.0, 0.03, 0.9, 0.6, 0.06);
    f.box("screen6", 0.6, 1.05, 0.065, 0.7, 0.36, 0.006, { uv: "keep" });
    f.box("leds", 0.6, 0.78, 0.065, 0.7, 0.04, 0.006, { uv: "keep" });
    gauge(f, -0.5, 1.1, 0.14, "emitAmber");
    f.box("emitAmber", -0.9, 1.3, 0.035, 0.08, 0.08, 0.02);
    stencil(f, -0.2, 0.5, 0.36, 13, { color: PALETTE.cream, n: 0.02 });
    stencil(f, 0.7, 0.45, 0.3, 5, { plate: false, n: 0.02 });
    const vp = f.pos(-0.9, 0.6, 0.1);
    valveWheel(kit, vp.x, vp.y, vp.z, "-z", 0.16);
    kit.collider([wx - 1.3, y0, wz - 1.0], [wx + 1.3, y0 + 1.7, wz + 1.0], "waste");
    kit.cyl("metal", 18.2, y0 + 0.3, 554.9, 0.1, 1.2, "y", { color: PALETTE.steel, segments: 10 });
    kit.cyl("metal", 18.2, y0 + 0.9, 555.4, 0.1, 1.0, "z", { color: PALETTE.steel, segments: 10 });
    wallLightBar(fS, x1 - wx - 1.2, x1 - wx + 1.2, 2.7, "emitCoolSoft");
    stencil(fS, x1 - wx, 2.35, 0.4, 13, { color: PALETTE.cream });
  }

  // ------------------------------------------------------------ manifold wall (east) around the master status board
  {
    wallConsole(fE, 7.0, 2.6, "screen6", { height: 1.05, depth: 0.55 });
    fE.box("satinBlack", 7.0, 2.2, 0.05, 3.2, 1.3, 0.1);
    fE.box("screen6", 6.25, 2.3, 0.102, 1.3, 0.8, 0.006, { uv: "keep" });
    fE.box("screen6", 7.75, 2.3, 0.102, 1.3, 0.8, 0.006, { uv: "keep" });
    fE.box("leds", 7.0, 1.7, 0.102, 2.8, 0.04, 0.006, { uv: "keep" });
    for (let k = 0; k < 10; k++) fE.box(k % 3 === 0 ? "emitAmber" : "emitTeal", 5.7 + k * 0.29, 2.78, 0.102, 0.16, 0.04, 0.006);
    fE.collider(5.3, 8.7, 1.4, 2.9, 0, 0.12, "board");
    wallLightBar(fE, 5.0, 9.0, 3.2, "emitCoolSoft");
    const pipes = [
      [1.0, 0.1, PALETTE.steel],
      [1.9, 0.06, PALETTE.orange],
      [2.7, 0.12, PALETTE.gunmetal],
      [3.6, 0.07, PALETTE.steel],
      [4.4, 0.1, PALETTE.steel],
      [9.6, 0.1, PALETTE.steel],
      [10.4, 0.07, PALETTE.orange],
      [11.3, 0.12, PALETTE.gunmetal],
      [12.1, 0.06, PALETTE.steel],
      [13.0, 0.1, PALETTE.steel],
    ];
    for (const [u, r, col] of pipes) {
      fE.cylV("metal", u, 1.8, r + 0.02, r, 3.5, { color: col, segments: 12 });
      for (const v of [0.45, 2.95]) fE.cylV("metal", u, v, r + 0.02, r + 0.03, 0.1, { color: PALETTE.darkMetal, segments: 12 });
      if (r >= 0.1) {
        const p = fE.pos(u, 1.3, r + 0.04);
        valveWheel(kit, p.x, p.y, p.z, "-x", 0.14);
      }
    }
    const fG = new Frame(kit, fE.pos(0, 0, 0.34), fE.U, fE.V); // gauge panels bracketed out in front of the pipes
    for (const [u0, u1] of [[0.7, 4.8], [9.3, 13.4]]) {
      const um = (u0 + u1) / 2;
      fE.cylU("metal", um, 2.4, 0.16, 0.08, u1 - u0, { color: PALETTE.steel, segments: 12 });
      fE.cylU("metal", um, 0.9, 0.14, 0.06, u1 - u0, { color: PALETTE.orange, segments: 10 });
      for (const du of [-0.4, 0.4]) fE.box("metal", um + du, 1.85, 0.16, 0.06, 0.4, 0.32, { color: PALETTE.darkMetal, texel: 2 });
      fG.box("satinBlack", um, 1.85, 0.03, 1.0, 0.5, 0.06);
      gauge(fG, um - 0.25, 1.85, 0.12, "emitTeal");
      gauge(fG, um + 0.25, 1.85, 0.12, "emitAmber");
      fE.collider(u0 - 0.2, u1 + 0.2, 0, 3.4, 0, 0.45, "manifold");
      wallLightBar(fE, u0, u1, 3.25, "emitCoolSoft");
    }
    stencil(fE, 2.7, 3.0, 0.36, 5, { color: PALETTE.cream });
    stencil(fE, 11.3, 3.0, 0.36, 4, { color: PALETTE.cream });
    stencil(fE, 4.6, 1.2, 0.3, 9, { plate: false, n: 0.36 });
  }

  // ------------------------------------------------------------ door wall: control bank north of the door, chemical tank and tool board south
  {
    wallConsole(fW, 10.4, 2.6, "screen6");
    fW.box("satinBlack", 10.4, 1.95, 0.04, 2.6, 0.9, 0.08);
    fW.box("screen6", 9.75, 1.95, 0.082, 1.1, 0.7, 0.006, { uv: "keep" });
    fW.box("screen6", 11.05, 1.95, 0.082, 1.1, 0.7, 0.006, { uv: "keep" });
    fW.box("leds", 10.4, 1.42, 0.05, 2.2, 0.04, 0.02, { uv: "keep" });
    fW.collider(9.0, 11.8, 1.4, 2.5, 0, 0.1, "bank");
    locker(fW, 12.6, 0.8, 2.1, { color: PALETTE.impGreyDark, band: PALETTE.tealPaint, decal: 4 });
    locker(fW, 13.45, 0.8, 2.1, { color: PALETTE.impGreyDark, band: PALETTE.tealPaint, decal: 6 });
    stencil(fW, 12.4, 2.5, 0.36, 4, { color: PALETTE.creamDark });
    wallLightBar(fW, 8.4, 13.8, 2.9, "emitCoolSoft");
    stencil(fW, 7.0, 2.55, 0.42, 12, { color: PALETTE.cream });
    // horizontal chemical tank on saddles
    const tz = 552.8;
    kit.cyl("painted", 2.75, y0 + 0.95, tz, 0.5, 3.4, "z", { color: PALETTE.slate, segments: 20, uv: "world", texel: 0.8 });
    for (const dz of [-1.2, 0, 1.2]) {
      kit.cyl("metal", 2.75, y0 + 0.95, tz + dz, 0.53, 0.08, "z", { color: PALETTE.steel, segments: 20 });
      kit.box("metal", 2.75, y0 + 0.28, tz + dz, 1.0, 0.56, 0.16, { color: PALETTE.darkMetal, texel: 2 });
    }
    for (const dz of [-1.7, 1.7]) kit.cyl("metal", 2.75, y0 + 0.95, tz + dz, 0.2, 0.06, "z", { color: PALETTE.darkMetal, segments: 12 });
    kit.box("hazard", 2.75, y0 + 0.95, tz, 1.02, 0.1, 0.3, { texel: 3 });
    kit.cyl("metal", 2.75, y0 + 1.7, tz + 1.3, 0.06, 0.6, "y", { color: PALETTE.steel, segments: 8 });
    valveWheel(kit, 2.75, y0 + 1.95, tz + 1.3, "+x", 0.12);
    kit.cyl("metal", 2.75, y0 + 1.6, tz - 1.4, 0.05, 0.5, "y", { color: PALETTE.orange, segments: 8 });
    stencil(standFrame(kit, 3.25, y0, tz - 0.3, "+x"), 0, 1.05, 0.34, 5, { plate: false, n: 0.01 });
    kit.collider([2.0, y0, tz - 1.8], [3.3, y0 + 1.5, tz + 1.8], "chemTank");
    // tool board and eyewash station above / beside it
    fW.box("painted", 3.2, 2.35, 0.02, 2.4, 0.9, 0.04, { color: PALETTE.gunmetal, uv: "keep" });
    for (let k = 0; k < 7; k++) {
      fW.cylV("metal", 2.2 + k * 0.33, 2.2, 0.06, 0.012, 0.3 + (k % 3) * 0.1, { color: PALETTE.steel, segments: 6 });
      fW.box("rubber", 2.2 + k * 0.33, 2.02 + (k % 3) * 0.02, 0.06, 0.05, 0.1, 0.05, { color: PALETTE.rubber });
    }
    fW.box("leds", 3.2, 2.7, 0.045, 2.0, 0.03, 0.01, { uv: "keep" });
    fW.box("painted", 5.4, 1.4, 0.15, 0.5, 0.9, 0.3, { color: PALETTE.cream, uv: "keep" });
    fW.box("metal", 5.4, 1.0, 0.31, 0.4, 0.1, 0.3, { color: PALETTE.steel, texel: 2 });
    fW.box("emitWhite", 5.4, 1.75, 0.305, 0.3, 0.1, 0.01);
    stencil(fW, 5.4, 1.4, 0.3, 13, { plate: false, n: 0.305 });
    fW.collider(5.1, 5.7, 0, 1.9, 0, 0.35, "eyewash");
    wallLightBar(fW, 0.6, 5.7, 2.9, "emitCoolSoft");
  }

  // ------------------------------------------------------------ forward wall behind the scrubbers, aft wall fill, ceiling ribs' pipe run
  {
    wallConsole(fN, 11.0, 1.8, "screen6");
    stencil(fN, 11.0, 1.7, 0.42, 12, { color: PALETTE.creamDark });
    fN.cylU("metal", 11.0, 2.6, 0.12, 0.1, 21.6, { color: PALETTE.steel, segments: 12 });
    fN.cylU("metal", 11.0, 2.85, 0.1, 0.06, 21.6, { color: PALETTE.orange, segments: 10 });
    for (let u = 1.0; u < 22; u += 2.75) fN.box("metal", u, 2.72, 0.08, 0.1, 0.5, 0.2, { color: PALETTE.darkMetal, texel: 2 });
    for (const u of [2.2, 9.4, 13.2, 20.4]) fN.box("satinBlack", u, 1.5, 0.04, 0.8, 1.2, 0.08);
    for (const u of [2.2, 20.4]) {
      fN.box("screen6", u, 1.7, 0.082, 0.66, 0.5, 0.006, { uv: "keep" });
      fN.box("leds", u, 1.15, 0.05, 0.6, 0.04, 0.02, { uv: "keep" });
    }
    for (const u of [9.4, 13.2]) {
      for (let k = 0; k < 8; k++) fN.box("metal", u, 1.0 + k * 0.12, 0.085, 0.6, 0.02, 0.06, { color: PALETTE.steel, tilt: 0.5 });
      fN.box("emitTeal", u + 0.3, 2.0, 0.085, 0.04, 0.04, 0.01);
    }
    stencil(fN, 5.4, 2.2, 0.4, 4, { color: PALETTE.cream });
    stencil(fN, 16.6, 2.2, 0.4, 4, { color: PALETTE.cream });
    stencil(fN, 21.2, 1.2, 0.3, 9, { color: PALETTE.creamDark });
    wallLightBar(fN, 0.6, 9.8, 3.2, "emitCoolSoft");
    wallLightBar(fN, 12.8, 21.4, 3.2, "emitCoolSoft");
    // aft wall: pipe drops, valves and light bars where the wall shows
    for (const u of [1.2, 2.2]) {
      fS.cylV("metal", u, 1.7, 0.14, 0.09, 3.3, { color: u > 2 ? PALETTE.orange : PALETTE.steel, segments: 10 });
      const p = fS.pos(u, 2.3, 0.22);
      valveWheel(kit, p.x, p.y, p.z, "-z", 0.13);
    }
    fS.collider(0.8, 2.6, 0, 3.4, 0, 0.35, "pipes");
    wallLightBar(fS, 0.6, 2.8, 3.2, "emitCoolSoft");
    stencil(fS, 1.7, 2.6, 0.36, 5, { color: PALETTE.cream });
    wallLightBar(fS, 14.0, 21.6, 3.2, "emitCoolSoft");
    stencil(fS, 20.2, 2.4, 0.4, 12, { color: PALETTE.cream });
  }
  return shell;
}
