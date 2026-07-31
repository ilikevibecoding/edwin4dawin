import * as THREE from 'three';
import { type Sink, cachedGeometry, r3 } from './Kit';
import { type Cell, addGlow, glowMaterial, signAtlas } from './Signage';

/**
 * Daylight through an opening, faked entirely with additive geometry.
 *
 * The renderer keeps a fixed pool of point lights, so one lamp per window is not
 * on offer: raising `NUM_POINT_LIGHTS` costs every material in the scene. But an
 * interior with no falloff from its openings reads as a flat grey box however
 * well it is furnished, and the fix does not actually need a light. What sells a
 * sunlit room is three things the eye reads as light and a renderer can draw as
 * quads: the window blown out to white, a wedge of hazy air leaning in from it,
 * and a hard-edged bright patch where that wedge lands on the floor.
 *
 * All of it is additive, unlit, depth-tested but not depth-writing, and merged
 * into one batch per district. A lit window costs four quads.
 */

export interface WindowLight {
  /** Centre of the opening, in the plane of the wall. */
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  /** Yaw whose local +Z points into the room. */
  yaw: number;
  /** Wall thickness, so the bloom can sit inside the reveal. */
  thickness: number;
  /** Floor the shaft lands on. */
  floor: number;
  /** Farthest the shaft may reach from the wall, so it stops at the far wall. */
  reach: number;
  /** How much light gets through: 1 for an open hole, less for dirty glass. */
  strength?: number;
}

/**
 * Below this the opening faces away from the sun and gets no shaft.
 *
 * A window on the shaded side still reads as bright — it is looking at the sky —
 * so it keeps its bloom. It just has no beam and no patch on the floor.
 */
const FACING_MIN = 0.12;

/** Metres the beam spreads per metre travelled, from scatter in the air. */
const SPREAD = 0.16;

/**
 * Opening area, in square metres, past which the blown-out plane stops helping.
 *
 * The plane only reads correctly for a small hole in a dark wall. Through a
 * doorway or a shopfront arch the player is looking at the lit street itself,
 * which is already bright and has detail in it, so a sheet laid over the hole is
 * not a window any more — it is a white wall with the room's contents behind it.
 * Past the cutoff the opening gets no plane at all and takes a beam instead.
 */
const BLOOM_AREA = 1.8;
const BLOOM_CUTOFF = 4.5;

/** Shafts per room, and the metres between two that are both allowed one. */
const MAX_SHAFTS = 2;
const SHAFT_GAP = 5.5;

/**
 * Lights one room's worth of openings.
 *
 * Only a couple of openings get a beam. The beams are additive and unsorted, so
 * a shopfront with six windows on the sunny side stacks twelve sheets along one
 * sightline and the room fills with white fog — which is what the first pass did.
 * Two well-separated shafts read as sunlight coming in; six read as a smoke
 * grenade.
 *
 * Wide openings are ranked first. They are the ones that cannot use a plane, they
 * are physically letting the most light in, and a beam leaning out of the shop
 * door is the shape the eye is looking for.
 */
export function roomDaylight(sink: Sink, lights: readonly WindowLight[]): void {
  const beams: WindowLight[] = [];
  const ranked = lights
    .map((w) => ({ w, rank: facingOf(sink, w) * (w.strength ?? 1) * areaWeight(w) }))
    .filter((c) => c.rank >= FACING_MIN)
    .sort((a, b) => b.rank - a.rank);
  for (const { w } of ranked) {
    if (beams.length >= MAX_SHAFTS) break;
    if (beams.some((b) => Math.hypot(b.x - w.x, b.y - w.y, b.z - w.z) < SHAFT_GAP)) continue;
    beams.push(w);
  }
  for (const w of lights) windowDaylight(sink, w, beams.includes(w));
}

/** Mild preference for the wider opening when handing out the two beams. */
function areaWeight(w: WindowLight): number {
  return Math.min(1.6, 0.8 + (w.width * w.height) / 6);
}

function facingOf(sink: Sink, w: WindowLight): number {
  return -sink.sunDirection.dot(new THREE.Vector3(Math.sin(w.yaw), 0, Math.cos(w.yaw)));
}

