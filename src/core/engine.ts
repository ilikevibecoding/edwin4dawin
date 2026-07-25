import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

export interface QualitySettings {
  bloom: boolean;
  pixelRatioCap: number;
  shadows: boolean;
  oceanSegments: number;
  particles: boolean;
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
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    // Gentle bloom: enough to make lanterns and sun glitter glow, not a haze.
    this.bloomPass = new UnrealBloomPass(size, 0.24, 0.6, 0.92);
    this.composer.addPass(this.bloomPass);
    this.composer.addPass(new OutputPass());
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
