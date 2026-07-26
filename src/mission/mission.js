import * as THREE from 'three';
import { Enemy, AI_STATE } from '../ai/enemy.js';
import { Hostage, HOSTAGE_STATE } from '../ai/hostage.js';
import { HOSTAGE_SPOTS, EXTRACTION_ZONE, CHECKPOINTS, roomAt } from '../map/layout.js';
import { bus, EV } from '../core/events.js';
import { makeRng, reseedGameplay } from '../core/rng.js';
import { HOSTILE_VARIANTS } from '../characters/models.js';

/**
 * MISSION DIRECTOR — objectives, round flow, spawning and reset.
 * Owner: Opus 3.
 *
 * Objective chain:
 *   0 infiltrate  → reach the reception lobby
 *   1 locate      → find both hostages
 *   2 secure      → secure both hostages
 *   3 escort      → bring them to the extraction garage
 *   4 extract     → hold the extraction zone until the vehicle arrives
 *   → victory
 * Defeat: player death, mission clock expiry, or both hostages down.
 *
 * Reset is total: enemies, hostages, doors, glass, ammunition, timer, effects,
 * decals, objective state and the RNG stream all return to their initial value
 * with no reload, which is what "checkpoint-free clean retries" requires.
 */

/** Garrison plan: room, count weighting, patrol route and variant bias. */
const GARRISON = [
  { room: 'lobby', weight: 2.2, variants: ['kestrel.assault', 'kestrel.warden'], patrol: ['lobby', 'northcorr', 'waiting'] },
  { room: 'vestibule', weight: 0.9, variants: ['kestrel.scout'], patrol: ['vestibule', 'lobby'] },
  { room: 'waiting', weight: 0.9, variants: ['kestrel.scout'], patrol: ['waiting', 'lobby'] },
  { room: 'northcorr', weight: 1.6, variants: ['kestrel.assault'], patrol: ['northcorr', 'openplan', 'westcorr'] },
  { room: 'openplanA', weight: 2.4, variants: ['kestrel.assault', 'kestrel.scout'], patrol: ['openplan', 'northcorr', 'southcorr'] },
  { room: 'openplanB', weight: 1.2, variants: ['kestrel.assault'], patrol: ['openplan', 'westcorr'] },
  { room: 'conference', weight: 1.8, variants: ['kestrel.heavy', 'kestrel.warden'], patrol: ['conference'], guard: 'hostage.dana' },
  { room: 'breakroom', weight: 1.0, variants: ['kestrel.scout'], patrol: ['breakroom', 'eastcorr'] },
  { room: 'midcorr', weight: 1.0, variants: ['kestrel.assault'], patrol: ['midcorr', 'copy', 'restroom'] },
  { room: 'server', weight: 0.9, variants: ['kestrel.heavy'], patrol: ['server', 'midcorr'] },
  { room: 'it', weight: 0.8, variants: ['kestrel.scout'], patrol: ['it', 'westcorr'] },
  { room: 'archive', weight: 0.7, variants: ['kestrel.assault'], patrol: ['archive', 'northcorr'] },
  { room: 'southcorr', weight: 1.1, variants: ['kestrel.assault'], patrol: ['southcorr', 'eastcorr', 'openplan'] },
  { room: 'eastcorr', weight: 1.0, variants: ['kestrel.assault'], patrol: ['eastcorr', 'garage', 'loading'] },
  { room: 'garage', weight: 1.6, variants: ['kestrel.heavy', 'kestrel.assault'], patrol: ['garage', 'eastcorr'] },
  { room: 'loading', weight: 1.0, variants: ['kestrel.assault'], patrol: ['loading', 'eastcorr'] },
  { room: 'stairwell', weight: 0.8, variants: ['kestrel.scout'], patrol: ['stairwell', 'midcorr', 'southcorr'] },
  { room: 'execcorr', weight: 1.4, variants: ['kestrel.warden'], patrol: ['execcorr', 'mezz', 'execante'] },
  { room: 'exec', weight: 1.8, variants: ['kestrel.heavy', 'kestrel.warden'], patrol: ['exec'], guard: 'hostage.milo' },
  { room: 'execante', weight: 1.1, variants: ['kestrel.assault'], patrol: ['execante', 'execcorr', 'exec'] },
  { room: 'boardroom', weight: 0.9, variants: ['kestrel.assault'], patrol: ['boardroom', 'execcorr'] },
  { room: 'records2', weight: 0.8, variants: ['kestrel.scout'], patrol: ['records2', 'execspine'] },
  { room: 'mezz', weight: 1.0, variants: ['kestrel.scout'], patrol: ['mezz', 'execcorr'] },
  { room: 'execlounge', weight: 0.7, variants: ['kestrel.assault'], patrol: ['execlounge', 'execgal'] },
  { room: 'mechanical', weight: 0.6, variants: ['kestrel.assault'], patrol: ['mechanical', 'northcorr'] },
];

