// ============================================================================
// Weapon models (Fable 4 — weapons). Original fictional designs only:
//   Aster Dynamics AD-9 pistol, Vesper K10 SMG, Borealis Defense BDR-15
//   carbine, Havelock S8 pump shotgun, Meridian LR-7 precision rifle,
//   K2 field knife, MK2 Dazzler flash device, Cirrus smoke device.
//
// buildWeaponModel(id, { firstPerson }) returns a THREE.Group whose origin is
// the firing-hand grip point with the barrel pointing -Z (1 unit = 1 m).
// group.userData contract:
//   muzzle: THREE.Vector3        local muzzle tip
//   magazine: Object3D|null      detachable magazine node (reload anim)
//   boltOrSlide: Object3D|null   slide / charging handle / pump / bolt node
//   shellPort: THREE.Vector3     local ejection (or loading) port
// plus viewmodel helper data (additive, consumed by player/viewmodel.js):
//   aimRef: THREE.Vector3        point that sits on the camera axis at ADS
//   grips: { right:{pos,rot}, left:{pos,rot,parent:'root'|'slide'}|null }
//   slideTravel, boltLift, magDir, boltHandle (see builders)
// ============================================================================
import * as THREE from 'three';
import { bevelBoxGeo, boxGeo } from './geo.js';
import { getMaterial } from './materials.js';
import { registerAsset } from './registry.js';

// ---------------------------------------------------------------- materials
// Shared surface families come from the art library (Fable 3 procedural PBR
// pass) via getMaterial. Weapon-only keys (blued steel, ice accents, sight
// dots, device bands...) are built locally and NEVER routed through the
// library, so its unknown-key fallback can't leak onto weapons. A local def
// may name a library `base` material to clone (keeps its micro-detail maps)
// before tinting.
const SHARED_KEYS = new Set([
  'metal_dark', 'metal_brushed', 'plastic_black', 'plastic_gray', 'rubber',
  'fabric_gray', 'leather_black', 'brass',
]);
// old graybox + current unknown-key fallback albedos (emergency guard only)
const LIB_FALLBACK_HEXES = new Set([0xbfc3c7, 0xb8b0a6]);

const LOCAL_MAT_DEFS = {
  // bespoke weapon finishes
  metal_blued:   { base: 'metal_dark', color: 0x1b1e24, roughness: 0.42, metalness: 0.55 },
  metal_edge:    { base: 'stainless', color: 0xdfe5ea, roughness: 0.28, metalness: 0.95 },
  accent_ice:    { color: 0x8fd8ff, roughness: 0.35, metalness: 0.2, emissive: 0x8fd8ff, emissiveIntensity: 0.55 },
  sight_dot:     { color: 0xb8f4ff, roughness: 0.3, metalness: 0.0, emissive: 0xb8f4ff, emissiveIntensity: 1.4 },
  band_yellow:   { color: 0xe0b02e, roughness: 0.55, metalness: 0.05 },
  band_blue:     { color: 0x4d84d8, roughness: 0.55, metalness: 0.05 },
  shell_red:     { color: 0xc23a30, roughness: 0.5, metalness: 0.05 },
  glass_lens:    { color: 0x0c1a22, roughness: 0.06, metalness: 0.9 },
  sleeve_arctic: { base: 'fabric_gray', color: 0x66788e, roughness: 0.96, metalness: 0.0 },
  // stand-ins for shared keys, used only if the library answers with its
  // unknown-key fallback (e.g. the art pass gets reverted mid-development)
  metal_dark:    { color: 0x2b2e33, roughness: 0.5, metalness: 0.7 },
  metal_brushed: { color: 0x6d747c, roughness: 0.38, metalness: 0.85 },
  plastic_black: { color: 0x191b1e, roughness: 0.6, metalness: 0.05 },
  plastic_gray:  { color: 0x33383f, roughness: 0.72, metalness: 0.04 },
  rubber:        { color: 0x1c1d1f, roughness: 0.95, metalness: 0.0 },
  fabric_gray:   { color: 0x64758a, roughness: 0.97, metalness: 0.0 },
  leather_black: { color: 0x141519, roughness: 0.88, metalness: 0.02 },
  brass:         { color: 0xb98f3e, roughness: 0.3, metalness: 0.9 },
};

const _localMats = new Map();

function localMat(key) {
  if (!_localMats.has(key)) {
    const d = LOCAL_MAT_DEFS[key] || LOCAL_MAT_DEFS.plastic_gray;
    let m = null;
    if (d.base) {
      const base = getMaterial(d.base);
      if (base?.isMeshStandardMaterial && (base.map || base.normalMap) &&
          !LIB_FALLBACK_HEXES.has(base.color?.getHex())) {
        m = base.clone();
      }
    }
    if (!m) m = new THREE.MeshStandardMaterial();
    if (d.color != null) m.color.set(d.color);
    if (d.roughness != null) m.roughness = d.roughness;
    if (d.metalness != null) m.metalness = d.metalness;
    if (d.emissive != null) {
      m.emissive.set(d.emissive);
      m.emissiveIntensity = d.emissiveIntensity ?? 1;
    }
    _localMats.set(key, m);
  }
  return _localMats.get(key);
}

function mat(key) {
  if (SHARED_KEYS.has(key)) {
    const lib = getMaterial(key);
    const isFallback = !!lib && lib.isMeshStandardMaterial && !lib.map &&
      lib.color && LIB_FALLBACK_HEXES.has(lib.color.getHex());
    if (lib && !isFallback) return lib;
  }
  return localMat(key);
}

// ---------------------------------------------------------------- geo utils
function mesh(parent, matKey, geo, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(geo, mat(matKey));
  m.position.set(x, y, z);
  if (rx || ry || rz) m.rotation.set(rx, ry, rz);
  parent.add(m);
  return m;
}

// bevelled box part (machined edge look for close-view assets)
function bx(parent, matKey, sx, sy, sz, x, y, z, o = {}) {
  const bev = o.bevel ?? Math.min(0.004, sx / 4, sy / 4, sz / 4);
  const geo = bev > 0.0005 ? bevelBoxGeo(sx, sy, sz, bev, 1) : boxGeo(sx, sy, sz, 1);
  return mesh(parent, matKey, geo, x, y, z, o.rx || 0, o.ry || 0, o.rz || 0);
}

