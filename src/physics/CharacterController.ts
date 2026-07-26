import * as THREE from 'three';
import { Groups } from '../core/GameContext';
import {
  capsuleTriangleContact,
  capsuleTriangleTOI,
  closestPointsSegmentTriangle,
  rayTriangle,
  aabbOverlap,
} from './Geometry';
import { StaticWorld, TriBuffer } from './StaticWorld';

/**
 * Kinematic capsule controller.
 *
 * The move is a substepped capsule sweep with collide-and-slide: each iteration
 * sweeps until the capsule touches something, stops a skin width short, records
 * the contact plane and projects the remaining motion onto every plane found so
 * far. That gives smooth wall sliding, correct corner behaviour and no
 * tunnelling, because motion always stops at the first contact rather than
 * being resolved after the fact.
 *
 * Steps are handled the way Quake did it: run the move normally, and if a wall
 * blocked it, retry from `stepHeight` higher and settle back down. Whichever
 * attempt travelled further horizontally wins, so a kerb is climbed and a wall
 * is not. The height gained is reported so the camera can be smoothed instead
 * of popping.
 *
 * Faces steeper than the walk limit are ramps you slide off rather than walls
 * you can climb, which takes two rules working together: the slide projection
 * is never allowed to add upward velocity, and a step-up is only committed when
 * something standable is found underneath afterwards. Without the first, a
 * 65 degree face is a staircase; without the second, so is a 2 m wall.
 */

export const CHARACTER_MASK = Groups.WORLD | Groups.PROP | Groups.GLASS;

/** Face filters for `sweep`: everything, overhangs only, standable only. */
const FACE_ANY = 0;
const FACE_CEILING = 1;
const FACE_FLOOR = 2;

/** Contact offset kept between the capsule and geometry, in metres. */
const SKIN = 0.005;
const MAX_SLIDE_ITERATIONS = 4;
const MAX_PLANES = 5;
/** Ground probe reach; slightly more than the skin so resting counts as grounded. */
const GROUND_PROBE = 0.035;
/**
 * How much further away than the nearest face a standable face may be and still
 * count as support. Covers the skin gap and the sliver of a step edge, but not
 * a steep face the capsule is genuinely leaning on.
 */
const SUPPORT_TOL = 0.03;

export class CharacterMoveOut {
  readonly position = new THREE.Vector3();
  readonly velocity = new THREE.Vector3();
  grounded = false;
  readonly groundNormal = new THREE.Vector3(0, 1, 0);
  groundChunk = -1;
  hitWall = false;
  hitCeiling = false;
  slope = 0;
  stepUp = 0;
  /** Triangles considered this move, for the debug overlay. */
  triangles = 0;
}

const _p0 = new THREE.Vector3();
const _p1 = new THREE.Vector3();
const _s0 = new THREE.Vector3();
const _s1 = new THREE.Vector3();
const _onSeg = new THREE.Vector3();
const _onTri = new THREE.Vector3();
const _normal = new THREE.Vector3();
const _faceNormal = new THREE.Vector3(0, 1, 0);
const _push = new THREE.Vector3();
const _cnormal = new THREE.Vector3();
const _cpoint = new THREE.Vector3();
const _slopeUp = new THREE.Vector3();
const _savePos = new THREE.Vector3();
const _saveVel = new THREE.Vector3();
const _stepPos = new THREE.Vector3();
const _stepVel = new THREE.Vector3();
const _cross = new THREE.Vector3();
const _castFrom = new THREE.Vector3();
const _planes: THREE.Vector3[] = [];
for (let i = 0; i < MAX_PLANES; i++) _planes.push(new THREE.Vector3());

export class CharacterController {
  /** Cosine of the steepest walkable slope. */
  maxSlopeCos = Math.cos(50 * (Math.PI / 180));
  /** Contact points recorded for the debug visualiser. */
  readonly debugContacts: THREE.Vector3[] = [];
  debugContactCount = 0;

  private tris = new TriBuffer(1024);
  private radius = 0.4;
  private height = 1.8;
  private hitT = -1;
  private hitTri = -1;
  private numPlanes = 0;
  /** Per-plane flag: can the character stand on the face behind this plane? */
  private readonly planeStandable = new Uint8Array(MAX_PLANES);
  private readonly scratchOut = new CharacterMoveOut();

  constructor(private world: StaticWorld) {
    for (let i = 0; i < 32; i++) this.debugContacts.push(new THREE.Vector3());
  }

