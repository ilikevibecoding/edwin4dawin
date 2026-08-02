/**
 * Environment library — the sets this film is shot on.
 *
 * Everything here is procedural: canvas + SVG textures, brick-kit geometry,
 * seeded RNG. No external images, no network, no `Math.random()`.
 *
 * Conventions (see docs/modeling.md)
 *   1 unit = 1 stud pitch,  PLATE 0.4,  BRICK 1.2,  minifig 5.0 tall.
 *   Forward is -Z. Up is +Y. y = 0 is the resting plane (floor / keel / ground).
 *
 * Every factory returns a THREE.Group and documents its anchors + animated
 * hooks on `userData`. Anything that moves is `userData.update(t)` or a named
 * setter, and is tagged `userData.noBake = true` so `bake()` leaves it alone.
 *
 * Lighting contract: geometry and materials are built for a single strong key
 * plus fill, supplied per shot by the director. Nothing bakes light into vertex
 * colours. The only unlit materials are things that ARE light (glow strips,
 * engine plumes, stars, nebulae) and the atmospheric backdrops
 * (`dunesBackdrop`, galaxy band) which stand in for far-field haze.
 */
import * as THREE from 'three';
import { RoundedBoxGeometry as RoundedBox } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {
  brick, plate, tile, slope, prism, wedge, cyl, cone, sphere, ring, dish, bar,
  panel, studGrid, at, rot, group, mirrorX, bake, mat, glow, norm, rng,
  C, STUD, PLATE, BRICK,
} from '../lego/bricks.js';
import { svgTexture, svg } from '../lego/svgtex.js';

/* =================================================================== */
/* shared helpers                                                       */
/* =================================================================== */

const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (t) => t * t * (3 - 2 * t);
const smoothclamp = (t) => smoothstep(clamp(t, 0, 1));

