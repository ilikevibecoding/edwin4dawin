import * as THREE from 'three';
import { STAIRS, OPENINGS, FLOOR_Y, roomById } from '../map/layout.js';
import { SURFACE } from '../physics/world.js';
import { applyBoxUV } from '../map/kit.js';

// ---------------------------------------------------------------------------
// Runtime repairs to the built level.  (owner: opus3)
//
// What is left of `level-patch.js`, which is deleted. Two of its three repairs
// are gone: `layout.js` now trims the stair shafts to the flight footprint so
// both stair-head rooms keep a real landing off their own slab, and `build.js`
// no longer emits an inter-storey deck over a room that is built over.
//
// Two defects remain, both in `src/map/**`, both verified in the browser, and
// both fatal to something the mission needs. Each repair measures the defect
// out of the built collision world rather than assuming it, so fixing the map
// retires the repair without anyone having to unwind this file.
//
// ===========================================================================
// REPAIR 1 — `patchStoreyOpenings`: doorways with a wall standing in them
// ===========================================================================
// `deriveWalls` can put more than one segment on the same line, and `buildWalls`
// sizes each one to `max(structTop)` over the rooms it divides while punching
// only that segment's *own* openings through it. So a doorway is sealed whenever
// a second, taller segment crosses it — most obviously where the lobby and both
// stairwells are double-height (`structTop: 7.5`) and their ground-floor
// segments rise the full 7.5 m straight through the mezzanine. Nine walk-through
// openings are affected on the built map, on both storeys:
//
//   ground   op-lobby-waiting, op-lobby-stair, op-waiting-weststair,
//            op-rest-office, op-office-conf-door, op-service-load
//   upper    op-exec-landing, op-exec-door, op-archive-wstair
//
// The three upper ones are fatal on their own: they are the only ways into the
// mezzanine from either stair, so `_pruneIslands` drops the whole upper storey
// as unreachable, hostage B can be neither reached nor escorted, the mezzanine
// posts snap 4 m down onto the ground floor, and the player walks into an
// invisible wall in the arch. Verified with `overlapsCapsule` at the player's
// radius and by walking into it.
//
// The repair subtracts each blocked aperture from the offending wall collider,
// rebuilds the surrounding solid as up to four boxes, and does the same to the
// meshes behind those colliders so the doorway is not merely invisible.
//
// Only `PASSABLE` openings are touched, so glazing and slab edges keep their
// solid. A wall is only counted as sealing when it stands more than an agent's
// step above the sill, so the 0.11 m saddle `wallWithOpenings` lays across every
// doorway is left alone.
//
// THE REAL FIX is in `buildWalls`: a segment tall enough to pass another
// storey has to take that storey's openings too — `openingsFor(seg)` needs to
// collect openings whose `sill..head` band at their own `FLOOR_Y` falls inside
// the segment, not just those on `seg.floor`.
//
// ===========================================================================
// REPAIR 2 — `patchStairFeet`: the central flight is one-way
// ===========================================================================
// `stair-central` starts at z = -2.4 and `wall:stairwell` seals z = -2 (there
// is no opening to `eastlink` on that boundary), so once the wall's 0.1 m
// thickness is taken off there is 0.33 m of floor between the wall face and the
// bottom tread. Standing in front of a flight needs 0.66 m: the capsule is
// 0.33 m in radius, and `moveCapsule` only lets it stand on a tread when it is
// clear of the *next* tread up, which sits 0.26 m further in. The two
// constraints miss each other by 0.05 m, so there is no legal standing position
// anywhere at the foot of that flight and the player can walk *down* the
// central stair but never back up it. `stair-west` has 1.58 m at its foot and
// works, which is what says this is the flight and not the resolver.
//
// Compounding it, `build.js` gives each balustrade one AABB spanning the whole
// flight from the lower floor to a metre above the head, so the sides of a
// flight are solid and its ends are the only way on.
//
// THE REPAIR
// ----------
// Per flight, only when there is no legal standing position at its foot:
//   1. merge the lowest treads into a single step that is low enough to climb
//      from the room floor and deep enough to stand on clear of the first
//      tread left above it, and
//   2. pull the balustrade colliders back to that step's far edge, so it can
//      be walked onto from the side aisle. Only the foot is trimmed — the head
//      of the same collider is the mezzanine's shaft guard, and cutting that
//      opens a hole to fall down.
// The balustrade *meshes* are untouched, so nothing changes visually; the
// merged step reads as a 0.11 m discrepancy on one tread while walking over it.
//
// THE REAL FIX is one number in `layout.js`: the stairwell is 6.5 m deep and
// the flight runs 5.04 m, so moving `stair-central.zBottom` from -2.4 to -2.75
// (and the matching `VOIDS` entry from z0 -7.44 to -7.79) splits the 1.46 m of
// slack between the two ends and leaves a landing at both. `patchStairFeet`
// measures the clearance rather than assuming it, so that change retires this
// repair on its own.
// ---------------------------------------------------------------------------

