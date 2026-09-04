// Mess Hall & Galley (Deck C): two rows of long tables with attached benches under warm pendant lamps,
// a stainless serving line with food dispensers and tray rail along the north wall, a menu board, and
// behind the half-height counter the galley annex: range with amber hotplates, extractor hood with ducts,
// pot rack, prep table, sinks, walk-in cooler with frost and blue light, drink dispensers.
// Amber accent; warm pools over the tables, clean bright whites over the galley.
import * as THREE from "three";
import { PALETTE } from "../materials.js";
import { impRoomShell, impWallGear, impPillar } from "./imperial_kit.js";
import { rng } from "../kit.js";
import { IMP_DECAL } from "../textures_imperial.js";
import { Placer, compound, B, C, DECK_C, longTable, counter, hoodLamp, cameraHousing, cableRun, floorStripe, wallSign, statusUnit, pendantGeo, pendantGlowGeo, crateStack, keyLight } from "./deck_c_kit.js";

export function buildMessHall(kit, ctx, room) {
  const [w, h, d] = room.size;
  const hx = w / 2;
  const hz = d / 2;
  const accentKey = ctx.accentKey ? ctx.accentKey(room) : "emitAmber";
  const accent = new THREE.Color(room.accent || "#ffc36b").getHex();
  const rand = rng(5202);
  const steel = PALETTE.impGrey;
  const walls = impRoomShell(kit, room, ctx.doors, {
    seed: 5202,
    accentKey,
    wall: { panelW: 1.8, features: { vent: 0.1, equipment: 0.06, conduit: 0.06, light: 0.08, screen: 0.04 }, altChance: 0.15 },
    walls: { N: { features: { vent: 0.16, conduit: 0.08 }, panelColor: PALETTE.impGrey, panelColorAlt: PALETTE.impWhite } },
    floor: { laneW: 2.6 },
    ceiling: { troughs: 2, troughW: 0.6, beamStep: 4.2 },
  });

  // ---------------------------------------------------------------- galley floor plate + serving counter
  const zCounter = -8.3;
  kit.boxMM("impMetalRough", [-hx + 0.3, 0, -hz + 0.3], [hx - 0.3, 0.012, zCounter + 0.5], { color: PALETTE.impGreyDark, texel: 0.7 });
  kit.boxMM("impTrim", [-hx + 0.3, 0, zCounter + 0.5], [hx - 0.3, 0.014, zCounter + 0.56], { color: PALETTE.impBlack });
  // serving line: x -12..4, staff gap 4..6, drinks counter 6.5..15.5
  counter(kit, -4, zCounter, 0, 16, { accentKey, top: steel, tag: "serving" });
  counter(kit, 11, zCounter, 0, 9, { accentKey, top: steel, tag: "drinks" });
  // tray rail along the serving front + sneeze-guard posts with a glass strip
  kit.cyl("impMetal", -4, 0.98, zCounter + 0.62, 0.02, 15.6, "x", { color: DECK_C.steel, segments: 8 });
  for (let x = -11.5; x <= 3.5; x += 1.5) kit.box("impMetal", x, 0.96, zCounter + 0.5, 0.05, 0.05, 0.28, { color: PALETTE.impGreyDark });
  for (let x = -11; x <= 3; x += 2.5) {
    kit.cyl("impMetal", x, 1.25, zCounter - 0.2, 0.015, 0.5, "y", { color: DECK_C.steel, segments: 8 });
  }
  kit.box("viewGlass", -4, 1.45, zCounter - 0.2, 15.2, 0.4, 0.012, { uv: "keep" });
  kit.box("impMetal", -4, 1.66, zCounter - 0.2, 15.2, 0.03, 0.03, { color: DECK_C.steel });
  // food dispensers on the back edge of the serving counter
  for (let i = 0; i < 5; i++) {
    const x = -10.5 + i * 3.0;
    const p = new Placer(kit, x, 1.0, zCounter - 0.15, 0);
    p.box("impPanel", 0, 0.42, 0, 0.7, 0.84, 0.5, { color: PALETTE.impWhite, uv: "world", texel: 1 });
    p.box("impTrim", 0, 0.05, 0, 0.72, 0.1, 0.52, { color: PALETTE.impBlack });
    p.box("impTrim", 0, 0.8, 0, 0.72, 0.08, 0.52, { color: PALETTE.impBlack });
    p.box("impMetal", 0, 0.38, 0.26, 0.5, 0.36, 0.02, { color: PALETTE.impCharcoal });
    p.box("impGloss", 0, 0.24, 0.27, 0.36, 0.14, 0.01);
    p.cyl("impMetal", 0, 0.14, 0.32, 0.03, 0.12, "z", { color: DECK_C.steel, segments: 8 });
    p.screen(i % 2 ? "scrAmber1" : "scrAmber0", 0, 0.62, 0.262, 0.4, 0.16, "+z");
    p.box(accentKey, -0.25, 0.62, 0.262, 0.04, 0.04, 0.01);
    p.box(i === 3 ? "emitRedImp" : "emitGreen", 0.25, 0.62, 0.262, 0.04, 0.04, 0.01);
    p.decal(IMP_DECAL.glyphs1, 0, 0.1, 0.262, 0.16, "+z");
    // warming tray in front of each dispenser
    p.box("impMetal", 0, -0.02, 0.62, 1.4, 0.05, 0.5, { color: steel });
    p.box("impGloss", 0, 0.01, 0.62, 1.3, 0.01, 0.4);
    p.box(accentKey, 0, 0.0, 0.87, 1.2, 0.01, 0.01);
    p.collider(-0.36, 0, -0.26, 0.36, 0.9, 0.3, "dispenser");
  }
  // tray stacks + cutlery bins at the W end of the line
  for (let k = 0; k < 8; k++) kit.box("impMetal", -12.7, 1.0 + k * 0.03, zCounter + 0.05 + (rand() - 0.5) * 0.02, 0.44, 0.02, 0.32, { color: k % 2 ? steel : PALETTE.impGreyDark });
  kit.box("impTrim", -12.7, 0.985, zCounter + 0.05, 0.5, 0.02, 0.38, { color: PALETTE.impBlack });
  for (const dx of [-0.6, -0.35]) kit.box("impMetal", -11.4 + dx, 1.06, zCounter - 0.1, 0.2, 0.12, 0.3, { color: PALETTE.impCharcoal });
  // staff gap: hinged half-door rail + floor chevrons
  kit.cyl("impMetal", 5.0, 1.0, zCounter, 0.02, 1.8, "x", { color: DECK_C.steel, segments: 8 });
  kit.box("impTrim", 4.1, 0.55, zCounter, 0.06, 1.1, 0.06, { color: PALETTE.impBlack });
  kit.box("impTrim", 5.9, 0.55, zCounter, 0.06, 1.1, 0.06, { color: PALETTE.impBlack });
  kit.box("impPanel1", 5.0, 0.6, zCounter, 1.7, 0.7, 0.03, { color: PALETTE.impGrey, uv: "world", texel: 1 });
  kit.box("chevronY", 5.0, 0.62, zCounter + 0.02, 1.6, 0.08, 0.01, { texel: 3 });
  kit.collider([4.05, 0, zCounter - 0.05], [5.95, 1.1, zCounter + 0.05], "gate");
  floorStripe(kit, 5.0, zCounter - 0.9, 5.0, zCounter + 0.9, 1.8, "chevronY");

  // ---------------------------------------------------------------- galley: range + hood + ducts
  {
    const zw = -hz;
    const rx = -6;
    const rl = 6.2;
    const p = new Placer(kit, rx, 0, zw + 0.55, 0);
    p.box("impTrim", 0, 0.45, 0, rl, 0.9, 0.8, { color: PALETTE.impBlack, texel: 1 });
    p.box("impMetal", 0, 0.92, 0, rl + 0.04, 0.04, 0.86, { color: steel, texel: 1 });
    p.box("impMetal", 0, 0.5, 0.41, rl - 0.1, 0.7, 0.02, { color: PALETTE.impCharcoal });
    // oven doors with dark windows and amber interiors
    for (const ox of [-2.0, 0.0, 2.0]) {
      p.box("impMetal", ox, 0.45, 0.43, 1.5, 0.5, 0.02, { color: PALETTE.impGreyDark });
      p.box("impGloss", ox, 0.5, 0.443, 1.0, 0.28, 0.01);
      p.box("emitAmber", ox, 0.5, 0.437, 0.9, 0.2, 0.005);
      p.box("impMetal", ox, 0.76, 0.46, 1.3, 0.03, 0.04, { color: DECK_C.steel });
      p.box(ox === 0 ? "emitRedImp" : accentKey, ox + 0.6, 0.8, 0.443, 0.04, 0.03, 0.01);
    }
    // hotplates: gloss discs with amber rings
    for (let i = 0; i < 5; i++) {
      const hxp = -2.4 + i * 1.2;
      p.cyl("impGloss", hxp, 0.95, 0, 0.26, 0.02, "y", { segments: 20 });
      kit.add("emitAmber", new THREE.TorusGeometry(0.17, 0.014, 8, 28).rotateX(Math.PI / 2), { pos: [rx + hxp, 0.962, zw + 0.55] });
      kit.add("emitAmber", new THREE.TorusGeometry(0.09, 0.012, 8, 20).rotateX(Math.PI / 2), { pos: [rx + hxp, 0.962, zw + 0.55] });
      p.cyl("impMetal", hxp, 0.96, 0.34, 0.03, 0.03, "y", { color: PALETTE.impGreyDark, segments: 10 });
    }
    // a pot on the range and a pan
    p.cyl("impMetal", -1.2, 1.1, 0, 0.2, 0.26, "y", { color: PALETTE.impGreyDark, segments: 16 });
    p.cyl("impMetal", -1.2, 1.24, 0, 0.21, 0.02, "y", { color: steel, segments: 16 });
    p.cyl("impMetal", 1.2, 1.0, 0, 0.18, 0.06, "y", { color: PALETTE.impCharcoal, segments: 16 });
    p.cyl("impMetal", 1.55, 1.02, 0, 0.012, 0.32, "x", { color: PALETTE.impBlack, segments: 6 });
    // backsplash, extractor hood, grille with a turning fan, ducts to the ceiling
    p.box("impMetal", 0, 1.5, -0.36, rl, 1.1, 0.03, { color: steel, texel: 1 });
    p.box("impMetal", 0, 2.35, 0.05, rl + 0.2, 0.5, 1.1, { color: PALETTE.impGreyDark, texel: 1 });
    p.box("impTrim", 0, 2.09, 0.05, rl + 0.22, 0.04, 1.12, { color: PALETTE.impBlack });
    p.box("emitWhiteSoft", 0, 2.095, 0.3, rl - 0.4, 0.02, 0.1, { uv: "keep" });
    p.box("impTrim", 0, 2.35, 0.61, 1.0, 0.44, 0.02, { color: PALETTE.impBlack });
    for (let k = 0; k < 6; k++) p.box("impMetal", 0, 2.16 + k * 0.07, 0.625, 0.9, 0.02, 0.012, { color: PALETTE.impGreyDark });
    for (const dx of [-1.6, 1.6]) {
      p.cyl("impMetal", dx, 2.6 + (h - 2.6) / 2, 0.05, 0.28, h - 2.6, "y", { color: PALETTE.impGreyDark, segments: 16 });
      p.cyl("impTrim", dx, 2.62, 0.05, 0.32, 0.08, "y", { color: PALETTE.impBlack, segments: 16 });
      p.cyl("impTrim", dx, h - 0.1, 0.05, 0.34, 0.1, "y", { color: PALETTE.impBlack, segments: 16 });
    }
    p.collider(-rl / 2, 0, -0.45, rl / 2, 1.0, 0.45, "range");
    // turning extractor fan behind the grille (one animated mesh)
    const blades = [C(0.05, 0.05, [0, 0, 0], PALETTE.impGreyDark, "z", 8)];
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      blades.push(B(0.34, 0.1, 0.015, [Math.cos(a) * 0.2, Math.sin(a) * 0.2, 0], PALETTE.impGrey, [0, 0.5, a, "ZYX"]));
    }
    const fan = new THREE.Mesh(compound(blades, 2), ctx.materials.impMetalRough);
    fan.position.set(rx, 2.35, zw + 0.55 + 0.55);
    kit.attach(fan);
    kit.onUpdate((dt) => {
      fan.rotation.z += dt * 3.2;
    });
    // menu board on the wall to the east of the hood (over the sinks), with a scrolling highlight line
    const N = walls.N.frame;
    const mu = hx + 1.0;
    N.box("impTrim", mu, 3.05, 0.1, 4.2, 1.1, 0.2, { color: PALETTE.impBlack, texel: 1 });
    N.box("impGloss", mu, 3.05, 0.21, 4.0, 0.9, 0.02);
    N.screen("scrAmber0", mu, 3.05, 0.225, 3.9, 0.8);
    N.box(accentKey, mu, 3.66, 0.21, 3.9, 0.04, 0.02);
    N.decal(IMP_DECAL.glyphs2, mu - 2.4, 3.05, 0.21, 0.4);
    N.decal(IMP_DECAL.glyphs1, mu + 2.4, 3.05, 0.21, 0.4);
    const line = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.02, 0.01), ctx.materials.emitAmber);
    line.position.set(1.0, 3.05, -hz + 0.235);
    kit.attach(line);
    let lt = 0;
    kit.onUpdate((dt) => {
      lt = (lt + dt * 0.12) % 1;
      line.position.y = 2.68 + lt * 0.74;
    });
  }
  // ---------------------------------------------------------------- galley: sinks + dishwasher along the N wall (x -2..3.6)
  {
    const zw = -hz;
    const p = new Placer(kit, 0.8, 0, zw + 0.5, 0);
    p.box("impTrim", 0, 0.45, 0, 5.4, 0.9, 0.7, { color: PALETTE.impBlack, texel: 1 });
    p.box("impPanel1", 0, 0.5, 0.36, 5.3, 0.7, 0.02, { color: PALETTE.impGrey, uv: "world", texel: 1 });
    p.box("impMetal", 0, 0.92, 0, 5.44, 0.04, 0.76, { color: steel, texel: 1 });
    for (const sx of [-1.8, -0.9]) {
      p.box("impGloss", sx, 0.941, 0, 0.7, 0.012, 0.5);
      p.box("impMetal", sx, 0.95, 0, 0.62, 0.006, 0.42, { color: PALETTE.impCharcoal });
      p.cyl("impMetal", sx, 1.1, -0.22, 0.016, 0.34, "y", { color: DECK_C.steel, segments: 8 });
      p.cyl("impMetal", sx, 1.26, -0.1, 0.014, 0.26, "z", { color: DECK_C.steel, segments: 8 });
    }
    // dishwasher: hooded unit with a status screen and steam vents
    p.box("impMetal", 1.5, 1.35, -0.1, 1.6, 0.82, 0.6, { color: PALETTE.impGreyDark, texel: 1 });
    p.box("impTrim", 1.5, 0.96, -0.1, 1.62, 0.06, 0.62, { color: PALETTE.impBlack });
    p.screen("scrAmber1", 1.5, 1.45, 0.205, 0.5, 0.2, "+z");
    for (let k = 0; k < 5; k++) p.box("impTrim", 0.9 + k * 0.3, 1.8, 0.14, 0.2, 0.03, 0.14, { color: PALETTE.impBlack });
    p.box(accentKey, 2.1, 1.45, 0.205, 0.04, 0.04, 0.01);
    p.box("emitGreen", 2.1, 1.35, 0.205, 0.04, 0.04, 0.01);
    // dish racks stacked beside it
    for (let k = 0; k < 4; k++) p.box("impMetal", -2.4 + (rand() - 0.5) * 0.04, 0.99 + k * 0.1, 0.05, 0.5, 0.06, 0.5, { color: k % 2 ? steel : PALETTE.impGreyDark });
    p.collider(-2.7, 0, -0.4, 2.7, 1.8, 0.4, "sinks");
    cableRun(walls.N.frame, hx - 2.0, hx + 3.8, 2.3, { n: 2, seed: 4, accentKey });
  }
  // ---------------------------------------------------------------- galley: prep island + pot rack
  {
    const px = 1.2;
    const pz = -10.2;
    const p = new Placer(kit, px, 0, pz, 0);
    p.box("impTrim", 0, 0.44, 0, 4.0, 0.88, 1.0, { color: PALETTE.impBlack, texel: 1 });
    p.box("impMetal", 0, 0.92, 0, 4.06, 0.04, 1.06, { color: steel, texel: 1 });
    p.box("impMetal", 0, 0.3, 0, 3.8, 0.04, 0.9, { color: PALETTE.impGreyDark });
    for (const sx of [-1.7, 1.7]) for (const sz of [-0.4, 0.4]) p.box("impMetal", sx, 0.44, sz, 0.08, 0.86, 0.08, { color: PALETTE.impGreyDark });
    p.box(accentKey, 0, 0.1, 0.51, 3.6, 0.02, 0.01);
    // boards, containers, a knife block
    p.box("impPanel1", -1.2, 0.955, 0.1, 0.6, 0.03, 0.4, { color: PALETTE.impWhite, uv: "world", texel: 2 });
    for (let k = 0; k < 4; k++) p.cyl("impPanel1", -0.2 + k * 0.32, 1.02, -0.25, 0.1, 0.16, "y", { color: k % 2 ? PALETTE.impGrey : PALETTE.impWhite, segments: 12 });
    p.box("impTrim", 1.4, 1.0, 0.15, 0.24, 0.12, 0.14, { color: PALETTE.impBlack });
    for (let k = 0; k < 3; k++) p.box("impMetal", 1.33 + k * 0.07, 1.14, 0.15, 0.012, 0.16, 0.03, { color: DECK_C.steel });
    p.collider(-2.03, 0, -0.53, 2.03, 0.96, 0.53, "prep");
    // pot rack: frame hung from the ceiling, hooks, hanging pots and pans
    for (const sx of [-1.8, 1.8]) for (const sz of [-0.35, 0.35]) p.cyl("impMetal", sx, 2.3 + (h - 2.3) / 2, sz, 0.015, h - 2.3, "y", { color: PALETTE.impGreyDark, segments: 6 });
    p.box("impTrim", 0, 2.3, 0, 3.8, 0.06, 0.9, { color: PALETTE.impBlack });
    for (const sz of [-0.3, 0.3]) p.cyl("impMetal", 0, 2.27, sz, 0.012, 3.6, "x", { color: DECK_C.steel, segments: 6 });
    const prand = rng(17);
    for (let k = 0; k < 10; k++) {
      const sx = -1.6 + k * 0.36 + (prand() - 0.5) * 0.08;
      const sz = k % 2 ? -0.3 : 0.3;
      const r = 0.08 + prand() * 0.1;
      const ph = 0.1 + prand() * 0.16;
      p.cyl("impMetal", sx, 2.2, sz, 0.006, 0.12, "y", { color: DECK_C.steel, segments: 6 });
      p.cyl("impMetal", sx, 2.13 - ph / 2, sz, r, ph, "y", { color: prand() < 0.5 ? steel : PALETTE.impGreyDark, segments: 14 });
      if (prand() < 0.5) p.cyl("impMetal", sx + r + 0.1, 2.13 - ph, sz, 0.008, 0.22, "x", { color: PALETTE.impBlack, segments: 6 });
    }
  }
  // ---------------------------------------------------------------- galley: shelving W end, walk-in cooler E, drink dispensers
  {
    const zw = -hz;
    // storage racks with containers at the W end of the galley
    for (const rx of [-15.2, -13.6]) {
      const p = new Placer(kit, rx, 0, zw + 0.5, 0);
      for (const sx of [-0.7, 0.7]) for (const sz of [-0.4, 0.4]) p.box("impTrim", sx, 1.1, sz, 0.06, 2.2, 0.06, { color: PALETTE.impBlack });
      for (const y of [0.3, 0.9, 1.5, 2.1]) {
        p.box("impMetal", 0, y, 0, 1.46, 0.04, 0.86, { color: PALETTE.impGreyDark, texel: 1 });
        const n = 2 + Math.floor(rand() * 3);
        for (let k = 0; k < n; k++) {
          const cx = -0.55 + (k + 0.5) * (1.3 / n);
          if (rand() < 0.5) p.cyl("impPanel1", cx, y + 0.19, (rand() - 0.5) * 0.3, 0.14, 0.34, "y", { color: rand() < 0.4 ? PALETTE.impGrey : PALETTE.impWhite, segments: 12 });
          else p.box("impPanel1", cx, y + 0.17, (rand() - 0.5) * 0.3, 0.36, 0.3, 0.36, { color: rand() < 0.5 ? PALETTE.impGreyDark : PALETTE.impGrey, uv: "world", texel: 2 });
        }
      }
      p.collider(-0.75, 0, -0.45, 0.75, 2.2, 0.45, "shelf");
    }
    // walk-in cooler door: heavy frame, thick door, latch bar, frosted window, blue light leaking out
    const cx = 9.6;
    const p = new Placer(kit, cx, 0, zw, 0);
    p.box("impTrim", 0, 1.45, 0.16, 2.9, 2.9, 0.32, { color: PALETTE.impBlack, texel: 1 });
    p.box("impMetal", 0, 2.85, 0.2, 3.0, 0.2, 0.4, { color: PALETTE.impCharcoal, texel: 1 });
    p.box("impPanel", 0, 1.35, 0.34, 2.2, 2.5, 0.08, { color: PALETTE.impWhite, uv: "world", texel: 1 });
    p.box("impTrim", 0, 1.35, 0.385, 2.24, 0.06, 0.02, { color: PALETTE.impBlack });
    p.box("impMetal", 0.7, 1.1, 0.42, 0.08, 0.5, 0.08, { color: DECK_C.steel });
    p.box("impMetal", 0.7, 1.1, 0.4, 0.2, 0.08, 0.06, { color: PALETTE.impGreyDark });
    p.box("impTrim", -0.4, 1.9, 0.39, 0.7, 0.5, 0.03, { color: PALETTE.impBlack });
    p.box("impGloss", -0.4, 1.9, 0.4, 0.6, 0.4, 0.02);
    // frost: pale streaks along the window edge and the door foot, "cold" stencils
    for (let k = 0; k < 6; k++) p.box("impPanel1", -0.4 + (rand() - 0.5) * 0.5, 1.72 + rand() * 0.06, 0.412, 0.12 + rand() * 0.2, 0.03, 0.006, { color: PALETTE.impWhite, uv: "world", texel: 3 });
    for (let k = 0; k < 8; k++) p.box("impPanel1", -1.0 + rand() * 2.0, 0.14 + rand() * 0.1, 0.383, 0.15 + rand() * 0.3, 0.05 + rand() * 0.06, 0.006, { color: PALETTE.impWhite, uv: "world", texel: 3 });
    p.decal(IMP_DECAL.vacuum, 0.55, 2.0, 0.382, 0.36, "+z");
    p.decal(IMP_DECAL.glyphs3, 0.0, 0.7, 0.382, 0.4, "+z");
    p.box("emitBlue", 0, 0.06, 0.39, 2.1, 0.03, 0.02);
    p.box("emitBlue", 0, 2.63, 0.39, 2.1, 0.03, 0.02);
    p.box("emitBlue", -0.4, 1.9, 0.395, 0.56, 0.36, 0.004);
    // temperature readout + compressor unit beside the door
    p.screen("scrBlue0", 1.75, 1.7, 0.34, 0.4, 0.24, "+z");
    p.box("impTrim", 1.75, 1.7, 0.3, 0.48, 0.32, 0.06, { color: PALETTE.impBlack });
    p.box("impMetal", -1.9, 0.5, 0.55, 0.8, 1.0, 0.7, { color: PALETTE.impGreyDark, texel: 1 });
    for (let k = 0; k < 6; k++) p.box("impTrim", -1.9, 0.25 + k * 0.12, 0.905, 0.7, 0.03, 0.01, { color: PALETTE.impBlack });
    p.cyl("impMetal", -1.9, 1.3, 0.3, 0.06, 0.6, "y", { color: PALETTE.impGreyDark, segments: 10 });
    p.collider(-2.35, 0, 0, 1.55, 3.0, 0.92, "cooler");
    kit.light({ type: "point", pos: [cx, 1.3, zw + 1.2], color: 0x6fa8ff, intensity: 3.0, decay: 1, distance: 6, priority: 0.36 });
    // drink dispensers on the drinks counter: three units with nozzles, cup stacks, drip trays
    for (let i = 0; i < 3; i++) {
      const dx = 8.2 + i * 2.6;
      const q = new Placer(kit, dx, 1.0, zCounter - 0.12, 0);
      q.box("impPanel", 0, 0.5, 0, 0.9, 1.0, 0.5, { color: PALETTE.impWhite, uv: "world", texel: 1 });
      q.box("impTrim", 0, 0.05, 0, 0.92, 0.1, 0.52, { color: PALETTE.impBlack });
      q.box("impTrim", 0, 0.97, 0, 0.92, 0.06, 0.52, { color: PALETTE.impBlack });
      q.box("impMetal", 0, 0.45, 0.26, 0.8, 0.5, 0.02, { color: PALETTE.impCharcoal });
      for (let n = 0; n < 3; n++) {
        q.cyl("impMetal", -0.25 + n * 0.25, 0.42, 0.34, 0.02, 0.14, "y", { color: DECK_C.steel, segments: 8 });
        q.box(n === 1 ? "emitRedImp" : accentKey, -0.25 + n * 0.25, 0.56, 0.272, 0.05, 0.03, 0.01);
      }
      q.box("impMetal", 0, 0.02, 0.4, 0.8, 0.03, 0.3, { color: steel });
      q.box("impGloss", 0, 0.036, 0.4, 0.7, 0.006, 0.22);
      q.screen(i === 1 ? "scrAmber0" : "scrAmber1", 0, 0.8, 0.262, 0.5, 0.2, "+z");
      q.decal(IMP_DECAL.glyphs1, -0.3, 0.2, 0.272, 0.14, "+z");
      // cup stack beside the unit
      for (let k = 0; k < 6; k++) q.cyl("impPanel1", 0.7, 0.05 + k * 0.05, 0.1, 0.045, 0.1, "y", { color: PALETTE.impGrey, segments: 10, r2: 0.036 });
      q.collider(-0.46, 0, -0.26, 0.9, 1.05, 0.3, "drinks");
    }
    statusUnit(walls.N.frame, hx + 15.6, 1.7, { screen: "scrAmber1", accentKey });
  }

  // ---------------------------------------------------------------- hall: tables, pendants, pillars
  const rows = [-3.9, 3.9];
  const cols = [-12.5, -5.0, 2.5, 10.0];
  let ti = 0;
  for (const z of rows) {
    for (const x of cols) {
      longTable(kit, x, z, 6.0, 0, { accentKey, items: 5 + (ti % 3), seed: 31 + ti, topColor: PALETTE.impGrey });
      for (const dx of [-1.6, 1.6]) {
        const m = new THREE.Matrix4().makeTranslation(x + dx, h - 1.0 - 0.9, z);
        kit.instance("mh_pendant", "impTrim", pendantGeo, m, 0xffffff);
        kit.instance("mh_pendant_glow", "emitWarmSoft", pendantGlowGeo, m, 0xffffff);
        kit.box("impTrim", x + dx, h - 0.04, z, 0.2, 0.08, 0.2, { color: PALETTE.impBlack });
      }
      ti++;
    }
  }
  impPillar(kit, -1.25, -7.0, h, { w: 0.6, accentKey });
  impPillar(kit, -1.25, 7.6, h, { w: 0.6, accentKey });
  // floor arrows from the door to the serving line
  floorStripe(kit, -14.5, 0.9, -14.5, -6.6, 0.22, "chevronY");
  for (let z = -1.0; z > -6.4; z -= 1.8) floorStripe(kit, -14.5, z, -14.5, z - 0.8, 0.5, "chevronY");

  // ---------------------------------------------------------------- south zone: tray return, standing tables, insignia
  {
    const zw = hz;
    const S = walls.S.frame; // u = hx - x
    // tray return: counter with a slot into the wall and a conveyor belt carrying a few trays
    const p = new Placer(kit, -1, 0, zw - 0.6, Math.PI);
    p.box("impTrim", 0, 0.45, 0, 5.0, 0.9, 1.0, { color: PALETTE.impBlack, texel: 1 });
    p.box("impPanel1", 0, 0.5, 0.51, 4.9, 0.7, 0.02, { color: PALETTE.impGrey, uv: "world", texel: 1 });
    p.box("impMetal", 0, 0.92, 0, 5.04, 0.04, 1.06, { color: steel, texel: 1 });
    p.box("rubber", 0, 0.95, 0, 4.6, 0.02, 0.6, { color: PALETTE.impBlack });
    for (let k = 0; k < 3; k++) {
      const tx = -1.6 + k * 1.5;
      p.box("impMetal", tx, 0.97, 0, 0.42, 0.025, 0.3, { color: steel });
      p.cyl("impMetal", tx + 0.12, 1.02, 0.06, 0.035, 0.09, "y", { color: PALETTE.impGreyDark, segments: 8 });
    }
    p.box(accentKey, 0, 0.1, 0.51, 4.6, 0.02, 0.01);
    // slot into the wall (dark opening with a lit lintel)
    S.box("impTrim", hx + 1, 1.3, 0.08, 5.2, 0.9, 0.16, { color: PALETTE.impBlack, texel: 1 });
    S.box("impGloss", hx + 1, 1.25, 0.165, 4.7, 0.62, 0.01);
    S.box(accentKey, hx + 1, 1.7, 0.165, 4.7, 0.03, 0.01);
    S.decal(IMP_DECAL.arrowUp, hx + 1, 2.1, 0.03, 0.36);
    p.collider(-2.55, 0, -0.55, 2.55, 0.96, 0.55, "trayreturn");
    // standing caf tables
    for (const tx of [7.0, 10.5]) {
      kit.cyl("impTrim", tx, 0.55, zw - 2.6, 0.06, 1.1, "y", { color: PALETTE.impBlack, segments: 12 });
      kit.cyl("impMetal", tx, 0.03, zw - 2.6, 0.4, 0.06, "y", { color: PALETTE.impCharcoal, segments: 18 });
      kit.cyl("impMetal", tx, 1.12, zw - 2.6, 0.45, 0.04, "y", { color: steel, segments: 20 });
      kit.cyl("impMetal", tx + 0.15, 1.19, zw - 2.6 + 0.1, 0.035, 0.1, "y", { color: PALETTE.impGreyDark, segments: 8 });
      kit.collider([tx - 0.45, 0, zw - 3.05], [tx + 0.45, 1.16, zw - 2.15], "cafTable");
    }
    // insignia + slogan glyphs on the S wall, wall gear, crates in the SE corner
    wallSign(S, hx - 8.7, 2.7, IMP_DECAL.cog, 0.9, accentKey);
    S.decal(IMP_DECAL.glyphs2, hx - 10.2, 2.7, 0.03, 0.5);
    S.decal(IMP_DECAL.glyphs1, hx - 7.2, 2.7, 0.03, 0.5);
    impWallGear(S, hx + 10.5, 1.5, { seed: 41, accentKey });
    hoodLamp(S, hx + 6.5, 2.4, "emitWarmSoft", 1.0);
    hoodLamp(S, hx - 4.0, 2.4, "emitWarmSoft", 1.0);
    crateStack(kit, hx - 1.1, zw - 1.0, 0.2, { seed: 5, decal: IMP_DECAL.bay02, n: 3 });
    crateStack(kit, hx - 2.3, zw - 0.9, -0.1, { seed: 6, decal: IMP_DECAL.glyphs1, n: 2 });
  }
  // ---------------------------------------------------------------- W wall (door wall): notice board, sanitizer, tray shelf
  {
    const W = walls.W.frame; // u = hz - z
    statusUnit(W, hz - 3.4, 1.7, { screen: "scrAmber0", accentKey, w: 1.0 });
    wallSign(W, hz - 5.0, 2.4, IMP_DECAL.glyphs3, 0.44, accentKey);
    // sanitizer station south of the door
    W.box("impTrim", hz - 2.2, 1.1, 0.1, 0.3, 0.5, 0.2, { color: PALETTE.impBlack });
    W.box("impPanel1", hz - 2.2, 1.1, 0.205, 0.24, 0.42, 0.01, { color: PALETTE.impWhite, uv: "world", texel: 2 });
    W.box(accentKey, hz - 2.2, 1.25, 0.212, 0.06, 0.02, 0.005);
    W.box("impMetal", hz - 2.2, 0.9, 0.22, 0.1, 0.04, 0.1, { color: DECK_C.steel });
    W.collider(hz - 2.4, hz - 2.0, 0, 1.4, 0, 0.24, "sanitizer");
    impWallGear(W, hz + 6.5, 1.6, { seed: 43, accentKey });
    hoodLamp(W, hz + 3.6, 2.5, "emitWarmSoft", 0.9);
  }
  // E wall: big cog + status, hood lamps
  {
    const E = walls.E.frame; // u = z + hz
    wallSign(E, hz, 2.6, IMP_DECAL.cog, 0.8, accentKey);
    statusUnit(E, hz - 3.6, 1.7, { screen: "scrAmber1", accentKey });
    statusUnit(E, hz + 3.6, 1.7, { screen: "scrWhite0", accentKey });
    impWallGear(E, hz + 7.5, 1.5, { seed: 47, accentKey });
    hoodLamp(E, hz - 7.0, 2.5, "emitWarmSoft", 1.0);
  }
  cameraHousing(kit, hx - 0.3, h - 0.55, hz - 0.3, Math.PI * 0.25);
  cameraHousing(kit, -hx + 0.3, h - 0.55, -hz + 0.3, -Math.PI * 0.75);

  // ---------------------------------------------------------------- lights (8): 4 warm over the tables, 2 white galley, blue cooler (above), amber south
  const warm = 0xffbf7a;
  for (const [i, z] of rows.entries()) {
    keyLight(kit, -8.75, 3.1, z, { color: warm, k: 1.9, distance: 13, priority: 0.5 - i * 0.01 });
    keyLight(kit, 6.25, 3.1, z, { color: warm, k: 1.9, distance: 13, priority: 0.49 - i * 0.01 });
  }
  keyLight(kit, -5.5, 3.3, -9.6, { color: 0xf0f6ff, k: 2.6, distance: 12, priority: 0.45 });
  keyLight(kit, 2.5, 3.3, -9.6, { color: 0xf0f6ff, k: 2.6, distance: 12, priority: 0.44 });
  keyLight(kit, 3, h - 0.6, 9.0, { color: accent, k: 1.3, distance: 13, priority: 0.4 });
}