/** Colour as a css string, for canvas work. */
function css(hex, a = 1) {
  const c = new THREE.Color(hex);
  const r = Math.round(c.r * 255), g = Math.round(c.g * 255), b = Math.round(c.b * 255);
  return a >= 1 ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${a})`;
}

/** Mix two hex colours, returns hex number. */
function mix(a, b, t) {
  return new THREE.Color(a).lerp(new THREE.Color(b), t).getHex();
}

/* ---- deterministic value noise ------------------------------------- */

/**
 * Tileable 2D value-noise lattice. Wraps with period (w, h) in lattice space,
 * so textures that need seamless left/right edges get them for free.
 */
function lattice(rand, w, h) {
  const a = new Float32Array(w * h);
  for (let i = 0; i < a.length; i++) a[i] = rand();
  return { a, w, h };
}

function latticeAt(L, x, y) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const fx = smoothstep(x - xi), fy = smoothstep(y - yi);
  const w = L.w, h = L.h;
  const x0 = ((xi % w) + w) % w, x1 = (x0 + 1) % w;
  const y0 = ((yi % h) + h) % h, y1 = (y0 + 1) % h;
  const a = L.a;
  const v00 = a[y0 * w + x0], v10 = a[y0 * w + x1];
  const v01 = a[y1 * w + x0], v11 = a[y1 * w + x1];
  return lerp(lerp(v00, v10, fx), lerp(v01, v11, fx), fy);
}

/**
 * Fractal value noise, seeded and tileable.
 * @param {number} seed
 * @param {object} o {octaves, base, gain, lacunarity, ridged}
 * @returns {(x:number,y:number)=>number} 0..1, wrapping every 1.0 in x and y
 */
function fbm(seed, o = {}) {
  const oct = o.octaves ?? 4;
  const base = o.base ?? 4;
  const gain = o.gain ?? 0.5;
  const lac = o.lacunarity ?? 2;
  const rand = rng(seed);
  const layers = [];
  let amp = 1, norm2 = 0, f = base;
  for (let i = 0; i < oct; i++) {
    layers.push({ L: lattice(rand, Math.max(2, Math.round(f)), Math.max(2, Math.round(f))), amp, f: Math.max(2, Math.round(f)) });
    norm2 += amp;
    amp *= gain;
    f *= lac;
  }
  const ridged = !!o.ridged;
  return (x, y) => {
    let s = 0;
    for (const l of layers) {
      let v = latticeAt(l.L, x * l.f, y * l.f);
      if (ridged) v = 1 - Math.abs(v * 2 - 1);
      s += v * l.amp;
    }
    return s / norm2;
  };
}

/* ---- canvas textures ----------------------------------------------- */

const texCache = new Map();

/**
 * Draw a texture into a canvas once and cache it by key.
 * @param {string} key cache key (must encode every parameter)
 * @param {number} w
 * @param {number} h
 * @param {(ctx:CanvasRenderingContext2D,w:number,h:number)=>void} draw
 * @param {object} [o] {data:true for non-colour maps, repeat:[x,y], wrapT, aniso}
 */
function canvasTex(key, w, h, draw, o = {}) {
  const ck = key + '|' + w + 'x' + h + '|' + JSON.stringify(o);
  if (texCache.has(ck)) return texCache.get(ck);
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d');
  draw(ctx, w, h);
  const t = new THREE.CanvasTexture(cv);
  if (!o.data) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = o.aniso ?? 8;
  t.wrapS = o.wrapS ?? THREE.RepeatWrapping;
  t.wrapT = o.wrapT ?? THREE.RepeatWrapping;
  if (o.repeat) t.repeat.set(o.repeat[0], o.repeat[1]);
  t.needsUpdate = true;
  texCache.set(ck, t);
  return t;
}

/** Per-pixel field writer: cb(x01, y01) -> [r,g,b,a] in 0..255. */
function pixels(ctx, w, h, cb) {
  const img = ctx.createImageData(w, h);
  const d = img.data;
  let i = 0;
  for (let y = 0; y < h; y++) {
    const v = (y + 0.5) / h;
    for (let x = 0; x < w; x++) {
      const u = (x + 0.5) / w;
      const c = cb(u, v);
      d[i++] = c[0]; d[i++] = c[1]; d[i++] = c[2]; d[i++] = c.length > 3 ? c[3] : 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}

/**
 * Tangent-space normal map from a height field.
 *
 * Bump maps are useless at these scales — three differentiates them in screen
 * space, so a texture stretched over a 900-stud dune field or a 600-radius
 * planet perturbs the normal by nothing at all. Normal maps are scale
 * independent, so every relief surface here uses one.
 *
 * @param {string} key cache key
 * @param {number} w
 * @param {number} h
 * @param {(x:number,y:number)=>number} height in the same units as one UV span
 * @param {number} strength slope multiplier
 */
function normalTex(key, w, h, height, strength = 1, o = {}) {
  return canvasTex('nrm' + key, w, h, (ctx) => {
    const H = new Float32Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) H[y * w + x] = height(x, y);
    }
    const wrapX = o.wrapS !== THREE.ClampToEdgeWrapping;
    const ix = (x) => (wrapX ? ((x % w) + w) % w : clamp(x, 0, w - 1));
    const iy = (y) => clamp(y, 0, h - 1);
    pixels(ctx, w, h, (u, v) => {
      const x = Math.min(w - 1, Math.floor(u * w)), y = Math.min(h - 1, Math.floor(v * h));
      const dhdu = (H[y * w + ix(x + 1)] - H[y * w + ix(x - 1)]) * 0.5 * w * strength;
      const dhdv = (H[iy(y + 1) * w + x] - H[iy(y - 1) * w + x]) * 0.5 * h * strength;
      // canvas y runs down, texture v runs up: flip dv so green points +V
      const nx = -dhdu, ny = dhdv, nz = 1;
      const l = Math.sqrt(nx * nx + ny * ny + nz * nz);
      return [
        Math.round((nx / l * 0.5 + 0.5) * 255),
        Math.round((ny / l * 0.5 + 0.5) * 255),
        Math.round((nz / l * 0.5 + 0.5) * 255),
      ];
    });
  }, { ...o, data: true });
}

/** Normal map derived from an already-rendered grayscale canvas texture. */
function normalFromGray(key, tex, strength = 1, o = {}) {
  const cv = tex.image;
  const w = cv.width, h = cv.height;
  const data = cv.getContext('2d').getImageData(0, 0, w, h).data;
  return normalTex(key, w, h, (x, y) => data[(y * w + x) * 4] / 255, strength, o);
}

/**
 * Draw armour plating: bands of varying height, each split into plates of
 * varying width, over a dark base that shows through as shadow gaps. This is
 * what stops hull texture reading as ruled graph paper — no seam ever runs the
 * full width, and no two plates are the same size.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} w
 * @param {number} h
 * @param {()=>number} rand seeded
 * @param {object} o {gap, band:[min,max], plate:[min,max], tone(t01)->css,
 *   gapColor, ventColor, widen(v01)->scale, detail}
 */
function plateField(ctx, w, h, rand, o) {
  const gap = o.gap ?? 2;
  const [bMin, bMax] = o.band;
  const [pMin, pMax] = o.plate;
  const widen = o.widen || (() => 1);
  ctx.fillStyle = o.gapColor;
  ctx.fillRect(0, 0, w, h);
  let y = 0;
  while (y < h) {
    const v = (y + 0.5) / h;
    const k = widen(v);
    const bandH = bMin + rand() * (bMax - bMin);
    const baseW = (pMin + rand() * (pMax - pMin)) * k;
    let x = -rand() * baseW;
    while (x < w) {
      const pw = baseW * (0.55 + rand() * 1.5);
      const t = 0.42 + Math.pow(rand(), 1.4) * 0.5;
      ctx.fillStyle = o.tone(t);
      ctx.fillRect(x, y, pw - gap, bandH - gap);
      if (o.detail !== false && pw > baseW * 0.9 && bandH > bMin * 1.3 && rand() < 0.72) {
        const inset = Math.min(pw, bandH) * 0.18;
        if (rand() < 0.5) {
          ctx.fillStyle = o.tone(clamp(t + (rand() - 0.5) * 0.34, 0.1, 1));
          ctx.fillRect(x + inset, y + inset, (pw - gap) * (0.3 + rand() * 0.45), (bandH - gap) - inset * 2);
        } else {
          ctx.fillStyle = o.ventColor;
          const vh = (bandH - gap) * 0.26;
          for (let i = 0; i < 3; i++) {
            ctx.fillRect(x + inset, y + inset + i * vh * 1.5, (pw - gap) * 0.5, vh * 0.7);
          }
        }
      }
      x += pw;
    }
    y += bandH;
  }
}

/** Soft round dot — the workhorse sprite for stars, glows and sparks. */
function dotTex(hardness = 0.25, key = 'dot') {
  return canvasTex(key + hardness, 64, 64, (ctx, w) => {
    const g = ctx.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(hardness, 'rgba(255,255,255,0.85)');
    g.addColorStop(0.55, 'rgba(255,255,255,0.22)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, w);
  }, { wrapS: THREE.ClampToEdgeWrapping, wrapT: THREE.ClampToEdgeWrapping });
}

/** Four-spike lens flare / bright star sprite. */
function flareTex() {
  return canvasTex('flare', 128, 128, (ctx, w) => {
    const c = w / 2;
    const g = ctx.createRadialGradient(c, c, 0, c, c, c * 0.42);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.35, 'rgba(255,255,255,0.45)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, w);
    ctx.save();
    ctx.translate(c, c);
    for (let k = 0; k < 4; k++) {
      ctx.rotate(Math.PI / 2);
      const s = ctx.createLinearGradient(0, 0, c, 0);
      s.addColorStop(0, 'rgba(255,255,255,0.85)');
      s.addColorStop(0.25, 'rgba(255,255,255,0.22)');
      s.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = s;
      ctx.beginPath();
      ctx.moveTo(0, -w * 0.022);
      ctx.lineTo(c, 0);
      ctx.lineTo(0, w * 0.022);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }, { wrapS: THREE.ClampToEdgeWrapping, wrapT: THREE.ClampToEdgeWrapping });
}

/**
 * Filamentary nebula cloud. Wide spectral content so it still shows structure
 * when a single billboard covers a third of the sky.
 */
function nebulaTex(seed) {
  return canvasTex('neb' + seed, 512, 512, (ctx, w, h) => {
    const soft = fbm(seed * 3 + 1, { octaves: 7, base: 4, gain: 0.62 });
    const fil = fbm(seed * 61 + 13, { octaves: 6, base: 6, gain: 0.58, ridged: true });
    const warp = fbm(seed * 17 + 5, { octaves: 3, base: 3 });
    pixels(ctx, w, h, (u, v) => {
      const wx = (warp(u, v) - 0.5) * 0.22;
      const wy = (warp(v + 0.37, u) - 0.5) * 0.22;
      const dx = u - 0.5, dy = v - 0.5;
      const r = Math.sqrt(dx * dx + dy * dy) * 2;
      const fall = Math.pow(smoothclamp(1.05 - r), 1.6);
      const s = soft(u + wx, v + wy);
      const f = fil(u * 1.4 + wx, v * 1.4 + wy);
      let d = clamp((s * 0.62 + f * 0.55) - 0.42, 0, 1) * 2.1 * fall;
      d = clamp(d, 0, 1);
      const core = Math.pow(d, 2.4);
      return [
        Math.round(lerp(150, 255, core)),
        Math.round(lerp(120, 236, core)),
        Math.round(lerp(190, 226, core)),
        Math.round(clamp(d * 1.15, 0, 1) * 255),
      ];
    });
  }, { wrapS: THREE.ClampToEdgeWrapping, wrapT: THREE.ClampToEdgeWrapping });
}

/** Wispy cloud puff, used for nebulae, smoke and fireballs. */
function puffTex(seed = 7) {
  return canvasTex('puff' + seed, 256, 256, (ctx, w, h) => {
    const n = fbm(seed, { octaves: 5, base: 3, gain: 0.55 });
    const m = fbm(seed * 31 + 5, { octaves: 3, base: 2 });
    pixels(ctx, w, h, (u, v) => {
      const dx = u - 0.5, dy = v - 0.5;
      const r = Math.sqrt(dx * dx + dy * dy) * 2;
      const fall = smoothclamp(1 - r);
      const t = n(u, v) * 0.75 + m(u * 0.5, v * 0.5) * 0.25;
      let a = fall * fall * (t * 1.5 - 0.28);
      a = clamp(a, 0, 1);
      const core = clamp(a * 1.35, 0, 1);
      return [255, 250, 244, Math.round(a * 255 * (0.55 + core * 0.45))];
    });
  }, { wrapS: THREE.ClampToEdgeWrapping, wrapT: THREE.ClampToEdgeWrapping });
}

/* ---- lightweight geometry helpers --------------------------------- */

const rawCache = new Map();
function rawGeo(key, build) {
  let g = rawCache.get(key);
  if (!g) { g = build(); rawCache.set(key, g); }
  return g;
}

/**
 * Un-bevelled box, 12 triangles, base at y = 0, centred on X/Z.
 * Greeble currency: use this (not `tile`) when there will be hundreds.
 */
function boxMesh(w0, h0, d0, material) {
  // quantised so the geometry cache actually hits when greeble is randomised
  const q = (v) => Math.max(0.05, Math.round(v * 4) / 4);
  const w = q(w0), h = q(h0), d = q(d0);
  const g = rawGeo(`bx${w}|${h}|${d}`, () => {
    const b = norm(new THREE.BoxGeometry(w, h, d));
    b.translate(0, h / 2, 0);
    return b;
  });
  const m = new THREE.Mesh(g, material);
  m.castShadow = m.receiveShadow = true;
  return m;
}

/** Un-bevelled box centred on all three axes — for rotated greeble. */
function flat(w0, h0, d0, material) {
  const q = (v) => Math.max(0.05, Math.round(v * 4) / 4);
  const w = q(w0), h = q(h0), d = q(d0);
  const g = rawGeo(`fl${w}|${h}|${d}`, () => norm(new THREE.BoxGeometry(w, h, d)));
  const m = new THREE.Mesh(g, material);
  m.castShadow = m.receiveShadow = true;
  return m;
}

/** Bevelled box centred on all three axes (108 tris) — hero panels and beams. */
function blk(w0, h0, d0, material) {
  const q = (v) => Math.max(0.05, Math.round(v * 8) / 8);
  const w = q(w0), h = q(h0), d = q(d0);
  const g = rawGeo(`bk${w}|${h}|${d}`, () => {
    const r = Math.min(0.045, w / 2.5, h / 2.5, d / 2.5);
    return norm(new RoundedBox(w, h, d, 1, r));
  });
  const m = new THREE.Mesh(g, material);
  m.castShadow = m.receiveShadow = true;
  return m;
}

/** Cheap open tube / pipe along Y, base at y = 0. */
function pipeMesh(r0, h0, material, seg = 10) {
  const r = Math.max(0.02, Math.round(r0 * 20) / 20);
  const h = Math.max(0.05, Math.round(h0 * 4) / 4);
  const g = rawGeo(`pp${r}|${h}|${seg}`, () => {
    const b = norm(new THREE.CylinderGeometry(r, r, h, seg, 1, true));
    b.translate(0, h / 2, 0);
    return b;
  });
  const m = new THREE.Mesh(g, material);
  m.castShadow = m.receiveShadow = true;
  return m;
}

/** Additive unlit material — fresh instance so callers may animate it. */
function fx(color, opacity = 1, o = {}) {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    blending: o.blending ?? THREE.AdditiveBlending,
    depthWrite: false,
    side: o.side ?? THREE.DoubleSide,
    toneMapped: false,
    map: o.map || null,
  });
}

/** Camera-facing additive quad. `mesh.userData.noBake = true` is preset. */
function billboard(size, material, sizeY = size) {
  const g = rawGeo(`quad`, () => new THREE.PlaneGeometry(1, 1));
  const m = new THREE.Mesh(g, material);
  m.scale.set(size, sizeY, 1);
  m.userData.noBake = true;
  return m;
}

/** Sprite (always camera facing) with an additive map. */
function spriteFx(size, map, color, opacity = 1) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({
    map, color, transparent: true, opacity,
    blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
  }));
  s.scale.set(size, size, 1);
  s.userData.noBake = true;
  return s;
}

/** Mark a subtree as bake-exempt (animated). */
function keep(obj) {
  obj.traverse((o) => { o.userData.noBake = true; });
  return obj;
}

/**
 * Bake a group, then hand back N clones of the merged meshes sharing geometry.
 * This is how the corridor and the trench tile: one authored section, merged
 * once, instanced by reference — cheap in memory and in draw calls.
 */
function bakedTemplate(build) {
  const baked = bake(build());
  return () => {
    const g = new THREE.Group();
    baked.children.forEach((c) => {
      const k = c.clone();
      k.geometry = c.geometry;
      g.add(k);
    });
    return g;
  };
}

/* =================================================================== */
/* SPACE                                                                */
/* =================================================================== */

/**
 * Layered starfield.
 *
 * Anchor: centred on the origin — put it on the camera rig (or at the shot's
 * focus) and it reads as infinity. Points are drawn with `depthWrite = false`
 * and `renderOrder = -1000`, and their size is in pixels (no size
 * attenuation), so nothing z-fights and no star ever becomes a blob.
 *
 * @param {object} o {count, radius, seed}
 * @returns {THREE.Group} userData: {radius, layers, update(t)}
 */
export function starfield({ count = 6000, radius = 4000, seed = 11 } = {}) {
  const g = new THREE.Group();
  g.name = 'starfield';
  const rand = rng(seed);

  // colour temperature ramp: mostly white, some blue-hot, some cool amber
  const temp = (r) => {
    if (r < 0.12) return new THREE.Color(0xaecbff);           // hot blue
    if (r < 0.28) return new THREE.Color(0xdfe9ff);           // blue-white
    if (r < 0.72) return new THREE.Color(0xfdfdfa);           // white
    if (r < 0.9) return new THREE.Color(0xffe6b8);            // yellow
    return new THREE.Color(0xffbe8a);                          // amber
  };

  const layers = [
    { n: Math.round(count * 0.6), size: 1.6, r: [0.9, 1.0], op: 0.75, sat: 0.5 },
    { n: Math.round(count * 0.3), size: 2.5, r: [0.8, 0.95], op: 0.9, sat: 0.8 },
    { n: Math.round(count * 0.1), size: 3.8, r: [0.7, 0.9], op: 1.0, sat: 1.0 },
  ];

  const made = [];
  for (const L of layers) {
    const pos = new Float32Array(L.n * 3);
    const col = new Float32Array(L.n * 3);
    for (let i = 0; i < L.n; i++) {
      // uniform on the sphere
      const u = rand() * 2 - 1;
      const th = rand() * TAU;
      const s = Math.sqrt(1 - u * u);
      const rr = radius * lerp(L.r[0], L.r[1], rand());
      pos[i * 3] = Math.cos(th) * s * rr;
      pos[i * 3 + 1] = u * rr;
      pos[i * 3 + 2] = Math.sin(th) * s * rr;
      const c = temp(rand()).lerp(new THREE.Color(0xffffff), 1 - L.sat);
      const b = lerp(0.45, 1, rand() * rand() + 0.0);
      col[i * 3] = c.r * b; col[i * 3 + 1] = c.g * b; col[i * 3 + 2] = c.b * b;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const m = new THREE.PointsMaterial({
      size: L.size,
      sizeAttenuation: false,
      map: dotTex(0.3, 'star'),
      vertexColors: true,
      transparent: true,
      opacity: L.op,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    const p = new THREE.Points(geo, m);
    p.renderOrder = -1000;
    p.frustumCulled = false;
    p.userData.noBake = true;
    g.add(p);
    made.push({ points: p, base: L.op });
  }

  // a handful of bright foreground stars with a flare
  const nBright = 16;
  const bp = new Float32Array(nBright * 3);
  const bc = new Float32Array(nBright * 3);
  for (let i = 0; i < nBright; i++) {
    const u = rand() * 2 - 1;
    const th = rand() * TAU;
    const s = Math.sqrt(1 - u * u);
    const rr = radius * 0.62;
    bp[i * 3] = Math.cos(th) * s * rr;
    bp[i * 3 + 1] = u * rr;
    bp[i * 3 + 2] = Math.sin(th) * s * rr;
    const c = temp(rand());
    bc[i * 3] = c.r; bc[i * 3 + 1] = c.g; bc[i * 3 + 2] = c.b;
  }
  const bgeo = new THREE.BufferGeometry();
  bgeo.setAttribute('position', new THREE.BufferAttribute(bp, 3));
  bgeo.setAttribute('color', new THREE.BufferAttribute(bc, 3));
  const bmat = new THREE.PointsMaterial({
    size: 13,
    sizeAttenuation: false,
    map: flareTex(),
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const bright = new THREE.Points(bgeo, bmat);
  bright.renderOrder = -1000;
  bright.frustumCulled = false;
  bright.userData.noBake = true;
  g.add(bright);

  g.userData.radius = radius;
  g.userData.layers = made.map((m) => m.points);
  g.userData.bright = bright;
  g.userData.noBake = true;
  g.userData.update = (t) => {
    // barely-there twinkle, so the sky is never dead still
    made.forEach((m, i) => {
      m.points.material.opacity = m.base * (1 + 0.06 * Math.sin(t * (0.7 + i * 0.31) + i));
    });
    bmat.opacity = 0.9 + 0.1 * Math.sin(t * 1.7);
    bmat.size = 13 + 1.6 * Math.sin(t * 2.3 + 1);
  };
  return g;
}

/**
 * Soft additive nebula billboards. A few huge clouds at different distances
 * give the void parallax and depth without any volumetrics.
 *
 * Anchor: centred on the origin, clouds face inward. `userData.clouds`.
 *
 * @param {object} o {seed, color, radius, count, scale}
 */
export function nebula({ seed = 3, color = 0x5b3f9d, radius = 3400, count = 7, scale = 1 } = {}) {
  const g = new THREE.Group();
  g.name = 'nebula';
  const rand = rng(seed);
  const base = new THREE.Color(color);
  const clouds = [];
  // clouds cluster into two or three regions, the way real nebulae do
  const hubs = [];
  for (let i = 0; i < 3; i++) {
    const u = rand() * 1.4 - 0.7;
    const th = rand() * TAU;
    hubs.push([th, u]);
  }
  for (let i = 0; i < count; i++) {
    const hub = hubs[i % hubs.length];
    const th = hub[0] + (rand() - 0.5) * 0.75;
    const u = clamp(hub[1] + (rand() - 0.5) * 0.5, -0.95, 0.95);
    const s = Math.sqrt(Math.max(0.02, 1 - u * u));
    const rr = radius * lerp(0.62, 0.95, rand());
    const tint = base.clone()
      .offsetHSL((rand() - 0.5) * 0.22, (rand() - 0.5) * 0.3, (rand() - 0.5) * 0.1);
    const size = radius * lerp(0.34, 0.82, rand()) * scale;
    const m = billboard(size, fx(tint.getHex(), lerp(0.3, 0.62, rand()), {
      map: nebulaTex(seed * 7 + i * 13 + 1),
    }), size * lerp(0.55, 1, rand()));
    m.position.set(Math.cos(th) * s * rr, u * rr, Math.sin(th) * s * rr);
    m.lookAt(0, 0, 0);
    m.rotateZ(rand() * TAU);
    m.renderOrder = -900;
    m.frustumCulled = false;
    clouds.push(m);
    g.add(m);
  }
  const baseOpacity = clouds.map((c) => c.material.opacity);
  g.userData.clouds = clouds;
  g.userData.noBake = true;
  g.userData.update = (t) => {
    clouds.forEach((c, i) => {
      c.material.opacity = baseOpacity[i] * (1 + 0.12 * Math.sin(t * 0.11 + i * 1.7));
    });
  };
  return g;
}

/**
 * The full deep-space backdrop: starfield + nebula clouds + a distant galaxy
 * band. Drop it on the camera rig; nothing in it writes depth.
 *
 * @param {object} o {seed, radius, count, color}
 * @returns {THREE.Group} userData: {radius, stars, clouds, band, update(t)}
 */
export function spaceBackdrop({ seed = 5, radius = 4000, count = 6500, color = 0x4a3a86 } = {}) {
  const g = new THREE.Group();
  g.name = 'spaceBackdrop';
  const rand = rng(seed * 977 + 1);

  const stars = starfield({ count, radius, seed: seed * 31 + 7 });
  g.add(stars);
  const neb = nebula({ seed: seed * 17 + 3, color, radius: radius * 0.9 });
  g.add(neb);

  // galaxy band: a wispy cylinder wrapped around the sky, tilted off axis
  const bandTex = canvasTex('galaxyband' + seed, 2048, 512, (ctx, w, h) => {
    const wisp = fbm(seed * 13 + 2, { octaves: 6, base: 16, gain: 0.55 });
    const dust = fbm(seed * 29 + 9, { octaves: 5, base: 10, gain: 0.6, ridged: true });
    const wobN = fbm(seed * 7 + 5, { octaves: 2, base: 3 });
    pixels(ctx, w, h, (u, v) => {
      const y = (v - 0.5) * 2;
      const wob = (wobN(u, 0.31) - 0.5) * 0.55;         // the lane wanders
      const d = Math.abs(y - wob);
      const core = Math.exp(-(d * d) / 0.014);
      const halo = Math.exp(-(d * d) / 0.13);
      const cl = wisp(u, v * 0.55);
      const dk = dust(u * 1.3, v * 0.8);
      let a = core * 0.5 * (0.35 + cl * 1.1) + halo * 0.2 * (0.25 + cl * 0.9);
      a *= 0.35 + 0.85 * dk;                            // dark dust lanes bite in
      a *= smoothclamp(1.35 - d * 1.5);                  // vanish at the edges
      a = clamp(a, 0, 1);
      const warm = clamp(core * 1.1, 0, 1);
      return [lerp(142, 248, warm), lerp(158, 242, warm), lerp(205, 224, warm), Math.round(a * 235)];
    });
  });
  const bandGeo = rawGeo('bandcyl', () => {
    const c = new THREE.CylinderGeometry(1, 1, 1, 96, 1, true);
    return norm(c);
  });
  const bandMat = fx(0xffffff, 0.34, { map: bandTex, side: THREE.BackSide });
  bandMat.blending = THREE.AdditiveBlending;
  const band = new THREE.Mesh(bandGeo, bandMat);
  band.scale.set(radius * 0.94, radius * 0.78, radius * 0.94);
  band.renderOrder = -950;
  band.frustumCulled = false;
  band.userData.noBake = true;

  // the galactic plane: band plus a dense pinpoint layer that shares its tilt,
  // so the band's granularity is real stars rather than blurred texels
  const sky = new THREE.Group();
  sky.rotation.set(0.42, rand() * TAU, 0.36);
  sky.add(band);
  {
    const n = Math.round(count * 0.55);
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const th = rand() * TAU;
      // gaussian-ish crowding toward the plane (y of the tilted frame)
      const y = (rand() + rand() + rand() - 1.5) * 0.17;
      const rr = radius * lerp(0.86, 0.93, rand());
      const s = 1 / Math.sqrt(1 + y * y);
      pos[i * 3] = Math.cos(th) * s * rr;
      pos[i * 3 + 1] = y * s * rr;
      pos[i * 3 + 2] = Math.sin(th) * s * rr;
      const b = 0.3 + rand() * rand() * 0.7;
      col[i * 3] = b; col[i * 3 + 1] = b * 0.98; col[i * 3 + 2] = b * 0.93;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const p = new THREE.Points(geo, new THREE.PointsMaterial({
      size: 1.3, sizeAttenuation: false, map: dotTex(0.3, 'star'), vertexColors: true,
      transparent: true, opacity: 0.62, blending: THREE.AdditiveBlending,
      depthWrite: false, toneMapped: false,
    }));
    p.renderOrder = -1000;
    p.frustumCulled = false;
    p.userData.noBake = true;
    sky.add(p);
  }
  g.add(sky);

  // a couple of far pinpoint "distant galaxies" for scale
  for (let i = 0; i < 3; i++) {
    const s = spriteFx(radius * 0.02, puffTex(seed + 40 + i), 0xbfd4ff, 0.5);
    const u = rand() * 2 - 1, th = rand() * TAU, sn = Math.sqrt(1 - u * u);
    s.position.set(Math.cos(th) * sn, u, Math.sin(th) * sn).multiplyScalar(radius * 0.8);
    s.scale.y *= 0.45;
    s.renderOrder = -940;
    g.add(s);
  }

  g.userData.radius = radius;
  g.userData.stars = stars;
  g.userData.clouds = neb;
  g.userData.band = band;
  g.userData.noBake = true;
  g.userData.update = (t) => {
    stars.userData.update(t);
    neb.userData.update(t);
    bandMat.opacity = 0.34 + 0.02 * Math.sin(t * 0.23);
  };
  return g;
}

/**
 * Jump to lightspeed. Radial star streaks around the -Z axis of travel.
 *
 * Anchor: origin, tunnel runs along Z. Point the camera down -Z and sit inside
 * it. `userData.setStretch(0..1)` morphs points -> long streaks;
 * `userData.update(t)` scrolls the field so it keeps moving at full stretch.
 *
 * @param {object} o {count, radius, length, seed, color}
 * @returns {THREE.Group} userData: {setStretch, update, streaks, flash}
 */
export function hyperspaceTunnel({ count = 1400, radius = 90, length = 460, seed = 21 } = {}) {
  const g = new THREE.Group();
  g.name = 'hyperspaceTunnel';
  const rand = rng(seed);

  const base = new Float32Array(count * 3);   // x, y, z0
  const len01 = new Float32Array(count);      // per-streak length multiplier
  for (let i = 0; i < count; i++) {
    const th = rand() * TAU;
    // bias toward the tube wall so the centre stays readable
    const rr = radius * (0.06 + 0.94 * Math.pow(rand(), 0.55));
    base[i * 3] = Math.cos(th) * rr;
    base[i * 3 + 1] = Math.sin(th) * rr;
    base[i * 3 + 2] = -length * rand();
    len01[i] = 0.35 + 0.65 * rand();
  }

  const pos = new Float32Array(count * 6);
  const col = new Float32Array(count * 6);
  for (let i = 0; i < count; i++) {
    const c = new THREE.Color(0xffffff).lerp(new THREE.Color(0x8fc6ff), rand() * 0.8);
    for (let k = 0; k < 2; k++) {
      const j = (i * 2 + k) * 3;
      const f = k === 0 ? 1 : 0.15;   // tail fades out
      col[j] = c.r * f; col[j + 1] = c.g * f; col[j + 2] = c.b * f;
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const lineMat = new THREE.LineBasicMaterial({
    vertexColors: true, transparent: true, opacity: 0.95,
    blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
  });
  const streaks = new THREE.LineSegments(geo, lineMat);
  streaks.frustumCulled = false;
  streaks.userData.noBake = true;
  g.add(streaks);

  // the point state, cross-faded out as the streaks stretch
  const pgeo = new THREE.BufferGeometry();
  pgeo.setAttribute('position', new THREE.BufferAttribute(base.slice(), 3));
  const pmat = new THREE.PointsMaterial({
    size: 2.4, sizeAttenuation: false, map: dotTex(0.3, 'star'),
    color: 0xeaf4ff, transparent: true, opacity: 1,
    blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
  });
  const dots = new THREE.Points(pgeo, pmat);
  dots.frustumCulled = false;
  dots.userData.noBake = true;
  g.add(dots);

  // vanishing-point flash that blooms with the jump
  const flash = spriteFx(radius * 0.9, dotTex(0.05, 'soft'), 0xbfe0ff, 0);
  flash.position.set(0, 0, -length * 0.98);
  g.add(flash);
  const halo = spriteFx(radius * 2.6, dotTex(0.02, 'soft'), 0x6fa8ff, 0);
  halo.position.set(0, 0, -length * 0.96);
  g.add(halo);

  let stretch = 0, scroll = 0;
  const write = () => {
    const p = geo.attributes.position.array;
    const dp = pgeo.attributes.position.array;
    const s = smoothclamp(stretch);
    const tail = lerp(0.6, length * 0.85, Math.pow(s, 1.5));
    for (let i = 0; i < count; i++) {
      const x = base[i * 3], y = base[i * 3 + 1];
      let z = base[i * 3 + 2] + scroll * lerp(0.25, 1, len01[i]);
      z = -length + (((z + length) % length) + length) % length;
      const j = i * 6;
      p[j] = x; p[j + 1] = y; p[j + 2] = z;
      p[j + 3] = x; p[j + 4] = y; p[j + 5] = z - tail * len01[i];
      dp[i * 3] = x; dp[i * 3 + 1] = y; dp[i * 3 + 2] = z;
    }
    geo.attributes.position.needsUpdate = true;
    pgeo.attributes.position.needsUpdate = true;
    geo.computeBoundingSphere();
    lineMat.opacity = lerp(0.35, 1, s);
    pmat.opacity = 1 - smoothclamp(stretch * 2.2);
    flash.material.opacity = Math.pow(s, 2) * 0.95;
    halo.material.opacity = Math.pow(s, 3) * 0.7;
    flash.scale.setScalar(radius * (0.5 + s * 0.8));
    halo.scale.setScalar(radius * (1.2 + s * 2.2));
  };
  write();

  g.userData.length = length;
  g.userData.radius = radius;
  g.userData.streaks = streaks;
  g.userData.dots = dots;
  g.userData.flash = flash;
  g.userData.noBake = true;
  /** 0 = still starfield, 1 = full lightspeed smear. */
  g.userData.setStretch = (v) => { stretch = clamp(v, 0, 1); write(); };
  g.userData.update = (t) => { scroll = t * length * 0.55; write(); };
  return g;
}

/* =================================================================== */
/* PLANETS                                                              */
/* =================================================================== */

/**
 * Lat/long surface of revolution with a per-vertex radius function.
 * theta runs 0 (north pole) .. PI (south pole); lon 0 .. TAU with lon = 0 at
 * +X and lon = PI/2 at +Z. UVs are equirectangular, v = 1 at the north pole,
 * which is what a canvas drawn "north at the top" wants.
 */
function shellGeometry(thetas, cols, rFn) {
  const rows = thetas.length;
  const verts = rows * (cols + 1);
  const pos = new Float32Array(verts * 3);
  const uv = new Float32Array(verts * 2);
  let k = 0;
  for (let j = 0; j < rows; j++) {
    const th = thetas[j];
    const st = Math.sin(th), ct = Math.cos(th);
    for (let i = 0; i <= cols; i++) {
      const lon = (i / cols) * TAU;
      const dx = st * Math.cos(lon), dy = ct, dz = st * Math.sin(lon);
      const r = rFn(th, lon, dx, dy, dz);
      pos[k * 3] = dx * r; pos[k * 3 + 1] = dy * r; pos[k * 3 + 2] = dz * r;
      uv[k * 2] = i / cols;
      uv[k * 2 + 1] = 1 - th / Math.PI;
      k++;
    }
  }
  const idx = [];
  for (let j = 0; j < rows - 1; j++) {
    for (let i = 0; i < cols; i++) {
      const a = j * (cols + 1) + i, b = a + 1, c = a + cols + 1, d = c + 1;
      if (j !== 0) idx.push(a, b, c);
      if (j !== rows - 2) idx.push(b, d, c);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Sorted, de-duplicated row list with extra rows packed around key latitudes. */
function packedRows(n, extras) {
  const set = [];
  for (let i = 0; i <= n; i++) set.push((i / n) * Math.PI);
  for (const e of extras) set.push(e);
  set.sort((a, b) => a - b);
  const out = [set[0]];
  for (let i = 1; i < set.length; i++) {
    if (set[i] - out[out.length - 1] > 1e-4) out.push(set[i]);
  }
  return out;
}

const planetMapCache = new Map();

/**
 * Colour + bump maps for a planet. One elevation pass feeds both, so the
 * relief in the bump map always matches the shading in the albedo.
 */
function planetMaps(type, seed, w = 1024) {
  const key = type + '|' + seed + '|' + w;
  if (planetMapCache.has(key)) return planetMapCache.get(key);
  const h = w / 2;
  const rand = rng(seed * 7919 + 13);

  const cont = fbm(seed * 3 + 1, { octaves: 6, base: 4, gain: 0.55 });
  const detail = fbm(seed * 11 + 7, { octaves: 5, base: 22, gain: 0.5 });
  const ridge = fbm(seed * 23 + 3, { octaves: 5, base: 9, gain: 0.55, ridged: true });
  const bandN = fbm(seed * 31 + 5, { octaves: 3, base: 3 });
  const cloudN = fbm(seed * 47 + 9, { octaves: 6, base: 5, gain: 0.55 });
  const crackN = fbm(seed * 53 + 17, { octaves: 4, base: 11, gain: 0.5, ridged: true });

  // ---- terrain field (no craters: those are a separate relief pass) ----
  const base = new Float32Array(w * h);
  let lo = Infinity, hi = -Infinity;
  for (let y = 0; y < h; y++) {
    const v = (y + 0.5) / h;
    for (let x = 0; x < w; x++) {
      const u = (x + 0.5) / w;
      let e = cont(u, v) * 0.58 + detail(u, v) * 0.18 + ridge(u * 0.8, v * 0.8) * 0.2;
      // weathered strata, stretched along longitude
      e += (bandN(u * 0.3, v * 2.6) - 0.5) * 0.18;
      base[y * w + x] = e;
      if (e < lo) lo = e;
      if (e > hi) hi = e;
    }
  }
  const inv = 1 / Math.max(1e-6, hi - lo);
  for (let i = 0; i < base.length; i++) base[i] = (base[i] - lo) * inv;

  // ---- craters: small, many, mostly relief rather than albedo ---------
  const cr = new Float32Array(w * h);
  const nCraters = type === 'green' ? 20 : type === 'ice' ? 90 : 190;
  for (let c = 0; c < nCraters; c++) {
    const cu = rand();
    const cv = 0.05 + rand() * 0.9;
    const lat = (0.5 - cv) * Math.PI;
    const rad = (0.0022 + Math.pow(rand(), 2.6) * 0.019) * w;   // pixels
    const depth = 0.1 + rand() * 0.14;
    const cx = cu * w, cy = cv * h;
    const sx = rad / Math.max(0.22, Math.cos(lat));             // lon stretch
    for (let y = Math.floor(cy - rad) - 2; y <= cy + rad + 2; y++) {
      if (y < 0 || y >= h) continue;
      for (let x = Math.floor(cx - sx) - 2; x <= cx + sx + 2; x++) {
        const dx = (x - cx) / sx, dy = (y - cy) / rad;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d > 1.3) continue;
        const xi = ((x % w) + w) % w;
        let dz;
        if (d < 0.8) dz = -depth * (1 - Math.pow(d / 0.8, 2) * 0.5);        // bowl
        else dz = depth * 0.75 * Math.exp(-Math.pow((d - 0.94) / 0.17, 2)); // rim
        cr[y * w + xi] += dz;
      }
    }
  }

  // ---- palettes -------------------------------------------------------
  const ramps = {
    desert: [
      [0.00, 0x8a5f31], [0.26, 0xa9793f], [0.45, 0xc79a5c],
      [0.63, 0xdcb87f], [0.82, 0xecd3a4], [1.00, 0xf8ecce],
    ],
    ice: [
      [0.00, 0x5a7f9c], [0.3, 0x8fb4cd], [0.52, 0xc6dcea],
      [0.7, 0xe8f2f8], [1.00, 0xffffff],
    ],
    green: [
      [0.00, 0x0e3050], [0.40, 0x17456e], [0.55, 0x2b6b8b],
      [0.575, 0xd8ca97], [0.62, 0x3d7d38], [0.78, 0x66872f],
      [0.90, 0x86754c], [1.00, 0xd6d9d3],
    ],
  };
  const ramp = ramps[type] || ramps.desert;
  const rampAt = (t) => {
    let i = 0;
    while (i < ramp.length - 2 && t > ramp[i + 1][0]) i++;
    const a = ramp[i], b = ramp[i + 1];
    const k = clamp((t - a[0]) / Math.max(1e-6, b[0] - a[0]), 0, 1);
    return new THREE.Color(a[1]).lerp(new THREE.Color(b[1]), k);
  };
  const lut = [];
  for (let i = 0; i < 256; i++) lut.push(rampAt(i / 255));

  const cloudAmt = type === 'green' ? 0.5 : type === 'ice' ? 0.34 : 0.28;
  const cloudThr = lerp(0.7, 0.42, cloudAmt);
  const iceCap = type === 'green' ? 0.76 : type === 'ice' ? 0.5 : 2;
  const cloudCol = new THREE.Color(0xfdfdff);
  const frostCol = new THREE.Color(0xf4fbff);

  const map = canvasTex('planetmap' + key, w, h, (ctx) => {
    const tmp = new THREE.Color();
    pixels(ctx, w, h, (u, v) => {
      const x = Math.min(w - 1, Math.floor(u * w)), y = Math.min(h - 1, Math.floor(v * h));
      const i = y * w + x;
      const e = clamp(base[i] + cr[i] * 0.4, 0, 1);
      tmp.copy(lut[Math.round(e * 255)]);
      // dust / ice fills the crater floors a shade lighter, rims catch the light
      if (cr[i] > 0.03) tmp.lerp(new THREE.Color(0xffffff), clamp(cr[i], 0, 1) * 0.1);
      // fracture lines on the ice world
      if (type === 'ice') {
        const ck = crackN(u, v);
        if (ck > 0.74) tmp.lerp(new THREE.Color(0x4d7fa3), smoothclamp((ck - 0.74) / 0.2) * 0.55);
      }
      // polar frost / ice caps
      const lat = Math.abs(0.5 - v) * 2;
      if (lat > iceCap) {
        const k = smoothclamp((lat - iceCap) / (1 - iceCap)) * 0.92;
        tmp.lerp(frostCol, k * clamp(0.4 + e * 0.8, 0, 1));
      }
      // cloud wisps, stretched along latitude
      const cl = cloudN(u * 0.9, v * 3.1) * 0.66 + cloudN(u * 2.3 + 0.31, v * 5.7) * 0.34;
      const dens = clamp((cl - cloudThr) * 5.5, 0, 1);
      if (dens > 0) tmp.lerp(cloudCol, Math.pow(dens, 0.8) * 0.85);
      return [Math.round(tmp.r * 255), Math.round(tmp.g * 255), Math.round(tmp.b * 255)];
    });
  }, { wrapT: THREE.ClampToEdgeWrapping, aniso: 8 });

  const relief = normalTex('planet' + key, w, h, (x, y) => {
    const i = y * w + x;
    let e = base[i];
    if (type === 'green' && e < 0.5) e = 0.5;           // oceans are flat
    return clamp(e * 0.45 + cr[i] * 1.4, -1, 1);
  }, 0.0016, { wrapT: THREE.ClampToEdgeWrapping });

  const out = { map, relief };
  planetMapCache.set(key, out);
  return out;
}

const ATMO_VERT = /* glsl */`
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vN = normalize(mat3(modelMatrix) * normal);
    vV = normalize(cameraPosition - wp.xyz);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;
const ATMO_FRAG = /* glsl */`
  uniform vec3 uColor;
  uniform vec3 uSun;
  uniform float uPow;
  uniform float uIntensity;
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    vec3 n = normalize(vN);
    float rim = pow(1.0 - clamp(dot(n, normalize(vV)), 0.0, 1.0), uPow);
    // brighter on the lit limb, a thin ember on the terminator, dark behind
    float sun = clamp(dot(n, normalize(uSun)), -1.0, 1.0);
    float lit = smoothstep(-0.35, 0.45, sun);
    float a = rim * uIntensity * (0.12 + 0.95 * lit);
    gl_FragColor = vec4(uColor * a, a);
  }
`;

