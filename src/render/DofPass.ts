import * as THREE from 'three';
import { Pass, FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js';
import { DofCompositeShader } from './shaders';

/**
 * Scene render + depth-aware defocus in a single pass.
 *
 * It owns its colour/depth target so the depth texture is never simultaneously
 * bound as a sampler and a framebuffer attachment (which would be a feedback
 * loop). Behaves like `RenderPass`: writes into the read buffer, no swap.
 */
export class DofPass extends Pass {
  readonly target: THREE.WebGLRenderTarget;
  private readonly material: THREE.ShaderMaterial;
  private readonly quad: FullScreenQuad;
  private readonly clearColor = new THREE.Color(0x000000);

  focus = 40;
  range = 60;
  maxBlur = 1.4;
  strength = 1;

  constructor(
    private scene: THREE.Scene,
    private camera: THREE.PerspectiveCamera,
    width: number,
    height: number,
  ) {
    super();
    this.needsSwap = false;

    const depthTexture = new THREE.DepthTexture(width, height);
    depthTexture.format = THREE.DepthFormat;
    depthTexture.type = THREE.UnsignedIntType;
    depthTexture.minFilter = THREE.NearestFilter;
    depthTexture.magFilter = THREE.NearestFilter;

    this.target = new THREE.WebGLRenderTarget(width, height, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      type: THREE.HalfFloatType,
      depthTexture,
      depthBuffer: true,
      stencilBuffer: false,
      samples: 0,
    });
    this.target.texture.name = 'DofPass.scene';

    this.material = new THREE.ShaderMaterial({
      name: DofCompositeShader.name,
      uniforms: THREE.UniformsUtils.clone(DofCompositeShader.uniforms) as Record<string, THREE.IUniform>,
      vertexShader: DofCompositeShader.vertexShader,
      fragmentShader: DofCompositeShader.fragmentShader,
      depthTest: false,
      depthWrite: false,
    });
    this.material.uniforms.tDiffuse.value = this.target.texture;
    this.material.uniforms.tDepth.value = depthTexture;
    this.material.uniforms.uTexel.value = [1 / width, 1 / height];
    this.quad = new FullScreenQuad(this.material);
  }

  setCamera(camera: THREE.PerspectiveCamera): void {
    this.camera = camera;
  }

  setScene(scene: THREE.Scene): void {
    this.scene = scene;
  }

  override setSize(width: number, height: number): void {
    this.target.setSize(width, height);
    this.material.uniforms.uTexel.value = [1 / width, 1 / height];
  }

  override render(
    renderer: THREE.WebGLRenderer,
    _writeBuffer: THREE.WebGLRenderTarget,
    readBuffer: THREE.WebGLRenderTarget,
  ): void {
    const prevTarget = renderer.getRenderTarget();
    renderer.getClearColor(this.clearColor);
    const prevAlpha = renderer.getClearAlpha();

    renderer.setRenderTarget(this.target);
    renderer.setClearColor(this.clearColor, prevAlpha);
    renderer.clear(true, true, true);
    renderer.render(this.scene, this.camera);

    const u = this.material.uniforms;
    u.uNear.value = this.camera.near;
    u.uFar.value = this.camera.far;
    u.uFocus.value = this.focus;
    u.uRange.value = this.range;
    u.uMaxBlur.value = this.maxBlur;
    u.uStrength.value = this.strength;

    renderer.setRenderTarget(this.renderToScreen ? null : readBuffer);
    if (this.clear) renderer.clear();
    this.quad.render(renderer);

    renderer.setRenderTarget(prevTarget);
  }

  override dispose(): void {
    this.target.dispose();
    this.target.depthTexture?.dispose();
    this.material.dispose();
    this.quad.dispose();
  }
}
