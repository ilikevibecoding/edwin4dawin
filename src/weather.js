/**
 * Sky, light and atmosphere.
 *
 * Owns the analytic sky dome, the key light (sun by day, moon at night), the
 * cloud layers, the starfield, wind, near-camera dust haze, and the crossfade
 * between the three light conditions. Also publishes the haze parameters that
 * the effects shaders use for aerial perspective.
 */

import * as THREE from 'three';
import { WORLD, CONDITIONS, QUALITY } from './config.js';
import { clamp01, damp, lerp, DEG } from './util/mathx.js';
import { noise } from './util/noise.js';
import { makeCanvas, smokePuff } from './util/textures.js';
import { Random } from './util/rng.js';

// ---------------------------------------------------------------------------
// Sky dome
// ---------------------------------------------------------------------------

const SKY_VERT = /* glsl */`
  varying vec3 vDir;
  void main() {
    vDir = position;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
  }
`;

const SKY_FRAG = /* glsl */`
  uniform vec3  uZenith;
  uniform vec3  uHorizon;
  uniform vec3  uGround;
  uniform vec3  uSunDir;
  uniform vec3  uSunColor;
  uniform float uSunIntensity;
  uniform float uNight;
  uniform float uMoon;
  uniform float uCloudCover;
  uniform float uCloudStrength;
  uniform vec3  uCloudTint;
  uniform float uTime;
  uniform sampler2D uCloudTex;
  uniform vec3  uHazeColor;

  varying vec3 vDir;

  float hash13(vec3 p) {
    p = fract(p * 0.1031);
    p += dot(p, p.yzx + 33.33);
    return fract((p.x + p.y) * p.z);
  }

  void main() {
    vec3 d = normalize(vDir);
    float h = d.y;

    // Base gradient: saturated zenith falling to a pale, hazy horizon.
    float t = pow(1.0 - clamp(h, 0.0, 1.0), 3.2);
    vec3 col = mix(uZenith, uHorizon, t);
    // Slight brightening just above the horizon reads as atmospheric depth.
    col += uHorizon * 0.16 * pow(max(0.0, 1.0 - abs(h) * 7.0), 2.0);
    // Below the horizon, blend to ground haze so the terrain edge disappears.
    col = mix(col, uGround, smoothstep(0.005, -0.09, h));

    float cosT = dot(d, uSunDir);

    // Forward-scattering halo around the key light.
    float mie = pow(max(cosT, 0.0), 6.0) * 0.14 + pow(max(cosT, 0.0), 90.0) * 0.5;
    col += uSunColor * mie * uSunIntensity * (1.0 - uNight * 0.55);

    // Key light disc. The moon gets a smaller, cooler, textured disc.
    if (uMoon > 0.5) {
      float disc = smoothstep(0.99975, 0.99990, cosT);
      float crater = hash13(d * 3000.0) * 0.25 + 0.75;
      col += vec3(0.85, 0.9, 1.0) * disc * 6.0 * crater;
      col += vec3(0.35, 0.42, 0.6) * pow(max(cosT, 0.0), 700.0) * 1.4;
    } else {
      float disc = smoothstep(0.99965, 0.99985, cosT);
      col += uSunColor * disc * 26.0 * uSunIntensity;
    }

    // Star field and a faint galactic band, only at night. Kept sparse and
    // small: a dense field reads as noise rather than sky.
    if (uNight > 0.01 && h > -0.02) {
      vec3 q = floor(d * 900.0);
      float n = hash13(q);
      float star = smoothstep(0.99935, 0.99995, n);
      float tw = 0.6 + 0.4 * sin(uTime * 2.4 + n * 90.0);
      // A second, much rarer set of brighter stars gives the field structure.
      float bright = smoothstep(0.99992, 1.0, hash13(q + 7.0));
      float band = exp(-pow((d.y * 1.35 + d.x * 0.42) * 2.6, 2.0)) * 0.03;
      col += vec3(0.86, 0.9, 1.0) * star * 1.5 * tw * uNight;
      col += vec3(1.0, 0.96, 0.9) * bright * 4.0 * tw * uNight;
      col += vec3(0.4, 0.45, 0.68) * band * uNight;
    }

    // High cirrus, projected onto a virtual cloud plane.
    if (h > 0.008 && uCloudStrength > 0.001) {
      vec2 cuv = d.xz / (h + 0.10);
      vec2 uv1 = cuv * 0.055 + vec2(uTime * 0.0022, uTime * 0.0009);
      vec2 uv2 = cuv * 0.019 - vec2(uTime * 0.0011, uTime * 0.0005);
      float c1 = texture2D(uCloudTex, uv1).r;
      float c2 = texture2D(uCloudTex, uv2).g;
      float raw = c1 * 0.75 + c2 * 0.95;
      // Cover drives a soft threshold so the sheet thickens smoothly.
      float cloud = smoothstep(1.30 - uCloudCover * 0.75, 1.62 - uCloudCover * 0.5, raw);
      cloud *= smoothstep(0.008, 0.13, h);
      // Sunward edges catch the light.
      float lit = clamp(mie * 3.0 + 0.6, 0.0, 1.7);
      vec3 cc = uCloudTint * lit;
      col = mix(col, cc, clamp(cloud * 0.9, 0.0, 0.8) * uCloudStrength);
    }

    // Horizon haze wash ties the sky to the terrain fog colour.
    col = mix(col, uHazeColor, pow(1.0 - clamp(abs(h) * 5.0, 0.0, 1.0), 3.0) * 0.35);

    gl_FragColor = vec4(col, 1.0);
  }
`;

