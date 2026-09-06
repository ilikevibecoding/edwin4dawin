// Instanced crowd renderer for the Coruscant population (rubric 07 rows 4, 5, 7, 11). All humanoids share one
// InstancedMesh (astromechs and sweeper droids get one each), one skin atlas (npc/skins-sw.js cells) and one
// material, so 150 animated NPCs cost 3 draw calls. Limb animation runs in the vertex shader from a per-instance
// (mode, phase, speed, amplitude) attribute; blinking and head turns are per instance too, lighting is the sampled
// world light like the town's entity material (per instance instead of per material). The geometry is authored in
// the rest pose with a per-vertex pivot, so the shadow pass (override depth material) still sees standing figures.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { REGIONS as R } from '../skins.js';
import { PX } from '../model.js';
import { SHARED, canvasTexture } from '../../entityMaterial.js';
import { SHADING_PARS, bindShading } from '../../render/shading.js';
import { paintSWSkin, SW_ARCHETYPES, CELL_W, CELL_H } from '../skins-sw.js';

export const MODE = {
  IDLE: 0, WALK: 1, TYPING: 2, SERVING: 3, SWEEPING: 4, WELDING: 5, SITTING: 6, SLEEPING: 7, GUARD: 8, EATING: 9, DANCING: 10, TALKING: 11,
  MEDITATING: 12, BROWSING: 13, EXERCISING: 14, RUN: 15, SPEAKING: 16, CARRY: 17, ROLL: 18, WAITING: 19, TENDING: 20, WATCHING: 21,
};
export const BODY = { HUMANOID: 0, ASTROMECH: 1, SWEEPER: 2 };
export const VARIANTS = 6;         // skins per humanoid archetype (even = male, odd = female)
export const DROID_VARIANTS = 4;
const ATLAS_COLS = 16;

const HEAD = { top: R.headTop, bottom: R.headBottom, right: R.headRight, front: R.headFront, left: R.headLeft, back: R.headBack };
const BODYR = { top: R.bodyTop, bottom: R.bodyBottom, right: R.bodyRight, front: R.bodyFront, left: R.bodyLeft, back: R.bodyBack };
const ARM = { top: R.armTop, bottom: R.armBottom, right: R.armRight, front: R.armFront, left: R.armLeft, back: R.armBack };
const LEG = { top: R.legTop, bottom: R.legBottom, right: R.legRight, front: R.legFront, left: R.legLeft, back: R.legBack };

// part index: 0 head, 1 body, 2 right arm, 3 left arm, 4 right leg, 5 left leg (the shader animates by index)
const HUMANOID_PARTS = [
  { idx: 0, w: 8, h: 8, d: 8, uv: HEAD, off: [0, 4, 0], pos: [0, 24, 0] },
  { idx: 1, w: 8, h: 12, d: 4, uv: BODYR, off: [0, 0, 0], pos: [0, 18, 0] },
  { idx: 2, w: 4, h: 12, d: 4, uv: ARM, off: [0, -4, 0], pos: [-6, 22, 0] },
  { idx: 3, w: 4, h: 12, d: 4, uv: ARM, off: [0, -4, 0], pos: [6, 22, 0] },
  { idx: 4, w: 4, h: 12, d: 4, uv: LEG, off: [0, -6, 0], pos: [-2, 12, 0] },
  { idx: 5, w: 4, h: 12, d: 4, uv: LEG, off: [0, -6, 0], pos: [2, 12, 0] },
];
// astromech: dome (head), barrel (body), two outrigger legs; ~1.1 blocks tall
const ASTROMECH_PARTS = [
  { idx: 0, w: 8, h: 5, d: 8, uv: HEAD, off: [0, 2.5, 0], pos: [0, 14, 0] },
  { idx: 1, w: 8, h: 12, d: 8, uv: BODYR, off: [0, 0, 0], pos: [0, 8, 0] },
  { idx: 4, w: 3, h: 13, d: 4, uv: LEG, off: [0, -6.5, 0], pos: [-6.5, 13, 0] },
  { idx: 5, w: 3, h: 13, d: 4, uv: LEG, off: [0, -6.5, 0], pos: [6.5, 13, 0] },
];
// sweeper: low chassis (body), sensor turret (head), brush bar in front (right arm), two wheel housings (legs)
const SWEEPER_PARTS = [
  { idx: 1, w: 10, h: 5, d: 12, uv: BODYR, off: [0, 0, 0], pos: [0, 3.5, 0] },
  { idx: 0, w: 4, h: 3, d: 4, uv: HEAD, off: [0, 1.5, 0], pos: [0, 6, 2] },
  { idx: 2, w: 8, h: 2, d: 2, uv: ARM, off: [0, -1, 0], pos: [0, 2.5, 6.5] },
  { idx: 4, w: 2, h: 3, d: 3, uv: LEG, off: [0, 0, 0], pos: [-4.5, 1.5, -3] },
  { idx: 5, w: 2, h: 3, d: 3, uv: LEG, off: [0, 0, 0], pos: [4.5, 1.5, -3] },
];

