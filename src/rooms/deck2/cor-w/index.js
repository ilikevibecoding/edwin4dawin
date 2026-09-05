// Deck 2 spine corridor, port arm (x −62..−8): lobby blast door at the east end, medbay / quarters
// doors on the forward wall, mess (blast) / armory doors aft, dead-end bulkhead at x −62. Detail
// comes from the shared corridor generator so all three Deck 2 arms read as one corridor.
import { defineRoom } from "../_shared/room.js";
import { IMP } from "../_shared/palette.js";
import { corridorDetail } from "./corridor.js";

const Y = 40;
const CEIL = 44.4;

export default defineRoom({
  id: "d2-cor-w",
  name: "Deck 2 Corridor — Port",
  deck: 2,
  x: [-62, -8],
  z: [372.5, 377.5],
  ceil: CEIL,
  spawn: { pos: [-11, Y, 375], yaw: 90 },
  views: {
    "d2-cor-w-lobby-end": { pos: [-10.5, Y, 375], yaw: 90, pitch: 0 },
    "d2-cor-w-mid": { pos: [-36.8, Y, 374.5], yaw: 82, pitch: -1 },
    "d2-cor-w-medbay-door": { pos: [-47, Y, 376.6], yaw: 12, pitch: 2 },
    "d2-cor-w-dead-end": { pos: [-56, Y, 375], yaw: 88, pitch: 3 },
  },
  shell: {
    panelW: 2.0,
    ribs: 0,
    floor: { color: IMP.impGrey, strip: { axis: "x", width: 1.0, mat: "impFloor", color: IMP.impBlack } }, // impGrey deck as the lobbies: the plate map is dark and the rig's environment capture took the studio sheen away
    ceiling: { channels: 0 },
    lights: false, // the corridor generator pushes its own: key spot in the first fixture, fills under every second fixture (two mid bays add a downlight spot), long-throw lamp by the lobby door onto the far bulkhead
  },
  detail(ctx, shell, room) {
    // lights: key raked onto the bay-1 crate stack (x −14, south wall — the lobby-end view's fg-L);
    // downlight spot in bay 8 (x −42, 5 m ahead of the mid view's camera) flagged as that view's
    // shadow caster: the mid view's fg-L is the wall cabinet at x −42 on the south wall, 1.5 m up,
    // and a downlight 2 m out from that wall is what puts its shadow on the panel under it (an
    // alcove spot in the bay-7 niche at x −38 lit a niche beside the camera, out of frame); motion:
    // faulty fixture at bay 4 (x −26: in shot from the lobby door, and the one fill whose dropout
    // carries no view's foreground deck), red beacon on the dead-end bulkhead
    return corridorDetail(ctx, shell, room, { axis: "x", lobbyEnd: "max", accent: "emitBlue", seed: 21, screens: ["screenImp0", "screenImp1"], deadEnd: { screen: "screenImp1", kit: "cabinet", beacon: "red" }, farSpot: {}, midSpot: { bays: [8], shadow: true }, flickerBay: 4 });
  },
});
