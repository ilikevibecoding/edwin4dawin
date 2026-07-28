import * as THREE from 'three';
import type { GameContext, System } from '../core/GameContext';
import type { QualitySettings } from '../core/Quality';
import type { DamageEvent } from '../core/Events';
import type { EnemyState, IAI, IPhysics, IPlayer, IWorld, IMaterialLibrary } from '../core/Interfaces';
import { Rng, clamp, saturate } from '../core/MathUtils';
import { Agent, type AITarget, type AgentDeps } from './Agent';
import { buildBrain, reactionFor } from './Brain';
import { CoverField } from './Cover';
import { GrenadeSet } from './Grenades';
import { NavGrid } from './NavGrid';
import { CONTACT_CONFIRMED, Perception, audibility } from './Perception';
import { RagdollPool } from './Ragdoll';
import { SoldierAssets, VARIANTS } from './SoldierMesh';
import { B } from './SoldierSkeleton';
import { Squad } from './Squad';
import { AI, DIFFICULTY, type DifficultyProfile } from './Tuning';

/**
 * The enemy AI.
 *
 * This file is the scheduler and the outside world's view of the AI; the
 * thinking is in `Brain.ts`, the doing is in `Agent.ts`, and the rest of the
 * directory is the machinery each of those needs. What lives here is the part
 * that decides *when* work happens, which is what makes sixteen soldiers
 * affordable.
 *
 * Three costs dominate and each is rationed separately. Perception is a pair of
 * ray casts per agent, so four agents are checked per frame on a rotating
 * schedule and each one integrates awareness over the real time since its own
 * last check — nobody perceives more slowly, they just perceive less often.
 * Pathfinding is a node budget shared across every pending search, so a squad
 * that all asks for a route on the same frame gets served over the next few
 * rather than costing one enormous frame. Cover scoring is line-of-sight tests
 * against three hundred points, so two agents per frame may re-score and the
 * rest keep the position they have.
 *
 * Everything else — steering, the rig, the behaviour tree — runs for every
 * agent every frame, because it is cheap and because staggering it is exactly
 * how AI starts to look like it is thinking in slow motion.
 */

const SQUAD_SIZE = 4;
const GARRISON = 11;

const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _spawn = new THREE.Vector3();
const _eye = new THREE.Vector3();
const _origin = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _death = {
  id: 0,
  position: new THREE.Vector3(),
  headshot: false,
  impulse: new THREE.Vector3(),
  weapon: 'rifle',
};
const _killfeed = {
  attacker: 'PLAYER',
  victim: 'ENEMY',
  weapon: 'rifle',
  headshot: false,
  highlight: true,
};
const _damageEvt: DamageEvent & { id: number } = {
  id: 0,
  amount: 0,
  kind: 'bullet',
  from: new THREE.Vector3(),
  headshot: false,
  attacker: 'player',
  targetId: 0,
};
const _spawnEvt = { id: 0, position: new THREE.Vector3() };
const _playerDamage: DamageEvent = {
  amount: 0,
  kind: 'bullet',
  from: new THREE.Vector3(),
  headshot: false,
  attacker: 'enemy',
};

const NAMES = [
  'Rifleman',
  'Gunner',
  'Scout',
  'Sentry',
  'Marksman',
  'Grenadier',
  'Fighter',
  'Sapper',
];

/** Adapts `IPlayer` to the narrow view the AI needs, plus a scripted stand-in. */
class PlayerTarget implements AITarget {
  readonly position = new THREE.Vector3();
  readonly velocity = new THREE.Vector3();
  readonly eye = new THREE.Vector3();
  alive = false;
  crouched = false;
  radius = 0.36;
  height = 1.8;
  /** Set by the showcase to take the player's place. */
  scripted = false;
  /** Damage the stand-in has soaked, so a test can assert the AI is hitting. */
  scriptedDamage = 0;
  scriptedHits = 0;

  private player: IPlayer | null = null;

  bind(player: IPlayer | null): void {
    this.player = player;
  }

  sync(): void {
    if (this.scripted || !this.player) return;
    const p = this.player;
    this.position.copy(p.position);
    this.velocity.copy(p.velocity);
    this.eye.copy(p.eyePosition);
    this.alive = p.alive;
    this.crouched = p.stance === 'crouch' || p.stance === 'prone' || p.stance === 'slide';
    this.radius = p.capsuleRadius ?? 0.36;
    this.height = p.capsuleHeightMeters ?? 1.8;
  }

