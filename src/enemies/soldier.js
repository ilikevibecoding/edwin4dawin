import * as THREE from 'three';
import { makeRNG, clamp, lerp, smoothstep } from '../core/utils.js';

// ===========================================================================
// Procedural enemy soldier — modern military hostile built from primitives.
// Articulated rig: pelvis / spine / head / two-bone-IK arms / legs, with the
// rifle mounted at the right shoulder. Code-driven animation: weighted walk
// gait with counter-rotating shoulders vs hips, combat crouch, scanning idle,
// hit flinch and a two-stage buckling death fall.
// ===========================================================================

const rng = makeRNG(5555);

// Rig constants (meters, world space at identity)
const HIP_Y = 0.98;          // hips group rest height
const THIGH_LEN = 0.44;
const CALF_LEN = 0.40;
const UPPER_ARM = 0.29;
const FOREARM = 0.28;

// ---------------------------------------------------------------------------
// Material kits — three squad uniform variants, shared across instances.
// Value grouping sells the read at distance: uniforms LIGHT, kit/webbing
// near-charcoal with brown straps, boots darkest, helmet its own tone, skin
// warm. Nothing pure black; cloth keeps envMapIntensity low-moderate.
// ---------------------------------------------------------------------------
function m(color, rough = 0.92, metal = 0, envInt = 0.35) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, envMapIntensity: envInt });
}

// Deterministic value-noise for the local camo maps (independent of the
// shared materials.js cache so we control blob scale + value directly).
function makeValueNoise(seed) {
  const r = makeRNG(seed);
  const N = 64;
  const g = new Float32Array(N * N);
  for (let i = 0; i < N * N; i++) g[i] = r();
  const sm = (t) => t * t * (3 - 2 * t);
  const at = (ix, iy) => g[(iy & (N - 1)) * N + (ix & (N - 1))];
  const noise = (x, y) => {
    const ix = Math.floor(x), iy = Math.floor(y);
    const fx = sm(x - ix), fy = sm(y - iy);
    const a = at(ix, iy), b = at(ix + 1, iy), c = at(ix, iy + 1), d = at(ix + 1, iy + 1);
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  };
  return (x, y) => noise(x, y) * 0.62 + noise(x * 2.13, y * 2.13) * 0.38;
}

