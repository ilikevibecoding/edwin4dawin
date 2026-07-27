import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { bevelBox, box, cyl, sphere, torus, mesh } from '../map/kit.js';
import { brushedMetal, plainMaterial } from '../art/materials.js';
import { generateImageTexture, generateTextureSet } from '../art/texgen.js';
import { makeFbm, makeWorley, makeStreak } from '../art/noise.js';
import { hashString } from '../core/rng.js';
import { harmonise } from './rig.js';

// ---------------------------------------------------------------------------
// Weapon art library.  (owner: fable4)
//
// All Northstar Rescue weapons are ORIGINAL fictional designs from fictional
// manufacturers. Geometry is procedural (kit primitives + a couple of local
// wedge profiles), authored at real-world scale.
//
// Model conventions
//   * Origin: web of the firing hand at the grip. Barrel runs along -Z.
//   * Named children every consumer relies on:
//       'muzzle'    Object3D at the barrel tip (flash + trace origin)
//       'eject'     Object3D at the ejection port (userData.dir = local dir)
//       'magazine'  detachable magazine mesh group
//       'slide'     the visibly cycling part (slide / bolt / pump / bolt
//                   handle) with userData.travel (metres, +Z = rearward)
//       'gripR' / 'gripL'  hand anchor Object3Ds
//   * userData.def points back at the WEAPONS entry.
// ---------------------------------------------------------------------------

// --- shared materials -------------------------------------------------------
//
// Weapon parts are centimetres across but the kit primitives carry metre-scale
// UVs, so the shared prop materials (hardPlastic / brushedMetal) sample <5% of
// one texture tile and read as flat untextured colour on a gun. These surfaces
// are authored specifically for weapon scale: high repeat so grain/pebble/
// machining detail resolves at viewmodel distance, dark values (a carbine is
// far darker than an office wall), and matte roughness so the presentation rim
// light draws a line, not a blown white strip.

const wpnMatCache = new Map();

/**
 * A procedural weapon surface. `mode` selects the micro-structure:
 *   'park'    parkerised/phosphate steel — fine crystalline tooth, low gloss
 *   'anod'    anodised aluminium — faint machining streaks, satin
 *   'pebble'  moulded polymer — worley pebble grain, matte
 *   'wrinkle' rubber overmould — fbm wrinkle, dead matte
 */
function weaponSurface(key, {
  tint, mode = 'park', metalness = 0.7, rough = 0.7, roughVar = 0.08,
  valueVar = 0.10, repeat = 16, normalStrength = 0.55,
}) {
  if (wpnMatCache.has(key)) return wpnMatCache.get(key);
  const maps = generateTextureSet(`wpn:${key}`, 128, (a) => {
    const { ctx, size } = a;
    const fbm = makeFbm(hashString(`wpnf${key}`), { octaves: 3 });
    const worley = makeWorley(hashString(`wpnw${key}`), 40);
    const streak = makeStreak(hashString(`wpns${key}`), 30);
    const r = (tint >> 16) & 255, g = (tint >> 8) & 255, b = tint & 255;
    const img = ctx.createImageData(size, size);
    const d = img.data;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const u = x / size, v = y / size;
        let micro; // -0.5..0.5 structural detail
        if (mode === 'park') {
          // Dense phosphate crystal tooth: worley pits + fine fbm.
          const pit = Math.max(0, 1 - worley(u, v).f1 * 40 / 0.5);
          micro = (fbm(u * 110, v * 110, 110)) * 0.35 - pit * 0.25;
        } else if (mode === 'anod') {
          micro = streak(u, v, 72) * 0.3 + fbm(u * 90, v * 90, 90) * 0.12;
        } else if (mode === 'pebble') {
          const w = worley(u, v);
          micro = Math.min(1, w.edge * 34) * 0.5 - 0.25 + fbm(u * 70, v * 70, 70) * 0.1;
        } else { // wrinkle
          micro = fbm(u * 46, v * 46, 46) * 0.3 + fbm(u * 130, v * 130, 130) * 0.15;
        }
        const blotch = fbm(u * 7, v * 7, 7) * 0.5; // large-scale patina/wear tone
        const f = 1 + micro * valueVar * 2 + blotch * 0.08;
        const i = (y * size + x) * 4;
        d[i] = Math.max(0, Math.min(255, r * f));
        d[i + 1] = Math.max(0, Math.min(255, g * f));
        d[i + 2] = Math.max(0, Math.min(255, b * f));
        d[i + 3] = 255;
        a.height[y * size + x] = 0.5 + micro * 0.5;
        a.rough[y * size + x] = rough + micro * roughVar * 2 + blotch * 0.05;
      }
    }
    ctx.putImageData(img, 0, 0);
  }, { baseRoughness: rough, normalStrength, ao: false, repeat });
  const m = new THREE.MeshStandardMaterial({
    color: 0xffffff, map: maps.map, normalMap: maps.normalMap,
    roughnessMap: maps.roughnessMap, roughness: 1, metalness,
  });
  m.normalScale = new THREE.Vector2(normalStrength, normalStrength);
  m.userData.materialKey = `wpn:${key}`;
  wpnMatCache.set(key, m);
  return m;
}

const M = {
  get polymer() { return weaponSurface('polymer', { tint: 0x26292d, mode: 'pebble', metalness: 0, rough: 0.78 }); },
  get polymerDark() { return weaponSurface('polymer-dk', { tint: 0x191c1f, mode: 'pebble', metalness: 0, rough: 0.82 }); },
  get rubber() { return weaponSurface('rubber', { tint: 0x17181a, mode: 'wrinkle', metalness: 0, rough: 0.92, roughVar: 0.04 }); },
  get steel() { return weaponSurface('phosphate', { tint: 0x4d4a42, mode: 'park', metalness: 0.7, rough: 0.62 }); },
  get steelDark() { return weaponSurface('blued', { tint: 0x2e3136, mode: 'park', metalness: 0.78, rough: 0.54 }); },
  get alu() { return weaponSurface('anodised', { tint: 0x424951, mode: 'anod', metalness: 0.82, rough: 0.46 }); },
  // Worn muzzle devices / high-touch steel: lighter tone where the finish has
  // rubbed through, still matte.
  get steelWorn() { return weaponSurface('worn', { tint: 0x5c574c, mode: 'park', metalness: 0.72, rough: 0.58, valueVar: 0.16 }); },
  get brass() { return plainMaterial(0xb9945a, { roughness: 0.32, metalness: 0.9 }, 'wpn-brass'); },
  get shellRed() { return plainMaterial(0xa03428, { roughness: 0.55, metalness: 0.05 }, 'wpn-shell'); },
  get glass() { return plainMaterial(0x14283a, { roughness: 0.06, metalness: 0.4 }, 'wpn-optic-glass'); },
  get dotEmissive() {
    return plainMaterial(0x220000, { roughness: 0.3, emissive: new THREE.Color(0xff3020), emissiveIntensity: 2.2 }, 'wpn-dot');
  },
  get wood() { return plainMaterial(0x4a382a, { roughness: 0.55 }, 'wpn-wood'); },
};