  move(
    position: THREE.Vector3,
    velocity: THREE.Vector3,
    radius: number,
    height: number,
    dt: number,
    stepHeight: number,
    mask: number,
    stamp: number,
    out: CharacterMoveOut,
  ): void {
    this.radius = Math.max(0.05, radius);
    this.height = Math.max(this.radius * 2 + 1e-3, height);
    this.debugContactCount = 0;

    const step = Math.max(0, stepHeight);
    const snap = Math.min(Math.max(step, 0.05), 0.6);

    out.position.copy(position);
    out.velocity.copy(velocity);
    out.grounded = false;
    out.groundNormal.set(0, 1, 0);
    out.groundChunk = -1;
    out.hitWall = false;
    out.hitCeiling = false;
    out.slope = 0;
    out.stepUp = 0;

    // One gather covers every position the capsule can reach this frame, so
    // the sweeps below run against a small flat array instead of the tree.
    const reach = velocity.length() * Math.max(dt, 0) + this.radius + step + snap + 0.25;
    this.world.gather(
      position.x - reach,
      position.y - reach,
      position.z - reach,
      position.x + reach,
      position.y + this.height + reach,
      position.z + reach,
      mask,
      stamp,
      this.tris,
    );
    out.triangles = this.tris.count;
    if (this.tris.count === 0) {
      if (dt > 0) out.position.addScaledVector(velocity, dt);
      return;
    }
    if (dt <= 0) {
      this.finishGround(out);
      return;
    }

    this.depenetrate(out.position);

    const groundedBefore = this.supportBelow(out.position, GROUND_PROBE) >= 0;

    _savePos.copy(out.position);
    _saveVel.copy(out.velocity);
    this.slide(out.position, out.velocity, dt, out);

    if (out.hitWall && step > 0.01) {
      const rise = this.riseAhead(_savePos, _saveVel, step);
      const clearance = rise > 0 ? this.liftDistance(_savePos, step) : 0;
      if (rise > 0 && clearance > rise) {
        _stepPos.copy(_savePos);
        _stepPos.y += clearance;
        _stepVel.copy(_saveVel);
        const stepOut = this.scratchOut;
        stepOut.hitWall = false;
        stepOut.hitCeiling = false;
        this.slide(_stepPos, _stepVel, dt, stepOut);
        // Settle onto whatever is under the raised capsule. Landing on the lip
        // of the tread rather than its face is normal and wanted: a round-
        // bottomed capsule has to roll over the edge across several frames, and
        // refusing that state is what makes stairs feel like walls.
        const landed = this.supportBelow(_stepPos, clearance + SKIN);
        _stepPos.y -= Math.max(0, landed - SKIN);
        const gained = _stepPos.y - _savePos.y;
        if (
          landed >= 0 &&
          horizontalDistanceSq(_stepPos, _savePos) >
            horizontalDistanceSq(out.position, _savePos) + 1e-6
        ) {
          out.position.copy(_stepPos);
          out.velocity.copy(_stepVel);
          out.hitWall = stepOut.hitWall;
          out.hitCeiling = out.hitCeiling || stepOut.hitCeiling;
          out.stepUp = Math.max(0, gained);
          // The lift is kinematic; it must not read as upward velocity.
          if (groundedBefore && out.velocity.y > 0) out.velocity.y = 0;
        }
      }
    }

    // Stairs and ramps going down: stay glued to the surface instead of
    // launching off every edge. Without this, walking downstairs turns into a
    // series of small falls.
    if (groundedBefore && out.velocity.y <= 0.5) {
      if (this.supportBelow(out.position, GROUND_PROBE) < 0) {
        const landed = this.supportBelow(out.position, snap);
        if (landed > 0) out.position.y -= Math.max(0, landed - SKIN);
      }
    }

    this.finishGround(out);
  }

  /**
   * Fills in the ground fields from a final probe, and projects velocity onto
   * the ground plane so gravity does not accumulate while standing still.
   */
  private finishGround(out: CharacterMoveOut): void {
    if (this.tris.count === 0) return;

    if (this.supportBelow(out.position, GROUND_PROBE) >= 0) {
      out.grounded = true;
      out.groundNormal.copy(_faceNormal);
      out.slope = Math.acos(Math.min(1, Math.max(-1, _faceNormal.y)));
      out.groundChunk = this.tris.chunk[this.hitTri];
      this.clipVelocity(out.velocity, out.groundNormal, true);
      if (Math.abs(out.velocity.y) < 1e-4) out.velocity.y = 0;
      return;
    }

    // Nothing standable underneath. Report the face anyway when it is one the
    // character is sliding down, so callers can tell a steep ramp from a drop.
    out.grounded = false;
    if (this.probeGroundAny(out.position, GROUND_PROBE) < 0) return;
    if (_faceNormal.y <= 0.05) return;
    out.groundNormal.copy(_faceNormal);
    out.slope = Math.acos(Math.min(1, Math.max(-1, _faceNormal.y)));
    out.groundChunk = this.tris.chunk[this.hitTri];
  }

