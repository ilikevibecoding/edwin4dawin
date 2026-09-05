// Officers' Quarters (Deck B): a 4.6 m wide cabin corridor down the room's long axis with full-height
// cabin fronts on both sides. Seven cabin doors per side (black frame, recessed ribbed grey leaf,
// warm header lamp, name plate with a hairline, keypad with a status lamp, cabin number over the
// door), pilasters with warm sconces between them, two bulkhead portals breaking the run, a dark
// runner with amber hairlines and a mat at every door. The first cabin on the N side (by the spawn)
// stands open: through its 2 m double pocket doorway you see a bunk with a reading light, a kit locker, a desk with a
// terminal and a chair, a two-door wardrobe, a shelf of personal effects with a small hologram, a rug
// and a warm ceiling light box. The vestibule by the door has the refresher door (blinking lamp), the
// duty roster and a bench; the W end wall closes the walk with a roster screen between two sconces.
import * as THREE from "three";
import { PALETTE, setDomain } from "../materials.js";
import { impRoomShell, wallFrame, impWallLight, lux } from "./imperial_kit.js";
import { IMP_DECAL, impDecalRect } from "../textures_imperial.js";
import { bench, wallScreen, locker, chairInstance, holoFigure, table, lightBox } from "./deck_b_props.js";

const RUG = new THREE.Color("#2a2d34");
const MATTRESS = new THREE.Color("#4a4f5a");
const BLANKET = new THREE.Color("#6d7178");
const PILLOW = new THREE.Color("#8a8f98");
const NUMBERS = [IMP_DECAL.bay01, IMP_DECAL.bay02, IMP_DECAL.bay03, IMP_DECAL.glyphs1, IMP_DECAL.glyphs2, IMP_DECAL.glyphs3, IMP_DECAL.cog];

/**
 * Cabin door on a cabin-front frame (wall face at n = 0): jambs and header proud of the wall, a
 * recessed two-leaf ribbed grey leaf (or an open pocket doorway), warm header lamp, name plate with a
 * lit hairline on the left, keypad with a status lamp on the right, cabin number decal over the door.
 */
