// Officers' Quarters (Deck B): six sleeping bays off one central aisle (three along the N wall, three
// along the S wall), separated by 1.2 m dividers. Each bay holds a bunk (dark frame, grey blanket)
// with a reading light along its W divider, a fold-down desk with a small screen past the bunk's foot,
// a table corner, and along the back wall a refresher booth, a locker, a shelf of personal effects
// over a footlocker; a bay number on every divider post and at the threshold. The E end by the door
// is a short vestibule with the duty roster and a coat rail. Warm accent (#d7b98c): amber trim
// lights, warm-white bunk and wall lights, dark rugs.
import * as THREE from "three";
import { PALETTE, setDomain } from "../materials.js";
import { impRoomShell, wallFrame, impWallLight, lux } from "./imperial_kit.js";
import { IMP_DECAL, impDecalRect } from "../textures_imperial.js";
import { bench, wallScreen, locker, fakeDoor, chairInstance, holoFigure, propFrame, floorDecal, roundTable } from "./deck_b_props.js";

const RUG = new THREE.Color("#2a2d34");
const MATTRESS = new THREE.Color("#4a4f5a");
const BLANKET = new THREE.Color("#6d7178");
const PILLOW = new THREE.Color("#8a8f98");
const DIV_H = 1.2; // half-height dividers: the bunks and desks stay visible over them from the aisle

