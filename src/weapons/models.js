import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { getMaterialLib, tex, camoSet } from '../world/textures.js';
import { makeRNG } from '../core/math.js';

/**
 * Procedural weapon models. The first-person rifle is high-detail: chamfered
 * receiver, extruded 1913 rail with real angled teeth, curved ribbed PMAG,
 * A2 birdcage, lathe-turned Aimpoint T-2 style optic, and gloved hands with
 * fully articulated fingers that wrap the handguard / pistol grip.
 * Enemies carry a simplified AK. Forward = -Z.
 */

/* ------------------------------------------------------------------ */
/*  viewmodel texture pass: parkerized metal + stippled polymer        */
/* ------------------------------------------------------------------ */

function vmCanvas(size) {
  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  return c;
}

function vmNoise(freq, seed) {
  const r = makeRNG(seed);
  const g = freq;
  const grid = new Float32Array((g + 1) * (g + 1));
  for (let i = 0; i < grid.length; i++) grid[i] = r();
  const fade = (t) => t * t * (3 - 2 * t);
  return (u, v) => {
    const fx = ((u * g) % g + g) % g, fy = ((v * g) % g + g) % g;
    const x0 = Math.floor(fx), y0 = Math.floor(fy);
    const tx = fade(fx - x0), ty = fade(fy - y0);
    const a = grid[y0 * (g + 1) + x0], b = grid[y0 * (g + 1) + x0 + 1];
    const c = grid[(y0 + 1) * (g + 1) + x0], d = grid[(y0 + 1) * (g + 1) + x0 + 1];
    return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
  };
}

function vmFbm(baseFreq, octaves, seed) {
  const L = [];
  let f = baseFreq, amp = 1, tot = 0;
  for (let i = 0; i < octaves; i++) { L.push({ n: vmNoise(f, seed + i * 37), amp }); tot += amp; f *= 2; amp *= 0.5; }
  return (u, v) => { let s = 0; for (const l of L) s += l.n(u, v) * l.amp; return s / tot; };
}

