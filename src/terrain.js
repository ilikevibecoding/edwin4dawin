// Chunk streaming + rendering: generation/lighting/meshing budgets and the world + water shaders.
import * as THREE from 'three';
import { CHUNK_SIZE as CS, CHUNK_HEIGHT as CH, DEFAULT_RENDER_DISTANCE } from './constants.js';
import { Mesher, LIGHT_TABLE, SHADE_TABLE } from './mesher.js';
import { World } from './world.js';
import { SHADING_PARS, SHADOW_LAYER, bindShading } from './render/shading.js';
import { bindMaterialMaps } from './render/materialMaps.js';

// aLight (uint8 pair: light sums 0..60) and aShade (uint8 table index) are expanded through uniform tables that
// hold the exact float32 values the old Float32 attributes carried (see the vertex layout note in mesher.js).
// FANCY 0 is the pre-rubric shader (Light preset); FANCY 1 adds the per-pixel sun/shadow/material path.
const VERT = /* glsl */ `
uniform float uLightTable[${LIGHT_TABLE.length}];
uniform float uShadeTable[${SHADE_TABLE.length}];
attribute vec2 aLight;
attribute float aShade;
attribute float aFace;
varying vec2 vUv;
varying vec2 vLight;
varying float vShade;
varying float vDist; varying float vFogDist;
#if FANCY
varying vec3 vWorldPos;
varying float vFace;
varying float vExtra;
#endif
void main() {
  vUv = uv;
  vLight = vec2(uLightTable[int(aLight.x)], uLightTable[int(aLight.y)]);
  vShade = uShadeTable[int(aShade)];
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vDist = length(mv.xyz);
  // fog distance: aerial perspective is a horizontal phenomenon - looking down through the thin air column fogs far
  // less than looking across it - so the vertical offset counts 0.45 (the ground stays visible from the air)
  { float fdy = dot(mv.xyz, (viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz); vFogDist = sqrt(max(dot(mv.xyz, mv.xyz) - fdy * fdy * 0.7975, 0.0)); }
#if FANCY
  vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
  vFace = mod(aFace, 8.0);
  vExtra = floor(aFace / 8.0);
#endif
  gl_Position = projectionMatrix * mv;
}`;

// Common fragment head: legacy uniforms + light curves + (FANCY) the shared shading chunk and the tangent frame.
const FRAG_HEAD = /* glsl */ `
uniform sampler2D map;
uniform float uSkyLight;
uniform vec3 uSkyTint;
uniform vec3 uFogColor;
uniform float uFogNear;
uniform float uFogFar;
uniform float uAlphaTest;
uniform float uOpacity;
uniform float uTime;
uniform float uFlash;
varying vec2 vUv;
varying vec2 vLight;
varying float vShade;
varying float vDist; varying float vFogDist;
float lightCurve(float l) {
  float c = l / (4.0 - 3.0 * l);
  return mix(c, l, 0.4);
}
float blockCurve(float l) {
  float c = l / (4.0 - 3.0 * l);
  return mix(c, l, 0.6);
}
#if FANCY
varying vec3 vWorldPos;
varying float vFace;
varying float vExtra;
uniform float uTimeS;
uniform sampler2D uNormalMap;
uniform sampler2D uMaterialMap;
${SHADING_PARS}
// World normal and tangent frame of the atlas uv per face (faceUV in mesher.js). T = d(world)/du,
// B = -d(world)/dv: OpenGL normal maps (red = +u, green = toward the top of the tile, blue = out).
void faceFrame(float f, out vec3 N, out vec3 T, out vec3 B) {
  if (f < 0.5)      { N = vec3(1.0, 0.0, 0.0);  T = vec3(0.0, 0.0, -1.0); B = vec3(0.0, 1.0, 0.0); }
  else if (f < 1.5) { N = vec3(-1.0, 0.0, 0.0); T = vec3(0.0, 0.0, 1.0);  B = vec3(0.0, 1.0, 0.0); }
  else if (f < 2.5) { N = vec3(0.0, 1.0, 0.0);  T = vec3(1.0, 0.0, 0.0);  B = vec3(0.0, 0.0, -1.0); }
  else if (f < 3.5) { N = vec3(0.0, -1.0, 0.0); T = vec3(-1.0, 0.0, 0.0); B = vec3(0.0, 0.0, -1.0); }
  else if (f < 4.5) { N = vec3(0.0, 0.0, 1.0);  T = vec3(1.0, 0.0, 0.0);  B = vec3(0.0, 1.0, 0.0); }
  else              { N = vec3(0.0, 0.0, -1.0); T = vec3(-1.0, 0.0, 0.0); B = vec3(0.0, 1.0, 0.0); }
}
// The vanilla per-face shade (FACES[].shade in mesher.js: sides 0.6 / 0.8, bottom 0.5) stands in for directional
// light; with the sun doing that job per pixel it is partly lifted (FACE_FLATTEN of the way to 1), keeping the AO part.
const float FACE_FLATTEN = 0.4;
float faceShade(float f) {
  if (f < 1.5) return 0.6;
  if (f < 2.5) return 1.0;
  if (f < 3.5) return 0.5;
  return 0.8;
}
float flatShade(float shade, float f) { return min(shade * mix(1.0, 1.0 / faceShade(f), FACE_FLATTEN), 1.0); }
#endif`;

