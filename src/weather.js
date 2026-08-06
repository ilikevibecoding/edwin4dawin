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
import { clamp01, damp, lerp, smoothstep, DEG } from './util/mathx.js';
import { noise, Noise } from './util/noise.js';
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
  uniform vec3  uHazeColor;

  varying vec3 vDir;

  float hash13(vec3 p) {
    p = fract(p * 0.1031);
    p += dot(p, p.yzx + 33.33);
    return fract((p.x + p.y) * p.z);
  }

  float sHash(vec2 p) {
    p = fract(p * vec2(127.31, 311.7));
    p += dot(p, p + 34.23);
    return fract(p.x * p.y * 0.5453);
  }

  float sNoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = sHash(i);
    float b = sHash(i + vec2(1.0, 0.0));
    float c = sHash(i + vec2(0.0, 1.0));
    float d = sHash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  // Rotating-octave fbm. uDetail-style weighting on the fine octaves lets the
  // field be flattened toward the horizon, where the cloud-plane projection
  // stretches faster than the screen can resolve and detail turns to aliasing.
  float sFbm(vec2 p, int oct, float detail) {
    float v = 0.0, a = 0.5, norm = 0.0;
    mat2 rot = mat2(0.80, 0.60, -0.60, 0.80);
    for (int i = 0; i < 7; i++) {
      if (i >= oct) break;
      float w = a * (i < 2 ? 1.0 : detail);
      v += w * sNoise(p);
      norm += w;
      p = rot * p * 2.03;
      a *= 0.5;
    }
    return v / max(norm, 0.0001);
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

    // High cirrus. Evaluated analytically rather than sampled from a texture:
    // the deck is projected onto a plane 9 km up, so straight overhead a
    // texture covers a few texels and magnifies into blurry smears. Noise has
    // no such resolution, and it is what lets the deck stay fibrous overhead.
    if (h > 0.02 && uCloudStrength > 0.001) {
      // Kilometres across the cirrus plane, 9 km up. Clamping the elevation
      // used for the projection stops the deck running to infinity at the
      // horizon; past this it compresses into a band, which is what a real
      // deck does anyway.
      vec2 p = d.xz * (9.0 / max(h, 0.055));
      p += vec2(uTime * 0.017, uTime * 0.006);
      // Detail rolls off toward the horizon, where the plane stretches faster
      // than the screen can resolve and fine octaves turn into aliasing.
      float det = smoothstep(0.03, 0.32, h);
      // Where the deck is at all: banks of cirrus separated by open sky, on a
      // ~25 km scale. Without this the sheet covers the whole hemisphere and
      // reads as overcast rather than as high cloud.
      float banks = sFbm(p * 0.10 + 61.0, 3, 1.0);
      // Sheared along the wind, the way a jet stream combs cirrus out.
      float sheet = sFbm(vec2(p.x * 0.16, p.y * 0.34), 5, det);
      // Domain warp by a slower field curves the streaks instead of leaving
      // them as parallel bands. The anisotropy stays near 3:1 - stretch it
      // harder and the radial projection turns the deck into crepuscular rays.
      float warp = sFbm(p * 0.075 + 19.0, 3, 1.0) - 0.5;
      vec2 wq = vec2(p.x * 0.44, p.y * 1.25) + warp * 5.0;
      float fib = sFbm(wq, 5, det);
      float raw = sheet * 0.42 + fib * 0.58;
      float cover = uCloudCover;
      // Banks gate the coverage: high where a bank sits, nothing between.
      float gate = smoothstep(0.30, 0.58, banks + cover * 0.26);
      float cloud = smoothstep(0.46 - cover * 0.16, 0.68 - cover * 0.14, raw) * gate;
      // Wispy edges: the deck should never present a hard boundary.
      cloud *= 0.3 + 0.7 * smoothstep(0.42 - cover * 0.1, 0.78, raw);
      cloud *= smoothstep(0.02, 0.10, h);
      // Sunward edges catch the light.
      float lit = clamp(mie * 2.4 + 0.72, 0.0, 1.5);
      vec3 cc = uCloudTint * lit;
      col = mix(col, cc, clamp(cloud, 0.0, 1.0) * 0.85 * uCloudStrength);
    }

    // Horizon haze wash ties the sky to the terrain fog colour.
    col = mix(col, uHazeColor, pow(1.0 - clamp(abs(h) * 5.0, 0.0, 1.0), 3.0) * 0.35);

    gl_FragColor = vec4(col, 1.0);
  }
