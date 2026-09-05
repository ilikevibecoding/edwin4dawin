import * as THREE from 'three';
import { Kit, bend, bolt, profile, rbox, rivet, transform, tube } from '../lib/geo.js';
import { SUN } from '../palette.js';
import { CABIN_ATLAS, CABIN_CELLS, CABIN_DIALS, paintPeelNormal, rubberMaps, vinylMaps, wovenCardMaps } from '../textures/vehicle.js';
import { emitPieces } from './body.js';
import { SPEC as S } from './spec.js';

// ---------------------------------------------------------------------------
// Cabin.
//
// Art-directed for the `interior` beauty view, which sits at the driver's eye —
// local [0.38, 1.63, 0.02], looking level down +Z at 58 degrees. That framing
// has two consequences that drive the whole layout:
//
//  - The bottom edge of frame traces y = 1.63 - 0.578 * z. Anything below that
//    line is off screen, so the *only* part of a conventional dash you can see is
//    the top pad and whatever rises above it. A fascia-mounted radio is
//    invisible from here, which is why the centre stack is a raised pod with an
//    angled face and the aux switches live on top of the pad.
//  - The dash is 0.45-0.9 m away, so a metre of surface spans roughly a thousand
//    pixels. A 30 mm stitch pitch lands on 29 px and a 3 mm vent slat on 3 px:
//    everything here has to be real geometry or real texture, and nothing gets
//    to be a smooth slab.
//
// It also has to hold up through the side glass, because `hero` and `wheel` look
// into it, hence the seats, cage and door cards being built out properly rather
// than just the driver's half.
// ---------------------------------------------------------------------------

const HW = S.bodyHalfWidth;
const FLOOR = S.floorY;
const BELT = S.beltlineY;

/**
 * Dash envelope, set by two sight lines out of the driver's eye at
 * [0.38, 1.63, 0.02] with a 58 degree vertical fov pitched 2 degrees down:
 *
 *   frame bottom    y = 1.63 - 0.600 (z - 0.02)
 *   pad occlusion   y = 1.63 - (1.63 - lipTop) / (PAD_FZ - 0.02) * (z - 0.02)
 *
 * At PAD_TOP = 1.425 the second line ran through y = 1.41 at the cluster's
 * depth, so the dash pad itself hid the bottom half of every dial and the whole
 * binnacle read as a 25-pixel slot. The pad belongs at the height of the screen
 * base anyway — 1.33 m at z = 0.92 — and from there the occlusion line drops to
 * y = 1.28 and the cluster clears it.
 *
 * One correction on top of that geometry, which cost two iterations to find: the
 * cabin hangs off the sprung mass and the beauty camera is bolted to the
 * chassis, so at the pose `setView('interior')` settles into, the whole interior
 * sits 66 mm lower than these local coordinates suggest. Everything from here
 * down is placed for how it lands in *that* frame, which is why the dash reads
 * about 30 mm high if you look at the numbers on their own.
 */
const PAD_TOP = 1.375; // top surface of the dash pad
const PAD_FZ = 0.49; // front lip, nearest the driver
const PAD_RZ = 0.86; // rear edge, tucked under the screen
const FASCIA_FZ = 0.55; // the vertical face below the pad
const DRIVER_X = 0.38; // eye / wheel / cluster centreline

/**
 * The windscreen rakes back as it rises — 1.33 m at z = 0.92, 2.02 m at
 * z = 0.44 — so the cabin's usable envelope is a wedge, and it is the ceiling on
 * every tall part of the dash. Anything above this line pokes out through the
 * glass and shows from the hero view, which is what the old cage bar and header
 * handles were doing at z = 0.66.
 */
const screenY = (z) => BELT + (S.windshieldBottomZ - z) * ((S.roofY - BELT) / (S.windshieldBottomZ - S.windshieldTopZ));

/**
 * The same wedge read the other way: the z of the glass at a given height. The
 * 8 mm is the pane's own inset — `body.js` builds the windscreen 30 mm shorter
 * than the nominal opening and drops it 10 mm, so its inner face sits that much
 * behind the line `screenY` describes. Worth having exactly right, because the
 * cowl moulding below clears it by 7 mm.
 */
const screenZ = (y) =>
  S.windshieldBottomZ - 0.008 - (y - BELT) * ((S.windshieldBottomZ - S.windshieldTopZ) / (S.roofY - BELT));

// Texel density per material, in UV units per metre. One object-space projection
// per material means a 40 mm switch bezel and a 1.6 m dash pad get the same size
// of grain, instead of each primitive being handed the whole texture.
const UV_SCALE = {
  interiorPlastic: 1,
  interiorFaded: 1,
  cardWoven: 1.15,
  consoleAbs: 1.6,
  rubber: 2.2,
  fabric: 1,
  headliner: 1,
  floorMat: 1,
  wheelRim: 'keep',
  wheelWorn: 'keep',
  stitch: 'keep',
  cabinPanel: 'keep',
  cabinGlass: 'keep',
  louvre: 'keep',
  trim: 1.2,
  trimGloss: 1.4,
  steelDark: 1.3,
  chrome: 1.3,
  gap: 'keep',
  paper: 1,
  screenFilm: 'keep',
  mirrorGlass: 'keep',
};

// ---------------------------------------------------------------------------
// Cabin light.
//
// A cab is a box with one bright opening in it, and the falloff from that
// opening is the entire read of the interior view. Nothing in the scene rig
// models it. The sun is outside and the body shadows the cabin out of it
// completely, so *every* photon in here is indirect; the hemisphere pays each
// up-facing surface the same wherever it is; and `applyCabinBounce` in the
// shared texture module adds a warm fill that is deliberately close to flat and
// happens to pay the headlining the highest gain in the library. Measured on the
// frame that prompted this rebuild, the nine horizontal bands of the interior
// view spanned 0.112 to 0.166 — a ratio of 1.48 — and the ceiling was brighter
// than the dash top, which is upside down. A photograph of a cab has the dash
// three to five times the value of the liner above it.
//
// Four terms, all gated to an object-space box round the cabin with an
// inward-facing test — the same trick `applyCabinBounce` uses — so the keys that
// are also on the outside of the truck carry this on their cabin instances only:
//
//   enclosure  the *subtractive* one, and the one that was missing. Inside a box
//              the only sky a surface sees is the piece of it framed by the
//              opening, so all indirect — hemisphere, IBL and the shared bounce
//              alike — is scaled by how much of the aperture the surface faces.
//              A ceiling scores badly on that and goes dark, which is the whole
//              point. Applied at `lights_fragment_end`, so it catches terms
//              other modules added earlier in the chain.
//   aperture   the screen treated as an area source: wrapped n.l, inverse square
//              on a short reach, and a cosine at the *source* so a surface the
//              glass cannot see gets nothing however close it is.
//   up-bounce  a second source on the dash pad that only lights down-facing
//              surfaces. This is what a headlining is actually lit by, and it is
//              what gives the ceiling a front-to-back gradient rather than one
//              value.
//   sun patch  a hard-edged shaft. The ray from the surface to the sun is traced
//              against the screen and the two door panes, and if it gets out
//              through one of them the surface is in sun. This is the only hard
//              light in the cabin and it is what makes the frame read as a
//              photograph instead of an ambient-occlusion pass: it lands
//              somewhere different every capture because it follows the truck's
//              heading, and wherever it lands there is a bright side and a dark
//              side to everything near it.
//
// The last three are added *after* the enclosure scaling rather than into
// `irradiance` before it, or the term that is supposed to model the opening gets
// attenuated by how little of the opening the surface can see.
// ---------------------------------------------------------------------------

const CL_CTR = [0, 1.28, 0.0];
const CL_HALF = [0.84, 0.77, 0.95];
/** Middle of the screen opening. */
const CL_AP = [0, 1.665, 0.685];
/** The screen's inward normal, from the rake `screenY` describes. */
const CL_APN = (() => {
  const dy = S.roofY - BELT;
  const dz = S.windshieldBottomZ - S.windshieldTopZ;
  const l = Math.hypot(dy, dz);
  return [0, -dz / l, -dy / l];
})();
/**
 * The rectangle the *shaft* comes through, which is not the whole screen. Both
 * visors are down and they cover the top 190 mm of the aperture; at a sun
 * elevation of 47 degrees that is the difference between every up-facing surface
 * in the cab being lit and the light having a top edge to it. Dropped 90 mm down
 * the rake from the middle of the glass and cropped to suit.
 */
const CL_SUNAP = [0, CL_AP[1] + 0.09 * CL_APN[2], CL_AP[2] - 0.09 * CL_APN[1]];
const CL_SUNAPH = [0.66, 0.335];
/** Door glass: centre, inward normal is -x on the driver's side. */
const CL_SIDE = [HW, 1.615, 0.405];
const CL_SIDEH = [0.455, 0.26];
/**
 * The door glass as a second area source. Everything above the beltline and
 * outboard of the seats is nearer to a side window than to the screen — the cant
 * rails, the outboard third of the liner, the tops of both cards — and with only
 * the screen modelled all of it fell to the occlusion floor. It also puts a
 * left-to-right gradient in the frame, which the interior view had none of: the
 * three horizontal thirds measured 0.166, 0.169 and 0.160.
 */
const CL_SIDEREACH = 0.95;
/** Middle of the dash pad, which is the reflector the ceiling is lit by. */
const CL_UP = [0, PAD_TOP + 0.02, 0.63];
/**
 * Reach and wrap were both set wide to stop the cab going black before there
 * was a fill term to catch it, and once there was one they were what kept it
 * flat: measured off the ID pass, eleven of the twenty keys rendered between
 * 0.20 and 0.32 and the whole cabin spanned barely three to one. A cab under an
 * open screen spans nearer ten. A tighter inverse-square and a terminator that
 * is a terminator rather than a 45-degree wrap are what put that range back.
 */
const CL_REACH = 0.7;
const CL_WRAP = 0.33;
/**
 * Below `CL_Y0` the pad has capped the footwell off from the glass entirely.
 *
 * This is the dash's occlusion written as a height, and it is right for
 * everything in front of the driver and wrong for everything behind him: the
 * seats stand clear of the dash and look straight up at the screen, but their
 * cushions sit at 1.05 m, which this band scores at 0.09 of full aperture. A
 * cushion was therefore getting a third of the key term and a third of the fill
 * of a surface 400 mm higher, and rendered as a hole with pale bolsters round
 * it. Any key may override the band — see `y0`/`y1` on `applyCabinLight`.
 */
const CL_Y0 = 0.86;
const CL_Y1 = 1.42;
const CL_DEEP = 0.3;

/**
 * World-space sun, matching `sunDirection()` in the sky module. Read rather than
 * duplicated: the shaft has to agree with the light the forest is lit by or the
 * cabin looks like it is in a different scene. Taken into object space in the
 * vertex shader, so the patch tracks the truck's heading and its body roll.
 */
const CL_SUNDIR = (() => {
  const phi = ((90 - SUN.elevation) * Math.PI) / 180;
  const theta = (SUN.azimuth * Math.PI) / 180;
  return [Math.sin(phi) * Math.sin(theta), Math.cos(phi), Math.sin(phi) * Math.cos(theta)];
})();

const v3 = (a) => `vec3( ${a[0].toFixed(4)}, ${a[1].toFixed(4)}, ${a[2].toFixed(4)} )`;
const v2 = (a) => `vec2( ${a[0].toFixed(4)}, ${a[1].toFixed(4)} )`;
const f1 = (v) => v.toFixed(4);

/**
 * Per-key dials.
 *
 *   gain  the aperture term
 *   up    the bounce off the pad, which is nearly all the ceiling gets
 *   sun   the shaft, in units of the scene's own directional light
 *   occ   the floor the enclosure takes indirect to on a surface that faces none
 *         of the opening. This is now the strongest dial in the table: it is
 *         what separates a dash top from a headlining.
 *   spec  how much of the added light lands in the specular lobe — the only
 *         thing that lifts a bracket at metalness 0.9.
 */
const CABIN_LIGHT = {
  // `side` is held well under the gain on the two vinyl keys on purpose. Both
  // dress the door cards as well as the dash, and at the default (0.3 × gain)
  // the card tops — 300 mm from the door glass and facing straight into it —
  // came out at 0.39 luma against the pad's 0.22. That is the light direction
  // running backwards: the brightest thing in the frame was the bottom left
  // corner rather than the pad under the screen.
  // The pad. Measured against the ID pass at 0.31 mean and 0.57 under the sun
  // patch, which is the right *value* for the one surface the screen points at,
  // but it was coming out neutral and pale with it — 10 per cent of the frame
  // reading as sandstone rather than as brown vinyl, and the largest single
  // thing in the shot. The gain comes off a little and the tint takes the
  // difference in hue instead, so the pad keeps its place at the top of the
  // range while turning back into a warm mid-brown.
  interiorFaded: {
    gain: 5.2,
    side: 0.5,
    up: 0.16,
    occ: 0.17,
    sun: 6.0,
    fill: 0.26,
    dust: 0.42,
    craze: 1,
    grain: 0.2,
    soil: 0.5,
    // Was sat 1.0 with a [0.96, 0.86, 0.72] tint: a tan pad, and the pad is
    // what every exterior camera sees of the cabin through the screen. A
    // sun-faded grey vinyl, a touch warm, reads as a dash from outside without
    // turning the whole glasshouse orange.
    sat: 0.6,
    tint: [0.92, 0.9, 0.86],
  },
  interiorPlastic: {
    gain: 7.2,
    side: 0.5,
    up: 0.18,
    occ: 0.28,
    sun: 4.6,
    fill: 2.95,
    dust: 0.4,
    craze: 0.25,
    grain: 0.18,
    soil: 0.5,
    sat: 0.55,
    tint: [0.86, 0.86, 0.88],
  },
  // The cards, the waist roll, the armrests and the A-pillar trim. Held to
  // roughly half the pad's rendered value: this is the surface the driver's own
  // shoulder is in front of and the one facing away from the screen.
  // Woven cloth over board (round 5), not vinyl: the texture comes off its own
  // maps, so the moulded-grain crease net and the sun crazing are both off —
  // cloth neither has cells nor splits. Dust is held lower than the vinyl's
  // because a fibre surface does not take a film the way a smooth one does; it
  // darkens instead, which the soil term already does.
  cardWoven: {
    gain: 3.6,
    side: 0.78,
    up: 0.2,
    occ: 0.26,
    sun: 3.4,
    fill: 2.5,
    dust: 0.2,
    craze: 0,
    grain: 0,
    soil: 0.6,
    sat: 0.7,
    tint: [0.98, 0.96, 0.92],
  },
  // Black ABS: the binnacle, the centre stack, the column and the console
  // (round 5). The albedo is near zero, so the diffuse terms here do almost
  // nothing on purpose and the material's whole read is the sheen — `spec` is
  // the one term that lifts it. It is not scaled by F0, so it has to be set as
  // the plastic's own reflectance: at 0.09 the first cut came back as a
  // mid-grey moulding (the hood measured p95 0.17 against the pad's 0.35),
  // the same order as the metals' term. A black plastic reflects 4 per cent of
  // what falls on it, so the term sits at 0.03 and the rest of the read is the
  // sun patch and the environment on the 0.35 lobe. No grain, no craze:
  // injection-moulded plastic is smooth under its peel, and the peel is on the
  // normal map.
  consoleAbs: {
    gain: 2.4,
    side: 0.4,
    up: 0.3,
    occ: 0.2,
    spec: 0.03,
    sun: 2.2,
    fill: 0.9,
    dust: 0.15,
    craze: 0,
    grain: 0,
    soil: 0.5,
    sat: 1,
    tint: [1, 1, 1],
  },
  // The only true black in the cabin, and the thing every dark brown in here
  // needed to be dark against: channels, pedal pads, the gaiter, the loom and
  // the lever shafts.
  //
  // It was not being any of that. Measured off the console camera, the gear
  // lever shaft rendered at sRGB 58,50,41 against the tan vinyl lid beside it
  // at 105,72,41 — the key named as the cabin's true black sitting at more than
  // half the value of the palest panel in the cab, on the one shape least able
  // to hide it. A 250 mm vertical cylinder 300 mm from the lens has its whole
  // read in the gradient across it, and there was no gradient: two white tubes
  // standing out of the console.
  //
  // The whole of it is in these six terms, and none of it is in the albedo:
  // zeroing gain, side, up, fill and sun took the same pixel to 9,9,11, and
  // taking the tint from 0.36 to 0.17 moved it by two counts. That is the cab
  // lighting a lever the way it lights a dash pad. A lever is 700 mm under the
  // screen in clear air and does collect a real aperture term, so the terms are
  // halved rather than removed — what is wrong is the amount, not the model.
  rubber: {
    gain: 0.5,
    side: 0.1,
    up: 0.06,
    occ: 0.14,
    spec: 0.12,
    sun: 0.4,
    fill: 0.16,
    dust: 0.12,
    grain: 0.26,
    sat: 0.35,
    tint: [0.36, 0.38, 0.42],
  },
  // The largest single surface in the frame, facing down, 1.5 m from the only
  // opening and looking away from it. Almost everything it had was hemisphere
  // and shared bounce, and both of those are things a roof panel 70 mm above it
  // should be in the way of, hence the lowest floor in the table.
  // Cool and low-saturation separated it from the pad, but taken as far as it
  // was — a 15 per cent blue lift on a key with the saturation nearly all the
  // way out — the top quarter of the frame came back as dead grey plastic
  // rather than as cloth. The separation now comes from the bounce profile
  // instead: a low base with a high `up` puts a real front-to-back gradient
  // across the liner, which is what actually distinguishes a ceiling from a
  // dash top, and the hue only has to be a shade cooler than the vinyl.
  headliner: { gain: 0.5, side: 0.34, up: 2.35, occ: 0.24, sun: 1.4, fill: 1.15, grain: 0.3, sat: 0.34, tint: [1.02, 1.02, 1.03] },
  // Cloth: the seats, the door card inserts, the map pouch and the rag on the
  // pad. The band comes down 300 mm because a seat is behind the dash rather
  // than under it — see `CL_Y0` — and the shaft comes off hard to pay for it.
  // At 3.1 a sun patch was already the brightest thing on the seat, and with
  // the aperture term restored it would have been 2.8x that: cloth is the one
  // surface in here that has to stay matte, so its sun term is now below the
  // vinyl's rather than above it.
  // The split between `gain` and `fill` is what decides whether a seat has a
  // form. Weighted the other way — 2.5 against 1.75 — two thirds of the cloth's
  // light arrived isotropically and a sculpted backrest rendered as one flat
  // value with a bright seam down it: the bolsters were there in the geometry
  // and invisible in the frame. The aperture term is the only one in here with
  // a real terminator, so cloth now takes most of its light from it.
  //
  // The tint runs above 1 on purpose. It is a linear multiplier on an albedo
  // that comes out of the shared atlas at roughly 3.5 per cent, and no amount
  // of light makes a 1.5 per cent surface read as anything but a hole.
  fabric: {
    gain: 5.0,
    side: 0.5,
    up: 0.34,
    occ: 0.15,
    sun: 1.15,
    fill: 1.15,
    dust: 0.26,
    grain: 0.42,
    sat: 0.46,
    y0: 0.56,
    y1: 1.2,
    // khaki cloth is allowed to stay warm; it is the one thing in here that is
    tint: [1.62, 1.58, 1.48],
  },
  // The pan sits at 0.66, which the default band scores at zero, so the mat was
  // taking the footwell floor on every term at once and measured 0.023 mean
  // against a frame mean of 0.15 — crushed, not dark. A rubber mat in shade is
  // the darkest thing in a cab and still has a weave in it.
  floorMat: {
    gain: 1.5,
    side: 0.16,
    up: 0.05,
    occ: 0.15,
    sun: 1.2,
    fill: 0.86,
    dust: 0.6,
    grain: 0.42,
    sat: 0.28,
    y0: 0.5,
    y1: 1.15,
    tint: [0.44, 0.46, 0.48],
  },
  // A raised bead of thread sitting proud of the panel it is sewn to, so it is
  // the one part of an upholstered surface that is *lighter* than its ground.
  // Held to about 1.4x that ground and no more. Driven up to three times it,
  // which is where it was, the welts stopped reading as thread: measured off the
  // ID pass they were 8 per cent of the frame with their thread pixels at 0.78
  // against a pad at 0.30, and four of them running near-parallel across the
  // shot read as lane markings painted on the dash.
  // Tracks the cloth's height band, or the piping round a seat insert goes
  // dark while the panel either side of it is lit and the seam inverts.
  stitch: {
    gain: 3.9,
    side: 0.44,
    up: 0.26,
    occ: 0.22,
    sun: 1.5,
    fill: 1.7,
    dust: 0.35,
    grain: 0.2,
    sat: 0.6,
    y0: 0.56,
    y1: 1.2,
    tint: [0.98, 0.94, 0.88],
  },
  // The dial faces stay dark or the instrument backlight stops reading as one,
  // and this is the one key that must not be tinted: it is the drawn atlas, so
  // its albedo is the gauge printing, the switch legends and the warning lamps.
  // Raised once the pointers went in. The face albedo is 0x0e0f11 and the
  // printing on it is 0xefe7d6 — a fifty to one ratio — so what this dial
  // actually controls is how much of the *printing* the daylight finds. Held
  // where it was, the only thing on a dial with any value was the backlight,
  // and a cluster whose scale is legible only because it is glowing is a night
  // cluster whatever time it is.
  cabinPanel: { gain: 1.9, up: 0.2, occ: 0.34, sun: 0.9, fill: 1.05, soil: 0 },
  cabinGlass: { gain: 0.72, up: 0.04, occ: 0.36, spec: 0.5, sun: 1.05, fill: 0.3, soil: 0 },
  louvre: { gain: 1.8, side: 0.3, up: 0.1, occ: 0.2, spec: 0.2, sun: 2.0, fill: 0.5, sat: 0.35, tint: [0.5, 0.52, 0.55] },
  // The rim is 500 mm of swept circular section across the bottom of the frame
  // and its normal map is built for a panel seen from 300 mm, so at this scale
  // it renders as a smooth tube. The grain term is the only detail it has.
  wheelRim: { gain: 3.7, side: 0.5, up: 0.14, occ: 0.19, sun: 2.6, fill: 2.3, dust: 0.2, grain: 0.46, sat: 0.3, tint: [0.5, 0.51, 0.54] },
  // Polished leather is *dark* and glossy, not pale, and this key already
  // carries a brightwork sheen from the shared library. Adding a specular lobe
  // on top of that turned both worn arcs of the rim white and the wheel read as
  // a plastic tube with tape wrapped round it.
  wheelWorn: { gain: 2.0, side: 0.35, up: 0.18, occ: 0.2, spec: 0.12, sun: 1.7, fill: 0.35, sat: 0.35, tint: [0.62, 0.61, 0.6] },
  // The four keys below are the ceiling's clutter as well as the cabin's
  // brightwork, so their bounce term is the one that has to carry the overhead
  // console, the grab handle and the loom out of the liner behind them.
  trim: { gain: 4.6, side: 0.6, up: 0.46, occ: 0.16, sun: 4.6, fill: 2.7, dust: 0.3, grain: 0.16, sat: 0.4, tint: [0.92, 0.94, 0.99] },
  trimGloss: {
    gain: 1.9,
    side: 0.4,
    up: 0.4,
    occ: 0.19,
    spec: 0.15,
    sun: 2.2,
    fill: 0.35,
    dust: 0.25,
    sat: 0.4,
    tint: [0.7, 0.72, 0.77],
  },
  // Seat frames and rails, the pedal arms, the cage feet and every rivet and
  // bolt in the cab.
  //
  // The tint is the load-bearing number and it is here rather than in the
  // library because the same key is the grille, the bumper, the brush bar and
  // the rock sliders, and this table is the only place a cabin instance can be
  // separated from those. `materials.js` gives the key `applyBrightwork` with
  // `ambient: 2.1` — skylight paid straight into the diffuse lobe, set that high
  // to reach into the grille recess, and with no box gate on it. So the seat
  // frame under the cushion, which can see no sky whatsoever, was collecting
  // twice plain reflectance of it and rendering as a white scaffold: from the
  // footwell the crossmember and both rails came out as the brightest objects
  // in the frame by a factor of five. The one thing that term scales with is
  // albedo, and albedo inside the cab is what this line sets.
  steelDark: {
    gain: 2.0,
    side: 0.4,
    up: 0.4,
    occ: 0.19,
    spec: 0.28,
    sun: 2.2,
    fill: 0.3,
    dust: 0.35,
    sat: 0.35,
    tint: [0.36, 0.37, 0.4],
  },
  chrome: { gain: 1.6, up: 0.3, occ: 0.24, spec: 0.85, sun: 2.2, fill: 0.2, sat: 0.3, tint: [0.88, 0.9, 0.95] },
  // Measured at 0.575 mean against a frame mean of 0.19, the highest of any key
  // and all of it the travel mug: a 50-pixel white cylinder in the emptiest
  // third of the shot. Brushed alloy in shade is a mid grey with one hot streak
  // down it, so the diffuse comes off and the specular stays.
  alu: { gain: 0.8, side: 0.25, up: 0.16, occ: 0.2, spec: 0.5, sun: 0.9, fill: 0.1, dust: 0.35, sat: 0.3, tint: [0.5, 0.52, 0.56] },
  paper: { gain: 2.6, side: 0.4, up: 0.45, occ: 0.23, sun: 2.4, fill: 0.3, dust: 0.4, sat: 0.55, tint: [0.76, 0.76, 0.75] },
  // Shadow gaps stay the darkest thing in here, but a floor of 0.1 took four per
  // cent of the frame under 0.02 and every panel line went from a shadow to a
  // hole cut in the dash. Overcorrected once: at a tint of 1.35 the gaps down
  // the A-pillar measured 0.40 against the trim either side of them at 0.02, so
  // the shadow lines were the *brightest* thing on the pillar and read as strip
  // lighting let into it.
  gap: { gain: 0.65, up: 0.07, occ: 0.17, sun: 0.22, fill: 1.3, sat: 0.5, tint: [0.98, 0.99, 1.04] },
};

/** Chain an onBeforeCompile patch without dropping whatever is already there. */
function extendCabin(material, tag, patch) {
  const prev = material.onBeforeCompile;
  const prevKey = material.customProgramCacheKey;
  material.onBeforeCompile = function (shader, renderer) {
    if (prev) prev.call(this, shader, renderer);
    patch(shader, renderer);
  };
  material.customProgramCacheKey = function () {
    return `${prevKey ? prevKey.call(this) : ''}|${tag}`;
  };
  return material;
}