// Camo albedo map. freq≈5 puts blob size at ~7-10cm on the 0.35-0.45m
// torso/limb surfaces (each box face / cylinder wrap spans the full texture).
function makeCamoTexture(seed, palette) {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(size, size);
  const n = makeValueNoise(seed);
  const cols = palette.map((h) => new THREE.Color(h));
  const F = 5;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size, v = y / size;
      const n1 = n(u * F, v * F);
      const n2 = n(u * F + 13.7, v * F + 5.2);
      const idx = (n1 > 0.54 ? 2 : 0) + (n2 > 0.5 ? 1 : 0);
      const c = cols[idx];
      const micro = n(u * 42, v * 42) * 0.14 + 0.93;   // weave/dust variation
      const o = (y * size + x) * 4;
      img.data[o] = Math.min(255, c.r * 255 * micro);
      img.data[o + 1] = Math.min(255, c.g * 255 * micro);
      img.data[o + 2] = Math.min(255, c.b * 255 * micro);
      img.data[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

// Shared fabric weave normal map so cloth catches light instead of reading
// flat (tangent-space normals; bumpMap blacks out under SwiftShader).
let FABRIC_NRM = null;
function fabricNormalTexture() {
  if (FABRIC_NRM) return FABRIC_NRM;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(size, size);
  const n = makeValueNoise(777);
  const H = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      H[y * size + x] = n((x / size) * 26, (y / size) * 26) * 0.65 + n((x / size) * 60, (y / size) * 60) * 0.35;
    }
  }
  const h = (x, y) => H[((y + size) % size) * size + ((x + size) % size)];
  const strength = 2.4;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (h(x + 1, y) - h(x - 1, y)) * strength;
      const dy = (h(x, y + 1) - h(x, y - 1)) * strength;
      const len = Math.sqrt(dx * dx + dy * dy + 1);
      const o = (y * size + x) * 4;
      img.data[o] = ((-dx / len) * 0.5 + 0.5) * 255;
      img.data[o + 1] = ((dy / len) * 0.5 + 0.5) * 255;
      img.data[o + 2] = ((1 / len) * 0.5 + 0.5) * 255;
      img.data[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  FABRIC_NRM = new THREE.CanvasTexture(canvas);
  FABRIC_NRM.wrapS = FABRIC_NRM.wrapT = THREE.RepeatWrapping;
  return FABRIC_NRM;
}

function camoMat(seed, palette) {
  return new THREE.MeshStandardMaterial({
    map: makeCamoTexture(seed, palette),
    normalMap: fabricNormalTexture(),
    normalScale: new THREE.Vector2(0.55, 0.55),
    roughness: 0.95, metalness: 0, envMapIntensity: 0.5,
  });
}

// Soft radial blob for the contact shadow decal (shared).
let BLOB_TEX = null;
function blobShadowTexture() {
  if (BLOB_TEX) return BLOB_TEX;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 6, 64, 64, 62);
  g.addColorStop(0, 'rgba(0,0,0,0.9)');
  g.addColorStop(0.5, 'rgba(0,0,0,0.55)');
  g.addColorStop(0.8, 'rgba(0,0,0,0.18)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  BLOB_TEX = new THREE.CanvasTexture(c);
  return BLOB_TEX;
}

let BLOB_GEO = null;
function blobShadowGeometry() {
  if (BLOB_GEO) return BLOB_GEO;
  BLOB_GEO = new THREE.PlaneGeometry(1, 1);
  BLOB_GEO.rotateX(-Math.PI / 2);
  return BLOB_GEO;
}

let KITS = null;
function getKits() {
  if (KITS) return KITS;
  const shared = {
    gunmetal: m(0x2c2f36, 0.5, 0.8, 0.75),
    polymer: m(0x2f2d29, 0.78, 0.1, 0.4),
    skin: m(0xa1794f, 0.72, 0, 0.4),
    lens: m(0x10181c, 0.22, 0.55, 1.3),
    glove: m(0x3a352c, 0.9, 0, 0.32),
  };
  // Uniform palettes: light base values with ~30% tone spread so the pattern
  // reads at 4m instead of averaging into a flat blob.
  const oliveP = [0x7a8557, 0xa5a17a, 0x4c5336, 0xb5ad89];
  const tanP = [0xc2ab7c, 0xe0cda0, 0x8a7551, 0xd4c093];
  const greyP = [0x8a8d7e, 0xa9a99a, 0x585c4f, 0xbcbcae];
  // Every variant pairs its uniform with an OPPOSING kit value so vest and
  // pouches always separate from the cloth: olive+coyote, tan+dark earth,
  // grey+near-black with tan pouches.
  KITS = [
    { // 0: olive woodland fatigues + coyote-tan carrier
      uniform: camoMat(193, oliveP),
      vest: m(0x7d6845, 0.94), strap: m(0x453722, 0.95), pouch: m(0x846f4c, 0.95),
      pads: m(0x33302a, 0.9), boot: m(0x282219, 0.88, 0, 0.3),
      mask: m(0x35322c, 0.96), scarf: m(0x776a4e, 0.97),
      helmet: m(0x5a6046, 0.9, 0, 0.4), helmetTop: m(0x6e7457, 0.9, 0, 0.45),
      shoulder: m(0x8f8c6b, 0.95, 0, 0.42),
      furniture: m(0x3b3934, 0.75, 0.05, 0.4),
      ...shared,
    },
    { // 1: desert tan fatigues + dark-earth carrier
      uniform: camoMat(191, tanP),
      vest: m(0x453e30, 0.94), strap: m(0x5b4930, 0.95), pouch: m(0x554c3b, 0.95),
      pads: m(0x3a352c, 0.9), boot: m(0x352a1e, 0.88, 0, 0.3),
      mask: m(0x3d3831, 0.96), scarf: m(0x9c8a64, 0.97),
      helmet: m(0x94805c, 0.9, 0, 0.4), helmetTop: m(0xaa9670, 0.9, 0, 0.45),
      shoulder: m(0xc7b788, 0.95, 0, 0.42),
      furniture: m(0x7a6d58, 0.75, 0.05, 0.4),
      ...shared,
    },
    { // 2: grey urban fatigues + near-black carrier with tan pouches
      uniform: camoMat(192, greyP),
      vest: m(0x232427, 0.94), strap: m(0x4a3c2a, 0.95), pouch: m(0x8f7a58, 0.95),
      pads: m(0x2e2e2c, 0.9), boot: m(0x241f1a, 0.88, 0, 0.3),
      mask: m(0x2e2d2a, 0.96), scarf: m(0x6d685e, 0.97),
      helmet: m(0x62655a, 0.9, 0, 0.4), helmetTop: m(0x767a6c, 0.9, 0, 0.45),
      shoulder: m(0x97978a, 0.95, 0, 0.42),
      furniture: m(0x464642, 0.75, 0.05, 0.4),
      ...shared,
    },
  ];
  return KITS;
}

// ---------------------------------------------------------------------------
// Small mesh builders
// ---------------------------------------------------------------------------
function box(w, h, d, mat, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  return mesh;
}

function ball(r, mat, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 9), mat);
  mesh.position.set(x, y, z);
  mesh.scale.set(sx, sy, sz);
  mesh.castShadow = true;
  return mesh;
}

// Tapered limb segment: pivot at top, extends down local -Y.
function limb(rTop, rBot, len, mat) {
  const geo = new THREE.CylinderGeometry(rTop, rBot, len, 10);
  geo.translate(0, -len / 2, 0);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  return mesh;
}

function cyl(r1, r2, len, mat, x = 0, y = 0, z = 0, rotX = 0, rotZ = 0) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, len, 10), mat);
  mesh.position.set(x, y, z);
  mesh.rotation.set(rotX, 0, rotZ);
  mesh.castShadow = true;
  return mesh;
}