`;

// ---------------------------------------------------------------------------
// Cumulus billboard layer (one draw call, lit, drifting)
// ---------------------------------------------------------------------------

/**
 * Cumulus sprite: a baked optical-thickness field and the normal of that field.
 *
 * A soft radial puff standing in for a whole cloud reads as smoke. What makes a
 * cumulus legible is the lumpy, flat-based silhouette and the way light rakes
 * across the billows, so the sprite stores thickness in alpha and the gradient
 * of the thickness in RGB. The shader then lights it as if it were a surface,
 * which costs one texture fetch and gives every puff real form.
 */
function cloudSprite(size = 192, seed = 3, { lumps = 30, base = 0.24 } = {}) {
  const rng = new Random(seed);
  const N = new Noise(seed * 7 + 1);
  const thick = new Float32Array(size * size);

  // Lump layout: a wide flat base with towers rising from the middle.
  const specs = [];
  for (let i = 0; i < lumps; i++) {
    const big = rng.float(0, 1) < 0.3;
    const rad = big ? rng.float(0.15, 0.24) : rng.float(0.055, 0.135);
    const x = 0.5 + rng.float(-0.38, 0.38);
    // Towers build toward the centre; the flanks stay low and ragged.
    const centre = 1 - Math.abs(x - 0.5) * 1.9;
    const y = base + rad * 0.55 + Math.pow(rng.float(0, 1), 1.7) * 0.5 * Math.max(0.15, centre);
    specs.push({ x, y, rad, r2: rad * rad });
  }

  let peak = 0;
  for (let py = 0; py < size; py++) {
    // Texture v runs top-down; the cloud's own y runs bottom-up.
    const cy = 1 - (py + 0.5) / size;
    for (let px = 0; px < size; px++) {
      const cx = (px + 0.5) / size;
      let t = 0;
      for (const s of specs) {
        const dx = cx - s.x, dy = cy - s.y;
        const d2 = dx * dx + dy * dy;
        // Chord through a sphere: the honest thickness integral, and the reason
        // the billows get a rounded rather than a linear falloff.
        if (d2 < s.r2) t += Math.sqrt(s.r2 - d2) * 2;
      }
      if (t <= 0) { thick[py * size + px] = 0; continue; }
      // Erode with noise so the silhouette is ragged and the interior billows.
      const n = N.fbm2(cx * 7.5, cy * 7.5, 5) * 0.5 + 0.5;
      t *= 0.45 + n * 1.0;
      // Cumulus bases are cut flat by the condensation level.
      t *= smoothstep(clamp01((cy - base + 0.06) / 0.09));
      thick[py * size + px] = t;
      if (t > peak) peak = t;
    }
  }
  const inv = peak > 0 ? 1 / peak : 1;
  for (let i = 0; i < thick.length; i++) thick[i] *= inv;

  const c = makeCanvas(size);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  const at = (x, y) => thick[Math.min(size - 1, Math.max(0, y)) * size
    + Math.min(size - 1, Math.max(0, x))];
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const t = thick[py * size + px];
      // Normal from the thickness gradient. Screen y is flipped relative to the
      // cloud, so the vertical derivative is negated back.
      const gx = at(px + 1, py) - at(px - 1, py);
      const gy = at(px, py - 1) - at(px, py + 1);
      const k = 0.055;
      let nx = -gx, ny = -gy, nz = k;
      const len = Math.hypot(nx, ny, nz) || 1;
      nx /= len; ny /= len; nz /= len;
      const i = (py * size + px) * 4;
      img.data[i] = (nx * 0.5 + 0.5) * 255;
      img.data[i + 1] = (ny * 0.5 + 0.5) * 255;
      img.data[i + 2] = (nz * 0.5 + 0.5) * 255;
      img.data[i + 3] = clamp01(t) * 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.NoColorSpace;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  return tex;
}

const CUMULUS_VERT = /* glsl */`
  attribute vec3 aPos;
  attribute vec4 aScale;   // xy: half extents, z: sprite index, w: flip
  uniform float uTime;
  uniform vec3  uWind;
  uniform float uSprites;
  varying vec2  vUv;
  void main() {
    // Sub-rect of the sprite strip, optionally mirrored so the same handful of
    // baked shapes never reads as a repeated stamp.
    float u = aScale.w > 0.5 ? 1.0 - uv.x : uv.x;
    vUv = vec2((aScale.z + u) / uSprites, uv.y);
    vec3 wp = aPos + uWind * uTime;
    // Wrap far outside the visible field: the layer is depth-sorted at build
    // time and a wrap inside view would jump a cloud in front of its neighbour.
    wp.x = mod(wp.x + 120000.0, 240000.0) - 120000.0;
    wp.z = mod(wp.z + 120000.0, 240000.0) - 120000.0;
    vec4 mv = viewMatrix * vec4(wp, 1.0);
    mv.xy += position.xy * aScale.xy;
    gl_Position = projectionMatrix * mv;
  }