export const OBJECTIVES = [
  {
    id: 'infiltrate', title: 'Infiltrate the building',
    detail: 'Cross the courtyard and enter through the employee entrance.',
  },
  {
    id: 'locate', title: 'Locate both hostages',
    detail: 'Two Northstar staff are being held. Sweep the floors and find them.',
  },
  {
    id: 'secure', title: 'Secure both hostages',
    detail: 'Approach each hostage and press E to take them under your protection.',
  },
  {
    id: 'escort', title: 'Escort the hostages to extraction',
    detail: 'Lead them to the extraction garage on the east side of the building.',
  },
  {
    id: 'extract', title: 'Hold the extraction point',
    detail: 'Stay inside the marked bay with both hostages until the vehicle clears the area.',
  },
];

export const MISSION_STATE = {
  READY: 'ready', ACTIVE: 'active', VICTORY: 'victory', DEFEAT: 'defeat',
};

export class Mission {
  constructor(opts) {
    this.scene = opts.scene;
    this.level = opts.level;
    this.player = opts.player;
    this.combat = opts.combat;
    this.vfx = opts.vfx ?? null;
    this.audio = opts.audio ?? null;
    this.difficulty = opts.difficulty;
    this.seed = opts.seed ?? 0x4e6f7274;

    this.group = new THREE.Group();
    this.group.name = 'actors';
    this.scene.add(this.group);

    this.enemies = [];
    this.hostages = [];
    this.smokeVolumes = [];
    this.state = MISSION_STATE.READY;
    this.objectiveIndex = 0;
    this.timeRemaining = this.difficulty.missionSeconds;
    this.elapsed = 0;
    this.alarm = false;
    this.alarmTime = 0;
    this.extractionActive = false;
    this.extractionTimer = 0;
    this.extractionRequired = 4.0;
    this.aiFrozen = false;
    this.result = null;
    this.stats = { shotsFired: 0, shotsHit: 0, kills: 0, damageTaken: 0, hostagesExtracted: 0, time: 0 };
    this.announcements = [];

    this.extractionPoint = new THREE.Vector3(
      (EXTRACTION_ZONE.x0 + EXTRACTION_ZONE.x1) / 2,
      EXTRACTION_ZONE.y,
      (EXTRACTION_ZONE.z0 + EXTRACTION_ZONE.z1) / 2,
    );

    this._bind();
  }

  _bind() {
    bus.on(EV.NOISE, (n) => {
      if (this.state !== MISSION_STATE.ACTIVE || this.aiFrozen) return;
      for (const e of this.enemies) e.hear(n);
      if (n.kind === 'gunshot' && n.source === 'player') this.raiseAlarm();
    });
    bus.on('ai:contact', () => this.raiseAlarm());
    bus.on(EV.FLASH_DETONATE, ({ pos, radius, duration }) => {
      for (const e of this.enemies) e.applyFlash(pos, radius, duration);
      const d = this.player.position.distanceTo(pos);
      if (d < radius) {
        const facing = Math.max(0, this.player.lookDirection.dot(pos.clone().sub(this.player.eyePosition).normalize()));
        this.playerFlash = (1 - d / radius) * (0.3 + facing * 0.7) * duration;
      }
    });
    bus.on(EV.SMOKE_DETONATE, ({ handle, duration }) => {
      if (!handle) return;
      this.smokeVolumes.push(handle);
      setTimeout(() => {
        const i = this.smokeVolumes.indexOf(handle);
        if (i >= 0) this.smokeVolumes.splice(i, 1);
      }, duration * 1000 + 800);
    });
    bus.on(EV.PLAYER_DAMAGED, ({ amount }) => { this.stats.damageTaken += amount; });
    bus.on(EV.PLAYER_DIED, () => this.end(false, 'Operator down'));
  }

  /* ---------------- Build & reset ---------------- */

  build() {
    reseedGameplay(this.seed);
    const rng = makeRng(this.seed);
    for (const spot of HOSTAGE_SPOTS) {
      const h = new Hostage(spot, { nav: this.level.nav, level: this.level, audio: this.audio, vfx: this.vfx });
      this.hostages.push(h);
      this.group.add(h.group);
    }
    this.spawnGarrison(rng);
    this.registerRaycast();
    return this;
  }

