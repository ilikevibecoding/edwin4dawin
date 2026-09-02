import * as THREE from 'three';
import { createParticleAtlas, createDecalAtlas, DECALS } from './textures.js';
import { ParticleSystem } from './ParticleSystem.js';
import { FxLights } from './FxLights.js';
import { MuzzleFlash } from './MuzzleFlash.js';
import { Tracers } from './Tracers.js';
import { Decals } from './Decals.js';
import { Rings } from './Rings.js';
import { Impacts } from './Impacts.js';
import { Casings } from './Casings.js';
import { Debris } from './Debris.js';
import { Explosions } from './Explosions.js';
import { Blood } from './Blood.js';
import { Ambient } from './Ambient.js';
import { registerFxDebugViews } from './debugViews.js';

const DECAL_TYPES = {
  stone: DECALS.HOLE_STONE, concrete: DECALS.HOLE_STONE, brick: DECALS.HOLE_STONE, plaster: DECALS.HOLE_PLASTER,
  metal: DECALS.DENT_METAL, wood: DECALS.HOLE_WOOD, glass: DECALS.GLASS_WEB, dirt: DECALS.HOLE_DIRT, sand: DECALS.HOLE_DIRT,
  scorch: DECALS.SCORCH, blood: DECALS.BLOOD_SPLAT,
};

/**
 * Visual effects orchestrator (VFX team). Sub-systems live in src/fx/*:
 *   ParticleSystem (one instanced, depth-sorted, sun-lit sprite batch), Decals (instanced oriented quads),
 *   MuzzleFlash, Tracers, Impacts, Casings (Rapier), Debris (Rapier), Explosions, Blood, Rings, Ambient, FxLights.
 *
 * Public interface (kept from the stub):
 *   async load(); update(dt)
 *   muzzleFlash(position, direction)           'weapon:fire'
 *   impact(point, normal, surface, direction)  'bullet:hit'
 *   explosion(position, radius, kind)          'explosion'
 *   tracer(from, to)                           (+ automatic: every 3rd player shot, every 'enemy:fire')
 *   spawnCasing(position, velocity, angularVelocity)   'weapon:casing'
 *   decal(point, normal, type, size)
 *   blood(point, direction)                    'enemy:damaged'
 *
 * Density scales with game.settings.quality.particles; casings/debris are capped by quality.maxCasings/maxDebris.
 */
export class Effects {
  constructor(game) {
    this.game = game;
    this.events = game.events;
    this.root = new THREE.Group();
    this.root.name = 'Effects';
    game.scene.add(this.root);
    this.density = game.settings.quality.particles ?? 1;
    this.particles = null;
    this.lights = new FxLights(game, 5);
    this.ready = false;

    this.events.on('weapon:fire', (e) => {
      this.muzzleFlash(e.muzzle, e.direction, e);
      this.tracers?.onPlayerFire(e);
    });
    this.events.on('weapon:casing', (e) => this.spawnCasing(e.position, e.velocity, e.angularVelocity));
    this.events.on('enemy:fire', (e) => this.tracers?.onEnemyFire(e));
    this.events.on('bullet:hit', (e) => {
      this.tracers?.onHit(e);
      if (e.surface !== 'flesh') this.impact(e.point, e.normal, e.surface, e.direction, e);
    });
    this.events.on('enemy:damaged', (e) => this.blood(e.point, e.direction, e));
    this.events.on('explosion', (e) => this.explosion(e.position, e.radius, e.kind));
    this.events.on('game:ready', () => registerFxDebugViews(game));
  }

  async load() {
    this.atlas = createParticleAtlas(256);
    this.decalAtlas = createDecalAtlas(256);
    this.particles = new ParticleSystem(this.game, this.atlas, { capacity: 4096 });
    this.root.add(this.particles.mesh);
    this.decals = new Decals(this.game, this.decalAtlas, { capacity: 250, lifetime: 60, fadeTime: 8 });
    this.root.add(this.decals.mesh);
    this.rings = new Rings(this, 8);
    this.flash = new MuzzleFlash(this);
    this.tracers = new Tracers(this);
    this.impacts = new Impacts(this);
    this.casings = new Casings(this);
    this.debris = new Debris(this);
    this.explosions = new Explosions(this);
    this.bloodFx = new Blood(this);
    this.ambient = new Ambient(this);
    this.ready = true;
  }

  muzzleFlash(position, direction) {
    if (!this.ready) return;
    if (!position) position = this.game.weapons?.getMuzzleWorldPosition?.(new THREE.Vector3()) || this.game.player.eyePosition;
    this.flash.fire(position, direction || this.game.player.forward);
  }

  impact(point, normal, surface = 'stone', direction = null, data = null) {
    if (!this.ready || !point) return;
    this.impacts.hit(point, normal, surface, direction, data);
  }

  explosion(position, radius = 6, kind = 'bomb') {
    if (!this.ready || !position) return;
    this.explosions.explode(position, radius, kind);
  }

  tracer(from, to) {
    if (!this.ready) return;
    this.tracers.fire(from, to);
  }

  spawnCasing(position, velocity, angularVelocity) {
    if (!this.ready) return;
    this.casings.spawn(position, velocity, angularVelocity);
  }

  /** Generic decal by type name ('stone'|'metal'|'wood'|'glass'|'scorch'|'blood'|'dirt'|'plaster'), size in meters. */
  decal(point, normal, type = 'stone', size = 0.12, opts = {}) {
    if (!this.ready || !point) return;
    const cell = typeof type === 'number' ? type : (DECAL_TYPES[type] ?? DECALS.HOLE_STONE);
    this.decals.add(point, normal || new THREE.Vector3(0, 1, 0), cell, size, opts);
  }

  blood(point, direction, info = null) {
    if (!this.ready || !point) return;
    this.bloodFx.hit(point, direction, { headshot: !!info?.headshot, amount: info?.damage ?? 1 });
  }

  /** Rough per-frame cost figures for the debug overlay / report. */
  get stats() {
    return {
      particles: this.particles?.count ?? 0,
      particlePeak: this.particles?.stats.peak ?? 0,
      decals: this.decals?.count ?? 0,
      casings: this.casings?.items.length ?? 0,
      debris: this.debris?.items.length ?? 0,
    };
  }

  update(dt) {
    if (!this.ready) return;
    this.flash.update(dt);
    this.casings.update(dt);
    this.debris.update(dt);
    this.explosions.update(dt);
    this.ambient.update(dt);
    this.rings.update(dt);
    this.decals.update(dt);
    this.lights.update(dt);
    this.particles.update(dt, this.game.camera);
  }
}