  damage(amount: number, from: THREE.Vector3, headshot: boolean): void {
    this.scriptedDamage += amount;
    this.scriptedHits++;
    if (this.scripted || !this.player) return;
    _playerDamage.amount = amount;
    _playerDamage.kind = 'bullet';
    _playerDamage.from?.copy(from);
    _playerDamage.headshot = headshot;
    _playerDamage.attacker = 'enemy';
    this.player.damage(_playerDamage);
  }
}

export default class AISystem implements System, IAI {
  readonly key = 'ai';
  readonly order = 60;

  private ctx: GameContext | null = null;
  private physics: IPhysics | null = null;
  private world: IWorld | null = null;
  private player: IPlayer | null = null;

  readonly nav = new NavGrid();
  readonly coverField = new CoverField();
  private assets: SoldierAssets | null = null;
  private ragdolls: RagdollPool | null = null;
  private grenades: GrenadeSet | null = null;
  private readonly brain = buildBrain();
  private readonly target = new PlayerTarget();
  private readonly root = new THREE.Group();

  private agents: Agent[] = [];
  private squads: Squad[] = [];
  private states: EnemyState[] = [];
  private nextId = 1;
  private rng = new Rng(0x9e3779b1);

  private enabled = true;
  private ready = false;
  private cursor = 0;
  private coverBudget = 0;
  private unsubscribe: Array<() => void> = [];
  private showcase: { update?(dt: number): void; dispose?(): void } | null = null;
  private deps!: AgentDeps;

  /** Timings for the performance overlay and the test harness. */
  readonly stats = {
    agents: 0,
    alive: 0,
    updateMs: 0,
    navMs: 0,
    perceptionChecks: 0,
    pathRequests: 0,
    ragdolls: 0,
    triangles: 0,
  };

  /* --------------------------------- boot --------------------------------- */

  async init(ctx: GameContext): Promise<void> {
    this.ctx = ctx;
    this.physics = ctx.tryGet<IPhysics>('physics') ?? null;
    this.world = ctx.tryGet<IWorld>('world') ?? null;
    this.player = ctx.tryGet<IPlayer>('player') ?? null;
    this.target.bind(this.player);

    this.root.name = 'enemies';
    ctx.scene.add(this.root);

    const materials = ctx.tryGet<IMaterialLibrary>('materials') ?? undefined;
    this.assets = new SoldierAssets(materials);
    this.stats.triangles = this.assets.variants[0]?.triangles ?? 0;

    if (this.world && this.physics) {
      this.nav.build(this.world, this.physics);
      this.coverField.build(this.world, this.nav);
    }

    this.ragdolls = new RagdollPool(this.physics, ctx.scene, ctx.quality.ragdolls ? ctx.quality.maxRagdolls : 0);
    this.ragdolls.onRetire = (body) => {
      for (const a of this.agents) {
        if (a.ragdoll === body) {
          a.ragdoll = null;
          if (a.instance) a.instance.root.visible = false;
        }
      }
    };
    this.grenades = new GrenadeSet(this.physics, ctx.scene, ctx.events);
    this.grenades.onExplode = (position, owner) => this.grenadeBlast(position, owner);

    this.deps = {
      physics: this.physics,
      world: this.world,
      events: ctx.events,
      nav: this.nav,
      cover: this.coverField,
      ragdolls: this.ragdolls,
      canScoreCover: () => this.takeCoverBudget(),
      throwGrenade: (agent, from, to) => this.grenades?.throw(agent.id, from, to) ?? false,
      onFire: (agent, origin, direction) => this.onAgentFire(agent, origin, direction),
      onDeath: (agent, headshot, impulse, weapon) => this.onAgentDeath(agent, headshot, impulse, weapon),
    };

    this.subscribe(ctx);
    this.registerVantages();
    ctx.register('ai', this);
    this.ready = true;

    const params = typeof location !== 'undefined' ? new URLSearchParams(location.search) : null;
    const wantsShowcase = params?.get('showcase') === 'ai';
    if (wantsShowcase) {
      try {
        const mod = await import('./AIShowcase');
        this.showcase = new mod.AIShowcase(ctx, this, this.target);
      } catch (err) {
        console.error('[ai] showcase failed to load:', err);
      }
    } else if (!params?.has('capture')) {
      // A level with nobody in it is not a level. Populate the garrison unless
      // the screenshot harness is running, whose shots are of the architecture.
      this.garrison();
    }

    console.log(
      `[ai] ready — ${this.nav.stats.nodes} nav nodes over ${this.nav.stats.cells} cells, ` +
        `${this.coverField.count} cover points, ` +
        `${(this.stats.triangles / 1000).toFixed(1)}k tris per soldier.`,
    );
  }

