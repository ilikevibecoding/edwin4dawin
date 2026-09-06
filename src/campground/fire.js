import * as THREE from 'three';
import { flameAtlas, puffSprite } from './textures.js';

// ---------------------------------------------------------------------------
// Fire. Three GPU-driven particle systems per pit — flame, embers, smoke — plus
// a ground glow, each one instanced billboard quad set whose motion is a
// function of time and a per-particle seed, so update() only advances a
// uniform. Quads rather than gl_Points because a point's size is in pixels and
// capped by the driver, and a flame that is the right size at 1080p is a
// pinprick at 4k and a blob in a 288-pixel capture.
//
// The flames are two things in one draw: a handful of *core* tongues that stand
// on the coals and change shape at 4–8 Hz — that is the fire's silhouette — and
// rising tongues that break off the top and fade to soot. Both sample a 2 x 2
// atlas of shaped flames; the atlas carries heat in RGB so colour ramps from
// white in the core to red at the edge, not from the quad's centre outward.
// The flames blend premultiplied "over" rather than adding, so a tongue in
// front occludes the one behind and the body reads as tongues, not as a sum;
// the embers and the ground glow stay additive.
// ---------------------------------------------------------------------------

const billboardVertex = /* glsl */ `
  uniform float uTime;
  uniform float uScale;
  uniform float uRadius;
  uniform float uHeight;
  uniform vec2 uWind;
  attribute vec3 corner;
  attribute vec4 seed;
  varying vec2 vUv;
  varying float vLife;
  varying float vSeed;
  varying float vFade;

  float hash(float n) { return fract(sin(n) * 43758.5453); }
  // 1-D value noise: smooth, irregular, cheap
  float vnoise(float x) {
    float i = floor(x);
    float f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(hash(i), hash(i + 1.0), f);
  }

  // per-system: returns local offset, and writes size / life / fade; may
  // override the atlas frame and the spin
  vec3 motion(vec4 s, float t, out float size, out float life, out float fade);

  void main() {
    float size;
    float life;
    float fade;
    vec3 off = motion(seed, uTime, size, life, fade);
    vLife = life;
    vSeed = seed.w;
    vFade = fade;
    vec2 uv = corner.xy * 0.5 + 0.5;
    vUv = t_uv(uv, life, seed);
    vec4 mv = modelViewMatrix * vec4(off, 1.0);
    float a = t_spin(life, seed);
    vec2 c = vec2(corner.x * cos(a) - corner.y * sin(a), corner.x * sin(a) + corner.y * cos(a));
    mv.xy += c * size * uScale;
    gl_Position = projectionMatrix * mv;
  }
`;

// Flames: seeds with w < 0.3 are the standing core, the rest rising tongues.
const FLAME_MOTION = /* glsl */ `
  float t_spin(float life, vec4 s) { return 0.0; }
  vec2 t_uv(vec2 uv, float life, vec4 s) {
    // pick an atlas frame; the core cycles frames at 4–8 Hz, a tongue keeps one
    float f;
    if (s.w < 0.3) f = floor(uTime * (4.0 + s.y * 4.0) + s.x * 4.0);
    else f = floor(s.z * 4.0);
    f = mod(f, 4.0);
    // mirror half of them so the lean is not always the same way
    if (s.x > 0.5) uv.x = 1.0 - uv.x;
    return uv * 0.5 + vec2(mod(f, 2.0), floor(f * 0.5)) * 0.5;
  }
  vec3 motion(vec4 s, float t, out float size, out float life, out float fade) {
    // the whole fire leans and gusts with a slow noise
    float lean = (vnoise(t * 1.3 + 3.0) - 0.5) * 0.35 + (vnoise(t * 4.0 + 7.0) - 0.5) * 0.12;
    if (s.w < 0.3) {
      // a standing tongue on the coals: flickers in height at 4–8 Hz, never
      // leaves. The core is the fire's silhouette, so it stands the full bed
      // height and the tongues are spread across the coals rather than bunched
      // on the axis, which is what read as one thin yellow streak from ten
      // metres (round 2).
      float n = vnoise(t * (4.5 + s.y * 3.5) + s.x * 20.0);
      float h = uHeight * (0.5 + s.y * 0.3) * (0.72 + 0.56 * n);
      life = 0.14 + 0.22 * s.z;
      float ang = s.z * 6.2831;
      float r = uRadius * (0.1 + 0.38 * s.x);
      // the sprite fills 85 % of its quad with the base 0.425 quads below centre
      vec3 p = vec3(cos(ang) * r + lean * h * 0.5, h * 0.5 + 0.04, sin(ang) * r + lean * h * 0.2);
      size = h * 1.0;
      // near-opaque: the flame material blends "over", so the core quads do
      // not sum (round 3 ran them at half weight to keep the additive stack
      // off white)
      fade = 0.72 + 0.24 * n;
      return p;
    }
    float speed = 0.55 + s.y * 0.55;
    life = fract(t * speed + s.x);
    float ang = s.z * 6.2831;
    float r = uRadius * (0.1 + s.w * 0.55) * (1.0 - life * 0.6);
    vec3 p = vec3(cos(ang) * r + lean * life * 1.4, 0.3 * uHeight + life * uHeight * (0.85 + s.y * 0.4), sin(ang) * r + lean * life * 0.5);
    p.x += (vnoise(t * 5.0 + s.z * 30.0) - 0.5) * 0.14 * life;
    // a tongue is fat as it leaves the core and gone at the top
    size = uHeight * (0.24 + s.w * 0.16) * sin(clamp(life, 0.0, 1.0) * 3.1416) * (1.0 - life * 0.3);
    fade = 1.0 - smoothstep(0.35, 1.0, life);
    return p;
  }
`;