// --- local geometry helpers -------------------------------------------------

const wedgeCache = new Map();
/** Triangular wedge, right angle at the -Z end, extruded along X (width w). */
function wedge(w, h, d) {
  const key = `${w}:${h}:${d}`;
  if (wedgeCache.has(key)) return wedgeCache.get(key);
  const shape = new THREE.Shape();
  shape.moveTo(-d / 2, -h / 2);
  shape.lineTo(d / 2, -h / 2);
  shape.lineTo(-d / 2, h / 2);
  shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, { depth: w, bevelEnabled: false });
  g.rotateY(Math.PI / 2);
  g.translate(-w / 2 + w, 0, 0); // centre on X
  g.computeVertexNormals();
  wedgeCache.set(key, g);
  return g;
}

function part(parent, geo, mat, x = 0, y = 0, z = 0, opts = {}) {
  const m = mesh(geo, mat, { name: opts.name });
  m.position.set(x, y, z);
  if (opts.rx) m.rotation.x = opts.rx;
  if (opts.ry) m.rotation.y = opts.ry;
  if (opts.rz) m.rotation.z = opts.rz;
  parent.add(m);
  return m;
}

function empty(parent, name, x, y, z, userData = {}) {
  const o = new THREE.Object3D();
  o.name = name;
  o.position.set(x, y, z);
  Object.assign(o.userData, userData);
  parent.add(o);
  return o;
}

/** Simple picatinny-style rib strip along -Z. */
function railStrip(parent, len, y, z, mat = M.alu) {
  const teeth = Math.max(3, Math.round(len / 0.018));
  for (let i = 0; i < teeth; i++) {
    part(parent, box(0.021, 0.006, 0.009), mat, 0, y, z - (i + 0.5) * (len / teeth));
  }
  part(parent, box(0.024, 0.005, len), mat, 0, y - 0.005, z - len / 2);
}

function ironSights(g, { sightY, rearZ, frontZ }) {
  // Rear notch: two ears.
  part(g, box(0.007, 0.012, 0.012), M.steelDark, -0.007, sightY, rearZ, { name: 'sightRear' });
  part(g, box(0.007, 0.012, 0.012), M.steelDark, 0.007, sightY, rearZ);
  // Front post.
  part(g, box(0.004, 0.014, 0.01), M.steelDark, 0, sightY, frontZ, { name: 'sightFront' });
}

// =========================================================================
// Weapon definitions
// =========================================================================

/**
 * The catalogue. `key` matches the loadout / weapon-system vocabulary
 * ('pistol', 'smg', 'carbine', 'shotgun', 'sniper', 'knife', 'flash',
 * 'smoke'); aliases are resolved by `resolveWeaponKind`.
 */
export const WEAPONS = {
  pistol: {
    key: 'pistol', id: 'WPN-NW9-SIDEARM', name: 'NW-9 Sidearm', brand: 'Meridian Arms',
    family: 'pistol', magSize: 15, chamber: 1, dims: [0.038, 0.17, 0.19],
    // One-handed hold: with primitive glove art a clasped support hand reads
    // as a floating blob at screen centre during ADS, so the sidearm omits it.
    sightY: 0.052, gripR: [0, -0.03, 0.012], gripL: null,
    vm: { hip: [0.15, -0.15, -0.38], adsZ: -0.33, kick: 0.035, kickRot: 0.09, cycleTime: 0.09 },
    build: buildPistol,
  },
  smg: {
    key: 'smg', id: 'WPN-VK7-WHISPER', name: 'VK-7 Whisper', brand: 'Vantor',
    family: 'smg', magSize: 30, chamber: 1, dims: [0.077, 0.28, 0.59],
    sightY: 0.078, gripR: [0, -0.03, 0.01], gripL: [0, -0.012, -0.20],
    vm: { hip: [0.18, -0.22, -0.48], adsZ: -0.34, kick: 0.02, kickRot: 0.045, cycleTime: 0.06 },
    build: buildSMG,
  },
  carbine: {
    key: 'carbine', id: 'WPN-KD4-RANGER', name: 'KD-4 Ranger', brand: 'Kessler Defence',
    family: 'rifle', magSize: 30, chamber: 1, dims: [0.056, 0.36, 0.84],
    // sightY = optic glass/reticle centre (optic base 0.086 + glass 0.014),
    // so ADS looks through the window rather than at the housing.
    sightY: 0.100, gripR: [0, -0.03, 0.01], gripL: [0, -0.008, -0.30],
    vm: { hip: [0.20, -0.24, -0.58], adsZ: -0.42, kick: 0.028, kickRot: 0.06, cycleTime: 0.07 },
    build: buildCarbine,
  },
  shotgun: {
    key: 'shotgun', id: 'WPN-CS12-BREAKER', name: 'CS-12 Breaker', brand: 'Corvid Systems',
    family: 'shotgun', magSize: 7, chamber: 1, dims: [0.127, 0.19, 0.94],
    sightY: 0.072, gripR: [0, -0.028, 0.012], gripL: [0, -0.052, -0.36],
    vm: { hip: [0.20, -0.25, -0.62], adsZ: -0.40, kick: 0.075, kickRot: 0.16, cycleTime: 0.45 },
    build: buildShotgun,
  },
  sniper: {
    key: 'sniper', id: 'WPN-HL700-LONGSIGHT', name: 'HL-700 Longsight', brand: 'Hollowpoint Industrial',
    family: 'sniper', magSize: 5, chamber: 1, dims: [0.093, 0.25, 1.10],
    sightY: 0.106, gripR: [0, -0.03, 0.012], gripL: [0, -0.03, -0.32],
    vm: { hip: [0.20, -0.25, -0.68], adsZ: -0.36, kick: 0.09, kickRot: 0.2, cycleTime: 0.8 },
    build: buildSniper,
  },
  knife: {
    key: 'knife', id: 'WPN-TALON-KNIFE', name: 'Talon', brand: 'Corvid Systems',
    family: 'melee', magSize: 0, chamber: 0, dims: [0.038, 0.056, 0.27],
    sightY: 0, gripR: [0, 0, 0.02], gripL: null,
    // Idle: blade swept across the lower frame toward centre (fighter idle)
    // so the profile actually reads; pointing it down-range foreshortens the
    // whole knife into the fist.
    vm: { hip: [0.12, -0.12, -0.32], adsZ: -0.32, rot: [0.02, 0.85, 0.08], kick: 0, kickRot: 0, cycleTime: 0 },
    build: buildKnife,
  },
  flash: {
    key: 'flash', id: 'WPN-LX2-FLASHBANG', name: 'LX-2 Flashbang', brand: 'Vantor',
    family: 'grenade', magSize: 0, chamber: 0, dims: [0.066, 0.135, 0.066],
    sightY: 0, gripR: [0, -0.01, 0], gripL: null,
    vm: { hip: [0.17, -0.15, -0.36], adsZ: -0.30, rot: [0.4, 0.25, -0.1], kick: 0, kickRot: 0, cycleTime: 0 },
    build: buildFlashbang,
  },
  smoke: {
    key: 'smoke', id: 'WPN-SM6-SMOKE', name: 'SM-6 Smoke Canister', brand: 'Kessler Defence',
    family: 'grenade', magSize: 0, chamber: 0, dims: [0.062, 0.148, 0.062],
    sightY: 0, gripR: [0, -0.01, 0], gripL: null,
    vm: { hip: [0.17, -0.15, -0.36], adsZ: -0.30, rot: [0.4, 0.25, -0.1], kick: 0, kickRot: 0, cycleTime: 0 },
    build: buildSmoke,
  },
};

