import * as THREE from 'three';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { Assets } from '../core/Assets';
import { BoneIndex } from './BoneMap';
import { retargetClip } from './Retarget';

/**
 * Shared animation set.
 *
 * Clips live on three different source rigs, and the cast is built on a fourth.
 * Each clip is retargeted once per rig type at load and reused by every
 * character on that rig, since retargeting samples the animation frame by frame
 * and is far too slow to repeat per character.
 */

interface SourceRig {
  mesh: THREE.SkinnedMesh;
  root: THREE.Object3D;
  bones: BoneIndex;
  /** Height of the model in its own units, used to scale hip translation. */
  unitHeight: number;
  clips: Map<string, THREE.AnimationClip>;
}

/** Canonical clip name -> [source file, clip name in that file]. */
const CLIP_SOURCES: Record<string, [string, string]> = {
  idle: ['Xbot', 'idle'],
  idleAlt: ['Soldier', 'Idle'],
  walk: ['Xbot', 'walk'],
  run: ['Xbot', 'run'],
  nod: ['Xbot', 'agree'],
  shake: ['Xbot', 'headShake'],
  sad: ['Xbot', 'sad_pose'],
  sneak: ['Xbot', 'sneak_pose'],
  dance: ['Michelle', 'SambaDance'],
};

const SOURCE_FILES = ['Xbot', 'Soldier', 'Michelle'] as const;
type SourceFile = (typeof SOURCE_FILES)[number];

/** Which rig key each clip source is authored for. */
const RIG_OF_FILE: Record<SourceFile, string> = {
  Xbot: 'xbot',
  Soldier: 'soldier',
  Michelle: 'michelle',
};

export class AnimationLibrary {
  private sources = new Map<SourceFile, SourceRig>();
  private cache = new Map<string, Map<string, THREE.AnimationClip>>();

  async load(assets: Assets): Promise<void> {
    for (const file of SOURCE_FILES) {
      const gltf = await assets.gltf(`models/${file}.glb`);
      // Work on a clone so driving the source skeleton during retargeting cannot
      // disturb the template used to build actors.
      const root = SkeletonUtils.clone(gltf.scene);
      root.position.set(0, 0, 0);
      root.rotation.set(0, 0, 0);
      root.scale.set(1, 1, 1);
      let best: THREE.SkinnedMesh | null = null;
      root.traverse((o) => {
        const m = o as THREE.SkinnedMesh;
        if (!m.isSkinnedMesh) return;
        if (!best || (m.geometry.attributes.position?.count ?? 0) > (best.geometry.attributes.position?.count ?? 0)) {
          best = m;
        }
      });
      if (!best) continue;
      const mesh: THREE.SkinnedMesh = best;
      root.updateMatrixWorld(true);
      const size = new THREE.Vector3();
      new THREE.Box3().setFromObject(root).getSize(size);
      const clips = new Map<string, THREE.AnimationClip>();
      for (const clip of gltf.animations) clips.set(clip.name, clip);
      this.sources.set(file, {
        mesh,
        root,
        bones: new BoneIndex(mesh.skeleton),
        unitHeight: size.y || 1,
        clips,
      });
    }
  }

  /**
   * Retargets the whole library onto a rig. `template` must be the untouched
   * loaded scene so the target sits at the origin with an identity transform.
   */
  clipsFor(rigKey: string, template: THREE.Object3D): Map<string, THREE.AnimationClip> {
    const cached = this.cache.get(rigKey);
    if (cached) return cached;

    const proxyRoot = SkeletonUtils.clone(template);
    proxyRoot.position.set(0, 0, 0);
    proxyRoot.rotation.set(0, 0, 0);
    proxyRoot.scale.set(1, 1, 1);
    proxyRoot.updateMatrixWorld(true);

    let best: THREE.SkinnedMesh | null = null;
    proxyRoot.traverse((o) => {
      const m = o as THREE.SkinnedMesh;
      if (!m.isSkinnedMesh) return;
      if (!best || (m.geometry.attributes.position?.count ?? 0) > (best.geometry.attributes.position?.count ?? 0)) {
        best = m;
      }
    });
    const out = new Map<string, THREE.AnimationClip>();
    if (!best) return out;
    const proxy: THREE.SkinnedMesh = best;

    const size = new THREE.Vector3();
    new THREE.Box3().setFromObject(proxyRoot).getSize(size);
    const targetUnitHeight = size.y || 1;

    for (const [name, [file, clipName]] of Object.entries(CLIP_SOURCES)) {
      const source = this.sources.get(file as SourceFile);
      if (!source) continue;
      const clip = source.clips.get(clipName);
      if (!clip) continue;

      // A clip authored for this very rig needs no retargeting; using it as-is is
      // both cheaper and exact.
      if (RIG_OF_FILE[file as SourceFile] === rigKey) {
        out.set(name, clip.clone());
        continue;
      }

      try {
        const retargeted = retargetClip(clip, source.mesh.skeleton, source.root, proxy.skeleton, proxyRoot, {
          fps: 30,
          positionScale: targetUnitHeight / source.unitHeight,
        });
        retargeted.name = name;
        out.set(name, retargeted);
      } catch (err) {
        console.warn(`[anim] retarget failed for ${name}:`, err);
      }
    }

    this.cache.set(rigKey, out);
    return out;
  }
}
