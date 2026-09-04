// d1-observation — observation gallery along the tower's port front face. APERTURE OBSERVATION (§6.2):
// x -78..-50, y 241.5..244.5 in the face plane z 455..458; B owns z ≥ 455.5 inside it.
// Layout (x west→east): west screen wall | three seating groups facing the window band with plinths between |
// briefing niche (north) + star-map wall (south) | refreshment counter (north) by the door (south-east).
import { BOUNDS, CEIL, FLOOR, doorsFor } from "../shared/plan.js";
import { roomShell, doorReveal } from "../shared/imperial.js";
import { LIGHT } from "../shared/palette.js";
import { windowBand } from "./window.js";
import { lounge, holoAnchors, GROUPS, EAST_GROUP } from "./lounge.js";
import { eastPart } from "./east.js";
import { dressing, pendant } from "./dressing.js";
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
    "d1-observation-window": { pos: [-64, FLOOR, 465.3], yaw: 0, pitch: -7 },
    "d1-observation-along": { pos: [-24, FLOOR, 462], yaw: 90, pitch: -2 },
    "d1-observation-lounge": { pos: [-44, FLOOR, 460.5], yaw: -120, pitch: -4 },
    "d1-observation-counter": { pos: [-30.5, FLOOR, 464.2], yaw: -18, pitch: -3 },
    "d1-observation-viewer": { pos: [-62.4, FLOOR, 461.9], yaw: 36, pitch: -5 },
    "d1-observation-gallery": { pos: [-47.5, FLOOR, 460.9], yaw: 72, pitch: -3 },
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
      // the window band is the north wall's feature: no waist strip under it (fewer parallel light lines)
      walls: { n: { strip: null } },
      ceiling: { axis: "x", inset: 0.25, channels: [{ at: 460.2, w: 0.5, emit: "emitWhite", emitW: 0.08 }, { at: 463.8, w: 0.5, emit: "emitWhite", emitW: 0.08 }] },
    });
    for (const d of manifest.doors) doorReveal(kit, manifest, d, FLOOR);

    windowBand(kit, A, FLOOR);
    lounge(kit, FLOOR);
    eastPart(kit, FLOOR);
    dressing(kit, FLOOR, ceilY, A);
    const holoUpdate = holoShips(ctx, holoAnchors(FLOOR));

    // --- lights (11 descriptors): warm pools carry the room, the window contributes a cold rim only
    // Cold key: two narrow spots hidden inside the mullions at x -70/-58, high in the reveal, cones pitched down
    // so the reveal head/jambs sit outside the cone (E ≈ 1.6 on the near-black floor).
    for (const x of [-70, -58]) {
      const tx = x + (x < -64 ? 1.6 : -1.6); // lean both cones toward the band's centre so the pools merge
      ctx.lights.push({ type: "spot", pos: [x, A.y1 - 0.2, A.zIn - 0.4], target: [tx, FLOOR, 462.6], color: LIGHT.coolWhite, intensity: 70, distance: 30, angle: 0.6, penumbra: 0.5, priority: 0.9 });
    }
    // Wide low blue-white fill from the window plane (inside the mullion at x -66) so sill and floor pick up a
    // cold rim; cone edge stays ~1.5° above horizontal, i.e. below the head frame.
    ctx.lights.push({ type: "spot", pos: [-66, A.y1 - 0.2, A.zIn - 0.4], target: [-64, FLOOR, 461.5], color: LIGHT.coolWhite, intensity: 16, distance: 24, angle: 0.8, penumbra: 0.6, priority: 0.85 });
    // Warm-white pendant downlights (LIGHT.warm) over the three window-facing groups, the east group, the counter
    // stools and the briefing niche. The point sits inside the pendant can 1.2 m below the ceiling: h ≈ 4.2 m to
    // the floor → E ≈ 1.6, ≈ 2.2 on the table tops, and the ceiling around it no longer blooms.
    const pendants = [
      ...GROUPS.map((x) => [x, 462.1, 28]),
      [EAST_GROUP.cx, 464.0, 28],
      [-29, 461.4, 26],
      [-44.5, 460.4, 18],
    ];
    for (const [x, z, intensity] of pendants) {
      pendant(kit, x, ceilY, z);
      ctx.lights.push({ type: "point", pos: [x, ceilY - 1.2, z], color: LIGHT.warm, intensity, distance: 10, priority: 0.6 });
    }
    // Cool fills at the two ends
    ctx.lights.push({ type: "point", pos: [-81.5, ceilY - 0.4, 462.0], color: LIGHT.coolWhite, intensity: 14, distance: 9, priority: 0.3 });
    ctx.lights.push({ type: "point", pos: [-23, ceilY - 0.4, 463.0], color: LIGHT.coolWhite, intensity: 14, distance: 9, priority: 0.3 });

    return {
      update(dt, t) {
        holoUpdate(t ?? ctx.time());
      },
    };
  },
};
export default manifest;
