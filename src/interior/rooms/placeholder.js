// Placeholder room builder used until a room gets its dedicated builder: a complete Imperial shell
// (floor, ceiling, lit walls with door openings) plus a name plate and a few crates, so every room is
// walkable and readable during layout / navigation testing.
import * as THREE from "three";
import { PALETTE } from "../../materials.js";
import { roomShell, crate, wallScreen, equipmentRack } from "../imperial.js";
import { rng } from "../../kit.js";

export function makePlaceholder(name) {
  return function buildPlaceholder(kit, ctx) {
    const [min, max] = ctx.bounds;
    const w = max[0] - min[0];
    const d = max[2] - min[2];
    roomShell(kit, ctx);
    const rand = rng(ctx.seed);
    // a couple of racks on the wall opposite the first door, screens beside them
    const door = ctx.doors[0];
    const side = door ? (door.wall === "z" ? (door.pos[0] < (min[0] + max[0]) / 2 ? "xmax" : "xmin") : door.pos[1] < (min[2] + max[2]) / 2 ? "zmax" : "zmin") : "zmin";
    const len = side.startsWith("z") ? w : d;
    if (len > 5) {
      equipmentRack(kit, ctx, { side, u: len * 0.3, w: 1.4, h: Math.min(2.6, max[1] - 0.8), seed: ctx.seed });
      wallScreen(kit, ctx, { side, u: len * 0.6, v: 1.6, w: 1.4, h: 0.8, screen: Math.floor(rand() * 3) });
    }
    // crates scattered off the walkway
    const n = Math.min(6, Math.floor((w * d) / 40));
    for (let i = 0; i < n; i++) {
      const x = min[0] + 1.2 + rand() * (w - 2.4);
      const z = min[2] + 1.2 + rand() * (d - 2.4);
      // keep the door approaches clear
      if (ctx.doors.some((dd) => Math.hypot(dd.pos[0] - x, dd.pos[1] - z) < 3.5)) continue;
      crate(kit, ctx, { x, z, sx: 0.9 + rand() * 0.8, sy: 0.7 + rand() * 0.8, sz: 0.9 + rand() * 0.8, yaw: rand() * 0.6, seed: ctx.seed + i });
    }
    // room name plate: a lit bar so the placeholder is identifiable in screenshots
    const cx = (min[0] + max[0]) / 2;
    const cz = (min[2] + max[2]) / 2;
    kit.box("paintedMetal", cx, max[1] - 0.5, cz, Math.min(3, w * 0.5), 0.3, 0.1, { color: PALETTE.impBlack, texel: 2 });
    kit.box("emitAmber", cx, max[1] - 0.5, cz + 0.055, Math.min(2.6, w * 0.45), 0.12, 0.01);
    void THREE;
    void name;
  };
}
