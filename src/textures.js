// Procedurally painted 16x16 pixel-art tiles packed into one atlas texture.
// Every texture is original artwork generated at runtime from code. The painters work at BASE_PX (16); the
// atlas stores each tile refined to TILE_PX (64) by src/render/hdTiles.js, plus normal and material atlases.
import * as THREE from 'three';
import { RNG } from './rng.js';
import { BASE_PX, TILE_PX, ATLAS_TILES } from './constants.js';
import { drawSmallText } from './font.js';
import { buildTileMaps } from './render/hdTiles.js';
import { setMaterialMaps } from './render/materialMaps.js';

const S = BASE_PX;

class Tile {
  constructor() {
    this.d = new Uint8ClampedArray(S * S * 4);
  }
  px(x, y, c, a = 255) {
    if (x < 0 || y < 0 || x >= S || y >= S) return;
    const i = (y * S + x) * 4;
    this.d[i] = c[0]; this.d[i + 1] = c[1]; this.d[i + 2] = c[2]; this.d[i + 3] = a;
  }
  get(x, y) {
    const i = (((y + S) % S) * S + ((x + S) % S)) * 4;
    return [this.d[i], this.d[i + 1], this.d[i + 2], this.d[i + 3]];
  }
  fill(c, a = 255) {
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) this.px(x, y, c, a);
  }
  rect(x0, y0, w, h, c, a = 255) {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) this.px(x, y, c, a);
  }
  // Fill with a base colour, jittering brightness per pixel.
  noisy(c, amt, rng, a = 255) {
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const v = (rng.next() * 2 - 1) * amt;
      this.px(x, y, [c[0] + v, c[1] + v, c[2] + v], a);
    }
  }
  speckle(c, count, rng, a = 255) {
    for (let i = 0; i < count; i++) this.px(rng.int(0, S - 1), rng.int(0, S - 1), c, a);
  }
  // Multiply brightness of a pixel
  mul(x, y, f) {
    const p = this.get(x, y);
    this.px(x, y, [p[0] * f, p[1] * f, p[2] * f], p[3]);
  }
  mulRect(x0, y0, w, h, f) {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) this.mul(x, y, f);
  }
  hline(y, x0, x1, c, a = 255) { for (let x = x0; x <= x1; x++) this.px(x, y, c, a); }
  vline(x, y0, y1, c, a = 255) { for (let y = y0; y <= y1; y++) this.px(x, y, c, a); }
  border(c, a = 255) {
    this.hline(0, 0, S - 1, c, a); this.hline(S - 1, 0, S - 1, c, a);
    this.vline(0, 0, S - 1, c, a); this.vline(S - 1, 0, S - 1, c, a);
  }
  copyFrom(t) { this.d.set(t.d); }
  flipY() {
    const o = new Uint8ClampedArray(this.d);
    for (let y = 0; y < S; y++) this.d.set(o.subarray((S - 1 - y) * S * 4, (S - y) * S * 4), y * S * 4);
  }
}

const shade = (c, f) => [c[0] * f, c[1] * f, c[2] * f];
const vary = (c, rng, amt) => { const v = (rng.next() * 2 - 1) * amt; return [c[0] + v, c[1] + v, c[2] + v]; };

// ---------------------------------------------------------------------------
// Painters. Each returns nothing; paints into the tile using the seeded rng.
// ---------------------------------------------------------------------------
const P = {};

const DIRT = [134, 96, 67];
const STONE = [125, 125, 125];
const OAK = [168, 133, 80];
const OAK_DARK = [112, 84, 48];
const SPRUCE = [114, 82, 46];
const SPRUCE_DARK = [70, 48, 26];

P.dirt = (t, r) => {
  t.noisy(DIRT, 12, r);
  t.speckle([104, 72, 48], 26, r);
  t.speckle([158, 118, 86], 16, r);
};
P.grass_top = (t, r) => {
  t.noisy([109, 170, 66], 13, r);
  t.speckle([88, 146, 52], 22, r);
  t.speckle([128, 190, 80], 12, r);
};
P.grass_side = (t, r) => {
  P.dirt(t, r);
  for (let x = 0; x < S; x++) {
    const h = 2 + (r.next() < 0.5 ? 1 : 0) + (r.next() < 0.25 ? 1 : 0);
    for (let y = 0; y < h; y++) t.px(x, y, vary([109, 170, 66], r, 12));
    t.px(x, h, vary([84, 138, 50], r, 8));
  }
};
P.stone = (t, r) => {
  t.noisy(STONE, 9, r);
  // a few darker crack-like clusters
  for (let i = 0; i < 6; i++) {
    let x = r.int(0, 15), y = r.int(0, 15);
    const n = r.int(2, 5);
    for (let k = 0; k < n; k++) {
      t.px(x, y, vary([100, 100, 100], r, 6));
      if (r.next() < 0.5) x = (x + 1) & 15; else y = (y + 1) & 15;
    }
  }
  t.speckle([142, 142, 142], 12, r);
};
P.smooth_stone = (t, r) => { t.noisy([158, 158, 158], 4, r); };
P.cobblestone = (t, r) => {
  // Voronoi-ish stones
  const pts = [];
  for (let i = 0; i < 9; i++) pts.push([r.next() * S, r.next() * S, 118 + r.int(-14, 16)]);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    let best = 1e9, second = 1e9, bi = 0;
    for (let i = 0; i < pts.length; i++) {
      for (let ox = -S; ox <= S; ox += S) for (let oy = -S; oy <= S; oy += S) {
        const dx = pts[i][0] + ox - x - 0.5, dy = pts[i][1] + oy - y - 0.5;
        const d = dx * dx + dy * dy;
        if (d < best) { second = best; best = d; bi = i; } else if (d < second) second = d;
      }
    }
    const edge = Math.sqrt(second) - Math.sqrt(best);
    const g = pts[bi][2] + (r.next() * 2 - 1) * 6;
    if (edge < 0.9) t.px(x, y, [78, 78, 78]);
    else if (edge < 1.7) t.px(x, y, [g * 0.86, g * 0.86, g * 0.86]);
    else t.px(x, y, [g, g, g]);
  }
};
P.sand = (t, r) => { t.noisy([219, 207, 163], 8, r); t.speckle([200, 186, 140], 14, r); };
P.gravel = (t, r) => {
  t.noisy([128, 122, 116], 10, r);
  for (let i = 0; i < 22; i++) {
    const c = vary(r.next() < 0.5 ? [150, 144, 138] : [98, 92, 88], r, 10);
    const x = r.int(0, 15), y = r.int(0, 15);
    t.px(x, y, c); if (r.next() < 0.7) t.px(x + 1, y, c); if (r.next() < 0.5) t.px(x, y + 1, c);
  }
};
P.bedrock = (t, r) => { t.noisy([70, 70, 70], 28, r); };
P.snow = (t, r) => { t.noisy([242, 246, 250], 5, r); };
P.coarse_dirt = (t, r) => { P.dirt(t, r); t.speckle([120, 118, 112], 20, r); t.speckle([90, 78, 66], 10, r); };
P.dirt_path_top = (t, r) => { t.noisy([148, 122, 76], 9, r); t.speckle([130, 104, 62], 14, r); t.speckle([166, 140, 92], 10, r); };
P.dirt_path_side = (t, r) => { P.dirt(t, r); for (let x = 0; x < S; x++) { t.px(x, 0, vary([148, 122, 76], r, 8)); t.px(x, 1, vary([140, 114, 70], r, 8)); } };
P.mud = (t, r) => {
  t.noisy([78, 62, 48], 8, r);
  for (let i = 0; i < 5; i++) {
    const x = r.int(0, 14), y = r.int(0, 14), w = r.int(2, 5), h = r.int(1, 3);
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) t.px(xx & 15, yy & 15, vary([62, 56, 54], r, 4));
  }
  t.speckle([96, 78, 60], 12, r);
};
P.farmland = (t, r) => {
  t.noisy([96, 66, 44], 8, r);
  for (let y = 1; y < S; y += 4) t.hline(y, 0, 15, [72, 48, 30]);
  t.speckle([110, 80, 56], 12, r);
};

