import * as THREE from 'three';
import { clamp, damp, lerp, smoothstep } from '../core/utils.js';
import { makeRNG } from '../core/utils.js';

// ===========================================================================
// First-person viewmodel: "AX-4" carbine (M4-class), procedurally modeled.
// Lives in its own overlay scene. Handles all weapon motion: idle sway,
// walk/sprint cycles, ADS blend, recoil kick, reload choreography.
//
// Layout (rifle local space): bore axis along Z at x=0, y=0.
//   -Z = muzzle (tip at z=-0.520), +Z = butt (pad at z=+0.305).
// All dimensions in meters, modeled at real-world scale.
// ===========================================================================

const rng = makeRNG(1123);

// ---------------------------------------------------------------------------
// Procedural textures
// ---------------------------------------------------------------------------
function muzzleFlashTexture(size = 128) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, size, size);
  const cx = size / 2, cy = size / 2;
  // Star spikes — irregular lengths for a combusting look
  ctx.save();
  ctx.translate(cx, cy);
  for (let i = 0; i < 8; i++) {
    ctx.rotate(Math.PI / 4 + rng() * 0.35);
    const len = size * (0.26 + rng() * 0.22);
    const g = ctx.createLinearGradient(0, 0, len, 0);
    g.addColorStop(0, 'rgba(255,244,210,0.95)');
    g.addColorStop(0.5, 'rgba(255,170,60,0.5)');
    g.addColorStop(1, 'rgba(255,120,20,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.025);
    ctx.lineTo(len, 0);
    ctx.lineTo(0, size * 0.025);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  // Hot core
  const g2 = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.2);
  g2.addColorStop(0, 'rgba(255,253,244,1)');
  g2.addColorStop(0.35, 'rgba(255,200,105,0.9)');
  g2.addColorStop(1, 'rgba(255,120,20,0)');
  ctx.fillStyle = g2;
  ctx.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Soft round dot for the reflex sight reticle.
function reticleDotTexture(size = 64) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,235,230,1)');
  g.addColorStop(0.25, 'rgba(255,60,40,0.95)');
  g.addColorStop(0.6, 'rgba(255,40,25,0.35)');
  g.addColorStop(1, 'rgba(255,30,20,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Multicam-ish blob camo for the sleeves.
function camoTexture(size = 256) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#4f4936';
  ctx.fillRect(0, 0, size, size);
  const cols = ['#5f5942', '#3f3a2b', '#6b6350', '#33301f', '#565039', '#77705a'];
  for (let i = 0; i < 110; i++) {
    ctx.fillStyle = cols[Math.floor(rng() * cols.length)];
    const px = rng() * size, py = rng() * size;
    const r = 5 + rng() * 20;
    ctx.beginPath();
    ctx.ellipse(px, py, r, r * (0.35 + rng() * 0.5), rng() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  // fabric speckle
  for (let i = 0; i < 600; i++) {
    ctx.fillStyle = rng() < 0.5 ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,240,0.05)';
    ctx.fillRect(rng() * size, rng() * size, 2, 2);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

// PMAG-style waffle grid for the magazine body (also reused as bump map).
function magWaffleTexture(size = 128) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#4e4234';                       // groove color
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = '#6e5f4b';                       // raised cell color
  const cell = 26, gap = 7;
  for (let y = gap; y < size - 2; y += cell + gap) {
    for (let x = gap; x < size - 2; x += cell + gap) {
      ctx.beginPath();
      ctx.roundRect(x, y, cell, cell, 6);
      ctx.fill();
    }
  }
  // wear noise
  for (let i = 0; i < 250; i++) {
    ctx.fillStyle = rng() < 0.5 ? 'rgba(0,0,0,0.10)' : 'rgba(255,240,220,0.06)';
    ctx.fillRect(rng() * size, rng() * size, 2, 2);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// Fine noise used as a fabric bump for gloves/sleeves.
function fabricBumpTexture(size = 64) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 110 + Math.floor(rng() * 70);
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 3);
  return t;
}

// ---------------------------------------------------------------------------
// Small mesh helpers (module scope). All add to `parent` and return the mesh.
// ---------------------------------------------------------------------------
function box(parent, mat, w, h, d, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  if (rx || ry || rz) m.rotation.set(rx, ry, rz);
  parent.add(m);
  return m;
}

// Cylinder along Z. rRear = radius at +Z end, rFront = radius at -Z end.
function cylZ(parent, mat, rRear, rFront, len, x, y, z, seg = 14, open = false) {
  const geo = new THREE.CylinderGeometry(rRear, rFront, len, seg, 1, open);
  geo.rotateX(Math.PI / 2);
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}

function cylY(parent, mat, rTop, rBot, len, x, y, z, seg = 12) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, len, seg), mat);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}

// Cylinder along X.
function cylX(parent, mat, r, len, x, y, z, seg = 12) {
  const geo = new THREE.CylinderGeometry(r, r, len, seg);
  geo.rotateZ(Math.PI / 2);
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}

