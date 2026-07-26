import * as THREE from 'three';
import { Groups } from '../core/GameContext';
import { Rng } from '../core/MathUtils';
import type { BodyDesc, BodyHandle } from '../core/Interfaces';
import { aabbOverlap, closestPointOnTriangle } from './Geometry';
import { NO_IGNORE, StaticWorld, TriBuffer, TriHit } from './StaticWorld';

/**
 * Impulse-based rigid bodies for debris, casings, dropped weapons and ragdoll
 * parts.
 *
 * This is deliberately not a general purpose engine. Shapes are sampled as a
 * small set of points (box corners, capsule end spheres) tested against the
 * triangles the BVH hands back, which keeps narrow phase trivial while still
 * letting a crate settle flat on a stair tread. Contacts are solved with
 * sequential impulses plus Coulomb friction, and penetration is removed with a
 * Baumgarte term that ignores a slop band so resting bodies neither sink nor
 * buzz.
 *
 * The important property for a shooter is that settled debris costs nothing:
 * bodies below a velocity threshold for a short while are put to sleep and
 * skipped entirely, so hundreds of shell casings on the floor are free.
 */

const SHAPE_BOX = 0;
const SHAPE_SPHERE = 1;
const SHAPE_CAPSULE = 2;

const GRAVITY = -9.81;
/** Distance at which a sample point is considered touching a face. */
const CONTACT_SKIN = 0.01;
/**
 * How far behind a face a sample may be and still be treated as a contact to
 * push back out. Beyond this a face is assumed to belong to some other surface
 * the body merely happens to be near, not the one it is stuck in.
 */
const DEEP_CONTACT = 0.25;
/** Penetration ignored by the position correction, so resting bodies settle. */
const PENETRATION_SLOP = 0.0015;
const BAUMGARTE = 0.3;
/** Below this closing speed restitution is dropped, killing micro-bounces. */
const RESTITUTION_CUTOFF = 0.6;
const SOLVER_ITERATIONS = 3;
/**
 * Sweeps over the body-vs-body contacts per step. Support has to travel up a
 * pile one contact at a time, so a single pass lets a stack of crates squash
 * itself flat before the boxes underneath have pushed back.
 */
const PAIR_ITERATIONS = 3;
const MAX_CONTACTS = 64;

/**
 * Damping rates, per second. Air drag on a shell casing is negligible over the
 * couple of metres it travels, so these are only here to stop the solver
 * feeding energy back into a pile; anything stronger and debris drifts down
 * like confetti instead of dropping.
 */
const LINEAR_DAMPING = 0.2;
const ANGULAR_DAMPING = 1.4;

/**
 * Speed ceiling for blast impulses. A light shard given the full force of a
 * point-blank grenade would otherwise leave on a ballistic arc and spend the
 * next several seconds off the map; this keeps the throw violent but local.
 */
const MAX_BLAST_SPEED = 18;

const SLEEP_LINEAR = 0.055;
const SLEEP_ANGULAR = 0.35;
/**
 * Penetration a body may still carry and be allowed to sleep. Position
 * correction moves a body without giving it velocity, so a body being pushed
 * out of a floor looks perfectly still to the sleep test — and once parked it
 * is skipped by the step loop, so it stays buried for good. Anything shallower
 * than this is invisible on debris.
 */
const SLEEP_PENETRATION = 0.02;
/**
 * How long a still body that is still penetrating is given to climb out before
 * it is parked anyway. Some jams — a shard wedged under a lip with faces
 * pushing both ways — never resolve, and simulating them forever costs more
 * than the millimetres of overlap are worth.
 */
const SLEEP_STUCK_TIME = 2;
const SLEEP_TIME = 0.4;
const REST_TIME = 1.2;
const REST_DISTANCE = 0.02;

interface Body {
  handle: number;
  /** Index into the body pool; recycled through the free list. */
  slot: number;
  alive: boolean;
  /** True once the current transform has been pushed onto the mesh. */
  written: boolean;
  mesh: THREE.Object3D | null;
  instanced: THREE.InstancedMesh | null;
  instanceIndex: number;
  /**
   * World -> mesh-local matrix, or null when the mesh frame is already world
   * space. Bodies are simulated in world coordinates but a mesh only accepts a
   * transform relative to its parent (or, when instanced, relative to itself).
   */
  frame: THREE.Matrix4 | null;
  shape: number;
  /** Box half extents, or (radius, halfHeight, radius) for capsules. */
  half: THREE.Vector3;
  radius: number;
  halfHeight: number;
  /** Bounding sphere radius, for broadphase. */
  bound: number;
  /** Radius used for the approximate body-vs-body pass. */
  contact: number;
  /**
   * World-space box axes (three unit column vectors), refreshed once per step
   * so the box-vs-box test does not rebuild a rotation matrix per pair.
   */
  basis: Float32Array;
  pos: THREE.Vector3;
  prevPos: THREE.Vector3;
  quat: THREE.Quaternion;
  prevQuat: THREE.Quaternion;
  vel: THREE.Vector3;
  angVel: THREE.Vector3;
  mass: number;
  invMass: number;
  invInertia: number;
  restitution: number;
  friction: number;
  lifetime: number;
  age: number;
  sleeping: boolean;
  sleepTimer: number;
  restTimer: number;
  restPos: THREE.Vector3;
  contactAge: number;
  /** Deepest static penetration from the last solve, for the sleep gate. */
  deepest: number;
  group: number;
  spawnIndex: number;
}

const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();
const _r = new THREE.Vector3();
const _n = new THREE.Vector3();
const _cp = new THREE.Vector3();
const _tdir = new THREE.Vector3();
const _push = new THREE.Vector3();
const _mat = new THREE.Matrix4();
const _scale = new THREE.Vector3(1, 1, 1);
const _qtmp = new THREE.Quaternion();
const _qinv = new THREE.Quaternion();