function atmoShell(radius, scale, color, pow, intensity) {
  const geo = rawGeo(`atmo${scale}`, () => new THREE.SphereGeometry(1, 48, 24));
  const m = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uSun: { value: new THREE.Vector3(1, 0.2, 0.4).normalize() },
      uPow: { value: pow },
      uIntensity: { value: intensity },
    },
    vertexShader: ATMO_VERT,
    fragmentShader: ATMO_FRAG,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.BackSide,
    toneMapped: false,
  });
  const mesh = new THREE.Mesh(geo, m);
  mesh.scale.setScalar(radius * scale);
  mesh.userData.noBake = true;
  return mesh;
}

/**
 * A planet.
 *
 * Anchor: **centre of the sphere at the group origin** (planets are placed by
 * their centre, not by a resting plane). Surface albedo + relief come from a
 * procedural canvas pair; nothing is pre-lit, so the director's key light draws
 * the terminator. Two additive fresnel shells give the atmosphere its rim, and
 * they know where the sun is — call `setSunDir()` with the same vector you aim
 * the key light along (world space, pointing *from* the planet *toward* the
 * light).
 *
 * @param {object} o {radius, type:'desert'|'ice'|'green', seed, texSize, seg,
 *                    atmosphere, atmoColor, spin}
 * @returns {THREE.Group} userData: {radius, type, body, atmo, sunDir,
 *                                   setSunDir(v3), update(t)}
 */
export function planet({
  radius = 600, type = 'desert', seed = 9, texSize = 1024, seg = 96,
  atmosphere = true, atmoColor = null, spin = 0.004,
} = {}) {
  const g = new THREE.Group();
  g.name = 'planet_' + type;
  const { map, relief } = planetMaps(type, seed, texSize);

  const bodyMat = new THREE.MeshStandardMaterial({
    map, normalMap: relief,
    roughness: type === 'ice' ? 0.62 : 0.92,
    metalness: 0,
  });
  bodyMat.normalScale.set(1, 1);
  const geo = rawGeo(`planetsph${seg}`, () => new THREE.SphereGeometry(1, seg, Math.round(seg / 2)));
  const body = new THREE.Mesh(geo, bodyMat);
  body.scale.setScalar(radius);
  body.castShadow = body.receiveShadow = true;
  body.userData.noBake = true;      // rotates
  g.add(body);

  const atmoHex = atmoColor ?? { desert: 0xffb473, ice: 0x9fd0ff, green: 0x7fb6ff }[type] ?? 0x9fd0ff;
  const shells = [];
  if (atmosphere) {
    shells.push(atmoShell(radius, 1.016, atmoHex, 3.4, 1.25));
    shells.push(atmoShell(radius, 1.075, atmoHex, 1.9, 0.5));
    shells.forEach((s) => g.add(s));
  }

  const sunDir = new THREE.Vector3(1, 0.25, 0.5).normalize();
  g.userData.radius = radius;
  g.userData.type = type;
  g.userData.body = body;
  g.userData.atmo = shells;
  g.userData.sunDir = sunDir;
  g.userData.noBake = true;
  /** Aim the atmosphere's lit limb; pass the direction toward the key light. */
  g.userData.setSunDir = (v) => {
    sunDir.copy(v).normalize();
    shells.forEach((s) => s.material.uniforms.uSun.value.copy(sunDir));
    return g;
  };
  g.userData.setSunDir(sunDir);
  g.userData.update = (t) => { body.rotation.y = t * spin; };
  return g;
}

/**
 * Tatooine's twin suns: two glowing discs with layered halos, flare spokes and
 * an anamorphic streak.
 *
 * Anchor: the group sits at the **observer** (put it where the camera is, or at
 * the origin of the desert set). The suns hang at `dist` along -Z and are
 * raised by `setElevation(a)`, `a` in **radians above the horizon** — 0 puts
 * them on the horizon (and reddens them), 0.6 is high noon-ish.
 *
 * @param {object} o {sep, dist, size, seed, colors}
 * @returns {THREE.Group} userData: {suns, sunDir, elevation, setElevation(a),
 *                                   update(t)}
 */
export function twinSuns({
  sep = 150, dist = 1500, size = 150, seed = 4,
  colors = [0xfff0c8, 0xffb268],
} = {}) {
  const g = new THREE.Group();
  g.name = 'twinSuns';
  const sky = new THREE.Group();                 // rotated by elevation
  g.add(sky);

  const soft = dotTex(0.02, 'soft');
  const core = dotTex(0.62, 'core');
  const spec = [
    { off: [-sep * 0.42, sep * 0.1], s: 1.0, c: colors[0] },
    { off: [sep * 0.58, -sep * 0.22], s: 0.72, c: colors[1] },
  ];

  const suns = spec.map((sp, i) => {
    const s = new THREE.Group();
    s.position.set(sp.off[0], sp.off[1], -dist);
    const sc = size * sp.s;
    const parts = {
      halo: spriteFx(sc * 6.5, soft, sp.c, 0.2),
      mid: spriteFx(sc * 2.7, soft, sp.c, 0.42),
      flare: spriteFx(sc * 5.2, flareTex(), sp.c, 0.5),
      disc: spriteFx(sc, core, 0xffffff, 1),
      streak: spriteFx(sc * 9, soft, sp.c, 0.14),
    };
    parts.streak.scale.set(sc * 9, sc * 0.35, 1);
    parts.halo.renderOrder = -400;
    Object.values(parts).forEach((p) => { p.renderOrder = -400; s.add(p); });
    // ghost dots along the flare axis, the cheap lens-flare tell
    for (let k = 1; k <= 3; k++) {
      const gh = spriteFx(sc * (0.28 + k * 0.12), soft, sp.c, 0.13);
      gh.position.set(-sp.off[0] * (0.5 + k * 0.55), -sp.off[1] * (0.5 + k * 0.55), 4 * k);
      gh.renderOrder = -400;
      s.add(gh);
    }
    s.userData.parts = parts;
    s.userData.baseColor = sp.c;
    s.userData.scale = sc;
    sky.add(s);
    void i;
    return s;
  });

  const sunDir = new THREE.Vector3(0, 0, -1);
  let elev = 0.25;
  const setElevation = (a) => {
    elev = a;
    sky.rotation.x = a;
    // low sun: redder, dimmer disc, fatter halo — the sunset look. The default
    // elevation is a sunset, so the reddening has to still be strong at 0.25.
    const k = smoothclamp(a / 0.62);
    suns.forEach((s) => {
      const base = new THREE.Color(s.userData.baseColor);
      const low = new THREE.Color(0xff5a1e).lerp(base, 0.25);
      const c = low.clone().lerp(base, k);
      const p = s.userData.parts;
      p.disc.material.color.copy(new THREE.Color(0xffffff).lerp(c, 1 - k * 0.65));
      p.mid.material.color.copy(c);
      p.halo.material.color.copy(c);
      p.flare.material.color.copy(c);
      p.streak.material.color.copy(c);
      p.halo.material.opacity = lerp(0.34, 0.16, k);
      p.streak.material.opacity = lerp(0.26, 0.1, k);
      p.flare.material.opacity = lerp(0.3, 0.55, k);
      p.disc.material.opacity = lerp(0.85, 1, k);
    });
    sunDir.set(0, Math.sin(a), -Math.cos(a)).normalize();
    return g;
  };
  setElevation(elev);

  g.userData.suns = suns;
  g.userData.sunDir = sunDir;
  g.userData.dist = dist;
  g.userData.noBake = true;
  /** Radians above the horizon. Also reddens the pair as it sets. */
  g.userData.setElevation = setElevation;
  Object.defineProperty(g.userData, 'elevation', { get: () => elev });
  g.userData.update = (t) => {
    suns.forEach((s, i) => {
      const f = 1 + 0.035 * Math.sin(t * (1.3 + i * 0.7) + i * 2.1);
      s.userData.parts.disc.scale.setScalar(s.userData.scale * f);
      s.userData.parts.flare.material.rotation = t * 0.05 * (i ? -1 : 1);
    });
  };
  return g;
}

/**
 * The Empire's armoured moon.
 *
 * Anchor: **centre at the group origin**. The detailed face looks toward +Z:
 * the dish crater is at longitude +Z / 50 deg north and the extruded greeble
 * clusters on the +Z hemisphere, so `station.rotation.y` aims the "hero" side
 * at the camera.
 *
 * The equatorial trench is real modelled geometry (a revolved groove in the
 * body shell), not a texture stripe, so a ship can be flown down into it.
 *
 * @param {object} o {radius, seed, seg, texSize, greeble}
 * @returns {THREE.Group} userData: {radius, trenchRadius, trenchDepth,
 *   trenchWidth, dish, superlaser, lights, update(t)}
 */
export function battleStation({ radius = 420, seed = 17, seg = 240, texSize = 2048, greeble = 1 } = {}) {
  const g = new THREE.Group();
  g.name = 'battleStation';
  const rand = rng(seed * 131 + 7);

  const trenchWidth = radius * 0.075;
  const trenchDepth = radius * 0.05;
  const halfW = trenchWidth / 2 / radius;          // radians of latitude
  const wall = halfW * 0.22;                       // wall taper

  const craterLon = Math.PI / 2;                   // faces +Z
  const craterTheta = Math.PI / 2 - 0.87;          // ~50 deg north
  const craterR = 0.235;                           // angular radius
  const craterDepth = radius * 0.085;

  const undulate = fbm(seed * 5 + 3, { octaves: 4, base: 5, gain: 0.5 });
  const craterDir = new THREE.Vector3(
    Math.sin(craterTheta) * Math.cos(craterLon),
    Math.cos(craterTheta),
    Math.sin(craterTheta) * Math.sin(craterLon),
  );

  /** Angular distance from the dish centre. */
  const craterAng = (dx, dy, dz) => Math.acos(clamp(dx * craterDir.x + dy * craterDir.y + dz * craterDir.z, -1, 1));

  const rFn = (th, lon, dx, dy, dz) => {
    let r = radius;
    r += (undulate(lon / TAU, th / Math.PI) - 0.5) * radius * 0.008;
    // equatorial trench: flat floor, steep walls
    const d = Math.abs(th - Math.PI / 2);
    if (d < halfW + wall) {
      const k = 1 - smoothclamp((d - halfW) / wall);
      r -= trenchDepth * k;
    }
    // dish crater: parabolic bowl with a raised rim
    const a = craterAng(dx, dy, dz) / craterR;
    if (a < 1.22) {
      if (a < 0.84) r -= craterDepth * (1 - Math.pow(a / 0.84, 2) * 0.42);
      else r += craterDepth * 0.13 * Math.exp(-Math.pow((a - 0.96) / 0.13, 2));
    }
    return r;
  };

  const extras = [];
  for (const s of [-1, 1]) {
    for (const k of [halfW + wall * 1.6, halfW + wall, halfW + wall * 0.35, halfW,
      halfW * 0.72, halfW * 0.4, halfW * 0.12, 0.0001]) {
      extras.push(Math.PI / 2 + s * k);
    }
  }
  for (let i = -14; i <= 14; i++) extras.push(craterTheta + (i / 14) * craterR * 1.3);
  const thetas = packedRows(Math.round(seg * 0.62), extras.filter((t) => t > 0.001 && t < Math.PI - 0.001));

  const { map, relief } = stationMaps(seed, texSize, {
    craterU: craterLon / TAU, craterV: 1 - craterTheta / Math.PI, craterR,
  });
  const hull = new THREE.MeshStandardMaterial({
    map, normalMap: relief, roughness: 0.66, metalness: 0.12, color: 0xffffff,
  });
  hull.normalScale.set(0.8, 0.8);
  const staticRoot = new THREE.Group();          // everything that gets merged
  const bodyGeo = shellGeometry(thetas, seg, rFn);
  const body = new THREE.Mesh(bodyGeo, hull);
  body.castShadow = body.receiveShadow = true;
  staticRoot.add(body);

  /* ---- greeble ------------------------------------------------------- */
  // Deliberately darker than the hull's mid-tone and rougher than you would
  // guess: a greeble box shows the key light a flat face while the sphere
  // around it curves away, so matching albedo still reads as bright confetti.
  const plateMat = mat(0x686e74, { rough: 0.78, metal: 0.14 });
  const darkMat = mat(0x494f55, { rough: 0.84, metal: 0.1 });
  const pipeMat = mat(0x7e848a, { rough: 0.6, metal: 0.35 });
  const greebleRoot = new THREE.Group();
  const put = (mesh, dir, r, spinAngle) => {
    mesh.position.copy(dir).multiplyScalar(r);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    mesh.rotateY(spinAngle);
    greebleRoot.add(mesh);
    return mesh;
  };
  const dirAt = (th, lon) => new THREE.Vector3(
    Math.sin(th) * Math.cos(lon), Math.cos(th), Math.sin(th) * Math.sin(lon),
  );

  // Greeble comes in districts, not confetti: a sunken sector plate with a
  // cluster of blocks, towers and pipe runs on top of it.
  // Fewer, bigger, denser districts. Many small ones scatter into lichen.
  const nDistrict = Math.round(72 * greeble);
  for (let i = 0; i < nDistrict; i++) {
    const lon = craterLon + (rand() + rand() - 1) * 1.7;
    const th = Math.acos(clamp(1 - 2 * rand(), -1, 1));
    const cDir = dirAt(th, lon);
    if (craterAng(cDir.x, cDir.y, cDir.z) / craterR < 1.35) continue;   // dish stays clear
    if (Math.abs(th - Math.PI / 2) < halfW + wall * 4) continue;        // trench stays clear
    const spread = 0.045 + rand() * 0.07;                               // angular radius
    const cR = rFn(th, lon, cDir.x, cDir.y, cDir.z);
    // sunken pads, not one big card: a thin plate this wide on a sphere this
    // size lifts its own corners off the hull and reads as floating paper
    const pad = radius * spread * 0.62;
    for (let k = 0; k < 2 + Math.round(rand() * 2); k++) {
      const off = spread * 0.75;
      const lonP = lon + (rand() - 0.5) * off * 2 / Math.max(0.2, Math.sin(th));
      const thP = clamp(th + (rand() - 0.5) * off * 2, 0.02, Math.PI - 0.02);
      if (Math.abs(thP - Math.PI / 2) < halfW + wall * 3) continue;
      const dP = dirAt(thP, lonP);
      put(flat(pad * (0.6 + rand() * 0.7), 1.5, pad * (0.6 + rand() * 0.7), darkMat),
        dP, rFn(thP, lonP, dP.x, dP.y, dP.z) - 1.1, rand() * TAU);
    }

    const n = 12 + Math.round(rand() * 14);
    for (let k = 0; k < n; k++) {
      const lon2 = lon + (rand() - 0.5) * spread * 2 / Math.max(0.2, Math.sin(th));
      const th2 = clamp(th + (rand() - 0.5) * spread * 2, 0.02, Math.PI - 0.02);
      if (Math.abs(th2 - Math.PI / 2) < halfW + wall * 3) continue;
      const dir = dirAt(th2, lon2);
      const r = rFn(th2, lon2, dir.x, dir.y, dir.z);
      const lowProfile = rand() < 0.35;
      const w = 4 + rand() * 11, d2 = 4 + rand() * 11;
      const hgt = lowProfile ? 1.1 + rand() * 1.9 : 2.4 + rand() * rand() * 8;
      put(boxMesh(w, hgt, d2, rand() < 0.3 ? darkMat : plateMat), dir, r - 0.3, rand() * TAU);
      if (!lowProfile && rand() < 0.35) {
        put(boxMesh(w * 0.55, 0.5 + rand(), d2 * 0.55, darkMat), dir, r + hgt - 0.6, rand() * TAU);
      }
      if (rand() < 0.14) {
        put(pipeMesh(0.3 + rand() * 0.5, 2 + rand() * 6, pipeMat, 8), dir, r + hgt - 0.5, 0);
      }
    }
  }

  // Trench interior: the groove has to read as a groove from orbit, so the
  // detail hugs the two walls and the floor stays a dark, legible channel.
  const nTrench = Math.round(360 * greeble);
  for (let i = 0; i < nTrench; i++) {
    const lon = rand() * TAU;
    const side = rand() < 0.5 ? -1 : 1;
    const th = Math.PI / 2 + side * halfW * (0.72 + rand() * 0.26);
    const dir = dirAt(th, lon);
    const r = rFn(th, lon, dir.x, dir.y, dir.z);
    put(flat(1 + rand() * 2.6, 0.5 + rand() * 2.6, 1 + rand() * 2.6,
      rand() < 0.45 ? darkMat : plateMat), dir, r - 0.15, rand() * TAU);
  }
  // continuous rails along both lips, which is what actually sells the trench
  // at a distance — a bright line either side of a dark band
  const xA = new THREE.Vector3(), m4 = new THREE.Matrix4();
  for (const s of [-1, 1]) {
    const nSeg = 300;
    const th = Math.PI / 2 + s * (halfW + wall * 0.55);
    for (let i = 0; i < nSeg; i++) {
      const lon = (i / nSeg) * TAU;
      const dir = dirAt(th, lon);
      const r = rFn(th, lon, dir.x, dir.y, dir.z);
      // local Z has to follow the rail, so build the basis rather than trusting
      // a shortest-arc rotation, which twists as it goes round
      const zA = new THREE.Vector3(-Math.sin(lon), 0, Math.cos(lon));
      xA.crossVectors(dir, zA).normalize();
      m4.makeBasis(xA, dir, zA);
      const m = flat(1.6, 1.2, (TAU * radius * Math.sin(th)) / nSeg * 1.04, plateMat);
      m.position.copy(dir).multiplyScalar(r - 0.15);
      m.quaternion.setFromRotationMatrix(m4);
      greebleRoot.add(m);
    }
  }

  // a few surface towers / sensor masts for silhouette interest
  for (let i = 0; i < Math.round(26 * greeble); i++) {
    const lon = craterLon + (rand() - 0.5) * 2.6;
    const th = Math.acos(clamp(1 - 2 * rand(), -1, 1));
    const dEq = Math.abs(th - Math.PI / 2);
    if (dEq < halfW * 3) continue;
    const dir = dirAt(th, lon);
    const a = craterAng(dir.x, dir.y, dir.z) / craterR;
    if (a < 1.35) continue;
    const r = rFn(th, lon, dir.x, dir.y, dir.z);
    const hgt = 6 + rand() * 14;
    put(boxMesh(2.4, hgt, 2.4, plateMat), dir, r - 0.5, rand() * TAU);
    put(pipeMesh(0.16, hgt * 0.5, pipeMat, 6), dir, r + hgt - 0.6, 0);
    put(boxMesh(5.5, 1.0, 5.5, darkMat), dir, r + hgt - 1.2, rand() * TAU);
  }
  staticRoot.add(greebleRoot);

  /* ---- the dish ------------------------------------------------------ */
  const dishGroup = new THREE.Group();       // static hardware, gets baked
  const dishFx = new THREE.Group();          // the lens, stays live
  dishGroup.name = 'superlaserDish';
  let dishRimR = radius * Math.sin(craterR);
  {
    const rimR = dishRimR;
    const up = craterDir.clone();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), up);
    dishGroup.quaternion.copy(q);
    dishGroup.position.copy(up).multiplyScalar(radius * Math.cos(craterR) * 0.995);
    dishFx.quaternion.copy(q);
    dishFx.position.copy(dishGroup.position);

    // rim ring, in local XZ
    const rimGeo = rawGeo('stationRim' + Math.round(rimR), () => {
      const t = norm(new THREE.TorusGeometry(rimR, radius * 0.012, 8, 96));
      t.rotateX(Math.PI / 2);
      return t;
    });
    const rimMesh = new THREE.Mesh(rimGeo, plateMat);
    dishGroup.add(rimMesh);

    // radial struts across the bowl
    const nStrut = 8;
    for (let i = 0; i < nStrut; i++) {
      const a = (i / nStrut) * TAU;
      const len = rimR * 0.94;
      const s = boxMesh(radius * 0.016, radius * 0.012, len, darkMat);
      s.position.set(Math.cos(a) * len * 0.5, -craterDepth * 0.34, Math.sin(a) * len * 0.5);
      s.rotation.y = -a;
      dishGroup.add(s);
    }
    // rim blocks
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * TAU;
      const b = boxMesh(radius * 0.02, radius * 0.02 * (0.6 + rand()), radius * 0.03, plateMat);
      b.position.set(Math.cos(a) * rimR, -radius * 0.004, Math.sin(a) * rimR);
      b.rotation.y = -a;
      dishGroup.add(b);
    }
    // focusing emitters around a central lens
    const lensR = rimR * 0.2;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU + 0.2;
      const e = pipeMesh(radius * 0.014, radius * 0.05, pipeMat, 8);
      e.position.set(Math.cos(a) * lensR * 2.1, -craterDepth * 0.62, Math.sin(a) * lensR * 2.1);
      e.lookAt(0, -craterDepth * 0.1, 0);
      e.rotateX(Math.PI / 2);
      dishGroup.add(e);
    }
    const lensMat = fx(0x9be8ff, 0.85, { blending: THREE.AdditiveBlending });
    const lens = new THREE.Mesh(rawGeo('lens', () => norm(new THREE.SphereGeometry(1, 20, 12))), lensMat);
    lens.scale.setScalar(lensR);
    lens.position.y = -craterDepth * 0.6;
    keep(lens);
    dishFx.add(lens);
    const lensGlow = spriteFx(lensR * 6, dotTex(0.06, 'soft'), 0x8fd8ff, 0.35);
    lensGlow.position.y = -craterDepth * 0.55;
    dishFx.add(lensGlow);
    dishFx.userData.lens = lens;
    dishFx.userData.glow = lensGlow;
    dishFx.userData.radius = rimR;
    dishGroup.userData.radius = rimR;
  }
  staticRoot.add(dishGroup);

  /* ---- running lights ------------------------------------------------ */
  // merged into three blink banks: 3 draw calls instead of 90
  const banks = [
    { mat: fx(0xffd48a, 0.95), meshes: new THREE.Group(), phase: 0 },
    { mat: fx(0x9be8ff, 0.9), meshes: new THREE.Group(), phase: 2.1 },
    { mat: fx(0xff6a4a, 0.9), meshes: new THREE.Group(), phase: 4.2 },
  ];
  for (let i = 0; i < 120; i++) {
    const lon = rand() * TAU;
    const th = Math.acos(clamp(1 - 2 * rand(), -1, 1));
    const inTrench = i % 3 === 0;
    const th2 = inTrench ? Math.PI / 2 + (rand() < 0.5 ? -1 : 1) * halfW * 0.9 : th;
    if (!inTrench && Math.abs(th - Math.PI / 2) < halfW * 3) continue;
    const dir = dirAt(th2, lon);
    const r = rFn(th2, lon, dir.x, dir.y, dir.z);
    const bank = banks[i % banks.length];
    const m = boxMesh(1.25, 0.5, 1.25, bank.mat);
    m.position.copy(dir).multiplyScalar(r + 0.25);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    bank.meshes.add(m);
  }
  const lights = banks.map((b) => {
    const merged = bake(b.meshes).children[0];
    if (merged) { merged.userData.noBake = true; merged.userData.phase = b.phase; }
    return merged;
  }).filter(Boolean);

  const out = bake(staticRoot);
  out.name = 'battleStation';
  out.add(dishFx);
  lights.forEach((l) => out.add(l));

  const ud = out.userData;
  ud.radius = radius;
  ud.trenchRadius = radius - trenchDepth;
  ud.trenchDepth = trenchDepth;
  ud.trenchWidth = trenchWidth;
  ud.dishRadius = dishRimR;
  ud.dish = dishFx;
  ud.superlaser = dishFx.userData.lens;
  ud.lights = lights;
  ud.update = (t) => {
    const pulse = 0.65 + 0.35 * Math.sin(t * 0.9);
    dishFx.userData.lens.material.opacity = 0.5 + 0.45 * pulse;
    dishFx.userData.glow.material.opacity = 0.18 + 0.3 * pulse;
    lights.forEach((l) => {
      l.material.opacity = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(t * 2.4 + l.userData.phase));
    });
  };
  return out;
}

