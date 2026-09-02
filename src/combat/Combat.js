import * as THREE from 'three';
import { GROUP, groups } from '../core/Physics.js';

/**
 * Hitscan resolution and damage. Listens to 'weapon:fire' and resolves hits against the physics world.
 *
 *   combat.fireRay({ origin, direction, damage, spread, source, maxDistance, weapon, penetration })
 *       -> hit info | null. source 'player' hits WORLD|ENEMY|DEBRIS, 'enemy' hits WORLD|PLAYER|DEBRIS.
 *   combat.explode({ position, radius, damage, source, kind })   // area damage → enemies, player, debris impulse
 *   combat.stats  { shots, hits, kills, headshots, enemyShots, enemyHits, damageDealt, damageTaken }
 *
 * Damage model: distance falloff (full to `falloffStart`, `minFalloff` at `falloffEnd`), hit-zone multipliers
 * (head ×2.2, limb ×0.8), one penetration through thin dynamic props at reduced damage.
 *
 * Emits:
 *   'bullet:hit'     { point, normal, surface, distance, direction, data, entity, source, part, damage, penetrated }
 *   'ui:hitmarker'   { headshot, kill }         when the player damages an enemy
 *   'explosion'      { position, radius, damage, kind, source }
 *   (Enemies.damage emits 'enemy:damaged' / 'enemy:killed'; Player.damage emits 'player:damaged' / 'player:died')
 */
export const DAMAGE_MULTIPLIER = { head: 2.2, body: 1.0, limb: 0.8 };
export const FALLOFF = { start: 30, end: 100, min: 0.6 };
export const PENETRATION = { dynamicDamageScale: 0.75, exitOffset: 0.08, maxHops: 1 };

const _dir = new THREE.Vector3();
const _origin = new THREE.Vector3();
const _right = new THREE.Vector3();
const _up = new THREE.Vector3();
const Y = new THREE.Vector3(0, 1, 0);

export class Combat {
  constructor(game) {
    this.game = game;
    this.events = game.events;
    this.stats = { shots: 0, hits: 0, kills: 0, headshots: 0, enemyShots: 0, enemyHits: 0, damageDealt: 0, damageTaken: 0 };
    this.lastHit = null;
    this._playerFilter = groups(GROUP.ALL, GROUP.WORLD | GROUP.ENEMY | GROUP.DEBRIS);
    this._enemyFilter = groups(GROUP.ALL, GROUP.WORLD | GROUP.PLAYER | GROUP.DEBRIS);

    this.events.on('weapon:fire', (e) => {
      this.fireRay({ origin: e.origin, direction: e.direction, damage: e.weapon?.damage ?? 30, spread: e.spread ?? 0, source: 'player', weapon: e.weapon });
    });
    this.events.on('enemy:killed', (e) => {
      if (e?.source === 'player') {
        this.stats.kills++;
        if (e.headshot) this.stats.headshots++;
      }
    });
  }

  /** Distance falloff factor for a weapon (per-weapon overrides: weapon.falloffStart/falloffEnd/minFalloff). */
  falloff(distance, weapon = null) {
    const start = weapon?.falloffStart ?? FALLOFF.start;
    const end = weapon?.falloffEnd ?? FALLOFF.end;
    const min = weapon?.minFalloff ?? FALLOFF.min;
    if (distance <= start) return 1;
    return THREE.MathUtils.clamp(1 - ((distance - start) / Math.max(1, end - start)) * (1 - min), min, 1);
  }

