// d1-corridor-stbd — starboard side passage beside the bridge: spine ↔ forward end, with doors to the
// bridge (aft deck), tactical planning and the restricted intelligence room.
import { BOUNDS, CEIL, FLOOR, doorsFor } from "../shared/plan.js";
import { roomShell, corridorDressing, doorReveal } from "../shared/imperial.js";
import { IMP, LIGHT } from "../shared/palette.js";

const ID = "d1-corridor-stbd";
const B = BOUNDS[ID];

const manifest = {
  id: ID,
  name: "Starboard Passage",
  kind: "room",
  deck: 1,
  owner: "B",
  bounds: B,
  doors: doorsFor(ID),
  lift: null,
  spawn: { pos: [21.8, FLOOR, 509], yaw: 0 },
  apertures: [],
  views: {
    "d1-corridor-stbd-north": { pos: [21.8, FLOOR, 510], yaw: 0, pitch: -2 },
    "d1-corridor-stbd-south": { pos: [21.8, FLOOR, 468], yaw: 180, pitch: -2 },
    "d1-corridor-stbd-intel-door": { pos: [20.8, FLOOR, 501.5], yaw: -55, pitch: -3 },
  },
  build(ctx) {
    const { kit } = ctx;
    const ceilY = CEIL[ID];
    roomShell(kit, manifest, { floorY: FLOOR, ceilY, seed: 37, panelW: 2.0, strip: "emitWhite", ceiling: { axis: "z", inset: 0.25, channels: [{ at: 21.8, w: 0.5, emit: "emitWhite", emitW: 0.16 }] } });
    corridorDressing(kit, manifest, FLOOR, ceilY);
    for (const d of manifest.doors) doorReveal(kit, manifest, d, FLOOR);
    // forward dead end: a sealed maintenance hatch panel with red status so the end reads intentional
    kit.boxMM("paintedMetal", [21.0, FLOOR + 0.3, 466.3], [22.6, FLOOR + 2.4, 466.42], { color: IMP.dark, texel: 1 });
    kit.boxMM("emitRedImp", [21.7, FLOOR + 2.5, 466.3], [21.9, FLOOR + 2.56, 466.36]);
    for (let z = 470; z < 512; z += 8) ctx.lights.push({ type: "point", pos: [21.8, ceilY - 0.5, z], color: LIGHT.coolWhite, intensity: 7, distance: 11, priority: 0.5 });
    return {};
  },
};
export default manifest;