function windowDaylight(sink: Sink, w: WindowLight, beam: boolean): void {
  const strength = w.strength ?? 1;
  if (strength < 0.05) return;
  const inward = new THREE.Vector3(Math.sin(w.yaw), 0, Math.cos(w.yaw));
  const along = new THREE.Vector3(Math.cos(w.yaw), 0, -Math.sin(w.yaw));

  addBloom(sink, w, inward, along, strength);

  if (!beam) return;
  const facing = -sink.sunDirection.dot(inward);
  if (facing < FACING_MIN) return;
  addShaft(sink, w, inward, along, strength * facing);
}

/**
 * The window itself, blown out.
 *
 * Sat at the back of the reveal and cut to the opening exactly, not over it. Both
 * matter from the street: a quad proud of the wall throws a halo onto the masonry
 * around the opening, and one that is not recessed stays visible from every angle,
 * which turns a street of windows into a street of lamps at dusk. Recessed and
 * flush, the jamb clips it away as soon as the view is off the perpendicular,
 * while from inside the room it still fills the hole.
 */
function addBloom(
  sink: Sink,
  w: WindowLight,
  inward: THREE.Vector3,
  along: THREE.Vector3,
  strength: number,
): void {
  const area = w.width * w.height;
  if (area > BLOOM_CUTOFF) return;
  const cell = signAtlas().bloom;
  const at = new THREE.Vector3(w.x, w.y, w.z).addScaledVector(inward, w.thickness * 0.42);
  const up = new THREE.Vector3(0, 1, 0);
  const spill = Math.min(1, BLOOM_AREA / Math.max(0.05, area));
  // `basis` puts local +Z along `inward`, so a front-faced quad is only drawn
  // from inside the room.
  addGlow(
    sink,
    cell,
    w.width,
    w.height,
    basis(at, along, up),
    { tint: greyTint((0.52 + 0.33 * strength) * spill), chunkAt: at },
    true,
  );
}

/**
 * Two crossed sheets along the beam plus the patch it throws on the floor.
 *
 * Crossed rather than one sheet because a single quad vanishes when the player
 * stands in its plane, which is exactly where they end up when they walk into
 * the beam. Where the two overlap the additive blend doubles, which is also what
 * a real beam does: brightest along its axis.
 */
function addShaft(
  sink: Sink,
  w: WindowLight,
  inward: THREE.Vector3,
  along: THREE.Vector3,
  strength: number,
): void {
  const travel = sink.sunDirection.clone().negate().normalize();
  const drop = -travel.y;
  if (drop < 0.08) return;

  const origin = new THREE.Vector3(w.x, w.y, w.z).addScaledVector(inward, 0.02);
  // Distance along the beam to the floor, cut short if the far wall comes first.
  const toFloor = (w.y - w.floor) / drop;
  const horizontal = Math.sqrt(Math.max(1e-4, 1 - travel.y * travel.y));
  const toWall = w.reach / Math.max(0.2, horizontal * travel.clone().setY(0).normalize().dot(inward));
  const length = Math.max(0.6, Math.min(toFloor, toWall));

  // Cross-section of the beam is the opening projected square to the travel
  // direction, so a raking sun gives a narrow slot and not the full window.
  const acrossWidth = w.width * Math.sqrt(Math.max(0.04, 1 - along.dot(travel) ** 2));
  const acrossHeight = w.height * horizontal;

  const centre = origin.clone().addScaledVector(travel, length / 2);
  const back = travel.clone().negate();
  const axisA = perpendicular(along, travel);
  const axisB = new THREE.Vector3().crossVectors(axisA, travel).normalize();
  // Halved per sheet: where the two cross the additive blend doubles, and the
  // player walks into the crossing point.
  const tint = greyTint(0.06 + 0.08 * strength);
  const cell = signAtlas().shaft;

  for (const [axis, size] of [
    [axisA, acrossWidth],
    [axisB, acrossHeight],
  ] as const) {
    sink.addCustom(
      'glow',
      beamGeometry(size, size + length * SPREAD, length, cell, basis(centre, axis, back)),
      glowMaterial(),
      { tier: 'detail', tint, chunkAt: centre },
    );
  }

  if (length < toFloor - 0.15) return;
  addPool(sink, origin.clone().addScaledVector(travel, toFloor), travel, w, strength);
}