  private registerVantages(): void {
    // The showcase registers the interesting ones; this is the fallback so a
    // capture run without the showcase still has somewhere to point.
    void 0;
  }

  private garrison(): void {
    if (!this.world) return;
    const spawns = this.world.spawnPoints.filter((s) => s.team === 'enemy' || s.team === 'any');
    if (spawns.length === 0) return;
    const count = Math.min(GARRISON, spawns.length);
    for (let i = 0; i < count; i++) {
      const at = spawns[(i * 7 + 3) % spawns.length];
      this.spawn(at.position, at.heading);
    }
  }

  /* -------------------------------- events -------------------------------- */

  private subscribe(ctx: GameContext): void {
    const bus = ctx.events;
    this.unsubscribe.push(
      bus.on('weapon:fire', (e) => {
        const loud = e.suppressed ? AI.loudness.suppressedShot : AI.loudness.playerShot;
        this.broadcastSound(e.origin, loud);
        // The round itself suppresses whoever it passes.
        this.suppressAlong(e.origin, e.direction, 220);
      }),
      bus.on('fx:explosion', (e) => this.broadcastSound(e.position, AI.loudness.explosion)),
      bus.on('player:footstep', (e) =>
        this.broadcastSound(e.position, e.running ? AI.loudness.footstepRun : AI.loudness.footstepWalk),
      ),
      bus.on('player:land', (e) => {
        if (this.player) this.broadcastSound(this.player.position, AI.loudness.land * saturate(e.velocity / 9));
      }),
      bus.on('player:vault', () => {
        if (this.player) this.broadcastSound(this.player.position, AI.loudness.vault);
      }),
      bus.on('game:restart', () => this.killAll()),
    );
  }

  /** A sound happened. Every agent close enough gets a chance to notice it. */
  broadcastSound(position: THREE.Vector3, loudness: number): void {
    if (!this.enabled || loudness <= 0) return;
    const reach = AI.hearingRange * loudness;
    const reach2 = reach * reach;
    for (const a of this.agents) {
      if (!a.active || !a.alive) continue;
      a.eyePosition(_eye);
      const d2 = _eye.distanceToSquared(position);
      if (d2 > reach2) continue;
      const distance = Math.sqrt(d2);
      // The occlusion test is only worth paying for on sounds that would
      // otherwise register; a footstep at forty metres is already inaudible.
      const occluded = this.physics ? !this.physics.lineOfSight(_eye, position, a.ignoreList) : false;
      const heard = audibility(loudness, distance, occluded);
      if (heard <= 0.02) continue;
      const error = distance * AI.hearingError * (occluded ? 1.7 : 1);
      a.perception.hear(
        position,
        heard,
        (a.rng.next() - 0.5) * 2 * error,
        (a.rng.next() - 0.5) * 2 * error,
      );
      this.applyReaction(a, position);
    }
  }

  /** Rounds passing close make an agent duck and shoot worse. */
  suppressAlong(origin: THREE.Vector3, direction: THREE.Vector3, distance: number): void {
    if (!this.enabled) return;
    _dir.copy(direction).normalize();
    for (const a of this.agents) {
      if (!a.active || !a.alive) continue;
      _v.copy(a.position);
      _v.y += 1;
      _v.sub(origin);
      const along = _v.dot(_dir);
      if (along < 0 || along > distance) continue;
      _v.addScaledVector(_dir, -along);
      const miss = _v.length();
      if (miss > AI.suppressRadius) continue;
      a.suppress(AI.suppressPerRound * (1 - miss / AI.suppressRadius));
      // Being shot at tells you roughly where from, even if you cannot see it.
      if (a.perception.contact < CONTACT_CONFIRMED) {
        a.perception.hear(origin, 0.55, 0, 0);
        this.applyReaction(a, origin);
      }
    }
  }