export function buildOfficersQuarters(kit, ctx, room) {
  const [w, h, d] = room.size;
  const hx = w / 2;
  const hz = d / 2;
  const accentKey = ctx.accentKey ? ctx.accentKey(room) : "emitAmber";
  if (!ctx.materials.oq_warmDim) {
    // recessed ceiling slots at the dim white slots' level but in the deck's warm-white
    const m = ctx.materials.emitWarmSoft.clone();
    m.emissiveIntensity = 0.85;
    ctx.materials.oq_warmDim = setDomain(m, "interior");
  }
  const walls = impRoomShell(kit, room, ctx.doors, {
    seed: 5203,
    accentKey,
    wall: { panelW: 1.6, features: { vent: 0.05, equipment: 0.04, conduit: 0.03, light: 0.08, screen: 0.02 }, altChance: 0.25 },
    floor: { lane: false },
    // one fixture temperature: warm-white recessed slots, matching the bunk and wall lights
    ceiling: { troughs: 2, troughW: 0.5, beamStep: 3.0, lightKey: "oq_warmDim" },
  });

  // --- bay layout: dividers at these x (the W wall closes the first bay), vestibule east of the last.
  // Each bay is read from the aisle, so the bunk and the desk sit in its front third along the W
  // divider (visible over the 1.2 m partitions from the walk); the refresher booth, the locker and the
  // shelf line the back wall; a table corner on the E side.
  const divX = [-6.5, 2.0, 10.5];
  const bayX = [-hx, ...divX];
  const AISLE = 1.6; // aisle half-width: the bays' open fronts are at z = ±1.6
  let holo = null;
  let idx = 0;
  for (const s of [-1, 1]) {
    const back = s * hz; // back wall z
    const front = s * AISLE;
    const t = (tt) => back - s * tt; // z at depth tt from the back wall
    const a = (aa) => s * (AISLE + aa); // z at distance aa in from the aisle line
    const backFrame = s < 0 ? walls.N.frame : walls.S.frame;
    const bu = (x) => (s < 0 ? x + hx : hx - x); // wall-u for a room x on the back wall
    // half-height dividers from the back wall to the aisle line
    for (const x of divX) divider(kit, x, back, front, { accentKey, label: idx + (s < 0 ? 0 : 3) });
    for (let i = 0; i < 3; i++) {
      const x0 = bayX[i];
      const x1 = bayX[i + 1];
      const cx = (x0 + x1) / 2;
      const bayNo = idx++;
      const wf = x0 + (i === 0 ? 0.12 : 0.13); // W divider (or W wall) face
      // bunk along the W divider from the aisle in, head at the far end, reading light on the divider
      bunk(kit, wf, a(0.4), a(2.5), accentKey);
      kit.box("impTrim", wf + 0.03, 1.0, a(2.1), 0.06, 0.08, 0.6, { color: PALETTE.impBlack });
      kit.box("emitWarmSoft", wf + 0.062, 0.99, a(2.1), 0.006, 0.03, 0.5);
      // fold-down desk past the bunk's foot on the same divider, chair facing it, small screen above
      const dz = a(3.75);
      foldDesk(kit, wf, dz, s < 0 ? "scrAmber0" : "scrAmber1", accentKey);
      chairInstance(kit, wf + 1.0, dz, Math.PI / 2);
      // table corner on the E side of the bay's front: a low round table and two chairs
      const tx = x1 - 2.2;
      const tz = a(1.9);
      roundTable(kit, tx, tz, 0.5, { h: 0.72, accentKey });
      chairInstance(kit, tx - 0.95, tz, Math.PI / 2, { padColor: MATTRESS });
      chairInstance(kit, tx, tz + s * 0.95, s < 0 ? 0 : Math.PI, { padColor: MATTRESS });
      // refresher booth in the back corner on the E side: a full-height closed cubicle with a door
      booth(kit, x1 - 2.5, x1 - 0.2, back, s, accentKey, bayNo);
      // locker beside the booth; shelf of personal effects and a warm wall light over a footlocker
      locker(backFrame, bu(x1 - 3.0), 0.9, 2.1, { accentKey, color: PALETTE.impGrey, decal: IMP_DECAL.glyphs1, doors: 1 });
      impWallLight(backFrame, bu(x0 + 2.2), 1.95, { key: "emitWarmSoft", w: 0.9 });
      backFrame.decal(IMP_DECAL.glyphs2, bu(x0 + 0.75), 2.35, 0.034, 0.3);
      kit.boxMM("impTrim", [x0 + 1.8, 0, Math.min(t(0.1), t(0.7))], [x0 + 2.6, 0.48, Math.max(t(0.1), t(0.7))], { color: PALETTE.impBlack, texel: 1 });
      kit.boxMM("impMetal", [x0 + 1.85, 0.48, Math.min(t(0.14), t(0.66))], [x0 + 2.55, 0.52, Math.max(t(0.14), t(0.66))], { color: PALETTE.impCharcoal });
      kit.box(accentKey, x0 + 2.2, 0.3, t(0.7) - s * 0.006, 0.5, 0.02, 0.012);
      kit.collider([x0 + 1.8, 0, Math.min(t(0.1), t(0.7))], [x0 + 2.6, 0.52, Math.max(t(0.1), t(0.7))], "footlocker");
      const fig = shelf(kit, ctx, backFrame, bu(x0 + 2.2), 1.35, { accentKey, holo: bayNo === 4 });
      if (fig) holo = fig;
      // kit bag and a pair of crates by the locker
      kit.boxMM("impTrim", [x1 - 4.4, 0, Math.min(t(0.15), t(0.75))], [x1 - 3.7, 0.5, Math.max(t(0.15), t(0.75))], { color: PALETTE.impBlack, texel: 1 });
      kit.boxMM("impMetal", [x1 - 4.35, 0.5, Math.min(t(0.2), t(0.7))], [x1 - 3.75, 0.9, Math.max(t(0.2), t(0.7))], { color: PALETTE.impGreyDark, texel: 1 });
      kit.collider([x1 - 4.4, 0, Math.min(t(0.15), t(0.75))], [x1 - 3.7, 0.9, Math.max(t(0.15), t(0.75))], "crates");
      // rug under the front third, bay number on the floor at the aisle threshold
      kit.boxMM("fabric", [x0 + 1.5, 0.002, Math.min(a(0.5), a(4.9))], [x1 - 0.5, 0.014, Math.max(a(0.5), a(4.9))], { color: RUG, texel: 1.5 });
      kit.boxMM("impTrim", [x0 + 0.3, 0.001, front - 0.05], [x1 - 0.3, 0.012, front + 0.05], { color: PALETTE.impBlack });
      floorDecal(kit, [IMP_DECAL.bay01, IMP_DECAL.bay02, IMP_DECAL.bay03][i], cx, front - s * 0.9, 0.8, s < 0 ? Math.PI / 2 : -Math.PI / 2, 0.014);
      // one warm key per bay over the front third, low enough to model the bunk, the desk and the table
      kit.light({ type: "point", pos: [cx, h - 0.8, a(2.6)], color: 0xffd6b0, intensity: lux(h - 0.8, 4.2), distance: 13, priority: 0.4 - bayNo * 0.005 });
    }
  }
  if (holo) {
    kit.onUpdate((dt) => {
      holo.rotation.y += dt * 0.8;
    });
  }

  // --- aisle: no centre strip; the dividers' end posts carry the amber bay lamps and the rugs frame it.
  // The W end wall closes the walk with the duty roster between two warm wall lights.
  const W = walls.W.frame;
  wallScreen(W, hz, 1.8, 1.6, 1.0, "scrAmber2", { accentKey, leds: 4 });
  for (const s of [-1, 1]) impWallLight(W, hz + s * 1.5, 2.3, { key: "emitWarmSoft", w: 0.7 });
  // --- vestibule (x 10.5..15): duty roster and coat rail on the E wall beside the door, bench, notice
  const E = walls.E.frame; // u = z + hz
  wallScreen(E, hz - 3.6, 1.75, 1.4, 0.9, "scrAmber1", { accentKey, leds: 3 });
  E.box("impTrim", hz + 3.4, 1.7, 0.06, 1.6, 0.08, 0.1, { color: PALETTE.impBlack });
  for (let i = 0; i < 4; i++) E.box("impMetal", hz + 2.8 + i * 0.4, 1.6, 0.1, 0.05, 0.16, 0.16, { color: PALETTE.impGrey });
  E.decal(IMP_DECAL.glyphs2, hz + 3.4, 2.2, 0.034, 0.5);
  bench(kit, 12.8, -hz + 0.55, 2.2, Math.PI, { back: false, pad: "fabric", padColor: MATTRESS });
  bench(kit, 12.8, hz - 0.55, 2.2, 0, { back: false, pad: "fabric", padColor: MATTRESS });
  const refresher = fakeDoor(walls.N.frame, hx + 12.8, 1.2, 2.4, { accentKey, statusKey: "emitGreen", label: IMP_DECAL.glyphs3 });
  const blink = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.012), ctx.materials.emitRedImp);
  blink.position.copy(refresher).add(new THREE.Vector3(0, -0.08, 0.004));
  kit.attach(blink);
  kit.onUpdate((dt, tt) => {
    blink.visible = Math.sin(tt * 2.2) > 0.6;
  });

  // --- lights: vestibule key and the W end of the aisle (warm-white, matching the bunk lights); the
  // aisle's middle is lit by the six bay keys' spill
  // (the vestibule key sits over the door side so the divider caps are lit at a glancing angle, not
  // as specular hot spots)
  kit.light({ type: "point", pos: [13.7, h - 0.7, 0], color: 0xffe2c4, intensity: lux(h - 0.7, 3.0), distance: 13, priority: 0.45 });
  kit.light({ type: "point", pos: [-10.5, h - 0.7, 0], color: 0xffe2c4, intensity: lux(h - 0.7, 3.0), distance: 15, priority: 0.42 });
}