// ---------------------------------------------------------------------------
// Two-bone IK (torso space). Limb meshes extend down local -Y; lower group is
// a child of the upper group at (0, -upperLen, 0). Guarantees the hand lands
// exactly on the target, with the elbow pushed toward `pole`.
// ---------------------------------------------------------------------------
const _ikDir = new THREE.Vector3(), _ikPole = new THREE.Vector3(), _ikN = new THREE.Vector3();
const _ikE = new THREE.Vector3(), _ikX = new THREE.Vector3(), _ikY = new THREE.Vector3(), _ikZ = new THREE.Vector3();
const _ikM = new THREE.Matrix4(), _ikQ = new THREE.Quaternion();
const _bq = new THREE.Quaternion(), _bqi = new THREE.Quaternion(), _bv = new THREE.Vector3();

function solveTwoBone(upper, lower, target, a, b, pole) {
  const S = upper.position;
  _ikDir.subVectors(target, S);
  let d = _ikDir.length();
  d = clamp(d, Math.abs(a - b) + 0.02, a + b - 0.008);
  _ikDir.normalize();
  const p = (a * a - b * b + d * d) / (2 * d);
  const r = Math.sqrt(Math.max(a * a - p * p, 1e-8));
  _ikPole.copy(pole).addScaledVector(_ikDir, -pole.dot(_ikDir));
  if (_ikPole.lengthSq() < 1e-8) _ikPole.set(0, -1, 0);
  _ikPole.normalize();
  _ikE.copy(S).addScaledVector(_ikDir, p).addScaledVector(_ikPole, r);
  _ikN.crossVectors(_ikDir, _ikPole).normalize();

  // Upper bone: local -Y points shoulder -> elbow
  _ikY.subVectors(S, _ikE).normalize();
  _ikX.copy(_ikN);
  _ikZ.crossVectors(_ikX, _ikY).normalize();
  _ikX.crossVectors(_ikY, _ikZ);
  _ikM.makeBasis(_ikX, _ikY, _ikZ);
  upper.quaternion.setFromRotationMatrix(_ikM);

  // Lower bone: local -Y points elbow -> hand, expressed in upper's space
  _ikY.subVectors(_ikE, target).normalize();
  _ikX.copy(_ikN);
  _ikZ.crossVectors(_ikX, _ikY).normalize();
  _ikX.crossVectors(_ikY, _ikZ);
  _ikM.makeBasis(_ikX, _ikY, _ikZ);
  lower.quaternion.setFromRotationMatrix(_ikM).premultiply(_ikQ.copy(upper.quaternion).invert());
}

// ---------------------------------------------------------------------------
// Rifle — M4-style carbine built once, aimed down local -Z. Origin sits at
// the rear of the receiver so the stock reaches back to the shoulder.
// ---------------------------------------------------------------------------
function buildRifle(kit) {
  const g = new THREE.Group();
  const gm = kit.gunmetal, poly = kit.polymer, fur = kit.furniture;

  g.add(box(0.036, 0.068, 0.24, gm, 0, 0, -0.04));                 // receiver
  const hg = box(0.036, 0.05, 0.22, fur, 0, 0.002, -0.27);         // handguard
  g.add(hg);
  g.add(box(0.04, 0.012, 0.16, gm, 0, 0.033, -0.26));              // top rail
  g.add(box(0.012, 0.028, 0.018, gm, 0, 0.052, -0.355));           // front sight
  g.add(cyl(0.010, 0.010, 0.15, gm, 0, 0.004, -0.45, Math.PI / 2));// barrel
  g.add(cyl(0.0145, 0.0145, 0.05, gm, 0, 0.004, -0.545, Math.PI / 2)); // muzzle device
  // Optic: body + objective lens
  g.add(box(0.032, 0.042, 0.09, gm, 0, 0.064, -0.055));
  const lens = cyl(0.013, 0.013, 0.006, kit.lens, 0, 0.064, -0.102, Math.PI / 2);
  g.add(lens);
  // Curved magazine (two angled segments)
  const mag1 = box(0.03, 0.10, 0.05, poly, 0, -0.078, -0.095);
  mag1.rotation.x = 0.3;
  g.add(mag1);
  const mag2 = box(0.028, 0.06, 0.046, poly, 0, -0.148, -0.117);
  mag2.rotation.x = 0.62;
  g.add(mag2);
  // Pistol grip
  const grip = box(0.026, 0.075, 0.04, fur, 0, -0.058, 0.018);
  grip.rotation.x = 0.35;
  g.add(grip);
  // Buffer tube + stock + butt pad
  g.add(box(0.028, 0.042, 0.10, gm, 0, 0.004, 0.10));
  g.add(box(0.034, 0.072, 0.11, fur, 0, -0.006, 0.175));
  g.add(box(0.038, 0.088, 0.02, poly, 0, -0.006, 0.235));
  // Foregrip stub under handguard (left hand anchor)
  const fg = box(0.022, 0.05, 0.03, fur, 0, -0.043, -0.26);
  fg.rotation.x = -0.2;
  g.add(fg);
  return g;
}

