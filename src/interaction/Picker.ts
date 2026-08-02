import * as THREE from 'three';

/**
 * Selection and hover highlighting for Explore mode.
 *
 * Interactive subjects register a root object plus an id. Hover applies a
 * subtle emissive lift to the subject's materials (restored exactly on exit),
 * and clicking promotes it to the selection.
 */

export interface Selectable {
  object: THREE.Object3D;
  id: string;
}

interface MaterialSnapshot {
  material: THREE.MeshStandardMaterial;
  emissive: THREE.Color;
  intensity: number;
}

export class Picker {
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2(-2, -2);
  private candidates: Selectable[] = [];
  private hovered: Selectable | null = null;
  private selected: Selectable | null = null;
  private snapshots: MaterialSnapshot[] = [];
  private element: HTMLElement;
  private enabled = false;
  private pointerDownAt = new THREE.Vector2();

  onSelect: ((selectable: Selectable | null) => void) | null = null;

  constructor(element: HTMLElement) {
    this.element = element;
    element.addEventListener('pointermove', this.onPointerMove);
    element.addEventListener('pointerdown', this.onPointerDown);
    element.addEventListener('pointerup', this.onPointerUp);
    element.addEventListener('pointerleave', () => this.pointer.set(-2, -2));
  }

  setCandidates(list: Selectable[]): void {
    this.candidates = list;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.clearHover();
      this.pointer.set(-2, -2);
    }
  }

  get current(): Selectable | null {
    return this.selected;
  }

  select(selectable: Selectable | null): void {
    this.selected = selectable;
    this.onSelect?.(selectable);
  }

  private onPointerMove = (e: PointerEvent): void => {
    const rect = this.element.getBoundingClientRect();
    this.pointer.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    );
  };

  private onPointerDown = (e: PointerEvent): void => {
    this.pointerDownAt.set(e.clientX, e.clientY);
  };

  private onPointerUp = (e: PointerEvent): void => {
    if (!this.enabled || e.button !== 0) return;
    // Ignore drags - only a clean click changes the selection.
    if (this.pointerDownAt.distanceTo(new THREE.Vector2(e.clientX, e.clientY)) > 6) return;
    this.select(this.hovered);
  };

  update(camera: THREE.Camera): void {
    if (!this.enabled || this.pointer.x < -1.5) {
      this.clearHover();
      return;
    }
    this.raycaster.setFromCamera(this.pointer, camera);
    // Large scenes need a generous far value; the raycaster inherits the camera.
    let best: Selectable | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const candidate of this.candidates) {
      if (!candidate.object.visible) continue;
      const hits = this.raycaster.intersectObject(candidate.object, true);
      if (hits.length && hits[0].distance < bestDistance) {
        bestDistance = hits[0].distance;
        best = candidate;
      }
    }
    if (best !== this.hovered) {
      this.clearHover();
      this.hovered = best;
      if (best) this.applyHover(best);
    }
    this.element.style.cursor = best ? 'pointer' : '';
  }

  private applyHover(selectable: Selectable): void {
    selectable.object.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
      const list = Array.isArray(mat) ? mat : mat ? [mat] : [];
      for (const m of list) {
        if (!(m instanceof THREE.MeshStandardMaterial)) continue;
        if (this.snapshots.some((s) => s.material === m)) continue;
        this.snapshots.push({ material: m, emissive: m.emissive.clone(), intensity: m.emissiveIntensity });
        m.emissive.setRGB(
          m.emissive.r + 0.11,
          m.emissive.g + 0.15,
          m.emissive.b + 0.2,
        );
        m.emissiveIntensity = Math.max(m.emissiveIntensity, 1);
      }
    });
  }

  private clearHover(): void {
    for (const s of this.snapshots) {
      s.material.emissive.copy(s.emissive);
      s.material.emissiveIntensity = s.intensity;
    }
    this.snapshots.length = 0;
    this.hovered = null;
    this.element.style.cursor = '';
  }

  dispose(): void {
    this.clearHover();
  }
}
