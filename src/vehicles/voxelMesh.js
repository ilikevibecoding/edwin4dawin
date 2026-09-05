// Mesh builder for small voxel grids that move (trains, ships, turbolift cabs): culled faces, atlas UVs from the block
// registry, per-face shade, and a material that follows the world's sky light / fog like the debris shader.
// The light is sampled once per vehicle (uniform), not per vertex, so a whole car brightens/darkens together.
import * as THREE from 'three';
import { BLOCKS } from '../blocks.js';
import { tileUV } from '../textures.js';
import { SHARED } from '../entityMaterial.js';

// face order matches BLOCKS[id].tex: [+x, -x, +y, -y, +z, -z]
const FACES = [
  { n: [1, 0, 0], c: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]], shade: 0.8 },
  { n: [-1, 0, 0], c: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]], shade: 0.8 },
  { n: [0, 1, 0], c: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]], shade: 1.0 },
  { n: [0, -1, 0], c: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]], shade: 0.5 },
  { n: [0, 0, 1], c: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], shade: 0.65 },
  { n: [0, 0, -1], c: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]], shade: 0.65 },
];

const VERT = /* glsl */ `
attribute float aShade;
varying vec2 vUv; varying float vShade; varying float vDist;
void main() {
  vUv = uv; vShade = aShade;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vDist = length(mv.xyz);
  gl_Position = projectionMatrix * mv;
}`;
const FRAG = /* glsl */ `
uniform sampler2D map;
uniform vec2 uLight; uniform float uEmissive;
uniform float uSkyLight; uniform vec3 uSkyTint; uniform vec3 uFogColor; uniform float uFogNear; uniform float uFogFar; uniform float uFlash;
varying vec2 vUv; varying float vShade; varying float vDist;
float lightCurve(float l) { float c = l / (4.0 - 3.0 * l); return mix(c, l, 0.4); }
float blockCurve(float l) { float c = l / (4.0 - 3.0 * l); return mix(c, l, 0.6); }
void main() {
  vec4 tex = texture2D(map, vUv);
  if (tex.a < 0.5) discard;
  float sky = lightCurve(uLight.x) * uSkyLight;
  float blk = blockCurve(max(uLight.y, uEmissive));
  vec3 light = max(vec3(sky) * uSkyTint, vec3(blk) * vec3(1.0, 0.9, 0.72));
  light = max(light, vec3(0.05)) + vec3(uFlash);
  vec3 col = tex.rgb * light * vShade;
  col = mix(col, uFogColor, smoothstep(uFogNear, uFogFar, vDist));
  gl_FragColor = vec4(col, 1.0);
}`;

export function voxelMaterial(atlas) {
  return new THREE.ShaderMaterial({
    uniforms: {
      map: { value: atlas }, uLight: { value: new THREE.Vector2(1, 0) }, uEmissive: { value: 0 },
      uSkyLight: SHARED.uSkyLight, uSkyTint: SHARED.uSkyTint, uFogColor: SHARED.uFogColor, uFogNear: SHARED.uFogNear, uFogFar: SHARED.uFogFar, uFlash: SHARED.uFlash,
    },
    vertexShader: VERT, fragmentShader: FRAG, side: THREE.FrontSide,
  });
}

// grid: { w, h, d, get(x, y, z) -> block id (0 = air) }. Origin of the mesh = grid cell (0,0,0) corner.
// Returns { geometry, faces }. Interior faces between two opaque cells are culled; faces of transparent blocks
// (glass) against air are kept.
export function buildVoxelGeometry(grid) {
  const pos = [], uv = [], shade = [], idx = [];
  const { w, h, d } = grid;
  const at = (x, y, z) => (x < 0 || y < 0 || z < 0 || x >= w || y >= h || z >= d) ? 0 : grid.get(x, y, z);
  const opaqueAt = (x, y, z) => { const id = at(x, y, z); return id !== 0 && BLOCKS[id].opaque; };
  let faces = 0;
  for (let x = 0; x < w; x++) for (let y = 0; y < h; y++) for (let z = 0; z < d; z++) {
    const id = at(x, y, z);
    if (id === 0) continue;
    const def = BLOCKS[id];
    if (def.shape !== undefined && def.boxes.length === 0 && !def.cutout) continue; // non-cube decorations skipped
    for (let f = 0; f < 6; f++) {
      const F = FACES[f];
      const nx = x + F.n[0], ny = y + F.n[1], nz = z + F.n[2];
      const nid = at(nx, ny, nz);
      if (nid !== 0 && (opaqueAt(nx, ny, nz) || nid === id)) continue;
      const [tu, tv, ts] = tileUV(def.tex[f]);
      const base = pos.length / 3;
      for (let k = 0; k < 4; k++) {
        const c = F.c[k];
        pos.push(x + c[0], y + c[1], z + c[2]);
        shade.push(F.shade);
      }
      uv.push(tu, tv + ts, tu + ts, tv + ts, tu + ts, tv, tu, tv);
      idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
      faces++;
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('aShade', new THREE.Float32BufferAttribute(shade, 1));
  g.setIndex(idx);
  g.computeBoundingSphere();
  return { geometry: g, faces };
}

// Convenience: a dense Uint8Array grid.
export class VoxelGrid {
  constructor(w, h, d) { this.w = w; this.h = h; this.d = d; this.data = new Uint8Array(w * h * d); }
  idx(x, y, z) { return (x * this.d + z) * this.h + y; }
  get(x, y, z) { return (x < 0 || y < 0 || z < 0 || x >= this.w || y >= this.h || z >= this.d) ? 0 : this.data[this.idx(x, y, z)]; }
  set(x, y, z, id) { if (x >= 0 && y >= 0 && z >= 0 && x < this.w && y < this.h && z < this.d) this.data[this.idx(x, y, z)] = id; }
  fill(x0, y0, z0, x1, y1, z1, id) { for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) this.set(x, y, z, id); }
}

export function buildVoxelMesh(grid, atlas) {
  const { geometry, faces } = buildVoxelGeometry(grid);
  const mesh = new THREE.Mesh(geometry, voxelMaterial(atlas));
  mesh.frustumCulled = true;
  mesh.userData.faces = faces;
  return mesh;
}