  registerRaycast() {
    // Characters are raycast through their own hitbox spheres, not the mesh BVH,
    // so they are deliberately NOT added to the collision raycast targets.
  }

  spawnGarrison(rng) {
    const target = this.difficulty.enemyCount;
    const totalWeight = GARRISON.reduce((s, g) => s + g.weight, 0);
    const plan = [];
    for (const g of GARRISON) {
      const n = Math.max(g.guard ? 1 : 0, Math.round((g.weight / totalWeight) * target));
      for (let i = 0; i < n; i++) plan.push(g);
    }
    // Trim or pad to the exact count
    while (plan.length > target) {
      const idx = plan.findIndex((g) => !g.guard);
      if (idx < 0) break;
      plan.splice(idx, 1);
    }
    while (plan.length < target) plan.push(GARRISON[rng.int(0, GARRISON.length - 1)]);

    let i = 0;
    for (const g of plan) {
      const pos = this.pickSpawn(g, rng, i);
      if (!pos) continue;
      const variant = g.variants[rng.int(0, g.variants.length - 1)] ?? 'kestrel.assault';
      const patrol = this.buildPatrolRoute(g.patrol, rng);
      const e = new Enemy({
        id: `hostile.${String(i).padStart(2, '0')}`,
        variant,
        head: HEAD_POOL[i % HEAD_POOL.length],
        pos: [pos.x, pos.y, pos.z],
        yaw: rng() * Math.PI * 2,
        seed: this.seed + i * 131,
        room: g.room,
        patrol,
        difficulty: this.difficulty,
        nav: this.level.nav,
        level: this.level,
        vfx: this.vfx,
        audio: this.audio,
        weapon: pickWeapon(variant, rng),
      });
      if (g.guard) {
        e.guarding = g.guard;
        e.patrolRoute = [];
        e.homeRoom = g.room;
      }
      this.enemies.push(e);
      this.group.add(e.group);
      i++;
    }
    this.initialSpawns = this.enemies.map((e) => ({
      id: e.id, pos: e.position.clone(), yaw: e.yaw, variant: e.variantId,
    }));
  }

  pickSpawn(g, rng, index) {
    const nav = this.level.nav;
    const pts = nav.pointsInRoom(g.room, 12, rng);
    for (const p of pts) {
      const tooClose = this.enemies.some((e) => e.position.distanceTo(p) < 1.6);
      const nearHostage = this.hostages.some((h) => h.position.distanceTo(p) < 1.4);
      const nearSpawn = p.distanceTo(new THREE.Vector3(...CHECKPOINTS.spawn.pos)) < 16;
      if (!tooClose && !nearHostage && !nearSpawn) return p;
    }
    return pts[index % Math.max(1, pts.length)] ?? nav.randomPoint(rng, (n) => n.room === g.room);
  }

  buildPatrolRoute(rooms, rng) {
    const out = [];
    for (const r of rooms ?? []) {
      const key = r === 'openplan' ? 'openplanA' : r;
      const pts = this.level.nav.pointsInRoom(key, 3, rng);
      if (pts.length) out.push(pts[0]);
    }
    return out;
  }

  start() {
    this.state = MISSION_STATE.ACTIVE;
    this.objectiveIndex = 0;
    this.timeRemaining = this.difficulty.missionSeconds;
    this.elapsed = 0;
    bus.emit(EV.MISSION_START, { difficulty: this.difficulty.id });
    bus.emit(EV.OBJECTIVE_UPDATE, this.objectiveState());
  }

