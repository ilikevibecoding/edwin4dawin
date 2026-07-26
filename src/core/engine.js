import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { settings } from './settings.js';
import { bus, EV } from './events.js';
import { LIGHT_PLAN } from '../art/palette.js';
import { setTextureAnisotropy } from '../art/textures.js';

/**
 * Renderer, camera and post-processing chain.
 * Owner: Opus 1.
 *
 * Grade pass carries the film look: a restrained lift/gamma/gain grade, gentle
 * vignette, subtle chromatic edge falloff and an optional damage flash. Motion
 * blur is deliberately absent (the brief asks for it off by default and it
 * fights the readability requirement in a tactical shooter).
 */

const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uVignette: { value: 0.3 },
    uLift: { value: new THREE.Vector3(0.008, 0.012, 0.022) },
    uGain: { value: new THREE.Vector3(1.015, 1.0, 0.985) },
    uSaturation: { value: 1.06 },
    uContrast: { value: 1.045 },
    uDamage: { value: 0.0 },
    uFlash: { value: 0.0 },
    uAberration: { value: 0.0016 },
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
    uniform float uVignette;
    uniform vec3 uLift;
    uniform vec3 uGain;
    uniform float uSaturation;
    uniform float uContrast;
    uniform float uDamage;
    uniform float uFlash;
    uniform float uAberration;
    uniform float uTime;
    varying vec2 vUv;

    void main() {
      vec2 c = vUv - 0.5;
      float r2 = dot(c, c);
      float ab = uAberration * (0.4 + r2 * 2.0);
      vec3 col;
      col.r = texture2D(tDiffuse, vUv + c * ab).r;
      col.g = texture2D(tDiffuse, vUv).g;
      col.b = texture2D(tDiffuse, vUv - c * ab).b;

      // Lift / gain grade
      col = col * uGain + uLift * (1.0 - col);
      // Contrast around mid grey
      col = (col - 0.5) * uContrast + 0.5;
      // Saturation
      float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = mix(vec3(l), col, uSaturation);

      // Vignette
      float vig = smoothstep(0.95, 0.25, length(c) * 1.42);
      col *= mix(1.0, vig, uVignette);

      // Damage: desaturate edges and push red
      if (uDamage > 0.001) {
        float edge = smoothstep(0.15, 0.62, length(c));
        col = mix(col, vec3(l * 0.55, l * 0.13, l * 0.11), edge * uDamage);
      }
      if (uFlash > 0.001) {
        col = mix(col, vec3(1.0), clamp(uFlash, 0.0, 1.0));
      }
      gl_FragColor = vec4(max(col, 0.0), 1.0);
    }
  `,
};

export class Engine {
  constructor(canvas) {
    this.canvas = canvas;
    this.clock = new THREE.Clock();
    this.frame = 0;
    this.fpsSamples = [];
    this.simTime = 0;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      powerPreference: 'high-performance',
      stencil: false,
      alpha: false,
      // preserveDrawingBuffer forces a full framebuffer copy every frame. Under
      // software rasterisation that allocation churn grows renderer-native
      // memory until the tab is OOM-killed, and Chromium screenshots the last
      // composited frame anyway, so it buys nothing.
      preserveDrawingBuffer: false,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = LIGHT_PLAN.exposure;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.info.autoReset = false;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(LIGHT_PLAN.fogColor);

    this.camera = new THREE.PerspectiveCamera(settings.get('fov'), 16 / 9, 0.04, 420);
    this.camera.rotation.order = 'YXZ';

    // Separate overlay scene for the first-person view model so it never
    // intersects world geometry and never gets clipped by the world near plane.
    this.viewScene = new THREE.Scene();
    this.viewCamera = new THREE.PerspectiveCamera(65, 16 / 9, 0.004, 12);

    this._setupComposer();
    this._applyQuality();

    this._onResize = () => this.resize();
    window.addEventListener('resize', this._onResize);
    bus.on(EV.RESIZE, this._onResize);
    bus.on(EV.SETTINGS_CHANGED, ({ key }) => {
      if (key === 'fov' || key === null) {
        this.camera.fov = settings.get('fov');
        this.camera.updateProjectionMatrix();
      }
      if (key === 'quality' || key === 'resolutionScale' || key === null) this._applyQuality();
    });
    this.resize();
  }

  _setupComposer() {
    const size = new THREE.Vector2();
    this.renderer.getSize(size);
    this.composer = new EffectComposer(this.renderer);
    this.composer.setPixelRatio(this.renderer.getPixelRatio());
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(this.renderPass);

    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(size.x, size.y),
      LIGHT_PLAN.bloomStrength,
      LIGHT_PLAN.bloomRadius,
      LIGHT_PLAN.bloomThreshold,
    );
    this.composer.addPass(this.bloomPass);

    this.gradePass = new ShaderPass(GradeShader);
    this.composer.addPass(this.gradePass);

    this.smaaPass = new SMAAPass(size.x, size.y);
    this.composer.addPass(this.smaaPass);

    this.outputPass = new OutputPass();
    this.composer.addPass(this.outputPass);
  }

  _applyQuality() {
    const p = settings.preset;
    const scale = settings.get('resolutionScale') ?? p.resolutionScale;
    this.qualityPreset = p;
    this.pixelRatio = Math.min(window.devicePixelRatio || 1, p.pixelRatioCap) * scale;
    this.renderer.shadowMap.enabled = p.shadowsEnabled;
    this.renderer.shadowMap.type = p.shadowMapSize >= 2048 ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
    // Shadows are refreshed on demand rather than every frame: the sun is
    // static and the shadow volume only needs a rebuild when the player has
    // actually moved, which removes a full extra scene pass from most frames.
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.shadowMap.needsUpdate = true;
    this.bloomPass.enabled = p.bloomEnabled;
    this.smaaPass.enabled = p.antialias;
    this.gradePass.uniforms.uVignette.value = settings.get('reducedCameraMotion') ? LIGHT_PLAN.vignette * 0.5 : LIGHT_PLAN.vignette;
    this.gradePass.uniforms.uAberration.value = p.bloomEnabled ? 0.0016 : 0;
    setTextureAnisotropy(Math.min(p.anisotropy, this.renderer.capabilities.getMaxAnisotropy()));
    this.resize();
  }

  resize() {
    const parent = this.canvas.parentElement ?? document.body;
    const w = Math.max(320, parent.clientWidth || window.innerWidth);
    const h = Math.max(240, parent.clientHeight || window.innerHeight);
    this.viewportWidth = w;
    this.viewportHeight = h;
    this.renderer.setPixelRatio(this.pixelRatio ?? 1);
    this.renderer.setSize(w, h, false);
    this.composer.setPixelRatio(this.pixelRatio ?? 1);
    this.composer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.viewCamera.aspect = w / h;
    this.viewCamera.updateProjectionMatrix();
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
  }

  setDamageEffect(v) {
    this.gradePass.uniforms.uDamage.value = v;
  }

  setFlashEffect(v) {
    this.gradePass.uniforms.uFlash.value = v;
  }

  /** Request one shadow-map refresh on the next rendered frame. */
  invalidateShadows() {
    this._shadowDirty = true;
  }

  render(dt) {
    this.gradePass.uniforms.uTime.value += dt;
    // Shadow maps refresh on a fixed cadence rather than every frame. Moving
    // characters still get shadows; they update at 30 Hz instead of 60, which
    // is invisible in play and removes half of the shadow scene passes.
    if (this.renderer.shadowMap.enabled) {
      const interval = this.qualityPreset?.shadowInterval ?? 2;
      if (this._shadowDirty || this.frame % interval === 0) {
        this.renderer.shadowMap.needsUpdate = true;
        this._shadowDirty = false;
      }
    }
    this.renderer.info.reset();
    this.composer.render(dt);
    // View model drawn on top with its own camera so arms never clip walls.
    this.renderer.autoClear = false;
    this.renderer.clearDepth();
    this.renderer.render(this.viewScene, this.viewCamera);
    this.renderer.autoClear = true;
    this.frame++;
  }

  sceneObjectCount() {
    let n = 0;
    this.scene.traverse((o) => { if (o.isMesh || o.isPoints || o.isLine) n++; });
    return n;
  }

  stats() {
    const info = this.renderer.info;
    return {
      frame: this.frame,
      drawCalls: info.render.calls,
      triangles: info.render.triangles,
      programs: info.programs?.length ?? 0,
      geometries: info.memory.geometries,
      textures: info.memory.textures,
      pixelRatio: this.pixelRatio,
      width: this.viewportWidth,
      height: this.viewportHeight,
    };
  }

  dispose() {
    window.removeEventListener('resize', this._onResize);
    this.composer.dispose?.();
    this.renderer.dispose();
  }
}