function planks(t, r, base, dark) {
  for (let b = 0; b < 4; b++) {
    const y0 = b * 4;
    const bc = vary(base, r, 6);
    for (let y = y0; y < y0 + 4; y++) for (let x = 0; x < S; x++) t.px(x, y, vary(bc, r, 5));
    // grain streaks
    for (let k = 0; k < 3; k++) {
      const y = y0 + r.int(0, 2), x0 = r.int(0, 10), len = r.int(3, 7);
      for (let x = x0; x < x0 + len; x++) t.mul(x & 15, y, 0.9);
    }
    t.hline(y0 + 3, 0, 15, dark);
    // board end seam, offset per row
    const sx = (b * 7 + 3) & 15;
    t.vline(sx, y0, y0 + 2, dark);
  }
}
P.oak_planks = (t, r) => planks(t, r, OAK, OAK_DARK);
P.spruce_planks = (t, r) => planks(t, r, SPRUCE, SPRUCE_DARK);
P.white_planks = (t, r) => planks(t, r, [228, 222, 210], [170, 162, 150]);
P.stripped_oak = (t, r) => {
  t.noisy([182, 148, 92], 6, r);
  for (let x = 0; x < S; x += r.int(2, 4)) t.vline(x, 0, 15, vary([160, 126, 74], r, 8));
};

function logSide(t, r, base, dark, light) {
  t.noisy(base, 8, r);
  for (let i = 0; i < 9; i++) {
    const x = r.int(0, 15), y0 = r.int(0, 8), len = r.int(4, 12);
    const c = r.next() < 0.6 ? dark : light;
    for (let y = y0; y < y0 + len; y++) t.px(x, y & 15, vary(c, r, 6));
  }
}
function logTop(t, r, bark, wood, ring) {
  t.noisy(bark, 8, r);
  for (let y = 1; y < S - 1; y++) for (let x = 1; x < S - 1; x++) {
    const dx = x - 7.5, dy = y - 7.5;
    const d = Math.sqrt(dx * dx + dy * dy);
    const isRing = Math.floor(d) % 2 === 0;
    t.px(x, y, vary(isRing ? ring : wood, r, 5));
  }
  t.border(bark);
  t.border(shade(bark, 0.85));
  t.rect(1, 1, 14, 14, shade(bark, 0.95));
  for (let y = 2; y < S - 2; y++) for (let x = 2; x < S - 2; x++) {
    const dx = x - 7.5, dy = y - 7.5;
    const d = Math.sqrt(dx * dx + dy * dy);
    const isRing = Math.floor(d) % 2 === 0;
    t.px(x, y, vary(isRing ? ring : wood, r, 5));
  }
}
P.oak_log = (t, r) => logSide(t, r, [104, 82, 50], [78, 60, 36], [126, 102, 66]);
P.oak_log_top = (t, r) => logTop(t, r, [104, 82, 50], [190, 154, 100], [168, 134, 84]);
P.spruce_log = (t, r) => logSide(t, r, [58, 38, 20], [42, 26, 12], [80, 56, 30]);
P.spruce_log_top = (t, r) => logTop(t, r, [58, 38, 20], [150, 112, 66], [128, 94, 54]);
P.birch_log = (t, r) => {
  t.noisy([214, 214, 208], 6, r);
  for (let i = 0; i < 10; i++) {
    const x = r.int(0, 14), y = r.int(0, 15), len = r.int(1, 3);
    for (let k = 0; k < len; k++) t.px((x + k) & 15, y, [42, 42, 40]);
    if (r.next() < 0.5) t.px((x + 1) & 15, (y + 1) & 15, [90, 90, 84]);
  }
};
P.birch_log_top = (t, r) => logTop(t, r, [214, 214, 208], [212, 196, 150], [190, 174, 130]);

function leaves(t, r, base, holes) {
  t.fill([0, 0, 0], 0);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    if (r.next() < holes) continue;
    const c = vary(base, r, 18);
    t.px(x, y, c);
  }
  t.speckle(shade(base, 0.7), 18, r);
  t.speckle(shade(base, 1.25), 10, r);
}
P.oak_leaves = (t, r) => leaves(t, r, [64, 128, 36], 0.22);
P.spruce_leaves = (t, r) => leaves(t, r, [48, 96, 48], 0.18);
P.birch_leaves = (t, r) => leaves(t, r, [122, 162, 76], 0.24);

