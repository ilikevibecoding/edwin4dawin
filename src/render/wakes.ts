import * as THREE from 'three';
import { clamp, smoothstep } from '../core/noise';

/** tan(19.47 deg): half-angle of the Kelvin wake envelope */
const TAN_KELVIN = 0.3536;
/** an emitter off the surface longer than this (s) has skipped: its lane breaks there rather than bridging the hop */
const GAP_DRY_S = 0.5;

/**
 * Surface drift applied to laid wake foam (m/s, world xz): wind-driven surface current plus Stokes drift, about
 * 3 % of the wind speed. Set by whoever knows the wind (the aircraft's effects) so traffic.ts need not; the trails
 * advect their laid points by it, so foam patches slide slowly downwind instead of staying nailed to the track.
 */
export const WAKE_DRIFT = { x: 0, z: 0 };

/**
 * Top-down render targets holding foam (R) and surface slope (GB, 0.5 = flat) for boat and float wakes.
 * Anything that disturbs the water is a ribbon of the shared WakeBatch (one draw per map):
 *  - the far map covers a few kilometres around the camera at ~1.6 m per texel (boat wakes from altitude),
 *  - the mid map covers a few hundred metres ahead of the camera at ~0.4 m per texel: a runabout's lane is
 *    two far-map texels wide and drew as a soft stripe from anywhere near the water; this map carries the
 *    froth patches, dark windows and arm crests of the boats the player is flying past,
 *  - the near map covers the water around the aircraft at a few centimetres per texel, so the bow wave,
 *    waterline foam and fresh float wake survive the close aircraft views instead of blurring into a smear.
 * The water shader samples the near map where it is defined, the mid map inside its region and the far map
 * elsewhere. A second draw per map holds the impact splats (SplatBatch): the depression, ring waves and
 * whitewater of a hull slapping the water.
 */
export class WakeMap {
  readonly rt: THREE.WebGLRenderTarget;
  readonly midRt: THREE.WebGLRenderTarget;
  readonly nearRt: THREE.WebGLRenderTarget;
  /** signed surface elevation of the hull wave systems over the near region (R up, G down, metres / HEIGHT_SCALE) */
  readonly heightRt: THREE.WebGLRenderTarget;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.OrthographicCamera;
  readonly midCamera: THREE.OrthographicCamera;
  readonly nearCamera: THREE.OrthographicCamera;
  readonly center = new THREE.Vector2();
  readonly midCenter = new THREE.Vector2();
  readonly nearCenter = new THREE.Vector2();
  readonly size: number;
  readonly midSize: number;
  readonly nearSize: number;
  private readonly texel: number;
  private readonly midTexel: number;
  private readonly nearTexel: number;
  readonly heightTexel: number;
  /** every wake ribbon (boats, floats) in one draw; trails are created with it as their target */
  readonly batch = new WakeBatch();
  /** impact splats (touchdown slaps, ditching contacts), one instanced draw per map */
  readonly splats: SplatBatch;

  constructor(resolution = 1024, size = 3200, nearResolution = 1024, nearSize = 64, heightResolution = 512, midResolution = 1024, midSize = 400) {
    this.size = size;
    this.midSize = midSize;
    this.nearSize = nearSize;
    this.texel = size / resolution;
    this.midTexel = midSize / midResolution;
    this.nearTexel = nearSize / nearResolution;
    this.heightTexel = nearSize / heightResolution;
    const make = (res: number, mips: boolean, type: THREE.TextureDataType = THREE.UnsignedByteType) => {
      const rt = new THREE.WebGLRenderTarget(res, res, { type, depthBuffer: false, minFilter: mips ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: mips });
      rt.texture.wrapS = rt.texture.wrapT = THREE.ClampToEdgeWrapping;
      return rt;
    };
    // the far map is minified from altitude (a texel-wide arm falls between pixel centres and reads as a dashed
    // line without mipmaps); the near map is only ever magnified
    this.rt = make(resolution, true);
    // the mid map is minified from altitude too (the region is right under a high camera)
    this.midRt = make(midResolution, true);
    this.nearRt = make(nearResolution, false);
    // the height field is smooth at the decimetre scale (bow hump, hollow, rooster tail): a quarter of the near
    // map's texels, sampled by the water patch's vertices and finite-differenced for its normal. Half float: in
    // 8 bits a metre of range had 4 mm steps, and the 5 cm transverse train behind a taxiing float (8 mm between
    // the two texels of the normal's difference) decoded to a 0.9 deg slope staircase, or to nothing
    this.heightRt = make(heightResolution, false, THREE.HalfFloatType);
    this.camera = new THREE.OrthographicCamera(-size / 2, size / 2, size / 2, -size / 2, 1, 400);
    this.camera.up.set(0, 0, -1);
    this.midCamera = new THREE.OrthographicCamera(-midSize / 2, midSize / 2, midSize / 2, -midSize / 2, 1, 400);
    this.midCamera.up.set(0, 0, -1);
    this.nearCamera = new THREE.OrthographicCamera(-nearSize / 2, nearSize / 2, nearSize / 2, -nearSize / 2, 1, 400);
    this.nearCamera.up.set(0, 0, -1);
    this.splats = new SplatBatch();
    this.batch.splats = this.splats;
    this.scene.add(this.batch.mesh, this.splats.mesh);
  }

  get texture(): THREE.Texture { return this.rt.texture; }
  get midTexture(): THREE.Texture { return this.midRt.texture; }
  get nearTexture(): THREE.Texture { return this.nearRt.texture; }
  get heightTexture(): THREE.Texture { return this.heightRt.texture; }

  /** Render the maps: the far one around the camera, the mid one ahead of it (along the camera's horizontal
   *  view direction (fwdX, fwdZ), so the region covers the water in front of the lens rather than behind it),
   *  the near foam/slope map and the height field around (nearX, nearZ), the aircraft. Four draws of the one
   *  batch (plus the splats). */
  render(renderer: THREE.WebGLRenderer, camX: number, camZ: number, nearX = camX, nearZ = camZ, fwdX = 0, fwdZ = 0): void {
    this.batch.upload();
    this.splats.upload();
    this.center.set(Math.round(camX / 8) * 8, Math.round(camZ / 8) * 8);
    const mt = this.midTexel, ahead = this.midSize * 0.3;
    this.midCenter.set(Math.round((camX + fwdX * ahead) / mt) * mt, Math.round((camZ + fwdZ * ahead) / mt) * mt);
    const nt = this.nearTexel;
    this.nearCenter.set(Math.round(nearX / nt) * nt, Math.round(nearZ / nt) * nt);
    const prev = renderer.getRenderTarget();
    const prevClear = renderer.getClearColor(new THREE.Color());
    const prevAlpha = renderer.getClearAlpha();
    renderer.setClearColor(0x008080, 0);
    this.pass(renderer, this.rt, this.camera, this.center, this.texel);
    this.pass(renderer, this.midRt, this.midCamera, this.midCenter, mt);
    this.pass(renderer, this.nearRt, this.nearCamera, this.nearCenter, nt);
    renderer.setClearColor(0x000000, 0);
    this.batch.useHeight(true);
    this.splats.useHeight(true);
    this.pass(renderer, this.heightRt, this.nearCamera, this.nearCenter, this.heightTexel);
    this.batch.useHeight(false);
    this.splats.useHeight(false);
    renderer.setClearColor(prevClear, prevAlpha);
    renderer.setRenderTarget(prev);
  }

  private pass(renderer: THREE.WebGLRenderer, rt: THREE.WebGLRenderTarget, cam: THREE.OrthographicCamera, c: THREE.Vector2, texel: number): void {
    cam.position.set(c.x, 200, c.y);
    cam.lookAt(c.x, 0, c.y);
    cam.updateMatrixWorld();
    this.batch.setTexel(texel);
    this.splats.setTexel(texel);
    renderer.setRenderTarget(rt);
    renderer.clear(true, false, false);
    renderer.render(this.scene, cam);
  }
}

/** GLSL shared by the ribbon passes: hashes, value noise, the hull waterline. */
const WAKE_GLSL_COMMON = /* glsl */ `
  const float TANK = ${TAN_KELVIN};
  // lattice hash without sin(): the sin-based hash loses its precision on world coordinates in the
  // thousands and turned into per-texel static in the centimetre map (a 1 km period keeps the input small)
  float h21(vec2 q) { q = mod(q, 1024.0); vec3 p3 = fract(vec3(q.xyx) * vec3(0.1031, 0.1030, 0.0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
  float vn(vec2 q) { vec2 i = floor(q), f = fract(q); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
  // waterline half-beam of a hull at 'ax' metres behind its bow (fullest a little aft of midships)
  float hullHalfBeam(float ax, float w0, float len) {
    float u = clamp(ax / len, 0.0, 1.0);
    float bow = 1.0 - pow(1.0 - smoothstep(0.0, 0.55, u), 1.6);
    float stern = 1.0 - 0.35 * smoothstep(0.7, 1.0, u);
    return w0 * bow * stern;
  }
  float g1(float x, float w) { return exp(-x * x / (w * w)); }
`;

