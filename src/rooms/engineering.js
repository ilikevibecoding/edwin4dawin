// Engineering Control (deck D): master systems control. A 15 m master display wall (framed screen
// banks around a holo ship schematic with a sweeping scan line) on the W wall, two rows of engineer
// consoles facing it, a supervisor pulpit on a dais behind them, an 8 m power-distribution breaker
// board on the N wall, equipment racks and coolant manifolds on the S wall, clamped pipe runs with
// valve stations and gauges along both long walls, grated cable trenches feeding the console rows, and
// a power-distribution island (two transformer banks under their own hooded lamps, bus ducts to the
// walls) filling the E half between the door and the pulpit.
// Light: the amber wash on the display wall is the key; hooded lamps pool light on the console rows,
// the pulpit and the transformer banks; the ceiling slots are dim recessed lines, never the key. One
// fixture colour temperature (amber-white) throughout; the deck between the door and the pulpit is
// plain tile (no painted lane: nothing drives through here).
import * as THREE from "three";
import { PALETTE } from "../materials.js";
import { impConsole, impChair, impRailing, impWallGear, impWallLight, impCrate, lux } from "./imperial_kit.js";
import { IMP_DECAL } from "../textures_imperial.js";
import { rng } from "../kit.js";
import { ensureDeckDMaterials, shellNoFloor, deckFloor, grateTrench, screenBank, breakerBoard, pipe, valveWheel, gauge, junctionBox, equipmentRack, dais, blinkers, decalD, decalImp, DECK_D_DECAL, wallU, warningLamp, cable, shroudLamp, cableTray, hexBolt, hazardBorder } from "./deck_d_kit.js";

