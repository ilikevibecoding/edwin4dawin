/** PLACEHOLDER — replaced by the Rapier-backed physics implementation. */
import * as THREE from 'three';
import type { EngineContext, System } from '../core/System';
import { ORDER } from '../core/System';
import type {
  CharacterControllerHandle,
  PhysicsRaycastHit,
  PhysicsSystem,
  PhysicsUserData,
  RagdollHandle,
  RigidBodyHandle,
} from '../core/Contracts';

export class PhysicsSystemImpl implements PhysicsSystem, System {
  readonly name = 'physics' as const;
  readonly order = ORDER.PHYSICS;
  ready = false;
  debugRenderEnabled = false;

  init(_ctx: EngineContext): void {
    this.ready = true;
  }

  raycast(): PhysicsRaycastHit | null {
    return null;
  }
  spherecast(): PhysicsRaycastHit | null {
    return null;
  }
  lineOfSight(): boolean {
    return true;
  }
  addStaticMesh(): void {}
  addStaticBox(): void {}

  createCharacter(position: THREE.Vector3): CharacterControllerHandle {
    const pos = position.clone();
    return {
      move: (d) => {
        pos.add(d);
        if (pos.y < 0) pos.y = 0;
        return d;
      },
      grounded: true,
      groundNormal: new THREE.Vector3(0, 1, 0),
      groundSurface: 'concrete',
      position: pos,
      setPosition: (p) => pos.copy(p),
      setHeight: () => true,
      isBlockedAbove: () => false,
      destroy: () => {},
    };
  }

  createRigidBody(object3D: THREE.Object3D): RigidBodyHandle {
    return {
      object3D,
      applyImpulse: () => {},
      applyTorqueImpulse: () => {},
      setVelocity: () => {},
      getVelocity: (out) => out.set(0, 0, 0),
      setPosition: () => {},
      sleep: () => {},
      wake: () => {},
      destroy: () => {},
    };
  }

  createRagdoll(): RagdollHandle | null {
    return null;
  }
  applyRadialImpulse(): void {}
  setDebugRender(on: boolean): void {
    this.debugRenderEnabled = on;
  }
  dispose(): void {}
}

export type { PhysicsUserData };
