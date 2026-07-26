/** PLACEHOLDER — replaced by the full procedural WebAudio implementation. */
import type { EngineContext, System } from '../core/System';
import { ORDER } from '../core/System';
import type { AudioSystem } from '../core/Contracts';

export class AudioSystemImpl implements AudioSystem, System {
  readonly name = 'audio' as const;
  readonly order = ORDER.AUDIO;
  unlocked = false;

  init(_ctx: EngineContext): void {}
  async unlock(): Promise<void> {
    this.unlocked = true;
  }
  play(): void {}
  play2D(): void {}
  gunshot(): void {}
  setListener(): void {}
  setDeafen(): void {}
  setMasterVolume(): void {}
  setMusicIntensity(): void {}
  setAmbience(): void {}
  dispose(): void {}
}
