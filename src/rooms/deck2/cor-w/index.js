// Deck 2 spine corridor, port arm (x −62..−8): lobby blast door at the east end, medbay / quarters
// doors on the forward wall, mess (blast) / armory doors aft, dead-end bulkhead at x −62. Detail
// comes from the shared corridor generator so all three Deck 2 arms read as one corridor.
import { defineRoom } from "../_shared/room.js";
import { IMP } from "../_shared/palette.js";
import { corridorDetail } from "./corridor.js";

const Y = 40;

export default defineRoom({
  id: "d2-cor-w",
  name: "Deck 2 Corridor — Port",
  deck: 2,
  x: [-62, -8],
  z: [372.5, 377.5],
  ceil: 44.4,
  spawn: { pos: [-11, Y, 375], yaw: 90 },
  views: {
    "d2-cor-w-lobby-end": { pos: [-10.5, Y, 375], yaw: 90, pitch: 0 },
    "d2-cor-w-mid": { pos: [-36, Y, 374.2], yaw: 82, pitch: -1 },
    "d2-cor-w-medbay-door": { pos: [-47, Y, 376.6], yaw: 12, pitch: 2 },
    "d2-cor-w-dead-end": { pos: [-56, Y, 375], yaw: 88, pitch: 3 },
  },
  shell: {
    panelW: 2.0,
    ribs: 0,
    floor: { color: IMP.impMid, strip: { axis: "x", width: 1.0, mat: "impFloor", color: IMP.impBlack } },
    ceiling: { channels: 0 },
    lights: { count: 7, intensity: 26, distance: 12 },
  },
  detail(ctx, shell, room) {
    return corridorDetail(ctx, shell, room, { axis: "x", lobbyEnd: "max", accent: "emitBlue", seed: 21 });
  },
});
