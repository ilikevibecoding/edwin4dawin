// Voxel ship models (original, Clone Wars idiom) and their instanced rendering.
//
// Every model comes out of the ShipBuilder (see builder.js): width along x, height along y, length along z with the
// NOSE at z = 0, so a ship's forward vector is -z in model space (yaw 0 looks down -z). Grid y = 0 is the landing-gear
// contact plane; the geometry is translated so the mesh origin sits at the centre of the footprint on the gear line:
// an instance matrix of (padCentre, padTop, yaw) parks the ship on the pad.
//
// Rendering: one geometry + one InstancedMesh per model type (one draw call per type for any number of ships).
// Per-vertex: shade, emit code (lamp / nav strobe / engine / landing light), the model's own lamp light and sky
// exposure (flood-filled once, so cabins are lit by their lamps and dark hulls stay dark inside), and the part index
// of animated parts (wings, S-foils, ramps, doors, gear). Per-instance: (sky, block, thrust, phase) and the animation
// state (gear, class, door, lights); the vertex shader poses every part from the state, so far ships fold their wings
// and lower their ramps inside the single instanced draw call.
import * as THREE from 'three';
import { SHADING_PARS, bindShading } from '../render/shading.js';
import { BLOCKS, SHAPE } from '../blocks.js';
import { tileUV } from '../textures.js';
import { SHARED } from '../entityMaterial.js';
import { EMIT, emitCodeOf } from './builder.js';
import { lightFreighter, shuttle, bulkFreighter, cruiser, airBus } from './designs_transport.js';
import { gunship, starfighter, taxi, policeSpeeder } from './designs_small.js';

export const MAX_PARTS = 16;

let MODELS = null;
// Model list (order = type index used by the traffic system and by the spaceport's parked-ship stamps: 0 must fit
// the maintenance hangar, 2 is the small speeder on the workshop lift). Built once, lazily.
export function shipModels() {
  if (!MODELS) {
    MODELS = [lightFreighter(), shuttle(), taxi(), gunship(), bulkFreighter(), cruiser(), starfighter(), policeSpeeder(), airBus()];
    MODELS.forEach((m, i) => { m.index = i; });
  }
  return MODELS;
}
export function shipModelByName(name) { return shipModels().find((m) => m.name === name) || null; }

// Writes a model's blocks (landed pose, doors open) into the world through `set(x, y, z, id)` with the footprint
// centre on (cx, cz), gear on y = cy, rotated by `quarterTurns` (0 = nose toward -z, 1 = nose toward -x, 2 = +z,
// 3 = +x). Used to park a ship as blocks (maintenance hangar). Deterministic.
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