// cylinder along Z (barrels, tubes, suppressors)
function cz(parent, matKey, rT, rB, len, x, y, z, seg = 14) {
  const g = new THREE.CylinderGeometry(rT, rB, len, seg);
  g.rotateX(Math.PI / 2);
  return mesh(parent, matKey, g, x, y, z);
}

// cylinder along Y (grenade cans, scope turrets)
function cy(parent, matKey, rT, rB, h, x, y, z, seg = 14) {
  return mesh(parent, matKey, new THREE.CylinderGeometry(rT, rB, h, seg), x, y, z);
}

function ringZ(parent, matKey, r, tube, x, y, z) {
  return mesh(parent, matKey, new THREE.TorusGeometry(r, tube, 6, 18), x, y, z);
}

function v3(x, y, z) { return new THREE.Vector3(x, y, z); }
function grip(pos, rot) { return { pos, rot }; }

// picatinny-style rail ridges (matte so top light doesn't blow them out)
function railRidges(parent, w, z0, z1, y, n = 6) {
  const step = (z1 - z0) / n;
  for (let i = 0; i < n; i++) {
    bx(parent, 'plastic_black', w * 0.88, 0.0045, Math.abs(step) * 0.5, 0, y, z0 + step * (i + 0.5), { bevel: 0.001 });
  }
}

// =========================================================== weapon builders

// --- Aster Dynamics AD-9 sidearm (compact striker pistol, short slide) -----
function buildAD9() {
  const g = new THREE.Group();

  // frame / dust cover
  bx(g, 'plastic_black', 0.030, 0.024, 0.115, 0, 0.051, -0.052, { bevel: 0.005 });
  bx(g, 'plastic_black', 0.031, 0.017, 0.05, 0, 0.052, 0.03, { bevel: 0.004 });   // frame rear
  bx(g, 'plastic_black', 0.028, 0.013, 0.032, 0, 0.055, 0.052, { bevel: 0.004 }); // beavertail

  // slide (animates: blowback + lock-back)
  const slide = new THREE.Group();
  slide.position.set(0, 0.079, -0.036);
  g.add(slide);
  bx(slide, 'metal_dark', 0.034, 0.031, 0.19, 0, 0, 0, { bevel: 0.007 });
  bx(slide, 'metal_blued', 0.0355, 0.02, 0.034, 0, -0.001, 0.072, { bevel: 0.003 }); // rear serration block
  bx(slide, 'metal_blued', 0.0355, 0.02, 0.02, 0, -0.001, -0.062, { bevel: 0.003 }); // front serrations
  bx(slide, 'metal_blued', 0.005, 0.013, 0.036, 0.0165, 0.004, -0.014, { bevel: 0.001 }); // ejection port inset
  // brand accent line
  bx(slide, 'accent_ice', 0.0357, 0.0022, 0.05, 0, -0.0085, -0.045, { bevel: 0.0008 });
  // sights (ride the slide): aim line y = slide.y + 0.021
  bx(slide, 'metal_dark', 0.02, 0.009, 0.009, 0, 0.019, 0.082, { bevel: 0.002 });   // rear sight base
  bx(slide, 'metal_dark', 0.006, 0.009, 0.009, -0.008, 0.021, 0.082, { bevel: 0.001 }); // rear left ear
  bx(slide, 'metal_dark', 0.006, 0.009, 0.009, 0.008, 0.021, 0.082, { bevel: 0.001 });  // rear right ear
  mesh(slide, 'sight_dot', new THREE.BoxGeometry(0.0022, 0.0022, 0.0022), -0.008, 0.0225, 0.087);
  mesh(slide, 'sight_dot', new THREE.BoxGeometry(0.0022, 0.0022, 0.0022), 0.008, 0.0225, 0.087);
  bx(slide, 'metal_dark', 0.0055, 0.011, 0.008, 0, 0.02, -0.088, { bevel: 0.001 });  // front post
  mesh(slide, 'sight_dot', new THREE.BoxGeometry(0.003, 0.003, 0.0022), 0, 0.0235, -0.086);

  // barrel visible in the port / at muzzle
  cz(g, 'metal_brushed', 0.0082, 0.0082, 0.03, 0, 0.079, -0.125, 12);

  // grip (raked back ~13 deg). Magazine node lives in grip space so its
  // travel is along the grip axis.
  const gripG = new THREE.Group();
  gripG.position.set(0, -0.002, 0.01);
  gripG.rotation.x = -0.23;
  g.add(gripG);
  bx(gripG, 'plastic_black', 0.031, 0.118, 0.052, 0, -0.052, 0.006, { bevel: 0.006 });
  bx(gripG, 'rubber', 0.033, 0.062, 0.044, 0, -0.058, 0.008, { bevel: 0.004 }); // stipple panel
  const magazine = new THREE.Group();
  magazine.position.set(0, -0.055, 0.004);
  gripG.add(magazine);
  bx(magazine, 'metal_brushed', 0.024, 0.112, 0.036, 0, -0.004, 0, { bevel: 0.002 });
  bx(magazine, 'plastic_black', 0.030, 0.013, 0.05, 0, -0.062, 0.004, { bevel: 0.003 }); // baseplate

  // trigger guard + trigger
  bx(g, 'plastic_black', 0.007, 0.03, 0.008, 0, 0.023, -0.062, { bevel: 0.002 });
  bx(g, 'plastic_black', 0.007, 0.007, 0.055, 0, 0.007, -0.036, { bevel: 0.002 });
  bx(g, 'metal_dark', 0.006, 0.021, 0.005, 0, 0.024, -0.028, { bevel: 0.001, rx: 0.18 });

  g.userData = {
    muzzle: v3(0, 0.079, -0.143),
    magazine, boltOrSlide: slide,
    shellPort: v3(0.018, 0.092, -0.05),
    aimRef: v3(0, 0.1, -0.03),
    slideTravel: 0.034,
    magDir: v3(0, -1, 0), // in magazine parent (grip) space
    grips: {
      right: grip(v3(0, -0.05, 0.02), v3(-0.23, 0, 0)),
      left: { ...grip(v3(-0.027, -0.055, 0.002), v3(-0.23, 0.35, 0.42)), parent: 'root' },
    },
  };
  return g;
}

