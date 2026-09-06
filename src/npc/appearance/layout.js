// Skin layout used by the composer: the classic 64x32 Minecraft layout that src/npc/model.js maps onto the
// humanoid, painted at 2x (128x64 canvas). model.js normalises UVs (px / 64, py / 32), so a 2x canvas lands on
// exactly the same faces with 16x16 texels per head face instead of 8x8 - enough room for real eyes, brows,
// noses, wrinkles and uniform insignia. The right half of the top band and the strip right of the arm are unused
// by the classic layout; the composer packs the textures of extra geometry parts (lekku, helmets, satchels...)
// into that free space so a whole NPC keeps one texture and one material (buildStaticLOD merges per material).
export const SCALE = 2;
export const TEX_W = 64 * SCALE, TEX_H = 32 * SCALE;
export const FACE_PX = 8 * SCALE; // texels per head face side

const classic = {
  headTop: [8, 0, 8, 8], headBottom: [16, 0, 8, 8], headRight: [0, 8, 8, 8], headFront: [8, 8, 8, 8], headLeft: [16, 8, 8, 8], headBack: [24, 8, 8, 8],
  bodyTop: [20, 16, 8, 4], bodyBottom: [28, 16, 8, 4], bodyRight: [16, 20, 4, 12], bodyFront: [20, 20, 8, 12], bodyLeft: [28, 20, 4, 12], bodyBack: [32, 20, 8, 12],
  armTop: [44, 16, 4, 4], armBottom: [48, 16, 4, 4], armRight: [40, 20, 4, 12], armFront: [44, 20, 4, 12], armLeft: [48, 20, 4, 12], armBack: [52, 20, 4, 12],
  legTop: [4, 16, 4, 4], legBottom: [8, 16, 4, 4], legRight: [0, 20, 4, 12], legFront: [4, 20, 4, 12], legLeft: [8, 20, 4, 12], legBack: [12, 20, 4, 12],
};
export const REG = {};
for (const k of Object.keys(classic)) REG[k] = classic[k].map((v) => v * SCALE);

// Face sets per part in the order model.js's applyUV expects ({top,bottom,right,front,left,back})
export const PART = {
  head: { top: REG.headTop, bottom: REG.headBottom, right: REG.headRight, front: REG.headFront, left: REG.headLeft, back: REG.headBack },
  body: { top: REG.bodyTop, bottom: REG.bodyBottom, right: REG.bodyRight, front: REG.bodyFront, left: REG.bodyLeft, back: REG.bodyBack },
  arm: { top: REG.armTop, bottom: REG.armBottom, right: REG.armRight, front: REG.armFront, left: REG.armLeft, back: REG.armBack },
  leg: { top: REG.legTop, bottom: REG.legBottom, right: REG.legRight, front: REG.legFront, left: REG.legLeft, back: REG.legBack },
};
export const SIDES = ['front', 'back', 'right', 'left']; // the four vertical faces
export const ALL_FACES = ['front', 'back', 'right', 'left', 'top', 'bottom'];

// Free texel space (not referenced by the classic layout): the top-right 64x32 and the 16x32 strip right of the arm
export const FREE_RECTS = [[64, 0, 64, 32], [112, 32, 16, 32]];

// Shelf packer over the free rects. alloc(w, h) -> [x, y, w, h] or null when the skin is full.
export class ShelfAllocator {
  constructor(rects = FREE_RECTS) { this.bins = rects.map((r) => ({ r, shelves: [], used: 0 })); this.allocated = 0; this.failed = 0; }
  alloc(w, h) {
    w = Math.max(1, Math.ceil(w)); h = Math.max(1, Math.ceil(h));
    for (const bin of this.bins) {
      const [bx, by, bw, bh] = bin.r;
      if (w > bw) continue;
      for (const s of bin.shelves) {
        if (h <= s.h && s.x + w <= bx + bw) { const out = [s.x, s.y, w, h]; s.x += w; this.allocated += w * h; return out; }
      }
      if (bin.used + h <= bh) {
        const s = { x: bx + w, y: by + bin.used, h };
        bin.shelves.push(s); bin.used += h; this.allocated += w * h;
        return [bx, s.y, w, h];
      }
    }
    this.failed++;
    return null;
  }
}

// Box in part-local pixel units (1 px = model.js PX): centre (x, y, z), size (w, h, d). Geometry boxes carry a
// `uv` face set into the skin canvas. `boxUV(alloc, box, opts)` allocates textures for a box: by default the four
// vertical faces share one rect and top/bottom share one (cheap, identical looking sides); pass
// { separate: ['front', 'left', ...] } to give some faces their own rect.
export function boxUV(alloc, box, opts = {}) {
  const w = box.w, h = box.h, d = box.d;
  const sep = new Set(opts.separate || []);
  const side = alloc.alloc(Math.max(w, d), h);
  const cap = alloc.alloc(w, d);
  const uv = {};
  const dims = { front: [w, h], back: [w, h], left: [d, h], right: [d, h], top: [w, d], bottom: [w, d] };
  for (const f of ALL_FACES) {
    const base = f === 'top' || f === 'bottom' ? cap : side;
    uv[f] = sep.has(f) ? alloc.alloc(dims[f][0], dims[f][1]) || base : base;
  }
  return uv;
}
export const rectOf = (uv, face) => uv[face];
