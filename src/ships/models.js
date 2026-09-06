// Voxel ship designs (Minecraft-style, original, genre-inspired) and their instanced rendering.
//
// Every model is a VoxelGrid: width along x, height along y, length along z with the NOSE at z = 0, so a ship's
// forward vector is -z in model space (the three.js / player convention: yaw 0 looks down -z). Grid y = 0 is the
// landing-gear contact height; the geometry is translated so the mesh origin sits at the centre of the footprint on
// the gear line: setting an instance matrix to (padCentre, padTop, yaw) parks the ship on the pad.
//
// Rendering: one geometry + one InstancedMesh per model type (one draw call per type for any number of ships).
// Per-instance light (sky, block, thrust) rides in an instanced vec3 attribute, and faces of emissive blocks
// (blue glow panels = engines, glow panels = cabin lights) carry a per-vertex flag so they glow at night and
// pulse with thrust.
import * as THREE from 'three';
import { SHADING_PARS, bindShading } from '../render/shading.js';
import { B, BLOCKS } from '../blocks.js';
import { tileUV } from '../textures.js';
import { SHARED } from '../entityMaterial.js';
import { VoxelGrid } from '../vehicles/voxelMesh.js';

const D = B.DURASTEEL, DD = B.DURASTEEL_DARK, CH = B.CHROME, RED = B.PANEL_RED, GL = B.STEEL_GLASS, ENG = B.GLOW_PANEL_BLUE;
const BLK = B.PANEL_BLACK, HP = B.HULL_PLATE, VENT = B.VENT, LAMP = B.GLOW_PANEL;

// ------------------------------------------------------------------------------------------------ designs
// A boxy light freighter: slab hull, offset-forward cockpit, two cargo pods slung on the flanks, triple nozzles.
function freighter() {
  const g = new VoxelGrid(11, 8, 22);
  g.fill(3, 1, 3, 7, 1, 18, DD);                      // keel (narrower bottom)
  g.fill(2, 2, 3, 8, 3, 18, D);                       // main hull, bevelled: wide middle rows
  g.fill(2, 2, 3, 2, 2, 18, DD); g.fill(8, 2, 3, 8, 2, 18, DD);                 // dark cheat line along both flanks
  for (const z of [5, 6, 15, 16]) { g.set(2, 2, z, RED); g.set(8, 2, z, RED); }  // red flank markings
  g.fill(3, 4, 4, 7, 4, 17, D);                       // upper hull (narrower)
  g.fill(4, 5, 6, 6, 5, 16, HP);                      // raised spine plating
  for (const z of [8, 13]) { g.set(4, 5, z, VENT); g.set(6, 5, z, VENT); }
  g.fill(3, 2, 1, 7, 3, 2, D); g.fill(4, 2, 0, 6, 3, 0, DD); g.set(5, 3, 0, GL); // tapered nose with sensor
  g.fill(3, 1, 2, 7, 1, 2, DD);
  g.fill(4, 4, 1, 6, 6, 3, DD);                       // raised cockpit
  g.fill(4, 5, 1, 6, 6, 1, GL); g.set(4, 5, 2, GL); g.set(6, 5, 2, GL); g.set(4, 6, 2, GL); g.set(6, 6, 2, GL);
  g.fill(4, 7, 1, 6, 7, 3, D);                        // cockpit roof
  for (const x of [1, 9]) {                           // cargo pods: rounded cross-section (3-high core, 1-high outer rib)
    const out = x === 1 ? 0 : 10;
    g.fill(x, 1, 6, x, 3, 16, DD);
    g.set(x, 1, 6, CH); g.set(x, 2, 6, CH); g.set(x, 3, 6, CH); g.set(x, 1, 16, CH); g.set(x, 2, 16, CH); g.set(x, 3, 16, CH);
    g.fill(out, 2, 7, out, 2, 15, CH); g.set(out, 2, 10, RED); g.set(out, 2, 11, RED);
    g.set(x, 4, 9, DD); g.set(x, 4, 13, DD);                                       // pod mounts
  }
  g.set(5, 6, 12, CH); g.set(5, 7, 12, LAMP);         // dorsal mast + beacon
  g.fill(3, 1, 19, 7, 4, 20, DD); g.fill(4, 5, 18, 6, 5, 20, DD);      // engine block
  g.fill(3, 1, 21, 7, 4, 21, CH);
  for (const [x, y] of [[3, 2], [3, 3], [4, 2], [4, 3], [6, 2], [6, 3], [7, 2], [7, 3]]) g.set(x, y, 21, ENG);
  g.set(5, 5, 21, ENG);
  for (const [x, z] of [[3, 5], [7, 5], [3, 16], [7, 16]]) g.set(x, 0, z, DD); // landing legs
  return { name: 'freighter', grid: g, speed: 22, engineHz: 52, gain: 1.0 };
}

