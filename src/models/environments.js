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
function boxMesh(w, h, d, material) {
  const g = rawGeo(`bx${w}|${h}|${d}`, () => {
    const b = norm(new THREE.BoxGeometry(w, h, d));
    b.translate(0, h / 2, 0);
    return b;
  });
  const m = new THREE.Mesh(g, material);
  m.castShadow = m.receiveShadow = true;
  return m;
}

/** Cheap open tube / pipe along Y, base at y = 0. */
function pipeMesh(r, h, material, seg = 10) {
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
export function nebula({ seed = 3, color = 0x5b3f9d, radius = 3400, count = 5, scale = 1 } = {}) {
  const g = new THREE.Group();
  g.name = 'nebula';
  const rand = rng(seed);
  const base = new THREE.Color(color);
  const clouds = [];
  for (let i = 0; i < count; i++) {
    const u = rand() * 1.3 - 0.65;
    const th = rand() * TAU;
    const s = Math.sqrt(Math.max(0.02, 1 - u * u));
    const rr = radius * lerp(0.6, 0.95, rand());
    const tint = base.clone()
      .offsetHSL((rand() - 0.5) * 0.16, (rand() - 0.5) * 0.25, (rand() - 0.5) * 0.12);
    const size = radius * lerp(0.55, 1.15, rand()) * scale;
    const m = billboard(size, fx(tint.getHex(), lerp(0.1, 0.26, rand()), {
      map: puffTex(seed * 7 + i * 13 + 1),
    }));
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
