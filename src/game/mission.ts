import * as THREE from 'three';
import { events } from '../core/events';
import { ZONES } from '../world/layout';
import type { Player } from './player';
import type { Hostage } from './hostage';
import type { AISystem } from './ai/ai';
import type { DifficultyDef, ObjectiveId, ObjectiveState } from './types';
import type { ShutterEntity } from '../world/mapbuilder';

export type MissionPhase = 'active' | 'extracting' | 'won' | 'lost';

const EXTRACT_HOLD = 8;

export class Mission {
  objectives = new Map<ObjectiveId, ObjectiveState>();
  timeLeft = 12 * 60;
  phase: MissionPhase = 'active';
  loseReason = '';
  extractT = 0;
  stats = { kills: 0, shots: 0, hits: 0, damageTaken: 0, elapsed: 0 };
  private difficulty: DifficultyDef;
  private player: Player;
  private hostages: Hostage[];
  private ai: AISystem;
  private shutter: ShutterEntity | null;
  private infiltrated = false;
  private victoryDelay = 0;
  private unsub: (() => void)[] = [];

  constructor(player: Player, hostages: Hostage[], ai: AISystem, shutter: ShutterEntity | null, difficulty: DifficultyDef) {
    this.player = player;
    this.hostages = hostages;
    this.ai = ai;
    this.shutter = shutter;
    this.difficulty = difficulty;
    this.timeLeft = difficulty.missionTime;
    this.setObjective('infiltrate', 'active');
    this.setObjective('hostageA', 'hidden');
    this.setObjective('hostageB', 'hidden');
    this.setObjective('extract', 'hidden');

    this.unsub.push(events.on('enemy:killed', ({ byPlayer }) => {
      if (byPlayer) this.stats.kills++;
    }));
    this.unsub.push(events.on('player:died', () => {
      this.fail('VANGUARD-2 down. The response team was lost.');
    }));
    this.unsub.push(events.on('hostage:state', ({ id, state }) => {
      if (state === 'dead') {
        this.fail('A hostage was killed. Mission failed.');
      }
      if (state === 'following') {
        const objId = id === 'A' ? 'hostageA' : 'hostageB';
        this.setObjective(objId, 'done');
        if (this.objectives.get('hostageA') === 'done' && this.objectives.get('hostageB') === 'done') {
          this.setObjective('extract', 'active');
          events.emit('announce', { text: 'Both hostages secured — move to the extraction garage', kind: 'objective' });
        }
      }
    }));
  }

  setDifficulty(d: DifficultyDef): void {
    this.difficulty = d;
  }

  setObjective(id: ObjectiveId, state: ObjectiveState): void {
    if (this.objectives.get(id) === state) return;
    this.objectives.set(id, state);
    events.emit('objective:update', { id, state, text: OBJECTIVE_TEXT[id] });
  }

  step(dt: number): void {
    if (this.phase === 'won' || this.phase === 'lost') return;
    this.stats.elapsed += dt;
    this.timeLeft -= dt;
    if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      this.fail('Kestrel reinforcements arrived. Window closed.');
      return;
    }

    // infiltrate: player inside building
    if (!this.infiltrated && this.player.pos.z > 9.2) {
      this.infiltrated = true;
      this.setObjective('infiltrate', 'done');
      if (this.objectives.get('hostageA') === 'hidden') this.setObjective('hostageA', 'active');
      if (this.objectives.get('hostageB') === 'hidden') this.setObjective('hostageB', 'active');
      events.emit('announce', { text: 'Inside the annex. Locate the two hostages.', kind: 'objective' });
    }

    // extraction logic
    const zone = ZONES.find((z) => z.id === 'extraction')!;
    const inZone = (p: THREE.Vector3): boolean =>
      p.x >= zone.rect[0] && p.x <= zone.rect[2] && p.z >= zone.rect[1] && p.z <= zone.rect[3] && p.y < 1.5;

    if (this.objectives.get('extract') === 'active' || this.phase === 'extracting') {
      const livingHostages = this.hostages.filter((h) => h.alive);
      const allIn = livingHostages.length > 0 && livingHostages.every((h) => inZone(h.pos)) && inZone(this.player.pos);
      if (this.phase === 'active' && allIn) {
        this.phase = 'extracting';
        this.extractT = 0;
        for (const h of livingHostages) {
          h.gatherPoint = new THREE.Vector3(41 + (h.id === 'B' ? 2.2 : 0), 0, 35.4);
        }
        events.emit('announce', { text: 'Extraction called in — hold the garage', kind: 'objective' });
        events.emit('mission:state', { state: 'extracting' });
      } else if (this.phase === 'extracting') {
        if (!inZone(this.player.pos)) {
          this.phase = 'active';
          this.extractT = 0;
          for (const h of livingHostages) h.gatherPoint = null;
          events.emit('announce', { text: 'Extraction paused — return to the garage', kind: 'danger' });
          events.emit('mission:state', { state: 'active' });
        } else {
          this.extractT += dt;
          if (this.extractT >= EXTRACT_HOLD && this.victoryDelay === 0) {
            this.shutter?.open();
            this.victoryDelay = 3.4;
            for (const h of livingHostages) h.setState('extracted');
            events.emit('announce', { text: 'Shutter opening — extraction team on site', kind: 'success' });
          }
        }
      }
    }

    if (this.victoryDelay > 0) {
      this.victoryDelay -= dt;
      if (this.victoryDelay <= 0) {
        this.phase = 'won';
        this.setObjective('extract', 'done');
        events.emit('mission:state', { state: 'won' });
      }
    }
  }

  fail(reason: string): void {
    if (this.phase === 'lost' || this.phase === 'won') return;
    this.phase = 'lost';
    this.loseReason = reason;
    events.emit('mission:state', { state: 'lost' });
  }

  reset(): void {
    this.phase = 'active';
    this.loseReason = '';
    this.extractT = 0;
    this.victoryDelay = 0;
    this.infiltrated = false;
    this.timeLeft = this.difficulty.missionTime;
    this.stats = { kills: 0, shots: 0, hits: 0, damageTaken: 0, elapsed: 0 };
    this.setObjective('infiltrate', 'active');
    this.setObjective('hostageA', 'hidden');
    this.setObjective('hostageB', 'hidden');
    this.setObjective('extract', 'hidden');
    events.emit('mission:state', { state: 'active' });
  }

  dispose(): void {
    for (const u of this.unsub) u();
  }

  snapshot(): Record<string, unknown> {
    const obj: Record<string, string> = {};
    for (const [k, v] of this.objectives) obj[k] = v;
    return {
      phase: this.phase,
      timeLeft: Math.round(this.timeLeft * 10) / 10,
      extractCountdown: this.phase === 'extracting' ? Math.max(0, Math.round((EXTRACT_HOLD - this.extractT) * 10) / 10) : null,
      objectives: obj,
      enemiesAlive: this.ai.aliveCount(),
      kills: this.stats.kills,
      loseReason: this.loseReason || null,
    };
  }
}

const OBJECTIVE_TEXT: Record<ObjectiveId, string> = {
  infiltrate: 'Infiltrate the Northstar Annex',
  hostageA: 'Locate & free the hostage in the server room',
  hostageB: 'Locate & free the hostage in the conference room',
  extract: 'Escort both hostages to the extraction garage',
  survive: 'Survive',
};