// A passenger shuttle: tall narrow fuselage with a wrap-around canopy, a swept dorsal fin and wings folded up for
// landing (three plates per side stepping up and outward, tapering to a chrome tip).
function shuttle() {
  const g = new VoxelGrid(9, 12, 18);
  g.fill(3, 2, 2, 5, 5, 14, D);                       // fuselage
  g.fill(4, 6, 4, 4, 6, 13, DD);                      // dorsal ridge
  g.fill(3, 3, 1, 5, 4, 1, DD); g.set(4, 3, 0, DD);   // nose
  g.fill(3, 5, 2, 5, 5, 3, GL); g.set(4, 6, 3, GL); g.set(4, 4, 1, GL);   // wrap-around canopy
  for (const z of [5, 7, 9, 11]) { g.set(3, 4, z, GL); g.set(5, 4, z, GL); } // cabin windows
  g.fill(4, 1, 3, 4, 1, 13, DD);                      // keel
  for (const side of [0, 1]) {                        // folded wings
    const xs = side ? [6, 7, 8] : [2, 1, 0];
    g.fill(xs[0], 1, 4, xs[0], 3, 14, D); g.fill(xs[0], 1, 4, xs[0], 2, 4, DD); g.set(xs[0], 3, 14, DD);
    g.fill(xs[1], 3, 5, xs[1], 6, 13, D); g.fill(xs[1], 4, 5, xs[1], 5, 5, DD); g.set(xs[1], 4, 9, RED); g.set(xs[1], 5, 9, RED);
    g.fill(xs[2], 6, 6, xs[2], 9, 12, D); g.fill(xs[2], 7, 6, xs[2], 8, 6, DD); g.set(xs[2], 9, 12, DD);
    g.fill(xs[2], 10, 7, xs[2], 10, 11, CH);          // wing tip
  }
  g.fill(4, 7, 8, 4, 8, 13, D); g.fill(4, 9, 10, 4, 10, 13, D); g.set(4, 11, 12, D); // swept dorsal fin
  g.set(4, 7, 8, CH); g.set(4, 9, 10, CH); g.set(4, 11, 13, LAMP);
  g.fill(3, 2, 15, 5, 4, 16, DD);                     // engines
  g.fill(3, 2, 17, 5, 4, 17, CH); g.set(3, 3, 17, ENG); g.set(4, 3, 17, ENG); g.set(5, 3, 17, ENG);
  g.set(4, 0, 3, DD); g.set(3, 0, 12, DD); g.set(5, 0, 12, DD); // tripod gear
  return { name: 'shuttle', grid: g, speed: 30, engineHz: 88, gain: 0.8 };
}

// A small open-cockpit airspeeder: red body, two side repulsor pods, two seats behind a windscreen.
function airspeeder() {
  const g = new VoxelGrid(5, 4, 10);
  g.fill(1, 1, 1, 3, 2, 8, RED);                      // body
  g.set(2, 1, 0, RED); g.fill(1, 2, 0, 3, 2, 0, CH);  // nose + chrome grille
  g.fill(1, 2, 3, 3, 2, 5, 0);                        // cockpit well (open)
  g.fill(1, 1, 3, 3, 1, 5, BLK);                      // cockpit floor
  g.set(1, 2, 5, BLK); g.set(3, 2, 5, BLK);           // two seats
  g.set(1, 3, 6, BLK); g.set(3, 3, 6, BLK);           // headrests
  g.fill(1, 3, 2, 3, 3, 2, GL);                       // windscreen
  g.fill(1, 2, 6, 3, 2, 8, DD); g.set(2, 2, 7, VENT); // engine cowl
  for (const x of [0, 4]) {                           // side pods
    g.fill(x, 1, 5, x, 2, 8, CH); g.set(x, 1, 4, DD); g.set(x, 2, 4, DD);
    g.set(x, 1, 9, ENG); g.set(x, 2, 9, ENG);
  }
  g.set(2, 0, 2, DD); g.set(2, 0, 7, DD);             // repulsor pads
  return { name: 'airspeeder', grid: g, speed: 40, engineHz: 170, gain: 0.5 };
}