function vmPaint(size, fn) {
  const c = vmCanvas(size);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  const d = img.data;
  for (let y = 0; y < size; y++) {
    const v = y / size;
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const [r, g, b] = fn(u, v);
      const i = (y * size + x) * 4;
      d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

function vmNormalFromHeight(size, heightFn, strength = 1.2) {
  const h = new Float32Array(size * size);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++)
      h[y * size + x] = heightFn(x / size, y / size);
  const c = vmCanvas(size);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  const d = img.data;
  const at = (x, y) => h[((y + size) % size) * size + ((x + size) % size)];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
      const inv = 1 / Math.sqrt(dx * dx + dy * dy + 1);
      const i = (y * size + x) * 4;
      d[i] = (-dx * inv * 0.5 + 0.5) * 255;
      d[i + 1] = (dy * inv * 0.5 + 0.5) * 255;
      d[i + 2] = inv * 255;
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

let VM_MATS = null;

function getVmMaterials() {
  if (VM_MATS) return VM_MATS;
  const S = 512;
  const rng = makeRNG(4409);

  /* --- parkerized metal: fbm speckle around #35383c, worn edges, scratches --- */
  const mottle = vmFbm(6, 4, 4401);
  const speck = vmFbm(48, 2, 4402);
  const wearN = vmFbm(9, 3, 4403);

  // Shared scratch strokes so albedo highlights match roughness shine.
  const scratches = [];
  for (let i = 0; i < 13; i++) {
    const a = rng() * Math.PI * 2;
    const len = (0.08 + rng() * 0.22) * S;
    scratches.push({
      x: rng() * S, y: rng() * S,
      dx: Math.cos(a) * len, dy: Math.sin(a) * len,
      w: 0.6 + rng() * 0.9, k: 0.10 + rng() * 0.12,
    });
  }
  const drawScratches = (ctx, rgb, alphaMul = 1) => {
    ctx.lineCap = 'round';
    for (const s of scratches) {
      ctx.strokeStyle = `rgba(${rgb},${(s.k * alphaMul).toFixed(3)})`;
      ctx.lineWidth = s.w;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      // slight bend so they read as drag marks, not vector lines
      ctx.quadraticCurveTo(s.x + s.dx * 0.5 + (rng() - 0.5) * 9, s.y + s.dy * 0.5 + (rng() - 0.5) * 9, s.x + s.dx, s.y + s.dy);
      ctx.stroke();
    }
  };

  const metalAlbedo = vmPaint(S, (u, v) => {
    // base #35383c with subtle fbm speckle; edge wear kept faint so close-up
    // receiver surfaces never read rusty/burnt at arm's length.
    const n = (mottle(u, v) - 0.5) * 0.09 + (speck(u, v) - 0.5) * 0.05;
    let r = 53 * (1 + n), g = 56 * (1 + n), b = 60 * (1 + n);
    const e = Math.min(u, 1 - u, v, 1 - v);
    if (e < 0.045) {
      const w = (1 - e / 0.045) * Math.max(0, wearN(u, v) * 1.5 - 0.72);
      r += 28 * w; g += 30 * w; b += 32 * w;
    }
    return [r, g, b];
  });
  drawScratches(metalAlbedo.getContext('2d'), '168,174,180', 0.8);

  const metalRough = vmPaint(S, (u, v) => {
    // 0.34 - 0.55, slightly polished on worn edges
    let r = 86 + speck(u, v) * 42 + mottle(u, v) * 12;
    const e = Math.min(u, 1 - u, v, 1 - v);
    if (e < 0.045) r -= (1 - e / 0.045) * Math.max(0, wearN(u, v) * 1.5 - 0.72) * 26;
    return [r, r, r];
  });
  drawScratches(metalRough.getContext('2d'), '58,58,58', 1.3);

  const metalNormal = vmNormalFromHeight(S, (u, v) => speck(u, v) * 0.4 + mottle(u, v) * 0.18, 0.5);

  // Receiver variant with stamped markings at ~35% alpha
  const markedAlbedo = vmCanvas(S);
  {
    const ctx = markedAlbedo.getContext('2d');
    ctx.drawImage(metalAlbedo, 0, 0);
    ctx.fillStyle = 'rgba(198,204,210,0.35)';
    ctx.font = `600 ${Math.round(S * 0.042)}px Arial`;
    ctx.fillText('SAFE   SEMI   AUTO', S * 0.1, S * 0.3);
    ctx.font = `600 ${Math.round(S * 0.034)}px Arial`;
    ctx.fillText('M4A1 TEMPEST  CAL 5.56 MM NATO', S * 0.08, S * 0.55);
    ctx.font = `500 ${Math.round(S * 0.03)}px Arial`;
    ctx.fillText('SN US-274012-B', S * 0.12, S * 0.72);
    ctx.fillText('PROPERTY OF TF-141', S * 0.5, S * 0.88);
    // selector witness dots
    ctx.beginPath();
    ctx.arc(S * 0.07, S * 0.285, S * 0.008, 0, 7);
    ctx.fill();
    // Recessed screw heads (takedown pins are real geometry now).
    const pin = (x, y, r, slot) => {
      ctx.fillStyle = 'rgba(15,16,17,0.9)';
      ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(152,158,164,0.4)';
      ctx.lineWidth = Math.max(1, r * 0.16);
      ctx.beginPath(); ctx.arc(x, y, r * 0.9, 0, 7); ctx.stroke();
      if (slot) {
        ctx.strokeStyle = 'rgba(70,74,78,0.85)';
        ctx.lineWidth = Math.max(1, r * 0.22);
        ctx.beginPath();
        ctx.moveTo(x - r * 0.55, y - r * 0.35);
        ctx.lineTo(x + r * 0.55, y + r * 0.35);
        ctx.stroke();
      }
    };
    pin(S * 0.31, S * 0.8, S * 0.012, true);
    pin(S * 0.63, S * 0.155, S * 0.010, true);
    pin(S * 0.885, S * 0.7, S * 0.011, false);
  }

  /* --- polymer: high-frequency stipple normal, matte rough --- */
  const stip = vmFbm(88, 2, 4405);
  const polyMottle = vmFbm(7, 3, 4406);
  const polymerAlbedo = vmPaint(S, (u, v) => {
    const n = (polyMottle(u, v) - 0.5) * 0.1 + (stip(u, v) - 0.5) * 0.08;
    return [46 * (1 + n), 49 * (1 + n), 52 * (1 + n)];
  });
  const polymerRough = vmPaint(S, (u, v) => {
    const r = 140 + stip(u, v) * 38 + polyMottle(u, v) * 13; // 0.55 - 0.75
    return [r, r, r];
  });
  const polymerNormal = vmNormalFromHeight(S, (u, v) => stip(u, v), 1.35);

  /* --- anodized aluminum for the optic and controls: clean matte black,
         faint grain, only the barest edge-wear catch light --- */
  const anoGrain = vmFbm(52, 2, 4411);
  const anoAlbedo = vmPaint(S, (u, v) => {
    const n = (anoGrain(u, v) - 0.5) * 0.05;
    let r = 22 * (1 + n), g = 23 * (1 + n), b = 25 * (1 + n);
    const e = Math.min(u, 1 - u, v, 1 - v);
    if (e < 0.02) { const w = (1 - e / 0.02) * 0.14; r += 30 * w; g += 31 * w; b += 33 * w; }
    return [r, g, b];
  });
  const anoRough = vmPaint(S, (u, v) => {
    const r = 122 + anoGrain(u, v) * 16; // ~0.48 - 0.54
    return [r, r, r];
  });
  const anoNormal = vmNormalFromHeight(S, (u, v) => anoGrain(u, v) * 0.3, 0.3);

  const mk = (albedo, normal, rough, opts) => {
    const m = new THREE.MeshStandardMaterial({
      map: tex(albedo, { srgb: true }),
      normalMap: tex(normal),
      roughnessMap: tex(rough),
      roughness: 1.0,
      ...opts,
    });
    return m;
  };

  // envMapIntensity 1.5 on the receiver/rail/barrel metal so the gun picks
  // up directional sky sheen instead of reading one flat charcoal.
  const metal = mk(metalAlbedo, metalNormal, metalRough, { metalness: 0.86, envMapIntensity: 1.5 });
  metal.normalScale.set(0.6, 0.6);
  const metalMarked = mk(markedAlbedo, metalNormal, metalRough, { metalness: 0.86, envMapIntensity: 1.5 });
  metalMarked.normalScale.set(0.6, 0.6);
  // Lower receiver: same maps tinted slightly brown (~#33302c effective) so
  // upper/lower stop being one monochrome slab.
  const metalLower = mk(markedAlbedo, metalNormal, metalRough, { metalness: 0.86, envMapIntensity: 1.5 });
  metalLower.normalScale.set(0.6, 0.6);
  // linear-space ratios: #35383c base -> ~#33302c out the tonemapper
  metalLower.color.setRGB(0.93, 0.75, 0.56);
  const polymer = mk(polymerAlbedo, polymerNormal, polymerRough, { metalness: 0.08, envMapIntensity: 0.55 });
  polymer.normalScale.set(1.0, 1.0);
  // FDE tan accents (mag release / stock pad / grip panels): polymer maps
  // tinted toward #6b5b45.
  const fde = mk(polymerAlbedo, polymerNormal, polymerRough, { metalness: 0.08, envMapIntensity: 0.6 });
  fde.normalScale.set(1.0, 1.0);
  // linear-space ratios: stipple-polymer base -> ~#6b5b45 FDE tan
  fde.color.setRGB(5.4, 3.4, 1.73);
  // Matte-black anodized optic housing.
  const anodized = mk(anoAlbedo, anoNormal, anoRough, { metalness: 0.35, envMapIntensity: 0.6 });
  anodized.normalScale.set(0.35, 0.35);
  // Low-roughness wear stripe for rail tops / receiver top edges — the thin
  // bright line where finish rubs off and bare alloy catches the sun.
  const wearStripe = new THREE.MeshStandardMaterial({
    color: 0x83888e, roughness: 0.18, metalness: 0.92, envMapIntensity: 1.6,
  });

  VM_MATS = { metal, metalMarked, metalLower, polymer, fde, anodized, wearStripe };
  return VM_MATS;
}

/* ------------------------------------------------------------------ */
/*  glove: coyote-tan cordura weave with stitch rows                   */
/* ------------------------------------------------------------------ */

let GLOVE_MATS = null;

function getGloveMaterials() {
  if (GLOVE_MATS) return GLOVE_MATS;
  const S = 256;
  const mott = vmFbm(5, 3, 7702);
  const fine = vmFbm(40, 2, 7703);
  const weave = (u, v) =>
    (Math.sin(u * Math.PI * 2 * 64) * 0.5 + 0.5) * 0.5 +
    (Math.sin(v * Math.PI * 2 * 64) * 0.5 + 0.5) * 0.5;
  // dashed stitch rows near the UV borders: land along part edges as seams
  const stitchAt = (u, v) => {
    for (const row of [0.14, 0.86]) {
      if (Math.abs(v - row) < 0.014 && (u * 26) % 1 < 0.55) return 1;
    }
    return 0;
  };
  const albedo = vmPaint(S, (u, v) => {
    const w = weave(u, v), n = mott(u, v), f = fine(u, v);
    let k = 0.9 + (w - 0.5) * 0.16 + (n - 0.5) * 0.24 + (f - 0.5) * 0.1;
    // coyote tan base
    let r = 121 * k, g = 100 * k, b = 73 * k;
    if (stitchAt(u, v)) { r *= 0.62; g *= 0.62; b *= 0.64; }
    return [r, g, b];
  });
  const rough = vmPaint(S, (u, v) => {
    const r = 216 + (weave(u, v) - 0.5) * 26 + mott(u, v) * 12;
    return [r, r, r];
  });
  const normal = vmNormalFromHeight(S, (u, v) => weave(u, v) * 0.45 + mott(u, v) * 0.2 - stitchAt(u, v) * 0.5, 1.0);

  const glove = new THREE.MeshStandardMaterial({
    map: tex(albedo, { srgb: true }),
    normalMap: tex(normal),
    roughnessMap: tex(rough),
    roughness: 1.0, metalness: 0.0, envMapIntensity: 0.5,
  });
  // Hard-knuckle plates & trim: same weave, darkened toward brown-grey.
  const gloveDark = glove.clone();
  gloveDark.color.setRGB(0.42, 0.4, 0.38);
  // Stitch thread / hem line accent
  const thread = new THREE.MeshStandardMaterial({ color: 0x383024, roughness: 0.95 });
  GLOVE_MATS = { glove, gloveDark, thread };
  return GLOVE_MATS;
}

/* ------------------------------------------------------------------ */
/*  PMAG: dark-earth polymer with rib grooves + witness dots           */
/* ------------------------------------------------------------------ */

let PMAG_MAT = null;

function getPmagMaterial() {
  if (PMAG_MAT) return PMAG_MAT;
  const S = 256;
  const stip = vmFbm(60, 2, 8801);
  const mott = vmFbm(6, 3, 8802);
  // 3 horizontal rib grooves per segment texture; segments stack so the
  // ribbing runs the whole mag body.
  const ribAt = (v) => {
    const p = (v * 3) % 1;
    return (p > 0.36 && p < 0.52) ? 1 : 0;
  };
  const albedo = vmPaint(S, (u, v) => {
    const n = (mott(u, v) - 0.5) * 0.14 + (stip(u, v) - 0.5) * 0.1;
    let r = 89 * (1 + n), g = 74 * (1 + n), b = 55 * (1 + n);
    if (ribAt(v)) { r *= 0.66; g *= 0.66; b *= 0.66; }
    // witness-hole hints: dark rounded dots in a rear column
    const du = u - 0.82;
    const dv = ((v * 3) % 1) - 0.14;
    if (du * du + dv * dv * 0.16 < 0.0009) { r *= 0.35; g *= 0.35; b *= 0.35; }
    return [r, g, b];
  });
  const rough = vmPaint(S, (u, v) => {
    const r = 176 + stip(u, v) * 30 + (ribAt(v) ? 22 : 0);
    return [r, r, r];
  });
  const normal = vmNormalFromHeight(S, (u, v) => (ribAt(v) ? -0.55 : 0) + stip(u, v) * 0.35, 1.7);
  PMAG_MAT = new THREE.MeshStandardMaterial({
    map: tex(albedo, { srgb: true }),
    normalMap: tex(normal),
    roughnessMap: tex(rough),
    roughness: 1.0, metalness: 0.05, envMapIntensity: 0.5,
  });
  return PMAG_MAT;
}

let VM_CAMO = null;

/** Viewmodel sleeve camo: desaturated khaki/olive palette at 3.5x repeat so
 *  arm's-length blotches read ~3cm, not 10cm giraffe print. */
function getVmCamo() {
  if (VM_CAMO) return VM_CAMO;
  const set = camoSet(512, [[124, 118, 97], [103, 99, 81], [136, 130, 108], [90, 87, 71]]);
  VM_CAMO = new THREE.MeshStandardMaterial({
    map: tex(set.albedo, { srgb: true, repeat: [3.5, 3.5] }),
    normalMap: tex(set.normal, { repeat: [3.5, 3.5] }),
    roughnessMap: tex(set.rough, { repeat: [3.5, 3.5] }),
    roughness: 1.0,
  });
  return VM_CAMO;
}

/* ------------------------------------------------------------------ */
/*  sight-picture sprites                                              */
/* ------------------------------------------------------------------ */

/** Soft radial halo for the red-dot bloom: bright pinpoint core with a
 *  fast falloff so the emitter reads ~2 MOA, then a faint wide skirt. */
function dotHaloCanvas(size = 64) {
  const c = vmCanvas(size);
  const ctx = c.getContext('2d');
  const grd = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grd.addColorStop(0, 'rgba(255,255,255,0.95)');
  grd.addColorStop(0.22, 'rgba(255,255,255,0.4)');
  grd.addColorStop(0.5, 'rgba(255,255,255,0.13)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, size, size);
  return c;
}

/** Inner-tube occlusion: transparent centre, darkening the outer ~15% of
 *  the sight picture into the housing shadow. */
function tubeShadeCanvas(size = 128) {
  const c = vmCanvas(size);
  const ctx = c.getContext('2d');
  const grd = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grd.addColorStop(0, 'rgba(5,6,7,0)');
  grd.addColorStop(0.68, 'rgba(5,6,7,0)');
  grd.addColorStop(0.85, 'rgba(5,6,7,0.42)');
  grd.addColorStop(1, 'rgba(4,5,6,0.94)');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, size, size);
  return c;
}

/** Tiny stamped-text decal for the magwell face. */
function magwellStampCanvas(size = 256) {
  const c = vmCanvas(size);
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = 'rgba(206,210,214,0.4)';
  ctx.font = `700 ${Math.round(size * 0.11)}px Arial`;
  ctx.fillText('PMAG 30', size * 0.1, size * 0.3);
  ctx.font = `600 ${Math.round(size * 0.085)}px Arial`;
  ctx.fillText('5.56x45 NATO', size * 0.1, size * 0.48);
  ctx.font = `500 ${Math.round(size * 0.07)}px Arial`;
  ctx.fillStyle = 'rgba(206,210,214,0.3)';
  ctx.fillText('GEN M3', size * 0.1, size * 0.64);
  // moulded circle logo hint
  ctx.strokeStyle = 'rgba(206,210,214,0.35)';
  ctx.lineWidth = size * 0.02;
  ctx.beginPath();
  ctx.arc(size * 0.72, size * 0.6, size * 0.1, 0, 7);
  ctx.stroke();
  return c;
}

/* ------------------------------------------------------------------ */
/*  geometry helpers                                                   */
/* ------------------------------------------------------------------ */

/** MIL-STD-1913 rail base: dovetail cross-section extruded along Z. */
function railBaseGeo(len) {
  const s = new THREE.Shape();
  s.moveTo(-0.0102, 0);
  s.lineTo(-0.0152, 0.0021);
  s.lineTo(-0.0152, 0.0041);
  s.lineTo(-0.0104, 0.0062);
  s.lineTo(0.0104, 0.0062);
  s.lineTo(0.0152, 0.0041);
  s.lineTo(0.0152, 0.0021);
  s.lineTo(0.0102, 0);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: len, bevelEnabled: false, curveSegments: 4 });
  g.translate(0, 0, -len / 2);
  return g;
}