P.glass = (t, r) => {
  t.fill([0, 0, 0], 0);
  t.border([220, 240, 250]);
  // diagonal reflections
  for (let i = 0; i < 6; i++) t.px(2 + i, 8 - i, [230, 245, 255], 200);
  for (let i = 0; i < 4; i++) t.px(9 + i, 5 - i, [230, 245, 255], 160);
  t.px(1, 1, [180, 210, 225]); t.px(14, 14, [180, 210, 225]);
};
P.bricks = (t, r) => {
  const mortar = [188, 178, 168];
  t.noisy(mortar, 6, r);
  for (let row = 0; row < 4; row++) {
    const off = row % 2 === 0 ? 0 : 4;
    for (let bx = -1; bx < 3; bx++) {
      const x0 = bx * 8 + off;
      const c = vary([152, 86, 68], r, 12);
      for (let y = row * 4; y < row * 4 + 3; y++) for (let x = x0; x < x0 + 7; x++) if (x >= 0 && x < S) t.px(x, y, vary(c, r, 5));
    }
  }
};
P.stone_bricks = (t, r) => {
  const line = [82, 82, 82];
  t.noisy([124, 124, 124], 6, r);
  for (let row = 0; row < 2; row++) {
    const off = row === 0 ? 0 : 8;
    for (let bx = -1; bx < 2; bx++) {
      const x0 = bx * 16 + off;
      for (let half = 0; half < 2; half++) {
        const xs = x0 + half * 8;
        const c = vary([126, 126, 126], r, 8);
        for (let y = row * 8; y < row * 8 + 7; y++) for (let x = xs; x < xs + 7; x++) if (x >= 0 && x < S) t.px(x, y, vary(c, r, 5));
      }
    }
    t.hline(row * 8 + 7, 0, 15, line);
    t.vline((off + 7) & 15, row * 8, row * 8 + 6, line);
    t.vline((off + 15) & 15, row * 8, row * 8 + 6, line);
  }
};
P.plaster = (t, r) => { t.noisy([222, 208, 182], 5, r); t.speckle([206, 192, 166], 12, r); };
P.sandstone_top = (t, r) => { t.noisy([222, 208, 164], 5, r); };
P.sandstone_side = (t, r) => {
  t.noisy([214, 200, 156], 5, r);
  t.hline(0, 0, 15, [230, 218, 176]); t.hline(15, 0, 15, [196, 180, 136]);
  for (let i = 0; i < 4; i++) { const y = r.int(3, 12); t.hline(y, r.int(0, 6), r.int(8, 15), [198, 182, 138]); }
};
P.water = (t, r) => {
  t.noisy([54, 108, 220], 10, r, 190);
  for (let i = 0; i < 5; i++) { const y = r.int(0, 15), x0 = r.int(0, 8); t.hline(y, x0, x0 + r.int(2, 6), [96, 148, 240], 200); }
};
P.lantern = (t, r) => {
  t.fill([255, 214, 120]);
  t.noisy([255, 210, 110], 8, r);
  t.rect(4, 4, 8, 8, [255, 240, 190]);
  t.border([48, 40, 36]);
  t.hline(7, 0, 15, [56, 48, 44]); t.vline(7, 0, 15, [56, 48, 44]);
  t.hline(1, 0, 15, [72, 62, 58]); t.hline(14, 0, 15, [72, 62, 58]);
};
P.torch = (t, r) => {
  // occupies rows 6..15 so a 10/16-tall box crops exactly onto the torch
  t.fill([0, 0, 0], 0);
  t.rect(7, 8, 2, 8, [140, 108, 60]);
  for (let y = 8; y < 16; y++) t.px(8, y, vary([120, 92, 50], r, 8));
  t.rect(7, 6, 2, 2, [255, 200, 60]);
  t.px(7, 6, [255, 240, 150]); t.px(8, 7, [255, 160, 40]);
};
P.rail = (t, r) => {
  t.fill([0, 0, 0], 0);
  for (let y = 1; y < S; y += 5) { for (let x = 0; x < S; x++) t.px(x, y, vary([110, 82, 48], r, 8)); for (let x = 0; x < S; x++) t.px(x, y + 1, vary([96, 70, 40], r, 8)); }
  t.vline(3, 0, 15, [150, 150, 150]); t.vline(4, 0, 15, [110, 110, 110]);
  t.vline(11, 0, 15, [150, 150, 150]); t.vline(12, 0, 15, [110, 110, 110]);
};
P.barrel_side = (t, r) => {
  for (let x = 0; x < S; x++) { const c = vary([118, 86, 50], r, 8); for (let y = 0; y < S; y++) t.px(x, y, vary(c, r, 4)); }
  for (const x of [3, 7, 11, 15]) t.vline(x, 0, 15, [80, 56, 30]);
  t.hline(2, 0, 15, [70, 70, 72]); t.hline(3, 0, 15, [96, 96, 100]);
  t.hline(12, 0, 15, [70, 70, 72]); t.hline(13, 0, 15, [96, 96, 100]);
};
P.barrel_top = (t, r) => {
  t.noisy([130, 98, 58], 7, r);
  for (let y = 0; y < S; y += 3) t.hline(y, 0, 15, [90, 64, 34]);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const dx = x - 7.5, dy = y - 7.5, d = Math.sqrt(dx * dx + dy * dy);
    if (d > 7.6) t.px(x, y, [70, 70, 72]); else if (d > 6.6) t.px(x, y, [96, 96, 100]);
  }
};
P.crate = (t, r) => {
  planks(t, r, [176, 140, 84], [120, 90, 50]);
  t.border([110, 82, 46]); t.rect(1, 1, 14, 14, [0, 0, 0], 0);
  planks(t, r, [176, 140, 84], [120, 90, 50]);
  t.border([110, 82, 46]);
  for (let i = 0; i < S; i++) { t.px(i, i, [120, 90, 50]); t.px(15 - i, i, [120, 90, 50]); }
  t.mulRect(1, 1, 14, 1, 0.9);
};
P.hay_side = (t, r) => {
  for (let x = 0; x < S; x++) { const c = vary([204, 170, 62], r, 22); for (let y = 0; y < S; y++) t.px(x, y, vary(c, r, 8)); }
  t.hline(4, 0, 15, [140, 106, 40]); t.hline(11, 0, 15, [140, 106, 40]);
};
P.hay_top = (t, r) => {
  t.noisy([206, 174, 66], 14, r);
  for (let i = 0; i < 40; i++) t.px(r.int(0, 15), r.int(0, 15), [150, 118, 40]);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { const dx = x - 7.5, dy = y - 7.5; const d = Math.sqrt(dx * dx + dy * dy); if (d > 6.2 && d < 7.4) t.px(x, y, [140, 106, 40]); }
};
P.shelf = (t, r) => {
  planks(t, r, SPRUCE, SPRUCE_DARK);
  t.rect(1, 1, 14, 6, [40, 30, 22]); t.rect(1, 9, 14, 6, [40, 30, 22]);
  const cols = [[60, 130, 70], [150, 90, 40], [190, 150, 60], [120, 60, 50], [200, 200, 220]];
  for (let shelfRow = 0; shelfRow < 2; shelfRow++) {
    const y0 = shelfRow === 0 ? 1 : 9;
    for (let x = 2; x < 14; x += 2) {
      if (r.next() < 0.2) continue;
      const c = r.pick(cols);
      t.vline(x, y0 + 2, y0 + 5, c); t.px(x, y0 + 1, shade(c, 0.7));
    }
  }
};
P.bookshelf = (t, r) => {
  planks(t, r, OAK, OAK_DARK);
  t.rect(1, 1, 14, 6, [50, 40, 30]); t.rect(1, 9, 14, 6, [50, 40, 30]);
  const cols = [[170, 40, 40], [40, 80, 160], [50, 120, 60], [200, 170, 80], [120, 60, 120], [220, 220, 200]];
  for (let shelfRow = 0; shelfRow < 2; shelfRow++) {
    const y0 = shelfRow === 0 ? 1 : 9;
    let x = 1;
    while (x < 15) { const w = r.int(1, 2); const c = r.pick(cols); for (let xx = x; xx < Math.min(x + w, 15); xx++) t.vline(xx, y0 + r.int(0, 1), y0 + 5, c); x += w; }
  }
};
P.iron_bars = (t, r) => {
  t.fill([0, 0, 0], 0);
  for (const x of [1, 5, 9, 13]) { t.vline(x, 0, 15, [128, 128, 130]); t.vline(x + 1, 0, 15, [92, 92, 96]); }
  t.hline(0, 0, 15, [110, 110, 112]); t.hline(15, 0, 15, [110, 110, 112]);
};
P.oak_door_top = (t, r) => {
  planks(t, r, OAK, OAK_DARK);
  t.rect(1, 0, 14, 16, vary(OAK, r, 4));
  t.vline(0, 0, 15, OAK_DARK); t.vline(15, 0, 15, OAK_DARK);
  t.rect(3, 3, 4, 6, [170, 220, 240]); t.rect(9, 3, 4, 6, [170, 220, 240]);
  t.rect(2, 2, 6, 8, OAK_DARK); t.rect(3, 3, 4, 6, [170, 220, 240]);
  t.rect(8, 2, 6, 8, OAK_DARK); t.rect(9, 3, 4, 6, [170, 220, 240]);
  t.hline(12, 2, 13, OAK_DARK);
};
P.oak_door_bottom = (t, r) => {
  t.rect(0, 0, 16, 16, vary(OAK, r, 4));
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) t.mul(x, y, 0.94 + r.next() * 0.1);
  t.vline(0, 0, 15, OAK_DARK); t.vline(15, 0, 15, OAK_DARK);
  t.rect(2, 2, 12, 11, OAK_DARK); t.rect(3, 3, 10, 9, vary(OAK, r, 4));
  t.px(13, 6, [180, 180, 190]);
};
P.saloon_door = (t, r) => {
  t.fill([0, 0, 0], 0);
  t.rect(0, 2, 16, 14, vary(SPRUCE, r, 4));
  t.vline(0, 2, 15, SPRUCE_DARK); t.vline(15, 2, 15, SPRUCE_DARK); t.hline(2, 0, 15, SPRUCE_DARK); t.hline(15, 0, 15, SPRUCE_DARK);
  for (let y = 4; y < 14; y += 2) t.hline(y, 2, 13, SPRUCE_DARK);
};
P.sign = (t, r) => {
  t.noisy([198, 162, 100], 5, r);
  t.border([120, 90, 50]);
  for (let y = 4; y < 12; y += 4) t.hline(y, 1, 14, [186, 150, 90]);
};
P.bed_head_top = (t, r) => {
  t.noisy([176, 42, 42], 5, r);
  t.rect(1, 1, 14, 6, [240, 240, 240]); t.rect(2, 2, 12, 4, [225, 225, 228]);
  t.hline(15, 0, 15, [130, 30, 30]);
};
P.bed_foot_top = (t, r) => {
  t.noisy([176, 42, 42], 5, r);
  t.hline(0, 0, 15, [130, 30, 30]);
  t.rect(1, 12, 14, 3, [150, 36, 36]);
};
P.bed_side = (t, r) => {
  planks(t, r, OAK, OAK_DARK);
  t.rect(0, 0, 16, 9, [176, 42, 42]); t.hline(9, 0, 15, [130, 30, 30]);
  t.hline(0, 0, 15, [196, 60, 60]);
};
P.bed_end_head = (t, r) => {
  planks(t, r, OAK, OAK_DARK);
  t.rect(0, 0, 16, 9, [176, 42, 42]); t.rect(2, 2, 12, 5, [240, 240, 240]);
};
P.wool_white = (t, r) => { t.noisy([236, 236, 236], 8, r); for (let y = 0; y < S; y += 2) for (let x = 0; x < S; x += 2) t.mul(x + (y % 4 === 0 ? 0 : 1), y, 0.94); };
P.wool_red = (t, r) => { t.noisy([176, 46, 38], 8, r); for (let y = 0; y < S; y += 2) for (let x = 0; x < S; x += 2) t.mul(x + (y % 4 === 0 ? 0 : 1), y, 0.92); };
P.wool_blue = (t, r) => { t.noisy([52, 76, 168], 8, r); for (let y = 0; y < S; y += 2) for (let x = 0; x < S; x += 2) t.mul(x + (y % 4 === 0 ? 0 : 1), y, 0.92); };
P.wool_green = (t, r) => { t.noisy([84, 118, 44], 8, r); for (let y = 0; y < S; y += 2) for (let x = 0; x < S; x += 2) t.mul(x + (y % 4 === 0 ? 0 : 1), y, 0.92); };
P.cactus_side = (t, r) => {
  t.noisy([86, 136, 52], 8, r);
  for (const x of [2, 5, 9, 13]) t.vline(x, 0, 15, [60, 104, 40]);
  for (let i = 0; i < 8; i++) t.px(r.int(0, 15), r.int(0, 15), [200, 210, 160]);
};
P.cactus_top = (t, r) => { t.noisy([96, 148, 60], 8, r); t.border([76, 120, 46]); t.rect(6, 6, 4, 4, [110, 164, 70]); };
P.dead_bush = (t, r) => {
  t.fill([0, 0, 0], 0);
  const c = [118, 86, 48];
  t.vline(7, 8, 15, c); t.vline(8, 10, 15, c);
  for (let i = 0; i < 6; i++) t.px(7 - i, 9 - i + (i > 3 ? 1 : 0), c);
  for (let i = 0; i < 6; i++) t.px(8 + i, 9 - i, c);
  for (let i = 0; i < 4; i++) { t.px(4 - i, 6 - i, c); t.px(11 + i, 5 - i, c); }
  t.px(7, 4, c); t.px(7, 3, c); t.px(6, 2, c);
};
P.tall_grass = (t, r) => {
  t.fill([0, 0, 0], 0);
  for (let i = 0; i < 9; i++) {
    const x = r.int(1, 14), h = r.int(6, 13);
    const c = vary([96, 160, 56], r, 20);
    for (let y = 15; y > 15 - h; y--) t.px(x + (y < 15 - h + 3 ? (i % 2 ? 1 : -1) : 0), y, c);
  }
};
P.wheat = (t, r) => {
  t.fill([0, 0, 0], 0);
  for (let i = 0; i < 7; i++) {
    const x = 1 + i * 2 + r.int(0, 1);
    for (let y = 15; y > 3; y--) t.px(x, y, vary([150, 160, 60], r, 12));
    t.rect(x - 1, 2, 2, 5, vary([214, 186, 70], r, 12));
  }
};
P.dandelion = (t, r) => {
  t.fill([0, 0, 0], 0);
  t.vline(7, 8, 15, [70, 130, 40]); t.px(6, 12, [70, 130, 40]); t.px(9, 11, [70, 130, 40]); t.px(10, 10, [70, 130, 40]);
  t.rect(5, 4, 5, 5, [244, 214, 60]); t.rect(6, 3, 3, 7, [244, 214, 60]); t.rect(4, 5, 7, 3, [244, 214, 60]);
  t.rect(6, 5, 3, 3, [255, 236, 120]);
};
P.poppy = (t, r) => {
  t.fill([0, 0, 0], 0);
  t.vline(7, 8, 15, [70, 130, 40]); t.px(5, 13, [70, 130, 40]); t.px(6, 12, [70, 130, 40]); t.px(9, 11, [70, 130, 40]);
  t.rect(5, 3, 5, 5, [210, 40, 40]); t.rect(4, 4, 7, 3, [210, 40, 40]); t.rect(6, 2, 3, 7, [210, 40, 40]);
  t.rect(6, 4, 3, 2, [40, 30, 30]); t.px(5, 3, [240, 80, 70]);
};
P.piano_side = (t, r) => { t.noisy([34, 30, 32], 4, r); t.border([52, 46, 48]); t.hline(3, 1, 14, [60, 54, 56]); };
P.piano_top = (t, r) => { t.noisy([36, 32, 34], 4, r); t.border([54, 48, 50]); for (let i = 0; i < 6; i++) t.px(3 + i, 9 - i, [90, 84, 88]); };
P.piano_front = (t, r) => {
  P.piano_side(t, r);
  t.rect(1, 7, 14, 4, [236, 232, 220]);
  for (let x = 2; x < 15; x += 2) t.vline(x, 7, 10, [200, 196, 186]);
  for (let x = 2; x < 15; x += 2) if ((x / 2) % 7 !== 3 && (x / 2) % 7 !== 0) t.vline(x, 7, 8, [20, 20, 20]);
  t.hline(11, 1, 14, [90, 60, 40]);
};
P.furnace_side = (t, r) => { P.cobblestone(t, r); };
P.furnace_front = (t, r) => {
  P.cobblestone(t, r);
  t.rect(3, 4, 10, 9, [28, 24, 22]);
  t.rect(4, 8, 8, 4, [240, 120, 30]); t.rect(5, 9, 6, 3, [255, 190, 60]);
  t.px(4, 7, [240, 120, 30]); t.px(8, 6, [255, 200, 80]); t.px(11, 7, [240, 120, 30]); t.px(6, 6, [255, 160, 40]);
  t.hline(13, 3, 12, [60, 56, 54]);
};
P.anvil = (t, r) => { t.noisy([66, 66, 70], 6, r); t.border([50, 50, 54]); };
P.anvil_top = (t, r) => { t.noisy([84, 84, 90], 5, r); t.border([60, 60, 64]); };
P.iron_block = (t, r) => { t.noisy([216, 216, 218], 5, r); t.border([170, 170, 172]); t.hline(1, 1, 14, [236, 236, 238]); t.vline(1, 1, 14, [236, 236, 238]); };
P.gold_block = (t, r) => { t.noisy([248, 212, 66], 6, r); t.border([190, 150, 40]); t.hline(1, 1, 14, [255, 240, 150]); t.vline(1, 1, 14, [255, 240, 150]); };
P.chest_side = (t, r) => { planks(t, r, [150, 110, 60], [90, 62, 32]); t.border([70, 50, 28]); t.hline(5, 0, 15, [70, 50, 28]); };
P.chest_front = (t, r) => { P.chest_side(t, r); t.rect(7, 4, 2, 4, [110, 110, 112]); t.px(7, 5, [170, 170, 172]); };
P.chest_top = (t, r) => { planks(t, r, [150, 110, 60], [90, 62, 32]); t.border([70, 50, 28]); };
P.gravestone = (t, r) => {
  t.fill([0, 0, 0], 0);
  t.rect(2, 3, 12, 13, [138, 138, 134]); t.rect(3, 1, 10, 2, [138, 138, 134]); t.rect(4, 0, 8, 1, [138, 138, 134]);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) if (t.get(x, y)[3] > 0) t.mul(x, y, 0.92 + r.next() * 0.12);
  t.vline(7, 3, 9, [92, 92, 90]); t.vline(8, 3, 9, [92, 92, 90]); t.hline(5, 5, 10, [92, 92, 90]);
  t.hline(12, 4, 11, [110, 110, 108]);
};
P.stone_ore = (t, r, col, count = 9) => {
  P.stone(t, r);
  for (let i = 0; i < count; i++) {
    const x = r.int(1, 14), y = r.int(1, 14);
    t.px(x, y, col); t.px(x + (r.next() < 0.5 ? 1 : -1), y, shade(col, 0.85)); if (r.next() < 0.5) t.px(x, y + 1, shade(col, 0.9));
  }
};
P.coal_ore = (t, r) => P.stone_ore(t, r, [28, 28, 28], 9);
P.iron_ore = (t, r) => P.stone_ore(t, r, [216, 176, 150], 8);
P.gold_ore = (t, r) => P.stone_ore(t, r, [250, 232, 80], 7);
P.pumpkin_side = (t, r) => { t.noisy([214, 122, 24], 8, r); for (const x of [3, 8, 13]) t.vline(x, 0, 15, [170, 92, 16]); };
P.pumpkin_top = (t, r) => { t.noisy([214, 122, 24], 8, r); t.rect(6, 6, 4, 4, [110, 80, 30]); t.rect(7, 7, 2, 2, [90, 110, 40]); };
P.trough = (t, r) => { planks(t, r, SPRUCE, SPRUCE_DARK); t.rect(2, 2, 12, 12, [58, 112, 216]); };
P.scorched_stone = (t, r) => {
  t.noisy([58, 54, 52], 9, r);
  for (let i = 0; i < 5; i++) { let x = r.int(0, 15), y = r.int(0, 15); for (let k = 0; k < r.int(3, 7); k++) { t.px(x, y, r.next() < 0.6 ? [150, 60, 20] : [90, 40, 20]); if (r.next() < 0.5) x = (x + 1) & 15; else y = (y + 1) & 15; } }
  t.speckle([30, 28, 26], 14, r);
};
P.ash = (t, r) => { t.noisy([112, 108, 104], 9, r); t.speckle([80, 76, 72], 20, r); t.speckle([140, 136, 130], 10, r); };
P.magma = (t, r) => {
  t.noisy([38, 22, 14], 8, r);
  for (let i = 0; i < 6; i++) { let x = r.int(0, 15), y = r.int(0, 15); for (let k = 0; k < r.int(4, 9); k++) { t.px(x, y, [255, 140 + r.int(0, 60), 30]); if (r.next() < 0.3) t.px((x + 1) & 15, y, [255, 200, 90]); if (r.next() < 0.5) x = (x + 1) & 15; else y = (y + 1) & 15; } }
};
P.charred_planks = (t, r) => { planks(t, r, [52, 44, 38], [28, 22, 18]); t.speckle([20, 16, 14], 24, r); t.speckle([120, 60, 20], 4, r); };
// ---- Star Wars palette: pixel-art metal, panels and lights
function panelBase(t, r, c, amt, groove) {
  t.noisy(c, amt, r);
  t.hline(0, 0, 15, groove); t.vline(0, 0, 15, groove);
  t.hline(15, 0, 15, [Math.min(255, c[0] + 18), Math.min(255, c[1] + 18), Math.min(255, c[2] + 20)]); t.vline(15, 0, 15, [Math.min(255, c[0] + 12), Math.min(255, c[1] + 12), Math.min(255, c[2] + 14)]);
}
P.durasteel = (t, r) => { panelBase(t, r, [150, 154, 160], 6, [96, 100, 108]); t.hline(8, 1, 14, [128, 132, 138]); for (const [x, y] of [[3, 3], [12, 3], [3, 12], [12, 12]]) t.px(x, y, [104, 108, 114]); };
P.durasteel_dark = (t, r) => { panelBase(t, r, [78, 82, 90], 5, [44, 46, 52]); t.vline(8, 1, 14, [66, 70, 78]); for (const [x, y] of [[3, 3], [12, 3], [3, 12], [12, 12]]) t.px(x, y, [110, 114, 122]); };
P.panel_black = (t, r) => { panelBase(t, r, [30, 31, 36], 3, [12, 12, 16]); t.hline(7, 2, 13, [42, 44, 50]); };
P.panel_red = (t, r) => { panelBase(t, r, [150, 34, 30], 8, [80, 16, 14]); t.hline(8, 1, 14, [120, 26, 24]); };
P.panel_stripe = (t, r) => { panelBase(t, r, [78, 82, 90], 5, [44, 46, 52]); t.rect(0, 6, 16, 4, [176, 40, 34]); t.hline(6, 0, 15, [120, 26, 24]); t.hline(9, 0, 15, [120, 26, 24]); };
P.glow_panel = (t, r) => { t.noisy([240, 244, 250], 4, r); t.border([200, 206, 216]); };
P.glow_panel_blue = (t, r) => { t.noisy([110, 190, 255], 8, r); t.border([60, 120, 200]); t.rect(6, 6, 4, 4, [200, 236, 255]); };
// neon tubes: a dark housing with a bright saturated tube across the middle and a soft halo either side
P.neon_pink = (t, r) => { t.fill([30, 14, 30]); t.rect(1, 5, 14, 6, [120, 30, 90]); t.rect(1, 6, 14, 4, [255, 70, 200]); t.rect(2, 7, 12, 2, [255, 190, 240]); t.border([50, 24, 50]); };
P.neon_green = (t, r) => { t.fill([12, 30, 22]); t.rect(1, 5, 14, 6, [30, 120, 70]); t.rect(1, 6, 14, 4, [70, 255, 150]); t.rect(2, 7, 12, 2, [200, 255, 220]); t.border([24, 50, 36]); };
P.holo_sign = (t, r) => { t.fill([20, 24, 40]); for (let y = 2; y < 14; y += 3) t.hline(y, 2, 13, r.next() < 0.5 ? [60, 220, 255] : [255, 80, 220]); t.speckle([255, 255, 255], 6, r); t.border([40, 60, 90]); };
P.console_top = (t, r) => { t.noisy([40, 42, 48], 4, r); for (let x = 2; x < 14; x += 3) for (let y = 2; y < 14; y += 3) t.px(x, y, [[60, 220, 120], [255, 60, 60], [80, 160, 255], [255, 200, 60]][r.int(0, 3)]); t.rect(2, 9, 12, 4, [30, 80, 120]); t.hline(10, 3, 12, [90, 200, 240]); t.border([70, 74, 82]); };
P.console_side = (t, r) => { panelBase(t, r, [60, 63, 70], 4, [34, 36, 40]); t.rect(3, 4, 10, 3, [20, 60, 90]); t.px(5, 5, [80, 220, 120]); t.px(9, 5, [255, 80, 60]); };
P.vent = (t, r) => { t.noisy([70, 74, 80], 4, r); for (let y = 2; y < 15; y += 3) t.hline(y, 1, 14, [24, 26, 30]); t.border([56, 60, 66]); };
P.deck_plate = (t, r) => { t.noisy([64, 67, 74], 5, r); t.hline(7, 0, 15, [40, 42, 48]); t.vline(7, 0, 15, [40, 42, 48]); for (const [x, y] of [[2, 2], [12, 2], [2, 12], [12, 12], [5, 9], [10, 5]]) t.px(x, y, [96, 100, 108]); };
P.steel_glass = (t, r) => { t.fill([112, 150, 192], 90); t.border([126, 164, 206], 200); t.px(3, 3, [220, 235, 255], 200); t.px(4, 4, [220, 235, 255], 160); };
P.chrome = (t, r) => { t.noisy([196, 202, 212], 5, r); t.hline(3, 0, 15, [230, 236, 244]); t.hline(11, 0, 15, [150, 156, 166]); t.border([170, 176, 186]); };
P.window_lit = (t, r) => { t.fill([36, 40, 52]); t.rect(2, 2, 5, 5, [255, 214, 140]); t.rect(9, 2, 5, 5, r.next() < 0.7 ? [255, 226, 160] : [60, 70, 90]); t.rect(2, 9, 5, 5, r.next() < 0.7 ? [250, 210, 130] : [50, 60, 80]); t.rect(9, 9, 5, 5, [255, 220, 150]); };
P.window_dark = (t, r) => { t.fill([36, 40, 52]); for (const [x, y] of [[2, 2], [9, 2], [2, 9], [9, 9]]) t.rect(x, y, 5, 5, [40, 60, 90]); t.px(3, 3, [90, 130, 170]); t.px(10, 10, [80, 120, 160]); };
P.city_lamp = (t, r) => { t.fill([255, 246, 220]); t.border([200, 190, 160]); t.rect(6, 6, 4, 4, [255, 255, 255]); };
P.hull_plate = (t, r) => { t.noisy([122, 126, 134], 7, r); const g = [84, 88, 96]; t.hline(0, 0, 15, g); t.vline(0, 0, 15, g); if (r.next() < 0.5) t.hline(8, 0, 15, g); if (r.next() < 0.5) t.vline(5 + r.int(0, 6), 0, 15, g); t.speckle([150, 154, 162], 6, r); t.speckle([60, 62, 70], 4, r); };
P.hull_trench = (t, r) => { t.noisy([44, 46, 52], 5, r); t.hline(5, 0, 15, [28, 30, 34]); t.hline(10, 0, 15, [28, 30, 34]); for (let x = 1; x < 16; x += 4) t.px(x, 7, [255, 200, 90]); };
// ---- Coruscant architecture v2 (rubric 18): smooth panel fields with one recessed seam on the top/left edge and a
// lit bevel bottom/right (the panelBase convention), no rivets, so a wall of them reads as a plated field with fine
// seams rather than a busy texture; the trim is a plain dark recessed groove block for seam columns and fins
P.panel_light = (t, r) => { panelBase(t, r, [170, 174, 180], 3, [134, 138, 146]); t.hline(7, 2, 13, [160, 164, 170]); };
P.panel_grey = (t, r) => { panelBase(t, r, [104, 108, 116], 3, [68, 72, 80]); t.hline(7, 2, 13, [96, 100, 108]); };
P.panel_seam = (t, r) => { panelBase(t, r, [104, 108, 116], 3, [68, 72, 80]); t.vline(7, 0, 15, [48, 50, 56]); t.vline(8, 0, 15, [58, 60, 68]); };
P.trim_dark = (t, r) => { t.noisy([38, 40, 46], 2, r); t.hline(0, 0, 15, [24, 25, 30]); t.vline(0, 0, 15, [24, 25, 30]); t.hline(15, 0, 15, [52, 54, 60]); t.vline(15, 0, 15, [48, 50, 56]); };
P.panel_bronze = (t, r) => { panelBase(t, r, [128, 98, 68], 5, [84, 62, 42]); t.hline(3, 1, 14, [152, 120, 86]); t.hline(11, 1, 14, [110, 84, 58]); };
P.panel_sand = (t, r) => { panelBase(t, r, [198, 184, 158], 4, [150, 136, 112]); t.hline(7, 2, 13, [188, 174, 148]); };
// horizontal light strips: a dark housing with a bright band across the middle and a soft halo either side, so a
// ring of them around a tower is a thin unbroken line of light (blue-white for ledges, warm for the bronze towers)
P.light_strip = (t, r) => { t.noisy([36, 40, 48], 2, r); t.hline(4, 0, 15, [70, 100, 140]); t.hline(11, 0, 15, [70, 100, 140]); t.rect(0, 5, 16, 6, [150, 200, 255]); t.rect(0, 6, 16, 4, [222, 240, 255]); };
// vertical strips: the same bar of light turned upright, no frame at the top or bottom, so a column of blocks is
// one continuous line of light (the strip families' night signature, references 1 and 2)
P.light_strip_v = (t, r) => { t.noisy([36, 40, 48], 2, r); t.vline(4, 0, 15, [70, 100, 140]); t.vline(11, 0, 15, [70, 100, 140]); t.rect(5, 0, 6, 16, [150, 200, 255]); t.rect(6, 0, 4, 16, [222, 240, 255]); };
P.light_strip_warm_v = (t, r) => { t.noisy([40, 36, 34], 2, r); t.vline(4, 0, 15, [130, 96, 60]); t.vline(11, 0, 15, [130, 96, 60]); t.rect(5, 0, 6, 16, [255, 206, 140]); t.rect(6, 0, 4, 16, [255, 238, 205]); };
P.light_strip_warm = (t, r) => { t.noisy([40, 36, 34], 2, r); t.hline(4, 0, 15, [130, 96, 60]); t.hline(11, 0, 15, [130, 96, 60]); t.rect(0, 5, 16, 6, [255, 206, 140]); t.rect(0, 6, 16, 4, [255, 238, 205]); };
// glazing bands: a 2-texel frame top and bottom only (no vertical frame), so a row of them is one continuous ribbon
// of glass; the lit band is warm and even (no pane grid), the dark one blue-grey glass with a reflection line.
// The lit band is a mid amber, not white: its emissive comes from texel luminance (materialMaps.js), and interior
// light seen through glass has to sit well under the light strips so a tower at night reads as vertical lines over
// dim floors (references 1, 2 and the Andor plaza), not a lattice of equally bright horizontals and verticals.
P.window_band_lit = (t, r) => { t.noisy([206, 168, 116], 5, r); t.rect(0, 0, 16, 2, [34, 38, 48]); t.rect(0, 14, 16, 2, [34, 38, 48]); t.hline(2, 0, 15, [226, 192, 140]); t.hline(13, 0, 15, [176, 140, 96]); };
P.window_band_dark = (t, r) => { t.noisy([46, 64, 94], 5, r); t.rect(0, 0, 16, 2, [34, 38, 48]); t.rect(0, 14, 16, 2, [34, 38, 48]); t.hline(3, 0, 15, [76, 108, 148]); t.hline(4, 0, 15, [62, 88, 126]); };
// tall slits: a narrow bright bar down the middle with a halo, no top/bottom frame, so a column of them is one
// unbroken narrow line of light in a dark panel
P.window_slit_lit = (t, r) => { t.noisy([40, 42, 50], 2, r); t.vline(5, 0, 15, [120, 100, 72]); t.vline(10, 0, 15, [120, 100, 72]); t.rect(6, 0, 4, 16, [255, 222, 170]); t.rect(7, 0, 2, 16, [255, 240, 210]); };
P.window_slit_dark = (t, r) => { t.noisy([40, 42, 50], 2, r); t.vline(5, 0, 15, [48, 54, 66]); t.vline(10, 0, 15, [48, 54, 66]); t.rect(6, 0, 4, 16, [46, 66, 98]); t.vline(7, 0, 15, [70, 100, 140]); };
P.missing = (t, r) => { for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) t.px(x, y, ((x >> 3) + (y >> 3)) & 1 ? [255, 0, 255] : [0, 0, 0]); };

