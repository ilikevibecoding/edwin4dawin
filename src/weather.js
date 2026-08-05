// weather.js — sky dome shader, time-of-day presets, sun/moon lighting, fog, wind.
import * as THREE from 'three';
import { damp, lerp } from './util.js';

const SKY_VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = p.xyww; // pin to far plane
}
`;

const SKY_FRAG = /* glsl */ `
precision highp float;
varying vec3 vDir;
uniform vec3 uSunDir;
uniform vec3 uZenith;
uniform vec3 uHorizon;
uniform vec3 uGroundHaze;
uniform vec3 uSunColor;
uniform float uSunDisc;      // disc sharpness
uniform float uHaloStrength;
uniform float uStars;        // 0..1
uniform float uMoon;         // 0..1 moon visibility
uniform vec3 uMoonDir;
uniform float uCloudAmount;  // 0..1
uniform float uTime;

float hash21(vec2 p) {
  p = fract(p * vec2(234.34, 435.345));
  p += dot(p, p + 34.23);
  return fract(p.x * p.y);
}
float noise2(vec2 p){
  vec2 i = floor(p); vec2 f = fract(p);
  vec2 u = f*f*(3.0-2.0*f);
  return mix(mix(hash21(i), hash21(i+vec2(1,0)), u.x),
             mix(hash21(i+vec2(0,1)), hash21(i+vec2(1,1)), u.x), u.y);
}
float fbm(vec2 p){
  float s = 0.0, a = 0.5;
  for (int i=0;i<5;i++){ s += a*noise2(p); p *= 2.03; a *= 0.5; }
  return s;
}

