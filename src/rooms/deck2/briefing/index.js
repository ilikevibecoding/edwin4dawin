// Deck 2 briefing room: tiered seating facing a holo table and a wall display. Blue displays, amber
// status, holo cyan (§11).
import { defineRoom } from "../_shared/room.js";
import { IMP } from "../_shared/palette.js";

const Y = 40;

export default defineRoom({
  id: "d2-briefing",
  name: "Briefing Room",
  deck: 2,
  x: [11, 33],
  z: [348, 372.5],
  ceil: 46,
  spawn: { pos: [22, Y, 370], yaw: 0 },
  views: {
    "d2-briefing-door": { pos: [22, Y, 370.5], yaw: 0, pitch: -3 },
    "d2-briefing-holo": { pos: [13, Y, 352], yaw: -135, pitch: -4 },
    "d2-briefing-seats": { pos: [22, Y, 350.5], yaw: 180, pitch: -3 },
  },
  shell: {
    panelW: 1.6,
    wallColor: IMP.impGrey,
    wallAlt: IMP.impMid,
    floor: { color: IMP.impDark, mat: "blackGloss" },
    ceiling: { channels: 4, axis: "x", color: IMP.impDark },
    lights: { count: 4, color: 0xbfd4ff, intensity: 30, distance: 15 },
  },
});
