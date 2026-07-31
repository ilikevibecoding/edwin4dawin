/**
 * Enemy AI.
 *
 * `AISystemImpl` is the whole module's contact with the engine: it owns the
 * blackboard, the director, the path planner and the grenades, subscribes to the
 * handful of events the AI hears rather than sees, and runs the population once a
 * frame in a fixed order.
 *
 * The update order matters and is not arbitrary.
 *
 *  1. The blackboard takes one snapshot of the player. Everything downstream reads
 *     that, so no two agents can disagree about where the target is inside a frame.
 *  2. The path planner spends its per-frame expansion budget. Doing this first
 *     means a path requested last frame is available to the agent that asked for
 *     it this frame, rather than a frame later again.
 *  3. The avoidance field is rebuilt from last frame's positions.
 *  4. Agents update, in creation order. Each one decides at its own level-of-detail
 *     rate and moves every frame.
 *  5. The director handles waves and corpses, and squads reassign roles.
 *
 * Nothing in this module is allowed to throw because a sibling module is absent.
 * `fx`, `audio`, `render` and `ui` are all optional and re-resolved every frame
 * until they appear; the AI runs, fights and dies without any of them.
 */
import * as THREE from 'three';
import type { AISystem, AIState } from '../core/Contracts';
import type { Damageable, GameEvents, SurfaceType } from '../core/GameTypes';
import { SURFACE_PROPERTIES } from '../core/GameTypes';
import type { EngineContext, System } from '../core/System';
import { ORDER } from '../core/System';
import { Blackboard } from './Blackboard';
import { AIProbe } from './dev/Probe';
import { Director } from './Director';
import type { Enemy } from './Enemy';
import { DIRECTOR, HEARING, LOD, type Difficulty } from './Tuning';

/** Events the AI listens to. Unsubscribed on dispose. */
type Unsubscribe = () => void;

const SOUND = /* @__PURE__ */ new THREE.Vector3();
const FORWARD = /* @__PURE__ */ new THREE.Vector3();
const SPOT = /* @__PURE__ */ new THREE.Vector3();

export class AISystemImpl implements AISystem, System {
  readonly name = 'ai' as const;
  readonly order = ORDER.AI;
  readonly dependencies = ['world', 'combat', 'physics'] as const;

  private readonly bb = new Blackboard();
  private readonly director = new Director();
  private readonly probe = new AIProbe();
  private readonly subscriptions: Unsubscribe[] = [];
  private ctx: EngineContext | null = null;
  private warmed = false;
  private reportAt = 3;
  private readonly lodBands: [number, number, number] = [0, 0, 0];

  /** Non-null while an inspection line-up is following the camera. */
  private lineup: LineupOptions | null = null;
  private readonly lineupEye = new THREE.Vector3();
  private readonly lineupForward = new THREE.Vector3();
  /** Frames after staging to shoot the line-up, or -1. See `?aikill`. */
  private lineupKillDelay = -1;
  /** Frames since the rank was last placed, or -1 if it never has been. */
  private lineupAge = -1;
  private lineupKilled = false;

  init(ctx: EngineContext): void {
    this.ctx = ctx;
    this.bb.attach(ctx);
    this.director.attach(this.bb, ctx.scene);
    this.bb.grenades.attach(ctx.scene);
    this.subscribe(ctx);
    // Difficulty is a game-level setting the engine does not publish yet; regular
    // is the default the tuning table is balanced around.
    this.bb.setDifficulty('regular');
    // Procgen runs first and world is a declared dependency, so both are ready
    // here: building the shared geometry now spends it against the loading bar
    // rather than against the first frame of gameplay.
    this.ensureWarm();
  }

  // =========================================================================
  // AISystem
  // =========================================================================

  get aliveCount(): number {
    return this.director.aliveCount;
  }

