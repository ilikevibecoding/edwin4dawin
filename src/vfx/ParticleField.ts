import * as THREE from 'three';
import { puffTexture } from './SpriteForge';

/**
 * The particle renderer and simulator.
 *
 * Two instanced draw calls cover every particle in the game: one alpha-blended
 * bucket for anything that occludes (smoke, dust, fireballs, debris, blood)
 * and one additive bucket for anything that emits (muzzle flash, sparks,
 * embers, the blast rim). Splitting them is not an optimisation — an additive
 * spark cannot be sorted against an alpha-blended plume and does not need to
 * be, while a fireball genuinely has to hide what is behind it or it reads as
 * a hologram.
 *
 * Shading is where the money is. Smoke here is not a textured circle with a
 * fake normal: the sprite carries an optical-thickness channel, and the shader
 * integrates a chord from each texel toward the sun through that thickness.
 * The lobes facing the sun have a short chord and stay bright; the lobes
 * behind them have a long one and go nearly black. That single relationship
 * produces the bright rim and dark core that separate smoke from a sprite, and
 * no amount of extra particles substitutes for it.
 */

export const enum PKind {
  Smoke = 0,
  Spark = 1,
  Flash = 2,
  Debris = 3,
  Blood = 4,
  Fire = 5,
  Ember = 6,
  GroundDust = 7,
  ShockRing = 8,
  Blast = 9,
  /**
   * The two or three frames of overexposure at the seat of a detonation.
   *
   * Separate from `Flash` because that kind draws a star — three or four
   * unequal fingers torn out of a bulb, which is what a muzzle presents and is
   * emphatically not what a charge does. Used for a bomb it stamps a legible
   * asterisk in the middle of the fireball, and no amount of retuning the ramp
   * or the emissive changes the fact that the silhouette is wrong.
   */
  Core = 10,
}

/** `?probe=alpha` for silhouettes, `?probe=kind` for a flat kind key. */
function probeMode(): number {
  if (typeof location === 'undefined') return 0;
  const v = new URLSearchParams(location.search).get('probe');
  return v === 'alpha' ? 1 : v === 'kind' ? 2 : v === 'cal' ? 3 : 0;
}

/** `?only=5` draws just the fireball, `?only=0` just the smoke, and so on. */
function onlyKind(): number {
  if (typeof location === 'undefined') return -1;
  const v = Number(new URLSearchParams(location.search).get('only') ?? NaN);
  return Number.isFinite(v) ? v : -1;
}

/** Kinds drawn additively. Everything else goes in the alpha bucket. */
function isAdditive(kind: number): boolean {
  return kind === PKind.Spark || kind === PKind.Flash || kind === PKind.Ember
    || kind === PKind.Blast || kind === PKind.Core;
}

/** A transient fireball that lights nearby smoke from inside. */
export interface HotSpot {
  position: THREE.Vector3;
  color: THREE.Color;
  intensity: number;
  radius: number;
  life: number;
  maxLife: number;
}

export const MAX_HOTSPOTS = 3;

export interface Particle {
  active: boolean;
  delay: number;
  life: number;
  maxLife: number;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  size: number;
  /** Diameter added per second, metres. Linear, so lifetimes stay bounded. */
  grow: number;
  rot: number;
  rotSpeed: number;
  color: THREE.Color;
  colorEnd: THREE.Color;
  opacity: number;
  drag: number;
  gravity: number;
  /** Upward acceleration from being hotter than the air; decays with age. */
  buoyancy: number;
  kind: number;
  collides: boolean;
  turbulence: number;
  emissive: number;
  seed: number;
  shade: number;
  shadeEnd: number;
  /** World length of the motion streak; 0 for round billboards. */
  stretch: number;
  fadeIn: number;
  fadePow: number;
  /** Scratch: squared distance to camera, for the sort. */
  key: number;
}

export interface SpawnSpec {
  position: THREE.Vector3;
  velocity?: THREE.Vector3;
  maxLife?: number;
  delay?: number;
  size?: number;
  grow?: number;
  rotation?: number;
  rotationSpeed?: number;
  color?: THREE.Color;
  colorEnd?: THREE.Color;
  opacity?: number;
  drag?: number;
  gravity?: number;
  buoyancy?: number;
  kind?: number;
  collides?: boolean;
  turbulence?: number;
  emissive?: number;
  shade?: number;
  shadeEnd?: number;
  stretch?: number;
  fadeIn?: number;
  fadePow?: number;
}

const FLOATS = {
  posSize: 4,
  color: 3,
  params: 4,
  extra: 4,
  vel: 3,
};

interface Bucket {
  mesh: THREE.Mesh;
  geo: THREE.InstancedBufferGeometry;
  posSize: THREE.InstancedBufferAttribute;
  color: THREE.InstancedBufferAttribute;
  params: THREE.InstancedBufferAttribute;
  extra: THREE.InstancedBufferAttribute;
  vel: THREE.InstancedBufferAttribute;
  count: number;
}

const VERT = /* glsl */ `
precision highp float;

attribute vec4 iPosSize;
attribute vec3 iColor;
attribute vec4 iParams;   // opacity, kind, rotation, emissive
attribute vec4 iExtra;    // seed, shade, stretch, age
attribute vec3 iVel;

uniform vec3 uSunView;
uniform vec3 uSunWorld;
uniform vec4 uHotPos[${MAX_HOTSPOTS}];    // xyz world, w radius
uniform vec3 uHotColor[${MAX_HOTSPOTS}];

varying vec2 vUv;
varying vec2 vTile;
varying vec2 vSun2;
varying vec2 vUp2;
varying vec3 vColor;
varying vec4 vParams;     // opacity, kind, emissive, seed
varying vec3 vExtra;      // shade, age, backlit
varying vec3 vHot;
varying float vDepth;
varying float vSize;

void main() {
  float kind = iParams.y;
  float seed = iExtra.x;

  // Mirror, zoom and re-tile the sprite lookup per particle. One silhouette
  // repeated forty times over reads as tiling immediately; four tiles times a
  // flip times a scale is enough that a plume never shows the repeat.
  float flip = step(0.5, fract(seed * 5.17)) * 2.0 - 1.0;
  float zoom = mix(0.88, 1.16, fract(seed * 11.3));
  vUv = (uv - 0.5) * vec2(flip, 1.0) * zoom + 0.5;
  float tileIdx = floor(fract(seed * 7.31) * 3.999);
  vTile = vec2(mod(tileIdx, 2.0), floor(tileIdx * 0.5)) * 0.5;

  vColor = iColor;
  vParams = vec4(iParams.x, kind, iParams.w, seed);

  float c = cos(iParams.z);
  float s = sin(iParams.z);
  vec2 q = position.xy;
  vec2 rot = vec2(q.x * c - q.y * s, q.x * s + q.y * c);

  float size = iPosSize.w;
  vec4 mv;
  vec2 sunLocal;
  vec2 upLocal;

  if (kind > 6.5 && kind < 8.5) {
    // Ground-hugging dust and the shock ring lie flat on the floor, which no
    // camera-facing billboard can fake: a sheet of dust racing outward reads
    // as a shockwave only if it stays on the ground as you look down at it.
    vec3 wp = iPosSize.xyz + vec3(rot.x, 0.0, rot.y) * size;
    mv = modelViewMatrix * vec4(wp, 1.0);
    sunLocal = vec2(uSunWorld.x * c + uSunWorld.z * s, -uSunWorld.x * s + uSunWorld.z * c);
    // A sheet lying on the floor has no top and no bottom to speak of.
    upLocal = vec2(0.0, 0.0);
  } else {
    mv = modelViewMatrix * vec4(iPosSize.xyz, 1.0);
    float stretch = iExtra.z;
    vec2 dv = (mat3(modelViewMatrix) * iVel).xy;
    float l = length(dv);
    if (stretch > 0.0 && l > 1.0e-5) {
      dv /= l;
      vec2 perp = vec2(-dv.y, dv.x);
      // The head of the streak sits on the particle and the tail trails back
      // along its own velocity, which is where a real tracer's smear comes
      // from — a symmetric sprite reads as a floating dash.
      mv.xy += dv * ((q.x - 0.5) * stretch) + perp * (q.y * size);
    } else {
      mv.xy += rot * size;
    }
    sunLocal = vec2(uSunView.x * c + uSunView.y * s, -uSunView.x * s + uSunView.y * c);
    // Screen-space "up", carried into the sprite's own rotated frame. Sky
    // above and ground below is the one light gradient a puff of dust always
    // has, whatever the sun is doing, and shading it is most of the
    // difference between a ball of smoke and a disc of it.
    vec3 upView = mat3(modelViewMatrix) * vec3(0.0, 1.0, 0.0);
    upLocal = vec2(upView.x * c + upView.y * s, -upView.x * s + upView.y * c);
  }

  sunLocal.x *= flip;
  upLocal.x *= flip;
  vSun2 = normalize(sunLocal + vec2(1.0e-5, 0.0));
  vUp2 = normalize(upLocal + vec2(0.0, 1.0e-5));

  // Fireball light on nearby smoke. This is the difference between a smoke
  // column that happens to be next to an explosion and one that is being lit
  // from inside by it; without it the plume stays sky-grey while the fire it
  // is made of burns two metres away.
  vHot = vec3(0.0);
  for (int i = 0; i < ${MAX_HOTSPOTS}; i++) {
    vec3 d = uHotPos[i].xyz - iPosSize.xyz;
    float r = uHotPos[i].w;
    if (r <= 0.0) continue;
    float att = max(0.0, 1.0 - dot(d, d) / (r * r));
    vHot += uHotColor[i] * att * att;
  }

  vDepth = -mv.z;
  vSize = size;
  vExtra = vec3(iExtra.y, iExtra.w, clamp(-uSunView.z, 0.0, 1.0));

  gl_Position = projectionMatrix * mv;
}
`;

