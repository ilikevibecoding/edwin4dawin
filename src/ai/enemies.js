import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { getMaterialLib } from '../world/textures.js';
import { makeRNG, clamp, lerp, damp } from '../core/math.js';

const NAMES = ['ASWAD', 'JACKAL', 'VIPER', 'KHAT', 'RAMI', 'ZOLTAN', 'HYENA', 'SCARAB', 'FALAK', 'DERVISH', 'MIRAGE', 'SIROCCO'];
const rng = makeRNG(5150);

/* ------------------------- shared soldier assets --------------------------- */
/* Geometries and canvas textures are built once at module level and shared by
   every soldier instance; materials are cached per variant (3 sets) so a full
   squad shares GPU state. Per-enemy cost is meshes + transforms only. */

let SHARED = null;

/** Sine-product crinkle: fabric fold displacement baked into a geometry once
 *  (deterministic in position, so the UV seam column stays welded). */
function crinkle(geo, amt, freq = 150) {
  const p = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = Math.sin(v.x * freq + 1.7) * Math.sin(v.y * freq * 0.8 + 4.2) * Math.sin(v.z * freq + 2.9);
    const k = 1 + n * amt;
    p.setXYZ(i, v.x * k, v.y * k, v.z * k);
  }
  geo.computeVertexNormals();
  return geo;
}

/** Skull + jaw head sculpted from one sphere so the equirect UV survives for
 *  the painted face map (u=0.25 faces local +Z). Replaces the old bare sphere
 *  that read as a clay pot / lathe urn: the cranium narrows side-to-side, the
 *  crown flattens, the occiput tucks toward the neck, and the lower-front
 *  hemisphere is pulled down and tapered into a jaw with a chin and a subtle
 *  nose ridge + brow step in the profile silhouette. ~560 tris, shared. */
function buildHeadGeo() {
  const R = 0.108;
  const geo = new THREE.SphereGeometry(R, 20, 14);
  const p = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    let { x, y, z } = v;
    const t = clamp(-y / R, 0, 1);          // 0 at equator, 1 at bottom pole
    x *= 0.84;                              // narrow the skull
    if (y > 0.55 * R) y = y * 0.93 + 0.55 * R * 0.07;  // flatten the crown
    if (y < 0) {
      const front = clamp(z / R, 0, 1);
      // Jaw: width tapers with depth (hardest at the chin), the chin
      // converges and juts slightly forward, the mandible is pulled down.
      x *= 1 - 0.36 * t * (0.35 + 0.65 * front);
      if (z > 0) {
        z *= 1 - 0.20 * t;
        y *= 1 + 0.40 * t * front;
        z += 0.015 * t * front;
      } else {
        y *= 1 - 0.30 * t;                  // occiput tucks onto the neck
        z *= 1 - 0.08 * t;
      }
    }
    // Profile features: nose ridge and brow step on the forward face.
    const ang = Math.atan2(x, z);           // horizontal angle off face fwd
    const ny = y / R;
    if (Math.abs(ang) < 0.38 && ny > -0.34 && ny < 0.10) {
      const lat = Math.cos((ang / 0.38) * Math.PI * 0.5);
      const prof = Math.sin(((ny + 0.34) / 0.44) * Math.PI); // peaks mid-nose
      z += 0.011 * lat * prof;
    }
    if (Math.abs(ang) < 0.62 && ny >= 0.10 && ny < 0.34) {
      const lat = Math.cos((ang / 0.62) * Math.PI * 0.5);
      z += 0.005 * lat;                     // brow ridge
    }
    p.setXYZ(i, x, y, z);
  }
  geo.computeVertexNormals();
  return geo;
}

/** 256px painted face. Multiplicative shading over a near-white base so the
 *  per-variant skin material colour supplies the tone. Canvas top = crown,
 *  x=64 = face centre (u=0.25). Dark eye-socket pockets with a horizontal
 *  shadow band (NO cartoon eyeballs), brow bars, nose shading, moustache and
 *  a noisy beard mass over jaw + upper lip, scalp stubble, under-jaw AO. */
function paintFaceCanvas() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, 256, 256);
  const fr = makeRNG(7741);
  // Skin unevenness
  for (let i = 0; i < 170; i++) {
    g.fillStyle = i % 2 ? 'rgba(150,96,66,0.045)' : 'rgba(255,238,214,0.05)';
    g.fillRect(fr() * 256, fr() * 256, 3 + fr() * 9, 3 + fr() * 9);
  }
  // Scalp stubble with a jagged hairline; temples stay dark further down.
  g.fillStyle = 'rgba(24,17,12,0.42)';
  g.fillRect(0, 0, 256, 54);
  for (let x = 0; x < 256; x += 4) g.fillRect(x, 54, 4, 3 + fr() * 12);
  g.fillRect(0, 54, 26, 46);      // temple / sideburn left of face
  g.fillRect(102, 54, 152, 46);   // wraps around the back to other temple
  // Forehead crease hints
  g.fillStyle = 'rgba(70,45,30,0.10)';
  g.fillRect(38, 84, 52, 2);
  g.fillRect(40, 94, 48, 2);
  // Brow bars with a glabella gap
  g.fillStyle = 'rgba(26,17,11,0.55)';
  g.fillRect(34, 106, 25, 9);
  g.fillRect(69, 106, 25, 9);
  // Horizontal eye-shadow band across both sockets
  g.fillStyle = 'rgba(30,20,14,0.28)';
  g.fillRect(30, 114, 68, 17);
  // Eye pockets: soft radial darkness, squashed vertically. No whites.
  const socket = (cx) => {
    const rg = g.createRadialGradient(cx, 124, 2, cx, 124, 13);
    rg.addColorStop(0, 'rgba(12,8,6,0.70)');
    rg.addColorStop(0.55, 'rgba(20,13,9,0.36)');
    rg.addColorStop(1, 'rgba(20,13,9,0)');
    g.save();
    g.translate(cx, 124); g.scale(1, 0.62); g.translate(-cx, -124);
    g.fillStyle = rg;
    g.fillRect(cx - 14, 108, 28, 32);
    g.restore();
  };
  socket(47);
  socket(81);
  // Lash lines (dark horizontal slits inside the pockets)
  g.fillStyle = 'rgba(10,7,5,0.52)';
  g.fillRect(39, 122, 17, 4);
  g.fillRect(72, 122, 17, 4);
  // Nose: bridge side shading + nostril base
  g.fillStyle = 'rgba(70,44,30,0.13)';
  g.fillRect(56, 114, 3, 30);
  g.fillRect(69, 114, 3, 30);
  g.fillStyle = 'rgba(40,25,17,0.34)';
  g.fillRect(57, 144, 14, 6);
  // Cheek hollows under the sockets
  g.fillStyle = 'rgba(60,38,26,0.09)';
  g.fillRect(27, 133, 17, 20);
  g.fillRect(84, 133, 17, 20);
  // Moustache over the upper lip
  g.fillStyle = 'rgba(20,14,10,0.5)';
  g.fillRect(46, 151, 36, 10);
  // Mouth shadow line
  g.fillStyle = 'rgba(30,16,12,0.35)';
  g.fillRect(52, 163, 24, 3);
  // Beard mass: jaw + chin, wrapping the full lower hemisphere (all u values
  // converge under the jaw near the bottom pole) with speckle noise so it
  // reads as hair, not paint. Denser on the front face.
  g.fillStyle = 'rgba(22,15,10,0.30)';
  g.fillRect(0, 168, 256, 88);
  g.fillStyle = 'rgba(22,15,10,0.26)';
  g.fillRect(20, 156, 26, 16);    // beard climbs the cheeks beside the mouth
  g.fillRect(82, 156, 26, 16);
  for (let i = 0; i < 480; i++) {
    const bx = 14 + fr() * 100;
    const by = 152 + fr() * 96;
    if (by < 168 && bx > 44 && bx < 84 && by > 160 && by < 168) continue; // lip gap
    g.fillStyle = fr() > 0.5 ? 'rgba(14,10,7,0.38)' : 'rgba(30,20,13,0.3)';
    g.fillRect(bx, by, 1 + fr() * 2.4, 1 + fr() * 2.4);
  }
  for (let i = 0; i < 220; i++) { // sparse wrap onto sides/nape
    g.fillStyle = 'rgba(16,11,8,0.28)';
    g.fillRect(fr() * 256, 176 + fr() * 72, 1 + fr() * 2, 1 + fr() * 2);
  }
  // Under-jaw AO
  g.fillStyle = 'rgba(20,14,10,0.18)';
  g.fillRect(0, 232, 256, 24);
  return c;
}

