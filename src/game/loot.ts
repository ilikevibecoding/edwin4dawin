import * as THREE from 'three';
import { chestGeometry } from '../world/props';
import { IslandField } from '../world/islands';
import { Ocean } from '../world/ocean';
import { Ship } from '../ship/ship';
import { clamp01, damp, Rng } from '../core/math';

export type LootKind = 'castaway' | 'seafarer' | 'marauder' | 'captain' | 'skull';

export interface LootDef {
  kind: LootKind;
  name: string;
  value: number;
  gold: boolean;
}

export const LOOT_TABLE: Record<LootKind, LootDef> = {
  castaway: { kind: 'castaway', name: "Castaway's Chest", value: 260, gold: false },
  seafarer: { kind: 'seafarer', name: "Seafarer's Chest", value: 520, gold: false },
  marauder: { kind: 'marauder', name: "Marauder's Chest", value: 880, gold: true },
  captain: { kind: 'captain', name: "Captain's Chest", value: 1450, gold: true },
  skull: { kind: 'skull', name: 'Foul Skull', value: 640, gold: true },
};

type Attachment =
  | { type: 'world' }
  | { type: 'carried' }
  | { type: 'ship'; ship: Ship; local: THREE.Vector3; rotation: number };

const chestMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.72, metalness: 0.12 });

/**
 * A piece of treasure. Loot can lie on an island, bob in the sea, ride in a
 * ship's hold, or be carried in the player's arms - the attachment decides which
 * transform drives it each frame.
 */
export class Chest {
  readonly def: LootDef;
  readonly mesh: THREE.Mesh;
  /** World position when not attached to anything. */
  position = new THREE.Vector3();
  rotation = 0;
  attachment: Attachment = { type: 'world' };
  sold = false;

  private bobPhase = Math.random() * 6.28;
  private velocityY = 0;

  constructor(def: LootDef, position: THREE.Vector3, private scene: THREE.Scene) {
    this.def = def;
    this.mesh = new THREE.Mesh(chestGeometry(def.gold), chestMaterial);
    this.mesh.castShadow = true;
    this.mesh.position.copy(position);
    this.position.copy(position);
    this.rotation = Math.random() * Math.PI * 2;
    scene.add(this.mesh);
  }

  get worldPosition(): THREE.Vector3 {
    return this.mesh.getWorldPosition(new THREE.Vector3());
  }

  pickUp(): void {
    this.detach();
    this.attachment = { type: 'carried' };
  }

  /** Drops the chest at a world position, parenting it to a ship if it lands on one. */
  drop(world: THREE.Vector3, ships: Ship[]): void {
    for (const ship of ships) {
      if (ship.destroyed || ship.sinking) continue;
      const local = ship.worldToLocal(world.clone());
      if (ship.containsLocal(local)) {
        this.attachment = { type: 'ship', ship, local, rotation: this.rotation };
        ship.group.add(this.mesh);
        this.mesh.position.copy(local);
        return;
      }
    }
    this.detach();
    this.attachment = { type: 'world' };
    this.position.copy(world);
    this.velocityY = 0;
  }

  private detach(): void {
    if (this.mesh.parent && this.mesh.parent !== this.scene) {
      const world = this.worldPosition;
      this.scene.add(this.mesh);
      this.mesh.position.copy(world);
      this.position.copy(world);
    }
  }


  update(dt: number, ctx: { ocean: Ocean; islands: IslandField; carrier?: THREE.Vector3; carrierYaw?: number }): void {
    switch (this.attachment.type) {
      case 'carried': {
        if (!ctx.carrier) return;
        this.mesh.position.copy(ctx.carrier);
        this.mesh.rotation.set(0, -(ctx.carrierYaw ?? 0), 0);
        break;
      }
      case 'ship': {
        const { ship, local } = this.attachment;
        if (ship.destroyed) {
          // Go down with the ship, then float free.
          this.drop(this.worldPosition, []);
          return;
        }
        // Slide gently to rest on the hold floor.
        this.mesh.position.copy(local);
        this.mesh.rotation.y = this.attachment.rotation;
        break;
      }
      default: {
        const terrain = ctx.islands.heightAt(this.position.x, this.position.z);
        const surface = ctx.ocean.waterHeight(this.position.x, this.position.z);
        if (terrain > surface - 0.2) {
          // Resting on dry land or in the shallows.
          this.position.y = damp(this.position.y, terrain, 8, dt);
          this.velocityY = 0;
        } else {
          // Floating: bob on the swell.
          this.bobPhase += dt * 1.6;
          const target = surface - 0.18 + Math.sin(this.bobPhase) * 0.06;
          this.velocityY += (target - this.position.y) * 9 * dt;
          this.velocityY *= 1 - clamp01(dt * 3.2);
          this.position.y += this.velocityY * dt;
          const flow = ctx.ocean.waterNormal(this.position.x, this.position.z);
          this.position.x += flow.x * dt * 0.6;
          this.position.z += flow.z * dt * 0.6;
          this.mesh.rotation.z = Math.sin(this.bobPhase * 0.8) * 0.1;
          this.mesh.rotation.x = Math.cos(this.bobPhase * 0.7) * 0.08;
        }
        this.mesh.position.copy(this.position);
        this.mesh.rotation.y = this.rotation;
        break;
      }
    }
  }

  dispose(): void {
    this.mesh.removeFromParent();
    this.mesh.geometry.dispose();
  }
}

/** Picks loot appropriate to a voyage's difficulty. */
export function rollLoot(rng: Rng, difficulty: number): LootDef {
  const pool: LootKind[] =
    difficulty > 0.75
      ? ['captain', 'marauder', 'skull']
      : difficulty > 0.4
        ? ['marauder', 'seafarer', 'skull']
        : ['castaway', 'seafarer'];
  return LOOT_TABLE[rng.pick(pool)];
}