const IDENTITY = new THREE.Matrix4().elements;

const BOX_CORNERS = new Float32Array([
  -1, -1, -1, 1, -1, -1, -1, 1, -1, 1, 1, -1, -1, -1, 1, 1, -1, 1, -1, 1, 1, 1, 1, 1,
]);

export class RigidBodySet {
  /** Hard cap on live bodies; the oldest is recycled when exceeded. */
  maxBodies = 320;
  substeps = 2;
  /** Collision mask used when bodies test against the static world. */
  mask = Groups.WORLD | Groups.PROP;

  private bodies: Body[] = [];
  private freeSlots: number[] = [];
  private byHandle = new Map<number, Body>();
  private nextHandle = 1;
  private spawnCounter = 0;
  private tris = new TriBuffer(256);
  private rng = new Rng(0x51ed270b);
  private triHit = new TriHit();

  private cN = new Float32Array(MAX_CONTACTS * 3);
  private cR = new Float32Array(MAX_CONTACTS * 3);
  private cDepth = new Float32Array(MAX_CONTACTS);
  private cImpulse = new Float32Array(MAX_CONTACTS);
  private cCount = 0;
  /** Shortest escape from a face the body is buried behind; 0 when none. */
  private rescueDepth = 0;
  private rescueN = new THREE.Vector3();
  private rescueR = new THREE.Vector3();

  private cells = new Map<number, number[]>();
  private cellSize = 0.75;
  private dirtyInstances = new Set<THREE.InstancedMesh>();
  private instanceCursor = new Map<THREE.InstancedMesh, number>();
  /** One shared world->local matrix per parent frame; null means identity. */
  private frames = new WeakMap<THREE.Object3D, { inv: THREE.Matrix4 | null }>();

  constructor(private world: StaticWorld) {}

  get count(): number {
    return this.byHandle.size;
  }

  get awakeCount(): number {
    let n = 0;
    for (const b of this.bodies) if (b.alive && !b.sleeping) n++;
    return n;
  }

  get sleepingCount(): number {
    let n = 0;
    for (const b of this.bodies) if (b.alive && b.sleeping) n++;
    return n;
  }

  add(desc: BodyDesc): BodyHandle {
    if (this.byHandle.size >= this.maxBodies) this.recycleOldest();

    const shape =
      desc.shape === 'sphere' ? SHAPE_SPHERE : desc.shape === 'capsule' ? SHAPE_CAPSULE : SHAPE_BOX;
    const size = desc.size ?? new THREE.Vector3(0.1, 0.1, 0.1);
    const mass = Math.max(0.001, desc.mass);

    let body: Body;
    if (this.freeSlots.length > 0) {
      body = this.bodies[this.freeSlots.pop()!];
    } else {
      body = makeBody();
      body.slot = this.bodies.length;
      this.bodies.push(body);
    }

    body.handle = this.nextHandle++;
    body.alive = true;
    body.shape = shape;
    body.half.set(Math.abs(size.x), Math.abs(size.y), Math.abs(size.z));
    if (shape === SHAPE_SPHERE) {
      body.radius = Math.max(0.005, size.x);
      body.halfHeight = 0;
      body.bound = body.radius;
      body.contact = body.radius;
    } else if (shape === SHAPE_CAPSULE) {
      body.radius = Math.max(0.005, size.x);
      body.halfHeight = Math.max(0, size.y);
      body.bound = body.radius + body.halfHeight;
      body.contact = body.radius;
    } else {
      body.half.set(
        Math.max(0.005, body.half.x),
        Math.max(0.005, body.half.y),
        Math.max(0.005, body.half.z),
      );
      body.radius = 0;
      body.halfHeight = 0;
      body.bound = body.half.length();
      // Inscribed rather than bounding radius: box debris that interpenetrates
      // slightly reads far better than boxes held apart by their diagonals.
      body.contact = Math.min(body.half.x, body.half.y, body.half.z);
    }

    body.mass = mass;
    body.invMass = 1 / mass;
    body.invInertia = 1 / inertiaScalar(body, mass);
    body.restitution = desc.restitution ?? 0.2;
    body.friction = desc.friction ?? 0.6;
    body.lifetime = desc.lifetime ?? 0;
    body.age = 0;
    body.sleeping = false;
    body.sleepTimer = 0;
    body.restTimer = 0;
    body.contactAge = 10;
    body.deepest = 0;
    body.group = desc.group ?? Groups.DEBRIS;
    body.spawnIndex = this.spawnCounter++;

    const mesh = desc.mesh ?? null;
    body.mesh = mesh;
    body.instanced = null;
    body.instanceIndex = -1;
    body.frame = null;
    body.written = false;
    if (mesh) {
      const inst = mesh as THREE.InstancedMesh;
      if (inst.isInstancedMesh) {
        body.instanced = inst;
        const wanted = (desc as BodyDesc & { instanceIndex?: number }).instanceIndex;
        if (typeof wanted === 'number' && wanted >= 0) {
          body.instanceIndex = wanted;
        } else {
          const cursor = this.instanceCursor.get(inst) ?? 0;
          body.instanceIndex = inst.count > 0 ? cursor % inst.count : 0;
          this.instanceCursor.set(inst, body.instanceIndex + 1);
        }
        // Instanced debris is scattered all over the level; a per-instance
        // bounding sphere would have to be recomputed every frame.
        inst.frustumCulled = false;
        inst.updateWorldMatrix(true, false);
        body.frame = this.frameFor(inst, inst.matrixWorld);
        inst.getMatrixAt(body.instanceIndex, _mat);
        if (body.frame) _mat.premultiply(inst.matrixWorld);
        body.pos.setFromMatrixPosition(_mat);
        body.quat.setFromRotationMatrix(_mat);
      } else {
        mesh.updateWorldMatrix(true, false);
        const parent = mesh.parent;
        if (parent) body.frame = this.frameFor(parent, parent.matrixWorld);
        body.pos.setFromMatrixPosition(mesh.matrixWorld);
        _mat.extractRotation(mesh.matrixWorld);
        body.quat.setFromRotationMatrix(_mat);
        mesh.visible = true;
      }
    }
    body.prevPos.copy(body.pos);
    body.prevQuat.copy(body.quat);
    body.restPos.copy(body.pos);

    body.vel.set(0, 0, 0);
    if (desc.linearVelocity) body.vel.copy(desc.linearVelocity);
    body.angVel.set(0, 0, 0);
    if (desc.angularVelocity) body.angVel.copy(desc.angularVelocity);

    this.byHandle.set(body.handle, body);
    return body.handle;
  }

