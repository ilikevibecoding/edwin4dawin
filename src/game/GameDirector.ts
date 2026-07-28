import * as THREE from 'three';
import type { GameContext, System } from '../core/GameContext';
import type {
  IAI,
  IDecals,
  IDirector,
  IFX,
  IKillstreaks,
  IPlayer,
  IWeapons,
  IWorld,
  SpawnPoint,
} from '../core/Interfaces';

/**
 * The game.
 *
 * Everything else in this repository is a capability; this is the only file that
 * decides what the player is supposed to *do* with them. The mode is wave
 * survival, chosen because it needs no scripting data and because it exercises
 * every system honestly: the AI has to path from real spawn points, the
 * killstreak ladder has to be reachable at a sensible rate, and the HUD has to
 * carry a real match state rather than a demo pose.
 *
 * ## The shape of a wave
 *
 * A wave is a *budget*, not a spawn list. `size` hostiles will arrive over the
 * life of the wave but only `concurrent` may be alive at once, and the rest
 * trickle in as the player works through them. This matters more than the raw
 * count: a wave that dumps eighteen men into the street at once is a slideshow
 * and then a lull, while the same eighteen fed through a cap of nine is a
 * continuous fight the player can actually read. The cap also keeps the agent
 * budget and the draw calls inside what the AI system was built for.
 *
 * Difficulty moves on three axes at once, because moving only the count makes
 * later waves tedious rather than harder:
 *
 *  - **more** hostiles per wave, and more of them alive at once;
 *  - **better** hostiles — the profile mix shifts from recruits to veterans and
 *    elites, which the AI system reads as accuracy, reaction time and
 *    aggression;
 *  - **faster** reinforcement, so the pauses that let a player reposition and
 *    heal shrink as the match goes on.
 *
 * ## The shape of a match
 *
 * `menu` → `briefing` → `playing` → (`dead` | `paused`) → `over`, and inside
 * `playing` a wave cycles `incoming` → `active` → `cleared`. The breather after
 * a clear is deliberate and generous: it is when the player spends a killstreak,
 * finds ammunition and picks the ground they want to fight the next wave from,
 * and cutting it short makes the whole mode feel like a treadmill.
 *
 * ## Scoring
 *
 * Score exists to be *spent on attention* — it is the number that tells the
 * player the last five seconds went well. So it is paid out in event-sized
 * lumps with a reason attached rather than accumulated smoothly: a kill, a
 * headshot on top of it, a multi-kill window, a streak milestone, a wave. XP is
 * tracked separately and more coarsely because it represents the match as a
 * whole rather than the moment.
 */

/* ------------------------------- tuning -------------------------------- */

const T = {
  maxLives: 3,
  respawnSeconds: 6,
  /** Seconds between the briefing and the first hostile of a wave. */
  briefingSeconds: 7,
  /** Breather after a wave is cleared. */
  clearedSeconds: 12,
  /** Seconds before the first wave of a fresh match. */
  openingSeconds: 9,

  /** Nothing may spawn closer to the player than this, in metres. */
  minSpawnDistance: 26,
  /** Preferred upper bound; exceeded only when no spawn is closer. */
  maxSpawnDistance: 85,
  /** Metres of scatter applied around a spawn point so squads do not stack. */
  spawnScatter: 3.4,

  score: {
    kill: 100,
    headshot: 50,
    /** Seconds inside which a second kill counts as a multi-kill. */
    multiWindow: 2.6,
    multi: [0, 50, 150, 300, 500] as const,
    /** Every `streakStep` kills without dying pays this times the milestone. */
    streakStep: 5,
    streakBonus: 100,
    waveBase: 250,
    wavePerWave: 100,
    /** Killstreaks are earned with kills, so the ladder pays out as well. */
    streakEarned: 150,
  },
  xp: {
    kill: 50,
    headshot: 25,
    waveBase: 200,
    wavePerWave: 75,
    streakEarned: 100,
  },
} as const;

type Phase = 'idle' | 'briefing' | 'incoming' | 'active' | 'cleared' | 'over';
type Difficulty = 'recruit' | 'regular' | 'veteran' | 'elite';

/** `IAI.spawnDetailed` when the AI system offers it, for the difficulty mix. */
interface DetailedSpawner {
  spawnDetailed?(
    position: THREE.Vector3,
    heading: number,
    difficulty: string,
    squadId: number,
  ): number;
}

