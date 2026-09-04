// Officers' Quarters (Deck B): four cabin alcoves off a central lounge. Each alcove has a bunk,
// a desk with a chair and a readout, a locker and a shelf of personal effects behind a header beam;
// the lounge has a low table, two padded benches and a free-standing media wall with a viewscreen.
// Warm accent (#d7b98c): amber trim lights, warm-white bunk lights, dark carpet runners.
import * as THREE from "three";
import { PALETTE } from "../materials.js";
import { impRoomShell, impWall, wallFrame, impWallLight, impWallGear, lux } from "./imperial_kit.js";
import { IMP_DECAL, impDecalRect } from "../textures_imperial.js";
import { bench, table, wallScreen, locker, fakeDoor, cableRun, chairInstance, holoFigure, propFrame } from "./deck_b_props.js";

const CARPET = new THREE.Color("#2a2d34");
const MATTRESS = new THREE.Color("#3a4150");
const BLANKET = new THREE.Color("#2b3552");
const PILLOW = new THREE.Color("#7a7f8a");

export function buildOfficersQuarters(kit, ctx, room) {
  const [w, h, d] = room.size;
  const hx = w / 2;
  const hz = d / 2;
  const accentKey = ctx.accentKey ? ctx.accentKey(room) : "emitAmber";
  const walls = impRoomShell(kit, room, ctx.doors, {
    seed: 5203,
    accentKey,
    wall: { panelW: 1.6, features: { vent: 0.05, equipment: 0.04, conduit: 0.03, light: 0.1, screen: 0.02 }, altChance: 0.25 },
    floor: { lane: false },
    ceiling: { troughs: 2, troughW: 0.5, beamStep: 3.0 },
  });

  // --- alcove layout: two cabins along the N wall, two along the S wall, x from -15 to -2
  const aX = [-hx, -8.5, -2];
  const open = hz - 6.4; // z of the alcove opening line (5.6)
  const alcoves = [];
  for (const side of [-1, 1]) {
    for (let i = 0; i < 2; i++) alcoves.push({ x0: aX[i], x1: aX[i + 1], side, idx: alcoves.length });
  }
  // partitions: between the two alcoves and at the alcove block's inner edge, both sides
  const parts = {};
  for (const side of [-1, 1]) {
    const zWall = side * hz;
    const zOpen = side * open;
    for (const x of [aX[1], aX[2]]) parts[`${side}:${x}`] = partition(kit, x, zWall, zOpen, h, { seed: 61 + x * 3 + side * 7, accentKey });
    // header beam over the alcove openings with amber underglow and cabin labels
    kit.boxMM("impTrim", [-hx, h - 0.9, Math.min(zOpen - 0.15, zOpen + 0.15)], [aX[2] + 0.15, h, Math.max(zOpen - 0.15, zOpen + 0.15)], { color: PALETTE.impBlack, texel: 1 });
    kit.boxMM("impMetal", [-hx + 0.2, h - 0.92, Math.min(zOpen - 0.1, zOpen + 0.1)], [aX[2], h - 0.88, Math.max(zOpen - 0.1, zOpen + 0.1)], { color: PALETTE.impCharcoal });
    for (let i = 0; i < 2; i++) {
      const cx = (aX[i] + aX[i + 1]) / 2;
      kit.box(accentKey, cx, h - 0.935, zOpen, 3.2, 0.012, 0.06);
      const g = new THREE.PlaneGeometry(0.34, 0.34);
      if (side > 0) g.rotateY(Math.PI);
      kit.add("decalImp", g, { pos: [cx + 2.4, h - 0.45, zOpen - side * 0.16], uv: "keep", uvRect: impDecalRect([IMP_DECAL.bay01, IMP_DECAL.bay02, IMP_DECAL.bay03, IMP_DECAL.glyphs1][i + (side > 0 ? 2 : 0)]) });
    }
    kit.collider([-hx, h - 0.9, zOpen - 0.16], [aX[2] + 0.15, h, zOpen + 0.16], "header");
  }

  let holo = null;
  for (const a of alcoves) {
    const back = a.side * hz;
    const backFrame = a.side < 0 ? walls.N.frame : walls.S.frame;
    const bu = (x) => (a.side < 0 ? x + hx : hx - x); // wall-u for a room x on the back wall
    const t = (tt) => back - a.side * tt; // z at depth tt from the back wall
    const cx = (a.x0 + a.x1) / 2;
    // bunk along the back wall on the W side of the alcove
    bunk(kit, a.x0 + 0.35, a.x0 + 2.45, back, a.side, accentKey);
    impWallLight(backFrame, bu(a.x0 + 1.4), 1.75, { key: "emitWarmSoft", w: 0.9 });
    backFrame.decal(IMP_DECAL.glyphs2, bu(a.x0 + 0.7), 2.4, 0.034, 0.3);
    // locker beside the bunk
    locker(backFrame, bu(a.x1 - 0.85), 0.9, 2.1, { accentKey, color: PALETTE.impGrey, decal: IMP_DECAL.glyphs1, doors: 1 });
    // desk against the E partition, chair facing it, shelf above
    const eFace = parts[`${a.side}:${a.x1}`].west; // face of the E partition looking into this alcove
    const dz = t(3.6);
    desk(kit, a.x1 - 0.52, dz, a.side, accentKey);
    chairInstance(kit, a.x1 - 1.3, dz, -Math.PI / 2);
    const su = eFace.uOf(dz);
    const fig = shelf(kit, ctx, eFace.frame, su, 1.5, { accentKey, holo: a.idx === 1 });
    if (fig) holo = fig;
    // carpet strip from the opening to the bunk
    kit.boxMM("fabric", [cx - 1.5, 0.002, Math.min(t(1.2), t(6.2))], [cx + 0.3, 0.014, Math.max(t(1.2), t(6.2))], { color: CARPET, texel: 1.5 });
    // wall gear on the W side (W wall for the outer cabins, partition face for the inner ones)
    if (a.x0 === -hx) impWallGear(walls.W.frame, hz - t(2.6), 1.5, { seed: 12 + a.idx, accentKey });
    else cableRun(parts[`${a.side}:${a.x0}`].east.frame, 0.4, 5.6, 2.9, { n: 2, seed: 20 + a.idx, r: 0.03 });
    // soft warm key per cabin
    kit.light({ type: "point", pos: [cx, h - 0.5, t(3.0)], color: 0xffd2a8, intensity: lux(h - 0.5, 2.0), distance: 9, priority: 0.36 - a.idx * 0.005 });
  }
  // rotating comm hologram in one cabin's holo frame
  if (holo) {
    kit.onUpdate((dt) => {
      holo.rotation.y += dt * 0.8;
    });
  }

  // --- lounge: media wall, low table, two benches facing each other
  const media = partition(kit, 1.2, -2.4, 2.4, h, { seed: 77, accentKey, features: {}, bothEnds: true });
  wallScreen(media.east.frame, 2.4, 1.85, 2.6, 1.45, "scrBlue1", { accentKey });
  for (const s of [-1, 1]) {
    media.east.frame.box("impTrim", 2.4 + s * 1.95, 1.9, 0.07, 0.24, 2.4, 0.08, { color: PALETTE.impBlack });
    media.east.frame.box("emitWarmSoft", 2.4 + s * 1.95, 1.9, 0.115, 0.08, 2.2, 0.012, { uv: "keep" });
  }
  media.west.frame.decal(IMP_DECAL.cog, 2.4, 2.0, 0.036, 1.2);
  media.west.frame.decal(IMP_DECAL.glyphs3, 2.4, 1.1, 0.036, 1.0, { h: 0.3 });
  table(kit, 5.2, 0, 2.2, 1.0, 0, { h: 0.46, accentKey });
  bench(kit, 5.2, 1.85, 3.0, 0, { pad: "fabric", padColor: MATTRESS, accentKey });
  bench(kit, 5.2, -1.85, 3.0, Math.PI, { pad: "fabric", padColor: MATTRESS, accentKey });
  // side tables with a lamp and a decanter set
  for (const s of [-1, 1]) {
    table(kit, 7.4, s * 1.85, 0.6, 0.6, 0, { h: 0.5, accentKey: null });
    kit.cyl("impTrim", 7.4, 0.54, s * 1.85, 0.08, 0.06, "y", { color: PALETTE.impBlack, segments: 12 });
    kit.cyl("impMetal", 7.4, 0.72, s * 1.85, 0.02, 0.3, "y", { color: PALETTE.impGrey, segments: 8 });
    kit.cyl("impTrim", 7.4, 0.9, s * 1.85, 0.12, 0.1, "y", { color: PALETTE.impBlack, segments: 12, r2: 0.07 });
    kit.cyl("emitWarmSoft", 7.4, 0.86, s * 1.85, 0.09, 0.02, "y", { segments: 12, uv: "keep" });
  }
  // lounge carpet and the runner from the door
  kit.boxMM("fabric", [2.6, 0.002, -2.9], [8.6, 0.014, 2.9], { color: CARPET, texel: 1.5 });
  kit.boxMM("fabric", [8.6, 0.002, -1.0], [hx - 0.3, 0.014, 1.0], { color: CARPET, texel: 1.5 });
  kit.boxMM("fabric", [-hx + 0.6, 0.002, -1.0], [1.0, 0.014, 1.0], { color: CARPET, texel: 1.5 });
  for (const [x0, x1, z] of [[2.6, 8.6, -2.95], [2.6, 8.6, 2.95]]) kit.boxMM(accentKey, [x0, 0.003, z - 0.02], [x1, 0.011, z + 0.02]);

  // --- N and S walls east of the alcoves: refresher doors, locker bank, notice screen
  const N = walls.N.frame; // u = x + hx
  const S = walls.S.frame; // u = hx - x
  const refresher = fakeDoor(N, hx + 5.0, 1.4, 2.4, { accentKey, statusKey: "emitGreen", label: IMP_DECAL.glyphs3 });
  fakeDoor(S, hx - 5.0, 1.4, 2.4, { accentKey, statusKey: "emitRedImp", label: IMP_DECAL.glyphs3 });
  locker(N, hx + 10.2, 2.7, 2.1, { accentKey, doors: 3, color: PALETTE.impGrey, vents: true });
  wallScreen(S, hx - 10.2, 1.8, 1.6, 1.0, "scrAmber0", { accentKey, leds: 2 });
  bench(kit, 12.5, hz - 0.55, 2.2, 0, { back: false, pad: "fabric", padColor: MATTRESS });
  // occupied light of the refresher blinks
  const blink = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.012), ctx.materials.emitRedImp);
  blink.position.copy(refresher).add(new THREE.Vector3(0, -0.08, 0.004));
  kit.attach(blink);
  kit.onUpdate((dt, tt) => {
    blink.visible = Math.sin(tt * 2.2) > 0.6;
  });
  // duty roster beside the door on the E wall + a coat rail
  const E = walls.E.frame; // u = z + hz
  wallScreen(E, hz - 3.4, 1.75, 1.4, 0.9, "scrAmber1", { accentKey, leds: 3 });
  E.box("impTrim", hz + 3.2, 1.7, 0.06, 1.6, 0.08, 0.1, { color: PALETTE.impBlack });
  for (let i = 0; i < 4; i++) E.box("impMetal", hz + 2.6 + i * 0.4, 1.6, 0.1, 0.05, 0.16, 0.16, { color: PALETTE.impGrey });
  E.decal(IMP_DECAL.glyphs2, hz + 3.2, 2.2, 0.034, 0.5);

  // --- lights: lounge key, vestibule key, amber low accent under the media wall screen
  kit.light({ type: "point", pos: [5.2, h - 0.5, 0], color: 0xfff1de, intensity: lux(h - 0.5, 1.9), distance: 11, priority: 0.5 });
  kit.light({ type: "point", pos: [11.5, h - 0.5, 0], color: 0xf4ecff, intensity: lux(h - 0.5, 1.7), distance: 10, priority: 0.45 });
  kit.light({ type: "point", pos: [2.2, 0.6, 0], color: new THREE.Color(room.accent).getHex(), intensity: 3.5, distance: 7, priority: 0.3 });
}