/** Two-channel procedural cloud sheet (cirrus + mid-level). */
function cloudTexture(size = 512) {
  const c = makeCanvas(size);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x / size) * 6, v = (y / size) * 6;
      // Wispy, stretched cirrus.
      const a = noise.fbm2(u * 2.4, v * 0.7, 5) * 0.5 + 0.5;
      const wisp = clamp01(Math.pow(a, 1.7) * 1.5);
      // Broader, softer sheet.
      const b = noise.fbm2(u * 0.8 + 40, v * 0.8 + 40, 4) * 0.5 + 0.5;
      const sheet = clamp01(Math.pow(b, 2.1) * 1.6);
      const i = (y * size + x) * 4;
      img.data[i] = wisp * 255;
      img.data[i + 1] = sheet * 255;
      img.data[i + 2] = ((a + b) * 0.5) * 255;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.NoColorSpace;
  return t;
}

// ---------------------------------------------------------------------------
// Cumulus billboard layer (one draw call, lit, drifting)
// ---------------------------------------------------------------------------

const CUMULUS_VERT = /* glsl */`
  attribute vec3 aPos;
  attribute vec3 aScale;   // x: width, y: height, z: seed
  uniform float uTime;
  uniform vec3  uWind;
  varying vec2  vUv;
  varying float vSeed;
  varying vec3  vWorld;
  void main() {
    vUv = uv;
    vSeed = aScale.z;
    vec3 wp = aPos + uWind * uTime;
    // Wrap the layer so it drifts forever without leaving the sky.
    wp.x = mod(wp.x + 30000.0, 60000.0) - 30000.0;
    wp.z = mod(wp.z + 30000.0, 60000.0) - 30000.0;
    vWorld = wp;
    vec4 mv = viewMatrix * vec4(wp, 1.0);
    mv.xy += position.xy * aScale.xy;
    gl_Position = projectionMatrix * mv;
  }
`;

const CUMULUS_FRAG = /* glsl */`
  uniform sampler2D uMap;
  uniform vec3 uSunDir;
  uniform vec3 uLit;
  uniform vec3 uShadow;
  uniform float uOpacity;
  varying vec2 vUv;
  varying float vSeed;
  varying vec3 vWorld;
  void main() {
    vec4 tex = texture2D(uMap, vUv);
    float a = tex.a * uOpacity;
    if (a < 0.01) discard;
    // Light wraps around the puff from the sun side.
    vec3 n = normalize(vec3((vUv - 0.5) * 2.0, 0.7));
    float ndl = clamp(dot(n, normalize(uSunDir)) * 0.5 + 0.5, 0.0, 1.0);
    vec3 col = mix(uShadow, uLit, pow(ndl, 0.8));
    // Bright silver rim toward the light.
    col += uLit * pow(ndl, 6.0) * 0.5;
    gl_FragColor = vec4(col, a);
  }
`;