  remove(handle: BodyHandle): void {
    const body = this.byHandle.get(handle);
    if (!body) return;
    this.byHandle.delete(handle);
    body.alive = false;
    body.mesh = null;
    body.instanced = null;
    body.frame = null;
    this.freeSlots.push(body.slot);
  }

  applyImpulse(handle: BodyHandle, impulse: THREE.Vector3, at?: THREE.Vector3): void {
    const body = this.byHandle.get(handle);
    if (!body) return;
    this.wake(body);
    body.vel.addScaledVector(impulse, body.invMass);
    if (at) {
      _r.copy(at).sub(body.pos);
      _v1.crossVectors(_r, impulse).multiplyScalar(body.invInertia);
      body.angVel.add(_v1);
    }
  }

  /** Radial impulse with an upward bias, so blasts throw debris upwards. */
  applyExplosionForce(center: THREE.Vector3, radius: number, force: number): void {
    const r2 = radius * radius;
    for (const body of this.bodies) {
      if (!body.alive) continue;
      _v1.copy(body.pos).sub(center);
      const d2 = _v1.lengthSq();
      if (d2 > r2) continue;
      const dist = Math.sqrt(d2);
      // Inverse-square-ish: strong at the core, gone at the rim.
      const t = 1 - dist / radius;
      const falloff = t * t * (0.35 + 0.65 * t);
      if (dist > 1e-4) _v1.multiplyScalar(1 / dist);
      else _v1.set(0, 1, 0);
      _v1.y += 0.45;
      _v1.normalize();
      this.wake(body);
      const magnitude = force * falloff;
      const dv = Math.min(magnitude * body.invMass, MAX_BLAST_SPEED);
      body.vel.addScaledVector(_v1, dv);
      body.angVel.x += this.rng.range(-1, 1) * falloff * 22;
      body.angVel.y += this.rng.range(-1, 1) * falloff * 22;
      body.angVel.z += this.rng.range(-1, 1) * falloff * 22;
    }
  }

  wakeInRadius(center: THREE.Vector3, radius: number): void {
    const r2 = radius * radius;
    for (const body of this.bodies) {
      if (!body.alive || !body.sleeping) continue;
      if (body.pos.distanceToSquared(center) <= r2) this.wake(body);
    }
  }

  private wake(body: Body): void {
    body.sleeping = false;
    body.sleepTimer = 0;
    body.restTimer = 0;
    body.contactAge = 10;
    body.written = false;
    body.restPos.copy(body.pos);
  }

  private recycleOldest(): void {
    let oldest: Body | null = null;
    for (const body of this.bodies) {
      if (!body.alive) continue;
      if (!oldest || body.spawnIndex < oldest.spawnIndex) oldest = body;
    }
    if (oldest) {
      this.hideMesh(oldest);
      this.remove(oldest.handle);
    }
  }

  clear(): void {
    this.freeSlots.length = 0;
    for (const body of this.bodies) {
      if (body.alive) this.hideMesh(body);
      body.alive = false;
      body.mesh = null;
      body.instanced = null;
      body.frame = null;
      this.freeSlots.push(body.slot);
    }
    this.byHandle.clear();
    this.instanceCursor.clear();
  }

  /**
   * Caches the world->local matrix for a mesh frame. Debris pools are parented
   * once and never moved, so this is computed on first use and shared by every
   * body on that frame; a frame that is already world space caches as null so
   * the writeback stays a bare compose.
   */
  private frameFor(key: THREE.Object3D, world: THREE.Matrix4): THREE.Matrix4 | null {
    const cached = this.frames.get(key);
    if (cached) return cached.inv;
    const e = world.elements;
    let identity = true;
    for (let i = 0; i < 16 && identity; i++) {
      if (Math.abs(e[i] - IDENTITY[i]) > 1e-6) identity = false;
    }
    const entry = { inv: identity ? null : new THREE.Matrix4().copy(world).invert() };
    this.frames.set(key, entry);
    return entry.inv;
  }

  private hideMesh(body: Body): void {
    if (body.instanced && body.instanceIndex >= 0) {
      _mat.makeScale(0, 0, 0);
      body.instanced.setMatrixAt(body.instanceIndex, _mat);
      this.dirtyInstances.add(body.instanced);
    } else if (body.mesh) {
      body.mesh.visible = false;
    }
  }

  /* ------------------------------ step -------------------------------- */