function getShared() {
  if (SHARED) return SHARED;
  const lib = getMaterialLib();

  const faceTex = new THREE.CanvasTexture(paintFaceCanvas());
  faceTex.colorSpace = THREE.SRGBColorSpace;

  // Head-cover map: cloth over the whole head, skin visible only through the
  // eye slit (baked per skin tone + cloth colour, cached). Dark gear-green =
  // knit balaclava; khaki = full shemagh wrap.
  const balaCache = new Map();
  const balaclavaTex = (skinHex, cloth = '#3a3d34') => {
    const key = skinHex + cloth;
    let tex = balaCache.get(key);
    if (tex) return tex;
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d');
    g.fillStyle = cloth;
    g.fillRect(0, 0, 256, 256);
    g.fillStyle = 'rgba(0,0,0,0.13)';
    for (let y = 0; y < 256; y += 3) g.fillRect(0, y, 256, 1);   // knit rows
    g.fillStyle = 'rgba(255,255,255,0.05)';
    for (let x = 0; x < 256; x += 9) g.fillRect(x, 0, 2, 256);   // rib columns
    // Fold shading + a catch-light ridge so the slit reads as an opening
    g.fillStyle = 'rgba(255,255,255,0.10)';
    g.fillRect(32, 106, 64, 5);
    g.fillStyle = 'rgba(0,0,0,0.25)';
    g.fillRect(32, 111, 64, 3);
    g.fillRect(32, 138, 64, 5);
    // Eye slit: skin band + horizontal eye shadow (kept wide so covered
    // faces still read as faces, not featureless blobs)
    g.fillStyle = '#' + skinHex.toString(16).padStart(6, '0');
    g.fillRect(36, 114, 56, 24);
    g.fillStyle = 'rgba(20,14,10,0.5)';
    g.fillRect(41, 122, 46, 8);
    tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    balaCache.set(key, tex);
    return tex;
  };

  // Cloth mottle: one shared 256px canvas (~300 rects at 5% alpha, two tones)
  // used as albedo break-up AND roughness variation on cloth + pants.
  const motC = document.createElement('canvas');
  motC.width = motC.height = 256;
  const mc = motC.getContext('2d');
  mc.fillStyle = '#f4f2ee';
  mc.fillRect(0, 0, 256, 256);
  const mRng = makeRNG(9713);
  for (let i = 0; i < 300; i++) {
    mc.fillStyle = i % 2 ? 'rgba(52,44,34,0.05)' : 'rgba(255,252,240,0.05)';
    mc.fillRect(mRng() * 256, mRng() * 256, 4 + mRng() * 8, 4 + mRng() * 8);
  }
  const mkMottle = (srgb) => {
    const t = new THREE.CanvasTexture(motC);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(2, 2);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  const mottleMap = mkMottle(true);
  const mottleRough = mkMottle(false);

  // Blob contact shadow: radial gradient, drawn under each soldier.
  const blobC = document.createElement('canvas');
  blobC.width = blobC.height = 128;
  const bc = blobC.getContext('2d');
  const grd = bc.createRadialGradient(64, 64, 6, 64, 64, 62);
  grd.addColorStop(0, 'rgba(0,0,0,0.4)');
  grd.addColorStop(0.55, 'rgba(0,0,0,0.22)');
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  bc.fillStyle = grd;
  bc.fillRect(0, 0, 128, 128);
  const blobTex = new THREE.CanvasTexture(blobC);
  const blobMat = new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false });
  const blobGeo = new THREE.PlaneGeometry(0.75, 0.75).rotateX(-Math.PI / 2);

  // Helmet: sphere-cap shell with crinkled cloth-cover wrinkles (only above
  // the rim so the edge stays clean) + rim band; shroud/rails/strap geos.
  const helmGeo = new THREE.SphereGeometry(0.132, 16, 10, 0, Math.PI * 2, 0, 1.92);
  {
    const p = helmGeo.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      if (v.y > -0.02) {
        const n = Math.sin(v.x * 155 + 1.2) * Math.sin(v.y * 120 + 3.9) * Math.sin(v.z * 150 + 2.2);
        const k = 1 + n * 0.022;
        p.setXYZ(i, v.x * k, v.y * k, v.z * k);
      }
    }
    helmGeo.scale(1.02, 0.88, 1.10);
    helmGeo.computeVertexNormals();
  }

  const geo = {
    torsoUp: new RoundedBoxGeometry(0.46, 0.30, 0.27, 1, 0.035),
    torsoLow: new RoundedBoxGeometry(0.43, 0.34, 0.25, 1, 0.03),
    pad: new RoundedBoxGeometry(0.15, 0.12, 0.24, 1, 0.035),
    vest: new RoundedBoxGeometry(0.42, 0.38, 0.35, 1, 0.02),
    pouch: new RoundedBoxGeometry(0.1, 0.13, 0.07, 1, 0.015),
    pouchLid: new RoundedBoxGeometry(0.115, 0.035, 0.085, 1, 0.012),
    belt: new RoundedBoxGeometry(0.45, 0.09, 0.31, 1, 0.02),
    collar: new THREE.CylinderGeometry(0.075, 0.083, 0.07, 8),
    head: buildHeadGeo(),
    neck: new THREE.CylinderGeometry(0.052, 0.058, 0.09, 8),
    // Helmet furniture
    helmet: helmGeo,
    helmRim: new THREE.TorusGeometry(0.128, 0.009, 5, 14).rotateX(Math.PI / 2).scale(1.02, 1, 1.10),
    nvgShroud: new RoundedBoxGeometry(0.055, 0.05, 0.016, 1, 0.004),
    nvgPlate: new RoundedBoxGeometry(0.028, 0.03, 0.012, 1, 0.003),
    sideRail: new RoundedBoxGeometry(0.014, 0.026, 0.10, 1, 0.004),
    strapSide: new THREE.BoxGeometry(0.009, 0.1, 0.004),
    chinCup: new RoundedBoxGeometry(0.036, 0.014, 0.03, 1, 0.004),
    // Shemagh full-wrap furniture
    wrapDome: crinkle(new THREE.SphereGeometry(0.122, 14, 9, 0, Math.PI * 2, 0, 1.78), 0.03).scale(0.96, 0.9, 1.02),
    wrapBand: new THREE.TorusGeometry(0.104, 0.017, 5, 12).rotateX(Math.PI / 2).scale(1, 0.9, 1.04),
    faceScarf: crinkle(new THREE.SphereGeometry(0.115, 14, 7, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.36), 0.028),
    tail: new THREE.BoxGeometry(0.12, 0.23, 0.028),
    // Patrol cap
    cap: new THREE.CylinderGeometry(0.098, 0.109, 0.078, 12),
    capBrim: new RoundedBoxGeometry(0.15, 0.014, 0.10, 1, 0.005),
    shemagh: new THREE.TorusGeometry(0.085, 0.035, 6, 12).rotateX(Math.PI / 2).scale(1, 0.45, 1),
    // Limbs: capsules (kills the voxel-mannequin read on arms AND legs)
    upperArm: new THREE.CapsuleGeometry(0.062, 0.19, 3, 8),
    foreArm: new THREE.CapsuleGeometry(0.05, 0.18, 3, 8),
    hand: new RoundedBoxGeometry(0.07, 0.095, 0.065, 1, 0.022),
    thigh: new THREE.CapsuleGeometry(0.082, 0.27, 3, 8),
    shin: new THREE.CapsuleGeometry(0.062, 0.28, 3, 8),
    pelvis: new RoundedBoxGeometry(0.4, 0.18, 0.26, 1, 0.05),
    kneepad: new RoundedBoxGeometry(0.115, 0.13, 0.05, 1, 0.018),
    strap: new THREE.BoxGeometry(0.36, 0.025, 0.02),
    blouse: new THREE.CylinderGeometry(0.064, 0.079, 0.11, 8),
    boot: new RoundedBoxGeometry(0.115, 0.12, 0.26, 1, 0.02),
    thighRig: new RoundedBoxGeometry(0.09, 0.13, 0.11, 1, 0.015),
    canteen: new RoundedBoxGeometry(0.1, 0.14, 0.08, 1, 0.02),
    buttpack: new RoundedBoxGeometry(0.2, 0.14, 0.1, 1, 0.02),
    holster: new RoundedBoxGeometry(0.06, 0.16, 0.09, 1, 0.015),
    chestPouch: new RoundedBoxGeometry(0.14, 0.09, 0.05, 1, 0.012),
    radioPouch: new RoundedBoxGeometry(0.11, 0.16, 0.05, 1, 0.012),
    hydration: new RoundedBoxGeometry(0.2, 0.3, 0.035, 1, 0.015),
    antenna: new THREE.CylinderGeometry(0.004, 0.004, 0.16, 6),
    // Rifle parts (assembled per soldier in buildEnemyRifle, geo shared).
    // Sized for the 10-15m read: fat receiver, deep 3-segment banana mag,
    // boxy optic on the top cover, tall front-sight tower, distinct stock.
    rReceiver: new RoundedBoxGeometry(0.048, 0.075, 0.27, 1, 0.008),
    rDustCover: new RoundedBoxGeometry(0.042, 0.024, 0.20, 1, 0.006),
    rRearSight: new THREE.BoxGeometry(0.024, 0.018, 0.03),
    rSightLeaf: new THREE.BoxGeometry(0.012, 0.005, 0.055),
    rOpticMount: new THREE.BoxGeometry(0.03, 0.022, 0.08),
    rOptic: new RoundedBoxGeometry(0.038, 0.046, 0.095, 1, 0.007),
    rHandguard: new RoundedBoxGeometry(0.054, 0.054, 0.17, 1, 0.012),
    rGasTube: new RoundedBoxGeometry(0.034, 0.028, 0.16, 1, 0.009),
    rBarrel: new THREE.CylinderGeometry(0.010, 0.0115, 0.20, 10).rotateX(Math.PI / 2),
    rGasBlock: new THREE.BoxGeometry(0.026, 0.037, 0.028),
    rFsTower: new THREE.BoxGeometry(0.024, 0.06, 0.024),
    rFsEar: new THREE.BoxGeometry(0.006, 0.036, 0.016),
    rFsPost: new THREE.CylinderGeometry(0.0022, 0.0022, 0.026, 6),
    rBrake: new THREE.CylinderGeometry(0.0135, 0.0155, 0.05, 10).rotateX(Math.PI / 2),
    rStock: new RoundedBoxGeometry(0.042, 0.07, 0.24, 1, 0.008),
    rButtpad: new RoundedBoxGeometry(0.05, 0.10, 0.024, 1, 0.006),
    rGrip: new RoundedBoxGeometry(0.034, 0.09, 0.045, 1, 0.009),
    rTrigger: new THREE.BoxGeometry(0.004, 0.018, 0.006),
    rGuard: new THREE.BoxGeometry(0.024, 0.004, 0.052),
    rMag1: new RoundedBoxGeometry(0.038, 0.115, 0.062, 1, 0.006),
    rMag2: new RoundedBoxGeometry(0.036, 0.105, 0.058, 1, 0.006),
    rMag3: new RoundedBoxGeometry(0.034, 0.09, 0.052, 1, 0.006),
    // Sling straps (webbing run: stock heel -> sag under receiver -> guard)
    rSlingA: new THREE.BoxGeometry(0.026, 0.007, 0.212),
    rSlingB: new THREE.BoxGeometry(0.026, 0.007, 0.196),
    rSlingC: new THREE.BoxGeometry(0.026, 0.007, 0.25),
  };

  // ---- shared (variant-independent) materials
  const mats = {
    glove: new THREE.MeshStandardMaterial({ color: 0x2e2a24, roughness: 0.9 }),
    boot: new THREE.MeshStandardMaterial({ color: 0x2e261c, roughness: 0.9 }),
    knee: new THREE.MeshStandardMaterial({ color: 0x3a3d34, roughness: 0.92 }),
    strap: new THREE.MeshStandardMaterial({ color: 0xc9b78a, roughness: 0.92 }),
    gearHard: new THREE.MeshStandardMaterial({ color: 0x2f2f2a, roughness: 0.88 }),
    // Furniture tones sit a full value step above the near-black receiver so
    // the rifle reads two-tone (not a featureless black stick) even when the
    // camera side of the soldier is in shadow.
    wood: new THREE.MeshStandardMaterial({ color: 0x7a5330, roughness: 0.6 }),
    polymer: new THREE.MeshStandardMaterial({ color: 0x494e42, roughness: 0.8 }),
    wrapCloth: new THREE.MeshStandardMaterial({ color: 0x776b52, roughness: 1 }),
    shemCloth: new THREE.MeshStandardMaterial({ color: 0x5f5a48, roughness: 1 }),
  };
  // Helmet cloth cover shares the camo canvas maps + mottled roughness.
  const helmCover = lib.camo.clone();
  helmCover.roughnessMap = mottleRough;
  helmCover.color.multiplyScalar(1.02);
  mats.helmCover = helmCover;

  SHARED = { faceTex, balaclavaTex, mottleMap, mottleRough, blobGeo, blobMat, geo, mats, variantCache: new Map() };
  return SHARED;
}

