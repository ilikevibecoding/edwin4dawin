import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';

/**
 * Thin wrapper over Rapier (WASM) providing the operations the game needs:
 *  - static world colliders (trimesh from any Mesh, boxes, cylinders)
 *  - dynamic rigid bodies (casings, debris, grenades) with a pooled cap
 *  - kinematic character controller for the player / AI
 *  - raycasts with user data lookup (surface type, entity reference)
 *
 * Collision groups (membership bits):
 */
export const GROUP = {
  WORLD: 1 << 0,
  PLAYER: 1 << 1,
  ENEMY: 1 << 2,
  DEBRIS: 1 << 3,
  TRIGGER: 1 << 4,
  ALL: 0xffff,
};

/** Build Rapier interaction groups value: (membership << 16) | filter. */
export function groups(membership, filter = GROUP.ALL) {
  return ((membership & 0xffff) << 16) | (filter & 0xffff);
}

const _q = new THREE.Quaternion();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const _m = new THREE.Matrix4();

export class Physics {
  static async create() {
    await RAPIER.init();
    return new Physics();
  }

  constructor() {
    this.RAPIER = RAPIER;
    this.world = new RAPIER.World({ x: 0, y: -19.6, z: 0 });
    this.world.timestep = 1 / 60;
    this.fixedStep = 1 / 60;
    this._accumulator = 0;
    this.maxSubSteps = 4;
    this.eventQueue = new RAPIER.EventQueue(true);
    this._userData = new Map(); // collider handle -> data
    this._bodies = new Set(); // dynamic body wrappers we manage
    this.onCollision = null; // (handle1, handle2, started) => void
  }

  setUserData(collider, data) {
    this._userData.set(collider.handle, data);
  }
  getUserData(collider) {
    return this._userData.get(collider.handle);
  }
  getUserDataByHandle(handle) {
    return this._userData.get(handle);
  }

  /**
   * Add a static trimesh collider for a Mesh (uses world transform). `data` is stored as user data
   * (e.g. { surface: 'stone' }). Returns the collider.
   */
  addStaticMesh(mesh, data = {}, { friction = 0.8, restitution = 0.05 } = {}) {
    mesh.updateWorldMatrix(true, false);
    const geom = mesh.geometry;
    const posAttr = geom.attributes.position;
    const vertices = new Float32Array(posAttr.count * 3);
    _m.copy(mesh.matrixWorld);
    for (let i = 0; i < posAttr.count; i++) {
      _p.fromBufferAttribute(posAttr, i).applyMatrix4(_m);
      vertices[i * 3] = _p.x;
      vertices[i * 3 + 1] = _p.y;
      vertices[i * 3 + 2] = _p.z;
    }
    let indices;
    if (geom.index) {
      indices = new Uint32Array(geom.index.array);
    } else {
      indices = new Uint32Array(posAttr.count);
      for (let i = 0; i < posAttr.count; i++) indices[i] = i;
    }
    const desc = RAPIER.ColliderDesc.trimesh(vertices, indices)
      .setFriction(friction)
      .setRestitution(restitution)
      .setCollisionGroups(groups(GROUP.WORLD));
    const collider = this.world.createCollider(desc);
    this.setUserData(collider, { type: 'world', surface: 'stone', ...data, object: mesh });
    return collider;
  }

  /** Static box: position (Vector3), halfExtents (Vector3), quaternion (optional). */
  addStaticBox(position, halfExtents, quaternion = null, data = {}, { friction = 0.8 } = {}) {
    const desc = RAPIER.ColliderDesc.cuboid(halfExtents.x, halfExtents.y, halfExtents.z)
      .setTranslation(position.x, position.y, position.z)
      .setFriction(friction)
      .setCollisionGroups(groups(GROUP.WORLD));
    if (quaternion) desc.setRotation({ x: quaternion.x, y: quaternion.y, z: quaternion.z, w: quaternion.w });
    const collider = this.world.createCollider(desc);
    this.setUserData(collider, { type: 'world', surface: 'stone', ...data });
    return collider;
  }

  /** Static cylinder (Y axis). */
  addStaticCylinder(position, radius, halfHeight, data = {}) {
    const desc = RAPIER.ColliderDesc.cylinder(halfHeight, radius)
      .setTranslation(position.x, position.y, position.z)
      .setCollisionGroups(groups(GROUP.WORLD));
    const collider = this.world.createCollider(desc);
    this.setUserData(collider, { type: 'world', surface: 'stone', ...data });
    return collider;
  }