// --- Vesper K10 SMG (side-folded stock + long stick mag) -------------------
function buildVesper() {
  const g = new THREE.Group();

  // receiver + top rail
  bx(g, 'metal_dark', 0.046, 0.062, 0.30, 0, 0.052, -0.10, { bevel: 0.007 });
  bx(g, 'plastic_black', 0.03, 0.011, 0.29, 0, 0.089, -0.10, { bevel: 0.003 });
  railRidges(g, 0.032, -0.22, 0.02, 0.0965, 7);
  // accent line spanning both sides
  bx(g, 'accent_ice', 0.0465, 0.0026, 0.15, 0, 0.071, -0.13, { bevel: 0.0008 });

  // barrel shroud + barrel + brake
  cz(g, 'metal_dark', 0.016, 0.017, 0.09, 0, 0.052, -0.29, 14);
  cz(g, 'metal_brushed', 0.0085, 0.0085, 0.09, 0, 0.052, -0.365, 12);
  bx(g, 'metal_dark', 0.024, 0.024, 0.036, 0, 0.052, -0.418, { bevel: 0.005 });
  bx(g, 'metal_blued', 0.026, 0.008, 0.012, 0, 0.052, -0.414, { bevel: 0.002 });

  // ejection port (right)
  bx(g, 'metal_blued', 0.004, 0.02, 0.05, 0.0225, 0.058, -0.06, { bevel: 0.001 });

  // charging handle (right side) — the animated node
  const handle = new THREE.Group();
  handle.position.set(0.028, 0.07, -0.15);
  g.add(handle);
  bx(handle, 'plastic_black', 0.012, 0.012, 0.026, 0.004, 0, 0, { bevel: 0.003 });
  bx(handle, 'metal_blued', 0.006, 0.006, 0.05, -0.004, 0, 0.01, { bevel: 0.001 });

  // magwell + long stick magazine
  bx(g, 'metal_dark', 0.036, 0.05, 0.06, 0, 0.006, -0.175, { bevel: 0.005 });
  const magazine = new THREE.Group();
  magazine.position.set(0, -0.012, -0.175);
  magazine.rotation.x = 0.05;
  g.add(magazine);
  bx(magazine, 'metal_brushed', 0.026, 0.20, 0.044, 0, -0.09, 0, { bevel: 0.003 });
  bx(magazine, 'plastic_black', 0.030, 0.012, 0.05, 0, -0.192, 0, { bevel: 0.003 });
  bx(magazine, 'accent_ice', 0.0265, 0.003, 0.045, 0, -0.03, 0, { bevel: 0.0008 }); // witness line

  // pistol grip + trigger
  const gripG = new THREE.Group();
  gripG.position.set(0, -0.002, 0.012);
  gripG.rotation.x = -0.2;
  g.add(gripG);
  bx(gripG, 'plastic_black', 0.030, 0.102, 0.048, 0, -0.048, 0.004, { bevel: 0.006 });
  bx(gripG, 'rubber', 0.032, 0.05, 0.042, 0, -0.054, 0.006, { bevel: 0.004 });
  bx(g, 'plastic_black', 0.007, 0.028, 0.008, 0, 0.006, -0.062, { bevel: 0.002 });
  bx(g, 'plastic_black', 0.007, 0.007, 0.05, 0, -0.008, -0.038, { bevel: 0.002 });
  bx(g, 'metal_dark', 0.006, 0.02, 0.005, 0, 0.008, -0.028, { bevel: 0.001, rx: 0.18 });

  // stubby foregrip (left hand)
  bx(g, 'plastic_black', 0.026, 0.056, 0.034, 0, -0.006, -0.24, { bevel: 0.005, rx: -0.1 });
  bx(g, 'rubber', 0.028, 0.026, 0.03, 0, -0.014, -0.242, { bevel: 0.003, rx: -0.1 });

  // side-folded stock (left side of receiver)
  bx(g, 'metal_dark', 0.012, 0.03, 0.04, -0.032, 0.052, 0.035, { bevel: 0.003 });   // hinge
  bx(g, 'metal_brushed', 0.009, 0.013, 0.23, -0.0345, 0.058, -0.075, { bevel: 0.002 }); // strut
  bx(g, 'plastic_black', 0.012, 0.052, 0.05, -0.0355, 0.045, -0.175, { bevel: 0.004 }); // butt pad folded fwd

  // sights: rear notch + front post, aim line y = 0.108
  bx(g, 'metal_dark', 0.02, 0.009, 0.01, 0, 0.0995, 0.02, { bevel: 0.002 });
  bx(g, 'metal_dark', 0.006, 0.009, 0.01, -0.0075, 0.106, 0.02, { bevel: 0.001 });
  bx(g, 'metal_dark', 0.006, 0.009, 0.01, 0.0075, 0.106, 0.02, { bevel: 0.001 });
  bx(g, 'metal_dark', 0.016, 0.011, 0.012, 0, 0.1, -0.235, { bevel: 0.002 });
  bx(g, 'metal_dark', 0.0042, 0.014, 0.0042, 0, 0.108, -0.235, { bevel: 0.001 });
  mesh(g, 'sight_dot', new THREE.BoxGeometry(0.003, 0.003, 0.002), 0, 0.111, -0.232);

  g.userData = {
    muzzle: v3(0, 0.052, -0.437),
    magazine, boltOrSlide: handle,
    shellPort: v3(0.028, 0.062, -0.06),
    aimRef: v3(0, 0.108, -0.1),
    slideTravel: 0.06,
    magDir: v3(0, -1, 0),
    grips: {
      right: grip(v3(0, -0.048, 0.022), v3(-0.2, 0, 0)),
      left: { ...grip(v3(0, -0.034, -0.24), v3(-0.1, 0, 0)), parent: 'root' },
    },
  };
  return g;
}

