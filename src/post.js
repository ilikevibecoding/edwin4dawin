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
    uniform float uSaturation, uSCurve, uHiDesat, uSharpen, uMidPivot, uMidContrast;
    uniform float uKnee, uShoulder;
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
    exposure: 1.34,
    bloom: { strength: 0.26, radius: 0.6, threshold: 0.92 },
    clamp: 14.0,
    ao: { intensity: 0.95, radius: 0.62, scale: 1.15, distanceExponent: 1.5, thickness: 1.0 },
    grade: {
      vignette: 0.21,
      vignetteSoft: 0.66,
      grain: 0.03,
      aberration: 0.00055,
      lift: [0.022, 0.028, 0.043],
      gain: [1.02, 1.0, 0.968],
      saturation: 1.09,
      sCurve: 0.2,
      hiDesat: 0.45,
      sharpen: 0.32,
      midPivot: 0.34,
      midContrast: 0.14,
      // Barely engaged. Day already clips less than a tenth of a per cent; this
      // is here so a specular on wet rock rolls off rather than stepping.
      knee: 0.88,
      shoulder: 0.5,
    },
  },
  dusk: {
    exposure: 1.62,
    bloom: { strength: 0.38, radius: 0.72, threshold: 0.74 },
    clamp: 12.0,
    ao: { intensity: 1.0, radius: 0.68, scale: 1.2, distanceExponent: 1.5, thickness: 1.0 },
    grade: {
      vignette: 0.24,
      vignetteSoft: 0.62,
      grain: 0.034,
      aberration: 0.0007,
      // warm into the highlights, deep blue into the shadows: the whole point
      // of this hour is that the two ends of the frame disagree about colour
      // Teal rather than violet. A blue lift with the green left behind it puts
      // red and blue above green on everything dark and neutral, and a black
      // tyre came back at hue 294 — the split tone was inventing a magenta the
      // scene does not contain.
      lift: [0.02, 0.038, 0.058],
      gain: [1.02, 1.005, 0.985],
      // 1.16 on top of a key this warm was not "saturated dusk", it was one
      // hue: the paint, the dirt and the bark all landed on the same orange and
      // the frame stopped having materials in it. Back up a little now the key
      // and the fill disagree, because the saturation is buying hue separation
      // rather than piling more of the same hue on.
      saturation: 1.14,
      sCurve: 0.22,
      hiDesat: 0.38,
      sharpen: 0.3,
      midPivot: 0.3,
      midContrast: 0.16,
      knee: 0.82,
      shoulder: 0.75,
    },
  },
  night: {
    exposure: 1.8,
    // The emissives, and nothing else.
    //
    // This threshold is read against the linear buffer, before exposure, and
    // that is the last place in the chain where the lamp lenses and the pool
    // they throw are still far apart: the lenses sit near 6.5 and the lit trail
    // near 1.5. By the time ACES has finished with both they are 0.06 apart and
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
      lift: [0.058, 0.066, 0.084],
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
      saturation: 1.14,
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
  const aoSamples = quality === 'high' ? 16 : 6;
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
  gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3.5, radius: 4, radiusExponent: 1, rings: 2, samples: 8 });
  gtao.blendIntensity = 0.95;
  composer.addPass(gtao);

  // --- bloom ---------------------------------------------------------------
  const bloom = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.26, 0.6, 0.92);
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
    const u = grade.uniforms;
    u.uVignette.value = g.grade.vignette;
    u.uVignetteSoft.value = g.grade.vignetteSoft;
    u.uGrain.value = g.grade.grain;
    u.uAberration.value = g.grade.aberration;
    u.uLift.value.set(...g.grade.lift);
    u.uGain.value.set(...g.grade.gain);
    u.uSaturation.value = g.grade.saturation;
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

  return {
    composer,
    passes: { renderPass, sanitize, gtao, bloom, output, grade, smaa },
    sceneStats,
    setSize,
    setTimeOfDay,
    get timeOfDay() {
      return mode;
    },
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