const ALIASES = {
  pistol: 'pistol', sidearm: 'pistol', nw9: 'pistol', 'nw-9': 'pistol',
  smg: 'smg', vk7: 'smg', 'vk-7': 'smg', whisper: 'smg',
  carbine: 'carbine', rifle: 'carbine', kd4: 'carbine', 'kd-4': 'carbine', ranger: 'carbine',
  shotgun: 'shotgun', cs12: 'shotgun', 'cs-12': 'shotgun', breaker: 'shotgun', pump: 'shotgun',
  sniper: 'sniper', dmr: 'sniper', hl700: 'sniper', 'hl-700': 'sniper', longsight: 'sniper', marksman: 'sniper',
  knife: 'knife', melee: 'knife', talon: 'knife',
  flash: 'flash', flashbang: 'flash', lx2: 'flash', stun: 'flash',
  smoke: 'smoke', sm6: 'smoke', smokegrenade: 'smoke', gadget: 'flash',
};

/** Robust mapping from whatever the weapon system calls it to our catalogue. */
export function resolveWeaponKind(any) {
  if (!any) return 'carbine';
  const raw = typeof any === 'string' ? any : (any.kind || any.key || any.id || any.name || any.slot || 'carbine');
  const norm = String(raw).toLowerCase().replace(/[^a-z0-9-]/g, '');
  if (WEAPONS[norm]) return norm;
  if (ALIASES[norm]) return ALIASES[norm];
  for (const [alias, key] of Object.entries(ALIASES)) {
    if (norm.includes(alias)) return key;
  }
  return 'carbine';
}

/**
 * Merge a weapon's meshes per material so a world weapon draws in a few
 * calls instead of dozens (the carbine's rail alone is ~25 meshes).
 *
 * World models are seen at gameplay distance, so close look-alike materials
 * are aliased to one canonical material per family (all steels → phosphate,
 * all polymers → polymer) before bucketing; a carbine then draws in ~4 calls
 * (steel, polymer, optic glass, dot). The slide and magazine are folded in
 * too — only the first-person viewmodel animates them, and it does not use
 * world models. Named empties (muzzle, eject, grips) are untouched.
 */
function mergeWeaponMeshes(g) {
  g.updateMatrixWorld(true);
  // Family aliases: identity comparison against the cached shared materials.
  const canon = new Map([
    [M.steelDark, M.steel], [M.alu, M.steel], [M.brass, M.steel], [M.steelWorn, M.steel],
    [M.polymerDark, M.polymer], [M.rubber, M.polymer],
  ]);
  const buckets = new Map();
  g.traverse((o) => {
    if (!o.isMesh || o.userData.noMerge) return;
    if (!o.material || Array.isArray(o.material) || o.material.transparent) return;
    const material = canon.get(o.material) || o.material;
    const key = material.uuid;
    if (!buckets.has(key)) buckets.set(key, { material, geos: [], sources: [] });
    const b = buckets.get(key);
    const geo = o.geometry.clone();
    geo.applyMatrix4(o.matrixWorld); // bake into weapon-root space (g is at identity here)
    b.geos.push(harmonise(geo));
    b.sources.push(o);
  });
  for (const b of buckets.values()) {
    let merged = null;
    try { merged = mergeGeometries(b.geos, false); } catch { merged = null; }
    if (!merged) { for (const geo of b.geos) geo.dispose(); continue; }
    merged.computeBoundingSphere();
    const m = new THREE.Mesh(merged, b.material);
    m.name = 'merged';
    g.add(m);
    for (const src of b.sources) src.removeFromParent();
    for (const geo of b.geos) geo.dispose();
  }
  return g;
}

/**
 * Build a fresh weapon model.
 * @param {string} kind
 * @param {{world?:boolean}} opts world models get shadows; FP models do not
 *   need them (the overlay pass has no shadow map).
 */
export function buildWeaponModel(kind, opts = {}) {
  const key = resolveWeaponKind(kind);
  const def = WEAPONS[key];
  const g = new THREE.Group();
  g.name = `weapon:${key}`;
  def.build(g, def);
  empty(g, 'gripR', def.gripR[0], def.gripR[1], def.gripR[2]);
  if (def.gripL) empty(g, 'gripL', def.gripL[0], def.gripL[1], def.gripL[2]);
  g.userData.def = def;
  if (opts.world) mergeWeaponMeshes(g);
  g.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = !!opts.world;
      o.receiveShadow = false;
    }
  });
  return g;
}

/** World pickup presentation: model on a subtle tilt; caller may bob/spin. */
export function buildWeaponPickup(kind) {
  const wrap = new THREE.Group();
  wrap.name = `pickup:${resolveWeaponKind(kind)}`;
  const model = buildWeaponModel(kind, { world: true });
  model.rotation.z = Math.PI / 2.2;
  model.rotation.y = 0.35;
  model.position.y = 0.09;
  wrap.add(model);
  wrap.userData.def = model.userData.def;
  wrap.userData.pickup = true;
  return wrap;
}

// =========================================================================
// Builders
// =========================================================================

