// Deck 2 escape-pod bay: two rows of pod hatches with launch tubes, muster markings, status boards.
// Content lives in ./detail.js.
import { defineRoom } from "../_shared/room.js";
import { IMP } from "../_shared/palette.js";
import { detail, podOpenings } from "./detail.js";

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
    // from the door: the muster runway to the pod status board, hatch rows and fixtures either side
    "d2-escape-door": { pos: [0, Y, 328.2], yaw: 0, pitch: -2 },
    // west row of pod stations receding forward (pod 3 open on its cabin, tool cart in the gap)
    "d2-escape-west-row": { pos: [-13.0, Y, 327.4], yaw: 27, pitch: 2 },
    // east row from the forward end: FAULT pod 2, open pod 4, door and lockers in the distance
    "d2-escape-east-row": { pos: [13.6, Y, 307.6], yaw: -152, pitch: 2 },
    // pod status board with the suit rack and supply shelves along the forward wall
    "d2-escape-board": { pos: [-3.4, Y, 312.2], yaw: -6, pitch: 4 },
  },
  // square wall holes behind the two open hatches (closed off by the cabin tubes in detail.js)
  openings: podOpenings(Y),
  shell: {
    panelW: 2.0,
    wallColor: IMP.impGrey,
    wallAlt: IMP.impMid,
    stripMat: "emitAmber",
    // the deck material is metallic, so the floor reads as whatever it mirrors: a mid ceiling and a
    // slightly lifted floor tint keep the wide bay from going black between the amber accents.
    // The runway strip is built in detail.js (it stops short of the door dressing's threshold).
    floor: { color: 0x6a6e76 },
    ceiling: { channels: 4, axis: "x", stripMat: "emitAmber", color: IMP.impMid },
    doorDressing: { accent: "emitAmber" },
    serviceBand: { y: 3.95, faces: ["n", "s"] },
    lights: false,
  },
  detail,
});
