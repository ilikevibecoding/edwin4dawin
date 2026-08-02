import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { QUALITY_PRESETS, type QualityLevel, type QualitySettings } from './Quality';

/**
 * Final grade: vignette, filmic grain, a whisper of chromatic aberration at the
 * edges, and a global fade used for chapter transitions and the opening
 * darkness. Deliberately restrained - nothing here is allowed to crush blacks.
 */
const GradeShader: THREE.ShaderMaterialParameters & { uniforms: Record<string, THREE.IUniform> } = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uVignette: { value: 0.9 },
    uGrain: { value: 0.05 },
    uFade: { value: 0 },
    uFadeColor: { value: new THREE.Color(0, 0, 0) },
    uAberration: { value: 0.0016 },
    uLift: { value: 0.012 },
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
    uniform float uVignette;
    uniform float uGrain;
    uniform float uFade;
    uniform vec3  uFadeColor;
    uniform float uAberration;
    uniform float uLift;
    uniform vec2  uResolution;
    varying vec2 vUv;

    // Two-axis hash; a single sin() aliases into a visible weave at 1080p.
    float hash(vec2 p) {
      vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
      p3 += dot(p3, p3.yzx + 33.33);
      return fract((p3.x + p3.y) * p3.z);
    }

    void main() {
      vec2 uv = vUv;
      vec2 centred = uv - 0.5;
      float r2 = dot(centred, centred);

      // Lens dispersion grows toward the corners only.
      float disp = uAberration * r2 * 4.0;
      vec3 color;
      color.r = texture2D(tDiffuse, uv + centred * disp).r;
      color.g = texture2D(tDiffuse, uv).g;
      color.b = texture2D(tDiffuse, uv - centred * disp).b;

      // Vignette, kept gentle so interiors stay readable.
      float vig = smoothstep(0.95, 0.25, r2 * uVignette * 2.0);
      color *= mix(0.72, 1.0, vig);

      // Film grain, luminance weighted so highlights stay clean.
      float lum = dot(color, vec3(0.299, 0.587, 0.114));
      float g = hash(uv * uResolution + fract(uTime) * 517.0) - 0.5;
      color += g * uGrain * (0.35 + 0.65 * (1.0 - lum));

      // Never let the picture reach absolute black.
      color = max(color, vec3(uLift * (0.35 + 0.65 * vig)));

      color = mix(color, uFadeColor, clamp(uFade, 0.0, 1.0));
      gl_FragColor = vec4(color, 1.0);
    }
  `,
};

export interface RendererStats {
  fps: number;
  frameMs: number;
  drawCalls: number;
  triangles: number;
  programs: number;
  pixelRatio: number;
}

export class RenderSystem {
  readonly renderer: THREE.WebGLRenderer;
  readonly composer: EffectComposer;
  readonly canvas: HTMLCanvasElement;

  private renderPass: RenderPass;
  private bloomPass: UnrealBloomPass;
  private gradePass: ShaderPass;
  private outputPass: OutputPass;
  private settings: QualitySettings;
  private frameTimes: number[] = [];
  private lastStats: RendererStats = {
    fps: 0, frameMs: 0, drawCalls: 0, triangles: 0, programs: 0, pixelRatio: 1,
  };

  /** True while postprocessing is bypassed (used by the low-power path). */
  private usePost = true;

  constructor(canvas: HTMLCanvasElement, scene: THREE.Scene, camera: THREE.Camera, level: QualityLevel) {
    this.canvas = canvas;
    this.settings = QUALITY_PRESETS[level];

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: this.settings.antialias,
      powerPreference: 'high-performance',
      stencil: false,
      alpha: false,
      failIfMajorPerformanceCaveat: false,
    });
    this.renderer.setClearColor(0x000000, 1);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = this.settings.shadows;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.info.autoReset = false;

    this.composer = new EffectComposer(this.renderer);
    this.renderPass = new RenderPass(scene, camera);
    this.composer.addPass(this.renderPass);

    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(1, 1),
      this.settings.bloomStrength,
      0.45, // radius
      0.92, // threshold - only genuinely bright emissives bloom
    );
    this.composer.addPass(this.bloomPass);

    this.outputPass = new OutputPass();
    this.composer.addPass(this.outputPass);

    this.gradePass = new ShaderPass(GradeShader);
    this.gradePass.renderToScreen = true;
    this.composer.addPass(this.gradePass);

    this.applySettings(this.settings);
    this.resize();
  }

  get grade(): Record<string, THREE.IUniform> {
    return this.gradePass.uniforms as Record<string, THREE.IUniform>;
  }

  setCamera(camera: THREE.Camera): void {
    this.renderPass.camera = camera;
  }

  setScene(scene: THREE.Scene): void {
    this.renderPass.scene = scene;
  }

  applyQuality(level: QualityLevel): void {
    this.applySettings(QUALITY_PRESETS[level]);
    this.resize();
  }

  private applySettings(settings: QualitySettings): void {
    this.settings = settings;
    this.renderer.shadowMap.enabled = settings.shadows;
    this.bloomPass.enabled = settings.bloom;
    this.bloomPass.strength = settings.bloomStrength;
    this.grade.uGrain.value = settings.grain ? 0.05 : 0.0;
    this.grade.uAberration.value = settings.level === 'low' ? 0 : 0.0016;
    this.usePost = true;
  }

  get quality(): QualitySettings {
    return this.settings;
  }

  resize(): void {
    const parent = this.canvas.parentElement;
    const width = Math.max(320, parent?.clientWidth ?? window.innerWidth);
    const height = Math.max(240, parent?.clientHeight ?? window.innerHeight);
    const ratio = Math.min(window.devicePixelRatio || 1, this.settings.maxPixelRatio);

    this.renderer.setPixelRatio(ratio);
    this.renderer.setSize(width, height, false);
    this.composer.setPixelRatio(ratio);
    this.composer.setSize(width, height);
    this.bloomPass.setSize(width * ratio, height * ratio);
    this.grade.uResolution.value.set(width * ratio, height * ratio);
    this.lastStats.pixelRatio = ratio;
  }

  get size(): { width: number; height: number } {
    const v = new THREE.Vector2();
    this.renderer.getSize(v);
    return { width: v.x, height: v.y };
  }

  render(elapsed: number, frameMs: number): void {
    this.grade.uTime.value = elapsed;
    this.renderer.info.reset();
    if (this.usePost) this.composer.render();
    else this.renderer.render(this.renderPass.scene, this.renderPass.camera);

    this.frameTimes.push(frameMs);
    if (this.frameTimes.length > 45) this.frameTimes.shift();
    const avg = this.frameTimes.reduce((a, b) => a + b, 0) / Math.max(1, this.frameTimes.length);
    this.lastStats.frameMs = avg;
    this.lastStats.fps = avg > 0 ? 1000 / avg : 0;
    this.lastStats.drawCalls = this.renderer.info.render.calls;
    this.lastStats.triangles = this.renderer.info.render.triangles;
    this.lastStats.programs = this.renderer.info.programs?.length ?? 0;
  }

  get stats(): RendererStats {
    return this.lastStats;
  }

  /** Screen fade used for chapter transitions and the opening darkness. */
  setFade(amount: number, color: THREE.ColorRepresentation = 0x000000): void {
    this.grade.uFade.value = amount;
    (this.grade.uFadeColor.value as THREE.Color).set(color);
  }

  dispose(): void {
    this.composer.dispose();
    this.bloomPass.dispose();
    this.renderer.dispose();
  }
}
