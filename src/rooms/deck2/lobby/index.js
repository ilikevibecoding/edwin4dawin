// Deck 2 lift lobby: the hub where the spine corridor arms, the forward corridor and turbolift T2
// meet. The lift cabin volume (x −2..2, y 40..43.6, z 385..389) lies behind the aft wall and is D's.
import { defineRoom } from "../_shared/room.js";
import { IMP } from "../_shared/palette.js";

const Y = 40;

export default defineRoom({
  id: "d2-lobby",
  name: "Deck 2 Lift Lobby",
  deck: 2,
  x: [-8, 8],
  z: [370, 385],
  ceil: 46,
  lift: { id: "T2", pos: [0, Y, 385], dir: [0, 0, -1] },
  openings: [{ face: "s", a0: -1.2, a1: 1.2, y0: Y, y1: Y + 3.0, kind: "lift", id: "T2-door" }],
  spawn: { pos: [0, Y, 377], yaw: 180 },
  views: {
    "d2-lobby-lift": { pos: [0, Y, 372.5], yaw: 180, pitch: -2 },
    "d2-lobby-west": { pos: [5.5, Y, 376.5], yaw: 100, pitch: -1 },
    "d2-lobby-north": { pos: [1.5, Y, 383], yaw: 8, pitch: 2 },
  },
  shell: {
    panelW: 2.0,
    floor: { color: IMP.impMid, strip: { axis: "x", width: 1.2 } },
    ceiling: { channels: 5, axis: "x" },
    lights: { count: 4, intensity: 40, distance: 14 },
  },
});
