import * as THREE from 'three';
import type { MatId } from '../world/layout';
import { registerAsset } from './registry';
import {
  makeCanvas, toTexture, toDataTexture, fieldFill, tileFbm, speckle, streaks,
  grout, normalFromHeight, heightCanvas, mix, rgb, type RGB,
} from './textures/gen';
import { hash2 } from '../core/rng';

/**
 * Architectural material library (Fable 3). Physically based, procedurally
 * textured, world-scale UVs (mapbuilder emits UVs in meters; each material
 * declares metersPerTile and sets texture.repeat = 1/mpt).
 */

export interface BuiltMaterial {
  mat: THREE.MeshStandardMaterial;
  metersPerTile: number;
}

let GRAYBOX = false;
export function setGrayboxMode(on: boolean): void {
  GRAYBOX = on;
}
export function isGraybox(): boolean {
  return GRAYBOX;
}

const cache = new Map<string, BuiltMaterial>();

function std(opts: THREE.MeshStandardMaterialParameters): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial(opts);
  m.envMapIntensity = 0.55;
  return m;
}

/** Apply repeat to all texture channels for world-scale UVs. */
function applyRepeat(m: THREE.MeshStandardMaterial, mpt: number): void {
  const r = 1 / mpt;
  for (const t of [m.map, m.normalMap, m.roughnessMap, m.metalnessMap, m.emissiveMap] as (THREE.Texture | null)[]) {
    if (t) t.repeat.set(r, r);
  }
}

// ---------------------------------------------------------------------------
// Builders
// ---------------------------------------------------------------------------

function grayboxMat(id: MatId): BuiltMaterial {
  const S = 256;
  const { canvas, ctx } = makeCanvas(S);
  const tint: Record<string, string> = {
    floor: '#8f959c', wall: '#b9bdc2', ceil: '#a5a9ae', misc: '#9aa0a5',
  };
  const family = /carpet|tile-|vinyl|concrete-floor|snow|wood-floor|asphalt/.test(id) ? 'floor'
    : /ceiling/.test(id) ? 'ceil'
    : /drywall|brick|cmu|plaster|metal-panel/.test(id) ? 'wall' : 'misc';
  ctx.fillStyle = tint[family];
  ctx.fillRect(0, 0, S, S);
  ctx.strokeStyle = 'rgba(40,46,54,0.55)';
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, S, S);
  ctx.strokeStyle = 'rgba(40,46,54,0.18)';
  ctx.lineWidth = 1;
  for (let i = 1; i < 4; i++) {
    ctx.beginPath(); ctx.moveTo((S / 4) * i, 0); ctx.lineTo((S / 4) * i, S); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, (S / 4) * i); ctx.lineTo(S, (S / 4) * i); ctx.stroke();
  }
  const mat = std({ map: toTexture(canvas), roughness: 0.9, metalness: 0 });
  return { mat, metersPerTile: 1 };
}

function noiseBase(size: number, c0: RGB, c1: RGB, scale: number, octaves = 4, salt = 0): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(size);
  fieldFill(ctx, size, (x, y) => tileFbm(x, y, scale, octaves, salt), c0, c1);
  return canvas;
}

function roughCanvas(size: number, base: number, amp: number, scale: number, salt = 0): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(size);
  fieldFill(ctx, size, (x, y) => base + (tileFbm(x, y, scale, 3, salt) - 0.5) * amp, [0, 0, 0], [255, 255, 255]);
  return canvas;
}

type Builder = () => BuiltMaterial;

