// d4-hangar — the Main Hangar, flagship room of Deck 4 (owner D). 160 x 240 x 60 m hall over the floor
// aperture to space: deck plating + shaft + bay-door mechanism + rails + markings + containment field
// (deck.js), giant Imperial panelling, ribs, floods, door surrounds, control-window bezel, balcony and
// ceiling (walls.js), the two rack tiers of gantry cradles with platforms and stairs (racks.js), the
// animated ceiling crane and the deck clutter (machinery.js). Local materials in materials.js.
// The doors system fills the seven door holes; the traffic system reads api.rackSlots().
import { FLOOR, BOUNDS, DOORS, HOLE, PADS, BALCONY, TRACTOR_POINTS, FLOODS } from "./layout.js";
import { makeMaterials, animateMaterials } from "./materials.js";
import { buildDeck } from "./deck.js";
import { buildWalls } from "./walls.js";
import { buildRacks } from "./racks.js";
import { buildCrane, buildClutter } from "./machinery.js";
import { flushDecals } from "./util.js";

// Light descriptors (28 with the four rack-platform points from racks.js and the crane's two work
// lights). The harness pool is 12 points + 4 spots for the whole active set, so the few that matter carry
// the priority: ten spots compete for the four spot slots - the ceiling flood fixtures of layout.FLOODS
// (walls.js builds the housings there): two pools on the aft apron between the aft door and the aperture
// rail, taking pads 03/04 with them (0.9; the first casts the shadows), two key lights on the rack tiers
// (0.85), the crane trolley's two work lights (0.8, machinery.js; a 170 m range, so from the spawn
// and the balcony the in-range bonus puts them over the out-of-range rack keys and the crane's pool is
// lit wherever the crane is in frame), and a threshold flood over each bay door (0.5, 80 m range: live
// only from a camera near that door). Then the four red beacon points at the aperture corners (0.6), the
// apron pool under the balcony, the rim-spill points under the lip for the exterior view, the door
// approaches and the shaft (all <= 0.5). Everything else in the hall is emissive.
function addLights(ctx) {
  const L = ctx.lights;
  // tight cones (13 m pools on the deck from 55 m up) with a soft penumbra so the pools have edges and
  // the deck between them stays dark instead of an even wash
  for (const f of FLOODS) L.push({ type: "spot", pos: [...f.pos], target: [...f.target], color: 0xf6f8ff, intensity: f.intensity, distance: f.distance ?? 95, decay: 1.2, angle: f.angle, penumbra: f.penumbra, priority: f.priority });
  for (const p of TRACTOR_POINTS) L.push({ type: "point", pos: [p[0] + Math.sign(p[0]) * 1.6, FLOOR + 3.4, p[2] + Math.sign(p[2] - 32) * 1.6], color: 0xff2a1a, intensity: 55, distance: 28, decay: 1.6, priority: 0.6 });
  // apron pool below the balcony / in front of the blast door: the aft-wall view's far apron, and a low
  // fill on the deck view's foreground (kept well under the flood pools so those still read as pools;
  // from 9 m up so its reflection stays out of both frames)
  L.push({ type: "point", pos: [0, FLOOR + 9, 158], color: 0xf4f7ff, intensity: 85, distance: 30, decay: 1.5, priority: 0.5 });
  // rim spill under the deck edge: lights the shaft lining and the deck lip from below (exterior view)
  for (const z of [2, 62]) L.push({ type: "point", pos: [0, FLOOR - 2.5, z], color: 0xffe9c8, intensity: 320, distance: 60, decay: 1.4, priority: 0.45 });
  // balcony: over the hatch by the wall, 3.5 m behind the front rail (over the rail it drew a specular
  // streak the length of the handrail 1 m from the balcony camera)
  L.push({ type: "point", pos: [0, BALCONY.y + 2.6, 169.3], color: 0xd6e4ff, intensity: 30, distance: 22, priority: 0.4 });
  L.push({ type: "point", pos: [0, FLOOR + 6, -64], color: 0xf4f7ff, intensity: 70, distance: 28, priority: 0.3 });
  // the two bar gaps in the aperture rail: lifts the dashes, rails and bar posts where people stand, and
  // the aft one is the aft-wall view's foreground deck (over that camera, so no reflection in frame).
  // The forward one is the aperture view's foreground: it has no flood pool, so this carries the plate
  // seams, the non-slip band and the bar (its deck reflection falls below that frame). The aft one hangs
  // between the two lamp-mast heads (deck.js) 7 m behind the bar, at 40: at 110 and 3 m from the bar it
  // lit the bar's top and the deck under it to a clipped white smear at the deck view's vanishing point
  L.push({ type: "point", pos: [0, FLOOR + 5, HOLE.z0 - 1.5], color: 0xf4f7ff, intensity: 120, distance: 26, decay: 1.6, priority: 0.4 });
  L.push({ type: "point", pos: [0, FLOOR + 7, HOLE.z1 + 7], color: 0xf4f7ff, intensity: 40, distance: 32, decay: 1.6, priority: 0.4 });
  // port taxi lane beside the rack zone: the racks view's foreground deck (its camera stands at x -40
  // looking at the wall; the rack key spots stop at the wall base, so without this the plate seams and
  // lane edges in the bottom third of that frame are IBL-only). Priority 0.1: the harness's distance
  // term brings it in only for a viewer within ~20 m, so no other view loses a pool light to it
  L.push({ type: "point", pos: [-50, FLOOR + 7, 30], color: 0xf6f8ff, intensity: 110, distance: 30, decay: 1.6, priority: 0.1 });
  // (the bay-door thresholds are lit by the four threshold floods of layout.FLOODS)
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
    flushDecals(ctx.kit);
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
