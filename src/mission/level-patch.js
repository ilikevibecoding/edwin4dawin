import * as THREE from 'three';
import { ROOMS, STAIRS, VOIDS, FLOOR_Y } from '../map/layout.js';
import { SURFACE } from '../physics/world.js';

// ---------------------------------------------------------------------------
// Vertical-circulation repair.  (owner: opus3)
//
// WHY THIS FILE EXISTS
// --------------------
// `layout.js` declares a VOID over the whole footprint of both stair-head
// rooms:
//
//   { floor:'upper', x0:-23, z0:-8.5, x1:-19, z1:-1, reason:'west stair shaft' }
//   { floor:'upper', x0: 11, z0:-8.5, x1: 18, z1:-2, reason:'central stair
//                                       shaft (landing built separately)' }
//
// `build.js` subtracts voids from the room rectangle before emitting the floor
// slab, so `upperlanding` and `upperweststair` get NO slab at all, and the
// separate landing the comment promises is only emitted when
// `|zBottom - run*steps - landingZ| > 0.2` — which is 0.1 m for the central
// stair, so it is skipped. `RAILINGS` still guards the x=11 and z=-2 edges of
// `upperlanding`, which is only meaningful if a slab is meant to be there.
//
// Net effect without this file: the top of both staircases is a hole. The
// mezzanine — and therefore hostage B in the executive office — cannot be
// reached at all, and anything that walks up either flight falls to the ground
// floor. That makes the mission unwinnable, so the AI/mission owner has to
// close the hole rather than route around it.
//
// WHAT IT DOES
// ------------
// Three independent repairs, each detected from the built collision world and
// each a no-op once `src/map/**` emits the right thing, so they retire on their
// own rather than needing to be unwound:
//
// 1. `patchStairLandings` — for every stair whose destination room has no
//    usable slab, fill that room's footprint minus the flight (so the flight
//    stays an open shaft as intended) with a 0.3 m concrete slab, in collision
//    and in the scene.
// 2. `patchInterstoreyDecks` — put the structural deck back under the upper
//    finish floor instead of on top of it, and cut the stair shafts out of it.
// 3. `patchStairRails` — cut the head of a balustrade back far enough to step
//    off the top of a flight that has no landing in front of it.
//
// Every entry point is idempotent and safe to call from several systems. The
// results are memoised per collision world / per scene rather than globally, so
// a rebuilt level gets repaired again instead of silently keeping the first
// build's patches.
// ---------------------------------------------------------------------------

const EPS = 1e-4;
const SLAB_THICKNESS = 0.3;
/** Rectangles thinner than this in either axis cannot hold an agent capsule. */
const MIN_USEFUL = 0.2;
/** Agent radius the trim has to leave room for; mirrors NavGrid.AGENT_RADIUS. */
const TRIM_CLEARANCE = 0.32 + 0.3;

/** @type {Array<{room:object, rects:Array<object>, y:number}>|null} */
let plan = null;
/** Per-world / per-scene results, keyed weakly so nothing is kept alive. */
const landingCache = new WeakMap();
const deckCache = new WeakMap();
const railCache = new WeakMap();
const meshCache = new WeakMap();
/** Last results, for `landingRepairSummary` diagnostics only. */
let lastDecks = [];
let lastRails = [];

function overlaps(a, b) {
  return a.x0 < b.x1 - EPS && a.x1 > b.x0 + EPS && a.z0 < b.z1 - EPS && a.z1 > b.z0 + EPS;
}

/** Subtract hole rectangles from `rect`, returning the remaining strips. */
function subtractRects(rect, holes) {
  let rects = [rect];
  for (const v of holes) {
    const next = [];
    for (const r of rects) {
      const ix0 = Math.max(r.x0, v.x0);
      const ix1 = Math.min(r.x1, v.x1);
      const iz0 = Math.max(r.z0, v.z0);
      const iz1 = Math.min(r.z1, v.z1);
      if (ix0 >= ix1 - EPS || iz0 >= iz1 - EPS) { next.push(r); continue; }
      if (r.z0 < iz0 - EPS) next.push({ x0: r.x0, z0: r.z0, x1: r.x1, z1: iz0 });
      if (iz1 < r.z1 - EPS) next.push({ x0: r.x0, z0: iz1, x1: r.x1, z1: r.z1 });
      if (r.x0 < ix0 - EPS) next.push({ x0: r.x0, z0: iz0, x1: ix0, z1: iz1 });
      if (ix1 < r.x1 - EPS) next.push({ x0: ix1, z0: iz0, x1: r.x1, z1: iz1 });
    }
    rects = next;
  }
  return rects;
}

function rectOf(room) {
  return { x0: room.x0, z0: room.z0, x1: room.x1, z1: room.z1 };
}

function usable(r) {
  return r.x1 - r.x0 >= MIN_USEFUL && r.z1 - r.z0 >= MIN_USEFUL;
}

