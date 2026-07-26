import type { EngineContext, System } from '../core/System';
import { Signals } from '../core/Signals';
import type { AirstrikeSystem } from './Airstrike';

export interface KillstreakDef {
  id: string;
  name: string;
  /** Consecutive kills required. */
  cost: number;
  /** Key binding index (killstreak1..3). */
  slot: number;
  description: string;
}

export const KILLSTREAKS: KillstreakDef[] = [
  {
    id: 'uav',
    name: 'RECON SWEEP',
    cost: 3,
    slot: 0,
    description: 'Reveals hostile positions on the compass for 30 seconds.',
  },
  {
    id: 'airstrike',
    name: 'AIRSTRIKE',
    cost: 5,
    slot: 1,
    description: 'Designate a target for a two-ship bombing run.',
  },
  {
    id: 'resupply',
    name: 'AMMO DROP',
    cost: 8,
    slot: 2,
    description: 'Refills reserve ammunition for the whole squad.',
  },
];

/**
 * Killstreak progression.
 *
 * Streaks are earned on consecutive kills and lost on death — the classic
 * risk/reward loop. Earned streaks queue rather than stacking, so a player on
 * a long run gets a steady drip of rewards instead of everything at once.
 */
export class KillstreakSystem implements System {
  readonly name = 'killstreaks';
  readonly order = 36;

  streak = 0;
  bestStreak = 0;
  score = 0;
  kills = 0;
  /** Earned but not yet used, by killstreak id. */
  readonly available = new Map<string, number>();
  /** UAV timer. */
  uavTimeLeft = 0;

  private ctx!: EngineContext;
  private airstrike!: AirstrikeSystem;
  private readonly earnedThisStreak = new Set<string>();

  init(ctx: EngineContext): void {
    this.ctx = ctx;
    this.airstrike = ctx.get<AirstrikeSystem>('airstrike')!;

    Signals.on('actor:killed', ({ headshot }) => {
      this.kills++;
      this.streak++;
      this.bestStreak = Math.max(this.bestStreak, this.streak);
      this.score += headshot ? 150 : 100;
      Signals.emit('game:scoreChanged', { score: this.score, streak: this.streak });
      this.checkEarned();
    });

    Signals.on('player:died', () => {
      this.streak = 0;
      this.earnedThisStreak.clear();
      Signals.emit('game:scoreChanged', { score: this.score, streak: 0 });
    });
  }

  private checkEarned(): void {
    for (const ks of KILLSTREAKS) {
      if (this.streak >= ks.cost && !this.earnedThisStreak.has(ks.id)) {
        this.earnedThisStreak.add(ks.id);
        this.available.set(ks.id, (this.available.get(ks.id) ?? 0) + 1);
        Signals.emit('killstreak:earned', { id: ks.id, name: ks.name });
        Signals.emit('ui:notify', {
          title: ks.name + ' READY',
          subtitle: `PRESS ${ks.slot + 3} TO DEPLOY`,
          tone: 'good',
        });
        Signals.emit('audio:oneshot', { id: 'ks_earned', volume: 0.9 });
      }
    }
  }

  update(dt: number, ctx: EngineContext): void {
    const input = ctx.input;

    if (input.pressed('killstreak1')) this.deploy('uav');
    if (input.pressed('killstreak2')) this.deploy('airstrike');
    if (input.pressed('killstreak3')) this.deploy('resupply');

    if (this.uavTimeLeft > 0) this.uavTimeLeft = Math.max(0, this.uavTimeLeft - dt);
  }

  deploy(id: string): void {
    const count = this.available.get(id) ?? 0;
    if (count <= 0) {
      Signals.emit('audio:oneshot', { id: 'ui_error', volume: 0.4 });
      return;
    }

    switch (id) {
      case 'airstrike':
        if (this.airstrike.phase !== 'idle') {
          if (this.airstrike.targeting) Signals.emit('killstreak:cancelled', { id });
          return;
        }
        this.available.set(id, count - 1);
        Signals.emit('killstreak:armed', { id });
        break;

      case 'uav':
        this.available.set(id, count - 1);
        this.uavTimeLeft = 30;
        Signals.emit('ui:notify', { title: 'RECON SWEEP ACTIVE', tone: 'good' });
        Signals.emit('audio:oneshot', { id: 'radio_uav', volume: 0.9 });
        break;

      case 'resupply': {
        this.available.set(id, count - 1);
        const weapons = this.ctx.get('weapons') as unknown as { addAmmo(f: number): void } | undefined;
        weapons?.addAmmo(0.6);
        Signals.emit('ui:notify', { title: 'RESUPPLIED', tone: 'good' });
        Signals.emit('audio:oneshot', { id: 'ks_resupply', volume: 0.8 });
        break;
      }
    }
  }

  /** Next killstreak the player is working toward, for the HUD. */
  get nextStreak(): { def: KillstreakDef; remaining: number } | null {
    for (const ks of KILLSTREAKS) {
      if (!this.earnedThisStreak.has(ks.id)) {
        return { def: ks, remaining: ks.cost - this.streak };
      }
    }
    return null;
  }
}
