import type * as THREE from 'three';

/** Everything the show is allowed to ask of the audio engine. */
export interface AudioBus {
  /** One-shot effect. `position` (world space) enables spatialisation. */
  sfx(name: SfxName, options?: { position?: THREE.Vector3; gain?: number; rate?: number }): void;
  /** Start or change a continuous loop (engines, alarms, room tone). */
  loop(name: LoopName, gain: number, options?: { position?: THREE.Vector3; rate?: number }): void;
  /** Musical direction. */
  music(mood: MusicMood, intensity: number): void;
  /** Speak a narration line by id. */
  narrate(lineId: string): void;
  /** Stop any in-flight narration (used when scrubbing). */
  stopNarration(): void;
  /** Called on every seek so loops and voices do not double up. */
  resetTransients(): void;
}

export type SfxName =
  | 'laserHeavy'
  | 'laserLight'
  | 'blasterRed'
  | 'blasterBlue'
  | 'hullImpact'
  | 'shieldFlash'
  | 'explosionSmall'
  | 'doorCut'
  | 'doorBreach'
  | 'alarm'
  | 'spark'
  | 'footstep'
  | 'droidChirp'
  | 'droidWorried'
  | 'droidRoll'
  | 'dataTransfer'
  | 'hologramOn'
  | 'clampRelease'
  | 'podLaunch'
  | 'atmosphere'
  | 'tractorBeam'
  | 'breath'
  | 'saberIgnite'
  | 'lowBoom'
  | 'metalStress'
  | 'uiClick';

export type LoopName =
  | 'destroyerRumble'
  | 'runnerEngine'
  | 'corridorTone'
  | 'alarmLoop'
  | 'fire'
  | 'podEngine'
  | 'entryRumble'
  | 'respirator';

export type MusicMood =
  | 'silence'
  | 'void'
  | 'wonder'
  | 'chase'
  | 'battle'
  | 'capture'
  | 'siege'
  | 'menace'
  | 'tender'
  | 'resolve'
  | 'hope';

/** No-op implementation used before the audio context exists. */
export const SILENT_BUS: AudioBus = {
  sfx: () => {},
  loop: () => {},
  music: () => {},
  narrate: () => {},
  stopNarration: () => {},
  resetTransients: () => {},
};