  step(dt: number): void {
    if (dt <= 0) return;
    const subs = Math.max(1, Math.min(8, this.substeps));
    const h = dt / subs;

    this.buildGrid();

    for (const body of this.bodies) {
      if (!body.alive) continue;
      body.age += dt;
      if (body.lifetime > 0 && body.age >= body.lifetime) {
        this.hideMesh(body);
        this.remove(body.handle);
        continue;
      }
      if (body.sleeping) continue;

      body.prevPos.copy(body.pos);
      body.prevQuat.copy(body.quat);

      // Gather once for the whole fixed step: the body cannot leave this box.
      const travel = body.vel.length() * dt + 0.05;
      const pad = body.bound + travel;
      this.world.gather(
        body.pos.x - pad,
        body.pos.y - pad,
        body.pos.z - pad,
        body.pos.x + pad,
        body.pos.y + pad,
        body.pos.z + pad,
        this.mask,
        NO_IGNORE,
        this.tris,
      );

      for (let s = 0; s < subs; s++) {
        this.integrate(body, h);
        if (this.tris.count > 0) this.solveStatic(body, h);
      }
      body.written = false;
      body.contactAge += dt;
    }

    for (let i = 0; i < PAIR_ITERATIONS; i++) this.solveBodyPairs(dt);
    this.updateSleep(dt);
  }

  private integrate(body: Body, h: number): void {
    body.vel.y += GRAVITY * h;
    body.vel.multiplyScalar(1 - Math.min(0.4, LINEAR_DAMPING * h));
    body.angVel.multiplyScalar(1 - Math.min(0.4, ANGULAR_DAMPING * h));

    const speed = body.vel.length();
    if (speed > 1e-6) {
      const inv = 1 / speed;
      const dx = body.vel.x * inv;
      const dy = body.vel.y * inv;
      const dz = body.vel.z * inv;
      let move = speed * h;
      // The narrow phase samples a handful of points, so it can only resolve an
      // overlap that already exists — and one corner impulse barely slows the
      // centre of a box, so a body arriving fast keeps burying itself until it
      // is deeper than the contact search reaches and drops out of the level.
      // Anything moving more than a skin per substep is swept first and landed
      // on the surface.
      if (move > CONTACT_SKIN) {
        const support = this.supportAlong(body, dx, dy, dz);
        if (
          this.world.raycast(
            body.pos.x, body.pos.y, body.pos.z,
            dx, dy, dz,
            move + support + CONTACT_SKIN,
            this.mask,
            NO_IGNORE,
            this.triHit,
          )
        ) {
          const limit = this.triHit.distance - support - CONTACT_SKIN * 0.5;
          if (limit < move) {
            move = limit > 0 ? limit : 0;
            // Land, do not freeze: leaving the closing speed intact would make
            // the next substep sweep to zero again and the body would hang in
            // mid-air with the narrow phase still out of range.
            _n.set(this.triHit.nx, this.triHit.ny, this.triHit.nz);
            const vn = body.vel.dot(_n);
            if (vn < 0) {
              const e = vn < -RESTITUTION_CUTOFF ? body.restitution : 0;
              body.vel.addScaledVector(_n, -vn * (1 + e));
            }
          }
        }
      }
      body.pos.x += dx * move;
      body.pos.y += dy * move;
      body.pos.z += dz * move;
    }

    const wx = body.angVel.x;
    const wy = body.angVel.y;
    const wz = body.angVel.z;
    if (wx !== 0 || wy !== 0 || wz !== 0) {
      const q = body.quat;
      const qx = q.x;
      const qy = q.y;
      const qz = q.z;
      const qw = q.w;
      const k = 0.5 * h;
      q.x += k * (wx * qw + wy * qz - wz * qy);
      q.y += k * (-wx * qz + wy * qw + wz * qx);
      q.z += k * (wx * qy - wy * qx + wz * qw);
      q.w += k * (-wx * qx - wy * qy - wz * qz);
      q.normalize();
    }
  }

  /**
   * Distance from the centre to the surface of the shape along a unit
   * direction, so a swept body can be stopped exactly on a face instead of a
   * bounding sphere radius away from it.
   */
  private supportAlong(body: Body, dx: number, dy: number, dz: number): number {
    if (body.shape === SHAPE_SPHERE) return body.radius;
    _qinv.copy(body.quat).invert();
    _v3.set(dx, dy, dz).applyQuaternion(_qinv);
    if (body.shape === SHAPE_CAPSULE) return body.radius + body.halfHeight * Math.abs(_v3.y);
    return (
      body.half.x * Math.abs(_v3.x) +
      body.half.y * Math.abs(_v3.y) +
      body.half.z * Math.abs(_v3.z)
    );
  }

