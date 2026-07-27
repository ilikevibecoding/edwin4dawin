import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';

// ---------------------------------------------------------------------------
// Post stack, in the order light actually goes through a camera:
//
//   scene (linear HDR) -> ambient occlusion -> bloom -> ACES + sRGB
//   -> lens grade (vignette, chromatic aberration, grain) -> SMAA
//
// Bloom runs before tone mapping on purpose: that is what makes a hot
// highlight bloom softly instead of smearing a clipped white blob.
// ---------------------------------------------------------------------------

/**
 * Firefly guard. The atmospheric scattering in the sky shader can emit NaN and
 * near-infinite pixels around the sun disc; a single one of those spreads
 * through the bloom blur chain and takes the entire frame with it. Clamping the
 * HDR buffer to a sane ceiling first is what a production renderer does anyway,
 * and it gives direct control over how hard the highlights roll off.
 */
const SanitizeShader = {
  name: 'SanitizeShader',
  uniforms: {
    tDiffuse: { value: null },
    uClamp: { value: 14.0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uClamp;
    varying vec2 vUv;
    void main() {
      vec4 t = texture2D( tDiffuse, vUv );
      vec3 c = t.rgb;
      if ( !( c.r == c.r ) ) c.r = 0.0;
      if ( !( c.g == c.g ) ) c.g = 0.0;
      if ( !( c.b == c.b ) ) c.b = 0.0;
      c = clamp( c, vec3( 0.0 ), vec3( uClamp ) );
      gl_FragColor = vec4( c, 1.0 );
    }`,
};

const GradeShader = {
  name: 'GradeShader',
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uVignette: { value: 0.21 },
    uVignetteSoft: { value: 0.66 },
    uGrain: { value: 0.03 },
    // Transverse CA, in UV at the frame corner. 0.0016 with a constant floor put
    // about 4.4 px of red-to-blue separation in the corners and 1.4 px dead
    // centre, so every high-contrast edge in the frame carried a visible fringe
    // — ground pixels next to lit foliage were coming back magenta. A real lens
    // is under a pixel, and it is zero on axis.
    uAberration: { value: 0.00055 },
    uLift: { value: new THREE.Vector3(0.02, 0.026, 0.04) },
    uGain: { value: new THREE.Vector3(1.02, 1.0, 0.968) },
    uSaturation: { value: 1.08 },
    // Weight of an S-curve toward smoothstep rather than a linear slope about
    // mid grey. A linear contrast lift steepens the toe and the shoulder too,
    // which is what was clipping trail highlights in any framing facing the sun.
    uSCurve: { value: 0.2 },
    // Specular highlights on paint and water should go white, not stay tinted.
    uHiDesat: { value: 0.45 },
    uResolution: { value: new THREE.Vector2(1, 1) },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime, uVignette, uVignetteSoft, uGrain, uAberration;
    uniform float uSaturation, uSCurve, uHiDesat;
    uniform vec3 uLift, uGain;
    uniform vec2 uResolution;
    varying vec2 vUv;

    const vec3 LUMA = vec3( 0.2126, 0.7152, 0.0722 );

    float hash( vec2 p ) {
      p = fract( p * vec2( 443.897, 441.423 ) );
      p += dot( p, p.yx + 19.19 );
      return fract( ( p.x + p.y ) * p.x );
    }

    void main() {
      vec2 uv = vUv;
      vec2 c = uv - 0.5;
      float r2 = dot( c, c );

      // lateral chromatic aberration: zero on axis, sub-pixel at the corners
      vec2 off = c * uAberration * r2 * 4.0;
      vec3 col;
      col.r = texture2D( tDiffuse, uv + off ).r;
      col.g = texture2D( tDiffuse, uv ).g;
      col.b = texture2D( tDiffuse, uv - off ).b;
      col = max( col, 0.0 );

      // split-toned lift / gain: cool into the shadows, warm into the highlights
      col = col * uGain + uLift * ( 1.0 - col );

      // S-curve contrast. smoothstep has zero slope at both ends, so mixing
      // partway toward it steepens the mid tones and cannot clip either end.
      col = mix( col, col * col * ( 3.0 - 2.0 * col ), uSCurve );

      float luma = dot( col, LUMA );
      col = mix( vec3( luma ), col, uSaturation );
      // bleach the top end toward white the way a real sensor does
      col = mix( col, vec3( luma ), smoothstep( 0.72, 1.0, luma ) * uHiDesat );

      // vignette: smooth, off-centre-safe, never fully black
      float v = smoothstep( 0.95, uVignetteSoft * 0.35, r2 * 2.0 );
      col *= mix( 1.0 - uVignette, 1.0, v );

      // film grain, scaled down in the highlights like real film
      float g = hash( uv * uResolution + fract( uTime ) * 137.0 ) - 0.5;
      col += g * uGrain * ( 1.0 - smoothstep( 0.25, 1.0, luma ) * 0.7 );

      gl_FragColor = vec4( max( col, 0.0 ), 1.0 );
    }`,
};

export function createPost(renderer, scene, camera, { quality = 'high' } = {}) {
  const size = renderer.getSize(new THREE.Vector2());
  const composer = new EffectComposer(renderer);
  composer.setPixelRatio(renderer.getPixelRatio());
  composer.setSize(size.x, size.y);

  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  // renderer.info is reset by every render call, so once the composer has
  // finished it only describes the last fullscreen quad. Sample it here, where
  // it still describes the scene.
  const sceneStats = { calls: 0, triangles: 0 };
  composer.addPass({
    enabled: true,
    needsSwap: false,
    clear: false,
    renderToScreen: false,
    setSize() {},
    dispose() {},
    render(r) {
      sceneStats.calls = r.info.render.calls;
      sceneStats.triangles = r.info.render.triangles;
    },
  });

  const sanitize = new ShaderPass(SanitizeShader);
  composer.addPass(sanitize);

  // --- ambient occlusion ---------------------------------------------------
  const gtao = new GTAOPass(scene, camera, size.x, size.y);
  gtao.output = GTAOPass.OUTPUT.Default;
  gtao.updateGtaoMaterial({
    radius: 0.85,
    distanceExponent: 1.4,
    thickness: 1.0,
    scale: 1.05,
    samples: quality === 'high' ? 16 : 6,
    distanceFallOff: 1.0,
    screenSpaceRadius: false,
  });
  gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3.5, radius: 4, radiusExponent: 1, rings: 2, samples: 8 });
  gtao.blendIntensity = 0.95;
  composer.addPass(gtao);

  // --- bloom ---------------------------------------------------------------
  const bloom = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.24, 0.58, 1.0);
  composer.addPass(bloom);

  // --- tone map + colour space --------------------------------------------
  const output = new OutputPass();
  composer.addPass(output);

  // --- lens grade ----------------------------------------------------------
  const grade = new ShaderPass(GradeShader);
  grade.uniforms.uResolution.value.set(size.x, size.y);
  composer.addPass(grade);

  // --- antialias -----------------------------------------------------------
  const smaa = new SMAAPass();
  smaa.enabled = quality === 'high';
  composer.addPass(smaa);

  function setSize(w, h) {
    composer.setSize(w, h);
    gtao.setSize(w, h);
    bloom.setSize(w, h);
    grade.uniforms.uResolution.value.set(w, h);
  }

  return {
    composer,
    passes: { renderPass, sanitize, gtao, bloom, output, grade, smaa },
    sceneStats,
    setSize,
    update(t) {
      grade.uniforms.uTime.value = t;
    },
    render(dt) {
      composer.render(dt);
    },
    /** Debug helper: turn individual stages on and off from the console. */
    toggle(name, on) {
      const p = { ao: gtao, bloom, grade, smaa, sanitize }[name];
      if (p) p.enabled = on;
    },
  };
}

export function configureRenderer(renderer) {
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.34;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  return renderer;
}