const FRAG = /* glsl */ `
${FRAG_HEAD}
void main() {
  vec4 tex = texture2D(map, vUv);
  if (tex.a < uAlphaTest) discard;
  float skyCurved = lightCurve(vLight.x);
  float sky = skyCurved * uSkyLight;
  float blk = blockCurve(vLight.y);
  vec3 blkCol = vec3(blk) * vec3(1.0, 0.9, 0.72);
#if FANCY
  vec3 N, T, B;
  faceFrame(vFace, N, T, B);
  vec3 gN = N;
  float rough = 0.9, metal = 0.0, emis = 0.0;
  #if MATERIAL_MAPS
  vec3 nm = texture2D(uNormalMap, vUv).xyz * 2.0 - 1.0;
  N = normalize(T * nm.x + B * nm.y + gN * max(nm.z, 0.05));
  vec3 mm = texture2D(uMaterialMap, vUv).xyz;
  rough = mm.x; metal = mm.y; emis = mm.z;
  #endif
  vec3 V = normalize(uCamPos - vWorldPos);
  vec3 albedo = tex.rgb;
  float shade = flatShade(vShade, vFace);
  // lightmap ambient + directional sun (shadowed, gated by the vertex sky light), against the warm block light
  vec3 light = shadingLight(vec3(sky) * uSkyTint, blkCol, vWorldPos, N, skyCurved, vDist);
  light = max(light, vec3(0.035)) + vec3(uFlash);
  vec3 col = albedo * light * shade * (1.0 - 0.45 * metal);
  // sky reflection (metals: albedo-tinted, dielectrics: faint at grazing angles) + sun highlight
  float ndv = max(dot(N, V), 0.0);
  vec3 F0 = mix(vec3(0.04), albedo, metal);
  vec3 Fenv = F0 + (1.0 - F0) * pow(1.0 - ndv, 5.0);
  float gloss = 1.0 - rough;
  vec3 env = skyGradient(reflect(-V, N)) * skyCurved;
  col += env * Fenv * gloss * gloss * shade;
  col += sunSpecular(vWorldPos, N, gN, V, rough, metal, albedo, skyCurved, vDist) * shade;
  // emissive: not shadowed, not sky lit, still fogged
  col += albedo * emis * 2.2;
  vec3 fogC = fogColorDir(uFogColor, -V);
#else
  vec3 light = max(vec3(sky) * uSkyTint, blkCol);
  light = max(light, vec3(0.035)) + vec3(uFlash);
  vec3 col = tex.rgb * light * vShade;
  vec3 fogC = uFogColor;
#endif
  float f = smoothstep(uFogNear, uFogFar, vFogDist);
  col = mix(col, fogC, f);
  gl_FragColor = vec4(col, tex.a * uOpacity);
}`;

