/** PLACEHOLDER — replaced by the deferred-ish forward+ post-processing stack. */
import * as THREE from 'three';
import type { EngineContext, System } from '../core/System';
import { ORDER } from '../core/System';
import type { RenderSystem } from '../core/Contracts';

export class RenderSystemImpl implements RenderSystem, System {
  readonly name = 'render' as const;
  readonly order = ORDER.RENDER;
  readonly dependencies = ['procgen'] as const;
  sunLight!: THREE.DirectionalLight;
  readonly stats = { drawCalls: 0, triangles: 0, programs: 0 };

  init(ctx: EngineContext): void {
    ctx.scene.background = new THREE.Color(0x1a2028);
    const hemi = new THREE.HemisphereLight(0x9fb8d0, 0x3a3228, 0.7);
    ctx.scene.add(hemi);
    this.sunLight = new THREE.DirectionalLight(0xfff2e0, 2.4);
    this.sunLight.position.set(60, 90, 40);
    this.sunLight.castShadow = ctx.config.shadowsEnabled;
    ctx.scene.add(this.sunLight);
    ctx.scene.add(this.sunLight.target);

    ctx.engine.renderHook = (c) => {
      c.renderer.autoClear = true;
      c.renderer.render(c.scene, c.camera);
      c.renderer.autoClear = false;
      c.renderer.clearDepth();
      c.renderer.render(c.viewScene, c.viewCamera);
      c.renderer.autoClear = true;
      this.stats.drawCalls = c.renderer.info.render.calls;
      this.stats.triangles = c.renderer.info.render.triangles;
      this.stats.programs = c.renderer.info.programs?.length ?? 0;
    };
  }

  addScreenShake(): void {}
  addScreenFlash(): void {}
  setConcussion(): void {}
  requestDynamicLight(): void {}
  setExposure(v: number): void {
    void v;
  }
  setFocusDistance(): void {}
  dispose(): void {}
}
