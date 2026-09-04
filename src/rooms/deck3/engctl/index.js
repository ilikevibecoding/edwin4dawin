// Deck 3 engineering control: a two-level control room whose aft wall is a wide window onto the
// reactor chamber. Amber + orange, thick pipes, big machinery (§11).
import { defineRoom } from "../../deck2/_shared/room.js";
import { IMP } from "../../deck2/_shared/palette.js";

const Y = 12;

// Window onto the reactor, shared plane z 612.5 with d3-reactor (which cuts the same hole).
export const REACTOR_WINDOW = { a0: -26, a1: -2, y0: Y + 1.2, y1: Y + 5.5 };

export default defineRoom({
  id: "d3-engctl",
  name: "Engineering Control",
  deck: 3,
  x: [-30, 4],
  z: [572, 612.5],
  ceil: 22,
  openings: [{ face: "s", ...REACTOR_WINDOW, glass: true, id: "engctl-reactor-window" }],
  spawn: { pos: [2, Y, 590], yaw: 90 },
  views: {
    "d3-engctl-door": { pos: [2, Y, 590], yaw: 90, pitch: -2 },
    "d3-engctl-window": { pos: [-14, Y, 598], yaw: 180, pitch: 4 },
    "d3-engctl-mezz": { pos: [-28, Y, 575], yaw: -135, pitch: 4 },
  },
  shell: {
    panelW: 2.0,
    wallColor: IMP.impMid,
    wallAlt: IMP.impGrey,
    stripMat: "emitAmber",
    floor: { color: IMP.impDark, mat: "blackGloss" },
    ceiling: { channels: 5, axis: "x", color: IMP.impDark },
    lights: { count: 6, color: 0xffcf9a, intensity: 46, distance: 18 },
  },
});