const builders: Record<MatId, Builder> = {
  gb: () => grayboxMat('gb'),

  drywall: () => {
    const S = 512;
    const c = noiseBase(S, [226, 224, 218], [235, 233, 227], 6, 4, 1);
    const ctx = c.getContext('2d')!;
    speckle(ctx, S, 250, 'rgba(180,178,170,0.5)', 0.4, 1.0, 0.25, 11);
    const h = heightCanvas(S, (x, y) => 0.5 + (tileFbm(x, y, 24, 3, 5) - 0.5) * 0.5);
    return {
      mat: std({
        map: toTexture(c), normalMap: toDataTexture(normalFromHeight(h, 0.5)),
        normalScale: new THREE.Vector2(0.25, 0.25),
        roughnessMap: toDataTexture(roughCanvas(S, 0.88, 0.1, 8, 3)), roughness: 1, metalness: 0,
      }),
      metersPerTile: 2.2,
    };
  },

  'drywall-blue': () => tintedDrywall([196, 209, 219], 21),
  'drywall-green': () => tintedDrywall([206, 216, 204], 22),
  'drywall-warm': () => tintedDrywall([228, 216, 198], 23),
  plaster: () => tintedDrywall([224, 221, 212], 24),

  concrete: () => {
    const S = 512;
    const c = noiseBase(S, [138, 138, 134], [168, 167, 162], 4, 5, 31);
    const ctx = c.getContext('2d')!;
    speckle(ctx, S, 700, 'rgba(105,104,100,0.6)', 0.4, 1.6, 0.3, 32);
    speckle(ctx, S, 250, 'rgba(200,199,195,0.5)', 0.3, 1.0, 0.3, 33);
    const h = heightCanvas(S, (x, y) => 0.5 + (tileFbm(x, y, 10, 4, 34) - 0.5) * 0.8);
    return {
      mat: std({
        map: toTexture(c), normalMap: toDataTexture(normalFromHeight(h, 0.8)),
        normalScale: new THREE.Vector2(0.4, 0.4),
        roughnessMap: toDataTexture(roughCanvas(S, 0.9, 0.12, 6, 35)), roughness: 1, metalness: 0,
      }),
      metersPerTile: 2.6,
    };
  },

  'concrete-floor': () => {
    const S = 512;
    const c = noiseBase(S, [126, 126, 124], [152, 151, 148], 5, 5, 41);
    const ctx = c.getContext('2d')!;
    speckle(ctx, S, 900, 'rgba(96,95,92,0.55)', 0.3, 1.2, 0.35, 42);
    speckle(ctx, S, 120, 'rgba(180,179,175,0.5)', 0.4, 1.4, 0.3, 43);
    // expansion joints: one per tile (tile = 3 m)
    ctx.strokeStyle = 'rgba(70,70,68,0.85)';
    ctx.lineWidth = 3;
    ctx.strokeRect(0, 0, S, S);
    const h = heightCanvas(S, (x, y) => 0.5 + (tileFbm(x, y, 14, 4, 44) - 0.5) * 0.4);
    return {
      mat: std({
        map: toTexture(c), normalMap: toDataTexture(normalFromHeight(h, 0.6)),
        normalScale: new THREE.Vector2(0.3, 0.3),
        roughnessMap: toDataTexture(roughCanvas(S, 0.62, 0.3, 4, 45)), roughness: 1, metalness: 0,
      }),
      metersPerTile: 3,
    };
  },

  'concrete-sealed': () => {
    const S = 512;
    const c = noiseBase(S, [150, 150, 148], [172, 171, 168], 5, 4, 51);
    const ctx = c.getContext('2d')!;
    speckle(ctx, S, 400, 'rgba(120,119,116,0.5)', 0.3, 1.0, 0.3, 52);
    return {
      mat: std({
        map: toTexture(c),
        roughnessMap: toDataTexture(roughCanvas(S, 0.5, 0.25, 5, 53)), roughness: 1, metalness: 0,
      }),
      metersPerTile: 2.4,
    };
  },

  cmu: () => {
    const S = 512;
    const c = noiseBase(S, [168, 168, 164], [186, 185, 181], 8, 4, 61);
    const ctx = c.getContext('2d')!;
    // block pattern: canvas covers 1.6 m → blocks 0.4×0.2 → 4 cols, 8 rows, running bond
    const bw = S / 4, bh = S / 8;
    ctx.strokeStyle = 'rgba(120,120,116,0.9)';
    ctx.lineWidth = 3;
    for (let ry = 0; ry <= 8; ry++) {
      ctx.beginPath(); ctx.moveTo(0, ry * bh); ctx.lineTo(S, ry * bh); ctx.stroke();
    }
    for (let ry = 0; ry < 8; ry++) {
      const off = ry % 2 === 0 ? 0 : bw / 2;
      for (let cx = 0; cx <= 4; cx++) {
        const x = (cx * bw + off) % S;
        ctx.beginPath(); ctx.moveTo(x, ry * bh); ctx.lineTo(x, (ry + 1) * bh); ctx.stroke();
      }
      // per-block tone variation
      for (let cx = 0; cx < 4; cx++) {
        const x = (cx * bw + off) % S;
        ctx.fillStyle = `rgba(${140 + hash2(cx, ry) * 40},${140 + hash2(cx, ry + 9) * 38},${136 + hash2(cx, ry + 5) * 36},0.22)`;
        ctx.fillRect(x + 2, ry * bh + 2, bw - 4, bh - 4);
      }
    }
    const h = heightCanvas(S, (x, y) => {
      const gy = (y * 8) % 1, gxRow = Math.floor(y * 8);
      const gx = ((x + (gxRow % 2) * 0.125) * 4) % 1;
      const mortar = (gy < 0.06 || gy > 0.94 || gx < 0.03 || gx > 0.97) ? 0.2 : 0.6;
      return mortar + (tileFbm(x, y, 16, 3, 62) - 0.5) * 0.25;
    });
    return {
      mat: std({
        map: toTexture(c), normalMap: toDataTexture(normalFromHeight(h, 1.2)),
        normalScale: new THREE.Vector2(0.5, 0.5),
        roughnessMap: toDataTexture(roughCanvas(S, 0.9, 0.08, 6, 63)), roughness: 1, metalness: 0,
      }),
      metersPerTile: 1.6,
    };
  },

  'carpet-office': () => carpetTiles([88, 94, 104], [76, 82, 92], 71),
  'carpet-exec': () => carpetTiles([116, 106, 94], [102, 92, 80], 72),
  'carpet-lobby': () => carpetTiles([70, 76, 86], [58, 64, 74], 73),

  'tile-lobby': () => {
    const S = 512; // covers 2 m → 2 tiles of 1 m
    const c = noiseBase(S, [198, 196, 190], [214, 212, 206], 3, 4, 81);
    const ctx = c.getContext('2d')!;
    // large-format porcelain w/ soft marbling
    fieldFillOver(ctx, S, (x, y) => Math.pow(tileFbm(x, y, 2.3, 5, 82), 2) * 0.5, [150, 148, 143]);
    grout(ctx, S, 2, 'rgba(140,138,132,0.95)', 3);
    return {
      mat: std({
        map: toTexture(c),
        roughnessMap: toDataTexture(roughCanvas(S, 0.32, 0.16, 3, 83)), roughness: 1, metalness: 0,
      }),
      metersPerTile: 2,
    };
  },

  'tile-restroom': () => {
    const S = 512; // 2 m → 6 tiles (0.33)
    const c = noiseBase(S, [206, 208, 208], [220, 222, 222], 6, 3, 91);
    const ctx = c.getContext('2d')!;
    grout(ctx, S, 6, 'rgba(150,152,152,0.95)', 3);
    // per-tile tone shift
    const step = S / 6;
    for (let ty = 0; ty < 6; ty++) for (let tx = 0; tx < 6; tx++) {
      ctx.fillStyle = `rgba(160,164,166,${hash2(tx, ty + 40) * 0.14})`;
      ctx.fillRect(tx * step + 2, ty * step + 2, step - 4, step - 4);
    }
    return {
      mat: std({
        map: toTexture(c),
        roughnessMap: toDataTexture(roughCanvas(S, 0.35, 0.15, 6, 92)), roughness: 1, metalness: 0,
      }),
      metersPerTile: 2,
    };
  },

  'tile-restroom-wall': () => {
    const S = 512; // 1.2 m → 4×8 tiles 0.3×0.15
    const { canvas, ctx } = makeCanvas(S);
    ctx.fillStyle = '#cfd6d4';
    ctx.fillRect(0, 0, S, S);
    const tw = S / 4, th = S / 8;
    for (let ty = 0; ty < 8; ty++) for (let tx = 0; tx < 4; tx++) {
      const v = hash2(tx, ty + 60) * 0.12;
      ctx.fillStyle = `rgba(255,255,255,${v})`;
      ctx.fillRect(tx * tw, ty * th, tw, th);
    }
    ctx.strokeStyle = 'rgba(158,166,164,0.95)';
    ctx.lineWidth = 2.5;
    for (let ty = 0; ty <= 8; ty++) { ctx.beginPath(); ctx.moveTo(0, ty * th); ctx.lineTo(S, ty * th); ctx.stroke(); }
    for (let tx = 0; tx <= 4; tx++) { ctx.beginPath(); ctx.moveTo(tx * tw, 0); ctx.lineTo(tx * tw, S); ctx.stroke(); }
    return {
      mat: std({
        map: toTexture(canvas),
        roughnessMap: toDataTexture(roughCanvas(S, 0.22, 0.1, 4, 93)), roughness: 1, metalness: 0,
      }),
      metersPerTile: 1.2,
    };
  },

  vinyl: () => {
    const S = 512;
    const c = noiseBase(S, [196, 190, 178], [210, 204, 192], 4, 4, 101);
    const ctx = c.getContext('2d')!;
    fieldFillOver(ctx, S, (x, y) => Math.pow(tileFbm(x, y, 7, 4, 102), 3) * 0.35, [160, 152, 138]);
    return {
      mat: std({
        map: toTexture(c),
        roughnessMap: toDataTexture(roughCanvas(S, 0.45, 0.2, 4, 103)), roughness: 1, metalness: 0,
      }),
      metersPerTile: 2,
    };
  },

  'vinyl-service': () => {
    const S = 512; // 1.2 m → 2 anti-static tiles of 0.6
    const c = noiseBase(S, [116, 122, 130], [130, 136, 144], 5, 3, 111);
    const ctx = c.getContext('2d')!;
    grout(ctx, S, 2, 'rgba(84,90,98,0.9)', 3);
    speckle(ctx, S, 500, 'rgba(160,166,174,0.4)', 0.3, 0.8, 0.4, 112);
    return {
      mat: std({
        map: toTexture(c),
        roughnessMap: toDataTexture(roughCanvas(S, 0.4, 0.15, 4, 113)), roughness: 1, metalness: 0,
      }),
      metersPerTile: 1.2,
    };
  },

  'ceiling-tile': () => {
    const S = 512; // 1.2 m → 2×2 tiles 0.6
    const c = noiseBase(S, [232, 231, 227], [240, 239, 235], 8, 3, 121);
    const ctx = c.getContext('2d')!;
    speckle(ctx, S, 2200, 'rgba(190,189,184,0.5)', 0.4, 0.9, 0.5, 122);
    // T-bar grid
    ctx.fillStyle = 'rgba(196,197,196,1)';
    for (let i = 0; i <= 2; i++) {
      ctx.fillRect(i * (S / 2) - 3, 0, 6, S);
      ctx.fillRect(0, i * (S / 2) - 3, S, 6);
    }
    ctx.fillStyle = 'rgba(150,151,152,0.8)';
    for (let i = 0; i <= 2; i++) {
      ctx.fillRect(i * (S / 2) - 1, 0, 2, S);
      ctx.fillRect(0, i * (S / 2) - 1, S, 2);
    }
    return {
      mat: std({ map: toTexture(c), roughness: 0.95, metalness: 0 }),
      metersPerTile: 1.2,
    };
  },

  'ceiling-slab': () => {
    const S = 512;
    const c = noiseBase(S, [96, 97, 99], [116, 117, 118], 4, 4, 131);
    const ctx = c.getContext('2d')!;
    speckle(ctx, S, 300, 'rgba(80,81,82,0.5)', 0.5, 2, 0.3, 132);
    return {
      mat: std({ map: toTexture(c), roughness: 0.92, metalness: 0 }),
      metersPerTile: 2.4,
    };
  },

  'wood-floor': () => woodMat([172, 132, 92], [138, 100, 64], 141, 0.4),
  'wood-veneer': () => woodMat([186, 148, 106], [156, 118, 78], 142, 0.32),

  'metal-panel': () => {
    const S = 512;
    const c = noiseBase(S, [156, 162, 168], [170, 176, 182], 3, 3, 151);
    const ctx = c.getContext('2d')!;
    streaks(ctx, S, 120, 'rgba(200,206,212,0.5)', true, 0.1, 152);
    return {
      mat: std({
        map: toTexture(c), metalness: 0.35,
        roughnessMap: toDataTexture(roughCanvas(S, 0.42, 0.18, 3, 153)), roughness: 1,
      }),
      metersPerTile: 2,
    };
  },

  'metal-galv': () => {
    const S = 512;
    const c = noiseBase(S, [148, 152, 156], [172, 176, 180], 6, 3, 161);
    const ctx = c.getContext('2d')!;
    // spangle
    for (let i = 0; i < 260; i++) {
      const x = hash2(i, 162) * S, y = hash2(i, 163) * S, r = 4 + hash2(i, 164) * 14;
      ctx.fillStyle = `rgba(${150 + hash2(i, 165) * 50},${154 + hash2(i, 166) * 48},${158 + hash2(i, 167) * 44},0.30)`;
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      for (let k = 1; k <= 6; k++) {
        const a = (k / 6) * Math.PI * 2;
        ctx.lineTo(x + Math.cos(a) * r * (0.7 + hash2(i, k) * 0.5), y + Math.sin(a) * r * (0.7 + hash2(i, k + 8) * 0.5));
      }
      ctx.fill();
    }
    return {
      mat: std({
        map: toTexture(c), metalness: 0.85,
        roughnessMap: toDataTexture(roughCanvas(S, 0.5, 0.2, 5, 168)), roughness: 1,
      }),
      metersPerTile: 1.6,
    };
  },

  'brick-dark': () => {
    const S = 512; // 1.2 m → bricks 0.3×0.075 → 4 cols × 16 rows
    const { canvas, ctx } = makeCanvas(S);
    ctx.fillStyle = '#5a5450';
    ctx.fillRect(0, 0, S, S);
    const bw = S / 4, bh = S / 16;
    for (let ry = 0; ry < 16; ry++) {
      const off = ry % 2 === 0 ? 0 : bw / 2;
      for (let cx = -1; cx < 4; cx++) {
        const x = cx * bw + off;
        const t = hash2(cx + 9, ry);
        const base: RGB = mix([88, 74, 68], [58, 52, 50], t);
        const warm: RGB = mix(base, [112, 84, 66], hash2(cx, ry + 33) * 0.5);
        ctx.fillStyle = rgb(warm);
        ctx.fillRect(x + 2, ry * bh + 2, bw - 4, bh - 4);
        ctx.fillStyle = `rgba(30,28,26,${0.12 + hash2(cx, ry + 77) * 0.2})`;
        ctx.fillRect(x + 2, ry * bh + bh - 7, bw - 4, 4);
      }
    }
    const h = heightCanvas(S, (x, y) => {
      const row = Math.floor(y * 16);
      const gx = ((x + (row % 2) * 0.125) * 4) % 1;
      const gy = (y * 16) % 1;
      const mortar = (gy < 0.1 || gy > 0.9 || gx < 0.045 || gx > 0.955) ? 0.15 : 0.62;
      return mortar + (tileFbm(x, y, 20, 3, 172) - 0.5) * 0.3;
    });
    return {
      mat: std({
        map: toTexture(canvas), normalMap: toDataTexture(normalFromHeight(h, 1.4)),
        normalScale: new THREE.Vector2(0.55, 0.55),
        roughnessMap: toDataTexture(roughCanvas(S, 0.86, 0.1, 6, 173)), roughness: 1, metalness: 0,
      }),
      metersPerTile: 1.2,
    };
  },

  snow: () => {
    const S = 512;
    const c = noiseBase(S, [222, 230, 240], [244, 249, 254], 4, 5, 181);
    const ctx = c.getContext('2d')!;
    fieldFillOver(ctx, S, (x, y) => Math.pow(tileFbm(x, y, 9, 4, 182), 2.5) * 0.4, [188, 205, 226]);
    const h = heightCanvas(S, (x, y) => 0.5 + (tileFbm(x, y, 5, 4, 183) - 0.5) * 0.9);
    return {
      mat: std({
        map: toTexture(c), normalMap: toDataTexture(normalFromHeight(h, 1.0)),
        normalScale: new THREE.Vector2(0.6, 0.6),
        roughnessMap: toDataTexture(roughCanvas(S, 0.62, 0.3, 5, 184)), roughness: 1, metalness: 0,
      }),
      metersPerTile: 2.6,
    };
  },

  asphalt: () => {
    const S = 512;
    const c = noiseBase(S, [66, 67, 70], [84, 85, 88], 5, 4, 191);
    const ctx = c.getContext('2d')!;
    speckle(ctx, S, 1400, 'rgba(120,121,124,0.4)', 0.3, 0.9, 0.4, 192);
    return {
      mat: std({
        map: toTexture(c),
        roughnessMap: toDataTexture(roughCanvas(S, 0.85, 0.12, 5, 193)), roughness: 1, metalness: 0,
      }),
      metersPerTile: 2.4,
    };
  },

  'stone-dark': () => {
    const S = 512;
    const c = noiseBase(S, [52, 56, 62], [74, 78, 84], 3, 5, 201);
    const ctx = c.getContext('2d')!;
    fieldFillOver(ctx, S, (x, y) => Math.pow(tileFbm(x, y, 2, 5, 202), 3) * 0.7, [108, 112, 120]);
    return {
      mat: std({
        map: toTexture(c),
        roughnessMap: toDataTexture(roughCanvas(S, 0.3, 0.14, 3, 203)), roughness: 1, metalness: 0,
      }),
      metersPerTile: 1.6,
    };
  },
};

