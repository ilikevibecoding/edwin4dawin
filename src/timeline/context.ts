import * as THREE from 'three';
import type { Stage } from '../stage/Stage';
import type { CameraDirector } from '../camera/CameraDirector';
import type { AudioEngine } from '../audio/AudioEngine';
import type { Sfx } from '../audio/Sfx';
import type { MusicEngine } from '../audio/Music';
import type { Narration } from '../audio/Narration';
import type { RenderSystem } from '../render/RenderSystem';
import type { TitleCrawl } from '../stage/TitleCrawl';
import type { Rng } from '../core/Random';

/** Everything a chapter is allowed to touch. */
export interface ShowContext {
  stage: Stage;
  director: CameraDirector;
  audio: AudioEngine;
  sfx: Sfx;
  music: MusicEngine;
  narration: Narration;
  render: RenderSystem;
  crawl: TitleCrawl;
  rng: Rng;
  /** Push a caption that is not narration (epilogue lines, chapter cards). */
  setCard(text: string | null, subtitle?: string): void;
  /** Current absolute timeline seconds. */
  now(): number;
  /** True while the app is scrubbing rather than playing forward. */
  scrubbing: boolean;
}

export const V = (x = 0, y = 0, z = 0): THREE.Vector3 => new THREE.Vector3(x, y, z);
