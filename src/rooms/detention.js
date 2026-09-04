// Security & Detention Block (Deck C): a central security desk with a bank of monitors facing the blast
// door, two rows of four 3×3 m cells (three walls, bunk slab, red force-field doorway with a framed
// emitter strip, cell number stencils, red overhead light), an interrogation room at the far end
// (restraint chair, interrogation droid on a stand, bright white spot), a weapon-locker cage, camera
// housings in every corner, rotating red beacons and red floor edge lighting.
// Dark ribbed wall variant (grey-dark / charcoal panels, conduit-heavy, banded), the cells darker still.
// Red accent; dim red slots over the desk, red pools everywhere else, cool fill at the door and the aisle,
// one harsh white spot in the interrogation room. The no-entry roundel appears once (facing the door).
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { PALETTE } from "../materials.js";
import { impRoomShell, impWall, wallFrame, impConsole, impChair, impRailing, impWallGear, lux } from "./imperial_kit.js";
import { rng } from "../kit.js";
import { IMP_DECAL, impDecalRect } from "../textures_imperial.js";
import { Placer, compound, B, C, DECK_C, slotLight, cameraHousing, cableRun, wallSign, statusUnit, hoodLamp, crateStack, rifleRack, floorStripe, keyLight, ring } from "./deck_c_kit.js";

const ACCENT = "emitRedImp";
const BLK = PALETTE.impBlack;
const CHR = PALETTE.impCharcoal;
const GD = PALETTE.impGreyDark;
const GREY = PALETTE.impGrey;
const STEEL = DECK_C.steel;

function floorDecal(kit, index, x, z, size, yaw = 0, y = 0.008) {
  kit.add("decalImp", new THREE.PlaneGeometry(size, size).rotateX(-Math.PI / 2), { pos: [x, y, z], rot: [0, yaw, 0], uv: "keep", uvRect: impDecalRect(index) });
}

/** Cell bunk slab for kit.instance: wall-mounted slab on two brackets with a thin mattress and a folded blanket. Long axis local x, wall at local -z. */
function bunkSlabGeo() {
  return compound(
    [
      B(2.0, 0.08, 0.8, [0, 0.5, 0], BLK),
      B(1.9, 0.06, 0.72, [0, 0.57, 0.02], GD),
      B(0.6, 0.05, 0.4, [-0.6, 0.62, 0.05], GREY),
      B(0.08, 0.5, 0.7, [-0.9, 0.25, 0], BLK),
      B(0.08, 0.5, 0.7, [0.9, 0.25, 0], BLK),
      B(1.9, 0.06, 0.06, [0, 0.47, 0.37], CHR),
    ],
    1,
  );
}

/**
 * Detention cell: three impWall segments (back + two sides), open toward local +z where a red force field
 * spans the doorway between two emitter pillars. Interior: bunk slab, hygiene unit, ceiling light, number.
 * Local frame: cell centre on the floor, +z = the open side (toward the block's aisle).
 */
