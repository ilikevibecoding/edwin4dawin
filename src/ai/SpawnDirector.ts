import * as THREE from 'three';
import type { SpawnPoint } from '../core/Contracts';
import type { Rng } from '../core/MathX';
import type { EnemyVariant } from './EnemyModel';

/**
 * SpawnDirector.ts — paced, escalating enemy waves.
 *
 * Maintains a target number of live hostiles, topping up from the level's
 * `enemySpawns` while never popping a soldier into the player's view. Pressure
 * escalates wave over wave (more live enemies, more heavies), with a cooldown
 * between reinforcement trickles so combat breathes.
 */

export interface SpawnRequest {
  position: THREE.Vector3;
  yaw: number;
  variant: EnemyVariant;
  tag?: string;
}

export interface SpawnDirectorOpts {
  spawns: SpawnPoint[];
  rng: Rng;
  /** Actually create the enemy. */
  spawn: (req: SpawnRequest) => void;
  liveCount: () => number;
  /** Player eye + forward for the "not in view" test (may be null). */
  playerView: () => { eye: THREE.Vector3; forward: THREE.Vector3 } | null;
}

const FOV_COS = Math.cos(60 * (Math.PI / 180)); // don't spawn within ±60° of aim

export class SpawnDirector {
  private opts: SpawnDirectorOpts;
  private wave = 0;
  private targetLive = 0;
  private trickleCooldown = 0;
  private active = false;

  constructor(opts: SpawnDirectorOpts) {
    this.opts = opts;
  }

  /** Begin autonomous wave pacing. */
  begin(initialTarget = 6) {
    this.active = true;
    this.targetLive = initialTarget;
    this.wave = 1;
  }

  stop() {
    this.active = false;
  }

  get waveNumber() {
    return this.wave;
  }

  update(dt: number) {
    if (!this.active) return;
    this.trickleCooldown -= dt;
    const live = this.opts.liveCount();

    // Escalate when the wave is mostly cleared.
    if (live <= Math.max(1, this.targetLive * 0.25)) {
      this.wave++;
      this.targetLive = Math.min(20, 5 + this.wave * 2);
    }

    if (live < this.targetLive && this.trickleCooldown <= 0) {
      const want = Math.min(this.targetLive - live, 3);
      const made = this.spawnBatch(want);
      if (made > 0) this.trickleCooldown = 2.5;
    }
  }

  /** Contract entry point: spawn a wave of `count` immediately. */
  spawnWave(count: number): number {
    return this.spawnBatch(count, true);
  }

  private spawnBatch(count: number, force = false): number {
    let made = 0;
    const view = this.opts.playerView();
    const candidates = this.pickSpawns(count, view, force);
    for (const sp of candidates) {
      this.opts.spawn({
        position: sp.position.clone(),
        yaw: sp.yaw,
        variant: this.pickVariant(),
        tag: sp.tag,
      });
      made++;
    }
    return made;
  }

  private pickSpawns(
    count: number,
    view: { eye: THREE.Vector3; forward: THREE.Vector3 } | null,
    force: boolean
  ): SpawnPoint[] {
    const pool = this.opts.spawns.filter((sp) => force || !this.inView(sp.position, view));
    // Shuffle-ish selection via the seeded RNG, farthest-from-view first.
    const scored = pool
      .map((sp) => ({ sp, s: this.score(sp, view) }))
      .sort((a, b) => b.s - a.s);
    const out: SpawnPoint[] = [];
    for (let i = 0; i < scored.length && out.length < count; i++) out.push(scored[i].sp);
    return out;
  }

  private score(sp: SpawnPoint, view: { eye: THREE.Vector3; forward: THREE.Vector3 } | null): number {
    let s = this.opts.rng.range(0, 1);
    if (view) {
      const d = sp.position.distanceTo(view.eye);
      s += Math.min(d, 60) * 0.02; // prefer farther spawns
    }
    return s;
  }

  private inView(pos: THREE.Vector3, view: { eye: THREE.Vector3; forward: THREE.Vector3 } | null): boolean {
    if (!view) return false;
    _d.subVectors(pos, view.eye);
    const dist = _d.length();
    if (dist > 55) return false; // far away → fine to spawn (off screen anyway)
    if (dist < 0.001) return true;
    _d.multiplyScalar(1 / dist);
    return _d.dot(view.forward) > FOV_COS && dist < 40;
  }

  private pickVariant(): EnemyVariant {
    const r = this.opts.rng();
    // Heavies get more common in later waves.
    const heavyChance = Math.min(0.28, 0.05 + this.wave * 0.03);
    if (r < heavyChance) return 'heavy';
    if (r < heavyChance + 0.45) return 'militia';
    return 'assault';
  }
}

const _d = new THREE.Vector3();