const EMBER_MOTION = /* glsl */ `
  float t_spin(float life, vec4 s) { return 0.0; }
  vec2 t_uv(vec2 uv, float life, vec4 s) { return uv; }
  vec3 motion(vec4 s, float t, out float size, out float life, out float fade) {
    float speed = 0.16 + s.y * 0.14;
    life = fract(t * speed + s.x);
    float ang = s.z * 6.2831;
    float r = uRadius * 0.45 * s.w;
    float h = 0.3 * uHeight + life * uHeight * (2.2 + s.y * 1.8);
    // spirals out as it rises, then the wind takes it
    float sw = 0.2 + life * 0.7;
    vec2 wind = uWind * h * (0.35 + s.w * 0.3) * life;
    vec3 p = vec3(cos(ang + life * 6.0 + s.x * 3.0) * (r + sw * life) + wind.x + (vnoise(t * 2.0 + s.x * 9.0) - 0.5) * 0.3 * life,
                  h,
                  sin(ang + life * 5.0) * (r + sw * life) + wind.y);
    // 5 cm: a 3 cm ember is under a pixel in a 640-wide frame from the fire ring
    size = 0.055 * (1.0 - life * 0.45);
    // an ember goes bright and dark on its way up, and only some ever leave the fire
    float twinkle = 0.45 + 0.55 * vnoise(t * (9.0 + s.w * 12.0) + s.z * 40.0);
    fade = twinkle * (1.0 - smoothstep(0.55, 1.0, life)) * smoothstep(0.0, 0.05, life) * step(0.35, s.x);
    return p;
  }
`;

const SMOKE_MOTION = /* glsl */ `
  float t_spin(float life, vec4 s) { return s.w * 6.2831 + (s.y - 0.5) * 1.6 * life; }
  vec2 t_uv(vec2 uv, float life, vec4 s) { return uv; }
  vec3 motion(vec4 s, float t, out float size, out float life, out float fade) {
    float speed = 0.06 + s.y * 0.04;
    life = fract(t * speed + s.x);
    float ang = s.z * 6.2831;
    float h = life * uHeight * (3.6 + s.y * 1.6);
    // rises, then the wind takes it: drift grows with height, plus a slow wobble
    vec2 wind = uWind * h * (0.5 + s.w * 0.35);
    float wob = (vnoise(t * 0.7 + s.x * 12.0) - 0.5) * 0.9 * life;
    vec3 p = vec3(cos(ang) * uRadius * 0.35 * s.w + wind.x + wob, h + uHeight * 0.9, sin(ang) * uRadius * 0.35 * s.w + wind.y + wob * 0.5);
    size = uRadius * (0.7 + life * 2.6) * (0.8 + s.w * 0.4);
    fade = smoothstep(0.0, 0.1, life) * (1.0 - smoothstep(0.4, 1.0, life));
    return p;
  }
`;