const _spawnAt = new THREE.Vector3();
const _centroid = new THREE.Vector3();

export default class GameDirector implements System, IDirector {
  readonly key = 'director';
  readonly order = 95;

  private ctx!: GameContext;
  private world: IWorld | null = null;
  private ai: (IAI & DetailedSpawner) | null = null;
  private player: IPlayer | null = null;
  private weapons: IWeapons | null = null;
  private killstreaks: IKillstreaks | null = null;

  private _state: IDirector['state'] = 'menu';
  private _phase: Phase = 'idle';
  private _score = 0;
  private _xp = 0;
  private _kills = 0;
  private _deaths = 0;
  private _wave = 0;
  private _lives: number = T.maxLives;
  private _respawnIn = 0;
  private _objective = '';

  /** Hostiles this wave will field in total, and how many are still to arrive. */
  private _waveSize = 0;
  private pending = 0;
  /**
   * Hostiles this wave has put on the ground and not yet seen die.
   *
   * Kept rather than reading `IAI.aliveCount` for everything, because the AI
   * system populates the level for its own reasons and the director must not
   * count someone else's patrol as part of wave three. When they disagree the
   * lower number wins: a hostile killed by a collapsing wall, which never emits
   * a kill the director hears, still has to stop counting.
   */
  private waveAlive = 0;
  private concurrent = 0;
  private spawnTimer = 0;
  private spawnInterval = 2;
  /** Seconds left in whichever timed phase is running. */
  private phaseTimer = 0;
  private squadSeed = 0;

  /** Consecutive kills without dying, used for the milestone bonus. */
  private streak = 0;
  private _bestStreak = 0;
  private nextMilestone: number = T.score.streakStep;
  private multiCount = 0;
  private multiTimer = 0;

  private readonly unsubscribe: Array<() => void> = [];
  /** Set while the capture harness owns the frame; the match never auto-starts. */
  private quiet = false;

  init(ctx: GameContext): void {
    this.ctx = ctx;
    this.world = ctx.tryGet<IWorld>('world') ?? null;
    this.ai = ctx.tryGet<IAI & DetailedSpawner>('ai') ?? null;
    this.player = ctx.tryGet<IPlayer>('player') ?? null;
    this.weapons = ctx.tryGet<IWeapons>('weapons') ?? null;
    this.killstreaks = ctx.tryGet<IKillstreaks>('killstreaks') ?? null;
    this.quiet =
      typeof location !== 'undefined' && new URLSearchParams(location.search).has('capture');

    const on = ctx.events.on.bind(ctx.events);
    this.unsubscribe.push(
      on('enemy:death', (e) => this.onEnemyDeath(e.headshot)),
      on('player:death', () => this.onPlayerDeath()),
      on('killstreak:earned', (e) => this.onStreakEarned(e.name)),
    );

    // The match is idle until something asks for it. In a normal session that is
    // the menu's Play button; under the harness it is a vantage point's setup.
    this.setObjective('');
    this.hold(true);
  }

  /* =============================== state ================================== */

  get state(): IDirector['state'] {
    return this._state;
  }
  get phase(): Phase {
    return this._phase;
  }
  get score(): number {
    return this._score;
  }
  get xp(): number {
    return this._xp;
  }
  get kills(): number {
    return this._kills;
  }
  get deaths(): number {
    return this._deaths;
  }
  get wave(): number {
    return this._wave;
  }
  get lives(): number {
    return this._lives;
  }
  get maxLives(): number {
    return T.maxLives;
  }
  get respawnIn(): number {
    return this._respawnIn;
  }
  get respawnTotal(): number {
    return T.respawnSeconds;
  }
  get waveSize(): number {
    return this._waveSize;
  }
  get enemiesLeft(): number {
    return Math.max(0, this.standing + this.pending);
  }

  /** Hostiles of this wave still on their feet. */
  private get standing(): number {
    const alive = this.ai?.aliveCount ?? 0;
    return Math.max(0, Math.min(alive, this.waveAlive));
  }
  get bestStreak(): number {
    return this._bestStreak;
  }
  get objective(): string {
    return this._objective;
  }
  get running(): boolean {
    return this._state === 'playing' || this._state === 'briefing';
  }