function buildCell(kit, ctx, cx, cz, yaw, number, opts = {}) {
  const { size = 3.0, h = 3.0, seed = 1, occupied = false, decal = IMP_DECAL.bay01 } = opts;
  const p = new Placer(kit, cx, 0, cz, yaw);
  const half = size / 2;
  // walls: back (at local z = -half) and sides (at x = ±half). Wall frames are built in room space from
  // Placer corners; a frame's normal is U × up, so the from→to order makes each wall face INTO the cell.
  const mk = (a, b) => {
    const A = p.pos(a[0], 0, a[1]);
    const Bp = p.pos(b[0], 0, b[1]);
    return wallFrame(kit, [A.x, A.z], [Bp.x, Bp.z]);
  };
  const wallOpts = { panelW: 1.5, kickH: 0.28, corniceH: 0.3, depth: 0.16, features: { vent: 0.15, equipment: 0, conduit: 0.08, light: 0, screen: 0 }, panelColor: GD, panelColorAlt: CHR, altChance: 0.3, accent: PALETTE.impRed, accentKey: ACCENT, corniceLight: false, collide: false, tag: "cell" };
  const back = mk([-half, -half], [half, -half]);
  const left = mk([-half, half], [-half, -half]);
  const right = mk([half, -half], [half, half]);
  impWall(back.frame, back.length, h, { ...wallOpts, seed: seed + 1 });
  impWall(left.frame, left.length, h, { ...wallOpts, seed: seed + 2 });
  impWall(right.frame, right.length, h, { ...wallOpts, seed: seed + 3 });
  // roof slab + wall-cap so the cell reads as a box from the aisle
  p.box("impTrim", 0, h + 0.12, 0, size + 0.4, 0.24, size + 0.4, { color: BLK, texel: 1 });
  p.box("impMetal", 0, h + 0.27, 0, size + 0.5, 0.06, size + 0.5, { color: CHR, texel: 1 });
  // one collider per wall (impWall's own colliders are disabled above so they are not doubled up)
  p.collider(-half - 0.2, 0, -half - 0.2, half + 0.2, h, -half + 0.02, "cellwall");
  p.collider(-half - 0.2, 0, -half - 0.2, -half + 0.02, h, half + 0.2, "cellwall");
  p.collider(half - 0.02, 0, -half - 0.2, half + 0.2, h, half + 0.2, "cellwall");
  // floor: dark plate, drain, edge line
  p.box("impMetalRough", 0, 0.008, 0, size - 0.1, 0.016, size - 0.1, { color: CHR, texel: 1 });
  p.cyl("impTrim", 0.6, 0.017, 0.4, 0.12, 0.004, "y", { color: BLK, segments: 12 });
  // bunk slab on the back wall (instanced) + hygiene unit in the corner
  kit.instance("dt_bunk", "impPanel1", bunkSlabGeo, p.matrix(0.3, 0, -half + 0.5, 0), 0xffffff);
  p.box("impTrim", -half + 0.35, 0.3, half - 0.6, 0.5, 0.6, 0.5, { color: BLK, texel: 1 });
  p.box("impMetal", -half + 0.35, 0.62, half - 0.6, 0.52, 0.04, 0.52, { color: GD });
  p.cyl("impGloss", -half + 0.35, 0.645, half - 0.6, 0.16, 0.01, "y", { segments: 16 });
  p.cyl("impMetal", -half + 0.35, 0.8, half - 0.85, 0.012, 0.3, "y", { color: STEEL, segments: 6 });
  p.collider(-half, 0, half - 0.85, -half + 0.6, 0.66, half - 0.35, "cellsink");
  p.collider(-0.7, 0, -half, 1.3, 0.62, -half + 0.9, "bunk");
  if (occupied) {
    p.box("fabric", 0.3, 0.7, -half + 0.55, 1.4, 0.22, 0.6, { color: DECK_C.fabricDark, texel: 1 });
    p.sphere("impPanel1", -0.5, 0.75, -half + 0.6, 0.13, { color: GREY, segments: 12 });
  }
  // ceiling light (red) + a lens; call panel on the side wall; number stencil over the doorway
  p.box("impTrim", 0, h - 0.1, 0, 1.0, 0.2, 0.7, { color: BLK });
  p.box(ACCENT, 0, h - 0.21, 0, 0.84, 0.02, 0.54, { uv: "keep" });
  p.box("impTrim", half - 0.09, 1.3, 0.6, 0.06, 0.3, 0.22, { color: BLK });
  p.box("emitRedImp", half - 0.115, 1.38, 0.6, 0.005, 0.03, 0.08);
  p.box("impMetal", half - 0.115, 1.25, 0.6, 0.005, 0.08, 0.14, { color: STEEL });
  // doorway: emitter pillars, lintel with red strip + number, force field (holo clone, tinted red), floor threshold
  for (const s of [-1, 1]) {
    p.box("impTrim", s * (half - 0.16), h / 2, half + 0.02, 0.32, h, 0.36, { color: CHR, texel: 1 });
    p.box("impMetal", s * (half - 0.16), h / 2, half + 0.205, 0.2, h - 0.5, 0.02, { color: GD, texel: 1 });
    p.box(ACCENT, s * (half - 0.32) - s * 0.0, 1.5, half + 0.02, 0.012, h - 0.6, 0.06);
    for (let k = 0; k < 5; k++) p.box("impMetal", s * (half - 0.16), 0.5 + k * 0.5, half + 0.21, 0.16, 0.03, 0.01, { color: GD });
  }
  p.box("impTrim", 0, h - 0.2, half + 0.02, size - 0.3, 0.4, 0.36, { color: CHR, texel: 1 });
  p.box(ACCENT, 0, h - 0.42, half + 0.02, size - 0.66, 0.012, 0.06);
  p.decal(decal, 0, h - 0.2, half + 0.205, 0.32);
  p.box("scrRed1", 0.9, h - 0.2, half + 0.205, 0.4, 0.16, 0.01, { uv: "keep" });
  p.box(occupied ? "emitRedImp" : "emitGreen", -0.9, h - 0.2, half + 0.205, 0.08, 0.08, 0.01);
  p.box("impTrim", 0, 0.03, half + 0.02, size - 0.6, 0.06, 0.36, { color: BLK, texel: 1 });
  p.box(ACCENT, 0, 0.062, half + 0.02, size - 0.66, 0.006, 0.06);
  // force field plane, baked into room space; all eight fields become one attached mesh (shared tinted holo)
  const fp = p.pos(0, (h - 0.46) / 2 + 0.06, half + 0.02);
  ctx.fieldGeos.push(new THREE.PlaneGeometry(size - 0.64, h - 0.46).applyQuaternion(p.quat()).translate(fp.x, fp.y, fp.z));
  p.collider(-half + 0.3, 0, half - 0.1, half - 0.3, h, half + 0.16, "field");
  p.collider(-half - 0.2, 0, half - 0.16, -half + 0.32, h, half + 0.2, "pillar");
  p.collider(half - 0.32, 0, half - 0.16, half + 0.2, h, half + 0.2, "pillar");
  return p;
}

