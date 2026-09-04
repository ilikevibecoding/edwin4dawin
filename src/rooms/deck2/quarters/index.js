// Deck 2 crew quarters: stacked bunk bays off a central aisle, lockers, washroom alcove. Neutral
// grey, warm white (§11).
import { defineRoom } from "../_shared/room.js";
import { IMP } from "../_shared/palette.js";

const Y = 40;

export default defineRoom({
  id: "d2-quarters",
  name: "Crew Quarters",
  deck: 2,
  x: [-33, -11],
  z: [340, 372.5],
  ceil: 44.6,
  spawn: { pos: [-22, Y, 370], yaw: 0 },
  views: {
    "d2-quarters-door": { pos: [-22, Y, 370.5], yaw: 0, pitch: -2 },
    "d2-quarters-bunks": { pos: [-31, Y, 367], yaw: -35, pitch: -3 },
    "d2-quarters-aisle": { pos: [-22, Y, 344], yaw: 180, pitch: -2 },
  },
  shell: {
    panelW: 1.6,
    wallColor: IMP.impGrey,
    wallAlt: IMP.impWhite,
    floor: { color: IMP.impMid },
    ceiling: { channels: 5, axis: "z" },
    lights: { count: 6, color: 0xffe2c0, intensity: 34, distance: 14 },
  },
});
