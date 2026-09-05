// Deck 2 forward corridor from the lobby blast door (z 370) to the escape-pod bay door (z 330).
// Same treatment and 4 m bulkhead rhythm as the spine arms via the shared corridor generator.
import { defineRoom } from "../_shared/room.js";
import { IMP } from "../_shared/palette.js";
import { corridorDetail } from "../cor-w/corridor.js";

const Y = 40;
const CEIL = 44.4;

export default defineRoom({
  id: "d2-cor-n",
  name: "Deck 2 Corridor — Forward",
  deck: 2,
  x: [-2.5, 2.5],
  z: [330, 370],
  ceil: CEIL,
  spawn: { pos: [0, Y, 367], yaw: 0 },
  views: {
    "d2-cor-n-lobby-end": { pos: [0.6, Y, 367.5], yaw: 4, pitch: 0 },
    "d2-cor-n-mid": { pos: [-0.8, Y, 350], yaw: -6, pitch: -1 },
    "d2-cor-n-pod-end": { pos: [0, Y, 334], yaw: 180, pitch: 1 },
  },
  shell: {
    panelW: 2.0,
    ribs: 0,
    floor: { color: IMP.impGrey, strip: { axis: "z", width: 1.0, mat: "impFloor", color: IMP.impBlack } }, // impGrey deck as the lobbies (see cor-w)
    ceiling: { channels: 0 },
    lights: false, // the corridor generator pushes its own: key spot in the first fixture, fills under every second fixture (two mid bays add a downlight spot), flood at the pod end
  },
  detail(ctx, shell, room) {
    // explicit bay order so the arm shares no service-bay kit position with cor-w / cor-e: seen from
    // the lobby door the first port alcove is a workbench (cor-w opens on a crate stack), the mid
    // bays are drums / cabinet / workbench rather than the three-locker row cor-e shows there
    // lights (4 spots): key raked onto the bay-1 workbench alcove (z 364, west wall), downlight spot
    // in bay 6 (z 344, ahead of the mid view's camera), alcove downlight in the bay-5 service bay (the
    // drum pair at z 348 on the west wall, the mid view's fg-L barrel: it casts the barrel's contact
    // shadow onto the deck), and the pod-end flood aimed back at the deck: with only the lobby and
    // the escape bay as neighbours it stays live from the lobby door (the pod door reads lit from
    // there), and from the pod end it is the one corridor spot live — the escape bay's three spots
    // 5–15 m through that door take the rest of the pool — so it carries that deck (measured: without
    // it the pod-end deck fell from 26 % to 17 % grey). No long-throw: both ends are doors, so the beam
    // would shine through into the escape bay. Motion: faulty fixture at bay 8 (z 336: 14 m ahead of
    // the mid view, the pod-end deck under it is carried by the flood); no bulkhead beacon (no bulkhead)
    return corridorDetail(ctx, shell, room, { axis: "z", lobbyEnd: "max", accent: "emitBlue", seed: 23, screens: ["screenImp1", "screenImp2"], bigKinds: ["lockers", "drums", "cabinet", "workbench", "crates", "bench"], farFlood: {}, midSpot: { bays: [6] }, alcoveSpot: { bay: 5 }, flickerBay: 8 });
  },
});
