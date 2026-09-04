// Generic Imperial compartment: a shell with consoles along one wall, a few containers, lockers and
// ceiling lights. This is the stand-in every room starts from until its dedicated builder lands;
// the finished ship should have no room left on this builder.
import { buildShell, roomWalls } from "../../shell.js";
import { wallFrame } from "../../../core/frame.js";
import { console as impConsole, crate, ceilingLight, lockers, rng, chair } from "../../impKit.js";
import { IMP } from "../../../materials/imperial.js";
import { STD } from "../../../config/layout.js";

export function buildGenericRoom(kit, ctx) {
  const id = ctx.id;
  const room = ctx.room;
  const y = ctx.floorY;
  const [x0, z0, x1, z1] = room.box;
  const w = x1 - x0;
  const d = z1 - z0;
  const rand = rng(id.length * 131 + 7);
  buildShell(kit, ctx, id, room, { wall: { pitch: 4 }, ceiling: { lightPitch: 5 }, floor: { strip: false } });
  const walls = roomWalls(room);
  // console row along the north wall
  const n = Math.max(1, Math.floor((w - 3) / 2.2));
  for (let i = 0; i < n; i++) {
    const x = x0 + 1.5 + (i + 0.5) * ((w - 3) / n);
    impConsole(kit, ctx, [x, y, z0 + 2.6], 0, { kind: "wide", width: Math.min(2.0, (w - 3) / n - 0.3), seed: i + 3, light: i % 2 === 0 });
    if (rand() < 0.7) chair(kit, [x, y, z0 + 3.4], 0);
  }
  // lockers on the west wall if there's room, crates in the south-east corner
  if (d > 8) {
    const wl = walls.west;
    const { frame } = wallFrame(kit, wl.from, wl.to, y);
    lockers(frame, 1.0, Math.min(wl.length - 1, 6), 2.1, { seed: id.length });
  }
  const cx = x1 - 2.2;
  const cz = z1 - 2.2;
  crate(kit, [cx, y, cz], [1.4, 1.2, 1.0], { seed: 1 });
  crate(kit, [cx - 1.6, y, cz], [1.2, 0.9, 1.0], { seed: 2 });
  crate(kit, [cx, y + 1.2, cz], [1.0, 0.8, 0.9], { seed: 3, collide: false });
  // lights
  const nl = Math.max(1, Math.round(d / 7));
  for (let i = 0; i < nl; i++) {
    const z = z0 + ((i + 0.5) / nl) * d;
    ceilingLight(kit, ctx, [(x0 + x1) / 2, y + room.h, z], Math.min(w - 3, 6), "x", { intensity: 5, distance: 10, priority: i === 0 ? 1 : 0 });
  }
  ctx.view(id, (x0 + x1) / 2, y + STD.eye, z1 - 2, 0, -4);
}