/** Per-variant material set, cached so all soldiers of a variant share GPU
 *  state (de-cloning comes from headgear rolls, gear pool + scale jitter). */
function getVariantMats(variant) {
  const S = getShared();
  const key = variant % 3;
  let m = S.variantCache.get(key);
  if (m) return m;
  const lib = getMaterialLib();
  const skinTone = [0x5f493b, 0x4e392c, 0x6d5245][key];
  const skin = new THREE.MeshStandardMaterial({ color: skinTone, roughness: 0.95 });
  const face = new THREE.MeshStandardMaterial({ color: skinTone, roughness: 0.95, map: S.faceTex });
  let cloth;
  if (key === 0) {
    cloth = lib.camo.clone();               // shares the camo canvas maps
    cloth.roughnessMap = S.mottleRough;
    cloth.color.multiplyScalar(1.1);        // lift toward the light-uniform step
  } else {
    cloth = new THREE.MeshStandardMaterial({
      color: key === 1 ? 0x7a7a60 : 0x77735c,
      roughness: 0.95, map: S.mottleMap, roughnessMap: S.mottleRough,
    });
  }
  const clothLow = cloth.clone();
  clothLow.color.multiplyScalar(0.8);       // fake AO under the vest
  const pants = new THREE.MeshStandardMaterial({
    color: [0x7b7660, 0x6b665a, 0x757458][key],
    roughness: 0.95, map: S.mottleMap, roughnessMap: S.mottleRough,
  });
  const gear = new THREE.MeshStandardMaterial({ color: 0x33352c, roughness: 0.9 });
  const gearDark = gear.clone();
  gearDark.color.multiplyScalar(0.85);
  const bala = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, map: S.balaclavaTex(skinTone, '#4a4d42') });
  const wrap = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, map: S.balaclavaTex(skinTone, '#6b6148') });
  m = { skinTone, skin, face, cloth, clothLow, pants, gear, gearDark, bala, wrap };
  S.variantCache.set(key, m);
  return m;
}

/* ----------------------------- enemy rifle --------------------------------- */
/* Local copy of the world-model rifle (owned here so concurrent edits to the
   viewmodel file can't break enemies). AKM-pattern: chamfered stamped
   receiver + dust cover, wood OR polymer furniture, curved 2-segment mag,
   gas tube over the handguard, gas block, front sight tower with post and
   protective ears, slanted brake. Forward = -Z, origin at the receiver rear
   above the grip so mount math stays simple. kind: 0 = wood, 1 = polymer. */
function buildEnemyRifle(kind = 0) {
  const lib = getMaterialLib();
  const S = getShared();
  const G = S.geo;
  const metal = lib.gunMetal;
  const furn = kind === 0 ? S.mats.wood : S.mats.polymer;
  const g = new THREE.Group();
  const add = (geoRef, mat, x, y, z, rx = 0) => {
    const m = new THREE.Mesh(geoRef, mat);
    m.position.set(x, y, z);
    m.rotation.x = rx;
    m.castShadow = true;
    g.add(m);
    return m;
  };
  add(G.rReceiver, metal, 0, 0, -0.01);
  add(G.rDustCover, metal, 0, 0.045, -0.03);
  add(G.rRearSight, metal, 0, 0.052, -0.10);
  add(G.rSightLeaf, metal, 0, 0.063, -0.085, -0.06);
  // Boxy red-dot silhouette on a riser over the rear cover
  add(G.rOpticMount, metal, 0, 0.055, 0.015);
  add(G.rOptic, S.mats.gearHard, 0, 0.085, 0.01);
  add(G.rHandguard, furn, 0, -0.002, -0.245);
  add(G.rGasTube, furn, 0, 0.044, -0.245);
  add(G.rBarrel, metal, 0, 0.021, -0.42);
  add(G.rGasBlock, metal, 0, 0.038, -0.345);
  add(G.rFsTower, metal, 0, 0.055, -0.465);
  add(G.rFsEar, metal, -0.012, 0.07, -0.465);
  add(G.rFsEar, metal, 0.012, 0.07, -0.465);
  add(G.rFsPost, metal, 0, 0.078, -0.465);
  add(G.rBrake, metal, 0, 0.021, -0.525);
  add(G.rStock, furn, 0, -0.02, 0.17, -0.06);
  add(G.rButtpad, S.mats.gearHard, 0, -0.035, 0.29, -0.06);
  add(G.rGrip, furn, 0, -0.068, 0.05, 0.30);
  add(G.rTrigger, metal, 0, -0.046, 0.008);
  add(G.rGuard, metal, 0, -0.06, 0.002);
  // Deep curved magazine: three segments canted progressively forward so
  // the banana profile reads even against the torso at range.
  add(G.rMag1, metal, 0, -0.072, -0.048, 0.24);
  add(G.rMag2, metal, 0, -0.16, -0.085, 0.58);
  add(G.rMag3, metal, 0, -0.228, -0.14, 0.92);
  // Sling: stock heel down under the receiver, flat sag, up to the guard.
  add(G.rSlingA, S.mats.glove, 0, -0.115, 0.193, -0.497);
  add(G.rSlingB, S.mats.glove, 0, -0.165, 0.005, 0);
  add(G.rSlingC, S.mats.glove, 0, -0.10, -0.195, 0.554);
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, 0.021, -0.555);
  g.add(muzzle);
  return { group: g, muzzle };
}

/* --------------------- weapon mount pose constants ------------------------- */
/* The aim group pivot sits at the RIGHT SHOULDER POCKET. Two constant local
   poses for the rifle inside that group are blended by aimBlend each frame.
   The blend is a DIRECT quaternion slerp (verified short-arc, dot = +0.97):
   the bore sweeps monotonically from -26 deg up to 0, so no intermediate
   frame can ever show a vertical/port-arms rifle.

   MOUNT (engaging): stock butt socketed into the pocket, bore running +Z in
   group space ~4cm above the pivot (cheek-weld height). Because the mounted
   bore is exactly +Z, the per-frame aim solve is closed-form and roll-free.

   LOW-READY (default hold in combat and on patrol): the butt plate slides
   just out of the pocket onto the FRONT DELTOID, the bore drops 26 deg
   below horizon (the ~6 deg forward combat lean brings the world-space
   depression to ~32 deg, inside the 25-35 low-ready band) and sweeps 40 deg
   across the chest, so the muzzle clears the support-side hip and the rifle
   reads as one long diagonal line across the torso even when the soldier is
   squared up to the viewer (a smaller sweep foreshortens into a near-
   vertical sliver from the front — verified on captures). */
