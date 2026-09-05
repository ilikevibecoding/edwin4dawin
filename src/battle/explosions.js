// Explosions, fires, flak, sparks, shock rings, shield ripples, smoke and scorch marks: three instanced
// billboard draw calls driven by one procedural shader, plus the scorch decal layer (effects/scorch.js).
//
// Layers, in draw order:
//   smoke  (normal, premultiplied; drawn first, sorted back-to-front when the camera moves): smoke puffs,
//          the soot cloud under every persistent fire, flak smoke puffs. Drawn before anything that glows so
//          a puff behind a fireball never dims it.
//   flame  (premultiplied with partial occlusion): fireballs and flame licks. A fireball covers the hull
//          under it instead of adding to it, so a hit on a sunlit cream deck reads as orange fire with a
//          dark interior rather than a white blow-out.
//   add    (additive): flashes, sparks, flak bursts, shock rings, shield ripples, fire glow.
// Each particle is a quad with per-instance (age, life, size, seed, kind, colour, axis). Billboards are
// drawn slightly nearer the camera than they are (a similarity about the eye, so the screen footprint is
// unchanged) so the hull a fireball sits on cannot slice it while hulls in front still occlude it.
//
// Persistent fires are emitters with a 60-120 s life (re-ignitable) that keep flame licks and a glow alive
// over a dark soot base, stream a plume of smoke puffs 200-400 m long and stamp a scorch decal under
// themselves. Impacts are staged (hard flash, fireball roll-out, sparks, a lingering dark puff, a scorch);
// detonations escalate (flash, ring, big fireballs with rolling secondaries, debris in the hull colour, a
// long-lived black cloud drifting with the hulk).
import * as THREE from "three";
import { Scorch } from "./effects/scorch.js";

const KIND = {
  hit: 0,
  flak: 1,
  fire: 2,
  smoke: 3,
  blast: 4,
  flash: 5,
  spark: 6,
  ring: 7,
  shield: 8,
  glow: 9,
  soot: 10,
  flakSmoke: 11,
};
// which layer draws each kind: 0 additive, 1 smoke (volume, first), 2 flame (fireballs + licks)
const LAYER_OF = [2, 0, 2, 1, 2, 0, 0, 0, 0, 0, 1, 1];

export const SHIELD_COLOR = new THREE.Color(0.5, 0.78, 1.0);
export const FIRE_LIFE = [60, 120]; // s: a persistent fire burns this long unless re-ignited
const MAX_FIRES_PER_SHIP = 12; // the choreography ignites up to 12 on a wreck
const FIRE_COOL = 2.5; // s: a fire that goes out fades over this long
// fireballs (transient) may fill the flame layer only this far: the rest is reserved for the licks of
// persistent fires, so a wreck under a hail of hits never goes dark
const FLAME_TRANSIENT_CAP = 0.85;
const LICK_TILT = (25 * Math.PI) / 180; // rad: per-lick orientation jitter around the fire's drift
const FLAK_CULL_FAR = 8000; // m: beyond this flak draws only its core (no sparks / puff)
const FLAK_THIN_FROM = 5000; // m: beyond this only one flak burst in three is drawn
const FLAK_THIN_NEAR = 2000; // m: between this and FLAK_THIN_FROM two bursts in three are drawn
const SCORCH_MAX = 220; // m: widest hit scorch
const SORT_MOVE = 500; // m: camera movement that triggers a depth re-sort of the smoke
const EMPTY = Object.freeze({});

const _w = new THREE.Vector3();
const _w2 = new THREE.Vector3();
const _w3 = new THREE.Vector3();
const _v = new THREE.Vector3();
const _n = new THREE.Vector3();
const _n2 = new THREE.Vector3();
const _nl = new THREE.Vector3();
const _l = new THREE.Vector3();
const _l2 = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _inv = new THREE.Matrix4();
const WHITE = new THREE.Color(1, 1, 1);
const HOT = new THREE.Color(1.0, 0.96, 0.9);
const CLOUD = new THREE.Color(0.75, 0.72, 0.7); // blast smoke: blacker than fire smoke
const _col = new THREE.Color();

function randDir(out) {
  // uniform direction on the sphere
  const z = Math.random() * 2 - 1;
  const a = Math.random() * Math.PI * 2;
  const r = Math.sqrt(Math.max(0, 1 - z * z));
  return out.set(Math.cos(a) * r, Math.sin(a) * r, z);
}

const byDepthDesc = (a, b) => b.depth - a.depth;

// squared distance from a point to a triangle (Ericson, Real-Time Collision Detection 5.1.5)
function pointTriDist2(px, py, pz, ax, ay, az, bx, by, bz, cx, cy, cz) {
  const abx = bx - ax;
  const aby = by - ay;
  const abz = bz - az;
  const acx = cx - ax;
  const acy = cy - ay;
  const acz = cz - az;
  const apx = px - ax;
  const apy = py - ay;
  const apz = pz - az;
  const d1 = abx * apx + aby * apy + abz * apz;
  const d2 = acx * apx + acy * apy + acz * apz;
  if (d1 <= 0 && d2 <= 0) return apx * apx + apy * apy + apz * apz;
  const bpx = px - bx;
  const bpy = py - by;
  const bpz = pz - bz;
  const d3 = abx * bpx + aby * bpy + abz * bpz;
  const d4 = acx * bpx + acy * bpy + acz * bpz;
  if (d3 >= 0 && d4 <= d3) return bpx * bpx + bpy * bpy + bpz * bpz;
  const vc = d1 * d4 - d3 * d2;
  let qx;
  let qy;
  let qz;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) {
    const v = d1 / (d1 - d3);
    qx = ax + abx * v - px;
    qy = ay + aby * v - py;
    qz = az + abz * v - pz;
    return qx * qx + qy * qy + qz * qz;
  }
  const cpx = px - cx;
  const cpy = py - cy;
  const cpz = pz - cz;
  const d5 = abx * cpx + aby * cpy + abz * cpz;
  const d6 = acx * cpx + acy * cpy + acz * cpz;
  if (d6 >= 0 && d5 <= d6) return cpx * cpx + cpy * cpy + cpz * cpz;
  const vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) {
    const w = d2 / (d2 - d6);
    qx = ax + acx * w - px;
    qy = ay + acy * w - py;
    qz = az + acz * w - pz;
    return qx * qx + qy * qy + qz * qz;
  }
  const va = d3 * d6 - d5 * d4;
  if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) {
    const w = (d4 - d3) / (d4 - d3 + (d5 - d6));
    qx = bx + (cx - bx) * w - px;
    qy = by + (cy - by) * w - py;
    qz = bz + (cz - bz) * w - pz;
    return qx * qx + qy * qy + qz * qz;
  }
  const denom = 1 / (va + vb + vc);
  const v = vb * denom;
  const w = vc * denom;
  qx = ax + abx * v + acx * w - px;
  qy = ay + aby * v + acy * w - py;
  qz = az + abz * v + acz * w - pz;
  return qx * qx + qy * qy + qz * qz;
}

const vert = /* glsl */ `
attribute vec3 iPos;
attribute vec4 iParam;   // age(0..1), size (m), seed, kind
attribute vec3 iColor;
attribute vec4 iAxis;    // xyz: world direction (drift / velocity / disc normal), w: extra (growth, stretch or intensity)
uniform vec3 sunDir;
uniform float time;
varying vec2 vUv;
varying vec4 vParam;
varying vec3 vColor;
varying vec3 vSunV;
varying float vExtra;
varying float vNear;
void main() {
  vUv = uv;
  vParam = iParam;
  vColor = iColor;
  vExtra = iAxis.w;
  vSunV = normalize((viewMatrix * vec4(sunDir, 0.0)).xyz);
  float age = iParam.x;
  float seed = iParam.z;
  int k = int(iParam.w + 0.5);
  float size = iParam.y;
  vec4 centre = modelViewMatrix * vec4(iPos, 1.0);
  float dist = max(length(centre.xyz), 1e-3);
  // billboards the camera is about to fly through fade out instead of drawing as blurred discs: gone
  // inside 60 m, full from 150 m, and a big puff the camera is inside of (nearer than its own size) too
  float dcam = distance(iPos, cameraPosition);
  vNear = smoothstep(60.0, 150.0, dcam);
  // depth bias: draw the quad as if it sat a little nearer the eye (same screen footprint) so the hull a
  // fireball or flame sits on cannot clip it, while hulls further in front still occlude it
  float sc = 1.0 - min(size * 0.5, dist * 0.8) / dist;
  if (k == 7 || k == 8) {
    // shock ring / shield disc: a quad lying in the plane perpendicular to the axis (world space)
    vec3 n = normalize(iAxis.xyz);
    vec3 t = normalize(cross(n, abs(n.y) < 0.9 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0)));
    vec3 b = cross(n, t);
    float grow = k == 7 ? 0.3 + 1.3 * pow(age, 0.55) : 1.0;
    vec3 wp = iPos + (position.x * t + position.y * b) * size * grow;
    vec4 vp = modelViewMatrix * vec4(wp, 1.0);
    gl_Position = projectionMatrix * vec4(vp.xyz * sc, 1.0);
    return;
  }
  // growth curves per kind
  float grow = 1.0;
  if (k == 0) grow = 0.3 + 1.1 * sqrt(age);
  else if (k == 1) grow = 0.55 + 0.65 * age;
  else if (k == 3) grow = mix(1.0, iAxis.w, 1.0 - (1.0 - age) * (1.0 - age));
  else if (k == 4) grow = 0.25 + 1.35 * sqrt(age);
  else if (k == 5) grow = 1.0 + 0.3 * age;
  else if (k == 6) grow = 1.0 - 0.4 * age;
  else if (k == 9) grow = 1.0 + 0.08 * sin(time * 9.0 + seed * 50.0);
  else if (k == 10) grow = 1.0 + 0.06 * sin(time * 0.7 + seed * 20.0);
  else if (k == 11) grow = 0.55 + 0.75 * sqrt(age);
  size *= grow;
  vNear *= smoothstep(0.35, 0.9, dcam / max(size, 1.0));
  vec2 off;
  if (k == 2 || k == 6) {
    // flame lick / spark: align the quad's +y with the screen projection of the axis; flames are anchored at
    // their base, sparks centred; both foreshorten when the axis points at the camera
    vec3 dv = mat3(viewMatrix) * iAxis.xyz;
    float l = length(dv.xy);
    vec2 d2 = l > 1e-4 ? dv.xy / l : vec2(0.0, 1.0);
    float stretch = mix(1.0, iAxis.w, clamp(l, 0.0, 1.0));
    vec2 q;
    if (k == 2) {
      // a lick breathes: its height and width swell and shrink on their own phase (the seed), so the
      // licks of one fire never move together
      float ph = seed * 6.2831;
      float hgt = 1.0 + 0.28 * sin(time * 2.9 + ph) * sin(time * 1.7 + ph * 1.9) + 0.1 * sin(time * 7.3 + ph * 3.1);
      float wid = 1.0 + 0.18 * sin(time * 3.7 + ph * 2.3) * sin(time * 1.1 + ph);
      q = vec2(position.x * wid, (position.y + 0.5) * stretch * hgt);
    } else q = vec2(position.x, position.y * stretch);
    off = vec2(q.x * d2.y + q.y * d2.x, -q.x * d2.x + q.y * d2.y) * size;
  } else {
    float ang = seed * 6.2831 + (k == 3 ? age * 0.5 * (seed > 0.5 ? 1.0 : -1.0) : 0.0);
    vec2 p = position.xy * size;
    off = vec2(p.x * cos(ang) - p.y * sin(ang), p.x * sin(ang) + p.y * cos(ang));
  }
  centre.xy += off;
  gl_Position = projectionMatrix * vec4(centre.xyz * sc, 1.0);
}`;

