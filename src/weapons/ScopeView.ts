import * as THREE from 'three';
import { GAMEPLAY } from '../core/Config';
import type { EngineContext } from '../core/System';
import { clamp, saturate } from '../core/MathUtils';

/**
 * The sight picture inside a magnified optic.
 *
 * A modelled scope cannot be looked through. The tube is a pipe, and the far
 * opening of a 250 mm tube with a 40 mm objective subtends about four degrees
 * from the eye, so an honest interior gives a peephole no matter how wide the
 * ocular is — and even if it did work, looking through it would show the world
 * at 1x, because a hole does not magnify.
 *
 * So the ocular lens is not glass, it is a screen. The world is rendered a
 * second time from the player's eye through a narrow-FOV camera and shown on a
 * disc at the eye end of the tube, which is what every shipped FPS does and the
 * only way to get real magnification, a real eye box, and correct scope shadow.
 *
 * The FOV of that camera is derived, not authored:
 *
 *   an object of angular size a is tan(a)/tan(worldFov/2) NDC tall unaided;
 *   inside the disc it is (tan(a)/tan(scopeFov/2)) * apertureRadiusNdc tall;
 *   asking for the second to be `zoom` times the first gives
 *
 *     tan(scopeFov/2) = apertureRadiusNdc * tan(worldFov/2) / zoom
 *
 * so the magnification stays honest whatever the aperture's size on screen —
 * change the eye relief or the tube radius and the image tracks it.
 */

const SCOPE_LENS_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

/**
 * Lens shader.
 *
 * Beyond sampling the render: lateral chromatic aberration that grows with the
 * square of the radius (real ocular groups fringe at the edge and are clean in
 * the middle), a darkening roll-off into the tube wall, a cool coating tint, and
 * a broad diagonal sheen. `uActive` cross-fades to unlit glass so the same disc
 * reads as a dark lens when the weapon is at the hip.
 */