/**
 * Repair the built level. Idempotent, memoised per collision world, and safe to
 * call from anywhere; the caller that has a scene should pass one so the mesh
 * side of the opening repair happens too.
 *
 * @param {import('../physics/world.js').CollisionWorld} collision
 * @param {THREE.Object3D} [scene]
 */
export function repairLevel(collision, scene = null) {
  const openings = patchStoreyOpenings(collision);
  const stairFeet = patchStairFeet(collision);
  if (scene) repairOpeningMeshes(scene, openings);
  return { openings, stairFeet };
}

/** Widest agent capsule in the game — the player's. Hostiles are 0.32. */
const AGENT_RADIUS = 0.33;
/** Smallest step-up in the game; player, hostile and hostage all use 0.34. */
const STEP_MAX = 0.34;

// ===================================================================== 1 ====
// Storey openings
// ============================================================================

/** Opening types an agent is meant to walk through. Glazing is not one. */
const PASSABLE = new Set(['door', 'doubledoor', 'arch', 'passthrough', 'shutter']);
/** Shrink the aperture before testing, so merely touching an edge is not a hit. */
const APERTURE_INSET = 0.03;
/**
 * How far either side of the wall line to look. Enough for the 0.24 m exterior
 * wall and its second-side skin, and not enough to reach whatever stands beyond.
 */
const APERTURE_REACH = 0.22;
/** How far below the sill to cut, so the cut leaves no sliver at floor level. */
const APERTURE_SKIRT = 0.08;
/** Wall texture scale in `buildWalls`, needed to re-UV the rebuilt pieces. */
const WALL_METRES_PER_TILE = 2.5;

const openingCache = new WeakMap();
const meshCache = new WeakMap();
let lastOpenings = [];

/**
 * Cut every walk-through opening that a wall from another storey has sealed.
 *
 * @param {import('../physics/world.js').CollisionWorld} collision
 * @returns {Array<object>} one entry per aperture that had to be cut
 */
export function patchStoreyOpenings(collision) {
  if (!collision?.colliders || !collision.add) return [];
  const cached = openingCache.get(collision);
  if (cached) return cached;
  const cuts = [];
  openingCache.set(collision, cuts);
  lastOpenings = cuts;

  for (const o of OPENINGS) {
    if (!PASSABLE.has(o.type)) continue;
    const ap = aperture(o);
    const hits = collision.query(ap.min, ap.max, []);

    // An opening with a balustrade standing in it is a slab edge overlooking
    // the atrium, not a route. Cutting those would open the mezzanine fascia.
    if (hits.some((c) => /^(railing:|stairrail:)/.test(String(c.tag || '')))) continue;

    // `wallWithOpenings` lays a 0.11 m saddle across every doorway and collides
    // it like any other solid piece. That is a threshold to step over, not a
    // seal, so only something standing taller than an agent's step counts.
    const sill = (FLOOR_Y[o.floor] ?? 0) + o.sill;
    const sealing = hits.filter((c) => /^wall:/.test(String(c.tag || ''))
      && c.max.y > sill + STEP_MAX && intersects(c, ap));
    if (!sealing.length) continue;

    const solids = [];
    for (const c of sealing) {
      const pieces = subtract(c, ap);
      // Kept so the mesh pass can find this collider's mesh by its bounds
      // instead of guessing which of the scene's boxes was a wall.
      solids.push({ min: c.min.clone(), max: c.max.clone() });
      collision.remove(c);
      for (const piece of pieces) {
        collision.add({
          min: piece.min.toArray(),
          max: piece.max.toArray(),
          surface: c.surface,
          tag: c.tag,
          blocksSight: c.blocksSight,
          blocksNav: c.blocksNav,
        });
      }
    }
    const walls = sealing.map((c) => `${c.tag} y[${c.min.y.toFixed(2)},${c.max.y.toFixed(2)}]`);
    cuts.push({
      opening: o.id,
      floor: o.floor,
      walls,
      min: ap.min.toArray().map((v) => +v.toFixed(2)),
      max: ap.max.toArray().map((v) => +v.toFixed(2)),
      axis: ap.axis,
      solids,
    });
    console.warn(
      `[mission] opening "${o.id}" (${o.floor}) was sealed by ${walls.join(', ')} — a wall tall enough `
      + 'to pass this storey that never had this storey\'s openings punched through it. Cut it open so '
      + 'the route exists. Fix buildWalls in src/map/build.js.'
    );
  }
  return cuts;
}