function applyCellUV(geo, regions) {
  const uv = geo.attributes.uv;
  const order = [regions.left, regions.right, regions.top, regions.bottom, regions.front, regions.back];
  for (let f = 0; f < 6; f++) {
    const r = order[f];
    for (let k = 0; k < 4; k++) {
      const i = f * 4 + k;
      const u = uv.getX(i) > 0.5 ? 1 : 0, vTop = uv.getY(i) > 0.5;
      uv.setXY(i, (r[0] + u * r[2]) / CELL_W, (vTop ? r[1] : r[1] + r[3]) / CELL_H);
    }
  }
  uv.needsUpdate = true;
}

function buildParts(parts) {
  const geos = [];
  for (const p of parts) {
    const g = new THREE.BoxGeometry(p.w * PX, p.h * PX, p.d * PX);
    applyCellUV(g, p.uv);
    g.translate((p.off[0] + p.pos[0]) * PX, (p.off[1] + p.pos[1]) * PX, (p.off[2] + p.pos[2]) * PX);
    const n = g.attributes.position.count;
    const pivot = new Float32Array(n * 3), part = new Float32Array(n);
    for (let i = 0; i < n; i++) { pivot[i * 3] = p.pos[0] * PX; pivot[i * 3 + 1] = p.pos[1] * PX; pivot[i * 3 + 2] = p.pos[2] * PX; part[i] = p.idx; }
    g.setAttribute('pivot', new THREE.BufferAttribute(pivot, 3));
    g.setAttribute('part', new THREE.BufferAttribute(part, 1));
    geos.push(g);
  }
  const merged = mergeGeometries(geos, false);
  for (const g of geos) g.dispose();
  merged.computeBoundingSphere();
  return merged;
}

