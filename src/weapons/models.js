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

  const metal = mk(metalAlbedo, metalNormal, metalRough, { metalness: 0.86, envMapIntensity: 1.0 });
  metal.normalScale.set(0.6, 0.6);
  const metalMarked = mk(markedAlbedo, metalNormal, metalRough, { metalness: 0.86, envMapIntensity: 1.0 });
  metalMarked.normalScale.set(0.6, 0.6);
  const polymer = mk(polymerAlbedo, polymerNormal, polymerRough, { metalness: 0.08, envMapIntensity: 0.55 });
  polymer.normalScale.set(1.0, 1.0);

  VM_MATS = { metal, metalMarked, polymer };
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

  /* --- lower/upper receiver (parkerized, with stamped markings) --- */
  add(new RoundedBoxGeometry(0.037, 0.05, 0.24, 2, 0.006), vm.metalMarked, 0, 0.012, 0);      // upper
  add(new RoundedBoxGeometry(0.034, 0.045, 0.17, 2, 0.006), vm.metalMarked, 0, -0.03, 0.02);  // lower
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
  // Flash hider with slots
  const mdGeo = new THREE.CylinderGeometry(0.016, 0.0175, 0.06, 12);
  mdGeo.rotateX(Math.PI / 2);
  const md = add(mdGeo, metal, 0, 0.012, -0.535);
  for (let i = 0; i < 3; i++) {
    add(new THREE.BoxGeometry(0.036, 0.004, 0.012), new THREE.MeshStandardMaterial({ color: 0x0c0c0c, roughness: 0.5 }),
      0, 0.012, -0.522 - i * 0.016, 0, 0, (i * Math.PI) / 3.5);
  }
  void md;
  // Low-profile gas block on the exposed barrel section
  add(new THREE.BoxGeometry(0.018, 0.02, 0.02), metal, 0, 0.016, -0.44);

  /* --- stock --- */
  add(new THREE.BoxGeometry(0.03, 0.026, 0.17), metal, 0, 0.012, 0.2);          // buffer tube
  const stock = new THREE.Group();
  const stockBody = new THREE.Mesh(new RoundedBoxGeometry(0.042, 0.075, 0.11, 2, 0.008), polymer);
  stock.add(stockBody);
  const buttpad = new THREE.Mesh(new RoundedBoxGeometry(0.045, 0.11, 0.02, 2, 0.006), polymer);
  buttpad.position.set(0, -0.012, 0.062);
  stock.add(buttpad);
  stock.position.set(0, -0.005, 0.27);
  stock.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  g.add(stock);

  /* --- grip + trigger --- */
  const grip = add(new RoundedBoxGeometry(0.032, 0.095, 0.045, 2, 0.008), polymer, 0, -0.085, 0.085, 0.32);
  void grip;
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
  const innerGeo = new THREE.CylinderGeometry(0.0143, 0.0143, 0.024, 16, 1, true);
  innerGeo.rotateX(Math.PI / 2);
  const inner = new THREE.Mesh(innerGeo, new THREE.MeshStandardMaterial({
    color: 0x0a0b0c, roughness: 0.9, metalness: 0.1, side: THREE.BackSide, envMapIntensity: 0.25,
  }));
  inner.position.z = -0.0145;
  optic.add(inner);
  // Machined lens rims — subtle graphite catch, not a warm mirror (a bright
  // alloy rim picks up the desert env and reads rust-brown at ADS)
  for (const z of [-0.028, 0.028]) {
    const rimGeo = new THREE.TorusGeometry(0.0155, 0.003, 8, 20);
    const rim = new THREE.Mesh(rimGeo, new THREE.MeshStandardMaterial({
      color: 0x43464a, roughness: 0.35, metalness: 0.85, envMapIntensity: 0.7,
    }));
    rim.position.z = z;
    optic.add(rim);
  }
  // See-through glass: rear AND front discs (sky reads through the tube)
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xa8c6d6, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.2,
    envMapIntensity: 1.5, side: THREE.DoubleSide, depthWrite: false,
  });
  const rearGlass = new THREE.Mesh(new THREE.CircleGeometry(0.0135, 20), glassMat);
  rearGlass.position.z = 0.026;
  optic.add(rearGlass);
  const frontGlass = new THREE.Mesh(new THREE.CircleGeometry(0.0135, 20), glassMat);
  frontGlass.position.z = -0.026;
  optic.add(frontGlass);
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
  // Warm coyote glove — separates from the black polymer instead of merging
  const glove = new THREE.MeshStandardMaterial({ color: 0x7a6a52, roughness: 0.9 });
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
  // further so the knuckles wrap visibly toward the camera.
  const extra = kind === 'grip' ? 0.14 : 0.1;
  for (let i = 0; i < 4; i++) {
    const z = -0.028 + i * 0.021;
    const root = new THREE.Group();
    root.position.set(wx * 0.047, -0.024, z);
    root.rotation.z = wx * (0.34 + i * 0.05 + extra);
    const seg1 = new THREE.Mesh(new RoundedBoxGeometry(0.016, 0.045, 0.018, 1, 0.006), glove);
    seg1.position.y = 0.019;
    root.add(seg1);
    const joint = new THREE.Group();
    joint.position.y = 0.041;
    joint.rotation.z = wx * (0.68 + i * 0.07 + extra);
    const seg2 = new THREE.Mesh(new RoundedBoxGeometry(0.015, 0.042, 0.017, 1, 0.006), glove);
    seg2.position.y = 0.017;
    joint.add(seg2);
    root.add(joint);
    g.add(root);
  }

  // Thumb riding over the top from the near side
  const thumbRoot = new THREE.Group();
  thumbRoot.position.set(-wx * 0.03, -0.008, 0.034);
  thumbRoot.rotation.set(-0.95, 0, -wx * 0.55);
  const th1 = new THREE.Mesh(new RoundedBoxGeometry(0.018, 0.05, 0.019, 1, 0.007), glove);
  th1.position.y = 0.02;
  thumbRoot.add(th1);
  const th2g = new THREE.Group();
  th2g.position.y = 0.045;
  th2g.rotation.z = -wx * 0.5;
  const th2 = new THREE.Mesh(new RoundedBoxGeometry(0.016, 0.038, 0.017, 1, 0.006), glove);
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