function cabinDoor(f, u, opts = {}) {
  const { w = 1.1, h = 2.2, open = false, statusKey = "emitGreen", number = IMP_DECAL.bay01, accentKey = "emitAmber", tag = "cabindoor" } = opts;
  const J = 0.16; // jamb width
  const D = 0.16; // proud of the wall
  for (const s of [-1, 1]) f.box("impTrim", u + s * (w / 2 + J / 2), h / 2 + 0.08, D / 2 - 0.02, J, h + 0.16, D + 0.04, { color: PALETTE.impBlack, texel: 1 });
  f.box("impTrim", u, h + 0.13, D / 2 - 0.02, w + 2 * J, 0.26, D + 0.04, { color: PALETTE.impBlack, texel: 1 });
  f.box("impMetal", u, h + 0.02, D - 0.03, w, 0.04, 0.06, { color: PALETTE.impGreyDark });
  if (!open) {
    // leaf: two grey panels with a centre seam, three horizontal ribs, a recessed handle bar
    for (const s of [-1, 1]) f.box("impPanel2", u + (s * w) / 4, h / 2, 0.045, w / 2 - 0.015, h, 0.05, { color: PALETTE.impGrey, uv: "world", texel: 1 });
    f.box("impTrim", u, h / 2, 0.07, 0.03, h - 0.02, 0.012, { color: PALETTE.impBlack });
    for (const vv of [h * 0.22, h * 0.5, h * 0.78]) f.box("impTrim", u, vv, 0.07, w - 0.06, 0.035, 0.012, { color: PALETTE.impBlack });
    f.box("impMetal", u + 0.2, 1.02, 0.078, 0.22, 0.05, 0.02, { color: PALETTE.impGreyDark });
    f.box("impTrim", u, 0.06, 0.06, w, 0.12, 0.03, { color: PALETTE.impBlack });
    f.collider(u - w / 2 - J, u + w / 2 + J, 0, h + 0.3, -0.02, D + 0.02, tag);
  } else {
    // pocket leaves: only their edges show in the jambs; the opening is real
    for (const s of [-1, 1]) f.box("impPanel2", u + s * (w / 2 - 0.05), h / 2, 0.02, 0.1, h - 0.02, 0.05, { color: PALETTE.impGrey, uv: "world", texel: 1 });
    for (const s of [-1, 1]) f.collider(u + s * (w / 2 + J / 2) - J / 2, u + s * (w / 2 + J / 2) + J / 2, 0, h + 0.3, -0.02, D + 0.02, tag);
    f.collider(u - w / 2, u + w / 2, h, h + 0.3, -0.02, D + 0.02, tag);
  }
  // header lamp (warm), status lamp and keypad, name plate, number
  f.box("impMetal", u, h + 0.13, D + 0.015, 0.7, 0.09, 0.03, { color: PALETTE.impCharcoal });
  f.box("emitWarmSoft", u, h + 0.13, D + 0.033, 0.52, 0.035, 0.008, { uv: "keep" });
  const ku = u + w / 2 + J + 0.2;
  f.box("impTrim", ku, 1.3, 0.05, 0.22, 0.36, 0.1, { color: PALETTE.impBlack, texel: 1 });
  f.box(statusKey, ku, 1.42, 0.105, 0.1, 0.05, 0.012);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) f.box(r === 1 && c === 1 ? accentKey : "impGloss", ku - 0.04 + c * 0.08, 1.32 - r * 0.06, 0.104, 0.05, 0.035, 0.01);
  const nu = u - w / 2 - J - 0.22;
  f.box("impMetal", nu, 1.66, 0.025, 0.44, 0.17, 0.05, { color: PALETTE.impGrey, texel: 2 });
  f.box("impTrim", nu, 1.66, 0.052, 0.4, 0.13, 0.006, { color: PALETTE.impBlack });
  f.decal(IMP_DECAL.glyphs2, nu - 0.1, 1.67, 0.058, 0.11);
  f.decal(IMP_DECAL.glyphs1, nu + 0.1, 1.67, 0.058, 0.11);
  f.box("emitWhite", nu, 1.595, 0.058, 0.3, 0.006, 0.004);
  f.decal(number, u, h + 0.5, 0.012, 0.34);
}