  /**
   * Places one enemy. The position is treated as a post to hold, not as a
   * starting point to wander from — see `Enemy.anchor`.
   */
  spawnEnemy(position: THREE.Vector3, yaw = 0, archetype?: string): Damageable | null {
    this.ensureWarm();
    const enemy = this.director.spawn(this.bb, position, yaw, archetype);
    if (!enemy) return null;
    enemy.garrison(DIRECTOR.garrisonRadius);
    this.probe.noteSpawn(enemy);
    return enemy;
  }

  alertAll(position: THREE.Vector3, radius: number, intensity: number): void {
    this.director.alertAll(this.bb, position, radius, intensity);
  }

  suppress(position: THREE.Vector3, radius: number, duration: number): void {
    this.director.suppress(position, radius, duration);
  }

  setDifficulty(d: Difficulty): void {
    this.bb.setDifficulty(d);
  }

  getEnemyPositions(out: THREE.Vector3[]): THREE.Vector3[] {
    return this.director.positions(out);
  }

  setSpawningEnabled(enabled: boolean): void {
    this.director.spawningEnabled = enabled;
    if (enabled) this.ensureWarm();
  }

  // =========================================================================
  // Frame
  // =========================================================================

  update(dt: number, ctx: EngineContext): void {
    const bb = this.bb;
    bb.beginFrame(dt, ctx);

    if (!this.warmed) this.ensureWarm();

    // Path searches first, so a request made last frame lands this frame.
    bb.planner.update();

    const agents = this.director.all;
    const field = this.director.avoidance;
    field.begin();
    for (const enemy of agents) {
      if (!enemy.isAlive) continue;
      field.add(
        enemy.id,
        enemy.feet.x,
        enemy.feet.z,
        enemy.locomotion.velocity.x,
        enemy.locomotion.velocity.z,
        0.42,
      );
    }

    for (const enemy of agents) enemy.update(dt, bb, field);

    bb.grenades.update(dt, bb);
    this.director.update(dt, bb);
    this.restageLineup(ctx);
    this.probe.update(dt, ctx, this.director);

    if (this.reportAt > 0) {
      this.reportAt -= dt;
      if (this.reportAt <= 0) this.report();
    }
  }

  dispose(): void {
    for (const off of this.subscriptions) off();
    this.subscriptions.length = 0;
    this.bb.grenades.dispose();
    this.director.dispose(this.bb);
    this.ctx = null;
  }

  // =========================================================================
  // Debug surface, used by the headless capture and the console
  // =========================================================================

  /** One line per live agent. Cheap enough to call from a debug overlay. */
  debugStates(): string {
    const counts = new Map<AIState, number>();
    for (const enemy of this.director.all) {
      if (!enemy.live) continue;
      const state = enemy.behavior.state;
      counts.set(state, (counts.get(state) ?? 0) + 1);
    }
    const parts: string[] = [];
    for (const [state, n] of counts) parts.push(`${state}=${n}`);
    return parts.join(' ');
  }

  /** Population, budget and level-of-detail counters. Read by the debug overlay. */
  debugStats(): Record<string, number | string> {
    const director = this.director;
    director.lodHistogram(this.lodBands);
    const planner = this.bb.planner.stats;
    return {
      alive: director.aliveCount,
      corpses: director.corpseCount,
      spawned: director.stats.spawned,
      recycled: director.stats.recycled,
      models: director.stats.modelsBuilt,
      pool: director.stats.poolSize,
      triangles: director.liveTriangles(),
      lodNear: this.lodBands[0],
      lodMid: this.lodBands[1],
      lodFar: this.lodBands[2],
      focused: director.focusedCount,
      searches: planner.searches,
      expansions: planner.expansions,
      partial: planner.partial,
      failed: planner.failed,
      states: this.debugStates(),
    };
  }

  // =========================================================================
  // Setup
  // =========================================================================

