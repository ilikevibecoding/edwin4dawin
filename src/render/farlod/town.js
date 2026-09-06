// Far impostors for the frontier town (pure, no three.js): one coloured box per building of the town layout, sized
// from the building's footprint (`bounds`) and the roof height found in the town's block overlay, coloured from the
// dominant wall block and the dominant roof block. Drawn by the far-LOD material beyond the near ring; inside it the
// boxes sit within the real walls (inset) and are culled with the rest of the far layer.
import { B, BLOCKS, SHAPE } from '../../blocks.js';
import { TOWN_GROUND } from '../../constants.js';
import { blockColor } from './tiles.js';

const FORCE_AIR = 255;
const INSET = 0.3;
export const VERTS_PER_BOX = 24, INDICES_PER_BOX = 36;

// Most frequent id of a histogram map (Map<id, count>), or null.
function dominant(counts) {
  let best = null, bn = 0;
  for (const [id, n] of counts) if (n > bn) { bn = n; best = id; }
  return best;
}

// Wall colour of a block: its tile colour a touch darker than a roof of the same block, so walls read as walls.
export function wallColor(id) {
  const top = blockColor(id);
  return [top[0] * 0.86, top[1] * 0.86, top[2] * 0.86];
}

// Boxes for every building record of a town store: { name, x0, z0, x1, z1, y0, y1, wall: [r,g,b], roof: [r,g,b] }.
export function townBoxes(store) {
  const out = [];
  if (!store || !store.buildings || !store.blocks) return out;
  const { x0: sx0, z0: sz0, w, d, y0: sy0, h: sh, blocks } = store;
  const idx = (x, y, z) => ((x - sx0) * d + (z - sz0)) * sh + (y - sy0);
  const inStore = (x, z) => x >= sx0 && x < sx0 + w && z >= sz0 && z < sz0 + d;
  for (const rec of store.buildings) {
    const bd = rec.bounds;
    if (!bd) continue;
    const bx0 = Math.max(bd.x0, sx0), bx1 = Math.min(bd.x1, sx0 + w - 1), bz0 = Math.max(bd.z0, sz0), bz1 = Math.min(bd.z1, sz0 + d - 1);
    if (bx1 - bx0 < 2 || bz1 - bz0 < 2) continue;
    const walls = new Map(), roofs = new Map(), tops = [];
    const floor = rec.floorY ?? TOWN_GROUND + 1;
    for (let x = bx0; x <= bx1; x++) for (let z = bz0; z <= bz1; z++) {
      if (!inStore(x, z)) continue;
      let top = -1, topId = 0;
      for (let y = sy0 + sh - 1; y >= floor; y--) {
        const v = blocks[idx(x, y, z)];
        if (v === 0 || v === FORCE_AIR) continue;
        const def = BLOCKS[v];
        if (!def || !def.solid || def.shape !== SHAPE.CUBE) continue;   // fences, signs, slabs on posts are not roof
        top = y; topId = v; break;
      }
      if (top < 0) continue;
      tops.push(top);
      roofs.set(topId, (roofs.get(topId) || 0) + 1);
      if (x === bx0 || x === bx1 || z === bz0 || z === bz1) {
        for (let y = floor + 1; y <= floor + 3; y++) {
          const v = blocks[idx(x, y, z)];
          if (v === 0 || v === FORCE_AIR || v === B.GLASS) continue;
          walls.set(v, (walls.get(v) || 0) + 1);
        }
      }
    }
    if (tops.length < 4) continue;
    tops.sort((a, b) => a - b);
    const roofY = tops[Math.floor(tops.length * 0.85)] + 1;   // chimneys and false fronts do not stretch the box
    if (roofY <= floor + 1) continue;
    const wallId = dominant(walls) ?? B.OAK_PLANKS, roofId = dominant(roofs) ?? B.SPRUCE_PLANKS;
    out.push({ name: rec.name, x0: bx0 + INSET, z0: bz0 + INSET, x1: bx1 + 1 - INSET, z1: bz1 + 1 - INSET, y0: floor - 1, y1: roofY - INSET, wall: wallColor(wallId), roof: blockColor(roofId) });
  }
  return out;
}

// Merged box geometry: 24 vertices (4 per face, flat normals) and 36 indices per box, same attribute layout as the
// far tiles (float32 xyz, rgba8, int8 normal). Alpha 255 = land shading.
export function boxGeometry(boxes) {
  const n = boxes.length;
  const pos = new Float32Array(n * VERTS_PER_BOX * 3), col = new Uint8Array(n * VERTS_PER_BOX * 4), nrm = new Int8Array(n * VERTS_PER_BOX * 3), idx = new Uint32Array(n * INDICES_PER_BOX);
  let v = 0, ii = 0;
  for (const b of boxes) {
    const c = [[b.x0, b.y0, b.z0], [b.x1, b.y0, b.z0], [b.x1, b.y1, b.z0], [b.x0, b.y1, b.z0], [b.x0, b.y0, b.z1], [b.x1, b.y0, b.z1], [b.x1, b.y1, b.z1], [b.x0, b.y1, b.z1]];
    // faces: corner indices in counter-clockwise order seen from outside, with the outward normal
    const faces = [
      [[0, 3, 2, 1], [0, 0, -1]], [[4, 5, 6, 7], [0, 0, 1]], [[0, 1, 5, 4], [0, -1, 0]],
      [[3, 7, 6, 2], [0, 1, 0]], [[0, 4, 7, 3], [-1, 0, 0]], [[1, 2, 6, 5], [1, 0, 0]],
    ];
    for (const [f, nn] of faces) {
      const roof = nn[1] > 0;
      const rgb = roof ? b.roof : b.wall;
      // walls facing away from the sun side stay a touch darker, like the block side shades
      const k = roof ? 1 : (nn[0] !== 0 ? 0.8 : 0.7);
      const base = v;
      for (const ci of f) {
        pos[v * 3] = c[ci][0]; pos[v * 3 + 1] = c[ci][1]; pos[v * 3 + 2] = c[ci][2];
        col[v * 4] = Math.min(255, rgb[0] * k); col[v * 4 + 1] = Math.min(255, rgb[1] * k); col[v * 4 + 2] = Math.min(255, rgb[2] * k); col[v * 4 + 3] = 255;
        nrm[v * 3] = nn[0] * 127; nrm[v * 3 + 1] = nn[1] * 127; nrm[v * 3 + 2] = nn[2] * 127;
        v++;
      }
      idx[ii++] = base; idx[ii++] = base + 1; idx[ii++] = base + 2; idx[ii++] = base; idx[ii++] = base + 2; idx[ii++] = base + 3;
    }
  }
  return { pos, col, nrm, idx, count: n };
}
