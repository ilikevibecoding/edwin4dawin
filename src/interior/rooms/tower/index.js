// Dedicated room builders for the tower cluster. Each room module exports build<Room>(kit, ctx);
// register them here so src/interior/rooms/index.js picks them up.
import { buildBridge } from "./bridge.js";
import { buildHolo } from "./holo.js";
import { buildComms } from "./comms.js";
import { buildIntel } from "./intel.js";
import { buildBriefing } from "./briefing.js";
import { buildObservation } from "./observation.js";

export function register(registerRoom) {
  registerRoom("bridge", buildBridge);
  registerRoom("holo", buildHolo);
  registerRoom("comms", buildComms);
  registerRoom("intel", buildIntel);
  registerRoom("briefing", buildBriefing);
  registerRoom("observation", buildObservation);
}