function applyCabinLight(
  material,
  {
    tag = 'cl',
    gain = 0.6,
    side = null,
    up = 0.1,
    spec = 0,
    occ = 0.4,
    sun = 0,
    fill = 0,
    dust = 0,
    craze = 0,
    grain = 0,
    // Grime, as a fraction of the library's. One for the surfaces boots and
    // hands soil — floor, rubber, brackets — half on the moulded vinyl, and
    // zero on the dial faces and their cover glass. See the soil term below.
    soil = 1,
    tint = null,
    sat = 1,
    // The height band the dash's occlusion is modelled by. Compiled in rather
    // than uniform because every key already gets its own program.
    y0 = CL_Y0,
    y1 = CL_Y1,
    // Near-neutral. The glass critics read the cabin as amber through every
    // pane, and with the tint of the glass now near-black the cast was coming
    // from in here: a cream key (0xf7ead0) and an orange shaft (0xffdc9e) on
    // top of warm vinyl and a laterite film. Daylight through a screen is white
    // with a little warmth from the trail bounce, so the key sits just off
    // white and the shaft is the colour of the sun rather than of a sunset.
    color = 0xf3f0e8,
    // The screen looks at open sky over a pale trail; the door glass looks at
    // conifer forest 3 m away. Giving the two apertures one colour was what kept
    // the whole cabin on a single khaki hue however the values were pushed —
    // there was no second light in here for anything to be a different colour
    // *under*. A cool green fill from the sides against a warm key from the
    // front is both what the scene actually is and the cheapest hue separation
    // available.
    sideColor = 0x86948a,
    sunColor = 0xfff0d6,
  } = {},
) {
  if (!material || material.userData.cabinLit) return material;
  material.userData.cabinLit = true;
  const u = {
    uClColor: { value: new THREE.Color(color) },
    uClSideColor: { value: new THREE.Color(sideColor) },
    uClSunColor: { value: new THREE.Color(sunColor) },
    uClGain: { value: gain },
    uClSide: { value: side === null ? gain * 0.3 : side },
    uClUp: { value: up },
    uClSpec: { value: spec },
    uClOcc: { value: occ },
    uClSun: { value: sun },
    uClFill: { value: fill },
    uClDust: { value: dust },
    uClCraze: { value: craze },
    uClGrain: { value: grain },
    uClSoil: { value: soil },
    // Linear multipliers, not an sRGB hex: this scales an albedo that is already
    // in working space, so running it through the colour-space convert would
    // darken every value by roughly its own gamma.
    uClTint: { value: new THREE.Vector3(...(tint || [1, 1, 1])) },
    uClSat: { value: sat },
    // Recentred panes (see `emitPieces`) carry their own origin; this puts the
    // object-space position the gate and the aperture terms read back into the
    // cab's frame. Zero for every merged mesh.
    uClOff: { value: new THREE.Vector3() },
  };
  material.userData.cl = u;
  return extendCabin(material, `cl:${tag}:${spec > 0 ? 1 : 0}:${y0}:${y1}`, (shader) => {
    Object.assign(shader.uniforms, u);

    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform vec3 uClOff;
        varying vec3 vClPos;
        varying vec3 vClNrm;
        varying vec3 vClSun;`,
      )
      .replace(
        '#include <beginnormal_vertex>',
        `#include <beginnormal_vertex>
        vClPos = position + uClOff;
        vClNrm = objectNormal;
        // world -> object for a rigid transform is the transpose, which is what
        // a row-vector product against the model matrix gives.
        vClSun = ${v3(CL_SUNDIR)} * mat3( modelMatrix );`,
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform vec3 uClColor;
        uniform vec3 uClSideColor;
        uniform vec3 uClSunColor;
        uniform float uClGain;
        uniform float uClSide;
        uniform float uClUp;
        uniform float uClSpec;
        uniform float uClOcc;
        uniform float uClSun;
        uniform float uClFill;
        uniform float uClDust;
        uniform float uClCraze;
        uniform float uClGrain;
        uniform float uClSoil;
        uniform vec3 uClTint;
        uniform float uClSat;
        varying vec3 vClPos;
        varying vec3 vClNrm;
        varying vec3 vClSun;

        // The box gate, in object space. Every cabin term is inside it and
        // nothing outside the cab may move, because most of these material keys
        // are shared with the body.
        float clInside( vec3 p ) {
          vec3 e = abs( p - ${v3(CL_CTR)} ) - ${v3(CL_HALF)};
          return ( 1.0 - smoothstep( -0.07, 0.02, e.x ) )
               * ( 1.0 - smoothstep( -0.07, 0.02, e.y ) )
               * ( 1.0 - smoothstep( -0.07, 0.02, e.z ) );
        }

        // Does the ray p + t*l leave the cabin through this pane? Written
        // branch-free: the denominator is clamped away from zero and the result
        // is gated afterwards, so a ray parallel to the pane cannot divide by
        // nothing and put a NaN into the bloom.
        float clPane( vec3 p, vec3 l, vec3 o, vec3 n, vec3 u, vec2 hw ) {
          float dn = dot( l, n );
          float t = dot( o - p, n ) / min( dn, -0.04 );
          vec3 h = p + l * t - o;
          vec2 q = abs( vec2( dot( h, u ), dot( h, cross( n, u ) ) ) ) - hw;
          return ( 1.0 - smoothstep( -0.09, 0.03, q.x ) )
               * ( 1.0 - smoothstep( -0.09, 0.03, q.y ) )
               * step( 0.0, t ) * step( dn, -0.04 );
        }

        float clHash( vec3 p ) {
          p = fract( p * 0.3183099 + 0.1 );
          p *= 17.0;
          return fract( p.x * p.y * p.z * ( p.x + p.y + p.z ) );
        }

        float clNoise( vec3 x ) {
          vec3 i = floor( x );
          vec3 f = fract( x );
          f = f * f * ( 3.0 - 2.0 * f );
          return mix(
            mix( mix( clHash( i ), clHash( i + vec3( 1, 0, 0 ) ), f.x ),
                 mix( clHash( i + vec3( 0, 1, 0 ) ), clHash( i + vec3( 1, 1, 0 ) ), f.x ), f.y ),
            mix( mix( clHash( i + vec3( 0, 0, 1 ) ), clHash( i + vec3( 1, 0, 1 ) ), f.x ),
                 mix( clHash( i + vec3( 0, 1, 1 ) ), clHash( i + vec3( 1, 1, 1 ) ), f.x ), f.y ), f.z );
        }`,
      )
      .replace(
        '#include <map_fragment>',
        `#include <map_fragment>
        float clIn = clInside( vClPos );
        // Albedo separation. Nearly every surface in here comes off two vinyl
        // atlases and one fabric atlas, so straight out of the shared library
        // the wheel rim, the floor mat, the door card and the dash pad were all
        // the same hue at the same saturation and the cabin measured as one
        // khaki mass. The library is not this agent's to change and the same
        // keys dress the outside of the truck, so the split is done here, inside
        // the box gate: desaturate towards the surface's own luminance, then
        // multiply by a per-key colour. Rubber and webbing go neutral and dark,
        // cloth goes cool, the pad tops stay warm.
        if ( clIn > 0.002 ) {
          float clLum = dot( diffuseColor.rgb, vec3( 0.2126, 0.7152, 0.0722 ) );
          diffuseColor.rgb = mix(
            diffuseColor.rgb,
            mix( vec3( clLum ), diffuseColor.rgb, uClSat ) * uClTint,
            clIn );
        }`,
      )
      .replace(
        '#include <lights_fragment_maps>',
        `        float clOcc = 1.0;
        vec3 clAdd = vec3( 0.0 );
        vec3 clSpc = vec3( 0.0 );
        #include <lights_fragment_maps>
        {
          // Screen-space curvature of the vertex normal, for the soil term:
          // radians of turn per pixel, so a seam, a moulding edge or the lip
          // of the dash scores high and the flat of a panel scores nothing.
          // Taken outside the gate because derivatives inside a branch that
          // not every pixel of the quad takes are undefined.
          vec3 clDN = abs( dFdx( vClNrm ) ) + abs( dFdy( vClNrm ) );
          float clCurv = clamp( ( clDN.x + clDN.y + clDN.z ) * 3.0, 0.0, 1.0 );
          if ( clIn > 0.002 ) {
            vec3 clN = normalize( vClNrm );
            vec3 clToC = ${v3(CL_CTR)} - vClPos;
            float clIntoCab = dot( clN, clToC / max( length( clToC ), 1e-4 ) );
            // Strict inward test, for the terms that would otherwise reach the
            // outside of the truck through a shared material key.
            float clFace = clamp( ( clIntoCab + 0.5 ) / 1.5, 0.0, 1.0 );
            // The aperture term cannot use it. The dash pad faces up and the
            // cabin centre is 100 mm below the pad, so the strict test scored the
            // single most-lit surface in the cab at 0.24 and the whole point of
            // the light went with it. n.l against the aperture already rejects
            // anything pointing out of the cab, so this only has to stop a back
            // face.
            float clOpen = clamp( clIntoCab * 0.3 + 0.92, 0.32, 1.0 );
            vec3 clToAp = ${v3(CL_AP)} - vClPos;
            float clR = length( clToAp );
            vec3 clL = clToAp / max( clR, 1e-4 );
            // the screen is a metre wide seen from 400 mm, so the terminator wraps
            float clNL = clamp( ( dot( clN, clL ) + ${f1(CL_WRAP)} ) / ${f1(1 + CL_WRAP)}, 0.0, 1.0 );
            // cosine at the source: a face the glass cannot see gets nothing
            float clSrc = clamp( dot( -clL, ${v3(CL_APN)} ) * 1.3 + 0.18, 0.0, 1.0 );
            float clF = clR / ${f1(CL_REACH)};
            float clFall = 1.0 / ( 1.0 + clF * clF );
            float clH = smoothstep( ${f1(y0)}, ${f1(y1)}, vClPos.y );
            float clAp = clNL * clSrc * clFall * mix( ${f1(CL_DEEP)}, 1.0, clH ) * clOpen;

            // Door glass, folded about the centreline so one evaluation covers
            // both. The pane faces inboard, so the source cosine is just the x of
            // the light vector.
            float clSgn = vClPos.x < 0.0 ? -1.0 : 1.0;
            vec3 clToS = ${v3(CL_SIDE)} - vec3( vClPos.x * clSgn, vClPos.y, vClPos.z );
            float clRs = length( clToS );
            vec3 clLs = clToS / max( clRs, 1e-4 );
            float clNLs = clamp( ( dot( vec3( clN.x * clSgn, clN.y, clN.z ), clLs ) + ${f1(CL_WRAP)} ) / ${f1(1 + CL_WRAP)}, 0.0, 1.0 );
            float clSrcS = clamp( clLs.x * 1.25 + 0.1, 0.0, 1.0 );
            float clFs = clRs / ${f1(CL_SIDEREACH)};
            float clSide = clNLs * clSrcS / ( 1.0 + clFs * clFs ) * mix( ${f1(CL_DEEP)}, 1.0, clH ) * clOpen;

            vec3 clToU = ${v3(CL_UP)} - vClPos;
            float clRu = length( clToU );
            vec3 clLu = clToU / max( clRu, 1e-4 );
            float clFu = clRu / 0.66;
            float clUp = clamp( ( dot( clN, clLu ) + 0.2 ) / 1.2, 0.0, 1.0 )
                       / ( 1.0 + clFu * clFu )
                       * clamp( -clN.y * 1.3 + 0.32, 0.0, 1.0 ) * clFace;

            // Shaft. Traced against the screen and both door panes; the height
            // term stands in for the dash, which is the one occluder inside the
            // cab big enough to matter and would otherwise let sun into a
            // footwell it cannot reach.
            float clSunAmt = 0.0;
            if ( uClSun > 0.0 ) {
              vec3 clS = normalize( vClSun );
              // Steeper than Lambert. A cab has no shadow caster in it that this
              // can trace against, so with plain n.l every up-facing surface came
              // back at the same value and the shaft read as an exposure change
              // rather than a light with a direction. Squared was too far — it
              // took the dash pad with it — so this sits between the two.
              float clSunNL = max( dot( clN, clS ), 0.0 );
              clSunNL *= 0.35 + 0.65 * clSunNL;
              if ( clSunNL > 0.002 ) {
                float clPatch = clPane( vClPos, clS, ${v3(CL_SUNAP)}, ${v3(CL_APN)}, vec3( 1.0, 0.0, 0.0 ), ${v2(CL_SUNAPH)} );
                clPatch = max( clPatch, clPane( vClPos, clS, ${v3(CL_SIDE)}, vec3( -1.0, 0.0, 0.0 ), vec3( 0.0, 0.0, 1.0 ), ${v2(CL_SIDEH)} ) );
                clPatch = max( clPatch, clPane( vClPos, clS, ${v3([-CL_SIDE[0], CL_SIDE[1], CL_SIDE[2]])}, vec3( 1.0, 0.0, 0.0 ), vec3( 0.0, 0.0, 1.0 ), ${v2(CL_SIDEH)} ) );
                clSunAmt = clPatch * clSunNL * uClSun * clOpen * mix( 0.22, 1.0, clH );
              }
            }

            // Enclosure. How much of the opening this surface faces is how much
            // sky it gets, and everything indirect is scaled to it.
            float clSee = clamp( clNL * clSrc + 0.75 * clNLs * clSrcS, 0.0, 1.0 ) * mix( 0.34, 1.0, clFall );
            clOcc = mix( 1.0, uClOcc + ( 1.0 - uClOcc ) * clSee, clIn * clFace );

            // Grime, in object space so it does not swim. Applied to the shading
            // rather than the albedo: on a surface lit almost entirely by
            // indirect the two are the same read, and this way it costs one
            // multiply instead of a second gated block up at map_fragment.
            //
            // Two tilings, and a mask. This used to be one blend of a 300 mm
            // and an 80 mm field at a fixed 0.78–1.1 swing on every cabin key,
            // and critic B's note on the interior frames was exactly that: the
            // dash, the pillars, the column and the door cards all carrying the
            // same high-frequency mottle at the same amplitude, reading as
            // dirt-splat noise rather than as wear. Dirt in a cab is not even.
            // It collects where nothing wipes it — in the seams, under the dash
            // lip, in the footwell, on the underside of everything — and the
            // open faces a sleeve crosses stay comparatively clean. So the
            // coarse field stays as a low tone drift over the whole cab, and
            // the fine field is gated to where dirt collects: the pockets the
            // aperture cannot see (clSee, the same enclosure term the light
            // uses) and the edges (clCurv). uClSoil is the per-key amplitude:
            // half on the moulded vinyl, none on the dial faces.
            float clFine = clNoise( vClPos * 12.0 );
            float clFine2 = clNoise( vClPos * 29.0 + 7.0 );
            float clPocket = clamp( 1.0 - clSee * 1.7, 0.0, 1.0 );
            float clCollect = clamp( clPocket * 0.85 + clCurv * 0.7, 0.0, 1.0 );
            float clSoil = 1.0 + uClSoil * 0.07 * ( clNoise( vClPos * 3.3 ) * 2.0 - 1.0 );
            clSoil *= 1.0 - uClSoil * clCollect * ( 0.16 + 0.2 * clFine + 0.1 * clFine2 );
            clOcc *= clSoil;
            // Moulded grain. Every surface in here carries a normal map built
            // for a panel seen from 300 mm, and the dash sits at 700 and the
            // liner at 1100: one map texel lands well under a pixel and the two
            // largest surfaces in the frame both render as smooth gradients.
            // This is the same pattern at the scale the *frame* needs — cells
            // about 18 mm across, which is five pixels on the pad — and it goes
            // in as shading rather than as a normal, because a normal at that
            // frequency turns into crawling sparkle the moment the truck moves.
            // The creases between the cells carry most of it; the speckle on top
            // is what stops the cells reading as a regular lattice.
            // Scales the cabin's own terms as well as the base indirect. On a
            // face the aperture cannot reach there is almost no base indirect
            // left to modulate, so the surfaces that need moulded texture most —
            // the pillar trim, the fascia, the underside of everything — were
            // the only ones not getting any.
            float clGrainF = 1.0;
            if ( uClGrain > 0.0 ) {
              float clCrease = smoothstep( 0.3, 0.0, abs( clNoise( vClPos * 58.0 ) * 2.0 - 1.0 ) );
              float clSpeck = clNoise( vClPos * 132.0 + 5.0 );
              // Crease weight 0.85 to 0.5 and speckle 0.45 to 0.3 (round 4):
              // at the old weights the crease net alone took a fifth of the
              // value off every vinyl surface in a 17 mm lattice, which on the
              // column shroud and the fascia at 700 mm is five-pixel cells —
              // the crackle B saw. The net stays; it is the moulding.
              clGrainF = 1.0 - uClGrain * ( 0.5 * clCrease + 0.3 * ( 0.5 - clSpeck ) );
              clOcc *= clGrainF;
            }
            // Trail dust, on the up-facing half of everything and heaviest where
            // the glass bakes it. Added as scattered light rather than mixed into
            // the albedo: the shared library already tints the pad tops, and a
            // second coat of tan on top of that flattened them. What was actually
            // missing was the way a dust film *catches* the light and turns a
            // horizontal surface pale in blotches.
            float clDust = uClDust * clamp( clN.y, 0.0, 1.0 ) * clH
                         * clamp( clFine * 1.5 - 0.28, 0.0, 1.0 ) * ( 0.35 + 0.65 * clAp );
            // Crazing. Twenty summers of the sun coming through the screen
            // splits the vinyl on whatever faces it, in a net of hairlines that
            // is nowhere else in the cab. Ridged noise thresholded hard: the
            // ridges of value noise are continuous lines, which is what a crack
            // net is and what a blotch map cannot be.
            float clCrz = 1.0;
            if ( uClCraze > 0.0 ) {
              // The zero crossings of a value-noise field are continuous curves,
              // which is the right primitive for a crack. One field of them is
              // not: at a 42 mm lattice a single set drew half a dozen isolated
              // meanders and closed loops across the whole pad and read as hair
              // dropped on it. Alligatored vinyl is a *net* — short segments
              // meeting at junctions, cells a couple of centimetres across — so
              // this is the union of three fields at stepped frequencies. Union,
              // not product: multiplying two line sets keeps only where they
              // cross, which is speckle, and that was the version before last.
              vec3 clCP = vClPos * 34.0;
              float clNet = 1.0 - smoothstep( 0.0, 0.13, abs( clNoise( clCP ) * 2.0 - 1.0 ) );
              clNet = max( clNet, 1.0 - smoothstep( 0.0, 0.13, abs( clNoise( clCP * 1.71 + 11.0 ) * 2.0 - 1.0 ) ) );
              clNet = max( clNet, 0.7 * ( 1.0 - smoothstep( 0.0, 0.1, abs( clNoise( clCP * 3.1 + 27.0 ) * 2.0 - 1.0 ) ) ) );
              // Where. Two gates: a coarse field so it comes in patches rather
              // than evenly, and the aperture term, because what splits vinyl is
              // the sun through the screen and the parts of the pad that cannot
              // see the screen do not craze. The patch field has to be fine
              // enough to vary across the pad — at its first frequency one
              // lattice cell was 290 mm, so the 350 mm of pad in frame sampled a
              // single value of it and driving the weight up ten times moved
              // 1.8 per cent of the frame, none of it the dash.
              float clWhere = 0.28 + 0.72 * smoothstep( 0.32, 0.66, clNoise( vClPos * vec3( 7.5, 3.0, 7.5 ) + 31.0 ) );
              clCrz = 1.0 - uClCraze * 0.5 * clWhere * clamp( clN.y * 1.4, 0.0, 1.0 ) * clH
                    * mix( 0.3, 1.0, clAp ) * clNet;
              clOcc *= clCrz;
            }
            // Second bounce. Everything above traces a straight line to an
            // opening, so a surface with its back to the glass — the fascia, the
            // inboard face of a pillar, the walls of every shadow gap — collects
            // nothing from any of it, and the frame came out as one lit pad
            // against black: the pad measured 0.35 against 0.10 for the fascia,
            // which is eight to one in linear and about three times what a
            // photograph of a cab has. Raising the enclosure floor did not touch
            // it, because there is barely any hemisphere or IBL left in here to
            // scale. Inside a box whose walls are all mid-brown the once-bounced
            // light is close to isotropic, and on those surfaces it is most of
            // what they are actually lit by.
            // clFace is a visibility test against the cabin centre and it is
            // right for the aperture terms, but wrong here: it takes a surface
            // whose normal points outboard — the far side of every bar, tube and
            // bracket in the cab — to exactly zero, and since nothing else in
            // here is lighting them they went to black. Measured on the ID pass,
            // the whole trim key came back at 0.14 mean with its worst
            // stretches at 0.04 against a frame mean of 0.20, and that is 4.5 per
            // cent of the frame with no information in it. Once-bounced light in
            // a closed box does not care which way a face points, so the fill
            // keeps a floor.
            // Three floors, not one. Each of the three gates could still take the
            // term to nothing on its own — a back face deep in a corner far from
            // the glass multiplied them together and landed at four thousandths,
            // which is what the pillar trim and the shadow gaps were measuring.
            // A quarter of the key's fill goes in unconditionally instead, so the
            // darkest a surface can get is set by what it is rather than by
            // where it is pointing. The A-pillar's inboard face is the case that
            // sets this number: it points across the cab at the driver, the
            // driver is not a light source, and no aperture term can reach it —
            // what it is actually lit by is the whole rest of the cab, which is
            // the one thing here that is not directional.
            float clFill = uClFill * ( 0.5 + 0.5
                         * mix( 0.42, 1.0, clFace ) * mix( 0.22, 1.0, clH ) * ( 0.4 + 0.6 * clFall ) );
            vec3 clSoft = uClColor * ( uClGain * clAp + uClUp * clUp + clFill + clDust )
                        + uClSideColor * ( uClSide * clSide );
            vec3 clHot = uClSunColor * clSunAmt;
            clAdd = clSoil * clCrz * clGrainF * clIn * ( clSoft + clHot );
            // The shaft is nearly all out of the specular lobe. It went in at
            // full weight to start with, and on the four keys carrying a spec
            // above 1 — chrome, alloy, dark steel, worn leather — the sum of the
            // two came back white and every one of them stopped reading as metal.
            clSpc = clSoil * clIn * uClSpec * ( clSoft + clHot * 0.22 );
          }
        }`,
      )
      .replace(
        '#include <lights_fragment_end>',
        `#include <lights_fragment_end>
        reflectedLight.indirectDiffuse *= clOcc;
        reflectedLight.indirectSpecular *= mix( 1.0, clOcc, 0.6 );
        reflectedLight.indirectDiffuse += clAdd * BRDF_Lambert( material.diffuseColor );
        reflectedLight.indirectSpecular += clSpc;`,
      );
  });
}

/**
 * Grime on the inside of the windscreen, drawn straight into an RGBA canvas.
 *
 * A third of this frame is forest seen through the glass and the glass was
 * optically perfect, which is the one thing that is never true of a truck that
 * has been up a trail. Two things come out of fixing that. The obvious one is
 * wear: wiper arcs, a dust band round the edge of the swept area and a scatter
 * of grit is the most recognisable "this vehicle is used" signal available, and
 * it costs one plane. The less obvious one is that it is the only element in
 * the frame that sits *between* the camera and the background, so it separates
 * the cabin from the forest instead of the two meeting at a hard silhouette.
 *
 * Kept deliberately weak — a peak alpha of about a quarter in the corners and a
 * twentieth in the swept arcs. Anything stronger and it stops being dirt on
 * glass and starts being fog in the scene.
 */
function screenFilmTexture() {
  const W = 512;
  const H = 288;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  let seed = 20260728;
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  g.clearRect(0, 0, W, H);

  // Base film: blotchy dust, thicker down the sides and along the bottom where
  // the wipers never reach and the demister blows it.
  const img = g.createImageData(W, H);
  const d = img.data;
  // Lattice noise, wrapped. Arguments are in lattice cells, not in 0-1: the
  // first cut of this scaled the argument by the lattice size inside the
  // lookup and then clamped the index, so every octave above the first sampled
  // one cell with an interpolant of up to nineteen. The alpha channel that came
  // out of it was junk, and the layer rendered as a scatter of grit with no
  // film under it at all.
  const lat = 32;
  const grid = [];
  for (let i = 0; i < lat * lat; i++) grid.push(rnd());
  const at = (i, j) => grid[((((j % lat) + lat) % lat) * lat) + (((i % lat) + lat) % lat)];
  const val = (x, y) => {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const tx = x - ix;
    const ty = y - iy;
    const sx = tx * tx * (3 - 2 * tx);
    const sy = ty * ty * (3 - 2 * ty);
    const a = at(ix, iy);
    const b = at(ix + 1, iy);
    const e = at(ix, iy + 1);
    const f = at(ix + 1, iy + 1);
    return (a + (b - a) * sx) * (1 - sy) + (e + (f - e) * sx) * sy;
  };
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const u = x / W;
      const v = y / H;
      const blotch =
        0.45 * val(u * 5, v * 3) + 0.33 * val(u * 13 + 0.3, v * 8) + 0.22 * val(u * 31 + 0.7, v * 18);
      // Edge weighting: corners and the bottom band are the dirtiest. The
      // constant term matters more than the ramp does, because the only part
      // of the pane this framing actually shows is the middle of it — with the
      // floor at 0.16 the film peaked at an alpha of six per cent everywhere
      // it was in shot and the whole layer was invisible.
      const ex = Math.max(0, 1 - Math.min(u, 1 - u) * 3.4);
      const ey = Math.max(0, 1 - Math.min(v, 1 - v) * 4.2);
      const edge = Math.min(0.6, ex * 0.34 + ey * 0.38 + 0.26);
      // wipers: two blades pivoting off the bottom edge, so the clean region is
      // the union of two annular sectors
      // The same two arcs the body's pane draws (`glassLayerMap('screen')`),
      // mirrored: this plane is turned to face the cab, so its u runs the other
      // way along the screen. Both blades park along the bottom edge and sweep
      // up and over, so between them they clear the whole width.
      let swept = 0;
      for (const [pu, pv, a0, a1, r0, r1] of [
        [0.7, 1.16, 0.59, 3.13, 0.22, 0.98],
        [0.24, 1.16, 0.69, 3.13, 0.2, 0.78],
      ]) {
        const dx = u - pu;
        const dy = (v - pv) * (H / W);
        const r = Math.hypot(dx, dy);
        const ang = Math.atan2(-dy, dx);
        if (ang > a0 && ang < a1 && r > r0 && r < r1) {
          const eA = Math.min(ang - a0, a1 - ang);
          const eR = Math.min(r - r0, r1 - r);
          swept = Math.max(swept, Math.min(1, eA * 30) * Math.min(1, eR * 48));
        }
      }
      // streaks inside the swept band: the blade leaves fine arcs behind it
      const streak = swept * (0.5 + 0.5 * Math.sin((u * 46 + v * 9) * Math.PI));
      let a = (0.1 + 0.62 * blotch) * edge;
      a *= 1 - 0.82 * swept;
      a += 0.035 * streak;
      // sun on the dust: the shaft comes over the driver's shoulder, so the
      // film is brightest at the +x edge, which is canvas left.
      const lit = 0.82 + 0.32 * (1 - u);
      const p = (y * W + x) * 4;
      d[p] = Math.min(255, 214 * lit);
      d[p + 1] = Math.min(255, 205 * lit);
      d[p + 2] = Math.min(255, 186 * lit);
      d[p + 3] = Math.max(0, Math.min(255, a * 255 * 0.66));
    }
  }
  g.putImageData(img, 0, 0);

  // grit and dried splashes, mostly outside the swept arcs
  g.globalCompositeOperation = 'source-over';
  for (let i = 0; i < 210; i++) {
    const x = rnd() * W;
    const y = rnd() * H;
    const near = y > H * 0.62 || x < W * 0.1 || x > W * 0.9 ? 1 : 0.28;
    const r = 0.5 + rnd() * (1.6 + 2.6 * near);
    g.globalAlpha = (0.06 + rnd() * 0.16) * near;
    // Mostly dried trail dust, not soot. At three-quarters dark the grit was
    // pulling the average colour of the layer below the forest behind it and
    // the film read as a slight dimming rather than as anything on the glass.
    g.fillStyle = rnd() > 0.3 ? '#efe6d2' : '#4a4034';
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }
  // three or four smeared bug hits, with a tail wiped off to one side
  for (let i = 0; i < 4; i++) {
    const x = 40 + rnd() * (W - 80);
    const y = 20 + rnd() * (H * 0.55);
    g.globalAlpha = 0.14 + rnd() * 0.1;
    g.fillStyle = '#d9cfb4';
    g.beginPath();
    g.ellipse(x, y, 2.5 + rnd() * 3, 1.6 + rnd() * 1.6, rnd() * 3, 0, Math.PI * 2);
    g.fill();
    g.globalAlpha = 0.07;
    g.beginPath();
    g.ellipse(x + 9, y + 2, 11, 1.6, 0.15, 0, Math.PI * 2);
    g.fill();
  }
  g.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

/**
 * What the interior mirror is showing: sky over the tailgate, the top of the
 * load bed, and trail behind.
 *
 * The mirror is 230 mm of the middle of this frame with nothing but forest
 * behind it, and on the shared panel atlas it rendered at 0.04 luma — the
 * single darkest object in the shot, and a flat one. That is backwards. A
 * mirror is aimed out of the back window at open sky, so in any photograph of a
 * cab it is the *brightest* thing above the dash. Drawn rather than rendered:
 * a real reflection needs a second camera and a target, and at 230 by 66 mm the
 * only things that read are the horizon band and the frame of the rear window.
 */