  /* ---------------------------- sweeping ------------------------------- */

  private setCapsule(pos: THREE.Vector3): void {
    _p0.set(pos.x, pos.y + this.radius, pos.z);
    _p1.set(pos.x, pos.y + Math.max(this.height - this.radius, this.radius + 1e-4), pos.z);
  }

  /**
   * Sweeps the capsule from `pos` along a unit direction. Stores the time of
   * impact in `hitT` (-1 when free) and the contact normal in `_normal`.
   */
  private sweep(
    pos: THREE.Vector3,
    dx: number,
    dy: number,
    dz: number,
    dist: number,
    filter = FACE_ANY,
  ): void {
    this.setCapsule(pos);
    this.hitT = -1;
    this.hitTri = -1;
    if (dist <= 0) return;

    const r = this.radius;
    const ex = dx * dist;
    const ey = dy * dist;
    const ez = dz * dist;
    const minx = Math.min(_p0.x, _p1.x) - r + Math.min(0, ex);
    const miny = Math.min(_p0.y, _p1.y) - r + Math.min(0, ey);
    const minz = Math.min(_p0.z, _p1.z) - r + Math.min(0, ez);
    const maxx = Math.max(_p0.x, _p1.x) + r + Math.max(0, ex);
    const maxy = Math.max(_p0.y, _p1.y) + r + Math.max(0, ey);
    const maxz = Math.max(_p0.z, _p1.z) + r + Math.max(0, ez);

    const verts = this.tris.verts;
    const bounds = this.tris.bounds;
    let best = dist;
    let bestTri = -1;
    for (let i = 0; i < this.tris.count; i++) {
      const bo = i * 6;
      if (
        !aabbOverlap(
          minx, miny, minz, maxx, maxy, maxz,
          bounds[bo], bounds[bo + 1], bounds[bo + 2],
          bounds[bo + 3], bounds[bo + 4], bounds[bo + 5],
        )
      ) {
        continue;
      }
      if (filter !== FACE_ANY) {
        const ny = this.tris.normals[i * 3 + 1];
        // A lift can only be stopped by something overhead, and support can
        // only come from a face you could stand on. Filtering by the face
        // normal rather than the contact normal is what makes stairs work: the
        // capsule leaning on a riser still finds the tread above it, and the
        // convex edge of that tread still counts as the tread.
        if (filter === FACE_CEILING ? ny > -0.05 : ny <= this.maxSlopeCos) continue;
      }
      const t = capsuleTriangleTOI(_p0, _p1, r, dx, dy, dz, best, verts, i * 9);
      if (t < 0 || t > best) continue;
      // Convex edges belong to two faces at once and the sweep reaches both at
      // the same instant. Preferring the flatter one makes the lip of a stair
      // tread report as the tread rather than as the riser beneath it, which is
      // the difference between walking up a flight and stalling on every step.
      if (
        bestTri >= 0 &&
        t > best - 1e-6 &&
        this.tris.normals[i * 3 + 1] <= this.tris.normals[bestTri * 3 + 1]
      ) {
        continue;
      }
      best = t;
      bestTri = i;
    }
    if (bestTri < 0) return;

    this.hitT = best;
    this.hitTri = bestTri;
    _s0.set(_p0.x + dx * best, _p0.y + dy * best, _p0.z + dz * best);
    _s1.set(_p1.x + dx * best, _p1.y + dy * best, _p1.z + dz * best);
    const d = Math.sqrt(
      closestPointsSegmentTriangle(_s0, _s1, verts, bestTri * 9, _onSeg, _onTri),
    );
    if (d > 1e-5) {
      _normal.set(
        (_onSeg.x - _onTri.x) / d,
        (_onSeg.y - _onTri.y) / d,
        (_onSeg.z - _onTri.z) / d,
      );
    } else {
      const no = bestTri * 3;
      _normal.set(this.tris.normals[no], this.tris.normals[no + 1], this.tris.normals[no + 2]);
      if (_normal.x * dx + _normal.y * dy + _normal.z * dz > 0) _normal.negate();
    }
    if (this.debugContactCount < this.debugContacts.length) {
      this.debugContacts[this.debugContactCount++].copy(_onTri);
    }
  }