  private applyReaction(agent: Agent, from: THREE.Vector3): void {
    if (agent.reaction > 0 || agent.perception.contact === CONTACT_CONFIRMED) return;
    _v2.copy(from).sub(agent.position);
    _v2.y = 0;
    if (_v2.lengthSq() < 1e-5) return;
    _v2.normalize();
    agent.reaction = reactionFor(agent, _v2);
  }

  /* -------------------------------- frame --------------------------------- */

  update(dt: number, ctx: GameContext): void {
    if (!this.ready) return;
    const t0 = now();
    this.showcase?.update?.(dt);
    if (!this.enabled || dt <= 0) {
      this.stats.updateMs = now() - t0;
      return;
    }

    this.target.sync();
    this.coverField.tick(dt);
    this.coverBudget = AI.coverPerFrame;

    const navStart = now();
    this.nav.pump(AI.pathNodeBudget, AI.pathsPerFrame);
    this.stats.navMs = now() - navStart;

    this.perceive(dt);
    this.separate();

    for (const squad of this.squads) squad.update(dt, ctx.events);

    const camera = ctx.camera.position;
    let alive = 0;
    let live = 0;
    for (const agent of this.agents) {
      if (!agent.active) continue;
      live++;
      if (agent.alive) {
        alive++;
        agent.updateBelief();
        // A scripted move from the debug hooks holds the tree off until it
        // finishes, one way or the other. A held man is scripted with no
        // destination and stays that way until released.
        if (agent.scripted && !agent.hold && (!agent.hasGoal || agent.pathFailed)) {
          agent.scripted = false;
        }
        if (!agent.scripted) this.brain.tick(agent, dt);
      }
      agent.update(dt, this.target, camera.distanceTo(agent.position));
    }

    this.ragdolls?.update(dt);
    this.grenades?.update(dt);
    this.syncStates();

    this.stats.agents = live;
    this.stats.alive = alive;
    this.stats.ragdolls = this.ragdolls?.liveCount ?? 0;
    this.stats.updateMs = now() - t0;
  }

  /**
   * Perception, rationed. Each agent integrates awareness over the time since
   * its own last check, so the schedule changes how often a soldier looks and
   * not how quickly he notices — a detail that matters because otherwise the
   * difficulty of the game would depend on how many enemies were alive.
   */
  private perceive(dt: number): void {
    const target = this.target;
    let checks = 0;
    const budget = Math.min(AI.perceptionPerFrame, this.agents.length);
    for (let n = 0; n < this.agents.length && checks < budget; n++) {
      this.cursor = (this.cursor + 1) % this.agents.length;
      const agent = this.agents[this.cursor];
      if (!agent.active || !agent.alive) continue;
      checks++;

      const since = Math.min(Math.max(agent.sinceLook, dt), 0.5);
      agent.sinceLook = 0;
      if (!target.alive) {
        agent.perception.visible = false;
        continue;
      }
      agent.eyePosition(_eye);
      const before = agent.perception.contact;
      agent.perception.look(
        since,
        this.physics,
        _eye,
        agent.heading,
        target.position,
        target.height,
        target.velocity,
        target.crouched,
        agent.profile,
        agent.ignoreList,
      );
      if (agent.perception.contact === CONTACT_CONFIRMED) {
        if (before !== CONTACT_CONFIRMED) {
          _v2.copy(target.position).sub(agent.position);
          _v2.y = 0;
          if (_v2.lengthSq() > 1e-5) agent.reaction = reactionFor(agent, _v2.normalize());
        }
        agent.squad?.report(agent, agent.perception.lastKnown, agent.perception.lastKnownVel);
      }
    }
    this.stats.perceptionChecks = checks;
  }

