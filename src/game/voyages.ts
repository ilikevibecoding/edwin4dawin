import * as THREE from 'three';
import { Rng } from '../core/math';
import { IslandDef, IslandField } from '../world/islands';
import { LootDef, rollLoot } from './loot';

export interface DigSite {
  position: THREE.Vector3;
  loot: LootDef;
  /** 0..1 while the shovel is working. */
  digProgress: number;
  dug: boolean;
  /** Marker mesh shown once the player is close enough to spot the disturbed sand. */
  marker: THREE.Mesh;
}

const VOYAGE_TITLES = [
  'A Gold Hoarders Bounty',
  'Riches of the Drowned',
  "The Cartographer's Errand",
  'Buried by a Dead Man',
  'A Wager Won in Rum',
];

const markerMaterial = new THREE.MeshStandardMaterial({ color: 0x8a6a3a, roughness: 1 });

/**
 * A dig voyage: one island, a couple of buried caches, and a chart the player
 * reads to find them. Completing it means hauling the loot back to an outpost.
 */
export class Voyage {
  readonly title: string;
  readonly island: IslandDef;
  readonly sites: DigSite[] = [];
  readonly difficulty: number;
  /** Chests recovered from the ground. */
  recovered = 0;
  /** Chests actually sold at an outpost. */
  sold = 0;

  constructor(island: IslandDef, rng: Rng, islands: IslandField, scene: THREE.Scene, difficulty: number) {
    this.island = island;
    this.difficulty = difficulty;
    this.title = rng.pick(VOYAGE_TITLES);

    const siteCount = difficulty > 0.6 ? rng.int(2, 4) : rng.int(1, 3);
    for (let i = 0; i < siteCount; i++) {
      const spot = islands.randomLandPoint(island, rng, 1.8);
      const marker = new THREE.Mesh(new THREE.CircleGeometry(1.1, 14), markerMaterial);
      marker.rotation.x = -Math.PI / 2;
      marker.position.copy(spot).setY(spot.y + 0.06);
      marker.visible = false;
      scene.add(marker);
      this.sites.push({ position: spot, loot: rollLoot(rng, difficulty), digProgress: 0, dug: false, marker });
    }
  }

  get remaining(): number {
    return this.sites.filter((s) => !s.dug).length;
  }

  get complete(): boolean {
    return this.sites.every((s) => s.dug);
  }

  /** Nearest un-dug site within range of a world position. */
  siteNear(position: THREE.Vector3, range = 4.5): DigSite | null {
    let best: DigSite | null = null;
    let bestDist = range;
    for (const site of this.sites) {
      if (site.dug) continue;
      const d = Math.hypot(site.position.x - position.x, site.position.z - position.z);
      if (d < bestDist) {
        bestDist = d;
        best = site;
      }
    }
    return best;
  }

  /** Reveals scuffed sand when the player wanders close to a cache. */
  updateMarkers(playerPosition: THREE.Vector3): void {
    for (const site of this.sites) {
      const d = Math.hypot(site.position.x - playerPosition.x, site.position.z - playerPosition.z);
      site.marker.visible = !site.dug && d < 9;
      if (site.marker.visible) {
        const material = site.marker.material as THREE.MeshStandardMaterial;
        material.opacity = 1;
      }
    }
  }

  dispose(): void {
    for (const site of this.sites) {
      site.marker.removeFromParent();
      site.marker.geometry.dispose();
    }
  }

  static generate(islands: IslandField, scene: THREE.Scene, rng: Rng, avoidId?: string): Voyage {
    const candidates = islands.islands.filter((i) => i.kind === 'island' && i.id !== avoidId);
    const island = rng.pick(candidates);
    const difficulty = Math.min(1, island.radius / 190 + rng.float(-0.1, 0.2));
    return new Voyage(island, rng, islands, scene, difficulty);
  }
}
