import * as THREE from 'three';
import { GROUP, groups } from '../core/Physics.js';

/**
 * Hitscan resolution and damage. Listens to 'weapon:fire' and resolves hits against the physics world.
 *
 *   combat.fireRay({ origin, direction, damage, spread, penetration, source })
 *   combat.explode({ position, radius, damage, source, kind })   // area damage → enemies, player, physics impulse
 *
 * Emits:
 *   'bullet:hit'     { point, normal, surface, distance, direction, data, entity? }
 *   'enemy:damaged'  { enemy, damage, point, headshot, source }
 *   'enemy:killed'   { enemy, position, headshot, source, cause }
 *   'explosion'      { position, radius, damage, kind, source }
 */
export class Combat {
  constructor(game) {
    this.game = game;
    this.events = game.events;
    this._tmpDir = new THREE.Vector3();
    this._tmpOrigin = new THREE.Vector3();
    this.events.on('weapon:fire', (e) => {
      this.fireRay({ origin: e.origin, direction: e.direction, damage: e.weapon?.damage ?? 30, spread: e.spread ?? 0, source: 'player', weapon: e.weapon });
    });
    this.stats = { shots: 0, hits: 0, kills: 0, headshots: 0 };
    this.lastHit = null;
  }

  /** Resolve a single bullet. Returns hit info or null. */
  fireRay({ origin, direction, damage = 30, spread = 0, source = 'player', maxDistance = 400, weapon = null }) {
    const dir = this._tmpDir.copy(direction).normalize();
    if (spread > 0) {
      const r = Math.sqrt(Math.random()) * spread;
      const a = Math.random() * Math.PI * 2;
      const right = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();
      const up = new THREE.Vector3().crossVectors(right, dir).normalize();
      dir.addScaledVector(right, Math.cos(a) * r).addScaledVector(up, Math.sin(a) * r).normalize();
    }
    this.stats.shots++;
    const filter = source === 'player' ? groups(GROUP.ALL, GROUP.WORLD | GROUP.ENEMY | GROUP.DEBRIS) : groups(GROUP.ALL, GROUP.WORLD | GROUP.PLAYER | GROUP.DEBRIS);
    const hit = this.game.physics.raycast(origin, dir, maxDistance, { filter, exclude: source === 'player' ? this.game.player.character?.collider : null });
    if (!hit) return null;
    const data = hit.data || {};
    const info = {
      point: hit.point,
      normal: hit.normal,
      surface: data.surface || 'stone',
      distance: hit.distance,
      direction: dir.clone(),
      data,
      entity: data.entity || null,
      source,
    };
    // Falloff: full damage to 30m, 60% at 100m+
    const falloff = THREE.MathUtils.clamp(1 - (hit.distance - 30) / 120, 0.6, 1);
    const dmg = damage * falloff;
    if (data.type === 'enemy' && data.entity) {
      this.stats.hits++;
      const headshot = data.part === 'head';
      this.game.enemies.damage(data.entity, headshot ? dmg * 2.2 : data.part === 'limb' ? dmg * 0.8 : dmg, { point: hit.point, headshot, source, direction: dir.clone() });
      info.surface = 'flesh';
    } else if (data.type === 'player' && data.entity) {
      this.game.player.damage(dmg, origin.clone());
    } else if (data.type === 'dynamic' && data.object) {
      const body = data.body || data.wrapper?.body;
      if (body) body.applyImpulseAtPoint({ x: dir.x * 2.5, y: dir.y * 2.5, z: dir.z * 2.5 }, hit.point, true);
    }
    this.lastHit = info;
    this.events.emit('bullet:hit', info);
    return info;
  }

  /** Area damage with linear falloff. */
  explode({ position, radius = 6, damage = 160, source = 'player', kind = 'bomb' }) {
    const { enemies, player, physics } = this.game;
    for (const enemy of enemies.list) {
      if (!enemy.alive) continue;
      const d = enemy.position.distanceTo(position);
      if (d < radius) {
        const dmg = damage * (1 - d / radius) ** 0.7;
        const dir = enemy.position.clone().sub(position).normalize();
        enemies.damage(enemy, dmg, { point: enemy.position.clone(), headshot: false, source, direction: dir, cause: 'explosion' });
      }
    }
    const pd = player.position.distanceTo(position);
    if (pd < radius * 1.1) {
      const dmg = damage * 0.6 * (1 - pd / (radius * 1.1)) ** 0.8;
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
