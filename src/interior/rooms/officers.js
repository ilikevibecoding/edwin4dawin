// Officers' quarters: Four officer cabins off a private hall.
// Stub: Imperial shell only. The room workstream replaces the body of build() with real contents,
// keeping the shell call (walls/floor/ceiling/door openings come from the spec) unless it builds its own.
import { roomShell } from "../shell.js";

export function build(kit, ctx, room, lib) {
  const shell = roomShell(kit, ctx, room, { style: "light" });
  return shell;
}
