// Deck 2 recreation lounge: seating clusters, game tables, a dispenser bar, viewing screens.
import { defineRoom } from "../_shared/room.js";
import { IMP } from "../_shared/palette.js";

const Y = 40;

export default defineRoom({
  id: "d2-rec",
  name: "Recreation Lounge",
  deck: 2,
  x: [36, 60],
  z: [344, 372.5],
  ceil: 45,
  spawn: { pos: [48, Y, 370], yaw: 0 },
  views: {
    "d2-rec-door": { pos: [48, Y, 370.5], yaw: 0, pitch: -2 },
    "d2-rec-bar": { pos: [58, Y, 346.5], yaw: 135, pitch: -3 },
    "d2-rec-tables": { pos: [38.5, Y, 360], yaw: -90, pitch: -3 },
  },
  shell: {
    panelW: 1.6,
    wallColor: IMP.impGrey,
    wallAlt: IMP.impWhite,
    floor: { color: IMP.impMid },
    ceiling: { channels: 5, axis: "x" },
    lights: { count: 6, color: 0xffe0bd, intensity: 34, distance: 15 },
  },
});
