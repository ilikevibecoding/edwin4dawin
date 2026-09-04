// d1-corridor-stbd — starboard side passage beside the bridge: spine ↔ a sealed maintenance bulkhead at the
// forward end, with doors to the bridge (aft deck), tactical planning and the restricted intelligence room.
// Shell from shared/imperial.js; bay detail from ../spine/dressing.js.
import { BOUNDS, CEIL, FLOOR, doorsFor } from "../shared/plan.js";
import { roomShell, corridorDressing, doorReveal } from "../shared/imperial.js";
import { LIGHT } from "../shared/palette.js";
import { rng } from "../../../kit.js";
import { signMaterials, boardMaterials } from "../spine/signage.js";
import { STRIP, stripMaterials } from "../spine/strip.js";
import { corridorFrame, dressCorridor, doorSigns, signPanel, sealedBulkhead, chevronBand, chevronThreshold, SIGN_TOP } from "../spine/dressing.js";

const ID = "d1-corridor-stbd";
const B = BOUNDS[ID];

const manifest = {
  id: ID,
  name: "Starboard Passage",
  kind: "room",
  deck: 1,
  owner: "B",
  bounds: B,
  doors: doorsFor(ID),
  lift: null,
  spawn: { pos: [21.8, FLOOR, 509], yaw: 0 },
  apertures: [],
  views: {
    "d1-corridor-stbd-north": { pos: [21.8, FLOOR, 510], yaw: 0, pitch: -2 },
    "d1-corridor-stbd-south": { pos: [21.8, FLOOR, 468], yaw: 180, pitch: -2 },
    "d1-corridor-stbd-intel-door": { pos: [20.8, FLOOR, 501.5], yaw: -55, pitch: -3 },
    "d1-corridor-stbd-bulkhead": { pos: [21.8, FLOOR, 471.5], yaw: 0, pitch: 2 }, // the sealed maintenance bulkhead at the forward dead end
  },
  materials() {
    return { ...signMaterials(), ...boardMaterials(), ...stripMaterials() }; // `board` carries the bulkhead's sealed plate + readout
  },
  build(ctx) {
    const { kit } = ctx;
    const ceilY = CEIL[ID];
    // all white strips / lenses use the under-bloom STRIP emitter (no emitWhite in this room: same draw-call count)
    roomShell(kit, manifest, { floorY: FLOOR, ceilY, seed: 37, panelW: 2.0, strip: STRIP, ceiling: { axis: "z", inset: 0.25, channels: [{ at: 21.8, w: 0.5, emit: STRIP, emitW: 0.08 }] } });
    corridorDressing(kit, manifest, FLOOR, ceilY, { ribEvery: Infinity });
    for (const d of manifest.doors) doorReveal(kit, manifest, d, FLOOR);

    const cf = corridorFrame(manifest, FLOOR, ceilY);
    dressCorridor(kit, cf, {
      seed: 3701,
      emit: STRIP,
      ribEvery: 4,
      ribPhase: 1.7,
      pipeFaces: ["w"],
      trayFace: "e",
      railFaces: ["w", "e"], // handrails on both walls, broken at the doors, ribs, lockers and alcoves
      gratingW: 0.5,
      noRibs: [[507.5, 508.5]], // the rib at 508 would sit behind the bridge-door sign
      reserved: [
        { face: "w", a0: 468, a1: 472 },
        { face: "w", a0: 508, a1: 512 },
      ],
      sectionLabel: () => "SECTION 1-B",
    });
    // the bridge-door panel doubles as the end-of-passage directory (spine door + lift lobby are aft through the s end)
    doorSigns(kit, cf, [
      { id: "d1-bridge-stbd", labels: ["BRIDGE"], side: 1, extra: [{ label: "TURBOLIFT", to: 512 }, { label: "LIFT LOBBY" }] },
      { id: "d1-tactical-corridor", labels: ["TACTICAL PLANNING"], side: 1 },
      { id: "d1-intel-corridor", labels: ["INTELLIGENCE", "RESTRICTED"], side: -1, offset: 0.4 },
    ]);
    // the intel blast door gets the blast-door treatment: chevron bands both sides and a threshold strip
    const intel = cf.sideDoors.find((d) => d.id === "d1-intel-corridor");
    if (intel) {
      const wf = cf.walls[intel.face];
      for (const s of [-1, 1]) chevronBand(kit, wf, intel.a + s * (intel.w / 2 + 0.05 + 0.2), FLOOR + 1.45, { w: 0.28, h: 2.1 });
      chevronThreshold(kit, cf, intel, FLOOR);
    }
    // forward dead end: sealed maintenance bulkhead with hatch, red status light and manifold
    sealedBulkhead(kit, cf, "n", { rand: rng(3702) });
    signPanel(kit, cf.walls.w, 470, 0, [{ label: "MAINTENANCE" }, { label: "AUTHORISED PERSONNEL ONLY" }], { top: FLOOR + SIGN_TOP });

    // 7 descriptors: one pool every 8 m at 2.8 (round 2: 7, round 3: 4.5, round 4: 3.2 — critic round 3: "passage
    // brighter than the bridge", target mean ≤ 32; the bulkhead frame measured 59 in round 3 and 31.5 in round 4, too
    // close to the line) plus the red status wash in front of the sealed bulkhead, scaled with them.
    for (let z = 469; z <= 509; z += 8) ctx.lights.push({ type: "point", pos: [21.8, ceilY - 0.5, z], color: LIGHT.coolWhite, intensity: 2.8, distance: 11, priority: 0.5 });
    ctx.lights.push({ type: "point", pos: [21.8, FLOOR + 2.7, 467.0], color: LIGHT.red, intensity: 1.1, distance: 3.5, priority: 0.4 });
    return {};
  },
};
export default manifest;
