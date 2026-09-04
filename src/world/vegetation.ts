import * as THREE from 'three';
import { Rng, hash2 } from '../core/seed';
import { perlin2, smoothstep } from '../core/noise';
import { GLSL_NOISE } from '../render/shaders/common.glsl';
import { CELL, HALF, Zone, type WorldMap } from './map';
import { balanceGroundIbl } from './terrain';
import { layerMask, type ViewCull } from './culling';

/**
 * Procedural planting. Two instanced geometry families cover five archetypes:
 *  - crown trees (broadleaf hardwood, tall emergent, squat mangrove, low shrub): a main puff and two
 *    lobes of displaced icospheres on a short trunk (66 triangles). Lobe placement, squash and trunk
 *    length are per-instance shader parameters, so no two crowns share a silhouette.
 *  - palms: bent tapered trunk and seven drooping frond strips (52 triangles) with per-instance
 *    frond rotation and droop.
 * Every plant also exists as a 2-triangle camera-facing card whose texture blends between a side
 * view and a top view with the viewing elevation. Tiles of 900 m switch between the 3D meshes (near
 * the camera, up to an instance budget) and the cards (everything else), so a dense island canopy
 * costs about the same as the sparse planting it replaces. Cards are thinned with distance. Shadows
 * always come from the light-facing cards; for near tiles the card mesh sits on the shadow-only layers
 * so the main pass never touches it. Tiles are culled against the camera frustum with their own
 * world-space boxes, and cast shadows only when their footprint can shade something in view.
 */

// ---------------------------------------------------------------- procedural textures

/** Palm atlas: frond cut-out on the left half, ringed bark on the right. */
function frondTexture(rng: Rng): THREE.CanvasTexture {
  const w = 256, h = 512;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#8a7458'; ctx.fillRect(w / 2, 0, w / 2, h);
  for (let y = 0; y < h; y += 9) { ctx.fillStyle = y % 18 === 0 ? '#6e5a44' : '#9a8466'; ctx.fillRect(w / 2, y, w / 2, 4); }
  for (let i = 0; i < 140; i++) { ctx.fillStyle = `rgba(40,30,20,${0.1 + rng.next() * 0.2})`; ctx.fillRect(w / 2 + rng.next() * w / 2, rng.next() * h, 3 + rng.next() * 6, 2); }
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, w / 2, h); ctx.clip();
  ctx.strokeStyle = '#6b7a3a';
  ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(w / 4, h); ctx.lineTo(w / 4, 8); ctx.stroke();
  const fw = w / 2;
  for (let i = 0; i < 46; i++) {
    const t = i / 46;
    const y = h - 20 - t * (h - 40);
    const len = (fw / 2 - 4) * (0.45 + 0.55 * Math.sin(Math.PI * Math.min(1, t * 1.15)));
    const g = 60 + Math.round(40 * Math.sin(t * 7 + i));
    ctx.fillStyle = `rgb(${40 + (i % 3) * 8}, ${110 + g * 0.6}, ${40 + (i % 5) * 5})`;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(fw / 2, y);
      ctx.quadraticCurveTo(fw / 2 + side * len * 0.5, y - 18, fw / 2 + side * len, y - 34 + 6 * Math.sin(i));
      ctx.quadraticCurveTo(fw / 2 + side * len * 0.55, y - 6, fw / 2, y + 4);
      ctx.fill();
    }
  }
  ctx.restore();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** Impostor atlas, 6 square tiles: [crown side A, crown side B, palm side, crown top A, crown top B,
 *  palm top]. Grey = shading (tinted per instance), alpha = cut-out. Drawn with per-pixel noise so
 *  edges are ragged; the two crown variants differ in lobe layout so neighbouring cards do not match. */