  /** Builds contacts against the gathered triangles and solves them. */
  private solveStatic(body: Body, h: number): void {
    this.cCount = 0;
    this.rescueDepth = 0;
    const samples = body.shape === SHAPE_BOX ? 8 : body.shape === SHAPE_CAPSULE ? 2 : 1;
    const sampleRadius = body.shape === SHAPE_BOX ? 0 : body.radius;

    for (let s = 0; s < samples && this.cCount < MAX_CONTACTS; s++) {
      if (body.shape === SHAPE_BOX) {
        _v1.set(
          BOX_CORNERS[s * 3] * body.half.x,
          BOX_CORNERS[s * 3 + 1] * body.half.y,
          BOX_CORNERS[s * 3 + 2] * body.half.z,
        );
      } else if (body.shape === SHAPE_CAPSULE) {
        _v1.set(0, s === 0 ? body.halfHeight : -body.halfHeight, 0);
      } else {
        _v1.set(0, 0, 0);
      }
      _v1.applyQuaternion(body.quat);
      _v2.copy(body.pos).add(_v1);
      this.collectContacts(_v2, _v1, sampleRadius);
    }

    // Nothing within reach, but a sample is behind a face: the body is buried
    // deeper than the contact search normally trusts and would otherwise be
    // invisible to the solver for good. Push it out along its shortest escape.
    if (this.cCount === 0 && this.rescueDepth > 0) {
      this.cN[0] = this.rescueN.x;
      this.cN[1] = this.rescueN.y;
      this.cN[2] = this.rescueN.z;
      this.cR[0] = this.rescueR.x;
      this.cR[1] = this.rescueR.y;
      this.cR[2] = this.rescueR.z;
      this.cDepth[0] = this.rescueDepth;
      this.cCount = 1;
    }

    if (this.cCount === 0) {
      body.deepest = 0;
      return;
    }
    body.contactAge = 0;
    let deepest = 0;
    for (let i = 0; i < this.cCount; i++) {
      if (this.cDepth[i] > deepest) deepest = this.cDepth[i];
    }
    body.deepest = deepest;

    for (let i = 0; i < this.cCount; i++) this.cImpulse[i] = 0;
    for (let iter = 0; iter < SOLVER_ITERATIONS; iter++) {
      for (let i = 0; i < this.cCount; i++) this.solveContact(body, i, h);
    }

    // Baumgarte: grow a single correction that satisfies every contact rather
    // than summing them, which would launch a body resting on coplanar faces.
    // No contact may ask for more than its own penetration back, so a shallow
    // one facing the other way cannot cancel a deep escape — that is how a body
    // wedged under a lip used to stay wedged there for good.
    _push.set(0, 0, 0);
    for (let i = 0; i < this.cCount; i++) {
      const depth = this.cDepth[i];
      if (depth <= PENETRATION_SLOP) continue;
      _n.set(this.cN[i * 3], this.cN[i * 3 + 1], this.cN[i * 3 + 2]);
      const want = (depth - PENETRATION_SLOP) * BAUMGARTE;
      const already = _push.dot(_n);
      const need = already > 0 ? want - already : want;
      if (need > 0) _push.addScaledVector(_n, need);
    }
    const len = _push.length();
    if (len > 0.25) _push.multiplyScalar(0.25 / len);
    body.pos.add(_push);
  }

  /** Point-vs-triangle contacts for one sample point on the body. */
  private collectContacts(world: THREE.Vector3, offset: THREE.Vector3, radius: number): void {
    const verts = this.tris.verts;
    const normals = this.tris.normals;
    const bounds = this.tris.bounds;
    const reach = radius + CONTACT_SKIN;
    // The broad filter has to span the depth the narrow phase is willing to
    // push back out, not just the contact skin: a sample that has ended up
    // well behind a face is exactly the case that needs resolving, and culling
    // it here would leave the body buried with nothing to push against.
    const query = radius + DEEP_CONTACT;
    const minx = world.x - query;
    const miny = world.y - query;
    const minz = world.z - query;
    const maxx = world.x + query;
    const maxy = world.y + query;
    const maxz = world.z + query;
    let escapeDepth = Infinity;
    let escapeX = 0;
    let escapeY = 0;
    let escapeZ = 0;

    for (let i = 0; i < this.tris.count && this.cCount < MAX_CONTACTS; i++) {
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
      const vo = i * 9;
      const no = i * 3;
      const nx = normals[no];
      const ny = normals[no + 1];
      const nz = normals[no + 2];
      const sd =
        (world.x - verts[vo]) * nx + (world.y - verts[vo + 1]) * ny + (world.z - verts[vo + 2]) * nz;
      if (sd > reach) continue;

      const d = Math.sqrt(closestPointOnTriangle(world.x, world.y, world.z, verts, vo, _cp));
      if (sd < 0) {
        // Behind the face. Only trust it when the face is actually the nearest
        // thing, otherwise a distant coplanar triangle would grab the body.
        if (d > DEEP_CONTACT + radius) {
          if (-sd < this.rescueDepth || this.rescueDepth === 0) {
            this.rescueDepth = -sd;
            this.rescueN.set(nx, ny, nz);
            this.rescueR.copy(offset);
          }
          continue;
        }
        // One escape per sample, along the shortest way out. A point inside
        // something thin — a ramp deck, a panel — is behind both of its faces,
        // and keeping both leaves the corrections fighting each other so the
        // body never leaves the slab.
        if (-sd < escapeDepth) {
          escapeDepth = -sd;
          escapeX = nx;
          escapeY = ny;
          escapeZ = nz;
        }
        continue;
      }

      if (d > reach) continue;
      const depth = radius - d;
      const c = this.cCount++;
      if (d > 1e-6) {
        this.cN[c * 3] = (world.x - _cp.x) / d;
        this.cN[c * 3 + 1] = (world.y - _cp.y) / d;
        this.cN[c * 3 + 2] = (world.z - _cp.z) / d;
      } else {
        this.cN[c * 3] = nx;
        this.cN[c * 3 + 1] = ny;
        this.cN[c * 3 + 2] = nz;
      }
      this.cR[c * 3] = offset.x;
      this.cR[c * 3 + 1] = offset.y;
      this.cR[c * 3 + 2] = offset.z;
      this.cDepth[c] = depth > 0 ? depth : 0;
    }

    if (escapeDepth < Infinity && this.cCount < MAX_CONTACTS) {
      const c = this.cCount++;
      this.cN[c * 3] = escapeX;
      this.cN[c * 3 + 1] = escapeY;
      this.cN[c * 3 + 2] = escapeZ;
      this.cR[c * 3] = offset.x;
      this.cR[c * 3 + 1] = offset.y;
      this.cR[c * 3 + 2] = offset.z;
      this.cDepth[c] = escapeDepth + radius;
    }
  }