// --- Borealis Defense BDR-15 carbine (rail + vertical grip + irons) --------
function buildBDR15() {
  const g = new THREE.Group();

  // upper + lower receiver, magwell
  bx(g, 'metal_dark', 0.044, 0.05, 0.24, 0, 0.068, -0.06, { bevel: 0.007 });
  bx(g, 'plastic_black', 0.04, 0.042, 0.17, 0, 0.026, -0.025, { bevel: 0.006 });
  bx(g, 'plastic_black', 0.038, 0.052, 0.068, 0, 0.014, -0.085, { bevel: 0.005 });

  // top rail (receiver + handguard) with ridges
  bx(g, 'plastic_black', 0.03, 0.009, 0.23, 0, 0.098, -0.06, { bevel: 0.002 });
  railRidges(g, 0.032, -0.16, 0.04, 0.104, 7);
  bx(g, 'plastic_black', 0.03, 0.008, 0.25, 0, 0.098, -0.315, { bevel: 0.002 });
  railRidges(g, 0.032, -0.42, -0.20, 0.1035, 8);

  // handguard with vent groove + accent line
  bx(g, 'plastic_black', 0.042, 0.048, 0.26, 0, 0.066, -0.305, { bevel: 0.007 });
  bx(g, 'rubber', 0.0435, 0.011, 0.2, 0, 0.072, -0.30, { bevel: 0.002 });
  bx(g, 'accent_ice', 0.0428, 0.0026, 0.19, 0, 0.052, -0.30, { bevel: 0.0008 });

  // barrel + muzzle device
  cz(g, 'metal_blued', 0.0092, 0.0092, 0.17, 0, 0.068, -0.515, 12);
  cz(g, 'metal_dark', 0.0135, 0.0135, 0.048, 0, 0.068, -0.606, 12);
  bx(g, 'metal_blued', 0.0295, 0.008, 0.028, 0, 0.068, -0.606, { bevel: 0.002 });

  // vertical foregrip
  bx(g, 'plastic_black', 0.028, 0.078, 0.036, 0, -0.006, -0.35, { bevel: 0.005, rx: -0.12 });
  bx(g, 'rubber', 0.030, 0.036, 0.032, 0, -0.016, -0.352, { bevel: 0.003, rx: -0.12 });

  // stock: buffer tube + shoe + cheek + rubber pad
  cz(g, 'metal_dark', 0.0145, 0.0145, 0.14, 0, 0.062, 0.11, 12);
  bx(g, 'plastic_black', 0.034, 0.06, 0.1, 0, 0.048, 0.185, { bevel: 0.006 });
  bx(g, 'plastic_black', 0.03, 0.02, 0.07, 0, 0.085, 0.175, { bevel: 0.004 });
  bx(g, 'rubber', 0.036, 0.088, 0.016, 0, 0.04, 0.238, { bevel: 0.004 });

  // pistol grip + trigger guard/trigger
  const gripG = new THREE.Group();
  gripG.position.set(0, -0.004, 0.014);
  gripG.rotation.x = -0.24;
  g.add(gripG);
  bx(gripG, 'plastic_black', 0.029, 0.098, 0.046, 0, -0.046, 0.004, { bevel: 0.006 });
  bx(gripG, 'rubber', 0.031, 0.048, 0.04, 0, -0.052, 0.006, { bevel: 0.004 });
  bx(g, 'plastic_black', 0.007, 0.028, 0.008, 0, 0.002, -0.062, { bevel: 0.002 });
  bx(g, 'plastic_black', 0.007, 0.007, 0.05, 0, -0.012, -0.038, { bevel: 0.002 });
  bx(g, 'metal_dark', 0.006, 0.02, 0.005, 0, 0.004, -0.028, { bevel: 0.001, rx: 0.18 });

  // ejection port (right)
  bx(g, 'metal_blued', 0.004, 0.022, 0.056, 0.0215, 0.062, -0.055, { bevel: 0.001 });

  // charging T-handle (animated)
  const handle = new THREE.Group();
  handle.position.set(0, 0.086, 0.05);
  g.add(handle);
  bx(handle, 'plastic_black', 0.034, 0.008, 0.022, 0, 0, 0.004, { bevel: 0.002 });
  bx(handle, 'plastic_black', 0.012, 0.007, 0.03, 0, 0.0005, -0.018, { bevel: 0.002 });

  // 30-rd curved magazine (two canted segments)
  const magazine = new THREE.Group();
  magazine.position.set(0, -0.014, -0.085);
  magazine.rotation.x = 0.1;
  g.add(magazine);
  bx(magazine, 'plastic_gray', 0.030, 0.11, 0.056, 0, -0.05, 0, { bevel: 0.004 });
  bx(magazine, 'plastic_gray', 0.030, 0.062, 0.056, 0, -0.128, -0.014, { bevel: 0.004, rx: 0.26 });
  bx(magazine, 'plastic_black', 0.033, 0.012, 0.06, 0, -0.158, -0.022, { bevel: 0.003, rx: 0.26 });

  // iron sights: rear aperture + front post, aim line y = 0.122
  bx(g, 'metal_dark', 0.018, 0.012, 0.014, 0, 0.109, 0.028, { bevel: 0.002 });
  ringZ(g, 'metal_dark', 0.0085, 0.0021, 0, 0.122, 0.028);
  bx(g, 'metal_dark', 0.018, 0.012, 0.016, 0, 0.111, -0.40, { bevel: 0.002 });
  bx(g, 'metal_dark', 0.005, 0.018, 0.011, -0.0085, 0.124, -0.40, { bevel: 0.001 });
  bx(g, 'metal_dark', 0.005, 0.018, 0.011, 0.0085, 0.124, -0.40, { bevel: 0.001 });
  bx(g, 'metal_dark', 0.0038, 0.016, 0.0038, 0, 0.117, -0.40, { bevel: 0.001 });
  mesh(g, 'sight_dot', new THREE.BoxGeometry(0.0028, 0.0028, 0.002), 0, 0.1215, -0.398);

  g.userData = {
    muzzle: v3(0, 0.068, -0.632),
    magazine, boltOrSlide: handle,
    shellPort: v3(0.028, 0.065, -0.055),
    aimRef: v3(0, 0.122, -0.1),
    slideTravel: 0.05,
    magDir: v3(0, -1, 0),
    grips: {
      right: grip(v3(0, -0.046, 0.024), v3(-0.24, 0, 0)),
      left: { ...grip(v3(0, -0.036, -0.35), v3(-0.12, 0, 0)), parent: 'root' },
    },
  };
  return g;
}