const ATLAS_TILES = 6;
function cardAtlas(rng: Rng): THREE.CanvasTexture {
  const T = 128, w = T * ATLAS_TILES, h = T;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(w, h);
  const d = img.data;
  const put = (x: number, y: number, g: number, a: number) => {
    const i = (y * w + x) * 4;
    if (a <= d[i + 3]) return;
    d[i] = d[i + 1] = d[i + 2] = Math.round(255 * Math.min(1, Math.max(0, g)));
    d[i + 3] = Math.round(255 * Math.min(1, a));
  };
  // canvas rows run top to bottom: v = 1 - y/T
  const blob = (tile: number, cx: number, cy: number, r: number, gTop: number, gBot: number, seed: number) => {
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
      const u = (x + 0.5) / T, v = 1 - (y + 0.5) / T;
      const dx = u - cx, dy = v - cy;
      const ang = Math.atan2(dy, dx);
      const rr = r * (1 + 0.14 * perlin2(Math.cos(ang) * 2.1 + seed, Math.sin(ang) * 2.1 + seed * 0.7) + 0.06 * perlin2(u * 30 + seed, v * 30));
      const dist = Math.hypot(dx, dy);
      if (dist > rr) continue;
      const k = dist / rr;
      // lit from the top: bright cap, dark belly, ragged leaf clusters
      const lit = 0.5 + 0.5 * (dy / rr);
      const leaf = 0.5 + 0.5 * perlin2(u * 22 + seed * 3, v * 22 - seed);
      const g = (gBot + (gTop - gBot) * lit) * (0.82 + 0.36 * leaf) * (1 - 0.35 * k * k);
      put(tile * T + x, y, g, 1);
    }
  };
  const disc = (tile: number, cx: number, cy: number, r: number, seed: number) => {
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
      const u = (x + 0.5) / T, v = 1 - (y + 0.5) / T;
      const dx = u - cx, dy = v - cy;
      const ang = Math.atan2(dy, dx);
      const rr = r * (1 + 0.16 * perlin2(Math.cos(ang) * 2.3 + seed, Math.sin(ang) * 2.3 - seed));
      const dist = Math.hypot(dx, dy);
      if (dist > rr) continue;
      const k = dist / rr;
      const leaf = 0.5 + 0.5 * perlin2(u * 26 + seed, v * 26 + seed * 2);
      const lobes = 0.5 + 0.5 * perlin2(u * 9 - seed, v * 9 + seed);
      const g = (0.62 + 0.5 * lobes) * (0.8 + 0.4 * leaf) * (1 - 0.45 * k * k);
      put(tile * T + x, y, g, 1);
    }
  };
  const trunk = (tile: number, cx: number, v0: number, v1: number, halfW: number, g: number) => {
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
      const u = (x + 0.5) / T, v = 1 - (y + 0.5) / T;
      if (v < v0 || v > v1 || Math.abs(u - cx) > halfW * (1 - 0.4 * (v - v0) / (v1 - v0))) continue;
      put(tile * T + x, y, g * (0.85 + 0.3 * perlin2(u * 40, v * 40)), 1);
    }
  };
  const frondStar = (tile: number, cx: number, cy: number, r: number, n: number, droop: number, seed: number) => {
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 + 0.4 * (perlin2(k * 1.7 + seed, seed) );
      for (let s = 0; s <= 1; s += 0.01) {
        const len = r * (0.75 + 0.25 * perlin2(k * 3.1, seed + k));
        const x = cx + Math.cos(a) * len * s, y = cy + Math.sin(a) * len * s * (1 - droop) - droop * r * s * s;
        const wdt = 0.045 * r * (1 - 0.5 * s) / 0.25;
        for (let t = -1; t <= 1; t += 0.25) {
          const px = x - Math.sin(a) * wdt * t, py = y + Math.cos(a) * wdt * t;
          const ix = Math.floor(px * T), iy = Math.floor((1 - py) * T);
          if (ix < 0 || iy < 0 || ix >= T || iy >= T) continue;
          put(tile * T + ix, iy, 0.75 + 0.35 * s - 0.2 * Math.abs(t), 1);
        }
      }
    }
  };
  // 0: crown side view A (crown centre at v=0.5, radius 0.385; trunk below): round, two low lobes
  trunk(0, 0.5, 0.0, 0.3, 0.035, 0.42);
  blob(0, 0.5, 0.5, 0.385, 1.15, 0.45, 3.0 + rng.next());
  blob(0, 0.36, 0.42, 0.2, 0.95, 0.4, 7.0 + rng.next());
  blob(0, 0.63, 0.44, 0.19, 1.0, 0.42, 11.0 + rng.next());
  // 1: crown side view B: taller, lopsided, with a high lobe and a gap in the skirt
  trunk(1, 0.5, 0.0, 0.34, 0.03, 0.4);
  blob(1, 0.47, 0.52, 0.34, 1.1, 0.42, 21.0 + rng.next());
  blob(1, 0.66, 0.6, 0.22, 1.2, 0.5, 25.0 + rng.next());
  blob(1, 0.3, 0.4, 0.17, 0.9, 0.38, 29.0 + rng.next());
  blob(1, 0.56, 0.3, 0.16, 0.85, 0.35, 33.0 + rng.next());
  // 2: palm side view (crown at v=0.5, fronds radius 0.23; trunk to the bottom)
  trunk(2, 0.5, 0.0, 0.5, 0.022, 0.55);
  frondStar(2, 0.5, 0.52, 0.24, 9, 0.35, 2.0 + rng.next());
  // 3, 4: crown top views
  disc(3, 0.5, 0.5, 0.4, 5.0 + rng.next());
  disc(4, 0.5, 0.5, 0.38, 15.0 + rng.next());
  disc(4, 0.68, 0.6, 0.2, 17.0 + rng.next());
  // 5: palm top view
  frondStar(5, 0.5, 0.5, 0.26, 9, 0.0, 6.0 + rng.next());
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) { const i = ((y * w) + 5 * T + x) * 4; if (d[i + 3] === 0 && Math.hypot((x + 0.5) / T - 0.5, (y + 0.5) / T - 0.5) < 0.05) { d[i] = d[i + 1] = d[i + 2] = 140; d[i + 3] = 255; } }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.NoColorSpace;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.anisotropy = 4;
  tex.generateMipmaps = true;
  return tex;
}

// ---------------------------------------------------------------- geometry families

function puff(seed: number, part: number): { pos: number[]; nrm: number[]; part: number[] } {
  const g = new THREE.IcosahedronGeometry(1, 0);
  const p = g.getAttribute('position') as THREE.BufferAttribute;
  const pos: number[] = [], nrm: number[] = [], parts: number[] = [];
  for (let k = 0; k < p.count; k++) {
    const x = p.getX(k), y = p.getY(k), z = p.getZ(k);
    const dsp = 1 + 0.3 * perlin2(x * 2.1 + seed, y * 2.1 + z * 1.7 - seed);
    pos.push(x * dsp, y * dsp * (y < 0 ? 0.65 : 1.0), z * dsp);
    nrm.push(x, y, z);
    parts.push(part);
  }
  return { pos, nrm, part: parts };
}

/** Unit crown tree: trunk (3-sided prism, part 0) + main puff (part 1) + two side lobes (parts 2, 3),
 *  66 triangles. The shader places and sizes the lobes per instance so no two crowns match. */