function mirrorTexture() {
  const W = 256;
  const H = 72;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  let seed = 991733;
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  // The whole glass is the dark cab first, and the back light is a slot cut in
  // it. Filling the frame with sky-over-treeline made the mirror one bright
  // horizontal band, and at the 62 by 18 pixels it actually renders at, a band
  // is what it read as: the row of conifers along it downsampled to an evenly
  // pitched ripple and the whole thing looked like a printed border. What
  // identifies a mirror at that size is not its content, it is the slot — a
  // bright letterbox with the bench headrests standing up into it.
  g.fillStyle = '#191712';
  g.fillRect(0, 0, W, H);
  const sx0 = 6;
  const sy0 = 7;
  const sw = W - 12;
  const sh = H - 17;
  g.save();
  g.beginPath();
  g.rect(sx0, sy0, sw, sh);
  g.clip();

  const sky = g.createLinearGradient(0, sy0, 0, sy0 + sh);
  sky.addColorStop(0, '#7c878b');
  sky.addColorStop(0.34, '#69755f');
  sky.addColorStop(0.56, '#3d442d');
  sky.addColorStop(1, '#2b2a20');
  g.fillStyle = sky;
  g.fillRect(sx0, sy0, sw, sh);

  // Treeline as one continuous silhouette rather than a scatter of triangles.
  // Overlapping cones at a mean pitch of five pixels is a comb, and a comb
  // survives downsampling as a comb; a walked ridge with a long-wavelength term
  // under it survives as an irregular edge, which is the only thing the skyline
  // has to do here.
  const ridge = sy0 + sh * 0.34;
  g.fillStyle = '#2d3826';
  g.beginPath();
  g.moveTo(sx0, sy0 + sh);
  let hgt = 0;
  for (let px = sx0; px <= sx0 + sw; px += 2) {
    const t = (px - sx0) / sw;
    hgt = hgt * 0.55 + (Math.sin(t * 11.3) * 4 + Math.sin(t * 27.7 + 1.9) * 2.6 + (rnd() - 0.5) * 9) * 0.45;
    g.lineTo(px, ridge - 5 - hgt - Math.sin(t * 3.1) * 4);
  }
  g.lineTo(sx0 + sw, sy0 + sh);
  g.closePath();
  g.fill();
  // a second, nearer stand a shade darker, so the mass has depth in it
  g.fillStyle = '#20291c';
  g.beginPath();
  g.moveTo(sx0, sy0 + sh);
  hgt = 0;
  for (let px = sx0; px <= sx0 + sw; px += 2) {
    const t = (px - sx0) / sw;
    hgt = hgt * 0.6 + (Math.sin(t * 7.1 + 4.2) * 3 + (rnd() - 0.5) * 7) * 0.4;
    g.lineTo(px, ridge + 3 - hgt);
  }
  g.lineTo(sx0 + sw, sy0 + sh);
  g.closePath();
  g.fill();

  // The trail, running away to a vanishing point on the ridge, with the plume
  // the truck is towing sitting over it. This is the only part of the picture
  // that says the vehicle is moving.
  // The trail, running away to a vanishing point on the ridge. Kept close to
  // the treeline in value: at the 60 by 18 pixels the whole aperture renders at,
  // the only part of the trail that survives is the wedge showing between the
  // two headrests, so whatever value it is painted is what the middle of the
  // mirror reads as. The first pass ran a pale bed under seven overlapping dust
  // ellipses at a third alpha each, and where four of them stacked the canvas
  // reached 0.65 — one cream blob, dead centre, brighter than anything in the
  // cab. A mirror with a light in the middle of it is a screen.
  const vpx = W * 0.46;
  const trailGrad = g.createLinearGradient(0, ridge, 0, sy0 + sh);
  trailGrad.addColorStop(0, '#3a3728');
  trailGrad.addColorStop(1, '#474030');
  g.fillStyle = trailGrad;
  g.beginPath();
  g.moveTo(vpx - 5, ridge + 1);
  g.lineTo(vpx + 5, ridge + 1);
  g.lineTo(W * 0.82, sy0 + sh);
  g.lineTo(W * 0.14, sy0 + sh);
  g.closePath();
  g.fill();
  // The plume sits where dust actually hangs — over the trail at the vanishing
  // point, not across the foreground — and is one pass, not a stack.
  g.fillStyle = 'rgba(150,140,116,0.15)';
  for (let i = 0; i < 4; i++) {
    const t = rnd();
    g.beginPath();
    g.ellipse(vpx + (rnd() - 0.5) * sw * 0.22, ridge + 2 + t * sh * 0.16, 7 + t * 13, 3 + t * 5, 0, 0, Math.PI * 2);
    g.fill();
  }

  // Rear bench headrests, which from the driver's eye take up the bottom third
  // of anything the mirror shows. Two dark verticals across a horizontal band
  // is what stops it reading as a stripe — and they are the only thing in here
  // whose scale says the picture is a reflection of an interior rather than a
  // landscape print. Wide enough that the gap between them is a slot.
  for (const hx of [W * 0.28, W * 0.72]) {
    g.fillStyle = '#100f0c';
    g.beginPath();
    g.moveTo(hx - 27, sy0 + sh);
    g.lineTo(hx - 27, ridge + 8);
    g.quadraticCurveTo(hx - 27, ridge, hx - 18, ridge);
    g.lineTo(hx + 18, ridge);
    g.quadraticCurveTo(hx + 27, ridge, hx + 27, ridge + 8);
    g.lineTo(hx + 27, sy0 + sh);
    g.closePath();
    g.fill();
    // sky catching the crown, so the two are objects and not one dark mass
    g.fillStyle = 'rgba(122,126,116,0.5)';
    g.fillRect(hx - 20, ridge, 38, 1.4);
  }

  // dust film on the back light, heaviest in the corners. No wiper arc: a 3 px
  // stroke at a sixth alpha across the middle downsampled to one bright pixel
  // run and read as a scratch on the mirror rather than a swept screen.
  const haze = g.createRadialGradient(W * 0.5, H * 0.5, H * 0.25, W * 0.5, H * 0.5, W * 0.5);
  haze.addColorStop(0, 'rgba(170,164,144,0)');
  haze.addColorStop(1, 'rgba(170,164,144,0.26)');
  g.fillStyle = haze;
  g.fillRect(sx0, sy0, sw, sh);
  g.restore();

  // The aperture's own frame: rubber seal, then the pillar behind it.
  g.strokeStyle = '#0d0c0a';
  g.lineWidth = 2;
  g.strokeRect(sx0 + 1, sy0 + 1, sw - 2, sh - 2);
  // and the bevelled edge of the glass itself catching the cabin
  g.strokeStyle = 'rgba(150,148,138,0.5)';
  g.lineWidth = 1;
  g.strokeRect(1.5, 1.5, W - 3, H - 3);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

/**
 * A few surfaces in here are not on the truck anywhere else, so their materials
 * are built locally rather than added to the shared library. Both are cheap: the
 * paper is one flat colour with the vinyl grain at a low scale, and the dust film
 * is a single blotch map laid over the pad.
 */
let cachedExtras = null;
function cabinExtras() {
  if (cachedExtras) return cachedExtras;
  const grain = vinylMaps('faded');
  const woven = wovenCardMaps();
  const rub = rubberMaps();
  cachedExtras = {
    // Windscreen film. Unlit on purpose: it is a thin scattering layer, not a
    // surface, and running it through the standard model on a plane whose
    // normal points into a dark cab put it at a tenth of the value it needs.
    // The light direction it does carry is baked into the map.
    screenFilm: new THREE.MeshBasicMaterial({
      map: screenFilmTexture(),
      transparent: true,
      depthWrite: false,
      toneMapped: true,
      side: THREE.FrontSide,
    }),
    // Unlit for the same reason the film is: what a mirror shows is the
    // exterior, three stops up on anything the cabin light is allowed to reach.
    // Put through the cabin term it would be shaded by where the *glass* is
    // rather than by where the scene it reflects is.
    mirrorGlass: new THREE.MeshBasicMaterial({ map: mirrorTexture(), toneMapped: true }),
    // maps, roadbook pages, the service sticker on the visor
    paper: new THREE.MeshStandardMaterial({
      color: 0x8e8676,
      map: null,
      normalMap: grain.normal,
      normalScale: new THREE.Vector2(0.25, 0.25),
      roughness: 0.95,
      metalness: 0,
      envMapIntensity: 0.35,
    }),
    // Door furniture, split off `interiorFaded` so it can be held down. Both
    // dressed the cards *and* the dash pad, and measured against the ID pass
    // that one key was 14.6 per cent of the frame at a mean of 0.348 while the
    // next largest surface sat at 0.118 — a bright khaki mass down the left of
    // the shot with no ramp between it and everything else. The pad is supposed
    // to be the brightest thing in a cab and the cards are supposed to be dim,
    // and they cannot be both while they share a key.
    //
    // Round 5: woven, not vinyl. With the pad in faded vinyl, the fascia in
    // dark vinyl and the cards in the same dark vinyl a shade down, every large
    // surface in the cab was one grain at one roughness (critics A, B, C on the
    // interior frames). The cards take a coarse cloth over board instead —
    // hessian weight, roughness 0.9 — which is what a trim panel on a working
    // truck is anyway.
    cardWoven: new THREE.MeshStandardMaterial({
      map: woven.map,
      normalMap: woven.normal,
      roughnessMap: woven.rough,
      normalScale: new THREE.Vector2(1.0, 1.0),
      metalness: 0,
      roughness: 1.0,
      envMapIntensity: 0.3,
    }),
    // Black ABS (round 5): the binnacle carrier, cheeks, bezels and hood, the
    // centre stack, the column shroud and wheel spokes, the console box and the
    // overhead console. A dark plastic at roughness 0.35 with the sprayed-panel
    // peel on its normal at a third of the paint's amplitude — the highlight off
    // the screen lands on it as a soft, slightly wobbling band, which is the
    // one look nothing else in the cab has. It is also the only true dark
    // surface of any size in here, so the pad and the cards have something to
    // be lighter than.
    consoleAbs: new THREE.MeshStandardMaterial({
      color: 0x1c1d1f,
      normalMap: paintPeelNormal(),
      normalScale: new THREE.Vector2(0.3, 0.3),
      metalness: 0,
      roughness: 0.35,
      envMapIntensity: 0.55,
    }),
    // Instrument pointers. Deliberately not on the cabin light: every term in
    // that model is gated on an object-space box, and a needle has its own
    // transform, so `position` there is 60 mm from its own pivot rather than a
    // point in the cab and the whole gate switches off. What a pointer under a
    // diffuser is actually lit by does not vary with where it is pointing
    // anyway — it is one lamp 20 mm behind it — so it carries its read in the
    // emissive and the driver leans on that at night.
    //
    // Vertex colours, so the bone body, the red outer third and the dark
    // counterweight are one mesh and one draw call per dial.
    needle: extendCabin(
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        color: 0xffffff,
        // Lamp white with the warmth of the bulb behind it, not the orange of
        // the face. The red of the tip has to come from the tip's own paint,
        // because an orange emissive puts that same red on all of it.
        emissive: 0xffcfa8,
        emissiveIntensity: 0.06,
        metalness: 0.05,
        roughness: 0.46,
        envMapIntensity: 0.45,
      }),
      'ndlemi',
      // Emissive in the standard material is one flat value per mesh, so with
      // the night boost on it the counterweight lit as hard as the blade and
      // the pivot of every dial came out as a red bead brighter than the
      // pointer — four warning lamps where the hubs should be. Multiplying it
      // by the vertex colour reuses the paint mask as a glow mask: the
      // counterweight falls to an ember, the blade lights bone-white and the
      // outer third glows red instead of clipping to white with the rest.
      (shader) => {
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <emissivemap_fragment>',
          '#include <emissivemap_fragment>\n\ttotalEmissiveRadiance *= vColor.rgb;',
        );
      },
    ),
    // Matte black rubber: window channels, pedal pads, the shift gaiter, loom
    // and grommets. The cabin had no true black in it at all — every dark value
    // in the frame was a shadowed brown — so nothing had anything to be dark
    // against.
    rubber: new THREE.MeshStandardMaterial({
      map: rub.map,
      normalMap: rub.normal,
      roughnessMap: rub.rough,
      normalScale: new THREE.Vector2(1.0, 1.0),
      metalness: 0,
      roughness: 1.0,
      envMapIntensity: 0.3,
    }),
  };
  return cachedExtras;
}

// ---------------------------------------------------------------------------
// Instrument driver.
//
// Hung on the interior group's userData, so `vehicle/index.js` can reach it
// without this module knowing anything about the drive model:
//
//   group.userData.instruments.update( dt, {
//     speed, maxSpeed, rpm, throttle, brake, steer, lightsOn } )
//
// Everything a dial cannot get from those — fuel, coolant, volts, oil — runs on
// its own clock inside here.
//
// The follow is second order, not a lerp. A pointer is a coil pulling a mass
// against a hairspring: it leads into a change, overshoots a little and settles,
// and the amount of overshoot is the whole character of the instrument. A
// speedometer is nearly critically damped and a tachometer is not, which is why
// one drifts up to a reading and the other snaps at it — with a lerp on both
// they read as the same gauge printed twice.
// ---------------------------------------------------------------------------

/** Full-scale readings, matching what `drawGauges` prints on the faces. */
const SPEEDO_FS = 100; // km/h
const TACH_FS = 7; // r/min x1000
const IDLE_K = 0.72;

/** freq in Hz, damping ratio. Under 1 overshoots; the tach is meant to. */
const NEEDLE_FOLLOW = {
  speed: [1.5, 0.68],
  tach: [3.1, 0.6],
  fuel: [0.3, 1.0],
  temp: [0.32, 1.0],
  volts: [1.9, 0.85],
  oil: [1.7, 0.72],
};

/**
 * Where each pointer sits before anything has driven it. Not zero: until a
 * master loop calls `update` this is what every capture of the cabin shows, and
 * a truck doing 47 km/h through the trees with its speedometer on the stop is a
 * worse frame than no pointers at all. The first `update` call takes them over.
 */
const NEEDLE_REST = { speed: 0.47, tach: 0.62, fuel: 0.68, temp: 0.44, volts: 0.73, oil: 0.55 };

/**
 * During the self-test the pointers are driven by the cluster rather than by
 * their senders, so the two that are damped to a crawl in service keep up with
 * the rest. Without this the sweep is four needles moving and two sitting
 * still, which reads as two of them being broken.
 */
const SWEEP_FOLLOW = { fuel: [1.15, 0.85], temp: [1.15, 0.85] };

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const finite = (v, d = 0) => (Number.isFinite(v) ? v : d);

function createInstruments(pointers, materials) {
  const dials = pointers.map((p) => ({
    ...p,
    x: NEEDLE_REST[p.id] ?? 0,
    v: 0,
    follow: NEEDLE_FOLLOW[p.id] || [1.6, 0.85],
  }));
  const target = { ...NEEDLE_REST };
  const slow = { fuel: 0.68, temp: 0.4 };
  // Emissive is shared with whatever else drives these materials, so the
  // authored value is re-read whenever someone other than this writes it.
  const glow = new Map();
  let clock = 0;
  let prevSpeed = 0;
  let prevLights = null;
  let sweepT = -1;

  function place() {
    for (const d of dials) d.mesh.rotation.z = -(d.from + d.sweep * d.x);
  }
  place();

  function backlight(mat, mul) {
    if (!mat) return;
    const g = glow.get(mat);
    const base = g && Math.abs(mat.emissiveIntensity - g.applied) < 1e-3 ? g.base : mat.emissiveIntensity;
    const v = base * mul;
    mat.emissiveIntensity = v;
    glow.set(mat, { base, applied: v });
  }

  /**
   * The classic self-test. Power comes up, every pointer runs to the stop and
   * falls back, and for a second and a half the cluster tells you it is a
   * machine rather than a decal.
   */
  function sweepLevel(t) {
    if (t < 0.5) {
      const u = t / 0.5;
      return 1 - (1 - u) * (1 - u) * (1 - u);
    }
    if (t < 0.8) return 1;
    const u = (t - 0.8) / 0.78;
    return 1 - u * u;
  }

  function update(dt, s = {}) {
    dt = Math.min(Math.max(finite(dt, 1 / 60), 1e-4), 0.1);
    clock += dt;

    const speed = finite(s.speed);
    const maxSpeed = Math.max(4, finite(s.maxSpeed, 13));
    const rpm = Math.min(Math.max(finite(s.rpm), 0), 1.15);
    const throttle = clamp01(finite(s.throttle));
    const brake = clamp01(finite(s.brake));
    const steer = Math.min(Math.max(finite(s.steer), -1.5), 1.5);
    const lights = !!s.lightsOn;
    const accel = Math.min(Math.max((speed - prevSpeed) / dt, -18), 18);
    prevSpeed = speed;

    // A 100 km/h face reads honestly up to 27.7 m/s, which is twice what the
    // drive model does. The compression only exists so a master loop that
    // hands over a much faster truck does not peg the pointer on the stop.
    const full = Math.max(SPEEDO_FS, (maxSpeed * 3.6) / 0.95);
    const kph = Math.abs(speed) * 3.6;
    target.speed = clamp01(kph / full) + Math.sin(clock * 11.3) * 0.0016 * Math.min(1, kph / 15);
    target.tach =
      clamp01(Math.max(rpm * TACH_FS, IDLE_K) / TACH_FS) +
      (Math.sin(clock * 37.1 + 1.3) + Math.sin(clock * 23.7)) * 0.0035 * (0.35 + rpm);

    // Fuel burns off over half an hour, which is invisible; what actually moves
    // a float is the truck braking and turning under it.
    slow.fuel = Math.max(0.04, slow.fuel - dt * (0.00008 + throttle * 0.00042));
    target.fuel = clamp01(slow.fuel - accel * 0.0105 + steer * speed * 0.0042);

    const load = clamp01(throttle * 0.55 + rpm * 0.55);
    const airflow = clamp01(Math.abs(speed) / 14);
    slow.temp += (0.42 + 0.3 * load - 0.11 * airflow - slow.temp) * (1 - Math.exp(-dt / 24));
    target.temp = clamp01(slow.temp);

    const volts = (rpm > 0.05 ? 13.85 + rpm * 0.55 : 12.35) - (lights ? 0.42 : 0) - brake * 0.12;
    target.volts = clamp01((volts + Math.sin(clock * 0.83) * 0.05 - 8) / 8);
    target.oil = clamp01((11 + rpm * 54 - (slow.temp - 0.4) * 16) / 80);

    if (prevLights !== null && lights && !prevLights) sweepT = 0;
    prevLights = lights;
    if (sweepT >= 0) {
      sweepT += dt;
      if (sweepT > 1.58) sweepT = -1;
      else {
        const lv = sweepLevel(sweepT);
        for (const key of Object.keys(target)) target[key] = lv;
      }
    }

    // Substep so a dropped frame cannot push the integrator past its stability
    // limit and fling a pointer round the dial.
    const steps = Math.max(1, Math.ceil(dt * 45));
    const h = dt / steps;
    for (const d of dials) {
      const goal = target[d.id];
      if (goal === undefined) continue;
      const follow = (sweepT >= 0 && SWEEP_FOLLOW[d.id]) || d.follow;
      const w = follow[0] * Math.PI * 2;
      const z = follow[1];
      for (let i = 0; i < steps; i++) {
        d.v += (-2 * z * w * d.v - w * w * (d.x - goal)) * h;
        d.x += d.v * h;
      }
      // the stops are real: a pointer cannot go below zero or past full scale
      if (d.x < -0.012) {
        d.x = -0.012;
        d.v = Math.max(d.v, 0);
      } else if (d.x > 1.03) {
        d.x = 1.03;
        d.v = Math.min(d.v, 0);
      }
    }
    place();

    backlight(materials.needle, lights ? 30 : 1);
    backlight(materials.cabinPanel, lights ? 1.5 : 1);

    // The mirror is unlit, so it is the one surface in the cabin that does not
    // lose anything when the sun does — and the night grade takes exposure from
    // 1.34 to 1.8, so it actually gains. Left alone it is a backlit rectangle
    // hanging over a black dash. What it is showing is unlit forest, so it goes
    // down nearly two stops and keeps only the sky band.
    const mirror = materials.mirrorGlass;
    if (mirror?.color) {
      const want = lights ? 0.26 : 1;
      if (Math.abs(mirror.color.r - want) > 1e-3) mirror.color.setScalar(want);
    }
  }

  /** Current readings, for the capture tools. */
  function readings() {
    const out = {};
    for (const d of dials) out[d.id] = { frac: d.x, angle: d.mesh.rotation.z };
    return out;
  }

  return { update, readings, dials };
}

let litMaterials = null;
/** Shared library plus the cabin's own keys, with the cabin light on all of it. */
function cabinMaterials(base) {
  if (litMaterials) return litMaterials;
  const m = { ...base, ...cabinExtras() };
  for (const [key, opts] of Object.entries(CABIN_LIGHT)) {
    if (m[key]) applyCabinLight(m[key], { tag: key, ...opts });
  }
  litMaterials = m;
  return m;
}

/**
 * Kit variant for the cabin. Two differences from the shared one, both about
 * shading: it keeps each primitive's own normals rather than recomputing them on
 * the merged de-indexed buffer (otherwise every chamfer and every turned tube
 * facets, and the steering wheel comes out octagonal), and it box-projects UVs
 * from object space per material so tiling grain has a consistent scale.
 */
class CabinKit extends Kit {
  constructor(name) {
    super(name);
    this.needles = [];
  }

  add(key, geo, xform) {
    const g = xform ? transform(geo.clone(), xform) : geo.clone();
    if (!g.attributes.uv) {
      g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    }
    if (!this.buckets.has(key)) this.buckets.set(key, []);
    this.buckets.get(key).push(g);
    return g;
  }

  /** A pointer that keeps its own transform, so it stays out of the merge. */
  needle(spec) {
    this.needles.push(spec);
    return this;
  }

  build(baseMaterials, { castShadow = false, receiveShadow = true } = {}) {
    const materials = cabinMaterials(baseMaterials);
    const group = new THREE.Group();
    group.name = this.name;
    for (const [key, list] of this.buckets) {
      const mat = materials[key];
      if (!mat) {
        console.warn(`[cabin] missing material "${key}"`);
        continue;
      }
      const scale = UV_SCALE[key] ?? 1;
      const geos = list.map((g) => {
        const c = g.index ? g.toNonIndexed() : g;
        for (const name of Object.keys(c.attributes)) {
          if (name !== 'position' && name !== 'normal' && name !== 'uv') c.deleteAttribute(name);
        }
        if (scale !== 'keep') boxProjectUV(c, scale);
        return c;
      });
      emitPieces(this, group, key, mat, geos, { castShadow, receiveShadow, prefix: 'cabin' });
    }
    const film = group.getObjectByName('cabin_screenFilm');
    if (film) {
      // Nearer the eye than the body's own pane, so it has to draw after it;
      // sorted by distance the two swap over as the truck pitches.
      film.renderOrder = 4;
      film.receiveShadow = false;
    }

    const pointers = this.needles.map((n) => {
      const mesh = new THREE.Mesh(n.geo, materials.needle);
      mesh.name = `needle_${n.id}`;
      mesh.position.set(n.pos[0], n.pos[1], n.pos[2]);
      // XYZ order applies Z first, so the z term turns the blade in the plane of
      // the dial and the x/y terms then stand that plane up in the cab.
      mesh.rotation.set(n.rot[0], n.rot[1], -n.from);
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      group.add(mesh);
      return { ...n, mesh };
    });
    group.userData.instruments = createInstruments(pointers, materials);
    return group;
  }
}

function boxProjectUV(geo, scale) {
  const pos = geo.attributes.position;
  const nor = geo.attributes.normal;
  const uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const nx = Math.abs(nor.getX(i));
    const ny = Math.abs(nor.getY(i));
    const nz = Math.abs(nor.getZ(i));
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    let u;
    let v;
    if (nx >= ny && nx >= nz) {
      u = z;
      v = y;
    } else if (ny >= nx && ny >= nz) {
      u = x;
      v = z;
    } else {
      u = x;
      v = y;
    }
    uv.setXY(i, u * scale, v * scale);
  }
  uv.needsUpdate = true;
}

/** Rewrite a plane's UVs onto one cell of the cabin atlas. */
function atlasUV(geo, cell) {
  const [cx, cy, cw, chh] = CABIN_CELLS[cell];
  const N = CABIN_ATLAS;
  // canvas y runs down, the texture is uploaded flipped, so v0 is the bottom
  const u0 = cx / N;
  const u1 = (cx + cw) / N;
  const v0 = 1 - (cy + chh) / N;
  const v1 = 1 - cy / N;
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, u0 + uv.getX(i) * (u1 - u0), v0 + uv.getY(i) * (v1 - v0));
  }
  uv.needsUpdate = true;
  return geo;
}

/** Stretch a plane's U so a tiling strip texture repeats `n` times across it. */
function repeatUV(geo, ru, rv = 1) {
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * ru, uv.getY(i) * rv);
  uv.needsUpdate = true;
  return geo;
}

/**
 * Normal of a panel tilted back by `tilt` and yawed by `yaw`, which is also the
 * direction anything sitting proud of that panel has to move along.
 */
function faceN(tilt, yaw) {
  return [-Math.sin(yaw), Math.sin(tilt) * Math.cos(yaw), -Math.cos(tilt) * Math.cos(yaw)];
}

/** A drawn atlas panel: plane, cell UVs, facing -Z, tilted back and yawed. */
function panel(k, cell, { w, h, pos, tilt = 0, yaw = 0, key = 'cabinPanel', glass = 0 }) {
  const g = atlasUV(new THREE.PlaneGeometry(w, h), cell);
  const rot = [tilt, Math.PI + yaw, 0];
  k.add(key, g, { pos, rot });
  if (glass > 0) {
    // cover glass, pushed out along the panel normal
    const n = faceN(tilt, yaw);
    k.add('cabinGlass', new THREE.PlaneGeometry(w * 0.99, h * 0.99), {
      pos: [pos[0] + n[0] * glass, pos[1] + n[1] * glass, pos[2] + n[2] * glass],
      rot,
    });
  }
}

// ---------------------------------------------------------------------------
// Instruments.
//
// The cluster used to be a painted face with the pointers printed on it. These
// are real: one mesh per dial, outside the merging kit so each keeps its own
// transform, pivoting on the dial centre published in `CABIN_DIALS`.
//
// A pointer is a blade with a ridge down it rather than a flat triangle. It is
// 60 mm of the brightest thing in the cabin sitting 4 mm off a black face, so
// the one highlight running down its spine is most of what says "moulded" — and
// the ridge is also what keeps it legible when it lies along a tick mark, which
// a flat blade does not.
// ---------------------------------------------------------------------------

/**
 * Bone body, red outer third, dark counterweight — as vertex colours.
 *
 * The counterweight has to stay a *value* darker rather than a different hue.
 * The material carries one emissive for the whole blade, and at the intensity
 * the night backlight wants, a counterweight painted matt black came out as the
 * brightest orange on the dial: emissive over a dark albedo is all emissive.
 */
const NEEDLE_PAINT = {
  cw: [0.14, 0.135, 0.14],
  body: [0.78, 0.73, 0.64],
  tip: [0.8, 0.17, 0.06],
};

/**
 * Half-width and ridge height along the blade, as fractions of the dial radius
 * and of the peak rise. Two sections 2 mm apart at the paint break, so the red
 * tip has an edge instead of a gradient.
 */
const NEEDLE_SECTIONS = [
  [-1.0, 0.032, 0.34, 'cw'],
  [-0.44, 0.052, 0.74, 'cw'],
  [-0.06, 0.036, 1.0, 'cw'],
  [0.0, 0.034, 1.0, 'body'],
  [0.34, 0.026, 0.82, 'body'],
  [0.65, 0.018, 0.55, 'body'],
  [0.68, 0.0175, 0.53, 'tip'],
  [0.88, 0.011, 0.35, 'tip'],
  [1.0, 0.005, 0.2, 'tip'],
];

