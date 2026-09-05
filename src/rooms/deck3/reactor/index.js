// Deck 3 reactor chamber: an 88 m vertical volume around the main reactor column. The player walks a
// ring catwalk at y 12 (8 m wide), four radial bridges lead to the core service platform, and the pit
// below drops to y 4. The column is a stack of containment segments with slotted energy channels
// (pulsing), four coolant spines and radial struts to the walls; the pit holds pumps, ring conduits
// and floodlights; the catwalk is lined with consoles, valve stations, cabinets and racks. Amber /
// orange, heavy machinery, deep vertical volume (§11).
import * as THREE from "three";
import { defineRoom } from "../../deck2/_shared/room.js";
import { IMP, col } from "../../deck2/_shared/palette.js";
import { rail, WALL_T } from "../../deck2/_shared/shell.js";
import { console as consoleProp, pipe, cabinet, floorLine, hazardStrip, indicatorField, placer } from "../../deck2/_shared/props.js";
import { REACTOR_WINDOW } from "../engctl/index.js";
import { TAU, ring, strut, valveStation, toolRack, monitorPedestal, wallLamp, portalArch, cableTray, junctionBox, ventGrille, labelCrate } from "../engctl/engprops.js";
import { animKey, faceKey, MODE, buildAnimatedEmitters, anim } from "../engctl/anim.js";

const Y = 12;
const PIT_Y = 4;
const CEIL = 100;
const CZ = 651.25; // chamber centre
const CORE_R = 9;
const PLAT_R = 13;
const WALK = 8; // catwalk ring width
const X0 = -36 + WALL_T;
const X1 = 36 - WALL_T;
const Z0 = 612.5 + WALL_T;
const Z1 = 690 - WALL_T;
const IX0 = X0 + WALK;
const IX1 = X1 - WALK;
const IZ0 = Z0 + WALK;
const IZ1 = Z1 - WALK;
const BW = 3.0; // bridge width
// core lamp standards on the platform edge: one per quadrant, 18° past the diagonal so they clear the
// monitor pedestals (on the diagonals) and land between two edge posts
const LAMP_ANGLES = [0, 1, 2, 3].map((k) => (k * Math.PI) / 2 + Math.PI / 4 + 0.32);
const LAMP_R = 14.0; // the amber points' radius (inside the heads, 1.4 m out from the platform edge)
const LAMP_Y = 12 + 5.0;

