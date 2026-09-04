// Crew Deck Corridor — 124 m, 8 m wide (x −62..62, z −130..−122, h 4.5). Warmer plating tints, wider lane,
// crew lockers at the dead ends. Doors: quarters / mess / connector (open) / lounge / medbay forward, lobby aft.
import { buildCorridor, signPlate, props, DECAL, IMP } from "./corridor_kit.js";

export const meta = { id: "crew_corridor", stream: "corridors" };

export function build(ctx) {
  buildCorridor(ctx, {
    axis: "x",
    rings: [-34, -10, 10, 34],
    family: "warm",
    lights: 5,
    lightIntensity: 170,
    laneW: 2.6,
    pointTo: 0,
    hatch: { bay: 0, side: "hi" },
    seed: 11,
    patternOffset: 1,
    ceilingOffset: 1,
  });
  const kit = ctx.kit;
  // dead ends: stormtrooper locker rows + a notice panel
  for (const side of ["xmin", "xmax"]) {
    const { frame, length } = ctx.wall(side);
    props.lockerRow(kit, frame, length / 2 - 2.4, 8, { lw: 0.6, h: 2.0, d: 0.5, color: side === "xmin" ? IMP.plateDark : IMP.plateWarm });
    props.wallPanel(kit, frame, length / 2, 2.75, { w: 1.6, h: 0.5, accent: "emitAmber", seed: side === "xmin" ? 41 : 43, screen: false });
    signPlate(frame, 0.6, 2.3, { w: 0.5, h: 0.72, top: DECAL.NUMBER1, bottom: DECAL.TEXT_A });
    signPlate(frame, length - 0.6, 2.3, { w: 0.5, h: 0.72, top: DECAL.TEXT_B, bottom: null });
  }
}