const stationMapCache = new Map();

/** Panelled armour plating for the battle station: colour + bump. */
function stationMaps(seed, w, o) {
  const key = 'station' + seed + '|' + w + '|' + JSON.stringify(o);
  if (stationMapCache.has(key)) return stationMapCache.get(key);
  const h = w / 2;

  const draw = (bumpMode) => (ctx) => {
    const rand = rng(seed * 271 + 11);
    const grime = fbm(seed * 13 + 3, { octaves: 5, base: 6, gain: 0.55 });

    // The armour is drawn as plates over a dark shadow-gap base, never as a
    // grid of ruled lines: bands of varying height, each split into plates of
    // varying width, so no seam runs pole to pole and no two plates match.
    const grey = (t) => (bumpMode
      ? `rgb(${Math.round(t * 255)},${Math.round(t * 255)},${Math.round(t * 255)})`
      : css(mix(0x74797f, 0xb3b8bd, t)));

    const gap = Math.max(1.5, w / 1100);
    plateField(ctx, w, h, rand, {
      gap,
      band: [h * 0.012, h * 0.042],
      plate: [w * 0.012, w * 0.047],
      // plates are widened toward the poles so they stay square on the sphere
      widen: (v) => 1 / Math.max(0.16, Math.sin(Math.PI * v)),
      tone: grey,
      gapColor: bumpMode ? 'rgb(52,52,52)' : css(0x4e545a),
      ventColor: bumpMode ? 'rgb(30,30,30)' : css(0x3f4449),
    });

    // a handful of oversized sector plates to break the band rhythm
    for (let i = 0; i < 34; i++) {
      const v = 0.08 + rand() * 0.84;
      const sinTh = Math.max(0.2, Math.sin(Math.PI * v));
      const sw = w * (0.03 + rand() * 0.085) / sinTh, sh = h * (0.05 + rand() * 0.1);
      const x = rand() * w, y2 = v * h - sh / 2;
      ctx.fillStyle = grey(0.36 + rand() * 0.28);
      ctx.fillRect(x, y2, sw - gap * 2, sh - gap * 2);
      ctx.fillStyle = bumpMode ? 'rgb(40,40,40)' : css(0x474d53);
      ctx.fillRect(x + sw * 0.1, y2 + sh * 0.14, (sw - gap * 2) * 0.34, (sh - gap * 2) * 0.2);
      ctx.fillStyle = grey(0.72 + rand() * 0.25);
      ctx.fillRect(x + sw * 0.1, y2 + sh * 0.5, (sw - gap * 2) * 0.6, (sh - gap * 2) * 0.1);
    }

    // equatorial trench band
    const eqH = h * 0.045;
    ctx.fillStyle = bumpMode ? 'rgb(96,96,96)' : css(0x5c6167);
    ctx.fillRect(0, h / 2 - eqH / 2, w, eqH);
    ctx.fillStyle = bumpMode ? 'rgb(58,58,58)' : css(0x3c4247);
    ctx.fillRect(0, h / 2 - eqH * 0.2, w, eqH * 0.4);
    for (let i = 0; i < 1400; i++) {
      const x = rand() * w;
      const y = h / 2 + (rand() - 0.5) * eqH;
      const t = rand();
      ctx.fillStyle = bumpMode ? `rgb(${Math.round((0.3 + t * 0.55) * 255)},${Math.round((0.3 + t * 0.55) * 255)},${Math.round((0.3 + t * 0.55) * 255)})`
        : css(mix(0x33383d, 0x9aa0a6, t));
      ctx.fillRect(x, y, 1 + rand() * (w / 300), 1 + rand() * (h / 300));
    }
    // rails along the trench lip
    ctx.strokeStyle = bumpMode ? 'rgb(200,200,200)' : css(0xb9bec3);
    ctx.lineWidth = Math.max(1, w / 1600);
    for (const s of [-1, 1]) {
      const y = h / 2 + s * eqH * 0.52;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    // dish crater: concentric rings + radial spokes, drawn in UV space
    const cx = o.craterU * w, cy = (1 - o.craterV) * h;
    const rx = (o.craterR / TAU) * w / Math.max(0.25, Math.sin(Math.PI * (1 - o.craterV)));
    const ry = (o.craterR / Math.PI) * h;
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, TAU);
    ctx.clip();
    ctx.fillStyle = bumpMode ? 'rgb(120,120,120)' : css(0x71767c);
    ctx.fillRect(cx - rx, cy - ry, rx * 2, ry * 2);
    ctx.strokeStyle = bumpMode ? 'rgb(78,78,78)' : css(0x474d52);
    ctx.lineWidth = Math.max(1, w / 900);
    for (let i = 1; i <= 7; i++) {
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx * (i / 7), ry * (i / 7), 0, 0, TAU);
      ctx.stroke();
    }
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * TAU;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry);
      ctx.stroke();
    }
    ctx.restore();
    ctx.strokeStyle = bumpMode ? 'rgb(215,215,215)' : css(0xc3c8cd);
    ctx.lineWidth = Math.max(1.5, w / 700);
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, TAU);
    ctx.stroke();

    // grime pass
    if (!bumpMode) {
      const gw = 256, gh = 128;
      const cv = document.createElement('canvas');
      cv.width = gw; cv.height = gh;
      const g2 = cv.getContext('2d');
      pixels(g2, gw, gh, (u, v) => {
        const n = grime(u, v);
        return [0, 0, 0, Math.round(clamp((0.62 - n) * 1.9, 0, 1) * 90)];
      });
      ctx.globalAlpha = 0.75;
      ctx.drawImage(cv, 0, 0, w, h);
      ctx.globalAlpha = 1;
    }
  };

  const map = canvasTex('stationmap' + key, w, h, draw(false), { wrapT: THREE.ClampToEdgeWrapping });
  const gray = canvasTex('stationbump' + key, w, h, draw(true), { wrapT: THREE.ClampToEdgeWrapping, data: true });
  const relief = normalFromGray('station' + key, gray, 0.0022, { wrapT: THREE.ClampToEdgeWrapping });
  const out = { map, relief };
  stationMapCache.set(key, out);
  return out;
}

/* =================================================================== */
/* INTERIORS                                                            */
/* =================================================================== */

/** Corridor floor grating: dark slots between light treads. */
function gratingTex() {
  return canvasTex('grate', 128, 128, (ctx, w, h) => {
    ctx.fillStyle = css(0x8b9095);
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = css(0x3a4249);
    for (let i = 0; i < 8; i++) ctx.fillRect(0, i * 16 + 4, w, 8);
    ctx.fillStyle = css(0xb0b6ba);
    for (let i = 0; i < 8; i++) ctx.fillRect(0, i * 16 + 1, w, 2.5);
    ctx.fillStyle = css(0x2b3239);
    for (let i = 0; i < 4; i++) ctx.fillRect(i * 32 + 14, 0, 4, h);
  }, { repeat: [2, 3] });
}

/** Riveted plate print for interior walls. */
function wallPlateTex() {
  return svgTexture(svg([0, 0, 256, 256], `
    <rect width="256" height="256" fill="#eef0ef"/>
    <rect x="8" y="8" width="240" height="240" rx="10" fill="#f6f7f6" stroke="#cdd2d4" stroke-width="3"/>
    <rect x="26" y="30" width="204" height="66" rx="6" fill="#e6e9e9" stroke="#c6cccd" stroke-width="2"/>
    <rect x="26" y="112" width="94" height="112" rx="6" fill="#e6e9e9" stroke="#c6cccd" stroke-width="2"/>
    <rect x="136" y="112" width="94" height="52" rx="6" fill="#dfe3e4" stroke="#c6cccd" stroke-width="2"/>
    <rect x="136" y="176" width="94" height="48" rx="6" fill="#e9ecec" stroke="#c6cccd" stroke-width="2"/>
    ${Array.from({ length: 12 }, (_, i) => `<circle cx="${20 + (i % 6) * 43}" cy="${i < 6 ? 18 : 238}" r="4" fill="#b9c0c2"/>`).join('')}
  `), { w: 256, key: 'wallplate' });
}

/** A shipboard status display. */
function screenTex(kind = 0) {
  const bars = Array.from({ length: 7 }, (_, i) => {
    const wpx = 22 + ((i * 37 + kind * 13) % 78);
    return `<rect x="18" y="${58 + i * 22}" width="${wpx}" height="12" rx="3" fill="${i % 3 === 0 ? '#ffd23f' : '#63d2ff'}" opacity="${0.55 + (i % 4) * 0.15}"/>`;
  }).join('');
  const glyphs = Array.from({ length: 16 }, (_, i) =>
    `<rect x="${124 + (i % 4) * 22}" y="${58 + Math.floor(i / 4) * 22}" width="16" height="12" rx="2" fill="#8ef0c0" opacity="${0.25 + ((i * 7 + kind) % 5) * 0.15}"/>`).join('');
  return svgTexture(svg([0, 0, 256, 256], `
    <rect width="256" height="256" rx="10" fill="#0b1218"/>
    <rect x="6" y="6" width="244" height="244" rx="8" fill="#0e1a22" stroke="#2b3d49" stroke-width="3"/>
    <rect x="16" y="18" width="224" height="26" rx="4" fill="#16283a"/>
    <rect x="24" y="26" width="76" height="10" rx="3" fill="#7fe3ff"/>
    <rect x="192" y="26" width="40" height="10" rx="3" fill="#ff7a4a"/>
    ${bars}${glyphs}
    <path d="M18 228 L52 208 L86 234 L120 200 L154 222 L188 196 L238 218" stroke="#ffd23f" stroke-width="3" fill="none" opacity="0.9"/>
  `), { w: 256, key: 'screen' + kind });
}

/** Imperial deck plating: seamed panels with a bit of grime. */
function platingTex(seed = 3) {
  return canvasTex('plating' + seed, 512, 512, (ctx, w, h) => {
    const r2 = rng(seed * 733 + 5);
    ctx.fillStyle = css(0x8d9299);
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 260; i++) {
      const x = r2() * w, y = r2() * h;
      ctx.fillStyle = css(mix(0x777d84, 0xa4aab0, r2()));
      ctx.fillRect(x, y, 20 + r2() * 90, 20 + r2() * 90);
    }
    ctx.strokeStyle = css(0x5d636a);
    ctx.lineWidth = 3;
    for (let i = 0; i <= 8; i++) {
      ctx.beginPath(); ctx.moveTo((i / 8) * w, 0); ctx.lineTo((i / 8) * w, h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, (i / 8) * h); ctx.lineTo(w, (i / 8) * h); ctx.stroke();
    }
    ctx.strokeStyle = css(0xa9afb5);
    ctx.lineWidth = 1;
    for (let i = 0; i <= 8; i++) {
      ctx.beginPath(); ctx.moveTo((i / 8) * w + 2, 0); ctx.lineTo((i / 8) * w + 2, h); ctx.stroke();
    }
    for (let i = 0; i < 120; i++) {
      ctx.fillStyle = css(0x6a7076, 0.5);
      const x = r2() * w, y = r2() * h;
      ctx.fillRect(x, y, 2 + r2() * 26, 2 + r2() * 4);
    }
  });
}

/** Diagonal hazard stripes, the universal "do not stand here" print. */
function hazardTex(a = '#f5c518', b = '#1b2a34', label = '') {
  return svgTexture(svg([0, 0, 512, 128], `
    <rect width="512" height="128" fill="${a}"/>
    <g fill="${b}">
      ${Array.from({ length: 14 }, (_, i) => `<path d="M${i * 48 - 40} 128 L${i * 48} 0 L${i * 48 + 24} 0 L${i * 48 - 16} 128 Z"/>`).join('')}
    </g>
    <rect x="0" y="46" width="512" height="36" fill="${b}" opacity="0.92"/>
    <text x="256" y="72" font-family="Helvetica,Arial,sans-serif" font-size="26" font-weight="700"
      letter-spacing="6" fill="${a}" text-anchor="middle">${label}</text>
  `), { w: 512, h: 128, key: 'hazard' + a + b + label });
}

/**
 * The corvette's forward corridor.
 *
 * Anchor: floor at `y = 0`, centred on X and Z, running along Z. It spans
 * `z = +length/2` (open mouth) to `z = -length/2`, so a camera at
 * `(0, 3.4, length/2 - 2)` looking down -Z sees the full receding hallway.
 * Interior clear width is `width`; the arch tops out at `userData.height`.
 *
 * Camera notes: eye height `userData.cameraY` (3.4, minifig eyeline) with a
 * 35-50 degree lens, `near` no larger than 0.2. Stay inside |x| < 4 so the
 * conduit runs do not clip the frustum. The far end is deliberately open — park
 * a `blastDoor()` at `z = -length/2` if a shot needs it capped.
 *
 * The set is enclosed, so a single exterior key never reaches the floor: pass
 * `practicals: 3` (or more) to have the corridor light itself from its own
 * ceiling coves.
 *
 * @param {object} o {segments, width, height, segLen, seed, practicals}
 * @returns {THREE.Group} userData: {length, width, height, segLen, cameraY,
 *   lights, lamps, lightMaterial, setLights(k), update(t)}
 */
export function corridor({
  segments = 8, width = 12, height = 9, segLen = 10, seed = 33, practicals = 0,
} = {}) {
  const g = new THREE.Group();
  g.name = 'corridor';
  const hx = width / 2;                 // inner wall x
  const shoulder = height * 0.7;        // where the wall starts to chamfer in
  const ceilHalf = hx - 1.9;            // half width of the flat ceiling

  const white = mat(C.white, { rough: 0.4 });
  const trim = mat(C.lightGray, { rough: 0.45 });
  const dark = mat(C.darkGray, { rough: 0.55 });
  const black = mat(C.black, { rough: 0.5 });
  const silver = mat(C.silver, { rough: 0.3, metal: 0.6 });
  const grate = mat(0xffffff, { map: gratingTex(), rough: 0.6 });
  // private, so a scene can brown-out this corridor without touching others
  const lightMat = new THREE.MeshBasicMaterial({ color: 0xfff4d2, toneMapped: false });
  const redMat = new THREE.MeshBasicMaterial({ color: 0xff5533, toneMapped: false });
  const hazeMat = fx(0xffeec2, 0.22);

  const chamLen = Math.hypot(hx - ceilHalf, height - shoulder);
  const chamAng = Math.atan2(height - shoulder, hx - ceilHalf);

  // conduit runs are chosen once for the whole corridor so they line up across
  // every segment variant, and they all sit above the light strip
  const pipeSeed = rng(seed * 61 + 5);
  const pipes = [
    { y: shoulder + 0.85, xo: 0.95, r: 0.24 },
    { y: shoulder + 0.15, xo: 0.62, r: 0.18 },
    { y: shoulder - 0.6, xo: 0.5, r: 0.14 },
  ].map((p) => ({ ...p, y: p.y - pipeSeed() * 0.15 }));

  const buildSegment = (variant) => () => {
    const s = new THREE.Group();
    const rand = rng(seed * 977 + variant * 131 + 7);
    const z0 = -segLen / 2;

    /* ---- floor ---- */
    const fl = flat(width - 4.6, 0.3, segLen, grate);
    fl.position.set(0, 0.15, 0);
    s.add(fl);
    for (const sx of [-1, 1]) {
      const side = blk(2.3, 0.36, segLen, trim);
      side.position.set(sx * (hx - 1.15), 0.18, 0);
      s.add(side);
      // studded strip: the tell that this is a LEGO set
      const st = plate(2, Math.round(segLen), { color: C.veryLightGray });
      st.position.set(sx * (hx - 1.15), 0.36 - PLATE, 0);
      s.add(st);
      // wall/floor cable channel
      const ch = flat(0.6, 0.5, segLen, black);
      ch.position.set(sx * (hx - 0.3), 0.25, 0);
      s.add(ch);
      for (let i = 0; i < 5; i++) {
        const c = flat(0.5, 0.22, 1.1, sx > 0 ? trim : trim);
        c.position.set(sx * (hx - 0.3), 0.55, z0 + 1 + i * (segLen / 5));
        s.add(c);
      }
    }
    // floor seam plates
    for (let i = 0; i < 2; i++) {
      const sm = flat(width - 4.6, 0.34, 0.35, dark);
      sm.position.set(0, 0.17, z0 + segLen * (i + 0.5) / 2);
      s.add(sm);
    }

    /* ---- walls ---- */
    for (const sx of [-1, 1]) {
      const X = sx * hx;
      // backing slab + kick panel
      const backing = flat(0.7, shoulder, segLen, white);
      backing.position.set(X + sx * 0.35, shoulder / 2, 0);
      s.add(backing);
      const kick = blk(0.5, 1.4, segLen, trim);
      kick.position.set(X - sx * 0.2, 0.85, 0);
      s.add(kick);

      // ribbed pilasters
      const nRib = 4;
      for (let i = 0; i < nRib; i++) {
        const z = z0 + (i + 0.5) * (segLen / nRib);
        const rib = blk(0.85, shoulder - 1.5, 1.1, trim);
        rib.position.set(X - sx * 0.42, 1.4 + (shoulder - 1.5) / 2 - 0.05, z);
        s.add(rib);
        const cap = blk(1.0, 0.4, 1.35, silver);
        cap.position.set(X - sx * 0.42, shoulder - 0.2, z);
        s.add(cap);
        // recessed panel between ribs
        const pw = segLen / nRib - 1.5;
        const rp = blk(0.3, shoulder - 3.4, pw, white);
        rp.position.set(X - sx * 0.12, 1.6 + (shoulder - 3.4) / 2, z + segLen / nRib / 2);
        s.add(rp);
      }

      // recessed light strip: housing + the glowing element inside it
      const hy = shoulder * 0.78;
      const hous = flat(0.75, 0.95, segLen, dark);
      hous.position.set(X - sx * 0.2, hy, 0);
      s.add(hous);
      const strip = flat(0.34, 0.5, segLen - 0.4, lightMat);
      strip.position.set(X - sx * 0.52, hy, 0);
      s.add(strip);
      const haze = flat(0.5, 1.5, segLen - 0.4, hazeMat);
      haze.position.set(X - sx * 0.75, hy, 0);
      s.add(haze);
      const lipA = blk(0.55, 0.22, segLen, silver);
      lipA.position.set(X - sx * 0.5, hy + 0.62, 0);
      s.add(lipA);
      const lipB = blk(0.55, 0.22, segLen, silver);
      lipB.position.set(X - sx * 0.5, hy - 0.62, 0);
      s.add(lipB);

      // chamfer up to the ceiling
      const cham = blk(chamLen, 0.5, segLen, white);
      cham.position.set(sx * (hx + ceilHalf) / 2, (shoulder + height) / 2, 0);
      cham.rotation.z = sx > 0 ? chamAng : -chamAng;
      s.add(cham);

      // conduit runs tucked under the chamfer
      pipes.forEach((pd, k) => {
        const p = pipeMesh(pd.r, segLen, k === 1 ? silver : trim, 10);
        p.rotation.x = Math.PI / 2;
        p.position.set(X - sx * pd.xo, pd.y, -segLen / 2);
        s.add(p);
      });
      // one shared clamp block per segment gathers all three runs
      const cl = flat(1.1, 2.1, 0.7, dark);
      cl.position.set(X - sx * 0.7, pipes[1].y, z0 + segLen * 0.32);
      s.add(cl);
      s.add(at(flat(0.5, 0.8, 0.45, silver), X - sx * 1.2, pipes[0].y, z0 + segLen * 0.32));

      // wall greeble: junction boxes, vents, hand-holds
      const nG = 6;
      for (let i = 0; i < nG; i++) {
        const z = z0 + 0.9 + rand() * (segLen - 1.8);
        const y = 1.9 + rand() * (shoulder - 4.2);
        const w2 = 0.45 + rand() * 1.0, h2 = 0.4 + rand() * 0.8;
        s.add(at(flat(0.26, h2, w2, rand() < 0.4 ? dark : trim), X - sx * 0.33, y, z));
        if (rand() < 0.4) {
          s.add(at(flat(0.14, h2 * 0.4, w2 * 0.45, silver), X - sx * 0.5, y, z));
        }
      }
      // floor-level equipment locker
      if (variant % 2 === 1) {
        s.add(at(blk(1.2, 2.2, 2.6, trim), X - sx * 0.85, 2.5, z0 + segLen * 0.68));
        s.add(at(flat(0.3, 0.35, 2.0, dark), X - sx * 1.5, 3.2, z0 + segLen * 0.68));
      }
    }

    /* ---- ceiling ---- */
    const ceil = flat(ceilHalf * 2, 0.55, segLen, white);
    ceil.position.set(0, height + 0.05, 0);
    s.add(ceil);
    for (const sx of [-1, 1]) {
      const cove = flat(0.9, 0.3, segLen - 0.6, lightMat);
      cove.position.set(sx * (ceilHalf - 0.95), height - 0.28, 0);
      s.add(cove);
      const coveHaze = flat(1.7, 0.9, segLen - 0.6, hazeMat);
      coveHaze.position.set(sx * (ceilHalf - 0.95), height - 0.75, 0);
      s.add(coveHaze);
      const covelip = blk(0.4, 0.5, segLen, trim);
      covelip.position.set(sx * (ceilHalf - 0.35), height - 0.35, 0);
      s.add(covelip);
    }
    // cross beam at the segment joint (spans the seam evenly on both sides)
    const beam = blk(ceilHalf * 2 + 1.2, 0.7, 1.0, trim);
    beam.position.set(0, height - 0.25, z0);
    s.add(beam);
    const beamPipe = pipeMesh(0.22, ceilHalf * 1.9, silver, 8);
    beamPipe.rotation.z = Math.PI / 2;
    beamPipe.position.set(ceilHalf * 0.95, height - 0.75, z0 + 1.1);
    s.add(beamPipe);

    /* ---- printed detail, varies by segment variant ---- */
    if (variant % 2 === 0) {
      const sc = panel(2.6, 1.9, screenTex(variant));
      sc.rotation.y = Math.PI / 2;
      sc.position.set(-hx + 0.05, 4.4, z0 + segLen * 0.5);
      s.add(sc);
      const frame = blk(0.3, 2.35, 3.05, dark);
      frame.position.set(-hx + 0.14, 4.4, z0 + segLen * 0.5);
      s.add(frame);
    }
    if (variant % 3 === 1) {
      const pl = panel(2.4, 1.7, wallPlateTex());
      pl.rotation.y = -Math.PI / 2;
      pl.position.set(hx - 0.06, 4.2, z0 + segLen * 0.45);
      s.add(pl);
    }
    if (variant % 3 === 2) {
      const hz = panel(2.8, 0.7, hazardTex('#f5c518', '#1b2a34', 'DECK 4'));
      hz.rotation.y = Math.PI / 2;
      hz.position.set(-hx + 0.05, 2.1, z0 + segLen * 0.7);
      s.add(hz);
      const lamp = flat(0.4, 0.4, 0.4, redMat);
      lamp.position.set(-hx + 0.4, 6.1, z0 + segLen * 0.2);
      s.add(lamp);
    }
    return s;
  };

  const nVar = 4;
  const templates = [];
  for (let v = 0; v < nVar; v++) templates.push(bakedTemplate(buildSegment(v)));

  const order = rng(seed * 13 + 3);
  for (let i = 0; i < segments; i++) {
    const t = templates[i === 0 ? 0 : Math.floor(order() * nVar) % nVar];
    const seg = t();
    seg.position.z = segLen / 2 + segments * segLen / 2 - (i + 1) * segLen;
    g.add(seg);
  }

  const length = segments * segLen;
  const lights = [];
  g.traverse((o) => {
    if (o.isMesh && (o.material === lightMat || o.material === redMat)) lights.push(o);
  });

  // optional practicals: an enclosed corridor renders black under a single
  // exterior key, so shots that live inside it want the set to light itself
  const lamps = [];
  for (let i = 0; i < practicals; i++) {
    const p = new THREE.PointLight(0xffeccd, 42, segLen * 4.5, 2);
    p.position.set(0, height * 0.56, length / 2 - (i + 0.5) * (length / practicals));
    p.userData.noBake = true;
    lamps.push(p);
    g.add(p);
  }

  g.userData.length = length;
  g.userData.width = width;
  g.userData.height = height;
  g.userData.segLen = segLen;
  g.userData.lights = lights;
  g.userData.lamps = lamps;
  g.userData.lightMaterial = lightMat;
  g.userData.cameraY = 3.4;
  /** 1 = full power, 0 = dark. Dim the whole hallway in one call. */
  g.userData.setLights = (k) => {
    lightMat.color.setRGB(1 * k, 0.957 * k, 0.824 * k);
    redMat.color.setRGB(1 * k, 0.33 * k, 0.2 * k);
    hazeMat.opacity = 0.22 * k;
    lamps.forEach((l) => { l.intensity = 42 * k; });
  };
  g.userData.update = (t) => {
    // barely-visible mains hum, plus one failing tube
    const k = 0.94 + 0.06 * Math.sin(t * 7.3) * Math.sin(t * 1.7);
    lightMat.color.setRGB(k, k * 0.957, k * 0.824);
    const r = 0.55 + 0.45 * (Math.sin(t * 3.1) > 0.2 ? 1 : 0.25);
    redMat.color.setRGB(r, r * 0.33, r * 0.2);
  };
  return g;
}

