// Dedicated room builders for the tower cluster. Each room module exports build<Room>(kit, ctx);
// register them here so src/interior/rooms/index.js picks them up.
import { buildHolo } from "./holo.js";
import { buildComms } from "./comms.js";
import { buildIntel } from "./intel.js";

export function register(registerRoom) {
  // registerRoom("roomId", buildRoom);
  registerRoom("holo", buildHolo);
  registerRoom("comms", buildComms);
  registerRoom("intel", buildIntel);
}
