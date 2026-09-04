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
// Additive, but with the base kept narrow and the gain modest so the stack of
// quads does not sum to a saturated disc.
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
      // a standing tongue on the coals: flickers in height at 4–8 Hz, never leaves
      float n = vnoise(t * (4.5 + s.y * 3.5) + s.x * 20.0);
      float h = uHeight * (0.4 + s.y * 0.2) * (0.7 + 0.6 * n);
      life = 0.18 + 0.25 * s.z;
      float ang = s.z * 6.2831;
      float r = uRadius * 0.45 * s.x;
      // the sprite fills 85 % of its quad with the base 0.425 quads below centre
      vec3 p = vec3(cos(ang) * r + lean * h * 0.5, h * 0.5 + 0.04, sin(ang) * r + lean * h * 0.2);
      size = h * 1.15;
      fade = 0.75 + 0.45 * n;
      return p;
    }
    float speed = 0.6 + s.y * 0.55;
    life = fract(t * speed + s.x);
    float ang = s.z * 6.2831;
    float r = uRadius * (0.1 + s.w * 0.5) * (1.0 - life * 0.6);
    vec3 p = vec3(cos(ang) * r + lean * life * 1.4, 0.25 * uHeight + life * uHeight * (0.7 + s.y * 0.3), sin(ang) * r + lean * life * 0.5);
    p.x += (vnoise(t * 5.0 + s.z * 30.0) - 0.5) * 0.12 * life;
    // a tongue is fat as it leaves the core and gone at the top
    size = uHeight * (0.2 + s.w * 0.14) * sin(clamp(life, 0.0, 1.0) * 3.1416) * (1.0 - life * 0.3);
    fade = 1.0 - smoothstep(0.4, 1.0, life);
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
    size = 0.028 * (1.0 - life * 0.5);
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
    vec3 c = mix(vec3(0.55, 0.06, 0.005), vec3(1.0, 0.42, 0.06), smoothstep(0.08, 0.45, h));
    c = mix(c, vec3(1.0, 0.78, 0.38), smoothstep(0.6, 0.98, h));
    float alpha = s.a * vFade;
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
    vec3 c = vec3(1.0, 0.5, 0.16) * k * uGlow;
    gl_FragColor = vec4(c, k * uGlow);
  }
`;

function makeSystem(count, motion, fragment, uniforms, { blending, depthWrite = false, fog = false } = {}) {
  const geo = new THREE.InstancedBufferGeometry();
  const base = new THREE.PlaneGeometry(1, 1);
  geo.index = base.index;
  geo.setAttribute('position', base.attributes.position);
  geo.setAttribute('corner', base.attributes.position);
  const seeds = new Float32Array(count * 4);
  for (let i = 0; i < count * 4; i++) seeds[i] = Math.random();
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
  const flames = makeSystem(Math.round(22 * tier), FLAME_MOTION, flameFragment, { ...shared }, { blending: THREE.AdditiveBlending });
  flames.name = 'fireFlames';
  const embers = makeSystem(Math.round(26 * tier), EMBER_MOTION, emberFragment, { ...shared, uTex: { value: emberTex }, uGain: { value: 3.0 } }, { blending: THREE.AdditiveBlending });
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

  // ground glow
  const glowR = radius * 5.5;
  const glowGeo = new THREE.CircleGeometry(glowR, 28);
  glowGeo.rotateX(-Math.PI / 2);
  const glowMat = new THREE.ShaderMaterial({
    uniforms: { uGlow: { value: 0 }, uTime: { value: 0 }, uR: { value: glowR } },
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
    // decay 1.5 rather than 2: a fire's light in a dark camp is read against a
    // near-black ambient, and the physically-steeper curve leaves the chairs
    // blown and the tent front ten metres off unlit
    pointLight = new THREE.PointLight(0xff9448, 0, 24, 1.5);
    pointLight.position.set(0, 1.05, 0);
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
      glowMat.uniforms.uGlow.value = (0.12 + 0.55 * night) * flicker;
      if (pointLight) {
        pointLight.intensity = (7 + 26 * night) * flicker * radius * 2;
        pointLight.position.x = Math.sin(phase * 3.1) * 0.06;
        pointLight.position.z = Math.cos(phase * 2.3) * 0.06;
      }
    },
    setNight(night) {
      // flames read against daylight only if they are hot; at night they are the brightest thing there is
      flames.material.uniforms.uGain.value = 0.9 + night * 0.45;
      embers.material.uniforms.uGain.value = 2.4 + night * 1.2;
      smoke.material.uniforms.uOpacity.value = 0.4 - night * 0.22;
      smoke.material.uniforms.uColor.value.set(night > 0.5 ? 0x2c3140 : 0x8d8f8c);
      smoke.material.uniforms.uLit.value.set(night > 0.5 ? 0xb87040 : 0xb98a5a);
    },
    count: flames.geometry.instanceCount + embers.geometry.instanceCount + smoke.geometry.instanceCount,
    calls: 4,
  };
}
