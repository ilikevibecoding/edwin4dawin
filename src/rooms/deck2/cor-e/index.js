// Deck 2 spine corridor, starboard arm (x 8..62).
import { defineRoom } from "../_shared/room.js";
import { IMP } from "../_shared/palette.js";

const Y = 40;

export default defineRoom({
  id: "d2-cor-e",
  name: "Deck 2 Corridor — Starboard",
  deck: 2,
  x: [8, 62],
  z: [372.5, 377.5],
  ceil: 44.4,
  spawn: { pos: [11, Y, 375], yaw: -90 },
  views: {
    "d2-cor-e-lobby-end": { pos: [10.5, Y, 375], yaw: -90, pitch: 0 },
    "d2-cor-e-mid": { pos: [36, Y, 375.8], yaw: -98, pitch: -1 },
    "d2-cor-e-security-door": { pos: [22, Y, 373.4], yaw: 168, pitch: 2 },
  },
  shell: {
    panelW: 2.0,
    ribs: 4,
    floor: { color: IMP.impMid, strip: { axis: "x", width: 1.0 } },
    ceiling: { channels: 0 },
    lights: { count: 6, intensity: 26, distance: 12 },
  },
  detail(ctx, shell, room) {
    const { kit } = ctx;
    const z = 375;
    for (let x = 9; x < 61; x += 4) {
      kit.boxMM("paintedMetal", [x, room.ceilY - 0.14, z - 0.35], [x + 3.2, room.ceilY - 0.02, z + 0.35], { color: IMP.impBlack });
      kit.boxMM("emitWhite", [x + 0.2, room.ceilY - 0.13, z - 0.12], [x + 3.0, room.ceilY - 0.11, z + 0.12]);
    }
    return {};
  },
});