  reset() {
    reseedGameplay(this.seed);
    for (const e of this.enemies) {
      const init = this.initialSpawns.find((s) => s.id === e.id);
      e.alive = true;
      e.health = e.maxHealth;
      e.armor = e.variantId === 'kestrel.heavy' ? 55 : 22;
      e.state = AI_STATE.PATROL;
      e.stateTime = 0;
      e.stateTimeGlobal = 0;
      e.awareness = 0;
      e.alerted = false;
      e.contactCalled = false;
      e.lastKnownTarget = null;
      e.lastSeenTime = -99;
      e.path = null;
      e.pathIndex = 0;
      e.coverSpot = null;
      e.magazine = e.magazineSize;
      e.reloadUntil = 0;
      e.blindUntil = 0;
      e.searchPoints = [];
      e.patrolIndex = 0;
      e.patrolWaitUntil = 0;
      e.frozen = false;
      if (init) { e.position.copy(init.pos); e.yaw = init.yaw; }
      e.group.position.copy(e.position);
      e.group.visible = true;
      e.animator.reset?.();
      e.animator.play('idle');
    }
    for (const h of this.hostages) h.reset();
    this.smokeVolumes.length = 0;
    this.state = MISSION_STATE.ACTIVE;
    this.objectiveIndex = 0;
    this.timeRemaining = this.difficulty.missionSeconds;
    this.elapsed = 0;
    this.alarm = false;
    this.alarmTime = 0;
    this.extractionActive = false;
    this.extractionTimer = 0;
    this.result = null;
    this.playerFlash = 0;
    this.stats = { shotsFired: 0, shotsHit: 0, kills: 0, damageTaken: 0, hostagesExtracted: 0, time: 0 };
    bus.emit(EV.MISSION_RESET, {});
    bus.emit(EV.OBJECTIVE_UPDATE, this.objectiveState());
  }

  setDifficulty(d) {
    this.difficulty = d;
    for (const e of this.enemies) e.difficulty = d;
    this.timeRemaining = d.missionSeconds;
  }

  /* ---------------- Flow ---------------- */

  raiseAlarm() {
    if (this.alarm) return;
    this.alarm = true;
    this.alarmTime = this.elapsed;
    bus.emit(EV.ANNOUNCE, { text: 'Contact reported. The building is alerted.', kind: 'warn' });
    this.audio?.setMusic?.('combat');
    // Nearby hostiles converge on the last known player position
    for (const e of this.enemies) {
      if (!e.alive) continue;
      if (e.position.distanceTo(this.player.position) < 34) {
        e.lastKnownTarget = this.player.position.clone();
        e.alerted = true;
        if (e.state === AI_STATE.PATROL || e.state === AI_STATE.IDLE) e.enterState(AI_STATE.INVESTIGATE);
      }
    }
  }

  get currentObjective() {
    return OBJECTIVES[Math.min(this.objectiveIndex, OBJECTIVES.length - 1)];
  }

  objectiveState() {
    const o = this.currentObjective;
    return {
      id: o.id, title: o.title, detail: o.detail,
      step: this.objectiveIndex + 1, total: OBJECTIVES.length,
    };
  }

  advanceObjective(index) {
    if (index <= this.objectiveIndex) return;
    this.objectiveIndex = index;
    const o = this.currentObjective;
    bus.emit(EV.OBJECTIVE_UPDATE, this.objectiveState());
    bus.emit(EV.ANNOUNCE, { text: `${o.title} — ${o.detail}`, kind: 'objective' });
    this.audio?.play('ui.objective', { volume: 0.7 });
  }

  setObjective(idOrIndex) {
    const idx = typeof idOrIndex === 'number' ? idOrIndex : OBJECTIVES.findIndex((o) => o.id === idOrIndex);
    if (idx < 0) return false;
    this.objectiveIndex = idx;
    bus.emit(EV.OBJECTIVE_UPDATE, this.objectiveState());
    return true;
  }

  end(victory, reason) {
    if (this.state === MISSION_STATE.VICTORY || this.state === MISSION_STATE.DEFEAT) return;
    this.state = victory ? MISSION_STATE.VICTORY : MISSION_STATE.DEFEAT;
    this.result = { victory, reason, time: this.elapsed };
    this.stats.time = this.elapsed;
    this.stats.shotsFired = this.combat?.stats.shotsFired ?? 0;
    this.stats.shotsHit = this.combat?.stats.shotsHit ?? 0;
    this.stats.kills = this.combat?.stats.kills ?? 0;
    this.stats.hostagesExtracted = this.hostages.filter((h) => h.state === HOSTAGE_STATE.EXTRACTED).length;
    this.vfx?.screenWash?.(victory ? 'victory' : 'defeat', 1.2);
    this.audio?.play(victory ? 'ui.victory' : 'ui.defeat', { volume: 0.9 });
    this.audio?.setMusic?.(victory ? 'victory' : 'defeat');
    bus.emit(EV.MISSION_END, { victory, reason, stats: { ...this.stats } });
  }

  /* ---------------- Frame ---------------- */