/**
 * A sealed pressure door.
 *
 * Anchor: centred on X, base at `y = 0`, sitting in the XY plane and about
 * `userData.thickness` deep in Z, so it drops straight into a corridor mouth at
 * whatever z you like. The two halves part along X.
 *
 * @param {object} o {width, height, seed, label}
 * @returns {THREE.Group} userData: {width, height, thickness, halves,
 *   setOpen(0..1), blowOut(), update(t)}
 */
export function blastDoor({ width = 12, height = 9, seed = 44, label = 'SEAL 7' } = {}) {
  const g = new THREE.Group();
  g.name = 'blastDoor';
  const th = 1.1;
  const hw = width / 2;

  const frameMat = mat(C.bluishGray, { rough: 0.45 });
  const doorMat = mat(C.veryLightGray, { rough: 0.4 });
  const dark = mat(C.darkGray, { rough: 0.55 });
  const silver = mat(C.silver, { rough: 0.28, metal: 0.6 });
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xff6a3a, toneMapped: false });

  /* ---- frame ---- */
  const frame = new THREE.Group();
  for (const sx of [-1, 1]) {
    frame.add(at(blk(1.5, height + 1.6, th + 0.7, frameMat), sx * (hw + 0.75), (height + 1.6) / 2 - 0.8, 0));
    for (let i = 0; i < 5; i++) {
      frame.add(at(flat(0.4, 0.5, 0.5, silver), sx * (hw + 1.4), 1.2 + i * (height / 5), 0));
    }
  }
  frame.add(at(blk(width + 3, 1.5, th + 0.7, frameMat), 0, height + 0.75, 0));
  frame.add(at(blk(width + 3, 0.5, th + 1.2, dark), 0, 0.25, 0));
  const hz = panel(width + 2.6, 0.75, hazardTex('#f5c518', '#1b2a34', label));
  hz.position.set(0, height + 0.75, th / 2 + 0.42);
  frame.add(hz);
  g.add(bake(frame));

  /* ---- the two halves ---- */
  const halves = [];
  for (const sx of [-1, 1]) {
    const half = new THREE.Group();
    const rand = rng(seed * 101 + (sx > 0 ? 3 : 7));
    half.add(at(blk(hw, height, th, doorMat), sx * hw / 2, height / 2, 0));
    // stepped armour courses
    for (let i = 0; i < 4; i++) {
      const y = 0.9 + i * (height - 1.6) / 4;
      half.add(at(blk(hw - 0.6, (height - 1.6) / 4 - 0.35, 0.4, i % 2 ? doorMat : frameMat),
        sx * hw / 2, y + (height - 1.6) / 8, th / 2 + 0.2));
      half.add(at(blk(hw - 0.6, (height - 1.6) / 4 - 0.35, 0.4, i % 2 ? doorMat : frameMat),
        sx * hw / 2, y + (height - 1.6) / 8, -th / 2 - 0.2));
    }
    // central lock rib along the meeting edge
    half.add(at(blk(0.8, height - 0.4, th + 0.5, frameMat), sx * 0.4, height / 2, 0));
    for (let i = 0; i < 4; i++) {
      half.add(at(flat(0.6, 0.9, th + 0.9, silver), sx * 0.4, 1.4 + i * (height - 2.4) / 3, 0));
    }
    // hazard print + greeble
    const hzp = panel(hw - 1.2, 1.0, hazardTex('#f5c518', '#1b2a34', ''));
    hzp.position.set(sx * hw / 2, height * 0.62, th / 2 + 0.42);
    half.add(hzp);
    for (let i = 0; i < 6; i++) {
      half.add(at(flat(0.6 + rand() * 1.4, 0.4 + rand() * 0.8, 0.3, dark),
        sx * (1.4 + rand() * (hw - 2.6)), 1.2 + rand() * (height - 2.4), th / 2 + 0.2));
    }
    half.add(at(flat(0.7, 0.35, 0.5, lampMat), sx * (hw - 1.2), height - 0.9, th / 2 + 0.3));
    const baked = bake(half);
    baked.userData.noBake = true;
    halves.push(baked);
    g.add(baked);
  }

  let open = 0;
  const setOpen = (u) => {
    open = clamp(u, 0, 1);
    const d = (hw + 1.1) * smoothstep(open);
    halves[0].position.x = -d;
    halves[1].position.x = d;
    return g;
  };
  setOpen(0);

  g.userData.width = width;
  g.userData.height = height;
  g.userData.thickness = th + 1.4;
  g.userData.halves = halves;
  g.userData.setOpen = setOpen;
  Object.defineProperty(g.userData, 'open', { get: () => open });
  g.userData.update = (t) => {
    const k = 0.5 + 0.5 * Math.sin(t * 4.2);
    lampMat.color.setRGB(1, 0.25 + 0.25 * k, 0.12 + 0.15 * k);
  };

  /**
   * Blow the door in. Hides the halves and hands back a group of loose bricks,
   * each with `userData.vel` / `.spin` / `.home`, plus a convenience
   * `userData.setT(seconds)` that flings them on a ballistic arc.
   */
  g.userData.blowOut = ({ seed: bseed = seed * 3 + 1, count = 34, gravity = 26 } = {}) => {
    const rand = rng(bseed);
    const debris = new THREE.Group();
    debris.name = 'blastDoorDebris';
    const cols = [C.veryLightGray, C.bluishGray, C.lightGray, C.darkGray, C.silver];
    const pieces = [];
    for (let i = 0; i < count; i++) {
      const sx = rand() < 0.5 ? -1 : 1;
      const w = 1 + Math.round(rand() * 2);
      const d = 1 + Math.round(rand() * 2);
      const p = rand() < 0.45
        ? plate(w, d, { color: cols[Math.floor(rand() * cols.length)] })
        : brick(w, d, BRICK, { color: cols[Math.floor(rand() * cols.length)] });
      const home = new THREE.Vector3(
        sx * (0.6 + rand() * (hw - 0.8)),
        0.6 + rand() * (height - 1),
        (rand() - 0.5) * th,
      );
      p.position.copy(home);
      p.userData.home = home.clone();
      p.userData.vel = new THREE.Vector3(
        home.x * (0.55 + rand() * 0.5),
        4 + rand() * 12,
        6 + rand() * 26,
      );
      p.userData.spin = new THREE.Vector3(
        (rand() - 0.5) * 14, (rand() - 0.5) * 14, (rand() - 0.5) * 14,
      );
      p.userData.noBake = true;
      pieces.push(p);
      debris.add(p);
    }
    halves.forEach((h) => { h.visible = false; });
    debris.userData.pieces = pieces;
    debris.userData.gravity = gravity;
    /** t in seconds since the breach. */
    debris.userData.setT = (t) => {
      for (const p of pieces) {
        const v = p.userData.vel, home = p.userData.home;
        p.position.set(
          home.x + v.x * t,
          Math.max(0.2, home.y + v.y * t - 0.5 * gravity * t * t),
          home.z + v.z * t,
        );
        p.rotation.set(p.userData.spin.x * t, p.userData.spin.y * t, p.userData.spin.z * t);
      }
    };
    debris.userData.update = debris.userData.setT;
    return debris;
  };
  return g;
}

/**
 * Escape-pod launch bay: a clamped cradle aimed down -Z at the launch tube,
 * warning lights, and a hazard-striped deck.
 *
 * Anchor: deck at `y = 0`, centred on X/Z, tube mouth at `-Z`. Park a pod at
 * `userData.podAnchor` (an Object3D already in the right place and rotation).
 *
 * `practicals` adds that many bay floods, for shots that sit inside the roofed
 * bay where a single exterior key cannot reach.
 *
 * @param {object} o {width, height, depth, seed, practicals}
 * @returns {THREE.Group} userData: {width, height, depth, podAnchor, clamps,
 *   lights, lamps, setClamps(0..1), update(t)}
 */
export function podBay({ width = 20, height = 11, depth = 26, seed = 55, practicals = 0 } = {}) {
  const g = new THREE.Group();
  g.name = 'podBay';
  const rand = rng(seed);
  const hw = width / 2, hd = depth / 2;

  const white = mat(C.white, { rough: 0.4 });
  const trim = mat(C.lightGray, { rough: 0.45 });
  const dark = mat(C.darkGray, { rough: 0.55 });
  const black = mat(C.black, { rough: 0.5 });
  const silver = mat(C.silver, { rough: 0.28, metal: 0.6 });
  const grate = mat(0xffffff, { map: gratingTex(), rough: 0.6 });
  const amber = new THREE.MeshBasicMaterial({ color: 0xffb43a, toneMapped: false });
  const red = new THREE.MeshBasicMaterial({ color: 0xff4a2a, toneMapped: false });
  const cyan = new THREE.MeshBasicMaterial({ color: 0x8fe8ff, toneMapped: false });

  const stat = new THREE.Group();

  /* ---- deck ---- */
  stat.add(at(flat(width, 0.4, depth, grate), 0, 0.2, 0));
  for (const sx of [-1, 1]) {
    stat.add(at(blk(2.4, 0.5, depth, trim), sx * (hw - 1.2), 0.25, 0));
    stat.add(at(plate(2, Math.round(depth), { color: C.veryLightGray }), sx * (hw - 1.2), 0.5 - PLATE, 0));
  }
  const deckHz = panel(width - 6, 2.2, hazardTex('#f5c518', '#1b2a34', 'POD 7'));
  deckHz.rotation.x = -Math.PI / 2;
  deckHz.position.set(0, 0.42, hd - 3.2);
  stat.add(deckHz);

  /* ---- walls + ceiling ---- */
  for (const sx of [-1, 1]) {
    stat.add(at(flat(0.7, height, depth, white), sx * (hw + 0.35), height / 2, 0));
    for (let i = 0; i < 6; i++) {
      const z = -hd + 1.6 + i * (depth - 3.2) / 5;
      stat.add(at(blk(0.7, height - 1.2, 1.1, trim), sx * (hw - 0.3), (height - 1.2) / 2 + 0.4, z));
    }
    stat.add(at(flat(0.5, 0.55, depth - 1, amber), sx * (hw - 0.5), height * 0.72, 0));
    stat.add(at(blk(0.55, 0.25, depth, silver), sx * (hw - 0.55), height * 0.72 + 0.62, 0));
    stat.add(at(blk(0.55, 0.25, depth, silver), sx * (hw - 0.55), height * 0.72 - 0.62, 0));
    // control console on the +Z end of each wall
    stat.add(at(blk(2.4, 3.2, 1.6, trim), sx * (hw - 1.6), 1.6, hd - 2.2));
    const scr = panel(1.8, 1.3, screenTex(sx > 0 ? 1 : 2));
    scr.rotation.set(-0.5, sx > 0 ? -Math.PI / 2 : Math.PI / 2, 0);
    scr.position.set(sx * (hw - 2.85), 3.0, hd - 2.2);
    stat.add(scr);
  }
  stat.add(at(flat(width, 0.6, depth, white), 0, height + 0.3, 0));
  for (let i = 0; i < 4; i++) {
    stat.add(at(blk(width, 0.7, 1.0, trim), 0, height - 0.25, -hd + 2 + i * (depth - 4) / 3));
  }
  stat.add(at(flat(width - 5, 0.34, depth - 4, cyan), 0, height - 0.5, 0));

  /* ---- launch tube at -Z ---- */
  const tubeR = Math.min(hw - 1.2, height * 0.44);
  const tube = new THREE.Group();
  tube.position.set(0, tubeR + 1.2, -hd);
  const ringGeo = rawGeo('podring' + Math.round(tubeR * 4), () => {
    const t = norm(new THREE.TorusGeometry(tubeR, 0.55, 8, 40));
    return t;
  });
  tube.add(new THREE.Mesh(ringGeo, trim));
  const ring2 = new THREE.Mesh(ringGeo, dark);
  ring2.scale.setScalar(1.11);
  tube.add(ring2);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * TAU;
    tube.add(at(flat(1.0, 1.0, 0.7, i % 4 === 0 ? silver : trim),
      Math.cos(a) * tubeR * 1.06, Math.sin(a) * tubeR * 1.06, 0.3));
  }
  // blast shield behind the ring so the bay doesn't read as open space
  const shield = new THREE.Mesh(
    rawGeo('podshield', () => norm(new THREE.CircleGeometry(1, 32))), black,
  );
  shield.scale.setScalar(tubeR * 0.98);
  shield.position.z = -0.8;
  tube.add(shield);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU;
    tube.add(at(rot(flat(tubeR * 1.7, 0.5, 0.4, dark), 0, 0, a), 0, 0, -0.6));
  }
  stat.add(tube);

  /* ---- cradle ---- */
  const cradle = new THREE.Group();
  cradle.position.set(0, 0.5, 1.2);
  const cradleY = 2.6;
  for (const sz of [-1, 1]) {
    cradle.add(at(blk(9, 1.2, 2.2, dark), 0, 0.6, sz * 4.2));
    for (const sx of [-1, 1]) {
      cradle.add(at(blk(1.6, cradleY, 1.8, trim), sx * 3.6, cradleY / 2 + 1.2, sz * 4.2));
      cradle.add(at(rot(blk(2.6, 0.9, 1.6, silver), 0, 0, sx * 0.5), sx * 2.6, cradleY + 1.5, sz * 4.2));
    }
    cradle.add(at(flat(0.5, 0.5, 0.5, red), 0, 1.4, sz * 5.4));
  }
  cradle.add(at(blk(3.2, 0.8, 9.5, dark), 0, 0.4, 0));
  stat.add(cradle);

  /* ---- bay greeble ---- */
  for (let i = 0; i < 46; i++) {
    const sx = rand() < 0.5 ? -1 : 1;
    const z = -hd + 1 + rand() * (depth - 2);
    const y = 1 + rand() * (height - 2.5);
    stat.add(at(flat(0.35, 0.4 + rand() * 1.2, 0.5 + rand() * 1.6, rand() < 0.3 ? dark : trim),
      sx * (hw - 0.35), y, z));
  }
  for (let i = 0; i < 3; i++) {
    const p = pipeMesh(0.28, depth - 1, silver, 10);
    p.rotation.x = Math.PI / 2;
    p.position.set(-hw + 1.3 + i * 0.9, height - 1.4, -(depth - 1) / 2);
    stat.add(p);
  }

  const baked = bake(stat);
  g.add(baked);

  /* ---- animated: clamps + warning beacons ---- */
  const clampArms = [];
  for (const sz of [-1, 1]) {
    for (const sx of [-1, 1]) {
      const arm = new THREE.Group();
      arm.position.set(sx * 3.6, 4.3, 1.2 + sz * 4.2);
      const a = blk(3.4, 0.9, 1.4, silver);
      a.position.x = -sx * 1.7;
      arm.add(a);
      const pad = blk(1.0, 0.7, 1.6, dark);
      pad.position.x = -sx * 3.2;
      arm.add(pad);
      keep(arm);
      clampArms.push({ arm, sx });
      g.add(arm);
    }
  }
  const beacons = [];
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const b = new THREE.Group();
      b.position.set(sx * (hw - 0.9), height - 1.9, sz * (hd - 3));
      const dome = new THREE.Mesh(rawGeo('beacon', () => {
        const s = norm(new THREE.SphereGeometry(1, 12, 8, 0, TAU, 0, Math.PI / 2));
        return s;
      }), sx > 0 ? amber : red);
      dome.scale.setScalar(0.62);
      b.add(dome);
      b.add(at(flat(1.5, 0.3, 1.5, dark), 0, -0.1, 0));
      const halo = spriteFx(3.4, dotTex(0.08, 'soft'), sx > 0 ? 0xffb43a : 0xff4a2a, 0.35);
      b.add(halo);
      keep(b);
      beacons.push({ g: b, halo, phase: sx * 0.9 + sz * 1.7 });
      g.add(b);
    }
  }

  const podAnchor = new THREE.Object3D();
  podAnchor.position.set(0, 4.0, 1.2);
  g.add(podAnchor);

  const lamps = [];
  for (let i = 0; i < practicals; i++) {
    const p = new THREE.PointLight(0xffeccd, 40, depth * 2.4, 2);
    p.position.set(0, height * 0.7, hd - (i + 0.5) * (depth / practicals));
    p.userData.noBake = true;
    lamps.push(p);
    g.add(p);
  }

  let clampK = 1;
  const setClamps = (u) => {
    clampK = clamp(u, 0, 1);
    clampArms.forEach(({ arm, sx }) => {
      arm.position.x = sx * (3.6 + (1 - clampK) * 2.6);
      arm.rotation.z = -sx * (1 - clampK) * 0.5;
    });
    return g;
  };
  setClamps(1);

  g.userData.width = width;
  g.userData.height = height;
  g.userData.depth = depth;
  g.userData.tubeRadius = tubeR;
  g.userData.podAnchor = podAnchor;
  g.userData.clamps = clampArms.map((c) => c.arm);
  g.userData.lights = beacons.map((b) => b.g);
  g.userData.lamps = lamps;
  /** 1 = pod clamped, 0 = clamps retracted and clear for launch. */
  g.userData.setClamps = setClamps;
  Object.defineProperty(g.userData, 'clamped', { get: () => clampK });
  g.userData.update = (t) => {
    beacons.forEach((b, i) => {
      const k = 0.5 + 0.5 * Math.sin(t * 5 + b.phase);
      b.halo.material.opacity = 0.12 + 0.45 * k;
      b.g.rotation.y = t * (i % 2 ? 3 : -3);
    });
    amber.color.setRGB(1, 0.55 + 0.25 * Math.sin(t * 5), 0.18);
    red.color.setRGB(1, 0.2 + 0.12 * Math.sin(t * 5 + 1.9), 0.14);
  };
  return g;
}

/* =================================================================== */
/* SURFACE                                                              */
/* =================================================================== */

/**
 * Stud relief for baseplates: a 4x4 stud tile as a tangent-space normal map,
 * repeated hard across the ground. A 900-unit dune field then still reads as
 * LEGO without paying for 810,000 stud cylinders.
 */
function studNormalTex() {
  const N = 256, studs = 4, cell = N / studs;
  const studH = 0.055;         // 0.22 units of stud height over a 4-stud tile
  return normalTex('studs', N, N, (x, y) => {
    const i = Math.floor(x / cell), j = Math.floor(y / cell);
    const dx = x - (i + 0.5) * cell, dy = y - (j + 0.5) * cell;
    const r = Math.sqrt(dx * dx + dy * dy) / (cell * 0.3);
    if (r > 1.06) return 0;
    const fill = smoothclamp((1.0 - r) / 0.16);
    return studH * (fill * 0.94 + 0.06 * clamp(1 - r * r, 0, 1));
  }, 1);
}