  /** Static box collider from a Mesh's world-space AABB (cheap approximation for props). */
  addStaticBoxFromObject(object, data = {}) {
    const box = new THREE.Box3().setFromObject(object);
    if (box.isEmpty()) return null;
    const size = box.getSize(new THREE.Vector3()).multiplyScalar(0.5);
    const center = box.getCenter(new THREE.Vector3());
    return this.addStaticBox(center, size, null, { object, ...data });
  }

  /**
   * Dynamic rigid body. shape: { type:'box', hx,hy,hz } | { type:'sphere', r } | { type:'capsule', halfHeight, r }
   * | { type:'cylinder', halfHeight, r }. Returns wrapper { body, collider, object?, sync() }.
   */
  addDynamicBody({
    position,
    quaternion = null,
    shape,
    mass = 1,
    friction = 0.6,
    restitution = 0.3,
    linvel = null,
    angvel = null,
    linearDamping = 0.05,
    angularDamping = 0.05,
    ccd = false,
    membership = GROUP.DEBRIS,
    filter = GROUP.WORLD | GROUP.DEBRIS,
    object = null,
    data = {},
  }) {
    const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(position.x, position.y, position.z)
      .setLinearDamping(linearDamping)
      .setAngularDamping(angularDamping)
      .setCcdEnabled(ccd);
    if (quaternion) bodyDesc.setRotation({ x: quaternion.x, y: quaternion.y, z: quaternion.z, w: quaternion.w });
    if (linvel) bodyDesc.setLinvel(linvel.x, linvel.y, linvel.z);
    if (angvel) bodyDesc.setAngvel({ x: angvel.x, y: angvel.y, z: angvel.z });
    const body = this.world.createRigidBody(bodyDesc);
    let colDesc;
    switch (shape.type) {
      case 'sphere': colDesc = RAPIER.ColliderDesc.ball(shape.r); break;
      case 'capsule': colDesc = RAPIER.ColliderDesc.capsule(shape.halfHeight, shape.r); break;
      case 'cylinder': colDesc = RAPIER.ColliderDesc.cylinder(shape.halfHeight, shape.r); break;
      default: colDesc = RAPIER.ColliderDesc.cuboid(shape.hx, shape.hy, shape.hz);
    }
    colDesc.setMass(mass).setFriction(friction).setRestitution(restitution).setCollisionGroups(groups(membership, filter));
    const collider = this.world.createCollider(colDesc, body);
    this.setUserData(collider, { type: 'dynamic', surface: 'metal', ...data, object });
    const wrapper = {
      body,
      collider,
      object,
      alive: true,
      sync: () => {
        if (!object || !wrapper.alive) return;
        const t = body.translation();
        const r = body.rotation();
        object.position.set(t.x, t.y, t.z);
        object.quaternion.set(r.x, r.y, r.z, r.w);
      },
      remove: () => this.removeBody(wrapper),
    };
    this._bodies.add(wrapper);
    return wrapper;
  }

  removeBody(wrapper) {
    if (!wrapper.alive) return;
    wrapper.alive = false;
    this._userData.delete(wrapper.collider.handle);
    this.world.removeRigidBody(wrapper.body);
    this._bodies.delete(wrapper);
  }

  removeCollider(collider) {
    this._userData.delete(collider.handle);
    this.world.removeCollider(collider, true);
  }

