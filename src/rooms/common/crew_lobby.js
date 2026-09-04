// Turbolift Lobby — Crew Deck (x −6..6, z −122..−112, h 4.5). Cabs on the aft wall, blast door forward to the
// crew corridor. Same lobby kit with the warmer crew tint family and a second variant of wall rows.
import { buildLobby } from "./corridor_kit.js";

export const meta = { id: "crew_lobby", stream: "corridors" };

export function build(ctx) {
  buildLobby(ctx, {
    liftSide: "zmax",
    doorSide: "zmin",
    benchSide: "xmax",
    dirSide: "xmin",
    family: "warm",
    variant: 3,
    deckIndex: 1,
    seed: 23,
    lights: 3,
    lightIntensity: 80,
  });
}
