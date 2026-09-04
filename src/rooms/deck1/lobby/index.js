// d1-lobby — Deck 1 turbolift lobby. Lift anchor T1 at (0, 240, 522), dir (0,0,-1) per §6.3/§9.2: the lift door
// is on the internal wall at z = 522; the cabin volume x ±2, z 522..526, y 240..243.6 is left empty for D.
import { BOUNDS, CEIL, FLOOR, LIFT, doorsFor } from "../shared/plan.js";
import { roomShell, wall, doorReveal } from "../shared/imperial.js";
import { LIFT_DOOR } from "../shared/doors.js";
import { IMP, LIGHT } from "../shared/palette.js";

const ID = "d1-lobby";
const B = BOUNDS[ID];

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
  },
  build(ctx) {
    const { kit } = ctx;
    const ceilY = CEIL[ID];
    // shell without the s wall's extra: the lobby proper is z 516..522; behind the lift wall only the lift shaft matters
    roomShell(kit, manifest, { floorY: FLOOR, ceilY, seed: 43, panelW: 2.0, strip: "emitWhite", ceiling: { axis: "x", inset: 0.25, channels: [{ at: 519, w: 0.6, emit: "emitWhite", emitW: 0.2 }] } });
    for (const d of manifest.doors) doorReveal(kit, manifest, d, FLOOR);

    // lift wall at z 521.7..522 (inner face toward the lobby), hole LIFT_DOOR centred on the anchor
    const lz = LIFT.pos[2];
    const lb = { min: [B.min[0], FLOOR, lz - 0.3], max: [B.max[0], ceilY, lz] };
    const hole = { a0: LIFT.pos[0] - LIFT_DOOR.w / 2, a1: LIFT.pos[0] + LIFT_DOOR.w / 2, y0: FLOOR, y1: FLOOR + LIFT_DOOR.h, kind: "door" };
    wall(kit, { face: "s", bounds: lb, floorY: FLOOR, ceilY, wallT: 0.3, openings: [hole], seed: 47, panelW: 2.0, strip: "emitWhite", tag: "lift-wall" });
    // heavy lift surround: proud frame + amber deck indicator above the opening (D's cabin/doors sit behind it)
    const fx = LIFT_DOOR.w / 2 + 0.3;
    kit.boxMM("paintedMetal", [-fx, FLOOR, lz - 0.45], [-fx + 0.3, FLOOR + LIFT_DOOR.h + 0.3, lz - 0.28], { color: IMP.dark, texel: 1 });
    kit.boxMM("paintedMetal", [fx - 0.3, FLOOR, lz - 0.45], [fx, FLOOR + LIFT_DOOR.h + 0.3, lz - 0.28], { color: IMP.dark, texel: 1 });
    kit.boxMM("paintedMetal", [-fx, FLOOR + LIFT_DOOR.h, lz - 0.45], [fx, FLOOR + LIFT_DOOR.h + 0.3, lz - 0.28], { color: IMP.dark, texel: 1 });
    kit.boxMM("emitAmber", [-0.6, FLOOR + LIFT_DOOR.h + 0.1, lz - 0.46], [0.6, FLOOR + LIFT_DOOR.h + 0.2, lz - 0.45]);
    kit.collider([-fx, FLOOR, lz - 0.45], [-fx + 0.3, ceilY, lz], "lift-frame");
    kit.collider([fx - 0.3, FLOOR, lz - 0.45], [fx, ceilY, lz], "lift-frame");
    // lift shaft side walls behind the lift wall, hugging the reserved cabin box (x ±2 → walls at ±2.4..2.7)
    for (const s of [-1, 1]) {
      const x0 = s < 0 ? -2.7 : 2.4;
      kit.boxMM("paintedMetal", [x0, FLOOR - 0.2, lz], [x0 + 0.3, ceilY, B.max[2] - 0.3], { color: IMP.black, texel: 1 });
    }
    // lobby furniture: two benches, deck plate stencil panels, hazard strip in front of the lift
    for (const s of [-1, 1]) {
      kit.boxMM("paintedMetal", [s * 6.2 - 0.25, FLOOR, 517.2], [s * 6.2 + 0.25, FLOOR + 0.42, 520.2], { color: IMP.dark, texel: 1 });
      kit.boxMM("fabric", [s * 6.2 - 0.32, FLOOR + 0.42, 517.1], [s * 6.2 + 0.32, FLOOR + 0.5, 520.3], { color: IMP.mid, texel: 2 });
      kit.collider([s * 6.2 - 0.35, FLOOR, 517.1], [s * 6.2 + 0.35, FLOOR + 0.5, 520.3], "bench");
    }
    kit.boxMM("hazard", [-LIFT_DOOR.w / 2, FLOOR + 0.012, lz - 0.9], [LIFT_DOOR.w / 2, FLOOR + 0.02, lz - 0.5], { texel: 3 });

    ctx.lights.push({ type: "point", pos: [0, ceilY - 0.6, 519], color: LIGHT.coolWhite, intensity: 14, distance: 14, priority: 0.8 });
    ctx.lights.push({ type: "point", pos: [0, FLOOR + 3.2, lz - 0.7], color: LIGHT.amber, intensity: 3, distance: 6, priority: 0.5 });
    return {};
  },
};
export default manifest;
