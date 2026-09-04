// Medical Bay (Deck C): a four-bed ward along the north wall under overhead monitor arms and headwall
// units, a bacta tank on a railed platform at the west end (bubbling, pulsing core), a surgical station
// under an articulated ceiling boom, glass-fronted supply cabinets with medical stencils along the south
// wall, a droid docking niche, and a reception counter + wash station by the door.
// Teal accent; sterile whites: emissive ceiling panels + high white keys, teal floor edge strips.
import * as THREE from "three";
import { PALETTE } from "../materials.js";
import { impRoomShell, impConsole, impChair, impRailing, impWallGear } from "./imperial_kit.js";
import { rng } from "../kit.js";
import { IMP_DECAL, impDecalRect } from "../textures_imperial.js";
import { Placer, compound, B, C, DECK_C, ceilingPanel, cameraHousing, cableRun, wallSign, statusUnit, medDroid, monitorArm, counter, hoodLamp, crateStack, rod, tube, ring, keyLight } from "./deck_c_kit.js";

const ACCENT = "emitTeal";
const WHITE = PALETTE.impWhite;
const BLK = PALETTE.impBlack;
const CHR = PALETTE.impCharcoal;
const GD = PALETTE.impGreyDark;
const STEEL = DECK_C.steel;
const PALE_TEAL = new THREE.Color("#a9cfc9");

/** Floor decal (room-local, facing up). */
function floorDecal(kit, index, x, z, size, y = 0.008, yaw = 0) {
  kit.add("decalImp", new THREE.PlaneGeometry(size, size).rotateX(-Math.PI / 2), { pos: [x, y, z], rot: [0, yaw, 0], uv: "keep", uvRect: impDecalRect(index) });
}

/** Med bed for kit.instance: plinth, pedestal, frame, white padded top, pillow, head/foot panels, rails. Head at local -z. */
function medBedGeo() {
  return compound(
    [
      B(0.7, 0.16, 1.2, [0, 0.08, 0], CHR),
      B(0.5, 0.42, 0.7, [0, 0.37, 0], BLK),
      B(0.94, 0.08, 2.1, [0, 0.62, 0], BLK),
      B(0.9, 0.14, 2.02, [0, 0.73, 0.02], WHITE),
      B(0.84, 0.06, 0.46, [0, 0.83, -0.72], WHITE),
      B(0.92, 0.28, 0.05, [0, 0.9, -1.03], BLK),
      B(0.92, 0.2, 0.05, [0, 0.86, 1.03], BLK),
      C(0.014, 1.2, [0.48, 0.94, 0.1], STEEL, "z", 8),
      C(0.014, 1.2, [-0.48, 0.94, 0.1], STEEL, "z", 8),
      B(0.03, 0.24, 0.03, [0.48, 0.82, -0.45], GD),
      B(0.03, 0.24, 0.03, [0.48, 0.82, 0.65], GD),
      B(0.03, 0.24, 0.03, [-0.48, 0.82, -0.45], GD),
      B(0.03, 0.24, 0.03, [-0.48, 0.82, 0.65], GD),
      B(0.18, 0.05, 0.28, [0.42, 0.6, 0.9], GD),
    ],
    1,
  );
}

/** Wheeled med cart for kit.instance: posts, shelves, casters, push handle, drawer module, a few supplies. */
function medCartGeo() {
  const parts = [];
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      parts.push(C(0.014, 0.9, [sx * 0.3, 0.5, sz * 0.22], STEEL, "y", 6));
      parts.push(C(0.035, 0.03, [sx * 0.3, 0.035, sz * 0.22], CHR, "x", 8));
    }
  }
  for (const y of [0.12, 0.5]) parts.push(B(0.66, 0.02, 0.5, [0, y, 0], WHITE));
  parts.push(B(0.7, 0.05, 0.54, [0, 0.93, 0], BLK));
  parts.push(B(0.62, 0.3, 0.46, [0, 1.11, 0], WHITE));
  for (let k = 0; k < 2; k++) parts.push(B(0.56, 0.012, 0.012, [0, 1.0 + k * 0.14, 0.235], BLK));
  for (let k = 0; k < 2; k++) parts.push(B(0.12, 0.02, 0.012, [0, 1.07 + k * 0.14, 0.235], GD));
  parts.push(C(0.012, 0.5, [-0.38, 1.05, 0], STEEL, "z", 6));
  for (const sz of [-1, 1]) parts.push(C(0.012, 0.16, [-0.35, 1.0, sz * 0.25], STEEL, "x", 6));
  parts.push(B(0.2, 0.08, 0.3, [0.1, 0.55, 0], PALE_TEAL));
  parts.push(C(0.05, 0.18, [-0.15, 0.6, 0.1], WHITE, "y", 8));
  parts.push(B(0.24, 0.12, 0.34, [0.05, 0.19, 0], WHITE));
  return compound(parts, 1);
}

/** Wheeled privacy screen: tubular frame, casters, fabric panel; length along local x. */
function privacyScreen(kit, x, z, yaw, len = 2.2, opts = {}) {
  const p = new Placer(kit, x, 0, z, yaw);
  const h = 1.85;
  for (const s of [-1, 1]) {
    p.box("impTrim", s * (len / 2 - 0.05), 0.06, 0, 0.1, 0.05, 0.5, { color: BLK });
    for (const c of [-0.2, 0.2]) p.cyl("rubber", s * (len / 2 - 0.05), 0.035, c, 0.035, 0.03, "x", { color: CHR, segments: 8 });
    p.cyl("impMetal", s * (len / 2 - 0.05), h / 2, 0, 0.02, h, "y", { color: GD, segments: 8 });
  }
  p.cyl("impMetal", 0, h - 0.02, 0, 0.02, len - 0.1, "x", { color: GD, segments: 8 });
  p.cyl("impMetal", 0, 0.34, 0, 0.016, len - 0.1, "x", { color: GD, segments: 8 });
  p.box("fabric", 0, (h - 0.04 + 0.36) / 2, 0, len - 0.16, h - 0.4, 0.02, { color: opts.color || PALE_TEAL, texel: 1 });
  p.box("impTrim", 0, 1.2, 0.02, 0.24, 0.12, 0.01, { color: BLK });
  p.decal(IMP_DECAL.medical, 0, 1.2, 0.03, 0.1);
  p.collider(-len / 2, 0, -0.1, len / 2, h, 0.1, "screen");
}

/** IV / drip stand: weighted base, pole, hook, bag with a line down toward the bed. */
function ivStand(kit, x, z, toward) {
  kit.cyl("impTrim", x, 0.02, z, 0.22, 0.04, "y", { color: BLK, segments: 14 });
  kit.cyl("impMetal", x, 0.95, z, 0.015, 1.86, "y", { color: STEEL, segments: 8 });
  kit.cyl("impMetal", x, 1.88, z, 0.012, 0.3, "x", { color: STEEL, segments: 6 });
  kit.box("impPanel1", x + 0.12, 1.66, z, 0.12, 0.26, 0.05, { color: WHITE, uv: "world", texel: 2 });
  kit.box(ACCENT, x + 0.12, 1.6, z + 0.028, 0.08, 0.06, 0.005);
  tube(kit, "impMetal", [[x + 0.12, 1.52, z], [x + 0.18, 1.2, z + 0.1 * toward], [x + 0.25, 0.95, z + 0.4 * toward]], 0.006, { color: STEEL });
  kit.collider([x - 0.22, 0, z - 0.22], [x + 0.22, 1.9, z + 0.22], "iv");
}

