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
    // mid: 0.8 m further from the east wall, 1.5 m back and tilted down 6°, so the fg-L locker row's
    // base and the deck in front of it (where the alcove downlight puts its contact shadow) are in
    // frame — at pitch −1 from z 585 the lockers were cut at the knees
    "d3-cor-mid": { pos: [6.4, Y, 583.5], yaw: 184, pitch: -6 },
    // engctl-door: up 5° from level so the bay-6 ceiling grille that lights this wall is in frame
    // (the critic's crop had a black ceiling band with no fixture)
    "d3-cor-engctl-door": { pos: [8, Y, 589], yaw: 96, pitch: 6 },
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
    // lights (4 spots): key raked onto the bay-1 cabinet alcove (z 571, east wall — the lobby-end
    // view's fg-L), downlight spot in bay 6 (z 591, ahead of the mid view's camera — dropping it cost
    // the mid and engctl-door decks 9 % grey in a test run), alcove downlight in the bay-5 service bay
    // (the locker row at z 587 on the east wall, the mid view's fg-L: it casts the lockers' contact
    // shadow band onto the deck and is the shadow caster from the mid view), and a door flood 10.5 m
    // short of the reactor blast door aimed at it. The far end is a door, so no long-throw (it would
    // shine into the reactor hall); a flood on the far beam lost the spot pool to engctl's and the
    // reactor's keys from both named views. Motion: faulty fixture at bay 8 (z 599: 14 m ahead of the
    // mid view), amber beacon hanging before the reactor blast door; the last beam carries the lit
    // amber lintel that marks the terminus from the lobby door
    // Key cone 0.5 rad (0.7 elsewhere): the heavy coolant mains run on the east wall at 2.75–3.8 m,
    // 1.3 m from the key and 24° off its raked axis, and the steel pipe seen end-on from the pipes
    // view mirrored the key as a white blob at 29 m (the critic's "far wall lamp with a flare"). At
    // 0.5 the pipe sits in the cone's outer penumbra (~25 % of the key), the bay-1 cabinet and its
    // deck stay in the core (6–12° off axis).
    return corridorDetail(ctx, shell, room, { axis: "z", lobbyEnd: "min", accent: "emitAmber", engineering: true, seed: 31, screens: ["screenImp3", "screenImp0"], fill: { color: 0xffd9b8 }, key: { angle: 0.5 }, farFlood: { back: 10.5, aim: "end", intensity: 160 }, midSpot: { bays: [6], priority: 0.1 }, alcoveSpot: { bay: 5 }, flickerBay: 8, farBeacon: "amber" });
  },
});
