// Turbolift lobby: the arrival point on every deck. Two lift cabs off the side walls, a deck
// directory screen, a bench, deck numerals and a ceiling light bar.
import { buildShell, roomWalls, wallOpenings } from "../../shell.js";
import { LiftSystem } from "../../lifts.js";
import { wallFrame } from "../../../core/frame.js";
import { wallScreen, bench, ceilingLight, pointLightDesc } from "../../impKit.js";
import { IMP } from "../../../materials/imperial.js";
import { impDecalRect } from "../../../materials/imperialTextures.js";
import { STD } from "../../../config/layout.js";

export function makeLiftLobbyBuilder(lifts) {
  return (kit, ctx) => {
    const id = ctx.id;
    const room = ctx.room;
    const y = ctx.floorY;
    const [x0, z0, x1, z1] = room.box;
    const extra = LiftSystem.openingsFor(id);
    buildShell(kit, ctx, id, room, {
      extraOpenings: extra,
      wall: { pitch: 3.5, styles: { plain: 0.7, control: 0.15, vent: 0.15 }, tone: IMP.wallLight, toneAlt: IMP.wallMid },
      ceiling: { lights: false, panelW: 1.6 },
      floor: { strip: false },
    });
    lifts.buildCabs(kit, ctx, id);
    const walls = roomWalls(room);
    // deck directory + numerals; kept clear of any door in that wall
    const signWall = z1 - z0 > 12 ? "south" : "north";
    {
      const w = walls[signWall];
      const { frame } = wallFrame(kit, w.from, w.to, y);
      const mid = w.length / 2;
      const has = wallOpenings(id, room, signWall).length > 0;
      const u = has ? Math.max(1.2, mid - 5) : mid;
      wallScreen(frame, u, 1.55, 1.6, 0.9, 2);
      frame.quad("impDecal", u - 1.4, 1.7, 0.062, 0.7, 0.7, { uvRect: impDecalRect(14) });
      frame.quad("impDecal", u + 1.4, 1.7, 0.062, 0.7, 0.7, { uvRect: impDecalRect(3) });
    }
    // bench along the north wall (away from the lift doors on the side walls)
    if (z1 - z0 > 10) bench(kit, [(x0 + x1) / 2, y, z0 + 0.7], 2.4, 0, { back: true });
    // ceiling light bars
    const cz = (z0 + z1) / 2;
    ceilingLight(kit, ctx, [(x0 + x1) / 2, y + room.h, cz], Math.min(x1 - x0 - 2, 8), "x", { intensity: 6, distance: 10, priority: 2 });
    if (z1 - z0 > 12) {
      ceilingLight(kit, ctx, [(x0 + x1) / 2, y + room.h, z0 + 3], 6, "x", { intensity: 3.5, distance: 8 });
      ceilingLight(kit, ctx, [(x0 + x1) / 2, y + room.h, z1 - 3], 6, "x", { intensity: 3.5, distance: 8 });
    }
    // amber deck-number glow strip at the base of the lift walls
    for (const s of [-1, 1]) kit.boxMM("emitAmber", [s > 0 ? x1 - 0.5 : x0 + 0.3, y + 0.02, z0 + 1], [s > 0 ? x1 - 0.3 : x0 + 0.5, y + 0.04, z1 - 1]);
    pointLightDesc(ctx, IMP.amber, 1.2, 5, [(x0 + x1) / 2, y + 0.4, cz], 0);
    ctx.view(id, (x0 + x1) / 2, y + STD.eye, z1 - 1.5, 0, -3);
    ctx.view(id + "_lifts", (x0 + x1) / 2 - 3, y + STD.eye, cz, -90, -4);
  };
}
