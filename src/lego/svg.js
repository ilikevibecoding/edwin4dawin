import * as THREE from 'three';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
import { flatten } from './parts.js';

/*
 * Every printed element in this film -- minifig faces, torso printing, helmet
 * decals, insignia, hologram plates, the title logo -- is authored as SVG and
 * rasterised into a texture (or extruded into geometry) at load time.
 */

const pending = new Set();
const texCache = new Map();

/** Resolves once every SVG raster started so far has finished decoding. */
export function whenPrintsReady() {
  return Promise.all([...pending]);
}

function sizedSvg(svg, w, h) {
  if (/<svg[^>]*\swidth=/.test(svg)) return svg;
  return svg.replace(/<svg/, `<svg width="${w}" height="${h}"`);
}

export function svgToImage(svg, w, h) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'sync';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(new Error('SVG decode failed: ' + e?.message));
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(sizedSvg(svg, w, h));
  });
}

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

function finishTexture(tex, { srgb = true, flipY = true } = {}) {
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.anisotropy = 8;
  tex.flipY = flipY;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Rasterise one SVG string into a texture.
 * Returns immediately; the pixels appear as soon as the image decodes, and
 * whenPrintsReady() lets the capture pipeline wait for all of them.
 */
export function svgTexture(svg, { w = 256, h = 256, background = null, key = null } = {}) {
  const ck = key || `${w}x${h}|${background}|${svg}`;
  if (texCache.has(ck)) return texCache.get(ck);
  const canvas = makeCanvas(w, h);
  const ctx = canvas.getContext('2d');
  if (background !== null) {
    ctx.fillStyle = colorCss(background);
    ctx.fillRect(0, 0, w, h);
  }
  const tex = new THREE.CanvasTexture(canvas);
  finishTexture(tex);
  const p = svgToImage(svg, w, h).then((img) => {
    ctx.drawImage(img, 0, 0, w, h);
    tex.needsUpdate = true;
  }).catch((e) => console.warn('[svg]', e.message));
  pending.add(p);
  texCache.set(ck, tex);
  return tex;
}

export function colorCss(hex) {
  return '#' + (hex >>> 0).toString(16).padStart(6, '0').slice(-6);
}

/**
 * Compose several SVGs into one atlas texture.
 * cells: [{ svg, x, y, w, h, background }] in pixels.
 */
export function svgAtlas(cells, { w = 512, h = 512, background = 0x000000, key = null } = {}) {
  const ck = key || JSON.stringify(cells.map((c) => [c.x, c.y, c.w, c.h, c.background, c.svg?.length ?? 0])) + w + h;
  if (texCache.has(ck)) return texCache.get(ck);
  const canvas = makeCanvas(w, h);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = colorCss(background);
  ctx.fillRect(0, 0, w, h);
  const tex = new THREE.CanvasTexture(canvas);
  finishTexture(tex);
  for (const cell of cells) {
    if (cell.background !== undefined && cell.background !== null) {
      ctx.fillStyle = colorCss(cell.background);
      ctx.fillRect(cell.x, cell.y, cell.w, cell.h);
    }
    if (!cell.svg) continue;
    const p = svgToImage(cell.svg, cell.w, cell.h).then((img) => {
      ctx.drawImage(img, cell.x, cell.y, cell.w, cell.h);
      tex.needsUpdate = true;
    }).catch((e) => console.warn('[svg atlas]', e.message));
    pending.add(p);
  }
  texCache.set(ck, tex);
  return tex;
}

/** Draw straight onto a canvas texture (procedural prints, screens, holo noise). */
export function canvasTexture(w, h, draw, { srgb = true, key = null } = {}) {
  if (key && texCache.has(key)) return texCache.get(key);
  const canvas = makeCanvas(w, h);
  draw(canvas.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(canvas);
  finishTexture(tex, { srgb });
  tex.userData.canvas = canvas;
  if (key) texCache.set(key, tex);
  return tex;
}

// ---------------------------------------------------------------- geometry

/**
 * Box whose six faces sample distinct regions of one atlas texture,
 * laid out as a 3x2 grid: [+X -X +Y | -Y +Z -Z].
 * One material, one draw call, still fully printed. Used for minifig torsos.
 */
export function printedBoxGeometry(w, h, d) {
  const g = new THREE.BoxGeometry(w, h, d, 1, 1, 1);
  const uv = g.attributes.uv;
  const cells = [[0, 1], [1, 1], [2, 1], [0, 0], [1, 0], [2, 0]]; // px nx py / ny pz nz
  const cw = 1 / 3, ch = 1 / 2;
  const inset = 0.004;
  for (let f = 0; f < 6; f++) {
    const [cx, cy] = cells[f];
    for (let i = 0; i < 4; i++) {
      const idx = f * 4 + i;
      const u = uv.getX(idx), v = uv.getY(idx);
      uv.setXY(idx,
        (cx + inset + u * (1 - inset * 2)) * cw,
        (cy + inset + v * (1 - inset * 2)) * ch);
    }
  }
  uv.needsUpdate = true;
  return flatten(g);
}

/** Atlas cell rects (in pixels) matching printedBoxGeometry's layout. */
export function boxAtlasCells(size = 512) {
  const cw = Math.round(size / 3), ch = Math.round(size / 2);
  return {
    px: { x: 0, y: 0, w: cw, h: ch },
    nx: { x: cw, y: 0, w: cw, h: ch },
    py: { x: cw * 2, y: 0, w: cw, h: ch },
    ny: { x: 0, y: ch, w: cw, h: ch },
    pz: { x: cw, y: ch, w: cw, h: ch },
    nz: { x: cw * 2, y: ch, w: cw, h: ch },
  };
}

/**
 * Minifig head: an open cylinder whose print wraps around it, with caps UV'd
 * into a blank corner so the face art never smears across the top.
 * Front of the head sits at +Z, centred at u = 0.5.
 */
export function printedHeadGeometry(r, h, seg = 24) {
  const side = new THREE.CylinderGeometry(r, r, h, seg, 1, true, Math.PI, Math.PI * 2);
  const top = new THREE.CircleGeometry(r, seg);
  top.rotateX(-Math.PI / 2); top.translate(0, h / 2, 0);
  const bot = new THREE.CircleGeometry(r, seg);
  bot.rotateX(Math.PI / 2); bot.translate(0, -h / 2, 0);
  for (const cap of [top, bot]) {
    const uv = cap.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, 0.002, 0.998); // blank pixel
  }
  const merged = mergeSimple([flatten(side), flatten(top), flatten(bot)]);
  return merged;
}

function mergeSimple(list) {
  let total = 0;
  for (const g of list) total += g.attributes.position.count;
  const pos = new Float32Array(total * 3);
  const nor = new Float32Array(total * 3);
  const uv = new Float32Array(total * 2);
  let o = 0;
  for (const g of list) {
    pos.set(g.attributes.position.array, o * 3);
    nor.set(g.attributes.normal.array, o * 3);
    uv.set(g.attributes.uv.array, o * 2);
    o += g.attributes.position.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return out;
}

/** Parse an SVG into three.js shapes (for extruding logos / insignia). */
export function svgShapes(svgString) {
  const data = new SVGLoader().parse(svgString);
  const out = [];
  for (const path of data.paths) {
    const shapes = SVGLoader.createShapes(path);
    for (const shape of shapes) out.push({ shape, color: path.color, style: path.userData?.style });
  }
  return out;
}

/**
 * Extrude an SVG into 3D geometry, normalised so the art is `size` wide,
 * centred on the origin, facing +Z.
 */
export function svgExtrude(svgString, { depth = 0.2, size = 10, bevel = 0.02, curveSegments = 4 } = {}) {
  const shapes = svgShapes(svgString);
  const geos = [];
  for (const { shape } of shapes) {
    const g = new THREE.ExtrudeGeometry(shape, {
      depth, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 1, curveSegments,
    });
    geos.push(flatten(g));
  }
  if (!geos.length) return new THREE.BufferGeometry();
  const merged = mergeSimple(geos);
  merged.computeBoundingBox();
  const bb = merged.computeBoundingBox() || merged.boundingBox;
  const box = merged.boundingBox;
  const w = box.max.x - box.min.x;
  const s = size / (w || 1);
  merged.translate(-(box.min.x + box.max.x) / 2, -(box.min.y + box.max.y) / 2, 0);
  merged.scale(s, -s, s); // SVG Y is down
  merged.computeVertexNormals();
  merged.computeBoundingBox();
  return merged;
}