/**
 * Pointer blade, pointing along +X with its pivot at the origin and its base in
 * the XY plane. `CABIN_DIALS` angles are canvas angles, so the driver turns this
 * by -angle about +Z and the two agree.
 */
function needleGeometry(r, { len = 0.8, tail = 0.21 } = {}) {
  const rise = 0.019 * r;
  // the negative half of the parameter runs back down the counterweight
  const pts = NEEDLE_SECTIONS.map(([t, hw, hz, paint]) => ({
    x: t * (t < 0 ? tail : len) * r,
    w: hw * r,
    z: hz * rise,
    c: NEEDLE_PAINT[paint],
  }));

  const pos = [];
  const col = [];
  const push = (p, y, z, c) => {
    pos.push(p, y, z);
    col.push(c[0], c[1], c[2]);
  };
  const tri = (a, b, c) => {
    for (const v of [a, b, c]) push(v[0], v[1], v[2], v[3]);
  };
  for (let i = 0; i < pts.length - 1; i++) {
    const p = pts[i];
    const q = pts[i + 1];
    const C0 = [p.x, 0, p.z, p.c];
    const C1 = [q.x, 0, q.z, q.c];
    const L0 = [p.x, p.w, 0, p.c];
    const L1 = [q.x, q.w, 0, q.c];
    const R0 = [p.x, -p.w, 0, p.c];
    const R1 = [q.x, -q.w, 0, q.c];
    tri(C0, L1, L0);
    tri(C0, C1, L1);
    tri(C0, R0, R1);
    tri(C0, R1, C1);
    tri(L0, R1, R0);
    tri(L0, L1, R1);
  }
  const f = pts[0];
  const l = pts[pts.length - 1];
  tri([f.x, 0, f.z, f.c], [f.x, f.w, 0, f.c], [f.x, -f.w, 0, f.c]);
  tri([l.x, 0, l.z, l.c], [l.x, -l.w, 0, l.c], [l.x, l.w, 0, l.c]);

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array((pos.length / 3) * 2), 2));
  g.computeVertexNormals();
  return g;
}

/**
 * Hang pointers over one drawn dial cell.
 *
 * `panel()` has just laid the printing on a plane at `pos` rotated
 * `[tilt, PI + yaw, 0]`; the columns of that rotation are the plane's own axes,
 * so a dial published at a fraction of the cell maps straight onto it. The
 * turned boss at each centre is static and goes in the merged kit — it is a
 * disc about its own axis, so nothing is gained by spinning it, and keeping it
 * out of the moving mesh lets the blade carry a backlight the boss must not.
 */
function dialPointers(k, cell, { w, h, pos, tilt = 0, yaw = 0, out = 0.004 }) {
  const ax = [-Math.cos(yaw), -Math.sin(tilt) * Math.sin(yaw), Math.cos(tilt) * Math.sin(yaw)];
  const ay = [0, Math.cos(tilt), Math.sin(tilt)];
  const az = faceN(tilt, yaw);
  const rot = [tilt, Math.PI + yaw, 0];
  for (const d of CABIN_DIALS[cell]) {
    const dx = (d.fx - 0.5) * w;
    const dy = (0.5 - d.fy) * h;
    const at = (o) => [0, 1, 2].map((i) => pos[i] + ax[i] * dx + ay[i] * dy + az[i] * o);
    const r = d.fr * h;
    k.needle({
      id: d.id,
      geo: needleGeometry(r, d),
      pos: at(out),
      rot,
      from: d.from,
      sweep: d.sweep,
    });
    const hr = d.hub * r;
    const boss = new THREE.CylinderGeometry(hr * 0.55, hr, r * 0.026, 14);
    boss.translate(0, r * 0.013, 0);
    boss.rotateX(Math.PI * 0.5);
    k.add('trim', boss, { pos: at(out - r * 0.005), rot });
    // A turned ring round the mouth of each dial. The pillar pod learned this
    // the expensive way: printed on the face, a bezel is a grey annulus that
    // takes exactly the light the face takes, and four dials on one plane read
    // as dots scattered on a black rectangle. What tells the eye a dial is a
    // dial is brightwork catching a highlight round the edge of it, and that
    // has to be geometry. Static, so it merges and costs no draw call.
    if (d.ring) {
      const tube = d.ring * r;
      k.add('alu', new THREE.TorusGeometry(r * (1 - d.ring * 0.55), tube, 5, 18), { pos: at(out - tube * 0.3), rot });
    }
  }
}

/**
 * Slatted vent: a dark trough with an alpha-cut louvre plate across its mouth.
 * `slats` sets the UV stretch, so the pitch is controlled in metres rather than
 * by however the plane happened to be sized.
 */
function vent(k, { w, h, pos, tilt = 0, yaw = 0, slats, vertical = false }) {
  const rot = [tilt, Math.PI + yaw, 0];
  const nz = [Math.sin(tilt) * Math.cos(yaw), -Math.cos(tilt) * Math.cos(yaw)];
  const uy = [Math.cos(tilt), Math.sin(tilt)];
  k.add('gap', rbox(w, h, 0.05, 0.006), {
    pos: [pos[0], pos[1] - nz[0] * 0.026, pos[2] - nz[1] * 0.026],
    rot,
  });
  const g = new THREE.PlaneGeometry(w - 0.006, h - 0.006);
  repeatUV(g, vertical ? 1 : slats, vertical ? slats : 1);
  if (vertical) {
    // swap the UV axes so the slat run turns through 90 degrees
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getY(i), uv.getX(i));
    uv.needsUpdate = true;
  }
  k.add('louvre', g, { pos, rot });
  // bezel round the mouth
  for (const [dx, dy, bw, bh] of [
    [0, h * 0.5 + 0.008, w + 0.016, 0.016],
    [0, -h * 0.5 - 0.008, w + 0.016, 0.016],
    [w * 0.5 + 0.008, 0, 0.016, h + 0.016],
    [-w * 0.5 - 0.008, 0, 0.016, h + 0.016],
  ]) {
    k.add('trimGloss', rbox(bw, bh, 0.03, 0.005), {
      pos: [pos[0] + dx, pos[1] + dy * uy[0] + nz[0] * 0.004, pos[2] + dy * uy[1] + nz[1] * 0.004],
      rot,
    });
  }
}

const smoothTo = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const gauss = (x, w) => Math.exp(-(x * x) / (w * w));

const _skN = new THREE.Vector3();
const _skT = new THREE.Vector3();
const _skB = new THREE.Vector3();
const _skP = new THREE.Vector3();
const _skU = new THREE.Vector3();
const _skV = new THREE.Vector3();

/**
 * Push a rounded box out along its own normals by `fn(x, y, z, n)` metres.
 *
 * This is what turns a box into upholstery: one smooth field carries the side
 * bolsters, the dish where somebody sits, the flutes and the seams, so they are
 * all the same piece of foam rather than slabs stacked on a slab.
 *
 * Normals are re-derived from finite differences across the displaced surface
 * rather than by `computeVertexNormals`. `RoundedBoxGeometry` hands back a
 * non-indexed buffer and `CabinKit` never re-indexes, so recomputing from the
 * triangles would flat-shade every panel — which is the one thing a cushion
 * cannot be.
 */
function sculpt(geo, fn, eps = 0.005) {
  const pos = geo.attributes.position;
  const nor = geo.attributes.normal;
  for (let i = 0; i < pos.count; i++) {
    _skP.fromBufferAttribute(pos, i);
    _skN.fromBufferAttribute(nor, i);
    _skT.set(0, 0, 1);
    if (Math.abs(_skN.z) > 0.9) _skT.set(1, 0, 0);
    _skT.crossVectors(_skN, _skT).normalize();
    _skB.crossVectors(_skN, _skT);
    const d0 = fn(_skP.x, _skP.y, _skP.z, _skN);
    const dt = fn(_skP.x + _skT.x * eps, _skP.y + _skT.y * eps, _skP.z + _skT.z * eps, _skN);
    const db = fn(_skP.x + _skB.x * eps, _skP.y + _skB.y * eps, _skP.z + _skB.z * eps, _skN);
    _skU.copy(_skT).addScaledVector(_skN, (dt - d0) / eps);
    _skV.copy(_skB).addScaledVector(_skN, (db - d0) / eps);
    // t x (n x t) = n, so this cross keeps the original facing
    _skU.cross(_skV).normalize();
    pos.setXYZ(i, _skP.x + _skN.x * d0, _skP.y + _skN.y * d0, _skP.z + _skN.z * d0);
    nor.setXYZ(i, _skU.x, _skU.y, _skU.z);
  }
  pos.needsUpdate = true;
  nor.needsUpdate = true;
  return geo;
}

/**
 * A piped seam that rides the surface it is sewn to.
 *
 * Every point is pushed out along the panel normal by the *same* field the
 * panel was sculpted with, so a cord that runs over a bolster crest climbs the
 * crest instead of cutting through it or floating over it. That is the whole
 * difference between a seam and a stripe: a seam is where two panels meet, so
 * it has to be wherever the form turns.
 */
function seam(k, { pts, normal, fn, lift = 0.004, r = 0.0072, pitch = 0.026, xform, key = 'stitch' }) {
  const n = new THREE.Vector3(normal[0], normal[1], normal[2]);
  let len = 0;
  const p3 = pts.map((p, i) => {
    const d = (fn ? fn(p[0], p[1], p[2], n) : 0) + lift;
    const q = [p[0] + n.x * d, p[1] + n.y * d, p[2] + n.z * d];
    if (i > 0) len += Math.hypot(q[0] - pts[i - 1][0], q[1] - pts[i - 1][1], q[2] - pts[i - 1][2]);
    return q;
  });
  const g = tube(p3, r, 6);
  const uv = g.attributes.uv;
  const reps = Math.max(2, Math.round(len / pitch));
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * reps, uv.getY(i));
  uv.needsUpdate = true;
  k.add(key, g, xform);
}

/** A stitched welt running along X. */
function weltX(k, { len, pos, rot = [0, 0, 0], pitch = 0.032 }) {
  const g = rbox(len, 0.015, 0.026, 0.004);
  repeatUV(g, Math.max(2, Math.round(len / pitch)), 1);
  k.add('stitch', g, { pos, rot });
}

/** A stitched welt running along Z. */
function weltZ(k, { len, pos, rot = [0, 0, 0], pitch = 0.032 }) {
  const g = rbox(0.026, 0.015, len, 0.004);
  const uv = g.attributes.uv;
  const n = Math.max(2, Math.round(len / pitch));
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getY(i) * n, uv.getX(i));
  uv.needsUpdate = true;
  k.add('stitch', g, { pos, rot });
}

// ---------------------------------------------------------------------------