function crownGeometry(): THREE.BufferGeometry {
  const pos: number[] = [], nrm: number[] = [], part: number[] = [], uv: number[] = [];
  // trunk: 3 quads (6 tris) from y=0 to y=1, radius 0.045
  const r = 0.045, sides = 3;
  for (let j = 0; j < sides; j++) {
    const a0 = (j / sides) * Math.PI * 2, a1 = ((j + 1) / sides) * Math.PI * 2;
    const x0 = Math.cos(a0) * r, z0 = Math.sin(a0) * r, x1 = Math.cos(a1) * r, z1 = Math.sin(a1) * r;
    const nx = Math.cos((a0 + a1) / 2), nz = Math.sin((a0 + a1) / 2);
    const quad = [[x0, 0, z0], [x1, 0, z1], [x1, 1, z1], [x0, 0, z0], [x1, 1, z1], [x0, 1, z0]];
    for (const [x, y, z] of quad) { pos.push(x, y, z); nrm.push(nx, 0, nz); part.push(0); uv.push(0, y); }
  }
  for (const [seed, pid] of [[3.1, 1], [8.7, 2], [14.3, 3]]) {
    const pf = puff(seed, pid);
    pos.push(...pf.pos); nrm.push(...pf.nrm); part.push(...pf.part);
    for (let i = 0; i < pf.part.length; i++) uv.push(0, 0);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('aPart', new THREE.Float32BufferAttribute(part, 1));
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 1.2, 0), 2.6);
  return g;
}

/** Unit palm: curved tapered trunk (part 0, 3 segments x 4 sides) + 7 two-segment frond strips
 *  (parts 1..7) radiating from the top. uv.x selects frond/bark in the atlas, uv.y runs along. */
function palmGeometry(): THREE.BufferGeometry {
  const pos: number[] = [], nrm: number[] = [], uv: number[] = [], part: number[] = [];
  const segs = 3, sides = 4;
  const ring = (t: number): [number, number, number][] => {
    const r = 0.045 * (1 - 0.3 * t);
    const out: [number, number, number][] = [];
    for (let j = 0; j <= sides; j++) { const a = (j / sides) * Math.PI * 2 + Math.PI / 4; out.push([Math.cos(a) * r, t, Math.sin(a) * r]); }
    return out;
  };
  for (let i = 0; i < segs; i++) {
    const r0 = ring(i / segs), r1 = ring((i + 1) / segs);
    for (let j = 0; j < sides; j++) {
      const a = (j + 0.5) / sides * Math.PI * 2 + Math.PI / 4;
      const nx = Math.cos(a), nz = Math.sin(a);
      const quad = [r0[j], r0[j + 1], r1[j + 1], r0[j], r1[j + 1], r1[j]];
      const us = [0.55 + 0.4 * (j / sides), 0.55 + 0.4 * ((j + 1) / sides), 0.55 + 0.4 * ((j + 1) / sides), 0.55 + 0.4 * (j / sides), 0.55 + 0.4 * ((j + 1) / sides), 0.55 + 0.4 * (j / sides)];
      quad.forEach(([x, y, z], k) => { pos.push(x, y, z); nrm.push(nx, 0, nz); uv.push(us[k], y); part.push(0); });
    }
  }
  const n = 7;
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2;
    const len = 0.56, width = 0.14;
    const pts: [number, number, number][] = [];
    for (let i = 0; i <= 2; i++) {
      const t = i / 2;
      const rr = len * t;
      const yv = 1.0 + 0.16 * Math.sin(t * Math.PI * 0.8) - 0.5 * t * t;
      const px = Math.cos(a) * rr, pz = Math.sin(a) * rr;
      const wx = -Math.sin(a) * width * (1 - t * 0.25), wz = Math.cos(a) * width * (1 - t * 0.25);
      pts.push([px - wx, yv, pz - wz], [px + wx, yv, pz + wz]);
    }
    const tri = (i0: number, i1: number, i2: number) => {
      for (const i of [i0, i1, i2]) {
        pos.push(pts[i][0], pts[i][1], pts[i][2]); nrm.push(0, 1, 0); part.push(k + 1);
        const row = Math.floor(i / 2), side = i % 2;
        uv.push(side * 0.5, 1 - row / 2);
      }
    };
    tri(0, 2, 1); tri(1, 2, 3); tri(2, 4, 3); tri(3, 4, 5);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('aPart', new THREE.Float32BufferAttribute(part, 1));
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0.8, 0), 1.2);
  return g;
}

function cardGeometry(): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0], 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0], 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1], 2));
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 2);
  return g;
}

// ---------------------------------------------------------------- shaders

const COMMON_VERT = /* glsl */ `
uniform float uTime;
uniform float uWind;
attribute float aPart;
attribute vec4 aVar; // archetype, seed, crown squash / frond droop, trunk length
varying float vPart;
varying vec3 vWP;
${GLSL_NOISE}
`;

