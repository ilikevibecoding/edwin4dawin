import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';

/**
 * Renderer + HDR post pipeline:
 * Render(world) → GTAO → Render(viewmodel, own 50° camera, layer 1) →
 * Bloom → Output(ACES) → SMAA → Film grade (CA, vignette, grain, military
 * palette, blast pulse).
 */

const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uVignette: { value: 0.42 },
    uGrain: { value: 0.028 },
    uCA: { value: 0.0011 },
    uSat: { value: 0.94 },
    uContrast: { value: 1.12 },
    uLift: { value: 0.002 },
    uWarmth: { value: 0.045 },
    uPulse: { value: 0 },
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform float uTime, uVignette, uGrain, uCA, uSat, uContrast, uLift, uWarmth, uPulse;
    varying vec2 vUv;

    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

    void main() {
      vec2 uv = vUv;
      vec2 c = uv - 0.5;
      float r2 = dot(c, c);

      // Chromatic aberration (radial) — spikes during blast pulse
      float ca = (uCA + uPulse * 0.005) * (0.4 + r2 * 3.2);
      vec3 col;
      col.r = texture2D(tDiffuse, uv + c * ca).r;
      col.g = texture2D(tDiffuse, uv).g;
      col.b = texture2D(tDiffuse, uv - c * ca).b;

      // Lift + contrast (filmic-ish S), blast pulse lifts blacks warm
      col = max(vec3(0.0), col + uLift + uPulse * 0.05);
      col = (col - 0.5) * uContrast + 0.5;

      // Saturation + warm military grade + warm-grey split-toned shadows
      float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = mix(vec3(lum), col, uSat);
      float w = uWarmth + uPulse * 0.03;
      col += vec3(w, w * 0.45, -w * 0.5) * lum;
      col += vec3(0.010, 0.004, -0.006) * (1.0 - lum);

      // Vignette (deepens briefly on blast pulse)
      float vigAmt = uVignette + uPulse * 0.18;
      float vig = 1.0 - smoothstep(0.18, 0.85, r2 * (1.0 + vigAmt)) * vigAmt;
      col *= vig;

      // Grain (luminance-weighted)
      float g = (hash(uv * vec2(1621.3, 1231.7) + fract(uTime) * 43.7) - 0.5) * uGrain * (1.1 - lum * 0.6);
      col += g;

      gl_FragColor = vec4(col, 1.0);
    }
  `,
};

export class Engine {
  constructor(canvas, quality = 'high') {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      powerPreference: 'high-performance',
      stencil: false,
    });
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.98;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, 1, 0.08, 1200);
    this.scene.add(this.camera);

    // Dedicated first-person weapon camera: constant 50 deg, layer 1 only.
    this.vmCamera = new THREE.PerspectiveCamera(50, 1, 0.01, 6);
    this.vmCamera.layers.set(1);

    this.quality = quality;
    this._pulse = 0;
    this._lastT = 0;
    this._buildComposer();
    this.setSize(window.innerWidth, window.innerHeight);
    window.addEventListener('resize', () => this.setSize(window.innerWidth, window.innerHeight));
  }

  _buildComposer() {
    const w = Math.max(2, window.innerWidth), h = Math.max(2, window.innerHeight);
    const rt = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, samples: 0 });
    this.composer = new EffectComposer(this.renderer, rt);

    this.renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(this.renderPass);

    this.gtao = new GTAOPass(this.scene, this.camera, w, h);
    this.gtao.output = GTAOPass.OUTPUT.Default;
    this.gtao.updateGtaoMaterial({
      radius: 0.9,
      distanceExponent: 1.6,
      thickness: 1.2,
      scale: 1.4,
      samples: this.quality === 'cinematic' ? 20 : 10,
      distanceFallOff: 1.0,
      screenSpaceRadius: false,
    });
    this.gtao.blendIntensity = 1.0;
    this.composer.addPass(this.gtao);

    // Viewmodel pass: drawn on top with its own depth
    this.vmPass = new RenderPass(this.scene, this.vmCamera);
    this.vmPass.clear = false;
    this.vmPass.clearDepth = true;
    this.composer.addPass(this.vmPass);

    this.bloom = new UnrealBloomPass(new THREE.Vector2(w, h), 0.3, 0.55, 0.78);
    this.composer.addPass(this.bloom);

    this.output = new OutputPass();
    this.composer.addPass(this.output);

    this.smaa = new SMAAPass(w, h);
    this.composer.addPass(this.smaa);

    this.grade = new ShaderPass(GradeShader);
    this.composer.addPass(this.grade);
  }

  setQuality(q) {
    this.quality = q;
    this.gtao.enabled = q !== 'medium';
    this.gtao.updateGtaoMaterial({ samples: q === 'cinematic' ? 20 : 10 });
    this.setSize(window.innerWidth, window.innerHeight);
  }

  setSize(w, h) {
    const pr = Math.min(window.devicePixelRatio || 1, this.quality === 'cinematic' ? 2 : 1.5);
    this.renderer.setPixelRatio(pr);
    this.renderer.setSize(w, h);
    this.composer.setPixelRatio(pr);
    this.composer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.vmCamera.aspect = w / h;
    this.vmCamera.updateProjectionMatrix();
  }

  /** Screen-space overpressure feedback (CA + vignette + lifted blacks). */
  blastPulse(strength = 1) {
    this._pulse = Math.min(1, this._pulse + strength);
  }

  render(t) {
    const dt = Math.min(0.1, Math.max(0.0001, t - this._lastT));
    this._lastT = t;
    this._pulse *= Math.exp(-4.5 * dt);
    this.grade.uniforms.uTime.value = t;
    this.grade.uniforms.uPulse.value = this._pulse;

    // Sync weapon camera to the player camera
    this.camera.updateMatrixWorld();
    this.vmCamera.position.setFromMatrixPosition(this.camera.matrixWorld);
    this.vmCamera.quaternion.setFromRotationMatrix(this.camera.matrixWorld);
    this.vmCamera.updateMatrixWorld();

    this.composer.render();
  }
}
