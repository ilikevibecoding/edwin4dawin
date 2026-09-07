// Instanced crowd renderer for the Coruscant population (rubric 07 rows 4, 5, 7, 11). All humanoids share one
// InstancedMesh (astromechs and sweeper droids get one each), one skin atlas and one material, so 150 animated NPCs
// cost 3 draw calls. Limb animation runs in the vertex shader from a per-instance (mode, phase, speed, amplitude)
// attribute; blinking and head turns are per instance too, lighting is the sampled world light like the town's
// entity material (per instance instead of per material). The geometry is authored in the rest pose with a
// per-vertex pivot, so the shadow pass (override depth material) still sees standing figures.
//
// Crowd appearance v2 (P6): the atlas cells are 128x64 appearances painted by the character-appearance composer
// (npc/appearance/crowdCells.js: 19 archetypes x 2 genders x 12 seeds + children + droids, ~500 cells, 2048 px
// wide) instead of the 22 x 6 hand-painted skins. Cells are painted lazily - when a person first wears one, and in
// idle slices for the rest - into a CPU raster; a cell's pixels go to the GPU (one packed copyTextureToTexture per
// cell, at the start of the frame) the first time somebody wears it, so nothing is painted or uploaded at load
// beyond the looks actually on screen. A per-cell float table (RGBA32F, one row per
// cell) tells the vertex shader the eye rects for blinking, the body scale (species / gender silhouette) and up to
// MAX_BOXES (12) geometry boxes - lekku, montrals, horns, hair volume, hats, capes, skirts - that ride along as
// twelve extra instanced boxes per humanoid, sized from the table and collapsed to a point when unused. Nearby
// people never share a cell when their group has one to spare (spread on assignment, repair pass while they walk).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { REGIONS as R } from '../skins.js';
import { PX } from '../model.js';
import { SHARED } from '../../entityMaterial.js';
import { SHADING_PARS, bindShading } from '../../render/shading.js';
import { CELL_W as SW_W, CELL_H as SW_H } from '../skins-sw.js';
import { Raster } from '../appearance/raster.js';
import {
  buildCrowdCellTable, composeCrowdCell, blitCell, fillCellRow, emptyCellRow, cellSummary,
  CELL_W, CELL_H, ATLAS_COLS, TAB_W, T_EYE_A, T_EYE_B, T_SCALE, T_LID, T_BOX0, MAX_BOXES,
} from '../appearance/crowdCells.js';

export const MODE = {
  IDLE: 0, WALK: 1, TYPING: 2, SERVING: 3, SWEEPING: 4, WELDING: 5, SITTING: 6, SLEEPING: 7, GUARD: 8, EATING: 9, DANCING: 10, TALKING: 11,
  MEDITATING: 12, BROWSING: 13, EXERCISING: 14, RUN: 15, SPEAKING: 16, CARRY: 17, ROLL: 18, WAITING: 19, TENDING: 20, WATCHING: 21,
};
export const BODY = { HUMANOID: 0, ASTROMECH: 1, SWEEPER: 2 };
export const SPREAD_R = 20;        // blocks: a newcomer never takes a cell somebody this close already wears (rubric: 12)
export const PAIR_R = 13;          // blocks: two people this close wearing one cell get repaired (the farther one from the camera re-spreads)
export const REPAIR_NEAR = 8;      // blocks: nobody this close to the camera ever changes appearance
export const REPAIR_EVERY = 0.5;   // seconds between repair passes (one swap per pass)
export const CHILD_SCALE_MAX = 0.85; // instances scaled below this are children (census.js scales them to 0.72)
const ACC_EPS = 0.0005;            // rest-pose half size of an accessory box: the depth pass renders raw positions
const SWEEP_DELAY_MS = 1500;       // idle painting of the not-yet-worn cells starts this long after construction

