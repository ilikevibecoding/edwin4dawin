/**
 * Radio traffic.
 *
 * Support callouts are what turn a killstreak from a button into a chain of
 * command: the player asks, someone answers, and then the ordnance arrives. Each
 * line is a squelch break, a voice line and the transcript pushed to the HUD, so
 * the beat lands even before the audio module has a voice for it and even for a
 * player with the volume down.
 *
 * Scheduled rather than fired inline because the timing is the performance —
 * "STRIKE INBOUND" on the confirm, "TEN SECONDS" over the approach, "ROUNDS
 * AWAY" as the racks empty, "GOOD EFFECT" once the dust is up.
 */
import type { KillstreakDeps } from './Deps';
import { SOUNDS } from './Tuning';

export interface RadioLine {
  /** Seconds into the sequence. */
  at: number;
  /** Voice line id handed to the audio system. */
  sound: string;
  /** Transcript shown on the HUD. */
  text: string;
  sub?: string;
  /** Use the large centre-screen callout rather than the notification stack. */
  announce?: boolean;
  kind?: 'info' | 'warn' | 'reward';
}

const CAPACITY = 12;

export class Radio {
  private readonly queue: Array<RadioLine & { fired: boolean }> = [];
  private count = 0;
  private clock = 0;

  constructor(private readonly deps: KillstreakDeps) {
    for (let i = 0; i < CAPACITY; i++) {
      this.queue.push({ at: 0, sound: '', text: '', fired: true });
    }
  }

  /** Replaces the schedule and restarts the clock. */
  play(lines: readonly RadioLine[]): void {
    this.count = Math.min(lines.length, CAPACITY);
    for (let i = 0; i < this.count; i++) {
      const slot = this.queue[i];
      const line = lines[i];
      slot.at = line.at;
      slot.sound = line.sound;
      slot.text = line.text;
      slot.sub = line.sub;
      slot.announce = line.announce;
      slot.kind = line.kind;
      slot.fired = false;
    }
    for (let i = this.count; i < CAPACITY; i++) this.queue[i].fired = true;
    this.clock = 0;
  }

  update(dt: number): void {
    if (this.count === 0) return;
    this.clock += dt;
    let pending = 0;
    for (let i = 0; i < this.count; i++) {
      const line = this.queue[i];
      if (line.fired) continue;
      if (this.clock < line.at) {
        pending++;
        continue;
      }
      line.fired = true;
      this.speak(line);
    }
    if (pending === 0) this.count = 0;
  }

  private speak(line: RadioLine): void {
    this.deps.play2D(SOUNDS.radioSquelch, { volume: 0.5, pitch: 0.98 });
    this.deps.play2D(line.sound, { volume: 0.95 });
    if (line.announce) this.deps.announce(line.text, line.sub, 2.6);
    else this.deps.notify(line.text, line.sub, line.kind ?? 'info');
  }

  /** Immediate line, outside any schedule. */
  say(sound: string, text: string, sub?: string, announce = false): void {
    this.speak({ at: 0, sound, text, sub, announce });
  }

  clear(): void {
    this.count = 0;
    this.clock = 0;
  }
}