const frag = /* glsl */ `
precision highp float;
uniform float time;
varying vec2 vUv;
varying vec4 vParam;
varying vec3 vColor;
varying vec3 vSunV;
varying float vExtra;
varying float vNear;
// cheap value noise
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
// the octaves are rotated against each other so the lattice never shows as straight edges
const mat2 ROT = mat2(0.8, 0.6, -0.6, 0.8);
float fbm(vec2 p) { float v = 0.0; float a = 0.5; for (int i = 0; i < 4; i++) { v += a * noise(p); p = ROT * p * 2.03 + 1.7; a *= 0.5; } return v; }
float fbm3(vec2 p) { float v = 0.0; float a = 0.5; for (int i = 0; i < 3; i++) { v += a * noise(p); p = ROT * p * 2.13 + 1.7; a *= 0.5; } return v; }
// hex tiling: offset to the nearest cell centre and the hex distance from it (0 centre .. 0.5 border)
vec2 hexCell(vec2 p) {
  const vec2 r = vec2(1.0, 1.7320508);
  vec2 h = r * 0.5;
  vec2 a = mod(p, r) - h;
  vec2 b = mod(p - h, r) - h;
  return dot(a, a) < dot(b, b) ? a : b;
}
float hexDist(vec2 p) { p = abs(p); return max(dot(p, vec2(0.5, 0.8660254)), p.x); }
void main() {
  vec2 c = vUv - 0.5;
  float r = length(c) * 2.0;
  float age = vParam.x;
  float seed = vParam.z;
  int k = int(vParam.w + 0.5);
  vec3 col = vec3(0.0);
  float alpha = 0.0;
  if (k == 0 || k == 4) {
    // fireball: a ragged boiling silhouette (a low-frequency lobe term plus a seeded high-frequency one,
    // so the rim tears into wisps instead of rounding into a polygon), a white-hot core for the first
    // moments cooling fast through orange to deep red, rolling lobes inside and dark soot intrusions
    // growing through it from early on (it covers the hull rather than adding to it)
    vec2 dr = vec2(age * 0.7, -age * 1.2);
    float n = fbm(c * 3.4 + seed * 17.0 + dr);
    float n2 = fbm3(c * 9.5 + seed * 53.0 - dr * 1.6);
    float edge = 0.36 + 0.5 * n + 0.26 * (n2 - 0.5);
    float rr = r / max(edge, 0.05);
    float shape = smoothstep(1.0, 0.66, rr);
    shape *= mix(1.0, smoothstep(0.28, 0.62, n2), smoothstep(0.5, 1.0, rr));
    float hot = smoothstep(0.22, 0.0, age);
    // lobes: domain-warped noise, bright ridges over darker valleys, rolling outward
    vec2 q = c + 0.12 * vec2(n - 0.5, n2 - 0.5);
    float ridge = smoothstep(0.3, 0.75, fbm3(q * 6.0 - seed * 9.0 + vec2(-age * 1.6, age * 2.4)));
    vec3 fire = mix(vec3(0.6, 0.1, 0.015), vec3(0.85, 0.3, 0.04), ridge);
    float coreMask = smoothstep(0.75, 0.0, rr * (0.8 + age * 1.6));
    fire = mix(fire, vec3(1.0, 0.85, 0.6), coreMask * hot);
    float soot = smoothstep(0.42, 0.78, fbm3(c * 4.5 + seed * 7.0 + age * 0.9));
    float dark = soot * smoothstep(0.1, 0.6, age) * (0.45 + 0.55 * smoothstep(0.2, 0.9, rr));
    fire = mix(fire, vec3(0.05, 0.025, 0.018), min(1.0, dark * 1.1));
    float cool = smoothstep(0.18, 0.8, age);
    fire *= mix(1.0, 0.35, cool);
    col = fire * vColor * (1.0 + 0.5 * hot * coreMask);
    alpha = shape * (1.0 - smoothstep(0.55, 1.0, age)) * (k == 4 ? 0.92 : 0.95);
  } else if (k == 1) {
    // flak core: a hard white-orange pop with a few short rays, gone in a tenth of a second (the dark
    // puff it leaves is a separate smoke-layer particle)
    float a = atan(c.y, c.x);
    float nr = 5.0 + floor(seed * 3.0);
    float rays = max(pow(0.5 + 0.5 * sin(a * nr + seed * 40.0), 4.0), 0.8 * pow(0.5 + 0.5 * sin(a * (nr + 3.0) - seed * 23.0), 6.0));
    rays *= 0.45 + 0.55 * noise(vec2(a * 1.5 + seed * 31.0, seed * 9.0));
    float rayLen = 0.25 + 0.55 * rays;
    float spikes = smoothstep(rayLen, rayLen * 0.25, r) * 0.5;
    float core = smoothstep(0.3, 0.05, r);
    float fade = 1.0 - age * age;
    vec3 fire = mix(vec3(1.0, 0.42, 0.1), vec3(1.0, 0.9, 0.75), core);
    col = fire * vColor * 1.5 * fade;
    alpha = max(core, spikes) * fade;
  } else if (k == 2) {
    // flame lick: base at v = 0, ragged tip; a small hot core at the root, orange body, dull red tip. The
    // width envelope pulses, the tip sways and the height noise scrolls, each on the lick's own phase.
    // The colour attribute carries the fire's intensity (white x intensity) so dying fires shrink and dim.
    float fy = vUv.y;
    float n = fbm(vec2(c.x * 4.5 + seed * 13.0, fy * 2.6 - time * 2.2 + seed * 7.0));
    float sway = (noise(vec2(fy * 2.5 - time * 2.6 + seed * 5.0, seed * 40.0)) - 0.5) * 0.4 * fy * fy;
    float x = c.x - sway;
    float pulse = 0.85 + 0.3 * noise(vec2(time * 2.1 + seed * 30.0, fy * 1.5 + seed * 3.0));
    // teardrop envelope: widest a quarter of the way up, tapering to the tip
    float width = 0.5 * pow(1.0 - fy, 0.7) * (0.6 + 0.4 * smoothstep(0.0, 0.25, fy)) * pulse;
    float edgeNoise = (n - 0.5) * (0.25 + 0.5 * fy);
    float body = smoothstep(width, width * 0.15, abs(x) + edgeNoise);
    float tipH = 0.5 + 0.35 * n + 0.12 * sin(time * 4.1 + seed * 20.0);
    float tip = 1.0 - smoothstep(tipH, 1.0, fy);
    float root = smoothstep(0.0, 0.06, fy);
    float lick = body * tip * root;
    float coreW = smoothstep(0.2, 0.0, abs(x)) * (1.0 - smoothstep(0.0, 0.4, fy));
    vec3 fire = mix(vec3(0.9, 0.3, 0.04), vec3(0.95, 0.5, 0.14), coreW);
    fire = mix(fire, vec3(0.45, 0.08, 0.02), smoothstep(0.45, 1.0, fy + (n - 0.5) * 0.3));
    float io = smoothstep(0.0, 0.12, age) * (1.0 - smoothstep(0.7, 1.0, age));
    float I = max(vColor.r, max(vColor.g, vColor.b));
    col = fire * 0.95 * vColor;
    alpha = lick * io * 0.85 * I;
  } else if (k == 3) {
    // smoke: dark, sun-shaded puff with internal density, Coruscant's warm under-light and an ember glow
    // while young
    float n = fbm(c * 3.0 + seed * 23.0 + vec2(age * 0.25, age * 0.35));
    float edge = 0.5 + 0.5 * n;
    float shape = smoothstep(edge, edge - 0.5, r);
    float dens = 0.4 + 0.6 * fbm(c * 5.5 - seed * 11.0 + age * 0.4);
    vec3 N = normalize(vec3(c * 2.0, sqrt(max(0.0, 1.0 - r * r)) * 0.9 + 0.25));
    float lit = clamp(dot(N, vSunV), 0.0, 1.0);
    vec3 base = vec3(0.08, 0.075, 0.07) * vColor;
    col = base * (0.2 + 1.3 * lit * lit + 0.2 * lit) * (0.55 + 0.7 * dens);
    col += vec3(0.03, 0.019, 0.011) * clamp(-N.y, 0.0, 1.0) * (0.5 + 0.5 * dens);
    float ember = max(0.0, 1.0 - r);
    col += vec3(1.0, 0.38, 0.09) * smoothstep(0.22, 0.0, age) * ember * ember * 0.35;
    float fadeIn = smoothstep(0.0, 0.08, age);
    alpha = shape * fadeIn * (1.0 - smoothstep(0.5, 1.0, age)) * 0.8 * (0.6 + 0.4 * dens);
  } else if (k == 5) {
    // flash: hard white pop with a faint four-point glint (extra = hardness; 0 gives a soft broad glow)
    float hard = clamp(vExtra, 0.0, 1.0);
    float g = smoothstep(0.8, 0.1, r);
    float glow = pow(max(0.0, 1.0 - r), 2.5) * mix(1.4, 0.6, hard);
    float a = atan(c.y, c.x);
    float star = pow(abs(cos(a * 2.0 + seed * 3.0)), 14.0) * smoothstep(0.95, 0.05, r) * 0.45;
    float fade = 1.0 - age * age;
    col = vec3(1.0, 0.97, 0.92) * vColor * 2.0;
    alpha = (g * hard + glow + star * hard) * fade;
  } else if (k == 6) {
    // spark: tiny streak (stretched along its velocity in the vertex stage), white to orange
    float d = length(c * 2.0);
    float g = pow(max(0.0, 1.0 - d), 1.4);
    vec3 sc = mix(vec3(1.0, 0.95, 0.82), vec3(1.0, 0.42, 0.1), smoothstep(0.05, 0.7, age));
    col = sc * vColor * 1.8;
    alpha = g * (1.0 - age * age) * (1.0 - smoothstep(0.85, 1.0, age));
  } else if (k == 7) {
    // shock ring: a thin blue-white band on the growing quad, no inner fill; it never draws thinner than
    // about a pixel and a half (its energy is spread when it has to be inflated) and fades as it runs out
    float th0 = mix(0.045, 0.018, age);
    float th = max(th0, 1.5 * fwidth(r));
    float q = (r - 0.82) / th;
    float band = exp(-q * q) * (th0 / th);
    vec3 rc = mix(vec3(0.92, 0.96, 1.0), vec3(0.6, 0.78, 1.0), age);
    col = rc * vColor * 1.3;
    alpha = band * 0.75 * (1.0 - age) * (1.0 - age);
  } else if (k == 8) {
    // shield ripple: translucent hex-cell disc, a ring travelling outward from the impact, fading
    vec2 cell = hexCell(c * 2.0 * 5.5);
    float hd = hexDist(cell);
    float lines = smoothstep(0.36, 0.46, hd);
    float q = (r - age * 1.05) / 0.18;
    float ripple = exp(-q * q);
    float disc = 1.0 - smoothstep(0.75, 1.0, r);
    float centreFlash = smoothstep(0.45, 0.0, r) * (1.0 - smoothstep(0.0, 0.5, age));
    float fade = 1.0 - age;
    col = vColor * 1.2;
    alpha = disc * ((lines * 0.7 + 0.1) * (ripple * 0.9 + 0.2 * fade) + centreFlash * 0.6) * fade;
  } else if (k == 9) {
    // glow: soft pulsing orange core of a persistent fire (modest: several fires stack on a hulk)
    float g = pow(max(0.0, 1.0 - r), 3.0);
    float pulse = 0.85 + 0.15 * sin(time * 9.0 + seed * 50.0) * sin(time * 4.7 + seed * 21.0);
    col = vec3(1.0, 0.42, 0.08) * vColor * 0.8 * pulse;
    alpha = g * 0.25;
  } else if (k == 10) {
    // soot: the dark, slowly churning cloud hugging the hull under a fire's licks (intensity in extra)
    float n = fbm(c * 2.6 + seed * 31.0 + vec2(time * 0.07, -time * 0.05));
    float edge = 0.5 + 0.5 * n;
    float shape = smoothstep(edge, edge * 0.3, r);
    float dens = 0.5 + 0.5 * fbm(c * 5.0 + seed * 3.0 + time * 0.1);
    col = vec3(0.028, 0.024, 0.02) * (0.5 + 0.8 * dens);
    float pulse = 0.8 + 0.2 * sin(time * 5.0 + seed * 40.0);
    col += vec3(0.7, 0.22, 0.05) * smoothstep(0.45, 0.0, r) * 0.22 * pulse * vExtra;
    alpha = shape * 0.72 * vExtra * (0.7 + 0.3 * dens);
  } else {
    // flak puff: the small dark ragged cloud a burst leaves behind (the second stage of a flak burst),
    // sun-shaded, torn at the rim by a seeded high-frequency term, lit warm from inside for its first
    // moments (a soft ember, never a crisp ring: from a few km a ring reads as a drawn circle)
    float n = fbm(c * 3.4 + seed * 19.0 + vec2(age * 0.3, -age * 0.2));
    float n2 = fbm3(c * 9.0 - seed * 41.0 + age * 0.5);
    float edge = 0.38 + 0.42 * n + 0.28 * (n2 - 0.5);
    float rr = r / max(edge, 0.05);
    float shape = smoothstep(1.0, 0.55, rr) * mix(1.0, smoothstep(0.3, 0.6, n2), smoothstep(0.5, 1.0, rr));
    float dens = 0.45 + 0.55 * n2;
    vec3 N = normalize(vec3(c * 2.0, sqrt(max(0.0, 1.0 - min(1.0, rr * rr))) * 0.9 + 0.25));
    float lit = clamp(dot(N, vSunV), 0.0, 1.0);
    col = vec3(0.06, 0.055, 0.05) * (0.25 + 1.1 * lit * lit + 0.2 * lit) * (0.5 + 0.7 * dens);
    float warm = (1.0 - smoothstep(0.0, 0.25, age)) * smoothstep(0.8, 0.0, rr) * (0.6 + 0.4 * dens);
    col += vec3(1.0, 0.35, 0.08) * warm * 0.4;
    alpha = shape * smoothstep(0.0, 0.08, age) * (1.0 - smoothstep(0.35, 1.0, age)) * 0.75 * (0.6 + 0.4 * dens);
  }
  alpha *= vNear;
  if (alpha < 0.006) discard;
  alpha = min(alpha, 1.0);
#ifdef PREMUL
  // premultiplied "over": colour is added, the background is dimmed by alpha x how solid the kind is
  float occ = (k == 0 || k == 4) ? 0.82 : (k == 2 ? 0.6 : 1.0);
  gl_FragColor = vec4(col * alpha, alpha * occ);
#else
  gl_FragColor = vec4(col, alpha);
#endif
}`;

