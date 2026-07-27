import * as THREE from 'three';
import { Layers, type GameContext } from '../../core/GameContext';
import { Composer } from './Composer';
import { VIEWMODEL_COMPOSITE_FRAG } from '../../shaders/post/camera.glsl';

/**
 * The first-person weapon, rendered separately and composited into the colour
 * chain before bloom and tone mapping.
 *
 * Separate because it has to be: the viewmodel occupies a volume the world
 * camera's depth range cannot represent without either clipping into geometry or
 * wrecking depth precision, and it must be excluded from world motion blur and
 * world depth of field. It is composited *before* the tone map rather than after
 * so it still shares the display transform, the grade, bloom and grain — a
 * weapon that skips those looks pasted on, which is the giveaway in a lot of
 * browser shooters.
 *
 * Anti-aliasing is MSAA on this target alone. The weapon is a small, high-
 * contrast, mostly-static object right where the player is looking, which is the
 * one case TAA handles worst (no useful motion vectors, and sway keeps rejecting
 * the history), and MSAA on a single cheap pass costs almost nothing.
 */
export class ViewmodelPass {
  /** Focus distance while hip-firing / while aimed, in metres. */
  hipFocus = 0.62;
  adsFocus = 0.34;
  /** Blur strength, in pixels of CoC per metre of defocus at one metre. */
  hipScale = 2.5;
  adsScale = 9.0;
  maxCoc = 12;

  private composer: Composer;
  private composite: THREE.ShaderMaterial;
  private target: THREE.WebGLRenderTarget | null = null;
  private depth: THREE.DepthTexture | null = null;
  private width = 1;
  private height = 1;
  private samples = 0;

  constructor(composer: Composer) {
    this.composer = composer;
    this.composite = composer.material(
      VIEWMODEL_COMPOSITE_FRAG,
      {
        uWorld: { value: null },
        uViewmodel: { value: null },
        uViewmodelDepth: { value: null },
        uTexel: { value: new THREE.Vector2() },
        uNearFar: { value: new THREE.Vector2(0.008, 12) },
        uFocus: { value: 0.6 },
        uCocScale: { value: 3 },
        uMaxCoc: { value: 12 },
        uFrame: { value: 0 },
      },
      { TAPS: 10 },
    );
  }

  get texture(): THREE.Texture | null {
    return this.target ? this.target.texture : null;
  }

  resize(width: number, height: number, maxSamples: number): void {
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    this.composer.destroyTarget(this.target);
    this.samples = Math.min(4, maxSamples);
    this.depth = this.composer.createDepthTexture(this.width, this.height);
    this.target = this.composer.createTarget(this.width, this.height, {
      depthBuffer: true,
      depthTexture: this.depth,
      samples: this.samples,
    });
    (this.composite.uniforms.uTexel.value as THREE.Vector2).set(1 / this.width, 1 / this.height);
  }

  /** Renders the weapon into its own target. Returns false when nothing drew. */
  render(ctx: GameContext): boolean {
    if (!this.target) return false;
    const scene = ctx.viewmodelScene;
    const camera = ctx.viewmodelCamera;
    // The viewmodel may live in either scene; the layer is what defines it.
    const hasOwnScene = scene.children.length > 0;
    const source = hasOwnScene ? scene : ctx.scene;
    if (!hasOwnScene && !this.worldHasViewmodel(ctx.scene)) return false;

    const r = this.composer.renderer;
    const background = source.background;
    source.background = null;
    // Alpha 0 so the composite knows which pixels the weapon covers.
    this.composer.clear(this.target, 0x000000, 0, true);
    r.setRenderTarget(this.target);
    r.render(source, camera);
    source.background = background;
    return true;
  }

  private worldHasViewmodel(scene: THREE.Scene): boolean {
    let found = false;
    scene.traverse((o) => {
      if (!found && o.layers.isEnabled(Layers.VIEWMODEL) && (o as THREE.Mesh).isMesh) found = true;
    });
    return found;
  }

  /** Blurs the weapon by its own CoC and composites it over the world. */
  compositeInto(
    target: THREE.WebGLRenderTarget,
    world: THREE.Texture,
    camera: THREE.PerspectiveCamera,
    adsFactor: number,
    frame: number,
  ): void {
    if (!this.target || !this.depth) return;
    const u = this.composite.uniforms;
    u.uWorld.value = world;
    u.uViewmodel.value = this.target.texture;
    u.uViewmodelDepth.value = this.depth;
    (u.uNearFar.value as THREE.Vector2).set(camera.near, camera.far);
    const t = Math.min(1, Math.max(0, adsFactor));
    u.uFocus.value = this.hipFocus + (this.adsFocus - this.hipFocus) * t;
    u.uCocScale.value = this.hipScale + (this.adsScale - this.hipScale) * t;
    u.uMaxCoc.value = this.maxCoc;
    u.uFrame.value = frame;
    this.composer.draw(this.composite, target);
  }
}
