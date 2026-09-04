// Dedicated room builders for the crew cluster (Deck 7). Each room module exports build<Room>(kit, ctx);
// they are registered here so src/interior/rooms/index.js picks them up.
import { buildCrewQuarters } from "./crewQuarters.js";
import { buildOfficersQuarters } from "./officersQuarters.js";

export function register(registerRoom) {
  registerRoom("crewQuarters", buildCrewQuarters);
  registerRoom("officersQuarters", buildOfficersQuarters);
}
