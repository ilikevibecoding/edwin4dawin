// d4-hangar — the Main Hangar, flagship room of Deck 4 (owner D). 160 x 240 x 60 m hall over the floor
// aperture to space: deck plating + shaft + bay-door mechanism + rails + markings + containment field
// (deck.js), giant Imperial panelling, ribs, floods, door surrounds, control-window bezel, balcony and
// ceiling (walls.js), the two rack tiers of gantry cradles with platforms and stairs (racks.js), the
// animated ceiling crane and the deck clutter (machinery.js). Local materials in materials.js.
// The doors system fills the seven door holes; the traffic system reads api.rackSlots().
import { FLOOR, BOUNDS, DOORS, HOLE, PADS, BALCONY, TRACTOR_POINTS } from "./layout.js";
import { makeMaterials, animateMaterials } from "./materials.js";
import { buildDeck } from "./deck.js";
import { buildWalls } from "./walls.js";
import { buildRacks } from "./racks.js";
import { buildCrane, buildClutter } from "./machinery.js";

// Light descriptors (<= 28 with the four rack-platform points from racks.js and the crane's work light):
// harsh white ceiling floods as spots (two by the spawn at priority 0.9), red beacon pools at the
// aperture corners, warm pools at the bay doors, the door approaches, the balcony and the shaft.
function addLights(ctx) {
  const L = ctx.lights;
  for (const z of [155, 95, 35, -45]) {
    for (const x of [-30, 30]) {
      L.push({ type: "spot", pos: [x, -15.2, z], target: [x * 1.25, FLOOR, z - 6], color: 0xf6f8ff, intensity: 700, distance: 70, decay: 1.2, angle: 0.6, penumbra: 0.4, priority: z === 155 ? 0.9 : 0.6 });
    }
  }
  for (const p of TRACTOR_POINTS) L.push({ type: "point", pos: [p[0] * 1.04, FLOOR + 1.0, p[2] + Math.sign(p[2] - 32) * 1.5], color: 0xff2a1a, intensity: 14, distance: 16, priority: 0.3 });
  L.push({ type: "point", pos: [0, BALCONY.y + 2.5, 167], color: 0xd6e4ff, intensity: 40, distance: 22, priority: 0.5 });
  for (const s of [-1, 1]) {
    L.push({ type: "point", pos: [s * 74, FLOOR + 7, 15], color: 0xfff0e0, intensity: 90, distance: 32, priority: 0.4 });
    L.push({ type: "point", pos: [s * 74, FLOOR + 6, 120], color: 0xfff0e0, intensity: 90, distance: 32, priority: 0.4 });
  }
  L.push({ type: "point", pos: [0, FLOOR + 6, 164], color: 0xf4f7ff, intensity: 70, distance: 28, priority: 0.85 });
  L.push({ type: "point", pos: [0, FLOOR + 6, -64], color: 0xf4f7ff, intensity: 70, distance: 28, priority: 0.4 });
  for (const z of [-12, 76]) L.push({ type: "point", pos: [0, -79, z], color: 0x3b6cff, intensity: 60, distance: 46, priority: 0.35 });
}

export default {
  id: "d4-hangar",
  name: "Main Hangar",
  kind: "room",
  deck: 4,
  owner: "D",
  bounds: BOUNDS,
  apertures: ["hangar"],
  fog: 0.0025,
  spawn: { pos: [0, FLOOR, 160], yaw: 0 },
  doors: DOORS,
  views: {
    "d4-hangar-deck": { pos: [0, FLOOR, 160], yaw: 0, pitch: -2 },
    "d4-hangar-aperture": { pos: [0, FLOOR, -33.5], yaw: 180, pitch: -22 },
    "d4-hangar-racks": { pos: [-40, FLOOR, 30], yaw: 90, pitch: 12 },
    // stands on the aft apron just behind the +z aperture rail: window, balcony and blast door at 70 m
    "d4-hangar-aft-wall": { pos: [0, FLOOR, 100], yaw: 180, pitch: 6 },
    "d4-hangar-balcony": { pos: [0, BALCONY.y, 167], yaw: 0, pitch: -8 },
    "d4-hangar-bay-door": { pos: [60, FLOOR, 15], yaw: -90, pitch: 4 },
    "d4-hangar-exterior": { mode: "exterior", camPos: [40, -160, -20], lookAt: [0, -85, 32] },
  },
  materials: makeMaterials,

  build(ctx) {
    buildDeck(ctx);
    buildWalls(ctx);
    const racks = buildRacks(ctx);
    const slots = racks.slots;
    const crane = buildCrane(ctx);
    buildClutter(ctx);
    addLights(ctx);
    return {
      update(dt, t) {
        animateMaterials(t);
        crane.update(t);
        racks.update(t);
      },
      api: {
        /**
         * fighter rack slots for the traffic system: {id, pos (fighter centre), yaw, tier, side, occupied}.
         * The same slot objects are returned every call (the traffic system keeps references and writes
         * `occupied`), so other readers see the live occupancy.
         */
        rackSlots: () => slots.slice(),
        /** clamp arm state per slot: {id, occupied, amount 0 (open) .. 1 (closed)} */
        clampState: () => racks.clampState(),
        tractorPoints: () => TRACTOR_POINTS.map((p) => [...p]),
        aperture: () => ({ ...HOLE, y: FLOOR }),
        landingPads: () => PADS.map((p) => ({ id: p.n, pos: [p.x, FLOOR, p.z], radius: p.r })),
        balcony: () => ({ ...BALCONY }),
      },
    };
  },
};
