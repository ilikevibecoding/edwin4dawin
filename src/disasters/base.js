// Base class + parameter schema helpers shared by all disasters.
// Rules for implementers:
//  - Everything that changes world/entity state happens in tick(t) and must only use this.rng (seeded),
//    the deterministic tick counter and the world state. Never Math.random / performance.now there.
//  - Visual-only work (meshes, particles, camera shake) happens in render(dt, alpha, camera) and may be random.
//  - World edits go through this.m.setBlock(x,y,z,id) (journaled, budgeted, bulk-relit) - never world.setBlock.
//  - Respect this.m.budget (edits/tick, debris) and this.preview (no state changes while previewing).
import { RNG, clamp } from '../rng.js';

export const PARAM_TYPES = ['number', 'select', 'boolean', 'position', 'angle'];

export class Disaster {
  static type = 'base';
  static label = 'Base';
  static description = '';
  static schema = []; // [{key,label,type,min,max,step,default,options,unit}]

  static defaults() {
    const p = {};
    for (const s of this.schema) p[s.key] = s.default;
    return p;
  }

  // Clamp/validate params against the schema (used by UI, manager and server).
  static clampParams(input = {}) {
    const p = this.defaults();
    for (const s of this.schema) {
      let v = input[s.key];
      if (v === undefined || v === null) continue;
      switch (s.type) {
        case 'number': case 'angle': v = Number(v); if (!Number.isFinite(v)) continue; p[s.key] = clamp(v, s.min, s.max); break;
        case 'boolean': p[s.key] = !!v; break;
        case 'select': if (s.options.includes(v)) p[s.key] = v; break;
        case 'position': if (Array.isArray(v) && v.length >= 2) p[s.key] = [clamp(Number(v[0]) || 0, -4000, 4000), clamp(Number(v[1]) || 0, -4000, 4000)]; break;
        default: p[s.key] = v;
      }
    }
    return p;
  }

  constructor(manager, params, seed) {
    this.m = manager;
    this.game = manager.game;
    this.world = manager.game.world;
    this.params = this.constructor.clampParams(params);
    this.seed = seed >>> 0;
    this.rng = new RNG(this.seed);
    this.tick = 0;          // simulation ticks since start (20/s)
    this.preview = false;   // preview mode: visuals only
    this.done = false;      // set when the disaster has fully ended (manager moves to 'finished')
    this.stopping = false;  // set by stop(): wind down effects, then set done
  }

  get elapsed() { return this.tick / 20; }
  get durationTicks() { return Math.round((this.params.duration || 30) * 20); }
  get progress() { return Math.min(1, this.tick / Math.max(1, this.durationTicks)); }

  // Human readable warnings shown before starting (e.g. estimated destruction)
  warnings() { return []; }

  begin() {}                       // called once when started (after params/seed set)
  beginPreview() {}                // called when preview mode starts
  simulate() {}                    // deterministic per-tick simulation (called by manager when running)
  render(dt, alpha, camera) {}     // per-frame visuals
  stop() { this.stopping = true; } // graceful wind down; set this.done when visuals have faded
  dispose() {}                     // remove meshes/sounds

  // helpers -------------------------------------------------------------------------------
  // deterministic random in [a,b)
  rand(a = 0, b = 1) { return a + this.rng.next() * (b - a); }
  // surface height at column (highest solid block y) or -1
  surfaceY(x, z) { return this.world.surfaceY(Math.floor(x), Math.floor(z)); }
}