function buildPistol(g, def) {
  // Polymer frame + grip.
  part(g, bevelBox(0.026, 0.052, 0.118, 0.004), M.polymer, 0, 0.008, -0.028);         // frame rail block
  const grip = part(g, bevelBox(0.028, 0.098, 0.042, 0.005), M.rubber, 0, -0.045, 0.018, { rx: 0.18 });
  grip.name = 'grip';
  part(g, bevelBox(0.024, 0.026, 0.03, 0.003), M.polymer, 0, -0.002, -0.012);          // trigger guard front
  part(g, box(0.02, 0.005, 0.034), M.polymer, 0, -0.028, -0.016);                      // trigger guard bottom
  part(g, box(0.006, 0.02, 0.008), M.steelDark, 0, -0.012, -0.008, { name: 'trigger', rx: 0.25 });

  // Steel slide (cycling part) with cocking serrations.
  const slide = new THREE.Group();
  slide.name = 'slide';
  slide.userData.travel = 0.045;
  part(slide, bevelBox(0.028, 0.03, 0.182, 0.005), M.steel, 0, 0, 0);
  for (let i = 0; i < 6; i++) part(slide, box(0.03, 0.018, 0.0025), M.steelDark, 0, 0.001, 0.062 + i * 0.006);
  // Ejection port cut.
  part(slide, box(0.004, 0.02, 0.032), M.steelDark, 0.0135, 0.002, -0.012);
  slide.position.set(0, 0.038, -0.028);
  g.add(slide);
  ironSights(g, { sightY: def.sightY, rearZ: 0.056, frontZ: -0.112 });

  // Barrel tip visible in the slide nose.
  part(g, cyl(0.007, 0.007, 0.02, 10), M.steelDark, 0, 0.038, -0.118, { rx: Math.PI / 2 });
  empty(g, 'muzzle', 0, 0.038, -0.125);
  empty(g, 'eject', 0.02, 0.045, -0.038, { dir: [1, 0.6, 0.15] });

  // Magazine: polymer body with a steel baseplate, seated in the grip.
  const mag = new THREE.Group();
  mag.name = 'magazine';
  part(mag, bevelBox(0.023, 0.095, 0.034, 0.003), M.polymerDark, 0, 0, 0);
  part(mag, bevelBox(0.027, 0.012, 0.042, 0.003), M.steelDark, 0, -0.052, 0.002);
  mag.position.set(0, -0.05, 0.02);
  mag.rotation.x = 0.18;
  mag.userData.home = { pos: [0, -0.05, 0.02], rot: [0.18, 0, 0] };
  g.add(mag);
}

function buildSMG(g, def) {
  // Aluminium tube receiver.
  part(g, bevelBox(0.04, 0.052, 0.30, 0.006), M.alu, 0, 0.045, -0.09);
  part(g, cyl(0.019, 0.019, 0.17, 12), M.steelDark, 0, 0.052, -0.30, { rx: Math.PI / 2 }); // shroud
  // Integrated suppressor-look front can (it IS the "Whisper").
  part(g, cyl(0.025, 0.025, 0.12, 14), M.steel, 0, 0.052, -0.345, { rx: Math.PI / 2 });
  empty(g, 'muzzle', 0, 0.052, -0.41);

  // Polymer lower: grip + trigger guard + mag well.
  const grip = part(g, bevelBox(0.03, 0.095, 0.046, 0.005), M.rubber, 0, -0.042, 0.012, { rx: 0.22 });
  grip.name = 'grip';
  part(g, box(0.02, 0.005, 0.05), M.polymer, 0, -0.02, -0.03);
  part(g, box(0.006, 0.02, 0.008), M.steelDark, 0, -0.004, -0.02, { name: 'trigger', rx: 0.25 });
  part(g, bevelBox(0.036, 0.05, 0.05, 0.005), M.polymer, 0, -0.005, -0.075);           // mag well
  // Handguard with vent slots.
  part(g, bevelBox(0.042, 0.036, 0.14, 0.006), M.polymer, 0, 0.02, -0.20);
  for (let i = 0; i < 4; i++) part(g, box(0.044, 0.008, 0.02), M.polymerDark, 0, 0.02, -0.155 - i * 0.03);

  // Folding-style stock (extended): twin struts + rubber butt pad.
  part(g, box(0.008, 0.012, 0.15), M.steel, -0.012, 0.05, 0.10);
  part(g, box(0.008, 0.012, 0.15), M.steel, 0.012, 0.05, 0.10);
  part(g, bevelBox(0.036, 0.085, 0.028, 0.006), M.rubber, 0, 0.028, 0.175);

  // Charging bolt on the left side (cycling part).
  const bolt = new THREE.Group();
  bolt.name = 'slide';
  bolt.userData.travel = 0.05;
  part(bolt, cyl(0.007, 0.007, 0.026, 8), M.steelDark, 0, 0, 0, { rz: Math.PI / 2 });
  part(bolt, sphere(0.008, 8), M.rubber, -0.018, 0, 0);
  bolt.position.set(-0.024, 0.052, -0.06);
  g.add(bolt);
  empty(g, 'eject', 0.022, 0.05, -0.05, { dir: [1, 0.5, 0.1] });

  // Aperture sights.
  part(g, box(0.018, 0.016, 0.006), M.steelDark, 0, def.sightY, 0.045, { name: 'sightRear' });
  part(g, torus(0.006, 0.0018, 10, 6), M.steelDark, 0, def.sightY + 0.004, 0.045);
  part(g, box(0.004, 0.016, 0.008), M.steelDark, 0, def.sightY, -0.26, { name: 'sightFront' });

  // Curved 30-round magazine (stacked, slightly raked).
  const mag = new THREE.Group();
  mag.name = 'magazine';
  for (let i = 0; i < 3; i++) {
    part(mag, bevelBox(0.026, 0.062, 0.042, 0.004), M.steelDark, 0, -i * 0.055, i * i * 0.006 + i * 0.008, { rx: i * 0.09 });
  }
  mag.position.set(0, -0.045, -0.075);
  mag.userData.home = { pos: [0, -0.045, -0.075], rot: [0, 0, 0] };
  g.add(mag);
}