// ---- crops (growth stages) and item icons: hand-drawn 16x16 pixel maps ('.' = transparent)
function pixmap(t, rows, pal) {
  t.fill([0, 0, 0], 0);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { const c = pal[rows[y][x]]; if (c) t.px(x, y, c); }
}
P.wheat_stage0 = (t, r) => {
  t.fill([0, 0, 0], 0);
  for (const x of [2, 5, 8, 11, 14]) { const h = 2 + r.int(0, 1); for (let y = 15; y > 15 - h; y--) t.px(x, y, vary([96, 176, 60], r, 10)); t.px(x, 15 - h, [150, 210, 90]); }
};
P.wheat_stage1 = (t, r) => {
  t.fill([0, 0, 0], 0);
  for (let i = 0; i < 7; i++) {
    const x = 1 + i * 2 + r.int(0, 1), h = 6 + r.int(0, 3);
    for (let y = 15; y > 15 - h; y--) t.px(x, y, vary([110, 172, 60], r, 12));
    t.px(x, 15 - h, [176, 184, 74]); t.px(x, 14 - h, [190, 190, 80]);
  }
};
P.item_apple = (t) => pixmap(t, [
  '................', '.......s........', '......ss........', '....ggs.........', '...rrdrrrr......', '..rrrrrrrrrr....',
  '.rwrrrrrrrrrr...', '.wwrrrrrrrrrr...', '.rwrrrrrrrrrrr..', '.rrrrrrrrrrrrr..', '.rrrrrrrrrrrrd..', '..rrrrrrrrrrdd..',
  '..drrrrrrrrddd..', '...ddrrrrddd....', '.....dddd.......', '................',
], { r: [214, 38, 38], d: [150, 22, 22], w: [250, 130, 120], s: [96, 64, 32], g: [92, 160, 52] });
P.item_bread = (t) => pixmap(t, [
  '................', '................', '..........ccc...', '.........cllcc..', '........clllDc..', '.......cllllDc..',
  '......cllllDc...', '.....cllllDc....', '....cllllDc.....', '...cllllDc......', '..cllllDc.......', '.cllllDDc.......',
  '.clllDDc........', '.ccDDDc.........', '..ccc...........', '................',
], { c: [190, 128, 58], l: [226, 174, 100], D: [148, 94, 40] });
P.item_wheat = (t, r) => {
  t.fill([0, 0, 0], 0);
  const stem = [150, 124, 52], grainA = [224, 192, 82], grainB = [192, 150, 48];
  const line = (x0, y0, x1, y1, c) => { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)); for (let k = 0; k <= n; k++) t.px(Math.round(x0 + (x1 - x0) * k / n), Math.round(y0 + (y1 - y0) * k / n), c); };
  for (const [tx, ty] of [[4, 3], [8, 1], [12, 3]]) {
    line(8, 15, tx, ty + 6, stem);
    for (let k = 0; k < 6; k++) { const y = ty + k; t.px(tx, y, k % 2 ? grainA : grainB); if (k > 0) { t.px(tx - 1, y, k % 2 ? grainB : grainA); t.px(tx + 1, y, k % 2 ? grainB : grainA); } }
    t.px(tx, ty - 1, [236, 210, 110]);
  }
  t.px(8, 15, [120, 96, 40]); t.px(7, 15, [120, 96, 40]);
};
P.item_seeds = (t) => {
  t.fill([0, 0, 0], 0);
  const g = [122, 172, 62], d = [78, 118, 38], l = [166, 206, 96];
  for (const [x, y] of [[3, 4], [8, 3], [12, 6], [5, 9], [10, 10], [7, 13], [13, 12]]) { t.px(x, y, l); t.px(x + 1, y, g); t.px(x, y + 1, g); t.px(x + 1, y + 1, g); t.px(x, y + 2, d); t.px(x + 1, y + 2, d); }
};
const MEAT_ROWS = [
  '................', '................', '....dddddd......', '...drrrrrrdd....', '..drrrrrrrrrd...', '.drrfrrrrrrrrd..',
  '.drrffrrrrrrrd..', '.drrrfffrrrrrd..', '.drrrrrfffrrrd..', '.drrrrrrrffrrd..', '..drrrrrrrrrd...', '...drrrrrrrd....',
  '....dddddd......', '................', '................', '................',
];
P.item_beef_raw = (t) => pixmap(t, MEAT_ROWS, { r: [196, 58, 58], d: [140, 28, 28], f: [244, 206, 196] });
P.item_beef_cooked = (t) => pixmap(t, MEAT_ROWS, { r: [142, 84, 44], d: [92, 50, 24], f: [204, 160, 110] });
const CHOP_ROWS = [
  '................', '................', '......pppppp....', '....pppppppppf..', '...ppppppppppff.', '..ppppppppppppf.',
  '..ppppppppppppf.', '..pppppppppppf..', '..dppppppppppf..', '..ddpppppppppf..', '..wddppppppff...', '..wwwdddddd.....',
  '...www..........', '................', '................', '................',
];
P.item_porkchop_raw = (t) => pixmap(t, CHOP_ROWS, { p: [236, 150, 150], d: [204, 104, 104], f: [250, 232, 224], w: [240, 240, 232] });
P.item_porkchop_cooked = (t) => pixmap(t, CHOP_ROWS, { p: [176, 112, 60], d: [124, 74, 36], f: [232, 204, 152], w: [236, 230, 214] });
const DRUMSTICK_ROWS = [
  '................', '............ww..', '...........wwww.', '...........wwww.', '..........dww...', '.........dcw....',
  '........dcc.....', '......ccdcc.....', '....cccccc......', '...ccccccc......', '..cccccccc......', '..ccccccc.......',
  '..dcccccd.......', '...ddddd........', '................', '................',
];
P.item_chicken_raw = (t) => pixmap(t, DRUMSTICK_ROWS, { c: [240, 206, 190], d: [206, 152, 138], w: [246, 246, 240] });
P.item_chicken_cooked = (t) => pixmap(t, DRUMSTICK_ROWS, { c: [194, 124, 64], d: [142, 82, 40], w: [232, 222, 200] });
P.item_bone = (t) => pixmap(t, [
  '................', '..........ww.w..', '.........wwwww..', '.........wwwwww.', '........wwwgww..', '.......wwwg.....',
  '......wwwg......', '.....wwwg.......', '....wwwg........', '..wwwwg.........', '.wwwwwg.........', '.wwwwww.........',
  '..ww.ww.........', '................', '................', '................',
], { w: [240, 238, 230], g: [190, 186, 176] });
P.item_leather = (t) => pixmap(t, [
  '................', '................', '....ddd..ddd....', '...dllldd.llld..', '..dllllllllllld.', '..dllhlllllllld.',
  '.dllhhlllllllld.', '.dlllllllllllld.', '.dllllllllllld..', '..dllllllllllld.', '..dlllllllllld..', '...dlllllllld...',
  '....ddlllldd....', '......dddd......', '................', '................',
], { l: [164, 104, 52], d: [112, 66, 30], h: [196, 136, 72] });
P.item_feather = (t) => pixmap(t, [
  '................', '............ww..', '...........wwww.', '..........wwwww.', '.........wwwgw..', '........wwwwg...',
  '.......wwwwg....', '......wwwwg.....', '.....wwwwg......', '....wwwwg.......', '...wwwgg........', '...wwg..........',
  '..qq............', '.qq.............', 'q...............', '................',
], { w: [246, 246, 246], g: [200, 200, 206], q: [184, 172, 150] });
P.item_stick = (t) => pixmap(t, [
  '................', '.............s..', '............ss..', '...........sd...', '..........sd....', '.........sd.....',
  '........sd......', '.......sd.......', '......sd........', '.....sd.........', '....sd..........', '...sd...........',
  '..sd............', '.sd.............', '.d..............', '................',
], { s: [134, 98, 52], d: [96, 66, 30] });