  /** Begins a match from the menu, or resumes one that was abandoned to it. */
  start(): void {
    if (this._state === 'playing' || this._state === 'briefing') return;
    if (this._state === 'paused') {
      this.pause(false);
      return;
    }
    // Whatever is standing when the player presses Deploy belongs to whoever put
    // it there — the AI system populates the level at boot, and a showcase may
    // have left a squad on the ground. A match has to begin on an empty map or
    // wave one opens with strays in the count and never clears.
    this.ai?.killAll();
    this.resetMatch();
    this._state = 'briefing';
    this._phase = 'briefing';
    this.phaseTimer = T.openingSeconds;
    this.hold(false);
    this.ctx.events.emit('game:start');
    this.setObjective('Hold the market. Hostiles are moving in.');
    this.notify('OPERATION BLACKOUT', 'Defend the market district', 'neutral', 4.5);
    this.emitScore(0, '');
  }

  restart(): void {
    // Order matters: tear the world down before anything is told to start, or
    // the first wave spawns into corpses and last match's smoke.
    this.ai?.killAll();
    this.ctx.tryGet<IFX>('fx')?.clear();
    this.ctx.tryGet<IDecals>('decals')?.clear();
    this.killstreaks?.cancel();
    this.resetMatch();
    // Systems holding their own match state — the player's health, the weapon's
    // magazine, the killstreak ladder — reset themselves from this.
    this.ctx.events.emit('game:restart');
    this.player?.respawn?.();
    this.weapons?.addAmmo?.(999);
    this._state = 'briefing';
    this._phase = 'briefing';
    this.phaseTimer = T.openingSeconds;
    this.hold(false);
    this.ctx.events.emit('game:start');
    this.setObjective('Hold the market. Hostiles are moving in.');
    this.emitScore(0, '');
  }

  pause(paused: boolean): void {
    if (paused) {
      if (this._state !== 'playing' && this._state !== 'briefing') return;
      this.resumeState = this._state;
      this._state = 'paused';
      this.hold(true);
    } else {
      if (this._state !== 'paused') return;
      this._state = this.resumeState;
      this.hold(false);
    }
    this.ctx.events.emit('game:pause', paused);
  }

  /** Abandons the match. The menu uses this so its camera can take the scene. */
  toMenu(): void {
    this._state = 'menu';
    this._phase = 'idle';
    this.hold(true);
    this.pending = 0;
    this.waveAlive = 0;
    this.ai?.killAll();
    this.killstreaks?.cancel();
    this.setObjective('');
  }

  private resumeState: IDirector['state'] = 'playing';

  private resetMatch(): void {
    this._score = 0;
    this._xp = 0;
    this._kills = 0;
    this._deaths = 0;
    this._wave = 0;
    this._lives = T.maxLives;
    this._respawnIn = 0;
    this._waveSize = 0;
    this.pending = 0;
    this.waveAlive = 0;
    this.concurrent = 0;
    this.streak = 0;
    this._bestStreak = 0;
    this.nextMilestone = T.score.streakStep;
    this.multiCount = 0;
    this.multiTimer = 0;
  }

  /** Freezes or releases the parts of the game the director is allowed to own. */
  private hold(held: boolean): void {
    this.ai?.setEnabled(!held);
    // The player is frozen rather than disabled: disabling hands the camera to
    // whoever wants it, which is right for the menu and wrong for a pause.
    if (held && this._state === 'menu') {
      if (this.player) this.player.enabled = false;
    } else if (!held && this.player) {
      this.player.enabled = true;
    }
    this.player?.setFrozen(held && this._state !== 'menu');
  }

  /* =============================== frame ================================== */

  update(dt: number, _ctx: GameContext): void {
    if (this.multiTimer > 0) {
      this.multiTimer = Math.max(0, this.multiTimer - dt);
      if (this.multiTimer === 0) this.multiCount = 0;
    }

    switch (this._state) {
      case 'briefing':
        this.phaseTimer -= dt;
        if (this.phaseTimer <= 0) this.beginWave(this._wave + 1);
        break;
      case 'playing':
        this.tickWave(dt);
        break;
      case 'dead':
        this._respawnIn = Math.max(0, this._respawnIn - dt);
        if (this._respawnIn <= 0) this.redeploy();
        break;
      default:
        break;
    }
  }

  /* ================================ waves ================================= */