/** Last `patchStoreyOpenings` result, for QA and the mission report. */
export function storeyOpeningReport() {
  return lastOpenings.map((c) => ({ ...c }));
}

/**
 * The clear volume an opening is supposed to provide: its width along the wall,
 * its sill-to-head band above its own storey, and enough across the wall line to
 * catch the wall, its second-side skin and its trims.
 */
function aperture(o) {
  const fy = FLOOR_Y[o.floor] ?? 0;
  const alongZ = o.axis === 'z'; // wall runs along Z, so its normal is X
  const half = o.width / 2 - APERTURE_INSET;
  const cAlong = o.at;
  return {
    axis: alongZ ? 'z' : 'x',
    min: new THREE.Vector3(
      alongZ ? o.coord - APERTURE_REACH : cAlong - half,
      // Reach a little under the sill: cutting flush with it leaves a sliver of
      // wall that a capsule's own 0.02 m foot offset still collides with.
      fy + o.sill - APERTURE_SKIRT,
      alongZ ? cAlong - half : o.coord - APERTURE_REACH
    ),
    max: new THREE.Vector3(
      alongZ ? o.coord + APERTURE_REACH : cAlong + half,
      // Inset the head: `wallWithOpenings` starts the solid above an opening
      // within a centimetre of it, and grazing that counts as every doorway in
      // the building being sealed.
      fy + o.head - APERTURE_INSET,
      alongZ ? cAlong + half : o.coord + APERTURE_REACH
    ),
  };
}

function intersects(c, ap) {
  return c.min.x < ap.max.x && c.max.x > ap.min.x
    && c.min.y < ap.max.y && c.max.y > ap.min.y
    && c.min.z < ap.max.z && c.max.z > ap.min.z;
}

/**
 * `box` minus `ap`, as up to four boxes: the solid below the aperture, the
 * solid above it, and the two flanks beside it. The wall's own thickness is
 * never touched — only its length and its height are cut into.
 */
function subtract(box, ap) {
  const a = ap.axis; // the axis the wall runs along
  const lo = { x: box.min.x, y: box.min.y, z: box.min.z };
  const hi = { x: box.max.x, y: box.max.y, z: box.max.z };
  const out = [];
  const push = (min, max) => {
    if (max.y - min.y < 0.01) return;
    if (max[a] - min[a] < 0.01) return;
    out.push({ min: new THREE.Vector3(min.x, min.y, min.z), max: new THREE.Vector3(max.x, max.y, max.z) });
  };

  const bandLo = Math.max(lo.y, ap.min.y);
  const bandHi = Math.min(hi.y, ap.max.y);
  if (ap.min.y > lo.y) push(lo, { ...hi, y: ap.min.y });
  if (ap.max.y < hi.y) push({ ...lo, y: ap.max.y }, hi);
  if (ap.min[a] > lo[a]) push({ ...lo, y: bandLo }, { ...hi, y: bandHi, [a]: ap.min[a] });
  if (ap.max[a] < hi[a]) push({ ...lo, y: bandLo, [a]: ap.max[a] }, { ...hi, y: bandHi });
  return out;
}

