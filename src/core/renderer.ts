/**
 * Renderer + post-processing stack.
 *
 * Two scenes are composited every frame:
 *   1. the *sky* scene — starfield and planet, drawn with a camera that shares
 *      the main camera's orientation but only a thousandth of its translation,
 *      so celestial bodies stay effectively at infinity while still parallaxing;
 *   2. the *stage* scene — ships, interiors, characters, effects.
 *
 * Keeping them apart lets each use a depth range suited to its own scale, which
 * removes the z-fighting a single 0.1→200 000 frustum would otherwise cause.
 *
 * Post chain: bloom (thresholded so only energy sources glow) → ACES filmic
 * tone map + sRGB → vignette, grain and a gentle depth cue.
 */

import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import type { QualitySettings } from './quality';
import { BLOOM_THRESHOLD } from '../assets/materials';

/** Parallax factor applied to the sky camera's position. */
const SKY_PARALLAX = 0.00035;

const FinishShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uTime: { value: 0 },
    uGrain: { value: 0.035 },
    uVignette: { value: 0.92 },
    uFade: { value: 0 },
    uFadeColor: { value: new THREE.Color(0, 0, 0) },
    uAberration: { value: 0.0012 },
    uResolution: { value: new THREE.Vector2(1, 1) },
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
    uniform float uTime;
    uniform float uGrain;
    uniform float uVignette;
    uniform float uFade;
    uniform vec3  uFadeColor;
    uniform float uAberration;
    uniform vec2  uResolution;
    varying vec2 vUv;

    float hash(vec2 p) {
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }

    void main() {
      vec2 uv = vUv;
      vec2 fromCentre = uv - 0.5;
      float r2 = dot(fromCentre, fromCentre);

      // Lateral chromatic separation, strongest at the frame edge.
      vec2 off = fromCentre * uAberration * (0.35 + r2 * 3.0);
      vec3 col;
      col.r = texture2D(tDiffuse, uv + off).r;
      col.g = texture2D(tDiffuse, uv).g;
      col.b = texture2D(tDiffuse, uv - off).b;

      // Vignette: gentle, never crushing the corners to black.
      float vig = smoothstep(0.98, 0.18, r2 * uVignette * 2.0);
      col *= mix(0.72, 1.0, vig);

      // Animated film grain, slightly stronger in the shadows.
      if (uGrain > 0.0001) {
        float g = hash(uv * uResolution + fract(uTime) * 431.7) - 0.5;
        float luma = dot(col, vec3(0.299, 0.587, 0.114));
        col += g * uGrain * mix(1.6, 0.45, smoothstep(0.0, 0.6, luma));
      }

      col = mix(col, uFadeColor, clamp(uFade, 0.0, 1.0));
      gl_FragColor = vec4(col, 1.0);
    }
  `,
};

export interface RendererOptions {
  canvas: HTMLCanvasElement;
  quality: QualitySettings;
}

export class Stage {
  readonly renderer: THREE.WebGLRenderer;
  /** Ships, interiors, characters, effects. */
  readonly scene = new THREE.Scene();
  /** Starfield and planet, drawn behind everything at effective infinity. */
  readonly sky = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly skyCamera: THREE.PerspectiveCamera;

  private composer!: EffectComposer;
  private skyPass!: RenderPass;
  private stagePass!: RenderPass;
  private bloomPass!: UnrealBloomPass;
  private finishPass!: ShaderPass;
  private outputPass!: OutputPass;

  private quality: QualitySettings;
  private width = 1;
  private height = 1;
  private dpr = 1;
  private disposed = false;

  /** Screen fade, driven by the timeline for chapter transitions. */
  fade = 0;
  readonly fadeColor = new THREE.Color(0, 0, 0);

  constructor(o: RendererOptions) {
    this.quality = o.quality;
    this.renderer = new THREE.WebGLRenderer({
      canvas: o.canvas,
      antialias: o.quality.antialias,
      powerPreference: 'high-performance',
      stencil: false,
      alpha: false,
      preserveDrawingBuffer: true, // lets the QA harness read pixels back
    });
    this.renderer.setClearColor(0x000000, 1);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = o.quality.shadows;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.autoClear = false;
    this.renderer.info.autoReset = false;

    this.camera = new THREE.PerspectiveCamera(38, 1, 0.2, 40000);
    this.camera.name = 'MainCamera';
    this.skyCamera = new THREE.PerspectiveCamera(38, 1, 1, 60000);
    this.skyCamera.name = 'SkyCamera';

    this.scene.name = 'Stage';
    this.sky.name = 'Sky';

    this.buildComposer();
  }

  private buildComposer(): void {
    const size = new THREE.Vector2();
    this.renderer.getDrawingBufferSize(size);
    const target = new THREE.WebGLRenderTarget(Math.max(1, size.x), Math.max(1, size.y), {
      type: THREE.HalfFloatType,
      colorSpace: THREE.LinearSRGBColorSpace,
      samples: this.quality.antialias ? 4 : 0,
      depthBuffer: true,
    });

    this.composer = new EffectComposer(this.renderer, target);
    this.composer.renderToScreen = true;

    this.skyPass = new RenderPass(this.sky, this.skyCamera);
    this.skyPass.clear = true;
    this.composer.addPass(this.skyPass);

    this.stagePass = new RenderPass(this.scene, this.camera);
    this.stagePass.clear = false;
    this.stagePass.clearDepth = true;
    this.composer.addPass(this.stagePass);

    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(Math.max(1, size.x), Math.max(1, size.y)),
      this.quality.bloomStrength,
      0.42,
      BLOOM_THRESHOLD,
    );
    this.bloomPass.enabled = this.quality.bloom;
    this.composer.addPass(this.bloomPass);

    this.outputPass = new OutputPass();
    this.composer.addPass(this.outputPass);

    this.finishPass = new ShaderPass(FinishShader);
    this.finishPass.uniforms.uGrain.value = this.quality.grain ? 0.035 : 0;
    this.composer.addPass(this.finishPass);
  }

  setQuality(q: QualitySettings): void {
    this.quality = q;
    this.renderer.shadowMap.enabled = q.shadows;
    this.renderer.shadowMap.needsUpdate = true;
    this.bloomPass.enabled = q.bloom;
    this.bloomPass.strength = q.bloomStrength;
    this.finishPass.uniforms.uGrain.value = q.grain ? 0.035 : 0;
    this.resize(this.width, this.height, true);
  }

  setGrain(on: boolean): void {
    this.finishPass.uniforms.uGrain.value = on && this.quality.grain ? 0.035 : 0;
    this.finishPass.uniforms.uVignette.value = on ? 0.92 : 0.25;
  }

  resize(width: number, height: number, force = false): void {
    const dpr = Math.min(window.devicePixelRatio || 1, this.quality.pixelRatio);
    if (!force && width === this.width && height === this.height && dpr === this.dpr) return;
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    this.dpr = dpr;

    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(this.width, this.height, false);
    this.composer.setPixelRatio(dpr);
    this.composer.setSize(this.width, this.height);

    const aspect = this.width / this.height;
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
    this.skyCamera.aspect = aspect;
    this.skyCamera.updateProjectionMatrix();

    this.finishPass.uniforms.uResolution.value.set(this.width * dpr, this.height * dpr);
    this.bloomPass.resolution.set(this.width * dpr, this.height * dpr);
  }

  /** Camera near/far are shot-dependent; interiors need a much tighter range. */
  setClipRange(near: number, far: number): void {
    if (this.camera.near === near && this.camera.far === far) return;
    this.camera.near = near;
    this.camera.far = far;
    this.camera.updateProjectionMatrix();
  }

  setFov(fov: number): void {
    if (Math.abs(this.camera.fov - fov) < 1e-4) return;
    this.camera.fov = fov;
    this.camera.updateProjectionMatrix();
  }

  /** True while the sky scene should be drawn (skipped for interior shots). */
  skyVisible = true;

  render(elapsed: number): void {
    if (this.disposed) return;

    this.skyCamera.quaternion.copy(this.camera.quaternion);
    this.skyCamera.position.copy(this.camera.position).multiplyScalar(SKY_PARALLAX);
    this.skyCamera.fov = this.camera.fov;
    this.skyCamera.updateProjectionMatrix();
    this.skyCamera.updateMatrixWorld();

    this.skyPass.enabled = this.skyVisible;
    // With the sky suppressed we still need a clear, so the stage pass takes over.
    this.stagePass.clear = !this.skyVisible;

    this.finishPass.uniforms.uTime.value = elapsed;
    this.finishPass.uniforms.uFade.value = this.fade;
    (this.finishPass.uniforms.uFadeColor.value as THREE.Color).copy(this.fadeColor);

    this.renderer.info.reset();
    this.composer.render();
  }

  get drawCalls(): number {
    return this.renderer.info.render.calls;
  }
  get triangles(): number {
    return this.renderer.info.render.triangles;
  }
  get textureCount(): number {
    return this.renderer.info.memory.textures;
  }
  get pixelRatio(): number {
    return this.dpr;
  }

  dispose(): void {
    this.disposed = true;
    this.composer.dispose();
    this.renderer.dispose();
  }
}