const WAKE_VERTEX = /* glsl */ `
  attribute vec4 aA;      // age (0 fresh .. 1 old), side (-1 .. 1 across), fade (0 at a gap), speed (m/s; < 0 over the hull of a hull going astern)
  attribute vec4 aGeom;   // distance behind the transom (m), signed across-position of the vertex (m, + to the right), travel direction xz
  attribute vec4 aExt;    // path curvature (1/m, + turning toward +right), age (s), stern-wave advance (m), odometer (m along the track)
  attribute vec4 aTrail;  // strength, hull half-beam (m), transom-to-bow length (m), lane length (m)
  attribute vec4 aTrail2; // prop wash (0..1), planing speed (m/s), churn (foam persistence), immersion (0 at the hull's waterline .. 1 decks awash)
  attribute vec4 aTrail3; // live: running draft of the forebody keel (m), sink rate into the surface (m/s); per vertex: the same two when this point was laid
  varying vec4 vA; varying vec4 vGeom; varying vec4 vExt; varying vec2 vWp; varying vec2 vPt; flat varying vec4 vTrail; flat varying vec4 vTrail2;
  void main() { vA = aA; vGeom = aGeom; vExt = aExt; vTrail = aTrail; vTrail2 = aTrail2; vPt = aTrail3.zw; vWp = position.xz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;

/**
 * Wake ribbon shader. The ribbon of a hull runs from a little ahead of its bow to the end of its trail;
 * per vertex it carries the distance behind the transom (negative over the hull), the ribbon half-width,
 * the travel direction, age, side, fade, the speed at emission, the path curvature, the odometer reading
 * (metres the emitter had travelled when the point was laid: a track-aligned coordinate that is fixed in the
 * world and continuous through turns, which world-projected coordinates were not) and the stern-wave advance;
 * per trail the strength, the hull's half-beam, the transom-to-bow length, the lane length, the prop wash,
 * the planing speed and the churn. Output: r = foam, gb = surface gradient (0.5 flat), a = coverage.
 *
 * Zones, each with its own look:
 *  - bow wave: a compact curl of foam wrapping the stem and a thin translucent sheet sweeping aft along the
 *    forward hull, whole only once the bow wave really breaks;
 *  - Kelvin arms: crest lines (slope) at 19.5 deg from the track; foam only in the patches where the crest
 *    breaks, i.e. near the hull and fading with the crest's steepness; in a turn the inner arm crowds the
 *    track and the outer one spreads;
 *  - stern turbulence: a churned lane about a beam wide spreading like a turbulent wake, its froth densest and
 *    most continuous in the first hull lengths, thinning downstream, densest at the centre and ragged at its
 *    wandering edges, with windows of dark water inside it;
 *  - prop wash: a bubbly core half a beam wide on the centreline right behind a powered hull;
 *  - persistence: sparse large patches remain along the track after the lane's froth has dissolved, fading
 *    with age and the hull's churn;
 *  - transverse stern waves (slope, wavelength 2 pi v^2 / g) that keep travelling at their own speed when the
 *    hull slows, overtaking a stopping hull.
 */
export const WAKE_MATERIAL = new THREE.ShaderMaterial({
  vertexShader: WAKE_VERTEX,
  fragmentShader: /* glsl */ `
    varying vec4 vA; varying vec4 vGeom; varying vec4 vExt; varying vec2 vWp; varying vec2 vPt; flat varying vec4 vTrail; flat varying vec4 vTrail2;
    uniform float uTexel;   // metres per texel of the map being rendered
    const float COSK = 0.9428, SINK = 0.3333;
    ${WAKE_GLSL_COMMON}
    void main() {
      float age = vA.x, side = vA.y, fade = vA.z, speed = vA.w;
      float d = vGeom.x;
      vec2 fwd = normalize(vGeom.zw);
      vec2 right = vec2(-fwd.y, fwd.x);           // side +1 of the ribbon
      float curv = vExt.x, ageS = vExt.y, shift = vExt.z, odo = vExt.w;
      float strength = vTrail.x, w0 = vTrail.y, lead = vTrail.z;
      float propWash = vTrail2.x, planeV = max(vTrail2.y, 1.0), churn = vTrail2.z;
      // how far the hull ran below its planing draft where this water was laid (the head carries the live
      // values): 0 riding at ~8 cm, 1 driven 40 cm under (a touchdown)
      float dk = smoothstep(0.08, 0.4, vPt.x);
      float sinkK = clamp(vPt.y / 3.0, 0.0, 1.0);
      float aspd = abs(speed);
      // the churned lane lasts a few tens of seconds of foam, so its length scales with the speed it was laid at
      float laneLen = vTrail.w * clamp(aspd / 8.0, 0.5, 1.6);
      // the froth is a matter of time, not of track: a point laid ageS seconds ago by a hull then making aspd
      // would lie aspd * ageS behind a hull that had kept going, and every decay below is written in that
      // distance. Behind a hull that has slowed or stopped the track distance d falls short of it, so the churn
      // just astern of a stopped boat kept its transom density (d ~ 0) for the ribbon's whole life instead of
      // dissolving in the 10-15 s it takes, and its slick never let go of the hull (r9)
      float dEq = max(d, aspd * ageS);
      // signed metres across the track, carried per vertex (the two sides of a turning ribbon differ in width)
      float y = vGeom.y;
      float ay = abs(y);
      float s = y < 0.0 ? -1.0 : 1.0;
      float life = 1.0 - age;
      float spd = smoothstep(0.6, 5.0, aspd);      // how hard the hull is pushing water
      // froth needs breaking water: a hull at taxi speed leaves a smooth turbulent lane with a few streaks of
      // foam, a hull at 8 m/s and more a white one (the prop wash and the bow curl have their own gates)
      float froth = smoothstep(2.0, 8.0, aspd);
      float planing = smoothstep(planeV * 0.75, planeV * 1.25, aspd);
      float fine = 1.0 - smoothstep(0.25, 1.2, uTexel);   // 1 in the centimetre map, 0 in the metre map
      // finest useful noise frequency: a period of 5 texels of this map (thresholded at 3 texels the froth
      // patches magnified into texel-aligned blocks, r3 100 m view)
      float fl = 0.2 / uTexel;
      float hullScale = 0.6 + 0.4 * min(w0, 2.0);
      // world-anchored breakup so foam reads as churned patches, never a chalk line
      float n1 = vn(vWp * 0.35), n2 = vn(vWp * min(1.3, fl) + 4.0), n3 = vn(vWp * min(3.1, fl) + 11.0);
      vec2 rp = vec2(vWp.x * 0.866 - vWp.y * 0.5, vWp.x * 0.5 + vWp.y * 0.866);
      float n3r = vn(rp * min(3.1, fl) + 17.0);
      float n4 = vn(vec2(rp.x * 0.7071 - rp.y * 0.7071, rp.x * 0.7071 + rp.y * 0.7071) * min(7.0, fl) + 23.0);
      float breakup = 0.35 + 0.65 * n1 * (0.6 + 0.8 * n2);
      float foam = 0.0;
      vec2 g = vec2(0.0);
      float cover = 0.0;
      if (d >= 0.0) {
        // ---- stern turbulence: a beam wide at the transom, spreading like a turbulent wake (with the square
        //      root of the distance) while its froth thins as it spreads
        float laneHalf0 = w0 * 1.05;
        // a planing hull's foam rail spreads less than a displacement hull's turbulent lane (its wake is a pair
        // of narrow whitewater rails off the step, r4 planing frames)
        float laneHalf = laneHalf0 + 0.45 * sqrt(d * max(w0, 0.15)) * (1.0 - 0.45 * planing);
        float ls = 1.0 / max(laneHalf, 0.3);
        // each edge wanders by a quarter of the width over a few widths along the track (a fixed-width band
        // read as a painted stripe)
        float eN = vn(vec2(odo * min(0.35 * ls, fl), 17.0 + s * 9.0));
        float laneHalfN = laneHalf * (0.72 + 0.56 * eN);
        // drawn at least a texel wide (a speedboat's lane is narrower than a far-map texel) with the foam spread
        // over the wider band so the streak keeps its brightness seen from altitude
        float laneHalfR = max(laneHalfN, 0.9 * uTexel);
        float laneMask = 1.0 - smoothstep(laneHalfR * 0.4, laneHalfR, ay);
        float laneFade = 1.0 - smoothstep(0.0, laneLen, dEq);
        // fresh churn over the first hull length and a half, but the froth is a matter of seconds, not of hull
        // lengths: a ship's stays dense for 10-15 s of travel, not for 260 m (the r3 ship view showed a solid
        // white band a beam wide for 200 m)
        float fresh = exp(-dEq / min(1.5 * lead + 6.0 * w0, 12.0 * aspd + 20.0));
        // density falls from the centre to the edges and downstream; the prop wash keeps a bubbly core alive
        // for a couple of hull lengths on the centreline of a powered hull
        float across = 1.0 - 0.55 * smoothstep(0.3, 1.0, ay / laneHalfR);
        // (the froth of the wash dissolves in 20-30 s: a ship's core is ~120 m long, not 2.5 ship lengths)
        float wash = propWash * exp(-ay * ay / (0.3 * w0 * w0 + 0.02)) * exp(-dEq / min(2.5 * lead + 4.0, 20.0 * aspd + 10.0)) * smoothstep(0.3, 2.5, aspd);
        // streaks along the track (the lane is combed by the flow) in track coordinates, plus world grain
        float nl = vn(vec2(odo * min(ls * 0.25, fl), y * min(ls * 1.6, fl)) + 3.0);
        float pn = 0.55 * nl + 0.2 * n3r + 0.1 * n2 + 0.15 * n4;
        // a planing hull's chines and step beat air into the water: its rails of whitewater stay dense longer
        // (r3) a displacement hull's lane is pale turbulence with the prop wash as its only white core: the froth
        // gate is squared and the churn factor no longer scales the density (it scales the persistence below)
        float dens = (0.18 + 0.5 * fresh + 0.28 * planing) * (0.45 + 0.55 * laneFade) * across * (0.12 + 0.88 * froth * froth) + 0.45 * wash;
        // a planing hull leaves its step cleanly: for most of a hull length behind the transom the water is a
        // glassy hollow (the flow separates off the step and has not closed yet), then the two chine flows and
        // the spray meet in the rooster tail, and only there does the froth lane begin (the lane used to start
        // at full density at the transom, painting the hollow white: the r1 step frames showed no hollow at all)
        float hl = clamp(0.1 * aspd, 0.8, 3.0);
        float hollowK = planing * (1.0 - smoothstep(hl * 0.45, hl * 1.15, d));
        dens *= 1.0 - 0.95 * hollowK;
        // remnant patches: sparse, lane-sized, they outlast the froth and fade with the trail's age
        float bigN = vn(vec2(odo * min(0.1 * ls, fl), y * min(0.45 * ls, fl)) + 41.0);
        float remnant = smoothstep(0.58, 0.78, bigN) * 0.28 * churn * froth * (1.0 - smoothstep(0.3, 1.0, ay / laneHalfR));
        dens = max(dens * laneMask, remnant * (0.4 + 0.6 * (1.0 - laneFade)) * (1.0 - smoothstep(0.0, 1.3, ay / laneHalfR)) * (1.0 - hollowK));
        dens = clamp(dens, 0.0, 1.0);
        // nothing where the density has gone to zero (the thresholded noise alone would still fire where it
        // happens to be high, speckling the whole ribbon width)
        float gate = smoothstep(0.0, 0.12, dens);
        // up close the lane is froth patches over dark slick water, not a white band: threshold a streaky patch
        // noise so the froth covers most of the lane at the transom and only a fraction downstream (the summed
        // noise sits around 0.5 with a spread of ~0.15)
        float thr = 0.5 + (0.5 - dens) * 0.5;
        float grainFine = smoothstep(thr - 0.2, thr + 0.2, pn) * (0.7 + 0.3 * n3r) * (0.75 + 0.5 * n4) * gate;
        // from altitude a texel averages the froth, so the density itself is drawn, broken by lane-sized cells
        float bc = vn(vec2(odo * min(0.25 * ls, fl), y * min(ls, fl)) + 7.0);
        // dark windows: beam-sized holes of slick water inside the froth, more of them downstream
        float win = vn(vec2(odo * min(0.5 * ls, fl), y * min(1.2 * ls, fl)) + 57.0);
        float windows = 1.0 - (0.55 - 0.3 * fresh) * smoothstep(0.55, 0.75, win);
        float grainCoarse = dens * (0.5 + 0.9 * bc) * (0.65 + 0.7 * n1) * (1.0 + 0.5 * fresh) * windows * gate;
        float grain = mix(grainCoarse, grainFine * windows, fine);
        float lane = grain * (0.7 + 0.6 * fresh) * (0.25 + 0.75 * spd) * pow(laneHalf0 / laneHalf, 0.15) * (laneHalfN / laneHalfR);
        // ---- Kelvin arms: crest lines at 19.5 deg from the track, thickening and fading with distance; in a
        //      turn the arm laid on the inner side crowds the track and the outer one spreads
        float armLen = laneLen * 2.5;
        // the inner arm of a turn closes on the track by up to 60 %, the outer one spreads by as much
        float asym = clamp(curv * d * 0.6, -0.6, 0.6);
        float armY = (w0 * 0.8 + (d + lead) * TANK) * (1.0 - s * asym);
        // never thinner than a texel of the map being rendered (a sub-texel line samples into dots); the foam
        // is spread over the wider line so its total stays the same seen from altitude
        float armW0 = 0.45 + 0.3 * w0 + 0.012 * d;
        float armW = max(armW0, 0.8 * uTexel);
        float dy = ay - armY;
        float armEnv = 1.0 - smoothstep(armLen * 0.25, armLen * 0.7, d);
        float armBump = exp(-dy * dy / (armW * armW));
        // the arms are glassy crests at taxi speed; foam only where the crest breaks: its steepness falls with
        // the distance from the hull, and a patch noise along the arm decides where it broke (a continuous
        // foam line along the whole arm was the chalk mark seen from altitude)
        // (r3) the crest only breaks within a couple of hull lengths of the transom, and only when the hull pushes
        // hard; further out the arm is a glassy crest carried by the slope alone (the r3 ship view drew the arms
        // as broad white smears 300 m long)
        // a crest only breaks near and above hull speed (Froude number > 0.35: a runabout, a planing float, a
        // yacht pushed hard; never a ship at 11 kt, whose arms are glassy everywhere). From altitude the far map's
        // texel averages the glitter of an unbroken crest into a pale line, so the coarse map carries the arm
        // foam further out as a proxy for it
        float fn = aspd * inversesqrt(9.81 * (lead + 1.0));
        float steep = smoothstep(2.5, 8.5, aspd) * smoothstep(0.25, 0.5, fn) * inversesqrt(1.0 + dEq / (2.0 * lead + 2.0)) * exp(-dEq / mix(8.0 * lead + 40.0, 2.5 * lead + 15.0, fine));
        float an = vn(vec2(odo * min(0.45, fl), s * 3.0 + dy * min(2.0, fl)) + 7.0);
        float breakM = smoothstep(0.84 - 0.3 * steep, 0.98 - 0.3 * steep, an);
        float arm = armBump * armEnv * breakM * steep * (0.5 + 0.5 * n2) * smoothstep(-lead * 0.5, lead * 0.5, d) * (armW0 / armW);
        // rooster tail: where the hollow closes, the converging flows throw a dense white crest on the
        // centreline, narrower than the lane and streaked along the flow; it is the head of the froth lane
        float tailN = vn(vec2(odo * min(1.2, fl), y * min(2.5, fl)) + 83.0);
        float tail = planing * froth * g1(d - hl - 0.9, 0.9 + 0.5 * dk) * (1.0 - smoothstep(w0 * 0.35, w0 * 1.3, ay)) * (0.55 + 0.45 * tailN) * (0.7 + 0.6 * dk);
        // spray landing: the blister thrown off the chines comes down 1.5-3 m outboard a few metres back, as a
        // patchy band of froth that spreads and fades with the distance the sheet has flown; a hull driven deep
        // throws far more of it
        float landY = w0 + 1.1 + 0.11 * d;
        float landW = (0.45 + 0.05 * d) * (1.0 + 0.6 * dk);
        float landN = vn(vec2(odo * min(0.6, fl), y * min(1.6, fl)) + 71.0) * 0.65 + 0.35 * n3r;
        float landing = planing * froth * g1(ay - landY, landW) * smoothstep(0.8, 3.0, d) * exp(-d / (8.0 + 6.0 * dk)) * smoothstep(0.42, 0.62, landN) * (0.45 + 0.55 * dk);
        // from altitude the arms are mostly glassy lines beside a white lane, so they carry less foam there
        foam = lane + arm * mix(0.4, 0.8, fine) + tail * 0.9 + landing * 0.7;
        // arm crest slope: a raised crest, outward normal of the arm line
        vec2 armOut = s * right * COSK + fwd * SINK;
        float crestSlope = -2.0 * dy / (armW * armW) * armBump * (0.05 + 0.05 * spd) * armEnv * min(armW / uTexel, 1.0);
        g += armOut * crestSlope;
        // transverse stern waves: crests across the track, wavelength 2 pi v^2 / g, decaying down the lane; they
        // travel at their own speed, so once the hull slows they run on ahead of where the track says (shift)
        float lam = max(6.2832 * aspd * aspd / 9.81, 0.5);
        // (the envelope runs with the train, d + shift, as the height pass has it: it used to sit at the track
        // distance, so a stopped hull kept a standing stern slope at its transom while the train had run on)
        float tw = smoothstep(2.0 * uTexel, 4.0 * uTexel, lam) * exp(-(d + shift) / (laneLen * 0.6)) * (1.0 - smoothstep(laneHalf * 1.2, laneHalf * 3.0, ay)) * spd;
        g += -fwd * (0.07 * tw * sin(6.2832 * (d + shift) / lam));
        // coverage (the water shader's slick: the lane's short ripples are wiped): the turbulence outlasts the
        // froth by a good margin, so the smooth road behind a hull runs on past the end of its foam (a taxiing
        // float's for a minute, a ship's toward a kilometre: 4 lane lengths on a 4 m half-beam, ~800 m at 11 kt)
        float slickFade = 1.0 - smoothstep(0.0, laneLen * mix(2.2, 4.0, smoothstep(1.0, 4.0, w0)), dEq);
        cover = max(max(laneMask * slickFade * 0.9, armBump * armEnv * 0.8), min(foam * 3.0, 1.0)) * 0.9 + 0.1;
      } else {
        // ---- hull zone: ax metres behind the bow (negative ahead of the stem); nothing pushes water on a hull
        //      going astern (speed < 0), only the meniscus stays
        float hs = max(speed, 0.0);
        float hspd = smoothstep(0.6, 5.0, hs);
        float immersion = vTrail2.w;
        float ax = lead + d;
        // a hull sitting deep (a flooded wreck) cuts the surface at a wider section than its design waterline
        float hb = hullHalfBeam(ax, w0, lead) * (1.0 + 0.35 * immersion);
        float insideX = step(0.0, ax) * step(ax, lead);
        float outside = ax < 0.0 ? length(vec2(ax * 1.4, ay)) : (ax > lead ? length(vec2(ax - lead, max(ay - hb, 0.0))) : max(ay - hb, 0.0));
        float inside = insideX * max(hb - ay, 0.0);
        // meniscus: a soft bright line hugging the waterline, fed by the bow wave and thinning aft; around a
        // flooded hull a collar of foam and bubbles a few decimetres wide, patchy (r8: a wreck's hull met clear
        // water cleanly, as if it had been set down in it)
        float bowT = 1.0 - smoothstep(0.0, lead * 0.6, ax);
        float lw0 = ((0.06 + 0.08 * hspd) * (0.5 + 0.5 * bowT) + 0.02 * w0) * (1.0 + 3.0 * immersion);
        float lw = max(lw0, 0.6 * uTexel);
        float collar = 1.2 * immersion * (0.3 + 0.7 * smoothstep(0.35, 0.7, n3r * 0.6 + n2 * 0.4));
        float meniscus = exp(-outside * outside / (lw * lw)) * (0.45 + 0.45 * bowT) * (0.5 + 0.7 * n3) * (0.3 + 0.7 * hspd + collar) * (lw0 / lw);
        // bow wave: a crest line wrapping the stem and diverging aft along the forward hull at ~20 deg plus the
        // hull's flare; it stops growing at hull speed and the whole hull zone dies away as a planing hull lifts
        // its bow clear
        float sp = min(hs, 9.0);
        float hplaning = smoothstep(planeV * 0.75, planeV * 1.25, hs);
        // the crest stands off the stem by a fraction of the beam (a float's by 20 cm at taxi speed, a ship's
        // by most of a metre)
        float bowLift = (0.08 + 0.05 * sp) * hullScale;
        float c = bowLift + max(ax, 0.0) * 0.27 + hb;
        float cx = ax < 0.0 ? sqrt(ax * ax + ay * ay) : ay;     // ahead of the stem the crest is round
        float dc = ax < 0.0 ? cx - bowLift : ay - c;
        float bowW0 = (0.1 + 0.03 * sp) * hullScale + 0.03 * w0;
        float bowW = max(bowW0, 0.7 * uTexel);
        float bowReach = 1.0 - smoothstep(lead * 0.25, lead * 0.65, ax);
        float bowBump = exp(-dc * dc / (bowW * bowW)) * bowReach * smoothstep(0.8, 3.5, hs);
        // the sheet is a thin translucent film riding the crest (half its width, on the hull side of it),
        // torn into streaks along the flow and whole only once the bow wave really breaks at several m/s
        float lipW = max(bowW0 * 0.7, 0.6 * uTexel);
        float lipD = dc + bowW0 * 0.3;
        float lipBump = exp(-lipD * lipD / (lipW * lipW)) * bowReach * smoothstep(0.8, 3.0, hs);
        float tear = vn(vec2(ax * min(1.2 / hullScale, fl), ay * min(6.0, fl)) + 29.0);
        float lipBreak = mix(0.6 + 0.4 * n3, smoothstep(0.3, 0.75, 0.55 * n3 + 0.45 * tear), fine);
        float sheet = lipBump * lipBreak * (0.35 + 0.45 * smoothstep(2.0, 7.0, hs)) * (bowW0 * 0.7 / lipW);
        // the curl: a compact bright crescent of broken water wrapping the stem itself, the one place the bow
        // wave is always turbulent; it sits just outside the stem and dies within a third of the beam aft
        float curlR = bowLift * 0.8;
        float curlW = max(0.35 * bowLift + 0.04 * w0, 0.6 * uTexel);
        float curlD = ax < 0.0 ? cx - curlR : (ay - hb) - curlR;
        float curl = exp(-curlD * curlD / (curlW * curlW)) * (1.0 - smoothstep(0.0, lead * 0.12, ax)) * smoothstep(1.5, 5.0, hs) * (0.55 + 0.45 * n3r) * ((0.35 * bowLift + 0.04 * w0) / curlW);
        // the hull covers the inside: fade there so nothing shows through a gap at bow or stern
        float insideFade = 1.0 - smoothstep(0.0, 0.08, inside);
        float coverage = insideFade * (1.0 - 0.85 * hplaning);
        // spray root: on a planing hull the water the V-bottom drives aside rises along the sides and leaves the
        // chines as the blister; on the surface that is a strip of dense whitewater hugging the chine from the
        // stagnation line to the step, streaked along the flow, densest at the step. The stagnation line sits
        // near midships at the running draft and moves right up to the bow as the hull is driven under (a
        // touchdown wets the whole forebody chine at once)
        float u = ax / max(lead, 0.1);
        float wetFrom = mix(0.5, 0.08, max(dk, sinkK));
        float wetU = smoothstep(wetFrom - 0.12, wetFrom + 0.15, u) * (1.0 - smoothstep(1.0, 1.25, u));
        float rootW0 = (0.14 + 0.28 * dk + 0.08 * sinkK) * hullScale + 0.03 * w0;
        float rootW = max(rootW0, 0.7 * uTexel);
        float rootD = max(ay - hb - 0.02, 0.0);
        float rootStreak = 0.55 + 0.45 * vn(vec2(ax * min(2.5, fl), ay * min(9.0, fl)) + 43.0);
        float root = exp(-rootD * rootD / (rootW * rootW)) * wetU * (0.55 + 0.45 * clamp(u, 0.0, 1.0)) * (0.75 + 0.25 * dk) * rootStreak * hplaning * smoothstep(6.0, 12.0, hs) * (rootW0 / rootW);
        foam = (meniscus + sheet * 0.7 + curl * 0.9) * coverage + root * insideFade;
        // crest slope of the bow wave (raised toward the hull side of the crest)
        vec2 outDir = ax < 0.0 ? normalize(vec2(-fwd * ax + s * right * ay)) : s * right;
        float slope = -2.0 * dc / (bowW * bowW) * bowBump * (0.3 + 0.1 * hspd) * bowW;
        g += outDir * slope * coverage;
        cover = max(coverage * max(exp(-outside * 3.0), bowBump), root * insideFade);
      }
      // ribbon edge softening (no hard rectangle edges in the map)
      float edge = 1.0 - smoothstep(0.9, 1.0, abs(side));
      foam *= life * life * edge * strength * fade;
      g *= life * edge * fade;
      vec2 enc = clamp(g, -0.5, 0.5);
      gl_FragColor = vec4(clamp(foam, 0.0, 1.0), 0.5 + enc.x, 0.5 + enc.y, clamp(cover * life * edge * fade, 0.0, 1.0));
    }
  `,
  uniforms: { uTexel: { value: 1.56 } },
  transparent: true,
  depthTest: false,
  depthWrite: false,
  side: THREE.DoubleSide,
  blending: THREE.NormalBlending,
});

/** metres of surface elevation per unit of the height map's channels */
export const WAKE_HEIGHT_SCALE = 1.0;

/**
 * Height pass of the same ribbons: the signed elevation (m) of the water around a hull, summed over hulls
 * (additive blend, R up / G down so bytes carry both signs). Over the hull: the bow wave as a hump wrapping
 * the stem and sweeping aft, the hollow along the sides behind it and the stern rise at displacement speed;
 * at planing speed the hump dies, the water dips along the chines from the forebody to the step, separates
 * off the step into a hollow and closes behind the transom in a rooster tail. Behind the transom at
 * displacement speed: the transverse stern waves and the crests of the Kelvin arms. The water shader's near
 * patch displaces its vertices by this field and takes its normal from it, so the surface really bends around
 * the floats instead of only being shaded as if it did. Only rendered for the near region.
 */
export const WAKE_HEIGHT_MATERIAL = new THREE.ShaderMaterial({
  vertexShader: WAKE_VERTEX,
  fragmentShader: /* glsl */ `
    varying vec4 vA; varying vec4 vGeom; varying vec4 vExt; varying vec2 vWp; varying vec2 vPt; flat varying vec4 vTrail; flat varying vec4 vTrail2;
    uniform float uTexel;
    uniform float uTime;
    const float HSCALE = ${WAKE_HEIGHT_SCALE.toFixed(2)};
    ${WAKE_GLSL_COMMON}
    void main() {
      float age = vA.x, side = vA.y, fade = vA.z, speed = vA.w;
      float d = vGeom.x;
      float w0 = vTrail.y, lead = vTrail.z;
      float curv = vExt.x, shift = vExt.z;
      float planeV = max(vTrail2.y, 1.0);
      float dk = smoothstep(0.08, 0.4, vPt.x);
      float sinkK = clamp(vPt.y / 3.0, 0.0, 1.0);
      float aspd = abs(speed);
      float hs = max(speed, 0.0);
      float laneLen = vTrail.w * clamp(aspd / 8.0, 0.5, 1.6);
      float ay = abs(vGeom.y);
      float s = vGeom.y < 0.0 ? -1.0 : 1.0;
      float life = 1.0 - age;
      float spd = smoothstep(0.6, 5.0, aspd);
      float planing = smoothstep(planeV * 0.75, planeV * 1.25, aspd);
      float hullScale = 0.6 + 0.4 * min(w0, 2.0);
      // bow wave height: grows with the square of the speed up to hull speed (a float pushes a 20 cm hump at
      // taxi speed, 35 cm at the hump; the stagnation rise v^2/2g is 70 cm at 7 kt, so this is the sober end),
      // gone once the hull planes with its bow clear
      float sp = min(hs, 7.0);
      float Hb = min(0.045 + 0.018 * sp * sp, 0.5) * hullScale * (1.0 - planing) * smoothstep(0.4, 2.0, hs);
      // one continuous field over hull and wake (a branch at the transom left a step in the surface that the
      // patch mesh drew as a jagged shelf across the stern): every term is windowed smoothly in d
      float ax = lead + d;                 // metres behind the bow (negative ahead of the stem, > lead behind the transom)
      float u = ax / lead;
      float uc = clamp(u, 0.0, 1.0);
      float hb = hullHalfBeam(ax, w0, lead);
      float insideX = step(0.0, ax) * step(ax, lead);
      float inside = insideX * max(hb - ay, 0.0);
      float sideDist = ax < 0.0 ? length(vec2(ax, ay)) : (ax > lead ? length(vec2(ax - lead, max(ay - hb, 0.0))) : max(ay - hb, 0.0));
      float dp = max(d, 0.0);
      float h = 0.0;
      // ---- bow hump: a crest standing off the stem, wrapping it and sweeping aft along the hull, losing
      //      height as it spreads; past midships it hands over to the Kelvin arm it becomes
      float bowLift = (0.1 + 0.06 * sp) * hullScale;
      float c = bowLift + max(ax, 0.0) * 0.27 + hb;
      float cx = ax < 0.0 ? sqrt(ax * ax + ay * ay) : ay;
      float dc = ax < 0.0 ? cx - bowLift : ay - c;
      float bowHW = (0.28 + 0.06 * sp) * hullScale + 0.15 * w0;
      // tallest where it wraps the stem; the arms sweeping aft lose most of it within the forebody (the two
      // floats' inner arms meet between the hulls, and their sum must not out-top the stems)
      float bowDecay = 1.0 - 0.85 * smoothstep(0.0, lead * 0.6, ax);
      float bowReach = 1.0 - smoothstep(lead * 0.55, lead * 1.1, ax);
      h += Hb * bowDecay * g1(dc, bowHW) * bowReach;
      // ---- Kelvin arm crests, fading in over the after-body where the bow crest fades out
      float armLen = laneLen * 2.5;
      float asym = clamp(curv * dp * 0.6, -0.6, 0.6);
      float armY = (w0 * 0.8 + (d + lead) * TANK) * (1.0 - s * asym);
      float armW = max(0.45 + 0.3 * w0 + 0.012 * dp, 0.3);
      float armEnv = (1.0 - smoothstep(armLen * 0.25, armLen * 0.7, dp)) * smoothstep(lead * 0.45, lead * 1.0, ax);
      // (r8: a float's divergent crests at hump speed stand 4-5 cm over a 1 m wide crest; at 2.7 cm they were
      // under the 8-bit map's slope quantum and the V behind a taxiing aircraft did not read at all)
      h += (0.015 + 0.04 * spd) * hullScale * g1(ay - armY, armW) * armEnv * smoothstep(0.8, 2.0, aspd) * (1.0 - 0.5 * planing);
      // ---- hollow along the sides behind the bow crest (displacement speed)
      float sideW = 0.6 * hullScale + 0.3 * w0;
      h += -0.45 * Hb * smoothstep(0.15, 0.45, uc) * (1.0 - smoothstep(0.7, 1.0, uc)) * g1(sideDist, sideW);
      // ---- transverse stern waves: the first crest builds along the after-body and stands at the transom,
      //      then the train runs down the lane (wavelength 2 pi v^2 / g) and decays; a slowing hull is overtaken
      //      by its own train (shift), which then runs on under and ahead of it
      float laneHalf = w0 * 1.05 + 0.45 * sqrt(dp * max(w0, 0.15));
      float across = 1.0 - smoothstep(laneHalf * 1.2, laneHalf * 3.0, ay);
      float lam = max(6.2832 * aspd * aspd / 9.81, 0.5);
      float twA = 0.08 * hullScale * spd * (1.0 - 0.8 * planing);
      float ds = d + shift;
      h += twA * exp(-max(ds, 0.0) / (laneLen * 0.6)) * across * cos(6.2832 * ds / lam) * smoothstep(-0.5 * lam, 0.0, ds) * (1.0 - smoothstep(0.0, 0.12, inside));
      h += 0.3 * Hb * g1(ax - lead, 0.6 * hullScale) * g1(sideDist, 0.5) * (1.0 - planing);
      // ---- planing: the water is thrown out and down along the chines from the forebody to the step, leaves
      //      the step as a hollow and closes behind the transom in a rooster tail a hull length back
      float hl = clamp(0.1 * hs, 0.8, 3.0);
      float lane = 1.0 - smoothstep(w0 * 0.9, w0 * 2.0, ay);
      // the dip along the chines sits outside the pile-up ridge (below); a hull driven under digs it deeper
      float chine = -0.12 * hullScale * (1.0 + 0.8 * dk) * smoothstep(0.35, 0.6, u) * (1.0 - smoothstep(1.0, 1.1, u)) * g1(sideDist - 0.45 * dk, 0.5);
      float hollow = -0.26 * hullScale * (1.0 + 1.1 * dk) * smoothstep(0.0, 0.5, d) * (1.0 - smoothstep(hl * 0.6, hl * 1.1, d)) * lane;
      float tailH = 0.34 * hullScale * (1.0 + 0.7 * dk) * smoothstep(planeV * 0.85, planeV * 1.45, hs);
      float tail = tailH * (g1(d - hl - 1.0, 1.0) * (1.0 - smoothstep(w0 * 0.6, w0 * 1.6, ay)) - 0.35 * g1(d - hl - 3.2, 1.4) * lane + 0.15 * g1(d - hl - 5.6, 1.8) * lane);
      h += planing * (chine + hollow + tail);
      // ---- pile-up: the water a running V-bottom drives aside rises along the hull sides and stands as a ridge
      //      just outside the chines, from the stagnation line to the step: the root the spray sheet leaves from.
      //      A few centimetres at the running draft; a hull driven 40 cm under at touchdown, still sinking, piles
      //      up 20-25 cm along its whole forebody (the surface really does climb the hull: the displaced water
      //      has to go somewhere, and at planing speed it goes out and up, not ahead as a bow hump)
      float wetFrom = mix(0.5, 0.08, max(dk, sinkK));
      float wetU = smoothstep(wetFrom - 0.12, wetFrom + 0.15, u) * (1.0 - smoothstep(1.0, 1.2, u));
      float ridgeH = (0.04 + 0.2 * dk + 0.05 * sinkK) * hullScale;
      float ridgeW = (0.3 + 0.25 * dk) * hullScale;
      h += ridgeH * g1(sideDist - 0.12 - 0.15 * dk, ridgeW) * wetU * smoothstep(6.0, 12.0, hs) * max(planing, dk);
      // ---- rest ripples: a hull barely under way still works the surface (it heaves and rolls on the chop, the
      //      idle wash nudges it) and radiates rings a few millimetres high from its waterline, 0.6 m apart,
      //      running out at their own 1 m/s and dying within a couple of metres; gone once the hull moves off and
      //      makes a wake instead (a floatplane at rest used to sit in water as flat as glass)
      float still = 1.0 - smoothstep(0.5, 2.0, aspd);
      float ringA = 0.006 * hullScale * exp(-sideDist / 1.6) * inversesqrt(1.0 + 3.0 * sideDist) * (0.7 + 0.3 * vn(vWp * 1.7 + 5.0));
      h += still * ringA * cos(10.5 * sideDist - 10.1 * uTime + 3.0 * vn(vWp * 0.6 + 9.0));
      // under the hull the surface is hidden; keep it from rising through the deck at the stem
      h = mix(h, min(h, 0.0), smoothstep(0.0, 0.12, inside));
      float edge = 1.0 - smoothstep(0.85, 1.0, abs(side));
      h *= life * edge * fade / HSCALE;
      gl_FragColor = vec4(max(h, 0.0), max(-h, 0.0), 0.0, 1.0);
    }
  `,
  uniforms: { uTexel: { value: 0.125 }, uTime: { value: 0 } },
  transparent: true,
  depthTest: false,
  depthWrite: false,
  side: THREE.DoubleSide,
  blending: THREE.CustomBlending,
  blendEquation: THREE.AddEquation,
  blendSrc: THREE.OneFactor,
  blendDst: THREE.OneFactor,
  blendSrcAlpha: THREE.OneFactor,
  blendDstAlpha: THREE.OneFactor,
});

/**
 * Impact splats: the surface response where a hull (or a wing, the nose) slaps the water. Instanced quads
 * whose fragment shaders evaluate, at time tau since the impact and radius r from it (an ellipse stretched
 * along the impact's travel direction):
 *  - the depression the body drove into the surface, collapsing and rebounding in the first half second,
 *  - a ring wave packet leaving at its group speed (wavelength ~ the body's size), amplitude falling with the
 *    square root of the radius and dissipating over a few seconds,
 *  - whitewater: a patch of froth that grows over the first second, then dissolves over seconds (longer the
 *    harder the hit), and a breaking rim on the first crest for the first second;
 * all scaled by 'energy' (0 a gentle 1 m/s touch .. 1 a violent slam) which stands for mass x entry speed.
 * Foam / slope in the map pass, signed height in the height pass, like the ribbons.
 */
const SPLAT_VERTEX = /* glsl */ `
  attribute vec4 iPos;   // x, z, t0 (s), energy 0..1
  attribute vec4 iDir;   // travel direction xz (unit), aspect (stretch along it), kind (0 float, 1 airframe part)
  uniform float uTime;
  varying vec2 vLocal;   // metres from the centre in the impact frame (x along the travel direction)
  varying vec4 vPos; varying vec4 vDir; varying vec2 vWp;
  void main() {
    vPos = iPos; vDir = iDir;
    float tau = max(uTime - iPos.z, 0.0);
    float E = iPos.w;
    // an airframe part (kind 1: a wing tip, the nose) drives a wider cavity than a float's V-bottom
    float r0 = (0.6 + 1.3 * E) * (1.0 + 0.6 * iDir.w);
    float lam = 1.6 * r0;
    float c = 1.25 * sqrt(lam);   // deep-water phase speed sqrt(g lam / 2 pi)
    // the quad follows the ring outward while the ring lives, else it holds the whitewater patch
    float ringAlive = 1.0 - smoothstep(4.0 + 3.0 * E, 6.0 + 4.0 * E, tau);
    float R = max(r0 * 2.2, (r0 + c * tau + 2.0 * lam) * ringAlive);
    vec2 dir = iDir.xy;
    vec2 perp = vec2(-dir.y, dir.x);
    vec2 local = position.xz * 2.0 * R;      // unit quad -> metres in the impact frame (unstretched)
    vLocal = local;
    // the pattern is stretched along the travel direction by the aspect
    vec2 wp = vec2(iPos.x, iPos.y) + dir * (local.x * iDir.z) + perp * local.y;
    vWp = wp;
    gl_Position = projectionMatrix * viewMatrix * vec4(wp.x, 0.05, wp.y, 1.0);
  }