/** One picatinny tooth: trapezoid profile (angled flanks), extruded across
 *  the rail width. Sits on top of the rail base; shared geometry. */
function railToothGeo(width = 0.026, along = 0.0058, height = 0.0028) {
  const s = new THREE.Shape();
  const hb = along / 2, ht = along * 0.3;
  s.moveTo(-hb, 0);
  s.lineTo(hb, 0);
  s.lineTo(ht, height);
  s.lineTo(-ht, height);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: width, bevelEnabled: false, curveSegments: 2 });
  g.translate(0, 0, -width / 2);
  // shape-X (tooth pitch axis) -> world Z, extrude depth -> world X
  g.rotateY(-Math.PI / 2);
  return g;
}

const _capsGeos = new Map();
/** Cached capsule for finger segments: axis +Y, total length = len. */
function capsuleGeo(r, len) {
  const key = `${(r * 1e5) | 0}_${(len * 1e5) | 0}`;
  let g = _capsGeos.get(key);
  if (!g) {
    g = new THREE.CapsuleGeometry(r, Math.max(0.0015, len - 2 * r), 2, 8);
    _capsGeos.set(key, g);
  }
  return g;
}

/* ------------------------------------------------------------------ */
/*  first-person rifle                                                 */
/* ------------------------------------------------------------------ */

