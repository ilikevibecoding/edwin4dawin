import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { getMaterialLib, tex, camoSet } from '../world/textures.js';
import { makeRNG } from '../core/math.js';

/**
 * Procedural weapon models. The first-person rifle is high-detail (rails,
 * optic, foregrip, mag, stock); enemies carry a simplified AK. Gloved hands
 * with articulated fingers and camo sleeves complete the viewmodel.
 * Forward = -Z.
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
      w: 0.6 + rng() * 0.9, k: 0.12 + rng() * 0.16,
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
    // base #35383c with +-6% fbm speckle
    const n = (mottle(u, v) - 0.5) * 0.12 + (speck(u, v) - 0.5) * 0.07;
    let r = 53 * (1 + n), g = 56 * (1 + n), b = 60 * (1 + n);
    // edge-wear highlights: box-face UV borders land on mesh edges
    const e = Math.min(u, 1 - u, v, 1 - v);
    if (e < 0.06) {
      const w = (1 - e / 0.06) * Math.max(0, wearN(u, v) * 1.7 - 0.62);
      r += 52 * w; g += 54 * w; b += 56 * w;
    }
    return [r, g, b];
  });
  drawScratches(metalAlbedo.getContext('2d'), '168,174,180');

  const metalRough = vmPaint(S, (u, v) => {
    // 0.32 - 0.55, slightly polished on worn edges
    let r = 82 + speck(u, v) * 46 + mottle(u, v) * 12;
    const e = Math.min(u, 1 - u, v, 1 - v);
    if (e < 0.06) r -= (1 - e / 0.06) * Math.max(0, wearN(u, v) * 1.7 - 0.62) * 30;
    return [r, r, r];
  });
  drawScratches(metalRough.getContext('2d'), '58,58,58', 1.6);

  const metalNormal = vmNormalFromHeight(S, (u, v) => speck(u, v) * 0.45 + mottle(u, v) * 0.2, 0.55);

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
    // Takedown pins + screws: recessed dark circles with a thin catch-light
    // rim (and slots on two) — machined fastener detail on the receiver.
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
    pin(S * 0.155, S * 0.44, S * 0.021, false); // front takedown pin
    pin(S * 0.79, S * 0.42, S * 0.021, false);  // rear takedown pin
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
  // Low-roughness wear stripe for rail tops / receiver top edges — the thin
  // bright line where finish rubs off and bare alloy catches the sun.
  const wearStripe = new THREE.MeshStandardMaterial({
    color: 0x83888e, roughness: 0.18, metalness: 0.92, envMapIntensity: 1.6,
  });

  VM_MATS = { metal, metalMarked, metalLower, polymer, fde, wearStripe };
  return VM_MATS;
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

/** Soft radial halo sprite for the red-dot bloom catcher. */
function haloCanvas(size = 64) {
  const c = vmCanvas(size);
  const ctx = c.getContext('2d');
  const grd = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grd.addColorStop(0, 'rgba(255,255,255,0.9)');
  grd.addColorStop(0.35, 'rgba(255,255,255,0.35)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, size, size);
  return c;
}

export function buildRifleViewmodel() {
  const lib = getMaterialLib();
  const vm = getVmMaterials();
  const g = new THREE.Group();
  const metal = vm.metal;
  const polymer = vm.polymer;
  const tan = lib.gunTan;

  const add = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
    m.castShadow = true;
    g.add(m);
    return m;
  };

  /* --- lower/upper receiver (parkerized, with stamped markings) ---
     graphite upper / slightly browner lower splits the monochrome slab */
  add(new RoundedBoxGeometry(0.037, 0.05, 0.24, 2, 0.006), vm.metalMarked, 0, 0.012, 0);      // upper
  add(new RoundedBoxGeometry(0.034, 0.045, 0.17, 2, 0.006), vm.metalLower, 0, -0.03, 0.02);   // lower
  // Edge-wear stripes along the receiver top edges: low-roughness bright
  // lines where the finish has rubbed through.
  const wearGeoR = new THREE.BoxGeometry(0.002, 0.0014, 0.235);
  for (const s of [-1, 1]) add(wearGeoR, vm.wearStripe, s * 0.018, 0.0366, 0);
  // FDE mag release above the magwell (right side)
  add(new THREE.BoxGeometry(0.005, 0.013, 0.019), vm.fde, 0.018, -0.02, -0.036);
  // Ejection port
  add(new THREE.BoxGeometry(0.004, 0.02, 0.06), new THREE.MeshStandardMaterial({ color: 0x484a4c, roughness: 0.3, metalness: 0.9 }), 0.02, 0.012, -0.02);
  // Forward assist + case deflector
  add(new THREE.CylinderGeometry(0.008, 0.008, 0.012, 8), metal, 0.02, 0.016, 0.045, 0, 0, Math.PI / 2);
  // Charging handle
  const chGroup = new THREE.Group();
  const ch = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.008, 0.03), polymer);
  chGroup.add(ch);
  chGroup.position.set(0, 0.032, 0.115);
  g.add(chGroup);

  /* --- top rail with picatinny teeth (1913-ish: 0.010m pitch, low) --- */
  add(new THREE.BoxGeometry(0.026, 0.008, 0.42), metal, 0, 0.042, -0.1);
  const toothMat = new THREE.MeshStandardMaterial({ color: 0x232527, roughness: 0.78, metalness: 0.45 });
  const toothGeo = new THREE.BoxGeometry(0.026, 0.0028, 0.0058);
  for (let i = 0; i < 40; i++) {
    add(toothGeo, toothMat, 0, 0.0474, -0.295 + i * 0.010);
  }
  // Wear stripes along the rail top edges — holster/optic drag polish
  const wearGeoT = new THREE.BoxGeometry(0.002, 0.0014, 0.42);
  for (const s of [-1, 1]) add(wearGeoT, vm.wearStripe, s * 0.0125, 0.0465, -0.1);

  /* --- handguard (octagonal, extended so <=0.09m of bare barrel shows) --- */
  const hgGeo = new THREE.CylinderGeometry(0.026, 0.026, 0.30, 8);
  hgGeo.rotateX(Math.PI / 2);
  add(hgGeo, metal, 0, 0.012, -0.2675);
  // M-LOK style side slots
  const slotMat = new THREE.MeshStandardMaterial({ color: 0x121314, roughness: 0.8 });
  for (const s of [-1, 1]) {
    for (let i = 0; i < 5; i++) {
      add(new THREE.BoxGeometry(0.004, 0.011, 0.032), slotMat, s * 0.0255, 0.012, -0.15 - i * 0.052);
    }
  }

  /* --- barrel + muzzle device --- */
  const barrelGeo = new THREE.CylinderGeometry(0.0115, 0.0115, 0.17, 12);
  barrelGeo.rotateX(Math.PI / 2);
  add(barrelGeo, metal, 0, 0.012, -0.43);
  // Birdcage flash hider: 4 through-slots, ring grooves at base + bell, and
  // a dark crown/bore face so the front end reads machined, not bare.
  const mdGeo = new THREE.CylinderGeometry(0.016, 0.0175, 0.06, 12);
  mdGeo.rotateX(Math.PI / 2);
  const md = add(mdGeo, metal, 0, 0.012, -0.535);
  const slotMatMd = new THREE.MeshStandardMaterial({ color: 0x0c0c0c, roughness: 0.5 });
  for (let i = 0; i < 4; i++) {
    add(new THREE.BoxGeometry(0.038, 0.0035, 0.011), slotMatMd,
      0, 0.012, -0.516 - i * 0.0145, 0, 0, (i * Math.PI) / 3.5 + 0.35);
  }
  void md;
  const grooveMat = new THREE.MeshStandardMaterial({ color: 0x101112, roughness: 0.55, metalness: 0.6 });
  for (const [gz, gr] of [[-0.509, 0.0163], [-0.558, 0.0172]]) {
    const groove = add(new THREE.TorusGeometry(gr, 0.0012, 6, 18), grooveMat, 0, 0.012, gz);
    void groove;
  }
  // Crown: near-black bore face at the tip
  const crown = add(new THREE.CircleGeometry(0.0105, 14),
    new THREE.MeshStandardMaterial({ color: 0x060606, roughness: 0.85 }), 0, 0.012, -0.5655);
  crown.rotation.y = Math.PI;
  // Low-profile gas block + exposed gas tube running back under the rail
  add(new THREE.BoxGeometry(0.018, 0.02, 0.02), metal, 0, 0.016, -0.44);
  add(new THREE.BoxGeometry(0.014, 0.009, 0.022), metal, 0, 0.0265, -0.442);
  const gtGeo = new THREE.CylinderGeometry(0.0026, 0.0026, 0.04, 8);
  gtGeo.rotateX(Math.PI / 2);
  add(gtGeo, metal, 0, 0.0285, -0.425);

  /* --- stock --- */
  add(new THREE.BoxGeometry(0.03, 0.026, 0.17), metal, 0, 0.012, 0.2);          // buffer tube
  const stock = new THREE.Group();
  const stockBody = new THREE.Mesh(new RoundedBoxGeometry(0.042, 0.075, 0.11, 2, 0.008), polymer);
  stock.add(stockBody);
  const buttpad = new THREE.Mesh(new RoundedBoxGeometry(0.045, 0.11, 0.02, 2, 0.006), vm.fde);
  buttpad.position.set(0, -0.012, 0.062);
  stock.add(buttpad);
  stock.position.set(0, -0.005, 0.27);
  stock.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  g.add(stock);

  /* --- grip + trigger --- */
  const grip = add(new RoundedBoxGeometry(0.032, 0.095, 0.045, 2, 0.008), polymer, 0, -0.085, 0.085, 0.32);
  void grip;
  // FDE grip side panels
  for (const s of [-1, 1]) {
    add(new RoundedBoxGeometry(0.004, 0.058, 0.032, 1, 0.002), vm.fde, s * 0.0155, -0.087, 0.086, 0.32);
  }
  add(new THREE.BoxGeometry(0.006, 0.028, 0.008), metal, 0, -0.055, 0.045);      // trigger
  // Trigger guard
  const tgGeo = new THREE.TorusGeometry(0.024, 0.0035, 6, 14, Math.PI);
  add(tgGeo, polymer, 0, -0.062, 0.048, 0, Math.PI / 2, 0);

  /* --- magazine (curved, animatable) --- */
  const magGroup = new THREE.Group();
  const mag1 = new THREE.Mesh(new RoundedBoxGeometry(0.03, 0.085, 0.062, 2, 0.006), polymer);
  mag1.position.set(0, -0.04, 0);
  magGroup.add(mag1);
  const mag2 = new THREE.Mesh(new RoundedBoxGeometry(0.03, 0.075, 0.06, 2, 0.006), polymer);
  mag2.position.set(0, -0.105, -0.012);
  mag2.rotation.x = 0.22;
  magGroup.add(mag2);
  const magBase = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.012, 0.066), polymer);
  magBase.position.set(0, -0.145, -0.02);
  magBase.rotation.x = 0.22;
  magGroup.add(magBase);
  magGroup.position.set(0, -0.05, -0.015);
  magGroup.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  g.add(magGroup);

  /* --- red dot optic (open, see-through tube) --- */
  const optic = new THREE.Group();
  const tubeGeo = new THREE.CylinderGeometry(0.0155, 0.0155, 0.055, 16, 1, true);
  tubeGeo.rotateX(Math.PI / 2);
  const tube = new THREE.Mesh(tubeGeo, new THREE.MeshStandardMaterial({ color: 0x1b1c1e, roughness: 0.4, metalness: 0.7, envMapIntensity: 0.4 }));
  optic.add(tube);
  // Short matte hood at the objective end only — daylight reads through
  const innerGeo = new THREE.CylinderGeometry(0.0146, 0.0146, 0.024, 16, 1, true);
  innerGeo.rotateX(Math.PI / 2);
  const inner = new THREE.Mesh(innerGeo, new THREE.MeshStandardMaterial({
    color: 0x0a0b0c, roughness: 0.9, metalness: 0.1, side: THREE.BackSide, envMapIntensity: 0.25,
  }));
  inner.position.z = -0.0145;
  optic.add(inner);
  // Machined lens rims — ~30% thinner walls around the aperture so the
  // housing reads as machined alloy, not a chunky pipe
  for (const z of [-0.028, 0.028]) {
    const rimGeo = new THREE.TorusGeometry(0.0152, 0.0021, 8, 20);
    const rim = new THREE.Mesh(rimGeo, new THREE.MeshStandardMaterial({
      color: 0x43464a, roughness: 0.35, metalness: 0.85, envMapIntensity: 0.7,
    }));
    rim.position.z = z;
    optic.add(rim);
  }
  // Chamfered objective bezel — the housing front tapers to the aperture
  // instead of ending in a butt-cut pipe.
  const chamferGeo = new THREE.CylinderGeometry(0.0155, 0.0125, 0.009, 16, 1, true);
  chamferGeo.rotateX(Math.PI / 2);
  const chamfer = new THREE.Mesh(chamferGeo, new THREE.MeshStandardMaterial({
    color: 0x1b1c1e, roughness: 0.42, metalness: 0.7, envMapIntensity: 0.4, side: THREE.DoubleSide,
  }));
  chamfer.position.z = -0.0325;
  optic.add(chamfer);
  // Battery cap (left flank) + two low turret caps on the housing top
  const capMat = new THREE.MeshStandardMaterial({ color: 0x222426, roughness: 0.5, metalness: 0.6 });
  const batt = new THREE.Mesh(new THREE.CylinderGeometry(0.0055, 0.0055, 0.005, 12), capMat);
  batt.position.set(-0.0165, 0.002, 0.008);
  batt.rotation.z = Math.PI / 2;
  optic.add(batt);
  for (const tz of [-0.004, 0.01]) {
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.0065, 0.0065, 0.0045, 12), capMat);
    cap.position.set(0, 0.0165, tz);
    optic.add(cap);
  }
  // See-through glass: rear AND front discs (sky reads through the tube).
  // Env glint subdued — the sun read comes from the partial arcs below, not
  // an even full-circle sheen.
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xa8c6d6, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.16,
    envMapIntensity: 0.9, side: THREE.DoubleSide, depthWrite: false,
  });
  const rearGlass = new THREE.Mesh(new THREE.CircleGeometry(0.0139, 20), glassMat);
  rearGlass.position.z = 0.026;
  optic.add(rearGlass);
  const frontGlass = new THREE.Mesh(new THREE.CircleGeometry(0.0139, 20), glassMat);
  frontGlass.position.z = -0.026;
  optic.add(frontGlass);
  // Sun-lit partial arc highlights: a 90° crescent hugging the lens edge,
  // fixed toward the sun quadrant (upper-left on screen) on both panes —
  // reads as a coated lens catching the sky, not a perfect-circle glint.
  const arcMat = new THREE.MeshBasicMaterial({
    transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending,
    depthWrite: false, side: THREE.DoubleSide, toneMapped: false,
  });
  arcMat.color.setRGB(1.7, 1.6, 1.35);
  const arcGeo = new THREE.TorusGeometry(0.0122, 0.0008, 6, 22, Math.PI / 2);
  const frontArc = new THREE.Mesh(arcGeo, arcMat);
  frontArc.position.z = -0.0272;
  frontArc.rotation.z = 1.05; // arc spans ~60°-150°: upper-left quadrant
  optic.add(frontArc);
  const rearArc = new THREE.Mesh(arcGeo, arcMat.clone());
  rearArc.material.opacity = 0.4;
  rearArc.position.z = 0.0266;
  rearArc.rotation.z = 1.05;
  optic.add(rearArc);
  // Faint blue AR-coating tint over the objective lens
  const arTint = new THREE.Mesh(new THREE.CircleGeometry(0.0139, 20),
    new THREE.MeshBasicMaterial({
      color: 0x3a5a7a, transparent: true, opacity: 0.15,
      depthWrite: false, side: THREE.DoubleSide,
    }));
  arTint.position.z = -0.0268;
  optic.add(arTint);
  // Reticle dot — pure red HDR emitter, bloom supplies the glow
  const dot = new THREE.Mesh(new THREE.CircleGeometry(0.0022, 12),
    new THREE.MeshBasicMaterial({ toneMapped: false }));
  dot.material.color.setRGB(8.0, 0.2, 0.15);
  dot.position.z = -0.01;
  optic.add(dot);
  // Tight additive halo just behind the dot for the bloom pass to catch
  const haloTex = tex(haloCanvas(), { srgb: true });
  haloTex.wrapS = haloTex.wrapT = THREE.ClampToEdgeWrapping;
  const halo = new THREE.Mesh(new THREE.CircleGeometry(0.0035, 16),
    new THREE.MeshBasicMaterial({
      map: haloTex, transparent: true, blending: THREE.AdditiveBlending,
      depthWrite: false, toneMapped: false,
    }));
  halo.material.color.setRGB(4.0, 0.15, 0.12);
  halo.position.z = -0.0112;
  optic.add(halo);
  // Mount + adjustment turret
  const mount = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.018, 0.045), new THREE.MeshStandardMaterial({ color: 0x2c2d2f, roughness: 0.5, metalness: 0.7 }));
  mount.position.y = -0.026;
  optic.add(mount);
  const turret = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.01, 10), new THREE.MeshStandardMaterial({ color: 0x2c2d2f, roughness: 0.5 }));
  turret.position.set(0.02, 0, 0);
  turret.rotation.z = Math.PI / 2;
  optic.add(turret);
  optic.position.set(0, 0.085, -0.01);
  optic.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  g.add(optic);

  /* --- low-profile folded front sight --- */
  add(new THREE.BoxGeometry(0.012, 0.01, 0.02), metal, 0, 0.052, -0.335);

  /* --- angled foregrip --- */
  const fg = add(new RoundedBoxGeometry(0.028, 0.07, 0.035, 2, 0.007), tan, 0, -0.035, -0.27, 0.5);
  void fg;

  /* --- PEQ laser box on side rail --- */
  add(new RoundedBoxGeometry(0.022, 0.028, 0.06, 2, 0.004), tan, -0.03, 0.026, -0.2);
  add(new THREE.CircleGeometry(0.004, 8), new THREE.MeshBasicMaterial({ color: 0x330000 }), -0.036, 0.03, -0.231, 0, -Math.PI / 2, 0);

  // Anchors
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, 0.012, -0.575);
  g.add(muzzle);
  const ejectPort = new THREE.Object3D();
  ejectPort.position.set(0.03, 0.012, -0.02);
  g.add(ejectPort);

  // Collimation across the two-camera rig: the aim ray lives in the WORLD
  // camera (~70°) but the gun is drawn by the 50° viewmodel camera, so solve
  // the 40m aim point to world-camera NDC, then re-project that exact screen
  // position through the vm camera onto the lens plane. The dot then sits on
  // the true point of impact regardless of the FOV mismatch.
  const _dotP = new THREE.Vector3();
  const _dotO = new THREE.Vector3();
  const LENS_R = 0.0115;
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
  add(new RoundedBoxGeometry(0.03, 0.032, 0.19, 2, 0.005), metal, 0, 0.018, -0.01);
  // Slide serrations
  for (let i = 0; i < 5; i++) add(new THREE.BoxGeometry(0.032, 0.02, 0.003), polymer, 0, 0.02, 0.06 + i * 0.007);
  // Frame
  add(new RoundedBoxGeometry(0.028, 0.03, 0.14, 2, 0.005), polymer, 0, -0.008, 0.0);
  // Grip
  add(new RoundedBoxGeometry(0.03, 0.1, 0.05, 2, 0.007), polymer, 0, -0.062, 0.055, 0.28);
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

