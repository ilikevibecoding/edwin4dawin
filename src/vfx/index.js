import * as THREE from 'three';
import { bus, EV } from '../core/events.js';
import { settings } from '../core/settings.js';
import { reg, OWNERS } from '../core/assets.js';
import { C } from '../art/palette.js';
import { collision } from '../map/collision.js';
import { ParticleEngine } from './particles.js';
import { DecalPool, DECAL_KINDS, decalKindForSurface } from './decals.js';

/**
 * VfxSystem — particle, decal, light-flash and screen-transition effects.
 * Owner: Fable 4.
 *
 * The lead calls the public methods directly (they mirror the combat events).
 * This system self-subscribes ONLY to:
 *   EV.GLASS_BROKEN      -> glassShatter(payload)   (deduped by payload ref,
 *                           so a direct call with the same payload is safe)
 *   EV.MISSION_RESET     -> reset()
 *   EV.SETTINGS_CHANGED  -> particle/decal budgets, reducedBlood
 *   EV.RESIZE            -> point-sprite projection scale
 * flashBang / smokeVolume are NOT auto-subscribed because their return values
 * (handle / timing) are needed by the caller.
 */

const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();

function col(hex) {
  return { r: ((hex >> 16) & 255) / 255, g: ((hex >> 8) & 255) / 255, b: (hex & 255) / 255 };
}

function groundBelow(x, z, y) {
  try {
    const g = collision.groundAt(x, z, y + 0.05);
    return g ? g.y : 0;
  } catch {
    return 0;
  }
}

/* Per-family muzzle flash grammar — each family must read differently. */
const MUZZLE = {
  pistol: { core: 0.14, petals: 3, speed: 7, smoke: 1, ttl: 0.04, color: 0xffd9a0 },
  smg: { core: 0.16, petals: 4, speed: 9, smoke: 1, ttl: 0.04, color: 0xffce8c },
  rifle: { core: 0.22, petals: 5, speed: 12, smoke: 2, ttl: 0.05, color: 0xffc474 },
  shotgun: { core: 0.34, petals: 8, speed: 10, smoke: 3, ttl: 0.06, color: 0xffb85e },
  dmr: { core: 0.3, petals: 6, speed: 16, smoke: 2, ttl: 0.07, color: 0xffd08a },
};

const SHELL = {
  pistol: { size: 0.02, color: 0xc9a24a, rest: 0.34, ttl: 4.5 },
  smg: { size: 0.02, color: 0xc9a24a, rest: 0.34, ttl: 4.5 },
  rifle: { size: 0.026, color: 0xd2ab52, rest: 0.3, ttl: 5 },
  shotgun: { size: 0.034, color: 0xc23b30, rest: 0.14, ttl: 5 },
  dmr: { size: 0.03, color: 0xd2ab52, rest: 0.3, ttl: 5.5 },
};

/* ------------------------------------------------------------------ */
/* Smoke volume — occludes AI vision while dense                       */
/* ------------------------------------------------------------------ */

class SmokeVolume {
  constructor(system, pos, radius, duration) {
    this.system = system;
    this.pos = new THREE.Vector3(pos.x, pos.y, pos.z);
    this.radius = radius;
    this.duration = duration;
    this.age = 0;
    this.alive = true;
    this._acc = 0;
  }

  /** 0..1 — ramps up in ~1.2 s, holds, thins over the last quarter. */
  density() {
    if (!this.alive) return 0;
    const up = Math.min(1, this.age / 1.2);
    const down = Math.min(1, Math.max(0, (this.duration - this.age) / (this.duration * 0.25)));
    return Math.min(up, down);
  }

  /** True if the segment a->b passes through the dense core (AI vision block). */
  occludes(a, b) {
    const d = this.density();
    if (d < 0.35) return false;
    const r = this.radius * (0.55 + 0.45 * d);
    _v1.set(b.x - a.x, b.y - a.y, b.z - a.z);
    _v2.set(this.pos.x - a.x, this.pos.y - a.y, this.pos.z - a.z);
    const len2 = _v1.lengthSq();
    const t = len2 > 1e-8 ? Math.max(0, Math.min(1, _v2.dot(_v1) / len2)) : 0;
    _v3.copy(_v1).multiplyScalar(t).sub(_v2);
    return _v3.lengthSq() <= r * r;
  }

