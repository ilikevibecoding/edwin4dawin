// Tornado visuals: a chunky, pixel-art smoke funnel (outer ragged sheath + dense inner core) under a dark
// rotating cloud deck with a lowered wall cloud and a wide overcast layer, all driven by uniforms only (no
// per-frame geometry updates).
//
// Style: the noise texture is sampled with NearestFilter on a grid of ~1-block cells, alpha and shade are
// quantised into four bands and the funnel silhouette is a 24-sided, 16-tier stepped cone, so the smoke reads
// as blocky voxel-style dust rather than a smooth filtered cone. The funnel top dissolves before it reaches the deck
// (no ring seam) and the deck's edge colour equals STORM_COLOR, the colour the tornado feeds into
// effects.setEnvironment(), so deck, overcast, sky dome and fog agree.
import * as THREE from 'three';
import { SHARED } from '../../entityMaterial.js';
import { RNG } from '../../rng.js';

// Overcast colour shared by the deck, the haze layer and the storm sky (tornado.js scales it by daylight).
export const STORM_COLOR = [0.24, 0.235, 0.25];

// ------------------------------------------------------------------ tileable noise texture (module singleton)
let noiseTexture = null;

function valueNoiseLayer(size, period, rng, out, amp) {
  const lattice = new Float32Array(period * period);
  for (let i = 0; i < lattice.length; i++) lattice[i] = rng.next();
  const scale = period / size;
  for (let y = 0; y < size; y++) {
    const fy = y * scale, iy = Math.floor(fy), ty = fy - iy, sy = ty * ty * (3 - 2 * ty);
    const y0 = iy % period, y1 = (iy + 1) % period;
    for (let x = 0; x < size; x++) {
      const fx = x * scale, ix = Math.floor(fx), tx = fx - ix, sx = tx * tx * (3 - 2 * tx);
      const x0 = ix % period, x1 = (ix + 1) % period;
      const a = lattice[y0 * period + x0], b = lattice[y0 * period + x1], c = lattice[y1 * period + x0], d = lattice[y1 * period + x1];
      out[y * size + x] += amp * ((a + (b - a) * sx) * (1 - sy) + (c + (d - c) * sx) * sy);
    }
  }
}

function fbm(size, periods, rng) {
  const out = new Float32Array(size * size);
  let total = 0, amp = 1;
  for (const p of periods) { valueNoiseLayer(size, p, rng, out, amp); total += amp; amp *= 0.5; }
  for (let i = 0; i < out.length; i++) out[i] /= total;
  return out;
}