/**
 * Half-height divider along z at x from the back wall (zA) to the aisle line (zB): black frame, grey
 * panel faces, metal cap, an end post with a bay lamp and a bay number decal on both faces.
 */
function divider(kit, x, zA, zB, opts = {}) {
  const { accentKey = "emitAmber", label = 0 } = opts;
  const lo = Math.min(zA, zB);
  const hi = Math.max(zA, zB);
  const t = 0.12;
  kit.boxMM("impTrim", [x - t, 0, lo], [x + t, DIV_H, hi], { color: PALETTE.impBlack, texel: 1 });
  kit.boxMM("impMetal", [x - t - 0.02, 0, lo], [x + t + 0.02, 0.12, hi], { color: PALETTE.impCharcoal, texel: 1 });
  kit.boxMM("impMetal", [x - t - 0.03, DIV_H - 0.05, lo], [x + t + 0.03, DIV_H, hi], { color: PALETTE.impCharcoal, texel: 1 });
  // panel faces split into 1.6 m plates
  const n = Math.max(1, Math.round((hi - lo) / 1.6));
  for (let i = 0; i < n; i++) {
    const z0 = lo + ((hi - lo) * i) / n + 0.04;
    const z1 = lo + ((hi - lo) * (i + 1)) / n - 0.04;
    for (const s of [-1, 1]) kit.boxMM("impPanel1", [Math.min(x + s * (t + 0.001), x + s * (t + 0.03)), 0.16, z0], [Math.max(x + s * (t + 0.001), x + s * (t + 0.03)), DIV_H - 0.1, z1], { color: i % 2 ? PALETTE.impGrey : PALETTE.impWhite, uv: "world", texel: 1 });
  }
  // end post at the aisle
  const out = zB > zA ? 1 : -1;
  kit.box("impTrim", x, DIV_H / 2 + 0.05, zB, 2 * t + 0.16, DIV_H + 0.1, 0.3, { color: PALETTE.impBlack, texel: 1 });
  kit.box("impMetalRough", x, DIV_H + 0.12, zB, 2 * t + 0.1, 0.04, 0.24, { color: PALETTE.impGreyDark });
  kit.box(accentKey, x, DIV_H - 0.2, zB + out * 0.156, 0.14, 0.03, 0.012);
  for (const s of [-1, 1]) {
    const g = new THREE.PlaneGeometry(0.26, 0.26);
    if (s < 0) g.rotateY(Math.PI);
    kit.add("decalImp", g, { pos: [x + s * (t + 0.081), 0.66, zB], uv: "keep", uvRect: impDecalRect([IMP_DECAL.bay01, IMP_DECAL.bay02, IMP_DECAL.bay03, IMP_DECAL.glyphs1, IMP_DECAL.glyphs2, IMP_DECAL.glyphs3][label % 6]) });
  }
  kit.collider([x - t - 0.08, 0, lo], [x + t + 0.08, DIV_H + 0.1, hi + 0.15 * (out > 0 ? 1 : 0)], "divider");
}

