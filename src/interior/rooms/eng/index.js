// Dedicated room builders for the eng cluster (Deck 12 — Engineering). Each room module exports
// build<Room>(kit, ctx); register them here so src/interior/rooms/index.js picks them up.
import { buildReactor } from "./reactor.js";
import { buildEngControl } from "./engControl.js";
import { buildHyperdrive } from "./hyperdrive.js";
import { buildLifeSupport } from "./lifeSupport.js";
import { buildMaintenance } from "./maintenance.js";
import { buildCargo } from "./cargo.js";

export function register(registerRoom) {
  registerRoom("reactor", buildReactor);
  registerRoom("engControl", buildEngControl);
  registerRoom("hyperdrive", buildHyperdrive);
  registerRoom("lifeSupport", buildLifeSupport);
  registerRoom("maintenance", buildMaintenance);
  registerRoom("cargo", buildCargo);
}
