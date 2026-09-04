// Deck 3 engineering corridor: lobby blast door (z 565) → engineering control door (port wall,
// z 590) → reactor blast door (z 612.5). Same bulkhead rhythm as Deck 2 but with the engineering
// flavour: amber strips, heavy pipe runs on the starboard wall, warm fills.
import { defineRoom } from "../../deck2/_shared/room.js";
import { IMP } from "../../deck2/_shared/palette.js";
import { corridorDetail } from "../../deck2/cor-w/corridor.js";

const Y = 12;

export default defineRoom({
  id: "d3-cor",
  name: "Engineering Corridor",
  deck: 3,
  x: [4, 9],
  z: [565, 612.5],
  ceil: 16.4,
  spawn: { pos: [6.5, Y, 567.5], yaw: 180 },
  views: {
    "d3-cor-lobby-end": { pos: [6.5, Y, 567.5], yaw: 180, pitch: 0 },
    "d3-cor-mid": { pos: [7.2, Y, 585], yaw: 174, pitch: -1 },
    "d3-cor-engctl-door": { pos: [8, Y, 589], yaw: 96, pitch: 1 },
    "d3-cor-pipes": { pos: [5.9, Y, 600], yaw: -42, pitch: 12 },
  },
  shell: {
    panelW: 2.0,
    ribs: 0,
    stripMat: "emitAmber",
    floor: { color: IMP.impMid, strip: { axis: "z", width: 1.0, mat: "impFloor", color: IMP.impBlack } },
    ceiling: { channels: 0 },
    lights: { count: 7, color: 0xffd9b8, intensity: 26, distance: 12 },
  },
  detail(ctx, shell, room) {
    return corridorDetail(ctx, shell, room, { axis: "z", lobbyEnd: "min", accent: "emitAmber", engineering: true, seed: 31 });
  },
});