class CumulusLayer {
  constructor(scene, count, seed = 4) {
    const rng = new Random(seed);
    const base = new THREE.PlaneGeometry(1, 1);
    const geo = new THREE.InstancedBufferGeometry();
    geo.index = base.index;
    geo.setAttribute('position', base.attributes.position);
    geo.setAttribute('uv', base.attributes.uv);
    const pos = new Float32Array(count * 3);
    const scl = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const a = rng.float(0, Math.PI * 2);
      const r = rng.float(5000, 30000);
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = rng.float(2600, 6400);
      pos[i * 3 + 2] = Math.sin(a) * r;
      // Puffs are sized relative to their range so the layer keeps a
      // consistent apparent scale across the sky.
      const w = r * rng.float(0.045, 0.11);
      scl[i * 3] = w;
      scl[i * 3 + 1] = w * rng.float(0.4, 0.62);
      scl[i * 3 + 2] = rng.float(0, 1);
    }
    geo.setAttribute('aPos', new THREE.InstancedBufferAttribute(pos, 3));
    geo.setAttribute('aScale', new THREE.InstancedBufferAttribute(scl, 3));
    geo.instanceCount = count;
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e9);

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uWind: { value: new THREE.Vector3(6, 0, 2) },
        uMap: { value: smokePuff(128, 21) },
        uSunDir: { value: new THREE.Vector3(0, 1, 0) },
        uLit: { value: new THREE.Color(0xffffff) },
        uShadow: { value: new THREE.Color(0x8fa4bd) },
        uOpacity: { value: 0.5 },
      },
      vertexShader: CUMULUS_VERT,
      fragmentShader: CUMULUS_FRAG,
      transparent: true, depthWrite: false, blending: THREE.NormalBlending,
    });
    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -0.5;
    this.mesh.matrixAutoUpdate = false;
    scene.add(this.mesh);
  }

  update(dt) { this.material.uniforms.uTime.value += dt; }
}

// ---------------------------------------------------------------------------
// Near-camera dust haze: motes that catch the light around the player
// ---------------------------------------------------------------------------

const MOTE_VERT = /* glsl */`
  attribute vec3 aPos;
  attribute float aSeed;
  uniform float uTime;
  uniform vec3  uCam;
  uniform vec3  uWind;
  uniform float uBox;
  uniform float uSize;
  varying float vSeed;
  varying vec2  vUv;
  varying float vFade;
  void main() {
    vUv = uv;
    vSeed = aSeed;
    vec3 p = aPos + uWind * uTime * (0.4 + aSeed * 0.9);
    p.y += sin(uTime * (0.5 + aSeed) + aSeed * 12.0) * 0.4;
    // Tile the mote volume around the camera.
    vec3 rel = mod(p - uCam + uBox * 0.5, uBox) - uBox * 0.5;
    vec3 wp = uCam + rel;
    float d = length(rel);
    vFade = (1.0 - smoothstep(uBox * 0.22, uBox * 0.5, d)) * smoothstep(0.6, 3.0, d);
    vec4 mv = viewMatrix * vec4(wp, 1.0);
    mv.xy += position.xy * uSize * (0.5 + aSeed);
    gl_Position = projectionMatrix * mv;
  }
`;

const MOTE_FRAG = /* glsl */`
  uniform sampler2D uMap;
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vSeed;
  varying vec2 vUv;
  varying float vFade;
  void main() {
    float a = texture2D(uMap, vUv).a * uOpacity * vFade;
    if (a < 0.004) discard;
    gl_FragColor = vec4(uColor, a);
  }
`;

class DustMotes {
  constructor(scene, count = 600, box = 46) {
    const rng = new Random(99);
    const base = new THREE.PlaneGeometry(1, 1);
    const geo = new THREE.InstancedBufferGeometry();
    geo.index = base.index;
    geo.setAttribute('position', base.attributes.position);
    geo.setAttribute('uv', base.attributes.uv);
    const pos = new Float32Array(count * 3);
    const seed = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = rng.float(-box / 2, box / 2);
      pos[i * 3 + 1] = rng.float(0, box * 0.45);
      pos[i * 3 + 2] = rng.float(-box / 2, box / 2);
      seed[i] = rng.float(0, 1);
    }
    geo.setAttribute('aPos', new THREE.InstancedBufferAttribute(pos, 3));
    geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seed, 1));
    geo.instanceCount = count;
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e9);
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uCam: { value: new THREE.Vector3() },
        uWind: { value: new THREE.Vector3(0.5, 0.02, 0.2) },
        uBox: { value: box },
        uSize: { value: 0.05 },
        uMap: { value: smokePuff(64, 12) },
        uColor: { value: new THREE.Color(0xd8c8a8) },
        uOpacity: { value: 0.3 },
      },
      vertexShader: MOTE_VERT, fragmentShader: MOTE_FRAG,
      transparent: true, depthWrite: false, blending: THREE.NormalBlending,
    });
    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 9;
    this.mesh.matrixAutoUpdate = false;
    scene.add(this.mesh);
  }

  update(dt, camPos) {
    this.material.uniforms.uTime.value += dt;
    this.material.uniforms.uCam.value.copy(camPos);
  }
}