// --- Havelock S8 pump shotgun (tube mag, full stock) -----------------------
function buildHavelock() {
  const g = new THREE.Group();

  // receiver
  bx(g, 'metal_dark', 0.048, 0.062, 0.20, 0, 0.052, -0.10, { bevel: 0.008 });
  bx(g, 'accent_ice', 0.0485, 0.0028, 0.09, 0, 0.038, -0.11, { bevel: 0.0008 });
  // ejection port (right) + bottom loading port
  bx(g, 'metal_blued', 0.004, 0.024, 0.06, 0.0235, 0.055, -0.08, { bevel: 0.001 });
  bx(g, 'metal_blued', 0.026, 0.005, 0.055, 0, 0.019, -0.08, { bevel: 0.001 });

  // barrel + ice bead sight
  cz(g, 'metal_blued', 0.0105, 0.0105, 0.47, 0, 0.075, -0.435, 14);
  cz(g, 'metal_dark', 0.013, 0.013, 0.03, 0, 0.075, -0.655, 12);
  bx(g, 'metal_dark', 0.008, 0.01, 0.012, 0, 0.09, -0.652, { bevel: 0.002 });
  mesh(g, 'sight_dot', new THREE.SphereGeometry(0.0034, 8, 6), 0, 0.098, -0.652);

  // magazine tube + end cap with brand ring
  cz(g, 'metal_blued', 0.0125, 0.0125, 0.40, 0, 0.035, -0.40, 12);
  cz(g, 'metal_brushed', 0.0135, 0.0135, 0.022, 0, 0.035, -0.60, 12);
  cz(g, 'accent_ice', 0.0128, 0.0128, 0.007, 0, 0.035, -0.585, 12);

  // action bars
  bx(g, 'metal_brushed', 0.005, 0.009, 0.22, -0.027, 0.038, -0.24, { bevel: 0.001 });
  bx(g, 'metal_brushed', 0.005, 0.009, 0.22, 0.027, 0.038, -0.24, { bevel: 0.001 });

  // pump (animated node; left hand parents here)
  const pump = new THREE.Group();
  pump.position.set(0, 0.035, -0.36);
  g.add(pump);
  bx(pump, 'plastic_black', 0.05, 0.046, 0.13, 0, -0.004, 0, { bevel: 0.008 });
  for (let i = -2; i <= 2; i++) {
    bx(pump, 'rubber', 0.052, 0.032, 0.008, 0, -0.006, i * 0.024, { bevel: 0.002 });
  }

  // stock: neck -> butt with rubber pad (grip point = neck, at origin)
  bx(g, 'plastic_black', 0.034, 0.046, 0.11, 0, 0.012, 0.045, { bevel: 0.006, rx: 0.1 });
  bx(g, 'plastic_black', 0.038, 0.094, 0.19, 0, -0.002, 0.175, { bevel: 0.008, rx: 0.06 });
  bx(g, 'rubber', 0.04, 0.1, 0.018, 0, -0.008, 0.272, { bevel: 0.004, rx: 0.06 });
  bx(g, 'plastic_black', 0.04, 0.02, 0.07, 0, 0.042, 0.19, { bevel: 0.004 }); // comb

  // trigger guard + trigger
  bx(g, 'plastic_black', 0.007, 0.026, 0.008, 0, 0.004, -0.045, { bevel: 0.002 });
  bx(g, 'plastic_black', 0.007, 0.007, 0.05, 0, -0.008, -0.02, { bevel: 0.002 });
  bx(g, 'metal_dark', 0.006, 0.02, 0.005, 0, 0.006, -0.008, { bevel: 0.001, rx: 0.18 });

  g.userData = {
    muzzle: v3(0, 0.075, -0.672),
    magazine: null, boltOrSlide: pump,
    shellPort: v3(0.004, 0.012, -0.08), // bottom loading port
    aimRef: v3(0, 0.096, -0.2),
    slideTravel: 0.105,
    grips: {
      right: grip(v3(0, -0.008, 0.045), v3(-0.12, 0, 0)),
      left: { ...grip(v3(0, -0.012, 0), v3(Math.PI / 2, 0, 0)), parent: 'slide' },
    },
  };
  return g;
}

