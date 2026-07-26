import * as THREE from 'three';
import { Pass } from 'postprocessing';

/**
 * Draws the first-person weapon on top of the world.
 *
 * The depth buffer is cleared first so the weapon can never clip through
 * walls, then the viewmodel is drawn with its own narrower FOV. `gl.depthRange`
 * confines the weapon to the front 2% of the depth buffer, which lets later
 * screen-space effects identify viewmodel pixels (`depth < VIEWMODEL_DEPTH_MAX`)
 * and treat them differently — no aerial fog on the gun, no world-scale DoF.
 *
 * With a 5cm near plane, world geometry only reaches a depth of 0.02 within
 * ~5cm of the eye, so the partition is effectively free and unambiguous.
 *
 * The viewmodel scene must contain no shadow-casting lights: shadow maps are
 * rendered inside `renderer.render()`, and they would inherit the compressed
 * depth range.
 */
export const VIEWMODEL_DEPTH_MAX = 0.02;

export class ViewModelPass extends Pass {
  private viewScene: THREE.Scene;
  private viewCamera: THREE.PerspectiveCamera;

  constructor(viewScene: THREE.Scene, viewCamera: THREE.PerspectiveCamera) {
    super('ViewModelPass');
    this.viewScene = viewScene;
    this.viewCamera = viewCamera;
    // Draw into the buffer we were handed rather than ping-ponging.
    this.needsSwap = false;
    // Refresh the composer's shared depth texture so downstream depth-aware
    // effects see the weapon.
    (this as any).needsDepthBlit = true;
  }

  render(
    renderer: THREE.WebGLRenderer,
    inputBuffer: THREE.WebGLRenderTarget | null,
    _outputBuffer: THREE.WebGLRenderTarget | null,
    _dt?: number,
    _stencilTest?: boolean
  ) {
    if (this.viewScene.children.length === 0) return;

    const gl = renderer.getContext();
    const prevAutoClear = renderer.autoClear;
    const prevTarget = renderer.getRenderTarget();

    renderer.autoClear = false;
    renderer.setRenderTarget(this.renderToScreen ? null : inputBuffer);
    renderer.clearDepth();

    gl.depthRange(0, VIEWMODEL_DEPTH_MAX);
    renderer.render(this.viewScene, this.viewCamera);
    gl.depthRange(0, 1);

    renderer.setRenderTarget(prevTarget);
    renderer.autoClear = prevAutoClear;
  }

  /** The world pass must reserve the front slice for us. */
  static applyWorldDepthRange(renderer: THREE.WebGLRenderer) {
    renderer.getContext().depthRange(VIEWMODEL_DEPTH_MAX, 1);
  }

  static resetDepthRange(renderer: THREE.WebGLRenderer) {
    renderer.getContext().depthRange(0, 1);
  }
}

/**
 * RenderPass variant that reserves the near depth slice for the viewmodel.
 * Behaves like a normal scene render otherwise.
 */
export class WorldRenderPass extends Pass {
  private worldScene: THREE.Scene;
  private worldCamera: THREE.PerspectiveCamera;
  clearColor = new THREE.Color(0x000000);

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    super('WorldRenderPass');
    this.worldScene = scene;
    this.worldCamera = camera;
    this.needsSwap = false;
    (this as any).needsDepthBlit = true;
  }

  render(
    renderer: THREE.WebGLRenderer,
    inputBuffer: THREE.WebGLRenderTarget | null,
    _outputBuffer: THREE.WebGLRenderTarget | null
  ) {
    const prevAutoClear = renderer.autoClear;
    renderer.setRenderTarget(this.renderToScreen ? null : inputBuffer);
    renderer.autoClear = true;
    // No depthRange call here: shadow maps are rendered inside this
    // renderer.render(), and a non-default depth range would be baked into the
    // shadow map while the lookup still expects [0,1], silently disabling every
    // shadow. The world doesn't need the partition anyway — with a 5cm near
    // plane, nothing in the world can land inside the viewmodel's depth slice.
    renderer.render(this.worldScene, this.worldCamera);
    renderer.autoClear = prevAutoClear;
  }
}