// Water: two scrolling procedural wave layers perturb the top face normal; Fresnel-weighted sky reflection, sun
// glint through the shared specular, depth tint from the column depth the mesher packed into aFace.
const WATER_FRAG = /* glsl */ `
${FRAG_HEAD}
#if FANCY
float whash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float wnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = whash(i), b = whash(i + vec2(1.0, 0.0)), c = whash(i + vec2(0.0, 1.0)), d = whash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
float waveHeight(vec2 p, float t) {
  float h = wnoise(p * 0.55 + vec2(t * 0.30, t * 0.17)) * 0.62;
  h += wnoise(p * 1.7 - vec2(t * 0.42, -t * 0.27) + 7.3) * 0.38;
  return h;
}
vec3 waveNormal(vec2 p, float t) {
  float e = 0.08;
  float h0 = waveHeight(p, t), hx = waveHeight(p + vec2(e, 0.0), t), hz = waveHeight(p + vec2(0.0, e), t);
  vec2 g = vec2(hx - h0, hz - h0) / e * 0.10;
  return normalize(vec3(-g.x, 1.0, -g.y));
}
#endif
void main() {
  vec4 tex = texture2D(map, vUv);
  if (tex.a < uAlphaTest) discard;
  float skyCurved = lightCurve(vLight.x);
  float sky = skyCurved * uSkyLight;
  float blk = blockCurve(vLight.y);
  vec3 blkCol = vec3(blk) * vec3(1.0, 0.9, 0.72);
#if FANCY
  vec3 gN, T, B;
  faceFrame(vFace, gN, T, B);
  vec3 V = normalize(uCamPos - vWorldPos);
  float flip = dot(gN, V) < 0.0 ? -1.0 : 1.0;           // seen from the back (submerged camera): light the back side
  vec3 N = gN;
  if (vFace > 1.5 && vFace < 2.5) N = waveNormal(vWorldPos.xz, uTimeS);
  N *= flip; gN *= flip;
  float depth = max(vExtra, 1.0);
  float deepT = clamp((depth - 1.0) / 6.0, 0.0, 1.0);
  vec3 albedo = mix(tex.rgb, tex.rgb * vec3(0.38, 0.52, 0.78), deepT);
  vec3 light = shadingLight(vec3(sky) * uSkyTint, blkCol, vWorldPos, N, skyCurved, vDist);
  light = max(light, vec3(0.035)) + vec3(uFlash);
  vec3 col = albedo * light * vShade;
  float ndv = max(dot(N, V), 0.0);
  // grazing reflections stay water-coloured: the sky term is blended toward the horizon colour and capped so a
  // sunset never turns the whole sea into a sheet of orange
  float F = 0.02 + 0.70 * pow(1.0 - ndv, 5.0);
  vec3 refl = mix(skyGradient(reflect(-V, N)), uSkyHorizon, 0.4) * skyCurved * mix(0.6, 1.0, uSkyLight);
  col = mix(col, refl, F * 0.85);
  // the glint is capped and fades at grazing angles: a low sun ahead of an aerial camera lit the whole loaded sea
  // to a peach sheet (the "orange sea"); now it reads as a bright path under the sun, water elsewhere
  vec3 glint = sunSpecular(vWorldPos, N, gN, V, 0.10, 0.0, albedo, skyCurved, vDist);
  col += min(glint, vec3(0.9)) * mix(0.35, 1.0, ndv);
  float alpha = tex.a * mix(0.66, 0.94, clamp((depth - 1.0) / 5.0, 0.0, 1.0));
  alpha = mix(alpha, 1.0, F * 0.8);
  vec3 fogC = fogColorDir(uFogColor, -V);
#else
  vec3 light = max(vec3(sky) * uSkyTint, blkCol);
  light = max(light, vec3(0.035)) + vec3(uFlash);
  vec3 col = tex.rgb * light * vShade;
  float alpha = tex.a * uOpacity;
  vec3 fogC = uFogColor;
#endif
  float f = smoothstep(uFogNear, uFogFar, vFogDist);
  col = mix(col, fogC, f);
  gl_FragColor = vec4(col, alpha);
}`;

