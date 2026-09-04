// Dedicated room builders for the hangar cluster. Each room module exports build<Room>(kit, ctx);
// register them here so src/interior/rooms/index.js picks them up.
import { buildHangar } from "./hangar.js";
import { buildFighterMaint } from "./fighterMaint.js";
import { buildShuttleBay } from "./shuttleBay.js";
import { buildEscapePods } from "./escapePods.js";

export function register(registerRoom) {
  registerRoom("hangar", buildHangar);
  registerRoom("fighterMaint", buildFighterMaint);
  registerRoom("shuttleBay", buildShuttleBay);
  registerRoom("escapePods", buildEscapePods);
}
