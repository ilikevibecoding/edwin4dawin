// Renderer wrapper: WebGL2 three.js renderer, resize, quality tiers, resolution scale.
import * as THREE from 'three';
import { settings } from './settings.js';

export const QUALITY = {
  low:    { pixelRatioCap: 1.0, shadowSize: 1024, shadows: true, fillLights: 6,  particles: 0.4, anisotropy: 2, shadowRadius: 2 },
  medium: { pixelRatioCap: 1.5, shadowSize: 2048, shadows: true, fillLights: 12, particles: 0.7, anisotropy: 4, shadowRadius: 3 },
  high:   { pixelRatioCap: 2.0, shadowSize: 4096, shadows: true, fillLights: 20, particles: 1.0, anisotropy: 8, shadowRadius: 4 },
  ultra:  { pixelRatioCap: 2.0, shadowSize: 4096, shadows: true, fillLights: 28, particles: 1.3, anisotropy: 16, shadowRadius: 4 },
};

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({
      canvas, antialias: true, powerPreference: 'high-performance', stencil: false,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.info.autoReset = true;

    this.camera = new THREE.PerspectiveCamera(settings.get('fov'), 16 / 9, 0.06, 300);
    this.camera.rotation.order = 'YXZ';

    this.width = 1; this.height = 1;
    this.qualityListeners = new Set();
    this._applyQuality();
    this.resize();
    window.addEventListener('resize', () => this.resize());
    settings.onChange((k) => {
      if (k === 'quality' || k === 'resolutionScale') { this._applyQuality(); this.resize(); }
      if (k === 'fov') { this.camera.fov = settings.get('fov'); this.camera.updateProjectionMatrix(); }
    });
  }

  get profile() { return QUALITY[settings.get('quality')] || QUALITY.high; }

  onQualityChange(fn) { this.qualityListeners.add(fn); return () => this.qualityListeners.delete(fn); }

  _applyQuality() {
    const q = this.profile;
    this.renderer.shadowMap.enabled = q.shadows;
    for (const fn of this.qualityListeners) fn(q);
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.width = w; this.height = h;
    const q = this.profile;
    const pr = Math.min(window.devicePixelRatio || 1, q.pixelRatioCap) * settings.get('resolutionScale');
    this.renderer.setPixelRatio(pr);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  render(scene) { this.renderer.render(scene, this.camera); }
}
