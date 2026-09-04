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

// Light descriptors (26 with the four rack-platform points from racks.js and the crane's work light).
// The harness pool is 12 points + 4 spots for the whole active set, so the few that matter carry the
// priority: the four spots are the louvred ceiling floods over the spawn apron and the two nearest pads
// (0.9, the first of them casts the shadows), the four red beacon points at the aperture corners (0.6),
// then the rim-spill points under the lip for the exterior view, the balcony, the door approaches, the
// bay-door pools and the shaft (all <= 0.45). Everything else in the hall is emissive fixtures.
function addLights(ctx) {
  const L = ctx.lights;
  // tight cones (16 m / 14 m pools on the deck from 56 m up) so the pools have edges and the deck
  // between them stays dark instead of an even wash
  const spot = (pos, target, angle) => L.push({ type: "spot", pos, target, color: 0xf6f8ff, intensity: 700, distance: 85, decay: 1.2, angle, penumbra: 0.4, priority: 0.9 });
  for (const s of [-1, 1]) {
    spot([s * 9, -15.5, 148], [s * 9, FLOOR, 146], 0.24); // spawn apron: the spawn stands in the penumbra, the stencil in the pool
    spot([s * 22, -15.5, 140], [s * 22, FLOOR, 142], 0.22); // pads 03 / 04
  }
  for (const p of TRACTOR_POINTS) L.push({ type: "point", pos: [p[0] + Math.sign(p[0]) * 1.6, FLOOR + 3.4, p[2] + Math.sign(p[2] - 32) * 1.6], color: 0xff2a1a, intensity: 55, distance: 28, decay: 1.6, priority: 0.6 });
  // rim spill under the deck edge: lights the shaft lining and the deck lip from below (exterior view)
  for (const z of [2, 62]) L.push({ type: "point", pos: [0, FLOOR - 2.5, z], color: 0xffe9c8, intensity: 320, distance: 60, decay: 1.4, priority: 0.45 });
  L.push({ type: "point", pos: [0, BALCONY.y + 2.5, 167], color: 0xd6e4ff, intensity: 40, distance: 22, priority: 0.4 });
  L.push({ type: "point", pos: [0, FLOOR + 6, 164], color: 0xf4f7ff, intensity: 70, distance: 28, priority: 0.4 });
  L.push({ type: "point", pos: [0, FLOOR + 6, -64], color: 0xf4f7ff, intensity: 70, distance: 28, priority: 0.3 });
  // the two bar gaps in the aperture rail: lifts the chevron, rails and bar posts where people stand
  // (over the lip itself and dim, so its reflection in the plating stays under the viewer's feet)
  for (const z of [HOLE.z0 - 1.5, HOLE.z1 + 1.5]) L.push({ type: "point", pos: [0, FLOOR + 5, z], color: 0xf4f7ff, intensity: 40, distance: 24, decay: 1.8, priority: 0.35 });
  for (const s of [-1, 1]) {
    L.push({ type: "point", pos: [s * 74, FLOOR + 7, 15], color: 0xfff0e0, intensity: 70, distance: 32, priority: 0.3 });
    L.push({ type: "point", pos: [s * 74, FLOOR + 6, 120], color: 0xfff0e0, intensity: 70, distance: 32, priority: 0.3 });
  }
  for (const z of [-12, 76]) L.push({ type: "point", pos: [0, -79, z], color: 0x3b6cff, intensity: 60, distance: 46, priority: 0.3 });
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