// ---------------------------------------------------------------------------
// Weather system
// ---------------------------------------------------------------------------

export class Weather {
  constructor(scene, renderer, camera, qualityId = 'high') {
    this.scene = scene;
    this.renderer = renderer;
    this.camera = camera;
    this.q = QUALITY[qualityId] ?? QUALITY.high;

    this.conditionId = 'day';
    this.preset = CONDITIONS.day;
    // Live values, crossfaded toward the target preset.
    this.live = {
      sunDir: new THREE.Vector3(),
      sunColour: new THREE.Color(),
      sunIntensity: 0,
      ambient: 0,
      ambientColour: new THREE.Color(),
      zenith: new THREE.Color(),
      horizon: new THREE.Color(),
      ground: new THREE.Color(),
      haze: new THREE.Color(),
      hazeDensity: 0,
      cloudCover: 0,
      cloudTint: new THREE.Color(),
      stars: 0,
      exposure: 1,
      moon: 0,
    };
    this.blend = 1;

    // Key light -------------------------------------------------------------
    this.sun = new THREE.DirectionalLight(0xffffff, 3);
    this.sun.castShadow = this.q.shadowsEnabled;
    const sc = this.sun.shadow;
    sc.mapSize.set(this.q.shadowMapSize, this.q.shadowMapSize);
    sc.camera.near = 1;
    sc.camera.far = 900;
    const ext = 190;
    sc.camera.left = -ext; sc.camera.right = ext;
    sc.camera.top = ext; sc.camera.bottom = -ext;
    sc.bias = -0.0007;
    sc.normalBias = 0.05;
    scene.add(this.sun);
    this.sunTarget = new THREE.Object3D();
    scene.add(this.sunTarget);
    this.sun.target = this.sunTarget;

    this.hemi = new THREE.HemisphereLight(0x9ec4e8, 0xb0996f, 0.5);
    scene.add(this.hemi);
    this.ambient = new THREE.AmbientLight(0xffffff, 0.1);
    scene.add(this.ambient);
    // Cool fill from the opposite side keeps shadowed metal from going flat.
    this.fill = new THREE.DirectionalLight(0x9fbcd8, 0.35);
    this.fill.position.set(-60, 40, 60);
    scene.add(this.fill);

    // Sky -------------------------------------------------------------------
    this.cloudTex = cloudTexture(512);
    const skyGeo = new THREE.SphereGeometry(WORLD.skyRadius, 48, 32);
    this.skyMat = new THREE.ShaderMaterial({
      uniforms: {
        uZenith: { value: new THREE.Color(0x2f6bb0) },
        uHorizon: { value: new THREE.Color(0xbfd6e8) },
        uGround: { value: new THREE.Color(0xa08a68) },
        uSunDir: { value: new THREE.Vector3(0, 1, 0) },
        uSunColor: { value: new THREE.Color(0xfff3dd) },
        uSunIntensity: { value: 1 },
        uNight: { value: 0 },
        uMoon: { value: 0 },
        uCloudCover: { value: 0.35 },
        uCloudStrength: { value: 1 },
        uCloudTint: { value: new THREE.Color(0xffffff) },
        uTime: { value: 0 },
        uCloudTex: { value: this.cloudTex },
        uHazeColor: { value: new THREE.Color(0xa8c0d6) },
      },
      vertexShader: SKY_VERT, fragmentShader: SKY_FRAG,
      side: THREE.BackSide, depthWrite: false, depthTest: false,
    });
    this.sky = new THREE.Mesh(skyGeo, this.skyMat);
    this.sky.renderOrder = -1000;
    this.sky.frustumCulled = false;
    scene.add(this.sky);

    // Image-based lighting captured from the sky itself. Without it every
    // metal surface on the site renders near-black in shadow, and the whole
    // place reads as flat painted cardboard.
    this.pmrem = new THREE.PMREMGenerator(renderer);
    this.envScene = new THREE.Scene();
    const envSky = new THREE.Mesh(skyGeo, this.skyMat);
    envSky.frustumCulled = false;
    this.envScene.add(envSky);
    // A dim ground hemisphere so the lower half of the environment is not void.
    const envGround = new THREE.Mesh(
      new THREE.SphereGeometry(WORLD.skyRadius * 0.98, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0x6b6250, side: THREE.BackSide }),
    );
    this.envGroundMat = envGround.material;
    this.envScene.add(envGround);
    this.envRT = null;
    this._envDirty = true;