  /**
   * Builds the shared geometry and, in debug, puts a squad in front of the camera.
   *
   * Deferred rather than done in `init` because the world's cover points and
   * navigation raster may not exist yet, and because the procgen material library
   * has to be there for the soldiers to be textured rather than flat grey.
   */
  private ensureWarm(): void {
    if (this.warmed) return;
    const bb = this.bb;
    bb.resolve();
    if (!bb.procgen) return;
    this.warmed = true;
    this.director.warm(bb);
    this.spawnDebugSquad();
  }

  /**
   * `?aidebug=1` puts a line-up of soldiers in front of the camera.
   *
   * This exists because a character model cannot be judged from its source. In a
   * headless capture there is no way to walk up to one, so the flag places one of
   * every archetype a few metres in front of the camera, facing it, in a spread of
   * poses: low ready, shouldered, crouched, mid-reload. `?aidebug=2` leaves the
   * same line-up live, for watching a fight rather than inspecting a model.
   *
   * Tuned from the URL: `aidist` metres away, `aicount` men, `ailat` metres of
   * sideways bias to clear the viewmodel, `aiturn=1` for a turntable, `aiarch` to
   * hold one archetype, `aicrouch=1` to duck the whole rank, `aikill` to shoot it.
   */
  private spawnDebugSquad(): void {
    if (typeof location === 'undefined') return;
    let params: URLSearchParams;
    try {
      params = new URLSearchParams(location.search);
    } catch {
      return;
    }
    const flag = params.get('aidebug');
    if (!flag || flag === '0') return;
    const number = (key: string, fallback: number): number => {
      const raw = params.get(key);
      const value = raw === null ? NaN : Number(raw);
      return Number.isFinite(value) ? value : fallback;
    };
    this.lineup = {
      live: flag === '2',
      distance: number('aidist', 5.2),
      lateral: number('ailat', 0),
      count: number('aicount', 0) || undefined,
      turntable: params.get('aiturn') === '1',
      archetype: params.get('aiarch') ?? undefined,
      crouch: params.get('aicrouch') === '1',
    };
    this.lineupKillDelay = params.has('aikill') ? number('aikill', 10) : -1;
    const placed = this.debugLineup(this.lineup);
    const factory = this.director.factory;
    console.info(
      `[ai] aidebug=${flag}: ${placed} soldiers placed at ${this.lineup.distance}m, ` +
        `${factory.stats.bodyTriangles} tris body / ${factory.stats.lodTriangles} lod / ` +
        `${factory.stats.weaponTriangles} weapon`,
    );
  }

  /**
   * Keeps the inspection line-up in front of the camera as the camera moves.
   *
   * The capture harness poses the player long after the AI has started, and it
   * poses it differently for every shot, so a line-up placed once at boot is
   * photographed from wherever the next shot happens to stand — usually not
   * looking at it. Re-placing on movement means any shot in the list becomes a
   * model shot, which is what makes a dozen different lighting setups usable for
   * judging the same model. The threshold is well above idle camera sway, and the
   * harness freezes the simulation before it grabs, so the last placement before
   * the shutter is always the one photographed.
   */
  private restageLineup(ctx: EngineContext): void {
    const options = this.lineup;
    if (!options || options.live) return;
    SPOT.setFromMatrixPosition(ctx.camera.matrixWorld);
    ctx.camera.getWorldDirection(FORWARD);
    FORWARD.y = 0;
    if (FORWARD.lengthSq() < 1e-4) return;
    FORWARD.normalize();
    const moved =
      SPOT.distanceToSquared(this.lineupEye) >= 0.35 * 0.35 ||
      FORWARD.dot(this.lineupForward) <= 0.999;
    if (moved) {
      this.debugLineup(options);
      // Re-armed per staging rather than once per session: the corpses stay put
      // until the camera moves for the next shot, and that shot gets a fresh rank
      // to shoot. One kill per session would mean one usable frame per capture run,
      // and a capture run is ten minutes.
      this.lineupAge = 0;
      this.lineupKilled = false;
      return;
    }
    if (this.lineupAge < 0) return;
    this.lineupAge++;
    if (this.lineupKillDelay >= 0 && !this.lineupKilled && this.lineupAge >= this.lineupKillDelay) {
      this.killLineup();
    }
  }

