import * as THREE from 'three';
import * as T from './textures.js';
import { C, MATERIAL_STANDARD } from './palette.js';
import { reg, OWNERS } from '../core/assets.js';

/**
 * Material library.
 * Owner: Fable 3, reviewed by Fable 1.
 *
 * Materials are requested by family name and world-space tiling, e.g.
 *   mat('carpet.openplan', { tile: 2 })  -> repeat once every 2 metres
 * Texture objects are cached and cloned per repeat so a single painted canvas
 * serves the whole level without re-generating pixels.
 */

const MAT_CACHE = new Map();
const TEX_CLONES = new Map();

function repeated(tex, ru, rv) {
  if (!tex) return null;
  if (ru === 1 && rv === 1 && tex.repeat.x === 1 && tex.repeat.y === 1) return tex;
  const key = `${tex.uuid}:${ru}:${rv}`;
  let c = TEX_CLONES.get(key);
  if (!c) {
    c = tex.clone();
    c.wrapS = c.wrapT = THREE.RepeatWrapping;
    c.repeat.set(ru, rv);
    c.needsUpdate = true;
    TEX_CLONES.set(key, c);
  }
  return c;
}

function buildStandard(set, { ru = 1, rv = 1, color = 0xffffff, roughness, metalness = 0, extra = {} } = {}) {
  const params = {
    color,
    metalness,
    roughness: roughness ?? set.roughness ?? 0.8,
    ...extra,
  };
  if (set.map) params.map = repeated(set.map, ru, rv);
  if (set.normalMap) {
    params.normalMap = repeated(set.normalMap, ru, rv);
    const ns = set.normalScale ?? 0.6;
    params.normalScale = new THREE.Vector2(ns, ns);
  }
  if (set.roughnessMap) params.roughnessMap = repeated(set.roughnessMap, ru, rv);
  if (set.metalnessMap) params.metalnessMap = repeated(set.metalnessMap, ru, rv);
  const m = new THREE.MeshStandardMaterial(params);
  m.envMapIntensity = 0.85;
  return m;
}