// --- Meridian LR-7 precision rifle (long, scoped, bolt action) -------------
function buildMeridian() {
  const g = new THREE.Group();

  // chassis fore-end + round receiver + rail
  bx(g, 'plastic_black', 0.040, 0.054, 0.42, 0, 0.042, -0.19, { bevel: 0.008 });
  bx(g, 'rubber', 0.041, 0.012, 0.3, 0, 0.03, -0.22, { bevel: 0.002 });
  bx(g, 'accent_ice', 0.0408, 0.0026, 0.22, 0, 0.052, -0.24, { bevel: 0.0008 });
  cz(g, 'metal_dark', 0.021, 0.021, 0.22, 0, 0.085, -0.04, 16);
  bx(g, 'metal_dark', 0.028, 0.009, 0.18, 0, 0.112, -0.05, { bevel: 0.002 });
  railRidges(g, 0.03, -0.13, 0.03, 0.118, 6);

  // heavy barrel + brake
  cz(g, 'metal_blued', 0.0125, 0.014, 0.46, 0, 0.085, -0.55, 14);
  bx(g, 'metal_dark', 0.030, 0.030, 0.065, 0, 0.085, -0.80, { bevel: 0.006 });
  bx(g, 'metal_blued', 0.036, 0.009, 0.04, 0, 0.085, -0.80, { bevel: 0.002 });

  // scope: rings, tube, objective bell, ocular, turrets, lenses
  const scope = new THREE.Group();
  scope.position.set(0, 0.15, -0.03);
  g.add(scope);
  bx(scope, 'metal_dark', 0.008, 0.05, 0.02, 0, -0.026, -0.055, { bevel: 0.002 });
  bx(scope, 'metal_dark', 0.008, 0.05, 0.02, 0, -0.026, 0.055, { bevel: 0.002 });
  cz(scope, 'metal_dark', 0.0185, 0.0185, 0.2, 0, 0, 0, 16);
  cz(scope, 'metal_dark', 0.029, 0.021, 0.075, 0, 0, -0.135, 16);
  cz(scope, 'metal_dark', 0.023, 0.021, 0.055, 0, 0, 0.125, 16);
  mesh(scope, 'glass_lens', new THREE.CircleGeometry(0.0265, 16), 0, 0, -0.171).rotation.y = Math.PI;
  mesh(scope, 'glass_lens', new THREE.CircleGeometry(0.02, 16), 0, 0, 0.1515);
  cy(scope, 'metal_dark', 0.010, 0.010, 0.018, 0, 0.028, 0.02, 12);
  mesh(scope, 'metal_dark', new THREE.CylinderGeometry(0.010, 0.010, 0.018, 12), 0.028, 0, 0.02, 0, 0, Math.PI / 2);
  cz(scope, 'accent_ice', 0.019, 0.019, 0.006, 0, 0, -0.095, 16);

  // bolt (animated: lift + pull). Handle points down-right at rest.
  const bolt = new THREE.Group();
  bolt.position.set(0, 0.085, 0.02);
  g.add(bolt);
  cz(bolt, 'metal_brushed', 0.009, 0.009, 0.08, 0, 0, 0.012, 12);
  const boltArm = new THREE.Group();
  boltArm.rotation.z = -0.95;
  bolt.add(boltArm);
  bx(boltArm, 'metal_brushed', 0.036, 0.008, 0.008, 0.022, 0, 0.03, { bevel: 0.002 });
  mesh(boltArm, 'metal_brushed', new THREE.SphereGeometry(0.011, 10, 8), 0.044, 0, 0.03);

  // detachable box magazine
  const magazine = new THREE.Group();
  magazine.position.set(0, 0.008, -0.16);
  g.add(magazine);
  bx(magazine, 'metal_dark', 0.028, 0.075, 0.088, 0, -0.045, 0, { bevel: 0.004 });
  bx(magazine, 'plastic_black', 0.031, 0.012, 0.094, 0, -0.086, 0, { bevel: 0.003 });

  // grip + thumbhole bridge + skeleton stock
  const gripG = new THREE.Group();
  gripG.position.set(0, -0.002, 0.014);
  gripG.rotation.x = -0.28;
  g.add(gripG);
  bx(gripG, 'plastic_black', 0.030, 0.10, 0.048, 0, -0.047, 0.004, { bevel: 0.006 });
  bx(gripG, 'rubber', 0.032, 0.05, 0.042, 0, -0.052, 0.006, { bevel: 0.004 });
  bx(g, 'plastic_black', 0.024, 0.022, 0.12, 0, 0.052, 0.09, { bevel: 0.004 });    // spine bridge
  bx(g, 'plastic_black', 0.026, 0.028, 0.20, 0, 0.058, 0.16, { bevel: 0.005 });    // top spine
  bx(g, 'plastic_black', 0.026, 0.024, 0.16, 0, -0.05, 0.17, { bevel: 0.005 });    // bottom rail
  bx(g, 'plastic_black', 0.028, 0.12, 0.032, 0, 0.004, 0.252, { bevel: 0.005 });   // rear post
  bx(g, 'rubber', 0.032, 0.126, 0.014, 0, 0.004, 0.276, { bevel: 0.003 });         // butt pad
  bx(g, 'rubber', 0.030, 0.022, 0.09, 0, 0.082, 0.155, { bevel: 0.004 });          // cheek riser

  // trigger guard + trigger
  bx(g, 'plastic_black', 0.007, 0.028, 0.008, 0, 0.0, -0.056, { bevel: 0.002 });
  bx(g, 'plastic_black', 0.007, 0.007, 0.05, 0, -0.014, -0.032, { bevel: 0.002 });
  bx(g, 'metal_dark', 0.006, 0.02, 0.005, 0, 0.002, -0.022, { bevel: 0.001, rx: 0.18 });

  // folded bipod legs under the fore-end
  bx(g, 'metal_dark', 0.03, 0.012, 0.03, 0, 0.012, -0.385, { bevel: 0.003 });
  bx(g, 'metal_brushed', 0.007, 0.009, 0.13, -0.014, 0.014, -0.325, { bevel: 0.002, rx: -0.04 });
  bx(g, 'metal_brushed', 0.007, 0.009, 0.13, 0.014, 0.014, -0.325, { bevel: 0.002, rx: -0.04 });

  g.userData = {
    muzzle: v3(0, 0.085, -0.835),
    magazine, boltOrSlide: bolt,
    shellPort: v3(0.026, 0.09, -0.02),
    aimRef: v3(0, 0.15, -0.03),
    slideTravel: 0.075,
    boltLift: 1.0,
    boltArm,
    magDir: v3(0, -1, 0),
    grips: {
      right: grip(v3(0, -0.046, 0.024), v3(-0.28, 0, 0)),
      left: { ...grip(v3(0, -0.038, -0.30), v3(Math.PI / 2, 0, 0)), parent: 'root' },
    },
  };
  return g;
}

// --- K2 field knife (drop-point blade) --------------------------------------
function buildKnife() {
  const g = new THREE.Group();

  // handle (origin = grip center), guard, pommel
  bx(g, 'rubber', 0.023, 0.033, 0.105, 0, 0, 0.048, { bevel: 0.006 });
  bx(g, 'plastic_black', 0.025, 0.035, 0.02, 0, 0, 0.008, { bevel: 0.004 });
  bx(g, 'metal_brushed', 0.013, 0.049, 0.011, 0, 0.002, -0.008, { bevel: 0.003 });
  bx(g, 'metal_dark', 0.025, 0.035, 0.013, 0, 0, 0.105, { bevel: 0.003 });
  bx(g, 'accent_ice', 0.0235, 0.0035, 0.09, 0, 0.0155, 0.048, { bevel: 0.001 }); // spine accent

  // blade: main + drop-point tip + bright edge grind + fuller
  bx(g, 'metal_brushed', 0.0045, 0.031, 0.112, 0, 0.001, -0.068, { bevel: 0.0015 });
  bx(g, 'metal_brushed', 0.0044, 0.026, 0.052, 0, -0.0035, -0.145, { bevel: 0.0015, rx: -0.16 });
  bx(g, 'metal_edge', 0.0022, 0.007, 0.108, 0, -0.0125, -0.066, { bevel: 0.0006 });
  bx(g, 'metal_edge', 0.0021, 0.006, 0.05, 0, -0.0145, -0.143, { bevel: 0.0006, rx: -0.2 });
  bx(g, 'metal_blued', 0.0048, 0.0055, 0.085, 0, 0.0085, -0.06, { bevel: 0.0006 }); // fuller

  g.userData = {
    muzzle: v3(0, -0.006, -0.175),
    magazine: null, boltOrSlide: null,
    shellPort: v3(0, 0, 0),
    aimRef: v3(0, 0.02, -0.05),
    grips: {
      right: grip(v3(0, 0, 0.048), v3(Math.PI / 2, 0, 0)),
      left: null,
    },
  };
  return g;
}

