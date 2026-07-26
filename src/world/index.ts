/** PLACEHOLDER — replaced by the full art-directed level. */
import * as THREE from 'three';
import type { EngineContext, System } from '../core/System';
import { ORDER } from '../core/System';
import type { CoverPoint, NavGrid, SpawnPoint, WorldSystem } from '../core/Contracts';
import type { Team } from '../core/GameTypes';

class FlatNavGrid implements NavGrid {
  readonly originX = -64;
  readonly originZ = -64;
  readonly cellSize = 1;
  readonly width = 128;
  readonly depth = 128;
  readonly cost = new Float32Array(128 * 128).fill(1);
  readonly height = new Float32Array(128 * 128);
  worldToCell(x: number, z: number, out: { x: number; z: number }) {
    out.x = Math.floor((x - this.originX) / this.cellSize);
    out.z = Math.floor((z - this.originZ) / this.cellSize);
    return out;
  }
  cellToWorld(cx: number, cz: number, out: THREE.Vector3) {
    return out.set(
      this.originX + (cx + 0.5) * this.cellSize,
      0,
      this.originZ + (cz + 0.5) * this.cellSize,
    );
  }
  isWalkable(cx: number, cz: number): boolean {
    return cx >= 0 && cz >= 0 && cx < this.width && cz < this.depth;
  }
}

export class WorldSystemImpl implements WorldSystem, System {
  readonly name = 'world' as const;
  readonly order = ORDER.WORLD;
  readonly dependencies = ['procgen', 'physics'] as const;
  readonly root = new THREE.Group();
  readonly bounds = new THREE.Box3(
    new THREE.Vector3(-64, -2, -64),
    new THREE.Vector3(64, 40, 64),
  );
  readonly sunDirection = new THREE.Vector3(0.5, 0.7, 0.35).normalize();
  private readonly nav = new FlatNavGrid();

  init(ctx: EngineContext): void {
    this.root.name = 'World';
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(128, 128),
      new THREE.MeshStandardMaterial({ color: 0x5a5348, roughness: 0.95 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.root.add(ground);
    ctx.scene.add(this.root);
  }

  getSpawnPoints(team: Team): readonly SpawnPoint[] {
    return [{ position: new THREE.Vector3(0, 0, 0), yaw: 0, team, priority: 1 }];
  }
  getCoverPoints(): readonly CoverPoint[] {
    return [];
  }
  getNavGrid(): NavGrid {
    return this.nav;
  }
  sampleGround(): number | null {
    return 0;
  }
  damageAt(): void {}
  getLandmarks(): ReadonlyMap<string, THREE.Vector3> {
    return new Map();
  }
  dispose(): void {}
}
