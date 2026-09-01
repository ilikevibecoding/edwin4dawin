// Voxel raycasting, block highlight, breaking progress & placement rules.
import * as THREE from 'three';
import { B, BLOCKS, SHAPE } from './blocks.js';
import { REACH } from './constants.js';
import { AABB, collectBoxes } from './player.js';

const CROSS_BOX = [[0.1, 0, 0.1, 0.9, 0.8, 0.9]];
const LANTERN_BOX = [[0.3125, 0, 0.3125, 0.6875, 0.5625, 0.6875]];
const LANTERN_HANG_BOX = [[0.3125, 0.375, 0.3125, 0.6875, 1, 0.6875]];
const TORCH_BOX = [[0.4375, 0, 0.4375, 0.5625, 0.625, 0.5625]];
const RAIL_BOX = [[0, 0, 0, 1, 0.125, 1]];
const SIGN_BOX = [[0, 0.25, 0, 1, 0.75, 1]];
const DOOR_BOX = [[0, 0, 0, 1, 1, 1]];
const FULL = [[0, 0, 0, 1, 1, 1]];

export function selectionBoxes(world, x, y, z, def) {
  if (def.boxes.length) return def.boxes;
  switch (def.shape) {
    case SHAPE.CROSS: return CROSS_BOX;
    case SHAPE.LANTERN: return BLOCKS[world.getBlock(x, y - 1, z)].solid ? LANTERN_BOX : LANTERN_HANG_BOX;
    case SHAPE.TORCH: return TORCH_BOX;
    case SHAPE.RAIL: return RAIL_BOX;
    case SHAPE.WALL_SIGN: return SIGN_BOX;
    case SHAPE.DOOR: case SHAPE.SALOON_DOOR: return DOOR_BOX;
    default: return FULL;
  }
}

// Ray vs AABB (box in world coords). Returns {t, face} or null; face is dir index 0..5
function rayBox(ox, oy, oz, dx, dy, dz, b) {
  let tmin = -Infinity, tmax = Infinity, face = -1;
  const axes = [[ox, dx, b[0], b[3], 1, 0], [oy, dy, b[1], b[4], 3, 2], [oz, dz, b[2], b[5], 5, 4]];
  for (const [o, d, lo, hi, fNeg, fPos] of axes) {
    if (Math.abs(d) < 1e-9) { if (o < lo || o > hi) return null; continue; }
    let t1 = (lo - o) / d, t2 = (hi - o) / d;
    let f = fNeg; // entering through the low side => face normal points -axis... careful below
    if (t1 > t2) { const t = t1; t1 = t2; t2 = t; f = fPos; }
    if (t1 > tmin) { tmin = t1; face = f; }
    if (t2 < tmax) tmax = t2;
    if (tmin > tmax) return null;
  }
  if (tmax < 0) return null;
  // face indices: entering through lo side of axis means the hit face is the negative-facing face
  return { t: Math.max(tmin, 0), face };
}

// DDA voxel traversal. Returns hit info or null.
export function raycastBlocks(world, origin, dir, maxDist = REACH, fluid = false) {
  let x = Math.floor(origin.x), y = Math.floor(origin.y), z = Math.floor(origin.z);
  const stepX = Math.sign(dir.x), stepY = Math.sign(dir.y), stepZ = Math.sign(dir.z);
  const tDeltaX = stepX !== 0 ? Math.abs(1 / dir.x) : Infinity;
  const tDeltaY = stepY !== 0 ? Math.abs(1 / dir.y) : Infinity;
  const tDeltaZ = stepZ !== 0 ? Math.abs(1 / dir.z) : Infinity;
  let tMaxX = stepX > 0 ? (x + 1 - origin.x) * tDeltaX : stepX < 0 ? (origin.x - x) * tDeltaX : Infinity;
  let tMaxY = stepY > 0 ? (y + 1 - origin.y) * tDeltaY : stepY < 0 ? (origin.y - y) * tDeltaY : Infinity;
  let tMaxZ = stepZ > 0 ? (z + 1 - origin.z) * tDeltaZ : stepZ < 0 ? (origin.z - z) * tDeltaZ : Infinity;
  let t = 0;
  for (let i = 0; i < 200 && t <= maxDist; i++) {
    const id = world.getBlock(x, y, z);
    if (id !== B.AIR && (fluid || id !== B.WATER)) {
      const def = BLOCKS[id];
      const boxes = selectionBoxes(world, x, y, z, def);
      let best = null;
      for (const bb of boxes) {
        const wb = [x + bb[0], y + bb[1], z + bb[2], x + bb[3], y + bb[4], z + bb[5]];
        const h = rayBox(origin.x, origin.y, origin.z, dir.x, dir.y, dir.z, wb);
        if (h && h.t <= maxDist && (!best || h.t < best.t)) best = h;
      }
      if (best) {
        const px = origin.x + dir.x * best.t, py = origin.y + dir.y * best.t, pz = origin.z + dir.z * best.t;
        return { x, y, z, id, face: best.face, dist: best.t, point: new THREE.Vector3(px, py, pz) };
      }
    }
    if (tMaxX < tMaxY && tMaxX < tMaxZ) { x += stepX; t = tMaxX; tMaxX += tDeltaX; }
    else if (tMaxY < tMaxZ) { y += stepY; t = tMaxY; tMaxY += tDeltaY; }
    else { z += stepZ; t = tMaxZ; tMaxZ += tDeltaZ; }
  }
  return null;
}