// classic 64x32 regions (skins.js); the 2x cells keep the same normalised UVs
const HEAD = { top: R.headTop, bottom: R.headBottom, right: R.headRight, front: R.headFront, left: R.headLeft, back: R.headBack };
const BODYR = { top: R.bodyTop, bottom: R.bodyBottom, right: R.bodyRight, front: R.bodyFront, left: R.bodyLeft, back: R.bodyBack };
const ARM = { top: R.armTop, bottom: R.armBottom, right: R.armRight, front: R.armFront, left: R.armLeft, back: R.armBack };
const LEG = { top: R.legTop, bottom: R.legBottom, right: R.legRight, front: R.legFront, left: R.legLeft, back: R.legBack };

// part index: 0 head, 1 body, 2 right arm, 3 left arm, 4 right leg, 5 left leg (the shader animates by index);
// 6.. are the accessory boxes (attach part + box from the cell table)
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
      uv.setXY(i, (r[0] + u * r[2]) / SW_W, (vTop ? r[1] : r[1] + r[3]) / SW_H);
    }
  }
  uv.needsUpdate = true;
}

// Body parts plus `accessories` unit boxes. An accessory box is authored as a 1 mm cube at the origin (the shadow
// pass draws raw positions); the shader rebuilds it from the cell table: sign(position) is the corner, `acc` carries
// (face index, u corner, v corner) for the face rect lookup.
function buildParts(parts, accessories = 0) {
  const geos = [];
  const tag = (g, idx, fill) => {
    const n = g.attributes.position.count;
    const pivot = new Float32Array(n * 3), part = new Float32Array(n), acc = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { part[i] = idx; fill(i, pivot, acc); }
    g.setAttribute('pivot', new THREE.BufferAttribute(pivot, 3));
    g.setAttribute('part', new THREE.BufferAttribute(part, 1));
    g.setAttribute('acc', new THREE.BufferAttribute(acc, 3));
  };
  for (const p of parts) {
    const g = new THREE.BoxGeometry(p.w * PX, p.h * PX, p.d * PX);
    applyCellUV(g, p.uv);
    g.translate((p.off[0] + p.pos[0]) * PX, (p.off[1] + p.pos[1]) * PX, (p.off[2] + p.pos[2]) * PX);
    tag(g, p.idx, (i, pivot) => { pivot[i * 3] = p.pos[0] * PX; pivot[i * 3 + 1] = p.pos[1] * PX; pivot[i * 3 + 2] = p.pos[2] * PX; });
    geos.push(g);
  }
  for (let b = 0; b < accessories; b++) {
    const g = new THREE.BoxGeometry(1, 1, 1);
    const pos = g.attributes.position, uv = g.attributes.uv;
    for (let i = 0; i < pos.count; i++) pos.setXYZ(i, Math.sign(pos.getX(i)) * ACC_EPS, Math.sign(pos.getY(i)) * ACC_EPS, Math.sign(pos.getZ(i)) * ACC_EPS);
    tag(g, 6 + b, (i, pivot, acc) => { acc[i * 3] = Math.floor(i / 4); acc[i * 3 + 1] = uv.getX(i) > 0.5 ? 1 : 0; acc[i * 3 + 2] = uv.getY(i) > 0.5 ? 0 : 1; });
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
attribute vec3 acc;     // accessory boxes: face index, u corner, v corner (0 top row, 1 bottom row)
attribute float iSkin;  // atlas cell = row of the cell table
attribute vec4 iAnim;   // mode, phase offset, speed (rad/s), amplitude
attribute vec2 iLook;   // head yaw, head pitch
attribute vec2 iLight;  // sky, block light at the NPC
attribute vec2 iMisc;   // blink seed (0 = never blinks), emissive boost
uniform float uTime;
uniform vec2 uAtlasCells; // columns, rows
uniform highp sampler2D uTable; // RGBA32F, ${TAB_W} texels per cell: eye rects, body scale, eyelid colour, boxes
varying vec2 vUv;
varying vec2 vCell;      // pixel coords inside the ${CELL_W}x${CELL_H} cell (blink test)
varying float vShade;
varying float vDist;
varying vec2 vLight;
varying vec2 vMisc;
flat varying vec4 vEyeA;
flat varying vec4 vEyeB;
flat varying vec3 vLid;
#if FANCY
varying vec3 vWorldPos;
varying vec3 vNormal;
#endif
const float PXU = ${PX.toFixed(6)};
const vec2 CELL = vec2(${CELL_W}.0, ${CELL_H}.0);
mat3 rotX(float a) { float c = cos(a), s = sin(a); return mat3(1.0, 0.0, 0.0, 0.0, c, s, 0.0, -s, c); }
mat3 rotY(float a) { float c = cos(a), s = sin(a); return mat3(c, 0.0, -s, 0.0, 1.0, 0.0, s, 0.0, c); }
mat3 rotZ(float a) { float c = cos(a), s = sin(a); return mat3(c, s, 0.0, -s, c, 0.0, 0.0, 0.0, 1.0); }
// pivots of the six humanoid parts (model.js), in skin pixels
vec3 partPivot(int p) {
  if (p == 0) return vec3(0.0, 24.0, 0.0);
  if (p == 1) return vec3(0.0, 18.0, 0.0);
  if (p == 2) return vec3(-6.0, 22.0, 0.0);
  if (p == 3) return vec3(6.0, 22.0, 0.0);
  if (p == 4) return vec3(-2.0, 12.0, 0.0);
  return vec3(2.0, 12.0, 0.0);
}
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
  int cell = int(iSkin + 0.5);
  vec4 sc = texelFetch(uTable, ivec2(${T_SCALE}, cell), 0);   // body scale xyz, box count
  vEyeA = texelFetch(uTable, ivec2(${T_EYE_A}, cell), 0);
  vEyeB = texelFetch(uTable, ivec2(${T_EYE_B}, cell), 0);
  vLid = texelFetch(uTable, ivec2(${T_LID}, cell), 0).rgb;
  vLight = iLight;
  vMisc = iMisc;
  float ph = uTime * iAnim.z + iAnim.y;
  int p = int(part + 0.5);
  int ap = p;            // the animated part this vertex follows
  vec3 pv = pivot;
  vec3 pos = position;
  vec2 cuv = uv;         // uv inside the cell (0..1)
  bool dead = false;
  if (p >= 6) {          // accessory box b: centre / attach part / size / face rects from the table
    int t = ${T_BOX0} + (p - 6) * 8;
    vec4 c = texelFetch(uTable, ivec2(t, cell), 0);
    if (c.w < 0.5) { dead = true; ap = 0; }
    else {
      ap = int(c.w - 0.5);
      pv = partPivot(ap) * PXU;
      vec3 sz = texelFetch(uTable, ivec2(t + 1, cell), 0).xyz;
      pos = pv + (c.xyz + sign(position) * 0.5 * sz) * PXU;
      vec4 rc = texelFetch(uTable, ivec2(t + 2 + int(acc.x + 0.5), cell), 0);
      cuv = (rc.xy + vec2(acc.y * rc.z, acc.z * rc.w)) / CELL;
    }
  }
  float ax, az, by;
  limbs(ap, iAnim.x, ph, iAnim.w, ax, az, by);
  mat3 rot = mat3(1.0);
  if (ap == 0) rot = rotY(iLook.x) * rotX(iLook.y);
  else if (ap == 1) rot = rotY(by);
  else rot = rotZ(az) * rotX(ax);
  // bodies bob while walking/dancing; the whole figure leans in a run
  vec3 local = dead ? pv : pv + rot * (pos - pv);
  if (ap != 4 && ap != 5 && (iAnim.x > 0.5 && iAnim.x < 1.5 || iAnim.x > 14.5 && iAnim.x < 15.5 || iAnim.x > 9.5 && iAnim.x < 10.5)) local.y += abs(sin(ph)) * 0.03 * iAnim.w;
  local *= sc.xyz;       // species / gender silhouette
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
  vCell = cuv * CELL;
  vUv = (cuv + vec2(col, row)) / uAtlasCells;
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
flat varying vec4 vEyeA;
flat varying vec4 vEyeB;
flat varying vec3 vLid;
#if FANCY
varying vec3 vWorldPos;
varying vec3 vNormal;
${SHADING_PARS}
#endif
float lightCurve(float l) { float c = l / (4.0 - 3.0 * l); return mix(c, l, 0.4); }
float blockCurve(float l) { float c = l / (4.0 - 3.0 * l); return mix(c, l, 0.6); }
bool inRect(vec2 c, vec4 r) { return c.x >= r.x && c.x < r.x + r.z && c.y >= r.y && c.y < r.y + r.w; }
void main() {
  vec4 tex = texture2D(map, vUv);
  if (tex.a < 0.5) discard;
  // blink: the cell's two eye rects take the eyelid colour for ~150 ms every few seconds (w = 0: no eyes to close)
  if (vMisc.x > 0.0 && vEyeA.z > 0.0) {
    float period = 2.8 + 2.4 * fract(vMisc.x * 7.13);
    float t = fract((uTime + vMisc.x * 13.7) / period);
    if (t < 0.045 && (inRect(vCell, vEyeA) || inRect(vCell, vEyeB))) tex = vec4(vLid, 1.0);
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

function makeCrowdMaterial(texture, table, cells) {
  const m = new THREE.ShaderMaterial({
    defines: { FANCY: 0 },
    uniforms: {
      map: { value: texture }, uTable: { value: table }, uSkyLight: SHARED.uSkyLight, uSkyTint: SHARED.uSkyTint, uFogColor: SHARED.uFogColor, uFogNear: SHARED.uFogNear,
      uFogFar: SHARED.uFogFar, uFlash: SHARED.uFlash, uTime: { value: 0 }, uAtlasCells: { value: new THREE.Vector2(cells[0], cells[1]) },
    },
    vertexShader: VERT, fragmentShader: FRAG, side: THREE.FrontSide,
  });
  bindShading(m);
  m.userData.shadowCaster = true;
  return m;
}

// dataReady = false: the renderer allocates the texture (texStorage2D) without uploading `data`
function dataTexture(data, w, h, type, dataReady = true) {
  const t = new THREE.DataTexture(data, w, h, THREE.RGBAFormat, type);
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false; t.flipY = false; t.colorSpace = THREE.NoColorSpace;
  t.source.dataReady = dataReady;
  t.needsUpdate = true;
  return t;
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
    // per slot: the base cell the integrator asked for, the cell actually worn (after child / spread), child flag,
    // last position (for the spread test)
    this.base = new Int32Array(capacity).fill(-1);
    this.cell = new Int32Array(capacity).fill(-1);
    this.child = new Uint8Array(capacity);
    this.hidden = new Uint8Array(capacity);
    this.px = new Float32Array(capacity);
    this.pz = new Float32Array(capacity);
    this.free = [];
    for (let i = capacity - 1; i >= 0; i--) this.free.push(i);
    const zero = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < capacity; i++) this.mesh.setMatrixAt(i, zero);
    this.mesh.count = capacity;
    this.dirty = true;
  }
  alloc() { return this.free.length ? this.free.pop() : -1; }
  release(i) { this.mesh.setMatrixAt(i, ZERO); this.base[i] = -1; this.cell[i] = -1; this.child[i] = 0; this.hidden[i] = 0; this.free.push(i); this.dirty = true; }
  flush() {
    if (!this.dirty) return;
    this.dirty = false;
    this.mesh.instanceMatrix.needsUpdate = true;
    for (const a of Object.values(this.attr)) a.needsUpdate = true;
  }
}
const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);

const _pos = new THREE.Vector3(), _quat = new THREE.Quaternion(), _scale = new THREE.Vector3(), _euler = new THREE.Euler(0, 0, 0, 'YXZ'), _m = new THREE.Matrix4();
const _dst = new THREE.Vector2(), _used = new Set();

export class CrowdRenderer {
  // capacities: live humanoids / astromechs / sweepers the pools can hold at once; sweep: paint the unworn cells in
  // idle time (off for tests that want to count exactly what the crowd asked for)
  constructor(scene, { humanoids = 160, astromechs = 40, sweepers = 40, sweep = true } = {}) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'coruscant-crowd';
    scene.add(this.group);
    // the cell table: which (archetype, gender, variant) is which atlas cell, and what composer seed paints it
    this.table = buildCrowdCellTable();
    const W = this.table.atlasWidth, H = this.table.atlasHeight, n = this.table.count;
    this.atlasRaster = new Raster(W, H);                        // CPU side of the atlas; cells are blitted in as they are painted
    this.atlasData = new Uint8Array(this.atlasRaster.d.buffer);
    this.tab = new Float32Array(TAB_W * 4 * n);                  // per-cell shader table (see crowdCells.js fillCellRow)
    for (let i = 0; i < n; i++) emptyCellRow(this.tab, i);
    // GPU atlas + table: allocated only (dataReady = false skips the 16 MB transfer of the still-empty atlas); every
    // texel a shader can read arrives cell by cell, before the cell is first drawn
    this.texture = dataTexture(this.atlasData, W, H, THREE.UnsignedByteType, false);
    this.tableTex = dataTexture(this.tab, TAB_W, n, THREE.FloatType, false);
    // compact, never-uploaded staging sources for copyTextureToTexture: one cell (32 KB) and one table row. Handing
    // it the whole atlas with a sub-rect would make WebGL walk 2048-px rows (512 KB per cell) and stall on the GPU
    // process; a packed 128x64 source is one small texSubImage2D
    this.cellStage = new Uint8Array(CELL_W * CELL_H * 4);
    this.cellSrc = new THREE.DataTexture(this.cellStage, CELL_W, CELL_H, THREE.RGBAFormat, THREE.UnsignedByteType);
    this.rowStage = new Float32Array(TAB_W * 4);
    this.rowSrc = new THREE.DataTexture(this.rowStage, TAB_W, 1, THREE.RGBAFormat, THREE.FloatType);
    this.painted = new Uint8Array(n);                            // pixels + table row in the CPU buffers
    this.uploaded = new Uint8Array(n);                           // ... and on the GPU
    this.queued = new Uint8Array(n);                             // in `pending`
    this.cellInfo = new Array(n).fill(null);
    this.pending = [];                                           // worn cells to upload before the next draw
    this.paint = { count: 0, ms: 0, maxMs: 0, uploads: 0, uploadMs: 0, sweepDone: false, sweepNext: 0 };
    this.renderer = null; this.onRestore = null;
    this.material = makeCrowdMaterial(this.texture, this.tableTex, [ATLAS_COLS, this.table.rows]);
    this.pools = [
      new InstancePool(buildParts(HUMANOID_PARTS, MAX_BOXES), this.material, humanoids, 'crowd-humanoid'),
      new InstancePool(buildParts(ASTROMECH_PARTS), this.material, astromechs, 'crowd-astromech'),
      new InstancePool(buildParts(SWEEPER_PARTS), this.material, sweepers, 'crowd-sweeper'),
    ];
    const before = (renderer, scene, camera) => { this.flushUploads(renderer); if (camera && !scene.overrideMaterial) { this.cameraPos.setFromMatrixPosition(camera.matrixWorld); this.hasCamera = true; } };
    for (const p of this.pools) { p.mesh.onBeforeRender = before; this.group.add(p.mesh); }
    this.cameraPos = new THREE.Vector3(); this.hasCamera = false;   // main camera of the last frame (repair pass)
    this.lastRepair = -1e9; this.repairs = 0;
    this.live = 0;
    this.disposed = false;
    this.sweepHandle = null; this.sweepIdle = false;   // pending sweep callback and whether it is an idle callback (vs a timeout)
    if (sweep) this.sweepHandle = setTimeout(() => { this.sweepHandle = null; this.sweepStep(null); }, SWEEP_DELAY_MS);
  }

  // Base atlas cell for a citizen: (archetype, gender, variant) -> a deterministic composer cell. `key` (optional,
  // e.g. person.key) spreads the pick over the group's whole run of cells instead of the census's 8 variants.
  skinIndex(archetype, variant, female, key = null) { return this.table.cellFor(archetype, variant, female, key); }

  bodyFor(archetype) { return archetype === 'astromech' ? BODY.ASTROMECH : archetype === 'sweeper droid' ? BODY.SWEEPER : BODY.HUMANOID; }

  // Reserve an instance: { body, i } or null when the pool is full.
  alloc(body) {
    const i = this.pools[body].alloc();
    if (i < 0) return null;
    this.live++;
    return { body, i };
  }
  release(slot) { if (!slot) return; this.pools[slot.body].release(slot.i); this.live--; }

  // Paints a cell into the CPU atlas + table (idempotent). The pixels reach the GPU when somebody wears the cell
  // (requireUpload): uploading cells nobody wears would only queue texSubImage2D calls behind a busy GPU process.
  paintCell(cell) {
    if (cell < 0 || cell >= this.table.count || this.painted[cell]) return false;
    const t0 = performance.now();
    const info = composeCrowdCell(this.table.cells[cell]);
    blitCell(this.atlasRaster, this.table, cell, info.raster);
    fillCellRow(this.tab, cell, info);
    this.painted[cell] = 1;
    this.cellInfo[cell] = cellSummary(this.table.cells[cell], info);
    const ms = performance.now() - t0;
    this.paint.count++; this.paint.ms += ms; if (ms > this.paint.maxMs) this.paint.maxMs = ms;
    return true;
  }
  // A cell somebody wears now must be on the GPU before the next draw.
  requireUpload(cell) {
    if (cell < 0 || this.uploaded[cell] || this.queued[cell]) return;
    this.queued[cell] = 1; this.pending.push(cell);
  }
  // Idle-time sweep painting the cells nobody has worn yet (one at a time when the browser gives no idle deadline),
  // so that a person arriving in a new look later costs the frame an upload, not a composer paint.
  sweepStep(deadline) {
    if (this.disposed) return;
    const n = this.table.count;
    const budget = deadline && deadline.timeRemaining ? () => deadline.timeRemaining() > 3 : null;
    let painted = 0;
    while (this.paint.sweepNext < n && (budget ? budget() || (deadline.didTimeout && painted === 0) : painted === 0)) {
      if (this.paintCell(this.paint.sweepNext)) painted++;
      this.paint.sweepNext++;
    }
    if (this.paint.sweepNext >= n) { this.paint.sweepDone = true; return; }
    this.sweepIdle = typeof requestIdleCallback === 'function';
    if (this.sweepIdle) this.sweepHandle = requestIdleCallback((dl) => { this.sweepHandle = null; this.sweepStep(dl); }, { timeout: 300 });
    else this.sweepHandle = setTimeout(() => { this.sweepHandle = null; this.sweepStep(null); }, 40);
  }
  // Uploads the worn cells (one packed texSubImage2D per cell for the atlas, one row for the table). Runs from
  // update() at the start of the frame - the command buffer is emptiest there, so the uploads do not queue behind the
  // world's draw calls - and again from the pool meshes' onBeforeRender (the first frame, before the renderer is
  // known, and anything assigned after update()).
  flushUploads(renderer) {
    if (renderer && renderer !== this.renderer) this.bindRenderer(renderer);
    if (!this.pending.length || !renderer || !renderer.copyTextureToTexture) return;
    const t0 = performance.now();
    for (const cell of this.pending) this.upload(renderer, cell);
    this.paint.uploads += this.pending.length;
    this.pending.length = 0;
    this.paint.uploadMs += performance.now() - t0;
  }
  upload(renderer, cell) {
    const [x0, y0] = this.table.cellRect(cell);
    const W4 = this.atlasRaster.w * 4, ROW = CELL_W * 4, atlas = this.atlasData, stage = this.cellStage;
    for (let y = 0; y < CELL_H; y++) { const s = (y0 + y) * W4 + x0 * 4; stage.set(atlas.subarray(s, s + ROW), y * ROW); }
    _dst.set(x0, y0);
    renderer.copyTextureToTexture(this.cellSrc, this.texture, null, _dst);
    this.rowStage.set(this.tab.subarray(cell * TAB_W * 4, (cell + 1) * TAB_W * 4));
    _dst.set(0, cell);
    renderer.copyTextureToTexture(this.rowSrc, this.tableTex, null, _dst);
    this.uploaded[cell] = 1; this.queued[cell] = 0;
  }
  get pendingUploads() { return this.pending.length; }
  // A restored WebGL context comes back with freshly allocated (empty) atlas + table: every worn cell goes up again.
  bindRenderer(renderer) {
    this.renderer = renderer;
    const el = renderer.domElement;
    if (!el || !el.addEventListener) return;
    this.onRestore = () => {
      this.pending.length = 0; this.uploaded.fill(0); this.queued.fill(0);
      for (const p of this.pools) for (let i = 0; i < p.capacity; i++) this.requireUpload(p.cell[i]);
    };
    el.addEventListener('webglcontextrestored', this.onRestore);
  }

  // The cell a slot wears: children move to the child group, then the first cell of the group nobody within
  // SPREAD_R blocks wears (the base cell when the whole group is taken).
  assign(pool, i, base, child, x, z) {
    let cell = base;
    if (child) cell = this.table.childCellFor(base);
    _used.clear();
    const r2 = SPREAD_R * SPREAD_R, px = pool.px, pz = pool.pz, cells = pool.cell;
    for (let j = 0; j < pool.capacity; j++) {
      if (j === i || cells[j] < 0) continue;
      const dx = px[j] - x, dz = pz[j] - z;
      if (dx * dx + dz * dz <= r2) _used.add(cells[j]);
    }
    cell = this.table.spread(cell, _used);
    this.paintCell(cell);
    this.requireUpload(cell);
    pool.base[i] = base; pool.child[i] = child; pool.cell[i] = cell;
    return cell;
  }
  cellOf(slot) { return slot ? this.pools[slot.body].cell[slot.i] : -1; }
  infoOf(slot) { const c = this.cellOf(slot); return c >= 0 ? this.cellInfo[c] : null; }

  // v: { x, y, z, yaw, pitch (lying), scale, skin, mode, phase, speed, amp, headYaw, headPitch, sky, blk, blink, hidden }
  set(slot, v) {
    const pool = this.pools[slot.body], i = slot.i;
    if (v.hidden) { pool.mesh.setMatrixAt(i, ZERO); pool.hidden[i] = 1; pool.dirty = true; return; }
    pool.hidden[i] = 0;
    const child = (v.scale || 1) < CHILD_SCALE_MAX ? 1 : 0, base = v.skin | 0;
    if (pool.base[i] !== base || pool.child[i] !== child) this.assign(pool, i, base, child, v.x, v.z);
    pool.px[i] = v.x; pool.pz[i] = v.z;
    _pos.set(v.x, v.y, v.z);
    _euler.set(v.pitch || 0, v.yaw || 0, 0);
    _quat.setFromEuler(_euler);
    const s = v.scale || 1;
    _scale.set(s, s, s);
    _m.compose(_pos, _quat, _scale);
    pool.mesh.setMatrixAt(i, _m);
    pool.attr.iSkin.array[i] = pool.cell[i];
    const an = pool.attr.iAnim.array; an[i * 4] = v.mode; an[i * 4 + 1] = v.phase || 0; an[i * 4 + 2] = v.speed || 0; an[i * 4 + 3] = v.amp == null ? 1 : v.amp;
    const lk = pool.attr.iLook.array; lk[i * 2] = v.headYaw || 0; lk[i * 2 + 1] = v.headPitch || 0;
    const li = pool.attr.iLight.array; li[i * 2] = v.sky == null ? 1 : v.sky; li[i * 2 + 1] = v.blk || 0;
    const mi = pool.attr.iMisc.array; mi[i * 2] = v.blink || 0; mi[i * 2 + 1] = 0;
    pool.dirty = true;
  }

  update(timeSeconds) {
    this.material.uniforms.uTime.value = timeSeconds;
    if (timeSeconds - this.lastRepair >= REPAIR_EVERY) { this.lastRepair = timeSeconds; this.repair(); }
    for (const p of this.pools) p.flush();
    if (this.renderer) this.flushUploads(this.renderer);
  }

  // People walk into each other's company after they were assigned: once per pass, the first pair of shown
  // humanoids within PAIR_R blocks wearing one cell loses it on the member farther from the camera, who re-spreads
  // over their group (nobody within REPAIR_NEAR blocks of the camera changes; when the group is exhausted the pair
  // stays). Returns true when somebody changed.
  repair() {
    if (!this.hasCamera) return false;
    const pool = this.pools[BODY.HUMANOID], n = pool.capacity, cells = pool.cell, px = pool.px, pz = pool.pz, hidden = pool.hidden;
    const cx = this.cameraPos.x, cz = this.cameraPos.z, r2 = PAIR_R * PAIR_R, near2 = REPAIR_NEAR * REPAIR_NEAR;
    for (let i = 0; i < n; i++) {
      if (cells[i] < 0 || hidden[i]) continue;
      for (let j = i + 1; j < n; j++) {
        if (cells[j] !== cells[i] || hidden[j]) continue;
        const dx = px[i] - px[j], dz = pz[i] - pz[j];
        if (dx * dx + dz * dz > r2) continue;
        const di = (px[i] - cx) ** 2 + (pz[i] - cz) ** 2, dj = (px[j] - cx) ** 2 + (pz[j] - cz) ** 2;
        const k = di >= dj ? i : j;
        if (Math.max(di, dj) < near2) continue;
        const was = cells[k];
        this.assign(pool, k, pool.base[k], pool.child[k], px[k], pz[k]);
        if (cells[k] !== was) { this.repairs++; pool.dirty = true; return true; }
      }
    }
    return false;
  }

  get drawCalls() { return this.pools.length; }

  // Census of the atlas and of the cells worn right now (scripts/test-crowd.mjs, rubric 07).
  stats() {
    const t = this.table, worn = new Set(), species = {};
    let live = 0, boxes = 0, withParts = 0;
    for (const p of this.pools) for (let i = 0; i < p.capacity; i++) {
      const c = p.cell[i];
      if (c < 0) continue;
      live++; worn.add(c);
      const info = this.cellInfo[c];
      if (info) { species[info.species] = (species[info.species] || 0) + 1; boxes += info.boxes; if (info.boxes) withParts++; }
    }
    let painted = 0; for (let i = 0; i < this.painted.length; i++) painted += this.painted[i];
    return {
      cells: t.count, groups: t.groups.length, rows: t.rows, atlas: [t.atlasWidth, t.atlasHeight], painted, pending: this.pendingUploads,
      uploads: this.paint.uploads, uploadMs: +this.paint.uploadMs.toFixed(1), paintCount: this.paint.count, paintMs: +this.paint.ms.toFixed(1), paintMaxMs: +this.paint.maxMs.toFixed(2),
      paintAvgMs: this.paint.count ? +(this.paint.ms / this.paint.count).toFixed(2) : 0, sweepDone: this.paint.sweepDone, sweepNext: this.paint.sweepNext,
      live, distinctWorn: worn.size, species, boxesWorn: boxes, wornWithParts: withParts, drawCalls: this.drawCalls, maxBoxes: MAX_BOXES, spreadRadius: SPREAD_R, repairs: this.repairs,
    };
  }

  dispose() {
    this.disposed = true;
    if (this.sweepHandle != null) { if (this.sweepIdle) cancelIdleCallback(this.sweepHandle); else clearTimeout(this.sweepHandle); this.sweepHandle = null; }
    if (this.onRestore && this.renderer && this.renderer.domElement) this.renderer.domElement.removeEventListener('webglcontextrestored', this.onRestore);
    this.scene.remove(this.group);
    for (const p of this.pools) p.mesh.geometry.dispose();
    this.material.dispose();
    this.texture.dispose();
    this.tableTex.dispose();
  }
}
