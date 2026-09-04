// Deck 2 spine corridor, starboard arm (x 8..62): lobby blast door at the west end, briefing / rec
// doors forward, security / life-support doors aft, dead-end bulkhead at x 62. Mirror of the port
// arm through the shared corridor generator.
import { defineRoom } from "../_shared/room.js";
import { IMP } from "../_shared/palette.js";
import { corridorDetail } from "../cor-w/corridor.js";

const Y = 40;

export default defineRoom({
  id: "d2-cor-e",
  name: "Deck 2 Corridor — Starboard",
  deck: 2,
  x: [8, 62],
  z: [372.5, 377.5],
  ceil: 44.4,
  spawn: { pos: [11, Y, 375], yaw: -90 },
  views: {
    "d2-cor-e-lobby-end": { pos: [10.5, Y, 375], yaw: -90, pitch: 0 },
    "d2-cor-e-mid": { pos: [36, Y, 375.8], yaw: -98, pitch: -1 },
    "d2-cor-e-security-door": { pos: [22, Y, 373.4], yaw: 168, pitch: 2 },
    "d2-cor-e-dead-end": { pos: [56, Y, 375], yaw: -92, pitch: 3 },
  },
  shell: {
    panelW: 2.0,
    ribs: 0,
    floor: { color: IMP.impMid, strip: { axis: "x", width: 1.0, mat: "impFloor", color: IMP.impBlack } },
    ceiling: { channels: 0 },
    lights: { count: 7, intensity: 26, distance: 12 },
  },
  detail(ctx, shell, room) {
    return corridorDetail(ctx, shell, room, { axis: "x", lobbyEnd: "min", accent: "emitBlue", seed: 22 });
  },
});
