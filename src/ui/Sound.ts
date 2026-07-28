/**
 * UI sound cues.
 *
 * The audio module synthesises a full set of interface sounds and drives the
 * combat ones itself (hitmarkers and the kill confirm hang off `combat:hit` and
 * `combat:kill`, so they must not be played from here or they double up). What
 * it cannot see is anything that happens purely in the interface: a menu
 * opening, a button taking a press, the respawn clock ticking down. Those are
 * played from here.
 *
 * Everything is optional. The audio system may be absent, may not have the id,
 * and cannot make a sound at all before the first user gesture, so every call
 * goes through one guarded path rather than being checked at each site.
 */
import type { AudioSystem } from '../core/Contracts';
import type { EngineContext } from '../core/System';

export type UiCue =
  | 'notify'
  | 'reward'
  | 'error'
  | 'select'
  | 'nav'
  | 'back'
  | 'open'
  | 'close'
  | 'objective'
  | 'countdown'
  | 'countdownFinal';

const SOUND_ID: Record<UiCue, string> = {
  notify: 'ui_notify',
  reward: 'ui_reward',
  error: 'ui_error',
  select: 'ui_select',
  nav: 'ui_nav',
  back: 'ui_back',
  open: 'ui_open',
  close: 'ui_close',
  objective: 'ui_objective',
  countdown: 'ui_countdown',
  countdownFinal: 'ui_countdown_final',
};

const VOLUME: Partial<Record<UiCue, number>> = {
  nav: 0.4,
  select: 0.55,
  back: 0.5,
  open: 0.6,
  close: 0.55,
  countdown: 0.45,
  countdownFinal: 0.6,
};

export class UiSound {
  private ctx: EngineContext | null = null;
  private audio: AudioSystem | null = null;

  bind(ctx: EngineContext): void {
    this.ctx = ctx;
  }

  play(cue: UiCue): void {
    const audio = this.audio ?? (this.audio = this.ctx?.tryGet<AudioSystem>('audio') ?? null);
    if (!audio?.unlocked) return;
    audio.play2D(SOUND_ID[cue], { volume: VOLUME[cue] ?? 0.7 });
  }
}