class ParticleLayer {
  constructor(scene, capacity, premul, renderOrder, name, uniforms) {
    this.capacity = capacity;
    const geo = new THREE.InstancedBufferGeometry();
    const quad = new THREE.PlaneGeometry(1, 1);
    geo.index = quad.index;
    geo.attributes.position = quad.attributes.position;
    geo.attributes.uv = quad.attributes.uv;
    const dyn = (n) =>
      new THREE.InstancedBufferAttribute(
        new Float32Array(capacity * n),
        n,
      ).setUsage(THREE.DynamicDrawUsage);
    this.iPos = dyn(3);
    this.iParam = dyn(4);
    this.iColor = dyn(3);
    this.iAxis = dyn(4);
    geo.setAttribute("iPos", this.iPos);
    geo.setAttribute("iParam", this.iParam);
    geo.setAttribute("iColor", this.iColor);
    geo.setAttribute("iAxis", this.iAxis);
    geo.instanceCount = 0;
    this.mat = new THREE.ShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      uniforms,
      defines: premul ? { PREMUL: 1 } : {},
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide, // rings and shield discs are world-oriented and seen from either side
      fog: false,
    });
    if (premul) {
      this.mat.blending = THREE.CustomBlending;
      this.mat.blendEquation = THREE.AddEquation;
      this.mat.blendSrc = THREE.OneFactor;
      this.mat.blendDst = THREE.OneMinusSrcAlphaFactor;
      this.mat.blendSrcAlpha = THREE.OneFactor;
      this.mat.blendDstAlpha = THREE.OneMinusSrcAlphaFactor;
    } else this.mat.blending = THREE.AdditiveBlending;
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = renderOrder;
    this.mesh.name = name;
    scene.add(this.mesh);
    this.particles = [];
  }
  write() {
    const P = this.particles;
    const n = Math.min(P.length, this.capacity);
    for (let i = 0; i < n; i++) {
      const p = P[i];
      this.iPos.setXYZ(i, p.pos.x, p.pos.y, p.pos.z);
      // particles waiting on a delay are written as zero-size quads
      if (p.age < 0) this.iParam.setXYZW(i, 0, 0, p.seed, p.kind);
      else this.iParam.setXYZW(i, p.age, p.size, p.seed, p.kind);
      this.iColor.setXYZ(i, p.color.r, p.color.g, p.color.b);
      this.iAxis.setXYZW(i, p.axis.x, p.axis.y, p.axis.z, p.extra);
    }
    this.mesh.geometry.instanceCount = n;
    this.iPos.needsUpdate = true;
    this.iParam.needsUpdate = true;
    this.iColor.needsUpdate = true;
    this.iAxis.needsUpdate = true;
  }
}

function newParticle() {
  return {
    pos: new THREE.Vector3(),
    vel: new THREE.Vector3(),
    axis: new THREE.Vector3(0, 1, 0),
    dir: new THREE.Vector3(0, 1, 0), // ship-local axis of a persistent fire's lick (world axis each frame)
    local: new THREE.Vector3(),
    color: new THREE.Color(1, 1, 1),
    ship: null,
    owner: null, // fire emitter that spawned this plume puff
    attached: false,
    hasVel: false,
    kind: 0,
    size: 1,
    size0: 1,
    life: 1,
    age: 0,
    seed: 0,
    loop: false,
    extra: 1,
    drag: 0,
    depth: 0,
  };
}