export function buildRifleViewmodel() {
  const vm = getVmMaterials();
  const g = new THREE.Group();
  const metal = vm.metal;
  const polymer = vm.polymer;

  const add = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
    m.castShadow = true;
    g.add(m);
    return m;
  };

  /* --- lower/upper receiver: chamfered slabs, graphite upper over a
         slightly browner lower so the side never reads one monochrome box --- */
  add(new RoundedBoxGeometry(0.037, 0.05, 0.25, 2, 0.0085), vm.metalMarked, 0, 0.012, 0);      // upper
  add(new RoundedBoxGeometry(0.035, 0.044, 0.175, 2, 0.008), vm.metalLower, 0, -0.028, 0.02);  // lower
  // Flared magwell with a chamfered lip
  add(new RoundedBoxGeometry(0.038, 0.045, 0.07, 1, 0.007), vm.metalLower, 0, -0.047, -0.022);
  // Stamped-text decal on the right magwell face
  {
    const stamp = new THREE.Mesh(
      new THREE.PlaneGeometry(0.045, 0.032),
      new THREE.MeshStandardMaterial({
        map: tex(magwellStampCanvas(), { srgb: true }),
        transparent: true, depthWrite: false, roughness: 0.85, metalness: 0.3,
        polygonOffset: true, polygonOffsetFactor: -2,
      })
    );
    stamp.material.map.wrapS = stamp.material.map.wrapT = THREE.ClampToEdgeWrapping;
    stamp.position.set(0.0192, -0.047, -0.022);
    stamp.rotation.y = Math.PI / 2;
    g.add(stamp);
  }
  // Edge-wear stripes along the receiver top edges
  const wearGeoR = new THREE.BoxGeometry(0.0016, 0.0012, 0.24);
  for (const s of [-1, 1]) add(wearGeoR, vm.wearStripe, s * 0.0175, 0.0366, 0);

  /* --- ejection port + door + deflector + forward assist (right side) --- */
  const portCavity = new THREE.MeshStandardMaterial({ color: 0x0d0e10, roughness: 0.6, metalness: 0.4 });
  add(new THREE.BoxGeometry(0.003, 0.017, 0.055), portCavity, 0.0179, 0.012, -0.03);
  // Port door hanging open below the port (bare-aluminum inner face)
  const doorIn = new THREE.MeshStandardMaterial({ color: 0x7d8288, roughness: 0.38, metalness: 0.85, envMapIntensity: 1.2 });
  const door = new THREE.Mesh(new RoundedBoxGeometry(0.0022, 0.019, 0.058, 1, 0.001), doorIn);
  door.position.set(0.0215, -0.0015, -0.03);
  door.rotation.z = -1.95; // swung open ~112 deg
  door.castShadow = true;
  g.add(door);
  // Brass deflector wedge + forward assist
  const defGeo = new THREE.CylinderGeometry(0.0045, 0.008, 0.012, 4);
  add(defGeo, metal, 0.0195, 0.014, 0.004, 0, Math.PI / 4, Math.PI / 2);
  add(new THREE.CylinderGeometry(0.0075, 0.0075, 0.01, 10), metal, 0.019, 0.014, 0.02, 0, 0, Math.PI / 2);
  add(new THREE.CylinderGeometry(0.0045, 0.0045, 0.004, 8), vm.anodized, 0.0245, 0.014, 0.02, 0, 0, Math.PI / 2);

  /* --- small controls: selector, bolt release, mag release, takedown pins --- */
  const ctrlMat = vm.anodized;
  // Selector lever (left side, above grip): axle + lever arm
  add(new THREE.CylinderGeometry(0.0042, 0.0042, 0.005, 10), ctrlMat, -0.0195, -0.014, 0.052, 0, 0, Math.PI / 2);
  add(new RoundedBoxGeometry(0.004, 0.006, 0.02, 1, 0.0015), ctrlMat, -0.021, -0.014, 0.043);
  // Bolt-release paddle (left, mid receiver)
  add(new RoundedBoxGeometry(0.0035, 0.02, 0.011, 1, 0.0015), ctrlMat, -0.0195, -0.005, -0.028);
  // Mag release button (right)
  add(new THREE.CylinderGeometry(0.0048, 0.0052, 0.004, 10), vm.fde, 0.0195, -0.018, -0.034, 0, 0, Math.PI / 2);
  // Takedown + pivot pins: through-cylinders with proud heads
  const pinGeo = new THREE.CylinderGeometry(0.0032, 0.0032, 0.041, 8);
  add(pinGeo, ctrlMat, 0, -0.021, 0.085, 0, 0, Math.PI / 2);
  add(pinGeo, ctrlMat, 0, -0.031, -0.048, 0, 0, Math.PI / 2);

  /* --- charging handle: T-handle + latch at the receiver rear --- */
  const chGroup = new THREE.Group();
  {
    const shaft = new THREE.Mesh(new RoundedBoxGeometry(0.013, 0.006, 0.035, 1, 0.002), vm.anodized);
    shaft.position.z = -0.012;
    chGroup.add(shaft);
    const tbar = new THREE.Mesh(new RoundedBoxGeometry(0.036, 0.007, 0.011, 1, 0.0025), vm.anodized);
    tbar.position.z = 0.008;
    chGroup.add(tbar);
    const latch = new THREE.Mesh(new RoundedBoxGeometry(0.007, 0.005, 0.012, 1, 0.0018), vm.anodized);
    latch.position.set(-0.02, 0, 0.006);
    latch.rotation.y = 0.25;
    chGroup.add(latch);
    chGroup.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  }
  chGroup.position.set(0, 0.032, 0.115);
  g.add(chGroup);

  /* --- monolithic top rail: dovetail extrusion + angled teeth --- */
  const railLen = 0.53;
  const railZ = -0.15; // spans z=+0.115 .. -0.415
  const rail = add(railBaseGeo(railLen), metal, 0, 0.0375, railZ);
  void rail;
  // near-black strip under the teeth: per-tooth shadow gaps
  const gapMat = new THREE.MeshStandardMaterial({ color: 0x0e0f10, roughness: 0.7, metalness: 0.3 });
  add(new THREE.BoxGeometry(0.0212, 0.0012, railLen), gapMat, 0, 0.0442, railZ);
  // teeth: shared trapezoid extrusion, anodized dark, correct ~10mm pitch
  const toothMat = new THREE.MeshStandardMaterial({ color: 0x232527, roughness: 0.62, metalness: 0.5, envMapIntensity: 0.9 });
  const toothGeo = railToothGeo(0.0252, 0.0058, 0.0026);
  for (let i = 0; i < 52; i++) {
    add(toothGeo, toothMat, 0, 0.0444, 0.105 - i * 0.010);
  }
  // Wear stripes along the rail top edges — optic drag polish
  const wearGeoT = new THREE.BoxGeometry(0.0016, 0.001, railLen);
  for (const s of [-1, 1]) add(wearGeoT, vm.wearStripe, s * 0.0118, 0.0448, railZ);

  /* --- free-float handguard (octagonal, chamfered ends, M-LOK slots) --- */
  const hgGeo = new THREE.CylinderGeometry(0.0235, 0.0235, 0.29, 8);
  hgGeo.rotateX(Math.PI / 2);
  hgGeo.rotateZ(Math.PI / 8); // flats on the sides/bottom
  add(hgGeo, metal, 0, 0.012, -0.2675);
  // riser strip mating the octagon top flat to the rail base (no float gap)
  add(new THREE.BoxGeometry(0.018, 0.0055, 0.29), metal, 0, 0.0345, -0.2675);
  // chamfer rings at both ends + knurled barrel-nut collar at the receiver
  for (const [cz, r0, r1, ln] of [[-0.415, 0.0235, 0.018, 0.008], [-0.125, 0.0235, 0.0255, 0.006]]) {
    const cg = new THREE.CylinderGeometry(r1, r0, ln, 8);
    cg.rotateX(Math.PI / 2);
    cg.rotateZ(Math.PI / 8);
    add(cg, metal, 0, 0.012, cz);
  }
  const nutGeo = new THREE.CylinderGeometry(0.0265, 0.0265, 0.016, 16);
  nutGeo.rotateX(Math.PI / 2);
  add(nutGeo, vm.anodized, 0, 0.012, -0.132);
  // M-LOK side + bottom slots: recessed near-black strips
  const slotMat = new THREE.MeshStandardMaterial({ color: 0x101112, roughness: 0.8 });
  const slotGeo = new THREE.BoxGeometry(0.0032, 0.0105, 0.05);
  const slotGeoB = new THREE.BoxGeometry(0.0105, 0.0032, 0.05);
  for (const s of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const m = new THREE.Mesh(slotGeo, slotMat);
      m.position.set(s * 0.0206, 0.012, -0.175 - i * 0.062);
      m.castShadow = true;
      g.add(m);
    }
  }
  for (let i = 0; i < 4; i++) {
    const m = new THREE.Mesh(slotGeoB, slotMat);
    m.position.set(0, -0.0092, -0.175 - i * 0.062);
    m.castShadow = true;
    g.add(m);
  }

  /* --- barrel + gas block + A2 birdcage --- */
  const barrelGeo = new THREE.CylinderGeometry(0.010, 0.0108, 0.13, 12);
  barrelGeo.rotateX(Math.PI / 2);
  add(barrelGeo, metal, 0, 0.012, -0.47);
  // Low-profile gas block + gas tube running back under the rail
  add(new RoundedBoxGeometry(0.018, 0.019, 0.022, 1, 0.003), metal, 0, 0.017, -0.44);
  const gtGeo = new THREE.CylinderGeometry(0.0026, 0.0026, 0.04, 8);
  gtGeo.rotateX(Math.PI / 2);
  add(gtGeo, metal, 0, 0.0285, -0.425);
  // A2 birdcage: lathe profile (collar, waist, bell) with 5 side vents and a
  // solid bottom; crown disc closes the front.
  {
    const pts = [
      new THREE.Vector2(0.0055, -0.0295),
      new THREE.Vector2(0.0128, -0.0295),
      new THREE.Vector2(0.0138, -0.026),
      new THREE.Vector2(0.0138, -0.008),
      new THREE.Vector2(0.0108, -0.004),
      new THREE.Vector2(0.0108, 0.017),
      new THREE.Vector2(0.0125, 0.02),
      new THREE.Vector2(0.0125, 0.0295),
      new THREE.Vector2(0.0102, 0.0295),
    ];
    const mdGeo = new THREE.LatheGeometry(pts, 14);
    mdGeo.rotateX(Math.PI / 2); // lathe axis -> Z (profile +y -> +z rear)
    const md = new THREE.Mesh(mdGeo, vm.anodized);
    md.position.set(0, 0.012, -0.545);
    md.castShadow = true;
    g.add(md);
    // vents: 5 through-slots around the top 180deg, running along Z
    const ventMat = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.6 });
    const ventGeo = new THREE.BoxGeometry(0.0036, 0.012, 0.023);
    for (let i = 0; i < 5; i++) {
      const ang = Math.PI * (0.14 + 0.18 * i); // solid bottom, vents over the top arc
      const v = new THREE.Mesh(ventGeo, ventMat);
      v.position.set(Math.cos(ang) * 0.009, 0.012 + Math.sin(ang) * 0.009, -0.552);
      v.rotation.z = ang - Math.PI / 2;
      g.add(v);
    }
    // crown: near-black bore face at the tip
    const crown = new THREE.Mesh(new THREE.CircleGeometry(0.0052, 12),
      new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.9 }));
    crown.position.set(0, 0.012, -0.5748);
    crown.rotation.y = Math.PI;
    g.add(crown);
  }

  /* --- buffer tube + chamfered stock --- */
  const btGeo = new THREE.CylinderGeometry(0.0125, 0.0125, 0.16, 12);
  btGeo.rotateX(Math.PI / 2);
  add(btGeo, vm.anodized, 0, 0.014, 0.2);
  const castle = new THREE.CylinderGeometry(0.0165, 0.0165, 0.007, 12);
  castle.rotateX(Math.PI / 2);
  add(castle, vm.anodized, 0, 0.014, 0.128);
  const stock = new THREE.Group();
  {
    const body = new THREE.Mesh(new RoundedBoxGeometry(0.04, 0.062, 0.105, 2, 0.011), polymer);
    body.position.set(0, -0.008, 0);
    stock.add(body);
    const riser = new THREE.Mesh(new RoundedBoxGeometry(0.034, 0.024, 0.085, 1, 0.008), polymer);
    riser.position.set(0, 0.026, 0.006);
    stock.add(riser);
    const pad = new THREE.Mesh(new RoundedBoxGeometry(0.042, 0.096, 0.018, 2, 0.008), vm.fde);
    pad.position.set(0, -0.014, 0.06);
    stock.add(pad);
    const lever = new THREE.Mesh(new RoundedBoxGeometry(0.024, 0.009, 0.03, 1, 0.003), vm.fde);
    lever.position.set(0, -0.043, -0.012);
    stock.add(lever);
    // QD sling swivel socket
    const qd = new THREE.Mesh(new THREE.TorusGeometry(0.0055, 0.0018, 5, 10), vm.anodized);
    qd.position.set(-0.0202, -0.01, -0.02);
    qd.rotation.y = Math.PI / 2;
    stock.add(qd);
  }
  stock.position.set(0, -0.005, 0.27);
  stock.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  g.add(stock);

  /* --- grip + trigger --- */
  add(new RoundedBoxGeometry(0.031, 0.092, 0.044, 2, 0.009), polymer, 0, -0.085, 0.085, 0.32);
  // FDE grip side panels + beavertail
  for (const s of [-1, 1]) {
    add(new RoundedBoxGeometry(0.004, 0.055, 0.03, 1, 0.002), vm.fde, s * 0.0152, -0.087, 0.086, 0.32);
  }
  add(new RoundedBoxGeometry(0.03, 0.014, 0.02, 1, 0.004), polymer, 0, -0.049, 0.104, 0.5);
  add(new RoundedBoxGeometry(0.006, 0.026, 0.007, 1, 0.002), vm.anodized, 0, -0.055, 0.045, 0.12);  // trigger
  // Trigger guard
  const tgGeo = new THREE.TorusGeometry(0.024, 0.0032, 6, 14, Math.PI);
  add(tgGeo, polymer, 0, -0.062, 0.048, 0, Math.PI / 2, 0);

  /* --- curved ribbed PMAG: 5 stacked segments sweeping ~15 deg forward --- */
  const magGroup = new THREE.Group();
  {
    const pmag = getPmagMaterial();
    const segGeo = new RoundedBoxGeometry(0.0305, 0.038, 0.065, 1, 0.005);
    const pos = new THREE.Vector3(0, -0.036, -0.002);
    const step = new THREE.Vector3();
    let ang = 0.05;
    for (let i = 0; i < 5; i++) {
      const seg = new THREE.Mesh(segGeo, pmag);
      seg.position.copy(pos);
      seg.rotation.x = ang;
      seg.castShadow = true;
      magGroup.add(seg);
      // walk down along the current segment direction
      step.set(0, -0.0335, 0).applyAxisAngle(new THREE.Vector3(1, 0, 0), ang + 0.028);
      pos.add(step);
      ang += 0.058;
    }
    // flared floorplate with a front lip
    const plate = new THREE.Mesh(new RoundedBoxGeometry(0.0345, 0.011, 0.074, 1, 0.003), pmag);
    plate.position.copy(pos).add(new THREE.Vector3(0, 0.014, -0.001));
    plate.rotation.x = ang - 0.058;
    plate.castShadow = true;
    magGroup.add(plate);
  }
  magGroup.position.set(0, -0.05, -0.015);
  g.add(magGroup);

  /* --- Aimpoint T-2 style red dot on a QD riser mount --- */
  const optic = new THREE.Group();
  const anod = vm.anodized;
  {
    // main body: lathe-turned tube — eyepiece ring, waist, objective bell,
    // front kill-flash ring. Axis along Z (+z = rear/eye side).
    const pts = [
      new THREE.Vector2(0.0125, 0.0285),  // rear face inner
      new THREE.Vector2(0.0166, 0.0285),  // rear face outer
      new THREE.Vector2(0.0168, 0.0255),  // eyepiece ring
      new THREE.Vector2(0.0166, 0.019),
      new THREE.Vector2(0.0143, 0.0165),  // step to waist
      new THREE.Vector2(0.0143, -0.011),  // main tube
      new THREE.Vector2(0.0164, -0.0165), // objective bell
      new THREE.Vector2(0.0164, -0.0275),
      new THREE.Vector2(0.0174, -0.0285), // kill-flash lip
      new THREE.Vector2(0.0174, -0.0335), // kill-flash ring
      new THREE.Vector2(0.0131, -0.0335), // front face in to aperture
      new THREE.Vector2(0.0126, -0.028),  // inner front lip
    ];
    const bodyGeo = new THREE.LatheGeometry(pts, 18);
    bodyGeo.rotateX(Math.PI / 2);
    const body = new THREE.Mesh(bodyGeo, anod);
    body.material.side = THREE.DoubleSide;
    body.castShadow = true;
    optic.add(body);
    // inner tube sleeve: matte black, backside — swallows light inside
    const innerGeo = new THREE.CylinderGeometry(0.0126, 0.0126, 0.052, 14, 1, true);
    innerGeo.rotateX(Math.PI / 2);
    const inner = new THREE.Mesh(innerGeo, new THREE.MeshStandardMaterial({
      color: 0x08090a, roughness: 0.92, metalness: 0.1, side: THREE.BackSide, envMapIntensity: 0.2,
    }));
    optic.add(inner);
    // turret caps: elevation (top) + windage-style cap (left), battery (right)
    const capGeo = new THREE.CylinderGeometry(0.0068, 0.0072, 0.007, 12);
    const capRim = new THREE.TorusGeometry(0.0065, 0.0011, 4, 12);
    const top = new THREE.Mesh(capGeo, anod);
    top.position.set(0, 0.0175, 0.002);
    optic.add(top);
    const topRim = new THREE.Mesh(capRim, anod);
    topRim.position.set(0, 0.0205, 0.002);
    topRim.rotation.x = Math.PI / 2;
    optic.add(topRim);
    const left = new THREE.Mesh(capGeo, anod);
    left.position.set(-0.0175, 0, 0.002);
    left.rotation.z = Math.PI / 2;
    optic.add(left);
    const leftRim = new THREE.Mesh(capRim, anod);
    leftRim.position.set(-0.0205, 0, 0.002);
    leftRim.rotation.y = Math.PI / 2;
    optic.add(leftRim);
    const batt = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.0084, 0.0058, 14), anod);
    batt.position.set(0.0165, 0, 0.002);
    batt.rotation.z = Math.PI / 2;
    optic.add(batt);
    // QD mount: riser block + base + throw lever (right) + cross bolts
    const riser = new THREE.Mesh(new RoundedBoxGeometry(0.024, 0.02, 0.046, 1, 0.003), anod);
    riser.position.y = -0.0265;
    optic.add(riser);
    const base = new THREE.Mesh(new RoundedBoxGeometry(0.03, 0.009, 0.052, 1, 0.0025), anod);
    base.position.y = -0.038;
    optic.add(base);
    const lever = new THREE.Mesh(new RoundedBoxGeometry(0.004, 0.007, 0.03, 1, 0.0016), anod);
    lever.position.set(0.0155, -0.037, 0.004);
    optic.add(lever);
    const boltGeo = new THREE.CylinderGeometry(0.0035, 0.0035, 0.006, 8);
    for (const bz of [-0.012, 0.016]) {
      const b = new THREE.Mesh(boltGeo, anod);
      b.position.set(-0.0135, -0.037, bz);
      b.rotation.z = Math.PI / 2;
      optic.add(b);
    }
  }
  // Rear-ring bezel: matte dark separation line only. (A brighter metal
  // ring here flared into a glowing "LED halo" under the muzzle light.)
  {
    const bezel = new THREE.Mesh(new THREE.TorusGeometry(0.0164, 0.0009, 6, 28),
      new THREE.MeshStandardMaterial({ color: 0x2c2f33, roughness: 0.55, metalness: 0.5, envMapIntensity: 0.35 }));
    bezel.position.z = 0.0285;
    optic.add(bezel);
    const bezelF = new THREE.Mesh(new THREE.TorusGeometry(0.0171, 0.0008, 6, 28),
      new THREE.MeshStandardMaterial({ color: 0x232629, roughness: 0.6, metalness: 0.5, envMapIntensity: 0.3 }));
    bezelF.position.z = -0.0335;
    optic.add(bezelF);
  }
  // Glass panes: faint blue-green coated lenses, sky reads through the tube
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x9fc4c9, roughness: 0.12, metalness: 0, transparent: true, opacity: 0.045,
    envMapIntensity: 0.15, side: THREE.DoubleSide, depthWrite: false,
  });
  const rearGlass = new THREE.Mesh(new THREE.CircleGeometry(0.0126, 18), glassMat);
  rearGlass.position.z = 0.024;
  rearGlass.renderOrder = 1;
  optic.add(rearGlass);
  const frontGlass = new THREE.Mesh(new THREE.CircleGeometry(0.0126, 18), glassMat);
  frontGlass.position.z = -0.027;
  frontGlass.renderOrder = 1;
  optic.add(frontGlass);
  // Lens tint: multiply the scene through the tube toward blue-green
  const tintMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(0.85, 0.95, 1.0),
    blending: THREE.MultiplyBlending, transparent: true,
    depthWrite: false, toneMapped: false, side: THREE.DoubleSide,
  });
  const tint = new THREE.Mesh(new THREE.CircleGeometry(0.0126, 18), tintMat);
  tint.position.z = 0.0235;
  tint.renderOrder = 2;
  optic.add(tint);
  // Inner-tube occlusion: radial gradient darkening the outer ~15% of the
  // sight picture into the housing
  const shadeTex = tex(tubeShadeCanvas(), {});
  shadeTex.wrapS = shadeTex.wrapT = THREE.ClampToEdgeWrapping;
  const shade = new THREE.Mesh(new THREE.CircleGeometry(0.0128, 18),
    new THREE.MeshBasicMaterial({
      map: shadeTex, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    }));
  shade.position.z = 0.023;
  shade.renderOrder = 3;
  optic.add(shade);
  // Reticle: crisp 2-MOA dot (pinpoint HDR core) + faint bloom halo sprite
  const dot = new THREE.Mesh(new THREE.CircleGeometry(0.0007, 12),
    new THREE.MeshBasicMaterial({ toneMapped: false, depthWrite: false }));
  dot.material.color.setRGB(11.0, 0.35, 0.25);
  dot.position.z = -0.01;
  dot.renderOrder = 4;
  optic.add(dot);
  const haloTex = tex(dotHaloCanvas(), { srgb: true });
  haloTex.wrapS = haloTex.wrapT = THREE.ClampToEdgeWrapping;
  const halo = new THREE.Mesh(new THREE.CircleGeometry(0.0019, 14),
    new THREE.MeshBasicMaterial({
      map: haloTex, transparent: true, blending: THREE.AdditiveBlending,
      depthWrite: false, toneMapped: false, opacity: 0.6,
    }));
  halo.material.color.setRGB(3.2, 0.2, 0.15);
  halo.position.z = -0.0112;
  halo.renderOrder = 5;
  optic.add(halo);

  optic.position.set(0, 0.085, -0.01);
  optic.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  rearGlass.castShadow = frontGlass.castShadow = tint.castShadow = shade.castShadow = dot.castShadow = halo.castShadow = false;
  g.add(optic);

  /* --- low-profile folded backup sights --- */
  add(new RoundedBoxGeometry(0.012, 0.008, 0.018, 1, 0.002), metal, 0, 0.049, -0.385);
  add(new RoundedBoxGeometry(0.014, 0.007, 0.02, 1, 0.002), metal, 0, 0.049, 0.095);

  /* --- PEQ-15 laser box on the left rail --- */
  add(new RoundedBoxGeometry(0.021, 0.026, 0.058, 2, 0.004), vm.fde, -0.028, 0.028, -0.2);
  add(new THREE.CircleGeometry(0.0035, 8), new THREE.MeshBasicMaterial({ color: 0x2a0000 }), -0.033, 0.033, -0.2295, 0, Math.PI, 0);
  add(new THREE.CylinderGeometry(0.003, 0.003, 0.004, 8), vm.anodized, -0.028, 0.043, -0.185);

  // Anchors
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, 0.012, -0.575);
  g.add(muzzle);
  const ejectPort = new THREE.Object3D();
  ejectPort.position.set(0.03, 0.012, -0.03);
  g.add(ejectPort);

  // Collimation across the two-camera rig: the aim ray lives in the WORLD
  // camera (~70°) but the gun is drawn by the 50° viewmodel camera, so solve
  // the 40m aim point to world-camera NDC, then re-project that exact screen
  // position through the vm camera onto the lens plane. The dot then sits on
  // the true point of impact regardless of the FOV mismatch.
  const _dotP = new THREE.Vector3();
  const _dotO = new THREE.Vector3();
  const LENS_R = 0.0105;
  const DOT_Z = -0.01;
  const updateDot = (worldCam, vmCam) => {
    worldCam.getWorldPosition(_dotO);
    worldCam.getWorldDirection(_dotP);
    _dotP.multiplyScalar(40).add(_dotO);
    _dotP.project(worldCam);          // aim point -> world-camera NDC
    _dotP.z = 0.5;
    _dotP.unproject(vmCam);           // same NDC -> point on the vm-camera ray
    vmCam.getWorldPosition(_dotO);
    optic.updateWorldMatrix(true, false);
    optic.worldToLocal(_dotP);        // vm ray, in optic space
    optic.worldToLocal(_dotO);
    const dz = _dotP.z - _dotO.z;
    const k = Math.abs(dz) > 1e-6 ? (DOT_Z - _dotO.z) / dz : 0;
    const x = THREE.MathUtils.clamp(_dotO.x + (_dotP.x - _dotO.x) * k, -LENS_R, LENS_R);
    const y = THREE.MathUtils.clamp(_dotO.y + (_dotP.y - _dotO.y) * k, -LENS_R, LENS_R);
    dot.position.set(x, y, DOT_Z);
    halo.position.set(x, y, DOT_Z - 0.0012);
  };

  return { group: g, muzzle, ejectPort, magGroup, chGroup, opticDot: dot, adsAnchor: optic, updateDot, stockGroup: stock };
}