`;

const CUMULUS_FRAG = /* glsl */`
  uniform sampler2D uMap;
  uniform vec3  uSunView;   // key light direction, view space
  uniform vec3  uLit;
  uniform vec3  uShadow;
  uniform vec3  uSky;
  uniform float uOpacity;
  varying vec2  vUv;
  void main() {
    vec4 tex = texture2D(uMap, vUv);
    float thick = tex.a;
    if (thick < 0.004) discard;
    // Billboards face the camera, so the baked normal is already view space.
    vec3 n = normalize(tex.rgb * 2.0 - 1.0);
    float ndl = dot(n, uSunView);
    // Multiple scattering dominates inside a cloud: the terminator wraps most
    // of the way round instead of falling to black at 90 degrees.
    float wrap = clamp(ndl * 0.55 + 0.45, 0.0, 1.0);
    vec3 col = mix(uShadow, uLit, pow(wrap, 1.35));
    // Sky bounce fills the shaded underside.
    col = mix(col, uSky, (1.0 - wrap) * 0.4);
    // Silver lining: thin edges transmit, strongly so when backlit.
    float back = clamp(-uSunView.z, 0.0, 1.0);
    col += uLit * exp(-thick * 4.5) * (0.18 + back * 0.85);
    gl_FragColor = vec4(col, clamp(thick * 1.7, 0.0, 1.0) * uOpacity);
  }