function fieldFillOver(ctx: CanvasRenderingContext2D, size: number, alphaFn: (x: number, y: number) => number, color: RGB): void {
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const a = Math.max(0, Math.min(1, alphaFn(x / size, y / size)));
    const i = (y * size + x) * 4;
    d[i] = d[i] * (1 - a) + color[0] * a;
    d[i + 1] = d[i + 1] * (1 - a) + color[1] * a;
    d[i + 2] = d[i + 2] * (1 - a) + color[2] * a;
  }
  ctx.putImageData(img, 0, 0);
}

function tintedDrywall(tint: RGB, salt: number): BuiltMaterial {
  const S = 512;
  const c = noiseBase(S, mix(tint, [0, 0, 0], 0.04) as RGB, mix(tint, [255, 255, 255], 0.05) as RGB, 6, 4, salt);
  const h = heightCanvas(S, (x, y) => 0.5 + (tileFbm(x, y, 24, 3, salt + 1) - 0.5) * 0.5);
  return {
    mat: std({
      map: toTexture(c), normalMap: toDataTexture(normalFromHeight(h, 0.5)),
      normalScale: new THREE.Vector2(0.25, 0.25),
      roughnessMap: toDataTexture(roughCanvas(S, 0.88, 0.1, 8, salt + 2)), roughness: 1, metalness: 0,
    }),
    metersPerTile: 2.2,
  };
}

