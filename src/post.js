// Post-processing chain: HDR render target -> bloom -> linear grade (exposure,
// chromatic aberration, vignette) -> tone map/output -> grain + sharpen -> SMAA.
// Includes a dynamic-resolution controller so heavy frames degrade gracefully.

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';

const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uExposure: { value: 1.0 },
    uAberration: { value: 0.0016 },
    uVignette: { value: 0.34 },
    uSaturation: { value: 1.06 },
    uLiftShadow: { value: new THREE.Vector3(0.004, 0.006, 0.012) },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 ); }
  `,
  fragmentShader: /* glsl */ `
    precision highp float;
    uniform sampler2D tDiffuse;
    uniform float uExposure;
    uniform float uAberration;
    uniform float uVignette;
    uniform float uSaturation;
    uniform vec3 uLiftShadow;
    varying vec2 vUv;
    void main() {
      vec2 c = vUv - 0.5;
      float r2 = dot( c, c );
      // Lateral chromatic aberration grows toward the frame edge.
      vec2 off = c * uAberration * ( 0.35 + r2 * 2.4 );
      vec3 col;
      col.r = texture2D( tDiffuse, vUv + off ).r;
      col.g = texture2D( tDiffuse, vUv ).g;
      col.b = texture2D( tDiffuse, vUv - off ).b;
      col *= uExposure;
      float l = dot( col, vec3( 0.2126, 0.7152, 0.0722 ) );
      col = mix( vec3( l ), col, uSaturation );
      col += uLiftShadow * ( 1.0 - smoothstep( 0.0, 0.25, l ) );
      float vig = 1.0 - uVignette * pow( r2 * 2.0, 1.35 );
      col *= clamp( vig, 0.0, 1.0 );
      gl_FragColor = vec4( max( col, vec3( 0.0 ) ), 1.0 );
    }
  `,
};

const FilmShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uGrain: { value: 0.035 },
    uSharpen: { value: 0.32 },
    uResolution: { value: new THREE.Vector2(1280, 720) },
  },
  vertexShader: GradeShader.vertexShader,
  fragmentShader: /* glsl */ `
    precision highp float;
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uGrain;
    uniform float uSharpen;
    uniform vec2 uResolution;
    varying vec2 vUv;
    float hash( vec2 p ) { return fract( sin( dot( p, vec2( 127.1, 311.7 ) ) ) * 43758.5453 ); }
    void main() {
      vec2 texel = 1.0 / uResolution;
      vec3 c = texture2D( tDiffuse, vUv ).rgb;
      if ( uSharpen > 0.001 ) {
        vec3 blur = (
          texture2D( tDiffuse, vUv + vec2( texel.x, 0.0 ) ).rgb +
          texture2D( tDiffuse, vUv - vec2( texel.x, 0.0 ) ).rgb +
          texture2D( tDiffuse, vUv + vec2( 0.0, texel.y ) ).rgb +
          texture2D( tDiffuse, vUv - vec2( 0.0, texel.y ) ).rgb ) * 0.25;
        c += ( c - blur ) * uSharpen;
      }
      float n = hash( vUv * uResolution + fract( uTime ) * 917.0 ) - 0.5;
      float lum = dot( c, vec3( 0.2126, 0.7152, 0.0722 ) );
      c += n * uGrain * ( 0.35 + ( 1.0 - lum ) * 0.9 );
      gl_FragColor = vec4( clamp( c, 0.0, 1.0 ), 1.0 );
    }
  `,
};

export class Post {
  constructor(renderer, scene, camera, quality) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.quality = quality;
    this.enabled = true;
    this.scale = 1;
    this.targetScale = 1;

    const size = renderer.getSize(new THREE.Vector2());
    this.composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(size.x, size.y, {
      type: THREE.HalfFloatType,
      samples: 0,
      colorSpace: THREE.LinearSRGBColorSpace,
    }));
    this.composer.setPixelRatio(renderer.getPixelRatio());

    this.renderPass = new RenderPass(scene, camera);
    this.composer.addPass(this.renderPass);

    if (quality.bloom) {
      this.bloom = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.45, 0.62, 0.82);
      this.composer.addPass(this.bloom);
    }

    this.grade = new ShaderPass(GradeShader);
    this.composer.addPass(this.grade);

    this.output = new OutputPass();
    this.composer.addPass(this.output);

    this.film = new ShaderPass(FilmShader);
    this.film.uniforms.uResolution.value.set(size.x, size.y);
    this.composer.addPass(this.film);

    if (quality.smaa) {
      this.smaa = new SMAAPass(size.x, size.y);
      this.composer.addPass(this.smaa);
    }
    this.film.renderToScreen = !quality.smaa;
  }

  setTimeOfDay(tod) {
    if (this.bloom) {
      this.bloom.strength = tod.bloom;
      this.bloom.threshold = tod.bloomThreshold !== undefined ? tod.bloomThreshold : 0.85;
      this.bloom.radius = 0.6;
    }
    this.grade.uniforms.uExposure.value = 1.0;
    this.grade.uniforms.uSaturation.value = tod.label === 'NIGHT' ? 1.0 : 1.14;
    this.grade.uniforms.uVignette.value = tod.label === 'NIGHT' ? 0.44 : 0.32;
    this.film.uniforms.uGrain.value = tod.label === 'NIGHT' ? 0.055 : 0.028;
  }

  setReducedMotion(on) {
    this.grade.uniforms.uAberration.value = on ? 0.0004 : 0.0016;
    this.film.uniforms.uGrain.value = on ? 0.014 : this.film.uniforms.uGrain.value;
  }

  setSize(w, h) {
    this.composer.setSize(w, h);
    this.film.uniforms.uResolution.value.set(w, h);
    if (this.bloom) this.bloom.setSize(w, h);
    if (this.smaa) this.smaa.setSize(w, h);
  }

  /** Nudge the internal resolution to protect frame rate on weak GPUs. */
  adapt(frameMs, budgetMs = 15.5) {
    if (frameMs > budgetMs * 1.35) this.targetScale = Math.max(0.62, this.targetScale - 0.04);
    else if (frameMs < budgetMs * 0.72) this.targetScale = Math.min(1, this.targetScale + 0.015);
    if (Math.abs(this.targetScale - this.scale) > 0.02) {
      this.scale = this.targetScale;
      this.renderer.setPixelRatio(this.quality.pixelRatio * this.scale);
      const s = this.renderer.getSize(new THREE.Vector2());
      this.setSize(s.x, s.y);
      this.composer.setPixelRatio(this.renderer.getPixelRatio());
    }
  }

  render(dt, elapsed) {
    this.film.uniforms.uTime.value = elapsed;
    this.composer.render(dt);
  }

  dispose() {
    this.composer.dispose();
  }
}