export default defineRoom({
  id: "d3-reactor",
  name: "Reactor Chamber",
  deck: 3,
  x: [-36, 36],
  z: [612.5, 690],
  y0: PIT_Y,
  ceil: CEIL,
  openings: [{ face: "n", ...REACTOR_WINDOW, glass: true, id: "reactor-engctl-window" }],
  spawn: { pos: [6.5, Y, 616], yaw: 180 },
  views: {
    "d3-reactor-entry": { pos: [6.5, Y, 616.5], yaw: 170, pitch: 14 },
    "d3-reactor-core": { pos: [-28.6, Y, 645], yaw: -75, pitch: 16 },
    "d3-reactor-bridge": { pos: [0, Y, 683.5], yaw: 0, pitch: 10 },
    "d3-reactor-pit": { pos: [-12, Y, 620.2], yaw: -155, pitch: -20 },
    "d3-reactor-engctl-door": { pos: [2.6, Y, 617.9], yaw: 6, pitch: 9 },
  },
  shell: {
    panelW: 3.2,
    rows: [0, 0.4, 2.05, 2.27, 6, 12, 20, 30, 42, 56, 70, 84, 87.45, 88],
    wallColor: IMP.impMid,
    wallAlt: IMP.impDark,
    stripMat: "emitAmber",
    floor: false,
    ceiling: { channels: 0, color: IMP.impBlack, panelW: 6 },
    lights: false,
    doorDressing: { accent: "emitAmber" },
  },
  detail(ctx, shell, room) {
    const { kit, PALETTE } = ctx;
    const P = (k) => col(PALETTE, k);
    const black = P("impBlack");
    const dark = P("impDark");
    const mid = P("impMid");
    const steel = P("steel");
    const SLATE = new THREE.Color(0x46494f);
    let seed = 300;
    // Animated emitters (one extra mesh, see engctl/anim.js): the core's white-hot channel centres and
    // the pit collar pulse together (PULSE), two energy bands sweep round the column (SWEEP), the ring
    // ledge markers chase upward (CHASE) and one hooded pit lamp flickers (FLICKER). The kit's static
    // emitWhite / emitAmber / emitOrange pieces are folded into the same mesh (re-capped, see the end of
    // detail()), so the room sits at 14 calls.
    // Emitter cap (critic pass 3: the slot cells and the collar clipped to flat white with bloom in
    // five frames): the rig's ACES puts a channel of 1.0 at 89 % and blooms above 1.15 luminance, so
    // the pulse peaks (× 1.135) are held at white 1.08, orange 1.13 (red channel; its luminance stays
    // ~0.6, no bloom), amber 1.02. The three layers still grade hot centre → orange → amber by
    // geometry; the core's light on the room comes from the descriptors, not from these faces.
    const WHITE = new THREE.Color("#dfe9ff");
    const AMBER = IMP.impAmber;
    const ORANGE = IMP.engOrange;
    const PULSE_WHITE = animKey(MODE.PULSE, { base: 0.95 });
    const PULSE_AMBER = animKey(MODE.PULSE, { base: 0.9 });
    const PULSE_ORANGE = animKey(MODE.PULSE, { base: 1.0 });
    // housed lamp faces: steady, diffuser gradient (centre 0.92 → 86 %), tinted per lamp
    const FACE = faceKey(0.92);

    // Deck tints. The rig lights rooms with their own fixtures only (the captured environment of a dark
    // chamber is nearly black), and the shared deck map is charcoal (mean albedo 0.13 with 9 % metal), so
    // an impMid deck reflects ~1 % of the light that reaches it and read as black in every view. The
    // walkable decks are two steps lighter (0x7a7e86: 2.3 % albedo), and the bridge plates under the
    // grating bars impGrey — with the fixtures below they sit at 20–30 % grey in the pools and fall off
    // to charcoal between them. The pit floor 8 m below takes the same tint as the decks (policy B: one
    // step lighter than the 0x6a6e76 it had): it is the bottom band of the core view and the pit view,
    // 72 × 77 m lit by three collar points and the shaft light, and at one step darker it sat at 11–15 %
    // outside the collar pools.
    const DECK = 0x7a7e86;
    const PIT_DECK = 0x7a7e86;
    // ---- pit floor, pit walls with ribs, hazard edges, trays ---------------------------------------
    kit.boxMM("impFloor", [X0, PIT_Y, Z0], [X1, PIT_Y + 0.5, Z1], { color: PIT_DECK, texel: 0.5 });
    kit.boxMM("paintedMetal", [-36, PIT_Y, 612.5], [36, Y, Z0], { color: dark, texel: 2.5 });
    kit.boxMM("paintedMetal", [-36, PIT_Y, Z1], [36, Y, 690], { color: dark, texel: 2.5 });
    kit.boxMM("paintedMetal", [-36, PIT_Y, Z0], [X0, Y, Z1], { color: dark, texel: 2.5 });
    kit.boxMM("paintedMetal", [X1, PIT_Y, Z0], [36, Y, Z1], { color: dark, texel: 2.5 });
    for (const y of [PIT_Y + 2.2, PIT_Y + 5.2]) {
      kit.boxMM("paintedMetal", [X0, y, Z0 + 0.45], [X0 + 0.45, y + 0.35, Z1 - 0.45], { color: black });
      kit.boxMM("paintedMetal", [X1 - 0.45, y, Z0 + 0.45], [X1, y + 0.35, Z1 - 0.45], { color: black });
      kit.boxMM("paintedMetal", [X0, y, Z0], [X1, y + 0.35, Z0 + 0.45], { color: black });
      kit.boxMM("paintedMetal", [X0, y, Z1 - 0.45], [X1, y + 0.35, Z1], { color: black });
    }
    hazardStrip(kit, [X0, Z0], [X1, Z0 + 0.7], PIT_Y + 0.505);
    hazardStrip(kit, [X0, Z1 - 0.7], [X1, Z1], PIT_Y + 0.505);
    hazardStrip(kit, [X0, Z0 + 0.7], [X0 + 0.7, Z1 - 0.7], PIT_Y + 0.505);
    hazardStrip(kit, [X1 - 0.7, Z0 + 0.7], [X1, Z1 - 0.7], PIT_Y + 0.505);
    cableTray(kit, PALETTE, [X0 + 0.5, PIT_Y + 3.6, Z0 + 1], [X0 + 0.5, PIT_Y + 3.6, Z1 - 1], { w: 0.7 });
    cableTray(kit, PALETTE, [X1 - 0.5, PIT_Y + 3.6, Z0 + 1], [X1 - 0.5, PIT_Y + 3.6, Z1 - 1], { w: 0.7 });
    cableTray(kit, PALETTE, [X0 + 1, PIT_Y + 3.6, Z0 + 0.5], [X1 - 1, PIT_Y + 3.6, Z0 + 0.5], { w: 0.7 });
    cableTray(kit, PALETTE, [X0 + 1, PIT_Y + 3.6, Z1 - 0.5], [X1 - 1, PIT_Y + 3.6, Z1 - 0.5], { w: 0.7 });
    for (let i = 0; i < 6; i++) {
      const t = (i + 0.5) / 6;
      junctionBox(kit, PALETTE, [X0, PIT_Y + 1.2, Z0 + (Z1 - Z0) * t], Math.PI / 2, { seed: seed++, w: 0.7, h: 0.8 });
      junctionBox(kit, PALETTE, [X1, PIT_Y + 1.2, Z0 + (Z1 - Z0) * t], -Math.PI / 2, { seed: seed++, w: 0.7, h: 0.8 });
      ventGrille(kit, PALETTE, [X0 + (X1 - X0) * t, PIT_Y + 1.5, Z0], 0, { w: 1.6, h: 0.7 });
      ventGrille(kit, PALETTE, [X0 + (X1 - X0) * t, PIT_Y + 1.5, Z1], Math.PI, { w: 1.6, h: 0.7 });
    }

    // ---- lower service ring, ring conduits, pumps, floodlights -------------------------------------
    kit.cyl("impFloor", 0, PIT_Y + 0.65, CZ, 16, 0.3, "y", { color: mid, segments: 40, texel: 0.5 });
    kit.cyl("paintedMetal", 0, PIT_Y + 0.95, CZ, 16.05, 0.3, "y", { color: black, segments: 40, open: true });
    for (const [r, y] of [[11.3, PIT_Y + 1.7], [12.6, PIT_Y + 2.7]]) {
      // matte painted steel: polished `metal` here mirrored the collar's hot line as white streaks
      ring(kit, "paintedMetal", [0, y, CZ], r, 0.36, "y", { color: steel, tubular: 48, texel: 2.5 });
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * TAU + Math.PI / 8;
        kit.box("paintedMetal", Math.cos(a) * r, (PIT_Y + 0.8 + y) / 2, CZ + Math.sin(a) * r, 0.5, y - PIT_Y - 0.8, 0.5, { color: black, rot: [0, -a, 0] });
        kit.box("paintedMetal", Math.cos(a) * r, y, CZ + Math.sin(a) * r, 0.6, 0.9, 0.6, { color: dark, rot: [0, -a, 0] });
      }
    }
    const toCentre = (a) => Math.atan2(-Math.cos(a), -Math.sin(a));
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * TAU + Math.PI / 12;
      const r = 20.5;
      pumpBlock(kit, PALETTE, [Math.cos(a) * r, PIT_Y + 0.5, CZ + Math.sin(a) * r], toCentre(a), seed++, k % 3);
      pipe(kit, PALETTE, [Math.cos(a) * 18.9, PIT_Y + 1.6, CZ + Math.sin(a) * 18.9], [Math.cos(a) * 12.7, PIT_Y + 2.7, CZ + Math.sin(a) * 12.7], 0.26, { bracket: 3, color: steel });
    }
    // lit core base: black collar (y 4.5..7.7) with an amber/orange emission band and a pulsing
    // white-hot centre line at 6.75..7.45 — above the two ring conduits, which hide anything lower on
    // the collar from the catwalk — plus glow slots near the deck, a hazard ring on the service deck
    // and eight coolant feed pipes radiating from the collar to the deck edge
    // (the whole collar — amber band, orange band, white line and the deck slots — breathes with the core)
    kit.cyl("paintedMetal", 0, PIT_Y + 1.6, CZ, 10.4, 3.2, "y", { color: black, segments: 40, texel: 2.5 });
    kit.cyl(PULSE_AMBER, 0, PIT_Y + 3.1, CZ, 10.46, 0.7, "y", { segments: 40, open: true, color: AMBER });
    kit.cyl(PULSE_ORANGE, 0, PIT_Y + 3.1, CZ, 10.49, 0.34, "y", { segments: 40, open: true, color: ORANGE });
    kit.cyl(PULSE_WHITE, 0, PIT_Y + 3.1, CZ, 10.53, 0.1, "y", { segments: 40, open: true, color: WHITE });
    kit.cyl("paintedMetal", 0, PIT_Y + 3.6, CZ, 10.6, 0.3, "y", { color: dark, segments: 40, texel: 2.5 });
    kit.cyl("paintedMetal", 0, PIT_Y + 2.55, CZ, 10.6, 0.3, "y", { color: dark, segments: 40, texel: 2.5 });
    kit.cyl("paintedMetal", 0, PIT_Y + 0.6, CZ, 10.7, 0.3, "y", { color: dark, segments: 40, texel: 2.5 });
    for (let k = 0; k < 24; k++) {
      if (k % 6 === 3) continue; // coolant spines stand here
      const a = (k / 24) * TAU;
      kit.box(k % 2 ? PULSE_AMBER : PULSE_ORANGE, Math.cos(a) * 10.44, PIT_Y + 1.05, CZ + Math.sin(a) * 10.44, 0.5, 0.22, 0.1, { rot: [0, Math.PI / 2 - a, 0], color: k % 2 ? AMBER : ORANGE });
    }
    kit.add("hazard", new THREE.RingGeometry(10.85, 11.55, 64), { pos: [0, PIT_Y + 0.958, CZ], rot: [-Math.PI / 2, 0, 0], texel: 2 });
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * TAU + (10 * Math.PI) / 180;
      const ux = Math.cos(a);
      const uz = Math.sin(a);
      const py = PIT_Y + 1.08;
      pipe(kit, PALETTE, [ux * 10.5, py, CZ + uz * 10.5], [ux * 15.7, py, CZ + uz * 15.7], 0.22, { bracket: 2, color: steel, segments: 10 });
      kit.cyl("paintedMetal", ux * 10.75, py, CZ + uz * 10.75, 0.34, 0.3, "x", { color: black, segments: 12, rot: [0, -a, Math.PI / 2] });
      kit.cyl("metal", ux * 15.7, py - 0.1, CZ + uz * 15.7, 0.22, 0.26, "y", { color: steel, segments: 10 });
      kit.cyl("paintedMetal", ux * 15.7, PIT_Y + 1.0, CZ + uz * 15.7, 0.3, 0.12, "y", { color: black, segments: 12 });
    }
    // corner heat exchangers with trunk lines into the outer ring conduit
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * TAU + Math.PI / 4;
      const r = 30;
      exchanger(kit, PALETTE, [Math.cos(a) * r, PIT_Y + 0.5, CZ + Math.sin(a) * r], toCentre(a), seed++);
      pipe(kit, PALETTE, [Math.cos(a) * 26.8, PIT_Y + 2.4, CZ + Math.sin(a) * 26.8], [Math.cos(a) * 12.8, PIT_Y + 2.7, CZ + Math.sin(a) * 12.8], 0.32, { bracket: 4, color: dark, mat: "paintedMetal" });
    }
    // radial floor cable trays from the service ring outward, floodlights aimed at the column
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * TAU + Math.PI / 8;
      const r0 = 16.4;
      const r1 = 31;
      const rm = (r0 + r1) / 2;
      kit.box("paintedMetal", Math.cos(a) * rm, PIT_Y + 0.58, CZ + Math.sin(a) * rm, r1 - r0, 0.16, 0.6, { color: black, rot: [0, -a, 0], texel: 2.5 });
      kit.box("paintedMetal", Math.cos(a) * rm, PIT_Y + 0.62, CZ + Math.sin(a) * rm, r1 - r0 - 0.4, 0.1, 0.44, { color: mid, rot: [0, -a, 0], texel: 2.5 });
    }
    // housed pit lamps high on the pit walls (hooded faces aimed down, hidden from the catwalk). The
    // east head at CZ − 8 is the faulty one: its face flickers (animated mesh) with a point light in its
    // hood doing the same (see the light list) — it is the pit lamp the pit view looks at.
    const FLICKER_SEED = 0.61;
    const FLICKER_KEY = animKey(MODE.FLICKER, { phase: FLICKER_SEED, base: 0.95, map: true });
    for (const z of [CZ - 24, CZ - 8, CZ + 8, CZ + 24]) {
      wallLamp(kit, PALETTE, [X0, PIT_Y + 6.2, z], Math.PI / 2, { w: 1.1, tilt: 0.75, mat: FACE, faceColor: WHITE });
      wallLamp(kit, PALETTE, [X1, PIT_Y + 6.2, z], -Math.PI / 2, { w: 1.1, tilt: 0.75, mat: z === CZ - 8 ? FLICKER_KEY : FACE, faceColor: WHITE });
    }
    for (const x of [-24, -8, 8, 24]) {
      wallLamp(kit, PALETTE, [x, PIT_Y + 6.2, Z0], 0, { w: 1.1, tilt: 0.75, mat: FACE, faceColor: WHITE });
      wallLamp(kit, PALETTE, [x, PIT_Y + 6.2, Z1], Math.PI, { w: 1.1, tilt: 0.75, mat: FACE, faceColor: WHITE });
    }
    // amber service-lane ring and hazard kerb around the pumps' lane
    kit.add("emitAmber", new THREE.RingGeometry(23.1, 23.3, 64), { pos: [0, PIT_Y + 0.508, CZ], rot: [-Math.PI / 2, 0, 0] });
    kit.add("emitAmber", new THREE.RingGeometry(16.6, 16.75, 64), { pos: [0, PIT_Y + 0.508, CZ], rot: [-Math.PI / 2, 0, 0] });

    // catwalk supports: pillars + beams under the ring's inner edge, props under the bridges, braces
    // from the column under the core platform (nothing walkable floats)
    const supportCol = (x, z, size = 0.6) => kit.boxMM("paintedMetal", [x - size / 2, PIT_Y + 0.5, z - size / 2], [x + size / 2, Y - 0.5, z + size / 2], { color: dark, texel: 2.5 });
    for (let z = IZ0 + 1.5; z < IZ1; z += 9.5) {
      if (Math.abs(z - CZ) < 3) continue;
      supportCol(IX0 + 0.45, z);
      supportCol(IX1 - 0.45, z);
    }
    for (let x = IX0 + 1.5; x < IX1; x += 9.5) {
      if (Math.abs(x) < 3) continue;
      supportCol(x, IZ0 + 0.45);
      supportCol(x, IZ1 - 0.45);
    }
    kit.boxMM("paintedMetal", [IX0, Y - 1.1, IZ0], [IX0 + 0.9, Y - 0.5, IZ1], { color: black, texel: 2.5 });
    kit.boxMM("paintedMetal", [IX1 - 0.9, Y - 1.1, IZ0], [IX1, Y - 0.5, IZ1], { color: black, texel: 2.5 });
    kit.boxMM("paintedMetal", [IX0 + 0.9, Y - 1.1, IZ0], [IX1 - 0.9, Y - 0.5, IZ0 + 0.9], { color: black, texel: 2.5 });
    kit.boxMM("paintedMetal", [IX0 + 0.9, Y - 1.1, IZ1 - 0.9], [IX1 - 0.9, Y - 0.5, IZ1], { color: black, texel: 2.5 });
    supportCol(20.3, CZ, 0.8);
    supportCol(-20.3, CZ, 0.8);
    supportCol(0, CZ + 20.3, 0.8);
    supportCol(0, CZ - 20.3, 0.8);
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * TAU + Math.PI / 8;
      strut(kit, "paintedMetal", [Math.cos(a) * 9.2, Y - 3.6, CZ + Math.sin(a) * 9.2], [Math.cos(a) * 12.4, Y - 0.6, CZ + Math.sin(a) * 12.4], 0.35, 0.35, { color: black });
    }

    // ---- ring catwalk, inner rails, bridges, core platform -----------------------------------------
    const deck = (a, b) => kit.boxMM("impFloor", [a[0], Y - 0.5, a[1]], [b[0], Y, b[1]], { color: DECK, texel: 0.5 });
    deck([X0, Z0], [X1, IZ0]);
    deck([X0, IZ1], [X1, Z1]);
    deck([X0, IZ0], [IX0, IZ1]);
    deck([IX1, IZ0], [X1, IZ1]);
    // deck edge fascia + amber edge line
    kit.boxMM("paintedMetal", [IX0, Y - 0.5, IZ0], [IX1, Y - 0.35, IZ0 + 0.06], { color: black });
    kit.boxMM("paintedMetal", [IX0, Y - 0.5, IZ1 - 0.06], [IX1, Y - 0.35, IZ1], { color: black });
    kit.boxMM("paintedMetal", [IX0, Y - 0.5, IZ0], [IX0 + 0.06, Y - 0.35, IZ1], { color: black });
    kit.boxMM("paintedMetal", [IX1 - 0.06, Y - 0.5, IZ0], [IX1, Y - 0.35, IZ1], { color: black });
    const edge = 0.4;
    floorLine(kit, [IX0 + edge, Y, IZ0 + edge], [-BW / 2 - 0.9, Y, IZ0 + edge]);
    floorLine(kit, [BW / 2 + 0.9, Y, IZ0 + edge], [IX1 - edge, Y, IZ0 + edge]);
    floorLine(kit, [IX0 + edge, Y, IZ1 - edge], [-BW / 2 - 0.9, Y, IZ1 - edge]);
    floorLine(kit, [BW / 2 + 0.9, Y, IZ1 - edge], [IX1 - edge, Y, IZ1 - edge]);
    floorLine(kit, [IX0 + edge, Y, IZ0 + edge], [IX0 + edge, Y, CZ - BW / 2 - 0.9]);
    floorLine(kit, [IX0 + edge, Y, CZ + BW / 2 + 0.9], [IX0 + edge, Y, IZ1 - edge]);
    floorLine(kit, [IX1 - edge, Y, IZ0 + edge], [IX1 - edge, Y, CZ - BW / 2 - 0.9]);
    floorLine(kit, [IX1 - edge, Y, CZ + BW / 2 + 0.9], [IX1 - edge, Y, IZ1 - edge]);
    // inner-edge rails, broken where the bridges land
    rail(kit, PALETTE, [IX0, Y, IZ0], [-BW / 2, Y, IZ0], Y);
    rail(kit, PALETTE, [BW / 2, Y, IZ0], [IX1, Y, IZ0], Y);
    rail(kit, PALETTE, [IX0, Y, IZ1], [-BW / 2, Y, IZ1], Y);
    rail(kit, PALETTE, [BW / 2, Y, IZ1], [IX1, Y, IZ1], Y);
    rail(kit, PALETTE, [IX0, Y, IZ0], [IX0, Y, CZ - BW / 2], Y);
    rail(kit, PALETTE, [IX0, Y, CZ + BW / 2], [IX0, Y, IZ1], Y);
    rail(kit, PALETTE, [IX1, Y, IZ0], [IX1, Y, CZ - BW / 2], Y);
    rail(kit, PALETTE, [IX1, Y, CZ + BW / 2], [IX1, Y, IZ1], Y);

    // radial bridges with under-trusses, rails, portal arches at the ring landings
    // bridge: dark deck read as grating (steel cross-bars every 0.5 m over a black base), amber edge
    // strips, under-trusses
    const bridge = (a, b) => {
      // (base plate impGrey: it is what shows between the bars, and the shadow key's pool and the rail
      // shadows need an albedo — the bars themselves are bare metal and only reflect)
      kit.boxMM("impFloor", [a[0], Y - 0.5, a[1]], [b[0], Y - 0.02, b[1]], { color: IMP.impGrey, texel: 0.5 });
      const alongX = b[0] - a[0] > b[1] - a[1];
      if (alongX) {
        for (const s of [-1, 1]) kit.boxMM("paintedMetal", [a[0], Y - 1.1, CZ + s * (BW / 2 - 0.2) - 0.1], [b[0], Y - 0.5, CZ + s * (BW / 2 - 0.2) + 0.1], { color: black, texel: 2.5 });
        for (let x = a[0] + 2; x < b[0] - 1; x += 4) kit.boxMM("paintedMetal", [x, Y - 1.1, CZ - BW / 2 + 0.1], [x + 0.2, Y - 0.5, CZ + BW / 2 - 0.1], { color: black });
        for (let x = a[0] + 0.3; x < b[0] - 0.1; x += 0.6) kit.boxMM("metal", [x - 0.03, Y - 0.02, CZ - BW / 2 + 0.25], [x + 0.03, Y, CZ + BW / 2 - 0.25], { color: mid });
        for (const s of [-1, 1]) {
          kit.boxMM("paintedMetal", [a[0], Y - 0.02, CZ + s * (BW / 2 - 0.12) - 0.12], [b[0], Y, CZ + s * (BW / 2 - 0.12) + 0.12], { color: dark });
          kit.boxMM("emitAmber", [a[0] + 0.3, Y, CZ + s * (BW / 2 - 0.12) - 0.03], [b[0] - 0.3, Y + 0.006, CZ + s * (BW / 2 - 0.12) + 0.03]);
        }
      } else {
        for (const s of [-1, 1]) kit.boxMM("paintedMetal", [s * (BW / 2 - 0.2) - 0.1, Y - 1.1, a[1]], [s * (BW / 2 - 0.2) + 0.1, Y - 0.5, b[1]], { color: black, texel: 2.5 });
        for (let z = a[1] + 2; z < b[1] - 1; z += 4) kit.boxMM("paintedMetal", [-BW / 2 + 0.1, Y - 1.1, z], [BW / 2 - 0.1, Y - 0.5, z + 0.2], { color: black });
        for (let z = a[1] + 0.3; z < b[1] - 0.1; z += 0.6) kit.boxMM("metal", [-BW / 2 + 0.25, Y - 0.02, z - 0.03], [BW / 2 - 0.25, Y, z + 0.03], { color: mid });
        for (const s of [-1, 1]) {
          kit.boxMM("paintedMetal", [s * (BW / 2 - 0.12) - 0.12, Y - 0.02, a[1]], [s * (BW / 2 - 0.12) + 0.12, Y, b[1]], { color: dark });
          kit.boxMM("emitAmber", [s * (BW / 2 - 0.12) - 0.03, Y, a[1] + 0.3], [s * (BW / 2 - 0.12) + 0.03, Y + 0.006, b[1] - 0.3]);
        }
      }
    };
    bridge([PLAT_R - 0.5, CZ - BW / 2], [IX1, CZ + BW / 2]);
    bridge([IX0, CZ - BW / 2], [-PLAT_R + 0.5, CZ + BW / 2]);
    bridge([-BW / 2, PLAT_R - 0.5 + CZ], [BW / 2, IZ1]);
    bridge([-BW / 2, IZ0], [BW / 2, CZ - PLAT_R + 0.5]);
    for (const s of [-1, 1]) {
      rail(kit, PALETTE, [PLAT_R, Y, CZ + (s * BW) / 2], [IX1, Y, CZ + (s * BW) / 2], Y);
      rail(kit, PALETTE, [IX0, Y, CZ + (s * BW) / 2], [-PLAT_R, Y, CZ + (s * BW) / 2], Y);
      rail(kit, PALETTE, [(s * BW) / 2, Y, CZ + PLAT_R], [(s * BW) / 2, Y, IZ1], Y);
      rail(kit, PALETTE, [(s * BW) / 2, Y, IZ0], [(s * BW) / 2, Y, CZ - PLAT_R], Y);
    }
    // (each gantry carries a hooded floodlight aimed down its bridge; the amber pool lights sit under them)
    // The entry gantry is the heavy crane: an 8 m span whose flood head hangs at x −2.9, west of the
    // bridge rails, so it can be the room's shadow key (rails and posts cast across the grating).
    // (post strips and beam strips are emitAmber, re-capped to 0.9 in the animated mesh; the flood
    // heads carry diffuser faces — the bridge camera stands 2 m from the aft arch's posts)
    const archOpts = { lampMat: FACE, lampColor: AMBER };
    portalArch(kit, PALETTE, [IX0 + 0.45, Y, CZ], Math.PI / 2, { lamp: 1, ...archOpts });
    portalArch(kit, PALETTE, [IX1 - 0.45, Y, CZ], Math.PI / 2, { lamp: -1, ...archOpts });
    portalArch(kit, PALETTE, [0, Y, IZ0 + 0.45], 0, { lamp: 1, span: 8, trolley: 0.42, ...archOpts });
    portalArch(kit, PALETTE, [0, Y, IZ1 - 0.45], 0, { lamp: -1, ...archOpts });
    // core lamp standards: four 5 m masts on the platform edge between the bridges, each with a hooded
    // amber head on an arm reaching 1.4 m out over the pit. They are the fixtures of the four amber
    // points that ring the core (r 14, y 17 — inside the heads, see the light list): the pools on the
    // platform, the drum's lower band and the pit deck below all come from them. (They replace the
    // three column-flood masts, whose small heads with a point 0.4 m in front read as flares.)
    for (const a of LAMP_ANGLES) lampStandard(kit, PALETTE, [Math.cos(a) * (PLAT_R - 0.4), Y, CZ + Math.sin(a) * (PLAT_R - 0.4)], a, FACE, AMBER);

    // core platform ring with edge posts, kerb, hatches and monitor pedestals
    kit.cyl("impFloor", 0, Y - 0.25, CZ, PLAT_R, 0.5, "y", { color: DECK, segments: 48, texel: 0.5 });
    kit.cyl("paintedMetal", 0, Y - 0.42, CZ, PLAT_R + 0.03, 0.16, "y", { color: black, segments: 48, open: true });
    kit.cyl("paintedMetal", 0, Y + 0.15, CZ, CORE_R + 0.35, 0.3, "y", { color: black, segments: 32 });
    const n = 16;
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * TAU;
      const a1 = ((i + 1) / n) * TAU;
      const am = (a0 + a1) / 2;
      if (Math.abs(Math.sin(am)) < 0.2 || Math.abs(Math.cos(am)) < 0.2) continue; // bridge landings
      const p0 = [Math.cos(a0) * PLAT_R, Y, CZ + Math.sin(a0) * PLAT_R];
      const p1 = [Math.cos(a1) * PLAT_R, Y, CZ + Math.sin(a1) * PLAT_R];
      const len = Math.hypot(p1[0] - p0[0], p1[2] - p0[2]);
      const rot = [0, -Math.atan2(p1[2] - p0[2], p1[0] - p0[0]), Math.PI / 2];
      kit.cyl("metal", (p0[0] + p1[0]) / 2, Y + 1.02, (p0[2] + p1[2]) / 2, 0.03, len, "x", { color: steel, segments: 8, rot });
      kit.cyl("metal", (p0[0] + p1[0]) / 2, Y + 0.56, (p0[2] + p1[2]) / 2, 0.018, len, "x", { color: dark, segments: 8, rot });
      kit.box("paintedMetal", p0[0], Y + 0.51, p0[2], 0.06, 1.02, 0.06, { color: dark });
      kit.box("paintedMetal", p1[0], Y + 0.51, p1[2], 0.06, 1.02, 0.06, { color: dark });
    }
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * TAU + Math.PI / 4;
      const r = 11.6;
      monitorPedestal(kit, PALETTE, [Math.cos(a) * r, Y, CZ + Math.sin(a) * r], Math.atan2(Math.cos(a), Math.sin(a)), { screenMat: "screenImp2" });
      const ha = (k / 4) * TAU + Math.PI / 4 + Math.PI / 8;
      kit.box("paintedMetal", Math.cos(ha) * 10.4, Y + 0.03, CZ + Math.sin(ha) * 10.4, 1.4, 0.05, 1.0, { color: black, rot: [0, -ha, 0] });
      kit.box("emitAmber", Math.cos(ha) * 10.4, Y + 0.06, CZ + Math.sin(ha) * 10.4, 1.2, 0.01, 0.06, { rot: [0, -ha, 0] });
    }
    kit.collider([-CORE_R - 0.4, Y, CZ - CORE_R - 0.4], [CORE_R + 0.4, Y + 3, CZ + CORE_R + 0.4], "core");

    // ---- the column: stacked containment segments, slotted energy channels, spines, struts, collar --
    // Energy channels: layered emissive core behind deep slotted grilles — amber rim (full band),
    // orange mid band, and a pulsing white-hot centre band on its own cloned material.
    let y = PIT_Y + 0.5;
    const CHANNELS = new Set([3, 8, 13]);
    for (let i = 0; i < 16; i++) {
      if (CHANNELS.has(i)) {
        const h = 4.0;
        // gradient by geometry: wide amber rim, orange mid band, narrow white-hot centre (capped ~1.9)
        kit.cyl("emitAmber", 0, y + h / 2, CZ, 8.8, h - 0.3, "y", { segments: 32, open: true });
        kit.cyl("emitOrange", 0, y + h / 2, CZ, 8.84, 1.5, "y", { segments: 32, open: true });
        kit.cyl(PULSE_WHITE, 0, y + h / 2, CZ, 8.88, 0.45, "y", { segments: 32, open: true, color: WHITE });
        const ns = 36;
        for (let k = 0; k < ns; k++) {
          const a = (k / ns) * TAU;
          // (matte impPanel, not paintedMetal: a bar's side face mirrors the band behind it at grazing
          // Fresnel, and the worn map's 0.4 roughness put two bloomed crescents on the bar the bridge
          // camera sees edge-on — the "post lamp at 20 m" of the critic's bridge line)
          kit.box("impPanel", Math.cos(a) * 9.2, y + h / 2, CZ + Math.sin(a) * 9.2, 0.7, h - 0.5, 0.56, { color: black, rot: [0, Math.PI / 2 - a, 0], texel: 0.25 });
        }
        kit.cyl("paintedMetal", 0, y + 0.2, CZ, 9.5, 0.4, "y", { color: black, segments: 32, texel: 2.5 });
        kit.cyl("paintedMetal", 0, y + h - 0.2, CZ, 9.5, 0.4, "y", { color: black, segments: 32, texel: 2.5 });
        y += h;
      } else {
        const h = 5.7;
        const wide = i % 2 === 1;
        const r = wide ? 9.6 : 9.0;
        kit.cyl("paintedMetal", 0, y + h / 2, CZ, r, h, "y", { color: wide ? dark : mid, segments: 32, texel: 2.5 });
        if (wide) {
          for (let k = 0; k < 8; k++) {
            const a = (k / 8) * TAU;
            kit.box("paintedMetal", Math.cos(a) * 9.55, y + h / 2, CZ + Math.sin(a) * 9.55, 0.7, h - 0.6, 0.3, { color: black, rot: [0, Math.PI / 2 - a, 0] });
          }
        } else if (i > 0) {
          // (segment 0's band would sit inside the core-base collar)
          kit.cyl("emitAmber", 0, y + h / 2, CZ, r + 0.07, 0.12, "y", { segments: 32, open: true });
          kit.cyl("paintedMetal", 0, y + h / 2, CZ, r + 0.03, 0.4, "y", { color: black, segments: 32, open: true });
        }
        y += h;
      }
      kit.cyl("paintedMetal", 0, y + 0.15, CZ, 9.85, 0.3, "y", { color: black, segments: 32 });
      // energy bands: thin orange rings on the cap rings between the slots (after segments 5 and 10), a
      // hot head sweeping slowly round the column with a fading tail — clockwise at 20 s per turn at y ≈ 39,
      // counter-clockwise at 29 s per turn at y ≈ 67 (SWEEP: the fragment's angle about the axis is its phase)
      if (i === 5 || i === 10) {
        // (SWEEP peaks at 1.52 × base: 0.7 keeps the head's red channel at 1.06)
        const sweep = animKey(MODE.SWEEP, { base: 0.7, rate: i === 5 ? 0.05 : -0.035, aux: [0, 0, CZ] });
        kit.cyl(sweep, 0, y + 0.15, CZ, 9.93, 0.2, "y", { segments: 48, open: true, color: ORANGE });
        kit.cyl("paintedMetal", 0, y + 0.3, CZ, 9.97, 0.06, "y", { color: black, segments: 48, open: true });
        kit.cyl("paintedMetal", 0, y, CZ, 9.97, 0.06, "y", { color: black, segments: 48, open: true });
      }
      y += 0.3;
    }
    // glowing top collar and ceiling socket
    kit.cyl("paintedMetal", 0, y + 1.0, CZ, 10.2, 2.0, "y", { color: dark, segments: 32, texel: 2.5 });
    kit.cyl("emitAmber", 0, y + 1.0, CZ, 10.3, 0.5, "y", { segments: 32, open: true });
    kit.cyl("emitWhite", 0, y + 1.0, CZ, 10.34, 0.12, "y", { segments: 32, open: true });
    kit.cyl("paintedMetal", 0, y + 2.4, CZ, 9.2, 0.8, "y", { color: black, segments: 32, texel: 2.5 });
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * TAU;
      kit.box("paintedMetal", Math.cos(a) * 10.4, y + 1.6, CZ + Math.sin(a) * 10.4, 1.0, 2.6, 0.5, { color: black, rot: [0, Math.PI / 2 - a, 0] });
    }
    kit.cyl("paintedMetal", 0, (y + 2.8 + CEIL) / 2, CZ, 11, CEIL - y - 2.8, "y", { color: black, segments: 32 });
    const collarY = y + 1.0;
    // coolant spines at 45° with clamps and column ties
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * TAU + Math.PI / 4;
      const r = 10.5;
      const sx = Math.cos(a) * r;
      const sz = CZ + Math.sin(a) * r;
      // Matte impPanel in a dark slate (0x46494f, between impDark and impMid), not steel-tinted
      // paintedMetal: the spine's inner face stands 9.9 m from the 4400 cd shaft point and takes 45 lx at
      // y 40 — light steel (35 % tint × the worn map) rendered that as a clipped white rod up every
      // frame's column, and the worn map's 0.4-roughness patches added glossy crescents. At 3.3 %
      // albedo the same face peaks at ~55 % grey mid-height and fades to 15 % at the catwalk, and the
      // outer face under the lamp standards' 14 lx sits at ~33 %: a pipe lit by the core, not a strip.
      kit.cyl("impPanel", sx, (PIT_Y + 0.5 + collarY) / 2, sz, 0.6, collarY - PIT_Y - 0.5, "y", { color: SLATE, segments: 14, texel: 2.5 });
      for (let cy = PIT_Y + 4.6; cy < collarY - 1; cy += 9) {
        kit.cyl("paintedMetal", sx, cy, sz, 0.78, 0.5, "y", { color: black, segments: 14 });
        kit.box("paintedMetal", Math.cos(a) * 9.9, cy, CZ + Math.sin(a) * 9.9, 0.5, 0.4, 1.2, { color: black, rot: [0, Math.PI / 2 - a, 0] });
      }
      kit.collider([sx - 0.75, Y, sz - 0.75], [sx + 0.75, Y + 3, sz + 0.75], "spine");
    }
    // radial struts to the walls at y 35 and y 65
    for (const sy of [35, 65]) {
      const flange = (min, max) => kit.boxMM("paintedMetal", min, max, { color: black, texel: 2.5 });
      const glow = (a, b) => kit.boxMM("emitOrange", a, b);
      kit.boxMM("paintedMetal", [9.4, sy - 0.75, CZ - 0.75], [X1 + 0.05, sy + 0.75, CZ + 0.75], { color: dark, texel: 2.5 });
      kit.boxMM("paintedMetal", [X0 - 0.05, sy - 0.75, CZ - 0.75], [-9.4, sy + 0.75, CZ + 0.75], { color: dark, texel: 2.5 });
      kit.boxMM("paintedMetal", [-0.75, sy - 0.75, CZ + 9.4], [0.75, sy + 0.75, Z1 + 0.05], { color: dark, texel: 2.5 });
      kit.boxMM("paintedMetal", [-0.75, sy - 0.75, Z0 - 0.05], [0.75, sy + 0.75, CZ - 9.4], { color: dark, texel: 2.5 });
      flange([9.4, sy - 1.15, CZ - 1.15], [10.1, sy + 1.15, CZ + 1.15]);
      flange([-10.1, sy - 1.15, CZ - 1.15], [-9.4, sy + 1.15, CZ + 1.15]);
      flange([-1.15, sy - 1.15, CZ + 9.4], [1.15, sy + 1.15, CZ + 10.1]);
      flange([-1.15, sy - 1.15, CZ - 10.1], [1.15, sy + 1.15, CZ - 9.4]);
      flange([X1 - 0.7, sy - 1.15, CZ - 1.15], [X1, sy + 1.15, CZ + 1.15]);
      flange([X0, sy - 1.15, CZ - 1.15], [X0 + 0.7, sy + 1.15, CZ + 1.15]);
      flange([-1.15, sy - 1.15, Z1 - 0.7], [1.15, sy + 1.15, Z1]);
      flange([-1.15, sy - 1.15, Z0], [1.15, sy + 1.15, Z0 + 0.7]);
      glow([10.2, sy - 0.79, CZ - 0.05], [X1 - 0.8, sy - 0.75, CZ + 0.05]);
      glow([X0 + 0.8, sy - 0.79, CZ - 0.05], [-10.2, sy - 0.75, CZ + 0.05]);
      glow([-0.05, sy - 0.79, CZ + 10.2], [0.05, sy - 0.75, Z1 - 0.8]);
      glow([-0.05, sy - 0.79, Z0 + 0.8], [0.05, sy - 0.75, CZ - 10.2]);
    }
    // ---- walls: vertical pipes, conduit bands, ring ledges at y 40 / 70 -----------------------------
    const pipeTop = collarY - 2;
    for (const z of [624.5, 638, 664.5, 678]) {
      pipe(kit, PALETTE, [X0 + 0.35, Y + 0.3, z], [X0 + 0.35, pipeTop, z], 0.15, { bracket: 12, color: steel });
      pipe(kit, PALETTE, [X1 - 0.35, Y + 0.3, z], [X1 - 0.35, pipeTop, z], 0.15, { bracket: 12, color: steel });
    }
    for (const x of [-34.6, 14, 22, 34.6]) pipe(kit, PALETTE, [x, Y + 0.3, Z0 + 0.35], [x, pipeTop, Z0 + 0.35], 0.15, { bracket: 12, color: steel });
    for (const x of [-32, -18, -8, 8, 18, 32]) pipe(kit, PALETTE, [x, Y + 0.3, Z1 - 0.35], [x, pipeTop, Z1 - 0.35], 0.15, { bracket: 12, color: steel });
    // (two conduit bands, not three: with the ledges below they were part of the "wireframe" of
    // dashed lines the critic read up the shaft)
    for (const by of [20, 62]) {
      kit.boxMM("paintedMetal", [X0 + 0.05, by - 0.25, Z0 + 0.6], [X0 + 0.55, by + 0.25, Z1 - 0.6], { color: black, texel: 2.5 });
      kit.boxMM("paintedMetal", [X1 - 0.55, by - 0.25, Z0 + 0.6], [X1 - 0.05, by + 0.25, Z1 - 0.6], { color: black, texel: 2.5 });
      kit.boxMM("paintedMetal", [X0, by - 0.25, Z0 + 0.05], [X1, by + 0.25, Z0 + 0.55], { color: black, texel: 2.5 });
      kit.boxMM("paintedMetal", [X0, by - 0.25, Z1 - 0.55], [X1, by + 0.25, Z1 - 0.05], { color: black, texel: 2.5 });
      kit.boxMM("emitAmber", [X0 + 0.56, by - 0.03, Z0 + 1.5], [X0 + 0.58, by + 0.03, Z1 - 1.5]);
      kit.boxMM("emitAmber", [X1 - 0.58, by - 0.03, Z0 + 1.5], [X1 - 0.56, by + 0.03, Z1 - 1.5]);
      kit.boxMM("emitAmber", [X0 + 1.5, by - 0.03, Z0 + 0.56], [X1 - 1.5, by + 0.03, Z0 + 0.58]);
      kit.boxMM("emitAmber", [X0 + 1.5, by - 0.03, Z1 - 0.58], [X1 - 1.5, by + 0.03, Z1 - 0.56]);
    }
    // ring walkways receding up the shaft (y 30 / 55 / 80): ledge, fascia, edge line, rail, and marker
    // lamps on the fascia (amber / white alternating per ring) so the 88 m reads. Three rings (not
    // five), markers every 18 m (not 9) at 1.2 m wide and capped at 0.8 (critic pass 3: ~60 dashed
    // lines read as wireframe — half as many, bigger and dimmer); the ledge faces are impMid so the
    // core's light on their undersides shows them as slabs, not lines.
    // The markers chase upward: one ring at a time lights hot and fades (CHASE, phase = ring index, one
    // sweep up the shaft every 9 s), so the eye is led up the 88 m.
    for (const [ri, ly] of [30, 55, 80].entries()) {
      const L = 1.5;
      const lampCol = ri % 2 ? WHITE : AMBER;
      const lamp = animKey(MODE.CHASE, { phase: ri / 3, base: ri % 2 ? 0.75 : 0.8, rate: 1 / 9 });
      kit.boxMM("impFloor", [X0, ly - 0.4, Z0], [X1, ly, Z0 + L], { color: mid, texel: 0.5 });
      kit.boxMM("impFloor", [X0, ly - 0.4, Z1 - L], [X1, ly, Z1], { color: mid, texel: 0.5 });
      kit.boxMM("impFloor", [X0, ly - 0.4, Z0 + L], [X0 + L, ly, Z1 - L], { color: mid, texel: 0.5 });
      kit.boxMM("impFloor", [X1 - L, ly - 0.4, Z0 + L], [X1, ly, Z1 - L], { color: mid, texel: 0.5 });
      kit.boxMM("paintedMetal", [X0 + L, ly - 0.75, Z0 + L], [X0 + L + 0.04, ly, Z1 - L], { color: black });
      kit.boxMM("paintedMetal", [X1 - L - 0.04, ly - 0.75, Z0 + L], [X1 - L, ly, Z1 - L], { color: black });
      kit.boxMM("paintedMetal", [X0 + L, ly - 0.75, Z0 + L], [X1 - L, ly, Z0 + L + 0.04], { color: black });
      kit.boxMM("paintedMetal", [X0 + L, ly - 0.75, Z1 - L - 0.04], [X1 - L, ly, Z1 - L], { color: black });
      kit.boxMM("emitAmber", [X0 + L + 0.04, ly - 0.3, Z0 + L], [X0 + L + 0.06, ly - 0.24, Z1 - L]);
      kit.boxMM("emitAmber", [X1 - L - 0.06, ly - 0.3, Z0 + L], [X1 - L - 0.04, ly - 0.24, Z1 - L]);
      kit.boxMM("emitAmber", [X0 + L, ly - 0.3, Z0 + L + 0.04], [X1 - L, ly - 0.24, Z0 + L + 0.06]);
      kit.boxMM("emitAmber", [X0 + L, ly - 0.3, Z1 - L - 0.06], [X1 - L, ly - 0.24, Z1 - L - 0.04]);
      for (let z = Z0 + L + 5; z < Z1 - L - 3; z += 18) {
        kit.box(lamp, X0 + L + 0.07, ly - 0.56, z, 0.02, 0.2, 1.2, { color: lampCol });
        kit.box(lamp, X1 - L - 0.07, ly - 0.56, z, 0.02, 0.2, 1.2, { color: lampCol });
      }
      for (let x = X0 + L + 5; x < X1 - L - 3; x += 18) {
        kit.box(lamp, x, ly - 0.56, Z0 + L + 0.07, 1.2, 0.2, 0.02, { color: lampCol });
        kit.box(lamp, x, ly - 0.56, Z1 - L - 0.07, 1.2, 0.2, 0.02, { color: lampCol });
      }
      rail(kit, PALETTE, [X0 + L - 0.06, ly, Z0 + L], [X0 + L - 0.06, ly, Z1 - L], ly, { post: 4.8 });
      rail(kit, PALETTE, [X1 - L + 0.06, ly, Z0 + L], [X1 - L + 0.06, ly, Z1 - L], ly, { post: 4.8 });
      rail(kit, PALETTE, [X0 + L, ly, Z0 + L - 0.06], [X1 - L, ly, Z0 + L - 0.06], ly, { post: 4.8 });
      rail(kit, PALETTE, [X0 + L, ly, Z1 - L + 0.06], [X1 - L, ly, Z1 - L + 0.06], ly, { post: 4.8 });
      // corner light masts on the ledge
      for (const [cx, cz] of [[X0 + 0.75, Z0 + 0.75], [X1 - 0.75, Z0 + 0.75], [X0 + 0.75, Z1 - 0.75], [X1 - 0.75, Z1 - 0.75]]) {
        kit.box("paintedMetal", cx, ly + 1.2, cz, 0.16, 2.4, 0.16, { color: black });
        kit.box("paintedMetal", cx, ly + 2.5, cz, 0.5, 0.2, 0.5, { color: dark });
        kit.box(lamp, cx, ly + 2.38, cz, 0.36, 0.04, 0.36, { color: lampCol });
      }
    }

    // ---- catwalk kit along the outer walls (facing the core) ----------------------------------------
    // Each wall: [along-coordinate, kind]. Forward wall keeps the doors (blast x 3.5..9.5, engctl door
    // x −1.2..3.2) and the engctl window (x −26..−2, above y 13.2: low items only) clear; aft wall keeps
    // x −3..3 clear.
    const westList = [
      [618, "crates"],
      [622, "valve"],
      [627, "console"],
      [631.7, "cabinets"],
      [636, "rack"],
      [641, "console"],
      [645.5, "valve"],
      [657, "console"],
      [661.7, "cabinets"],
      [666, "crates"],
      [670, "valve"],
      [675, "rack"],
      [680, "console"],
      [685, "cabinet"],
    ];
    const eastList = [
      [617.5, "cabinet"],
      [621.5, "console"],
      [626.5, "rack"],
      [631, "valve"],
      [635.5, "crates"],
      [641, "cabinets"],
      [646, "console"],
      [657, "valve"],
      [661.5, "console"],
      [667, "rack"],
      [671.5, "cabinets"],
      [675.5, "console"],
      [680.5, "valve"],
      [685, "crates"],
    ];
    const place = (kind, pos, yawWall, yawRoom, depthFn) => {
      // pos(d): world position of an item whose back is at the wall face, given its depth-from-wall offset
      switch (kind) {
        case "console":
          consoleProp(kit, PALETTE, pos(1.6), yawWall, { w: 2.4, screens: 2, seed: seed++, screenMat: seed % 2 ? "screenImp1" : "screenImp3" });
          break;
        case "cabinet":
          cabinet(kit, PALETTE, pos(0.28), yawRoom, { seed: seed++, emit: seed % 3 ? "emitBlue" : "emitAmber" });
          break;
        case "cabinets":
          cabinet(kit, PALETTE, depthFn(0.28, -0.7), yawRoom, { seed: seed++ });
          cabinet(kit, PALETTE, depthFn(0.28, 0.7), yawRoom, { seed: seed++, emit: "emitAmber" });
          break;
        case "rack":
          toolRack(kit, PALETTE, pos(0.06), yawRoom, { seed: seed++ });
          break;
        case "valve":
          valveStation(kit, PALETTE, pos(0.05), yawRoom);
          break;
        case "crates":
          labelCrate(kit, PALETTE, pos(0.68), yawRoom + 0.08, { seed: seed++ });
          labelCrate(kit, PALETTE, depthFn(0.7, 1.3), yawRoom - 0.12, { seed: seed++, w: 1.0, h: 1.0, d: 1.0 });
          labelCrate(kit, PALETTE, depthFn(0.68, 0, 1.2), yawRoom + 0.25, { seed: seed++, w: 1.0, h: 0.8, d: 1.0 });
          break;
      }
    };
    for (const [z, k] of westList) place(k, (d) => [X0 + d, Y, z], -Math.PI / 2, Math.PI / 2, (d, dz, dy = 0) => [X0 + d, Y + dy, z + dz]);
    for (const [z, k] of eastList) place(k, (d) => [X1 - d, Y, z], Math.PI / 2, -Math.PI / 2, (d, dz, dy = 0) => [X1 - d, Y + dy, z + dz]);
    const fwdList = [
      [-33, "cabinet"],
      [-30.3, "rack"],
      [-22, "console"],
      [-18, "console"],
      [-12, "console"],
      [-6.5, "console"],
      [12, "valve"],
      [15.7, "cabinets"],
      [20, "rack"],
      [25, "console"],
      [29.5, "cabinet"],
      [33, "cabinet"],
    ];
    for (const [x, k] of fwdList) place(k, (d) => [x, Y, Z0 + d], Math.PI, 0, (d, dx, dy = 0) => [x + dx, Y + dy, Z0 + d]);
    const aftList = [
      [-33.5, "cabinet"],
      [-30, "crates"],
      [-25, "console"],
      [-20, "rack"],
      [-15.5, "cabinets"],
      [-11, "valve"],
      [-6, "console"],
      [6, "console"],
      [11, "valve"],
      [15.5, "cabinets"],
      [20, "rack"],
      [25, "console"],
      [30, "crates"],
      [33.5, "cabinet"],
    ];
    for (const [x, k] of aftList) place(k, (d) => [x, Y, Z1 - d], 0, Math.PI, (d, dx, dy = 0) => [x + dx, Y + dy, Z1 - d]);
    // status panels flanking the doors: blast door (x 10.3), engctl door (x −1.6, on the 1.8 m strip
    // between the window edge x −2 and the hole x −0.2), hyperdrive door (±4); the two under the engctl
    // window stay below its sill at y 13.2
    for (const [x, z, yaw, yc, w] of [[10.3, Z0, 0, Y + 1.5, 0.7], [-1.6, Z0, 0, Y + 1.5, 0.6], [-8.6, Z0, 0, Y + 0.65, 0.7], [-15.4, Z0, 0, Y + 0.65, 0.7], [-4.0, Z1, Math.PI, Y + 1.5, 0.7], [4.0, Z1, Math.PI, Y + 1.5, 0.7]]) {
      const F = placer(kit, [x, 0, z], yaw);
      F.box("paintedMetal", 0, yc, 0.05, w, 0.9, 0.06, { color: black });
      indicatorField(F, 0, yc + 0.1, 0.09, w - 0.1, 0.5, seed++);
      F.box(x > 0 ? "emitRedImp" : "emitAmber", 0, yc - 0.34, 0.085, w - 0.3, 0.06, 0.01);
    }
    // under-sill conduit along the engctl window wall, behind the consoles
    pipe(kit, PALETTE, [-25.5, Y + 0.95, Z0 + 0.25], [-2.6, Y + 0.95, Z0 + 0.25], 0.1, { bracket: 4, color: steel, segments: 10 });
    // corner crates on the ring
    labelCrate(kit, PALETTE, [X0 + 0.75, Y, Z1 - 0.75], 0.2, { seed: seed++ });
    labelCrate(kit, PALETTE, [X1 - 0.75, Y, Z0 + 0.75], -0.15, { seed: seed++ });
    // heavy door surround on the forward wall: structural pier between the engctl door (x −0.2..2.2)
    // and the blast door (x 4.5..8.5) above the shell's keypad/sign, a header beam over both doors
    // with an amber strip, vent + conduit drop on the pier (covers the bare shell panels there)
    // (clean painted face plates over the pier and the beam: the worn-metal map reads as stained
    // concrete at this size even at texel 2.5)
    kit.boxMM("paintedMetal", [2.45, Y + 2.6, Z0], [4.25, Y + 5.4, Z0 + 0.14], { color: dark, texel: 2.5 });
    kit.boxMM("impPanel", [2.53, Y + 2.68, Z0 + 0.14], [4.17, Y + 5.32, Z0 + 0.152], { color: mid, uv: "keep" });
    ventGrille(kit, PALETTE, [3.35, Y + 3.3, Z0 + 0.152], 0, { w: 1.3, h: 0.7 });
    junctionBox(kit, PALETTE, [3.35, Y + 4.0, Z0 + 0.152], 0, { seed: seed++, w: 0.6, h: 0.5 });
    // hooded flood on the pier under the header beam: the door-approach light (the deck in front of
    // both doors and the door faces themselves)
    wallLamp(kit, PALETTE, [3.35, Y + 4.72, Z0 + 0.152], 0, { w: 1.1, tilt: 0.85, mat: FACE, faceColor: WHITE });
    // hooded floods high on the west wall at 638 and 652, either side of the core camera: fixtures
    // only (their two catwalk points went to the pit — the pools they threw were beside and behind
    // that camera, outside every frame; the east one at 624 went earlier when the core points took
    // its slot)
    for (const z of [638, 652]) wallLamp(kit, PALETTE, [X0, Y + 5.2, z], Math.PI / 2, { w: 1.3, tilt: 0.95, mat: FACE, faceColor: WHITE });
    kit.boxMM("paintedMetal", [-1.0, Y + 5.4, Z0], [9.6, Y + 6.3, Z0 + 0.6], { color: dark, texel: 2.5 });
    kit.boxMM("impPanel", [-0.92, Y + 5.48, Z0 + 0.6], [9.52, Y + 6.22, Z0 + 0.612], { color: dark, uv: "keep" });
    kit.boxMM("paintedMetal", [-1.0, Y + 5.3, Z0], [9.6, Y + 5.4, Z0 + 0.66], { color: black, texel: 4 });
    kit.boxMM("impPanel", [-0.92, Y + 5.288, Z0 + 0.02], [9.52, Y + 5.3, Z0 + 0.64], { color: dark, uv: "keep" });
    kit.boxMM("emitAmber", [-0.6, Y + 5.85, Z0 + 0.612], [9.2, Y + 5.95, Z0 + 0.632]);
    for (const x of [-0.4, 3.35, 9.0]) kit.boxMM("paintedMetal", [x - 0.25, Y + 6.3, Z0], [x + 0.25, Y + 8.0, Z0 + 0.5], { color: black, texel: 2.5 });

    // ---- lights (14 = 4 spots + 10 points). The rig has no studio environment: everything the cameras
    // see is lit by these. The pool gives the current room its 4 spots and its 9 nearest points
    // (d / (0.5 + priority)), then 3 slots to door-neighbours — so one of the ten points is always off
    // (the farthest for that camera) and priorities only order my own list, except where the reactor
    // is the neighbour seen through engctl's window (the shaft point and the two north core lamps carry
    // 3–4 so they take those slots against the corridor's lights).
    // THE CORE IS THE KEY (critic pass 3: 80–85 % black frames while the cells clipped): four amber
    // points ring the core inside the lamp-standard heads (r 14, y 17, 380 cd, distance 40) and pool the
    // platform ring and the drum's lower band, and one 4400 cd point sits on the column's axis at y 40
    // — inside the column, whose every face points away from it, so it lights nothing of the column
    // and everything that faces the core: the walls (1.7–2.8 lx → 14–24 % grey), the ledge undersides,
    // the strut roots (23 lx at r 10, so the trusses have faces), the bridges and platform (2–5 lx of
    // fill under the pools) and the pit deck (1.5–2.7 lx). Light arrives from the core's direction,
    // which is the motivation the frames were missing. Everything else is fill: the four gantry pool
    // spots on the bridge decks, three collar lights in the pit, one north pit-wall flood under the
    // entry catwalk, and the pier flood at the doors (policy E).
    // Intensities are candela against ~2.5 % deck albedo: a pool needs ~7 lx to sit at 20 % grey and
    // ~14 lx for 35 %; every point sits inside its housing (the lamp standards, the pier and wall
    // hoods) or ≥ 1.5 m from any wall or the drum, and no point is hung under a face it could light.
    const L = (pos, color, intensity, distance, priority = 0.5) => {
      const d = { type: "point", pos, color, intensity, distance, priority };
      ctx.lights.push(d);
      return d;
    };
    // amber pools: spots in the four gantry lamp heads aimed down the bridge decks. A point light
    // anywhere on a bridge axis mirrors off the column as a round dot exactly on the axis of the
    // entry/bridge views, so these are spots; the three side pools lean 27° toward the core (57°
    // half-cone, 300 cd → 13 lx at the frame bottom of the bridge view, 3 lx 6 m out, so the grating
    // reads for 8 m before it falls to the column floods' pool at the platform), whose far edge grazes
    // the drum at y 12–14 with no intensity left. All four breathe with the core (same phase as the
    // channel material).
    const pools = [];
    for (const [gx, gz] of [[IX0 + 0.45, CZ], [IX1 - 0.45, CZ], [0, IZ0 + 0.45], [0, IZ1 - 0.45]]) {
      const len = Math.hypot(-gx, CZ - gz);
      const ux = -gx / len;
      const uz = (CZ - gz) / len;
      const entry = gz === IZ0 + 0.45;
      // SHADOW KEY (entry gantry): 0.45 m under the crane's flood head (x −2.9, 1.4 m west of the bridge
      // rails), aimed down the bridge and across the landing (35° down, 57° half-cone, 650 cd → 20 lx
      // under the arch falling to 2.5 lx 8 m out along the grating). The west rail's bars and posts
      // cast a stripe along the grating 0.5 m inside the rail, the arch's east post and the landing
      // console cast across the landing toward the entry camera; the cone's edge stays 2° off the
      // column's lower drum, so it keeps no specular dot.
      const d = entry
        ? { type: "spot", pos: [-2.9, Y + 3.55, gz + 0.75], target: [1.4, Y, gz + 3.6], color: 0xffb060, intensity: 820, distance: 36, angle: 1.0, penumbra: 0.45, priority: 1.5, shadow: true }
        : { type: "spot", pos: [gx + ux * 0.4, Y + 4.0, gz + uz * 0.4], target: [gx + ux * 2.4, Y, gz + uz * 2.4], color: 0xffa040, intensity: 380, distance: 30, angle: 1.0, penumbra: 0.5, priority: gz === IZ1 - 0.45 ? 1.2 : 1.5 };
      ctx.lights.push(d);
      pools.push(d);
    }
    const poolBase = pools.map((d) => d.intensity);
    // landing console east of the entry bridge, facing the core, under the shadow key: it casts a long
    // shadow across the ring grating toward the entry camera
    consoleProp(kit, PALETTE, [4.6, Y, IZ0 - 1.0], Math.PI, { w: 2.4, screens: 2, seed: seed++, screenMat: "screenImp3" });
    // core lamp standards: amber points inside the four heads (r 14, y 17, 5 m over the platform deck).
    // Under a head the platform edge takes 11 lx (28 % grey) falling to 5 lx at the inner kerb; the
    // drum's lower band, 4.2 m away, 17 lx (its black paint reads ~45 % there, no clipping); the pit
    // deck 12.5 m below, 2 lx. They breathe with the core. The two north heads carry priority 3 for
    // engctl's window view (see above).
    const CORE_I = 380;
    const coreLights = LAMP_ANGLES.map((a) => L([Math.cos(a) * LAMP_R, LAMP_Y, CZ + Math.sin(a) * LAMP_R], 0xffa040, CORE_I, 40, Math.sin(a) < 0 ? 3.0 : 1.5));
    // the core's glow on the chamber: one point on the column axis at y 40 (see the header comment)
    // (priority 4.5: through engctl's window it must hold one of engctl's three neighbour slots against
    // the pier flood below and the corridor's door light — 60 m / 5.0 = 12.1 vs the corridor's 12.5)
    // 5200 (was 3200, then 4400): the pit floor, which is the bottom band of the core and pit views,
    // takes 1.8–3.2 lx from it at r 16–30 — with the collar lights below and the deck tint that is its
    // 20 % — and the south pit either side of the bridge view, which no collar light reaches, sits at
    // ~15 % on this light alone (it read 11–13 % at 4400). The walls take 2–3.3 lx (16–26 % grey), the
    // spines' inner faces peak ~62 %, nothing it reaches clips.
    const SHAFT_I = 5200;
    const shaftLight = L([0, 40, CZ], 0xffc890, SHAFT_I, 80, 4.5);
    // pier flood (door approach, policy E): the pool of the hooded pier lamp, 3.7 m out from the pier
    // and 3.3 m over the deck. At 190 cd the painted plate under the hood takes 14 lx (~62 % grey on
    // the mid impPanel; at 2.6 m out and 28 lx it ran 70–82 % with the door lamp's own patch on top),
    // the deck under the light 17 lx and the door mat 6 lx — the pool sits 3–4 m inside the engctl
    // door, which is the deck engctl's aft-door camera sees through the hole (it read 14 % black at
    // 130 cd / 2.6 m). Priority 1.7: from that camera the corridor's three door lights sat closer and
    // took every neighbour slot; 1.7 wins the third slot (6.4 vs the corridor's 6.7) without taking
    // the corridor's own engctl-door slots.
    L([3.35, Y + 3.3, Z0 + 3.7], 0xffc890, 190, 18, 1.9);
    // amber core-base glow in the pit: three lights round the collar breathing with it, at r 17.5 just
    // outside the service ring, 4.5 m over the pit deck (was two at r 16.5 and 2.1 m at 180 cd: a 41 lx
    // pool 3 m wide and nothing beyond it — the pit floor outside the pools sat at 12–15 % in the pit
    // view). At 300 cd and 4.5 m the pool under each is 15 lx (35 %) and still 6 lx (20 % grey) 4 m
    // out, 3 lx at 6 m; 5.4 m from the steel ring conduit at r 12.6 (10 lx on it — at r 13 they had
    // streaked it white). The angles dodge the pit props: the six pumps stand at r 20.5 on 15° + k·60°
    // with steel drums on top (a 300 cd point within 4 m clips them), the eight polished feed pipes end
    // at r 15.7 on 10° + k·45° — each light sits ≥ 4.7 m from the nearest drum and ≥ 4.5 m from a pipe.
    // – W (180°): the pit view's right-middle floor, the bridge view's port pit
    // – NNW (−116°): 16 m in front of the pit camera, so its bottom band (the pit floor at z 626–633
    //   between the entry catwalk and the collar) takes 2.7 lx from it on top of the shaft light; the
    //   old N light at −90° put its pool at the frame's centre-right where the collar glow already was
    // – NE (−30°, priority 1.0: the point the core camera drops — the column hides it there — and
    //   the one the pit camera keeps over the SE lamp standard, 47 m behind it):
    //   the pit view's left-middle floor past the column's edge (that camera faces SSE, so east is its
    //   left) and the NE pit floor the entry view's bottom-left looks down on
    const COLLAR_I = 300;
    const collarAt = (deg, priority) => L([Math.cos((deg * Math.PI) / 180) * 17.5, PIT_Y + 5.0, CZ + Math.sin((deg * Math.PI) / 180) * 17.5], 0xffa040, COLLAR_I, 40, priority);
    const collarLights = [collarAt(180, 2.0), collarAt(-116, 1.2), collarAt(-30, 1.0)];
    // north pit-wall flood: a point 3.9 m in front of the x −8 pit lamp hood (hidden under the entry
    // catwalk, 1.5 m below its underside), the fixture the core camera sees at its bottom-left. It
    // pools the pit floor under the catwalk's edge (10.6 lx), puts a 30 % patch on the pit wall round
    // the hood and 1 lx on the pit floor 9 m out — that corner of the core view (the north pit wall,
    // the catwalk's underside and the pit floor beyond) was the 11 % third of its bottom band, lit by
    // the shaft point alone. It replaces the two west-wall catwalk pools at 638 / 652: their deck pools
    // were beside and behind the core camera, outside all five frames. Priority 0.8: from engctl's
    // window camera it sits 17.9 m away and at 1.3 it took the neighbour slot the shaft point needs
    // there (13.8 vs 12.1).
    L([-8, PIT_Y + 6.0, Z0 + 3.9], 0xffe8d8, 320, 30, 0.8);

    // static emitters folded into the animated mesh, re-capped (policy A): white faces 0.95, every amber
    // strip / line / ring 0.9 (the shell's strips and door accents included), the strut glow lines 1.0
    const emitters = buildAnimatedEmitters(ctx, { adopt: [["emitWhite", 0.95], ["emitAmber", 0.9], ["emitOrange", 1.0]] });

    return {
      update(dt, t) {
        emitters.uniforms.uTime.value = t;
        // core pulse: the channel material's phase (animPulse) drives the core lamps, the pools, the
        // shaft glow and the collar lights
        const p = anim.pulse(t) - 1; // −0.135 … +0.135
        for (let i = 0; i < pools.length; i++) pools[i].intensity = poolBase[i] * (1 + 1.6 * p);
        for (const d of coreLights) d.intensity = CORE_I * (1 + 1.6 * p);
        shaftLight.intensity = SHAFT_I * (1 + 1.2 * p);
        for (const d of collarLights) d.intensity = COLLAR_I * (1 + 2.2 * p);
      },
    };
  },
});