`;

class CumulusLayer {
  /**
   * `masses` cloud systems, each built from several overlapping sprites so a
   * cloud has an irregular outline rather than one billboard's silhouette.
   */
  constructor(scene, masses, seed = 4) {
    const rng = new Random(seed);
    const SPRITES = 4;
    const strip = makeCanvas(192 * SPRITES, 192);
    const sctx = strip.getContext('2d');
    for (let i = 0; i < SPRITES; i++) {
      const tex = cloudSprite(192, 11 + i * 13, {
        lumps: 22 + i * 5, base: 0.2 + i * 0.03,
      });
      sctx.drawImage(tex.image, i * 192, 0);
      tex.dispose();
    }
    const map = new THREE.CanvasTexture(strip);
    map.colorSpace = THREE.NoColorSpace;
    map.minFilter = THREE.LinearMipmapLinearFilter;

    // Lay out the masses, then sort far-to-near. The camera never leaves a
    // ~1 km disc at the site while the deck starts 3 km out, so a static sort
    // about the origin holds for the whole session and alpha blending stays
    // correct without re-sorting per frame.
    const groups = [];
    for (let i = 0; i < masses; i++) {
      const a = rng.float(0, Math.PI * 2);
      // Square-root distribution fills the sky evenly by area, which puts most
      // of the deck out near the horizon the way a real cumulus field looks.
      const r = 2200 + Math.sqrt(rng.float(0, 1)) * 34000;
      const alt = rng.float(1850, 3200);
      const width = rng.float(700, 1900) * (1 + rng.float(0, 0.7));
      groups.push({ a, r, alt, width, key: r });
    }
    groups.sort((p, q) => q.key - p.key);

    const pos = [];
    const scl = [];
    for (const gp of groups) {
      const cx = Math.cos(gp.a) * gp.r, cz = Math.sin(gp.a) * gp.r;
      const parts = 2 + rng.int(0, 2);
      for (let j = 0; j < parts; j++) {
        const lead = j === 0;
        const w = gp.width * (lead ? 1 : rng.float(0.45, 0.8));
        const off = lead ? 0 : gp.width * 0.55;
        const oa = rng.float(0, Math.PI * 2);
        pos.push(
          cx + Math.cos(oa) * off,
          gp.alt + (lead ? 0 : rng.float(-0.1, 0.16) * gp.width),
          cz + Math.sin(oa) * off,
        );
        scl.push(w * 0.5, w * rng.float(0.30, 0.42), rng.int(0, SPRITES - 1), rng.int(0, 1));
      }
    }
    const count = pos.length / 3;

    const baseGeo = new THREE.PlaneGeometry(1, 1);
    const geo = new THREE.InstancedBufferGeometry();
    geo.index = baseGeo.index;
    geo.setAttribute('position', baseGeo.attributes.position);
    geo.setAttribute('uv', baseGeo.attributes.uv);
    geo.setAttribute('aPos', new THREE.InstancedBufferAttribute(new Float32Array(pos), 3));
    geo.setAttribute('aScale', new THREE.InstancedBufferAttribute(new Float32Array(scl), 4));
    geo.instanceCount = count;
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e9);
    this.count = count;

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uWind: { value: new THREE.Vector3(6, 0, 2) },
        uMap: { value: map },
        uSprites: { value: SPRITES },
        uSunView: { value: new THREE.Vector3(0, 0, 1) },
        uLit: { value: new THREE.Color(0xffffff) },
        uShadow: { value: new THREE.Color(0x8fa4bd) },
        uSky: { value: new THREE.Color(0x6f90c0) },
        uOpacity: { value: 0.9 },
      },
      vertexShader: CUMULUS_VERT,
      fragmentShader: CUMULUS_FRAG,
      transparent: true, depthWrite: false, blending: THREE.NormalBlending,
    });
    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.frustumCulled = false;
    // First of the transparent passes, so contrails and smoke composite on top
    // of the deck. Depth testing stays on so the mountains still occlude it.
    this.mesh.renderOrder = -10;
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
      ? new CumulusLayer(scene, this.q.cloudLayers === 1 ? 90 : 210)
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
      // Sunlit cloud tops are the brightest thing in a daylight scene; they
      // have to be authored above 1.0 so tone mapping leaves them white.
      cu.uLit.value.copy(l.sunColour).multiplyScalar(0.7 + l.sunIntensity * 0.30);
      // Shaded flanks are lit by the sky, not by the horizon haze.
      cu.uShadow.value.copy(l.zenith).lerp(c.b.set(l.haze), 0.45)
        .multiplyScalar(0.62 + l.sunIntensity * 0.10);
      cu.uSky.value.copy(l.zenith).multiplyScalar(0.7 + l.ambient * 0.3);
      cu.uOpacity.value = 0.55 + l.cloudCover * 0.45;
      cu.uWind.value.copy(this.wind).multiplyScalar(2.4);
    }
    const mu = this.motes.material.uniforms;
    mu.uColor.value.copy(l.sunColour).lerp(l.haze, 0.45);
    mu.uOpacity.value = 0.10 + this.preset.dust * 0.24;
    mu.uWind.value.copy(this.wind).multiplyScalar(0.22);

    if (this.effects) {
      // Smoke and dust are lit by the same sun as the cumulus decks, so they
      // get the same treatment: the key colour is scaled by intensity and
      // authored above 1.0 so a sunlit billow tone-maps to white instead of the
      // muddy mid-grey that comes out of an unscaled light colour.
      this.effects.setLighting(
        l.sunDir,
        c.a.copy(l.sunColour).multiplyScalar(0.7 + l.sunIntensity * 0.30),
        c.b.copy(l.ambientColour).lerp(l.haze, 0.5)
          .multiplyScalar(0.6 + l.ambient * 0.55),
        0.8 + l.sunIntensity * 0.14,
      );
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
    if (this.cumulus) {
      this.cumulus.update(dt);
      // The baked cloud normals live in the billboard's own frame, which for a
      // camera-facing quad is view space, so the key light has to be rotated
      // into view space every frame as the player looks around.
      this.camera.updateMatrixWorld();
      this.cumulus.material.uniforms.uSunView.value
        .copy(this.live.sunDir)
        .transformDirection(this.camera.matrixWorldInverse);
    }
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