  update(dt) {
    if (this.state !== MISSION_STATE.ACTIVE) {
      for (const e of this.enemies) e.update(dt, { player: this.player, smokeVolumes: this.smokeVolumes });
      return;
    }
    this.elapsed += dt;
    this.timeRemaining = Math.max(0, this.difficulty.missionSeconds - this.elapsed);

    const ctx = {
      player: this.player,
      smokeVolumes: this.smokeVolumes,
      alarm: this.alarm,
      extractionActive: this.extractionActive,
      extractionPoint: this.extractionPoint,
    };

    if (!this.aiFrozen) {
      for (const e of this.enemies) e.update(dt, ctx);
    }
    for (const h of this.hostages) h.update(dt, ctx);

    /* ---- Objective progression ---- */
    const room = roomAt(this.player.position.x, this.player.position.z, this.player.floor);
    if (this.objectiveIndex === 0 && room && ['lobby', 'vestibule', 'northcorr'].includes(room.id)) {
      this.advanceObjective(1);
    }
    const located = this.hostages.filter((h) => h.discovered).length;
    if (this.objectiveIndex === 1 && located >= this.hostages.length) this.advanceObjective(2);
    const secured = this.hostages.filter((h) => h.secured || !h.alive).length;
    if (this.objectiveIndex >= 1 && this.objectiveIndex < 3 && secured >= this.hostages.length) this.advanceObjective(3);

    const living = this.hostages.filter((h) => h.alive);
    const escorted = living.filter((h) => h.secured);
    const allInZone = living.length > 0 && living.every((h) => h.inExtractionZone() || h.state === HOSTAGE_STATE.EXTRACTED);
    const playerInZone = this.playerInExtractionZone();

    if (this.objectiveIndex === 3 && escorted.length === living.length && living.length > 0
      && this.player.position.distanceTo(this.extractionPoint) < 14) {
      this.advanceObjective(4);
    }

    if (this.objectiveIndex >= 3 && allInZone && playerInZone && escorted.length === living.length) {
      if (!this.extractionActive) {
        this.extractionActive = true;
        bus.emit(EV.ANNOUNCE, { text: 'Extraction vehicle inbound. Hold the bay.', kind: 'objective' });
        this.audio?.play('ui.countdown', { volume: 0.8 });
      }
      this.extractionTimer += dt;
      if (this.extractionTimer >= this.extractionRequired) {
        for (const h of living) h.markExtracted();
        this.end(true, 'All hostages extracted');
      }
    } else if (this.extractionActive) {
      this.extractionActive = false;
      this.extractionTimer = Math.max(0, this.extractionTimer - dt * 2);
    }

    /* ---- Failure conditions ---- */
    if (this.timeRemaining <= 0) this.end(false, 'Mission clock expired');
    if (this.hostages.length && this.hostages.every((h) => !h.alive)) this.end(false, 'Both hostages lost');

    /* ---- Hostage execution on higher difficulties ---- */
    if (this.difficulty.allowHostageExecution && this.alarm) {
      const openAlarm = this.elapsed - this.alarmTime;
      if (openAlarm > this.difficulty.hostageExecutionDelay) {
        const victim = this.hostages.find((h) => h.alive && h.state === HOSTAGE_STATE.HELD);
        const guard = victim ? this.enemies.find((e) => e.alive && e.guarding === victim.id) : null;
        if (victim && guard && guard.position.distanceTo(victim.position) < 12) {
          victim.damage(200, { byPlayer: false });
          bus.emit(EV.ANNOUNCE, { text: `${victim.name} has been executed.`, kind: 'danger' });
          this.alarmTime = this.elapsed;
        }
      }
    }

    if (this.playerFlash > 0) this.playerFlash = Math.max(0, this.playerFlash - dt);
  }

  playerInExtractionZone() {
    const z = EXTRACTION_ZONE;
    const p = this.player.position;
    return p.x > z.x0 && p.x < z.x1 && p.z > z.z0 && p.z < z.z1 && Math.abs(p.y - z.y) < 1.8;
  }

  /* ---------------- Interaction ---------------- */