/** Family definitions. `tile` is metres-per-texture-repeat. */
const FAMILIES = {
  /* ---- Architecture ---- */
  'drywall.warm': (o) => buildStandard(T.paintedDrywall({ seed: 11, color: C.drywallWarm }), { ...o, roughness: 0.9 }),
  'drywall.cool': (o) => buildStandard(T.paintedDrywall({ seed: 12, color: C.drywallCool }), { ...o, roughness: 0.9 }),
  'drywall.accent': (o) => buildStandard(T.paintedDrywall({ seed: 13, color: C.drywallAccent, scuff: 0.3 }), { ...o, roughness: 0.86 }),
  'drywall.brand': (o) => buildStandard(T.paintedDrywall({ seed: 14, color: C.brandNavy, scuff: 0.2 }), { ...o, roughness: 0.84 }),
  'drywall.scuffed': (o) => buildStandard(T.paintedDrywall({ seed: 15, color: 0xc7c2b8, scuff: 1.5 }), { ...o, roughness: 0.92 }),
  'plaster.clean': (o) => buildStandard(T.plaster({ seed: 21 }), { ...o, roughness: 0.93 }),
  'plaster.cracked': (o) => buildStandard(T.plaster({ seed: 22, cracked: true }), { ...o, roughness: 0.95 }),
  'ceiling.tile': (o) => buildStandard(T.acousticCeilingTile({ seed: 31 }), { ...o, roughness: 0.97 }),
  'ceiling.tileStained': (o) => buildStandard(T.acousticCeilingTile({ seed: 32, stained: true }), { ...o, roughness: 0.97 }),
  'ceiling.plenum': () => new THREE.MeshStandardMaterial({ color: 0x14171a, roughness: 0.98, metalness: 0 }),

  'carpet.slate': (o) => buildStandard(T.commercialCarpet({ seed: 41, color: C.carpetSlate, accent: 0x2f3940 }), { ...o, roughness: 0.97 }),
  'carpet.teal': (o) => buildStandard(T.commercialCarpet({ seed: 42, color: C.carpetTeal, accent: 0x24424a }), { ...o, roughness: 0.97 }),
  'carpet.warm': (o) => buildStandard(T.commercialCarpet({ seed: 43, color: C.carpetWarm, accent: 0x574f45 }), { ...o, roughness: 0.97 }),
  'carpet.exec': (o) => buildStandard(T.commercialCarpet({ seed: 44, color: 0x3b3a44, accent: 0x59525f, wear: 0.15 }), { ...o, roughness: 0.96 }),
  'carpet.worn': (o) => buildStandard(T.commercialCarpet({ seed: 45, color: 0x454b50, accent: 0x5c6167, wear: 1 }), { ...o, roughness: 0.98 }),

  'vinyl.grey': (o) => buildStandard(T.vinylFloor({ seed: 51 }), { ...o, roughness: 0.5 }),
  'vinyl.warm': (o) => buildStandard(T.vinylFloor({ seed: 52, color: 0xa9a294 }), { ...o, roughness: 0.5 }),
  'vinyl.plank': (o) => buildStandard(T.vinylFloor({ seed: 53, color: 0x8d7358, plank: true }), { ...o, roughness: 0.46 }),

  'tile.ceramic': (o) => buildStandard(T.ceramicTile({ seed: 61 }), { ...o, roughness: 0.3 }),
  'tile.ceramicWet': (o) => buildStandard(T.ceramicTile({ seed: 62, wet: 0.6 }), { ...o, roughness: 0.16 }),
  'tile.mosaic': (o) => buildStandard(T.ceramicTile({ seed: 63, cells: 12, color: 0xc6cfd2, groutColor: 0x8d9095 }), { ...o, roughness: 0.28 }),
  'tile.darkFloor': (o) => buildStandard(T.ceramicTile({ seed: 64, cells: 4, color: 0x5b6167, groutColor: 0x3d4247 }), { ...o, roughness: 0.32 }),

  'concrete.raw': (o) => buildStandard(T.concrete({ seed: 71 }), { ...o, roughness: 0.86 }),
  'concrete.polished': (o) => buildStandard(T.concrete({ seed: 72, color: 0x9b9c98, polished: true }), { ...o, roughness: 0.36 }),
  'concrete.dark': (o) => buildStandard(T.concrete({ seed: 73, color: C.concreteDark, formLines: true }), { ...o, roughness: 0.9 }),
  'concrete.wall': (o) => buildStandard(T.concrete({ seed: 74, color: 0x86887f, formLines: true }), { ...o, roughness: 0.88 }),

  'wood.veneer': (o) => buildStandard(T.woodVeneer({ seed: 81 }), { ...o, roughness: 0.42 }),
  'wood.dark': (o) => buildStandard(T.woodVeneer({ seed: 82, dark: true }), { ...o, roughness: 0.38 }),
  'wood.pale': (o) => buildStandard(T.woodVeneer({ seed: 83, color: 0xb08d5f }), { ...o, roughness: 0.46 }),
  'laminate.grey': (o) => buildStandard(T.laminate({ seed: 91 }), { ...o, roughness: 0.36 }),
  'laminate.white': (o) => buildStandard(T.laminate({ seed: 92, color: 0xdedbd4 }), { ...o, roughness: 0.34 }),
  'laminate.dark': (o) => buildStandard(T.laminate({ seed: 93, color: 0x4a4e52 }), { ...o, roughness: 0.38 }),

  /* ---- Metals ---- */
  'metal.brushed': (o) => buildStandard(T.brushedMetal({ seed: 101 }), { ...o, roughness: 0.34, metalness: 0.9 }),
  'metal.brushedV': (o) => buildStandard(T.brushedMetal({ seed: 102, vertical: true }), { ...o, roughness: 0.34, metalness: 0.9 }),
  'metal.stainless': (o) => buildStandard(T.brushedMetal({ seed: 103, color: 0xc6cace }), { ...o, roughness: 0.22, metalness: 1.0 }),
  'metal.painted': (o) => buildStandard(T.paintedMetal({ seed: 111 }), { ...o, roughness: 0.54, metalness: 0.62 }),
  'metal.paintedDark': (o) => buildStandard(T.paintedMetal({ seed: 112, color: 0x3c4147 }), { ...o, roughness: 0.5, metalness: 0.66 }),
  'metal.paintedRed': (o) => buildStandard(T.paintedMetal({ seed: 113, color: 0xb02a20, chipped: 0.5 }), { ...o, roughness: 0.48, metalness: 0.55 }),
  'metal.galvanised': (o) => buildStandard(T.paintedMetal({ seed: 114, color: 0xa9aeb2, chipped: 0.1 }), { ...o, roughness: 0.44, metalness: 0.85 }),
  'metal.blackAnodised': (o) => buildStandard(T.paintedMetal({ seed: 115, color: C.blackAnodised, chipped: 0.2 }), { ...o, roughness: 0.42, metalness: 0.8 }),
  'metal.gunmetal': (o) => buildStandard(T.brushedMetal({ seed: 116, color: C.gunmetal, vertical: true }), { ...o, roughness: 0.38, metalness: 0.92 }),
  'metal.aluminium': (o) => buildStandard(T.brushedMetal({ seed: 117, color: 0xb9bec2 }), { ...o, roughness: 0.3, metalness: 0.95 }),

  /* ---- Soft ---- */
  'fabric.chair': (o) => buildStandard(T.fabricWeave({ seed: 121 }), { ...o, roughness: 0.94 }),
  'fabric.chairAlt': (o) => buildStandard(T.fabricWeave({ seed: 122, color: C.chairFabricAlt }), { ...o, roughness: 0.94 }),
  'fabric.cubicle': (o) => buildStandard(T.fabricWeave({ seed: 123, color: 0x6d7076, coarse: 1.6 }), { ...o, roughness: 0.96 }),
  'fabric.cubicleTeal': (o) => buildStandard(T.fabricWeave({ seed: 124, color: 0x3f5b60, coarse: 1.6 }), { ...o, roughness: 0.96 }),
  'fabric.sofa': (o) => buildStandard(T.fabricWeave({ seed: 125, color: 0x2f3a44, coarse: 1.2 }), { ...o, roughness: 0.93 }),
  'leather.dark': (o) => buildStandard(T.leatherGrain({ seed: 131 }), { ...o, roughness: 0.52 }),
  'leather.tan': (o) => buildStandard(T.leatherGrain({ seed: 132, color: 0x7a5a3e }), { ...o, roughness: 0.56 }),

  /* ---- Plastics / rubber / paper ---- */
  'plastic.dark': (o) => buildStandard(T.hardPlasticTex({ seed: 191 }), { ...o, roughness: 0.42 }),
  'plastic.white': (o) => buildStandard(T.hardPlasticTex({ seed: 192, color: C.plasticWhite }), { ...o, roughness: 0.4 }),
  'plastic.grey': (o) => buildStandard(T.hardPlasticTex({ seed: 193, color: 0x9ea3a7 }), { ...o, roughness: 0.44 }),
  'plastic.smooth': (o) => buildStandard(T.hardPlasticTex({ seed: 194, color: 0x2b2f33, texturedGrain: false }), { ...o, roughness: 0.3 }),
  'rubber.black': (o) => buildStandard(T.rubberTex({ seed: 181 }), { ...o, roughness: 0.92 }),
  'paper.white': (o) => buildStandard(T.paperTex({ seed: 171 }), { ...o, roughness: 0.86 }),
  'paper.cream': (o) => buildStandard(T.paperTex({ seed: 172, color: 0xe8e2d2 }), { ...o, roughness: 0.88 }),
  'cardboard.box': (o) => buildStandard(T.cardboard({ seed: 161 }), { ...o, roughness: 0.9 }),

  /* ---- Environment ---- */
  'snow.fresh': (o) => buildStandard(T.snowSurface({ seed: 141 }), { ...o, roughness: 0.74 }),
  'snow.trampled': (o) => buildStandard(T.snowSurface({ seed: 142, trampled: 1 }), { ...o, roughness: 0.66 }),
  'ice.thin': () => new THREE.MeshStandardMaterial({ color: C.iceBlue, roughness: 0.16, metalness: 0, transparent: true, opacity: 0.72 }),

  /* ---- Glass ---- */
  'glass.clear': () =>
    new THREE.MeshPhysicalMaterial({
      color: 0xdff0fb,
      transparent: true,
      opacity: 0.16,
      roughness: 0.035,
      metalness: 0,
      transmission: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
      envMapIntensity: 1.6,
      clearcoat: 1,
      clearcoatRoughness: 0.03,
    }),
  'glass.tinted': () =>
    new THREE.MeshPhysicalMaterial({
      color: 0x9dc0d6,
      transparent: true,
      opacity: 0.3,
      roughness: 0.06,
      metalness: 0.05,
      side: THREE.DoubleSide,
      depthWrite: false,
      envMapIntensity: 1.5,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
    }),
  'glass.frosted': (o) =>
    buildStandard(T.frostedGlassTex({ seed: 151 }), {
      ...o,
      roughness: 0.55,
      extra: { transparent: true, opacity: 0.72, side: THREE.DoubleSide, color: 0xdfeaf1 },
    }),
  'glass.cracked': () =>
    new THREE.MeshPhysicalMaterial({
      color: 0xd7e6f0,
      transparent: true,
      opacity: 0.42,
      roughness: 0.28,
      metalness: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
      clearcoat: 0.6,
    }),

  /* ---- Emissive ---- */
  'emissive.fluoro': () =>
    new THREE.MeshStandardMaterial({ color: 0xf2fff9, emissive: C.fluoroTube, emissiveIntensity: 3.4, roughness: 0.4 }),
  'emissive.exit': () =>
    new THREE.MeshStandardMaterial({ color: 0x0a2015, emissive: C.exitGreen, emissiveIntensity: 2.8, roughness: 0.5 }),
  'emissive.emergency': () =>
    new THREE.MeshStandardMaterial({ color: 0x2a1a06, emissive: C.emergencyAmber, emissiveIntensity: 2.6, roughness: 0.5 }),
  'emissive.screen': () =>
    new THREE.MeshStandardMaterial({ color: 0x0a1420, emissive: C.screenGlow, emissiveIntensity: 1.1, roughness: 0.28 }),
  'emissive.ledGreen': () =>
    new THREE.MeshStandardMaterial({ color: 0x04130c, emissive: C.serverLed, emissiveIntensity: 3.2, roughness: 0.4 }),
  'emissive.ledAmber': () =>
    new THREE.MeshStandardMaterial({ color: 0x1a1204, emissive: C.serverLedAmber, emissiveIntensity: 3.0, roughness: 0.4 }),
  'emissive.ledRed': () =>
    new THREE.MeshStandardMaterial({ color: 0x1a0503, emissive: C.dangerRed, emissiveIntensity: 3.0, roughness: 0.4 }),
  'emissive.warm': () =>
    new THREE.MeshStandardMaterial({ color: 0x2a1c0c, emissive: C.tungsten, emissiveIntensity: 2.4, roughness: 0.5 }),

  /* ---- Character / weapon shared ---- */
  'skin.a': () => new THREE.MeshStandardMaterial({ color: C.skinA, roughness: 0.66, metalness: 0 }),
  'skin.b': () => new THREE.MeshStandardMaterial({ color: C.skinB, roughness: 0.66, metalness: 0 }),
  'skin.c': () => new THREE.MeshStandardMaterial({ color: C.skinC, roughness: 0.68, metalness: 0 }),
  'skin.d': () => new THREE.MeshStandardMaterial({ color: C.skinD, roughness: 0.64, metalness: 0 }),
};