/**
 * Free-standing partition along z at x, from zA (at a wall) to zB (open end): two panelled faces
 * back to back, an end post and one collider. Returns { west, east } faces with frame + uOf(z).
 */
function partition(kit, x, zA, zB, h, opts = {}) {
  const { seed = 1, accentKey = "emitAmber", features = {}, bothEnds = false } = opts;
  const t = 0.12; // half thickness (each face slab is 0.12 deep)
  const lo = Math.min(zA, zB);
  const hi = Math.max(zA, zB);
  // west face (looks toward -x): U must run so that N = -x  =>  from lo to hi
  const wf = wallFrame(kit, [x - t, lo], [x - t, hi]);
  impWall(wf.frame, wf.length, h, { seed, accentKey, depth: t, features, panelW: 1.6, tag: "partition", collide: false, altChance: 0.2 });
  const ef = wallFrame(kit, [x + t, hi], [x + t, lo]);
  impWall(ef.frame, ef.length, h, { seed: seed + 5, accentKey, depth: t, features, panelW: 1.6, tag: "partition", collide: false, altChance: 0.2 });
  // end post(s) at the open end(s)
  const ends = bothEnds ? [zA, zB] : [zB];
  for (const zEnd of ends) {
    const out = zEnd > (zA + zB) / 2 ? 1 : -1;
    kit.box("impTrim", x, h / 2, zEnd, 2 * t + 0.16, h, 0.3, { color: PALETTE.impBlack, texel: 1 });
    kit.box(accentKey, x, h / 2, zEnd + out * 0.156, 0.06, h - 1.4, 0.012);
  }
  kit.collider([x - t - 0.08, 0, lo - 0.15], [x + t + 0.08, h, hi + 0.15], "partition");
  return {
    west: { frame: wf.frame, uOf: (z) => z - lo },
    east: { frame: ef.frame, uOf: (z) => hi - z },
  };
}