function buildCarbine(g, def) {
  // Aluminium upper + lower receiver.
  part(g, bevelBox(0.044, 0.052, 0.24, 0.006), M.alu, 0, 0.055, -0.06);                 // upper
  part(g, bevelBox(0.04, 0.05, 0.17, 0.006), M.alu, 0, 0.01, -0.035);                   // lower
  part(g, bevelBox(0.036, 0.05, 0.055, 0.005), M.alu, 0, -0.005, -0.105);               // mag well
  // Free-float handguard with m-lok style slots.
  part(g, bevelBox(0.042, 0.044, 0.26, 0.007), M.polymer, 0, 0.052, -0.31);
  for (let i = 0; i < 5; i++) {
    part(g, box(0.045, 0.007, 0.026), M.polymerDark, 0, 0.045, -0.22 - i * 0.045);
  }
  railStrip(g, 0.44, 0.082, -0.02);

  // Barrel + A2-style flash hider (worn finish where the crown gets handled).
  part(g, cyl(0.011, 0.011, 0.16, 10), M.steelDark, 0, 0.055, -0.50, { rx: Math.PI / 2 });
  const fh = part(g, cyl(0.014, 0.012, 0.055, 10), M.steelWorn, 0, 0.055, -0.55, { rx: Math.PI / 2 });
  fh.name = 'flashHider';
  // Port slots read as dark rings on the hider.
  part(g, cyl(0.0142, 0.0142, 0.005, 10), M.polymerDark, 0, 0.055, -0.545, { rx: Math.PI / 2 });
  part(g, cyl(0.0142, 0.0142, 0.005, 10), M.polymerDark, 0, 0.055, -0.559, { rx: Math.PI / 2 });
  empty(g, 'muzzle', 0, 0.055, -0.578);

  // Grip, trigger, guard.
  const grip = part(g, bevelBox(0.03, 0.098, 0.048, 0.005), M.rubber, 0, -0.048, 0.016, { rx: 0.28 });
  grip.name = 'grip';
  part(g, box(0.02, 0.005, 0.055), M.polymer, 0, -0.022, -0.045);
  part(g, box(0.006, 0.022, 0.008), M.steelDark, 0, -0.006, -0.035, { name: 'trigger', rx: 0.25 });

  // Collapsible stock on a buffer tube.
  part(g, cyl(0.017, 0.017, 0.16, 10), M.polymerDark, 0, 0.045, 0.12, { rx: Math.PI / 2 });
  part(g, bevelBox(0.04, 0.09, 0.09, 0.007), M.polymer, 0, 0.02, 0.21);
  part(g, bevelBox(0.044, 0.1, 0.02, 0.006), M.rubber, 0, 0.02, 0.255);

  // Bolt / charging handle assembly (cycling part) + ejection port.
  const bolt = new THREE.Group();
  bolt.name = 'slide';
  bolt.userData.travel = 0.06;
  part(bolt, box(0.01, 0.018, 0.05), M.brass, 0, 0, 0);       // visible bolt carrier face
  bolt.position.set(0.023, 0.055, -0.04);
  g.add(bolt);
  part(g, box(0.003, 0.024, 0.07), M.steelDark, 0.0225, 0.055, -0.045);                 // port frame
  part(g, box(0.008, 0.012, 0.014), M.steelDark, 0.026, 0.05, 0.0);                     // brass deflector
  empty(g, 'eject', 0.03, 0.06, -0.045, { dir: [1, 0.55, 0.2] });

  // Charging handle: T-latch straddling the rear of the upper, ears both sides.
  part(g, box(0.014, 0.007, 0.032), M.polymerDark, 0, 0.0765, 0.045);
  part(g, box(0.04, 0.007, 0.012), M.polymerDark, 0, 0.0765, 0.052);
  part(g, box(0.011, 0.009, 0.01), M.steelDark, -0.024, 0.0765, 0.052);                 // latch
  // Fire selector on the left of the lower, above the grip.
  part(g, cyl(0.007, 0.007, 0.005, 8), M.steelDark, -0.0215, 0.02, 0.002, { rz: Math.PI / 2 });
  part(g, box(0.004, 0.007, 0.024), M.steelDark, -0.0235, 0.02, -0.008);
  // Magazine release button on the right.
  part(g, cyl(0.005, 0.005, 0.006, 8), M.steelDark, 0.021, 0.012, -0.055, { rz: Math.PI / 2 });
  // QD sling points: rear of the stock and left of the handguard.
  part(g, torus(0.0065, 0.0018, 8, 6), M.steelDark, -0.021, 0.0, 0.21, { ry: Math.PI / 2 });
  part(g, torus(0.0065, 0.0018, 8, 6), M.steelDark, -0.022, 0.052, -0.40, { ry: Math.PI / 2 });

  // Compact red-dot optic: housing + emissive dot + glass.
  const optic = new THREE.Group();
  optic.name = 'optic';
  part(optic, bevelBox(0.032, 0.03, 0.062, 0.005), M.polymerDark, 0, 0.012, 0);
  part(optic, box(0.026, 0.024, 0.003), M.glass, 0, 0.014, -0.028);
  part(optic, box(0.026, 0.024, 0.003), M.glass, 0, 0.014, 0.028);
  const dot = part(optic, sphere(0.0022, 6), M.dotEmissive, 0, 0.014, 0.02);
  dot.name = 'reticle';
  optic.position.set(0, 0.086, -0.05);
  g.add(optic);
  // Backup irons folded into the rail line.
  part(g, box(0.004, 0.01, 0.008), M.steelDark, 0, 0.09, -0.42, { name: 'sightFront' });

  // 30-round polymer magazine with witness ribs.
  const mag = new THREE.Group();
  mag.name = 'magazine';
  for (let i = 0; i < 3; i++) {
    part(mag, bevelBox(0.028, 0.07, 0.058, 0.004), M.polymerDark, 0, -i * 0.062, i * 0.014, { rx: 0.22 });
  }
  part(mag, bevelBox(0.032, 0.012, 0.062, 0.003), M.polymer, 0, -0.192, 0.032, { rx: 0.22 });
  mag.position.set(0, -0.04, -0.105);
  mag.userData.home = { pos: [0, -0.04, -0.105], rot: [0, 0, 0] };
  g.add(mag);
}