  /**
   * `?aikill=N` shoots the line-up N frames after the camera stops moving.
   *
   * A ragdoll is the one thing about a character that cannot be checked from a
   * still of it standing up, and waiting for the player to win a firefight
   * inside a headless capture is not a repeatable test. Each man takes a round
   * through the chest from the front with a real impulse, which is the path a
   * player kill takes.
   *
   * Frames rather than seconds because the capture harness counts in frames and
   * software rendering runs at about one of them a second: a delay in seconds is
   * either instant in game time — which shoots the rank before the shot has
   * finished posing the player, leaving the corpses wherever the camera used to
   * be — or longer than the whole shot.
   */
  private killLineup(): void {
    const bb = this.bb;
    this.lineupKilled = true;
    for (const enemy of this.director.all) {
      if (!enemy.isAlive) continue;
      enemy.posed = false;
      SPOT.set(enemy.feet.x, enemy.feet.y + 1.25, enemy.feet.z);
      FORWARD.set(Math.sin(enemy.bodyYaw), 0.08, Math.cos(enemy.bodyYaw)).normalize();
      enemy.applyDamage({
        amount: enemy.maxHealth + 50,
        source: null,
        point: SPOT,
        direction: FORWARD,
        bodyPart: 'chest',
        type: 'bullet',
        impulse: 90,
      });
    }
    console.info(`[ai] aikill: ${this.director.corpseCount} corpses`);
  }

  /**
   * Places an inspection line-up in front of the camera as it is right now.
   *
   * Callable at any time, which is the point: the capture harness cannot steer
   * the camera reliably (the player controller owns it), so the subject moves to
   * the camera instead. `turntable` puts four copies of one archetype at ninety
   * degree intervals so front, both flanks and back are in a single frame.
   *
   * The line-up is `posed`: senses and decisions are off, but the animator, the
   * stance blends and the aim solver all keep running, so what is photographed is
   * the real rig in real poses rather than a bind-pose mannequin.
   */
  debugLineup(opts?: LineupOptions): number {
    const ctx = this.ctx;
    if (!ctx) return 0;
    this.ensureWarm();
    const bb = this.bb;
    const live = opts?.live ?? false;
    const distance = opts?.distance ?? 5.2;
    const turntable = opts?.turntable ?? false;
    const bias = opts?.lateral ?? 0;

    this.director.clear(bb);

    // Straight off the camera's world matrix: the player's yaw lags a frame and
    // its eye height is a stance blend, and neither is what was rendered.
    SPOT.setFromMatrixPosition(ctx.camera.matrixWorld);
    ctx.camera.getWorldDirection(FORWARD);
    FORWARD.y = 0;
    if (FORWARD.lengthSq() < 1e-4) FORWARD.set(0, 0, -1);
    FORWARD.normalize();
    this.lineupEye.copy(SPOT);
    this.lineupForward.copy(FORWARD);

    const rightX = -FORWARD.z;
    const rightZ = FORWARD.x;
    // Yaw looking back at the camera, in the rig's convention where zero faces -Z.
    const facing = Math.atan2(FORWARD.x, FORWARD.z);
    const count = opts?.count ?? (turntable ? 4 : LINEUP.length);
    // Wide enough to clear the shoulders at any distance, tight enough to fill
    // the frame at three metres. The rank subtends a fixed angle rather than a
    // fixed width, so a big count closes up instead of walking out of shot —
    // which matters when the whole point of the count is to measure what a full
    // squad costs to draw, and anything culled costs nothing.
    const spacing = Math.max(0.95, distance * 0.29 * Math.min(1, 5 / Math.max(1, count)));
    let placed = 0;

    for (let i = 0; i < count; i++) {
      const pose = LINEUP[i % LINEUP.length];
      const lateral = (i - (count - 1) * 0.5) * spacing + bias;
      const depth = distance + (turntable ? 0 : pose.depth);
      SOUND.set(
        SPOT.x + FORWARD.x * depth + rightX * lateral,
        SPOT.y - 1.6,
        SPOT.z + FORWARD.z * depth + rightZ * lateral,
      );
      const ground = bb.surfaceAt(SOUND.x, SOUND.z, SOUND.y);
      if (ground !== null) SOUND.y = ground;

      const yaw = facing + (turntable ? (i * Math.PI) / 2 : pose.yaw);
      const enemy = this.director.spawn(
        bb,
        SOUND,
        yaw,
        opts?.archetype ?? (turntable ? 'rifleman' : pose.archetype),
      );
      if (!enemy) continue;
      placed++;
      if (live) continue;

      enemy.posed = true;
      enemy.wantWeaponUp = turntable ? 1 : pose.weaponUp;
      enemy.wantCrouch = opts?.crouch ?? (turntable ? false : pose.crouch);
      enemy.faceIdle();
      enemy.homeYaw = yaw;
      if (!turntable && pose.reloading) enemy.combatant.beginReload(bb, enemy);
    }
    // Waves would walk into shot and stand in front of the line-up.
    this.director.spawningEnabled = live;
    return placed;
  }