  findInteraction(maxDist = 2.6) {
    const eye = this.player.eyePosition;
    const dir = this.player.lookDirection;
    let best = null;

    for (const h of this.hostages) {
      if (!h.alive) continue;
      const verb = h.interactVerb();
      if (!verb) continue;
      const d = h.position.distanceTo(this.player.position);
      if (d > 2.8) continue;
      const to = h.position.clone().setY(h.position.y + 1.1).sub(eye).normalize();
      if (to.dot(dir) < 0.55) continue;
      if (!best || d < best.distance) best = { kind: 'hostage', target: h, verb, distance: d, key: 'E' };
    }

    const door = this.level.doors.nearest(this.player.position.clone().addScaledVector(dir, 1.0), maxDist);
    if (door) {
      const d = door.center.distanceTo(this.player.position);
      const to = door.center.clone().sub(eye).normalize();
      if (to.dot(dir) > 0.35 && (!best || d < best.distance)) {
        const verb = door.destroyed ? null
          : door.locked ? `Locked — ${door.kind === 'security' || door.kind === 'server' ? 'card reader required' : 'no key'}`
            : door.isOpen ? 'Close door' : door.roller ? 'Open shutter' : 'Open door';
        if (verb) best = { kind: 'door', target: door, verb, distance: d, key: 'E' };
      }
    }
    return best;
  }

  interact() {
    const it = this.findInteraction();
    if (!it) return false;
    bus.emit(EV.INTERACT, { kind: it.kind, target: it.target });
    if (it.kind === 'hostage') return it.target.interact(this.player);
    if (it.kind === 'door') return it.target.toggle(true);
    return false;
  }

  /* ---------------- QA / testing ---------------- */

  spawnEnemy(roomOrPos, variant = 'kestrel.assault') {
    const rng = makeRng(Date.now() & 0xffff);
    let pos;
    if (Array.isArray(roomOrPos)) pos = new THREE.Vector3(...roomOrPos);
    else pos = this.level.nav.pointsInRoom(roomOrPos, 4, rng)[0];
    if (!pos) return null;
    const e = new Enemy({
      id: `hostile.qa.${this.enemies.length}`,
      variant, pos: [pos.x, pos.y, pos.z], yaw: 0, seed: this.enemies.length * 17,
      room: typeof roomOrPos === 'string' ? roomOrPos : null,
      patrol: [], difficulty: this.difficulty, nav: this.level.nav, level: this.level,
      vfx: this.vfx, audio: this.audio,
    });
    this.enemies.push(e);
    this.group.add(e.group);
    return e;
  }

  freezeAI(v) {
    this.aiFrozen = !!v;
    for (const e of this.enemies) e.frozen = this.aiFrozen;
  }

  livingTargets() {
    return [...this.enemies.filter((e) => e.alive), ...this.hostages.filter((h) => h.alive)];
  }

  /* ---------------- Serialization ---------------- */

  serialize(playerPos, opts = {}) {
    const visibleOnly = opts.visibleOnly ?? false;
    const enemies = [];
    for (const e of this.enemies) {
      const s = e.serialize(playerPos);
      if (visibleOnly && !s.hasLineOfSight && s.distance > 25) continue;
      enemies.push(s);
    }
    enemies.sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));
    return {
      state: this.state,
      objective: this.objectiveState(),
      timer: {
        remainingSeconds: Math.round(this.timeRemaining * 10) / 10,
        totalSeconds: this.difficulty.missionSeconds,
        elapsedSeconds: Math.round(this.elapsed * 10) / 10,
      },
      alarm: this.alarm,
      difficulty: this.difficulty.id,
      hostages: this.hostages.map((h) => h.serialize(playerPos)),
      extraction: {
        zone: EXTRACTION_ZONE,
        playerInside: this.playerInExtractionZone(),
        active: this.extractionActive,
        progress: Math.round((this.extractionTimer / this.extractionRequired) * 100) / 100,
        eligible: this.hostages.filter((h) => h.alive).every((h) => h.secured),
      },
      enemies: {
        total: this.enemies.length,
        alive: this.enemies.filter((e) => e.alive).length,
        alerted: this.enemies.filter((e) => e.alive && e.alerted).length,
        inCombat: this.enemies.filter((e) => e.alive && e.state === AI_STATE.COMBAT).length,
        list: enemies.slice(0, opts.enemyLimit ?? 12),
      },
      result: this.result,
    };
  }
}

const HEAD_POOL = ['head.aspen', 'head.birch', 'head.cedar', 'head.flint', 'head.larch'];

function pickWeapon(variant, rng) {
  if (variant === 'kestrel.heavy') return rng() < 0.6 ? 'rifle.northwind' : 'shotgun.borealis';
  if (variant === 'kestrel.scout') return rng() < 0.7 ? 'smg.kestrel' : 'pistol.vsc9';
  if (variant === 'kestrel.warden') return rng() < 0.5 ? 'rifle.northwind' : 'smg.kestrel';
  return rng() < 0.5 ? 'smg.kestrel' : 'rifle.northwind';
}

void HOSTILE_VARIANTS;
