import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { settings, type Quality } from './settings';

export interface QualityProfile {
  shadowMapSize: number;
  shadows: boolean;
  maxPixelRatio: number;
  bloom: boolean;
  particleScale: number;
  anisotropy: number;
  msaaSamples: number;
  maxLights: number;
}

const QUALITY: Record<Quality, QualityProfile> = {
  low:    { shadowMapSize: 1024, shadows: true,  maxPixelRatio: 1,   bloom: false, particleScale: 0.5, anisotropy: 2, msaaSamples: 0, maxLights: 12 },
  medium: { shadowMapSize: 1536, shadows: true,  maxPixelRatio: 1.5, bloom: false, particleScale: 0.75, anisotropy: 4, msaaSamples: 2, maxLights: 20 },
  high:   { shadowMapSize: 2048, shadows: true,  maxPixelRatio: 2,   bloom: true,  particleScale: 1,   anisotropy: 8, msaaSamples: 4, maxLights: 32 },
  ultra:  { shadowMapSize: 4096, shadows: true,  maxPixelRatio: 2,   bloom: true,  particleScale: 1.25, anisotropy: 16, msaaSamples: 4, maxLights: 44 },
};

/**
 * Rendering engine: renderer, world scene/camera, view-model scene/camera
 * (rendered in a second depth-cleared pass so first-person weapons can never
 * intersect walls), resize + quality management.
 */
export class Engine {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  /** View-model layer (first-person arms + weapon). */
  readonly vmScene = new THREE.Scene();
  readonly vmCamera: THREE.PerspectiveCamera;
  readonly canvas: HTMLCanvasElement;
  profile: QualityProfile = QUALITY[settings.get('quality')];
  private composer: EffectComposer | null = null;
  private bloomPass: UnrealBloomPass | null = null;
  private renderSize = new THREE.Vector2(1, 1);

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
      stencil: false,
    });
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.setClearColor(0x0b0e12);

    this.camera = new THREE.PerspectiveCamera(settings.get('fov'), 16 / 9, 0.08, 320);
    this.vmCamera = new THREE.PerspectiveCamera(58, 16 / 9, 0.01, 8);

    window.addEventListener('resize', () => this.resize());
    document.addEventListener('fullscreenchange', () => this.resize());
    this.applyQuality(settings.get('quality'));
    this.resize();
  }

  get maxAnisotropy(): number {
    return Math.min(this.profile.anisotropy, this.renderer.capabilities.getMaxAnisotropy());
  }

  applyQuality(q: Quality): void {
    this.profile = QUALITY[q];
    this.renderer.shadowMap.enabled = this.profile.shadows;
    this.renderer.shadowMap.needsUpdate = true;
    this.rebuildComposer();
    this.resize();
  }

  private rebuildComposer(): void {
    this.composer?.dispose();
    this.composer = null;
    this.bloomPass = null;
    if (!this.profile.bloom) return;
    const size = this.renderer.getDrawingBufferSize(new THREE.Vector2());
    const rt = new THREE.WebGLRenderTarget(size.x, size.y, {
      samples: this.profile.msaaSamples,
      type: THREE.HalfFloatType,
    });
    this.composer = new EffectComposer(this.renderer, rt);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloomPass = new UnrealBloomPass(size, 0.18, 0.55, 0.92);
    this.composer.addPass(this.bloomPass);
    this.composer.addPass(new OutputPass());
  }

  resize(): void {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, this.profile.maxPixelRatio);
    const scale = settings.get('resolutionScale');
    const rw = Math.max(2, Math.floor(w * dpr * scale));
    const rh = Math.max(2, Math.floor(h * dpr * scale));
    if (this.renderSize.x === rw && this.renderSize.y === rh) return;
    this.renderSize.set(rw, rh);
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(rw, rh, false);
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.composer?.setSize(rw, rh);
    const aspect = w / h;
    this.camera.aspect = aspect;
    this.camera.fov = settings.get('fov');
    this.camera.updateProjectionMatrix();
    this.vmCamera.aspect = aspect;
    this.vmCamera.updateProjectionMatrix();
  }

  render(): void {
    if (this.composer) {
      this.composer.render();
    } else {
      this.renderer.autoClear = true;
      this.renderer.render(this.scene, this.camera);
    }
    // View-model pass: clear depth so FP weapon draws over the world but keeps
    // its own internal occlusion.
    this.renderer.autoClear = false;
    this.renderer.clearDepth();
    this.renderer.render(this.vmScene, this.vmCamera);
    this.renderer.autoClear = true;
  }

  /** Draw-call / triangle counters for the QA overlay & perf reports. */
  stats(): { calls: number; triangles: number; geometries: number; textures: number } {
    const i = this.renderer.info;
    return {
      calls: i.render.calls,
      triangles: i.render.triangles,
      geometries: i.memory.geometries,
      textures: i.memory.textures,
    };
  }
}
