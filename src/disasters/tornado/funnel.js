// Tornado visuals: a procedurally textured, shader-deformed funnel (outer ragged sheath + dense inner
// core), a dark rotating cloud deck with a lowered wall cloud, all driven by uniforms only (no per-frame
// geometry updates). Uses the SHARED fog/light uniforms so it matches the terrain's fog and day/night.
import * as THREE from 'three';
import { SHARED } from '../../entityMaterial.js';
import { RNG } from '../../rng.js';

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
  const size = 256;
  const rng = new RNG(0x70a2d0);
  const r = fbm(size, [6, 12, 24, 48], rng);      // broad wisps
  const g = fbm(size, [4, 8, 16, 32, 64], rng);   // finer mottling
  const b = fbm(size, [16, 32, 64], rng);         // detail
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
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearFilter;
  t.generateMipmaps = false;
  t.colorSpace = THREE.NoColorSpace;
  noiseTexture = t;
  return t;
}

// ------------------------------------------------------------------ shaders
const FOG_GLSL = /* glsl */ `
uniform float uSkyLight; uniform vec3 uSkyTint; uniform vec3 uFogColor; uniform float uFogNear; uniform float uFogFar;
vec3 applyStormFog(vec3 col, float dist) {
  // storms stay visible a little beyond the terrain fog so an approaching funnel reads against the sky
  float f = smoothstep(uFogNear * 1.15, uFogFar * 1.7, dist) * 0.85;
  return mix(col, uFogColor, f);
}
vec3 stormLight(vec3 col) { return col * max(0.3, uSkyLight) * mix(vec3(1.0), uSkyTint, 0.6); }`;

