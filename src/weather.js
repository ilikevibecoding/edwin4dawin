// weather.js — sky dome shader, time-of-day presets, sun/moon lighting, fog, wind.
import * as THREE from 'three';
import { lerp } from './util.js';

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
uniform vec3 uMoonDir;
uniform vec3 uZenith;
uniform vec3 uMid;          // mid-sky stop toward the sun (magenta band at sunset)
uniform vec3 uMidAway;      // mid-sky stop opposite the sun
uniform vec3 uHorizon;      // horizon color toward the sun azimuth
uniform vec3 uHorizonAway;  // horizon color opposite the sun
uniform vec3 uGroundHaze;
uniform vec3 uSunColor;
uniform float uSunSize;     // disc threshold in dot space (1 - size)
uniform float uSunSoft;     // disc edge softness
uniform float uSunBright;
uniform float uHaloStrength;
uniform float uGlowWrap;    // low-sun gold wrap around the sun azimuth
uniform float uStars;       // 0..1
uniform float uMilkyWay;    // 0..1
uniform float uMoon;        // 0..1
uniform float uCloudAmount; // 0..1 coverage
uniform vec3 uCloudLit;
uniform vec3 uCloudShade;
uniform float uCloudUnder;  // warm underlighting (sunset)
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
float fbm3(vec2 p){
  float s = 0.0, a = 0.5;
  for (int i=0;i<3;i++){ s += a*noise2(p); p *= 2.11; a *= 0.5; }
  return s * 1.143; // renormalize to ~0..1
}

