import * as THREE from 'three';
import { PALETTE } from '../palette.js';
import {
  applyDirt,
  bedLinerMaps,
  brushedMaps,
  decalMap,
  diamondPlateMaps,
  fabricMaps,
  glassFilmMap,
  glassRoughness,
  lensNormal,
  makePaintMaterial,
  meshAlpha,
  prismNormal,
  reflectorNormal,
  rubberMaps,
  treadMaps,
  trimMaps,
  wornMetalMaps,
} from '../textures/vehicle.js';

// ---------------------------------------------------------------------------
// The truck's material library. Keys here are what every vehicle part module
// references through `Kit.add(key, ...)`.
//
// Five PBR families are represented: automotive clearcoat paint, worn/blasted
// steel, moulded rubber & sun-faded plastic, glass, and soft fabric. Anything
// that lives on the outside of the body also gets the object-space road-film
// layer so dirt climbs the panels as one continuous gradient.
// ---------------------------------------------------------------------------

let cachedMats = null;

export function vehicleMaterials(env = null) {
  if (cachedMats) {
    if (env) for (const m of Object.values(cachedMats)) if ('envMap' in m) m.envMap = env;
    return cachedMats;
  }

  const metal = wornMetalMaps(3);
  const metal2 = wornMetalMaps(8);
  const brushed = brushedMaps();
  const trim = trimMaps();
  const rubber = rubberMaps();
  const tread = treadMaps();
  const fabric = fabricMaps();
  const plate = diamondPlateMaps();
  const liner = bedLinerMaps();

  const m = {};

  // --- paint family --------------------------------------------------------
  m.paint = makePaintMaterial(PALETTE.bodyPaint);
  // The roof and bonnet see the sky, so they collect settled dust rather than
  // thrown mud: no arch spray, more of the up-facing deposit.
  m.paintRoof = makePaintMaterial(PALETTE.bodyPaint, {
    roughness: 0.4,
    clearcoatRoughness: 0.11,
    dirt: 1.25,
    dirtArch: 0,
    dirtTag: 'roof',
  });
  m.paintDark = makePaintMaterial(PALETTE.bodyPaintDark, {
    roughness: 0.46,
    clearcoatRoughness: 0.14,
    dirtTag: 'dark',
  });
  m.paintAccent = makePaintMaterial(PALETTE.accent, {
    metalness: 0.03,
    roughness: 0.46,
    clearcoat: 0.72,
    dirtTag: 'accent',
  });

  // --- metal family --------------------------------------------------------
  m.steel = new THREE.MeshStandardMaterial({
    map: metal.map,
    normalMap: metal.normal,
    roughnessMap: metal.rough,
    metalnessMap: metal.metalness,
    normalScale: new THREE.Vector2(0.8, 0.8),
    metalness: 1.0,
    roughness: 1.0,
    envMapIntensity: 1.35,
  });
  m.steelDark = new THREE.MeshStandardMaterial({
    map: metal2.map,
    normalMap: metal2.normal,
    roughnessMap: metal2.rough,
    color: 0x6d747a,
    normalScale: new THREE.Vector2(0.9, 0.9),
    metalness: 0.9,
    roughness: 0.5,
    envMapIntensity: 1.45,
  });
  applyDirt(m.steelDark, { amount: 0.6, tag: 'steelDark', color: 0x8b7355 });
  m.chrome = new THREE.MeshStandardMaterial({
    color: PALETTE.chrome,
    metalness: 1.0,
    roughness: 0.11,
    normalMap: metal.normal,
    normalScale: new THREE.Vector2(0.1, 0.1),
    envMapIntensity: 1.95,
  });
  applyDirt(m.chrome, { amount: 0.35, tag: 'chrome', color: 0x9a8c74 });
  m.alu = new THREE.MeshStandardMaterial({
    color: 0xb6bcc0,
    metalness: 0.88,
    // Satin, not polished. A narrow strip of low-roughness metal against a dark
    // panel mirrors the sky and reads as a neon pinstripe rather than a chamfer.
    roughness: 0.44,
    normalMap: brushed.normal,
    roughnessMap: brushed.rough,
    normalScale: new THREE.Vector2(0.5, 0.5),
    envMapIntensity: 1.2,
  });
  m.plate = new THREE.MeshStandardMaterial({
    map: plate.map,
    color: 0x82878c,
    metalness: 0.88,
    roughness: 0.46,
    normalMap: plate.normal,
    roughnessMap: plate.rough,
    normalScale: new THREE.Vector2(1.0, 1.0),
    envMapIntensity: 1.15,
  });
  applyDirt(m.plate, { amount: 0.95, tag: 'plate', color: 0x7d6a4e });
  m.brakeDisc = new THREE.MeshStandardMaterial({
    color: 0x8a827a,
    metalness: 1.0,
    roughness: 0.4,
    envMapIntensity: 1.1,
  });
  m.caliper = new THREE.MeshStandardMaterial({
    color: PALETTE.accentDim,
    metalness: 0.7,
    roughness: 0.5,
    envMapIntensity: 0.9,
  });

  // --- rubber / plastic family --------------------------------------------
  m.rubber = new THREE.MeshStandardMaterial({
    map: rubber.map,
    normalMap: rubber.normal,
    roughnessMap: rubber.rough,
    normalScale: new THREE.Vector2(0.9, 0.9),
    metalness: 0.0,
    roughness: 0.92,
    envMapIntensity: 0.65,
  });
  m.tread = new THREE.MeshStandardMaterial({
    map: rubber.map,
    normalMap: tread.normal,
    roughnessMap: tread.rough,
    aoMap: tread.ao,
    normalScale: new THREE.Vector2(1.6, 1.6),
    color: 0x4a4b4c,
    metalness: 0.0,
    roughness: 0.95,
    envMapIntensity: 0.5,
  });
  // Textured black cladding. Faded by the sun on the flats, so it never reads
  // as the same substance as the painted panel next to it.
  m.trim = new THREE.MeshStandardMaterial({
    map: trim.map,
    normalMap: trim.normal,
    roughnessMap: trim.rough,
    normalScale: new THREE.Vector2(0.85, 0.85),
    metalness: 0.02,
    roughness: 0.78,
    envMapIntensity: 0.85,
  });
  applyDirt(m.trim, { amount: 0.9, tag: 'trim', color: 0x8f7a5c });
  m.trimGloss = new THREE.MeshStandardMaterial({
    color: 0x2a2d30,
    metalness: 0.06,
    roughness: 0.24,
    normalMap: trim.normal,
    normalScale: new THREE.Vector2(0.2, 0.2),
    envMapIntensity: 1.25,
  });
  applyDirt(m.trimGloss, { amount: 0.5, tag: 'trimGloss', color: 0x8a7859 });
  m.bedLiner = new THREE.MeshStandardMaterial({
    map: liner.map,
    normalMap: liner.normal,
    roughnessMap: liner.rough,
    normalScale: new THREE.Vector2(1.1, 1.1),
    metalness: 0.02,
    roughness: 0.88,
    envMapIntensity: 0.8,
  });
  applyDirt(m.bedLiner, { amount: 1.0, tag: 'liner', color: 0x8a7454, arch: 0 });
  // Shut lines, recesses and anything that should read as a shadow gap.
  m.gap = new THREE.MeshStandardMaterial({
    color: 0x0c0d0e,
    metalness: 0.0,
    roughness: 0.95,
    envMapIntensity: 0.12,
  });

  // --- glass ---------------------------------------------------------------
  // Tinted, dirty, and genuinely see-through. The dust film is carried on the
  // emissive channel so it *adds* haze instead of multiplying the tint down.
  m.glass = new THREE.MeshPhysicalMaterial({
    color: 0x33474f,
    metalness: 0.0,
    roughness: 0.07,
    roughnessMap: glassRoughness(),
    emissive: 0xffffff,
    emissiveMap: glassFilmMap(),
    emissiveIntensity: 0.42,
    // Enough tint to read as glass, but the pane has to stay see-through: at a
    // higher env intensity it just mirrors the forest and goes opaque black.
    opacity: 0.28,
    transparent: true,
    envMapIntensity: 2.5,
    clearcoat: 1.0,
    clearcoatRoughness: 0.03,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  m.glassDark = new THREE.MeshPhysicalMaterial({
    color: 0x223037,
    metalness: 0.0,
    roughness: 0.12,
    emissive: 0xffffff,
    emissiveMap: glassFilmMap(),
    emissiveIntensity: 0.32,
    opacity: 0.4,
    transparent: true,
    envMapIntensity: 2.4,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  // --- lights --------------------------------------------------------------
  // Reflector bowls are concave, so they are read from the inside: double-sided
  // keeps them from vanishing into their own back faces. A polished mirror in
  // there just samples the environment sideways and comes back as coloured
  // garbage, so this is vapour-deposited satin: bright, but it holds its own
  // shading instead of reflecting the forest.
  m.reflector = new THREE.MeshStandardMaterial({
    color: 0xeef3f6,
    // The bowl sits in the truck's own shadow from this sun angle, so most of
    // what reads has to come from the diffuse term: a near-mirror would have
    // nothing but a dark reflection of the bumper to show.
    metalness: 0.25,
    roughness: 0.36,
    normalMap: reflectorNormal(),
    normalScale: new THREE.Vector2(0.5, 0.5),
    envMapIntensity: 0.9,
    side: THREE.DoubleSide,
  });
  m.lensClear = new THREE.MeshPhysicalMaterial({
    color: 0xc3d4de,
    metalness: 0,
    roughness: 0.04,
    normalMap: lensNormal(),
    normalScale: new THREE.Vector2(0.35, 0.35),
    transparent: true,
    opacity: 0.1,
    envMapIntensity: 2.8,
    clearcoat: 1,
    clearcoatRoughness: 0.02,
    depthWrite: false,
  });
  // Cover glass over a whole lamp unit: nearly clear, so the reflector and the
  // projector behind it are what you actually see. A prism map at this size
  // tiles into a visible waffle across the aperture, so the flutes are fine and
  // run one way only.
  m.lensRibbed = new THREE.MeshPhysicalMaterial({
    color: 0xbdcdd6,
    metalness: 0,
    roughness: 0.07,
    normalMap: lensNormal(),
    normalScale: new THREE.Vector2(0.3, 0.3),
    transparent: true,
    opacity: 0.13,
    envMapIntensity: 2.0,
    clearcoat: 1,
    clearcoatRoughness: 0.03,
    depthWrite: false,
  });
  // Lamp lenses in daylight are lit by the sky, not by the bulb behind them.
  // index.js re-asserts emissiveIntensity (1.6 / 1.1 / 1.6 with the lights off),
  // so the daytime level has to be set by darkening the emissive colour instead
  // — otherwise every lens paints as a flat neon rectangle stuck on the body.
  m.headlight = new THREE.MeshStandardMaterial({
    color: 0xfff6e2,
    emissive: 0x6f6653,
    emissiveIntensity: 1.4,
    roughness: 0.2,
    metalness: 0,
    envMapIntensity: 1.2,
  });
  m.taillight = new THREE.MeshStandardMaterial({
    color: 0x8e150a,
    emissive: 0x5c0b05,
    emissiveIntensity: 1.5,
    normalMap: prismNormal(),
    normalScale: new THREE.Vector2(1.3, 1.3),
    roughness: 0.13,
    metalness: 0.08,
    envMapIntensity: 1.9,
  });
  m.amber = new THREE.MeshStandardMaterial({
    color: 0xcf6b06,
    emissive: 0x5e330a,
    emissiveIntensity: 0.22,
    normalMap: prismNormal(),
    normalScale: new THREE.Vector2(1.2, 1.2),
    roughness: 0.13,
    metalness: 0.08,
    envMapIntensity: 1.8,
  });
  m.reflectorRed = new THREE.MeshStandardMaterial({
    color: 0x7a1509,
    metalness: 0.1,
    roughness: 0.18,
    normalMap: prismNormal(),
    normalScale: new THREE.Vector2(1.2, 1.2),
    envMapIntensity: 1.6,
  });

  // --- decals --------------------------------------------------------------
  const decal = (kind, tint = 0xffffff) =>
    new THREE.MeshStandardMaterial({
      map: decalMap(kind),
      color: tint,
      transparent: false,
      alphaTest: 0.5,
      metalness: 0.0,
      roughness: 0.42,
      envMapIntensity: 0.8,
      side: THREE.DoubleSide,
    });
  m.decalName = decal('name');
  m.decalBadge = decal('badge');
  m.decalNumber = decal('number');
  applyDirt(m.decalName, { amount: 0.5, tag: 'decalName', color: 0x8f7a5c });
  applyDirt(m.decalNumber, { amount: 0.5, tag: 'decalNumber', color: 0x8f7a5c });

  // --- soft trim -----------------------------------------------------------
  m.fabric = new THREE.MeshStandardMaterial({
    map: fabric.map,
    normalMap: fabric.normal,
    roughnessMap: fabric.rough,
    normalScale: new THREE.Vector2(0.8, 0.8),
    color: 0xb6ada0,
    metalness: 0,
    roughness: 0.95,
    envMapIntensity: 0.8,
  });
  // Lifted well above a realistic cabin value on purpose: the greenhouse only
  // reads as glass if there is something behind the pane bright enough to see,
  // and everything in there is shadowed by the roof.
  m.interiorPlastic = new THREE.MeshStandardMaterial({
    color: 0x585d62,
    metalness: 0.05,
    roughness: 0.6,
    normalMap: trim.normal,
    normalScale: new THREE.Vector2(0.4, 0.4),
    envMapIntensity: 1.0,
  });
  m.mesh = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: meshAlpha('hex'),
    transparent: false,
    alphaTest: 0.5,
    metalness: 0.72,
    roughness: 0.55,
    side: THREE.DoubleSide,
    envMapIntensity: 1.15,
  });
  m.canvasTop = new THREE.MeshStandardMaterial({
    color: 0x54564d,
    metalness: 0,
    roughness: 0.88,
    normalMap: fabric.normal,
    normalScale: new THREE.Vector2(1.2, 1.2),
    envMapIntensity: 0.6,
  });

  if (env) for (const mat of Object.values(m)) if ('envMap' in mat) mat.envMap = env;
  cachedMats = m;
  return m;
}

export function setVehicleEnv(env) {
  if (!cachedMats) return;
  for (const mat of Object.values(cachedMats)) {
    if ('envMap' in mat) {
      mat.envMap = env;
      mat.needsUpdate = true;
    }
  }
}