`;
/** seconds a splat is kept; the shaders fade everything out over its last two seconds */
const SPLAT_LIFE = 12;
const SPLAT_GLSL_COMMON = /* glsl */ `
  uniform float uTime; uniform float uTexel;
  varying vec2 vLocal; varying vec4 vPos; varying vec4 vDir; varying vec2 vWp;
  const float SLIFE = ${SPLAT_LIFE.toFixed(1)};
  float splatEnd(float tau) { return 1.0 - smoothstep(SLIFE - 2.0, SLIFE, tau); }
  float h21(vec2 q) { q = mod(q, 1024.0); vec3 p3 = fract(vec3(q.xyx) * vec3(0.1031, 0.1030, 0.0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
  float vn(vec2 q) { vec2 i = floor(q), f = fract(q); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
`;
export const SPLAT_MATERIAL = new THREE.ShaderMaterial({
  vertexShader: SPLAT_VERTEX,
  fragmentShader: /* glsl */ `
    ${SPLAT_GLSL_COMMON}
    void main() {
      float tau = max(uTime - vPos.z, 0.0);
      float E = vPos.w;
      float r = length(vLocal);
      float r0 = (0.6 + 1.3 * E) * (1.0 + 0.6 * vDir.w);
      float lam = 1.6 * r0;
      float c = 1.25 * sqrt(lam);
      float rc = r0 + c * tau;
      float fl = 0.2 / uTexel;
      float fine = 1.0 - smoothstep(0.25, 1.2, uTexel);
      // three octaves on lattices turned against each other, none finer than 5 texels: clamped to one frequency
      // (the mid map, 0.4 m/texel) n1 and n2 collapsed to a single octave of value noise whose thresholded blobs
      // sat on its 2 m lattice, and a touchdown's whitewater reached the eye as a row of equal white dashes
      // where the water plane hands over to the near patch
      vec2 w1 = mat2(0.94, 0.34, -0.34, 0.94) * vWp;
      vec2 w2 = mat2(0.64, 0.77, -0.77, 0.64) * vWp;
      float n1 = vn(vWp * min(1.1, fl) + 5.0), n2 = vn(w1 * min(3.3, 0.61 * fl) + 13.0), n3 = vn(w2 * min(0.4, 0.37 * fl) + 2.0);
      // whitewater patch: grows over the first second, dissolves over a few seconds (longer the harder the hit);
      // its interior is a churned patch field with dark windows, its edge ragged
      float patchR = r0 * (1.0 + 0.9 * (1.0 - exp(-tau / 0.7))) * (0.8 + 0.4 * n3);
      float lifeF = exp(-tau / (1.6 + 4.5 * E));
      // (named 'ww', not 'patch': 'patch' is a reserved word in GLSL ES 3.00 and the shader failed to compile)
      float ww = (1.0 - smoothstep(patchR * 0.45, patchR * 1.1, r)) * lifeF;
      float dens = ww * (0.5 + 0.5 * E);
      float thr = 0.5 + (0.5 - clamp(dens, 0.0, 1.0)) * 0.5;
      float pn = 0.5 * n1 + 0.3 * n2 + 0.2 * n3;
      float grainFine = smoothstep(thr - 0.14, thr + 0.14, pn) * (0.7 + 0.3 * n2);
      float grainCoarse = dens * (0.6 + 0.8 * n1);
      float foam = mix(grainCoarse, grainFine, fine) * ww;
      // breaking rim on the leading crest for the first second
      float rimW = 0.25 + 0.15 * rc;
      float rim = exp(-(r - rc) * (r - rc) / (rimW * rimW)) * exp(-tau / 0.7) * E * (0.5 + 0.5 * n2) * smoothstep(0.3, 0.6, n1 + 0.3 * E);
      foam += rim * 0.7;
      // ring slope for the coarse map (the near map takes its slope from the height field)
      float ringA = 0.08 * (0.4 + 0.6 * E) * inversesqrt(max(r / r0, 1.0)) * exp(-tau / (1.5 + 2.5 * E)) * smoothstep(0.0, r0 * 0.5, r);
      float ph = 6.2832 * (r - rc) / lam;
      float env = exp(-(r - rc) * (r - rc) / (0.8 * lam * 0.8 * lam));
      vec2 rdir = r > 1e-3 ? vLocal / r : vec2(1.0, 0.0);
      vec2 dirW = vDir.xy, perpW = vec2(-dirW.y, dirW.x);
      vec2 rWorld = dirW * rdir.x + perpW * rdir.y;
      vec2 g = rWorld * (-ringA * sin(ph) * env * 6.2832 / lam) * (1.0 - fine);
      float cover = max(ww * 0.9, env * ringA * 8.0);
      float end = splatEnd(tau);
      foam *= end; g *= end; cover *= end;
      vec2 enc = clamp(g, -0.5, 0.5);
      gl_FragColor = vec4(clamp(foam, 0.0, 1.0), 0.5 + enc.x, 0.5 + enc.y, clamp(cover, 0.0, 1.0));
    }
  `,
  uniforms: { uTexel: { value: 1.56 }, uTime: { value: 0 } },
  transparent: true,
  depthTest: false,
  depthWrite: false,
  side: THREE.DoubleSide,
  blending: THREE.NormalBlending,
});
export const SPLAT_HEIGHT_MATERIAL = new THREE.ShaderMaterial({
  vertexShader: SPLAT_VERTEX,
  fragmentShader: /* glsl */ `
    ${SPLAT_GLSL_COMMON}
    const float HSCALE = ${WAKE_HEIGHT_SCALE.toFixed(2)};
    void main() {
      float tau = max(uTime - vPos.z, 0.0);
      float E = vPos.w;
      float r = length(vLocal);
      float r0 = (0.6 + 1.3 * E) * (1.0 + 0.6 * vDir.w);
      float lam = 1.6 * r0;
      float c = 1.25 * sqrt(lam);
      float rc = r0 + c * tau;
      // the cavity the body drove: deepest at the impact, collapsing within half a second and rebounding into
      // a central hump that the ring then carries away
      float D = (0.12 + 0.3 * E) * (1.0 + 0.4 * vDir.w);
      float cav = exp(-r * r / (r0 * r0));
      float dep = -D * cav * exp(-tau / 0.35) + 0.45 * D * cav * sin(min(tau / 0.9, 1.0) * 3.1416) * exp(-tau / 0.8);
      // ring wave packet: wavelength ~ the body's size, leaving at the group speed, amplitude falling with the
      // square root of the radius (cylindrical spreading) and dissipating over seconds
      float A = 0.05 + 0.13 * E;
      float env = exp(-(r - rc) * (r - rc) / (0.8 * lam * 0.8 * lam));
      float ring = A * cos(6.2832 * (r - rc) / lam) * env * inversesqrt(max(r / r0, 1.0)) * exp(-tau / (1.5 + 2.5 * E)) * smoothstep(0.0, r0 * 0.5, r);
      float h = (dep + ring) * splatEnd(tau) / HSCALE;
      gl_FragColor = vec4(max(h, 0.0), max(-h, 0.0), 0.0, 1.0);
    }
  `,
  uniforms: { uTexel: { value: 0.125 }, uTime: { value: 0 } },
  transparent: true,
  depthTest: false,
  depthWrite: false,
  side: THREE.DoubleSide,
  blending: THREE.CustomBlending,
  blendEquation: THREE.AddEquation,
  blendSrc: THREE.OneFactor,
  blendDst: THREE.OneFactor,
  blendSrcAlpha: THREE.OneFactor,
  blendDstAlpha: THREE.OneFactor,
});

/** Instanced impact splats of the wake maps (see SPLAT_MATERIAL). Splats are recycled after their life. */
export class SplatBatch {
  readonly mesh: THREE.InstancedMesh;
  private readonly material: THREE.ShaderMaterial;
  private readonly heightMaterial: THREE.ShaderMaterial;
  private readonly pos: THREE.InstancedBufferAttribute;
  private readonly dir: THREE.InstancedBufferAttribute;
  private readonly t0: number[] = [];
  private next = 0;
  private count = 0;
  private dirty = false;
  private time = 0;
  static readonly LIFE = SPLAT_LIFE;

  constructor(readonly capacity = 48) {
    const geo = new THREE.PlaneGeometry(1, 1);
    geo.rotateX(-Math.PI / 2);
    this.pos = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 4), 4).setUsage(THREE.DynamicDrawUsage) as THREE.InstancedBufferAttribute;
    this.dir = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 4), 4).setUsage(THREE.DynamicDrawUsage) as THREE.InstancedBufferAttribute;
    geo.setAttribute('iPos', this.pos);
    geo.setAttribute('iDir', this.dir);
    this.material = SPLAT_MATERIAL.clone();
    this.heightMaterial = SPLAT_HEIGHT_MATERIAL.clone();
    this.mesh = new THREE.InstancedMesh(geo, this.material, capacity);
    this.mesh.frustumCulled = false;
    this.mesh.matrixAutoUpdate = false;
    this.mesh.count = 0;
  }

  setTexel(t: number): void { this.material.uniforms.uTexel.value = t; this.heightMaterial.uniforms.uTexel.value = t; }
  useHeight(on: boolean): void { this.mesh.material = on ? this.heightMaterial : this.material; }
  /** the wake clock (the same `time` the splats were added with) */
  setTime(t: number): void { this.time = t; this.material.uniforms.uTime.value = t; this.heightMaterial.uniforms.uTime.value = t; }

  /**
   * Add a splat at (x, z) at wake time `time`. `energy` 0..1 (a 1 m/s touch .. a slam), `dx, dz` the travel
   * direction of the body, `aspect` its stretch along that direction (1 = round), `kind` 0 float / 1 airframe.
   */
  add(x: number, z: number, time: number, energy: number, dx: number, dz: number, aspect = 1, kind = 0): void {
    const l = Math.hypot(dx, dz);
    if (l > 1e-6) { dx /= l; dz /= l; } else { dx = 1; dz = 0; }
    const i = this.next;
    this.next = (this.next + 1) % this.capacity;
    const p = this.pos.array as Float32Array, d = this.dir.array as Float32Array;
    p[i * 4] = x; p[i * 4 + 1] = z; p[i * 4 + 2] = time; p[i * 4 + 3] = clamp(energy, 0, 1);
    d[i * 4] = dx; d[i * 4 + 1] = dz; d[i * 4 + 2] = Math.max(aspect, 1); d[i * 4 + 3] = kind;
    this.t0[i] = time;
    this.count = Math.max(this.count, i + 1);
    this.dirty = true;
  }

  clear(): void { this.count = 0; this.next = 0; this.t0.length = 0; this.mesh.count = 0; }

  upload(): void {
    // drop the batch entirely once every splat is dead (the ring buffer keeps them in place meanwhile)
    let alive = 0;
    for (let i = 0; i < this.count; i++) if (this.time - this.t0[i] < SplatBatch.LIFE) alive++;
    if (alive === 0) { this.mesh.count = 0; if (this.count) { this.count = 0; this.next = 0; this.t0.length = 0; } return; }
    this.mesh.count = this.count;
    if (this.dirty) { this.pos.needsUpdate = true; this.dir.needsUpdate = true; this.dirty = false; }
  }
}

/** Contrail ribbon drawn in the main scene: soft white, fading with age, slightly hazy. */
export const CONTRAIL_MATERIAL = new THREE.ShaderMaterial({
  // drawn in the main scene: must write/compare log depth like every other material there
  vertexShader: /* glsl */ `
    #include <common>
    #include <logdepthbuf_pars_vertex>
    attribute vec4 aA;
    varying float vAge; varying float vSide; varying float vFade;
    void main() {
      vAge = aA.x; vSide = aA.y; vFade = aA.z;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      #include <logdepthbuf_vertex>
    }
  `,
  fragmentShader: /* glsl */ `
    #include <common>
    #include <logdepthbuf_pars_fragment>
    varying float vAge; varying float vSide; varying float vFade;
    uniform float uStrength;
    void main() {
      #include <logdepthbuf_fragment>
      float edge = 1.0 - smoothstep(0.2, 1.0, abs(vSide));
      float life = (1.0 - vAge);
      float a = edge * life * life * uStrength * smoothstep(0.0, 0.05, vAge) * vFade;
      gl_FragColor = vec4(vec3(0.95, 0.97, 1.0), a);
    }
  `,
  uniforms: { uStrength: { value: 0.7 } },
  transparent: true,
  depthWrite: false,
  side: THREE.DoubleSide,
});

/**
 * Every wake ribbon of the wake maps in one draw. Each trail keeps its own ribbon arrays; before the maps
 * are rendered the batch copies the live vertices of every trail, in the order the trails were added,
 * into shared buffers and builds the index for the quads that exist this frame.
 */
export class WakeBatch {
  readonly mesh: THREE.Mesh;
  /** the impact splats drawn into the same maps (set by the WakeMap owning both), so emitters that only hold
   *  the batch (the aircraft's effects) can add splats and drive the splat clock */
  splats: SplatBatch | null = null;
  private readonly trails: WakeTrail[] = [];
  private readonly geo = new THREE.BufferGeometry();
  private readonly material: THREE.ShaderMaterial;
  private capacity = 0;
  private positions = new Float32Array(0);
  private a = new Float32Array(0);
  private geom = new Float32Array(0);
  private ext = new Float32Array(0);
  private trail = new Float32Array(0);
  private trail2 = new Float32Array(0);
  private trail3 = new Float32Array(0);
  private index = new Uint32Array(0);
  private readonly heightMaterial: THREE.ShaderMaterial;

  constructor() {
    this.material = WAKE_MATERIAL.clone();
    this.heightMaterial = WAKE_HEIGHT_MATERIAL.clone();
    this.geo.setDrawRange(0, 0);
    this.mesh = new THREE.Mesh(this.geo, this.material);
    this.mesh.frustumCulled = false;
    this.mesh.matrixAutoUpdate = false;
  }

  setTexel(t: number): void { this.material.uniforms.uTexel.value = t; this.heightMaterial.uniforms.uTexel.value = t; }
  /** the height pass's clock (the rest ripples travel); driven by whoever drives the splat clock */
  setTime(t: number): void { this.heightMaterial.uniforms.uTime.value = t; }
  /** draw the batch as the signed height field (additive) instead of foam / slope */
  useHeight(on: boolean): void { this.mesh.material = on ? this.heightMaterial : this.material; }

  add(trail: WakeTrail): void {
    this.trails.push(trail);
    this.capacity += trail.capacity + 4;
  }

  /** Gather the ribbons of every trail into the shared buffers. */
  upload(): void {
    if (this.positions.length !== this.capacity * 6) this.allocate();
    let v = 0, n = 0;
    const { positions, a, geom, ext, trail, trail2, trail3, index } = this;
    for (const t of this.trails) {
      const pts = t.count;
      if (pts === 0) continue;
      const verts = pts * 2;
      positions.set(t.positions.subarray(0, verts * 3), v * 3);
      a.set(t.a.subarray(0, verts * 4), v * 4);
      geom.set(t.geom.subarray(0, verts * 4), v * 4);
      ext.set(t.ext.subarray(0, verts * 4), v * 4);
      for (let i = v, j = 0; i < v + verts; i++, j++) {
        trail[i * 4] = t.strength; trail[i * 4 + 1] = t.halfWidth; trail[i * 4 + 2] = t.lead; trail[i * 4 + 3] = t.laneLen;
        trail2[i * 4] = t.propWash; trail2[i * 4 + 1] = t.planingSpeed; trail2[i * 4 + 2] = t.churn; trail2[i * 4 + 3] = t.immersion;
        trail3[i * 4] = t.draft; trail3[i * 4 + 1] = t.sink; trail3[i * 4 + 2] = t.ext2[j * 2]; trail3[i * 4 + 3] = t.ext2[j * 2 + 1];
      }
      for (let i = 0; i < pts - 1; i++) {
        const q = v + i * 2, b = q + 1, c = q + 2, e = q + 3;
        index[n++] = q; index[n++] = c; index[n++] = b; index[n++] = b; index[n++] = c; index[n++] = e;
      }
      v += verts;
    }
    const g = this.geo;
    for (const name of ['position', 'aA', 'aGeom', 'aExt', 'aTrail', 'aTrail2', 'aTrail3']) {
      const attr = g.getAttribute(name) as THREE.BufferAttribute;
      attr.clearUpdateRanges();
      if (v > 0) attr.addUpdateRange(0, v * attr.itemSize);
      attr.needsUpdate = true;
    }
    const idx = g.index!;
    idx.clearUpdateRanges();
    if (n > 0) idx.addUpdateRange(0, n);
    idx.needsUpdate = true;
    g.setDrawRange(0, n);
  }

  private allocate(): void {
    const cap = this.capacity;
    this.positions = new Float32Array(cap * 6);
    this.a = new Float32Array(cap * 8);
    this.geom = new Float32Array(cap * 8);
    this.ext = new Float32Array(cap * 8);
    this.trail = new Float32Array(cap * 8);
    this.trail2 = new Float32Array(cap * 8);
    this.trail3 = new Float32Array(cap * 8);
    this.index = new Uint32Array(Math.max(6, cap * 6));
    const g = this.geo;
    g.dispose();
    g.setAttribute('position', new THREE.BufferAttribute(this.positions, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aA', new THREE.BufferAttribute(this.a, 4).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aGeom', new THREE.BufferAttribute(this.geom, 4).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aExt', new THREE.BufferAttribute(this.ext, 4).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aTrail', new THREE.BufferAttribute(this.trail, 4).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aTrail2', new THREE.BufferAttribute(this.trail2, 4).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aTrail3', new THREE.BufferAttribute(this.trail3, 4).setUsage(THREE.DynamicDrawUsage));
    g.setIndex(new THREE.BufferAttribute(this.index, 1).setUsage(THREE.DynamicDrawUsage));
  }
}

interface TrailPoint { x: number; z: number; dx: number; dz: number; t: number; fade: number; speed: number; odo: number; curv: number; draft: number; sink: number; }

/**
 * Fixed-capacity ribbon following an emitter. Positions are in world space. Standalone trails (contrails,
 * wingtip vortices in the main scene) own a mesh; trails given a WakeBatch are drawn by it as wakes and
 * carry the wake geometry: the ribbon widens with the distance behind the emitter along the Kelvin
 * envelope while the arms last, and a live head runs from the emitter (the transom) forward over the hull
 * to just ahead of the bow so the map also holds the bow wave and waterline of the hull itself.
 */
export class WakeTrail {
  /** null for a batched trail */
  readonly mesh: THREE.Mesh | null = null;
  readonly capacity: number;
  /** foam strength multiplier of the trail */
  strength: number;
  /** hull half-beam (wakes) or ribbon half-width (contrails), m */
  readonly halfWidth: number;
  /** transom-to-bow length of the hull (wakes): the length of the live head ahead of the emitter, so an emitter
   *  that moves along the hull (a float's emission point slides from the stern to the step as it planes) keeps
   *  the head's bow at the real bow */
  lead: number;
  /** distance over which the turbulent lane dies out */
  readonly laneLen: number;
  /** prop wash strength (0 for an unpowered hull such as a float, 1 for a screw right at the transom) */
  propWash = 1;
  /** speed (m/s) at which this hull is on the plane (bow hump gone, rooster tail); huge for a hull that never does */
  planingSpeed: number;
  /** turbulence / foam persistence of the hull's wake (a dinghy 0.6 .. a ship 1.4) */
  churn: number;
  /** how deep the hull sits below its design waterline, 0 (afloat as built) .. 1 (a flooded hull, decks awash):
   *  the ribbon head draws its outline at the wider section that cuts the surface, with a collar of foam */
  immersion = 0;
  /** running draft of the hull's forebody keel below the local surface (m; a planing float ~0.1, one driven under
   *  at touchdown 0.4): the pile-up beside the chines, the spray root and the hollow off the step scale with it */
  draft = 0;
  /** downward speed of the hull into the surface (m/s, >= 0): the wedge jet of a hull still sinking */
  sink = 0;
  readonly positions: Float32Array;
  readonly a: Float32Array;
  readonly geom: Float32Array;
  readonly ext: Float32Array;
  /** per vertex: the hull's draft and sink rate when this point was laid (the head carries the live values), so a
   *  lane laid by a hull driven deep at touchdown keeps its marks after the hull has risen onto the step */
  readonly ext2: Float32Array;
  /** live points (vertices = 2 * count, quads = count - 1) */
  count = 0;
  private readonly points: TrailPoint[] = [];
  private lastX = NaN;
  private lastZ = NaN;
  private lastTime = NaN;
  /** metres the emitter has travelled on the water (the track coordinate of the shader's noise) */
  private odometer = 0;
  /** points still to emit at reduced strength after a trail start or a gap */
  private ramp = 0;
  /** the time the emitter left the surface (NaN while it is on it) and, once it is back, the length of that spell
   *  until the next point is laid: a hull that skips clear for longer than a moment leaves untouched water behind
   *  the hop, however short the hop was in track (r10) */
  private dryFrom = NaN;
  private drySpell = 0;
  /** true until the first update() since construction / reset(): only an emitter that is already under way on
   *  the water at its very first update (a boat spawned on its route, the aircraft set up taxiing) gets a seeded
   *  track behind it; one that has been airborne and touches down starts its wake at the touchdown point */
  private untouched = true;
  private readonly geo: THREE.BufferGeometry | null = null;
  private readonly wake: boolean;
  /** emission spacing (m); a slow emitter is sampled every spacing metres, a fast one every quarter second */
  private readonly spacing: number;

  constructor(capacity: number, halfWidth: number, private lifetime: number, strength = 1, target: THREE.ShaderMaterial | WakeBatch = CONTRAIL_MATERIAL, lead = 0, spacing = 2) {
    this.capacity = capacity;
    this.strength = strength;
    this.halfWidth = halfWidth;
    this.lead = lead;
    this.spacing = spacing;
    this.laneLen = clamp(60 + halfWidth * 50, 80, 300);
    // hull defaults by size: a runabout planes at 8-9 m/s, a yacht barely, a ship never; a ship churns more
    this.planingSpeed = halfWidth > 3.5 ? 1e3 : clamp(5 + 3 * halfWidth, 7, 40);
    this.churn = clamp(0.7 + 0.15 * halfWidth, 0.6, 1.4);
    this.wake = target instanceof WakeBatch;
    // extra vertex pairs for the live head of a wake ribbon (gap markers, transom, bow)
    const slots = capacity + 4;
    this.positions = new Float32Array(slots * 2 * 3);
    this.a = new Float32Array(slots * 2 * 4);
    this.geom = new Float32Array(slots * 2 * 4);
    this.ext = new Float32Array(slots * 2 * 4);
    this.ext2 = new Float32Array(slots * 2 * 2);
    if (target instanceof WakeBatch) { target.add(this); return; }
    const idx: number[] = [];
    for (let i = 0; i < slots - 1; i++) {
      const q = i * 2, b = q + 1, c = q + 2, e = q + 3;
      idx.push(q, c, b, b, c, e);
    }
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geo.setAttribute('aA', new THREE.BufferAttribute(this.a, 4));
    this.geo.setIndex(idx);
    this.geo.setDrawRange(0, 0);
    const mat = target.clone();
    mat.uniforms.uStrength.value = strength;
    this.mesh = new THREE.Mesh(this.geo, mat);
    this.mesh.frustumCulled = false;
    this.mesh.matrixAutoUpdate = false;
  }

  /** Ribbon width on side s (+1 right, -1 left) at distance d behind the transom: the Kelvin envelope (arm crest
   *  plus its skirt) while the arms show, narrowing to the turbulent lane once the shader has faded them out. In a
   *  turn the shader closes the inner arm on the track by up to 60 % and spreads the outer one by as much, so the
   *  two sides differ (r10: both sides used to take the outer width, and with the envelope 19.5 deg wide a
   *  ribbon 30 m astern of a float is wider than a taxi turn's radius: the inner edge ran past the turn's centre
   *  and every quad there folded over its neighbour, drawn twice with its across-coordinate mirrored, doubling
   *  the height pass; half the ribbon behind a float in a 15 m turn, a runabout in a 40 m one, a yacht in 60 m). */
  private wakeHalf(d: number, curv: number, s: number): number {
    const w0 = this.halfWidth;
    const lane = (w0 * 1.05 + 0.45 * Math.sqrt(Math.max(d, 0) * Math.max(w0, 0.15))) * 1.4;
    const armLen = this.laneLen * 2.5 * 1.6;   // the shader's arm length at the fastest speed factor
    const asym = clamp(curv * s * d * 0.6, -0.6, 0.6);   // > 0 on the inner side of the turn
    const armY = (w0 * 0.8 + (d + this.lead) * TAN_KELVIN) * (1 - asym) + (0.45 + 0.3 * w0 + 0.012 * d) * 3.0;
    const env = 1 - smoothstep(armLen, armLen * 1.15, d);
    // never narrower than the far map's texel-wide minimum lane
    let w = Math.max(lane, armY * env, 2.0);
    // the inner edge stops short of the turn's centre (the local radius 1 / curv), or the quads fold
    if (asym > 0) w = Math.min(w, 0.9 / Math.abs(curv));
    return w;
  }

  /** A jump longer than this between samples is the emitter leaving the water and coming back, not motion
   *  along it; it must stay well above the emission spacing (a ship samples every 12 m) or every sample of a
   *  large hull would read as a gap and chop its ribbon into invisible pieces. */
  private gapDist(speed: number): number {
    return Math.max(12, speed * 1.5, this.spacing * 3);
  }

  /** Pull point i toward the midpoint of its neighbours: the emitter (a float on a rolling, yawing hull, a boat
   *  in waves) wanders a few centimetres between samples and, drawn at centimetre texels, that made the lane
   *  centreline a zigzag with the sample period instead of the smooth track water actually keeps. */
  private relax(i: number): void {
    const pts = this.points;
    if (i < 1 || i >= pts.length - 1) return;
    const a = pts[i - 1], p = pts[i], b = pts[i + 1];
    if (a.fade === 0 || p.fade === 0 || b.fade === 0) return;
    p.x = 0.5 * p.x + 0.25 * (a.x + b.x);
    p.z = 0.5 * p.z + 0.25 * (a.z + b.z);
    const dx = b.x - a.x, dz = b.z - a.z, l = Math.hypot(dx, dz);
    if (l > 1e-6) { p.dx = dx / l; p.dz = dz / l; }
  }

  /** Path curvature at point i (1/m, signed: + turning toward the ribbon's +right side): the heading change
   *  between the two legs over their mean length. Measured every frame from the relaxed track (r10: measured
   *  once, when the point was relaxed while its newer neighbour still sat raw, it came out a third low on a
   *  15 m circle, and the width clamp that keeps the inner edge inside the turn relies on it). */
  private curvature(i: number): number {
    const pts = this.points;
    if (i < 1 || i >= pts.length - 1) return 0;
    const a = pts[i - 1], p = pts[i], b = pts[i + 1];
    if (a.fade === 0 || p.fade === 0 || b.fade === 0) return 0;
    // right = (-dz, dx), so a positive cross product (ax * bz - az * bx) is a turn toward +right
    const ax = p.x - a.x, az = p.z - a.z, bx = b.x - p.x, bz = b.z - p.z;
    const la = Math.hypot(ax, az), lb = Math.hypot(bx, bz);
    if (la < 1e-3 || lb < 1e-3) return 0;
    const cross = (ax * bz - az * bx) / (la * lb);
    const dot = clamp((ax * bx + az * bz) / (la * lb), -1, 1);
    return clamp(Math.atan2(cross, dot) / (0.5 * (la + lb)), -0.2, 0.2);
  }

  /** one vertex pair: the left vertex wL metres to the left of the track point, the right one wR to the right;
   *  aGeom.y carries the vertex's signed across-position (-wL / +wR), which interpolates linearly over the quad
   *  as the position does (side x half-width would not once the two sides differ) */
  private writeVertexPair(i: number, x: number, z: number, dx: number, dz: number, wL: number, wR: number, age: number, fade: number, speed: number, dist: number, curv: number, ageS: number, shift: number, odo: number, draft = this.draft, sink = this.sink): void {
    const rx = -dz, rz = dx;
    const p = this.positions, a = this.a, g = this.geom, e = this.ext, e2 = this.ext2;
    p[i * 6] = x - rx * wL; p[i * 6 + 1] = 0.05; p[i * 6 + 2] = z - rz * wL;
    p[i * 6 + 3] = x + rx * wR; p[i * 6 + 4] = 0.05; p[i * 6 + 5] = z + rz * wR;
    for (let k = 0; k < 2; k++) {
      const v = (i * 2 + k) * 4;
      a[v] = age; a[v + 1] = k === 0 ? -1 : 1; a[v + 2] = fade; a[v + 3] = speed;
      g[v] = dist; g[v + 1] = k === 0 ? -wL : wR; g[v + 2] = dx; g[v + 3] = dz;
      e[v] = curv; e[v + 1] = ageS; e[v + 2] = shift; e[v + 3] = odo;
      e2[(i * 2 + k) * 2] = draft; e2[(i * 2 + k) * 2 + 1] = sink;
    }
  }

  /**
   * Call every frame with the emitter's world position and travel direction (xz, need not be normalised).
   * `active` false lets the trail fade out and hides the hull head; `speed` in m/s.
   */
  update(x: number, z: number, dx: number, dz: number, time: number, active: boolean, speed: number): void {
    const RAMP = 2;
    const dl = Math.hypot(dx, dz);
    if (dl > 1e-6) { dx /= dl; dz /= dl; } else { dx = 1; dz = 0; }
    const fresh = Number.isNaN(this.lastX);
    const seedable = this.untouched;
    this.untouched = false;
    const dt = Number.isNaN(this.lastTime) ? 0 : Math.max(0, Math.min(time - this.lastTime, 0.2));
    this.lastTime = time;
    const dist = fresh ? 0 : Math.hypot(x - this.lastX, z - this.lastZ);
    // is the hull moving along its own forward axis or astern? (the head's bow wave only exists going ahead)
    let along = 1;
    if (!fresh && dist > 1e-3) along = ((x - this.lastX) * dx + (z - this.lastZ) * dz) / dist;
    // laid foam drifts with the surface (wind current); the newest points stay with the hull for a moment so
    // the lane still leaves the transom
    if (this.wake && dt > 0 && (WAKE_DRIFT.x !== 0 || WAKE_DRIFT.z !== 0)) {
      for (const p of this.points) {
        const k = smoothstep(0.5, 3, time - p.t);
        if (k > 0) { p.x += WAKE_DRIFT.x * dt * k; p.z += WAKE_DRIFT.z * dt * k; }
      }
    }
    if (!active) { if (Number.isNaN(this.dryFrom)) this.dryFrom = time; }
    else if (!Number.isNaN(this.dryFrom)) { this.drySpell = time - this.dryFrom; this.dryFrom = NaN; }
    if (active && (fresh || dist > Math.max(this.spacing, speed * 0.25))) {
      let pdx = dx, pdz = dz;
      if (!fresh) { const l = dist || 1; pdx = (x - this.lastX) / l; pdz = (z - this.lastZ) / l; }
      // the emitter left the surface (bounce, skip, take-off) and came back: close the old ribbon with a
      // zero-length invisible quad and start a new one here instead of bridging the gap with foam. Judged by
      // track distance (a jump no motion along the surface could make) and by time off the surface: a float
      // skipping at 40 m/s is clear for 0.6-1 s over a hop of 25-40 m, less than 1.5 s of track, and its lane
      // used to bridge water the hull never touched (r10: only the 2 s hops of a 48 m/s entry broke the lane).
      // The wet flag flickering for a frame over chop is not a skip (0.5 s)
      const gap = !fresh && (dist > this.gapDist(speed) || this.drySpell > GAP_DRY_S);
      this.drySpell = 0;
      if (gap) {
        // two invisible markers (at the old end and at the new start) so the bridging quad carries no foam
        const last = this.points[this.points.length - 1];
        if (last) { this.points.push({ ...last, fade: 0 }); this.points.push({ ...last, x, z, dx: pdx, dz: pdz, t: time, fade: 0 }); }
      }
      if (fresh || gap) this.ramp = RAMP;
      if (!fresh && !gap) this.odometer += dist;
      if (fresh && seedable && this.wake && speed > 1) {
        // an emitter placed already under way (a boat spawned on its route, the aircraft set up taxiing) has
        // been moving for a while: seed the trail it would have left along its track behind it (not one that
        // was airborne first: a landing aircraft used to get a 100 m lane the instant its floats touched)
        const step = Math.max(this.spacing, speed * 0.25);
        const nBack = Math.min(this.capacity - 1, Math.floor(Math.min(this.lifetime * 0.6, 60) * speed / step));
        this.odometer = nBack * step;
        for (let i = nBack; i >= 1; i--) this.points.push({ x: x - dx * step * i, z: z - dz * step * i, dx, dz, t: time - (step * i) / speed, fade: 1, speed, odo: (nBack - i) * step, curv: 0, draft: this.draft, sink: 0 });
        this.ramp = 0;
      }
      const fade = this.ramp > 0 ? 1 - this.ramp-- / (RAMP + 1) : 1;
      // the first point of a ribbon had no motion to take its direction from: align it with the second
      const prev = this.points[this.points.length - 1];
      if (prev && !gap && prev.fade > 0) {
        const before = this.points[this.points.length - 2];
        if (!before || before.fade === 0) { prev.dx = pdx; prev.dz = pdz; }
      }
      this.points.push({ x, z, dx: pdx, dz: pdz, t: time, fade, speed, odo: this.odometer, curv: 0, draft: this.draft, sink: this.sink });
      if (this.wake) this.relax(this.points.length - 2);
      while (this.points.length > this.capacity) this.points.shift();
      this.lastX = x; this.lastZ = z;
    }
    // drop expired
    while (this.points.length && time - this.points[0].t > this.lifetime) this.points.shift();
    const n = this.points.length;
    // a fast emitter fills the point buffer long before its oldest point expires: the oldest third of the
    // buffer ages out by position as well once the buffer is (nearly) full, so every trail tail fades
    const tailSpan = Math.max(1, Math.floor(this.capacity * 0.35));
    const full = smoothstep(0.6, 1.0, n / this.capacity);
    if (!this.wake) {
      for (let i = 0; i < n; i++) {
        const p = this.points[i];
        const tailAge = full * (1 - Math.min(1, (i + 0.5) / tailSpan));
        const age = Math.min(1, Math.max((time - p.t) / this.lifetime, tailAge));
        const cw = this.halfWidth * (0.6 + 1.8 * age);
        this.writeVertexPair(i, p.x, p.z, p.dx, p.dz, cw, cw, age, p.fade, p.speed, 0, 0, 0, 0, 0);
      }
      this.count = n;
      const geo = this.geo!;
      geo.attributes.position.needsUpdate = true;
      geo.attributes.aA.needsUpdate = true;
      geo.setDrawRange(0, Math.max(0, (n - 1) * 6));
      return;
    }
    // wake ribbon: distances behind the emitter, accumulated from the newest point
    const head = active;
    let d = head ? Math.hypot(x - (n ? this.points[n - 1].x : x), z - (n ? this.points[n - 1].z : z)) : 0;
    for (let i = n - 1; i >= 0; i--) {
      const p = this.points[i];
      if (i < n - 1) { const q = this.points[i + 1]; d += Math.hypot(q.x - p.x, q.z - p.z); }
      const tailAge = full * (1 - Math.min(1, (i + 0.5) / tailSpan));
      const ageS = time - p.t;
      const age = Math.min(1, Math.max(ageS / this.lifetime, tailAge));
      // stern waves laid at this point have travelled speed * ageS since; the hull has moved d: the surplus is
      // how far the train has run on past where a steadily moving hull would have it
      const shift = Math.max(0, Math.min(p.speed * ageS - d, 4 * this.lead + 40));
      // the end points take their neighbour's curvature (the tail quad is the widest: symmetric there, it would
      // still fold in a turn)
      p.curv = this.curvature(i === 0 ? 1 : i === n - 1 ? n - 2 : i);
      this.writeVertexPair(i, p.x, p.z, p.dx, p.dz, this.wakeHalf(d, p.curv, -1), this.wakeHalf(d, p.curv, 1), age, p.fade, p.speed, d, p.curv, ageS, shift, p.odo, p.draft, p.sink);
    }
    let count = n;
    if (head) {
      // live head: transom pair at the emitter, then the bow pair ahead of the stem; a gap point just before
      // the head (emitter back on the water this frame) keeps the head from bridging to the old ribbon
      const last = n ? this.points[n - 1] : null;
      const w = this.wakeHalf(0, 0, 1);
      const bridge = last && (last.fade === 0 || Math.hypot(x - last.x, z - last.z) > this.gapDist(speed) || this.drySpell > GAP_DRY_S);
      const odoHead = this.odometer + (last ? Math.hypot(x - last.x, z - last.z) : 0);
      if (bridge && last) {
        // invisible markers at both ends of the bridging quad
        this.writeVertexPair(count++, last.x, last.z, last.dx, last.dz, w, w, 0, 0, speed, 0, 0, 0, 0, odoHead);
        this.writeVertexPair(count++, x, z, dx, dz, w, w, 0, 0, speed, 0, 0, 0, 0, odoHead);
      }
      const bowMargin = 0.6 + 0.15 * speed + 0.4 * this.halfWidth;
      // a point laid this frame sits a few centimetres behind the transom pair: give the transom pair the same
      // direction so the sliver quad between them cannot fold over (the height pass adds, so a fold doubled
      // the elevation in a bright line across the stern)
      const close = last && !bridge && Math.hypot(x - last.x, z - last.z) < 0.5 ? last : null;
      const tdx = close ? close.dx : dx, tdz = close ? close.dz : dz;
      // a hull going astern pushes no bow wave: the head sees a negative speed
      const headSpeed = along < -0.2 ? -speed : speed;
      // a stopping hull: the last stern waves run on under and ahead of it
      const lastShift = last && !bridge ? Math.max(0, Math.min(last.speed * (time - last.t) - Math.hypot(x - last.x, z - last.z), 4 * this.lead + 40)) : 0;
      this.writeVertexPair(count, x, z, tdx, tdz, w, w, 0, 1, headSpeed, 0, 0, 0, lastShift, odoHead);
      const hx = x + dx * (this.lead + bowMargin), hz = z + dz * (this.lead + bowMargin);
      this.writeVertexPair(count + 1, hx, hz, dx, dz, w, w, 0, 1, headSpeed, -(this.lead + bowMargin), 0, 0, lastShift, odoHead + this.lead + bowMargin);
      count += 2;
    }
    this.count = count;
  }

  reset(): void {
    this.points.length = 0;
    this.lastX = NaN; this.lastZ = NaN; this.lastTime = NaN;
    this.odometer = 0;
    this.ramp = 0;
    this.dryFrom = NaN; this.drySpell = 0;
    this.untouched = true;
    this.count = 0;
    this.geo?.setDrawRange(0, 0);
  }
}