const RIFLE_P_MOUNT = new THREE.Vector3(0, 0.035, 0.27);
const RIFLE_Q_MOUNT = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI, 0.04));
const RIFLE_P_LOW = new THREE.Vector3(-0.10, -0.11, 0.26);
const RIFLE_Q_LOW = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.57, Math.PI - 0.62, 0.10));
const AIM_POS = new THREE.Vector3(0.17, 0.505, 0.12);
// Hands are welded to the rifle; wrists (IK targets) sit just behind them.
const IK_R = new THREE.Vector3(0.012, -0.10, 0.10);    // rifle-local, behind grip
const IK_L = new THREE.Vector3(-0.008, -0.05, -0.10);  // rifle-local, behind guard
const POLE_R = new THREE.Vector3(0.6, -0.85, 0.1);     // right elbow: down + out
const POLE_L = new THREE.Vector3(-0.3, -0.95, 0.2);    // left elbow: straight down

/* Scratch objects for the per-frame solver (no per-frame allocations). */
const _aV1 = new THREE.Vector3();
const _aV2 = new THREE.Vector3();
const _aV3 = new THREE.Vector3();
const _aQ1 = new THREE.Quaternion();
const _aQSway = new THREE.Quaternion();
const _aE = new THREE.Euler();
const _tTo = new THREE.Vector3();
const _tDir = new THREE.Vector3();
const _tEye = new THREE.Vector3();
const _tPEye = new THREE.Vector3();
const _tPush = new THREE.Vector3();
const _tAxis = new THREE.Vector3();

/* Two-bone IK: orient shoulder + elbow so the wrist lands on `target` (in the
   shoulder's parent space). Chain: elbow at shoulder-local (0,-L1,0), forearm
   along -Y, wrist at elbow-local (0,-L2,0); elbow bends about local +X with
   negative values folding the forearm forward. `pole` biases elbow direction.
   Fully scratch-based: called twice per enemy per frame. */
const _sD = new THREE.Vector3();
const _sM = new THREE.Vector3();
const _sU = new THREE.Vector3();
const _sE2 = new THREE.Vector3();
const _sF = new THREE.Vector3();
const _sX = new THREE.Vector3();
const _sZ = new THREE.Vector3();
const _sMat = new THREE.Matrix4();
function solveArm(arm, target, pole, L1 = 0.30, L2 = 0.29) {
  const s = arm.shoulder.position;
  _sD.copy(target).sub(s);
  const d = clamp(_sD.length(), Math.abs(L1 - L2) + 0.02, (L1 + L2) * 0.99);
  _sD.normalize();
  const cosE = clamp((L1 * L1 + L2 * L2 - d * d) / (2 * L1 * L2), -1, 1);
  const elbowAng = Math.acos(cosE);
  const cosS = clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1);
  const shAng = Math.acos(cosS);
  _sM.copy(pole).addScaledVector(_sD, -pole.dot(_sD));
  if (_sM.lengthSq() < 1e-6) _sM.set(0, 0, 1);
  _sM.normalize();
  _sU.copy(_sD).multiplyScalar(Math.cos(shAng)).addScaledVector(_sM, Math.sin(shAng));
  _sE2.copy(s).addScaledVector(_sU, L1);
  _sF.copy(target).sub(_sE2).normalize();
  _sZ.copy(_sF).addScaledVector(_sU, -_sF.dot(_sU));
  if (_sZ.lengthSq() < 1e-6) _sZ.copy(_sM);
  _sZ.normalize();
  _sU.negate();                       // upper-arm axis -> shoulder yAxis
  _sX.crossVectors(_sU, _sZ);
  _sMat.makeBasis(_sX, _sU, _sZ);
  arm.shoulder.quaternion.setFromRotationMatrix(_sMat);
  arm.elbow.rotation.set(-(Math.PI - elbowAng), 0, 0);
}

/* ------------------------------ soldier model ------------------------------ */

function buildSoldier(variant = 0) {
  const lib = getMaterialLib();
  const S = getShared();
  const G = S.geo;
  const M = getVariantMats(variant);
  const { skin, face, cloth, clothLow, pants, gear, gearDark } = M;
  const glove = S.mats.glove;

  const root = new THREE.Group();
  const mk = (geoRef, mat, parent, x = 0, y = 0, z = 0) => {
    const m = new THREE.Mesh(geoRef, mat);
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  };

  // -- torso assembly
  const torsoPivot = new THREE.Group();
  torsoPivot.position.y = 1.02;
  root.add(torsoPivot);
  mk(G.torsoUp, cloth, torsoPivot, 0, 0.425, 0);
  mk(G.torsoLow, clothLow, torsoPivot, 0, 0.165, 0);
  for (const s of [-1, 1]) mk(G.pad, cloth, torsoPivot, s * 0.235, 0.5, 0);
  mk(G.vest, gear, torsoPivot, 0, 0.3, 0);
  for (let i = 0; i < 3; i++) {
    mk(G.pouch, gear, torsoPivot, -0.13 + i * 0.13, 0.225, 0.2);
    mk(G.pouchLid, gear, torsoPivot, -0.13 + i * 0.13, 0.3, 0.205);
  }
  mk(G.belt, gear, torsoPivot, 0, 0, 0);
  // Tan webbing straps across the vest front: the carrier reads at 50 m.
  mk(G.strap, S.mats.strap, torsoPivot, 0, 0.4, 0.185);
  mk(G.strap, S.mats.strap, torsoPivot, 0, 0.155, 0.185);
  // Carrier back: hydration-bladder outline + flat radio pouch with antenna
  // + three PALS webbing rows, so the rear face isn't a featureless slab.
  mk(G.hydration, gearDark, torsoPivot, 0.03, 0.3, -0.195);
  mk(G.radioPouch, gear, torsoPivot, -0.13, 0.36, -0.2);
  mk(G.antenna, lib.gunMetal, torsoPivot, -0.13, 0.51, -0.21).rotation.x = 0.1;
  for (const py of [0.2, 0.28, 0.36]) mk(G.strap, S.mats.strap, torsoPivot, 0.02, py, -0.215);

  // -- pelvis pivot: carries the pelvis block AND both legs so the walk cycle
  //    can counter-rotate hips against the shoulders (+-6 deg) and the kneel
  //    can open the hips toward the gun side.
  const pelvisPivot = new THREE.Group();
  pelvisPivot.position.y = 1.0;
  root.add(pelvisPivot);
  mk(G.pelvis, pants, pelvisPivot, 0, -0.08, 0);

  // Optional gear pool: two attachments are dropped per spawn (de-clone).
  const gearPool = [
    () => mk(G.canteen, gear, torsoPivot, -0.19, -0.04, -0.13),
    () => mk(G.buttpack, gear, torsoPivot, 0, 0.08, -0.19),
    () => { mk(G.holster, gear, torsoPivot, 0.215, -0.06, 0.05).rotation.z = -0.08; },
    () => { mk(G.chestPouch, gear, torsoPivot, 0, 0.415, 0.185).rotation.x = -0.15; },
  ];
  for (let i = 0; i < 2; i++) gearPool.splice(rng.int(0, gearPool.length - 1), 1);
  for (const fn of gearPool) fn();

  // -- head: shared skull-jaw sculpt (see buildHeadGeo) with the painted face
  //    map, or a cloth cover texture (balaclava / full shemagh wrap) with only
  //    the eye band of skin visible. Scaled ~1/7.5 of body height with gear.
  const headPivot = new THREE.Group();
  headPivot.position.y = 0.66;
  torsoPivot.add(headPivot);
  const balaclava = variant % 3 !== 1 && rng.chance(0.4);
  const fullWrap = variant % 3 === 1;
  const headMat = balaclava ? M.bala : fullWrap ? M.wrap : face;
  mk(G.head, headMat, headPivot, 0, 0.1, 0);
  mk(G.neck, balaclava || fullWrap ? S.mats.knee : skin, headPivot, 0, -0.005, 0.005);
  if (variant % 3 === 0) {
    // Ballistic helmet: crinkled cloth-cover shell raked so the back drops
    // toward the nape, + rim band, front NVG shroud with mounting plate,
    // side rail blocks and a chinstrap running under the jaw.
    const helm = new THREE.Group();
    helm.position.set(0, 0.128, -0.006);
    helm.rotation.x = -0.10;
    headPivot.add(helm);
    mk(G.helmet, S.mats.helmCover, helm, 0, 0, 0);
    mk(G.helmRim, S.mats.gearHard, helm, 0, -0.034, 0);
    mk(G.nvgShroud, S.mats.gearHard, helm, 0, 0.012, 0.126).rotation.x = -0.16;
    mk(G.nvgPlate, S.mats.gearHard, helm, 0, 0.016, 0.138).rotation.x = -0.16;
    for (const s of [-1, 1]) {
      const rail = mk(G.sideRail, S.mats.gearHard, helm, s * 0.126, -0.012, 0.01);
      rail.rotation.y = -s * 0.08;
      rail.rotation.z = s * 0.10;
    }
    // Chinstrap: side straps angling forward-down from the rim, cup under jaw.
    for (const s of [-1, 1]) {
      const st = mk(G.strapSide, S.mats.glove, headPivot, s * 0.076, 0.008, 0.03);
      st.rotation.z = s * 0.30;
      st.rotation.x = 0.22;
    }
    mk(G.chinCup, S.mats.glove, headPivot, 0, -0.052, 0.062).rotation.x = 0.3;
    mk(G.collar, cloth, torsoPivot, 0, 0.585, 0.01);
  } else if (variant % 3 === 1) {
    // Full shemagh wrap: crinkled dome + brow band + face scarf + tail over
    // the cloth-textured head (skin shows only at the eye slit).
    mk(G.wrapDome, S.mats.wrapCloth, headPivot, 0, 0.112, 0);
    mk(G.wrapBand, S.mats.wrapCloth, headPivot, 0, 0.142, 0.012).rotation.x = 0.08;
    mk(G.faceScarf, S.mats.wrapCloth, headPivot, 0, 0.068, 0.02);
    mk(G.tail, S.mats.wrapCloth, headPivot, 0.045, -0.03, -0.125).rotation.x = 0.28;
    mk(G.shemagh, S.mats.shemCloth, torsoPivot, 0, 0.6, 0.05);
  } else {
    // Patrol cap (brim shadows the brow) + shemagh coiled at the neck.
    mk(G.cap, cloth, headPivot, 0, 0.168, -0.004);
    mk(G.capBrim, cloth, headPivot, 0, 0.138, 0.115).rotation.x = -0.14;
    mk(G.shemagh, S.mats.shemCloth, torsoPivot, 0, 0.6, 0.05);
  }

  // -- aim group at the right shoulder pocket. The rifle (with BOTH hands
  //    welded to it) blends between the low-ready and mounted local poses;
  //    the group itself is rotated by the stateless aim solve in update().
  const aimGroup = new THREE.Group();
  aimGroup.position.copy(AIM_POS);
  torsoPivot.add(aimGroup);

  const mkArm = (side) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(side > 0 ? 0.26 : -0.24, side > 0 ? 0.50 : 0.49, side > 0 ? 0.02 : 0.06);
    torsoPivot.add(shoulder);
    mk(G.upperArm, cloth, shoulder, 0, -0.15, 0);
    const elbow = new THREE.Group();
    elbow.position.y = -0.30;
    shoulder.add(elbow);
    mk(G.foreArm, cloth, elbow, 0, -0.14, 0);
    return { shoulder, elbow };
  };
  const armR = mkArm(1);
  const armL = mkArm(-1);

  const rifleKind = rng.chance(0.55) ? 0 : 1;
  const { group: rifle, muzzle } = buildEnemyRifle(rifleKind);
  rifle.position.copy(RIFLE_P_LOW);
  rifle.quaternion.copy(RIFLE_Q_LOW);
  aimGroup.add(rifle);

  // Hands ride ON the weapon (children of the rifle group): right hand wraps
  // the pistol grip, left hand cups the handguard from below. They can never
  // leave the gun at any aim angle; the arms IK onto wrist anchors behind
  // them every frame.
  const handR = mk(G.hand, glove, rifle, 0, -0.085, 0.05);
  handR.rotation.set(0.3, 0, 0);
  const handL = mk(G.hand, glove, rifle, 0, -0.038, -0.155);
  handL.rotation.set(-0.35, 0, 0.15);

  // Initial arm pose (build-time only; per-frame path is allocation-free).
  const wr = IK_R.clone().applyQuaternion(rifle.quaternion).add(rifle.position).add(aimGroup.position);
  const wl = IK_L.clone().applyQuaternion(rifle.quaternion).add(rifle.position).add(aimGroup.position);
  solveArm(armR, wr, POLE_R);
  solveArm(armL, wl, POLE_L);

  // -- legs: capsule thigh/shin under the pelvis pivot, kneepads, trouser
  //    blouse + boots. Shin overlaps into the thigh so knees never open.
  const mkLeg = (side) => {
    const hip = new THREE.Group();
    hip.position.set(side * 0.11, 0, 0);
    pelvisPivot.add(hip);
    mk(G.thigh, pants, hip, 0, -0.21, 0);
    const knee = new THREE.Group();
    knee.position.y = -0.44;
    hip.add(knee);
    mk(G.shin, pants, knee, 0, -0.185, 0);
    mk(G.kneepad, S.mats.knee, knee, 0, -0.02, 0.062);
    mk(G.blouse, pants, knee, 0, -0.37, 0.005);
    mk(G.boot, S.mats.boot, knee, 0, -0.478, 0.05);
    return { hip, knee };
  };
  const legR = mkLeg(1);
  const legL = mkLeg(-1);
  mk(G.thighRig, gear, legR.hip, 0.065, -0.24, 0.04).rotation.y = 0.15;

  root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });

  // Blob contact shadow (added after the traverse: must not cast/receive).
  const blob = new THREE.Mesh(S.blobGeo, S.blobMat);
  blob.position.y = 0.015;
  blob.renderOrder = 1;
  root.add(blob);

  return { root, torsoPivot, pelvisPivot, headPivot, aimGroup, armR, armL, legR, legL, rifle, muzzle, handR, handL, blob };
}

