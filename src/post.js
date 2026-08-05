// Post-processing chain: bloom, filmic grade (vignette, grain, chromatic
// aberration, contrast/saturation) and anti-aliasing.
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';

const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uVignette: { value: 0.34 },
    uGrain: { value: 0.04 },
    uAberration: { value: 0.0016 },
    uContrast: { value: 1.045 },
    uSaturation: { value: 1.06 },
    uLift: { value: new THREE.Vector3(0.004, 0.006, 0.012) },
    uShake: { value: 0 },
    uFlash: { value: 0 },
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
    uniform float uTime;
    uniform float uVignette;
    uniform float uGrain;
    uniform float uAberration;
    uniform float uContrast;
    uniform float uSaturation;
    uniform vec3 uLift;
    uniform float uShake;
    uniform float uFlash;
    varying vec2 vUv;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }

    void main() {
      vec2 uv = vUv;
      vec2 c = uv - 0.5;
      float r2 = dot(c, c);

      // lateral chromatic aberration grows towards the frame edge
      float ab = uAberration * (1.0 + r2 * 2.5) + uShake * 0.004;
      vec3 col;
      col.r = texture2D(tDiffuse, uv + c * ab).r;
      col.g = texture2D(tDiffuse, uv).g;
      col.b = texture2D(tDiffuse, uv - c * ab).b;

      // grade
      col = (col - 0.5) * uContrast + 0.5;
      float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = mix(vec3(l), col, uSaturation);
      col += uLift * (1.0 - l);

      // vignette
      float v = smoothstep(0.85, 0.18, r2 * 2.0);
      col *= mix(1.0, v, uVignette);

      // film grain, animated
      float g = hash(uv * vec2(1920.0, 1080.0) + fract(uTime) * 91.7) - 0.5;
      col += g * uGrain * (1.0 - l * 0.55);

      col += uFlash;

      gl_FragColor = vec4(col, 1.0);
    }
  `,
};

export class Post {
  constructor(renderer, scene, camera, { quality = 'high' } = {}) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.quality = quality;

    const size = renderer.getSize(new THREE.Vector2());
    this.composer = new EffectComposer(renderer);
    this.composer.setSize(size.x, size.y);

    this.renderPass = new RenderPass(scene, camera);
    this.composer.addPass(this.renderPass);

    // Tone map first, then bloom. The analytic sky renders at 10-30 in linear
    // HDR, so an HDR bloom threshold would treat the whole sky as a highlight
    // and veil the frame. Blooming the tone-mapped image keeps highlights
    // localised to genuinely bright things: the sun disc, plumes, explosions
    // and status lights.
    this.output = new OutputPass();
    this.composer.addPass(this.output);

    this.bloom = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.45, 0.7, 0.82);
    this.composer.addPass(this.bloom);

    this.grade = new ShaderPass(GradeShader);
    this.composer.addPass(this.grade);

    this.smaa = new SMAAPass();
    this.composer.addPass(this.smaa);

    this.enabled = true;
    this.flash = 0;
  }

  setQuality(q) {
    this.quality = q;
    if (q === 'low') {
      this.bloom.enabled = true;
      this.bloom.strength = Math.min(this.bloom.strength, 0.3);
      this.smaa.enabled = false;
    } else if (q === 'medium') {
      this.bloom.enabled = true;
      this.smaa.enabled = false;
    } else {
      this.bloom.enabled = true;
      this.smaa.enabled = true;
    }
  }

  applyCondition(c) {
    this.bloom.strength = c.bloomStrength;
    this.bloom.threshold = c.bloomThreshold;
    this.bloom.radius = c.id === 'night' ? 0.85 : 0.7;
    this.grade.uniforms.uGrain.value = c.grain;
    this.grade.uniforms.uVignette.value = c.vignette;
    this.grade.uniforms.uSaturation.value = c.id === 'night' ? 0.94 : 1.07;
    this.grade.uniforms.uContrast.value = c.id === 'night' ? 1.08 : 1.045;
  }

  setReducedMotion(on) {
    this.grade.uniforms.uAberration.value = on ? 0.0004 : 0.0016;
  }

  addFlash(v) {
    this.flash = Math.min(0.7, this.flash + v);
  }

  setSize(w, h) {
    this.composer.setSize(w, h);
    this.bloom.setSize(w, h);
    if (this.smaa.setSize) this.smaa.setSize(w, h);
  }

  render(dt, elapsed, shake = 0) {
    this.grade.uniforms.uTime.value = elapsed;
    this.grade.uniforms.uShake.value = shake;
    this.flash *= Math.exp(-6 * dt);
    this.grade.uniforms.uFlash.value = this.flash;
    if (this.enabled) this.composer.render(dt);
    else this.renderer.render(this.scene, this.camera);
  }
}