/** Bunk along a wall at z = back (side -1: N wall, +1: S wall), spanning x0..x1. */
function bunk(kit, x0, x1, back, side, accentKey) {
  const depth = 0.95;
  const z0 = side < 0 ? back + 0.08 : back - 0.08 - depth;
  const z1 = z0 + depth;
  const zFront = side < 0 ? z1 : z0;
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  kit.boxMM("impMetal", [x0, 0, z0 + 0.06], [x1, 0.12, z1 - 0.06], { color: PALETTE.impCharcoal, texel: 1 });
  kit.boxMM("impTrim", [x0, 0.1, z0], [x1, 0.5, z1], { color: PALETTE.impBlack, texel: 1 });
  // drawer fronts on the open side
  for (let i = 0; i < 2; i++) {
    const fx0 = x0 + 0.12 + i * ((x1 - x0 - 0.24) / 2) + 0.03;
    const fx1 = fx0 + (x1 - x0 - 0.24) / 2 - 0.06;
    kit.boxMM("impPanel1", [fx0, 0.16, zFront - (side < 0 ? 0.0 : 0.02)], [fx1, 0.44, zFront + (side < 0 ? 0.02 : 0.0)], { color: PALETTE.impGrey, uv: "world", texel: 1 });
    kit.box("impMetal", (fx0 + fx1) / 2, 0.3, zFront - side * 0.035, 0.3, 0.03, 0.03, { color: PALETTE.impGreyDark });
  }
  kit.box(accentKey, cx, 0.13, zFront - side * 0.006, x1 - x0 - 0.3, 0.02, 0.012);
  // mattress, blanket over the foot end, pillow at the head (west end)
  kit.boxMM("fabric", [x0 + 0.03, 0.5, z0 + 0.03], [x1 - 0.03, 0.68, z1 - 0.03], { color: MATTRESS, texel: 2 });
  kit.boxMM("fabric", [x0 + 0.85, 0.68, z0 - 0.02], [x1 - 0.02, 0.74, z1 + 0.02], { color: BLANKET, texel: 2 });
  kit.boxMM("fabric", [x0 + 0.85, 0.6, z0 - 0.03], [x0 + 0.95, 0.75, z1 + 0.03], { color: BLANKET, texel: 2 });
  kit.box("fabric", x0 + 0.42, 0.74, cz, 0.55, 0.12, 0.42, { color: PILLOW, texel: 2 });
  kit.collider([x0, 0, z0], [x1, 0.75, z1], "bunk");
}

