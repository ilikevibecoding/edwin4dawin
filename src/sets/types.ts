import type * as THREE from 'three';
import type { PostFX } from '../engine/postfx';
import type { WetGround } from '../engine/wetground';
import type { Lightning, Rain } from '../engine/weather';

export type Mark = { pos: [number, number, number]; rotY: number };

export type ScanTargetDef = {
  id: string;
  /** World position of the marker. */
  at: [number, number, number];
  label: string;
  readout: string[];
  /** Optional flag set when found. */
  flag?: string;
};

export type GameSet = {
  name: string;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  /** Character placement marks. */
  marks: Record<string, Mark>;
  /** Named lights the director can dim, flicker or swing. */
  lights: Record<string, THREE.Light>;
  scanTargets?: ScanTargetDef[];
  wetGround?: WetGround;
  rain?: Rain;
  lightning?: Lightning;
  update(dt: number, time: number): void;
  prerender?(renderer: THREE.WebGLRenderer, camera: THREE.PerspectiveCamera): void;
  applyLook(fx: PostFX): void;
  dispose(): void;
  /** Extra per-set hooks the story can trigger. */
  actions?: Record<string, (on: boolean) => void>;
};

export type SetContext = {
  renderer: THREE.WebGLRenderer;
  quality: import('../engine/quality').QualitySettings;
};
