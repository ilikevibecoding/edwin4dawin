// d1-lobby — Deck 1 turbolift lobby. Lift anchor T1 at (0, 240, 522), dir (0,0,-1) per §6.3/§9.2: the lift door
// is on the internal wall at z = 522; the cabin volume x ±2, z 522..526, y 240..243.6 is left empty for D, and the
// wall x ±1.5..2.1 beside the door surround stays clear for D's call panel. Shell from shared/imperial.js;
// Phase 2 arrival dressing uses ../spine/dressing.js + ../spine/signage.js (atlas B carries the deck-plan and
// lift-status boards).
import * as THREE from "three";
import { BOUNDS, CEIL, FLOOR, LIFT, doorsFor } from "../shared/plan.js";
import { roomShell, wall, doorReveal } from "../shared/imperial.js";
import { LIFT_DOOR } from "../shared/doors.js";
import { IMP, LIGHT } from "../shared/palette.js";
import { signMaterials, boardMaterials, labelRect, numeralRect, chevronRect, arrowRect, LABEL_ASPECT } from "../spine/signage.js";
import { STRIP, stripMaterials } from "../spine/strip.js";
import {
  wallFrame,
  signPanel,
  boardPanel,
  chevronBand,
  floorQuad,
  ceilingFixture,
  downlight,
  lensStrip,
  led,
  intercom,
  vent,
  accessHatch,
  conduitRun,
  cableTray,
  bench,
  crates,
  fireStation,
  beacon,
  arrowToward,
  SIGN_TOP,
} from "../spine/dressing.js";

const ID = "d1-lobby";
const B = BOUNDS[ID];
const TICKS = [0.6, 0.2, -0.2, -0.6]; // deck 1..4 marks on the position indicator, left to right for a viewer facing the lift (+x is their left)
const LANE_PAINT = new THREE.Color("#c9a227"); // matte yellow floor paint (lift-queue lane), worn by paintedMetal's map
const LUMINAIRE_R = 0.5; // central ceiling drum that houses the main pool point (its lens ring is the visible source)