export function mat(name, opts = {}) {
  const tile = opts.tile ?? 1;
  const tu = opts.tileU ?? tile;
  const tv = opts.tileV ?? tile;
  const key = `${name}|${tu}|${tv}|${opts.color ?? ''}|${opts.variant ?? ''}`;
  let m = MAT_CACHE.get(key);
  if (m) return m;
  const factory = FAMILIES[name];
  if (!factory) {
    console.error(`[materials] unknown family "${name}" — falling back to drywall.warm`);
    return mat('drywall.warm', opts);
  }
  m = factory({ ru: tu, rv: tv, color: opts.color ?? 0xffffff });
  m.name = name;
  if (opts.side) m.side = opts.side;
  MAT_CACHE.set(key, m);
  return m;
}

/** Metres-per-repeat helper: surface of w x h metres wants tex tiled every `m` metres. */
export function tilesFor(wMeters, hMeters, metresPerTile = 2) {
  return { tileU: Math.max(0.25, wMeters / metresPerTile), tileV: Math.max(0.25, hMeters / metresPerTile) };
}

export function materialCount() {
  return MAT_CACHE.size;
}

export function disposeMaterials() {
  for (const m of MAT_CACHE.values()) m.dispose();
  MAT_CACHE.clear();
}

export function allFamilyNames() {
  return Object.keys(FAMILIES);
}