/* --------------------------------- enemy ---------------------------------- */

const STATE = { ADVANCE: 0, COMBAT: 1, RELOCATE: 2, DEAD: 3 };

class Enemy {
  constructor(mgr, pos, variant) {
    this.mgr = mgr;
    this.variant = variant;
    this.model = buildSoldier(variant);
    this.root = this.model.root;
    this.root.position.copy(pos);
    const scale = 0.97 + rng() * 0.08;
    this.root.scale.setScalar(scale);
    mgr.scene.add(this.root);

    this.name = rng.pick(NAMES) + '-' + rng.int(10, 99);
    this.health = 100;
    this.alive = true;
    this.state = STATE.ADVANCE;
    this.pos = this.root.position;
    this.vel = new THREE.Vector3();
    this.yaw = 0;
    this.targetYaw = 0;
    this.speed = 0;
    this.walkPhase = rng() * 10;
    this.breathePhase = rng() * Math.PI * 2;
    this.blade = 0;       // hip yaw offset (radians) off the aim line; 0 while moving
    this.twist = 0;       // torso yaw on top of the hips (shouldering / idle counter)
    this.aimBlend = 0;    // 0 low-ready, 1 weapon mounted at the shoulder on-axis
    this.aimErr = Math.PI; // WORLD-space angle between muzzle bore and target line
    this.aimYaw = 0;       // damped aim-group yaw, re-solved from the mount each frame
    this.aimPitch = 0;     // damped aim-group pitch, clamped +-35 deg
    this.hasLOS = false;  // published for the HUD spot diamond (real ray, ~10 Hz)
    this.losT = rng() * 0.1; // staggers the LOS ray budget across the squad
    this.spottedT = -10;  // last time LOS was true (HUD occlusion memory)
    this.torsoPitch = 0;
    // Kneelers drop to a firing kneel when "crouching" (rear knee down, lead
    // foot planted) and keep shooting; squatters duck low behind cover.
    // Variant-1 soldiers always kneel so photo staging can rely on it.
    this.kneeler = variant % 3 === 1 || rng.chance(0.35);
    this.path = null;
    this.pathIdx = 0;
    this.repathT = 0;
    this.burstLeft = 0;
    this.shotT = 0;
    this.aimT = 1 + rng() * 1.5;
    this.mountT = 0;      // >0 keeps the weapon mounted (raise/burst/hold window)
    this.duckT = 0;
    this.crouch = 0;      // 0 stand, 1 crouch/kneel
    this.crouchTarget = 0;
    this.flinchT = 0;
    this.deathT = 0;
    this.corpseVel = new THREE.Vector3();
    this.fallDir = new THREE.Vector3(1, 0, 0);
    this.relocateTarget = null;
    this.exposed = 1;
  }

  /* --------- damage --------- */
  damage(amount, point, dir, headshot) {
    if (!this.alive) return false;
    this.health -= amount;
    this.flinchT = 0.18;
    this.killCause = headshot ? 'HEADSHOT' : (this.mgr.playerWeaponLabel ? this.mgr.playerWeaponLabel() : 'M4A1');
    if (this.health <= 0) {
      this.die(dir, amount > 60);
      return true;
    }
    // Getting shot pulls them into combat
    if (this.state === STATE.ADVANCE && rng.chance(0.6)) this.enterCombat();
    return false;
  }

  die(dir, fling = false) {
    this.alive = false;
    this.state = STATE.DEAD;
    this.deathT = 0;
    const d = dir ? dir.clone().setY(0).normalize() : new THREE.Vector3(rng.spread(1), 0, rng.spread(1)).normalize();
    this.fallDir = d;
    this.corpseVel.copy(d).multiplyScalar(fling ? 5.5 + rng() * 3 : 1.1);
    if (fling) this.corpseVel.y = 4.5 + rng() * 2.5;
    // Relax limbs randomly
    const M = this.model;
    // Hands leave the weapon and hang at the wrists so relaxed arms read right.
    for (const [arm, hand] of [[M.armR, M.handR], [M.armL, M.handL]]) {
      arm.elbow.add(hand);
      hand.position.set(0, -0.3, 0);
      hand.rotation.set(0, 0, 0);
    }
    M.aimGroup.rotation.set(0, 0, 0);
    M.armR.shoulder.rotation.set(-0.4 + rng.spread(0.5), 0, -0.5 + rng.spread(0.4));
    M.armL.shoulder.rotation.set(-0.3 + rng.spread(0.5), 0, 0.5 + rng.spread(0.4));
    M.armR.elbow.rotation.x = -0.3 - rng() * 0.4;
    M.armL.elbow.rotation.x = -0.3 - rng() * 0.4;
    M.legR.hip.rotation.x = rng.spread(0.5);
    M.legL.hip.rotation.x = rng.spread(0.5);
    M.legR.knee.rotation.x = rng() * 0.6;
    M.legL.knee.rotation.x = rng() * 0.6;
    M.pelvisPivot.rotation.y = 0;
    // Rifle slips off the shoulder as the body drops
    M.rifle.rotation.z = rng.spread(0.8);
    M.rifle.rotation.x += 0.25 + rng() * 0.3;
    M.rifle.position.y -= 0.06;
    this.mgr.onEnemyKilled(this);
  }

