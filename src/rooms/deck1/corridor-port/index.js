// d1-corridor-port — port side passage beside the bridge: spine ↔ observation gallery, with doors to the
// bridge (aft deck), navigation and comms.
import { BOUNDS, CEIL, FLOOR, doorsFor } from "../shared/plan.js";
import { roomShell, corridorDressing, doorReveal } from "../shared/imperial.js";
import { IMP, LIGHT } from "../shared/palette.js";

const ID = "d1-corridor-port";
const B = BOUNDS[ID];

const manifest = {
  id: ID,
  name: "Port Passage",
  kind: "room",
  deck: 1,
  owner: "B",
  bounds: B,
  doors: doorsFor(ID),
  lift: null,
  spawn: { pos: [-21.8, FLOOR, 509], yaw: 0 },
  apertures: [],
  views: {
    "d1-corridor-port-north": { pos: [-21.8, FLOOR, 510], yaw: 0, pitch: -2 },
    "d1-corridor-port-south": { pos: [-21.8, FLOOR, 468], yaw: 180, pitch: -2 },
    "d1-corridor-port-nav-door": { pos: [-20.8, FLOOR, 481.5], yaw: 55, pitch: -3 },
  },
  build(ctx) {
    const { kit } = ctx;
    const ceilY = CEIL[ID];
    roomShell(kit, manifest, { floorY: FLOOR, ceilY, seed: 31, panelW: 2.0, strip: "emitWhite", ceiling: { axis: "z", inset: 0.25, channels: [{ at: -21.8, w: 0.5, emit: "emitWhite", emitW: 0.16 }] } });
    corridorDressing(kit, manifest, FLOOR, ceilY);
    for (const d of manifest.doors) doorReveal(kit, manifest, d, FLOOR);
    for (let z = 470; z < 512; z += 8) ctx.lights.push({ type: "point", pos: [-21.8, ceilY - 0.5, z], color: LIGHT.coolWhite, intensity: 7, distance: 11, priority: 0.5 });
    return {};
  },
};
export default manifest;
