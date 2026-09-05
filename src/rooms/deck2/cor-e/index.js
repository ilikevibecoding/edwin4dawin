// Deck 2 spine corridor, starboard arm (x 8..62): lobby blast door at the west end, briefing / rec
// doors forward, security / life-support doors aft, dead-end bulkhead at x 62. Mirror of the port
// arm through the shared corridor generator.
import { defineRoom } from "../_shared/room.js";
import { IMP } from "../_shared/palette.js";
import { corridorDetail } from "../cor-w/corridor.js";

const Y = 40;
const CEIL = 44.4;

export default defineRoom({
  id: "d2-cor-e",
  name: "Deck 2 Corridor — Starboard",
  deck: 2,
  x: [8, 62],
  z: [372.5, 377.5],
  ceil: CEIL,
  spawn: { pos: [11, Y, 375], yaw: -90 },
  views: {
    "d2-cor-e-lobby-end": { pos: [10.5, Y, 375], yaw: -90, pitch: 0 },
    "d2-cor-e-mid": { pos: [34.6, Y, 375.3], yaw: -97, pitch: -1 },
    "d2-cor-e-security-door": { pos: [22, Y, 373.4], yaw: 168, pitch: 2 },
    "d2-cor-e-dead-end": { pos: [56, Y, 375], yaw: -92, pitch: 3 },
  },
  shell: {
    panelW: 2.0,
    ribs: 0,
    floor: { color: IMP.impGrey, strip: { axis: "x", width: 1.0, mat: "impFloor", color: IMP.impBlack } }, // impGrey deck as the lobbies (see cor-w)
    ceiling: { channels: 0 },
    lights: false, // the corridor generator pushes its own: key spot in the first fixture, fills under every second fixture (two mid bays add a downlight spot), long-throw lamp by the lobby door onto the far bulkhead
  },
  detail(ctx, shell, room) {
    // lights: downlight spots in bays 6 and 8 (x 34 / 42, either side of the mid view's camera);
    // motion: faulty fixture at bay 10 (x 50: the third fixture ahead of the mid view, and no view's
    // foreground fill), red beacon on the dead-end bulkhead
    return corridorDetail(ctx, shell, room, { axis: "x", lobbyEnd: "min", accent: "emitBlue", seed: 22, screens: ["screenImp2", "screenImp3"], deadEnd: { screen: "screenImp2", kit: "lockers", beacon: "red" }, farSpot: {}, midSpot: { bays: [6, 8] }, flickerBay: 10 });
  },
});
