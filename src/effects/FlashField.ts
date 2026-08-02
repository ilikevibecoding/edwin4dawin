import * as THREE from 'three';
import { flash } from '../core/mathx';
import type { MaterialLibrary } from '../assets/materials';

/**
 * Impact flashes: a bright additive sprite plus a short-lived point light so
 * nearby hull actually receives the bounce. A small pool of real lights is
 * recycled between events, keeping the shader permutation count stable.
 */

export interface FlashEvent {
  t0: number;
  position: THREE.Vector3;
  color: THREE.ColorRepresentation;
  /** Sprite radius in world units at peak. */
  size: number;
  /** Point-light intensity at peak; 0 to skip the light. */
  light: number;
  lightRange?: number;
  duration: number;
}

export class FlashField {
  readonly group = new THREE.Group();
  private sprites: THREE.Sprite[] = [];
  private lights: THREE.PointLight[] = [];
  private events: FlashEvent[] = [];
  private capacity: number;

  constructor(lib: MaterialLibrary, capacity = 14, lightCount = 3, name = 'flashes') {
    this.capacity = capacity;
    this.group.name = name;
    for (let i = 0; i < capacity; i++) {
      const s = new THREE.Sprite(lib.additiveSprite(0xffffff, lib.glowSprite));
      s.visible = false;
      s.frustumCulled = false;
      this.group.add(s);
      this.sprites.push(s);
    }
    for (let i = 0; i < lightCount; i++) {
      const l = new THREE.PointLight(0xffffff, 0, 400, 2);
      l.visible = false;
      this.group.add(l);
      this.lights.push(l);
    }
  }

  add(e: FlashEvent): void {
    this.events.push(e);
  }

  get count(): number {
    return this.events.length;
  }

  update(t: number): void {
    let s = 0;
    let l = 0;
    // Strongest flashes claim the real lights.
    const active: Array<{ e: FlashEvent; v: number }> = [];
    for (const e of this.events) {
      const dt = t - e.t0;
      if (dt < 0 || dt > e.duration) continue;
      const v = flash(dt / e.duration, 0.12);
      if (v <= 0.002) continue;
      active.push({ e, v });
    }
    active.sort((a, b) => b.v * b.e.light - a.v * a.e.light);

    for (const { e, v } of active) {
      if (s < this.capacity) {
        const sprite = this.sprites[s++];
        sprite.visible = true;
        sprite.position.copy(e.position);
        sprite.scale.setScalar(e.size * (0.45 + v * 0.85));
        const mat = sprite.material as THREE.SpriteMaterial;
        mat.color.set(e.color);
        mat.opacity = v;
      }
      if (e.light > 0 && l < this.lights.length) {
        const light = this.lights[l++];
        light.visible = true;
        light.position.copy(e.position);
        light.color.set(e.color);
        light.intensity = e.light * v;
        light.distance = e.lightRange ?? 400;
      }
    }
    for (let i = s; i < this.sprites.length; i++) this.sprites[i].visible = false;
    for (let i = l; i < this.lights.length; i++) {
      this.lights[i].visible = false;
      this.lights[i].intensity = 0;
    }
  }
}
