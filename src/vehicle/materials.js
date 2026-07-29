import * as THREE from 'three';
import { PALETTE } from '../palette.js';
import {
  applyBrightwork,
  applyCabinBounce,
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
    roughness: 0.38,
    clearcoatRoughness: 0.13,
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
    bw: { strength: 2.5, band: 0.5, flat: 0.5, ambient: 1.6 },
  });
  m.paintDark = makePaintMaterial(PALETTE.bodyPaintDark, {
    roughness: 0.42,
    clearcoatRoughness: 0.11,
    dirtTag: 'dark',
  });
  m.paintAccent = makePaintMaterial(PALETTE.accent, {
    roughness: 0.44,
    clearcoat: 0.78,
    clearcoatRoughness: 0.13,
    dirtTag: 'accent',
    bw: { strength: 1.9, band: 0.55 },
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
  applyDirt(m.steel, { amount: 0.85, tag: 'steel', color: 0x6f5c3d, film: 0.8, grain: 0.14 });
  applyBrightwork(m.steel, {
    tag: 'steel',
    strength: 0.5,
    band: 0.22,
    trees: 0.55,
    line: 0.46,
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
  applyDirt(m.steelDark, { amount: 0.95, tag: 'steelDark', color: 0x6c5a3c, grain: 0.18 });
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
    line: 0.46,
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
    envMapIntensity: 0.45,
  });
  applyDirt(m.chrome, { amount: 0.5, tag: 'chrome', color: 0x7c6949, film: 0.7 });
  // Chrome is small curved hardware — bezels, a handle strip — so it is the one
  // brightwork that should keep its hot skyline streak at full strength, and the
  // curvature gate hands it over for free.
  applyBrightwork(m.chrome, { tag: 'chrome', strength: 1.0, band: 0.55, trees: 0.95, line: 0.46, flat: 0.6 });
  // The door mirror's own pane. Chrome was standing in for it, and at roughness
  // 0.26 the lobe smears the graded skyline into an even wash — which is fine on
  // a bezel and is exactly wrong on the one surface whose whole job is to return
  // a legible reflection. `flat: 0` is the other half of it: every other
  // brightwork surface here is small and curved and wants its skyline band
  // gated by curvature, and a mirror is the one that should keep the band on a
  // flat face. No dirt film either — chrome's would put the housing's grime on
  // the glass.
  m.mirrorGlass = new THREE.MeshStandardMaterial({
    color: 0xcfd6da,
    metalness: 1.0,
    roughness: 0.05,
    roughnessMap: brushed.rough,
    normalMap: metal.normal,
    normalScale: new THREE.Vector2(0.04, 0.04),
    envMapIntensity: 0.45,
  });
  applyBrightwork(m.mirrorGlass, {
    tag: 'mirrorGlass',
    strength: 1.3,
    lobe: 0.35,
    flat: 0,
    band: 0.55,
    trees: 0.95,
    line: 0.46,
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
  applyDirt(m.alu, { amount: 0.9, tag: 'alu', color: 0x6f6552, film: 0.7, cake: 1.5, grain: 0.16 });
  // Aluminium stays the bright metal, but "bright" against a 0.34 steel, not
  // against the sky: on the chart both metals sat at 0.62 and the difference
  // between them was invisible. Value is the only cue that separates two grey
  // metals at 1 m, so the gap between them is now most of a stop.
  applyBrightwork(m.alu, { tag: 'alu', strength: 0.62, band: 0.3, trees: 0.7, line: 0.46, flat: 0.9 });
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
  applyDirt(m.plate, { amount: 1.2, tag: 'plate', color: 0x6f5c3c });
  // Tread plate needs the graded wall like the rest of the brightwork, but the
  // raised bars are what should be picking the streak up — hence the curvature
  // gate, which leaves the flat lands between them dark.
  applyBrightwork(m.plate, {
    tag: 'plate',
    strength: 0.55,
    band: 0.3,
    trees: 0.55,
    line: 0.46,
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
  applyDirt(m.rubber, { amount: 1.0, tag: 'rubber', color: 0x6a5837, film: 0.55 });
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
  applyDirt(m.tread, { amount: 1.25, tag: 'tread', color: 0x6a5837, film: 0.5, cake: 1.5 });
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
  applyDirt(m.trim, { amount: 1.0, tag: 'trim', color: 0x715f3f, grain: 0.16 });
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
  applyDirt(m.trimGloss, { amount: 1.0, tag: 'trimGloss', color: 0x715e3d, grain: 0.18 });
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
  applyDirt(m.bedLiner, { amount: 1.1, tag: 'liner', color: 0x6d5b3c, arch: 0.45 });
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
  applyDirt(m.gap, { amount: 1.0, tag: 'gap', color: 0x63512f, film: 0.2, spatter: 0.5, cake: 1.6, grain: 0.3 });
  // A shut line should stay a shut line, but this key also lines both arch
  // openings, and an arch liner is a square foot of visible surface that ought
  // to read as "dark moulded tub with mud caked in it" rather than as a hole
  // cut out of the truck. A sixth of a bounce is enough to find its shape.
  applyBrightwork(m.gap, { tag: 'gap', strength: 0.2, band: 0.06, trees: 0.3, fresnel: 0.55, ambient: 0.7 });

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
    // screen. Kept as a glare, with the graded reflection doing the rest — and
    // with the cabin lifted, that wedge no longer has a black dash to sit
    // against, so it can come down again.
    envMapIntensity: 1.0,
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
    // A window mirrors the sky more directly than anything else on the truck, so
    // it has the least excuse for using a bluer one than the scene has. Inherits
    // REFLECTED_SKY.
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
    // Was 0x8fb2d4. The side glass is the second largest reflective area on the
    // truck and it was mirroring a bluer sky than the scene has; scaled to hold
    // the value it had rather than dropped, so only the chroma changes.
    sky: reflectedSky(1.2),
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
  applyDirt(m.decalName, { amount: 0.8, tag: 'decalName', color: 0x6f5c3d });
  applyDirt(m.decalNumber, { amount: 0.9, tag: 'decalNumber', color: 0x6f5c3d });

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
  applyDirt(m.fabric, { amount: 0.7, tag: 'seat', color: 0x5f5138, dust: 0x877a60, arch: 0 });
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
  applyDirt(m.interiorPlastic, { amount: 1.0, tag: 'cabin', color: 0x5e5038, dust: 0x8d7f63, arch: 0 });
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
  applyDirt(m.interiorFaded, { amount: 1.5, tag: 'cabinTop', color: 0x6b5c40, dust: 0x9a8b6b, arch: 0 });
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
  applyDirt(m.floorMat, { amount: 1.8, tag: 'floor', color: 0x5c4a30, dust: 0x8a7454, arch: 0 });
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
  for (const key of ['glass', 'glassDark', 'cabinGlass', 'lensClear', 'lensRibbed']) {
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