function buildShotgun(g, def) {
  // Steel receiver.
  part(g, bevelBox(0.046, 0.062, 0.20, 0.007), M.steel, 0, 0.045, -0.02);
  // Barrel over magazine tube.
  part(g, cyl(0.0125, 0.0125, 0.56, 12), M.steelDark, 0, 0.068, -0.40, { rx: Math.PI / 2 });
  part(g, cyl(0.0135, 0.0135, 0.46, 12), M.steel, 0, 0.03, -0.36, { rx: Math.PI / 2 }); // tube (7 shells)
  empty(g, 'muzzle', 0, 0.068, -0.68);
  // Bead sight.
  part(g, sphere(0.004, 8), M.brass, 0, 0.086, -0.665, { name: 'sightFront' });
  part(g, box(0.02, 0.01, 0.01), M.steelDark, 0, def.sightY, 0.05, { name: 'sightRear' });

  // Pump: ribbed polymer forend (this is the cycling part).
  const pump = new THREE.Group();
  pump.name = 'slide';
  pump.userData.travel = 0.09;
  part(pump, cyl(0.023, 0.023, 0.13, 12), M.rubber, 0, 0, 0, { rx: Math.PI / 2 });
  for (let i = 0; i < 5; i++) part(pump, torus(0.0235, 0.0018, 12, 6), M.polymerDark, 0, 0, -0.05 + i * 0.025);
  pump.position.set(0, 0.03, -0.36);
  g.add(pump);

  // Ejection + loading ports.
  part(g, box(0.003, 0.03, 0.07), M.steelDark, 0.024, 0.045, -0.02);
  empty(g, 'eject', 0.03, 0.05, -0.02, { dir: [1, 0.5, 0.25] });

  // "Magazine": shell carrier plate on the receiver side (visual reload aid) —
  // detaching it is how the viewmodel shows single-shell handling.
  const mag = new THREE.Group();
  mag.name = 'magazine';
  for (let i = 0; i < 3; i++) {
    part(mag, cyl(0.0095, 0.0095, 0.062, 8), M.shellRed, -0.0, -0.02 + i * 0.024, 0, { rz: Math.PI / 2 });
    part(mag, cyl(0.01, 0.01, 0.012, 8), M.brass, 0.026, -0.02 + i * 0.024, 0, { rz: Math.PI / 2 });
  }
  mag.position.set(-0.036, 0.045, 0.02);
  mag.userData.home = { pos: [-0.036, 0.045, 0.02], rot: [0, 0, 0] };
  g.add(mag);

  // Grip + full stock.
  const grip = part(g, bevelBox(0.032, 0.1, 0.05, 0.006), M.rubber, 0, -0.045, 0.02, { rx: 0.3 });
  grip.name = 'grip';
  part(g, box(0.02, 0.005, 0.05), M.polymer, 0, -0.02, -0.02);
  part(g, box(0.006, 0.02, 0.008), M.steelDark, 0, -0.004, -0.012, { name: 'trigger', rx: 0.25 });
  part(g, wedge(0.04, 0.11, 0.17), M.polymer, 0, 0.02, 0.165, { rx: Math.PI });
  part(g, bevelBox(0.042, 0.115, 0.025, 0.007), M.rubber, 0, 0.005, 0.255);
}

function buildSniper(g, def) {
  // Full-length aluminium chassis.
  part(g, bevelBox(0.05, 0.06, 0.42, 0.008), M.alu, 0, 0.04, -0.12);
  part(g, bevelBox(0.044, 0.05, 0.30, 0.007), M.polymerDark, 0, 0.035, -0.44);          // forend
  railStrip(g, 0.34, 0.078, -0.02);

  // Heavy fluted barrel + brake.
  part(g, cyl(0.014, 0.016, 0.42, 12), M.steelDark, 0, 0.055, -0.56, { rx: Math.PI / 2 });
  const brake = part(g, cyl(0.02, 0.02, 0.07, 10), M.steel, 0, 0.055, -0.745, { rx: Math.PI / 2 });
  brake.name = 'brake';
  for (let i = 0; i < 3; i++) part(g, box(0.046, 0.006, 0.008), M.steelDark, 0, 0.055, -0.72 - i * 0.018);
  empty(g, 'muzzle', 0, 0.055, -0.782);

  // Scope: main tube, bells, turrets, glass.
  const scope = new THREE.Group();
  scope.name = 'optic';
  part(scope, cyl(0.017, 0.017, 0.19, 14), M.polymerDark, 0, 0, 0, { rx: Math.PI / 2 });
  part(scope, cyl(0.026, 0.02, 0.06, 14), M.polymerDark, 0, 0, -0.115, { rx: Math.PI / 2 });
  part(scope, cyl(0.02, 0.023, 0.05, 14), M.polymerDark, 0, 0, 0.105, { rx: Math.PI / 2 });
  part(scope, cyl(0.024, 0.024, 0.004, 14), M.glass, 0, 0, -0.147, { rx: Math.PI / 2 });
  part(scope, cyl(0.019, 0.019, 0.004, 14), M.glass, 0, 0, 0.132, { rx: Math.PI / 2 });
  part(scope, cyl(0.012, 0.012, 0.018, 10), M.steelDark, 0, 0.024, 0, { name: 'turretElev' });
  part(scope, cyl(0.012, 0.012, 0.018, 10), M.steelDark, 0.024, 0, 0, { rz: Math.PI / 2 });
  // Rings.
  part(scope, torus(0.019, 0.004, 12, 8), M.alu, 0, -0.006, -0.055);
  part(scope, torus(0.019, 0.004, 12, 8), M.alu, 0, -0.006, 0.06);
  scope.position.set(0, def.sightY, -0.04);
  g.add(scope);

  // Bolt handle (cycling part): rotates conceptually, we translate it.
  const bolt = new THREE.Group();
  bolt.name = 'slide';
  bolt.userData.travel = 0.075;
  part(bolt, cyl(0.008, 0.008, 0.05, 8), M.steel, 0.028, 0, 0, { rz: 1.15 });
  part(bolt, sphere(0.011, 8), M.steel, 0.049, -0.012, 0);
  part(bolt, cyl(0.0125, 0.0125, 0.06, 10), M.steel, 0, 0.004, 0.01, { rx: Math.PI / 2 });
  bolt.position.set(0, 0.052, 0.03);
  g.add(bolt);
  empty(g, 'eject', 0.028, 0.06, -0.01, { dir: [1, 0.7, 0.1] });

  // Grip + skeleton stock with cheek riser.
  const grip = part(g, bevelBox(0.032, 0.1, 0.05, 0.006), M.rubber, 0, -0.048, 0.03, { rx: 0.3 });
  grip.name = 'grip';
  part(g, box(0.006, 0.022, 0.008), M.steelDark, 0, -0.006, -0.008, { name: 'trigger', rx: 0.25 });
  part(g, box(0.02, 0.005, 0.05), M.polymer, 0, -0.024, -0.018);
  part(g, bevelBox(0.036, 0.03, 0.22, 0.006), M.alu, 0, 0.03, 0.20);                     // stock spine
  part(g, bevelBox(0.034, 0.05, 0.09, 0.006), M.polymerDark, 0, 0.062, 0.20);            // cheek riser
  part(g, bevelBox(0.04, 0.12, 0.03, 0.007), M.rubber, 0, 0.005, 0.315);                 // butt pad
  part(g, bevelBox(0.03, 0.08, 0.05, 0.006), M.polymerDark, 0, -0.03, 0.24);             // rear hook

  // 5-round box magazine.
  const mag = new THREE.Group();
  mag.name = 'magazine';
  part(mag, bevelBox(0.03, 0.075, 0.07, 0.004), M.steelDark, 0, 0, 0.004, { rx: 0.1 });
  part(mag, bevelBox(0.034, 0.012, 0.075, 0.003), M.steel, 0, -0.042, 0.008, { rx: 0.1 });
  mag.position.set(0, -0.02, -0.10);
  mag.userData.home = { pos: [0, -0.02, -0.10], rot: [0, 0, 0] };
  g.add(mag);
}

