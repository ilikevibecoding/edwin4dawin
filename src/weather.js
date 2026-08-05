import * as THREE from 'three';
import { settings } from './settings.js';
import { Rng } from './util/rng.js';
import { Noise } from './util/noise.js';
import { clamp, saturate, lerp, damp } from './util/mathx.js';
import * as T from './util/textures.js';

/**
 * Sky, sun, moon, stars, cloud decks, fog and the lighting rig.
 *
 * Three time-of-day presets drive everything: `day`, `sunset` and `night`.
 * Switching a preset cross-fades colours and rebuilds the environment map so
 * every PBR surface on the base reacts to the new lighting.
 */

export const SKY_DOME_RADIUS = 45000;

const SKY_VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = position;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  gl_Position.z = gl_Position.w; // keep the dome pinned at the far plane
}
`;

const SKY_FRAG = /* glsl */ `
precision highp float;
varying vec3 vDir;

uniform vec3  uZenith;
uniform vec3  uHorizon;
uniform vec3  uGround;
uniform vec3  uSunDir;
uniform vec3  uSunColor;
uniform float uSunSize;
uniform float uSunIntensity;
uniform vec3  uMoonDir;
uniform float uMoonIntensity;
uniform float uNight;
uniform float uHaze;
uniform float uTime;
uniform float uGalaxy;

float hash(vec3 p) {
  p = fract(p * 0.3183099 + vec3(0.71, 0.113, 0.419));
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float valueNoise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float n000 = hash(i + vec3(0.0, 0.0, 0.0));
  float n100 = hash(i + vec3(1.0, 0.0, 0.0));
  float n010 = hash(i + vec3(0.0, 1.0, 0.0));
  float n110 = hash(i + vec3(1.0, 1.0, 0.0));
  float n001 = hash(i + vec3(0.0, 0.0, 1.0));
  float n101 = hash(i + vec3(1.0, 0.0, 1.0));
  float n011 = hash(i + vec3(0.0, 1.0, 1.0));
  float n111 = hash(i + vec3(1.0, 1.0, 1.0));
  return mix(
    mix(mix(n000, n100, f.x), mix(n010, n110, f.x), f.y),
    mix(mix(n001, n101, f.x), mix(n011, n111, f.x), f.y),
    f.z);
}

float fbm(vec3 p) {
  float s = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    s += a * valueNoise(p);
    p *= 2.03;
    a *= 0.5;
  }
  return s;
}

