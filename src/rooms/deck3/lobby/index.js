// Deck 3 lift lobby (engineering). Turbolift T3 on the aft wall; the cabin volume x −2..2,
// y 12..15.6, z 565..569 is D's. The engineering corridor leaves through a blast door at x 6.5.
import { defineRoom } from "../../deck2/_shared/room.js";
import { IMP } from "../../deck2/_shared/palette.js";

const Y = 12;

export default defineRoom({
  id: "d3-lobby",
  name: "Deck 3 Lift Lobby",
  deck: 3,
  x: [-10, 10],
  z: [549, 565],
  ceil: 17,
  lift: { id: "T3", pos: [0, Y, 565], dir: [0, 0, -1] },
  openings: [{ face: "s", a0: -1.2, a1: 1.2, y0: Y, y1: Y + 3.0, kind: "lift", id: "T3-door" }],
  spawn: { pos: [0, Y, 556], yaw: 180 },
  views: {
    "d3-lobby-lift": { pos: [0, Y, 551], yaw: 180, pitch: -2 },
    "d3-lobby-cor-door": { pos: [-5, Y, 554], yaw: -150, pitch: -1 },
    "d3-lobby-forward": { pos: [2, Y, 563], yaw: 10, pitch: 0 },
  },
  shell: {
    panelW: 2.0,
    wallColor: IMP.impGrey,
    wallAlt: IMP.impMid,
    stripMat: "emitAmber",
    floor: { color: IMP.impDark, strip: { axis: "z", width: 1.2 } },
    ceiling: { channels: 5, axis: "z" },
    lights: { count: 4, color: 0xffd8b0, intensity: 36, distance: 14 },
  },
});