const FRAG = /* glsl */ `
precision highp float;

varying vec2 vUv;
varying vec2 vTile;
varying vec2 vSun2;
varying vec2 vUp2;
varying vec3 vColor;
varying vec4 vParams;
varying vec3 vExtra;
varying vec3 vHot;
varying float vDepth;
varying float vSize;

uniform sampler2D tSprite;
uniform sampler2D tDepth;
uniform vec2 uResolution;
uniform vec3 uSunView;
uniform vec3 uSunColor;
uniform vec3 uAmbient;
uniform float uSunUp;
uniform float uHdrUnit;
uniform float uTime;
uniform float uHasDepth;
uniform float uAlphaProbe;
uniform float uOnlyKind;

vec4 puff(vec2 uv) {
  return texture2D(tSprite, clamp(uv, 0.006, 0.994) * 0.5 + vTile);
}

// Soot to white-hot, in post-exposure linear rather than as a unit hue that
// something else scales. Hue and intensity are the same axis for a
// blackbody-ish emitter, and splitting them was what kept producing a pale
// ball: any gain large enough to make the fire brighter than the sunlit street
// also dragged it up the tone curve's shoulder, where the transform's own
// desaturation flattened whatever hue the ramp had put in.
//
// The values are solved against this project's display transform rather than
// authored by eye, because that transform is unusually unforgiving here: AgX's
// inset matrix leaks 5% of red into blue before the log encode, the grade runs
// a 1.5 contrast slope on top, and highlightDesat starts bleaching anything
// whose brightest channel passes 1.8. Numerically, the most saturated warm
// colour the chain can display sits near 0.4 linear (a deep ember red), and
// saturation falls off monotonically from there: 0.9 linear is the last point
// that still reads as orange rather than as tan, and past about 3 everything
// is cream regardless of the ratio fed in. So the ramp spends its length in
// the 0.03-to-1.0 band where the colour is, and only the last few per cent of
// the parameter — the parcels a real camera would clip — is allowed over the
// bloom threshold at 2.2.
//
// Green is the saturation control and it is close to zero for most of the
// range. The inset puts enough green and blue back to keep the darkest embers
// off the gamut edge; authoring any there just makes them brown. The middle
// knots were carrying green at three quarters of red, which is a *yellow*, and
// a fireball whose bulk landed there photographed as a pale olive cloud —
// green that high with no blue under it is exactly the hue the eye reads as
// sickly rather than as hot.
//
// Divided by the metering trim the shots are taken through. The composite's
// auto-exposure multiplies the whole frame by a factor it solves per frame,
// bounded between 0.76 and 2.0, and an enclosed street settles at the top of
// that range — so a ramp authored in post-exposure units arrives a full stop
// hot, which is precisely one stop too far up the shoulder. Measured off a
// capture by inverting the display transform on the fireball's own pixels:
// red and green came back at almost exactly twice the authored ramp.
//
// It cannot be compensated exactly, because the trim is a property of the
// frame rather than of the effect. Authoring for the middle-to-high end of
// its range is the right trade: an open, brightly metered frame renders the
// fire a little darker and *more* saturated, which is the correct direction
// for fire seen against a brighter background anyway.
// The knots are placed against the *measured* distribution of the parameter,
// not spread evenly along it. It arrives as a product of four terms that each
// average well under one, so the bulk of a fireball's texels land between 0.2
// and 0.5 and almost nothing reaches the last quarter. Spacing the ramp
// evenly therefore spends four of its six segments on parameter values that
// never occur, and the whole ball renders inside the first two — a uniform
// deep maroon with no hot core anywhere in it, which is what the previous
// capture showed. The oranges belong where the signal is.
const float HEAT_TRIM = 1.8;
vec3 heat(float t) {
  t = clamp(t, 0.0, 1.0);
  // Green is back in the lower middle of the ramp, and it is the difference
  // between brick and fire. Authored with none at all, the band the bulk of a
  // 100 ms fireball actually lands in — a fifth to a third of the parameter —
  // printed as a flat maroon, and the capture came back as a pile of dark red
  // bubbles with a few gold spots in it. The zero was a correction for an
  // earlier pass whose knots carried green at three quarters of red, which is
  // olive; a fifth of red is orange, and orange is what is wanted here.
  vec3 c = vec3(0.030, 0.0015, 0.0000);
  c = mix(c, vec3(0.060, 0.0030, 0.0000), smoothstep(0.01, 0.07, t));
  c = mix(c, vec3(0.310, 0.0320, 0.0000), smoothstep(0.06, 0.19, t));
  c = mix(c, vec3(0.560, 0.1150, 0.0000), smoothstep(0.17, 0.34, t));
  c = mix(c, vec3(0.880, 0.2950, 0.0020), smoothstep(0.32, 0.52, t));
  c = mix(c, vec3(1.550, 0.7200, 0.0100), smoothstep(0.50, 0.72, t));
  // The last two knots are pushed late and their peak pulled down, and both
  // changes are about bloom rather than about colour. At 9.5 the top of this
  // ramp handed the composite more energy per texel than the sun does, and
  // bloom returns that as a wide convolution in the *source's* hue — so a
  // handful of clipping cores came back as a cream wash over the whole ball
  // and the graded fire underneath it was lost. Seven still clips to white;
  // the wash is gone.
  c = mix(c, vec3(3.000, 1.6000, 0.0900), smoothstep(0.70, 0.90, t));
  c = mix(c, vec3(7.000, 5.0000, 1.4000), smoothstep(0.90, 1.00, t));
  return c / HEAT_TRIM;
}

/**
 * Incandescence for a muzzle or impact flash, in post-exposure units.
 *
 * Separate from the fireball's ramp because the two are asked for different
 * things. A fireball is a body of gas whose *bulk* should read as a colour, so
 * its ramp is authored to keep almost all of it under the display transform's
 * bleaching point. A flash is the opposite: the hub is supposed to clip, and
 * what has to survive is the ring between the clipped part and the background.
 *
 * That ring is the whole difficulty, and it is a property of the transform
 * rather than of the effect. Measured through this composite, a colour stops
 * being a colour somewhere around two and a half times display white — a pure
 * red at five reads #f5e3d2, which is cream, and at eight it is white with a
 * warm cast. No amount of extra red buys saturation back, because the shoulder
 * is compressing the channels toward each other faster than the ratio between
 * them widens. So the amber is authored *at* the brightness of the sunlit
 * street rather than above it: it reads as hot because of its hue against the
 * sandstone, not because it out-luminates it, which is also how a real muzzle
 * flash photographs in daylight. The clipping is left to the hub, which is
 * small enough that its bloom does not veil the ring around it.
 *
 * The arms carry roughly double what that reasoning first suggested, because
 * this sprite draws *additively*: the amber is not competing with white, it is
 * being added to whatever is behind it, and behind it is a sunlit sandstone
 * street already sitting above one. Authored at the street's own level the
 * arms shifted a wall by a tenth of a stop and photographed as nothing at all.
 *
 * Solved against an offline replica of the display transform rather than by
 * eye, and the result is worth stating plainly because it bounds what this
 * effect can be: against the sunlit sandstone this game is mostly played in,
 * *no* additive colour reaches a saturation above about 0.29. The highlight
 * desaturation and the tone curve between them compress the channels toward
 * each other faster than any ratio can pull them apart — a pure red at four
 * over a lit street renders #f2dccc. Chasing a saturated amber corona there is
 * chasing something the pipeline cannot print, and four passes were spent
 * doing it.
 *
 * What the transform *will* print is the band under about 1.5, where a red
 * with almost no green in it still comes out at 0.42 saturation. So the ramp
 * spends most of its length there and only the hub is allowed above it. That
 * puts the colour where a flash is seen against something dark — shade, an
 * interior, night — and leaves the daylight case reading by shape and by
 * luminance, which is also how a real one photographs at noon.
 */
vec3 flashRamp(float t) {
  t = clamp(t, 0.0, 1.0);
  // Green is the whole story here, and getting it wrong is what kept this
  // effect pink through six passes.
  //
  // An additive sprite composites as background *plus* emission, and the
  // background — a plug of muzzle blast over a sunlit street — contributes
  // roughly equal green and blue. Emitting a near-pure red on top of that
  // raises red alone, so the sum arrives with green and blue still level with
  // each other and red clipped above them, and a colour with matched green and
  // blue under a clipped red is, arithmetically, pink. Measured off a capture
  // the arms came back (213, 162, 145) at 0.32 saturation — cherry blossom.
  //
  // Burning propellant is not a 1700 K blackbody anyway. It is a diffusion
  // flame full of incandescent carbon and unburnt powder well over 2500 K, and
  // it photographs gold. Solved through an offline replica of this transform,
  // an arm carrying green at two fifths of its red prints (227, 200, 153) over
  // the same plug — warm gold at the same saturation, which is the colour the
  // effect was always supposed to be. The blue stays near zero because that is
  // the only channel left to separate gold from white.
  vec3 c = vec3(0.42, 0.070, 0.001);
  c = mix(c, vec3(0.95, 0.200, 0.004), smoothstep(0.00, 0.16, t));
  c = mix(c, vec3(1.70, 0.560, 0.020), smoothstep(0.14, 0.34, t));
  c = mix(c, vec3(2.30, 0.900, 0.040), smoothstep(0.32, 0.50, t));
  c = mix(c, vec3(3.80, 1.850, 0.130), smoothstep(0.48, 0.70, t));
  c = mix(c, vec3(5.60, 3.400, 0.700), smoothstep(0.68, 0.87, t));
  // The hub clips, and that is all it has to do. Authored at twenty-two the
  // sprite was handing the bloom pass more energy than the sun, and bloom
  // spreads it as the *flash's own hue* — a red-dominant blur laid over a lit
  // sandstone street, which is arithmetically pink. The capture came back with
  // a two-metre rose veil across an awning and the star lost inside it. At
  // nine it still reads as clipped white in the middle and the veil is gone.
  c = mix(c, vec3(9.50, 7.200, 3.000), smoothstep(0.87, 1.00, t));
  return c / HEAT_TRIM;
}

/**
 * Scattering through a puff.
 *
 * thick is the sprite's optical depth at this texel and facing is how far the
 * texel sits toward the sun across the sprite, so the chord a sunbeam has
 * already crossed before reaching here is short on the lit side and long on
 * the dark one. Two exponentials: a tight one for the directly transmitted
 * beam, which is what draws the rim, and a broad one standing in for the light
 * that scattered several times inside the plume, without which pure
 * single-scatter smoke reads as soot in a bag.
 */
vec3 scatter(float thick, float facing, float dens, float backlit, float shade) {
  float chord = thick * (1.0 - 0.92 * facing) + 0.06;
  float direct = exp(-chord * 4.4 * dens);
  float multi = exp(-chord * 0.95 * dens);
  // Backlit plumes glow where they are thin. Forward scatter peaks in the
  // beam direction, so it keys off the sun being behind the smoke and off the
  // chord being short.
  float fwd = backlit * backlit * exp(-chord * 1.8 * dens) * 0.9;
  // The sky reaches the middle of a plume even less well than the sun does,
  // and letting it flood in there is what flattens smoke back into a disc
  // after all the trouble the direct term goes to.
  float sky = 0.10 + 0.90 * exp(-thick * 2.6 * dens);
  // uSunColor is a radiance — the irradiance already divided by PI — so the
  // bracket is the fraction of it that leaves this texel, and it has to stay
  // inside a Lambertian budget. It did not: peaking near 0.8 put a plume
  // authored at 0.19 albedo out at two thirds of display white on its sunlit
  // side, so detonation soot photographed as cream-coloured steam. Half a
  // Lambert is about right for something that absorbs as hard as soot does,
  // and taking it out of the *direct* term rather than the multiple-scatter
  // one keeps the rim-to-core ratio the whole model exists for.
  // The ambient floor is a fifth, not two fifths, and that is what finally
  // gave the plume a dark core. The shade attribute carries which side of the column a
  // parcel is on, and at a floor of 0.38 a parcel authored as fully shadowed
  // still received half the sky — so the shadowed half of a plume came back
  // within a third of a stop of the sunlit half and the whole thing read as one
  // evenly exposed sheet. Deep inside a column the sky reaches almost nothing.
  return uSunColor * ((direct * 0.78 + multi * 0.14 + fwd) * shade)
       + uAmbient * (sky * mix(0.22, 1.0, shade));
}

float flicker(float seed, float rate) {
  float a = sin(uTime * rate + seed * 43.7);
  float b = sin(uTime * rate * 2.37 + seed * 91.3);
  return 0.62 + 0.38 * (a * 0.6 + b * 0.4);
}

void main() {
  float vProbe = 0.0;
  int kind = int(vParams.y + 0.5);
  // Isolation. Six systems overlap on one detonation and arguing about which
  // of them is the pale thing in the middle of the frame is unwinnable from a
  // composite; drawing one at a time settles it in a single capture.
  if (uOnlyKind >= 0.0 && abs(vParams.y - uOnlyKind) > 0.5) discard;
  vec2 p = vUv - 0.5;
  float r2 = dot(p, p) * 4.0;
  float rr = sqrt(r2);

  float alpha = vParams.x;
  float seed = vParams.w;
  float shade = vExtra.x;
  float age = vExtra.y;
  float backlit = vExtra.z;
  float emissive = vParams.z;
  vec3 color = vColor;
  // A fraction of the sprite's own radius, not a distance. Zero means "do not
  // fade this against the depth buffer at all".
  float softness = 0.25;

  if (kind == 0 || kind == 7) {
    // ---- smoke and dust ------------------------------------------------
    if (rr > 1.04) discard;
    vec4 tx = puff(vUv);
    float ero = mix(tx.b, tx.a, fract(seed * 3.71));
    // Dissipation eats the silhouette from the outside in along the erosion
    // field, so a puff tears into rags instead of shrinking as a disc.
    float bite = age * 0.66;
    float d = clamp((tx.r - bite * (1.0 - ero * 0.82)) / max(1.0 - bite, 0.10), 0.0, 1.0);
    // The quad's own border must not reach the frame. Coverage here comes only
    // from the sprite's billow channel, which does not fall to zero at the
    // texture's edge — harmless on a camera-facing billboard, where the residue
    // is a faint ring nobody can find, and not harmless at all on the
    // ground-hugging sheet, which is built flat in the floor plane and therefore
    // presents its corners to the lens. Photographed on a road at eight metres
    // that boundary came back as half a metre of straight edge with right-angled
    // notches in it, and two reviews spent their time blaming the decals.
    //
    // Held out at the rim so it only trims what the erosion field is already
    // eating, and pulled in much harder on the sheet, which wants to be an
    // ellipse rather than a square.
    alpha *= d * (1.0 - smoothstep(kind == 7 ? 0.52 : 0.82, 1.03, rr));
    if (alpha < 0.004) discard;

    float thick = tx.g;
    float dens = 0.55 + 1.75 * vParams.x;
    // Billow relief.
    //
    // The scattering model below shades a puff across its whole width — one
    // bright edge, one dark edge — which is correct and is also everything
    // that was on screen. A plume is not a ball, it is a stack of rolls a
    // metre across, and it is the light *inside* the outline that says so.
    // Without it a bank of smoke photographs as a stain: the last capture's
    // detonation column had a perfectly reasonable rim on it and still read as
    // one flat brown shape, because between the two edges there was nothing.
    //
    // The sprite already carries the relief in its thickness channel, so the
    // gradient of that channel is the surface normal of the billows, and
    // folding it into the same chord term the rim comes out of costs four
    // taps and no new lighting model. Where the plume is thinning toward the
    // light the chord is short and the roll catches the sun; where it thickens
    // into the next roll the chord is long and the crevice between them goes
    // dark.
    //
    // Keyed to the sun in the sprite's own frame, falling back to the sky when
    // the sun is near the view axis — with the sun behind the camera the
    // projected direction is a couple of hundredths of a unit long and its
    // angle is numerical noise, which would light the billows from a direction
    // that changes per particle.
    float e = 0.05;
    vec2 grad = vec2(
      puff(vUv + vec2(e, 0.0)).g - puff(vUv - vec2(e, 0.0)).g,
      puff(vUv + vec2(0.0, e)).g - puff(vUv - vec2(0.0, e)).g
    );
    float sunLen = length(vSun2);
    vec2 lit2 = sunLen > 0.22 ? vSun2 / sunLen : vUp2;
    float relief = clamp(-dot(grad, lit2) * 7.0, -0.62, 0.62);
    float facing = clamp(dot(p * 2.0, vSun2) + relief, -1.0, 1.0);
    // Sky above, dirt below. Applied as a multiplier on the whole puff rather
    // than on the ambient alone, because the ground is dark enough in this
    // scene that the underside of a plume is genuinely a stop and a half down
    // on the crown of it.
    float dome = mix(0.34, 1.18, clamp(dot(p * 2.0, vUp2) * 0.55 + 0.5, 0.0, 1.0));
    vec3 lit;
    if (kind == 7) {
      // A sheet on the ground is lit from above and barely self-shadows
      // sideways, so the sun term keys off the sun's elevation, not the
      // in-plane direction.
      float chord = thick * (1.0 - 0.35 * facing) + 0.12;
      lit = uSunColor * uSunUp * (exp(-chord * 2.6 * dens) * 0.72 + exp(-chord * 0.6 * dens) * 0.22) * shade
          + uAmbient * (0.26 + 0.62 * exp(-thick * 1.5 * dens));
    } else {
      lit = scatter(thick, facing, dens, backlit, shade) * dome;
    }
    // Firelight from inside the plume. Kept subordinate to the sun term: it is
    // a *warming*, and when it outruns the daylight the whole bank of smoke
    // turns the colour of the light rather than being lit by it — which on a
    // 0.05-albedo soot is a street full of salmon-pink cotton wool.
    color = vColor * lit + vColor * vHot * (0.12 + 0.55 * exp(-thick * 2.2));
    // The ground-hugging sheet is exempt: it is built flat in the floor plane
    // rather than as a camera-facing billboard, so it has no slice to hide and
    // a depth fade can only erase it.
    softness = kind == 7 ? 0.0 : 0.6;
  } else if (kind == 5) {
    // ---- fireball ------------------------------------------------------
    if (rr > 1.04) discard;
    vec4 tx = puff(vUv);
    float ero = mix(tx.b, tx.a, fract(seed * 2.13));
    float bite = age * 0.58;
    // A fireball is optically thick where smoke is wispy — you cannot see a
    // wall through burning fuel. Carrying the smoke sprite's density curve
    // straight over left the ball around 40 per cent covered, and a sunlit
    // sandstone street showing through an explosion is exactly what turned it
    // cream: the colour was right all along and the background was most of
    // what was on screen.
    // The multiplier is three, not one and a half, and the difference is the
    // whole of the "why is the fireball pink" question. Area-weighted, this
    // sprite's density channel averages about 0.27 across its disc, so at 1.55
    // the mean fragment came out at 0.42 alpha; forty of them stacked still
    // let a third of a sunlit sandstone wall through the middle of the ball,
    // and orange over grey at one to two is exactly, arithmetically, salmon.
    // Burning fuel is opaque. Erosion still tears the rim, so the silhouette
    // does not turn back into a disc.
    // A constant term in the bite, not just an age-driven one. Multiplying the
    // density up to make the ball opaque also pushed the whole sprite past
    // saturation at birth, so every parcel was drawn as a smooth disc with a
    // soft edge and the fireball's silhouette was a circle for the first
    // tenth of a second — the single most artificial thing in the sequence.
    // The erosion field has to be subtracted from the very first frame for the
    // rim to tear.
    float d = clamp(
      (tx.r * 2.7 - (0.30 + bite) * (1.0 - ero * 0.72)) / max(1.0 - bite * 0.7, 0.12),
      0.0, 1.0);
    alpha *= d;
    if (alpha < 0.004) discard;

    float thick = tx.g;
    // Incandescence lives in the core and dies from the outside in. The cooling
    // ramp is what makes one detonation read as a sequence rather than as an
    // orange ball that shrinks: white for the first few frames, yellow by a
    // tenth of a second, deep red by a third, soot after that.
    float core = smoothstep(0.02, 0.45, thick);
    // Temperature falls toward the skin of the parcel, not only with its
    // density. This is the difference between a fireball and a collage.
    //
    // The ramp is clamped at one, so a parcel authored hot enough for its
    // middle to clip clips across its whole interior: what reaches the frame
    // is a flat cream disc with a soft round edge, and three or four of those
    // overlapping is the single most artificial thing a fire system produces.
    // Every capture of this detonation had them, and lowering the authored
    // temperature until they had a gradient left the fireball with no hot part
    // anywhere. The density channel does not fix it either — it is a billow
    // field, not a radial one, and it saturates over most of the sprite.
    //
    // A parcel of burning gas is hottest in its middle and radiating from its
    // surface, so the falloff is physical as well as convenient: it puts an
    // amber skin on every sprite, which is also what stops one sprite from
    // being distinguishable from its neighbour.
    // Steeper than it looks. The ramp saturates to cream above about seven
    // tenths, so any parcel whose *interior* clears that is drawn as a flat
    // cream disc — and a hot fireball needs a good few parcels up there, so the
    // only way to keep them from reading as discs is to make each one cool
    // hard toward its own edge. At the previous 0.35 + 0.85 the half-radius
    // texel was still at three quarters of the peak temperature, so the top
    // eighth of the parcels came back as legible yellow circles laid over the
    // fire. Cubed-ish falloff puts that texel at half, which turns the same
    // parcel into a bright centre inside an orange skin.
    float rim = pow(1.0 - smoothstep(0.10, 1.00, rr), 1.7);
    // Off-centre, and that is the whole of it. A radial falloff is the one
    // gradient a sprite must not wear on its own, because every parcel gets the
    // *same* one and thirty of them side by side is thirty concentric discs —
    // measured off a 120 ms capture, a bunch of gold spheres in brown gaps,
    // which is the single most artificial thing in the sequence. Sliding the
    // centre of the falloff by a per-parcel offset costs nothing and means no
    // two neighbours are bright in the same place, so the bright regions cross
    // sprite boundaries instead of announcing them.
    vec2 off = vec2(fract(seed * 17.31) - 0.5, fract(seed * 29.77) - 0.5) * 0.62;
    rim = mix(rim, pow(1.0 - smoothstep(0.05, 0.95, length(p * 2.0 - off)), 1.4), 0.65);
    // Heat in blotches, not in rings. This is what stops a fireball reading as
    // popcorn, and it took a capture of eight countable pale lozenges to see
    // why the previous two attempts failed: both drove temperature off radius
    // and density, and both of those are *radially symmetric* across a sprite,
    // so every parcel came out as a concentric disc — bright middle, orange
    // skin, round edge. Overlapping thirty concentric discs does not produce
    // turbulence, it produces a pile of discs, and the eye counts them.
    //
    // The sprite's own erosion channels are the only thing on hand that is not
    // radial. Raised to a power for contrast they put the hot part of each
    // parcel somewhere off-centre and in a torn shape, so the same thirty
    // parcels now interleave into a granular mass with fire showing through the
    // gaps — which is the thing the reference footage is made of.
    // Sampled a second time with the coordinates rotated a quarter turn. The
    // sprite's own channels are all the noise there is, and every one of them
    // is a low-frequency billow with two or three lobes across the tile — so a
    // temperature driven by any single channel put two or three gold blobs on
    // every parcel, and thirty parcels came back as a bunch of grapes. The
    // rotated sample is decorrelated from the upright one at no extra
    // authoring cost, and the product of two billows has roughly twice the
    // spatial frequency of either, which is what turns lobes into flecks.
    vec4 rot = puff(vec2(vUv.y, 1.0 - vUv.x));
    float fleck = mix(rot.b, rot.a, fract(seed * 6.31));
    float grain = pow(clamp(mix(mix(thick, ero, 0.55), fleck, 0.45) * 1.30, 0.0, 1.0), 1.9);
    // Floors, not zeroes, on all three modulators — and this is what took the
    // popcorn out. Multiplied together, minima of 0.26, 0.12 and 0.12 put the
    // product's floor at four thousandths, so any texel that missed on all
    // three landed at the very bottom of the ramp where the soot cross-fade
    // takes over: brown. A fireball's cool regions are not brown, they are
    // *deep red* — they are still burning, just badly — and holding the floor
    // an order of magnitude higher is what puts them there.
    //
    // Then the weights: nearly all of the range on the torn field and almost
    // none on the radial envelope. Raising the floors alone fixed the gaps and
    // left the lobes, because the radial term still carried a three-to-one
    // ratio across every parcel and the bulk had been lifted far enough that the
    // middle of each one clipped — reviewed at 120 ms, a mass of gold bubbles
    // instead of a mass of brown ones. Whether a fireball reads as fire or as
    // spheres is decided by whether its bright regions respect sprite
    // boundaries, so the part of the signal allowed to clip has to be the one
    // that does not know where the sprite's centre is. The radial envelope is
    // down to a weak 1.8:1 — enough to keep an edge cooler than a middle — and
    // the torn field carries everything else, which puts the clipping cores in
    // ragged patches that run across neighbouring parcels.
    float t = emissive * pow(max(1.0 - age, 0.0), 2.1)
            * (0.42 + 0.44 * core) * (0.55 + 0.45 * rim) * (0.26 + 1.05 * grain);
    t = clamp(t, 0.0, 1.0);
    vec3 fire = heat(t);
    vProbe = t;

    // What is left once a parcel has cooled is soot, and soot has to be *lit*
    // or a dying fireball punches a black hole in the frame.
    float dens = 0.6 + 1.5 * vParams.x;
    float facing = dot(p * 2.0, vSun2);
    float dome = mix(0.34, 1.18, clamp(dot(p * 2.0, vUp2) * 0.55 + 0.5, 0.0, 1.0));
    vec3 soot = vColor * scatter(thick, facing, dens, backlit, shade) * dome;
    // The ramp already carries intensity, so there is nothing to scale here.
    // uHdrUnit only restores the exposure the ramp was solved at, so the same
    // authored values land the same way whichever lighting preset is running.
    //
    // Soot fades in as the parcel drops off the bottom of the ramp rather than
    // being cross-faded against the fire everywhere: mixing lit grey into an
    // ember is what turned the cool shell into rust-brown scab, and a parcel
    // that is still incandescent has no visible soot in front of it anyway.
    // Halved. A parcel that has dropped off the ramp is soot, and soot inside
    // a detonation is in the shadow of the rest of the detonation — the
    // scattering solve does not know that, and handed a desert sun it brought
    // a 0.05 albedo out at four tenths of display white. Isolated on the fire
    // layer, the cooled parcels of a 120 ms fireball were half a dozen pale
    // tan ovals sitting in front of the hot ones with visible sprite edges,
    // which is the single most artificial thing a particle system can put on
    // screen. Dark, they read as the holes in the fire that they are.
    // The cross-fade to soot is wide, and that is what keeps the cold parts of
    // a fireball from reading as red cloth. Held to the bottom sixth of the
    // ramp, every texel that fell just short of orange was drawn as a dark
    // saturated red with almost no soot under it — and a mass of dark
    // saturated red hanging over a blast is the crumpled-rag look that three
    // captures kept returning. Anything under two fifths of the ramp is mostly
    // smoke by weight, which is also true of the thing being drawn.
    //
    // Narrowed to the bottom quarter now the temperature floor sits above it.
    // With the floor raised, a crossfade reaching to two fifths was mixing lit
    // grey into every texel of the fireball's *body* rather than only into the
    // dead ones, and grey over deep red is the brown that was being complained
    // about. It only has to cover the parcels that have genuinely dropped off
    // the ramp with age.
    color = fire * uHdrUnit
          + (soot * 0.75 + vColor * vHot * 0.6) * (1.0 - smoothstep(0.015, 0.24, t));
    softness = 0.8;
  } else if (kind == 1) {
    // ---- tracer spark --------------------------------------------------
    float head = vUv.x;
    float across = abs(vUv.y - 0.5) * 2.0;
    // Tapered across as well as along. A streak of even width with a soft edge
    // is a brush stroke; a spark is a point of light smeared by the shutter, so
    // it is at its widest under the head and closes to nothing at the tail.
    float waist = mix(0.10, 0.62, pow(clamp(head, 0.0, 1.0), 1.5));
    float body = pow(clamp(head, 0.0, 1.0), 2.4)
               * (1.0 - smoothstep(waist * 0.45, waist, across));
    // Broken, not continuous. An incandescent chip tumbles as it flies and its
    // trace brightens and dims several times over the length of a single
    // exposure — which is also the cheapest way to stop a streak reading as a
    // drawn line.
    body *= 0.55 + 0.45 * sin(head * 26.0 + seed * 61.0);
    alpha *= clamp(body, 0.0, 1.0) * flicker(seed, 58.0);
    if (alpha < 0.004) discard;
    // The head clips and the trail stays in the oranges. At five and a half
    // times the authored level the whole streak cleared display white and the
    // impact sparks photographed as smooth white spikes radiating out of every
    // strike — the loudest artificial mark in the frame, and pure white where
    // burning steel is orange.
    color = vColor * uHdrUnit * emissive * (0.35 + 1.9 * pow(head, 10.0));
  } else if (kind == 2) {
    // ---- muzzle / impact flash ------------------------------------------
    float ang = atan(p.y, p.x);
    float sd = fract(seed * 17.13) * 6.2831;
    // A bulb with arms, not a rosette.
    //
    // The previous profile summed three harmonics at powers under two and let
    // opacity hold flat over the inner half of every arm. Those two decisions
    // together draw one shape and it is not a star: broad round-tipped petals
    // of even length and even opacity, which is a flower. Four captures of a
    // carbine firing came back looking like cherry blossom stuck on the barrel,
    // and no amount of recolouring could fix it because the silhouette was
    // wrong before the colour was ever applied.
    //
    // What a flash actually presents is a small dense body of burning gas with
    // three or four unequal fingers torn out of it. So: raise the powers until
    // the lobes are fingers rather than petals, and bias the whole set toward
    // one bearing so the arms are of visibly different lengths. The bias is a
    // first harmonic in the *amplitude*, which is the cheapest asymmetry there
    // is and the only one that cannot produce a symmetric result by accident.
    float lobe = 0.26 * pow(abs(cos(ang * 2.0 + sd)), 2.0)
      + 0.30 * pow(abs(cos(ang * 3.0 - sd * 2.3)), 2.6)
      + 0.20 * pow(abs(cos(ang * 5.0 + sd * 0.7)), 3.6);
    // Lopsided, but not one-sided. At a bias running from 0.42 to 1.34 the
    // whole star grew out of one half of the quad and the other half was bare,
    // which reads as a flash seen through something rather than as a flash.
    // Widened once the arms became bright enough to see properly: at a
    // 1.9:1 spread between the longest and shortest arm the star photographed
    // as a regular six-pointed asterisk, which is a sheriff's badge. Real gas
    // leaving a muzzle brake is lopsided by a factor of two or three.
    lobe *= 0.52 + 0.86 * (0.5 + 0.5 * cos(ang - sd * 3.1));
    // The arms have to reach past the muzzle blast behind them or the composite
    // is a dark blob with a bright dot in it. That plug is deliberately opaque
    // — it is what gives the star something to be additive *against* — and it
    // is authored in metres at the crown, so the star's drawn extent is what
    // decides which of the two wins. At 0.28 + lobe the arms covered barely
    // half the quad's radius and the blast covered all of it, and four
    // captures of a carbine firing came back as a brown smear with an amber
    // spark on one edge.
    float reach = 0.34 + lobe * 1.22;
    // The bulb is round in outline and torn at its edge. Perfectly circular it
    // photographed as a lamp bolted to the barrel — measured off the capture,
    // a hundred-millimetre disc of clipped white with a two-value gradient
    // across the whole of it, which is a headlight. The sprite's own noise
    // pulls that boundary in and out by a third of its radius, which is all it
    // takes for the same disc to read as burning gas.
    float tear = puff(vUv * 0.9 + vec2(fract(seed * 5.7), fract(seed * 3.1))).b;
    float bulbR = 0.30 * (0.70 + 0.62 * tear);
    float bulb = 1.0 - smoothstep(bulbR * 0.22, bulbR, rr);
    // A plateau and then an edge, not a falloff. This is the whole difference
    // between a star and a glow, and it is a compositing fact rather than an
    // aesthetic one: the sprite draws additively over a sunlit street already
    // sitting above display white, so a texel carrying half the star's radiance
    // does not read as half a star — it reads as a quarter-stop lift on the
    // wall, which has no shape at all. Measured across the previous profile,
    // the drawn star fell under 0.4 alpha beyond half its own radius and the
    // capture came back as a fuzzy cream disc: 0.2 m of soft glow where 0.35 m
    // of asterisk had been authored. The arms have to be near-opaque out to
    // most of their length and then stop.
    float arm = 1.0 - smoothstep(reach * 0.74, reach * 1.02, rr);
    // The halo has to reach zero *inside* the quad. An exponential still has
    // nine per cent of its peak left at the corner, and nine per cent of a
    // flash is well clear of black, so the sprite's own boundary was drawn as
    // a hard-edged luminous disc around every shot — a perfect circle in the
    // middle of the frame, which is the most artificial mark a renderer can
    // leave.
    // Tight. The halo is what the bloom pass sees, and at a third of the
    // sprite's alpha over most of its area it was handing bloom a disc twice
    // the star's radius: the capture came back with a soft pink veil across two
    // metres of awning and a hard white point in the middle of it, which is a
    // lens artefact, not a gunshot. Held close to the arms it lifts the ground
    // they sit on and nothing else.
    float glow = exp(-r2 * 7.5) * (1.0 - smoothstep(0.28, 0.72, rr));
    alpha *= clamp(bulb + arm * 0.88 + glow * 0.42, 0.0, 1.0);
    if (alpha < 0.004) discard;
    // Burning propellant is a blackbody like everything else on fire, so the
    // flash runs down the same incandescence ramp the fireball does, with
    // radius standing in for temperature: clipping white only in the hub, deep
    // amber by the tips of the arms. Interpolating one authored hue along a
    // brightness axis cannot produce that, because at any gain large enough to
    // make the hub clip the entire star is cream — which is what every capture
    // of this effect showed until the ramp went in.
    //
    // The square is deliberate. Linear in radius spends most of the star's
    // area in the top third of the ramp, where the display transform's
    // highlight desaturation has already taken the colour out of it.
    // The hub is a separate, much tighter falloff rather than a power of the
    // petal profile. Driving the temperature off the petal alone — however it
    // is shaped — keeps the whole star in the top third of the ramp, where
    // this transform has already bleached the colour out of it, and the flash
    // photographs as a cream asterisk. Only the inner third of the hub is
    // allowed to clip; the arms are amber and the corona is deep red.
    float hotness = clamp(emissive * 0.026, 0.12, 1.0);
    // Temperature falls *along* each arm, not with distance from the sprite
    // centre. This is the correction that finally made the star read, and the
    // reason is measurable rather than aesthetic.
    //
    // The arm mask is a plateau — near-opaque out to most of its reach, then an
    // edge — so driving temperature from that mask alone gives every arm one
    // flat colour over its whole length. Measured off the capture the arms came
    // back (193, 165, 129) against sandstone at (126, 102, 72): the correct
    // hue, one and a half times the background, and *the same warm tan as the
    // wall*. Gold on gold at 1.5x reads as a brighter patch of wall, which is
    // why four passes of recolouring changed nothing.
    //
    // Solved through an offline replica of the display transform, the useful
    // fact is that this pipeline trades saturation for level along a known
    // curve: over that same wall, an emission landing at 200 prints at 0.40
    // saturation, at 230 it prints 0.31, and at 245 only 0.17. Nothing gets
    // both. So the star is graded *across* that trade instead of sitting at one
    // point on it — hub clipped white, mid-arm at the 230/0.31 knee where warm
    // gold is still clearly gold and is now nearly twice the background, and
    // the tips down at 200/0.40 where the saturated amber lives. The gradient
    // between the three is what reads as burning gas; any single one of them on
    // its own reads as a decal.
    //
    // Sited on the knee itself rather than above it. At 0.30 + 0.80 along the
    // arm, the mid-arm landed near seven tenths of the ramp and printed
    // (229, 210, 182) at 0.20 saturation — twice the background, which fixed the
    // legibility, and flat cream over three quarters of the star's area, which
    // replaced one failure with the opposite one. Area on a star grows with
    // radius, so the *outer* half of each arm is three quarters of what is seen;
    // that is the part which has to sit at the knee, and only the hub above it.
    float along = clamp(1.0 - rr / max(reach, 0.001), 0.0, 1.0);
    float temp = clamp(
      (bulb * 0.55 + arm * (0.22 + 0.72 * along) + glow * 0.12)
        * (0.62 + 0.38 * hotness),
      0.0, 1.0);
    color = flashRamp(temp) * uHdrUnit;
  } else if (kind == 3) {
    // ---- debris chunk ---------------------------------------------------
    vec4 tx = puff(vUv);
    // A chip, not a tile. A hard step on a threshold this smooth gives a blob with
    // an aliased edge that lands on the pixel grid as a rectangle, and against
    // the dark soot of a detonation the capture came back with a scatter of
    // small hard-edged squares in it — the loudest possible "these are quads"
    // signal, and the second time this exact fault has been written up in this
    // block. Two thresholds one against the other cut a faceted silhouette,
    // and a one-texel ramp on each takes the staircase off it.
    float edge = 0.50 + (tx.b - 0.5) * 0.62;
    float m = (1.0 - smoothstep(edge - 0.10, edge + 0.02, rr))
            * (1.0 - smoothstep(0.72, 0.98, rr + (tx.a - 0.5) * 0.9));
    alpha *= clamp(m, 0.0, 1.0);
    if (alpha < 0.004) discard;
    // A tumbling chip is mostly in its own shadow; the flat term keeps it from
    // going to pure black against a bright street.
    //
    // The facet is what the light lands on, and it has to be *one* orientation
    // across the whole chip. Deriving the normal from the sprite's own
    // coordinates gives every chunk a radial dome — brightest in the middle,
    // dark at the rim — which is a small sphere, and a small sphere lit by a
    // desert sun is a white bead. Fifty white beads leaving a blast is the
    // "scatter of small rectangles" fault under a different name. A fixed
    // facet per particle, rolled by the seed, gives the population a spread of
    // values instead: some chips catch the sun, most do not.
    float fa = seed * 6.2831;
    vec3 n = normalize(vec3(cos(fa) * 0.75, sin(fa) * 0.75, 0.66));
    float ndl = max(dot(n, uSunView), 0.0);
    // Firelight on a chip is a warming, not a second sun. Taken at full
    // strength a chunk of masonry passing through the middle of a fireball
    // picked up the hotspot's whole intensity on top of the daylight already
    // on it and clipped: the debris inside the last capture's blast was a
    // scatter of small white rectangles, which reads as a rendering fault
    // rather than as rubble.
    color = vColor * (uAmbient * 0.7 + uSunColor * (0.08 + 0.85 * ndl))
          + vColor * min(vHot, vec3(1.4)) * 0.45;
    softness = 0.6;
  } else if (kind == 4) {
    // ---- blood ----------------------------------------------------------
    if (rr > 1.04) discard;
    vec4 tx = puff(vUv);
    float bite = 0.22 + age * 0.30;
    float d = clamp((tx.r - bite * (1.0 - tx.a * 0.6)) / max(1.0 - bite, 0.12), 0.0, 1.0);
    // Blood breaks into droplets rather than dispersing like smoke — but only
    // at droplet scale. The same threshold applied to the gout at the wound tore
    // an eight-pixel mass into three-pixel fragments, and measured off a capture
    // at five metres the wound came back within a few values of the wall behind
    // it: the one part of this effect that has to carry a hit at range was
    // eroded away before it reached the frame, leaving nothing but the thin
    // cast-off threads, which read as scratches on the scenery.
    //
    // Liquid holds together in proportion to how much of it there is, so the
    // threshold relaxes with the sprite's own size. Cast-off stays crisp and
    // separate; the mass at the wound stays a mass.
    float coh = smoothstep(0.030, 0.075, vSize);
    d = smoothstep(mix(0.12, 0.02, coh), mix(0.55, 0.28, coh), d);
    alpha *= d;
    if (alpha < 0.004) discard;
    vec3 n = normalize(vec3(p * 2.0, sqrt(max(1.0 - r2, 0.03))));
    float ndl = max(dot(n, uSunView), 0.0);
    // Wet, so part of what you see is a specular highlight on a dark body.
    // The highlight is the one term here not multiplied by the blood's own
    // colour, so it has to stay small: at half the sun's radiance a droplet
    // catching the light went white, and a spray of white dots downrange of a
    // hit reads as sparks rather than as blood.
    float spec = pow(ndl, 22.0);
    color = vColor * (uAmbient * 0.7 + uSunColor * (0.05 + 0.45 * ndl))
          + uSunColor * spec * 0.24;
    softness = 0.6;
  } else if (kind == 6) {
    // ---- ember -----------------------------------------------------------
    float g = exp(-r2 * 3.2);
    alpha *= g * flicker(seed, 26.0);
    if (alpha < 0.004) discard;
    color = vColor * uHdrUnit * emissive * (0.5 + 3.0 * g);
  } else if (kind == 10) {
    // ---- detonation core --------------------------------------------------
    //
    // Two or three frames of the frame being overexposed, which is the one
    // thing about an explosion a renderer cannot fake with colour: real film of
    // a charge going off has a couple of frames where the camera has simply run
    // out of range, and everything the eye reads as heat afterwards is read
    // relative to that. Without it the sequence starts at the fireball, and a
    // fireball on its own — however well graded — reads as something burning
    // rather than as something detonating.
    //
    // Shaped by the sprite's own billows rather than as a disc, and driven up
    // the same incandescence ramp the fireball uses so the two are the same
    // material at different temperatures. The centre clears display white by
    // two or three stops, which is what makes bloom respond, and the edge runs
    // out through gold into the fire behind it.
    vec4 tx = puff(vUv);
    float ero = mix(tx.b, tx.a, fract(seed * 4.19));
    float body = clamp((1.0 - smoothstep(0.18, 1.0, rr)) * (0.45 + 0.9 * tx.r) * 1.4, 0.0, 1.0);
    // Torn at the rim on the first frame, not just as it dies. A detonation
    // front is ragged from the instant it clears the casing.
    body *= clamp(1.35 - smoothstep(0.30, 1.02, rr + (ero - 0.5) * 0.55), 0.0, 1.0);
    alpha *= body;
    if (alpha < 0.004) discard;
    float hot = clamp(emissive * body * (0.55 + 0.75 * mix(tx.g, ero, 0.4)), 0.0, 1.0);
    color = heat(hot) * uHdrUnit;
  } else if (kind == 8) {
    // ---- ground shock ring ------------------------------------------------
    vec4 tx = puff(vUv);
    float ragged = rr + (tx.b - 0.5) * 0.26 + (tx.a - 0.5) * 0.12;
    float ring = smoothstep(0.50, 0.87, ragged) * (1.0 - smoothstep(0.89, 1.0, ragged));
    alpha *= ring * (0.5 + 0.5 * tx.r);
    if (alpha < 0.004) discard;
    color = vColor * (uAmbient + uSunColor * uSunUp * 0.6 * shade) + vColor * vHot;
    // Flat in the floor plane, like the ground dust. Exempt for the same
    // reason.
    softness = 0.0;
  } else {
    // ---- blast wave rim ----------------------------------------------------
    // Deliberately faint. A compression wave is a refraction, not a light
    // source; drawn as a bright additive shell it reads as a plastic dome, so
    // all this is allowed to be is a suggestion at the leading edge.
    float rim = smoothstep(0.76, 0.96, rr) * (1.0 - smoothstep(0.96, 1.02, rr));
    alpha *= rim * rim * rim;
    if (alpha < 0.004) discard;
    color = vColor * uHdrUnit * emissive;
  }

  // Soft particles. Without this a plume slices through the ground on a hard
  // line and every puff advertises that it is a flat quad.
  //
  // The fade width has to be the *sprite's own* thickness, and authoring it as
  // a per-kind constant is what made every ground-level effect in the game
  // invisible. The term is a linear ramp over a fixed depth clearance, so a
  // puff whose centre sits three centimetres above a road —
  // which is where a bullet impact and a blast's dust ring both are — clears
  // barely a tenth of a metre of depth at a grazing view angle and was
  // therefore drawn at a tenth of its authored alpha. Six strikes on an open
  // street photographed as faint smudges and the detonation's dust ring did
  // not appear at all, and both were diagnosed for three passes as a density
  // problem in the spawn code, which it was not.
  //
  // Scaling with size keeps the original intent — a two-metre plume still
  // feathers over most of a metre where it meets a wall — while a hand-sized
  // impact puff feathers over a hand's width. The floor stops the smallest
  // sprites from getting a hard edge back.
  //
  // Zero disables it, which the ground-aligned kinds ask for: their quads lie
  // *in* the surface by construction rather than intersecting it, so there is
  // no slice to hide and the only thing the fade can do is delete them.
  if (uHasDepth > 0.5 && softness > 0.0) {
    float sceneZ = texture2D(tDepth, gl_FragCoord.xy / uResolution).x;
    alpha *= clamp((sceneZ - vDepth) / (softness * max(vSize, 0.05)), 0.0, 1.0);
  }
  // And fade out anything about to intersect the near plane, so a puff drifting
  // past the camera never slaps the lens with a full-screen grey rectangle.
  alpha *= smoothstep(0.10, 0.45, vDepth);

  if (alpha < 0.004) discard;
  gl_FragColor = vec4(color, alpha);

  // Review instrumentation. 1 replaces every occluding particle with a black
  // silhouette, which answers "is the plume opaque" and "what shape is it"
  // without the shading in the way; 2 flat-shades by kind, which answers the
  // question that costs the most time to get wrong — which of the six systems
  // layered on one detonation is actually the thing in the picture.
  if (uAlphaProbe > 0.5) {
    if (uAlphaProbe > 2.5) {
      // Grey-card calibration. Smoke prints a known 0.18 scene-linear patch
      // and the fireball prints its own ramp coordinate, so the display value
      // of each can be read straight off the capture instead of being
      // predicted through an exposure meter and a tonemap.
      if (kind == 0) gl_FragColor = vec4(vec3(0.0, 0.0, 0.18), alpha);
      else if (kind == 5) gl_FragColor = vec4(vec3(vProbe, vProbe, 0.0), alpha);
      else gl_FragColor = vec4(0.0, 0.18, 0.0, alpha);
    } else if (uAlphaProbe < 1.5) {
      if (kind == 0 || kind == 5 || kind == 7) gl_FragColor = vec4(0.0, 0.0, 0.0, alpha);
    } else {
      vec3 tag = vec3(0.0, 1.0, 1.0);
      if (kind == 0) tag = vec3(1.0, 0.0, 0.0);
      else if (kind == 5) tag = vec3(0.0, 1.0, 0.0);
      else if (kind == 7) tag = vec3(0.0, 0.2, 1.0);
      else if (kind == 8) tag = vec3(1.0, 1.0, 0.0);
      else if (kind == 3) tag = vec3(1.0, 0.0, 1.0);
      else if (kind == 2) tag = vec3(1.0, 1.0, 1.0);
      else if (kind == 10) tag = vec3(0.0, 1.0, 1.0);
      gl_FragColor = vec4(tag * 0.5, alpha);
    }
  }
}
`;