/* ---- Manifest registration for the material families (Fable 3) ---- */
const MATERIAL_DOC = {
  'drywall.warm': ['Warm painted drywall', 'Painted gypsum board, office standard warm white', 'walls: lobby, open plan, corridors'],
  'drywall.cool': ['Cool painted drywall', 'Cool-grey painted gypsum board', 'walls: IT, server, restrooms'],
  'drywall.accent': ['Accent painted drywall', 'Deep slate feature paint', 'accent walls: reception, conference'],
  'drywall.brand': ['Brand navy drywall', 'Northstar navy feature paint', 'logo wall, executive corridor'],
  'drywall.scuffed': ['Scuffed drywall', 'High-traffic scuffed paint', 'service corridor, loading'],
  'plaster.clean': ['Clean plaster', 'Skim-coat plaster', 'stairwell, mechanical'],
  'plaster.cracked': ['Cracked plaster', 'Damaged plaster with crack network', 'mechanical room, loading'],
  'ceiling.tile': ['Acoustic ceiling tile', 'Mineral fibre fissured tile 600mm', 'all suspended ceilings'],
  'ceiling.tileStained': ['Stained ceiling tile', 'Water-damaged tile variant', 'break room, service corridor'],
  'ceiling.plenum': ['Plenum void', 'Dark void behind missing tiles', 'ceiling openings'],
  'carpet.slate': ['Slate loop carpet', 'Commercial carpet tile, slate', 'open plan'],
  'carpet.teal': ['Teal loop carpet', 'Commercial carpet tile, teal', 'lobby, waiting'],
  'carpet.warm': ['Warm loop carpet', 'Commercial carpet tile, warm grey', 'conference'],
  'carpet.exec': ['Executive carpet', 'Dense cut-pile, charcoal violet', 'executive suite'],
  'carpet.worn': ['Worn carpet', 'Traffic-worn commercial carpet', 'corridors'],
  'vinyl.grey': ['Grey vinyl sheet', 'Commercial sheet vinyl', 'copy room, IT'],
  'vinyl.warm': ['Warm vinyl sheet', 'Warm grey sheet vinyl', 'break room'],
  'vinyl.plank': ['Vinyl plank', 'Wood-look luxury vinyl plank', 'break room dining'],
  'tile.ceramic': ['Ceramic floor tile', '300mm ceramic tile with grout', 'restrooms'],
  'tile.ceramicWet': ['Wet ceramic tile', 'Damp ceramic tile variant', 'restroom sink area'],
  'tile.mosaic': ['Mosaic wall tile', '150mm wall mosaic', 'restroom walls'],
  'tile.darkFloor': ['Dark floor tile', 'Large-format dark tile', 'vestibule'],
  'concrete.raw': ['Raw concrete slab', 'Power-trowelled concrete', 'loading, garage'],
  'concrete.polished': ['Polished concrete', 'Polished slab', 'vestibule, mechanical'],
  'concrete.dark': ['Dark concrete', 'Board-formed dark concrete', 'exterior plinth'],
  'concrete.wall': ['Concrete wall', 'Board-formed concrete wall', 'garage, stairwell core'],
  'wood.veneer': ['Wood veneer', 'Walnut veneer panel', 'reception desk, conference table'],
  'wood.dark': ['Dark wood veneer', 'Dark stained veneer', 'executive desk'],
  'wood.pale': ['Pale wood veneer', 'Oak veneer', 'break room cabinets'],
  'laminate.grey': ['Grey laminate', 'Desk laminate, grey', 'workstations'],
  'laminate.white': ['White laminate', 'Cabinet laminate, white', 'copy room'],
  'laminate.dark': ['Dark laminate', 'Dark desk laminate', 'IT benches'],
  'metal.brushed': ['Brushed metal', 'Horizontal brushed aluminium', 'door hardware, trims'],
  'metal.brushedV': ['Brushed metal vertical', 'Vertical brushed aluminium', 'lift-style panels, lockers'],
  'metal.stainless': ['Stainless steel', 'Polished stainless', 'kitchen, restroom fittings'],
  'metal.painted': ['Painted metal', 'Powder-coated grey steel', 'filing cabinets, racks'],
  'metal.paintedDark': ['Dark painted metal', 'Powder-coated charcoal steel', 'server racks, shelving'],
  'metal.paintedRed': ['Red painted metal', 'Fire-equipment red', 'extinguishers, fire cabinet'],
  'metal.galvanised': ['Galvanised steel', 'Galvanised duct/pipe finish', 'HVAC, conduit'],
  'metal.blackAnodised': ['Black anodised', 'Anodised black finish', 'weapon receivers, fixtures'],
  'metal.gunmetal': ['Gunmetal', 'Phosphate gunmetal finish', 'weapon barrels, slides'],
  'metal.aluminium': ['Aluminium', 'Mill-finish aluminium', 'window mullions, ladders'],
  'fabric.chair': ['Chair fabric', 'Woven task-chair fabric', 'desk chairs'],
  'fabric.chairAlt': ['Chair fabric alt', 'Woven fabric, warm variant', 'waiting chairs'],
  'fabric.cubicle': ['Cubicle fabric', 'Coarse acoustic panel fabric', 'cubicle panels'],
  'fabric.cubicleTeal': ['Cubicle fabric teal', 'Coarse acoustic fabric, teal', 'cubicle accent panels'],
  'fabric.sofa': ['Sofa fabric', 'Upholstery weave', 'waiting-area sofa'],
  'leather.dark': ['Dark leather', 'Synthetic leather grain', 'executive chair'],
  'leather.tan': ['Tan leather', 'Tan synthetic leather', 'lounge chair'],
  'plastic.dark': ['Dark hard plastic', 'Textured ABS', 'electronics housings'],
  'plastic.white': ['White hard plastic', 'Textured ABS, light', 'appliances, dispensers'],
  'plastic.grey': ['Grey hard plastic', 'Textured ABS, grey', 'printers, phones'],
  'plastic.smooth': ['Smooth plastic', 'Gloss ABS', 'monitor bezels'],
  'rubber.black': ['Rubber', 'Matte rubber', 'mats, grips, castors'],
  'paper.white': ['White paper', 'Office paper stock', 'documents, printouts'],
  'paper.cream': ['Cream paper', 'Aged paper stock', 'archive files'],
  'cardboard.box': ['Cardboard', 'Corrugated cardboard', 'boxes, packaging'],
  'snow.fresh': ['Fresh snow', 'Wind-drifted fresh snow', 'courtyard, roofs, yard'],
  'snow.trampled': ['Trampled snow', 'Compacted trafficked snow', 'entrance paths, dock'],
  'ice.thin': ['Thin ice', 'Refrozen meltwater', 'entrance thresholds'],
  'glass.clear': ['Clear glass', 'Low-iron clear glazing', 'windows, partitions'],
  'glass.tinted': ['Tinted glass', 'Solar-tinted exterior glazing', 'exterior curtain wall'],
  'glass.frosted': ['Frosted glass', 'Acid-etched privacy glass', 'office doors, restroom'],
  'glass.cracked': ['Cracked glass', 'Impact-damaged glazing state', 'damaged windows'],
  'emissive.fluoro': ['Fluorescent tube', 'Emissive T8 tube surface', 'ceiling fixtures'],
  'emissive.exit': ['Exit sign emissive', 'Green exit sign face', 'exits'],
  'emissive.emergency': ['Emergency light emissive', 'Amber emergency face', 'service spaces'],
  'emissive.screen': ['Screen emissive', 'Monitor emissive face', 'monitors, laptops'],
  'emissive.ledGreen': ['Green LED', 'Equipment status LED', 'servers, network gear'],
  'emissive.ledAmber': ['Amber LED', 'Equipment warning LED', 'UPS, panels'],
  'emissive.ledRed': ['Red LED', 'Equipment fault LED', 'card readers, alarms'],
  'emissive.warm': ['Warm lamp emissive', 'Tungsten lamp face', 'desk lamps'],
  'skin.a': ['Skin tone A', 'Character skin, light-warm', 'characters'],
  'skin.b': ['Skin tone B', 'Character skin, deep-warm', 'characters'],
  'skin.c': ['Skin tone C', 'Character skin, light-neutral', 'characters'],
  'skin.d': ['Skin tone D', 'Character skin, deep-neutral', 'characters'],
};