/** Low-poly wind-carved rock, base at y = 0. */
function rockMesh(r, rand, material) {
  const geo = (() => {
    const g = norm(new THREE.IcosahedronGeometry(1, rand() < 0.4 ? 1 : 0));
    const p = g.attributes.position;
    const seedRand = rand();
    const n = fbm(Math.floor(1 + seedRand * 100000), { octaves: 3, base: 4 });
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const k = 0.5 + 0.8 * n((Math.atan2(z, x) / TAU + 1) % 1, (y + 1) / 2);
      p.setXYZ(i, x * k * 1.2, y * k * (0.4 + seedRand * 0.38), z * k * 1.2);
    }
    g.computeVertexNormals();
    return g;
  })();
  geo.computeBoundingBox();
  geo.translate(0, -geo.boundingBox.min.y, 0);
  geo.scale(r, r, r);
  const m = new THREE.Mesh(geo, material);
  m.castShadow = m.receiveShadow = true;
  return m;
}

/**
 * Tatooine.
 *
 * Anchor: centred on X/Z, **`y = 0` is mean ground level** — the dunes rise and
 * fall either side of it. Use `userData.heightAt(x, z)` to sit anything exactly
 * on the sand; it is the same closure the vertices were displaced with, so it
 * is exact rather than approximate.
 *
 * @param {object} o {size, seg, seed, amp, rocks, bones}
 * @returns {THREE.Group} userData: {size, yRange, heightAt(x,z), ground,
 *   normalAt(x,z)}
 */
export function desert({ size = 900, seg = 240, seed = 77, amp = 13, rocks = 44, bones = 3 } = {}) {
  const g = new THREE.Group();
  g.name = 'desert';
  const rand = rng(seed * 313 + 11);

  /* ---- the height function: authoritative for geometry AND queries ---- */
  // Dune wavelength is absolute (in studs), not a fraction of the field, so a
  // 260-unit patch and a 2000-unit field have the same sized dunes. The lattice
  // period is always kept longer than the field so the noise never visibly
  // tiles.
  const cellFor = (c) => c * Math.max(8, Math.ceil((size * 1.3) / c));
  const P0 = cellFor(340);        // slow swells, so a wide shot has big forms
  const P1 = cellFor(120);        // primary dunes, ~120-stud crests
  const P2 = cellFor(58);         // secondary ridges
  const swell = fbm(seed * 3 + 17, { octaves: 2, base: Math.round(P0 / 340), gain: 0.5 });
  const dune = fbm(seed * 7 + 1, { octaves: 4, base: Math.round(P1 / 120), gain: 0.5 });
  const crest = fbm(seed * 19 + 5, { octaves: 3, base: Math.round(P2 / 58), gain: 0.48, ridged: true });
  const grain = fbm(seed * 41 + 3, { octaves: 3, base: Math.round(P2 / 22), gain: 0.5 });
  const windAng = 0.62;
  const wc = Math.cos(windAng), ws = Math.sin(windAng);

  const heightAt = (x, z) => {
    const u1 = x / P1, v1 = z / P1;
    const u2 = x / P2, v2 = z / P2;
    let h = (swell(x / P0, z / P0) - 0.5) * amp * 1.7;
    h += (dune(u1, v1) - 0.5) * 2 * amp;
    h += (crest(u2, v2) - 0.5) * amp * 0.42;
    // wind ripples running across the dune faces: regular, and coarse enough
    // that the ground mesh can actually resolve them
    const s = (x * wc + z * ws) / 4.6;
    const rip = Math.sin(s + grain(u2, v2) * 6.0) * 0.42;
    h += rip * (0.4 + 0.6 * dune(u1 * 2.1, v1 * 2.1));
    h += (grain(u2 * 2.2, v2 * 2.2) - 0.5) * 0.45;
    return h;
  };

  const eps = 0.35;
  const normalAt = (x, z) => new THREE.Vector3(
    heightAt(x - eps, z) - heightAt(x + eps, z),
    2 * eps,
    heightAt(x, z - eps) - heightAt(x, z + eps),
  ).normalize();

  /* ---- ground mesh ---- */
  const geo = new THREE.PlaneGeometry(size, size, seg, seg);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < pos.count; i++) {
    const y = heightAt(pos.getX(i), pos.getZ(i));
    pos.setY(i, y);
    if (y < lo) lo = y;
    if (y > hi) hi = y;
  }
  geo.computeVertexNormals();

  const sandMap = canvasTex('sand' + seed, 1024, 1024, (ctx, w, h) => {
    const tint = fbm(seed * 23 + 9, { octaves: 5, base: 5, gain: 0.55 });
    const patch = fbm(seed * 37 + 13, { octaves: 4, base: 9, gain: 0.5, ridged: true });
    const lut = [];
    const ramp = [
      [0.0, 0xa98c5e], [0.35, 0xc4a97c], [0.58, 0xd9c294],
      [0.78, 0xe9d8b0], [1.0, 0xf4e9ce],
    ];
    for (let i = 0; i < 256; i++) {
      const t = i / 255;
      let k = 0;
      while (k < ramp.length - 2 && t > ramp[k + 1][0]) k++;
      const a = ramp[k], b = ramp[k + 1];
      lut.push(new THREE.Color(a[1]).lerp(new THREE.Color(b[1]),
        clamp((t - a[0]) / (b[0] - a[0]), 0, 1)));
    }
    const tmp = new THREE.Color();
    pixels(ctx, w, h, (u, v) => {
      // the albedo follows the dunes, so crests read pale and troughs shaded
      const x = (u - 0.5) * size, z = (v - 0.5) * size;
      const hh = clamp((heightAt(x, z) - lo) / Math.max(1e-3, hi - lo), 0, 1);
      let t = 0.34 + (hh - 0.5) * 0.42 + (tint(u * 2.4, v * 2.4) - 0.5) * 0.34
        + (patch(u * 5, v * 5) - 0.5) * 0.2;
      t = clamp(t, 0, 1);
      tmp.copy(lut[Math.round(t * 255)]);
      const sp = tint(u * 22, v * 22);
      tmp.offsetHSL(0, 0, (sp - 0.5) * 0.06);
      return [Math.round(tmp.r * 255), Math.round(tmp.g * 255), Math.round(tmp.b * 255)];
    });
  }, { wrapS: THREE.ClampToEdgeWrapping, wrapT: THREE.ClampToEdgeWrapping });

  const studs = studNormalTex().clone();
  studs.wrapS = studs.wrapT = THREE.RepeatWrapping;
  studs.repeat.set(size / 4, size / 4);
  studs.needsUpdate = true;

  const sandMat = new THREE.MeshStandardMaterial({
    map: sandMap, normalMap: studs, roughness: 0.95, metalness: 0,
  });
  sandMat.normalScale.set(0.55, 0.55);
  const ground = new THREE.Mesh(geo, sandMat);
  ground.receiveShadow = true;
  ground.castShadow = false;
  ground.userData.noBake = true;      // keep it indexed; it is already one mesh
  g.add(ground);

  /* ---- rocks + bones ---- */
  const props = new THREE.Group();
  const rockMats = [
    mat(0x9c8259, { rough: 0.85 }), mat(0x7d6647, { rough: 0.88 }),
    mat(0xb09a72, { rough: 0.82 }), mat(0x6a5a44, { rough: 0.9 }),
  ];
  for (let i = 0; i < rocks; i++) {
    const x = (rand() - 0.5) * size * 0.94;
    const z = (rand() - 0.5) * size * 0.94;
    const r = 1.4 + Math.pow(rand(), 2.6) * 11;
    const m = rockMesh(r, rand, rockMats[Math.floor(rand() * rockMats.length)]);
    m.position.set(x, heightAt(x, z) - r * 0.2, z);
    m.rotation.y = rand() * TAU;
    props.add(m);
    // debris skirt
    for (let k = 0; k < 3; k++) {
      const a = rand() * TAU, d = r * (1.1 + rand());
      const px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d;
      const s = rockMesh(r * (0.1 + rand() * 0.22), rand, rockMats[Math.floor(rand() * rockMats.length)]);
      s.position.set(px, heightAt(px, pz) - 0.1, pz);
      s.rotation.y = rand() * TAU;
      props.add(s);
    }
  }

  const boneMat = mat(0xe6e0cc, { rough: 0.8 });
  const boneMat2 = mat(0xcfc7ae, { rough: 0.82 });
  for (let i = 0; i < bones; i++) {
    const bx = (rand() - 0.5) * size * 0.7;
    const bz = (rand() - 0.5) * size * 0.7;
    const yaw = rand() * TAU;
    const sk = new THREE.Group();
    sk.position.set(bx, heightAt(bx, bz), bz);
    sk.rotation.y = yaw;
    const L = 13 + rand() * 9;
    // spine
    for (let k = 0; k < 11; k++) {
      const t = k / 10;
      sk.add(at(flat(0.55 - t * 0.2, 0.5, 0.85, boneMat), 0, 1.4 + Math.sin(t * 3) * 0.35, -L / 2 + t * L));
    }
    // ribcage
    for (let k = 0; k < 7; k++) {
      const t = k / 6;
      const rr = 3.4 - Math.abs(t - 0.45) * 3.6;
      if (rr < 0.6) continue;
      for (const sx of [-1, 1]) {
        const rib = new THREE.Mesh(
          rawGeo(`rib${Math.round(rr * 4)}`, () => {
            const c = new THREE.TorusGeometry(1, 0.075, 5, 14, Math.PI * 0.86);
            return norm(c);
          }), boneMat);
        rib.scale.setScalar(rr);
        rib.position.set(0, 1.5, -L * 0.3 + t * L * 0.62);
        rib.rotation.set(0, sx > 0 ? 0 : Math.PI, sx > 0 ? -0.35 : 0.35);
        rib.castShadow = true;
        sk.add(rib);
      }
    }
    // skull + horns
    const sz = -L / 2 - 1.4;
    sk.add(at(blk(2.4, 1.7, 3.0, boneMat2), 0, 1.5, sz));
    sk.add(at(blk(1.3, 0.9, 1.4, boneMat2), 0, 1.1, sz - 2.0));
    for (const sx of [-1, 1]) {
      const horn = cone(0.52, 0.06, 4.2, { color: 0xd8d0b6, seg: 8 });
      horn.position.set(sx * 1.1, 2.2, sz);
      horn.rotation.set(0.5, 0, sx * 1.15);
      sk.add(horn);
    }
    // scattered loose bones
    for (let k = 0; k < 5; k++) {
      const a = rand() * TAU, d = 3 + rand() * 9;
      sk.add(at(rot(flat(0.4, 0.35, 1.6 + rand() * 1.8, boneMat), 0, rand() * TAU, 0),
        Math.cos(a) * d, 0.25, Math.sin(a) * d + L * 0.1));
    }
    props.add(sk);
  }

  // sun-bleached machine wreckage: one dead speeder frame for scale
  {
    const wx = (rand() - 0.5) * size * 0.5, wz = (rand() - 0.5) * size * 0.5;
    const wr = new THREE.Group();
    wr.position.set(wx, heightAt(wx, wz) - 0.4, wz);
    wr.rotation.set(0.12, rand() * TAU, 0.2);
    const rust = mat(0x8c5b3a, { rough: 0.85 });
    const rust2 = mat(0x6d4a34, { rough: 0.88 });
    wr.add(at(blk(4.4, 1.3, 12, rust), 0, 1.0, 0));
    wr.add(at(blk(3.2, 1.6, 4.2, rust2), 0, 2.2, 2.2));
    for (const sx of [-1, 1]) {
      wr.add(at(rot(pipeMesh(0.55, 7.5, rust2, 8), Math.PI / 2, 0, 0), sx * 2.6, 1.2, -3.6));
    }
    wr.add(at(blk(2.2, 0.4, 3.4, rust), 1.4, 1.7, -5.6));
    props.add(wr);
  }

  g.add(bake(props));

  g.userData.size = size;
  g.userData.width = size;
  g.userData.length = size;
  g.userData.yRange = [lo, hi];
  g.userData.ground = ground;
  /** Exact ground height at world x/z (group-local). Place props at this y. */
  g.userData.heightAt = heightAt;
  /** Unit surface normal at x/z — useful for tilting droid feet and wrecks. */
  g.userData.normalAt = normalAt;
  return g;
}

/**
 * Distant silhouette ridges wrapped all the way round the horizon, so any
 * camera yaw finds a skyline. Deliberately **unlit** (`MeshBasicMaterial`):
 * these layers stand in for far-field haze, and their flat tones are a stylised
 * aerial-perspective ramp rather than baked shading.
 *
 * Anchor: origin, `y = 0` at the viewer's ground plane.
 *
 * @param {object} o {seed, layers, radius, haze}
 */
export function dunesBackdrop({ seed = 91, layers = 4, radius = 1500, haze = 0xc9b48c } = {}) {
  const g = new THREE.Group();
  g.name = 'dunesBackdrop';
  const near = new THREE.Color(0xc0a173);
  const far = new THREE.Color(haze);

  for (let L = 0; L < layers; L++) {
    const t = L / Math.max(1, layers - 1);
    const R = radius * (1 + L * 0.62);
    const H = R * (0.055 + t * 0.055);
    const n = fbm(seed * 17 + L * 29 + 3, { octaves: 4, base: 5 + L * 3, gain: 0.55, ridged: L % 2 === 1 });
    const segs = 200;
    const posArr = [];
    const idx = [];
    for (let i = 0; i <= segs; i++) {
      const u = i / segs;
      const a = u * TAU;
      const hgt = H * (0.32 + 0.68 * Math.pow(n(u, 0.37 + L * 0.11), 1.35));
      posArr.push(Math.cos(a) * R, -R * 0.06, Math.sin(a) * R);
      posArr.push(Math.cos(a) * R, hgt, Math.sin(a) * R);
    }
    for (let i = 0; i < segs; i++) {
      const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
      idx.push(a, c, b, b, c, d);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(posArr, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const col = near.clone().lerp(far, Math.pow(t, 0.8));
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
      color: col.getHex(), side: THREE.DoubleSide, fog: false,
    }));
    m.renderOrder = -800 + L;
    g.add(m);
  }
  g.userData.radius = radius * (1 + (layers - 1) * 0.62);
  g.userData.noBake = true;
  return g;
}

/**
 * The battle station trench: a straight modular canyon running along -Z.
 *
 * Anchor: floor at `y = 0`, centred on X, **mouth at `z = 0` and far end at
 * `z = -length`**. Fly a camera from `(0, ~12, +40)` straight down -Z. The walls
 * are `width` apart and `userData.height` tall.
 *
 * Camera notes: `userData.cameraY` (12) is the sweet spot — low enough that the
 * walls tower, high enough to clear the floor conduit. Keep |x| under 10 so the
 * wall brackets stay outside the frustum, roll the camera a few degrees for the
 * classic look, and use `near` 0.5 / `far` past `length`. The exhaust port sits
 * on the floor at `userData.exhaustPort.position`, dead centre.
 *
 * Sections are authored once, merged, then cloned end to end, and every feature
 * is contained inside its own section, so it tiles seamlessly for as long as you
 * like. Pipe runs and course heights are chosen once for the whole trench so
 * they line up across variants.
 *
 * @param {object} o {length, width, height, secLen, seed, variants}
 * @returns {THREE.Group} userData: {length, width, height, secLen, sections,
 *   cameraY, exhaustPort, wallLights, lightBanks, update(t)}
 */