/** The footprint the flight itself occupies, with a little clearance. */
export function stairFootprint(stair, pad = 0.04) {
  const topZ = stair.zBottom - stair.run * stair.steps;
  return {
    x0: stair.x - stair.width / 2 - pad,
    x1: stair.x + stair.width / 2 + pad,
    z0: Math.min(stair.zBottom, topZ) - pad,
    z1: Math.max(stair.zBottom, topZ) + pad,
  };
}

/** Room a flight arrives in, found from the top tread's centre. */
function destinationRoom(stair) {
  const topZ = stair.zBottom - stair.run * stair.steps;
  const probeZ = topZ + (stair.zBottom > topZ ? 0.12 : -0.12);
  return ROOMS.find(
    (r) => r.floor === stair.toFloor && !r.exterior &&
      stair.x >= r.x0 && stair.x <= r.x1 && probeZ >= r.z0 && probeZ <= r.z1
  ) || null;
}

/** Does `build.js` already emit a slab of usable size for this room? */
function roomHasSlab(room) {
  const holes = VOIDS.filter((v) => v.floor === room.floor && overlaps(v, rectOf(room)));
  return subtractRects(rectOf(room), holes).some((r) => r.x1 - r.x0 >= 0.6 && r.z1 - r.z0 >= 0.6);
}

/**
 * Which landings are missing and what should be built there.
 * Pure — safe to call for diagnostics without touching the world.
 */
export function landingRepairPlan() {
  if (plan) return plan;
  plan = [];
  const seen = new Set();
  for (const stair of STAIRS) {
    const room = destinationRoom(stair);
    if (!room || seen.has(room.id) || roomHasSlab(room)) continue;
    seen.add(room.id);
    // Keep the shaft open where the flight (and any other flight in the same
    // room) actually runs; fill everything else.
    const shafts = STAIRS
      .filter((s) => destinationRoom(s) === room)
      .map((s) => stairFootprint(s));
    const rects = subtractRects(rectOf(room), shafts).filter(usable);
    if (!rects.length) continue;
    plan.push({ room, rects, y: FLOOR_Y[room.floor] ?? 0 });
  }
  return plan;
}

/**
 * Emit the missing slabs into the collision world. Returns the colliders it
 * created (empty when nothing needed repairing).
 */
export function patchStairLandings(collision) {
  if (!collision?.add) return [];
  const cached = landingCache.get(collision);
  if (cached) return cached;
  const colliders = [];
  landingCache.set(collision, colliders);
  for (const { room, rects, y } of landingRepairPlan()) {
    for (const r of rects) {
      colliders.push(collision.add({
        min: [r.x0, y - SLAB_THICKNESS, r.z0],
        max: [r.x1, y, r.z1],
        surface: SURFACE.CONCRETE,
        tag: `navpatch:floor:${room.id}`,
        blocksSight: true,
        blocksNav: true,
      }));
    }
  }
  return colliders;
}

/** Is there an upper-storey room over this one? Mirrors `structTop` in build.js. */
function hasUpperAbove(room) {
  return ROOMS.some((u) => u.floor === 'upper' && !u.exterior && overlaps(u, rectOf(room)));
}

/**
 * Sink the inter-storey deck to where the upper floor actually is, and open the
 * stair shafts through it.
 *
 * `build.js` gives every room a "structural deck" box `[top, top + 0.32]`, and
 * for a ground room with an upper room over it `top` is `FLOOR_Y.upper`. So the
 * slab that is meant to *be* the mezzanine's structure is emitted 0.32 m above
 * the mezzanine's own finish floor, as a curb over the entire upper storey:
 * everything standing up there stands 0.32 m higher than `layout.js` says, and
 * — much worse — the deck runs across both stairwells, so each flight climbs
 * into a concrete ceiling. Neither staircase can be used by anything.
 *
 * The repair drops each of those decks by its own thickness (top becomes
 * `FLOOR_Y.upper`, flush with the upper floor slabs) and subtracts the flights
 * that rise through it. The other decks — a plain ceiling slab over a
 * single-storey room — are left exactly as they are.
 *
 * @returns {Array<object>} the replacement collider pieces
 */
export function patchInterstoreyDecks(collision) {
  if (!collision?.colliders || !collision.add) return [];
  const cached = deckCache.get(collision);
  if (cached) return cached;
  const deckPieces = [];
  deckCache.set(collision, deckPieces);
  lastDecks = deckPieces;

  const upperY = FLOOR_Y.upper ?? 4;
  const shafts = STAIRS.filter((s) => s.toFloor === 'upper').map((s) => stairFootprint(s, 0.06));

  for (const c of [...collision.colliders.values()]) {
    if (!c.tag || !c.tag.startsWith('deck:')) continue;
    const room = ROOMS.find((r) => c.tag === `deck:${r.id}`);
    if (!room || room.floor !== 'ground' || !hasUpperAbove(room)) continue;
    // Already sitting under the upper floor? Then the map owner has fixed it.
    if (Math.abs(c.min.y - upperY) > 0.02) continue;

    const thickness = Math.max(0.1, c.max.y - c.min.y);
    const rect = { x0: c.min.x, z0: c.min.z, x1: c.max.x, z1: c.max.z };
    const holes = shafts.filter((s) => overlaps(s, rect));
    collision.remove(c);
    for (const p of subtractRects(rect, holes).filter(usable)) {
      deckPieces.push(collision.add({
        min: [p.x0, upperY - thickness, p.z0],
        max: [p.x1, upperY, p.z1],
        surface: c.surface,
        tag: c.tag,
        blocksSight: c.blocksSight,
        blocksNav: c.blocksNav,
      }));
    }
  }
  return deckPieces;
}