/**
 * Gloved hand with articulated fingers. side: 1 = right, -1 = left.
 * Local frame: the gripped bar/grip axis runs along local Z through the
 * origin (radius ~0.024); the palm sits under it and four two-segment
 * fingers wrap over the top. kind picks the forearm direction:
 *   'grip'    — vertical pistol grip (rotate the group ~-1.25 rad about X)
 *   'support' — horizontal handguard hold
 */
export function buildHand(side = 1, kind = 'grip') {
  const lib = getMaterialLib();
  const g = new THREE.Group();
  // Coyote mid-tone tactical glove (+10% luminance over round 3): dark
  // enough to hide blocky segments, light enough to separate from the black
  // rail. The tan knuckle plate stays the one bright accent.
  const glove = new THREE.MeshStandardMaterial({ color: 0x5c5040, roughness: 0.92 });
  const sx = side;
  // Which side of the bar the fingers root on. A left support hand under a
  // horizontal handguard roots its fingers on the +X (camera) side so the
  // segments visibly wrap toward the shooter's eye.
  const wx = kind === 'support' ? -side : side;

  // Palm ~0.10 x 0.035 x 0.09 wrapped under the bar
  const palm = new THREE.Mesh(new RoundedBoxGeometry(0.1, 0.035, 0.09, 2, 0.012), glove);
  palm.position.set(wx * 0.014, -0.04, 0.004);
  palm.rotation.z = wx * -0.08;
  g.add(palm);
  // Knuckle guard pad on the back of the hand
  const pad = new THREE.Mesh(new RoundedBoxGeometry(0.05, 0.012, 0.07, 1, 0.005), lib.gunTan);
  pad.position.set(wx * 0.02, -0.059, 0.004);
  g.add(pad);

  // Four two-segment fingers curling over the bar; support hands roll a bit
  // further so the knuckles wrap visibly toward the camera. Roots sit
  // 23.5mm apart (finger width 14mm -> ~9.5mm visible gaps) with staggered
  // per-finger curl so each digit reads individually.
  const extra = kind === 'grip' ? 0.14 : 0.1;
  const curlJit = [0.04, -0.025, 0.035, -0.02];
  const archY = [0.0015, 0.0022, 0.001, -0.002];
  for (let i = 0; i < 4; i++) {
    const z = -0.035 + i * 0.0235;
    const root = new THREE.Group();
    root.position.set(wx * 0.047, -0.024 + archY[i], z);
    root.rotation.z = wx * (0.30 + i * 0.085 + curlJit[i] + extra);
    const seg1 = new THREE.Mesh(new RoundedBoxGeometry(0.016, 0.045, 0.014, 1, 0.005), glove);
    seg1.position.y = 0.019;
    root.add(seg1);
    const joint = new THREE.Group();
    joint.position.y = 0.041;
    joint.rotation.z = wx * (0.62 + i * 0.115 + curlJit[i] * 1.5 + extra);
    const seg2 = new THREE.Mesh(new RoundedBoxGeometry(0.015, 0.042, 0.013, 1, 0.005), glove);
    seg2.position.y = 0.017;
    joint.add(seg2);
    root.add(joint);
    g.add(root);
  }

  // Thumb. Support hand: rooted outboard of the far (left) edge, cresting
  // ~13mm over the handguard silhouette with the distal segment folding
  // inboard across the rail — the classic thumb-over-bore hook. Grip hand
  // keeps the wrap over the backstrap.
  const thumbRoot = new THREE.Group();
  if (kind === 'support') {
    thumbRoot.position.set(-wx * 0.034, 0.0, 0.006);
    thumbRoot.rotation.set(-0.55, 0, -wx * 0.45);
  } else {
    thumbRoot.position.set(-wx * 0.03, -0.008, 0.034);
    thumbRoot.rotation.set(-0.95, 0, -wx * 0.55);
  }
  const th1 = new THREE.Mesh(new RoundedBoxGeometry(0.017, kind === 'support' ? 0.046 : 0.05, 0.018, 1, 0.006), glove);
  th1.position.y = kind === 'support' ? 0.018 : 0.02;
  thumbRoot.add(th1);
  const th2g = new THREE.Group();
  th2g.position.y = kind === 'support' ? 0.042 : 0.045;
  th2g.rotation.z = -wx * (kind === 'support' ? 1.0 : 0.5);
  const th2 = new THREE.Mesh(new RoundedBoxGeometry(0.015, kind === 'support' ? 0.036 : 0.038, 0.016, 1, 0.006), glove);
  th2.position.y = 0.015;
  th2g.add(th2);
  thumbRoot.add(th2g);
  g.add(thumbRoot);

  // Wrist cuff + camo sleeve (dia ~0.10m) with wrinkle rings near the elbow
  const sleeveDir = kind === 'grip'
    ? new THREE.Vector3(sx * 0.22, -0.93, -0.24).normalize()
    : new THREE.Vector3(sx * 0.3, -0.38, 0.87).normalize();
  const wrist = new THREE.Vector3(sx * 0.004, -0.05, 0.048);
  const up = new THREE.Vector3(0, 1, 0);
  const alongSleeve = new THREE.Quaternion().setFromUnitVectors(up, sleeveDir.clone().negate());

  const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.038, 0.05, 12), glove);
  cuff.position.copy(wrist).addScaledVector(sleeveDir, 0.018);
  cuff.quaternion.copy(alongSleeve);
  g.add(cuff);

  const vmCamo = getVmCamo();
  const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.042, 0.26, 12), vmCamo);
  sleeve.position.copy(wrist).addScaledVector(sleeveDir, 0.16);
  sleeve.quaternion.copy(alongSleeve);
  g.add(sleeve);

  const fwd = new THREE.Vector3(0, 0, 1);
  const ringQ = new THREE.Quaternion().setFromUnitVectors(fwd, sleeveDir);
  for (const [dist, rr] of [[0.2, 0.0385], [0.245, 0.04], [0.285, 0.0415]]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(rr, 0.0048, 6, 14), vmCamo);
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
