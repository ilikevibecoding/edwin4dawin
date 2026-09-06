import * as THREE from 'three';
import { Rng, hash2 } from '../core/seed';
import { perlin2, smoothstep } from '../core/noise';
import { GLSL_NOISE } from '../render/shaders/common.glsl';
import { CELL, Canopy, HALF, Zone, type WorldMap } from './map';
import { balanceGroundIbl } from './terrain';
import { InstanceBatch, splitCells, type CellSource } from './batching';
import { LAYER_CAMERA, LAYER_DEFAULT, LAYER_MAIN, LAYER_MIRROR, MAX_CASCADES, cascadeIsFine, layerMask, maskCasts, type ViewCull } from './culling';

/**
 * Procedural planting. Two instanced geometry families cover eight archetypes:
 *  - crown trees (broadleaf hardwood, tall emergent, squat mangrove, low shrub, dune grass tussock, sea
 *    grape, slash pine): a trunk and four displaced icosphere puffs (88 triangles beyond HI_DISTANCE;
 *    244 with the main puff subdivided and 48 leaf-cluster fringe cards inside it; 664 inside
 *    ULTRA_DISTANCE). The puffs are arranged by one of eight CROWN LAYOUTS chosen per plant (lobe angle
 *    / radius / size / height; some layouts hide a lobe), scaled by the archetype's shape class (round,
 *    spreading, conical), then stretched anisotropically, lumped with a per-plant noise displacement
 *    and sized by a per-species height in metres (HEIGHTS), so no two crowns share a silhouette and none
 *    outgrows its species. The crown shader adds crown-space wrap lighting (sunlit cap, cooler
 *    underside), leaf cluster noise, a ragged dissolved silhouette and perturbed normals up close; the
 *    fringe cards are camera-facing leaf clusters seeded on the puff surface that break the polygonal
 *    outline at 100-400 m.
 *  - palms: bent, leaning, tapered trunk and thirteen arching frond strips (102 triangles) with
 *    per-instance frond rotation and droop, the atlas fronds shaded in grey and tinted per plant.
 * Foliage is lit with its own direct-light model (RE_Direct_Foliage): wrapped diffuse so a leaf mass is
 * lit past the terminator, a translucency term for sun through the leaves, and a shadow floor (leaves
 * scatter light, so a shaded crown keeps half the sun instead of going black).
 * Every plant also exists as a 2-triangle camera-facing card whose texture blends between a side view
 * and a top view with the viewing elevation. The card atlas is drawn from the same layouts (8 variants x
 * 4 shape classes, side and top), so a card matches the silhouette and proportions of the 3D crown it
 * stands in for. Tiles of 900 m switch between the 3D meshes (near the camera, up to an instance budget)
 * and the cards (everything else), so a dense island canopy costs about the same as the sparse planting
 * it replaces. Cards are thinned with distance. Shadows always come from the light-facing cards; for
 * near tiles the card mesh sits on the shadow-only layers so the main pass never touches it. Foliage
 * receives shadow with one lookup per plant at the crown's sun-facing point (VEG_SHADOWMAP_VERTEX), so
 * crowns are shaded whole by taller neighbours and buildings instead of being cut by the planar shadows
 * of the cards. Tiles are culled against the camera frustum with their own world-space boxes, and cast
 * shadows only when their footprint can shade something in view.
 */

// ---------------------------------------------------------------- crown layouts (shared by mesh, cards, atlas)

/** 0 broadleaf, 1 emergent, 2 mangrove, 3 shrub, 4 palm, 5 dune grass tussock, 6 sea grape, 7 slash pine */
type Archetype = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
/** shape class: 0 round (broadleaf, emergent), 1 spreading (mangrove, shrub, grass, sea grape), 2 conical (pine), 3 palm */
function shapeClass(a: Archetype): number { return a === 4 ? 3 : a === 7 ? 2 : a <= 1 ? 0 : 1; }

const VARIANTS = 8;
/** Eight lobe layouts x three lobes: [angle, radius, size (0 = hidden), height] in unit-crown space. */
const LOBES: number[][] = (() => {
  const rng = new Rng('crown-layouts');
  const out: number[][] = [];
  for (let v = 0; v < VARIANTS; v++) {
    const a0 = rng.range(0, Math.PI * 2);
    const gap = 1.7 + rng.range(0, 0.9);
    for (let k = 0; k < 3; k++) {
      const hidden = (k === 2 && (v === 1 || v === 4 || v === 6)) || (k === 1 && v === 6);
      // lobes stand well out from the main puff and are nearly its size, so a crown is a cluster of
      // distinct masses with a lumpy outline rather than a ball with bumps
      out.push([a0 + k * gap + rng.range(-0.3, 0.3), rng.range(0.7, 1.15), hidden ? 0 : rng.range(0.5, 0.85), rng.range(-0.32, 0.28)]);
    }
  }
  return out;
})();
const GLSL_LOBES = `const vec4 LOBES[${VARIANTS * 3}] = vec4[${VARIANTS * 3}](${LOBES.map((l) => `vec4(${l.map((x) => x.toFixed(4)).join(', ')})`).join(', ')});`;

interface Puff { x: number; y: number; z: number; sx: number; sy: number; sz: number }
/** Puff centres and half-extents of a crown relative to its centre (the same arithmetic as CROWN_VERTEX). */
/** main puff of a round crown relative to the lobes' base size: smaller, so the lobes shape the outline */
const ROUND_MAIN = 0.88;
function layoutPuffs(cls: number, variant: number, squash: number): Puff[] {
  const out: Puff[] = [];
  if (cls === 2) out.push({ x: 0, y: 0, z: 0, sx: 0.6 * 1.15, sy: squash, sz: 0.6 * 1.05 });
  else if (cls === 0) out.push({ x: 0, y: 0, z: 0, sx: 1.15 * ROUND_MAIN, sy: squash * ROUND_MAIN, sz: 1.05 * ROUND_MAIN });
  else out.push({ x: 0, y: 0, z: 0, sx: 1.15, sy: squash, sz: 1.05 });
  for (let k = 0; k < 3; k++) {
    const [ang, rad, size, hgt] = LOBES[variant * 3 + k];
    if (size <= 0) continue;
    const c = Math.cos(ang), s = Math.sin(ang);
    if (cls === 0) out.push({ x: c * rad * 0.95, y: hgt * squash, z: s * rad * 0.95, sx: 1.15 * size, sy: squash * size, sz: 1.05 * size });
    else if (cls === 1) out.push({ x: c * rad * 1.3, y: (hgt * 0.35 - 0.05) * squash, z: s * rad * 1.3, sx: 1.15 * size * 1.15, sy: squash * size * 1.15, sz: 1.05 * size * 1.15 });
    else out.push({ x: c * rad * 0.45, y: (-0.25 - 0.3 * k) * squash, z: s * rad * 0.45, sx: 1.15 * size * 0.55, sy: squash * size * 0.55 * 0.7, sz: 1.05 * size * 0.55 });
  }
  return out;
}

/** Card proportions per shape class: the atlas tile is drawn for a typical squash / trunk of the class and
 *  covers `w` x `h` crown units with the trunk base at the bottom edge and the crown centre at `vc`. */
interface CardClass { w: number; h: number; vc: number; squash: number; trunk: number }
const CARD_CLASSES: CardClass[] = (() => {
  const typical = [{ squash: 0.85, trunk: 0.55 }, { squash: 0.6, trunk: 0.12 }, { squash: 1.5, trunk: 0.8 }];
  const out: CardClass[] = [];
  for (let cls = 0; cls < 3; cls++) {
    const { squash, trunk } = typical[cls];
    const centreH = trunk + 0.85 * squash;
    let half = 0, top = 0;
    // the noise lumps reach 21 % past the puff radius
    for (let v = 0; v < VARIANTS; v++) for (const p of layoutPuffs(cls, v, squash)) {
      half = Math.max(half, Math.abs(p.x) + p.sx * 1.24, Math.abs(p.z) + p.sz * 1.24);
      top = Math.max(top, p.y + p.sy * 1.24);
    }
    // the anisotropic stretch of the 3D crowns reaches 12 % past the layout
    const w = half * 2 * 1.12 + 0.1, h = centreH + top + 0.1;
    out.push({ w, h, vc: centreH / h, squash, trunk });
  }
  // palm: trunk to y = 1 (leaning up to ~0.25 aside), fronds 0.56 out and to y ~1.16
  out.push({ w: 1.5, h: 1.35, vc: 1.0 / 1.35, squash: 0, trunk: 1 });
  return out;
})();

// ---------------------------------------------------------------- procedural textures

/** Palm atlas: frond cut-out on the left half, ringed bark on the right. Grey shading only (R): the
 *  instance tint gives the fronds their colour and the shader paints the bark, so a palm's fronds are the
 *  palette green x shading like its impostor card is, instead of a green texture multiplied by a green
 *  tint (the near-black 3D palms of iter09 plane-rear-quarter). */
function frondTexture(rng: Rng): THREE.CanvasTexture {
  const w = FROND_TEX_W, h = FROND_TEX_H;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, w, h);
  const grey = (v: number) => { const g = Math.round(255 * Math.min(1, Math.max(0, v))); return `rgb(${g}, ${g}, ${g})`; };
  ctx.fillStyle = grey(0.72); ctx.fillRect(w / 2, 0, w / 2, h);
  for (let y = 0; y < h; y += 9) { ctx.fillStyle = grey(y % 18 === 0 ? 0.5 : 0.85); ctx.fillRect(w / 2, y, w / 2, 4); }
  for (let i = 0; i < 140; i++) { ctx.fillStyle = `rgba(0,0,0,${0.1 + rng.next() * 0.2})`; ctx.fillRect(w / 2 + rng.next() * w / 2, rng.next() * h, 3 + rng.next() * 6, 2); }
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, w / 2, h); ctx.clip();
  // the frond runs from its base at the top of the canvas (uv.y = 1 in the strip geometry) to the tip at the
  // bottom: a bare petiole, then a comb of FROND_LEAFLETS thin leaflets a side, angled toward the tip with
  // clear gaps between them (so up close a frond is a comb of blades and sky, and the shader closes the comb
  // to a solid strip as the texture is minified), a little longer past mid length and shorter at the tip
  const fw = w / 2, rx = fw / 2;
  const base = 36, tip = h - 6;
  ctx.strokeStyle = grey(0.5);
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(rx, 0); ctx.lineTo(rx, tip - 10); ctx.stroke();
  for (let i = 0; i < FROND_LEAFLETS; i++) {
    const t = (i + 0.5) / FROND_LEAFLETS;
    const y = base + t * (tip - base);
    // reach across the strip: half at the base, full a little past mid length, a third at the tip
    const reach = (rx - 2) * (0.45 + 0.55 * Math.sin(Math.PI * Math.min(1, t * 1.15))) * (1 - 0.6 * smoothstep(0.75, 1, t));
    // angle from the rachis: leaflets near the base stand out, those toward the tip trail along it
    const ang = (58 - 26 * t) * Math.PI / 180;
    const len = reach / Math.sin(ang);
    const dx = Math.sin(ang), dy = Math.cos(ang);
    const shade = 0.66 + 0.22 * t + 0.1 * (rng.next() - 0.5);
    ctx.fillStyle = grey(shade);
    for (const side of [-1, 1]) {
      // a tapered blade: 5 px at the rachis, a point at the tip, bowed a little toward the tip (drooping)
      const hw = 2.6;
      const px = -dy * side, py = dx;
      ctx.beginPath();
      ctx.moveTo(rx + px * hw, y + py * hw);
      ctx.quadraticCurveTo(rx + side * dx * len * 0.55 + px * hw * 0.9, y + dy * len * 0.55 + 4 + py * hw * 0.9, rx + side * dx * len, y + dy * len + 7);
      ctx.quadraticCurveTo(rx + side * dx * len * 0.55 - px * hw * 0.9, y + dy * len * 0.55 + 4 - py * hw * 0.9, rx - px * hw, y - py * hw);
      ctx.fill();
    }
  }
  ctx.restore();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.NoColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** Leaf-cluster cut-outs for the crown fringe cards: 2 x 2 tiles of 128 px, each a loose cluster of
 *  overlapping leaves (alpha) with per-leaf shading in R (tinted per plant by the crown shader). The
 *  edges are antialiased by the canvas rasteriser and the texture is mip-mapped, so the alpha reads as
 *  coverage at every distance. */
/** leaf texture atlas: LEAF_COLS x LEAF_ROWS tiles of LEAF_T px (tile k at column k % 2, row k / 2) */
const LEAF_T = 128;
const LEAF_COLS = 2;
const LEAF_ROWS = 3;
function leafClusterTexture(rng: Rng): THREE.CanvasTexture {
  const T = LEAF_T, N = LEAF_COLS;
  const c = document.createElement('canvas');
  c.width = T * N; c.height = T * LEAF_ROWS;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, c.width, c.height);
  // tiles 0 and 1 (top row): hardwood clusters; tile 2: the big round leaves of a sea grape; tile 3: pine
  // needle tufts (see LEAF_TILE in the crown vertex stage); tiles 4 and 5: seamless leaf carpets (hardwood
  // leaves, pine needles) laid over the near puffs' faces in world space
  for (let ty = 0; ty < LEAF_ROWS; ty++) for (let tx = 0; tx < N; tx++) {
    const ox = tx * T, oy = ty * T;
    const tile = ty * N + tx;
    if (tile >= 4) {
      // a carpet: leaves scattered over the whole tile, every one drawn at the eight wrapped offsets too so
      // the tile repeats without a seam; coverage ~62 % (hardwood) / 55 % (needles), the rest gaps into the
      // crown's interior; the R channel is the per-leaf shade
      const pine = tile === 5;
      const n = pine ? 420 : 170;
      ctx.lineWidth = 1.2;
      ctx.save();
      ctx.beginPath(); ctx.rect(ox, oy, T, T); ctx.clip();
      for (let i = 0; i < n; i++) {
        const cx = rng.next(), cy = rng.next(), ang = rng.range(0, Math.PI);
        const g = Math.round(255 * Math.min(1, 0.5 + 0.55 * rng.next()));
        const len = (pine ? 0.05 + 0.06 * rng.next() : 0.045 + 0.04 * rng.next()) * T, wid = len * (0.45 + 0.3 * rng.next());
        ctx.fillStyle = ctx.strokeStyle = `rgb(${g}, 0, 0)`;
        for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
          const x = ox + (cx + dx) * T, y = oy + (cy + dy) * T;
          if (x < ox - T * 0.15 || x > ox + T * 1.15 || y < oy - T * 0.15 || y > oy + T * 1.15) continue;
          ctx.beginPath();
          if (pine) { ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len); ctx.stroke(); }
          else { ctx.ellipse(x, y, len, wid, ang, 0, Math.PI * 2); ctx.fill(); }
        }
      }
      ctx.restore();
      continue;
    }
    if (tile === 3) {
      // needle tufts: bottle-brushes of many short fine needles about the twig ends, the twigs radiating
      // from the tile's centre and each tuft's needles fanned about its twig (five bunches of 26 long 2 px
      // spokes read as flat starbursts at 5-10 m); the tuft's tip half brighter than its base
      for (let b = 0; b < 10; b++) {
        const twig = rng.range(0, Math.PI * 2), reach = b < 2 ? rng.range(0, 0.08) : rng.range(0.1, 0.26);
        const bx = 0.5 + Math.cos(twig) * reach, by = 0.5 + Math.sin(twig) * reach;
        const dir = twig + rng.range(-0.5, 0.5);
        ctx.lineWidth = 1.2;
        for (let i = 0; i < 70; i++) {
          const a = dir + rng.range(-1.3, 1.3), len = rng.range(0.07, 0.16);
          const x0 = bx + Math.cos(a) * len * 0.15, y0 = by + Math.sin(a) * len * 0.15;
          const xm = bx + Math.cos(a) * len * 0.55, ym = by + Math.sin(a) * len * 0.55;
          const x1 = bx + Math.cos(a) * len, y1 = by + Math.sin(a) * len;
          const g = 0.5 + 0.35 * rng.next();
          ctx.strokeStyle = `rgb(${Math.round(255 * g * 0.75)}, 0, 0)`;
          ctx.beginPath(); ctx.moveTo(ox + x0 * T, oy + y0 * T); ctx.lineTo(ox + xm * T, oy + ym * T); ctx.stroke();
          ctx.strokeStyle = `rgb(${Math.round(255 * Math.min(1, g * 1.15))}, 0, 0)`;
          ctx.beginPath(); ctx.moveTo(ox + xm * T, oy + ym * T); ctx.lineTo(ox + x1 * T, oy + y1 * T); ctx.stroke();
        }
      }
      continue;
    }
    // hardwood: many small leaves in a few overlapping bunches (a card spans 2-4 m of crown, so a leaf is
    // a few per cent of the tile: the old two dozen big ellipses radiating from the centre read as a hand
    // at close range), the bunches denser and paler at their centres, gaps between them; the sea grape's
    // leaves are far fewer, round and big (a 20 cm leaf on a 2 m card)
    const grape = tile === 2;
    const bunches: [number, number][] = grape ? [[0.5, 0.5]] : Array.from({ length: 4 + rng.int(0, 2) }, () => [0.5 + rng.range(-0.2, 0.2), 0.5 + rng.range(-0.2, 0.2)] as [number, number]);
    const n = grape ? 12 + rng.int(0, 3) : 120 + rng.int(0, 30);
    for (let i = 0; i < n; i++) {
      const [bx, by] = bunches[i % bunches.length];
      const ang = rng.range(0, Math.PI * 2), rad = Math.pow(rng.next(), 0.7) * (grape ? 0.3 : 0.19);
      const cx = bx + Math.cos(ang) * rad, cy = by + Math.sin(ang) * rad;
      const len = (grape ? 0.09 + 0.06 * rng.next() : 0.035 + 0.035 * rng.next()) * (1 - 0.4 * rad), wid = len * (grape ? 0.85 + 0.15 * rng.next() : 0.4 + 0.3 * rng.next());
      const shade = 0.6 + 0.5 * rng.next() * (1 - 0.6 * rad / (grape ? 0.3 : 0.19));
      const g = Math.round(255 * Math.min(1, shade));
      ctx.fillStyle = `rgb(${g}, 0, 0)`;
      ctx.beginPath();
      ctx.ellipse(ox + cx * T, oy + cy * T, len * T, wid * T, rng.range(0, Math.PI), 0, Math.PI * 2);
      ctx.fill();
      if (grape) {
        // the leaf's darker centre and vein
        ctx.fillStyle = `rgb(${Math.round(g * 0.7)}, 0, 0)`;
        ctx.beginPath();
        ctx.ellipse(ox + cx * T, oy + cy * T, len * T * 0.25, wid * T * 0.25, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  const tex = new THREE.CanvasTexture(c);
  // canvas row 0 is texture row 0: tile k is at v = (k / 2) / LEAF_ROWS (three flips a canvas by default, which
  // put the fringe cards on the wrong row — the hardwoods wore the sea grape's leaves and the pine's tufts)
  tex.flipY = false;
  tex.colorSpace = THREE.NoColorSpace;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = 4;
  return tex;
}

/** Impostor atlas: 8 columns (layout variants) x 8 rows (shape class side views 0-3, top views 4-7),
 *  128 px tiles. R = shading (tinted per instance), G = trunk mask, alpha = cut-out. Each tile is drawn
 *  from the same puff layout as the 3D crown of that class and variant, so cards and meshes share
 *  silhouettes and proportions; edges are ragged with per-pixel noise. */
const ATLAS_T = 128;
const ATLAS_N = 8;
function cardAtlas(rng: Rng): THREE.CanvasTexture {
  const T = ATLAS_T, w = T * ATLAS_N, h = T * ATLAS_N;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(w, h);
  const d = img.data;
  // canvas rows run top to bottom: v = 1 - y/T within a tile
  const put = (col: number, row: number, x: number, y: number, g: number, trunk: number) => {
    if (x < 0 || y < 0 || x >= T || y >= T) return;
    const i = ((row * T + y) * w + col * T + x) * 4;
    d[i] = Math.round(255 * Math.min(1, Math.max(0, g)));
    d[i + 1] = trunk;
    d[i + 2] = 0;
    d[i + 3] = 255;
  };
  /** shaded elliptical puff (side view): lit cap, dark belly, leaf clusters, ragged edge */
  const blob = (col: number, row: number, cx: number, cy: number, rx: number, ry: number, gTop: number, gBot: number, seed: number) => {
    const x0 = Math.max(0, Math.floor((cx - rx * 1.2) * T)), x1 = Math.min(T - 1, Math.ceil((cx + rx * 1.2) * T));
    const y0 = Math.max(0, Math.floor((1 - cy - ry * 1.2) * T)), y1 = Math.min(T - 1, Math.ceil((1 - cy + ry * 1.2) * T));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const u = (x + 0.5) / T, v = 1 - (y + 0.5) / T;
      const dx = (u - cx) / rx, dy = (v - cy) / ry;
      const ang = Math.atan2(dy, dx);
      const rr = 1 + 0.15 * perlin2(Math.cos(ang) * 2.1 + seed, Math.sin(ang) * 2.1 + seed * 0.7) + 0.06 * perlin2(u * 30 + seed, v * 30);
      const dist = Math.hypot(dx, dy);
      if (dist > rr) continue;
      const k = dist / rr;
      const lit = Math.pow(0.5 + 0.5 * (dy / rr), 0.7);
      const leaf = 0.5 + 0.5 * perlin2(u * 22 + seed * 3, v * 22 - seed);
      const g = (gBot + (gTop - gBot) * lit) * (0.86 + 0.28 * leaf) * (1 - 0.22 * k * k);
      put(col, row, x, y, g, 0);
    }
  };
  /** top view of a puff: lit disc with lobed leaf clusters */
  const disc = (col: number, row: number, cx: number, cy: number, r: number, gBase: number, seed: number) => {
    const x0 = Math.max(0, Math.floor((cx - r * 1.2) * T)), x1 = Math.min(T - 1, Math.ceil((cx + r * 1.2) * T));
    const y0 = Math.max(0, Math.floor((1 - cy - r * 1.2) * T)), y1 = Math.min(T - 1, Math.ceil((1 - cy + r * 1.2) * T));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const u = (x + 0.5) / T, v = 1 - (y + 0.5) / T;
      const dx = (u - cx) / r, dy = (v - cy) / r;
      const ang = Math.atan2(dy, dx);
      const rr = 1 + 0.16 * perlin2(Math.cos(ang) * 2.3 + seed, Math.sin(ang) * 2.3 - seed);
      const dist = Math.hypot(dx, dy);
      if (dist > rr) continue;
      const k = dist / rr;
      const leaf = 0.5 + 0.5 * perlin2(u * 26 + seed, v * 26 + seed * 2);
      const lobes = 0.5 + 0.5 * perlin2(u * 9 - seed, v * 9 + seed);
      // lumpy clusters with a flat radial falloff: from the air a crown is a textured clump, not a shaded
      // ball (the old 0.3 k^2 falloff made every aerial crown a bubble with a dark rim); the cluster field
      // is kept under the channel's ceiling so its peaks stay separate (the card shader's terminator
      // follows it: clipped peaks read as one flat lit plateau)
      put(col, row, x, y, gBase * (0.5 + 0.5 * lobes) * (0.86 + 0.28 * leaf) * (1 - 0.14 * k * k), 0);
    }
  };
  const trunk = (col: number, row: number, cx0: number, cx1: number, v0: number, v1: number, halfW: number, g: number) => {
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
      const u = (x + 0.5) / T, v = 1 - (y + 0.5) / T;
      if (v < v0 || v > v1) continue;
      const t = (v - v0) / (v1 - v0);
      const cx = cx0 + (cx1 - cx0) * t * t;
      if (Math.abs(u - cx) > halfW * (1 - 0.35 * t)) continue;
      put(col, row, x, y, g * (0.85 + 0.3 * perlin2(u * 40, v * 40)), 255);
    }
  };
  /** palm crown: `n` fronds radiating from (cx, cy) with the 3D fronds' proportions (0.6 long, 0.17 half
   *  width, arching up then drooping), a rachis with dense leaflets either side, alternate fronds a tier
   *  lower and shorter, so the card silhouette is the full coconut crown the 3D palm shows up close */
  const frondStar = (col: number, row: number, cx: number, cy: number, r: number, n: number, droop: number, seed: number, kx: number, ky: number) => {
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 + 0.3 * perlin2(k * 1.7 + seed, seed);
      const tier = k % 2;
      const len = r * (0.82 + 0.18 * perlin2(k * 3.1, seed + k)) * (1 - 0.13 * tier);
      const rise = droop > 0 ? 0.16 * r : 0;
      for (let s = 0; s <= 1; s += 0.006) {
        // side view: the frond leaves the crown at `a`, arches up by `rise` and drops by droop * s^2
        const x = cx + Math.cos(a) * len * s * kx;
        const y = cy + (Math.sin(a) * len * s * (1 - droop) + rise * Math.sin(s * Math.PI * 0.8) - (droop + 0.1 * tier * (droop > 0 ? 1 : 0)) * r * s * s * 1.4 - 0.03 * tier) * ky;
        const wdt = 0.13 * (1 - 0.3 * s) * (0.35 + 0.65 * Math.sin(Math.min(1, s * 1.6) * Math.PI * 0.5));
        // leaflets: dense ticks along the rachis, with gaps so light comes through
        const leaflet = Math.sin(s * 150 + k * 2.3) > -0.1 ? 1 : 0.3;
        for (let t = -1; t <= 1; t += 0.12) {
          const ext = Math.abs(t) < 0.16 ? 1 : leaflet;
          if (ext < 0.5) continue;
          const px = x - Math.sin(a) * wdt * t * kx, py = y + Math.cos(a) * wdt * t * ky * 0.8;
          put(col, row, Math.floor(px * T), Math.floor((1 - py) * T), 0.66 + 0.45 * s - 0.2 * Math.abs(t) - 0.12 * tier, 0);
        }
      }
    }
  };
  for (let cls = 0; cls < 3; cls++) {
    const cc = CARD_CLASSES[cls];
    const kx = 1 / cc.w, ky = 1 / cc.h;
    for (let v = 0; v < VARIANTS; v++) {
      const seed = 3.0 + cls * 17 + v * 5.3 + rng.next();
      const puffs = layoutPuffs(cls, v, cc.squash);
      // side view (row cls): trunk, then puffs back to front
      trunk(v, cls, 0.5, 0.5 + 0.02 * (v % 3 - 1), 0, cc.vc, (cls === 2 ? 0.05 : cls === 1 ? 0.045 : 0.07) * kx, 0.45);
      const order = puffs.map((p, i) => ({ p, i })).sort((a, b) => a.p.z - b.p.z);
      for (const { p, i } of order) {
        const front = 0.5 + 0.5 * (p.z + 1) / 2;
        blob(v, cls, 0.5 + p.x * kx, cc.vc + p.y * ky, p.sx * 1.08 * kx, p.sy * 1.08 * ky, 1.02 + 0.12 * front, 0.66 + 0.08 * front, seed + i * 7.1);
      }
      // top view (row cls + 4): discs in plan, the same centre so the side/top blend does not shift
      for (const { p, i } of order) disc(v, cls + 4, 0.5 + p.x * kx, cc.vc + p.z * kx, Math.max(p.sx, p.sz) * 1.05 * kx, 0.88 + 0.16 * (p.y + 0.3), seed + i * 3.7);
    }
  }
  {
    const cc = CARD_CLASSES[3];
    const kx = 1 / cc.w, ky = 1 / cc.h;
    for (let v = 0; v < VARIANTS; v++) {
      const seed = 60 + v * 4.1 + rng.next();
      const lean = ((v % 4) - 1.5) * 0.09;
      trunk(v, 3, 0.5, 0.5 + lean, 0, cc.vc, 0.05 * kx, 0.55);
      frondStar(v, 3, 0.5 + lean, cc.vc, 0.6, 11 + (v % 4), 0.3 + 0.05 * (v % 3), seed, kx, ky);
      frondStar(v, 7, 0.5 + lean, cc.vc, 0.6, 12 + (v % 3), 0.0, seed + 1, kx, kx);
      for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
        const i = (((7 * T) + y) * w + v * T + x) * 4;
        if (d[i + 3] === 0 && Math.hypot((x + 0.5) / T - 0.5 - lean, 1 - (y + 0.5) / T - cc.vc) < 0.05) { d[i] = 140; d[i + 1] = 255; d[i + 2] = 0; d[i + 3] = 255; }
      }
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.NoColorSpace;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.anisotropy = 4;
  tex.generateMipmaps = true;
  return tex;
}