function buildDash(k) {
  // --- pad -----------------------------------------------------------------
  // One crowned slab plus a rolled front lip. The lip is a half-round because it
  // is the closest thing to the camera and a square edge there reads as cardboard.
  k.add('interiorFaded', rbox(HW * 2 - 0.14, 0.115, PAD_RZ - PAD_FZ, 0.03), {
    pos: [0, PAD_TOP - 0.055, (PAD_FZ + PAD_RZ) * 0.5],
  });
  k.add('interiorFaded', new THREE.CylinderGeometry(0.036, 0.036, HW * 2 - 0.14, 16, 1, false, 0, Math.PI), {
    pos: [0, PAD_TOP - 0.048, PAD_FZ],
    rot: [Math.PI / 2, 0, -Math.PI / 2],
  });
  weltX(k, { len: HW * 2 - 0.2, pos: [0, PAD_TOP - 0.014, PAD_FZ - 0.019], rot: [-0.75, 0, 0] });
  // Rear seam, passenger third only. Run the full width it was the fifth
  // dashed line lying parallel to the other four across the bottom of the
  // frame, and at that point a stitched welt has stopped reading as a seam and
  // started reading as a stripe. A dash is not symmetrical anyway: the driver's
  // half gets the moulded step where the binnacle carrier lands, the
  // passenger's gets the stitched joint round the airbag lid.
  weltX(k, { len: 0.62, pos: [-0.46, PAD_TOP + 0.004, PAD_RZ - 0.11] });
  weltZ(k, { len: 0.19, pos: [-0.145, PAD_TOP + 0.004, PAD_RZ - 0.205], pitch: 0.03 });
  weltZ(k, { len: 0.19, pos: [-0.775, PAD_TOP + 0.004, PAD_RZ - 0.205], pitch: 0.03 });
  // Driver's half: a moulded step instead, cast in one with the pad. Same job
  // of breaking 400 mm of one value, no fourth dashed line.
  k.add('gap', rbox(0.78, 0.02, 0.014, 0.004), { pos: [0.42, PAD_TOP - 0.006, PAD_RZ - 0.12] });
  k.add('interiorFaded', rbox(0.78, 0.026, 0.09, 0.01), { pos: [0.42, PAD_TOP - 0.004, PAD_RZ - 0.165], rot: [0.06, 0, 0] });

  // A split in the pad where twenty summers through the screen have got at it,
  // with the edges curled and the backing board showing. The pad is a tenth of
  // the frame and the largest single surface in it, and at an eight-times crop
  // it was a soft gradient with nothing on it: the crazing and the dust film are
  // both shader terms and neither can put a hard edge anywhere. This can.
  const splitZ = PAD_RZ - 0.155;
  for (const [sx2, sz, sl, sa] of [
    [0.545, splitZ, 0.2, 0.1],
    [0.375, splitZ - 0.055, 0.11, -0.22],
    [-0.235, splitZ + 0.02, 0.075, 0.3],
  ]) {
    k.add('gap', rbox(sl, 0.014, 0.017, 0.003), { pos: [sx2, PAD_TOP - 0.004, sz], rot: [0, sa, 0] });
    for (const lip of [-1, 1]) {
      k.add('interiorFaded', rbox(sl - 0.012, 0.012, 0.014, 0.004), {
        pos: [sx2 + Math.sin(sa) * 0.014 * lip, PAD_TOP + 0.002, sz + Math.cos(sa) * 0.014 * lip],
        rot: [lip * 0.5, sa, 0],
      });
    }
  }
  // Scuffs across the front lip, which is the closest vinyl to the lens and the
  // one place a boot, a toolbox and a dog have all been over.
  for (const [scx, scw, sca] of [
    [0.62, 0.055, 0.5],
    [0.21, 0.038, -0.7],
    [-0.06, 0.045, 0.35],
    [-0.42, 0.03, 0.9],
  ]) {
    k.add('gap', rbox(scw, 0.006, 0.008, 0.002), {
      pos: [scx, PAD_TOP - 0.031, PAD_FZ - 0.031],
      rot: [-0.75, 0, sca],
    });
  }

  // --- cowl moulding -------------------------------------------------------
  // The defroster used to lie flat on the back of the pad. It is now a moulding
  // standing 92 mm proud of it, leaning towards the driver as it rises because the
  // screen rakes back over it: 60 mm of usable depth at the pad, 50 mm at the top,
  // and the top rear corner clears the inner face of the glass by 7 mm — hence
  // `screenZ`, which is worth having exact at this height.
  //
  // Height here is close to free. The band of view it takes away is bonnet, not
  // ground: a ray grazing the bonnet's front edge lands on the trail 11.6 m ahead,
  // so everything nearer than that is already gone from the view whatever the dash
  // does. It buys the framing a dark, detailed edge across the base of the screen,
  // and outboard of the instrument binnacle it is what the bonnet now hides behind.
  //
  // It does *not* fix the pale band of bonnet in the middle of the frame, which is
  // what it was built for. Measured before and after, that band did not move a
  // pixel: in the middle 55 per cent of the width the silhouette the driver looks
  // over is not this moulding at all but the top of the instrument brow, 550 mm
  // from the eye and 100 mm higher in the sight line. See the note on the brow.
  const COWL_RAKE = -0.6;
  const COWL_H = 0.105;
  const COWL_D = 0.062;
  const COWL_Y = PAD_TOP + 0.031;
  const cr = Math.cos(COWL_RAKE);
  const sr = Math.sin(COWL_RAKE);
  // The top rear corner is the one that decides where the whole moulding can sit,
  // so its clearance is stated rather than baked into a literal: 7 mm inside the
  // pane. Everything else on the top face is placed along it by `onCowl`, so the
  // assembly follows if the rake or the screen ever changes.
  const cornerY = COWL_Y + COWL_H * 0.5 * cr - COWL_D * 0.5 * sr;
  const COWL_Z = screenZ(cornerY) - 0.007 - (COWL_H * 0.5 * sr + COWL_D * 0.5 * cr);
  const faceY = COWL_Y + COWL_H * 0.5 * cr;
  const faceZ = COWL_Z + COWL_H * 0.5 * sr;
  /** A point on the moulding's top face: `t` runs aft towards the glass, `lift` off it. */
  const onCowl = (t, lift = 0) => [0, faceY - t * sr + lift * cr, faceZ + t * cr + lift * sr];

  k.add('interiorPlastic', rbox(HW * 2 - 0.16, COWL_H, COWL_D, 0.016), {
    pos: [0, COWL_Y, COWL_Z],
    rot: [COWL_RAKE, 0, 0],
  });
  // rolled lip along the front top edge, for the same reason the pad has one:
  // this is now the second closest hard edge to the camera
  k.add('interiorPlastic', new THREE.CylinderGeometry(0.013, 0.013, HW * 2 - 0.16, 12, 1, false, 0, Math.PI), {
    pos: onCowl(-COWL_D * 0.5, -0.006),
    rot: [Math.PI / 2 + COWL_RAKE, 0, -Math.PI / 2],
  });
  // shadow gap where the moulding lands on the pad
  k.add('gap', rbox(HW * 2 - 0.17, 0.014, 0.016, 0.004), { pos: [0, PAD_TOP - 0.022, COWL_Z + 0.005] });

  // Defroster, laid on the moulding's top face and aimed up the glass. Still the
  // biggest single piece of detail in the frame, and now on a surface the eye
  // meets at 45 degrees instead of edge-on.
  vent(k, { w: 1.34, h: 0.042, pos: onCowl(-0.007), tilt: Math.PI * 0.5 + COWL_RAKE, slats: 44 });
  // blanking plates on the 130 mm of top face outboard of the vent
  for (const sx of [-1, 1]) {
    const p = onCowl(0);
    k.add('interiorFaded', rbox(0.115, 0.02, 0.05, 0.008), { pos: [sx * 0.725, p[1], p[2]], rot: [COWL_RAKE, 0, 0] });
    const r = onCowl(-0.008, 0.012);
    k.add('steelDark', rivet(0.007, 0.004), { pos: [sx * 0.725, r[1], r[2]], rot: [COWL_RAKE, 0, 0] });
  }

  // Dark closure across the void between the pad's rear edge and the base of the
  // glass. Without it you see straight out under the screen. Both pieces stay
  // inside `screenZ` — the old sloped one stood 20 mm proud of the glass and was
  // showing on the scuttle from the nose cameras.
  k.add('gap', rbox(HW * 2 - 0.15, 0.03, 0.05, 0.008), { pos: [0, PAD_TOP - 0.023, 0.852] });
  k.add('gap', rbox(HW * 2 - 0.14, 0.1, 0.08, 0.01), { pos: [0, PAD_TOP - 0.075, PAD_RZ + 0.03] });

  // --- fascia --------------------------------------------------------------
  k.add('interiorPlastic', rbox(HW * 2 - 0.14, 0.3, PAD_RZ - FASCIA_FZ, 0.028), {
    pos: [0, PAD_TOP - 0.2, (FASCIA_FZ + PAD_RZ) * 0.5],
  });
  // knee bolster below, set back so the fascia keeps a shadow line under it
  k.add('interiorPlastic', rbox(HW * 2 - 0.2, 0.2, 0.2, 0.03), { pos: [0, PAD_TOP - 0.46, FASCIA_FZ + 0.09] });
  k.add('gap', rbox(HW * 2 - 0.16, 0.03, 0.06, 0.006), { pos: [0, PAD_TOP - 0.37, FASCIA_FZ + 0.005] });
  // Under-pad joint, broken either side of the centre stack. Run the full 1.6 m
  // it lay parallel to the pad's front lip 60 mm below it, and two continuous
  // dashed lines that close together stop being seams and become a stripe.
  for (const [len, cx] of [
    [0.52, 0.52],
    [0.44, -0.56],
  ]) {
    weltX(k, { len, pos: [cx, PAD_TOP - 0.072, FASCIA_FZ - 0.006], rot: [0.2, 0, 0] });
  }
  k.add('interiorPlastic', rbox(0.3, 0.036, 0.05, 0.012), { pos: [-0.06, PAD_TOP - 0.072, FASCIA_FZ + 0.004], rot: [0.2, 0, 0] });

  // outboard eyeball vents, angled in toward the occupants
  for (const sx of [-1, 1]) {
    vent(k, {
      w: 0.16,
      h: 0.075,
      pos: [sx * 0.66, PAD_TOP - 0.105, FASCIA_FZ - 0.012],
      tilt: 0.18,
      slats: 6,
      vertical: true,
    });
  }

  // Bubble compass stuck to the pad in the slot between the binnacle cheek and
  // the centre pod. That slot is only 56 mm wide — a torch laid there was hidden
  // behind the cheek — and a 40 mm glass dome is the one accessory that fits it,
  // which is presumably why every truck has one.
  const cpx = 0.115;
  const cpz = 0.665;
  k.add('consoleAbs', new THREE.CylinderGeometry(0.023, 0.026, 0.026, 14), { pos: [cpx, PAD_TOP + 0.012, cpz] });
  k.add('chrome', new THREE.TorusGeometry(0.0225, 0.0035, 5, 14), { pos: [cpx, PAD_TOP + 0.024, cpz], rot: [Math.PI * 0.5, 0, 0] });
  k.add('gap', new THREE.CylinderGeometry(0.019, 0.019, 0.004, 12), { pos: [cpx, PAD_TOP + 0.026, cpz] });
  k.add('cabinPanel', atlasUV(new THREE.PlaneGeometry(0.03, 0.03), 'dome'), {
    pos: [cpx, PAD_TOP + 0.0285, cpz],
    rot: [-Math.PI * 0.5, 0, 0],
  });
  k.add('lensClear', new THREE.SphereGeometry(0.019, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), {
    pos: [cpx, PAD_TOP + 0.024, cpz],
  });

  // Tray let into the pad top with a ribbed rubber liner. Held inboard of
  // x = -0.2: at the dash's depth the frame only reaches x = -0.25, so the
  // outboard half of the passenger side of the pad is not on screen at all.
  k.add('gap', rbox(0.26, 0.026, 0.16, 0.006), { pos: [-0.16, PAD_TOP - 0.012, 0.705] });
  k.add('floorMat', rbox(0.23, 0.01, 0.13, 0.004), { pos: [-0.16, PAD_TOP - 0.019, 0.705] });
  for (const dx of [-0.14, 0.14]) {
    for (const dz of [-0.09, 0.09]) {
      k.add('steelDark', rivet(0.0065, 0.0035), { pos: [-0.16 + dx, PAD_TOP + 0.002, 0.705 + dz] });
    }
  }
  weltZ(k, { len: 0.2, pos: [-0.32, PAD_TOP + 0.003, 0.7], pitch: 0.028 });

  // --- pad top relief ------------------------------------------------------
  // The pad is 1.6 m by 0.37 m and by far the largest single surface in the
  // frame, and which part of it lands where moves between runs: the truck drives
  // during the pre-roll, so the sprung mass settles differently every capture and
  // the pad slides up and down through the bottom half of the shot. So the relief
  // is spread across the whole thing rather than composed for one frame.

  // Moulding seam where the pad's centre section meets the passenger section,
  // stopping short of the binnacle at x = 0.14 and clear of the tray at z = 0.625.
  k.add('gap', rbox(0.86, 0.02, 0.006, 0.002), { pos: [-0.37, PAD_TOP - 0.004, 0.585] });
  k.add('interiorFaded', rbox(0.86, 0.014, 0.016, 0.005), { pos: [-0.37, PAD_TOP - 0.002, 0.571] });
  for (const dx of [-0.74, -0.37, 0.0]) {
    k.add('steelDark', rivet(0.006, 0.0032), { pos: [dx, PAD_TOP + 0.002, 0.585] });
  }

  // Welts running fore-and-aft as well as across, so the pad reads as four
  // moulded panels rather than one slab. Cheap, and the stitch bead is the one
  // piece of relief in the cabin that reads at any distance.
  for (const wx of [0.075, -0.605]) {
    weltZ(k, { len: 0.29, pos: [wx, PAD_TOP + 0.003, 0.68], pitch: 0.028 });
  }

  // Ribbed rubber mat on the driver's outboard corner — the corner of the pad
  // that otherwise holds 190 mm of blank vinyl. Laid on the surface rather than
  // let into it: a well cut into a solid pad has to be faked with a raised box,
  // and at this size that read as a grey lump sitting on the dash.
  k.add('floorMat', rbox(0.13, 0.006, 0.12, 0.002), { pos: [0.71, PAD_TOP + 0.002, 0.64] });
  weltZ(k, { len: 0.12, pos: [0.782, PAD_TOP + 0.004, 0.64], pitch: 0.026 });

  // --- passenger side ------------------------------------------------------
  // From the driver's eye the vehicle's passenger side is the right third of the
  // frame, and it held nothing: 42 per cent glass, the rest bare pad. The camera
  // pose is not mine to move, so the fix is to put things worth looking at in the
  // 300 mm of pad between x = -0.2 and -0.6, which is the part of it on screen.

  // Travel mug in a moulded holder. 180 mm tall at 800 mm from the lens, so it
  // is a 50-pixel object in the emptiest part of the frame.
  const mgx = -0.37;
  const mgz = 0.635;
  k.add('gap', new THREE.CylinderGeometry(0.049, 0.045, 0.04, 14), { pos: [mgx, PAD_TOP - 0.008, mgz] });
  k.add('consoleAbs', new THREE.CylinderGeometry(0.052, 0.056, 0.03, 14), { pos: [mgx, PAD_TOP - 0.004, mgz] });
  // Powder-coated body with an alloy collar and lid, not the bare alloy tube it
  // was. Measured against the ID pass a plain alloy cylinder came back at 0.86
  // luma against a frame mean of 0.24 — a hundred-pixel white shape in the
  // emptiest third of the shot, and the brightest thing in the cabin by a long
  // way. Dark body, two bright rings and one hot vertical streak reads as steel
  // and stays inside the frame's range.
  // Second pass at the value: on `trimGloss` the body still came back as the
  // palest thing in the right third, a light grey cylinder that read as a
  // bollard rather than a flask. On `rubber` it is the darkest object on the
  // pad, which is what a black insulated mug is, and the two alloy rings and
  // the paper wrap are then the only bright things on it.
  k.add('rubber', new THREE.CylinderGeometry(0.041, 0.037, 0.128, 14), { pos: [mgx, PAD_TOP + 0.06, mgz] });
  k.add('paper', new THREE.CylinderGeometry(0.0418, 0.0405, 0.042, 14), { pos: [mgx, PAD_TOP + 0.052, mgz] });
  k.add('alu', new THREE.CylinderGeometry(0.0405, 0.0405, 0.02, 14), { pos: [mgx, PAD_TOP + 0.128, mgz] });
  k.add('gap', new THREE.TorusGeometry(0.0412, 0.0022, 4, 14), { pos: [mgx, PAD_TOP + 0.117, mgz], rot: [Math.PI * 0.5, 0, 0] });
  k.add('trimGloss', new THREE.CylinderGeometry(0.037, 0.042, 0.03, 14), { pos: [mgx, PAD_TOP + 0.152, mgz] });
  k.add('alu', new THREE.TorusGeometry(0.038, 0.005, 5, 14), { pos: [mgx, PAD_TOP + 0.168, mgz], rot: [Math.PI * 0.5, 0, 0] });
  k.add('gap', new THREE.CylinderGeometry(0.03, 0.03, 0.006, 12), { pos: [mgx, PAD_TOP + 0.17, mgz] });
  // handle, swung towards the driver so its loop is read against the glass
  k.add('trimGloss', new THREE.TorusGeometry(0.03, 0.0075, 5, 10, Math.PI * 1.15), {
    pos: [mgx + 0.052, PAD_TOP + 0.082, mgz - 0.008],
    rot: [0, Math.PI * 0.42, -0.35],
  });

  // Folded map and a roadbook wedged against the screen, held by an elastic. A
  // pale object this size is the only thing in the frame that reads at a glance
  // as paper, which is a material the cabin otherwise has none of.
  for (const [mx, mz2, ry, rx, w, d] of [
    [-0.58, 0.745, 0.24, -0.42, 0.19, 0.14],
    [-0.52, 0.71, -0.16, -0.3, 0.15, 0.11],
  ]) {
    k.add('paper', rbox(w, 0.005, d, 0.0015), { pos: [mx, PAD_TOP + 0.026, mz2], rot: [rx, ry, 0] });
  }
  k.add('paper', rbox(0.15, 0.004, 0.095, 0.0012), { pos: [-0.61, PAD_TOP + 0.045, 0.765], rot: [-0.5, 0.3, 0.07] });
  k.add('trim', rbox(0.006, 0.006, 0.14, 0.002), { pos: [-0.55, PAD_TOP + 0.034, 0.735], rot: [-0.45, 0.24, 0] });

  // Rag pushed up against the front lip. The strip of pad between z = 0.49 and
  // 0.58 is the bottom 40 pixels of the frame across its whole width and it had
  // nothing on it at all: everything else on the pad lives at z > 0.58 where the
  // dash is deep enough to hold it. A limp cotton object 700 mm from the lens is
  // the closest thing in the shot and the only soft silhouette in it.
  // Cotton, not upholstery: in the seat fabric it came back as a black blob
  // against a lit pad, because the one thing a rag has to be is lighter than
  // what it is lying on.
  // Three big rounded boxes read as one grey pillow. Cloth has no straight
  // edges anywhere on it, so this is seven small ones at scattered angles with
  // the corner radius run right up to half the smallest dimension, which is a
  // lump with a broken outline instead of a lozenge.
  for (const [rx, rz, w, h, d, ry, rr, key] of [
    [-0.288, 0.556, 0.105, 0.036, 0.075, 0.35, 0.12, 'fabric'],
    [-0.335, 0.578, 0.075, 0.028, 0.06, -0.5, -0.22, 'fabric'],
    [-0.246, 0.541, 0.062, 0.03, 0.05, 0.9, 0.3, 'fabric'],
    [-0.31, 0.535, 0.055, 0.022, 0.042, -0.15, 0.4, 'paper'],
    [-0.265, 0.585, 0.05, 0.026, 0.045, 1.25, -0.35, 'fabric'],
    [-0.372, 0.556, 0.042, 0.018, 0.038, 0.2, 0.5, 'paper'],
    [-0.216, 0.568, 0.038, 0.02, 0.032, -0.8, -0.4, 'fabric'],
  ]) {
    k.add(key, rbox(w, h, d, Math.min(w, d, h) * 0.48), { pos: [rx, PAD_TOP + h * 0.42, rz], rot: [0.06, ry, rr] });
  }

  // Sunglasses, folded, where they get left. Two 45 mm lenses is a small object
  // but it is nearly black against a lit pad and it reads as a shape.
  const sgx = 0.55;
  const sgz = 0.545;
  for (const [dx, dz, a] of [
    [-0.024, 0.004, 0.3],
    [0.024, -0.004, 0.3],
  ]) {
    k.add('gap', rbox(0.045, 0.006, 0.03, 0.002), { pos: [sgx + dx, PAD_TOP + 0.008, sgz + dz], rot: [0.1, a, 0.12] });
  }
  k.add('trimGloss', rbox(0.104, 0.008, 0.012, 0.003), { pos: [sgx, PAD_TOP + 0.013, sgz - 0.011], rot: [0.1, 0.3, 0.12] });
  k.add('trimGloss', rbox(0.012, 0.007, 0.1, 0.003), { pos: [sgx - 0.048, PAD_TOP + 0.011, sgz + 0.04], rot: [0.1, 0.5, 0.12] });

  // Grab handle bracket end plates, so the passenger's chicken bar lands on
  // something instead of growing out of the vinyl.
  for (const dz of [-0.075, 0.075]) {
    k.add('gap', rbox(0.07, 0.014, 0.07, 0.004), { pos: [-0.62, PAD_TOP + 0.004, 0.68 + dz] });
  }

  // Sun splits in the vinyl where the screen bakes it. A line 2 mm proud with a
  // curled lip beside it: at 16 mm the shadow box stood up off the pad like a fin.
  for (const [cx, cz, len] of [
    [-0.52, 0.66, 0.15],
    [-0.6, 0.755, 0.08],
    [0.145, 0.58, 0.06],
  ]) {
    k.add('gap', rbox(0.004, 0.002, len, 0.0008), { pos: [cx, PAD_TOP + 0.0015, cz], rot: [0, 0.22, 0] });
    k.add('interiorFaded', rbox(0.007, 0.003, len * 0.85, 0.001), {
      pos: [cx + 0.006, PAD_TOP + 0.002, cz],
      rot: [0, 0.22, 0.36],
    });
  }

  // --- instrument binnacle -------------------------------------------------
  // A hooded pod standing 140 mm proud of the pad. The dials face up and back at
  // 19 degrees, which from the driver's eye is within 2 degrees of face-on, and
  // the face is sized so its bottom edge clears the frame edge by ~13 mm.
  const gz = 0.615;
  const gy = 1.425;
  const tilt = 0.34;
  const up = [0, Math.cos(tilt), Math.sin(tilt)];
  const outN = [0, Math.sin(tilt), -Math.cos(tilt)];
  const onDial = (dy, out) => [
    DRIVER_X,
    gy + dy * up[1] + out * outN[1],
    gz + dy * up[2] + out * outN[2],
  ];
  // carrier behind the dials, and the shelf that ties the pod to the fascia
  k.add('consoleAbs', rbox(0.48, 0.22, 0.09, 0.02), { pos: [DRIVER_X, gy - 0.01, gz + 0.08] });
  k.add('consoleAbs', rbox(0.5, 0.08, 0.16, 0.02), { pos: [DRIVER_X, 1.33, gz + 0.01] });
  // Cheeks either side of the binnacle. Faded vinyl on a face this upright reads
  // as a pale post rather than a sun-bleached top, so they take the dark grain
  // and a fastener each.
  for (const sx of [-1, 1]) {
    k.add('consoleAbs', rbox(0.035, 0.2, 0.12, 0.014), { pos: [DRIVER_X + sx * 0.235, gy + 0.02, gz + 0.03] });
    k.add('steelDark', rivet(0.0065, 0.0035), {
      pos: [DRIVER_X + sx * 0.252, gy - 0.03, gz - 0.01],
      rot: [0, 0, sx * Math.PI * 0.5],
    });
  }
  panel(k, 'gauges', { w: 0.44, h: 0.19, pos: onDial(0, 0), tilt, glass: 0.011 });
  // 5 mm off the face and 6 mm under the cover glass, which is where a pointer
  // sits and also where its ridge picks up the reflection off the inside of
  // that glass.
  dialPointers(k, 'gauges', { w: 0.44, h: 0.19, pos: onDial(0, 0), tilt, out: 0.005 });
  // bezel members proud of the face, so the dials sit in a real recess
  for (const [dx, dy, bw, bh] of [
    [0, 0.104, 0.48, 0.026],
    [0, -0.104, 0.48, 0.026],
    [0.227, 0, 0.026, 0.234],
    [-0.227, 0, 0.026, 0.234],
  ]) {
    const p = onDial(dy, 0.013);
    k.add('consoleAbs', rbox(bw, bh, 0.045, 0.007), { pos: [p[0] + dx, p[1], p[2]], rot: [tilt, 0, 0] });
  }
  // Hood over the top bezel. Seen from 250 mm above it, an 85 mm deep hood
  // presents its whole top surface across the frame and covered the upper third
  // of both dials with what read as a plank; at 50 mm it is the shadowing lip it
  // is supposed to be. The welt goes on the leading edge, which is the part
  // actually pointed at the driver.
  //
  // This edge, not the cowl, is the horizon of the cabin across the middle of the
  // interior view, and it is what bounds the pale band of bonnet the driver sees
  // over it: the brow clears at -12.5 degrees and the bonnet's own front edge sits
  // at -10, leaving 2.5 degrees — 13 of 315 pixels — of flat pale-green panel.
  // Raising the brow by 23 mm closes that exactly, and it is deliberately not
  // done. The camera rides the chassis while the cab rides the sprung mass, so the
  // eye sits anywhere between 1.65 and 1.69 m in this frame depending on how the
  // body has settled, and below 1.650 the brow already hides the bonnet on its
  // own. Half the captures have no band at all; on those, a brow raised to cover
  // it eats the same 13 pixels of trail instead. It is a body and camera problem,
  // not one the dash can win.
  k.add('consoleAbs', rbox(0.52, 0.024, 0.05, 0.009), { pos: [DRIVER_X, 1.544, 0.6], rot: [-0.24, 0, 0] });
  weltX(k, { len: 0.48, pos: [DRIVER_X, 1.537, 0.578], rot: [0.5, 0, 0], pitch: 0.028 });
  for (const dx of [-0.235, 0.235]) {
    k.add('steelDark', rivet(0.007, 0.004), { pos: [DRIVER_X + dx, 1.552, 0.6], rot: [-0.24, 0, 0] });
  }

  // column stalks either side of the cluster
  for (const [sx, len] of [
    [1, 0.15],
    [-1, 0.12],
  ]) {
    k.add('trimGloss', new THREE.CylinderGeometry(0.0085, 0.011, len, 8), {
      pos: [DRIVER_X + sx * 0.13, 1.285, 0.555],
      rot: [0.25, 0, sx * 1.15],
    });
    k.add('trimGloss', new THREE.SphereGeometry(0.012, 8, 6), {
      pos: [DRIVER_X + sx * (0.13 + len * 0.46), 1.262, 0.535],
    });
  }

  // --- centre stack --------------------------------------------------------
  // From this eye the vehicle centreline is 39 degrees off axis, so a stack built
  // square to the body presents its faces edge-on at the extreme right of frame
  // and the radio is never read. This one is yawed 17 degrees back at the driver
  // and reclined 29, which is how a rally console is built anyway. It carries no
  // visor over the crown: the first version had one, and from an eye 250 mm above
  // the pad the visor's near edge covered the radio completely.
  const px = -0.04;
  const podTilt = 0.5;
  const podYaw = -0.3;
  const podN = faceN(podTilt, podYaw);
  const onPod = (dy, out) => [
    px + out * podN[0],
    1.45 + dy * Math.cos(podTilt) + out * podN[1],
    0.645 + dy * Math.sin(podTilt) + out * podN[2],
  ];
  const podSide = (v) => [v * Math.cos(podYaw), 0, -v * Math.sin(podYaw)];
  const podAcross = (dx, dy, out) => {
    const o = podSide(dx);
    return onPod(dy, out).map((v, i) => v + o[i]);
  };
  // Carrier kept below the pad line. An upright box tall enough to back a face
  // reclined this far pokes its top edge out in front of the face's lower half,
  // which is what was cutting the heater panel in two; the visible body of the
  // pod is the tilted plate and its two cheeks instead.
  k.add('consoleAbs', rbox(0.3, 0.34, 0.22, 0.025), { pos: [px, 1.21, 0.68], rot: [0, podYaw, 0] });
  // Backing plate, in the plane of the face. It went in on `podTilt - PI/2`,
  // which is the face's *normal* rather than its plane, so a 280 x 260 slab
  // stood out of the pod like a shelf pointing at the driver and drew a pale
  // wedge straight across the radio and the heater panel — the largest flat
  // surface in the lower half of the frame and the one covering the best work
  // in it. The cheeks beside it were already on `podTilt` and had been right
  // all along.
  k.add('consoleAbs', rbox(0.28, 0.26, 0.02, 0.008), { pos: onPod(-0.015, -0.014), rot: [podTilt, podYaw, 0] });
  for (const sv of [-0.135, 0.135]) {
    k.add('consoleAbs', rbox(0.026, 0.26, 0.05, 0.008), {
      pos: podAcross(sv, -0.015, -0.022),
      rot: [podTilt, podYaw, 0],
    });
  }
  // Rolled crown. The pod is the one part of the dash that breaks the bottom
  // edge of the screen aperture, so its silhouette is read against daylight: a
  // turned-over lip reads as a moulding, and the slab-topped version before it
  // read as a hole punched in the forest.
  k.add('consoleAbs', new THREE.CylinderGeometry(0.026, 0.026, 0.28, 12, 1, false, 0, Math.PI), {
    pos: onPod(0.1, -0.012),
    rot: [Math.PI * 0.5 + podTilt, 0, -Math.PI * 0.5 - podYaw],
  });
  // A 1-DIN head unit is 180 x 50 mm; the 280 x 100 slabs that were here span a
  // third of the frame each once the face is reclined, and between them they left
  // no room on the pod for anything else.
  panel(k, 'radio', { w: 0.24, h: 0.075, pos: onPod(0.045, 0.006), tilt: podTilt, yaw: podYaw, glass: 0.005 });
  panel(k, 'hvac', { w: 0.24, h: 0.09, pos: onPod(-0.055, 0.006), tilt: podTilt, yaw: podYaw });
  // Divider between the two panels. A stitched welt was here and it read as a
  // 12-pixel black bar laid across the bottom of the radio: a welt only reads
  // where its lit face is pointed somewhere, and on a face reclined 29 degrees
  // and yawed 17 it is not. A 6 mm bright metal strip does the same job of
  // separating the two panels and gains a highlight instead of losing one.
  k.add('chrome', rbox(0.25, 0.006, 0.014, 0.002), { pos: onPod(0.0, 0.009), rot: [podTilt, podYaw, 0] });
  for (const dx of [-0.128, 0.128]) {
    k.add('steelDark', rivet(0.0065, 0.004), { pos: podAcross(dx, 0.045, 0.008), rot: [podTilt, podYaw, 0] });
  }
  // chunky rotary below the panels, where a hand lands off the shifter
  k.add('trimGloss', new THREE.CylinderGeometry(0.024, 0.028, 0.03, 14), {
    pos: onPod(-0.118, 0.013),
    rot: [podTilt - Math.PI * 0.5, podYaw, 0],
  });
  k.add('chrome', new THREE.TorusGeometry(0.026, 0.004, 6, 14), {
    pos: onPod(-0.118, 0.028),
    rot: [podTilt, podYaw, 0],
  });
  // CB handset in its clip on the outboard cheek, where it is clear of both
  // panels — hung on the driver's side it was a dark blob over the radio.
  const cbP = podAcross(-0.16, -0.03, 0.012);
  k.add('consoleAbs', rbox(0.03, 0.095, 0.024, 0.008), { pos: cbP, rot: [0.2, podYaw, -0.16] });
  k.add('gap', rbox(0.018, 0.026, 0.006, 0.002), { pos: [cbP[0] + 0.004, cbP[1] + 0.028, cbP[2] - 0.014], rot: [0.2, podYaw, -0.16] });
  k.add('steelDark', rbox(0.036, 0.014, 0.02, 0.004), { pos: [cbP[0] + 0.002, cbP[1] + 0.048, cbP[2] + 0.004], rot: [0.2, podYaw, -0.16] });
  for (const [dy, dz] of [
    [-0.058, -0.004],
    [-0.076, 0.0],
  ]) {
    k.add('trimGloss', new THREE.TorusGeometry(0.015, 0.0042, 5, 9, Math.PI * 1.5), {
      pos: [cbP[0] + 0.01, cbP[1] + dy, cbP[2] + dz],
      rot: [1.3, 0.3, 0],
    });
  }
  // Coiled lead off the handset, drooping across the pod and away to the set.
  // Every cab has one and nothing else in the frame is a curve that loose — it
  // is the one line in here that was not drawn with a straight edge.
  for (let i = 0; i < 7; i++) {
    k.add('trim', new THREE.TorusGeometry(0.019, 0.0042, 5, 10), {
      pos: [cbP[0] - 0.006 - i * 0.0155, cbP[1] - 0.098 - i * 0.011, cbP[2] + 0.004 + i * 0.004],
      rot: [1.45, 0.42 + i * 0.03, 0.3],
    });
  }
  k.add('trim', tube(
    [
      [cbP[0] - 0.105, cbP[1] - 0.175, cbP[2] + 0.03],
      [cbP[0] - 0.15, cbP[1] - 0.2, cbP[2] + 0.075],
      [cbP[0] - 0.13, cbP[1] - 0.17, cbP[2] + 0.14],
      [cbP[0] - 0.06, cbP[1] - 0.16, cbP[2] + 0.17],
    ],
    0.0045,
    5,
  ));

  // aux switch bank on the pad outboard of the cluster. Offroad builds put these
  // where a hand finds them without looking, and it is one of the few flat areas
  // on a dash actually pointed back at the driver's eye.
  const swTilt = 0.86;
  k.add('consoleAbs', rbox(0.27, 0.08, 0.11, 0.012), { pos: [0.7, PAD_TOP + 0.012, 0.665], rot: [-0.7, 0, 0] });
  panel(k, 'switches', { w: 0.24, h: 0.058, pos: [0.7, PAD_TOP + 0.042, 0.636], tilt: swTilt });
  weltX(k, { len: 0.25, pos: [0.7, PAD_TOP - 0.004, 0.615], rot: [-0.7, 0, 0], pitch: 0.028 });

  // --- steering wheel ------------------------------------------------------
  // Raked 24 degrees off vertical. A torus is built in XY with its axis on +Z,
  // which is already a wheel facing the driver, so the rake is one rotation
  // about X — the earlier PI/2 - rake laid it flat like a bus wheel and squashed
  // its silhouette to 200 mm tall. `wp` maps in-plane offsets into the cabin:
  // `dy` up the face, `dn` down the column.
  // At [1.21, 0.47] the rim's top arc landed on v = 0.95 of the frame, behind the
  // cluster and 13 pixels off the bottom edge, so the wheel — the single most
  // recognisable thing in a cabin — was effectively not in the shot. Pulled 55 mm
  // in and lifted 35 mm it crosses in front of the dials' lower third at v 0.87,
  // which is what the driver's own eye sees, and the worn leather at ten and two
  // sits in clear air.
  const wy = 1.28;
  const wz = 0.415;
  const rake = 0.42;
  const R = 0.195;
  const wu = [0, Math.cos(rake), Math.sin(rake)];
  const wn = [0, -Math.sin(rake), Math.cos(rake)];
  const wp = (dx, dy, dn = 0) => [
    DRIVER_X + dx,
    wy + dy * wu[1] + dn * wn[1],
    wz + dy * wu[2] + dn * wn[2],
  ];
  // Rim in four arcs. Only the arc between about 40 and 140 degrees is in frame,
  // so the worn sections sit at ten and two where the hands actually go and stop
  // short of the crown: the point of splitting the rim is the hard boundary
  // between polished and moulded, which needs both sides of it on screen.
  for (const [start, arc, key] of [
    [0.733, 0.628, 'wheelWorn'],
    [1.78, 0.628, 'wheelWorn'],
    [1.361, 0.419, 'wheelRim'],
    [2.409, 4.607, 'wheelRim'],
  ]) {
    const g = new THREE.TorusGeometry(R, key === 'wheelWorn' ? 0.0225 : 0.021, 12, Math.max(8, Math.round(arc * 20)), arc);
    g.rotateZ(start);
    k.add(key, g, { pos: [DRIVER_X, wy, wz], rot: [rake, 0, 0] });
    // A laced-on wrap over the two worn arcs, seam towards the driver. This is
    // the one place on the wheel where wear can be *shown* rather than shaded:
    // the moulded rim either side of it is a smooth tube whatever value it
    // carries, and a 4 mm stitched cord at ten and two is the detail that says
    // a pair of hands has been here for twenty years.
    if (key === 'wheelWorn') {
      const seam = new THREE.TorusGeometry(R + 0.019, 0.0045, 5, Math.max(8, Math.round(arc * 22)), arc);
      seam.rotateZ(start);
      const uv = seam.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * arc * 9, uv.getY(i));
      uv.needsUpdate = true;
      k.add('stitch', seam, { pos: [DRIVER_X, wy - 0.0135 * Math.sin(rake), wz + 0.0135 * Math.cos(rake)], rot: [rake, 0, 0] });
      for (const end of [start + 0.02, start + arc - 0.02]) {
        // Collar round the rim's tube at each end of the wrap, so its axis has
        // to follow the rim tangent rather than the wheel plane. On the `gap`
        // key these were four black bands round a pale tube and read as
        // insulating tape; the whipping at the end of a laced wrap is thread.
        const collar = new THREE.TorusGeometry(0.0242, 0.0022, 4, 9);
        collar.rotateX(Math.PI * 0.5);
        collar.rotateZ(end);
        collar.translate(Math.cos(end) * R, Math.sin(end) * R, 0);
        k.add('trimGloss', collar, { pos: [DRIVER_X, wy, wz], rot: [rake, 0, 0] });
      }
      // Thumb rest moulded into the back of the rim, one per worn arc. The rim
      // is a swept circle of constant section: whatever value it carries it has
      // no silhouette event anywhere along 500 mm of the bottom of the frame,
      // and this is the only place on a wheel that a real one has.
      const ta = start + arc * 0.5;
      const grip = rbox(0.03, 0.055, 0.026, 0.011);
      grip.rotateZ(ta - Math.PI * 0.5);
      grip.translate(Math.cos(ta) * (R + 0.004), Math.sin(ta) * (R + 0.004), -0.012);
      k.add('wheelWorn', grip, { pos: [DRIVER_X, wy, wz], rot: [rake, 0, 0] });
    }
  }
  // spokes: two swept lower ones and a flat top bar, the usual truck pattern.
  // A box built along Y sweeps into the wheel plane under Rz then Rx.
  for (const [sx, spin] of [
    [1, -2.53],
    [-1, 2.53],
  ]) {
    const dir = [-Math.sin(spin), Math.cos(spin)];
    k.add('consoleAbs', rbox(0.038, 0.15, 0.026, 0.01), {
      pos: wp(dir[0] * 0.128, dir[1] * 0.128, -0.004),
      rot: [rake, 0, spin],
    });
  }
  k.add('consoleAbs', rbox(R * 1.45, 0.032, 0.028, 0.012), { pos: wp(0, 0.055, -0.006), rot: [rake, 0, 0] });
  // hub and horn pad, both on the column axis
  k.add('consoleAbs', new THREE.CylinderGeometry(0.056, 0.062, 0.05, 18), {
    pos: wp(0, 0, 0.008),
    rot: [Math.PI * 0.5 + rake, 0, 0],
  });
  // Matte moulded horn pad, not gloss. At 400 mm from the lens and turned
  // straight at it, a 100 mm gloss disc caught the whole sky and came back as a
  // white ellipse in the bottom centre of the frame — the single brightest thing
  // in the shot, on the least interesting object in it.
  k.add('consoleAbs', new THREE.CylinderGeometry(0.05, 0.05, 0.014, 18), {
    pos: wp(0, 0, -0.026),
    rot: [Math.PI * 0.5 + rake, 0, 0],
  });
  k.add('gap', new THREE.TorusGeometry(0.045, 0.0035, 5, 16), { pos: wp(0, 0, -0.032), rot: [rake, 0, 0] });
  k.add('alu', rbox(0.055, 0.012, 0.006, 0.002), { pos: wp(0, 0, -0.034), rot: [rake, 0, 0] });
  // Moulded surround, not the polished ring it was: turned straight at the lens
  // at 400 mm, a torus on a specular key drew a hard white circle round the one
  // object in the frame that should be reading as matte plastic.
  k.add('trimGloss', new THREE.TorusGeometry(0.05, 0.005, 6, 18), { pos: wp(0, 0, -0.03), rot: [rake, 0, 0] });
  // column shroud, forward and down into the fascia
  k.add('consoleAbs', new THREE.CylinderGeometry(0.05, 0.062, 0.2, 14), {
    pos: wp(0, 0, 0.12),
    rot: [Math.PI * 0.5 + rake, 0, 0],
  });
  k.add('gap', new THREE.CylinderGeometry(0.066, 0.066, 0.03, 14), {
    pos: wp(0, 0, 0.225),
    rot: [Math.PI * 0.5 + rake, 0, 0],
  });
}

function buildConsole(k) {
  // Pushed well forward of the eye: at the old z the shift knobs sat 100 mm off
  // the lens and filled a third of the frame with two featureless spheres.
  const cz = 0.28;
  k.add('consoleAbs', rbox(0.34, 0.26, 0.66, 0.035), { pos: [0.0, FLOOR + 0.15, cz - 0.14] });
  k.add('interiorFaded', rbox(0.35, 0.035, 0.62, 0.014), { pos: [0.0, FLOOR + 0.29, cz - 0.16] });
  weltZ(k, { len: 0.58, pos: [0.16, FLOOR + 0.285, cz - 0.16], rot: [0, 0, 0.5] });
  weltZ(k, { len: 0.58, pos: [-0.16, FLOOR + 0.285, cz - 0.16], rot: [0, 0, -0.5] });

  // Shifter and transfer lever in a moulded boot.
  //
  // Both shafts were on `steelDark` and the boots on `interiorPlastic`, and from
  // anywhere across the console they rendered as two white tubes — the brightest
  // objects in the back half of the cab, reading as PVC pipe standing out of the
  // floor. Neither key is wrong about its own albedo; the problem is what is
  // added to it. `steelDark` carries `applyBrightwork`, which is a *sky*
  // reflection model, and unlike the cabin light it has no box gate: a vertical
  // tube sweeps its normal straight through the hot skyline band of that model,
  // so the one shape most able to collect it is sitting in a closed cab that can
  // see no sky at all. `interiorPlastic` is the fascia key at gain 7.2 and fill
  // 2.95, which is right for the one panel the windscreen points at and much too
  // much for a gaiter at knee height.
  //
  // `rubber` has no brightwork on it and the lowest gain in the cabin table, and
  // a moulded rubber gaiter over the shaft is what this truck would have. The
  // worn knob stays the light part, which is the way round it should have been.
  for (const [dx, h, r] of [
    [0.06, 0.24, 0.016],
    [-0.07, 0.18, 0.013],
  ]) {
    k.add('gap', new THREE.CylinderGeometry(0.05, 0.062, 0.05, 12), { pos: [dx, FLOOR + 0.3, cz - 0.02] });
    k.add('rubber', new THREE.CylinderGeometry(0.036, 0.055, 0.09, 12), { pos: [dx, FLOOR + 0.34, cz - 0.02], rot: [-0.14, 0, 0] });
    k.add('rubber', new THREE.CylinderGeometry(r * 0.8, r, h, 8), {
      pos: [dx, FLOOR + 0.4 + h * 0.42, cz - 0.04],
      rot: [-0.18, 0, 0],
    });
    k.add('rubber', new THREE.SphereGeometry(0.032, 14, 10), { pos: [dx, FLOOR + 0.42 + h, cz - 0.07] });
  }
  // handbrake
  k.add('rubber', new THREE.CylinderGeometry(0.017, 0.022, 0.24, 10), {
    pos: [-0.02, FLOOR + 0.34, cz - 0.4],
    rot: [-0.85, 0, 0],
  });
  // The knob and the handbrake grip were on `wheelWorn`, which is not a cabin
  // key at all — it has no entry in the table above, so no box gate, no tint and
  // no enclosure term, and it carries `applyBrightwork` at strength 1.25 with a
  // 0.6 band. Every one of those numbers was set for the steering wheel rim, a
  // 400 mm tube dead centre of frame whose whole read is one sheen along its
  // crown. On a 64 mm sphere the same band covers the entire upper hemisphere,
  // which is how the gear knob ended up the palest object in the cab. It stays
  // the wheel's key alone; a work truck's knob is moulded rubber.
  k.add('rubber', new THREE.CylinderGeometry(0.019, 0.019, 0.11, 10), { pos: [-0.02, FLOOR + 0.42, cz - 0.53], rot: [-0.85, 0, 0] });
  k.add('chrome', new THREE.CylinderGeometry(0.008, 0.008, 0.03, 8), { pos: [-0.02, FLOOR + 0.455, cz - 0.585], rot: [-0.85, 0, 0] });

  // cup holders and a bin, because a flat console lid is a 400 mm slab
  for (const dx of [-0.075, 0.075]) {
    k.add('gap', new THREE.CylinderGeometry(0.042, 0.038, 0.06, 14), { pos: [dx, FLOOR + 0.28, cz - 0.34] });
    k.add('trimGloss', new THREE.TorusGeometry(0.043, 0.005, 6, 14), { pos: [dx, FLOOR + 0.302, cz - 0.34], rot: [Math.PI / 2, 0, 0] });
  }
  k.add('gap', rbox(0.24, 0.03, 0.16, 0.008), { pos: [0, FLOOR + 0.295, cz - 0.56] });
  k.add('consoleAbs', rbox(0.23, 0.035, 0.15, 0.01), { pos: [0, FLOOR + 0.3, cz - 0.57], rot: [-0.1, 0, 0] });
}

