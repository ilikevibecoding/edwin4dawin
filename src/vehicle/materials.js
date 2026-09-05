import * as THREE from 'three';
import { PALETTE } from '../palette.js';
import { SPEC as S } from './spec.js';
import {
  applyBrightwork,
  applyCabinBounce,
  applyDirt,
  applyGlassFilm,
  applyLampGlow,
  applyMirrorHorizon,
  bedLinerMaps,
  brushedMaps,
  cabinAtlas,
  decalMap,
  diamondPlateMaps,
  fabricMaps,
  floorMatMaps,
  glassRoughness,
  glassTintMap,
  headlinerMaps,
  lensNormal,
  louvreCutout,
  makePaintMaterial,
  meshAlpha,
  prismNormal,
  reflectedSky,
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

/**
 * What the truck is dirty with. Laterite: iron-rich, so red rather than brown,
 * from `PALETTE.earth` and its neighbours rather than guessed, so the film on
 * the panels is the same soil as the ground the truck is standing on. Dried
 * onto a panel it goes paler and pinker (the murram tone); packed in the arches
 * it stays close to the wet earth. Every exterior `applyDirt` call spreads
 * this, so the truck is one soil rather than twenty browns.
 */
export const LATERITE = {
  color: 0xa26a44, // dried mud
  dust: PALETTE.murram, // thin settled film
  wet: PALETTE.earthDark, // fresh spatter and cake
  chroma: 0.55,
  // Laterite fines are pale for a soil, so a film of them on black plastic is
  // allowed a little more lift over the substrate than the old grey mud was.
  lift: 3.2,
};

export function vehicleMaterials(env = null) {
  if (cachedMats) {
    if (env) for (const m of Object.values(cachedMats)) if ('envMap' in m) m.envMap = env;
    return cachedMats;
  }

  const metal = wornMetalMaps(3);
  const metal2 = wornMetalMaps(8);
  const brushed = brushedMaps();
  const trim = trimMaps();
  const trimSatin = trimMaps('satin');
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
  // thrown mud: no arch spray, more of the up-facing deposit. They are also the
  // one place a panel reflects the sky over its whole area rather than in a
  // band, so the coat is a shade rougher — a mirror-flat metre of lacquer
  // pointing straight up is the classic way to blow a highlight out.
  m.paintRoof = makePaintMaterial(PALETTE.bodyPaint, {
    clearcoatRoughness: 0.18,
    dirt: 1.2,
    dirtArch: 0,
    dirtTag: 'roof',
    // Was strength 1.7 / flat 0.9, which turned out to be the whole of the
    // flat-teal read on the bed and canopy panels. Measured per-material in the
    // rear view they came back at 0.12 luma, 0.47 saturation, r:b 0.60 and a
    // 10-90 luma spread of 0.087 — against 0.23-0.49 of spread on every other
    // painted panel in the shot. So they were not merely dark, they were the one
    // painted surface holding a single value, and at that value the only light
    // reaching them is blue skylight, which on green reads teal.
    //
    // Both numbers were set defensively: a mirror-flat metre of lacquer pointing
    // at the sky is the classic way to blow a highlight, so the grade was turned
    // down and the flat gate turned nearly all the way up. Between them they
    // removed the reflection entirely and left the panel with nothing of its own
    // to show. Swept together: at flat 0.5 the same panels go to 0.31
    // saturation, r:b 0.86 and 0.153 of spread — a gradient appears and the blue
    // cast halves — while the frame's hot fraction stays at 0.009%. The blowout
    // this was guarding against is now handled properly by the screen-space
    // curvature gate rather than by refusing to reflect anything.
    // strength tracks the basecoat's — see the sweep table in makePaintMaterial.
    // These panels gain the most from it: 0.331 saturation to 0.374.
    bw: { strength: 1.8, band: 0.5, flat: 0.5, ambient: 1.6 },
  });
  // Basecoat roughness on every paint key is the map's now (see
  // makePaintMaterial); the coats are one lacquer at 0.15, the roof a shade
  // rougher because a flat metre pointing at the sky is where a coat blows.
  m.paintDark = makePaintMaterial(PALETTE.bodyPaintDark, {
    dirtTag: 'dark',
  });
  m.paintAccent = makePaintMaterial(PALETTE.accent, {
    clearcoat: 0.78,
    dirtTag: 'accent',
    bw: { strength: 1.5, band: 0.55 },
  });

  // --- metal family --------------------------------------------------------
  // Steel is the *dark, rough* metal on this truck and aluminium is the bright
  // one; that difference is the whole reason both exist. Neither is fully
  // metallic, because a metal has no diffuse term and every steel part here —
  // bumper, skid plate, slider, rack — lives in the body's own shadow, where a
  // pure metal goes to silhouette. Half a stop of diffuse is what keeps them
  // readable, and it is also what stops them reading as chrome.
  m.steel = new THREE.MeshStandardMaterial({
    map: metal.map,
    normalMap: metal.normal,
    roughnessMap: metal.rough,
    metalnessMap: metal.metalness,
    normalScale: new THREE.Vector2(0.8, 0.8),
    // A metal has no diffuse, and the entire front of this truck stands in its
    // own shadow where there is no reflection to have instead — the bumper
    // measured 0.148 luma against a 0.098 grille, which is not a material
    // difference anyone can see. Blasted steel is a poor mirror anyway, so it
    // keeps a real dielectric fraction.
    metalness: 0.6,
    roughness: 1.0,
    // Was 1.3, which on the material chart put a blasted-steel ball at 0.61
    // luma — the same value as the bare aluminium next to it, and brighter than
    // the paint. The environment here is a PMREM of open sky and a metal has no
    // diffuse to anchor it, so env intensity *is* the value control. Steel is
    // the dark rough metal; it gets a third of what it had, and the graded
    // reflection below puts the variation back so it does not go flat.
    envMapIntensity: 0.5,
  });
  applyDirt(m.steel, { ...LATERITE, amount: 0.85, tag: 'steel', film: 0.8, grain: 0.14 });
  applyBrightwork(m.steel, {
    tag: 'steel',
    strength: 0.5,
    band: 0.22,
    trees: 0.55,
    line: 0.3,
    flat: 0.85,
    // 0.6 metalness leaves 40% of a dielectric to catch this; a fully metallic
    // material would ignore it, which is the correct split.
    ambient: 0.7,
  });
  // Powder-coated steel: bumper, winch frame, brush bar, sliders, chassis. This
  // is the most-used key in the whole truck — fifty-odd meshes, and effectively
  // the entire nose — and at metalness 0.8 with no graded reflection it was the
  // single largest failure in the frame. A crush mask of the `detail` view came
  // back with the bumper, the winch and every tube of the brush bar solid red:
  // a metal has no diffuse term, the front of the truck stands in its own
  // shadow, and the sky-only PMREM it had left to reflect was pointing the
  // wrong way. The nose was a black silhouette with a grille drawn on it.
  //
  // The fix is to model what these parts actually are. Powder coat is a thick
  // dielectric *paint* over steel, not bare metal, so most of the response is
  // diffuse and the coating carries a real albedo. That also makes them cheap
  // to read: nearly every one is a tube, and a tube sweeps its normal through a
  // half-circle, so a graded reflection paints a dark-to-light wrap across it
  // and the round section is legible without a single extra triangle.
  m.steelDark = new THREE.MeshStandardMaterial({
    map: metal2.map,
    normalMap: metal2.normal,
    roughnessMap: metal2.rough,
    // Lifted again after a magenta-tint sweep settled an argument this material
    // had been losing by proxy. The grille louvres read 0.114 luma and two
    // rounds of lifting the *plastic* albedo moved them by 0.001, because the
    // louvres are not plastic — tinting `trim` pure white changed nothing in
    // that region and tinting `steelDark` magenta doubled it. The grille frame,
    // the louvres, the bumper, the brush bar and the side rails are all this
    // one key, so it is the only place a nose that dark can be fixed from.
    color: 0x5c6268,
    normalScale: new THREE.Vector2(0.9, 0.9),
    metalness: 0.35,
    roughness: 0.72,
    envMapIntensity: 0.5,
  });
  applyDirt(m.steelDark, { ...LATERITE, amount: 0.95, tag: 'steelDark', film: 1.5, lift: 3.8, grain: 0.18, cabin: true });
  // `flat` is high because the same key also covers the bumper's face and the
  // rack's flat stock, and those are what a skyline streak blows out on; the
  // tubes keep the streak through the curvature gate. The ambient term is what
  // actually takes the nose off the floor — the specular lobe here is worth a
  // few per cent and cannot.
  applyBrightwork(m.steelDark, {
    tag: 'steelDark',
    strength: 0.6,
    band: 0.26,
    trees: 0.6,
    line: 0.3,
    fresnel: 0.25,
    flat: 0.85,
    // Desaturated, and warmer than the default 0x9cbbd8. Nothing at bumper
    // height in a conifer stand can see open blue sky — what reaches it is
    // canopy-filtered grey and bounce off a pale dirt two-track. With the real
    // sky colour the skid plate measured r:b 0.62 and the whole nose read as
    // dark denim, which is the note that has come back on this material twice.
    sky: 0x9aa29c,
    ground: 0x342a1f,
    // Swept on the detail view: taking the whole dielectric family from 0 to
    // roughly here cut the frame's crushed pixels from 5.1% to 2.3% and put
    // visible round-section shading back on the brush bar, without moving the
    // frame mean more than 0.016 or touching the highlight end at all. Pushed
    // past the swept range because the grille is a deep recess and this term
    // lands before the AO, so the very pocket that needs it discounts it most.
    ambient: 2.1,
  });
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
    // 0.45 to 0.8, with the graded strength down to 0.7 (round 4): the same
    // trade as the paint — the real environment's skyline over the analytic
    // bands, so a bezel mirrors the acacia line rather than a rule.
    envMapIntensity: 0.8,
  });
  applyDirt(m.chrome, { ...LATERITE, amount: 0.5, tag: 'chrome', film: 0.7 });
  // Chrome is small curved hardware — bezels, a handle strip — so it is the one
  // brightwork that should keep its hot skyline streak at full strength, and the
  // curvature gate hands it over for free.
  applyBrightwork(m.chrome, { tag: 'chrome', strength: 0.7, band: 0.55, trees: 0.95, line: 0.3, flat: 0.6 });
  // The door mirror's own pane. Chrome was standing in for it, and at roughness
  // 0.26 the lobe smears the graded skyline into an even wash — which is fine on
  // a bezel and is exactly wrong on the one surface whose whole job is to return
  // a legible reflection. `flat: 0` is the other half of it: every other
  // brightwork surface here is small and curved and wants its skyline band
  // gated by curvature, and a mirror is the one that should keep the band on a
  // flat face. No dirt film either — chrome's would put the housing's grime on
  // the glass.
  //
  // Under the savanna sky the face reads from outboard-aft, where the reflected
  // ray runs out over the plain: pale murram below a thin bush band and a lot
  // of sky. The forest grade returned one khaki value across the whole glass
  // — a painted plate, not a mirror — so this one carries the real PMREM at
  // near full strength for the sky half and grades the ground half itself.
  //
  // A mirror, not brightwork. The brushed roughness map and the steel normal
  // map it inherited from `chrome` smeared the reflection into a soft blur, and
  // the analytic skyline on top of that was a second, mismatched horizon: the
  // face read as an orange-beige gradient. It is a flat metal at roughness 0.02
  // on the scene PMREM at full strength — sky and acacia line above the horizon
  // are the real environment — and `applyMirrorHorizon` grades only what is
  // below the horizon, where the PMREM's straw plain is one tan value.
  m.mirrorGlass = new THREE.MeshStandardMaterial({
    color: 0xf4f6f7,
    metalness: 1.0,
    roughness: 0.02,
    envMapIntensity: 1.0,
  });
  // With the truck's own flank painted in by reflected ray (see the function):
  // the envelope is the hull spec, the basecoat is the paint's, the film on it
  // is the same laterite the door carries.
  applyMirrorHorizon(m.mirrorGlass, {
    tag: 'mirrorGlass',
    paint: PALETTE.bodyPaint,
    dust: LATERITE.dust,
    flank: {
      hw: S.bodyHalfWidth,
      floorY: S.floorY,
      beltY: S.beltlineY,
      roofY: S.roofY,
      hoodY: S.hoodY,
      cabRearZ: S.cabRearZ,
      cabFrontZ: S.cabFrontZ,
      bedTopY: S.bedTopY,
      bedRearZ: S.bedRearZ,
      noseZ: S.noseZ,
    },
  });
  m.alu = new THREE.MeshStandardMaterial({
    // Brighter than the steel and cooler: bare aluminium is the light metal in
    // the frame and its identity is value, not gloss. With the steel map now
    // averaging around 0x5f6062 this sits most of a stop above it and leans
    // blue where the steel leans iron, which is the pair of cues that actually
    // separates two metals with no diffuse colour between them.
    // Down a notch from 0x99a1a8. Measured per-material on the hero frame, the
    // rock sliders and step plates were the brightest surface on the vehicle at
    // 0.53-0.68 luma — brighter than sunlit paint — while sitting in the spray
    // off the front tyre, which is the same "dirtiest place is also brightest"
    // inversion the arch band had. A frozen sweep showed dirt alone cannot fix
    // it: tripling the cake buys 13% of value and costs 0.24 of r:b, i.e. it
    // trades a bright sill for an ochre one. Some of it has to come out of the
    // metal. There is room — steel measures 0.27-0.36, so the stop of separation
    // between the two greys that rubric item 2 needs survives this comfortably.
    color: 0x8a9198,
    metalness: 0.86,
    // Satin, and rougher than it was. Every alloy part on this truck is a flat
    // strip — bed rail, step pad, tailgate applique — and at the old 0.11-0.22
    // a flat strip mirrors the whole sky at once. That is the tailgate light
    // leak, and it is a roughness problem, not a brightness one.
    roughness: 1.0,
    normalMap: brushed.normal,
    roughnessMap: brushed.satin,
    normalScale: new THREE.Vector2(0.6, 0.6),
    // A flat satin face over a sky-only PMREM is the same trap chrome fell into:
    // the badge plate in the middle of the grille was the brightest thing on the
    // nose. Most of the reflection is graded analytically instead — the IBL is
    // down to a fill, because at 0.85 the plate still came out near-white.
    envMapIntensity: 0.3,
  });
  // Aluminium was the least-soiled material on the truck at 0.7, which is
  // backwards for the parts it is on. The film is not the lever — pushing it to
  // 1.8 moved the sill by 0.000 — so the extra goes into cake, which the new
  // low-ledge term now delivers to the tops of the sliders. The dry colour is
  // pulled off ochre at the same time: cake at this weight in the old 0x76643f
  // took the sill to r:b 1.45, and a rock slider wears grey road film, not clay.
  applyDirt(m.alu, { ...LATERITE, amount: 0.9, tag: 'alu', film: 0.7, cake: 1.5, grain: 0.16 });
  // Aluminium stays the bright metal, but "bright" against a 0.34 steel, not
  // against the sky: on the chart both metals sat at 0.62 and the difference
  // between them was invisible. Value is the only cue that separates two grey
  // metals at 1 m, so the gap between them is now most of a stop.
  applyBrightwork(m.alu, { tag: 'alu', strength: 0.62, band: 0.3, trees: 0.7, line: 0.3, flat: 0.9 });
  m.plate = new THREE.MeshStandardMaterial({
    map: plate.map,
    // Lifted, and metalness pulled well down. A metre of rough metal in the
    // truck's own shadow has almost no environment to reflect and no diffuse to
    // fall back on, which took the skid plate to 0.065 luma — a featureless hole
    // under the bumper in every front shot.
    // Neutral rather than blue-grey. The whole front of the truck faces away
    // from the sun, so the only thing a cold metal there has to reflect is the
    // cold half of the sky, and the skid plate came back at 0.11 luma with the
    // blue channel twice the red — a slab of dark denim under the bumper.
    color: 0xa3a29b,
    metalness: 0.5,
    // Still the largest flat metal surface on the truck, so still the roughest.
    roughness: 0.72,
    normalMap: plate.normal,
    roughnessMap: plate.rough,
    normalScale: new THREE.Vector2(1.0, 1.0),
    envMapIntensity: 0.62,
  });
  applyDirt(m.plate, { ...LATERITE, amount: 1.2, tag: 'plate', film: 1.5, lift: 3.8 });
  // Tread plate needs the graded wall like the rest of the brightwork, but the
  // raised bars are what should be picking the streak up — hence the curvature
  // gate, which leaves the flat lands between them dark.
  applyBrightwork(m.plate, {
    tag: 'plate',
    strength: 0.55,
    band: 0.3,
    trees: 0.55,
    line: 0.3,
    flat: 0.85,
    // The plate hangs under the nose and its mirror ray goes straight up, so it
    // is the part that most needs the sky told what colour it is down here.
    sky: 0x99a099,
    ground: 0x3a2f22,
    // The curvature gate is right — a 1.3 m plate must not carry a skyline
    // streak — but with the band gone and the plate facing down into its own
    // shadow there was nothing left, and it read 0.113. The gate removes the
    // highlight; this puts the ambient back that a real plate over a pale dirt
    // two-track would be bouncing.
    ambient: 1.3,
  });
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
  // Rubber is the matte near-black end of the frame. No env to speak of: a
  // dielectric at 0.65 envMapIntensity picks up enough sky to grey out, and a
  // greyed-out tyre is the fastest way to lose the substance.
  m.rubber = new THREE.MeshStandardMaterial({
    map: rubber.map,
    normalMap: rubber.normal,
    roughnessMap: rubber.rough,
    normalScale: new THREE.Vector2(1.1, 1.1),
    metalness: 0.0,
    roughness: 1.0,
    envMapIntensity: 0.3,
  });
  applyDirt(m.rubber, { ...LATERITE, amount: 1.0, tag: 'rubber', film: 0.55 });
  // Hoses, gaiters and the spare all live in the truck's own shadow; a sixth
  // of a bounce keeps them from going to silhouette there.
  applyBrightwork(m.rubber, { tag: 'rubber', strength: 0.15, band: 0.05, trees: 0.3, fresnel: 0.6, ambient: 0.5 });
  m.tread = new THREE.MeshStandardMaterial({
    map: rubber.map,
    normalMap: tread.normal,
    roughnessMap: tread.rough,
    aoMap: tread.ao,
    normalScale: new THREE.Vector2(1.6, 1.6),
    color: 0x8d8f91,
    metalness: 0.0,
    roughness: 1.0,
    envMapIntensity: 0.25,
  });
  applyDirt(m.tread, { ...LATERITE, amount: 1.25, tag: 'tread', film: 0.5, cake: 1.5 });
  // Textured black cladding. Faded by the sun on the flats, so it never reads
  // as the same substance as the painted panel next to it.
  m.trim = new THREE.MeshStandardMaterial({
    map: trim.map,
    normalMap: trim.normal,
    roughnessMap: trim.rough,
    normalScale: new THREE.Vector2(0.85, 0.85),
    metalness: 0.02,
    roughness: 0.86,
    envMapIntensity: 0.6,
  });
  // Grain down from 0.42. It was set that high when this material had no usable
  // uvs and the mottle was the only thing that could vary across a mirror shell;
  // `boxProjectUV` and `UV_SCALE.trim = 2.6` in body.js now give it 2.6 wraps a
  // metre of the real albedo, normal and roughness maps, so the object-space
  // term is back to being a supplement that breaks up tiling rather than a
  // substitute for the maps — and at 0.42 its own brightness swing was part of
  // what made the arch band read as a light-coloured object.
  applyDirt(m.trim, { ...LATERITE, amount: 1.0, tag: 'trim', grain: 0.16, cabin: true });
  // Matt black plastic is the floor of the frame, and on the material chart its
  // vertical faces measured 0.076 — a featureless hole. What a real moulding
  // does at that angle is pick up a faint, *graded* sheen from the sky it can
  // see; the Fresnel weight keeps it off the faces pointed at the camera, so it
  // lifts the shape without making the plastic look wet.
  applyBrightwork(m.trim, {
    tag: 'trim',
    strength: 0.42,
    band: 0.16,
    trees: 0.5,
    fresnel: 0.4,
    flat: 0.7,
    // This was raised to 1.7 chasing the grille louvres, which a magenta-tint
    // sweep later showed are `steelDark`, not this — so the number was set for
    // the wrong surface. It stays because it turns out to be right for the
    // surfaces it does own: a reflection at four per cent cannot reach matte
    // plastic, and this is what keeps the mirror shells and the cladding from
    // going to featureless black in shadow. It is a diffuse term landing before
    // the AO, so cavities still read.
    ambient: 1.7,
  });
  // Moulded-in-colour plastic: the arch flare lands, bumper caps, mirror shells,
  // grille fins, handles.
  //
  // This was a flat 0x24272a with no maps at 0.3 roughness, and it is the single
  // material that fills a third of the wheel view. With an albedo that dark and
  // nothing textured on it, every bit of value the surface had came from its own
  // specular — so the flare over the tyre resolved to whatever the reflection
  // happened to be and measured 0.44 luma at r:b 1.57, i.e. pale warm grey.
  // Black plastic needs a real albedo and a real roughness map, and a *satin*
  // roughness at that: 0.3 across a 130 mm flare land is a mirror.
  m.trimGloss = new THREE.MeshStandardMaterial({
    map: trimSatin.map,
    normalMap: trimSatin.normal,
    roughnessMap: trimSatin.rough,
    normalScale: new THREE.Vector2(0.7, 0.7),
    metalness: 0.03,
    roughness: 1.0,
    envMapIntensity: 0.32,
  });
  // `grain` was the object-space fallback for a dead uv attribute on `archFlare`.
  // That is fixed upstream — `UV_SCALE.trimGloss = 3.2` now gives the flare
  // several wraps of the satin map per metre — so this drops from 0.5 to a
  // supplement. It still earns its place: it is projected from object position,
  // so it breaks up the map's tiling and carries a relief bump across the merged
  // flare without a seam, neither of which the uvs give for free.
  applyDirt(m.trimGloss, { ...LATERITE, amount: 1.0, tag: 'trimGloss', grain: 0.18, cabin: true });
  applyBrightwork(m.trimGloss, {
    tag: 'trimGloss',
    strength: 0.62,
    band: 0.3,
    trees: 0.55,
    fresnel: 0.45,
    flat: 0.8,
    ambient: 1.3,
  });
  m.bedLiner = new THREE.MeshStandardMaterial({
    map: liner.map,
    normalMap: liner.normal,
    roughnessMap: liner.rough,
    normalScale: new THREE.Vector2(1.1, 1.1),
    metalness: 0.02,
    roughness: 0.9,
    envMapIntensity: 0.6,
  });
  applyDirt(m.bedLiner, { ...LATERITE, amount: 1.1, tag: 'liner', arch: 0.45 });
  // A spray-in liner is a textured black tub that fills most of the bed in the
  // hero framing. It has the same problem the grille had — a dielectric that
  // dark gets nothing from a specular-only reflection model — and the bed walls
  // face inward, so they see mostly each other.
  applyBrightwork(m.bedLiner, { tag: 'liner', strength: 0.3, band: 0.1, trees: 0.4, fresnel: 0.5, ambient: 1.2 });
  // Shut lines, recesses and anything that should read as a shadow gap. It also
  // lines the arch openings, which is the one place on the truck where mud
  // genuinely packs solid, so it takes cake and nothing else.
  m.gap = new THREE.MeshStandardMaterial({
    color: 0x0c0d0e,
    metalness: 0.0,
    roughness: 0.95,
    envMapIntensity: 0.12,
  });
  applyDirt(m.gap, { ...LATERITE, amount: 1.0, tag: 'gap', film: 0.2, spatter: 0.5, cake: 1.6, grain: 0.3, cabin: true });
  // A shut line should stay a shut line, but this key also lines both arch
  // openings, and an arch liner is a square foot of visible surface that ought
  // to read as "dark moulded tub with mud caked in it" rather than as a hole
  // cut out of the truck. A sixth of a bounce is enough to find its shape.
  applyBrightwork(m.gap, { tag: 'gap', strength: 0.2, band: 0.06, trees: 0.3, fresnel: 0.55, ambient: 0.7 });

  // --- glass ---------------------------------------------------------------
  // Tinted, dirty, and genuinely see-through. Every pane on the truck is built
  // by the one function so the windscreen, the door glass and the rear glass
  // are the same substance seen through different dirt: same tint, same
  // reflection model, same Fresnel, same thickness cue. What differs per pane
  // is only the film — which pane gets wiped, which one lives in the plume.
  //
  // The dust is *lit* (`applyGlassFilm`): it used to ride on the emissive
  // channel, which ignores light, so a screen in the sun and the same screen
  // in shade carried identical haze and from the driver's seat the film lit
  // itself against a dark cab — the milky read. Now it takes the pane's own
  // irradiance, so it is bright where the sun lands and goes quiet in shade.
  //
  // The reflection is the scene's own PMREM — the same `envMap` the paint
  // carries, handed to every material here by `vehicleMaterials(env)` and
  // rescaled per hour by the sky — through the BRDF's Fresnel at ior 1.5, with
  // the analytic skyline of `applyBrightwork` only as break-up under it. The
  // material is premultiplied so the reflection is added over the scene at full
  // strength rather than scaled by the pane's opacity; see the `pane` path in
  // `applyBrightwork` for the compositing. `opacity` here is therefore the
  // tint alone — the fraction of the cabin the glass absorbs face-on — and the
  // Fresnel close is added to it in the shader.
  //
  // No clearcoat: the pane *is* the dielectric interface, and a coat on top of
  // it was a second 4 per cent layer doubling every reflection.
  const pane = (key, { kind, color, opacity, roughness, film, bw }) => {
    const mat = new THREE.MeshPhysicalMaterial({
      // Near-black. Glass has no diffuse of its own, and whatever albedo the
      // pane carries is lit by the sun and laid over the cabin as a wash — the
      // old 0x33474f at 0.26 opacity was most of the "tan film" the sunlit door
      // glass read as. The tint is the alpha; the colour only names its hue.
      color,
      map: glassTintMap(),
      metalness: 0.0,
      roughness,
      // the screen's map carries the wiper arcs; the door glass gets a plain
      // wind-streaked film at forty per cent of it; the rear glass lives in the
      // plume and its dust is all in the layer map already
      roughnessMap: kind === 'rear' ? null : glassRoughness(kind),
      ior: 1.5,
      opacity,
      transparent: true,
      premultipliedAlpha: true,
      // Above unity on purpose. The PMREM is rendered without the sun's
      // aureole (a hot disc fireflies its mips) and the hour rescales it
      // downward, so at 1.0 a four per cent Fresnel of it over a lit cabin was
      // measured invisible in every view under 45 degrees. The sky a real
      // screen mirrors is one to two stops brighter than the ground it is
      // parked on; this puts that ratio back.
      envMapIntensity: 1.8,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    applyBrightwork(mat, {
      tag: key,
      // Break-up under the PMREM: this puts the acacia line and the horizon
      // streak into a sky that would otherwise grade smoothly, so a pane
      // visibly mirrors *something*. It goes into `radiance`, so it is scaled
      // by the same Fresnel as the environment and is invisible face-on.
      strength: 0.9,
      band: 0.5,
      trees: 1.15,
      line: 0.3,
      // The Fresnel close on the alpha, 1.0 -> 0.7 (round 5). Critic B: "the
      // cowl through the glass is milkier than it should be at that angle —
      // the Fresnel term is not angle-gated enough"; with `see` down on nine
      // of twelve conditions this is the one term every pane shares. The
      // reflection itself is untouched; what comes down is how far it closes
      // the pane over what is behind it.
      pane: 0.7,
      ground: 0x3a2618,
      wall: 0x2a2a1c,
      rim: 0xfff0d2,
      ...bw,
    });
    applyGlassFilm(mat, { tag: key, kind, ...film });
    m[key] = mat;
    return mat;
  };
  // Windscreen: wiped, so the least dusty, with the factory shade band. A
  // laminated screen is the clearest glass on the truck — about ten per cent.
  pane('glass', {
    kind: 'screen',
    color: 0x141c1c,
    opacity: 0.1,
    roughness: 0.05,
    // dustAlpha 0.3 -> 0.26 with the round-4 dust map: the map moved its mass
    // to the cowl (bottom decile 0.42 -> 0.51 of full) rather than adding any
    // (mean 0.135 -> 0.122), and the alpha comes down so the cowl band lands
    // where the old even film peaked instead of a stop over it. ws_mid had
    // paid see 0.85 -> 0.76 for the heavier band over the dark dash.
    film: { dustAmount: 0.9, dustAlpha: 0.26, band: 0.55, dust: 0x9c8468 },
    // No grazing sky on the screen. Tried at 0.12 for the raked views: the
    // gauntlet's `interior` shot paid for it (veil 0.048 to 0.075, see 0.81
    // to 0.78, measured by toggling the uniform alone) and `ws_close` did not
    // gain, so the door glass keeps the term and the screen does not.
    bw: { graze: 0 },
  });
  // Door glass: a light grey-green, nothing ever wipes it. `glassDark` used to
  // stand in for both this and the rear glass and the door panes carried the
  // windscreen's wiper arcs, which is why the two never agreed. The dust is
  // held well down from the screen's: the film was lit by the sun on the
  // sunlit flank and the whole cabin behind it read as one amber wash.
  //
  // Round 4: the sunlit door glass read as an open window (critic A: cover 59
  // per cent, veil 0.074, no Fresnel at the top edge, no film). Two things put
  // the glass back: the side dust map above breaks the mirror up, and `graze`
  // lands a tenth of the sky on the pane past 40 degrees of incidence, which is
  // the whole top third of a door pane seen from beside the truck. Face-on the
  // pane is as clear as it was; `see` holds above 0.7.
  pane('glassSide', {
    kind: 'side',
    color: 0x16201e,
    opacity: 0.14,
    roughness: 0.05,
    film: { dustAmount: 1.0, dustAlpha: 0.24, band: 0, dust: 0x9c8468 },
    // 0.3 -> 0.2. Where the term shows is the raked views — from the seat the
    // driver's door glass is at 70-80 degrees — and there the gauntlet's
    // `interior` shot paid veil 0.048 -> 0.075, see 0.81 -> 0.77 for 0.3
    // (measured by toggling the uniform alone). At 0.2 the pane still closes
    // at the top edge; Fresnel alone would give 0.09 at 60 and 0.2 at 75.
    // Then 0.14 (round 5, the ~30 per cent all three critics asked for), with
    // the gate in the shader moved from 39 to 50 degrees.
    bw: { graze: 0.14 },
  });
  // Rear cab glass: sits in the plume the truck drags behind it.
  pane('glassDark', {
    kind: 'rear',
    color: 0x141c1c,
    opacity: 0.16,
    roughness: 0.06,
    // in the cab's own shadow all day, so the film takes more skylight
    film: { dustAmount: 1.0, dustAlpha: 0.42, band: 0, dustAmbient: 0.3, dust: 0x9c8468 },
    bw: { wall: 0x2a2a1c, rim: 0xfbecce, sky: reflectedSky(1.1) },
  });
  // The cut edge of a pane. Glass is 5 mm of green-tinted solid, and the one
  // place that shows is the edge: light pipes along the sheet and comes out of
  // the cut face as a thin bright green line, which is also the only cue a
  // zero-thickness quad has of being anything but a decal. Opaque, so it also
  // caps the sorting problem at the perimeter — nothing overlaps at an edge.
  //
  // The piped light is a *thin* bright line, not a neon tube: at emissive 0.9
  // the frame read as a green fluorescent strip round every window from three
  // metres. Most of the edge's brightness now comes from the graded
  // reflection, which only fires where the frame faces the sky, so the top
  // edges glint and the bottom edges stay a dark bottle-green.
  //
  // It is a 6 mm rim now, standing a few millimetres proud of the pane so it
  // is seen edge-on from the outside as a thin bright line where the sheet
  // meets the gasket, and most of its length is under the rubber lip. Polished
  // rather than satin: a cut and seamed edge is glossy, and the highlight is
  // what says "thickness" from three metres.
  m.glassEdge = new THREE.MeshStandardMaterial({
    color: 0x1e4038,
    emissive: 0x0c2a22,
    emissiveIntensity: 0.12,
    metalness: 0.0,
    roughness: 0.08,
    envMapIntensity: 0.9,
  });
  applyBrightwork(m.glassEdge, {
    tag: 'glassEdge',
    strength: 1.1,
    band: 0.7,
    trees: 0.5,
    line: 0.42,
    fresnel: 0.3,
    ground: 0x141f1a,
    wall: 0x1c2a24,
    rim: 0xd8f5d8,
    sky: 0x8cc4b4,
  });
  // The rubber round every pane: an EPDM channel, 16 mm wide, holding the sheet
  // and the frame apart. Its own material rather than `trim` or `gap`, because
  // it is read from both sides — from outside it is the dark surround that
  // gives a pane an edge against the paint, and from the seats it is the sill
  // of the window, which used to be the bare cut face of the glass: a
  // bottle-green box with no cabin light on it, i.e. the hard black band along
  // the bottom of the door glass in every interior frame. Matte, with a little
  // sheen along the top where the extrusion's radius catches the sky, and the
  // cabin bounce so it reads as rubber in the cab rather than as a hole.
  m.gasket = new THREE.MeshStandardMaterial({
    color: 0x232423,
    normalMap: rubber.normal,
    normalScale: new THREE.Vector2(0.35, 0.35),
    metalness: 0.0,
    roughness: 0.6,
    envMapIntensity: 0.35,
  });
  applyBrightwork(m.gasket, { tag: 'gasket', strength: 0.35, band: 0.3, trees: 0.3, fresnel: 0.5, ambient: 0.45 });

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
    // A stop was added to the key light after this was tuned, and the dish came
    // back level with the paint beside it. A reflector belongs under the paint.
    color: 0x83898e,
    normalMap: reflect.normal,
    roughnessMap: reflect.rough,
    normalScale: new THREE.Vector2(1.3, 1.3),
    metalness: 0.95,
    roughness: 1.0,
    envMapIntensity: 0.28,
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
    line: 0.3,
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
  // The roof bar's polycarbonate cover, split off `lensClear` (round 5). Same
  // glass, its own emissive level: `index.js` drives it from `BEAM.*.cover`
  // (0.5 at night against the headlamp lenses' 2.2), and the lit-lamp core is
  // held to 3 rather than 7 because the geometry's nine-lobe `lampHot` mask now
  // does the shaping — at core 7 a lobe peak still summed to 0.4 of radiance
  // at the cover's alpha, which is a second row of pods stacked on the LEDs
  // rather than the scatter round them. The bloom belongs to the nine
  // `headlight` discs behind it.
  m.barCover = new THREE.MeshPhysicalMaterial({
    color: 0xc3d4de,
    metalness: 0,
    roughness: 0.05,
    normalMap: lensNormal(),
    normalScale: new THREE.Vector2(0.25, 0.25),
    transparent: true,
    opacity: 0.1,
    envMapIntensity: 1.2,
    clearcoat: 1,
    clearcoatRoughness: 0.03,
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
  // Reverse lamp: a clear prismatic lens over a silvered bowl. Off, it is the
  // one pale cell in the cluster; the ride wiring can drive
  // `emissiveIntensity` (about 4 when backing up) the way it does `taillight`.
  m.reverseLamp = new THREE.MeshStandardMaterial({
    color: 0xd9dedd,
    emissive: 0x8a8f8c,
    emissiveIntensity: 0.18,
    normalMap: prismNormal(),
    normalScale: new THREE.Vector2(1.2, 1.2),
    roughness: 0.1,
    metalness: 0.08,
    envMapIntensity: 1.5,
  });
  m.reflectorRed = new THREE.MeshStandardMaterial({
    color: 0x7a1509,
    metalness: 0.1,
    roughness: 0.18,
    normalMap: prismNormal(),
    normalScale: new THREE.Vector2(1.2, 1.2),
    envMapIntensity: 1.6,
  });
  // The cover lenses are lit from behind once the lamps are on: a clear lens
  // over a lit reflector scatters some of that light in the plastic, which is
  // the soft glow round the hot core in any photograph of a lit headlamp. Off,
  // the emissive is zero and the lens is what it was in daylight.
  m.lensClear.emissive = new THREE.Color(0xffeccb);
  m.lensRibbed.emissive = new THREE.Color(0xffeccb);
  // the bar is an LED unit: its scatter is cool where the halogen covers are warm
  m.barCover.emissive = new THREE.Color(0xeef4ff);
  m.lensClear.emissiveIntensity = 0;
  m.lensRibbed.emissiveIntensity = 0;
  m.barCover.emissiveIntensity = 0;
  // Lit-lamp shaping (see `applyLampGlow`): gated by `uLampOn`, which index.js
  // drives with the lamp state, so none of it touches the daytime lens. The
  // colour keys bleach less than the clear ones — a red lens stays red to the
  // edge of its core; a clear one goes to white over most of the aperture.
  applyLampGlow(m.headlight, { tag: 'headlight', core: 2.5, bleach: 0.6, coreExp: 1.0 });
  applyLampGlow(m.taillight, { tag: 'taillight', core: 2.0, bleach: 0.25, coreExp: 2.2 });
  applyLampGlow(m.amber, { tag: 'amber', core: 2.5, bleach: 0.35, coreExp: 2.2 });
  applyLampGlow(m.reverseLamp, { tag: 'reverseLamp', core: 2.5, bleach: 0.4, coreExp: 2.0 });
  // The covers carry most of their light in the core term rather than the flat
  // base: at base 4 and core 5 the whole disc saturated after bloom and the
  // headlamp read as a white plate, with the light bar brighter than both
  // headlamps together. A low base with a steep core keeps a warm rim round a
  // white centre, which is the reading of a lit lamp.
  applyLampGlow(m.lensClear, { tag: 'lensClear', core: 7.0, bleach: 0.55, coreExp: 2.0 });
  applyLampGlow(m.lensRibbed, { tag: 'lensRibbed', core: 7.0, bleach: 0.55, coreExp: 2.0 });
  applyLampGlow(m.barCover, { tag: 'barCover', core: 3.0, bleach: 0.4, coreExp: 1.5 });
  // The dish behind every clear lens throws the bulb's light straight back at the
  // camera when it is on: the whole aperture glows, graded by how squarely each
  // stamped step faces the eye, which is what separates a lit headlamp from a
  // bright dot in a grey bowl.
  applyLampGlow(m.reflector, { tag: 'reflector', core: 0, bleach: 0, bowl: 0.6, bowlColor: 0xfff0d2, bowlExp: 3.0 });

  // --- decals --------------------------------------------------------------
  // Tinted well off white and left rough. At full white the tailgate wordmark
  // was the brightest thing in the frame by a wide margin, so bloom smeared it
  // into a light leak across the whole gate in every rear shot — and a decal on
  // a truck that has been through this much mud would not still be paper white.
  const decal = (kind, tint = 0xa8a79c) =>
    new THREE.MeshStandardMaterial({
      map: decalMap(kind),
      color: tint,
      transparent: false,
      alphaTest: 0.5,
      metalness: 0.0,
      roughness: 0.66,
      envMapIntensity: 0.5,
      side: THREE.DoubleSide,
    });
  m.decalName = decal('name');
  m.decalBadge = decal('badge');
  m.decalNumber = decal('number');
  applyDirt(m.decalName, { ...LATERITE, amount: 0.8, tag: 'decalName' });
  applyDirt(m.decalNumber, { ...LATERITE, amount: 0.9, tag: 'decalNumber' });

  // --- cabin ---------------------------------------------------------------
  // The whole interior has to sit *below* the exterior in value or the
  // windscreen stops reading as daylight. Two things were pushing it up: an
  // albedo picked to be visible through the glass from outside, and a full
  // envMapIntensity, which fills unlit cabin plastic with blue sky and lands it
  // on pale lavender. Instead the value range comes from the surface's
  // orientation — the horizontal pads are sun-faded and light, the vertical
  // faces are dark warm grey-brown — which is also what happens in a real cab.
  // Cloth. The atlas base is 0x3a3630 and the tint the cabin shader applies on
  // top takes another 17 per cent off, so at the 0x8a8378 this used to carry the
  // seats rendered at roughly 1 per cent reflectance — darker than the rubber
  // and a full stop under charcoal upholstery, which is why a cushion came back
  // as a hole with lit bolsters round it. The lift goes in the multiplier rather
  // than the atlas because the atlas is shared and also dresses the canvas top.
  //
  // The environment comes almost all the way out for the opposite reason: a
  // PMREM of open sky is the wrong thing to fill a matte fibre with, and half of
  // it was what put the pale cast on the seat that reads as plastic sheeting.
  // What cloth is actually lit by in here is the cabin bounce, which is warm.
  m.fabric = new THREE.MeshStandardMaterial({
    map: fabric.map,
    normalMap: fabric.normal,
    roughnessMap: fabric.rough,
    normalScale: new THREE.Vector2(1.25, 1.25),
    color: 0xd8d0c2,
    metalness: 0,
    roughness: 1.0,
    envMapIntensity: 0.16,
  });
  // Cabin dust is the same laterite, thinner and paler: it comes in through the
  // windows as airborne fines, not as spatter, so `chroma` sits lower than the
  // exterior's and the dust colours are lifted towards the murram tone.
  // Cabin dust is greyer than the exterior's. It is the same laterite, but a
  // film of fines on vinyl reads as a grey haze, not as clay: with every cabin
  // key carrying an orange-brown dust the whole glasshouse read amber from
  // outside, which the glass round was blamed for.
  applyDirt(m.fabric, { amount: 0.45, tag: 'seat', color: 0x74625a, dust: 0x8f8880, wet: LATERITE.wet, chroma: 0.2, arch: 0 });
  // Every cabin envMapIntensity in here is roughly half what it was, and the
  // difference has moved to `applyCabinBounce` below. The environment is a PMREM
  // of the sky, and 0x4c7fb5 at the zenith is a saturated blue: leaning on it to
  // light the cabin meant a warm brown pad was taking most of its value from blue
  // sky it cannot even see, which lands on mauve — the original "pale pinkish
  // lavender" complaint, and it came straight back the moment the interior was
  // lifted. Warm inter-reflection is both the physically honest source in a
  // closed cab and the one that keeps the vinyl on khaki.
  m.interiorPlastic = new THREE.MeshStandardMaterial({
    map: vinyl.map,
    normalMap: vinyl.normal,
    roughnessMap: vinyl.rough,
    normalScale: new THREE.Vector2(1.1, 1.1),
    metalness: 0.0,
    roughness: 1.0,
    envMapIntensity: 0.42,
  });
  // Spatter and cake held to a third in the cab (round 4). These are the
  // exterior pass's thrown-mud noises, and at full strength on every cabin
  // vinyl they were the second half of the "same dirt-splat texture on
  // everything" read; what a cab collects is film and seam grime, which the
  // film term here and the cabin shader's soil carry between them.
  applyDirt(m.interiorPlastic, { amount: 0.6, tag: 'cabin', color: 0x6e625a, dust: 0x8e8a84, wet: LATERITE.wet, chroma: 0.2, arch: 0, spatter: 0.35, cake: 0.35 });
  // Top surfaces. These are the ones under the screen that the sun bakes, so
  // they are chalkier and a stop or two lighter — and they are what you see of
  // the cabin from outside, which is what keeps the greenhouse from going black.
  m.interiorFaded = new THREE.MeshStandardMaterial({
    map: vinylFaded.map,
    normalMap: vinylFaded.normal,
    roughnessMap: vinylFaded.rough,
    // Up from 0.75: a normal map needs a direction to come from, and until the
    // cabin bounce existed there was none in here, so the grain shaded exactly
    // like a flat surface and the pad read as felt however deep the relief was.
    normalScale: new THREE.Vector2(1.15, 1.15),
    metalness: 0.0,
    roughness: 1.0,
    envMapIntensity: 0.5,
  });
  applyDirt(m.interiorFaded, { amount: 0.7, tag: 'cabinTop', color: 0x7c6f64, dust: 0x9a948c, wet: LATERITE.wet, chroma: 0.2, arch: 0, spatter: 0.35, cake: 0.35 });
  // Stitched welt strips down the pad edges and the seat panel seams.
  const stitch = stitchMaps();
  m.stitch = new THREE.MeshStandardMaterial({
    map: stitch.map,
    normalMap: stitch.normal,
    roughnessMap: stitch.rough,
    normalScale: new THREE.Vector2(1.1, 1.1),
    metalness: 0,
    roughness: 1.0,
    envMapIntensity: 0.4,
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
    envMapIntensity: 0.7,
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
    sky: reflectedSky(0.88),
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
    envMapIntensity: 0.42,
  });
  const rim = wheelRimMaps();
  m.wheelRim = new THREE.MeshStandardMaterial({
    map: rim.map,
    normalMap: rim.normal,
    roughnessMap: rim.rough,
    normalScale: new THREE.Vector2(0.9, 0.9),
    metalness: 0.02,
    roughness: 1.0,
    envMapIntensity: 0.42,
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
    envMapIntensity: 0.55,
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
    // Warm, not cool. A blue sheen over a warm brown rim reads as mauve, and the
    // top of the wheel was the one plum-coloured thing left in the frame; what it
    // is actually mirroring is the dash, not the sky.
    sky: 0x8e8578,
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
    envMapIntensity: 0.28,
  });
  // the floor is where boots bring the real soil in, so it takes the exterior's
  // chroma rather than the cabin's
  applyDirt(m.floorMat, { amount: 1.8, tag: 'floor', color: 0x7e5236, dust: 0x9a7452, wet: LATERITE.wet, chroma: 0.5, arch: 0 });
  const liner2 = headlinerMaps();
  m.headliner = new THREE.MeshStandardMaterial({
    map: liner2.map,
    normalMap: liner2.normal,
    roughnessMap: liner2.rough,
    normalScale: new THREE.Vector2(0.7, 0.7),
    metalness: 0,
    roughness: 1.0,
    envMapIntensity: 0.45,
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
  // The roof tent's PVC travel cover: the campground's own canvas colour, so
  // the truck and the tents it parks beside are visibly the same kit. Coated
  // fabric, so a shade glossier than the strap webbing, and it is the largest
  // up-facing surface on the truck after the roof, so it takes settled dust.
  m.canvasKhaki = new THREE.MeshStandardMaterial({
    color: PALETTE.canvas,
    metalness: 0,
    roughness: 0.78,
    normalMap: fabric.normal,
    normalScale: new THREE.Vector2(0.9, 0.9),
    envMapIntensity: 0.5,
  });
  applyDirt(m.canvasKhaki, { ...LATERITE, amount: 0.9, tag: 'canvasKhaki', arch: 0, spatter: 0.3, film: 1.2, grain: 0.12 });
  applyBrightwork(m.canvasKhaki, { tag: 'canvasKhaki', strength: 0.3, band: 0.1, trees: 0.4, fresnel: 0.5, flat: 0.9, ambient: 0.9 });
  // Moulded fridge case: pale warm grey polyethylene, satin, with the trim
  // normal for the moulding grain.
  m.fridgeCase = new THREE.MeshStandardMaterial({
    color: 0x9a9890,
    metalness: 0.0,
    roughness: 0.62,
    normalMap: trimSatin.normal,
    roughnessMap: trimSatin.rough,
    normalScale: new THREE.Vector2(0.5, 0.5),
    envMapIntensity: 0.55,
  });
  applyDirt(m.fridgeCase, { ...LATERITE, amount: 0.7, tag: 'fridgeCase', arch: 0, spatter: 0.2, grain: 0.1 });
  applyBrightwork(m.fridgeCase, { tag: 'fridgeCase', strength: 0.5, band: 0.25, trees: 0.4, fresnel: 0.35, flat: 0.85, ambient: 1.0 });

  // --- cabin bounce --------------------------------------------------------
  // Every material that shows up inside the cab gets the analytic bounce. It is
  // gated to an object-space box around the cabin volume, so the four of these
  // that are also used on the outside of the truck — trim, trimGloss, steelDark,
  // gap — carry it on their cabin instances and nothing anywhere else.
  //
  // The values differ per material because what each one is missing differs. The
  // headlining is a big underside the hemisphere pays nothing at all; the faded
  // pad tops already see the sky and only want the modelling; the brackets and
  // the cage tube are metalness 0.9, so `spec` is the only thing that can lift
  // them; and the dial faces have to stay dark or the backlight stops reading as
  // backlight.
  const bounce = {
    // Raised on the floor rather than the gain because the surfaces that needed it
    // are the door cards: they face inboard, so the hemisphere pays them nothing,
    // and they measured 2.0 stops under the windscreen against 1.5 for the dash.
    // The floor is the term that does not care which way a face points.
    interiorPlastic: { gain: 0.85, floor: 0.43 },
    // The pad tops and the binnacle hood. Held below interiorPlastic because they
    // are the surfaces that do see some sky, but not as far below it as they were:
    // with the environment halved the hood was the darkest band in the middle of
    // the frame.
    interiorFaded: { gain: 0.72, floor: 0.28 },
    fabric: { gain: 0.7, floor: 0.42 },
    headliner: { gain: 1.15, floor: 0.5 },
    floorMat: { gain: 0.55, floor: 0.38 },
    stitch: { gain: 0.95, floor: 0.36 },
    cabinPanel: { gain: 0.4, floor: 0.18 },
    louvre: { gain: 0.7, floor: 0.36, spec: 0.3 },
    wheelRim: { gain: 0.82, floor: 0.3 },
    wheelWorn: { gain: 0.75, floor: 0.25, spec: 0.35 },
    trim: { gain: 0.75, floor: 0.3 },
    trimGloss: { gain: 0.68, floor: 0.28, spec: 0.55 },
    steelDark: { gain: 0.7, floor: 0.3, spec: 1.4 },
    // the window rubbers: seen from the seats as the sill of every window,
    // so they take the door cards' floor and stay a shade under them
    gasket: { gain: 0.7, floor: 0.34 },
    // shadow gaps stay the darkest thing in the cabin, just not pure black
    gap: { gain: 0.16, floor: 0.07 },
  };
  for (const [key, opts] of Object.entries(bounce)) applyCabinBounce(m[key], { tag: key, ...opts });

  if (env) for (const mat of Object.values(m)) if ('envMap' in mat) mat.envMap = env;
  // Name every material after its kit key. Nothing in the renderer needs this;
  // it is what lets a capture tool find "the aluminium" in the scene graph and
  // put it on a test chart next to the steel, which is the only reliable way to
  // tell two grey metals apart — side by side under the same sky, not from two
  // photographs of different corners of the truck.
  for (const [key, mat] of Object.entries(m)) if (mat && mat.isMaterial && !mat.name) mat.name = key;

  // Panes that overlap each other on screen have to be drawn back to front, and
  // the Kit merges by material — which put every window on the truck into one
  // mesh. There is no sorting inside a mesh: the triangles blend in whatever
  // order they happen to sit in the buffer, and with depthWrite off nothing
  // rejects them either. That is what had the windscreen, the side glass and
  // the dash covers fading through one another as the camera moved.
  //
  // Flagged rather than inferred from `transparent`, because most transparent
  // materials here are small scattered decals that never overlap and are better
  // off merged.
  for (const key of ['glass', 'glassSide', 'glassDark', 'cabinGlass', 'lensClear', 'lensRibbed']) {
    if (m[key]) m[key].userData.sortPieces = true;
  }

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