  enterCombat() {
    this.state = STATE.COMBAT;
    this.aimT = 0.35 + rng() * 0.7;
    this.burstLeft = 0;
    this.crouchTarget = rng.chance(0.5) ? 1 : 0;
  }

  /* --------- think --------- */
  update(dt, playerPos, t) {
    const M = this.model;
    if (this.state === STATE.DEAD) {
      this.deathT += dt;
      // Contact blob shrinks away as the body drops (sun shadow takes over).
      if (M.blob.visible) {
        const k = 1 - this.deathT * 2.2;
        if (k <= 0.02) M.blob.visible = false;
        else M.blob.scale.setScalar(k);
      }
      // Ballistic corpse
      if (this.deathT < 2.2) {
        this.corpseVel.y -= 14 * dt;
        this.pos.addScaledVector(this.corpseVel, dt);
        if (this.pos.y <= 0) { this.pos.y = 0; this.corpseVel.set(0, 0, 0); }
        // Fall rotation: pivot to lying
        const k = clamp(this.deathT / 0.5, 0, 1);
        const ease = 1 - (1 - k) * (1 - k);
        _tAxis.set(-this.fallDir.z, 0, this.fallDir.x);
        this.root.quaternion.setFromAxisAngle(_tAxis, ease * Math.PI * 0.5 * 0.96);
        this.root.rotateY(this.yaw);
        this.root.position.y = Math.max(this.pos.y, 0) + ease * 0.12;
      }
      if (this.deathT > 22) {
        this.root.position.y -= dt * 0.25; // sink away
        if (this.deathT > 25) this.mgr.removeEnemy(this);
      }
      return;
    }

    _tTo.copy(playerPos).sub(this.pos);
    const distP = _tTo.length();
    _tDir.copy(_tTo).normalize();
    this.repathT -= dt;
    this.flinchT = Math.max(0, this.flinchT - dt);

    _tEye.set(this.pos.x, this.pos.y + 1.55 - this.crouch * 0.5, this.pos.z);
    _tPEye.set(playerPos.x, playerPos.y + 1.5, playerPos.z);
    // REAL occlusion ray only (same collider raycast the fire logic trusts),
    // rechecked every ~100 ms per enemy with staggered phases. Frozen photo
    // staging uses the same truth, so the HUD spot diamond can never paint
    // through a solid prop.
    this.losT -= dt;
    if (this.losT <= 0) {
      this.losT = 0.1;
      this.hasLOS = this.mgr.colliders.hasLOS(_tEye, _tPEye);
      if (this.hasLOS) this.spottedT = performance.now() * 0.001;
    }
    const hasLOS = this.hasLOS;

    // Body facing: COMBAT always slews the root onto the player's bearing
    // (last-known heading once LOS drops) BEFORE the aim solver reads the
    // yaw — nobody fires across their own back. Pathing states keep steering
    // through _followPath instead.
    if (this.state === STATE.COMBAT) this.targetYaw = Math.atan2(_tDir.x, _tDir.z);

    // Frozen (photo staging) suspends locomotion, path-following, the duck
    // cycle, state transitions and self-directed fire — facing and the aim
    // solve below still run every frame so staged shots square up on target.
    if (this.mgr.frozen) {
      this.speed = damp(this.speed, 0, 8, dt);
    } else switch (this.state) {
      case STATE.ADVANCE: {
        // Path toward a cover point near the player
        if (!this.path || this.repathT <= 0) {
          const cover = this.mgr.pickCover(this.pos, playerPos);
          const goal = cover ?? playerPos;
          this.path = this.mgr.nav.findPath(this.pos.x, this.pos.z, goal.x, goal.z) ?? [[goal.x, goal.z]];
          this.pathIdx = 0;
          this.repathT = 3 + rng() * 2;
        }
        this._followPath(dt, 4.4);
        if (hasLOS && distP < 34 && rng.chance(0.03)) this.enterCombat();
        if (this.path && this.pathIdx >= this.path.length) this.enterCombat();
        if (distP < 12 && hasLOS) this.enterCombat();
        break;
      }
      case STATE.COMBAT: {
        this.speed = damp(this.speed, 0, 8, dt);
        // Peek / duck cycle when in cover
        this.duckT -= dt;
        if (this.duckT <= 0) {
          this.crouchTarget = this.crouchTarget > 0.5 ? 0 : (rng.chance(0.55) ? 1 : 0);
          this.duckT = 0.9 + rng() * 1.6;
        }
        // Kneelers keep the weapon mounted and fire from the knee; squatters
        // only fire while standing (their crouch is a duck behind cover).
        const canFire = this.crouch < 0.4 || this.kneeler;
        if (hasLOS && canFire) {
          this.aimT -= dt;
          // Arm the mount just before the burst: the raise takes ~0.4 s, so
          // by the time aimT hits zero the bore has settled on the line and
          // the aimErr gate below opens. Between bursts the weapon drops
          // back to low-ready once the post-shot hold (mountT) expires.
          if (this.aimT <= 0.55) this.mountT = Math.max(this.mountT, 0.7);
          // Gate every shot on the WORLD-space bore check: the muzzle's
          // actual forward must be < 8 deg off the target line (see aimErr).
          if (this.burstLeft > 0) {
            this.shotT -= dt;
            if (this.shotT <= 0) {
              if (this.aimErr < 0.14) {
                this.shotT = 0.105 + rng() * 0.03;
                this.burstLeft--;
                this._fireAt(_tPEye, distP);
              } else {
                this.shotT = 0.05; // hold fire until the muzzle settles
              }
            }
          } else if (this.aimT <= 0 && this.aimErr < 0.14) {
            this.burstLeft = rng.int(3, 6);
            this.aimT = 0.7 + rng() * 1.3;
          }
        }
        // Occasionally relocate to better cover
        if (rng.chance(0.0025) || (!hasLOS && rng.chance(0.01))) {
          this.state = STATE.RELOCATE;
          const cover = this.mgr.pickCover(this.pos, playerPos, true);
          if (cover) {
            this.path = this.mgr.nav.findPath(this.pos.x, this.pos.z, cover.x, cover.z) ?? null;
            this.pathIdx = 0;
          }
          if (!this.path) this.state = STATE.COMBAT;
        }
        break;
      }
      case STATE.RELOCATE: {
        this.crouchTarget = 0;
        this._followPath(dt, 4.6);
        if (!this.path || this.pathIdx >= this.path.length) this.enterCombat();
        if (distP < 9 && hasLOS) this.enterCombat();
        break;
      }
    }

    // Separation from other enemies
    for (const other of this.mgr.enemies) {
      if (other === this || !other.alive) continue;
      const d = this.pos.distanceTo(other.pos);
      if (d < 1.2 && d > 1e-4) {
        _tPush.copy(this.pos).sub(other.pos).setY(0).normalize().multiplyScalar((1.2 - d) * 2 * dt);
        this.pos.add(_tPush);
      }
    }

    // Capsule collision + yaw smoothing
    this.mgr.colliders.resolveCapsule(this.pos, 0.38, 1.7, this.vel);
    this.pos.y = Math.max(0, this.pos.y);
    let dy = this.targetYaw - this.yaw;
    while (dy > Math.PI) dy -= Math.PI * 2;
    while (dy < -Math.PI) dy += Math.PI * 2;
    // COMBAT turns onto the bearing at a constant ~6 rad/s (a full about-face
    // in ~0.5 s, and the proportional walk damping can't overspeed it);
    // pathing keeps the softer proportional turn.
    if (this.state === STATE.COMBAT) this.yaw += clamp(dy, -6 * dt, 6 * dt);
    else this.yaw += dy * Math.min(1, dt * 8);
    // Bladed stance: `blade` is the hip yaw (radians) off the aim line.
    this.root.rotation.set(0, this.yaw + this.blade, 0);

    // Crouch blend
    this.crouch = damp(this.crouch, this.crouchTarget, 6, dt);

    /* --------- animate --------- */
    const moving = this.speed > 0.4;
    this.walkPhase += dt * (5.2 + this.speed * 1.6);
    const swing = moving ? Math.sin(this.walkPhase) : 0;
    const swing2 = moving ? Math.sin(this.walkPhase + Math.PI) : 0;
    const ampn = clamp(this.speed / 4.4, 0, 1);
    const amp = ampn * 0.62;
    // Standing = bladed: hips ~20 deg off the aim line in COMBAT (0.35 rad, a
    // touch more at ease), lead foot staggered. Squared up while moving or
    // crouching (blade fights the crouch/kneel pose).
    const bladeTarget = (moving || this.crouch > 0.35) ? 0 : (this.state === STATE.COMBAT ? 0.35 : 0.42);
    this.blade = damp(this.blade, bladeTarget, 5, dt);
    const blade = this.blade;
    const kneel = this.kneeler ? this.crouch : 0;
    const squat = this.kneeler ? 0 : this.crouch;

    // Legs. Kneel = firing kneel: rear (right) knee dropped to the deck with
    // the shin folded under, lead (left) thigh near horizontal with a planted
    // vertical shin. Squat = low duck behind cover. Both blend from the walk.
    if (kneel > 0.001) {
      M.legR.hip.rotation.x = lerp(swing * amp, 0.14, kneel);
      M.legR.knee.rotation.x = lerp(Math.max(0, -swing) * amp * 1.4, 1.5, kneel);
      M.legL.hip.rotation.x = lerp(swing2 * amp, -1.5, kneel);
      M.legL.knee.rotation.x = lerp(Math.max(0, -swing2) * amp * 1.4, 1.52, kneel);
    } else {
      M.legR.hip.rotation.x = swing * amp + squat * -0.7;
      M.legL.hip.rotation.x = swing2 * amp + squat * -0.85;
      M.legR.knee.rotation.x = Math.max(0, -swing) * amp * 1.4 + squat * 1.15;
      M.legL.knee.rotation.x = Math.max(0, -swing2) * amp * 1.4 + squat * 1.3 + blade * 0.14;
    }
    M.legR.hip.position.z = blade * -0.1;
    M.legL.hip.position.z = blade * 0.29;
    const drop = kneel * 0.45 + squat * 0.42;
    this.root.position.y = this.pos.y - drop + (moving ? Math.abs(Math.cos(this.walkPhase)) * 0.05 * amp : 0);

    // Walk cycle counter-rotation: pelvis swings +-6 deg with the stride and
    // the shoulders swing -6 deg against it (set on the torso below). The
    // kneel opens the hips toward the gun side; idle blade shifts the weight
    // onto the trailing hip with a small pelvis roll.
    M.pelvisPivot.rotation.y = swing * 0.105 * ampn + kneel * 0.22;
    M.pelvisPivot.rotation.z = blade * 0.05 * (1 - this.crouch);

    // Torso: 8-12 deg forward combat lean + aim pitch compensation + flinch
    // + breathing. Lean grows as the weapon mounts and while kneeling.
    const pitchTo = clamp(Math.atan2(_tPEye.y - _tEye.y, Math.max(1, distP)), -0.5, 0.4);
    const lean = 0.10 + this.aimBlend * 0.08 + this.crouch * 0.05;
    this.torsoPitch = damp(this.torsoPitch, lean - pitchTo * 0.6 + (this.flinchT > 0 ? 0.22 : 0), 10, dt);
    const breathe = Math.sin(t * 1.4 + this.breathePhase) * 0.018;
    M.torsoPivot.rotation.x = this.torsoPitch + breathe;
    // Aim/idle torso twist over the bladed hips: shouldering the rifle winds
    // the chest toward the target side; at ease it counters the hips instead.
    // The weapon only presents inside a +-60 deg cone of the body's forward —
    // outside it the root is still slewing, so hold low-ready rather than
    // cranking the arms across the chest.
    let coneErr = Math.atan2(_tDir.x, _tDir.z) - (this.yaw + this.blade);
    coneErr -= Math.round(coneErr / (Math.PI * 2)) * Math.PI * 2;
    const canAim = this.state === STATE.COMBAT && Math.abs(coneErr) < 1.05
      && (this.mgr.frozen || ((this.crouch < 0.4 || this.kneeler) && hasLOS));
    // MOUNT only while actually engaging: a pending/active burst (mountT
    // spans the raise, the burst and a short hold after the last shot) or a
    // kneeling firing position, which keeps the stock socketed. Every other
    // combat/patrol/frozen moment is spent at LOW-READY, so the silhouette
    // always shows either the diagonal chest line or a level mounted bore —
    // never a vertical carry. Scripted photo _fireAt calls snap the mount
    // (see _fireAt) so frozen soldiers can still present for staged shots.
    this.mountT = Math.max(0, this.mountT - dt);
    const engage = canAim
      && (this.burstLeft > 0 || this.mountT > 0 || (this.kneeler && this.crouch > 0.5));
    this.aimBlend = damp(this.aimBlend, engage ? 1 : 0, 6, dt);
    this.twist = damp(this.twist, (1 - this.aimBlend) * (-0.55 * blade) + this.aimBlend * 0.3, 6, dt);
    // Shoulders counter-rotate against the pelvis while walking (the torso
    // does the twisting when the weapon is mounted — the hands never leave
    // the gun, so there is no free arm-swing with a rifle in hand).
    const counter = -swing * 0.105 * ampn;
    M.torsoPivot.rotation.y = counter + this.twist + (this.flinchT > 0 ? rng.spread(0.12) : 0);
    M.torsoPivot.rotation.z = (moving ? Math.sin(this.walkPhase) * 0.045 * ampn : 0) - blade * 0.04;
    // Head: tracks the target (yaw fraction of the aim solve), counters the
    // blade/twist at ease, and drops into a cheek-weld tilt over the stock
    // as the rifle mounts.
    M.headPivot.rotation.x = -pitchTo * 0.4 - breathe * 0.6 - lean * 0.55 + this.aimPitch * 0.35 * this.aimBlend;
    M.headPivot.rotation.y = -counter * 0.5 - clamp(blade + this.twist, -0.6, 0.6) * 0.8 + this.aimYaw * 0.5 * this.aimBlend;
    M.headPivot.rotation.z = -0.14 * this.aimBlend;

    // Rifle local pose: blend LOW-READY <-> MOUNT (constant quats/vectors, no
    // solver state involved). At patrol the gun also pumps gently with the
    // stride since both hands stay on it.
    M.rifle.quaternion.slerpQuaternions(RIFLE_Q_LOW, RIFLE_Q_MOUNT, this.aimBlend);
    M.rifle.position.lerpVectors(RIFLE_P_LOW, RIFLE_P_MOUNT, this.aimBlend);
    if (moving) M.rifle.position.y += Math.cos(this.walkPhase * 2) * 0.016 * ampn * (1 - this.aimBlend);

    // Weapon figure-8 sway. In COMBAT a STATELESS aim solve is layered on
    // top: the mounted bore is exactly +Z in aim-group space, so the target
    // rotation is re-derived every frame in closed form (yaw about Y, then
    // pitch about local X — roll-free), never from the previous frame's
    // solve, so error cannot accumulate and capsize the weapon.
    _aE.set(
      Math.sin(t * 1.7 + this.breathePhase * 1.7) * 0.02 + (moving ? Math.cos(this.walkPhase * 2) * 0.03 * ampn * (1 - this.aimBlend) : 0),
      0,
      Math.sin(t * 0.9 + this.breathePhase) * 0.025 + (moving ? Math.sin(this.walkPhase) * 0.02 * ampn * (1 - this.aimBlend) : 0),
      'XYZ');
    _aQSway.setFromEuler(_aE);
    let engaged = false;
    if (engage) {
      // Player eyes into the aim pivot's local space (parent frame, so the
      // group's own rotation can't feed back into the solve).
      M.torsoPivot.updateWorldMatrix(true, false);
      _aV1.copy(_tPEye);
      M.torsoPivot.worldToLocal(_aV1).sub(M.aimGroup.position).normalize();
      // Targets needing more than +-35 deg of pitch can't be sold by the
      // arms — bail to low-ready instead of cranking against the clamp.
      const pitch = -Math.asin(clamp(_aV1.y, -1, 1));
      if (Math.abs(pitch) <= 0.61) {
        engaged = true;
        const yawA = Math.atan2(_aV1.x, _aV1.z);
        this.aimYaw = damp(this.aimYaw, clamp(yawA, -1.05, 1.05), 12, dt);
        this.aimPitch = damp(this.aimPitch, pitch, 12, dt);
      }
    }
    if (!engaged) {
      // No valid target (no LOS, outside the cone, or extreme pitch): both
      // solver angles damp back to the mount rest — nothing stale.
      this.aimYaw = damp(this.aimYaw, 0, 6, dt);
      this.aimPitch = damp(this.aimPitch, 0, 6, dt);
    }
    _aE.set(this.aimPitch, this.aimYaw, 0, 'YXZ');
    _aQ1.setFromEuler(_aE);
    M.aimGroup.quaternion.copy(_aQ1).multiply(_aQSway);

    if (engaged) {
      // Fire gate measured in WORLD space off the muzzle's matrixWorld (the
      // rendered bore line), not solver state. getWorldPosition refreshes
      // the matrix chain, so this sees the rotation set just above.
      M.muzzle.getWorldPosition(_aV1);
      _aV2.set(0, 0, -1).transformDirection(M.muzzle.matrixWorld);
      this.aimErr = _aV2.angleTo(_aV3.copy(_tPEye).sub(_aV1).normalize());
    } else {
      this.aimErr = Math.PI;
    }

    // Arm IK re-runs every frame AFTER the pose blend + aim rotation: hands
    // are welded to the rifle, wrist anchors ride with it, and the torso-
    // mounted shoulders protract toward the gun as it mounts so both elbows
    // keep a believable bend at any aim angle.
    const ab = this.aimBlend;
    M.armR.shoulder.position.set(0.26 - 0.02 * ab, 0.50, 0.02 + 0.03 * ab);
    M.armL.shoulder.position.set(-0.24 + 0.04 * ab, 0.49, 0.06 + 0.07 * ab);
    const aq = M.aimGroup.quaternion;
    _aV1.copy(IK_R).applyQuaternion(M.rifle.quaternion).add(M.rifle.position).applyQuaternion(aq).add(M.aimGroup.position);
    _aV2.copy(POLE_R).applyQuaternion(aq);
    solveArm(M.armR, _aV1, _aV2);
    _aV1.copy(IK_L).applyQuaternion(M.rifle.quaternion).add(M.rifle.position).applyQuaternion(aq).add(M.aimGroup.position);
    _aV2.copy(POLE_L).applyQuaternion(aq);
    solveArm(M.armL, _aV1, _aV2);
  }