  /**
   * Agent-vs-agent separation. Written into each agent's `avoid` before it
   * steers, so a squad funnelling through a doorway spreads out instead of
   * stacking into one capsule and shoving it through a wall.
   */
  private separate(): void {
    for (const a of this.agents) {
      if (a.active) a.avoid.set(0, 0, 0);
    }
    const r = AI.separationRadius;
    const r2 = r * r;
    for (let i = 0; i < this.agents.length; i++) {
      const a = this.agents[i];
      if (!a.active || !a.alive) continue;
      for (let j = i + 1; j < this.agents.length; j++) {
        const b = this.agents[j];
        if (!b.active || !b.alive) continue;
        const dx = a.position.x - b.position.x;
        const dz = a.position.z - b.position.z;
        const d2 = dx * dx + dz * dz;
        if (d2 > r2 || d2 < 1e-6) continue;
        if (Math.abs(a.position.y - b.position.y) > 1.6) continue;
        const d = Math.sqrt(d2);
        const push = ((r - d) / r) * AI.separationStrength * 0.1;
        a.avoid.x += (dx / d) * push;
        a.avoid.z += (dz / d) * push;
        b.avoid.x -= (dx / d) * push;
        b.avoid.z -= (dz / d) * push;
      }
    }
  }

  private onAgentFire(agent: Agent, origin: THREE.Vector3, direction: THREE.Vector3): void {
    // Enemy gunfire is a sound the rest of the squad reacts to, and a reason
    // for the player to know where it came from.
    _origin.copy(origin);
    this.broadcastSound(_origin, AI.loudness.enemyShot * 0.4);
    void agent;
    void direction;
  }

  private onAgentDeath(agent: Agent, headshot: boolean, impulse: THREE.Vector3, weapon: string): void {
    const ctx = this.ctx;
    if (!ctx) return;
    _death.id = agent.id;
    _death.position.copy(agent.position);
    _death.headshot = headshot;
    _death.impulse.copy(impulse);
    _death.weapon = weapon;
    ctx.events.emit('enemy:death', _death);

    _killfeed.attacker = weapon === 'frag' || weapon === 'explosion' ? 'PLAYER' : 'PLAYER';
    _killfeed.victim = agent.name.toUpperCase();
    _killfeed.weapon = weapon;
    _killfeed.headshot = headshot;
    _killfeed.highlight = true;
    ctx.events.emit('ui:killfeed', _killfeed);

    _v.copy(agent.position);
    _v.y += 1.2;
    ctx.events.emit('fx:blood', { position: _v, direction: impulse, amount: headshot ? 1 : 0.6 });
  }

  private grenadeBlast(position: THREE.Vector3, owner: number): void {
    this.damageRadius(position, AI.grenade.radius, AI.grenade.damage, 'frag');
    // The thrower's own side is not immune, but the player is the point.
    const target = this.target;
    if (!target.alive) return;
    _v.copy(target.position);
    _v.y += 0.9;
    const d = _v.distanceTo(position);
    if (d > AI.grenade.radius) return;
    const shielded = this.physics ? !this.physics.lineOfSight(position, _v) : false;
    const amount =
      AI.grenade.damage * blastFalloff(d, AI.grenade.radius) * (shielded ? 0.35 : 1);
    if (amount > 1) target.damage(amount, position, false);
    void owner;
  }

  private syncStates(): void {
    for (let i = 0; i < this.agents.length; i++) {
      const a = this.agents[i];
      const s = this.states[i];
      s.id = a.id;
      s.position.copy(a.position);
      s.health = a.health;
      s.alive = a.alive && a.active;
      s.aware = a.perception.visible;
      s.name = a.name;
    }
  }

  /* --------------------------------- IAI ---------------------------------- */

  get enemies(): readonly EnemyState[] {
    return this.states;
  }

  get aliveCount(): number {
    let n = 0;
    for (const a of this.agents) if (a.active && a.alive) n++;
    return n;
  }

  spawn(position: THREE.Vector3, heading = 0): number {
    if (!this.assets) return -1;
    const agent = this.acquire();
    if (!agent) return -1;

    _spawn.copy(position);
    if (this.world) {
      // Never spawn inside geometry: the world knows where the floor is.
      this.world.nearestNavPoint(position, _spawn);
      if (_spawn.distanceToSquared(position) > 64) _spawn.copy(position);
    }
    const difficulty = this.difficultyFor();
    agent.spawn(_spawn, heading, difficulty, NAMES[agent.id % NAMES.length]);
    this.assignSquad(agent);

    _spawnEvt.id = agent.id;
    _spawnEvt.position.copy(_spawn);
    this.ctx?.events.emit('enemy:spawn', _spawnEvt);
    return agent.id;
  }