  private solveContact(body: Body, i: number, h: number): void {
    _n.set(this.cN[i * 3], this.cN[i * 3 + 1], this.cN[i * 3 + 2]);
    _r.set(this.cR[i * 3], this.cR[i * 3 + 1], this.cR[i * 3 + 2]);

    _v1.crossVectors(body.angVel, _r).add(body.vel);
    const vn = _v1.dot(_n);
    if (vn > 0 && this.cDepth[i] <= PENETRATION_SLOP) return;

    _v2.crossVectors(_r, _n);
    const k = body.invMass + body.invInertia * _v2.lengthSq();
    if (k < 1e-9) return;

    const e = vn < -RESTITUTION_CUTOFF ? body.restitution : 0;
    let jn = (-(1 + e) * vn) / k;
    if (jn < 0) jn = 0;
    this.cImpulse[i] += jn;
    body.vel.addScaledVector(_n, jn * body.invMass);
    _v2.crossVectors(_r, _n).multiplyScalar(jn * body.invInertia);
    body.angVel.add(_v2);

    // Coulomb friction against the accumulated normal impulse.
    _v1.crossVectors(body.angVel, _r).add(body.vel);
    const vnAfter = _v1.dot(_n);
    _tdir.copy(_v1).addScaledVector(_n, -vnAfter);
    const vt = _tdir.length();
    if (vt < 1e-5) return;
    _tdir.multiplyScalar(1 / vt);
    _v3.crossVectors(_r, _tdir);
    const kt = body.invMass + body.invInertia * _v3.lengthSq();
    if (kt < 1e-9) return;
    let jt = -vt / kt;
    // Coulomb friction, but floored by the weight this face is actually
    // holding. A resting body's normal impulse is only the sliver of gravity
    // taken up in one substep, and friction scaled off that alone lets settled
    // debris creep down every slope it lands on. Using m*g*n.y keeps the
    // Coulomb ratio honest, so a shard still slides off a 65 degree ramp.
    const load = body.mass * -GRAVITY * h * (_n.y > 0 ? _n.y : 0);
    const limit = body.friction * Math.max(this.cImpulse[i], load);
    if (jt < -limit) jt = -limit;
    body.vel.addScaledVector(_tdir, jt * body.invMass);
    _v3.crossVectors(_r, _tdir).multiplyScalar(jt * body.invInertia);
    body.angVel.add(_v3);
  }

  /* -------------------------- body vs body ----------------------------- */

  private buildGrid(): void {
    this.cells.clear();
    let maxBound = 0.1;
    for (const body of this.bodies) {
      if (!body.alive) continue;
      if (body.bound > maxBound) maxBound = body.bound;
      if (body.shape === SHAPE_BOX) refreshBasis(body);
    }
    // Two bodies can only touch if their centres are within the sum of their
    // bounding radii, so the cell has to be at least that wide for a 3x3x3
    // neighbour walk to be exhaustive.
    this.cellSize = Math.max(0.4, maxBound * 2.05);
    const inv = 1 / this.cellSize;
    for (let i = 0; i < this.bodies.length; i++) {
      const body = this.bodies[i];
      if (!body.alive) continue;
      const key = cellKey3(
        Math.floor(body.pos.x * inv),
        Math.floor(body.pos.y * inv),
        Math.floor(body.pos.z * inv),
      );
      let list = this.cells.get(key);
      if (!list) {
        list = [];
        this.cells.set(key, list);
      }
      list.push(i);
    }
  }

  private solveBodyPairs(dt: number): void {
    const inv = 1 / this.cellSize;
    for (let i = 0; i < this.bodies.length; i++) {
      const a = this.bodies[i];
      if (!a.alive || a.sleeping) continue;
      const bx = Math.floor(a.pos.x * inv);
      const by = Math.floor(a.pos.y * inv);
      const bz = Math.floor(a.pos.z * inv);
      for (let oz = -1; oz <= 1; oz++) {
        for (let oy = -1; oy <= 1; oy++) {
          for (let ox = -1; ox <= 1; ox++) {
            const list = this.cells.get(cellKey3(bx + ox, by + oy, bz + oz));
            if (!list) continue;
            for (let k = 0; k < list.length; k++) {
              const j = list[k];
              if (j <= i) continue;
              const b = this.bodies[j];
              if (!b.alive) continue;
              this.resolvePair(a, b, dt);
            }
          }
        }
      }
    }
  }

  private resolvePair(a: Body, b: Body, dt: number): void {
    const depth = pairContact(a, b);
    if (depth <= 0) return;

    if (b.sleeping) {
      const speed = a.vel.length();
      if (depth < 0.02 && speed < 0.6) return;
      this.wake(b);
    }

    const invSum = a.invMass + b.invMass;
    if (invSum < 1e-9) return;

    // Normal velocity exchange, no restitution: debris piles should deaden.
    _v2.copy(b.vel).sub(a.vel);
    const vn = _v2.dot(_v1);
    if (vn < 0) {
      const jn = -vn / invSum;
      a.vel.addScaledVector(_v1, -jn * a.invMass);
      b.vel.addScaledVector(_v1, jn * b.invMass);
      // A real impact should scatter the pile a little rather than let it slide
      // as a block; resting contacts are left alone or a stack would shake
      // itself apart.
      if (-vn > 0.5) {
        const spin = Math.min(1.5, -vn * 0.4);
        a.angVel.x += (this.rng.next() - 0.5) * spin;
        a.angVel.z += (this.rng.next() - 0.5) * spin;
      }
    }

    // Coulomb friction on the tangential slip. Without this a crate resting on
    // another slides off it under any lateral nudge and the stack unpacks.
    _tdir.copy(_v2).addScaledVector(_v1, -_v2.dot(_v1));
    const slip = _tdir.length();
    if (slip > 1e-4) {
      _tdir.multiplyScalar(1 / slip);
      const mu = Math.min(a.friction, b.friction);
      // Bounded by the weight the pair carries over one step rather than by the
      // collision impulse: holding a stack up is all this needs to do, and an
      // impact-scaled limit lets a heavy landing drag its neighbours through
      // the floor faster than the world contacts can push them back out.
      const jt = Math.min(slip / invSum, (mu * -GRAVITY * dt) / invSum);
      a.vel.addScaledVector(_tdir, jt * a.invMass);
      b.vel.addScaledVector(_tdir, -jt * b.invMass);
    }

    const corr = (depth - PENETRATION_SLOP) * 0.4;
    if (corr > 0) {
      // Separate sideways and upwards only. The world contacts for this step
      // have already been solved, so a downward shove here survives until the
      // next one — and a body that falls asleep in between stays buried in the
      // floor. Letting the pile interpenetrate a little instead is invisible.
      _v3.set(_v1.x, _v1.y > 0 ? 0 : _v1.y, _v1.z);
      a.pos.addScaledVector(_v3, (-corr * a.invMass) / invSum);
      _v3.set(_v1.x, _v1.y < 0 ? 0 : _v1.y, _v1.z);
      b.pos.addScaledVector(_v3, (corr * b.invMass) / invSum);
    }
    a.contactAge = 0;
    b.contactAge = 0;
  }