/** Restraint chair: heavy pedestal, seat, high back, arm and ankle clamps, head brace. Faces local -z; base at y0. */
function restraintChair(kit, x, z, yaw, y0 = 0) {
  const p = new Placer(kit, x, y0, z, yaw);
  p.box("impTrim", 0, 0.06, 0, 0.9, 0.12, 0.9, { color: BLK, texel: 1 });
  p.box("impMetal", 0, 0.3, 0.05, 0.4, 0.36, 0.4, { color: CHR, texel: 1 });
  p.box("impTrim", 0, 0.52, 0.0, 0.64, 0.08, 0.6, { color: BLK });
  p.box("rubber", 0, 0.575, 0.0, 0.56, 0.04, 0.52, { color: GD });
  p.box("impTrim", 0, 1.05, 0.3, 0.6, 1.0, 0.1, { color: BLK, tilt: -0.12 });
  p.box("rubber", 0, 1.05, 0.245, 0.5, 0.86, 0.03, { color: GD, tilt: -0.12 });
  p.box("impMetal", 0, 1.62, 0.28, 0.36, 0.12, 0.14, { color: GD });
  p.box(ACCENT, 0, 1.62, 0.2, 0.2, 0.02, 0.01);
  for (const s of [-1, 1]) {
    p.box("impTrim", s * 0.36, 0.72, 0.05, 0.08, 0.06, 0.5, { color: BLK });
    p.box("impTrim", s * 0.36, 0.62, 0.05, 0.06, 0.16, 0.06, { color: BLK });
    const wrist = p.pos(s * 0.36, 0.78, -0.1);
    const ankle = p.pos(s * 0.16, 0.2, -0.3);
    ring(kit, "impMetal", wrist.x, wrist.y, wrist.z, 0.06, 0.012, { axis: "x", color: STEEL, segments: 16 });
    ring(kit, "impMetal", ankle.x, ankle.y, ankle.z, 0.06, 0.012, { axis: "x", color: STEEL, segments: 16 });
    p.box("impMetal", s * 0.36, 0.76, -0.1, 0.05, 0.02, 0.06, { color: STEEL });
  }
  p.box("impTrim", 0, 0.22, -0.32, 0.5, 0.06, 0.24, { color: BLK });
  p.collider(-0.48, 0, -0.5, 0.48, 1.7, 0.42, "chair");
}

/** Interrogation droid: matte black sphere on a stand with a red eye, needle arms and a syringe. Base at y0. */
function interrogationDroid(kit, x, z, yaw, y0 = 0) {
  const p = new Placer(kit, x, y0, z, yaw);
  p.cyl("impTrim", 0, 0.03, 0, 0.3, 0.06, "y", { color: BLK, segments: 16 });
  p.cyl("impMetal", 0, 0.6, 0, 0.03, 1.1, "y", { color: GD, segments: 8 });
  p.cyl("impTrim", 0, 1.16, 0, 0.1, 0.04, "y", { color: BLK, segments: 12 });
  p.sphere("impGloss", 0, 1.48, 0, 0.3, { segments: 20 });
  ring(kit, "impMetal", x, y0 + 1.48, z, 0.3, 0.014, { color: STEEL, segments: 32 });
  p.cyl("impMetal", 0, 1.48, -0.3, 0.06, 0.06, "z", { color: CHR, segments: 12 });
  p.box("emitRedImp", 0, 1.48, -0.335, 0.05, 0.05, 0.01);
  for (const [a, len] of [[-0.6, 0.26], [0.2, 0.3], [1.1, 0.22], [2.4, 0.28], [3.6, 0.24]]) {
    const ax = Math.cos(a) * 0.29;
    const ay = 1.48 + Math.sin(a) * 0.29 - 0.16;
    p.cyl("impMetal", ax, ay, -0.05, 0.012, len, "z", { color: STEEL, segments: 6 });
    p.cyl("impMetal", ax, ay, -0.05 - len / 2 - 0.04, 0.02, 0.08, "z", { color: BLK, segments: 6 });
  }
  p.box("impTrim", 0, 1.2, -0.12, 0.1, 0.06, 0.16, { color: BLK });
  p.collider(-0.35, 0, -0.5, 0.35, 1.8, 0.35, "droid");
}