  /** Spawns with an explicit difficulty and variant, for the showcase. */
  spawnDetailed(
    position: THREE.Vector3,
    heading: number,
    difficulty: string,
    squadId: number,
  ): number {
    const id = this.spawn(position, heading);
    const agent = this.byId(id);
    if (!agent) return id;
    agent.profile = DIFFICULTY[difficulty] ?? DIFFICULTY.regular;
    if (squadId >= 0) {
      agent.squad?.remove(agent);
      const squad = this.squadFor(squadId);
      squad.add(agent);
      agent.squad = squad;
    }
    return id;
  }

  private difficultyFor(): DifficultyProfile {
    const roll = this.rng.next();
    if (roll < 0.28) return DIFFICULTY.recruit;
    if (roll < 0.78) return DIFFICULTY.regular;
    if (roll < 0.95) return DIFFICULTY.veteran;
    return DIFFICULTY.elite;
  }

  private acquire(): Agent | null {
    for (const a of this.agents) {
      if (!a.active) return a;
    }
    if (this.agents.length >= AI.maxAgents) return null;
    const agent = new Agent(this.deps, this.brain.makeState());
    agent.id = this.nextId++;
    agent.rng = new Rng(agent.id * 0x9e3779b1 + 17);
    agent.build(this.assets!, agent.id % VARIANTS.length, this.root);
    this.agents.push(agent);
    this.states.push({
      id: agent.id,
      position: new THREE.Vector3(),
      health: 0,
      alive: false,
      aware: false,
      name: agent.name,
    });
    return agent;
  }

  private assignSquad(agent: Agent): void {
    for (const squad of this.squads) {
      if (squad.members.length < SQUAD_SIZE) {
        squad.add(agent);
        agent.squad = squad;
        return;
      }
    }
    const squad = new Squad(this.squads.length);
    squad.add(agent);
    agent.squad = squad;
    this.squads.push(squad);
  }

  private squadFor(id: number): Squad {
    let squad = this.squads.find((s) => s.id === id);
    if (!squad) {
      squad = new Squad(id);
      this.squads.push(squad);
    }
    return squad;
  }

  byId(id: number): Agent | null {
    for (const a of this.agents) if (a.id === id) return a;
    return null;
  }

  damage(id: number, evt: DamageEvent): boolean {
    const agent = this.byId(id);
    if (!agent || !agent.alive) return false;
    const from = evt.from ?? agent.position;
    const lethal = agent.takeDamage(
      evt.amount,
      from,
      evt.headshot ?? false,
      evt.kind === 'explosion' ? 'frag' : evt.kind === 'melee' ? 'melee' : 'rifle',
    );

    _damageEvt.id = id;
    _damageEvt.amount = evt.amount;
    _damageEvt.kind = evt.kind;
    _damageEvt.from?.copy(from);
    _damageEvt.headshot = evt.headshot ?? false;
    _damageEvt.attacker = evt.attacker ?? 'player';
    _damageEvt.targetId = id;
    this.ctx?.events.emit('enemy:damage', _damageEvt);
    return lethal;
  }

  /**
   * Radial damage. Returns the number of enemies killed, which is what the
   * killstreak ladder wants to know; the airstrike and the frag both route
   * through here.
   */
  damageRadius(center: THREE.Vector3, radius: number, maxDamage: number, source: string): number {
    let kills = 0;
    const r2 = radius * radius;
    for (const agent of this.agents) {
      if (!agent.active || !agent.alive) continue;
      _v.copy(agent.position);
      _v.y += 0.95;
      const d2 = _v.distanceToSquared(center);
      if (d2 > r2) continue;
      // Cover counts, but not equally against everything. A wall takes most of
      // a grenade and very little of a five-hundred pounder, because blast
      // diffracts around an obstacle in proportion to how much of it there is
      // — and because a killstreak the player has earned should not be beaten
      // by a chest-high sandbag. Radius stands in for charge weight.
      const shielded = this.physics ? !this.physics.lineOfSight(center, _v, agent.ignoreList) : false;
      const cover = shielded ? clamp(0.26 + radius * 0.023, 0.26, 0.8) : 1;
      const amount = maxDamage * blastFalloff(Math.sqrt(d2), radius) * cover;
      if (amount < 1) continue;
      agent.suppress(0.9);
      if (agent.takeDamage(amount, center, false, source)) kills++;
    }
    return kills;
  }

