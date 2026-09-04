// Deck Connector — 40 m longitudinal link between the two crew corridors (x −3..3, z −170..−130, h 4.5).
// Both ends are permanent 6 m openings ('open' doors build nothing), so this room owns the two angular
// passage frames that line the wall gap. Two bulkhead rings split it into three bays.
import { buildCorridor, floorDecal, props, DECAL, IMP } from "./corridor_kit.js";
import { WALL_T } from "../../core/layout.js";

export const meta = { id: "crew_connector", stream: "corridors" };

export function build(ctx) {
  const R = buildCorridor(ctx, {
    axis: "z",
    rings: [-156.5, -143.5],
    family: "warm",
    lights: 2,
    lightIntensity: 130,
    laneW: 2.2,
    pointTo: -130,
    hatch: { bay: -1 },
    seed: 17,
    patternOffset: 2,
    ceilingOffset: 1,
  });
  const kit = ctx.kit;
  // passage frames through the wall gaps at both ends (full corridor width, 3.2 m clear)
  for (const d of ctx.doors) {
    if (d.type !== "arch") continue;
    const z = d.door.at;
    props.doorFrame(kit, { pos: [0, ctx.floor, z], yaw: 0, w: d.door.to - d.door.from, h: d.door.h, d: WALL_T, sill: false, wide: true, accent: "emitWhite" });
    // threshold stencils: arrows into the corridors
    floorDecal(ctx, R.C, z + (z > -150 ? -1.6 : 1.6), R.C.mid, 1.2, DECAL.ARROW, { dirA: z > -150 ? 1 : -1 });
  }
  void IMP;
}