// crown family: per-instance puff arrangement (positions are puff-local unit spheres)
const CROWN_NORMAL = /* glsl */ `
vec3 objectNormal = normal;
// foliage normals lean toward the sky so a crown shades as a lit mass of leaves, not a hard ball
if (aPart > 0.5) objectNormal = normalize(mix(normalize(objectNormal * vec3(1.0, 1.0 / max(aVar.z, 0.3), 1.0)), vec3(0.0, 1.0, 0.0), 0.35));
#ifdef USE_TANGENT
vec3 objectTangent = vec3( tangent.xyz );
#endif
`;
const CROWN_VERTEX = /* glsl */ `
vec3 transformed = position;
{
  float seed = aVar.y;
  float squash = aVar.z;
  float trunkLen = aVar.w;
  if (aPart < 0.5) {
    transformed.y *= trunkLen + 0.25 * squash;
    transformed.xz *= 0.8 + 0.5 * step(0.5, aVar.x) * step(aVar.x, 1.5);
  } else {
    // main puff on the trunk axis; two lobes on opposite-ish sides at hashed radius, size and height
    vec2 hs = hash22(vec2(seed * 91.7 + aPart * 3.0, seed * 37.1 - aPart));
    vec2 hs2 = hash22(vec2(seed * 13.3 - aPart, seed * 71.9 + aPart * 5.0));
    float main = step(aPart, 1.5);
    float ang = hash11(seed * 3.7) * 6.2831 + (aPart - 2.0) * (2.2 + 1.3 * hs.x);
    float rad = mix(0.5 + 0.4 * hs.y, 0.0, main);
    float ps = mix(0.5 + 0.35 * hs2.x, 1.0, main);
    vec3 centre = vec3(cos(ang) * rad, trunkLen + 0.85 * squash + mix(-0.2 + 0.5 * hs2.y, 0.0, main) * squash, sin(ang) * rad);
    transformed = centre + transformed * ps * vec3(1.15, squash, 1.05);
  }
  // wind: sway grows with height, phase from the instance position so no two plants move together
  vec3 iw = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  float phase = iw.x * 0.13 + iw.z * 0.17;
  float sway = sin(uTime * 1.3 + phase) * 0.6 + sin(uTime * 2.7 + phase * 1.9) * 0.4;
  float k = transformed.y * transformed.y * uWind * 0.035;
  transformed.x += sway * k;
  transformed.z += cos(uTime * 1.1 + phase) * k * 0.6;
  vPart = aPart;
  vWP = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;
}
`;
const CROWN_FRAG_PARS = /* glsl */ `
varying float vPart;
varying vec3 vWP;
${GLSL_NOISE}
`;
const CROWN_FRAG = /* glsl */ `
#include <color_fragment>
{
  if (vPart < 0.5) {
    diffuseColor.rgb = vec3(0.30, 0.23, 0.16) * (0.8 + 0.4 * vnoise(vWP.xz * 3.0 + vWP.y * 2.0));
  } else {
    // leaf clusters: fine value noise breaks the smooth shading of the puffs
    float leaf = vnoise(vWP.xz * 1.7 + vWP.y * 1.3);
    diffuseColor.rgb *= 0.78 + 0.44 * leaf;
  }
}
`;

// palm family: per-instance frond rotation and droop about the trunk top, trunk lean
const PALM_NORMAL = /* glsl */ `
vec3 objectNormal = normal;
if (aPart > 0.5) {
  float seed = aVar.y;
  float rot = hash11(seed * 7.7 + aPart) * 0.9 - 0.45 + hash11(seed * 3.3) * 6.2831;
  float c = cos(rot), s = sin(rot);
  objectNormal.xz = mat2(c, -s, s, c) * objectNormal.xz;
}
#ifdef USE_TANGENT
vec3 objectTangent = vec3( tangent.xyz );
#endif
`;
const PALM_VERTEX = /* glsl */ `
vec3 transformed = position;
{
  float seed = aVar.y;
  float lean = 0.03 + 0.12 * hash11(seed * 5.1);
  float leanDir = hash11(seed * 9.3) * 6.2831;
  if (aPart > 0.5) {
    float rot = hash11(seed * 7.7 + aPart) * 0.9 - 0.45 + hash11(seed * 3.3) * 6.2831;
    float c = cos(rot), s = sin(rot);
    vec3 rel = transformed - vec3(0.0, 1.0, 0.0);
    rel.xz = mat2(c, -s, s, c) * rel.xz;
    // extra droop toward the frond tip (uv.y = 1 at the base, 0 at the tip)
    float t = 1.0 - uv.y;
    rel.y -= aVar.z * t * t * (0.6 + 0.8 * hash11(seed * 2.9 + aPart));
    transformed = vec3(0.0, 1.0, 0.0) + rel;
  }
  float bend = lean * transformed.y * transformed.y;
  transformed.x += cos(leanDir) * bend;
  transformed.z += sin(leanDir) * bend;
  vec3 iw = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  float phase = iw.x * 0.13 + iw.z * 0.17;
  float sway = sin(uTime * 1.3 + phase) * 0.6 + sin(uTime * 2.7 + phase * 1.9) * 0.4;
  float k = transformed.y * transformed.y * uWind * 0.06;
  transformed.x += sway * k;
  transformed.z += cos(uTime * 1.1 + phase) * k * 0.6;
  vPart = aPart;
  vWP = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;
}
`;