  killAll(): void {
    for (const agent of this.agents) {
      if (!agent.active) continue;
      if (agent.alive) {
        _v.copy(agent.position);
        _v.y += 1.1;
        _v.x += 0.35;
        agent.kill(_v, false, 'cleanup', B.chest);
      }
      agent.despawn();
    }
    this.ragdolls?.clear();
    this.grenades?.clear();
    this.coverField.reset();
    for (const squad of this.squads) squad.reset();
    this.squads.length = 0;
    this.syncStates();
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  get isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Enemies inside a radius.
   *
   * A new array every call. Returning one reused buffer saves an allocation the
   * frame budget never notices — nothing on the per-frame path calls this — and
   * costs a bug that is very hard to see: the killstreak director holds a
   * targeting footprint while it asks a second question, and with a shared
   * buffer the answer to the second silently rewrites the first. The
   * `EnemyState` objects inside are the live ones and are still shared, so
   * anything that must outlive the call has to be copied out.
   */
  query(center: THREE.Vector3, radius: number): EnemyState[] {
    const out: EnemyState[] = [];
    const r2 = radius * radius;
    for (let i = 0; i < this.agents.length; i++) {
      const a = this.agents[i];
      if (!a.active || !a.alive) continue;
      if (a.position.distanceToSquared(center) > r2) continue;
      // The snapshot is only refreshed on the frames the AI runs, and a caller
      // that has just spawned or moved somebody wants the truth now. Every
      // field, not just the position: both callers gate on `alive` before they
      // count a man, so a hostile spawned and queried inside one frame would
      // otherwise be handed over already flagged dead and silently skipped.
      const s = this.states[i];
      s.id = a.id;
      s.position.copy(a.position);
      s.health = a.health;
      s.alive = true;
      s.aware = a.perception.visible;
      s.name = a.name;
      out.push(s);
    }
    return out;
  }

  /* -------------------------------- plumbing ------------------------------- */

  /** Consumed by agents so only a couple re-score cover on any one frame. */
  takeCoverBudget(): boolean {
    if (this.coverBudget <= 0) return false;
    this.coverBudget--;
    return true;
  }

  get agentList(): readonly Agent[] {
    return this.agents;
  }

  get brainTree() {
    return this.brain;
  }

  get soldierAssets(): SoldierAssets | null {
    return this.assets;
  }

  get ragdollPool(): RagdollPool | null {
    return this.ragdolls;
  }

  get enemyRoot(): THREE.Group {
    return this.root;
  }

  onQualityChange(quality: QualitySettings): void {
    this.ragdolls?.setCapacity(quality.ragdolls ? quality.maxRagdolls : 0);
  }

  dispose(): void {
    for (const off of this.unsubscribe) off();
    this.unsubscribe.length = 0;
    this.showcase?.dispose?.();
    this.showcase = null;
    this.killAll();
    for (const agent of this.agents) agent.hitboxes?.dispose(this.physics);
    this.agents.length = 0;
    this.states.length = 0;
    this.ragdolls?.dispose();
    this.grenades?.dispose();
    this.assets?.dispose();
    this.root.removeFromParent();
  }
}

function now(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

/**
 * Blast damage as a fraction of the maximum, 1 at the centre and 0 at the rim.
 *
 * The inner core takes the full figure rather than tapering from the first
 * centimetre, because the alternative is a grenade that lands between a man's
 * boots and does eighty per cent — which reads as the explosion being weak
 * rather than as the man being lucky. Outside the core it is `1 - t²`, which
 * keeps a useful amount of damage out to two thirds of the radius and then
 * drops off hard, so cover and distance both do visible work.
 */
function blastFalloff(distance: number, radius: number): number {
  const core = radius * AI.grenade.core;
  if (distance <= core) return 1;
  const t = clamp((distance - core) / Math.max(0.01, radius - core), 0, 1);
  return 1 - t * t;
}

export { Perception, clamp };
