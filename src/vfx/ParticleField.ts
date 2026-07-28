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
  return kind === PKind.Spark || kind === PKind.Flash || kind === PKind.Ember || kind === PKind.Blast;
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
  vec3 c = vec3(0.030, 0.0015, 0.0000);
  c = mix(c, vec3(0.110, 0.0030, 0.0000), smoothstep(0.01, 0.07, t));
  c = mix(c, vec3(0.310, 0.0090, 0.0000), smoothstep(0.06, 0.19, t));
  c = mix(c, vec3(0.560, 0.0450, 0.0000), smoothstep(0.17, 0.34, t));
  c = mix(c, vec3(0.880, 0.1900, 0.0000), smoothstep(0.32, 0.52, t));
  c = mix(c, vec3(1.550, 0.6400, 0.0040), smoothstep(0.50, 0.70, t));
  c = mix(c, vec3(3.400, 2.0500, 0.1600), smoothstep(0.68, 0.86, t));
  c = mix(c, vec3(9.500, 7.6000, 2.4000), smoothstep(0.86, 1.00, t));
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
  return uSunColor * ((direct * 0.78 + multi * 0.14 + fwd) * shade)
       + uAmbient * (sky * mix(0.38, 1.0, shade));
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
  float softness = 0.09;

  if (kind == 0 || kind == 7) {
    // ---- smoke and dust ------------------------------------------------
    if (rr > 1.04) discard;
    vec4 tx = puff(vUv);
    float ero = mix(tx.b, tx.a, fract(seed * 3.71));
    // Dissipation eats the silhouette from the outside in along the erosion
    // field, so a puff tears into rags instead of shrinking as a disc.
    float bite = age * 0.66;
    float d = clamp((tx.r - bite * (1.0 - ero * 0.82)) / max(1.0 - bite, 0.10), 0.0, 1.0);
    alpha *= d;
    if (alpha < 0.004) discard;

    float thick = tx.g;
    float dens = 0.55 + 1.75 * vParams.x;
    float facing = dot(p * 2.0, vSun2);
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
    softness = 0.85;
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
    float t = emissive * pow(max(1.0 - age, 0.0), 2.1) * (0.45 + 0.75 * core) * (0.80 + 0.40 * tx.a);
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
    color = fire * uHdrUnit
          + (soot + vColor * vHot * 0.6) * (1.0 - smoothstep(0.015, 0.22, t));
    softness = 0.55;
  } else if (kind == 1) {
    // ---- tracer spark --------------------------------------------------
    float head = vUv.x;
    float across = abs(vUv.y - 0.5) * 2.0;
    float body = pow(clamp(head, 0.0, 1.0), 2.4) * (1.0 - smoothstep(0.15, 1.0, across));
    alpha *= body * flicker(seed, 58.0);
    if (alpha < 0.004) discard;
    color = vColor * uHdrUnit * emissive * (0.45 + 5.0 * pow(head, 8.0));
  } else if (kind == 2) {
    // ---- muzzle / impact flash ------------------------------------------
    float ang = atan(p.y, p.x);
    float sd = fract(seed * 17.13) * 6.2831;
    // Three decorrelated harmonics: a real flash is a lopsided star whose
    // arms follow the porting of the brake, never a symmetric asterisk.
    // Broad petals rather than needles. Powers of five and eight produce arms
    // one or two pixels wide reaching the edge of the quad, which photographs
    // as an anamorphic lens flare stuck on the barrel — the thing a muzzle
    // flash is least like. Real porting throws three or four short, fat lobes.
    // The hub is small and the arms are long. A base radius of a third of the
    // quad meant the disc under the star was most of its area, so however the
    // harmonics were shaped the thing photographed as a blob with a scalloped
    // edge; the arms have to be the majority of the silhouette or there is no
    // star in the picture.
    float spikes = 0.24
      + 0.34 * pow(abs(cos(ang * 2.0 + sd)), 1.4)
      + 0.22 * pow(abs(cos(ang * 3.0 - sd * 1.7)), 2.2)
      + 0.13 * pow(abs(cos(ang * 5.0 + sd * 0.6)), 3.0);
    float core = 1.0 - smoothstep(0.0, spikes, rr);
    // The halo has to reach zero *inside* the quad. An exponential still has
    // nine per cent of its peak left at the corner, and nine per cent of a
    // flash is well clear of black, so the sprite's own boundary was drawn as
    // a hard-edged luminous disc around every shot — a perfect circle in the
    // middle of the frame, which is the most artificial mark a renderer can
    // leave.
    float glow = exp(-r2 * 3.0) * (1.0 - smoothstep(0.40, 1.0, rr));
    alpha *= clamp(core + glow * 0.7, 0.0, 1.0);
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
    float hub = 1.0 - smoothstep(0.0, spikes * 0.46, rr);
    float temp = clamp((hub * 0.88 + core * 0.28) * (0.62 + 0.38 * hotness), 0.0, 1.0);
    color = heat(0.34 + 0.66 * temp) * uHdrUnit * 3.2;
  } else if (kind == 3) {
    // ---- debris chunk ---------------------------------------------------
    vec4 tx = puff(vUv);
    float m = step(rr, 0.52 + (tx.b - 0.5) * 0.66);
    alpha *= m;
    if (alpha < 0.004) discard;
    // A tumbling chip is mostly in its own shadow; the flat term keeps it from
    // going to pure black against a bright street.
    vec3 n = normalize(vec3(p * 2.0, 0.9));
    float ndl = max(dot(n, uSunView), 0.0);
    color = vColor * (uAmbient * 0.7 + uSunColor * (0.08 + 0.85 * ndl)) + vColor * vHot;
    softness = 0.05;
  } else if (kind == 4) {
    // ---- blood ----------------------------------------------------------
    if (rr > 1.04) discard;
    vec4 tx = puff(vUv);
    float bite = 0.22 + age * 0.30;
    float d = clamp((tx.r - bite * (1.0 - tx.a * 0.6)) / max(1.0 - bite, 0.12), 0.0, 1.0);
    // Blood breaks into droplets rather than dispersing like smoke.
    d = smoothstep(0.12, 0.55, d);
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
    softness = 0.25;
  } else if (kind == 6) {
    // ---- ember -----------------------------------------------------------
    float g = exp(-r2 * 3.2);
    alpha *= g * flicker(seed, 26.0);
    if (alpha < 0.004) discard;
    color = vColor * uHdrUnit * emissive * (0.5 + 3.0 * g);
  } else if (kind == 8) {
    // ---- ground shock ring ------------------------------------------------
    vec4 tx = puff(vUv);
    float ragged = rr + (tx.b - 0.5) * 0.26 + (tx.a - 0.5) * 0.12;
    float ring = smoothstep(0.50, 0.87, ragged) * (1.0 - smoothstep(0.89, 1.0, ragged));
    alpha *= ring * (0.5 + 0.5 * tx.r);
    if (alpha < 0.004) discard;
    color = vColor * (uAmbient + uSunColor * uSunUp * 0.6 * shade) + vColor * vHot;
    softness = 0.6;
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
  if (uHasDepth > 0.5) {
    float sceneZ = texture2D(tDepth, gl_FragCoord.xy / uResolution).x;
    alpha *= clamp((sceneZ - vDepth) / softness, 0.0, 1.0);
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