/** Refresher booth: closed cubicle x0..x1 against the back wall (2.2 m deep), 2.5 m tall, door facing the bay. */
function booth(kit, x0, x1, back, s, accentKey, bayNo) {
  const D = 2.2;
  const H = 2.5;
  const zIn = back - s * D; // door face z
  const lo = Math.min(back, zIn);
  const hi = Math.max(back, zIn);
  kit.boxMM("impTrim", [x0, 0, lo], [x1, H, hi], { color: PALETTE.impBlack, texel: 1 });
  kit.boxMM("impMetal", [x0 - 0.02, H, lo - 0.02], [x1 + 0.02, H + 0.1, hi + 0.02], { color: PALETTE.impCharcoal, texel: 1 });
  // panelled outer faces (W face into the bay, door face toward the aisle)
  const wf = wallFrame(kit, [x0 - 0.001, s < 0 ? lo : hi], [x0 - 0.001, s < 0 ? hi : lo]);
  wf.frame.box("impPanel2", (hi - lo) / 2, H / 2 + 0.1, 0.03, hi - lo - 0.2, H - 0.5, 0.05, { color: PALETTE.impGrey, uv: "world", texel: 1 });
  const dfz = s < 0 ? hi + 0.001 : lo - 0.001;
  const df = s < 0 ? wallFrame(kit, [x0, dfz], [x1, dfz]) : wallFrame(kit, [x1, dfz], [x0, dfz]);
  const cu = (x1 - x0) / 2;
  df.frame.box("impPanel1", cu, H / 2 + 0.1, 0.03, x1 - x0 - 0.2, H - 0.5, 0.05, { color: PALETTE.impGrey, uv: "world", texel: 1 });
  fakeDoor(df.frame, cu, 0.9, 2.0, { accentKey, statusKey: bayNo % 2 ? "emitGreen" : "emitRedImp", label: IMP_DECAL.glyphs3 });
  // vent grille on the door face's upper corner
  df.frame.box("impTrim", cu + 0.7, H - 0.45, 0.06, 0.5, 0.3, 0.04, { color: PALETTE.impCharcoal });
  for (let k = 0; k < 4; k++) df.frame.box("impMetal", cu + 0.7, H - 0.55 + k * 0.07, 0.08, 0.4, 0.02, 0.03, { color: PALETTE.impGreyDark });
  kit.collider([x0, 0, lo], [x1, H + 0.1, hi], "booth");
}

/**
 * Bunk against a divider's E face at x = xf, running along z from the aisle end zA to the head end zB
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

/** Fold-down desk on a divider face at x (face plane), long along z, with a small screen on the divider above it. */
function foldDesk(kit, x, z, screenKey, accentKey) {
  const f = propFrame(kit, x, 0, z, 0);
  // hinged leaf (0.5 deep) on two brackets, a drawer box underneath at the wall
  f.box("impMetal", 0.27, 0.74, 0, 0.54, 0.05, 1.3, { color: PALETTE.impCharcoal, texel: 1 });
  f.box("impGloss", 0.29, 0.768, -0.1, 0.42, 0.012, 0.9);
  for (const zz of [-0.55, 0.55]) f.box("impTrim", 0.2, 0.68, zz, 0.36, 0.06, 0.05, { color: PALETTE.impBlack });
  f.box("impTrim", 0.1, 0.42, 0.45, 0.2, 0.4, 0.34, { color: PALETTE.impBlack, texel: 1 });
  f.box("impMetal", 0.21, 0.5, 0.45, 0.02, 0.04, 0.18, { color: PALETTE.impGrey });
  // small screen on a bracket against the divider, facing the chair (+x)
  f.box("impTrim", 0.06, 1.1, -0.1, 0.1, 0.32, 0.5, { color: PALETTE.impBlack });
  f.box("impGloss", 0.115, 1.1, -0.1, 0.012, 0.28, 0.44);
  const g = new THREE.PlaneGeometry(0.4, 0.24);
  g.rotateY(Math.PI / 2);
  kit.add(screenKey, g, { pos: [x + 0.125, 1.1, z - 0.1], uv: "keep" });
  f.box(accentKey, 0.115, 0.92, -0.1, 0.012, 0.02, 0.36);
  // datapad and a cup
  f.box("impGloss", 0.3, 0.776, 0.35, 0.16, 0.012, 0.22);
  kit.cyl("impMetal", x + 0.34, 0.81, z - 0.5, 0.04, 0.08, "y", { color: PALETTE.impGrey, segments: 10 });
  kit.collider([x, 0, z - 0.65], [x + 0.56, 0.8, z + 0.65], "desk");
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
