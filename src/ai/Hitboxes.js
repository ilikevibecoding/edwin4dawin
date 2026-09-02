import * as THREE from 'three';
import { GROUP, groups } from '../core/Physics.js';

const _q = new THREE.Quaternion();
const _v = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

/**
 * Bone-following hitboxes: one kinematic position-based rigid body + collider per body part, moved to the
 * skeleton every frame. Membership GROUP.ENEMY / filter ALL so bullet raycasts (filter ...|ENEMY) hit them
 * while nothing collides with them physically (the player/debris filters exclude ENEMY).
 *
 * User data: { type: 'enemy', entity, part: 'head'|'body'|'limb', surface: 'flesh' }.
 */
export class Hitboxes {
  constructor(physics, entity, anchors) {
    this.physics = physics;
    this.entity = entity;
    this.items = [];
    const R = physics.RAPIER;
    for (const a of anchors) {
      const bodyDesc = R.RigidBodyDesc.kinematicPositionBased().setTranslation(a.a.x, a.a.y, a.a.z);
      const body = physics.world.createRigidBody(bodyDesc);
      let desc;
      if (a.kind === 'sphere') desc = R.ColliderDesc.ball(a.r);
      else desc = R.ColliderDesc.capsule(Math.max(0.01, a.a.distanceTo(a.b) * 0.5), a.r);
      desc.setCollisionGroups(groups(GROUP.ENEMY, GROUP.ALL)).setSensor(false);
      const collider = physics.world.createCollider(desc, body);
      physics.setUserData(collider, { type: 'enemy', entity, part: a.part, surface: 'flesh' });
      this.items.push({ body, collider, part: a.part, kind: a.kind, r: a.r, halfHeight: a.kind === 'capsule' ? a.a.distanceTo(a.b) * 0.5 : 0 });
    }
    this.sync(anchors, true);
  }

  /** Move colliders to the anchors. `teleport` sets the pose immediately (first frame), otherwise next-step. */
  sync(anchors, teleport = false) {
    for (let i = 0; i < this.items.length && i < anchors.length; i++) {
      const it = this.items[i];
      const a = anchors[i];
      let px;
      let py;
      let pz;
      if (a.kind === 'sphere') {
        px = a.a.x;
        py = a.a.y;
        pz = a.a.z;
        _q.identity();
      } else {
        px = (a.a.x + a.b.x) * 0.5;
        py = (a.a.y + a.b.y) * 0.5;
        pz = (a.a.z + a.b.z) * 0.5;
        _v.subVectors(a.b, a.a);
        const len = _v.length();
        if (len > 1e-4) {
          _v.multiplyScalar(1 / len);
          _q.setFromUnitVectors(UP, _v);
          const hh = len * 0.5;
          if (Math.abs(hh - it.halfHeight) > 0.01 && typeof it.collider.setHalfHeight === 'function') {
            it.collider.setHalfHeight(hh);
            it.halfHeight = hh;
          }
        } else _q.identity();
      }
      if (!Number.isFinite(px + py + pz)) continue;
      if (teleport) {
        it.body.setTranslation({ x: px, y: py, z: pz }, false);
        it.body.setRotation({ x: _q.x, y: _q.y, z: _q.z, w: _q.w }, false);
      } else {
        it.body.setNextKinematicTranslation({ x: px, y: py, z: pz });
        it.body.setNextKinematicRotation({ x: _q.x, y: _q.y, z: _q.z, w: _q.w });
      }
    }
  }

  remove() {
    for (const it of this.items) {
      this.physics.removeCollider(it.collider);
      this.physics.world.removeRigidBody(it.body);
    }
    this.items.length = 0;
  }
}
