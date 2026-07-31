import * as THREE from 'three';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import { Blitter, FULLSCREEN_VERTEX } from '../Blitter';

/**
 * Spatial anti-aliasing fallbacks for tiers that cannot afford TAA.
 *
 * Both run on the composited, sRGB-encoded image: edge detection wants
 * perceptual contrast, and running them before the tonemap would make the
 * threshold behave differently in every part of the frame.
 *
 * The upstream `FXAAShader` fragment is reused verbatim behind the shared
 * full-screen-triangle vertex shader, and `SMAAPass` is driven directly rather
 * than through an `EffectComposer` — it only ever needed a read target, a write
 * target and a renderer.
 */
export class AAPass {
  private readonly fxaaMaterial: THREE.ShaderMaterial;
  private readonly fxaaUniforms: Record<string, THREE.IUniform>;
  private smaa: SMAAPass | null = null;
  private width = 1;
  private height = 1;

  constructor() {
    this.fxaaUniforms = {
      tDiffuse: { value: null },
      resolution: { value: new THREE.Vector2(1 / 1024, 1 / 1024) },
    };
    this.fxaaMaterial = new THREE.ShaderMaterial({
      uniforms: this.fxaaUniforms,
      vertexShader: FULLSCREEN_VERTEX,
      fragmentShader: FXAAShader.fragmentShader,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
      blending: THREE.NoBlending,
    });
    this.fxaaMaterial.name = 'FXAA';
  }

  setSize(width: number, height: number): void {
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    (this.fxaaUniforms.resolution.value as THREE.Vector2).set(1 / this.width, 1 / this.height);
    this.smaa?.setSize(this.width, this.height);
  }

  /** SMAA owns three targets and two LUT textures; only build it if it is used. */
  private ensureSmaa(): SMAAPass {
    if (!this.smaa) {
      this.smaa = new SMAAPass();
      this.smaa.setSize(this.width, this.height);
    }
    return this.smaa;
  }

  releaseSmaa(): void {
    this.smaa?.dispose();
    this.smaa = null;
  }

  fxaa(
    renderer: THREE.WebGLRenderer,
    blitter: Blitter,
    source: THREE.Texture,
    target: THREE.WebGLRenderTarget | null,
  ): void {
    this.fxaaUniforms.tDiffuse.value = source;
    blitter.blit(renderer, this.fxaaMaterial, target);
  }

  smaaResolve(
    renderer: THREE.WebGLRenderer,
    source: THREE.WebGLRenderTarget,
    target: THREE.WebGLRenderTarget | null,
  ): void {
    const pass = this.ensureSmaa();
    pass.renderToScreen = target === null;
    // `writeBuffer` is ignored when rendering to screen; passing `source` keeps
    // the signature satisfied without allocating a throwaway target.
    pass.render(renderer, target ?? source, source, 0, false);
  }

  /** Cost in full-screen blits, for the debug overlay. */
  blitCost(mode: 'fxaa' | 'smaa'): number {
    return mode === 'smaa' ? 3 : 1;
  }

  dispose(): void {
    this.fxaaMaterial.dispose();
    this.releaseSmaa();
  }
}