const flameFragment = /* glsl */ `
  uniform sampler2D uTex;
  uniform float uGain;
  varying vec2 vUv;
  varying float vLife;
  varying float vSeed;
  varying float vFade;
  void main() {
    vec4 s = texture2D(uTex, vUv);
    float heat = s.r;
    // colour by heat: white-yellow core, orange body, dark red edge; a rising
    // tongue cools with life, so its ramp slides toward the red end
    float h = heat * (1.0 - vLife * 0.75);
    // the hottest core is yellow, not white; blue is what tips it to white
    vec3 c = mix(vec3(0.55, 0.06, 0.005), vec3(1.0, 0.42, 0.06), smoothstep(0.08, 0.45, h));
    c = mix(c, vec3(1.0, 0.74, 0.2), smoothstep(0.6, 0.98, h));
    // Premultiplied "over", not additive (round 3's core summed six quads to
    // one yellow mass with tongues only at the top). A tongue's cool edge is
    // thin and its hot centre near-opaque, so the tongues behind show through
    // the edges of the ones in front and the body has tongues inside it.
    // Round 5: the floor was 0.5, which made the cool half of every sprite as
    // present as its core and stacked the quads into a slab; 0.3 with a
    // steeper ramp leaves the edges to the tongue in front.
    float alpha = s.a * vFade * (0.3 + 0.7 * pow(smoothstep(0.05, 0.45, heat), 1.6));
    gl_FragColor = vec4(c * uGain * alpha, alpha);
  }
`;

const emberFragment = /* glsl */ `
  uniform sampler2D uTex;
  uniform float uGain;
  varying vec2 vUv;
  varying float vLife;
  varying float vFade;
  void main() {
    float a = texture2D(uTex, vUv).a;
    vec3 c = mix(vec3(1.0, 0.72, 0.32), vec3(1.0, 0.22, 0.03), smoothstep(0.0, 0.7, vLife));
    float alpha = a * vFade;
    gl_FragColor = vec4(c * uGain * alpha, alpha);
  }
`;

const smokeFragment = /* glsl */ `
  #include <fog_pars_fragment>
  uniform sampler2D uTex;
  uniform vec3 uColor;
  uniform vec3 uLit;
  uniform float uOpacity;
  varying vec2 vUv;
  varying float vLife;
  varying float vFade;
  void main() {
    float a = texture2D(uTex, vUv).a;
    // warm-lit at the base by the fire, cooling to the ambient grey as it climbs
    vec3 c = mix(uLit, uColor, smoothstep(0.0, 0.35, vLife));
    float alpha = a * vFade * uOpacity;
    gl_FragColor = vec4(c, alpha);
    #include <fog_fragment>
  }
`;

// The ground glow: a disc on the dirt round the pit, additive, its edge broken
// by noise so it reads as firelight on uneven ground rather than a spotlight.
const glowVertex = /* glsl */ `
  varying vec2 vP;
  void main() {
    vP = position.xz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const glowFragment = /* glsl */ `
  uniform float uGlow;
  uniform float uTime;
  uniform float uR;
  uniform vec3 uTint;
  varying vec2 vP;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(vec2 x) {
    vec2 i = floor(x);
    vec2 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i), b = hash(i + vec2(1.0, 0.0)), c = hash(i + vec2(0.0, 1.0)), d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }
  void main() {
    float r = length(vP) / uR;
    float n = vnoise(vP * 1.6 + uTime * 0.15) * 0.6 + vnoise(vP * 4.0 - uTime * 0.1) * 0.4;
    float edge = r + (n - 0.5) * 0.35;
    float k = pow(clamp(1.0 - edge, 0.0, 1.0), 2.2);
    // nothing right under the flames: that is the coals' own light
    k *= smoothstep(0.0, 0.18, r);
    vec3 c = uTint * k * uGlow;
    gl_FragColor = vec4(c, k * uGlow);
  }
