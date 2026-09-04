// Deck 2 life support: air scrubbers, water tanks, waste reclamation. Tall room with a service
// catwalk; teal + white, tanks, filters, ducting (§11).
import { defineRoom } from "../_shared/room.js";
import { IMP } from "../_shared/palette.js";

const Y = 40;

export default defineRoom({
  id: "d2-lifesupport",
  name: "Life Support",
  deck: 2,
  x: [38, 62],
  z: [377.5, 415],
  ceil: 50,
  spawn: { pos: [50, Y, 380], yaw: 180 },
  views: {
    "d2-lifesupport-door": { pos: [50, Y, 380], yaw: 180, pitch: 5 },
    "d2-lifesupport-tanks": { pos: [40.5, Y, 412], yaw: -45, pitch: 8 },
    "d2-lifesupport-catwalk": { pos: [59.5, Y, 395], yaw: 90, pitch: 10 },
  },
  shell: {
    panelW: 2.0,
    wallColor: IMP.impGrey,
    wallAlt: IMP.impWhite,
    stripMat: "emitTeal",
    floor: { color: IMP.impMid },
    ceiling: { channels: 4, axis: "z" },
    lights: { count: 6, color: 0xcfeee8, intensity: 48, distance: 18 },
  },
});
