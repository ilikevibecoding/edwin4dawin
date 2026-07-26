import * as THREE from 'three';
import type { GameContext, System } from '../core/GameContext';

/** Baseline sun + ambient. Replaced by the CSM / IBL rig. */
export default class LightingSystem implements System {
  readonly key = 'lighting';
  readonly order = 20;

  init(ctx: GameContext): void {
    const sun = new THREE.DirectionalLight(0xfff0dd, 3.2);
    sun.position.set(60, 80, 40);
    sun.castShadow = ctx.quality.shadows;
    sun.shadow.mapSize.set(ctx.quality.shadowMapSize, ctx.quality.shadowMapSize);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 300;
    const d = 90;
    sun.shadow.camera.left = -d;
    sun.shadow.camera.right = d;
    sun.shadow.camera.top = d;
    sun.shadow.camera.bottom = -d;
    sun.shadow.bias = -0.0004;
    ctx.scene.add(sun);
    ctx.scene.add(new THREE.HemisphereLight(0x9dc4ff, 0x6b5b45, 0.9));
  }
}