// Core lamp standard: 5 m mast on the platform edge, an arm reaching outward over the pit and a hooded
// head whose diffuser face looks straight down (`faceMat` + `faceColor`). `pos` = mast foot, `a` = the
// mast's angle about the core (the arm points away from the core). The head is a 0.9 × 0.9 × 0.5 box
// around LAMP_R / LAMP_Y so the room's amber point sits INSIDE it, 0.2 m over the face plane: nothing
// of the fixture faces its own light, and the face renders at its emissive value alone.
function lampStandard(kit, PALETTE, pos, a, faceMat, faceColor) {
  const black = col(PALETTE, "impBlack");
  const dark = col(PALETTE, "impDark");
  const [x, y, z] = pos;
  const yaw = Math.atan2(Math.cos(a), Math.sin(a)); // local +Z = outward (away from the core)
  const P = placer(kit, pos, yaw);
  const H = LAMP_Y - y; // 5 m: the head's centre height
  P.box("paintedMetal", 0, 0.08, 0, 0.6, 0.16, 0.6, { color: dark, texel: 2.5 });
  P.box("paintedMetal", 0, H / 2 + 0.3, 0, 0.18, H + 0.6, 0.18, { color: black });
  P.box("paintedMetal", 0, H + 0.5, 0.7, 0.12, 0.12, 1.4, { color: black });
  P.box("paintedMetal", 0, H + 0.3, 1.4, 0.1, 0.4, 0.1, { color: black });
  P.box("paintedMetal", 0, H, 1.4, 0.9, 0.5, 0.9, { color: black, texel: 2.5 });
  P.box("paintedMetal", 0, H - 0.27, 1.4, 1.0, 0.04, 1.0, { color: dark });
  P.box(faceMat, 0, H - 0.3, 1.4, 0.64, 0.02, 0.64, { color: faceColor, uv: "keep" });
  kit.collider([x - 0.35, y, z - 0.35], [x + 0.35, y + 2.2, z + 0.35], "mast");
}

