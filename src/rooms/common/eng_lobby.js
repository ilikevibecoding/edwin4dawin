// Turbolift Lobby — Engineering (x −6..6, z 252..262, h 4.5). Cabs on the forward wall, blast door aft into the
// engineering corridor. Shared lobby kit plus a vertical coolant riser cluster and a HIGH ENERGY stencil.
import { buildLobby, decalOn, DECAL, IMP } from "./corridor_kit.js";

export const meta = { id: "eng_lobby", stream: "corridors" };

export function build(ctx) {
  buildLobby(ctx, {
    liftSide: "zmin",
    doorSide: "zmax",
    benchSide: "xmax",
    dirSide: "xmin",
    family: "cool",
    variant: 1,
    deckIndex: 3,
    seed: 27,
    lights: 3,
    lightIntensity: 80,
    extras(ctx, L) {
      const kit = ctx.kit;
      // coolant risers in the port corner beside the cabs (xmin wall end), clear of the door approaches
      const f = L.frames.xmin.frame;
      const len = L.frames.xmin.length;
      for (let i = 0; i < 3; i++) {
        const u = len - 0.4 - i * 0.34;
        f.cylV("metal", u, ctx.h / 2, 0.24, 0.11 - i * 0.02, ctx.h - 0.05, { color: i === 1 ? IMP.gunmetal : IMP.steel, segments: 12 });
        f.box("paintedMetal", u, 0.8, 0.24, 0.32, 0.12, 0.34, { color: IMP.black, texel: 1 });
        f.box("paintedMetal", u, 3.1, 0.24, 0.32, 0.12, 0.34, { color: IMP.black, texel: 1 });
      }
      f.collider(len - 1.3, len, 0, ctx.h, 0, 0.45, "risers");
      decalOn(f, len - 1.7, 2.35, 0.06, 0.5, DECAL.WARNING);
    },
  });
}