function carpetTiles(c0: RGB, c1: RGB, salt: number): BuiltMaterial {
  const S = 512; // 2 m → 4×4 carpet tiles of 0.5
  const { canvas, ctx } = makeCanvas(S);
  const step = S / 4;
  for (let ty = 0; ty < 4; ty++) for (let tx = 0; tx < 4; tx++) {
    const t = hash2(tx + salt, ty) * 0.5 + ((tx + ty) % 2) * 0.18;
    ctx.fillStyle = rgb(mix(c0, c1, t));
    ctx.fillRect(tx * step, ty * step, step, step);
  }
  // fiber noise
  const img = ctx.getImageData(0, 0, S, S);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (hash2(i % 1024, (i / 4096) | 0) - 0.5) * 22;
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
  ctx.strokeStyle = 'rgba(0,0,0,0.18)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i <= 4; i++) {
    ctx.beginPath(); ctx.moveTo(i * step, 0); ctx.lineTo(i * step, S); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i * step); ctx.lineTo(S, i * step); ctx.stroke();
  }
  return {
    mat: std({ map: toTexture(canvas), roughness: 0.97, metalness: 0 }),
    metersPerTile: 2,
  };
}

function woodMat(c0: RGB, c1: RGB, salt: number, rough: number): BuiltMaterial {
  const S = 512;
  const { canvas, ctx } = makeCanvas(S);
  fieldFill(ctx, S, (x, y) => {
    const plank = Math.floor(y * 6);
    const po = hash2(plank, salt);
    const grain = tileFbm(x * 0.5 + po, y * 8, 6, 4, salt + plank);
    return grain * 0.7 + po * 0.3;
  }, c0, c1);
  // plank separations
  ctx.strokeStyle = 'rgba(60,44,30,0.5)';
  ctx.lineWidth = 2;
  for (let i = 0; i <= 6; i++) {
    ctx.beginPath(); ctx.moveTo(0, (S / 6) * i); ctx.lineTo(S, (S / 6) * i); ctx.stroke();
  }
  streaks(ctx, S, 200, 'rgba(70,50,32,0.5)', true, 0.16, salt + 5);
  return {
    mat: std({
      map: toTexture(canvas),
      roughnessMap: toDataTexture(roughCanvas(S, rough, 0.18, 4, salt + 6)), roughness: 1, metalness: 0,
    }),
    metersPerTile: 1.8,
  };
}