// Pit heat exchanger: long plinth, finned body, three drums on top, manifold toward the core. Front = +Z.
function exchanger(kit, PALETTE, pos, yaw, seed) {
  const P = placer(kit, pos, yaw);
  const black = col(PALETTE, "impBlack");
  const dark = col(PALETTE, "impDark");
  const mid = col(PALETTE, "impMid");
  const steel = col(PALETTE, "steel");
  P.box("paintedMetal", 0, 0.2, 0, 7.4, 0.4, 5.2, { color: black, texel: 2.5 });
  P.box("paintedMetal", 0, 2.1, 0, 6.4, 3.4, 4.2, { color: dark, texel: 2.5 });
  for (let i = 0; i < 7; i++) P.box("paintedMetal", 0, 0.9 + i * 0.4, 0, 6.8, 0.1, 4.6, { color: mid, texel: 2.5 });
  P.box("paintedMetal", 0, 3.9, 0, 6.6, 0.2, 4.4, { color: black });
  for (const x of [-2.1, 0, 2.1]) {
    P.cyl("metal", x, 4.9, 0, 0.9, 4.0, "z", { color: steel, segments: 16, texel: 0.5 });
    P.cyl("paintedMetal", x, 4.9, 1.6, 0.98, 0.25, "z", { color: black, segments: 16 });
    P.cyl("paintedMetal", x, 4.9, -1.6, 0.98, 0.25, "z", { color: black, segments: 16 });
  }
  P.cyl("metal", 0, 4.9, 2.3, 0.3, 4.6, "x", { color: steel, segments: 12 });
  P.cyl("metal", 0, 1.9, 2.4, 0.32, 3.4, "y", { color: steel, segments: 12 });
  P.box("emitAmber", -2.4, 2.6, 2.11, 1.2, 0.08, 0.01);
  P.box("emitRedImp", -2.4, 2.4, 2.11, 0.3, 0.08, 0.01);
  indicatorField(P, 2.2, 2.6, 2.11, 1.4, 0.3, seed);
  for (let i = 0; i < 6; i++) P.box("paintedMetal", 2.2, 0.8 + i * 0.12, 2.11, 1.6, 0.04, 0.02, { color: black });
}

