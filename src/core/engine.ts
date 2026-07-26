import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

export interface QualitySettings {
  bloom: boolean;
  pixelRatioCap: number;
  shadows: boolean;
  oceanSegments: number;
  particles: boolean;
  /** Multisample count for the post-processing target. */
  msaaSamples: number;
  /** Texture resolution for the procedurally generated material maps. */
  textureSize: number;
  /** Raymarch steps through the cloud slab. The sky is the most expensive
   *  thing on screen on a weak GPU, and it degrades gracefully. */
  cloudSteps: number;
}

function detectRenderer(gl: WebGL2RenderingContext): string {
  const dbg = gl.getExtension('WEBGL_debug_renderer_info');
  return dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : String(gl.getParameter(gl.RENDERER));
}

export function pickQuality(gl: WebGL2RenderingContext): QualitySettings {
  const params = new URLSearchParams(location.search);
  const renderer = detectRenderer(gl).toLowerCase();
  const software = renderer.includes('swiftshader') || renderer.includes('llvmpipe') || renderer.includes('softwarerasterizer');
  const forced = params.get('quality');
  const low = forced === 'low' || (software && forced !== 'high');

  return {
    bloom: !low,
    pixelRatioCap: low ? 1 : 1.75,
    shadows: !low,
    oceanSegments: low ? 128 : 256,
    particles: !low,
    msaaSamples: low ? 0 : 4,
    textureSize: low ? 256 : 512,
    cloudSteps: low ? 10 : 28,
  };
}

/**
 * Final look pass: a light filmic grade, a vignette, a touch of chromatic
 * aberration at the edges and a sharpening kernel that puts back the crispness
 * multisampling takes off. Also carries the screen shake, since offsetting the
 * whole image here is cheaper and steadier than jittering the camera.
 */