export function buildOfficersQuarters(kit, ctx, room) {
  const [w, h, d] = room.size;
  const hx = w / 2;
  const hz = d / 2;
  const accentKey = ctx.accentKey ? ctx.accentKey(room) : "emitAmber";
  const M = ctx.materials;
  if (!M.oq_warmDim) {
    // recessed ceiling slots at the dim white slots' level but in the deck's warm-white
    const m = M.emitWarmSoft.clone();
    m.emissiveIntensity = 0.85;
    M.oq_warmDim = setDomain(m, "interior");
  }
  const panelColor = PALETTE.impWhite.clone().lerp(PALETTE.impGrey, 0.3);
  // five recessed slots run across the corridor at x = -12 .. 12 (one warm temperature throughout)
  const walls = impRoomShell(kit, room, ctx.doors, {
    seed: 5203,
    accentKey,
    wall: { panelW: 1.6, features: { vent: 0.05, equipment: 0.04, conduit: 0.03, light: 0.0, screen: 0.02 }, altChance: 0.25 },
    floor: { lane: false },
    ceiling: { troughs: 5, troughW: 0.5, beamStep: 3.0, lightKey: "oq_warmDim" },
  });

  // ---- corridor geometry ------------------------------------------------------------------------
  const CW = 2.3; // corridor half-width (cabin fronts at z = +-2.3)
  const T = 0.16; // cabin-front thickness
  const ZB = 6.9; // cabin back wall
  const X0 = 11.2; // cabins run west from here; the vestibule slot is east of it
  const N = 7;
  const P = (X0 + hx) / N; // cabin pitch
  const xb = [];
  for (let i = 0; i <= N; i++) xb.push(X0 - i * P);
  const OPEN = { side: -1, i: 0 }; // the open cabin: N side, first from the door
  const openX0 = xb[OPEN.i + 1];
  const openX1 = xb[OPEN.i];
  const openC = (openX0 + openX1) / 2;
  const DW = 2.0; // open doorway width (both pocket leaves drawn back)

  // runner with amber hairlines down the corridor, door mats added per door
  kit.boxMM("fabric", [-hx + 0.3, 0.002, -1.3], [hx - 0.3, 0.014, 1.3], { color: RUG, texel: 1.5 });
  for (const s of [-1, 1]) kit.boxMM("emitAmberDim", [-hx + 0.4, 0.004, s * 1.34 - 0.012], [hx - 0.4, 0.016, s * 1.34 + 0.012]);

  let blinkAt = null;
  for (const s of [-1, 1]) {
    const zF = s * CW; // front face z
    const f = s < 0 ? wallFrame(kit, [-hx, zF], [hx, zF]).frame : wallFrame(kit, [hx, zF], [-hx, zF]).frame;
    const U = (x) => (s < 0 ? x + hx : hx - x); // room x -> frame u
    // front slab (a doorway is cut for the open cabin), base trim, cornice band with an amber hairline,
    // darker upper plates above the cornice
    const slab = (u0, u1, v0, v1) => f.box("impPanel1", (u0 + u1) / 2, (v0 + v1) / 2, -T / 2, u1 - u0, v1 - v0, T, { color: panelColor, uv: "world", texel: 1 });
    if (s === OPEN.side) {
      const dl = U(openC) - DW / 2;
      const dr = U(openC) + DW / 2;
      slab(0, Math.min(dl, dr), 0, 3.0);
      slab(Math.max(dl, dr), w, 0, 3.0);
      slab(Math.min(dl, dr), Math.max(dl, dr), 2.2, 3.0);
    } else slab(0, w, 0, 3.0);
    f.box("impPanel1", w / 2, 3.3, -T / 2, w, 0.6, T, { color: PALETTE.impGreyDark, uv: "world", texel: 1 });
    f.box("impTrim", w / 2, 0.07, 0.02, w, 0.14, 0.05, { color: PALETTE.impBlack, texel: 1 });
    f.box("impTrim", w / 2, 3.07, 0.03, w, 0.14, 0.07, { color: PALETTE.impBlack, texel: 1 });
    f.box("emitAmberDim", w / 2, 2.985, 0.012, w - 0.4, 0.016, 0.008);
    // colliders: the whole front except the doorway (jambs / header come from cabinDoor)
    if (s === OPEN.side) {
      kit.collider([-hx, 0, Math.min(zF, zF - s * T)], [openC - DW / 2 - 0.08, h, Math.max(zF, zF - s * T)], "cabinfront");
      kit.collider([openC + DW / 2 + 0.08, 0, Math.min(zF, zF - s * T)], [hx, h, Math.max(zF, zF - s * T)], "cabinfront");
    } else kit.collider([-hx, 0, Math.min(zF, zF - s * T)], [hx, h, Math.max(zF, zF - s * T)], "cabinfront");
    // pilasters at the cabin boundaries with a warm sconce each; plate seams between them
    for (let i = 0; i <= N; i++) {
      const x = xb[i];
      if (x <= -hx + 0.2) continue;
      const u = U(x);
      f.box("impTrim", u, h / 2, 0.05, 0.28, h, 0.1, { color: PALETTE.impBlack, texel: 1 });
      f.box("impMetal", u, 2.75, 0.14, 0.34, 0.14, 0.14, { color: PALETTE.impCharcoal, texel: 1 });
      f.box("impTrim", u, 2.75, 0.18, 0.3, 0.1, 0.08, { color: PALETTE.impBlack });
      f.box("emitWarmSoft", u, 2.75, 0.222, 0.22, 0.05, 0.012, { uv: "keep" });
      f.box("emitWarmSoft", u, 2.69, 0.16, 0.26, 0.012, 0.1, { uv: "keep" });
      f.collider(u - 0.16, u + 0.16, 0, h, 0, 0.24, "pilaster");
    }
    for (let i = 0; i < N; i++) for (const o of [-1.65, 1.65]) f.box("impTrim", U(xb[i] - P / 2) + o, 1.5, 0.003, 0.025, 3.0, 0.006, { color: PALETTE.impBlack });
    // cabin doors; mats on the corridor floor in front of them
    for (let i = 0; i < N; i++) {
      const xc = xb[i] - P / 2;
      const open = s === OPEN.side && i === OPEN.i;
      const k = i + (s < 0 ? 0 : N);
      cabinDoor(f, U(xc), { open, w: open ? DW : 1.1, statusKey: open ? "emitGreen" : k % 3 === 1 ? "emitRedImp" : "emitGreen", number: NUMBERS[k % NUMBERS.length], accentKey });
      kit.boxMM("fabric", [xc - 0.7, 0.003, Math.min(zF - s * 0.2, zF - s * 0.95)], [xc + 0.7, 0.015, Math.max(zF - s * 0.2, zF - s * 0.95)], { color: new THREE.Color("#3a3d45"), texel: 2 });
      // low vent grille between the door and the pilaster (the wide open doorway leaves no room for it)
      if (open) continue;
      const gu = U(xc) + 1.25;
      f.box("impTrim", gu, 0.42, 0.02, 0.5, 0.3, 0.04, { color: PALETTE.impCharcoal });
      for (let j = 0; j < 4; j++) f.box("impMetal", gu, 0.32 + j * 0.07, 0.042, 0.4, 0.02, 0.01, { color: PALETTE.impGreyDark });
    }
    // vestibule slot (x 11.2 .. 15): the refresher door with its blinking lamp on the N side, the duty
    // roster with a bench under it on the S side
    const vu = U(13.1);
    if (s < 0) {
      cabinDoor(f, vu, { w: 1.0, h: 2.2, statusKey: "emitGreen", number: IMP_DECAL.glyphs3, accentKey, tag: "refresher" });
      blinkAt = f.pos(vu + 0.86, 1.155, 0.107);
      f.decal(IMP_DECAL.arrowRight, vu - 1.3, 2.4, 0.01, 0.34);
    } else {
      wallScreen(f, vu, 1.95, 1.6, 1.0, "scrAmber2", { accentKey, leds: 4 });
      f.decal(IMP_DECAL.glyphs2, vu + 1.3, 2.4, 0.01, 0.34);
      bench(kit, 13.1, CW - 0.36, 2.0, 0, { back: false, pad: "fabric", padColor: MATTRESS });
    }
  }
  if (blinkAt) {
    const blink = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.012), M.emitRedImp);
    blink.position.copy(blinkAt);
    kit.attach(blink);
    kit.onUpdate((dt, tt) => {
      blink.visible = Math.sin(tt * 2.2) > 0.6;
    });
  }

  // ---- bulkhead portals across the corridor at two cabin boundaries -----------------------------
  for (const x of [xb[3], xb[5]]) {
    for (const s of [-1, 1]) {
      kit.boxMM("impTrim", [x - 0.22, 0, Math.min(s * CW, s * (CW - 0.36))], [x + 0.22, h, Math.max(s * CW, s * (CW - 0.36))], { color: PALETTE.impBlack, texel: 1 });
      kit.boxMM("impMetal", [x - 0.24, 0, Math.min(s * CW, s * (CW - 0.4))], [x + 0.24, 0.16, Math.max(s * CW, s * (CW - 0.4))], { color: PALETTE.impCharcoal, texel: 1 });
      kit.box(accentKey, x, 1.2, s * (CW - 0.37) - s * 0.006, 0.05, 0.9, 0.012);
      kit.collider([x - 0.24, 0, Math.min(s * CW, s * (CW - 0.4))], [x + 0.24, h, Math.max(s * CW, s * (CW - 0.4))], "portal");
    }
    kit.boxMM("impTrim", [x - 0.22, 2.95, -CW], [x + 0.22, h, CW], { color: PALETTE.impBlack, texel: 1 });
    kit.boxMM("impMetalRough", [x - 0.26, 2.9, -CW + 0.36], [x + 0.26, 2.96, CW - 0.36], { color: PALETTE.impGreyDark, texel: 1 });
    for (const s of [-1, 1]) {
      kit.box("emitAmberDim", x + s * 0.226, 3.1, 0, 0.008, 0.03, 2 * CW - 0.9);
      kit.add("decalImp", new THREE.PlaneGeometry(0.34, 0.34).rotateY(s > 0 ? Math.PI / 2 : -Math.PI / 2), { pos: [x + s * 0.226, 3.32, 0], uv: "keep", uvRect: impDecalRect(IMP_DECAL.cog) });
    }
  }

  // ---- the open cabin -----------------------------------------------------------------------------
  {
    const zF = -CW - T; // inner face of the front
    const zB = -ZB + T; // inner face of the back wall
    const xW = openX0 + T; // inner face of the W side wall
    const xE = openX1 - T; // inner face of the E side wall
    const CH = 2.8; // cabin ceiling
    // side and back walls (panel plates with a base trim), cabin ceiling with a warm light box
    for (const [x0, x1] of [[openX0, xW], [xE, openX1]]) {
      kit.boxMM("impPanel1", [x0, 0, -ZB], [x1, CH + 0.12, zF], { color: panelColor, uv: "world", texel: 1 });
      kit.boxMM("impTrim", [Math.min(x0, x1) - 0.005, 0, -ZB], [Math.max(x0, x1) + 0.005, 0.12, zF], { color: PALETTE.impBlack, texel: 1 });
      kit.collider([x0, 0, -ZB], [x1, h, zF], "cabinwall");
    }
    kit.boxMM("impPanel1", [openX0, 0, -ZB], [openX1, CH + 0.12, zB], { color: panelColor, uv: "world", texel: 1 });
    kit.boxMM("impTrim", [openX0, 0, -ZB - 0.005], [openX1, 0.12, zB + 0.005], { color: PALETTE.impBlack, texel: 1 });
    kit.collider([openX0, 0, -ZB], [openX1, h, zB], "cabinwall");
    kit.boxMM("impMetalRough", [openX0, CH, -ZB], [openX1, CH + 0.12, zF], { color: PALETTE.impBlack, texel: 0.5 });
    kit.boxMM("impTrim", [xW, CH - 0.06, zB], [xE, CH, zF], { color: PALETTE.impBlack, texel: 1 });
    lightBox(kit, openC, -4.6, CH - 0.06, 1.3, 0.6, "emitWarmSoft", { slats: 4, accentKey });
    // threshold, rug
    kit.boxMM("impTrim", [openC - DW / 2, 0, zF - 0.02], [openC + DW / 2, 0.014, -CW + 0.02], { color: PALETTE.impBlack });
    kit.boxMM("fabric", [xW + 1.15, 0.002, zB + 0.5], [xE - 0.75, 0.014, zF - 0.55], { color: RUG, texel: 1.5 });
    // bunk along the W wall, head toward the doorway so the pillow shows through it from the corridor;
    // reading light and a framed emblem over the head, a kit locker beyond the foot
    bunk(kit, xW, -5.0, -2.9, accentKey);
    kit.box("impTrim", xW + 0.03, 1.0, -3.4, 0.06, 0.08, 0.6, { color: PALETTE.impBlack });
    kit.box("emitWarmSoft", xW + 0.062, 0.99, -3.4, 0.006, 0.03, 0.5);
    kit.box("impTrim", xW + 0.02, 1.7, -4.1, 0.04, 0.5, 0.5, { color: PALETTE.impBlack });
    kit.add("decalImp", new THREE.PlaneGeometry(0.34, 0.34).rotateY(Math.PI / 2), { pos: [xW + 0.045, 1.7, -4.1], uv: "keep", uvRect: impDecalRect(IMP_DECAL.cog) });
    kit.boxMM("impTrim", [xW + 0.1, 0, -5.9], [xW + 0.9, 0.46, -5.3], { color: PALETTE.impBlack, texel: 1 });
    kit.boxMM("impMetal", [xW + 0.14, 0.46, -5.86], [xW + 0.86, 0.5, -5.34], { color: PALETTE.impCharcoal });
    kit.box(accentKey, xW + 0.5, 0.3, -5.294, 0.5, 0.02, 0.012);
    kit.collider([xW + 0.1, 0, -5.9], [xW + 0.9, 0.5, -5.3], "footlocker");
    // desk against the E wall with a terminal above it, a chair, keyboard slab, datapad, desk lamp
    const dx = xE - 0.42;
    const dz = -4.9;
    table(kit, dx, dz, 0.8, 1.5, 0, { h: 0.74, accentKey });
    chairInstance(kit, dx - 0.95, dz, -Math.PI / 2, { padColor: MATTRESS });
    const fE = wallFrame(kit, [xE, -ZB], [xE, zF]).frame; // faces -x, u = z + ZB
    wallScreen(fE, dz + ZB, 1.42, 0.8, 0.5, "scrAmber1", { accentKey, leds: 2 });
    fE.box("impTrim", dz + ZB, 1.08, 0.04, 0.5, 0.08, 0.08, { color: PALETTE.impBlack });
    kit.box("impGloss", dx - 0.1, 0.752, dz + 0.1, 0.42, 0.012, 0.18);
    for (let k = 0; k < 4; k++) kit.box(k === 2 ? accentKey : "emitWhite", dx - 0.24 + k * 0.09, 0.76, dz + 0.1, 0.05, 0.006, 0.05);
    kit.box("impGloss", dx + 0.02, 0.752, dz - 0.5, 0.2, 0.012, 0.26);
    kit.box("scrBlue0", dx + 0.02, 0.759, dz - 0.5, 0.16, 0.002, 0.2, { uv: "keep" });
    kit.cyl("impMetal", dx + 0.1, 0.96, dz + 0.55, 0.012, 0.42, "y", { color: PALETTE.impGreyDark, segments: 8 });
    kit.box("impTrim", dx - 0.02, 1.18, dz + 0.5, 0.26, 0.05, 0.14, { color: PALETTE.impBlack });
    kit.box("emitWarmSoft", dx - 0.02, 1.152, dz + 0.5, 0.2, 0.01, 0.1, { uv: "keep" });
    // two-door wardrobe on the back wall (E part), shelf of personal effects over the bunk head
    const fB = wallFrame(kit, [openX0, zB], [openX1, zB]).frame; // faces +z, u = x - openX0
    locker(fB, xE - 0.72 - openX0, 1.3, 2.2, { doors: 2, accentKey, color: PALETTE.impGrey, decal: IMP_DECAL.glyphs1, depth: 0.55 });
    const fig = shelf(kit, ctx, fB, xW + 0.72 - openX0, 1.5, { accentKey, holo: true });
    fB.decal(IMP_DECAL.glyphs2, xW + 0.72 - openX0, 2.3, 0.01, 0.3);
    // boots and a kit bag by the wardrobe, a cup on the desk
    kit.boxMM("impTrim", [xE - 1.75, 0, zB + 0.05], [xE - 1.45, 0.42, zB + 0.45], { color: PALETTE.impBlack, texel: 1 });
    kit.boxMM("impMetal", [xE - 1.73, 0.42, zB + 0.08], [xE - 1.47, 0.46, zB + 0.42], { color: PALETTE.impGreyDark });
    kit.collider([xE - 1.75, 0, zB + 0.05], [xE - 1.45, 0.46, zB + 0.45], "kitbag");
    kit.cyl("impMetal", dx - 0.2, 0.79, dz - 0.15, 0.04, 0.08, "y", { color: PALETTE.impGrey, segments: 10 });
    if (fig) {
      kit.onUpdate((dt) => {
        fig.rotation.y += dt * 0.8;
      });
    }
    // warm key inside the cabin
    kit.light({ type: "point", pos: [openC, CH - 0.3, -4.7], color: 0xffd6b0, intensity: lux(CH - 0.3, 3.4), distance: 9, priority: 0.5 });
  }

  // ---- end walls: the W wall closes the walk (roster screen between two sconces), decals by the door
  const W = walls.W.frame;
  wallScreen(W, hz, 1.9, 1.8, 1.1, "scrAmber2", { accentKey, leds: 4 });
  for (const s of [-1, 1]) impWallLight(W, hz + s * 1.6, 2.5, { key: "emitWarmSoft", w: 0.7 });
  W.decal(IMP_DECAL.cog, hz, 3.0, 0.034, 0.4);
  const E = walls.E.frame; // u = z + hz
  E.decal(IMP_DECAL.glyphs2, hz - 1.85, 2.3, 0.034, 0.4);
  E.decal(IMP_DECAL.glyphs3, hz + 1.85, 2.3, 0.034, 0.4);

  // ---- lights: one warm point under each ceiling slot crossing, one at the W end wall -------------
  for (const x of [12, 6, 0, -6, -12]) kit.light({ type: "point", pos: [x, h - 0.5, 0], color: 0xffe2c4, intensity: lux(h - 0.5, 3.4), distance: 11, priority: 0.45 - Math.abs(x) * 0.002 });
  kit.light({ type: "point", pos: [-14.0, 2.6, 0], color: 0xffe2c4, intensity: lux(2.6, 1.6), distance: 7, priority: 0.36 });
}