/** Desk against a partition at x (its face), long along z, with a tilted readout and a drawer. */
function desk(kit, x, z, side, accentKey) {
  const f = propFrame(kit, x, 0, z, 0);
  f.box("impMetal", 0, 0.73, 0, 0.62, 0.05, 1.3, { color: PALETTE.impCharcoal, texel: 1 });
  f.box("impGloss", 0, 0.758, -0.15, 0.5, 0.012, 0.9);
  f.box("impTrim", 0.2, 0.36, 0.5, 0.2, 0.72, 0.28, { color: PALETTE.impBlack, texel: 1 });
  f.box("impTrim", 0.2, 0.36, -0.5, 0.2, 0.72, 0.28, { color: PALETTE.impBlack, texel: 1 });
  f.box("impTrim", 0.08, 0.5, 0.5, 0.42, 0.34, 0.3, { color: PALETTE.impBlack, texel: 1 });
  f.box("impMetal", -0.14, 0.5, 0.5, 0.02, 0.04, 0.18, { color: PALETTE.impGrey });
  // readout on a stand, screen facing -x (the chair)
  f.box("impTrim", 0.18, 0.86, -0.15, 0.14, 0.2, 0.34, { color: PALETTE.impBlack });
  const g = new THREE.PlaneGeometry(0.4, 0.26);
  g.rotateY(-Math.PI / 2);
  kit.add(side < 0 ? "scrAmber0" : "scrBlue0", g, { pos: [x + 0.1, 0.98, z - 0.15], uv: "keep" });
  f.box(accentKey, 0.1, 0.83, -0.15, 0.012, 0.02, 0.3);
  // datapad and a cup on the desk
  f.box("impGloss", -0.1, 0.766, 0.35, 0.16, 0.012, 0.22);
  kit.cyl("impMetal", x - 0.12, 0.8, z - 0.5, 0.04, 0.08, "y", { color: PALETTE.impGrey, segments: 10 });
  kit.collider([x - 0.31, 0, z - 0.65], [x + 0.31, 0.78, z + 0.65], "desk");
}

