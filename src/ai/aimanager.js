// AI manager: spawns the roster for the chosen difficulty, owns the nav grid,
// routes noise events, alert propagation, line-of-sight (incl. smoke), and
// entity hit-testing for weapons.
import * as THREE from 'three';
import { bus } from '../core/events.js';
import { NavGrid } from './navgrid.js';
import { Enemy } from './enemy.js';
import { Hostage } from './hostage.js';
import { ENEMIES, HOSTAGES, PATROL_POINTS, SPAWN, EXTRACTION, EXTRACTION_WAVE } from '../world/layout.js';

const DIFF_ORDER = { recruit: 0, operative: 1, veteran: 2 };

export class AIManager {
  constructor(game) {
    this.game = game;
    this.nav = new NavGrid(game);
    this.enemies = [];
    this.hostages = [];
    this.group = new THREE.Group();
    this.group.name = 'ai';
    this.frozen = false;
    this._noiseUnsubs = [];
    this._wireNoise();
  }

  buildNav() {
    const seeds = [
      { x: SPAWN.pos.x, y: 0, z: SPAWN.pos.z },
      ...Object.values(PATROL_POINTS).map((p) => ({ x: p.x, y: p.y ?? 0, z: p.z })),
      ...HOSTAGES.map((h) => ({ x: h.pos.x, y: h.pos.y, z: h.pos.z })),
      { x: (EXTRACTION.zone.x0 + EXTRACTION.zone.x1) / 2, y: 0, z: (EXTRACTION.zone.z0 + EXTRACTION.zone.z1) / 2 },
    ];
    this.nav.build(seeds, this.game.world.doors);
    if (this.nav.count < 500) console.warn('[ai] nav grid suspiciously small:', this.nav.count);
  }

  spawnRoster(difficultyName) {
    this.clear();
    this.game.scene.add(this.group);
    const tier = DIFF_ORDER[difficultyName] ?? 1;
    for (const spec of ENEMIES) {
      if ((DIFF_ORDER[spec.min] ?? 0) > tier) continue;
      const first = PATROL_POINTS[spec.route[0]];
      const route = spec.route.map((r) => {
        const p = PATROL_POINTS[r];
        return { x: p.x, y: p.y ?? 0, z: p.z };
      });
      const e = new Enemy(this.game, {
        id: spec.id, outfit: spec.outfit, weapon: spec.weapon, kind: spec.kind,
        pos: { x: first.x, y: first.y ?? 0, z: first.z }, route,
      });
      this.enemies.push(e);
      this.group.add(e.group);
    }
    for (const spec of HOSTAGES) {
      const h = new Hostage(this.game, spec);
      this.hostages.push(h);
      this.group.add(h.group);
    }
  }

  spawnWave(difficultyName) {
    const tier = DIFF_ORDER[difficultyName] ?? 1;
    let n = 0;
    for (const spec of EXTRACTION_WAVE) {
      if (spec.min && (DIFF_ORDER[spec.min] ?? 0) > tier) continue;
      const p = PATROL_POINTS[spec.at];
      const e = new Enemy(this.game, {
        id: 'wave_' + (++n) + '_' + Math.floor(this.game.loop.tick),
        outfit: spec.outfit, weapon: spec.weapon, kind: 'patrol',
        pos: { x: p.x, y: p.y ?? 0, z: p.z },
        route: [{ x: p.x, y: p.y ?? 0, z: p.z }],
      });
      // wave spawns already hunting the extraction zone
      e.sus = 1;
      e.lastSeen = { x: (EXTRACTION.zone.x0 + EXTRACTION.zone.x1) / 2, y: 0, z: (EXTRACTION.zone.z0 + EXTRACTION.zone.z1) / 2 };
      e.lastSeenT = this.game.loop.simTime;
      e.state = 'search';
      this.enemies.push(e);
      this.group.add(e.group);
    }
  }

  spawnEnemyAt(pos, opts = {}) {
    const e = new Enemy(this.game, {
      id: opts.id || 'qa_enemy_' + Math.floor(this.game.loop.tick),
      outfit: opts.outfit || 'merc', weapon: opts.weapon || 'vesper',
      kind: opts.kind || 'guard',
      pos: { ...pos }, route: [{ ...pos }],
    });
    this.enemies.push(e);
    this.group.add(e.group);
    return e;
  }

  clear() {
    for (const e of this.enemies) this.group.remove(e.group);
    for (const h of this.hostages) this.group.remove(h.group);
    this.enemies = [];
    this.hostages = [];
    this.game.scene.remove(this.group);
  }

  update(dt) {
    for (const e of this.enemies) e.update(dt);
    // hostages are not hostile AI: they keep updating even when enemy AI is
    // frozen (QA freeze targets combat determinism, not escort logic)
    for (const h of this.hostages) h.update(dt);
  }