  update(dt) {
    if (!this.alive) return;
    this.age += dt;
    if (this.age >= this.duration) {
      this.alive = false;
      return;
    }
    const d = this.density();
    // Emission keeps the volume topped up; heavier while ramping in.
    this._acc += dt * (10 + 26 * d);
    const eng = this.system.particles;
    const smokeCol = col(0xb9bec4);
    while (this._acc >= 1) {
      this._acc -= 1;
      const a = Math.random() * Math.PI * 2;
      const rr = Math.sqrt(Math.random()) * this.radius * 0.75;
      eng.emit('smoke', {
        x: this.pos.x + Math.cos(a) * rr,
        y: this.pos.y + Math.random() * this.radius * 0.5,
        z: this.pos.z + Math.sin(a) * rr,
        vx: (Math.random() - 0.5) * 0.35,
        vy: 0.12 + Math.random() * 0.3,
        vz: (Math.random() - 0.5) * 0.35,
        ttl: 2.2 + Math.random() * 1.6,
        size: this.radius * 0.5,
        size1: this.radius * 1.15,
        ...smokeCol,
        alpha: 0.32 * Math.max(0.35, d),
        drag: 0.6,
        swirl: 0.5,
        fadeIn: 0.25,
        fadeOut: 0.45,
      });
    }
  }

  dispose() {
    this.alive = false;
  }
}

/* ------------------------------------------------------------------ */
/* VfxSystem                                                           */
/* ------------------------------------------------------------------ */

export class VfxSystem {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.time = 0;
    this.particles = new ParticleEngine(scene);
    this.decals = new DecalPool(scene);
    this.volumes = [];
    this._snow = { on: false, intensity: 1, acc: 0 };
    this._dust = { on: false, acc: 0 };
    this._camPos = new THREE.Vector3();
    this._wash = null;
    this._recentGlass = new WeakSet();

    // Small pool of dynamic flash lights (muzzle / explosion / flashbang).
    this.lights = [];
    for (let i = 0; i < 3; i++) {
      const l = new THREE.PointLight(0xffffff, 0, 9, 2);
      l.castShadow = false;
      l.visible = false;
      scene.add(l);
      this.lights.push({ light: l, ttl: 0, dur: 0, peak: 0 });
    }

    this._applyViewScale();

