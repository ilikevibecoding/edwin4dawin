import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { applyEnvironment } from './materials.js';

/**
 * Final grade: 2.39:1 letterbox, vignette, film grain and a touch of chromatic
 * aberration. Grain is driven by an explicit frame counter rather than a clock
 * so the offline renderer reproduces the live playback exactly.
 */
const FilmicShader = {
  uniforms: {
    tDiffuse: { value: null },
    uFrame: { value: 0 },
    uGrain: { value: 0.05 },
    uVignette: { value: 0.55 },
    uAberration: { value: 0.0016 },
    uLetterbox: { value: 0.0 },       // 0 = off, 1 = full 2.39:1 bars
    uFade: { value: 0.0 },            // 1 = black
    uFadeColor: { value: new THREE.Color(0, 0, 0) },
    uAspect: { value: 16 / 9 },
    uSaturation: { value: 1.05 },
    uContrast: { value: 1.03 },
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform float uFrame, uGrain, uVignette, uAberration, uLetterbox, uFade, uAspect, uSaturation, uContrast;
    uniform vec3 uFadeColor;
    varying vec2 vUv;

    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }

    void main() {
      vec2 uv = vUv;
      vec2 c = uv - 0.5;
      float r2 = dot(c, c);

      // chromatic aberration grows toward the frame edge
      vec2 off = c * uAberration * (0.4 + r2 * 3.0);
      vec4 col;
      col.r = texture2D(tDiffuse, uv + off).r;
      col.g = texture2D(tDiffuse, uv).g;
      col.b = texture2D(tDiffuse, uv - off).b;
      col.a = 1.0;

      // contrast + saturation
      col.rgb = (col.rgb - 0.5) * uContrast + 0.5;
      float lum = dot(col.rgb, vec3(0.2126, 0.7152, 0.0722));
      col.rgb = mix(vec3(lum), col.rgb, uSaturation);

      // vignette
      float vig = smoothstep(0.9, 0.15, r2 * 1.9);
      col.rgb *= mix(1.0, vig, uVignette);

      // grain
      float g = hash(uv * vec2(1920.0, 1080.0) + uFrame * 1.7) - 0.5;
      col.rgb += g * uGrain * (1.0 - 0.6 * lum);

      col.rgb = mix(col.rgb, uFadeColor, clamp(uFade, 0.0, 1.0));

      // letterbox to 2.39:1
      float target = 2.39;
      float visible = uAspect / target;                 // fraction of height kept
      float bar = mix(0.0, (1.0 - clamp(visible, 0.0, 1.0)) * 0.5, clamp(uLetterbox, 0.0, 1.0));
      if (uv.y < bar || uv.y > 1.0 - bar) col.rgb = vec3(0.0);

      gl_FragColor = col;
    }
  `,
};

export class Engine {
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,               // SMAA pass handles this
      powerPreference: 'high-performance',
      stencil: false,
      preserveDrawingBuffer: !!opts.preserveDrawingBuffer,
    });
    this.renderer.setPixelRatio(opts.pixelRatio ?? Math.min(devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.shadowMap.enabled = opts.shadows !== false;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.info.autoReset = true;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);

    this.camera = new THREE.PerspectiveCamera(38, 16 / 9, 0.1, 20000);
    this.camera.position.set(0, 10, 30);

    // Studio environment: what makes ABS look like ABS instead of clay.
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    pmrem.compileEquirectangularShader();
    this.envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environment = this.envMap;
    this.scene.environmentIntensity = opts.envIntensity ?? 0.5;
    applyEnvironment(null);           // materials read scene.environment; keep envMap slot free
    pmrem.dispose();

    this.composer = new EffectComposer(this.renderer);
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(this.renderPass);

    this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.55, 0.55, 0.82);
    this.composer.addPass(this.bloom);

    this.filmic = new ShaderPass(FilmicShader);
    this.composer.addPass(this.filmic);

    this.output = new OutputPass();
    this.composer.addPass(this.output);

    this.smaa = new SMAAPass(1, 1);
    this.composer.addPass(this.smaa);

    this.frame = 0;
    this.size = { w: 1, h: 1 };
    this.setSize(opts.width || canvas.clientWidth || 1280, opts.height || canvas.clientHeight || 720);
  }

  setSize(w, h) {
    w = Math.max(2, Math.floor(w));
    h = Math.max(2, Math.floor(h));
    this.size = { w, h };
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h);
    this.bloom.setSize(w, h);
    this.smaa.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.filmic.uniforms.uAspect.value = w / h;
  }

  get grade() { return this.filmic.uniforms; }

  set exposure(v) { this.renderer.toneMappingExposure = v; }
  get exposure() { return this.renderer.toneMappingExposure; }

  render() {
    this.filmic.uniforms.uFrame.value = this.frame++;
    this.composer.render();
  }

  dispose() {
    this.composer.dispose();
    this.renderer.dispose();
  }
}