/**
 * The bright patch on the floor.
 *
 * Stretched along the beam's heading by the sun's elevation, because that is
 * what a rectangle of light does when it lands on a floor at a slant, and it is
 * the single strongest cue that the light in the room came from a window.
 */
function addPool(
  sink: Sink,
  at: THREE.Vector3,
  travel: THREE.Vector3,
  w: WindowLight,
  strength: number,
): void {
  const heading = travel.clone().setY(0);
  if (heading.lengthSq() < 1e-5) return;
  heading.normalize();
  const drop = Math.max(0.12, -travel.y);
  const across = new THREE.Vector3().crossVectors(heading, new THREE.Vector3(0, 1, 0)).normalize();
  addGlow(
    sink,
    signAtlas().pool,
    w.width * 1.5,
    Math.min(6, (w.height / drop) * 1.25),
    basis(new THREE.Vector3(at.x, w.floor + 0.02, at.z), across, heading),
    { tint: greyTint(0.18 + 0.15 * strength), chunkAt: at },
  );
}

// ---------------------------------------------------------------------------
// Geometry
// ---------------------------------------------------------------------------

/**
 * A quad that widens along its length, carrying one atlas cell.
 *
 * Local +Y is the near end, where the shaft cell is brightest, so the beam is at
 * full strength leaving the window and gone by the far end. The taper is what
 * makes it read as light scattering rather than as a plank.
 */
function beamGeometry(
  nearWidth: number,
  farWidth: number,
  length: number,
  cell: Cell,
  matrix: THREE.Matrix4,
): THREE.BufferGeometry {
  const key = `beam|${r3(nearWidth)}|${r3(farWidth)}|${r3(length)}|${r3(cell.u0)}|${r3(cell.v0)}`;
  const geometry = cachedGeometry(key, () => {
    const hn = nearWidth / 2;
    const hf = farWidth / 2;
    const hl = length / 2;
    const buffer = new THREE.BufferGeometry();
    buffer.setAttribute(
      'position',
      new THREE.Float32BufferAttribute([-hf, -hl, 0, hf, -hl, 0, hn, hl, 0, -hn, hl, 0], 3),
    );
    buffer.setAttribute(
      'uv',
      new THREE.Float32BufferAttribute(
        [cell.u0, cell.v0, cell.u1, cell.v0, cell.u1, cell.v1, cell.u0, cell.v1],
        2,
      ),
    );
    buffer.setAttribute(
      'normal',
      new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1], 3),
    );
    buffer.setIndex([0, 1, 2, 0, 2, 3]);
    return buffer;
  });
  const copy = geometry.clone();
  copy.userData = {};
  return copy.applyMatrix4(matrix);
}

/** Placement matrix from two axes; the third is whatever makes it right-handed. */
function basis(origin: THREE.Vector3, xAxis: THREE.Vector3, yAxis: THREE.Vector3): THREE.Matrix4 {
  const x = xAxis.clone().normalize();
  const y = yAxis.clone().normalize();
  const z = new THREE.Vector3().crossVectors(x, y).normalize();
  return new THREE.Matrix4().makeBasis(x, y, z).setPosition(origin);
}

/** Component of `v` square to `axis`, normalised; falls back to any perpendicular. */
function perpendicular(v: THREE.Vector3, axis: THREE.Vector3): THREE.Vector3 {
  const out = v.clone().addScaledVector(axis, -v.dot(axis));
  if (out.lengthSq() < 1e-6) out.set(axis.z, 0, -axis.x);
  return out.normalize();
}

/** Neutral vertex colour at a given strength, since the atlas cells are white. */
function greyTint(level: number): number {
  const v = Math.round(255 * Math.min(1, Math.max(0, level)));
  return (v << 16) | (v << 8) | v;
}