export function getNoiseTexture() {
  if (noiseTexture) return noiseTexture;
  const size = 64;    // coarse: with NearestFilter every texel is a visible "pixel" of smoke
  const rng = new RNG(0x70a2d0);
  const r = fbm(size, [4, 8, 16], rng);       // broad wisps
  const g = fbm(size, [3, 6, 12, 24], rng);   // mottling
  const b = fbm(size, [8, 16, 32], rng);      // detail
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(size, size);
  for (let i = 0; i < size * size; i++) {
    img.data[i * 4] = Math.round(r[i] * 255);
    img.data[i * 4 + 1] = Math.round(g[i] * 255);
    img.data[i * 4 + 2] = Math.round(b[i] * 255);
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.colorSpace = THREE.NoColorSpace;
  noiseTexture = t;
  return t;
}

// ------------------------------------------------------------------ shaders
// uDay: daylight factor (0.1 night .. 1 noon) applied instead of uSkyLight so the storm colours stay in step
// with the sky colour the tornado hands to effects.setEnvironment(); the sky tint (dust darkening) still applies.
export const STORM_GLSL = /* glsl */ `
uniform vec3 uSkyTint; uniform vec3 uFogColor; uniform float uFogNear; uniform float uFogFar; uniform float uDay;
vec3 applyStormFog(vec3 col, float dist) {
  // storms stay visible a little beyond the terrain fog so an approaching funnel reads against the sky
  float f = smoothstep(uFogNear * 1.15, uFogFar * 1.7, dist) * 0.85;
  return mix(col, uFogColor, f);
}
vec3 stormLight(vec3 col) { return col * uDay * mix(vec3(1.0), uSkyTint, 0.6); }`;

const FUNNEL_VERT = /* glsl */ `
uniform float uRBase; uniform float uRTop; uniform float uHeight; uniform float uRope; uniform float uTime; uniform float uBulge; uniform float uTiers;
uniform vec2 uSway;
varying float vH; varying float vU; varying float vDist; varying vec3 vNormal; varying vec3 vView;
void main() {
  float h = clamp(position.y, 0.0, 1.0);
  float ang = atan(position.x, position.z);
  // stepped silhouette: the radius profile is evaluated per tier (plus a fixed per-tier jitter), so the cone
  // is a stack of rings of slightly different size rather than a smooth surface
  float hs = floor(h * uTiers + 0.001) / uTiers;
  float prof = pow(hs, 1.6);
  float r = mix(uRBase, uRTop, prof);
  r *= 1.0 + uBulge * 0.12 * (fract(sin(hs * 127.1 + 3.7) * 43758.5453) - 0.5);
  // rope-out: the lower part thins to a rope and the base lifts toward the cloud
  r *= mix(1.0, 0.1 + 0.9 * prof, uRope);
  r *= 1.0 + uBulge * (0.07 * sin(ang * 2.0 + uTime * 1.7 + hs * 9.0) + 0.05 * sin(ang * 3.0 - uTime * 2.3 + hs * 5.0));
  float y = uHeight * mix(h, 0.5 + 0.5 * h, uRope);
  vec3 p = vec3(sin(ang) * r, y, cos(ang) * r);
  p.xz += uSway * (h * h);
  float wig = (0.6 + 2.5 * uRope) * sin(h * 7.0 - uTime * 1.6) * h * (1.0 - h) * 4.0;
  p.x += wig; p.z += wig * 0.6;
  vH = h; vU = uv.x;
  vNormal = normalize(normalMatrix * vec3(sin(ang), 0.0, cos(ang)));
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vView = -mv.xyz;
  vDist = length(mv.xyz);
  gl_Position = projectionMatrix * mv;
}`;

const FUNNEL_FRAG = /* glsl */ `
uniform sampler2D uNoise; uniform float uTime; uniform float uSpin; uniform float uOpacity; uniform float uDensity; uniform float uTopFade;
uniform float uRBase; uniform float uRTop; uniform float uHeight; uniform float uRope; uniform float uTiers; uniform float uCell;
uniform vec3 uColorTop; uniform vec3 uColorBase;
${STORM_GLSL}
varying float vH; varying float vU; varying float vDist; varying vec3 vNormal; varying vec3 vView;
void main() {
  // pixel smoke: the 64-texel noise is stretched so one texel covers uCell x uCell blocks on every tier
  // (the u scale follows the tier's circumference), then two channels scroll around the axis and upward
  float hs = floor(vH * uTiers + 0.001) / uTiers;
  float prof = pow(hs, 1.6);
  float r = mix(uRBase, uRTop, prof) * mix(1.0, 0.1 + 0.9 * prof, uRope);
  float around = max(8.0, 6.2832 * r / uCell) / 64.0;           // texture repeats around this tier
  float up = (uHeight / uCell) / 64.0;                            // texture repeats over the height
  vec2 uv1 = vec2(vU * around + uTime * uSpin * 0.5 + hs * 0.4, vH * up - uTime * 0.12);
  vec2 uv2 = vec2(vU * around * 0.5 - uTime * uSpin * 0.2 + hs * 0.2, vH * up * 0.5 - uTime * 0.2);
  float n = texture2D(uNoise, uv1).r * 0.6 + texture2D(uNoise, uv2).g * 0.4;
  float lo = 0.5 - 0.3 * uDensity;
  float a = clamp((n - lo) / 0.28, 0.0, 1.0);
  a = floor(a * 3.0 + 0.5) / 3.0;                        // four alpha bands: hard-edged pixel smoke
  a *= smoothstep(0.0, 0.06, vH);
  a *= 1.0 - smoothstep(uTopFade, 1.0, vH);              // dissolve into the deck: no visible top ring
  float rim = abs(dot(normalize(vNormal), normalize(vView)));
  a *= 0.55 + 0.45 * step(0.25, rim);
  float shade = floor(n * 4.0) / 4.0;                     // four shade bands
  vec3 col = mix(uColorBase, uColorTop, smoothstep(0.0, 0.8, vH)) * (0.66 + 0.5 * shade);
  col = stormLight(col);
  col = applyStormFog(col, vDist);
  gl_FragColor = vec4(col, a * uOpacity);
}`;

const DECK_VERT = /* glsl */ `
varying vec2 vUv; varying float vR; varying float vDist;
void main() {
  vUv = uv; vR = length(position.xz);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vDist = length(mv.xyz);
  gl_Position = projectionMatrix * mv;
}`;

// The deck is not lit: uColor is the storm sky colour itself, darkened toward the centre (mesocyclone) and
// mottled in bands, so its fading edge disappears into the dome.
const DECK_FRAG = /* glsl */ `
uniform sampler2D uNoise; uniform float uTime; uniform vec3 uColor; uniform float uOpacity; uniform float uEdge; uniform float uCentre;
${STORM_GLSL}
varying vec2 vUv; varying float vR; varying float vDist;
void main() {
  float c = cos(uTime * 0.03), s = sin(uTime * 0.03);
  vec2 q = vUv - 0.5; q = vec2(c * q.x - s * q.y, s * q.x + c * q.y);
  float n = texture2D(uNoise, q * 1.2 + 0.5).g * 0.6 + texture2D(uNoise, q * 3.0 - uTime * 0.005).r * 0.4;
  float edge = vR + (n - 0.5) * 0.45;
  float a = 1.0 - smoothstep(uEdge, 1.0, edge);
  float shade = floor(n * 3.0 + 0.5) / 3.0;
  vec3 col = uColor * (0.8 + 0.4 * shade) * mix(uCentre, 1.0, smoothstep(0.0, 1.0, vR));
  col = mix(col, applyStormFog(col, vDist), 0.5);
  gl_FragColor = vec4(col, a * uOpacity);
}`;

function sharedUniforms() {
  return { uSkyTint: SHARED.uSkyTint, uFogColor: SHARED.uFogColor, uFogNear: SHARED.uFogNear, uFogFar: SHARED.uFogFar, uDay: { value: 1 } };
}

function funnelMaterial(noise, { density, opacity, spin, colorTop, colorBase, bulge, topFade, cell }) {
  return new THREE.ShaderMaterial({
    uniforms: {
      ...sharedUniforms(),
      uNoise: { value: noise }, uTime: { value: 0 }, uSpin: { value: spin }, uOpacity: { value: opacity }, uDensity: { value: density }, uTopFade: { value: topFade }, uCell: { value: cell },
      uColorTop: { value: new THREE.Vector3(...colorTop) }, uColorBase: { value: new THREE.Vector3(...colorBase) },
      uRBase: { value: 6 }, uRTop: { value: 30 }, uHeight: { value: 60 }, uRope: { value: 1 }, uBulge: { value: bulge }, uTiers: { value: FUNNEL_TIERS }, uSway: { value: new THREE.Vector2() },
    },
    vertexShader: FUNNEL_VERT, fragmentShader: FUNNEL_FRAG, transparent: true, depthWrite: false, side: THREE.DoubleSide,
  });
}

function deckMaterial(noise, { opacity, edge, centre }) {
  return new THREE.ShaderMaterial({
    uniforms: { ...sharedUniforms(), uNoise: { value: noise }, uTime: { value: 0 }, uColor: { value: new THREE.Vector3(...STORM_COLOR) }, uOpacity: { value: opacity }, uEdge: { value: edge }, uCentre: { value: centre } },
    vertexShader: DECK_VERT, fragmentShader: DECK_FRAG, transparent: true, depthWrite: false, side: THREE.DoubleSide,
  });
}

// Unit-radius disc made of concentric rings whose centre sags downward (mesocyclone).
function deckGeometry(rings, segs, sag) {
  const pos = [], uv = [], idx = [];
  for (let i = 0; i <= rings; i++) {
    const rr = i / rings;
    const y = -sag * (1 - rr) * (1 - rr);
    for (let j = 0; j <= segs; j++) {
      const a = (j / segs) * Math.PI * 2;
      const x = Math.cos(a) * rr, z = Math.sin(a) * rr;
      pos.push(x, y, z); uv.push(x * 0.5 + 0.5, z * 0.5 + 0.5);
    }
  }
  for (let i = 0; i < rings; i++) for (let j = 0; j < segs; j++) {
    const a = i * (segs + 1) + j, b = a + segs + 1;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

const FUNNEL_TIERS = 16;

export class FunnelVisual {
  constructor(scene) {
    this.scene = scene;
    const noise = getNoiseTexture();
    this.group = new THREE.Group();
    // 24 radial segments (visibly faceted) and two height segments per tier (vertical wall + ledge)
    this.tube = new THREE.CylinderGeometry(1, 1, 1, 24, FUNNEL_TIERS * 2, true);
    this.tube.translate(0, 0.5, 0);
    const top = [STORM_COLOR[0] * 0.8, STORM_COLOR[1] * 0.8, STORM_COLOR[2] * 0.8];
    this.outer = new THREE.Mesh(this.tube, funnelMaterial(noise, { density: 0.65, opacity: 0.9, spin: 0.55, colorTop: top, colorBase: [0.5, 0.44, 0.36], bulge: 1, topFade: 0.8, cell: 1.0 }));
    this.inner = new THREE.Mesh(this.tube, funnelMaterial(noise, { density: 1.0, opacity: 0.97, spin: 0.9, colorTop: [top[0] * 0.7, top[1] * 0.7, top[2] * 0.7], colorBase: [0.36, 0.31, 0.26], bulge: 0.6, topFade: 0.86, cell: 1.0 }));
    this.outer.renderOrder = 8; this.inner.renderOrder = 7;
    this.deckGeo = deckGeometry(7, 56, 7);
    this.hazeGeo = deckGeometry(4, 48, 0);
    this.deck = new THREE.Mesh(this.deckGeo, deckMaterial(noise, { opacity: 0.96, edge: 0.45, centre: 0.5 }));
    this.wall = new THREE.Mesh(this.deckGeo, deckMaterial(noise, { opacity: 0.9, edge: 0.3, centre: 0.4 }));
    // wide overcast layer above the deck: darker toward the storm, its rim equal to the sky colour
    this.haze = new THREE.Mesh(this.hazeGeo, deckMaterial(noise, { opacity: 0.9, edge: 0.05, centre: 0.72 }));
    this.deck.renderOrder = 6; this.wall.renderOrder = 5; this.haze.renderOrder = 4;
    for (const m of [this.outer, this.inner, this.deck, this.wall, this.haze]) { m.frustumCulled = false; this.group.add(m); }
    this.group.visible = false;
    scene.add(this.group);
  }

  // s: {x, z, baseY, topY, radius, rope, time, fade, deckFade, day, sky:[r,g,b], swayX, swayZ}
  update(s) {
    this.group.visible = s.fade > 0.005 || s.deckFade > 0.005;
    this.group.position.set(s.x, s.baseY, s.z);
    const H = Math.max(10, s.topY - s.baseY);
    const rBase = s.radius * 0.75, rTop = s.radius * 2.4 + 5;
    const setFunnel = (mesh, kb, kt, opacity) => {
      const u = mesh.material.uniforms;
      // the funnel runs a few blocks into the deck and dissolves before it gets there
      u.uRBase.value = rBase * kb; u.uRTop.value = rTop * kt; u.uHeight.value = H + 4; u.uRope.value = s.rope; u.uTime.value = s.time;
      u.uSway.value.set(s.swayX, s.swayZ);
      u.uOpacity.value = s.fade * opacity;
      u.uDay.value = s.day;
    };
    setFunnel(this.outer, 1, 1, 0.9);
    setFunnel(this.inner, 0.55, 0.6, 0.97);
    const deckR = 32 + s.radius * 1.5;
    this.deck.position.set(s.swayX, H, s.swayZ);
    this.deck.scale.set(deckR, 1, deckR);
    this.wall.position.set(s.swayX * 0.9, H - 4, s.swayZ * 0.9);
    this.wall.scale.set(deckR * 0.45, 0.6, deckR * 0.45);
    const hazeR = 100 + s.radius * 3;
    this.haze.position.set(s.swayX * 0.5, H + 10, s.swayZ * 0.5);
    this.haze.scale.set(hazeR, 1, hazeR);
    const setDeck = (mesh, time, opacity, colourMul) => {
      const u = mesh.material.uniforms;
      u.uTime.value = time; u.uOpacity.value = opacity * s.deckFade; u.uDay.value = s.day;
      u.uColor.value.set(s.sky[0] * colourMul, s.sky[1] * colourMul, s.sky[2] * colourMul);
    };
    setDeck(this.deck, s.time, 0.96, 1);
    setDeck(this.wall, s.time * 1.3, 0.9, 0.7);
    setDeck(this.haze, s.time * 0.4, 0.9, 1);
  }

  dispose() {
    this.scene.remove(this.group);
    for (const m of [this.outer, this.inner, this.deck, this.wall, this.haze]) m.material.dispose();
    this.tube.dispose();
    this.deckGeo.dispose();
    this.hazeGeo.dispose();
  }
}