  // ---------------------------------------------------------- vision/sound
  hasLineOfSight(from, to) {
    const dx = to.x - from.x, dy = to.y - from.y, dz = to.z - from.z;
    const dist = Math.hypot(dx, dy, dz);
    if (dist < 0.01) return true;
    const dir = { x: dx / dist, y: dy / dist, z: dz / dist };
    // smoke occlusion
    for (const s of this.game.fx?.smokeZones() || []) {
      if (raySphereHit(from, dir, s, s.r, dist)) return false;
    }
    const hit = this.game.world.collision.raycast(from, dir, dist - 0.1, { mode: 'vision' });
    return !hit;
  }

  noise(pos, loudness, urgent = false) {
    for (const e of this.enemies) {
      if (!e.alive) continue;
      // walls muffle: check rough occlusion, reduce radius if blocked
      let eff = loudness;
      const eEye = { x: e.pos.x, y: e.pos.y + 1.4, z: e.pos.z };
      if (!this.hasLineOfSight(eEye, { x: pos.x, y: (pos.y ?? 0) + 1.2, z: pos.z })) eff *= 0.6;
      e.hearNoise(pos, eff, urgent);
    }
  }

  broadcastAlert(pos, source, radius = 16) {
    for (const e of this.enemies) {
      if (e === source || !e.alive) continue;
      const d = Math.hypot(e.pos.x - pos.x, e.pos.z - pos.z) + Math.abs(e.pos.y - pos.y) * 2;
      if (d < radius) e.alertTo(pos);
    }
  }

  flashAt(pos, radius = 9) {
    // blind enemies with LOS to the flash
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const d = Math.hypot(e.pos.x - pos.x, e.pos.y + 1.5 - pos.y, e.pos.z - pos.z);
      if (d > radius) continue;
      const eye = e.eyePos();
      if (this.hasLineOfSight(eye, pos)) e.onFlash(1 - d / radius);
    }
    // player too
    const p = this.game.player;
    const pd = Math.hypot(p.pos.x - pos.x, p.pos.y + 1.5 - pos.y, p.pos.z - pos.z);
    if (pd < radius && this.hasLineOfSight(p.eyePos(), pos)) {
      // reduced if looking away
      const look = p.lookDir();
      const toFlash = { x: pos.x - p.pos.x, y: 0, z: pos.z - p.pos.z };
      const l = Math.hypot(toFlash.x, toFlash.z) || 1;
      const dot = (look.x * toFlash.x + look.z * toFlash.z) / l;
      const facing = Math.max(0.25, (dot + 1) / 2);
      p.flashAmount = Math.min(1, Math.max(p.flashAmount, (1 - pd / radius) * facing * 1.4));
    }
  }

  requestHostagePath(hostage, target) {
    const path = this.nav.findPath(hostage.pos, target);
    if (path) { hostage.path = path; hostage.pathIdx = 0; }
  }

  // hit-test all entities along a ray; returns nearest {entity, dist, part}
  raycastEntities(origin, dir, maxDist, opts = {}) {
    let best = null;
    for (const e of this.enemies) {
      if (!e.alive && !opts.corpses) continue;
      const h = e.hitTest(origin, dir, maxDist);
      if (h && (!best || h.dist < best.dist)) best = { entity: e, ...h };
    }
    for (const h of this.hostages) {
      if (!h.alive) continue;
      const t = h.hitTest(origin, dir, maxDist);
      if (t && (!best || t.dist < best.dist)) best = { entity: h, ...t };
    }
    return best;
  }

  aliveEnemies() { return this.enemies.filter((e) => e.alive); }

  visibleEnemies() {
    // enemies the player could plausibly see (for state text)
    const p = this.game.player;
    const eye = p.eyePos();
    return this.enemies.filter((e) => {
      if (!e.alive) return false;
      const d = Math.hypot(e.pos.x - eye.x, e.pos.z - eye.z);
      if (d > 45) return false;
      return this.hasLineOfSight(eye, { x: e.pos.x, y: e.pos.y + 1.3, z: e.pos.z });
    });
  }

  _wireNoise() {
    this._noiseUnsubs.push(
      bus.on('weapon-fired', (e) => this.noise(e.pos, 46, true)),
      bus.on('footstep', (e) => { if (e.who === 'player' && e.gait === 'run') this.noise(e.pos, 8); }),
      bus.on('glass-break', (e) => this.noise(e.pos, 26, true)),
      bus.on('door-opening', (d) => this.noise(d.center(), d.style?.shutter ? 26 : 7, d.style?.shutter)),
      bus.on('throwable-detonate', (e) => {
        if (e.effect === 'flash') { this.flashAt({ x: e.pos.x, y: e.pos.y + 0.4, z: e.pos.z }); this.noise(e.pos, 40, true); }
        else this.noise(e.pos, 18, true);
      }),
    );
  }
}

function raySphereHit(o, d, c, r, maxDist) {
  const ox = o.x - c.x, oy = o.y - c.y, oz = o.z - c.z;
  const b = ox * d.x + oy * d.y + oz * d.z;
  const cc = ox * ox + oy * oy + oz * oz - r * r;
  const disc = b * b - cc;
  if (disc < 0) return false;
  const t = -b - Math.sqrt(disc);
  return t >= 0 && t <= maxDist;
}