export const FACE_NORMALS = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];

// Decide what block id to actually place for an item given the clicked face and hit point
export function placementVariant(itemId, hit) {
  const def = BLOCKS[itemId];
  if (def.shape === SHAPE.SLAB) {
    const topVariant = { [B.OAK_SLAB]: B.OAK_SLAB_TOP, [B.SPRUCE_SLAB]: B.SPRUCE_SLAB_TOP, [B.STONE_BRICK_SLAB]: B.STONE_BRICK_SLAB_TOP }[itemId];
    if (!topVariant) return itemId;
    if (hit.face === 3) return topVariant;
    if (hit.face !== 2) { const fy = hit.point.y - Math.floor(hit.point.y); if (fy > 0.5) return topVariant; }
  }
  return itemId;
}

// Checks whether placing block id at (x,y,z) would intersect any of the given entity boxes
export function placementBlocked(id, x, y, z, entityBoxes) {
  const def = BLOCKS[id];
  if (!def.solid) return false;
  for (const bb of def.boxes) {
    const b = new AABB(x + bb[0], y + bb[1], z + bb[2], x + bb[3], y + bb[4], z + bb[5]);
    for (const e of entityBoxes) if (b.intersects(e)) return true;
  }
  return false;
}

export function canReplace(world, x, y, z) {
  const id = world.getBlock(x, y, z);
  return BLOCKS[id].replaceable;
}

// Block highlight (thin black wireframe) like Minecraft's selection box
export class BlockHighlight {
  constructor(scene) {
    const geo = new THREE.BufferGeometry();
    // 12 edges as line segments of a unit cube
    const c = [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0], [0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]];
    const e = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
    const pos = [];
    for (const [a, b] of e) pos.push(...c[a], ...c[b]);
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    this.unit = pos;
    this.mesh = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.4, depthTest: true }));
    this.mesh.renderOrder = 20;
    this.mesh.visible = false;
    scene.add(this.mesh);
  }
  update(world, hit) {
    if (!hit) { this.mesh.visible = false; return; }
    const def = BLOCKS[hit.id];
    const boxes = selectionBoxes(world, hit.x, hit.y, hit.z, def);
    // union of boxes
    let b = [1, 1, 1, 0, 0, 0];
    for (const bb of boxes) { b[0] = Math.min(b[0], bb[0]); b[1] = Math.min(b[1], bb[1]); b[2] = Math.min(b[2], bb[2]); b[3] = Math.max(b[3], bb[3]); b[4] = Math.max(b[4], bb[4]); b[5] = Math.max(b[5], bb[5]); }
    const g = 0.003;
    this.mesh.position.set(hit.x + b[0] - g, hit.y + b[1] - g, hit.z + b[2] - g);
    this.mesh.scale.set(b[3] - b[0] + 2 * g, b[4] - b[1] + 2 * g, b[5] - b[2] + 2 * g);
    this.mesh.visible = true;
  }
}

// Crack overlay while breaking a block
export class CrackOverlay {
  constructor(scene, atlas, tileUVFn, destroyTiles) {
    this.tileUV = tileUVFn;
    this.destroyTiles = destroyTiles;
    const geo = new THREE.BoxGeometry(1.004, 1.004, 1.004);
    this.geo = geo;
    const mat = new THREE.MeshBasicMaterial({ map: atlas, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    mat.alphaTest = 0.05;
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.renderOrder = 15;
    this.mesh.visible = false;
    scene.add(this.mesh);
    this.stage = -1;
    this.baseUV = Float32Array.from(geo.attributes.uv.array);
  }
  setStage(stage) {
    if (stage === this.stage) return;
    this.stage = stage;
    const [tu, tv, ts] = this.tileUV(this.destroyTiles[stage]);
    const uv = this.geo.attributes.uv;
    // BoxGeometry uv per face: (0,1),(1,1),(0,0),(1,0) pattern; remap the original uvs into the tile
    for (let i = 0; i < uv.count; i++) {
      const u = this.baseUV[i * 2] > 0.5 ? 1 : 0, v = this.baseUV[i * 2 + 1] > 0.5 ? 0 : 1; // flipY false atlas: v=0 top
      uv.setXY(i, tu + u * ts, tv + v * ts);
    }
    uv.needsUpdate = true;
  }
  show(hit, progress) {
    if (!hit || progress <= 0) { this.mesh.visible = false; return; }
    this.setStage(Math.min(9, Math.floor(progress * 10)));
    this.mesh.position.set(hit.x + 0.5, hit.y + 0.5, hit.z + 0.5);
    this.mesh.visible = true;
  }
}