  private report(): void {
    const factory = this.director.factory;
    console.info(
      `[ai] ready: ${factory.stats.geometries} body geometries, ` +
        `${factory.stats.bodyTriangles} triangles at LOD0, ` +
        `${factory.stats.lodTriangles} at LOD1, ` +
        `nav ${this.bb.nav ? `${this.bb.nav.width}x${this.bb.nav.depth}x${this.bb.nav.layerCount}` : 'absent'}, ` +
        `${this.bb.cover.count} cover points, ${this.aliveCount} alive`,
    );
  }

  // =========================================================================
  // Hearing
  // =========================================================================

  private subscribe(ctx: EngineContext): void {
    const events = ctx.events;
    const bb = this.bb;

    this.subscriptions.push(
      events.on<GameEvents['player:footstep']>('player:footstep', (payload) => {
        if (!payload) return;
        // `loud` is already stance-weighted by the player module, and the surface
        // decides the rest: gravel gives you away, sand does not.
        const surface = surfaceVolume(payload.surface);
        const radius = (payload.loud ? HEARING.footstepLoud : HEARING.footstepQuiet) * surface;
        this.director.broadcastSound(bb, payload.position, radius, 'footstep', 0.8);
      }),
    );

    this.subscriptions.push(
      events.on<GameEvents['weapon:fire']>('weapon:fire', (payload) => {
        if (!payload) return;
        bb.noteTargetFired();
        const radius = Director.gunshotRadius(payload.suppressed);
        this.director.broadcastSound(bb, payload.muzzlePosition, radius, 'gunshot', 1);
      }),
    );

    this.subscriptions.push(
      events.on<GameEvents['combat:explosion']>('combat:explosion', (payload) => {
        if (!payload) return;
        this.director.broadcastSound(
          bb,
          payload.position,
          Math.max(HEARING.explosion, payload.radius * 6),
          'explosion',
          1,
        );
      }),
    );

    this.subscriptions.push(
      events.on<GameEvents['player:mantleStart']>('player:mantleStart', (payload) => {
        const player = bb.player;
        if (!player || !payload) return;
        this.director.broadcastSound(bb, player.position, HEARING.mantle, 'mantle', 0.9);
      }),
    );

    this.subscriptions.push(
      events.on<GameEvents['player:slideStart']>('player:slideStart', () => {
        const player = bb.player;
        if (!player) return;
        SOUND.copy(player.position);
        this.director.broadcastSound(bb, SOUND, HEARING.footstepLoud * 1.2, 'footstep', 1);
      }),
    );

    // A landing is a much bigger noise than a footstep and is the main way a
    // player who has just dropped off a roof gives themselves away.
    this.subscriptions.push(
      events.on<GameEvents['player:landed']>('player:landed', (payload) => {
        const player = bb.player;
        if (!player || !payload) return;
        if (payload.impactSpeed < 4) return;
        SOUND.copy(player.position);
        this.director.broadcastSound(
          bb,
          SOUND,
          Math.min(HEARING.footstepLoud * 1.8, 8 + payload.impactSpeed * 1.4),
          'impact',
          1,
        );
      }),
    );

    // The player respawning ends every engagement: nobody should still be shooting
    // at where the body was.
    this.subscriptions.push(
      events.on<GameEvents['player:spawn']>('player:spawn', () => {
        for (const enemy of this.director.all) {
          if (!enemy.isAlive) continue;
          enemy.perception.reset();
          enemy.behavior.force(enemy, bb, 'patrol');
        }
      }),
    );

    // Killing something is worth knowing about: the squad that lost a man knows
    // roughly where the round came from.
    this.subscriptions.push(
      events.on<GameEvents['combat:kill']>('combat:kill', (payload) => {
        if (!payload) return;
        const victim = payload.victim;
        if (victim.team !== 'enemy') return;
        this.director.stats.killed++;
        const killer = payload.killer;
        if (!killer || killer.team === 'enemy') return;
        killer.getPosition(SOUND);
        this.alertNear(victim, SOUND);
      }),
    );
  }