const VERT = /* glsl */ `
attribute vec3 pivot;
attribute float part;
attribute float iSkin;
attribute vec4 iAnim;   // mode, phase offset, speed (rad/s), amplitude
attribute vec2 iLook;   // head yaw, head pitch
attribute vec2 iLight;  // sky, block light at the NPC
attribute vec2 iMisc;   // blink seed (0 = never blinks), emissive boost
uniform float uTime;
uniform vec2 uAtlasCells; // columns, rows
varying vec2 vUv;
varying vec2 vCell;      // pixel coords inside the 64x32 cell (blink strip test)
varying float vShade;
varying float vDist;
varying vec2 vLight;
varying vec2 vMisc;
#if FANCY
varying vec3 vWorldPos;
varying vec3 vNormal;
#endif
mat3 rotX(float a) { float c = cos(a), s = sin(a); return mat3(1.0, 0.0, 0.0, 0.0, c, s, 0.0, -s, c); }
mat3 rotY(float a) { float c = cos(a), s = sin(a); return mat3(c, 0.0, -s, 0.0, 1.0, 0.0, s, 0.0, c); }
mat3 rotZ(float a) { float c = cos(a), s = sin(a); return mat3(c, s, 0.0, -s, c, 0.0, 0.0, 0.0, 1.0); }
// Limb angles (x swing, z spread) for part p in animation mode m at phase ph. Mirrors the town NPC poses.
void limbs(int p, float m, float ph, float amp, out float ax, out float az, out float by) {
  ax = 0.0; az = 0.0; by = 0.0;
  float s = sin(ph), c = cos(ph);
  bool rArm = p == 2, lArm = p == 3, rLeg = p == 4, lLeg = p == 5, arm = rArm || lArm, leg = rLeg || lLeg;
  float side = (rArm || rLeg) ? 1.0 : -1.0;
  if (m < 0.5) { // idle: faint sway
    if (arm) { ax = 0.0; az = side * (0.05 + 0.04 * sin(uTime * 1.5 + ph)); }
  } else if (m < 1.5 || m > 14.5 && m < 15.5 || m > 16.5 && m < 17.5) { // walk / run / carry
    float sw = s * 0.75 * amp;
    if (leg) ax = side * sw;
    if (arm) {
      if (m > 16.5) { ax = -1.5 + s * 0.05; az = side * 0.1; }               // carrying a crate
      else if (m > 14.5) { ax = -2.2 + side * s * 0.5; az = side * 0.35; }  // arms up, running
      else { ax = -side * sw * 0.9; az = side * 0.05; }
    }
  } else if (m < 2.5) { // typing at a console
    if (arm) { ax = -1.3 + (rArm ? sin(ph * 4.0) : cos(ph * 3.3)) * 0.12; az = side * 0.15; }
  } else if (m < 3.5) { // serving: tray on the right, left arm free
    if (rArm) { ax = -1.45; az = 0.1; } if (lArm) { ax = -0.2 + s * 0.15; az = -0.08; }
  } else if (m < 4.5) { // sweeping arc
    if (rArm) { ax = -0.9 + c * 0.2; az = 0.45 + s * 0.45; } if (lArm) { ax = -0.7 + c * 0.2; az = -0.1 + s * 0.35; }
    if (p == 1) by = s * 0.18;
  } else if (m < 5.5) { // welding: kneeling on one knee, torch arm forward
    if (rArm) { ax = -1.1 + sin(ph * 6.0) * 0.06; az = 0.2; } if (lArm) { ax = -0.6; az = -0.15; }
    if (rLeg) ax = -1.6; if (lLeg) ax = -0.4;
  } else if (m < 6.5 || m > 8.5 && m < 9.5 || m > 11.5 && m < 12.5) { // sitting / eating / meditating
    if (leg) ax = -1.5708;
    if (arm) { ax = -0.4; az = side * 0.08; }
    if (m > 8.5 && m < 9.5 && rArm) ax = -1.2 - max(0.0, s) * 1.1;                  // fork to mouth
    if (m > 11.5 && arm) { ax = -0.95; az = side * 0.12; }                             // hands on knees
  } else if (m < 7.5) { // sleeping: straight, arms at the sides (the instance is laid flat)
    if (arm) az = side * 0.08;
  } else if (m < 8.5) { // guard at attention: rigid
    if (arm) az = side * 0.02;
  } else if (m < 10.5) { // dancing
    if (arm) { ax = -2.4 + side * s * 0.4; az = side * (0.5 + 0.3 * c); }
    if (leg) ax = side * s * 0.35;
    if (p == 1) by = s * 0.25;
  } else if (m < 11.5 || m > 15.5 && m < 16.5) { // talking / speaking gestures
    if (rArm) { ax = -0.9 + s * 0.35; az = 0.3 + c * 0.15; } if (lArm) { ax = -0.3 + c * 0.2; az = -0.1; }
  } else if (m < 13.5) { // browsing: hands together low
    if (arm) { ax = -0.7; az = side * -0.25; }
  } else if (m < 14.5) { // exercising: alternate lifts
    if (rArm) ax = -1.6 - max(0.0, s) * 1.4; if (lArm) ax = -1.6 - max(0.0, -s) * 1.4;
    if (leg) ax = side * s * 0.2;
  } else if (m < 18.5) { // droid roll: static limbs
  } else if (m < 19.5) { // waiting: arms crossed-ish
    if (arm) { ax = -1.2; az = side * -0.35; }
  } else if (m < 20.5) { // tending: bent forward, both arms low and forward
    if (arm) { ax = -1.0 + s * 0.1; az = side * 0.1; }
  } else { // watching: one hand shading the eyes
    if (rArm) { ax = -2.6; az = 0.05; }
  }
}
void main() {
  vUv = uv;
  vCell = uv * vec2(${CELL_W}.0, ${CELL_H}.0);
  vLight = iLight;
  vMisc = iMisc;
  float ph = uTime * iAnim.z + iAnim.y;
  int p = int(part + 0.5);
  float ax, az, by;
  limbs(p, iAnim.x, ph, iAnim.w, ax, az, by);
  mat3 rot = mat3(1.0);
  if (p == 0) rot = rotY(iLook.x) * rotX(iLook.y);
  else if (p == 1) rot = rotY(by);
  else rot = rotZ(az) * rotX(ax);
  // bodies bob while walking/dancing; the whole figure leans in a run
  vec3 local = pivot + rot * (position - pivot);
  if (p != 4 && p != 5 && (iAnim.x > 0.5 && iAnim.x < 1.5 || iAnim.x > 14.5 && iAnim.x < 15.5 || iAnim.x > 9.5 && iAnim.x < 10.5)) local.y += abs(sin(ph)) * 0.03 * iAnim.w;
  vec4 world = modelMatrix * instanceMatrix * vec4(local, 1.0);
  vec3 n = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * (rot * normal));
  vec3 l1 = normalize(vec3(0.2, 1.0, -0.7));
  vec3 l2 = normalize(vec3(-0.2, 1.0, 0.7));
  float d = max(dot(n, l1), 0.0) + max(dot(n, l2), 0.0);
  vShade = clamp(0.55 + 0.45 * d * 0.7, 0.0, 1.0);
  vec4 mv = viewMatrix * world;
  vDist = length(mv.xyz);
#if FANCY
  vWorldPos = world.xyz;
  vNormal = n;
#endif
  // atlas cell of this instance's skin
  float col = mod(iSkin, uAtlasCells.x), row = floor(iSkin / uAtlasCells.x);
  vUv = (uv + vec2(col, row)) / uAtlasCells;
  gl_Position = projectionMatrix * mv;
}`;

