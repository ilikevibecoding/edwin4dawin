import * as THREE from 'three';
import { BeamRenderer } from './BeamRenderer';
import { QuadParticles } from './QuadParticles';
import { smokePuffMap, softDiscMap } from '../assets/textures';
import { Rng, freshRng } from '../core/Random';
import { clamp01 } from '../core/math';

/**
 * Central effects hub.
 *
 * Owns every pool used by the cinematic: energy bolts with real travel time,
 * spark streaks, smoke, tumbling debris and a small ring of dynamic impact
 * lights. Pool budgets scale with the quality tier. Everything is deterministic
 * given the same call sequence, and `reset()` returns the whole hub to its
 * initial state so timeline scrubbing never leaves stale effects behind.
 */

export interface Bolt {
  alive: boolean;
  pos: THREE.Vector3;
  dir: THREE.Vector3;
  speed: number;
  length: number;
  width: number;
  color: THREE.Color;
  travelled: number;
  range: number;
  onHit: ((point: THREE.Vector3) => void) | null;
  hitDistance: number;
}

export interface DebrisPiece {
  alive: boolean;
  age: number;
  life: number;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  spin: THREE.Vector3;
  quat: THREE.Quaternion;
  scale: number;
  gravity: number;
}

export interface EffectsOptions {
  particleScale: number;
}

const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _m = new THREE.Matrix4();
const _s = new THREE.Vector3();

export class Effects {
  readonly root = new THREE.Group();
  readonly beams: BeamRenderer;
  readonly smoke: QuadParticles;
  readonly glow: QuadParticles;

  private bolts: Bolt[] = [];
  private sparks: Array<{
    alive: boolean;
    pos: THREE.Vector3;
    vel: THREE.Vector3;
    age: number;
    life: number;
    color: THREE.Color;
    width: number;
    gravity: number;
    drag: number;
  }> = [];
  private debris: DebrisPiece[] = [];
  private debrisMesh: THREE.InstancedMesh;
  private impactLights: Array<{ light: THREE.PointLight; ttl: number; peak: number }> = [];
  private rng: Rng;
  private scale: number;