  /** How far the capsule can be lifted before its head meets an overhang. */
  private liftDistance(pos: THREE.Vector3, dist: number): number {
    this.sweep(pos, 0, 1, 0, dist, FACE_CEILING);
    if (this.hitT < 0) return dist;
    return Math.max(0, this.hitT - SKIN);
  }

  /**
   * Distance down to the surface the character is standing on, or -1 when there
   * is nothing standable within reach. Leaves `_faceNormal`, `hitTri` and
   * `hitT` describing that surface.
   *
   * Two sweeps: one for the nearest face of any kind, one restricted to faces
   * shallow enough to stand on. Support only counts when the standable face is
   * also the nearest thing below, which is what stops the capsule from
   * "standing" on a floor it is only near while actually resting on a steep
   * face — the difference between climbing a 65 degree ramp and sliding off it.
   */
  private supportBelow(pos: THREE.Vector3, dist: number): number {
    this.sweep(pos, 0, -1, 0, dist);
    const nearest = this.hitT < 0 ? Infinity : this.hitT;
    this.sweep(pos, 0, -1, 0, dist, FACE_FLOOR);
    if (this.hitT < 0 || this.hitT > nearest + SUPPORT_TOL) return -1;
    this.readFaceNormal();
    return this.hitT;
  }

  /**
   * Whether the last sweep hit is something to stand on rather than lean
   * against. Both normals have to agree: the face has to be shallow enough to
   * walk on, and the contact has to be underneath the capsule.
   *
   * The second half is what a face test alone cannot express. Brushing the top
   * corner of a step touches a perfectly walkable tread, but it touches it
   * side-on — the contact normal there is as steep as a wall's. Treating that
   * as a floor is what would let the slide projection carry the capsule up a
   * step of any height, one edge at a time.
   */
  private standingOnHit(): boolean {
    if (this.hitTri < 0) return false;
    if (this.tris.normals[this.hitTri * 3 + 1] <= this.maxSlopeCos) return false;
    return _normal.y > this.maxSlopeCos;
  }

  /**
   * Height of the walkable surface just beyond an obstruction, relative to the
   * capsule's feet, or -1 when there is nothing to step onto.
   *
   * This is the actual step test. A capsule sweep cannot tell a 0.3 m tread from
   * a 3 m wall until it is already on top of it, because in both cases all it
   * knows is that it is blocked; probing the height ahead answers the question
   * the step budget is really about.
   */
  private riseAhead(pos: THREE.Vector3, vel: THREE.Vector3, step: number): number {
    const hlen = Math.sqrt(vel.x * vel.x + vel.z * vel.z);
    if (hlen < 1e-4) return -1;
    // Far enough past the face to be over the tread, close enough to still be
    // on it for the shallowest steps a level is likely to use.
    const ahead = this.radius + 0.08;
    const ox = pos.x + (vel.x / hlen) * ahead;
    const oz = pos.z + (vel.z / hlen) * ahead;
    const oy = pos.y + step + 0.02;
    const reach = step + 0.32;

    const verts = this.tris.verts;
    const normals = this.tris.normals;
    const bounds = this.tris.bounds;
    let best = -1;
    for (let i = 0; i < this.tris.count; i++) {
      if (normals[i * 3 + 1] <= this.maxSlopeCos) continue;
      const bo = i * 6;
      if (ox < bounds[bo] || ox > bounds[bo + 3]) continue;
      if (oz < bounds[bo + 2] || oz > bounds[bo + 5]) continue;
      if (bounds[bo + 1] > oy || bounds[bo + 4] < oy - reach) continue;
      const t = rayTriangle(ox, oy, oz, 0, -1, 0, verts, i * 9);
      if (t < 0 || t > reach) continue;
      const rise = oy - t - pos.y;
      if (rise > best) best = rise;
    }
    return best > 0.02 && best <= step + 1e-4 ? best : -1;
  }

  /** Downward probe that reports any surface, walkable or not. */
  private probeGroundAny(pos: THREE.Vector3, dist: number): number {
    this.sweep(pos, 0, -1, 0, dist);
    if (this.hitT >= 0) this.readFaceNormal();
    return this.hitT;
  }