// ---------------------------------------------------------------------------

const MAT_NAMES: Record<MatId, string> = {
  gb: 'Graybox', drywall: 'Painted drywall (off-white)', 'drywall-blue': 'Painted drywall (steel blue)',
  'drywall-green': 'Painted drywall (sage)', 'drywall-warm': 'Painted drywall (warm sand)', plaster: 'Plaster',
  concrete: 'Cast concrete', 'concrete-floor': 'Concrete floor (worn)', 'concrete-sealed': 'Sealed concrete',
  cmu: 'Concrete block (CMU)', 'carpet-office': 'Carpet tile (office heather)',
  'carpet-exec': 'Carpet tile (executive taupe)', 'carpet-lobby': 'Carpet tile (lobby slate)',
  'tile-lobby': 'Porcelain tile (lobby 1m)', 'tile-restroom': 'Ceramic tile (restroom floor)',
  'tile-restroom-wall': 'Ceramic tile (restroom wall)', vinyl: 'Vinyl flooring (warm)',
  'vinyl-service': 'Anti-static tile (server)', 'ceiling-tile': 'Acoustic ceiling tile + T-bar',
  'ceiling-slab': 'Exposed concrete slab', 'wood-floor': 'Wood plank floor', 'wood-veneer': 'Birch veneer',
  'metal-panel': 'Painted metal panel', 'metal-galv': 'Galvanized steel', 'brick-dark': 'Iron-spot brick',
  snow: 'Snow', asphalt: 'Asphalt', 'stone-dark': 'Honed dark stone',
};