/** Shelf on a wall frame with personal effects: datapad, cap, boots, holo frame. Returns the holo figure (or null). */
function shelf(kit, ctx, frame, u, v, opts = {}) {
  const { accentKey = "emitAmber", holo = false } = opts;
  frame.box("impMetal", u, v, 0.16, 1.3, 0.04, 0.32, { color: PALETTE.impGreyDark, texel: 1 });
  for (const s of [-1, 1]) frame.box("impTrim", u + s * 0.55, v - 0.1, 0.1, 0.05, 0.16, 0.2, { color: PALETTE.impBlack });
  frame.box(accentKey, u, v - 0.03, 0.31, 1.1, 0.012, 0.012);
  // datapad leaning on the wall
  frame.box("impGloss", u - 0.45, v + 0.11, 0.06, 0.2, 0.18, 0.015, { tilt: -0.25 });
  frame.box("scrBlue0", u - 0.45, v + 0.11, 0.075, 0.16, 0.12, 0.004, { tilt: -0.25, uv: "keep" });
  // officer's cap
  frame.cylV("impTrim", u - 0.1, v + 0.07, 0.17, 0.13, 0.1, { color: PALETTE.impBlack, segments: 14 });
  frame.cylV("impTrim", u - 0.1, v + 0.03, 0.2, 0.16, 0.012, { color: PALETTE.impBlack, segments: 14 });
  frame.box("impMetal", u - 0.1, v + 0.09, 0.3, 0.05, 0.03, 0.012, { color: PALETTE.impGrey });
  // boots
  for (const s of [0, 1]) {
    frame.box("impTrim", u + 0.2 + s * 0.13, v + 0.17, 0.14, 0.1, 0.3, 0.12, { color: PALETTE.impBlack, texel: 1 });
    frame.box("impTrim", u + 0.2 + s * 0.13, v + 0.05, 0.2, 0.1, 0.06, 0.24, { color: PALETTE.impBlack, texel: 1 });
  }
  // holo frame
  frame.box("impTrim", u + 0.5, v + 0.03, 0.16, 0.22, 0.02, 0.16, { color: PALETTE.impBlack });
  frame.box(accentKey, u + 0.5, v + 0.045, 0.16, 0.06, 0.01, 0.06);
  frame.collider(u - 0.65, u + 0.65, v - 0.15, v + 0.4, 0, 0.33, "shelf");
  if (holo) {
    const fig = holoFigure(ctx.materials, 0.3, true);
    const p = frame.pos(u + 0.5, v + 0.06, 0.16);
    fig.position.copy(p);
    kit.attach(fig);
    return fig;
  }
  // static hologram (merged)
  const p = frame.pos(u + 0.5, v + 0.06, 0.16);
  kit.cyl("holo", p.x, p.y + 0.1, p.z, 0.08, 0.2, "y", { r2: 0.035, segments: 10, uv: "keep" });
  kit.add("holo", new THREE.SphereGeometry(0.045, 10, 8), { pos: [p.x, p.y + 0.25, p.z], uv: "keep" });
  return null;
}
