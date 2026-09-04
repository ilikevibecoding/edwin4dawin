// Chunk streaming + rendering: generation/lighting/meshing budgets and the world shader.
import * as THREE from 'three';
import { CHUNK_SIZE as CS, CHUNK_HEIGHT as CH, DEFAULT_RENDER_DISTANCE } from './constants.js';
import { Mesher, LIGHT_TABLE, SHADE_TABLE } from './mesher.js';
import { World } from './world.js';

// aLight (uint8 pair: light sums 0..60) and aShade (uint8 table index) are expanded through uniform tables that
// hold the exact float32 values the old Float32 attributes carried (see the vertex layout note in mesher.js).
const VERT = /* glsl */ `
uniform float uLightTable[${LIGHT_TABLE.length}];
uniform float uShadeTable[${SHADE_TABLE.length}];
attribute vec2 aLight;
attribute float aShade;
varying vec2 vUv;
varying vec2 vLight;
varying float vShade;
varying float vDist;
void main() {
  vUv = uv;
  vLight = vec2(uLightTable[int(aLight.x)], uLightTable[int(aLight.y)]);
  vShade = uShadeTable[int(aShade)];
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vDist = length(mv.xyz);
  gl_Position = projectionMatrix * mv;
}`;

const FRAG = /* glsl */ `
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
varying float vDist;
float lightCurve(float l) {
  float c = l / (4.0 - 3.0 * l);
  return mix(c, l, 0.4);
}
float blockCurve(float l) {
  float c = l / (4.0 - 3.0 * l);
  return mix(c, l, 0.6);
}
void main() {
  vec4 tex = texture2D(map, vUv);
  if (tex.a < uAlphaTest) discard;
  float sky = lightCurve(vLight.x) * uSkyLight;
  float blk = blockCurve(vLight.y);
  vec3 light = max(vec3(sky) * uSkyTint, vec3(blk) * vec3(1.0, 0.9, 0.72));
  light = max(light, vec3(0.035)) + vec3(uFlash);
  vec3 col = tex.rgb * light * vShade;
  float f = smoothstep(uFogNear, uFogFar, vDist);
  col = mix(col, uFogColor, f);
  gl_FragColor = vec4(col, tex.a * uOpacity);
}`;

export function makeWorldMaterial(atlas, opts = {}) {
  return new THREE.ShaderMaterial({
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
    fragmentShader: FRAG,
    transparent: !!opts.transparent,
    side: opts.side ?? THREE.FrontSide,
    depthWrite: true,
  });
}

const COST_EMA = 0.2; // smoothing of the per-step cost estimates

export class Terrain {
  constructor(world, scene, atlas) {
    this.world = world;
    this.scene = scene;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.mesher = new Mesher();
    this.material = makeWorldMaterial(atlas, { alphaTest: 0.5 });
    this.waterMaterial = makeWorldMaterial(atlas, { alphaTest: 0.0, opacity: 0.78, transparent: true, side: THREE.DoubleSide });
    this.renderDistance = DEFAULT_RENDER_DISTANCE;
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
    const r = this.renderDistance + 1;
    const arr = [];
    for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
      const d = Math.sqrt(dx * dx + dz * dz);
      if (d <= r + 0.5) arr.push([dx, dz, d]);
    }
    arr.sort((a, b) => a[2] - b[2]);
    this.offsets = arr;
  }

  setRenderDistance(r) {
    this.renderDistance = Math.max(2, Math.min(16, r));
    this.buildOffsets();
    this.lastCx = null;
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
  }

  // Hides in-range chunk meshes whose world AABB is outside the camera frustum (exact: such a mesh
  // contributes no fragments). Called for every render of the scene.
  cullChunks(camera) {
    this._cullRuns++;
    if (!this.frustumCullChunks) return;
    this._projScreen.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    const fr = this._frustum.setFromProjectionMatrix(this._projScreen);
    const children = this.group.children;
    for (let i = 0; i < children.length; i++) {
      const m = children[i];
      if (m.chunkInRange) m.visible = fr.intersectsBox(m.chunkBox);
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
      if (d > this.renderDistance + 0.5) { done++; continue; }
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
    const R = this.renderDistance;
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
  }

  // Remesh up to maxCount dirty chunks anywhere within render distance (nearest first). Used after bulk edits.
  remeshDirty(maxCount, px, pz) {
    const pcx = Math.floor(px / CS), pcz = Math.floor(pz / CS);
    let n = 0;
    for (const [dx, dz, d] of this.offsets) {
      if (d > this.renderDistance + 0.5) break;
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