/** How closely a mesh's bounds must match a collider's to be that collider. */
const MESH_MATCH = 0.03;

/**
 * The visual half of the opening repair: the wall we just cut still *looks*
 * solid over the doorway, so the meshes behind the cut colliders get replaced
 * by the pieces that survive the cut.
 *
 * The meshes are found by matching bounds against the colliders that were
 * removed, not by guessing which of the scene's boxes look wall-like.
 * `buildWalls` adds exactly one collider per mesh in the wall group, so the
 * match is one-to-one — and a door leaf, a frame jamb or a pane of glass
 * standing in the same doorway can never be mistaken for the wall around it.
 * The second-side skin carries no collider of its own but is built from the
 * same panel list, so it matches on the two axes it shares with the collider
 * and is caught alongside it.
 *
 * Memoised per scene, and reversible by hiding the group it adds.
 *
 * @param {THREE.Object3D} scene
 * @param {Array<object>} cuts from `patchStoreyOpenings`
 */
export function repairOpeningMeshes(scene, cuts) {
  if (!scene || !cuts?.length) return null;
  const cached = meshCache.get(scene);
  if (cached) return cached;
  const group = new THREE.Group();
  group.name = 'mission:opening-repair';
  meshCache.set(scene, group);
  scene.add(group);

  const wanted = [];
  for (const cut of cuts) {
    const ap = {
      axis: cut.axis,
      min: new THREE.Vector3(...cut.min),
      max: new THREE.Vector3(...cut.max),
    };
    for (const solid of cut.solids || []) wanted.push({ ap, solid });
  }
  if (!wanted.length) return group;

  const bounds = new THREE.Box3();
  const doomed = [];
  scene.updateMatrixWorld(true);
  scene.traverse((child) => {
    if (!child.isMesh || !child.visible || child.parent === group) return;
    bounds.setFromObject(child);
    if (bounds.isEmpty()) return;
    for (const { ap, solid } of wanted) {
      const along = ap.axis; // the axis the wall runs along
      const normal = ap.axis === 'z' ? 'x' : 'z';
      // Same extent along the wall and in height as the collider that was cut,
      // and thin, and on the wall's own line.
      if (Math.abs(bounds.min[along] - solid.min[along]) > MESH_MATCH) continue;
      if (Math.abs(bounds.max[along] - solid.max[along]) > MESH_MATCH) continue;
      if (Math.abs(bounds.min.y - solid.min.y) > MESH_MATCH) continue;
      if (Math.abs(bounds.max.y - solid.max.y) > MESH_MATCH) continue;
      if (bounds.max[normal] - bounds.min[normal] > 0.4) continue;
      const centre = (bounds.min[normal] + bounds.max[normal]) / 2;
      if (Math.abs(centre - (solid.min[normal] + solid.max[normal]) / 2) > APERTURE_REACH) continue;
      doomed.push({ child, ap, box: bounds.clone() });
      return;
    }
  });

  for (const { child, ap, box } of doomed) {
    child.visible = false;
    for (const piece of subtract(box, ap)) {
      const size = new THREE.Vector3().subVectors(piece.max, piece.min);
      const geo = new THREE.BoxGeometry(size.x, size.y, size.z);
      applyBoxUV(geo, WALL_METRES_PER_TILE);
      const mesh = new THREE.Mesh(geo, child.material);
      mesh.castShadow = child.castShadow;
      mesh.receiveShadow = child.receiveShadow;
      mesh.position.copy(piece.min).add(piece.max).multiplyScalar(0.5);
      group.add(mesh);
    }
  }
  group.userData.replaced = doomed.length;
  return group;
}

// ===================================================================== 2 ====
// Stair feet
// ============================================================================

/** How much of the flight's width an obstruction has to cover to count. */
const SPAN_FRACTION = 0.6;
/** Anything shorter than this is clutter to walk round, not a blocked foot. */
const OBSTRUCTION_HEIGHT = 1.2;
/** How far in front of a flight to look for the thing that blocks it. */
const PROBE_DEPTH = 2.6;
/** Colliders that are not "the wall in front of the stairs". */
const IGNORE = /^(character|door:|floor:|deck:|stair:|stairrail:|railing:|glass)/;