// ------------------------------------------------------------------------------------------------ lighting
// Block light from the model's own emissive cells and sky exposure from the grid boundary, both flood-filled through
// non-opaque cells with -1 per step (Minecraft rule). Returns { block: Uint8Array, sky: Uint8Array } over the grid.
export function modelLight(model) {
  const g = model.grid, { w, h, d } = g, n = w * h * d;
  const block = new Uint8Array(n), sky = new Uint8Array(n);
  const idx = (x, y, z) => (x * d + z) * h + y;
  const passable = (x, y, z) => { const id = g.get(x, y, z); return id === 0 || !BLOCKS[id].opaque; };
  const flood = (arr, seeds) => {
    let q = seeds;
    while (q.length) {
      const next = [];
      for (const [x, y, z] of q) {
        const l = arr[idx(x, y, z)] - 1;
        if (l <= 0) continue;
        for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) {
          const nx = x + dx, ny = y + dy, nz = z + dz;
          if (nx < 0 || ny < 0 || nz < 0 || nx >= w || ny >= h || nz >= d || !passable(nx, ny, nz)) continue;
          const i = idx(nx, ny, nz);
          if (arr[i] >= l) continue;
          arr[i] = l; next.push([nx, ny, nz]);
        }
      }
      q = next;
    }
  };
  const seeds = [];
  for (let x = 0; x < w; x++) for (let y = 0; y < h; y++) for (let z = 0; z < d; z++) {
    const id = g.get(x, y, z);
    if (!id) continue;
    const code = emitCodeOf(model, x, y, z, id);
    let e = BLOCKS[id].emit;
    if (code === EMIT.ENGINE) e = Math.max(e, 12); else if (code === EMIT.NAV || code === EMIT.LANDING) e = Math.min(e, 4);
    if (e > 0) {
      const i = idx(x, y, z);
      // the emitter lights its neighbours: seed them at e (the source cell itself is opaque for the fill)
      block[i] = Math.max(block[i], e);
      for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) {
        const nx = x + dx, ny = y + dy, nz = z + dz;
        if (nx < 0 || ny < 0 || nz < 0 || nx >= w || ny >= h || nz >= d || !passable(nx, ny, nz)) continue;
        const j = idx(nx, ny, nz);
        if (block[j] < e) { block[j] = e; seeds.push([nx, ny, nz]); }
      }
    }
  }
  flood(block, seeds);
  const skySeeds = [];
  for (let x = 0; x < w; x++) for (let y = 0; y < h; y++) for (let z = 0; z < d; z++) {
    if ((x === 0 || y === 0 || z === 0 || x === w - 1 || y === h - 1 || z === d - 1) && passable(x, y, z)) { sky[idx(x, y, z)] = 15; skySeeds.push([x, y, z]); }
  }
  // outside air keeps full sky: propagate at 15 through the outside first (no falloff), then fall off inside
  {
    let q = skySeeds;
    const seen = new Uint8Array(n);
    for (const [x, y, z] of q) seen[idx(x, y, z)] = 1;
    while (q.length) {
      const next = [];
      for (const [x, y, z] of q) for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) {
        const nx = x + dx, ny = y + dy, nz = z + dz;
        if (nx < 0 || ny < 0 || nz < 0 || nx >= w || ny >= h || nz >= d) continue;
        const i = idx(nx, ny, nz);
        if (seen[i] || g.get(nx, ny, nz) !== 0) continue;          // only true air counts as "outside"
        seen[i] = 1; sky[i] = 15; next.push([nx, ny, nz]);
      }
      q = next;
    }
    // then through glass and into cabins with falloff
    const inner = [];
    for (let x = 0; x < w; x++) for (let y = 0; y < h; y++) for (let z = 0; z < d; z++) if (sky[idx(x, y, z)] === 15) inner.push([x, y, z]);
    flood(sky, inner);
  }
  return { block, sky, idx };
}

// ------------------------------------------------------------------------------------------------ geometry
// face order matches BLOCKS[id].tex: [+x, -x, +y, -y, +z, -z]; c = unit-cube corner flags (CCW seen from outside)
const FACES = [
  { n: [1, 0, 0], c: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]], shade: 0.8 },
  { n: [-1, 0, 0], c: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]], shade: 0.8 },
  { n: [0, 1, 0], c: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]], shade: 1.0 },
  { n: [0, -1, 0], c: [[1, 0, 1], [0, 0, 1], [0, 0, 0], [1, 0, 0]], shade: 0.5 },
  { n: [0, 0, 1], c: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], shade: 0.65 },
  { n: [0, 0, -1], c: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]], shade: 0.65 },
];
const INSET = 0.0006, UV_SCALE = 1 - 2 * INSET;
function faceUV(dir, x, y, z, out) {
  switch (dir) {
    case 0: out[0] = 1 - z; out[1] = 1 - y; break;
    case 1: out[0] = z; out[1] = 1 - y; break;
    case 2: out[0] = x; out[1] = z; break;
    case 3: out[0] = 1 - x; out[1] = z; break;
    case 4: out[0] = x; out[1] = 1 - y; break;
    default: out[0] = 1 - x; out[1] = 1 - y; break;
  }
  return out;
}

class Geo {
  constructor() { this.pos = []; this.uv = []; this.surf = []; this.part = []; this.idx = []; this.faces = 0; this.t = [0, 0]; }
  face(d, bx, by, bz, x0, y0, z0, x1, y1, z1, tile, emit, light, sky, part) {
    const F = FACES[d], [tu, tv, ts] = tileUV(tile), base = this.pos.length / 3;
    for (let k = 0; k < 4; k++) {
      const c = F.c[k], px = c[0] ? x1 : x0, py = c[1] ? y1 : y0, pz = c[2] ? z1 : z0;
      faceUV(d, px, py, pz, this.t);
      this.pos.push(bx + px, by + py, bz + pz);
      this.uv.push(tu + (this.t[0] * UV_SCALE + INSET) * ts, tv + (this.t[1] * UV_SCALE + INSET) * ts);
      this.surf.push(F.shade, emit, light, sky);
      this.part.push(part);
    }
    this.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    this.faces++;
  }
}