// ---------------------------------------------------------------- geometry families

/** Displaced icosphere. The displacement is a function of the unit-sphere position, so the detail-1
 *  version (80 faces) is the same lump as the detail-0 one (20 faces) with the creases rounded off. */
function puff(seed: number, part: number, detail = 0): { pos: number[]; nrm: number[]; part: number[] } {
  const g = new THREE.IcosahedronGeometry(1, detail);
  const p = g.getAttribute('position') as THREE.BufferAttribute;
  const pos: number[] = [], nrm: number[] = [], parts: number[] = [];
  for (let k = 0; k < p.count; k++) {
    const x = p.getX(k), y = p.getY(k), z = p.getZ(k);
    const dsp = 1 + 0.18 * perlin2(x * 2.1 + seed, y * 2.1 + z * 1.7 - seed);
    pos.push(x * dsp, y * dsp * (y < 0 ? 0.65 : 1.0), z * dsp);
    nrm.push(x, y, z);
    parts.push(part);
  }
  return { pos, nrm, part: parts };
}

/** Leaf-cluster fringe of a puff: `count` quads seeded on the displaced sphere (the same displacement
 *  as `puff`, so a card's centre sits on the puff surface), each carrying the sphere normal of its seed
 *  point. The vertex shader places the seed like any puff vertex and then spreads the corners (uv) in
 *  the camera's plane, so the quads are camera-facing cards half-buried in the puff whose alpha-tested
 *  leaf clusters break the polygonal silhouette. aPart = FRINGE_PART + puff id + card index / 64. */
function fringeCards(seed: number, part: number, count: number): { pos: number[]; nrm: number[]; uv: number[]; part: number[] } {
  const pos: number[] = [], nrm: number[] = [], uv: number[] = [], parts: number[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  let k = 0;
  for (let i = 0; k < count && i < count * 3; i++) {
    // Fibonacci sphere, skipping the flattened underside (rarely seen, and the belly reads better smooth)
    const y = 1 - (i + 0.5) / (count * 1.35) * 2;
    if (y < -0.45) break;
    const r = Math.sqrt(Math.max(0, 1 - y * y)), a = i * golden + seed;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    const dsp = 1 + 0.18 * perlin2(x * 2.1 + seed, y * 2.1 + z * 1.7 - seed);
    const px = x * dsp, py = y * dsp * (y < 0 ? 0.65 : 1.0), pz = z * dsp;
    const id = part + FRINGE_PART + k / 64;
    for (const [u, v] of [[0, 0], [1, 0], [1, 1], [0, 0], [1, 1], [0, 1]]) { pos.push(px, py, pz); nrm.push(x, y, z); uv.push(u, v); parts.push(id); }
    k++;
  }
  return { pos, nrm, uv, part: parts };
}
/** aPart values in [FRINGE_PART, BRANCH_PART) are fringe cards (FRINGE_PART + puff id + card index / 64) */
const FRINGE_PART = 10;
/** aPart values in [BRANCH_PART, DISC_PART) are branches (BRANCH_PART + lobe puff id 2-4): thin prisms the
 *  vertex shader runs from the trunk top to the lobe's centre, so the lobes hang on visible limbs */
const BRANCH_PART = 20;
/** aPart values from DISC_PART up are the root disc at the trunk base (the ground contact) */
const DISC_PART = 30;
/** fringe cards per puff (main, lobe) at each tessellation level: level 1 (150-420 m, where a crown is
 *  15-60 px tall) carries three quarters of the level-2 fringe — 36 cards break a silhouette of that size as
 *  well as 48 did, at 24 fewer triangles a crown */
const FRINGE_COUNT: [number, number][] = [[0, 0], [18, 6], [24, 8]];

/** Branch prisms for the three lobes: `sides`-sided tubes with the position holding (ring x, t along the
 *  branch 0..1, ring z); the vertex shader places them between the trunk top and the lobe centre of the
 *  plant's layout and scales the ring by the branch radius. Normals are the ring directions. */
function branchPrisms(sides: number): { pos: number[]; nrm: number[]; uv: number[]; part: number[] } {
  const pos: number[] = [], nrm: number[] = [], uv: number[] = [], parts: number[] = [];
  for (let k = 2; k <= 4; k++) {
    for (let j = 0; j < sides; j++) {
      const a0 = (j / sides) * Math.PI * 2, a1 = ((j + 1) / sides) * Math.PI * 2;
      const x0 = Math.cos(a0), z0 = Math.sin(a0), x1 = Math.cos(a1), z1 = Math.sin(a1);
      const nx = Math.cos((a0 + a1) / 2), nz = Math.sin((a0 + a1) / 2);
      const quad = [[x0, 0, z0], [x1, 0, z1], [x1, 1, z1], [x0, 0, z0], [x1, 1, z1], [x0, 1, z0]];
      for (const [x, t, z] of quad) { pos.push(x, t, z); nrm.push(nx, 0, nz); uv.push(0, t); parts.push(BRANCH_PART + k); }
    }
  }
  return { pos, nrm, uv, part: parts };
}

/** Root disc: a fan of `segs` triangles in the ground plane (unit radius; the shader sizes it), normal up. */
function rootDisc(segs: number): { pos: number[]; nrm: number[]; uv: number[]; part: number[] } {
  const pos: number[] = [], nrm: number[] = [], uv: number[] = [], parts: number[] = [];
  for (let j = 0; j < segs; j++) {
    const a0 = (j / segs) * Math.PI * 2, a1 = ((j + 1) / segs) * Math.PI * 2;
    const tri = [[0, 0], [Math.cos(a1), Math.sin(a1)], [Math.cos(a0), Math.sin(a0)]];
    for (const [x, z] of tri) { pos.push(x, 0, z); nrm.push(0, 1, 0); uv.push(x, z); parts.push(DISC_PART); }
  }
  return { pos, nrm, uv, part: parts };
}

/** Unit crown tree: trunk (4-sided prism, part 0) + main puff (part 1) + three lobes (parts 2-4) and,
 *  on the two nearer levels, the leaf-cluster fringe cards. The shader places and sizes the lobes per
 *  instance from the crown layouts. Three tessellations: level 0 (88 triangles) beyond HI_DISTANCE, level
 *  1 inside it (main puff subdivided once plus 48 fringe cards that hide the polygonal outline: 244),
 *  level 2 inside ULTRA_DISTANCE (main puff subdivided twice, lobes once, fringe: 664), where a 15 m crown
 *  fills a tenth of the frame and the fringe alone cannot round 20 faces off. */
function crownGeometry(level = 0): THREE.BufferGeometry {
  const pos: number[] = [], nrm: number[] = [], part: number[] = [], uv: number[] = [];
  // trunk: 4 quads (8 tris) from y=0 to y=1, radius 0.07
  const r = 0.07, sides = 4;
  for (let j = 0; j < sides; j++) {
    const a0 = (j / sides) * Math.PI * 2, a1 = ((j + 1) / sides) * Math.PI * 2;
    const x0 = Math.cos(a0) * r, z0 = Math.sin(a0) * r, x1 = Math.cos(a1) * r, z1 = Math.sin(a1) * r;
    const nx = Math.cos((a0 + a1) / 2), nz = Math.sin((a0 + a1) / 2);
    const quad = [[x0, 0, z0], [x1, 0, z1], [x1, 1, z1], [x0, 0, z0], [x1, 1, z1], [x0, 1, z0]];
    for (const [x, y, z] of quad) { pos.push(x, y, z); nrm.push(nx, 0, nz); part.push(0); uv.push(0, y); }
  }
  for (const [seed, pid] of [[3.1, 1], [8.7, 2], [14.3, 3], [21.9, 4]]) {
    const pf = puff(seed, pid, pid === 1 ? Math.min(level, 2) : level > 1 ? 1 : 0);
    pos.push(...pf.pos); nrm.push(...pf.nrm); part.push(...pf.part);
    for (let i = 0; i < pf.part.length; i++) uv.push(0, 0);
    const fc = FRINGE_COUNT[Math.min(level, 2)][pid === 1 ? 0 : 1];
    if (fc > 0) { const fr = fringeCards(seed, pid, fc); pos.push(...fr.pos); nrm.push(...fr.nrm); uv.push(...fr.uv); part.push(...fr.part); }
  }
  if (level >= 1) {
    // the near levels show the limbs the lobes hang on and the root zone at the base (18 + 8 triangles)
    const br = branchPrisms(3);
    pos.push(...br.pos); nrm.push(...br.nrm); uv.push(...br.uv); part.push(...br.part);
    const rd = rootDisc(8);
    pos.push(...rd.pos); nrm.push(...rd.nrm); uv.push(...rd.uv); part.push(...rd.part);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('aPart', new THREE.Float32BufferAttribute(part, 1));
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 1.4, 0), 3.0);
  return g;
}

/** Unit palm: curved tapered trunk (part 0, 3 segments x 4 sides) + PALM_FRONDS three-segment frond
 *  strips (parts 1..n) radiating from the top (102 triangles). uv.x selects frond/bark in the atlas,
 *  uv.y runs along. */
const PALM_FRONDS = 13;
/** leaflets a side in the frond texture's comb */
const FROND_LEAFLETS = 40;
/** frond texture size (the shader derives the sampled mip level from it) */
const FROND_TEX_W = 256;
const FROND_TEX_H = 512;
/** Fins a side of a frond of the near palm geometry: each is a slice of the strip hinged on the rachis */
const FROND_FINS = 5;
/** Unit palm (see above). `hi`: the near tier's geometry, whose fronds are not flat strips but two rows of
 *  FROND_FINS fins hinged on the rachis and drooping from it at their own angles (the V cross-section of a
 *  coconut frond, its leaflets hanging in groups), so at 30-60 m a frond has depth and a serrated edge
 *  instead of reading as a painted strip (13 x 10 fins = 260 triangles + the trunk). */
function palmGeometry(hi = false): THREE.BufferGeometry {
  const pos: number[] = [], nrm: number[] = [], uv: number[] = [], part: number[] = [];
  const segs = 3, sides = 4;
  const ring = (t: number): [number, number, number][] => {
    const r = 0.05 * (1 - 0.3 * t);
    const out: [number, number, number][] = [];
    for (let j = 0; j <= sides; j++) { const a = (j / sides) * Math.PI * 2 + Math.PI / 4; out.push([Math.cos(a) * r, t, Math.sin(a) * r]); }
    return out;
  };
  for (let i = 0; i < segs; i++) {
    const r0 = ring(i / segs), r1 = ring((i + 1) / segs);
    for (let j = 0; j < sides; j++) {
      const a = (j + 0.5) / sides * Math.PI * 2 + Math.PI / 4;
      const nx = Math.cos(a), nz = Math.sin(a);
      const quad = [r0[j], r0[j + 1], r1[j + 1], r0[j], r1[j + 1], r1[j]];
      const us = [0.55 + 0.4 * (j / sides), 0.55 + 0.4 * ((j + 1) / sides), 0.55 + 0.4 * ((j + 1) / sides), 0.55 + 0.4 * (j / sides), 0.55 + 0.4 * ((j + 1) / sides), 0.55 + 0.4 * (j / sides)];
      quad.forEach(([x, y, z], k) => { pos.push(x, y, z); nrm.push(nx, 0, nz); uv.push(us[k], y); part.push(0); });
    }
  }
  const n = PALM_FRONDS, segs2 = 3;
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2;
    // alternate fronds sit a little lower and shorter: a two-tier crown instead of a flat star
    const tier = k % 2;
    const len = 0.6 - 0.08 * tier;
    // leaves the crown climbing (+0.16 at mid length), tips at -0.21 (upper tier) / -0.38 (lower): an open
    // star with sky between the fronds, not the dome of wide overlapping strips the iter09 palms were
    const rachis = (t: number): [number, number, number] => [Math.cos(a) * len * t, 1.0 - 0.05 * tier + 0.24 * Math.sin(t * Math.PI * 0.9) - (0.28 + 0.12 * tier) * t * t, Math.sin(a) * len * t];
    // narrow petiole, widest past mid length, tapering to the tip (the card's frond profile)
    const width = (t: number) => 0.11 * (0.35 + 0.65 * Math.sin(Math.min(1, t * 1.6) * Math.PI * 0.5)) * (1 - 0.3 * t);
    const perp: [number, number, number] = [-Math.sin(a), 0, Math.cos(a)];
    if (!hi) {
      const pts: [number, number, number][] = [];
      for (let i = 0; i <= segs2; i++) {
        const t = i / segs2;
        const [px, yv, pz] = rachis(t);
        const w = width(t);
        pts.push([px - perp[0] * w, yv, pz - perp[2] * w], [px + perp[0] * w, yv, pz + perp[2] * w]);
      }
      const tri = (i0: number, i1: number, i2: number) => {
        for (const i of [i0, i1, i2]) {
          pos.push(pts[i][0], pts[i][1], pts[i][2]); nrm.push(0, 1, 0); part.push(k + 1);
          const row = Math.floor(i / 2), side = i % 2;
          uv.push(side * 0.5, 1 - row / segs2);
        }
      };
      // wound so the front face is the frond's upper side (the shader lights the underside as the top too)
      for (let i = 0; i < segs2; i++) { const b = i * 2; tri(b, b + 1, b + 2); tri(b + 1, b + 3, b + 2); }
      continue;
    }
    // fins: the same texture slice as the strip (u 0.25 at the rachis, 0 / 0.5 at the edges), each hinged on
    // the rachis and turned down about it by its own angle
    for (const side of [-1, 1]) {
      for (let i = 0; i < FROND_FINS; i++) {
        const t0 = i / FROND_FINS, t1 = (i + 1) / FROND_FINS;
        const h = Math.abs(Math.sin(k * 12.9898 + i * 78.233 + side * 37.719) * 43758.5453) % 1;
        // leaflets hang in a V from the rachis, steeper toward the tip; the groups differ by up to 20 deg
        const theta = (28 + 14 * t0 + 20 * (h - 0.5)) * Math.PI / 180;
        const d: [number, number, number] = [side * perp[0] * Math.cos(theta), -Math.sin(theta), side * perp[2] * Math.cos(theta)];
        const r0 = rachis(t0), r1 = rachis(t1);
        const w0 = width(t0), w1 = width(t1);
        const e0: [number, number, number] = [r0[0] + d[0] * w0, r0[1] + d[1] * w0, r0[2] + d[2] * w0];
        const e1: [number, number, number] = [r1[0] + d[0] * w1, r1[1] + d[1] * w1, r1[2] + d[2] * w1];
        // fin normal: the rachis direction crossed with the droop direction, on the upper side of the fin
        const tx = r1[0] - r0[0], ty = r1[1] - r0[1], tz = r1[2] - r0[2];
        let nx = -side * (ty * d[2] - tz * d[1]), ny = -side * (tz * d[0] - tx * d[2]), nz = -side * (tx * d[1] - ty * d[0]);
        const nl = Math.hypot(nx, ny, nz) || 1; nx /= nl; ny /= nl; nz /= nl;
        const ue = 0.25 + side * 0.25;
        const verts: [number, number, number, number, number][] = [[...r0, 0.25, 1 - t0], [...e0, ue, 1 - t0], [...e1, ue, 1 - t1], [...r1, 0.25, 1 - t1]];
        // wound so the front face is the upper side (the mirrored side reverses the order)
        const order = side > 0 ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2];
        for (const vi of order) { const v = verts[vi]; pos.push(v[0], v[1], v[2]); nrm.push(nx, ny, nz); uv.push(v[3], v[4]); part.push(k + 1); }
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('aPart', new THREE.Float32BufferAttribute(part, 1));
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0.8, 0), 1.2);
  return g;
}

function cardGeometry(): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0], 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0], 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1], 2));
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 2.5);
  return g;
}

// ---------------------------------------------------------------- shaders