  /* ------------------------------ sleep -------------------------------- */

  private updateSleep(dt: number): void {
    for (const body of this.bodies) {
      if (!body.alive || body.sleeping) continue;

      const lin = body.vel.lengthSq();
      const ang = body.angVel.lengthSq();
      if (lin < SLEEP_LINEAR * SLEEP_LINEAR && ang < SLEEP_ANGULAR * SLEEP_ANGULAR) {
        body.sleepTimer += dt;
      } else {
        body.sleepTimer = 0;
      }

      if (body.pos.distanceToSquared(body.restPos) > REST_DISTANCE * REST_DISTANCE) {
        body.restPos.copy(body.pos);
        body.restTimer = 0;
      } else {
        body.restTimer += dt;
      }

      // Only ever sleep something that is actually leaning on the world; a body
      // in free fall must never be parked in mid-air. One still being pushed out
      // of a surface is given longer, so it finishes climbing out rather than
      // falling asleep buried.
      const supported = body.contactAge < 0.3;
      const quiet = body.deepest <= SLEEP_PENETRATION ? SLEEP_TIME : SLEEP_STUCK_TIME;
      if (supported && (body.sleepTimer >= quiet || body.restTimer >= REST_TIME)) {
        body.sleeping = true;
        body.vel.set(0, 0, 0);
        body.angVel.set(0, 0, 0);
      }
    }
  }

  /* ---------------------------- rendering ------------------------------ */

  /** Writes interpolated transforms onto the meshes the bodies drive. */
  writeTransforms(alpha: number): void {
    const t = alpha < 0 ? 0 : alpha > 1 ? 1 : alpha;
    for (const body of this.bodies) {
      if (!body.alive) continue;
      // A sleeping body has already had its final transform written.
      if (body.sleeping && body.written) continue;
      _v1.copy(body.prevPos).lerp(body.pos, t);
      _qtmp.copy(body.prevQuat).slerp(body.quat, t);

      if (body.instanced && body.instanceIndex >= 0) {
        _mat.compose(_v1, _qtmp, _scale);
        if (body.frame) _mat.premultiply(body.frame);
        body.instanced.setMatrixAt(body.instanceIndex, _mat);
        this.dirtyInstances.add(body.instanced);
      } else if (body.mesh) {
        if (body.frame) {
          _mat.compose(_v1, _qtmp, _scale).premultiply(body.frame);
          body.mesh.position.setFromMatrixPosition(_mat);
          _mat.extractRotation(_mat);
          body.mesh.quaternion.setFromRotationMatrix(_mat);
        } else {
          body.mesh.position.copy(_v1);
          body.mesh.quaternion.copy(_qtmp);
        }
      }
      body.written = body.sleeping;
    }
    for (const inst of this.dirtyInstances) inst.instanceMatrix.needsUpdate = true;
    this.dirtyInstances.clear();
  }

  forEach(fn: (info: BodyInfo) => void): void {
    for (const body of this.bodies) {
      if (!body.alive) continue;
      _info.handle = body.handle;
      _info.position = body.pos;
      _info.quaternion = body.quat;
      _info.velocity = body.vel;
      _info.half = body.half;
      _info.radius = body.radius;
      _info.halfHeight = body.halfHeight;
      _info.shape = body.shape;
      _info.sleeping = body.sleeping;
      _info.group = body.group;
      _info.object = body.mesh;
      fn(_info);
    }
  }
}

export interface BodyInfo {
  handle: number;
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  velocity: THREE.Vector3;
  half: THREE.Vector3;
  radius: number;
  halfHeight: number;
  shape: number;
  sleeping: boolean;
  group: number;
  object: THREE.Object3D | null;
}

const _info: BodyInfo = {
  handle: 0,
  position: new THREE.Vector3(),
  quaternion: new THREE.Quaternion(),
  velocity: new THREE.Vector3(),
  half: new THREE.Vector3(),
  radius: 0,
  halfHeight: 0,
  shape: 0,
  sleeping: false,
  group: 0,
  object: null,
};

/** Rebuilds the cached world-space box axes from the body rotation. */
function refreshBasis(body: Body): void {
  _mat.makeRotationFromQuaternion(body.quat);
  const e = _mat.elements;
  const b = body.basis;
  b[0] = e[0];
  b[1] = e[1];
  b[2] = e[2];
  b[3] = e[4];
  b[4] = e[5];
  b[5] = e[6];
  b[6] = e[8];
  b[7] = e[9];
  b[8] = e[10];
}

/** Half extent of a box projected onto a unit axis. */
function projectBox(half: THREE.Vector3, basis: Float32Array, ax: number, ay: number, az: number) {
  return (
    half.x * Math.abs(basis[0] * ax + basis[1] * ay + basis[2] * az) +
    half.y * Math.abs(basis[3] * ax + basis[4] * ay + basis[5] * az) +
    half.z * Math.abs(basis[6] * ax + basis[7] * ay + basis[8] * az)
  );
}

