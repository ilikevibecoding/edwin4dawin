// Deck 2 mess hall + galley: long tables under a high ceiling, serving line, galley behind a counter.
import { defineRoom } from "../_shared/room.js";
import { IMP } from "../_shared/palette.js";

const Y = 40;

export default defineRoom({
  id: "d2-mess",
  name: "Mess Hall & Galley",
  deck: 2,
  x: [-62, -30],
  z: [377.5, 412],
  ceil: 46.5,
  spawn: { pos: [-46, Y, 380], yaw: 180 },
  views: {
    "d2-mess-door": { pos: [-46, Y, 380], yaw: 180, pitch: -2 },
    "d2-mess-hall": { pos: [-60, Y, 410], yaw: -32, pitch: -2 },
    "d2-mess-galley": { pos: [-33, Y, 395], yaw: 90, pitch: -3 },
  },
  shell: {
    panelW: 1.8,
    wallColor: IMP.impGrey,
    wallAlt: IMP.impWhite,
    floor: { color: IMP.impMid },
    ceiling: { channels: 4.5, axis: "z" },
    lights: { count: 6, color: 0xffe6cc, intensity: 44, distance: 18 },
  },
});
