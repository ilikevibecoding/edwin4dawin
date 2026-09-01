// Procedurally painted 16x16 pixel-art tiles packed into one atlas texture.
// Every texture is original artwork generated at runtime from code.
import * as THREE from 'three';
import { RNG } from './rng.js';
import { TILE_PX, ATLAS_TILES } from './constants.js';
import { drawSmallText } from './font.js';

const S = TILE_PX;

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
P.missing = (t, r) => { for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) t.px(x, y, ((x >> 3) + (y >> 3)) & 1 ? [255, 0, 255] : [0, 0, 0]); };

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
];

export const TILES = {};
let nextTile = 0;
const tiles = []; // Tile objects by index

function addTile(name, painter, seed) {
  const t = new Tile();
  painter(t, new RNG(seed));
  tiles.push(t);
  TILES[name] = nextTile;
  return nextTile++;
}

export function buildAtlas() {
  TILE_NAMES.forEach((name, i) => addTile(name, P[name], 1000 + i * 7919));
  for (let s = 0; s < 10; s++) addTile('destroy_' + s, (t, r) => destroyStage(t, r, s), 5000 + s);
  return finalizeAtlas();
}

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
    indices.push(nextTile++);
  }
  TILES[key] = indices;
  return indices;
}

export let atlasCanvas = null;
export let atlasTexture = null;

// Builds/rebuilds the atlas canvas + texture from all registered tiles (with per-tile mipmaps).
export function finalizeAtlas() {
  const size = ATLAS_TILES * S;
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(size, size);
  for (let i = 0; i < tiles.length; i++) {
    const tx = (i % ATLAS_TILES) * S, ty = Math.floor(i / ATLAS_TILES) * S;
    const t = tiles[i];
    for (let y = 0; y < S; y++) {
      const src = t.d.subarray(y * S * 4, (y + 1) * S * 4);
      img.data.set(src, ((ty + y) * size + tx) * 4);
    }
  }
  ctx.putImageData(img, 0, 0);
  atlasCanvas = canvas;

  // Per-tile mipmaps: downsample every tile independently so tiles never bleed into each other.
  const mips = [];
  let cur = img.data, curSize = size;
  mips.push({ data: new Uint8Array(cur.buffer.slice(0)), width: size, height: size });
  while (curSize > ATLAS_TILES) {
    const ns = curSize >> 1;
    const out = new Uint8ClampedArray(ns * ns * 4);
    for (let y = 0; y < ns; y++) for (let x = 0; x < ns; x++) {
      let r = 0, g = 0, b = 0, n = 0, aSum = 0;
      for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
        const i = ((y * 2 + dy) * curSize + (x * 2 + dx)) * 4;
        const a = cur[i + 3];
        aSum += a;
        if (a > 127) { r += cur[i]; g += cur[i + 1]; b += cur[i + 2]; n++; }
      }
      const o = (y * ns + x) * 4;
      if (n > 0) { out[o] = r / n; out[o + 1] = g / n; out[o + 2] = b / n; out[o + 3] = n >= 2 ? 255 : 0; }
      else { out[o + 3] = 0; }
      // fully-transparent tiles keep 0 alpha; semi transparent (water) keep average alpha
      if (n === 4 && aSum < 1020) out[o + 3] = aSum / 4;
    }
    mips.push({ data: new Uint8Array(out.buffer), width: ns, height: ns });
    cur = out; curSize = ns;
  }

  const tex = new THREE.DataTexture(mips[0].data, size, size, THREE.RGBAFormat);
  tex.mipmaps = mips;
  tex.generateMipmaps = false;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestMipmapLinearFilter;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.colorSpace = THREE.NoColorSpace;
  tex.flipY = false;
  tex.needsUpdate = true;
  if (atlasTexture) atlasTexture.dispose();
  atlasTexture = tex;
  return tex;
}

export function tileUV(index) {
  const tx = index % ATLAS_TILES, ty = Math.floor(index / ATLAS_TILES);
  const s = 1 / ATLAS_TILES;
  return [tx * s, ty * s, s];
}

// Returns the ImageData-like pixel array for one tile (used by particles/icons).
export function tilePixels(index) {
  return tiles[index] ? tiles[index].d : tiles[0].d;
}