export function buildEngineering(kit, ctx, room) {
  const [w, h, d] = room.size;
  const hx = w / 2;
  const hz = d / 2;
  const accentKey = "emitAmber";
  const DIM = "emitAmberDim"; // amber practicals (rail LEDs, cabinet strips)
  const WARM = "roomsd_warmLow"; // lamp lenses: dim amber-white, the deck's one fixture colour
  const amber = 0xffb040; // the display wall's wash
  const work = 0xffe0bc; // amber-white work light, every hooded lamp
  ensureDeckDMaterials(kit);
  const rand = rng(4471);

  // --- shell: walls + ceiling; the deck is ours (cable trenches need real cutouts)
  const walls = shellNoFloor(kit, room, ctx.doors, {
    accentKey,
    seed: 913,
    wall: { panelW: 1.9, features: { vent: 0.08, equipment: 0.14, conduit: 0.1, light: 0.0, screen: 0.08 }, altChance: 0.25 },
    walls: { W: { features: { vent: 0.0, equipment: 0.0, conduit: 0.0, light: 0.0, screen: 0.0 }, altChance: 0.6, panelColor: PALETTE.impGrey } },
    ceiling: { troughs: 2, troughW: 0.36, beamStep: 3.25, accentKey: DIM, lightKey: "roomsd_slotWarm" },
  });
  const trenches = [
    { x0: -12.6, z0: -9.6, x1: -11.7, z1: 9.6 },
    { x0: -8.4, z0: -9.6, x1: -7.5, z1: 9.6 },
    { x0: -12.6, z0: 10.2, x1: 3.0, z1: 11.0 },
  ];
  deckFloor(kit, -hx, -hz, hx, hz, trenches);
  trenches.forEach((t, i) => grateTrench(kit, t.x0, t.z0, t.x1, t.z1, { depth: 0.5, seed: 21 + i, cables: 3 + (i % 2), accentKey }));
  // the deck between the door and the pulpit is plain tile: one section stencil by the door, nothing else
  decalImp(kit, IMP_DECAL.glyphs2, [13.6, 0.016, -3.2], "up", 0.7, { spin: Math.PI / 2 });

  // --- master systems display wall (W wall): screen banks + holo schematic + cabinets + status strip
  const W = walls.W.frame;
  const uc = wallU(room, "W", 0); // u of z = 0
  {
    const keysA = ["scrAmber0", "scrAmber1", "scrBlue0", "scrAmber0", "scrBlue1", "scrAmber1"];
    // flanking banks
    screenBank(W, uc - 7.4, 1.55, 5, 3, 0.8, 0.55, 0.08, keysA, { seed: 31 });
    screenBank(W, uc + 2.92, 1.55, 5, 3, 0.8, 0.55, 0.08, keysA, { seed: 32 });
    // central schematic panel: black gloss slab, frame, holo dagger
    const pw = 5.4;
    const ph = 3.0;
    const pv = 1.5 + ph / 2;
    W.box("impTrim", uc, pv, 0.08, pw + 0.2, ph + 0.2, 0.16, { color: PALETTE.impBlack, texel: 1 });
    W.box("impGloss", uc, pv, 0.17, pw, ph, 0.02);
    W.box(accentKey, uc, pv + ph / 2 + 0.06, 0.17, pw - 0.4, 0.03, 0.01);
    W.box(accentKey, uc, pv - ph / 2 - 0.06, 0.17, pw - 0.4, 0.03, 0.01);
    const vTop = pv + ph / 2 - 0.25;
    const vBot = pv - ph / 2 + 0.35;
    const half = 1.55;
    const L = Math.hypot(half, vTop - vBot);
    const ang = Math.atan2(vTop - vBot, half);
    const n0 = 0.19;
    W.box("holo", uc + half / 2, (vTop + vBot) / 2, n0, L, 0.025, 0.01, { spin: Math.PI - ang });
    W.box("holo", uc - half / 2, (vTop + vBot) / 2, n0, L, 0.025, 0.01, { spin: ang });
    W.box("holo", uc, vBot, n0, half * 2, 0.025, 0.01);
    W.box("holo", uc, (vTop + vBot) / 2, n0, 0.015, vTop - vBot, 0.01);
    for (let i = 1; i <= 7; i++) {
      const v = vBot + ((vTop - vBot) * i) / 8;
      const ww = 2 * half * (1 - (v - vBot) / (vTop - vBot));
      W.box("holo", uc, v, n0, ww, 0.012, 0.01);
    }
    // superstructure + bridge tower outline, engine markers, fault markers
    W.box("holo", uc, vBot + 0.75, n0 + 0.002, 0.6, 0.012, 0.01);
    W.box("holo", uc, vBot + 1.15, n0 + 0.002, 0.3, 0.012, 0.01);
    for (const s of [-1, 0, 1]) W.box("holo", uc + s * 0.3, vBot + 0.95, n0 + 0.002, 0.012, 0.4, 0.01);
    for (const s of [-1, 1]) W.box("holo", uc + s * 0.15, vBot + 1.35, n0 + 0.002, 0.012, 0.4, 0.01);
    for (const s of [-1, 0, 1]) W.add("holoBright", new THREE.TorusGeometry(0.11, 0.012, 6, 16), uc + s * 0.75, vBot + 0.08, n0 + 0.003, { uv: "keep" });
    for (let k = 0; k < 7; k++) {
      const v = vBot + 0.3 + rand() * (vTop - vBot - 0.8);
      const ww = 2 * half * (1 - (v - vBot) / (vTop - vBot)) * 0.4;
      W.box("holoBright", uc + (rand() - 0.5) * ww, v, n0 + 0.004, 0.06, 0.06, 0.01);
    }
    // readouts along the panel's bottom edge
    for (let k = 0; k < 5; k++) W.screen(k % 2 ? "scrAmber1" : "scrBlue0", uc - 2.0 + k * 1.0, pv - ph / 2 + 0.16, 0.185, 0.8, 0.18);
    // scan line sweeping up and down the schematic (attached mesh, allocation-free update)
    const scan = new THREE.Mesh(new THREE.PlaneGeometry(half * 2 + 0.2, 0.03), ctx.materials.holoBright);
    const base = W.pos(uc, vBot, n0 + 0.006);
    scan.position.copy(base);
    scan.quaternion.copy(W.q);
    kit.attach(scan);
    const Vax = W.V.clone();
    const span = vTop - vBot;
    kit.onUpdate((dt, t) => {
      const s = (0.5 + 0.5 * Math.sin(t * 0.55)) * span;
      scan.position.copy(base).addScaledVector(Vax, s);
      scan.scale.x = 1 - (s / span) * 0.9;
    });
    // cabinets under the whole display (drawer fronts, vents, amber LED strips)
    const cu0 = uc - 7.5;
    const cu1 = uc + 7.5;
    W.box("impTrim", uc, 0.72, 0.28, cu1 - cu0, 1.36, 0.56, { color: PALETTE.impBlack, texel: 1 });
    W.box("impMetal", uc, 0.06, 0.3, cu1 - cu0 + 0.06, 0.12, 0.6, { color: PALETTE.impCharcoal, texel: 1 });
    const nC = Math.round((cu1 - cu0) / 1.25);
    for (let i = 0; i < nC; i++) {
      const u = cu0 + ((i + 0.5) * (cu1 - cu0)) / nC;
      W.box("impMetal", u, 0.85, 0.565, 1.1, 0.7, 0.01, { color: PALETTE.impCharcoal, texel: 1.5 });
      if (i % 3 === 1) for (let k = 0; k < 6; k++) W.box("impMetal", u, 0.6 + k * 0.08, 0.575, 0.8, 0.015, 0.01, { color: PALETTE.impGreyDark });
      else {
        W.box("impGloss", u, 1.0, 0.575, 0.9, 0.22, 0.01);
        W.box("impMetal", u, 0.62, 0.58, 0.3, 0.03, 0.02, { color: PALETTE.impGrey });
        W.box(i % 2 ? accentKey : "emitWhiteDim", u - 0.4, 1.0, 0.58, 0.04, 0.04, 0.01);
      }
      W.box(DIM, u, 1.36, 0.565, 1.0, 0.02, 0.01);
    }
    W.collider(cu0 - 0.1, cu1 + 0.1, 0, 1.4, 0, 0.6, "displayCabinet");
    W.collider(cu0 - 0.1, cu1 + 0.1, 1.4, h, 0, 0.2, "displayWall");
    // status strip above the banks + stencilled section labels
    W.box("impTrim", uc, 4.0, 0.06, cu1 - cu0, 0.3, 0.12, { color: PALETTE.impBlack, texel: 1 });
    W.box("leds", uc, 4.0, 0.125, cu1 - cu0 - 0.4, 0.06, 0.01, { uv: "scale", uvScale: [12, 1] });
    W.box(accentKey, uc, 4.12, 0.125, cu1 - cu0 - 0.4, 0.02, 0.01);
    for (let k = -3; k <= 3; k++) W.decal([IMP_DECAL.glyphs1, IMP_DECAL.glyphs2, IMP_DECAL.glyphs3][(k + 3) % 3], uc + k * 2.4, 4.42, 0.03, 0.34);
    // amber wall-wash fixtures over the display
    for (const du of [-5.2, 0, 5.2]) impWallLight(W, uc + du, h - 0.55, { key: accentKey, w: 1.6 });
  }

  // --- engineer console rows (face W = yaw +90°); chairs on the E side; every station a different screen set
  const rowA = { x: -10.5, zs: [-6.6, -2.2, 2.2, 6.6], w: 3.0 };
  const rowB = { x: -6.3, zs: [-4.4, 0, 4.4], w: 3.4 };
  const stationScreens = [["scrAmber0", "scrBlue2", "scrAmber1"], ["scrAmber2", "scrBlue0", "scrAmber3"], ["scrBlue1", "scrAmber1", "scrAmber2"], ["scrAmber3", "scrBlue3", "scrAmber0"]];
  let seed = 100;
  for (const row of [rowA, rowB]) {
    for (const z of row.zs) {
      impConsole(kit, row.x, 0, z, row.w, 0.9, { yaw: Math.PI / 2, seed: seed++, screens: stationScreens[seed % stationScreens.length], accentKey });
      impChair(kit, row.x + 1.05, 0, z, Math.PI / 2);
      // a cable drop from the console's back to the trench beside it
      cable(kit, [[row.x - 0.45, 0.35, z - 0.6], [row.x - 0.9, 0.1, z - 0.7], [row.x - 1.35, -0.2, z - 0.75]], 0.025, { color: PALETTE.impBlack });
    }
  }
  // --- supervisor pulpit: dais, tall console, railing on three sides
  {
    const x0 = -3.2;
    const x1 = 0.6;
    const z0 = -2.3;
    const z1 = 2.3;
    dais(kit, x0, z0, x1, z1, 0.3, { hazard: false });
    impConsole(kit, -2.2, 0.32, 0, 2.6, 0.9, { yaw: Math.PI / 2, seed: 77, screens: ["scrAmber1", "scrBlue1"], accentKey, tall: true });
    impChair(kit, -1.1, 0.32, 0, Math.PI / 2);
    impRailing(kit, [x0 + 0.1, z0 + 0.1], [x0 + 0.1, z1 - 0.1], 0.32, { light: DIM });
    impRailing(kit, [x0 + 0.1, z0 + 0.1], [x1 - 0.1, z0 + 0.1], 0.32);
    impRailing(kit, [x0 + 0.1, z1 - 0.1], [x1 - 0.1, z1 - 0.1], 0.32);
    // deck stencil + dim amber kick strip on the dais riser
    kit.boxMM(DIM, [x1 - 0.05, 0.04, z0 + 0.3], [x1 - 0.02, 0.1, z1 - 0.3]);
    decalImp(kit, IMP_DECAL.cog, [-1.3, 0.34, -1.5], "up", 0.7);
  }

  // --- N wall: breaker board, racks, valve station; S wall: racks, status panel, manifold
  const N = walls.N.frame;
  const S = walls.S.frame;
  breakerBoard(N, wallU(room, "N", -8), 0.34, 8.0, 2.6, { seed: 5, accentKey, rows: 3 });
  for (let i = 0; i < 3; i++) equipmentRack(kit, -2.6 + i * 1.0, -hz + 0.45, 0.9, 2.3, 0.8, "+z", { seed: 40 + i, accentKey });
  for (let i = 0; i < 4; i++) equipmentRack(kit, -15.2 + i * 1.0, hz - 0.45, 0.9, 2.3, 0.8, "-z", { seed: 50 + i, accentKey });
  // reactor / power status panel on the S wall (screens + gauges)
  {
    const u = wallU(room, "S", -3.4);
    S.box("impTrim", u, 1.6, 0.1, 4.6, 2.6, 0.2, { color: PALETTE.impBlack, texel: 1 });
    screenBank(S, u - 2.1, 1.6, 3, 2, 1.1, 0.5, 0.1, ["scrAmber0", "scrAmber1", "scrRed0", "scrBlue0"], { seed: 61, back: false, n: 0.2 });
    for (let k = 0; k < 6; k++) {
      const p = S.pos(u - 1.9 + k * 0.76, 0.85, 0.22);
      gauge(kit, [p.x, p.y, p.z], "-z", 0.14, { seed: 70 + k, warn: k === 4 });
    }
    S.box("impMetal", u, 0.45, 0.21, 4.2, 0.12, 0.02, { color: PALETTE.impCharcoal });
    for (let k = 0; k < 14; k++) S.box(k % 5 === 3 ? "emitRedImp" : accentKey, u - 1.95 + k * 0.3, 0.45, 0.225, 0.05, 0.05, 0.01);
    S.decal(IMP_DECAL.power, u - 2.0, 2.75, 0.21, 0.3);
    S.decal(IMP_DECAL.glyphs3, u + 1.4, 2.75, 0.21, 0.5);
    S.collider(u - 2.4, u + 2.4, 0, 2.9, 0, 0.25, "statusPanel");
  }
  // coolant manifold on the S wall: header pipe, 6 risers with valve wheels, gauges, drip tray
  {
    const xm0 = 1.6;
    const xm1 = 8.2;
    const zw = hz - 0.55;
    pipe(kit, [xm0 - 0.3, 1.25, zw], [xm1 + 0.3, 1.25, zw], 0.16, { color: PALETTE.impGreyDark, flanges: true, clampStep: 1.6 });
    pipe(kit, [xm0 - 0.3, 3.7, zw], [xm1 + 0.3, 3.7, zw], 0.12, { color: PALETTE.impGrey, flanges: true });
    for (let k = 0; k < 6; k++) {
      const x = xm0 + ((xm1 - xm0) * k) / 5;
      pipe(kit, [x, 1.25, zw], [x, 3.7, zw], 0.07, { color: [PALETTE.impGrey, PALETTE.impGreyDark][k % 2] });
      valveWheel(kit, [x, 2.2, zw - 0.36], "z", 0.17, { color: k % 3 === 2 ? PALETTE.impAmber : PALETTE.impRed, stem: 0.22 });
      if (k % 2 === 0) gauge(kit, [x + 0.3, 2.9, zw - 0.14], "-z", 0.09, { seed: 80 + k, warn: k === 2 });
      kit.box("impTrim", x, 1.25, zw, 0.3, 0.42, 0.42, { color: PALETTE.impBlack });
    }
    kit.boxMM("impMetal", [xm0 - 0.5, 0.0, zw - 0.5], [xm1 + 0.5, 0.12, hz - 0.08], { color: PALETTE.impCharcoal, texel: 1 });
    kit.boxMM("impTrim", [xm0 - 0.5, 0.12, zw - 0.5], [xm1 + 0.5, 0.16, zw - 0.44], { color: PALETTE.impBlack });
    decalD(kit, DECK_D_DECAL.grime, [(xm0 + xm1) / 2, 0.17, zw - 0.2], "up", 1.2, { h: 0.5 });
    kit.collider([xm0 - 0.5, 0, zw - 0.55], [xm1 + 0.5, 3.9, hz], "manifold");
    S.decal(IMP_DECAL.hazard, wallU(room, "S", (xm0 + xm1) / 2), 4.1, 0.03, 0.4);
  }
  // pipe runs along the N and S walls (two clamped lines each) with valve drops and gauges
  for (const side of [-1, 1]) {
    const z = side * (hz - 0.34);
    const z2 = side * (hz - 0.3);
    pipe(kit, [-hx + 0.3, 4.05, z], [hx - 0.3, 4.05, z], 0.13, { color: PALETTE.impGreyDark, clampStep: 2.4 });
    pipe(kit, [-hx + 0.3, 4.4, z2], [hx - 0.3, 4.4, z2], 0.09, { color: PALETTE.impGrey, clampStep: 2.4 });
    // drops to valve stations
    const xs = side < 0 ? [5.2, 9.6] : [-5.6, 12.2];
    for (const x of xs) {
      const zf = side * (hz - 0.34);
      pipe(kit, [x, 4.05, zf], [x, 1.35, zf], 0.1, { color: PALETTE.impGreyDark });
      kit.box("impTrim", x, 1.35, zf, 0.34, 0.3, 0.34, { color: PALETTE.impBlack });
      pipe(kit, [x, 1.35, zf], [x, 1.35, zf - side * 0.35], 0.07, { color: PALETTE.impGreyDark });
      valveWheel(kit, [x, 1.35 + 0.3, zf - side * 0.35], "y", 0.18, { color: PALETTE.impRed, stem: 0.12 });
      gauge(kit, [x + 0.42, 1.75, side * (hz - 0.2)], side < 0 ? "+z" : "-z", 0.1, { seed: 90 + x });
      kit.collider([x - 0.3, 0, side < 0 ? -hz : hz - 0.75], [x + 0.3, 2.2, side < 0 ? -hz + 0.75 : hz], "valve");
    }
    // junction boxes fed from the run
    const F = side < 0 ? N : S;
    const xs2 = side < 0 ? [7.4, 14.2] : [-8.6, 14.6];
    for (const x of xs2) junctionBox(F, wallU(room, side < 0 ? "N" : "S", x), 2.4, 0.7, 0.9, { seed: 200 + Math.round(x), accentKey, drops: 2 });
  }
  // warning lamps at the breaker board's ends (blinking) + static lamps on the manifold
  blinkers(kit, [
    { pos: [-12.3, 3.15, -hz + 0.42], size: [0.1, 0.1, 0.1], key: accentKey, period: 1.6, duty: 0.5, phase: 0 },
    { pos: [-3.7, 3.15, -hz + 0.42], size: [0.1, 0.1, 0.1], key: "emitRedImp", period: 1.1, duty: 0.4, phase: 0.3 },
    { pos: [1.4, 3.0, hz - 0.5], size: [0.08, 0.08, 0.08], key: accentKey, period: 2.2, duty: 0.5, phase: 0.7 },
  ]);
  warningLamp(kit, [-12.3, 3.15, -hz + 0.42], accentKey);
  warningLamp(kit, [-3.7, 3.15, -hz + 0.42], "emitRedImp");
  warningLamp(kit, [1.4, 3.0, hz - 0.5], accentKey);

  // --- E wall (door wall): deck sign, wall gear, fire cabinet, crates by the door
  const E = walls.E.frame;
  impWallGear(E, wallU(room, "E", -5.5), 1.5, { seed: 9, accentKey });
  impWallGear(E, wallU(room, "E", 8.5), 1.6, { seed: 10, accentKey });
  E.decal(IMP_DECAL.glyphs3, wallU(room, "E", -2.4), 3.6, 0.03, 0.55);
  E.decal(IMP_DECAL.arrowUp, wallU(room, "E", 2.4), 3.6, 0.03, 0.5);
  {
    const u = wallU(room, "E", 4.2);
    E.box("impTrim", u, 1.2, 0.12, 0.7, 1.1, 0.24, { color: PALETTE.impBlack, texel: 1 });
    E.box("impPanel1", u, 1.2, 0.245, 0.6, 1.0, 0.01, { color: PALETTE.impRed, uv: "world", texel: 1 });
    E.box("impMetal", u, 1.0, 0.255, 0.2, 0.04, 0.01, { color: PALETTE.impGrey });
    E.decal(IMP_DECAL.hazard, u, 1.45, 0.252, 0.3);
    E.collider(u - 0.4, u + 0.4, 0, 1.8, 0, 0.26, "fireCabinet");
  }
  impCrate(kit, hx - 1.1, 0, -hz + 1.2, 1.2, 0.9, 1.0, { seed: 3, decal: IMP_DECAL.bay02 });
  impCrate(kit, hx - 1.1, 0.9, -hz + 1.2, 0.9, 0.7, 0.9, { seed: 4, decal: IMP_DECAL.glyphs1 });
  impCrate(kit, hx - 1.2, 0, hz - 1.3, 1.4, 0.8, 1.2, { seed: 5, decal: IMP_DECAL.power });
  // old fault scorch by the breaker board, grime under the manifold, condensation on the N wall base
  decalD(kit, DECK_D_DECAL.scorch, [-6.4, 0.018, -hz + 1.5], "up", 2.8);
  decalD(kit, DECK_D_DECAL.streak, [-13.5, 0.9, -hz + 0.075], "+z", 1.6, { h: 1.2 });

  // --- power-distribution island in the E half: two transformer banks (three cabinets each with coil
  // stacks on top), a bus duct from each bank up into the ceiling and out to its wall, floor cable trays
  // from the banks to the wall junction boxes, hazard borders. Fills the floor between door and pulpit.
  const bankX = [6.0, 8.0, 10.0];
  for (const s of [-1, 1]) {
    const zc = s * 5.4;
    const F = s < 0 ? N : S;
    for (const [i, x] of bankX.entries()) {
      kit.box("impTrim", x, 1.1, zc, 1.8, 2.2, 1.5, { color: PALETTE.impBlack, texel: 1 });
      kit.box("impMetal", x, 0.06, zc, 1.9, 0.12, 1.6, { color: PALETTE.impCharcoal, texel: 1 });
      // lane-facing front: grey panel, louvre grille, gauge, status LEDs, power stencil, corner bolts
      const zf = zc - s * 0.76;
      const face = s < 0 ? "+z" : "-z";
      kit.box("impPanel1", x, 1.15, zf, 1.6, 1.9, 0.02, { color: PALETTE.impGrey, uv: "world", texel: 1 });
      for (let k = 0; k < 7; k++) kit.box("impTrim", x, 0.55 + k * 0.09, zf - s * 0.012, 1.1, 0.03, 0.02, { color: PALETTE.impBlack });
      gauge(kit, [x - 0.5, 1.75, zf - s * 0.02], face, 0.11, { seed: 300 + i + (s > 0 ? 3 : 0), warn: i === 1 && s > 0 });
      for (let k = 0; k < 3; k++) kit.box(k === 2 && i === 1 ? "emitRedImp" : k === 0 ? accentKey : DIM, x + 0.15 + k * 0.18, 1.75, zf - s * 0.015, 0.06, 0.06, 0.01);
      decalImp(kit, IMP_DECAL.power, [x + 0.45, 1.3, zf - s * 0.02], face, 0.32);
      decalImp(kit, IMP_DECAL.glyphs2, [x - 0.4, 1.3, zf - s * 0.02], face, 0.3);
      for (const [du, dv] of [[-0.72, 0.15], [0.72, 0.15], [-0.72, 2.05], [0.72, 2.05]]) hexBolt(kit, [x + du, dv, zf - s * 0.012], face, 0.04);
      // coil stack on the roof: three insulator columns with a bus bar across
      for (let k = 0; k < 3; k++) {
        const cxk = x - 0.5 + k * 0.5;
        kit.cyl("impMetal", cxk, 2.5, zc, 0.16, 0.6, "y", { color: PALETTE.impGreyDark, segments: 14 });
        for (let r = 0; r < 4; r++) kit.cyl("impTrim", cxk, 2.3 + r * 0.14, zc, 0.2, 0.04, "y", { color: PALETTE.impBlack, segments: 14 });
        kit.cyl("impMetal", cxk, 2.86, zc, 0.06, 0.12, "y", { color: PALETTE.impGrey, segments: 8 });
      }
      kit.box("impMetal", x, 2.92, zc, 1.2, 0.05, 0.1, { color: PALETTE.impGrey });
      kit.collider([x - 0.95, 0, zc - 0.8], [x + 0.95, 2.3, zc + 0.8], "transformer");
    }
    // bus duct along the bank tops; at the E end a riser into the ceiling and a spur to the wall (the E
    // end keeps both clear of the S manifold risers and the N valve-station drops)
    const xe = bankX[2] + 0.7;
    kit.boxMM("impTrim", [bankX[0] - 0.9, 3.0, zc - 0.2], [xe + 0.2, 3.4, zc + 0.2], { color: PALETTE.impBlack, texel: 1 });
    for (const x of bankX) kit.box("impMetal", x, 2.98, zc, 0.5, 0.12, 0.5, { color: PALETTE.impCharcoal, texel: 1 });
    kit.boxMM("impTrim", [xe - 0.2, 3.4, zc - 0.2], [xe + 0.2, h - 0.4, zc + 0.2], { color: PALETTE.impBlack, texel: 1 });
    kit.box("impMetal", xe, h - 0.42, zc, 0.6, 0.06, 0.6, { color: PALETTE.impCharcoal });
    kit.boxMM("impTrim", [xe - 0.2, 3.0, s < 0 ? -(hz - 0.1) : zc + 0.2], [xe + 0.2, 3.4, s < 0 ? zc - 0.2 : hz - 0.1], { color: PALETTE.impBlack, texel: 1 });
    kit.box("impTrim", xe, 3.2, s * (hz - 0.3), 0.9, 0.9, 0.5, { color: PALETTE.impBlack, texel: 1 });
    // floor cable tray from the bank's wall side into a wall box, and a wall stencil
    cableTray(kit, [[xe - 0.3, 0, zc + s * 0.8], [xe - 0.3, 0, s * (hz - 0.45)]], { w: 0.44, seed: 330 + s, cables: 3 });
    kit.box("impTrim", xe - 0.3, 0.14, s * (hz - 0.32), 0.7, 0.28, 0.3, { color: PALETTE.impBlack, texel: 1 });
    F.decal(IMP_DECAL.hazard, wallU(room, s < 0 ? "N" : "S", xe), 2.3, 0.03, 0.45);
    hazardBorder(kit, bankX[0] - 1.3, zc - 1.2, bankX[2] + 1.3, zc + 1.2, 0, 0.22);
    // hooded lamp over the bank's lane-facing edge: a SPOT aimed at the deck, so the cone lights the
    // bank front, the coil stacks and the walkway, and nothing reaches the ceiling above the hood
    const zl = zc - s * 2.6;
    const mouth = shroudLamp(kit, [bankX[1], h - 0.08, zl], [bankX[1], 4.2, zl], [bankX[1], 0, zl], { key: WARM, size: 0.55 });
    kit.light({ type: "spot", pos: [mouth[0], mouth[1] - 0.1, mouth[2]], target: [bankX[1], 0, zc - s * 1.2], color: work, intensity: lux(4.0, 4.0), distance: 15, angle: 1.25, penumbra: 0.5, priority: 0.62 + (s < 0 ? 0.01 : 0) });
  }
  // wear where the transformer banks sit: large faint smudges under their front edges, not on the walkway
  decalD(kit, DECK_D_DECAL.scorch, [bankX[0] - 0.2, 0.018, -4.3], "up", 2.6);
  decalD(kit, DECK_D_DECAL.grime, [bankX[2] + 0.4, 0.018, 4.5], "up", 3.0);

  // --- lights (8), one fixture colour temperature (amber-white) beside the display wall's amber wash.
  // Key: the wash spot on the display wall. Work light: hooded spots over both transformer banks
  // (declared above) and low pendants over the console rows, the pulpit and the door approach. A
  // pendant's source sits 30 cm under the hood mouth with LINEAR falloff (decay 1): the hood interior
  // is never lit from inside (dark hood, dim lens), the ceiling 2 m above gets no more than the deck
  // 3 m below, and the wide soft pool is what fills the room. No bare ceiling points: the ceiling slots
  // are dim recessed lines.
  kit.light({ type: "spot", pos: [-12.0, h - 0.4, 0], target: [-17, 2.2, 0], color: amber, intensity: lux(5.5, 3.0), distance: 16, angle: 1.15, penumbra: 0.55, priority: 0.7 });
  const pendant = (x, z, target, k, priority) => {
    const mouth = shroudLamp(kit, [x, h - 0.08, z], [x, 3.3, z], target, { key: WARM, size: 0.5 });
    kit.light({ type: "point", pos: [mouth[0], mouth[1] - 0.3, mouth[2]], color: work, intensity: 2.9 * k, distance: 14, decay: 1, priority });
  };
  for (const [i, z] of [-5.0, 0, 5.0].entries()) pendant(-8.4, z, [-8.4, 0.9, z], 3.0, 0.58 - i * 0.01);
  pendant(-1.4, 0, [-2.2, 1.0, 0], 2.8, 0.5);
  pendant(12.4, 0, [12.4, 0, 0], 3.0, 0.46);
}