function destroyStage(t, r, stage) {
  t.fill([0, 0, 0], 0);
  const col = [30, 30, 30];
  const branches = 3 + stage;
  const len = 3 + stage * 1.6;
  for (let b = 0; b < branches; b++) {
    let x = 8 + r.int(-2, 1), y = 8 + r.int(-2, 1);
    const ang = (b / branches) * Math.PI * 2 + r.next() * 0.6;
    let dx = Math.cos(ang), dy = Math.sin(ang);
    for (let k = 0; k < len; k++) {
      t.px(Math.round(x), Math.round(y), col, 170 + stage * 8);
      x += dx; y += dy;
      dx += (r.next() - 0.5) * 0.7; dy += (r.next() - 0.5) * 0.7;
      const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
    }
  }
}

// ---------------------------------------------------------------------------
// Atlas assembly
// ---------------------------------------------------------------------------
const TILE_NAMES = [
  'missing', 'grass_top', 'grass_side', 'dirt', 'stone', 'cobblestone', 'sand', 'gravel', 'bedrock',
  'oak_log', 'oak_log_top', 'oak_leaves', 'oak_planks', 'glass', 'bricks', 'water',
  'tall_grass', 'dandelion', 'poppy', 'spruce_log', 'spruce_log_top', 'spruce_planks', 'spruce_leaves',
  'birch_log', 'birch_log_top', 'birch_leaves', 'dirt_path_top', 'dirt_path_side', 'mud', 'stone_bricks',
  'sandstone_top', 'sandstone_side', 'lantern', 'torch', 'rail', 'barrel_side', 'barrel_top', 'crate',
  'hay_side', 'hay_top', 'shelf', 'bookshelf', 'iron_bars', 'oak_door_top', 'oak_door_bottom', 'saloon_door',
  'sign', 'bed_head_top', 'bed_foot_top', 'bed_side', 'bed_end_head', 'wool_white', 'wool_red', 'wool_blue', 'wool_green',
  'cactus_side', 'cactus_top', 'dead_bush', 'wheat', 'piano_side', 'piano_top', 'piano_front',
  'furnace_side', 'furnace_front', 'anvil', 'anvil_top', 'iron_block', 'gold_block', 'chest_side', 'chest_front', 'chest_top',
  'gravestone', 'coarse_dirt', 'farmland', 'smooth_stone', 'plaster', 'white_planks', 'stripped_oak', 'snow',
  'coal_ore', 'iron_ore', 'gold_ore', 'pumpkin_side', 'pumpkin_top', 'trough',
  'scorched_stone', 'ash', 'magma', 'charred_planks',
  'durasteel', 'durasteel_dark', 'panel_black', 'panel_red', 'panel_stripe', 'glow_panel', 'glow_panel_blue', 'holo_sign',
  'console_top', 'console_side', 'vent', 'deck_plate', 'steel_glass', 'chrome', 'window_lit', 'window_dark', 'city_lamp',
  'hull_plate', 'hull_trench',
  // gameplay: crop stages + item icons (appended; existing indices are unchanged)
  'wheat_stage0', 'wheat_stage1',
  'item_apple', 'item_bread', 'item_wheat', 'item_seeds', 'item_beef_raw', 'item_beef_cooked', 'item_porkchop_raw', 'item_porkchop_cooked',
  'item_chicken_raw', 'item_chicken_cooked', 'item_bone', 'item_leather', 'item_feather', 'item_stick',
  'neon_pink', 'neon_green',
  // Coruscant architecture v2 (appended)
  'panel_light', 'panel_grey', 'panel_seam', 'trim_dark', 'panel_bronze', 'panel_sand', 'light_strip', 'light_strip_warm',
  'window_band_lit', 'window_band_dark', 'window_slit_lit', 'window_slit_dark', 'light_strip_v', 'light_strip_warm_v',
];
export const ITEM_TILE_NAMES = TILE_NAMES.filter((n) => n.startsWith('item_'));