/** Compact sidearm. */
export function buildPistolViewmodel() {
  const vm = getVmMaterials();
  const g = new THREE.Group();
  const metal = vm.metal;
  const polymer = vm.polymer;
  const add = (geo, mat, x, y, z, rx = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.x = rx;
    m.castShadow = true;
    g.add(m);
    return m;
  };
  // Slide
  add(new RoundedBoxGeometry(0.03, 0.032, 0.19, 2, 0.006), metal, 0, 0.018, -0.01);
  // Slide serrations
  for (let i = 0; i < 5; i++) add(new THREE.BoxGeometry(0.032, 0.02, 0.003), polymer, 0, 0.02, 0.06 + i * 0.007);
  // Ejection port cut
  add(new THREE.BoxGeometry(0.0035, 0.014, 0.04), new THREE.MeshStandardMaterial({ color: 0x0d0e10, roughness: 0.55, metalness: 0.5 }), 0.0145, 0.022, -0.035);
  // Frame
  add(new RoundedBoxGeometry(0.028, 0.03, 0.14, 2, 0.006), polymer, 0, -0.008, 0.0);
  // Grip
  add(new RoundedBoxGeometry(0.03, 0.1, 0.05, 2, 0.008), polymer, 0, -0.062, 0.055, 0.28);
  // Barrel tip
  const bGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.02, 10);
  bGeo.rotateX(Math.PI / 2);
  add(bGeo, metal, 0, 0.018, -0.11);
  // Trigger + guard
  add(new THREE.BoxGeometry(0.006, 0.022, 0.006), metal, 0, -0.03, 0.02);
  const tgGeo = new THREE.TorusGeometry(0.02, 0.003, 6, 12, Math.PI);
  const tg = new THREE.Mesh(tgGeo, polymer);
  tg.position.set(0, -0.035, 0.022);
  tg.rotation.y = Math.PI / 2;
  g.add(tg);
  // Sights
  add(new THREE.BoxGeometry(0.004, 0.008, 0.006), metal, 0, 0.04, -0.095);
  add(new THREE.BoxGeometry(0.016, 0.008, 0.006), metal, 0, 0.04, 0.075);

  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, 0.018, -0.125);
  g.add(muzzle);
  const ejectPort = new THREE.Object3D();
  ejectPort.position.set(0.02, 0.02, 0);
  g.add(ejectPort);
  const magGroup = new THREE.Group();
  g.add(magGroup);
  return { group: g, muzzle, ejectPort, magGroup, chGroup: new THREE.Group(), adsAnchor: null };
}