/** Per collision world, so a rebuilt level is repaired again. */
const cache = new WeakMap();
let lastReport = [];

/**
 * Make every flight climbable from its lower floor. No-op on a flight that
 * already has room to stand at its foot.
 *
 * @param {import('../physics/world.js').CollisionWorld} collision
 * @returns {Array<object>} one entry per flight, describing what was found
 */
export function patchStairFeet(collision) {
  if (!collision?.colliders || !collision.add) return [];
  const cached = cache.get(collision);
  if (cached) return cached;
  const report = [];
  cache.set(collision, report);
  lastReport = report;

  for (const stair of STAIRS) {
    const entry = planFoot(stair, collision);
    report.push(entry);
    if (!entry.blocked) continue;
    if (!entry.plan) {
      console.warn(
        `[mission] stair "${stair.id}" has ${entry.clearance.toFixed(2)} m of floor at its foot, needs `
        + `${(AGENT_RADIUS * 2).toFixed(2)} m, and no single step bridges the gap. The flight is `
        + 'one-way (down only). Move its zBottom north in layout.js.'
      );
      continue;
    }
    apply(collision, stair, entry.plan);
    console.warn(
      `[mission] stair "${stair.id}" foot repaired: ${entry.clearance.toFixed(2)} m of floor in front of `
      + `the bottom tread is ${(2 * AGENT_RADIUS - entry.clearance).toFixed(2)} m short of an agent `
      + `capsule, so the lowest ${entry.plan.merged} treads are now one ${entry.plan.top.toFixed(3)} m `
      + `step and the balustrades stop at z=${entry.plan.railFace.toFixed(2)}. Move `
      + `${stair.id}.zBottom to ${entry.plan.suggestZBottom.toFixed(2)} in layout.js to retire this.`
    );
  }
  return report;
}

/** What the last `patchStairFeet` found, for QA and the mission report. */
export function stairFootReport() {
  return lastReport.map((e) => ({ ...e }));
}

// ------------------------------------------------------------------ planning

/**
 * Tread `i`'s collider box, mirroring `LevelBuild.buildStairs` exactly. `depth`
 * is how far the far (uphill) face lies from the foot, signed so that bigger is
 * always further up the flight.
 */
function tread(stair, i) {
  const fy = FLOOR_Y[stair.fromFloor] ?? 0;
  return {
    top: fy + stair.rise * (i + 1),
    nearDepth: stair.run * i - 0.02,
    farDepth: stair.run * (i + 1) + 0.02,
  };
}

/**
 * Is there a legal standing position at the foot of this flight, and if not,
 * what would make one?
 *
 * Everything is measured in "depth", the distance from the foot of the flight
 * along its direction of climb, so the arithmetic does not care which way round
 * the flight was authored. Negative depth is the room in front of it.
 */
function planFoot(stair, collision) {
  const climbSign = Math.sign(stair.zBottom - (stair.zBottom - stair.run * stair.steps)) || 1;
  const fy = FLOOR_Y[stair.fromFloor] ?? 0;
  const wallDepth = probeObstruction(stair, collision, climbSign, fy);

  // A capsule standing on the lowest step must clear the step above it (uphill)
  // and the wall in front (downhill).
  const fits = (aboveDepth) => -aboveDepth + AGENT_RADIUS <= -wallDepth - AGENT_RADIUS;

  const entry = {
    stair: stair.id,
    clearance: +(tread(stair, 0).nearDepth - wallDepth).toFixed(3),
    blocked: false,
    plan: null,
  };
  if (fits(tread(stair, 1).nearDepth)) return entry;
  entry.blocked = true;

  // Merge treads 0..n so the first tread left above the merged step is far
  // enough uphill to stand clear of, then pick a top that is one step from the
  // floor below and one step from that tread above.
  for (let n = 1; n < stair.steps - 1; n++) {
    const above = tread(stair, n + 1);
    if (!fits(above.nearDepth)) continue;
    const low = above.top - fy - STEP_MAX;
    if (low > STEP_MAX) break; // too many risers bridged for one legal step
    const top = Math.min(STEP_MAX, Math.max(low, (low + STEP_MAX) / 2));
    const far = tread(stair, n).farDepth;
    entry.plan = {
      merged: n + 1,
      top: +top.toFixed(4),
      absTop: +(fy + top).toFixed(4),
      // The merged box, and where the balustrades now stop.
      z0: Math.min(stair.zBottom + climbSign * 0.02, stair.zBottom - climbSign * far),
      z1: Math.max(stair.zBottom + climbSign * 0.02, stair.zBottom - climbSign * far),
      railFace: stair.zBottom - climbSign * far,
      // What zBottom would have to be for the un-merged flight to fit.
      suggestZBottom: +(stair.zBottom - climbSign
        * (2 * AGENT_RADIUS - tread(stair, 1).nearDepth + wallDepth + 0.05)).toFixed(2),
    };
    return entry;
  }
  return entry;
}

