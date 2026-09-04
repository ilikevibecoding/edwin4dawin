import { ROOMS } from "/workspace/src/core/layout.js";
import { readFileSync } from "node:fs";
const src = readFileSync("/workspace/src/systems/audio.js", "utf8");
const m = src.match(/const ROOM_PROFILES = \{([\s\S]*?)\n\};/);
const keys = [...m[1].matchAll(/^\s{2}([a-z_]+):/gm)].map((x) => x[1]);
const roomIds = ROOMS.map((r) => r.id);
console.log("rooms:", roomIds.length, "profiles:", keys.length);
console.log("rooms without explicit profile:", roomIds.filter((id) => !keys.includes(id)));
console.log("profiles without room:", keys.filter((k) => !roomIds.includes(k)));
// accent keys used by rooms vs ACCENT_PROFILES
const accents = [...new Set(ROOMS.map((r) => r.accent))];
console.log("accents used:", accents);