export function makeWorldMaterial(atlas, opts = {}) {
  const m = new THREE.ShaderMaterial({
    defines: { FANCY: 0, MATERIAL_MAPS: 0 },
    uniforms: {
      map: { value: atlas },
      uSkyLight: { value: 1 },
      uSkyTint: { value: new THREE.Vector3(1, 1, 1) },
      uFogColor: { value: new THREE.Vector3(0.7, 0.8, 1) },
      uFogNear: { value: 80 },
      uFogFar: { value: 120 },
      uAlphaTest: { value: opts.alphaTest ?? 0.5 },
      uOpacity: { value: opts.opacity ?? 1 },
      uTime: { value: 0 },
      uFlash: { value: 0 },
      uLightTable: { value: LIGHT_TABLE },
      uShadeTable: { value: SHADE_TABLE },
    },
    vertexShader: VERT,
    fragmentShader: opts.water ? WATER_FRAG : FRAG,
    transparent: !!opts.transparent,
    side: opts.side ?? THREE.FrontSide,
    depthWrite: true,
  });
  bindShading(m);
  bindMaterialMaps(m);
  return m;
}

const COST_EMA = 0.2; // smoothing of the per-step cost estimates

// View distance (chunks) the selector may ask for. Full chunks only ever stream to `nearRadius = min(rd, nearCap)`
// (nearCap comes from the quality preset: 12 Light / 16 Balanced / 20 Cinematic); the far-LOD heightmap layer
// (render/farlod.js) covers the rest, and the sky fog follows `renderDistance`, not the near ring.
export const MAX_VIEW_DISTANCE = 32;
export const DEFAULT_NEAR_CAP = 12;

// AABB against inward-facing planes (same convention as THREE.Frustum.intersectsBox).
const _pv = new THREE.Vector3();
function boxInPlanes(planes, box) {
  for (let i = 0; i < planes.length; i++) {
    const n = planes[i].normal;
    _pv.set(n.x > 0 ? box.max.x : box.min.x, n.y > 0 ? box.max.y : box.min.y, n.z > 0 ? box.max.z : box.min.z);
    if (planes[i].distanceToPoint(_pv) < 0) return false;
  }
  return true;
}

export class Terrain {
  constructor(world, scene, atlas) {
    this.world = world;
    this.scene = scene;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.mesher = new Mesher();
    this.material = makeWorldMaterial(atlas, { alphaTest: 0.5 });
    this.waterMaterial = makeWorldMaterial(atlas, { alphaTest: 0.0, opacity: 0.78, transparent: true, side: THREE.DoubleSide, water: true });
    // renderDistance = the view distance the player picked (sky fog, far layer); nearRadius = the ring that actually
    // streams full chunks (min(renderDistance, nearCap)). Everything below streams/meshes/unloads by nearRadius.
    this.renderDistance = DEFAULT_RENDER_DISTANCE;
    this.nearCap = DEFAULT_NEAR_CAP;
    this.nearRadius = Math.min(this.renderDistance, this.nearCap);
    this.lastCx = null;
    this.lastCz = null;
    this.offsets = [];
    this.buildOffsets();
    this.stats = { chunks: 0, meshed: 0, genTimeMs: 0 };
    // measured per-step costs (ms, exponential moving averages) so a frame stops before a step that would
    // overshoot its budget instead of after it
    this.cost = { gen: 1.5, light: 1.0, mesh: 1.0 };

    // Exact per-render frustum culling of chunk meshes by their world-space AABB. three.js only tests
    // bounding spheres, which are very loose for tall thin chunk columns, so many off-screen chunks were
    // drawn. Hooked into the scene's onBeforeRender (runs after the camera matrices update and before
    // three.js builds its render list); update() restores visibility if the hook stops being called.
    this.frustumCullChunks = true;
    this._frustum = new THREE.Frustum();
    this._projScreen = new THREE.Matrix4();
    this._cullRuns = 0;
    this._cullRunsSeen = 0;
    const prev = scene.onBeforeRender;
    scene.onBeforeRender = (renderer, scn, camera, target) => {
      if (prev) prev.call(scene, renderer, scn, camera, target);
      this.cullChunks(camera);
    };
  }