/**
 * Separating-axis test between two oriented boxes. Returns the penetration
 * depth along the axis of least overlap and writes that axis into `_v1`,
 * pointing from a towards b, or 0 when the boxes are apart.
 *
 * The full fifteen axes are worth it here: a world-AABB approximation reports
 * tumbled debris as touching when it is not, and the pile then shoves itself
 * around forever instead of falling asleep.
 */
function boxBoxSat(a: Body, b: Body): number {
  const dx = b.pos.x - a.pos.x;
  const dy = b.pos.y - a.pos.y;
  const dz = b.pos.z - a.pos.z;
  const ba = a.basis;
  const bb = b.basis;
  let best = Infinity;
  let nx = 0;
  let ny = 0;
  let nz = 0;

  for (let i = 0; i < 6; i++) {
    const src = i < 3 ? ba : bb;
    const o = (i % 3) * 3;
    const ax = src[o];
    const ay = src[o + 1];
    const az = src[o + 2];
    const gap =
      projectBox(a.half, ba, ax, ay, az) +
      projectBox(b.half, bb, ax, ay, az) -
      Math.abs(dx * ax + dy * ay + dz * az);
    if (gap <= 0) return 0;
    if (gap < best) {
      best = gap;
      const sign = dx * ax + dy * ay + dz * az >= 0 ? 1 : -1;
      nx = ax * sign;
      ny = ay * sign;
      nz = az * sign;
    }
  }

  // Edge-edge axes. These only ever prove separation or hand back a normal
  // along an edge crossing, so they are held to a slightly higher bar than the
  // face axes, whose normals make far better contacts for a resting body.
  for (let i = 0; i < 3; i++) {
    const iu = ba[i * 3];
    const iv = ba[i * 3 + 1];
    const iw = ba[i * 3 + 2];
    for (let j = 0; j < 3; j++) {
      const ju = bb[j * 3];
      const jv = bb[j * 3 + 1];
      const jw = bb[j * 3 + 2];
      let ax = iv * jw - iw * jv;
      let ay = iw * ju - iu * jw;
      let az = iu * jv - iv * ju;
      const len = Math.sqrt(ax * ax + ay * ay + az * az);
      if (len < 1e-5) continue;
      ax /= len;
      ay /= len;
      az /= len;
      const t = dx * ax + dy * ay + dz * az;
      const gap =
        projectBox(a.half, ba, ax, ay, az) +
        projectBox(b.half, bb, ax, ay, az) -
        Math.abs(t);
      if (gap <= 0) return 0;
      if (gap < best - 0.01) {
        best = gap;
        const sign = t >= 0 ? 1 : -1;
        nx = ax * sign;
        ny = ay * sign;
        nz = az * sign;
      }
    }
  }

  _v1.set(nx, ny, nz);
  return best;
}

/**
 * Body-vs-body contact. Boxes get the separating-axis test; anything else is
 * approximated by its inscribed sphere, which is plenty for shards, casings and
 * ragdoll limbs where interpenetration is never noticed.
 */
function pairContact(a: Body, b: Body): number {
  if (a.shape === SHAPE_BOX && b.shape === SHAPE_BOX) return boxBoxSat(a, b);
  _v1.copy(b.pos).sub(a.pos);
  const sum = a.contact + b.contact;
  const d2 = _v1.lengthSq();
  if (d2 >= sum * sum || d2 < 1e-12) return 0;
  const d = Math.sqrt(d2);
  _v1.multiplyScalar(1 / d);
  return sum - d;
}

function makeBody(): Body {
  return {
    handle: 0,
    slot: 0,
    alive: false,
    written: false,
    mesh: null,
    instanced: null,
    instanceIndex: -1,
    frame: null,
    shape: SHAPE_BOX,
    half: new THREE.Vector3(0.1, 0.1, 0.1),
    radius: 0.1,
    halfHeight: 0,
    bound: 0.17,
    contact: 0.1,
    basis: new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]),
    pos: new THREE.Vector3(),
    prevPos: new THREE.Vector3(),
    quat: new THREE.Quaternion(),
    prevQuat: new THREE.Quaternion(),
    vel: new THREE.Vector3(),
    angVel: new THREE.Vector3(),
    mass: 1,
    invMass: 1,
    invInertia: 1,
    restitution: 0.2,
    friction: 0.6,
    lifetime: 0,
    age: 0,
    sleeping: false,
    sleepTimer: 0,
    restTimer: 0,
    restPos: new THREE.Vector3(),
    contactAge: 10,
    deepest: 0,
    group: Groups.DEBRIS,
    spawnIndex: 0,
  };
}

/**
 * Scalar stand-in for the inertia tensor. Debris tumbles convincingly without
 * the cost of rotating a full tensor into world space every contact.
 */
function inertiaScalar(body: Body, mass: number): number {
  if (body.shape === SHAPE_SPHERE) return Math.max(1e-6, 0.4 * mass * body.radius * body.radius);
  if (body.shape === SHAPE_CAPSULE) {
    const r = body.radius;
    const hl = body.halfHeight * 2;
    return Math.max(1e-6, mass * (0.25 * r * r + (hl * hl) / 12) + 0.4 * mass * r * r * 0.5);
  }
  const x = body.half.x * 2;
  const y = body.half.y * 2;
  const z = body.half.z * 2;
  const ix = (mass / 12) * (y * y + z * z);
  const iy = (mass / 12) * (x * x + z * z);
  const iz = (mass / 12) * (x * x + y * y);
  return Math.max(1e-6, (ix + iy + iz) / 3);
}

function cellKey3(x: number, y: number, z: number): number {
  return ((x & 0x3ff) << 20) | ((y & 0x3ff) << 10) | (z & 0x3ff);
}