export function buildDetention(kit, ctx, room) {
  const [w, h, d] = room.size;
  const hx = w / 2;
  const hz = d / 2;
  const accentKey = ACCENT;
  const rand = rng(8505);
  const walls = impRoomShell(kit, room, ctx.doors, {
    seed: 8505,
    accentKey,
    // wall variant: dark ribbed — grey-dark / charcoal panels cut by two bands, conduit-heavy, no bare wall light slots
    wall: { panelW: 1.4, bands: [1.05, 2.25], features: { vent: 0.1, equipment: 0.06, conduit: 0.22, light: 0, screen: 0.03 }, altChance: 0.3, panelColor: GD, panelColorAlt: GREY, accent: PALETTE.impRed },
    floor: { laneW: 2.6, laneAxis: "z" },
    floorEdgeLight: accentKey,
    ceiling: { troughs: 2, troughW: 0.5, beamStep: 4.8 },
  });
  const N = walls.N.frame; // u = x + hx
  const S = walls.S.frame; // u = hx - x
  const E = walls.E.frame; // u = z + hz
  const W = walls.W.frame; // u = hz - z
  const cctx = { fieldGeos: [] };
  const fieldMat = ctx.materials.holo.clone();
  fieldMat.color.set(DECK_C.redField.getHex());
  fieldMat.opacity = 0.22;

  // ---------------------------------------------------------------- red edge lighting along the long walls + red floor lines beside the aisle
  for (const s of [-1, 1]) {
    kit.boxMM(accentKey, [-hx + 0.6, 0.002, s * (hz - 0.28) - 0.03], [hx - 0.6, 0.012, s * (hz - 0.28) + 0.03]);
    kit.boxMM(accentKey, [s * 1.55 - 0.02, 0.002, -hz + 1.0], [s * 1.55 + 0.02, 0.02, hz - 1.6]);
  }

  // ---------------------------------------------------------------- security desk facing the door: U of consoles, monitor bank, chairs, railing
  {
    const dz = -4.6;
    // guards sit on the south side (console operator side = local +z, yaw 0) facing the blast door;
    // the two wings are angled so their operator sides face the centre seats
    impConsole(kit, 0, 0, dz, 3.4, 1.0, { yaw: 0, seed: 85, screens: ["scrRed2", "scrWhite1"], accentKey });
    impConsole(kit, -2.7, 0, dz + 0.6, 1.6, 0.9, { yaw: 1.2, seed: 86, screens: ["scrRed1", "scrRed0"], accentKey });
    impConsole(kit, 2.7, 0, dz + 0.6, 1.6, 0.9, { yaw: -1.2, seed: 87, screens: ["scrWhite0", "scrRed1"], accentKey });
    impChair(kit, -0.7, 0, dz + 1.15, 0);
    impChair(kit, 0.8, 0, dz + 1.15, 0.1);
    // monitor bank on a frame over the desk: 6 screens in two rows on a black spine, hanging from the ceiling
    const my = 2.45;
    kit.box("impTrim", 0, my, dz - 0.9, 3.6, 0.9, 0.12, { color: BLK, texel: 1 });
    kit.box("impMetal", 0, my + 0.5, dz - 0.9, 3.7, 0.08, 0.2, { color: CHR, texel: 1 });
    for (const x of [-1.5, 1.5]) kit.cyl("impMetal", x, (my + 0.54 + h) / 2, dz - 0.9, 0.03, h - my - 0.54, "y", { color: GD, segments: 8 });
    const scr = ["scrRed2", "scrWhite1", "scrRed3", "scrWhite0", "scrRed0", "scrRed1"];
    for (let i = 0; i < 6; i++) {
      const x = -1.15 + (i % 3) * 1.15;
      const y = my + 0.2 - Math.floor(i / 3) * 0.42;
      kit.box("impGloss", x, y, dz - 0.9 + 0.07, 1.05, 0.36, 0.02);
      kit.add(scr[i], new THREE.PlaneGeometry(0.98, 0.3), { pos: [x, y, dz - 0.9 + 0.085], uv: "keep" });
    }
    kit.box("leds", 0, my - 0.4, dz - 0.9 + 0.07, 3.0, 0.04, 0.01, { uv: "keep" });
    kit.box(accentKey, 0, my + 0.47, dz - 0.9 + 0.11, 3.4, 0.02, 0.01);
    // the spine's back faces the blast door: block status board, restricted stencil, red edge strip.
    // The board is tilted 14° toward the deck: flat, its glossy face mirrored the entrance key straight into
    // the spawn sightline as a white flare (screen materials are roughness 0.15).
    {
      const bz = dz - 0.9 - 0.07;
      const tilt = -0.24;
      const ct = Math.cos(tilt);
      const st = Math.sin(tilt);
      const bp = (ly, lz) => [0.6, my + 0.05 + ly * ct - lz * st, bz + ly * st + lz * ct];
      kit.add("impGloss", new THREE.BoxGeometry(1.6, 0.5, 0.02), { pos: bp(0, 0), rot: [tilt, 0, 0] });
      kit.add("scrRed0", new THREE.PlaneGeometry(1.5, 0.42).rotateY(Math.PI), { pos: bp(0, -0.012), rot: [tilt, 0, 0], uv: "keep" });
      kit.add("decalImp", new THREE.PlaneGeometry(0.5, 0.5).rotateY(Math.PI), { pos: [-1.1, my + 0.05, bz - 0.005], uv: "keep", uvRect: impDecalRect(IMP_DECAL.restricted) });
      kit.box(accentKey, 0, my - 0.38, bz - 0.005, 3.2, 0.03, 0.01);
      kit.box("leds", -1.1, my - 0.28, bz - 0.005, 0.5, 0.04, 0.01, { uv: "keep" });
    }
    // desk-side kit: comm unit, datapads, caf mug, holo-projector puck with a slowly turning cell map (animated)
    kit.box("impTrim", -1.3, 0.9, dz - 0.1, 0.3, 0.16, 0.2, { color: BLK });
    kit.box("emitGreen", -1.3, 0.94, dz + 0.005, 0.04, 0.03, 0.005);
    kit.cyl("impMetal", 1.4, 0.92, dz - 0.05, 0.04, 0.1, "y", { color: GD, segments: 10 });
    kit.cyl("impTrim", 0.2, 0.9, dz - 0.15, 0.14, 0.05, "y", { color: BLK, segments: 16 });
    kit.cyl("emitCyan", 0.2, 0.928, dz - 0.15, 0.1, 0.006, "y", { segments: 16, uv: "keep" });
    const map = new THREE.Mesh(compound([B(0.5, 0.01, 0.3, [0, 0, 0], 0xffffff), B(0.04, 0.16, 0.04, [-0.18, 0.08, -0.08], 0xffffff), B(0.04, 0.16, 0.04, [0.18, 0.08, -0.08], 0xffffff), B(0.04, 0.16, 0.04, [-0.18, 0.08, 0.08], 0xffffff), B(0.04, 0.16, 0.04, [0.18, 0.08, 0.08], 0xffffff), B(0.1, 0.06, 0.1, [0, 0.03, 0], 0xffffff)]), ctx.materials.holo);
    map.position.set(0.2, 1.1, dz - 0.15);
    kit.attach(map);
    kit.onUpdate((dt, t) => {
      map.rotation.y += dt * 0.5;
      map.position.y = 1.1 + Math.sin(t * 1.5) * 0.02;
    });
    // low railing separating the desk from the entry, with a gate gap on the lane
    impRailing(kit, [-5.5, dz - 2.3], [-1.5, dz - 2.3], 0, { h: 1.0, light: accentKey });
    impRailing(kit, [1.5, dz - 2.3], [5.5, dz - 2.3], 0, { h: 1.0, light: accentKey });
    impRailing(kit, [-5.5, dz - 2.3], [-5.5, dz + 2.6], 0, { h: 1.0 });
    impRailing(kit, [5.5, dz - 2.3], [5.5, dz + 2.6], 0, { h: 1.0 });
    floorDecal(kit, IMP_DECAL.keepClear, 0, dz - 3.2, 0.8, Math.PI);
    kit.boxMM("rubber", [-5.3, 0.002, dz - 2.1], [5.3, 0.02, dz + 2.5], { color: GD, texel: 1 });
    // over the desk: a pair of dim red louvred slots in one black housing (the old white panel killed the red mood)
    kit.box("impTrim", 0, h - 0.11, dz + 0.4, 3.6, 0.22, 1.5, { color: BLK, texel: 1 });
    for (const dzz of [-0.45, 0.45]) slotLight(kit, 0, dz + 0.4 + dzz, h - 0.02, 3.2, "x", "emitRedDim", { w: 0.34, bar: 0.1 });
  }

  // ---------------------------------------------------------------- cell rows: 4 cells along E and W walls, doors facing the aisle
  const cellZ = [-6.2, -2.4, 1.4, 5.2];
  const cellX = hx - 0.42 - 1.5 - 0.2;
  const numbers = [IMP_DECAL.bay01, IMP_DECAL.bay02, IMP_DECAL.bay03, IMP_DECAL.glyphs2];
  let ci = 0;
  for (const s of [-1, 1]) {
    for (const [k, z] of cellZ.entries()) {
      // cells open toward the aisle (local +z -> toward x = 0): yaw ±π/2
      buildCell(kit, cctx, s * cellX, z, s > 0 ? -Math.PI / 2 : Math.PI / 2, ci, { seed: 90 + ci * 4, occupied: ci === 1 || ci === 4 || ci === 6, decal: numbers[k] });
      ci++;
    }
    // walkway plate in front of the row, red chevron line, bay stencils on the deck
    const wx = s * (cellX - 1.5 - 0.5);
    kit.boxMM("impMetalRough", [Math.min(wx - 0.5, wx + 0.5), 0.002, cellZ[0] - 1.7], [Math.max(wx - 0.5, wx + 0.5), 0.016, cellZ[3] + 1.7], { color: GD, texel: 1 });
    floorStripe(kit, s * (cellX - 1.7 - 0.9), cellZ[0] - 1.7, s * (cellX - 1.7 - 0.9), cellZ[3] + 1.7, 0.1, "chevronR", 0.02);
    for (const z of cellZ) floorDecal(kit, IMP_DECAL.arrowRight, s * (cellX - 3.4), z, 0.4, s > 0 ? 0 : Math.PI, 0.02);
  }
  // force fields: one mesh for all eight doorways; shimmer = opacity flicker on the shared material (allocation-free)
  kit.attach(new THREE.Mesh(mergeGeometries(cctx.fieldGeos, false), fieldMat));
  kit.onUpdate((dt, t) => {
    fieldMat.opacity = 0.2 + 0.05 * Math.sin(t * 9.0) + 0.03 * Math.sin(t * 23.0);
  });
  // pillars between cell pairs carrying beacons; cable runs over the cell roofs
  for (const s of [-1, 1]) {
    for (const z of [(cellZ[0] + cellZ[1]) / 2, (cellZ[2] + cellZ[3]) / 2]) {
      const px = s * (cellX - 1.9);
      kit.box("impTrim", px, h - 0.15, z, 0.3, 0.3, 0.3, { color: BLK });
      kit.cyl("impMetal", px, h - 0.42, z, 0.04, 0.3, "y", { color: GD, segments: 8 });
      kit.cyl("impTrim", px, h - 0.6, z, 0.14, 0.06, "y", { color: BLK, segments: 14 });
      kit.cyl("impTrim", px, h - 0.92, z, 0.12, 0.05, "y", { color: BLK, segments: 14 });
      const lens = new THREE.Mesh(compound([B(0.06, 0.24, 0.16, [0.06, 0, 0], PALETTE.impRed), B(0.06, 0.24, 0.16, [-0.06, 0, 0], PALETTE.impRed)]), ctx.materials.emitRedImp);
      lens.position.set(px, h - 0.76, z);
      kit.attach(lens);
      kit.onUpdate((dt) => {
        lens.rotation.y += dt * 3.2;
      });
    }
    // one pulsing red pool per cell row (pass 3: was one per pair — the two freed slots became the cool side keys
    // below): 2.5 m in front of the row centre, 3 m up, so all four cell fronts and the walkway are lit face-on
    // and the red spills through the doorways
    const phase = rand() * 6.28;
    kit.light({ type: "point", pos: [s * (cellX - 4.0), 3.0, (cellZ[1] + cellZ[2]) / 2], color: 0xff3a28, intensity: lux(3.0, 4.2) / 3.0, decay: 1, distance: 15, priority: 0.44, dim: (t) => 0.72 + 0.28 * Math.sin(t * 3.2 + phase) });
  }

  // ---------------------------------------------------------------- interrogation room at the far end (S wall): raised dais, chair, droid, spot, screens
  {
    const iz = hz - 3.2;
    kit.box("impTrim", 0, 0.08, iz, 7.0, 0.16, 5.0, { color: BLK, texel: 1 });
    kit.box("impMetalRough", 0, 0.17, iz, 6.8, 0.02, 4.8, { color: CHR, texel: 1 });
    kit.boxMM(accentKey, [-3.4, 0.16, iz - 2.5], [3.4, 0.19, iz - 2.46]);
    kit.floor(-3.5, iz - 2.5, 3.5, iz + 2.5, 0.18, "dais");
    kit.box("impTrim", 0, 0.04, iz - 2.75, 3.0, 0.08, 0.5, { color: BLK, texel: 1 });
    kit.box("chevronR", 0, 0.085, iz - 2.75, 2.8, 0.01, 0.4, { texel: 3 });
    // half-height partitions either side of the step
    for (const s of [-1, 1]) {
      kit.box("impTrim", s * 3.4, 1.0, iz - 1.4, 0.16, 2.0, 2.2, { color: BLK, texel: 1 });
      kit.box("impPanel2", s * 3.4, 1.0, iz - 1.4, 0.18, 1.6, 2.0, { color: CHR, uv: "world", texel: 1 });
      kit.box(accentKey, s * 3.4, 2.03, iz - 1.4, 0.06, 0.02, 2.0);
      kit.collider([s * 3.4 - 0.1, 0, iz - 2.5], [s * 3.4 + 0.1, 2.0, iz - 0.3], "partition");
    }
    // chair faces the room (its occupant looks north toward the desk); droid hovers front-left of it
    restraintChair(kit, 0.4, iz + 0.6, 0, 0.18);
    interrogationDroid(kit, -1.3, iz - 0.4, -2.1, 0.18);
    // spot rig: ceiling boom with a white lamp head over the chair + white key light
    kit.cyl("impTrim", 0.4, h - 0.06, iz + 0.2, 0.22, 0.12, "y", { color: BLK, segments: 14 });
    kit.cyl("impMetal", 0.4, h - 0.5, iz + 0.2, 0.04, 0.8, "y", { color: GD, segments: 8 });
    kit.cyl("impTrim", 0.4, h - 0.98, iz + 0.2, 0.3, 0.16, "y", { color: BLK, segments: 18, r2: 0.16 });
    kit.cyl("emitWhite", 0.4, h - 1.07, iz + 0.2, 0.22, 0.02, "y", { segments: 18, uv: "keep" });
    for (const f of [-0.14, 0, 0.14]) kit.box("impTrim", 0.4, h - 1.085, iz + 0.2 + f, 0.42, 0.02, 0.02, { color: BLK });
    // wall unit: screens and a recorder, restraint hooks, a drain
    S.box("impTrim", hx, 1.6, 0.08, 3.0, 1.2, 0.16, { color: BLK, texel: 1 });
    S.screen("scrRed3", hx - 0.8, 1.7, 0.165, 1.2, 0.7);
    S.screen("scrWhite1", hx + 0.9, 1.7, 0.165, 1.0, 0.7);
    S.box("leds", hx, 1.12, 0.165, 2.6, 0.04, 0.01, { uv: "keep" });
    S.box(accentKey, hx, 2.24, 0.165, 2.8, 0.02, 0.01);
    for (const du of [-2.2, 2.2]) {
      S.box("impTrim", hx + du, 1.9, 0.06, 0.3, 0.3, 0.12, { color: BLK });
      S.cylN("impMetal", hx + du, 1.9, 0.14, 0.04, 0.16, { color: STEEL, segments: 8 });
      ring(kit, "impMetal", -du, 1.72, hz - 0.2, 0.08, 0.012, { axis: "z", color: STEEL, segments: 16 });
    }
    kit.cyl("impTrim", 1.8, 0.185, iz + 1.4, 0.16, 0.01, "y", { color: BLK, segments: 14 });
    kit.box("impTrim", -2.4, 0.6, iz + 1.6, 0.6, 0.84, 0.5, { color: BLK, texel: 1 });
    kit.box("impMetal", -2.4, 1.04, iz + 1.6, 0.62, 0.04, 0.52, { color: GD });
    for (let k = 0; k < 4; k++) kit.cyl("impMetal", -2.6 + k * 0.12, 1.08, iz + 1.5 + (k % 2) * 0.12, 0.012, 0.16, "y", { color: STEEL, segments: 6 });
    kit.box("impGloss", -2.3, 1.07, iz + 1.75, 0.2, 0.014, 0.14);
    kit.collider([-2.72, 0, iz + 1.33], [-2.08, 1.1, iz + 1.87], "cart");
    wallSign(S, hx - 3.0, 2.7, IMP_DECAL.glyphs2, 0.5, accentKey);
    S.decal(IMP_DECAL.glyphs3, hx + 3.0, 2.7, 0.03, 0.44);
    keyLight(kit, 0.4, h - 1.1, iz + 0.2, { color: 0xffffff, k: 6.0, distance: 9, priority: 0.46 });
  }

  // ---------------------------------------------------------------- weapon-locker cage in the NW corner, guard post + crates NE
  {
    const cx = -hx + 2.4;
    const cz = -hz + 2.0;
    rifleRack(kit, cx, -hz + 0.7, 0, 4, { accentKey, seed: 26 });
    // cage: two mesh walls (E and S side) with posts, a locked door, restricted stencil
    const cage = (x0, z0, x1, z1) => {
      const dx = x1 - x0;
      const dz = z1 - z0;
      const len = Math.hypot(dx, dz);
      const p = new Placer(kit, x0, 0, z0, Math.atan2(-dz, dx));
      p.box("impTrim", 0, 1.35, 0, 0.08, 2.7, 0.08, { color: BLK });
      p.box("impTrim", len, 1.35, 0, 0.08, 2.7, 0.08, { color: BLK });
      p.box("impTrim", len / 2, 2.67, 0, len, 0.06, 0.08, { color: BLK });
      p.box("impTrim", len / 2, 0.12, 0, len, 0.24, 0.06, { color: BLK });
      for (let u = 0.12; u < len - 0.06; u += 0.12) p.box("impMetal", u, 1.45, 0, 0.014, 2.4, 0.014, { color: GD });
      for (let v = 0.65; v < 2.6; v += 0.4) p.box("impMetal", len / 2, v, 0.009, len, 0.012, 0.012, { color: GD });
      p.collider(-0.05, 0, -0.07, len + 0.05, 2.7, 0.07, "cage");
      return p;
    };
    cage(cx + 2.0, -hz + 0.42, cx + 2.0, cz + 1.6);
    const front = cage(cx + 2.0, cz + 1.6, -hx + 0.42, cz + 1.6);
    front.box("impTrim", 1.5, 1.35, 0.02, 1.0, 2.4, 0.05, { color: BLK, texel: 1 });
    for (let u = 1.05; u < 1.95; u += 0.1) front.box("impMetal", u, 1.45, 0.045, 0.02, 2.3, 0.02, { color: STEEL });
    front.box("impTrim", 1.1, 1.1, 0.06, 0.16, 0.24, 0.08, { color: BLK });
    front.box("emitRedImp", 1.1, 1.16, 0.105, 0.05, 0.03, 0.005);
    front.decal(IMP_DECAL.glyphs1, 1.5, 1.9, 0.06, 0.34);
    kit.box("impTrim", cx + 0.2, 2.86, cz + 1.6, 1.0, 0.3, 0.2, { color: BLK });
    kit.box("scrRed0", cx + 0.2, 2.86, cz + 1.71, 0.8, 0.14, 0.01, { uv: "keep" });
    crateStack(kit, cx - 1.2, cz + 0.6, 0.2, { seed: 46, decal: IMP_DECAL.hazard, n: 2 });
    // above the cage top rail (the wall further south is hidden behind the cell row)
    W.decal(IMP_DECAL.hazard, hz + 9.0, 3.3, 0.03, 0.44);
    hoodLamp(W, hz + 10.6, 3.3, ACCENT, 0.8);
    // guard post NE: stool, standing console, wall board
    impConsole(kit, hx - 2.2, 0, -hz + 1.6, 1.4, 0.8, { yaw: 0, seed: 88, screens: ["scrRed0", "scrRed1"], accentKey, tall: true });
    impChair(kit, hx - 2.2, 0, -hz + 2.6, 0);
    E.box("impTrim", 1.6, 1.8, 0.06, 1.6, 0.9, 0.12, { color: BLK, texel: 1 });
    E.screen("scrRed2", 1.6, 1.85, 0.125, 1.4, 0.6);
    E.box("leds", 1.6, 1.4, 0.125, 1.2, 0.04, 0.01, { uv: "keep" });
    crateStack(kit, hx - 1.3, -hz + 3.2, -0.2, { seed: 47, decal: IMP_DECAL.glyphs1, n: 3 });
  }

  // ---------------------------------------------------------------- door wall (N): signage, status units, blast stripes on the deck
  wallSign(N, hx - 3.2, 2.7, IMP_DECAL.hazard, 0.6, accentKey);
  wallSign(N, hx + 3.2, 2.7, IMP_DECAL.cog, 0.6, accentKey);
  statusUnit(N, hx - 5.2, 1.7, { screen: "scrRed0", accentKey, w: 0.9 });
  statusUnit(N, hx + 5.2, 1.7, { screen: "scrWhite3", accentKey, w: 0.9 });
  hoodLamp(N, hx - 7.5, 2.5, "emitWhiteDim", 0.9);
  hoodLamp(N, hx + 7.5, 2.5, "emitWhiteDim", 0.9);
  impWallGear(N, hx + 10.5, 1.6, { seed: 89, accentKey });
  cableRun(N, hx + 6.5, hx + 16.0, 2.95, { n: 3, seed: 14, accentKey });
  cableRun(N, hx - 16.0, hx - 6.5, 2.95, { n: 2, seed: 15, accentKey });
  floorStripe(kit, -1.95, -hz + 0.5, -1.95, -hz + 3.4, 0.12, "chevronR", 0.018);
  floorStripe(kit, 1.95, -hz + 0.5, 1.95, -hz + 3.4, 0.12, "chevronR", 0.018);
  floorDecal(kit, IMP_DECAL.arrowUp, 0, -hz + 2.0, 0.8, Math.PI, 0.02);
  // E/W wall detail above the cell roofs
  for (const [F, u0] of [[E, hz - 8.0], [W, hz - 8.0]]) {
    cableRun(F, u0, u0 + 15.0, 3.6, { n: 2, seed: 16, accentKey });
  }
  cameraHousing(kit, hx - 0.3, h - 0.55, -hz + 0.3, Math.PI * 0.75);
  cameraHousing(kit, -hx + 0.3, h - 0.55, -hz + 0.3, -Math.PI * 0.75);
  cameraHousing(kit, hx - 0.3, h - 0.55, hz - 0.3, Math.PI * 0.25);
  cameraHousing(kit, -hx + 0.3, h - 0.55, hz - 0.3, -Math.PI * 0.25);
  cameraHousing(kit, 0.9, h - 0.55, -4.6 - 3.0, Math.PI);

  // ---------------------------------------------------------------- lights (8): 2 pulsing red row pools (above), interrogation spot (above),
  // dim red pool over the desk (the screens carry the white there), cool fill: entrance key 2.4 m in front of the
  // spawn (over the railing gate, so it lights the desk front and the floor beyond it rather than the deck behind
  // the camera), two side keys over the open floor between the desk wings and the cell rows (that floor read as
  // a black void when the only cool light sat on the centre line), one aisle key behind the desk
  keyLight(kit, 0, h - 1.0, -4.4, { color: 0xff4a34, k: 3.2, distance: 12, priority: 0.5 });
  keyLight(kit, 0, h - 1.0, -7.6, { color: 0xdfe8ff, k: 3.4, distance: 13, priority: 0.47 });
  // (the side keys carry a faint rose cast so the block's floor stays in the red family rather than going steel-blue)
  keyLight(kit, -8.0, h - 1.0, -4.6, { color: 0xf4dcd6, k: 3.2, distance: 14, priority: 0.46 });
  keyLight(kit, 8.0, h - 1.0, -4.6, { color: 0xf4dcd6, k: 3.2, distance: 14, priority: 0.45 });
  keyLight(kit, 0, h - 1.0, 2.5, { color: 0xdfe8ff, k: 3.0, distance: 14, priority: 0.43 });
}