export class Explosions {
  /**
   * @param scene
   * @param capacity additive particles (flashes, sparks, flak, rings); the smoke layer gets 2x that (plumes
   *   on the burning ships, hit puffs, blast clouds) and the flame layer 0.6x (fireballs, flame licks)
   * @param opts { sun } battle sun uniforms (makeBattleSun()) so smoke is lit from the right side
   */
  constructor(scene, capacity = 1200, opts = {}) {
    this.capacity = capacity;
    this.uniforms = {
      time: { value: 0 },
      sunDir: {
        value: opts.sun
          ? opts.sun.dir.value
          : new THREE.Vector3(-0.35, 0.55, 0.76).normalize(),
      },
    };
    // draw order: scorch (6) < smoke (7) < flame (8) < engine plumes (9) < bolts (10) < additive (11)
    this.smoke = new ParticleLayer(
      scene,
      Math.round(capacity * 2),
      true,
      7,
      "smoke",
      this.uniforms,
    );
    this.flame = new ParticleLayer(
      scene,
      Math.round(capacity * 0.6),
      true,
      8,
      "fireballs",
      this.uniforms,
    );
    this.add = new ParticleLayer(
      scene,
      capacity,
      false,
      11,
      "explosions",
      this.uniforms,
    );
    this._layers = [this.add, this.smoke, this.flame];
    // every heavy hit stamps a scorch (the fleet takes tens a second), so the decal pool is the largest
    this.scorch = new Scorch(scene, Math.round(capacity * 1.5), {
      renderOrder: 6,
    });
    this.spawned = 0;
    this.time = 0;
    this.fires = []; // persistent fire emitters
    this.debris = null; // optional Debris system (effects/debris.js)
    this._debrisAuto = true;
    this._pool = [];
    this._surf = new Map(); // model -> hull extents + per-sample normals
    this._hullColors = new Map(); // model -> debris colour
    this._nearIdx = -1;
    this._nearD2 = Infinity;
    // camera: set by setCamera() each frame, else picked up from the render (no culling until either)
    this._cam = new THREE.Vector3();
    this._camSet = false;
    this._camKnown = false;
    this._sortCam = new THREE.Vector3(1e9, 1e9, 1e9);
    this._sortT = 0;
    this._flakSkip = 0;
    const grab = (renderer, sc, camera) => {
      if (!this._camSet) {
        this._cam.setFromMatrixPosition(camera.matrixWorld);
        this._camKnown = true;
      }
    };
    this.smoke.mesh.onBeforeRender = grab;
    this.add.mesh.onBeforeRender = grab;
  }

  /**
   * Link a Debris system: blasts and heavy hits throw fragments through it. It is stepped from update()
   * unless { autoUpdate: false } is passed (then call debris.update(dt) yourself).
   */
  attachDebris(debris, opts = {}) {
    this.debris = debris;
    this._debrisAuto = opts.autoUpdate !== false;
    return debris;
  }

  /**
   * Tell the effects where the camera is (call once per frame from the main loop). Distant flak is thinned
   * and stripped of sparks / smoke, and the smoke is depth-sorted when the camera has moved. Without it
   * the camera is read from the render pass; before the first frame nothing is culled.
   */
  setCamera(pos) {
    this._cam.copy(pos);
    this._camSet = true;
    this._camKnown = true;
  }

  // ---------------------------------------------------------------------------------------------------
  // spawning
  // ---------------------------------------------------------------------------------------------------

  /**
   * @param pos world Vector3
   * @param opts { kind, size, life, color, ship, local, loop, vel, axis, extra, delay, drag }
   *   kind: hit | flak | fire | smoke | blast | flash | spark | ring | shield | glow | soot | flakSmoke
   *   ship + local: the particle rides the ship (local point); vel: free particle velocity (m/s);
   *   axis: drift direction (fire), velocity direction (spark) or disc normal (ring, shield);
   *   extra: growth ratio over life (smoke), stretch (fire, spark) or intensity (soot); delay: seconds
   *   before it appears.
   * Hot callers should prefer the positional helpers (flash(), hit(), flak(), ...) which allocate nothing.
   */
  spawn(pos, opts = EMPTY) {
    const kind =
      typeof opts.kind === "number" ? opts.kind : (KIND[opts.kind] ?? KIND.hit);
    const p = this._spawn(
      kind,
      pos,
      opts.size || 40,
      opts.life || 1.2,
      opts.color || WHITE,
      opts.ship || null,
      opts.local || null,
    );
    if (!p) return null;
    if (opts.delay) p.age = -opts.delay / p.life;
    p.loop = !!opts.loop;
    if (opts.vel) {
      p.hasVel = true;
      p.vel.copy(opts.vel);
    }
    if (opts.axis) p.axis.copy(opts.axis);
    // a one-shot flame lick on a hull (venting) leans out along the hull normal rather than world-up
    else if (kind === KIND.fire && p.attached)
      this.hullNormal(p.ship, p.local, p.axis);
    if (opts.extra !== undefined) p.extra = opts.extra;
    if (opts.drag) p.drag = opts.drag;
    return p;
  }

  // positional spawn: returns the particle (set vel / axis / extra / delay on it) or null when its layer is
  // full (fireballs stop short of the flame layer's cap: the rest is kept for flame licks)
  _spawn(kind, pos, size, life, color, ship, local) {
    const layer = this._layers[LAYER_OF[kind]];
    const cap =
      layer === this.flame && kind !== KIND.fire
        ? layer.capacity * FLAME_TRANSIENT_CAP
        : layer.capacity;
    if (layer.particles.length >= cap) return null;
    const p = this._pool.pop() || newParticle();
    p.pos.copy(pos);
    p.ship = ship;
    p.owner = null;
    p.attached = !!(ship && local);
    if (p.attached) p.local.copy(local);
    p.kind = kind;
    p.size = size;
    p.size0 = size;
    p.life = life;
    p.age = 0;
    p.seed = Math.random();
    p.color.copy(color);
    p.loop = false;
    p.hasVel = false;
    p.axis.set(0, 1, 0);
    p.dir.set(0, 1, 0);
    p.extra = kind === KIND.smoke ? 2.0 : 1.0;
    p.drag = 0;
    layer.particles.push(p);
    this.spawned++;
    return p;
  }

  // take a live particle out of its layer at once (no fade) and back into the pool
  _release(layer, p) {
    const P = layer.particles;
    const i = P.indexOf(p);
    if (i < 0) return;
    P[i] = P[P.length - 1];
    P.pop();
    p.ship = null;
    p.loop = false;
    if (p.owner) {
      p.owner.puffs--;
      p.owner = null;
    }
    this._pool.push(p);
  }

  /** A bare flash (muzzle flashes): positional, no options object. */
  flash(pos, size = 12, life = 0.1, color = WHITE) {
    return this._spawn(KIND.flash, pos, size, life, color, null, null);
  }

  _room(layer, fraction = 0.8) {
    return layer.particles.length < layer.capacity * fraction;
  }

  // true when the named layer ("add", "smoke" or "flame") is below `frac` of its capacity; budget guards
  // should use this rather than `alive`. "add" also requires the flame layer not to be saturated, since
  // every glowing effect a caller gates with it (hits, fires) needs a fireball or lick there; fireballs
  // stop at FLAME_TRANSIENT_CAP on their own, so only the licks of many fires can fail this test.
  hasRoom(layer = "add", frac = 0.9) {
    if (layer === "smoke") return this._room(this.smoke, frac);
    if (layer === "flame" || layer === "fire")
      return this._room(this.flame, frac);
    return this._room(this.add, frac) && this._room(this.flame, 0.96);
  }

  // ---------------------------------------------------------------------------------------------------
  // hull geometry helpers
  // ---------------------------------------------------------------------------------------------------

  // bounding ellipsoid of a model (from its surface samples) plus, when the model exposes a hull mesh, an
  // outward normal for every surface sample (nearest triangle of the coarsest hull LOD); computed once
  _surfaceOf(model) {
    let e = this._surf.get(model);
    if (e) return e;
    const s = model.surface;
    const c = new THREE.Vector3();
    const inv2 = new THREE.Vector3();
    const L = model.length || 500;
    if (s && s.length >= 9) {
      const min = [Infinity, Infinity, Infinity];
      const max = [-Infinity, -Infinity, -Infinity];
      for (let i = 0; i < s.length; i += 3)
        for (let k = 0; k < 3; k++) {
          if (s[i + k] < min[k]) min[k] = s[i + k];
          if (s[i + k] > max[k]) max[k] = s[i + k];
        }
      c.set(
        (min[0] + max[0]) / 2,
        (min[1] + max[1]) / 2,
        (min[2] + max[2]) / 2,
      );
      const h = (k) => Math.max(10, (max[k] - min[k]) / 2);
      inv2.set(1 / h(0) ** 2, 1 / h(1) ** 2, 1 / h(2) ** 2);
    } else {
      inv2.set(1 / (L * 0.22) ** 2, 1 / (L * 0.08) ** 2, 1 / (L * 0.5) ** 2);
    }
    e = { c, inv2, normals: null, n: 0, R: Math.max(25, L * 0.045) };
    if (s && s.length >= 9) {
      e.n = s.length / 3;
      e.normals = this._sampleNormals(model, e);
    }
    this._surf.set(model, e);
    return e;
  }