// Tapered tube between two points (used for forearms/wrists).
function tubeBetween(parent, mat, r1, r2, a, b, seg = 12) {
  const from = new THREE.Vector3(a[0], a[1], a[2]);
  const to = new THREE.Vector3(b[0], b[1], b[2]);
  const dir = to.clone().sub(from);
  const len = dir.length();
  const geo = new THREE.CylinderGeometry(r2, r1, len, seg);
  const m = new THREE.Mesh(geo, mat);
  m.position.copy(from).addScaledVector(dir, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  parent.add(m);
  return m;
}

// Capsule along Z.
function capsuleZ(parent, mat, r, len, x, y, z, rx = 0, ry = 0, rz = 0) {
  const geo = new THREE.CapsuleGeometry(r, len, 3, 10);
  geo.rotateX(Math.PI / 2);
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  parent.add(m);
  return m;
}

// Articulated finger: a chain of capsule segments that extends along -Z and
// curls via +X rotations at each joint. `orient` (Euler) pre-rotates the curl
// plane so callers can wrap tubes/grips in any plane. Returns the root group;
// callers position/rotate the root at the knuckle.
function makeFinger(parent, mat, r, lens, curls, orient = null) {
  const root = new THREE.Group();
  const inner = new THREE.Group();
  if (orient) inner.rotation.copy(orient);
  root.add(inner);
  let node = inner;
  for (let i = 0; i < lens.length; i++) {
    const seg = new THREE.Group();
    if (i > 0) seg.position.z = -lens[i - 1];
    seg.rotation.x = curls[i];
    node.add(seg);
    const rr = r * (1 - i * 0.1);
    const geo = new THREE.CapsuleGeometry(rr, Math.max(0.004, lens[i] - rr * 0.9), 3, 9);
    geo.rotateX(Math.PI / 2);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.z = -lens[i] / 2;
    seg.add(mesh);
    node = seg;
  }
  parent.add(root);
  return root;
}

function std(color, roughness, metalness, envMapIntensity = 1, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness, envMapIntensity, ...extra });
}

// ===========================================================================
export class Viewmodel {
  constructor(engine) {
    this.engine = engine;
    this.scene = engine.viewmodelScene;
    this.root = new THREE.Group();
    this.scene.add(this.root);

    // Lighting that matches the world's low warm sun (screen-left), plus a
    // faint cool rim from the right so dark metal edges never go dead black.
    const key = new THREE.DirectionalLight(0xffdcae, 2.9);
    key.position.set(-0.7, 0.75, 0.35);
    this.scene.add(key);
    const fill = new THREE.HemisphereLight(0x96abc6, 0x60523f, 1.0);
    this.scene.add(fill);
    const rim = new THREE.DirectionalLight(0xbcd2ff, 0.65);
    rim.position.set(0.7, 0.25, -0.55);
    this.scene.add(rim);

    this.buildRifle();

    // Pose targets (viewmodel-camera space).
    // Composition comes from POSITION, not rotation: the bore stays nearly
    // parallel to the view direction so perspective converges the barrel
    // toward the screen-center vanishing point (classic FPS 3/4-from-behind).
    this.hipPos = new THREE.Vector3(0.17, -0.15, -0.37);
    this.hipRot = new THREE.Euler(0.0, 0.035, 0.012);
    // ADS: optic axis (x=0, y=+0.0615) must land exactly on screen center.
    this.adsPos = new THREE.Vector3(0.0, -0.0615, -0.162);
    this.adsRot = new THREE.Euler(0, 0, 0);
    this.sprintPos = new THREE.Vector3(0.10, -0.22, -0.44);
    this.sprintRot = new THREE.Euler(0.42, -0.52, 0.16);
    this.reloadPos = new THREE.Vector3(0.12, -0.27, -0.38);
    this.reloadRot = new THREE.Euler(0.5, 0.2, 0.32);

    this.pos = this.hipPos.clone();
    this.rot = new THREE.Euler().copy(this.hipRot);

    // Dynamics
    this.swayX = 0; this.swayY = 0;
    this.kickPos = 0; this.kickRot = 0; this.kickRoll = 0; this.kickYaw = 0;
    this.bobT = 0;
    this.aimFrac = 0;
    this.reloadT = -1; // <0 = not reloading
    this.reloadDuration = 2.05;
    this.muzzleFlashT = 99;
    this.flashScale = 1;
  }

  // =========================================================================
  // Geometry
  // =========================================================================
  buildRifle() {
    // ---- Material set -----------------------------------------------------
    const camo = camoTexture();
    const waffle = magWaffleTexture();
    const fabric = fabricBumpTexture();

    const M = this.mats = {
      recv: std(0x33373d, 0.44, 0.60, 1.5),            // anodized receiver aluminum
      recvD: std(0x24262b, 0.52, 0.56, 1.1),           // handguard aluminum (darker)
      hgFlat: std(0x24262b, 0.52, 0.56, 1.1, { flatShading: true }),
      steel: std(0x1b1d21, 0.32, 0.90, 1.6),           // nitride barrel/muzzle
      steelFlat: std(0x1b1d21, 0.32, 0.90, 1.6, { flatShading: true }),
      steelB: std(0x484c52, 0.30, 0.90, 1.2),          // bright steel accents (wear)
      poly: std(0x282a2d, 0.80, 0.05, 0.7),            // furniture polymer
      polyD: std(0x1e2023, 0.88, 0.03, 0.5),           // rubber pads / grooves
      fde: new THREE.MeshStandardMaterial({
        map: waffle, bumpMap: waffle, bumpScale: 1.6,
        roughness: 0.78, metalness: 0.04, envMapIntensity: 0.7,
      }),                                              // FDE waffle mag body
      fdeS: std(0x5d5040, 0.80, 0.04, 0.6),            // FDE solid (grip/panels)
      fdeD: std(0x4b4033, 0.84, 0.04, 0.5),            // FDE dark (floor plate)
      optic: std(0x1f2126, 0.55, 0.6, 1.2),
      opticIn: std(0x0f1013, 0.85, 0.2, 0.2, { side: THREE.BackSide }),
      recess: std(0x121316, 0.88, 0.25, 0.25),         // fake slots/holes
      glove: new THREE.MeshStandardMaterial({
        color: 0x33352f, roughness: 0.94, metalness: 0,
        envMapIntensity: 0.45, bumpMap: fabric, bumpScale: 0.6,
      }),
      gloveD: std(0x282a27, 0.95, 0, 0.4),             // glove padding/straps
      knuck: std(0x464b44, 0.78, 0.06, 0.7),           // hard knuckle armor
      sleeve: new THREE.MeshStandardMaterial({
        map: camo, roughness: 0.95, metalness: 0,
        envMapIntensity: 0.45, bumpMap: fabric, bumpScale: 0.8,
      }),
    };

    const g = new THREE.Group();
    this.rifle = g;

    this._buildBarrelGroup(g, M);
    this._buildHandguard(g, M);
    this._buildReceivers(g, M);
    this._buildMagazine(g, M);
    this._buildGripStock(g, M);
    this._buildOptic(g, M);
    this._buildHands(g, M);
    this._buildFlash(g);

    this.root.add(g);
  }