function buildKnife(g) {
  // Rubberised handle with finger grooves + steel guard, drop-point blade.
  const handle = part(g, bevelBox(0.024, 0.035, 0.105, 0.007), M.rubber, 0, 0, 0.045, { name: 'grip' });
  handle.rotation.x = 0.04;
  for (let i = 0; i < 3; i++) part(g, torus(0.017, 0.002, 10, 6), M.polymerDark, 0, -0.004, 0.015 + i * 0.025);
  part(g, bevelBox(0.012, 0.05, 0.012, 0.003), M.steel, 0, 0, -0.012);                   // guard
  part(g, sphere(0.009, 8), M.steel, 0, 0, 0.1);                                          // pommel
  // Blade: flat + tapered tip wedge, satin steel (brighter than the
  // parkerised gun steel — a blade flat is ground, not phosphated).
  const blade = weaponSurface('blade', { tint: 0x676e76, mode: 'anod', metalness: 0.9, rough: 0.34, valueVar: 0.07 });
  part(g, box(0.004, 0.03, 0.10), blade, 0, 0.002, -0.065, { name: 'blade' });
  part(g, wedge(0.004, 0.03, 0.045), blade, 0, 0.002, -0.1375, { ry: 0 });
  // Cutting edge highlight strip.
  part(g, box(0.0046, 0.004, 0.10), brushedMetal(0xcfd4d8, 'wpn-edge', 0.15), 0, -0.013, -0.065);
  empty(g, 'muzzle', 0, 0, -0.16); // "tip" — used for swipe traces
}

function grenadeBody(g, bodyColor, bandColor, label) {
  const bodyMat = plainMaterial(bodyColor, { roughness: 0.55, metalness: 0.45 }, `gren-${bodyColor}`);
  part(g, cyl(0.031, 0.031, 0.105, 14), bodyMat, 0, -0.01, 0);
  part(g, cyl(0.028, 0.031, 0.012, 14), bodyMat, 0, 0.048, 0);
  part(g, cyl(0.012, 0.012, 0.02, 10), M.steel, 0, 0.065, 0);                             // fuze
  // Safety lever (spoon) hugging the body.
  part(g, box(0.014, 0.075, 0.003), M.steel, 0, 0.032, -0.031, { rx: -0.12, name: 'lever' });
  // Pull ring.
  const ring = part(g, torus(0.012, 0.002, 12, 6), M.steel, 0, 0.068, -0.02);
  ring.rotation.x = Math.PI / 2.4;
  ring.name = 'pin';
  // ID band.
  part(g, cyl(0.0315, 0.0315, 0.012, 14), plainMaterial(bandColor, { roughness: 0.5 }, `band-${bandColor}`), 0, 0.02, 0);
  empty(g, 'muzzle', 0, 0.05, 0);
  g.userData.label = label;
}

function buildFlashbang(g) {
  // Perforated steel canister — vents ring the body in two rows.
  grenadeBody(g, 0x3e434a, 0xb8b8b2, 'LX-2');
  for (let row = 0; row < 2; row++) {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      part(g, cyl(0.004, 0.004, 0.006, 6), M.polymerDark,
        Math.cos(a) * 0.0315, -0.028 + row * 0.038, Math.sin(a) * 0.0315,
        { rx: Math.PI / 2, ry: a });
    }
  }
}

function buildSmoke(g) {
  grenadeBody(g, 0x4a5b4e, 0xb9c7cf, 'SM-6');
  // Top emission ports.
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    part(g, cyl(0.0045, 0.0045, 0.008, 6), M.polymerDark, Math.cos(a) * 0.018, 0.056, Math.sin(a) * 0.018);
  }
  part(g, cyl(0.031, 0.031, 0.02, 14), plainMaterial(0x37423a, { roughness: 0.6 }, 'smoke-base'), 0, -0.062, 0);
}

// =========================================================================
// Icons — crisp side-profile line art on transparency (canvas generated)
// =========================================================================

/**
 * Draw a weapon profile as line art. Each painter draws into a normalized
 * 100x46 box; we scale to the requested canvas.
 */
