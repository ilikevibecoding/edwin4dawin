/**
 * Path following, steering and local avoidance.
 *
 * The path is a handful of long segments after string pulling, so following it is
 * a lookahead pursuit rather than a waypoint-to-waypoint march: the steering
 * target is a point some distance further along the polyline than the nearest
 * one, which is what lets an agent cut a corner smoothly instead of arriving at
 * the corner, stopping, rotating and leaving.
 *
 * Avoidance is reciprocal and deterministic. Two agents heading for the same
 * doorway resolve it by comparing entity ids, so one consistently goes left and
 * the other consistently goes right. Symmetric avoidance rules produce the
 * shuffling deadlock that everyone recognises from bad crowd AI.
 */
import * as THREE from 'three';
import { clamp, damp } from '../core/MathUtils';
import { MOVE, PATH } from './Tuning';

/** One entry in the avoidance field. */
interface Neighbour {
  id: number;
  x: number;
  z: number;
  vx: number;
  vz: number;
  radius: number;
}

const CELL = 2.5;

/**
 * Uniform grid over agent positions, rebuilt every frame.
 *
 * A linear scan would be fine at twenty agents and quadratic at two hundred;
 * bucketing costs one pass and keeps the answer local either way.
 */
export class AvoidanceField {
  private readonly entries: Neighbour[] = [];
  private readonly buckets = new Map<number, number[]>();
  private readonly free: number[][] = [];
  private count = 0;

  begin(): void {
    for (const list of this.buckets.values()) {
      list.length = 0;
      this.free.push(list);
    }
    this.buckets.clear();
    this.count = 0;
  }

  add(id: number, x: number, z: number, vx: number, vz: number, radius: number): void {
    let entry = this.entries[this.count];
    if (!entry) {
      entry = { id, x, z, vx, vz, radius };
      this.entries.push(entry);
    } else {
      entry.id = id;
      entry.x = x;
      entry.z = z;
      entry.vx = vx;
      entry.vz = vz;
      entry.radius = radius;
    }
    const key = keyOf(x, z);
    let list = this.buckets.get(key);
    if (!list) {
      list = this.free.pop() ?? [];
      this.buckets.set(key, list);
    }
    list.push(this.count);
    this.count++;
  }

  /**
   * Accumulates a separation-plus-sidestep nudge into `out`.
   *
   * Returns the closest neighbour distance, which callers use to decide whether
   * to slow down as well as steer.
   */
  resolve(
    id: number,
    x: number,
    z: number,
    vx: number,
    vz: number,
    radius: number,
    out: THREE.Vector3,
  ): number {
    const bx = Math.floor(x / CELL);
    const bz = Math.floor(z / CELL);
    let closest = Infinity;
    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) {
        const list = this.buckets.get((bz + dz) * 4096 + (bx + dx));
        if (!list) continue;
        for (let i = 0; i < list.length; i++) {
          const other = this.entries[list[i]];
          if (other.id === id) continue;
          const rx = x - other.x;
          const rz = z - other.z;
          const distSq = rx * rx + rz * rz;
          const minimum = radius + other.radius;
          if (distSq > minimum * minimum || distSq < 1e-6) continue;
          const distance = Math.sqrt(distSq);
          if (distance < closest) closest = distance;

          const overlap = (minimum - distance) / minimum;
          const nx = rx / distance;
          const nz = rz / distance;
          out.x += nx * overlap * MOVE.avoidStrength;
          out.z += nz * overlap * MOVE.avoidStrength;

          // Closing head-on: break the tie by id so the pair never mirrors.
          const closing = (other.vx - vx) * nx + (other.vz - vz) * nz;
          if (closing > 0.2) {
            const side = id < other.id ? 1 : -1;
            out.x += -nz * side * overlap * MOVE.avoidStrength * 0.85;
            out.z += nx * side * overlap * MOVE.avoidStrength * 0.85;
          }
        }
      }
    }
    return closest;
  }
}

function keyOf(x: number, z: number): number {
  return Math.floor(z / CELL) * 4096 + Math.floor(x / CELL);
}

export type MoveGait = 'walk' | 'combat' | 'run' | 'sprint' | 'crouch';

export class Locomotion {
  /** Smoothed world velocity, planar plus the vertical channel. */
  readonly velocity = new THREE.Vector3();
  /** Where the agent is steering towards this frame. */
  readonly steerTarget = new THREE.Vector3();
  /** Final destination of the current path. */
  readonly goal = new THREE.Vector3();

