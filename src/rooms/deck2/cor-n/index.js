// Deck 2 forward corridor from the lobby blast door (z 370) to the escape-pod bay door (z 330).
// Same treatment and 4 m bulkhead rhythm as the spine arms via the shared corridor generator.
import { defineRoom } from "../_shared/room.js";
import { IMP } from "../_shared/palette.js";
import { corridorDetail } from "../cor-w/corridor.js";

const Y = 40;

export default defineRoom({
  id: "d2-cor-n",
  name: "Deck 2 Corridor — Forward",
  deck: 2,
  x: [-2.5, 2.5],
  z: [330, 370],
  ceil: 44.4,
  spawn: { pos: [0, Y, 367], yaw: 0 },
  views: {
    "d2-cor-n-lobby-end": { pos: [0.6, Y, 367.5], yaw: 4, pitch: 0 },
    "d2-cor-n-mid": { pos: [-0.8, Y, 350], yaw: -6, pitch: -1 },
    "d2-cor-n-pod-end": { pos: [0, Y, 334], yaw: 180, pitch: 1 },
  },
  shell: {
    panelW: 2.0,
    ribs: 0,
    floor: { color: IMP.impMid, strip: { axis: "z", width: 1.0, mat: "impFloor", color: IMP.impBlack } },
    ceiling: { channels: 0 },
    lights: { count: 6, intensity: 26, distance: 12 },
  },
  detail(ctx, shell, room) {
    return corridorDetail(ctx, shell, room, { axis: "z", lobbyEnd: "max", accent: "emitBlue", seed: 23 });
  },
});