/**
 * Bunk against a wall face at x = xf, running along z from the aisle end zA to the head end zB
 * (0.95 m wide, 0.72 m to the blanket): dark frame with two drawers on the open side, grey mattress,
 * grey blanket over the foot two-thirds with a folded hem, pillow and a head panel at the far end.
 */
function bunk(kit, xf, zA, zB, accentKey) {
  const x0 = xf + 0.06;
  const x1 = x0 + 0.95;
  const lo = Math.min(zA, zB);
  const hi = Math.max(zA, zB);
  const headHi = zB > zA; // head at the hi end
  const len = hi - lo;
  const cx = (x0 + x1) / 2;
  kit.boxMM("impMetal", [x0 + 0.06, 0, lo], [x1 - 0.06, 0.12, hi], { color: PALETTE.impCharcoal, texel: 1 });
  kit.boxMM("impTrim", [x0, 0.1, lo], [x1, 0.5, hi], { color: PALETTE.impBlack, texel: 1 });
  // drawer fronts on the open (E) side
  for (let i = 0; i < 2; i++) {
    const z0 = lo + 0.12 + i * ((len - 0.24) / 2) + 0.03;
    const z1 = z0 + (len - 0.24) / 2 - 0.06;
    kit.boxMM("impPanel1", [x1, 0.16, z0], [x1 + 0.02, 0.44, z1], { color: PALETTE.impGreyDark, uv: "world", texel: 1 });
    kit.box("impMetal", x1 + 0.035, 0.3, (z0 + z1) / 2, 0.03, 0.03, 0.3, { color: PALETTE.impGrey });
  }
  kit.box(accentKey, x1 + 0.006, 0.13, (lo + hi) / 2, 0.012, 0.02, len - 0.3);
  // mattress, blanket over the foot two-thirds (folded hem toward the pillow, drop over the open side)
  kit.boxMM("fabric", [x0 + 0.03, 0.5, lo + 0.03], [x1 - 0.03, 0.66, hi - 0.03], { color: MATTRESS, texel: 2 });
  const fLo = headHi ? lo + 0.02 : lo + 0.75;
  const fHi = headHi ? hi - 0.75 : hi - 0.02;
  const hem = headHi ? fHi : fLo;
  kit.boxMM("fabric", [x0 - 0.02, 0.66, fLo], [x1 + 0.02, 0.72, fHi], { color: BLANKET, texel: 2 });
  kit.boxMM("fabric", [x0 - 0.03, 0.6, hem - 0.05], [x1 + 0.03, 0.73, hem + 0.05], { color: BLANKET, texel: 2 });
  kit.boxMM("fabric", [x1 - 0.02, 0.3, fLo], [x1 + 0.03, 0.66, fHi], { color: BLANKET, texel: 2 });
  kit.box("fabric", cx, 0.72, headHi ? hi - 0.4 : lo + 0.4, 0.42, 0.12, 0.55, { color: PILLOW, texel: 2 });
  // head panel
  const hz0 = headHi ? hi : lo - 0.06;
  kit.boxMM("impTrim", [x0 - 0.02, 0.5, hz0], [x1 + 0.02, 1.0, hz0 + 0.06], { color: PALETTE.impBlack, texel: 1 });
  kit.collider([x0, 0, lo - 0.06], [x1 + 0.04, 0.75, hi + 0.06], "bunk");
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
