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
    // from the door: the muster runway (checkpoint pedestals, gate, stretcher trolley) to the pod
    // status board, hatch rows and the three fixture rows overhead
    "d2-escape-door": { pos: [0, Y, 328.2], yaw: 0, pitch: -2 },
    // west row of pod stations receding forward (pod 4 open on its cabin second from the camera,
    // tool cart in the gap, belt dividers right)
    "d2-escape-west-row": { pos: [-12.5, Y, 327.0], yaw: 33, pitch: 2 },
    // east row from the forward end: open pod 2 second from the camera, FAULT pod 3 behind its
    // barriers, info pylon, door and lockers in the distance
    "d2-escape-east-row": { pos: [12.5, Y, 307.5], yaw: -152, pitch: 2 },
    // pod status board with the suit rack and supply shelves along the forward wall
    "d2-escape-board": { pos: [-2.2, Y, 309.8], yaw: -8, pitch: 5 },
  },
  // square wall holes behind the two open hatches (closed off by the cabin tubes in detail.js)
  openings: podOpenings(Y),
  shell: {
    panelW: 2.0,
    wallColor: IMP.impGrey,
    wallAlt: IMP.impMid,
    stripMat: "emitAmber",
    // the deck material is metallic, so the floor reads as whatever it mirrors: a light-mid ceiling
    // and a lifted floor tint (one step above impMid) keep the wide bay from falling to ~15 % grey
    // between the amber accents. The runway strip is built in detail.js (it stops short of the door
    // dressing's threshold).
    floor: { color: 0x868a92 },
    ceiling: { channels: 4, axis: "x", stripMat: "emitAmber", color: 0x7a7e86 },
    doorDressing: { accent: "emitAmber" },
    serviceBand: { y: 3.95, faces: ["n", "s"] },
    lights: false,
  },
  detail,
});