  /** Resolve a single bullet. Returns hit info or null. */
  fireRay({ origin, direction, damage = 30, spread = 0, source = 'player', maxDistance = 400, weapon = null, penetration = PENETRATION.maxHops, shooter = null }) {
    const dir = _dir.copy(direction).normalize();
    if (spread > 0) {
      const r = Math.sqrt(Math.random()) * spread;
      const a = Math.random() * Math.PI * 2;
      _right.crossVectors(dir, Y);
      if (_right.lengthSq() < 1e-8) _right.set(1, 0, 0);
      _right.normalize();
      _up.crossVectors(_right, dir).normalize();
      dir.addScaledVector(_right, Math.cos(a) * r).addScaledVector(_up, Math.sin(a) * r).normalize();
    }
    const isPlayer = source === 'player';
    if (isPlayer) this.stats.shots++;
    else this.stats.enemyShots++;
    const filter = isPlayer ? this._playerFilter : this._enemyFilter;
    const exclude = isPlayer ? this.game.player.character?.collider : null;

    let start = _origin.copy(origin);
    let travelled = 0;
    let hops = 0;
    let penetrated = false;
    let last = null;
    for (;;) {
      const hit = this.game.physics.raycast(start, dir, maxDistance - travelled, { filter, exclude });
      if (!hit) return last;
      const data = hit.data || {};
      const distance = travelled + hit.distance;
      const part = data.part || null;
      const mult = data.type === 'enemy' ? DAMAGE_MULTIPLIER[part] ?? 1 : 1;
      const dmg = damage * this.falloff(distance, weapon) * mult * (penetrated ? PENETRATION.dynamicDamageScale : 1);
      const info = {
        point: hit.point,
        normal: hit.normal,
        surface: data.surface || 'stone',
        distance,
        direction: dir.clone(),
        data,
        entity: data.entity || null,
        source,
        part,
        damage: dmg,
        penetrated,
        weapon,
      };
      if (data.type === 'enemy' && data.entity) {
        const enemy = data.entity;
        const headshot = part === 'head';
        const wasAlive = enemy.alive;
        this.game.enemies.damage(enemy, dmg, { point: hit.point, headshot, source, direction: dir.clone(), cause: 'bullet' });
        info.surface = 'flesh';
        if (isPlayer) {
          this.stats.hits++;
          this.stats.damageDealt += dmg;
          const kill = wasAlive && !enemy.alive;
          this.events.emit('ui:hitmarker', { headshot, kill });
        }
      } else if (data.type === 'player' && data.entity) {
        if (!isPlayer) {
          this.stats.enemyHits++;
          this.stats.damageTaken += dmg;
          this.game.player.damage(dmg, origin.clone());
        }
      } else if (data.type === 'dynamic') {
        const body = data.body || data.wrapper?.body || hit.collider?.parent?.();
        if (body?.applyImpulseAtPoint) body.applyImpulseAtPoint({ x: dir.x * 2.5, y: dir.y * 2.5, z: dir.z * 2.5 }, hit.point, true);
        this.events.emit('bullet:hit', info);
        this.lastHit = info;
        last = info;
        // Thin props do not stop rifle rounds: continue from just past the surface at reduced damage.
        if (hops < penetration) {
          hops++;
          penetrated = true;
          travelled = distance + PENETRATION.exitOffset;
          start = hit.point.clone().addScaledVector(dir, PENETRATION.exitOffset);
          continue;
        }
        return info;
      }
      this.lastHit = info;
      this.events.emit('bullet:hit', info);
      return info;
    }
  }

  /** Area damage with linear-ish falloff (explosions, air strike). */
  explode({ position, radius = 6, damage = 160, source = 'player', kind = 'bomb' }) {
    const { enemies, player, physics } = this.game;
    let killed = 0;
    let damaged = 0;
    for (const enemy of enemies.list) {
      if (!enemy.alive) continue;
      const d = enemy.position.distanceTo(position);
      if (d < radius) {
        const dmg = damage * (1 - d / radius) ** 0.7;
        const dir = enemy.position.clone().sub(position).setY(0);
        if (dir.lengthSq() < 1e-4) dir.set(Math.random() - 0.5, 0, Math.random() - 0.5);
        dir.normalize();
        const wasAlive = enemy.alive;
        enemies.damage(enemy, dmg, { point: enemy.position.clone().setY(enemy.position.y + 1.0), headshot: false, source, direction: dir, cause: 'explosion' });
        damaged++;
        if (wasAlive && !enemy.alive) killed++;
      }
    }
    if (source === 'player' && damaged > 0) {
      this.stats.hits += damaged;
      this.events.emit('ui:hitmarker', { headshot: false, kill: killed > 0 });
    }
    const pd = player.position.distanceTo(position);
    if (pd < radius * 1.1) {
      const dmg = damage * 0.6 * (1 - pd / (radius * 1.1)) ** 0.8;
      this.stats.damageTaken += dmg;
      player.damage(dmg, position.clone());
    }
    // Push dynamic debris
    physics.overlapSphere(position, radius, (collider, data) => {
      if (data?.type !== 'dynamic') return;
      const body = collider.parent();
      if (!body) return;
      const t = body.translation();
      const dx = t.x - position.x, dy = t.y - position.y + 0.5, dz = t.z - position.z;
      const len = Math.hypot(dx, dy, dz) || 1;
      const f = (1 - Math.min(1, len / radius)) * 6 * body.mass();
      body.applyImpulse({ x: (dx / len) * f, y: (dy / len) * f + f * 0.5, z: (dz / len) * f }, true);
    });
    const shake = THREE.MathUtils.clamp(1 - pd / 40, 0, 1);
    if (shake > 0) this.game.render.shake(0.05 + shake * 0.25, 0.7 + shake * 0.8);
    this.events.emit('explosion', { position: position.clone(), radius, damage, kind, source });
  }

  update() {}
}
