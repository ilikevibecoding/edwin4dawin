import * as THREE from 'three';

/**
 * The prefiltered environment probe.
 *
 * `ISky` already renders a cubemap of the atmosphere, one face per frame as the
 * sun moves. What it does not have is the ground: the sky's lower hemisphere is
 * a planetary-scale bounce off a mean albedo, not the sand the player is
 * standing on. So the probe is composited before it is prefiltered — sky above,
 * terrain bounce below, with a soft horizon between them.
 *
 * That lower hemisphere is what makes a desert map look expensive. It is the
 * warm fill on the underside of every ledge and the ground colour in every
 * glancing reflection, and without it the whole frame reads cold and floating.
 *
 * The prefilter itself is the expensive part, so it is throttled: the sky can
 * sweep a whole day and this rebakes a few times a second, which is far below
 * the rate at which the difference is visible.
 */

const COMPOSITE_VERT = /* glsl */ `
varying vec3 vDirection;
void main() {
  vDirection = normalize((modelMatrix * vec4(position, 0.0)).xyz);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const COMPOSITE_FRAG = /* glsl */ `
precision highp float;
varying vec3 vDirection;

uniform samplerCube uSky;
uniform vec3 uGroundRadiance;
uniform float uGroundBlend;

void main() {
  vec3 direction = normalize(vDirection);
  vec3 sky = textureCube(uSky, direction).rgb;
  /* Wide blend band. A hard horizon shows up as a ring in the roughest mip,
     which is exactly the mip a diffuse lookup lands in. */
  float below = smoothstep(0.02, -0.16, direction.y);
  gl_FragColor = vec4(mix(sky, uGroundRadiance, below * uGroundBlend), 1.0);
}
`;

export class EnvironmentProbe {
  /** Albedo of the ground the bounce is coloured by. Desert sand by default. */
  readonly groundAlbedo = new THREE.Color(0.31, 0.26, 0.19);
  /** 0 leaves the sky's own planetary ground in place. */
  groundBlend = 1;

  private composite: THREE.WebGLCubeRenderTarget | null = null;
  private prefiltered: THREE.WebGLRenderTarget | null = null;
  private pmrem: THREE.PMREMGenerator | null = null;
  private scene = new THREE.Scene();
  private box: THREE.Mesh;
  private material: THREE.ShaderMaterial;
  private cubeCamera: THREE.CubeCamera | null = null;
  private resolution = 0;
  private radiance = new THREE.Color();

  constructor() {
    this.material = new THREE.ShaderMaterial({
      vertexShader: COMPOSITE_VERT,
      fragmentShader: COMPOSITE_FRAG,
      uniforms: {
        uSky: { value: null },
        uGroundRadiance: { value: new THREE.Color(0, 0, 0) },
        uGroundBlend: { value: 1 },
      },
      side: THREE.BackSide,
      depthTest: false,
      depthWrite: false,
      fog: false,
    });
    this.box = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), this.material);
    this.box.frustumCulled = false;
    this.scene.add(this.box);
  }

  get texture(): THREE.Texture | null {
    return this.prefiltered?.texture ?? null;
  }

  private ensure(renderer: THREE.WebGLRenderer, resolution: number): void {
    if (this.composite && this.resolution === resolution) return;
    this.composite?.dispose();
    this.composite = new THREE.WebGLCubeRenderTarget(resolution, {
      type: THREE.HalfFloatType,
      format: THREE.RGBAFormat,
      depthBuffer: false,
      stencilBuffer: false,
      generateMipmaps: false,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
    });
    this.cubeCamera = new THREE.CubeCamera(0.1, 10, this.composite);
    this.resolution = resolution;
    this.pmrem ??= new THREE.PMREMGenerator(renderer);
  }

  /**
   * Radiance leaving a horizontal patch of ground: what the sun and the whole
   * sky dome deliver to it, times its albedo, divided by pi for a Lambertian.
   * Same units as everything else — kilonits.
   */
  private groundRadiance(
    sunColor: THREE.Color,
    sunDirection: THREE.Vector3,
    skyColor: THREE.Color,
    occlusion: number,
  ): THREE.Color {
    const direct = Math.max(sunDirection.y, 0) * (1 - THREE.MathUtils.clamp(occlusion, 0, 1));
    const invPi = 1 / Math.PI;
    return this.radiance.setRGB(
      (sunColor.r * direct + Math.PI * skyColor.r) * this.groundAlbedo.r * invPi,
      (sunColor.g * direct + Math.PI * skyColor.g) * this.groundAlbedo.g * invPi,
      (sunColor.b * direct + Math.PI * skyColor.b) * this.groundAlbedo.b * invPi,
    );
  }

  /**
   * Composites and prefilters. Returns the new probe, or null when the sky has
   * not produced a cubemap yet.
   */
  bake(
    renderer: THREE.WebGLRenderer,
    skyCube: THREE.Texture | null,
    resolution: number,
    sunColor: THREE.Color,
    sunDirection: THREE.Vector3,
    skyColor: THREE.Color,
    occlusion: number,
  ): THREE.Texture | null {
    if (!skyCube) return null;
    this.ensure(renderer, resolution);
    if (!this.composite || !this.cubeCamera || !this.pmrem) return null;

    const uniforms = this.material.uniforms;
    uniforms.uSky.value = skyCube;
    (uniforms.uGroundRadiance.value as THREE.Color).copy(
      this.groundRadiance(sunColor, sunDirection, skyColor, occlusion),
    );
    uniforms.uGroundBlend.value = this.groundBlend;

    const previousAutoClear = renderer.autoClear;
    renderer.autoClear = true;
    this.cubeCamera.update(renderer, this.scene);
    renderer.autoClear = previousAutoClear;

    this.prefiltered = this.pmrem.fromCubemap(this.composite.texture, this.prefiltered);
    return this.prefiltered.texture;
  }

  dispose(): void {
    this.composite?.dispose();
    this.prefiltered?.dispose();
    this.pmrem?.dispose();
    this.box.geometry.dispose();
    this.material.dispose();
    this.composite = null;
    this.prefiltered = null;
    this.pmrem = null;
  }
}