export function trench({
  length = 1400, width = 34, height = 46, secLen = 100, seed = 101, variants = 6,
} = {}) {
  const g = new THREE.Group();
  g.name = 'trench';
  const hx = width / 2;
  const sections = Math.max(1, Math.round(length / secLen));
  const realLen = sections * secLen;

  const hullA = mat(0x9298a0, { rough: 0.62, metal: 0.2 });
  const hullB = mat(0x7d838b, { rough: 0.66, metal: 0.2 });
  const hullC = mat(0xa8aeb5, { rough: 0.58, metal: 0.22 });
  const deep = mat(0x4c5259, { rough: 0.7, metal: 0.15 });
  const shadowMat = mat(0x33383e, { rough: 0.75 });
  const metal = mat(0xb4bac0, { rough: 0.32, metal: 0.62 });
  const plating = platingTex(seed);
  plating.repeat.set(width / 22, secLen / 22);
  const floorMat = mat(0xffffff, { map: plating, rough: 0.64, metal: 0.18 });
  // three private blink banks, so lights are 3 materials rather than hundreds
  const lampMats = [
    new THREE.MeshBasicMaterial({ color: 0xff5f3c, toneMapped: false }),
    new THREE.MeshBasicMaterial({ color: 0x8fe0ff, toneMapped: false }),
    new THREE.MeshBasicMaterial({ color: 0xffd06a, toneMapped: false }),
  ];

  /* ---- profile shared by every section so courses line up ---- */
  const pr = rng(seed * 71 + 13);
  const courses = [];
  {
    let y = 1.6;
    let out = 0;
    while (y < height - 3) {
      const ch = 3.5 + pr() * 5.5;
      out = clamp(out + (pr() - 0.45) * 1.5, 0, 2.6);
      courses.push({ y, h: Math.min(ch, height - 3 - y), out });
      y += ch + 0.5;
    }
  }
  const runs = [
    { y: height * 0.2, xo: 1.4, r: 0.4 },
    { y: height * 0.34, xo: 2.1, r: 0.26 },
    { y: height * 0.62, xo: 1.1, r: 0.34 },
    { y: height * 0.79, xo: 1.8, r: 0.32 },
  ].map((r) => ({ ...r, y: r.y + pr() * 1.5 }));

  const slots = 20;                       // course subdivisions along z
  const slotLen = secLen / slots;

  const buildSection = (variant) => () => {
    const s = new THREE.Group();
    const rand = rng(seed * 5077 + variant * 977 + 3);
    const z0 = -secLen / 2;
    const alcoveSlot = variant % 2 === 0 ? 4 + Math.floor(rand() * 12) : -1;

    for (const sx of [-1, 1]) {
      const X = sx * hx;

      /* backing wall */
      const back = flat(4, height, secLen, hullB);
      back.position.set(X + sx * 2, height / 2, 0);
      s.add(back);

      /* stepped courses, segmented so alcoves can punch through them */
      courses.forEach((c, ci) => {
        for (let i = 0; i < slots; i++) {
          if (i === alcoveSlot || i === alcoveSlot + 1) continue;
          const z = z0 + (i + 0.5) * slotLen;
          const depthOut = 0.9 + c.out;
          const m = flat(depthOut, c.h, slotLen, ci % 2 ? hullA : hullC);
          m.position.set(X - sx * depthOut / 2, c.y + c.h / 2, z);
          s.add(m);
        }
        // course lip, with a hard shadow gap under it so the step reads
        const lip = flat(1.3 + c.out, 0.55, secLen, ci % 2 ? hullC : hullA);
        lip.position.set(X - sx * (1.3 + c.out) / 2, c.y + c.h + 0.2, 0);
        s.add(lip);
        const gap = flat(0.5 + c.out, 0.75, secLen, shadowMat);
        gap.position.set(X - sx * (0.25 + c.out / 2), c.y - 0.3, 0);
        s.add(gap);
      });

      /* deep vertical service channels: strong dark verticals for rhythm */
      for (let i = 0; i < 2; i++) {
        const z = z0 + secLen * (0.22 + i * 0.46) + rand() * 6;
        if (alcoveSlot >= 0 && Math.abs(z - (z0 + (alcoveSlot + 1) * slotLen)) < 8) continue;
        s.add(at(flat(1.6, height - 6, 3.6, shadowMat), X + sx * 0.7, (height - 6) / 2 + 2, z));
        for (let k = 0; k < 9; k++) {
          s.add(at(flat(1.2, 0.6, 3.0, k % 3 === 0 ? metal : deep),
            X + sx * 0.2, 3 + k * (height - 8) / 9, z));
        }
        s.add(at(blk(1.0, height - 5, 4.6, hullA), X - sx * 0.5, (height - 5) / 2 + 2, z));
      }

      /* vertical pilasters, bevelled: they carry the silhouette */
      for (let i = 0; i < 5; i++) {
        const z = z0 + (i + 0.5) * (secLen / 5);
        if (Math.abs(z - (z0 + (alcoveSlot + 1) * slotLen)) < slotLen * 1.4) continue;
        s.add(at(blk(3.4, height - 2, 3.2, hullA), X - sx * 1.7, (height - 2) / 2 + 1, z));
        s.add(at(blk(4.0, 1.0, 3.8, hullC), X - sx * 2.0, height - 1.2, z));
        s.add(at(flat(0.9, 3.0, 2.2, deep), X - sx * 3.6, height * 0.45, z));
      }

      /* horizontal ribs between courses */
      for (let i = 0; i < 28; i++) {
        const z = z0 + 0.9 + i * (secLen - 1.8) / 27;
        const c = courses[(i + variant) % courses.length];
        s.add(at(flat(0.6, c.h * 0.8, 0.55, shadowMat), X - sx * (1.0 + c.out), c.y + c.h / 2, z));
      }

      /* pipe runs, continuous across sections */
      runs.forEach((r, k) => {
        const p = pipeMesh(r.r, secLen, k % 2 ? metal : hullC, 10);
        p.rotation.x = Math.PI / 2;
        p.position.set(X - sx * r.xo, r.y, -secLen / 2);
        s.add(p);
        for (let i = 0; i < 4; i++) {
          s.add(at(flat(r.r * 3.4, r.r * 3.4, 1.0, deep),
            X - sx * r.xo, r.y, z0 + (i + 0.5) * (secLen / 4)));
        }
      });

      /* recessed hatches */
      for (let i = 0; i < 7; i++) {
        const z = z0 + 2 + rand() * (secLen - 4);
        const y = 3 + rand() * (height - 10);
        const w2 = 2.6 + rand() * 4.4, h2 = 2.2 + rand() * 3.6;
        s.add(at(flat(0.7, h2, w2, deep), X - sx * 0.35, y, z));
        s.add(at(blk(0.5, h2 + 0.7, w2 + 0.7, hullC), X - sx * 1.0, y, z));
        if (rand() < 0.5) {
          s.add(at(flat(0.35, h2 * 0.3, w2 * 0.6, metal), X - sx * 1.35, y, z));
        }
      }

      /* fine greeble: cheap 12-triangle boxes, lots of them */
      for (let i = 0; i < 130; i++) {
        const z = z0 + rand() * secLen;
        const y = 1.2 + Math.pow(rand(), 0.8) * (height - 3);
        const c = courses[Math.min(courses.length - 1, Math.floor(rand() * courses.length))];
        const out = 1.0 + c.out + rand() * 1.4;
        const w2 = 0.4 + rand() * 2.2, h2 = 0.4 + rand() * 2.0;
        const r3 = rand();
        const gm = r3 < 0.24 ? shadowMat : r3 < 0.48 ? deep : r3 < 0.72 ? hullA : hullC;
        s.add(at(flat(0.3 + rand() * 0.9, h2, w2, gm), X - sx * out, y, z));
      }

      /* blinking lights */
      for (let i = 0; i < 9; i++) {
        const z = z0 + 1 + rand() * (secLen - 2);
        const y = 2.5 + rand() * (height - 6);
        const bank = lampMats[Math.floor(rand() * 3)];
        s.add(at(flat(0.34, 0.5, 0.5, bank), X - sx * 2.9, y, z));
      }

      /* brackets reaching well into the channel: the closest thing to the
         camera on a run, so they are what actually sells the speed */
      for (let i = 0; i < 3; i++) {
        const z = z0 + secLen * (0.16 + i * 0.34) + rand() * 8;
        if (alcoveSlot >= 0 && Math.abs(z - (z0 + (alcoveSlot + 1) * slotLen)) < 10) continue;
        const reach = 4.5 + rand() * 2.5;
        const y = 6 + rand() * (height - 14);
        s.add(at(flat(reach, 1.1, 1.5, hullC), X - sx * reach / 2, y, z));
        s.add(at(flat(1.3, 2.6, 2.2, hullA), X - sx * reach, y - 0.2, z));
        s.add(at(rot(flat(3.2, 0.9, 1.1, deep), 0, 0, sx * 0.7), X - sx * reach * 0.55, y - 1.9, z));
        s.add(at(flat(0.6, 0.6, 0.6, lampMats[i % 3]), X - sx * (reach + 0.2), y + 1.2, z));
      }

      /* top rim: ledge, kerb and railing posts */
      s.add(at(blk(6, 1.2, secLen, hullC), X + sx * 1.4, height - 0.6, 0));
      s.add(at(blk(1.1, 1.4, secLen, hullA), X - sx * 0.55, height + 0.7, 0));
      for (let i = 0; i < 10; i++) {
        const z = z0 + (i + 0.5) * (secLen / 10);
        s.add(at(flat(0.4, 1.6, 0.4, metal), X + sx * 3.4, height + 0.8, z));
      }
      const rail = pipeMesh(0.2, secLen, metal, 6);
      rail.rotation.x = Math.PI / 2;
      rail.position.set(X + sx * 3.4, height + 1.6, -secLen / 2);
      s.add(rail);

      /* turret emplacement in the alcove */
      if (alcoveSlot >= 0) {
        const az = z0 + (alcoveSlot + 1) * slotLen;
        s.add(at(flat(1.2, height * 0.42, slotLen * 2, shadowMat), X + sx * 0.6, height * 0.44, az));
        s.add(at(blk(2.2, 1.2, slotLen * 2.2, hullC), X - sx * 0.4, height * 0.2, az));
        s.add(at(blk(2.2, 1.2, slotLen * 2.2, hullC), X - sx * 0.4, height * 0.66, az));
        const tur = new THREE.Group();
        tur.position.set(X + sx * 0.4, height * 0.32, az);
        tur.add(at(cyl(1.5, 1.4, { color: 0x6f757c, seg: 12 }), 0, 0, 0));
        const ball = sphere(1.5, { color: 0x8d939a, seg: 12 });
        ball.position.y = 1.2;
        tur.add(ball);
        for (const b of [-0.6, 0.6]) {
          const bar2 = pipeMesh(0.24, 5.2, metal, 8);
          bar2.rotation.z = sx > 0 ? Math.PI / 2 : -Math.PI / 2;
          bar2.position.set(0, 2.0, b);
          tur.add(bar2);
        }
        tur.add(at(flat(0.5, 0.4, 0.4, lampMats[0]), -sx * 1.2, 2.6, 0));
        s.add(tur);
      }
    }

    /* ---- floor ---- */
    s.add(at(flat(width, 0.6, secLen, floorMat), 0, 0.3, 0));
    for (let i = 0; i < 4; i++) {
      s.add(at(flat(width, 0.66, 0.5, deep), 0, 0.33, z0 + (i + 0.5) * (secLen / 4)));
    }
    for (const sx of [-1, 1]) {
      s.add(at(blk(3.4, 0.8, secLen, hullC), sx * (hx - 1.7), 0.4, 0));
      s.add(at(flat(1.0, 1.1, secLen, deep), sx * (hx - 3.8), 0.55, 0));
      for (let i = 0; i < 24; i++) {
        const z = z0 + rand() * secLen;
        s.add(at(flat(0.5 + rand() * 1.6, 0.3 + rand() * 1.1, 0.5 + rand() * 1.6,
          rand() < 0.4 ? deep : hullA), sx * (hx - 2.2 - rand() * 3), 0.6, z));
      }
    }
    // centre conduit with lit segments
    s.add(at(flat(2.6, 0.8, secLen, deep), 0, 0.4, 0));
    for (let i = 0; i < 10; i++) {
      s.add(at(flat(1.1, 0.3, 3.2, lampMats[1]), 0, 0.85, z0 + (i + 0.5) * (secLen / 10)));
    }
    for (let i = 0; i < 20; i++) {
      s.add(at(flat(2.9, 0.5, 0.5, hullC), 0, 0.75, z0 + (i + 0.5) * (secLen / 20)));
    }
    return s;
  };

  const templates = [];
  for (let v = 0; v < variants; v++) templates.push(bakedTemplate(buildSection(v)));
  const order = rng(seed * 29 + 5);
  for (let i = 0; i < sections; i++) {
    const sec = templates[Math.floor(order() * variants) % variants]();
    sec.position.z = -(i + 0.5) * secLen;
    g.add(sec);
  }

  /* ---- the exhaust port, in a recess at the far end ---- */
  const port = new THREE.Group();
  port.name = 'exhaustPort';
  port.position.set(0, 0, -realLen + secLen * 0.55);
  {
    const wellR = 4.2, wellD = 3.4;
    const stat = new THREE.Group();
    // sunken square housing around the port
    for (const sx of [-1, 1]) {
      stat.add(at(blk(2.2, 1.6, 15, hullC), sx * 7.4, 0.8, 0));
      stat.add(at(blk(15, 1.6, 2.2, hullC), 0, 0.8, sx * 7.4));
      stat.add(at(flat(1.0, 2.6, 4.0, deep), sx * 6.2, 1.3, 0));
      // aiming fins, so the shot has something to line up on
      stat.add(at(blk(1.2, 5.5, 2.6, metal), sx * 9.2, 2.75, 0));
      stat.add(at(flat(0.8, 0.6, 2.0, lampMats[0]), sx * 9.2, 5.2, 0));
    }
    stat.add(at(flat(16, 0.7, 16, deep), 0, 0.35, 0));
    // the well: a real recess with walls and a floor
    const wellGeo = rawGeo('portwell', () => {
      const c = norm(new THREE.CylinderGeometry(wellR, wellR * 0.86, wellD, 28, 1, true));
      c.translate(0, -wellD / 2, 0);
      return c;
    });
    const wellWall = new THREE.Mesh(wellGeo, mat(0x3c4247, { rough: 0.7, side: THREE.DoubleSide }));
    wellWall.position.y = 0.7;
    stat.add(wellWall);
    const rimGeo = rawGeo('portrim', () => norm(new THREE.TorusGeometry(wellR, 0.55, 8, 32)));
    const rim = new THREE.Mesh(rimGeo, metal);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.7;
    stat.add(rim);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU;
      stat.add(at(rot(flat(1.5, 0.7, 0.9, hullA), 0, -a, 0),
        Math.cos(a) * (wellR + 0.9), 0.9, Math.sin(a) * (wellR + 0.9)));
    }
    port.add(bake(stat));

    // the glowing throat
    const throat = new THREE.Mesh(
      rawGeo('portdisc', () => norm(new THREE.CircleGeometry(1, 28))),
      fx(0xff7a2a, 0.9),
    );
    throat.rotation.x = -Math.PI / 2;
    throat.scale.setScalar(wellR * 0.84);
    throat.position.y = 0.7 - wellD + 0.05;
    keep(throat);
    port.add(throat);
    const haze = new THREE.Mesh(
      rawGeo('portdisc', () => norm(new THREE.CircleGeometry(1, 28))),
      fx(0xffb066, 0.35),
    );
    haze.rotation.x = -Math.PI / 2;
    haze.scale.setScalar(wellR * 1.5);
    haze.position.y = 0.75;
    keep(haze);
    port.add(haze);
    const col = spriteFx(wellR * 3.2, dotTex(0.1, 'soft'), 0xffa04a, 0.28);
    col.position.y = wellR * 0.9;
    port.add(col);
    port.userData.glow = throat;
    port.userData.haze = haze;
    port.userData.radius = wellR;
    port.userData.depth = wellD;
  }
  g.add(port);

  /* ---- collect the merged light meshes ---- */
  const wallLights = [];
  g.traverse((o) => {
    if (o.isMesh && lampMats.includes(o.material)) wallLights.push(o);
  });

  g.userData.length = realLen;
  g.userData.width = width;
  g.userData.height = height;
  g.userData.secLen = secLen;
  g.userData.sections = sections;
  g.userData.exhaustPort = port;
  g.userData.wallLights = wallLights;
  g.userData.lightBanks = lampMats;
  g.userData.cameraY = height * 0.26;
  g.userData.update = (t) => {
    const phases = [0, 2.2, 4.1];
    lampMats.forEach((m, i) => {
      const k = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(t * (2.6 + i * 0.7) + phases[i]));
      const base = [[1, 0.37, 0.24], [0.56, 0.88, 1], [1, 0.82, 0.42]][i];
      m.color.setRGB(base[0] * k, base[1] * k, base[2] * k);
    });
    const p = 0.72 + 0.28 * Math.sin(t * 3.1);
    port.userData.glow.material.opacity = 0.65 + 0.3 * p;
    port.userData.haze.material.opacity = 0.2 + 0.2 * p;
  };
  return g;
}

/**
 * The armoured plain above the trench, for the dive-in shot.
 *
 * Anchor: top surface at `y = 0`, centred on X/Z. Set `slotWidth` to leave a
 * gap along the Z axis so the plate can straddle a `trench()` placed at
 * `y = -trench.userData.height`.
 *
 * @param {object} o {size, seed, slotWidth, density}
 * @returns {THREE.Group} userData: {size, slotWidth, lights, update(t)}
 */
export function stationSurface({ size = 900, seed = 131, slotWidth = 0, density = 1 } = {}) {
  const g = new THREE.Group();
  g.name = 'stationSurface';
  const rand = rng(seed * 617 + 3);
  const half = size / 2;
  const slotHalf = slotWidth / 2;

  // same plating language as the battle station hull, so a wide shot of the
  // sphere and a dive onto the deck read as the same object
  const panelTex = canvasTex('stationplate' + seed, 1024, 1024, (ctx, w, h) => {
    const r2 = rng(seed * 97 + 5);
    plateField(ctx, w, h, r2, {
      gap: 3,
      band: [34, 96],
      plate: [40, 165],
      tone: (t) => css(mix(0x74797f, 0xb3b8bd, t)),
      gapColor: css(0x4e545a),
      ventColor: css(0x3f4449),
    });
    // a couple of service walkways crossing the plating
    ctx.fillStyle = css(0x646a71);
    for (let i = 0; i < 2; i++) {
      const ww = 12 + r2() * 8;
      ctx.fillRect(r2() * w, 0, ww, h);
      ctx.fillRect(0, r2() * h, w, ww);
    }
  }, { repeat: [size / 150, size / 150] });

  const hullA = mat(0x9298a0, { rough: 0.62, metal: 0.2 });
  const hullB = mat(0x7d838b, { rough: 0.66, metal: 0.2 });
  const hullC = mat(0xa8aeb5, { rough: 0.58, metal: 0.22 });
  const deep = mat(0x4f555c, { rough: 0.72 });
  const metal = mat(0xb4bac0, { rough: 0.32, metal: 0.62 });
  const deckMat = mat(0xffffff, { map: panelTex, rough: 0.62, metal: 0.15 });
  const lampMat = new THREE.MeshBasicMaterial({ color: 0x8fe0ff, toneMapped: false });
  const ventMat = fx(0xff8a3c, 0.75);

  const stat = new THREE.Group();
  if (slotWidth > 0) {
    for (const sx of [-1, 1]) {
      const w2 = half - slotHalf;
      stat.add(at(flat(w2, 3, size, deckMat), sx * (slotHalf + w2 / 2), -1.5, 0));
      stat.add(at(blk(2.2, 1.6, size, hullC), sx * (slotHalf + 1.1), 0.2, 0));
    }
  } else {
    stat.add(at(flat(size, 3, size, deckMat), 0, -1.5, 0));
  }

  const inSlot = (x) => slotWidth > 0 && Math.abs(x) < slotHalf + 3;

  // districts of greeble, matched to the trench walls so the two read as one
  const nD = Math.round(size * size / 5200 * density);
  for (let i = 0; i < nD; i++) {
    const cx = (rand() - 0.5) * size * 0.97;
    const cz = (rand() - 0.5) * size * 0.97;
    if (inSlot(cx)) continue;
    const spread = 8 + rand() * 26;
    stat.add(at(flat(spread * 1.4, 0.7, spread * (0.7 + rand() * 0.8), deep), cx, 0.35, cz));
    const n = 4 + Math.round(rand() * 9);
    for (let k = 0; k < n; k++) {
      const x = cx + (rand() - 0.5) * spread * 1.3;
      const z = cz + (rand() - 0.5) * spread * 1.3;
      if (inSlot(x)) continue;
      const flatBlock = rand() < 0.55;
      const bh = flatBlock ? 0.8 + rand() * 2 : 3 + rand() * rand() * 20;
      const bw = 2.5 + rand() * 9, bd = 2.5 + rand() * 9;
      stat.add(at(rot(flat(bw, bh, bd, rand() < 0.3 ? hullB : (rand() < 0.5 ? hullA : hullC)),
        0, 0, 0), x, bh / 2 + 0.3, z));
      if (!flatBlock && rand() < 0.4) {
        stat.add(at(flat(bw * 0.6, 0.7, bd * 0.6, deep), x, bh + 0.6, z));
      }
      if (rand() < 0.14) {
        const p = pipeMesh(0.35 + rand() * 0.6, 3 + rand() * 12, metal, 8);
        p.position.set(x, bh + 0.3, z);
        stat.add(p);
      }
    }
    // trunk pipe leaving the district
    if (rand() < 0.5) {
      const len = 12 + rand() * 46;
      const p = pipeMesh(0.55, len, metal, 8);
      p.rotation.x = Math.PI / 2;
      p.position.set(cx, 1.4, cz - len / 2);
      stat.add(p);
    }
    if (rand() < 0.3) {
      stat.add(at(flat(1.0, 0.5, 1.0, lampMat), cx + spread * 0.5, 1.4, cz));
    }
  }

  // sensor towers for silhouette
  for (let i = 0; i < Math.round(16 * density); i++) {
    const x = (rand() - 0.5) * size * 0.9, z = (rand() - 0.5) * size * 0.9;
    if (inSlot(x)) continue;
    const hgt = 14 + rand() * 34;
    stat.add(at(blk(4.5, hgt, 4.5, hullA), x, hgt / 2 + 0.3, z));
    stat.add(at(blk(8, 1.4, 8, hullC), x, hgt + 0.6, z));
    stat.add(at(pipeMesh(0.3, hgt * 0.4, metal, 6), x, hgt + 1.2, z));
    stat.add(at(flat(1.0, 0.6, 1.0, lampMat), x, hgt + 1.6, z));
  }

  // glowing exhaust vents
  const vents = [];
  for (let i = 0; i < Math.round(9 * density); i++) {
    const x = (rand() - 0.5) * size * 0.85, z = (rand() - 0.5) * size * 0.85;
    if (inSlot(x)) continue;
    const r = 3 + rand() * 6;
    const vring = new THREE.Mesh(rawGeo('ventring', () => {
      const t = norm(new THREE.TorusGeometry(1, 0.22, 6, 20));
      t.rotateX(Math.PI / 2);
      return t;
    }), hullC);
    vring.scale.setScalar(r);
    vring.position.set(x, 0.5, z);
    stat.add(vring);
    const disc = new THREE.Mesh(rawGeo('ventdisc', () => {
      const c = norm(new THREE.CircleGeometry(1, 20));
      c.rotateX(-Math.PI / 2);
      return c;
    }), ventMat);
    disc.scale.setScalar(r * 0.85);
    disc.position.set(x, 0.15, z);
    keep(disc);
    vents.push(disc);
  }

  g.add(bake(stat));
  vents.forEach((v) => g.add(v));

  g.userData.size = size;
  g.userData.slotWidth = slotWidth;
  g.userData.lights = [lampMat];
  g.userData.vents = vents;
  g.userData.update = (t) => {
    const k = 0.5 + 0.5 * Math.sin(t * 2.1);
    lampMat.color.setRGB(0.4 + 0.2 * k, 0.75 + 0.13 * k, 1);
    ventMat.opacity = 0.55 + 0.3 * Math.sin(t * 1.3 + 1);
  };
  return g;
}

/* =================================================================== */
/* EFFECTS                                                              */
/* =================================================================== */

/** Hot fireball core: white centre bleeding out to soot. */
function fireTex(seed = 5) {
  return canvasTex('fire' + seed, 256, 256, (ctx, w, h) => {
    const n = fbm(seed * 29 + 3, { octaves: 5, base: 4, gain: 0.58 });
    const n2 = fbm(seed * 71 + 11, { octaves: 4, base: 9, gain: 0.55, ridged: true });
    pixels(ctx, w, h, (u, v) => {
      const dx = u - 0.5, dy = v - 0.5;
      const r = Math.sqrt(dx * dx + dy * dy) * 2;
      const lump = n(u, v) * 0.7 + n2(u, v) * 0.4;
      const rr = clamp(r * (0.72 + lump * 0.5), 0, 1.4);
      const a = Math.pow(smoothclamp(1.05 - rr), 1.25);
      const hot = Math.pow(clamp(1.2 - rr * 1.5, 0, 1), 1.4);
      return [
        Math.round(lerp(190, 255, hot)),
        Math.round(lerp(78, 246, hot)),
        Math.round(lerp(24, 196, hot)),
        Math.round(a * 255),
      ];
    });
  }, { wrapS: THREE.ClampToEdgeWrapping, wrapT: THREE.ClampToEdgeWrapping });
}

/**
 * Flat expanding shock ring, brightest at its rim. `thin` gives a narrow
 * annulus with a fully clear core — a tilted ring needs that, or it reads as a
 * grey soap bubble sitting over the fireball instead of a shock front.
 */
function ringTex(thin = false) {
  return canvasTex('shockring' + (thin ? 'T' : ''), 256, 256, (ctx, w) => {
    const c = w / 2;
    const g = ctx.createRadialGradient(c, c, 0, c, c, c);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    if (thin) {
      g.addColorStop(0.8, 'rgba(255,214,150,0)');
      g.addColorStop(0.9, 'rgba(255,240,205,0.9)');
      g.addColorStop(0.96, 'rgba(255,255,255,1)');
    } else {
      g.addColorStop(0.62, 'rgba(255,214,150,0.04)');
      g.addColorStop(0.85, 'rgba(255,236,200,0.8)');
      g.addColorStop(0.95, 'rgba(255,255,255,0.95)');
    }
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, w);
  }, { wrapS: THREE.ClampToEdgeWrapping, wrapT: THREE.ClampToEdgeWrapping });
}

/** Soot puff for smoke. */
function smokeTex(seed = 9) {
  return canvasTex('smoke' + seed, 256, 256, (ctx, w, h) => {
    const n = fbm(seed * 37 + 7, { octaves: 5, base: 4, gain: 0.6 });
    pixels(ctx, w, h, (u, v) => {
      const dx = u - 0.5, dy = v - 0.5;
      const r = Math.sqrt(dx * dx + dy * dy) * 2;
      const lump = n(u, v);
      const a = Math.pow(smoothclamp(1.02 - r * (0.75 + lump * 0.55)), 1.5) * (0.45 + lump * 0.75);
      // smoke sprites are unlit, so the texture carries its own value range;
      // tint the material down for soot rather than darkening this
      const g2 = Math.round(lerp(150, 245, lump));
      return [g2, Math.round(g2 * 0.96), Math.round(g2 * 0.92), Math.round(clamp(a, 0, 1) * 255)];
    });
  }, { wrapS: THREE.ClampToEdgeWrapping, wrapT: THREE.ClampToEdgeWrapping });
}

/**
 * A LEGO explosion: expanding fireball shell, additive shock ring, soot puffs
 * and — the important part — **actual bricks** thrown outward.
 *
 * Anchor: the blast centre is the group origin, so drop it wherever the hit is.
 * Drive the whole life cycle with `userData.setT(0..1)`; 0 is the instant of
 * detonation, 1 is cold and gone. Nothing here is baked.
 *
 * @param {object} o {size, seed, shards, gravity, spread}
 * @returns {THREE.Group} userData: {size, setT(0..1), t, shards, update(t)}
 */