/** Bedside unit: small cabinet with two drawers, tray with a cup and a datapad. Drawers face +z. */
function bedsideUnit(kit, x, z) {
  kit.box("impTrim", x, 0.4, z, 0.5, 0.8, 0.5, { color: BLK, texel: 1 });
  kit.box("impPanel1", x, 0.42, z + 0.262, 0.44, 0.7, 0.024, { color: WHITE, uv: "world", texel: 1 });
  kit.box("impTrim", x, 0.42, z + 0.276, 0.4, 0.02, 0.01, { color: BLK });
  for (const y of [0.25, 0.6]) kit.box("impMetal", x, y, z + 0.29, 0.14, 0.02, 0.02, { color: STEEL });
  kit.box("impMetal", x, 0.82, z, 0.52, 0.04, 0.52, { color: PALETTE.impGrey, texel: 1 });
  kit.cyl("impMetal", x - 0.12, 0.89, z + 0.05, 0.035, 0.1, "y", { color: GD, segments: 10 });
  kit.box("impGloss", x + 0.1, 0.85, z - 0.05, 0.2, 0.014, 0.14);
  kit.add("scrGreen1", new THREE.PlaneGeometry(0.16, 0.1).rotateX(-Math.PI / 2), { pos: [x + 0.1, 0.862, z - 0.05], uv: "keep" });
  kit.collider([x - 0.26, 0, z - 0.26], [x + 0.26, 0.86, z + 0.3], "bedside");
}

/** Glass-fronted supply cabinet: solid lower doors, lit upper cavity with shelves and containers. Faces local +z. */
function supplyCabinet(kit, x, z, yaw, opts = {}) {
  const { seed = 1, decal = IMP_DECAL.medical, w = 1.6, h = 2.2, d = 0.6 } = opts;
  const rand = rng(seed);
  const p = new Placer(kit, x, 0, z, yaw);
  const split = 1.05;
  p.box("impTrim", 0, split / 2, 0, w, split, d, { color: BLK, texel: 1 });
  p.box("impTrim", 0, (split + h) / 2, -d / 2 + 0.03, w, h - split, 0.06, { color: BLK, texel: 1 });
  p.box("impPanel2", 0, (split + h) / 2, -d / 2 + 0.07, w - 0.12, h - split - 0.12, 0.02, { color: CHR, uv: "world", texel: 1 });
  for (const s of [-1, 1]) p.box("impTrim", s * (w / 2 - 0.03), (split + h) / 2, 0, 0.06, h - split, d, { color: BLK, texel: 1 });
  p.box("impTrim", 0, h - 0.03, 0, w, 0.06, d, { color: BLK, texel: 1 });
  p.box("impMetal", 0, h + 0.02, 0, w + 0.04, 0.04, d + 0.04, { color: CHR, texel: 1 });
  p.box("emitWhiteSoft", 0, h - 0.075, 0.05, w - 0.3, 0.015, 0.1, { uv: "keep" });
  for (const y of [split + 0.06, split + 0.55]) {
    p.box("impMetal", 0, y, 0, w - 0.14, 0.02, d - 0.12, { color: GD });
    const n = 3 + Math.floor(rand() * 3);
    for (let k = 0; k < n; k++) {
      const cx = -w / 2 + 0.2 + (k + 0.5) * ((w - 0.4) / n);
      const cz = (rand() - 0.5) * 0.2;
      const kind = rand();
      if (kind < 0.4) p.cyl("impPanel1", cx, y + 0.13, cz, 0.06, 0.24, "y", { color: rand() < 0.5 ? WHITE : DECK_C.teal, segments: 10 });
      else if (kind < 0.75) p.box("impPanel1", cx, y + 0.1, cz, 0.22, 0.18, 0.16, { color: rand() < 0.3 ? PALETTE.impRed : WHITE, uv: "world", texel: 2 });
      else p.box("impPanel1", cx, y + 0.06, cz, 0.26, 0.1, 0.2, { color: PALETTE.impGrey, uv: "world", texel: 2 });
    }
  }
  p.box("viewGlass", 0, (split + h) / 2 + 0.02, d / 2 - 0.02, w - 0.14, h - split - 0.14, 0.01, { uv: "keep" });
  p.box("impMetal", 0, (split + h) / 2 + 0.02, d / 2 - 0.02, 0.02, h - split - 0.14, 0.02, { color: STEEL });
  for (const s of [-1, 1]) {
    p.box("impPanel1", s * (w / 4), split / 2 + 0.02, d / 2 + 0.012, w / 2 - 0.08, split - 0.16, 0.024, { color: WHITE, uv: "world", texel: 1 });
    p.box("impMetal", s * 0.06, split * 0.55, d / 2 + 0.03, 0.016, 0.22, 0.014, { color: STEEL });
  }
  p.box("impTrim", 0, split / 2 + 0.02, d / 2 + 0.02, 0.02, split - 0.16, 0.01, { color: BLK });
  p.decal(decal, -w / 4, split * 0.62, d / 2 + 0.026, 0.34);
  p.decal([IMP_DECAL.glyphs1, IMP_DECAL.glyphs2, IMP_DECAL.glyphs3][seed % 3], w / 4, split * 0.62, d / 2 + 0.026, 0.3);
  p.box(rand() < 0.8 ? ACCENT : "emitRedImp", -w / 2 + 0.16, h - 0.16, d / 2 + 0.006, 0.05, 0.03, 0.01);
  p.box("leds", w / 2 - 0.3, h - 0.16, d / 2 + 0.006, 0.3, 0.03, 0.01, { uv: "keep" });
  p.collider(-w / 2 - 0.02, 0, -d / 2, w / 2 + 0.02, h + 0.04, d / 2 + 0.04, "cabinet");
}