const SCOPE_LENS_FRAG = /* glsl */ `
uniform sampler2D uScene;
uniform float uActive;
uniform float uAberration;
uniform float uShadow;
uniform vec3 uTint;
uniform vec3 uGlass;
varying vec2 vUv;

void main() {
  vec2 centred = vUv - 0.5;
  float r = length(centred) * 2.0;

  // Radial fringing: red pulled out, blue pulled in.
  vec2 dir = centred * uAberration * r * r;
  vec3 image;
  image.r = texture2D(uScene, vUv + dir).r;
  image.g = texture2D(uScene, vUv).g;
  image.b = texture2D(uScene, vUv - dir).b;
  image *= uTint;

  // Edge roll-off, then the hard cut into the blacked-out tube wall.
  image *= mix(1.0, 0.62, smoothstep(0.78, 1.0, r));
  image *= 1.0 - smoothstep(0.95, 1.0, r) * uShadow;

  // Coating sheen: a soft band across the upper left of the glass.
  float sheen = smoothstep(0.35, 1.0, dot(normalize(centred + 1e-5), vec2(-0.66, 0.75)));
  vec3 glass = uGlass * (0.5 + sheen * 0.85);

  vec3 outgoing = mix(glass, image, uActive);
  gl_FragColor = vec4(outgoing, 1.0);

  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

/**
 * How far into the aperture the blackout annulus overlaps the ocular disc. The
 * annulus sits a fraction of a millimetre closer to the eye than the disc, so an
 * exact match would subtend very slightly more and leave a one-pixel ring of
 * receiver showing at the edge of the sight picture.
 */
export const APERTURE_MASK_OVERLAP = 0.96;

const RESOLUTION: Record<string, number> = {
  ultra: 1024,
  high: 1024,
  medium: 768,
  low: 512,
};

export interface ScopeFrame {
  /** ADS blend; the render is skipped and the lens goes dark below a threshold. */
  blend: number;
  /** Optical magnification relative to the unaided view. */
  zoom: number;
  /** Aperture radius in NDC half-heights, i.e. its on-screen size. */
  apertureNdc: number;
}

export class ScopeView {
  /** Assigned to the ocular disc of whichever magnified optic is equipped. */
  readonly material: THREE.ShaderMaterial;

  private target: THREE.WebGLRenderTarget | null = null;
  private readonly camera = new THREE.PerspectiveCamera(8, 1, 0.05, GAMEPLAY.camera.far);
  private resolution = 1024;
  private live = false;

  constructor() {
    this.material = new THREE.ShaderMaterial({
      name: 'vm_scope_lens',
      vertexShader: SCOPE_LENS_VERT,
      fragmentShader: SCOPE_LENS_FRAG,
      uniforms: {
        uScene: { value: null },
        uActive: { value: 0 },
        uAberration: { value: 0.0075 },
        uShadow: { value: 1 },
        uTint: { value: new THREE.Color(0.94, 0.97, 1.03) },
        uGlass: { value: new THREE.Color(0.016, 0.022, 0.032) },
      },
    });
  }

  setQuality(tier: string): void {
    const next = RESOLUTION[tier] ?? 768;
    if (next === this.resolution) return;
    this.resolution = next;
    this.target?.dispose();
    this.target = null;
  }

  /**
   * Renders the world through the scope. Must run before the render module's
   * frame, which it does: systems update, then the frame is drawn.
   */
  update(ctx: EngineContext, frame: ScopeFrame): void {
    const uniforms = this.material.uniforms;
    // Below a quarter blend the scope is not yet at the eye and the disc is
    // hidden behind the shadow annulus anyway, so the extra scene pass would be
    // paid for nothing.
    const active = saturate((frame.blend - 0.25) / 0.45);
    uniforms.uActive.value = active;
    if (active <= 0 || frame.apertureNdc <= 0) {
      this.live = false;
      return;
    }

    if (!this.target) {
      this.target = new THREE.WebGLRenderTarget(this.resolution, this.resolution, {
        depthBuffer: true,
        type: THREE.HalfFloatType,
      });
      // The render module works in linear light and tone-maps at composite, so
      // this target must hold linear radiance too or the sight picture would be
      // graded twice and read washed out against the world around it.
      this.target.texture.colorSpace = THREE.NoColorSpace;
      this.target.texture.name = 'vm_scope';
      this.target.texture.minFilter = THREE.LinearFilter;
      this.target.texture.magFilter = THREE.LinearFilter;
      this.target.texture.generateMipmaps = false;
    }

    const camera = ctx.camera;
    camera.updateMatrixWorld();
    this.camera.matrixAutoUpdate = false;
    this.camera.matrix.copy(camera.matrixWorld);
    this.camera.matrix.decompose(this.camera.position, this.camera.quaternion, this.camera.scale);
    this.camera.matrixWorld.copy(camera.matrixWorld);
    this.camera.matrixWorldInverse.copy(this.camera.matrixWorld).invert();

    const worldHalf = Math.tan(THREE.MathUtils.degToRad(camera.fov) * 0.5);
    const zoom = Math.max(1.05, frame.zoom);
    const half = clamp((frame.apertureNdc * worldHalf) / zoom, 0.002, worldHalf);
    this.camera.fov = THREE.MathUtils.radToDeg(Math.atan(half)) * 2;
    this.camera.aspect = 1;
    this.camera.near = camera.near;
    this.camera.far = camera.far;
    this.camera.updateProjectionMatrix();

    const renderer = ctx.renderer;
    const prevTarget = renderer.getRenderTarget();
    const prevActiveCubeFace = renderer.getActiveCubeFace();
    const prevActiveMipLevel = renderer.getActiveMipmapLevel();
    const prevAutoClear = renderer.autoClear;
    const prevToneMapping = renderer.toneMapping;
    const prevXrEnabled = renderer.xr.enabled;

    renderer.xr.enabled = false;
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.autoClear = true;
    renderer.setRenderTarget(this.target);
    renderer.render(ctx.scene, this.camera);

    renderer.setRenderTarget(prevTarget, prevActiveCubeFace, prevActiveMipLevel);
    renderer.autoClear = prevAutoClear;
    renderer.toneMapping = prevToneMapping;
    renderer.xr.enabled = prevXrEnabled;

    uniforms.uScene.value = this.target.texture;
    this.live = true;
  }

  /** True when the disc is showing a render from this frame. */
  get rendered(): boolean {
    return this.live;
  }

  dispose(): void {
    this.target?.dispose();
    this.target = null;
    this.material.dispose();
  }
}