/* ------------------------------------------------------------------ */
/*  gloved hands with articulated fingers                              */
/* ------------------------------------------------------------------ */

/**
 * Gloved hand with articulated fingers. side: 1 = right, -1 = left.
 * Local frame: the gripped bar axis runs along local Z through the origin;
 * the palm cups it from below and the fingers wrap over the top following
 * the bar radius. kind picks the pose:
 *   'grip'    — trigger hand: three fingers wrap the pistol grip, index
 *               finger extended alongside the trigger, thumb over the far
 *               side (rotate the group ~-1.25 rad about X to mount)
 *   'support' — C-clamp on the handguard: four wrapping fingers toward the
 *               camera, thumb riding the far top rail pointing at the muzzle
 */
export function buildHand(side = 1, kind = 'grip') {
  const g = new THREE.Group();
  const { glove, gloveDark, thread } = getGloveMaterials();
  const sx = side;
  // Which side of the bar the fingers root on. A left support hand under a
  // horizontal handguard roots its fingers on the +X (camera) side so the
  // segments visibly wrap toward the shooter's eye.
  const wx = kind === 'support' ? -side : side;
  // Effective wrap radius: handguard flat ~0.024 + glove padding
  const barR = kind === 'support' ? 0.027 : 0.023;

  /* ---- fingers: chained segments following the bar curvature ---- */
  const plateGeo = new RoundedBoxGeometry(0.0075, 0.013, 0.0125, 1, 0.0025);
  const makeFinger = (z, lens, r, phi0, curlMul, fan = 0, extraTip = 0.22) => {
    const Rr = barR + r * 0.55;
    const root = new THREE.Group();
    root.position.set(wx * Math.sin(phi0) * Rr, Math.cos(phi0) * Rr, z);
    root.rotation.z = wx * (Math.PI / 2 - phi0);
    root.rotation.y = fan;
    let parent = root;
    for (let i = 0; i < lens.length; i++) {
      const L = lens[i];
      const seg = new THREE.Mesh(capsuleGeo(i === lens.length - 1 ? r * 0.88 : r, L + r * 1.4), glove);
      seg.position.y = L / 2;
      seg.castShadow = true;
      parent.add(seg);
      if (i === 0) {
        // hard-knuckle plate on the back of the proximal segment
        const plate = new THREE.Mesh(plateGeo, gloveDark);
        plate.position.set(wx * (r * 0.62), L * 0.52, 0);
        plate.rotation.z = wx * -0.12;
        plate.castShadow = true;
        parent.add(plate);
      }
      if (i < lens.length - 1) {
        const joint = new THREE.Group();
        joint.position.y = L;
        joint.rotation.z = wx * ((lens[i + 1] / Rr) * curlMul + (i === lens.length - 2 ? extraTip : 0));
        parent.add(joint);
        parent = joint;
      }
    }
    g.add(root);
    return root;
  };

  if (kind === 'support') {
    // four fingers spaced along the handguard, wrapping over the top; the
    // roots sit just past the camera-side equator so each proximal segment
    // rises into view before curling away.
    const F = [
      { z: 0.034, lens: [0.030, 0.024, 0.019], r: 0.0074, phi0: 1.62, curl: 0.94, fan: -0.06 },
      { z: 0.0125, lens: [0.033, 0.027, 0.021], r: 0.0076, phi0: 1.66, curl: 0.98, fan: -0.02 },
      { z: -0.009, lens: [0.031, 0.025, 0.020], r: 0.0073, phi0: 1.64, curl: 1.02, fan: 0.03 },
      { z: -0.030, lens: [0.025, 0.020, 0.017], r: 0.0066, phi0: 1.55, curl: 1.08, fan: 0.09 },
    ];
    for (const f of F) makeFinger(f.z, f.lens, f.r, f.phi0, f.curl, f.fan, 0.16);
    // thumb: rides the far-side top rail pointing at the muzzle
    const thumbRoot = new THREE.Group();
    thumbRoot.position.set(-wx * 0.021, 0.008, 0.032);
    thumbRoot.rotation.set(-1.28, 0, -wx * 0.38);
    const th1 = new THREE.Mesh(capsuleGeo(0.0082, 0.043), glove);
    th1.position.y = 0.016;
    thumbRoot.add(th1);
    const th2g = new THREE.Group();
    th2g.position.y = 0.034;
    th2g.rotation.x = 0.22;
    th2g.rotation.z = -wx * 0.18;
    const th2 = new THREE.Mesh(capsuleGeo(0.0074, 0.038), glove);
    th2.position.y = 0.013;
    th2g.add(th2);
    thumbRoot.add(th2g);
    g.add(thumbRoot);
  } else {
    // trigger hand: middle/ring/pinky wrap the grip …
    const F = [
      { z: 0.010, lens: [0.031, 0.026, 0.020], r: 0.0076, phi0: 1.7, curl: 1.15, fan: 0 },
      { z: -0.011, lens: [0.030, 0.025, 0.019], r: 0.0073, phi0: 1.68, curl: 1.2, fan: 0.04 },
      { z: -0.031, lens: [0.024, 0.019, 0.016], r: 0.0066, phi0: 1.6, curl: 1.26, fan: 0.1 },
    ];
    for (const f of F) makeFinger(f.z, f.lens, f.r, f.phi0, f.curl, f.fan);
    // … index finger indexed forward alongside the trigger guard
    const idx = new THREE.Group();
    idx.position.set(wx * 0.026, -0.004, 0.032);
    idx.rotation.z = wx * 0.5;
    idx.rotation.x = -0.12;
    const i1 = new THREE.Mesh(capsuleGeo(0.0074, 0.042), glove);
    i1.position.y = 0.015;
    idx.add(i1);
    const i2g = new THREE.Group();
    i2g.position.y = 0.033;
    i2g.rotation.z = wx * 0.28;
    const i2 = new THREE.Mesh(capsuleGeo(0.0067, 0.036), glove);
    i2.position.y = 0.012;
    i2g.add(i2);
    idx.add(i2g);
    g.add(idx);
    // thumb wrapping the far side over the backstrap
    const thumbRoot = new THREE.Group();
    thumbRoot.position.set(-wx * 0.024, -0.012, 0.026);
    thumbRoot.rotation.set(-0.85, 0, -wx * 0.62);
    const th1 = new THREE.Mesh(capsuleGeo(0.0084, 0.045), glove);
    th1.position.y = 0.017;
    thumbRoot.add(th1);
    const th2g = new THREE.Group();
    th2g.position.y = 0.037;
    th2g.rotation.z = -wx * 0.85;
    const th2 = new THREE.Mesh(capsuleGeo(0.0074, 0.036), glove);
    th2.position.y = 0.012;
    th2g.add(th2);
    thumbRoot.add(th2g);
    g.add(thumbRoot);
  }

  /* ---- palm, metacarpal bridge, hard-knuckle plate ---- */
  // palm cupped under the bar
  const palm = new THREE.Mesh(new RoundedBoxGeometry(0.078, 0.03, 0.088, 2, 0.012), glove);
  palm.position.set(wx * 0.008, -(barR + 0.009), 0.004);
  palm.rotation.z = wx * -0.06;
  g.add(palm);
  // metacarpal bridge: fills the camera side between palm heel and finger roots
  const meta = new THREE.Mesh(new RoundedBoxGeometry(0.026, 0.055, 0.086, 1, 0.011), glove);
  meta.position.set(wx * (barR + 0.002), -0.014, 0.004);
  meta.rotation.z = wx * 0.28;
  g.add(meta);
  // hard-knuckle guard plate across the back of the hand
  const guard = new THREE.Mesh(new RoundedBoxGeometry(0.012, 0.05, 0.078, 1, 0.0045), gloveDark);
  guard.position.set(wx * (barR + 0.012), -0.005, 0.004);
  guard.rotation.z = wx * 0.3;
  g.add(guard);

  /* ---- snug wrist + camo sleeve ---- */
  const sleeveDir = kind === 'grip'
    ? new THREE.Vector3(sx * 0.22, -0.93, -0.24).normalize()
    : new THREE.Vector3(sx * 0.3, -0.38, 0.87).normalize();
  const wrist = new THREE.Vector3(wx * 0.006, -(barR + 0.02), 0.05);
  const up = new THREE.Vector3(0, 1, 0);
  const alongSleeve = new THREE.Quaternion().setFromUnitVectors(up, sleeveDir.clone().negate());

  // glove cuff tapers down to a snug wrist with a stitched hem
  const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.055, 12), glove);
  cuff.position.copy(wrist).addScaledVector(sleeveDir, 0.02);
  cuff.quaternion.copy(alongSleeve);
  g.add(cuff);
  const hem = new THREE.Mesh(new THREE.TorusGeometry(0.0315, 0.0014, 4, 12), thread);
  hem.position.copy(wrist).addScaledVector(sleeveDir, 0.005);
  hem.quaternion.copy(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), sleeveDir));
  g.add(hem);
  // wrist adjustment strap + low-profile buckle tab
  const strap = new THREE.Mesh(new THREE.CylinderGeometry(0.0335, 0.0345, 0.009, 12), gloveDark);
  strap.position.copy(wrist).addScaledVector(sleeveDir, 0.038);
  strap.quaternion.copy(alongSleeve);
  g.add(strap);
  const tab = new THREE.Mesh(new RoundedBoxGeometry(0.012, 0.006, 0.018, 1, 0.002), gloveDark);
  tab.position.copy(wrist).addScaledVector(sleeveDir, 0.038).add(new THREE.Vector3(wx * 0.024, 0.012, 0));
  g.add(tab);

  const vmCamo = getVmCamo();
  const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.045, 0.25, 12), vmCamo);
  sleeve.position.copy(wrist).addScaledVector(sleeveDir, 0.165);
  sleeve.quaternion.copy(alongSleeve);
  g.add(sleeve);

  const fwd = new THREE.Vector3(0, 0, 1);
  const ringQ = new THREE.Quaternion().setFromUnitVectors(fwd, sleeveDir);
  for (const [dist, rr] of [[0.13, 0.038], [0.225, 0.0425]]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(rr, 0.0045, 5, 12), vmCamo);
    ring.position.copy(wrist).addScaledVector(sleeveDir, dist);
    ring.quaternion.copy(ringQ);
    g.add(ring);
  }

  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