export function explosionBurst({
  size = 10, seed = 7, shards = 26, gravity = 0, spread = 1,
  colors = [C.lightGray, C.veryLightGray, C.darkGray, C.red, C.orange, C.bluishGray],
} = {}) {
  const g = new THREE.Group();
  g.name = 'explosionBurst';
  const rand = rng(seed * 199 + 13);

  /* ---- fireball core: two nested shells, kept inside the lobe cluster ---- */
  // These carry the hot body only. A textured sphere seen from outside averages
  // its front and back faces and always reads smooth, so it must never be the
  // widest thing here or the whole blast looks like a beach ball.
  const shells = [];
  for (let i = 0; i < 2; i++) {
    const m = new THREE.Mesh(
      rawGeo('fbsph', () => norm(new THREE.SphereGeometry(1, 20, 14))),
      fx(i === 0 ? 0xffffff : 0xffb43c, 1, { map: fireTex(seed + i) }),
    );
    m.material.side = THREE.DoubleSide;
    m.rotation.set(rand() * TAU, rand() * TAU, rand() * TAU);
    keep(m);
    shells.push(m);
    g.add(m);
  }
  const flash = spriteFx(size * 3, dotTex(0.12, 'soft'), 0xfff0c0, 1);
  g.add(flash);
  const core = spriteFx(size * 1.2, dotTex(0.5, 'core'), 0xffffff, 1);
  g.add(core);

  /* ---- flame lobes: these define the silhouette ---- */
  // Small blobs pushed far out and big blobs held near the middle, so the
  // outline is genuinely lumpy instead of a smooth disc of overlapping sprites.
  const lobes = [];
  for (let i = 0; i < 14; i++) {
    const out = rand();
    const s = spriteFx(size, fireTex(seed + 11 + (i % 7) * 3), out < 0.4 ? 0xffd9a0 : 0xff8a3c, 1);
    const a = rand() * TAU, e = Math.asin(rand() * 2 - 1);
    s.userData.dir = new THREE.Vector3(Math.cos(a) * Math.cos(e), Math.sin(e) * 0.85, Math.sin(a) * Math.cos(e));
    s.userData.reach = 0.25 + out * 1.15;
    s.userData.sz = lerp(1.05, 0.5, out) * (0.8 + rand() * 0.4);
    s.userData.life = 0.34 + rand() * 0.22;
    s.userData.spin = (rand() - 0.5) * 1.6;
    lobes.push(s);
    g.add(s);
  }

  /* ---- shock ring ---- */
  const ring1 = new THREE.Mesh(
    rawGeo('quad', () => new THREE.PlaneGeometry(1, 1)),
    fx(0xffe0a8, 1, { map: ringTex() }),
  );
  ring1.rotation.x = -Math.PI / 2;
  keep(ring1);
  g.add(ring1);
  const ring2 = new THREE.Mesh(ring1.geometry, fx(0xffffff, 1, { map: ringTex(true) }));
  ring2.rotation.set(1.15, rand() * TAU, 0.4);
  keep(ring2);
  g.add(ring2);

  /* ---- soot ---- */
  const puffs = [];
  for (let i = 0; i < 7; i++) {
    const s = spriteFx(size, smokeTex(seed + i * 3), 0x8d8781, 0.9);
    s.material.blending = THREE.NormalBlending;
    const a = rand() * TAU, e = (rand() - 0.5) * 1.4;
    s.userData.dir = new THREE.Vector3(Math.cos(a) * Math.cos(e), Math.sin(e) + 0.25, Math.sin(a) * Math.cos(e));
    s.userData.rate = 0.5 + rand() * 0.9;
    s.userData.spin = (rand() - 0.5) * 2.2;
    puffs.push(s);
    g.add(s);
  }

  /* ---- brick shrapnel ---- */
  const shardList = [];
  for (let i = 0; i < shards; i++) {
    const w = 1 + Math.round(rand() * 2);
    const d = 1 + Math.round(rand() * 2);
    const col = colors[Math.floor(rand() * colors.length)];
    const p = rand() < 0.5
      ? plate(w, d, { color: col })
      : (rand() < 0.7 ? brick(w, d, BRICK, { color: col }) : tile(w, d, PLATE, { color: col }));
    const sc = size / 12;
    p.scale.setScalar(sc);
    const a = rand() * TAU;
    const e = Math.asin(rand() * 2 - 1);
    // fast enough that the bricks outrun the fireball well before it fades —
    // the shrapnel is the joke, so it has to end up outside the flames
    const speed = size * (1.7 + rand() * 3.1) * spread;
    p.userData.vel = new THREE.Vector3(
      Math.cos(a) * Math.cos(e) * speed,
      Math.sin(e) * speed * 0.8 + size * 0.5,
      Math.sin(a) * Math.cos(e) * speed,
    );
    p.userData.spin = new THREE.Vector3((rand() - 0.5) * 22, (rand() - 0.5) * 22, (rand() - 0.5) * 22);
    p.userData.sc = sc;
    keep(p);
    shardList.push(p);
    g.add(p);
  }

  let tNow = 0;
  const setT = (u) => {
    tNow = clamp(u, 0, 1);
    const t = tNow;
    // fireball: fast punch out, then collapse into soot
    const grow = Math.pow(smoothclamp(t / 0.42), 0.55);
    shells.forEach((m, i) => {
      m.scale.setScalar(size * (0.16 + grow * (0.78 + i * 0.3)));
      // fully out by t=0.5 — a lingering additive shell reads as a flat brown
      // ball once its opacity drops, which is worse than no fireball at all
      const fade = clamp(1 - (t - 0.08 - i * 0.03) / (0.27 + i * 0.06), 0, 1);
      m.material.opacity = Math.pow(fade, 1.4) * (i === 0 ? 1 : 0.8);
      m.visible = m.material.opacity > 0.01;
    });
    lobes.forEach((s, i) => {
      const d = s.userData.dir;
      const dist = size * grow * 1.45 * s.userData.reach;
      s.position.set(d.x * dist, d.y * dist, d.z * dist);
      s.scale.setScalar(size * (0.3 + grow * 1.0) * s.userData.sz);
      // hold full brightness through the punch-out, then fall at its own rate
      s.material.opacity = Math.pow(clamp(1 - (t - 0.2 - i * 0.012) / s.userData.life, 0, 1), 1.25);
      s.material.rotation = s.userData.spin * t;
      s.visible = s.material.opacity > 0.01;
    });

    const fl = Math.pow(clamp(1 - t / 0.2, 0, 1), 1.6);
    flash.material.opacity = fl;
    flash.scale.setScalar(size * (2 + t * 9));
    core.material.opacity = Math.pow(clamp(1 - t / 0.12, 0, 1), 1.2);
    core.scale.setScalar(size * (0.7 + t * 3));

    const rs = size * (0.4 + Math.pow(t, 0.55) * 7.5);
    ring1.scale.set(rs, rs, 1);
    ring1.material.opacity = Math.pow(clamp(1 - t / 0.55, 0, 1), 1.5) * 0.9;
    ring1.visible = ring1.material.opacity > 0.03;
    // deliberately short and tight: a wide faint ring is just a grey hoop
    const rs2 = size * (0.3 + Math.pow(t, 0.5) * 3.2);
    ring2.scale.set(rs2, rs2, 1);
    ring2.material.opacity = Math.pow(clamp(1 - t / 0.18, 0, 1), 1.3);
    ring2.visible = ring2.material.opacity > 0.05;

    // Soot is opaque, so it starts out at the fireball's rim and moves outward
    // from there. Spawning it at the origin paints grey over the hot core and
    // kills the blast. It also holds off until the flames are past their peak.
    puffs.forEach((s, i) => {
      const st = clamp((t - 0.3 - i * 0.03) / 0.68, 0, 1);
      const d = s.userData.dir;
      const dist = size * (0.95 + st * 2.1) * s.userData.rate;
      s.position.set(d.x * dist, d.y * dist, d.z * dist);
      s.scale.setScalar(size * (0.35 + st * 1.3) * s.userData.rate);
      s.material.opacity = smoothclamp(st / 0.5) * Math.pow(clamp(1 - (st - 0.4) / 0.6, 0, 1), 1.3) * 0.8;
      s.material.rotation = s.userData.spin * st;
      s.visible = s.material.opacity > 0.01;
    });

    // bricks fly, tumble, then drop out of frame
    const life = t * 1.0;
    shardList.forEach((p) => {
      const v = p.userData.vel;
      const drag = 1 - Math.exp(-life * 2.6);
      p.position.set(
        v.x * drag * 0.95,
        v.y * drag * 0.95 - 0.5 * gravity * life * life,
        v.z * drag * 0.95,
      );
      p.rotation.set(p.userData.spin.x * life, p.userData.spin.y * life, p.userData.spin.z * life);
      const fade = clamp(1 - (t - 0.74) / 0.26, 0, 1);
      p.scale.setScalar(p.userData.sc * fade);
      p.visible = fade > 0.02;
    });
    return g;
  };
  setT(0);

  g.userData.size = size;
  g.userData.shards = shardList;
  g.userData.shells = shells;
  g.userData.noBake = true;
  /** 0 = detonation, 1 = burnt out. Drive this from your shot clock. */
  g.userData.setT = setT;
  Object.defineProperty(g.userData, 't', { get: () => tNow });
  /** Convenience: seconds -> normalised life over `dur`. */
  g.userData.update = (t, dur = 1.4) => setT((t % dur) / dur);
  return g;
}

/**
 * A puff of smoke that expands, drifts up and thins out.
 * Anchor: origin. `userData.setT(0..1)`.
 *
 * @param {object} o {size, seed, count, rise, color}
 */
export function smokePuff({ size = 6, seed = 12, count = 5, rise = 1, color = 0xb0a89e } = {}) {
  const g = new THREE.Group();
  g.name = 'smokePuff';
  const rand = rng(seed * 89 + 5);
  const parts = [];
  for (let i = 0; i < count; i++) {
    const s = spriteFx(size, smokeTex(seed + i * 5), color, 0.85);
    s.material.blending = THREE.NormalBlending;
    const a = rand() * TAU;
    s.userData.off = new THREE.Vector3(Math.cos(a) * (0.2 + rand() * 0.6), rand() * 0.4, Math.sin(a) * (0.2 + rand() * 0.6));
    s.userData.rate = 0.6 + rand() * 0.8;
    s.userData.spin = (rand() - 0.5) * 1.6;
    s.userData.delay = i * 0.05;
    parts.push(s);
    g.add(s);
  }
  let tNow = 0;
  const setT = (u) => {
    tNow = clamp(u, 0, 1);
    parts.forEach((s) => {
      const t = clamp((tNow - s.userData.delay) / (1 - s.userData.delay), 0, 1);
      const d = s.userData.off;
      s.position.set(d.x * size * t * 1.6, (d.y + t * 2.6 * rise) * size * 0.6, d.z * size * t * 1.6);
      s.scale.setScalar(size * (0.35 + t * 1.5) * s.userData.rate);
      s.material.opacity = smoothclamp(t / 0.16) * Math.pow(clamp(1 - t, 0, 1), 1.5) * 0.75;
      s.material.rotation = s.userData.spin * t;
      s.visible = s.material.opacity > 0.01;
    });
    return g;
  };
  setT(0);
  g.userData.size = size;
  g.userData.noBake = true;
  g.userData.setT = setT;
  Object.defineProperty(g.userData, 't', { get: () => tNow });
  g.userData.update = (t, dur = 2.4) => setT((t % dur) / dur);
  return g;
}

/**
 * Spark burst: hot streaks flung out of a hit, plus a fading ember cloud.
 * Anchor: origin. `userData.setT(0..1)`.
 *
 * @param {object} o {count, color, seed, size, gravity, cone, dir}
 */
export function sparkBurst({
  count = 90, color = 0xffc46a, seed = 15, size = 6, gravity = 14, cone = 1,
  dir = null,
} = {}) {
  const g = new THREE.Group();
  g.name = 'sparkBurst';
  const rand = rng(seed * 331 + 7);
  const axis = dir ? new THREE.Vector3().copy(dir).normalize() : null;

  const vel = [];
  for (let i = 0; i < count; i++) {
    let v;
    if (axis) {
      // cone around a direction, for ricochets off a surface
      const a = rand() * TAU;
      const s = Math.tan(clamp(cone, 0.02, 1.4) * 0.9) * Math.pow(rand(), 0.6);
      const t1 = new THREE.Vector3(0, 1, 0).cross(axis);
      if (t1.lengthSq() < 1e-4) t1.set(1, 0, 0);
      t1.normalize();
      const t2 = new THREE.Vector3().crossVectors(axis, t1);
      v = axis.clone().addScaledVector(t1, Math.cos(a) * s).addScaledVector(t2, Math.sin(a) * s).normalize();
    } else {
      const a = rand() * TAU, e = Math.asin(rand() * 2 - 1);
      v = new THREE.Vector3(Math.cos(a) * Math.cos(e), Math.sin(e), Math.sin(a) * Math.cos(e));
    }
    vel.push(v.multiplyScalar(size * (0.8 + rand() * 2.6)));
  }

  const pos = new Float32Array(count * 6);
  const col = new Float32Array(count * 6);
  const base = new THREE.Color(color);
  for (let i = 0; i < count; i++) {
    const hot = base.clone().lerp(new THREE.Color(0xffffff), rand() * 0.6);
    for (let k = 0; k < 2; k++) {
      const j = (i * 2 + k) * 3;
      const f = k === 0 ? 1 : 0.08;
      col[j] = hot.r * f; col[j + 1] = hot.g * f; col[j + 2] = hot.b * f;
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const lineMat = new THREE.LineBasicMaterial({
    vertexColors: true, transparent: true, opacity: 1,
    blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
  });
  const streaks = new THREE.LineSegments(geo, lineMat);
  streaks.frustumCulled = false;
  keep(streaks);
  g.add(streaks);

  const emberGeo = new THREE.BufferGeometry();
  emberGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  const emberMat = new THREE.PointsMaterial({
    size: 5, sizeAttenuation: false, map: dotTex(0.35, 'star'), color,
    transparent: true, opacity: 1, blending: THREE.AdditiveBlending,
    depthWrite: false, toneMapped: false,
  });
  const embers = new THREE.Points(emberGeo, emberMat);
  embers.frustumCulled = false;
  keep(embers);
  g.add(embers);

  const flash = spriteFx(size * 1.6, dotTex(0.1, 'soft'), color, 1);
  g.add(flash);

  let tNow = 0;
  const setT = (u) => {
    tNow = clamp(u, 0, 1);
    const t = tNow;
    const p = geo.attributes.position.array;
    const e = emberGeo.attributes.position.array;
    for (let i = 0; i < count; i++) {
      const v = vel[i];
      const drag = 1 - Math.exp(-t * 3.4);
      const x = v.x * drag * 0.42;
      const y = v.y * drag * 0.42 - 0.5 * gravity * t * t;
      const z = v.z * drag * 0.42;
      // WebGL will not widen a line, so length is the only way a streak reads:
      // keep the tail long while the spark is hot
      const tail = 0.13 * (1 - t * 0.55);
      const j = i * 6;
      p[j] = x; p[j + 1] = y; p[j + 2] = z;
      p[j + 3] = x - v.x * tail; p[j + 4] = y - v.y * tail; p[j + 5] = z - v.z * tail;
      e[i * 3] = x; e[i * 3 + 1] = y; e[i * 3 + 2] = z;
    }
    geo.attributes.position.needsUpdate = true;
    emberGeo.attributes.position.needsUpdate = true;
    geo.computeBoundingSphere();
    lineMat.opacity = Math.pow(clamp(1 - t / 0.85, 0, 1), 0.8);
    emberMat.opacity = Math.pow(clamp(1 - t, 0, 1), 1.4);
    emberMat.size = 5 * (1 - t * 0.55);
    flash.material.opacity = Math.pow(clamp(1 - t / 0.14, 0, 1), 1.5);
    flash.scale.setScalar(size * (1 + t * 3));
    return g;
  };
  setT(0);

  g.userData.noBake = true;
  g.userData.setT = setT;
  Object.defineProperty(g.userData, 't', { get: () => tNow });
  g.userData.update = (t, dur = 0.9) => setT((t % dur) / dur);
  return g;
}

/**
 * Bolt impact: a flat flash, radial spikes, a spreading ring and sparks.
 * Anchor: origin, the flash plane faces `+Z` — aim it with `lookAt()` along the
 * surface normal. `userData.setT(0..1)`.
 *
 * @param {object} o {color, size, seed}
 */
export function laserImpact({ color = 0xff3b1f, size = 3.4, seed = 19 } = {}) {
  const g = new THREE.Group();
  g.name = 'laserImpact';
  const hot = new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.55).getHex();

  const flash = spriteFx(size * 2.4, dotTex(0.06, 'soft'), color, 1);
  const coreS = spriteFx(size * 0.9, dotTex(0.55, 'core'), hot, 1);
  const star = spriteFx(size * 4.2, flareTex(), color, 1);
  const ring = new THREE.Mesh(
    rawGeo('quad', () => new THREE.PlaneGeometry(1, 1)),
    fx(color, 1, { map: ringTex() }),
  );
  keep(ring);
  g.add(flash, coreS, star, ring);

  const sparks = sparkBurst({
    count: 46, color: hot, seed: seed * 3 + 1, size: size * 1.5, gravity: 6, cone: 0.75,
    dir: new THREE.Vector3(0, 0, 1),
  });
  g.add(sparks);

  const scorch = new THREE.Mesh(
    rawGeo('quad', () => new THREE.PlaneGeometry(1, 1)),
    new THREE.MeshBasicMaterial({
      map: smokeTex(seed), color: 0x1d1512, transparent: true, opacity: 0,
      depthWrite: false, toneMapped: false,
    }),
  );
  scorch.scale.setScalar(size * 1.25);
  scorch.position.z = 0.01;
  keep(scorch);
  g.add(scorch);

  // all of these are depth-write-free transparents at almost the same depth, so
  // the sort order has to be stated: soot on the wall, fire in front of it
  scorch.renderOrder = 1;
  ring.renderOrder = 2;
  flash.renderOrder = 3;
  star.renderOrder = 4;
  coreS.renderOrder = 5;
  [flash, coreS, star].forEach((s) => { s.position.z = 0.06; });
  ring.position.z = 0.04;

  let tNow = 0;
  const setT = (u) => {
    tNow = clamp(u, 0, 1);
    const t = tNow;
    flash.material.opacity = Math.pow(clamp(1 - t / 0.5, 0, 1), 1.4);
    flash.scale.setScalar(size * (1.4 + t * 3.4));
    coreS.material.opacity = Math.pow(clamp(1 - t / 0.24, 0, 1), 1.2);
    coreS.scale.setScalar(size * (0.7 + t * 1.4));
    star.material.opacity = Math.pow(clamp(1 - t / 0.4, 0, 1), 1.6) * 0.9;
    star.scale.setScalar(size * (2.6 + t * 6));
    star.material.rotation = t * 1.2;
    const rs = size * (0.6 + Math.pow(t, 0.5) * 5);
    ring.scale.set(rs, rs, 1);
    ring.material.opacity = Math.pow(clamp(1 - t / 0.5, 0, 1), 1.5) * 0.8;
    scorch.material.opacity = smoothclamp(t / 0.3) * 0.45;
    sparks.userData.setT(clamp(t * 1.3, 0, 1));
    return g;
  };
  setT(0);

  g.userData.noBake = true;
  g.userData.size = size;
  g.userData.setT = setT;
  Object.defineProperty(g.userData, 't', { get: () => tNow });
  g.userData.update = (t, dur = 0.5) => setT((t % dur) / dur);
  return g;
}

/**
 * Engine plume. Anchor: the nozzle mouth is the origin and the trail runs along
 * **+Z** — models fly toward -Z, so parent this to an engine and leave it
 * unrotated. `userData.setThrottle(0..1)` scales length and brightness;
 * `userData.update(t)` adds the flicker.
 *
 * @param {object} o {color, length, radius, seed}
 */
export function engineTrail({ color = 0x7fd8ff, length = 14, radius = 0.8, seed = 23 } = {}) {
  const g = new THREE.Group();
  g.name = 'engineTrail';
  const hot = new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.62).getHex();

  // inner cone: the hot throat
  const inner = new THREE.Mesh(
    rawGeo('trailcone', () => {
      const c = norm(new THREE.ConeGeometry(1, 1, 16, 1, true));
      c.rotateX(Math.PI / 2);         // tip toward -Z, base at +Z
      c.translate(0, 0, 0.5);
      return c;
    }),
    fx(hot, 0.95),
  );
  inner.scale.set(radius * 0.62, radius * 0.62, length * 0.42);
  keep(inner);
  g.add(inner);

  const outer = new THREE.Mesh(inner.geometry, fx(color, 0.5));
  outer.scale.set(radius, radius, length);
  keep(outer);
  g.add(outer);

  // soft tapering trail, two crossed quads with a gradient
  const trailTex = canvasTex('trail', 64, 256, (ctx, w, h) => {
    const grd = ctx.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, 'rgba(255,255,255,0.95)');
    grd.addColorStop(0.18, 'rgba(255,255,255,0.5)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grd;
    for (let y = 0; y < h; y++) {
      const t = y / h;
      const ww = w * (1 - Math.pow(t, 0.75)) * 0.92;
      ctx.fillRect(w / 2 - ww / 2, y, ww, 1);
    }
  }, { wrapS: THREE.ClampToEdgeWrapping, wrapT: THREE.ClampToEdgeWrapping });
  const quads = [];
  for (let i = 0; i < 2; i++) {
    const q = new THREE.Mesh(rawGeo('quad', () => new THREE.PlaneGeometry(1, 1)), fx(color, 0.55, { map: trailTex }));
    // the quad's local +Y is its length; -90 deg about X lays that along +Z
    q.rotation.x = -Math.PI / 2;
    q.position.z = length / 2;
    q.scale.set(radius * 2.6, length, 1);
    keep(q);
    quads.push(q);
    // roll the second ribbon upright around the trail axis, which leaves its
    // length on +Z (a Z rotation cannot tip the Z axis over)
    const holder = new THREE.Group();
    holder.rotation.z = i * Math.PI / 2;
    holder.userData.noBake = true;
    holder.add(q);
    g.add(holder);
  }
  const glowS = spriteFx(radius * 5, dotTex(0.1, 'soft'), color, 0.7);
  g.add(glowS);
  const diskS = spriteFx(radius * 2.1, dotTex(0.55, 'core'), hot, 1);
  g.add(diskS);

  let throttle = 1, flick = 1;
  const apply = () => {
    const k = throttle * flick;
    inner.scale.set(radius * 0.62 * throttle, radius * 0.62 * throttle, length * 0.42 * k);
    outer.scale.set(radius * throttle, radius * throttle, length * k);
    quads.forEach((q) => {
      q.scale.set(radius * 2.6 * throttle, length * k, 1);
      q.position.z = length * k / 2;
      q.material.opacity = 0.5 * throttle;
    });
    inner.material.opacity = 0.95 * throttle;
    outer.material.opacity = 0.5 * throttle;
    glowS.scale.setScalar(radius * 5 * throttle * flick);
    glowS.material.opacity = 0.65 * throttle;
    diskS.scale.setScalar(radius * 2.1 * throttle);
    diskS.material.opacity = throttle;
    g.visible = throttle > 0.01;
  };
  apply();

  g.userData.length = length;
  g.userData.radius = radius;
  g.userData.noBake = true;
  /** 0 = engines out, 1 = full burn. */
  g.userData.setThrottle = (v) => { throttle = clamp(v, 0, 1); apply(); return g; };
  Object.defineProperty(g.userData, 'throttle', { get: () => throttle });
  g.userData.update = (t) => {
    flick = 0.9 + 0.1 * Math.sin(t * 41 + seed) + 0.05 * Math.sin(t * 17.3);
    apply();
  };
  return g;
}

/* =================================================================== */
/* preview harness hook                                                 */
/* =================================================================== */

/**
 * `preview.js` calls this if it exists, so every factory animates in the
 * turntable. It forwards the clock to `userData.update` and, as a convenience,
 * sweeps the common 0..1 setters from `?t=` (t <= 1 is used directly, larger
 * values wrap) — that is the whole reason `?t=0.4` shows a half-open blast door
 * or a mid-life explosion.
 */
export function update(obj, t) {
  const u = obj && obj.userData;
  if (!u) return;
  const p = t <= 1 ? Math.max(0, t) : t - Math.floor(t);
  let posed = false;
  for (const k of ['setStretch', 'setOpen', 'setT', 'setClamps']) {
    if (u[k]) { u[k](p); posed = true; }
  }
  // `update` would re-pose anything driven by a 0..1 setter on its own clock,
  // so it only runs for the things that have no setter (lights, flicker, drift)
  if (u.update && !posed) u.update(t);
}
