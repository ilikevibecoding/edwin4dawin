// d1-spine — the 168 m transverse corridor behind the bridge: bridge blast door and lift-lobby blast door face
// each other at x = 0; side passages, officers' country and two locked future-expansion doors at the ends.
import { BOUNDS, CEIL, FLOOR, doorsFor } from "../shared/plan.js";
import { roomShell, corridorDressing, doorReveal } from "../shared/imperial.js";
import { IMP, LIGHT } from "../shared/palette.js";

const ID = "d1-spine";
const B = BOUNDS[ID];

const manifest = {
  id: ID,
  name: "Deck 1 Spine",
  kind: "room",
  deck: 1,
  owner: "B",
  bounds: B,
  doors: doorsFor(ID),
  lift: null,
  spawn: { pos: [0, FLOOR, 514], yaw: 0 },
  apertures: [],
  views: {
    "d1-spine-junction": { pos: [-7, FLOOR, 514], yaw: -90, pitch: -3 },
    "d1-spine-east": { pos: [-40, FLOOR, 514], yaw: -90, pitch: -2 },
    "d1-spine-west": { pos: [40, FLOOR, 514], yaw: 90, pitch: -2 },
    "d1-spine-end-port": { pos: [-78, FLOOR, 514], yaw: 90, pitch: -2 },
  },
  build(ctx) {
    const { kit } = ctx;
    const ceilY = CEIL[ID];
    roomShell(kit, manifest, { floorY: FLOOR, ceilY, seed: 41, panelW: 2.0, strip: "emitWhite", ceiling: { axis: "x", inset: 0.25, channels: [{ at: 514, w: 0.5, emit: "emitWhite", emitW: 0.16 }] } });
    corridorDressing(kit, manifest, FLOOR, ceilY);
    for (const d of manifest.doors) doorReveal(kit, manifest, d, FLOOR);
    // junction node: hazard threshold strips across the corridor in front of both blast doors
    kit.boxMM("hazard", [-2.2, FLOOR + 0.012, 512.3], [2.2, FLOOR + 0.02, 512.7], { texel: 3 });
    kit.boxMM("hazard", [-2.2, FLOOR + 0.012, 515.3], [2.2, FLOOR + 0.02, 515.7], { texel: 3 });
    // 13 descriptors (budget 14): one pool every 12 m, the junction pool highest priority
    for (let x = -72; x <= 72; x += 12) ctx.lights.push({ type: "point", pos: [x, ceilY - 0.5, 514], color: LIGHT.coolWhite, intensity: 8, distance: 13, priority: x === 0 ? 0.9 : 0.3 });
    return {};
  },
};
export default manifest;