export const TILES = {};
let nextTile = 0;
const tiles = []; // Tile objects by index
const tileNames = []; // tile name by index (drives the material class of the HD refinement)

function addTile(name, painter, seed) {
  const t = new Tile();
  painter(t, new RNG(seed));
  tiles.push(t);
  tileNames.push(name);
  TILES[name] = nextTile;
  return nextTile++;
}

export function buildAtlas() {
  TILE_NAMES.forEach((name, i) => addTile(name, P[name], 1000 + i * 7919));
  for (let s = 0; s < 10; s++) addTile('destroy_' + s, (t, r) => destroyStage(t, r, s), 5000 + s);
  return finalizeAtlas();
}

// Paints one base (16x16) tile by name without registering it (tooling / tests). Returns ImageData-like data.
export function paintBaseTile(name, seed = null) {
  const i = TILE_NAMES.indexOf(name);
  const t = new Tile();
  if (name.startsWith('destroy_')) destroyStage(t, new RNG(5000 + parseInt(name.slice(8), 10)), parseInt(name.slice(8), 10));
  else if (P[name]) P[name](t, new RNG(seed ?? (1000 + Math.max(i, 0) * 7919)));
  else P.missing(t, new RNG(1));
  return { width: S, height: S, data: t.d };
}
export { TILE_NAMES };

