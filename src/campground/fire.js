import * as THREE from 'three';
import { puffSprite } from './textures.js';

// ---------------------------------------------------------------------------
// Fire. Three GPU-driven particle systems per pit — flame, embers, smoke — each
// one instanced billboard quad set whose motion is a function of time and a
// per-particle seed, so update() only advances a uniform. Quads rather than
// gl_Points because a point's size is in pixels and capped by the driver, and
// a flame that is the right size at 1080p is a pinprick at 4k and a blob in a
// 288-pixel capture.
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

  // per-system: returns local offset, and writes size / life
  vec3 motion(vec4 s, float t, out float size, out float life, out float fade);

  void main() {
    float size;
    float life;
    float fade;
    vec3 off = motion(seed, uTime, size, life, fade);
    vUv = corner.xy * 0.5 + 0.5;
    vLife = life;
    vSeed = seed.w;
    vFade = fade;
    vec4 mv = modelViewMatrix * vec4(off, 1.0);
    // spin each quad by its seed so the sprite's asymmetry is not shared
    float a = seed.w * 6.2831 + t_spin(life, seed);
    vec2 c = vec2(corner.x * cos(a) - corner.y * sin(a), corner.x * sin(a) + corner.y * cos(a));
    mv.xy += c * size * uScale;
    gl_Position = projectionMatrix * mv;
  }
`;

const FLAME_MOTION = /* glsl */ `
  float t_spin(float life, vec4 s) { return (s.x - 0.5) * 1.5 * life; }
  vec3 motion(vec4 s, float t, out float size, out float life, out float fade) {
    float speed = 0.55 + s.y * 0.5;
    life = fract(t * speed + s.x);
    float ang = s.z * 6.2831;
    float r = uRadius * (0.15 + s.w * 0.85) * (1.0 - life * 0.7);
    // gusts: the whole flame leans with a slow noise and each tongue wanders
    float lean = sin(t * 1.7 + s.x * 9.0) * 0.12 + sin(t * 4.3 + s.y * 7.0) * 0.06;
    vec3 p = vec3(cos(ang) * r + lean * life * 1.4, life * uHeight * (0.8 + s.y * 0.4), sin(ang) * r + lean * life * 0.5);
    p.x += sin(t * 6.0 + s.z * 20.0) * 0.04 * life;
    // a tongue is fat a fifth of the way up and gone at the top
    size = uRadius * (0.55 + s.w * 0.5) * sin(clamp(life, 0.0, 1.0) * 3.1416) * (1.0 - life * 0.35);
    fade = 1.0;
    return p;
  }
`;

const EMBER_MOTION = /* glsl */ `
  float t_spin(float life, vec4 s) { return 0.0; }
  vec3 motion(vec4 s, float t, out float size, out float life, out float fade) {
    float speed = 0.22 + s.y * 0.2;
    life = fract(t * speed + s.x);
    float ang = s.z * 6.2831;
    float r = uRadius * 0.5 * s.w;
    float h = life * uHeight * (1.6 + s.y * 1.2);
    // spirals out as it rises, with the flame's lean
    float sw = 0.25 + life * 0.9;
    vec3 p = vec3(cos(ang + life * 5.0 + s.x * 3.0) * (r + sw * life) + sin(t * 1.7 + s.x * 9.0) * 0.12 * life * 2.0,
                  h,
                  sin(ang + life * 4.0) * (r + sw * life));
    size = 0.035 * (1.0 - life * 0.6);
    // flicker: an ember goes bright and dark on its way up
    fade = (0.5 + 0.5 * sin(t * (14.0 + s.w * 20.0) + s.z * 40.0)) * (1.0 - smoothstep(0.7, 1.0, life));
    return p;
  }