const COMMON_VERT = /* glsl */ `
uniform float uTime;
uniform float uWind;
attribute float aPart;
attribute vec4 aVar; // archetype + layout variant / 16 + neighbour occlusion / 256, seed, crown squash / frond droop, trunk length
varying float vPart;
varying vec3 vWP;
varying vec3 vCrownN; // world-space direction from the puff centre (the undisplaced sphere normal)
varying vec3 vRel; // position relative to the crown centre (unit crown space): continuous across the puffs
varying float vSeed;
varying float vArche;
varying float vOcc; // neighbour-density occlusion of this plant (0 open, 1 buried in taller canopy)
varying vec2 vLeafUv; // fringe cards: leaf-cluster texture coordinates
${GLSL_NOISE}
${GLSL_LOBES}
// centre of lobe puff k (2..4) of a crown layout, relative to the crown centre (the same arithmetic as layoutPuffs)
vec3 lobeCentre(float cls, int variant, int k, float squash) {
  vec4 L = LOBES[variant * 3 + k - 2];
  float ca = cos(L.x), sa = sin(L.x);
  if (cls < 0.5) return vec3(ca * L.y * 0.95, L.w * squash, sa * L.y * 0.95);
  if (cls < 1.5) return vec3(ca * L.y * 1.3, (L.w * 0.35 - 0.05) * squash, sa * L.y * 1.3);
  return vec3(ca * L.y * 0.45, (-0.25 - 0.3 * float(k - 2)) * squash, sa * L.y * 0.45);
}
// the limb a lobe hangs on, from the fork to the lobe centre. A round crown forks just under its main puff
// (the stem itself runs on into the puff), so the limbs show against the sky for a stretch before they
// enter the lobes from below; a spreading crown forks at its short trunk's top; a pine's limbs leave the
// trunk at the tier's height. A mangrove's limbs are prop roots instead, arching from low on the trunk down
// to the ground around it.
void branchEnds(float arche, float cls, int variant, int k, float squash, float centreY, out vec3 start, out vec3 end) {
  end = lobeCentre(cls, variant, k, squash);
  start = vec3(0.0, cls > 1.5 ? end.y - 0.1 * squash : cls < 0.5 ? -0.95 * squash : -0.3 * squash, 0.0);
  if (arche > 1.5 && arche < 2.5) {
    vec4 L = LOBES[variant * 3 + k - 2];
    end = vec3(cos(L.x) * 0.55, -centreY, sin(L.x) * 0.55);
    start = vec3(0.0, -0.45 * squash, 0.0);
  }
}
`;
/** the neighbour occlusion packed under the layout variant in aVar.x (see `kind` in the tile builder) */
const GLSL_OCC = 'fract(fract(aVar.x) * 16.0) * 16.0';

// crown family: per-instance puff arrangement (positions are puff-local unit spheres)
const CROWN_NORMAL = /* glsl */ `
vec3 objectNormal = normal;
// foliage normals lean a little toward the sky so a crown shades as a lit mass of leaves, not a hard ball;
// kept small so the puffs keep a directional gradient from the sun side to the shade side
if (aPart > 0.5 && aPart < ${BRANCH_PART - 0.5}) objectNormal = normalize(mix(normalize(objectNormal * vec3(1.0, 1.0 / max(aVar.z, 0.3), 1.0)), vec3(0.0, 1.0, 0.0), 0.15));
if (aPart > ${BRANCH_PART - 0.5} && aPart < ${DISC_PART - 0.5}) {
  // branch ring normal, turned from the geometry's +y axis onto the branch direction
  float arche = floor(aVar.x + 0.001);
  float cls = arche > 6.5 ? 2.0 : arche < 1.5 ? 0.0 : 1.0;
  vec3 start, end;
  branchEnds(arche, cls, int(floor(fract(aVar.x) * 16.0 + 0.5)), int(aPart + 0.5) - ${BRANCH_PART}, aVar.z, aVar.w + 0.85 * aVar.z, start, end);
  vec3 dir = normalize(end - start + vec3(0.0, 1e-4, 0.0));
  vec3 side = normalize(cross(dir, abs(dir.y) < 0.9 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0)));
  objectNormal = normalize(side * normal.x + cross(side, dir) * normal.z);
}
vCrownN = normalize((modelMatrix * instanceMatrix * vec4(normal, 0.0)).xyz);
vSeed = aVar.y;
vArche = floor(aVar.x + 0.001);
vOcc = ${GLSL_OCC};
#ifdef USE_TANGENT
vec3 objectTangent = vec3( tangent.xyz );
#endif
`;
/** Fringe cards shrink away over this camera distance band (m); the cells hand over to cards at NEAR_DISTANCE
 *  (420 m) before it starts, so the fade only ever applies to the level-0 fallback */
const FRINGE_FADE_NEAR = 440;
const FRINGE_FADE_FAR = 520;
/** Vegetation shadow lookup: one sample per plant at the crown's sun-facing point (see
 *  VEG_SHADOWMAP_VERTEX); `vegShadowR` = 0 keeps the per-fragment lookup (trunks). */
const VEG_SHADOW_PROBE_VARS = /* glsl */ `
vec3 vegShadowC = vec3(0.0);
float vegShadowR = 0.0;
`;
const CROWN_VERTEX = /* glsl */ `
vec3 transformed = position;
${VEG_SHADOW_PROBE_VARS}
{
  float arche = floor(aVar.x + 0.001);
  int variant = int(floor(fract(aVar.x) * 16.0 + 0.5));
  float seed = aVar.y;
  float squash = aVar.z;
  float trunkLen = aVar.w;
  float cls = arche > 6.5 ? 2.0 : arche < 1.5 ? 0.0 : 1.0;
  // fringe cards carry the id of the puff they sit on (FRINGE_PART + puff) plus a per-card fraction
  bool fringe = aPart > ${FRINGE_PART - 0.5} && aPart < ${BRANCH_PART - 0.5};
  bool branch = aPart > ${BRANCH_PART - 0.5} && aPart < ${DISC_PART - 0.5};
  bool disc = aPart > ${DISC_PART - 0.5};
  float puffPart = fringe ? floor(aPart) - ${FRINGE_PART}.0 : aPart;
  float cardId = fringe ? fract(aPart) * 64.0 : 0.0;
  // per-plant anisotropy and crown height (the instance matrix yaws the whole plant already)
  float h1 = hash11(seed * 23.1 + 1.0), h2 = hash11(seed * 47.3 + 2.0);
  vec2 stretch = vec2(1.0 + 0.24 * (h1 - 0.5), 1.0 - 0.24 * (h1 - 0.5));
  float centreY = trunkLen + 0.85 * squash + 0.12 * (h2 - 0.5) * squash;
  vec3 iw = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  vLeafUv = vec2(0.0);
  // trunk: thinner on the spreading class and the pines, stouter on emergents and on the spreading
  // ficus-like broadleaf crowns (low squash); reaches into the main puff
  float tr = cls > 1.5 ? 0.7 : cls > 0.5 ? 0.6 : arche > 0.5 ? 1.3 : mix(1.5, 0.9, smoothstep(0.58, 1.05, squash));
  if (aPart < 0.5) {
    transformed.xz *= tr;
    transformed.y *= centreY - 0.3 * squash;
    // bark parts carry their height above the ground (crown centre = 1) in vRel.y for the base darkening
    vRel = vec3(0.0, transformed.y / centreY, 0.0);
  } else if (branch) {
    // limb from the trunk to the lobe (a mangrove's prop root to the ground): the ring shrinks toward the
    // tip and turns onto the limb's direction; a hidden lobe's limb collapses
    vec3 start, end;
    branchEnds(arche, cls, variant, int(aPart + 0.5) - ${BRANCH_PART}, squash, centreY, start, end);
    float size = LOBES[variant * 3 + int(aPart + 0.5) - ${BRANCH_PART} - 2].z;
    vec3 dir = normalize(end - start + vec3(0.0, 1e-4, 0.0));
    vec3 side = normalize(cross(dir, abs(dir.y) < 0.9 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0)));
    float t = position.y;
    // a grass tussock has no limbs
    float show = step(0.01, size) * (1.0 - step(4.5, arche) * step(arche, 5.5));
    float radius = 0.07 * tr * mix(0.75, 0.3, t) * show;
    transformed = mix(start, end, t) * show + (side * position.x + cross(side, dir) * position.z) * radius;
    transformed.xz *= stretch;
    transformed.y += centreY;
    vRel = vec3(0.0, transformed.y / centreY, 0.0);
  } else if (disc) {
    // root zone at the trunk base: a shallow mound (a hand's height at the trunk, the ground at its rim, which
    // the colour stage fades out) so it does not fight the terrain's depth; none under a mangrove (it stands
    // in the water) or a tussock
    float show = 1.0 - step(1.5, arche) * step(arche, 2.5) - step(4.5, arche) * step(arche, 5.5);
    float r = length(position.xz);
    transformed = (vec3(position.x, 0.0, position.z) * (0.07 * tr * 3.6) + vec3(0.0, 0.01 + 0.05 * (1.0 - r), 0.0)) * show;
    vRel = vec3(0.0);
    vLeafUv = uv;
  } else {
    vegShadowC = (modelMatrix * instanceMatrix * vec4(0.0, centreY, 0.0, 1.0)).xyz;
    vegShadowR = 1.2 * length(instanceMatrix[0].xyz);
    vec3 c = vec3(0.0);
    vec3 ps = vec3(1.15, squash, 1.05);
    if (puffPart > 1.5) {
      int k = int(puffPart + 0.5);
      c = lobeCentre(cls, variant, k, squash);
      float size = LOBES[variant * 3 + k - 2].z;
      if (cls < 0.5) ps *= size;
      else if (cls < 1.5) ps *= size * 1.15;
      else { ps *= size * 0.55; ps.y *= 0.7; }
    } else if (cls > 1.5) {
      ps.xz *= 0.6;
    } else if (cls < 0.5) {
      ps *= ${ROUND_MAIN};
    }
    // per-plant lumpiness: a smooth displacement field over the sphere, so the puff stays watertight
    float lump = vnoise(vec2(normal.x * 1.7 + normal.y * 0.8, normal.z * 1.7 - normal.y * 0.6) + seed * 31.0 + puffPart * 7.0);
    transformed = c + transformed * ps * (1.0 + 0.42 * (lump - 0.5));
    transformed.xz *= stretch;
    vRel = transformed / max(squash, 0.3);
    transformed.y += centreY;
    // wind hierarchy, second tier: each lobe rides on its own branch, so it rocks a little against the crown
    // at its own phase and a higher frequency than the trunk sway below (which moves the whole plant); the
    // main puff, on the stem, does not
    if (puffPart > 1.5) {
      float lp = seed * 17.0 + puffPart * 2.3;
      float lobeSway = sin(uTime * 2.1 + lp) * 0.7 + sin(uTime * 3.4 + lp * 1.7) * 0.3;
      transformed.x += lobeSway * uWind * 0.012 * ps.x;
      transformed.y += sin(uTime * 2.6 + lp * 1.3) * uWind * 0.006 * ps.y;
    }
    if (fringe) {
      // leaf-cluster card: the seed point is placed like any puff vertex, then the corners spread in the
      // camera's plane (the camera axes brought into instance space: rows of the model-view-instance
      // rotation). Size follows the puff, fades out with camera distance so no card pops at the level switch.
      mat4 MV = modelViewMatrix * instanceMatrix;
      vec3 right = normalize(vec3(MV[0][0], MV[1][0], MV[2][0]));
      vec3 up = normalize(vec3(MV[0][1], MV[1][1], MV[2][1]));
      float hc = hash11(seed * 13.7 + cardId * 0.37 + puffPart);
      float fade = 1.0 - smoothstep(${FRINGE_FADE_NEAR}.0, ${FRINGE_FADE_FAR}.0, length(cameraPosition - iw));
      // the species' leaf: a sea grape's clusters are big round leaves (larger cards), a pine's needle
      // tufts (smaller, more of the outline left to the tiers), a mangrove's small and dense
      bool grape = arche > 5.5 && arche < 6.5;
      float leafScale = grape ? 1.35 : cls > 1.5 ? 0.8 : (arche > 1.5 && arche < 2.5) ? 0.85 : 1.0;
      float sz = ps.x * (0.6 + 0.3 * hc) * fade * leafScale;
      vec2 corner = uv - 0.5;
      // per-card spin: the same cluster tile reads as different clusters
      float spin = hc * 6.2831;
      corner = mat2(cos(spin), -sin(spin), sin(spin), cos(spin)) * corner;
      transformed += (right * corner.x + up * corner.y) * sz;
      // third tier: the leaf clusters themselves flutter, small and quick, each at its own phase, so the
      // outline of a crown shimmers while its mass sways
      float fp = uTime * (4.2 + 2.0 * hc) + hc * 40.0 + puffPart;
      transformed += (right * sin(fp) + up * (0.5 * cos(fp * 1.3))) * (uWind * 0.02 * sz);
      // leaf-cluster tile: hardwoods draw from the two cluster tiles, the sea grape its round leaves (2),
      // the pine its needle tufts (3)
      float tile = grape ? 2.0 : cls > 1.5 ? 3.0 : floor(hash11(seed * 7.9 + cardId * 1.13) * 2.0);
      vLeafUv = (uv + vec2(mod(tile, 2.0), floor(tile / 2.0))) * vec2(${(1 / LEAF_COLS).toFixed(4)}, ${(1 / LEAF_ROWS).toFixed(4)});
    }
  }
  // wind: sway grows with height, phase from the instance position so no two plants move together
  float phase = iw.x * 0.13 + iw.z * 0.17;
  float sway = sin(uTime * 1.3 + phase) * 0.6 + sin(uTime * 2.7 + phase * 1.9) * 0.4;
  float k = transformed.y * transformed.y * uWind * 0.035;
  transformed.x += sway * k;
  transformed.z += cos(uTime * 1.1 + phase) * k * 0.6;
  vPart = aPart;
  vWP = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;
}
`;
const CROWN_FRAG_PARS = /* glsl */ `
varying float vPart;
varying vec3 vWP;
varying vec3 vCrownN;
varying vec3 vRel;
varying float vSeed;
varying float vArche;
varying float vOcc;
varying vec2 vLeafUv;
uniform sampler2D uLeaf;
float vegNear; // 1 within ~200 m of the camera, 0 beyond 320 m: gates the close-range leaf detail
${GLSL_NOISE}
`;
const CROWN_FRAG = /* glsl */ `
#include <color_fragment>
{
  vec3 toCam = cameraPosition - vWP;
  float camDist = length(toCam);
  vegNear = 1.0 - smoothstep(200.0, 320.0, camDist);
  // the hard parts (bark, root zone) take the full per-fragment shadow: no leaf floor
  vegHard = vPart < 0.5 || vPart > ${BRANCH_PART - 0.5} ? 1.0 : 0.0;
  if (vPart > ${DISC_PART - 0.5}) {
    // root zone: leaf litter and bare earth in a ragged patch about the trunk, fading out toward its rim
    // (the crown's shadow falls on it too, so the tree stands in a dark ring instead of on untouched lawn)
    float r = length(vLeafUv);
    float rim = 0.55 + 0.45 * vnoise(vWP.xz * 1.4 + vSeed);
    float a = 1.0 - smoothstep(0.2 * rim, rim, r);
    if (a < 0.04) discard;
    diffuseColor.a = a;
    diffuseColor.rgb = vec3(0.27, 0.22, 0.13) * (0.7 + 0.5 * vnoise(vWP.xz * 5.0)) * mix(0.8, 1.15, vnoise(vWP.xz * 1.1 + 5.0));
    // the ground under a crown sees the sky through its leaves only, less still among taller neighbours
    vegAmb = mix(0.55, 0.3, vOcc);
  } else if (vPart < 0.5 || vPart > ${BRANCH_PART - 0.5}) {
    // bark (trunk and limbs): grey-brown, paler on the pines; furrowed along the grain and darker toward the
    // ground, where the crown shades it and the moss sits
    vec3 bark = vArche > 6.5 ? vec3(0.4, 0.29, 0.21) : vec3(0.3, 0.24, 0.18);
    float grain = vnoise(vWP.xz * 3.0 + vWP.y * 2.0);
    float furrow = vnoise(vec2(vWP.x * 7.0 + vWP.z * 5.0, vWP.y * 0.9));
    diffuseColor.rgb = bark * (0.65 + 0.4 * grain + 0.3 * furrow) * mix(0.55, 1.0, smoothstep(0.0, 0.3, vRel.y));
    // a trunk stands under its own crown: it sees the sky only low around the horizon (half of it at the
    // base, a fifth up in the crown where the limbs are), and less among taller neighbours; with the full
    // sky it read as a pale grey post against the lawn its crown shades
    vegAmb = mix(0.5, 0.22, vOcc) * mix(1.0, 0.45, smoothstep(0.3, 0.9, vRel.y));
  } else {
    vec3 cn = normalize(vCrownN);
    if (vPart > ${FRINGE_PART - 0.5}) {
      // leaf-cluster card: the cut-out is the coverage (alpha to coverage under MSAA; a soft ramp so the
      // mip-mapped alpha never flips a whole card between frames), per-leaf shading in R
      vec4 leaf = texture2D(uLeaf, vLeafUv);
      float a = smoothstep(0.3, 0.7, leaf.a);
      if (a < 0.2) discard;
      diffuseColor.a = a;
      diffuseColor.rgb *= 0.75 + 0.5 * leaf.r;
    } else if (vegNear > 0.0) {
      // close range: the puff is a shell of leaves with gaps between them — the outer band of each puff
      // dissolves with leaf-cluster noise so the silhouette reads as ragged foliage instead of a 20-facet
      // ball (a few px of the outline; fades out by 320 m), and inside 150 m the species' leaf carpet is
      // laid over the face in world space (on the plane facing the puff normal, a tile per 1.4 m) and its
      // gaps open — wider in the hollows of the cluster field — so the far side of the shell shows through,
      // dark (a smooth ball of plasticine at 5-50 m otherwise: the rim alone does not say "leaves"); a soft
      // coverage ramp for the MSAA dither
      float facing = abs(dot(cn, toCam / max(camDist, 1e-3)));
      float clusters = vnoise(vWP.xz * 1.1 + vWP.y * 0.9) * 0.65 + 0.35 * vnoise(vWP.xz * 3.3 - vWP.y * 2.6);
      float close = 1.0 - smoothstep(40.0, 150.0, camDist);
      // triplanar: the carpet sampled on the three world planes and blended by the puff normal (a hard
      // pick of one plane drew straight seams across the puff where its 20 facets change plane, and
      // stretched the leaves into streaks on the oblique ones)
      vec3 tw = pow(abs(cn), vec3(4.0));
      tw /= tw.x + tw.y + tw.z;
      vec2 tileO = vec2(vArche > 6.5 ? 1.0 : 0.0, 2.0);
      vec2 tsc = vec2(${(1 / LEAF_COLS).toFixed(4)}, ${(1 / LEAF_ROWS).toFixed(4)});
      vec2 p0 = vWP.zy * 0.7 + vSeed, p1 = vWP.xz * 0.7 + vSeed * 1.7, p2 = vWP.xy * 0.7 + vSeed * 2.3;
      vec2 lt = textureGrad(uLeaf, (fract(p0) + tileO) * tsc, dFdx(p0) * tsc, dFdy(p0) * tsc).ra * tw.x
              + textureGrad(uLeaf, (fract(p1) + tileO) * tsc, dFdx(p1) * tsc, dFdy(p1) * tsc).ra * tw.y
              + textureGrad(uLeaf, (fract(p2) + tileO) * tsc, dFdx(p2) * tsc, dFdy(p2) * tsc).ra * tw.z;
      // positive where the surface goes: the rim band, and the carpet's gaps (its coverage against a
      // threshold that rises in the cluster hollows and falls to nothing beyond 150 m)
      float gapThr = mix(-0.2, 0.45 + 0.3 * (0.5 - clusters), close);
      float cut = max(0.6 * clusters * vegNear - facing, (gapThr - lt.y) * 0.3);
      float a = 1.0 - smoothstep(-0.03, 0.03, cut);
      if (a < 0.1) discard;
      diffuseColor.a = a;
      // the leaves' own shade, and the inside of the shell seen through the gaps: the shaded hollow of the crown
      diffuseColor.rgb *= mix(1.0, 0.55 + 0.6 * lt.x, close);
      if (!gl_FrontFacing) diffuseColor.rgb *= 0.5;
    }
    // per-plant hue and value jitter on top of the palette tint: neighbours differ in warmth and depth
    float yellow = hash11(vSeed * 41.7 + 3.0);
    float value = 0.86 + 0.28 * hash11(vSeed * 19.3 + 5.0);
    diffuseColor.rgb *= value * mix(vec3(0.95, 1.0, 1.05), vec3(1.07, 1.02, 0.9), yellow);
    // crown-space hemisphere: the cap follows the whole crown (position relative to its centre) as much as
    // the individual puff, so the seams where puffs intersect do not read as hard facets. The sky cap is
    // straight up; the sunlit cap tilts toward the sun (its world direction, from the view-space light), so
    // the side of a crown away from the sun shades itself the way the cards' sun side does, and the
    // handover from 3D crowns to cards at NEAR_DISTANCE does not change the canopy's tone
    vec3 crownDir = 0.5 * cn + 0.5 * normalize(vRel);
    float capUp = smoothstep(-0.5, 0.85, crownDir.y);
    vec3 sunW = vec3(0.0, 1.0, 0.0);
    #if NUM_DIR_LIGHTS > 0
    sunW = normalize((vec4(directionalLights[0].direction, 0.0) * viewMatrix).xyz);
    #endif
    // leaf clusters: fine value noise breaks the smooth shading of the puffs, and the sunlit cap follows
    // it — the raised clusters catch the sun, the hollows between them stay in shade — so a crown reads as
    // a mottled clump of lit tips rather than a shaded ball (the cards' terminator follows their atlas
    // clusters the same way)
    float leaf = vnoise(vWP.xz * 1.7 + vWP.y * 1.3);
    float cap = smoothstep(-0.35, 0.8, dot(crownDir, normalize(vec3(0.0, 1.0, 0.0) + 0.9 * sunW)) + 0.5 * (leaf - 0.5));
    // how far this point stands under the neighbours' canopy: the lower crown of a plant in a dense stand
    // (its underside and sides most, its cap least) — the pale sunlit leaf belongs to the crown top and the
    // free sides only, and the sun that the per-plant shadow probe lets through is theirs too (under the
    // park canopy the lower puffs stood lit like a lone tree's)
    float buried = vOcc * (1.0 - 0.6 * capUp);
    cap *= 1.0 - 0.7 * buried;
    // the sunlit leaf is a pale warm yellow-green, the leaf in the shade of its own crown a deep neutral
    // green (not blue: the sky bounce already cools it): the albedo itself carries the split (the direct
    // light model only decides how much sun each side gets)
    vec3 sunlit = diffuseColor.rgb * vec3(1.52, 1.36, 1.26);
    vec3 shade = diffuseColor.rgb * vec3(0.5, 0.49, 0.42);
    diffuseColor.rgb = mix(shade, sunlit, cap);
    // sky light: the cap sees the whole sky, the underside a little ground bounce; a plant standing among
    // taller neighbours sees their leaves instead of the sky (its cap too: they overtop it)
    vegUp = mix(0.35, 1.0, capUp);
    vegOcc = vOcc * (1.0 - 0.35 * capUp);
    // and a share of the sun: the shadow probe (one lookup per plant) misses the leaves of the neighbours
    // that lean over this crown's lower half (the cards darken by 0.5 vOcc, their base by 0.35 more)
    diffuseColor.rgb *= 1.0 - 0.5 * buried;
    // the cluster field's own shading (peaks pale, hollows dark); gaps between cluster groups darken
    diffuseColor.rgb *= 0.82 + 0.36 * leaf;
    diffuseColor.rgb *= 1.0 - 0.3 * smoothstep(0.62, 0.9, vnoise(vWP.xz * 0.55 + vWP.y * 0.4 + 17.0));
  }
}
`;
/** After the normal is known: leaf-cluster normal perturbation up close (sparkly, uneven lit clusters
 *  rather than smooth facets). */
