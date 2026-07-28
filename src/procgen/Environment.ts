import * as THREE from 'three';
import { SKY_VERTEX_GLSL, buildSkyFragment } from './shaders/sky.glsl';

export interface EnvironmentOptions {
  /**
   * Cube face resolution before PMREM filtering. Fixed for the lifetime of the
   * instance: PMREM derives its atlas size from this, and the atlas cannot be
   * resized without allocating a new output texture, which would break every
   * `scene.environment` reference already handed out.
   */
  size: number;
  viewSteps: number;
  lightSteps: number;
  sunDirection: THREE.Vector3;
}

/**
 * Procedural sky, baked to a cube map and PMREM-filtered into the IBL source
 * for every material in the game.
 *
 * The PMREM target is reused when the sun moves, so the exposed texture object
 * stays identity-stable: consumers that already assigned it to
 * `scene.environment` keep working without being told.
 */
export class Environment {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly mesh: THREE.Mesh;
  private material: THREE.ShaderMaterial;
  private readonly cubeTarget: THREE.WebGLCubeRenderTarget;
  private readonly cubeCamera: THREE.CubeCamera;
  private viewSteps: number;
  private lightSteps: number;
  private pmrem: THREE.PMREMGenerator | null = null;
  private pmremTarget: THREE.WebGLRenderTarget | null = null;

  readonly sunDirection = new THREE.Vector3(0.5, 0.7, 0.35).normalize();

  constructor(renderer: THREE.WebGLRenderer, options: EnvironmentOptions) {
    this.renderer = renderer;
    this.sunDirection.copy(options.sunDirection).normalize();
    this.viewSteps = options.viewSteps;
    this.lightSteps = options.lightSteps;

    this.material = new THREE.ShaderMaterial({
      name: 'ProcSky',
      vertexShader: SKY_VERTEX_GLSL,
      fragmentShader: buildSkyFragment(options.viewSteps, options.lightSteps),
      glslVersion: THREE.GLSL3,
      side: THREE.BackSide,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uSunDirection: { value: this.sunDirection.clone() },
        uSunIntensity: { value: 24.0 },
        uMieStrength: { value: 1.15 },
        uSunDiscRadiance: { value: 2900.0 },
        uSunGlow: { value: 26.0 },
        // Angular radius. The true sun is 0.0047 rad, but a disc that small
        // covers under two texels of a cube face and aliases into a flickering
        // dot, so it is widened and its radiance scaled down to hold the energy.
        uSunAngular: { value: 0.011 },
        // Sand and dust over asphalt, as a diffuse albedo rather than a colour.
        uGroundAlbedo: { value: new THREE.Color(0.36, 0.30, 0.21) },
        /**
         * Fraction of the single bounce off an infinite lit plane that survives a
         * city's own inter-shadowing. The plane model over-delivers because half
         * of what it integrates is ground that is really in the shadow of a
         * building; measured against a path-traced reference this lands near a
         * half, and it is the one knob that trades warm shadow fill against
         * washing out the vertical gradient the IBL needs to read as outdoors.
         */
        uGroundBounce: { value: 0.55 },
        uGain: { value: 0.5 },
      },
    });

