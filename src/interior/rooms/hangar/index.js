// Dedicated room builders for the hangar cluster. Each room module exports build<Room>(kit, ctx);
// register them here so src/interior/rooms/index.js picks them up.
import { buildHangar } from "./hangar.js";

export function register(registerRoom) {
  registerRoom("hangar", buildHangar);
}