// cards: screen-aligned quads centred on the crown; texture blends side/top views with elevation
const CARD_VERT_PARS = /* glsl */ `
attribute vec4 aVar; // archetype (0 crown, 1 palm), seed, card size (unit), crown centre height (unit)
varying vec2 vCardUv;
varying float vElev;
varying float vCol; // atlas column of the side view (top view is 3 columns further)
`;
const CARD_PROJECT = /* glsl */ `
vec4 mvPosition;
{
  vec4 centre = instanceMatrix * vec4(0.0, aVar.w, 0.0, 1.0);
  vec3 wc = (modelMatrix * centre).xyz;
  float s = length(instanceMatrix[0].xyz);
  vec3 toCam = cameraPosition - wc;
  vElev = smoothstep(0.3, 0.85, abs(toCam.y) / max(length(toCam), 1.0));
  vec4 mvCentre = modelViewMatrix * centre;
  // mirror every other card so the same atlas tile reads as two silhouettes
  float flip = step(0.5, fract(aVar.y * 37.0)) * 2.0 - 1.0;
  mvPosition = mvCentre + vec4(position.xy * aVar.z * s, 0.0, 0.0);
  gl_Position = projectionMatrix * mvPosition;
  vCardUv = vec2(flip > 0.0 ? uv.x : 1.0 - uv.x, uv.y);
  vCol = aVar.x > 0.5 ? 2.0 : step(0.5, fract(aVar.y * 11.0));
}
`;
const CARD_FRAG_PARS = /* glsl */ `
uniform sampler2D uAtlas;
varying vec2 vCardUv;
varying float vElev;
varying float vCol;
`;
const CARD_DEPTH_FRAG = /* glsl */ `
{
  vec4 side = texture2D(uAtlas, vec2((vCardUv.x + vCol) / ${ATLAS_TILES}.0, vCardUv.y));
  vec4 top = texture2D(uAtlas, vec2((vCardUv.x + vCol + 3.0) / ${ATLAS_TILES}.0, vCardUv.y));
  diffuseColor.a = mix(side, top, vElev).a;
}
`;
const CARD_FRAG = /* glsl */ `
#include <color_fragment>
{
  vec4 side = texture2D(uAtlas, vec2((vCardUv.x + vCol) / ${ATLAS_TILES}.0, vCardUv.y));
  vec4 top = texture2D(uAtlas, vec2((vCardUv.x + vCol + 3.0) / ${ATLAS_TILES}.0, vCardUv.y));
  vec4 t = mix(side, top, vElev);
  if (t.a < 0.5) discard;
  diffuseColor.rgb *= t.r * 1.05;
}
`;

function crownMaterial(time: THREE.IUniform<number>, wind: THREE.IUniform<number>): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.88 });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = time;
    shader.uniforms.uWind = wind;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${COMMON_VERT}`)
      .replace('#include <beginnormal_vertex>', CROWN_NORMAL)
      .replace('#include <begin_vertex>', CROWN_VERTEX);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${CROWN_FRAG_PARS}`)
      .replace('#include <color_fragment>', CROWN_FRAG);
    balanceGroundIbl(shader);
  };
  mat.customProgramCacheKey = () => 'veg-crown-v4';
  return mat;
}

function palmMaterial(tex: THREE.Texture, time: THREE.IUniform<number>, wind: THREE.IUniform<number>): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({ map: tex, alphaTest: 0.5, alphaToCoverage: true, side: THREE.DoubleSide, roughness: 0.75, color: 0xffffff });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = time;
    shader.uniforms.uWind = wind;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${COMMON_VERT}`)
      .replace('#include <beginnormal_vertex>', PALM_NORMAL)
      .replace('#include <begin_vertex>', PALM_VERTEX);
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>\nvarying float vPart; varying vec3 vWP;`);
    balanceGroundIbl(shader);
  };
  mat.customProgramCacheKey = () => 'veg-palm-v4';
  return mat;
}

/** Cards in the shadow pass face the light (the pass' camera), so they throw crown-shaped shadows. */
function cardDepthMaterial(atlas: THREE.Texture): THREE.MeshDepthMaterial {
  const mat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, alphaTest: 0.5, side: THREE.DoubleSide });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uAtlas = { value: atlas };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${CARD_VERT_PARS}`)
      .replace('#include <project_vertex>', CARD_PROJECT);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${CARD_FRAG_PARS}`)
      .replace('#include <map_fragment>', CARD_DEPTH_FRAG);
  };
  mat.customProgramCacheKey = () => 'veg-card-depth-v3';
  return mat;
}

function cardMaterial(atlas: THREE.Texture): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, alphaTest: 0.5, alphaToCoverage: true, side: THREE.DoubleSide });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uAtlas = { value: atlas };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${CARD_VERT_PARS}`)
      .replace('#include <project_vertex>', CARD_PROJECT);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${CARD_FRAG_PARS}`)
      .replace('#include <color_fragment>', CARD_FRAG);
    balanceGroundIbl(shader);
  };
  mat.customProgramCacheKey = () => 'veg-card-v4';
  return mat;
}

// ---------------------------------------------------------------- planting

/** 0 broadleaf, 1 emergent, 2 mangrove, 3 shrub, 4 palm */
type Archetype = 0 | 1 | 2 | 3 | 4;

interface Plant { x: number; y: number; z: number; s: number; rot: number; tint: THREE.Color; arche: Archetype; seed: number; squash: number; trunk: number; }

/** `lodCenter` / `lodR` describe the planted footprint (the LOD distance metric); `box`, `center`, `r`
 *  and `height` bound the drawn plants and cards and are only used for culling. */
interface Tile { near: THREE.InstancedMesh; far: THREE.InstancedMesh; box: THREE.Box3; center: THREE.Vector3; r: number; height: number; lodCenter: THREE.Vector3; lodR: number; n: number; d: number; }

const TILE = 900;
const NEAR_DISTANCE = 650;
const NEAR_BUDGET = 60000;

const PALETTE: Record<Archetype, string[]> = {
  0: ['#2c5a2a', '#35662f', '#244d22', '#3d7034', '#2f6136', '#47783b', '#223f1e', '#3a6a2c', '#6b7a3a', '#33613a', '#4f7f3a', '#5a8a3e', '#73913f', '#3f7a3f', '#5c7d2f'],
  1: ['#1f4520', '#2b5528', '#365f2f', '#254a25', '#3b6a33', '#4a7a3a'],
  2: ['#2d4f26', '#395b2c', '#263f1f', '#43663a', '#334f2a', '#4f6b33'],
  3: ['#5d8a44', '#6b9550', '#4f7a3a', '#7a9a48', '#8a9a4a'],
  4: ['#5e8a3a', '#527f31', '#6c9a42', '#4a7229', '#739c46', '#5f8f3c'],
};