// Culled-face geometry of a model: hull cells culled against hull neighbours, part cells culled against their own
// part only (they move). Origin at the footprint centre on the gear line. Returns { geometry, faces }.
export function buildShipGeometry(model) {
  const g = model.grid, { w, h, d } = g;
  const light = modelLight(model);
  const buf = new Geo();
  const hull = model.hull;
  const lightAt = (x, y, z, fallback) => {
    if (x < 0 || y < 0 || z < 0 || x >= w || y >= h || z >= d) return fallback;
    const i = light.idx(x, y, z);
    return [light.block[i] / 15, light.sky[i] / 15];
  };
  const emitCells = (cells, at, part) => {
    for (const [x, y, z, id, emitCode] of cells) {
      const def = BLOCKS[id];
      const opaqueN = (nx, ny, nz) => { const nid = at(nx, ny, nz); return nid !== 0 && (BLOCKS[nid].opaque || nid === id); };
      let boxes = null;
      if (def.shape === SHAPE.CUBE || def.shape === SHAPE.LIQUID) boxes = [[0, 0, 0, 1, 1, 1]];
      else if (def.boxes && def.boxes.length) boxes = def.boxes;
      else if (def.shape === SHAPE.PANE) boxes = [[0.4375, 0, 0, 0.5625, 1, 1]];
      else continue;
      for (const bx of boxes) for (let f = 0; f < 6; f++) {
        const F = FACES[f];
        const flush = (f === 0 && bx[3] >= 1) || (f === 1 && bx[0] <= 0) || (f === 2 && bx[4] >= 1) || (f === 3 && bx[1] <= 0) || (f === 4 && bx[5] >= 1) || (f === 5 && bx[2] <= 0);
        if (flush && opaqueN(x + F.n[0], y + F.n[1], z + F.n[2])) continue;
        // the face looks into its neighbour cell: light it from there (own cell for inset faces)
        const l = flush ? lightAt(x + F.n[0], y + F.n[1], z + F.n[2], [0, 1]) : lightAt(x, y, z, [0, 1]);
        buf.face(f, x, y, z, bx[0], bx[1], bx[2], bx[3], bx[4], bx[5], def.tex[f], emitCode, Math.max(l[0], def.emit > 0 ? 1 : 0), l[1], part);
      }
    }
  };
  // hull
  const hullCells = [];
  for (let x = 0; x < w; x++) for (let y = 0; y < h; y++) for (let z = 0; z < d; z++) {
    const id = hull.get(x, y, z);
    if (id) hullCells.push([x, y, z, id, emitCodeOf(model, x, y, z, id)]);
  }
  emitCells(hullCells, (x, y, z) => hull.get(x, y, z), 0);
  // parts (index 1..)
  model.parts.forEach((p, pi) => {
    const own = new Map();
    for (const c of p.cells) own.set((c[0] * 256 + c[1]) * 256 + c[2], c[3]);
    emitCells(p.cells.map((c) => [c[0], c[1], c[2], c[3], c[4] || (BLOCKS[c[3]].emit > 0 ? EMIT.LAMP : 0)]), (x, y, z) => own.get((x * 256 + y) * 256 + z) || 0, pi + 1);
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(buf.pos, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(buf.uv, 2));
  geometry.setAttribute('aSurf', new THREE.Float32BufferAttribute(buf.surf, 4));
  geometry.setAttribute('aPart', new THREE.Float32BufferAttribute(buf.part, 1));
  geometry.setIndex(buf.idx);
  geometry.translate(-w / 2, 0, -d / 2);
  // generous bounds: parts swing outside the landed footprint
  geometry.computeBoundingSphere();
  geometry.boundingSphere.radius += Math.max(w, h) * 0.6;
  return { geometry, faces: buf.faces };
}

// Part transform table for the shader (pivot translated with the geometry origin).
export function partUniforms(model) {
  const A = new Float32Array(MAX_PARTS * 4), Bv = new Float32Array(MAX_PARTS * 4), C = new Float32Array(MAX_PARTS * 4);
  model.parts.forEach((p, i) => {
    const k = i + 1;
    if (k >= MAX_PARTS) return;
    A[k * 4] = p.pivot[0] - model.w / 2; A[k * 4 + 1] = p.pivot[1]; A[k * 4 + 2] = p.pivot[2] - model.d / 2; A[k * 4 + 3] = p.channel;
    const al = Math.hypot(p.axis[0], p.axis[1], p.axis[2]) || 1;
    Bv[k * 4] = p.axis[0] / al; Bv[k * 4 + 1] = p.axis[1] / al; Bv[k * 4 + 2] = p.axis[2] / al; Bv[k * 4 + 3] = p.angle;
    C[k * 4] = p.slide[0]; C[k * 4 + 1] = p.slide[1]; C[k * 4 + 2] = p.slide[2]; C[k * 4 + 3] = 0;
  });
  return { A, B: Bv, C };
}

// ------------------------------------------------------------------------------------------------ material
const VERT = /* glsl */ `
attribute vec4 aSurf; attribute float aPart; attribute vec4 aInst; attribute vec4 aState;
uniform vec4 uPartA[${MAX_PARTS}]; uniform vec4 uPartB[${MAX_PARTS}]; uniform vec4 uPartC[${MAX_PARTS}];
varying vec2 vUv; varying vec4 vSurf; varying float vDist; varying float vFogDist; varying vec4 vInst; varying vec4 vState;
#if FANCY
varying vec3 vWorldPos;
#endif
vec3 rotateAxis(vec3 p, vec3 ax, float ang) { float c = cos(ang), s = sin(ang); return p * c + cross(ax, p) * s + ax * dot(ax, p) * (1.0 - c); }
void main() {
  vUv = uv; vSurf = aSurf; vInst = aInst; vState = aState;
  vec3 pos = position;
  int pi = int(aPart + 0.5);
  if (pi > 0) {
    vec4 A = uPartA[pi]; vec4 Bp = uPartB[pi]; vec4 C = uPartC[pi];
    int ch = int(A.w + 0.5);
    float st = ch == 0 ? aState.x : (ch == 1 ? aState.y : (ch == 2 ? aState.z : aState.w));
    float k = 1.0 - clamp(st, 0.0, 1.0);
    pos = rotateAxis(pos - A.xyz, Bp.xyz, Bp.w * k) + A.xyz + C.xyz * k;
  }
#ifdef USE_INSTANCING
  vec4 wp = modelMatrix * instanceMatrix * vec4(pos, 1.0);
#else
  vec4 wp = modelMatrix * vec4(pos, 1.0);
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
varying vec2 vUv; varying vec4 vSurf; varying float vDist; varying float vFogDist; varying vec4 vInst; varying vec4 vState;
#if FANCY
varying vec3 vWorldPos;
#endif
${SHADING_PARS}
float lightCurve(float l) { float c = l / (4.0 - 3.0 * l); return mix(c, l, 0.4); }
float blockCurve(float l) { float c = l / (4.0 - 3.0 * l); return mix(c, l, 0.6); }
void main() {
  vec4 tex = texture2D(map, vUv);
  if (tex.a < 0.5) discard;
  float shade = vSurf.x, code = vSurf.y, ownLight = vSurf.z, skyExp = vSurf.w;
  float sky = lightCurve(vInst.x * skyExp) * uSkyLight;
  float blk = blockCurve(max(vInst.y, ownLight));
#if FANCY
  vec3 N = normalize(cross(dFdx(vWorldPos), dFdy(vWorldPos)));
  vec3 V = normalize(uCamPos - vWorldPos);
  vec3 light = shadingLight(vec3(sky) * uSkyTint, vec3(blk) * vec3(1.0, 0.9, 0.72), vWorldPos, N, lightCurve(vInst.x * skyExp), vDist);
  vec3 fogC = fogColorDir(uFogColor, -V);
#else
  vec3 light = max(vec3(sky) * uSkyTint, vec3(blk) * vec3(1.0, 0.9, 0.72));
  vec3 fogC = uFogColor;
#endif
  light = max(light, vec3(0.05)) + vec3(uFlash);
  vec3 col = tex.rgb * light * shade;
#if FANCY
  col += sunSpecular(vWorldPos, N, N, V, 0.3, 0.85, tex.rgb, lightCurve(vInst.x * skyExp), vDist) * shade;   // hull metal
#endif
  // emissive faces: 1 steady lamp, 2 nav strobe, 3 engine core (thrust), 4 landing light (approach only)
  float thrust = vInst.z, phase = vInst.w;
  float glow = 0.0; vec3 hot = tex.rgb;
  if (code > 2.5 && code < 3.5) {
    glow = (0.4 + 0.6 * thrust) * (0.92 + 0.08 * sin(uTime * 11.0 + vDist * 0.3));
    hot = tex.rgb * (1.0 + 0.8 * thrust) + vec3(0.15, 0.25, 0.45) * thrust;
  } else if (code > 0.5 && code < 1.5) {
    glow = 0.85; hot = tex.rgb * 1.15;
  } else if (code > 1.5 && code < 2.5) {
    float t = fract(uTime * 0.9 + phase);
    glow = smoothstep(0.78, 0.82, t) * (1.0 - smoothstep(0.9, 0.94, t));
    hot = tex.rgb * 1.6 + vec3(0.2);
  } else if (code > 3.5) {
    glow = clamp(vState.w, 0.0, 1.0) * (0.9 + 0.1 * sin(uTime * 6.0));
    hot = tex.rgb * 1.3 + vec3(0.25, 0.22, 0.15);
  }
  glow = clamp(glow, 0.0, 1.0);
  col = mix(col, hot, glow);
  // lights punch through the haze: distant ships fade to their engine glow before vanishing
  col = mix(col, fogC, smoothstep(uFogNear, uFogFar, vFogDist) * (1.0 - 0.7 * glow));
  gl_FragColor = vec4(col, 1.0);
}`;

export function shipMaterial(atlas, model) {
  const parts = partUniforms(model);
  const m = new THREE.ShaderMaterial({
    uniforms: {
      map: { value: atlas }, uTime: { value: 0 },
      uPartA: { value: parts.A }, uPartB: { value: parts.B }, uPartC: { value: parts.C },
      uSkyLight: SHARED.uSkyLight, uSkyTint: SHARED.uSkyTint, uFogColor: SHARED.uFogColor, uFogNear: SHARED.uFogNear, uFogFar: SHARED.uFogFar, uFlash: SHARED.uFlash,
    },
    vertexShader: VERT, fragmentShader: FRAG, side: THREE.FrontSide,
    defines: { FANCY: 0 },   // flipped to 1 by the render pipeline (sun, cascaded shadows, hull specular)
  });
  bindShading(m);
  m.userData.shadowCaster = true;   // ships cast shadows on the decks and streets
  return m;
}

// One InstancedMesh per model: `capacity` instances, dynamic matrices, per-instance (sky, block, thrust, phase) and
// animation state (gear, class, door, lights) attributes. The mesh sits at the world origin with instance matrices in
// world space, so three's per-mesh frustum test is off.
export function makeShipInstances(model, atlas, capacity) {
  const { geometry, faces } = buildShipGeometry(model);
  const inst = new Float32Array(capacity * 4), state = new Float32Array(capacity * 4);
  for (let i = 0; i < capacity; i++) { inst[i * 4] = 1; inst[i * 4 + 2] = 1; inst[i * 4 + 3] = (i * 0.37) % 1; }
  const attr = new THREE.InstancedBufferAttribute(inst, 4); attr.setUsage(THREE.DynamicDrawUsage);
  const stateAttr = new THREE.InstancedBufferAttribute(state, 4); stateAttr.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute('aInst', attr);
  geometry.setAttribute('aState', stateAttr);
  const material = shipMaterial(atlas, model);
  const mesh = new THREE.InstancedMesh(geometry, material, capacity);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false;
  mesh.count = 0;
  mesh.userData.faces = faces;
  mesh.userData.model = model.name;
  return { mesh, attr, state: stateAttr, material, faces };
}
