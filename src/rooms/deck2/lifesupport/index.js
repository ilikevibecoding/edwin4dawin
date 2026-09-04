// Deck 2 life support: air scrubbers, water tanks, waste reclamation. Tall room with a service
// catwalk; teal + white, tanks, filters, ducting (§11). Content lives in ./detail.js.
import { defineRoom } from "../_shared/room.js";
import { IMP } from "../_shared/palette.js";
import { detail } from "./detail.js";

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
    // from the door: walkway between the tank farm (left) and the scrubber bank (right)
    "d2-lifesupport-door": { pos: [50, Y, 380], yaw: 180, pitch: 4 },
    // water section: tanks, manifold, pump skids
    "d2-lifesupport-water": { pos: [48.5, Y, 384.5], yaw: 150, pitch: 6 },
    // air section: scrubber cabinets under the duct trunk and catwalk, filter skid, stairs at the end
    "d2-lifesupport-air": { pos: [57.0, Y, 386.0], yaw: -160, pitch: 6 },
    // from the aft catwalk: the whole plant room — tanks, skids, walkway, control station
    "d2-lifesupport-catwalk": { pos: [51.5, Y + 4.5, 413.9], yaw: 15, pitch: -12 },
  },
  shell: {
    panelW: 2.0,
    wallColor: IMP.impGrey,
    wallAlt: IMP.impWhite,
    stripMat: "emitTeal",
    floor: { color: IMP.impMid },
    ceiling: { channels: 4, axis: "z" },
    lights: false,
  },
  detail,
});
