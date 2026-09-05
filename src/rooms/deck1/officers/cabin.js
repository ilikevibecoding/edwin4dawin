// One officer's cabin, varied by seed (mirrored layout, personal items). The captain's suite is the same
// function with a seating pair, a larger desk, wardrobe / arms rack / schematic wall, a sleeping-area floor inset
// and a sideboard.
// Layout (critic round 3, "reads as a hall with a bed"): bunk module + kit trunk + wardrobe along the back wall,
// the desk in the room's centre-left facing a half-height L-shaped bulkhead (metal cap, lit edge, housed uplight
// in the cap) that walls the desk zone off from the sleeping zone, a charcoal rug with an amber border on the
// right carrying a low table and an armchair (officers) or the armchair pair (captain), amber guide lines on the
// floor from the door to the wardrobe, and the cabin's own ceiling slab with three cross beams, two cable trays
// and a vent grille.
// Round 4 (critic: "placeholder furniture, bunk reads as a knee-high bench, floor and ceiling bare"): everything
// is sized to read from the door camera 7–8 m from the back wall — the bunk got a 1.15 m headboard with its
// reading lamp, a footboard, drawer fronts, coloured bedding and the 1.2 m trunk at its foot; the wall cabinet is
// 60 % of the bunk with doors, handles, a label, a shelf and a lit rail facing the room; the desk a panelled
// front; the settee an open frame with split cushions; the table a pedestal with items and a chair at it.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { FLOOR } from "../shared/plan.js";
import { IMP } from "../shared/palette.js";
import { amberBar, junctionBox, makeFrame, rng, vent, wainscot } from "./lib.js";

// impPanel tint for surfaces that used to be paintedMetal (worn-metal chips read as stains above knee height)
const CLEAN = 0.47;
const clean = (c, texel = 1) => ({ color: c.clone().multiplyScalar(CLEAN), texel });
// rug field: charcoal (the warm-grey field read as a peach untextured plane)
const CHARCOAL = new THREE.Color(0x2b2d32);
// bedding: dark blue-grey blanket, white sheet band, light-grey pillow (critic round 4: "two white blocks")
const BLANKET = new THREE.Color(0x34435a);
// cabinet doors / drawer fronts: the far wall sits at E ≈ 0.3–0.9 under the cabin lamp, where the ×0.47 "clean"
// tints read black; IMP.grey × 0.7 keeps them a step darker than the shell panels but clearly lighter than the
// black carcasses around them
const LIGHT = { color: IMP.grey.clone().multiplyScalar(0.7), texel: 1 };
const STEEL = { color: IMP.grey, texel: 1 };

/**
 * faces: { x0, x1, z0, z1 } interior wall faces; side -1 west (door wall at x1) / +1 east (door wall at x0);
 * doorZ: world z of the corridor door centre; opts: { seed, captain, ceilY, plateName, tone }
 */