    this._unsub = [
      bus.on(EV.GLASS_BROKEN, (p) => this.glassShatter(p)),
      bus.on(EV.MISSION_RESET, () => this.reset()),
      bus.on(EV.SETTINGS_CHANGED, () => {
        this.particles.setBudget(settings.preset.particleBudget);
        this.decals.setBudget(settings.preset.decalBudget);
      }),
      bus.on(EV.RESIZE, () => this._applyViewScale()),
    ];
  }

  _applyViewScale() {
    const h = typeof window !== 'undefined' ? window.innerHeight : 1080;
    this.particles.setViewScale(h, this.camera?.fov ?? 82);
  }

  _flashLight(pos, color, intensity, duration, distance = 9) {
    let slot = this.lights.find((s) => s.ttl <= 0);
    if (!slot) {
      slot = this.lights[0];
      for (const s of this.lights) if (s.ttl < slot.ttl) slot = s;
    }
    slot.light.position.set(pos.x, pos.y, pos.z);
    slot.light.color.set(color);
    slot.light.intensity = intensity;
    slot.light.distance = distance;
    slot.light.visible = true;
    slot.ttl = duration;
    slot.dur = duration;
    slot.peak = intensity;
  }

  /* ------------------------------ frame ------------------------------ */

  update(dt, cameraPos) {
    this.time += dt;
    if (cameraPos) this._camPos.set(cameraPos.x, cameraPos.y, cameraPos.z);
    else if (this.camera) this._camPos.copy(this.camera.position);

    this.particles.update(dt);
    this.decals.update(dt);

    for (let i = this.volumes.length - 1; i >= 0; i--) {
      this.volumes[i].update(dt);
      if (!this.volumes[i].alive) this.volumes.splice(i, 1);
    }

    for (const s of this.lights) {
      if (s.ttl <= 0) continue;
      s.ttl -= dt;
      if (s.ttl <= 0) {
        s.light.intensity = 0;
        s.light.visible = false;
      } else {
        const k = s.ttl / s.dur;
        s.light.intensity = s.peak * k * k;
      }
    }

    this._updateSnow(dt);
    this._updateDust(dt);
  }

  /* --------------------------- weapon FX ----------------------------- */

  muzzleFlash(pos, dir, family) {
    const m = MUZZLE[family] ?? MUZZLE.rifle;
    const c = col(m.color);
    const eng = this.particles;
    // Core
    eng.emit('add', {
      x: pos.x, y: pos.y, z: pos.z,
      ttl: m.ttl, size: m.core, size1: m.core * 1.5,
      ...c, alpha: 1, fadeIn: 0, fadeOut: 0.6,
    });
    // Petal sparks in a forward cone
    eng.burst('add', m.petals, {
      x: pos.x, y: pos.y, z: pos.z,
      ttl: 0.07, size: 0.03, size1: 0.008,
      r: 1, g: 0.82, b: 0.45, alpha: 0.95, drag: 4, fadeIn: 0,
    }, (o) => {
      const s = m.speed * (0.5 + Math.random() * 0.8);
      o.vx = dir.x * s + (Math.random() - 0.5) * s * 0.45;
      o.vy = dir.y * s + (Math.random() - 0.5) * s * 0.45;
      o.vz = dir.z * s + (Math.random() - 0.5) * s * 0.45;
      o.ttl = 0.05 + Math.random() * 0.06;
    });
    // Muzzle smoke drifting forward-up
    const sc = col(0x9aa0a6);
    eng.burst('smoke', m.smoke, {
      x: pos.x + dir.x * 0.08, y: pos.y + dir.y * 0.08, z: pos.z + dir.z * 0.08,
      ttl: 0.8, size: 0.06, size1: 0.3, ...sc, alpha: 0.22, drag: 1.6, fadeIn: 0.04, fadeOut: 0.6,
    }, (o) => {
      o.vx = dir.x * 1.1 + (Math.random() - 0.5) * 0.4;
      o.vy = dir.y * 1.1 + 0.35 + Math.random() * 0.3;
      o.vz = dir.z * 1.1 + (Math.random() - 0.5) * 0.4;
      o.ttl = 0.55 + Math.random() * 0.5;
    });
    this._flashLight(pos, m.color, family === 'shotgun' || family === 'dmr' ? 7 : 4.5, 0.05, 7);
  }

  /**
   * Bullet impact. surface: concrete|drywall|wood|metal|glass|carpet|ceramic|
   * vinyl|plastic|rubber|snow|tile|flesh. opts: { scale, dir, decal }.
   */
  impact(point, normal, surface, opts = {}) {
    const scale = opts.scale ?? 1;
    const eng = this.particles;
    const n = _v1.set(normal.x, normal.y, normal.z).normalize();
    const gY = groundBelow(point.x, point.z, point.y);
    const out = (o, sp, spread = 0.9) => {
      const s = sp * (0.4 + Math.random() * 0.9);
      o.vx = n.x * s + (Math.random() - 0.5) * s * spread;
      o.vy = n.y * s + Math.random() * s * spread * 0.7;
      o.vz = n.z * s + (Math.random() - 0.5) * s * spread;
    };
    switch (surface) {
      case 'flesh':
        this.bloodHit(point, normal, opts);
        return;
      case 'concrete':
      case 'tile': {
        const dust = col(0x8e8f8b);
        eng.burst('smoke', Math.round(3 * scale), {
          x: point.x, y: point.y, z: point.z, ttl: 0.7, size: 0.07, size1: 0.32,
          ...dust, alpha: 0.4, drag: 2.2, fadeOut: 0.55,
        }, (o) => out(o, 1.4));
        eng.burst('solid', Math.round(6 * scale), {
          x: point.x, y: point.y, z: point.z, ttl: 1.4, size: 0.014,
          r: 0.5, g: 0.5, b: 0.48, alpha: 1, gravity: -9.8, restitution: 0.3, groundY: gY, fadeOut: 0.15,
        }, (o) => out(o, 3.4));
        break;
      }
      case 'drywall': {
        // Larger, softer white powder puff
        const p = col(0xe8e2d6);
        eng.burst('smoke', Math.round(5 * scale), {
          x: point.x, y: point.y, z: point.z, ttl: 1.0, size: 0.1, size1: 0.5,
          ...p, alpha: 0.5, drag: 2.4, fadeIn: 0.02, fadeOut: 0.6,
        }, (o) => out(o, 1.2));
        eng.burst('solid', Math.round(3 * scale), {
          x: point.x, y: point.y, z: point.z, ttl: 1.1, size: 0.012,
          r: 0.9, g: 0.87, b: 0.8, alpha: 1, gravity: -9, restitution: 0.15, groundY: gY,
        }, (o) => out(o, 2.2));
        break;
      }
      case 'wood': {
        eng.burst('solid', Math.round(7 * scale), {
          x: point.x, y: point.y, z: point.z, ttl: 1.5, size: 0.02, size1: 0.012,
          r: 0.45, g: 0.3, b: 0.15, alpha: 1, gravity: -9.8, restitution: 0.24, groundY: gY,
        }, (o) => out(o, 3.2));
        const d = col(0x8a5f38);
        eng.burst('smoke', 1, {
          x: point.x, y: point.y, z: point.z, ttl: 0.5, size: 0.06, size1: 0.2,
          ...d, alpha: 0.24, drag: 2, fadeOut: 0.6,
        }, (o) => out(o, 0.9));
        break;
      }
      case 'metal': {
        eng.burst('add', Math.round(9 * scale), {
          x: point.x, y: point.y, z: point.z, ttl: 0.3, size: 0.02, size1: 0.005,
          r: 1, g: 0.85, b: 0.5, alpha: 1, gravity: -6, drag: 0.8, fadeIn: 0,
        }, (o) => {
          out(o, 6.5, 1.1);
          o.ttl = 0.12 + Math.random() * 0.3;
        });
        // Ricochet streak: one bright spark skimming away
        const rd = _v2.set(n.x + (Math.random() - 0.5), n.y + Math.random() * 0.6, n.z + (Math.random() - 0.5)).normalize();
        this.particles.tracer(point, _v3.copy(point).addScaledVector(rd, 1.6 + Math.random() * 2), { r: 1, g: 0.8, b: 0.4, ttl: 0.14 });
        eng.burst('smoke', 1, {
          x: point.x, y: point.y, z: point.z, ttl: 0.45, size: 0.05, size1: 0.16,
          r: 0.4, g: 0.42, b: 0.44, alpha: 0.3, drag: 2, fadeOut: 0.6,
        }, (o) => out(o, 0.8));
        break;
      }
      case 'glass': {
        const g = col(C.iceBlue);
        eng.burst('solid', Math.round(7 * scale), {
          x: point.x, y: point.y, z: point.z, ttl: 1.6, size: 0.016, size1: 0.01,
          ...g, alpha: 0.9, gravity: -9.8, restitution: 0.2, groundY: gY,
        }, (o) => out(o, 2.6));
        eng.burst('add', Math.round(4 * scale), {
          x: point.x, y: point.y, z: point.z, ttl: 0.3, size: 0.02, size1: 0.004,
          r: 0.86, g: 0.94, b: 1, alpha: 0.9, gravity: -4,
        }, (o) => out(o, 2.4));
        break;
      }
      case 'carpet': {
        // Fibre puff, almost no debris
        const f = col(0x4a5259);
        eng.burst('smoke', Math.round(3 * scale), {
          x: point.x, y: point.y, z: point.z, ttl: 0.55, size: 0.05, size1: 0.17,
          ...f, alpha: 0.4, drag: 3, fadeOut: 0.6,
        }, (o) => out(o, 0.8));
        break;
      }
      case 'ceramic': {
        // Sharp white chips
        eng.burst('solid', Math.round(7 * scale), {
          x: point.x, y: point.y, z: point.z, ttl: 1.3, size: 0.014,
          r: 0.92, g: 0.92, b: 0.89, alpha: 1, gravity: -9.8, restitution: 0.35, groundY: gY,
        }, (o) => out(o, 3.8));
        const w = col(0xdcded9);
        eng.burst('smoke', 1, {
          x: point.x, y: point.y, z: point.z, ttl: 0.4, size: 0.05, size1: 0.18,
          ...w, alpha: 0.35, drag: 2.4, fadeOut: 0.6,
        }, (o) => out(o, 1));
        break;
      }
      case 'snow': {
        const s = col(C.snowLit);
        eng.burst('smoke', Math.round(5 * scale), {
          x: point.x, y: point.y, z: point.z, ttl: 0.8, size: 0.09, size1: 0.34,
          ...s, alpha: 0.55, drag: 1.8, fadeOut: 0.55,
        }, (o) => out(o, 1.6));
        eng.burst('solid', Math.round(4 * scale), {
          x: point.x, y: point.y, z: point.z, ttl: 0.9, size: 0.012,
          r: 0.94, g: 0.97, b: 1, alpha: 0.9, gravity: -7, groundY: gY, restitution: 0.05,
        }, (o) => out(o, 2.2));
        break;
      }
      case 'vinyl':
      case 'plastic':
      case 'rubber':
      default: {
        const dk = surface === 'rubber' ? col(0x232629) : col(0x6a6d6a);
        eng.burst('solid', Math.round(4 * scale), {
          x: point.x, y: point.y, z: point.z, ttl: 1.1, size: 0.012,
          r: dk.r, g: dk.g, b: dk.b, alpha: 1, gravity: -9.5, restitution: 0.22, groundY: gY,
        }, (o) => out(o, 2.6));
        eng.burst('smoke', 1, {
          x: point.x, y: point.y, z: point.z, ttl: 0.4, size: 0.04, size1: 0.14,
          ...dk, alpha: 0.28, drag: 2.4, fadeOut: 0.6,
        }, (o) => out(o, 0.9));
        break;
      }
    }
    if (opts.decal !== false) {
      const kind = decalKindForSurface(surface);
      if (kind) this.decals.add(kind, point, normal, { size: opts.decalSize });
    }
  }

  tracer(from, to, opts = {}) {
    this.particles.tracer(from, to, opts);
  }

  shell(pos, dir, family) {
    const s = SHELL[family] ?? SHELL.rifle;
    const c = col(s.color);
    const gY = groundBelow(pos.x, pos.z, pos.y);
    const sp = 1.4 + Math.random() * 1.2;
    this.particles.emit('solid', {
      x: pos.x, y: pos.y, z: pos.z,
      vx: dir.x * sp + (Math.random() - 0.5) * 0.5,
      vy: Math.abs(dir.y) * sp + 1.5 + Math.random() * 0.8,
      vz: dir.z * sp + (Math.random() - 0.5) * 0.5,
      ttl: s.ttl + Math.random(),
      size: s.size, ...c, alpha: 1,
      gravity: -9.8, restitution: s.rest, groundY: gY, fadeOut: 0.12,
    });
  }

  bloodHit(point, normal, opts = {}) {
    const reduced = settings.get('reducedBlood');
    const eng = this.particles;
    const gY = groundBelow(point.x, point.z, point.y);
    const c = reduced ? { r: 0.22, g: 0.2, b: 0.2 } : { r: 0.42, g: 0.03, b: 0.03 };
    const n = _v1.set(normal.x, normal.y, normal.z).normalize();
    eng.burst('smoke', reduced ? 1 : 2, {
      x: point.x, y: point.y, z: point.z, ttl: 0.4, size: 0.06, size1: 0.2,
      ...c, alpha: reduced ? 0.22 : 0.5, drag: 2.6, fadeOut: 0.6,
    }, (o) => {
      o.vx = n.x * 0.8 + (Math.random() - 0.5) * 0.6;
      o.vy = n.y * 0.8 + Math.random() * 0.4;
      o.vz = n.z * 0.8 + (Math.random() - 0.5) * 0.6;
    });
    if (!reduced) {
      eng.burst('solid', 7, {
        x: point.x, y: point.y, z: point.z, ttl: 0.8, size: 0.012, size1: 0.008,
        ...c, alpha: 0.95, gravity: -9.8, groundY: gY, restitution: 0, fadeOut: 0.2,
      }, (o) => {
        const s = 1.4 + Math.random() * 2;
        o.vx = n.x * s + (Math.random() - 0.5) * s;
        o.vy = n.y * s + (Math.random() - 0.3) * s * 0.8;
        o.vz = n.z * s + (Math.random() - 0.5) * s;
      });
      // Splatter decal: along the exit direction onto whatever is behind,
      // otherwise a drip on the floor below.
      const dir = opts.dir ?? { x: -n.x, y: -n.y, z: -n.z };
      let placed = false;
      try {
        const hit = collision.raycast(
          new THREE.Vector3(point.x, point.y, point.z),
          _v2.set(dir.x, dir.y, dir.z).normalize(),
          2.4,
        );
        if (hit) {
          this.decals.add('blood', hit.point, hit.normal, { size: 0.4 + Math.random() * 0.35 });
          placed = true;
        }
      } catch { /* collision world not built yet */ }
      if (!placed) {
        this.decals.add('blood', { x: point.x, y: gY + 0.001, z: point.z }, { x: 0, y: 1, z: 0 }, { size: 0.5 });
      }
    }
  }

  /** payload from EV.GLASS_BROKEN: { center, width, height, axis, dir } */
  glassShatter(payload) {
    if (!payload) return;
    if (this._recentGlass.has(payload)) return; // event + direct call dedupe
    this._recentGlass.add(payload);
    const c = payload.center ?? payload;
    const cx = c.x ?? 0;
    const cy = c.y ?? 1.2;
    const cz = c.z ?? 0;
    const w = payload.width ?? 1;
    const h = payload.height ?? 1;
    const axis = payload.axis ?? 'x'; // constant axis = pane normal
    const push = (payload.dir ?? 1) * (0.6 + Math.random() * 0.8);
    const gY = groundBelow(cx, cz, cy);
    const area = Math.min(24, Math.max(4, w * h * 8));
    const g = col(C.iceBlue);
    const eng = this.particles;
    eng.burst('solid', Math.round(area), {
      x: cx, y: cy, z: cz, ttl: 2.4, size: 0.024, size1: 0.014,
      ...g, alpha: 0.92, gravity: -9.8, restitution: 0.18, groundY: gY, fadeOut: 0.2,
    }, (o) => {
      const u = (Math.random() - 0.5) * w;
      const v = (Math.random() - 0.5) * h;
      if (axis === 'x') { o.x = cx; o.z = cz + u; } else { o.x = cx + u; o.z = cz; }
      o.y = cy + v;
      const nx = axis === 'x' ? push : (Math.random() - 0.5) * 0.4;
      const nz = axis === 'z' ? push : (Math.random() - 0.5) * 0.4;
      o.vx = nx * (0.6 + Math.random() * 1.6);
      o.vy = Math.random() * 0.8 - 0.2;
      o.vz = nz * (0.6 + Math.random() * 1.6);
      o.ttl = 1.4 + Math.random() * 1.4;
    });
    // Sparkle glints
    eng.burst('add', Math.round(area * 0.5), {
      x: cx, y: cy, z: cz, ttl: 0.5, size: 0.022, size1: 0.005,
      r: 0.9, g: 0.96, b: 1, alpha: 0.9, gravity: -5,
    }, (o) => {
      const u = (Math.random() - 0.5) * w;
      const v = (Math.random() - 0.5) * h;
      if (axis === 'x') { o.x = cx; o.z = cz + u; } else { o.x = cx + u; o.z = cz; }
      o.y = cy + v;
      o.vx = (Math.random() - 0.5) * 2;
      o.vy = Math.random() * 1.2;
      o.vz = (Math.random() - 0.5) * 2;
      o.ttl = 0.25 + Math.random() * 0.5;
    });
  }

  doorImpact(point, normal) {
    const eng = this.particles;
    const n = _v1.set(normal.x, normal.y, normal.z).normalize();
    const gY = groundBelow(point.x, point.z, point.y);
    eng.burst('solid', 6, {
      x: point.x, y: point.y, z: point.z, ttl: 1.4, size: 0.018, size1: 0.01,
      r: 0.42, g: 0.28, b: 0.13, alpha: 1, gravity: -9.8, restitution: 0.25, groundY: gY,
    }, (o) => {
      const s = 2 + Math.random() * 2.6;
      o.vx = n.x * s + (Math.random() - 0.5) * s;
      o.vy = n.y * s + Math.random() * s * 0.7;
      o.vz = n.z * s + (Math.random() - 0.5) * s;
    });
    const d = col(0x8a6a44);
    eng.burst('smoke', 2, {
      x: point.x, y: point.y, z: point.z, ttl: 0.6, size: 0.07, size1: 0.24,
      ...d, alpha: 0.3, drag: 2.2, fadeOut: 0.6,
    }, (o) => {
      o.vx = n.x + (Math.random() - 0.5) * 0.5;
      o.vy = 0.4 + Math.random() * 0.3;
      o.vz = n.z + (Math.random() - 0.5) * 0.5;
    });
    this.decals.add('door', point, normal, {});
  }

  smokeVolume(pos, radius = 5.2, duration = 16) {
    const v = new SmokeVolume(this, pos, radius, duration);
    this.volumes.push(v);
    return v;
  }

  flashBang(pos) {
    const eng = this.particles;
    eng.emit('add', {
      x: pos.x, y: pos.y, z: pos.z, ttl: 0.22, size: 1.2, size1: 3.2,
      r: 1, g: 1, b: 0.96, alpha: 1, fadeIn: 0, fadeOut: 0.75,
    });
    eng.burst('add', 14, {
      x: pos.x, y: pos.y, z: pos.z, ttl: 0.4, size: 0.05, size1: 0.01,
      r: 1, g: 0.95, b: 0.8, alpha: 1, gravity: -4, fadeIn: 0,
    }, (o) => {
      const a = Math.random() * Math.PI * 2;
      const e = (Math.random() - 0.2) * 1.4;
      const s = 6 + Math.random() * 9;
      o.vx = Math.cos(a) * Math.cos(e) * s;
      o.vy = Math.sin(e) * s;
      o.vz = Math.sin(a) * Math.cos(e) * s;
      o.ttl = 0.2 + Math.random() * 0.3;
    });
    const sc = col(0xcfd3d6);
    eng.burst('smoke', 3, {
      x: pos.x, y: pos.y, z: pos.z, ttl: 1.6, size: 0.3, size1: 1.1,
      ...sc, alpha: 0.3, drag: 1.4, swirl: 0.4, fadeIn: 0.06, fadeOut: 0.5,
    }, (o) => {
      o.vx = (Math.random() - 0.5) * 1.4;
      o.vy = 0.5 + Math.random() * 0.8;
      o.vz = (Math.random() - 0.5) * 1.4;
    });
    this._flashLight(pos, 0xffffff, 40, 0.35, 16);
    this.decals.add('scorch', { x: pos.x, y: groundBelow(pos.x, pos.z, pos.y) + 0.001, z: pos.z }, { x: 0, y: 1, z: 0 }, { size: 0.8 });
    return { pos: { x: pos.x, y: pos.y, z: pos.z }, time: this.time };
  }

  breathVapor(pos, dir) {
    const c = col(0xe6eef6);
    this.particles.burst('smoke', 2, {
      x: pos.x, y: pos.y, z: pos.z, ttl: 0.9, size: 0.04, size1: 0.2,
      ...c, alpha: 0.16, drag: 1.8, fadeIn: 0.1, fadeOut: 0.55,
    }, (o) => {
      o.vx = dir.x * 0.45 + (Math.random() - 0.5) * 0.2;
      o.vy = dir.y * 0.45 + 0.14 + Math.random() * 0.1;
      o.vz = dir.z * 0.45 + (Math.random() - 0.5) * 0.2;
      o.ttl = 0.7 + Math.random() * 0.5;
    });
  }

  snowfall(enabled, intensity = 1) {
    this._snow.on = !!enabled;
    this._snow.intensity = intensity;
  }

  _updateSnow(dt) {
    if (!this._snow.on) return;
    this._snow.acc += dt * 26 * this._snow.intensity;
    const c = col(C.snowLit);
    const p = this._camPos;
    while (this._snow.acc >= 1) {
      this._snow.acc -= 1;
      const a = Math.random() * Math.PI * 2;
      const r = 2 + Math.random() * 11;
      this.particles.emit('ambient', {
        x: p.x + Math.cos(a) * r,
        y: p.y + 3 + Math.random() * 4,
        z: p.z + Math.sin(a) * r,
        vx: (Math.random() - 0.5) * 0.5 - 0.25,
        vy: -(0.8 + Math.random() * 0.9),
        vz: (Math.random() - 0.5) * 0.5,
        ttl: 7 + Math.random() * 3,
        size: 0.014 + Math.random() * 0.02,
        ...c, alpha: 0.85, swirl: 0.7, fadeIn: 0.2, fadeOut: 0.12,
      });
    }
  }

  ambientDust(enabled) {
    this._dust.on = !!enabled;
  }

  _updateDust(dt) {
    if (!this._dust.on) return;
    this._dust.acc += dt * 4;
    const p = this._camPos;
    while (this._dust.acc >= 1) {
      this._dust.acc -= 1;
      const a = Math.random() * Math.PI * 2;
      const r = 0.8 + Math.random() * 5.5;
      this.particles.emit('ambient', {
        x: p.x + Math.cos(a) * r,
        y: p.y - 0.6 + Math.random() * 1.8,
        z: p.z + Math.sin(a) * r,
        vx: (Math.random() - 0.5) * 0.04,
        vy: (Math.random() - 0.5) * 0.03,
        vz: (Math.random() - 0.5) * 0.04,
        ttl: 5 + Math.random() * 4,
        size: 0.006 + Math.random() * 0.008,
        r: 1, g: 0.98, b: 0.92, alpha: 0.3, swirl: 0.05, fadeIn: 0.25, fadeOut: 0.25,
      });
    }
  }

  explosionLight(pos, color = 0xffb060, intensity = 12, duration = 0.4) {
    this._flashLight(pos, color, intensity, duration, 12);
  }

  /** Hostage secured / objective feedback: an expanding cyan-gold pulse ring. */
  objectivePulse(pos, colorHex = C.brandCyan) {
    const c = col(colorHex);
    this.particles.burst('add', 18, {
      x: pos.x, y: pos.y, z: pos.z, ttl: 0.7, size: 0.05, size1: 0.02,
      ...c, alpha: 0.9, fadeIn: 0, fadeOut: 0.5,
    }, (o, i) => {
      const a = (i / 18) * Math.PI * 2;
      o.x += Math.cos(a) * 0.35;
      o.z += Math.sin(a) * 0.35;
      o.vx = Math.cos(a) * 1.6;
      o.vy = 0.5;
      o.vz = Math.sin(a) * 1.6;
      o.ttl = 0.5 + Math.random() * 0.3;
    });
    this.particles.emit('add', {
      x: pos.x, y: pos.y + 0.4, z: pos.z, ttl: 0.5, size: 0.4, size1: 1.2,
      ...c, alpha: 0.5, fadeIn: 0, fadeOut: 0.7,
    });
  }

  /**
   * Full-screen colour wash for state transitions (lead calls this).
   * kind: 'victory' | 'defeat' | 'flash' | css colour string.
   */
  screenWash(kind, duration = 1.6) {
    if (typeof document === 'undefined') return;
    if (!this._wash) {
      const el = document.createElement('div');
      el.id = 'vfx-screen-wash';
      el.style.cssText =
        'position:fixed;inset:0;pointer-events:none;z-index:9990;opacity:0;' +
        'transition:opacity 0.25s ease-out;mix-blend-mode:screen;';
      document.body.appendChild(el);
      this._wash = el;
    }
    const el = this._wash;
    const bg = kind === 'victory'
      ? 'radial-gradient(circle at 50% 45%, rgba(217,164,65,0.55), rgba(127,212,255,0.35) 55%, rgba(8,13,20,0) 100%)'
      : kind === 'defeat'
        ? 'radial-gradient(circle at 50% 55%, rgba(164,29,24,0.7), rgba(30,4,4,0.9) 100%)'
        : kind === 'flash'
          ? 'rgba(255,255,255,1)'
          : kind;
    el.style.background = bg;
    el.style.mixBlendMode = kind === 'defeat' ? 'multiply' : 'screen';
    el.style.transition = 'opacity 0.12s ease-out';
    el.style.opacity = kind === 'flash' ? '1' : '0.85';
    clearTimeout(this._washTimer);
    this._washTimer = setTimeout(() => {
      el.style.transition = `opacity ${Math.max(0.2, duration - 0.2)}s ease-in`;
      el.style.opacity = '0';
    }, 200);
  }

  /* ------------------------------ misc ------------------------------- */

  reset() {
    this.particles.reset();
    this.decals.reset();
    for (const v of this.volumes) v.dispose();
    this.volumes.length = 0;
    for (const s of this.lights) {
      s.ttl = 0;
      s.light.intensity = 0;
      s.light.visible = false;
    }
    this._snow.on = false;
    this._dust.on = false;
    if (this._wash) this._wash.style.opacity = '0';
  }

  dispose() {
    for (const off of this._unsub) off();
    this.reset();
    this.particles.dispose();
    this.decals.dispose();
    for (const s of this.lights) this.scene.remove(s.light);
    if (this._wash?.parentNode) this._wash.parentNode.removeChild(this._wash);
  }

  get stats() {
    return {
      particles: this.particles.alive,
      decals: this.decals.count,
      draws: this.particles.drawCalls + this.decals.count + this.volumes.length * 0,
    };
  }
}

