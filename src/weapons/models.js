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
  const blotch = vmFbm(3, 3, 4412); // hand-oil / finish-fade patches

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
    // base #35383c: fbm speckle + large hand-oil blotches so the slab never
    // reads one flat albedo; chamfer edge wear brightened into legible
    // rub-through highlights (the UV border lands on the RoundedBox edges).
    const n = (mottle(u, v) - 0.5) * 0.13 + (speck(u, v) - 0.5) * 0.07
      + (blotch(u, v) - 0.5) * 0.11;
    let r = 53 * (1 + n), g = 56 * (1 + n), b = 60 * (1 + n);
    const e = Math.min(u, 1 - u, v, 1 - v);
    if (e < 0.055) {
      const w = (1 - e / 0.055) * Math.max(0, wearN(u, v) * 1.6 - 0.64);
      r += 38 * w; g += 40 * w; b += 42 * w;
    }
    return [r, g, b];
  });
  drawScratches(metalAlbedo.getContext('2d'), '168,174,180', 0.8);

  const metalRough = vmPaint(S, (u, v) => {
    // 0.40 - 0.68 with patchy sheen; worn edges polish only mildly so sun
    // highlights roll off instead of clipping to white.
    let r = 101 + speck(u, v) * 42 + mottle(u, v) * 14 + (blotch(u, v) - 0.5) * 24;
    const e = Math.min(u, 1 - u, v, 1 - v);
    if (e < 0.055) r -= (1 - e / 0.055) * Math.max(0, wearN(u, v) * 1.6 - 0.64) * 18;
    return [r, r, r];
  });
  drawScratches(metalRough.getContext('2d'), '58,58,58', 1.1);

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

  /* --- FDE polymer: BAKED tan albedo. (The old 5.4x tint on the dark
         polymer map clipped against white and flattened every accent part
         into raw untextured plastic.) Stipple + mottle + blotch + grime —
         contrast pushed so the tan panels stop reading as one flat fill
         at arm's length. --- */
  const fdeAlbedo = vmPaint(S, (u, v) => {
    const n = (polyMottle(u, v) - 0.5) * 0.26 + (stip(u, v) - 0.5) * 0.16
      + (blotch(u, v) - 0.5) * 0.12;
    let r = 125 * (1 + n), g = 105 * (1 + n), b = 80 * (1 + n);
    const e = Math.min(u, 1 - u, v, 1 - v);
    if (e < 0.05) {
      const w = (1 - e / 0.05) * 0.5;
      r *= 1 - 0.15 * w; g *= 1 - 0.15 * w; b *= 1 - 0.13 * w; // grimed edges
    }
    return [r, g, b];
  });
  const fdeRough = vmPaint(S, (u, v) => {
    const r = 168 + stip(u, v) * 32 + polyMottle(u, v) * 18; // ~0.66 - 0.86
    return [r, r, r];
  });

  /* --- anodized aluminum for the optic and controls: clean matte black,
         faint grain, only the barest edge-wear catch light --- */
  const anoGrain = vmFbm(52, 2, 4411);
  const anoAlbedo = vmPaint(S, (u, v) => {
    const n = (anoGrain(u, v) - 0.5) * 0.05;
    let r = 22 * (1 + n), g = 23 * (1 + n), b = 25 * (1 + n);
    // Edge catch kept to a whisper: at 0.14 the optic housing's lathe rims
    // sparkled into dotted arcs under sun + bloom — crisp glints that
    // contradicted the ADS defocus story.
    const e = Math.min(u, 1 - u, v, 1 - v);
    if (e < 0.02) { const w = (1 - e / 0.02) * 0.05; r += 16 * w; g += 17 * w; b += 18 * w; }
    return [r, g, b];
  });
  const anoRough = vmPaint(S, (u, v) => {
    const r = 138 + anoGrain(u, v) * 12; // ~0.54 - 0.59, grain sparkle tamed
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

  // envMapIntensity on the receiver/rail/barrel metal: enough directional
  // sky sheen to avoid flat charcoal, but low enough (with the raised
  // roughness floor) that sun speculars roll off below clip — the round-7
  // 1.5 setting was blowing the top rail to pure white.
  const metal = mk(metalAlbedo, metalNormal, metalRough, { metalness: 0.86, envMapIntensity: 1.12 });
  metal.normalScale.set(0.6, 0.6);
  const metalMarked = mk(markedAlbedo, metalNormal, metalRough, { metalness: 0.86, envMapIntensity: 1.12 });
  metalMarked.normalScale.set(0.6, 0.6);
  // Lower receiver: same maps tinted slightly brown (~#33302c effective) so
  // upper/lower stop being one monochrome slab.
  const metalLower = mk(markedAlbedo, metalNormal, metalRough, { metalness: 0.86, envMapIntensity: 1.12 });
  metalLower.normalScale.set(0.6, 0.6);
  // linear-space ratios: #35383c base -> ~#33302c out the tonemapper
  metalLower.color.setRGB(0.93, 0.75, 0.56);
  const polymer = mk(polymerAlbedo, polymerNormal, polymerRough, { metalness: 0.08, envMapIntensity: 0.55 });
  polymer.normalScale.set(1.0, 1.0);
  // FDE tan accents (mag release / stock pad / grip panels / PEQ body):
  // dedicated baked-tan maps, matte.
  const fde = mk(fdeAlbedo, polymerNormal, fdeRough, { metalness: 0.06, envMapIntensity: 0.5 });
  fde.normalScale.set(1.4, 1.4);
  // Matte-black anodized optic housing. Metalness/env pulled down (round 8):
  // per-facet sun glints were dotting the housing rims with crisp sparkles
  // that fought the ADS defocus read.
  const anodized = mk(anoAlbedo, anoNormal, anoRough, { metalness: 0.12, envMapIntensity: 0.28 });
  anodized.normalScale.set(0.35, 0.35);
  // Wear stripe for rail tops / receiver top edges — the thin bright line
  // where finish rubs off. Roughness/env pulled up/down from round 7's
  // mirror settings: it should catch the sun, not clip to a white laser.
  const wearStripe = new THREE.MeshStandardMaterial({
    color: 0x6e7378, roughness: 0.36, metalness: 0.9, envMapIntensity: 0.8,
  });

  // Vertex-color variants for the big body meshes: baked underside gradient
  // (see shadeUnder) multiplies through these.
  const vc = (m) => { const c = m.clone(); c.vertexColors = true; return c; };

  VM_MATS = {
    metal, metalMarked, metalLower, polymer, fde, anodized, wearStripe,
    metalV: vc(metal), metalMarkedV: vc(metalMarked), metalLowerV: vc(metalLower),
    polymerV: vc(polymer), fdeV: vc(fde),
  };
  return VM_MATS;
}

/* ------------------------------------------------------------------ */
/*  baked ambient occlusion helpers                                    */
/* ------------------------------------------------------------------ */

/**
 * Bake a vertical light gradient into a geometry's vertex colors: fully lit
 * at yTop fading to `dark` at yBot, with an extra clamp on down-facing
 * normals. Cheap fake of sky-occlusion on receiver undersides so the big
 * slabs stop reading uniformly lit.
 */
function shadeUnder(geo, yBot, yTop, dark = 0.72, downMul = 0.88) {
  const pos = geo.attributes.position;
  const nrm = geo.attributes.normal;
  const col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const t = THREE.MathUtils.clamp((pos.getY(i) - yBot) / (yTop - yBot), 0, 1);
    let k = dark + (1 - dark) * t;
    const ny = nrm.getY(i);
    if (ny < -0.3) k *= downMul + (1 - downMul) * t; // -Y faces sink further
    col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = k;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return geo;
}

/**
 * Average normals across coincident vertices after a displacement pass —
 * computeVertexNormals alone leaves a lighting split down a cylinder's
 * duplicated UV-seam column (and a hard ring where caps meet the wall,
 * which cloth shouldn't have).
 */
function weldVertexNormals(geo) {
  const p = geo.attributes.position, n = geo.attributes.normal;
  const map = new Map();
  for (let i = 0; i < p.count; i++) {
    const key = `${Math.round(p.getX(i) * 1e4)},${Math.round(p.getY(i) * 1e4)},${Math.round(p.getZ(i) * 1e4)}`;
    const e = map.get(key);
    if (e) e.push(i);
    else map.set(key, [i]);
  }
  for (const idx of map.values()) {
    if (idx.length < 2) continue;
    let x = 0, y = 0, z = 0;
    for (const i of idx) { x += n.getX(i); y += n.getY(i); z += n.getZ(i); }
    const l = Math.hypot(x, y, z) || 1;
    for (const i of idx) n.setXYZ(i, x / l, y / l, z / l);
  }
  return geo;
}

let AO_MATS = null;

/**
 * Junction-occlusion materials:
 *  seam    — opaque near-black matte for collars/wedges tucked into part
 *            junctions (mag-to-magwell lip, optic base pad, gas block
 *            collars…). Reads as the shadowed seam where parts meet.
 *  contact — transparent black sleeve with a soft alpha falloff along its
 *            length; wrapped slightly proud of a surface it fakes the
 *            contact shadow of a hand/mount clamped around that surface.
 */
function getAoMaterials() {
  if (AO_MATS) return AO_MATS;
  const seam = new THREE.MeshStandardMaterial({
    color: 0x0a0b0c, roughness: 0.96, metalness: 0.0, envMapIntensity: 0.12,
  });
  const c = vmCanvas(64);
  const ctx = c.getContext('2d');
  const grd = ctx.createLinearGradient(0, 0, 0, 64);
  grd.addColorStop(0, 'rgb(0,0,0)');
  grd.addColorStop(0.32, 'rgb(255,255,255)');
  grd.addColorStop(0.68, 'rgb(255,255,255)');
  grd.addColorStop(1, 'rgb(0,0,0)');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, 64, 64);
  const at = tex(c);
  at.wrapS = at.wrapT = THREE.ClampToEdgeWrapping;
  const contact = new THREE.MeshBasicMaterial({
    color: 0x000000, transparent: true, opacity: 0.4, alphaMap: at,
    depthWrite: false, toneMapped: false,
  });
  AO_MATS = { seam, contact };
  return AO_MATS;
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
  const dirt = vmFbm(7, 3, 7708);
  // Plain cordura weave: perpendicular thread sines; whichever thread runs
  // "over" carries the bump/highlight so the cross-hatch reads as fabric,
  // not a printed grid.
  const thU = (u, v) => (Math.sin(u * Math.PI * 2 * 52) * 0.5 + 0.5) * (0.85 + fine(u * 2, v * 2) * 0.3);
  const thV = (u, v) => (Math.sin(v * Math.PI * 2 * 52) * 0.5 + 0.5) * (0.85 + fine(v * 2, u * 2) * 0.3);
  const weave = (u, v) => Math.max(thU(u, v), thV(u, v));
  // dashed stitch rows near the UV borders: land along part edges as seams
  const stitchAt = (u, v) => {
    for (const row of [0.14, 0.86]) {
      if (Math.abs(v - row) < 0.014 && (u * 26) % 1 < 0.55) return 1;
    }
    return 0;
  };
  // grime: worn dark blotches shared by albedo + roughness
  const grime = (u, v) => {
    const d = dirt(u, v);
    return d < 0.42 ? 1 - (0.42 - d) * 0.6 : 1;
  };
  const baseCol = (u, v, ao = 1) => {
    const w = weave(u, v), n = mott(u, v), f = fine(u, v);
    // Contrast pushed (round 8): the tan read as one smooth mitten fill at
    // arm's length, so mottle/fine carry more of the value range and sparse
    // dark flecks break the weave like snagged/soiled threads.
    let k = (0.84 + (w - 0.5) * 0.34 + (n - 0.5) * 0.32 + (f - 0.5) * 0.18) * grime(u, v) * ao;
    const fl = fine(u * 3.1 % 1, v * 3.1 % 1);
    if (fl < 0.3) k *= 0.87;
    // Worn coyote-brown, a clear half-step darker than the camo sleeve so
    // glove vs sleeve reads as two garments, not one beige arm.
    let r = 103 * k, g = 84 * k, b = 61 * k;
    if (stitchAt(u, v)) { r *= 0.6; g *= 0.6; b *= 0.62; }
    return [r, g, b];
  };
  // matte fabric roughness: 0.77 - 0.95, thread crowns polish slightly
  // (kept high so weave crowns never sparkle under the muzzle light)
  const roughAt = (u, v) => 222 + (weave(u, v) - 0.68) * 36 + (mott(u, v) - 0.5) * 20;

  const albedo = vmPaint(S, (u, v) => baseCol(u, v));
  const rough = vmPaint(S, (u, v) => { const r = roughAt(u, v); return [r, r, r]; });
  const normal = vmNormalFromHeight(
    S, (u, v) => weave(u, v) * 0.55 + mott(u, v) * 0.18 - stitchAt(u, v) * 0.5, 1.4);

  const glove = new THREE.MeshStandardMaterial({
    map: tex(albedo, { srgb: true }),
    normalMap: tex(normal),
    roughnessMap: tex(rough),
    roughness: 1.0, metalness: 0.0, envMapIntensity: 0.45,
  });
  glove.normalScale.set(1.6, 1.6);

  /* Finger capsules (lathe UVs: v=0 at the joint end, u=0/0.5 facing the
     neighbouring fingers). Bake AO into the albedo: joint-crease shadow at
     the root, darkened inter-finger flanks, knuckle crease grooves. */
  const fingerAO = (u, v) => {
    let k = 1;
    if (v < 0.17) k *= 0.6 + 0.4 * (v / 0.17);                      // root crease
    if (v > 0.9) k *= 1 - (v - 0.9) * 1.2;                          // tip under-curl
    // Inter-finger flanks (u = 0/0.5 face the neighbouring fingers): a
    // deep wide channel so adjacent fingers separate tonally even where
    // the geometric gap closes — the anti-mitten read.
    const du = Math.min(u, Math.abs(u - 0.5), 1 - u);
    if (du < 0.16) k *= 0.52 + 0.48 * (du / 0.16);
    // Knuckle crease striping: widened + deepened (round 8) so the joint
    // rings survive at player-camera scale instead of averaging away.
    for (const cr of [0.38, 0.58]) {
      const dc = Math.abs(v - cr);
      if (dc < 0.034) k *= 0.5 + 0.5 * (dc / 0.034);
    }
    return k;
  };
  const fAlbedo = vmPaint(S, (u, v) => baseCol(u, v, fingerAO(u, v)));
  const fRough = vmPaint(S, (u, v) => {
    const r = roughAt(u, v) + (fingerAO(u, v) < 0.9 ? 12 : 0); // creases duller
    return [r, r, r];
  });
  const fNormal = vmNormalFromHeight(S, (u, v) => {
    let h = weave(u, v) * 0.5 + mott(u, v) * 0.14;
    for (const cr of [0.38, 0.58]) {
      const d = Math.abs(v - cr);
      if (d < 0.034) h -= (1 - d / 0.034) * 0.95; // knuckle crease grooves
    }
    if (v < 0.15) h -= (1 - v / 0.15) * 0.35;     // root fold
    // inter-finger flank grooves matching the albedo channels
    const du = Math.min(u, Math.abs(u - 0.5), 1 - u);
    if (du < 0.1) h -= (1 - du / 0.1) * 0.3;
    return h;
  }, 1.4);
  const gloveFinger = new THREE.MeshStandardMaterial({
    map: tex(fAlbedo, { srgb: true }),
    normalMap: tex(fNormal),
    roughnessMap: tex(fRough),
    roughness: 1.0, metalness: 0.0, envMapIntensity: 0.45,
  });
  gloveFinger.normalScale.set(1.6, 1.6);

  // Hard-knuckle plates & trim: same weave, dropped hard toward umber so
  // the protective panels read as separate dark gear over the tan glove.
  const gloveDark = glove.clone();
  gloveDark.color.setRGB(0.3, 0.29, 0.27);
  // Clarino palm patch: lighter smoother synthetic-suede panel so the glove
  // reads as a two-material garment from the player camera.
  const palmAlbedo = vmPaint(S, (u, v) => {
    const n = mott(u, v), f = fine(u, v);
    const k = (0.9 + (n - 0.5) * 0.22 + (f - 0.5) * 0.12) * grime(u, v);
    let r = 136 * k, g = 114 * k, b = 88 * k;
    if (stitchAt(u, v)) { r *= 0.62; g *= 0.62; b *= 0.64; }
    return [r, g, b];
  });
  const palmRough = vmPaint(S, (u, v) => {
    const r = 198 + (fine(u, v) - 0.5) * 38 + (mott(u, v) - 0.5) * 18;
    return [r, r, r];
  });
  const glovePalm = new THREE.MeshStandardMaterial({
    map: tex(palmAlbedo, { srgb: true }),
    normalMap: tex(normal),
    roughnessMap: tex(palmRough),
    roughness: 1.0, metalness: 0.0, envMapIntensity: 0.4,
  });
  glovePalm.normalScale.set(0.7, 0.7);
  // Stitch thread / hem line accent
  const thread = new THREE.MeshStandardMaterial({ color: 0x383024, roughness: 0.95 });
  GLOVE_MATS = { glove, gloveFinger, gloveDark, glovePalm, thread };
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

let VM_SLEEVE = null;

/** Viewmodel sleeve cloth. The old plain camo tile (3.5x repeat) read as a
 *  smooth vinyl tube in every frame, so the fold story is now striated INTO
 *  dedicated maps (repeat 1: u wraps the arm once, v runs elbow->wrist):
 *  lengthwise ridge/valley shading that drifts as it runs up the forearm,
 *  darker push-up crease bands with a light-catch roll on their wrist side,
 *  and matching normal grooves — contrast pitched to survive 1080p. The
 *  camo palette itself is baked in at the same 3.5x blotch scale. Also
 *  builds the ribbed elastic knit for the cuff/glove junction band. */
function getVmSleeveMats() {
  if (VM_SLEEVE) return VM_SLEEVE;
  const S = 512;
  const set = camoSet(S, [[124, 118, 97], [103, 99, 81], [136, 130, 108], [90, 87, 71]]);
  const camoD = set.albedo.getContext('2d').getImageData(0, 0, S, S).data;
  const camoAt = (u, v) => {
    const x = Math.min(S - 1, (((u * 3.5) % 1) * S) | 0);
    const y = Math.min(S - 1, (((v * 3.5) % 1) * S) | 0);
    const i = (y * S + x) * 4;
    return [camoD[i], camoD[i + 1], camoD[i + 2]];
  };
  const drift = vmFbm(4, 2, 8801);   // ridge waviness up the arm
  const gaps = vmFbm(3, 2, 8802);    // where ridge relief slackens
  const fine = vmFbm(46, 2, 8803);   // thread-level breakup
  // Crease bands in UV space (v=0 elbow -> v=1 wrist): the cloth bunches
  // hardest where the glove/cuff pushes it back up the forearm.
  const CREASES = [
    { c: 0.28, w: 0.030, k: 0.38, ph: 0.15, amp: 0.035 },
    { c: 0.55, w: 0.026, k: 0.34, ph: 0.62, amp: 0.030 },
    { c: 0.80, w: 0.034, k: 0.45, ph: 0.38, amp: 0.042 },
  ];
  // Returns [multiply-shade, height] at UV (u, vv). Canvas painters call it
  // with vv = 1 - v because tex() textures are flipY.
  const foldAt = (u, vv) => {
    // 8 lengthwise ridges around the arm, drifting sideways as they run
    const ridge = Math.sin((u + (drift(u * 0.5, vv) - 0.5) * 0.16) * Math.PI * 2 * 8);
    const amp = 0.45 + 0.55 * Math.min(1, Math.max(0, gaps(u, vv) * 2.2 - 0.45));
    // crests catch light, valleys pinch darker than the crests brighten
    let shade = 1 + (ridge > 0 ? ridge * 0.16 : ridge * 0.26) * amp;
    let h = ridge * amp * 0.5;
    for (const cr of CREASES) {
      const vc = cr.c + Math.sin((u + cr.ph) * Math.PI * 2 * 2) * cr.amp;
      const band = Math.exp(-(((vv - vc) / cr.w) ** 2));
      const roll = Math.exp(-(((vv - vc - cr.w * 1.8) / (cr.w * 1.2)) ** 2));
      shade *= (1 - cr.k * band) * (1 + 0.18 * roll);
      h += -band * 1.15 + roll * 0.55;
    }
    return [shade, h];
  };
  const albedo = vmPaint(S, (u, v) => {
    const [shade] = foldAt(u, 1 - v);
    const k = shade * (1 + (fine(u, v) - 0.5) * 0.10);
    const [r, g, b] = camoAt(u, v);
    return [r * k, g * k, b * k];
  });
  const normal = vmNormalFromHeight(S, (u, v) => foldAt(u, 1 - v)[1] * 0.5 + fine(u, v) * 0.22, 2.6);
  const rough = vmPaint(S, (u, v) => {
    const r = 225 + (1 - foldAt(u, 1 - v)[0]) * 40 + (fine(u, v) - 0.5) * 16;
    return [r, r, r];
  });
  const sleeve = new THREE.MeshStandardMaterial({
    map: tex(albedo, { srgb: true }),
    normalMap: tex(normal),
    roughnessMap: tex(rough),
    roughness: 1.0,
  });
  sleeve.normalScale.set(1.5, 1.5);
  // Ribbed elastic knit cuff: clearly darker than both the camo and the
  // tan glove so the junction reads as its own garment layer.
  const ribAt = (u, v) => Math.sin(u * Math.PI * 2 * 44 + (fine(u, v) - 0.5) * 1.3);
  const cuffAlbedo = vmPaint(S, (u, v) => {
    const k = 0.9 + ribAt(u, v) * 0.14 + (fine(u, v) - 0.5) * 0.10;
    return [48 * k, 47 * k, 41 * k];
  });
  const cuffNormal = vmNormalFromHeight(S, (u, v) => (ribAt(u, v) * 0.5 + 0.5) * 0.9 + fine(u, v) * 0.1, 2.2);
  const cuffRough = vmPaint(S, (u, v) => {
    const r = 233 + ribAt(u, v) * 10;
    return [r, r, r];
  });
  const cuff = new THREE.MeshStandardMaterial({
    map: tex(cuffAlbedo, { srgb: true }),
    normalMap: tex(cuffNormal),
    roughnessMap: tex(cuffRough),
    roughness: 1.0, envMapIntensity: 0.4,
  });
  cuff.normalScale.set(1.2, 1.2);
  VM_SLEEVE = { sleeve, cuff };
  return VM_SLEEVE;
}

let OPTIC_WORN_MAT = null;

/** Optic-housing variant of the anodized finish with baked field wear.
 *  LatheGeometry runs v by profile-point index (j/11 for the 12-point
 *  profile), so the rub-through lands exactly on the machined corners:
 *  light on the eyepiece ring and objective bell edge, hardest on the
 *  forward kill-flash rim, plus a couple of tiny scuff nicks on the main
 *  tube. Angularly gated by fbm so it reads as patchy rubbed metal, not
 *  painted rings. Roughness dips only slightly at the rubs — the wear
 *  lives in albedo, so it can't reintroduce the round-7 sun sparkle. */
function getOpticHousingMat() {
  if (OPTIC_WORN_MAT) return OPTIC_WORN_MAT;
  const S = 512;
  const grain = vmFbm(52, 2, 4411);   // same grain family as vm.anodized
  const patch = vmFbm(7, 3, 5501);    // angular gating of the rubs
  const chatter = vmFbm(30, 2, 5502); // fine value chatter inside a rub
  const ROWS = [
    { v: 1 / 11, s: 0.012, k: 0.55, ph: 0.82 },  // rear face outer corner
    { v: 2 / 11, s: 0.014, k: 0.75, ph: 0.13 },  // eyepiece ring crest
    { v: 6 / 11, s: 0.012, k: 0.45, ph: 0.41 },  // objective bell corner
    { v: 8 / 11, s: 0.013, k: 0.9, ph: 0.67 },   // kill-flash lip corner
    { v: 8.5 / 11, s: 0.030, k: 0.5, ph: 0.55 }, // kill-flash outer band
    { v: 9 / 11, s: 0.018, k: 1.0, ph: 0.29 },   // forward rim front corner
  ];
  const wearAt = (u, vv) => { // vv in UV space (callers pass 1 - canvasV)
    let w = 0;
    for (const rw of ROWS) {
      const band = Math.exp(-(((vv - rw.v) / rw.s) ** 2));
      if (band < 0.02) continue;
      const gate = Math.min(1, Math.max(0, patch(u, rw.ph) * 2.4 - 1.0));
      const s = band * rw.k * gate * (0.55 + chatter(u, vv) * 0.75);
      if (s > w) w = s;
    }
    return Math.min(1, w);
  };
  const albedo = vmPaint(S, (u, v) => {
    const n = (grain(u, v) - 0.5) * 0.05;
    let r = 22 * (1 + n), g = 23 * (1 + n), b = 25 * (1 + n);
    const w = wearAt(u, 1 - v);
    if (w > 0.01) { // rub through to bare aluminum grey
      const m = 118 + chatter(v, u) * 30;
      r += (m - r) * w; g += (m + 3 - g) * w; b += (m + 6 - b) * w;
    }
    return [r, g, b];
  });
  { // 2 tiny scuff nicks + a chip on the main tube (UV v 0.38-0.5)
    const ctx = albedo.getContext('2d');
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(140,146,153,0.92)';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(S * 0.18, S * 0.565);
    ctx.quadraticCurveTo(S * 0.20, S * 0.557, S * 0.228, S * 0.562);
    ctx.stroke();
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = 'rgba(126,132,139,0.85)';
    ctx.beginPath();
    ctx.moveTo(S * 0.63, S * 0.528);
    ctx.lineTo(S * 0.658, S * 0.519);
    ctx.stroke();
    ctx.fillStyle = 'rgba(152,158,165,0.9)';
    ctx.fillRect(S * 0.415, S * 0.585, 3, 2.2);
  }
  const rough = vmPaint(S, (u, v) => {
    const r = 138 + grain(u, v) * 12 - wearAt(u, 1 - v) * 26;
    return [r, r, r];
  });
  const normal = vmNormalFromHeight(S, (u, v) => grain(u, v) * 0.3, 0.3);
  OPTIC_WORN_MAT = new THREE.MeshStandardMaterial({
    map: tex(albedo, { srgb: true }),
    normalMap: tex(normal),
    roughnessMap: tex(rough),
    roughness: 1.0, metalness: 0.12, envMapIntensity: 0.28,
    side: THREE.DoubleSide,
  });
  OPTIC_WORN_MAT.normalScale.set(0.35, 0.35);
  return OPTIC_WORN_MAT;
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

/** Inner-tube occlusion: transparent centre, with radial darkening rolling
 *  in from ~55% radius so the outer sight picture sinks into the housing
 *  shadow instead of stopping at a crisp lens edge. */
function tubeShadeCanvas(size = 128) {
  const c = vmCanvas(size);
  const ctx = c.getContext('2d');
  const grd = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grd.addColorStop(0, 'rgba(5,6,7,0)');
  grd.addColorStop(0.55, 'rgba(5,6,7,0)');
  grd.addColorStop(0.74, 'rgba(5,6,7,0.16)');
  grd.addColorStop(0.86, 'rgba(5,6,7,0.42)');
  grd.addColorStop(0.94, 'rgba(5,6,7,0.72)');
  grd.addColorStop(1, 'rgba(4,5,6,0.97)');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, size, size);
  return c;
}

/** Radial multiply tint for the sight picture: unity at centre so the
 *  through-tube exposure matches the outside scene 1:1, rolling into a
 *  blue-green coated-glass tint over the outer third (red sinks hardest,
 *  so the rim cools like a real AR-coated lens). */
function lensTintCanvas(size = 128) {
  const c = vmCanvas(size);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  const d = img.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x + 0.5) / size - 0.5, dy = (y + 0.5) / size - 0.5;
      const r = Math.min(1, Math.sqrt(dx * dx + dy * dy) * 2);
      const k = Math.max(0, (r - 0.42) / 0.58);
      const kk = k * k;
      const i = (y * size + x) * 4;
      d[i] = Math.round((1.0 - 0.27 * kk) * 255);
      d[i + 1] = Math.round((1.0 - 0.11 * kk) * 255);
      d[i + 2] = Math.round((1.0 - 0.05 * kk) * 255);
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

/** Additive blue-green sheen hugging the lens perimeter — the coated-glass
 *  rim catch the multiply tint (which can only darken) can't produce.
 *  Clear centre, a whisper of teal over the outer ~12%, weighted toward
 *  the upper half (sky side) so the ring doesn't read as a uniform
 *  painted-on band. */
function lensRimSheenCanvas(size = 128) {
  const c = vmCanvas(size);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  const d = img.data;
  const H = size / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x + 0.5 - H) / H, dy = (y + 0.5 - H) / H;
      const r = Math.min(1, Math.sqrt(dx * dx + dy * dy));
      const band = Math.max(0, (r - 0.86) / 0.14);
      const up = 0.55 + 0.45 * (-dy * 0.5 + 0.5);   // stronger toward 12 o'clock
      const a = band * band * 0.24 * up;
      const i = (y * size + x) * 4;
      d[i] = 50; d[i + 1] = 110; d[i + 2] = 118;
      d[i + 3] = Math.round(a * 255);
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

/** One soft arc reflection on the rear glass: a low-alpha blue-white
 *  crescent band around ~0.7R spanning ~80 deg, gaussian-soft in both the
 *  radial and angular directions so it reads as light sliding on coated
 *  glass, not a painted stripe. Plane is rotated at build time to sit
 *  diagonally across the upper glass. */
function lensStreakCanvas(size = 160) {
  const c = vmCanvas(size);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  const d = img.data;
  const R = size / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x + 0.5 - R) / R, dy = (y + 0.5 - R) / R;
      const r = Math.sqrt(dx * dx + dy * dy);
      const ang = Math.atan2(-dy, dx); // y-up
      let da = ang - 2.0;              // band centred at ~115 deg
      da = Math.atan2(Math.sin(da), Math.cos(da));
      const radial = Math.exp(-Math.pow((r - 0.70) / 0.09, 2));
      const angular = Math.exp(-Math.pow(da / 0.62, 2));
      const a = radial * angular;
      const i = (y * size + x) * 4;
      d[i] = 208; d[i + 1] = 226; d[i + 2] = 240;
      d[i + 3] = Math.round(a * 255);
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

/** Soft-edged emitter-post silhouette for the optic interior: tapered stem
 *  rising from the 6-o'clock bezel with a rounded emitter head and a faint
 *  LED window. Drawn tiny and bilinear-upscaled so the edges land
 *  pre-blurred — the post sits ~6 cm from the eye and must read defocused. */
function emitterPostCanvas() {
  const s = document.createElement('canvas');
  s.width = 24; s.height = 30;
  const sc = s.getContext('2d');
  sc.clearRect(0, 0, 24, 30);
  sc.fillStyle = 'rgba(9,10,12,0.97)';
  sc.beginPath();               // tapered stem, wide foot
  sc.moveTo(5, 30); sc.lineTo(19, 30);
  sc.lineTo(15, 12); sc.lineTo(9, 12);
  sc.closePath(); sc.fill();
  sc.beginPath();               // rounded emitter head
  sc.ellipse(12, 9, 5.4, 5.8, 0, 0, 7);
  sc.fill();
  sc.fillStyle = 'rgba(110,20,14,0.5)';  // dim LED window, upper face
  sc.fillRect(10.4, 5.2, 3.2, 2.0);
  const c = document.createElement('canvas');
  c.width = 96; c.height = 120;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(s, 0, 0, 96, 120);
  return c;
}

/** ADS eye-relief / defocus ring: radial alpha with a soft dark gaussian
 *  band straddling the aperture edge and a wider skirt straddling the
 *  housing's outer silhouette. Overlaid at full ADS it blurs both edges of
 *  the rear ring the way a lens 6 cm from the eye actually renders.
 *  Plane radius = 0.026 m. */
function defocusRingCanvas(size = 256) {
  const c = vmCanvas(size);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  const d = img.data;
  const H = size / 2;
  const AP = (0.0126 / 0.026) * H;   // aperture edge in px
  const OUT = (0.0170 / 0.026) * H;  // housing outer edge in px
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x + 0.5 - H, dy = y + 0.5 - H;
      const r = Math.sqrt(dx * dx + dy * dy);
      const inner = 0.50 * Math.exp(-Math.pow((r - AP) / (AP * 0.15), 2));
      const sOut = OUT * (r > OUT ? 0.26 : 0.11);
      const outer = 0.46 * Math.exp(-Math.pow((r - OUT) / sOut, 2));
      let a = Math.min(0.62, inner + outer);
      // hold the sight-picture centre perfectly clear
      a *= Math.min(1, Math.max(0, (r - AP * 0.60) / (AP * 0.24)));
      const i = (y * size + x) * 4;
      d[i] = 6; d[i + 1] = 7; d[i + 2] = 9;
      d[i + 3] = Math.round(a * 255);
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

/** White span with soft black ends (alphaMap for tube-shaped blur shells). */
function softSpanCanvas(size = 64) {
  const c = vmCanvas(size);
  const ctx = c.getContext('2d');
  const grd = ctx.createLinearGradient(0, 0, 0, size);
  grd.addColorStop(0, 'rgb(0,0,0)');
  grd.addColorStop(0.25, 'rgb(255,255,255)');
  grd.addColorStop(0.75, 'rgb(255,255,255)');
  grd.addColorStop(1, 'rgb(0,0,0)');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, size, size);
  return c;
}

/** Radial white blob with soft edge (alphaMap for smear ribbons — the UV
 *  stretch over an elongated plane turns it into a soft-edged ellipse). */
function softBlobCanvas(size = 64) {
  const c = vmCanvas(size);
  const ctx = c.getContext('2d');
  const grd = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grd.addColorStop(0, 'rgb(255,255,255)');
  grd.addColorStop(0.5, 'rgb(255,255,255)');
  grd.addColorStop(1, 'rgb(0,0,0)');
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

/** Tiny etched data plate for the LEFT receiver face (the face the hip
 *  camera actually sees): boxed model line, two rows of fine print and a
 *  laser-etch data-matrix block. Unreadable at play distance by design. */
function receiverEtchCanvas(size = 256) {
  const c = vmCanvas(size);
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, size, size);
  ctx.strokeStyle = 'rgba(196,202,208,0.42)';
  ctx.lineWidth = size * 0.012;
  ctx.strokeRect(size * 0.05, size * 0.22, size * 0.62, size * 0.44);
  ctx.fillStyle = 'rgba(196,202,208,0.5)';
  ctx.font = `700 ${Math.round(size * 0.10)}px Arial`;
  ctx.fillText('M4A1-T', size * 0.1, size * 0.38);
  ctx.font = `500 ${Math.round(size * 0.062)}px Arial`;
  ctx.fillStyle = 'rgba(196,202,208,0.42)';
  ctx.fillText('5.56 NATO  1:7', size * 0.1, size * 0.5);
  ctx.fillText('MOD 2 - LOT 047', size * 0.1, size * 0.6);
  // data-matrix block: random etched cells
  const r = makeRNG(9109);
  const bs = size * 0.032;
  for (let y = 0; y < 5; y++) {
    for (let x = 0; x < 5; x++) {
      if (r() < 0.55) {
        ctx.fillRect(size * 0.74 + x * bs, size * 0.3 + y * bs, bs * 0.8, bs * 0.8);
      }
    }
  }
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
  const { seam, contact } = getAoMaterials();
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
         slightly browner lower so the side never reads one monochrome box.
         Vertex-colored underside gradient: -Y faces fall into shadow. --- */
  add(shadeUnder(new RoundedBoxGeometry(0.037, 0.05, 0.25, 2, 0.0085), -0.025, 0.018, 0.74),
    vm.metalMarkedV, 0, 0.012, 0);      // upper
  add(shadeUnder(new RoundedBoxGeometry(0.035, 0.044, 0.175, 2, 0.008), -0.022, 0.015, 0.68),
    vm.metalLowerV, 0, -0.028, 0.02);   // lower
  // Flared magwell with a chamfered lip
  add(shadeUnder(new RoundedBoxGeometry(0.038, 0.045, 0.07, 1, 0.007), -0.0225, 0.012, 0.62),
    vm.metalLowerV, 0, -0.047, -0.022);
  // Magwell mouth: near-black lip framing the mag so the seam stays a
  // shadow line while the mag drops during reloads.
  add(new THREE.BoxGeometry(0.0335, 0.005, 0.068), seam, 0, -0.0685, -0.022);
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
  // Etched data plate on the LEFT receiver face — the face the hip camera
  // sees. Fine print + data-matrix, unreadable at play distance.
  {
    const etch = new THREE.Mesh(
      new THREE.PlaneGeometry(0.042, 0.017),
      new THREE.MeshStandardMaterial({
        map: tex(receiverEtchCanvas(), { srgb: true }),
        transparent: true, depthWrite: false, roughness: 0.5, metalness: 0.55,
        polygonOffset: true, polygonOffsetFactor: -2,
      })
    );
    etch.material.map.wrapS = etch.material.map.wrapT = THREE.ClampToEdgeWrapping;
    etch.position.set(-0.0186, 0.011, -0.058);
    etch.rotation.y = -Math.PI / 2;
    g.add(etch);
  }

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

  /* --- charging handle: chamfered T-handle, swept ambi wings, latch --- */
  const chGroup = new THREE.Group();
  {
    const shaft = new THREE.Mesh(new RoundedBoxGeometry(0.013, 0.006, 0.035, 1, 0.002), vm.anodized);
    shaft.position.z = -0.012;
    chGroup.add(shaft);
    const tbar = new THREE.Mesh(new RoundedBoxGeometry(0.034, 0.0075, 0.012, 1, 0.003), vm.anodized);
    tbar.position.z = 0.008;
    chGroup.add(tbar);
    // swept-back wing tips so the handle silhouette isn't one straight bar
    for (const s of [-1, 1]) {
      const wing = new THREE.Mesh(new RoundedBoxGeometry(0.01, 0.007, 0.013, 1, 0.0028), vm.anodized);
      wing.position.set(s * 0.0195, 0, 0.0102);
      wing.rotation.y = s * -0.42;
      chGroup.add(wing);
    }
    const latch = new THREE.Mesh(new RoundedBoxGeometry(0.007, 0.005, 0.012, 1, 0.0018), vm.anodized);
    latch.position.set(-0.02, 0, 0.006);
    latch.rotation.y = 0.25;
    chGroup.add(latch);
    // shadow plate under the handle: seats it against the receiver top
    const chShadow = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.0018, 0.013), seam);
    chShadow.position.set(0, -0.0042, 0.008);
    chGroup.add(chShadow);
    chGroup.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  }
  chGroup.position.set(0, 0.032, 0.115);
  g.add(chGroup);
  // dark channel mouth at the receiver rear the handle slides out of
  add(new THREE.BoxGeometry(0.017, 0.008, 0.0035), seam, 0, 0.0325, 0.1245);

  /* --- monolithic top rail: dovetail extrusion + angled teeth --- */
  const railLen = 0.53;
  const railZ = -0.15; // spans z=+0.115 .. -0.415
  const rail = add(railBaseGeo(railLen), metal, 0, 0.0375, railZ);
  void rail;
  // near-black strip under the teeth: per-tooth shadow gaps
  const gapMat = new THREE.MeshStandardMaterial({ color: 0x0e0f10, roughness: 0.7, metalness: 0.3 });
  add(new THREE.BoxGeometry(0.0212, 0.0012, railLen), gapMat, 0, 0.0442, railZ);
  // teeth: shared trapezoid extrusion, anodized dark, correct ~10mm pitch.
  // Rough/env eased off round 7's values — the tooth crowns were catching
  // the sun as a row of clipped-white speculars.
  const toothMat = new THREE.MeshStandardMaterial({ color: 0x232527, roughness: 0.72, metalness: 0.5, envMapIntensity: 0.5 });
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
  add(shadeUnder(hgGeo, -0.0235, 0.02, 0.8), vm.metalV, 0, 0.012, -0.2675);
  // Support-hand contact shadow: a soft dark sleeve wrapped a hair proud of
  // the octagon where the glove clamps (hand mounts at z=-0.26), alpha
  // fading out along its length. Sells the C-clamp actually touching.
  {
    const slGeo = new THREE.CylinderGeometry(0.0245, 0.0245, 0.115, 8, 1, true);
    slGeo.rotateX(Math.PI / 2);
    slGeo.rotateZ(Math.PI / 8);
    const sl = new THREE.Mesh(slGeo, contact);
    sl.position.set(0, 0.012, -0.26);
    g.add(sl);
  }
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
  // Handguard muzzle-end mouth: dark disc filling the gap between barrel
  // and the chamfer ring so the bore of the guard reads as shadowed cavity.
  const hgMouthGeo = new THREE.CylinderGeometry(0.0168, 0.0168, 0.004, 12);
  hgMouthGeo.rotateX(Math.PI / 2);
  add(hgMouthGeo, seam, 0, 0.012, -0.4142);
  // Low-profile gas block + gas tube running back under the rail
  add(new RoundedBoxGeometry(0.018, 0.019, 0.022, 1, 0.003), metal, 0, 0.017, -0.44);
  // Barrel-to-gas-block junction: dark collars hugging both block faces
  const gbColGeo = new THREE.CylinderGeometry(0.0122, 0.0122, 0.0035, 12);
  gbColGeo.rotateX(Math.PI / 2);
  add(gbColGeo, seam, 0, 0.012, -0.4285);
  add(gbColGeo, seam, 0, 0.012, -0.4515);
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
    // crush washer: dark collar seating the birdcage against the barrel
    const cwGeo = new THREE.CylinderGeometry(0.0116, 0.0116, 0.0045, 12);
    cwGeo.rotateX(Math.PI / 2);
    add(cwGeo, seam, 0, 0.012, -0.5135);
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
  // Stock-to-receiver junction: shadow ring where the tube leaves the
  // receiver end plate, tucked behind the castle nut.
  const rearRingGeo = new THREE.CylinderGeometry(0.0178, 0.0178, 0.0035, 12);
  rearRingGeo.rotateX(Math.PI / 2);
  add(rearRingGeo, seam, 0, 0.014, 0.1235);
  const stock = new THREE.Group();
  {
    const body = new THREE.Mesh(
      shadeUnder(new RoundedBoxGeometry(0.04, 0.062, 0.105, 2, 0.011), -0.031, 0.022, 0.75), vm.polymerV);
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
    // Stock-to-buffer-tube collar: dark ring half-buried in the front face
    const scGeo = new THREE.CylinderGeometry(0.0146, 0.0146, 0.007, 12);
    scGeo.rotateX(Math.PI / 2);
    const sc = new THREE.Mesh(scGeo, getAoMaterials().seam);
    sc.position.set(0, 0.019, -0.051);
    stock.add(sc);
  }
  stock.position.set(0, -0.005, 0.27);
  stock.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  g.add(stock);

  /* --- grip + trigger --- */
  add(shadeUnder(new RoundedBoxGeometry(0.031, 0.092, 0.044, 2, 0.009), -0.046, 0.034, 0.72),
    vm.polymerV, 0, -0.085, 0.085, 0.32);
  // Trigger-hand contact shadow: soft dark sleeve around the upper grip
  {
    const gsGeo = new THREE.CylinderGeometry(1, 1, 1, 10, 1, true);
    gsGeo.scale(0.0182, 0.052, 0.0245);
    const gs = new THREE.Mesh(gsGeo, contact);
    gs.position.set(0, -0.073, 0.089);
    gs.rotation.x = 0.32;
    g.add(gs);
  }
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
    // mag-to-magwell collar: near-black band riding the mag at the well
    // mouth — the insertion seam stays a shadow from every angle.
    const collar = new THREE.Mesh(new THREE.BoxGeometry(0.0322, 0.013, 0.0675), getAoMaterials().seam);
    collar.position.set(0, -0.0155, -0.002);
    collar.rotation.x = 0.05;
    magGroup.add(collar);
  }
  magGroup.position.set(0, -0.05, -0.015);
  g.add(magGroup);

  /* --- Aimpoint T-2 style red dot on a QD riser mount --- */
  const optic = new THREE.Group();
  const anod = vm.anodized;
  let opticBodyGeo = null; // captured for the ADS blur shells
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
    // 30 segments (was 18): the coarse lathe put a sun glint at every facet
    // corner — dotted arcs around the housing that read as CG sparkle.
    const bodyGeo = new THREE.LatheGeometry(pts, 30);
    bodyGeo.rotateX(Math.PI / 2);
    opticBodyGeo = bodyGeo;
    // Dedicated worn finish (DoubleSide baked in — the shared anodized no
    // longer needs its side flipped as a side effect of the housing).
    const body = new THREE.Mesh(bodyGeo, getOpticHousingMat());
    body.castShadow = true;
    optic.add(body);
    // inner tube sleeve: UNLIT near-black, backside. This was a lit
    // standard material — on shot frames the short-throw muzzle light
    // flooded the tube through the objective and lit the whole interior
    // into a bright full-circle ring around the sight picture. A basic
    // black sleeve can never flare. Lengthened to also mask the exposed
    // eyepiece/kill-flash inner walls of the DoubleSide lathe shell.
    const innerGeo = new THREE.CylinderGeometry(0.0126, 0.0126, 0.062, 14, 1, true);
    innerGeo.rotateX(Math.PI / 2);
    const inner = new THREE.Mesh(innerGeo, new THREE.MeshBasicMaterial({
      color: 0x040506, side: THREE.BackSide,
    }));
    optic.add(inner);
    // Glass retaining ring: thin machined lip at the aperture edge so the
    // rear ring stops dead-ending in a raw black cut. Unlit dark grey —
    // muzzle light can't flare it. (Round 8: replaces the old 12-o'clock
    // "sky arc" torus, which read as a solid grey bracket floating in the
    // housing instead of a glass highlight.)
    const retain = new THREE.Mesh(
      new THREE.TorusGeometry(0.01262, 0.00042, 5, 28),
      new THREE.MeshBasicMaterial({ color: 0x24272b, toneMapped: false })
    );
    retain.position.z = 0.0272;
    retain.userData.noShadow = true;
    optic.add(retain);
    // Emitter post: the T-2's LED tower rising from the 6-o'clock inner
    // bezel to just below centre — a dark near-field silhouette with baked
    // soft edges (it sits ~6 cm from the eye, so crisp edges would be
    // wrong). Unlit; renders behind tint/shade/dot.
    const postTex = tex(emitterPostCanvas(), { srgb: true });
    postTex.wrapS = postTex.wrapT = THREE.ClampToEdgeWrapping;
    const post = new THREE.Mesh(
      new THREE.PlaneGeometry(0.0092, 0.0105),
      new THREE.MeshBasicMaterial({ map: postTex, transparent: true, depthWrite: false, toneMapped: false })
    );
    post.position.set(0, -0.00745, 0.021); // foot buried in the shade rim
    post.renderOrder = 1;
    post.userData.noShadow = true;
    optic.add(post);
    // turret caps: elevation (top) + windage-style cap (left), battery (right)
    const capGeo = new THREE.CylinderGeometry(0.0068, 0.0072, 0.007, 16);
    const capRim = new THREE.TorusGeometry(0.0065, 0.0011, 8, 24);
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
    // Edge-wear chamfer strokes: unlit grey partial arcs riding the forward
    // kill-flash rim and the turret-cap edges — rub-through crisp enough to
    // survive the ADS defocus rig (baked texture wear alone blurs away),
    // and unlit so it can never add sun sparkle. rotation order XYZ applies
    // the local Z spin first, so `.set(tilt, 0, phase)` clocks each arc
    // around its rim before laying it flat.
    const chamferMat = new THREE.MeshBasicMaterial({
      color: 0x6d737a, transparent: true, opacity: 0.85, toneMapped: false,
    });
    const wearArc = (R, tube, arc) =>
      new THREE.Mesh(new THREE.TorusGeometry(R, tube, 4, 18, arc), chamferMat);
    {
      const a1 = wearArc(0.0174, 0.00065, 1.35);  // forward rim front corner
      a1.position.z = -0.0333;
      a1.rotation.z = 1.9;
      const a2 = wearArc(0.0174, 0.00055, 0.8);   // kill-flash lip corner
      a2.position.z = -0.0287;
      a2.rotation.z = -0.5;
      const t1 = wearArc(0.0065, 0.0006, 1.5);    // top turret cap crown
      t1.position.set(0, 0.0216, 0.002);
      t1.rotation.set(Math.PI / 2, 0, 0.7);
      const t2 = wearArc(0.0065, 0.0005, 0.9);
      t2.position.set(0, 0.0216, 0.002);
      t2.rotation.set(Math.PI / 2, 0, 3.6);
      const l1 = wearArc(0.0065, 0.0006, 1.3);    // left cap crown
      l1.position.set(-0.0216, 0, 0.002);
      l1.rotation.set(0, Math.PI / 2, 1.2);
      const l2 = wearArc(0.0065, 0.0005, 0.7);
      l2.position.set(-0.0216, 0, 0.002);
      l2.rotation.set(0, Math.PI / 2, 4.4);
      const b1 = wearArc(0.0082, 0.0005, 1.0);    // battery cap face edge
      b1.position.set(0.0194, 0, 0.002);
      b1.rotation.set(0, Math.PI / 2, 2.4);
      for (const m of [a1, a2, t1, t2, l1, l2, b1]) {
        m.userData.noShadow = true;
        optic.add(m);
      }
    }
    // QD mount: riser block + base + throw lever (right) + cross bolts
    const riser = new THREE.Mesh(new RoundedBoxGeometry(0.024, 0.02, 0.046, 1, 0.003), anod);
    riser.position.y = -0.0265;
    optic.add(riser);
    const base = new THREE.Mesh(new RoundedBoxGeometry(0.03, 0.009, 0.052, 1, 0.0025), anod);
    base.position.y = -0.038;
    optic.add(base);
    // optic-to-rail junction: dark pad spilling out under the QD base so
    // the mount seats into a shadow line instead of butting bright-on-bright
    const oPad = new THREE.Mesh(new THREE.BoxGeometry(0.0316, 0.003, 0.0545), getAoMaterials().seam);
    oPad.position.y = -0.0418;
    optic.add(oPad);
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
  // Rear-ring bezel: matte dark separation line only. Round 8: these are
  // now UNLIT — as lit tori every facet crest caught the sun as a discrete
  // gold dot, stringing "dotted arc" sparkles around the housing that no
  // roughness/env tuning could fully kill. A flat unlit ring keeps the
  // separation line and can never glint.
  {
    const bezel = new THREE.Mesh(new THREE.TorusGeometry(0.0164, 0.0009, 10, 48),
      new THREE.MeshBasicMaterial({ color: 0x16181b, toneMapped: false }));
    bezel.position.z = 0.0285;
    optic.add(bezel);
    const bezelF = new THREE.Mesh(new THREE.TorusGeometry(0.0171, 0.0008, 10, 48),
      new THREE.MeshBasicMaterial({ color: 0x111315, toneMapped: false }));
    bezelF.position.z = -0.0335;
    optic.add(bezelF);
  }
  // Glass panes: nearly clear dark-neutral coated lenses. Opacity is kept
  // tiny so the through-tube scene stays exposure-matched to the outside;
  // the blue-green read comes from the radial edge tint below, not from a
  // milky full-disc film.
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x252b2d, roughness: 0.06, metalness: 0, transparent: true, opacity: 0.05,
    envMapIntensity: 0.4, side: THREE.DoubleSide, depthWrite: false,
  });
  const rearGlass = new THREE.Mesh(new THREE.CircleGeometry(0.0126, 30), glassMat);
  rearGlass.position.z = 0.024;
  rearGlass.renderOrder = 1;
  optic.add(rearGlass);
  const frontGlass = new THREE.Mesh(new THREE.CircleGeometry(0.0126, 30), glassMat);
  frontGlass.position.z = -0.027;
  frontGlass.renderOrder = 1;
  optic.add(frontGlass);
  // Objective lens seen from OUTSIDE: near-opaque dark coated glass with a
  // faint sky glint. Faces the muzzle only (backface-culled from the ADS
  // eye) so the sight picture stays clear while hip/third-person angles
  // read dark glass instead of an open tube.
  const objDark = new THREE.Mesh(new THREE.CircleGeometry(0.0126, 30),
    new THREE.MeshPhysicalMaterial({
      color: 0x0b1315, roughness: 0.06, metalness: 0, transparent: true, opacity: 0.9,
      envMapIntensity: 1.1, side: THREE.FrontSide, depthWrite: false,
    }));
  objDark.position.z = -0.0278;
  objDark.rotation.y = Math.PI; // face -Z (muzzle-ward)
  objDark.renderOrder = 1;
  optic.add(objDark);
  // Lens tint: radial multiply — unity centre, blue-green rim only
  const tintTex = tex(lensTintCanvas(), {});
  tintTex.wrapS = tintTex.wrapT = THREE.ClampToEdgeWrapping;
  const tintMat = new THREE.MeshBasicMaterial({
    map: tintTex,
    blending: THREE.MultiplyBlending, transparent: true,
    depthWrite: false, toneMapped: false, side: THREE.DoubleSide,
  });
  const tint = new THREE.Mesh(new THREE.CircleGeometry(0.0126, 30), tintMat);
  tint.position.z = 0.0235;
  tint.renderOrder = 2;
  optic.add(tint);
  // Additive teal rim catch: the coated-glass sheen at the lens perimeter
  // (the multiply tint above can only darken). LDR values — never blooms.
  // Base opacity is a whisper at hip; setAdsFocus lifts it slightly when
  // the eye is on the tube.
  const sheenTex = tex(lensRimSheenCanvas(), {});
  sheenTex.wrapS = sheenTex.wrapT = THREE.ClampToEdgeWrapping;
  const rimSheen = new THREE.Mesh(new THREE.CircleGeometry(0.0127, 24),
    new THREE.MeshBasicMaterial({
      map: sheenTex, transparent: true, blending: THREE.AdditiveBlending,
      depthWrite: false, toneMapped: false, opacity: 0.3,
    }));
  rimSheen.position.z = 0.0237;
  rimSheen.renderOrder = 3;
  optic.add(rimSheen);
  // One soft diagonal arc reflection sliding across the upper glass.
  const streakTex = tex(lensStreakCanvas(), {});
  streakTex.wrapS = streakTex.wrapT = THREE.ClampToEdgeWrapping;
  const streak = new THREE.Mesh(new THREE.CircleGeometry(0.01245, 24),
    new THREE.MeshBasicMaterial({
      map: streakTex, transparent: true, depthWrite: false,
      toneMapped: false, opacity: 0.22,
    }));
  streak.position.z = 0.0242;
  streak.rotation.z = -0.38;
  streak.renderOrder = 3;
  optic.add(streak);
  // Matching curved catch on the OBJECTIVE glass, seen through the tube: a
  // smaller apparent disc at a different clock angle than the eyepiece arc
  // (upper-LEFT, clear of both the rear streak and the muzzle-flash bloom
  // that floods the lower sight picture on fired frames), so the two
  // glasses read as separate curved surfaces. FrontSide only — invisible
  // from the muzzle side, so the exterior objDark read stands.
  const streakF = new THREE.Mesh(new THREE.CircleGeometry(0.0124, 24),
    new THREE.MeshBasicMaterial({
      map: streakTex, transparent: true, depthWrite: false,
      toneMapped: false, opacity: 0.18,
    }));
  streakF.position.z = -0.0258;
  streakF.rotation.z = 0.7;
  streakF.renderOrder = 1;
  optic.add(streakF);
  // Inner-tube occlusion: radial gradient darkening the outer ~15% of the
  // sight picture into the housing
  const shadeTex = tex(tubeShadeCanvas(), {});
  shadeTex.wrapS = shadeTex.wrapT = THREE.ClampToEdgeWrapping;
  const shade = new THREE.Mesh(new THREE.CircleGeometry(0.0128, 30),
    new THREE.MeshBasicMaterial({
      map: shadeTex, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    }));
  shade.position.z = 0.023;
  shade.renderOrder = 3;
  optic.add(shade);
  // Reticle: crisp 2-MOA dot (2-3px HDR hot core) + soft bloom halo skirt.
  // transparent + starts hidden: WeaponSystem fades both in with adsFrac —
  // at hip/third-person angles the emitter must never read through the
  // tube (the old always-on HDR dot bloomed into a taillight around the
  // optic in hip shots).
  const dot = new THREE.Mesh(new THREE.CircleGeometry(0.00055, 12),
    new THREE.MeshBasicMaterial({ toneMapped: false, depthWrite: false, transparent: true }));
  dot.material.color.setRGB(10.5, 0.32, 0.24);
  dot.position.z = -0.01;
  dot.renderOrder = 4;
  dot.visible = false;
  optic.add(dot);
  const haloTex = tex(dotHaloCanvas(), { srgb: true });
  haloTex.wrapS = haloTex.wrapT = THREE.ClampToEdgeWrapping;
  const halo = new THREE.Mesh(new THREE.CircleGeometry(0.0022, 14),
    new THREE.MeshBasicMaterial({
      map: haloTex, transparent: true, blending: THREE.AdditiveBlending,
      depthWrite: false, toneMapped: false, opacity: 0.5,
    }));
  halo.material.color.setRGB(2.6, 0.18, 0.13);
  halo.position.z = -0.0112;
  halo.renderOrder = 5;
  halo.visible = false;
  optic.add(halo);

  optic.position.set(0, 0.085, -0.01);
  optic.traverse((o) => { if (o.isMesh && !o.userData.noShadow) o.castShadow = true; });
  rearGlass.castShadow = frontGlass.castShadow = objDark.castShadow =
    tint.castShadow = shade.castShadow = dot.castShadow = halo.castShadow = false;
  rimSheen.castShadow = streak.castShadow = streakF.castShadow = false;
  g.add(optic);

  /* --- ADS near-field defocus rig -----------------------------------
     At 5-8 cm eye relief the eye cannot hold the housing in focus while
     converged on the target, but the renderer draws both tack-sharp — the
     loudest "rendered, not photographed" tell. No post passes on
     SwiftShader, so fake it geometrically:
       (a) inflated low-alpha "blur shells" copying the housing and barrel
           shroud silhouettes — their stacked translucent skins bleed the
           edges outward like a defocus penumbra;
       (b) a radial penumbra/vignette quad straddling both edges of the
           rear ring (eye-relief falloff hugging the tube rim);
       (c) a soft smear ribbon lying over the rail-tooth comb so the
           near-field speculars melt together instead of reading as a
           razor comb.
     Everything is opacity-driven from WeaponSystem via setAdsFocus(k) —
     at the hip (k=0) the rig is invisible and the round-7 look is
     untouched. */
  const adsFocusParts = [];
  {
    // (a) housing blur shells
    for (const [scale, op] of [[1.07, 0.4], [1.16, 0.15]]) {
      const sh = new THREE.Mesh(opticBodyGeo, new THREE.MeshBasicMaterial({
        color: 0x0b0c0e, transparent: true, opacity: 0, depthWrite: false,
      }));
      sh.scale.setScalar(scale);
      sh.renderOrder = 6;
      sh.visible = false;
      sh.castShadow = false;
      optic.add(sh);
      adsFocusParts.push({ mesh: sh, op });
    }
    // (b) rear-ring penumbra + eye-relief vignette
    const focusTex = tex(defocusRingCanvas(), {});
    focusTex.wrapS = focusTex.wrapT = THREE.ClampToEdgeWrapping;
    const focusRing = new THREE.Mesh(new THREE.PlaneGeometry(0.052, 0.052),
      new THREE.MeshBasicMaterial({
        map: focusTex, transparent: true, depthWrite: false,
        toneMapped: false, opacity: 0,
      }));
    focusRing.position.z = 0.0305;
    focusRing.renderOrder = 8;
    focusRing.visible = false;
    focusRing.castShadow = false;
    optic.add(focusRing);
    adsFocusParts.push({ mesh: focusRing, op: 0.85 });
    // (a2) barrel-shroud blur shells: open cylinders hugging the octagon,
    // alpha fading out along their length so the shells have no end rings
    const spanTex = tex(softSpanCanvas(), {});
    spanTex.wrapS = spanTex.wrapT = THREE.ClampToEdgeWrapping;
    for (const [inflate, op] of [[1.09, 0.28], [1.21, 0.12]]) {
      const geoS = new THREE.CylinderGeometry(0.0235 * inflate, 0.0235 * inflate, 0.3, 8, 1, true);
      geoS.rotateX(Math.PI / 2);
      geoS.rotateZ(Math.PI / 8);
      const sh = new THREE.Mesh(geoS, new THREE.MeshBasicMaterial({
        color: 0x101214, transparent: true, opacity: 0, depthWrite: false,
        alphaMap: spanTex,
      }));
      sh.position.set(0, 0.012, -0.2675);
      sh.renderOrder = 6;
      sh.visible = false;
      g.add(sh);
      adsFocusParts.push({ mesh: sh, op });
    }
    // (c) rail-tooth smear ribbon: soft-edged ellipse lying just above the
    // tooth crowns; from the ADS eye it foreshortens over the whole comb
    const blobTex = tex(softBlobCanvas(), {});
    blobTex.wrapS = blobTex.wrapT = THREE.ClampToEdgeWrapping;
    const ribbonGeo = new THREE.PlaneGeometry(0.034, 0.31);
    ribbonGeo.rotateX(-Math.PI / 2);
    const ribbon = new THREE.Mesh(ribbonGeo, new THREE.MeshBasicMaterial({
      color: 0x121416, transparent: true, opacity: 0, depthWrite: false,
      alphaMap: blobTex, side: THREE.DoubleSide,
    }));
    ribbon.position.set(0, 0.0492, -0.205);
    ribbon.renderOrder = 6;
    ribbon.visible = false;
    g.add(ribbon);
    adsFocusParts.push({ mesh: ribbon, op: 0.34 });
  }
  let adsFocusK = -1;
  const setAdsFocus = (adsFrac) => {
    const k = THREE.MathUtils.clamp((adsFrac - 0.35) / 0.6, 0, 1);
    if (k === adsFocusK) return;
    adsFocusK = k;
    const on = k > 0.02;
    for (const p of adsFocusParts) {
      p.mesh.visible = on;
      p.mesh.material.opacity = p.op * k;
    }
    // coated-glass rim catch presents a little stronger on-axis
    rimSheen.material.opacity = 0.3 + 0.3 * k;
  };

  /* --- low-profile folded backup sights --- */
  add(new RoundedBoxGeometry(0.012, 0.008, 0.018, 1, 0.002), metal, 0, 0.049, -0.385);
  add(new RoundedBoxGeometry(0.014, 0.007, 0.02, 1, 0.002), metal, 0, 0.049, 0.095);

  /* --- PEQ-15 laser box on the left rail: chamfered FDE body with an
         anodized deck, twin emitter hoods, rear battery cap, moulding seam
         and a shadowed clamp wedge onto the handguard --- */
  add(shadeUnder(new RoundedBoxGeometry(0.021, 0.026, 0.058, 2, 0.0045), -0.013, 0.01, 0.72),
    vm.fdeV, -0.028, 0.028, -0.2);
  add(new RoundedBoxGeometry(0.0185, 0.0045, 0.05, 1, 0.0018), vm.anodized, -0.028, 0.0402, -0.2); // top deck
  add(new THREE.CylinderGeometry(0.003, 0.003, 0.004, 8), vm.anodized, -0.028, 0.0438, -0.185);    // fire button
  // emitter hoods + apertures on the muzzle-side face
  const hoodGeo = new THREE.CylinderGeometry(0.0052, 0.0056, 0.007, 10);
  hoodGeo.rotateX(Math.PI / 2);
  add(hoodGeo, vm.anodized, -0.033, 0.033, -0.2275);
  const hood2Geo = new THREE.CylinderGeometry(0.0032, 0.0035, 0.006, 8);
  hood2Geo.rotateX(Math.PI / 2);
  add(hood2Geo, vm.anodized, -0.0235, 0.033, -0.227);
  add(new THREE.CircleGeometry(0.0035, 8), new THREE.MeshBasicMaterial({ color: 0x2a0000 }), -0.033, 0.033, -0.2312, 0, Math.PI, 0);
  add(new THREE.CircleGeometry(0.002, 8), new THREE.MeshBasicMaterial({ color: 0x0d0503 }), -0.0235, 0.033, -0.2305, 0, Math.PI, 0);
  // rear battery cap + moulding seam line
  const battGeo = new THREE.CylinderGeometry(0.0058, 0.0062, 0.0035, 10);
  battGeo.rotateX(Math.PI / 2);
  add(battGeo, vm.anodized, -0.028, 0.024, -0.1702);
  add(new THREE.BoxGeometry(0.0214, 0.0012, 0.0562), seam, -0.028, 0.0295, -0.2);
  // rail-clamp wedge: dark block bridging body to the handguard side
  add(new THREE.BoxGeometry(0.008, 0.016, 0.048), seam, -0.0195, 0.024, -0.2);

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

  return { group: g, muzzle, ejectPort, magGroup, chGroup, opticDot: dot, opticHalo: halo, adsAnchor: optic, updateDot, setAdsFocus, stockGroup: stock };
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
  // Trigger-hand contact shadow around the upper grip
  {
    const gsGeo = new THREE.CylinderGeometry(1, 1, 1, 10, 1, true);
    gsGeo.scale(0.0168, 0.05, 0.0272);
    const gs = new THREE.Mesh(gsGeo, getAoMaterials().contact);
    gs.position.set(0, -0.0505, 0.058);
    gs.rotation.x = 0.28;
    g.add(gs);
  }
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
  const { glove, gloveFinger, gloveDark, glovePalm, thread } = getGloveMaterials();
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
      const seg = new THREE.Mesh(capsuleGeo(i === lens.length - 1 ? r * 0.88 : r, L + r * 1.4), gloveFinger);
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

  /** Near-black slivers recessed between adjacent finger roots: the
   *  shadow channel that visually SEPARATES fingers wrapped on a bar —
   *  without them the parallel capsules fuse into one smooth mitten mass
   *  from the player camera. */
  const addGapShims = (F, len = 0.028) => {
    const gapMat = getAoMaterials().seam;
    for (let i = 0; i < F.length - 1; i++) {
      const a = F[i], b = F[i + 1];
      const phi = (a.phi0 + b.phi0) / 2;
      const Rr = barR + Math.min(a.r, b.r) * 0.35;
      const th = wx * (Math.PI / 2 - phi);
      const shim = new THREE.Mesh(new THREE.BoxGeometry(0.011, len, 0.0032), gapMat);
      // root ring position, then slide half the channel length up the
      // (rotated) proximal-segment direction so the sliver spans the gap.
      shim.position.set(
        wx * Math.sin(phi) * Rr - Math.sin(th) * (len * 0.42),
        Math.cos(phi) * Rr + Math.cos(th) * (len * 0.42),
        (a.z + b.z) / 2);
      shim.rotation.z = th;
      g.add(shim);
    }
  };

  if (kind === 'support') {
    // four fingers spaced along the handguard, wrapping over the top; the
    // roots sit just past the camera-side equator so each proximal segment
    // rises into view before curling away. Fans splayed so the fingertip
    // crowns cresting the rail land at visibly different spots.
    const F = [
      { z: 0.034, lens: [0.030, 0.024, 0.019], r: 0.0074, phi0: 1.62, curl: 0.94, fan: -0.09 },
      { z: 0.0125, lens: [0.033, 0.027, 0.021], r: 0.0076, phi0: 1.66, curl: 0.98, fan: -0.03 },
      { z: -0.009, lens: [0.031, 0.025, 0.020], r: 0.0073, phi0: 1.64, curl: 1.02, fan: 0.04 },
      { z: -0.030, lens: [0.025, 0.020, 0.017], r: 0.0066, phi0: 1.55, curl: 1.08, fan: 0.11 },
    ];
    for (const f of F) makeFinger(f.z, f.lens, f.r, f.phi0, f.curl, f.fan, 0.16);
    addGapShims(F, 0.03);
    // thumb: rides the far-side top rail pointing at the muzzle
    const thumbRoot = new THREE.Group();
    thumbRoot.position.set(-wx * 0.021, 0.008, 0.032);
    thumbRoot.rotation.set(-1.28, 0, -wx * 0.38);
    const th1 = new THREE.Mesh(capsuleGeo(0.0082, 0.043), gloveFinger);
    th1.position.y = 0.016;
    thumbRoot.add(th1);
    // Dorsal thumb plate + stitched joint seam: from the player camera the
    // thumb lies along the top rail and used to read as one smooth
    // sausage; the dark plate and seam ring break it into glove panels.
    const thPlate = new THREE.Mesh(plateGeo, gloveDark);
    thPlate.rotation.y = Math.PI / 2;
    thPlate.position.set(0, 0.021, 0.0062);
    thumbRoot.add(thPlate);
    const thSeam = new THREE.Mesh(new THREE.TorusGeometry(0.0077, 0.0013, 5, 12), thread);
    thSeam.rotation.x = Math.PI / 2;
    thSeam.position.y = 0.0335;
    thumbRoot.add(thSeam);
    const th2g = new THREE.Group();
    th2g.position.y = 0.034;
    th2g.rotation.x = 0.22;
    th2g.rotation.z = -wx * 0.18;
    const th2 = new THREE.Mesh(capsuleGeo(0.0074, 0.038), gloveFinger);
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
    addGapShims(F, 0.026);
    // … index finger indexed forward alongside the trigger guard
    const idx = new THREE.Group();
    idx.position.set(wx * 0.026, -0.004, 0.032);
    idx.rotation.z = wx * 0.5;
    idx.rotation.x = -0.12;
    const i1 = new THREE.Mesh(capsuleGeo(0.0074, 0.042), gloveFinger);
    i1.position.y = 0.015;
    idx.add(i1);
    const i2g = new THREE.Group();
    i2g.position.y = 0.033;
    i2g.rotation.z = wx * 0.28;
    const i2 = new THREE.Mesh(capsuleGeo(0.0067, 0.036), gloveFinger);
    i2.position.y = 0.012;
    i2g.add(i2);
    idx.add(i2g);
    g.add(idx);
    // thumb wrapping the far side over the backstrap
    const thumbRoot = new THREE.Group();
    thumbRoot.position.set(-wx * 0.024, -0.012, 0.026);
    thumbRoot.rotation.set(-0.85, 0, -wx * 0.62);
    const th1 = new THREE.Mesh(capsuleGeo(0.0084, 0.045), gloveFinger);
    th1.position.y = 0.017;
    thumbRoot.add(th1);
    const th2g = new THREE.Group();
    th2g.position.y = 0.037;
    th2g.rotation.z = -wx * 0.85;
    const th2 = new THREE.Mesh(capsuleGeo(0.0074, 0.036), gloveFinger);
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
  // Lighter clarino palm patch: proud panel wrapping the palm underside
  // plus a heel lip rising up the EYE-side face (-wx — the gun sits right
  // of screen centre, so the camera sees the -X flank) — the two-tone
  // glove read the player camera actually sees.
  const patch = new THREE.Mesh(new RoundedBoxGeometry(0.066, 0.009, 0.074, 1, 0.0035), glovePalm);
  patch.position.set(wx * 0.004, -(barR + 0.0245), 0.003);
  patch.rotation.z = wx * -0.06;
  g.add(patch);
  const patchHeel = new THREE.Mesh(new RoundedBoxGeometry(0.0075, 0.026, 0.064, 1, 0.0032), glovePalm);
  patchHeel.position.set(-wx * 0.0312, -(barR + 0.0125), 0.003);
  patchHeel.rotation.z = wx * 0.14;
  g.add(patchHeel);
  // metacarpal bridge: no longer one tan slab — a heavily chamfered
  // hand-back pad plus a narrower tapered upper wedge toward the fingers
  const meta = new THREE.Mesh(new RoundedBoxGeometry(0.023, 0.048, 0.082, 1, 0.0105), glove);
  meta.position.set(wx * (barR + 0.001), -0.017, 0.004);
  meta.rotation.z = wx * 0.28;
  g.add(meta);
  const metaUp = new THREE.Mesh(new RoundedBoxGeometry(0.018, 0.03, 0.074, 1, 0.0085), glove);
  metaUp.position.set(wx * (barR + 0.0065), 0.006, 0.0035);
  metaUp.rotation.z = wx * 0.44;
  g.add(metaUp);
  // knuckle bumps at the finger roots break up the hand-back silhouette
  const knGeo = new THREE.SphereGeometry(0.0062, 6, 4);
  for (const kz of [0.031, 0.010, -0.011, -0.031]) {
    const kn = new THREE.Mesh(knGeo, glove);
    kn.position.set(wx * (barR + 0.004), 0.0005, kz);
    kn.scale.set(1, 1.2, 0.92);
    g.add(kn);
  }
  // baked-shadow wedge tucked in the palm/hand-back seam
  const seamW = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.01, 0.068), getAoMaterials().seam);
  seamW.position.set(wx * (barR - 0.006), -(barR + 0.003), 0.004);
  seamW.rotation.z = wx * 0.4;
  g.add(seamW);
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

  const { sleeve: sleeveMat, cuff: cuffMat } = getVmSleeveMats();
  const fwd = new THREE.Vector3(0, 0, 1);
  const ringQ = new THREE.Quaternion().setFromUnitVectors(fwd, sleeveDir);

  // Cuff junction band: ribbed dark elastic knit between the glove and the
  // camo sleeve — the two garments used to run together as one smooth
  // beige-to-camo tube with no break at the wrist.
  const elastic = new THREE.Mesh(new THREE.CylinderGeometry(0.0335, 0.0348, 0.036, 14), cuffMat);
  elastic.position.copy(wrist).addScaledVector(sleeveDir, 0.057);
  elastic.quaternion.copy(alongSleeve);
  g.add(elastic);

  // Camo sleeve tube: fold striations live in the material; radial vertex
  // noise wobbles the silhouette so the tube stops reading as a lathed
  // cone. Amplitude fades toward the wrist so the cuff junction stays snug.
  const sleeveGeo = new THREE.CylinderGeometry(0.0378, 0.046, 0.222, 16, 8);
  {
    const p = sleeveGeo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const rr = Math.hypot(x, z);
      if (rr < 0.004) continue; // cap centres stay put
      const a = Math.atan2(z, x);
      const t = (y + 0.111) / 0.222;          // 0 elbow end -> 1 wrist end
      const amp = 0.0031 * (1 - t * 0.75);
      const n = Math.sin(a * 3 + y * 52) * 0.6 + Math.sin(a * 5 - y * 27 + 1.7) * 0.4;
      const k = 1 + (n * amp) / rr;
      p.setXYZ(i, x * k, y, z * k);
    }
    sleeveGeo.computeVertexNormals();
    weldVertexNormals(sleeveGeo);
  }
  const sleeve = new THREE.Mesh(sleeveGeo, sleeveMat);
  sleeve.position.copy(wrist).addScaledVector(sleeveDir, 0.181);
  sleeve.quaternion.copy(alongSleeve);
  g.add(sleeve);
  // Rolled hem lip at the sleeve mouth, overhanging the narrower elastic…
  const lip = new THREE.Mesh(new THREE.TorusGeometry(0.0362, 0.0034, 6, 16), sleeveMat);
  lip.position.copy(wrist).addScaledVector(sleeveDir, 0.0715);
  lip.quaternion.copy(ringQ);
  g.add(lip);
  // …with a soft contact shadow ring tucked under the overhang.
  const lipAo = new THREE.Mesh(new THREE.CylinderGeometry(0.0342, 0.0349, 0.016, 14, 1, true), getAoMaterials().contact);
  lipAo.position.copy(wrist).addScaledVector(sleeveDir, 0.061);
  lipAo.quaternion.copy(alongSleeve);
  g.add(lipAo);
  // Interior seam collar: near-black liner plugging the cuff/sleeve mouth.
  // The sleeve/cuff walls are front-side only, so grazing sightlines into
  // their junction used to see straight through to lit background — the
  // arm read hollow-bright at the wrist seam. The liner sits just inside
  // the glove cuff / elastic / sleeve radii and swallows those sightlines
  // as cuff shadow.
  const liner = new THREE.Mesh(new THREE.CylinderGeometry(0.0322, 0.0326, 0.05, 12), getAoMaterials().seam);
  liner.position.copy(wrist).addScaledVector(sleeveDir, 0.05);
  liner.quaternion.copy(alongSleeve);
  g.add(liner);

  // Fold-bunch rings riding the tube, tilted slightly off-axis so they
  // read as gathered cloth rather than machined collars.
  for (const [dist, rr, tilt] of [[0.132, 0.0405, 0.09], [0.235, 0.0455, -0.06]]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(rr, 0.005, 5, 14), sleeveMat);
    ring.position.copy(wrist).addScaledVector(sleeveDir, dist);
    ring.quaternion.copy(ringQ);
    ring.rotateX(tilt);
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
