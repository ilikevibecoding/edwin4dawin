// Chunk streaming + rendering: generation/lighting/meshing budgets and the world shader.
import * as THREE from 'three';
import { CHUNK_SIZE as CS, CHUNK_HEIGHT as CH, DEFAULT_RENDER_DISTANCE } from './constants.js';
import { Mesher } from './mesher.js';

const VERT = /* glsl */ `
attribute vec2 aLight;
attribute float aShade;
varying vec2 vUv;
varying vec2 vLight;
varying float vShade;
varying float vDist;
void main() {
  vUv = uv;
  vLight = aLight;
  vShade = aShade;
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
  light = max(light, vec3(0.035));
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
    },
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: !!opts.transparent,
    side: opts.side ?? THREE.FrontSide,
    depthWrite: true,
  });
}

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

  setLighting(skyLight, skyTint, fogColor, fogNear, fogFar) {
    for (const m of [this.material, this.waterMaterial]) {
      m.uniforms.uSkyLight.value = skyLight;
      m.uniforms.uSkyTint.value.copy(skyTint);
      m.uniforms.uFogColor.value.copy(fogColor);
      m.uniforms.uFogNear.value = fogNear;
      m.uniforms.uFogFar.value = fogFar;
    }
  }

  // Ensure a chunk exists, is generated and lit. Returns the chunk.
  ensureChunk(cx, cz) {
    const c = this.world.getOrCreateChunk(cx, cz);
    if (!c.generated) {
      const t0 = performance.now();
      this.world.gen.generateChunk(c);
      c.generated = true;
      this.world.lightChunk(c);
      this.stats.genTimeMs += performance.now() - t0;
      // neighbours need remeshing for border faces
      for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
        const n = this.world.getChunk(cx + dx, cz + dz);
        if (n) n.dirty = true;
      }
    }
    return c;
  }

  neighborsReady(cx, cz) {
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
      if (dx === 0 && dz === 0) continue;
      const n = this.world.getChunk(cx + dx, cz + dz);
      if (!n || !n.lit) return false;
    }
    return true;
  }

  meshChunk(c) {
    const { solid, water } = this.mesher.build(this.world, c);
    if (c.mesh) { this.group.remove(c.mesh); c.mesh.geometry.dispose(); c.mesh = null; }
    if (c.waterMesh) { this.group.remove(c.waterMesh); c.waterMesh.geometry.dispose(); c.waterMesh = null; }
    if (solid) {
      const m = new THREE.Mesh(solid, this.material);
      m.position.set(c.cx * CS, 0, c.cz * CS);
      m.matrixAutoUpdate = false;
      m.updateMatrix();
      m.frustumCulled = true;
      this.group.add(m);
      c.mesh = m;
    }
    if (water) {
      const m = new THREE.Mesh(water, this.waterMaterial);
      m.position.set(c.cx * CS, 0, c.cz * CS);
      m.matrixAutoUpdate = false;
      m.updateMatrix();
      m.renderOrder = 10;
      this.group.add(m);
      c.waterMesh = m;
    }
    c.dirty = false;
    c.meshed = true;
  }

  disposeChunk(c) {
    if (c.mesh) { this.group.remove(c.mesh); c.mesh.geometry.dispose(); }
    if (c.waterMesh) { this.group.remove(c.waterMesh); c.waterMesh.geometry.dispose(); }
    c.mesh = null; c.waterMesh = null;
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
    const pcx = Math.floor(px / CS), pcz = Math.floor(pz / CS);
    const R = this.renderDistance;
    let generated = 0;
    // generation pass (nearest first)
    for (const [dx, dz] of this.offsets) {
      const cx = pcx + dx, cz = pcz + dz;
      const c = this.world.getChunk(cx, cz);
      if (c && c.generated) continue;
      this.ensureChunk(cx, cz);
      generated++;
      if (performance.now() - t0 > budgetMs) break;
    }
    // meshing pass
    let meshedNow = 0;
    for (const [dx, dz, d] of this.offsets) {
      if (d > R + 0.5) break;
      const c = this.world.getChunk(pcx + dx, pcz + dz);
      if (!c || !c.generated || !c.dirty) continue;
      if (!this.neighborsReady(c.cx, c.cz)) continue;
      this.meshChunk(c);
      meshedNow++;
      if (performance.now() - t0 > budgetMs * 1.5) break;
    }
    // unload far chunks occasionally
    if (pcx !== this.lastCx || pcz !== this.lastCz) {
      this.lastCx = pcx; this.lastCz = pcz;
      const maxD = R + 4;
      for (const [key, c] of this.world.chunks) {
        const ddx = c.cx - pcx, ddz = c.cz - pcz;
        if (ddx * ddx + ddz * ddz > maxD * maxD) {
          this.disposeChunk(c);
          c.dirty = true;
          if (!c.pinned) this.world.chunks.delete(key);
        }
      }
      // hide meshes beyond render distance
      for (const c of this.world.chunks.values()) {
        const ddx = c.cx - pcx, ddz = c.cz - pcz;
        const visible = Math.sqrt(ddx * ddx + ddz * ddz) <= R + 0.5;
        if (c.mesh) c.mesh.visible = visible;
        if (c.waterMesh) c.waterMesh.visible = visible;
      }
    }
    this.stats.chunks = this.world.chunks.size;
    this.stats.meshed = this.group.children.length;
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