  hasPath = false;
  /** True when the planner could only reach part of the way. */
  partial = false;
  arrived = true;
  /** True when the agent has not made progress for a while. */
  blocked = false;

  gait: MoveGait = 'walk';
  speedScale = 1;
  /** Multiplier applied while shouldered, so aiming agents step rather than jog. */
  aiming = false;

  private readonly path = new Float32Array(PATH.maxWaypoints * 3);
  private count = 0;
  private cursor = 0;
  private stuckTimer = 0;
  private readonly lastPosition = new THREE.Vector3();
  private progressTimer = 0;
  private verticalVelocity = 0;
  private readonly nudge = new THREE.Vector3();
  private readonly desired = new THREE.Vector3();

  get waypointCount(): number {
    return this.count;
  }

  get remaining(): number {
    return Math.max(0, this.count - this.cursor);
  }

  setPath(points: Float32Array, count: number, partial: boolean): void {
    this.count = Math.min(count, PATH.maxWaypoints);
    for (let i = 0; i < this.count * 3; i++) this.path[i] = points[i];
    this.cursor = Math.min(1, this.count - 1);
    this.hasPath = this.count > 1;
    this.partial = partial;
    this.arrived = this.count <= 1;
    this.blocked = false;
    this.stuckTimer = 0;
    if (this.count > 0) {
      this.goal.set(
        this.path[(this.count - 1) * 3],
        this.path[(this.count - 1) * 3 + 1],
        this.path[(this.count - 1) * 3 + 2],
      );
    }
  }

  clearPath(): void {
    this.count = 0;
    this.cursor = 0;
    this.hasPath = false;
    this.arrived = true;
    this.partial = false;
    this.blocked = false;
    this.stuckTimer = 0;
  }

  /** Distance still to walk along the path, cheap enough to call per frame. */
  pathLength(from: THREE.Vector3): number {
    if (this.count === 0) return 0;
    let total = Math.hypot(
      this.path[this.cursor * 3] - from.x,
      this.path[this.cursor * 3 + 2] - from.z,
    );
    for (let i = this.cursor; i < this.count - 1; i++) {
      total += Math.hypot(
        this.path[(i + 1) * 3] - this.path[i * 3],
        this.path[(i + 1) * 3 + 2] - this.path[i * 3 + 2],
      );
    }
    return total;
  }

  targetSpeed(): number {
    let base: number;
    switch (this.gait) {
      case 'crouch':
        base = MOVE.crouchWalk;
        break;
      case 'combat':
        base = MOVE.combatWalk;
        break;
      case 'run':
        base = MOVE.run;
        break;
      case 'sprint':
        base = MOVE.sprint;
        break;
      default:
        base = MOVE.walk;
    }
    // A shouldered weapon is a hard speed limit: nobody runs at five metres a
    // second down their own sights, and an enemy that does is unreadable.
    if (this.aiming && base > MOVE.combatWalk) base = MOVE.combatWalk;
    return base * this.speedScale;
  }

  /**
   * Produces the displacement to hand to the character controller.
   *
   * `grounded` and the ground normal come from the previous move, which is one
   * frame stale and entirely good enough for gravity.
   */
  step(
    dt: number,
    feet: THREE.Vector3,
    grounded: boolean,
    field: AvoidanceField | null,
    id: number,
    out: THREE.Vector3,
  ): THREE.Vector3 {
    this.desired.set(0, 0, 0);
    const speed = this.targetSpeed();

    if (this.hasPath) {
      this.advanceCursor(feet);
      this.computeSteerTarget(feet);
      const dx = this.steerTarget.x - feet.x;
      const dz = this.steerTarget.z - feet.z;
      const distance = Math.hypot(dx, dz);
      if (distance > 1e-4) {
        this.desired.x = (dx / distance) * speed;
        this.desired.z = (dz / distance) * speed;
      }
      // Ease off over the last stride so an agent settles onto a cover slot
      // instead of overshooting and stepping back.
      const toGoal = Math.hypot(this.goal.x - feet.x, this.goal.z - feet.z);
      if (this.cursor >= this.count - 1 && toGoal < 1.1) {
        const scale = clamp(toGoal / 1.1, 0.12, 1);
        this.desired.multiplyScalar(scale);
        if (toGoal < MOVE.waypointRadius) {
          this.arrived = true;
          this.hasPath = false;
          this.desired.set(0, 0, 0);
        }
      }
    }

    if (field) {
      this.nudge.set(0, 0, 0);
      field.resolve(id, feet.x, feet.z, this.velocity.x, this.velocity.z, MOVE.avoidRadius, this.nudge);
      this.desired.x += this.nudge.x;
      this.desired.z += this.nudge.z;
      const magnitude = Math.hypot(this.desired.x, this.desired.z);
      if (magnitude > speed) {
        this.desired.x = (this.desired.x / magnitude) * speed;
        this.desired.z = (this.desired.z / magnitude) * speed;
      }
    }

    // Accelerate towards the desired velocity; decelerate faster than accelerate,
    // which is how a person stops.
    const wanting = this.desired.lengthSq() > 1e-6;
    const rate = wanting ? MOVE.acceleration : MOVE.deceleration;
    this.velocity.x = approach(this.velocity.x, this.desired.x, rate * dt);
    this.velocity.z = approach(this.velocity.z, this.desired.z, rate * dt);

    if (grounded) {
      // A small downward bias keeps the controller's snap-to-ground engaged on
      // ramps without it reading as falling.
      this.verticalVelocity = -1.2;
    } else {
      this.verticalVelocity = Math.max(MOVE.gravity * 1.6, this.verticalVelocity + MOVE.gravity * dt);
    }
    this.velocity.y = this.verticalVelocity;

    this.updateStuck(dt, feet, wanting);

    out.set(this.velocity.x * dt, this.verticalVelocity * dt, this.velocity.z * dt);
    return out;
  }