  /**
   * Passes a dead man's last piece of information to the squad around him.
   *
   * Radius rather than squad membership, because the man who watched a squadmate
   * fall might not be in the same squad, and the reaction the player is looking
   * for is the one from whoever was nearby.
   */
  private alertNear(victim: Damageable, from: THREE.Vector3): void {
    victim.getPosition(SPOT);
    const bb = this.bb;
    for (const enemy of this.director.all) {
      if (!enemy.isAlive) continue;
      if (enemy.feet.distanceToSquared(SPOT) > 30 * 30) continue;
      enemy.perception.receiveContact(from, bb.target.velocity, bb.now);
      enemy.perception.noteThreatFrom(from, enemy.feet);
    }
  }
}

/** Footstep loudness scale for a surface, from the shared surface table. */
function surfaceVolume(surface: SurfaceType): number {
  return SURFACE_PROPERTIES[surface]?.stepVolume ?? 1;
}

/** Placement controls for the inspection line-up. See `debugLineup`. */
interface LineupOptions {
  distance?: number;
  /** Sideways bias, to put the subject clear of the player's viewmodel. */
  lateral?: number;
  /** Number of soldiers; defaults to one of every pose. */
  count?: number;
  live?: boolean;
  turntable?: boolean;
  archetype?: string;
  /** Forces every subject into the crouch stance, whatever its pose says. */
  crouch?: boolean;
}

/** The `?aidebug=1` line-up: one of each archetype, in a spread of poses. */
const LINEUP: readonly {
  archetype: string;
  depth: number;
  yaw: number;
  weaponUp: number;
  crouch: boolean;
  reloading: boolean;
}[] = [
  { archetype: 'rifleman', depth: 0.35, yaw: 0.25, weaponUp: 0.12, crouch: false, reloading: false },
  { archetype: 'rusher', depth: 0, yaw: 0, weaponUp: 1, crouch: false, reloading: false },
  { archetype: 'marksman', depth: 0.35, yaw: -0.15, weaponUp: 1, crouch: true, reloading: false },
  { archetype: 'suppressor', depth: 0, yaw: 0.1, weaponUp: 0.6, crouch: false, reloading: true },
  { archetype: 'shotgunner', depth: 0.35, yaw: -0.3, weaponUp: 0.9, crouch: false, reloading: false },
];

export { Director, DIRECTOR, LOD };
export type { Enemy };