/**
 * Open the ends of a sealed flight.
 *
 * `build.js` collides each balustrade as one AABB spanning the whole flight
 * from the lower floor to the top of the guard:
 *
 *   min: [x ± width/2 - 0.06, fy,          zBottom - run*steps]
 *   max: [x ± width/2 + 0.06, topY + 1.0,  zBottom]
 *
 * The mesh it stands for is a 1.02 m rail following the slope, but the box is a
 * wall up to 5 m tall running the full length, so each flight is a closed chute
 * that can only be entered or left through its two ends — and on this level
 * neither end has the room:
 *
 *   * the central flight's head stops 0.1 m short of the mezzanine's outer
 *     wall (`landingZ: -8.5` leaves less landing than the 0.2 m `build.js`
 *     needs to emit one), and
 *   * its foot stops 0.54 m from the stairwell's south wall, narrower than an
 *     agent capsule.
 *
 * So nothing — player included — can use either staircase, and hostage B lives
 * on the mezzanine. The repair cuts two treads plus an agent radius off each
 * end of the guard, which is the stretch where the treads are within a step of
 * the adjoining floor anyway, so getting on and off happens where a real
 * balustrade would already have ended. The exposed drop is at most two risers.
 *
 * Only the single full-length box is matched: once the guard is modelled per
 * step, or as anything that does not run the length of the flight, this stops
 * firing.
 *
 * @returns {Array<object>} the replacement colliders
 */
export function patchStairRails(collision) {
  if (!collision?.colliders || !collision.add) return [];
  const cached = railCache.get(collision);
  if (cached) return cached;
  const trimmedRails = [];
  railCache.set(collision, trimmedRails);
  lastRails = trimmedRails;

  for (const stair of STAIRS) {
    const tag = `stairrail:${stair.id}`;
    const flight = Math.abs(stair.run * stair.steps);
    const trim = stair.run * 2 + TRIM_CLEARANCE;
    if (flight <= trim * 2 + MIN_USEFUL) continue;

    for (const c of [...collision.colliders.values()]) {
      if (c.tag !== tag) continue;
      if (Math.abs((c.max.z - c.min.z) - flight) > 0.3) continue;

      const min = c.min.toArray();
      const max = c.max.toArray();
      min[2] += trim;
      max[2] -= trim;
      collision.remove(c);
      trimmedRails.push(collision.add({
        min,
        max,
        surface: c.surface,
        tag: c.tag,
        blocksSight: c.blocksSight,
        blocksNav: c.blocksNav,
      }));
    }
  }
  return trimmedRails;
}

/**
 * Visual counterpart, so the repaired landings are not see-through. Kept in a
 * single group the caller can hide; safe to call more than once.
 */
export function buildStairLandingMeshes(scene) {
  const cached = scene && meshCache.get(scene);
  if (cached) return cached;
  const meshGroup = new THREE.Group();
  meshGroup.name = 'navpatch:landings';
  if (scene) meshCache.set(scene, meshGroup);
  const mat = new THREE.MeshStandardMaterial({ color: 0x8d9094, roughness: 0.72, metalness: 0.05 });
  for (const { room, rects, y } of landingRepairPlan()) {
    for (const r of rects) {
      const w = r.x1 - r.x0;
      const d = r.z1 - r.z0;
      const slab = new THREE.Mesh(new THREE.BoxGeometry(w, SLAB_THICKNESS, d), mat);
      slab.position.set((r.x0 + r.x1) / 2, y - SLAB_THICKNESS / 2, (r.z0 + r.z1) / 2);
      slab.castShadow = false;
      slab.receiveShadow = true;
      slab.name = `navpatch-floor-${room.id}`;
      meshGroup.add(slab);
    }
  }
  if (meshGroup.children.length) scene?.add?.(meshGroup);
  return meshGroup;
}

/** Diagnostics for the QA overlay / ownership audit. */
export function landingRepairSummary() {
  return {
    landings: landingRepairPlan().map(({ room, rects }) => ({
      room: room.id,
      patches: rects.length,
      area: +rects.reduce((a, r) => a + (r.x1 - r.x0) * (r.z1 - r.z0), 0).toFixed(2),
    })),
    railsTrimmed: (trimmedRails || []).map((c) => c.tag),
    deckPieces: (deckPieces || []).length,
  };
}
