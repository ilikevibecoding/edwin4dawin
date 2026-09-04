// One officer's cabin, varied by seed (mirrored layout, bedding colours, personal items). The captain's
// suite is the same function with a seating pair, a larger desk, wardrobe / arms rack / schematic wall,
// a sleeping-area floor inset and a sideboard.
// Layout (critic round 3, "reads as a hall with a bed"): bunk + nightstand + wardrobe along the back wall,
// the desk in the room's centre-left facing a half-height L-shaped bulkhead (metal cap, lit edge, housed
// uplight in the cap) that walls the desk zone off from the sleeping zone, a charcoal rug with an amber border
// on the right carrying a low table (officers) or the armchair pair (captain), and the cabin's own ceiling
// slab with two cross beams and a vent grille so the ceiling reads as a surface under the uplight.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { FLOOR } from "../shared/plan.js";
import { IMP } from "../shared/palette.js";
import { amberBar, junctionBox, makeFrame, rng, vent, wainscot } from "./lib.js";

// dark bedding only (the light sheet read as a flat white slab under the ceiling lamp)
const BLANKETS = [IMP.dark, IMP.hullDark, IMP.mid];
// impPanel tint for surfaces that used to be paintedMetal (worn-metal chips read as stains above knee height)
const CLEAN = 0.47;
const clean = (c, texel = 1) => ({ color: c.clone().multiplyScalar(CLEAN), texel });
// rug field: charcoal (the warm-grey field read as a peach untextured plane)
const CHARCOAL = new THREE.Color(0x2b2d32);

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
  const blanket = BLANKETS[Math.floor(rand() * BLANKETS.length)];
  const box = (mat, u0, u1, y0, y1, v0, v1, opts) => F.box(kit, mat, u0, u1, y0, y1, v0, v1, opts);
  const col = (u0, u1, y0, y1, v0, v1, tag) => F.col(kit, u0, u1, y0, y1, v0, v1, tag);
  const dark = { color: IMP.dark, texel: 1 };
  const black = { color: IMP.black, texel: 1 };
  const midM = { color: IMP.mid, texel: 2 };
  const fab = (c, texel = 2) => ({ color: c, texel });
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
  // low table: black pedestal, gloss top, a datapad and two cups
  const lowTable = (u0, u1, v0, v1, h = 0.42) => {
    const uc = (u0 + u1) / 2;
    const vc = (v0 + v1) / 2;
    box("paintedMetal", uc - 0.15, uc + 0.15, 0.0, h - 0.03, vc - 0.15, vc + 0.15, black);
    box("paintedMetal", uc - 0.25, uc + 0.25, 0.0, 0.03, vc - 0.25, vc + 0.25, black);
    box("darkGloss", u0, u1, h - 0.03, h, v0, v1);
    box("metal", u0 - 0.01, u1 + 0.01, h - 0.035, h - 0.03, v0 - 0.01, v1 + 0.01, midM);
    col(u0, u1, 0, h, v0, v1, "table");
    box("darkGloss", uc - 0.13, uc + 0.12, h, h + 0.012, vc - 0.16, vc + 0.02);
    box("emitBlue", uc + 0.08, uc + 0.1, h + 0.012, h + 0.014, vc - 0.12, vc - 0.1);
    F.cyl(kit, "metal", uc + 0.22, h + 0.045, vc + 0.14, 0.035, 0.09, "y", midM);
    F.cyl(kit, "metal", uc - 0.2, h + 0.045, vc + 0.18, 0.035, 0.09, "y", midM);
  };

  // --- wall treatment: dark wainscot on all four faces, pelmet over the door wall hides the corridor strip
  const wz = (u0, u1) => [Math.min(F.Z(u0), F.Z(u1)), Math.max(F.Z(u0), F.Z(u1))];
  const wx = (v0, v1) => [Math.min(F.X(v0), F.X(v1)), Math.max(F.X(v0), F.X(v1))];
  const wardU = [3.35, 4.35]; // wardrobe on the back wall between the nightstand and the bulkhead leg
  wainscot(kit, { axis: "z", at: F.X(0), from: F.Z(0), to: F.Z(U), n: F.nrm("+v"), gaps: [wz(doorU - 0.85, doorU + 0.85), wz(0.35, 1.45)] });
  wainscot(kit, { axis: "z", at: F.X(V), from: F.Z(0), to: F.Z(U), n: F.nrm("-v"), gaps: [wz(wardU[0] - 0.05, wardU[1] + 0.05)] });
  wainscot(kit, { axis: "x", at: F.Z(0), from: F.X(0), to: F.X(V), n: F.nrm("+u"), gaps: [] });
  wainscot(kit, { axis: "x", at: F.Z(U), from: F.X(0), to: F.X(V), n: F.nrm("-u"), gaps: [wx(0.9, 2.0)] });
  box("impPanel", 0.02, U - 0.02, 1.98, 2.32, 0, 0.05, clean(IMP.dark));
  // inner door frame (heavy, recessed look) + threshold
  box("paintedMetal", doorU - 0.8, doorU - 0.6, 0, 2.5, 0, 0.08, black);
  box("paintedMetal", doorU + 0.6, doorU + 0.8, 0, 2.5, 0, 0.08, black);
  box("paintedMetal", doorU - 0.8, doorU + 0.8, 2.2, 2.5, 0, 0.08, black);
  box("metal", doorU - 0.6, doorU + 0.6, 0, 0.01, 0.03, 0.35, midM);
  // nameplate inside the door, junction box on the other side
  F.display(kit, doorU + 1.3, 1.5, 0, "+v", plateName, 0.32, { bezel: 0.02, depth: 0.03 });
  junctionBox(kit, F.P(doorU - 1.2, 1.5, 0), F.nrm("+v"), rand() < 0.5 ? "emitRedImp" : "emitBlue");

  // --- bunk against the outer wall: frame on four legs (plinth gap), dark mattress + bedding, chamfered pillow,
  // folded blanket at the foot, cabinet above
  const bw = captain ? 1.25 : 1.0;
  if (captain) {
    // sleeping-area floor inset (3 × 1.8 m) with a metal edge
    box("darkGloss", 0.3, 3.3, 0.0, 0.008, V - 1.8, V - 0.02);
    box("metal", 0.3, 3.3, 0.0, 0.012, V - 1.8, V - 1.77, midM);
    box("metal", 0.3, 0.33, 0.0, 0.012, V - 1.8, V - 0.02, midM);
    box("metal", 3.27, 3.3, 0.0, 0.012, V - 1.8, V - 0.02, midM);
  }
  for (const u of [0.55, 2.45]) for (const v of [V - bw + 0.08, V - 0.08]) F.cyl(kit, "metal", u, 0.07, v, 0.03, 0.14, "y", { ...midM, segments: 8 });
  box("paintedMetal", 0.45, 2.55, 0.14, 0.3, V - bw, V, dark);
  box("metal", 0.44, 2.56, 0.29, 0.31, V - bw - 0.015, V - bw + 0.03, midM);
  box("metal", 0.44, 0.46, 0.29, 0.31, V - bw - 0.015, V, midM);
  box("metal", 2.54, 2.56, 0.29, 0.31, V - bw - 0.015, V, midM);
  // drawer fronts in the frame (below knee height: worn metal is fine here)
  for (const [a, b] of [
    [0.55, 1.45],
    [1.55, 2.45],
  ]) {
    box("paintedMetal", a, b, 0.16, 0.28, V - bw - 0.012, V - bw, black);
    box("metal", a + 0.3, b - 0.3, 0.21, 0.23, V - bw - 0.03, V - bw - 0.012, midM);
  }
  box("fabric", 0.47, 2.53, 0.3, 0.44, V - bw + 0.02, V - 0.02, fab(IMP.dark)); // mattress
  rbox("fabric", 1.05, 2.5, 0.43, 0.5, V - bw + 0.03, V - 0.03, 0.03, fab(blanket)); // tucked blanket
  rbox("fabric", 1.05, 1.32, 0.5, 0.53, V - bw + 0.05, V - 0.05, 0.015, fab(IMP.dark)); // turned-down sheet edge
  rbox("fabric", 0.52, 1.0, 0.44, 0.55, V - bw + 0.1, V - 0.1, 0.045, fab(IMP.grey)); // pillow
  rbox("fabric", 2.02, 2.46, 0.5, 0.6, V - bw + 0.18, V - 0.18, 0.035, fab(IMP.mid)); // folded blanket
  rbox("fabric", 2.06, 2.42, 0.6, 0.68, V - bw + 0.22, V - 0.22, 0.03, fab(IMP.mid));
  col(0.45, 2.55, 0, 0.6, V - bw, V, "bunk");
  // wall cabinet above the bunk: carcass, two doors with handles and a label, warm reading light in a rail under
  // it (critic round 3: the open niche read as a dead screen)
  box("impPanel", 0.45, 2.55, 1.55, 2.3, V - 0.36, V, clean(IMP.dark));
  box("paintedMetal", 0.43, 2.57, 2.3, 2.34, V - 0.37, V, black);
  for (const [a, b] of [
    [0.48, 1.48],
    [1.52, 2.52],
  ]) {
    box("impPanel", a, b, 1.58, 2.27, V - 0.372, V - 0.36, clean(IMP.mid));
    box("paintedMetal", a, b, 1.58, 1.61, V - 0.376, V - 0.372, black);
  }
  box("metal", 1.42, 1.46, 1.8, 2.05, V - 0.4, V - 0.372, midM);
  box("metal", 1.54, 1.58, 1.8, 2.05, V - 0.4, V - 0.372, midM);
  F.plate(kit, 2.15, 2.1, V - 0.372, "-v", 0.14, 0.14, 6);
  box("paintedMetal", 0.5, 2.5, 1.49, 1.55, V - 0.34, V - 0.04, black);
  box("offLamp", 0.6, 2.4, 1.485, 1.49, V - 0.3, V - 0.1, { uv: "keep" });
  // headboard panel on the u=0 wall
  box("impPanel", 0, 0.05, 0.2, 1.4, V - bw - 0.15, V - 0.02, clean(IMP.dark));
  // nightstand + item
  box("paintedMetal", 2.7, 3.2, 0.0, 0.5, V - 0.55, V, dark);
  box("darkGloss", 2.72, 3.18, 0.5, 0.52, V - 0.53, V - 0.02);
  col(2.7, 3.2, 0, 0.52, V - 0.55, V, "nightstand");
  box("paintedMetal", 2.85, 3.05, 0.52, 0.54, V - 0.4, V - 0.15, black);
  box("emitBlue", 2.88, 3.02, 0.54, 0.545, V - 0.38, V - 0.17);

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
  box("impPanel", legU, pu1, 0.12, ph, pv0, pv1, clean(IMP.dark));
  box("impPanel", legU, legU + 0.12, 0.12, ph, pv1, V - 0.02, clean(IMP.dark));
  box("paintedMetal", legU - 0.01, pu1 + 0.01, 0, 0.12, pv0 - 0.01, pv1 + 0.01, black);
  box("paintedMetal", legU - 0.01, legU + 0.13, 0, 0.12, pv1, V - 0.02, black);
  box("metal", legU - 0.02, pu1 + 0.02, ph, ph + 0.03, pv0 - 0.02, pv1 + 0.02, midM);
  box("metal", legU - 0.02, legU + 0.14, ph, ph + 0.03, pv1, V - 0.02, midM);
  box("emitWarm", legU + 0.06, pu1 - 0.06, ph - 0.06, ph - 0.045, pv0 - 0.012, pv0);
  box("emitWarm", legU - 0.012, legU, ph - 0.06, ph - 0.045, pv1 + 0.06, V - 0.1);
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
  // desk: black frame + gloss top, pedestal on the right, leg on the left, modesty panel on the bulkhead side
  box("paintedMetal", du0, du1, 0.7, 0.72, dv0, dv1, black);
  box("darkGloss", du0 - 0.02, du1 + 0.02, 0.72, 0.755, dv0 - 0.02, dv1 + 0.02);
  box("paintedMetal", du1 - 0.55, du1 - 0.05, 0.0, 0.7, dv0 + 0.05, dv1 - 0.03, dark);
  box("paintedMetal", du1 - 0.5, du1 - 0.1, 0.12, 0.3, dv0 + 0.038, dv0 + 0.05, black);
  box("paintedMetal", du1 - 0.5, du1 - 0.1, 0.38, 0.56, dv0 + 0.038, dv0 + 0.05, black);
  box("impPanel", du0 + 0.05, du1 - 0.55, 0.15, 0.7, dv1 - 0.07, dv1 - 0.03, clean(IMP.dark));
  box("paintedMetal", du0 + 0.05, du0 + 0.09, 0.0, 0.7, dv0 + 0.05, dv1 - 0.03, black);
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

  // --- wardrobe on the back wall (v=V) between the nightstand and the bulkhead leg: carcass with one leaf slid
  // open, revealing a dark recess with a rail, hanging uniforms and a folded stack; the other leaf closed with a
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

  // --- seating: settee on the u=U wall + rug with a low table on the right (officers); armchair pair with a
  // table and lamp on the rug, sideboard on the u=U wall (captain)
  if (!captain) {
    // settee on legs: dark frame, two chamfered seat cushions and two back cushions in a mid tint, armrests
    for (const u of [U - 0.7, U - 0.1]) for (const v of [3.1, 4.7]) F.cyl(kit, "metal", u, 0.06, v, 0.025, 0.12, "y", { ...midM, segments: 8 });
    box("paintedMetal", U - 0.75, U - 0.05, 0.12, 0.4, 3.02, 4.78, black);
    for (const [a, b] of [
      [3.06, 3.88],
      [3.92, 4.74],
    ]) {
      rbox("fabric", U - 0.72, U - 0.2, 0.4, 0.5, a, b, 0.035, fab(IMP.mid));
      rbox("fabric", U - 0.2, U - 0.08, 0.5, 0.92, a + 0.02, b - 0.02, 0.035, fab(IMP.mid));
    }
    box("paintedMetal", U - 0.12, U - 0.05, 0.4, 0.98, 3.02, 4.78, dark);
    for (const [a, b] of [
      [3.0, 3.06],
      [4.74, 4.8],
    ]) {
      box("paintedMetal", U - 0.75, U - 0.08, 0.4, 0.62, a, b, dark);
      box("metal", U - 0.75, U - 0.08, 0.62, 0.64, a - 0.005, b + 0.005, midM);
    }
    col(U - 0.75, U - 0.05, 0, 0.98, 3.0, 4.8, "settee");
    amberBar(kit, F.P(U, 1.75, 3.9), F.nrm("-u"));
    rug(1.3, 3.9, 2.5, 5.3);
    lowTable(2.25, 2.95, 3.55, 4.25);
  } else {
    const chair = (u0, v0, dir) => {
      // dir +1: back on the +v side, faces -v; dir -1: back on the -v side, faces +v. Frame on legs, chamfered cushions
      for (const u of [u0 + 0.06, u0 + 0.64]) for (const v of [v0 + 0.06, v0 + 0.64]) F.cyl(kit, "metal", u, 0.06, v, 0.025, 0.12, "y", { ...midM, segments: 8 });
      box("paintedMetal", u0, u0 + 0.7, 0.12, 0.4, v0, v0 + 0.7, black);
      rbox("fabric", u0 + 0.03, u0 + 0.67, 0.4, 0.5, v0 + 0.03, v0 + 0.67, 0.035, fab(IMP.mid));
      const bv0 = dir > 0 ? v0 + 0.56 : v0;
      box("paintedMetal", u0, u0 + 0.7, 0.4, 1.0, dir > 0 ? bv0 + 0.1 : bv0, dir > 0 ? bv0 + 0.14 : bv0 + 0.04, dark);
      rbox("fabric", u0 + 0.03, u0 + 0.67, 0.5, 0.98, dir > 0 ? bv0 : bv0 + 0.04, dir > 0 ? bv0 + 0.1 : bv0 + 0.14, 0.035, fab(IMP.mid));
      rbox("fabric", u0, u0 + 0.1, 0.4, 0.66, v0, v0 + 0.7, 0.03, fab(IMP.dark));
      rbox("fabric", u0 + 0.6, u0 + 0.7, 0.4, 0.66, v0, v0 + 0.7, 0.03, fab(IMP.dark));
      col(u0, u0 + 0.7, 0, 1.0, v0, v0 + 0.7, "chair");
    };
    rug(0.85, 3.6, 2.55, 5.95);
    chair(1.55, 3.0, -1);
    chair(1.55, 5.05, +1);
    box("darkGloss", 1.15, 2.65, 0.42, 0.45, 3.95, 4.8);
    box("paintedMetal", 1.35, 2.45, 0.0, 0.42, 4.15, 4.6, black);
    col(1.15, 2.65, 0, 0.45, 3.95, 4.8, "table");
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

  // --- personal items (3–4 per cabin, drawn from a pool)
  const items = [
    () => {
      // footlocker with cargo label at the bunk's foot
      box("paintedMetal", 0.6, 1.4, 0.0, 0.45, V - bw - 0.75, V - bw - 0.2, { color: IMP.mid, texel: 1 });
      box("paintedMetal", 0.6, 1.4, 0.2, 0.22, V - bw - 0.76, V - bw - 0.2, black);
      F.plate(kit, 1.0, 0.33, V - bw - 0.75, "+v", 0.14, 0.14, 11);
      col(0.6, 1.4, 0, 0.45, V - bw - 0.75, V - bw - 0.2, "footlocker");
    },
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
      // boots by the bunk
      box("paintedMetal", 0.7, 0.82, 0.0, 0.28, V - bw - 0.35, V - bw - 0.05, black);
      box("paintedMetal", 0.88, 1.0, 0.0, 0.28, V - bw - 0.37, V - bw - 0.07, black);
    },
    () => {
      // bottle on the nightstand
      F.cyl(kit, "metal", 2.95, 0.62, V - 0.18, 0.035, 0.2, "y", midM);
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
      // exercise mat rolled on the floor in the walkway's corner by the wardrobe
      F.cyl(kit, "fabric", 3.4, 0.09, 6.6, 0.09, 1.6, "u", fab(IMP.black));
    },
    () => {
      // personal log panel on the u=0 wall
      F.display(kit, 0, 2.2, 4.7, "+u", "log", 0.45, { bezel: 0.02, depth: 0.03 });
    },
  ];
  const order = items.map((f, i) => i).sort(() => rand() - 0.5);
  const nItems = captain ? 4 : 3 + Math.floor(rand() * 2);
  let placed = 0;
  for (let i = 0; i < order.length && placed < nItems; i++) {
    if (captain && order[i] === 8) continue; // the captain's u=0 wall is fully dressed
    items[order[i]]();
    placed++;
  }

  // --- ceiling: the cabin's own slab 5 mm under the shell ceiling in a lighter clean-panel tint (the shell's
  // near-black panels only read under E ≳ 10), two cross beams with a steel edge line, a vent grille by the door.
  // The bulkhead uplight (E ≈ 3.5 at its peak) grades across all of it, so the ceiling reads as a surface
  // (critic round 3: "ceiling is black").
  box("impPanel", 0.04, U - 0.04, H - 0.03, H - 0.005, 0.04, V - 0.04, clean(IMP.grey, 0.5));
  for (const bv of [V / 3, (2 * V) / 3]) {
    box("impPanel", 0.04, U - 0.04, H - 0.21, H - 0.03, bv - 0.14, bv + 0.14, clean(IMP.dark));
    box("metal", 0.1, U - 0.1, H - 0.215, H - 0.21, bv - 0.025, bv + 0.025, midM);
  }
  box("paintedMetal", doorU - 0.32, doorU + 0.32, H - 0.06, H - 0.03, 1.1, 1.5, black);
  for (let i = 0; i < 4; i++) box("metal", doorU - 0.28, doorU + 0.28, H - 0.07, H - 0.06, 1.14 + i * 0.09, 1.17 + i * 0.09, midM);
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