    this.mesh = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), this.material);
    this.mesh.frustumCulled = false;
    this.scene.add(this.mesh);

    this.cubeTarget = new THREE.WebGLCubeRenderTarget(options.size, {
      type: THREE.HalfFloatType,
      format: THREE.RGBAFormat,
      colorSpace: THREE.LinearSRGBColorSpace,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      generateMipmaps: false,
      depthBuffer: false,
      stencilBuffer: false,
    });
    this.cubeTarget.texture.name = 'skyCube';
    this.cubeCamera = new THREE.CubeCamera(0.1, 10, this.cubeTarget);
  }

  /** The raw sky cube, suitable for `scene.background`. */
  get skyTexture(): THREE.CubeTexture {
    return this.cubeTarget.texture;
  }

  /** PMREM-filtered environment for `scene.environment` and `material.envMap`. */
  get environmentMap(): THREE.Texture | null {
    return this.pmremTarget ? this.pmremTarget.texture : null;
  }

  /** Sun colour after atmospheric extinction, for matching the directional light. */
  sunTint(target = new THREE.Color()): THREE.Color {
    const elevation = THREE.MathUtils.clamp(this.sunDirection.y, 0.0, 1.0);
    const warm = new THREE.Color(1.0, 0.52, 0.24);
    const white = new THREE.Color(1.0, 0.965, 0.92);
    return target.copy(warm).lerp(white, THREE.MathUtils.smoothstep(elevation, 0.02, 0.42));
  }

  setSunDirection(direction: THREE.Vector3): void {
    this.sunDirection.copy(direction).normalize();
    (this.material.uniforms.uSunDirection.value as THREE.Vector3).copy(this.sunDirection);
    this.render();
  }

  /**
   * Re-marches the atmosphere at a new step count. Only the shader is replaced,
   * so both exposed textures keep their identity across a quality change.
   */
  setQuality(viewSteps: number, lightSteps: number): void {
    if (viewSteps === this.viewSteps && lightSteps === this.lightSteps) return;
    this.viewSteps = viewSteps;
    this.lightSteps = lightSteps;

    const replacement = new THREE.ShaderMaterial({
      name: 'ProcSky',
      vertexShader: SKY_VERTEX_GLSL,
      fragmentShader: buildSkyFragment(viewSteps, lightSteps),
      glslVersion: THREE.GLSL3,
      side: THREE.BackSide,
      depthTest: false,
      depthWrite: false,
      uniforms: this.material.uniforms,
    });
    this.mesh.material = replacement;
    this.material.dispose();
    this.material = replacement;
    this.render();
  }

  /** Tuning hooks for the render module's time-of-day handling. */
  setSkyParameters(params: {
    sunIntensity?: number;
    mieStrength?: number;
    gain?: number;
    groundAlbedo?: THREE.ColorRepresentation;
    sunDiscRadiance?: number;
  }): void {
    const u = this.material.uniforms;
    if (params.sunIntensity !== undefined) u.uSunIntensity.value = params.sunIntensity;
    if (params.mieStrength !== undefined) u.uMieStrength.value = params.mieStrength;
    if (params.gain !== undefined) u.uGain.value = params.gain;
    if (params.sunDiscRadiance !== undefined) u.uSunDiscRadiance.value = params.sunDiscRadiance;
    if (params.groundAlbedo !== undefined) {
      (u.uGroundAlbedo.value as THREE.Color).set(params.groundAlbedo);
    }
    this.render();
  }

  render(): void {
    const renderer = this.renderer;
    const prevTarget = renderer.getRenderTarget();
    const prevToneMapping = renderer.toneMapping;
    const prevAutoClear = renderer.autoClear;

    renderer.toneMapping = THREE.NoToneMapping;
    renderer.autoClear = true;
    this.cubeCamera.update(renderer, this.scene);

    if (!this.pmrem) {
      this.pmrem = new THREE.PMREMGenerator(renderer);
      this.pmrem.compileCubemapShader();
    }
    this.pmremTarget = this.pmrem.fromCubemap(this.cubeTarget.texture, this.pmremTarget);
    this.pmremTarget.texture.name = 'environmentMap';

    renderer.setRenderTarget(prevTarget);
    renderer.toneMapping = prevToneMapping;
    renderer.autoClear = prevAutoClear;
  }

  /** Approximate GPU footprint of the cube map plus its filtered mip pyramid. */
  get textureBytes(): number {
    const face = this.cubeTarget.width * this.cubeTarget.height * 8;
    const cube = face * 6;
    const pmrem = this.pmremTarget
      ? this.pmremTarget.width * this.pmremTarget.height * 8
      : 0;
    return cube + pmrem;
  }

  dispose(): void {
    this.pmrem?.dispose();
    this.pmrem = null;
    this.pmremTarget?.dispose();
    this.pmremTarget = null;
    this.cubeTarget.dispose();
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}