function buildFloor(k) {
  const midZ = (S.cabFrontZ + S.cabRearZ) * 0.5;
  k.add('interiorPlastic', rbox(HW * 2 - 0.16, 0.03, S.cabFrontZ - S.cabRearZ - 0.08, 0.01), {
    pos: [0, FLOOR + 0.02, midZ],
  });
  // transmission tunnel
  k.add('interiorPlastic', rbox(0.4, 0.16, S.cabFrontZ - S.cabRearZ - 0.1, 0.05), { pos: [0, FLOOR + 0.05, midZ] });
  // mats, one a side, with a raised heel pad
  for (const sx of [-1, 1]) {
    k.add('floorMat', rbox(0.52, 0.022, 0.62, 0.012), { pos: [sx * 0.52, FLOOR + 0.045, 0.32] });
    k.add('floorMat', rbox(0.24, 0.016, 0.18, 0.008), { pos: [sx * 0.5, FLOOR + 0.062, 0.1] });
    k.add('trimGloss', rbox(0.05, 0.01, 0.05, 0.004), { pos: [sx * 0.66, FLOOR + 0.058, 0.5] });
  }
  k.add('floorMat', rbox(1.42, 0.02, 0.4, 0.01), { pos: [0, FLOOR + 0.045, S.cabRearZ + 0.3] });

  // pedals, hanging off the bulkhead
  for (const [dx, w] of [
    [0.42, 0.07],
    [0.28, 0.06],
  ]) {
    k.add('steelDark', rbox(0.014, 0.16, 0.03, 0.005), { pos: [dx, FLOOR + 0.24, 0.62], rot: [0.3, 0, 0] });
    k.add('floorMat', rbox(w, 0.11, 0.02, 0.006), { pos: [dx, FLOOR + 0.16, 0.585], rot: [0.3, 0, 0] });
  }
  k.add('steelDark', rbox(0.02, 0.2, 0.04, 0.006), { pos: [0.56, FLOOR + 0.22, 0.6], rot: [0.24, 0, 0] });
  k.add('floorMat', rbox(0.055, 0.13, 0.02, 0.006), { pos: [0.56, FLOOR + 0.13, 0.56], rot: [0.24, 0, 0] });
}

// ---------------------------------------------------------------------------
// Seats.
//
// The two front seats are the largest soft objects in the cab and they read
// through the side glass from `hero` and `wheel` as well as filling the left of
// the interior frame, so they carry a lot of the shot. The version before this
// was a rounded box per part with flute slabs laid on top and the side bolsters
// modelled as separate `interiorPlastic` rolls, which produced two specific
// failures:
//
//  - The bolsters were the *brightest* thing on the seat. `interiorPlastic`
//    runs at gain 7.2 against cloth at 2.4 and carries the sun-crazing net, so
//    a pair of pale blotched tubes framed a near-black cloth insert. A seat is
//    the other way round: the crown of a bolster is the lightest part of a
//    single dark matte object, by a stop at most.
//  - Every form was a slab. Flutes were 30 mm boxes floating on the cushion
//    with square ends and a shadow gap under them, which at 600 mm from the
//    lens reads as packing foam rather than upholstery.
//
// Both cushion and backrest are now one sculpted body each: bolsters, the dish
// somebody has worn into the middle, the flutes, the lumbar and the roll under
// the leading edge are all displacements of the same surface, and the piping
// runs along the same field so it climbs the bolster instead of cutting it.
// ---------------------------------------------------------------------------

// The door card's inner face is at 0.6955 and the seat centreline is at 0.42,
// so the outboard bolster crest may not pass 0.275 from centre.
const SEAT_W = 0.47;
const CUSH_H = 0.17;
const CUSH_D = 0.52;
const BACK_H = 0.6;
const BACK_D = 0.185;

/** Where the flute grooves fall across an insert, in normalised panel width. */
const FLUTES = [-0.3, 0, 0.3];

function fluteGroove(u, gate) {
  let g = 0;
  for (const c of FLUTES) g += gauss(u - c, 0.075);
  return Math.min(1, g) * gate;
}

function cushionField(x, y, z, n) {
  const u = x / (SEAT_W * 0.5);
  const v = z / (CUSH_D * 0.5);
  const top = smoothTo(0.05, 0.7, n.y);
  // the bolster has to wrap the outside of the roll or it stops at a hard
  // edge halfway down and reads as a lid
  const flank = Math.min(1, Math.abs(n.x) * 1.3) * smoothTo(-0.7, 0.35, y / (CUSH_H * 0.5));
  const face = Math.max(top, flank);
  const ins = 1 - smoothTo(0.2, 0.62, Math.abs(u));
  let d = 0.038 * smoothTo(0.36, 0.9, Math.abs(u)) * (0.6 + 0.4 * smoothTo(-1.0, 0.4, v)) * face;
  d -= 0.026 * ins * gauss(v + 0.1, 0.62) * top;
  d -= 0.013 * fluteGroove(u, ins * (1 - smoothTo(0.5, 0.92, Math.abs(v)))) * top;
  // leading edge rolls under the thigh; the back tucks down into the joint
  d -= 0.03 * smoothTo(0.72, 1.04, v) * top;
  d -= 0.028 * smoothTo(-0.72, -1.04, v) * top;
  return d;
}

function backField(x, y, z, n) {
  const u = x / (SEAT_W * 0.5);
  const w = y / (BACK_H * 0.5);
  const front = smoothTo(0.05, 0.7, n.z);
  const flank = Math.min(1, Math.abs(n.x) * 1.3) * smoothTo(-0.8, 0.25, z / (BACK_D * 0.5));
  const face = Math.max(front, flank);
  const ins = 1 - smoothTo(0.22, 0.64, Math.abs(u));
  // shoulder wings deepest at the chest, easing off towards the hip
  let d = 0.034 * smoothTo(0.38, 0.92, Math.abs(u)) * (0.55 + 0.45 * smoothTo(-1.0, 0.35, w)) * face;
  d += 0.016 * ins * gauss(w + 0.52, 0.34) * front;
  d -= 0.014 * ins * gauss(w - 0.55, 0.42) * front;
  d -= 0.012 * fluteGroove(u, ins * (1 - smoothTo(0.55, 0.94, Math.abs(w)))) * front;
  // the joint between the two insert panels, and the roll top and bottom
  d -= 0.013 * ins * gauss(w + 0.12, 0.06) * front;
  d -= 0.024 * smoothTo(0.78, 1.06, w) * front;
  d -= 0.02 * smoothTo(-0.8, -1.06, w) * front;
  return d;
}

function headField(x, y, z, n) {
  const u = x / 0.135;
  const w = y / 0.078;
  const front = smoothTo(0.0, 0.75, Math.abs(n.z));
  let d = 0.007 * (1 - smoothTo(0.15, 1.0, Math.abs(u))) * (1 - smoothTo(0.15, 1.0, Math.abs(w)));
  d -= 0.011 * gauss(w, 0.11) * front;
  d -= 0.008 * smoothTo(0.62, 1.06, Math.abs(u));
  return d;
}

/** One front bucket, mirrored about the centreline by the caller. */
function buildSeat(k, sx) {
  const x = sx * 0.42;
  const z = 0.14;
  const cushY = FLOOR + 0.345;
  const backY = FLOOR + 0.69;
  const backZ = z - 0.33;
  const cushXf = { pos: [x, cushY, z] };
  const backXf = { pos: [x, backY, backZ], rot: [-0.16, 0, 0] };

  k.add('fabric', sculpt(rbox(SEAT_W, CUSH_H, CUSH_D, 0.055, 5), cushionField), cushXf);
  k.add('fabric', sculpt(rbox(SEAT_W, BACK_H, BACK_D, 0.055, 5), backField), backXf);

  // Piping round each insert: down one side, across the end, back up the
  // other. One cord rather than three straight welts, because the corners are
  // where it stops reading as a stripe.
  //
  // The cord is cloth, not the `stitch` key. A welt is the panel's own material
  // rolled over a filler and the seam is the two edges meeting under it, so at
  // 600 mm from the lens what reads is a raised crest with a shadow line each
  // side. Run on `stitch` it was 29 per cent cotton albedo against a 2 per cent
  // cloth, which is a fifteen to one ratio: the piping came out as a bright
  // yellow dashed line down a black slab and was the only thing on the seat you
  // could see at all.
  const ch = CUSH_H * 0.5;
  const cu = SEAT_W * 0.5 * 0.66;
  seam(k, {
    xform: cushXf,
    normal: [0, 1, 0],
    fn: cushionField,
    key: 'fabric',
    r: 0.009,
    pts: [
      [-cu, ch, -0.2],
      [-cu, ch, -0.06],
      [-cu - 0.006, ch, 0.1],
      [-cu - 0.01, ch, 0.175],
      [-cu * 0.62, ch, 0.212],
      [0, ch, 0.219],
      [cu * 0.62, ch, 0.212],
      [cu + 0.01, ch, 0.175],
      [cu + 0.006, ch, 0.1],
      [cu, ch, -0.06],
      [cu, ch, -0.2],
    ],
  });
  const bh = BACK_D * 0.5;
  const bu = SEAT_W * 0.5 * 0.68;
  seam(k, {
    xform: backXf,
    normal: [0, 0, 1],
    fn: backField,
    key: 'fabric',
    r: 0.009,
    pts: [
      [-bu, -0.26, bh],
      [-bu, -0.08, bh],
      [-bu - 0.008, 0.12, bh],
      [-bu - 0.012, 0.235, bh],
      [-bu * 0.6, 0.278, bh],
      [0, 0.286, bh],
      [bu * 0.6, 0.278, bh],
      [bu + 0.012, 0.235, bh],
      [bu + 0.008, 0.12, bh],
      [bu, -0.08, bh],
      [bu, -0.26, bh],
    ],
  });
  // Thread down each flute groove and along the joint between the two backrest
  // panels. Sunk below the surface rather than sitting on it: the groove is
  // already a shadow line, and a `stitch` cord standing proud of it is bright
  // enough to erase the form it is supposed to describe.
  for (const c of FLUTES) {
    const fx = c * SEAT_W * 0.5;
    seam(k, {
      xform: cushXf,
      normal: [0, 1, 0],
      fn: cushionField,
      r: 0.0032,
      lift: -0.0055,
      pts: [
        [fx, ch, -0.15],
        [fx, ch, 0.0],
        [fx, ch, 0.15],
      ],
    });
    seam(k, {
      xform: backXf,
      normal: [0, 0, 1],
      fn: backField,
      r: 0.0032,
      lift: -0.005,
      pts: [
        [fx, -0.2, bh],
        [fx, 0.0, bh],
        [fx, 0.22, bh],
      ],
    });
  }
  seam(k, {
    xform: backXf,
    normal: [0, 0, 1],
    fn: backField,
    r: 0.0034,
    lift: -0.0055,
    pts: [
      [-0.13, -0.036, bh],
      [0, -0.036, bh],
      [0.13, -0.036, bh],
    ],
  });

  // Headrest on two posts, high enough that the posts actually show. Tipped a
  // little further forward than the backrest, which is both how one is set and
  // what keeps its top off the liner: the roof bow at z = -0.24 runs directly
  // over it with its underside at 1.867, and this leaves 30 mm.
  const hrY = FLOOR + 1.125;
  const hrZ = backZ - 0.075;
  for (const dx of [-0.078, 0.078]) {
    k.add('alu', new THREE.CylinderGeometry(0.0085, 0.0085, 0.1, 8), {
      pos: [x + dx, FLOOR + 1.005, hrZ + 0.026],
      rot: [-0.16, 0, 0],
    });
    k.add('trimGloss', new THREE.CylinderGeometry(0.014, 0.015, 0.022, 8), {
      pos: [x + dx, FLOOR + 0.97, hrZ + 0.032],
      rot: [-0.16, 0, 0],
    });
  }
  const headXf = { pos: [x, hrY, hrZ], rot: [-0.1, 0, 0] };
  k.add('fabric', sculpt(rbox(0.27, 0.156, 0.145, 0.05, 3), headField), headXf);
  seam(k, {
    xform: headXf,
    normal: [0, 0, 1],
    fn: headField,
    r: 0.0034,
    lift: -0.004,
    pts: [
      [-0.105, 0.0, 0.0725],
      [0, 0.0, 0.0725],
      [0.105, 0.0, 0.0725],
    ],
  });

  // Back shell.
  //
  // Two things were wrong with the slab this replaces. It was on
  // `interiorPlastic`, which runs at gain 7.2 and fill 2.95 because it has to
  // carry the fascia — the one vertical face the screen points straight at —
  // and a seat back is the opposite case: it looks at the rear bulkhead 700 mm
  // away and sees no glass at all, so it came out the brightest surface in the
  // back half of the cab. And it was 420 by 580 of one value, which from the
  // rear bench is the largest flat in the frame.
  //
  // So: a dark moulded surround, a lighter centre standing proud of it with a
  // shadow line round its edge, three stiffening ribs across that, and the
  // pocket under it. Every layer stands *out* rather than being let in — a
  // recess cut with boxes is a box in front of a box, and the first version of
  // this had the shadow box completely occluding the panel it was supposed to
  // be edging, which rendered as a black hole in a pale frame.
  //
  // `dz` is out the back of the seat along the panel normal, so the stack reads
  // in the order it is written.
  const shellAt = (dx, dy, dz) => [
    x + dx,
    backY + 0.01 + dy * Math.cos(0.16) - dz * Math.sin(0.16),
    backZ - 0.095 - dy * Math.sin(0.16) - dz * Math.cos(0.16),
  ];
  const shellRot = [-0.16, 0, 0];
  // Measured off the id pass from behind the seat: `cardWoven` renders here at
  // 0.185 against cloth at 0.149, `interiorPlastic` at 0.187 and `rubber` — the
  // key whose whole job is to be the true black in the cab — at 0.289, because
  // it is the one cabin key with no `applyCabinBounce` entry and so keeps a
  // full hemisphere term in a volume where nothing else has one. On a 420 by
  // 580 panel that read as a white picture frame round the seat back.
  k.add('cardWoven', rbox(0.42, 0.58, 0.03, 0.024), { pos: shellAt(0, 0, 0), rot: shellRot });
  k.add('gap', rbox(0.35, 0.44, 0.028, 0.005), { pos: shellAt(0, 0.03, 0.006), rot: shellRot });
  // Cloth-backed centre, which is what the moulding is actually filled with and
  // also the one filling that is *darker* than its frame. Run in vinyl it was a
  // pale tan card in a dark surround and read as a picture hung on the seat.
  k.add('fabric', sculpt(rbox(0.318, 0.408, 0.026, 0.01, 3), (px, py, pz, n) => {
    const front = smoothTo(0.05, 0.7, n.z);
    let d = -0.004 * (1 - smoothTo(0.2, 0.98, Math.abs(px / 0.159))) * (1 - smoothTo(0.2, 0.98, Math.abs(py / 0.204))) * front;
    d -= 0.004 * gauss(Math.abs(py) - 0.115, 0.022) * front;
    return d;
  }), { pos: shellAt(0, 0.03, 0.01), rot: shellRot });
  for (const dy of [0.145, -0.085]) {
    k.add('cardWoven', rbox(0.33, 0.022, 0.016, 0.006), { pos: shellAt(0, 0.03 + dy, 0.012), rot: shellRot });
  }
  // Map pocket, its elastic top edge sagging away from the panel. The binding
  // was on `trim` — gain 4.6, sun 4.6, fill 2.7, the highest key in the table —
  // and from the rear bench it rendered as a 290 mm pale grey tube laid across
  // the seat back, brighter than anything else in that half of the cab. It is
  // elastic webbing, so it runs on cloth, with a shadow gap under it doing the
  // separating that a value difference was doing before.
  k.add('fabric', rbox(0.29, 0.2, 0.03, 0.012), { pos: shellAt(0, -0.16, 0.03), rot: [-0.23, 0, 0] });
  k.add('gap', rbox(0.286, 0.006, 0.03, 0.002), { pos: shellAt(0, -0.049, 0.031), rot: [-0.23, 0, 0] });
  k.add('fabric', rbox(0.29, 0.018, 0.036, 0.008), { pos: shellAt(0, -0.062, 0.035), rot: [-0.23, 0, 0] });
  for (const dx of [-0.185, 0.185]) {
    k.add('steelDark', rivet(0.008, 0.004), { pos: shellAt(dx, 0.25, 0.016), rot: [Math.PI * 0.5 + 0.16, 0, 0] });
  }

  // Frame, rails and the recliner wheel. The pedestal is what stops the seat
  // floating: from the passenger side you see straight under the cushion.
  k.add('steelDark', rbox(0.46, 0.045, 0.06, 0.012), { pos: [x, FLOOR + 0.235, z + 0.02] });
  for (const dx of [-0.17, 0.17]) {
    k.add('steelDark', rbox(0.04, 0.1, 0.47, 0.01), { pos: [x + dx, FLOOR + 0.165, z] });
    k.add('gap', rbox(0.026, 0.03, 0.45, 0.006), { pos: [x + dx, FLOOR + 0.176, z] });
    k.add('steelDark', rbox(0.055, 0.11, 0.055, 0.008), { pos: [x + dx, FLOOR + 0.06, z - 0.17] });
    k.add('steelDark', rbox(0.055, 0.11, 0.055, 0.008), { pos: [x + dx, FLOOR + 0.06, z + 0.19] });
  }
  k.add('trimGloss', new THREE.CylinderGeometry(0.026, 0.026, 0.014, 12), {
    pos: [x + sx * 0.245, FLOOR + 0.29, z - 0.13],
    rot: [0, 0, Math.PI * 0.5],
  });
  k.add('trimGloss', rbox(0.016, 0.016, 0.09, 0.005), { pos: [x + sx * 0.252, FLOOR + 0.315, z + 0.06], rot: [0.2, 0, 0] });

  // Belt: webbing over the shoulder into a guide on the pillar, and the buckle
  // stalk lying on the inboard bolster where one ends up.
  k.add('trim', rbox(0.048, 0.58, 0.012, 0.004), { pos: [x + sx * 0.225, FLOOR + 0.7, z - 0.235], rot: [0.12, 0, sx * 0.18] });
  k.add('trimGloss', rbox(0.05, 0.07, 0.03, 0.01), { pos: [x + sx * 0.245, FLOOR + 1.0, z - 0.205] });
  k.add('trim', rbox(0.046, 0.16, 0.01, 0.004), { pos: [x - sx * 0.19, FLOOR + 0.41, z - 0.05], rot: [1.35, 0, -sx * 0.12] });
  k.add('gap', rbox(0.05, 0.085, 0.028, 0.008), { pos: [x - sx * 0.196, FLOOR + 0.45, z - 0.115], rot: [0.2, 0, -sx * 0.12] });
}

function buildSeats(k) {
  for (const sx of [-1, 1]) buildSeat(k, sx);

  // Rear bench: one piece, same sculpt at a coarser subdivision because
  // nothing gets closer to it than 1.6 m. The cushion carries the dish and the
  // squab the flutes; the bolsters are only at the outer ends, which is what a
  // bench has instead of a bucket's wings.
  const bz = S.cabRearZ + 0.36;
  const bw = 1.46;
  const benchCushion = (px, py, pz, n) => {
    const u = px / (bw * 0.5);
    const v = pz / 0.21;
    const top = smoothTo(0.05, 0.7, n.y);
    let d = 0.026 * smoothTo(0.78, 0.99, Math.abs(u)) * top;
    d -= 0.016 * (1 - smoothTo(0.6, 0.95, Math.abs(u))) * gauss(v + 0.1, 0.7) * top;
    d -= 0.012 * gauss(Math.abs(u) - 0.31, 0.05) * top;
    d -= 0.026 * smoothTo(0.7, 1.05, v) * top;
    return d;
  };
  k.add('fabric', sculpt(rbox(bw, 0.15, 0.42, 0.05, 4), benchCushion), { pos: [0, FLOOR + 0.305, bz] });

  const squabZ = S.cabRearZ + 0.185;
  const benchBack = (px, py, pz, n) => {
    const u = px / (bw * 0.5);
    const w = py / 0.23;
    const front = smoothTo(0.05, 0.7, n.z);
    let d = 0.024 * smoothTo(0.8, 0.995, Math.abs(u)) * front;
    let g = 0;
    for (let i = -2; i <= 2; i++) g += gauss(u - i * 0.3, 0.05);
    d -= 0.013 * Math.min(1, g) * (1 - smoothTo(0.6, 0.96, Math.abs(w))) * front;
    d -= 0.012 * gauss(Math.abs(u) - 0.31, 0.045) * front;
    d -= 0.018 * smoothTo(0.72, 1.05, w) * front;
    return d;
  };
  k.add('fabric', sculpt(rbox(bw, 0.46, 0.15, 0.05, 4), benchBack), {
    pos: [0, FLOOR + 0.555, squabZ],
    rot: [-0.1, 0, 0],
  });
  weltX(k, { len: 1.4, pos: [0, FLOOR + 0.375, S.cabRearZ + 0.25], rot: [0.5, 0, 0], pitch: 0.03 });

  // Bench headrests. These used to sit at z = -0.75 with the rear bulkhead
  // panel occupying -0.83 to -0.79, so both of them stood 15 mm inside the wall
  // they are bolted in front of.
  for (const dx of [-0.45, 0.45]) {
    for (const px of [dx - 0.06, dx + 0.06]) {
      k.add('alu', new THREE.CylinderGeometry(0.0075, 0.0075, 0.07, 6), {
        pos: [px, FLOOR + 0.775, squabZ - 0.032],
        rot: [-0.1, 0, 0],
      });
    }
    k.add('fabric', sculpt(rbox(0.22, 0.125, 0.12, 0.045, 3), headField), {
      pos: [dx, FLOOR + 0.855, squabZ - 0.04],
      rot: [-0.08, 0, 0],
    });
  }
}

/**
 * Inboard face of the door trim.
 *
 * This was `HW - 0.075` = 0.805, and at that x the entire door card was behind
 * something. `body.js` backs its shut lines with a 3.14 m black slab at
 * x = 0.71-0.76, y = 0.62-1.44 — "so a gap shows darkness rather than sky" —
 * and from the driver's eye that slab is what you see: it measured 44 per cent
 * of the bottom left quadrant of the interior frame as featureless `body_gap`,
 * with the armrest, pull cup, speaker, switches and scuff plate all hidden
 * behind it. A trim panel sits inboard of the outer skin anyway, so the card
 * moves in to 0.70 and a waist shelf bridges out to the glass.
 */
const CARD_X = 0.7;

