// Post-processing chain: HDR render target -> bloom -> flare (anamorphic streak
// + optional sun shafts) -> linear grade (exposure, aberration, filmic contrast,
// colour grade, vignette) -> tone map/output -> grain + sharpen -> SMAA.
// Includes a dynamic-resolution controller so heavy frames degrade gracefully.

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { Pass, FullScreenQuad } from 'three/addons/postprocessing/Pass.js';

const FS_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 ); }
`;

const LUMA = 'const vec3 LUMA = vec3( 0.2126, 0.7152, 0.0722 );';

const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uExposure: { value: 1.0 },
    uAberration: { value: 0.0016 },
    uVignette: { value: 0.34 },
    uVignetteStart: { value: 0.34 },
    uSaturation: { value: 1.12 },
    uContrast: { value: 1.1 },
    uShadowTint: { value: new THREE.Color(0x2a3f66) },
    uShadowStrength: { value: 0.01 },
    uHighlightTint: { value: new THREE.Color(0xfff2dc) },
    uHighlightStrength: { value: 0.05 },
  },
  vertexShader: FS_VERT,
  fragmentShader: /* glsl */ `
    precision highp float;
    uniform sampler2D tDiffuse;
    uniform float uExposure;
    uniform float uAberration;
    uniform float uVignette;
    uniform float uVignetteStart;
    uniform float uSaturation;
    uniform float uContrast;
    uniform vec3 uShadowTint;
    uniform float uShadowStrength;
    uniform vec3 uHighlightTint;
    uniform float uHighlightStrength;
    varying vec2 vUv;
    ${LUMA}
    void main() {
      vec2 c = vUv - 0.5;
      float r2 = dot( c, c );
      // Lateral chromatic aberration grows toward the frame edge.
      vec2 off = c * uAberration * ( 0.35 + r2 * 2.4 );
      vec3 col;
      col.r = texture2D( tDiffuse, vUv + off ).r;
      col.g = texture2D( tDiffuse, vUv ).g;
      col.b = texture2D( tDiffuse, vUv - off ).b;
      col = max( col * uExposure, vec3( 0.0 ) );

      // Filmic S-curve about mid grey, applied in linear before the tone map so
      // the ACES shoulder still does the highlight roll-off.
      col = 0.18 * pow( col / 0.18, vec3( uContrast ) );

      float l = dot( col, LUMA );
      col += uShadowTint * uShadowStrength * ( 1.0 - smoothstep( 0.0, 0.25, l ) );
      // Luminance-normalised so the highlight tint shifts hue, not exposure.
      vec3 ht = uHighlightTint / max( dot( uHighlightTint, LUMA ), 1e-4 );
      col *= mix( vec3( 1.0 ), ht, uHighlightStrength * smoothstep( 0.45, 2.2, l ) );

      float l2 = dot( col, LUMA );
      col = mix( vec3( l2 ), col, uSaturation );

      // Smooth falloff that leaves the middle of the frame untouched.
      float r = length( c ) * 1.4142;
      float vig = 1.0 - uVignette * smoothstep( uVignetteStart, 1.05, r );
      col *= clamp( vig, 0.0, 1.0 );
      gl_FragColor = vec4( max( col, vec3( 0.0 ) ), 1.0 );
    }
  `,
};

const FilmShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uGrain: { value: 0.028 },
    uSharpen: { value: 0.32 },
    uResolution: { value: new THREE.Vector2(1280, 720) },
  },
  vertexShader: FS_VERT,
  fragmentShader: /* glsl */ `
    precision highp float;
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uGrain;
    uniform float uSharpen;
    uniform vec2 uResolution;
    varying vec2 vUv;
    ${LUMA}
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
      float lum = dot( c, LUMA );
      c += n * uGrain * ( 0.35 + ( 1.0 - lum ) * 0.9 );
      gl_FragColor = vec4( clamp( c, 0.0, 1.0 ), 1.0 );
    }
  `,
};

const BrightShader = {
  uniforms: {
    tDiffuse: { value: null },
    uThreshold: { value: 2.0 },
    uTexel: { value: new THREE.Vector2() },
  },
  vertexShader: FS_VERT,
  fragmentShader: /* glsl */ `
    precision highp float;
    uniform sampler2D tDiffuse;
    uniform float uThreshold;
    uniform vec2 uTexel;
    varying vec2 vUv;
    ${LUMA}
    void main() {
      // Four taps because the source is eight times the width of this buffer.
      vec3 c = texture2D( tDiffuse, vUv + vec2( -uTexel.x, -uTexel.y ) ).rgb
             + texture2D( tDiffuse, vUv + vec2(  uTexel.x, -uTexel.y ) ).rgb
             + texture2D( tDiffuse, vUv + vec2( -uTexel.x,  uTexel.y ) ).rgb
             + texture2D( tDiffuse, vUv + vec2(  uTexel.x,  uTexel.y ) ).rgb;
      c *= 0.25;
      float l = dot( c, LUMA );
      c *= smoothstep( uThreshold, uThreshold * 1.8 + 0.25, l );
      // Clamped so one very hot source (the sun, a lamp filament) cannot smear
      // the whole frame once it is blurred out to a third of the width.
      gl_FragColor = vec4( min( c, vec3( 10.0 ) ), 1.0 );
    }
  `,
};

const StreakShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTexel: { value: new THREE.Vector2() },
    uStreak: { value: 0.4 },
    uStreakTint: { value: new THREE.Color(0x8fb4ff) },
    uGodray: { value: 0.0 },
    uSunUV: { value: new THREE.Vector2(0.5, 0.5) },
    uSunVis: { value: 0.0 },
  },
  vertexShader: FS_VERT,
  fragmentShader: /* glsl */ `
    precision highp float;
    uniform sampler2D tDiffuse;
    uniform vec2 uTexel;
    uniform float uStreak;
    uniform vec3 uStreakTint;
    uniform float uGodray;
    uniform vec2 uSunUV;
    uniform float uSunVis;
    varying vec2 vUv;
    void main() {
      vec3 acc = vec3( 0.0 );

      // Anamorphic horizontal streak. Runs on a 1/8-scale bright buffer, so
      // forty taps at one texel reach roughly a third of the frame.
      vec3 s = vec3( 0.0 );
      float wsum = 0.0;
      for ( int i = -20; i <= 20; i++ ) {
        float fi = float( i );
        // Windowed so the streak fades out instead of ending in a hard cap.
        float w = exp( -abs( fi ) * 0.115 ) * ( 1.0 - abs( fi ) / 21.0 );
        s += texture2D( tDiffuse, vUv + vec2( fi * uTexel.x, 0.0 ) ).rgb * w;
        wsum += w;
      }
      acc += ( s / wsum ) * uStreakTint * uStreak;

      if ( uGodray > 0.0001 && uSunVis > 0.0001 ) {
        vec2 step = ( uSunUV - vUv ) * 0.085;
        vec2 p = vUv;
        vec3 g = vec3( 0.0 );
        float dec = 1.0;
        for ( int i = 0; i < 12; i++ ) {
          p += step;
          g += texture2D( tDiffuse, p ).rgb * dec;
          dec *= 0.855;
        }
        acc += g * ( uGodray / 5.83 ) * uSunVis;
      }

      gl_FragColor = vec4( acc, 1.0 );
    }
  `,
};

const CompositeShader = {
  uniforms: { tDiffuse: { value: null }, tFlare: { value: null }, uTexel: { value: new THREE.Vector2() } },
  vertexShader: FS_VERT,
  fragmentShader: /* glsl */ `
    precision highp float;
    uniform sampler2D tDiffuse;
    uniform sampler2D tFlare;
    uniform vec2 uTexel;
    varying vec2 vUv;
    void main() {
      // Four vertical taps: the streak buffer is eight times coarser than the
      // frame, and without this the flare reads as a hard-edged bar.
      vec3 f = texture2D( tFlare, vUv + vec2( 0.0, -1.5 * uTexel.y ) ).rgb * 0.22
             + texture2D( tFlare, vUv + vec2( 0.0, -0.5 * uTexel.y ) ).rgb * 0.28
             + texture2D( tFlare, vUv + vec2( 0.0,  0.5 * uTexel.y ) ).rgb * 0.28
             + texture2D( tFlare, vUv + vec2( 0.0,  1.5 * uTexel.y ) ).rgb * 0.22;
      gl_FragColor = vec4( texture2D( tDiffuse, vUv ).rgb + f, 1.0 );
    }
  `,
};

/**
 * One chain slot that produces an anamorphic streak on very bright sources and,
 * when the quality preset allows it, radial sun shafts. The two expensive
 * stages run on a 1/8-scale bright-pass buffer, so the only full-resolution
 * work is a two-tap composite.
 */
class FlarePass extends Pass {
  constructor(width, height, { godrays = false } = {}) {
    super();
    this.needsSwap = true;
    this.godrays = godrays;
    const opts = { type: THREE.HalfFloatType, depthBuffer: false, stencilBuffer: false, colorSpace: THREE.LinearSRGBColorSpace };
    this.rtA = new THREE.WebGLRenderTarget(1, 1, opts);
    this.rtB = new THREE.WebGLRenderTarget(1, 1, opts);
    this.bright = new THREE.ShaderMaterial({ ...BrightShader, uniforms: THREE.UniformsUtils.clone(BrightShader.uniforms) });
    this.streak = new THREE.ShaderMaterial({ ...StreakShader, uniforms: THREE.UniformsUtils.clone(StreakShader.uniforms) });
    this.composite = new THREE.ShaderMaterial({ ...CompositeShader, uniforms: THREE.UniformsUtils.clone(CompositeShader.uniforms) });
    this.quad = new FullScreenQuad(this.composite);
    this.setSize(width, height);
  }

  setSize(width, height) {
    const w = Math.max(4, Math.floor(width / 8));
    const h = Math.max(4, Math.floor(height / 8));
    this.rtA.setSize(w, h);
    this.rtB.setSize(w, h);
    this.bright.uniforms.uTexel.value.set(1 / Math.max(1, width), 1 / Math.max(1, height));
    this.streak.uniforms.uTexel.value.set(1 / w, 1 / h);
    this.composite.uniforms.uTexel.value.set(1 / w, 1 / h);
  }

  render(renderer, writeBuffer, readBuffer) {
    this.bright.uniforms.tDiffuse.value = readBuffer.texture;
    this.quad.material = this.bright;
    renderer.setRenderTarget(this.rtA);
    this.quad.render(renderer);

    this.streak.uniforms.tDiffuse.value = this.rtA.texture;
    this.quad.material = this.streak;
    renderer.setRenderTarget(this.rtB);
    this.quad.render(renderer);

    this.composite.uniforms.tDiffuse.value = readBuffer.texture;
    this.composite.uniforms.tFlare.value = this.rtB.texture;
    this.quad.material = this.composite;
    if (this.renderToScreen) {
      renderer.setRenderTarget(null);
    } else {
      renderer.setRenderTarget(writeBuffer);
      if (this.clear) renderer.clear();
    }
    this.quad.render(renderer);
  }

  dispose() {
    this.rtA.dispose();
    this.rtB.dispose();
    this.bright.dispose();
    this.streak.dispose();
    this.composite.dispose();
    this.quad.dispose();
  }
}

export class Post {
  constructor(renderer, scene, camera, quality) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.quality = quality;
    this.enabled = true;
    this.scale = 1;
    this.targetScale = 1;
    this.reducedMotion = false;
    this.baseAberration = 0.0016;
    this.baseGrain = 0.028;
    this.sunDir = new THREE.Vector3(0.4, 0.7, 0.55).normalize();
    this._v = new THREE.Vector3();
    this._fwd = new THREE.Vector3();
    this.godrayAmount = 0;

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
      this.bloom = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.45, 0.62, 2.4);
      this.composer.addPass(this.bloom);

      this.flare = new FlarePass(size.x, size.y, { godrays: !!quality.volumetricLight });
      this.composer.addPass(this.flare);
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
    const g = this.grade.uniforms;
    if (this.bloom) {
      this.bloom.strength = tod.bloom;
      this.bloom.threshold = tod.bloomThreshold !== undefined ? tod.bloomThreshold : 2.0;
      this.bloom.radius = tod.label === 'NIGHT' ? 0.72 : 0.55;
    }
    if (this.flare) {
      const s = this.flare.streak.uniforms;
      s.uStreak.value = tod.streak !== undefined ? tod.streak : 0.4;
      s.uStreakTint.value.setHex(tod.label === 'SUNSET' ? 0xffb27a : tod.label === 'NIGHT' ? 0x9fc0ff : 0xcfe0ff);
      this.godrayAmount = this.flare.godrays ? tod.godray || 0 : 0;
      this.flare.bright.uniforms.uThreshold.value = Math.max(0.9, (tod.bloomThreshold || 2) * 1.5);
    }
    g.uExposure.value = 1.0;
    g.uContrast.value = tod.gradeContrast !== undefined ? tod.gradeContrast : 1.1;
    g.uSaturation.value = tod.gradeSaturation !== undefined ? tod.gradeSaturation : 1.12;
    g.uShadowTint.value.setHex(tod.shadowTint !== undefined ? tod.shadowTint : 0x2a3f66);
    g.uShadowStrength.value = tod.shadowStrength !== undefined ? tod.shadowStrength : 0.01;
    g.uHighlightTint.value.setHex(tod.highlightTint !== undefined ? tod.highlightTint : 0xffffff);
    g.uHighlightStrength.value = tod.highlightStrength !== undefined ? tod.highlightStrength : 0.05;
    g.uVignette.value = tod.vignette !== undefined ? tod.vignette : 0.32;
    g.uVignetteStart.value = tod.label === 'NIGHT' ? 0.28 : 0.36;

    this.baseGrain = tod.grain !== undefined ? tod.grain : 0.028;
    this.film.uniforms.uGrain.value = this.reducedMotion ? this.baseGrain * 0.35 : this.baseGrain;

    const e = tod.sunElev;
    const a = tod.sunAzim;
    this.sunDir.set(Math.cos(e) * Math.cos(a), Math.sin(e), Math.cos(e) * Math.sin(a)).normalize();
  }

  setReducedMotion(on) {
    this.reducedMotion = !!on;
    this.grade.uniforms.uAberration.value = on ? 0.0003 : this.baseAberration;
    this.film.uniforms.uGrain.value = on ? this.baseGrain * 0.35 : this.baseGrain;
  }

  setSize(w, h) {
    this.composer.setSize(w, h);
    this.film.uniforms.uResolution.value.set(w, h);
    if (this.bloom) this.bloom.setSize(w, h);
    if (this.flare) this.flare.setSize(w, h);
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

  /** Project the key light so the shaft pass knows where to radiate from. */
  updateSunScreen() {
    const s = this.flare.streak.uniforms;
    if (this.godrayAmount <= 0) {
      s.uGodray.value = 0;
      s.uSunVis.value = 0;
      return;
    }
    this.camera.getWorldDirection(this._fwd);
    const facing = this._fwd.dot(this.sunDir);
    if (facing <= 0.05) {
      s.uGodray.value = 0;
      s.uSunVis.value = 0;
      return;
    }
    this._v.copy(this.camera.position).addScaledVector(this.sunDir, 40000).project(this.camera);
    const x = this._v.x * 0.5 + 0.5;
    const y = this._v.y * 0.5 + 0.5;
    s.uSunUV.value.set(x, y);
    // Fade out as the source leaves the frame so shafts never sweep in from
    // nowhere when the player turns away.
    const edge = Math.max(Math.abs(x - 0.5), Math.abs(y - 0.5));
    const inFrame = THREE.MathUtils.clamp(1 - (edge - 0.5) / 0.45, 0, 1);
    s.uGodray.value = this.godrayAmount;
    s.uSunVis.value = inFrame * THREE.MathUtils.clamp((facing - 0.05) / 0.35, 0, 1);
  }

  render(dt, elapsed) {
    this.film.uniforms.uTime.value = elapsed;
    if (this.flare) this.updateSunScreen();
    this.composer.render(dt);
  }

  dispose() {
    if (this.flare) this.flare.dispose();
    this.composer.dispose();
  }
}
