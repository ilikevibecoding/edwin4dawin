import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { Pass, FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js';

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

const FULLSCREEN_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/**
 * Bloom: a soft-knee bright pass, a separable blur at half resolution, and an
 * additive composite.
 *
 * This replaces three's UnrealBloomPass, which does not survive contact with
 * the multisampled half-float target this composer renders into. Reading that
 * target before it has resolved returned colour that bore no relation to the
 * frame, and the symptom was spectacular: red ghost suns sitting on the sea
 * wherever a sparkle crossed the threshold, plus a pink haze over everything.
 * Doing it by hand is also several times cheaper, which matters because the
 * whole frame budget goes on the sky and the water.
 */
class BloomPass extends Pass {
  strength: number;

  private targetA: THREE.WebGLRenderTarget;
  private targetB: THREE.WebGLRenderTarget;
  readonly bright: THREE.ShaderMaterial;
  private blur: THREE.ShaderMaterial;
  private composite: THREE.ShaderMaterial;
  private quad = new FullScreenQuad();

  constructor(width: number, height: number, strength: number, threshold: number, knee: number) {
    super();
    this.strength = strength;
    this.needsSwap = true;

    const options = { type: THREE.HalfFloatType, depthBuffer: false, stencilBuffer: false };
    this.targetA = new THREE.WebGLRenderTarget(Math.max(1, width >> 1), Math.max(1, height >> 1), options);
    this.targetB = new THREE.WebGLRenderTarget(Math.max(1, width >> 1), Math.max(1, height >> 1), options);

    this.bright = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        uThreshold: { value: threshold },
        uKnee: { value: knee },
      },
      vertexShader: FULLSCREEN_VERT,
      fragmentShader: /* glsl */ `
        uniform sampler2D tDiffuse;
        uniform float uThreshold;
        uniform float uKnee;
        varying vec2 vUv;
        void main() {
          vec3 c = texture2D(tDiffuse, vUv).rgb;
          // Keyed off the brightest channel rather than luminance, so a
          // saturated lantern flame blooms as readily as a white cloud top.
          float level = max(max(c.r, c.g), c.b);
          // Squared soft knee: highlights fade in instead of switching on, which
          // is what stops a moving sparkle from flickering as it crosses.
          float w = clamp((level - uThreshold) / max(uKnee, 0.0001), 0.0, 1.0);
          gl_FragColor = vec4(c * w * w, 1.0);
        }
      `,
    });

    this.blur = new THREE.ShaderMaterial({
      uniforms: { tDiffuse: { value: null }, uStep: { value: new THREE.Vector2() } },
      vertexShader: FULLSCREEN_VERT,
      fragmentShader: /* glsl */ `
        uniform sampler2D tDiffuse;
        uniform vec2 uStep;
        varying vec2 vUv;
        void main() {
          // Nine-tap Gaussian. Deliberately tight: a wide radius turns the warm
          // cast of the sun's glitter path into a haze over the whole sky.
          vec3 c = texture2D(tDiffuse, vUv).rgb * 0.227027;
          c += (texture2D(tDiffuse, vUv + uStep).rgb + texture2D(tDiffuse, vUv - uStep).rgb) * 0.194595;
          c += (texture2D(tDiffuse, vUv + uStep * 2.0).rgb + texture2D(tDiffuse, vUv - uStep * 2.0).rgb) * 0.121622;
          c += (texture2D(tDiffuse, vUv + uStep * 3.0).rgb + texture2D(tDiffuse, vUv - uStep * 3.0).rgb) * 0.054054;
          c += (texture2D(tDiffuse, vUv + uStep * 4.0).rgb + texture2D(tDiffuse, vUv - uStep * 4.0).rgb) * 0.016216;
          gl_FragColor = vec4(c, 1.0);
        }
      `,
    });

    this.composite = new THREE.ShaderMaterial({
      uniforms: { tDiffuse: { value: null }, tBloom: { value: null }, uStrength: { value: strength } },
      vertexShader: FULLSCREEN_VERT,
      fragmentShader: /* glsl */ `
        uniform sampler2D tDiffuse;
        uniform sampler2D tBloom;
        uniform float uStrength;
        varying vec2 vUv;
        void main() {
          vec3 base = texture2D(tDiffuse, vUv).rgb;
          gl_FragColor = vec4(base + texture2D(tBloom, vUv).rgb * uStrength, 1.0);
        }
      `,
    });
  }

  override setSize(width: number, height: number): void {
    const w = Math.max(1, width >> 1);
    const h = Math.max(1, height >> 1);
    this.targetA.setSize(w, h);
    this.targetB.setSize(w, h);
  }

  private draw(renderer: THREE.WebGLRenderer, material: THREE.ShaderMaterial, target: THREE.WebGLRenderTarget | null): void {
    this.quad.material = material;
    renderer.setRenderTarget(target);
    this.quad.render(renderer);
  }

  override render(
    renderer: THREE.WebGLRenderer,
    writeBuffer: THREE.WebGLRenderTarget,
    readBuffer: THREE.WebGLRenderTarget,
  ): void {
    const { width, height } = this.targetA;

    this.bright.uniforms.tDiffuse.value = readBuffer.texture;
    this.draw(renderer, this.bright, this.targetA);

    // Two ping-ponged passes, the second at triple the stride, which
    // approximates a much wider kernel for four more taps.
    const step = this.blur.uniforms.uStep.value as THREE.Vector2;
    for (const scale of [1, 3]) {
      this.blur.uniforms.tDiffuse.value = this.targetA.texture;
      step.set(scale / width, 0);
      this.draw(renderer, this.blur, this.targetB);

      this.blur.uniforms.tDiffuse.value = this.targetB.texture;
      step.set(0, scale / height);
      this.draw(renderer, this.blur, this.targetA);
    }

    this.composite.uniforms.tDiffuse.value = readBuffer.texture;
    this.composite.uniforms.tBloom.value = this.targetA.texture;
    this.composite.uniforms.uStrength.value = this.strength;
    this.draw(renderer, this.composite, this.renderToScreen ? null : writeBuffer);
  }

  override dispose(): void {
    this.targetA.dispose();
    this.targetB.dispose();
    this.bright.dispose();
    this.blur.dispose();
    this.composite.dispose();
    this.quad.dispose();
  }
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
      uRain: { value: 0 },
      uWet: { value: 0 },
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
      uniform float uRain;
      uniform float uWet;
      varying vec2 vUv;

      float hash21(vec2 p) {
        return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453);
      }

      /**
       * Water on the lens.
       *
       * Two things at once: beads that cling, sit still for a moment and then run,
       * and streaks drawn down the glass by the airflow. Both are done as a
       * refraction - an offset applied to the frame behind - rather than as
       * something drawn over the top, because a drop on glass does not brighten
       * what is behind it, it bends it. Returns the offset; the caller samples with
       * it and then adds a rim highlight where the offset is steep.
       */
      vec2 lensWater(vec2 uv, float aspect, out float rim) {
        rim = 0.0;
        vec2 offset = vec2(0.0);

        // Runnels: tall thin cells, each with its own drop falling down it, so the
        // trails are vertical the way water on a window is.
        for (int i = 0; i < 2; i++) {
          float scale = 9.0 + float(i) * 7.0;
          vec2 grid = vec2(uv.x * aspect * scale, uv.y * scale * 0.42);
          vec2 cell = floor(grid);
          vec2 f = fract(grid);
          float seed = hash21(cell + float(i) * 17.0);
          if (seed < 0.55) continue;
          // The drop's own speed and phase, so they do not fall in step.
          float speed = 0.16 + seed * 0.5;
          float head = fract(seed * 7.3 - uTime * speed);
          vec2 to = vec2(f.x - (0.3 + seed * 0.4), f.y - head);
          float radius = 0.1 + seed * 0.12;
          float bead = smoothstep(radius, radius * 0.25, length(to * vec2(1.0, 0.55)));
          // Tail smeared out behind it, thinning as it goes.
          float behind = clamp((f.y - head) / 0.45, 0.0, 1.0);
          float tail = (1.0 - behind) * smoothstep(radius * 1.3, 0.0, abs(to.x) * 1.6)
                     * step(head, f.y) * 0.5;
          float d = bead + tail;
          offset += normalize(to + 1e-4) * d * 0.02;
          rim = max(rim, bead);
        }

        // A scatter of static beads that have not started running yet.
        vec2 grid = vec2(uv.x * aspect, uv.y) * 22.0;
        vec2 cell = floor(grid);
        vec2 f = fract(grid) - 0.5;
        float seed = hash21(cell + 91.0);
        if (seed > 0.82) {
          vec2 jitter = vec2(hash21(cell + 3.0), hash21(cell + 11.0)) - 0.5;
          float radius = 0.12 + fract(seed * 31.0) * 0.16;
          float bead = smoothstep(radius, radius * 0.2, length(f - jitter * 0.5));
          offset += normalize(f - jitter * 0.5 + 1e-4) * bead * 0.012;
          rim = max(rim, bead * 0.8);
        }

        return offset;
      }

      void main() {
        vec2 texel = 1.0 / uResolution;
        // Screen shake: a decaying two-axis wobble at different rates.
        vec2 uv = vUv + uShake * vec2(
          sin(uTime * 47.0) * 0.006,
          cos(uTime * 39.0) * 0.005
        );

        float rim = 0.0;
        if (uRain > 0.01) {
          uv += lensWater(vUv, uResolution.x / max(uResolution.y, 1.0), rim) * uRain;
          rim *= uRain;
        }

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

        // Water on the lens: a bright edge round each drop where it bends the light,
        // and a general haze over the glass in heavy weather.
        if (uRain > 0.01) {
          col += rim * rim * 0.35;
          col = mix(col, col * vec3(0.9, 0.94, 1.0) + 0.02, uWet * 0.35);
        }

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
  /** Public so the headless look tests can bisect the post chain. */
  bloomPass: BloomPass | null = null;
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
    // The threshold sits above the brightest ordinary surface in the game, so
    // only genuine highlights - cloud tops, sun sparks, flames - reach it.
    this.bloomPass = new BloomPass(size.x, size.y, 0.5, 1.15, 0.6);
    this.composer.addPass(this.bloomPass);
    this.composer.addPass(new OutputPass());
    // Grade last, after tone mapping, so the vignette and lift work in display
    // space where they behave predictably.
    this.gradePass = new ShaderPass(gradeShader());
    this.composer.addPass(this.gradePass);
  }

  /** Screen shake and the underwater wobble live in the grade pass. */
  setGrade(options: { shake?: number; time?: number; rain?: number; wet?: number }): void {
    if (!this.gradePass) return;
    const uniforms = this.gradePass.uniforms;
    if (options.shake !== undefined) uniforms.uShake.value = options.shake;
    if (options.time !== undefined) uniforms.uTime.value = options.time;
    if (options.rain !== undefined) uniforms.uRain.value = options.rain;
    if (options.wet !== undefined) uniforms.uWet.value = options.wet;
  }

  setBloomStrength(strength: number): void {
    if (this.bloomPass) this.bloomPass.strength = strength;
  }

  /**
   * Vertical angle one pixel subtends, in radians. Shaders that fade detail by
   * how much of a surface a pixel covers need this; working it out from
   * screen-space derivatives instead gives a value that jumps at every triangle
   * boundary, and any threshold applied to it then draws the mesh.
   */
  pixelAngle(): number {
    const height = this.renderer.getDrawingBufferSize(new THREE.Vector2()).y;
    return (2 * Math.tan((this.camera.fov * Math.PI) / 360)) / Math.max(1, height);
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
