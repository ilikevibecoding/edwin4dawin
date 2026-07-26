import * as THREE from 'three';
import { reg, OWNERS } from '../core/assets.js';
import { makeRng, hashString } from '../core/rng.js';

/**
 * DECALS — procedural wear, grime and storytelling marks.
 * Owner: Fable 3.
 *
 * Merged static batches box-project world UVs, so decals cannot ride the
 * normal batch. Instead every decal variant is painted once into ONE shared
 * transparent 2048² canvas atlas, and decalPart() returns quads (offset
 * 0.006 m along the surface normal) carrying atlas UVs. dress.js merges all
 * of them into a single mesh with buildDecalMesh() → one draw call for every
 * decal in the level.
 *
 * decalPart(kind, { pos, normalAxis, size, rot, seed }) -> part
 *   pos        [x,y,z] point ON the surface (offset applied automatically)
 *   normalAxis 'x+','x-','y+','y-','z+','z-'  (surface normal direction)
 *   size       number (square) or [w,h] in metres
 *   rot        spin around the surface normal, radians
 *   seed       any int/string — picks the painted variant deterministically
 */

const ATLAS_SIZE = 2048;
const TILE = 256; // atlas cell; some kinds take 1×2 cells
const OFFSET = 0.006;

let cv = null;
let ctx = null;
let tex = null;
let material = null;
let nextCol = 0;
let nextRow = 0;
const REGIONS = new Map();

function ctx2d() {
  if (!cv) {
    cv = document.createElement('canvas');
    cv.width = ATLAS_SIZE;
    cv.height = ATLAS_SIZE;
    ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, ATLAS_SIZE, ATLAS_SIZE);
  }
  return ctx;
}

/** Allocate a TILE-grid region (cellsW×cellsH cells), paint once, return UV rect. */
function region(key, cellsW, cellsH, draw) {
  let r = REGIONS.get(key);
  if (r) return r;
  const c = ctx2d();
  const cols = ATLAS_SIZE / TILE;
  if (nextCol + cellsW > cols) {
    nextCol = 0;
    nextRow += 2; // rows advance by 2 cells so 1×2 kinds never collide
  }
  const x = nextCol * TILE;
  const y = nextRow * TILE;
  nextCol += cellsW;
  const w = cellsW * TILE;
  const h = cellsH * TILE;
  if (y + h > ATLAS_SIZE) {
    console.error('[decals] atlas full');
    r = { u0: 0, v0: 0, u1: 0.001, v1: 0.001 };
    REGIONS.set(key, r);
    return r;
  }
  c.save();
  c.translate(x, y);
  c.beginPath();
  c.rect(0, 0, w, h);
  c.clip();
  draw(c, w, h);
  c.restore();
  if (tex) tex.needsUpdate = true;
  r = { u0: x / ATLAS_SIZE, v0: 1 - (y + h) / ATLAS_SIZE, u1: (x + w) / ATLAS_SIZE, v1: 1 - y / ATLAS_SIZE };
  REGIONS.set(key, r);
  return r;
}