  private beginWave(n: number): void {
    this._wave = n;
    this._state = 'playing';
    this._phase = 'incoming';
    this._waveSize = waveSize(n);
    this.pending = this._waveSize;
    this.waveAlive = 0;
    this.concurrent = concurrentCap(n);
    this.spawnInterval = spawnInterval(n);
    this.spawnTimer = 0;
    this.phaseTimer = 3.2;
    this.squadSeed = n * 7;

    this.ctx.events.emit('game:wave', { wave: n, size: this._waveSize, phase: 'incoming' });
    this.setObjective(`Wave ${n} inbound — ${this._waveSize} hostiles`);
    this.ctx.events.emit('audio:duck', { amount: 0.25, duration: 1.2 });
  }

  private tickWave(dt: number): void {
    const alive = this.standing;

    if (this._phase === 'incoming') {
      this.phaseTimer -= dt;
      // The phase flips as soon as the fight is genuinely joined, so the banner
      // and the objective line do not lag the first contact.
      if (this.phaseTimer <= 0 || alive >= Math.min(3, this._waveSize)) {
        this._phase = 'active';
        this.ctx.events.emit('game:wave', {
          wave: this._wave,
          size: this._waveSize,
          phase: 'active',
        });
        this.setObjective(this.activeObjective());
      }
    }

    if (this._phase === 'incoming' || this._phase === 'active') {
      this.spawnTimer -= dt;
      if (this.pending > 0 && alive < this.concurrent && this.spawnTimer <= 0) {
        // Reinforcements arrive in pairs from the second wave on: two men from
        // one direction is a threat the player can read, one man at a time from
        // random directions is just noise.
        const burst = this._wave > 1 && this.pending > 1 && alive + 2 <= this.concurrent ? 2 : 1;
        for (let i = 0; i < burst; i++) this.spawnOne();
        this.spawnTimer = this.spawnInterval;
      }
      if (this.pending <= 0 && alive === 0) this.clearWave();
      else if (this._phase === 'active') this.setObjective(this.activeObjective());
    } else if (this._phase === 'cleared') {
      this.phaseTimer -= dt;
      const left = Math.ceil(this.phaseTimer);
      this.setObjective(`Regroup — wave ${this._wave + 1} in ${Math.max(0, left)}s`);
      if (this.phaseTimer <= 0) this.beginWave(this._wave + 1);
    }
  }

  private clearWave(): void {
    this._phase = 'cleared';
    this._waveSize = 0;
    this.phaseTimer = T.clearedSeconds;

    const bonus = T.score.waveBase + T.score.wavePerWave * this._wave;
    this.award(bonus, `Wave ${this._wave} cleared`);
    this._xp += T.xp.waveBase + T.xp.wavePerWave * this._wave;

    this.ctx.events.emit('game:wave', { wave: this._wave, size: 0, phase: 'cleared' });
    // The resupply is the reason the breather is worth standing still for.
    this.weapons?.addAmmo?.(Math.round(90 + this._wave * 20));
    this.player?.heal(45);
    this.notify(
      `WAVE ${this._wave} CLEARED`,
      'Resupplied — regroup and hold',
      'positive',
      4,
    );

    const ready = this.killstreaks?.earned ?? [];
    if (ready.length > 0) {
      this.notify('ORDNANCE AVAILABLE', 'Spend it before the next wave', 'warning', 3.6);
    }
  }

  private activeObjective(): string {
    const left = this.enemiesLeft;
    if (left <= 0) return 'Sector clear';
    if (left <= 3) return `Eliminate the last ${left === 1 ? 'hostile' : `${left} hostiles`}`;
    return `Eliminate hostiles — ${left} remaining`;
  }

  private spawnOne(): void {
    const ai = this.ai;
    if (!ai) return;
    const point = this.pickSpawn();
    if (!point) return;

    // Scatter is applied before the AI's own nav fixup, so a point that lands in
    // a wall is pulled back onto walkable ground rather than dropped.
    const angle = hash01(this.squadSeed * 31 + this.pending) * Math.PI * 2;
    const radius = hash01(this.squadSeed * 17 + this.pending * 3) * T.spawnScatter;
    _spawnAt.set(
      point.position.x + Math.cos(angle) * radius,
      point.position.y,
      point.position.z + Math.sin(angle) * radius,
    );

    const difficulty = this.rollDifficulty();
    const squad = this.squadSeed + Math.floor((this._waveSize - this.pending) / 3);
    if (ai.spawnDetailed) ai.spawnDetailed(_spawnAt, point.heading, difficulty, squad);
    else ai.spawn(_spawnAt, point.heading);
    this.pending--;
    this.waveAlive++;
  }