function buildDoors(k) {
  const dz0 = -0.05;
  const dz1 = 0.86;
  const dzc = (dz0 + dz1) * 0.5;
  const len = dz1 - dz0;
  for (const sx of [-1, 1]) {
    const px = sx * (CARD_X + 0.025);
    // card: three stacked sections with a shadow gap between them, so it is not
    // one flat panel seen edge-on
    k.add('cardWoven', rbox(0.05, 0.2, len, 0.02), { pos: [px, BELT - 0.09, dzc] });
    k.add('gap', rbox(0.035, 0.02, len - 0.02, 0.005), { pos: [px - sx * 0.012, BELT - 0.2, dzc] });
    k.add('fabric', rbox(0.035, 0.24, len - 0.06, 0.012), { pos: [px - sx * 0.012, BELT - 0.33, dzc] });
    k.add('cardWoven', rbox(0.05, 0.26, len, 0.02), { pos: [px, BELT - 0.6, dzc] });
    weltZ(k, { len: len - 0.05, pos: [px - sx * 0.03, BELT - 0.2, dzc], rot: [0, 0, sx * Math.PI * 0.5] });

    // Relief on the upper card. Only y = 1.13-1.44 of the door is above the
    // bottom edge of the interior frame, and that band was one moulding 200 mm
    // by 900 mm carrying a single value — the largest flat left in the shot once
    // the card came out from behind the body's shut-line backing.
    k.add('cardWoven', rbox(0.034, 0.032, len - 0.04, 0.01), { pos: [px - sx * 0.024, BELT - 0.062, dzc], rot: [0, 0, sx * 0.5] });
    k.add('gap', rbox(0.028, 0.014, len - 0.05, 0.004), { pos: [px - sx * 0.026, BELT - 0.086, dzc] });
    // vertical moulding breaks, so the card is three panels rather than one
    for (const bz of [dz0 + 0.55, dz0 + 0.82]) {
      k.add('gap', rbox(0.03, 0.19, 0.014, 0.004), { pos: [px - sx * 0.019, BELT - 0.1, bz] });
      k.add('cardWoven', rbox(0.03, 0.185, 0.03, 0.008), { pos: [px - sx * 0.028, BELT - 0.1, bz - 0.02] });
      k.add('steelDark', rivet(0.007, 0.004), {
        pos: [px - sx * 0.044, BELT - 0.16, bz - 0.02],
        rot: [0, 0, sx * Math.PI * 0.5],
      });
    }
    // door-edge reflector down by the front break, where every truck has one
    k.add('gap', rbox(0.024, 0.036, 0.09, 0.005), { pos: [px - sx * 0.024, BELT - 0.15, dz0 + 0.68] });
    k.add('reflectorRed', rbox(0.02, 0.026, 0.078, 0.004), { pos: [px - sx * 0.036, BELT - 0.15, dz0 + 0.68] });
    // Elbow polish along the waist. Two seasons of leaning on the sill takes the
    // grain off the top roll for about 250 mm and nowhere else, and this is one
    // of the few pieces of the door above the bottom edge of the frame.
    k.add('wheelWorn', new THREE.CylinderGeometry(0.031, 0.031, 0.26, 10), {
      pos: [sx * (CARD_X + 0.012), BELT + 0.006, dz0 + 0.68],
      rot: [Math.PI * 0.5, 0, 0],
    });

    // Torch in two spring clips, on the flat of the upper card. Only 190 mm of
    // this door is above the bottom edge of the interior frame and all of it was
    // brown moulding; a 240 mm alloy tube 700 mm from the lens is the one thing
    // that could go there and read as a different substance at a glance.
    // Anodised black with an alloy head, not bare alloy: at 700 mm from the lens
    // a pale 40 mm tube is the brightest thing in that third of the frame and it
    // reads as plumbing. The bright part is the 50 mm bezel, which is enough.
    const tz = dz0 + 0.5;
    k.add('trimGloss', new THREE.CylinderGeometry(0.019, 0.019, 0.2, 12), {
      pos: [px - sx * 0.048, BELT - 0.058, tz],
      rot: [Math.PI * 0.5, 0, 0],
    });
    k.add('wheelWorn', new THREE.CylinderGeometry(0.0205, 0.0205, 0.07, 12), {
      pos: [px - sx * 0.048, BELT - 0.058, tz - 0.06],
      rot: [Math.PI * 0.5, 0, 0],
    });
    k.add('alu', new THREE.CylinderGeometry(0.026, 0.021, 0.05, 12), {
      pos: [px - sx * 0.048, BELT - 0.058, tz + 0.125],
      rot: [Math.PI * 0.5, 0, 0],
    });
    k.add('gap', new THREE.CylinderGeometry(0.021, 0.021, 0.008, 12), {
      pos: [px - sx * 0.048, BELT - 0.058, tz + 0.149],
      rot: [Math.PI * 0.5, 0, 0],
    });
    for (const cz of [tz - 0.075, tz + 0.075]) {
      k.add('trimGloss', new THREE.TorusGeometry(0.023, 0.0045, 5, 10, Math.PI * 1.25), {
        pos: [px - sx * 0.048, BELT - 0.058, cz],
        rot: [0, Math.PI * 0.5, sx * 2.0],
      });
      k.add('steelDark', rivet(0.006, 0.0035), {
        pos: [px - sx * 0.03, BELT - 0.04, cz],
        rot: [0, 0, sx * Math.PI * 0.5],
      });
    }

    // Waist capping. A 900 mm rolled edge in one substance runs the whole left
    // side of the frame; the alloy strip along its crown is where the light from
    // the side glass actually lands, so it is the brightest line in that third
    // and the roll below it stops being the widest thing there.
    k.add('alu', rbox(0.032, 0.01, len - 0.02, 0.003), {
      pos: [sx * (CARD_X + 0.026), BELT + 0.03, dzc],
      rot: [0, 0, -sx * 0.42],
    });

    // Waist shelf out to the glass. The card is 145 mm inboard of the outer
    // skin, so without this there is a slot straight through to the door cavity.
    k.add('interiorPlastic', rbox(0.16, 0.03, len, 0.008), {
      pos: [sx * (CARD_X + 0.085), BELT - 0.012, dzc],
      rot: [0, 0, sx * 0.14],
    });
    // top roll and the window sill / weather strip
    k.add('interiorPlastic', new THREE.CylinderGeometry(0.03, 0.03, len, 12), {
      pos: [sx * (CARD_X + 0.012), BELT + 0.006, dzc],
      rot: [Math.PI * 0.5, 0, 0],
    });
    weltZ(k, { len: len - 0.06, pos: [sx * (CARD_X + 0.03), BELT + 0.026, dzc], rot: [0, 0, -sx * 0.5], pitch: 0.03 });
    k.add('trim', rbox(0.05, 0.022, len + 0.04, 0.008), { pos: [sx * (HW - 0.038), BELT - 0.012, dzc] });
    // Weatherstrip along the glass, with the felt run-channel lip standing proud
    // of it. Nine hundred millimetres of matte black at the top of the door is
    // what the pale waist roll needs to be read against — before it the whole
    // left edge of the frame was one substance from the glass down to the
    // armrest.
    k.add('rubber', rbox(0.05, 0.026, len, 0.006), { pos: [sx * (HW - 0.056), BELT + 0.012, dzc] });
    k.add('rubber', rbox(0.016, 0.024, len, 0.005), {
      pos: [sx * (HW - 0.08), BELT + 0.026, dzc],
      rot: [0, 0, -sx * 0.22],
    });
    // Window switch pack, let into the waist shelf. The shelf is the one part
    // of the door still inside the bottom left of the frame — everything below
    // the beltline is under the sight line from this eye — and it was 900 mm of
    // bare capping. Two rockers and a lock slide is what is actually there.
    const swz = dz0 + 0.68;
    k.add('gap', rbox(0.115, 0.016, 0.095, 0.004), { pos: [sx * (CARD_X + 0.085), BELT + 0.006, swz], rot: [0, 0, sx * 0.14] });
    k.add('trimGloss', rbox(0.1, 0.02, 0.082, 0.006), { pos: [sx * (CARD_X + 0.085), BELT + 0.008, swz], rot: [0, 0, sx * 0.14] });
    for (const [rz, rw] of [
      [-0.024, 0.03],
      [0.024, 0.03],
    ]) {
      k.add('consoleAbs', rbox(0.052, 0.012, rw, 0.004), {
        pos: [sx * (CARD_X + 0.085), BELT + 0.021, swz + rz],
        rot: [sx * 0.22, 0, sx * 0.14],
      });
    }
    k.add('alu', rbox(0.018, 0.008, 0.03, 0.002), { pos: [sx * (CARD_X + 0.048), BELT + 0.02, swz], rot: [0, 0, sx * 0.14] });
    // Lock plunger. A 60 mm pin standing up off the capping in front of the
    // glass is the one hard vertical in that corner and reads at a glance.
    k.add('trimGloss', new THREE.CylinderGeometry(0.0065, 0.0065, 0.055, 8), {
      pos: [sx * (CARD_X + 0.105), BELT + 0.042, dz0 + 0.815],
    });
    k.add('chrome', new THREE.SphereGeometry(0.011, 9, 7), { pos: [sx * (CARD_X + 0.105), BELT + 0.072, dz0 + 0.815] });
    k.add('gap', new THREE.CylinderGeometry(0.014, 0.014, 0.006, 10), { pos: [sx * (CARD_X + 0.105), BELT + 0.016, dz0 + 0.815] });

    // Mirror adjuster in the front top corner of the card, where the glass
    // channel turns down into the quarter light.
    k.add('consoleAbs', rbox(0.05, 0.07, 0.075, 0.014), { pos: [px - sx * 0.006, BELT - 0.04, dz0 + 0.855] });
    k.add('trimGloss', new THREE.SphereGeometry(0.016, 10, 8), { pos: [px - sx * 0.03, BELT - 0.022, dz0 + 0.855] });
    k.add('rubber', new THREE.CylinderGeometry(0.008, 0.011, 0.03, 8), {
      pos: [px - sx * 0.042, BELT - 0.022, dz0 + 0.855],
      rot: [0, 0, sx * Math.PI * 0.5],
    });

    // armrest with the pull cup let into it
    k.add('interiorPlastic', rbox(0.09, 0.06, 0.34, 0.022), { pos: [px - sx * 0.03, BELT - 0.19, dz0 + 0.24] });
    k.add('gap', rbox(0.06, 0.05, 0.16, 0.008), { pos: [px - sx * 0.05, BELT - 0.2, dz0 + 0.19] });
    k.add('trimGloss', new THREE.TorusGeometry(0.055, 0.011, 6, 12, Math.PI), {
      pos: [px - sx * 0.056, BELT - 0.155, dz0 + 0.19],
      rot: [Math.PI * 0.5, 0, sx * Math.PI * 0.5],
    });
    // Strap pull above the armrest, worn shiny where a hand closes the door on
    // it. This is the one thing on a door card that is always polished.
    k.add('wheelWorn', rbox(0.03, 0.05, 0.19, 0.012), { pos: [px - sx * 0.052, BELT - 0.085, dz0 + 0.3], rot: [0, 0, sx * 0.06] });
    for (const dz of [-0.088, 0.088]) {
      k.add('steelDark', rbox(0.026, 0.036, 0.03, 0.006), { pos: [px - sx * 0.046, BELT - 0.085, dz0 + 0.3 + dz] });
      k.add('steelDark', bolt(0.006, 0.005), {
        pos: [px - sx * 0.062, BELT - 0.085, dz0 + 0.3 + dz],
        rot: [0, 0, sx * Math.PI * 0.5],
      });
    }
    // interior release handle in a recessed cup, and the lock pin
    k.add('gap', rbox(0.05, 0.07, 0.15, 0.01), { pos: [px - sx * 0.018, BELT - 0.1, dz0 + 0.72] });
    k.add('chrome', rbox(0.03, 0.024, 0.12, 0.008), { pos: [px - sx * 0.05, BELT - 0.1, dz0 + 0.7] });
    k.add('trimGloss', new THREE.CylinderGeometry(0.008, 0.008, 0.032, 8), { pos: [px - sx * 0.014, BELT + 0.03, dz0 + 0.85] });
    // manual window winder, because this truck has no electric anything
    k.add('trimGloss', new THREE.CylinderGeometry(0.017, 0.02, 0.022, 12), {
      pos: [px - sx * 0.038, BELT - 0.2, dz0 + 0.46],
      rot: [0, 0, sx * Math.PI * 0.5],
    });
    k.add('trimGloss', rbox(0.02, 0.026, 0.085, 0.008), { pos: [px - sx * 0.05, BELT - 0.21, dz0 + 0.5], rot: [-0.7, 0, 0] });
    k.add('wheelWorn', new THREE.SphereGeometry(0.014, 10, 7), { pos: [px - sx * 0.056, BELT - 0.235, dz0 + 0.535] });

    // window switch cluster on the armrest top
    k.add('trimGloss', rbox(0.07, 0.014, 0.11, 0.006), { pos: [px - sx * 0.032, BELT - 0.155, dz0 + 0.34], rot: [0, 0, sx * 0.1] });
    for (const dzs of [-0.028, 0.028]) {
      k.add('interiorPlastic', rbox(0.035, 0.016, 0.036, 0.005), {
        pos: [px - sx * 0.036, BELT - 0.146, dz0 + 0.34 + dzs],
        rot: [0, 0, sx * 0.1],
      });
    }

    // speaker in the lower card, plus a map pocket with a rolled map in it
    const spk = atlasUV(new THREE.PlaneGeometry(0.135, 0.135), 'speaker');
    k.add('cabinPanel', spk, { pos: [px - sx * 0.026, BELT - 0.6, dz0 + 0.24], rot: [0, sx * Math.PI * 0.5, 0] });
    k.add('gap', rbox(0.05, 0.16, 0.3, 0.01), { pos: [px - sx * 0.012, BELT - 0.72, dz0 + 0.6] });
    k.add('cardWoven', rbox(0.035, 0.16, 0.3, 0.012), { pos: [px - sx * 0.05, BELT - 0.7, dz0 + 0.6], rot: [0, 0, sx * 0.12] });
    k.add('paper', new THREE.CylinderGeometry(0.019, 0.019, 0.16, 8), {
      pos: [px - sx * 0.06, BELT - 0.62, dz0 + 0.56],
      rot: [0.1, 0, sx * 0.12],
    });

    // scuff plate along the sill, inboard of the shut-line backing slab
    const sill = atlasUV(new THREE.PlaneGeometry(0.42, 0.1), 'sill');
    k.add('cabinPanel', sill, { pos: [sx * (CARD_X - 0.035), FLOOR + 0.035, dz0 + 0.4], rot: [-Math.PI * 0.5, 0, 0] });

    // A-pillar trim, with a tweeter grille let into it. Held inboard of 0.70 for
    // the same reason the card is: at 0.79 the lower half of it was behind the
    // slab. Faceted rather than round — a smooth tube 400 mm from the lens with
    // one value on it was the second largest flat surface in the frame.
    const paZ = S.windshieldBottomZ;
    k.add('interiorPlastic', tube(
      [
        [sx * (CARD_X - 0.005), BELT + 0.02, paZ - 0.02],
        [sx * (CARD_X - 0.015), BELT + 0.34, paZ - 0.26],
        [sx * (CARD_X - 0.03), S.roofY - 0.14, S.windshieldTopZ + 0.06],
      ],
      0.03,
      6,
    ));
    // Cover plate down the inboard face, which is the whole point: a smooth tube
    // 400 mm from the lens holds one value over 500 mm of frame, and it was the
    // second largest flat surface in the shot after the ceiling. The plate gives
    // it a facet, a hard edge and a shadow line against the tube behind it.
    k.add('interiorPlastic', rbox(0.05, 0.66, 0.026, 0.008), {
      pos: [sx * (CARD_X - 0.024), BELT + 0.28, paZ - 0.2],
      rot: [-0.646, 0, 0],
    });
    k.add('gap', rbox(0.036, 0.66, 0.012, 0.004), {
      pos: [sx * (CARD_X + 0.006), BELT + 0.28, paZ - 0.2],
      rot: [-0.646, 0, 0],
    });
    // Rolled forward corner where the trim turns to meet the glass. Everything
    // else on this pillar faces across the cab at the driver, which is the one
    // bearing in here with no light on it — measured at 0.02 luma over 90 by
    // 55 px, a hole in the left of the frame. A turned corner has a sliver of
    // itself pointing at the screen whatever the rest of it is doing, so the
    // pillar gets a lit edge to be dark against instead of another flat.
    k.add('interiorFaded', new THREE.CylinderGeometry(0.024, 0.024, 0.64, 10, 1, false, 0, Math.PI), {
      pos: [sx * (CARD_X - 0.038), BELT + 0.28, paZ - 0.182],
      rot: [Math.PI * 0.5 - 0.646, 0, sx * Math.PI * 0.5],
    });
    k.add('trimGloss', rbox(0.03, 0.075, 0.075, 0.012), { pos: [sx * (CARD_X - 0.03), BELT + 0.16, paZ - 0.14], rot: [0.5, 0, sx * 0.1] });
    // Coat hook and a map lamp up the pillar. Both are 30 mm objects, and both
    // are on keys that carry a specular lobe: on a face this dark the only
    // detail that survives is the kind that makes its own highlight.
    k.add('alu', bend(0.018, 0.005, Math.PI * 1.15, 8), {
      pos: [sx * (CARD_X - 0.058), BELT + 0.5, paZ - 0.37],
      rot: [-0.646, sx * Math.PI * 0.5, 0],
    });
    k.add('trimGloss', rbox(0.028, 0.03, 0.03, 0.006), { pos: [sx * (CARD_X - 0.046), BELT + 0.535, paZ - 0.394], rot: [-0.646, 0, 0] });
    k.add('trimGloss', rbox(0.032, 0.05, 0.042, 0.01), { pos: [sx * (CARD_X - 0.044), BELT + 0.585, paZ - 0.43], rot: [-0.646, 0, sx * 0.3] });
    k.add('cabinPanel', atlasUV(new THREE.CircleGeometry(0.012, 10), 'dome'), {
      pos: [sx * (CARD_X - 0.062), BELT + 0.585, paZ - 0.432],
      rot: [-0.646, sx * 1.35, 0],
    });
    for (const [cy, cz] of [
      [BELT + 0.1, paZ - 0.07],
      [BELT + 0.44, paZ - 0.32],
    ]) {
      k.add('steelDark', rivet(0.008, 0.0045), { pos: [sx * (CARD_X - 0.05), cy, cz], rot: [0, 0, sx * Math.PI * 0.5] });
    }

    // Outboard wing of the same trim. Holding the pillar at x = 0.70 kept it
    // clear of the body's shut-line slab but left the 150 mm out to the body
    // side bare, and from the driver's eye that is a 25-pixel column of
    // untrimmed structure running the full height of the left of frame with one
    // value on it. A pillar trim in a real cab wraps to the door seal; this
    // carries it out in two facets so the wrap has a crease down it rather than
    // becoming one wider flat, and stops short of the beltline where the slab
    // starts.
    // The outboard facet was at x = 0.825 and the cabin light's box gate runs
    // out at 0.84 with a 90 mm ramp inside it, so it was collecting a third of
    // the term: measured at 0.007 luma, the darkest thing in the frame and a
    // featureless black column down the left of it. Both facets are inboard of
    // the ramp now. The gate itself has to stay where it is — these keys dress
    // the outside of the truck too.
    k.add('cardWoven', rbox(0.1, 0.52, 0.026, 0.009), {
      pos: [sx * (CARD_X + 0.045), BELT + 0.33, paZ - 0.245],
      rot: [-0.646, 0, 0],
    });
    k.add('gap', rbox(0.02, 0.5, 0.03, 0.004), {
      pos: [sx * (CARD_X + 0.004), BELT + 0.33, paZ - 0.238],
      rot: [-0.646, 0, 0],
    });
    k.add('cardWoven', rbox(0.05, 0.5, 0.045, 0.012), {
      pos: [sx * (CARD_X + 0.1), BELT + 0.32, paZ - 0.235],
      rot: [-0.646, 0, sx * -0.5],
    });
    // Tweeter let into the wing, two clips and the screw that holds the top of
    // it — the things that give a 500 mm run of moulding a scale.
    vent(k, {
      w: 0.075,
      h: 0.075,
      pos: [sx * (CARD_X + 0.044), BELT + 0.135, paZ - 0.11],
      tilt: -0.646,
      yaw: sx * 0.12,
      slats: 9,
    });
    for (const [wy2, wz2] of [
      [BELT + 0.31, paZ - 0.23],
      [BELT + 0.55, paZ - 0.4],
    ]) {
      k.add('steelDark', bolt(0.0075, 0.005), { pos: [sx * (CARD_X + 0.042), wy2 + 0.012, wz2 - 0.014], rot: [-0.646 - Math.PI * 0.5, 0, 0] });
    }
    // Scuffed lower corner, where a boot swings past it getting in.
    k.add('gap', rbox(0.09, 0.055, 0.02, 0.004), {
      pos: [sx * (CARD_X + 0.05), BELT + 0.065, paZ - 0.06],
      rot: [-0.646, 0, sx * 0.14],
    });

    // Pillar assist grip. Both edges of the frame are a 500 mm run of trim with
    // nothing on it. The first version of this stood 100 mm off the pillar as a
    // bent tube, and from an eye 300 mm inboard of it that put the whole loop
    // out in the window opening: a pale worm silhouetted against lit forest,
    // measured at 0.63 against a frame mean of 0.24 and easily the worst thing
    // in the shot. Flat to the trim instead — a moulded strap over a recess, so
    // what it contributes is a shadow line and two mount pads rather than an
    // outline.
    // The strap itself was `rbox(0.028, …, r = 0.014)`, and a rounded box whose
    // radius is half its width is a half-cylinder: 28 mm of continuously turning
    // normal with no flat on it anywhere, all of it pointing across the cab at
    // the driver, which is the one bearing in this cabin with no source on it.
    // It measured 0.007 to 0.024 over 20 by 50 px while the pillar either side
    // of it sat at 0.18, and from the driver's eye that read as a hole in the
    // trim. A strap with a flat face, a chamfer that turns towards the screen
    // and a strip of brightwork let into it instead.
    k.add('gap', rbox(0.03, 0.3, 0.115, 0.006), {
      pos: [sx * (CARD_X - 0.031), BELT + 0.27, paZ - 0.186],
      rot: [-0.646, 0, 0],
    });
    k.add('cardWoven', rbox(0.03, 0.28, 0.066, 0.005), {
      pos: [sx * (CARD_X - 0.048), BELT + 0.27, paZ - 0.192],
      rot: [-0.646, 0, sx * 0.16],
    });
    k.add('alu', rbox(0.006, 0.22, 0.016, 0.002), {
      pos: [sx * (CARD_X - 0.064), BELT + 0.27, paZ - 0.206],
      rot: [-0.646, 0, sx * 0.16],
    });
    for (const [my, mz] of [
      [BELT + 0.15, paZ - 0.11],
      [BELT + 0.39, paZ - 0.262],
    ]) {
      k.add('trimGloss', rbox(0.028, 0.05, 0.056, 0.006), {
        pos: [sx * (CARD_X - 0.048), my, mz],
        rot: [-0.646, 0, 0],
      });
      k.add('steelDark', bolt(0.007, 0.005), {
        pos: [sx * (CARD_X - 0.064), my, mz],
        rot: [0, 0, sx * Math.PI * 0.5],
      });
    }
    // Loom taped up the inboard corner of the pillar to the map light, which is
    // how a cab that has had a radio fitted actually looks.
    k.add('rubber', tube(
      [
        [sx * (CARD_X - 0.03), BELT + 0.02, paZ - 0.03],
        [sx * (CARD_X - 0.042), BELT + 0.24, paZ - 0.19],
        [sx * (CARD_X - 0.05), BELT + 0.5, paZ - 0.33],
      ],
      0.008,
      5,
    ));
    for (const ty of [BELT + 0.09, BELT + 0.33]) {
      k.add('trimGloss', rbox(0.024, 0.03, 0.022, 0.004), {
        pos: [sx * (CARD_X - 0.036), ty, paZ - 0.03 - (ty - BELT - 0.02) * 0.625],
        rot: [-0.646, 0, 0],
      });
    }
  }

  // Pillar gauge pod, driver's side only, strapped to the A-pillar the way an
  // aftermarket one is. It earns its place twice over: an offroad build always
  // has volts and oil pressure somewhere, and from the driver's eye this is the
  // only object in the left third of the frame, which was 20 per cent of the shot
  // holding nothing but a dark tube against a bright window.
  // Yaw is set by the sight line: the eye is 325 mm inboard of the pod and 695 mm
  // in front of it, so the face has to swing 25 degrees off the body's Z to point
  // back at the driver.
  const gpx = CARD_X - 0.08;
  const gpy = 1.6;
  const gpz = 0.695;
  const gpYaw = 0.44;
  const gpN = faceN(0.02, gpYaw);
  const gpBack = (o) => [gpx - gpN[0] * o, gpy - gpN[1] * o, gpz - gpN[2] * o];
  k.add('trimGloss', rbox(0.175, 0.096, 0.066, 0.018), { pos: gpBack(0.034), rot: [0.02, gpYaw, 0] });
  panel(k, 'aux', { w: 0.15, h: 0.072, pos: [gpx, gpy, gpz], tilt: 0.02, yaw: gpYaw, glass: 0.005 });
  dialPointers(k, 'aux', { w: 0.15, h: 0.072, pos: [gpx, gpy, gpz], tilt: 0.02, yaw: gpYaw, out: 0.0022 });
  // Two bezel rings, and they are the whole point. Without them the dials are
  // black discs on a black housing behind two pale mouldings — measured at 0.02
  // luma across the middle of the pod with the shroud edges at 0.30 either side
  // of it, which from the driver's eye read as a dark animal head with two
  // tusks rather than as a pair of gauges. What separates a gauge from a hole
  // is the ring of brightwork round it, and the pod needs a housing dark enough
  // for that ring to be the lightest thing on it.
  for (const dx of [-0.036, 0.036]) {
    const p = [gpx + Math.cos(gpYaw) * dx, gpy, gpz - Math.sin(gpYaw) * dx];
    k.add('alu', new THREE.TorusGeometry(0.031, 0.0045, 5, 16), {
      pos: [p[0] + gpN[0] * 0.006, p[1] + gpN[1] * 0.006, p[2] + gpN[2] * 0.006],
      rot: [0.02, gpYaw, 0],
    });
  }
  for (const dy of [0.046, -0.046]) {
    const p = gpBack(-0.002);
    k.add('trimGloss', rbox(0.168, 0.012, 0.04, 0.004), { pos: [p[0], p[1] + dy, p[2]], rot: [0.02, gpYaw, 0] });
  }
  // two hose clamps round the pillar, which is how these are actually fitted
  for (const [cy, cz] of [
    [1.535, 0.755],
    [1.672, 0.652],
  ]) {
    k.add('steelDark', new THREE.TorusGeometry(0.036, 0.005, 5, 12), {
      pos: [CARD_X - 0.02, cy, cz],
      rot: [-2.2, 0.16, 0],
    });
  }
}

// Underside of the body's roof panel: S.roofY less the profile's 75 mm drop and
// its 14 mm bevel. The headlining has to hang clear below this or the ceiling of
// the cabin is body-colour paint — which is exactly what it was. Measured on the
// frame that started this rebuild, 55 per cent of the top right of the interior
// view was `body_paintRoof` at y = 1.931 showing under a liner whose lowest face
// was 1.9375, and that is the whole of the "broad flat pale sage band".
const ROOF_UNDER = S.roofY - 0.089;
const HL_Y = ROOF_UNDER - 0.030; // liner reference plane
const HL_FACE = HL_Y - 0.017; // its visible underside at the centre