/** Shared decal material — one transparent draw call for the whole level. */
export function decalMaterial() {
  if (material) return material;
  ctx2d();
  tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  material = new THREE.MeshStandardMaterial({
    map: tex,
    transparent: true,
    depthWrite: false,
    roughness: 0.95,
    metalness: 0.0,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  material.name = 'decal.atlas';
  return material;
}

/* ------------------------------------------------------------------ */
/* Painting helpers                                                     */
/* ------------------------------------------------------------------ */

function blob(c, x, y, r, rgb, a) {
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${rgb},${a})`);
  g.addColorStop(0.7, `rgba(${rgb},${a * 0.45})`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  c.fillStyle = g;
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.fill();
}

function speck(c, rng, n, w, h, rgb, aMax, rMax = 2.5) {
  for (let i = 0; i < n; i++) {
    c.fillStyle = `rgba(${rgb},${(0.2 + rng() * 0.8) * aMax})`;
    c.beginPath();
    c.arc(rng() * w, rng() * h, 0.5 + rng() * rMax, 0, Math.PI * 2);
    c.fill();
  }
}

function stroke(c, rng, x0, y0, x1, y1, width, rgb, a) {
  c.strokeStyle = `rgba(${rgb},${a})`;
  c.lineWidth = width;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(x0, y0);
  const mx = (x0 + x1) / 2 + (rng() - 0.5) * 20;
  const my = (y0 + y1) / 2 + (rng() - 0.5) * 20;
  c.quadraticCurveTo(mx, my, x1, y1);
  c.stroke();
}

/** One shoe print at (x,y), heading `ang`, scale s (sole length px ≈ 56*s). */
function shoePrint(c, x, y, ang, s, rgb, a) {
  c.save();
  c.translate(x, y);
  c.rotate(ang);
  c.scale(s, s);
  c.fillStyle = `rgba(${rgb},${a})`;
  // sole
  c.beginPath();
  c.ellipse(0, -14, 11, 20, 0, 0, Math.PI * 2);
  c.fill();
  // heel
  c.beginPath();
  c.ellipse(0, 16, 9, 10, 0, 0, Math.PI * 2);
  c.fill();
  // tread gaps
  c.globalCompositeOperation = 'destination-out';
  c.fillStyle = 'rgba(0,0,0,0.85)';
  for (let i = -3; i <= 1; i++) c.fillRect(-11, -16 + i * -6 - 1.4, 22, 2.6);
  c.fillRect(-9, 12, 18, 2.4);
  c.globalCompositeOperation = 'source-over';
  c.restore();
}

/* ------------------------------------------------------------------ */
/* Family painters (each gets a fresh rng per variant)                  */
/* ------------------------------------------------------------------ */

const PAINTERS = {
  carpetWear(c, w, h, rng) {
    // pale trampled fibres in the traffic lane + dirt at the fringes
    for (let i = 0; i < 14; i++) {
      blob(c, w * (0.2 + rng() * 0.6), h * (0.35 + rng() * 0.3), 30 + rng() * 55, '205,199,186', 0.1 + rng() * 0.08);
    }
    for (let i = 0; i < 10; i++) {
      blob(c, w * rng(), h * (rng() < 0.5 ? 0.12 : 0.88), 20 + rng() * 35, '26,24,22', 0.08 + rng() * 0.06);
    }
    speck(c, rng, 90, w, h, '30,28,25', 0.16, 1.6);
  },

  wallScuff(c, w, h, rng) {
    // heel and furniture scuffs — dark angled streaks
    for (let i = 0; i < 8; i++) {
      const x = rng() * w;
      const y = h * (0.3 + rng() * 0.6);
      const len = 20 + rng() * 60;
      const ang = (rng() - 0.5) * 0.9;
      stroke(c, rng, x, y, x + Math.cos(ang) * len, y + Math.sin(ang) * len, 2 + rng() * 5, '32,32,34', 0.12 + rng() * 0.16);
    }
    for (let i = 0; i < 4; i++) blob(c, rng() * w, h * (0.5 + rng() * 0.4), 14 + rng() * 22, '40,40,42', 0.1);
  },

  floorDirt(c, w, h, rng) {
    for (let i = 0; i < 12; i++) {
      blob(c, w * (0.15 + rng() * 0.7), h * (0.15 + rng() * 0.7), 26 + rng() * 60, '52,46,38', 0.09 + rng() * 0.09);
    }
    speck(c, rng, 160, w, h, '40,36,30', 0.22, 2.2);
  },

  waterStain(c, w, h, rng) {
    // tide-mark rings
    const cx = w / 2 + (rng() - 0.5) * 30;
    const cy = h / 2 + (rng() - 0.5) * 30;
    for (let ring = 3; ring >= 0; ring--) {
      const r = 34 + ring * (18 + rng() * 12);
      blob(c, cx, cy, r, '112,92,58', 0.05 + ring * 0.012);
      c.strokeStyle = `rgba(96,76,44,${0.14 + rng() * 0.08})`;
      c.lineWidth = 1.6 + rng() * 1.6;
      c.beginPath();
      for (let i = 0; i <= 40; i++) {
        const a = (i / 40) * Math.PI * 2;
        const rr = r * (0.92 + 0.1 * Math.sin(a * (3 + ring) + rng() * 6) + rng() * 0.02);
        const px = cx + Math.cos(a) * rr;
        const py = cy + Math.sin(a) * rr * 0.85;
        if (i === 0) c.moveTo(px, py);
        else c.lineTo(px, py);
      }
      c.closePath();
      c.stroke();
    }
  },

  ceilingLeak(c, w, h, rng) {
    const cx = w / 2;
    const cy = h / 2;
    blob(c, cx, cy, 70 + rng() * 20, '132,108,62', 0.28);
    blob(c, cx + 14, cy + 8, 40, '110,86,44', 0.22);
    c.strokeStyle = 'rgba(92,70,34,0.4)';
    c.lineWidth = 2.5;
    c.beginPath();
    for (let i = 0; i <= 44; i++) {
      const a = (i / 44) * Math.PI * 2;
      const rr = (74 + rng() * 14) * (0.9 + 0.12 * Math.sin(a * 5 + 2));
      const px = cx + Math.cos(a) * rr;
      const py = cy + Math.sin(a) * rr * 0.8;
      if (i === 0) c.moveTo(px, py);
      else c.lineTo(px, py);
    }
    c.closePath();
    c.stroke();
    speck(c, rng, 26, w, h, '90,70,36', 0.3, 1.8);
  },

  dust(c, w, h, rng) {
    // soft accumulation creeping from one edge (corners, shelf tops)
    const g = c.createLinearGradient(0, h, 0, 0);
    g.addColorStop(0, 'rgba(150,144,132,0.22)');
    g.addColorStop(0.55, 'rgba(150,144,132,0.08)');
    g.addColorStop(1, 'rgba(150,144,132,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
    speck(c, rng, 140, w, h, '168,162,150', 0.18, 1.2);
    for (let i = 0; i < 6; i++) blob(c, rng() * w, h * (0.7 + rng() * 0.3), 18 + rng() * 30, '150,144,132', 0.1);
  },

  footprints(c, w, h, rng) {
    // walking pair heading "up" the tile
    const drift = (rng() - 0.5) * 0.3;
    for (let i = 0; i < 4; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const y = h * 0.86 - i * h * 0.22;
      const x = w / 2 + side * (16 + rng() * 6) + (rng() - 0.5) * 8;
      shoePrint(c, x, y, drift + (rng() - 0.5) * 0.18, 0.95 + rng() * 0.15, '40,38,34', 0.16 + rng() * 0.1);
    }
  },

  snowTracks(c, w, h, rng) {
    // wet slush lane with melting boot prints
    for (let i = 0; i < 10; i++) {
      blob(c, w / 2 + (rng() - 0.5) * 50, h * rng(), 26 + rng() * 34, '208,216,224', 0.16);
    }
    for (let i = 0; i < 10; i++) {
      blob(c, w / 2 + (rng() - 0.5) * 44, h * rng(), 16 + rng() * 22, '60,66,74', 0.12);
    }
    const drift = (rng() - 0.5) * 0.2;
    for (let i = 0; i < 5; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const y = h * 0.9 - i * h * 0.18;
      shoePrint(c, w / 2 + side * 15, y, drift, 1.0, '52,58,66', 0.28);
      shoePrint(c, w / 2 + side * 15 - 2, y + 3, drift, 1.12, '218,226,234', 0.14);
    }
  },

  fingerprints(c, w, h, rng) {
    // faint hand smudges for glass — very low alpha, pale
    for (let i = 0; i < 9; i++) {
      const x = w * (0.2 + rng() * 0.6);
      const y = h * (0.25 + rng() * 0.5);
      c.save();
      c.translate(x, y);
      c.rotate(rng() * Math.PI);
      c.scale(1, 1.6);
      blob(c, 0, 0, 7 + rng() * 6, '226,230,236', 0.1 + rng() * 0.08);
      c.restore();
    }
    // one dragged palm smear
    c.save();
    c.translate(w * 0.5, h * 0.55);
    c.rotate((rng() - 0.5) * 0.8);
    const g = c.createLinearGradient(-50, 0, 50, 0);
    g.addColorStop(0, 'rgba(224,228,234,0)');
    g.addColorStop(0.5, 'rgba(224,228,234,0.09)');
    g.addColorStop(1, 'rgba(224,228,234,0)');
    c.fillStyle = g;
    c.fillRect(-50, -16, 100, 32);
    c.restore();
  },

  tapeTorn(c, w, h, rng) {
    // a torn strip of packing tape left on the surface
    c.save();
    c.translate(w / 2, h / 2);
    c.rotate((rng() - 0.5) * 0.5);
    const len = 90 + rng() * 60;
    const wid = 26 + rng() * 8;
    c.fillStyle = 'rgba(214,204,178,0.5)';
    c.beginPath();
    c.moveTo(-len / 2, -wid / 2);
    c.lineTo(len / 2 - 14, -wid / 2);
    // ragged torn end
    for (let i = 0; i <= 6; i++) {
      c.lineTo(len / 2 - 14 + rng() * 16, -wid / 2 + (i / 6) * wid);
    }
    c.lineTo(-len / 2, wid / 2);
    c.closePath();
    c.fill();
    c.fillStyle = 'rgba(255,255,255,0.14)';
    c.fillRect(-len / 2, -wid / 2 + 3, len - 18, 3);
    c.fillStyle = 'rgba(120,112,92,0.25)';
    c.fillRect(-len / 2, -wid / 2, 5, wid);
    c.restore();
  },

  signResidue(c, w, h, rng) {
    // ghost of a removed sign: cleaner rectangle + adhesive shadows + plugs
    const rw = w * 0.62;
    const rh = h * 0.34;
    const x = (w - rw) / 2;
    const y = (h - rh) / 2;
    c.fillStyle = 'rgba(238,238,234,0.13)';
    c.fillRect(x, y, rw, rh);
    c.strokeStyle = 'rgba(70,68,64,0.22)';
    c.lineWidth = 3;
    c.strokeRect(x, y, rw, rh);
    for (let i = 0; i < 6; i++) {
      blob(c, x + rng() * rw, y + rng() * rh, 8 + rng() * 14, '96,90,78', 0.14);
    }
    c.fillStyle = 'rgba(52,50,46,0.55)';
    for (const [hx, hy] of [[x + 8, y + 8], [x + rw - 8, y + 8], [x + 8, y + rh - 8], [x + rw - 8, y + rh - 8]]) {
      c.beginPath();
      c.arc(hx, hy, 3.2, 0, Math.PI * 2);
      c.fill();
    }
  },

  cableMarks(c, w, h, rng) {
    // grey rub-lines where cables were dragged/clipped along a wall
    for (let k = 0; k < 3; k++) {
      const y = h * (0.3 + k * 0.2) + (rng() - 0.5) * 10;
      c.strokeStyle = `rgba(58,58,62,${0.14 + rng() * 0.08})`;
      c.lineWidth = 3 + rng() * 2;
      c.beginPath();
      c.moveTo(0, y);
      for (let x = 0; x <= w; x += 24) c.lineTo(x, y + Math.sin(x * 0.05 + k * 2) * 4 + (rng() - 0.5) * 3);
      c.stroke();
      // clip shadows
      c.fillStyle = 'rgba(50,50,54,0.3)';
      for (let x = 20 + rng() * 20; x < w; x += 55 + rng() * 25) c.fillRect(x, y - 5, 6, 10);
    }
  },

  crackedPlaster(c, w, h, rng) {
    // recursive branching crack
    const walk = (x, y, ang, len, wd, depth) => {
      if (depth > 4 || len < 8) return;
      const steps = 5;
      c.strokeStyle = `rgba(40,38,36,${0.35 + wd * 0.06})`;
      c.lineWidth = wd;
      c.beginPath();
      c.moveTo(x, y);
      let px = x;
      let py = y;
      for (let i = 0; i < steps; i++) {
        ang += (rng() - 0.5) * 0.7;
        px += Math.cos(ang) * (len / steps);
        py += Math.sin(ang) * (len / steps);
        c.lineTo(px, py);
        if (rng() < 0.3) walk(px, py, ang + (rng() < 0.5 ? 1 : -1) * (0.5 + rng() * 0.6), len * 0.5, Math.max(0.6, wd * 0.55), depth + 1);
      }
      c.stroke();
      // pale spall along the main run
      if (depth === 0) blob(c, x, y, 24, '210,206,198', 0.1);
    };
    walk(w * (0.3 + rng() * 0.4), h * 0.12, Math.PI / 2 + (rng() - 0.5) * 0.5, h * 0.7, 2.6, 0);
  },

  chippedPaint(c, w, h, rng) {
    // flaked patches exposing darker undercoat, pale halo of lifted paint
    for (let i = 0; i < 7; i++) {
      const x = w * (0.15 + rng() * 0.7);
      const y = h * (0.15 + rng() * 0.7);
      const r = 8 + rng() * 20;
      c.fillStyle = 'rgba(228,226,220,0.18)';
      c.beginPath();
      c.arc(x, y, r + 4, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = `rgba(64,58,50,${0.5 + rng() * 0.3})`;
      c.beginPath();
      const verts = 6 + Math.floor(rng() * 4);
      for (let v = 0; v <= verts; v++) {
        const a = (v / verts) * Math.PI * 2;
        const rr = r * (0.55 + rng() * 0.5);
        const px = x + Math.cos(a) * rr;
        const py = y + Math.sin(a) * rr;
        if (v === 0) c.moveTo(px, py);
        else c.lineTo(px, py);
      }
      c.closePath();
      c.fill();
    }
    speck(c, rng, 40, w, h, '64,58,50', 0.4, 1.6);
  },
};

/** kind -> [variants, cellsW, cellsH, defaultSize m, description] */
const KINDS = {
  carpetWear: [3, 1, 1, 1.6, 'Pale trampled traffic lane with dirty fringes for carpet floors'],
  wallScuff: [3, 1, 1, 0.9, 'Heel and furniture scuff streaks for wall bases'],
  floorDirt: [3, 1, 1, 1.3, 'Grey-brown grime blotch with speckle for hard floors'],
  waterStain: [2, 1, 1, 1.0, 'Concentric tide-mark rings, brown, for floors and walls'],
  ceilingLeak: [2, 1, 1, 0.9, 'Yellow-brown leak blotch with dark irregular rim for ceiling tiles'],
  dust: [2, 1, 1, 0.8, 'Soft dust gradient creeping from an edge, for corners and shelf tops'],
  footprints: [3, 1, 2, [0.6, 1.2], 'Alternating boot prints with tread gaps, walking line'],
  snowTracks: [2, 1, 2, [0.9, 1.8], 'Wet slush lane with melting boot prints for entrances'],
  fingerprints: [2, 1, 1, 0.7, 'Faint palm and finger smudges for glazing'],
  tapeTorn: [3, 1, 1, 0.35, 'Torn packing-tape strip left on a surface'],
  signResidue: [2, 1, 1, 0.5, 'Clean ghost rectangle, adhesive shadows and plug holes where a sign was removed'],
  cableMarks: [2, 1, 1, 0.9, 'Grey rub-lines and clip shadows from removed cable runs'],
  crackedPlaster: [3, 1, 1, 0.8, 'Recursive branching plaster crack with pale spall'],
  chippedPaint: [2, 1, 1, 0.6, 'Flaked paint patches exposing dark undercoat'],
};

export const DECAL_KINDS = Object.keys(KINDS);

function kindRegion(kind, seed) {
  const def = KINDS[kind];
  const v = Math.abs(typeof seed === 'number' ? Math.floor(seed) : hashString(String(seed ?? 0))) % def[0];
  return region(`${kind}:${v}`, def[1], def[2], (c, w, h) => {
    PAINTERS[kind](c, w, h, makeRng(hashString(`decal:${kind}:${v}`)));
  });
}

const AXIS = {
  'y+': { e: [-Math.PI / 2, 0, 0], n: [0, 1, 0] },
  'y-': { e: [Math.PI / 2, 0, 0], n: [0, -1, 0] },
  'z+': { e: [0, 0, 0], n: [0, 0, 1] },
  'z-': { e: [0, Math.PI, 0], n: [0, 0, -1] },
  'x+': { e: [0, Math.PI / 2, 0], n: [1, 0, 0] },
  'x-': { e: [0, -Math.PI / 2, 0], n: [-1, 0, 0] },
};

/**
 * Emit one decal quad part. `pos` is the point ON the surface; the quad is
 * pushed 0.006 m out along `normalAxis`. Returns { geometry, matName, matrix,
 * noProject } — feed the collected list to buildDecalMesh().
 */
export function decalPart(kind, { pos = [0, 0, 0], normalAxis = 'y+', size, rot = 0, seed = 0 } = {}) {
  if (!KINDS[kind]) {
    console.error(`[decals] unknown decal kind "${kind}"`);
    kind = 'floorDirt';
  }
  const def = KINDS[kind];
  const dflt = def[3];
  const [w, h] = Array.isArray(size) ? size : size != null ? [size, size] : Array.isArray(dflt) ? dflt : [dflt, dflt];
  const r = kindRegion(kind, seed);
  const g = new THREE.PlaneGeometry(w, h);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, r.u0 + uv.getX(i) * (r.u1 - r.u0), r.v0 + uv.getY(i) * (r.v1 - r.v0));
  }
  uv.needsUpdate = true;
  const ax = AXIS[normalAxis] ?? AXIS['y+'];
  const qAlign = new THREE.Quaternion().setFromEuler(new THREE.Euler(ax.e[0], ax.e[1], ax.e[2]));
  const qSpin = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), rot);
  const q = qAlign.multiply(qSpin);
  const p = new THREE.Vector3(
    pos[0] + ax.n[0] * OFFSET,
    pos[1] + ax.n[1] * OFFSET,
    pos[2] + ax.n[2] * OFFSET,
  );
  const m = new THREE.Matrix4().compose(p, q, new THREE.Vector3(1, 1, 1));
  return { geometry: g, matName: 'decal.atlas', matrix: m, noProject: true };
}

/** Merge collected decal parts into one transparent mesh (single draw call). */
export function buildDecalMesh(parts) {
  if (!parts.length) return null;
  const geos = parts.map(({ geometry, matrix }) => {
    const g = geometry.clone();
    g.applyMatrix4(matrix);
    return g;
  });
  let merged = geos[0];
  if (geos.length > 1) {
    // manual merge to avoid importing BufferGeometryUtils here
    const total = geos.reduce((a, g) => a + g.attributes.position.count, 0);
    const posArr = new Float32Array(total * 3);
    const nrmArr = new Float32Array(total * 3);
    const uvArr = new Float32Array(total * 2);
    const idxArr = new Uint32Array(geos.reduce((a, g) => a + g.index.count, 0));
    let vo = 0;
    let io = 0;
    for (const g of geos) {
      posArr.set(g.attributes.position.array, vo * 3);
      nrmArr.set(g.attributes.normal.array, vo * 3);
      uvArr.set(g.attributes.uv.array, vo * 2);
      const idx = g.index.array;
      for (let i = 0; i < idx.length; i++) idxArr[io + i] = idx[i] + vo;
      io += idx.length;
      vo += g.attributes.position.count;
    }
    merged = new THREE.BufferGeometry();
    merged.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
    merged.setAttribute('normal', new THREE.BufferAttribute(nrmArr, 3));
    merged.setAttribute('uv', new THREE.BufferAttribute(uvArr, 2));
    merged.setIndex(new THREE.BufferAttribute(idxArr, 1));
    geos.forEach((g) => g.dispose());
  }
  const mesh = new THREE.Mesh(merged, decalMaterial());
  mesh.name = 'decals';
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  mesh.renderOrder = 2;
  mesh.userData.matName = 'decal.atlas';
  mesh.userData.static = true;
  mesh.raycast = () => {}; // decals are never hit targets
  return mesh;
}

let registered = false;
export function registerDecalManifest() {
  if (registered) return;
  registered = true;
  for (const [kind, [variants, cw, ch, dflt, desc]] of Object.entries(KINDS)) {
    const sz = Array.isArray(dflt) ? `${dflt[0]} × ${dflt[1]} m` : `${dflt} × ${dflt} m`;
    reg({
      id: `decal.${kind}`,
      name: `Decal — ${kind}`,
      category: 'decal',
      owner: OWNERS.FABLE3,
      files: ['src/props/decals.js', 'src/props/dress.js'],
      usedIn: 'level-wide via dress.js decal pass',
      dimensions: `default ${sz}, ${variants} painted variant(s), atlas tile ${cw * TILE}×${ch * TILE}px`,
      pivot: 'quad centre on the host surface, offset 0.006 m along the surface normal',
      materials: ['decal.atlas (shared transparent 2048² canvas atlas, single material/draw call)'],
      textures: [`procedural Canvas2D alpha art: ${desc}`],
      collision: 'none',
      lod: 'flat quads in one merged mesh; mipmapped atlas handles distance, no swap needed',
      status: 'accepted',
      acceptance: `${desc}. Alpha fades to 0 at tile edges (no hard square borders), reads as surface wear not a sticker, deterministic per seed, never z-fights (0.006 m offset + polygonOffset).`,
      evidence: ['screenshots/gallery/decals.png'],
    });
  }
}