// --- MK2 Dazzler (flash) / Cirrus Screen (smoke) ----------------------------
function buildDevice(kind) {
  const g = new THREE.Group();
  const h = kind === 'smoke' ? 0.128 : 0.112;
  const r = kind === 'smoke' ? 0.030 : 0.029;
  const band = kind === 'smoke' ? 'band_blue' : 'band_yellow';

  cy(g, 'plastic_gray', r, r, h, 0, 0, 0, 18);                          // body
  cy(g, 'metal_dark', r - 0.003, r - 0.002, 0.012, 0, -h / 2 - 0.004, 0, 14); // base
  cy(g, band, r + 0.0012, r + 0.0012, 0.022, 0, 0.018, 0, 18);          // color band (above the fist)
  cy(g, band, r + 0.0012, r + 0.0012, 0.007, 0, h / 2 - 0.012, 0, 18);  // thin top ring
  cy(g, 'metal_brushed', 0.023, 0.025, 0.016, 0, h / 2 + 0.006, 0, 14); // cap
  cy(g, 'metal_dark', 0.0115, 0.013, 0.026, 0, h / 2 + 0.026, 0, 12);   // fuze head

  // safety lever hugging the -Z side, pin ring on +Z
  bx(g, 'metal_brushed', 0.014, 0.005, 0.03, 0, h / 2 + 0.03, -0.014, { bevel: 0.0015, rx: 0.25 });
  bx(g, 'metal_brushed', 0.014, 0.075, 0.0042, 0, h / 2 - 0.028, -(r + 0.004), { bevel: 0.0015, rx: -0.06 });
  const ring = mesh(g, 'metal_brushed', new THREE.TorusGeometry(0.011, 0.0022, 6, 14), 0, h / 2 + 0.028, 0.02);
  ring.rotation.y = Math.PI / 2;
  cy(g, 'metal_brushed', 0.0028, 0.0028, 0.012, 0, h / 2 + 0.03, 0.009, 8);

  g.userData = {
    muzzle: v3(0, 0.02, -0.04),
    magazine: null, boltOrSlide: null,
    shellPort: v3(0, 0, 0),
    aimRef: v3(0, 0.03, -0.03),
    grips: {
      right: grip(v3(0, -0.006, 0), v3(0, 0, 0)),
      left: null,
    },
    deviceKind: kind,
  };
  return g;
}

// ============================================================ arms & props

// Gloved fist gripping a vertical bar through its origin (bar axis = local Y,
// fingers wrap from +X across -Z to -X). side: 'right' | 'left' (mirrored).
export function buildFistModel(side = 'right') {
  const s = side === 'left' ? -1 : 1;
  const g = new THREE.Group();
  g.name = 'fist_' + side;

  // palm block + knuckle plate
  bx(g, 'leather_black', 0.028, 0.084, 0.078, s * 0.030, -0.002, 0.008, { bevel: 0.006 });
  bx(g, 'leather_black', 0.02, 0.07, 0.05, s * 0.043, 0.002, -0.004, { bevel: 0.005 });

  // four fingers, three segments each, wrapped around the bar
  const rWrap = 0.028;
  const fy = [0.031, 0.011, -0.009, -0.029];
  const angles = [0.55, 1.55, 2.45];
  for (let f = 0; f < 4; f++) {
    const scale = f === 3 ? 0.85 : 1;
    for (let k = 0; k < 3; k++) {
      const a = angles[k];
      const x = s * Math.cos(a) * rWrap;
      const z = -Math.sin(a) * rWrap * 0.92;
      bx(g, 'leather_black', 0.03 * scale, 0.0175, 0.019, x, fy[f], z - 0.006,
        { bevel: 0.004, ry: s * (a + Math.PI / 2) });
    }
  }
  // thumb: two segments closing over the top front
  bx(g, 'leather_black', 0.032, 0.019, 0.02, s * 0.02, 0.048, -0.016, { bevel: 0.004, ry: s * 0.85, rz: s * -0.15 });
  bx(g, 'leather_black', 0.026, 0.018, 0.018, s * -0.004, 0.044, -0.03, { bevel: 0.004, ry: s * 1.7, rz: s * -0.1 });

  // glove cuff hint at the wrist
  mesh(g, 'leather_black', new THREE.CylinderGeometry(0.034, 0.037, 0.035, 12),
    s * 0.012, -0.048, 0.03, 0, 0, s * -0.35).rotation.x = 0.5;

  g.userData.wrist = v3(s * 0.014, -0.06, 0.045);
  return g;
}

// Forearm: origin at the wrist, sleeve extends +Z (toward the elbow), unit
// length — the viewmodel stretches scale.z between wrist and elbow anchor.
export function buildForearmModel(side = 'right') {
  const g = new THREE.Group();
  g.name = 'forearm_' + side;
  const cuff = new THREE.CylinderGeometry(0.037, 0.041, 0.09, 12);
  cuff.rotateX(Math.PI / 2);
  cuff.translate(0, 0, 0.05);
  mesh(g, 'leather_black', cuff, 0, 0, 0);
  const sleeve = new THREE.CylinderGeometry(0.044, 0.056, 0.9, 12);
  sleeve.rotateX(Math.PI / 2);
  sleeve.translate(0, 0, 0.53);
  const sm = mesh(g, 'sleeve_arctic', sleeve, 0, 0, 0);
  sm.material = sm.material.clone();
  sm.material.side = THREE.DoubleSide; // sleeve may cross the near plane
  // cuff strap detail
  const strap = new THREE.CylinderGeometry(0.0455, 0.0465, 0.03, 12);
  strap.rotateX(Math.PI / 2);
  strap.translate(0, 0, 0.13);
  mesh(g, 'plastic_black', strap, 0, 0, 0);
  return g;
}

