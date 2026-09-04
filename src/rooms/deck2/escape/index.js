// Deck 2 escape-pod bay: two rows of pod hatches with launch tubes, muster markings, status boards.
import { defineRoom } from "../_shared/room.js";
import { IMP } from "../_shared/palette.js";

const Y = 40;

export default defineRoom({
  id: "d2-escape",
  name: "Escape-Pod Bay",
  deck: 2,
  x: [-20, 20],
  z: [305, 330],
  ceil: 46,
  spawn: { pos: [0, Y, 328], yaw: 0 },
  views: {
    "d2-escape-door": { pos: [0, Y, 328.5], yaw: 0, pitch: -2 },
    "d2-escape-row-west": { pos: [-18, Y, 308], yaw: -135, pitch: -2 },
    "d2-escape-row-east": { pos: [16, Y, 320], yaw: 90, pitch: -2 },
  },
  shell: {
    panelW: 2.0,
    wallColor: IMP.impGrey,
    wallAlt: IMP.impMid,
    stripMat: "emitAmber",
    floor: { color: IMP.impMid },
    ceiling: { channels: 4, axis: "x" },
    lights: { count: 6, color: 0xffe0c0, intensity: 40, distance: 16 },
  },
});