  // ---- Barrel, gas system, muzzle device ---------------------------------
  _buildBarrelGroup(g, M) {
    // Exposed barrel section ahead of the handguard (handguard ends z=-0.385)
    cylZ(g, M.steel, 0.0102, 0.0096, 0.10, 0, 0, -0.415, 14);
    // Barrel shoulder where it exits the rail
    cylZ(g, M.steel, 0.0118, 0.0118, 0.012, 0, 0, -0.389, 14);
    // Low-profile gas block + short visible gas tube stub going back into rail
    box(g, M.steel, 0.019, 0.021, 0.024, 0, 0.003, -0.405);
    cylZ(g, M.steel, 0.0026, 0.0026, 0.05, 0, 0.0145, -0.392, 8);
    // Crush washer
    cylZ(g, M.steel, 0.0122, 0.0100, 0.005, 0, 0, -0.4635, 12);
    // Birdcage flash hider body — chunkier than the barrel so it reads
    cylZ(g, M.steelFlat, 0.0126, 0.0118, 0.052, 0, 0, -0.492, 12);
    // Vent slots — thin near-black boxes crossing the body read as cuts
    for (let i = 0; i < 3; i++) {
      box(g, M.recess, 0.0262, 0.0034, 0.034, 0, 0, -0.488, 0, 0, (i * Math.PI) / 3);
    }
    // Front crown ring + dark bore
    cylZ(g, M.steel, 0.0128, 0.0128, 0.009, 0, 0, -0.5155, 12);
    cylZ(g, M.recess, 0.0068, 0.0068, 0.003, 0, 0, -0.5195, 10);
  }

  // ---- Free-float M-LOK handguard -----------------------------------------
  _buildHandguard(g, M) {
    // Octagonal tube: flats at top/bottom/sides (flat-shaded for crisp facets)
    const tubeGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.267, 8, 1, true);
    tubeGeo.rotateX(Math.PI / 2);
    tubeGeo.rotateZ(Math.PI / 8);
    const tube = new THREE.Mesh(tubeGeo, M.hgFlat);
    tube.position.set(0, 0, -0.2515);
    g.add(tube);

