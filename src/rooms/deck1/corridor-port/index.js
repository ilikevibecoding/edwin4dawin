// d1-corridor-port — port side passage beside the bridge: spine ↔ observation gallery, with doors to the
// bridge (aft deck), navigation and comms. Shell from shared/imperial.js; bay detail from ../spine/dressing.js.
import { BOUNDS, CEIL, FLOOR, doorsFor } from "../shared/plan.js";
import { roomShell, corridorDressing, doorReveal } from "../shared/imperial.js";
import { LIGHT } from "../shared/palette.js";
import { signMaterials } from "../spine/signage.js";
import { corridorFrame, dressCorridor, doorSigns, signPanel, arrowToward, SIGN_TOP } from "../spine/dressing.js";

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
  materials() {
    return signMaterials();
  },
  build(ctx) {
    const { kit } = ctx;
    const ceilY = CEIL[ID];
    roomShell(kit, manifest, { floorY: FLOOR, ceilY, seed: 31, panelW: 2.0, strip: "emitWhite", ceiling: { axis: "z", inset: 0.25, channels: [{ at: -21.8, w: 0.5, emit: "emitWhite", emitW: 0.16 }] } });
    corridorDressing(kit, manifest, FLOOR, ceilY, { ribEvery: Infinity });
    for (const d of manifest.doors) doorReveal(kit, manifest, d, FLOOR);

    const cf = corridorFrame(manifest, FLOOR, ceilY);
    dressCorridor(kit, cf, {
      seed: 3101,
      ribEvery: 4,
      ribPhase: 1.7, // ribs at z = 468, 472, … (minus the door bays)
      pipeFaces: ["e"],
      trayFace: "w",
      railFaces: ["w", "e"], // handrails on both walls, broken at the doors, ribs, lockers and alcoves
      gratingW: 0.5,
      noRibs: [[507.5, 508.5]], // the rib at 508 would sit behind the bridge-door sign
      reserved: [
        { face: "e", a0: 468, a1: 472 },
        { face: "e", a0: 508, a1: 512 },
      ],
      sectionLabel: () => "SECTION 1-A",
    });
    // the bridge-door panel doubles as the end-of-passage directory (spine door + lift lobby are aft through the s end)
    doorSigns(kit, cf, [
      { id: "d1-bridge-port", labels: ["BRIDGE"], side: 1, extra: [{ label: "TURBOLIFT", to: 512 }, { label: "LIFT LOBBY" }] },
      { id: "d1-nav-corridor", labels: ["NAVIGATION"], side: 1 },
      { id: "d1-comms-corridor", labels: ["COMMUNICATIONS"], side: 1 },
    ]);
    // forward end: the observation door is in the n end wall
    const { e } = cf.walls;
    signPanel(kit, e, 470, 0, [{ label: "OBSERVATION GALLERY", arrow: arrowToward(e, 470, 466) }], { top: FLOOR + SIGN_TOP });

    for (let z = 469; z <= 509; z += 8) ctx.lights.push({ type: "point", pos: [-21.8, ceilY - 0.5, z], color: LIGHT.coolWhite, intensity: 7, distance: 11, priority: 0.5 });
    return {};
  },
};
export default manifest;