`;

const SMOKE_MOTION = /* glsl */ `
  float t_spin(float life, vec4 s) { return (s.y - 0.5) * 2.0 * life; }
  vec3 motion(vec4 s, float t, out float size, out float life, out float fade) {
    float speed = 0.075 + s.y * 0.045;
    life = fract(t * speed + s.x);
    float ang = s.z * 6.2831;
    float h = life * uHeight * (2.6 + s.y * 1.2);
    // rises, then the wind takes it: drift grows with height
    vec2 wind = uWind * h * (0.55 + s.w * 0.3);
    float wob = sin(t * 0.9 + s.x * 12.0) * 0.35 * life;
    vec3 p = vec3(cos(ang) * uRadius * 0.3 * s.w + wind.x + wob, h + uHeight * 0.6, sin(ang) * uRadius * 0.3 * s.w + wind.y);
    size = uRadius * (0.5 + life * 2.6) * (0.8 + s.w * 0.4);
    fade = smoothstep(0.0, 0.12, life) * (1.0 - smoothstep(0.45, 1.0, life));
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
    float a = texture2D(uTex, vUv).a;
    // colour ramps up the tongue: white-yellow at the root, orange, then a dark
    // red that fades out as soot
    vec3 root = vec3(1.0, 0.86, 0.55);
    vec3 mid = vec3(1.0, 0.45, 0.08);
    vec3 tip = vec3(0.55, 0.08, 0.01);
    vec3 c = mix(root, mid, smoothstep(0.05, 0.45, vLife));
    c = mix(c, tip, smoothstep(0.45, 0.95, vLife));
    float alpha = a * (1.0 - smoothstep(0.55, 1.0, vLife)) * smoothstep(0.0, 0.08, vLife);
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
    vec3 c = mix(vec3(1.0, 0.7, 0.3), vec3(1.0, 0.25, 0.03), vLife);
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
    vec3 c = mix(uLit, uColor, smoothstep(0.0, 0.3, vLife));
    float alpha = a * vFade * uOpacity;
    gl_FragColor = vec4(c, alpha);
    #include <fog_fragment>
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
  return mesh;
}

/**
 * One fire: flames, embers, smoke and a flickering light.
 * `radius` is the bed radius; the flames stand about 2.5 radii tall.
 */
export function createFire({ radius = 0.5, height = 1.3, quality = 'high', wind = [0.9, 0.3], light = true } = {}) {
  const group = new THREE.Group();
  group.name = 'fire';
  const tier = quality === 'fast' ? 0.5 : quality === 'ultra' ? 1.8 : 1;
  const flameTex = puffSprite('flame');
  const smokeTex = puffSprite('smoke');

  const shared = {
    uTime: { value: 0 },
    uScale: { value: 1 },
    uRadius: { value: radius },
    uHeight: { value: height },
    uTex: { value: flameTex },
    uGain: { value: 1.6 },
  };
  const flames = makeSystem(Math.round(48 * tier), FLAME_MOTION, flameFragment, { ...shared, uRadius: { value: radius * 0.8 } }, { blending: THREE.AdditiveBlending });
  flames.name = 'fireFlames';
  const embers = makeSystem(Math.round(60 * tier), EMBER_MOTION, emberFragment, { ...shared, uGain: { value: 2.2 } }, { blending: THREE.AdditiveBlending });
  embers.name = 'fireEmbers';
  const smoke = makeSystem(
    Math.round(36 * tier),
    SMOKE_MOTION,
    smokeFragment,
    {
      ...shared,
      uTex: { value: smokeTex },
      uWind: { value: new THREE.Vector2(wind[0], wind[1]) },
      uColor: { value: new THREE.Color(0x8d8f8c) },
      uLit: { value: new THREE.Color(0xb98a5a) },
      uOpacity: { value: 0.22 },
    },
    { blending: THREE.NormalBlending, fog: true },
  );
  smoke.name = 'fireSmoke';
  smoke.renderOrder = 2;
  flames.renderOrder = 3;
  embers.renderOrder = 4;
  group.add(smoke, flames, embers);

  let pointLight = null;
  if (light) {
    pointLight = new THREE.PointLight(0xff8a3a, 0, 16, 1.8);
    pointLight.position.set(0, 0.9, 0);
    pointLight.name = 'fireLight';
    group.add(pointLight);
  }

  const mats = [flames.material, embers.material, smoke.material];
  let phase = Math.random() * 100;
  return {
    group,
    light: pointLight,
    /** `night` in 0..1 scales the light; flames are always burning. */
    update(dt, t, { night = 0 } = {}) {
      phase += dt;
      for (const m of mats) m.uniforms.uTime.value = phase;
      if (pointLight) {
        const flicker = 0.78 + 0.22 * (Math.sin(phase * 11.3) * 0.5 + Math.sin(phase * 17.1 + 1.3) * 0.3 + Math.sin(phase * 5.7) * 0.2);
        pointLight.intensity = (14 + 30 * night) * flicker * radius * 2;
        pointLight.position.x = Math.sin(phase * 3.1) * 0.06;
        pointLight.position.z = Math.cos(phase * 2.3) * 0.06;
      }
    },
    setNight(night) {
      // flames read against daylight only if they are hot; at night they are the brightest thing there is
      flames.material.uniforms.uGain.value = 1.6 + night * 0.6;
      smoke.material.uniforms.uOpacity.value = 0.22 - night * 0.1;
      smoke.material.uniforms.uColor.value.set(night > 0.5 ? 0x2c3140 : 0x8d8f8c);
      smoke.material.uniforms.uLit.value.set(night > 0.5 ? 0x6a4028 : 0xb98a5a);
    },
    count: flames.geometry.instanceCount + embers.geometry.instanceCount + smoke.geometry.instanceCount,
  };
}