  constructor(opts: EffectsOptions) {
    this.root.name = 'Effects';
    this.scale = opts.particleScale;
    this.rng = freshRng('effects');

    const boltCap = Math.round(220 * this.scale) + 60;
    const sparkCap = Math.round(700 * this.scale) + 120;
    this.beams = new BeamRenderer(boltCap + sparkCap);
    this.root.add(this.beams.mesh);

    this.smoke = new QuadParticles({
      capacity: Math.round(420 * this.scale) + 60,
      texture: smokePuffMap(),
      blending: THREE.NormalBlending,
      depthWrite: false,
    });
    this.root.add(this.smoke.mesh);

    this.glow = new QuadParticles({
      capacity: Math.round(260 * this.scale) + 60,
      texture: softDiscMap(),
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.root.add(this.glow.mesh);

    for (let i = 0; i < boltCap; i++) {
      this.bolts.push({
        alive: false,
        pos: new THREE.Vector3(),
        dir: new THREE.Vector3(0, 0, 1),
        speed: 100,
        length: 3,
        width: 0.2,
        color: new THREE.Color(),
        travelled: 0,
        range: 100,
        onHit: null,
        hitDistance: Infinity,
      });
    }
    for (let i = 0; i < sparkCap; i++) {
      this.sparks.push({
        alive: false,
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        age: 0,
        life: 0.4,
        color: new THREE.Color(),
        width: 0.02,
        gravity: 6,
        drag: 1.2,
      });
    }

    const debrisCap = Math.round(160 * this.scale) + 40;
    const debrisGeo = new THREE.BoxGeometry(1, 0.6, 0.35);
    this.debrisMesh = new THREE.InstancedMesh(
      debrisGeo,
      new THREE.MeshStandardMaterial({ color: 0x8b8f93, roughness: 0.8, metalness: 0.4 }),
      debrisCap,
    );
    this.debrisMesh.name = 'Debris';
    this.debrisMesh.frustumCulled = false;
    this.debrisMesh.castShadow = false;
    this.debrisMesh.count = 0;
    this.root.add(this.debrisMesh);
    for (let i = 0; i < debrisCap; i++) {
      this.debris.push({
        alive: false,
        age: 0,
        life: 3,
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        spin: new THREE.Vector3(),
        quat: new THREE.Quaternion(),
        scale: 0.2,
        gravity: 0,
      });
    }

    for (let i = 0; i < 6; i++) {
      const light = new THREE.PointLight(0xffffff, 0, 40, 2);
      light.visible = false;
      this.root.add(light);
      this.impactLights.push({ light, ttl: 0, peak: 0 });
    }
  }

  // -- spawning -----------------------------------------------------------

  fireBolt(cfg: {
    from: THREE.Vector3;
    to?: THREE.Vector3;
    direction?: THREE.Vector3;
    speed: number;
    color: THREE.ColorRepresentation;
    length?: number;
    width?: number;
    range?: number;
    onHit?: (point: THREE.Vector3) => void;
  }): void {
    const bolt = this.bolts.find((b) => !b.alive);
    if (!bolt) return;
    bolt.alive = true;
    bolt.pos.copy(cfg.from);
    if (cfg.to) {
      _v.copy(cfg.to).sub(cfg.from);
      bolt.hitDistance = _v.length();
      bolt.dir.copy(_v).normalize();
      bolt.range = bolt.hitDistance + (cfg.length ?? 3);
    } else {
      bolt.dir.copy(cfg.direction ?? UNIT_Z).normalize();
      bolt.hitDistance = Infinity;
      bolt.range = cfg.range ?? 400;
    }
    bolt.speed = cfg.speed;
    bolt.length = cfg.length ?? 3;
    bolt.width = cfg.width ?? bolt.length * 0.09;
    bolt.color.set(cfg.color);
    bolt.travelled = 0;
    bolt.onHit = cfg.onHit ?? null;
  }

  burstSparks(cfg: {
    origin: THREE.Vector3;
    count: number;
    speed: number;
    spread?: THREE.Vector3;
    color?: THREE.ColorRepresentation;
    life?: number;
    gravity?: number;
    width?: number;
  }): void {
    const n = Math.max(1, Math.round(cfg.count * clamp01(this.scale)));
    const color = new THREE.Color(cfg.color ?? 0xffc07a);
    for (let i = 0; i < n; i++) {
      const s = this.sparks.find((x) => !x.alive);
      if (!s) return;
      s.alive = true;
      s.pos.copy(cfg.origin);
      const dir = _v
        .set(this.rng.gaussian(), this.rng.gaussian(), this.rng.gaussian())
        .normalize();
      if (cfg.spread) {
        dir.multiply(cfg.spread).add(_v2.copy(cfg.spread).multiplyScalar(0)).normalize();
      }
      s.vel.copy(dir).multiplyScalar(cfg.speed * this.rng.range(0.35, 1.35));
      s.age = 0;
      s.life = (cfg.life ?? 0.55) * this.rng.range(0.6, 1.4);
      s.color.copy(color).offsetHSL(this.rng.spread(0.03), 0, this.rng.spread(0.12));
      s.width = cfg.width ?? 0.035;
      s.gravity = cfg.gravity ?? 6;
      s.drag = 1.1;
    }
  }

  puffSmoke(cfg: {
    origin: THREE.Vector3;
    count: number;
    radius: number;
    speed: number;
    size0: number;
    size1: number;
    life: number;
    color?: THREE.ColorRepresentation;
    color1?: THREE.ColorRepresentation;
    alpha?: number;
    gravity?: number;
    bias?: THREE.Vector3;
  }): void {
    const n = Math.max(1, Math.round(cfg.count * clamp01(this.scale)));
    for (let i = 0; i < n; i++) {
      const dir = _v.set(this.rng.gaussian(), this.rng.gaussian(), this.rng.gaussian()).normalize();
      _v2.copy(cfg.origin).addScaledVector(dir, cfg.radius * this.rng.next());
      const vel = dir.clone().multiplyScalar(cfg.speed * this.rng.range(0.3, 1));
      if (cfg.bias) vel.add(cfg.bias);
      this.smoke.spawn({
        position: _v2,
        velocity: vel,
        life: cfg.life * this.rng.range(0.7, 1.35),
        size0: cfg.size0 * this.rng.range(0.7, 1.3),
        size1: cfg.size1 * this.rng.range(0.8, 1.4),
        color0: cfg.color ?? 0x5b5f66,
        color1: cfg.color1 ?? 0x2a2d31,
        alpha: cfg.alpha ?? 0.5,
        rot: this.rng.range(0, Math.PI * 2),
        spin: this.rng.spread(0.9),
        drag: 0.85,
        gravity: cfg.gravity ?? 0,
        fadeIn: 0.18,
      });
    }
  }

  flash(cfg: {
    origin: THREE.Vector3;
    size: number;
    life?: number;
    color?: THREE.ColorRepresentation;
    light?: { intensity: number; distance: number; color?: THREE.ColorRepresentation };
  }): void {
    this.glow.spawn({
      position: cfg.origin,
      life: cfg.life ?? 0.22,
      size0: cfg.size,
      size1: cfg.size * 2.2,
      color0: cfg.color ?? 0xffd9a0,
      color1: cfg.color ?? 0xff8a4a,
      alpha: 1,
      fadeIn: 0.06,
      drag: 2,
    });
    if (cfg.light) this.pulseLight(cfg.origin, cfg.light.intensity, cfg.light.distance, cfg.light.color ?? cfg.color ?? 0xffb070);
  }

  spawnDebris(cfg: {
    origin: THREE.Vector3;
    count: number;
    speed: number;
    size: number;
    life?: number;
    gravity?: number;
    bias?: THREE.Vector3;
  }): void {
    const n = Math.max(1, Math.round(cfg.count * clamp01(this.scale)));
    for (let i = 0; i < n; i++) {
      const d = this.debris.find((x) => !x.alive);
      if (!d) return;
      d.alive = true;
      d.age = 0;
      d.life = (cfg.life ?? 3) * this.rng.range(0.6, 1.5);
      d.pos.copy(cfg.origin);
      const dir = _v.set(this.rng.gaussian(), this.rng.gaussian(), this.rng.gaussian()).normalize();
      d.vel.copy(dir).multiplyScalar(cfg.speed * this.rng.range(0.4, 1.3));
      if (cfg.bias) d.vel.add(cfg.bias);
      d.spin.set(this.rng.spread(9), this.rng.spread(9), this.rng.spread(9));
      d.quat.setFromEuler(
        new THREE.Euler(this.rng.range(0, 6.28), this.rng.range(0, 6.28), this.rng.range(0, 6.28)),
      );
      d.scale = cfg.size * this.rng.range(0.4, 1.6);
      d.gravity = cfg.gravity ?? 0;
    }
  }

  /** Composite "something was hit" effect. */
  impact(cfg: {
    point: THREE.Vector3;
    normal?: THREE.Vector3;
    scale: number;
    color?: THREE.ColorRepresentation;
    smoke?: boolean;
    debris?: boolean;
    light?: boolean;
  }): void {
    const s = cfg.scale;
    const color = cfg.color ?? 0xffb070;
    this.flash({ origin: cfg.point, size: s * 2.4, life: 0.2, color });
    this.burstSparks({
      origin: cfg.point,
      count: Math.round(10 + s * 5),
      speed: s * 5.5,
      color,
      life: 0.5,
      gravity: 4,
      width: Math.max(0.02, s * 0.04),
    });
    if (cfg.smoke !== false) {
      this.puffSmoke({
        origin: cfg.point,
        count: Math.round(3 + s * 1.5),
        radius: s * 0.4,
        speed: s * 1.1,
        size0: s * 0.9,
        size1: s * 3.2,
        life: 1.5,
        alpha: 0.45,
        bias: cfg.normal ? cfg.normal.clone().multiplyScalar(s * 0.7) : undefined,
      });
    }
    if (cfg.debris) {
      this.spawnDebris({
        origin: cfg.point,
        count: Math.round(3 + s),
        speed: s * 3.4,
        size: s * 0.12,
        life: 2.6,
      });
    }
    if (cfg.light !== false) this.pulseLight(cfg.point, 14 * s, 18 * s, color);
  }

  pulseLight(
    position: THREE.Vector3,
    intensity: number,
    distance: number,
    color: THREE.ColorRepresentation,
  ): void {
    // Reuse the dimmest slot so bright new impacts always get a light.
    let best = this.impactLights[0];
    for (const l of this.impactLights) if (l.ttl < best.ttl) best = l;
    best.light.position.copy(position);
    best.light.color.set(color);
    best.light.distance = distance;
    best.peak = intensity;
    best.ttl = 0.24;
    best.light.visible = true;
  }

  reset(): void {
    for (const b of this.bolts) b.alive = false;
    for (const s of this.sparks) s.alive = false;
    for (const d of this.debris) d.alive = false;
    this.debrisMesh.count = 0;
    this.smoke.clear();
    this.glow.clear();
    for (const l of this.impactLights) {
      l.ttl = 0;
      l.light.intensity = 0;
      l.light.visible = false;
    }
    this.beams.begin();
    this.beams.end();
  }

  update(dt: number): void {
    this.beams.begin();

    // Bolts.
    for (const b of this.bolts) {
      if (!b.alive) continue;
      const step = b.speed * dt;
      b.travelled += step;
      b.pos.addScaledVector(b.dir, step);
      if (b.travelled >= b.hitDistance) {
        _v.copy(b.pos);
        b.alive = false;
        b.onHit?.(_v);
        continue;
      }
      if (b.travelled > b.range) {
        b.alive = false;
        continue;
      }
      _v.copy(b.pos);
      _v2.copy(b.pos).addScaledVector(b.dir, -b.length);
      this.beams.push(_v, _v2, b.width, b.color, 1);
    }

    // Spark streaks.
    for (const s of this.sparks) {
      if (!s.alive) continue;
      s.age += dt;
      if (s.age >= s.life) {
        s.alive = false;
        continue;
      }
      _v.copy(s.pos);
      s.vel.multiplyScalar(Math.exp(-s.drag * dt));
      s.vel.y -= s.gravity * dt;
      s.pos.addScaledVector(s.vel, dt);
      const t = s.age / s.life;
      const alpha = 1 - t * t;
      _v2.copy(s.pos);
      this.beams.push(_v2, _v, s.width * (1 - t * 0.6) * 10, s.color, alpha);
    }

    this.beams.end();

    // Debris.
    let live = 0;
    for (const d of this.debris) {
      if (!d.alive) continue;
      d.age += dt;
      if (d.age >= d.life) {
        d.alive = false;
        continue;
      }
      d.vel.y -= d.gravity * dt;
      d.pos.addScaledVector(d.vel, dt);
      _q.setFromEuler(new THREE.Euler(d.spin.x * dt, d.spin.y * dt, d.spin.z * dt));
      d.quat.multiply(_q);
      const fade = 1 - clamp01((d.age - d.life * 0.7) / (d.life * 0.3));
      _s.setScalar(d.scale * fade);
      _m.compose(d.pos, d.quat, _s);
      this.debrisMesh.setMatrixAt(live, _m);
      live++;
    }
    this.debrisMesh.count = live;
    if (live > 0) this.debrisMesh.instanceMatrix.needsUpdate = true;

    // Impact lights.
    for (const l of this.impactLights) {
      if (l.ttl <= 0) {
        if (l.light.visible) {
          l.light.intensity = 0;
          l.light.visible = false;
        }
        continue;
      }
      l.ttl -= dt;
      const k = clamp01(l.ttl / 0.24);
      l.light.intensity = l.peak * k * k;
      if (l.ttl <= 0) l.light.visible = false;
    }

    this.smoke.update(dt);
    this.glow.update(dt);
  }

  get liveCounts(): { bolts: number; sparks: number; smoke: number; debris: number } {
    return {
      bolts: this.bolts.filter((b) => b.alive).length,
      sparks: this.sparks.filter((s) => s.alive).length,
      smoke: this.smoke.live,
      debris: this.debrisMesh.count,
    };
  }

  dispose(): void {
    this.beams.dispose();
    this.smoke.dispose();
    this.glow.dispose();
    this.debrisMesh.geometry.dispose();
    (this.debrisMesh.material as THREE.Material).dispose();
  }
}

const UNIT_Z = new THREE.Vector3(0, 0, 1);