const CROWN_NORMAL_FRAG = /* glsl */ `
#include <normal_fragment_begin>
if (vPart > 0.5 && vPart < ${BRANCH_PART - 0.5} && vegNear > 0.0) {
  // leaf clusters ~1.2 m across: the gradient of a value noise field tilts the normal cluster by cluster
  float e = 0.25;
  vec2 p = vWP.xz * 0.85;
  float py = vWP.y * 0.7;
  float n0 = vnoise(p + py);
  float nx = vnoise(p + vec2(e, 0.0) + py);
  float nz = vnoise(p + vec2(0.0, e) + py);
  float ny = vnoise(p + py + e);
  vec3 g = (viewMatrix * vec4(nx - n0, ny - n0, nz - n0, 0.0)).xyz / e;
  normal = normalize(normal + 0.4 * vegNear * g);
}
`;

/** Per-family parameters of the foliage light model. `wrap` is how far past the terminator the diffuse
 *  term reaches (0 = Lambert), `floor` the fraction of the sun a face turned away from it still gets
 *  (light scattered out of the leaf mass), `trans` the strength of the sun seen through the leaves. */
interface FoliageLight { wrap: number; floor: number; trans: number; rim?: boolean }
/** Crowns: a low wrap and floor so the puffs keep a real sun side and shade side (0.5 / 0.14 lit every
 *  side of a crown alike and the canopy read as a flat green mass); the crown-space hemisphere and the
 *  neighbour occlusion below carry the rest of the volume shading; the translucency is a rim effect (the
 *  puff is a leaf mass metres deep, thin only at its outline). */
const CROWN_LIGHT: FoliageLight = { wrap: 0.22, floor: 0.05, trans: 0.8, rim: true };
/** Palms: thin fronds are lit through, so they keep the high wrap, floor and translucency (the crown
 *  parameters left every frond that faced away from the sun dead grey). */
const PALM_LIGHT: FoliageLight = { wrap: 0.6, floor: 0.28, trans: 0.7 };
/** Cards: one flat up-facing normal per plant; the sun side is painted in the card shader, so the light
 *  model only sets the overall level. */
const CARD_LIGHT: FoliageLight = { wrap: 0.5, floor: 0.14, trans: 0.5 };

/** Light model for foliage, replacing the physical RE_* functions. Direct: wrapped diffuse (a leaf mass
 *  is lit past the terminator), a translucency term (sun through the leaves toward a viewer on the far
 *  side, in the crown's own yellow-shifted colour) and a damped specular. The CSM chunk hands over
 *  `directLight` with the shadow term already applied, so shadows and cascade blending still work.
 *  Indirect: the sky / environment light is weighted by `vegUp` (a crown-space hemisphere: the cap sees
 *  the whole sky, the underside a little ground bounce) and darkened by `vegOcc` (how much taller
 *  canopy stands around this plant), both set per fragment by the family's colour stage, so the lower
 *  crown in a dense stand goes dark instead of every leaf getting the same ambient. three adds the
 *  environment map's diffuse in RE_IndirectSpecular (the multi-scatter split), which is why that
 *  function is overridden too. */
const foliageLighting = (isFoliage: string, p: FoliageLight) => /* glsl */ `
#include <lights_physical_pars_fragment>
float vegUp = 1.0;
float vegOcc = 0.0;
// share of the sky the hard parts see (set by the colour stage): a trunk under its own crown in a dense
// stand sees a quarter of it, and took the whole of it (a pale grey post against the shaded lawn)
float vegAmb = 1.0;
void RE_Direct_Foliage( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
  float foliage = ${isFoliage};
  float ndl = dot( geometryNormal, directLight.direction );
  float wrap = ${p.wrap.toFixed(3)} * foliage;
  // the sun that enters the crown from the top scatters out of every side: a floor under the wrapped term,
  // so a puff facing away from the sun is lit like the inside of the leaf mass rather than a hard surface
  float dotNL = max( saturate( ( ndl + wrap ) / ( 1.0 + wrap ) ), ${p.floor.toFixed(3)} * foliage );
  float back = saturate( dot( -directLight.direction, geometryViewDir ) );
  // the sun through the leaves: on a crown only where the leaf mass is thin, at the rim of the puff seen
  // against the light (a face turned to the camera is metres of leaves deep: the undersides of a canopy
  // seen from below glowed mustard yellow as if one leaf thick); a frond or a card is one leaf
  float nv = saturate( dot( geometryNormal, geometryViewDir ) );
  float thin = ${p.rim ? '( 1.0 - nv ) * ( 1.0 - 0.5 * nv )' : '1.0'};
  float trans = ${p.trans.toFixed(3)} * foliage * back * back * saturate( 0.7 - 0.7 * ndl ) * thin;
  vec3 irradiance = dotNL * directLight.color;
  reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
  reflectedLight.directDiffuse += ( trans * directLight.color ) * BRDF_Lambert( material.diffuseColor * vec3( 1.05, 1.1, 0.8 ) );
  // specular only where the surface really faces the light (the wrapped term would blow the GGX up at grazing angles)
  reflectedLight.directSpecular += ( saturate( ndl ) * directLight.color ) * BRDF_GGX( directLight.direction, geometryViewDir, geometryNormal, material ) * mix( 1.0, 0.35, foliage );
}
// a crown is a scattering volume, not a solid surface: leaves light each other, so the shade side sees
// more of the sky and ground bounce than its own normal alone would collect, and sky light that enters
// from the top comes back out of the sides and underside; how much of the sky a leaf sees is the
// crown-space hemisphere (vegUp) less the neighbouring canopy (vegOcc)
float vegSky( const in float foliage ) {
  return mix( 1.0, vegUp * ( 1.0 - 0.8 * vegOcc ), foliage );
}
void RE_IndirectDiffuse_Foliage( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
  float foliage = ${isFoliage};
  vec3 irr = irradiance;
  #ifdef USE_ENVMAP
  irr = mix( irr, getIBLIrradiance( vec3( 0.0, 1.0, 0.0 ) ) * vec3( 1.0, 1.0, 0.85 ), 0.5 * foliage );
  #endif
  // the ambient is kept at the level of a plain surface (the old 1.6x boost, on top of the sky term three adds
  // in RE_IndirectSpecular, filled the shade side with blue sky light: no crown could go dark) and tinted
  // by the leaves it has bounced off
  reflectedLight.indirectDiffuse += irr * BRDF_Lambert( material.diffuseColor ) * mix( vec3( 1.0 ), vec3( 1.0, 0.96, 0.7 ), foliage ) * vegSky( foliage ) * vegAmb;
}
void RE_IndirectSpecular_Foliage( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
  float foliage = ${isFoliage};
  float sky = vegSky( foliage ) * vegAmb;
  // the sky's reflection off the leaf mass is kept low: on the shade side of a crown the 4 % Fresnel of a
  // blue sky was as bright as the leaf itself and every shaded crown went cyan
  RE_IndirectSpecular_Physical( radiance * mix( vegAmb, 0.6 * sky, foliage ), irradiance * sky, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
}
#undef RE_Direct
#define RE_Direct RE_Direct_Foliage
#undef RE_IndirectDiffuse
#define RE_IndirectDiffuse RE_IndirectDiffuse_Foliage
#undef RE_IndirectSpecular
#define RE_IndirectSpecular RE_IndirectSpecular_Foliage
`;

// palm family: per-instance frond rotation and droop about the trunk top, trunk lean
const PALM_NORMAL = /* glsl */ `
vec3 objectNormal = normal;
vSeed = aVar.y;
vOcc = ${GLSL_OCC};
if (aPart > 0.5) {
  float seed = aVar.y;
  float rot = hash11(seed * 7.7 + aPart) * 0.9 - 0.45 + hash11(seed * 3.3) * 6.2831;
  float c = cos(rot), s = sin(rot);
  objectNormal.xz = mat2(c, -s, s, c) * objectNormal.xz;
}
#ifdef USE_TANGENT
vec3 objectTangent = vec3( tangent.xyz );
#endif
`;
const PALM_VERTEX = /* glsl */ `
vec3 transformed = position;
${VEG_SHADOW_PROBE_VARS}
{
  float seed = aVar.y;
  float lean = 0.03 + 0.12 * hash11(seed * 5.1);
  float leanDir = hash11(seed * 9.3) * 6.2831;
  if (aPart > 0.5) {
    vegShadowC = (modelMatrix * instanceMatrix * vec4(cos(leanDir) * lean, 1.0, sin(leanDir) * lean, 1.0)).xyz;
    vegShadowR = 0.6 * length(instanceMatrix[0].xyz);
    float rot = hash11(seed * 7.7 + aPart) * 0.9 - 0.45 + hash11(seed * 3.3) * 6.2831;
    float c = cos(rot), s = sin(rot);
    vec3 rel = transformed - vec3(0.0, 1.0, 0.0);
    rel.xz = mat2(c, -s, s, c) * rel.xz;
    // a little extra per-frond droop toward the tip (uv.y = 1 at the base, 0 at the tip) on top of the
    // geometry's arc, kept small so the crown stays the compact coconut star the atlas card draws (the
    // old 0.6-1.4 x squash hung the tips a trunk length down: "weeping willow" palms); some fronds hang dead
    float t = 1.0 - uv.y;
    float dead = step(0.86, hash11(seed * 2.9 + aPart * 1.3));
    rel.y -= aVar.z * t * t * (0.03 + 0.12 * hash11(seed * 2.9 + aPart)) + dead * t * 0.5;
    rel.xz *= 1.0 - dead * 0.35 * t;
    // wind on the fronds: each bobs on its own petiole at its own phase, the tip more than the base and
    // lagging it (the wave runs out along the rachis), on top of the trunk sway below that moves the crown
    // as a whole; the dead fronds hang still
    float fp = seed * 23.0 + aPart * 2.9;
    float bob = sin(uTime * 2.3 + fp - t * 1.6) * 0.7 + sin(uTime * 3.7 + fp * 1.3 - t * 2.5) * 0.3;
    rel.y += bob * uWind * 0.03 * t * t * (1.0 - dead);
    rel.xz += normalize(rel.xz + 1e-4) * cos(uTime * 1.9 + fp) * uWind * 0.012 * t * t * (1.0 - dead);
    // and the leaflet groups quiver about the rachis (the fin's edge moves, its hinge on the rachis does
    // not), quick and small: the thin leaves move more than the frond they hang on
    float fin = abs(uv.x - 0.25) * 4.0;
    rel.y += sin(uTime * 5.3 + fp * 2.1 + t * 9.0) * uWind * 0.012 * fin * t * (1.0 - dead);
    transformed = vec3(0.0, 1.0, 0.0) + rel;
  }
  float bend = lean * transformed.y * transformed.y;
  transformed.x += cos(leanDir) * bend;
  transformed.z += sin(leanDir) * bend;
  vec3 iw = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  float phase = iw.x * 0.13 + iw.z * 0.17;
  float sway = sin(uTime * 1.3 + phase) * 0.6 + sin(uTime * 2.7 + phase * 1.9) * 0.4;
  float k = transformed.y * transformed.y * uWind * 0.06;
  transformed.x += sway * k;
  transformed.z += cos(uTime * 1.1 + phase) * k * 0.6;
  vPart = aPart;
  vWP = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;
}
`;
const PALM_FRAG = /* glsl */ `
#include <color_fragment>
if (vPart > 0.5) {
  // fronds: tint x grey shading from the atlas (like the cards), lit tips yellow like the crowns' sunlit cap;
  // per-plant frond warmth and value
  float yellow = hash11(aVarSeed * 41.7 + 3.0);
  // coverage ramp on the leaflet comb whose threshold follows the sampled mip level: up close (mip 0-1) the
  // comb's blades and gaps resolve; once the strip is a few texels wide the mip average (~0.5 over the comb)
  // replaces the blades, and the threshold drops so the strip closes to a solid frond instead of dissolving
  // into a wiry stipple (a fixed threshold aliased the comb past 60 m)
  vec2 texel = fwidth(vMapUv) * vec2(${FROND_TEX_W}.0, ${FROND_TEX_H}.0);
  float lod = log2(max(max(texel.x, texel.y), 1.0));
  float thr = mix(0.5, 0.2, smoothstep(0.6, 2.6, lod));
  float a = smoothstep(thr - 0.16, thr + 0.16, diffuseColor.a);
  if (a < 0.2) discard;
  diffuseColor.a = a;
  diffuseColor.rgb *= mix(vec3(0.86, 0.9, 0.96), vec3(1.06, 1.03, 0.92), smoothstep(0.55, 0.95, sampledDiffuseColor.r));
  diffuseColor.rgb *= (0.84 + 0.32 * hash11(aVarSeed * 19.3 + 5.0)) * mix(vec3(0.94, 1.0, 1.05), vec3(1.08, 1.03, 0.88), yellow);
} else {
  // trunk: grey-brown bark, the ring shading from the atlas (the instance tint is the frond colour); it sees
  // the sky past its own small crown, less among taller neighbours (a pale post in a shaded grove otherwise)
  diffuseColor.rgb = vec3(0.34, 0.29, 0.24) * (0.5 + 0.9 * sampledDiffuseColor.r);
  vegAmb = mix(0.7, 0.3, vOcc);
}
`;

/** Fronds are thin leaves: seen from below they are lit through, so the underside keeps the upper side's
 *  normal instead of the flipped one three gives double-sided back faces (which made every frond seen from
 *  under or behind a black stroke). */
const PALM_NORMAL_FRAG = /* glsl */ `
#include <normal_fragment_begin>
#ifdef DOUBLE_SIDED
if (vPart > 0.5) normal *= faceDirection;
#endif
`;

/** Replaces <shadowmap_vertex>. A crown is a translucent mass of leaves, not a hard ball: looking the
 *  shadow map up per fragment against the light-facing shadow cards cuts planar dark facets across
 *  every 3D crown (its own card passes through its centre), and the impostor cards sampled at the
 *  trunk base so a dense canopy read as one shadowed mass from the air. Foliage takes one sample per
 *  plant instead, at the crown's sun-facing point (centre pushed toward the light by the crown radius):
 *  a tree is shaded only when a taller upstream neighbour or a building covers that point. The light
 *  direction is the depth gradient of the shadow matrix, so no extra uniform is needed. */
const VEG_SHADOWMAP_VERTEX = /* glsl */ `
#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
vec3 vegL = normalize(vec3(directionalShadowMatrix[ 0 ][0][2], directionalShadowMatrix[ 0 ][1][2], directionalShadowMatrix[ 0 ][2][2]));
vec4 vegShadowPos = vegShadowR > 0.0 ? vec4(vegShadowC - vegL * vegShadowR, 1.0) : worldPosition;
#else
#define vegShadowPos worldPosition
#endif
${THREE.ShaderChunk.shadowmap_vertex.replace(/worldPosition/g, 'vegShadowPos')}
`;
/** Foliage is never fully shadowed: leaves scatter and pass light, so a crown under a taller neighbour
 *  or a building keeps a fifth of the direct sun instead of going black. Wraps three's getShadow. */