// Pit pump block: plinth, body, tangential motor drum, top valve wheel and a status lamp. Front = +Z.
// Three states that read from the catwalk above: 0 = standard single drum + valve wheel; 1 = small
// twin-drum motor, red service placard with a beacon on the deck, front hatch swung open with a fault
// lamp; 2 = big finned motor, filter drum and an open top hatch (raised lid, glowing coil bay).
function pumpBlock(kit, PALETTE, pos, yaw, seed, variant = 0) {
  const P = placer(kit, pos, yaw);
  const black = col(PALETTE, "impBlack");
  const dark = col(PALETTE, "impDark");
  const mid = col(PALETTE, "impMid");
  const steel = col(PALETTE, "steel");
  P.box("paintedMetal", 0, 0.15, 0, 3.4, 0.3, 2.6, { color: black, texel: 2.5 });
  P.box("paintedMetal", 0, 1.25, 0, 2.8, 1.9, 2.0, { color: variant === 2 ? black : dark, texel: 2.5 });
  P.box("paintedMetal", 0, 2.28, 0, 3.0, 0.16, 2.2, { color: variant === 1 ? dark : black, texel: 2.5 });
  // motor on the top deck (so the block reads as a pump from the catwalk above): saddle, steel drum(s)
  // overhanging both sides, black end bells and centre band; outlet stub on the front. The drums are
  // painted steel (paintedMetal, steel tint), not bare `metal`: a 0.5 m polished drum 9 m from the
  // underdeck flood mirrored it into the core view as a bloomed white blob.
  P.box("paintedMetal", 0, 2.5, -0.45, 2.0, 0.3, 1.0, { color: black });
  if (variant === 1) {
    for (const z of [-0.78, -0.12]) {
      P.cyl("paintedMetal", 0, 2.96, z, 0.3, 2.4, "x", { color: steel, segments: 14, texel: 0.5 });
      P.cyl("paintedMetal", 1.25, 2.96, z, 0.34, 0.16, "x", { color: black, segments: 14 });
      P.cyl("paintedMetal", -1.25, 2.96, z, 0.34, 0.16, "x", { color: black, segments: 14 });
    }
    P.box("paintedMetal", 0, 2.96, -0.45, 0.4, 0.5, 0.9, { color: black });
  } else if (variant === 2) {
    P.cyl("paintedMetal", 0, 3.38, -0.45, 0.72, 3.8, "x", { color: steel, segments: 18, texel: 0.5 });
    for (const x of [-1.2, -0.6, 0, 0.6, 1.2]) P.cyl("paintedMetal", x, 3.38, -0.45, 0.8, 0.08, "x", { color: black, segments: 18 });
    P.cyl("paintedMetal", 1.95, 3.38, -0.45, 0.78, 0.24, "x", { color: black, segments: 18 });
    P.cyl("paintedMetal", -1.95, 3.38, -0.45, 0.78, 0.24, "x", { color: black, segments: 18 });
  } else {
    P.cyl("paintedMetal", 0, 2.95, -0.45, 0.55, 3.2, "x", { color: steel, segments: 16, texel: 0.5 });
    P.cyl("paintedMetal", 1.65, 2.95, -0.45, 0.62, 0.22, "x", { color: black, segments: 16 });
    P.cyl("paintedMetal", -1.65, 2.95, -0.45, 0.62, 0.22, "x", { color: black, segments: 16 });
    P.cyl("paintedMetal", 0, 2.95, -0.45, 0.6, 0.5, "x", { color: black, segments: 16 });
  }
  P.cyl("metal", 0, 1.6, 1.2, 0.26, 1.0, "z", { color: steel, segments: 12 });
  if (variant === 2) {
    P.cyl("paintedMetal", 0.8, 2.85, 0.55, 0.42, 1.0, "y", { color: steel, segments: 14, texel: 0.5 });
    P.cyl("paintedMetal", 0.8, 3.38, 0.55, 0.48, 0.12, "y", { color: black, segments: 14 });
    P.cyl("emitBlue", 1.3, 2.85, 0.55, 0.04, 0.7, "y", { segments: 6 });
    // open top hatch on the front-left of the deck: mid-grey rim, black bay with a glowing coil strip
    // and three steel coil bars, lid hinged on its back edge and raised 70°
    P.box("paintedMetal", -0.8, 2.39, 0.7, 1.16, 0.06, 0.76, { color: mid });
    P.box("paintedMetal", -0.8, 2.4, 0.7, 1.04, 0.06, 0.64, { color: black });
    P.box("emitAmber", -0.8, 2.435, 0.7, 0.9, 0.01, 0.08);
    for (const z of [0.52, 0.88]) P.cyl("metal", -0.8, 2.45, z, 0.03, 0.9, "x", { color: steel, segments: 6 });
    // lid hinged on the bay's front edge (z 1.08), standing 20° past vertical toward the core
    const lq = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0)).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0.35, 0, 0)));
    kit.add("paintedMetal", new THREE.BoxGeometry(1.1, 0.7, 0.04), { pos: P.world(-0.8, 2.42 + 0.33, 1.08 + 0.12), quat: lq, color: dark, texel: 2.5 });
  } else if (variant === 1) {
    // red service placard on a post at the deck's front-right corner (tilted to face up and forward so
    // it reads from the catwalk), white label plate, red beacon on top
    P.cyl("metal", 1.2, 2.66, 0.85, 0.025, 0.6, "y", { color: steel, segments: 6 });
    const tq = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0)).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.35, 0, 0)));
    const pc = P.world(1.2, 2.98, 0.85);
    const pn = new THREE.Vector3(0, 0, 1).applyQuaternion(tq).multiplyScalar(0.02);
    kit.add("paintedMetal", new THREE.BoxGeometry(0.56, 0.4, 0.02), { pos: pc, quat: tq, color: col(PALETTE, "impRed") });
    kit.add("impPanel", new THREE.BoxGeometry(0.4, 0.12, 0.01), { pos: [pc[0] + pn.x, pc[1] + pn.y, pc[2] + pn.z], quat: tq, color: mid, uv: "keep" });
    P.cyl("emitRedImp", 1.2, 3.02 + 0.22, 0.85, 0.06, 0.1, "y", { segments: 8 });
  } else {
    P.add("metal", new THREE.TorusGeometry(0.3, 0.035, 8, 24), 0.9, 2.6, 0.55, { rot: [Math.PI / 2, 0, 0], color: col(PALETTE, "impRed") });
    P.cyl("metal", 0.9, 2.5, 0.55, 0.05, 0.3, "y", { color: steel, segments: 8 });
  }
  if (variant === 1) {
    // hatch swung open on the front-right: opening, hinged panel, cable loop to the floor, fault lamp
    P.box("paintedMetal", 0.75, 1.15, 1.0, 0.9, 1.1, 0.06, { color: black });
    const hq = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw + 1.2, 0));
    kit.add("paintedMetal", new THREE.BoxGeometry(0.9, 1.1, 0.04), { pos: P.world(1.2 - 0.16, 1.15, 1.04 + 0.42), quat: hq, color: dark, texel: 2.5 });
    for (let k = 0; k < 3; k++) P.cyl("metal", 0.5 + k * 0.2, 1.0, 1.06, 0.03, 0.9, "y", { color: [black, dark, steel][k], segments: 6 });
    P.box("emitRedImp", 0.35, 1.55, 1.03, 0.1, 0.06, 0.01);
    P.box("emitAmber", 0.75, 0.75, 1.03, 0.3, 0.04, 0.01);
  } else {
    indicatorField(P, -0.7, 1.9, 1.01, 0.9, 0.24, seed);
  }
  P.box("emitAmber", -0.7, 0.9, 1.01, 0.6, 0.05, 0.01);
  for (let i = 0; i < 5; i++) P.box("paintedMetal", -0.7, 0.3 + i * 0.1, 1.01, 0.9, 0.03, 0.02, { color: black });
}
