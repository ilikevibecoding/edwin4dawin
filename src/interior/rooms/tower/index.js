// Dedicated room builders for the tower cluster. Each room module exports build<Room>(kit, ctx);
// register them here so src/interior/rooms/index.js picks them up.
import { buildBridge } from "./bridge.js";
export function register(registerRoom) {
  // registerRoom("roomId", buildRoom);
  registerRoom("bridge", buildBridge);
}
