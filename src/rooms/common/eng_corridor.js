// Engineering Corridor — 140 m, 8 m wide (x −70..70, z 262..270, h 4.5). Cyan engineering accent, heavier
// conduit runs high on the aft wall, hazard stencils at the hyperdrive / life-support blast doors, and
// pressure-vessel plating at the dead ends.
import { buildCorridor, signPlate, decalOn, props, DECAL, IMP } from "./corridor_kit.js";

export const meta = { id: "eng_corridor", stream: "corridors" };

export function build(ctx) {
  const R = buildCorridor(ctx, {
    axis: "x",
    rings: [-62, -40, -18, 18, 40, 62],
    family: "cool",
    lights: 7,
    lightIntensity: 170,
    laneW: 2.6,
    pointTo: 0,
    hatch: { bay: 5, side: "lo" },
    seed: 19,
    patternOffset: 3,
    ceilingOffset: 2,
    pipeColor: IMP.steel,
    ringTrim: IMP.gunmetal,
  });
  const kit = ctx.kit;
  const C = R.C;
  // heavy service mains running the length of the aft wall just under the cove (clear of the pilasters)
  const aft = R.walls[C.sideHi];
  {
    const y = ctx.floor + 3.55;
    const s = C.s1 - 0.62;
    props.pipeRun(kit, { points: [C.P(C.a0 + 0.4, s, y), C.P(C.a1 - 0.4, s, y)], r: 0.16, color: IMP.gunmetal, clamps: 4.8, clampColor: IMP.black });
    props.pipeRun(kit, { points: [C.P(C.a0 + 0.4, s + 0.18, y - 0.32), C.P(C.a1 - 0.4, s + 0.18, y - 0.32)], r: 0.09, color: IMP.steel, clamps: 4.8, clampColor: IMP.black });
    // hangers tie the mains back into the wall between the pilasters
    for (let a = C.a0 + 2.4; a < C.a1 - 1; a += 4.8) {
      kit.boxMM("paintedMetal", C.P(a - 0.06, s - 0.1, y - 0.06), C.P(a + 0.06, C.s1 + 0.02, y + 0.06), { color: IMP.black, texel: 1 });
    }
  }
  // HIGH ENERGY warnings above the hyperdrive / life-support blast doors
  for (const d of aft.doors) {
    if (!d.door || d.door.kind !== "blast" || d.other === "engineering") continue;
    decalOn(aft.frame, (d.u0 + d.u1) / 2, d.v1 + 0.85, 0.06, 0.8, DECAL.WARNING);
  }
  // dead ends: valve manifolds — a plated bulkhead with a vertical pipe cluster and gauges
  for (const side of ["xmin", "xmax"]) {
    const { frame, length } = ctx.wall(side);
    const cu = length / 2;
    frame.box("paintedMetal", cu, 1.9, 0.12, 3.6, 3.4, 0.24, { color: IMP.black, texel: 1 });
    for (let i = 0; i < 4; i++) {
      const u = cu - 1.2 + i * 0.8;
      frame.cylV("metal", u, 1.8, 0.4, 0.13, 3.0, { color: i % 2 ? IMP.steel : IMP.gunmetal, segments: 14 });
      frame.box("paintedMetal", u, 0.7, 0.4, 0.4, 0.14, 0.4, { color: IMP.darkMetal, texel: 1 });
      frame.box("paintedMetal", u, 2.9, 0.4, 0.4, 0.14, 0.4, { color: IMP.darkMetal, texel: 1 });
      frame.box("darkGloss", u, 1.5, 0.56, 0.22, 0.22, 0.04);
      frame.box(i % 2 ? "emitCyan" : "emitAmber", u, 1.5, 0.585, 0.1, 0.1, 0.01);
    }
    frame.box("hazard", cu, 0.16, 0.3, 3.6, 0.08, 0.56, { texel: 2 });
    frame.collider(cu - 1.8, cu + 1.8, 0, 3.6, 0, 0.62, "manifold");
    signPlate(frame, 0.6, 2.3, { w: 0.5, h: 0.72, top: DECAL.WARNING, bottom: DECAL.TEXT_B });
  }
}