// Adds a row of sign tiles containing `text` (uppercase) rendered across `count` tiles.
// Returns array of tile indices.
export function addSignTiles(text, count) {
  const key = 'sign:' + text + ':' + count;
  if (TILES[key]) return TILES[key];
  const w = count * S;
  const buf = new Uint8ClampedArray(w * S * 4);
  // sign background board
  const r = new RNG(77);
  for (let y = 0; y < S; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    const v = (r.next() * 2 - 1) * 5;
    let c = [198 + v, 162 + v, 100 + v];
    if (y === 0 || y === S - 1 || x === 0 || x === w - 1) c = [120, 90, 50];
    buf[i] = c[0]; buf[i + 1] = c[1]; buf[i + 2] = c[2]; buf[i + 3] = 255;
  }
  drawSmallText(buf, w, S, text, [40, 26, 14]);
  const indices = [];
  for (let k = 0; k < count; k++) {
    const t = new Tile();
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const i = (y * w + x + k * S) * 4;
      t.px(x, y, [buf[i], buf[i + 1], buf[i + 2]], buf[i + 3]);
    }
    tiles.push(t);
    tileNames.push(key);
    indices.push(nextTile++);
  }
  TILES[key] = indices;
  return indices;
}

// ---------------------------------------------------------------------------
// HD atlases: colour, tangent-space normal and material (roughness / metalness / emissive), TILE_PX per tile,
// each with a per-tile mip chain (tiles never bleed into each other). `?hd=0` keeps the plain 16x16 look.
// ---------------------------------------------------------------------------
export let atlasCanvas = null;
export let atlasTexture = null;
export let atlasNormalCanvas = null;
export let atlasNormalTexture = null;
export let atlasMaterialCanvas = null;
export let atlasMaterialTexture = null;
export const HD_ENABLED = !(typeof location !== 'undefined' && /[?&]hd=0(&|$)/.test(location.search));
// Cumulative build cost (ms) of every finalizeAtlas() call at load: refinement, mip assembly, texture/canvas upload.
export const atlasBuildStats = { totalMs: 0, refineMs: 0, assembleMs: 0, uploadMs: 0, tiles: 0, builds: 0, atlasPx: ATLAS_TILES * TILE_PX };