void main() {
  vec3 dir = normalize(vDir);
  float y = dir.y;
  float sunDot = dot(dir, uSunDir);
  float sunAmt = clamp(sunDot, 0.0, 1.0);

  // azimuth alignment with the sun: 1 toward sun, 0 opposite
  vec2 dxz = normalize(dir.xz + vec2(1e-4, 0.0));
  vec2 sxz = normalize(uSunDir.xz + vec2(1e-4, 0.0));
  float azAlign = dot(dxz, sxz) * 0.5 + 0.5;

  // ---- vertical gradient: zenith -> mid -> horizon (mid/horizon depend on azimuth)
  vec3 horizonCol = mix(uHorizonAway, uHorizon, pow(azAlign, 2.0));
  vec3 midCol = mix(uMidAway, uMid, pow(azAlign, 1.6));
  vec3 sky = mix(midCol, uZenith, smoothstep(0.10, 0.62, y));
  // double haze layer: one wide soft band, one tight bright band hugging the ground
  float hazeWide = exp(-max(y, 0.0) * 4.5);
  float hazeTight = exp(-max(y, 0.0) * 14.0);
  sky = mix(sky, horizonCol, hazeWide * 0.8);
  sky = mix(sky, mix(uGroundHaze, horizonCol, 0.4), hazeTight * 0.9);
  sky = mix(sky, uGroundHaze, smoothstep(0.015, -0.1, y));

  // low-sun glow wrap: gold spreads along the horizon around the sun azimuth
  float wrap = pow(azAlign, 5.0) * exp(-max(y, 0.0) * 6.5);
  sky += uSunColor * wrap * uGlowWrap * 0.6;

  // ---- sun disc + halo
  float disc = smoothstep(uSunSize - uSunSoft, uSunSize + uSunSoft * 0.35, sunDot);
  float halo = pow(sunAmt, 24.0) * uHaloStrength;
  float wideGlow = pow(sunAmt, 3.5) * uHaloStrength * 0.16;
  sky += uSunColor * (disc * uSunBright + halo + wideGlow);

  float horizonFade = smoothstep(0.03, 0.25, y);

  // ---- stars + milky way
  if (uStars > 0.001) {
    // milky-way plane factor first: it boosts star density/brightness in-band
    float across = dot(dir, vec3(0.5486, 0.2793, -0.7880));
    float along = dot(dir, vec3(0.8205, 0.0, 0.5712));
    float band = exp(-across * across * 40.0) * uMilkyWay;

    // sparse crisp points, varied magnitude, gentle twinkle
    vec2 sp = dir.xz / (abs(dir.x) + max(y, 0.02) + abs(dir.z));
    vec2 g = sp * 148.0;
    vec2 cell = floor(g);
    float hsel = hash21(cell);
    if (hsel > 0.945 - band * 0.03) {
      vec2 jit = vec2(hash21(cell + 1.7), hash21(cell + 9.1)) * 0.5 + 0.25;
      float d = length(fract(g) - jit);
      float mag = pow(hash21(cell + 4.2), 5.0);          // few bright, many dim
      float rad = 0.07 + mag * 0.11;
      float star = smoothstep(rad, rad * 0.2, d) * (0.22 + 1.15 * mag);
      float tw = 1.0 - (0.4 - mag * 0.28) *
        (0.5 + 0.5 * sin(uTime * (1.0 + hash21(cell + 7.0) * 2.6) + hash21(cell) * 39.0));
      vec3 scol = mix(vec3(0.72, 0.82, 1.0), vec3(1.0, 0.9, 0.78), hash21(cell + 2.9));
      sky += scol * star * tw * uStars * horizonFade * (1.0 + band * 0.7);
    }
    // faint stretched-noise glow along the band
    if (band > 0.01) {
      float tex = fbm3(vec2(along * 6.0, across * 11.0) + 4.7);
      float wisp = smoothstep(0.3, 0.85, tex);
      float lane = smoothstep(0.62, 0.8, tex) * 0.5;      // dark dust lane
      float glow = band * (0.35 + 0.9 * wisp) * (1.0 - lane);
      sky += vec3(0.44, 0.52, 0.74) * glow * horizonFade * 0.13;
    }
  }

  // ---- moon: shaded disc with procedural maria/craters + halo
  if (uMoon > 0.001) {
    float md = dot(dir, uMoonDir);
    float mAmt = clamp(md, 0.0, 1.0);
    sky += vec3(0.5, 0.58, 0.78) * (pow(mAmt, 200.0) * 0.16 + pow(mAmt, 10.0) * 0.03) * uMoon;
    if (md > 0.9994) {
      vec3 mt = normalize(cross(uMoonDir, vec3(0.0, 1.0, 0.0)));
      vec3 mb = cross(mt, uMoonDir);
      vec2 muv = vec2(dot(dir, mt), dot(dir, mb)) / 0.024;
      float r2 = dot(muv, muv);
      if (r2 < 1.0) {
        vec3 mn = vec3(muv, sqrt(1.0 - r2));
        float lam = clamp(dot(mn, vec3(-0.4696, 0.2254, 0.8536)), 0.0, 1.0);
        float dk = smoothstep(0.40, 0.80, fbm3(muv * 2.1 + vec2(7.3, 3.1)));
        float albedo = mix(1.04, 0.40, dk) * (0.86 + 0.24 * noise2(muv * 7.5 + 2.7));
        float edge = smoothstep(1.0, 0.86, r2);
        vec3 mcol = vec3(0.99, 0.98, 0.94) * albedo * (0.26 + 0.78 * lam);
        sky = mix(sky, mcol * 1.02, edge * uMoon);
      }
    }
  }

  // ---- clouds: domain-warped fbm, drawn last so they silhouette stars/moon
  if (uCloudAmount > 0.001 && y > 0.015) {
    vec2 cuv = dir.xz / (y + 0.22);
    vec2 drift = vec2(uTime * 0.0055, uTime * 0.0012);
    float w1 = fbm3(cuv * 0.6 + drift * 0.6);
    float w2 = fbm3(cuv * 0.6 + vec2(4.7, 9.3) - drift * 0.35);
    vec2 warp = (vec2(w1, w2) - 0.5) * 1.5;
    float cl = fbm(cuv * 1.8 + warp + drift);
    float cov = mix(0.80, 0.52, uCloudAmount);   // amount moves the coverage threshold
    float dens = smoothstep(cov, cov + 0.2, cl);
    if (dens > 0.003) {
      float core = smoothstep(cov + 0.06, cov + 0.34, cl); // thicker core = shadow tone
      float sunGlow = pow(sunAmt, 5.0);
      vec3 cCol = mix(uCloudLit, uCloudShade, core * 0.9);
      cCol += uSunColor * sunGlow * (1.0 - core) * 1.1;              // sun-facing silver rim
      cCol += uSunColor * uCloudUnder * (0.3 + 0.7 * (1.0 - core));  // warm underlighting
      float fadeH = smoothstep(0.015, 0.11, y);
      sky = mix(sky, cCol, dens * fadeH * min(1.0, uCloudAmount * 2.2) * 0.92);
    }
  }

  gl_FragColor = vec4(sky, 1.0);
}
`;

const PRESETS = {
  day: {
    sunElev: 52, sunAz: 35,
    zenith: 0x26529c, mid: 0x5c88c4, midAway: 0x5480bd, horizon: 0xbcd0e2, horizonAway: 0xafc5da, groundHaze: 0xb9c6cf,
    sunColor: 0xfff3dd, sunSize: 0.99988, sunSoft: 0.0003, sunBright: 3.4, halo: 0.55, glowWrap: 0,
    stars: 0, milkyWay: 0, moon: 0,
    clouds: 0.55, cloudLit: 0xf4f8fc, cloudShade: 0x9fb2c8, cloudUnder: 0,
    lightColor: 0xfff1da, sunIntensity: 3.0,
    hemiSky: 0x9db8d8, hemiGround: 0x8a7a5c, hemiIntensity: 0.85,
    fogColor: 0xc0cfdf, fogNear: 1600, fogFar: 12500,
    exposure: 1.0, floodlights: false,
    trailTint: 0xfdfbf7,
  },
  sunset: {
    sunElev: 9, sunAz: 258,
    zenith: 0x1c2454, mid: 0xa64878, midAway: 0x4f4470, horizon: 0xff8b3d, horizonAway: 0x5e4a7d, groundHaze: 0xd1804f,
    sunColor: 0xffc275, sunSize: 0.9997, sunSoft: 0.00018, sunBright: 1.55, halo: 0.5, glowWrap: 1.0,
    stars: 0.1, milkyWay: 0, moon: 0,
    clouds: 0.6, cloudLit: 0xe89a78, cloudShade: 0x6d5480, cloudUnder: 0.55,
    lightColor: 0xff9c55, sunIntensity: 2.3,
    hemiSky: 0x6a78b8, hemiGround: 0x5f4a44, hemiIntensity: 0.5,
    fogColor: 0xac7f68, fogNear: 1100, fogFar: 10500,
    exposure: 1.05, floodlights: true,
    trailTint: 0xf2b183,
  },
  night: {
    sunElev: 44, sunAz: 118, // acts as moon light vector
    zenith: 0x040814, mid: 0x0a1526, midAway: 0x0a1526, horizon: 0x1a2942, horizonAway: 0x152238, groundHaze: 0x0e1523,
    sunColor: 0x31456b, sunSize: 1.5 /* no sun disc */, sunSoft: 0.001, sunBright: 0, halo: 0, glowWrap: 0,
    stars: 0.9, milkyWay: 0.85, moon: 1.0,
    clouds: 0.18, cloudLit: 0x27314b, cloudShade: 0x070b16, cloudUnder: 0,
    lightColor: 0x8fa8d8, sunIntensity: 0.95,
    hemiSky: 0x26364f, hemiGround: 0x12161f, hemiIntensity: 0.5,
    fogColor: 0x0f1826, fogNear: 750, fogFar: 9000,
    exposure: 1.16, floodlights: true,
    trailTint: 0x556179,
  },
};

const COLOR_KEYS = new Set([
  'zenith', 'mid', 'midAway', 'horizon', 'horizonAway', 'groundHaze', 'sunColor', 'lightColor',
  'cloudLit', 'cloudShade', 'hemiSky', 'hemiGround', 'fogColor', 'trailTint',
]);

export function createWeather(ctx) {
  const { scene, renderer } = ctx;

  const uniforms = {
    uSunDir: { value: new THREE.Vector3(0, 1, 0) },
    uMoonDir: { value: new THREE.Vector3(0, 1, 0) },
    uZenith: { value: new THREE.Color(PRESETS.day.zenith) },
    uMid: { value: new THREE.Color(PRESETS.day.mid) },
    uMidAway: { value: new THREE.Color(PRESETS.day.midAway) },
    uHorizon: { value: new THREE.Color(PRESETS.day.horizon) },
    uHorizonAway: { value: new THREE.Color(PRESETS.day.horizonAway) },
    uGroundHaze: { value: new THREE.Color(PRESETS.day.groundHaze) },
    uSunColor: { value: new THREE.Color(PRESETS.day.sunColor) },
    uSunSize: { value: PRESETS.day.sunSize },
    uSunSoft: { value: PRESETS.day.sunSoft },
    uSunBright: { value: PRESETS.day.sunBright },
    uHaloStrength: { value: PRESETS.day.halo },
    uGlowWrap: { value: 0 },
    uStars: { value: 0 },
    uMilkyWay: { value: 0 },
    uMoon: { value: 0 },
    uCloudAmount: { value: PRESETS.day.clouds },
    uCloudLit: { value: new THREE.Color(PRESETS.day.cloudLit) },
    uCloudShade: { value: new THREE.Color(PRESETS.day.cloudShade) },
    uCloudUnder: { value: 0 },
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
    const cTop = new THREE.Color(), cMid = new THREE.Color(), cHor = new THREE.Color(),
      cBot = new THREE.Color(), cSun = new THREE.Color();
    for (const [key, p] of Object.entries(PRESETS)) {
      const cnv = document.createElement('canvas');
      cnv.width = 128; cnv.height = 64;
      const g2 = cnv.getContext('2d');
      cTop.setHex(p.zenith); cMid.setHex(p.mid); cHor.setHex(p.horizon);
      cBot.setHex(0x8a7a5c).lerp(cHor, 0.35);
      if (key === 'night') cBot.setHex(0x0c0f14);
      const grad = g2.createLinearGradient(0, 0, 0, 64);
      grad.addColorStop(0, '#' + cTop.getHexString());
      grad.addColorStop(0.3, '#' + cMid.getHexString());
      grad.addColorStop(0.48, '#' + cHor.getHexString());
      grad.addColorStop(0.55, '#' + cBot.getHexString());
      grad.addColorStop(1, '#' + cBot.clone().multiplyScalar(0.55).getHexString());
      g2.fillStyle = grad;
      g2.fillRect(0, 0, 128, 64);
      // sun/moon hotspot for specular interest
      cSun.setHex(key === 'night' ? 0x9db6e8 : p.sunColor);
      const az = key === 'night' ? 122 : p.sunAz;
      const elev = key === 'night' ? 48 : p.sunElev;
      const su = ((az % 360) / 360) * 128;
      const sv = ((90 - elev) / 180) * 64;
      const rg = g2.createRadialGradient(su, sv, 1, su, sv, key === 'night' ? 7 : 16);
      rg.addColorStop(0, key === 'night' ? 'rgba(200,216,244,0.5)' : 'rgba(255,244,220,0.95)');
      rg.addColorStop(0.3, '#' + cSun.getHexString() + (key === 'night' ? '44' : 'aa'));
      rg.addColorStop(1, 'rgba(255,255,255,0)');
      g2.fillStyle = rg;
      g2.fillRect(0, 0, 128, 64);
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
  const _lightDir = new THREE.Vector3();
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

  function lerpNum(key, t) {
    return lerp(state.from[key], state.to[key], t);
  }

  function apply(t) {
    lerpColor('zenith', t, uniforms.uZenith.value);
    lerpColor('mid', t, uniforms.uMid.value);
    lerpColor('midAway', t, uniforms.uMidAway.value);
    lerpColor('horizon', t, uniforms.uHorizon.value);
    lerpColor('horizonAway', t, uniforms.uHorizonAway.value);
    lerpColor('groundHaze', t, uniforms.uGroundHaze.value);
    lerpColor('sunColor', t, uniforms.uSunColor.value);
    lerpColor('cloudLit', t, uniforms.uCloudLit.value);
    lerpColor('cloudShade', t, uniforms.uCloudShade.value);
    uniforms.uSunSize.value = lerpNum('sunSize', t);
    uniforms.uSunSoft.value = lerpNum('sunSoft', t);
    uniforms.uSunBright.value = lerpNum('sunBright', t);
    uniforms.uHaloStrength.value = lerpNum('halo', t);
    uniforms.uGlowWrap.value = lerpNum('glowWrap', t);
    uniforms.uStars.value = lerpNum('stars', t);
    uniforms.uMilkyWay.value = lerpNum('milkyWay', t);
    uniforms.uMoon.value = lerpNum('moon', t);
    uniforms.uCloudAmount.value = lerpNum('clouds', t);
    uniforms.uCloudUnder.value = lerpNum('cloudUnder', t);

    const elev = lerpNum('sunElev', t);
    const az = lerpNum('sunAz', t);
    elevAzToDir(elev, az, _sunDir);
    uniforms.uSunDir.value.copy(_sunDir);
    elevAzToDir(48, 122, _moonDir);
    uniforms.uMoonDir.value.copy(_moonDir);

    // at night the "sun" light comes from the moon direction; follow the
    // blended moon amount so shadows swing over smoothly instead of popping
    const moonNow = uniforms.uMoon.value;
    const lightDir = _lightDir.copy(_sunDir).lerp(_moonDir, moonNow).normalize();
    sun.position.copy(lightDir).multiplyScalar(600);
    sun.target.position.set(0, 0, 0);
    sun.intensity = lerpNum('sunIntensity', t);
    lerpColor('lightColor', t, sun.color);

    lerpColor('hemiSky', t, hemi.color);
    lerpColor('hemiGround', t, hemi.groundColor);
    hemi.intensity = lerpNum('hemiIntensity', t);

    lerpColor('fogColor', t, scene.fog.color);
    scene.fog.near = lerpNum('fogNear', t);
    scene.fog.far = lerpNum('fogFar', t);

    renderer.toneMappingExposure = lerpNum('exposure', t);

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
      // snapshot the currently displayed values as the new blend origin so
      // re-targeting mid-transition never pops
      const snap = {};
      const b = state.blend;
      for (const key of Object.keys(PRESETS.day)) {
        const f = state.from[key], k = state.to[key];
        if (typeof f === 'number' && typeof k === 'number') {
          snap[key] = COLOR_KEYS.has(key)
            ? _cFrom.setHex(f).lerp(_cTo.setHex(k), b).getHex()
            : lerp(f, k, b);
        } else {
          snap[key] = k;
        }
      }
      state.from = snap;
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