// A gunship-like troop transport: hollow bay with open side doors, stub wing with tip pods, twin tail booms.
function gunship() {
  const g = new VoxelGrid(9, 7, 17);
  g.fill(1, 1, 4, 7, 4, 12, D);                       // troop bay
  g.fill(2, 2, 5, 6, 3, 11, 0);                       // hollow interior
  g.fill(4, 2, 6, 4, 2, 10, BLK);                     // central bench
  g.set(4, 4, 8, LAMP);                               // bay light
  g.fill(1, 2, 6, 1, 3, 10, 0); g.fill(7, 2, 6, 7, 3, 10, 0);   // open side doors
  g.fill(1, 5, 6, 1, 5, 10, DD); g.fill(7, 5, 6, 7, 5, 10, DD); // door panels slid up
  g.fill(1, 4, 5, 7, 4, 5, RED); g.fill(1, 4, 11, 7, 4, 11, RED); // roof stripes
  g.fill(3, 2, 1, 5, 4, 3, DD); g.fill(3, 1, 1, 5, 1, 3, DD);  // cockpit
  g.fill(3, 3, 0, 5, 4, 1, GL); g.set(4, 2, 0, DD); g.fill(3, 2, 0, 5, 2, 0, DD); // canopy + nose
  g.fill(0, 5, 7, 8, 5, 9, D);                        // stub wing
  for (const x of [0, 8]) { g.fill(x, 5, 6, x, 6, 10, DD); g.set(x, 5, 5, CH); g.set(x, 6, 6, RED); g.set(x, 5, 11, ENG); }
  g.set(2, 5, 11, GL); g.set(6, 5, 11, GL);           // turret bubbles
  g.fill(2, 2, 13, 3, 3, 15, DD); g.fill(5, 2, 13, 6, 3, 15, DD); // tail booms
  g.fill(2, 4, 13, 2, 5, 15, D); g.fill(6, 4, 13, 6, 5, 15, D);   // tail fins
  g.fill(3, 4, 14, 5, 4, 14, D);                                  // tailplane
  for (const [x, y] of [[2, 2], [2, 3], [3, 2], [3, 3], [5, 2], [5, 3], [6, 2], [6, 3]]) g.set(x, y, 16, ENG);
  for (const [x, z] of [[2, 5], [6, 5], [2, 11], [6, 11]]) g.set(x, 0, z, DD); // gear
  return { name: 'gunship', grid: g, speed: 34, engineHz: 66, gain: 0.9 };
}

let MODELS = null;
// Model list (order = type index used by the traffic system). Built once, lazily.
export function shipModels() {
  if (!MODELS) {
    MODELS = [freighter(), shuttle(), airspeeder(), gunship()];
    for (const m of MODELS) { m.w = m.grid.w; m.h = m.grid.h; m.d = m.grid.d; m.length = m.grid.d; }
  }
  return MODELS;
}

// Writes a model's blocks into the world through `set(x, y, z, id)` with the footprint centre on (cx, cz), gear on
// y = cy, rotated by `quarterTurns` (0 = nose toward -z, 1 = nose toward -x, 2 = +z, 3 = +x). Used to park a
// ship as blocks (maintenance hangar). Deterministic.
export function stampShip(model, set, cx, cy, cz, quarterTurns = 0) {
  const g = model.grid, hx = g.w >> 1, hz = g.d >> 1;
  for (let x = 0; x < g.w; x++) for (let y = 0; y < g.h; y++) for (let z = 0; z < g.d; z++) {
    const id = g.get(x, y, z);
    if (!id) continue;
    let lx = x - hx, lz = z - hz;
    for (let q = 0; q < (quarterTurns & 3); q++) { const t = lx; lx = lz; lz = -t; }
    set(cx + lx, cy + y, cz + lz, id);
  }
}

