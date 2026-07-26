/**
 * Rendering pipeline. Owner: Opus 1 (integration) with the look owned by Fable 1.
 *
 * One WebGL2 canvas, ACES filmic tonemapping, and a restrained post chain: bloom kept low
 * enough that it never turns the snow into a white sheet, a gentle vignette, and a colour grade
 * that cools the shadows and warms the highlights. Motion blur is deliberately absent.
 */
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';
import type { QualityProfile } from '../core/Types';
import { ATMOSPHERE } from '../art/Palette';

/** Colour grade + vignette + film grain, applied after bloom. */
const GradeShader = {
  name: 'NorthstarGrade',
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uVignette: { value: 0.32 },
    uGrain: { value: 0.022 },
    uTime: { value: 0 },
    uLift: { value: new THREE.Vector3(0.012, 0.018, 0.030) },
    uGain: { value: new THREE.Vector3(1.015, 1.0, 0.975) },
    uSaturation: { value: 1.06 },
    uContrast: { value: 1.045 },
    uFlash: { value: 0 },
    uDamage: { value: 0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uVignette;
    uniform float uGrain;
    uniform float uTime;
    uniform vec3 uLift;
    uniform vec3 uGain;
    uniform float uSaturation;
    uniform float uContrast;
    uniform float uFlash;
    uniform float uDamage;
    varying vec2 vUv;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }

    void main() {
      vec4 texel = texture2D(tDiffuse, vUv);
      vec3 c = texel.rgb;

      // lift / gain grade: cool the shadows, keep the highlights neutral-warm
      c = c * uGain + uLift * (1.0 - c);

      // contrast about mid grey
      c = (c - 0.5) * uContrast + 0.5;

      // saturation
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c = mix(vec3(l), c, uSaturation);

      // vignette - restrained, never crushes the corners to black
      vec2 d = vUv - 0.5;
      float v = 1.0 - uVignette * dot(d, d) * 2.2;
      c *= clamp(v, 0.55, 1.0);

      // damage tint from the edges inward
      if (uDamage > 0.001) {
        float edge = smoothstep(0.18, 0.52, length(d));
        c = mix(c, vec3(0.42, 0.03, 0.04), edge * uDamage * 0.75);
      }

      // flash device whiteout
      c = mix(c, vec3(1.0), clamp(uFlash, 0.0, 1.0));

      // fine grain keeps flat walls from banding
      float g = hash(vUv * vec2(1920.0, 1080.0) + uTime) - 0.5;
      c += g * uGrain;

      gl_FragColor = vec4(clamp(c, 0.0, 1.0), texel.a);
    }
  `,
};

export class GameRenderer {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  /** Separate scene rendered on top for the first-person view model, so it never clips walls. */
  readonly viewScene = new THREE.Scene();
  readonly viewCamera: THREE.PerspectiveCamera;

  private composer: EffectComposer | null = null;
  private bloomPass: UnrealBloomPass | null = null;
  private gradePass: ShaderPass | null = null;
  private fxaaPass: ShaderPass | null = null;
  private smaaPass: SMAAPass | null = null;
  private renderPass: RenderPass | null = null;
  private profile: QualityProfile;
  private resolutionScale = 1;
  private width = 1;
  private height = 1;
  private usePost = true;

  /**
   * `preserveDrawingBuffer` is enabled in automation. Without a continuous rAF loop the
   * compositor can consume and discard the back buffer between calls, and a screenshot then
   * captures a cleared canvas — which looks exactly like a rendering bug and is not one.
   */
  constructor(canvas: HTMLCanvasElement, profile: QualityProfile, preserveBuffer = false) {
    this.profile = profile;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      powerPreference: 'high-performance',
      stencil: false,
      alpha: false,
      preserveDrawingBuffer: preserveBuffer,
    });
    this.renderer.setPixelRatio(1);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.02;
    this.renderer.shadowMap.enabled = profile.shadowsEnabled;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.autoClear = false;
    this.renderer.info.autoReset = false;

    this.scene.background = new THREE.Color(ATMOSPHERE.fogColor);
    this.scene.fog = new THREE.Fog(ATMOSPHERE.fogColor, ATMOSPHERE.fogNear, ATMOSPHERE.fogFar);

    this.camera = new THREE.PerspectiveCamera(90, 16 / 9, 0.04, 400);
    this.camera.rotation.order = 'YXZ';
    this.viewCamera = new THREE.PerspectiveCamera(62, 16 / 9, 0.005, 6);
    this.viewCamera.rotation.order = 'YXZ';

    this.buildComposer();
  }

  private buildComposer(): void {
    if (this.composer) {
      this.composer.dispose();
      this.composer = null;
    }
    this.usePost = this.profile.bloomEnabled || this.profile.antialias !== 'none';
    if (!this.usePost) {
      this.gradePass = null;
      return;
    }
    const target = new THREE.WebGLRenderTarget(
      Math.max(2, this.width),
      Math.max(2, this.height),
      {
        type: THREE.HalfFloatType,
        colorSpace: THREE.LinearSRGBColorSpace,
        samples: 0,
      },
    );
    const composer = new EffectComposer(this.renderer, target);
    composer.setPixelRatio(1);
    this.renderPass = new RenderPass(this.scene, this.camera);
    composer.addPass(this.renderPass);

    if (this.profile.bloomEnabled) {
      this.bloomPass = new UnrealBloomPass(
        new THREE.Vector2(this.width, this.height),
        0.28, // strength - deliberately low
        0.62, // radius
        0.86, // threshold - only genuinely bright sources bloom
      );
      composer.addPass(this.bloomPass);
    } else {
      this.bloomPass = null;
    }

    this.gradePass = new ShaderPass(GradeShader);
    composer.addPass(this.gradePass);

    if (this.profile.antialias === 'smaa') {
      this.smaaPass = new SMAAPass();
      composer.addPass(this.smaaPass);
      this.fxaaPass = null;
    } else if (this.profile.antialias === 'fxaa') {
      this.fxaaPass = new ShaderPass(FXAAShader);
      composer.addPass(this.fxaaPass);
      this.smaaPass = null;
    } else {
      this.fxaaPass = null;
      this.smaaPass = null;
    }

    composer.addPass(new OutputPass());
    this.composer = composer;
  }

  setProfile(profile: QualityProfile): void {
    this.profile = profile;
    this.renderer.shadowMap.enabled = profile.shadowsEnabled;
    this.renderer.shadowMap.needsUpdate = true;
    this.buildComposer();
    this.resize(this.width, this.height, this.resolutionScale);
  }

  setResolutionScale(scale: number): void {
    this.resolutionScale = Math.max(0.4, Math.min(1, scale));
    this.resize(this.width, this.height, this.resolutionScale);
  }

  setFov(fovDeg: number): void {
    this.camera.fov = fovDeg;
    this.camera.updateProjectionMatrix();
    // The view model keeps a tighter FOV so weapons never distort at wide settings.
    this.viewCamera.fov = Math.min(75, 42 + fovDeg * 0.24);
    this.viewCamera.updateProjectionMatrix();
  }

  resize(cssWidth: number, cssHeight: number, scale = this.resolutionScale): void {
    this.width = Math.max(2, Math.floor(cssWidth));
    this.height = Math.max(2, Math.floor(cssHeight));
    this.resolutionScale = scale;
    const rw = Math.max(2, Math.floor(this.width * scale));
    const rh = Math.max(2, Math.floor(this.height * scale));
    this.renderer.setSize(rw, rh, false);
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    const aspect = rw / rh;
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
    this.viewCamera.aspect = aspect;
    this.viewCamera.updateProjectionMatrix();
    if (this.composer) {
      this.composer.setSize(rw, rh);
      if (this.bloomPass) this.bloomPass.resolution.set(rw, rh);
      if (this.fxaaPass) {
        (this.fxaaPass.material.uniforms.resolution.value as THREE.Vector2).set(1 / rw, 1 / rh);
      }
    }
  }

  get renderWidth(): number {
    return Math.max(2, Math.floor(this.width * this.resolutionScale));
  }

  get renderHeight(): number {
    return Math.max(2, Math.floor(this.height * this.resolutionScale));
  }

  setGrade(opts: { flash?: number; damage?: number; vignette?: number; time?: number }): void {
    if (!this.gradePass) return;
    const u = this.gradePass.material.uniforms;
    if (opts.flash !== undefined) u.uFlash.value = opts.flash;
    if (opts.damage !== undefined) u.uDamage.value = opts.damage;
    if (opts.vignette !== undefined) u.uVignette.value = opts.vignette;
    if (opts.time !== undefined) u.uTime.value = opts.time;
  }

  render(): void {
    this.renderer.info.reset();
    this.renderer.clear(true, true, true);
    if (this.composer) {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
    // View model drawn last with a cleared depth buffer.
    this.renderer.clearDepth();
    this.renderer.render(this.viewScene, this.viewCamera);
  }

  get drawCalls(): number {
    return this.renderer.info.render.calls;
  }

  get triangles(): number {
    return this.renderer.info.render.triangles;
  }

  dispose(): void {
    this.composer?.dispose();
    this.renderer.dispose();
  }
}
