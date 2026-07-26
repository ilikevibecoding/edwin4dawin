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
 * Render → GTAO → Bloom → Output(ACES) → SMAA → Film grade (CA, vignette,
 * grain, contrast, desaturated military palette).
 */

const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uVignette: { value: 0.42 },
    uGrain: { value: 0.028 },
    uCA: { value: 0.0011 },
    uSat: { value: 1.04 },
    uContrast: { value: 1.055 },
    uLift: { value: 0.006 },
    uWarmth: { value: 0.03 },
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
    uniform float uTime, uVignette, uGrain, uCA, uSat, uContrast, uLift, uWarmth;
    varying vec2 vUv;

    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

    void main() {
      vec2 uv = vUv;
      vec2 c = uv - 0.5;
      float r2 = dot(c, c);

      // Chromatic aberration (radial)
      float ca = uCA * (0.4 + r2 * 3.2);
      vec3 col;
      col.r = texture2D(tDiffuse, uv + c * ca).r;
      col.g = texture2D(tDiffuse, uv).g;
      col.b = texture2D(tDiffuse, uv - c * ca).b;

      // Lift + contrast (filmic-ish S)
      col = max(vec3(0.0), col + uLift);
      col = (col - 0.5) * uContrast + 0.5;

      // Saturation + warm military grade
      float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = mix(vec3(lum), col, uSat);
      col += vec3(uWarmth, uWarmth * 0.45, -uWarmth * 0.5) * lum;

      // Vignette
      float vig = 1.0 - smoothstep(0.18, 0.85, r2 * (1.0 + uVignette)) * uVignette;
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
    this.renderer.toneMappingExposure = 1.06;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, 1, 0.012, 1200);
    this.scene.add(this.camera);

    this.quality = quality;
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
      radius: 0.5,
      distanceExponent: 1.6,
      thickness: 1.2,
      scale: 1.4,
      samples: this.quality === 'cinematic' ? 20 : 10,
      distanceFallOff: 1.0,
      screenSpaceRadius: false,
    });
    this.gtao.blendIntensity = 0.9;
    this.composer.addPass(this.gtao);

    this.bloom = new UnrealBloomPass(new THREE.Vector2(w, h), 0.24, 0.55, 0.88);
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
  }

  render(t) {
    this.grade.uniforms.uTime.value = t;
    this.composer.render();
  }
}
