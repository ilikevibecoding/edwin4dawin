import * as THREE from 'three';

export interface Interactable {
  id: string;
  getPos(): THREE.Vector3;
  radius: number;
  prompt(): string;
  enabled(): boolean;
  interact(fromPos: THREE.Vector3): void;
}

export class InteractSystem {
  private items = new Map<string, Interactable>();

  add(item: Interactable): void {
    this.items.set(item.id, item);
  }

  remove(id: string): void {
    this.items.delete(id);
  }

  clear(): void {
    this.items.clear();
  }

  /** nearest enabled interactable within reach that the player roughly faces */
  nearest(eye: THREE.Vector3, forward: THREE.Vector3, maxDist = 2.2): Interactable | null {
    let best: Interactable | null = null;
    let bestScore = Infinity;
    const to = new THREE.Vector3();
    for (const item of this.items.values()) {
      if (!item.enabled()) continue;
      const p = item.getPos();
      to.copy(p).sub(eye);
      const dist = to.length();
      if (dist > maxDist + item.radius) continue;
      to.normalize();
      const dot = to.dot(forward);
      if (dist > 0.8 && dot < 0.35) continue;
      const score = dist * (1.6 - dot);
      if (score < bestScore) {
        bestScore = score;
        best = item;
      }
    }
    return best;
  }

  all(): Interactable[] {
    return [...this.items.values()];
  }
}