export class Vegetation {
  readonly group = new THREE.Group();
  readonly materials: THREE.MeshStandardMaterial[] = [];
  readonly uTime = { value: 0 };
  readonly uWind = { value: 0.5 };
  counts = { palms: 0, trees: 0, mangroves: 0, shrubs: 0 };
  private readonly tiles: Tile[] = [];
  shadowDistance = 1800;
  viewDistance = 9000;

  constructor(map: WorldMap, occupied: (x: number, z: number) => boolean) {
    const rng = new Rng('vegetation');
    const frondTex = frondTexture(rng.fork('fronds'));
    const atlas = cardAtlas(rng.fork('atlas'));
    const crownMat = crownMaterial(this.uTime, this.uWind);
    const palmMat = palmMaterial(frondTex, this.uTime, this.uWind);
    const cardMat = cardMaterial(atlas);
    const cardDepth = cardDepthMaterial(atlas);
    this.materials.push(crownMat, palmMat, cardMat);
    const crownGeo = crownGeometry();
    const palmGeo = palmGeometry();
    const cardGeo = cardGeometry();

    const plants: Plant[] = [];
    const tints: Record<Archetype, THREE.Color[]> = { 0: [], 1: [], 2: [], 3: [], 4: [] };
    for (const k of [0, 1, 2, 3, 4] as Archetype[]) tints[k] = PALETTE[k].map((c) => new THREE.Color(c));
    const add = (arche: Archetype, x: number, z: number, y: number, s: number, prng: Rng) => {
      const tint = prng.pick(tints[arche]).clone();
      tint.offsetHSL(prng.range(-0.025, 0.025), prng.range(-0.08, 0.06), prng.range(-0.06, 0.04));
      const squash = arche === 2 ? prng.range(0.5, 0.7) : arche === 3 ? prng.range(0.6, 0.85) : arche === 1 ? prng.range(0.95, 1.25) : prng.range(0.7, 1.0);
      const trunk = arche === 2 ? prng.range(0.15, 0.3) : arche === 3 ? 0.02 : arche === 1 ? prng.range(0.6, 0.95) : prng.range(0.3, 0.55);
      plants.push({ x, y, z, s, rot: prng.range(0, Math.PI * 2), tint, arche, seed: prng.next(), squash, trunk });
    };

    // cell walk over the map: candidates jittered inside each land cell, density from the veg channel
    const n = map.n;
    const zone = map.zone, veg = map.veg, height = map.height;
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const idx = j * n + i;
        const zn = zone[idx];
        if (zn === Zone.OCEAN || zn === Zone.BAY || zn === Zone.SANDBAR || zn === Zone.ROCK || zn === Zone.LOT || zn === Zone.CONSTRUCTION || zn === Zone.STADIUM || zn === Zone.ROAD || zn === Zone.MARINA) continue;
        if (height[idx] < 0.12) continue;
        const v = veg[idx] / 255;
        const cx = -HALF + (i + 0.5) * CELL, cz = -HALF + (j + 0.5) * CELL;
        const clump = perlin2(cx / 150, cz / 150);
        const grove = perlin2(cx / 420 + 9.0, cz / 420 - 3.0);
        let p = 0;
        let candidates = 1;
        switch (zn) {
          case Zone.MANGROVE: p = 0.95; candidates = 3; break;
          case Zone.BEACH: p = 0.2; break;
          case Zone.PARK: p = 0.06 + 0.94 * smoothstep(0.35, 0.95, v) + 0.08 * clump; candidates = v > 0.6 ? 3 : v > 0.3 ? 2 : 1; break;
          case Zone.RES_LOW: p = 0.05 + 0.75 * smoothstep(0.25, 0.95, v) + 0.05 * clump; candidates = v > 0.7 ? 3 : v > 0.42 ? 2 : 1; break;
          case Zone.GOLF: p = 0.03 + 0.22 * smoothstep(0.1, 0.6, clump); break;
          case Zone.WETLAND_FLAT: p = 0.85 * smoothstep(0.55, 0.9, v); candidates = 2; break;
          case Zone.HOTEL: case Zone.RES_MID: p = 0.05; break;
          case Zone.DOWNTOWN: p = 0.02; break;
          case Zone.AIRPORT: p = 0.012; break;
          case Zone.INDUSTRIAL: p = 0.006; break;
          default: p = 0;
        }
        if (p <= 0) continue;
        for (let c = 0; c < candidates; c++) {
          const h = hash2(i, j, 7 + c * 3);
          if (h >= p) continue;
          const jx = cx + (hash2(i, j, 8 + c * 3) - 0.5) * CELL * 1.1;
          const jz = cz + (hash2(i, j, 9 + c * 3) - 0.5) * CELL * 1.1;
          const y = map.heightAt(jx, jz);
          if (y < 0.12) continue;
          const prng = new Rng(idx * 4 + c);
          const roll = prng.next();
          const nearShore = map.coastAt(jx, jz) > -110;
          // crown radius is ~1.15 x scale, so a scale of 5 is a 12 m crown
          if (zn === Zone.MANGROVE) {
            if (occupied(jx, jz)) continue;
            add(2, jx, jz, y - 0.2, prng.range(2.4, 4.4), prng);
          } else if (zn === Zone.BEACH) {
            if (occupied(jx, jz)) continue;
            // palms on the dune line, sea-grape clumps just below; nothing on the wet sand
            if (y > 1.15 && roll < 0.45) add(4, jx, jz, y - 0.15, prng.range(6, 10.5), prng);
            else if (y > 1.0 && roll < 0.62) add(3, jx, jz, y - 0.15, prng.range(1.2, 2.6), prng);
          } else if (zn === Zone.WETLAND_FLAT) {
            if (y < 0.25 || occupied(jx, jz)) continue;
            add(roll < 0.35 ? 1 : 0, jx, jz, y - 0.3, roll < 0.35 ? prng.range(7, 10) : prng.range(4, 6.5), prng);
          } else {
            if (occupied(jx, jz)) continue;
            const dense = v > 0.7;
            if (zn === Zone.PARK || zn === Zone.RES_LOW || zn === Zone.GOLF) {
              const palmShare = zn === Zone.GOLF ? 0.4 : zn === Zone.RES_LOW ? (dense ? 0.14 : 0.35) : nearShore ? 0.22 : 0.08;
              const emergentShare = dense ? 0.1 + 0.16 * smoothstep(0.1, 0.5, grove) : 0.05;
              const shrubShare = dense ? 0.08 : 0.06;
              if (roll < palmShare) add(4, jx, jz, y - 0.15, prng.range(6, 11), prng);
              else if (roll < palmShare + emergentShare) add(1, jx, jz, y - 0.3, prng.range(7.5, 11), prng);
              else if (roll < palmShare + emergentShare + shrubShare) add(3, jx, jz, y - 0.1, prng.range(1.3, 2.8), prng);
              else add(0, jx, jz, y - 0.3, dense ? prng.range(4.2, 7.5) : prng.range(3.8, 6.5), prng);
            } else if (zn === Zone.INDUSTRIAL) {
              add(roll < 0.5 ? 3 : 0, jx, jz, y - 0.2, roll < 0.5 ? prng.range(1.3, 2.4) : prng.range(3.5, 5.5), prng);
            } else if (zn === Zone.AIRPORT) {
              add(0, jx, jz, y - 0.3, prng.range(3.2, 5), prng);
            } else {
              add(4, jx, jz, y - 0.15, prng.range(6, 10), prng);
            }
          }
        }
      }
    }
    // avenue palms along the authored roads and the island lanes
    const roadRng = new Rng('road-palms');
    const lines: { pts: [number, number][]; width: number; spacing: number }[] = [];
    for (const r of map.roads) if (r.cls === 'highway' || r.cls === 'arterial' || r.cls === 'causeway' || r.cls === 'street') lines.push({ pts: r.pts, width: r.width, spacing: r.cls === 'street' ? 34 : 26 });
    for (const d of map.districts) if (d.track) lines.push({ pts: d.track, width: 7, spacing: 30 });
    for (const line of lines) {
      let k = 0;
      for (let s = 0; s < line.pts.length - 1; s++) {
        const [ax, az] = line.pts[s], [bx, bz] = line.pts[s + 1];
        const len = Math.hypot(bx - ax, bz - az);
        if (len < 1) continue;
        const ux = (bx - ax) / len, uz = (bz - az) / len;
        for (let t = 14; t < len - 8; t += line.spacing * roadRng.range(0.8, 1.25), k++) {
          const side = (k & 1) === 0 ? -1 : 1;
          const off = line.width * 0.5 + roadRng.range(5, 8);
          const x = ax + ux * t - uz * off * side, z = az + uz * t + ux * off * side;
          const y = map.heightAt(x, z);
          if (y < 0.9) continue;
          const zn = map.zoneAt(x, z);
          if (zn === Zone.INDUSTRIAL || zn === Zone.AIRPORT || zn === Zone.WETLAND_FLAT || zn === Zone.LOT) continue;
          if (roadRng.chance(0.25)) continue;
          add(4, x, z, y - 0.15, roadRng.range(6.5, 10.5), roadRng);
        }
      }
    }
    for (const p of plants) {
      if (p.arche === 4) this.counts.palms++;
      else if (p.arche === 2) this.counts.mangroves++;
      else if (p.arche === 3) this.counts.shrubs++;
      else this.counts.trees++;
    }

    // tiles: one near (3D) + one far (card) instanced mesh per family per tile; buffers are shared
    const byTile = new Map<string, { crown: Plant[]; palm: Plant[]; tx: number; tz: number }>();
    for (const p of plants) {
      const tx = Math.floor(p.x / TILE), tz = Math.floor(p.z / TILE);
      const key = `${tx}|${tz}`;
      let t = byTile.get(key);
      if (!t) { t = { crown: [], palm: [], tx, tz }; byTile.set(key, t); }
      (p.arche === 4 ? t.palm : t.crown).push(p);
    }
    const shuffleRng = new Rng('veg-shuffle');
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), pv = new THREE.Vector3(), sv = new THREE.Vector3(), e = new THREE.Euler();
    const build = (list: Plant[], geo: THREE.BufferGeometry, mat: THREE.Material) => {
      // deterministic shuffle so that reducing the instance count at distance thins the tile evenly
      for (let i = list.length - 1; i > 0; i--) { const j = shuffleRng.int(0, i); const t = list[i]; list[i] = list[j]; list[j] = t; }
      const count = list.length;
      const nearGeo = new THREE.BufferGeometry();
      for (const name of ['position', 'normal', 'uv', 'aPart']) nearGeo.setAttribute(name, geo.getAttribute(name));
      nearGeo.boundingSphere = geo.boundingSphere;
      const farGeo = new THREE.BufferGeometry();
      for (const name of ['position', 'normal', 'uv']) farGeo.setAttribute(name, cardGeo.getAttribute(name));
      farGeo.boundingSphere = cardGeo.boundingSphere;
      const nearVar = new Float32Array(count * 4), farVar = new Float32Array(count * 4);
      const near = new THREE.InstancedMesh(nearGeo, mat, count);
      const box = new THREE.Box3();
      list.forEach((pl, i) => {
        pv.set(pl.x, pl.y, pl.z);
        // palms lean a little, crowns stay upright
        e.set(pl.arche === 4 ? (pl.seed - 0.5) * 0.16 : 0, pl.rot, 0);
        q.setFromEuler(e);
        sv.set(pl.s, pl.s, pl.s);
        near.setMatrixAt(i, m.compose(pv, q, sv));
        near.setColorAt(i, pl.tint);
        nearVar[i * 4] = pl.arche; nearVar[i * 4 + 1] = pl.seed; nearVar[i * 4 + 2] = pl.arche === 4 ? 0.35 : pl.squash; nearVar[i * 4 + 3] = pl.trunk;
        // card: unit size and crown-centre height matching the 3D crown
        if (pl.arche === 4) { farVar[i * 4] = 1; farVar[i * 4 + 2] = 2.45; farVar[i * 4 + 3] = 1.0; }
        else { farVar[i * 4] = 0; farVar[i * 4 + 2] = 3.1 * pl.squash + 0.3; farVar[i * 4 + 3] = pl.trunk + 0.9 * pl.squash; }
        farVar[i * 4 + 1] = pl.seed;
        box.expandByPoint(pv);
      });
      nearGeo.setAttribute('aVar', new THREE.InstancedBufferAttribute(nearVar, 4));
      farGeo.setAttribute('aVar', new THREE.InstancedBufferAttribute(farVar, 4));
      near.instanceMatrix.needsUpdate = true;
      near.receiveShadow = true;
      near.castShadow = false;
      near.matrixAutoUpdate = false;
      const far = new THREE.InstancedMesh(farGeo, cardMat, count);
      far.instanceMatrix = near.instanceMatrix;
      far.instanceColor = near.instanceColor;
      far.receiveShadow = true;
      far.castShadow = false;
      far.customDepthMaterial = cardDepth;
      far.matrixAutoUpdate = false;
      // LOD metric: the planted footprint grown by the largest crown radius (2.6 x scale)
      const maxS = list.reduce((a, p) => Math.max(a, p.s), 0);
      const lod = box.getBoundingSphere(new THREE.Sphere());
      lod.radius += maxS * 2.6;
      // world-space culling bounds: plant positions grown by the largest crown sideways and by
      // 3.7 x scale up (the card of a plant reaches trunk + crown + half a card above its base)
      box.min.x -= maxS * 2.6; box.max.x += maxS * 2.6;
      box.min.z -= maxS * 2.6; box.max.z += maxS * 2.6;
      box.min.y -= 1; box.max.y += maxS * 3.7;
      const sphere = box.getBoundingSphere(new THREE.Sphere());
      near.boundingSphere = sphere;
      far.boundingSphere = sphere.clone();
      far.visible = false;
      this.group.add(near, far);
      this.tiles.push({ near, far, box, center: sphere.center, r: sphere.radius, height: box.max.y - box.min.y, lodCenter: lod.center, lodR: lod.radius, n: count, d: 0 });
    };
    for (const t of byTile.values()) {
      if (t.crown.length) build(t.crown, crownGeo, crownMat);
      if (t.palm.length) build(t.palm, palmGeo, palmMat);
    }
  }

  update(time: number, wind: number): void {
    this.uTime.value = time;
    this.uWind.value = wind;
  }

  /** Per-tile LOD: the nearest tiles (within NEAR_DISTANCE, up to an instance budget) draw the 3D
   *  meshes; every other tile draws camera-facing cards, thinned with distance. Shadows always come
   *  from the card mesh (light-facing crown blobs), which for near tiles is kept off the camera layer.
   *  Tiles outside the view are not drawn; tiles whose shadow cannot reach the view do not cast. */
  updateLod(camX: number, camZ: number, cull: ViewCull): void {
    const tiles = this.tiles;
    for (const t of tiles) t.d = Math.max(0, Math.hypot(t.lodCenter.x - camX, t.lodCenter.z - camZ) - t.lodR);
    // in-place insertion sort by distance: the order barely changes between frames, so this is
    // linear and allocation-free (the budget below is spent nearest-first)
    for (let i = 1; i < tiles.length; i++) {
      const t = tiles[i];
      let j = i - 1;
      while (j >= 0 && tiles[j].d > t.d) { tiles[j + 1] = tiles[j]; j--; }
      tiles[j + 1] = t;
    }
    let budget = NEAR_BUDGET;
    for (const t of tiles) {
      const near = t.d < NEAR_DISTANCE && budget >= t.n;
      if (near) budget -= t.n;
      const inView = cull.boxInView(t.box);
      const shadow = t.d < this.shadowDistance && cull.casterInView(t.center, t.r, t.height);
      t.near.visible = near && inView;
      const drawCards = !near && inView && t.d < this.viewDistance;
      t.far.visible = drawCards || shadow;
      t.far.castShadow = shadow;
      t.far.layers.mask = layerMask('all', drawCards);
      // far cards: full density to 3 km, half at 5.5 km, a quarter beyond (a crown is ~1 px there)
      const frac = near ? 1 : t.d < 3000 ? 1 : t.d < 5500 ? 0.5 : 0.25;
      t.far.count = Math.max(1, Math.round(t.n * frac));
    }
  }
}