const FRAG = /* glsl */ `
uniform sampler2D map;
uniform float uSkyLight;
uniform vec3 uSkyTint;
uniform vec3 uFogColor;
uniform float uFogNear;
uniform float uFogFar;
uniform float uFlash;
uniform float uTime;
uniform vec2 uAtlasCells;
varying vec2 vUv;
varying vec2 vCell;
varying float vShade;
varying float vDist;
varying vec2 vLight;
varying vec2 vMisc;
#if FANCY
varying vec3 vWorldPos;
varying vec3 vNormal;
${SHADING_PARS}
#endif
float lightCurve(float l) { float c = l / (4.0 - 3.0 * l); return mix(c, l, 0.4); }
float blockCurve(float l) { float c = l / (4.0 - 3.0 * l); return mix(c, l, 0.6); }
void main() {
  vec4 tex = texture2D(map, vUv);
  if (tex.a < 0.5) discard;
  // blink: the eye strip (head-front row 4, columns 2..6) takes the cheek colour for ~150 ms every few seconds
  if (vMisc.x > 0.0 && vCell.y >= 12.0 && vCell.y < 13.0 && vCell.x >= 10.0 && vCell.x < 15.0) {
    float period = 2.8 + 2.4 * fract(vMisc.x * 7.13);
    float t = fract((uTime + vMisc.x * 13.7) / period);
    if (t < 0.045) {
      vec2 cheek = vUv + vec2(9.5 - vCell.x, 13.5 - vCell.y) / (vec2(${CELL_W}.0, ${CELL_H}.0) * uAtlasCells);
      tex = texture2D(map, cheek) * vec4(0.85, 0.85, 0.85, 1.0);
    }
  }
  float skyCurved = lightCurve(vLight.x);
  float sky = skyCurved * uSkyLight;
  float blk = blockCurve(vLight.y);
  vec3 blkCol = vec3(blk) * vec3(1.0, 0.9, 0.72);
#if FANCY
  vec3 N = normalize(vNormal);
  vec3 V = normalize(uCamPos - vWorldPos);
  vec3 light = shadingLight(vec3(sky) * uSkyTint, blkCol, vWorldPos, N, skyCurved, vDist);
  vec3 fogC = fogColorDir(uFogColor, -V);
#else
  vec3 light = max(vec3(sky) * uSkyTint, blkCol);
  vec3 fogC = uFogColor;
#endif
  light = max(light, vec3(0.035)) + vec3(uFlash);
  vec3 col = tex.rgb * light * vShade;
  if (tex.a < 0.9) col = tex.rgb * (1.3 + 0.3 * sin(uTime * 6.0 + vMisc.x)); // photoreceptors / status lights glow
  float f = smoothstep(uFogNear, uFogFar, vDist);
  col = mix(col, fogC, f);
  gl_FragColor = vec4(col, 1.0);
}`;