  _followPath(dt, speed) {
    if (!this.path || this.pathIdx >= this.path.length) { this.speed = damp(this.speed, 0, 8, dt); return; }
    const [tx, tz] = this.path[this.pathIdx];
    const dx = tx - this.pos.x, dz = tz - this.pos.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.5) { this.pathIdx++; return; }
    this.speed = damp(this.speed, speed, 5, dt);
    this.targetYaw = Math.atan2(dx / d, dz / d);
    this.pos.x += (dx / d) * this.speed * dt;
    this.pos.z += (dz / d) * this.speed * dt;
  }

  _fireAt(playerEye, dist) {
    const M = this.model;
    // Keep the weapon mounted through the burst + a short hold after it.
    this.mountT = Math.max(this.mountT, 1.2);
    if (this.mgr.frozen && this.aimBlend < 0.999) {
      // Scripted photo-mode shot on a soldier still at low-ready: snap the
      // mount and solve the aim closed-form NOW so the muzzle flash and
      // tracer leave a properly shouldered, level rifle this same frame
      // (the next update re-derives the identical pose and re-IKs arms).
      this.aimBlend = 1;
      M.torsoPivot.updateWorldMatrix(true, false);
      _aV1.copy(playerEye);
      M.torsoPivot.worldToLocal(_aV1).sub(M.aimGroup.position).normalize();
      this.aimPitch = clamp(-Math.asin(clamp(_aV1.y, -1, 1)), -0.61, 0.61);
      this.aimYaw = clamp(Math.atan2(_aV1.x, _aV1.z), -1.05, 1.05);
      _aE.set(this.aimPitch, this.aimYaw, 0, 'YXZ');
      M.aimGroup.quaternion.setFromEuler(_aE);
      M.rifle.quaternion.copy(RIFLE_Q_MOUNT);
      M.rifle.position.copy(RIFLE_P_MOUNT);
    }
    this.lastShotTime = performance.now() * 0.001;
    const muzzlePos = new THREE.Vector3();
    M.muzzle.getWorldPosition(muzzlePos);
    // Aim error
    const err = 0.35 + dist * 0.028;
    const target = playerEye.clone().add(new THREE.Vector3(rng.spread(err), rng.spread(err * 0.7), rng.spread(err)));
    this.mgr.fx.muzzle(muzzlePos, target.clone().sub(muzzlePos).normalize());
    this.mgr.tracers.fire(muzzlePos, target, 300, 0xffb46a);
    this.mgr.audio.gunshot({ vol: 0.85, dist, caliber: 1.15 });
    // Chance to hit the player
    const movePenalty = this.mgr.getPlayerSpeed() * 0.10;
    const p = clamp(0.24 - dist * 0.004 - movePenalty, 0.05, 0.24);
    if (rng() < p) {
      this.mgr.onPlayerHit(rng.int(6, 13), this.pos);
    } else if (rng.chance(0.4)) {
      // near miss crack: impact somewhere behind player
      const missDir = target.clone().sub(muzzlePos).normalize();
      const hit = this.mgr.colliders.raycast(muzzlePos, missDir, 120);
      if (hit) {
        this.mgr.fx.impactWall(hit.point, hit.normal);
        this.mgr.decals.bulletHole(hit.point, hit.normal);
      }
    }
  }

  /** Ray-sphere hit test. Returns { t, point, headshot } or null. */
  raycast(origin, dir, maxDist) {
    if (!this.alive) return null;
    const spheres = [
      // Head sits at ~1.78 m (headPivot 0.66 + skull offset above the 1.02 torso pivot)
      { c: this.pos.clone().add(new THREE.Vector3(0, 1.73 - this.crouch * 0.45, 0)), r: 0.175, head: true },
      { c: this.pos.clone().add(new THREE.Vector3(0, 1.15 - this.crouch * 0.35, 0)), r: 0.31, head: false },
      { c: this.pos.clone().add(new THREE.Vector3(0, 0.55 - this.crouch * 0.15, 0)), r: 0.3, head: false },
    ];
    let best = null;
    for (const s of spheres) {
      const oc = origin.clone().sub(s.c);
      const b = oc.dot(dir);
      const c = oc.lengthSq() - s.r * s.r;
      const disc = b * b - c;
      if (disc < 0) continue;
      const t = -b - Math.sqrt(disc);
      if (t < 0.1 || t > maxDist) continue;
      if (!best || t < best.t) {
        best = { t, point: origin.clone().addScaledVector(dir, t), headshot: s.head };
      }
    }
    return best;
  }
}