// Shotgun shell prop (held by the left hand during shell-by-shell reloads).
export function buildShellProp() {
  const g = new THREE.Group();
  const hull = new THREE.CylinderGeometry(0.0105, 0.0105, 0.052, 10);
  hull.rotateX(Math.PI / 2);
  mesh(g, 'shell_red', hull, 0, 0, -0.009);
  const head = new THREE.CylinderGeometry(0.0112, 0.0112, 0.015, 10);
  head.rotateX(Math.PI / 2);
  mesh(g, 'brass', head, 0, 0, 0.0245);
  return g;
}

// Additive muzzle flash card cross (viewmodel toggles + scales it).
export function buildMuzzleFlash() {
  const g = new THREE.Group();
  const m = new THREE.MeshBasicMaterial({
    color: 0xffdf9e, transparent: true, opacity: 0.9,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  });
  const card = new THREE.PlaneGeometry(0.16, 0.05);
  card.translate(0.055, 0, 0);
  for (let i = 0; i < 3; i++) {
    const p = new THREE.Mesh(card, m);
    p.rotation.y = Math.PI / 2;           // spikes radiate forward around -Z
    p.rotation.x = (i / 3) * Math.PI;
    g.add(p);
  }
  const disc = new THREE.Mesh(new THREE.CircleGeometry(0.03, 10), m);
  g.add(disc);
  g.visible = false;
  return g;
}

// =============================================================== public API
const BUILDERS = {
  ad9: buildAD9,
  vesper: buildVesper,
  bdr15: buildBDR15,
  havelock: buildHavelock,
  meridian: buildMeridian,
  knife: buildKnife,
  flash: () => buildDevice('flash'),
  smoke: () => buildDevice('smoke'),
};

export const WEAPON_MODEL_IDS = Object.keys(BUILDERS);

export function buildWeaponModel(id, opts = { firstPerson: false }) {
  const builder = BUILDERS[id];
  if (!builder) {
    console.warn('[weapons_models] unknown weapon id', id);
    return new THREE.Group();
  }
  const g = builder();
  g.name = 'wpn_' + id + (opts.firstPerson ? '_fp' : '');
  g.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = !opts.firstPerson;
      o.receiveShadow = !opts.firstPerson;
    }
  });
  return g;
}

// ------------------------------------------------------------ gallery stands
const DISPLAY_NAMES = {
  ad9: 'Aster Dynamics AD-9 Sidearm',
  vesper: 'Vesper K10 SMG',
  bdr15: 'Borealis Defense BDR-15 Carbine',
  havelock: 'Havelock S8 Shotgun',
  meridian: 'Meridian LR-7 Precision Rifle',
  knife: 'K2 Field Knife',
  flash: 'MK2 Dazzler Flash Device',
  smoke: 'Cirrus Screen Smoke Device',
};

function weaponOnStand(id) {
  const root = new THREE.Group();
  const small = id === 'knife' || id === 'flash' || id === 'smoke';
  const topY = small ? 0.86 : 1.0;

  // pedestal column + top plate + accent strip
  bx(root, 'plastic_gray', 0.3, topY - 0.03, 0.3, 0, (topY - 0.03) / 2, 0, { bevel: 0.012 });
  bx(root, 'metal_dark', 0.4, 0.03, 0.4, 0, topY - 0.015, 0, { bevel: 0.006 });
  bx(root, 'accent_ice', 0.302, 0.01, 0.302, 0, topY - 0.06, 0, { bevel: 0.002 });

  const model = buildWeaponModel(id, { firstPerson: false });
  if (small) {
    // small items stand upright on the plate
    model.position.set(0, topY + (id === 'knife' ? 0.1 : 0.075), 0);
    model.rotation.set(id === 'knife' ? -Math.PI / 2 : 0, -Math.PI / 4, 0);
  } else {
    // long guns rest horizontally on two cradle prongs, right side to viewer
    const lift = 0.12;
    for (const dz of [-0.14, 0.14]) {
      const prong = new THREE.Group();
      prong.position.set(dz * 0.707, topY, dz * -0.707);
      prong.rotation.y = -Math.PI / 4;
      root.add(prong);
      bx(prong, 'metal_brushed', 0.016, lift, 0.016, 0, lift / 2, 0, { bevel: 0.003 });
      bx(prong, 'metal_brushed', 0.016, 0.045, 0.05, 0, lift + 0.014, 0, { bevel: 0.003, rx: 0 });
    }
    model.position.set(0, topY + lift + 0.02, 0);
    model.rotation.y = -Math.PI / 4;
  }
  root.add(model);
  return root;
}

function armsDisplay() {
  const root = new THREE.Group();
  bx(root, 'plastic_gray', 0.3, 0.87, 0.3, 0, 0.435, 0, { bevel: 0.012 });
  bx(root, 'metal_dark', 0.4, 0.03, 0.4, 0, 0.885, 0, { bevel: 0.006 });
  for (const side of ['right', 'left']) {
    const s = side === 'right' ? 1 : -1;
    const fist = buildFistModel(side);
    fist.position.set(s * 0.1, 1.12, -0.05);
    fist.rotation.y = -Math.PI / 4;
    root.add(fist);
    const arm = buildForearmModel(side);
    arm.position.set(s * 0.11, 1.06, 0.0);
    arm.rotation.set(1.15, -Math.PI / 4, 0);
    arm.scale.z = 0.34;
    root.add(arm);
  }
  root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return root;
}

for (const id of WEAPON_MODEL_IDS) {
  registerAsset({
    id: 'wpn_' + id,
    name: DISPLAY_NAMES[id],
    category: 'weapon',
    agent: 'fable4',
    status: 'ready',
    build: () => {
      const g = weaponOnStand(id);
      g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      return g;
    },
  });
}

registerAsset({
  id: 'wpn_fp_arms',
  name: 'First-Person Arms (gloves + sleeves)',
  category: 'weapon',
  agent: 'fable4',
  status: 'ready',
  build: () => armsDisplay(),
});