const hdTiles = []; // refined maps by tile index (cached: a rebuild only refines new tiles)
const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

function ensureHD(i) {
  let hd = hdTiles[i];
  if (!hd) {
    hd = hdTiles[i] = buildTileMaps({ width: S, height: S, data: tiles[i].d }, tileNames[i], { plain: !HD_ENABLED });
    atlasBuildStats.tiles++;
  }
  return hd;
}

function makeAtlasTexture(levels, size, colorSpace) {
  const tex = new THREE.DataTexture(levels[0].data, size, size, THREE.RGBAFormat);
  tex.mipmaps = levels;
  tex.generateMipmaps = false;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestMipmapLinearFilter;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.colorSpace = colorSpace;
  tex.flipY = false;
  tex.needsUpdate = true;
  return tex;
}

function canvasFrom(level0, size) {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(size, size);
  img.data.set(level0);
  ctx.putImageData(img, 0, 0);
  return canvas;
}

// Builds/rebuilds the three atlas textures (+ canvases) from all registered tiles.
export function finalizeAtlas() {
  const t0 = now();
  for (let i = 0; i < tiles.length; i++) ensureHD(i);
  const t1 = now();
  const HS = TILE_PX, size = ATLAS_TILES * HS;
  const levelCount = Math.log2(HS) + 1; // 64 .. 1 texel per tile
  const maps = ['color', 'normal', 'material'];
  const levels = {};
  for (const m of maps) {
    levels[m] = [];
    for (let l = 0; l < levelCount; l++) { const ls = size >> l; levels[m].push({ data: new Uint8Array(ls * ls * 4), width: ls, height: ls }); }
  }
  for (let i = 0; i < tiles.length; i++) {
    const hd = hdTiles[i];
    const tx = i % ATLAS_TILES, ty = Math.floor(i / ATLAS_TILES);
    for (const m of maps) {
      const chain = hd.mips[m];
      for (let l = 0; l < levelCount; l++) {
        const ts = HS >> l, ls = size >> l, src = chain[l].data, dst = levels[m][l].data;
        const ox = tx * ts, oy = ty * ts;
        for (let y = 0; y < ts; y++) dst.set(src.subarray(y * ts * 4, (y + 1) * ts * 4), ((oy + y) * ls + ox) * 4);
      }
    }
  }
  const t2 = now();
  atlasCanvas = canvasFrom(levels.color[0].data, size);
  atlasNormalCanvas = canvasFrom(levels.normal[0].data, size);
  atlasMaterialCanvas = canvasFrom(levels.material[0].data, size);
  if (atlasTexture) atlasTexture.dispose();
  if (atlasNormalTexture) atlasNormalTexture.dispose();
  if (atlasMaterialTexture) atlasMaterialTexture.dispose();
  atlasTexture = makeAtlasTexture(levels.color, size, THREE.NoColorSpace);
  atlasNormalTexture = makeAtlasTexture(levels.normal, size, THREE.NoColorSpace);
  atlasMaterialTexture = makeAtlasTexture(levels.material, size, THREE.NoColorSpace);
  setMaterialMaps(atlasNormalTexture, atlasMaterialTexture);
  const t3 = now();
  atlasBuildStats.refineMs += t1 - t0; atlasBuildStats.assembleMs += t2 - t1; atlasBuildStats.uploadMs += t3 - t2; atlasBuildStats.totalMs += t3 - t0;
  atlasBuildStats.builds++;
  if (atlasBuildStats.builds === 1) {
    console.info(`[textures] HD atlases (${size}x${size} colour + normal + material, ${levelCount} mip levels, ${tiles.length} tiles${HD_ENABLED ? '' : ', hd=0'}) built in ${(t3 - t0).toFixed(1)} ms (refine ${(t1 - t0).toFixed(1)}, assemble ${(t2 - t1).toFixed(1)}, upload ${(t3 - t2).toFixed(1)})`);
  }
  return atlasTexture;
}

export function tileUV(index) {
  const tx = index % ATLAS_TILES, ty = Math.floor(index / ATLAS_TILES);
  const s = 1 / ATLAS_TILES;
  return [tx * s, ty * s, s];
}

// Returns the RGBA pixel array (TILE_PX x TILE_PX) of one refined tile (HUD icons, particles).
export function tilePixels(index) {
  const i = tiles[index] ? index : 0;
  return ensureHD(i).color;
}

// Returns the painted BASE_PX x BASE_PX pixel array of one tile (the pre-refinement pixel art).
export function tileBasePixels(index) {
  return tiles[index] ? tiles[index].d : tiles[0].d;
}

// Name of a registered tile by index (sign tiles report their 'sign:TEXT:n' key).
export function tileName(index) {
  return tileNames[index] || null;
}

// Refined maps of one registered tile: { color, normal, material, height, cls, mips }.
export function tileMaps(index) {
  return tiles[index] ? ensureHD(index) : null;
}

export function tileCount() { return tiles.length; }