export function buildCabin(kit, faces, side, doorZ, { seed = 1, captain = false, ceilY, plateName = "plate1" }) {
  const rand = rng(seed * 7919 + 13);
  const flip = !captain && rand() < 0.5;
  const F = makeFrame(faces.x0, faces.x1, faces.z0, faces.z1, side, flip);
  const { U, V } = F;
  const doorU = flip ? faces.z1 - doorZ : doorZ - faces.z0;
  const H = ceilY - FLOOR;
  const box = (mat, u0, u1, y0, y1, v0, v1, opts) => F.box(kit, mat, u0, u1, y0, y1, v0, v1, opts);
  const col = (u0, u1, y0, y1, v0, v1, tag) => F.col(kit, u0, u1, y0, y1, v0, v1, tag);
  const dark = { color: IMP.dark, texel: 1 };
  const black = { color: IMP.black, texel: 1 };
  const midM = { color: IMP.mid, texel: 2 };
  const darkM = { color: IMP.dark, texel: 1 };
  const fab = (c, texel = 2) => ({ color: c, texel });
  // world-x rotation sign that lifts a box's −u edge (used to lean the pillow on the headboard)
  const tiltU = flip ? -1 : 1;
  // chamfered box (RoundedBoxGeometry, 1 segment = 45° chamfer, 108 tris) in local (u, y, v) terms
  const rbox = (mat, u0, u1, y0, y1, v0, v1, r, opts) => {
    const p = F.P((u0 + u1) / 2, (y0 + y1) / 2, (v0 + v1) / 2);
    kit.add(mat, new RoundedBoxGeometry(Math.abs(v1 - v0), y1 - y0, Math.abs(u1 - u0), 1, r), { pos: p, ...opts });
  };
  // rug: charcoal fine-weave field with a thin amber border 6 cm in from the edge
  const rug = (u0, u1, v0, v1) => {
    box("fabric", u0, u1, 0.0, 0.014, v0, v1, fab(CHARCOAL, 3));
    const amber = { color: IMP.amber, texel: 1 };
    for (const [a, b] of [
      [u0 + 0.06, u0 + 0.085],
      [u1 - 0.085, u1 - 0.06],
    ])
      box("paintedMetal", a, b, 0.014, 0.017, v0 + 0.06, v1 - 0.06, amber);
    for (const [a, b] of [
      [v0 + 0.06, v0 + 0.085],
      [v1 - 0.085, v1 - 0.06],
    ])
      box("paintedMetal", u0 + 0.06, u1 - 0.06, 0.014, 0.017, a, b, amber);
  };
  // low table: round steel base plate, black column with a steel collar, gloss top on a steel frame; `items` adds
  // a datapad, a carafe, two cups and a book pair (the captain's table carries its own lamp and glasses)
  const lowTable = (u0, u1, v0, v1, h, items) => {
    const uc = (u0 + u1) / 2;
    const vc = (v0 + v1) / 2;
    F.cyl(kit, "metal", uc, 0.015, vc, 0.3, 0.03, "y", { ...STEEL, segments: 20 });
    box("paintedMetal", uc - 0.07, uc + 0.07, 0.03, h - 0.06, vc - 0.07, vc + 0.07, black);
    F.cyl(kit, "metal", uc, h - 0.045, vc, 0.11, 0.03, "y", { ...STEEL, segments: 12 });
    box("metal", u0 - 0.01, u1 + 0.01, h - 0.03, h - 0.018, v0 - 0.01, v1 + 0.01, STEEL);
    box("darkGloss", u0, u1, h - 0.018, h, v0, v1);
    col(u0, u1, 0, h, v0, v1, "table");
    if (!items) return;
    box("darkGloss", uc - 0.02, uc + 0.23, h, h + 0.012, vc - 0.28, vc - 0.1);
    box("emitBlue", uc + 0.18, uc + 0.2, h + 0.012, h + 0.014, vc - 0.25, vc - 0.23);
    F.cyl(kit, "darkGloss", uc - 0.2, h + 0.12, vc - 0.15, 0.055, 0.24, "y", { segments: 12 });
    F.cyl(kit, "metal", uc + 0.22, h + 0.045, vc + 0.14, 0.035, 0.09, "y", midM);
    F.cyl(kit, "metal", uc - 0.22, h + 0.045, vc + 0.2, 0.035, 0.09, "y", midM);
    box("fabric", uc - 0.12, uc + 0.1, h, h + 0.03, vc + 0.06, vc + 0.26, fab(IMP.white));
    box("fabric", uc - 0.1, uc + 0.08, h + 0.03, h + 0.055, vc + 0.08, vc + 0.24, fab(IMP.mid));
  };
  // armchair 0.7 × 0.7: steel legs under a black frame with a steel edge, chamfered seat cushion, back slab +
  // cushion on the `back` side ("-u" | "+u" | "-v" | "+v"), low arms on the two other sides
  const armchair = (u0, v0, back) => {
    const u1 = u0 + 0.7;
    const v1 = v0 + 0.7;
    for (const u of [u0 + 0.06, u1 - 0.06]) for (const v of [v0 + 0.06, v1 - 0.06]) F.cyl(kit, "metal", u, 0.06, v, 0.02, 0.12, "y", { ...STEEL, segments: 8 });
    box("impPanel", u0, u1, 0.12, 0.4, v0, v1, clean(IMP.black));
    box("metal", u0 - 0.01, u1 + 0.01, 0.38, 0.4, v0 - 0.01, v1 + 0.01, STEEL);
    rbox("fabric", u0 + 0.03, u1 - 0.03, 0.4, 0.5, v0 + 0.03, v1 - 0.03, 0.035, fab(IMP.mid));
    const lo = back === "-u" || back === "-v";
    const alongU = back === "-u" || back === "+u";
    const b0 = back === "-u" ? u0 : back === "+u" ? u1 - 0.14 : back === "-v" ? v0 : v1 - 0.14;
    const b1 = b0 + 0.14;
    const [s0, s1] = lo ? [b0, b0 + 0.04] : [b1 - 0.04, b1]; // black slab on the outside
    const [c0, c1] = lo ? [b0 + 0.04, b1] : [b0, b1 - 0.04]; // cushion on the inside
    if (alongU) {
      box("impPanel", s0, s1, 0.4, 1.0, v0, v1, clean(IMP.black));
      rbox("fabric", c0, c1, 0.5, 0.98, v0 + 0.03, v1 - 0.03, 0.035, fab(IMP.mid));
      for (const [a, b] of [
        [v0, v0 + 0.1],
        [v1 - 0.1, v1],
      ])
        rbox("fabric", u0, u1, 0.4, 0.66, a, b, 0.03, fab(IMP.dark));
    } else {
      box("impPanel", u0, u1, 0.4, 1.0, s0, s1, clean(IMP.black));
      rbox("fabric", u0 + 0.03, u1 - 0.03, 0.5, 0.98, c0, c1, 0.035, fab(IMP.mid));
      for (const [a, b] of [
        [u0, u0 + 0.1],
        [u1 - 0.1, u1],
      ])
        rbox("fabric", a, b, 0.4, 0.66, v0, v1, 0.03, fab(IMP.dark));
    }
    col(u0, u1, 0, 1.0, v0, v1, "chair");
  };
  // floor dressing: duffel (fabric cylinder along v with steel end caps, a black strap ring and a clasp), a pair of
  // boots, a hard case with steel edges and latches
  const kitBag = (u, v0, v1) => {
    const vc = (v0 + v1) / 2;
    F.cyl(kit, "fabric", u, 0.17, vc, 0.17, v1 - v0, "v", { color: IMP.mid.clone().multiplyScalar(0.85), texel: 2, segments: 14 });
    for (const v of [v0 + 0.01, v1 - 0.01]) F.cyl(kit, "metal", u, 0.17, v, 0.175, 0.02, "v", { ...darkM, segments: 14 });
    F.cyl(kit, "paintedMetal", u, 0.17, vc, 0.18, 0.06, "v", { ...black, segments: 14 });
    box("metal", u - 0.03, u + 0.03, 0.34, 0.37, vc - 0.04, vc + 0.04, STEEL);
    col(u - 0.18, u + 0.18, 0, 0.36, v0, v1, "kit-bag");
  };
  const boots = (u, v) => {
    for (const du of [0, 0.15]) {
      box("paintedMetal", u + du, u + du + 0.12, 0.0, 0.1, v, v + 0.3, black);
      box("paintedMetal", u + du + 0.005, u + du + 0.115, 0.1, 0.3, v + 0.14, v + 0.3, black);
    }
  };
  const hardCase = (u0, v0) => {
    const u1 = u0 + 0.55;
    const v1 = v0 + 0.4;
    box("impPanel", u0, u1, 0.0, 0.35, v0, v1, LIGHT);
    for (const [a, b] of [
      [0.0, 0.03],
      [0.32, 0.35],
    ])
      box("metal", u0 - 0.005, u1 + 0.005, a, b, v0 - 0.005, v1 + 0.005, darkM);
    box("paintedMetal", u0 - 0.003, u1 + 0.003, 0.2, 0.21, v0 - 0.003, v1 + 0.003, black);
    for (const uu of [u0 + 0.12, u1 - 0.12]) box("metal", uu - 0.025, uu + 0.025, 0.15, 0.25, v0 - 0.02, v0, STEEL);
    col(u0, u1, 0, 0.35, v0, v1, "case");
  };
  // amber guide line in the floor: 1.5 cm emitter 4 mm down between two black lips, so it reads as a line from the
  // door and fades at grazing angles (the corridor floor strip's construction; the officers' accent)
  const floorLine = (u, v0, v1) => {
    for (const s of [-1, 1]) box("paintedMetal", u + Math.min(s * 0.03, s * 0.0075), u + Math.max(s * 0.03, s * 0.0075), 0.0, 0.012, v0, v1, black);
    box("emitAmber", u - 0.0075, u + 0.0075, 0.006, 0.008, v0 + 0.05, v1 - 0.05);
  };
  // ranges of [lo, hi] left after cutting out `gaps`
  const spans = (lo, hi, gaps) => {
    const out = [];
    let cur = lo;
    for (const g of [...gaps].sort((a, b) => a[0] - b[0])) {
      if (g[0] > cur + 0.05) out.push([cur, Math.min(g[0], hi)]);
      cur = Math.max(cur, g[1]);
    }
    if (cur < hi - 0.05) out.push([cur, hi]);
    return out;
  };

  // --- wall treatment: dark wainscot on all four faces, pelmet over the door wall hides the corridor strip
  const wz = (u0, u1) => [Math.min(F.Z(u0), F.Z(u1)), Math.max(F.Z(u0), F.Z(u1))];
  const wx = (v0, v1) => [Math.min(F.X(v0), F.X(v1)), Math.max(F.X(v0), F.X(v1))];
  const wardU = [3.35, 4.35]; // wardrobe on the back wall between the trunk and the bulkhead leg
  wainscot(kit, { axis: "z", at: F.X(0), from: F.Z(0), to: F.Z(U), n: F.nrm("+v"), gaps: [wz(doorU - 0.85, doorU + 0.85), wz(0.35, 1.45)] });
  wainscot(kit, { axis: "z", at: F.X(V), from: F.Z(0), to: F.Z(U), n: F.nrm("-v"), gaps: [wz(wardU[0] - 0.05, wardU[1] + 0.05)] });
  wainscot(kit, { axis: "x", at: F.Z(0), from: F.X(0), to: F.X(V), n: F.nrm("+u"), gaps: [] });
  wainscot(kit, { axis: "x", at: F.Z(U), from: F.X(0), to: F.X(V), n: F.nrm("-u"), gaps: [wx(0.9, 2.0)] });
  box("impPanel", 0.02, U - 0.02, 1.98, 2.32, 0, 0.05, clean(IMP.dark));
  // inner door frame (heavy, recessed look) + threshold strip + threshold mat inside the door
  box("paintedMetal", doorU - 0.8, doorU - 0.6, 0, 2.5, 0, 0.08, black);
  box("paintedMetal", doorU + 0.6, doorU + 0.8, 0, 2.5, 0, 0.08, black);
  box("paintedMetal", doorU - 0.8, doorU + 0.8, 2.2, 2.5, 0, 0.08, black);
  box("metal", doorU - 0.6, doorU + 0.6, 0, 0.01, 0.03, 0.35, midM);
  box("paintedMetal", doorU - 0.7, doorU + 0.7, 0, 0.003, 0.4, 1.2, black);
  box("metal", doorU - 0.67, doorU + 0.67, 0.003, 0.005, 0.43, 0.455, { color: IMP.hullDark, texel: 2 });
  box("metal", doorU - 0.67, doorU + 0.67, 0.003, 0.005, 1.145, 1.17, { color: IMP.hullDark, texel: 2 });
  for (const s of [-1, 1]) box("metal", doorU + s * 0.67 - 0.0125, doorU + s * 0.67 + 0.0125, 0.003, 0.005, 0.43, 1.17, { color: IMP.hullDark, texel: 2 });
  // nameplate inside the door, junction box on the other side
  F.display(kit, doorU + 1.3, 1.5, 0, "+v", plateName, 0.32, { bezel: 0.02, depth: 0.03 });
  junctionBox(kit, F.P(doorU - 1.2, 1.5, 0), F.nrm("+v"), rand() < 0.5 ? "emitRedImp" : "emitBlue");
  // scuff band: black skirting 10 cm high, 3 cm proud, at the base of all four walls (gaps at the door, the locker,
  // the fresher hatch, the bunk module, the wardrobe, the bulkhead leg and the captain's sideboard)
  for (const [a, b] of spans(0.05, U - 0.05, [[doorU - 0.82, doorU + 0.82], [0.38, 1.42]])) box("paintedMetal", a, b, 0, 0.1, 0.0, 0.03, black);
  for (const [a, b] of spans(0.05, U - 0.05, [[0.34, 3.3], [wardU[0] - 0.04, wardU[1] + 0.04], [4.39, 4.57]])) box("paintedMetal", a, b, 0, 0.1, V - 0.03, V, black);
  for (const [a, b] of spans(0.05, V - 0.05, [])) box("paintedMetal", 0, 0.03, 0, 0.1, a, b, black);
  for (const [a, b] of spans(0.05, V - 0.05, captain ? [[0.9, 2.0], [4.9, 6.6]] : [[0.9, 2.0]])) box("paintedMetal", U - 0.03, U, 0, 0.1, a, b, black);
  // amber guide lines either side of the walkway inside the door — 2 m of approach, not the full run to the
  // wardrobe: across the whole room they read as runway lights in a bedroom and were the brightest floor element
  for (const lu of [doorU - 0.3, doorU + 0.3]) floorLine(lu, 1.3, 3.3);

  // --- bunk module against the back wall (v=V), head at the u=0 end, 2.1 m along the wall (critic round 4: "a
  // flat slab with two white blocks for bedding … reads as a bench"): base cabinet 0.45 m high on a black kick with
  // three light drawer fronts and steel handles, mattress with a blue-grey blanket draped over the front edge, a
  // turned-down white sheet band and a puffed pillow leaning on a 1.15 m headboard that carries the reading lamp
  // on a gooseneck, a footboard, and the kit trunk (the style guide's 1.2 m crate) at the foot end in place of the
  // nightstand
  const bw = captain ? 1.25 : 1.0;
  const bu0 = 0.45;
  const bu1 = 2.55;
  const bv0 = V - bw;
  if (captain) {
    // sleeping-area floor inset (3 × 1.8 m) with a metal edge
    box("darkGloss", 0.3, 3.3, 0.0, 0.008, V - 1.8, V - 0.02);
    box("metal", 0.3, 3.3, 0.0, 0.012, V - 1.8, V - 1.77, midM);
    box("metal", 0.3, 0.33, 0.0, 0.012, V - 1.8, V - 0.02, midM);
    box("metal", 3.27, 3.3, 0.0, 0.012, V - 1.8, V - 0.02, midM);
  }
  box("paintedMetal", bu0 + 0.03, bu1 - 0.03, 0.0, 0.08, bv0 + 0.04, V, black); // kick
  box("impPanel", bu0, bu1, 0.08, 0.45, bv0, V, clean(IMP.dark)); // base carcass
  box("metal", bu0 - 0.01, bu1 + 0.01, 0.45, 0.47, bv0 - 0.02, V, STEEL); // steel frame rail
  for (let i = 0; i < 3; i++) {
    const a = bu0 + 0.06 + i * 0.68;
    box("impPanel", a, a + 0.6, 0.12, 0.42, bv0 - 0.015, bv0, LIGHT); // drawer front
    box("metal", a + 0.15, a + 0.45, 0.34, 0.365, bv0 - 0.04, bv0 - 0.015, STEEL); // handle bar
  }
  box("fabric", bu0 + 0.02, bu1 - 0.02, 0.47, 0.6, bv0 + 0.02, V - 0.02, fab(IMP.dark)); // mattress
  rbox("fabric", 1.0, bu1 - 0.04, 0.6, 0.68, bv0 + 0.03, V - 0.03, 0.03, fab(BLANKET)); // blanket
  box("fabric", 1.0, bu1 - 0.04, 0.5, 0.6, bv0 - 0.005, bv0 + 0.02, fab(BLANKET)); // its drape over the front edge
  rbox("fabric", 0.98, 1.26, 0.6, 0.7, bv0 + 0.03, V - 0.03, 0.02, fab(IMP.white)); // turned-down sheet band
  box("fabric", 0.98, 1.26, 0.5, 0.6, bv0 - 0.012, bv0 + 0.02, fab(IMP.white));
  rbox("fabric", bu1 - 0.5, bu1 - 0.1, 0.68, 0.76, bv0 + 0.2, V - 0.2, 0.03, fab(BLANKET)); // folded spare at the foot
  // pillow: 16 cm thick with a 6 cm chamfer, leaning 18° on the headboard
  kit.add("fabric", new RoundedBoxGeometry(bw - 0.2, 0.16, 0.46, 1, 0.06), { pos: F.P(0.73, 0.73, (bv0 + V) / 2), rot: [tiltU * 0.32, 0, 0], color: IMP.grey, texel: 2 });
  // headboard 1.15 m high with a steel cap and the gooseneck reading lamp (black shade, warm lens toward the room
  // and downward); footboard 0.8 m at the foot
  box("impPanel", bu0 - 0.07, bu0, 0.08, 1.15, bv0 - 0.08, V - 0.02, clean(IMP.grey));
  box("metal", bu0 - 0.08, bu0 + 0.01, 1.15, 1.18, bv0 - 0.09, V - 0.02, STEEL);
  F.cyl(kit, "paintedMetal", bu0 - 0.035, 1.25, V - 0.35, 0.012, 0.14, "y", { ...black, segments: 8 });
  box("paintedMetal", bu0 - 0.09, bu0 + 0.11, 1.32, 1.42, V - 0.43, V - 0.27, black);
  box("offLamp", bu0 - 0.07, bu0 + 0.09, 1.34, 1.4, V - 0.435, V - 0.43, { uv: "keep" });
  box("offLamp", bu0 - 0.07, bu0 + 0.09, 1.315, 1.32, V - 0.41, V - 0.29, { uv: "keep" });
  box("impPanel", bu1, bu1 + 0.06, 0.08, 0.8, bv0 - 0.06, V - 0.02, clean(IMP.grey));
  box("metal", bu1 - 0.01, bu1 + 0.07, 0.8, 0.83, bv0 - 0.07, V - 0.02, STEEL);
  col(bu0 - 0.08, bu1 + 0.07, 0, 1.18, bv0 - 0.09, V, "bunk");
  // kit trunk at the foot end (0.6 × 1.2 m out from the wall, 0.55 high): IMP.mid body, dark steel bands top and
  // bottom, an amber cargo band, a black lid groove, two latches and a cargo label on the room-facing end; a
  // datapad and a bottle on the lid
  const tu0 = bu1 + 0.1;
  const tu1 = tu0 + 0.6;
  const tv0 = V - 1.22;
  const tv1 = V - 0.02;
  const th = 0.55;
  box("paintedMetal", tu0, tu1, 0.0, th, tv0, tv1, { color: IMP.mid, texel: 1 });
  box("metal", tu0 - 0.01, tu1 + 0.01, 0.0, 0.1, tv0 - 0.01, tv1 + 0.01, darkM);
  box("metal", tu0 - 0.01, tu1 + 0.01, th - 0.08, th, tv0 - 0.01, tv1 + 0.01, darkM);
  box("paintedMetal", tu0 - 0.005, tu1 + 0.005, 0.24, 0.28, tv0 - 0.005, tv1 + 0.005, { color: IMP.amber, texel: 1 });
  box("paintedMetal", tu0 - 0.005, tu1 + 0.005, th - 0.085, th - 0.075, tv0 - 0.005, tv1 + 0.005, black);
  for (const uu of [tu0 + 0.12, tu1 - 0.12]) box("metal", uu - 0.03, uu + 0.03, 0.32, 0.44, tv0 - 0.03, tv0, STEEL);
  F.plate(kit, (tu0 + tu1) / 2, 0.39, tv0, "-v", 0.13, 0.13, 11);
  col(tu0, tu1, 0, th, tv0, tv1, "trunk");
  box("paintedMetal", tu0 + 0.12, tu0 + 0.36, th, th + 0.02, tv1 - 0.55, tv1 - 0.3, black);
  box("emitBlue", tu0 + 0.31, tu0 + 0.33, th + 0.02, th + 0.025, tv1 - 0.35, tv1 - 0.33);
  F.cyl(kit, "metal", tu1 - 0.15, th + 0.1, tv1 - 0.25, 0.035, 0.2, "y", midM);
  // wall cabinet over the bunk — 1.26 m (60 % of the bunk) so the two no longer read as one box: black carcass, two
  // light doors with a dark seam, steel handles either side of it and a label; the lit reading rail under it shows
  // its warm lens on the room-facing face (the old underside lens was invisible from the door); a shelf with a
  // book pair, a datapad and a cup under the rail
  const cu0 = 0.9;
  const cu1 = 2.16;
  const cm = (cu0 + cu1) / 2;
  box("impPanel", cu0, cu1, 1.62, 2.27, V - 0.34, V, clean(IMP.black));
  box("paintedMetal", cu0 - 0.02, cu1 + 0.02, 2.27, 2.31, V - 0.35, V, black);
  for (const [a, b] of [
    [cu0 + 0.03, cm - 0.02],
    [cm + 0.02, cu1 - 0.03],
  ])
    box("impPanel", a, b, 1.65, 2.24, V - 0.352, V - 0.34, LIGHT);
  for (const hu of [cm - 0.07, cm + 0.04]) box("metal", hu, hu + 0.03, 1.84, 2.06, V - 0.38, V - 0.352, STEEL);
  F.plate(kit, cu1 - 0.22, 2.1, V - 0.352, "-v", 0.14, 0.14, 6);
  box("paintedMetal", cu0 + 0.04, cu1 - 0.04, 1.53, 1.61, V - 0.3, V - 0.06, black);
  box("offLamp", cu0 + 0.08, cu1 - 0.08, 1.545, 1.595, V - 0.305, V - 0.3, { uv: "keep" });
  box("offLamp", cu0 + 0.08, cu1 - 0.08, 1.525, 1.53, V - 0.28, V - 0.1, { uv: "keep" });
  box("metal", cu0, cu1, 1.2, 1.225, V - 0.26, V, STEEL);
  for (const su of [cu0 + 0.08, cu1 - 0.08]) box("paintedMetal", su - 0.015, su + 0.015, 1.15, 1.2, V - 0.05, V, black);
  box("fabric", cu0 + 0.15, cu0 + 0.2, 1.225, 1.45, V - 0.22, V - 0.03, fab(IMP.white));
  box("fabric", cu0 + 0.21, cu0 + 0.27, 1.225, 1.42, V - 0.21, V - 0.03, fab(IMP.mid));
  box("darkGloss", cu0 + 0.45, cu0 + 0.7, 1.225, 1.24, V - 0.24, V - 0.06);
  F.cyl(kit, "metal", cu1 - 0.3, 1.27, V - 0.14, 0.035, 0.09, "y", midM);

  // --- desk zone in the room's centre-left: the desk faces a half-height L-shaped bulkhead — return behind the
  // desk, leg running back to the wall beside the wardrobe — with a metal cap, a warm lit edge under the cap and
  // the housed uplight; the chair stands on the door side, so the door view reads chair back → desk → lit
  // bulkhead → back wall, and the floor centre is no longer empty
  const du0 = captain ? 4.7 : 4.8;
  const du1 = captain ? 6.7 : 6.4;
  const dv0 = 4.5;
  const dv1 = 5.3;
  const dc = (du0 + du1) / 2;
  const legU = 4.42;
  const pv0 = dv1 + 0.08;
  const pv1 = pv0 + 0.12;
  const pvc = (pv0 + pv1) / 2;
  const pu1 = du1 + 0.25;
  const ph = 1.25;
  // partition faces in IMP.mid × 0.7 (the ×0.47 dark tint read as a black box with the desk in front of it — critic
  // round 4): dark grey under the lamp's E ≈ 1.8, so the black seams, the kick and the steel vent groups read
  const PANEL = { color: IMP.mid.clone().multiplyScalar(0.7), texel: 1 };
  box("impPanel", legU, pu1, 0.12, ph, pv0, pv1, PANEL);
  box("impPanel", legU, legU + 0.12, 0.12, ph, pv1, V - 0.02, PANEL);
  for (let i = 0; i < 3; i++) {
    box("metal", legU + 0.1, legU + 0.34, 0.24 + i * 0.05, 0.255 + i * 0.05, pv0 - 0.02, pv0, STEEL);
    box("metal", pu1 - 0.24, pu1 - 0.04, 0.24 + i * 0.05, 0.255 + i * 0.05, pv0 - 0.02, pv0, STEEL);
    box("metal", legU - 0.02, legU, 0.24 + i * 0.05, 0.255 + i * 0.05, V - 1.3, V - 1.0, STEEL);
  }
  box("paintedMetal", legU - 0.01, pu1 + 0.01, 0, 0.12, pv0 - 0.01, pv1 + 0.01, black);
  box("paintedMetal", legU - 0.01, legU + 0.13, 0, 0.12, pv1, V - 0.02, black);
  box("metal", legU - 0.02, pu1 + 0.02, ph, ph + 0.03, pv0 - 0.02, pv1 + 0.02, midM);
  box("metal", legU - 0.02, legU + 0.14, ph, ph + 0.03, pv1, V - 0.02, midM);
  box("offLamp", legU + 0.06, pu1 - 0.06, ph - 0.06, ph - 0.045, pv0 - 0.012, pv0);
  box("offLamp", legU - 0.012, legU, ph - 0.06, ph - 0.045, pv1 + 0.06, V - 0.1);
  for (let u = legU + 0.72; u < pu1 - 0.3; u += 0.72) box("paintedMetal", u - 0.01, u + 0.01, 0.14, ph - 0.1, pv0 - 0.005, pv0, black);
  for (let v = pv1 + 0.8; v < V - 0.3; v += 0.8) box("paintedMetal", legU - 0.005, legU, 0.14, ph - 0.1, v - 0.01, v + 0.01, black);
  col(legU - 0.02, pu1 + 0.02, 0, ph + 0.03, pv0 - 0.02, pv1 + 0.02, "bulkhead");
  col(legU - 0.02, legU + 0.14, 0, ph + 0.03, pv1, V, "bulkhead");
  // housed uplight in the cap over the desk: black can, steel rim, warm lens behind two bars; the room's second
  // spot sits inside pointing up (index.js) and lights the ceiling slab, the beams and the upper walls
  box("paintedMetal", dc - 0.22, dc + 0.22, ph + 0.03, ph + 0.17, pvc - 0.11, pvc + 0.11, black);
  box("metal", dc - 0.23, dc + 0.23, ph + 0.15, ph + 0.17, pvc - 0.12, pvc + 0.12, midM);
  box("offLamp", dc - 0.18, dc + 0.18, ph + 0.17, ph + 0.176, pvc - 0.07, pvc + 0.07, { uv: "keep" });
  for (const d of [-0.06, 0.06]) box("metal", dc + d - 0.008, dc + d + 0.008, ph + 0.176, ph + 0.18, pvc - 0.08, pvc + 0.08, midM);
  const uplight = F.P(dc, ph + 0.1, pvc);
  // desk: black frame + gloss top with a steel edge on the room side, drawer pedestal on the right with light
  // fronts and handles, leg on the left, and on the room side (the face the door sees — critic round 4: "a black
  // box") a panelled front: clean modesty panel with two dark seams, a vent group and a status dot over a black kick
  box("paintedMetal", du0, du1, 0.7, 0.72, dv0, dv1, black);
  box("darkGloss", du0 - 0.02, du1 + 0.02, 0.72, 0.755, dv0 - 0.02, dv1 + 0.02);
  box("metal", du0 - 0.02, du1 + 0.02, 0.7, 0.72, dv0 - 0.025, dv0 + 0.02, STEEL);
  box("paintedMetal", du1 - 0.55, du1 - 0.05, 0.0, 0.7, dv0 + 0.05, dv1 - 0.03, dark);
  for (const [a, b] of [
    [0.12, 0.3],
    [0.36, 0.54],
  ]) {
    box("impPanel", du1 - 0.5, du1 - 0.1, a, b, dv0 + 0.035, dv0 + 0.05, LIGHT);
    box("metal", du1 - 0.42, du1 - 0.18, b - 0.06, b - 0.035, dv0 + 0.01, dv0 + 0.035, STEEL);
  }
  box("impPanel", du0 + 0.05, du1 - 0.55, 0.15, 0.7, dv1 - 0.07, dv1 - 0.03, clean(IMP.dark));
  box("paintedMetal", du0 + 0.05, du0 + 0.09, 0.0, 0.7, dv0 + 0.05, dv1 - 0.03, black);
  const mu0 = du0 + 0.1;
  const mu1 = du1 - 0.6;
  const mw = (mu1 - mu0) / 3;
  box("impPanel", mu0, mu1, 0.12, 0.68, dv0 + 0.02, dv0 + 0.06, LIGHT);
  for (const su of [mu0 + mw, mu0 + 2 * mw]) box("paintedMetal", su - 0.006, su + 0.006, 0.14, 0.66, dv0 + 0.015, dv0 + 0.02, black);
  for (let i = 0; i < 3; i++) box("metal", mu0 + 0.1, mu0 + mw - 0.08, 0.22 + i * 0.05, 0.235 + i * 0.05, dv0 + 0.005, dv0 + 0.02, STEEL);
  box("emitBlue", mu1 - 0.1, mu1 - 0.07, 0.58, 0.61, dv0 + 0.015, dv0 + 0.02);
  box("paintedMetal", du0 + 0.06, du1 - 0.06, 0.0, 0.12, dv0 + 0.06, dv1 - 0.06, black);
  col(du0, du1, 0, 0.78, dv0, dv1, "desk");
  // desk dressing: keyboard strip, datapad, cup, holo frame, terminal on a stand facing the chair, desk lamp
  box("paintedMetal", dc - 0.25, dc + 0.25, 0.755, 0.77, dv0 + 0.32, dv0 + 0.5, black);
  box("emitBlue", dc - 0.2, dc + 0.2, 0.77, 0.773, dv0 + 0.44, dv0 + 0.47);
  box("darkGloss", dc - 0.75, dc - 0.5, 0.755, 0.767, dv0 + 0.28, dv0 + 0.46);
  box("emitBlue", dc - 0.56, dc - 0.54, 0.767, 0.769, dv0 + 0.31, dv0 + 0.33);
  F.cyl(kit, "metal", dc + 0.55, 0.805, dv0 + 0.3, 0.04, 0.1, "y", midM);
  box("paintedMetal", dc - 0.15, dc + 0.15, 0.755, 0.77, dv1 - 0.3, dv1 - 0.12, black);
  box("paintedMetal", dc - 0.03, dc + 0.03, 0.77, 1.0, dv1 - 0.22, dv1 - 0.18, black);
  F.display(kit, dc, 1.18, dv1 - 0.2, "-v", "terminal", captain ? 0.7 : 0.6, { bezel: 0.03, depth: 0.035 });
  F.cyl(kit, "paintedMetal", du1 - 0.25, 0.975, dv1 - 0.2, 0.015, 0.44, "y", black);
  box("paintedMetal", du1 - 0.25, du1 - 0.19, 1.19, 1.21, dv1 - 0.55, dv1 - 0.2, black);
  box("paintedMetal", du1 - 0.36, du1 - 0.14, 1.15, 1.2, dv1 - 0.62, dv1 - 0.46, black);
  box("emitAmber", du1 - 0.34, du1 - 0.16, 1.14, 1.15, dv1 - 0.6, dv1 - 0.48);
  F.cyl(kit, "paintedMetal", du1 - 0.25, 0.765, dv1 - 0.2, 0.07, 0.02, "y", black);
  // status strip on the bulkhead over the desk (officers) instead of a dashboard
  if (!captain) {
    box("paintedMetal", dc - 0.5, dc + 0.5, 0.95, 1.05, pv0 - 0.04, pv0, black);
    for (let i = 0; i < 8; i++) box(i % 3 === 0 ? "emitRedImp" : "emitAmber", dc - 0.42 + i * 0.12, dc - 0.36 + i * 0.12, 0.985, 1.015, pv0 - 0.045, pv0 - 0.04);
  }
  // desk chair on the door side, facing the desk: metal pedestal, chamfered fabric seat + back, armrests
  const cu = dc;
  const cv = dv0 - 0.45;
  F.cyl(kit, "paintedMetal", cu, 0.02, cv, 0.22, 0.04, "y", { ...black, segments: 10 });
  F.cyl(kit, "metal", cu, 0.25, cv, 0.035, 0.42, "y", { ...midM, segments: 8 });
  box("paintedMetal", cu - 0.25, cu + 0.25, 0.44, 0.48, cv - 0.24, cv + 0.24, black);
  rbox("fabric", cu - 0.25, cu + 0.25, 0.48, 0.56, cv - 0.24, cv + 0.24, 0.03, fab(IMP.mid));
  box("paintedMetal", cu - 0.22, cu + 0.22, 0.56, 0.62, cv - 0.28, cv - 0.24, black);
  rbox("fabric", cu - 0.24, cu + 0.24, 0.62, 1.06, cv - 0.3, cv - 0.22, 0.03, fab(IMP.mid));
  for (const s of [-1, 1]) box("metal", cu + s * 0.25, cu + s * 0.29, 0.5, 0.74, cv - 0.22, cv + 0.14, midM);
  col(cu - 0.3, cu + 0.3, 0, 1.06, cv - 0.3, cv + 0.26, "chair");

  // --- locker on the door wall: vents, seam, handle, label
  box("impPanel", 0.4, 1.4, 0.0, 2.1, 0.0, 0.6, clean(IMP.dark));
  box("paintedMetal", 0.4, 1.4, 2.1, 2.14, 0.0, 0.62, black);
  box("paintedMetal", 0.895, 0.905, 0.05, 2.05, 0.6, 0.61, black);
  for (let i = 0; i < 3; i++) box("metal", 0.5, 0.85, 1.75 + i * 0.08, 1.77 + i * 0.08, 0.6, 0.615, midM);
  for (let i = 0; i < 3; i++) box("metal", 0.95, 1.3, 1.75 + i * 0.08, 1.77 + i * 0.08, 0.6, 0.615, midM);
  box("metal", 0.82, 0.86, 0.95, 1.2, 0.6, 0.64, midM);
  box("metal", 0.94, 0.98, 0.95, 1.2, 0.6, 0.64, midM);
  F.plate(kit, 1.15, 1.45, 0.61, "+v", 0.16, 0.16, 6);
  col(0.4, 1.4, 0, 2.14, 0, 0.62, "locker");

  // --- shelf unit on the u=0 wall with objects
  const shelfV0 = captain ? 3.0 : 2.0;
  const shelfV1 = captain ? 4.2 : 4.0;
  const shelfN = captain ? 2 : 2 + Math.floor(rand() * 2);
  for (let s = 0; s < shelfN; s++) {
    const y = 1.25 + s * 0.45;
    box("metal", 0, 0.28, y, y + 0.03, shelfV0, shelfV1, midM);
    box("paintedMetal", 0, 0.26, y - 0.14, y, shelfV0 + 0.02, shelfV0 + 0.06, black);
    box("paintedMetal", 0, 0.26, y - 0.14, y, shelfV1 - 0.06, shelfV1 - 0.02, black);
    const n = 2 + Math.floor(rand() * 4);
    let v = shelfV0 + 0.15 + rand() * 0.3;
    for (let k = 0; k < n && v < shelfV1 - 0.2; k++) {
      const kind = rand();
      if (kind < 0.4) {
        const w = 0.04 + rand() * 0.05;
        box("fabric", 0.04, 0.24, y + 0.03, y + 0.2 + rand() * 0.1, v, v + w, fab([IMP.dark, IMP.mid, IMP.white, IMP.grey][Math.floor(rand() * 4)]));
        v += w + 0.01;
      } else if (kind < 0.7) {
        box("darkGloss", 0.05, 0.22, y + 0.03, y + 0.12 + rand() * 0.08, v, v + 0.14 + rand() * 0.12);
        v += 0.32;
      } else {
        F.cyl(kit, "metal", 0.14, y + 0.11, v + 0.08, 0.06, 0.16, "y", midM);
        v += 0.24;
      }
    }
  }

  // --- wardrobe on the back wall (v=V) between the trunk and the bulkhead leg: carcass with one leaf slid open,
  // revealing a dark recess with a rail, hanging uniforms and a folded stack; the other leaf closed with a
  // handle — the focal point at the end of the walkway between the rug and the bulkhead
  {
    const [w0, w1] = wardU;
    const wd = 0.58;
    const wm = (w0 + w1) / 2;
    box("paintedMetal", w0 - 0.02, w1 + 0.02, 0.0, 0.1, V - wd - 0.01, V, black); // plinth
    box("impPanel", w0 - 0.02, w0, 0.1, 2.05, V - wd, V, clean(IMP.dark)); // sides
    box("impPanel", w1, w1 + 0.02, 0.1, 2.05, V - wd, V, clean(IMP.dark));
    box("impPanel", w0 - 0.02, w1 + 0.02, 2.05, 2.1, V - wd - 0.01, V, clean(IMP.dark)); // top
    box("impPanel", w0, w1, 0.1, 2.05, V - 0.03, V, { color: 0x08090b, texel: 1 }); // back (near-black: recess depth)
    // closed leaf (u wm..w1) with a seam, handle and a small label
    box("impPanel", wm + 0.005, w1 - 0.005, 0.12, 2.03, V - wd - 0.02, V - wd, clean(IMP.mid));
    box("metal", wm + 0.05, wm + 0.09, 0.95, 1.25, V - wd - 0.05, V - wd - 0.02, midM);
    F.plate(kit, (wm + w1) / 2, 1.6, V - wd - 0.02, "-v", 0.14, 0.14, 6);
    // open half: leaf slid behind the closed one (its edge shows), rail, three hanging tunics, folded stack + boots
    box("impPanel", wm - 0.06, wm, 0.12, 2.03, V - wd - 0.005, V - wd + 0.015, clean(IMP.mid));
    F.cyl(kit, "metal", wm - 0.02, 1.8, V - wd / 2, 0.012, wm - w0 - 0.08, "u", { ...midM, segments: 8 });
    for (let i = 0; i < 3; i++) {
      const hu = w0 + 0.12 + i * 0.13;
      box("metal", hu - 0.005, hu + 0.005, 1.76, 1.8, V - wd / 2 - 0.01, V - wd / 2 + 0.01, midM);
      box("fabric", hu - 0.035, hu + 0.035, 0.85, 1.76, V - wd / 2 - 0.2, V - wd / 2 + 0.2, fab(i === 1 ? IMP.mid : IMP.dark));
      box("fabric", hu - 0.03, hu + 0.03, 1.55, 1.76, V - wd / 2 - 0.22, V - wd / 2 + 0.22, fab(i === 1 ? IMP.mid : IMP.dark));
    }
    box("metal", w0 + 0.02, wm - 0.08, 0.6, 0.62, V - wd + 0.06, V - 0.04, midM); // shelf
    rbox("fabric", w0 + 0.08, w0 + 0.36, 0.62, 0.72, V - wd + 0.12, V - 0.12, 0.02, fab(IMP.grey));
    rbox("fabric", w0 + 0.1, w0 + 0.34, 0.72, 0.8, V - wd + 0.14, V - 0.14, 0.02, fab(IMP.mid));
    box("paintedMetal", w0 + 0.08, w0 + 0.2, 0.1, 0.36, V - wd + 0.1, V - 0.08, black); // boots
    box("paintedMetal", w0 + 0.24, w0 + 0.36, 0.1, 0.36, V - wd + 0.08, V - 0.1, black);
    col(w0 - 0.02, w1 + 0.02, 0, 2.1, V - wd - 0.02, V, "wardrobe");
  }
  // --- mirror with a metal frame and a small shelf with two objects on the u=0 wall (between shelves and bunk head)
  {
    const mv = captain ? 5.4 : 5.0;
    F.mount(kit, "metal", 0, 1.6, mv, "+u", 0.5, 0.72, 0, 0.025, midM);
    F.mount(kit, "darkGloss", 0, 1.6, mv, "+u", 0.44, 0.66, 0.025, 0.032);
    F.mount(kit, "paintedMetal", 0, 1.13, mv, "+u", 0.56, 0.03, 0, 0.22, black);
    F.mount(kit, "paintedMetal", 0, 1.08, mv, "+u", 0.56, 0.08, 0, 0.03, dark);
    F.cyl(kit, "metal", 0.11, 1.2, mv - 0.14, 0.035, 0.11, "y", { ...midM, segments: 10 });
    box("darkGloss", 0.05, 0.18, 1.145, 1.21, mv + 0.04, mv + 0.2);
    box("emitBlue", 0.09, 0.14, 1.21, 1.213, mv + 0.09, mv + 0.15);
  }

  // --- fresher hatch on the u=U wall: recessed frame, closed leaf, status dot, label
  box("impPanel", U - 0.07, U, 0, 2.08, 0.92, 1.98, clean(IMP.black));
  box("impPanel", U - 0.11, U - 0.07, 0.02, 2.0, 1.0, 1.9, clean(IMP.mid));
  box("paintedMetal", U - 0.115, U - 0.11, 0.04, 1.98, 1.44, 1.46, black);
  box("paintedMetal", U - 0.115, U - 0.11, 1.0, 1.02, 1.05, 1.85, black);
  box("metal", U - 0.14, U - 0.11, 0.95, 1.15, 1.08, 1.12, midM);
  box("paintedMetal", U - 0.05, U, 1.55, 1.75, 2.08, 2.2, black);
  box("emitBlue", U - 0.055, U - 0.05, 1.6, 1.7, 2.1, 2.18);
  F.plate(kit, U, 2.3, 1.45, "-u", 0.22, 0.22, 8);
  vent(kit, F.P(U, 2.6, captain ? 6.3 : 4.4), F.nrm("-u"));

  // --- seating: settee on the u=U wall + rug with a low table and an armchair on the right, kit bag and boots by
  // the settee (officers); armchair pair with a table and lamp on the rug, sideboard on the u=U wall, hard case
  // and boots by the wall (captain)
  if (!captain) {
    // settee: open steel frame on six legs (the plinth gap shows the floor), black rail, two split seat cushions
    // and two taller back cushions under a steel top rail — the observation benches' construction (critic round 4:
    // "box-on-box")
    const su0 = U - 0.75;
    const su1 = U - 0.06;
    for (const u of [su0 + 0.06, su1 - 0.08]) for (const v of [3.08, 3.9, 4.72]) F.cyl(kit, "metal", u, 0.15, v, 0.03, 0.3, "y", { ...STEEL, segments: 8 });
    box("metal", su0 + 0.045, su0 + 0.075, 0.13, 0.16, 3.08, 4.72, STEEL); // front stretcher between the legs
    box("impPanel", su0, su1, 0.3, 0.36, 3.02, 4.78, clean(IMP.black));
    box("metal", su0 - 0.01, su1 + 0.01, 0.34, 0.36, 3.0, 4.8, STEEL);
    for (const [a, b] of [
      [3.06, 3.88],
      [3.92, 4.74],
    ]) {
      rbox("fabric", su0 + 0.03, su1 - 0.14, 0.36, 0.48, a, b, 0.04, fab(IMP.mid));
      rbox("fabric", su1 - 0.14, su1 - 0.02, 0.48, 0.96, a + 0.01, b - 0.01, 0.04, fab(IMP.mid));
    }
    box("impPanel", su1 - 0.04, su1 + 0.02, 0.36, 0.9, 3.02, 4.78, clean(IMP.black));
    box("metalRough", su1 - 0.16, su1 + 0.02, 0.96, 0.98, 3.0, 4.8, STEEL);
    for (const [a, b] of [
      [2.96, 3.06],
      [4.74, 4.84],
    ]) {
      box("impPanel", su0 + 0.02, su1, 0.36, 0.6, a, b, clean(IMP.black));
      box("metal", su0 + 0.01, su1 + 0.01, 0.6, 0.62, a - 0.005, b + 0.005, STEEL);
    }
    col(su0 - 0.02, su1 + 0.02, 0, 0.98, 2.96, 4.84, "settee");
    amberBar(kit, F.P(U, 1.75, 3.9), F.nrm("-u"));
    rug(1.2, 3.45, 2.5, 5.3);
    lowTable(2.3, 3.0, 3.1, 3.8, 0.42, true);
    armchair(1.4, 2.75, "-u");
    kitBag(6.45, 3.1, 3.85);
    boots(5.96, 3.35);
  } else {
    rug(0.85, 3.45, 2.55, 5.95);
    armchair(1.55, 3.0, "-v");
    armchair(1.55, 5.05, "+v");
    lowTable(1.15, 2.65, 3.95, 4.8, 0.45, false);
    box("darkGloss", 1.35, 1.65, 0.45, 0.46, 4.05, 4.3);
    F.cyl(kit, "metal", 2.35, 0.51, 4.65, 0.05, 0.12, "y", midM);
    F.cyl(kit, "metal", 2.35, 0.51, 4.15, 0.05, 0.12, "y", midM);
    // table lamp: post + amber shade
    F.cyl(kit, "paintedMetal", 1.9, 0.62, 4.4, 0.015, 0.34, "y", black);
    box("paintedMetal", 1.78, 2.02, 0.78, 0.9, 4.28, 4.52, black);
    box("emitAmber", 1.8, 2.0, 0.77, 0.78, 4.3, 4.5);
    box("emitAmber", 1.79, 2.01, 0.8, 0.88, 4.29, 4.51);
    // personal log panel on the u=U wall over the sideboard, pennant beside the hatch
    F.display(kit, U, 1.75, 3.5, "-u", "log", 0.6, { bezel: 0.04, depth: 0.03 });
    box("fabric", U - 0.04, U, 1.3, 2.6, 2.3, 2.7, fab(IMP.dark));
    box("paintedMetal", U - 0.045, U - 0.04, 1.55, 1.65, 2.3, 2.7, { color: IMP.red, texel: 2 });
    box("paintedMetal", U - 0.045, U - 0.04, 2.0, 2.3, 2.35, 2.65, { color: IMP.grey, texel: 2 });
    // sideboard with decanter + glasses
    box("impPanel", U - 0.5, U - 0.02, 0.0, 0.9, 4.95, 6.55, clean(IMP.dark));
    box("darkGloss", U - 0.52, U, 0.9, 0.93, 4.93, 6.57);
    box("paintedMetal", U - 0.51, U - 0.5, 0.1, 0.8, 5.72, 5.78, black);
    box("metal", U - 0.53, U - 0.5, 0.45, 0.5, 5.35, 5.6, midM);
    box("metal", U - 0.53, U - 0.5, 0.45, 0.5, 5.9, 6.15, midM);
    col(U - 0.52, U, 0, 0.93, 4.93, 6.57, "sideboard");
    F.cyl(kit, "darkGloss", U - 0.3, 1.05, 5.2, 0.07, 0.24, "y");
    for (let i = 0; i < 3; i++) F.cyl(kit, "metal", U - 0.28, 0.98, 5.5 + i * 0.18, 0.035, 0.1, "y", midM);
    box("darkGloss", U - 0.4, U - 0.15, 0.93, 0.945, 6.1, 6.4);
    amberBar(kit, F.P(U, 1.9, 5.75), F.nrm("-u"));
    hardCase(U - 0.65, 3.55);
    boots(U - 1.1, 3.45);
    // --- back wall (v=V): arms rack, framed schematic + rank plaque over the bulkhead (wardrobe recess beside)
    F.display(kit, 5.0, 1.95, V, "-v", "schematic", 0.74, { bezel: 0.04, depth: 0.03, frame: "darkGloss" });
    F.mount(kit, "darkGloss", 5.0, 1.46, V, "-v", 0.42, 0.2, 0, 0.02);
    F.display(kit, 5.0, 1.46, V, "-v", "plate0", 0.32, { bezel: 0.01, depth: 0.025 });
    // arms rack: dark backplate, two rifles on clips, status dot
    box("paintedMetal", 6.0, 6.9, 1.4, 2.2, V - 0.05, V, black);
    box("metal", 6.05, 6.85, 1.45, 2.15, V - 0.06, V - 0.05, midM);
    for (const yy of [1.65, 1.97]) {
      box("paintedMetal", 6.1, 6.85, yy - 0.03, yy + 0.03, V - 0.12, V - 0.06, black);
      box("paintedMetal", 6.1, 6.3, yy - 0.05, yy + 0.02, V - 0.13, V - 0.06, { color: IMP.hullDark, texel: 2 });
      box("paintedMetal", 6.4, 6.5, yy - 0.06, yy - 0.03, V - 0.1, V - 0.06, black);
      box("metal", 6.2, 6.24, yy - 0.04, yy + 0.04, V - 0.14, V - 0.04, midM);
      box("metal", 6.55, 6.59, yy - 0.04, yy + 0.04, V - 0.14, V - 0.04, midM);
    }
    box("emitRedImp", 6.77, 6.87, 1.47, 1.5, V - 0.06, V - 0.05);
    // right wall (u=0): pennant beside the shelves, lamp by the bunk head
    box("fabric", 0, 0.04, 1.3, 2.6, 4.7, 5.1, fab(IMP.dark));
    box("paintedMetal", 0.04, 0.045, 1.55, 1.65, 4.7, 5.1, { color: IMP.red, texel: 2 });
    box("paintedMetal", 0.04, 0.045, 2.0, 2.3, 4.75, 5.05, { color: IMP.grey, texel: 2 });
    box("metal", 0, 0.08, 2.6, 2.64, 4.65, 5.15, midM);
    amberBar(kit, F.P(0, 1.9, 6.45), F.nrm("+u"));
  }

  // --- personal items (3–4 per cabin, drawn from a pool; the trunk, boots and bag are fixed dressing now)
  const items = [
    () => {
      // uniform hanging on the locker side
      box("metal", 1.45, 1.75, 1.85, 1.87, 0.15, 0.55, midM);
      box("fabric", 1.5, 1.72, 0.6, 1.84, 0.28, 0.4, fab(IMP.dark));
      box("fabric", 1.55, 1.67, 1.5, 1.84, 0.4, 0.44, fab(IMP.dark));
    },
    () => {
      // stack of data pads on the desk
      for (let i = 0; i < 3; i++) box("darkGloss", dc + 0.3 + i * 0.02, dc + 0.55 + i * 0.02, 0.755 + i * 0.012, 0.767 + i * 0.012, dv1 - 0.62 - i * 0.015, dv1 - 0.44 - i * 0.015);
    },
    () => {
      // holo frame on the desk
      box("paintedMetal", dc - 0.32, dc - 0.2, 0.755, 0.87, dv1 - 0.24, dv1 - 0.22, black);
      box("emitBlue", dc - 0.3, dc - 0.22, 0.77, 0.86, dv1 - 0.245, dv1 - 0.24);
    },
    () => {
      // wall poster near the locker
      F.plate(kit, 2.1, 1.65, 0, "+v", 0.5, 0.5, 4);
    },
    () => {
      // exercise mat rolled on the floor along the bulkhead leg
      F.cyl(kit, "fabric", 4.28, 0.09, 6.4, 0.09, 1.6, "v", fab(IMP.black));
    },
    () => {
      // personal log panel on the u=0 wall
      F.display(kit, 0, 2.2, 4.7, "+u", "log", 0.45, { bezel: 0.02, depth: 0.03 });
    },
  ];
  const order = items.map((f, i) => i).sort(() => rand() - 0.5);
  const nItems = captain ? 3 : 2 + Math.floor(rand() * 2);
  let placed = 0;
  for (let i = 0; i < order.length && placed < nItems; i++) {
    if (captain && order[i] === 5) continue; // the captain's u=0 wall is fully dressed
    items[order[i]]();
    placed++;
  }

  // --- ceiling: the cabin's own slab 5 mm under the shell ceiling in a lighter clean-panel tint (the shell's
  // near-black panels only read under E ≳ 10), three cross beams with a steel edge line — the first crosses the
  // top of the door view just in front of the luminaire (critic round 4: "the ceiling slab above the camera is
  // bare"), two cable trays running door-to-back-wall under the beams either side of the luminaire, and the vent
  // grille moved from over the door (out of every view) to beside the luminaire.
  box("impPanel", 0.04, U - 0.04, H - 0.03, H - 0.005, 0.04, V - 0.04, clean(IMP.grey, 0.5));
  for (const bv of [3.5, 4.85, 6.2]) {
    box("impPanel", 0.04, U - 0.04, H - 0.21, H - 0.03, bv - 0.14, bv + 0.14, clean(IMP.dark));
    box("metal", 0.1, U - 0.1, H - 0.215, H - 0.21, bv - 0.025, bv + 0.025, midM);
  }
  for (const tu of [1.7, U - 1.8]) {
    const yb = H - 0.36;
    box("metalRough", tu - 0.16, tu + 0.16, yb, yb + 0.02, 0.3, V - 0.3, midM);
    for (const s of [-1, 1]) box("metalRough", tu + Math.min(s * 0.16, s * 0.14), tu + Math.max(s * 0.16, s * 0.14), yb, yb + 0.08, 0.3, V - 0.3, midM);
    box("impPanel", tu - 0.1, tu + 0.02, yb + 0.02, yb + 0.06, 0.5, V - 0.5, clean(IMP.black));
    box("impPanel", tu + 0.03, tu + 0.11, yb + 0.02, yb + 0.05, 0.4, V - 0.4, clean(IMP.dark));
    for (const hv of [1.0, 2.7, 4.3, 5.6, 7.2]) {
      box("impPanel", tu - 0.02, tu + 0.02, yb + 0.08, H - 0.03, hv - 0.015, hv + 0.015, clean(IMP.black));
      box("impPanel", tu - 0.18, tu + 0.18, yb + 0.08, yb + 0.11, hv - 0.02, hv + 0.02, clean(IMP.black));
    }
  }
  box("paintedMetal", doorU + 1.03, doorU + 1.67, H - 0.06, H - 0.03, 3.9, 4.3, black);
  for (let i = 0; i < 4; i++) box("metal", doorU + 1.07, doorU + 1.63, H - 0.07, H - 0.06, 3.94 + i * 0.09, 3.97 + i * 0.09, midM);
  // --- ceiling luminaire: closed black housing hung 0.32 m below the ceiling on two rods, lens on its underside
  // (0.3 × 0.9 m ≈ 40 % of the old flush diffuser) behind three louvre bars. The room's spot descriptor sits inside
  // the housing (see `lamp` below): every housing face points away from it, so nothing near the source blows out
  // (critic round 2: "ceiling lamp is a blown warm blob").
  const lx = wx(V / 2 - 0.25, V / 2 + 0.25);
  const lz = wz(U / 2 - 0.55, U / 2 + 0.55);
  const lTop = ceilY - 0.32;
  const lBot = ceilY - 0.54;
  for (const z of [lz[0] + 0.2, lz[1] - 0.2]) kit.cyl("metal", (lx[0] + lx[1]) / 2, (ceilY + lTop) / 2, z, 0.012, ceilY - lTop, "y", { ...midM, segments: 8 });
  kit.boxMM("paintedMetal", [lx[0], lBot, lz[0]], [lx[1], lTop, lz[1]], black);
  kit.boxMM("metal", [lx[0] - 0.01, lBot + 0.05, lz[0] - 0.01], [lx[1] + 0.01, lBot + 0.07, lz[1] + 0.01], midM);
  kit.boxMM("offLamp", [lx[0] + 0.1, lBot - 0.006, lz[0] + 0.1], [lx[1] - 0.1, lBot, lz[1] - 0.1], { uv: "keep" });
  for (let i = 1; i <= 3; i++) {
    const z = lz[0] + 0.1 + (i * (lz[1] - lz[0] - 0.2)) / 4;
    kit.boxMM("metal", [lx[0] + 0.1, lBot - 0.008, z - 0.012], [lx[1] - 0.1, lBot - 0.004, z + 0.012], midM);
  }
  // cornice boards on the u walls keep the tall walls from reading bare
  box("impPanel", U - 0.04, U, H - 0.32, H - 0.03, 0.05, V - 0.05, clean(IMP.dark));
  box("impPanel", 0, 0.04, H - 0.32, H - 0.03, 0.05, V - 0.05, clean(IMP.dark));

  const centre = F.P(U / 2, 0, V / 2);
  return { center: centre, lamp: [centre[0], (lTop + lBot) / 2, centre[2]], uplight, F };
}
