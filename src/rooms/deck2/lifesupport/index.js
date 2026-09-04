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
    // water section: transfer pump in the foreground, the tank row (amber-banded tank 2 with its sight
    // glass, tank 4 with the manway open), manifold and pump skids
    "d2-lifesupport-water": { pos: [45.6, Y, 383.6], yaw: 160, pitch: 5 },
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
    // cool-white channel strips: the teal emitter (Kestrel key, intensity 2.4) mirrored in the metal
    // tank rims as a blown streak; the wall strips stay teal
    ceiling: { channels: 4, axis: "z", stripMat: "emitWhite" },
    doorDressing: { accent: "emitTeal" },
    // cable tray + pipe runs across the bare 4.7–5.4 m band of the forward and west walls (the east
    // and aft walls carry the catwalk at that height)
    serviceBand: { y: 4.7, faces: ["n", "w"] },
    lights: false,
  },
  detail,
});
