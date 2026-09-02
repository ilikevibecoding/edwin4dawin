import * as THREE from 'three';
import { GROUP, groups } from '../core/Physics.js';
import { MODEL_ID, SENSE } from './constants.js';
import { NavGrid } from './NavGrid.js';
import { Enemy } from './Enemy.js';
import { EnemyFx } from './EnemyFx.js';
import { createSharedSoldierAssets } from './SoldierModel.js';
import { getRifleAssets } from './SoldierRifle.js';
import { registerEnemyDebugViews } from './debugViews.js';

const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _down = new THREE.Vector3(0, -1, 0);

/**
 * Enemy soldiers (red team): Soldier.glb models with blended locomotion, upper-body aim, IK-held
 * rifles, bone hitboxes, a tactical state machine and burst fire that damages the player.
 *
 * Visuals: the GLB's tan albedo is remapped at load into a dark tactical palette (SoldierMaterials.js —
 * shared materials, a few tint variants) and every soldier wears a skinned procedural gear set
 * (SoldierGear.js — helmet kit, plate carrier, mags, radio, holster, knee pads, red armband/patch).
 * Per soldier: 5 draw calls (body, visor, gear, rifle metal, rifle furniture), ≈13.8k triangles.
 *
 * Public interface:
 *   async load()
 *   update(dt)
 *   list                       -> Enemy[] { id, position (feet), alive, health, object, team, state, ... }
 *   aliveCount
 *   spawn(spawnPoint, opts?)   -> Enemy      spawnPoint: { position, yaw? }
 *   spawnWave(count)           -> Enemy[]    picks spawns far from / unseen by the player, caps alive at maxAlive
 *   damage(enemy, amount, { point, headshot, source, direction, cause })
 *   stats                      { spawned, killed, shots, hits, unsticks, updateMs }
 *   nav                        NavGrid (A*, cover queries) over world.getNavGraph()
 *
 * Emits: 'enemy:spawned' {enemy}, 'enemy:damaged' {enemy, damage, point, headshot, source, direction},
 *        'enemy:killed' {enemy, position, headshot, source, cause}, 'enemy:fire' {enemy, origin, direction}.
 *
 * Debug views (game.debug): enemy_lineup, enemy_death, enemy_cover, enemy_combat, enemy_closeup*,
 * enemy_death_close, enemy_far, enemy_fire — see debugViews.js.
 */
export class Enemies {
  constructor(game) {
    this.game = game;
    this.events = game.events;
    this.list = [];
    this.root = new THREE.Group();
    this.root.name = 'Enemies';
    game.scene.add(this.root);
    this._nextId = 1;
    this.wave = 0;
    this.maxAlive = 8;
    this.shared = null;
    this.nav = null;
    this.fx = null;
    this.stats = { spawned: 0, killed: 0, shots: 0, hits: 0, unsticks: 0, updateMs: 0 };
    this._recentSpawns = new Map(); // spawn index -> game.time
    this._worldFilter = groups(GROUP.ALL, GROUP.WORLD);
    this._loaded = false;

    this.events.on('weapon:fire', (e) => this._onPlayerFire(e));
    if (game.debug) registerEnemyDebugViews(game);
    else this.events.on('game:ready', () => registerEnemyDebugViews(game));
  }

  async load() {
    const gltf = await this.game.assets.loadModel(MODEL_ID);
    this.shared = createSharedSoldierAssets(this.game, gltf, MODEL_ID);
    getRifleAssets();
    this.nav = new NavGrid(this.game, this.game.world.getNavGraph());
    this.fx = new EnemyFx(this.game);
    this._loaded = true;
    console.info(`[enemies] soldier ready — ${gltf.animations.map((a) => a.name).join('/')} · nav ${this.nav.size} nodes, ${this.nav.coverNodes.length} cover · rifle ${getRifleAssets().triangles} tris · gear ${this.shared.gearTriangles} tris`);
  }

  get aliveCount() {
    let n = 0;
    for (const e of this.list) if (e.alive) n++;
    return n;
  }

  /* ------------------------------------------------------------------------------------------- spawning */

  /**
   * Spawn one soldier at { position, yaw }. opts: { wave, scripted } (scripted = debug pose control).
   */
  spawn(spawnPoint, opts = {}) {
    if (!this._loaded) throw new Error('Enemies.spawn() before load()');
    const src = spawnPoint?.position || new THREE.Vector3();
    const pos = new THREE.Vector3(src.x, src.y, src.z);
    if (opts.jitter) {
      pos.x += (Math.random() - 0.5) * 2 * opts.jitter;
      pos.z += (Math.random() - 0.5) * 2 * opts.jitter;
    }
    const gy = this.groundHeight(pos.x, pos.z, pos.y);
    if (Number.isFinite(gy)) pos.y = gy;
    const yaw = spawnPoint?.yaw ?? Math.atan2(-(this.game.player.position.x - pos.x), -(this.game.player.position.z - pos.z));
    const enemy = new Enemy(this, { id: this._nextId++, position: pos, yaw, wave: opts.wave ?? Math.max(1, this.wave), scripted: opts.scripted || null });
    this.game.render.setupObject(enemy.object);
    this.list.push(enemy);
    this.stats.spawned++;
    this.events.emit('enemy:spawned', { enemy });
    return enemy;
  }