/**
 * Depth (negative, i.e. in front of the foot) of the first thing an agent
 * cannot stand in front of. Read out of the collision world so it reflects what
 * was built rather than what the layout intended, and restricted to things tall
 * and wide enough to be the room's wall.
 */
function probeObstruction(stair, collision, climbSign, fy) {
  const halfWidth = stair.width / 2;
  // In front of the foot is downhill, so away from the direction of climb.
  const zFar = stair.zBottom + climbSign * PROBE_DEPTH;
  const min = {
    x: stair.x - halfWidth,
    y: fy + 0.3,
    z: Math.min(stair.zBottom, zFar),
  };
  const max = {
    x: stair.x + halfWidth,
    y: fy + OBSTRUCTION_HEIGHT + 0.3,
    z: Math.max(stair.zBottom, zFar),
  };
  let nearest = -PROBE_DEPTH;
  for (const c of collision.query(min, max, [])) {
    if (c.enabled === false || c.blocksNav === false) continue;
    if (IGNORE.test(c.tag || '')) continue;
    if (c.max.y - c.min.y < OBSTRUCTION_HEIGHT) continue;
    const covered = Math.min(c.max.x, stair.x + halfWidth) - Math.max(c.min.x, stair.x - halfWidth);
    if (covered < stair.width * SPAN_FRACTION) continue;
    const face = climbSign > 0 ? c.min.z : c.max.z;
    const depth = -Math.abs(face - stair.zBottom);
    if (depth > nearest) nearest = depth;
  }
  // The room's own rectangle is the backstop when the wall was not built.
  const room = roomById(stair.room);
  if (room) {
    const edge = climbSign > 0 ? room.z1 : room.z0;
    const depth = -Math.abs(edge - stair.zBottom);
    if (depth > nearest) nearest = depth;
  }
  return nearest;
}

// ------------------------------------------------------------------ applying

function apply(collision, stair, plan) {
  const treadTag = `stair:${stair.id}`;
  const railTag = `stairrail:${stair.id}`;
  const fy = FLOOR_Y[stair.fromFloor] ?? 0;

  for (const c of [...collision.colliders.values()]) {
    if (c.tag !== treadTag) continue;
    if (c.min.z < plan.z0 - 1e-4 || c.max.z > plan.z1 + 1e-4) continue;
    collision.remove(c);
  }
  collision.add({
    min: [stair.x - stair.width / 2, fy, plan.z0],
    max: [stair.x + stair.width / 2, plan.absTop, plan.z1],
    surface: SURFACE.WOOD,
    tag: treadTag,
    blocksSight: false,
  });

  plan.railsTrimmed = 0;
  for (const c of [...collision.colliders.values()]) {
    if (c.tag !== railTag) continue;
    const min = c.min.toArray();
    const max = c.max.toArray();
    if (plan.railFace > (min[2] + max[2]) / 2) {
      if (max[2] <= plan.railFace + 1e-4) continue;
      max[2] = plan.railFace;
    } else {
      if (min[2] >= plan.railFace - 1e-4) continue;
      min[2] = plan.railFace;
    }
    if (max[2] - min[2] < 0.4) continue; // nothing left worth guarding
    collision.remove(c);
    collision.add({
      min,
      max,
      surface: c.surface,
      tag: c.tag,
      blocksSight: c.blocksSight,
      blocksNav: c.blocksNav,
    });
    plan.railsTrimmed++;
  }
}

export default repairLevel;