export class ParticleField {
  private readonly capacity: number;
  private readonly live: Particle[] = [];
  private readonly pool: Particle[] = [];
  private readonly alphaList: Particle[] = [];
  private readonly addList: Particle[] = [];

  private alphaBucket!: Bucket;
  private addBucket!: Bucket;
  private readonly materials: THREE.ShaderMaterial[] = [];

  private readonly _v = new THREE.Vector3();
  private readonly _c = new THREE.Color();

  constructor(scene: THREE.Scene, capacity: number) {
    this.capacity = capacity;
    const sprite = puffTexture();
    this.alphaBucket = this.makeBucket(scene, sprite, THREE.NormalBlending, 500);
    this.addBucket = this.makeBucket(scene, sprite, THREE.AdditiveBlending, 502);
  }

  private makeBucket(
    scene: THREE.Scene,
    sprite: THREE.Texture,
    blending: THREE.Blending,
    renderOrder: number,
  ): Bucket {
    const geo = new THREE.InstancedBufferGeometry();
    geo.setAttribute(
      'position',
      new THREE.BufferAttribute(
        new Float32Array([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0]),
        3,
      ),
    );
    geo.setAttribute(
      'uv',
      new THREE.BufferAttribute(new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]), 2),
    );
    geo.setIndex([0, 1, 2, 0, 2, 3]);

    const mk = (n: number): THREE.InstancedBufferAttribute => {
      const a = new THREE.InstancedBufferAttribute(new Float32Array(this.capacity * n), n);
      a.setUsage(THREE.DynamicDrawUsage);
      return a;
    };
    const posSize = mk(FLOATS.posSize);
    const color = mk(FLOATS.color);
    const params = mk(FLOATS.params);
    const extra = mk(FLOATS.extra);
    const vel = mk(FLOATS.vel);
    geo.setAttribute('iPosSize', posSize);
    geo.setAttribute('iColor', color);
    geo.setAttribute('iParams', params);
    geo.setAttribute('iExtra', extra);
    geo.setAttribute('iVel', vel);
    geo.instanceCount = 0;
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);

    const hotPos: THREE.Vector4[] = [];
    const hotColor: THREE.Color[] = [];
    for (let i = 0; i < MAX_HOTSPOTS; i++) {
      hotPos.push(new THREE.Vector4(0, 0, 0, 0));
      hotColor.push(new THREE.Color(0, 0, 0));
    }

    const mat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending,
      side: THREE.DoubleSide,
      uniforms: {
        tSprite: { value: sprite },
        tDepth: { value: null },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uSunView: { value: new THREE.Vector3(0, 1, 0) },
        uSunWorld: { value: new THREE.Vector3(0, 1, 0) },
        uSunColor: { value: new THREE.Color(1, 1, 1) },
        uAmbient: { value: new THREE.Color(0.2, 0.24, 0.3) },
        uSunUp: { value: 0.5 },
        uHdrUnit: { value: 2 },
        uTime: { value: 0 },
        uHasDepth: { value: 0 },
        uAlphaProbe: { value: probeMode() },
        uOnlyKind: { value: onlyKind() },
        uHotPos: { value: hotPos },
        uHotColor: { value: hotColor },
      },
    });
    this.materials.push(mat);

    const mesh = new THREE.Mesh(geo, mat);
    mesh.frustumCulled = false;
    mesh.renderOrder = renderOrder;
    mesh.name = blending === THREE.AdditiveBlending ? 'particles-add' : 'particles-alpha';
    // The overhead sky-occlusion bake must not see a puff of smoke as a roof.
    mesh.userData.noSkyMask = true;
    scene.add(mesh);

    return { mesh, geo, posSize, color, params, extra, vel, count: 0 };
  }

  get count(): number {
    return this.live.length;
  }

  countOf(kind: number): number {
    let n = 0;
    for (const p of this.live) if (p.kind === kind && p.delay <= 0) n++;
    return n;
  }

  /**
   * Hides both buckets. Used to keep particles out of the normal prepass: an
   * override material turns every smoke quad into an opaque normal-writing
   * surface, and the occlusion pass then shades the world as if a puff of dust
   * were a wall standing in front of it.
   */
  setVisible(visible: boolean): void {
    this.alphaBucket.mesh.visible = visible;
    this.addBucket.mesh.visible = visible;
  }

  spawn(spec: SpawnSpec): Particle | null {
    if (this.live.length >= this.capacity) {
      // Recycle the oldest smoke before dropping the request: one fewer dust
      // puff is invisible, a missing muzzle flash is not.
      let victim = -1;
      let worst = -1;
      for (let i = 0; i < this.live.length; i++) {
        const q = this.live[i];
        if (q.kind !== PKind.Smoke && q.kind !== PKind.GroundDust) continue;
        const age = 1 - q.life / q.maxLife;
        if (age > worst) { worst = age; victim = i; }
      }
      if (victim < 0) return null;
      const dead = this.live[victim];
      this.live.splice(victim, 1);
      dead.active = false;
      this.pool.push(dead);
    }

    const p = this.pool.pop() ?? {
      active: false, delay: 0, life: 1, maxLife: 1,
      pos: new THREE.Vector3(), vel: new THREE.Vector3(),
      size: 1, grow: 0, rot: 0, rotSpeed: 0,
      color: new THREE.Color(), colorEnd: new THREE.Color(),
      opacity: 1, drag: 1, gravity: 0, buoyancy: 0,
      kind: 0, collides: false, turbulence: 0, emissive: 0,
      seed: 0, shade: 1, shadeEnd: 1, stretch: 0, fadeIn: 0.05, fadePow: 1.6, key: 0,
    };

    p.active = true;
    p.delay = spec.delay ?? 0;
    p.maxLife = spec.maxLife ?? 1;
    p.life = p.maxLife;
    p.pos.copy(spec.position);
    if (spec.velocity) p.vel.copy(spec.velocity); else p.vel.setScalar(0);
    p.size = spec.size ?? 0.2;
    p.grow = spec.grow ?? 0;
    p.rot = spec.rotation ?? Math.random() * Math.PI * 2;
    p.rotSpeed = spec.rotationSpeed ?? 0;
    if (spec.color) p.color.copy(spec.color); else p.color.setRGB(1, 1, 1);
    if (spec.colorEnd) p.colorEnd.copy(spec.colorEnd); else p.colorEnd.copy(p.color);
    p.opacity = spec.opacity ?? 1;
    p.drag = spec.drag ?? 1.2;
    p.gravity = spec.gravity ?? 0;
    p.buoyancy = spec.buoyancy ?? 0;
    p.kind = spec.kind ?? PKind.Smoke;
    p.collides = spec.collides ?? false;
    p.turbulence = spec.turbulence ?? 0;
    p.emissive = spec.emissive ?? 0;
    p.seed = Math.random();
    p.shade = spec.shade ?? 1;
    p.shadeEnd = spec.shadeEnd ?? p.shade;
    p.stretch = spec.stretch ?? 0;
    p.fadeIn = spec.fadeIn ?? 0.06;
    p.fadePow = spec.fadePow ?? 1.6;
    this.live.push(p);
    return p;
  }

  /** Runs the simulation. `trace` is optional world collision for debris. */
  simulate(
    dt: number,
    elapsed: number,
    wind: THREE.Vector3,
    trace: ((from: THREE.Vector3, dir: THREE.Vector3, len: number) => {
      hit: boolean; point: THREE.Vector3; normal: THREE.Vector3;
    }) | null,
  ): void {
    const v = this._v;
    for (let i = this.live.length - 1; i >= 0; i--) {
      const p = this.live[i];

      if (p.delay > 0) {
        p.delay -= dt;
        continue;
      }

      p.life -= dt;
      if (p.life <= 0) {
        this.live.splice(i, 1);
        p.active = false;
        this.pool.push(p);
        continue;
      }

      const t = 1 - p.life / p.maxLife;

      p.vel.y -= p.gravity * dt;
      if (p.buoyancy !== 0) {
        // Hot gas rises hard and then stops as it mixes with cold air, which
        // is why a fireball leaps and a smoke column merely drifts up.
        p.vel.y += p.buoyancy * (1 - t) * (1 - t) * dt;
      }
      const damp = Math.max(0, 1 - p.drag * dt);
      p.vel.multiplyScalar(damp);

      if (p.turbulence > 0) {
        const s = p.seed * 37.4;
        const tt = elapsed * 1.15;
        const k = p.turbulence * dt * 2.2;
        p.vel.x += (Math.sin(tt * 1.7 + p.pos.y * 1.9 + s) + Math.sin(tt * 0.71 + p.pos.z * 1.1 - s)) * k;
        p.vel.z += (Math.cos(tt * 1.31 + p.pos.y * 2.1 - s) + Math.cos(tt * 0.83 + p.pos.x * 1.3 + s)) * k;
        p.vel.y += Math.sin(tt * 0.93 + p.pos.x * 1.7 + s * 1.3) * k * 0.35;
        p.vel.addScaledVector(wind, p.turbulence * dt * 0.55);
      }

      if (p.collides && trace) {
        v.copy(p.vel).multiplyScalar(dt);
        const len = v.length();
        if (len > 1e-5) {
          v.divideScalar(len);
          const hit = trace(p.pos, v, len + 0.02);
          if (hit.hit) {
            p.pos.copy(hit.point).addScaledVector(hit.normal, 0.012);
            const vn = p.vel.dot(hit.normal);
            p.vel.addScaledVector(hit.normal, -vn * 1.45);
            p.vel.multiplyScalar(0.4);
            p.rotSpeed *= 0.45;
          } else {
            p.pos.addScaledVector(v, len);
          }
        }
      } else {
        p.pos.addScaledVector(p.vel, dt);
      }

      p.rot += p.rotSpeed * dt;
      if (p.grow !== 0) p.size = Math.max(0.002, p.size + p.grow * dt);
    }
  }

  /** Writes both instance buffers. Must run after `simulate`. */
  publish(camera: THREE.Camera): void {
    const cam = camera.position;
    this.alphaList.length = 0;
    this.addList.length = 0;

    for (const p of this.live) {
      if (p.delay > 0) continue;
      if (isAdditive(p.kind)) this.addList.push(p);
      else {
        p.key = p.pos.distanceToSquared(cam);
        this.alphaList.push(p);
      }
    }
    // Back-to-front. Only the alpha bucket needs it; additive is
    // order-independent by construction.
    this.alphaList.sort((a, b) => b.key - a.key);

    this.fill(this.alphaBucket, this.alphaList);
    this.fill(this.addBucket, this.addList);
  }

  private fill(bucket: Bucket, list: Particle[]): void {
    const n = Math.min(list.length, this.capacity);
    const ps = bucket.posSize.array as Float32Array;
    const co = bucket.color.array as Float32Array;
    const pa = bucket.params.array as Float32Array;
    const ex = bucket.extra.array as Float32Array;
    const ve = bucket.vel.array as Float32Array;

    for (let i = 0; i < n; i++) {
      const p = list[i];
      const t = 1 - p.life / p.maxLife;

      ps[i * 4] = p.pos.x;
      ps[i * 4 + 1] = p.pos.y;
      ps[i * 4 + 2] = p.pos.z;
      ps[i * 4 + 3] = p.size;

      this._c.copy(p.color).lerp(p.colorEnd, t);
      co[i * 3] = this._c.r;
      co[i * 3 + 1] = this._c.g;
      co[i * 3 + 2] = this._c.b;

      const fadeIn = p.fadeIn > 0 ? Math.min((t * p.maxLife) / p.fadeIn, 1) : 1;
      const fadeOut = 1 - Math.pow(t, p.fadePow);
      pa[i * 4] = p.opacity * fadeIn * fadeOut;
      pa[i * 4 + 1] = p.kind;
      pa[i * 4 + 2] = p.rot;
      pa[i * 4 + 3] = p.emissive;

      ex[i * 4] = p.seed;
      ex[i * 4 + 1] = p.shade + (p.shadeEnd - p.shade) * t;
      ex[i * 4 + 2] = p.stretch > 0 ? p.stretch * Math.min(1, p.vel.length() * 0.08) : 0;
      ex[i * 4 + 3] = t;

      ve[i * 3] = p.vel.x;
      ve[i * 3 + 1] = p.vel.y;
      ve[i * 3 + 2] = p.vel.z;
    }

    bucket.geo.instanceCount = n;
    if (n > 0) {
      bucket.posSize.needsUpdate = true;
      bucket.color.needsUpdate = true;
      bucket.params.needsUpdate = true;
      bucket.extra.needsUpdate = true;
      bucket.vel.needsUpdate = true;
      bucket.posSize.addUpdateRange(0, n * 4);
      bucket.color.addUpdateRange(0, n * 3);
      bucket.params.addUpdateRange(0, n * 4);
      bucket.extra.addUpdateRange(0, n * 4);
      bucket.vel.addUpdateRange(0, n * 3);
    }
    bucket.count = n;
  }

  setUniforms(u: {
    depth: THREE.Texture | null;
    width: number;
    height: number;
    sunWorld: THREE.Vector3;
    sunView: THREE.Vector3;
    sunColor: THREE.Color;
    ambient: THREE.Color;
    hdrUnit: number;
    time: number;
    hotspots: HotSpot[];
  }): void {
    for (const mat of this.materials) {
      const uf = mat.uniforms;
      uf.tDepth.value = u.depth;
      uf.uHasDepth.value = u.depth ? 1 : 0;
      (uf.uResolution.value as THREE.Vector2).set(u.width, u.height);
      (uf.uSunWorld.value as THREE.Vector3).copy(u.sunWorld);
      (uf.uSunView.value as THREE.Vector3).copy(u.sunView);
      (uf.uSunColor.value as THREE.Color).copy(u.sunColor);
      (uf.uAmbient.value as THREE.Color).copy(u.ambient);
      uf.uSunUp.value = Math.max(u.sunWorld.y, 0.05);
      uf.uHdrUnit.value = u.hdrUnit;
      uf.uTime.value = u.time;

      const hp = uf.uHotPos.value as THREE.Vector4[];
      const hc = uf.uHotColor.value as THREE.Color[];
      for (let i = 0; i < MAX_HOTSPOTS; i++) {
        const h = u.hotspots[i];
        if (!h) {
          hp[i].set(0, 0, 0, 0);
          hc[i].setRGB(0, 0, 0);
          continue;
        }
        hp[i].set(h.position.x, h.position.y, h.position.z, h.radius);
        hc[i].copy(h.color).multiplyScalar(h.intensity);
      }
    }
  }

  dispose(): void {
    this.alphaBucket.geo.dispose();
    this.addBucket.geo.dispose();
    for (const m of this.materials) m.dispose();
  }
}