  // outward normal per surface sample from the coarsest hull LOD (null when no hull mesh is exposed)
  _sampleNormals(model, e) {
    const s = model.surface;
    if (!model.parts) return null;
    let geo = null;
    for (const lod of [2, 1, 0]) {
      const p = model.parts.find(
        (q) =>
          q.lod === lod &&
          q.name === "hull" &&
          q.geometry &&
          q.geometry.attributes &&
          q.geometry.attributes.position,
      );
      if (p) {
        geo = p.geometry;
        break;
      }
    }
    if (!geo) return null;
    const pos = geo.attributes.position;
    const index = geo.index;
    const triCount = Math.floor((index ? index.count : pos.count) / 3);
    if (triCount < 4) return null;
    const stride = Math.max(1, Math.ceil(triCount / 6000));
    const m = Math.floor(triCount / stride);
    const tri = new Float32Array(m * 9);
    const cen = new Float32Array(m * 3);
    const rad = new Float32Array(m);
    const nor = new Float32Array(m * 3);
    for (let t = 0; t < m; t++) {
      const base = t * stride * 3;
      for (let v = 0; v < 3; v++) {
        const vi = index ? index.getX(base + v) : base + v;
        tri[t * 9 + v * 3] = pos.getX(vi);
        tri[t * 9 + v * 3 + 1] = pos.getY(vi);
        tri[t * 9 + v * 3 + 2] = pos.getZ(vi);
      }
      const ax = tri[t * 9];
      const ay = tri[t * 9 + 1];
      const az = tri[t * 9 + 2];
      const bx = tri[t * 9 + 3];
      const by = tri[t * 9 + 4];
      const bz = tri[t * 9 + 5];
      const cx = tri[t * 9 + 6];
      const cy = tri[t * 9 + 7];
      const cz = tri[t * 9 + 8];
      const mx = (ax + bx + cx) / 3;
      const my = (ay + by + cy) / 3;
      const mz = (az + bz + cz) / 3;
      cen[t * 3] = mx;
      cen[t * 3 + 1] = my;
      cen[t * 3 + 2] = mz;
      rad[t] = Math.sqrt(
        Math.max(
          (ax - mx) ** 2 + (ay - my) ** 2 + (az - mz) ** 2,
          (bx - mx) ** 2 + (by - my) ** 2 + (bz - mz) ** 2,
          (cx - mx) ** 2 + (cy - my) ** 2 + (cz - mz) ** 2,
        ),
      );
      let nx = (by - ay) * (cz - az) - (bz - az) * (cy - ay);
      let ny = (bz - az) * (cx - ax) - (bx - ax) * (cz - az);
      let nz = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
      const nl = Math.hypot(nx, ny, nz);
      if (nl > 1e-9) {
        nx /= nl;
        ny /= nl;
        nz /= nl;
      } else {
        nx = 0;
        ny = 1;
        nz = 0;
      }
      nor[t * 3] = nx;
      nor[t * 3 + 1] = ny;
      nor[t * 3 + 2] = nz;
    }
    const n = s.length / 3;
    const out = new Float32Array(n * 3);
    const farLimit = (model.length || 500) * 0.05;
    for (let i = 0; i < n; i++) {
      const px = s[i * 3];
      const py = s[i * 3 + 1];
      const pz = s[i * 3 + 2];
      let best = Infinity;
      let bestT = -1;
      for (let t = 0; t < m; t++) {
        const dx = px - cen[t * 3];
        const dy = py - cen[t * 3 + 1];
        const dz = pz - cen[t * 3 + 2];
        const lower = Math.sqrt(dx * dx + dy * dy + dz * dz) - rad[t];
        if (lower > 0 && lower * lower >= best) continue;
        const o = t * 9;
        const d2 = pointTriDist2(
          px,
          py,
          pz,
          tri[o],
          tri[o + 1],
          tri[o + 2],
          tri[o + 3],
          tri[o + 4],
          tri[o + 5],
          tri[o + 6],
          tri[o + 7],
          tri[o + 8],
        );
        if (d2 < best) {
          best = d2;
          bestT = t;
        }
      }
      // ellipsoid normal as the outward reference (and the fallback when the mesh is far from the sample)
      _v.set(px, py, pz);
      this._ellipsoidLocal(e, _v, _n2);
      if (bestT < 0 || best > farLimit * farLimit) {
        out[i * 3] = _n2.x;
        out[i * 3 + 1] = _n2.y;
        out[i * 3 + 2] = _n2.z;
        continue;
      }
      let nx = nor[bestT * 3];
      let ny = nor[bestT * 3 + 1];
      let nz = nor[bestT * 3 + 2];
      if (nx * _n2.x + ny * _n2.y + nz * _n2.z < 0) {
        nx = -nx;
        ny = -ny;
        nz = -nz;
      }
      out[i * 3] = nx;
      out[i * 3 + 1] = ny;
      out[i * 3 + 2] = nz;
    }
    return out;
  }

  _ellipsoidLocal(e, local, out) {
    out.copy(local).sub(e.c);
    out.set(out.x * e.inv2.x, out.y * e.inv2.y, out.z * e.inv2.z);
    if (out.lengthSq() < 1e-14) out.set(0, 1, 0);
    else out.normalize();
    return out;
  }

  // nearest surface sample of a model to a local point (index into this._nearIdx, distance^2 in _nearD2)
  _nearest(model, local) {
    const s = model.surface;
    let best = Infinity;
    let bi = -1;
    const x = local.x;
    const y = local.y;
    const z = local.z;
    for (let i = 0; i < s.length; i += 3) {
      const dx = s[i] - x;
      const dy = s[i + 1] - y;
      const dz = s[i + 2] - z;
      const d = dx * dx + dy * dy + dz * dz;
      if (d < best) {
        best = d;
        bi = i / 3;
      }
    }
    this._nearIdx = bi;
    this._nearD2 = best;
  }

  // outward hull normal (ship-local) at a local point: the hull mesh normal at the nearest surface sample
  // when the point is close to one, blending into the bounding-ellipsoid normal further away
  _normalLocal(ship, local, out) {
    const e = this._surfaceOf(ship.model);
    this._ellipsoidLocal(e, local, out);
    if (!e.normals) return out;
    this._nearest(ship.model, local);
    if (this._nearIdx < 0 || this._nearD2 >= e.R * e.R) return out;
    const d = Math.sqrt(this._nearD2);
    const w = 1 - THREE.MathUtils.smoothstep(d, e.R * 0.4, e.R);
    const i = this._nearIdx * 3;
    _n2.set(e.normals[i], e.normals[i + 1], e.normals[i + 2]);
    out.lerp(_n2, w);
    if (out.lengthSq() < 1e-8) out.copy(_n2);
    else out.normalize();
    return out;
  }

  // kept for callers of the old name
  _outwardLocal(ship, local, out) {
    return this._normalLocal(ship, local, out);
  }

  /**
   * World-space outward hull normal at a ship-local point, for shieldHit() and hit() callers that have no
   * surface normal. Writes into `out` and returns it.
   */
  hullNormal(ship, local, out) {
    return this._normalLocal(ship, local, out).transformDirection(ship.matrix);
  }

  // debris colour of a model: its LOD-0 hull tint x the plating map's mean albedo, a little scorched
  _hullColorOf(model) {
    let c = this._hullColors.get(model);
    if (c) return c;
    c = new THREE.Color(0.06, 0.06, 0.065);
    const parts = model.parts || [];
    const part =
      parts.find((p) => p.lod === 0 && p.name === "hull") ||
      parts.find((p) => p.lod === 0);
    const col =
      part && part.geometry && part.geometry.attributes
        ? part.geometry.attributes.color
        : null;
    if (col && col.count) {
      let r = 0;
      let g = 0;
      let b = 0;
      let n = 0;
      const step = Math.max(1, Math.floor(col.count / 400));
      for (let i = 0; i < col.count; i += step) {
        r += col.getX(i);
        g += col.getY(i);
        b += col.getZ(i);
        n++;
      }
      c.setRGB((r / n) * 0.36, (g / n) * 0.36, (b / n) * 0.36);
    }
    this._hullColors.set(model, c);
    return c;
  }

  // ---------------------------------------------------------------------------------------------------
  // impacts
  // ---------------------------------------------------------------------------------------------------

  /**
   * A hull hit, staged: a hard flash for a couple of frames, a fireball with a boiling edge rolling out
   * with one or two secondaries, sparks flying outward, always a dark smoke puff 1.5-2x the fireball that
   * lingers a few seconds, a scorch under a third of the heavy hits and, sometimes, a loose plate. Sizes:
   * fighter ~14, light ~30, heavy ~58 m. `normal` (world, optional) is the hull normal at the impact
   * (e.g. -bolt.dir); without it the hull normal is estimated from the ship's surface.
   */
  hit(pos, size = 40, ship = null, local = null, normal = null) {
    const level = size >= 45 ? 2 : size >= 20 ? 1 : 0;
    this._impact(pos, size, ship, local, normal, level);
  }

  /**
   * Secondary explosion on a dying ship (the choreography's 3-5 s death ripple): a big fireball with
   * roll-out, a squirt of hull-coloured debris, heavy smoke and a scorch at a ship-local hull point.
   */
  secondary(ship, local, size = 90) {
    _w3.copy(local).applyMatrix4(ship.matrix);
    this._impact(_w3, size, ship, local, null, 3);
  }