const manifest = {
  id: ID,
  name: "Deck 1 Lift Lobby",
  kind: "room",
  deck: 1,
  owner: "B",
  bounds: B,
  doors: doorsFor(ID),
  lift: { id: LIFT.id, pos: [...LIFT.pos], dir: [...LIFT.dir] },
  spawn: { pos: [0, FLOOR, 519.5], yaw: 0 },
  apertures: [],
  views: {
    "d1-lobby-lift": { pos: [0, FLOOR, 517], yaw: 180, pitch: -2 },
    "d1-lobby-door": { pos: [4, FLOOR, 521], yaw: 30, pitch: -2 },
    "d1-lobby-side": { pos: [-6.4, FLOOR, 518.3], yaw: -68, pitch: -3 }, // from the port bench: blast-door wall (bench, directory), plan board, lift wall
    "d1-lobby-indicator": { pos: [0, FLOOR, 519.7], yaw: 180, pitch: 24 },
  },
  materials() {
    return { ...signMaterials(), ...boardMaterials(), ...stripMaterials() };
  },
  build(ctx) {
    const { kit } = ctx;
    const ceilY = CEIL[ID];
    // every white strip / lens in the lobby is the under-bloom STRIP emitter (no emitWhite here: same draw-call count).
    // No corridor light channel across this ceiling: the lit square + drum below is the lobby's ceiling composition,
    // and a channel through its centre put the pool point right under the channel's steel lips (lit to ~190/255).
    roomShell(kit, manifest, { floorY: FLOOR, ceilY, seed: 43, panelW: 2.0, strip: STRIP, ceiling: { axis: "x", inset: 0.25, channels: [] } });
    for (const d of manifest.doors) doorReveal(kit, manifest, d, FLOOR);

    // lift wall at z 521.7..522 (inner face toward the lobby), hole LIFT_DOOR centred on the anchor
    const lz = LIFT.pos[2];
    const lb = { min: [B.min[0], FLOOR, lz - 0.3], max: [B.max[0], ceilY, lz] };
    const hole = { a0: LIFT.pos[0] - LIFT_DOOR.w / 2, a1: LIFT.pos[0] + LIFT_DOOR.w / 2, y0: FLOOR, y1: FLOOR + LIFT_DOOR.h, kind: "door" };
    wall(kit, { face: "s", bounds: lb, floorY: FLOOR, ceilY, wallT: 0.3, openings: [hole], seed: 47, panelW: 2.0, strip: STRIP, tag: "lift-wall" });
    // lift shaft side walls behind the lift wall, hugging the reserved cabin box (x ±2 → walls at ±2.4..2.7)
    for (const s of [-1, 1]) {
      const x0 = s < 0 ? -2.7 : 2.4;
      kit.boxMM("paintedMetal", [x0, FLOOR - 0.2, lz], [x0 + 0.3, ceilY, B.max[2] - 0.3], { color: IMP.black, texel: 1 });
    }

    const lw = wallFrame(lb, "s"); // lift wall, faces -z into the lobby
    const nw = wallFrame(B, "n"); // blast-door wall
    const ww = wallFrame(B, "w");
    const ew = wallFrame(B, "e");

    // --- heavy lift surround: two-tone flanges with recessed seams and bolts, header with the position indicator
    //     (ticks on a black band, the amber position lens recessed in a lipped channel), deck indicator plate above.
    //     Nothing at x ±1.5..2.1 (D's call panel).
    const fx = LIFT_DOOR.w / 2 + 0.3;
    const top = FLOOR + LIFT_DOOR.h;
    for (const s of [-1, 1]) {
      const x0 = s < 0 ? -fx : fx - 0.3;
      const x1 = x0 + 0.3;
      lw.box(kit, "paintedMetal", x0, x1, FLOOR, top + 0.3, -0.02, 0.15, { color: IMP.dark, texel: 1 });
      for (const [y0, y1] of [
        [0.3, 0.98],
        [1.02, 1.98],
        [2.02, 2.98],
      ]) {
        lw.box(kit, "metalRough", x0 + 0.04, x1 - 0.04, FLOOR + y0, FLOOR + y1, 0.14, 0.165, { color: IMP.hullDark, texel: 1 });
        for (const bx of [x0 + 0.075, x1 - 0.075]) for (const by of [y0 + 0.06, y1 - 0.06]) lw.box(kit, "metal", bx - 0.02, bx + 0.02, FLOOR + by - 0.02, FLOOR + by + 0.02, 0.165, 0.185, { color: IMP.steel, texel: 2 });
      }
      lw.box(kit, "paintedMetal", x0 - 0.02, x1 + 0.02, FLOOR, FLOOR + 0.16, -0.02, 0.18, { color: IMP.black, texel: 1 });
      lw.collider(kit, x0, x1, FLOOR, ceilY, 0, 0.18, "lift-frame");
    }
    lw.box(kit, "paintedMetal", -fx, fx, top, top + 0.3, -0.02, 0.15, { color: IMP.dark, texel: 1 });
    lw.box(kit, "paintedMetal", -0.95, 0.95, top + 0.09, top + 0.25, 0.14, 0.165, { color: IMP.black, texel: 1 });
    for (const x of TICKS) lw.box(kit, STRIP, x - 0.005, x + 0.005, top + 0.13, top + 0.21, 0.165, 0.169);
    lensStrip(kit, lw, -0.95, 0.95, top + 0.05, { d: 0.19, lip: 0.02, gap: 0.04, lens: 0.01, recess: 0.012, emit: "emitAmber" });
    lw.box(kit, "metalRough", -fx, fx, top + 0.32, ceilY - 0.02, -0.02, 0.06, { color: IMP.dark, texel: 1 });
    lw.box(kit, "paintedMetal", -fx + 0.03, fx - 0.03, top + 0.35, ceilY - 0.05, 0.06, 0.07, { color: IMP.black, texel: 1 });
    lw.quad(kit, "sign", 0, top + 0.66, 0.075, 0.6, 0.6, numeralRect());
    lw.quad(kit, "sign", -0.9, top + 0.66, 0.075, 0.12 * LABEL_ASPECT, 0.12, labelRect("DECK 01 · COMMAND"));
    lw.quad(kit, "sign", 0.9, top + 0.66, 0.075, 0.12 * LABEL_ASPECT, 0.12, labelRect("TURBOLIFT"));
    // cabin position marker: a separate mesh so it can move (D's lift API can drive it through `api.setIndicator`)
    const marker = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.07, 0.01), ctx.materials.emitAmber);
    marker.position.set(...lw.pt(TICKS[0], top + 0.17, 0.174));
    marker.name = "lift-indicator";
    ctx.group.add(marker);

    // --- port side of the lift wall: 1.5 m deck numerals (arrival marker), deck label, access hatch, high vent
    lw.box(kit, "metalRough", -5.15, -3.45, FLOOR + 0.4, FLOOR + 2.0, -0.01, 0.045, { color: IMP.dark, texel: 1 });
    lw.box(kit, "paintedMetal", -5.12, -3.48, FLOOR + 0.43, FLOOR + 1.97, 0.045, 0.05, { color: IMP.black, texel: 1 });
    lw.quad(kit, "sign", -4.3, FLOOR + 1.2, 0.054, 1.5, 1.5, numeralRect());
    signPanel(kit, lw, -4.3, FLOOR + 2.5, [{ label: "DECK 01 · COMMAND" }]);
    accessHatch(kit, lw, -6.45, FLOOR, { led: "emitAmber" });
    vent(kit, lw, -6.2, FLOOR, { y: 2.7, w: 1.0, h: 0.36 });

    // --- starboard side of the lift wall: lift-status board just outside D's call-panel clearance (x > 2.1),
    //     then the fire point / utility cluster
    boardPanel(kit, lw, 2.56, FLOOR + 1.5, "status", 0.6, { d: 0.04, bezel: 0.03 });
    const cx = 3.6;
    lw.box(kit, "paintedMetal", cx - 0.35, cx + 0.35, FLOOR + 0.55, FLOOR + 1.75, -0.01, 0.24, { color: IMP.dark, texel: 1 });
    lw.box(kit, "metalRough", cx - 0.31, cx + 0.31, FLOOR + 0.59, FLOOR + 1.71, 0.24, 0.252, { color: IMP.mid, texel: 1 });
    lw.box(kit, "paintedMetal", cx - 0.31, cx + 0.31, FLOOR + 1.45, FLOOR + 1.55, 0.252, 0.256, { color: IMP.red, texel: 1 });
    lw.box(kit, "metal", cx + 0.2, cx + 0.24, FLOOR + 1.05, FLOOR + 1.3, 0.252, 0.28, { color: IMP.steel, texel: 2 });
    lw.box(kit, "metal", cx - 0.29, cx - 0.275, FLOOR + 0.64, FLOOR + 1.66, 0.252, 0.262, { color: IMP.steel, texel: 2 });
    lw.quad(kit, "signPaint", cx, FLOOR + 1.0, 0.253, 0.5, 0.5 / LABEL_ASPECT, labelRect("EMERGENCY EQUIPMENT"));
    led(kit, lw, cx - 0.2, FLOOR + 1.64, 0.252, "emitRedImp", { s: 0.016 });
    signPanel(kit, lw, cx, 0, [{ label: "FIRE POINT" }], { labelH: 0.1, pad: 0.06, rowH: 0.16, top: FLOOR + SIGN_TOP });
    lw.collider(kit, cx - 0.35, cx + 0.35, FLOOR, FLOOR + 1.75, 0, 0.26, "cabinet");
    const rx = 4.8; // hose reel on a bracket
    lw.box(kit, "paintedMetal", rx - 0.1, rx + 0.1, FLOOR + 1.0, FLOOR + 1.7, -0.01, 0.1, { color: IMP.dark, texel: 1 });
    lw.stub(kit, "metalRough", rx, FLOOR + 1.35, 0.1, 0.24, 0.3, { color: IMP.dark, segments: 20 });
    kit.add("paintedMetal", new THREE.TorusGeometry(0.21, 0.05, 8, 20), { pos: lw.pt(rx, FLOOR + 1.35, 0.255), color: IMP.black, texel: 2 });
    lw.stub(kit, "metalRough", rx, FLOOR + 1.35, 0.24, 0.29, 0.09, { color: IMP.red, segments: 14 });
    lw.collider(kit, rx - 0.32, rx + 0.32, FLOOR + 1.0, FLOOR + 1.7, 0, 0.3, "reel");
    intercom(kit, lw, 5.85, FLOOR, { y: 1.5 });
    vent(kit, lw, 6.5, FLOOR, { y: 0.48, w: 0.8, h: 0.32 });
    vent(kit, lw, 5.5, FLOOR, { y: 2.7, w: 1.0, h: 0.36 });
    beacon(kit, lw, 4.6, FLOOR + 2.55); // caged red beacon over the fire point — the source of the red accent light

    // --- blast-door wall: pilasters framing the door, chevron bands, directories with a bench (port) and a
    //     fire-suppression station (starboard) beneath them, tray, hatch, intercom, vents
    for (const s of [-1, 1]) {
      nw.box(kit, "paintedMetal", s * 2.45, s * 2.85, FLOOR, ceilY, -0.02, 0.26, { color: IMP.dark, texel: 1 });
      nw.box(kit, "metalRough", s * 2.5, s * 2.8, FLOOR + 0.36, ceilY - 0.3, 0.25, 0.275, { color: IMP.hullDark, texel: 1 });
      for (const y of [0.55, 1.6, 2.65, 3.4]) for (const bx of [s * 2.54, s * 2.76]) nw.box(kit, "metal", bx - 0.02, bx + 0.02, FLOOR + y - 0.02, FLOOR + y + 0.02, 0.275, 0.295, { color: IMP.steel, texel: 2 });
      nw.box(kit, "paintedMetal", s * 2.43, s * 2.87, FLOOR, FLOOR + 0.14, -0.02, 0.29, { color: IMP.black, texel: 1 });
      // recessed blue marker: groove lips with the lens 1 cm behind their faces
      nw.box(kit, "paintedMetal", s * 2.65 - 0.045, s * 2.65 - 0.015, FLOOR + 0.5, ceilY - 0.4, 0.275, 0.292, { color: IMP.black, texel: 2 });
      nw.box(kit, "paintedMetal", s * 2.65 + 0.015, s * 2.65 + 0.045, FLOOR + 0.5, ceilY - 0.4, 0.275, 0.292, { color: IMP.black, texel: 2 });
      nw.box(kit, "paintedMetal", s * 2.65 - 0.015, s * 2.65 + 0.015, FLOOR + 0.5, ceilY - 0.4, 0.275, 0.278, { color: IMP.black, texel: 2 });
      nw.box(kit, "emitBlue", s * 2.65 - 0.009, s * 2.65 + 0.009, FLOOR + 2.3, FLOOR + 2.5, 0.278, 0.282);
      nw.collider(kit, s * 2.45, s * 2.85, FLOOR, ceilY, 0, 0.26, "pilaster");
      chevronBand(kit, nw, s * 2.25, FLOOR + 1.45, { w: 0.28, h: 2.1 });
      vent(kit, nw, s * 6.3, FLOOR, { y: 2.7, w: 1.0, h: 0.36 });
    }
    const signTop = { top: FLOOR + SIGN_TOP };
    signPanel(kit, nw, -4.35, 0, [
      { label: "BRIDGE", arrow: arrowToward(nw, -4.35, 0) },
      { label: "PORT PASSAGE", arrow: arrowToward(nw, -4.35, -21.8) },
      { label: "OBSERVATION GALLERY", arrow: arrowToward(nw, -4.35, -21.8) },
    ], signTop);
    signPanel(kit, nw, 4.35, 0, [
      { label: "BRIDGE", arrow: arrowToward(nw, 4.35, 0) },
      { label: "STARBOARD PASSAGE", arrow: arrowToward(nw, 4.35, 21.8) },
      { label: "OFFICERS' QUARTERS", arrow: arrowToward(nw, 4.35, 66) },
    ], signTop);
    cableTray(kit, nw, [[-7.4, -3.1], [3.1, 7.4]], ceilY);
    bench(kit, nw, -5.7, -3.7, FLOOR, { depth: 0.55 });
    accessHatch(kit, nw, -6.3, FLOOR, { led: "emitAmber" });
    fireStation(kit, nw, 5.9, FLOOR); // cabinet 5.6..6.2, extinguisher at 6.4 — clear of the crate stack in the corner
    intercom(kit, nw, 5.35, FLOOR, { y: 1.5 });

    // --- side walls: solid benches with backrests (no underglow — a 1 cm lens seen from 10 m aliases into dashes),
    //     a board above each (port: notice screen, starboard: Deck 1 plan / "you are here"), LED ledge, conduits,
    //     high vent; crate stack in the aft-starboard corner
    for (const [wf, zA, zB, board] of [
      [ww, 517.3, 520.1, "screen"],
      [ew, 518.4, 521.2, "plan"],
    ]) {
      const zc = (zA + zB) / 2;
      bench(kit, wf, zA, zB, FLOOR, { depth: 0.58, seatY: 0.46 });
      if (board === "screen") {
        wf.box(kit, "metalRough", zc - 0.85, zc + 0.85, FLOOR + 1.12, FLOOR + 2.0, -0.01, 0.07, { color: IMP.dark, texel: 1 });
        wf.box(kit, "paintedMetal", zc - 0.8, zc + 0.8, FLOOR + 1.17, FLOOR + 1.95, 0.07, 0.075, { color: IMP.black, texel: 1 });
        wf.quad(kit, "screenImp0", zc, FLOOR + 1.585, 0.078, 1.56, 0.72, [0, 0, 1, 1]);
      } else {
        boardPanel(kit, wf, zc, FLOOR + 1.585, "plan", 1.5, { d: 0.075, bezel: 0.05 });
      }
      wf.box(kit, "metalRough", zc - 0.85, zc + 0.85, FLOOR + 1.05, FLOOR + 1.12, -0.01, 0.1, { color: IMP.mid, texel: 1 });
      [
        ["emitBlue", -0.62],
        ["emitAmber", -0.52],
        ["emitRedImp", -0.42],
      ].forEach(([m, dz]) => led(kit, wf, zc + dz, FLOOR + 1.085, 0.1, m, { s: 0.014 }));
      wf.quad(kit, "signPaint", zc + 0.45, FLOOR + 1.085, 0.101, 0.5, 0.5 / LABEL_ASPECT, labelRect("LIFT LOBBY"));
      conduitRun(kit, wf, [[516.65, 521.35]], { y: FLOOR + 2.5, r: 0.04, d: 0.1, color: IMP.hullDark, clampsAt: [517.6, 519.0, 520.4] });
      conduitRun(kit, wf, [[516.65, 521.35]], { y: FLOOR + 2.64, r: 0.026, d: 0.085, color: IMP.mid, clampsAt: [518.3, 519.7] });
      vent(kit, wf, zc, FLOOR, { y: 3.0, w: 1.0, h: 0.36 });
    }
    crates(kit, ew, 517.05, FLOOR, { w: 1.2, depth: 0.8, h: 0.6, n: 2 });

    // --- floor: dark gloss field with a painted lift-queue lane from the blast door to the lift (critic round 3: the
    //     raised plate pad with blue grooves read as an ambiguous central pad): two worn yellow lane lines, a TURBOLIFT
    //     stencil with an arrow toward the car for people arriving from the spine, a STAND CLEAR line and stencil ahead
    //     of the door chevrons. Paint only — nothing raised, nothing lit.
    kit.boxMM("blackGloss", [-7.4, FLOOR + 0.002, 516.6], [7.4, FLOOR + 0.009, 521.45]);
    const laneX = 1.3;
    const lz0 = 517.0;
    const lz1 = 520.75; // the STAND CLEAR line closes the lane 0.4 m before the door chevrons
    const paint = { color: LANE_PAINT, texel: 2 };
    const pY0 = FLOOR + 0.009;
    const pY1 = FLOOR + 0.013;
    for (const x of [-laneX, laneX]) kit.boxMM("paintedMetal", [x - 0.03, pY0, lz0], [x + 0.03, pY1, lz1], paint);
    kit.boxMM("paintedMetal", [-laneX - 0.03, pY0, lz1 - 0.06], [laneX + 0.03, pY1, lz1], paint);
    for (const x of [-laneX, laneX]) kit.boxMM("paintedMetal", [x - 0.03, pY0, lz0], [x + 0.03, pY1, lz0 + 0.06], paint); // open end: short return ticks
    const aft = { flip: true }; // stencils read for a viewer walking +z (from the spine toward the lift)
    floorQuad(kit, "signPaint", [0, FLOOR + 0.014, 517.95], 1.7, 1.7 / LABEL_ASPECT, labelRect("TURBOLIFT"), "x", aft);
    floorQuad(kit, "signPaint", [0, FLOOR + 0.014, 518.55], 0.42, 0.42, arrowRect("up"), "x", aft);
    floorQuad(kit, "signPaint", [0, FLOOR + 0.014, 520.42], 1.7, 1.7 / LABEL_ASPECT, labelRect("STAND CLEAR"), "x", aft);
    floorQuad(kit, "signPaint", [0, FLOOR + 0.014, lz - 0.3 - 0.385], LIFT_DOOR.w, LIFT_DOOR.w / LABEL_ASPECT, chevronRect(), "x");
    floorQuad(kit, "signPaint", [0, FLOOR + 0.014, B.min[2] + 0.3 + 0.02 + 4.0 / LABEL_ASPECT / 2], 4.0, 4.0 / LABEL_ASPECT, chevronRect(), "x");

    // --- ceiling feature: four recessed linear fixtures on a square with a square downlight at each corner, and a
    //     central drum luminaire flush with the ceiling (chamfered bezel disc, 6 cm annular lens in its opening, dark
    //     centre cap). The main pool point sits INSIDE the drum (§9.4: no shadows — a bare point 0.5 m under the ceiling lit
    //     the panels above it to a grey patch and had no visible source): every face of the drum, bezel and lens points
    //     away from it, so nothing of the fixture can blow out.
    const half = 1.7;
    const cz = 519;
    const g = 0.3; // gap between a fixture's end and the corner downlight
    const lin = { emit: STRIP };
    ceilingFixture(kit, ceilY, [-half + g, cz - half], [half - g, cz - half], lin);
    ceilingFixture(kit, ceilY, [-half + g, cz + half], [half - g, cz + half], lin);
    ceilingFixture(kit, ceilY, [-half, cz - half + g], [-half, cz + half - g], lin);
    ceilingFixture(kit, ceilY, [half, cz - half + g], [half, cz + half - g], lin);
    for (const x of [-half, half]) for (const z of [cz - half, cz + half]) downlight(kit, ceilY, x, z, { s: 0.34, h: 0.11, lens: 0.16, emit: STRIP });
    // The drum runs from 14 cm below the ceiling to 15 cm up inside the ceiling panels, and the pool point sits ABOVE
    // the ceiling plane (ceilY + 0.08): every ceiling face looks down, away from it, so the panels get no direct light
    // and no glint. 7 cm below the plane (round 4) the semi-gloss panels mirrored the point as a white ring around
    // the drum: E ≈ 2 at grazing incidence through a GGX peak of ~5 clips even a near-black surface.
    const lumY = ceilY + 0.08;
    kit.cyl("metalRough", 0, ceilY + 0.005, cz, LUMINAIRE_R, 0.29, "y", { color: IMP.mid, segments: 24, texel: 1 });
    kit.cyl("paintedMetal", 0, ceilY - 0.155, cz, 0.4, 0.03, "y", { color: IMP.black, segments: 24, texel: 1 });
    // bezel: a chamfered lathe disc whose faces all look down or outward (a torus's inner wall faces the axis and the
    // point above would light it to a bright arc), with the lens ring flush in its opening and a dark centre cap
    const yb0 = ceilY - 0.178;
    const bezel = new THREE.LatheGeometry([new THREE.Vector2(0.265, yb0), new THREE.Vector2(0.36, yb0), new THREE.Vector2(0.4, yb0 + 0.012), new THREE.Vector2(0.4, yb0 + 0.03)], 32);
    kit.add("metalRough", bezel, { pos: [0, 0, cz], color: IMP.dark, texel: 1 });
    const lens = new THREE.RingGeometry(0.2, 0.26, 32, 1);
    lens.rotateX(Math.PI / 2); // faces down
    kit.add(STRIP, lens, { pos: [0, ceilY - 0.177, cz] });
    kit.cyl("paintedMetal", 0, ceilY - 0.18, cz, 0.18, 0.02, "y", { color: IMP.black, segments: 24, texel: 1 });

    // 5 descriptors (budget 14). Main pool inside the drum (9 at 3.93 m ≈ 7 at the old 3.5 m: ~0.5 EV under round 3's
    // 10, ~1.2 EV under round 2's 16 — critic round 3: lobby brighter than the bridge, target mean ≤ 32); the amber
    // header wash, two corner fills and the beacon's red wash scaled with it. The amber point sits INSIDE the solid
    // lift header block (x ±1.5, y top..top + 0.3, d -0.02..0.15), level with the black indicator band: floating 0.25 m
    // in front of the header (round 4) it lit the band and the lens channel to a white-amber blob (E ≈ 38 at 25 cm).
    // Inside, every face of the header, band, ticks, marker and lens channel points away from it; what it reaches is
    // the door jambs, the threshold chevrons and the lane below — the amber lens strip reads as its source.
    ctx.lights.push({ type: "point", pos: [0, lumY, cz], color: LIGHT.coolWhite, intensity: 9, distance: 15, priority: 0.8 });
    ctx.lights.push({ type: "point", pos: lw.pt(0, top + 0.15, 0.065), color: LIGHT.amber, intensity: 2.4, distance: 6, priority: 0.5 });
    for (const x of [-6.3, 6.3]) ctx.lights.push({ type: "point", pos: [x, ceilY - 0.8, 518.7], color: LIGHT.coolWhite, intensity: 2.5, distance: 8, priority: 0.4 });
    ctx.lights.push({ type: "point", pos: [4.6, FLOOR + 2.55, lz - 0.65], color: LIGHT.red, intensity: 1.0, distance: 3.5, priority: 0.3 }); // from the beacon

    // indicator: demo sweep between the deck marks until a lift system drives it (u = 0 → deck 1 … 1 → deck 4)
    let driven = false;
    const setU = (u) => {
      marker.position.x = TICKS[0] + (TICKS[TICKS.length - 1] - TICKS[0]) * Math.min(1, Math.max(0, u));
    };
    return {
      update(dt, t) {
        if (!driven) setU(0.5 - 0.5 * Math.cos((2 * Math.PI * (t - 40)) / 48));
      },
      api: {
        setIndicator(u) {
          driven = true;
          setU(u);
        },
      },
    };
  },
};
export default manifest;