const FUNNEL_VERT = /* glsl */ `
uniform float uRBase; uniform float uRTop; uniform float uHeight; uniform float uRope; uniform float uTime; uniform float uBulge;
uniform vec2 uSway;
varying float vH; varying float vU; varying float vDist; varying vec3 vNormal; varying vec3 vView;
void main() {
  float h = clamp(position.y, 0.0, 1.0);
  float ang = atan(position.x, position.z);
  float prof = pow(h, 1.6);
  float r = mix(uRBase, uRTop, prof);
  // rope-out: the lower part thins to a rope and the base lifts toward the cloud
  r *= mix(1.0, 0.1 + 0.9 * prof, uRope);
  r *= 1.0 + uBulge * (0.07 * sin(ang * 2.0 + uTime * 1.7 + h * 9.0) + 0.05 * sin(ang * 3.0 - uTime * 2.3 + h * 5.0));
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
uniform sampler2D uNoise; uniform float uTime; uniform float uSpin; uniform float uOpacity; uniform float uDensity;
uniform vec3 uColorTop; uniform vec3 uColorBase;
${FOG_GLSL}
varying float vH; varying float vU; varying float vDist; varying vec3 vNormal; varying vec3 vView;
void main() {
  // two helical layers scrolling around the axis and upward
  vec2 uv1 = vec2(vU * 2.0 + uTime * uSpin + vH * 1.2, vH * 2.2 - uTime * 0.3);
  vec2 uv2 = vec2(vU * 3.0 + uTime * uSpin * 0.55 + vH * 0.5, vH * 3.5 - uTime * 0.55);
  float n = texture2D(uNoise, uv1).r * 0.62 + texture2D(uNoise, uv2).g * 0.38;
  float lo = 0.5 - 0.3 * uDensity;
  float a = smoothstep(lo, lo + 0.28, n);
  a *= smoothstep(0.0, 0.06, vH);
  float rim = abs(dot(normalize(vNormal), normalize(vView)));
  a *= 0.25 + 0.75 * smoothstep(0.0, 0.45, rim);
  vec3 col = mix(uColorBase, uColorTop, smoothstep(0.0, 0.8, vH)) * (0.75 + 0.5 * n);
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

const DECK_FRAG = /* glsl */ `
uniform sampler2D uNoise; uniform float uTime; uniform vec3 uColor; uniform float uOpacity; uniform float uEdge;
${FOG_GLSL}
varying vec2 vUv; varying float vR; varying float vDist;
void main() {
  float c = cos(uTime * 0.03), s = sin(uTime * 0.03);
  vec2 q = vUv - 0.5; q = vec2(c * q.x - s * q.y, s * q.x + c * q.y);
  float n = texture2D(uNoise, q * 2.5 + 0.5).g * 0.6 + texture2D(uNoise, q * 6.0 - uTime * 0.005).r * 0.4;
  float edge = vR + (n - 0.5) * 0.45;
  float a = 1.0 - smoothstep(uEdge, 1.0, edge);
  vec3 col = uColor * (0.7 + 0.6 * n) * (0.55 + 0.45 * vR);
  col = stormLight(col);
  // high cloud: only half the haze so the deck stays dark against the bright horizon
  col = mix(col, applyStormFog(col, vDist), 0.5);
  gl_FragColor = vec4(col, a * uOpacity);
}`;

function sharedUniforms() {
  return { uSkyLight: SHARED.uSkyLight, uSkyTint: SHARED.uSkyTint, uFogColor: SHARED.uFogColor, uFogNear: SHARED.uFogNear, uFogFar: SHARED.uFogFar };
}

function funnelMaterial(noise, { density, opacity, spin, colorTop, colorBase, bulge }) {
  return new THREE.ShaderMaterial({
    uniforms: {
      ...sharedUniforms(),
      uNoise: { value: noise }, uTime: { value: 0 }, uSpin: { value: spin }, uOpacity: { value: opacity }, uDensity: { value: density },
      uColorTop: { value: new THREE.Vector3(...colorTop) }, uColorBase: { value: new THREE.Vector3(...colorBase) },
      uRBase: { value: 6 }, uRTop: { value: 30 }, uHeight: { value: 60 }, uRope: { value: 1 }, uBulge: { value: bulge }, uSway: { value: new THREE.Vector2() },
    },
    vertexShader: FUNNEL_VERT, fragmentShader: FUNNEL_FRAG, transparent: true, depthWrite: false, side: THREE.DoubleSide,
  });
}

function deckMaterial(noise, { color, opacity, edge }) {
  return new THREE.ShaderMaterial({
    uniforms: { ...sharedUniforms(), uNoise: { value: noise }, uTime: { value: 0 }, uColor: { value: new THREE.Vector3(...color) }, uOpacity: { value: opacity }, uEdge: { value: edge } },
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

export class FunnelVisual {
  constructor(scene) {
    this.scene = scene;
    const noise = getNoiseTexture();
    this.group = new THREE.Group();
    this.tube = new THREE.CylinderGeometry(1, 1, 1, 48, 28, true);
    this.tube.translate(0, 0.5, 0);
    this.outer = new THREE.Mesh(this.tube, funnelMaterial(noise, { density: 0.65, opacity: 0.9, spin: 0.55, colorTop: [0.3, 0.29, 0.3], colorBase: [0.5, 0.44, 0.36], bulge: 1 }));
    this.inner = new THREE.Mesh(this.tube, funnelMaterial(noise, { density: 1.0, opacity: 0.97, spin: 0.9, colorTop: [0.2, 0.19, 0.2], colorBase: [0.36, 0.31, 0.26], bulge: 0.6 }));
    this.outer.renderOrder = 8; this.inner.renderOrder = 7;
    this.deckGeo = deckGeometry(7, 56, 7);
    this.hazeGeo = deckGeometry(4, 48, 0);
    this.deck = new THREE.Mesh(this.deckGeo, deckMaterial(noise, { color: [0.24, 0.235, 0.25], opacity: 0.96, edge: 0.45 }));
    this.wall = new THREE.Mesh(this.deckGeo, deckMaterial(noise, { color: [0.17, 0.165, 0.18], opacity: 0.9, edge: 0.3 }));
    // wide, faint overcast layer above the deck so the sky around the storm reads as a dark thunderhead
    this.haze = new THREE.Mesh(this.hazeGeo, deckMaterial(noise, { color: [0.25, 0.245, 0.26], opacity: 0.9, edge: 0.05 }));
    this.deck.renderOrder = 6; this.wall.renderOrder = 5; this.haze.renderOrder = 4;
    for (const m of [this.outer, this.inner, this.deck, this.wall, this.haze]) { m.frustumCulled = false; this.group.add(m); }
    this.group.visible = false;
    scene.add(this.group);
    this.hz = 0;
  }

  // s: {x, z, baseY, topY, radius, rope, time, fade, swayX, swayZ, spinRate}
  update(s) {
    this.group.visible = s.fade > 0.005;
    this.group.position.set(s.x, s.baseY, s.z);
    const H = Math.max(10, s.topY - s.baseY);
    const rBase = s.radius * 0.75, rTop = s.radius * 2.4 + 5;
    const setFunnel = (mesh, kb, kt) => {
      const u = mesh.material.uniforms;
      u.uRBase.value = rBase * kb; u.uRTop.value = rTop * kt; u.uHeight.value = H; u.uRope.value = s.rope; u.uTime.value = s.time;
      u.uSway.value.set(s.swayX, s.swayZ);
      u.uOpacity.value = s.fade * (mesh === this.outer ? 0.9 : 0.97);
    };
    setFunnel(this.outer, 1, 1);
    setFunnel(this.inner, 0.55, 0.6);
    const deckR = 32 + s.radius * 1.5;
    this.deck.position.set(s.swayX, H, s.swayZ);
    this.deck.scale.set(deckR, 1, deckR);
    this.wall.position.set(s.swayX * 0.9, H - 4, s.swayZ * 0.9);
    this.wall.scale.set(deckR * 0.45, 0.6, deckR * 0.45);
    const hazeR = 100 + s.radius * 3;
    this.haze.position.set(s.swayX * 0.5, H + 10, s.swayZ * 0.5);
    this.haze.scale.set(hazeR, 1, hazeR);
    const cloudFade = Math.min(1, s.fade * 1.5);
    this.deck.material.uniforms.uTime.value = s.time;
    this.deck.material.uniforms.uOpacity.value = 0.96 * cloudFade;
    this.wall.material.uniforms.uTime.value = s.time * 1.3;
    this.wall.material.uniforms.uOpacity.value = 0.9 * cloudFade;
    this.haze.material.uniforms.uTime.value = s.time * 0.4;
    this.haze.material.uniforms.uOpacity.value = 0.9 * cloudFade;
  }

  dispose() {
    this.scene.remove(this.group);
    for (const m of [this.outer, this.inner, this.deck, this.wall, this.haze]) m.material.dispose();
    this.tube.dispose();
    this.deckGeo.dispose();
    this.hazeGeo.dispose();
  }
}