let registered = false;
export function registerMaterialManifest() {
  if (registered) return;
  registered = true;
  for (const [family, [name, desc, usedIn]] of Object.entries(MATERIAL_DOC)) {
    const std = family.split('.')[0];
    const stdKey = {
      drywall: 'paintedDrywall', plaster: 'plaster', ceiling: 'acousticTile', carpet: 'carpet',
      vinyl: 'vinyl', tile: 'ceramic', concrete: 'concrete', wood: 'woodVeneer', laminate: 'laminate',
      metal: 'paintedMetal', fabric: 'fabric', leather: 'leather', plastic: 'hardPlastic',
      rubber: 'rubber', paper: 'paper', cardboard: 'paper', snow: 'snow', ice: 'ice',
      glass: 'clearGlass', emissive: 'electronics', skin: 'fabric',
    }[std];
    const ranges = MATERIAL_STANDARD[stdKey] ?? { rough: [0.3, 0.9], metal: 0 };
    reg({
      id: `mat.${family}`,
      name,
      category: 'material',
      owner: OWNERS.FABLE3,
      files: ['src/art/materials.js', 'src/art/textures.js'],
      usedIn,
      dimensions: 'tileable, authored at 512², world tiling set per surface',
      pivot: 'UV origin bottom-left, +U east / +V up on vertical faces',
      materials: [family],
      textures: family.startsWith('emissive') || family.startsWith('skin') || family === 'glass.clear' || family === 'glass.tinted' || family === 'glass.cracked' || family === 'ice.thin'
        ? ['baseColor (solid)', 'emissive where applicable']
        : ['baseColor', 'normal (Sobel from authored height)', 'roughness'],
      collision: 'n/a — surface material',
      lod: 'mip chain with trilinear + anisotropic filtering; single texture serves all LODs',
      status: 'accepted',
      acceptance: `${desc}. Roughness within ${ranges.rough[0]}–${ranges.rough[1]}, metalness ${ranges.metal}. No baked lighting in base colour; seamless tiling verified in the asset gallery.`,
      evidence: ['screenshots/gallery/materials.png'],
    });
  }
}
