// Forward Crew Corridor — 124 m (x −62..62, z −178..−170, h 4.5). Serves the armory, detention block and the
// escape pods; slightly harder security character: restricted stencils at the secured doors, red-tinted
// cabinets, a weapons-locker wall at the port dead end and a computer wall at the starboard one.
import { buildCorridor, signPlate, decalOn, props, DECAL, IMP } from "./corridor_kit.js";

export const meta = { id: "crew_corridor_fwd", stream: "corridors" };

export function build(ctx) {
  const R = buildCorridor(ctx, {
    axis: "x",
    rings: [-42, -18, 6, 30, 54],
    family: "warm",
    lights: 5,
    lightIntensity: 170,
    laneW: 2.6,
    pointTo: 0,
    hatch: { bay: 3, side: "lo" },
    seed: 13,
    patternOffset: 2,
    ceilingOffset: 2,
  });
  const kit = ctx.kit;
  // RESTRICTED stencils above the secured doors (armory, detention) on the forward wall
  const fwd = R.walls[R.C.sideLo];
  for (const d of fwd.doors) {
    if (!d.door || d.door.kind !== "secure") continue;
    decalOn(fwd.frame, (d.u0 + d.u1) / 2, d.v1 + 1.0, 0.06, 0.7, DECAL.RESTRICTED);
  }
  // dead ends
  {
    const { frame, length } = ctx.wall("xmin");
    props.lockerRow(kit, frame, length / 2 - 2.1, 7, { lw: 0.6, h: 2.0, d: 0.5, color: IMP.plateDark });
    decalOn(frame, length / 2, 2.7, 0.06, 0.6, DECAL.WARNING);
    signPlate(frame, 0.6, 2.3, { w: 0.5, h: 0.72, top: DECAL.NUMBER2, bottom: DECAL.TEXT_A });
  }
  {
    const { frame, length } = ctx.wall("xmax");
    const p = frame.pos(length / 2, 0, 0.6);
    props.computerBank(kit, { pos: [p.x, p.y, p.z], yaw: Math.atan2(frame.N.x, frame.N.z), w: 3.4, h: 2.4, d: 0.6, seed: 53, accent: "emitAmber" });
    signPlate(frame, 0.6, 2.3, { w: 0.5, h: 0.72, top: DECAL.TEXT_B, bottom: DECAL.NUMBER3 });
    signPlate(frame, length - 0.6, 2.3, { w: 0.5, h: 0.72, top: DECAL.BAY_CODE, bottom: null });
  }
}
