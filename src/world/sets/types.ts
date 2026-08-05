import * as THREE from 'three';
import { PlanarReflection } from '../../engine/Reflection';
import { MistLayers, Rain } from '../Weather';
import type { PostParams } from '../../engine/Post';
import type { ActorLightPalette } from '../../engine/ActorLights';

export interface SetContext {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
}

export interface GameSet {
  id: string;
  root: THREE.Group;
  env: THREE.Texture;
  /** Multiplier on the image-based ambient for this location. */
  envIntensity?: number;
  fog: THREE.FogExp2 | null;
  rain?: Rain;
  mist?: MistLayers;
  reflection?: PlanarReflection;
  /** Named anchors for camera framing and actor placement. */
  marks: Record<string, THREE.Vector3>;
  /** Per-set grade so each location has its own look. */
  post: Partial<PostParams>;
  /** Travelling three-point rig colours for dialogue coverage. */
  actorLights?: Partial<ActorLightPalette>;
  update(dt: number, time: number, camera: THREE.PerspectiveCamera): void;
  dispose(): void;
}

export const mark = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/** Collect shader materials that need a uTime uniform ticked each frame. */
export function collectTimed(root: THREE.Object3D): THREE.ShaderMaterial[] {
  const out: THREE.ShaderMaterial[] = [];
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    const mats = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
    for (const m of mats) {
      const sm = m as THREE.ShaderMaterial;
      if (sm.uniforms && sm.uniforms.uTime && !out.includes(sm)) out.push(sm);
    }
  });
  return out;
}

export function disposeTree(root: THREE.Object3D) {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    const mats = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
    for (const m of mats) m.dispose();
  });
}
