// Room registry: room id -> builder(kit, ctx). Dedicated room modules register here; anything not
// listed falls back to the generic compartment until its module lands.
import { ROOMS } from "../../config/layout.js";
import { makeCorridorBuilder } from "../corridors.js";
import { makeLiftLobbyBuilder } from "./common/liftLobby.js";
import { buildGenericRoom } from "./common/generic.js";
import { register as registerTower } from "./tower/index.js";
import { register as registerCrew } from "./crew/index.js";
import { register as registerEng } from "./eng/index.js";
import { register as registerHangar } from "./hangar/index.js";

// Dedicated builders (filled in by the room workstreams via their cluster index files)
const DEDICATED = {};

export function registerRoom(id, builder) {
  DEDICATED[id] = builder;
}
registerTower(registerRoom);
registerCrew(registerRoom);
registerEng(registerRoom);
registerHangar(registerRoom);

export function builderFor(id, systems) {
  const spec = ROOMS[id];
  if (DEDICATED[id]) return DEDICATED[id];
  if (spec.corridor) return makeCorridorBuilder(id);
  if (spec.lobby) return makeLiftLobbyBuilder(systems.lifts);
  return buildGenericRoom;
}

export function isDedicated(id) {
  return !!DEDICATED[id];
}

// Rooms that are sub-spaces of another room are built by their host and skipped here
export function buildableRoomIds() {
  return Object.keys(ROOMS).filter((id) => !ROOMS[id].sub);
}