const VEG_SHADOW_PARS_FRAG = /* glsl */ `
#include <shadowmap_pars_fragment>
// 1 on the hard parts (bark: trunk, limbs, the root zone), which take the full shadow like any solid
// surface — a trunk under its own crown stands in the dark with the ground around it
float vegHard = 0.0;
#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
float vegShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
  return mix( 0.2 * ( 1.0 - vegHard ), 1.0, getShadow( shadowMap, shadowMapSize, shadowIntensity, shadowBias, shadowRadius, shadowCoord ) );
}
#endif
`;
function softenFoliageShadow(fragmentShader: string): string {
  // the CSM patches ShaderChunk.lights_fragment_begin (where the lookups are) and three expands the
  // include only after onBeforeCompile, so the chunk is expanded here and its lookups renamed; the
  // wrapper inserted afterwards must keep calling getShadow
  const lights = THREE.ShaderChunk.lights_fragment_begin.replace(/\bgetShadow\(/g, 'vegShadow(');
  return fragmentShader.replace('#include <lights_fragment_begin>', lights).replace('#include <shadowmap_pars_fragment>', VEG_SHADOW_PARS_FRAG);
}

// cards: screen-aligned quads over the plant; texture blends side/top views with elevation
const CARD_VERT_PARS = /* glsl */ `
attribute vec4 aVar; // archetype + layout variant / 16 + neighbour occlusion / 256, seed, card width (unit), card half height (unit) = crown centre height
varying vec2 vCardUv;
varying float vElev;
varying vec2 vTile; // atlas column (variant) and row (shape class) of the side view; the top view is 4 rows further
varying float vFar; // 0 within ~800 m of the camera, 1 beyond 3 km: the distant-canopy blend
varying vec2 vDisc; // screen-plane offset from the crown centre in crown radii (x right, y up; not mirrored)
varying float vCardOcc; // neighbour-density occlusion of the plant
varying float vCardVar; // per-plant hash: the paler and darker individuals of a distant canopy
// crown centre (fraction of the tile height) per shape class, from the atlas tile proportions
const float CARD_VC[4] = float[4](${CARD_CLASSES.map((c) => c.vc.toFixed(4)).join(', ')});
`;
const CARD_PROJECT = /* glsl */ `
vec4 mvPosition;
${VEG_SHADOW_PROBE_VARS}
{
  float arche = floor(aVar.x + 0.001);
  float variant = floor(fract(aVar.x) * 16.0 + 0.5);
  vCardOcc = ${GLSL_OCC};
  vCardVar = fract(aVar.y * 91.7);
  vec4 centre = instanceMatrix * vec4(0.0, aVar.w, 0.0, 1.0);
  vec3 wc = (modelMatrix * centre).xyz;
  float s = length(instanceMatrix[0].xyz);
  vegShadowC = wc;
  vegShadowR = (arche > 3.5 && arche < 4.5 ? 0.6 : 1.2) * s;
  vec3 toCam = cameraPosition - wc;
  // the top view starts blending in from ~8 deg of elevation: a canopy seen from a shallow aerial angle
  // shows mostly lit tops, not the shaded flanks of the side view
  vElev = smoothstep(0.12, 0.75, abs(toCam.y) / max(length(toCam), 1.0));
  vec4 mvCentre = modelViewMatrix * centre;
  // mirror every other card so the same atlas tile reads as two silhouettes
  float flip = step(0.5, fract(aVar.y * 37.0)) * 2.0 - 1.0;
  // beyond ~800 m the cards grow a little so neighbours overlap into one canopy instead of a stipple of
  // separate dots with ground between them (camera passes only: the shadow cards keep their size); kept
  // small, since the reference canopy does show ground in its gaps and a grown card reads as a bigger ball
  #ifdef VEG_DEPTH
  vFar = 0.0;
  #else
  vFar = smoothstep(800.0, 3000.0, length(toCam));
  #endif
  mvPosition = mvCentre + vec4(position.xy * vec2(aVar.z, 2.0 * aVar.w) * s * (1.0 + 0.15 * vFar), 0.0, 0.0);
  gl_Position = projectionMatrix * mvPosition;
  vCardUv = vec2(flip > 0.0 ? uv.x : 1.0 - uv.x, uv.y);
  float cls = arche > 3.5 && arche < 4.5 ? 3.0 : arche > 6.5 ? 2.0 : arche < 1.5 ? 0.0 : 1.0;
  vTile = vec2(variant, cls);
  // offset from the crown centre in crown radii (half the card width): the sun-side split is measured here
  vDisc = vec2(position.x * 2.0, (uv.y - CARD_VC[int(cls + 0.5)]) * 4.0 * aVar.w / max(aVar.z, 1e-3));
}
`;
const CARD_FRAG_PARS = /* glsl */ `
uniform sampler2D uAtlas;
uniform vec3 uCanopyMean; // linear albedo the far cards converge on (the mean of the planted tints)
varying vec2 vCardUv;
varying float vElev;
varying vec2 vTile;
varying float vFar;
varying vec2 vDisc;
varying float vCardOcc;
varying float vCardVar;
float vTrunk = 0.0; // trunk mask of the sampled texel (bark is lit as a plain surface, not as foliage)
vec4 cardSample() {
  // canvas row r (top down) is texture v in [1 - (r + 1) / 8, 1 - r / 8]; the top view sits 4 rows lower
  vec2 side = vec2(vCardUv.x + vTile.x, 7.0 - vTile.y + vCardUv.y) / ${ATLAS_N}.0;
  vec2 top = vec2(vCardUv.x + vTile.x, 3.0 - vTile.y + vCardUv.y) / ${ATLAS_N}.0;
  return mix(texture2D(uAtlas, side), texture2D(uAtlas, top), vElev);
}
`;
const CARD_DEPTH_FRAG = /* glsl */ `
{
  diffuseColor.a = cardSample().a;
}
`;
const CARD_FRAG = /* glsl */ `
#include <color_fragment>
{
  vec4 t = cardSample();
  // coverage: a ramp about the cut-out threshold as wide as the alpha changes over a pixel (a hard test on
  // the mip-mapped alpha flips texels between frames as a card drifts sub-pixel); alpha to coverage
  // dithers the ramp under MSAA. Far away the threshold drops so thinned, mip-averaged cards keep their
  // footprint and the canopy stays closed instead of dissolving into dots.
  float thr = mix(0.5, 0.32, vFar);
  float w = clamp(fwidth(t.a) * 0.75, 0.04, 0.25);
  float a = smoothstep(thr - w, thr + w, t.a);
  if (a < 0.3) discard;
  diffuseColor.a = a;
  // sun side: the sun's screen direction decides which side of the disc is lit. A real crown is not a
  // ball: seen from the air only its top clusters catch the sun and the rest shades itself (the reference
  // canopy is dark with lit tips), so the terminator sits well past where a sphere's would: a quarter
  // radius toward the sun with the sun beside the camera (~40 % of the disc lit), near the centre with the
  // sun behind it (a sphere would be lit whole and the canopy went flat), a half radius when the sun is
  // ahead. With the sun straight behind the camera the split fades (nothing decides a side) and the
  // neighbour occlusion below carries the darks
  vec3 sunV = vec3(0.0, 0.7, 0.7);
  float sunOn = 0.0;
  #if NUM_DIR_LIGHTS > 0
  sunV = directionalLights[0].direction;
  sunOn = smoothstep(0.0, 0.3, max(directionalLights[0].color.r, directionalLights[0].color.g));
  #endif
  vec2 sunDir = sunV.xy / max(length(sunV.xy), 1e-3);
  float proj = min(length(sunV.xy) * 4.0, 1.0);
  // far away the lit share shrinks to the crown tops (the reference's distant canopy is dark with small
  // bright tips)
  float term = 0.25 - 0.4 * sunV.z + 0.15 * vFar;
  // the terminator follows the leaf clusters (the atlas shading about its mean): the raised clusters on
  // the sun side catch the light and the hollows between them stay in shade, so from the air a crown is a
  // mottled clump of lit tips and dark gaps (the reference canopy), not a ball with a lit half
  float clusters = t.r - 0.68;
  float lit = mix(0.5, mix(0.5, smoothstep(term - 0.16, term + 0.16, dot(vDisc, sunDir) + clusters), proj), sunOn);
  // lit leaf mass yellows, shaded parts cool off: matches the 3D crowns' albedo split; the trunk mask
  // paints bark instead of tinted foliage
  float shade = mix(t.r, 0.8, 0.5 * vFar);
  vec3 foliage = diffuseColor.rgb * shade * mix(vec3(0.86, 0.9, 0.95), vec3(1.03, 1.02, 0.96), smoothstep(0.4, 1.05, shade));
  // distant canopy: the per-plant tints move toward the canopy mean so a far island reads as one wooded
  // mass, not a brown / green speckle — but only part way, so the odd paler or darker crown still breaks
  // the mass up as the reference's does; the lit / shade split stays as a 0.5-1.75 modulation there
  foliage = mix(foliage, uCanopyMean * shade, 0.35 * vFar);
  // and the individuals differ: a distant canopy is a mix of paler and darker crowns (species, age, the
  // odd emergent in full sun), not one tone repeated
  foliage *= mix(1.0, mix(0.78, 1.28, vCardVar), vFar);
  // the sunlit leaf is a pale yellow-green (the reference's lit band over the canopy alone: sRGB
  // [124, 133, 119], saturation 0.1), the shaded leaf a dark neutral green ([46, 53, 47], saturation 0.12 —
  // not the cyan the sky light alone would leave): the lit side is pushed toward that pale yellow-green,
  // the shade side deep and warmer than the leaf so the blue sky bounce does not tint it
  // (measured r12 against the reference over the island canopy: shade [46, 56, 53] hue 158° vs [53, 60, 54]
  // hue 125° — still cyan, so its red comes up; lit [131, 139, 107] vs [148, 147, 130] — too green, so its
  // red and blue come up)
  foliage *= mix(mix(vec3(0.35, 0.33, 0.25), vec3(2.15, 1.9, 1.85), lit), vec3(mix(0.42, 2.0, lit)), vFar);
  // a crown overtopped by its neighbours stands in their shadow (the occlusion packed in aVar.x): the
  // whole card darkens, its base most, so the inside of a dense stand goes dark and the emergent crowns
  // stand out lit
  float base = 1.0 - smoothstep(-0.3, 0.9, vDisc.y);
  foliage *= (1.0 - 0.5 * vCardOcc) * (1.0 - 0.35 * vCardOcc * base);
  vec3 bark = vec3(0.3, 0.24, 0.18) * t.r * 1.6;
  diffuseColor.rgb = mix(foliage, bark, t.g);
  vTrunk = t.g;
  vegUp = mix(0.4, 1.0, smoothstep(-0.8, 0.8, vDisc.y));
  vegOcc = vCardOcc * (1.0 - 0.4 * (1.0 - base));
}
`;

function crownMaterial(leaf: THREE.Texture, time: THREE.IUniform<number>, wind: THREE.IUniform<number>): THREE.MeshStandardMaterial {
  // alpha to coverage for the fringe cards' leaf cut-outs and the puffs' close-range hollows; double-sided
  // so the far side of a puff's shell shows through its hollows (the trunk and limbs are closed tubes, the
  // cards face the camera: only the puffs pay for it)
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.88, alphaToCoverage: true, side: THREE.DoubleSide });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = time;
    shader.uniforms.uWind = wind;
    shader.uniforms.uLeaf = { value: leaf };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${COMMON_VERT}`)
      .replace('#include <beginnormal_vertex>', CROWN_NORMAL)
      .replace('#include <begin_vertex>', CROWN_VERTEX)
      .replace('#include <shadowmap_vertex>', VEG_SHADOWMAP_VERTEX);
    shader.fragmentShader = softenFoliageShadow(shader.fragmentShader)
      .replace('#include <common>', `#include <common>\n${CROWN_FRAG_PARS}`)
      .replace('#include <lights_physical_pars_fragment>', foliageLighting(`step(0.5, vPart) * step(vPart, ${(BRANCH_PART - 0.5).toFixed(1)})`, CROWN_LIGHT))
      .replace('#include <color_fragment>', CROWN_FRAG)
      .replace('#include <normal_fragment_begin>', CROWN_NORMAL_FRAG);
    balanceGroundIbl(shader);
  };
  mat.customProgramCacheKey = () => 'veg-crown-v16';
  return mat;
}

function palmMaterial(tex: THREE.Texture, time: THREE.IUniform<number>, wind: THREE.IUniform<number>): THREE.MeshStandardMaterial {
  // the frond shader does its own soft alpha ramp (alphaTest 0 keeps three's hard test out of the way)
  const mat = new THREE.MeshStandardMaterial({ map: tex, alphaToCoverage: true, side: THREE.DoubleSide, roughness: 0.75, color: 0xffffff });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = time;
    shader.uniforms.uWind = wind;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${COMMON_VERT}`)
      .replace('#include <beginnormal_vertex>', PALM_NORMAL)
      .replace('#include <begin_vertex>', PALM_VERTEX)
      .replace('#include <shadowmap_vertex>', VEG_SHADOWMAP_VERTEX);
    shader.fragmentShader = softenFoliageShadow(shader.fragmentShader)
      .replace('#include <common>', `#include <common>\nvarying float vPart; varying vec3 vWP; varying float vSeed; varying float vOcc;\n#define aVarSeed vSeed\n${GLSL_NOISE}`)
      .replace('#include <lights_physical_pars_fragment>', foliageLighting('step(0.5, vPart)', PALM_LIGHT))
      .replace('#include <color_fragment>', PALM_FRAG)
      .replace('#include <normal_fragment_begin>', PALM_NORMAL_FRAG);
    balanceGroundIbl(shader);
  };
  mat.customProgramCacheKey = () => 'veg-palm-v14';
  return mat;
}

/** Cards in the shadow pass face the light (the pass' camera), so they throw crown-shaped shadows. */
function cardDepthMaterial(atlas: THREE.Texture): THREE.MeshDepthMaterial {
  const mat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, alphaTest: 0.5, side: THREE.DoubleSide });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uAtlas = { value: atlas };
    shader.uniforms.uCanopyMean = { value: new THREE.Vector3() };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#define VEG_DEPTH\n#include <common>\n${CARD_VERT_PARS}`)
      .replace('#include <project_vertex>', CARD_PROJECT);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${CARD_FRAG_PARS}`)
      .replace('#include <map_fragment>', CARD_DEPTH_FRAG);
  };
  mat.customProgramCacheKey = () => 'veg-card-depth-v6';
  return mat;
}

function cardMaterial(atlas: THREE.Texture, canopyMean: THREE.Vector3): THREE.MeshStandardMaterial {
  // the card shader does its own soft coverage ramp about the cut-out threshold (alphaTest 0 keeps three's
  // hard test out); alpha to coverage dithers it under MSAA
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, alphaToCoverage: true, side: THREE.DoubleSide });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uAtlas = { value: atlas };
    shader.uniforms.uCanopyMean = { value: canopyMean };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${CARD_VERT_PARS}`)
      .replace('#include <project_vertex>', CARD_PROJECT)
      .replace('#include <shadowmap_vertex>', VEG_SHADOWMAP_VERTEX);
    shader.fragmentShader = softenFoliageShadow(shader.fragmentShader)
      .replace('#include <common>', `#include <common>\n${CARD_FRAG_PARS}`)
      .replace('#include <lights_physical_pars_fragment>', foliageLighting('1.0 - vTrunk', CARD_LIGHT))
      .replace('#include <color_fragment>', CARD_FRAG);
    balanceGroundIbl(shader);
  };
  mat.customProgramCacheKey = () => 'veg-card-v15';
  return mat;
}

// ---------------------------------------------------------------- card batches

/** instances a card batch can hold; tiles that do not fit fall back to their own card mesh */
const CAMERA_CARDS = 262144;
const MIRROR_CARDS = 32768;
const CARD_EXTRAS = [{ name: 'aVar', itemSize: 4 }];

// ---------------------------------------------------------------- planting

interface Plant { x: number; y: number; z: number; s: number; rot: number; lean: number; tint: THREE.Color; arche: Archetype; variant: number; seed: number; squash: number; trunk: number; /** neighbour-density occlusion 0..1 (how much taller canopy overlaps this crown), see occludePlants */ occ: number; }

/** Plant families a tile holds: crown trees (3D crowns + cards), palms (3D palms + cards) and the
 *  understory (cards only: shrubs and tussocks under the canopy, never worth a mesh). */
enum Family { CROWN = 0, PALM = 1, UNDER = 2 }

/** Neighbour-density occlusion: for every plant, how much crown of neighbours at least as tall stands
 *  over its own crown (a spatial hash of the canopy plants; a plant with two or three taller neighbours
 *  overlapping its crown saturates). The crown and card shaders darken the lower crown and its sky light
 *  by it, so the inside of a dense stand goes dark while a lone tree stays lit all round. */
function occludePlants(plants: Plant[], receivers: Plant[] = plants): void {
  const CELL_M = 24;
  const grid = new Map<number, number[]>();
  const key = (x: number, z: number) => Math.floor((x + 10000) / CELL_M) * 4096 + Math.floor((z + 10000) / CELL_M);
  const radius = (p: Plant) => p.s * (p.arche === 4 ? 0.6 : 1.5);
  const top = (p: Plant) => p.y + p.s * unitHeight(p.arche, p.squash, p.trunk);
  for (let i = 0; i < plants.length; i++) {
    const p = plants[i];
    if (p.arche === 3 || p.arche === 5) continue;
    const k = key(p.x, p.z);
    let list = grid.get(k);
    if (!list) { list = []; grid.set(k, list); }
    list.push(i);
  }
  for (const p of receivers) {
    const ri = radius(p), ti = top(p), hi = ti - p.y;
    const cx = Math.floor((p.x + 10000) / CELL_M), cz = Math.floor((p.z + 10000) / CELL_M);
    let sum = 0;
    for (let gx = cx - 1; gx <= cx + 1; gx++) for (let gz = cz - 1; gz <= cz + 1; gz++) {
      const list = grid.get(gx * 4096 + gz);
      if (!list) continue;
      for (const j of list) {
        const q = plants[j];
        if (q === p) continue;
        const rj = radius(q);
        const d = Math.hypot(q.x - p.x, q.z - p.z);
        const reach = ri + rj;
        if (d >= reach) continue;
        // a neighbour counts when its crown reaches this one's and it stands at least three quarters as tall
        const taller = smoothstep(0.6, 1.0, (top(q) - p.y) / Math.max(hi, 0.5));
        sum += (1 - d / reach) * taller * (q.arche === 4 ? 0.5 : 1);
      }
    }
    // saturating: one overlapping equal neighbour gives 0.4, three 0.78, a closed stand ~0.9
    p.occ = Math.min(0.999, 1 - Math.exp(-sum / 2));
  }
}

/** `lodCenter` / `lodR` describe the planted footprint (the LOD distance metric); `box`, `center`, `r`
 *  and `height` bound the drawn plants and cards and are only used for culling. */
/** `hi` (crown family only) is the subdivided mesh drawn instead of `near` when the camera is within
 *  HI_DISTANCE of the tile's plants; it shares the instance buffers of `near`. */
interface Tile { family: Family; near: THREE.InstancedMesh; hi: THREE.InstancedMesh | null; far: THREE.InstancedMesh; box: THREE.Box3; center: THREE.Vector3; r: number; height: number; lodCenter: THREE.Vector3; lodR: number; n: number; d: number; matrices: Float32Array; colors: Float32Array; extras: Float32Array[]; cells: VegCells | null; batched3d: boolean; cardCells: boolean; mirrorCells: boolean; /** palm tiles: cells in the camera / mirror palm batches */ palmCells: boolean; palmMirrorCells: boolean; maxS: number; }

/** The VEG_CELL-metre cells of a tile (built the first time the tile is drawn near or in full): the same
 *  cells once with the 3D mesh's per-instance attribute and once with the card's, so the batches draw
 *  only the cells of a tile that are in view (the tile as a whole draws every plant, most of them behind
 *  the camera when it stands inside the tile). `order` / `dist` are per-frame scratch: the cells sorted
 *  by camera distance, so the level-2 crown budget is spent nearest first. */
interface VegCells { near: CellSource[]; cards: CellSource[]; order: number[]; dist: Float32Array }

const TILE = 900;
const VEG_CELL = 150;
/** instances the near crown batches hold each (the tile's own mesh draws the tiles that do not fit) */
const NEAR_CROWNS = 32768;
const ULTRA_CROWNS = 8192;
/** instances the palm batches hold (camera / mirror); a palm tile that does not fit draws its own mesh */
const NEAR_PALMS = 16384;
const MIRROR_PALMS = 8192;
/** palms the finned near tier can hold (the cells inside PALM_HI_DISTANCE) */
const HI_PALMS = 4096;
/** casting tiles a coarse cascade (texel over NEAR_TEXEL) draws at most, nearest first */
const COARSE_SHADOW_TILES = 8;
const _casting = new Array<number>(MAX_CASCADES).fill(0);
// 3D distances to the planted footprint: at 420 m a 12 m crown is ~18 px tall (720p), where the card
// is the better representation; every 3D crown inside that carries the fringe, and the twice-subdivided
// mesh is only worth its triangles closer than ULTRA_DISTANCE
const NEAR_DISTANCE = 420;
/** palms hand over to their cards further out: fronds are thin, and a frond-star card reads as a sprite
 *  long before a crown card does (iter09 "sprite palms" at 100-400 m) */
const PALM_NEAR_DISTANCE = 650;
/** palm cells closer than this draw the finned frond geometry (2.8x the strip palm's triangles) */
const PALM_HI_DISTANCE = 150;
/** crown cells (150 m) closer than these to the camera draw the level-1 / level-2 tessellations (both carry
 *  the leaf-cluster fringe, which fades out over FRINGE_FADE_NEAR..FAR) */
const HI_DISTANCE = 420;
/** at 80 m a 10 m crown is ~80 px tall (1080p), where level 1's 268 triangles and 36 fringe cards hold the
 *  silhouette; the 130 m aerial poses see the level-2 band (548 triangles a crown) at the bottom of the frame
 *  only, 25 px tall, and pose C spent 133 k triangles on 242 of them there (at 170 m; 216 still at 130 m and
 *  186 at 100: the distance is to the cell's box, whose top is the tallest crown, under the camera) */
const ULTRA_DISTANCE = 80;
/** level-2 crowns (548 triangles each) drawn per frame at most, nearest cells first; the rest of the cells
 *  inside ULTRA_DISTANCE fall back to level 1 (a dense park clump at 170 m held 1500 of them: 1 M triangles) */
const ULTRA_BUDGET = 420;
/** level-1 crowns (268 triangles) drawn per frame at most, nearest cells first; the rest of the cells inside
 *  HI_DISTANCE fall back to level 0 (88): a dense park clump seen from 130 m up held 890 of them, most of
 *  them 15-20 px tall, and the view ran 65 k triangles over the 1.5 M budget */
const HI_BUDGET = 700;
const NEAR_BUDGET = 60000;
/** understory cards: drawn to this distance, at full density to UNDER_FULL, half to UNDER_HALF and a
 *  quarter beyond (a 2 m shrub is 5 px tall at 450 m and under 2 px at 1.5 km); they cast shadows only
 *  inside UNDER_SHADOW (a shrub's shadow is under its own card) */
const UNDER_DISTANCE = 1600;
const UNDER_FULL = 450;
const UNDER_HALF = 900;
const UNDER_SHADOW = 350;
/** card tiles closer than this (to their bounding sphere) are drawn into the water's mirror image */
export const MIRROR_DISTANCE = 1500;
/** culling growth per unit of scale: the widest crown sideways (a spreading-class lobe at radius 1.15 x 1.3
 *  with its size, lump and stretch reaches 3.2), the tallest card (pine) up */
const GROW_SIDE = 3.3;
const GROW_UP = 5.4;

const _n23 = new THREE.Vector3(), _n31 = new THREE.Vector3(), _n12 = new THREE.Vector3(), _apex = new THREE.Vector3(), _p = new THREE.Vector3();
/** Apex of a perspective frustum (the camera position): the common point of the right, bottom and top
 *  side planes (three.js orders them right, left, bottom, top, far, near). Falls back to `fallback`. */
function frustumApex(f: THREE.Frustum, out: THREE.Vector3, fallbackX: number, fallbackZ: number): THREE.Vector3 {
  const p1 = f.planes[0], p2 = f.planes[2], p3 = f.planes[3];
  _n23.crossVectors(p2.normal, p3.normal);
  const det = p1.normal.dot(_n23);
  if (Math.abs(det) < 1e-9) return out.set(fallbackX, 0, fallbackZ);
  _n31.crossVectors(p3.normal, p1.normal);
  _n12.crossVectors(p1.normal, p2.normal);
  return out.set(0, 0, 0).addScaledVector(_n23, -p1.constant).addScaledVector(_n31, -p2.constant).addScaledVector(_n12, -p3.constant).divideScalar(det);
}

/** Base tints (sRGB) per archetype: one unimodal olive band around the reference canopy (which averages
 *  ~(81,85,74) sRGB for sunlit mixed canopy) with the hue spread carried by the species — grey-green
 *  pines, yellow-green sea grape and shrubs, deeper emergents — and per-plant jitter on top. No entry is
 *  near black: the darks of a canopy come from shading and shadow, not from the palette. */
const PALETTE: Record<Archetype, string[]> = {
  0: ['#4f6236', '#556538', '#485c33', '#5a683c', '#43572f', '#4d6238', '#5c663d', '#415434', '#51603a', '#4a5c36', '#586741', '#465833'],
  1: ['#3f5533', '#445a34', '#3a5031', '#485e3a', '#405537', '#43583b'],
  2: ['#435531', '#4a5b35', '#3f5030', '#4e5e39', '#475a2f'],
  3: ['#5f6b3c', '#67703f', '#5b6839', '#6e7443', '#647045'],
  // coconut fronds: a brighter yellow-green than the hardwood canopy (a palm crown in sun reads lime next to olive)
  4: ['#6f8a3e', '#68843a', '#78924a', '#627c35', '#7c9448', '#6e8a40'],
  5: ['#8f7d4b', '#9a7f52', '#877b4b', '#7d7541', '#9e8359'],
  6: ['#5f6d3a', '#6a7040', '#5b6836', '#727747', '#6b6a3a', '#626d3c'],
  7: ['#465340', '#4b5740', '#414f3f', '#505b44', '#485542'],
};
/** Crown height range per archetype in metres (top of the crown above the trunk base). Planting asks for a
 *  height inside the range and the instance scale follows from the plant's own proportions, so a
 *  broadleaf stands 8-18 m next to 6-8 m houses and 12 m sailboat masts instead of the 25-40 m the
 *  unit-scale draws produced (iter09 plane-rear-quarter "polyhedral canopy wall dwarfing the masts"). */
const HEIGHTS: Record<Archetype, [number, number]> = {
  0: [6, 18], // broadleaf hardwood / ficus (6-10 m as a street tree, 8-18 m in the parks and hammocks)
  1: [14, 20], // tall emergent
  2: [2, 6], // mangrove
  3: [1.5, 4], // shrub
  4: [6, 14], // coconut palm
  5: [0.8, 2], // dune grass tussock
  6: [3, 8], // sea grape
  7: [10, 20], // slash pine
};
/** Height of the top of a unit-scale plant's crown (the same arithmetic as CROWN_VERTEX / PALM_VERTEX: the
 *  crown centre sits at trunk + 0.85 squash, the main puff reaches ~1.1 squash above it with the typical
 *  displacement; a palm's trunk ends at 1.0 with the frond arch a little above). */
function unitHeight(arche: Archetype, squash: number, trunk: number): number {
  return arche === 4 ? 1.08 : trunk + 1.95 * squash;
}
/** Planted crown heights per archetype: count, sum, extremes and a 0.25 m histogram (for the median). */
export interface HeightStats { n: number; sum: number; min: number; max: number; hist: Uint32Array }
const HIST_BIN = 0.25;
export function heightMedian(st: HeightStats): number {
  let acc = 0;
  for (let i = 0; i < st.hist.length; i++) { acc += st.hist[i]; if (acc * 2 >= st.n) return (i + 0.5) * HIST_BIN; }
  return 0;
}