/* ------------------------------------------------------------------ */
/* Manifest                                                            */
/* ------------------------------------------------------------------ */

export function registerVfxManifest() {
  const base = {
    owner: OWNERS.FABLE4,
    files: ['src/vfx/index.js', 'src/vfx/particles.js'],
    usedIn: ['combat', 'mission flow'],
    pivot: 'world-space emitter origin',
    collision: 'none (userData.noHit, transparentToSight)',
    lod: 'particle budget scales with quality preset (settings.preset.particleBudget)',
    status: 'built',
    textures: 'procedural DataTexture sprites (soft gaussian / hard chip)',
    materials: 'ShaderMaterial points (additive + normal blend), LineBasicMaterial tracers',
  };
  reg({
    ...base,
    id: 'vfx.particles.engine', name: 'Pooled particle engine', category: 'vfx',
    dimensions: 'n/a — 4 point batches + 1 line batch, budget slots total',
    acceptance: 'Total live particles never exceed settings.preset.particleBudget; 5 draw calls max.',
  });
  const effects = [
    ['vfx.muzzleflash', 'Muzzle flash per weapon family', 'core + petal sparks + smoke, per-family size/colour/petal grammar'],
    ['vfx.impact.set', 'Bullet impact per surface', 'concrete dust+chips, drywall powder, wood splinters, metal sparks+ricochet, glass shards, carpet fibre, ceramic chips, snow burst, vinyl/plastic/rubber chips'],
    ['vfx.tracer', 'Bullet path tracer', 'additive line segment, quadratic fade, subtle'],
    ['vfx.shell.eject', 'Shell ejection', 'brass/red hull, gravity + bounce + settle, 4-6 s lifetime'],
    ['vfx.blood.hit', 'Blood hit', 'droplets + mist + splatter decal; reducedBlood swaps to grey puff, no decal'],
    ['vfx.glass.shatter', 'Glass shatter', 'shards across pane area + sparkle glints, from EV.GLASS_BROKEN payload'],
    ['vfx.door.damage', 'Door damage burst', 'splinters + dust + door decal'],
    ['vfx.smoke.volume', 'Smoke device volume', 'self-topping billow; handle.occludes(a,b) blocks AI vision while density > 0.35'],
    ['vfx.flashbang', 'Flash device burst', 'white core + radial sparks + smoke + pooled light + floor scorch'],
    ['vfx.snowfall', 'Exterior snowfall', 'ambient batch, camera-centred drift'],
    ['vfx.dust.motes', 'Sunbeam dust motes', 'ambient batch, near-camera slow drift'],
    ['vfx.breath.vapor', 'Breath vapour', 'two soft puffs along look direction'],
    ['vfx.pulse.objective', 'Objective/hostage pulse', 'expanding cyan/gold ring + glow'],
    ['vfx.screen.wash', 'Victory/defeat/flash screen wash', 'DOM overlay colour wash, screenWash(kind, duration)'],
    ['vfx.explosion.light', 'Pooled flash lights', '3 pooled PointLights, quadratic decay'],
  ];
  for (const [id, name, acceptance] of effects) {
    reg({
      ...base,
      id, name, category: 'vfx',
      dimensions: 'emitter-relative, metres',
      acceptance,
    });
  }
  for (const kind of DECAL_KINDS) {
    reg({
      id: `vfx.decal.${kind}`,
      name: `Runtime decal — ${kind}`,
      category: 'decal',
      owner: OWNERS.FABLE4,
      files: ['src/vfx/decals.js'],
      usedIn: ['combat impacts'],
      dimensions: `${(kind.startsWith('bullet') ? 0.12 : 0.5).toFixed(2)} m nominal quad`,
      pivot: 'centre of quad, +Z along surface normal',
      materials: 'per-slot MeshLambertMaterial, transparent, polygonOffset(-4,-4), depthWrite off',
      textures: `vfx.decal.${kind}.* canvas variants via decalTexture()`,
      collision: 'none',
      lod: 'hard cap settings.preset.decalBudget, oldest recycled first',
      status: 'built',
      acceptance: 'Offset 0.008 m along normal, random roll, 80 ms fade-in, no z-fighting or flicker; blood respects reducedBlood.',
    });
  }
}
