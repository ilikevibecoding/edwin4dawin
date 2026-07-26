import * as THREE from 'three';
import type { EngineContext, Subsystem } from '../core/Engine';
import type { CoverPoint, ILevel, SpawnPoint } from '../core/Contracts';
import type { MaterialLibrary } from '../render/textures/MaterialLibrary';

/**
 * STUB — replaced by the real level builder.
 *
 * Provides just enough of {@link ILevel} for the other systems to run: a
 * ground plane, a couple of blocks, and naive raycast-based queries.
 */
export class LevelSystem implements Subsystem, ILevel {
  readonly name = 'level';
  readonly order = 10;

  readonly root = new THREE.Group();
  readonly collidables: THREE.Object3D[] = [];
  readonly playerSpawn: SpawnPoint = { position: new THREE.Vector3(0, 1.7, 12), yaw: 0 };
  readonly enemySpawns: SpawnPoint[] = [];
  readonly coverPoints: CoverPoint[] = [];
  readonly bounds = new THREE.Box3(
    new THREE.Vector3(-100, -2, -100),
    new THREE.Vector3(100, 40, 100)
  );

  private raycaster = new THREE.Raycaster();

  init(ctx: EngineContext) {
    const materials = ctx.get<MaterialLibrary>('materials');
    this.root.name = 'Level';
    ctx.scene.add(this.root);

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), materials.get('asphalt'));
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    ground.userData.surface = 'concrete';
    ground.userData.collider = true;
    this.root.add(ground);
    this.collidables.push(ground);

    for (let i = 0; i < 6; i++) {
      const box = new THREE.Mesh(
        new THREE.BoxGeometry(3, 3, 3),
        materials.get('concrete_cast')
      );
      box.position.set(Math.cos(i) * 12, 1.5, Math.sin(i) * 12 - 8);
      box.castShadow = true;
      box.receiveShadow = true;
      box.userData.surface = 'concrete';
      box.userData.collider = true;
      this.root.add(box);
      this.collidables.push(box);
      this.enemySpawns.push({
        position: new THREE.Vector3(box.position.x, 0, box.position.z - 4),
        yaw: 0,
      });
    }

    ctx.provide('focusTargets', this.collidables);
  }

  sampleGround(x: number, z: number): number | null {
    this.raycaster.set(new THREE.Vector3(x, 60, z), DOWN);
    this.raycaster.far = 200;
    const hit = this.raycaster.intersectObjects(this.collidables, false)[0];
    return hit ? hit.point.y : null;
  }

  lineOfSight(from: THREE.Vector3, to: THREE.Vector3): boolean {
    const dir = TMP_A.copy(to).sub(from);
    const dist = dir.length();
    if (dist < 1e-4) return true;
    dir.divideScalar(dist);
    this.raycaster.set(from, dir);
    this.raycaster.far = dist - 0.05;
    return this.raycaster.intersectObjects(this.collidables, false).length === 0;
  }

  findCover(): CoverPoint | null {
    return null;
  }

  findPath(_from: THREE.Vector3, to: THREE.Vector3): THREE.Vector3[] | null {
    return [to.clone()];
  }

  isIndoors(): boolean {
    return false;
  }
}

const DOWN = new THREE.Vector3(0, -1, 0);
const TMP_A = new THREE.Vector3();
