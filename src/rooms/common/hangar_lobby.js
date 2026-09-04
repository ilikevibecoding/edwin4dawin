// Turbolift Lobby — Hangar Deck (x −8..8, z −110..−92, h 5). The deepest lobby: cabs on the forward wall,
// a 6×4 m blast door aft into the main hangar. Flight-crew lockers, cargo staging crates, floor arrows to the
// hangar and four ceiling lights on top of the shared lobby kit.
import { buildLobby, floorDecal, describe, props, DECAL, IMP } from "./corridor_kit.js";

export const meta = { id: "hangar_lobby", stream: "corridors" };

export function build(ctx) {
  buildLobby(ctx, {
    liftSide: "zmin",
    doorSide: "zmax",
    benchSide: "xmin",
    dirSide: "xmax",
    family: "cool",
    variant: 2,
    deckIndex: 2,
    seed: 25,
    lights: 4,
    lightIntensity: 70,
    benchShift: -1.15,
    dirShift: -1.15,
    pilasters: { xmin: [3.6, 11.6], xmax: [3.6, 11.6] },
    extras(ctx, L) {
      const kit = ctx.kit;
      const y = ctx.floor;
      // flight-crew lockers on the port wall toward the cabs
      props.lockerRow(kit, L.frames.xmin.frame, 12.2, 6, { lw: 0.6, h: 2.0, d: 0.5, color: IMP.plateDark });
      // cargo staging along the starboard wall near the hangar door (outside the door approach)
      props.crate(kit, { pos: [6.3, y, -96.2], yaw: 0.15, size: [1.3, 1.0, 1.3], color: IMP.plateDark, decal: DECAL.BAY_CODE });
      props.crate(kit, { pos: [6.4, y, -97.9], yaw: -0.1, size: [1.1, 0.8, 1.1], color: IMP.plate, decal: DECAL.TEXT_C });
      props.crate(kit, { pos: [6.3, y + 1.0, -96.2], yaw: 0.35, size: [0.9, 0.7, 0.9], color: IMP.black, decal: DECAL.SPEC_PLATE });
      props.barrel(kit, { pos: [6.6, y, -99.4], r: 0.36, h: 0.95 });
      // floor stencils: arrows toward the hangar door, bay code at the threshold
      const C = describe(ctx, "z");
      floorDecal(ctx, C, -101, C.mid, 1.4, DECAL.ARROW, { dirA: 1 });
      floorDecal(ctx, C, -95.5, C.mid - 2.2, 1.0, DECAL.BAY_CODE, { dirA: 1 });
      floorDecal(ctx, C, -95.5, C.mid + 2.2, 1.0, DECAL.BAY_CODE, { dirA: 1 });
    },
  });
}