void main() {
  vec3 dir = normalize(vDir);
  float h = dir.y;

  // Vertical gradient. The exponent keeps the horizon band tight and the
  // zenith broad, which is what reads as "real sky".
  float t = pow(clamp(1.0 - max(h, 0.0), 0.0, 1.0), 3.4);
  vec3 col = mix(uZenith, uHorizon, t);

  // Extra haze right at the horizon (dust, distance).
  float hazeBand = pow(clamp(1.0 - abs(h) * 5.5, 0.0, 1.0), 2.0);
  col = mix(col, uHorizon * 1.06, hazeBand * uHaze);

  // Ground hemisphere fades to a dusty bounce colour.
  col = mix(col, uGround, clamp(-h * 4.0, 0.0, 1.0));

  float sunDot = max(dot(dir, uSunDir), 0.0);

  // Forward (Mie) scattering halo around the sun.
  float mie = pow(sunDot, 18.0) * 0.55 + pow(sunDot, 4.0) * 0.16;
  col += uSunColor * mie * uSunIntensity * (0.55 + uHaze * 0.9);

  // Sun disc with a soft limb.
  float disc = smoothstep(uSunSize, uSunSize * 0.55, acos(clamp(sunDot, -1.0, 1.0)));
  col += uSunColor * disc * uSunIntensity * 9.0;

  // Night sky: a faint galactic band plus fine star dust. Discrete bright
  // stars are drawn as real points elsewhere; this fills the gaps.
  if (uNight > 0.001) {
    vec3 sp = dir * 260.0;
    float stars = pow(max(hash(floor(sp)) - 0.982, 0.0) * 55.0, 2.0);
    float twinkle = 0.65 + 0.35 * sin(uTime * 2.1 + hash(floor(sp)) * 90.0);
    float band = pow(clamp(1.0 - abs(dot(dir, normalize(vec3(0.62, 0.36, -0.7)))) * 2.1, 0.0, 1.0), 2.2);
    float milky = fbm(dir * 7.0 + 3.0) * band * uGalaxy;
    col += vec3(0.75, 0.82, 1.0) * stars * twinkle * uNight * 0.9;
    col += vec3(0.34, 0.38, 0.55) * milky * uNight * 0.16;
  }

  // Moon.
  float moonDot = max(dot(dir, uMoonDir), 0.0);
  float moonDisc = smoothstep(0.99965, 0.99988, moonDot);
  float moonGlow = pow(moonDot, 220.0) * 0.5 + pow(moonDot, 12.0) * 0.03;
  col += vec3(0.92, 0.94, 1.0) * (moonDisc * 2.6 + moonGlow) * uMoonIntensity;

  gl_FragColor = vec4(col, 1.0);
}
`;

/** Time-of-day presets. All values are tuned for look, not for realism. */
export const SKY_PRESETS = {
  day: {
    label: 'DAY',
    sunElevation: 46,
    sunAzimuth: 128,
    zenith: '#2a5c9e',
    horizon: '#b9cfe0',
    ground: '#8e8168',
    sunColor: '#fff3dc',
    sunIntensity: 1.0,
    sunLight: 3.5,
    ambient: 0.36,
    hemiSky: '#9dc0e8',
    hemiGround: '#8d7a58',
    fogColor: '#b6c8d6',
    fogDensity: 0.000034,
    haze: 0.45,
    night: 0,
    moonIntensity: 0,
    galaxy: 0,
    exposure: 1.02,
    bloomStrength: 0.28,
    starVisibility: 0,
    cloudTint: '#ffffff',
    cloudOpacity: 0.85,
    floodlights: false,
    beacons: true
  },
  sunset: {
    label: 'SUNSET',
    sunElevation: 5.2,
    sunAzimuth: 256,
    zenith: '#1c3f76',
    horizon: '#f0a463',
    ground: '#6a5642',
    sunColor: '#ffb066',
    sunIntensity: 1.25,
    sunLight: 2.6,
    ambient: 0.26,
    hemiSky: '#7d92c4',
    hemiGround: '#7a5a3c',
    fogColor: '#d59463',
    fogDensity: 0.000052,
    haze: 0.95,
    night: 0.12,
    moonIntensity: 0.12,
    galaxy: 0.2,
    exposure: 1.0,
    bloomStrength: 0.5,
    starVisibility: 0.15,
    cloudTint: '#ffcfa0',
    cloudOpacity: 0.9,
    floodlights: true,
    beacons: true
  },
  night: {
    label: 'NIGHT',
    sunElevation: -14,
    sunAzimuth: 300,
    zenith: '#050b1c',
    horizon: '#101d33',
    ground: '#0a0d14',
    sunColor: '#20304e',
    sunIntensity: 0.05,
    sunLight: 0.10,
    ambient: 0.10,
    hemiSky: '#22314f',
    hemiGround: '#14161c',
    fogColor: '#0d1524',
    fogDensity: 0.000060,
    haze: 0.55,
    night: 1,
    moonIntensity: 1.0,
    galaxy: 1.0,
    exposure: 1.30,
    bloomStrength: 0.78,
    starVisibility: 1,
    cloudTint: '#5b6a86',
    cloudOpacity: 0.55,
    floodlights: true,
    beacons: true
  }
};

function dirFromAngles(elevationDeg, azimuthDeg, out = new THREE.Vector3()) {
  const el = THREE.MathUtils.degToRad(elevationDeg);
  const az = THREE.MathUtils.degToRad(azimuthDeg);
  out.set(Math.cos(el) * Math.sin(az), Math.sin(el), -Math.cos(el) * Math.cos(az));
  return out.normalize();
}

export class Weather {
  constructor(scene, renderer) {
    this.scene = scene;
    this.renderer = renderer;
    this.rng = new Rng(settings.seed ^ 0x51ce);
    this.noise = new Noise(settings.seed ^ 0x9911);
    this.presetName = 'day';
    this.preset = { ...SKY_PRESETS.day };
    this.target = { ...SKY_PRESETS.day };
    this.blend = 1;
    this.time = 0;
    this.windDir = new THREE.Vector3(0.82, 0, -0.57).normalize();
    this.windSpeed = 5.5;

    this._buildSky();
    this._buildStars();
    this._buildClouds();
    this._buildLights();
    this._buildDust();
    this.applyPreset('day', true);
  }

  /* -------------------------------------------------- sky dome */
  _buildSky() {
    const geo = new THREE.SphereGeometry(1, 48, 32);
    this.skyUniforms = {
      uZenith: { value: new THREE.Color('#2a5c9e') },
      uHorizon: { value: new THREE.Color('#b9cfe0') },
      uGround: { value: new THREE.Color('#8e8168') },
      uSunDir: { value: new THREE.Vector3(0, 1, 0) },
      uSunColor: { value: new THREE.Color('#fff3dc') },
      uSunSize: { value: 0.017 },
      uSunIntensity: { value: 1 },
      uMoonDir: { value: new THREE.Vector3(0, 1, 0) },
      uMoonIntensity: { value: 0 },
      uNight: { value: 0 },
      uHaze: { value: 0.4 },
      uTime: { value: 0 },
      uGalaxy: { value: 0 }
    };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.skyUniforms,
      vertexShader: SKY_VERT,
      fragmentShader: SKY_FRAG,
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: false,
      fog: false,
      toneMapped: true
    });
    this.sky = new THREE.Mesh(geo, mat);
    this.sky.name = 'skydome';
    this.sky.renderOrder = -1000;
    this.sky.frustumCulled = false;
    this.sky.scale.setScalar(1);
    this.scene.add(this.sky);
  }

  /* -------------------------------------------------- stars */
  _buildStars() {
    const count = settings.quality.starCount;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const size = new Float32Array(count);
    const phase = new Float32Array(count);
    const c = new THREE.Color();
    for (let i = 0; i < count; i++) {
      // Uniform on the upper hemisphere, slightly biased away from the horizon.
      const u = this.rng.float();
      const v = this.rng.float() * 0.94 + 0.03;
      const theta = u * Math.PI * 2;
      const y = Math.pow(v, 0.72);
      const r = Math.sqrt(Math.max(0, 1 - y * y));
      pos[i * 3] = Math.cos(theta) * r;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = Math.sin(theta) * r;
      const temp = this.rng.float();
      c.setHSL(temp < 0.75 ? 0.58 : 0.08, 0.25 + this.rng.float() * 0.35, 0.72 + this.rng.float() * 0.28);
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
      const mag = Math.pow(this.rng.float(), 3.2);
      size[i] = 0.9 + mag * 5.4;
      phase[i] = this.rng.float() * Math.PI * 2;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    geo.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));

    this.starUniforms = {
      uOpacity: { value: 0 },
      uTime: { value: 0 },
      uPixelRatio: { value: 1 },
      uTex: { value: T.glowSprite(64, 3.2) }
    };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.starUniforms,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
      fog: false,
      vertexShader: /* glsl */ `
        attribute vec3 aColor;
        attribute float aSize;
        attribute float aPhase;
        uniform float uTime;
        uniform float uPixelRatio;
        varying vec3 vColor;
        varying float vTw;
        void main() {
          vColor = aColor;
          vTw = 0.72 + 0.28 * sin(uTime * 1.6 + aPhase * 4.0);
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_Position.z = gl_Position.w;
          gl_PointSize = aSize * uPixelRatio * vTw;
        }
      `,
      fragmentShader: /* glsl */ `
        precision highp float;
        uniform float uOpacity;
        uniform sampler2D uTex;
        varying vec3 vColor;
        varying float vTw;
        void main() {
          vec4 t = texture2D(uTex, gl_PointCoord);
          float a = t.a * uOpacity * vTw;
          if (a < 0.004) discard;
          gl_FragColor = vec4(vColor * (1.0 + vTw * 0.4), a);
        }
      `
    });
    this.stars = new THREE.Points(geo, mat);
    this.stars.name = 'stars';
    this.stars.frustumCulled = false;
    this.stars.renderOrder = -999;
    this.stars.visible = false;
    this.scene.add(this.stars);
  }

  /* -------------------------------------------------- clouds */
  _buildClouds() {
    this.cloudGroup = new THREE.Group();
    this.cloudGroup.name = 'clouds';
    this.scene.add(this.cloudGroup);

    const count = settings.quality.cloudCount;
    const variants = 4;
    const mats = [];
    for (let v = 0; v < variants; v++) {
      mats.push(
        new THREE.MeshBasicMaterial({
          map: T.cloudSprite(256, v + 1),
          transparent: true,
          depthWrite: false,
          opacity: 0.85,
          fog: false,
          side: THREE.DoubleSide,
          toneMapped: true
        })
      );
    }
    this.cloudMaterials = mats;
    this.clouds = [];
    const plane = new THREE.PlaneGeometry(1, 1);
    for (let i = 0; i < count; i++) {
      const m = new THREE.Mesh(plane, mats[i % variants]);
      const ang = this.rng.float() * Math.PI * 2;
      const dist = 5200 + Math.pow(this.rng.float(), 0.6) * 17000;
      const alt = 1500 + this.rng.float() * 2400;
      m.position.set(Math.cos(ang) * dist, alt, Math.sin(ang) * dist);
      const w = 1400 + this.rng.float() * 3400;
      m.scale.set(w, w * (0.32 + this.rng.float() * 0.24), 1);
      m.userData.drift = 0.6 + this.rng.float() * 0.9;
      m.renderOrder = -500;
      m.frustumCulled = true;
      this.cloudGroup.add(m);
      this.clouds.push(m);
    }

    // High cirrus sheet: a single large plane with a scrolling noise alpha.
    const cirrusTex = this._cirrusTexture();
    this.cirrusUniforms = {
      uTex: { value: cirrusTex },
      uTime: { value: 0 },
      uOpacity: { value: 0.5 },
      uTint: { value: new THREE.Color('#ffffff') }
    };
    const cirrusMat = new THREE.ShaderMaterial({
      uniforms: this.cirrusUniforms,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: false,
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        varying vec3 vWorld;
        void main() {
          vUv = uv;
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorld = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: /* glsl */ `
        precision highp float;
        uniform sampler2D uTex;
        uniform float uTime;
        uniform float uOpacity;
        uniform vec3 uTint;
        varying vec2 vUv;
        varying vec3 vWorld;
        void main() {
          vec2 uv = vUv * 3.0 + vec2(uTime * 0.0035, uTime * 0.0012);
          float a = texture2D(uTex, uv).r;
          float b = texture2D(uTex, uv * 2.13 - vec2(uTime * 0.002, 0.0)).r;
          float m = smoothstep(0.42, 0.86, a * 0.7 + b * 0.45);
          // Fade out overhead and far away so the sheet never shows its edges.
          float d = length(vWorld.xz) / 26000.0;
          m *= smoothstep(1.0, 0.25, d) * smoothstep(0.02, 0.35, d);
          gl_FragColor = vec4(uTint, m * uOpacity);
        }
      `
    });
    this.cirrus = new THREE.Mesh(new THREE.PlaneGeometry(56000, 56000, 1, 1), cirrusMat);
    this.cirrus.rotation.x = Math.PI / 2;
    this.cirrus.position.y = 7200;
    this.cirrus.renderOrder = -600;
    this.cirrus.frustumCulled = false;
    this.scene.add(this.cirrus);
  }

  _cirrusTexture() {
    const size = 256;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    const img = ctx.createImageData(size, size);
    const n = new Noise(settings.seed ^ 0x3131);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4;
        // Stretched noise reads as wind-combed cirrus.
        const v = n.fbm2(x / 26, y / 5, 5) * 0.5 + 0.5;
        const g = clamp(v * 255, 0, 255);
        img.data[i] = g;
        img.data[i + 1] = g;
        img.data[i + 2] = g;
        img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }

  /* -------------------------------------------------- lights */
  _buildLights() {
    this.sun = new THREE.DirectionalLight(0xffffff, 3.2);
    this.sun.name = 'sun';
    this.sun.castShadow = settings.quality.shadows;
    const s = this.sun.shadow;
    s.mapSize.set(settings.quality.shadowMapSize, settings.quality.shadowMapSize);
    s.camera.near = 1;
    s.camera.far = 620;
    s.camera.left = -190;
    s.camera.right = 190;
    s.camera.top = 190;
    s.camera.bottom = -190;
    s.bias = -0.0006;
    s.normalBias = 0.05;
    s.blurSamples = 8;
    this.sunTarget = new THREE.Object3D();
    this.scene.add(this.sunTarget);
    this.sun.target = this.sunTarget;
    this.scene.add(this.sun);

    this.moonLight = new THREE.DirectionalLight(0x9fb4e0, 0);
    this.moonLight.name = 'moon';
    this.scene.add(this.moonLight);

    this.hemi = new THREE.HemisphereLight(0x9dc0e8, 0x8d7a58, 0.4);
    this.scene.add(this.hemi);

    this.ambient = new THREE.AmbientLight(0xffffff, 0.2);
    this.scene.add(this.ambient);

    this.sunDir = new THREE.Vector3(0, 1, 0);
    this.moonDir = new THREE.Vector3(0, 1, 0);

    this.scene.fog = new THREE.FogExp2(0xb6c8d6, 0.000034);
  }

  /* -------------------------------------------------- dust motes */
  _buildDust() {
    const count = settings.quality.dustMotes;
    if (count <= 0) {
      this.dust = null;
      return;
    }
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const seed = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = this.rng.spread(70);
      pos[i * 3 + 1] = this.rng.float() * 14;
      pos[i * 3 + 2] = this.rng.spread(70);
      seed[i] = this.rng.float();
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    this.dustUniforms = {
      uTime: { value: 0 },
      uOpacity: { value: 0.28 },
      uColor: { value: new THREE.Color('#e8d9bc') },
      uPixelRatio: { value: 1 },
      uOrigin: { value: new THREE.Vector3() },
      uTex: { value: T.glowSprite(32, 2.6) }
    };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.dustUniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
      vertexShader: /* glsl */ `
        attribute float aSeed;
        uniform float uTime;
        uniform float uPixelRatio;
        uniform vec3 uOrigin;
        varying float vFade;
        void main() {
          vec3 p = position;
          // Motes drift and wrap in a box that follows the player.
          p.x += sin(uTime * 0.25 + aSeed * 40.0) * 3.0 + uTime * 0.8;
          p.y += sin(uTime * 0.4 + aSeed * 22.0) * 0.7;
          p.z += cos(uTime * 0.22 + aSeed * 31.0) * 3.0;
          p = mod(p - uOrigin + 70.0, 140.0) - 70.0 + uOrigin;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          float d = -mv.z;
          vFade = smoothstep(70.0, 8.0, d) * smoothstep(0.6, 4.0, d);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = (1.0 + aSeed * 2.2) * uPixelRatio * (24.0 / max(2.0, d));
        }
      `,
      fragmentShader: /* glsl */ `
        precision highp float;
        uniform float uOpacity;
        uniform vec3 uColor;
        uniform sampler2D uTex;
        varying float vFade;
        void main() {
          float a = texture2D(uTex, gl_PointCoord).a * uOpacity * vFade;
          if (a < 0.003) discard;
          gl_FragColor = vec4(uColor, a);
        }
      `
    });
    this.dust = new THREE.Points(geo, mat);
    this.dust.frustumCulled = false;
    this.dust.name = 'dustmotes';
    this.scene.add(this.dust);
  }

  /* -------------------------------------------------- presets */

  applyPreset(name, instant = false) {
    const p = SKY_PRESETS[name] || SKY_PRESETS.day;
    this.presetName = name;
    this.target = p;
    if (instant) {
      this.preset = { ...p };
      this.blend = 1;
      this._pushPreset(1);
      this.rebuildEnvironment();
    } else {
      this.from = { ...this.preset };
      this.blend = 0;
    }
    return p;
  }

  _lerpPreset(a, b, t) {
    const out = { ...b };
    const numeric = [
      'sunElevation', 'sunAzimuth', 'sunIntensity', 'sunLight', 'ambient', 'fogDensity',
      'haze', 'night', 'moonIntensity', 'galaxy', 'exposure', 'bloomStrength',
      'starVisibility', 'cloudOpacity'
    ];
    for (const k of numeric) out[k] = lerp(a[k], b[k], t);
    const colors = ['zenith', 'horizon', 'ground', 'sunColor', 'hemiSky', 'hemiGround', 'fogColor', 'cloudTint'];
    for (const k of colors) {
      out[k] = new THREE.Color(a[k]).lerp(new THREE.Color(b[k]), t).getStyle();
    }
    return out;
  }

  _pushPreset() {
    const p = this.preset;
    dirFromAngles(p.sunElevation, p.sunAzimuth, this.sunDir);
    dirFromAngles(38, (p.sunAzimuth + 170) % 360, this.moonDir);

    const u = this.skyUniforms;
    u.uZenith.value.set(p.zenith);
    u.uHorizon.value.set(p.horizon);
    u.uGround.value.set(p.ground);
    u.uSunDir.value.copy(this.sunDir);
    u.uSunColor.value.set(p.sunColor);
    u.uSunIntensity.value = p.sunIntensity;
    u.uMoonDir.value.copy(this.moonDir);
    u.uMoonIntensity.value = p.moonIntensity;
    u.uNight.value = p.night;
    u.uHaze.value = p.haze;
    u.uGalaxy.value = p.galaxy;

    this.sun.position.copy(this.sunDir).multiplyScalar(420);
    this.sun.color.set(p.sunColor);
    this.sun.intensity = Math.max(0, p.sunLight);
    this.sun.visible = p.sunLight > 0.02;

    this.moonLight.position.copy(this.moonDir).multiplyScalar(420);
    this.moonLight.intensity = p.moonIntensity * 0.55;
    this.moonLight.visible = p.moonIntensity > 0.02;

    this.hemi.color.set(p.hemiSky);
    this.hemi.groundColor.set(p.hemiGround);
    this.hemi.intensity = p.ambient * 1.35;
    this.ambient.intensity = p.ambient * 0.42;

    this.scene.fog.color.set(p.fogColor);
    this.scene.fog.density = p.fogDensity;
    this.scene.background = null;

    this.stars.visible = p.starVisibility > 0.01;
    this.starUniforms.uOpacity.value = p.starVisibility;

    for (const m of this.cloudMaterials) {
      m.opacity = p.cloudOpacity;
      m.color.set(p.cloudTint);
    }
    this.cirrusUniforms.uOpacity.value = p.cloudOpacity * 0.55;
    this.cirrusUniforms.uTint.value.set(p.cloudTint);

    if (this.dust) {
      this.dustUniforms.uOpacity.value = lerp(0.05, 0.3, 1 - p.night);
      this.dustUniforms.uColor.value.set(p.sunColor);
    }
  }

  /**
   * Render the sky into a cube map so PBR surfaces get real reflections.
   * Without this every metal surface on the base renders black, because a
   * metal has no diffuse response to punctual lights.
   */
  rebuildEnvironment() {
    if (!this._pmrem) this._pmrem = new THREE.PMREMGenerator(this.renderer);
    const envScene = new THREE.Scene();
    const skyClone = new THREE.Mesh(this.sky.geometry, this.sky.material);
    skyClone.scale.setScalar(1);
    envScene.add(skyClone);
    const rt = this._pmrem.fromScene(envScene, 0.05, 0.1, 100);
    if (this._envRT) this._envRT.dispose();
    this._envRT = rt;
    this.scene.environment = rt.texture;
    this.scene.environmentIntensity = lerp(1.15, 0.42, this.preset.night);
    envScene.remove(skyClone);
  }

  /* -------------------------------------------------- update */

  update(dt, camera) {
    this.time += dt;
    this.skyUniforms.uTime.value = this.time;
    this.starUniforms.uTime.value = this.time;
    this.starUniforms.uPixelRatio.value = this.renderer.getPixelRatio();
    this.cirrusUniforms.uTime.value = this.time;

    if (this.blend < 1) {
      this.blend = Math.min(1, this.blend + dt / 1.6);
      const t = this.blend * this.blend * (3 - 2 * this.blend);
      this.preset = this._lerpPreset(this.from, this.target, t);
      this._pushPreset();
      if (this.blend >= 1) this.rebuildEnvironment();
    }

    // Sky, stars and cirrus ride with the camera so they stay infinitely far.
    this.sky.position.copy(camera.position);
    this.sky.scale.setScalar(SKY_DOME_RADIUS);
    this.stars.position.copy(camera.position);
    this.stars.scale.setScalar(SKY_DOME_RADIUS * 0.92);
    this.cirrus.position.x = camera.position.x;
    this.cirrus.position.z = camera.position.z;

    // Keep the sun's shadow frustum centred on the player.
    this.sunTarget.position.set(camera.position.x, 0, camera.position.z);
    this.sun.position.copy(this.sunDir).multiplyScalar(420).add(this.sunTarget.position);
    this.moonLight.position.copy(this.moonDir).multiplyScalar(420).add(this.sunTarget.position);

    const drift = this.windSpeed * dt;
    for (const c of this.clouds) {
      c.position.addScaledVector(this.windDir, drift * c.userData.drift);
      const rel = c.position.clone().sub(camera.position);
      const d = Math.hypot(rel.x, rel.z);
      if (d > 24000) {
        // Recycle to the upwind side.
        c.position.x = camera.position.x - this.windDir.x * 20000 + this.rng.spread(6000);
        c.position.z = camera.position.z - this.windDir.z * 20000 + this.rng.spread(6000);
      }
      c.lookAt(camera.position.x, c.position.y, camera.position.z);
    }

    if (this.dust) {
      this.dustUniforms.uTime.value = this.time;
      this.dustUniforms.uPixelRatio.value = this.renderer.getPixelRatio();
      this.dustUniforms.uOrigin.value.copy(camera.position);
    }
  }

  get sunDirection() {
    return this.sunDir;
  }

  /** Colour a trail or explosion should be lit with at a given altitude. */
  sampleSkyLight(altitude, out = new THREE.Color()) {
    const p = this.preset;
    out.set(p.horizon).lerp(new THREE.Color(p.zenith), saturate(altitude / 9000));
    return out;
  }

  dispose() {
    this._pmrem?.dispose();
    this._envRT?.dispose();
  }
}

export { dirFromAngles };