export function buildMedbay(kit, ctx, room) {
  const [w, h, d] = room.size;
  const hx = w / 2;
  const hz = d / 2;
  const accentKey = ACCENT;
  const accent = new THREE.Color(room.accent || "#7fe0d8").getHex();
  const rand = rng(6303);
  const walls = impRoomShell(kit, room, ctx.doors, {
    seed: 6303,
    accentKey,
    wall: { panelW: 1.6, features: { vent: 0.06, equipment: 0.06, conduit: 0.04, light: 0.1, screen: 0.05 }, altChance: 0.08, panelColor: WHITE, panelColorAlt: PALETTE.impGrey, accent: DECK_C.teal },
    walls: { N: { features: { vent: 0.04, light: 0.14 }, altChance: 0.02 } },
    floor: { laneW: 2.2 },
    floorEdgeLight: accentKey,
    ceiling: { troughs: 2, troughW: 0.5, beamStep: 4.4 },
  });
  // teal edge strips along the long walls too (the shell only does the short ones)
  for (const s of [-1, 1]) kit.boxMM(accentKey, [-hx + 0.6, 0.002, s * (hz - 0.28) - 0.03], [hx - 0.6, 0.012, s * (hz - 0.28) + 0.03]);

  // ---------------------------------------------------------------- ward: four beds along the N wall
  const N = walls.N.frame; // u = x + hx, n = +z
  const bedX = [-12.5, -7.0, -1.5, 4.0];
  const bedZ = -9.6;
  const blips = [];
  for (const [i, bx] of bedX.entries()) {
    kit.instance("mb_bed", "impPanel1", medBedGeo, new THREE.Matrix4().makeTranslation(bx, 0, bedZ), 0xffffff);
    kit.box("fabric", bx, 0.83, bedZ + 0.3, 0.86, 0.03, 1.3, { color: i === 2 ? DECK_C.fabricGrey : PALE_TEAL, texel: 1 });
    kit.box("impGloss", bx - 0.25, 0.98, bedZ + 1.06, 0.2, 0.14, 0.012);
    kit.add("scrGreen1", new THREE.PlaneGeometry(0.16, 0.1), { pos: [bx - 0.25, 0.98, bedZ + 1.068], uv: "keep" });
    kit.box("rubber", bx, 0.006, bedZ + 0.3, 2.2, 0.012, 2.8, { color: CHR, texel: 1 });
    kit.collider([bx - 0.5, 0, bedZ - 1.08], [bx + 0.5, 1.0, bedZ + 1.08], "bed");
    // headwall unit: bezel, vitals screen, gas outlets, LEDs, call button, bay number
    const u = bx + hx;
    N.box("impTrim", u, 1.45, 0.07, 1.3, 0.5, 0.14, { color: BLK, texel: 1 });
    N.box("impGloss", u - 0.28, 1.47, 0.145, 0.58, 0.34, 0.01);
    N.screen("scrGreen0", u - 0.28, 1.47, 0.152, 0.52, 0.28);
    for (let k = 0; k < 3; k++) N.cylN("impMetal", u + 0.2 + k * 0.16, 1.4, 0.16, 0.035, 0.05, { color: STEEL, segments: 10 });
    for (let k = 0; k < 3; k++) N.box(k === 1 ? accentKey : "emitGreen", u + 0.2 + k * 0.16, 1.58, 0.145, 0.04, 0.02, 0.01);
    N.box("emitRedImp", u + 0.55, 1.3, 0.145, 0.06, 0.06, 0.01);
    N.decal(IMP_DECAL.medical, u - 0.55, 1.28, 0.145, 0.14);
    N.decal([IMP_DECAL.bay01, IMP_DECAL.bay02, IMP_DECAL.bay03, IMP_DECAL.glyphs2][i], u, 2.2, 0.03, 0.34);
    blips.push([bx + 0.55, 1.66, -hz + 0.152]);
    monitorArm(kit, bx + 0.95, bedZ + 0.4, h, { screen: i % 2 ? "scrGreen1" : "scrGreen0", yaw: 0, drop: 1.45, reach: 0.5 });
    bedsideUnit(kit, bx - 0.95, bedZ - 0.55);
    ivStand(kit, bx + 0.8, bedZ - 0.95, 1);
    if (i < 3) privacyScreen(kit, bx + 2.75, bedZ + 0.1, Math.PI / 2, 2.4, { color: i === 1 ? DECK_C.fabricGrey : PALE_TEAL });
  }
  // heartbeat blips: one merged mesh of four LEDs, double-blip visibility pattern
  {
    const parts = blips.map(([x, y, z]) => ({ geo: new THREE.BoxGeometry(0.05, 0.05, 0.012).translate(x, y, z), color: 0xffffff }));
    const blip = new THREE.Mesh(compound(parts, 1), ctx.materials.emitGreen);
    kit.attach(blip);
    kit.onUpdate((dt, t) => {
      const ph = t % 1.1;
      blip.visible = ph < 0.09 || (ph > 0.22 && ph < 0.31);
    });
  }
  // scanner ring sliding along bed 2, with its floor emitter
  {
    const ringMesh = new THREE.Mesh(new THREE.TorusGeometry(0.66, 0.018, 8, 40), ctx.materials.emitTeal);
    ringMesh.position.set(bedX[1], 0.78, bedZ);
    kit.attach(ringMesh);
    let s = 0;
    kit.onUpdate((dt) => {
      s = (s + dt * 0.35) % 2;
      const k = s < 1 ? s : 2 - s;
      ringMesh.position.z = bedZ - 0.85 + k * 1.7;
    });
    kit.box("impTrim", bedX[1], 0.1, bedZ + 1.25, 0.3, 0.2, 0.2, { color: BLK });
    kit.box("scrGreen1", bedX[1], 0.16, bedZ + 1.352, 0.2, 0.06, 0.005, { uv: "keep" });
  }
  cableRun(N, 2.0, hx + 6.0, 2.75, { n: 3, seed: 8, accentKey });
  hoodLamp(N, hx - 15.5, 2.6, "emitWhiteSoft", 0.8);
  hoodLamp(N, hx + 7.5, 2.6, "emitWhiteSoft", 0.8);

  // ---------------------------------------------------------------- diagnostic console facing the ward
  // (impConsole's operator side is local +z: yaw 0 puts the operator on the south side, where the chair is)
  impConsole(kit, 8.6, 0, -4.6, 2.6, 1.0, { yaw: 0, seed: 63, screens: ["scrGreen0", "scrGreen1"], accentKey });
  impChair(kit, 8.6, 0, -3.4, 0);
  // med carts parked at the foot of the ward
  for (const [cx, cz, yaw] of [[-9.8, -6.4, 0.4], [1.4, -6.2, -0.3]]) {
    const p = new Placer(kit, cx, 0, cz, yaw);
    kit.instance("mb_cart", "impPanel1", medCartGeo, p.matrix(), 0xffffff);
    p.collider(-0.42, 0, -0.3, 0.36, 1.28, 0.3, "cart");
  }

  // ---------------------------------------------------------------- diagnostic scanner island (room centre, S of the lane)
  // A bed on a low plinth with a gantry arch riding a pair of rails along the patient — the room's main
  // animated element, in view straight from the door — plus its readout pedestal at the foot end.
  {
    const cx = 4.0;
    const cz = 4.6;
    kit.box("impTrim", cx, 0.06, cz, 3.6, 0.12, 2.4, { color: BLK, texel: 1 });
    kit.box("impMetal", cx, 0.13, cz, 3.5, 0.02, 2.3, { color: CHR, texel: 1 });
    for (const s of [-1, 1]) {
      kit.box(accentKey, cx, 0.145, cz + s * 1.1, 3.4, 0.012, 0.03);
      kit.box("impMetal", cx, 0.17, cz + s * 0.98, 2.8, 0.06, 0.08, { color: STEEL, texel: 1 });
    }
    kit.instance("mb_bed", "impPanel1", medBedGeo, new THREE.Matrix4().makeRotationY(Math.PI / 2).setPosition(cx, 0.14, cz), 0xffffff);
    kit.box("fabric", cx + 0.3, 0.97, cz, 1.3, 0.03, 0.86, { color: PALE_TEAL, texel: 1 });
    kit.collider([cx - 1.85, 0, cz - 1.25], [cx + 1.85, 2.2, cz + 1.25], "scanner");
    // gantry: half-torus arch on two posts + rail carriages (one merged impMetal mesh) carrying an
    // emissive inner arc; eases back and forth along the rails
    const archR = 0.95;
    const archY = 1.0;
    const gantry = new THREE.Mesh(
      compound(
        [
          { geo: new THREE.TorusGeometry(archR, 0.05, 8, 28, Math.PI), pos: [0, archY, 0], rot: [0, Math.PI / 2, 0], color: GD },
          B(0.12, archY - 0.2, 0.12, [0, (archY + 0.2) / 2, -archR], GD),
          B(0.12, archY - 0.2, 0.12, [0, (archY + 0.2) / 2, archR], GD),
          B(0.36, 0.1, 0.18, [0, 0.25, -0.98], BLK),
          B(0.36, 0.1, 0.18, [0, 0.25, 0.98], BLK),
          B(0.1, 0.06, 0.16, [0, archY + archR + 0.03, 0], BLK),
        ],
        1,
      ),
      ctx.materials.impMetal,
    );
    const arc = new THREE.Mesh(new THREE.TorusGeometry(archR - 0.06, 0.018, 6, 28, Math.PI).rotateY(Math.PI / 2), ctx.materials.emitTeal);
    arc.position.y = archY;
    gantry.add(arc);
    gantry.position.set(cx - 1.1, 0, cz);
    kit.attach(gantry);
    let g = 0.5;
    kit.onUpdate((dt) => {
      g = (g + dt * 0.22) % 2;
      const k = g < 1 ? g : 2 - g;
      gantry.position.x = cx - 1.1 + 2.2 * k * k * (3 - 2 * k);
    });
    // readout pedestal (screen toward the operator standing at the foot end), floor stencil, overhead panel
    const p = new Placer(kit, cx + 2.35, 0, cz + 0.55, Math.PI / 2);
    p.box("impTrim", 0, 0.5, 0, 0.5, 1.0, 0.36, { color: BLK, texel: 1 });
    p.box("impPanel1", 0, 0.45, 0.19, 0.42, 0.7, 0.02, { color: WHITE, uv: "world", texel: 1 });
    p.box("leds", 0, 0.86, 0.19, 0.3, 0.03, 0.02, { uv: "keep" });
    p.box(accentKey, 0, 0.12, 0.205, 0.3, 0.02, 0.01);
    p.box("impTrim", 0, 1.18, 0.02, 0.6, 0.42, 0.06, { color: BLK, tilt: -0.35 });
    p.screen("scrGreen0", 0, 1.19, 0.055, 0.52, 0.34, "+z", { tilt: -0.35 });
    p.collider(-0.32, 0, -0.2, 0.32, 1.4, 0.2, "readout");
    floorDecal(kit, IMP_DECAL.medical, cx, cz - 1.7, 0.5);
    ceilingPanel(kit, cx, cz, h, 2.4, 0.9);
  }

  // ---------------------------------------------------------------- bacta tank on a railed platform (W end)
  {
    const tx = -13.2;
    const tz = 4.0;
    kit.cyl("impTrim", tx, 0.09, tz, 1.75, 0.18, "y", { color: BLK, segments: 32, texel: 1 });
    kit.cyl("impMetal", tx, 0.2, tz, 1.62, 0.04, "y", { color: CHR, segments: 32, texel: 1 });
    ring(kit, accentKey, tx, 0.225, tz, 1.64, 0.014, { segments: 48 });
    kit.cyl("impMetal", tx, 0.4, tz, 1.05, 0.36, "y", { color: CHR, segments: 24, texel: 1 });
    kit.cyl("impTrim", tx, 0.6, tz, 1.1, 0.06, "y", { color: BLK, segments: 24 });
    ring(kit, accentKey, tx, 0.63, tz, 1.02, 0.018, { segments: 40 });
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      kit.box("impTrim", tx + Math.cos(a) * 1.0, 0.4, tz + Math.sin(a) * 1.0, 0.16, 0.3, 0.16, { color: BLK, rot: [0, -a, 0] });
    }
    // glass column, four external ribs, liquid core (holo clone, pulsing), harness ring + mask
    kit.cyl("viewGlass", tx, 1.88, tz, 0.95, 2.5, "y", { open: true, segments: 40, uv: "keep" });
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
      kit.box("impTrim", tx + Math.cos(a) * 0.97, 1.88, tz + Math.sin(a) * 0.97, 0.07, 2.5, 0.07, { color: BLK, rot: [0, -a, 0] });
    }
    const coreMat = ctx.materials.holo.clone();
    coreMat.color.set(DECK_C.bacta.getHex());
    coreMat.opacity = 0.26;
    const core = new THREE.Mesh(new THREE.CylinderGeometry(0.86, 0.86, 2.4, 32), coreMat);
    core.position.set(tx, 1.88, tz);
    kit.attach(core);
    ring(kit, "impMetal", tx, 2.95, tz, 0.3, 0.02, { color: STEEL, segments: 24 });
    for (const a of [0.4, 2.5, 4.6]) rod(kit, "impMetal", [tx + Math.cos(a) * 0.3, 2.95, tz + Math.sin(a) * 0.3], [tx, 3.14, tz], 0.006, { color: STEEL });
    rod(kit, "impMetal", [tx, 2.95, tz], [tx, 2.3, tz], 0.012, { color: GD });
    kit.box("impTrim", tx, 2.2, tz, 0.2, 0.14, 0.12, { color: BLK });
    kit.box("impGloss", tx, 2.2, tz + 0.065, 0.14, 0.08, 0.01);
    // bubbles: one InstancedMesh, allocation-free update
    const N_BUB = 36;
    const bubMat = ctx.materials.holo.clone();
    bubMat.color.set(0xc8fff2);
    bubMat.opacity = 0.75;
    const bubbles = new THREE.InstancedMesh(new THREE.SphereGeometry(0.026, 6, 4), bubMat, N_BUB);
    bubbles.frustumCulled = false;
    const bub = [];
    const _m = new THREE.Matrix4();
    const _p = new THREE.Vector3();
    const _q = new THREE.Quaternion();
    const _s = new THREE.Vector3(1, 1, 1);
    const yBot = 0.72;
    const yTop = 3.02;
    for (let i = 0; i < N_BUB; i++) {
      const r = Math.sqrt(rand()) * 0.72;
      const a = rand() * Math.PI * 2;
      bub.push({ x: Math.cos(a) * r, z: Math.sin(a) * r, y: yBot + rand() * (yTop - yBot), v: 0.22 + rand() * 0.3, ph: rand() * 6.28, s: 0.6 + rand() * 0.8 });
      _s.setScalar(bub[i].s);
      _m.compose(_p.set(bub[i].x, bub[i].y, bub[i].z), _q, _s);
      bubbles.setMatrixAt(i, _m);
    }
    bubbles.position.set(tx, 0, tz);
    kit.attach(bubbles);
    kit.onUpdate((dt, t) => {
      for (let i = 0; i < N_BUB; i++) {
        const b = bub[i];
        b.y += b.v * dt;
        if (b.y > yTop) b.y = yBot;
        _s.setScalar(b.s);
        _m.compose(_p.set(b.x + Math.sin(t * 1.7 + b.ph) * 0.03, b.y, b.z + Math.cos(t * 1.3 + b.ph) * 0.03), _q, _s);
        bubbles.setMatrixAt(i, _m);
      }
      bubbles.instanceMatrix.needsUpdate = true;
      coreMat.opacity = 0.24 + 0.05 * Math.sin(t * 1.4);
    });
    // top cap, stack to the ceiling, status readout, hoses to the pump unit on the W wall
    kit.cyl("impMetal", tx, 3.32, tz, 1.05, 0.4, "y", { color: CHR, segments: 24, texel: 1 });
    kit.cyl("impTrim", tx, 3.13, tz, 1.1, 0.06, "y", { color: BLK, segments: 24 });
    ring(kit, accentKey, tx, 3.1, tz, 1.02, 0.018, { segments: 40 });
    kit.cyl("impMetal", tx, (3.52 + h) / 2, tz, 0.34, h - 3.52, "y", { color: GD, segments: 16, texel: 1 });
    kit.cyl("impTrim", tx, h - 0.06, tz, 0.4, 0.12, "y", { color: BLK, segments: 16 });
    for (let k = 0; k < 6; k++) kit.box("impTrim", tx + Math.cos((k / 6) * 6.283) * 0.7, 3.32, tz + Math.sin((k / 6) * 6.283) * 0.7, 0.1, 0.3, 0.1, { color: BLK, rot: [0, -(k / 6) * 6.283, 0] });
    kit.add("scrGreen0", new THREE.PlaneGeometry(0.5, 0.2), { pos: [tx + 0.76, 0.42, tz + 0.76], rot: [0, Math.PI / 4, 0], uv: "keep" });
    const W = walls.W.frame; // u = hz - z, n = +x
    const pu = hz - tz;
    W.box("impTrim", pu, 1.3, 0.18, 1.8, 2.0, 0.36, { color: BLK, texel: 1 });
    W.box("impPanel1", pu, 1.3, 0.365, 1.66, 1.84, 0.02, { color: PALETTE.impGrey, uv: "world", texel: 1 });
    for (const du of [-0.5, 0.0, 0.5]) {
      W.cylN("impTrim", pu + du, 1.85, 0.4, 0.16, 0.05, { color: BLK, segments: 16 });
      W.cylN("impGloss", pu + du, 1.85, 0.43, 0.13, 0.01, { segments: 16 });
      W.box(accentKey, pu + du, 1.85, 0.44, 0.02, 0.1, 0.005);
    }
    W.screen("scrGreen1", pu - 0.35, 1.2, 0.38, 0.6, 0.3);
    W.box("leds", pu + 0.4, 1.2, 0.38, 0.5, 0.05, 0.01, { uv: "keep" });
    for (const du of [-0.45, 0.45]) {
      W.cylN("impMetal", pu + du, 0.7, 0.46, 0.05, 0.2, { color: GD, segments: 10 });
      ring(kit, "impMetal", -hx + 0.58, 0.7, tz - du, 0.14, 0.02, { axis: "x", color: STEEL, segments: 20 });
    }
    W.box(accentKey, pu, 0.38, 0.365, 1.5, 0.03, 0.01);
    W.collider(pu - 0.92, pu + 0.92, 0, 2.32, 0, 0.5, "pump");
    for (const s of [-1, 1]) {
      tube(kit, "rubber", [[tx - 0.5, 3.4, tz + s * 0.3], [tx - 1.6, 3.1, tz + s * 0.55], [tx - 2.6, 2.5, tz + s * 0.55], [-hx + 0.5, 2.2, tz + s * 0.5]], 0.05, { color: CHR, segments: 28 });
      W.box("impTrim", pu - s * 0.5, 2.2, 0.42, 0.26, 0.26, 0.12, { color: BLK });
    }
    // railing around the platform (open toward the pump wall), deck stencil
    impRailing(kit, [tx - 1.95, tz - 1.95], [tx + 1.95, tz - 1.95], 0, { h: 1.0, light: accentKey });
    impRailing(kit, [tx + 1.95, tz - 1.95], [tx + 1.95, tz + 1.95], 0, { h: 1.0, light: accentKey });
    impRailing(kit, [tx + 1.95, tz + 1.95], [tx - 1.95, tz + 1.95], 0, { h: 1.0, light: accentKey });
    kit.collider([tx - 1.8, 0, tz - 1.8], [tx + 1.8, 3.6, tz + 1.8], "tank");
    floorDecal(kit, IMP_DECAL.keepClear, tx + 2.6, tz, 0.6, 0.006, -Math.PI / 2);
    hoodLamp(W, pu + 2.6, 2.6, "emitWhiteSoft", 0.8);
    hoodLamp(W, pu - 2.6, 2.6, "emitWhiteSoft", 0.8);
  }

  // ---------------------------------------------------------------- surgical station under a ceiling boom
  {
    const sx = -4.0;
    const sz = 5.6;
    kit.box("impTrim", sx, 0.3, sz, 0.5, 0.6, 0.7, { color: BLK, texel: 1 });
    kit.box("impMetal", sx, 0.04, sz, 0.8, 0.08, 1.2, { color: CHR, texel: 1 });
    kit.cyl("impMetal", sx, 0.72, sz, 0.12, 0.3, "y", { color: GD, segments: 14 });
    kit.box("impTrim", sx, 0.9, sz, 0.72, 0.08, 2.0, { color: BLK, texel: 1 });
    kit.box("impPanel1", sx, 0.97, sz, 0.64, 0.06, 1.9, { color: WHITE, uv: "world", texel: 1 });
    kit.box("fabric", sx, 1.01, sz + 0.25, 0.6, 0.02, 1.1, { color: PALE_TEAL, texel: 1 });
    kit.box("impPanel1", sx, 1.03, sz - 0.75, 0.4, 0.06, 0.3, { color: WHITE, uv: "world", texel: 2 });
    for (const s of [-1, 1]) {
      kit.cyl("impMetal", sx + s * 0.4, 1.0, sz, 0.012, 1.4, "z", { color: STEEL, segments: 8 });
      for (const dz of [-0.55, 0.55]) kit.box("impMetal", sx + s * 0.4, 0.95, sz + dz, 0.025, 0.12, 0.025, { color: GD });
    }
    kit.box(accentKey, sx, 0.62, sz, 0.52, 0.02, 0.72);
    kit.collider([sx - 0.45, 0, sz - 1.05], [sx + 0.45, 1.05, sz + 1.05], "optable");
    // boom: ceiling plate, shaft, elbow, lamp arm + tool arm
    const bx = sx + 1.0;
    const bz = sz - 0.7;
    kit.cyl("impTrim", bx, h - 0.06, bz, 0.3, 0.12, "y", { color: BLK, segments: 16 });
    kit.cyl("impMetal", bx, (h - 0.12 + 3.0) / 2, bz, 0.07, h - 0.12 - 3.0, "y", { color: GD, segments: 12 });
    kit.add("impMetal", new THREE.SphereGeometry(0.12, 12, 8), { pos: [bx, 3.0, bz], color: CHR, uv: "scale", uvScale: [0.5, 0.25] });
    const j1 = [sx - 0.1, 2.9, sz - 0.1];
    rod(kit, "impMetal", [bx, 3.0, bz], j1, 0.05, { color: GD });
    kit.add("impMetal", new THREE.SphereGeometry(0.09, 10, 8), { pos: j1, color: CHR, uv: "scale", uvScale: [0.4, 0.2] });
    rod(kit, "impMetal", j1, [sx, 2.32, sz + 0.1], 0.04, { color: GD });
    kit.cyl("impTrim", sx, 2.26, sz + 0.1, 0.34, 0.12, "y", { color: BLK, segments: 20 });
    kit.cyl("impMetal", sx, 2.33, sz + 0.1, 0.2, 0.04, "y", { color: GD, segments: 14 });
    kit.cyl("emitWhiteSoft", sx, 2.185, sz + 0.1, 0.28, 0.02, "y", { segments: 20, uv: "keep" });
    kit.box("impMetal", sx + 0.36, 2.2, sz + 0.1, 0.06, 0.16, 0.06, { color: GD });
    const j2 = [sx - 0.5, 2.7, sz + 0.9];
    rod(kit, "impMetal", [bx, 3.0, bz], j2, 0.035, { color: GD });
    kit.add("impMetal", new THREE.SphereGeometry(0.07, 10, 8), { pos: j2, color: CHR, uv: "scale", uvScale: [0.3, 0.15] });
    rod(kit, "impMetal", j2, [sx - 0.55, 2.0, sz + 1.0], 0.03, { color: GD });
    kit.box("impTrim", sx - 0.55, 1.9, sz + 1.0, 0.3, 0.2, 0.2, { color: BLK });
    for (let k = 0; k < 3; k++) kit.cyl("impMetal", sx - 0.63 + k * 0.08, 1.7, sz + 1.0, 0.012, 0.22, "y", { color: STEEL, segments: 6 });
    kit.box("scrGreen1", sx - 0.55, 1.93, sz + 1.105, 0.16, 0.08, 0.005, { uv: "keep" });
    kit.box(accentKey, sx - 0.42, 1.82, sz + 1.105, 0.03, 0.03, 0.005);
    // instrument tray, monitor cart, anaesthesia unit, kick bucket
    kit.cyl("impTrim", sx + 1.1, 0.02, sz + 1.0, 0.2, 0.04, "y", { color: BLK, segments: 12 });
    kit.cyl("impMetal", sx + 1.1, 0.5, sz + 1.0, 0.018, 0.92, "y", { color: STEEL, segments: 8 });
    kit.box("impMetal", sx + 1.1, 0.97, sz + 1.0, 0.56, 0.02, 0.38, { color: PALETTE.impGrey });
    kit.box("impTrim", sx + 1.1, 0.985, sz + 1.0, 0.5, 0.006, 0.32, { color: CHR });
    for (let k = 0; k < 5; k++) kit.cyl("impMetal", sx + 0.92 + k * 0.09, 0.995, sz + 1.0 + (k % 2) * 0.05, 0.005, 0.18 + (k % 3) * 0.03, "z", { color: STEEL, segments: 6 });
    kit.collider([sx + 0.9, 0, sz + 0.8], [sx + 1.3, 1.0, sz + 1.2], "tray");
    kit.box("impTrim", sx - 1.5, 0.06, sz + 0.9, 0.5, 0.12, 0.5, { color: BLK });
    kit.cyl("impMetal", sx - 1.5, 0.7, sz + 0.9, 0.03, 1.2, "y", { color: GD, segments: 8 });
    kit.box("impTrim", sx - 1.5, 1.45, sz + 0.9, 0.06, 0.5, 0.7, { color: BLK });
    kit.add("scrGreen0", new THREE.PlaneGeometry(0.6, 0.4).rotateY(Math.PI / 2), { pos: [sx - 1.465, 1.47, sz + 0.9], uv: "keep" });
    kit.box("emitGreen", sx - 1.465, 1.17, sz + 1.15, 0.006, 0.02, 0.06);
    kit.collider([sx - 1.75, 0, sz + 0.65], [sx - 1.25, 1.75, sz + 1.15], "monitor");
    kit.box("impPanel1", sx - 1.5, 0.55, sz - 0.6, 0.55, 1.1, 0.5, { color: WHITE, uv: "world", texel: 1 });
    kit.box("impTrim", sx - 1.5, 0.06, sz - 0.6, 0.6, 0.12, 0.56, { color: BLK });
    kit.box("impTrim", sx - 1.5, 1.14, sz - 0.6, 0.6, 0.08, 0.56, { color: BLK });
    for (let k = 0; k < 3; k++) kit.cyl("impGloss", sx - 1.21, 0.85 - k * 0.2, sz - 0.6 + (k - 1) * 0.15, 0.05, 0.03, "x", { segments: 12 });
    kit.box("leds", sx - 1.21, 0.4, sz - 0.6, 0.03, 0.05, 0.36, { uv: "keep" });
    tube(kit, "rubber", [[sx - 1.22, 1.05, sz - 0.5], [sx - 0.9, 1.2, sz - 0.4], [sx - 0.3, 1.1, sz - 0.5]], 0.014, { color: CHR });
    kit.collider([sx - 1.8, 0, sz - 0.9], [sx - 1.2, 1.2, sz - 0.3], "anaesthesia");
    kit.cyl("impMetal", sx + 0.75, 0.16, sz - 1.1, 0.14, 0.32, "y", { color: STEEL, segments: 14, r2: 0.16 });
    kit.collider([sx + 0.6, 0, sz - 1.25], [sx + 0.9, 0.35, sz - 0.95], "bucket");
    // sterile-zone floor lines + stencil, emissive panels overhead
    const zx0 = sx - 2.4;
    const zx1 = sx + 2.0;
    const zz0 = sz - 1.7;
    const zz1 = sz + 1.8;
    kit.boxMM(accentKey, [zx0, 0.004, zz0], [zx1, 0.012, zz0 + 0.04]);
    kit.boxMM(accentKey, [zx0, 0.004, zz1 - 0.04], [zx1, 0.012, zz1]);
    kit.boxMM(accentKey, [zx0, 0.004, zz0], [zx0 + 0.04, 0.012, zz1]);
    kit.boxMM(accentKey, [zx1 - 0.04, 0.004, zz0], [zx1, 0.012, zz1]);
    floorDecal(kit, IMP_DECAL.restricted, sx, zz0 - 0.5, 0.6);
    ceilingPanel(kit, sx - 1.2, sz + 1.7, h, 1.6, 0.9);
    ceilingPanel(kit, sx - 1.2, sz - 1.0, h, 1.6, 0.9);
  }

  // ---------------------------------------------------------------- south wall: supply cabinets, autoclave, waste
  {
    const S = walls.S.frame; // u = hx - x, n = -z
    const cz = hz - 0.4;
    for (const [k, cx] of [-11.6, -9.9, -8.2, 1.6, 3.3, 5.0, 6.7].entries()) supplyCabinet(kit, cx, cz, 0, { seed: 11 + k, decal: k % 3 === 2 ? IMP_DECAL.hazard : IMP_DECAL.medical });
    // autoclave: cabinet with a drum, round door with a viewport, status screen, steam vents
    const ax = -0.4;
    kit.box("impTrim", ax, 0.5, cz, 1.4, 1.0, 0.6, { color: BLK, texel: 1 });
    kit.box("impPanel1", ax, 0.52, cz + 0.312, 1.3, 0.8, 0.024, { color: PALETTE.impGrey, uv: "world", texel: 1 });
    kit.box("impMetal", ax, 1.02, cz, 1.44, 0.04, 0.64, { color: CHR, texel: 1 });
    kit.cyl("impMetal", ax, 1.5, cz - 0.05, 0.42, 0.5, "z", { color: PALETTE.impGrey, segments: 24, texel: 1 });
    kit.cyl("impTrim", ax, 1.5, cz + 0.22, 0.44, 0.06, "z", { color: BLK, segments: 24 });
    kit.cyl("impGloss", ax, 1.5, cz + 0.26, 0.24, 0.02, "z", { segments: 20 });
    ring(kit, "impMetal", ax, 1.5, cz + 0.27, 0.3, 0.025, { axis: "z", color: STEEL, segments: 28 });
    kit.box("impMetal", ax + 0.42, 1.5, cz + 0.28, 0.06, 0.3, 0.06, { color: STEEL });
    kit.add("scrGreen1", new THREE.PlaneGeometry(0.4, 0.16), { pos: [ax - 0.4, 0.75, cz + 0.33], uv: "keep" });
    kit.box("emitGreen", ax + 0.5, 0.75, cz + 0.33, 0.05, 0.05, 0.006);
    for (let k = 0; k < 4; k++) kit.box("impTrim", ax - 0.3 + k * 0.2, 1.98, cz - 0.1, 0.12, 0.03, 0.3, { color: BLK });
    kit.collider([ax - 0.72, 0, cz - 0.5], [ax + 0.72, 2.0, cz + 0.34], "autoclave");
    // biohazard waste drums
    for (const [dx, dcl] of [[9.0, IMP_DECAL.hazard], [9.6, IMP_DECAL.glyphs3]]) {
      kit.cyl("impTrim", dx, 0.36, cz + 0.05, 0.24, 0.72, "y", { color: BLK, segments: 16, texel: 1 });
      kit.cyl("impMetal", dx, 0.74, cz + 0.05, 0.25, 0.04, "y", { color: PALETTE.impRed, segments: 16 });
      kit.add("decalImp", new THREE.PlaneGeometry(0.22, 0.22), { pos: [dx, 0.42, cz + 0.05 + 0.245], uv: "keep", uvRect: impDecalRect(dcl) });
    }
    kit.collider([8.7, 0, cz - 0.25], [9.9, 0.8, cz + 0.35], "drums");
    wallSign(S, hx - 9.3, 2.5, IMP_DECAL.hazard, 0.5, accentKey);
    S.decal(IMP_DECAL.glyphs2, hx - 10.2, 2.5, 0.03, 0.4);
    cableRun(S, hx - 8.0, hx + 12.2, 2.95, { n: 2, seed: 9, accentKey });
    statusUnit(S, hx - 12.6, 1.7, { screen: "scrGreen1", accentKey });
    impWallGear(S, hx + 14.0, 1.6, { seed: 64, accentKey });
    hoodLamp(S, hx + 10.5, 2.55, "emitWhiteSoft", 0.8);
    crateStack(kit, hx - 1.4, hz - 1.4, 0.15, { seed: 12, decal: IMP_DECAL.medical, n: 2 });
  }

  // ---------------------------------------------------------------- droid docking niche (W wall)
  {
    const W = walls.W.frame; // u = hz - z, n = +x
    const nz = -5.5;
    const nu = hz - nz;
    W.box("impTrim", nu - 1.05, 1.4, 0.35, 0.16, 2.8, 0.7, { color: BLK, texel: 1 });
    W.box("impTrim", nu + 1.05, 1.4, 0.35, 0.16, 2.8, 0.7, { color: BLK, texel: 1 });
    W.box("impTrim", nu, 2.72, 0.35, 2.26, 0.16, 0.7, { color: BLK, texel: 1 });
    W.box("impPanel2", nu, 1.4, 0.09, 1.9, 2.5, 0.04, { color: CHR, uv: "world", texel: 1 });
    W.box("emitWhiteSoft", nu, 2.63, 0.4, 1.7, 0.02, 0.3, { uv: "keep" });
    W.box("impMetalRough", nu, 0.01, 0.35, 2.0, 0.02, 0.7, { color: GD, texel: 1 });
    W.box(accentKey, nu, 0.015, 0.71, 2.0, 0.012, 0.03);
    W.screen("scrGreen1", nu, 2.2, 0.115, 0.7, 0.3);
    W.box("leds", nu, 1.95, 0.115, 0.7, 0.05, 0.01, { uv: "keep" });
    W.decal(IMP_DECAL.power, nu - 0.7, 1.7, 0.115, 0.3);
    W.decal(IMP_DECAL.glyphs1, nu + 0.7, 1.7, 0.115, 0.3);
    W.box("impTrim", nu + 0.7, 0.55, 0.23, 0.3, 1.1, 0.24, { color: BLK, texel: 1 });
    W.box(accentKey, nu + 0.7, 0.9, 0.352, 0.16, 0.03, 0.01);
    medDroid(kit, -hx + 0.85, nz, Math.PI / 2, { eyeKey: accentKey, body: PALETTE.impWhite });
    tube(kit, "rubber", [[-hx + 0.35, 1.0, nz - 0.7], [-hx + 0.6, 0.6, nz - 0.5], [-hx + 0.85, 0.55, nz - 0.22]], 0.014, { color: CHR });
    tube(kit, "rubber", [[-hx + 0.35, 0.85, nz - 0.7], [-hx + 0.65, 0.45, nz - 0.45], [-hx + 0.85, 0.5, nz - 0.2]], 0.012, { color: GD });
    W.collider(nu - 1.15, nu + 1.15, 0, 2.85, 0, 0.75, "niche");
    wallSign(W, nu, 3.15, IMP_DECAL.medical, 0.4, accentKey);
    impWallGear(W, nu - 3.4, 1.6, { seed: 65, accentKey });
    statusUnit(W, nu + 3.2, 1.7, { screen: "scrWhite0", accentKey });
  }

  // ---------------------------------------------------------------- entrance: reception counter, wash station, bench
  {
    const E = walls.E.frame; // u = z + hz, n = -x
    counter(kit, 13.4, -4.6, Math.PI / 2, 3.6, { accentKey, top: WHITE, tag: "reception" });
    kit.box("impGloss", 13.5, 1.02, -5.6, 0.16, 0.014, 0.24);
    kit.add("scrWhite0", new THREE.PlaneGeometry(0.2, 0.13).rotateX(-Math.PI / 2), { pos: [13.5, 1.032, -5.6], uv: "keep" });
    {
      const p = new Placer(kit, 13.4, 1.01, -3.6, -Math.PI / 2 + 0.35);
      p.cyl("impMetal", 0, 0.15, 0, 0.02, 0.3, "y", { color: GD, segments: 8 });
      p.box("impTrim", 0, 0.45, 0, 0.5, 0.34, 0.05, { color: BLK });
      p.screen("scrGreen0", 0, 0.45, 0.03, 0.44, 0.28, "+z");
    }
    kit.box("impTrim", 13.3, 1.07, -4.6, 0.3, 0.12, 0.2, { color: BLK });
    kit.box("emitGreen", 13.3, 1.135, -4.6, 0.04, 0.01, 0.04);
    impChair(kit, 12.4, 0, -4.6, -Math.PI / 2);
    // wash station N of the door: basin, mirror, tap, dispensers
    const wu = hz - 3.2;
    E.box("impTrim", wu, 0.42, 0.28, 1.3, 0.84, 0.56, { color: BLK, texel: 1 });
    E.box("impPanel1", wu, 0.44, 0.572, 1.2, 0.66, 0.024, { color: WHITE, uv: "world", texel: 1 });
    E.box("impMetal", wu, 0.86, 0.28, 1.34, 0.04, 0.6, { color: STEEL, texel: 1 });
    E.box("impGloss", wu, 0.882, 0.28, 0.7, 0.012, 0.42);
    E.box("impMetal", wu, 0.89, 0.28, 0.62, 0.006, 0.36, { color: CHR });
    E.cylV("impMetal", wu, 1.02, 0.1, 0.016, 0.3, { color: STEEL, segments: 8 });
    E.cylN("impMetal", wu, 1.16, 0.22, 0.014, 0.26, { color: STEEL, segments: 8 });
    E.box("impTrim", wu, 1.75, 0.07, 1.0, 0.8, 0.06, { color: BLK });
    E.box("impGloss", wu, 1.75, 0.11, 0.9, 0.7, 0.02);
    hoodLamp(E, wu, 2.3, "emitWhiteSoft", 0.9);
    E.box("impTrim", wu - 0.75, 1.3, 0.14, 0.2, 0.32, 0.2, { color: BLK });
    E.box("impPanel1", wu - 0.75, 1.3, 0.245, 0.16, 0.26, 0.01, { color: WHITE, uv: "world", texel: 2 });
    E.box(accentKey, wu - 0.75, 1.4, 0.252, 0.06, 0.02, 0.005);
    E.box("impTrim", wu + 0.75, 1.35, 0.14, 0.3, 0.4, 0.2, { color: BLK });
    E.box("impPanel1", wu + 0.75, 1.2, 0.245, 0.22, 0.06, 0.01, { color: WHITE, uv: "world", texel: 2 });
    E.decal(IMP_DECAL.glyphs3, wu + 0.75, 1.42, 0.245, 0.16);
    E.collider(wu - 0.7, wu + 0.7, 0, 0.9, 0, 0.6, "wash");
    // waiting bench S of the door
    const bu = hz + 3.6;
    E.box("impTrim", bu, 0.42, 0.34, 2.4, 0.08, 0.5, { color: BLK, texel: 1 });
    E.box("fabric", bu, 0.48, 0.34, 2.3, 0.05, 0.44, { color: DECK_C.fabricDark, texel: 1 });
    for (const s of [-1, 1]) E.box("impTrim", bu + s * 1.1, 0.2, 0.34, 0.08, 0.4, 0.44, { color: BLK });
    E.box("impTrim", bu, 0.9, 0.11, 2.4, 0.6, 0.08, { color: BLK, texel: 1 });
    E.box("fabric", bu, 0.9, 0.16, 2.3, 0.5, 0.02, { color: DECK_C.fabricDark, texel: 1 });
    E.collider(bu - 1.25, bu + 1.25, 0, 1.0, 0, 0.62, "bench");
    // signage around the door, status unit, wall gear, biohazard bin
    wallSign(E, hz - 1.9, 2.7, IMP_DECAL.medical, 0.6, accentKey);
    E.decal(IMP_DECAL.restricted, hz + 1.9, 2.7, 0.03, 0.44);
    statusUnit(E, hz + 6.6, 1.8, { screen: "scrGreen0", accentKey, w: 0.9 });
    impWallGear(E, hz - 7.6, 1.6, { seed: 66, accentKey });
    kit.cyl("impTrim", 16.5, 0.34, -6.4, 0.2, 0.68, "y", { color: BLK, segments: 14, texel: 1 });
    kit.cyl("impMetal", 16.5, 0.7, -6.4, 0.21, 0.04, "y", { color: PALETTE.impRed, segments: 14 });
    kit.add("decalImp", new THREE.PlaneGeometry(0.2, 0.2).rotateY(-Math.PI / 2), { pos: [16.29, 0.42, -6.4], uv: "keep", uvRect: impDecalRect(IMP_DECAL.hazard) });
    kit.collider([16.3, 0, -6.6], [16.7, 0.75, -6.2], "bin");
  }
  cameraHousing(kit, hx - 0.3, h - 0.55, -hz + 0.3, Math.PI * 0.75);
  cameraHousing(kit, -hx + 0.3, h - 0.55, hz - 0.3, -Math.PI * 0.25);

  // ---------------------------------------------------------------- emissive ceiling panels over ward + entrance + cabinets
  for (const bx of bedX) ceilingPanel(kit, bx, -7.2, h, 2.0, 0.9);
  ceilingPanel(kit, 13.4, -3.6, h, 1.6, 0.9);
  ceilingPanel(kit, 13.4, 3.6, h, 1.6, 0.9);
  ceilingPanel(kit, 4.6, 7.4, h, 1.6, 0.9);

  // ---------------------------------------------------------------- lights (8)
  // keys hang 1 m below the white ceiling (linear falloff would otherwise blow the ceiling out)
  const white = 0xf2f7ff;
  const ky = h - 1.0;
  keyLight(kit, -10.0, ky, -7.0, { color: white, k: 1.7, distance: 13, priority: 0.5 });
  keyLight(kit, -3.0, ky, -7.0, { color: white, k: 1.7, distance: 13, priority: 0.49 });
  keyLight(kit, 2.0, ky, -7.0, { color: white, k: 1.7, distance: 13, priority: 0.48 });
  keyLight(kit, -4.0, ky, 5.6, { color: 0xffffff, k: 2.0, distance: 11, priority: 0.47 });
  keyLight(kit, 13.0, ky, 0.0, { color: white, k: 1.6, distance: 13, priority: 0.46 });
  keyLight(kit, 4.5, ky, 6.5, { color: white, k: 1.5, distance: 13, priority: 0.45 });
  kit.light({ type: "point", pos: [-13.2, 2.4, 4.0], color: DECK_C.bacta.getHex(), intensity: 5.0, decay: 1, distance: 10, priority: 0.44 });
  kit.light({ type: "point", pos: [-15.6, 1.8, -5.5], color: accent, intensity: 2.5, decay: 1, distance: 7, priority: 0.4 });
}