void main() {
  vec3 dir = normalize(vDir);
  float h = clamp(dir.y, -0.12, 1.0);
  // vertical gradient with haze band at horizon
  float horizonBand = exp(-max(h, 0.0) * 5.5);
  vec3 sky = mix(uZenith, uHorizon, horizonBand);
  sky = mix(sky, uGroundHaze, smoothstep(0.02, -0.12, dir.y));

  // sun
  float sunDot = dot(dir, uSunDir);
  float disc = smoothstep(uSunDisc, uSunDisc + 0.0008, sunDot);
  float halo = pow(clamp(sunDot, 0.0, 1.0), 24.0) * uHaloStrength;
  float wideGlow = pow(clamp(sunDot, 0.0, 1.0), 3.5) * uHaloStrength * 0.28;
  sky += uSunColor * (disc * 3.0 + halo + wideGlow);

  // moon: small crisp disc + faint halo
  if (uMoon > 0.001) {
    float md = dot(dir, uMoonDir);
    float mdisc = smoothstep(0.99985, 0.99993, md);
    float mhalo = pow(clamp(md, 0.0, 1.0), 220.0) * 0.32;
    // simple crater shading
    vec3 mcol = vec3(0.86, 0.88, 0.92);
    sky += (mdisc * mcol * 1.6 + mhalo * vec3(0.45, 0.52, 0.66)) * uMoon;
  }

  // stars (only when uStars > 0), fade near horizon
  if (uStars > 0.001) {
    vec2 sp = dir.xz / (dir.y + 0.32);
    vec2 cell = floor(sp * 240.0);
    float star = step(0.9975, hash21(cell));
    float tw = 0.6 + 0.4 * sin(uTime * (1.5 + hash21(cell + 7.0) * 3.0) + hash21(cell) * 40.0);
    sky += vec3(0.9, 0.95, 1.0) * star * tw * uStars * smoothstep(0.02, 0.28, dir.y) * 1.4;
  }

  // wispy high clouds
  if (uCloudAmount > 0.001 && dir.y > 0.02) {
    vec2 cuv = dir.xz / (dir.y + 0.28);
    float cl = fbm(cuv * 2.6 + vec2(uTime * 0.004, 0.0));
    cl = smoothstep(0.62, 0.85, cl) * uCloudAmount;
    float cGlow = pow(clamp(sunDot, 0.0, 1.0), 3.0);
    vec3 cCol = mix(uHorizon * 1.06, uSunColor * 1.25, cGlow * 0.7);
    sky = mix(sky, cCol, cl * smoothstep(0.02, 0.14, dir.y) * 0.75);
  }

  gl_FragColor = vec4(sky, 1.0);
}
`;

const PRESETS = {
  day: {
    sunElev: 52, sunAz: 35,
    zenith: 0x2e5fae, horizon: 0xbfd2e4, groundHaze: 0xb6c4ce,
    sunColor: 0xfff2dc, sunDisc: 0.99988, halo: 0.9,
    stars: 0, moon: 0, clouds: 0.5,
    sunIntensity: 3.0, hemiSky: 0x9db8d8, hemiGround: 0x8a7a5c, hemiIntensity: 0.85,
    fogColor: 0xbccbdb, fogNear: 1800, fogFar: 14000,
    exposure: 1.0, floodlights: false,
    trailTint: 0xffffff,
  },
  sunset: {
    sunElev: 7, sunAz: 258,
    zenith: 0x2c3a68, horizon: 0xff9a52, groundHaze: 0xc98a68,
    sunColor: 0xffb066, sunDisc: 0.99973, halo: 1.5,
    stars: 0.12, moon: 0, clouds: 0.62,
    sunIntensity: 2.1, hemiSky: 0x8a7ba8, hemiGround: 0x6b4f3c, hemiIntensity: 0.5,
    fogColor: 0xc2856a, fogNear: 1300, fogFar: 10500,
    exposure: 1.05, floodlights: true,
    trailTint: 0xf0b98a,
  },
  night: {
    sunElev: 44, sunAz: 118, // acts as moon light vector
    zenith: 0x060d1a, horizon: 0x142138, groundHaze: 0x101827,
    sunColor: 0x2c405c, sunDisc: 1.1 /* no sun disc */, halo: 0.0,
    stars: 0.85, moon: 1.0, clouds: 0.22,
    sunIntensity: 0.95, hemiSky: 0x2a3a58, hemiGround: 0x141822, hemiIntensity: 0.52,
    fogColor: 0x101a29, fogNear: 900, fogFar: 8200,
    exposure: 1.18, floodlights: true,
    trailTint: 0x4a5468,
  },
};

export function createWeather(ctx) {
  const { scene, renderer } = ctx;

  const uniforms = {
    uSunDir: { value: new THREE.Vector3(0, 1, 0) },
    uZenith: { value: new THREE.Color(PRESETS.day.zenith) },
    uHorizon: { value: new THREE.Color(PRESETS.day.horizon) },
    uGroundHaze: { value: new THREE.Color(PRESETS.day.groundHaze) },
    uSunColor: { value: new THREE.Color(PRESETS.day.sunColor) },
    uSunDisc: { value: PRESETS.day.sunDisc },
    uHaloStrength: { value: PRESETS.day.halo },
    uStars: { value: 0 },
    uMoon: { value: 0 },
    uMoonDir: { value: new THREE.Vector3(0, 1, 0) },
    uCloudAmount: { value: PRESETS.day.clouds },
    uTime: { value: 0 },
  };

  const skyGeo = new THREE.SphereGeometry(1, 48, 24);
  const skyMat = new THREE.ShaderMaterial({
    vertexShader: SKY_VERT,
    fragmentShader: SKY_FRAG,
    uniforms,
    side: THREE.BackSide,
    depthWrite: false,
    depthTest: true,
    fog: false,
  });
  const sky = new THREE.Mesh(skyGeo, skyMat);
  sky.scale.setScalar(20000);
  sky.frustumCulled = false;
  sky.renderOrder = -100;
  scene.add(sky);

  // lights
  const sun = new THREE.DirectionalLight(0xffffff, 3);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 10;
  sun.shadow.camera.far = 900;
  sun.shadow.camera.left = -220;
  sun.shadow.camera.right = 220;
  sun.shadow.camera.top = 220;
  sun.shadow.camera.bottom = -220;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.6;
  scene.add(sun);
  scene.add(sun.target);

  const hemi = new THREE.HemisphereLight(0x9db8d8, 0x8a7a5c, 0.85);
  scene.add(hemi);

  scene.fog = new THREE.Fog(PRESETS.day.fogColor, PRESETS.day.fogNear, PRESETS.day.fogFar);

  // ---- image-based lighting: tiny equirect gradient per preset -> PMREM.
  // Gives metals/gloss real reflections instead of rendering black.
  const envMaps = {};
  {
    const pmrem = new THREE.PMREMGenerator(renderer);
    const cTop = new THREE.Color(), cMid = new THREE.Color(), cBot = new THREE.Color(), cSun = new THREE.Color();
    for (const [key, p] of Object.entries(PRESETS)) {
      const cnv = document.createElement('canvas');
      cnv.width = 128; cnv.height = 64;
      const g2 = cnv.getContext('2d');
      cTop.setHex(p.zenith); cMid.setHex(p.horizon); cBot.setHex(0x8a7a5c).lerp(cMid, 0.35);
      if (key === 'night') cBot.setHex(0x0c0f14);
      const grad = g2.createLinearGradient(0, 0, 0, 64);
      grad.addColorStop(0, '#' + cTop.getHexString());
      grad.addColorStop(0.48, '#' + cMid.getHexString());
      grad.addColorStop(0.55, '#' + cBot.getHexString());
      grad.addColorStop(1, '#' + cBot.clone().multiplyScalar(0.55).getHexString());
      g2.fillStyle = grad;
      g2.fillRect(0, 0, 128, 64);
      // sun/moon hotspot for specular interest
      if (key !== 'night') {
        cSun.setHex(p.sunColor);
        const su = ((p.sunAz % 360) / 360) * 128;
        const sv = ((90 - p.sunElev) / 180) * 64;
        const rg = g2.createRadialGradient(su, sv, 1, su, sv, 16);
        rg.addColorStop(0, 'rgba(255,244,220,0.95)');
        rg.addColorStop(0.3, '#' + cSun.getHexString() + 'aa');
        rg.addColorStop(1, 'rgba(255,255,255,0)');
        g2.fillStyle = rg;
        g2.fillRect(0, 0, 128, 64);
      }
      const tex = new THREE.CanvasTexture(cnv);
      tex.mapping = THREE.EquirectangularReflectionMapping;
      tex.colorSpace = THREE.SRGBColorSpace;
      envMaps[key] = pmrem.fromEquirectangular(tex).texture;
      tex.dispose();
    }
    pmrem.dispose();
  }

  const state = {
    timeOfDay: 'day',
    // interpolation targets
    from: { ...PRESETS.day },
    to: { ...PRESETS.day },
    blend: 1,
    wind: new THREE.Vector3(2.4, 0, 0.8),
    windGustT: 0,
  };

  const _sunDir = new THREE.Vector3();
  const _moonDir = new THREE.Vector3();
  const _cFrom = new THREE.Color();
  const _cTo = new THREE.Color();

  function elevAzToDir(elevDeg, azDeg, out) {
    const el = THREE.MathUtils.degToRad(elevDeg);
    const az = THREE.MathUtils.degToRad(azDeg);
    out.set(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az));
    return out;
  }

  function lerpColor(key, t, target) {
    _cFrom.setHex(typeof state.from[key] === 'number' ? state.from[key] : 0xffffff);
    _cTo.setHex(typeof state.to[key] === 'number' ? state.to[key] : 0xffffff);
    target.copy(_cFrom).lerp(_cTo, t);
    return target;
  }

  function apply(t) {
    const f = state.from, k = state.to;
    lerpColor('zenith', t, uniforms.uZenith.value);
    lerpColor('horizon', t, uniforms.uHorizon.value);
    lerpColor('groundHaze', t, uniforms.uGroundHaze.value);
    lerpColor('sunColor', t, uniforms.uSunColor.value);
    uniforms.uSunDisc.value = lerp(f.sunDisc, k.sunDisc, t);
    uniforms.uHaloStrength.value = lerp(f.halo, k.halo, t);
    uniforms.uStars.value = lerp(f.stars, k.stars, t);
    uniforms.uMoon.value = lerp(f.moon, k.moon, t);
    uniforms.uCloudAmount.value = lerp(f.clouds, k.clouds, t);

    const elev = lerp(f.sunElev, k.sunElev, t);
    const az = lerp(f.sunAz, k.sunAz, t);
    elevAzToDir(elev, az, _sunDir);
    uniforms.uSunDir.value.copy(_sunDir);
    elevAzToDir(48, 122, _moonDir);
    uniforms.uMoonDir.value.copy(_moonDir);

    // at night the "sun" light comes from the moon direction
    const lightDir = k.moon > 0.5 || f.moon > 0.5
      ? _sunDir.clone().lerp(_moonDir, Math.max(f.moon, k.moon)).normalize()
      : _sunDir;
    sun.position.copy(lightDir).multiplyScalar(600);
    sun.target.position.set(0, 0, 0);
    sun.intensity = lerp(f.sunIntensity, k.sunIntensity, t);
    lerpColor('sunColor', t, sun.color);
    if (state.to.timeKey === 'night' || state.timeOfDay === 'night') {
      sun.color.setHex(0x8fa8d8);
    }

    lerpColor('hemiSky', t, hemi.color);
    lerpColor('hemiGround', t, hemi.groundColor);
    hemi.intensity = lerp(f.hemiIntensity, k.hemiIntensity, t);

    lerpColor('fogColor', t, scene.fog.color);
    scene.fog.near = lerp(f.fogNear, k.fogNear, t);
    scene.fog.far = lerp(f.fogFar, k.fogFar, t);

    renderer.toneMappingExposure = lerp(f.exposure, k.exposure, t);

    ctx.world.sunDir.copy(lightDir);
    ctx.world.sunColor = uniforms.uSunColor.value;
    lerpColor('trailTint', t, ctx.world.trailTint);
  }

  const api = {
    sun,
    hemi,
    uniforms,
    get timeOfDay() { return state.timeOfDay; },
    get preset() { return PRESETS[state.timeOfDay]; },
    get floodlightsOn() { return PRESETS[state.timeOfDay].floodlights; },
    setTimeOfDay(t, instant = false) {
      if (!PRESETS[t]) return;
      scene.environment = envMaps[t];
      scene.environmentIntensity = t === 'night' ? 0.3 : 0.55;
      const cur = {};
      const done = state.blend >= 1;
      // capture current values by blending existing from/to
      for (const key of Object.keys(PRESETS.day)) {
        const f = state.from[key], k = state.to[key];
        cur[key] = typeof f === 'number' && typeof k === 'number' && key.match(/^(sun|hemi|fog|exposure|stars|moon|clouds|halo)/i)
          ? lerp(f, k, done ? 1 : state.blend)
          : (done ? k : k); // colors snap to target basis; blend handles visual mix
      }
      state.from = state.blend >= 1 ? { ...state.to } : { ...state.to };
      state.to = { ...PRESETS[t], timeKey: t };
      state.blend = instant ? 1 : 0;
      state.timeOfDay = t;
      apply(state.blend);
      ctx.events.emit('time-of-day', t);
    },
    update(dt) {
      uniforms.uTime.value += dt;
      if (state.blend < 1) {
        state.blend = Math.min(1, state.blend + dt / 2.2);
        apply(state.blend);
      }
      // wind gusts (visual only)
      state.windGustT += dt;
      const gust = 1 + Math.sin(state.windGustT * 0.23) * 0.35 + Math.sin(state.windGustT * 0.71) * 0.18;
      ctx.world.wind.copy(state.wind).multiplyScalar(gust);
    },
  };

  ctx.world.wind = state.wind.clone();
  ctx.world.trailTint = new THREE.Color(0xffffff);
  api.setTimeOfDay('day', true);
  return api;
}