`;

function makeSystem(count, motion, fragment, uniforms, { blending, depthWrite = false, fog = false, core = 0 } = {}) {
  const geo = new THREE.InstancedBufferGeometry();
  const base = new THREE.PlaneGeometry(1, 1);
  geo.index = base.index;
  geo.setAttribute('position', base.attributes.position);
  geo.setAttribute('corner', base.attributes.position);
  const seeds = new Float32Array(count * 4);
  for (let i = 0; i < count * 4; i++) seeds[i] = Math.random();
  // the first `core` particles are the standing tongues (w < 0.3 in the flame
  // motion), the rest rise: the silhouette does not thin with the tier
  for (let i = 0; i < count && core > 0; i++) seeds[i * 4 + 3] = i < core ? Math.random() * 0.3 : 0.3 + Math.random() * 0.7;
  geo.setAttribute('seed', new THREE.InstancedBufferAttribute(seeds, 4));
  geo.instanceCount = count;
  const vertex = billboardVertex.replace('vec3 motion(vec4 s, float t, out float size, out float life, out float fade);', motion);
  const mat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([fog ? THREE.UniformsLib.fog : {}, uniforms]),
    vertexShader:
      (fog ? '#include <fog_pars_vertex>\n' : '') +
      vertex.replace('gl_Position = projectionMatrix * mv;', 'gl_Position = projectionMatrix * mv;' + (fog ? '\n#ifdef USE_FOG\n vFogDepth = -mv.z;\n#endif' : '')),
    fragmentShader: fragment,
    transparent: true,
    depthWrite,
    blending,
    fog,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  return mesh;
}

/** Irregular flicker: value noise summed at a slow gust and a 4–8 Hz shimmer. */
function flickerAt(t, phase) {
  const h = (n) => {
    const s = Math.sin(n * 12.9898 + phase) * 43758.5453;
    return s - Math.floor(s);
  };
  const vn = (x) => {
    const i = Math.floor(x);
    let f = x - i;
    f = f * f * (3 - 2 * f);
    return h(i) + (h(i + 1) - h(i)) * f;
  };
  return 0.82 + 0.1 * (vn(t * 1.1) - 0.5) * 2 + 0.16 * (vn(t * 6.0 + 17.0) - 0.5) * 2 + 0.06 * (vn(t * 13.0 + 41.0) - 0.5) * 2;
}

/**
 * One fire: flames, embers, smoke, a ground glow and a flickering light.
 * `radius` is the bed radius; the core flames stand about 1.5 heights tall.
 */
export function createFire({ radius = 0.5, height = 1.3, quality = 'high', wind = [0.9, 0.3], light = true } = {}) {
  const group = new THREE.Group();
  group.name = 'fire';
  const tier = quality === 'fast' ? 0.6 : quality === 'ultra' ? 1.6 : 1;
  const flameTex = flameAtlas();
  const smokeTex = puffSprite('smoke');
  const emberTex = puffSprite('flame');

  const shared = {
    uTime: { value: 0 },
    uScale: { value: 1 },
    uRadius: { value: radius },
    uHeight: { value: height },
    uWind: { value: new THREE.Vector2(wind[0], wind[1]) },
    uTex: { value: flameTex },
    uGain: { value: 0.9 },
  };
  // six standing tongues at every tier, plus rising ones by tier
  const coreN = 6;
  const flames = makeSystem(coreN + Math.round(16 * tier), FLAME_MOTION, flameFragment, { ...shared }, { blending: THREE.CustomBlending, core: coreN });
  // premultiplied alpha: src + dst * (1 - srcAlpha); the fragment writes colour
  // already multiplied by alpha
  flames.material.blendEquation = THREE.AddEquation;
  flames.material.blendSrc = THREE.OneFactor;
  flames.material.blendDst = THREE.OneMinusSrcAlphaFactor;
  flames.material.blendSrcAlpha = THREE.OneFactor;
  flames.material.blendDstAlpha = THREE.OneMinusSrcAlphaFactor;
  flames.material.premultipliedAlpha = true;
  flames.name = 'fireFlames';
  const embers = makeSystem(Math.round(30 * tier), EMBER_MOTION, emberFragment, { ...shared, uTex: { value: emberTex }, uGain: { value: 3.0 } }, { blending: THREE.AdditiveBlending });
  embers.name = 'fireEmbers';
  const smoke = makeSystem(
    Math.round(30 * tier),
    SMOKE_MOTION,
    smokeFragment,
    {
      ...shared,
      uTex: { value: smokeTex },
      uColor: { value: new THREE.Color(0x8d8f8c) },
      uLit: { value: new THREE.Color(0xb98a5a) },
      uOpacity: { value: 0.4 },
    },
    { blending: THREE.NormalBlending, fog: true },
  );
  smoke.name = 'fireSmoke';
  smoke.renderOrder = 2;
  flames.renderOrder = 3;
  embers.renderOrder = 4;
  group.add(smoke, flames, embers);

  // ground glow: out to five metres on a 1.15 m pit, so the pool reaches the
  // chairs (2.7 m) and fades past them rather than stopping at their feet
  const glowR = radius * 8;
  const glowGeo = new THREE.CircleGeometry(glowR, 28);
  glowGeo.rotateX(-Math.PI / 2);
  const glowMat = new THREE.ShaderMaterial({
    // The disc is additive, so its own saturation lands on the ground as it
    // is. Round 4's (1.0, 0.68, 0.4) was pale enough that on the light's pool
    // it read as tan; back toward the round-3 amber (1.0, 0.5, 0.16) by half.
    uniforms: { uGlow: { value: 0 }, uTime: { value: 0 }, uR: { value: glowR }, uTint: { value: new THREE.Color(1.0, 0.58, 0.26) } },
    vertexShader: glowVertex,
    fragmentShader: glowFragment,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    polygonOffset: true,
    polygonOffsetFactor: -3,
    polygonOffsetUnits: -3,
  });
  const glow = new THREE.Mesh(glowGeo, glowMat);
  glow.name = 'fireGlow';
  glow.position.y = 0.02;
  glow.renderOrder = 1;
  glow.castShadow = false;
  glow.receiveShadow = false;
  group.add(glow);

  let pointLight = null;
  if (light) {
    // Round 3 opened this to decay 1 / 20 m for reach, and round 4 measured
    // the cost: the light's orange was the only thing on the far corners of the
    // pad (sat 0.55 at Y 0.02, twenty metres from the pit) and the ground at
    // the ring sat at sat 0.72 over a laterite that is already 0.6. So the
    // reach across the frame is carried by the glow disc and the embers, and
    // the light itself is shorter (14 m), steeper (decay 1.6) and a paler
    // amber — firelight on red earth is warm enough without the light being
    // orange too. Round 4's (1.0, 0.72, 0.45) at a ×1.4 peak went too far the
    // other way: the pool at 2–4 m was a tan slab, Y 0.36 at saturation 0.33
    // over a laterite of 0.6 (round 5, §6). (1.0, 0.56, 0.26) is hue 24°, and
    // the peak is back under round 3's (update).
    pointLight = new THREE.PointLight(new THREE.Color(1.0, 0.56, 0.26), 0, 14, 1.6);
    pointLight.position.set(0, 1.15, 0);
    pointLight.name = 'fireLight';
    pointLight.castShadow = false;
    group.add(pointLight);
  }

  const mats = [flames.material, embers.material, smoke.material];
  const phaseSeed = Math.random() * 100;
  let phase = Math.random() * 100;
  let flicker = 1;
  return {
    group,
    light: pointLight,
    /** the current flicker factor, for anything else that glows with this fire */
    get flicker() {
      return flicker;
    },
    /** `night` in 0..1 scales the light; flames are always burning. */
    update(dt, t, { night = 0 } = {}) {
      phase += dt;
      flicker = flickerAt(phase, phaseSeed);
      for (const m of mats) m.uniforms.uTime.value = phase;
      glowMat.uniforms.uTime.value = phase;
      glowMat.uniforms.uGlow.value = (0.1 + 0.3 * night) * flicker;
      if (pointLight) {
        // Round 4 put ×1.4 on round 3's (6 + 20·night) to hold the ground at
        // 8 m under the steeper decay, and the pool at 2–4 m paid for it
        // (Ymed 0.15 → 0.36, round 5). Measured knob by knob on the
        // camp_fire_night pool box: the peak is the lever (×0.71 alone took
        // −0.47 st, the colour −0.16, the glow tint and level under 0.02), so
        // it goes under round 3's rather than back to it; the 8 m box gives up
        // about a third of a stop.
        pointLight.intensity = (5 + 16 * night) * flicker * radius * 2;
        pointLight.position.x = Math.sin(phase * 3.1) * 0.06;
        pointLight.position.z = Math.cos(phase * 2.3) * 0.06;
      }
    },
    setNight(night) {
      // flames read against daylight only if they are hot; at night they are
      // the brightest thing there is. The core blends over rather than adding,
      // so the gain is the tongue's own brightness, not a stack's. 0.7 at
      // night (was 0.85): the flame box's pixels over Y 0.5 were 529, and the
      // tongues alone account for about 90 of them.
      flames.material.uniforms.uGain.value = 1.0 - night * 0.3;
      embers.material.uniforms.uGain.value = 2.4 + night * 1.4;
      // the column is lit amber at its root and, after dark, a grey a little
      // paler than the sky it stands against so it reads as a column at all
      smoke.material.uniforms.uOpacity.value = 0.4 - night * 0.1;
      smoke.material.uniforms.uColor.value.set(night > 0.5 ? 0x4a4c56 : 0x8d8f8c);
      smoke.material.uniforms.uLit.value.set(night > 0.5 ? 0xc07a44 : 0xb98a5a);
    },
    count: flames.geometry.instanceCount + embers.geometry.instanceCount + smoke.geometry.instanceCount,
    calls: 4,
  };
}