  buildOffsets() {
    const r = this.nearRadius + 1;
    const arr = [];
    for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
      const d = Math.sqrt(dx * dx + dz * dz);
      if (d <= r + 0.5) arr.push([dx, dz, d]);
    }
    arr.sort((a, b) => a[2] - b[2]);
    this.offsets = arr;
  }

  setRenderDistance(r) {
    r = Number.isFinite(r) ? r : DEFAULT_RENDER_DISTANCE;
    this.renderDistance = Math.max(2, Math.min(MAX_VIEW_DISTANCE, Math.round(r)));
    this.nearRadius = Math.min(this.renderDistance, this.nearCap);
    this.buildOffsets();
    this.lastCx = null;
  }

  // Quality preset hook: the largest ring of full chunks this machine should stream (chunks).
  setNearCap(cap) {
    this.nearCap = Math.max(2, Math.min(MAX_VIEW_DISTANCE, Math.round(cap || DEFAULT_NEAR_CAP)));
    this.setRenderDistance(this.renderDistance);
  }

  // Radius (blocks, from the player) inside which every chunk of the near ring has a mesh, i.e. where the far-LOD
  // layer can be culled without opening a hole. Walks the distance-sorted offsets until the first chunk without a
  // mesh and returns the distance from the player to that chunk's nearest edge (capped at the ring itself).
  nearCullRadius(px, pz) {
    const pcx = Math.floor(px / CS), pcz = Math.floor(pz / CS);
    const R = this.nearRadius, offsets = this.offsets, world = this.world;
    let best = (R - 1) * CS;
    let firstMiss = Infinity;
    for (let k = 0; k < offsets.length; k++) {
      const o = offsets[k];
      if (o[2] > R + 0.5 || o[2] > firstMiss + 1.5) break;
      const c = world.getChunk(pcx + o[0], pcz + o[1]);
      if (c && c.meshed) continue;
      if (firstMiss === Infinity) firstMiss = o[2];
      // horizontal distance from the player to the chunk's AABB
      const x0 = (pcx + o[0]) * CS, z0 = (pcz + o[1]) * CS;
      const dx = Math.max(x0 - px, 0, px - (x0 + CS)), dz = Math.max(z0 - pz, 0, pz - (z0 + CS));
      const d = Math.sqrt(dx * dx + dz * dz);
      if (d < best) best = d;
    }
    return Math.max(0, best);
  }

  setLighting(skyLight, skyTint, fogColor, fogNear, fogFar, flash = 0) {
    for (const m of [this.material, this.waterMaterial]) {
      m.uniforms.uFlash.value = flash;
      m.uniforms.uSkyLight.value = skyLight;
      m.uniforms.uSkyTint.value.copy(skyTint);
      m.uniforms.uFogColor.value.copy(fogColor);
      m.uniforms.uFogNear.value = fogNear;
      m.uniforms.uFogFar.value = fogFar;
    }
  }

  // Fills a chunk's block array (no lighting) and marks the 3x3 neighbourhood for remeshing.
  generateChunk(c) {
    const t0 = performance.now();
    this.world.gen.generateChunk(c);
    if (this.onChunkGenerated) this.onChunkGenerated(c); // saved player edits overlay
    c.generated = true;
    const dt = performance.now() - t0;
    this.stats.genTimeMs += dt;
    this.cost.gen += (dt - this.cost.gen) * COST_EMA;
    // neighbours need remeshing for border faces
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
      const n = this.world.getChunk(c.cx + dx, c.cz + dz);
      if (n) n.dirty = true;
    }
  }

  lightChunk(c) {
    const t0 = performance.now();
    this.world.lightChunk(c);
    const dt = performance.now() - t0;
    this.stats.genTimeMs += dt;
    this.cost.light += (dt - this.cost.light) * COST_EMA;
  }

  // Ensure a chunk exists, is generated and lit. Returns the chunk.
  ensureChunk(cx, cz) {
    const c = this.world.getOrCreateChunk(cx, cz);
    if (!c.generated) this.generateChunk(c);
    if (!c.lit) this.lightChunk(c);
    return c;
  }

  neighborsReady(cx, cz) {
    const m = this.world.chunks;
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
      if (dx === 0 && dz === 0) continue;
      const n = m.get(World.key(cx + dx, cz + dz));
      if (!n || !n.lit) return false;
    }
    return true;
  }

  meshChunk(c) {
    const t0 = performance.now();
    const { solid, water } = this.mesher.build(this.world, c);
    c.mesh = this._setMesh(c.mesh, solid, this.material, c, false);
    c.waterMesh = this._setMesh(c.waterMesh, water, this.waterMaterial, c, true);
    c.dirty = false;
    c.meshed = true;
    this.cost.mesh += (performance.now() - t0 - this.cost.mesh) * COST_EMA;
  }

  // Replaces a chunk mesh's geometry (reusing the Mesh object), creating or removing the mesh as needed.
  _setMesh(m, geo, material, c, isWater) {
    if (!geo) {
      if (m) { this.group.remove(m); m.geometry.dispose(); }
      return null;
    }
    if (m) {
      m.geometry.dispose();
      m.geometry = geo;
    } else {
      m = new THREE.Mesh(geo, material);
      m.position.set(c.cx * CS, 0, c.cz * CS);
      m.matrixAutoUpdate = false;
      m.updateMatrix();
      m.frustumCulled = true;
      if (isWater) m.renderOrder = 10;
      else m.layers.enable(SHADOW_LAYER);   // solid chunks cast sun shadows (render/shadows.js); water does not
      m.chunkBox = new THREE.Box3();
      m.chunkInRange = true; // meshes are only built inside the render distance
      this.group.add(m);
    }
    m.chunkBox.copy(geo.boundingBox).translate(m.position);
    return m;
  }

  disposeChunk(c) {
    if (c.mesh) { this.group.remove(c.mesh); c.mesh.geometry.dispose(); }
    if (c.waterMesh) { this.group.remove(c.waterMesh); c.waterMesh.geometry.dispose(); }
    c.mesh = null; c.waterMesh = null;
    c.meshed = false;   // nearCullRadius(): the far layer must cover this column again until it is remeshed
  }

  // Hides in-range chunk meshes whose world AABB is outside the camera frustum (exact: such a mesh
  // contributes no fragments). Called for every render of the scene, including the shadow cameras, which may
  // add inward-facing planes (camera.userData.cullPlanes: the view slice swept toward the light) so only chunks
  // that can actually shadow something visible are drawn into a cascade.
  cullChunks(camera) {
    this._cullRuns++;
    if (!this.frustumCullChunks) return;
    this._projScreen.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    const fr = this._frustum.setFromProjectionMatrix(this._projScreen);
    const extra = camera.userData.cullPlanes;
    const children = this.group.children;
    for (let i = 0; i < children.length; i++) {
      const m = children[i];
      if (m.chunkInRange) m.visible = fr.intersectsBox(m.chunkBox) && (!extra || boxInPlanes(extra, m.chunkBox));
    }
  }

  // If no render ran the culling hook since the last update (e.g. the hook was replaced), fall back to
  // plain render-distance visibility so nothing stays hidden.
  _checkCullHook() {
    if (this._cullRuns === this._cullRunsSeen && this._cullRuns > 0) {
      const children = this.group.children;
      for (let i = 0; i < children.length; i++) { const m = children[i]; m.visible = m.chunkInRange; }
    }
    this._cullRunsSeen = this._cullRuns;
  }

  // Chunks in this block region are always kept generated (the town, so NPCs simulate everywhere)
  pinRegion(x0, z0, x1, z1) {
    this.pinned = { cx0: Math.floor(x0 / CS) - 1, cz0: Math.floor(z0 / CS) - 1, cx1: Math.floor(x1 / CS) + 1, cz1: Math.floor(z1 / CS) + 1 };
  }

  // Synchronous preload around a position; yields progress fraction after each step.
  *preload(px, pz) {
    const pcx = Math.floor(px / CS), pcz = Math.floor(pz / CS);
    const pinnedList = [];
    if (this.pinned) for (let cx = this.pinned.cx0; cx <= this.pinned.cx1; cx++) for (let cz = this.pinned.cz0; cz <= this.pinned.cz1; cz++) pinnedList.push([cx, cz]);
    const total = this.offsets.length * 2 + pinnedList.length;
    let done = 0;
    for (const [cx, cz] of pinnedList) {
      const c = this.ensureChunk(cx, cz);
      c.pinned = true;
      done++;
      yield done / total;
    }
    for (const [dx, dz] of this.offsets) {
      this.ensureChunk(pcx + dx, pcz + dz);
      done++;
      yield done / total;
    }
    for (const [dx, dz, d] of this.offsets) {
      if (d > this.nearRadius + 0.5) { done++; continue; }
      const c = this.world.getChunk(pcx + dx, pcz + dz);
      if (c && c.dirty) this.meshChunk(c);
      done++;
      yield done / total;
    }
  }

  update(px, pz, budgetMs = 6) {
    const t0 = performance.now();
    this._checkCullHook();
    const pcx = Math.floor(px / CS), pcz = Math.floor(pz / CS);
    const R = this.nearRadius;
    const world = this.world, offsets = this.offsets, cost = this.cost;
    let now = t0;
    // generation + lighting pass (nearest first). Generation and lighting are separate steps so the budget
    // check falls between them; a step is skipped when its estimated cost would overshoot the budget, but
    // at least one step always runs so streaming never stalls.
    let steps = 0;
    for (let k = 0; k < offsets.length; k++) {
      const o = offsets[k];
      const cx = pcx + o[0], cz = pcz + o[1];
      let c = world.getChunk(cx, cz);
      if (c && c.generated && c.lit) continue;
      if (!c || !c.generated) {
        if (steps > 0 && now - t0 + cost.gen > budgetMs) break;
        if (!c) c = world.getOrCreateChunk(cx, cz);
        this.generateChunk(c);
        steps++;
        now = performance.now();
      }
      if (!c.lit) {
        if (steps > 0 && now - t0 + cost.light > budgetMs) break;
        this.lightChunk(c);
        steps++;
        now = performance.now();
      }
      if (now - t0 > budgetMs) break;
    }
    // meshing pass: dirty chunks inside the render distance whose 3x3 neighbourhood is lit
    const meshBudget = budgetMs * 1.5;
    let meshedNow = 0;
    for (let k = 0; k < offsets.length; k++) {
      const o = offsets[k];
      if (o[2] > R + 0.5) break;
      const c = world.getChunk(pcx + o[0], pcz + o[1]);
      if (!c || !c.generated || !c.dirty || c.needsRelight) continue;
      if (!this.neighborsReady(c.cx, c.cz)) continue;
      if (meshedNow > 0 && now - t0 + cost.mesh > meshBudget) break;
      this.meshChunk(c);
      meshedNow++;
      now = performance.now();
    }
    // unload far chunks occasionally
    if (pcx !== this.lastCx || pcz !== this.lastCz) {
      this.lastCx = pcx; this.lastCz = pcz;
      const maxD = R + 4;
      for (const [key, c] of world.chunks) {
        const ddx = c.cx - pcx, ddz = c.cz - pcz;
        if (ddx * ddx + ddz * ddz > maxD * maxD) {
          this.disposeChunk(c);
          c.dirty = true;
          if (!c.pinned) world.chunks.delete(key);
        }
      }
      // hide meshes beyond render distance
      const lim = (R + 0.5) * (R + 0.5);
      for (const c of world.chunks.values()) {
        const ddx = c.cx - pcx, ddz = c.cz - pcz;
        const visible = ddx * ddx + ddz * ddz <= lim;
        if (c.mesh) { c.mesh.chunkInRange = visible; c.mesh.visible = visible; }
        if (c.waterMesh) { c.waterMesh.chunkInRange = visible; c.waterMesh.visible = visible; }
      }
    }
    this.stats.chunks = world.chunks.size;
    this.stats.meshed = this.group.children.length;
    this.stats.nearRadius = R;
  }

  // Remesh up to maxCount dirty chunks anywhere within the near ring (nearest first). Used after bulk edits.
  remeshDirty(maxCount, px, pz) {
    const pcx = Math.floor(px / CS), pcz = Math.floor(pz / CS);
    let n = 0;
    for (const [dx, dz, d] of this.offsets) {
      if (d > this.nearRadius + 0.5) break;
      const c = this.world.getChunk(pcx + dx, pcz + dz);
      if (c && c.generated && c.dirty && !c.needsRelight && this.neighborsReady(c.cx, c.cz)) { this.meshChunk(c); if (++n >= maxCount) break; }
    }
    return n;
  }

  // Dirty-chunk remesh for immediate edits (called after block edits so the change shows this frame)
  remeshDirtyNear(px, pz, maxCount = 4) {
    const pcx = Math.floor(px / CS), pcz = Math.floor(pz / CS);
    let n = 0;
    for (const [dx, dz, d] of this.offsets) {
      if (d > 2.5) break;
      const c = this.world.getChunk(pcx + dx, pcz + dz);
      if (c && c.generated && c.dirty && this.neighborsReady(c.cx, c.cz)) { this.meshChunk(c); if (++n >= maxCount) break; }
    }
  }
}
