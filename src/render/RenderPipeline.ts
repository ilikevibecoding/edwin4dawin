import * as THREE from 'three';
import type { GameContext, System } from '../core/GameContext';

/**
 * Baseline draw phase. This is intentionally minimal; the full HDR post
 * pipeline (TAA, GTAO, SSR, bloom, volumetrics, grading) replaces it.
 */
export default class RenderPipeline implements System {
  readonly key = 'render';
  readonly order = 1000;

  init(ctx: GameContext): void {
    ctx.renderer.autoClear = false;
  }

  render(_dt: number, ctx: GameContext): void {
    const r = ctx.renderer;
    r.clear(true, true, true);
    r.render(ctx.scene, ctx.camera);
    if (ctx.viewmodelScene.children.length > 0) {
      r.clearDepth();
      ctx.viewmodelCamera.position.copy(ctx.camera.position);
      ctx.viewmodelCamera.quaternion.copy(ctx.camera.quaternion);
      r.render(ctx.viewmodelScene, ctx.viewmodelCamera);
    }
  }
}