function buildRoof(k) {
  const hlF = S.windshieldTopZ + 0.03;
  const hlR = S.cabRearZ + 0.05;
  const hlZ = (hlF + hlR) * 0.5;

  // Crowned liner rather than a slab. The crown is only 32 mm across 1.7 m, but
  // it is 32 mm of continuously turning normal under a light that comes from one
  // place, which is the difference between a ceiling with a gradient on it and a
  // ceiling with a value.
  k.add('headliner', profile(
    [
      [-0.85, 0.008],
      [0.85, 0.008],
      [0.85, -0.036],
      [0.7, -0.031],
      [0.5, -0.024],
      [0.26, -0.017],
      [0, -0.014],
      [-0.26, -0.017],
      [-0.5, -0.024],
      [-0.7, -0.031],
      [-0.85, -0.036],
    ],
    hlF - hlR,
    { bevel: 0.005 },
  ), { pos: [0, HL_Y, hlZ] });

  // Moulded grooves down the pressing. An extruded profile flat-shades, so each
  // step of the crown is one value across its whole width and the two widest
  // were 340 mm of the top of the frame carrying a single number between them.
  // A 6 mm groove costs a strip and splits every one of them again — but it has
  // to follow the crown: laid on one plane, the four outboard ones sat inside
  // the liner and only the pair either side of the centreline showed at all.
  const crown = (x) => {
    const a = Math.abs(x);
    const pts = [
      [0, 0.014],
      [0.26, 0.017],
      [0.5, 0.024],
      [0.7, 0.031],
      [0.85, 0.036],
    ];
    for (let i = 1; i < pts.length; i++) {
      if (a <= pts[i][0]) {
        const t = (a - pts[i - 1][0]) / (pts[i][0] - pts[i - 1][0]);
        return pts[i - 1][1] + t * (pts[i][1] - pts[i - 1][1]);
      }
    }
    return 0.036;
  };
  for (const gx of [-0.72, -0.66, -0.5, -0.16, 0.16, 0.5, 0.66, 0.72]) {
    k.add('gap', rbox(0.007, 0.012, hlF - hlR - 0.03, 0.002), { pos: [gx, HL_Y - crown(gx) - 0.002, hlZ] });
  }

  // Roof bows. A pressed liner is held up by transverse bows every 300 mm and
  // sags a little between them; the shadow gap either side is what makes them
  // read at a glance rather than as a change of shading.
  // Kept behind z = 0.16. At the top edge of the interior frame the sight line
  // reaches the liner at z = 0.224, so everything forward of that is the only
  // part of the ceiling on screen and it belongs to the visors and the console;
  // a bow through there would run straight across both.
  for (const bz of [0.06, -0.24, -0.56]) {
    k.add('gap', rbox(HW * 2 - 0.14, 0.016, 0.078, 0.004), { pos: [0, HL_FACE + 0.004, bz] });
    k.add('headliner', rbox(HW * 2 - 0.15, 0.022, 0.052, 0.009), { pos: [0, HL_FACE - 0.006, bz] });
    for (const dx of [-0.66, 0, 0.66]) {
      k.add('steelDark', rivet(0.007, 0.004), { pos: [dx, HL_FACE - 0.016, bz], rot: [Math.PI, 0, 0] });
    }
  }
  // A three-piece liner, so the seams fall either side of the crown rather than
  // on it. Both land inside the frame, which the one on the centreline did not.
  for (const sx of [-1, 1]) {
    weltZ(k, { len: hlF - hlR - 0.05, pos: [sx * 0.33, HL_FACE - 0.002, hlZ], rot: [Math.PI, 0, 0], pitch: 0.03 });
    weltZ(k, { len: hlF - hlR - 0.05, pos: [sx * 0.79, HL_FACE + 0.012, hlZ], rot: [Math.PI + sx * 0.5, 0, 0], pitch: 0.03 });
  }

  // --- cant rails ----------------------------------------------------------
  // Where the liner turns down into the door aperture. Without it the ceiling
  // runs to a soft edge and the outboard 150 mm of it — the far right of the
  // frame, and the largest continuous patch of one value left up there — is
  // liner all the way to the pillar. A rail gives that edge a lit top face, a
  // shadowed under face and a hard line between them.
  for (const sx of [-1, 1]) {
    k.add('interiorFaded', rbox(0.075, 0.055, hlF - hlR - 0.02, 0.012), {
      pos: [sx * 0.787, HL_FACE - 0.008, hlZ],
      rot: [0, 0, sx * 0.28],
    });
    k.add('gap', rbox(0.05, 0.02, hlF - hlR - 0.04, 0.005), { pos: [sx * 0.75, HL_FACE - 0.026, hlZ] });
    for (const rz of [0.3, -0.05, -0.42, -0.76]) {
      k.add('steelDark', rivet(0.007, 0.004), { pos: [sx * 0.78, HL_FACE - 0.03, rz], rot: [Math.PI, 0, sx * 0.28] });
    }
  }

  // Front bow, right on the top edge of frame. The three behind it are off
  // screen from the driver's eye — the sight line reaches the liner at z = 0.22
  // — so this is the only one that does any work in the view it was built for.
  k.add('gap', rbox(HW * 2 - 0.2, 0.014, 0.07, 0.004), { pos: [0, HL_FACE + 0.003, 0.215] });
  k.add('headliner', rbox(HW * 2 - 0.21, 0.02, 0.046, 0.008), { pos: [0, HL_FACE - 0.007, 0.215] });
  for (const dx of [-0.72, -0.3, 0.3, 0.72]) {
    k.add('steelDark', rivet(0.007, 0.004), { pos: [dx, HL_FACE - 0.017, 0.215], rot: [Math.PI, 0, 0] });
  }

  // Grab handle over the passenger door, on the rail rather than the pillar.
  // The right sixth of the frame above the beltline held nothing but liner, and
  // this is both the thing that belongs there and a 200 mm object with a hole
  // through it — the one shape up here that is not a flat panel.
  const ghz = S.windshieldTopZ - 0.15;
  k.add('trim', bend(0.075, 0.019, Math.PI * 0.92, 12), {
    pos: [-0.735, HL_FACE - 0.052, ghz],
    rot: [0, Math.PI * 0.5, -0.24],
  });
  for (const dz of [-0.082, 0.082]) {
    k.add('trimGloss', rbox(0.06, 0.03, 0.05, 0.008), { pos: [-0.742, HL_FACE - 0.014, ghz + dz], rot: [0, 0, 0.28] });
    k.add('steelDark', bolt(0.007, 0.005), { pos: [-0.742, HL_FACE - 0.03, ghz + dz], rot: [Math.PI, 0, 0.28] });
  }

  // Document pouch bungeed to the liner between the passenger visor and the
  // rail. Fabric is the only substance the ceiling has none of, and a limp
  // rectangle with two cords over it breaks the one place the liner still runs
  // 300 mm without a seam.
  k.add('fabric', rbox(0.24, 0.028, 0.16, 0.012), { pos: [-0.6, HL_FACE - 0.02, ghz - 0.09], rot: [0.06, 0, 0.1] });
  k.add('paper', rbox(0.18, 0.004, 0.11, 0.001), { pos: [-0.595, HL_FACE - 0.036, ghz - 0.105], rot: [0.06, 0.08, 0.1] });
  for (const dx of [-0.07, 0.07]) {
    k.add('trim', new THREE.CylinderGeometry(0.0045, 0.0045, 0.19, 6), {
      pos: [-0.6 + dx, HL_FACE - 0.032, ghz - 0.09],
      rot: [0.06, 0, 0],
    });
  }
  // coax from the aerial, taped along the rail to the console
  k.add('trim', tube(
    [
      [-0.79, HL_FACE - 0.024, -0.3],
      [-0.78, HL_FACE - 0.022, 0.12],
      [-0.66, HL_FACE - 0.018, 0.3],
      [-0.24, HL_FACE - 0.02, S.windshieldTopZ - 0.16],
    ],
    0.006,
    5,
  ));

  // --- header --------------------------------------------------------------
  // Three steps down from the liner to the top of the glass, because this is the
  // top edge of the frame and a single face there reads as a bar. The rolled
  // cover is the closest of the three to the camera and takes the welt.
  const hdY = HL_FACE - 0.012;
  k.add('interiorFaded', rbox(HW * 2 - 0.2, 0.05, 0.13, 0.016), { pos: [0, hdY - 0.015, S.windshieldTopZ + 0.005] });
  // One welt on the header, not two, and broken at the mirror mount. Both ran
  // the full 1.6 m and they sit 25 mm apart on screen: a pair of parallel dashed
  // lines across the top edge of the frame, which is a road marking and not a
  // seam. The upper of the two is a moulded step now.
  for (const [len, cx] of [
    [0.52, 0.46],
    [0.46, -0.5],
  ]) {
    weltX(k, { len, pos: [cx, hdY - 0.038, S.windshieldTopZ - 0.05], rot: [0.45, 0, 0], pitch: 0.03 });
  }
  k.add('interiorPlastic', new THREE.CylinderGeometry(0.026, 0.026, HW * 2 - 0.3, 14, 1, false, 0, Math.PI), {
    pos: [0, 1.849, S.windshieldTopZ + 0.03],
    rot: [Math.PI * 0.5, 0, -Math.PI * 0.5],
  });
  // Moulded step under the roll. On the `gap` key this was a 1.4 m black hairline
  // across the top of the frame — the same stripe problem the welt had, in the
  // other direction. A lit face with a 4 mm shadow under it instead.
  k.add('interiorFaded', rbox(HW * 2 - 0.36, 0.016, 0.03, 0.005), { pos: [0, 1.831, S.windshieldTopZ + 0.014], rot: [-0.55, 0, 0] });
  k.add('gap', rbox(HW * 2 - 0.38, 0.006, 0.008, 0.002), { pos: [0, 1.821, S.windshieldTopZ + 0.004], rot: [-0.55, 0, 0] });
  for (const dx of [-0.46, 0, 0.46]) {
    k.add('steelDark', rivet(0.008, 0.0045), { pos: [dx, 1.829, S.windshieldTopZ + 0.008], rot: [-0.55, 0, 0] });
  }
  k.add('interiorFaded', rbox(HW * 2 - 0.18, 0.03, 0.05, 0.012), { pos: [0, HL_FACE + 0.006, S.cabRearZ + 0.55] });

  // --- sun visors ----------------------------------------------------------
  // Both are in frame from the driver's eye — the near one across the top left,
  // the far one's inboard 200 mm at the top right — so they are built as objects
  // rather than as the flat cards they were: a piped edge, a pivot rod on a
  // bracket, a clip, and on the driver's side a strap with the service record
  // and a folded receipt shoved under it.
  for (const sx of [-1, 1]) {
    const vx = sx * 0.44;
    const vy = HL_FACE - 0.03;
    const vz = S.windshieldTopZ - 0.10;
    const vRot = [-0.15, 0, sx * 0.03];
    // Board covered in the liner's cloth, not the pad's vinyl. Measured on the
    // ID pass the two visors and the header were carrying the top of the frame
    // at 0.35-0.40 — brighter than the dash pad under the screen, off a surface
    // that faces down and away from it — because they were sharing a key with
    // the one thing in the cab that is supposed to be brightest. A visor is
    // trimmed in headlining anyway.
    k.add('headliner', rbox(0.44, 0.014, 0.2, 0.006), { pos: [vx, vy, vz], rot: vRot });
    // piped edge along the free (inboard-front) side
    k.add('trim', new THREE.CylinderGeometry(0.009, 0.009, 0.2, 8), {
      pos: [vx - sx * 0.222, vy - 0.001, vz],
      rot: [Math.PI * 0.5 - 0.15, 0, 0],
    });
    k.add('trim', new THREE.CylinderGeometry(0.008, 0.008, 0.43, 8), {
      pos: [vx, vy - 0.006, vz - 0.098],
      rot: [0, 0, Math.PI * 0.5],
    });
    weltX(k, { len: 0.4, pos: [vx, vy - 0.007, vz + 0.07], rot: [-0.15, 0, 0], pitch: 0.026 });
    // pivot rod and its bracket, out at the pillar
    k.add('chrome', new THREE.CylinderGeometry(0.0055, 0.0055, 0.13, 8), {
      pos: [sx * 0.70, vy + 0.004, vz + 0.01],
      rot: [0, 0, Math.PI * 0.5],
    });
    k.add('trimGloss', rbox(0.03, 0.026, 0.036, 0.008), { pos: [sx * 0.755, vy + 0.008, vz + 0.01] });
    // spring clip the blade snaps into
    k.add('trimGloss', rbox(0.05, 0.018, 0.028, 0.006), { pos: [sx * 0.135, vy + 0.008, vz - 0.05] });
  }
  // Vanity mirror in the passenger blade. That blade is the largest single
  // object above the beltline on the right of the frame and it was 440 by 200 mm
  // of one value; a mirror is both what is actually there and the one thing on
  // the ceiling that returns any light at all.
  {
    const vy = HL_FACE - 0.03;
    const vz = S.windshieldTopZ - 0.1;
    k.add('trimGloss', rbox(0.24, 0.008, 0.115, 0.004), { pos: [-0.44, vy - 0.01, vz + 0.005], rot: [-0.15, 0, -0.03] });
    k.add('cabinPanel', atlasUV(new THREE.PlaneGeometry(0.2, 0.085), 'mirror'), {
      pos: [-0.44, vy - 0.015, vz + 0.005],
      rot: [Math.PI * 0.5 - 0.15, 0, -0.03],
    });
    k.add('trim', rbox(0.075, 0.007, 0.014, 0.002), { pos: [-0.32, vy - 0.016, vz + 0.055], rot: [-0.15, 0, -0.03] });
  }
  // paperwork under the driver's visor strap
  k.add('trim', rbox(0.12, 0.006, 0.016, 0.002), { pos: [0.4, HL_FACE - 0.022, S.windshieldTopZ - 0.13], rot: [-0.15, 0, 0.03] });
  k.add('paper', rbox(0.1, 0.003, 0.07, 0.001), { pos: [0.41, HL_FACE - 0.024, S.windshieldTopZ - 0.13], rot: [-0.15, 0.06, 0.02] });
  k.add('paper', rbox(0.075, 0.002, 0.05, 0.001), { pos: [0.36, HL_FACE - 0.026, S.windshieldTopZ - 0.15], rot: [-0.15, -0.22, 0.04] });

  // --- overhead console ----------------------------------------------------
  // The one place the top of this frame had nothing at all. An aux switch pod
  // slung off the header is what an offroad build puts there, and from the
  // driver's eye it lands across the right third of the top edge, which is where
  // the roof panel used to be showing.
  const ocx = -0.05;
  const ocz = S.windshieldTopZ - 0.14;
  const ocy = HL_FACE - 0.028;
  k.add('consoleAbs', rbox(0.3, 0.058, 0.2, 0.016), { pos: [ocx, ocy, ocz], rot: [-0.1, 0, 0] });
  k.add('gap', rbox(0.27, 0.03, 0.17, 0.006), { pos: [ocx, ocy + 0.02, ocz] });
  panel(k, 'switches', { w: 0.2, h: 0.05, pos: [ocx + 0.03, ocy - 0.032, ocz - 0.02], tilt: -1.42 });
  for (const dx of [-0.105, 0.105]) {
    k.add('steelDark', rivet(0.007, 0.004), { pos: [ocx + dx, ocy - 0.03, ocz + 0.075], rot: [Math.PI, 0, 0] });
  }
  // two map lights on the forward face, one of them left switched on
  for (const [dx, key] of [
    [-0.075, 'cabinPanel'],
    [0.075, 'gap'],
  ]) {
    k.add('trimGloss', new THREE.CylinderGeometry(0.019, 0.022, 0.014, 12), {
      pos: [ocx + dx, ocy - 0.03, ocz - 0.062],
      rot: [0.1, 0, 0],
    });
    if (key === 'cabinPanel') {
      k.add('cabinPanel', atlasUV(new THREE.CircleGeometry(0.014, 12), 'dome'), {
        pos: [ocx + dx, ocy - 0.037, ocz - 0.062],
        rot: [Math.PI * 0.5 + 0.1, 0, 0],
      });
    } else {
      k.add('gap', new THREE.CylinderGeometry(0.014, 0.014, 0.004, 10), { pos: [ocx + dx, ocy - 0.037, ocz - 0.062] });
    }
  }

  // --- CB set, slung under the front lip of the console -------------------
  // The right third of this frame — 340 by 240 px of it, a fifth of the shot —
  // was uninterrupted glass with forest behind it. Nothing can be *built* there,
  // because the only thing at that bearing is the windscreen; what can go there
  // is something hung in front of it. A roof-mounted CB with the mic left
  // swinging is both what an offroad build actually has and the one object in
  // the cab that gets read as a silhouette against a lit background rather than
  // as a lit surface against a dark one.
  // Black crackle case on `rubber`, not the grey plastic key: this object is
  // 300 mm from an eye that is looking past it at a sunlit forest, so its whole
  // job is to be a dark shape with a lit face turned back at the driver. On
  // `trimGloss` it came out at 0.55 against the glass behind it at 0.30 — a
  // pale slab, the brightest thing above the beltline, and unreadable.
  const cbx = -0.128;
  const cby = 1.778;
  const cbz = S.windshieldTopZ - 0.008;
  for (const dx of [-0.056, 0.056]) {
    k.add('steelDark', rbox(0.012, 0.058, 0.045, 0.003), { pos: [cbx + dx, cby + 0.03, cbz - 0.006], rot: [0.1, 0, 0] });
  }
  k.add('rubber', rbox(0.132, 0.044, 0.105, 0.007), { pos: [cbx, cby, cbz], rot: [0.1, 0, 0] });
  k.add('gap', rbox(0.126, 0.04, 0.012, 0.003), { pos: [cbx, cby + 0.005, cbz - 0.05], rot: [0.1, 0, 0] });
  // Face turned back at the driver — `panel` builds on -Z, so it goes on the
  // near side of the case, which is where the first cut of this did not put it.
  panel(k, 'aux', { w: 0.1, h: 0.032, pos: [cbx + 0.01, cby + 0.004, cbz - 0.058], tilt: 0.1, glass: 0.004 });
  for (const [dx, r] of [
    [-0.052, 0.011],
    [0.053, 0.0085],
  ]) {
    k.add('trimGloss', new THREE.CylinderGeometry(r, r * 1.15, 0.014, 10), {
      pos: [cbx + dx, cby + 0.004, cbz - 0.058],
      rot: [0.1 - Math.PI * 0.5, 0, 0],
    });
  }
  k.add('alu', new THREE.CylinderGeometry(0.004, 0.004, 0.026, 6), {
    pos: [cbx - 0.076, cby + 0.008, cbz - 0.03],
    rot: [0, 0, Math.PI * 0.5],
  });
  // Coiled cord. A helix off the set's near corner, pulled straight for the
  // last 80 mm by the weight of the mic on the end of it.
  const cord = [];
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    const a = t * Math.PI * 5.0;
    cord.push([cbx + 0.058 + Math.sin(a) * 0.017 * (1 - t * 0.4), cby - 0.028 - t * 0.066, cbz - 0.03 + Math.cos(a) * 0.017 * (1 - t * 0.4)]);
  }
  cord.push([cbx + 0.052, cby - 0.126, cbz - 0.036]);
  cord.push([cbx + 0.042, cby - 0.158, cbz - 0.044]);
  k.add('rubber', tube(cord, 0.004, 4));
  // The mic itself, hanging nose-down the way one does off a coiled cord.
  const mcx = cbx + 0.04;
  const mcy = cby - 0.2;
  const mcz = cbz - 0.046;
  k.add('rubber', rbox(0.032, 0.078, 0.028, 0.009), { pos: [mcx, mcy, mcz], rot: [0.12, 0, 0.16] });
  k.add('gap', new THREE.CylinderGeometry(0.011, 0.011, 0.005, 10), { pos: [mcx + 0.004, mcy + 0.03, mcz - 0.015], rot: [Math.PI * 0.5 + 0.12, 0, 0] });
  k.add('trimGloss', rbox(0.01, 0.028, 0.013, 0.004), { pos: [mcx + 0.02, mcy + 0.012, mcz], rot: [0.12, 0, 0.16] });
  k.add('alu', rbox(0.007, 0.024, 0.009, 0.002), { pos: [mcx - 0.019, mcy - 0.026, mcz], rot: [0.12, 0, 0.16] });

  // Loom from the console out to the driver's pillar and down. Nobody who fits a
  // roof console routes it inside the liner, and a cable taped along the header
  // is one continuous line across the flattest part of the ceiling.
  k.add('trim', tube(
    [
      [ocx - 0.12, ocy - 0.022, ocz + 0.04],
      [0.2, HL_FACE - 0.008, ocz + 0.08],
      [0.5, HL_FACE - 0.012, S.windshieldTopZ - 0.02],
      [CARD_X - 0.05, 1.79, S.windshieldTopZ + 0.09],
    ],
    0.0075,
    5,
  ));
  for (const [tx, ty, tz] of [
    [0.16, HL_FACE - 0.006, ocz + 0.075],
    [0.46, HL_FACE - 0.01, S.windshieldTopZ - 0.025],
  ]) {
    k.add('trimGloss', new THREE.CylinderGeometry(0.013, 0.013, 0.022, 8), { pos: [tx, ty, tz], rot: [0, 0, Math.PI * 0.5] });
  }

  // dome light, further back over the bench
  const midZ = (S.cabFrontZ + S.cabRearZ) * 0.5;
  k.add('interiorFaded', rbox(0.15, 0.03, 0.1, 0.012), { pos: [0, HL_FACE - 0.004, midZ - 0.1] });
  const dome = atlasUV(new THREE.PlaneGeometry(0.1, 0.075), 'dome');
  k.add('cabinPanel', dome, { pos: [0, HL_FACE - 0.02, midZ - 0.1], rot: [Math.PI * 0.5, 0, 0] });

  // --- rear-view mirror ----------------------------------------------------
  // Glued to the glass, so the housing has to stay under the screen line —
  // 1.66 m at z = 0.62 leaves 100 mm of clearance. It sits just right of centre
  // in the frame with nothing but forest behind it, so it gets the mount button,
  // a two-piece stalk and the lanyard everybody's truck has hanging off it.
  const mz = 0.62;
  const my = 1.66;
  k.add('trimGloss', rbox(0.05, 0.05, 0.016, 0.006), { pos: [0, my + 0.108, mz - 0.09], rot: [-0.62, 0, 0] });
  // The stalk has to run button-to-housing, and the housing is now 12 mm
  // shallower and 6 mm further up the screen than it was, so the arm is re-aimed
  // at where the case actually is: at the old angle its lower end finished 10 mm
  // clear of the front face and hung in the air over the glass.
  k.add('trimGloss', new THREE.CylinderGeometry(0.012, 0.016, 0.125, 10), { pos: [0, my + 0.072, mz - 0.042], rot: [-0.93, 0, 0] });
  // The pivot was `chrome` — metalness 1.0 with a full-strength graded sky
  // reflection on it — and it is a 28 mm ball hung directly under the
  // windscreen, which is the one place in the cab with a clear line to the sky.
  // At the size the beauty view renders it, eight pixels across, that is not a
  // ball joint catching a highlight, it is a white dot above the mirror, and it
  // was the brightest thing in that corner of the frame. A mirror pivot is a
  // moulded ball anyway.
  k.add('trimGloss', new THREE.SphereGeometry(0.014, 10, 7), { pos: [0, my + 0.05, mz - 0.017] });
  // Housing, then the glass in it. The first pass had a 35 mm-deep case with a
  // 14 mm radius carrying a 219 mm pane, which left an 8 mm bezel all round and
  // a heavily rounded shell behind it: at the size the mirror renders it read as
  // a black lozenge with a lit label on the front rather than as glass in a
  // frame. A mirror case is a shallow tray — the pane is most of the object and
  // the frame is the last few millimetres of it.
  k.add('trimGloss', rbox(0.238, 0.073, 0.023, 0.008), { pos: [0, my, mz + 0.006] });
  const mirror = new THREE.PlaneGeometry(0.227, 0.063);
  k.add('mirrorGlass', mirror, { pos: [0, my, mz - 0.0062], rot: [0.04, Math.PI, 0] });
  // The seal under the bottom edge. Without it the glass and the frame below it
  // are two mid values touching, and the pane's lower edge disappears into the
  // case; one dark line is what puts the glass in front of the frame.
  k.add('gap', rbox(0.229, 0.005, 0.004, 0.0015), { pos: [0, my - 0.0322, mz - 0.0092] });
  k.add('trimGloss', rbox(0.05, 0.02, 0.02, 0.006), { pos: [0.06, my - 0.05, mz - 0.012] });
  // Day/night tab under the near end, and the wiring for the map lamps in the
  // housing taped up to the button. Both are 20 mm objects hanging in front of
  // lit forest, so they cost nothing and they break the housing's outline.
  k.add('trimGloss', new THREE.CylinderGeometry(0.005, 0.005, 0.09, 6), {
    pos: [0.075, my - 0.044, mz - 0.006],
    rot: [0.2, 0, 1.24],
  });
  k.add('rubber', tube(
    [
      [-0.02, my + 0.03, mz + 0.012],
      [-0.006, my + 0.072, mz - 0.024],
      [0.002, my + 0.1, mz - 0.07],
    ],
    0.005,
    5,
  ));
  // lanyard and a pine-tree freshener, hung off the near end of the housing
  k.add('trim', new THREE.CylinderGeometry(0.0022, 0.0022, 0.075, 5), {
    pos: [-0.085, my - 0.072, mz - 0.012],
    rot: [0.1, 0, 0.16],
  });
  k.add('paper', rbox(0.052, 0.058, 0.002, 0.001), { pos: [-0.096, my - 0.135, mz - 0.014], rot: [0.06, 0.22, 0.16] });
  k.add('paper', rbox(0.02, 0.03, 0.002, 0.001), { pos: [-0.096, my - 0.172, mz - 0.012], rot: [0.06, 0.22, 0.16] });
}

function buildCage(k) {
  // Tucked up so the halo bars run half-buried in the headlining, the way a cage
  // fitted round a trimmed roof actually sits. Any lower and the front hoop eats
  // a band of windscreen; any higher and it disappears into the liner entirely.
  const cageY = S.roofY - 0.155;
  const hoopZ = S.windshieldTopZ - 0.04;
  // Powder-coated, on the matte `trim` key rather than `steelDark`. The front
  // hoop is a 1.6 m cylinder lying across the top edge of the frame, and on a
  // key carrying a specular lobe its whole length caught the same grazing
  // highlight: measured at 0.64 mean against a frame mean of 0.21, a hard white
  // stripe over the windscreen header and the brightest thing in the cabin. A
  // cage in a trimmed cab is sprayed, not polished.
  for (const sx of [-1, 1]) {
    k.add('trim', tube(
      [
        [sx * (HW - 0.11), FLOOR + 0.04, S.cabRearZ + 0.16],
        [sx * (HW - 0.13), cageY - 0.2, S.cabRearZ + 0.18],
        [sx * (HW - 0.19), cageY, S.cabRearZ + 0.34],
        [sx * (HW - 0.21), cageY, hoopZ],
      ],
      0.032,
      9,
    ));
    // foot plate, bolted through
    k.add('steelDark', rbox(0.11, 0.014, 0.11, 0.004), { pos: [sx * (HW - 0.11), FLOOR + 0.045, S.cabRearZ + 0.16] });
    for (const [bx, bz] of [
      [-0.035, -0.035],
      [0.035, -0.035],
      [-0.035, 0.035],
      [0.035, 0.035],
    ]) {
      k.add('steelDark', bolt(0.008, 0.006), { pos: [sx * (HW - 0.11) + bx, FLOOR + 0.052, S.cabRearZ + 0.16 + bz] });
    }
  }
  k.add('trim', new THREE.CylinderGeometry(0.03, 0.03, HW * 2 - 0.4, 10), {
    pos: [0, cageY, S.cabRearZ + 0.34],
    rot: [0, 0, Math.PI / 2],
  });
  k.add('trim', new THREE.CylinderGeometry(0.028, 0.028, HW * 2 - 0.44, 10), {
    pos: [0, cageY, hoopZ],
    rot: [0, 0, Math.PI / 2],
  });
  // Padding taped over the hoop where a head would reach it, which is both the
  // regulation and the one thing that stops 1.6 m of tube being one silhouette.
  for (const [px, pw] of [
    [0.5, 0.34],
    [-0.5, 0.34],
  ]) {
    k.add('rubber', new THREE.CylinderGeometry(0.043, 0.043, pw, 12), {
      pos: [px, cageY, hoopZ],
      rot: [0, 0, Math.PI / 2],
    });
    for (const tx of [-pw * 0.5 + 0.02, pw * 0.5 - 0.02]) {
      k.add('trimGloss', new THREE.CylinderGeometry(0.0455, 0.0455, 0.022, 12), {
        pos: [px + tx, cageY, hoopZ],
        rot: [0, 0, Math.PI / 2],
      });
    }
  }
  for (const sx of [-1, 1]) {
    k.add('steelDark', rbox(0.09, 0.055, 0.09, 0.008), { pos: [sx * (HW - 0.22), cageY - 0.005, hoopZ + 0.05], rot: [0.7, 0, 0] });
  }

  // Grab handles. On the A-pillars rather than the header bar, which is where an
  // offroad cab puts them and, more to the point, the only place one lands inside
  // the frame — a header-mounted handle at this eye height is above the top edge.
  // Passenger side only: the driver's pillar carries the gauge pod, and with both
  // fitted the handle's bend crossed straight over the gauge faces.
  for (const sx of [-1]) {
    const gx = sx * (CARD_X - 0.03);
    k.add('trim', bend(0.085, 0.023, Math.PI * 0.86, 12), {
      pos: [gx - sx * 0.055, 1.55, 0.66],
      rot: [0, sx * Math.PI * 0.5, sx * 0.5],
    });
    for (const [dy, dz] of [
      [0.075, 0.055],
      [-0.07, -0.05],
    ]) {
      k.add('steelDark', rbox(0.03, 0.055, 0.055, 0.008), { pos: [gx - sx * 0.012, 1.55 + dy, 0.66 + dz] });
      k.add('steelDark', bolt(0.007, 0.005), { pos: [gx - sx * 0.03, 1.55 + dy, 0.66 + dz], rot: [0, 0, sx * Math.PI * 0.5] });
    }
  }
  // passenger grab handle off the dash top, the one an offroad cab always has
  const hx = -0.62;
  k.add('trim', bend(0.075, 0.021, Math.PI * 0.9, 12), { pos: [hx, PAD_TOP + 0.08, 0.68], rot: [Math.PI * 0.5, 0, 0.35] });
  for (const dz of [-0.07, 0.07]) {
    k.add('steelDark', rbox(0.05, 0.02, 0.05, 0.006), { pos: [hx, PAD_TOP + 0.01, 0.68 + dz] });
    k.add('steelDark', bolt(0.007, 0.005), { pos: [hx, PAD_TOP + 0.02, 0.68 + dz] });
  }
}

function buildRearWall(k) {
  const rz = S.cabRearZ + 0.05;
  k.add('interiorPlastic', rbox(HW * 2 - 0.16, 0.9, 0.04, 0.02), { pos: [0, BELT - 0.28, rz] });
  k.add('interiorFaded', rbox(HW * 2 - 0.18, 0.05, 0.06, 0.016), { pos: [0, BELT + 0.2, rz + 0.005] });
  weltX(k, { len: HW * 2 - 0.24, pos: [0, BELT + 0.175, rz - 0.02], rot: [0.6, 0, 0], pitch: 0.03 });
  // a jack and a strapped kit bag on the shelf behind the bench
  k.add('steelDark', rbox(0.3, 0.07, 0.1, 0.014), { pos: [-0.44, BELT - 0.02, rz - 0.075] });
  k.add('trim', rbox(0.34, 0.14, 0.14, 0.04), { pos: [0.42, BELT + 0.02, rz - 0.09] });
  for (const dx of [-0.1, 0.1]) {
    k.add('trim', rbox(0.03, 0.16, 0.16, 0.004), { pos: [0.42 + dx, BELT + 0.02, rz - 0.09] });
  }
}

/**
 * The film sits in the plane of the windscreen, 18 mm inside it, sized to just
 * overfill the aperture so its own edge never shows against the pillar trim.
 * `CL_APN` is already the inward normal of that plane, so the plane's rotation
 * comes straight out of the rake the aperture was derived from.
 */
function buildScreenFilm(k) {
  const tilt = -Math.atan2(-CL_APN[1], -CL_APN[2]);
  const inset = 0.018;
  k.add('screenFilm', new THREE.PlaneGeometry(1.56, 0.9), {
    pos: [0, CL_AP[1] + CL_APN[1] * inset, CL_AP[2] + CL_APN[2] * inset],
    rot: [tilt, Math.PI, 0],
  });
}

export function buildInterior() {
  const k = new CabinKit('interior');
  buildFloor(k);
  buildDash(k);
  buildConsole(k);
  buildSeats(k);
  buildDoors(k);
  buildRoof(k);
  buildCage(k);
  buildRearWall(k);
  buildScreenFilm(k);
  return k;
}