const ICON_PAINTERS = {
  pistol(c) {
    c.moveTo(4, 14); c.lineTo(58, 14); c.lineTo(58, 22); c.lineTo(40, 22);
    c.lineTo(38, 24); c.lineTo(30, 24); c.lineTo(36, 42); c.lineTo(24, 44);
    c.lineTo(16, 24); c.lineTo(4, 22); c.closePath();
    c.moveTo(20, 24); c.lineTo(24, 34); c.lineTo(28, 33); c.lineTo(25, 24); // trigger guard
    c.moveTo(6, 12); c.lineTo(9, 12); c.moveTo(52, 11); c.lineTo(55, 11); c.lineTo(55, 14); // sights
  },
  smg(c) {
    c.moveTo(2, 18); c.lineTo(30, 18); c.moveTo(2, 18); c.lineTo(2, 24); c.lineTo(30, 24); // can
    c.moveTo(30, 14); c.lineTo(74, 14); c.lineTo(74, 26); c.lineTo(64, 26);
    c.lineTo(62, 30); c.lineTo(56, 30); c.lineTo(60, 44); c.lineTo(52, 45); c.lineTo(47, 30);
    c.lineTo(44, 26); c.lineTo(38, 26); c.lineTo(40, 44); c.lineTo(34, 44); c.lineTo(31, 26); c.lineTo(30, 14);
    c.moveTo(74, 17); c.lineTo(94, 15); c.moveTo(74, 22); c.lineTo(94, 20); c.lineTo(97, 26); c.lineTo(92, 27); // stock
    c.moveTo(36, 10); c.lineTo(36, 14); c.moveTo(70, 9); c.lineTo(70, 14); // sights
  },
  carbine(c) {
    c.moveTo(2, 17); c.lineTo(10, 17); c.moveTo(2, 20); c.lineTo(10, 20); // brake
    c.moveTo(10, 18.5); c.lineTo(22, 18.5);
    c.moveTo(22, 15); c.lineTo(48, 15); c.lineTo(48, 23); c.lineTo(22, 23); c.closePath(); // handguard
    c.moveTo(48, 13); c.lineTo(72, 13); c.lineTo(72, 25); c.lineTo(66, 25);
    c.lineTo(64, 28); c.lineTo(58, 28); c.lineTo(62, 44); c.lineTo(54, 45); c.lineTo(50, 28);
    c.lineTo(48, 25); c.closePath(); // receiver + grip
    c.moveTo(52, 25); c.lineTo(50, 40); c.lineTo(44, 39); c.lineTo(48, 25); // magazine
    c.moveTo(72, 16); c.lineTo(88, 15); c.lineTo(96, 12); c.lineTo(97, 27); c.lineTo(88, 24); c.lineTo(72, 22); // stock
    c.moveTo(54, 8); c.lineTo(66, 8); c.lineTo(66, 13); c.lineTo(54, 13); c.closePath(); // optic
  },
  shotgun(c) {
    c.moveTo(2, 15); c.lineTo(52, 15); c.moveTo(2, 19); c.lineTo(52, 19); // barrel
    c.moveTo(14, 21); c.lineTo(34, 21); c.lineTo(34, 27); c.lineTo(14, 27); c.closePath(); // pump
    c.moveTo(52, 13); c.lineTo(70, 13); c.lineTo(70, 26); c.lineTo(64, 26);
    c.lineTo(62, 29); c.lineTo(56, 29); c.lineTo(52, 26); c.closePath();
    c.moveTo(58, 29); c.lineTo(61, 40); c.lineTo(55, 41); c.lineTo(53, 29); // grip
    c.moveTo(70, 15); c.lineTo(92, 18); c.lineTo(97, 30); c.lineTo(84, 30); c.lineTo(70, 24); // stock
    c.moveTo(4, 12); c.lineTo(4, 15); // bead
  },
  sniper(c) {
    c.moveTo(2, 17); c.lineTo(10, 17); c.moveTo(2, 21); c.lineTo(10, 21); // brake
    c.moveTo(10, 19); c.lineTo(34, 19);
    c.moveTo(34, 16); c.lineTo(70, 16); c.lineTo(70, 25); c.lineTo(34, 24); c.closePath(); // chassis
    c.moveTo(44, 8); c.lineTo(64, 8); c.moveTo(42, 6); c.lineTo(46, 12); c.moveTo(66, 6); c.lineTo(62, 12); // scope
    c.moveTo(48, 8); c.lineTo(48, 16); c.moveTo(60, 8); c.lineTo(60, 16);
    c.moveTo(71, 12); c.lineTo(75, 18); // bolt
    c.moveTo(52, 25); c.lineTo(54, 34); c.lineTo(47, 34); c.lineTo(47, 25); // mag
    c.moveTo(62, 25); c.lineTo(65, 40); c.lineTo(58, 41); c.lineTo(56, 27); // grip
    c.moveTo(70, 17); c.lineTo(90, 14); c.lineTo(97, 16); c.lineTo(97, 30); c.lineTo(86, 30); c.lineTo(70, 25); // stock
  },
  knife(c) {
    c.moveTo(4, 24); c.lineTo(40, 16); c.lineTo(58, 20); c.lineTo(58, 24); c.lineTo(4, 26); c.closePath(); // blade
    c.moveTo(58, 14); c.lineTo(61, 14); c.lineTo(61, 30); c.lineTo(58, 30); c.closePath(); // guard
    c.moveTo(61, 18); c.lineTo(92, 19); c.lineTo(95, 22); c.lineTo(92, 27); c.lineTo(61, 27); // handle
    c.moveTo(68, 19); c.lineTo(68, 27); c.moveTo(76, 19); c.lineTo(76, 27); c.moveTo(84, 19); c.lineTo(84, 27);
  },
  flash(c) {
    c.moveTo(38, 14); c.lineTo(62, 14); c.lineTo(62, 42); c.lineTo(38, 42); c.closePath();
    c.moveTo(44, 14); c.lineTo(44, 8); c.lineTo(56, 8); c.lineTo(56, 14); // fuze head
    c.moveTo(56, 8); c.lineTo(68, 16); c.lineTo(66, 20); // lever
    c.moveTo(40, 6); c.arc(46, 6, 5, 0, Math.PI * 2); // ring
    c.moveTo(42, 22); c.lineTo(58, 22); c.moveTo(42, 32); c.lineTo(58, 32); // vents
  },
  smoke(c) {
    c.moveTo(38, 10); c.lineTo(62, 10); c.lineTo(62, 44); c.lineTo(38, 44); c.closePath();
    c.moveTo(46, 10); c.lineTo(46, 5); c.lineTo(54, 5); c.lineTo(54, 10);
    c.moveTo(38, 18); c.lineTo(62, 18);
    c.moveTo(43, 5); c.lineTo(36, 12); // lever
    c.moveTo(66, 8); c.arc(63, 8, 4, 0, Math.PI * 2);
  },
};

function paintIcon(ctx, w, h, kind, lineWidth) {
  ctx.clearRect(0, 0, w, h);
  ctx.save();
  const sx = w / 100;
  const sy = h / 46;
  ctx.scale(sx, sy);
  ctx.lineWidth = lineWidth / Math.max(sx, sy);
  ctx.strokeStyle = 'rgba(232,238,244,0.96)';
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  (ICON_PAINTERS[kind] || ICON_PAINTERS.carbine)(ctx);
  ctx.stroke();
  ctx.restore();
}

/** HUD (small) and inventory (large) icons for a weapon kind. */
export function weaponIcons(kind) {
  const key = resolveWeaponKind(kind);
  const hudIcon = generateImageTexture(`icon:wpn:hud:${key}`, 200, 92, (ctx, w, h) =>
    paintIcon(ctx, w, h, key, 4.2));
  const inventoryIcon = generateImageTexture(`icon:wpn:inv:${key}`, 320, 148, (ctx, w, h) =>
    paintIcon(ctx, w, h, key, 5.0));
  return { hudIcon, inventoryIcon };
}

// Attach lazy icon getters to each definition so consumers can do
// WEAPONS.carbine.hudIcon without knowing about texgen.
for (const def of Object.values(WEAPONS)) {
  Object.defineProperty(def, 'hudIcon', { get() { return weaponIcons(def.key).hudIcon; }, configurable: true });
  Object.defineProperty(def, 'inventoryIcon', { get() { return weaponIcons(def.key).inventoryIcon; }, configurable: true });
}

export const WEAPON_LIST = Object.values(WEAPONS);
