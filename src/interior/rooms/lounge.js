// Recreation lounge (deck B, starboard, x 2..20 / z 512..524, h 3.0). Dim warm room off the spine.
// From the door: a bar counter with stools along the forward wall (back-bar shelving behind it), a card
// table in the middle, the holo-game table beyond the bar, two sofa groups on bordered rugs (one by the
// viewscreen wall, one mid-room), an L-bench corner by the door and a self-service drinks station on the
// aft wall. Every light is a practical: pendants, column lamps, recessed cans, the screen glow.
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { roomShell, wallLightBar, wallConsole } from "../shell.js";
import { PALETTE } from "../../materials.js";
import { pointLight } from "../lib.js";
import { rng } from "../../kit.js";
import { ceilingPlate, stencil, downlight, pendant, floorLamp, sofa, armchair, table, stool, cup, bench, locker, rug, holoMaterial, decalRect } from "./aftProps.js";

export function build(kit, ctx, room, lib) {
  const shell = roomShell(kit, ctx, room, { style: "light", lights: false, ceiling: false, seed: 31 });
  const { y0, yTop, frames } = shell;
  const { x0, x1, z0, z1 } = room;
  const rand = rng(3131);
  const fW = frames["-x"].frame; // port wall (door), u = z1 - z
  const fE = frames["+x"].frame; // starboard wall, u = z - z0
  const fN = frames["-z"].frame; // forward wall, u = x - x0
  const fS = frames["+z"].frame; // aft wall, u = x1 - x

  // ------------------------------------------------------------ ceiling: matte plate, ribs, warm cove, cans
  ceilingPlate(kit, room, yTop);
  const sof = 0.26;
  kit.boxMM("satinBlack", [x0, yTop - sof, z0], [x1, yTop, z0 + 0.7]);
  kit.boxMM("satinBlack", [x0, yTop - sof, z1 - 0.7], [x1, yTop, z1]);
  kit.boxMM("satinBlack", [x0, yTop - sof, z0], [x0 + 0.7, yTop, z1]);
  kit.boxMM("satinBlack", [x1 - 0.7, yTop - sof, z0], [x1, yTop, z1]);
  kit.boxMM("emitWarmSoft", [x0 + 0.7, yTop - sof, z0 + 0.6], [x1 - 0.7, yTop - sof + 0.05, z0 + 0.7], { uv: "keep" });
  kit.boxMM("emitWarmSoft", [x0 + 0.7, yTop - sof, z1 - 0.7], [x1 - 0.7, yTop - sof + 0.05, z1 - 0.6], { uv: "keep" });
  kit.boxMM("emitWarmSoft", [x0 + 0.6, yTop - sof, z0 + 0.7], [x0 + 0.7, yTop - sof + 0.05, z1 - 0.7], { uv: "keep" });
  kit.boxMM("emitWarmSoft", [x1 - 0.7, yTop - sof, z0 + 0.7], [x1 - 0.6, yTop - sof + 0.05, z1 - 0.7], { uv: "keep" });
  // recessed cans: a pair by the door (cool, so the threshold reads) and a warm row along the NE walkway
  for (const z of [516.9, 519.1]) downlight(kit, 3.4, yTop, z, "emitCoolSoft", 0.1);
  ctx.lights.cool.push(pointLight(0xdfe8ff, 6.0, 9, [3.4, yTop - 0.3, 518]));
  for (const x of [14.6, 16.4, 18.2]) downlight(kit, x, yTop, 513.3, "emitWarmSoft");
  ctx.lights.warm.push(pointLight(0xffc48c, 9, 11, [16.4, yTop - 0.3, 513.3]));

  // ------------------------------------------------------------ viewscreen wall (starboard, x = 20): screen0 centre, radar side panels
  {
    fE.box("satinBlack", 6, 1.8, 0.06, 6.4, 2.0, 0.12);
    fE.box("metal", 6, 1.8, 0.125, 6.2, 1.8, 0.01, { color: PALETTE.darkMetal, texel: 2 });
    fE.box("screen0", 6, 1.8, 0.131, 3.4, 1.7, 0.006, { uv: "keep" });
    fE.box("screen8", 3.5, 1.8, 0.131, 1.3, 1.3, 0.006, { uv: "keep" });
    fE.box("screen8", 8.5, 1.8, 0.131, 1.3, 1.3, 0.006, { uv: "keep" });
    for (const u of [3.5, 8.5]) {
      fE.box("leds", u, 1.02, 0.131, 1.2, 0.04, 0.006, { uv: "keep" });
      for (let k = 0; k < 3; k++) fE.box(k === 1 ? "emitAmber" : "emitBlue", u - 0.4 + k * 0.4, 2.58, 0.131, 0.16, 0.03, 0.006);
    }
    fE.box("leds", 6, 0.86, 0.13, 3.2, 0.04, 0.01, { uv: "keep" });
    // credenza under the screen: black cabinet, steel top, drawer lines, status strip
    fE.box("satinBlack", 6, 0.3, 0.25, 6.4, 0.6, 0.5);
    fE.box("metal", 6, 0.615, 0.26, 6.46, 0.03, 0.54, { color: PALETTE.steel, texel: 2 });
    for (let u = 3.6; u < 8.9; u += 1.05) fE.box("metal", u, 0.32, 0.5, 0.012, 0.44, 0.02, { color: PALETTE.gunmetal });
    for (let u = 3.4; u < 8.9; u += 1.05) fE.box("metal", u + 0.55, 0.5, 0.505, 0.3, 0.02, 0.02, { color: PALETTE.steel });
    fE.box("leds", 6, 0.1, 0.505, 5.8, 0.03, 0.01, { uv: "keep" });
    fE.collider(2.75, 9.25, 0, 0.65, 0, 0.56, "credenza");
    wallLightBar(fE, 3.0, 9.0, 2.82, "emitWarmSoft");
    ctx.lights.cool.push(pointLight(0x9fc6ff, 6, 12, [x1 - 0.45, y0 + 2.62, 518]));
    // flanks: game-gear lockers (forward end) and a programme selector console (aft end)
    locker(fE, 1.0, 0.72, 2.1, { color: PALETTE.cream, band: PALETTE.tealPaint, decal: 11 });
    locker(fE, 1.8, 0.72, 2.1, { color: PALETTE.creamDark, band: PALETTE.tealPaint, decal: 9 });
    wallLightBar(fE, 0.4, 2.5, 2.5);
    wallConsole(fE, 10.5, 1.3, "screen2");
    stencil(fE, 10.5, 1.9, 0.42, 14, { color: PALETTE.tealPaint });
    wallLightBar(fE, 9.4, 11.6, 2.5);
  }

  // ------------------------------------------------------------ sofa group by the viewscreen, on a bordered rug
  rug(kit, 14.9, 514.4, 19.1, 521.6, y0, { color: PALETTE.fabricTeal, border: PALETTE.fabricCream, line: PALETTE.fabricOrange });
  sofa(kit, "z", 518, 16.2, y0, 4.2, { facing: 1, color: PALETTE.fabricTeal });
  armchair(kit, 17.7, y0, 516.2, Math.PI / 2 - 0.6);
  armchair(kit, 17.7, y0, 519.8, Math.PI / 2 + 0.6);
  table(kit, 17.7, y0, 518, 1.3, 0.7, { h: 0.42 });
  cup(kit, 17.4, y0 + 0.42, 517.8, PALETTE.tealPaint);
  cup(kit, 17.95, y0 + 0.42, 518.25, PALETTE.orange);
  kit.box("satinBlack", 17.95, y0 + 0.43, 517.75, 0.22, 0.02, 0.15);
  kit.box("emitTeal", 17.95, y0 + 0.443, 517.75, 0.16, 0.006, 0.1);
  pendant(kit, ctx, 16.9, yTop, 518, { drop: 0.9, r: 0.42, intensity: 14, distance: 16, color: 0xffb070 });
  // column lamps at both ends of the sofa light its back so the group reads from the door
  floorLamp(kit, ctx, 16.0, y0, 515.35, { intensity: 7, distance: 9 });
  floorLamp(kit, ctx, 16.0, y0, 520.65, { intensity: 7, distance: 9 });

  // ------------------------------------------------------------ mid-room group: sofa facing two armchairs across a low table
  rug(kit, 9.4, 519.3, 13.8, 523.1, y0, { color: PALETTE.fabricOrange, border: PALETTE.fabricCream, line: PALETTE.fabricTeal });
  sofa(kit, "x", 11.6, 522.35, y0, 3.4, { facing: -1, color: PALETTE.fabricTeal, cushion: PALETTE.fabricCream });
  armchair(kit, 10.3, y0, 519.95, 0.3, { cushion: PALETTE.fabricCream });
  armchair(kit, 12.9, y0, 519.95, -0.3, { cushion: PALETTE.fabricCream });
  table(kit, 11.6, y0, 521.05, 1.3, 0.6, { h: 0.42 });
  cup(kit, 11.25, y0 + 0.42, 520.9, PALETTE.cream);
  cup(kit, 11.95, y0 + 0.42, 521.2, PALETTE.tealPaint);
  kit.box("painted", 11.65, y0 + 0.44, 520.95, 0.3, 0.04, 0.22, { color: PALETTE.orange, uv: "keep" });
  pendant(kit, ctx, 11.6, yTop, 521.0, { drop: 0.9, r: 0.42, intensity: 14, distance: 15, color: 0xffb070 });

  // ------------------------------------------------------------ bar counter along the forward wall, stools, pendants
  {
    const xa = 5.2;
    const xb = 9.8;
    const za = 514.75;
    const zb = 515.4;
    const h = 1.08;
    kit.boxMM("painted", [xa, y0 + 0.02, za], [xb, y0 + h - 0.05, zb], { color: PALETTE.impGreyDark, uv: "world", texel: 0.8 });
    kit.boxMM("satinBlack", [xa - 0.02, y0 + h - 0.05, za - 0.12], [xb + 0.02, y0 + h, zb + 0.14]);
    kit.boxMM("metal", [xa - 0.04, y0 + h, za - 0.14], [xb + 0.04, y0 + h + 0.03, zb + 0.16], { color: PALETTE.steel, texel: 2 });
    // fluted front face, warm kick glow, foot rail, end panels
    for (let x = xa + 0.12; x < xb - 0.05; x += 0.16) kit.boxMM("satinBlack", [x, y0 + 0.14, zb], [x + 0.07, y0 + h - 0.12, zb + 0.025]);
    kit.boxMM("emitWarmSoft", [xa + 0.1, y0 + 0.08, zb + 0.005], [xb - 0.1, y0 + 0.11, zb + 0.012], { uv: "keep" });
    kit.cyl("metal", (xa + xb) / 2, y0 + 0.24, zb + 0.28, 0.022, xb - xa - 0.2, "x", { color: PALETTE.steel, segments: 8 });
    for (const x of [xa + 0.2, (xa + xb) / 2, xb - 0.2]) kit.box("metal", x, y0 + 0.12, zb + 0.22, 0.04, 0.24, 0.14, { color: PALETTE.gunmetal });
    for (const x of [xa, xb]) kit.boxMM("satinBlack", [x - 0.03, y0, za - 0.1], [x + 0.03, y0 + h - 0.04, zb + 0.12]);
    // bartender side: lower work top with a recessed sink, taps and a glass rack
    kit.boxMM("satinBlack", [xa + 0.1, y0 + 0.86, za - 0.55], [xb - 0.1, y0 + 0.9, za]);
    kit.boxMM("painted", [xa + 0.14, y0 + 0.02, za - 0.5], [xb - 0.14, y0 + 0.86, za], { color: PALETTE.gunmetal, uv: "world", texel: 0.8 });
    kit.boxMM("metal", [7.0, y0 + 0.88, za - 0.48], [7.7, y0 + 0.905, za - 0.08], { color: PALETTE.darkMetal, texel: 2 });
    kit.cyl("metal", 7.35, y0 + 1.05, za - 0.05, 0.012, 0.3, "y", { color: PALETTE.steel, segments: 6 });
    kit.cyl("metal", 7.35, y0 + 1.2, za - 0.2, 0.012, 0.3, "z", { color: PALETTE.steel, segments: 6 });
    for (let k = 0; k < 6; k++) cup(kit, 8.3 + k * 0.16, y0 + 0.9, za - 0.25, k % 2 ? PALETTE.cream : PALETTE.tealPaint);
    for (let k = 0; k < 4; k++) cup(kit, 5.6 + k * 0.16, y0 + 0.9, za - 0.3, PALETTE.creamDark);
    // on the bar top: a tray with glasses, a bottle, a datapad, a small holo menu
    kit.box("metal", 6.2, y0 + h + 0.04, 515.05, 0.5, 0.02, 0.34, { color: PALETTE.steel, texel: 2 });
    for (let k = 0; k < 3; k++) cup(kit, 6.05 + k * 0.15, y0 + h + 0.05, 515.05, PALETTE.cream);
    kit.cyl("painted", 7.9, y0 + h + 0.17, 514.95, 0.045, 0.28, "y", { color: PALETTE.tealPaint, uv: "keep", segments: 10 });
    kit.cyl("metal", 7.9, y0 + h + 0.33, 514.95, 0.02, 0.06, "y", { color: PALETTE.steel, segments: 8 });
    kit.box("darkGloss", 8.9, y0 + h + 0.04, 515.1, 0.26, 0.02, 0.18);
    kit.box("screen2", 8.9, y0 + h + 0.052, 515.1, 0.2, 0.004, 0.13, { uv: "keep" });
    kit.box("satinBlack", 9.5, y0 + h + 0.12, 514.9, 0.16, 0.18, 0.08);
    kit.box("emitTeal", 9.5, y0 + h + 0.14, 514.945, 0.1, 0.1, 0.004);
    kit.collider([xa - 0.05, y0, za - 0.6], [xb + 0.05, y0 + h + 0.05, zb + 0.18], "bar");
    for (const x of [5.9, 7.1, 8.3, 9.5]) stool(kit, x, y0, 516.05, { seatH: 0.74, ring: true });
    for (const x of [6.1, 7.5, 8.9]) pendant(kit, ctx, x, yTop, 515.1, { drop: 1.0, r: 0.2, intensity: x === 7.5 ? 10 : 0, distance: 11, color: 0xffb070 });
  }

  // ------------------------------------------------------------ card table in the middle of the room
  {
    const tx = 7.6;
    const tz = 519.2;
    kit.cyl("metal", tx, y0 + 0.03, tz, 0.4, 0.06, "y", { color: PALETTE.darkMetal, segments: 20 });
    kit.cyl("metal", tx, y0 + 0.4, tz, 0.1, 0.7, "y", { color: PALETTE.gunmetal, segments: 12 });
    kit.cyl("satinBlack", tx, y0 + 0.74, tz, 0.6, 0.05, "y", { segments: 28 });
    kit.cyl("darkGloss", tx, y0 + 0.768, tz, 0.48, 0.006, "y", { segments: 28 });
    kit.add("painted", new THREE.TorusGeometry(0.58, 0.02, 8, 28), { pos: [tx, y0 + 0.765, tz], rot: [Math.PI / 2, 0, 0], color: PALETTE.orange, uv: "scale", uvScale: [6, 1] });
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
      kit.box("leds", tx + Math.cos(a) * 0.34, y0 + 0.774, tz + Math.sin(a) * 0.34, 0.16, 0.004, 0.05, { rot: [0, -a, 0], uv: "keep" });
      stool(kit, tx + Math.cos(a) * 1.0, y0, tz + Math.sin(a) * 1.0);
    }
    for (let k = 0; k < 5; k++) kit.box("painted", tx - 0.12 + k * 0.06, y0 + 0.775, tz + 0.02, 0.05, 0.004, 0.08, { rot: [0, 0.3 - k * 0.15, 0], color: k % 2 ? PALETTE.cream : PALETTE.tealPaint, uv: "keep" });
    kit.box("emitTeal", tx, y0 + 0.78, tz, 0.08, 0.012, 0.08);
    kit.collider([tx - 0.6, y0, tz - 0.6], [tx + 0.6, y0 + 0.8, tz + 0.6], "cardTable");
    pendant(kit, ctx, tx, yTop, tz, { drop: 0.95, r: 0.3, intensity: 9, distance: 12, color: 0xffb070 });
  }

  // ------------------------------------------------------------ holo-game table with stools
  const tx = 12.6;
  const tz = 515.4;
  kit.cyl("metal", tx, y0 + 0.03, tz, 0.55, 0.06, "y", { color: PALETTE.darkMetal, segments: 24 });
  kit.cyl("metal", tx, y0 + 0.4, tz, 0.22, 0.7, "y", { color: PALETTE.gunmetal, segments: 16 });
  kit.cyl("satinBlack", tx, y0 + 0.72, tz, 0.8, 0.1, "y", { segments: 32 });
  kit.cyl("metal", tx, y0 + 0.775, tz, 0.72, 0.012, "y", { color: PALETTE.darkMetal, segments: 32 });
  kit.add("painted", new THREE.TorusGeometry(0.78, 0.025, 8, 32), { pos: [tx, y0 + 0.77, tz], rot: [Math.PI / 2, 0, 0], color: PALETTE.orange, uv: "scale", uvScale: [6, 1] });
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2;
    kit.box("leds", tx + Math.cos(a) * 0.74, y0 + 0.69, tz + Math.sin(a) * 0.74, 0.16, 0.03, 0.01, { rot: [0, -a + Math.PI / 2, 0], uv: "keep" });
    stool(kit, tx + Math.cos(a + Math.PI / 4) * 1.2, y0, tz + Math.sin(a + Math.PI / 4) * 1.2);
  }
  kit.collider([tx - 0.8, y0, tz - 0.8], [tx + 0.8, y0 + 0.8, tz + 0.8], "holoTable");
  {
    const boardMat = holoMaterial(0x4fb0ff, 0.4);
    const ringMat = holoMaterial(0xa8dcff, 0.55);
    const redMat = holoMaterial(0xff7a4a, 0.75);
    const blueMat = holoMaterial(0x7fd0ff, 0.75);
    const group = new THREE.Group();
    group.name = "holoGame";
    const board = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.006, 36), boardMat);
    board.position.set(tx, y0 + 0.786, tz);
    group.add(board);
    const rings = [0.18, 0.36, 0.54].map((r) => new THREE.TorusGeometry(r, 0.005, 6, 40).rotateX(Math.PI / 2));
    const bars = [];
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI;
      const g = new THREE.BoxGeometry(1.1, 0.004, 0.008);
      g.rotateY(a);
      bars.push(g);
    }
    const ringMesh = new THREE.Mesh(mergeGeometries([...rings, ...bars], false), ringMat);
    ringMesh.position.set(tx, y0 + 0.79, tz);
    group.add(ringMesh);
    const pieceGeo = () => {
      const parts = [];
      for (let k = 0; k < 5; k++) {
        const a = rand() * Math.PI * 2;
        const r = 0.12 + rand() * 0.42;
        const g = k % 2 === 0 ? new THREE.ConeGeometry(0.035, 0.11, 8) : new THREE.CylinderGeometry(0.03, 0.03, 0.09, 8);
        g.translate(Math.cos(a) * r, 0.055, Math.sin(a) * r);
        parts.push(g);
      }
      return mergeGeometries(parts, false);
    };
    const red = new THREE.Mesh(pieceGeo(), redMat);
    const blue = new THREE.Mesh(pieceGeo(), blueMat);
    red.position.set(tx, y0 + 0.8, tz);
    blue.position.set(tx, y0 + 0.8, tz);
    group.add(red, blue);
    for (const m of group.children) m.castShadow = m.receiveShadow = false;
    const glow = pointLight(0x4fb0ff, 1.6, 8, [tx, y0 + 1.15, tz]);
    ctx.lights.teal.push(glow);
    const glowBase = glow.intensity;
    let t = 0;
    ctx.dynamic.push({
      object: group,
      update(dt) {
        t += dt;
        const p = 0.5 + 0.5 * Math.sin(t * 1.1);
        boardMat.opacity = 0.26 + 0.2 * p;
        ringMat.opacity = 0.35 + 0.3 * p;
        red.position.y = y0 + 0.8 + 0.012 * Math.sin(t * 1.7);
        blue.position.y = y0 + 0.8 + 0.012 * Math.sin(t * 1.7 + 2.1);
        glow.intensity = glowBase * (0.7 + 0.3 * p);
      },
    });
  }
  pendant(kit, ctx, tx, yTop, tz, { drop: 0.85, r: 0.36, intensity: 10, distance: 14, color: 0xffb070 });

  // ------------------------------------------------------------ L-bench corner by the door
  rug(kit, 3.0, 520.4, 8.6, 523.1, y0, { color: PALETTE.fabricTeal, border: PALETTE.fabricCream, line: PALETTE.fabricOrange, bw: 0.18 });
  bench(kit, "x", 6.6, 523.45, y0, 4.0, { facing: -1, color: PALETTE.fabricTeal });
  bench(kit, "z", 521.9, 2.45, y0, 2.4, { facing: 1, color: PALETTE.fabricTeal });
  table(kit, 4.7, y0, 522.0, 1.1, 0.7, { h: 0.42 });
  cup(kit, 4.5, y0 + 0.42, 521.85, PALETTE.creamDark);
  kit.box("painted", 4.95, y0 + 0.44, 522.15, 0.28, 0.04, 0.2, { color: PALETTE.tealPaint, uv: "keep" });
  pendant(kit, ctx, 5.3, yTop, 522.0, { drop: 0.85, r: 0.34, intensity: 8, distance: 14, color: 0xffb070 });
  // wall art over the bench + beside the door
  stencil(fW, 2.1, 1.75, 0.5, 0, { color: PALETTE.creamDark });
  stencil(fW, 3.4, 1.75, 0.5, 3, { color: PALETTE.tealPaint });
  wallLightBar(fW, 0.5, 4.6, 2.5, "emitWarmSoft");
  stencil(fW, 8.6, 1.65, 0.62, 2, { color: PALETTE.orange });
  stencil(fW, 10.2, 1.65, 0.5, 1, { color: PALETTE.cream });
  wallLightBar(fW, 7.6, 11.5, 2.5, "emitWarmSoft");
  fW.box("metal", 11.2, 0.9, 0.06, 0.5, 0.5, 0.12, { color: PALETTE.gunmetal });
  fW.box("emitRed", 11.2, 0.9, 0.125, 0.08, 0.08, 0.01);

  // ------------------------------------------------------------ forward wall: gear lockers, back-bar shelving, terminal, art, climate unit
  locker(fN, 0.9, 0.72, 2.1, { color: PALETTE.cream, band: PALETTE.tealPaint, decal: 11 });
  locker(fN, 1.7, 0.72, 2.1, { color: PALETTE.creamDark, band: PALETTE.tealPaint, decal: 9 });
  stencil(fN, 2.75, 1.7, 0.42, 14, { color: PALETTE.tealPaint });
  wallLightBar(fN, 0.4, 3.2, 2.5, "emitWarmSoft");
  {
    const uc = 5.5; // x 5.5..9.5, behind the bar
    fN.box("painted", uc, 0.43, 0.2, 4.0, 0.86, 0.4, { color: PALETTE.creamDark, uv: "keep" });
    fN.box("metal", uc, 0.03, 0.2, 4.04, 0.06, 0.42, { color: PALETTE.darkMetal });
    fN.box("metal", uc, 0.875, 0.21, 4.06, 0.03, 0.44, { color: PALETTE.steel, texel: 2 });
    for (let u = uc - 1.5; u <= uc + 1.5; u += 1.0) {
      fN.box("metal", u + 0.5, 0.5, 0.4, 0.012, 0.66, 0.015, { color: PALETTE.darkMetal });
      fN.box("metal", u, 0.74, 0.405, 0.28, 0.02, 0.02, { color: PALETTE.steel });
    }
    fN.box("painted", uc, 2.3, 0.2, 4.0, 0.12, 0.4, { color: PALETTE.creamDark, uv: "keep" });
    fN.box("painted", uc, 1.6, 0.01, 4.0, 1.4, 0.02, { color: PALETTE.slate, uv: "world", texel: 0.8 });
    for (const s of [-1, 1]) fN.box("metal", uc + s * 2.0, 1.6, 0.18, 0.05, 1.42, 0.36, { color: PALETTE.gunmetal });
    for (const v of [1.25, 1.65, 2.05]) fN.box("metal", uc, v, 0.17, 3.96, 0.03, 0.34, { color: PALETTE.gunmetal, texel: 2 });
    fN.box("emitWarmSoft", uc, 2.28, 0.3, 3.6, 0.012, 0.1, { uv: "keep" });
    // bottles, boxes, cartridges, a couple of labels on the back plate
    const cols = [PALETTE.tealPaint, PALETTE.creamDark, PALETTE.orange, PALETTE.gunmetal, PALETTE.cream];
    for (let u = uc - 1.8; u < uc + 1.85; u += 0.28 + rand() * 0.14) {
      const hgt = 0.14 + rand() * 0.16;
      fN.cylV("painted", u, 1.265 + hgt / 2, 0.17, 0.05 + rand() * 0.03, hgt, { color: cols[Math.floor(rand() * cols.length)], uv: "keep", segments: 12 });
      fN.cylV("metal", u, 1.265 + hgt + 0.012, 0.17, 0.04, 0.024, { color: PALETTE.steel, segments: 12 });
    }
    for (let u = uc - 1.8; u < uc + 1.7; u += 0.45 + rand() * 0.2) {
      const w = 0.22 + rand() * 0.16;
      const hgt = 0.12 + rand() * 0.14;
      fN.box("painted", u + w / 2, 1.665 + hgt / 2, 0.17, w, hgt, 0.22 + rand() * 0.08, { color: cols[Math.floor(rand() * cols.length)], uv: "keep" });
    }
    for (let u = uc - 1.85; u < uc + 0.6; u += 0.065) {
      fN.box("satinBlack", u, 2.065 + 0.09, 0.22, 0.04, 0.18, 0.12);
      if (rand() < 0.4) fN.box(rand() < 0.5 ? "emitTeal" : "emitOrange", u, 2.2, 0.283, 0.02, 0.012, 0.006);
    }
    for (let u = uc + 0.75; u < uc + 1.85; u += 0.34) fN.cylV("painted", u, 2.065 + 0.12, 0.17, 0.08, 0.24, { color: PALETTE.cream, uv: "keep", segments: 12 });
    fN.add("decal", new THREE.PlaneGeometry(0.3, 0.3), uc - 1.2, 1.5, 0.022, { uv: "keep", uvRect: decalRect(9) });
    fN.collider(uc - 2.05, uc + 2.05, 0, 2.4, 0, 0.46, "shelves");
  }
  // right of the shelves: holo-net terminal, framed stencil plates, a light bar and a climate unit
  wallConsole(fN, 8.7, 1.2, "screen9");
  wallLightBar(fN, 7.7, 9.9, 2.5, "emitWarmSoft");
  for (const [u, idx, col] of [[11.2, 0, PALETTE.tealPaint], [12.7, 8, PALETTE.creamDark], [14.2, 3, PALETTE.tealPaint]]) {
    fN.box("satinBlack", u, 1.7, 0.02, 0.86, 0.86, 0.04);
    stencil(fN, u, 1.7, 0.6, idx, { color: col, n: 0.04 });
  }
  wallLightBar(fN, 10.4, 15.0, 2.5, "emitWarmSoft");
  {
    const u = 16.8;
    fN.box("metal", u, 1.1, 0.22, 1.1, 2.2, 0.44, { color: PALETTE.gunmetal, texel: 1.5 });
    fN.box("painted", u, 1.2, 0.445, 0.9, 1.6, 0.01, { color: PALETTE.creamDark, uv: "keep" });
    for (let k = 0; k < 9; k++) fN.box("metal", u, 0.5 + k * 0.08, 0.455, 0.8, 0.02, 0.03, { color: PALETTE.steel, tilt: 0.5 });
    fN.box("darkGloss", u, 1.7, 0.45, 0.6, 0.3, 0.02);
    fN.box("screen3", u, 1.7, 0.462, 0.5, 0.22, 0.004, { uv: "keep" });
    fN.box("leds", u, 1.4, 0.452, 0.5, 0.04, 0.01, { uv: "keep" });
    fN.box("emitTeal", u - 0.35, 2.05, 0.452, 0.03, 0.03, 0.01);
    fN.collider(u - 0.56, u + 0.56, 0, 2.2, 0, 0.5, "climate");
  }

  // ------------------------------------------------------------ self-service drinks station on the aft wall
  {
    const uc = 3.2;
    fS.box("painted", uc, 0.45, 0.3, 3.6, 0.9, 0.6, { color: PALETTE.creamDark, uv: "keep" });
    fS.box("metal", uc, 0.04, 0.3, 3.62, 0.08, 0.62, { color: PALETTE.darkMetal });
    fS.box("emitWarm", uc, 0.1, 0.603, 3.3, 0.02, 0.01);
    fS.box("metal", uc, 0.925, 0.33, 3.7, 0.05, 0.68, { color: PALETTE.steel, texel: 2 });
    for (let u = uc - 1.2; u <= uc + 1.2; u += 1.2) fS.box("metal", u, 0.5, 0.6, 0.012, 0.66, 0.015, { color: PALETTE.darkMetal });
    for (let u = uc - 1.5; u < uc + 1.6; u += 1.2) fS.box("metal", u + 0.3, 0.78, 0.606, 0.3, 0.02, 0.02, { color: PALETTE.steel });
    fS.box("painted", uc, 0.42, 0.605, 3.4, 0.06, 0.01, { color: PALETTE.orange, uv: "keep" });
    // dispenser unit
    const du = 2.1;
    fS.box("painted", du, 1.32, 0.26, 0.8, 0.74, 0.5, { color: PALETTE.impGrey, uv: "keep" });
    fS.box("satinBlack", du, 1.32, 0.515, 0.7, 0.66, 0.02);
    fS.box("emitWarm", du, 1.12, 0.53, 0.36, 0.18, 0.01);
    fS.box("metal", du, 1.05, 0.56, 0.4, 0.02, 0.1, { color: PALETTE.steel });
    fS.cylN("metal", du - 0.08, 1.24, 0.53, 0.014, 0.06, { color: PALETTE.steel, segments: 8 });
    fS.cylN("metal", du + 0.08, 1.24, 0.53, 0.014, 0.06, { color: PALETTE.steel, segments: 8 });
    fS.box("screen2", du, 1.5, 0.53, 0.34, 0.16, 0.004, { uv: "keep" });
    fS.box("leds", du, 1.38, 0.53, 0.4, 0.03, 0.006, { uv: "keep" });
    for (let k = 0; k < 4; k++) fS.box("rubber", du - 0.24 + k * 0.16, 1.62, 0.53, 0.06, 0.04, 0.02, { color: PALETTE.rubber });
    cup(kit, x1 - (du - 0.1), y0 + 0.95, z1 - 0.32, PALETTE.cream);
    // cups, bottles, a tray
    for (let k = 0; k < 4; k++) cup(kit, x1 - (3.3 + k * 0.14), y0 + 0.95, z1 - 0.38, [PALETTE.tealPaint, PALETTE.cream, PALETTE.orange, PALETTE.creamDark][k]);
    for (let k = 0; k < 3; k++) cup(kit, x1 - (3.37 + k * 0.14), y0 + 0.95, z1 - 0.24, PALETTE.cream);
    kit.box("metal", x1 - 4.5, y0 + 0.96, z1 - 0.32, 0.5, 0.02, 0.36, { color: PALETTE.steel, texel: 2 });
    kit.cyl("painted", x1 - 4.4, y0 + 1.1, z1 - 0.28, 0.045, 0.26, "y", { color: PALETTE.tealPaint, uv: "keep", segments: 10 });
    kit.cyl("painted", x1 - 4.6, y0 + 1.08, z1 - 0.38, 0.045, 0.22, "y", { color: PALETTE.orange, uv: "keep", segments: 10 });
    // upper cabinet with an under-cabinet strip and light
    fS.box("painted", uc, 1.95, 0.2, 3.6, 0.7, 0.4, { color: PALETTE.creamDark, uv: "keep" });
    fS.box("metal", uc, 2.32, 0.21, 3.66, 0.04, 0.42, { color: PALETTE.gunmetal });
    for (let u = uc - 1.2; u <= uc + 1.2; u += 1.2) fS.box("metal", u, 1.95, 0.4, 0.012, 0.6, 0.015, { color: PALETTE.darkMetal });
    for (let u = uc - 1.5; u < uc + 1.6; u += 1.2) fS.box("metal", u + 0.3, 1.72, 0.406, 0.3, 0.02, 0.02, { color: PALETTE.steel });
    fS.add("decal", new THREE.PlaneGeometry(0.26, 0.26), uc - 0.6, 2.05, 0.41, { uv: "keep", uvRect: decalRect(11) });
    fS.add("decal", new THREE.PlaneGeometry(0.26, 0.26), uc + 1.2, 2.05, 0.41, { uv: "keep", uvRect: decalRect(12) });
    fS.box("paintedMetal", uc, 1.585, 0.25, 3.4, 0.04, 0.2, { color: PALETTE.darkMetal, texel: 2 });
    fS.box("emitWarmSoft", uc, 1.563, 0.25, 3.2, 0.012, 0.12, { uv: "keep" });
    ctx.lights.warm.push(pointLight(0xffc48c, 3.5, 9, [x1 - uc, y0 + 1.35, z1 - 0.75]));
    fS.collider(uc - 1.9, uc + 1.9, 0, 2.4, 0, 0.7, "bar");
  }
  // aft wall, left of the station: ship-schematic notice board, stencil, light bar
  {
    const u = 8.3;
    fS.box("satinBlack", u, 1.62, 0.03, 1.8, 1.0, 0.06);
    fS.box("screen7", u, 1.62, 0.062, 1.66, 0.83, 0.006, { uv: "keep" });
    fS.box("leds", u, 1.06, 0.04, 1.4, 0.04, 0.02, { uv: "keep" });
    stencil(fS, 6.5, 1.62, 0.5, 14, { color: PALETTE.cream });
    stencil(fS, 10.6, 1.62, 0.5, 12, { color: PALETTE.creamDark });
    wallLightBar(fS, 6.0, 11.0, 2.5, "emitWarmSoft");
  }
  // aft wall over the L-bench: framed art plates and a light bar
  for (const [u, idx, col] of [[12.4, 8, PALETTE.creamDark], [14.2, 2, PALETTE.tealPaint]]) {
    fS.box("satinBlack", u, 1.75, 0.02, 0.86, 0.86, 0.04);
    stencil(fS, u, 1.75, 0.6, idx, { color: col, n: 0.04 });
  }
  wallLightBar(fS, 11.6, 16.6, 2.5, "emitWarmSoft");
  return shell;
}