    // Front cap ring + rear barrel-nut collar
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.0188, 0.0188, 0.010, 8), M.hgFlat);
    cap.geometry.rotateX(Math.PI / 2); cap.geometry.rotateZ(Math.PI / 8);
    cap.position.set(0, 0, -0.381);
    g.add(cap);
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.0198, 0.0198, 0.020, 8), M.hgFlat);
    collar.geometry.rotateX(Math.PI / 2); collar.geometry.rotateZ(Math.PI / 8);
    collar.position.set(0, 0, -0.127);
    g.add(collar);

    // Top riser web + rail base (rail ridges are added in _buildReceivers so
    // they run continuously across handguard + receiver).
    box(g, M.recvD, 0.014, 0.010, 0.265, 0, 0.0212, -0.2515);
    box(g, M.recvD, 0.021, 0.005, 0.265, 0, 0.0285, -0.2515);

    // M-LOK slots: left, bottom, right rows (fake recesses, slightly proud)
    const flat = 0.018 * Math.cos(Math.PI / 8); // 0.01663 — distance to flat
    for (let i = 0; i < 5; i++) {
      const z = -0.152 - i * 0.045;
      box(g, M.recess, 0.0014, 0.0066, 0.034, -flat - 0.0004, 0, z); // left
      box(g, M.recess, 0.0014, 0.0066, 0.034, flat + 0.0004, 0, z);  // right
      box(g, M.recess, 0.0066, 0.0014, 0.034, 0, -flat - 0.0004, z); // bottom
    }

    // QD sling socket on left flat near the rear
    cylX(g, M.recvD, 0.006, 0.0024, -flat - 0.0008, -0.006, -0.148, 12);
    cylX(g, M.recess, 0.0035, 0.0028, -flat - 0.0016, -0.006, -0.148, 10);

    // FDE polymer M-LOK rail panel on the left flat near the muzzle end
    box(g, M.fdeS, 0.0018, 0.0085, 0.052, -flat - 0.0012, 0, -0.345);

    // Polymer handstop fin under the front of the rail
    box(g, M.polyD, 0.010, 0.011, 0.022, 0, -flat - 0.005, -0.336, 0.35);
    box(g, M.polyD, 0.010, 0.006, 0.013, 0, -flat - 0.0105, -0.343, 0.55);
  }

  // ---- Upper + lower receiver, controls, rails, BUIS ----------------------
  _buildReceivers(g, M) {
    // Upper receiver: stepped boxes read as machined billet
    box(g, M.recv, 0.036, 0.038, 0.220, 0, 0.001, -0.005);          // main
    box(g, M.recv, 0.030, 0.010, 0.220, 0, 0.024, -0.005);          // top deck
    box(g, M.recv, 0.0365, 0.014, 0.150, 0, -0.006, 0.020);         // side bulge
    // Rail base over receiver
    box(g, M.recv, 0.021, 0.005, 0.190, 0, 0.0285, -0.020);

    // Continuous picatinny ridges across handguard + receiver (lighter than
    // the base so the rail line reads as machined aluminum)
    for (let z = -0.376; z <= 0.070; z += 0.010) {
      box(g, M.recv, 0.021, 0.0026, 0.0047, 0, 0.0323, z);
    }

    // Upper/lower seam line
    box(g, M.recess, 0.0368, 0.0012, 0.150, 0, -0.0135, 0.020);

    // --- Right side (mostly away from camera, still built) ---
    // Ejection port: recess + closed dust cover door + seam
    box(g, M.recess, 0.0008, 0.021, 0.062, 0.0184, 0.001, -0.005);
    box(g, M.recv, 0.0014, 0.018, 0.056, 0.0188, 0.001, -0.005);
    // Brass deflector wedge + forward assist
    box(g, M.recv, 0.010, 0.015, 0.016, 0.020, 0.004, 0.032, 0, -0.28, 0);
    cylZ(g, M.recv, 0.0066, 0.0066, 0.016, 0.0185, 0.010, 0.085, 10);
    cylZ(g, M.steelB, 0.0052, 0.0052, 0.005, 0.0185, 0.010, 0.0955, 10);
    // Mag release button
    box(g, M.recv, 0.004, 0.011, 0.015, 0.018, -0.019, 0.030);
    cylX(g, M.steelB, 0.0042, 0.004, 0.0195, -0.019, 0.030, 10);

    // --- Left side (faces the camera — hero details) ---
    // Bolt catch
    box(g, M.recv, 0.003, 0.020, 0.014, -0.0185, -0.002, 0.018);
    box(g, M.recv, 0.0038, 0.009, 0.009, -0.0195, 0.006, 0.012);
    // Safety selector: hub + lever pointing forward (FIRE)
    cylX(g, M.recv, 0.0048, 0.0035, -0.0188, -0.012, 0.080, 12);
    box(g, M.recv, 0.0032, 0.0055, 0.020, -0.0195, -0.012, 0.070);
    box(g, M.steelB, 0.0026, 0.0045, 0.0045, -0.0198, -0.012, 0.062);
    // Takedown + pivot pins
    cylX(g, M.steelB, 0.0032, 0.0022, -0.0182, -0.022, 0.098, 10);
    cylX(g, M.steelB, 0.0032, 0.0022, -0.0182, -0.022, -0.008, 10);

    // Charging handle: shaft + T-wings + latch (top rear)
    box(g, M.recvD, 0.012, 0.006, 0.045, 0, 0.0225, 0.118);
    box(g, M.recvD, 0.034, 0.0055, 0.012, 0, 0.0225, 0.134);
    box(g, M.recvD, 0.007, 0.006, 0.013, -0.0195, 0.0225, 0.131, 0, 0.30, 0);
    box(g, M.recvD, 0.007, 0.006, 0.013, 0.0195, 0.0225, 0.131, 0, -0.30, 0);
    box(g, M.steelB, 0.006, 0.004, 0.012, -0.0222, 0.022, 0.126, 0, 0.25, 0);
    // Shallow machining groove along the upper's left flank (breaks the slab)
    box(g, M.recess, 0.0006, 0.0018, 0.190, -0.0182, 0.012, -0.020);

    // --- Lower receiver + magwell + trigger group ---
    box(g, M.recv, 0.033, 0.036, 0.135, 0, -0.026, 0.045);
    box(g, M.recv, 0.035, 0.052, 0.058, 0, -0.055, 0.012, 0.10, 0, 0);   // magwell
    box(g, M.recv, 0.0375, 0.009, 0.061, 0, -0.079, 0.019, 0.10, 0, 0);  // flare lip
    // Trigger guard + trigger
    box(g, M.recv, 0.007, 0.0035, 0.056, 0, -0.0855, 0.074);
    box(g, M.recv, 0.007, 0.017, 0.004, 0, -0.077, 0.0485, 0.18, 0, 0);
    box(g, M.steelB, 0.0045, 0.019, 0.005, 0, -0.062, 0.070, 0.20, 0, 0);

    // --- Folded backup iron sights ---
    // Rear BUIS (behind optic)
    box(g, M.recvD, 0.022, 0.0065, 0.030, 0, 0.0385, 0.058);
    box(g, M.recvD, 0.015, 0.0045, 0.020, 0, 0.0440, 0.055);
    cylX(g, M.steel, 0.0019, 0.023, 0, 0.0385, 0.066, 8);
    // Front BUIS (front of rail)
    box(g, M.recvD, 0.019, 0.0055, 0.024, 0, 0.0370, -0.355);
    box(g, M.recvD, 0.010, 0.004, 0.016, 0, 0.0418, -0.358);
  }

  // ---- Curved FDE magazine w/ waffle texture ------------------------------
  _buildMagazine(g, M) {
    const mag = new THREE.Group();
    this.mag = mag;
    mag.position.set(0, -0.081, 0.012);
    mag.rotation.x = 0.10;
    this._magBasePos = mag.position.clone();
    this._magBaseRotX = 0.10;

    // Four stacked segments following the AK-ish 30rd curve
    const segs = [
      { y: -0.024, z: 0.000, rx: 0.06 },
      { y: -0.0695, z: 0.010, rx: 0.18 },
      { y: -0.113, z: 0.026, rx: 0.31 },
      { y: -0.1545, z: 0.047, rx: 0.44 },
    ];
    for (const s of segs) {
      box(mag, M.fde, 0.0255, 0.050, 0.056, 0, s.y, s.z, s.rx, 0, 0);
      // front + rear spine strips
      box(mag, M.fdeS, 0.0257, 0.048, 0.007, 0, s.y, s.z - 0.0262, s.rx, 0, 0);
      box(mag, M.fdeS, 0.0257, 0.048, 0.007, 0, s.y, s.z + 0.0262, s.rx, 0, 0);
    }
    // Floor plate + lip
    box(mag, M.fdeD, 0.029, 0.009, 0.062, 0, -0.180, 0.062, 0.47, 0, 0);
    box(mag, M.fdeD, 0.0305, 0.004, 0.066, 0, -0.1745, 0.0605, 0.47, 0, 0);

    g.add(mag);
  }

  // ---- Pistol grip, buffer tube, stock ------------------------------------
  _buildGripStock(g, M) {
    // Grip: FDE core + backstrap swell + finger grooves + floor plug
    box(g, M.fdeS, 0.026, 0.088, 0.036, 0, -0.090, 0.122, -0.30, 0, 0);
    box(g, M.fdeS, 0.024, 0.075, 0.011, 0, -0.086, 0.142, -0.38, 0, 0);
    box(g, M.fdeD, 0.027, 0.004, 0.012, 0, -0.070, 0.1065, -0.30, 0, 0);
    box(g, M.fdeD, 0.027, 0.004, 0.012, 0, -0.088, 0.1122, -0.30, 0, 0);
    box(g, M.fdeD, 0.027, 0.004, 0.012, 0, -0.106, 0.1178, -0.30, 0, 0);
    box(g, M.fdeD, 0.028, 0.009, 0.040, 0, -0.131, 0.136, -0.30, 0, 0);

    // Receiver end plate + castle nut + a short buffer-tube stub. The stock
    // itself is intentionally NOT modeled: it anchors at the player's
    // shoulder and must never appear in frame (COD viewmodels omit it too).
    box(g, M.recv, 0.034, 0.042, 0.006, 0, -0.002, 0.108);
    cylZ(g, M.steelFlat, 0.0165, 0.0165, 0.009, 0, 0.002, 0.114, 10);
    cylZ(g, M.recvD, 0.0135, 0.0132, 0.035, 0, 0.002, 0.134, 14);
    // QD sling loop on the end plate (left)
    cylX(g, M.steelB, 0.0065, 0.0022, -0.0185, -0.008, 0.110, 10);
    cylX(g, M.recess, 0.0038, 0.0026, -0.0192, -0.008, 0.110, 8);
  }

  // ---- Red dot optic (Aimpoint micro style) --------------------------------
  _buildOptic(g, M) {
    const O = new THREE.Group();
    O.position.set(0, 0, -0.030); // optic center station
    g.add(O);
    const AX = 0.0615; // optical axis height — ADS pose depends on this

    // Rail clamp mount + side plate + clamp screws
    box(O, M.optic, 0.024, 0.012, 0.052, 0, 0.0395, 0);
    box(O, M.optic, 0.0055, 0.014, 0.052, 0.0125, 0.0395, 0);
    cylX(O, M.steelB, 0.0028, 0.003, 0.0148, 0.0395, -0.014, 8);
    cylX(O, M.steelB, 0.0028, 0.003, 0.0148, 0.0395, 0.014, 8);
    // Body base
    box(O, M.optic, 0.027, 0.010, 0.048, 0, 0.050, 0);

    // Main tube (open ended) + dark inner liner
    cylZ(O, M.optic, 0.0152, 0.0152, 0.034, 0, AX, 0, 16, true);
    cylZ(O, M.opticIn, 0.0140, 0.0140, 0.0335, 0, AX, 0, 16, true);
    // Bezels (open rings — caps would block the sight picture)
    cylZ(O, M.optic, 0.0162, 0.0165, 0.0064, 0, AX, -0.0185, 16, true);
    cylZ(O, M.optic, 0.0160, 0.0158, 0.0056, 0, AX, 0.0178, 16, true);

    // Lenses: front has warm notch-coating tint, rear a cool tint
    const frontGlass = new THREE.Mesh(
      new THREE.CircleGeometry(0.0131, 20),
      new THREE.MeshStandardMaterial({
        color: 0x66281a, roughness: 0.06, metalness: 0.6, transparent: true,
        opacity: 0.14, envMapIntensity: 2.5, side: THREE.DoubleSide,
      })
    );
    frontGlass.position.set(0, AX, -0.0158);
    O.add(frontGlass);
    const rearGlass = new THREE.Mesh(
      new THREE.CircleGeometry(0.0126, 20),
      new THREE.MeshStandardMaterial({
        color: 0x2c4a66, roughness: 0.05, metalness: 0.5, transparent: true,
        opacity: 0.10, envMapIntensity: 2.2, side: THREE.DoubleSide,
      })
    );
    rearGlass.position.set(0, AX, 0.0152);
    O.add(rearGlass);

    // Turrets + battery cap
    cylY(O, M.optic, 0.005, 0.005, 0.007, 0, AX + 0.0180, 0, 12);
    cylY(O, M.polyD, 0.0052, 0.0052, 0.002, 0, AX + 0.0222, 0, 12);
    cylX(O, M.optic, 0.0055, 0.009, 0.019, AX, 0, 12);
    cylX(O, M.polyD, 0.0057, 0.002, 0.024, AX, 0, 12);
    cylX(O, M.optic, 0.0072, 0.005, -0.018, AX, 0, 12);

    // Emissive dot + soft glow (visible when aiming; sprite so it always
    // faces the eye and lands exactly on the optical axis)
    const dotTex = reticleDotTexture();
    const dotMat = new THREE.SpriteMaterial({
      map: dotTex, color: 0xff3522, transparent: true, opacity: 0,
      depthTest: false, blending: THREE.AdditiveBlending,
    });
    this.redDot = new THREE.Sprite(dotMat);
    this.redDot.scale.set(0.0032, 0.0032, 1);
    this.redDot.position.set(0, AX, 0);
    this.redDot.renderOrder = 6;
    O.add(this.redDot);
    const glowMat = new THREE.SpriteMaterial({
      map: dotTex, color: 0xff2211, transparent: true, opacity: 0,
      depthTest: false, blending: THREE.AdditiveBlending,
    });
    this.dotGlow = new THREE.Sprite(glowMat);
    this.dotGlow.scale.set(0.0095, 0.0095, 1);
    this.dotGlow.position.set(0, AX, 0);
    this.dotGlow.renderOrder = 5;
    O.add(this.dotGlow);
  }

  // ---- Gloved hands + camo sleeves ----------------------------------------
  _buildHands(g, M) {
    const flat = 0.018 * Math.cos(Math.PI / 8);

    // ================= LEFT HAND — C-grip on the handguard =================
    const lh = new THREE.Group();
    lh.position.set(0, 0, -0.30);
    lh.rotation.set(0, 0.05, 0.08);
    g.add(lh);
    this.leftHand = lh;
    this._lhBasePos = lh.position.clone();
    this._lhBaseRot = new THREE.Euler(0, 0.05, 0.08);

    // Fingers wrap the tube in the XY plane: knuckles on the left-underside,
    // curling under toward the right. orient rotY(-90°) points segments +X
    // and makes joint curls rotate about +Z (the tube axis plane).
    // Knuckles ride high on the tube's left face (classic C-clamp) so the
    // finger backs face the camera and catch the key light.
    const lOrient = new THREE.Euler(0, -Math.PI / 2, 0);
    const lFingers = [
      { z: -0.026, r: 0.0082, lens: [0.029, 0.021, 0.014], curls: [0, 0.80, 0.96], th: 3.13 },
      { z: -0.008, r: 0.0086, lens: [0.031, 0.022, 0.015], curls: [0, 0.78, 0.94], th: 3.12 },
      { z: 0.010, r: 0.0080, lens: [0.029, 0.021, 0.014], curls: [0, 0.82, 0.98], th: 3.10 },
      { z: 0.028, r: 0.0068, lens: [0.024, 0.017, 0.012], curls: [0, 0.90, 1.02], th: 3.07 },
    ];
    for (const f of lFingers) {
      const rad = flat + f.r - 0.0008; // pressed into the tube flat
      const kx = rad * Math.cos(f.th), ky = rad * Math.sin(f.th);
      const root = makeFinger(lh, M.glove, f.r, f.lens, f.curls, lOrient);
      root.position.set(kx, ky, f.z);
      // start direction = tangent of the wrap circle at the knuckle
      root.rotation.z = f.th + Math.PI / 2 - 0.12;
      // hard knuckle cap at the proximal joint (reads as glove armor)
      box(lh, M.knuck, 0.0065, 0.009, 0.012, kx - 0.0035, ky + 0.0025, f.z);
    }
    // Palm slab against the left flat + heel pad
    box(lh, M.glove, 0.022, 0.052, 0.076, -0.0330, 0.004, 0.012, 0, -0.10, 0.32);
    box(lh, M.gloveD, 0.017, 0.032, 0.032, -0.0345, -0.010, 0.034, 0, 0, 0.22);
    // Rounded metacarpal ridge softens the palm-box silhouette
    capsuleZ(lh, M.glove, 0.0105, 0.040, -0.0340, 0.0135, 0.004, 0.12, -0.12, 0);
    // Knuckle armor plate + strap across the back of the hand
    box(lh, M.knuck, 0.0080, 0.024, 0.062, -0.0388, 0.012, -0.002, 0, -0.05, 0.30);
    box(lh, M.gloveD, 0.004, 0.014, 0.066, -0.0402, -0.006, 0.008, 0, -0.05, 0.25);
    // Thumb pressed high alongside the rail riser, pointing to the muzzle
    const lThumb = makeFinger(lh, M.glove, 0.0075, [0.026, 0.020], [0, 0.10], null);
    lThumb.position.set(-0.0125, 0.0175, -0.010);
    lThumb.rotation.set(-0.03, -0.05, -0.35);
    // Wrist + camo forearm receding to bottom-left (kept slimmer than the
    // hand so the silhouette hierarchy reads: knuckles > palm > wrist)
    box(lh, M.glove, 0.020, 0.030, 0.030, -0.0335, -0.015, 0.032, 0.25, 0, 0.15);
    tubeBetween(lh, M.glove, 0.0185, 0.0215, [-0.034, -0.018, 0.038], [-0.046, -0.056, 0.086]);
    tubeBetween(lh, M.gloveD, 0.0228, 0.0228, [-0.042, -0.044, 0.072], [-0.046, -0.056, 0.086]);
    tubeBetween(lh, M.sleeve, 0.023, 0.032, [-0.043, -0.048, 0.076], [-0.082, -0.200, 0.210]);

    // ================= RIGHT HAND — on the pistol grip ======================
    // Parent frame matches the grip rake so the hand hugs it.
    const rh = new THREE.Group();
    rh.position.set(0, -0.084, 0.120);
    rh.rotation.x = -0.30;
    g.add(rh);
    this.rightHand = rh;

    // Palm on the grip's right face + back-of-hand mass toward the camera top
    box(rh, M.glove, 0.019, 0.058, 0.048, 0.0205, -0.010, 0.004, 0, 0, -0.06);
    capsuleZ(rh, M.glove, 0.0105, 0.032, 0.014, 0.0200, 0.002, 0.15, 0.10, 0);
    box(rh, M.knuck, 0.0065, 0.018, 0.046, 0.0300, -0.004, 0.002, 0, 0, -0.06);
    box(rh, M.gloveD, 0.0035, 0.012, 0.052, 0.0305, -0.028, 0.004, 0, 0, -0.06);

    // Middle/ring/pinky wrap the grip front. orient rotZ(90°) keeps segments
    // pointing -Z while curls rotate about the grip's long axis.
    const rOrient = new THREE.Euler(0, 0, Math.PI / 2);
    const rFingers = [
      { y: -0.004, r: 0.0074, lens: [0.029, 0.021, 0.016], curls: [0.15, 0.85, 0.95] },
      { y: -0.0210, r: 0.0070, lens: [0.027, 0.020, 0.015], curls: [0.18, 0.88, 0.98] },
      { y: -0.0370, r: 0.0060, lens: [0.022, 0.016, 0.012], curls: [0.22, 0.95, 1.02] },
    ];
    for (const f of rFingers) {
      const root = makeFinger(rh, M.glove, f.r, f.lens, f.curls, rOrient);
      root.position.set(0.0185, f.y, 0.0195);
    }
    // Index finger indexed straight along the receiver above the trigger
    const rIndex = makeFinger(rh, M.glove, 0.0072, [0.029, 0.020, 0.015], [0.05, 0.10, 0.12], rOrient);
    rIndex.position.set(0.0175, 0.0245, 0.006);
    rIndex.rotation.x = 0.10;
    // Thumb over the top-left (behind the safety)
    const rThumb = makeFinger(rh, M.glove, 0.0082, [0.028, 0.022], [0, 0.35], new THREE.Euler(0, Math.PI / 2, 0));
    rThumb.position.set(0.006, 0.026, 0.020);
    rThumb.rotation.x = -0.20;
    // Wrist + cuff + camo forearm receding to bottom-right
    tubeBetween(rh, M.glove, 0.021, 0.025, [0.021, -0.052, 0.012], [0.035, -0.105, 0.055]);
    tubeBetween(rh, M.gloveD, 0.0258, 0.0258, [0.031, -0.092, 0.044], [0.035, -0.105, 0.055]);
    tubeBetween(rh, M.sleeve, 0.0265, 0.038, [0.033, -0.098, 0.050], [0.068, -0.225, 0.148]);
  }

  // ---- Muzzle flash + marker ----------------------------------------------
  _buildFlash(g) {
    const tex = muzzleFlashTexture();
    const flashMat = new THREE.SpriteMaterial({
      map: tex, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthTest: false,
    });
    this.flash = new THREE.Sprite(flashMat);
    this.flash.scale.set(0.2, 0.2, 1);
    this.flash.position.set(0, 0, -0.548);
    this.flash.renderOrder = 10;
    g.add(this.flash);

    const coreMat = new THREE.SpriteMaterial({
      map: tex, color: 0xfff3d8, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthTest: false,
    });
    this.flashCore = new THREE.Sprite(coreMat);
    this.flashCore.scale.set(0.09, 0.09, 1);
    this.flashCore.position.set(0, 0, -0.535);
    this.flashCore.renderOrder = 11;
    g.add(this.flashCore);

    // Brief warm splash on the handguard/hand when firing
    this.flashLight = new THREE.PointLight(0xffb066, 0, 1.6, 2);
    this.flashLight.position.set(0, -0.01, -0.50);
    g.add(this.flashLight);

    // Muzzle marker for world-space effects
    this.muzzle = new THREE.Object3D();
    this.muzzle.position.set(0, 0, -0.523);
    g.add(this.muzzle);
  }

  // =========================================================================
  // Public API (contract used by weapons/main)
  // =========================================================================
  setEnvironment(envMap) {
    this.scene.environment = envMap;
    this.scene.environmentIntensity = 0.8;
  }

  triggerShot() {
    this.kickPos = Math.min(0.055, this.kickPos + 0.022);
    this.kickRot = Math.min(0.10, this.kickRot + 0.045);
    this.kickRoll = clamp(this.kickRoll + (rng() - 0.5) * 0.035, -0.05, 0.05);
    this.kickYaw = clamp(this.kickYaw + (rng() - 0.5) * 0.02, -0.03, 0.03);
    this.muzzleFlashT = 0;
    this.flashScale = 0.8 + rng() * 0.5;
    this.flash.material.rotation = rng() * Math.PI * 2;
    this.flashCore.material.rotation = rng() * Math.PI * 2;
  }

  startReload() {
    if (this.reloadT >= 0) return false;
    this.reloadT = 0;
    return true;
  }

  get reloading() { return this.reloadT >= 0; }

  /** Returns world-space muzzle position using the main camera transform. */
  getMuzzleWorld(mainCamera, out) {
    this.muzzle.getWorldPosition(out);
    // Viewmodel space == camera space; transform into world
    out.applyMatrix4(mainCamera.matrixWorld);
    return out;
  }

  // =========================================================================
  update(dt, ctx) {
    // ctx: { aiming, sprinting, moveNorm, mouseDX, mouseDY, bobPhase, onGround, dead }
    const aimTarget = ctx.aiming && !this.reloading && !ctx.sprinting ? 1 : 0;
    this.aimFrac = damp(this.aimFrac, aimTarget, 15, dt);

    // Reload progress + choreography phases
    let reloadBlend = 0, magDrop = 0, handToMag = 0, seat = 0;
    if (this.reloadT >= 0) {
      this.reloadT += dt;
      const t01 = this.reloadT / this.reloadDuration;
      if (t01 >= 1) { this.reloadT = -1; }
      else {
        reloadBlend = Math.sin(Math.min(t01, 1) * Math.PI) ** 0.7;
        const out = smoothstep(0.14, 0.34, t01);
        const back = smoothstep(0.52, 0.74, t01);
        magDrop = out * (1 - back);
        handToMag = smoothstep(0.04, 0.16, t01) * (1 - smoothstep(0.78, 0.94, t01));
        seat = Math.max(0, 1 - Math.abs((t01 - 0.76) / 0.06)); // mag seats: bump
      }
    }

    // Sway from mouse (lagged)
    this.swayX = damp(this.swayX, clamp(ctx.mouseDX * 0.0016, -0.05, 0.05), 9, dt);
    this.swayY = damp(this.swayY, clamp(ctx.mouseDY * 0.0016, -0.05, 0.05), 9, dt);

    // Kick recovery
    this.kickPos = damp(this.kickPos, 0, 11, dt);
    this.kickRot = damp(this.kickRot, 0, 9, dt);
    this.kickRoll = damp(this.kickRoll, 0, 8, dt);
    this.kickYaw = damp(this.kickYaw, 0, 8, dt);

    // Pose blending: hip -> ads -> sprint -> reload
    const sprintBlend = ctx.sprinting && !this.reloading ? 1 : 0;
    this._sprintF = damp(this._sprintF ?? 0, sprintBlend, 9, dt);
    const sp = this._sprintF;

    const px = lerp(lerp(this.hipPos.x, this.adsPos.x, this.aimFrac), this.sprintPos.x, sp);
    const py = lerp(lerp(this.hipPos.y, this.adsPos.y, this.aimFrac), this.sprintPos.y, sp);
    const pz = lerp(lerp(this.hipPos.z, this.adsPos.z, this.aimFrac), this.sprintPos.z, sp);
    const rx = lerp(lerp(this.hipRot.x, this.adsRot.x, this.aimFrac), this.sprintRot.x, sp);
    const ry = lerp(lerp(this.hipRot.y, this.adsRot.y, this.aimFrac), this.sprintRot.y, sp);
    const rz = lerp(lerp(this.hipRot.z, this.adsRot.z, this.aimFrac), this.sprintRot.z, sp);

    // Walk bob (reduced when aiming)
    this.bobT = ctx.bobPhase;
    const bobAmp = ctx.moveNorm * (1 - this.aimFrac * 0.85) * (ctx.onGround ? 1 : 0.25);
    const bobX = Math.sin(this.bobT * 0.5) * 0.008 * bobAmp;
    const bobY = -Math.abs(Math.sin(this.bobT)) * 0.007 * bobAmp;

    // Idle breathing
    const t = performance.now() / 1000;
    const idleMul = 1 - this.aimFrac * 0.7;
    const idleX = Math.sin(t * 1.1) * 0.0012 * idleMul;
    const idleY = Math.sin(t * 1.7) * 0.0011 * idleMul;
    const idleRoll = Math.sin(t * 0.9) * 0.004 * idleMul;

    const fp = this.pos;
    fp.set(
      px + bobX + idleX - this.swayX * (1 - this.aimFrac * 0.6),
      py + bobY + idleY + this.swayY * (1 - this.aimFrac * 0.6) - seat * 0.006,
      pz + this.kickPos
    );
    const fr = this.rot;
    fr.set(
      rx - this.kickRot + this.swayY * 0.6 + seat * 0.02,
      ry + this.swayX * 0.8 + this.kickYaw,
      rz + this.swayX * 0.4 + this.kickRoll + idleRoll
    );

    // Reload overlay motion
    if (reloadBlend > 0) {
      fp.lerp(this.reloadPos, reloadBlend * 0.9);
      fr.x = lerp(fr.x, this.reloadRot.x, reloadBlend * 0.9);
      fr.y = lerp(fr.y, this.reloadRot.y, reloadBlend * 0.9);
      fr.z = lerp(fr.z, this.reloadRot.z, reloadBlend * 0.9);
    }

    // Magazine drop/insert + left hand follows it
    this.mag.position.set(
      this._magBasePos.x,
      this._magBasePos.y - 0.17 * magDrop,
      this._magBasePos.z + 0.06 * magDrop
    );
    this.mag.rotation.x = this._magBaseRotX + 0.55 * magDrop;

    const lh = this.leftHand;
    if (handToMag > 0) {
      const hx = lerp(this._lhBasePos.x, 0.004, handToMag);
      const hy = lerp(this._lhBasePos.y, -0.128 - 0.17 * magDrop, handToMag);
      const hz = lerp(this._lhBasePos.z, 0.030 + 0.06 * magDrop, handToMag);
      lh.position.set(hx, hy, hz);
      lh.rotation.set(
        this._lhBaseRot.x + 0.5 * handToMag,
        this._lhBaseRot.y + 0.3 * handToMag,
        this._lhBaseRot.z - 0.55 * handToMag
      );
    } else {
      lh.position.copy(this._lhBasePos);
      lh.rotation.copy(this._lhBaseRot);
    }

    this.rifle.position.copy(fp);
    this.rifle.rotation.copy(fr);

    // Red dot: fades in with ADS
    this.redDot.material.opacity = this.aimFrac * 0.95;
    this.dotGlow.material.opacity = this.aimFrac * 0.30;

    // Muzzle flash decay (2-frame flash) + light splash
    this.muzzleFlashT += dt;
    const fa = Math.max(0, 1 - this.muzzleFlashT / 0.05);
    this.flash.material.opacity = fa * 0.95;
    this.flashCore.material.opacity = fa;
    const fs = this.flashScale * (0.115 + fa * 0.085) * (1 + this.aimFrac * 0.15);
    this.flash.scale.set(fs, fs, 1);
    this.flashCore.scale.set(fs * 0.45, fs * 0.45, 1);
    this.flashLight.intensity = fa * 2.0;

    // Viewmodel FOV: tighter when ADS
    this.engine.viewmodelCamera.fov = lerp(56, 42, this.aimFrac);
    this.engine.viewmodelCamera.updateProjectionMatrix();
  }
}
