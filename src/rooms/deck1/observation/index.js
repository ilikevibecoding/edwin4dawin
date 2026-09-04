// d1-observation — observation gallery along the tower's port front face. APERTURE OBSERVATION (§6.2):
// x -78..-50, y 241.5..244.5 in the face plane z 455..458; B owns z ≥ 455.5 inside it.
// Layout (x west→east): west screen wall | three seating groups facing the window band with plinths between |
// briefing niche (north) + star-map wall (south) | refreshment counter (north) by the door (south-east).
import { BOUNDS, CEIL, FLOOR, doorsFor } from "../shared/plan.js";
import { roomShell, doorReveal } from "../shared/imperial.js";
import { LIGHT } from "../shared/palette.js";
import { windowBand } from "./window.js";
import { lounge, holoAnchors, GROUPS } from "./lounge.js";
import { eastPart } from "./east.js";
import { dressing } from "./dressing.js";
import { holoShips } from "./holo.js";

const ID = "d1-observation";
const B = BOUNDS[ID];
const A = { x0: -78, x1: -50, y0: 241.5, y1: 244.5, zOut: 455.5, zIn: 458 };

const manifest = {
  id: ID,
  name: "Observation Gallery",
  kind: "room",
  deck: 1,
  owner: "B",
  bounds: B,
  doors: doorsFor(ID),
  lift: null,
  spawn: { pos: [-22, FLOOR, 462], yaw: 90 },
  apertures: ["observation"],
  views: {
    "d1-observation-window": { pos: [-64, FLOOR, 464.5], yaw: 0, pitch: -1 },
    "d1-observation-along": { pos: [-24, FLOOR, 462], yaw: 90, pitch: -2 },
    "d1-observation-lounge": { pos: [-44, FLOOR, 460.5], yaw: -120, pitch: -4 },
    "d1-observation-counter": { pos: [-30.5, FLOOR, 464.2], yaw: -18, pitch: -3 },
    "d1-observation-viewer": { pos: [-62.4, FLOOR, 461.9], yaw: 36, pitch: -5 },
  },
  build(ctx) {
    const { kit } = ctx;
    const ceilY = CEIL[ID];
    const win = { a0: A.x0, a1: A.x1, y0: A.y0, y1: A.y1, kind: "window" };
    roomShell(kit, manifest, {
      floorY: FLOOR,
      ceilY,
      seed: 53,
      panelW: 2.4,
      strip: "emitWhite",
      extra: { n: [win] },
      ceiling: { axis: "x", inset: 0.25, channels: [{ at: 460.2, w: 0.5, emit: "emitWhite", emitW: 0.14 }, { at: 463.8, w: 0.5, emit: "emitWhite", emitW: 0.14 }] },
    });
    for (const d of manifest.doors) doorReveal(kit, manifest, d, FLOOR);

    windowBand(kit, A, FLOOR);
    lounge(kit, FLOOR);
    eastPart(kit, FLOOR);
    dressing(kit, FLOOR, ceilY);
    const holoUpdate = holoShips(ctx, holoAnchors(FLOOR));

    // --- lights (12 descriptors)
    // Cold star-light: two spots hidden inside the mullions at x -70/-58, high in the reveal, cones pitched down
    // so the reveal head/jambs sit outside the cone. The floor is near-black gloss, so E ≈ 2 at 6.5 m (≈ 85) is
    // needed for the wash to read; nothing the cone touches is close to the source.
    for (const x of [-70, -58]) {
      const tx = x + (x < -64 ? 1.6 : -1.6); // lean both cones toward the band's centre so the pools merge
      ctx.lights.push({ type: "spot", pos: [x, A.y1 - 0.2, A.zIn - 0.4], target: [tx, FLOOR, 462.6], color: LIGHT.coolWhite, intensity: 85, distance: 30, angle: 0.6, penumbra: 0.5, priority: 0.9 });
    }
    // Cool fill under the north ceiling channel (z 460.2), between beams: lights the mullion caps, rail and viewers
    for (const x of [-68, -60]) ctx.lights.push({ type: "point", pos: [x, ceilY - 0.6, 460.2], color: LIGHT.coolWhite, intensity: 22, distance: 11, priority: 0.6 });
    // Warm-white pools over each seating group (h ≈ 5 m → 30) and over the counter stools
    for (const x of GROUPS) ctx.lights.push({ type: "point", pos: [x, ceilY - 0.35, 462.6], color: LIGHT.warm, intensity: 30, distance: 11, priority: 0.5 });
    ctx.lights.push({ type: "point", pos: [-29, ceilY - 0.35, 461.4], color: LIGHT.warm, intensity: 30, distance: 10, priority: 0.5 });
    // Cool fills: star-map wall (blue), briefing niche, west end, door end
    ctx.lights.push({ type: "point", pos: [-38, FLOOR + 3.2, 464.3], color: LIGHT.blue, intensity: 9, distance: 9, priority: 0.3 });
    ctx.lights.push({ type: "point", pos: [-44.5, ceilY - 0.4, 461.0], color: LIGHT.coolWhite, intensity: 16, distance: 9, priority: 0.35 });
    ctx.lights.push({ type: "point", pos: [-81.5, ceilY - 0.4, 462.0], color: LIGHT.coolWhite, intensity: 16, distance: 9, priority: 0.3 });
    ctx.lights.push({ type: "point", pos: [-23, ceilY - 0.4, 463.0], color: LIGHT.coolWhite, intensity: 16, distance: 9, priority: 0.3 });

    return {
      update(dt, t) {
        holoUpdate(t ?? ctx.time());
      },
    };
  },
};
export default manifest;