function makeCrowdMaterial(texture, cells) {
  const m = new THREE.ShaderMaterial({
    defines: { FANCY: 0 },
    uniforms: {
      map: { value: texture }, uSkyLight: SHARED.uSkyLight, uSkyTint: SHARED.uSkyTint, uFogColor: SHARED.uFogColor, uFogNear: SHARED.uFogNear,
      uFogFar: SHARED.uFogFar, uFlash: SHARED.uFlash, uTime: { value: 0 }, uAtlasCells: { value: new THREE.Vector2(cells[0], cells[1]) },
    },
    vertexShader: VERT, fragmentShader: FRAG, side: THREE.FrontSide,
  });
  bindShading(m);
  m.userData.shadowCaster = true;
  return m;
}

class InstancePool {
  constructor(geometry, material, capacity, name) {
    this.capacity = capacity;
    this.mesh = new THREE.InstancedMesh(geometry, material, capacity);
    this.mesh.name = name;
    this.mesh.frustumCulled = false;   // instances span the whole loaded area; culling per whole mesh would pop everyone
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.attr = {
      iSkin: new THREE.InstancedBufferAttribute(new Float32Array(capacity), 1),
      iAnim: new THREE.InstancedBufferAttribute(new Float32Array(capacity * 4), 4),
      iLook: new THREE.InstancedBufferAttribute(new Float32Array(capacity * 2), 2),
      iLight: new THREE.InstancedBufferAttribute(new Float32Array(capacity * 2), 2),
      iMisc: new THREE.InstancedBufferAttribute(new Float32Array(capacity * 2), 2),
    };
    for (const [k, a] of Object.entries(this.attr)) { a.setUsage(THREE.DynamicDrawUsage); geometry.setAttribute(k, a); }
    this.free = [];
    for (let i = capacity - 1; i >= 0; i--) this.free.push(i);
    const zero = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < capacity; i++) this.mesh.setMatrixAt(i, zero);
    this.mesh.count = capacity;
    this.dirty = true;
  }
  alloc() { return this.free.length ? this.free.pop() : -1; }
  release(i) { this.mesh.setMatrixAt(i, ZERO); this.free.push(i); this.dirty = true; }
  flush() {
    if (!this.dirty) return;
    this.dirty = false;
    this.mesh.instanceMatrix.needsUpdate = true;
    for (const a of Object.values(this.attr)) a.needsUpdate = true;
  }
}
const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);

const _pos = new THREE.Vector3(), _quat = new THREE.Quaternion(), _scale = new THREE.Vector3(), _euler = new THREE.Euler(0, 0, 0, 'YXZ'), _m = new THREE.Matrix4();