  private readFaceNormal(): void {
    const no = this.hitTri * 3;
    _faceNormal.set(this.tris.normals[no], this.tris.normals[no + 1], this.tris.normals[no + 2]);
  }

  /* -------------------------- depenetration ---------------------------- */

  private depenetrate(pos: THREE.Vector3): void {
    const verts = this.tris.verts;
    const normals = this.tris.normals;
    const bounds = this.tris.bounds;
    const r = this.radius;

    for (let iter = 0; iter < 4; iter++) {
      this.setCapsule(pos);
      const minx = _p0.x - r;
      const miny = _p0.y - r;
      const minz = _p0.z - r;
      const maxx = _p1.x + r;
      const maxy = _p1.y + r;
      const maxz = _p1.z + r;
      _push.set(0, 0, 0);
      let any = false;

      for (let i = 0; i < this.tris.count; i++) {
        const bo = i * 6;
        if (
          !aabbOverlap(
            minx, miny, minz, maxx, maxy, maxz,
            bounds[bo], bounds[bo + 1], bounds[bo + 2],
            bounds[bo + 3], bounds[bo + 4], bounds[bo + 5],
          )
        ) {
          continue;
        }
        const depth = capsuleTriangleContact(
          _p0, _p1, r, verts, i * 9, normals, i * 3, _cnormal, _cpoint,
        );
        if (depth <= 0) continue;
        // Grow the correction until it satisfies this contact too; coplanar
        // triangles then contribute nothing instead of stacking up.
        const already = _push.dot(_cnormal);
        const need = depth + SKIN * 0.5 - already;
        if (need > 0) {
          _push.addScaledVector(_cnormal, need);
          any = true;
        }
      }

      if (!any) return;
      // A single frame should never teleport the character across the level.
      const len = _push.length();
      if (len > 0.5) _push.multiplyScalar(0.5 / len);
      pos.add(_push);
      if (len < 1e-5) return;
    }
  }

  /* --------------------------- slide move ------------------------------ */

  private slide(
    pos: THREE.Vector3,
    vel: THREE.Vector3,
    dt: number,
    out: CharacterMoveOut,
  ): void {
    let timeLeft = dt;
    this.numPlanes = 0;

    for (let iter = 0; iter < MAX_SLIDE_ITERATIONS; iter++) {
      const vx = vel.x * timeLeft;
      const vy = vel.y * timeLeft;
      const vz = vel.z * timeLeft;
      const dist = Math.sqrt(vx * vx + vy * vy + vz * vz);
      if (dist < 1e-7) return;
      const inv = 1 / dist;
      const dx = vx * inv;
      const dy = vy * inv;
      const dz = vz * inv;

      this.sweep(pos, dx, dy, dz, dist);
      if (this.hitT < 0) {
        pos.x += vx;
        pos.y += vy;
        pos.z += vz;
        return;
      }

      const advance = Math.max(0, this.hitT - SKIN);
      pos.x += dx * advance;
      pos.y += dy * advance;
      pos.z += dz * advance;
      timeLeft *= 1 - advance * inv;

      const standable = this.standingOnHit();
      this.readFaceNormal();
      if (standable) {
        out.grounded = true;
        out.groundNormal.copy(_faceNormal);
      } else if (_faceNormal.y < -0.2) {
        out.hitCeiling = true;
        if (vel.y > 0) vel.y = 0;
      } else {
        out.hitWall = true;
      }

      if (!this.addPlane(_normal, standable)) {
        // Re-hit a plane we already have: nudge out and try again.
        vel.addScaledVector(_normal, 0.001);
        continue;
      }
      this.resolvePlanes(vel);
      if (vel.lengthSq() < 1e-10) return;
    }
  }

  /** Records a contact plane. Returns false when it duplicates an existing one. */
  private addPlane(n: THREE.Vector3, standable: boolean): boolean {
    for (let i = 0; i < this.numPlanes; i++) {
      if (_planes[i].dot(n) > 0.99) return false;
    }
    if (this.numPlanes >= MAX_PLANES) {
      // Wedged in a corner: drop the oldest plane so the newest still applies.
      for (let i = 1; i < MAX_PLANES; i++) {
        _planes[i - 1].copy(_planes[i]);
        this.planeStandable[i - 1] = this.planeStandable[i];
      }
      this.numPlanes = MAX_PLANES - 1;
    }
    this.planeStandable[this.numPlanes] = standable ? 1 : 0;
    _planes[this.numPlanes++].copy(n);
    return true;
  }