// ===========================================================================
// Soldier
// ===========================================================================
export class Soldier {
  constructor() {
    this.root = new THREE.Group();
    // Yaw-first order so the death pitch/roll happens in the body's own frame
    // (corpse falls along its facing, not along world Z).
    this.root.rotation.order = 'YXZ';
    const kits = getKits();
    const kit = kits[rng.int(0, kits.length - 1)];
    this.kit = kit;

    // Per-instance character (deterministic)
    const scale = rng.range(0.975, 1.035);
    this.root.scale.setScalar(scale);
    this.phase = rng() * 20;                 // desync idle motion
    this.scanP1 = rng() * 7;
    this.scanP2 = rng() * 7;
    this.deathTwist = rng.range(0.45, 1) * (rng.chance(0.5) ? 1 : -1);
    this.deathLegA = rng.range(0.5, 1.1);
    this.deathLegB = rng.range(0.2, 0.8);
    const hasPack = rng.chance(0.6);
    const hasNVG = rng.chance(0.75);
    const hasAntenna = rng.chance(0.6);

    const uni = kit.uniform;

    // ------------------------------------------------------------- hips
    this.hips = new THREE.Group();
    this.hips.position.y = HIP_Y;
    this.root.add(this.hips);

    this.hips.add(box(0.30, 0.20, 0.20, uni, 0, -0.05, 0));               // pelvis
    this.hips.add(box(0.325, 0.055, 0.225, kit.strap, 0, 0.04, 0));       // belt
    // slung dump pouch hanging off the left hip — big silhouette break
    const dump = box(0.115, 0.16, 0.095, kit.pouch, 0.155, -0.105, 0.055);
    dump.rotation.y = 0.35;
    dump.rotation.x = 0.08;
    this.hips.add(dump);
    this.hips.add(box(0.02, 0.06, 0.06, kit.strap, 0.15, -0.005, 0.05));  // its hanger strap
    // utility pouch + canteen at the belt rear
    this.hips.add(box(0.10, 0.12, 0.05, kit.pouch, -0.13, -0.06, 0.095));
    const canteen = cyl(0.042, 0.046, 0.13, kit.pouch, -0.02, -0.075, 0.135);
    canteen.rotation.z = 0.06;
    this.hips.add(canteen);
    this.hips.add(cyl(0.02, 0.02, 0.025, kit.pads, -0.017, -0.005, 0.135)); // canteen cap

    // soft blob contact shadow — grounds the figure against bright asphalt
    this.blob = new THREE.Mesh(blobShadowGeometry(), new THREE.MeshBasicMaterial({
      map: blobShadowTexture(), transparent: true, opacity: 0.6,
      depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2,
    }));
    this.blob.scale.setScalar(1.05);
    this.blob.position.y = 0.02;
    this.blob.renderOrder = 1;
    this.root.add(this.blob);

    // ------------------------------------------------------------- legs
    const buildLeg = (side) => { // side: +1 left, -1 right
      const thigh = new THREE.Group();
      thigh.position.set(0.10 * side, -0.06, 0);
      this.hips.add(thigh);
      thigh.add(limb(0.084, 0.064, THIGH_LEN, uni));
      // cargo pocket on outer thigh
      thigh.add(box(0.024, 0.11, 0.085, uni, 0.072 * side, -0.24, 0.01));

      const calf = new THREE.Group();
      calf.position.y = -THIGH_LEN;
      thigh.add(calf);
      calf.add(limb(0.06, 0.047, CALF_LEN, uni));
      // knee pad — sits proud of the shin so it breaks the leg profile
      const pad = box(0.094, 0.11, 0.055, kit.pads, 0, -0.035, -0.062);
      pad.rotation.x = -0.18;
      calf.add(pad);
      calf.add(box(0.1, 0.022, 0.03, kit.strap, 0, -0.09, -0.045));  // pad strap
      // boot: shaft + foot + sole lip
      calf.add(cyl(0.056, 0.06, 0.10, kit.boot, 0, -0.355, 0));
      calf.add(box(0.096, 0.07, 0.23, kit.boot, 0, -0.433, -0.045));
      calf.add(box(0.106, 0.027, 0.25, kit.pads, 0, -0.468, -0.045));
      return { thigh, calf };
    };
    const L = buildLeg(1), R = buildLeg(-1);
    this.legL = L.thigh; this.calfL = L.calf;
    this.legR = R.thigh; this.calfR = R.calf;

    // drop holster on right thigh (rides with the leg)
    const holster = box(0.05, 0.15, 0.08, kit.pads, -0.082, -0.16, -0.01);
    this.legR.add(holster);
    this.legR.add(box(0.055, 0.03, 0.09, kit.strap, -0.08, -0.085, -0.01)); // holster strap
    this.legR.add(box(0.03, 0.05, 0.035, kit.polymer, -0.085, -0.075, 0.025)); // pistol grip stub

    // ------------------------------------------------------------- torso
    this.torso = new THREE.Group();
    this.torso.position.y = 0.12;
    this.hips.add(this.torso);

    this.torso.add(box(0.32, 0.24, 0.20, uni, 0, 0.08, 0));           // lower torso
    this.torso.add(box(0.36, 0.30, 0.22, uni, 0, 0.31, 0));           // chest
    this.torso.add(box(0.26, 0.075, 0.18, uni, 0, 0.44, 0.01));       // traps / upper back

    // Plate carrier
    this.torso.add(box(0.32, 0.30, 0.055, kit.vest, 0, 0.295, -0.135));  // front plate
    this.torso.add(box(0.32, 0.32, 0.06, kit.vest, 0, 0.30, 0.125));     // back plate
    this.torso.add(box(0.06, 0.20, 0.20, kit.vest, 0.175, 0.21, 0));     // cummerbund L
    this.torso.add(box(0.06, 0.20, 0.20, kit.vest, -0.175, 0.21, 0));    // cummerbund R
    this.torso.add(box(0.07, 0.035, 0.20, kit.strap, 0.105, 0.462, -0.01)); // shoulder strap L
    this.torso.add(box(0.07, 0.035, 0.20, kit.strap, -0.105, 0.462, -0.01)); // shoulder strap R
    // 3 mag pouches + flaps
    for (let i = -1; i <= 1; i++) {
      this.torso.add(box(0.078, 0.115, 0.05, kit.pouch, i * 0.088, 0.185, -0.175));
      this.torso.add(box(0.08, 0.045, 0.056, kit.strap, i * 0.088, 0.235, -0.174));
    }
    // Admin pouch high on chest
    this.torso.add(box(0.15, 0.075, 0.035, kit.pouch, 0, 0.375, -0.16));
    // Plate-carrier collar riding up around the neck
    const collarB = box(0.17, 0.065, 0.05, kit.vest, 0, 0.475, 0.095);
    collarB.rotation.x = 0.2;
    this.torso.add(collarB);
    this.torso.add(box(0.05, 0.06, 0.10, kit.vest, 0.115, 0.468, 0.035));
    this.torso.add(box(0.05, 0.06, 0.10, kit.vest, -0.115, 0.468, 0.035));
    // Radio on left shoulder strap + whip antenna (strong silhouette cue)
    this.torso.add(box(0.048, 0.10, 0.038, kit.pads, 0.12, 0.40, -0.115));
    const antenna = cyl(0.006, 0.0035, 0.24, kit.polymer, 0.138, 0.545, -0.105);
    antenna.rotation.z = -0.12;
    this.torso.add(antenna);
    if (hasAntenna) {
      // some carry a second stub antenna on the back plate
      this.torso.add(cyl(0.005, 0.004, 0.12, kit.polymer, -0.10, 0.48, 0.14));
    }
    // Hydration pack on the back
    if (hasPack) {
      this.torso.add(box(0.22, 0.28, 0.09, kit.pouch, 0, 0.28, 0.195));
      this.torso.add(box(0.20, 0.05, 0.10, kit.strap, 0, 0.415, 0.185));
    }

    // ------------------------------------------------------------- head
    this.head = new THREE.Group();
    this.head.position.set(-0.015, 0.52, 0);
    this.torso.add(this.head);
    this.torso.add(cyl(0.052, 0.056, 0.08, kit.mask, -0.01, 0.49, 0));   // neck
    // shemagh / neck wrap (pushed forward so the carrier collar reads behind)
    const scarf = ball(0.082, kit.scarf, -0.01, 0.49, -0.03, 1.15, 0.56, 1.05);
    this.torso.add(scarf);

    this.head.add(ball(0.106, kit.mask, 0, 0.025, 0, 0.9, 1.02, 0.96));   // balaclava skull
    this.head.add(box(0.10, 0.07, 0.10, kit.mask, 0, -0.028, -0.025));    // jaw
    this.head.add(box(0.104, 0.03, 0.02, kit.skin, 0, 0.047, -0.092));    // eye strip
    this.head.add(box(0.112, 0.018, 0.022, kit.pads, 0, 0.075, -0.089));  // brow shadow band
    // comms headset earcups + band (sit in the high-cut helmet ear gap)
    this.head.add(cyl(0.041, 0.041, 0.028, kit.pads, 0.096, 0.01, 0, 0, Math.PI / 2));
    this.head.add(cyl(0.041, 0.041, 0.028, kit.pads, -0.096, 0.01, 0, 0, Math.PI / 2));
    this.head.add(box(0.02, 0.04, 0.05, kit.pads, 0.104, 0.01, -0.045));  // mic boom stub

    // helmet: high-cut dome — sides stop above the earcups (ear gap reads in
    // silhouette), front brim overhangs the eyes, small rear skirt.
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 9, 0, Math.PI * 2, 0, Math.PI * 0.55), kit.helmet);
    dome.position.y = 0.098;
    dome.scale.set(0.97, 0.88, 1.05);
    dome.castShadow = true;
    this.head.add(dome);
    // lighter crown cap — reads as sky light catching the helmet top
    const crown = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 5, 0, Math.PI * 2, 0, Math.PI * 0.24), kit.helmetTop);
    crown.position.y = 0.099;
    crown.scale.set(0.975, 0.885, 1.055);
    this.head.add(crown);
    const brim = box(0.155, 0.022, 0.055, kit.helmet, 0, 0.075, -0.108);
    brim.rotation.x = 0.14;
    this.head.add(brim);
    const skirt = box(0.165, 0.05, 0.035, kit.helmet, 0, 0.055, 0.098);
    skirt.rotation.x = -0.3;
    this.head.add(skirt);
    // NVG mount plate + arm
    if (hasNVG) {
      this.head.add(box(0.034, 0.05, 0.016, kit.polymer, 0, 0.135, -0.118));
      this.head.add(box(0.024, 0.02, 0.035, kit.polymer, 0, 0.155, -0.13));
    }
    // side rails
    this.head.add(box(0.014, 0.03, 0.10, kit.polymer, 0.118, 0.10, -0.005));
    this.head.add(box(0.014, 0.03, 0.10, kit.polymer, -0.118, 0.10, -0.005));
    // goggles strapped up on the helmet
    this.head.add(box(0.115, 0.042, 0.035, kit.pads, 0, 0.135, -0.095));
    this.head.add(box(0.095, 0.028, 0.006, kit.lens, 0, 0.135, -0.114));
    this.head.add(box(0.24, 0.024, 0.012, kit.strap, 0, 0.135, 0.0));    // goggle strap around

    // ------------------------------------------------------------- arms
    const buildArm = (side) => { // +1 left, -1 right
      const upper = new THREE.Group();
      upper.position.set(0.168 * side, 0.375, side > 0 ? -0.02 : 0.02);
      this.torso.add(upper);
      // deltoid pad in a lighter tone — top-light "kicker" that pops the
      // shoulder line off dark backgrounds
      upper.add(ball(0.076, kit.shoulder, 0, -0.02, 0, 1, 1.15, 1));
      upper.add(limb(0.058, 0.047, UPPER_ARM, uni));
      const fore = new THREE.Group();
      fore.position.y = -UPPER_ARM;
      upper.add(fore);
      fore.add(ball(0.05, kit.pads, 0, 0.005, 0));            // elbow pad
      fore.add(cyl(0.052, 0.048, 0.06, uni, 0, -0.04, 0));    // rolled sleeve
      fore.add(limb(0.044, 0.036, FOREARM, kit.glove));       // gloved forearm sleeve
      const hand = box(0.052, 0.085, 0.075, kit.glove, 0, -FOREARM - 0.01, -0.005);
      hand.rotation.x = -0.35;
      fore.add(hand);
      return { upper, fore };
    };
    const AL = buildArm(1), AR = buildArm(-1);
    this.armL = AL.upper; this.forearmL = AL.fore;
    this.armR = AR.upper; this.forearmR = AR.fore;

    // ------------------------------------------------------------- rifle
    this.rifle = buildRifle(kit);
    this.torso.add(this.rifle);
    // Rest pose seats the stock in the shoulder pocket (slightly inboard of
    // the deltoid, buried ~2cm so there is never an air gap).
    this.rifleRest = new THREE.Vector3(-0.12, 0.395, -0.22);
    this.rifle.position.copy(this.rifleRest);
    this.rifle.rotation.set(0, -0.035, 0);

    // Muzzle world-space anchor (tracer origin)
    this.muzzle = new THREE.Object3D();
    this.muzzle.position.set(0, 0.004, -0.575);
    this.rifle.add(this.muzzle);

    // Enemy muzzle flash sprite
    const flashMat = new THREE.SpriteMaterial({
      color: 0xffd9a0, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    this.flash = new THREE.Sprite(flashMat);
    this.flash.scale.set(0.4, 0.4, 1);
    this.flash.position.set(0, 0.004, -0.63);
    this.rifle.add(this.flash);

    // IK targets/poles (torso space) — poles pulled down/in so elbows tuck.
    // gripL kept within arm reach so the support hand lands ON the guard
    // instead of being clamped short of it.
    this.gripR = new THREE.Vector3(0, -0.085, 0.025);    // rifle-local: pistol grip
    this.gripL = new THREE.Vector3(0, -0.045, -0.26);    // rifle-local: handguard
    this.poleR = new THREE.Vector3(-0.35, -1, 0.24).normalize();
    this.poleL = new THREE.Vector3(0.55, -1, -0.2).normalize();
    this.splayR = new THREE.Vector3(-0.33, 0.06, -0.16); // death splay targets
    this.splayL = new THREE.Vector3(0.36, 0.03, -0.12);
    this._tR = new THREE.Vector3();
    this._tL = new THREE.Vector3();

    // Animation state
    this.t = rng() * 100;
    this.walkPhase = rng() * 10;
    this.flinchT = 99;
    this.flinchSide = 1;
    this.deathT = -1;
    this.deathDir = 1;
    this.deathYaw = 0;
    this.flashT = 99;
    this.alertW = 1;

    this._pose(0, 0, 0, 0, 0, 0, 1);
  }

  triggerFlash() {
    this.flashT = 0;
    this.flash.material.rotation = rng() * Math.PI * 2;
    const s = 0.32 + rng() * 0.2;
    this.flash.scale.set(s, s, 1);
  }

  startDeath(dir) {
    this.deathT = 0;
    this.deathDir = dir >= 0 ? 1 : -1;
    this.deathYaw = this.root.rotation.y;   // preserve facing through the fall
  }

  flinch() {
    this.flinchT = 0;
    this.flinchSide = rng.chance(0.5) ? 1 : -1;
  }

  // Transform a rifle-local point into torso space and solve both arms.
  _solveArms(blendSplay = 0) {
    this._tR.copy(this.gripR).applyQuaternion(this.rifle.quaternion).add(this.rifle.position);
    this._tL.copy(this.gripL).applyQuaternion(this.rifle.quaternion).add(this.rifle.position);
    if (blendSplay > 0) {
      this._tR.lerp(this.splayR, blendSplay);
      this._tL.lerp(this.splayL, blendSplay);
    }
    solveTwoBone(this.armR, this.forearmR, this._tR, UPPER_ARM, FOREARM, this.poleR);
    solveTwoBone(this.armL, this.forearmL, this._tL, UPPER_ARM, FOREARM, this.poleL);
  }

  /**
   * Animate. moveSpeed in m/s, crouch 0..1, aimPitch aims torso/rifle.
   * opts (optional): { fwd, side } local-space velocity for lean,
   * alert 0..1 (aimed vs patrol carry).
   */
  update(dt, moveSpeed, crouch, aimPitch, opts = null) {
    this.t += dt;

    // Muzzle flash fade (runs even while dying)
    this.flashT += dt;
    this.flash.material.opacity = Math.max(0, 1 - this.flashT / 0.05) * 0.95;

    if (this.deathT >= 0) { this._updateDeath(dt); return; }

    this.flinchT += dt;
    const fwdN = opts ? clamp(opts.fwd / 4, -1, 1) : clamp(moveSpeed / 4, 0, 1);
    const sideN = opts ? clamp(opts.side / 4, -1, 1) : 0;
    const alertTarget = opts && opts.alert !== undefined ? opts.alert : 1;
    this.alertW = lerp(this.alertW, alertTarget, 1 - Math.exp(-dt * 5));

    this.walkPhase += dt * (3.4 + moveSpeed * 1.9);
    const w = clamp(moveSpeed / 2.9, 0, 1.15);
    const idle = clamp(1 - w * 2.2, 0, 1);
    const ph = this.walkPhase;
    const s = Math.sin(ph);
    const c = crouch;
    const tt = this.t + this.phase;

    this._pose(w, s, ph, c, fwdN, sideN, idle, aimPitch, tt);
  }

  _pose(w, s, ph, c, fwdN, sideN, idle, aimPitch = 0, tt = 0) {
    const alert = this.alertW ?? 1;

    // ---- legs: swing + knee fold, blended with asymmetric combat crouch ----
    const swing = 0.52 * Math.min(w, 1);
    const kneeL = Math.max(0, -Math.sin(ph - 0.45)) * 1.05 * w;
    const kneeR = Math.max(0, Math.sin(ph - 0.45)) * 1.05 * w;
    this.legL.rotation.x = s * swing + c * 0.95;
    this.legR.rotation.x = -s * swing + c * 0.42;
    this.legL.rotation.y = 0;
    this.legR.rotation.y = -c * 0.3;
    this.calfL.rotation.x = -0.06 - kneeL - c * 1.68;
    this.calfR.rotation.x = -0.06 - kneeR - c * 1.62;
    // idle stance stagger (left foot slightly forward)
    this.legL.position.z = -0.04 * idle - c * 0.05;
    this.legR.position.z = 0.04 * idle + c * 0.04;

    // ---- hips: bob at 2x step frequency + sway + bladed stance ----
    // Drop the pelvis exactly enough that the planted (straight) leg keeps
    // its boot on the ground through the stride — kills the floaty look.
    const dip = 0.014 * w - (THIGH_LEN + CALF_LEN) * (1 - Math.cos(swing * s)) * 0.9;
    const breath = Math.sin(tt * 1.35) * 0.004;
    this.hips.position.y = HIP_Y - c * 0.31 + dip + breath;
    this.hips.position.z = c * 0.045;
    const blade = 0.21 * (1 - w * 0.7) * (0.35 + alert * 0.65);
    this.hips.rotation.y = s * 0.10 * w + blade * 0.4;
    this.hips.rotation.z = s * 0.05 * w;
    this.hips.rotation.x = -c * 0.05;

    // ---- torso: counter-rotate shoulders vs hips, lean into movement ----
    this.torso.rotation.y = -s * 0.17 * w + blade * 0.6 + Math.sin(tt * 0.7) * 0.015 * idle;
    const leanX = -0.055 - alert * 0.05 - Math.max(0, fwdN) * 0.13 + Math.min(0, fwdN) * 0.06 - c * 0.24;
    this.torso.rotation.x = leanX + aimPitch * 0.55 + Math.sin(tt * 1.35) * 0.006;
    this.torso.rotation.z = -sideN * 0.07 - s * 0.03 * w + Math.sin(tt * 0.9 + 1.3) * 0.008 * idle;

    // ---- rifle: shouldered when aiming (alert 1); low-ready with the muzzle
    // dropped ~30 deg and pulled to the chest when holding (alert < 1) ----
    const lowReady = 1 - alert;
    this.rifle.position.set(
      this.rifleRest.x + s * 0.006 * w,
      this.rifleRest.y - dip * 0.5 + Math.sin(tt * 1.35 + 0.6) * 0.003 - lowReady * 0.055,
      this.rifleRest.z + lowReady * 0.05
    );
    this.rifle.rotation.set(
      aimPitch * 0.45 * alert + c * 0.20 - lowReady * 0.62 + Math.sin(tt * 1.1) * 0.006,
      -0.035 - blade - s * 0.05 * w + Math.sin(tt * 0.83) * 0.005,
      0
    );
    this._solveArms(0);

    // ---- head: cheek drops toward the stock when aiming, scans when idle ----
    const scan = (Math.sin(tt * 0.5 + this.scanP1) * 0.45 + Math.sin(tt * 0.21 + this.scanP2) * 0.3)
      * (1 - alert * 0.85) + Math.sin(tt * 0.62 + this.scanP1) * 0.05 * idle;
    const weld = alert * alert;   // cheek weld only when truly aimed
    this.head.position.x = -0.015 - weld * 0.022;
    this.head.rotation.y = -0.12 * weld - blade + scan;
    this.head.rotation.x = aimPitch * 0.4 * alert - 0.06 * weld - leanX * 0.55 + Math.abs(s) * 0.015 * w;
    this.head.rotation.z = -0.14 * weld;

    // ---- flinch impulse (flinchT advances in update() with real dt) ----
    if (this.flinchT < 0.24) {
      const k = 1 - this.flinchT / 0.24;
      const k2 = k * k;
      this.torso.rotation.x += 0.20 * k2;
      this.torso.rotation.z += 0.10 * k2 * this.flinchSide;
      this.head.rotation.x += 0.28 * k2;
      this.head.rotation.z += 0.12 * k2 * this.flinchSide;
      this.rifle.rotation.x -= 0.30 * k2;
      this.hips.position.z += 0.03 * k2;
    }
  }

  // Two-stage death: knees buckle, then the torso twists and drops with
  // gravity ease-in, lands with a small bounce and settles.
  _updateDeath(dt) {
    this.deathT += dt;
    const t = this.deathT;
    const dir = -this.deathDir; // +1 falls backward (shot from the front)

    const buckle = smoothstep(0, 0.16, t);
    const fallT = clamp((t - 0.11) / 0.62, 0, 1);
    const f = Math.pow(fallT, 1.85);           // gravity: slow start, fast end
    const bt = t - 0.73;
    const bounce = bt > 0 ? Math.sin(bt * 24) * Math.exp(-bt * 9) * 0.05 : 0;
    const tw = this.deathTwist;

    this.root.rotation.x = dir * (1.50 * f + bounce);
    this.root.rotation.y = this.deathYaw + tw * f * 0.8;
    this.root.rotation.z = tw * f * -0.22;

    this.hips.position.y = HIP_Y - 0.36 * buckle - 0.38 * f;
    this.hips.position.z = 0.04 * buckle;
    this.hips.rotation.x = -0.1 * buckle + dir * 0.1 * f;
    this.hips.rotation.y = 0;
    this.hips.rotation.z = 0;

    // legs: buckle under, then sprawl asymmetrically
    this.legL.rotation.x = 0.55 * buckle * this.deathLegA - f * 0.5 * this.deathLegB;
    this.legR.rotation.x = 0.40 * buckle * this.deathLegB + f * 0.45 * this.deathLegA;
    this.legL.rotation.y = tw * 0.2 * f;
    this.legR.rotation.y = -tw * 0.15 * f;
    this.calfL.rotation.x = -1.5 * buckle + f * (1.5 * buckle - 0.3);
    this.calfR.rotation.x = -1.3 * buckle + f * (1.3 * buckle - 0.55 * this.deathLegA);

    // torso slumps then twists with the fall
    this.torso.rotation.x = -0.30 * buckle + dir * 0.28 * f;
    this.torso.rotation.y = tw * 0.45 * f;
    this.torso.rotation.z = tw * 0.18 * f;

    // head snaps forward on the hit, then lolls with the fall
    this.head.rotation.x = -0.35 * buckle + dir * 0.55 * f;
    this.head.rotation.y = tw * 0.3 * f;
    this.head.rotation.z = tw * 0.35 * f;

    // weapon pitches forward out of control; arms loosen toward a sprawl
    this.rifle.position.set(
      this.rifleRest.x - 0.03 * f,
      this.rifleRest.y - 0.14 * f,
      this.rifleRest.z - 0.02 * f
    );
    this.rifle.rotation.set(-1.15 * f - 0.25 * buckle, -0.06 + tw * 0.5 * f, tw * 0.3 * f);
    this._solveArms(f * 0.85);

    // Contact shadow: counter-rotate so it stays flat on the ground and
    // slides under the settling body; shrinks + fades as the body lands.
    _bq.setFromEuler(this.root.rotation);
    _bv.set(0, 0.72, 0).applyQuaternion(_bq);
    _bv.y = 0.02;
    _bqi.copy(_bq).invert();
    this.blob.quaternion.copy(_bqi);
    this.blob.position.copy(_bv.applyQuaternion(_bqi));
    this.blob.scale.setScalar(1.05 - 0.25 * f);
    this.blob.material.opacity = 0.6 - 0.26 * f;

    // Sink into the ground before removal
    if (t > 6) this.root.position.y -= dt * 0.25;
  }
}
