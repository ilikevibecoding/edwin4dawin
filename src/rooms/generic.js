// Placeholder room builder: a fully panelled Imperial shell with a default light rig and a few props,
// so every room is walkable and lit before its dedicated builder lands. Dedicated builders replace
// this per room in rooms/index.js.
import * as THREE from "three";
import { PALETTE } from "../materials.js";
import { impRoomShell, impDefaultLights, impConsole, impCrate, impWallGear, roomWalls } from "./imperial_kit.js";
import { rng } from "../kit.js";

export function buildGeneric(kit, ctx, room) {
  const [w, h, d] = room.size;
  const accent = new THREE.Color(room.accent || "#4f8dff");
  const accentKey = ctx.accentKey ? ctx.accentKey(room) : "emitBlue";
  impRoomShell(kit, room, ctx.doors, { accentKey });
  impDefaultLights(kit, room, { accent: accent.getHex() });
  const rand = rng(room.id.length * 7 + 1);
  // a console against the wall opposite the main door, a couple of crates in a corner
  impConsole(kit, 0, 0, -d / 2 + 1.2, Math.min(3.2, w * 0.4), 0.9, { yaw: Math.PI, seed: 11, accentKey });
  impCrate(kit, w / 2 - 1.2, 0, d / 2 - 1.2, 1.2, 1.0, 1.2, { seed: 3 });
  impCrate(kit, w / 2 - 1.2, 1.0, d / 2 - 1.2, 1.0, 0.8, 1.0, { seed: 4 });
  const walls = roomWalls(kit, room);
  impWallGear(walls.E.frame, d * 0.3, 1.5, { seed: 5, accentKey });
  // placeholder label so critics can tell a generic room from a finished one
  kit.light({ type: "point", pos: [0, h - 0.6, 0], color: 0xffffff, intensity: 2, distance: 6, priority: 0.2 });
}