export function getMaterial(id: MatId): BuiltMaterial {
  const key = `${id}${GRAYBOX ? ':gb' : ''}`;
  let built = cache.get(key);
  if (!built) {
    built = GRAYBOX ? grayboxMat(id) : builders[id]();
    applyRepeat(built.mat, built.metersPerTile);
    built.mat.name = id;
    cache.set(key, built);
    registerAsset({
      id: `material.${id}`,
      name: MAT_NAMES[id],
      category: 'material',
      agent: 'Fable 3',
      files: 'src/assets/materials.ts',
      where: 'architecture-wide',
      dims: `tile ${built.metersPerTile} m`,
      materials: 'self',
      textures: 'procedural: albedo' + (built.mat.normalMap ? '+normal' : '') + (built.mat.roughnessMap ? '+roughness' : ''),
      collision: 'none',
      lod: 'none',
      status: 'integrated',
      accept: 'PBR response correct under cold/neutral/warm light; no baked directional light; tiles without visible seams',
    });
  }
  return built;
}

/** Convenience: plain color PBR material for props (cached by params). */
const plainCache = new Map<string, THREE.MeshStandardMaterial>();
export function plainMat(hex: number, rough = 0.8, metal = 0, emissiveHex = 0, emissiveIntensity = 0): THREE.MeshStandardMaterial {
  const key = `${hex}/${rough}/${metal}/${emissiveHex}/${emissiveIntensity}`;
  let m = plainCache.get(key);
  if (!m) {
    m = std({ color: hex, roughness: rough, metalness: metal });
    if (emissiveHex) {
      m.emissive = new THREE.Color(emissiveHex);
      m.emissiveIntensity = emissiveIntensity;
    }
    plainCache.set(key, m);
  }
  return m;
}
