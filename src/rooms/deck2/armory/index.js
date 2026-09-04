// Deck 2 armory: weapon racks behind a secured cage, armour lockers, issue counter. Dark grey, red
// strips (§11).
import { defineRoom } from "../_shared/room.js";
import { IMP } from "../_shared/palette.js";

const Y = 40;

export default defineRoom({
  id: "d2-armory",
  name: "Armory",
  deck: 2,
  x: [-27, -11],
  z: [377.5, 400],
  ceil: 44.6,
  spawn: { pos: [-19, Y, 380], yaw: 180 },
  views: {
    "d2-armory-door": { pos: [-19, Y, 380], yaw: 180, pitch: -2 },
    "d2-armory-racks": { pos: [-25, Y, 398], yaw: -45, pitch: -3 },
    "d2-armory-cage": { pos: [-13, Y, 389], yaw: 90, pitch: -2 },
  },
  shell: {
    panelW: 1.6,
    wallColor: IMP.impMid,
    wallAlt: IMP.impGrey,
    corniceColor: IMP.impDark,
    stripMat: "emitRedImp",
    floor: { color: IMP.impDark },
    ceiling: { channels: 4, axis: "z", color: IMP.impDark },
    lights: { count: 4, color: 0xffd9d0, intensity: 24, distance: 13 },
  },
});
