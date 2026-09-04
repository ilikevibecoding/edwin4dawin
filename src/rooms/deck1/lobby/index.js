// d1-lobby — Deck 1 turbolift lobby. Lift anchor T1 at (0, 240, 522), dir (0,0,-1) per §6.3/§9.2: the lift door
// is on the internal wall at z = 522; the cabin volume x ±2, z 522..526, y 240..243.6 is left empty for D, and the
// wall x ±1.5..2.1 beside the door surround stays clear for D's call panel. Shell from shared/imperial.js;
// Phase 2 arrival dressing uses ../spine/dressing.js + ../spine/signage.js.
import * as THREE from "three";
import { BOUNDS, CEIL, FLOOR, LIFT, doorsFor } from "../shared/plan.js";
import { roomShell, wall, doorReveal } from "../shared/imperial.js";
import { LIFT_DOOR } from "../shared/doors.js";
import { IMP, LIGHT } from "../shared/palette.js";
import { signMaterials, labelRect, numeralRect, chevronRect, LABEL_ASPECT } from "../spine/signage.js";
import { wallFrame, signPanel, chevronBand, floorQuad, intercom, vent, accessHatch, conduitRun, cableTray, arrowToward, SIGN_TOP } from "../spine/dressing.js";

const ID = "d1-lobby";
const B = BOUNDS[ID];
const TICKS = [0.6, 0.2, -0.2, -0.6]; // deck 1..4 marks on the position indicator, left to right for a viewer facing the lift (+x is their left)

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
    "d1-lobby-side": { pos: [-6.8, FLOOR, 518.5], yaw: -70, pitch: -3 },
    "d1-lobby-indicator": { pos: [0, FLOOR, 519.7], yaw: 180, pitch: 24 },
  },
  materials() {
    return signMaterials();
  },
  build(ctx) {
    const { kit } = ctx;
    const ceilY = CEIL[ID];
    roomShell(kit, manifest, { floorY: FLOOR, ceilY, seed: 43, panelW: 2.0, strip: "emitWhite", ceiling: { axis: "x", inset: 0.25, channels: [{ at: 519, w: 0.6, emit: "emitWhite", emitW: 0.2 }] } });
    for (const d of manifest.doors) doorReveal(kit, manifest, d, FLOOR);

    // lift wall at z 521.7..522 (inner face toward the lobby), hole LIFT_DOOR centred on the anchor
    const lz = LIFT.pos[2];
    const lb = { min: [B.min[0], FLOOR, lz - 0.3], max: [B.max[0], ceilY, lz] };
    const hole = { a0: LIFT.pos[0] - LIFT_DOOR.w / 2, a1: LIFT.pos[0] + LIFT_DOOR.w / 2, y0: FLOOR, y1: FLOOR + LIFT_DOOR.h, kind: "door" };
    wall(kit, { face: "s", bounds: lb, floorY: FLOOR, ceilY, wallT: 0.3, openings: [hole], seed: 47, panelW: 2.0, strip: "emitWhite", tag: "lift-wall" });
    // lift shaft side walls behind the lift wall, hugging the reserved cabin box (x ±2 → walls at ±2.4..2.7)
    for (const s of [-1, 1]) {
      const x0 = s < 0 ? -2.7 : 2.4;
      kit.boxMM("paintedMetal", [x0, FLOOR - 0.2, lz], [x0 + 0.3, ceilY, B.max[2] - 0.3], { color: IMP.black, texel: 1 });
    }

    const lw = wallFrame(lb, "s"); // lift wall, faces -z into the lobby
    const nw = wallFrame(B, "n"); // blast-door wall
    const ww = wallFrame(B, "w");
    const ew = wallFrame(B, "e");

    // --- heavy lift surround: two-tone flanges with recessed seams and bolts, header with the position indicator,
    //     deck indicator plate above (numerals + labels). Nothing at x ±1.5..2.1 (D's call panel).
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
    lw.box(kit, "paintedMetal", -0.95, 0.95, top + 0.07, top + 0.23, 0.14, 0.165, { color: IMP.black, texel: 1 });
    for (const x of TICKS) lw.box(kit, "emitWhite", x - 0.01, x + 0.01, top + 0.1, top + 0.2, 0.165, 0.171);
    lw.box(kit, "emitAmber", -0.93, 0.93, top + 0.035, top + 0.055, 0.15, 0.162);
    lw.box(kit, "metalRough", -fx, fx, top + 0.32, ceilY - 0.02, -0.02, 0.06, { color: IMP.dark, texel: 1 });
    lw.box(kit, "paintedMetal", -fx + 0.03, fx - 0.03, top + 0.35, ceilY - 0.05, 0.06, 0.07, { color: IMP.black, texel: 1 });
    lw.quad(kit, "sign", 0, top + 0.66, 0.075, 0.6, 0.6, numeralRect());
    lw.quad(kit, "sign", -0.9, top + 0.66, 0.075, 0.14 * LABEL_ASPECT, 0.14, labelRect("DECK 01 · COMMAND"));
    lw.quad(kit, "sign", 0.9, top + 0.66, 0.075, 0.14 * LABEL_ASPECT, 0.14, labelRect("TURBOLIFT"));
    // cabin position marker: a separate mesh so it can move (D's lift API can drive it through `api.setIndicator`)
    const marker = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.09, 0.012), ctx.materials.emitAmber);
    marker.position.set(...lw.pt(TICKS[0], top + 0.15, 0.176));
    marker.name = "lift-indicator";
    ctx.group.add(marker);

    // --- port side of the lift wall: 1.5 m deck numerals (arrival marker), deck label, access hatch, high vent
    lw.box(kit, "metalRough", -5.15, -3.45, FLOOR + 0.4, FLOOR + 2.0, -0.01, 0.045, { color: IMP.dark, texel: 1 });
    lw.box(kit, "paintedMetal", -5.12, -3.48, FLOOR + 0.43, FLOOR + 1.97, 0.045, 0.05, { color: IMP.black, texel: 1 });
    lw.quad(kit, "sign", -4.3, FLOOR + 1.2, 0.054, 1.5, 1.5, numeralRect());
    signPanel(kit, lw, -4.3, FLOOR + 2.5, [{ label: "DECK 01 · COMMAND" }]);
    accessHatch(kit, lw, -6.45, FLOOR, { led: "emitAmber" });
    vent(kit, lw, -6.2, FLOOR, { y: 2.7, w: 1.0, h: 0.36 });

    // --- starboard side of the lift wall: fire point / utility cluster
    const cx = 3.35;
    lw.box(kit, "paintedMetal", cx - 0.35, cx + 0.35, FLOOR + 0.55, FLOOR + 1.75, -0.01, 0.24, { color: IMP.dark, texel: 1 });
    lw.box(kit, "metalRough", cx - 0.31, cx + 0.31, FLOOR + 0.59, FLOOR + 1.71, 0.24, 0.252, { color: IMP.mid, texel: 1 });
    lw.box(kit, "paintedMetal", cx - 0.31, cx + 0.31, FLOOR + 1.45, FLOOR + 1.55, 0.252, 0.256, { color: IMP.red, texel: 1 });
    lw.box(kit, "metal", cx + 0.2, cx + 0.24, FLOOR + 1.05, FLOOR + 1.3, 0.252, 0.28, { color: IMP.steel, texel: 2 });
    lw.quad(kit, "signPaint", cx, FLOOR + 1.0, 0.253, 0.5, 0.5 / LABEL_ASPECT, labelRect("EMERGENCY EQUIPMENT"));
    signPanel(kit, lw, cx, 0, [{ label: "FIRE POINT" }], { labelH: 0.12, pad: 0.06, rowH: 0.17, top: FLOOR + SIGN_TOP });
    lw.collider(kit, cx - 0.35, cx + 0.35, FLOOR, FLOOR + 1.75, 0, 0.26, "cabinet");
    const rx = 4.55; // hose reel on a bracket
    lw.box(kit, "paintedMetal", rx - 0.1, rx + 0.1, FLOOR + 1.0, FLOOR + 1.7, -0.01, 0.1, { color: IMP.dark, texel: 1 });
    lw.stub(kit, "metalRough", rx, FLOOR + 1.35, 0.1, 0.24, 0.3, { color: IMP.dark, segments: 20 });
    kit.add("paintedMetal", new THREE.TorusGeometry(0.21, 0.05, 8, 20), { pos: lw.pt(rx, FLOOR + 1.35, 0.255), color: IMP.black, texel: 2 });
    lw.stub(kit, "metalRough", rx, FLOOR + 1.35, 0.24, 0.29, 0.09, { color: IMP.red, segments: 14 });
    lw.collider(kit, rx - 0.32, rx + 0.32, FLOOR + 1.0, FLOOR + 1.7, 0, 0.3, "reel");
    intercom(kit, lw, 5.6, FLOOR, { y: 1.5 });
    vent(kit, lw, 6.5, FLOOR, { y: 0.48, w: 0.8, h: 0.32 });
    vent(kit, lw, 5.3, FLOOR, { y: 2.7, w: 1.0, h: 0.36 });

    // --- blast-door wall: pilasters framing the door, chevron bands, directories, tray, hatch, intercom, vents
    for (const s of [-1, 1]) {
      nw.box(kit, "paintedMetal", s * 2.45, s * 2.85, FLOOR, ceilY, -0.02, 0.26, { color: IMP.dark, texel: 1 });
      nw.box(kit, "metalRough", s * 2.5, s * 2.8, FLOOR + 0.36, ceilY - 0.3, 0.25, 0.275, { color: IMP.hullDark, texel: 1 });
      for (const y of [0.55, 1.6, 2.65, 3.4]) for (const bx of [s * 2.54, s * 2.76]) nw.box(kit, "metal", bx - 0.02, bx + 0.02, FLOOR + y - 0.02, FLOOR + y + 0.02, 0.275, 0.295, { color: IMP.steel, texel: 2 });
      nw.box(kit, "paintedMetal", s * 2.43, s * 2.87, FLOOR, FLOOR + 0.14, -0.02, 0.29, { color: IMP.black, texel: 1 });
      nw.box(kit, "emitBlue", s * 2.65 - 0.015, s * 2.65 + 0.015, FLOOR + 2.3, FLOOR + 2.5, 0.275, 0.29);
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
    accessHatch(kit, nw, -6.3, FLOOR, { led: "emitAmber" });
    intercom(kit, nw, 6.3, FLOOR, { y: 1.5 });

    // --- side walls: cantilevered benches with underglow, notice screens with LED ledge, conduits, high vent
    const zA = 517.3;
    const zB = 520.1;
    const zc = (zA + zB) / 2;
    for (const [wf, screen] of [
      [ww, "screenImp0"],
      [ew, "screenImp1"],
    ]) {
      wf.box(kit, "paintedMetal", zA, zB, FLOOR + 0.1, FLOOR + 0.44, -0.01, 0.42, { color: IMP.dark, texel: 1 });
      wf.box(kit, "paintedMetal", zA - 0.05, zB + 0.05, FLOOR + 0.44, FLOOR + 0.52, -0.01, 0.6, { color: IMP.mid, texel: 1 });
      for (const zs of [zA + 0.9, zA + 1.85]) wf.box(kit, "paintedMetal", zs - 0.008, zs + 0.008, FLOOR + 0.52, FLOOR + 0.524, 0.05, 0.58, { color: IMP.black, texel: 2 });
      wf.box(kit, "emitBlue", zA + 0.1, zB - 0.1, FLOOR + 0.41, FLOOR + 0.43, 0.55, 0.585);
      wf.box(kit, "paintedMetal", zA, zB, FLOOR + 0.72, FLOOR + 1.0, -0.01, 0.05, { color: IMP.mid, texel: 1 });
      wf.collider(kit, zA - 0.05, zB + 0.05, FLOOR, FLOOR + 0.55, 0, 0.62, "bench");
      wf.box(kit, "metalRough", zc - 0.85, zc + 0.85, FLOOR + 1.12, FLOOR + 2.0, -0.01, 0.07, { color: IMP.dark, texel: 1 });
      wf.box(kit, "paintedMetal", zc - 0.8, zc + 0.8, FLOOR + 1.17, FLOOR + 1.95, 0.07, 0.075, { color: IMP.black, texel: 1 });
      wf.quad(kit, screen, zc, FLOOR + 1.585, 0.078, 1.56, 0.72, [0, 0, 1, 1]);
      wf.box(kit, "metalRough", zc - 0.85, zc + 0.85, FLOOR + 1.05, FLOOR + 1.12, -0.01, 0.1, { color: IMP.mid, texel: 1 });
      [
        ["emitBlue", -0.62],
        ["emitAmber", -0.52],
        ["emitRedImp", -0.42],
      ].forEach(([m, dz]) => wf.box(kit, m, zc + dz - 0.02, zc + dz + 0.02, FLOOR + 1.07, FLOOR + 1.1, 0.1, 0.106));
      wf.quad(kit, "signPaint", zc + 0.45, FLOOR + 1.085, 0.101, 0.5, 0.5 / LABEL_ASPECT, labelRect("LIFT LOBBY"));
      conduitRun(kit, wf, [[516.65, 521.35]], { y: FLOOR + 2.5, r: 0.04, d: 0.1, color: IMP.hullDark, clampsAt: [517.6, 519.0, 520.4] });
      conduitRun(kit, wf, [[516.65, 521.35]], { y: FLOOR + 2.64, r: 0.026, d: 0.085, color: IMP.mid, clampsAt: [518.3, 519.7] });
      vent(kit, wf, zc, FLOOR, { y: 3.0, w: 1.0, h: 0.36 });
    }

    // --- floor: dark gloss field, matte walkway with light strips from the blast door to the lift, chevrons at both
    kit.boxMM("blackGloss", [-7.4, FLOOR + 0.002, 516.6], [7.4, FLOOR + 0.009, 521.45]);
    kit.boxMM("paintedMetal", [-1.6, FLOOR + 0.0025, 517.03], [1.6, FLOOR + 0.0105, 521.05], { color: IMP.black, texel: 1 });
    for (const x of [-1.62, 1.62]) kit.boxMM("emitWhite", [x - 0.025, FLOOR + 0.011, 517.0], [x + 0.025, FLOOR + 0.018, 521.05]);
    kit.boxMM("emitWhite", [-1.62, FLOOR + 0.011, 516.975], [1.62, FLOOR + 0.018, 517.025]);
    floorQuad(kit, "signPaint", [0, FLOOR + 0.014, lz - 0.3 - 0.385], LIFT_DOOR.w, LIFT_DOOR.w / LABEL_ASPECT, chevronRect(), "x");
    floorQuad(kit, "signPaint", [0, FLOOR + 0.014, B.min[2] + 0.3 + 0.02 + 4.0 / LABEL_ASPECT / 2], 4.0, 4.0 / LABEL_ASPECT, chevronRect(), "x");

    // --- ceiling feature: hanging square light frame with corner downlights over the centre of the lobby
    const half = 1.7;
    const cz = 519;
    for (const [x0, x1, z0, z1] of [
      [-half, half, cz - half, cz - half + 0.16],
      [-half, half, cz + half - 0.16, cz + half],
      [-half, -half + 0.16, cz - half, cz + half],
      [half - 0.16, half, cz - half, cz + half],
    ])
      kit.boxMM("paintedMetal", [x0, ceilY - 0.1, z0], [x1, ceilY + 0.01, z1], { color: IMP.dark, texel: 1 });
    const iy0 = ceilY - 0.106;
    const iy1 = ceilY - 0.08;
    kit.boxMM("emitWhite", [-half + 0.14, iy0, cz - half + 0.14], [half - 0.14, iy1, cz - half + 0.17]);
    kit.boxMM("emitWhite", [-half + 0.14, iy0, cz + half - 0.17], [half - 0.14, iy1, cz + half - 0.14]);
    kit.boxMM("emitWhite", [-half + 0.14, iy0, cz - half + 0.17], [-half + 0.17, iy1, cz + half - 0.17]);
    kit.boxMM("emitWhite", [half - 0.17, iy0, cz - half + 0.17], [half - 0.14, iy1, cz + half - 0.17]);
    for (const x of [-half + 0.08, half - 0.08]) {
      for (const z of [cz - half + 0.08, cz + half - 0.08]) {
        kit.box("metalRough", x, ceilY - 0.14, z, 0.3, 0.08, 0.3, { color: IMP.mid, texel: 1 });
        kit.box("emitWhite", x, ceilY - 0.184, z, 0.18, 0.012, 0.18);
      }
    }

    // 5 descriptors (budget 14)
    ctx.lights.push({ type: "point", pos: [0, ceilY - 0.5, 519], color: LIGHT.coolWhite, intensity: 16, distance: 15, priority: 0.8 });
    ctx.lights.push({ type: "point", pos: [0, FLOOR + 3.2, lz - 0.7], color: LIGHT.amber, intensity: 3, distance: 6, priority: 0.5 });
    for (const x of [-6.3, 6.3]) ctx.lights.push({ type: "point", pos: [x, ceilY - 0.8, 518.7], color: LIGHT.coolWhite, intensity: 5, distance: 8, priority: 0.4 });
    ctx.lights.push({ type: "point", pos: [4.6, FLOOR + 2.6, lz - 0.9], color: LIGHT.red, intensity: 1.2, distance: 3.5, priority: 0.3 });

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