  /** Spawn up to `count` soldiers (respecting maxAlive) at spawns far from and unseen by the player. */
  spawnWave(count = 4) {
    this.wave++;
    const spawned = [];
    const room = Math.max(0, this.maxAlive - this.aliveCount);
    const n = Math.min(count, room);
    if (n <= 0) return spawned;
    const ranked = this._rankSpawns();
    for (let i = 0; i < n; i++) {
      const pick = ranked[i % ranked.length];
      const jitter = i >= ranked.length ? 1.5 : 0.8;
      spawned.push(this.spawn(pick.spawn, { wave: this.wave, jitter }));
      this._recentSpawns.set(pick.index, this.game.time);
    }
    return spawned;
  }

  _rankSpawns() {
    const spawns = this.game.world.getEnemySpawns();
    const player = this.game.player;
    const eye = player.eyePosition;
    const fwd = _v1.set(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
    const now = this.game.time;
    const ranked = spawns.map((spawn, index) => {
      const d = spawn.position.distanceTo(player.position);
      _v2.set(spawn.position.x - player.position.x, 0, spawn.position.z - player.position.z).normalize();
      let score = Math.min(d, 55) * 0.6 + Math.random() * 8;
      if (d < 14) score -= 60;
      if (_v2.dot(fwd) > 0.5 && this._visibleFrom(eye, spawn.position)) score -= 100; // in view
      const used = this._recentSpawns.get(index);
      if (used != null && now - used < 8) score -= 25;
      for (const e of this.list) if (e.alive && e.position.distanceTo(spawn.position) < 3) score -= 10;
      return { spawn, index, score };
    });
    ranked.sort((a, b) => b.score - a.score);
    return ranked;
  }

  _visibleFrom(eye, point) {
    _v2.set(point.x, point.y + 1.2, point.z).sub(eye);
    const d = _v2.length();
    if (d < 0.1) return true;
    _v2.multiplyScalar(1 / d);
    return !this.game.physics.raycast(eye, _v2, d - 0.2, { filter: this._worldFilter });
  }

  /** Ground height (world colliders only). Falls back to `fallback` when nothing is below. */
  groundHeight(x, z, fallback = 0) {
    const hit = this.game.physics.raycast(_v1.set(x, fallback + 3, z), _down, 12, { filter: this._worldFilter });
    return hit ? hit.point.y : fallback;
  }

  /* ------------------------------------------------------------------------------------------- damage */

  damage(enemy, amount, { point = null, headshot = false, source = 'player', direction = null, cause = 'bullet' } = {}) {
    if (!enemy || !enemy.alive || !(amount > 0)) return;
    const killed = enemy.applyDamage(amount, { point, headshot, source, direction, cause });
    this.events.emit('enemy:damaged', { enemy, damage: amount, point, headshot, source, direction });
    if (killed) {
      this.stats.killed++;
      this.events.emit('enemy:killed', { enemy, position: enemy.position.clone(), headshot, source, cause });
    }
  }

  _onPlayerFire() {
    const player = this.game.player;
    if (!player?.alive) return;
    for (const e of this.list) {
      if (!e.alive || !e.brain) continue;
      if (e.position.distanceTo(player.position) < SENSE.hearGunfireDistance) e.brain.hear(player.position);
    }
  }

  /* ------------------------------------------------------------------------------------------- update */

  update(dt) {
    if (!this._loaded) return;
    const t0 = performance.now();
    for (let i = 0; i < this.list.length; i++) this.list[i].update(dt);
    if (dt > 0) this.fx.update();
    this.stats.updateMs = performance.now() - t0;
  }

  _onDisposed(enemy) {
    const i = this.list.indexOf(enemy);
    if (i !== -1) this.list.splice(i, 1);
  }

  /** Remove every soldier (debug/reset). */
  clear() {
    for (const e of [...this.list]) e.dispose();
    this.list.length = 0;
  }

  /** Compact per-soldier snapshot for headless functional tests. */
  snapshot() {
    return this.list.map((e) => ({
      id: e.id,
      state: e.state,
      alive: e.alive,
      health: Math.round(e.health),
      pos: [+e.position.x.toFixed(2), +e.position.y.toFixed(2), +e.position.z.toFixed(2)],
      speed: +e.speed.toFixed(2),
      shots: e.shotsFired,
      hits: e.hits,
      canSee: !!e.brain?.memory.canSee,
      dist: e.brain ? +e.brain.memory.dist.toFixed(1) : null,
      crouch: +(e.model.crouch || 0).toFixed(2),
      aim: +(e.model.aimBlend || 0).toFixed(2),
    }));
  }
}
