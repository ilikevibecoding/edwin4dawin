import * as THREE from 'three';
import type { GameContext, System } from '../core/GameContext';

/** Baseline flat sky colour. Replaced by the physical sky + volumetric clouds. */
export default class SkySystem implements System {
  readonly key = 'sky';
  readonly order = 15;

  init(ctx: GameContext): void {
    ctx.scene.background = new THREE.Color(0x8fb3d9);
    ctx.scene.fog = new THREE.FogExp2(0xa8bdd4, 0.0035);
  }
}