/** Simplified AK for enemies (world model). Forward = -Z. */
export function buildEnemyRifle() {
  const lib = getMaterialLib();
  const g = new THREE.Group();
  const metal = lib.gunMetal;
  const wood = new THREE.MeshStandardMaterial({ color: 0x6a4526, roughness: 0.7 });
  const add = (geo, mat, x, y, z, rx = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.x = rx;
    m.castShadow = true;
    g.add(m);
    return m;
  };
  add(new THREE.BoxGeometry(0.045, 0.06, 0.28), metal, 0, 0, 0);
  add(new THREE.BoxGeometry(0.048, 0.055, 0.16), wood, 0, 0, -0.21);        // handguard
  const bGeo = new THREE.CylinderGeometry(0.011, 0.011, 0.26, 8);
  bGeo.rotateX(Math.PI / 2);
  add(bGeo, metal, 0, 0.012, -0.4);
  add(new THREE.BoxGeometry(0.035, 0.05, 0.2), wood, 0, -0.005, 0.23);       // stock
  const magGeo = new THREE.BoxGeometry(0.032, 0.14, 0.055);
  const mag = add(magGeo, metal, 0, -0.09, -0.04, 0.5);
  void mag;
  add(new THREE.BoxGeometry(0.028, 0.07, 0.04), wood, 0, -0.06, 0.1, 0.25); // grip
  return g;
}