  /**
   * Kinematic character (capsule). Returns { body, collider, controller, move(desired: Vector3, dt) -> Vector3,
   * grounded, setPosition(v), getPosition(out) }.
   */
  createCharacter({ position, radius = 0.35, halfHeight = 0.55, membership = GROUP.PLAYER, filter = GROUP.WORLD, data = {} }) {
    const bodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(position.x, position.y, position.z);
    const body = this.world.createRigidBody(bodyDesc);
    const colDesc = RAPIER.ColliderDesc.capsule(halfHeight, radius).setCollisionGroups(groups(membership, filter));
    const collider = this.world.createCollider(colDesc, body);
    this.setUserData(collider, { type: 'character', surface: 'flesh', ...data });
    const controller = this.world.createCharacterController(0.02);
    controller.setUp({ x: 0, y: 1, z: 0 });
    controller.setMaxSlopeClimbAngle((50 * Math.PI) / 180);
    controller.setMinSlopeSlideAngle((60 * Math.PI) / 180);
    controller.enableAutostep(0.45, 0.25, true);
    controller.enableSnapToGround(0.3);
    controller.setApplyImpulsesToDynamicBodies(true);
    const filterGroups = groups(membership, filter);
    const out = new THREE.Vector3();
    const wrapper = {
      body,
      collider,
      controller,
      grounded: false,
      radius,
      halfHeight,
      move: (desired) => {
        controller.computeColliderMovement(collider, { x: desired.x, y: desired.y, z: desired.z }, RAPIER.QueryFilterFlags.EXCLUDE_SENSORS, filterGroups);
        const mv = controller.computedMovement();
        wrapper.grounded = controller.computedGrounded();
        const t = body.translation();
        body.setNextKinematicTranslation({ x: t.x + mv.x, y: t.y + mv.y, z: t.z + mv.z });
        return out.set(mv.x, mv.y, mv.z);
      },
      setPosition: (v) => body.setNextKinematicTranslation({ x: v.x, y: v.y, z: v.z }),
      teleport: (v) => body.setTranslation({ x: v.x, y: v.y, z: v.z }, true),
      getPosition: (target = new THREE.Vector3()) => {
        const t = body.translation();
        return target.set(t.x, t.y, t.z);
      },
      remove: () => {
        this._userData.delete(collider.handle);
        this.world.removeCharacterController(controller);
        this.world.removeRigidBody(body);
      },
    };
    return wrapper;
  }

  /**
   * Raycast. Returns null or { point: Vector3, normal: Vector3, distance, collider, data }.
   * `filter` is a Rapier interaction-groups value (use groups()). `exclude` is a collider to skip.
   */
  raycast(origin, direction, maxDistance = 1000, { filter = groups(GROUP.ALL, GROUP.ALL), exclude = null, excludeBody = null, solid = true } = {}) {
    const ray = new RAPIER.Ray({ x: origin.x, y: origin.y, z: origin.z }, { x: direction.x, y: direction.y, z: direction.z });
    const hit = this.world.castRayAndGetNormal(ray, maxDistance, solid, RAPIER.QueryFilterFlags.EXCLUDE_SENSORS, filter, exclude || undefined, excludeBody || undefined);
    if (!hit) return null;
    const t = hit.timeOfImpact ?? hit.toi;
    const p = ray.pointAt(t);
    return {
      point: new THREE.Vector3(p.x, p.y, p.z),
      normal: new THREE.Vector3(hit.normal.x, hit.normal.y, hit.normal.z),
      distance: t,
      collider: hit.collider,
      data: this.getUserData(hit.collider) || null,
    };
  }

  /** Iterate colliders intersecting a sphere; cb(collider, data). */
  overlapSphere(center, radius, cb, filter = groups(GROUP.ALL, GROUP.ALL)) {
    const shape = new RAPIER.Ball(radius);
    this.world.intersectionsWithShape({ x: center.x, y: center.y, z: center.z }, { x: 0, y: 0, z: 0, w: 1 }, shape, (collider) => {
      cb(collider, this.getUserData(collider));
      return true;
    }, RAPIER.QueryFilterFlags.EXCLUDE_SENSORS, filter);
  }

  /** Fixed-timestep stepping with accumulator; syncs managed dynamic bodies to their meshes. */
  step(dt) {
    this._accumulator += Math.min(dt, 0.1);
    let steps = 0;
    while (this._accumulator >= this.fixedStep && steps < this.maxSubSteps) {
      this.world.step(this.eventQueue);
      this._accumulator -= this.fixedStep;
      steps++;
      if (this.onCollision) {
        this.eventQueue.drainCollisionEvents((h1, h2, started) => this.onCollision(h1, h2, started));
      } else {
        this.eventQueue.drainCollisionEvents(() => {});
      }
    }
    if (steps === this.maxSubSteps) this._accumulator = 0;
    for (const w of this._bodies) w.sync();
    return steps;
  }

  get dynamicBodyCount() {
    return this._bodies.size;
  }
}
