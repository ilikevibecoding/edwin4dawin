// Deck 2 forward corridor from the lobby to the escape-pod bay (z 330..370).
import { defineRoom } from "../_shared/room.js";
import { IMP } from "../_shared/palette.js";

const Y = 40;

export default defineRoom({
  id: "d2-cor-n",
  name: "Deck 2 Corridor — Forward",
  deck: 2,
  x: [-2.5, 2.5],
  z: [330, 370],
  ceil: 44.4,
  spawn: { pos: [0, Y, 367], yaw: 0 },
  views: {
    "d2-cor-n-lobby-end": { pos: [0.6, Y, 367.5], yaw: 4, pitch: 0 },
    "d2-cor-n-mid": { pos: [-0.8, Y, 350], yaw: -6, pitch: -1 },
    "d2-cor-n-pod-end": { pos: [0, Y, 334], yaw: 180, pitch: 1 },
  },
  shell: {
    panelW: 2.0,
    ribs: 4,
    floor: { color: IMP.impMid, strip: { axis: "z", width: 1.0 } },
    ceiling: { channels: 0 },
    lights: { count: 5, intensity: 26, distance: 12 },
  },
  detail(ctx, shell, room) {
    const { kit } = ctx;
    const x = 0;
    for (let z = 331; z < 369; z += 4) {
      kit.boxMM("paintedMetal", [x - 0.35, room.ceilY - 0.14, z], [x + 0.35, room.ceilY - 0.02, z + 3.2], { color: IMP.impBlack });
      kit.boxMM("emitWhite", [x - 0.12, room.ceilY - 0.13, z + 0.2], [x + 0.12, room.ceilY - 0.11, z + 3.0]);
    }
    return {};
  },
});
