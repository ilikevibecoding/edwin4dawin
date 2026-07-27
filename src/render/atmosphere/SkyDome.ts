import * as THREE from 'three';
import { Layers } from '../../core/GameContext';
import {
  NIGHT_CUBE_FRAG,
  SKY_DOME_FRAG,
  SKY_DOME_VERT,
  SKY_ENV_FRAG,
} from '../../shaders/sky/sky.glsl';
import { QuadPass } from './QuadPass';
import { INCLUDE, skyFrag, type Uniforms } from './SkyUniforms';

/** Per-face basis: forward, d/du and d/dv, matching the GL cube map convention. */
const FACES: ReadonlyArray<readonly [THREE.Vector3, THREE.Vector3, THREE.Vector3]> = [
  [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, -1, 0)],
  [new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, -1, 0)],
  [new THREE.Vector3(0, 1, 0), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 1)],
  [new THREE.Vector3(0, -1, 0), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, -1)],
  [new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, -1, 0)],
  [new THREE.Vector3(0, 0, -1), new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, -1, 0)],
];

function cubeTarget(res: number): THREE.WebGLCubeRenderTarget {
  return new THREE.WebGLCubeRenderTarget(res, {
    type: THREE.HalfFloatType,
    format: THREE.RGBAFormat,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    depthBuffer: false,
    stencilBuffer: false,
    generateMipmaps: false,
  });
}

/**
 * The screen sky and the environment probe.
 *
 * The dome is a camera-centred sphere whose vertex shader pins depth to the far
 * plane, so it depth-tests correctly behind all geometry without writing depth
 * and without caring where it lands in the render queue. `allowOverride = false`
 * keeps a depth or velocity prepass from substituting its own material, which
 * would otherwise punch a hole in the depth buffer.
 */
export class SkyDome {
  readonly mesh: THREE.Mesh;
  readonly material: THREE.ShaderMaterial;

  private envPass: QuadPass;
  private nightPass: QuadPass;
  private env: THREE.WebGLCubeRenderTarget | null = null;
  private nightCube: THREE.WebGLCubeRenderTarget | null = null;
  private faceCursor = 0;
  private envRes = 0;

  constructor(private uniforms: Uniforms) {
    this.material = new THREE.ShaderMaterial({
      vertexShader: SKY_DOME_VERT,
      fragmentShader: skyFrag(
        INCLUDE.noise,
        INCLUDE.atmosphere,
        INCLUDE.night,
        INCLUDE.skyEval,
        SKY_DOME_FRAG,
      ),
      uniforms,
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: true,
      fog: false,
    });
    this.material.allowOverride = false;

    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), this.material);
    this.mesh.name = 'SkyDome';
    this.mesh.frustumCulled = false;
    this.mesh.castShadow = false;
    this.mesh.receiveShadow = false;
    /* Drawn last among the opaques so early-z rejects every pixel the world
       already covered, and excluded from shadow and reflection passes. */
    this.mesh.renderOrder = 1000;
    this.mesh.layers.enable(Layers.NO_SSR);
    this.mesh.layers.enable(Layers.NO_SHADOW);

    /* A geometry prepass substitutes its own material for everything it draws,
       and this one opts out so it cannot be given a depth-writing material and
       punch a wall into the depth buffer at the dome's radius. The cost is that
       the dome is still submitted to those passes, so it detects them — an
       override material, or a multi-attachment target — and discards.
       `onBeforeRender` runs before the uniform upload, which makes this safe. */
    this.mesh.onBeforeRender = (renderer, scene) => {
      const target = renderer.getRenderTarget();
      const foreign = scene.overrideMaterial !== null || (target?.textures.length ?? 1) > 1;
      uniforms.uSkyPrepass.value = foreign ? 1 : 0;
    };

    this.envPass = new QuadPass(
      skyFrag(
        INCLUDE.noise,
        INCLUDE.atmosphere,
        INCLUDE.night,
        INCLUDE.skyEval,
        INCLUDE.clouds,
        SKY_ENV_FRAG,
      ),
      uniforms,
    );
    this.nightPass = new QuadPass(
      skyFrag(INCLUDE.noise, INCLUDE.atmosphere, INCLUDE.night, NIGHT_CUBE_FRAG),
      uniforms,
    );
  }

  /** Keeps the dome centred on the camera and comfortably inside the far plane. */
  follow(camera: THREE.PerspectiveCamera): void {
    this.mesh.position.copy(camera.position);
    this.mesh.scale.setScalar(Math.max(50, camera.far * 0.35));
  }

  get environmentTexture(): THREE.Texture | null {
    return this.env?.texture ?? null;
  }

  /* ------------------------------ probe -------------------------------- */

  ensureEnv(res: number): THREE.Texture | null {
    if (this.env && this.envRes === res) return this.env.texture;
    this.env?.dispose();
    this.env = cubeTarget(res);
    this.envRes = res;
    this.faceCursor = 0;
    return this.env.texture;
  }

  private setFace(face: number): void {
    const [f, r, u] = FACES[face];
    (this.uniforms.uFaceForward.value as THREE.Vector3).copy(f);
    (this.uniforms.uFaceRight.value as THREE.Vector3).copy(r);
    (this.uniforms.uFaceUp.value as THREE.Vector3).copy(u);
  }

  /** Renders every face now. Used on the first bake and on a resolution change. */
  renderAllFaces(renderer: THREE.WebGLRenderer, cloudSteps: number): void {
    if (!this.env) return;
    const prevPixel = this.uniforms.uPixelAngle.value as number;
    this.uniforms.uPixelAngle.value = Math.PI / 2 / this.envRes;
    this.uniforms.uEnvCloudSteps.value = cloudSteps;
    for (let i = 0; i < 6; i++) {
      this.setFace(i);
      this.envPass.render(renderer, this.env, i);
    }
    this.uniforms.uPixelAngle.value = prevPixel;
    this.faceCursor = 0;
  }

  /**
   * Renders a single face. Spreading the probe across six frames keeps the cost
   * off any one frame while holding the lag under two frames of visible change
   * during a time-of-day sweep. Returns true when a full cycle just completed.
   */
  renderNextFace(renderer: THREE.WebGLRenderer, cloudSteps: number): boolean {
    if (!this.env) return false;
    const prevPixel = this.uniforms.uPixelAngle.value as number;
    this.uniforms.uPixelAngle.value = Math.PI / 2 / this.envRes;
    this.uniforms.uEnvCloudSteps.value = cloudSteps;
    this.setFace(this.faceCursor);
    this.envPass.render(renderer, this.env, this.faceCursor);
    this.uniforms.uPixelAngle.value = prevPixel;
    this.faceCursor++;
    if (this.faceCursor >= 6) {
      this.faceCursor = 0;
      return true;
    }
    return false;
  }

  /* --------------------------- night cubemap --------------------------- */

  /**
   * The Milky Way is diffuse and fixed in celestial coordinates, so it is baked
   * once into a small cubemap instead of costing four octaves of fBm per pixel
   * per frame. Stars stay procedural: they have to be sub-pixel sharp.
   */
  bakeNightCube(renderer: THREE.WebGLRenderer, res: number): void {
    this.nightCube?.dispose();
    this.nightCube = cubeTarget(res);
    for (let i = 0; i < 6; i++) {
      this.setFace(i);
      this.nightPass.render(renderer, this.nightCube, i);
    }
    this.uniforms.uNightCube.value = this.nightCube.texture;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
    this.envPass.dispose();
    this.nightPass.dispose();
    this.env?.dispose();
    this.nightCube?.dispose();
  }
}
