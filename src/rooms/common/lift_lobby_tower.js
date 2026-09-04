// Turbolift Lobby — Command Deck (x −6..6, z 212..222, h 4.5). Cabs on the aft wall (lift system), blast door
// forward to the command corridor. Deck signage between the cab doors, call indicators, a directory alcove,
// bench seating, the emblem opposite the lifts and a soffit ceiling with recessed strips.
import { buildLobby } from "./corridor_kit.js";

export const meta = { id: "lift_lobby_tower", stream: "corridors" };

export function build(ctx) {
  buildLobby(ctx, {
    liftSide: "zmax",
    doorSide: "zmin",
    benchSide: "xmin",
    dirSide: "xmax",
    family: "cool",
    deckIndex: 0,
    seed: 21,
    lights: 3,
    lightIntensity: 80,
  });
}