/* -------------------------------- manager --------------------------------- */

export class EnemyManager {
  constructor({ scene, colliders, nav, fx, decals, tracers, audio, coverPoints, spawnPoints }) {
    this.scene = scene;
    this.colliders = colliders;
    this.nav = nav;
    this.fx = fx;
    this.decals = decals;
    this.tracers = tracers;
    this.audio = audio;
    this.coverPoints = coverPoints;
    this.spawnPoints = spawnPoints;
    this.enemies = [];
    this.wave = 0;
    this.pendingSpawns = 0;
    this.spawnT = 0;
    this.waveBreakT = 2.5;
    this.maxAlive = 6;
    this.onKill = null;        // (enemy, headshot?) => void
    this.onPlayerHit = null;   // set by game
    this.onWave = null;
    this.getPlayerSpeed = () => 0;
    this.playerPos = new THREE.Vector3();
    this.frozen = false;
  }

  get aliveCount() { return this.enemies.filter((e) => e.alive).length; }

  pickCover(fromPos, playerPos, exclude = false) {
    let best = null, bestScore = -Infinity;
    for (const c of this.coverPoints) {
      const dP = c.distanceTo(playerPos);
      if (dP < 7 || dP > 38) continue;
      const dMe = c.distanceTo(fromPos);
      if (exclude && dMe < 4) continue;
      let taken = false;
      for (const e of this.enemies) {
        if (e.alive && e.pos.distanceTo(c) < 2.2) { taken = true; break; }
      }
      if (taken) continue;
      const score = -dMe * 0.6 - Math.abs(dP - 17) + rng() * 4;
      if (score > bestScore) { bestScore = score; best = c; }
    }
    return best;
  }

  startWave(n) {
    this.wave = n;
    this.pendingSpawns = Math.min(4 + n * 2, 14);
    this.spawnT = 1.2;
    if (this.onWave) this.onWave(n, this.pendingSpawns);
  }

  spawnOne(posOverride = null, variant = null) {
    const spawn = posOverride ?? this._pickSpawn();
    const e = new Enemy(this, spawn.clone(), variant ?? rng.int(0, 2));
    e.targetYaw = e.yaw = Math.atan2(this.playerPos.x - spawn.x, this.playerPos.z - spawn.z);
    this.enemies.push(e);
    return e;
  }

  _pickSpawn() {
    // Prefer spawns 25m+ from player and out of sight
    const candidates = [...this.spawnPoints].sort(() => rng() - 0.5);
    for (const s of candidates) {
      if (s.distanceTo(this.playerPos) > 24) return s;
    }
    return candidates[0];
  }

  onEnemyKilled(enemy) {
    if (this.onKill) this.onKill(enemy);
  }

  removeEnemy(enemy) {
    this.scene.remove(enemy.root);
    const i = this.enemies.indexOf(enemy);
    if (i >= 0) this.enemies.splice(i, 1);
  }

  damageInRadius(pos, radius, maxDmg, fling = true, cause = 'FRAG') {
    let kills = 0;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const d = e.pos.distanceTo(pos);
      if (d < radius) {
        const dmg = maxDmg * (1 - (d / radius) * 0.7);
        const dir = e.pos.clone().sub(pos).normalize();
        const wasAlive = e.alive;
        e.health -= dmg;
        e.killCause = cause;
        if (e.health <= 0 && wasAlive) {
          e.die(dir, fling);
          kills++;
        } else {
          e.flinchT = 0.35;
        }
      }
    }
    return kills;
  }

  raycast(origin, dir, maxDist) {
    let best = null;
    for (const e of this.enemies) {
      const hit = e.raycast(origin, dir, maxDist);
      if (hit && (!best || hit.t < best.t)) {
        best = { ...hit, enemy: e };
      }
    }
    return best;
  }

  update(dt, playerPos, t) {
    this.playerPos.copy(playerPos);
    if (!this.frozen) {
      // Wave orchestration
      if (this.pendingSpawns > 0) {
        this.spawnT -= dt;
        if (this.spawnT <= 0 && this.aliveCount < this.maxAlive) {
          this.spawnT = 0.7 + rng() * 0.9;
          this.pendingSpawns--;
          this.spawnOne();
        }
      } else if (this.aliveCount === 0 && this.wave > 0) {
        this.waveBreakT -= dt;
        if (this.waveBreakT <= 0) {
          this.waveBreakT = 6;
          this.startWave(this.wave + 1);
        }
      }
    }
    for (const e of this.enemies) e.update(dt, playerPos, t);
  }
}
