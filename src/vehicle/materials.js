import * as THREE from 'three';
import { PALETTE } from '../palette.js';
import {
  applyBrightwork,
  applyDirt,
  bedLinerMaps,
  brushedMaps,
  cabinAtlas,
  decalMap,
  diamondPlateMaps,
  fabricMaps,
  floorMatMaps,
  glassFilmMap,
  glassRoughness,
  glassTintMap,
  headlinerMaps,
  lensNormal,
  louvreCutout,
  makePaintMaterial,
  meshAlpha,
  prismNormal,
  reflectorMaps,
  rubberMaps,
  stitchMaps,
  treadMaps,
  trimMaps,
  vinylMaps,
  wheelRimMaps,
  wheelWornMaps,
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
  const reflect = reflectorMaps();
  const vinyl = vinylMaps('dark');
  const vinylFaded = vinylMaps('faded');
  const atlas = cabinAtlas();

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
  // Chrome is a dark mirror. Its own colour barely matters — what you read is
  // whatever it reflects, and over a PMREM of clear sky that is one flat bright
  // value, which is exactly how brightwork ends up looking like chalky white
  // plastic. So the real IBL is turned most of the way down and `applyBrightwork`
  // supplies a graded reflection instead: dark ground, hot tree line, cool sky.
  // Chrome's F0 is also nearer 0.6 than the 0.9 a "silver" hex suggests.
  m.chrome = new THREE.MeshStandardMaterial({
    color: 0x8b9196,
    metalness: 1.0,
    // the brushed map lands this near 0.1, so the polish varies in streaks and
    // the skyline breaks up along them instead of being one even wash
    roughness: 0.26,
    roughnessMap: brushed.rough,
    normalMap: metal.normal,
    normalScale: new THREE.Vector2(0.07, 0.07),
    envMapIntensity: 0.45,
  });
  applyDirt(m.chrome, { amount: 0.42, tag: 'chrome', color: 0x9a8c74 });
  applyBrightwork(m.chrome, { tag: 'chrome', strength: 1.0, band: 0.5, trees: 0.95, line: 0.46 });
  m.alu = new THREE.MeshStandardMaterial({
    color: 0x777c80,
    metalness: 0.88,
    // Satin, not polished. A narrow strip of low-roughness metal against a dark
    // panel mirrors the sky and reads as a neon pinstripe rather than a chamfer.
    roughness: 0.44,
    normalMap: brushed.normal,
    roughnessMap: brushed.rough,
    normalScale: new THREE.Vector2(0.5, 0.5),
    // A flat satin face over a sky-only PMREM is the same trap chrome fell into:
    // the badge plate in the middle of the grille was the brightest thing on the
    // nose. Most of the reflection is graded analytically instead — the IBL is
    // down to a fill, because at 0.85 the plate still came out near-white.
    envMapIntensity: 0.4,
  });
  applyBrightwork(m.alu, { tag: 'alu', strength: 0.78, band: 0.5, trees: 0.7, line: 0.46 });
  m.plate = new THREE.MeshStandardMaterial({
    map: plate.map,
    color: 0x6f747a,
    metalness: 0.88,
    roughness: 0.46,
    normalMap: plate.normal,
    roughnessMap: plate.rough,
    normalScale: new THREE.Vector2(1.0, 1.0),
    envMapIntensity: 0.7,
  });
  applyDirt(m.plate, { amount: 0.95, tag: 'plate', color: 0x7d6a4e });
  // Tread plate is a metre of near-flat metal across the bumper apron and the bed
  // floor, which the sky-only IBL was handing one pale value: it needs the graded
  // wall like the rest of the brightwork, and the raised bars pick the streak up
  // where the troughs between them do not.
  applyBrightwork(m.plate, { tag: 'plate', strength: 0.6, band: 0.32, trees: 0.55, line: 0.46 });
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
  // Moulded gloss plastic: grille fins, handles, bezels. At envMapIntensity 1.25
  // a dielectric this smooth takes an even white sheen off the sky over its whole
  // area, which is most of why the nose read as white plastic. Now the sheen is a
  // Fresnel-weighted graded reflection, so it brightens at the edges and stays
  // dark across the face.
  m.trimGloss = new THREE.MeshStandardMaterial({
    color: 0x24272a,
    metalness: 0.06,
    roughness: 0.3,
    normalMap: trim.normal,
    normalScale: new THREE.Vector2(0.22, 0.22),
    envMapIntensity: 0.5,
  });
  applyDirt(m.trimGloss, { amount: 0.5, tag: 'trimGloss', color: 0x8a7859 });
  applyBrightwork(m.trimGloss, { tag: 'trimGloss', strength: 0.8, band: 0.3, trees: 0.55, fresnel: 0.35 });
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
  // emissive channel so it *adds* haze instead of multiplying the tint down; the
  // tint gradient on `map` gives the pane a shade band and a grimy perimeter so
  // it is not one flat value. The reflection is Fresnel-weighted analytic sky,
  // which means the pane mirrors hard at grazing angles — the read from outside
  // — and stays clear looking straight through it from the driver's seat.
  m.glass = new THREE.MeshPhysicalMaterial({
    color: 0x33474f,
    map: glassTintMap(),
    metalness: 0.0,
    roughness: 0.07,
    roughnessMap: glassRoughness(),
    emissive: 0xffffff,
    emissiveMap: glassFilmMap(),
    // the dust film is what makes the pane read as a pane from the driver's seat
    // rather than an open aperture — the bonnet has to sit behind something
    emissiveIntensity: 0.55,
    // Enough tint to read as glass, but the pane has to stay see-through: at a
    // higher env intensity it just mirrors the forest and goes opaque black.
    opacity: 0.28,
    transparent: true,
    // The BRDF's own Fresnel takes this to a full sky mirror at grazing angles,
    // which from the driver's seat is a pale wedge across the bottom of the
    // screen. Kept as a glare, with the graded reflection doing the rest.
    envMapIntensity: 1.25,
    clearcoat: 1.0,
    clearcoatRoughness: 0.03,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  // `pane` is the important flag: it adds the graded reflection again after the
  // lighting and lifts the alpha with it, because a 0.28-opacity blend and the
  // BRDF's own 4 per cent Fresnel between them were scaling the windscreen's
  // reflection down by about a hundred. With it the screen mirrors the tree line
  // at the angles `detail` and `hero` see it at, and stays see-through from the
  // driver's seat.
  applyBrightwork(m.glass, {
    tag: 'glass',
    strength: 1.25,
    band: 0.55,
    // the pane is what most obviously ought to be mirroring the forest, so it
    // gets the strongest tree break-up of anything on the truck
    trees: 1.15,
    line: 0.42,
    pane: 1.35,
    clearcoat: true,
    ground: 0x141712,
    wall: 0x1c2117,
    rim: 0xfff0d2,
    sky: 0x9dbcdb,
  });
  m.glassDark = new THREE.MeshPhysicalMaterial({
    color: 0x223037,
    map: glassTintMap(),
    metalness: 0.0,
    roughness: 0.12,
    emissive: 0xffffff,
    emissiveMap: glassFilmMap(),
    emissiveIntensity: 0.32,
    opacity: 0.4,
    transparent: true,
    envMapIntensity: 1.5,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  applyBrightwork(m.glassDark, {
    tag: 'glassDark',
    strength: 1.1,
    band: 0.45,
    trees: 1.0,
    line: 0.42,
    pane: 1.1,
    clearcoat: true,
    ground: 0x141712,
    wall: 0x1b2016,
    rim: 0xfbecce,
    sky: 0x8fb2d4,
  });

  // --- lights --------------------------------------------------------------
  // Reflector bowls are concave, so they are read from the inside: double-sided
  // keeps them from vanishing into their own back faces. A polished mirror in
  // there just samples the environment sideways and comes back as coloured
  // garbage, so this is vapour-deposited satin: bright, but it holds its own
  // shading instead of reflecting the forest.
  m.reflector = new THREE.MeshStandardMaterial({
    map: reflect.map,
    // Aluminised, so it is read as a metal — but the real IBL is turned down and
    // the graded analytic reflection does the modelling. That is what puts a
    // light and a dark side on each stamped step; at metalness 0.25 over a flat
    // sky it was a white disc with a texture on it.
    color: 0x939a9f,
    normalMap: reflect.normal,
    roughnessMap: reflect.rough,
    normalScale: new THREE.Vector2(1.3, 1.3),
    metalness: 0.95,
    roughness: 1.0,
    envMapIntensity: 0.34,
    side: THREE.DoubleSide,
  });
  // A dish is concave, so its normals sweep through the whole hemisphere: with a
  // low skyline the upper half of the bowl mirrors dark ground and the lower half
  // mirrors sky, which is what reads as a stamped cone. The old near-white
  // horizon at strength 1.5 buried that gradient and left a white disc.
  applyBrightwork(m.reflector, {
    tag: 'refl',
    strength: 0.62,
    // The dish is what a bright rim streak is *for*: the bowl sweeps its normal
    // through the whole hemisphere, so a narrow hot band at the skyline lands as
    // one bright arc across the stamping and leaves the rest of the cone dark.
    band: 0.75,
    trees: 0.35,
    line: 0.46,
    ground: 0x120e09,
    wall: 0x1f1e16,
    rim: 0xffe8c4,
    sky: 0x93b0cc,
  });
  m.lensClear = new THREE.MeshPhysicalMaterial({
    color: 0xc3d4de,
    metalness: 0,
    roughness: 0.04,
    normalMap: lensNormal(),
    normalScale: new THREE.Vector2(0.35, 0.35),
    transparent: true,
    opacity: 0.1,
    // At 2.8 the dome took an even white sheen off the sky across its whole
    // aperture and the reflector behind it stopped reading at all.
    envMapIntensity: 1.4,
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
    envMapIntensity: 1.15,
    clearcoat: 1,
    clearcoatRoughness: 0.03,
    depthWrite: false,
  });
  // Lamp lenses in daylight are lit by the sky, not by the bulb behind them.
  // index.js re-asserts emissiveIntensity (1.6 / 1.1 / 1.6 with the lights off),
  // so the daytime level has to be set by darkening the emissive colour instead
  // — otherwise every lens paints as a flat neon rectangle stuck on the body.
  m.headlight = new THREE.MeshStandardMaterial({
    color: 0xf0e7d4,
    emissive: 0x6f6653,
    emissiveIntensity: 1.4,
    roughness: 0.2,
    metalness: 0,
    // it is a bulb envelope a few centimetres across, sat inside a bowl: at 1.2
    // it out-shone the reflector it is supposed to be sitting in
    envMapIntensity: 0.55,
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

  // --- cabin ---------------------------------------------------------------
  // The whole interior has to sit *below* the exterior in value or the
  // windscreen stops reading as daylight. Two things were pushing it up: an
  // albedo picked to be visible through the glass from outside, and a full
  // envMapIntensity, which fills unlit cabin plastic with blue sky and lands it
  // on pale lavender. Instead the value range comes from the surface's
  // orientation — the horizontal pads are sun-faded and light, the vertical
  // faces are dark warm grey-brown — which is also what happens in a real cab.
  m.fabric = new THREE.MeshStandardMaterial({
    map: fabric.map,
    normalMap: fabric.normal,
    roughnessMap: fabric.rough,
    normalScale: new THREE.Vector2(1.0, 1.0),
    color: 0x8a8378,
    metalness: 0,
    roughness: 1.0,
    envMapIntensity: 0.95,
  });
  applyDirt(m.fabric, { amount: 0.5, tag: 'seat', color: 0x6f6047, arch: 0 });
  // Cabin envMapIntensity is doing the job a bounce light would: a closed cab
  // gets almost nothing from the sun directly, so the sky through the glass is
  // effectively the only source, and at 0.32 the whole interior went to
  // silhouette against it. The albedo is dark enough that the cabin still sits
  // well under the exterior in value.
  m.interiorPlastic = new THREE.MeshStandardMaterial({
    map: vinyl.map,
    normalMap: vinyl.normal,
    roughnessMap: vinyl.rough,
    normalScale: new THREE.Vector2(0.9, 0.9),
    metalness: 0.0,
    roughness: 1.0,
    envMapIntensity: 0.92,
  });
  applyDirt(m.interiorPlastic, { amount: 0.55, tag: 'cabin', color: 0x6b5c46, arch: 0 });
  // Top surfaces. These are the ones under the screen that the sun bakes, so
  // they are chalkier and a stop or two lighter — and they are what you see of
  // the cabin from outside, which is what keeps the greenhouse from going black.
  m.interiorFaded = new THREE.MeshStandardMaterial({
    map: vinylFaded.map,
    normalMap: vinylFaded.normal,
    roughnessMap: vinylFaded.rough,
    normalScale: new THREE.Vector2(0.75, 0.75),
    metalness: 0.0,
    roughness: 1.0,
    envMapIntensity: 1.1,
  });
  applyDirt(m.interiorFaded, { amount: 1.15, tag: 'cabinTop', color: 0x7d6c50, arch: 0 });
  // Stitched welt strips down the pad edges and the seat panel seams.
  const stitch = stitchMaps();
  m.stitch = new THREE.MeshStandardMaterial({
    map: stitch.map,
    normalMap: stitch.normal,
    roughnessMap: stitch.rough,
    normalScale: new THREE.Vector2(1.1, 1.1),
    metalness: 0,
    roughness: 1.0,
    envMapIntensity: 0.85,
  });
  // Every drawn interior face — gauges, radio, heater, switch bank, speaker,
  // mirror glass, sill plate — off one atlas, so it is one draw call. The grain
  // normal tiles independently of the atlas UVs.
  m.cabinPanel = new THREE.MeshStandardMaterial({
    map: atlas.map,
    roughnessMap: atlas.rough,
    emissive: 0xffffff,
    emissiveMap: atlas.emissive,
    // The dial faces are 40 mm high on screen and sat in a hooded recess that
    // takes no sky at all, so the instrument backlight is what makes them
    // legible rather than a nicety. Only the markings, needles and tell-tales
    // carry any emissive, so this does not wash the carrier plate out.
    emissiveIntensity: 2.6,
    normalMap: vinyl.normal,
    normalScale: new THREE.Vector2(0.2, 0.2),
    metalness: 0.25,
    roughness: 1.0,
    envMapIntensity: 1.3,
  });
  // Cover glass over the cluster and the radio: near-clear, but with a graded
  // reflection so it reads as a pane in front of the dials.
  m.cabinGlass = new THREE.MeshPhysicalMaterial({
    color: 0x121618,
    metalness: 0,
    roughness: 0.055,
    transparent: true,
    opacity: 0.14,
    envMapIntensity: 0.7,
    clearcoat: 1,
    clearcoatRoughness: 0.03,
    depthWrite: false,
  });
  // Inside a cab the only thing worth mirroring is the bright screen aperture,
  // so the "sky" here is the daylight coming back off the glass and the skyline
  // sits high — a cover glass catches it as one soft streak near its top edge.
  applyBrightwork(m.cabinGlass, {
    tag: 'cabinGlass',
    strength: 0.9,
    band: 0.4,
    trees: 0.35,
    line: 0.6,
    fresnel: 0.5,
    pane: 0.8,
    clearcoat: true,
    ground: 0x0a0908,
    wall: 0x15130f,
    rim: 0xd8cdb4,
    sky: 0x7d99b4,
  });
  // Vent slats: an alpha cutout over a dark trough, which buys real depth for
  // two triangles. `map` + `alphaTest`, never `alphaMap`.
  m.louvre = new THREE.MeshStandardMaterial({
    map: louvreCutout(),
    transparent: false,
    alphaTest: 0.35,
    metalness: 0.1,
    roughness: 0.52,
    side: THREE.DoubleSide,
    envMapIntensity: 0.8,
  });
  const rim = wheelRimMaps();
  m.wheelRim = new THREE.MeshStandardMaterial({
    map: rim.map,
    normalMap: rim.normal,
    roughnessMap: rim.rough,
    normalScale: new THREE.Vector2(0.9, 0.9),
    metalness: 0.02,
    roughness: 1.0,
    envMapIntensity: 0.85,
  });
  // Where hands sit: grain polished off, darkened with skin oil, and glossy. The
  // hard boundary against the moulded rim is the point of it being separate.
  const rimWorn = wheelWornMaps();
  m.wheelWorn = new THREE.MeshStandardMaterial({
    map: rimWorn.map,
    normalMap: rimWorn.normal,
    roughnessMap: rimWorn.rough,
    normalScale: new THREE.Vector2(0.4, 0.4),
    metalness: 0.06,
    roughness: 1.0,
    envMapIntensity: 1.15,
  });
  // The rim is 400 mm from the lens, dead centre of the bottom of the interior
  // frame and lit by nothing: what separates polished leather from moulded
  // plastic there is a sheen running along the crown of the tube, so the graded
  // reflection carries most of the read.
  applyBrightwork(m.wheelWorn, {
    tag: 'rimWorn',
    strength: 1.25,
    band: 0.6,
    trees: 0.3,
    line: 0.5,
    fresnel: 0.3,
    ground: 0x151312,
    wall: 0x201d18,
    rim: 0xd8ccae,
    // desaturated on purpose: a blue sheen over a warm brown rim came out mauve
    sky: 0x78858a,
  });
  applyBrightwork(m.wheelRim, {
    tag: 'rimMould',
    strength: 0.5,
    band: 0.22,
    trees: 0.2,
    line: 0.5,
    fresnel: 0.45,
    ground: 0x141211,
    wall: 0x1c1a16,
    rim: 0xbdb29b,
    sky: 0x7c94a2,
  });
  const mat = floorMatMaps();
  m.floorMat = new THREE.MeshStandardMaterial({
    map: mat.map,
    normalMap: mat.normal,
    roughnessMap: mat.rough,
    normalScale: new THREE.Vector2(1.3, 1.3),
    metalness: 0,
    roughness: 1.0,
    envMapIntensity: 0.55,
  });
  applyDirt(m.floorMat, { amount: 1.5, tag: 'floor', color: 0x6a563c, arch: 0 });
  const liner2 = headlinerMaps();
  m.headliner = new THREE.MeshStandardMaterial({
    map: liner2.map,
    normalMap: liner2.normal,
    roughnessMap: liner2.rough,
    normalScale: new THREE.Vector2(0.7, 0.7),
    metalness: 0,
    roughness: 1.0,
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