  // level: 0 fighter, 1 light, 2 heavy, 3 secondary (death ripple). `pos` must not alias a scratch vector.
  _impact(pos, size, ship, local, normal, level) {
    const attached = !!(ship && local);
    // world normal _n and, when attached, the ship-local normal _nl (lifted attach point, scorch)
    if (attached) {
      if (normal) {
        _n.copy(normal).normalize();
        _nl.copy(_n).applyQuaternion(_q.copy(ship.quaternion).invert());
      } else {
        this._normalLocal(ship, local, _nl);
        _n.copy(_nl).transformDirection(ship.matrix);
      }
    } else if (normal) _n.copy(normal).normalize();
    else if (ship) _n.copy(pos).sub(ship.position).normalize();
    else _n.set(0, 1, 0);
    // lift the fireball off the hull a little (the depth bias in the shader does the rest)
    const lift = size * 0.2;
    _w.copy(pos).addScaledVector(_n, lift);
    if (attached) _l.copy(local).addScaledVector(_nl, lift);
    const sh = attached ? ship : null;
    const lo = attached ? _l : null;
    // (the ragged silhouette fills ~60 % of the quad, hence the generous quad size)
    const fb = size * (level >= 2 ? 1.3 : 1.2);
    // 1. the fireball is the one essential particle; everything else yields when its layer runs full
    const main = this._spawn(
      KIND.hit,
      _w,
      fb,
      level >= 2 ? 0.9 + Math.random() * 0.5 : 0.7 + Math.random() * 0.4,
      WHITE,
      sh,
      lo,
    );
    // 2. hard white flash: two frames, 25-40 m on a heavy hit
    if (this._room(this.add, 0.95))
      this._spawn(
        KIND.flash,
        _w,
        size * (level >= 2 ? 0.6 : 0.5),
        0.06,
        HOT,
        sh,
        lo,
      );
    // 3. roll-out: smaller fireballs boiling out of the first one a moment later
    const nRoll = level >= 3 ? 3 : level;
    if (nRoll && main && this._room(this.flame, 0.9)) {
      if (attached) _inv.copy(ship.matrix).invert();
      for (let i = 0; i < nRoll; i++) {
        _w2.copy(_w).addScaledVector(_n, fb * (0.25 + 0.2 * i));
        randDir(_v).multiplyScalar(fb * 0.3 * Math.random());
        _w2.add(_v);
        if (attached) _l2.copy(_w2).applyMatrix4(_inv);
        const p = this._spawn(
          KIND.hit,
          _w2,
          fb * (0.75 - 0.15 * i),
          0.7 + Math.random() * 0.4,
          WHITE,
          sh,
          attached ? _l2 : null,
        );
        if (p) p.age = -(0.1 + 0.12 * i) / p.life;
      }
    }
    // 4. sparks: bright streaks flying outward
    if (this._room(this.add, 0.85)) {
      const ns =
        level >= 3
          ? 12 + Math.floor(Math.random() * 5)
          : level === 2
            ? 8 + Math.floor(Math.random() * 5)
            : level === 1
              ? 5 + Math.floor(Math.random() * 3)
              : 2 + Math.floor(Math.random() * 2);
      for (let i = 0; i < ns; i++) {
        randDir(_v).multiplyScalar(0.9).add(_n).normalize();
        const speed = (25 + size * 1.4) * (0.5 + Math.random());
        _w2.copy(_v).multiplyScalar(speed);
        if (ship) _w2.add(ship.velocity);
        const p = this._spawn(
          KIND.spark,
          pos,
          Math.max(1.2, size * (level >= 3 ? 0.045 : 0.07)),
          0.5 + Math.random() * 0.6,
          WHITE,
          null,
          null,
        );
        if (!p) break;
        p.hasVel = true;
        p.vel.copy(_w2);
        p.axis.copy(_v);
        p.extra = 3.5;
        p.drag = 0.6;
      }
    }
    // 5. smoke: always on light and heavy hits (fighter hits sometimes): a dark puff 1.5-2x the fireball
    // that drifts off along the normal, lags a moving ship and lingers 3-5 s
    if (this._room(this.smoke, 0.97) && (level >= 1 || Math.random() < 0.3)) {
      _v.copy(_n).multiplyScalar(8 + size * 0.2);
      if (ship) _v.addScaledVector(ship.velocity, 0.85);
      _v.x += (Math.random() - 0.5) * size * 0.15;
      _v.y += (Math.random() - 0.5) * size * 0.15;
      _v.z += (Math.random() - 0.5) * size * 0.15;
      const p = this._spawn(
        KIND.smoke,
        _w,
        fb * (level >= 3 ? 1.8 : level === 2 ? 1.6 : 1.4),
        level >= 2 ? 3.5 + Math.random() * 2 : 2.5 + Math.random() * 1.5,
        WHITE,
        null,
        null,
      );
      if (p) {
        p.hasVel = true;
        p.vel.copy(_v);
        p.extra = 2.0;
        p.drag = 0.3;
        p.age = -0.08 / p.life;
      }
    }
    // 6. scorch (1.5x the hit size, fading over 40-80 s) under every heavy hit and secondary, so a hull
    // under fire visibly blackens; repeated hits on one spot refresh and widen the mark instead of
    // stacking, and the pool evicts the most faded mark when full
    if (attached && level >= 2)
      this.scorch.stamp(ship, local, _nl, Math.min(size * 1.5, SCORCH_MAX), {
        kind: 1,
        life: 40 + Math.random() * 40,
      });
    // 7. debris: heavy hits knock a plate or two loose (half the pool stays free for detonations);
    // secondaries squirt a handful of hull-coloured chunks
    if (this.debris) {
      if (level >= 3) {
        this.debris.burst(
          pos,
          5 + Math.floor(Math.random() * 5),
          35 + size * 0.5,
          {
            size: Math.max(2, size * 0.045),
            dir: _n,
            velocity: ship ? ship.velocity : null,
            life: [10, 25],
            heat: 0.8,
            evict: false,
            color: ship ? this._hullColorOf(ship.model) : null,
          },
        );
      } else if (
        level >= 2 &&
        Math.random() < 0.2 &&
        this.debris.alive < this.debris.capacity * 0.5
      ) {
        this.debris.burst(
          pos,
          1 + Math.floor(Math.random() * 2),
          30 + size * 0.6,
          {
            size: size * 0.05,
            dir: _n,
            velocity: ship ? ship.velocity : null,
            life: [8, 18],
            heat: 0.5,
            evict: false,
            color: ship ? this._hullColorOf(ship.model) : null,
          },
        );
      }
    }
  }

  /**
   * Shield ripple: a translucent hex-pattern disc oriented along the hull normal, a ring travelling out
   * from the impact, plus a small flash. Optional ship + local make it ride the ship for its short life.
   */
  shieldHit(pos, normal, size = 60, color = null, ship = null, local = null) {
    _n.copy(normal).normalize();
    if (_n.lengthSq() < 0.5) _n.set(0, 1, 0);
    const lift = size * 0.03;
    _w.copy(pos).addScaledVector(_n, lift);
    const attached = !!(ship && local);
    if (attached) {
      _nl.copy(_n).applyQuaternion(_q.copy(ship.quaternion).invert());
      _l.copy(local).addScaledVector(_nl, lift);
    }
    const col = color || SHIELD_COLOR;
    const sh = attached ? ship : null;
    const lo = attached ? _l : null;
    const p = this._spawn(
      KIND.shield,
      _w,
      size,
      0.5 + Math.random() * 0.15,
      col,
      sh,
      lo,
    );
    if (p) p.axis.copy(_n);
    this._spawn(KIND.flash, _w, size * 0.45, 0.1, col, sh, lo);
  }

  /**
   * Flak, two stages: a hard white-orange core with short rays for a tenth of a second, then a small dark
   * ragged puff lit warm from inside for its first moments, lingering 1.5-3 s; a few sparks up close.
   * Bursts vary 3x in size around `size`. Thinned by distance when the camera is known: beyond 2 km two
   * bursts in three are drawn, beyond 5 km one in three, beyond 8 km (and for the tiny fighter-laser
   * bursts) only the core.
   */
  flak(pos, size = 60) {
    let far = false;
    if (this._camKnown) {
      const d2 = pos.distanceToSquared(this._cam);
      if (d2 > FLAK_THIN_NEAR * FLAK_THIN_NEAR) {
        this._flakSkip = (this._flakSkip + 1) % 3;
        const keep = d2 > FLAK_THIN_FROM * FLAK_THIN_FROM ? 1 : 2;
        if (this._flakSkip >= keep) return;
      }
      far = d2 > FLAK_CULL_FAR * FLAK_CULL_FAR;
    }
    const s = size * (0.55 + Math.random() * 1.1);
    this._spawn(
      KIND.flak,
      pos,
      s,
      0.1 + Math.random() * 0.06,
      WHITE,
      null,
      null,
    );
    if (size < 20 || far) return; // fighter-laser bursts and distant flak: the core alone
    if (this._room(this.smoke, 0.8)) {
      const p = this._spawn(
        KIND.flakSmoke,
        pos,
        s * 0.9,
        1.5 + Math.random() * 1.5,
        WHITE,
        null,
        null,
      );
      if (p) {
        randDir(_v).multiplyScalar(s * 0.05);
        p.hasVel = true;
        p.vel.copy(_v);
        p.age = -0.04 / p.life;
      }
    }
    if (this._room(this.add, 0.85)) {
      const ns = 2 + Math.floor(Math.random() * 3);
      for (let i = 0; i < ns; i++) {
        randDir(_v);
        _w2.copy(_v).multiplyScalar(s * 0.9 * (0.4 + Math.random() * 0.6));
        const p = this._spawn(
          KIND.spark,
          pos,
          Math.max(1, s * 0.045),
          0.3 + Math.random() * 0.3,
          WHITE,
          null,
          null,
        );
        if (!p) break;
        p.hasVel = true;
        p.vel.copy(_w2);
        p.axis.copy(_v);
        p.extra = 3;
        p.drag = 0.8;
      }
    }
  }

  // ---------------------------------------------------------------------------------------------------
  // persistent fires
  // ---------------------------------------------------------------------------------------------------

  // the burning (not yet dying) emitter on a ship within `radius` of a local point, if any
  _fireNear(ship, local, radius) {
    let best = null;
    let bd = radius * radius;
    for (const F of this.fires) {
      if (F.ship !== ship || F.dead) continue;
      const d = F.local.distanceToSquared(local);
      if (d < bd) {
        bd = d;
        best = F;
      }
    }
    return best;
  }