function gradeShader() {
  return {
    uniforms: {
      tDiffuse: { value: null },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uShake: { value: 0 },
      uTime: { value: 0 },
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
      uniform vec2 uResolution;
      uniform float uShake;
      uniform float uTime;
      varying vec2 vUv;

      void main() {
        vec2 texel = 1.0 / uResolution;
        // Screen shake: a decaying two-axis wobble at different rates.
        vec2 uv = vUv + uShake * vec2(
          sin(uTime * 47.0) * 0.006,
          cos(uTime * 39.0) * 0.005
        );

        vec2 centred = uv - 0.5;
        float r2 = dot(centred, centred);

        // Chromatic aberration, strongest at the corners.
        float ca = 0.0016 * r2;
        vec3 col;
        col.r = texture2D(tDiffuse, uv + centred * ca).r;
        col.g = texture2D(tDiffuse, uv).g;
        col.b = texture2D(tDiffuse, uv - centred * ca).b;

        // Unsharp mask: cheap crispness after multisampling and bloom.
        vec3 blur =
          texture2D(tDiffuse, uv + vec2(texel.x, 0.0)).rgb +
          texture2D(tDiffuse, uv - vec2(texel.x, 0.0)).rgb +
          texture2D(tDiffuse, uv + vec2(0.0, texel.y)).rgb +
          texture2D(tDiffuse, uv - vec2(0.0, texel.y)).rgb;
        col += (col - blur * 0.25) * 0.22;

        // Grade: lift the shadows towards sea blue, warm the highlights, and
        // pull a little saturation into the midtones.
        float luma = dot(col, vec3(0.2126, 0.7152, 0.0722));
        col = mix(col, col * vec3(0.94, 1.0, 1.06), 0.35 * (1.0 - luma));
        col = mix(col, col * vec3(1.04, 1.0, 0.95), 0.3 * luma);
        col = mix(vec3(luma), col, 1.08);

        // Vignette.
        col *= 1.0 - r2 * 0.42;

        gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
      }
    `,
  };
}

/**
 * Renderer, camera and the fixed-timestep loop. Simulation runs at a fixed
 * 60 Hz step (so buoyancy and character control stay stable) while rendering
 * happens once per animation frame with the leftover time as an alpha.
 */
export class Engine {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly quality: QualitySettings;

  private composer: EffectComposer | null = null;
  private bloomPass: UnrealBloomPass | null = null;
  private gradePass: ShaderPass | null = null;
  private lastTime = 0;
  private accumulator = 0;
  private readonly fixedStep = 1 / 60;
  private running = false;
  private frameHandle = 0;

  /** Rolling average frame time in ms, for the debug readout. */
  frameMs = 0;
  elapsed = 0;

  onFixedUpdate: (dt: number) => void = () => {};
  onRender: (dt: number) => void = () => {};

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
      stencil: false,
    });
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    this.quality = pickQuality(gl);
    // WebGL enables dithering by default. Hardware drivers ignore it, but
    // software rasterisers honour it and lay an ordered 4x4 pattern over every
    // smooth gradient - sky, water, fog - which looks like a shader bug.
    gl.disable(gl.DITHER);

    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.94;
    this.renderer.shadowMap.enabled = this.quality.shadows;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.quality.pixelRatioCap));

    this.camera = new THREE.PerspectiveCamera(68, 1, 0.15, 12000);
    this.camera.position.set(0, 6, 14);

    if (this.quality.bloom) this.setupComposer();

    this.resize();
    window.addEventListener('resize', this.resize);
  }

  private setupComposer(): void {
    const size = this.renderer.getDrawingBufferSize(new THREE.Vector2());

    // Multisampled target: the composer bypasses the canvas' own MSAA, and
    // rigging lines and mast edges alias badly against a bright sky without it.
    const target = new THREE.WebGLRenderTarget(size.x, size.y, {
      type: THREE.HalfFloatType,
      samples: this.quality.msaaSamples,
    });
    this.composer = new EffectComposer(this.renderer, target);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    // Gentle bloom: enough to make lanterns and sun glitter glow, not a haze.
    this.bloomPass = new UnrealBloomPass(size, 0.24, 0.6, 0.92);
    this.composer.addPass(this.bloomPass);
    this.composer.addPass(new OutputPass());
    // Grade last, after tone mapping, so the vignette and lift work in display
    // space where they behave predictably.
    this.gradePass = new ShaderPass(gradeShader());
    this.composer.addPass(this.gradePass);
  }

  /** Screen shake and the underwater wobble live in the grade pass. */
  setGrade(options: { shake?: number; time?: number }): void {
    if (!this.gradePass) return;
    const uniforms = this.gradePass.uniforms;
    if (options.shake !== undefined) uniforms.uShake.value = options.shake;
    if (options.time !== undefined) uniforms.uTime.value = options.time;
  }

  setBloomStrength(strength: number): void {
    if (this.bloomPass) this.bloomPass.strength = strength;
  }

  private resize = (): void => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.composer?.setSize(w, h);
    if (this.gradePass) this.gradePass.uniforms.uResolution.value.set(w, h);
  };

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.loop();
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.frameHandle);
  }

  private loop = (): void => {
    if (!this.running) return;
    this.frameHandle = requestAnimationFrame(this.loop);

    const now = performance.now();
    const raw = (now - this.lastTime) / 1000;
    this.lastTime = now;
    // Clamp so an alt-tab or a slow first frame cannot fling the ship into orbit.
    const dt = Math.min(raw, 0.1);
    this.elapsed += dt;
    this.frameMs += (raw * 1000 - this.frameMs) * 0.1;

    this.accumulator += dt;
    let steps = 0;
    while (this.accumulator >= this.fixedStep && steps < 4) {
      this.onFixedUpdate(this.fixedStep);
      this.accumulator -= this.fixedStep;
      steps++;
    }
    if (steps === 4) this.accumulator = 0;

    this.onRender(dt);
    this.render();
  };

  /** Renders one frame immediately - used by the loop and by headless tests. */
  render(): void {
    if (this.composer) this.composer.render();
    else this.renderer.render(this.scene, this.camera);
  }
}