  private clipVelocity(v: THREE.Vector3, n: THREE.Vector3, standable: boolean): void {
    const into = v.dot(n);
    if (into >= 0) return;
    v.addScaledVector(n, -into);
    if (standable) return;

    // Sliding along something too steep to stand on must not carry the
    // character up it — that is what would make a 65 degree ramp, or the top
    // edge of a tall step, climbable. Only the up-slope component is removed,
    // which leaves motion along the contour and downhill untouched, and because
    // that direction lies in the contact plane the projection above still holds.
    _slopeUp.set(-n.x * n.y, 1 - n.y * n.y, -n.z * n.y);
    const len = _slopeUp.length();
    if (len < 1e-5) return;
    _slopeUp.multiplyScalar(1 / len);
    const along = v.dot(_slopeUp);
    if (along > 0) v.addScaledVector(_slopeUp, -along);
  }

  /** Projects velocity so it violates none of the recorded planes. */
  private resolvePlanes(vel: THREE.Vector3): void {
    for (let pass = 0; pass < 3; pass++) {
      let violated = -1;
      for (let i = 0; i < this.numPlanes; i++) {
        if (vel.dot(_planes[i]) < -1e-6) {
          this.clipVelocity(vel, _planes[i], this.planeStandable[i] === 1);
          violated = i;
        }
      }
      if (violated < 0) return;
    }

    // Still fighting two planes: run along their crease instead.
    for (let i = 0; i < this.numPlanes; i++) {
      if (vel.dot(_planes[i]) >= -1e-6) continue;
      for (let j = 0; j < this.numPlanes; j++) {
        if (i === j || vel.dot(_planes[j]) >= -1e-6) continue;
        _cross.crossVectors(_planes[i], _planes[j]);
        const len = _cross.length();
        if (len < 1e-5) continue;
        _cross.multiplyScalar(1 / len);
        vel.copy(_cross).multiplyScalar(_cross.dot(vel));
        break;
      }
      break;
    }
    for (let i = 0; i < this.numPlanes; i++) {
      if (vel.dot(_planes[i]) < -1e-4) {
        vel.set(0, 0, 0);
        return;
      }
    }
  }

  /* ---------------------------- queries -------------------------------- */

  /**
   * Standalone capsule sweep for callers outside the move loop (mantling,
   * cover checks, spawn validation). Returns the hit distance or -1.
   */
  cast(
    origin: THREE.Vector3,
    dx: number,
    dy: number,
    dz: number,
    radius: number,
    height: number,
    maxDistance: number,
    mask: number,
    stamp: number,
    outNormal: THREE.Vector3,
  ): number {
    this.radius = Math.max(0.05, radius);
    this.height = Math.max(this.radius * 2 + 1e-3, height);
    const pad = this.radius + 0.1;
    // Walked in segments: one gather over a long cast would collect more
    // triangles than the scratch buffer holds and quietly drop the hit.
    const segment = Math.max(2, this.radius * 6);
    let travelled = 0;
    while (travelled < maxDistance - 1e-6) {
      const span = Math.min(segment, maxDistance - travelled);
      _castFrom.set(
        origin.x + dx * travelled,
        origin.y + dy * travelled,
        origin.z + dz * travelled,
      );
      const ex = dx * span;
      const ey = dy * span;
      const ez = dz * span;
      this.world.gather(
        _castFrom.x - pad + Math.min(0, ex),
        _castFrom.y - pad + Math.min(0, ey),
        _castFrom.z - pad + Math.min(0, ez),
        _castFrom.x + pad + Math.max(0, ex),
        _castFrom.y + this.height + pad + Math.max(0, ey),
        _castFrom.z + pad + Math.max(0, ez),
        mask,
        stamp,
        this.tris,
      );
      if (this.tris.count > 0) {
        this.sweep(_castFrom, dx, dy, dz, span);
        if (this.hitT >= 0) {
          outNormal.copy(_normal);
          return travelled + this.hitT;
        }
      }
      travelled += span;
    }
    return -1;
  }

  /** Chunk id of the last contact, for surface lookups. */
  get lastChunk(): number {
    return this.hitTri >= 0 ? this.tris.chunk[this.hitTri] : -1;
  }
}

function horizontalDistanceSq(a: THREE.Vector3, b: THREE.Vector3): number {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return dx * dx + dz * dz;
}