    this.cumulus = this.q.cloudLayers > 0
      ? new CumulusLayer(scene, this.q.cloudLayers === 1 ? 22 : 46)
      : null;
    this.motes = new DustMotes(scene, this.q.dustInstances, 46);

    // Fog for the standard-material world (terrain, base, vehicles).
    this.fog = new THREE.FogExp2(0xa8c0d6, 0.00008);
    scene.fog = this.fog;

    this.wind = new THREE.Vector3(3.2, 0, 1.4);
    this.time = 0;
    this.effects = null;
    // Reused colour scratch: `_apply` runs every frame during a crossfade and
    // must not allocate.
    this._scratch = { a: new THREE.Color(), b: new THREE.Color() };

    this.setCondition('day', true);
  }

  attachEffects(effects) { this.effects = effects; }

  /** Direction from the site toward the key light. */
  _dirFor(preset) {
    const el = preset.sunElevation * DEG;
    const az = preset.sunAzimuth * DEG;
    return new THREE.Vector3(
      Math.cos(el) * Math.sin(az),
      Math.sin(el),
      Math.cos(el) * Math.cos(az),
    ).normalize();
  }

  setCondition(id, immediate = false) {
    const preset = CONDITIONS[id] ?? CONDITIONS.day;
    this.conditionId = id;
    this.preset = preset;
    this.targetDir = this._dirFor(preset);
    this.blend = immediate ? 1 : 0;
    if (immediate) this._apply(1, true);
    this._envDirty = true;
  }

  /** Re-capture the sky into a prefiltered environment map. */
  _refreshEnvironment() {
    this.envGroundMat.color.copy(this.live.ground).multiplyScalar(0.75);
    const rt = this.pmrem.fromScene(this.envScene, 0, 100, WORLD.skyRadius * 1.4);
    if (this.envRT) this.envRT.dispose();
    this.envRT = rt;
    this.scene.environment = rt.texture;
    // Enough bounce to keep shadowed metal readable without lifting the night
    // scene into a flat dusk.
    this.scene.environmentIntensity = this.preset.id === 'night' ? 0.8 : 1.0;
    this._envDirty = false;
  }

  _apply(k, snap = false) {
    const p = this.preset;
    const l = this.live;
    const t = snap ? 1 : k;
    const c = this._scratch;
    l.sunDir.lerp(this.targetDir, t).normalize();
    l.sunColour.lerp(c.a.set(p.sunColour), t);
    l.sunIntensity = lerp(l.sunIntensity, p.sunIntensity, t);
    l.ambient = lerp(l.ambient, p.ambient, t);
    l.ambientColour.lerp(c.a.set(p.ambientColour), t);
    l.zenith.lerp(c.a.set(p.skyTint), t);
    l.horizon.lerp(c.a.set(p.hazeColour).lerp(c.b.set(0xffffff), 0.32), t);
    l.ground.lerp(c.a.set(p.groundTint), t);
    l.haze.lerp(c.a.set(p.hazeColour), t);
    l.hazeDensity = lerp(l.hazeDensity, p.hazeDensity, t);
    l.cloudCover = lerp(l.cloudCover, p.cloudCover, t);
    l.cloudTint.lerp(c.a.set(p.cloudTint), t);
    l.stars = lerp(l.stars, p.stars, t);
    l.exposure = lerp(l.exposure, p.exposure, t);
    l.moon = lerp(l.moon, p.id === 'night' ? 1 : 0, t);

    // Push to the scene ----------------------------------------------------
    this.sun.color.copy(l.sunColour);
    this.sun.intensity = l.sunIntensity;
    this.sun.position.copy(l.sunDir).multiplyScalar(320);
    this.hemi.color.copy(l.zenith).lerp(c.b.set(0xffffff), 0.2);
    this.hemi.groundColor.copy(l.ground);
    this.hemi.intensity = l.ambient;
    this.ambient.color.copy(l.ambientColour);
    this.ambient.intensity = l.ambient * 0.35;
    this.fill.color.copy(l.ambientColour).lerp(c.b.set(0xffffff), 0.25);
    this.fill.intensity = l.ambient * 0.55;
    this.fill.position.copy(l.sunDir).multiplyScalar(-200).setY(120);

    const u = this.skyMat.uniforms;
    u.uZenith.value.copy(l.zenith);
    u.uHorizon.value.copy(l.horizon);
    u.uGround.value.copy(l.ground);
    u.uSunDir.value.copy(l.sunDir);
    u.uSunColor.value.copy(l.sunColour);
    u.uSunIntensity.value = Math.max(0.35, l.sunIntensity / 3);
    u.uNight.value = l.stars;
    u.uMoon.value = l.moon;
    u.uCloudCover.value = l.cloudCover;
    u.uCloudTint.value.copy(l.cloudTint);
    u.uHazeColor.value.copy(l.haze);

    this.fog.color.copy(l.haze);
    this.fog.density = l.hazeDensity;

    if (this.cumulus) {
      const cu = this.cumulus.material.uniforms;
      cu.uSunDir.value.copy(l.sunDir);
      cu.uLit.value.copy(l.sunColour).multiplyScalar(0.55 + l.sunIntensity * 0.16);
      cu.uShadow.value.copy(l.haze).lerp(l.zenith, 0.4);
      cu.uOpacity.value = 0.14 + l.cloudCover * 0.38;
      cu.uWind.value.copy(this.wind).multiplyScalar(2.4);
    }
    const mu = this.motes.material.uniforms;
    mu.uColor.value.copy(l.sunColour).lerp(l.haze, 0.45);
    mu.uOpacity.value = 0.10 + this.preset.dust * 0.24;
    mu.uWind.value.copy(this.wind).multiplyScalar(0.22);

    if (this.effects) {
      this.effects.setLighting(l.sunDir, l.sunColour, c.b.copy(l.ambientColour).lerp(l.haze, 0.5));
      this.effects.setHaze({
        colour: l.haze,
        density: l.hazeDensity,
        scaleHeight: 2600,
        curve: 0.5,
      });
    }
  }

  update(dt) {
    this.time += dt;
    this.skyMat.uniforms.uTime.value = this.time;
    if (this.blend < 1) {
      this.blend = Math.min(1, this.blend + dt / 1.4);
      this._apply(1 - Math.exp(-dt * 2.6));
      this._envDirty = true;
    } else if (this._envDirty) {
      // Captured once the crossfade settles: this is the expensive step.
      this._refreshEnvironment();
    }
    // Once the crossfade lands there is nothing to re-derive each frame; only
    // the shadow frustum below still needs to follow the player.
    // Slow wind variation so smoke drift is never perfectly steady.
    const w = noise.noise2(this.time * 0.03, 11.5);
    const w2 = noise.noise2(this.time * 0.024, 71.2);
    this.wind.set(3.0 + w * 2.2, 0, 1.2 + w2 * 2.0);
    if (this.cumulus) this.cumulus.update(dt);
    this.motes.update(dt, this.camera.position);

    // Shadow map follows the player so 2048px covers the walkable area.
    const c = this.camera.position;
    this.sunTarget.position.set(c.x, 0, c.z);
    this.sun.position.copy(this.live.sunDir).multiplyScalar(320).add(this.sunTarget.position);
    this.sun.shadow.camera.updateProjectionMatrix?.();
  }

  get exposure() { return this.live.exposure; }
  get bloomStrength() { return this.preset.bloom; }
  get isNight() { return this.live.stars > 0.5; }
  get sunDir() { return this.live.sunDir; }
  get hazeColour() { return this.live.haze; }
  get floodlightsOn() { return this.preset.floodlights; }
}
