// Deck 3 engineering corridor: lobby → engineering control (port side door) → reactor blast door.
import { defineRoom } from "../../deck2/_shared/room.js";
import { IMP } from "../../deck2/_shared/palette.js";

const Y = 12;

export default defineRoom({
  id: "d3-cor",
  name: "Engineering Corridor",
  deck: 3,
  x: [4, 9],
  z: [565, 612.5],
  ceil: 16.4,
  spawn: { pos: [6.5, Y, 567.5], yaw: 180 },
  views: {
    "d3-cor-lobby-end": { pos: [6.5, Y, 567.5], yaw: 180, pitch: 0 },
    "d3-cor-mid": { pos: [7.2, Y, 585], yaw: 174, pitch: -1 },
    "d3-cor-engctl-door": { pos: [8, Y, 589], yaw: 96, pitch: 1 },
  },
  shell: {
    panelW: 2.0,
    ribs: 4,
    stripMat: "emitAmber",
    floor: { color: IMP.impMid, strip: { axis: "z", width: 1.0 } },
    ceiling: { channels: 0 },
    lights: { count: 6, color: 0xffd9b8, intensity: 26, distance: 12 },
  },
  detail(ctx, shell, room) {
    const { kit } = ctx;
    const x = 6.5;
    for (let z = 566; z < 611.5; z += 4) {
      kit.boxMM("paintedMetal", [x - 0.35, room.ceilY - 0.14, z], [x + 0.35, room.ceilY - 0.02, z + 3.2], { color: IMP.impBlack });
      kit.boxMM("emitWhite", [x - 0.12, room.ceilY - 0.13, z + 0.2], [x + 0.12, room.ceilY - 0.11, z + 3.0]);
    }
    return {};
  },
});
