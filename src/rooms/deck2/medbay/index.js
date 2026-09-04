// Deck 2 medbay: ward beds, surgical bay, bacta tanks, pharmacy. White panels, cool blue light,
// green vitals (§11).
import { defineRoom } from "../_shared/room.js";
import { IMP } from "../_shared/palette.js";

const Y = 40;

export default defineRoom({
  id: "d2-medbay",
  name: "Medbay",
  deck: 2,
  x: [-60, -36],
  z: [340, 372.5],
  ceil: 45,
  spawn: { pos: [-48, Y, 370], yaw: 0 },
  views: {
    "d2-medbay-door": { pos: [-48, Y, 370.5], yaw: 0, pitch: -2 },
    "d2-medbay-wards": { pos: [-58, Y, 343], yaw: -135, pitch: -3 },
    "d2-medbay-surgery": { pos: [-38.5, Y, 358], yaw: 90, pitch: -4 },
  },
  shell: {
    panelW: 1.6,
    wallColor: IMP.medWhite,
    wallAlt: IMP.impWhite,
    corniceColor: IMP.impGrey,
    floor: { color: IMP.impGrey },
    ceiling: { channels: 4, axis: "z", color: IMP.impMid },
    lights: { count: 6, color: 0xd8e8ff, intensity: 42, distance: 16 },
  },
});