  /**
   * A spawn point far enough away that the player never sees a man appear, near
   * enough that the fight starts inside a reasonable walk. Candidates are scored
   * rather than filtered so the wave still spawns on a map whose geometry does
   * not offer anything in the ideal band.
   */
  private pickSpawn(): SpawnPoint | null {
    const points = this.world?.spawnPoints;
    if (!points || points.length === 0) return null;
    const from = this.player?.position ?? this.ctx.camera.position;

    let best: SpawnPoint | null = null;
    let bestScore = -Infinity;
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      if (p.team === 'player') continue;
      const d = Math.hypot(p.position.x - from.x, p.position.z - from.z);
      let score = (p.weight ?? 1) * 10;
      if (d < T.minSpawnDistance) score -= (T.minSpawnDistance - d) * 6;
      else if (d > T.maxSpawnDistance) score -= (d - T.maxSpawnDistance) * 1.5;
      else score += 20 - Math.abs(d - 45) * 0.25;
      // Rotates the preferred approach between spawns so a wave arrives from
      // more than one direction without ever picking somewhere silly.
      score += hash01(this.squadSeed * 97 + this.pending * 13 + i * 7) * 22;
      if (score > bestScore) {
        bestScore = score;
        best = p;
      }
    }
    return best ?? points[0];
  }

  private rollDifficulty(): Difficulty {
    const w = this._wave;
    const r = hash01(this.squadSeed * 131 + this.pending * 29 + this._kills * 3);
    if (w <= 2) return r < 0.5 ? 'recruit' : 'regular';
    if (w <= 4) return r < 0.18 ? 'recruit' : r < 0.78 ? 'regular' : 'veteran';
    if (w <= 7) return r < 0.5 ? 'regular' : r < 0.86 ? 'veteran' : 'elite';
    return r < 0.3 ? 'regular' : r < 0.72 ? 'veteran' : 'elite';
  }

  /* =============================== scoring ================================ */

  private onEnemyDeath(headshot: boolean): void {
    if (this._state !== 'playing' && this._state !== 'briefing') return;
    if (this.waveAlive > 0) this.waveAlive--;
    this._kills++;
    this.streak++;
    this._bestStreak = Math.max(this._bestStreak, this.streak);

    let delta = T.score.kill;
    let reason = 'Kill';
    if (headshot) {
      delta += T.score.headshot;
      reason = 'Headshot';
    }
    this._xp += T.xp.kill + (headshot ? T.xp.headshot : 0);

    // Multi-kills are paid on top of the kill that completed them, so the pop
    // that says "TRIPLE KILL" carries the whole value of the moment.
    this.multiCount = this.multiTimer > 0 ? this.multiCount + 1 : 1;
    this.multiTimer = T.score.multiWindow;
    if (this.multiCount > 1) {
      const tier = Math.min(this.multiCount - 1, T.score.multi.length - 1);
      delta += T.score.multi[tier];
      reason = MULTI_NAMES[Math.min(this.multiCount - 2, MULTI_NAMES.length - 1)];
    }

    this.award(delta, reason);

    if (this.streak >= this.nextMilestone) {
      const milestone = this.nextMilestone;
      this.nextMilestone += T.score.streakStep;
      this.award(T.score.streakBonus * (milestone / T.score.streakStep), `${milestone} kill streak`);
    }
  }

  private onStreakEarned(name: string): void {
    if (!this.running) return;
    this.award(T.score.streakEarned, name);
    this._xp += T.xp.streakEarned;
  }

  private award(delta: number, reason: string): void {
    this._score += delta;
    this.emitScore(delta, reason);
  }

  private emitScore(delta: number, reason: string): void {
    this.ctx.events.emit('ui:score', { score: this._score, delta, reason });
  }

  /* ============================ death and respawn ========================= */

  private onPlayerDeath(): void {
    if (this._state === 'over' || this._state === 'menu') return;
    this._deaths++;
    this.streak = 0;
    this.nextMilestone = T.score.streakStep;
    this.multiCount = 0;
    this._lives = Math.max(0, this._lives - 1);

    if (this._lives <= 0) {
      this.gameOver(false);
      return;
    }

    this._state = 'dead';
    this._respawnIn = T.respawnSeconds;
    this.ctx.events.emit('game:respawn', {
      seconds: T.respawnSeconds,
      livesLeft: this._lives,
    });
    this.setObjective('Waiting to redeploy');
  }

  private redeploy(): void {
    const spawn = this.safePlayerSpawn();
    if (spawn) this.player?.respawn?.(spawn.position, spawn.heading);
    else this.player?.respawn?.();
    this.weapons?.addAmmo?.(120);
    this._state = 'playing';
    // A wave that emptied while the player was dead must not deadlock; the
    // ordinary clear path is not reachable from `dead`.
    if (this.pending <= 0 && (this.ai?.aliveCount ?? 0) === 0 && this._phase !== 'cleared') {
      this.clearWave();
    } else {
      this.setObjective(this.activeObjective());
    }
  }

  /**
   * The player spawn furthest from anything alive. Redeploying into the middle
   * of the wave that just killed you is the single most infuriating thing a
   * survival mode can do.
   */
  private safePlayerSpawn(): SpawnPoint | null {
    const points = this.world?.spawnPoints;
    if (!points || points.length === 0) return null;
    const enemies = this.ai?.enemies ?? [];

    let best: SpawnPoint | null = null;
    let bestScore = -Infinity;
    for (const p of points) {
      if (p.team === 'enemy') continue;
      let nearest = Infinity;
      for (const e of enemies) {
        if (!e.alive) continue;
        const d = Math.hypot(e.position.x - p.position.x, e.position.z - p.position.z);
        if (d < nearest) nearest = d;
      }
      const score = (nearest === Infinity ? 120 : Math.min(nearest, 120)) + (p.weight ?? 1) * 4;
      if (score > bestScore) {
        bestScore = score;
        best = p;
      }
    }
    return best;
  }

  private gameOver(won: boolean): void {
    this._state = 'over';
    this._phase = 'over';
    this.hold(true);
    this.pending = 0;
    this.waveAlive = 0;
    this._waveSize = 0;
    this.ai?.killAll();
    this.setObjective('');
    this.ctx.events.emit('game:over', { won, score: this._score });
  }

  /* =============================== helpers ================================ */

  private setObjective(text: string): void {
    if (text === this._objective) return;
    this._objective = text;
    if (!text) {
      this.ctx.events.emit('ui:objective', { text: '' });
      return;
    }
    // Waves arrive from the enemy end of the map, so pointing the objective at
    // the spawn centroid gives the compass something honest to mark.
    const point = this._phase === 'incoming' ? this.enemyCentroid() : undefined;
    this.ctx.events.emit('ui:objective', point ? { text, position: point } : { text });
  }

  private enemyCentroid(): THREE.Vector3 | undefined {
    const points = this.world?.spawnPoints;
    if (!points) return undefined;
    let n = 0;
    _centroid.set(0, 0, 0);
    for (const p of points) {
      if (p.team !== 'enemy') continue;
      _centroid.add(p.position);
      n++;
    }
    if (n === 0) return undefined;
    return _centroid.multiplyScalar(1 / n);
  }

  private notify(
    title: string,
    subtitle: string,
    tone: 'neutral' | 'positive' | 'warning' | 'danger',
    duration: number,
  ): void {
    if (this.quiet) return;
    this.ctx.events.emit('ui:notify', { title, subtitle, tone, duration });
  }

  dispose(): void {
    for (const off of this.unsubscribe) off();
    this.unsubscribe.length = 0;
  }
}

/* ------------------------------ curves --------------------------------- */

const MULTI_NAMES = ['Double kill', 'Triple kill', 'Multi kill', 'Rampage'];

/** Hostiles a wave fields in total. Grows fast early, then flattens. */
function waveSize(n: number): number {
  return Math.min(28, 4 + Math.round(Math.pow(n, 1.32) * 1.55));
}

/** How many of them may be alive at once. */
function concurrentCap(n: number): number {
  return Math.min(12, 4 + Math.floor(n * 0.85));
}

/** Seconds between reinforcement groups. */
function spawnInterval(n: number): number {
  return Math.max(0.85, 2.9 - n * 0.19);
}

/**
 * Deterministic 0..1 from an integer. The wave composition and the spawn
 * rotation both need variety without needing a seeded RNG object, and a match
 * that replays identically from the same inputs is easier to debug.
 */
function hash01(n: number): number {
  let x = (n | 0) * 0x9e3779b1;
  x ^= x >>> 15;
  x = (x * 0x85ebca6b) | 0;
  x ^= x >>> 13;
  return ((x >>> 0) % 100000) / 100000;
}