/** linear-space gain on every tint: the wrap/translucency light model and the sun's warmth push the
 *  rendered canopy toward yellow-green, so the base is pulled back toward the reference's grey olive.
 *  With the crown light model's low wrap and floor (CROWN_LIGHT) the shade side of a crown is dark, so
 *  the gain sits higher than it did under the all-round wrap: the canopy mean stays near the reference
 *  while the sunlit cap reaches the reference's sunlit-leaf colour. */
const CANOPY_GAIN = new THREE.Color(0.92, 0.72, 0.72);
/** how far every tint is pulled toward its own luminance (linear) after the gain: the reference canopy is
 *  a grey olive, and desaturating this way keeps the hue instead of flipping low-saturation tints purple */
const CANOPY_DESAT = 0.48;
const _hsl = { h: 0, s: 0, l: 0 };
const _grey = new THREE.Color();

// ---------------------------------------------------------------- near grass

/** Grass tufts stand within this distance of the camera (fading out over the last 15 m) */
const GRASS_RADIUS = 60;
/** lattice spacing of the tuft candidates (m): the full lattice stands inside GRASS_DENSE, thinning to a
 *  quarter of it at GRASS_RADIUS (each tuft's rank hash against the distance), so the ground under the
 *  camera is a carpet and the far tufts a scatter */
const GRASS_SPACING = 0.8;
const GRASS_DENSE = 18;
/** the tufts are generated in chunks of this size (m), cached while the camera is near */
const GRASS_CHUNK = 20;
/** instances the grass mesh can hold (a 60 m disc at 0.8 m spacing is ~17 000 candidates before the
 *  thinning and the ground's own density) */
const GRASS_MAX = 12000;
const GRASS_TILES = 3;

/** Grass blade cut-outs: three 128 x 256 tiles — a lawn tuft, a meadow tuft with seed heads, dune grass
 *  (sea oats: sparse long blades with hanging heads). Alpha is the coverage, R the shading (dark at the
 *  base, light at the tip); the instance tint gives the colour. */
function grassTexture(rng: Rng): THREE.CanvasTexture {
  const W = 128, H = 256;
  const c = document.createElement('canvas');
  c.width = W * GRASS_TILES; c.height = H;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, c.width, H);
  for (let tile = 0; tile < GRASS_TILES; tile++) {
    const ox = tile * W;
    const blades = tile === 0 ? 18 : tile === 1 ? 12 : 9;
    for (let i = 0; i < blades; i++) {
      const x0 = ox + W * (0.5 + rng.range(-0.16, 0.16));
      const lean = rng.range(-0.5, 0.5) * (tile === 2 ? 1.3 : 1);
      const hgt = H * (tile === 0 ? rng.range(0.5, 1.0) : rng.range(0.6, 1.0));
      const wBase = tile === 2 ? rng.range(3, 5) : rng.range(5, 9);
      const shade = rng.range(0.4, 0.65);
      const tipX = x0 + lean * hgt, tipY = H - hgt;
      const midX = x0 + lean * hgt * 0.3, midY = H - hgt * 0.55;
      const grad = ctx.createLinearGradient(0, H, 0, tipY);
      grad.addColorStop(0, `rgb(${Math.round(255 * shade)}, 0, 0)`);
      grad.addColorStop(1, `rgb(${Math.round(255 * Math.min(1, shade + 0.45))}, 0, 0)`);
      ctx.fillStyle = grad;
      // a tapered blade bowing toward its tip
      ctx.beginPath();
      ctx.moveTo(x0 - wBase / 2, H);
      ctx.quadraticCurveTo(midX - wBase / 4, midY, tipX, tipY);
      ctx.quadraticCurveTo(midX + wBase / 4, midY, x0 + wBase / 2, H);
      ctx.closePath();
      ctx.fill();
      if ((tile === 1 && rng.chance(0.45)) || tile === 2) {
        // seed head at the tip: a small pale ellipse (hanging off the tip on the dune grass)
        const hx = tipX + (tile === 2 ? lean * 8 : 0), hy = tipY + (tile === 2 ? 10 : 4);
        ctx.fillStyle = `rgb(${Math.round(255 * Math.min(1, shade + 0.5))}, 0, 0)`;
        ctx.beginPath();
        ctx.ellipse(hx, hy, tile === 2 ? 3 : 2.5, tile === 2 ? 12 : 7, lean * 0.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.NoColorSpace;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = 4;
  return tex;
}

/** Unit tuft: three quads crossed at 60 deg, 0.8 wide and 1 tall, normals up (a tuft is lit like the
 *  ground it grows from, not like a fence of leaves). */
function grassGeometry(): THREE.BufferGeometry {
  const pos: number[] = [], nrm: number[] = [], uv: number[] = [];
  for (let q = 0; q < 3; q++) {
    const a = (q / 3) * Math.PI;
    const cx = Math.cos(a) * 0.4, cz = Math.sin(a) * 0.4;
    const corners: [number, number, number, number][] = [[-cx, 0, -cz, 0], [cx, 0, cz, 1], [cx, 1, cz, 1], [-cx, 0, -cz, 0], [cx, 1, cz, 1], [-cx, 1, -cz, 0]];
    for (const [x, y, z, u] of corners) { pos.push(x, y, z); nrm.push(0, 1, 0); uv.push(u, y); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0.5, 0), 1.2);
  return g;
}

const GRASS_VERTEX = /* glsl */ `
vec3 transformed = position;
{
  float t = position.y;
  mat3 M = mat3(instanceMatrix);
  float s = length(M[0]);
  vec3 iw = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  // wind: the tips lean to the slow gust field the crowns sway to (one wind over grass and trees), with a
  // finer phase per tuft and a quick flutter on top; the bend grows with the square of the height and is
  // applied in world space (the tufts are yawed at random) so the whole field leans one way
  float phase = iw.x * 0.13 + iw.z * 0.17;
  float gust = sin(uTime * 1.3 + phase) * 0.6 + sin(uTime * 2.7 + phase * 1.9) * 0.4;
  float flutter = sin(uTime * 6.3 + iw.x * 0.9 + iw.z * 1.1 + aGrass.y * 20.0);
  vec3 dW = vec3(gust * 0.22 + flutter * 0.05, 0.0, cos(uTime * 1.1 + phase) * 0.13 + flutter * 0.03) * (t * t * uWind);
  vec3 dL = (transpose(M) * dW) / max(s, 1e-4);
  transformed += dL;
  // the tip comes down a little as it leans
  transformed.y -= 0.5 * length(dL.xz) * t;
  vGrassUv = vec2((uv.x + aGrass.x) / ${GRASS_TILES}.0, uv.y);
  vGrassFade = 1.0 - smoothstep(${GRASS_RADIUS - 15}.0, ${GRASS_RADIUS}.0, length(cameraPosition - iw));
}
`;
const GRASS_FRAG = /* glsl */ `
#include <color_fragment>
{
  vec4 g = texture2D(uGrass, vGrassUv);
  float a = smoothstep(0.35, 0.65, g.a) * vGrassFade;
  if (a < 0.2) discard;
  diffuseColor.a = a;
  // the blade's own shading: the base of the tuft stands in its own shade, the tips catch the light
  diffuseColor.rgb *= 0.5 + 0.75 * g.r;
}
`;
function grassMaterial(tex: THREE.Texture, time: THREE.IUniform<number>, wind: THREE.IUniform<number>): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.92, alphaToCoverage: true, side: THREE.DoubleSide });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = time;
    shader.uniforms.uWind = wind;
    shader.uniforms.uGrass = { value: tex };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;\nuniform float uWind;\nattribute vec2 aGrass;\nvarying vec2 vGrassUv;\nvarying float vGrassFade;')
      .replace('#include <begin_vertex>', GRASS_VERTEX);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform sampler2D uGrass;\nvarying vec2 vGrassUv;\nvarying float vGrassFade;')
      .replace('#include <color_fragment>', GRASS_FRAG)
      // both faces of a blade are lit as its upper side (the flipped back-face normal made every blade seen
      // from behind a dark stroke)
      .replace('#include <normal_fragment_begin>', '#include <normal_fragment_begin>\n#ifdef DOUBLE_SIDED\nnormal *= faceDirection;\n#endif');
    balanceGroundIbl(shader);
  };
  mat.customProgramCacheKey = () => 'veg-grass-v2';
  return mat;
}

/** The tufts of one GRASS_CHUNK square, generated on demand and cached while the camera is near. */
interface GrassChunk { n: number; matrices: Float32Array; colors: Float32Array; extras: Float32Array; /** per-tuft rank in [0, 1) for the distance thinning */ ranks: Float32Array; box: THREE.Box3; stamp: number }

/** Grass near the camera: tufts on a jittered lattice over the lawns, parks, golf course, wetland prairie
 *  and the upper beach (dune grass) within GRASS_RADIUS, generated per chunk from the map (zone, height,
 *  slope, the building occupancy) with the species, height and colour of the ground they stand on, drawn
 *  in one instanced draw with a wind bend, culled by chunk, and skipped altogether when the camera is too
 *  high for any ground to lie within reach. */
class GrassField {
  readonly mesh: THREE.InstancedMesh;
  private readonly extras: THREE.InstancedBufferAttribute;
  private readonly chunks = new Map<number, GrassChunk>();
  private frame = 0;
  private readonly _m = new THREE.Matrix4();
  private readonly _q = new THREE.Quaternion();
  private readonly _q2 = new THREE.Quaternion();
  private readonly _up = new THREE.Vector3();
  private readonly _p = new THREE.Vector3();
  private readonly _s = new THREE.Vector3();
  private readonly _c = new THREE.Color();

  constructor(private readonly map: WorldMap, private readonly occupied: (x: number, z: number) => boolean, material: THREE.Material) {
    const geo = grassGeometry();
    const mesh = new THREE.InstancedMesh(geo, material, GRASS_MAX);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(GRASS_MAX * 3), 3);
    mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
    this.extras = new THREE.InstancedBufferAttribute(new Float32Array(GRASS_MAX * 2), 2);
    this.extras.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('aGrass', this.extras);
    mesh.frustumCulled = false;
    mesh.matrixAutoUpdate = false;
    mesh.receiveShadow = true;
    mesh.castShadow = false;
    mesh.count = 0;
    mesh.visible = false;
    mesh.name = 'grass';
    mesh.layers.set(LAYER_CAMERA);
    this.mesh = mesh;
  }

  /** Fill the mesh with the chunks in reach and in view of the camera. */
  update(cam: THREE.Vector3, cull: ViewCull): void {
    const mesh = this.mesh;
    this.frame++;
    const ground = this.map.heightAt(cam.x, cam.z);
    if (cam.y - ground > GRASS_RADIUS + 12) { mesh.count = 0; mesh.visible = false; return; }
    const C = GRASS_CHUNK, R = GRASS_RADIUS;
    const matrices = mesh.instanceMatrix.array as Float32Array;
    const colors = mesh.instanceColor!.array as Float32Array;
    const extras = this.extras.array as Float32Array;
    let n = 0;
    const cx0 = Math.floor((cam.x - R) / C), cx1 = Math.floor((cam.x + R) / C);
    const cz0 = Math.floor((cam.z - R) / C), cz1 = Math.floor((cam.z + R) / C);
    for (let cz = cz0; cz <= cz1; cz++) {
      for (let cx = cx0; cx <= cx1; cx++) {
        const mx = (cx + 0.5) * C - cam.x, mz = (cz + 0.5) * C - cam.z;
        if (mx * mx + mz * mz > (R + C * 0.71) * (R + C * 0.71)) continue;
        const key = (cx + 32768) * 65536 + (cz + 32768);
        let chunk = this.chunks.get(key);
        if (!chunk) { chunk = this.build(cx, cz); this.chunks.set(key, chunk); }
        chunk.stamp = this.frame;
        if (chunk.n === 0 || !cull.boxInView(chunk.box)) continue;
        // thinning by distance: a tuft stands when its rank is under the density at its distance (the
        // full lattice inside GRASS_DENSE, a quarter of it at the radius)
        const M = chunk.matrices, K = chunk.colors, E = chunk.extras, rk = chunk.ranks;
        for (let i = 0; i < chunk.n && n < GRASS_MAX; i++) {
          const dx = M[i * 16 + 12] - cam.x, dz = M[i * 16 + 14] - cam.z;
          const d = Math.sqrt(dx * dx + dz * dz);
          if (rk[i] > 1 - 0.75 * smoothstep(GRASS_DENSE, R, d)) continue;
          for (let k = 0; k < 16; k++) matrices[n * 16 + k] = M[i * 16 + k];
          colors[n * 3] = K[i * 3]; colors[n * 3 + 1] = K[i * 3 + 1]; colors[n * 3 + 2] = K[i * 3 + 2];
          extras[n * 2] = E[i * 2]; extras[n * 2 + 1] = E[i * 2 + 1];
          n++;
        }
      }
    }
    // chunks the camera has left are dropped (they are cheap to rebuild)
    if (this.chunks.size > 96) for (const [k, c] of this.chunks) if (c.stamp !== this.frame) this.chunks.delete(k);
    mesh.count = n;
    mesh.visible = n > 0;
    if (n > 0) {
      mesh.instanceMatrix.clearUpdateRanges(); mesh.instanceMatrix.addUpdateRange(0, n * 16); mesh.instanceMatrix.needsUpdate = true;
      mesh.instanceColor!.clearUpdateRanges(); mesh.instanceColor!.addUpdateRange(0, n * 3); mesh.instanceColor!.needsUpdate = true;
      this.extras.clearUpdateRanges(); this.extras.addUpdateRange(0, n * 2); this.extras.needsUpdate = true;
    }
  }

  private build(cx: number, cz: number): GrassChunk {
    const map = this.map, C = GRASS_CHUNK, G = GRASS_SPACING;
    const per = Math.round(C / G);
    const mats: number[] = [], cols: number[] = [], ext: number[] = [], ranks: number[] = [];
    const box = new THREE.Box3();
    let n = 0;
    for (let j = 0; j < per; j++) {
      for (let i = 0; i < per; i++) {
        const gi = cx * per + i, gj = cz * per + j;
        const x = cx * C + (i + hash2(gi, gj, 1)) * G, z = cz * C + (j + hash2(gi, gj, 2)) * G;
        const zn = map.zoneAt(x, z);
        // the ground the tuft grows on: 0 lawn (suburb, park), 1 mown (golf), 2 meadow (wetland prairie,
        // airport), 3 dune grass (upper beach)
        let kind: number;
        if (zn === Zone.PARK || zn === Zone.RES_LOW) kind = 0;
        else if (zn === Zone.GOLF) kind = 1;
        else if (zn === Zone.WETLAND_FLAT || zn === Zone.AIRPORT) kind = 2;
        else if (zn === Zone.BEACH) kind = 3;
        else continue;
        const y = map.heightAt(x, z);
        if (y < 0.3 || this.occupied(x, z)) continue;
        const h4 = hash2(gi, gj, 4), h5 = hash2(gi, gj, 5), h6 = hash2(gi, gj, 6);
        // density: lawns in patches (worn and lush), the prairie nearly solid, the dune grass only on the
        // upper beach where the sand ramps up, in the patches the ground shader draws it
        const patch = 0.5 + 0.5 * perlin2(x / 9 + 3.1, z / 9 - 7.7);
        let p: number, hMin: number, hMax: number, tile: number;
        if (kind === 0) { p = 0.35 + 0.55 * patch; hMin = 0.2; hMax = 0.42; tile = h6 < 0.8 ? 0 : 1; }
        else if (kind === 1) { p = 0.5; hMin = 0.12; hMax = 0.2; tile = 0; }
        else if (kind === 2) { p = 0.8; hMin = 0.35; hMax = 0.8; tile = 1; }
        else {
          const dune = smoothstep(0.95, 1.5, y) * smoothstep(0.45, 0.65, 0.5 + 0.5 * perlin2(x / 20 + 4.0, z / 20 + 4.0));
          if (dune <= 0.05) continue;
          p = 0.7 * dune; hMin = 0.45; hMax = 0.95; tile = 2;
        }
        if (h4 >= p) continue;
        const h = hMin + (hMax - hMin) * h5 * h5;
        // a tuft is wider than it is tall (a clump of blades splaying out, not a single upright blade):
        // the crossed quads span 0.8 of the scale, so 1.6-2.2x the height puts a lawn tuft at 0.3-0.7 m
        const wdt = h * (kind === 3 ? 1.3 : 1.6 + 0.6 * hash2(gi, gj, 9));
        // stand on the local ground plane (finite differences of the height field), yawed at random
        const nx = (map.heightAt(x - 1, z) - map.heightAt(x + 1, z)) * 0.5, nz = (map.heightAt(x, z - 1) - map.heightAt(x, z + 1)) * 0.5;
        this._up.set(nx, 1, nz).normalize();
        this._q.setFromUnitVectors(_yAxis, this._up);
        this._q2.setFromAxisAngle(_yAxis, hash2(gi, gj, 3) * Math.PI * 2);
        this._q.multiply(this._q2);
        this._m.compose(this._p.set(x, y - 0.04, z), this._q, this._s.set(wdt, h, wdt));
        // the rank decides how far from the camera this tuft survives the thinning: the lattice's own
        // hash, so the same tufts stand from every camera position (no popping as it moves)
        ranks.push(hash2(gi, gj, 10));
        this._m.toArray(mats, n * 16);
        // colour (linear): the ground's own lawn / dry grass mix (openGround in the terrain shader), the
        // golf course's greener turf, the prairie's tan-green, the dune grass khaki
        const c = this._c;
        if (kind === 0) c.setRGB(0.19, 0.33, 0.11).lerp(_dryGrass, smoothstep(0.35, 0.75, 0.5 + 0.5 * perlin2(x / 14 - 2.0, z / 14 + 5.0)));
        else if (kind === 1) c.setRGB(0.22, 0.46, 0.12);
        else if (kind === 2) c.setRGB(0.36, 0.38, 0.16);
        else c.setRGB(0.42, 0.42, 0.2);
        c.multiplyScalar(0.85 + 0.3 * hash2(gi, gj, 7));
        cols.push(c.r, c.g, c.b);
        ext.push(tile, hash2(gi, gj, 8));
        box.expandByPoint(this._p);
        n++;
      }
    }
    box.min.y -= 0.2; box.max.y += 1.2; box.min.x -= 0.5; box.max.x += 0.5; box.min.z -= 0.5; box.max.z += 0.5;
    return { n, matrices: new Float32Array(mats), colors: new Float32Array(cols), extras: new Float32Array(ext), ranks: new Float32Array(ranks), box, stamp: 0 };
  }
}
const _yAxis = new THREE.Vector3(0, 1, 0);
const _dryGrass = new THREE.Color(0.44, 0.4, 0.21);

export class Vegetation {
  readonly group = new THREE.Group();
  readonly materials: THREE.MeshStandardMaterial[] = [];
  readonly uTime = { value: 0 };
  readonly uWind = { value: 0.5 };
  /** the impostor atlas (exposed for inspection: `game.vegetation.atlas.image` is the canvas) */
  readonly atlas: THREE.CanvasTexture;
  /** the leaf-cluster tiles of the near crowns' fringe cards, and the palm frond strip (for inspection too) */
  readonly leaf: THREE.CanvasTexture;
  readonly frond: THREE.CanvasTexture;
  counts = { palms: 0, trees: 0, mangroves: 0, shrubs: 0 };
  /** planted crown heights (metres) per archetype, for the scale checks */
  readonly heightStats: HeightStats[] = Array.from({ length: 8 }, () => ({ n: 0, sum: 0, min: Infinity, max: 0, hist: new Uint32Array(160) }));
  private readonly tiles: Tile[] = [];
  shadowDistance = 1800;
  viewDistance = 9000;
  /** cards of every tile drawn as cards this frame, in one draw for the camera */
  readonly cameraCards: THREE.InstancedMesh;
  /** the same for the card tiles the water mirrors (within MIRROR_DISTANCE), on the mirror-only layer */
  readonly mirrorCards: THREE.InstancedMesh;
  private readonly cameraBatch: InstanceBatch;
  private readonly mirrorBatch: InstanceBatch;
  /** the 3D palms of the near palm tiles' cells in the camera's frustum, and those in the mirror camera's (the
   *  tile meshes drew every palm of the tile in both passes) */
  readonly cameraPalms: THREE.InstancedMesh;
  readonly mirrorPalms: THREE.InstancedMesh;
  private readonly palmBatch: InstanceBatch<CellSource>;
  /** the palms of the cells inside PALM_HI_DISTANCE, drawn with the finned frond geometry */
  private readonly palmHiBatch: InstanceBatch<CellSource>;
  private readonly palmMirrorBatch: InstanceBatch<CellSource>;
  /** the crowns of the near tiles' cells in view, one draw per tessellation level (chosen per cell by distance) */
  private readonly nearBatch: InstanceBatch<CellSource>;
  private readonly hiBatch: InstanceBatch<CellSource>;
  private readonly ultraBatch: InstanceBatch<CellSource>;
  private readonly crownBatches: InstanceBatch<CellSource>[];
  /** the grass tufts within GRASS_RADIUS of the camera */
  private readonly grass: GrassField;

