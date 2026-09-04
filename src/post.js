import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { Pass, FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { raysOf, sunDirection } from './sky.js';

// ---------------------------------------------------------------------------
// Post stack, in the order light actually goes through a camera:
//
//   scene (linear HDR) -> ambient occlusion -> screen-space reflections
//   -> firefly guard -> crepuscular rays -> bloom -> ACES + sRGB
//   -> lens grade (heat shimmer, vignette, chromatic aberration, grain) -> SMAA
//
// Bloom runs before tone mapping on purpose: that is what makes a hot
// highlight bloom softly instead of smearing a clipped white blob.
//
// The firefly guard sits after SSR rather than before AO. It is the one pass
// that strips NaN, and a ray march is a far richer source of those than the sky
// shader ever was, so it wants to be downstream of the marcher — AO and SSR
// both read depth and normals rather than colour, so nothing is lost by moving
// it down.
// ---------------------------------------------------------------------------

// Three tiers. `fast` is for the software-rendered capture harness and must
// stay cheap; `high` is roughly what a laptop can hold at 60; `ultra` is where
// the frame budget of a discrete card actually goes.
//
// Sample counts are compile-time in every one of these shaders, so a tier is a
// set of shader permutations, not a runtime dial.
const TIERS = {
  fast: {
    aoSamples: 6,
    pdSamples: 8,
    ssr: null,
    ssrOptIn: { steps: 12, refine: 2, blurTaps: 0, maxDistance: 14, thickness: 0.6 },
    // SMAA stays on at every tier. It is two fixed-cost fullscreen passes and
    // the frame is mostly alpha-tested foliage, so it is the cheapest edge in
    // the stack — and dropping it would change what the harness shows the
    // agents working on the other files.
    smaa: true,
    // Crepuscular rays: depth taps per pixel along the line to the sun. One
    // fullscreen pass, and it only runs in the hours that have rays.
    raySamples: 10,
  },
  high: {
    // 16 AO samples is three's own GTAOPass default, i.e. exactly today's cost.
    aoSamples: 16,
    pdSamples: 8,
    raySamples: 18,
    // No SSR here by default. This tier is what `?quality=` resolves to when it
    // is absent, so it is what the master loop's own capture harness renders,
    // and SSR is not a cheap pass: a second geometry pass over every classified
    // reflector plus a per-pixel march. The brief for this tier is "close to
    // today's cost", and a whole new pass is not that. `?ssr=on` builds the
    // permutation below at any tier, which is how to capture it at `high`.
    ssr: null,
    ssrOptIn: { steps: 16, refine: 3, blurTaps: 0, maxDistance: 18, thickness: 0.55 },
    smaa: true,
  },
  ultra: {
    // 40 steps reaches 30 m, five bisections put the hit inside a couple of
    // centimetres of the surface it found, and the four blur taps stand in for
    // a roughness lobe. The march only runs where a reflector was classified
    // and its Fresnel weight survived: on the hero framing that is 17 per cent
    // of the frame, measured off the reflection-only debug output.
    aoSamples: 32,
    pdSamples: 16,
    ssr: { steps: 40, refine: 5, blurTaps: 4, maxDistance: 30, thickness: 0.5 },
    ssrOptIn: { steps: 40, refine: 5, blurTaps: 4, maxDistance: 30, thickness: 0.5 },
    smaa: true,
    raySamples: 32,
  },
};

/**
 * `?ssr=on` builds the tier's SSR permutation even where the tier does not ship
 * one, `?ssr=off` skips it where it does. The pass is a set of compile-time
 * defines, so this is a boot-time choice and not the runtime `toggle('ssr')` —
 * that one only stops it running, which is the right lever for an A/B of the
 * same build but tells you nothing about what building it costs.
 */
function ssrPaneOff() {
  try {
    return new URLSearchParams(location.search).get('ssrpane') === 'off';
  } catch {
    return false;
  }
}

function ssrOverride() {
  try {
    const v = new URLSearchParams(location.search).get('ssr');
    return v === 'on' ? true : v === 'off' ? false : null;
  } catch {
    return null;
  }
}

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

// ---------------------------------------------------------------------------
// Screen-space reflections.
//
// Every reflection in this scene was analytic before this: a graded fake
// skyline in the paint's specular lobe, a sky gradient in the puddles, a PMREM
// of a sky dome with eighteen dark cards standing in for a forest. None of them
// contain the truck, the trail or the trees, which is exactly what you look for
// in a puddle.
//
// Three decisions shape this implementation, and all three are about not
// spending the budget twice:
//
// 1. **Reflectors are declared, not derived.** SSR is applied only to surfaces
//    that actually mirror — the standing water, the wet ruts, the paint's
//    clearcoat, the glass, the brightwork. Marching a ray for a pixel of bark
//    costs the same as marching one for a pixel of water and returns nothing,
//    and there is no way to read a material's per-pixel roughness back out of
//    an already-shaded frame, so the classification is done on the way in.
//
// 2. **The reflection is mixed in, not added.** These materials already carry
//    an environment reflection from the PMREM; adding a second one on top
//    double-counts it and blows the paint out. Weighting a *replacement* by
//    Fresnel is both closer to what a mirror does and incapable of pushing the
//    frame brighter than it already was.
//
// 3. **A miss keeps what was there.** Rays that leave the screen or run out of
//    march return zero confidence, and the pixel is left exactly as the
//    material shaded it — so the sky, which is almost always off the top of the
//    frame for a horizontal puddle, is still the tuned analytic one.
//
// Depth comes from the G-buffer the AO pass already renders, so the geometry
// cost of this whole feature is one extra pass over the reflectors alone.
// ---------------------------------------------------------------------------

/** Layer the reflector G-buffer pass renders. */
const SSR_LAYER = 20;

// F0 is the reflectance at normal incidence — the number Fresnel interpolates
// away from as the surface turns edge-on. Water at 0.02 is nearly invisible
// head-on and a mirror at eighty degrees, which is exactly how a puddle behaves
// and is why it is worth doing this properly rather than with a constant.
const REFLECTORS = {
  // standing water in the ruts: its own mesh, and the sharpest mirror here
  roadWater: { f0: 0.025, roughness: 0.04, water: 1 },
  // the trail itself. Reflectivity is driven per-vertex off the wetness field
  // the mesh was dished with, so only the wet ruts reflect.
  terrain: { f0: 0.03, roughness: 0.3, wet: 1 },

  glass: { f0: 0.055, roughness: 0.05 },
  glassDark: { f0: 0.055, roughness: 0.1 },
  glassSide: { f0: 0.055, roughness: 0.05 },
  cabinGlass: { f0: 0.05, roughness: 0.05 },
  lensClear: { f0: 0.05, roughness: 0.04 },

  // clearcoat over paint. The base coat is rough and the coat is not, so the
  // reflection belongs to the coat and F0 is the coat's.
  paint: { f0: 0.045, roughness: 0.1 },
  paintDark: { f0: 0.045, roughness: 0.12 },
  paintAccent: { f0: 0.045, roughness: 0.14 },
  paintRoof: { f0: 0.045, roughness: 0.11 },
  trimGloss: { f0: 0.045, roughness: 0.18 },

  // metals: a high F0 and no diffuse under it, so the reflection is most of
  // what they are
  chrome: { f0: 0.62, roughness: 0.16 },
  mirrorGlass: { f0: 0.7, roughness: 0.08 },
  alu: { f0: 0.42, roughness: 0.3 },
  steel: { f0: 0.4, roughness: 0.3 },
  plate: { f0: 0.34, roughness: 0.3 },
};

const reflectVertex = /* glsl */ `
attribute float aWet;
uniform float uWetGate;
varying vec3 vViewNormal;
varying float vWet;
void main() {
  vViewNormal = normalMatrix * normal;
  vWet = aWet * uWetGate;
  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`;

const reflectFragment = /* glsl */ `
uniform sampler2D tDepth;
uniform vec2 uTexel;
uniform float uF0;
uniform float uRoughness;
uniform float uWater;
uniform float uTime;
varying vec3 vViewNormal;
varying float vWet;

void main() {
  // Manual depth test against the scene's own depth.
  //
  // This target has no depth buffer of its own on purpose: half the reflectors
  // here — the water sheet, every pane of glass — do not write depth in the
  // beauty pass either, so a hardware test against a buffer they never wrote
  // would reject them. Comparing against the recorded scene depth instead lets
  // a non-writing surface in front of the recorded one through and rejects
  // anything genuinely behind it.
  float sceneDepth = texture2D( tDepth, gl_FragCoord.xy * uTexel ).x;
  if ( gl_FragCoord.z > sceneDepth + 3e-5 ) discard;

  vec3 n = vViewNormal;
  float len = length( n );
  if ( len < 1e-6 ) discard;
  n /= len;
  // The G-buffer stores only n.xy and reconstructs z as the positive root, so a
  // normal pointing away from the eye would come back flipped. Front faces of a
  // visible surface point at the eye; interpolation across a silhouette can
  // still tip one over, so it is forced rather than left to chance.
  if ( n.z < 0.0 ) n = -n;

  float f0 = uF0;
  float rough = uRoughness;

  if ( uWater > 0.5 ) {
    // A dead flat mirror reads as a hole in the road. A trace of ripple is what
    // makes the reflection sit *on* something.
    vec2 rip = vec2(
      sin( gl_FragCoord.x * 0.06 + uTime * 0.7 ) + sin( gl_FragCoord.y * 0.043 - uTime * 0.53 ),
      sin( gl_FragCoord.y * 0.055 + uTime * 0.61 ) + sin( gl_FragCoord.x * 0.037 + uTime * 0.44 )
    );
    n = normalize( n + vec3( rip * 0.012, 0.0 ) );
  }

  if ( vWet > 0.0 ) {
    // Wetness runs the whole reflector, not just its strength: a damp rut is a
    // broad sheen and standing water is a mirror, and the difference between
    // them is roughness rather than amount.
    float w = clamp( vWet, 0.0, 1.0 );
    float m = smoothstep( 0.28, 0.8, w );
    if ( m < 0.02 ) discard;
    f0 = mix( 0.012, 0.03, m );
    rough = mix( 0.42, 0.1, m );
  }

  gl_FragColor = vec4( n.xy, rough, f0 );
}`;

const ssrFragment = /* glsl */ `
uniform sampler2D tDiffuse;
uniform sampler2D tDepth;
uniform sampler2D tReflect;
uniform sampler2D tReflectDepth;
uniform float uPaneDepth;
uniform mat4 uProj;
uniform mat4 uProjInv;
uniform vec2 uResolution;
uniform float uNear;
uniform float uFar;
uniform float uMaxDistance;
uniform float uThickness;
uniform float uStrength;
uniform float uStepBase;
uniform float uGrow;
uniform float uDebug;
varying vec2 vUv;

/**
 * View-space z from a window-depth sample.
 *
 * The denominator is far + near - ndc * ( far - near ), which for ndc in
 * [ -1, 1 ] is bounded by [ 2 * near, 2 * far ] and therefore never zero. That
 * matters more than the two instructions it saves: a NaN here reaches bloom and
 * takes the whole frame with it.
 */
float viewZ( float d ) {
  float ndc = d * 2.0 - 1.0;
  return -( 2.0 * uNear * uFar ) / ( uFar + uNear - ndc * ( uFar - uNear ) );
}

vec3 viewPos( vec2 uv, float d ) {
  vec4 clip = vec4( uv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0 );
  vec4 v = uProjInv * clip;
  return v.xyz / max( v.w, 1e-8 );
}

/** Per-pixel dither, deterministic in screen space so a still frame is still. */
float igNoise( vec2 p ) {
  return fract( 52.9829189 * fract( dot( p, vec2( 0.06711056, 0.00583715 ) ) ) );
}

void main() {
  vec4 src = texture2D( tDiffuse, vUv );
  vec4 g = texture2D( tReflect, vUv );
  float f0 = g.a;

  if ( uDebug > 0.5 ) {
    if ( uDebug < 1.5 ) { gl_FragColor = vec4( vec3( f0 * 4.0 ), 1.0 ); return; }
    if ( uDebug < 2.5 ) { gl_FragColor = vec4( vec3( g.b ), 1.0 ); return; }
  }

  if ( f0 < 0.004 ) { gl_FragColor = src; return; }

  // the reflector's own surface where it wrote one (a pane in front of the
  // cabin), the scene's depth otherwise
  float depth = min( texture2D( tDepth, vUv ).x, mix( 1.0, texture2D( tReflectDepth, vUv ).x, uPaneDepth ) );
  if ( depth >= 0.999999 ) { gl_FragColor = src; return; }

  vec3 p = viewPos( vUv, depth );
  if ( p.z > -uNear * 0.5 ) { gl_FragColor = src; return; }

  vec3 n = normalize( vec3( g.xy, sqrt( max( 1.0 - dot( g.xy, g.xy ), 0.0 ) ) ) );
  vec3 v = normalize( p );
  float cosNV = clamp( dot( n, -v ), 0.0, 1.0 );
  vec3 r = reflect( v, n );

  float rough = clamp( g.b, 0.0, 1.0 );

  // Schlick. This is the entire reason a puddle is a mirror at ten metres and a
  // pane of muddy water at one.
  float fres = f0 + ( 1.0 - f0 ) * pow( 1.0 - cosNV, 5.0 );
  // A rough surface still reflects the same energy, it just spreads it over a
  // lobe this pass cannot afford to integrate. Rather than draw a sharp
  // reflection on a rough surface — which is the single most obvious way SSR
  // announces itself — the contribution is faded out as the lobe opens.
  float glossy = 1.0 - smoothstep( 0.08, 0.6, rough );
  // and a ray pointing back towards the lens has nothing in front of it to find
  float facing = 1.0 - smoothstep( 0.15, 0.7, r.z );
  float weight = fres * glossy * facing * uStrength;
  if ( weight < 0.004 ) { gl_FragColor = src; return; }

  // March along the reflected ray with a stride that grows geometrically: the
  // first step is centimetres, so a contact reflection lands on the right
  // pixel, and the last is metres, where a metre is a pixel anyway.
  float jitter = igNoise( gl_FragCoord.xy );
  float bias = max( 0.015, abs( p.z ) * 0.0025 );
  vec3 ro = p + n * bias;

  float dt = uStepBase;
  float t = dt * ( 0.35 + jitter * 0.9 );
  float prevT = 0.0;
  bool hit = false;
  vec2 hitUv = vec2( 0.0 );
  float hitT = 0.0;

  for ( int i = 0; i < SSR_STEPS; i ++ ) {
    vec3 q = ro + r * t;
    vec4 clip = uProj * vec4( q, 1.0 );
    if ( clip.w < 1e-4 ) break;
    vec2 uv = ( clip.xy / clip.w ) * 0.5 + 0.5;
    if ( uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0 ) break;

    float sd = texture2D( tDepth, uv ).x;
    // sky, or anything else that never wrote depth: not an occluder, keep going
    if ( sd < 0.999999 ) {
      float delta = viewZ( sd ) - q.z;
      if ( delta > 0.0 && delta < uThickness ) {
        float lo = prevT;
        float hi = t;
        for ( int k = 0; k < SSR_REFINE; k ++ ) {
          float mid = ( lo + hi ) * 0.5;
          vec3 qm = ro + r * mid;
          vec4 cm = uProj * vec4( qm, 1.0 );
          vec2 um = ( cm.xy / max( cm.w, 1e-4 ) ) * 0.5 + 0.5;
          float sm = texture2D( tDepth, clamp( um, 0.0, 1.0 ) ).x;
          if ( sm < 0.999999 && viewZ( sm ) - qm.z > 0.0 ) hi = mid; else lo = mid;
        }
        vec3 qh = ro + r * hi;
        vec4 ch = uProj * vec4( qh, 1.0 );
        hitUv = clamp( ( ch.xy / max( ch.w, 1e-4 ) ) * 0.5 + 0.5, 0.0, 1.0 );
        hitT = hi;
        hit = true;
        break;
      }
    }

    prevT = t;
    t += dt;
    dt *= uGrow;
    if ( t > uMaxDistance ) break;
  }

  if ( !hit ) { gl_FragColor = src; return; }

  vec3 refl = texture2D( tDiffuse, hitUv ).rgb;
  #if SSR_BLUR_TAPS > 0
    // A cheap stand-in for a roughness lobe: four taps on a cross whose radius
    // grows with roughness and with how far the ray travelled, which is the
    // same way a real lobe widens.
    float spread = rough * ( 0.004 + hitT * 0.0016 );
    vec2 e = vec2( spread, 0.0 );
    refl += texture2D( tDiffuse, clamp( hitUv + e.xy, 0.0, 1.0 ) ).rgb;
    refl += texture2D( tDiffuse, clamp( hitUv - e.xy, 0.0, 1.0 ) ).rgb;
    refl += texture2D( tDiffuse, clamp( hitUv + e.yx, 0.0, 1.0 ) ).rgb;
    refl += texture2D( tDiffuse, clamp( hitUv - e.yx, 0.0, 1.0 ) ).rgb;
    refl *= 0.2;
  #endif

  // Confidence. The two honest failures of any screen-space trace are running
  // off the edge of the frame and running out of march, and both have to be
  // faded rather than cut or the reflection ends in a hard line.
  vec2 edge = min( hitUv, 1.0 - hitUv );
  float border = smoothstep( 0.0, 0.14, edge.x ) * smoothstep( 0.0, 0.10, edge.y );
  float reach = 1.0 - smoothstep( uMaxDistance * 0.55, uMaxDistance, hitT );
  float conf = border * reach;

  vec3 outCol = mix( src.rgb, refl, clamp( weight * conf, 0.0, 1.0 ) );

  if ( uDebug > 2.5 ) { gl_FragColor = vec4( refl * conf, 1.0 ); return; }

  // Belt and braces. Everything above is guarded, but a ray march is the single
  // richest source of NaN in a renderer and one NaN pixel here is a black frame
  // once bloom has blurred it across the buffer.
  if ( !( outCol.r == outCol.r ) ) outCol.r = src.r;
  if ( !( outCol.g == outCol.g ) ) outCol.g = src.g;
  if ( !( outCol.b == outCol.b ) ) outCol.b = src.b;

  gl_FragColor = vec4( max( outCol, 0.0 ), src.a );
}`;

const ssrVertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`;

class SsrPass extends Pass {
  constructor(scene, camera, cfg) {
    super();
    this.scene = scene;
    this.camera = camera;
    this.cfg = cfg;
    this.needsSwap = true;
    this.depthTexture = null;
    this.debug = 0;
    this.time = 0;
    this._scanned = false;

    // The reflectors' own depth rides along. The resolve reconstructs the
    // reflecting point from the G-buffer, and the G-buffer has no panes in it
    // (they do not write depth, so `patchGBufferPass` hides them): a windscreen
    // pixel came back as the seat a metre behind the glass, the march started
    // there, and the bonnet in front of the screen was never on the ray. With
    // the pane's depth recorded here the resolve takes the nearer of the two —
    // the pane's own surface where there is one, the G-buffer everywhere else.
    this.reflectRT = new THREE.WebGLRenderTarget(1, 1, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      type: THREE.HalfFloatType,
      depthBuffer: true,
      stencilBuffer: false,
      depthTexture: new THREE.DepthTexture(1, 1),
    });
    this.reflectRT.texture.name = 'SSR.reflectors';
    this.reflectRT.depthTexture.name = 'SSR.reflectorDepth';

    this.reflectMaterial = new THREE.ShaderMaterial({
      name: 'SsrReflectors',
      uniforms: {
        tDepth: { value: null },
        uTexel: { value: new THREE.Vector2(1, 1) },
        uF0: { value: 0.04 },
        uRoughness: { value: 0.2 },
        uWater: { value: 0 },
        uWetGate: { value: 0 },
        uTime: { value: 0 },
      },
      vertexShader: reflectVertex,
      fragmentShader: reflectFragment,
      // the depth test proper is the manual one against the scene's depth in
      // the shader; the hardware test is left always-on so the pass writes
      // the reflector's own depth (a disabled test disables the write too)
      depthTest: true,
      depthFunc: THREE.AlwaysDepth,
      depthWrite: true,
      side: THREE.DoubleSide,
      fog: false,
    });
    // The override material is handed the object being drawn, which is the only
    // hook this pass needs into geometry it does not own: the class is looked
    // up here rather than stored on anybody else's material.
    this.reflectMaterial.onBeforeRender = (renderer, scene, camera, geometry, object) => {
      const c = object.userData.__ssr;
      const u = this.reflectMaterial.uniforms;
      u.uF0.value = c ? c.f0 : 0;
      u.uRoughness.value = c ? c.roughness : 1;
      u.uWater.value = c && c.water ? 1 : 0;
      u.uWetGate.value = c && c.wet ? 1 : 0;
    };

    const material = new THREE.ShaderMaterial({
      name: 'SsrResolve',
      defines: {
        SSR_STEPS: cfg.steps,
        SSR_REFINE: cfg.refine,
        SSR_BLUR_TAPS: cfg.blurTaps,
      },
      uniforms: {
        tDiffuse: { value: null },
        tDepth: { value: null },
        tReflect: { value: this.reflectRT.texture },
        tReflectDepth: { value: this.reflectRT.depthTexture },
        // `?ssrpane=off` resolves from the G-buffer alone, for the A/B
        uPaneDepth: { value: ssrPaneOff() ? 0 : 1 },
        uProj: { value: new THREE.Matrix4() },
        uProjInv: { value: new THREE.Matrix4() },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uNear: { value: 0.1 },
        uFar: { value: 900 },
        uMaxDistance: { value: cfg.maxDistance },
        uThickness: { value: cfg.thickness },
        uStrength: { value: 1 },
        uStepBase: { value: 0.15 },
        uGrow: { value: 1.06 },
        uDebug: { value: 0 },
      },
      vertexShader: ssrVertex,
      fragmentShader: ssrFragment,
      depthTest: false,
      depthWrite: false,
    });
    this.material = material;
    this._quad = new FullScreenQuad(material);

    // The stride grows geometrically, so the base step that makes the march
    // reach exactly maxDistance in `steps` is the sum of the series.
    const grow = 1.06;
    const series = (Math.pow(grow, cfg.steps) - 1) / (grow - 1);
    material.uniforms.uStepBase.value = cfg.maxDistance / series;
    material.uniforms.uGrow.value = grow;
  }

  /**
   * Find the reflective surfaces and put them on their own layer.
   *
   * Classification is by material name against a table, because the alternative
   * — reading `roughness` and `metalness` off the material — is wrong for most
   * of this scene: nearly every surface here carries a roughness map with the
   * scalar left at 1, and the two that matter most take their roughness from an
   * `onBeforeCompile` patch that no property on the material reflects.
   */
  scan() {
    this._scanned = true;
    this.scene.traverse((o) => {
      // Lights are layer-tested too, and three re-keys every material in the
      // scene whenever the light count changes between two renders. Rendering
      // the reflectors under a camera that could not see the lights would flip
      // that count twice a frame and re-derive four hundred program cache keys
      // for a pass that does not shade anything.
      if (o.isLight) {
        o.layers.enable(SSR_LAYER);
        return;
      }
      if (!o.isMesh && !o.isInstancedMesh) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      let best = null;
      for (const m of mats) {
        if (!m) continue;
        const c = REFLECTORS[m.name] || REFLECTORS[o.name];
        if (c && (!best || c.f0 > best.f0)) best = c;
      }
      if (!best) {
        if (o.userData.__ssr) {
          delete o.userData.__ssr;
          o.layers.disable(SSR_LAYER);
        }
        return;
      }
      o.userData.__ssr = best;
      o.layers.enable(SSR_LAYER);
    });
  }

  setSize(width, height) {
    this.reflectRT.setSize(width, height);
    this.material.uniforms.uResolution.value.set(width, height);
    this.reflectMaterial.uniforms.uTexel.value.set(1 / Math.max(width, 1), 1 / Math.max(height, 1));
  }

  dispose() {
    this.reflectRT.dispose();
    this.reflectMaterial.dispose();
    this.material.dispose();
    this._quad.dispose();
  }

  render(renderer, writeBuffer, readBuffer) {
    if (!this.depthTexture) {
      // No G-buffer this frame — the AO pass owns it, so if that is off this
      // one has nothing to march against. Pass the frame through untouched
      // rather than march a stale depth buffer.
      return;
    }
    if (!this._scanned) this.scan();

    const camera = this.camera;
    const scene = this.scene;
    const prevTarget = renderer.getRenderTarget();
    const prevMask = camera.layers.mask;
    const prevOverride = scene.overrideMaterial;
    const prevAutoClear = renderer.autoClear;
    const prevShadowAuto = renderer.shadowMap.autoUpdate;
    const prevClear = renderer.getClearColor(_clearCol);
    const prevAlpha = renderer.getClearAlpha();

    this.reflectMaterial.uniforms.tDepth.value = this.depthTexture;
    this.reflectMaterial.uniforms.uTime.value = this.time;

    // Shadow maps were rendered by the beauty pass at the top of the frame and
    // nothing has moved since. Without this three re-renders every shadow map
    // for each extra scene render, which for a 4096 map is most of the cost of
    // the pass it is being called from.
    renderer.shadowMap.autoUpdate = false;
    renderer.setRenderTarget(this.reflectRT);
    renderer.setClearColor(0x000000, 0);
    renderer.clear(true, true, false);
    renderer.autoClear = false;
    camera.layers.set(SSR_LAYER);
    scene.overrideMaterial = this.reflectMaterial;
    renderer.render(scene, camera);
    scene.overrideMaterial = prevOverride;
    camera.layers.mask = prevMask;
    renderer.autoClear = prevAutoClear;
    renderer.shadowMap.autoUpdate = prevShadowAuto;
    renderer.setClearColor(prevClear, prevAlpha);

    const u = this.material.uniforms;
    u.tDiffuse.value = readBuffer.texture;
    u.tDepth.value = this.depthTexture;
    u.uProj.value.copy(camera.projectionMatrix);
    u.uProjInv.value.copy(camera.projectionMatrixInverse);
    u.uNear.value = camera.near;
    u.uFar.value = camera.far;
    u.uDebug.value = this.debug;

    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    if (this.clear) renderer.clear();
    this._quad.render(renderer);
    renderer.setRenderTarget(prevTarget);
  }
}

const _clearCol = new THREE.Color();

// ---------------------------------------------------------------------------
// Crepuscular rays.
//
// The forest's light shafts were columns of lit air under gaps in a canopy,
// and they were geometry: billboards gated by the shadow map. What a low sun
// does over a plain full of dust is a different thing — the whole sky is the
// source, and what you see is the *shadows* of the acacias and the truck cast
// through the air towards you, radiating from the sun. That is a screen-space
// effect by nature: for every pixel, walk towards the sun's projection and
// count how much of the way is open sky. Where a tree stands between the pixel
// and the sun the count drops, and a dark ray fans out from it.
//
// Depth is the only thing sampled, so the cost is the tier's tap count of
// depth reads per pixel, and the pass is skipped entirely in any hour with the
// gain at zero or with the sun behind the camera. Runs in HDR before bloom, so
// the rays roll off through ACES with everything else rather than being drawn
// on top of the tone-mapped frame.
// ---------------------------------------------------------------------------

const raysFragment = /* glsl */ `
uniform sampler2D tDiffuse;
uniform sampler2D tDepth;
uniform vec4 uSun;
uniform vec2 uAspect;
uniform vec3 uColor;
uniform float uDecay;
uniform float uReach;
uniform float uSpread;
varying vec2 vUv;

float igNoise( vec2 p ) {
  return fract( 52.9829189 * fract( dot( p, vec2( 0.06711056, 0.00583715 ) ) ) );
}

void main() {
  vec4 src = texture2D( tDiffuse, vUv );
  float uGain = uSun.z;
  vec2 toSun = uSun.xy - vUv;
  // radial falloff from the sun, measured in a square frame so it is a circle
  float dist = length( toSun * uAspect );
  float fall = exp( -dist * uSpread );
  if ( fall * uGain < 0.002 ) { gl_FragColor = src; return; }

  // Dithered start, so the tap count does not draw bands.
  float jitter = igNoise( gl_FragCoord.xy );
  vec2 step = toSun * uReach / float( RAY_SAMPLES );
  vec2 uv = vUv + step * jitter;
  float illum = 1.0;
  float acc = 0.0;
  float norm = 0.0;
  for ( int i = 0; i < RAY_SAMPLES; i ++ ) {
    uv += step;
    vec2 cuv = clamp( uv, 0.0, 1.0 );
    float d = texture2D( tDepth, cuv ).x;
    float sky = step( 0.99999, d );
    // outside the frame there is no information; count it as half open
    float inside = step( 0.0, uv.x ) * step( uv.x, 1.0 ) * step( 0.0, uv.y ) * step( uv.y, 1.0 );
    acc += mix( 0.5, sky, inside ) * illum;
    norm += illum;
    illum *= uDecay;
  }
  float open = acc / max( norm, 1e-4 );
  // The pixel's own sky counts too: a ray is brightest on the sky it is drawn
  // over and fades as it lands on the ground in front of you.
  float self = step( 0.99999, texture2D( tDepth, vUv ).x );
  float amt = open * fall * uGain * mix( 0.55, 1.0, self );
  vec3 col = src.rgb + uColor * amt;
  gl_FragColor = vec4( max( col, 0.0 ), src.a );
}`;

class RaysPass extends Pass {
  constructor(camera, samples) {
    super();
    this.camera = camera;
    this.needsSwap = true;
    this.depthTexture = null;
    this.sunDir = new THREE.Vector3(0, 1, 0);
    this.gain = 0;
    this.material = new THREE.ShaderMaterial({
      name: 'CrepuscularRays',
      defines: { RAY_SAMPLES: samples },
      uniforms: {
        tDiffuse: { value: null },
        tDepth: { value: null },
        // xy: the sun's screen position; z: gain after the visibility fade.
        // Packed because all three move with the camera, not the hour, and
        // the round-trip probe reads every scalar uniform as hour state.
        uSun: { value: new THREE.Vector4(0.5, 0.5, 0, 0) },
        uAspect: { value: new THREE.Vector2(1, 1) },
        uColor: { value: new THREE.Color(0xffffff) },
        uDecay: { value: 0.94 },
        uReach: { value: 0.7 },
        uSpread: { value: 1.6 },
      },
      vertexShader: ssrVertex,
      fragmentShader: raysFragment,
      depthTest: false,
      depthWrite: false,
    });
    this._quad = new FullScreenQuad(this.material);
    this._p = new THREE.Vector3();
  }

  setSize(w, h) {
    this.material.uniforms.uAspect.value.set(w / Math.max(h, 1), 1);
  }

  dispose() {
    this.material.dispose();
    this._quad.dispose();
  }

  render(renderer, writeBuffer, readBuffer) {
    const u = this.material.uniforms;
    // The sun's projection. A point far out along the light direction; if it
    // is behind the camera the projection folds back into the frame and is a
    // lie, so the pass stands down, and it fades as the sun leaves the frame
    // rather than cutting.
    const cam = this.camera;
    const p = this._p.copy(this.sunDir).multiplyScalar(2000).add(cam.position);
    p.project(cam);
    const behind = p.z > 1 || !Number.isFinite(p.x) || !Number.isFinite(p.y);
    const off = behind ? 2 : Math.max(Math.abs(p.x), Math.abs(p.y));
    const vis = 1 - THREE.MathUtils.smoothstep(off, 1.0, 1.9);
    const gain = this.gain * vis;
    if (!this.depthTexture || gain < 0.002) {
      // Nothing to draw. The composer swaps after a pass that asks it to, so
      // declining the swap leaves the frame where it is at no cost at all.
      this.needsSwap = false;
      return;
    }
    this.needsSwap = true;
    u.uSun.value.set(p.x * 0.5 + 0.5, p.y * 0.5 + 0.5, gain, 0);
    u.tDiffuse.value = readBuffer.texture;
    u.tDepth.value = this.depthTexture;
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    if (this.clear) renderer.clear();
    this._quad.render(renderer);
  }
}

const GradeShader = {
  name: 'GradeShader',
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uVignette: { value: 0.21 },
    uVignetteSoft: { value: 0.66 },
    uGrain: { value: 0.03 },
    // Unsharp mask at one pixel.
    //
    // Everything in this frame is soft for the same two reasons — SMAA on top
    // of an alpha-tested canopy, and a trail whose detail lives in a normal map
    // sampled at a grazing angle — and neither is fixable in the shading. A
    // one-pixel high-pass costs four taps and puts the edge back on foliage and
    // on the tread without the halo a wider radius would draw. It is applied
    // after tone mapping, so it cannot push anything out of range.
    uSharpen: { value: 0.32 },
    // Pivoted mid-tone contrast. The S-curve below is symmetric about 0.5,
    // which is above where most of this scene sits, so on its own it leaves the
    // 0.15-0.4 band — dirt in shade, bark, the shadow side of the paint — as one
    // undifferentiated mud. This steepens about a lower pivot instead.
    uMidPivot: { value: 0.34 },
    uMidContrast: { value: 0.14 },
    // Highlight shoulder, applied on the brightest channel so hue survives it.
    //
    // ACES hands this shader a headlamp pool already sitting in the top fifth
    // of the range, and every term below that steepens the mid tones adds a
    // little more on top — so the lit facets of the trail all arrive at white
    // together and the tread pattern that is the entire subject of the shot
    // goes with them. Measured on a night `front`: the render clipped 5% of the
    // pool, this grade took it to 9.3% and bloom to 10.4%. The knee spreads
    // that band back out instead of stacking it against the ceiling.
    uKnee: { value: 0.88 },
    uShoulder: { value: 0.5 },
    // Transverse CA, in UV at the frame corner. 0.0016 with a constant floor put
    // about 4.4 px of red-to-blue separation in the corners and 1.4 px dead
    // centre, so every high-contrast edge in the frame carried a visible fringe
    // — ground pixels next to lit foliage were coming back magenta. A real lens
    // is under a pixel, and it is zero on axis.
    uAberration: { value: 0.00055 },
    uLift: { value: new THREE.Vector3(0.02, 0.026, 0.04) },
    uGain: { value: new THREE.Vector3(1.02, 1.0, 0.968) },
    uSaturation: { value: 1.08 },
    // Saturation of the darks, blended up to `uSaturation` through the mid
    // tones. Scotopic vision: the eye's rods see no colour, so a moonlit
    // surface is grey-violet whatever its albedo, while a lamp bright enough
    // to work the cones keeps its colour. Day sets both the same.
    uSatDark: { value: 1.08 },
    // What the darks desaturate *toward*: grey by day, and at night a grey
    // pulled a little toward blue-violet, which is the Purkinje shift — rods
    // peak in the blue-green, so a moonlit scene reads cooler than its
    // spectrum. A hue cannot be moved by mixing toward neutral grey alone.
    uDarkTint: { value: new THREE.Vector3(1, 1, 1) },
    // Weight of an S-curve toward smoothstep rather than a linear slope about
    // mid grey. A linear contrast lift steepens the toe and the shoulder too,
    // which is what was clipping trail highlights in any framing facing the sun.
    uSCurve: { value: 0.2 },
    // Specular highlights on paint and water should go white, not stay tinted.
    uHiDesat: { value: 0.45 },
    uResolution: { value: new THREE.Vector2(1, 1) },
    // Heat shimmer. A refraction, not a blur: the frame is re-sampled through
    // a slowly boiling displacement field a pixel or two across, weighted by
    // how much hot air the ray crossed — it builds with distance along the
    // ground and dies within a few degrees above the horizon, where the air
    // the ray passed through is no longer the layer the sun is cooking.
    tDepth: { value: null },
    uHeat: { value: 0 },
    // x, y: camera near and far; z: where the horizon crosses the frame in
    // uv. Camera state, packed for the same reason as the rays' uSun.
    uHeatView: { value: new THREE.Vector4(0.1, 900, 0.5, 0) },
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
    uniform float uSaturation, uSatDark, uSCurve, uHiDesat, uSharpen, uMidPivot, uMidContrast;
    uniform float uKnee, uShoulder;
    uniform vec3 uLift, uGain, uDarkTint;
    uniform vec2 uResolution;
    uniform sampler2D tDepth;
    uniform float uHeat;
    uniform vec4 uHeatView;
    varying vec2 vUv;

    const vec3 LUMA = vec3( 0.2126, 0.7152, 0.0722 );

    float hash( vec2 p ) {
      p = fract( p * vec2( 443.897, 441.423 ) );
      p += dot( p, p.yx + 19.19 );
      return fract( ( p.x + p.y ) * p.x );
    }

    // Smooth value noise for the shimmer field; the hash above is white and
    // would scramble pixels rather than bend them.
    float vhash( vec2 p ) { return fract( sin( dot( p, vec2( 127.1, 311.7 ) ) ) * 43758.5453123 ); }
    float vnoise( vec2 p ) {
      vec2 i = floor( p ), f = fract( p );
      vec2 u = f * f * ( 3.0 - 2.0 * f );
      return mix( mix( vhash( i ), vhash( i + vec2( 1.0, 0.0 ) ), u.x ),
                  mix( vhash( i + vec2( 0.0, 1.0 ) ), vhash( i + vec2( 1.0, 1.0 ) ), u.x ), u.y );
    }

    void main() {
      vec2 uv = vUv;

      if ( uHeat > 0.0 ) {
        vec2 uNearFar = uHeatView.xy;
        float uHorizon = uHeatView.z;
        float d = texture2D( tDepth, vUv ).x;
        // view distance from window depth; the denominator is bounded away
        // from zero for any depth in [0, 1]
        float ndc = d * 2.0 - 1.0;
        float dist = ( 2.0 * uNearFar.x * uNearFar.y ) / max( uNearFar.y + uNearFar.x - ndc * ( uNearFar.y - uNearFar.x ), 1e-3 );
        float sky = step( 0.99999, d );
        // the ground: builds with the path through the hot layer
        float path = smoothstep( 18.0, 110.0, dist );
        // the sky: only the first degrees over the horizon, which is where a
        // mirage lives — the trees and the skyline wobble, the zenith does not
        float dy = vUv.y - uHorizon;
        float band = exp( -max( dy, 0.0 ) * 26.0 ) * smoothstep( -0.42, -0.04, dy );
        float w = uHeat * mix( path * exp( -max( dy, 0.0 ) * 10.0 ), band, sky );
        vec2 hp = vec2( vUv.x * 46.0 * uResolution.x / uResolution.y, vUv.y * 46.0 - uTime * 1.9 );
        vec2 n = vec2( vnoise( hp ), vnoise( hp + vec2( 17.3, 9.1 ) + uTime * 0.7 ) ) - 0.5;
        n += ( vec2( vnoise( hp * 2.3 + 4.0 ), vnoise( hp * 2.3 + 31.0 ) ) - 0.5 ) * 0.5;
        // about two pixels at full weight, whatever the resolution
        vec2 amp = vec2( 2.4 ) / uResolution;
        uv = clamp( vUv + n * amp * w * 2.0, vec2( 0.001 ), vec2( 0.999 ) );
      }

      vec2 c = uv - 0.5;
      float r2 = dot( c, c );

      // lateral chromatic aberration: zero on axis, sub-pixel at the corners
      vec2 off = c * uAberration * r2 * 4.0;
      vec3 col;
      col.r = texture2D( tDiffuse, uv + off ).r;
      col.g = texture2D( tDiffuse, uv ).g;
      col.b = texture2D( tDiffuse, uv - off ).b;
      col = max( col, 0.0 );

      if ( uSharpen > 0.0 ) {
        vec2 px = 1.0 / uResolution;
        vec3 blur = texture2D( tDiffuse, uv + vec2( px.x, 0.0 ) ).rgb
                  + texture2D( tDiffuse, uv - vec2( px.x, 0.0 ) ).rgb
                  + texture2D( tDiffuse, uv + vec2( 0.0, px.y ) ).rgb
                  + texture2D( tDiffuse, uv - vec2( 0.0, px.y ) ).rgb;
        vec3 hi = col - blur * 0.25;
        // Clamped, so a hot edge cannot ring: an unsharp mask on a specular
        // highlight is how post-sharpening announces itself. The dark half of
        // the kernel is clamped against the pixel's own value as well, or the
        // shadow side of every lit edge is driven to zero.
        vec3 amt = clamp( hi, vec3( -0.14 ), vec3( 0.14 ) ) * uSharpen;
        // Nothing into the top end. The one surface in this scene with enough
        // high-frequency relief for an unsharp mask to bite hard is the trail,
        // and under the headlamps its lit facets are already at the top of the
        // range — sharpening there does not add tread, it pushes the tread into
        // white. Weighted out above the mid tones, where it was never buying
        // anything anyway.
        amt *= 1.0 - smoothstep( vec3( 0.55 ), vec3( 0.9 ), col );
        col = max( col + max( amt, col * -0.5 ), 0.0 );
      }

      // split-toned lift / gain: cool into the shadows, warm into the highlights
      col = col * uGain + uLift * ( 1.0 - col );

      // Mid-tone contrast about a pivot below middle grey, where this scene
      // actually lives.
      //
      // Windowed at *both* ends, which the first version was not. Rolling off
      // only at the top means everything under the pivot is pushed further down
      // in proportion to how far under it already is, so the darkest pixels
      // move the most: a shadow at 0.05 landed at 0.01 and the frame gained a
      // sixteen per cent block of pure black. The lower edge keeps the toe where
      // the tone map put it and confines the extra slope to the band this is
      // actually for — dirt in shade, bark, the shadow side of the paint.
      vec3 midW = smoothstep( vec3( 0.02 ), vec3( 0.20 ), col )
                * ( 1.0 - smoothstep( vec3( 0.55 ), vec3( 1.0 ), col ) );
      col = max( col + ( col - vec3( uMidPivot ) ) * uMidContrast * midW, 0.0 );

      // Shoulder. Run on the peak channel and applied as a scale, so a warm
      // tungsten pool rolls off warm rather than bleaching to neutral on its
      // way to white. Deliberately before the S-curve, whose smoothstep
      // polynomial turns over above one and would fold an over-range pixel
      // back down again.
      float pk = max( max( col.r, col.g ), col.b );
      if ( uShoulder > 0.0 && pk > uKnee ) {
        float head = max( 1.0 - uKnee, 1e-3 );
        float over = pk - uKnee;
        float rolled = uKnee + over / ( 1.0 + over * uShoulder / head );
        col *= rolled / pk;
      }
      col = clamp( col, 0.0, 1.0 );

      // S-curve contrast. smoothstep has zero slope at both ends, so mixing
      // partway toward it steepens the mid tones and cannot clip either end.
      col = mix( col, col * col * ( 3.0 - 2.0 * col ), uSCurve );

      float luma = dot( col, LUMA );
      float dark = 1.0 - smoothstep( 0.06, 0.48, luma );
      float sat = mix( uSaturation, uSatDark, dark );
      vec3 grey = vec3( luma ) * mix( vec3( 1.0 ), uDarkTint, dark );
      col = mix( grey, col, sat );
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

// ---------------------------------------------------------------------------
// Per-hour grade.
//
// Night is not the day grade with the exposure pulled down. Three things have
// to move together or it comes back as a grey photograph: the shadows get a
// *lift*, because the failure mode of a night frame is eighty per cent pure
// black; the bloom threshold drops under the lamps so the emissives are the
// only thing that glows; and saturation goes up rather than down, because the
// eye's own night vision is desaturated and a literally desaturated image
// therefore reads as underexposed rather than as dark.
// ---------------------------------------------------------------------------

const GRADES = {
  day: {
    // Down from the forest's 1.52. A 58-degree sun over straw and pale earth
    // puts twice the light on the ground the canopy floor had, and the frame
    // wants to read as bright without the road going to plaster.
    exposure: 1.02,
    bloom: { strength: 0.2, radius: 0.55, threshold: 1.1 },
    clamp: 14.0,
    // Hard light, hard occlusion: contact shadows under a high sun are short
    // and dark, so the AO is tighter and a little stronger than the dusk one.
    ao: { intensity: 1.0, radius: 0.58, scale: 1.2, distanceExponent: 1.5, thickness: 1.0 },
    ssr: 1.0,
    // Heat shimmer at full; there is no other hour it belongs in.
    heat: 1.0,
    grade: {
      vignette: 0.18,
      vignetteSoft: 0.66,
      grain: 0.028,
      aberration: 0.0005,
      // Warm through and through. The forest split cool into the shadows
      // because its shade was sky-lit under green; savanna shade is lit by red
      // earth from below and blue sky from above, and the earth wins near the
      // ground where the shadows are. So the lift is warm-neutral, and the
      // gain leans a touch amber.
      lift: [0.028, 0.026, 0.03],
      gain: [1.03, 1.005, 0.96],
      saturation: 1.04,
      sCurve: 0.18,
      // Lower than the forest's 0.45: the sky is a third of every frame now
      // and bleaching its top end is what was turning the blue to white.
      hiDesat: 0.3,
      sharpen: 0.3,
      midPivot: 0.36,
      midContrast: 0.12,
      // A lower knee and a firmer shoulder than the forest's. Measured on the
      // round-1 frames: the sun-side sand at the camp gate peaked at 0.91 and
      // the far plain at 0.90, both within a few steps of paper and both
      // brighter than the sky they stand under. This takes the top of the
      // range down to about 0.85 and leaves everything under the knee — the
      // truck, the near ground, the sky — exactly where it was.
      knee: 0.78,
      shoulder: 0.8,
    },
  },
  dusk: {
    exposure: 1.3,
    // A lower threshold than noon so the sun-side haze and the lit seed heads
    // glow a little; the strength is held so the glow is a rim, not a wash.
    bloom: { strength: 0.34, radius: 0.7, threshold: 0.86 },
    clamp: 12.0,
    ao: { intensity: 0.95, radius: 0.68, scale: 1.15, distanceExponent: 1.5, thickness: 1.0 },
    ssr: 1.0,
    heat: 0.3,
    grade: {
      vignette: 0.22,
      vignetteSoft: 0.62,
      grain: 0.032,
      aberration: 0.0007,
      // Warm into the highlights, blue into the shadows: the whole point of
      // this hour is that the two ends of the frame disagree about colour.
      // Blue with the green *kept*: a lift with green under both red and blue
      // put every dark neutral on the magenta axis, and a black tyre once came
      // back at hue 294.
      lift: [0.022, 0.034, 0.046],
      gain: [1.02, 1.0, 0.985],
      // Restrained. The key is oranger than the forest's, the sky is amber and
      // the fog is lit dust — the frame is already one warm hue, and the grade
      // has to buy separation, not pile more of the same on.
      saturation: 1.02,
      sCurve: 0.22,
      hiDesat: 0.4,
      sharpen: 0.3,
      midPivot: 0.3,
      midContrast: 0.16,
      knee: 0.82,
      shoulder: 0.75,
    },
  },
  overcast: {
    exposure: 1.15,
    bloom: { strength: 0.12, radius: 0.5, threshold: 1.4 },
    clamp: 12.0,
    // Soft light is all occlusion: with no key to speak of, the AO is what
    // says where things meet, so it runs wider and at full.
    ao: { intensity: 1.05, radius: 0.8, scale: 1.1, distanceExponent: 1.4, thickness: 1.0 },
    ssr: 0.9,
    heat: 0,
    grade: {
      vignette: 0.16,
      vignetteSoft: 0.7,
      grain: 0.034,
      aberration: 0.0005,
      // Silver: a neutral lift, a fractionally cool gain, and the saturation
      // held under one — the desaturation that says cloud, applied once, here,
      // rather than to every material.
      lift: [0.03, 0.031, 0.033],
      gain: [0.995, 1.0, 1.01],
      saturation: 0.82,
      sCurve: 0.12,
      hiDesat: 0.5,
      sharpen: 0.3,
      midPivot: 0.4,
      midContrast: 0.1,
      knee: 0.9,
      shoulder: 0.4,
    },
  },
  night: {
    // Was 1.8 over a forest floor. Pale earth and straw are three times the
    // albedo, and at the old exposure the moonlit plain read as a grey noon.
    exposure: 1.15,
    // The emissives, and nothing else.
    //
    // This threshold is read against the linear buffer, before exposure, and
    // that is the last place in the chain where the lamp lenses and the pool
    // they throw are still far apart: the lens emissive alone is about 1.0
    // (0x6f6653 at 6.5 — authored against daylight), the glare disc the beam
    // rig lays over it takes the lens to 2.5–3, and the lit trail sits near
    // 1.5. By the time ACES has finished with both they are 0.06 apart and
    // no curve downstream can tell them from each other — so the whole job of
    // making the lamps read as the hot thing in the frame is done here, with a
    // threshold above the pool and enough strength to give them a real halo.
    // It also keeps the star field out, which at 0.42 it was not: bloom over a
    // point-light field turns every star into a glowing ball and the sky fills
    // with what looks like snow.
    bloom: { strength: 0.72, radius: 0.72, threshold: 2.0 },
    clamp: 6.5,
    // A wider, weaker AO. At night almost everything is already dark and a
    // tight hard AO just adds black to black; what is worth having is the
    // contact under the tyres, which is what the trail's own lit pool makes
    // legible in the first place.
    ao: { intensity: 0.82, radius: 0.85, scale: 1.0, distanceExponent: 1.3, thickness: 1.0 },
    // A wet trail at night is mostly reflection — the lamps are the only light
    // there is, and what you see of the road is what it bounces back at you.
    ssr: 1.25,
    heat: 0,
    grade: {
      // Barely any. A night frame is already dark in the corners and a vignette
      // on top of that is how the "eighty per cent black" failure happens.
      vignette: 0.13,
      vignetteSoft: 0.58,
      // more grain, and it reads as film speed rather than as noise
      grain: 0.045,
      aberration: 0.0009,
      // The whole shadow lift. Cool, and enough of it that there is a readable
      // value under the trees rather than a hole. Measured rather than judged:
      // at 0.030/0.040/0.062 the night frames were putting seventeen per cent
      // of their pixels under a luma of 0.02, against about one per cent for
      // the day reference.
      // Nearly neutral, with only a hint of blue left in it.
      //
      // A lift is added as `lift * (1 - col)`, so on a dark pixel it is not a
      // tint on the colour, it *is* the colour — and at night most of the frame
      // is dark pixels. At an R:B of 0.5 this term was setting the floor for
      // the tyres, the bumper, the trail and the foliage alike, which is why
      // they all measured within five degrees of hue 220 no matter what the
      // lights were doing. The mode has a blue sky, blue fog and a blue key
      // already; it does not need the grade to add a fourth.
      lift: [0.04, 0.046, 0.06],
      // Near neutral, on purpose.
      //
      // The cool of a night frame belongs in the *lift*, which is weighted by
      // (1 - col) and therefore acts on the moonlit shadows and leaves the
      // highlights alone. Putting it in the gain instead tints everything by
      // the same ratio, and the one region that must not go blue is the only
      // warm light in the scene: at 1.055 on blue the tungsten pool on the
      // trail bleached to a white sheet on its way up, and a black tyre and
      // dark green paint both landed within a few degrees of hue 220.
      gain: [0.995, 1.0, 1.03],
      // The mid tones and up keep their colour: the fire, the lanterns, the
      // headlamp pool are the warm anchors of the frame. The darks do not.
      // The moonlit ground was measuring hue 2 at 0.43 saturation — the
      // day's laterite red, only darker, because multiplying a saturated
      // albedo by a blue key darkens it without desaturating it. Rod vision
      // does the desaturating, and this is where that lives.
      saturation: 1.05,
      saturationDark: 0.35,
      darkTint: [0.9, 0.95, 1.1],
      // Shallow: a steep curve on an image that lives in the bottom third is
      // exactly what crushes it.
      sCurve: 0.1,
      // Low. Bleaching the top end toward white is right for a sun that really
      // is white; the brightest thing in this frame is a tungsten lamp and it
      // should stay the colour it is.
      hiDesat: 0.34,
      sharpen: 0.26,
      midPivot: 0.2,
      midContrast: 0.2,
      // The headlamp pool lands here, so this is the mode the shoulder is for.
      // Not lower than this, though: a knee at 0.68 with a strength of 1.15
      // caps the frame at 0.83, which takes the lamp lenses and the marker
      // LEDs down with the pool and leaves the shot with no highlight anchor
      // at all. The pool wants rolling off, not the emissives.
      knee: 0.72,
      shoulder: 0.85,
    },
  },
};

function urlTime() {
  try {
    const t = new URLSearchParams(location.search).get('time');
    return GRADES[t] ? t : 'day';
  } catch {
    return 'day';
  }
}

export function createPost(renderer, scene, camera, { quality = 'high', timeOfDay = urlTime() } = {}) {
  const tier = TIERS[quality] || TIERS.high;
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

  // --- ambient occlusion ---------------------------------------------------
  const gtao = new GTAOPass(scene, camera, size.x, size.y);
  gtao.output = GTAOPass.OUTPUT.Default;
  const aoSamples = tier.aoSamples;
  // A tighter radius than the 0.85 this ran at, and more of it. Contact
  // occlusion is what plants a tyre in a rut and puts a line under a panel gap,
  // and at 0.85 m the kernel was wide enough that it read as a general
  // darkening of every cavity instead — the shading equivalent of a soft
  // shadow with no core. The denoiser keeps the same footprint, so the tighter
  // kernel does not come back as noise.
  gtao.updateGtaoMaterial({
    radius: 0.62,
    distanceExponent: 1.5,
    thickness: 1.0,
    scale: 1.15,
    samples: aoSamples,
    distanceFallOff: 1.0,
    screenSpaceRadius: false,
  });
  gtao.updatePdMaterial({
    lumaPhi: 10,
    depthPhi: 2,
    normalPhi: 3.5,
    radius: 4,
    radiusExponent: 1,
    rings: 2,
    samples: tier.pdSamples,
  });
  gtao.blendIntensity = 0.95;
  patchGBufferPass(gtao, renderer, scene);
  composer.addPass(gtao);

  // --- screen-space reflections -------------------------------------------
  const want = ssrOverride();
  const ssrCfg = want === false ? null : want === true ? tier.ssrOptIn : tier.ssr;
  const ssr = ssrCfg ? new SsrPass(scene, camera, ssrCfg) : null;
  let ssrWanted = !!ssr;
  if (ssr) {
    ssr.depthTexture = gtao.depthTexture;
    composer.addPass(ssr);
  }

  const sanitize = new ShaderPass(SanitizeShader);
  composer.addPass(sanitize);

  // --- crepuscular rays ----------------------------------------------------
  const rays = new RaysPass(camera, tier.raySamples);
  rays.depthTexture = gtao.depthTexture;
  rays.setSize(size.x, size.y);
  composer.addPass(rays);

  // --- bloom ---------------------------------------------------------------
  const bloom = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.26, 0.6, 0.92);
  composer.addPass(bloom);

  // --- tone map + colour space --------------------------------------------
  const output = new OutputPass();
  composer.addPass(output);

  // --- lens grade ----------------------------------------------------------
  const grade = new ShaderPass(GradeShader);
  // The composer hands every pass the *device* pixel size, which at a pixel
  // ratio of 2 is twice the size the renderer reports. The grade's unsharp mask
  // and its grain are both measured in pixels, so feeding them the CSS size put
  // a two-pixel kernel and half-frequency grain on every ultra frame.
  grade.setSize = (w, h) => grade.uniforms.uResolution.value.set(w, h);
  grade.uniforms.tDepth.value = gtao.depthTexture;
  grade.uniforms.uHeatView.value.set(camera.near, camera.far, 0.5, 0);
  composer.addPass(grade);

  // --- antialias -----------------------------------------------------------
  const smaa = new SMAAPass();
  smaa.enabled = tier.smaa;
  composer.addPass(smaa);

  function setSize(w, h) {
    // One call. The composer already forwards the device-pixel size to every
    // pass it owns, and calling the passes again by hand with the CSS size is
    // what silently halved the AO and bloom resolution above a pixel ratio of 1.
    composer.setSize(w, h);
  }

  let mode = GRADES[timeOfDay] ? timeOfDay : 'day';

  function setTimeOfDay(name) {
    if (!GRADES[name]) return mode;
    mode = name;
    const g = GRADES[name];
    renderer.toneMappingExposure = g.exposure;
    sanitize.uniforms.uClamp.value = g.clamp;
    bloom.strength = g.bloom.strength;
    bloom.radius = g.bloom.radius;
    bloom.threshold = g.bloom.threshold;
    gtao.blendIntensity = g.ao.intensity;
    gtao.updateGtaoMaterial({
      radius: g.ao.radius,
      distanceExponent: g.ao.distanceExponent,
      thickness: g.ao.thickness,
      scale: g.ao.scale,
      samples: aoSamples,
      distanceFallOff: 1.0,
      screenSpaceRadius: false,
    });
    if (ssr) ssr.material.uniforms.uStrength.value = g.ssr ?? 1;
    const r = raysOf(name);
    rays.gain = r.gain;
    rays.material.uniforms.uColor.value.set(r.color);
    rays.material.uniforms.uSpread.value = r.spread ?? 1.6;
    rays.material.uniforms.uReach.value = r.reach ?? 0.7;
    rays.material.uniforms.uDecay.value = r.decay ?? 0.94;
    rays.sunDir.copy(sunDirection(name));
    const u = grade.uniforms;
    u.uHeat.value = g.heat ?? 0;
    u.uVignette.value = g.grade.vignette;
    u.uVignetteSoft.value = g.grade.vignetteSoft;
    u.uGrain.value = g.grade.grain;
    u.uAberration.value = g.grade.aberration;
    u.uLift.value.set(...g.grade.lift);
    u.uGain.value.set(...g.grade.gain);
    u.uSaturation.value = g.grade.saturation;
    u.uSatDark.value = g.grade.saturationDark ?? g.grade.saturation;
    u.uDarkTint.value.set(...(g.grade.darkTint ?? [1, 1, 1]));
    u.uSCurve.value = g.grade.sCurve;
    u.uHiDesat.value = g.grade.hiDesat;
    u.uSharpen.value = g.grade.sharpen;
    u.uMidPivot.value = g.grade.midPivot;
    u.uMidContrast.value = g.grade.midContrast;
    u.uKnee.value = g.grade.knee;
    u.uShoulder.value = g.grade.shoulder;
    return mode;
  }

  setTimeOfDay(mode);

  const _fwd = new THREE.Vector3();
  const _hz = new THREE.Vector3();

  return {
    composer,
    quality,
    passes: { renderPass, sanitize, gtao, ssr, rays, bloom, output, grade, smaa },
    sceneStats,
    setSize,
    setTimeOfDay,
    get timeOfDay() {
      return mode;
    },
    update(t) {
      grade.uniforms.uTime.value = t;
      if (ssr) ssr.time = t;
    },
    render(dt) {
      // Where the horizon crosses the frame, for the shimmer band: the level
      // direction ahead of the camera, projected. Done here rather than in
      // `update` because the camera can move while the sim is paused — every
      // capture does exactly that — and the band has to follow it. Straight
      // down or up has no level direction, and no horizon either.
      camera.updateMatrixWorld();
      camera.getWorldDirection(_fwd);
      _hz.set(_fwd.x, 0, _fwd.z);
      let horizon = -1;
      if (_hz.lengthSq() >= 1e-4) {
        _hz.normalize().add(camera.position).project(camera);
        if (Number.isFinite(_hz.y)) horizon = THREE.MathUtils.clamp(_hz.y * 0.5 + 0.5, -1, 2);
      }
      grade.uniforms.uHeatView.value.set(camera.near, camera.far, horizon, 0);
      composer.render(dt);
    },
    /** Re-find the reflective surfaces, for anything built after boot. */
    rescanReflectors() {
      if (ssr) ssr.scan();
    },
    /** 0 off, 1 reflector mask, 2 reflector roughness, 3 reflection only. */
    debugSsr(n) {
      if (ssr) ssr.debug = n || 0;
      return ssr ? ssr.debug : -1;
    },
    /** Debug helper: turn individual stages on and off from the console. */
    toggle(name, on) {
      const p = { ao: gtao, bloom, grade, smaa, sanitize, ssr, rays }[name];
      if (name === 'ssr') ssrWanted = !!on;
      if (p) p.enabled = on;
      // SSR marches the G-buffer the AO pass renders, so switching AO off takes
      // the depth buffer with it — and switching AO back on has to give it back,
      // which is why the intent is tracked rather than read off `ssr.enabled`.
      if (name === 'ao' && ssr) ssr.enabled = !!on && ssrWanted;
    },
  };
}

/**
 * Keep things that are not surfaces out of the depth/normal G-buffer.
 *
 * The AO pass renders the whole scene through a single override material, which
 * means every mesh in it writes depth whether or not its own material does. In
 * this scene that is four separate populations of things that are not
 * geometry at all: the sun shafts, the headlamp beam billboards, the stone
 * shadow decals lying a millimetre over the trail, and every pane of glass.
 * Each one was punching an occluder into the buffer — the beams in particular
 * are two metre discs hanging in front of the truck at night.
 *
 * The rule is the one the materials already state: a surface that does not
 * write depth in the beauty pass is not an occluder, and should not be one
 * here. That fixes the AO, and it is what makes the buffer usable for a
 * reflection march at all.
 *
 * The same wrapper freezes shadow-map updates. `renderer.render` is called once
 * per extra scene pass and re-renders every shadow map each time; at 4096 that
 * was three times the shadow cost of the frame for two passes that do not read
 * a shadow.
 */
function patchGBufferPass(gtao, renderer, scene) {
  const inner = gtao.render.bind(gtao);
  const hidden = [];
  gtao.render = (r, writeBuffer, readBuffer, deltaTime, maskActive) => {
    scene.traverse((o) => {
      if (!o.visible || (!o.isMesh && !o.isInstancedMesh)) return;
      const m = o.material;
      const mats = Array.isArray(m) ? m : [m];
      let writes = false;
      for (const mat of mats) if (mat && mat.depthWrite !== false) writes = true;
      if (!writes) {
        o.visible = false;
        hidden.push(o);
      }
    });
    const prevShadowAuto = renderer.shadowMap.autoUpdate;
    renderer.shadowMap.autoUpdate = false;
    try {
      inner(r, writeBuffer, readBuffer, deltaTime, maskActive);
    } finally {
      renderer.shadowMap.autoUpdate = prevShadowAuto;
      for (const o of hidden) o.visible = true;
      hidden.length = 0;
    }
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