  /** Records the motion the controller actually applied, for stuck detection. */
  commit(applied: THREE.Vector3, dt: number): void {
    if (dt <= 0) return;
    // Trust the controller over our own integration: a blocked agent that keeps
    // believing it is moving will never re-path.
    this.velocity.x = damp(this.velocity.x, applied.x / dt, 30, dt);
    this.velocity.z = damp(this.velocity.z, applied.z / dt, 30, dt);
  }

  private advanceCursor(feet: THREE.Vector3): void {
    while (this.cursor < this.count - 1) {
      const wx = this.path[this.cursor * 3];
      const wz = this.path[this.cursor * 3 + 2];
      if (Math.hypot(wx - feet.x, wz - feet.z) > MOVE.waypointRadius) break;
      this.cursor++;
    }
  }

  private computeSteerTarget(feet: THREE.Vector3): void {
    const i = this.cursor;
    this.steerTarget.set(this.path[i * 3], this.path[i * 3 + 1], this.path[i * 3 + 2]);
    if (i >= this.count - 1) return;

    // Lookahead: slide the target past the next corner by however much of the
    // lookahead distance is left after reaching it.
    const toNext = Math.hypot(this.steerTarget.x - feet.x, this.steerTarget.z - feet.z);
    let slack = MOVE.lookahead - toNext;
    let index = i;
    while (slack > 0 && index < this.count - 1) {
      const ax = this.path[index * 3];
      const az = this.path[index * 3 + 2];
      const bx = this.path[(index + 1) * 3];
      const bz = this.path[(index + 1) * 3 + 2];
      const segment = Math.hypot(bx - ax, bz - az);
      if (segment <= 1e-4) {
        index++;
        continue;
      }
      if (slack >= segment) {
        slack -= segment;
        index++;
        this.steerTarget.set(bx, this.path[(index) * 3 + 1], bz);
      } else {
        const t = slack / segment;
        this.steerTarget.set(ax + (bx - ax) * t, this.path[index * 3 + 1], az + (bz - az) * t);
        break;
      }
    }
  }

  private updateStuck(dt: number, feet: THREE.Vector3, wanting: boolean): void {
    if (!wanting) {
      this.stuckTimer = 0;
      this.lastPosition.copy(feet);
      return;
    }
    this.progressTimer += dt;
    if (this.progressTimer < 0.1) return;
    const moved = Math.hypot(feet.x - this.lastPosition.x, feet.z - this.lastPosition.z);
    if (moved / this.progressTimer < MOVE.stuckSpeed) {
      this.stuckTimer += this.progressTimer;
      if (this.stuckTimer > MOVE.stuckTime) this.blocked = true;
    } else {
      this.stuckTimer = 0;
    }
    this.progressTimer = 0;
    this.lastPosition.copy(feet);
  }
}

function approach(current: number, target: number, maxDelta: number): number {
  const delta = target - current;
  if (Math.abs(delta) <= maxDelta) return target;
  return current + Math.sign(delta) * maxDelta;
}