export class CrowdRenderer {
  // capacities: live humanoids / astromechs / sweepers the pools can hold at once
  constructor(scene, { humanoids = 160, astromechs = 40, sweepers = 40 } = {}) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'coruscant-crowd';
    scene.add(this.group);
    // atlas: every archetype x variants, 16 cells per row
    this.skins = new Map(); // `${archetype}:${variant}` -> cell index
    const cells = [];
    for (const a of SW_ARCHETYPES) {
      const n = a.endsWith('droid') || a === 'astromech' ? DROID_VARIANTS : VARIANTS;
      for (let v = 0; v < n; v++) { this.skins.set(a + ':' + v, cells.length); cells.push([a, v]); }
    }
    const rows = Math.ceil(cells.length / ATLAS_COLS);
    const canvas = document.createElement('canvas'); canvas.width = ATLAS_COLS * CELL_W; canvas.height = rows * CELL_H;
    const ctx = canvas.getContext('2d');
    cells.forEach(([a, v], i) => {
      const female = a.endsWith('droid') || a === 'astromech' ? null : (v % 2 === 1);
      paintSWSkin(ctx, (i % ATLAS_COLS) * CELL_W, Math.floor(i / ATLAS_COLS) * CELL_H, a, SW_ARCHETYPES.indexOf(a) * 100 + v + 1, female);
    });
    this.atlas = canvas;
    this.texture = canvasTexture(canvas);
    this.material = makeCrowdMaterial(this.texture, [ATLAS_COLS, rows]);
    this.pools = [
      new InstancePool(buildParts(HUMANOID_PARTS), this.material, humanoids, 'crowd-humanoid'),
      new InstancePool(buildParts(ASTROMECH_PARTS), this.material, astromechs, 'crowd-astromech'),
      new InstancePool(buildParts(SWEEPER_PARTS), this.material, sweepers, 'crowd-sweeper'),
    ];
    for (const p of this.pools) this.group.add(p.mesh);
    this.live = 0;
  }

  skinIndex(archetype, variant, female) {
    const droid = archetype.endsWith('droid') || archetype === 'astromech';
    const n = droid ? DROID_VARIANTS : VARIANTS;
    let v = ((variant % n) + n) % n;
    if (!droid) v = (v & ~1) | (female ? 1 : 0);
    if (v >= n) v -= 2;
    return this.skins.get(archetype + ':' + v) ?? 0;
  }

  bodyFor(archetype) { return archetype === 'astromech' ? BODY.ASTROMECH : archetype === 'sweeper droid' ? BODY.SWEEPER : BODY.HUMANOID; }

  // Reserve an instance: { body, i } or null when the pool is full.
  alloc(body) {
    const i = this.pools[body].alloc();
    if (i < 0) return null;
    this.live++;
    return { body, i };
  }
  release(slot) { if (!slot) return; this.pools[slot.body].release(slot.i); this.live--; }

  // v: { x, y, z, yaw, pitch (lying), scale, skin, mode, phase, speed, amp, headYaw, headPitch, sky, blk, blink, hidden }
  set(slot, v) {
    const pool = this.pools[slot.body], i = slot.i;
    if (v.hidden) { pool.mesh.setMatrixAt(i, ZERO); pool.dirty = true; return; }
    _pos.set(v.x, v.y, v.z);
    _euler.set(v.pitch || 0, v.yaw || 0, 0);
    _quat.setFromEuler(_euler);
    const s = v.scale || 1;
    _scale.set(s, s, s);
    _m.compose(_pos, _quat, _scale);
    pool.mesh.setMatrixAt(i, _m);
    pool.attr.iSkin.array[i] = v.skin;
    const an = pool.attr.iAnim.array; an[i * 4] = v.mode; an[i * 4 + 1] = v.phase || 0; an[i * 4 + 2] = v.speed || 0; an[i * 4 + 3] = v.amp == null ? 1 : v.amp;
    const lk = pool.attr.iLook.array; lk[i * 2] = v.headYaw || 0; lk[i * 2 + 1] = v.headPitch || 0;
    const li = pool.attr.iLight.array; li[i * 2] = v.sky == null ? 1 : v.sky; li[i * 2 + 1] = v.blk || 0;
    const mi = pool.attr.iMisc.array; mi[i * 2] = v.blink || 0; mi[i * 2 + 1] = 0;
    pool.dirty = true;
  }

  update(timeSeconds) {
    this.material.uniforms.uTime.value = timeSeconds;
    for (const p of this.pools) p.flush();
  }

  get drawCalls() { return this.pools.length; }

  dispose() {
    this.scene.remove(this.group);
    for (const p of this.pools) p.mesh.geometry.dispose();
    this.material.dispose();
    this.texture.dispose();
  }
}