  constructor(map: WorldMap, occupied: (x: number, z: number) => boolean) {
    const rng = new Rng('vegetation');
    const frondTex = frondTexture(rng.fork('fronds'));
    const atlas = cardAtlas(rng.fork('atlas'));
    this.atlas = atlas;
    const leafTex = leafClusterTexture(rng.fork('leaves'));
    this.leaf = leafTex;
    this.frond = frondTex;
    const crownMat = crownMaterial(leafTex, this.uTime, this.uWind);
    const palmMat = palmMaterial(frondTex, this.uTime, this.uWind);
    const canopyMean = new THREE.Vector3();
    const cardMat = cardMaterial(atlas, canopyMean);
    const cardDepth = cardDepthMaterial(atlas);
    const grassMat = grassMaterial(grassTexture(rng.fork('grass')), this.uTime, this.uWind);
    this.materials.push(crownMat, palmMat, cardMat, grassMat);
    this.grass = new GrassField(map, occupied, grassMat);
    this.group.add(this.grass.mesh);
    const crownGeo = crownGeometry(0);
    const crownGeoHi = crownGeometry(1);
    const crownGeoUltra = crownGeometry(2);
    const palmGeo = palmGeometry();
    const palmGeoHi = palmGeometry(true);
    const cardGeo = cardGeometry();
    this.cameraBatch = new InstanceBatch(CAMERA_CARDS, cardGeo, cardMat, CARD_EXTRAS, true, cardDepth);
    this.cameraCards = this.cameraBatch.mesh;
    this.cameraCards.layers.set(LAYER_CAMERA);
    this.cameraCards.name = 'cards';
    this.mirrorBatch = new InstanceBatch(MIRROR_CARDS, cardGeo, cardMat, CARD_EXTRAS, true, cardDepth);
    this.mirrorCards = this.mirrorBatch.mesh;
    this.mirrorCards.layers.set(LAYER_MIRROR);
    this.mirrorCards.name = 'cards-mirror';
    this.group.add(this.cameraCards, this.mirrorCards);
    this.nearBatch = new InstanceBatch<CellSource>(NEAR_CROWNS, crownGeo, crownMat, CARD_EXTRAS, true);
    this.nearBatch.mesh.name = 'crowns-near';
    this.hiBatch = new InstanceBatch<CellSource>(NEAR_CROWNS, crownGeoHi, crownMat, CARD_EXTRAS, true);
    this.hiBatch.mesh.name = 'crowns-hi';
    this.ultraBatch = new InstanceBatch<CellSource>(ULTRA_CROWNS, crownGeoUltra, crownMat, CARD_EXTRAS, true);
    this.ultraBatch.mesh.name = 'crowns-ultra';
    this.crownBatches = [this.nearBatch, this.hiBatch, this.ultraBatch];
    // main camera only: the water mirrors these tiles' cards instead (see updateLod)
    for (const b of this.crownBatches) b.mesh.layers.set(LAYER_MAIN);
    this.group.add(this.nearBatch.mesh, this.hiBatch.mesh, this.ultraBatch.mesh);
    this.palmBatch = new InstanceBatch<CellSource>(NEAR_PALMS, palmGeo, palmMat, CARD_EXTRAS, true);
    this.cameraPalms = this.palmBatch.mesh;
    this.cameraPalms.layers.set(LAYER_CAMERA);
    this.cameraPalms.name = 'palms';
    this.palmHiBatch = new InstanceBatch<CellSource>(HI_PALMS, palmGeoHi, palmMat, CARD_EXTRAS, true);
    this.palmHiBatch.mesh.layers.set(LAYER_CAMERA);
    this.palmHiBatch.mesh.name = 'palms-hi';
    this.palmMirrorBatch = new InstanceBatch<CellSource>(MIRROR_PALMS, palmGeo, palmMat, CARD_EXTRAS, true);
    this.mirrorPalms = this.palmMirrorBatch.mesh;
    this.mirrorPalms.layers.set(LAYER_MIRROR);
    this.mirrorPalms.name = 'palms-mirror';
    this.group.add(this.cameraPalms, this.palmHiBatch.mesh, this.mirrorPalms);

    const plants: Plant[] = [];
    /** the understory (cards only), kept apart so it never enters the crown / palm tiles */
    const underPlants: Plant[] = [];
    const tints = {} as Record<Archetype, THREE.Color[]>;
    for (const k of [0, 1, 2, 3, 4, 5, 6, 7] as Archetype[]) tints[k] = PALETTE[k].map((c) => new THREE.Color(c));
    /** `lean` is the trunk tilt in radians (palms only; the shader adds its own curvature on top). */
    const stats = this.heightStats;
    const canopySum = new THREE.Vector3();
    let canopyN = 0;
    const add = (arche: Archetype, x: number, z: number, y: number, h: number, prng: Rng, lean = 0, into: Plant[] = plants) => {
      const tint = prng.pick(tints[arche]).clone();
      // jitter in sRGB HSL: in the linear working space these tints have a lightness of 0.05-0.08, so
      // offsetHSL there (a ±0.06 swing) clamped about one plant in a hundred to black and left many more
      // near black — the "near-black clone crowns" of the iter08 frames
      tint.getHSL(_hsl, THREE.SRGBColorSpace);
      tint.setHSL(_hsl.h + prng.range(-0.03, 0.03), THREE.MathUtils.clamp(_hsl.s + prng.range(-0.06, 0.08), 0, 1), THREE.MathUtils.clamp(_hsl.l + prng.range(-0.07, 0.07), 0, 1), THREE.SRGBColorSpace);
      tint.multiply(CANOPY_GAIN);
      const lum = 0.2126 * tint.r + 0.7152 * tint.g + 0.0722 * tint.b;
      tint.lerp(_grey.setScalar(lum), CANOPY_DESAT);
      // the canopy trees' mean albedo: what the distant cards converge on
      if (arche === 0 || arche === 1 || arche === 2 || arche === 6 || arche === 7) { canopySum.x += tint.r; canopySum.y += tint.g; canopySum.z += tint.b; canopyN++; }
      // broadleaf crowns run from the spreading, ficus-like (0.58) to the tall-domed (1.05)
      const squash = arche === 2 ? prng.range(0.5, 0.7) : arche === 3 ? prng.range(0.55, 0.8) : arche === 5 ? prng.range(0.32, 0.45) : arche === 6 ? prng.range(0.5, 0.72) : arche === 1 ? prng.range(0.95, 1.25) : arche === 7 ? prng.range(1.3, 1.7) : prng.range(0.58, 1.05);
      // a spreading, ficus-like broadleaf crown sits on a short trunk (the shader gives it a stout one), a
      // domed crown on a longer one: the two ends of the squash range read as different species
      const trunk = arche === 2 ? prng.range(0.15, 0.3) : arche === 3 || arche === 5 ? 0.02 : arche === 6 ? prng.range(0.08, 0.2) : arche === 1 ? prng.range(0.7, 1.05) : arche === 7 ? prng.range(0.6, 1.0) : THREE.MathUtils.lerp(0.36, 0.72, (squash - 0.58) / 0.47) + prng.range(-0.06, 0.06);
      const seed = prng.next();
      const variant = prng.int(0, VARIANTS - 1);
      // plants are sized by their height in metres (clamped to the species' range): the instance scale is
      // whatever puts the top of this plant's crown (its own squash and trunk) at that height
      const range = HEIGHTS[arche];
      const hm = Math.min(range[1], Math.max(range[0], h));
      const s = hm / unitHeight(arche, squash, trunk);
      const st = stats[arche];
      st.n++; st.sum += hm; st.min = Math.min(st.min, hm); st.max = Math.max(st.max, hm); st.hist[Math.min(st.hist.length - 1, Math.floor(hm / HIST_BIN))]++;
      into.push({ x, y, z, s, rot: prng.range(0, Math.PI * 2), lean: arche === 4 ? (seed - 0.5) * 0.16 + lean : 0, tint, arche, variant, seed, squash, trunk, occ: 0 });
    };
    /** Coconut palm with a leaning, height-varied trunk (beaches, roadsides, marinas); `hMin`..`hMax` metres to the crown. */
    const palm = (x: number, z: number, y: number, prng: Rng, hMin = 6, hMax = 13) => add(4, x, z, y - 0.15, hMin + (hMax - hMin) * Math.pow(prng.next(), 1.3), prng, prng.range(-0.14, 0.14));
    /** young-to-old height draw (metres): most trees are mid-sized, a few are large */
    const size = (prng: Rng, min: number, max: number) => min + (max - min) * Math.pow(prng.next(), 1.5);
    /** Understory under a canopy tree at (x, z): a shrub or a grass tussock a few metres off the trunk, so
     *  the ground under the crowns is not bare lawn. Cards only (UNDER family). `p` is the chance. */
    const understory = (x: number, z: number, prng: Rng, p: number) => {
      if (!prng.chance(p)) return;
      const a = prng.range(0, Math.PI * 2), d = prng.range(2.5, 6);
      const ux = x + Math.cos(a) * d, uz = z + Math.sin(a) * d;
      const uy = map.heightAt(ux, uz);
      if (uy < 0.3 || occupied(ux, uz)) return;
      if (prng.chance(0.65)) add(3, ux, uz, uy - 0.1, size(prng, 1.2, 2.6), prng, 0, underPlants);
      else add(5, ux, uz, uy - 0.08, prng.range(0.6, 1.3), prng, 0, underPlants);
    };
    /** The authored forest belts (map.canopy): a closed canopy in the reference's proportions. A mangrove
     *  edge stands at the water; behind it a dense mixed hardwood hammock with the odd emergent and palm
     *  breaking the top line (no shrubs, no dune grass, few palms). The keys carry a lower canopy with more
     *  mangrove, the mainland fringe is mostly mangrove, and the scrub class is a mangrove thicket with no
     *  tall crown at all. Sizes are crown heights in metres: the hammock is kept lower (8-13.5 m) than the
     *  inland parks so the belt reads as the reference's low closed canopy. */
    const canopyPlant = (cls: Canopy, x: number, z: number, y: number, prng: Rng, roll: number, coast: number) => {
      if (cls === Canopy.SCRUB) {
        if (roll < 0.8) add(2, x, z, y - 0.2, size(prng, 2.2, 3.8), prng);
        else if (roll < 0.92) add(6, x, z, y - 0.15, size(prng, 3.0, 4.2), prng);
        else add(3, x, z, y - 0.1, size(prng, 1.5, 2.6), prng);
        return;
      }
      const edge = cls === Canopy.SHORE ? -30 : -16;
      if (coast > edge && roll < (cls === Canopy.SHORE ? 0.7 : 0.55)) { add(2, x, z, y - 0.2, size(prng, 2.6, 5.0), prng); return; }
      const key = cls === Canopy.KEY;
      let t = prng.next();
      if ((t -= key ? 0.05 : 0.07) < 0) palm(x, z, y, prng, 7, 11);
      else if ((t -= 0.08) < 0) add(6, x, z, y - 0.15, size(prng, 3.0, 6.0), prng);
      else if ((t -= key ? 0.08 : cls === Canopy.SHORE ? 0.1 : 0.14) < 0) add(1, x, z, y - 0.3, key ? size(prng, 14, 17) : size(prng, 14, 18), prng);
      else if (key && (t -= 0.25) < 0) add(2, x, z, y - 0.2, size(prng, 3, 5.5), prng);
      else add(0, x, z, y - 0.3, key ? size(prng, 8, 12) : size(prng, 8, 13.5), prng);
      // a thin understory in the hammock (the belt is a closed canopy: little grows under it)
      understory(x, z, prng, 0.3);
    };

    // cell walk over the map: candidates jittered inside each land cell, density from the veg channel and
    // two clump fields (a 150 m grove field and a 32 m clearing field), so the canopy has dense knots,
    // thin patches and gaps instead of an even sprinkle
    const n = map.n;
    const zone = map.zone, veg = map.veg, height = map.height, canopy = map.canopy;
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const idx = j * n + i;
        const zn = zone[idx];
        if (zn === Zone.OCEAN || zn === Zone.BAY || zn === Zone.SANDBAR || zn === Zone.ROCK || zn === Zone.LOT || zn === Zone.CONSTRUCTION || zn === Zone.STADIUM || zn === Zone.ROAD || zn === Zone.MARINA) continue;
        if (height[idx] < 0.12) continue;
        const v = veg[idx] / 255;
        const cx = -HALF + (i + 0.5) * CELL, cz = -HALF + (j + 0.5) * CELL;
        const clump = perlin2(cx / 150, cz / 150);
        const grove = perlin2(cx / 420 + 9.0, cz / 420 - 3.0);
        const clearing = 0.5 + 0.5 * perlin2(cx / 32 + 4.4, cz / 32 - 7.7);
        // the authored forest belts are planted solid (the mangrove zone keeps its own belt planting)
        const canopyCls = zn === Zone.PARK ? (canopy[idx] as Canopy) : Canopy.NONE;
        let p = 0;
        let candidates = 1;
        if (canopyCls !== Canopy.NONE) { p = 0.97; candidates = 3; }
        else switch (zn) {
          case Zone.MANGROVE: p = 0.95; candidates = 3; break;
          case Zone.BEACH: p = 0.6; candidates = 2; break;
          case Zone.PARK: p = 0.06 + 0.94 * smoothstep(0.35, 0.95, v) + 0.08 * clump; candidates = v > 0.6 ? 3 : v > 0.3 ? 2 : 1; break;
          // two candidates at most: a third packed the crowns of a dense suburb into one unbroken mass
          case Zone.RES_LOW: p = 0.05 + 0.75 * smoothstep(0.25, 0.95, v) + 0.05 * clump; candidates = v > 0.42 ? 2 : 1; break;
          case Zone.GOLF: p = 0.03 + 0.22 * smoothstep(0.1, 0.6, clump); break;
          case Zone.WETLAND_FLAT: p = 0.85 * smoothstep(0.55, 0.9, v); candidates = 2; break;
          case Zone.HOTEL: case Zone.RES_MID: p = 0.05; break;
          case Zone.DOWNTOWN: p = 0.02; break;
          case Zone.AIRPORT: p = 0.012; break;
          case Zone.INDUSTRIAL: p = 0.006; break;
          default: p = 0;
        }
        if (p <= 0) continue;
        // clearings: the densest zones lose ~40 % of their candidates where the clearing field is low
        if (canopyCls === Canopy.NONE && (zn === Zone.PARK || zn === Zone.RES_LOW || zn === Zone.WETLAND_FLAT)) p *= 0.6 + 0.4 * smoothstep(0.25, 0.6, clearing);
        for (let c = 0; c < candidates; c++) {
          const h = hash2(i, j, 7 + c * 3);
          if (h >= p) continue;
          // jitter past the cell so the planting lattice never shows as rows
          const jx = cx + (hash2(i, j, 8 + c * 3) - 0.5) * CELL * 1.7;
          const jz = cz + (hash2(i, j, 9 + c * 3) - 0.5) * CELL * 1.7;
          const y = map.heightAt(jx, jz);
          if (y < 0.12) continue;
          const prng = new Rng(idx * 4 + c);
          const roll = prng.next();
          const coast = map.coastAt(jx, jz);
          const nearShore = coast > -110;
          // sizes are crown heights in metres (see HEIGHTS for the species ranges)
          if (canopyCls !== Canopy.NONE) {
            if (occupied(jx, jz)) continue;
            canopyPlant(canopyCls, jx, jz, y, prng, roll, coast);
          } else if (zn === Zone.MANGROVE) {
            if (occupied(jx, jz)) continue;
            // mangrove belt with the odd sea grape and palm on its landward, higher side
            if (y > 0.9 && roll < 0.08) add(6, jx, jz, y - 0.15, size(prng, 3, 7), prng);
            else if (y > 1.0 && roll < 0.12) palm(jx, jz, y, prng, 6, 10);
            else add(2, jx, jz, y - 0.2, size(prng, 2.5, 6), prng);
          } else if (zn === Zone.BEACH) {
            if (occupied(jx, jz)) continue;
            // the dry upper beach carries coconut palms in groves that come and go along the shore; sea
            // grape grows in clumps around the dune toe; ocean-facing beaches get tussocks of dune grass
            // between them. The wet sand stays bare.
            const upper = smoothstep(0.65, 1.15, y);
            const groveN = 0.5 + 0.5 * perlin2(jx / 75 + 3.3, jz / 75 - 6.1);
            const clumpN = 0.5 + 0.5 * perlin2(jx / 28 + 8.8, jz / 28 + 1.2);
            const palmP = upper * (0.1 + 0.6 * smoothstep(0.35, 0.75, groveN));
            if (roll < palmP) palm(jx, jz, y, prng, 6, 14);
            else if (y > 0.6 && clumpN > 0.6 && prng.chance(0.75)) { const grape = prng.chance(0.6); add(grape ? 6 : 3, jx, jz, y - 0.15, grape ? size(prng, 2.5, 5.5) : size(prng, 1.5, 3.5), prng); }
            else if (y > 0.45 && y < 1.35 && map.exposureAt(jx, jz) > 0.45 && prng.chance(0.22 * smoothstep(0.42, 0.6, 0.5 + 0.5 * perlin2(jx / 40 - 2.2, jz / 40 + 9.4)))) add(5, jx, jz, y - 0.1, prng.range(1.0, 2.0), prng);
          } else if (zn === Zone.WETLAND_FLAT) {
            if (y < 0.25 || occupied(jx, jz)) continue;
            // pine flatwoods with hardwood heads where the grove field is high
            const pineShare = 0.55 - 0.3 * smoothstep(0.1, 0.5, grove);
            if (roll < pineShare) add(7, jx, jz, y - 0.3, size(prng, 10, 20), prng);
            else if (roll < pineShare + 0.2) add(1, jx, jz, y - 0.3, size(prng, 14, 20), prng);
            else add(0, jx, jz, y - 0.3, size(prng, 8, 15), prng);
          } else {
            if (occupied(jx, jz)) continue;
            const dense = v > 0.7;
            if (zn === Zone.PARK || zn === Zone.RES_LOW || zn === Zone.GOLF) {
              // coconut palms take over the canopy edge along the shore (first 45 m), then thin out inland;
              // sea grape fills the shore fringe under them; pines gather in groves inland
              const shoreFringe = coast > -45 ? 0.5 : nearShore ? 0.28 : 0;
              const palmShare = zn === Zone.GOLF ? 0.35 : zn === Zone.RES_LOW ? Math.max(dense ? 0.12 : 0.3, shoreFringe) : Math.max(shoreFringe, 0.08);
              const seaGrapeShare = coast > -60 ? 0.25 : nearShore ? 0.12 : 0.05;
              const pineShare = nearShore ? 0.02 : (zn === Zone.GOLF ? 0.2 : 0.06) + 0.16 * smoothstep(0.15, 0.55, -grove);
              const emergentShare = dense ? 0.1 + 0.14 * smoothstep(0.1, 0.5, grove) : 0.05;
              const shrubShare = dense ? 0.13 : 0.06;
              let t = roll;
              let shrub = false;
              if ((t -= palmShare) < 0) palm(jx, jz, y, prng, 7, 13);
              else if ((t -= seaGrapeShare) < 0) add(6, jx, jz, y - 0.15, size(prng, 3, 8), prng);
              else if ((t -= pineShare) < 0) add(7, jx, jz, y - 0.3, size(prng, 10, 19), prng);
              else if ((t -= emergentShare) < 0) add(1, jx, jz, y - 0.3, size(prng, 14, 20), prng);
              else if ((t -= shrubShare) < 0) { add(3, jx, jz, y - 0.1, size(prng, 1.5, 4), prng); shrub = true; }
              else add(0, jx, jz, y - 0.3, dense ? size(prng, 9, 18) : size(prng, 8, 16), prng);
              // understory under the park and suburb canopy where the planting is dense (the golf course
              // is mown): shrubs and tussocks between the trunks instead of bare lawn under every crown
              if (zn !== Zone.GOLF && !shrub) understory(jx, jz, prng, 0.45 * smoothstep(0.3, 0.75, v));
            } else if (zn === Zone.INDUSTRIAL) {
              // trees only: a trunkless shrub on a paved apron read as a floating sphere (iter08 harbor B6)
              add(0, jx, jz, y - 0.2, size(prng, 8, 14), prng);
            } else if (zn === Zone.AIRPORT) {
              add(roll < 0.3 ? 7 : 0, jx, jz, y - 0.3, roll < 0.3 ? size(prng, 10, 16) : size(prng, 8, 13), prng);
            } else {
              // downtown, bayfront and hotel strip: street trees, kept to the city's scale (a 13 m palm or
              // hardwood between the towers read as a forest giant on the bayfront)
              if (roll < 0.75) add(4, jx, jz, y - 0.15, size(prng, 6, 10), prng);
              else if (roll < 0.9) add(6, jx, jz, y - 0.2, size(prng, 3, 6), prng);
              else add(0, jx, jz, y - 0.2, size(prng, 6, 10), prng);
            }
          }
        }
      }
    }
    // avenue planting along the authored roads and the island lanes: mostly coconut palms at an uneven
    // spacing with gaps, the odd pair, and a sea grape or shade tree between them
    const roadRng = new Rng('road-palms');
    const lines: { pts: [number, number][]; width: number; spacing: number }[] = [];
    for (const r of map.roads) if (r.cls === 'highway' || r.cls === 'arterial' || r.cls === 'causeway' || r.cls === 'street') lines.push({ pts: r.pts, width: r.width, spacing: r.cls === 'street' ? 24 : 19 });
    for (const d of map.districts) if (d.track) lines.push({ pts: d.track, width: 7, spacing: 22 });
    for (const line of lines) {
      let k = 0;
      for (let s = 0; s < line.pts.length - 1; s++) {
        const [ax, az] = line.pts[s], [bx, bz] = line.pts[s + 1];
        const len = Math.hypot(bx - ax, bz - az);
        if (len < 1) continue;
        const ux = (bx - ax) / len, uz = (bz - az) / len;
        for (let t = 14; t < len - 8; t += line.spacing * roadRng.range(0.55, 1.7), k++) {
          const side = (k & 1) === 0 ? -1 : 1;
          const off = line.width * 0.5 + roadRng.range(4.5, 9);
          const x = ax + ux * t - uz * off * side, z = az + uz * t + ux * off * side;
          const y = map.heightAt(x, z);
          if (y < 0.9) continue;
          const zn = map.zoneAt(x, z);
          if (zn === Zone.INDUSTRIAL || zn === Zone.AIRPORT || zn === Zone.WETLAND_FLAT || zn === Zone.LOT) continue;
          // the road's own occupancy footprint (10 m cells around a 14 m radius) reaches 20-30 m from the centre
          // line, so an avenue tree tested where it stands never passes; on the open zones that carry no lots
          // the test is made 15 m further out instead, which still catches a building close to the shoulder.
          // Beach stays strict: the bare spit up to the abutment is the bench's hero-island mask top (a tree
          // row on both shoulders there merges into one strip and lifts it)
          const probe = zn === Zone.PARK || zn === Zone.MANGROVE ? 15 : 0;
          if (roadRng.chance(0.22) || occupied(x - uz * probe * side, z + ux * probe * side)) continue;
          const kind = roadRng.next();
          // street trees between the towers and hotels stay at the city's scale
          const city = zn === Zone.DOWNTOWN || zn === Zone.HOTEL || zn === Zone.RES_MID;
          if (kind < 0.72) palm(x, z, y, roadRng, 6, city ? 10 : 13);
          else if (kind < 0.86) add(6, x, z, y - 0.15, size(roadRng, 3, city ? 6 : 7), roadRng);
          else add(0, x, z, y - 0.3, city ? size(roadRng, 6, 10) : size(roadRng, 8, 14), roadRng);
          // pairs: a second palm a few metres along
          if (kind < 0.72 && roadRng.chance(0.2)) { const dx = ux * roadRng.range(3, 6), dz = uz * roadRng.range(3, 6); if (!occupied(x + dx, z + dz)) palm(x + dx, z + dz, map.heightAt(x + dx, z + dz), roadRng, 6, city ? 10 : 11); }
        }
      }
    }
    // marinas: a grove of coconut palms behind the boardwalk, either side of the harbour master's office
    const marinaRng = new Rng('marina-palms');
    for (const ma of map.marinas) {
      const dirX = Math.sin(ma.rot), dirZ = -Math.cos(ma.rot);
      const sideX = -dirZ, sideZ = dirX;
      // the props snap the boardwalk to the waterline along `dir`; find that point the same way
      let shore = 0;
      if (map.heightAt(ma.x, ma.z) < 0) { for (let s = 0; s >= -200; s -= 2) if (map.heightAt(ma.x + dirX * s, ma.z + dirZ * s) >= 0) { shore = s; break; } }
      else { for (let s = 0; s <= 200; s += 2) if (map.heightAt(ma.x + dirX * s, ma.z + dirZ * s) < 0) { shore = s; break; } }
      const sx = ma.x + dirX * shore, sz = ma.z + dirZ * shore;
      const halfLen = ma.piers * 14 + 30;
      const n = Math.round(halfLen * 0.28);
      for (let i = 0; i < n; i++) {
        const along = marinaRng.range(-halfLen, halfLen);
        const back = marinaRng.range(10, 44);
        const x = sx + sideX * along - dirX * back, z = sz + sideZ * along - dirZ * back;
        const y = map.heightAt(x, z);
        if (y < 0.9 || occupied(x, z)) continue;
        const zn = map.zoneAt(x, z);
        if (zn === Zone.ROAD || zn === Zone.INDUSTRIAL || zn === Zone.LOT || zn === Zone.DOWNTOWN || zn === Zone.RES_MID) continue;
        if (marinaRng.chance(0.8)) palm(x, z, y, marinaRng, 6, 13);
        else add(6, x, z, y - 0.15, size(marinaRng, 3, 7), marinaRng);
      }
    }
    if (canopyN > 0) canopyMean.copy(canopySum).divideScalar(canopyN);
    for (const p of plants) {
      if (p.arche === 4) this.counts.palms++;
      else if (p.arche === 2) this.counts.mangroves++;
      else if (p.arche === 3 || p.arche === 5) this.counts.shrubs++;
      else this.counts.trees++;
    }
    this.counts.shrubs += underPlants.length;
    occludePlants(plants);
    // the understory stands under the canopy by construction, but how much of it differs: a shrub under a
    // closed hardwood stand is buried (0.8-0.9), one under a few palms sees most of the sky (0.3-0.5) — the
    // flat 0.6 left every shrub under palms a near-black card
    occludePlants(plants, underPlants);
    for (const p of underPlants) p.occ = Math.min(p.occ, 0.88);

    // tiles: one near (3D) + one far (card) instanced mesh per family per tile; buffers are shared
    const byTile = new Map<string, { crown: Plant[]; palm: Plant[]; under: Plant[]; tx: number; tz: number }>();
    const tileOf = (p: Plant) => {
      const tx = Math.floor(p.x / TILE), tz = Math.floor(p.z / TILE);
      const key = `${tx}|${tz}`;
      let t = byTile.get(key);
      if (!t) { t = { crown: [], palm: [], under: [], tx, tz }; byTile.set(key, t); }
      return t;
    };
    for (const p of plants) { const t = tileOf(p); (p.arche === 4 ? t.palm : t.crown).push(p); }
    for (const p of underPlants) tileOf(p).under.push(p);
    const shuffleRng = new Rng('veg-shuffle');
    // YXZ: the trunk tilt is applied first and then yawed, so leaning palms lean in every direction
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), pv = new THREE.Vector3(), sv = new THREE.Vector3(), e = new THREE.Euler(0, 0, 0, 'YXZ');
    const build = (family: Family, list: Plant[], geo: THREE.BufferGeometry, mat: THREE.Material, geoHi: THREE.BufferGeometry | null) => {
      // deterministic shuffle so that reducing the instance count at distance thins the tile evenly
      for (let i = list.length - 1; i > 0; i--) { const j = shuffleRng.int(0, i); const t = list[i]; list[i] = list[j]; list[j] = t; }
      const count = list.length;
      const nearGeo = new THREE.BufferGeometry();
      for (const name of ['position', 'normal', 'uv', 'aPart']) nearGeo.setAttribute(name, geo.getAttribute(name));
      nearGeo.boundingSphere = geo.boundingSphere;
      let hiGeo: THREE.BufferGeometry | null = null;
      if (geoHi) {
        hiGeo = new THREE.BufferGeometry();
        for (const name of ['position', 'normal', 'uv', 'aPart']) hiGeo.setAttribute(name, geoHi.getAttribute(name));
        hiGeo.boundingSphere = geoHi.boundingSphere;
      }
      const farGeo = new THREE.BufferGeometry();
      for (const name of ['position', 'normal', 'uv']) farGeo.setAttribute(name, cardGeo.getAttribute(name));
      farGeo.boundingSphere = cardGeo.boundingSphere;
      const nearVar = new Float32Array(count * 4), farVar = new Float32Array(count * 4);
      const near = new THREE.InstancedMesh(nearGeo, mat, count);
      const box = new THREE.Box3();
      list.forEach((pl, i) => {
        pv.set(pl.x, pl.y, pl.z);
        // palms lean (more so on the beaches), crowns stay upright
        e.set(pl.lean, pl.rot, 0);
        q.setFromEuler(e);
        sv.set(pl.s, pl.s, pl.s);
        near.setMatrixAt(i, m.compose(pv, q, sv));
        near.setColorAt(i, pl.tint);
        // archetype + layout variant / 16 + neighbour occlusion / 256 (GLSL_OCC decodes the last)
        const kind = pl.arche + pl.variant / 16 + Math.min(0.999, pl.occ) / 256;
        nearVar[i * 4] = kind; nearVar[i * 4 + 1] = pl.seed; nearVar[i * 4 + 2] = pl.arche === 4 ? 0.15 : pl.squash; nearVar[i * 4 + 3] = pl.trunk;
        // card: the shape class' tile proportions, stretched vertically so the tile's crown centre lands
        // at this plant's crown centre (half height = card centre; the trunk base stays on the ground)
        const cc = CARD_CLASSES[shapeClass(pl.arche)];
        const centreH = pl.arche === 4 ? 1.0 : pl.trunk + 0.85 * pl.squash;
        farVar[i * 4] = kind; farVar[i * 4 + 1] = pl.seed; farVar[i * 4 + 2] = cc.w; farVar[i * 4 + 3] = cc.h * 0.5 * (centreH / (cc.trunk + 0.85 * cc.squash || 1));
        box.expandByPoint(pv);
      });
      const nearVarAttr = new THREE.InstancedBufferAttribute(nearVar, 4);
      nearGeo.setAttribute('aVar', nearVarAttr);
      farGeo.setAttribute('aVar', new THREE.InstancedBufferAttribute(farVar, 4));
      near.instanceMatrix.needsUpdate = true;
      near.receiveShadow = true;
      near.castShadow = false;
      near.matrixAutoUpdate = false;
      let hi: THREE.InstancedMesh | null = null;
      if (hiGeo) {
        hiGeo.setAttribute('aVar', nearVarAttr);
        hi = new THREE.InstancedMesh(hiGeo, mat, count);
        hi.instanceMatrix = near.instanceMatrix;
        hi.instanceColor = near.instanceColor;
        hi.receiveShadow = true;
        hi.castShadow = false;
        hi.matrixAutoUpdate = false;
        hi.visible = false;
        hi.layers.set(LAYER_MAIN);
      }
      const far = new THREE.InstancedMesh(farGeo, cardMat, count);
      far.instanceMatrix = near.instanceMatrix;
      far.instanceColor = near.instanceColor;
      far.receiveShadow = true;
      far.castShadow = false;
      far.customDepthMaterial = cardDepth;
      far.matrixAutoUpdate = false;
      // LOD metric: the planted footprint grown by the largest crown radius (GROW_SIDE x scale)
      const maxS = list.reduce((a, p) => Math.max(a, p.s), 0);
      const lod = box.getBoundingSphere(new THREE.Sphere());
      lod.radius += maxS * GROW_SIDE;
      // world-space culling bounds: plant positions grown by the largest crown sideways and by the
      // tallest card up
      box.min.x -= maxS * GROW_SIDE; box.max.x += maxS * GROW_SIDE;
      box.min.z -= maxS * GROW_SIDE; box.max.z += maxS * GROW_SIDE;
      box.min.y -= 1; box.max.y += maxS * GROW_UP;
      const sphere = box.getBoundingSphere(new THREE.Sphere());
      near.boundingSphere = sphere;
      far.boundingSphere = sphere.clone();
      far.visible = false;
      // the understory's near mesh only holds the instance buffers its cards share: it is never drawn
      if (family === Family.UNDER) { near.visible = false; this.group.add(far); } else this.group.add(near, far);
      if (hi) { hi.boundingSphere = sphere.clone(); this.group.add(hi); }
      this.tiles.push({ family, near, hi, far, box, center: sphere.center, r: sphere.radius, height: box.max.y - box.min.y, lodCenter: lod.center, lodR: lod.radius, n: count, d: 0, matrices: near.instanceMatrix.array as Float32Array, colors: near.instanceColor!.array as Float32Array, extras: [farVar], cells: null, batched3d: false, cardCells: false, mirrorCells: false, palmCells: false, palmMirrorCells: false, maxS });
    };
    for (const t of byTile.values()) {
      if (t.crown.length) build(Family.CROWN, t.crown, crownGeo, crownMat, crownGeoHi);
      if (t.palm.length) build(Family.PALM, t.palm, palmGeo, palmMat, null);
      if (t.under.length) build(Family.UNDER, t.under, crownGeo, crownMat, null);
    }
  }

  update(time: number, wind: number): void {
    this.uTime.value = time;
    this.uWind.value = wind;
  }

  /** Instances drawn from each batch this frame (for the bench and budget checks). */
  stats(): { near: number; hi: number; ultra: number; palms: number; hiPalms: number; mirrorPalms: number; cards: number; mirrorCards: number; grass: number } {
    return { near: this.nearBatch.mesh.count, hi: this.hiBatch.mesh.count, ultra: this.ultraBatch.mesh.count, palms: this.palmBatch.mesh.count, hiPalms: this.palmHiBatch.mesh.count, mirrorPalms: this.palmMirrorBatch.mesh.count, cards: this.cameraBatch.mesh.count, mirrorCards: this.mirrorBatch.mesh.count, grass: this.grass.mesh.count };
  }

  private static cells(t: Tile): VegCells {
    const grow = t.maxS * GROW_SIDE, up = t.maxS * GROW_UP;
    const m = t.matrices;
    // the same growth as the tile box: the largest crown sideways, the tallest card up
    const bound = (i: number, box: THREE.Box3) => {
      const x = m[i * 16 + 12], y = m[i * 16 + 13], z = m[i * 16 + 14];
      box.expandByPoint(_p.set(x - grow, y - 1, z - grow));
      box.expandByPoint(_p.set(x + grow, y + up, z + grow));
    };
    const nearVar = t.near.geometry.getAttribute('aVar').array as Float32Array;
    const near = splitCells({ matrices: m, colors: t.colors, extras: [nearVar] }, t.n, VEG_CELL, bound);
    return { near, cards: near.map((c) => ({ ...c, extras: t.extras })), order: near.map((_, i) => i), dist: new Float32Array(near.length) };
  }

  /** Per-tile LOD: the nearest tiles (within NEAR_DISTANCE, up to an instance budget) draw the 3D
   *  meshes (the subdivided crown mesh inside HI_DISTANCE); every other tile draws camera-facing cards,
   *  thinned with distance. Shadows always come from the card mesh (light-facing crown blobs), which for
   *  near tiles is kept off the camera layer. Tiles outside the view are not drawn; tiles whose shadow
   *  cannot reach the view do not cast. */
  updateLod(camX: number, camZ: number, cull: ViewCull, camPos?: THREE.Vector3): void {
    const tiles = this.tiles;
    // the LOD metric is the 3D distance: from altitude a canopy 500 m away is a few pixels per crown and
    // the cards are the better representation; the camera height comes from the view frustum's apex
    const camY = frustumApex(cull.viewFrustum, _apex, camX, camZ).y;
    const cam = camPos ?? _apex;
    this.grass.update(cam, cull);
    for (const t of tiles) t.d = Math.max(0, Math.sqrt((t.lodCenter.x - camX) ** 2 + (t.lodCenter.z - camZ) ** 2 + (t.lodCenter.y - camY) ** 2) - t.lodR);
    // in-place insertion sort by distance: the order barely changes between frames, so this is
    // linear and allocation-free (the budget below is spent nearest-first)
    for (let i = 1; i < tiles.length; i++) {
      const t = tiles[i];
      let j = i - 1;
      while (j >= 0 && tiles[j].d > t.d) { tiles[j + 1] = tiles[j]; j--; }
      tiles[j + 1] = t;
    }
    let budget = NEAR_BUDGET;
    let ultraBudget = ULTRA_BUDGET;
    let hiBudget = HI_BUDGET;
    // coarse cascades take the nearest COARSE_SHADOW_TILES casting tiles only (each tile is a draw call per
    // cascade and a crown's shadow there is a couple of texels); the tiles are already sorted nearest-first
    const casting = _casting;
    casting.fill(0);
    for (const t of tiles) {
      const under = t.family === Family.UNDER;
      const near = !under && t.d < (t.family === Family.CROWN ? NEAR_DISTANCE : PALM_NEAR_DISTANCE) && budget >= t.n;
      if (near) budget -= t.n;
      const inView = cull.boxInView(t.box);
      let bits = t.d < (under ? UNDER_SHADOW : this.shadowDistance) ? cull.casterCascades(t.center, t.r, t.height) : 0;
      for (let i = 0; bits >> i && i < MAX_CASCADES; i++) {
        if (!(bits & (1 << i)) || cascadeIsFine(i)) continue;
        if (casting[i] >= COARSE_SHADOW_TILES) bits &= ~(1 << i); else casting[i]++;
      }
      const near3d = near && inView;
      // crown tiles drawn in 3D go through the crown batches cell by cell (only the cells in view, each at
      // the tessellation its distance calls for; the cells of a near tile that lie beyond NEAR_DISTANCE draw
      // their cards from the camera batch instead, so the 3D / card handover is a distance from the camera
      // and not the luck of a 900 m tile boundary); the tile's own subdivided mesh is the fallback when a
      // crown batch is full
      let batched3d = false;
      /** near crown tile whose far cells went into the camera card batch this frame */
      let nearCardCells = false;
      if (t.family === Family.CROWN && (near3d || t.batched3d)) {
        const vc = (t.cells ??= Vegetation.cells(t));
        const cells = vc.near;
        const batches = this.crownBatches;
        if (near3d) {
          batched3d = true;
          nearCardCells = true;
          // cells nearest first (insertion sort on the previous frame's order), so the level-2 budget goes to
          // the crowns that fill the most of the frame
          const order = vc.order, dist = vc.dist;
          for (let i = 0; i < cells.length; i++) dist[i] = cells[i].box.distanceToPoint(cam);
          for (let i = 1; i < order.length; i++) {
            const o = order[i];
            let j = i - 1;
            while (j >= 0 && dist[order[j]] > dist[o]) { order[j + 1] = order[j]; j--; }
            order[j + 1] = o;
          }
          for (let k = 0; k < order.length; k++) {
            const i = order[k];
            const c = cells[i];
            const d = dist[i];
            let level = d < ULTRA_DISTANCE ? 2 : d < HI_DISTANCE ? 1 : d < NEAR_DISTANCE ? 0 : -1;
            const count = cull.boxInView(c.box) ? c.count : 0;
            if (level === 2) { if (count <= ultraBudget) ultraBudget -= count; else level = 1; }
            // the level-1 budget is spent nearest first too: the cells beyond it fall to level 0 (a dense park
            // clump under a 130 m aerial held 890 level-1 crowns: the far ones are 15-20 px tall)
            if (level === 1) { if (count <= hiBudget) hiBudget -= count; else level = 0; }
            // a card cell the card batch cannot take falls back to the level-0 crowns
            if (level < 0) { if (!this.cameraBatch.set(vc.cards[i], count)) level = 0; } else this.cameraBatch.set(vc.cards[i], 0);
            for (let l = 0; l < batches.length; l++) if (!batches[l].set(c, l === level ? count : 0)) batched3d = false;
          }
        }
        if (!batched3d) { for (const c of cells) for (const b of batches) b.set(c, 0); for (const c of vc.cards) this.cameraBatch.set(c, 0); nearCardCells = false; }
        t.batched3d = batched3d;
      }
      // palm tiles (no subdivided mesh): the camera draws the cells in its frustum within PALM_NEAR_DISTANCE
      // from the palm batch and the cells beyond it as cards; the tile's own mesh (every palm) is the
      // fallback when the palm batch is full. The mirror gets the cards (below), like the crowns.
      if (t.family === Family.PALM) {
        let batchedPalms = false;
        if (near3d || t.palmCells) {
          const vc = (t.cells ??= Vegetation.cells(t));
          const cells = vc.near;
          if (near3d) {
            batchedPalms = true;
            nearCardCells = true;
            for (let i = 0; i < cells.length; i++) {
              const c = cells[i];
              const count = cull.boxInView(c.box) ? c.count : 0;
              const d = c.box.distanceToPoint(cam);
              const far = d >= PALM_NEAR_DISTANCE;
              // a card cell the card batch cannot take falls back to the 3D palms
              const asCards = far && this.cameraBatch.set(vc.cards[i], count);
              if (!far) this.cameraBatch.set(vc.cards[i], 0);
              // the nearest cells draw the finned fronds (a full finned batch falls back to the strip palms)
              const hi = !asCards && d < PALM_HI_DISTANCE && this.palmHiBatch.set(c, count);
              if (!hi) this.palmHiBatch.set(c, 0);
              if (!this.palmBatch.set(c, asCards || hi ? 0 : count)) batchedPalms = false;
            }
          }
          if (!batchedPalms) { for (const c of cells) { this.palmBatch.set(c, 0); this.palmHiBatch.set(c, 0); } for (const c of vc.cards) this.cameraBatch.set(c, 0); nearCardCells = false; }
          t.palmCells = batchedPalms;
        }
        if (t.palmMirrorCells) { for (const c of t.cells!.near) this.palmMirrorBatch.set(c, 0); t.palmMirrorCells = false; }
        // the tile mesh stands in for the camera when the batch is full (main camera only: the mirror has the cards)
        t.near.visible = near3d && !batchedPalms;
        t.near.layers.set(LAYER_MAIN);
      } else if (t.family === Family.CROWN) { t.near.visible = false; t.hi!.visible = near3d && !batched3d; }
      const drawCards = !near && inView && t.d < (under ? UNDER_DISTANCE : this.viewDistance);
      // far cards: full density to 3 km, half at 5.5 km, a quarter beyond (a crown is ~1 px there); the
      // understory thins much sooner (a shrub is a pixel at 600 m)
      const frac = near ? 1 : under ? (t.d < UNDER_FULL ? 1 : t.d < UNDER_HALF ? 0.5 : 0.25) : t.d < 3000 ? 1 : t.d < 5500 ? 0.5 : 0.25;
      const count = Math.max(1, Math.round(t.n * frac));
      // the camera draws the tile's cards from the shared batch; the tile's own card mesh is left to the
      // shadow passes (and to the camera only when the batch is full)
      // tiles drawn at full density go into the camera batch cell by cell (only the cells in view);
      // thinned tiles draw their first `count` cards, whose selection the cells would change
      let batched: boolean;
      if (nearCardCells) {
        // near tile: its far cells' cards are already in the batch (set above)
        this.cameraBatch.set(t, 0);
        batched = true;
        t.cardCells = true;
      } else if (drawCards && frac === 1) {
        const cells = (t.cells ??= Vegetation.cells(t)).cards;
        this.cameraBatch.set(t, 0);
        batched = true;
        for (const c of cells) if (!this.cameraBatch.set(c, cull.boxInView(c.box) ? c.count : 0)) batched = false;
        if (!batched) for (const c of cells) this.cameraBatch.set(c, 0);
        t.cardCells = batched;
      } else {
        if (t.cardCells) { for (const c of t.cells!.cards) this.cameraBatch.set(c, 0); t.cardCells = false; }
        batched = this.cameraBatch.set(t, drawCards ? count : 0);
      }
      let mask = layerMask('all', drawCards && !batched, bits);
      const shadow = maskCasts(mask);
      // the water mirrors the card tiles within MIRROR_DISTANCE of the camera (the same test the reflection
      // pass applied to the separate tile meshes: distance to the tile's bounding sphere); the tiles drawn
      // in 3D are mirrored as cards too (the crown and palm batches are main-camera only): a blurred,
      // wave-perturbed mirror image does not tell a card from a 100-660 triangle plant
      const mirrored = !under && (drawCards || near3d) && Math.max(0, t.center.distanceTo(cam) - t.r) <= MIRROR_DISTANCE;
      if (mirrored && frac === 1) {
        // full-density tiles cell by cell against the mirror camera's frustum
        const cells = (t.cells ??= Vegetation.cells(t)).cards;
        this.mirrorBatch.set(t, 0);
        let ok = true;
        for (const c of cells) if (!this.mirrorBatch.set(c, cull.boxInMirror(c.box) ? c.count : 0)) ok = false;
        if (!ok) { for (const c of cells) this.mirrorBatch.set(c, 0); mask |= 1 << LAYER_MIRROR; }
        t.mirrorCells = ok;
      } else {
        if (t.mirrorCells) { for (const c of t.cells!.cards) this.mirrorBatch.set(c, 0); t.mirrorCells = false; }
        if (!this.mirrorBatch.set(t, mirrored ? count : 0)) mask |= 1 << LAYER_MIRROR;
      }
      t.far.visible = mask !== 0;
      t.far.castShadow = shadow;
      t.far.layers.mask = mask;
      t.far.count = count;
    }
    this.cameraBatch.commit();
    this.mirrorBatch.commit();
    this.palmBatch.commit();
    this.palmHiBatch.commit();
    this.palmMirrorBatch.commit();
    for (const b of this.crownBatches) b.commit();
  }
}