  // fresh life for a burning emitter; a bigger request grows the fire
  _rekindle(F, size) {
    F.age = Math.min(F.age, 2);
    F.lifeTotal = FIRE_LIFE[0] + Math.random() * (FIRE_LIFE[1] - FIRE_LIFE[0]);
    if (size > F.size) {
      const k = size / F.size;
      F.size = size;
      for (const p of F.parts) p.size0 *= k;
      if (F.soot) F.soot.size0 *= k;
      if (F.decal) F.decal.size *= k;
      F.speed = 22 + size * 0.12;
      F.life = 6 + Math.min(size, 150) * 0.027;
    }
    return F;
  }

  // the flame layer is full and a persistent fire needs a lick: put out the smallest live fire (fires on
  // wrecks last: a hulk's fires are the scene) and free its licks at once. True when something was freed.
  _evictLick(exclude) {
    let victim = null;
    let victimWreck = false;
    for (const F of this.fires) {
      if (F === exclude || F.dead) continue;
      let hasLick = false;
      for (const p of F.parts) if (p.kind === KIND.fire) hasLick = true;
      if (!hasLick) continue;
      const wreck = F.ship.health === 0;
      if (
        !victim ||
        (victimWreck && !wreck) ||
        (wreck === victimWreck && F.size < victim.size)
      ) {
        victim = F;
        victimWreck = wreck;
      }
    }
    if (!victim) return false;
    const parts = victim.parts;
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      if (p.kind !== KIND.fire) continue;
      parts[i] = parts[parts.length - 1];
      parts.pop();
      this._release(this.flame, p);
    }
    this._endFire(victim);
    return true;
  }

  /**
   * Persistent burning wound on a ship (local point): two or three flame licks and a glow anchored to the
   * hull over a dark soot base. Each lick has its own size (30-65 m as a rule, now and then 80-120 m),
   * phase and direction (up to 25 degrees off the fire's drift: outward from the hull, leaning aft), a
   * plume of smoke puffs streams along the drift 200-400 m, and a scorch decal 3x the fire darkens the
   * hull under it. The fire burns 60-120 s unless re-ignited (fire() again near the same point, or
   * reignite()); on a wreck (health 0) it burns until extinguish(). A ship holds at most 12 fires (the
   * smallest goes out to make room). Returns the emitter.
   */
  fire(ship, local, size = 60) {
    const near = this._fireNear(ship, local, Math.max(20, size * 0.6));
    if (near) return this._rekindle(near, size);
    let count = 0;
    let smallest = null;
    for (const F of this.fires) {
      if (F.ship !== ship || F.dead) continue;
      count++;
      if (!smallest || F.size < smallest.size) smallest = F;
    }
    if (count >= MAX_FIRES_PER_SHIP && smallest) this._endFire(smallest);
    const F = {
      ship,
      local: local.clone(),
      normal: new THREE.Vector3(), // ship-local outward normal
      size,
      drift: new THREE.Vector3(),
      driftW: new THREE.Vector3(),
      world: new THREE.Vector3(),
      parts: [], // licks + glow (looping particles)
      soot: null,
      decal: null,
      // plume: puff speed x life ~ 220 m for a 60 m fire, ~400 m for a 150 m one
      speed: 22 + size * 0.12,
      life: 6 + Math.min(size, 150) * 0.027,
      timer: Math.random() * 0.4,
      puffs: 0, // plume puffs alive
      maxPuffs: 7,
      age: 0,
      lifeTotal: FIRE_LIFE[0] + Math.random() * (FIRE_LIFE[1] - FIRE_LIFE[0]),
      intensity: 0,
      dead: false,
      cool: FIRE_COOL,
    };
    // outward from the hull with an aft lean (+z local) and a little randomness
    this._normalLocal(ship, local, F.normal);
    F.drift.copy(F.normal);
    F.drift.z += 0.55;
    F.drift.x += (Math.random() - 0.5) * 0.3;
    F.drift.y += (Math.random() - 0.5) * 0.2;
    F.drift.normalize();
    F.world.copy(F.local).applyMatrix4(ship.matrix);
    F.driftW.copy(F.drift).transformDirection(ship.matrix);
    // lick sizes: 30-65 m as a rule whatever the fire's size (the fire's size sets the plume and the
    // soot), with a big 80-120 m lick now and then, more often on the big fires of a wreck
    const base = THREE.MathUtils.clamp(size * 0.5, 30, 65);
    const bigAt = Math.floor(
      Math.random() < (size >= 100 ? 0.4 : 0.2) ? Math.random() * 3 : -1,
    );
    const lick = (i, lift, life) => {
      _l.copy(F.local).addScaledVector(F.drift, size * lift);
      _w.copy(_l).applyMatrix4(ship.matrix);
      const s =
        i === bigAt
          ? 80 + Math.random() * 40
          : base * (0.8 + Math.random() * 0.45);
      let p = this._spawn(KIND.fire, _w, s, life, WHITE, ship, _l);
      if (!p && this._evictLick(F))
        p = this._spawn(KIND.fire, _w, s, life, WHITE, ship, _l);
      if (!p) return;
      p.loop = true;
      // own direction: the drift tilted up to 25 degrees about a random perpendicular axis
      randDir(_v).cross(F.drift);
      if (_v.lengthSq() < 1e-6) _v.set(1, 0, 0).cross(F.drift);
      _q.setFromAxisAngle(_v.normalize(), (Math.random() * 2 - 1) * LICK_TILT);
      p.dir.copy(F.drift).applyQuaternion(_q);
      p.axis.copy(p.dir).transformDirection(ship.matrix);
      p.extra = 1.1 + Math.random() * 0.4; // height over width
      p.age = Math.random(); // desynchronise the licks
      p.color.setRGB(0, 0, 0); // intensity ramps in
      F.parts.push(p);
    };
    // two licks always, a third while the layer is not crowded
    lick(0, 0.08, 0.55 + Math.random() * 0.25);
    lick(1, 0.04, 0.45 + Math.random() * 0.2);
    if (this._room(this.flame, 0.75)) lick(2, 0.02, 0.35 + Math.random() * 0.2);
    _l.copy(F.local).addScaledVector(F.drift, size * 0.2);
    _w.copy(_l).applyMatrix4(ship.matrix);
    const glow = this._spawn(KIND.glow, _w, size * 1.1, 1, WHITE, ship, _l);
    if (glow) {
      glow.loop = true;
      glow.dir.copy(F.drift);
      glow.color.setRGB(0, 0, 0);
      F.parts.push(glow);
    }
    // the dark base: a soot cloud hugging the hull under the licks so the flame reads against cream plating
    _l.copy(F.local).addScaledVector(F.normal, size * 0.1);
    _w.copy(_l).applyMatrix4(ship.matrix);
    const soot = this._spawn(KIND.soot, _w, size * 1.6, 1, WHITE, ship, _l);
    if (soot) {
      soot.loop = true;
      soot.extra = 0;
      F.soot = soot;
    }
    F.decal = this.scorch.stamp(ship, F.local, F.normal, size * 3.0, {
      kind: 0,
      hold: true,
    });
    this.fires.push(F);
    return F;
  }

  /**
   * Re-ignite the fire nearest a ship-local point (fresh 60-120 s of life; grows it when `size` is bigger).
   * With a `size` and no fire within reach a new fire starts there. Returns the emitter or null.
   */
  reignite(ship, local, size = 0) {
    const F = this._fireNear(ship, local, Math.max(30, size * 0.8));
    if (F) return this._rekindle(F, size);
    return size > 0 ? this.fire(ship, local, size) : null;
  }

  // put out every fire on a ship (licks die out over a couple of seconds, plumes drift away) and drop
  // its scorch decals (the hulk is being retired)
  extinguish(ship) {
    for (const F of this.fires)
      if (F.ship === ship && !F.dead) this._endFire(F);
    this.scorch.removeShip(ship);
  }

  // a fire goes out: licks and glow stop looping, the soot fades with the intensity, the decal fades
  _endFire(F) {
    if (F.dead) return;
    F.dead = true;
    F.cool = FIRE_COOL;
    for (const p of F.parts) p.loop = false;
    F.parts.length = 0;
    if (F.decal) {
      this.scorch.release(F.decal, 60 + Math.random() * 30);
      F.decal = null;
    }
  }

  // remove an emitter record (its soot particle is released; anything else has already stopped looping)
  _dropFire(i, immediate) {
    const F = this.fires[i];
    this.fires[i] = this.fires[this.fires.length - 1];
    this.fires.pop();
    if (F.soot) {
      F.soot.loop = false;
      F.soot.age = 1;
      F.soot = null;
    }
    if (immediate) {
      for (const p of F.parts) {
        p.loop = false;
        p.age = 1;
      }
      F.parts.length = 0;
      if (F.decal) this.scorch.removeShip(F.ship);
      F.decal = null;
    }
  }

  // ---------------------------------------------------------------------------------------------------
  // detonations
  // ---------------------------------------------------------------------------------------------------

  /**
   * Big detonation, staged: a hard white flash, a shock ring, the main expanding fireball with two beside
   * it and rolling secondaries boiling out over the next second, a spray of sparks, a long-lived black
   * smoke cloud 400-800 m across drifting with the hulk and, when a Debris system is attached, a burst of
   * tumbling fragments in the hull colour.
   * opts { normal: ring orientation (world), velocity: base velocity of the debris/smoke (the hulk's),
   * ship: the dying ship (its hull colour for the debris), color: debris colour override, debris: count
   * or false }
   */
  blast(pos, size = 400, opts = EMPTY) {
    const base = opts.velocity || null;
    const color =
      opts.color !== undefined
        ? opts.color
        : opts.ship
          ? this._hullColorOf(opts.ship.model)
          : null;
    // flash: a hard pop, then a softer broad glow for a moment
    this._spawn(KIND.flash, pos, size * 0.5, 0.1, HOT, null, null);
    const soft = this._spawn(
      KIND.flash,
      pos,
      size * 1.05,
      0.35,
      WHITE,
      null,
      null,
    );
    if (soft) {
      soft.color.setRGB(0.5, 0.4, 0.3);
      soft.extra = 0;
    }
    if (opts.normal) _n.copy(opts.normal).normalize();
    else randDir(_n);
    const ring = this._spawn(
      KIND.ring,
      pos,
      size * 1.3,
      1.3,
      WHITE,
      null,
      null,
    );
    if (ring) {
      ring.axis.copy(_n);
      ring.age = -0.04 / ring.life;
    }
    // main fireball, two beside it, then rolling secondaries around it a little later (spread apart so
    // they read as a boiling mass rather than one disc)
    for (let i = 0; i < 8; i++) {
      const late = i >= 3;
      const off =
        i === 0 ? 0 : size * (late ? 0.5 : 0.28) * (0.4 + 0.6 * Math.random());
      randDir(_v).multiplyScalar(off);
      _w.copy(pos).add(_v);
      if (base) _w.addScaledVector(base, late ? 0.4 : 0.05);
      const p = this._spawn(
        KIND.blast,
        _w,
        size *
          (i === 0
            ? 0.72
            : late
              ? 0.35 + Math.random() * 0.2
              : 0.46 + Math.random() * 0.12),
        i === 0
          ? 2.4
          : late
            ? 1.6 + Math.random() * 0.8
            : 1.5 + Math.random() * 0.5,
        WHITE,
        null,
        null,
      );
      if (!p) break;
      p.age =
        -(late ? 0.3 + Math.random() * 1.1 : Math.random() * 0.1) / p.life;
    }
    for (let i = 0; i < 30; i++) {
      randDir(_v);
      _w2.copy(_v).multiplyScalar(size * 0.9 * (0.35 + Math.random() * 0.65));
      if (base) _w2.add(base);
      const p = this._spawn(
        KIND.spark,
        pos,
        Math.max(2.5, size * 0.02),
        1.2 + Math.random(),
        WHITE,
        null,
        null,
      );
      if (!p) break;
      p.hasVel = true;
      p.vel.copy(_w2);
      p.axis.copy(_v);
      p.extra = 4;
      p.drag = 0.35;
      p.age = -(Math.random() * 0.1) / p.life;
    }
    // the black cloud: big puffs seeded around the blast that grow 2.5x, live 12-20 s and ride the hulk's
    // velocity so the wreck drifts out of its own smoke
    for (let i = 0; i < 14; i++) {
      randDir(_v);
      _w.copy(pos).addScaledVector(_v, size * 0.45 * Math.random());
      _w2.copy(_v).multiplyScalar(size * 0.06 * (0.5 + Math.random()));
      if (base) _w2.add(base);
      const p = this._spawn(
        KIND.smoke,
        _w,
        size * (0.45 + Math.random() * 0.2),
        12 + Math.random() * 8,
        CLOUD,
        null,
        null,
      );
      if (!p) break;
      p.hasVel = true;
      p.vel.copy(_w2);
      p.extra = 2.5;
      p.drag = 0.05;
      p.age = -(0.3 + Math.random() * 1.0) / p.life;
    }
    if (this.debris && opts.debris !== false)
      this.debris.burst(pos, opts.debris || 120, 25 + size * 0.15, {
        size: Math.max(2.5, size * 0.022),
        radius: size * 0.2,
        velocity: base,
        color,
      });
  }

  // ---------------------------------------------------------------------------------------------------
  // per-frame
  // ---------------------------------------------------------------------------------------------------

  _updateFires(dt) {
    if (!this.fires.length) return;
    // plume budget: fires share ~55 % of the smoke layer in proportion to their size, so the big fires of
    // a badly damaged ship keep long plumes while small ones get a wisp; spawning slows as the layer fills
    // and stops at 92 % so blasts and hits always find room
    const occ = this.smoke.particles.length / this.smoke.capacity;
    let sizeSum = 0;
    for (const F of this.fires) sizeSum += F.size;
    const perSize = (0.55 * this.smoke.capacity) / Math.max(1, sizeSum);
    const throttle = 1 + (2 * Math.max(0, occ - 0.6)) / 0.4;
    const plumes = occ < 0.92;
    for (let i = this.fires.length - 1; i >= 0; i--) {
      const F = this.fires[i];
      const s = F.ship;
      if (s.alive === false) {
        this._dropFire(i, true);
        continue;
      }
      // a wreck (health 0) burns until it is retired: its fires never age out, only extinguish() or
      // eviction ends them
      const wreck = s.health === 0;
      if (!F.dead) {
        F.age += dt;
        if (F.age >= F.lifeTotal && !wreck) this._endFire(F);
      }
      if (F.dead) {
        F.cool -= dt;
        if (F.cool <= 0) {
          this._dropFire(i, false);
          continue;
        }
      }
      // intensity: catches over 2 s, holds, dies down over the last 12 s (or the cool-down when put out)
      let I = Math.min(1, F.age / 2);
      const remain = F.lifeTotal - F.age;
      if (remain < 12 && !wreck) I *= Math.max(0, remain / 12);
      if (F.dead) I *= Math.max(0, F.cool / FIRE_COOL);
      F.intensity = I;
      F.world.copy(F.local).applyMatrix4(s.matrix);
      F.driftW.copy(F.drift).transformDirection(s.matrix);
      const k = 0.35 + 0.65 * I;
      for (const p of F.parts) {
        p.axis.copy(p.dir).transformDirection(s.matrix);
        p.size = p.size0 * k;
        p.color.setRGB(I, I, I);
      }
      if (F.soot) {
        F.soot.extra = I;
        F.soot.size = F.soot.size0 * (0.6 + 0.4 * I);
      }
      F.timer -= dt;
      if (F.timer <= 0) {
        const maxPuffs = Math.max(
          2,
          Math.min(18, Math.round(F.size * perSize)),
        );
        F.maxPuffs = maxPuffs;
        F.timer = (F.life / maxPuffs) * throttle * (0.7 + 0.6 * Math.random());
        if (!plumes || F.puffs >= maxPuffs || I < 0.15) continue;
        // release the puff downstream of the licks so it does not smother the flame
        _w.copy(F.world).addScaledVector(F.driftW, F.size * 0.6);
        _v.copy(F.driftW)
          .multiplyScalar(F.speed * (0.8 + 0.4 * Math.random()))
          .addScaledVector(s.velocity, 0.35);
        _v.x += (Math.random() - 0.5) * F.speed * 0.25;
        _v.y += (Math.random() - 0.5) * F.speed * 0.25;
        _v.z += (Math.random() - 0.5) * F.speed * 0.25;
        const p = this._spawn(
          KIND.smoke,
          _w,
          F.size * 0.75 * (0.8 + 0.4 * Math.random()),
          F.life * (0.8 + 0.4 * Math.random()),
          WHITE,
          null,
          null,
        );
        if (p) {
          p.hasVel = true;
          p.vel.copy(_v);
          p.extra = 3.0;
          p.drag = 0.12;
          p.owner = F;
          F.puffs++;
        }
      }
    }
  }

  _step(layer, dt) {
    const P = layer.particles;
    for (let i = P.length - 1; i >= 0; i--) {
      const p = P[i];
      p.age += dt / p.life;
      if (p.age >= 1) {
        if (p.loop && (!p.ship || p.ship.alive !== false)) {
          p.age = 0;
          p.seed = Math.random();
        } else {
          P[i] = P[P.length - 1];
          P.pop();
          p.ship = null;
          if (p.owner) {
            p.owner.puffs--;
            p.owner = null;
          }
          this._pool.push(p);
          continue;
        }
      }
      if (p.age < 0) continue; // waiting on its delay
      if (p.attached) p.pos.copy(p.local).applyMatrix4(p.ship.matrix);
      else if (p.hasVel) {
        p.pos.addScaledVector(p.vel, dt);
        if (p.drag > 0) p.vel.multiplyScalar(Math.max(0, 1 - p.drag * dt));
      }
    }
    layer.write();
  }

  // back-to-front order for the normal-blended layers (only when the camera has moved a good way, or
  // every few seconds as the puffs drift); newly spawned particles append at the end (drawn on top)
  _sort(layer) {
    const P = layer.particles;
    const c = this._cam;
    for (let i = 0; i < P.length; i++)
      P[i].depth = P[i].pos.distanceToSquared(c);
    P.sort(byDepthDesc);
  }

  update(dt) {
    this.time += dt;
    this.uniforms.time.value = this.time;
    this._updateFires(dt);
    this._step(this.add, dt);
    this._step(this.smoke, dt);
    this._step(this.flame, dt);
    if (this._camKnown) {
      this._sortT -= dt;
      if (
        this._sortT <= 0 ||
        this._cam.distanceToSquared(this._sortCam) > SORT_MOVE * SORT_MOVE
      ) {
        this._sort(this.smoke);
        this._sort(this.flame);
        this._sortCam.copy(this._cam);
        this._sortT = 4;
      }
    }
    this.scorch.update(dt);
    if (this.debris && this._debrisAuto) this.debris.update(dt);
  }

  // glowing particles alive (additive + flame layers): the legacy budget gate. Smoke has its own, bigger
  // pool; gate on hasRoom(layer, frac) and read `counts` / `total` for the full picture.
  get alive() {
    return this.add.particles.length + this.flame.particles.length;
  }

  get total() {
    return (
      this.add.particles.length +
      this.flame.particles.length +
      this.smoke.particles.length
    );
  }

  get counts() {
    return {
      additive: this.add.particles.length,
      flame: this.flame.particles.length,
      smoke: this.smoke.particles.length,
      fires: this.fires.length,
      scorch: this.scorch.alive,
      debris: this.debris ? this.debris.alive : 0,
    };
  }
}

export { KIND as EXPLOSION_KIND };
