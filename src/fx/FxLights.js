import * as THREE from 'three';
import { LAYER } from '../rendering/RenderSystem.js';

/**
 * Small pool of permanent point lights (intensity 0 when idle) for muzzle flashes, sparks and explosions.
 * Keeping the light count constant avoids shader recompiles when a flash appears; lights are enabled on
 * the view-model layer too so the rifle/hands pick up flash and explosion light.
 */
export class FxLights {
  constructor(game, count = 5) {
    this.game = game;
    this.lights = [];
    for (let i = 0; i < count; i++) {
      const l = new THREE.PointLight(0xffffff, 0, 10, 2);
      l.name = `FxLight${i}`;
      l.layers.enable(LAYER.VIEWMODEL);
      l.castShadow = false;
      game.scene.add(l);
      this.lights.push({ light: l, time: 0, duration: 0, intensity: 0, hold: 0, priority: 0, flicker: 0, seed: 0 });
    }
  }

  /**
   * Flash a light. `hold` seconds at full intensity, then decays to zero over `duration` (quadratic).
   * Higher `priority` slots are never stolen by lower ones while active.
   */
  flash(position, color, intensity, distance, duration, { hold = 0, priority = 0, flicker = 0 } = {}) {
    let slot = null;
    let lowest = null;
    for (const s of this.lights) {
      if (s.time <= 0) {
        slot = s;
        break;
      }
      if (s.priority <= priority && (!lowest || s.time / s.duration < lowest.time / lowest.duration)) lowest = s;
    }
    slot = slot || lowest;
    if (!slot) return null;
    slot.light.position.copy(position);
    slot.light.color.set(color);
    slot.light.intensity = intensity;
    slot.light.distance = distance;
    slot.intensity = intensity;
    slot.time = duration + hold;
    slot.duration = duration;
    slot.hold = hold;
    slot.priority = priority;
    slot.flicker = flicker;
    slot.seed = Math.random() * 100;
    return slot;
  }

  update(dt) {
    if (dt <= 0) return;
    for (const s of this.lights) {
      if (s.time <= 0) continue;
      s.time -= dt;
      if (s.time <= 0) {
        s.time = 0;
        s.light.intensity = 0;
        continue;
      }
      const t = Math.min(1, s.time / s.duration);
      let k = t * t;
      if (s.flicker > 0) k *= 1 - s.flicker * 0.5 * (0.5 + 0.5 * Math.sin((s.seed + s.time) * 173.0));
      s.light.intensity = s.intensity * k;
    }
  }
}