// ------------------------------------------------------------------------------------------------ geometry
// face order matches BLOCKS[id].tex: [+x, -x, +y, -y, +z, -z]
const FACES = [
  { n: [1, 0, 0], c: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]], shade: 0.8 },
  { n: [-1, 0, 0], c: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]], shade: 0.8 },
  { n: [0, 1, 0], c: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]], shade: 1.0 },
  { n: [0, -1, 0], c: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]], shade: 0.5 },
  { n: [0, 0, 1], c: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], shade: 0.65 },
  { n: [0, 0, -1], c: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]], shade: 0.65 },
];

// Culled-face geometry of a model grid with per-vertex shade and emissive flag; origin at the footprint centre on the
// gear line (see the header). Returns { geometry, faces }.
export function buildShipGeometry(model) {
  const g = model.grid;
  const pos = [], uv = [], shade = [], emit = [], idx = [];
  const at = (x, y, z) => g.get(x, y, z);
  const opaqueAt = (x, y, z) => { const id = at(x, y, z); return id !== 0 && BLOCKS[id].opaque; };
  let faces = 0;
  for (let x = 0; x < g.w; x++) for (let y = 0; y < g.h; y++) for (let z = 0; z < g.d; z++) {
    const id = at(x, y, z);
    if (id === 0) continue;
    const def = BLOCKS[id];
    const e = def.emit > 0 ? 1 : 0;
    for (let f = 0; f < 6; f++) {
      const F = FACES[f];
      const nid = at(x + F.n[0], y + F.n[1], z + F.n[2]);
      if (nid !== 0 && (opaqueAt(x + F.n[0], y + F.n[1], z + F.n[2]) || nid === id)) continue;
      const [tu, tv, ts] = tileUV(def.tex[f]);
      const base = pos.length / 3;
      for (let k = 0; k < 4; k++) { const c = F.c[k]; pos.push(x + c[0], y + c[1], z + c[2]); shade.push(F.shade); emit.push(e); }
      uv.push(tu, tv + ts, tu + ts, tv + ts, tu + ts, tv, tu, tv);
      idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
      faces++;
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.setAttribute('aShade', new THREE.Float32BufferAttribute(shade, 1));
  geometry.setAttribute('aEmit', new THREE.Float32BufferAttribute(emit, 1));
  geometry.setIndex(idx);
  geometry.translate(-g.w / 2, 0, -g.d / 2);
  geometry.computeBoundingSphere();
  return { geometry, faces };
}

// ------------------------------------------------------------------------------------------------ material
const VERT = /* glsl */ `
attribute float aShade; attribute float aEmit; attribute vec3 aInst;
varying vec2 vUv; varying float vShade; varying float vDist; varying float vFogDist; varying float vEmit; varying vec3 vInst;
#if FANCY
varying vec3 vWorldPos;
#endif
void main() {
  vUv = uv; vShade = aShade; vEmit = aEmit; vInst = aInst;
#ifdef USE_INSTANCING
  vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.0);
#else
  vec4 wp = modelMatrix * vec4(position, 1.0);
#endif
#if FANCY
  vWorldPos = wp.xyz;
#endif
  vec4 mv = viewMatrix * wp;
  vDist = length(mv.xyz);
  // fog distance: aerial perspective is a horizontal phenomenon - looking down through the thin air column fogs far
  // less than looking across it - so the vertical offset counts 0.45 (the ground stays visible from the air)
  { float fdy = dot(mv.xyz, (viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz); vFogDist = sqrt(max(dot(mv.xyz, mv.xyz) - fdy * fdy * 0.7975, 0.0)); }
  gl_Position = projectionMatrix * mv;
}`;
const FRAG = /* glsl */ `
uniform sampler2D map; uniform float uTime;
uniform float uSkyLight; uniform vec3 uSkyTint; uniform vec3 uFogColor; uniform float uFogNear; uniform float uFogFar; uniform float uFlash;
varying vec2 vUv; varying float vShade; varying float vDist; varying float vFogDist; varying float vEmit; varying vec3 vInst;
#if FANCY
varying vec3 vWorldPos;
#endif
${SHADING_PARS}
float lightCurve(float l) { float c = l / (4.0 - 3.0 * l); return mix(c, l, 0.4); }
float blockCurve(float l) { float c = l / (4.0 - 3.0 * l); return mix(c, l, 0.6); }
void main() {
  vec4 tex = texture2D(map, vUv);
  if (tex.a < 0.5) discard;
  float sky = lightCurve(vInst.x) * uSkyLight;
  float blk = blockCurve(vInst.y);
#if FANCY
  vec3 N = normalize(cross(dFdx(vWorldPos), dFdy(vWorldPos)));
  vec3 V = normalize(uCamPos - vWorldPos);
  vec3 light = shadingLight(vec3(sky) * uSkyTint, vec3(blk) * vec3(1.0, 0.9, 0.72), vWorldPos, N, lightCurve(vInst.x), vDist);
  vec3 fogC = fogColorDir(uFogColor, -V);
#else
  vec3 light = max(vec3(sky) * uSkyTint, vec3(blk) * vec3(1.0, 0.9, 0.72));
  vec3 fogC = uFogColor;
#endif
  light = max(light, vec3(0.05)) + vec3(uFlash);
  vec3 col = tex.rgb * light * vShade;
#if FANCY
  col += sunSpecular(vWorldPos, N, N, V, 0.3, 0.85, tex.rgb, lightCurve(vInst.x), vDist) * vShade;   // hull metal
#endif
  // emissive faces (engines, cabin lights): self-lit, brighter and pulsing while thrusting
  float thrust = vInst.z;
  float glow = vEmit * (0.45 + 0.55 * thrust) * (0.92 + 0.08 * sin(uTime * 11.0 + vDist * 0.3));
  vec3 hot = tex.rgb * (1.0 + 0.7 * thrust) + vec3(0.15, 0.25, 0.4) * thrust * vEmit;
  glow = clamp(glow, 0.0, 1.0);
  col = mix(col, hot, glow);
  // lights punch through the haze: distant ships fade to their engine glow before vanishing
#if FANCY
  col = mix(col, fogC, smoothstep(uFogNear, uFogFar, vFogDist) * (1.0 - 0.7 * glow));
#else
  col = mix(col, uFogColor, smoothstep(uFogNear, uFogFar, vFogDist) * (1.0 - 0.7 * glow));
#endif
  gl_FragColor = vec4(col, 1.0);
}`;

export function shipMaterial(atlas) {
  const m = new THREE.ShaderMaterial({
    uniforms: {
      map: { value: atlas }, uTime: { value: 0 },
      uSkyLight: SHARED.uSkyLight, uSkyTint: SHARED.uSkyTint, uFogColor: SHARED.uFogColor, uFogNear: SHARED.uFogNear, uFogFar: SHARED.uFogFar, uFlash: SHARED.uFlash,
    },
    vertexShader: VERT, fragmentShader: FRAG, side: THREE.FrontSide,
    defines: { FANCY: 0 },   // flipped to 1 by the render pipeline (sun, cascaded shadows, hull specular)
  });
  bindShading(m);
  m.userData.shadowCaster = true;   // ships cast shadows on the decks and streets
  return m;
}

// One InstancedMesh per model: `capacity` instances, dynamic matrices, per-instance (sky, block, thrust) attribute.
// The mesh sits at the world origin with instance matrices in world space, so three's per-mesh frustum test is off.
export function makeShipInstances(model, material, capacity) {
  const { geometry, faces } = buildShipGeometry(model);
  const inst = new Float32Array(capacity * 3);
  for (let i = 0; i < capacity; i++) { inst[i * 3] = 1; inst[i * 3 + 2] = 1; }
  const attr = new THREE.InstancedBufferAttribute(inst, 3);
  attr.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute('aInst', attr);
  const mesh = new THREE.InstancedMesh(geometry, material, capacity);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false;
  mesh.count = 0;
  mesh.userData.faces = faces;
  mesh.userData.model = model.name;
  return { mesh, attr };
}
