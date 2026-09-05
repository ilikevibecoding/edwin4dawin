// Deck 3 engineering corridor: lobby blast door (z 565) → engineering control door (port wall,
// z 590) → reactor blast door (z 612.5). Same bulkhead rhythm as Deck 2 but with the engineering
// flavour: amber strips, heavy pipe runs on the starboard wall, warm fills.
import { defineRoom } from "../../deck2/_shared/room.js";
import { IMP } from "../../deck2/_shared/palette.js";
import { corridorDetail } from "../../deck2/cor-w/corridor.js";

const Y = 12;
const CEIL = 16.4;

export default defineRoom({
  id: "d3-cor",
  name: "Engineering Corridor",
  deck: 3,
  x: [4, 9],
  z: [565, 612.5],
  ceil: CEIL,
  spawn: { pos: [6.5, Y, 567.5], yaw: 180 },
  views: {
    // frame top lands on the bulkhead beam at z 573, so the nearest lamp in shot is the whole bay-2
    // fixture under it rather than a fixture cut off at the top edge
    "d3-cor-lobby-end": { pos: [7.1, Y, 568.8], yaw: 177, pitch: -3 },
    "d3-cor-mid": { pos: [7.2, Y, 585], yaw: 174, pitch: -1 },
    "d3-cor-engctl-door": { pos: [8, Y, 589], yaw: 96, pitch: 1 },
    "d3-cor-pipes": { pos: [5.9, Y, 600], yaw: -42, pitch: 12 },
  },
  shell: {
    panelW: 2.0,
    ribs: 0,
    stripMat: "emitAmber",
    floor: { color: IMP.impGrey, strip: { axis: "z", width: 1.0, mat: "impFloor", color: IMP.impBlack } }, // impGrey deck as the lobbies (see cor-w)
    ceiling: { channels: 0 },
    lights: false, // the corridor generator pushes its own: warm key spot in the first fixture, fills under every second fixture (two mid bays add a downlight spot), door flood 10.5 m short of the reactor blast door
  },
  detail(ctx, shell, room) {
    // lights (4 spots): key, downlight spots in bays 4 and 6 (z 583 / 591, either side of the mid
    // view's camera — dropping bay 6 cost the mid and engctl-door decks 9 % grey in a test run), and a
    // door flood 10.5 m short of the reactor blast door aimed at it. The far end is a door, so no
    // long-throw (it would shine into the reactor hall); a flood on the far beam lost the spot pool
    // to engctl's and the reactor's keys from both named views. Brought forward to z 600.7 it weighs
    // 21 from the lobby door (the reactor key 27, the mids at priority 0.1 → 24 and 37, so it takes the
    // fourth slot there) and 10.5 from the mid view (mid4 7.5, mid6 12.0, key 12.0: engctl's key at
    // 12.4 is the one culled). Motion: faulty fixture at bay 8 (z 599: 14 m ahead of the mid view),
    // amber beacon hanging before the reactor blast door
    return corridorDetail(ctx, shell, room, { axis: "z", lobbyEnd: "min", accent: "emitAmber", engineering: true, seed: 31, screens: ["screenImp3", "screenImp0"], fill: { color: 0xffd9b8 }, farFlood: { back: 10.5, aim: "end", intensity: 160 }, midSpot: { bays: [4, 6], priority: 0.1 }, flickerBay: 8, farBeacon: "amber" });
  },
});
