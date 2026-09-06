import * as THREE from 'three';
import { FOG, PALETTE, SUN } from './palette.js';
import { sunDirection } from './sky.js';
import { clamp as clamp01, fbm, lerp, mulberry32, smoothstep } from './textures/core.js';
import { WORLD } from './world.js';
import {
  detailNormal,
  farGroundMap,
  grainMaps,
  GRAVEL_TILE,
  gravelMaps,
  horizonReflection,
  macroVariation,
  RELIEF_DEPTH,
  RELIEF_TILE,
  reliefMaps,
  rippleMap,
  sandMaps,
  savannaMaps,
  trackMaps,
  TRACKS_TILE,
  trackStamps,
  treadImprint,
  vergeMaps,
} from './textures/ground.js';

// ---------------------------------------------------------------------------
// Rolling forest floor with two roads graded into it: a dirt two-track, and the
// gravel mainline it runs out onto.
//
// One mesh, one draw call, but not one resolution: the far field is a 2.3 m
// grid and every cell within nine metres of a centreline is subdivided to
// 0.4 m, which is what it takes for wheel ruts and a crown to exist as
// geometry rather than as a normal map. Cells are stitched along the boundary
// so there are no T-junction cracks, and every normal is analytic so the
// duplicated vertices on cell seams shade identically.
//
// Both roads' samples live in one set of flat arrays with a per-sample road id,
// so one spatial lookup answers for both and everything keyed off it — the
// refinement mask, the scatter, the forest's planting exclusion — comes out
// right for free. Where the two overlap the profiles are blended by which road
// has more authority over that patch of ground, which is what makes the
// junction a junction rather than two ribbons crossing.
//
// Four tiling surface sets (packed track, graded gravel, loose verge, needle
// litter) are blended in the fragment shader from signed lateral road offsets,
// so the ruts, the crown strip and the verge are placed in road space and the
// surfaces themselves tile in world space. No decals, no z-fighting.
// ---------------------------------------------------------------------------

// Build the world without the mainline, for measuring what it costs. The
// mesh refinement, the scatter, the shader blend and the forest exclusion all
// hang off one lookup, so switching that lookup off at the source is the only
// way to get a like-for-like baseline out of the same code.
//   NO_MAIN=1 node tools/mainprobe.mjs
const NO_MAIN = typeof process !== 'undefined' && !!process.env?.NO_MAIN;

const SIZE = 300;
const COARSE = 128; // 2.34 m cells in the far field
const FINE = 8; // sub-quads per corridor cell -> 0.29 m
// The mainline is graded: nothing on it is smaller than the ditch, so half the
// resolution carries it and it costs a fifth of the triangles a two-track does.
// 4 divides 8, which is what lets the two levels share an edge without a crack.
const FINE_MAIN = 4;
// Narrowed from 9 m to pay for the finer grid inside it. 6.5 m still reaches
// three metres past the shoulder, which is as far as the graded profile goes.
const CORRIDOR = 6.5;
// Outer edge of the dense region, in units of CORRIDOR. Anything keyed off this
// has to stay inside CORRIDOR + one coarse cell or it lands on ground the fine
// grid does not cover and gets sampled at 2.3 m.
const NEAR_IN = 0.55;
const NEAR_OUT = 1.2;

// The running surface used to be 3.6 m wide with a 1.7 m shoulder, so seven
// metres of similar-looking dirt with a pair of half-metre rut bands somewhere
// in the middle of it — a graded forest road, not a two-track. At 1.25 m half
// width the ruts sit at 68% of the way out and the trail *is* the two-track.
const ROAD_HALF = 1.25; // compacted running surface, half width
const SHOULDER = 1.15; // loose material beyond the compacted surface
const RUT_C = 0.845; // rut centres — the truck's track half width, so it drives in its own ruts
const RUT_W = 0.32;

// Vertical budget: the suspension has 0.11 m of travel and the body rides on
// heightAt() at the truck's centre, so the crown-to-rut drop has to stay
// inside that or the wheels hang above the dirt. CROWN_H + RUT_D is the whole
// of it, which is why the apparent depth comes from LIP_H instead — dirt
// squeezed up either side of the trough is above the surface, not below it, so
// it buys relief for free.
const CROWN_H = 0.028;
const RUT_D = 0.082;
const LIP_H = 0.046;
const BERM_H = 0.24;

// ---------------------------------------------------------------------------
// The mainline.
//
// A logging road, not the trail scaled up. Everything about it is the result of
// a grader having been down it: it is wide enough for a loaded truck to pass a
// pickup, it is crowned hard enough to throw water off before a rut can form,
// it drains into a ditch on both sides, and the material is imported crushed
// rock rather than whatever the trail happened to be cut through.
//
// The vertical budget that constrains the trail does not apply here — the whole
// point is that there is nothing to fall into — so the numbers are set by
// drainage instead. 4% across the running surface and 7.5% down the shoulder is
// what a forest road standard actually asks for.
// ---------------------------------------------------------------------------
const MAIN_HALF = 3.4; // graded running surface, half width — 6.8 m of road
const MAIN_SHOULDER = 1.45; // unsorted coarse aggregate sloughing off the edge
const MAIN_DITCH = 1.75; // ditch, measured out from the shoulder edge
// Half the track of a loaded truck, which is wider than the pickup's 1.69 m —
// and that is the point. On a single-lane mainline with turnouts everything
// drives down the middle, so there is one pair of wheel paths and it is set by
// the largest vehicle that uses the road, not by the one the player is in.
const MAIN_RUT_C = 1.12;
const MAIN_RUT_W = 0.52;
const MAIN_CROWN = 0.136;
const MAIN_SHED = 0.078; // extra crossfall per metre of shoulder
const MAIN_DITCH_D = 0.46;
// A graded surface still takes a wheel path, it is just a centimetre of it
// rather than eight. Above about 3 cm it stops reading as maintained.
// Up to the ceiling from 1.7 cm: the ruts read as painted at 1.7, and the rest
// of the relief they need comes from the normal term in the shader rather than
// from taking the mesh past what a maintained road would show. The truck's
// track (0.845) sits on the inner wall of a 1.12 m path, so this adds under a
// centimetre of slow lateral tilt to the ride and nothing to its spectrum.
const MAIN_RUT_D = 0.03;
// Outer edge of the graded platform: the ditch's far bank, where the cut or
// fill batter starts.
const MAIN_EDGE = MAIN_HALF + MAIN_SHOULDER + MAIN_DITCH;
// Has to cover MAIN_EDGE plus the widest batter the grade line can ask for, or
// the batter lands on ground the fine grid does not reach.
const MAIN_CORRIDOR = 9.2;
// How far the trail's own distance metric has to be offset to make the two
// comparable. Everything downstream of `roadDistance` — the forest's planting
// exclusion, the undergrowth's inner boundary, the deadwood corridor — is
// keyed off "metres from the trail centreline", where the surface ends at
// ROAD_HALF. Reporting the raw distance to the mainline would plant trees in
// the middle of it, so what comes back is the distance to its *edge*, shifted
// so the two roads' verges start at the same number.
const MAIN_DIST_BIAS = MAIN_EDGE - ROAD_HALF - 0.2;

/** Mean colour of an sRGB DataTexture, in linear, as a Vector3 (every 4th texel). */
function texMeanLinear(tex) {
  const d = tex.image && tex.image.data;
  const out = new THREE.Vector3(0.15, 0.13, 0.11);
  if (!d) return out;
  const c = new THREE.Color();
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  for (let i = 0; i < d.length; i += 16) {
    c.setRGB(d[i] / 255, d[i + 1] / 255, d[i + 2] / 255, THREE.SRGBColorSpace);
    r += c.r;
    g += c.g;
    b += c.b;
    n++;
  }
  return n ? out.set(r / n, g / n, b / n) : out;
}

/** Direction toward the sun, matching sky.js. Used for the relief sun march. */
function sunVector() {
  const phi = THREE.MathUtils.degToRad(90 - SUN.elevation);
  const theta = THREE.MathUtils.degToRad(SUN.azimuth);
  return new THREE.Vector3().setFromSphericalCoords(1, phi, theta);
}

// ---------------------------------------------------------------------------
// The savanna landform.
//
// Everything that is *somewhere* — the camp pad, the overlook, the dry river,
// the water hole — is placed in road parameters off the same anchors world.js
// hands the other modules, and resolved against the mainline curve once at
// module load. The base height field reads these, so the ground under each
// feature is shaped for it (a site graded on ground that happened to be flat,
// a road that crests where the ridge is) rather than the feature being pressed
// into ground that ignores it.
// ---------------------------------------------------------------------------

/** Mainline t of the scenic overlook: the crest the road tops before the basin. */
const OVERLOOK_T = 0.77;
/** Mainline t where the dry river crosses under the road. */
const RIVER_T = 0.68;
/** The water hole: past the pride, on the open side, at the bottom of the basin. */
const HOLE_T = 0.83;
const HOLE_OFFSET = 46;
// Camp pad. An ellipse rather than the layout's 40 m disc, because 40 m from an
// anchor 34 m off the road is the road: the pad stops short of the ditch on the
// road side and runs out further behind, where a site has room.
const PAD_R_ROAD = 21;
const PAD_R_FAR = 30;
const PAD_R_SIDE = 27;
/** Crossfall of the pad, up and away from the road so it drains into the ditch. */
const PAD_SLOPE = 0.011;
/** Natural level the site was chosen for, metres. */
const CAMP_LEVEL = 1.7;
// The dry river: half width of the sandy floor, width of each bank, depth.
const RIVER_HALF = 3.4;
const RIVER_BANK = 2.6;
const RIVER_DEPTH = 1.45;
// The water hole: radius of the trampled dish, and how deep the middle is.
const HOLE_BASIN = 13;
const HOLE_DEPTH = 1.25;
/** Natural level of the ground round the hole, metres, before the dish is cut. */
const HOLE_LEVEL = 0.9;

function layoutLandform() {
  const mc = createMainCurve();
  const at = (t, side, off) => {
    const p = mc.getPoint(t);
    const tg = mc.getTangent(t).normalize();
    return { x: p.x - tg.z * off * side, z: p.z + tg.x * off * side, rx: p.x, rz: p.z, tx: tg.x, tz: tg.z };
  };
  const camp = at(WORLD.camp.t, WORLD.camp.side, WORLD.camp.offset);
  // access axis: from the road out to the pad centre, and its perpendicular
  const al = Math.hypot(camp.x - camp.rx, camp.z - camp.rz) || 1;
  camp.ax = (camp.x - camp.rx) / al;
  camp.az = (camp.z - camp.rz) / al;
  camp.bx = -camp.az;
  camp.bz = camp.ax;
  const look = at(OVERLOOK_T, 1, 0);
  // The turnout and the board are on the pride's side: the view is of them.
  look.side = WORLD.lions.side;
  const hole = at(HOLE_T, WORLD.lions.side, HOLE_OFFSET);
  hole.side = WORLD.lions.side;
  // The pride's rest point: the same anchor wildlife/index.js resolves through
  // world.js's anchorPoint (mainPoint(t) is this curve), so the trodden ring
  // the ground shader draws is centred where the lions lie.
  const pride = at(WORLD.lions.t, WORLD.lions.side, WORLD.lions.offset);
  const rx = at(RIVER_T, 1, 0);
  // The river in the road's frame at the crossing: meanders down from the
  // north, crosses at about seventy degrees, and wanders off south. The
  // polyline is what everything measures its distance to.
  const rl = -rx.tz; // lateral left
  const rlz = rx.tx;
  const river = [
    [-14, 68],
    [-9, 38],
    [-3, 14],
    [0, 0],
    [4, -16],
    [9, -34],
    [5, -62],
    [14, -96],
  ].map(([u, v]) => ({ x: rx.x + rx.tx * u + rl * v, z: rx.z + rx.tz * u + rlz * v }));
  return { camp, look, hole, pride, river, riverCross: rx };
}

const LAND = layoutLandform();

/**
 * Distance to the river polyline and the arc length along it. Eight points, so
 * this is cheaper than one fbm and runs everywhere baseHeight does.
 */
function riverDistance(x, z, out) {
  const pts = LAND.river;
  let best = 1e9;
  let along = 0;
  let acc = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const len2 = dx * dx + dz * dz;
    let t = ((x - a.x) * dx + (z - a.z) * dz) / len2;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const px = a.x + dx * t - x;
    const pz = a.z + dz * t - z;
    const d = px * px + pz * pz;
    if (d < best) {
      best = d;
      along = acc + Math.sqrt(len2) * t;
    }
    acc += Math.sqrt(len2);
  }
  out.d = Math.sqrt(best);
  out.along = along;
  out.total = acc;
  return out;
}
const _riv = { d: 0, along: 0, total: 0 };

function baseHeight(x, z) {
  const hills = fbm(x * 0.0052 + 40, z * 0.0052 + 12, { octaves: 4, period: 64, seed: 71 });
  const ridges = fbm(x * 0.0135 + 7, z * 0.0135 + 21, { octaves: 3, period: 64, seed: 51 });
  const medium = fbm(x * 0.021 + 3, z * 0.021 + 9, { octaves: 4, period: 64, seed: 12 });
  const fine = fbm(x * 0.075, z * 0.075, { octaves: 3, period: 64, seed: 33 });
  // The relief that makes the drive is worth nothing past the terrain edge:
  // out there the same nine-metre swells, carried on the forest's straw skirt
  // and seen from two metres up, were a range of dunes a few hundred metres
  // off, in front of the real hills. The savanna is a plain; it flattens out
  // past the square so the eye runs straight to the escarpment.
  const r = Math.hypot(x, z);
  const plain = smoothstep(150, 330, r);
  let y =
    (hills - 0.5) * 18 * (1 - plain * 0.82) +
    (ridges - 0.5) * 6.5 * (1 - plain * 0.7) +
    (medium - 0.5) * 2.6 +
    (fine - 0.5) * 0.7;

  // The camp was graded on ground that was already nearly level — nobody sites
  // a camp on a slope and then moves five metres of earth to fix it. Most of
  // the natural relief is taken out over a wide soft footprint; what is left is
  // what the pad's cut and fill has to absorb, and it is about a metre.
  const cdx = x - LAND.camp.x;
  const cdz = z - LAND.camp.z;
  y = lerp(y, CAMP_LEVEL, (1 - smoothstep(20, 58, Math.hypot(cdx, cdz))) * 0.62);

  // Two rises on the mainline, both as ridges running *across* the road so it
  // genuinely climbs over them rather than along them. The second is the
  // overlook: 3.2 m over a 33 m half width is a 7% pull at the steepest, which
  // the grader's blur softens to about 5 — a real climb in a 6 kph truck, not a
  // speed bump. The crests are what the ride budget is spent on: the vertical
  // acceleration over a crest is speed squared times its curvature, and at
  // 3.6 m over 28 m that came to 0.8 m/s² at cruise, most of the mainline's
  // whole figure. These widths halve it and the view from the top is the same.
  {
    const L = LAND.look;
    const u = (x - L.rx) * L.tx + (z - L.rz) * L.tz;
    const v = -(x - L.rx) * L.tz + (z - L.rz) * L.tx;
    y += 3.2 * Math.exp(-(u * u) / (33 * 33)) * (1 - smoothstep(48, 110, Math.abs(v)));
  }
  {
    const u = (x - 7.0) * 0.966 + (z - 20.3) * -0.259;
    const v = -(x - 7.0) * -0.259 + (z - 20.3) * 0.966;
    y += 1.5 * Math.exp(-(u * u) / (26 * 26)) * (1 - smoothstep(30, 80, Math.abs(v)));
  }

  // The basin past the overlook: the ground falls away toward the water hole,
  // which is at the bottom of it because that is where water goes. The ground
  // immediately round the hole is pulled toward one level first — the open
  // slope down to the east would otherwise run straight through the dish and
  // the water would stand on a hillside.
  const hdx = x - LAND.hole.x;
  const hdz = z - LAND.hole.z;
  const hd = Math.hypot(hdx, hdz);
  y = lerp(y, HOLE_LEVEL, (1 - smoothstep(12, 46, hd)) * 0.85);
  y -= 1.6 * Math.exp(-(hd * hd) / (48 * 48));

  // A shallow drainage line the dry river runs down. The channel itself is cut
  // in surfaceInfo — it is not part of the base the road grades against, or the
  // road would drop into it instead of crossing on a fill.
  const rv = riverDistance(x, z, _riv);
  y -= 1.2 * (1 - smoothstep(4, 32, rv.d)) * (1 - smoothstep(rv.total - 24, rv.total, rv.along)) * smoothstep(0, 22, rv.along);

  // The ground used to rise into a rim past 86 m all the way round, so the mesh
  // boundary never showed as a straight edge. It still does behind the start
  // and along the forested west, where trees hide it anyway; toward the east
  // and south-east — where the savanna opens out below the overlook — the rim
  // is all but gone and the far hills mesh carries the horizon instead.
  const open = smoothstep(-0.35, 0.55, (x * 0.78 - z * 0.62) / Math.max(r, 1));
  // A ridge, not a plateau: past 200 m it falls back to the plain, so what
  // stands behind the start is a low rise with the escarpment showing over it.
  y += smoothstep(86, 152, r) * (1 - smoothstep(190, 320, r) * 0.72) * 11 * (1 - open * 0.92);

  // Distant hills, for the far mesh. They start past 400 m: the forest's own
  // ground skirt runs to 420 m on this same function with a straw plain tile
  // on it, and hills inside that range rendered on that tile as bright dunes
  // fifty metres off. Out here they stand on the far mesh, inside the haze
  // layer, and read as what they are — an escarpment a kilometre away. The
  // camera's far plane is 900 m and the fog takes the ground to sky by 830,
  // so the rise is complete by 720 and the crests sit in the last blue band.
  const far = smoothstep(390, 720, r);
  if (far > 0) {
    const h1 = fbm(x * 0.0016 + 3, z * 0.0016 + 8, { octaves: 4, period: 64, seed: 401 });
    const h2 = fbm(x * 0.0046 + 1, z * 0.0046 + 5, { octaves: 3, period: 64, seed: 409 });
    // A flat-topped rise to the east — the one silhouette that says this is
    // not the Cascades — and rolling hills elsewhere.
    const mesa = smoothstep(0.62, 0.8, fbm(x * 0.0011 + 9, z * 0.0011 + 2, { octaves: 2, period: 64, seed: 419 }));
    y += far * (Math.max(0, h1 - 0.4) * 300 + (h2 - 0.5) * 56 + mesa * 90);
  }
  return y;
}

export function createRoadCurve() {
  const pts = [];
  const n = 15;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const z = -SIZE * 0.56 + t * SIZE * 1.12;
    // Three wander terms rather than two, and a much wider slow one. The trail
    // ran 354 m nearly straight down the map; this is about 456 m of the same
    // ground, which is a longer drive without a bigger world to plant.
    //
    // Amplitudes are bounded by curvature, not by the map: the terrain's berm
    // logic is tuned for a 30 m radius as the tightest the centreline gets, and
    // the radius from a sinusoid goes as A*omega^2. The fast term is the one
    // that spends that budget, so it stays small.
    const x =
      Math.sin(t * Math.PI * 3.2) * 38 + Math.sin(t * Math.PI * 6.3 + 1.2) * 10 + Math.sin(t * Math.PI * 1.3 + 0.4) * 16;
    pts.push(new THREE.Vector3(x, 0, z));
  }
  return new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.5);
}

/**
 * The gravel mainline.
 *
 * Laid out to cross the trail at about fifty degrees near t = 0.575, which is
 * sixty-odd metres of driving from where every beauty view starts — far enough
 * that it does not turn up in the back of the existing framings, close enough
 * that it is a few seconds away. The control point at the crossing is the
 * trail's own position there, so the junction is on both curves by construction
 * rather than by a fit.
 *
 * The alignment either side is deliberately slack: a graded road is surveyed
 * with long radii, and a mainline that wiggles like the trail does would read as
 * the same road painted a different colour. Both ends climb into the rim the
 * base height field raises past 86 m, so the road leaves the frame over a crest
 * instead of stopping.
 */
export function createMainCurve() {
  const pts = [
    [-146, 82],
    [-112, 63],
    [-76, 47],
    [-42, 34],
    [-12.3, 25.2],
    [17, 17.5],
    [52, 5],
    [86, -13],
    [118, -40],
    [150, -78],
  ];
  return new THREE.CatmullRomCurve3(
    pts.map(([x, z]) => new THREE.Vector3(x, 0, z)),
    false,
    'catmullrom',
    0.5,
  );
}

export function createTerrain({ env = null } = {}) {
  const curve = createRoadCurve();
  const mainCurve = createMainCurve();

  // --- sample and grade both centrelines -----------------------------------
  // 1100 rather than 900 because the centreline is a third longer than it was;
  // this keeps the spacing at half a metre, which is what the grading blur and
  // the along-road noise below are tuned against.
  const SAMPLES = 1100;
  // The mainline is sampled at the same half metre. It carries no feature
  // finer than the ditch, but `lat` is taken from the nearest sample's own
  // frame, and on a wide road a coarse frame puts a visible kink in the crown.
  const MSAMPLES = Math.max(320, Math.round(mainCurve.getLength() / 0.5));
  const TOTAL = SAMPLES + MSAMPLES;
  const cx = new Float32Array(TOTAL);
  const cz = new Float32Array(TOTAL);
  const cy = new Float32Array(TOTAL);
  const ctx = new Float32Array(TOTAL); // unit tangent
  const ctz = new Float32Array(TOTAL);
  const cs = new Float32Array(TOTAL); // arc length from that road's own start
  const ckn = new Float32Array(TOTAL);
  // 0 for the trail, 1 for the mainline. One array of samples and one grid over
  // it, so a single walk answers for both roads.
  const crid = new Uint8Array(TOTAL);
  const tmp = new THREE.Vector3();

  /**
   * Sample one curve into the shared arrays at [off, off + n).
   *
   * Arc length accumulates per road, never across the join — the along-road
   * noise, the tyre print and the streak fields are all keyed off it, and a
   * value that carried on counting from the trail's 427 m would step the whole
   * lot by that much the instant the mainline won the nearest-sample test.
   */
  function sampleCurve(src, off, n, id) {
    for (let i = 0; i < n; i++) {
      src.getPoint(i / (n - 1), tmp);
      cx[off + i] = tmp.x;
      cz[off + i] = tmp.z;
      cy[off + i] = baseHeight(tmp.x, tmp.z);
      crid[off + i] = id;
    }
    for (let i = 0; i < n; i++) {
      const a = off + Math.max(0, i - 1);
      const b = off + Math.min(n - 1, i + 1);
      const dx = cx[b] - cx[a];
      const dz = cz[b] - cz[a];
      const len = Math.hypot(dx, dz) || 1;
      ctx[off + i] = dx / len;
      ctz[off + i] = dz / len;
      cs[off + i] =
        i === 0 ? 0 : cs[off + i - 1] + Math.hypot(cx[off + i] - cx[off + i - 1], cz[off + i] - cz[off + i - 1]);
    }
    // Signed curvature, projected onto the same lateral frame `lat` uses, so
    // its sign says which side of the road is the *inside* of the bend. A truck
    // pushes material to the outside of every corner and cuts the inside, which
    // is the one thing that tells a bend apart from a straight from ground level.
    for (let i = 0; i < n; i++) {
      const a = off + Math.max(0, i - 8);
      const b = off + Math.min(n - 1, i + 8);
      const ds = Math.max(1e-3, cs[b] - cs[a]);
      const dtx = (ctx[b] - ctx[a]) / ds;
      const dtz = (ctz[b] - ctz[a]) / ds;
      ckn[off + i] = dtx * ctz[off + i] - dtz * ctx[off + i];
    }
  }

  /** Triangular box blur of the height run [off, off + n), in place. */
  function gradeLine(off, n, w) {
    const smoothed = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      let s = 0;
      let c = 0;
      for (let j = -w; j <= w; j++) {
        const k = i + j;
        if (k < 0 || k >= n) continue;
        const g = 1 - Math.abs(j) / (w + 1);
        s += cy[off + k] * g;
        c += g;
      }
      smoothed[i] = s / c;
    }
    for (let i = 0; i < n; i++) cy[off + i] = smoothed[i];
  }

  sampleCurve(curve, 0, SAMPLES, 0);
  sampleCurve(mainCurve, SAMPLES, MSAMPLES, 1);

  // a grader would smooth the profile out; do the same with a wide box blur
  gradeLine(0, SAMPLES, 26);
  // The mainline is surveyed rather than worn in, so its vertical alignment is
  // much longer: 24 samples is a ±12 m running mean, which flattens the 13 m
  // and 48 m components of the ground out entirely and leaves the road climbing
  // and falling only with the hills. What it does not survive is being widened
  // further — the deviation from natural ground is what the cut and fill batter
  // has to absorb, and the batter has to fit inside MAIN_CORRIDOR.
  gradeLine(SAMPLES, MSAMPLES, 24);

  // --- the junction --------------------------------------------------------
  // Found rather than declared. The mainline has a control point on the trail,
  // so the crossing exists by construction, but which sample it lands on
  // depends on both curves' parameterisation — and the apron, the ditch fill
  // and the approach grade are all placed off it.
  let jTrail = 0;
  let jMain = SAMPLES;
  {
    let best = 1e9;
    for (let i = 0; i < SAMPLES; i += 2) {
      for (let j = SAMPLES; j < TOTAL; j += 2) {
        const d = (cx[i] - cx[j]) ** 2 + (cz[i] - cz[j]) ** 2;
        if (d < best) {
          best = d;
          jTrail = i;
          jMain = j;
        }
      }
    }
  }
  const JUNC_T = cs[jTrail]; // arc length along the trail, metres
  const JUNC_M = cs[jMain]; // arc length along the mainline
  const JX = cx[jMain];
  const JZ = cz[jMain];

  // The spur has to arrive at the mainline's own surface, or the crossing is a
  // step. The trail's grade line is pulled onto the mainline's over the last
  // thirty metres of approach, which is exactly what a real spur mouth does —
  // it gives up its own profile and takes the road's.
  {
    const blended = new Float32Array(SAMPLES);
    for (let i = 0; i < SAMPLES; i++) {
      let best = 1e9;
      let bj = jMain;
      for (let j = SAMPLES; j < TOTAL; j++) {
        const d = (cx[i] - cx[j]) ** 2 + (cz[i] - cz[j]) ** 2;
        if (d < best) {
          best = d;
          bj = j;
        }
      }
      const d = Math.sqrt(best);
      const w = 1 - smoothstep(9, 34, d);
      if (w <= 0) {
        blended[i] = cy[i];
        continue;
      }
      // the mainline's *surface* at that offset, crown included, not its
      // centreline — the spur meets the shoulder, which is 14 cm lower
      const lat = Math.min(MAIN_HALF, d);
      const target = cy[bj] - MAIN_CROWN * (lat / MAIN_HALF) ** 2;
      blended[i] = lerp(cy[i], target, w);
    }
    for (let i = 0; i < SAMPLES; i++) cy[i] = blended[i];
    // The blend has a kink where it starts; a short blur takes it out without
    // undoing the wide grading that produced either input.
    gradeLine(0, SAMPLES, 9);
  }

  // --- uniform grid over the centreline samples ----------------------------
  // Flat typed arrays, not a Map: the mesh build asks for the nearest road
  // sample about half a million times and a hashed bucket lookup per ring cell
  // costs seconds of boot time on its own.
  const CELL = 8;
  const GRID = 44;
  const ORIGIN = -176;
  const cellOf = (v) => Math.floor((v - ORIGIN) / CELL);
  const counts = new Int32Array(GRID * GRID + 1);
  const cellIndex = new Int32Array(TOTAL);
  for (let i = 0; i < TOTAL; i++) {
    const ix = Math.min(GRID - 1, Math.max(0, cellOf(cx[i])));
    const iz = Math.min(GRID - 1, Math.max(0, cellOf(cz[i])));
    cellIndex[i] = iz * GRID + ix;
    counts[cellIndex[i] + 1]++;
  }
  for (let i = 0; i < GRID * GRID; i++) counts[i + 1] += counts[i];
  const items = new Int32Array(TOTAL);
  const cursor = counts.slice(0, GRID * GRID);
  for (let i = 0; i < TOTAL; i++) items[cursor[cellIndex[i]]++] = i;

  const makeNear = () => ({ dist: 1e6, lat: 1e6, y: 0, t: 0, s: 0, k: 0, tx: 0, tz: 1 });
  const _near = { t: makeNear(), m: makeNear() };

  /** Fill one road's result from sample `bi`, or leave it out of range. */
  function fillNear(out, bi, x, z, off, n, d2) {
    if (bi < 0) {
      out.dist = 1e6;
      out.lat = 1e6;
      out.y = 0;
      out.t = 0;
      out.s = 0;
      out.k = 0;
      out.tx = 0;
      out.tz = 1;
      return;
    }
    const dx = x - cx[bi];
    const dz = z - cz[bi];
    out.dist = Math.sqrt(d2);
    out.lat = dx * ctz[bi] - dz * ctx[bi];
    out.t = (bi - off) / (n - 1);
    // Arc length projected onto the segment, not the sample's own arc length.
    // The samples are 0.37 m apart and which one is nearest flips about as you
    // move sideways, so the raw value jitters by more than a tyre lug pitch —
    // enough to turn the road-space tread print into noise.
    const along = dx * ctx[bi] + dz * ctz[bi];
    out.s = cs[bi] + along;
    // The grade line, projected the same way. Reading the nearest sample's
    // height alone made the profile a staircase with a tread of one sample:
    // nothing on a road that never climbed more than a percent, and a 4 cm
    // riser every 0.4 m — a 20 Hz chop at cruising speed — once the mainline
    // had a rise worth the name. One central difference per lookup.
    const lo = Math.max(off, bi - 1);
    const hi = Math.min(off + n - 1, bi + 1);
    const ds = cs[hi] - cs[lo];
    // clamped to the sample pitch: past either end of a road the projection
    // runs on for metres, and the grade must not run on with it
    out.y = cy[bi] + (ds > 1e-6 ? ((cy[hi] - cy[lo]) / ds) * Math.max(-0.4, Math.min(0.4, along)) : 0);
    out.k = ckn[bi];
    out.tx = ctx[bi];
    out.tz = ctz[bi];
  }

  /**
   * Nearest centreline sample on *each* road, with the signed perpendicular
   * offset. One grid walk answers both, which is the whole reason the two roads
   * share a sample array: the alternative is two walks, and this function is on
   * the hot path of every vertex, every scatter placement and every tree.
   *
   * The ring loop stops when both roads are confirmed. Confirming a road that
   * is genuinely far away costs rings, so a road further out than the widest
   * thing keyed off it — the forest's far-billboard exclusion, at 24 m — is
   * allowed to come back approximate.
   */
  function nearestRoad(x, z, out = _near) {
    const ix = cellOf(x);
    const iz = cellOf(z);
    let bestT = 1e9;
    let bestM = 1e9;
    let biT = -1;
    let biM = -1;
    for (let r = 0; r <= 6; r++) {
      const x0 = Math.max(0, ix - r);
      const x1 = Math.min(GRID - 1, ix + r);
      const z0 = Math.max(0, iz - r);
      const z1 = Math.min(GRID - 1, iz + r);
      for (let jz = z0; jz <= z1; jz++) {
        for (let jx = x0; jx <= x1; jx++) {
          // only the new ring
          if (r > 0 && jx > ix - r && jx < ix + r && jz > iz - r && jz < iz + r) continue;
          const c = jz * GRID + jx;
          for (let k = counts[c]; k < counts[c + 1]; k++) {
            const i = items[k];
            const dx = cx[i] - x;
            const dz = cz[i] - z;
            const d = dx * dx + dz * dz;
            if (crid[i]) {
              if (d < bestM) {
                bestM = d;
                biM = i;
              }
            } else if (d < bestT) {
              bestT = d;
              biT = i;
            }
          }
        }
      }
      // everything still unsearched is at least r cells away
      const rr = (r * CELL) ** 2;
      const okT = biT >= 0 && bestT <= rr;
      // 32 m is past everything keyed off the mainline: its profile dies at 13,
      // and the widest forest rule that can see it — the far billboards' 24 m
      // exclusion — is inside it. Giving up out there only ever reports the
      // mainline as *further* than it is, which plants nothing anywhere it
      // should not be, and it is worth about a second of boot.
      const okM = (biM >= 0 && bestM <= rr) || rr >= 1000;
      if (okT && okM) break;
    }
    fillNear(out.t, biT, x, z, 0, SAMPLES, bestT);
    fillNear(out.m, biM, x, z, SAMPLES, MSAMPLES, bestM);
    if (NO_MAIN) out.m.dist = 1e6;
    return out;
  }

  /** Lateral wander of the two-track inside its corridor, in metres. */
  function roadShift(s) {
    return (fbm(s * 0.048, 3.7, { octaves: 3, period: 64, seed: 88 }) - 0.5) * 1.15;
  }

  /**
   * The same two for the mainline, at a fraction of the amplitude.
   *
   * A graded road wanders because the grader's own line does, not because the
   * traffic picks its way — so the crown drifts by a few tens of centimetres
   * over tens of metres and the *edge* is where the irregularity lives, where
   * the shoulder sloughs and the ditch silts. Running the trail's numbers here
   * was the first thing tried and it read as a wide two-track.
   */
  function mainShift(s) {
    return (fbm(s * 0.019, 6.1, { octaves: 3, period: 64, seed: 331 }) - 0.5) * 0.72;
  }

  function mainWobble(s) {
    return (
      (fbm(s * 0.062, 4.4, { octaves: 3, period: 64, seed: 337 }) - 0.5) * 0.62 +
      (fbm(s * 0.27, 1.9, { octaves: 2, period: 64, seed: 349 }) - 0.5) * 0.24
    );
  }

  /**
   * Junction influence in the mainline's own frame, 0-1.
   *
   * A lozenge twenty metres along the road and fifteen across it, full strength
   * over the middle seven by six: the apron a loaded truck needs to swing off a
   * mainline and onto a spur without dropping a wheel in the ditch. Everything
   * about the junction is driven off this — the platform widens, the crown
   * flattens so a vehicle can cross it, the ditch is culverted through, and the
   * shader scuffs the surface and drags mud out of the trail onto it.
   *
   * Down twice from where it started, and the overhead mask renders are what
   * settled it both times. At the first numbers the union of this, the trail's
   * flare and the forest's own clearance was forty metres of open scuffed
   * ground with two roads somewhere inside it, which is a landing, not a
   * junction. A junction is legible because two roads *of different widths*
   * meet: the moment the disturbed ground is wider than either of them, there
   * is nothing in the frame with an edge on it and the eye has nothing to read.
   * The apron has to stay narrower than the mainline is long and shorter than
   * the mainline is wide, or it stops being a feature of the road and becomes
   * the place the road used to be.
   */
  function apronMain(s, ax) {
    return (1 - smoothstep(3.5, 10, Math.abs(s - JUNC_M))) * (1 - smoothstep(3.0, 7.5, ax));
  }

  /** Junction influence in the trail's frame: the flared mouth of the spur. */
  function apronTrail(s, ax) {
    return (1 - smoothstep(3, 11, Math.abs(s - JUNC_T))) * (1 - smoothstep(2.0, 5.5, ax));
  }

  /**
   * The culvert: the few metres of mainline the spur actually crosses.
   *
   * Split out of `apronMain` because the two want completely different lengths
   * and running them off one number cost the junction its legibility. The
   * apron — scuffing, mud, a wider platform — is twenty metres long, because
   * that is how much ground a truck disturbs swinging a trailer off a road.
   * The ditch, though, is culverted for the length of the pipe and no further:
   * about six metres, with the ditch running again either side of it.
   *
   * Keyed off the same lozenge, the ditch, the crown and the windrow all
   * disappeared for twenty metres in each direction — which is to say every
   * feature that says "graded road" was switched off across exactly the piece
   * of road the player arrives at and looks at. Coming up the spur you saw an
   * open scuffed clearing with a two-track ending in it; the road was there,
   * and had been stripped of everything that identified it as one. A ditch and
   * a windrow crossing the view are what make a forest road read as a road
   * from thirty metres, and they have to survive the junction.
   */
  function culvert(s) {
    return 1 - smoothstep(3.2, 6.5, Math.abs(s - JUNC_M));
  }

  // --- the savanna features, in the mainline's frame --------------------------
  // Arc length along the mainline of the camp access, the overlook and the river
  // crossing, found by nearest sample the same way the junction is.
  function mainArcAt(px, pz) {
    let best = 1e9;
    let bj = SAMPLES;
    for (let j = SAMPLES; j < TOTAL; j++) {
      const d = (cx[j] - px) ** 2 + (cz[j] - pz) ** 2;
      if (d < best) {
        best = d;
        bj = j;
      }
    }
    return bj;
  }
  const jAccess = mainArcAt(LAND.camp.rx, LAND.camp.rz);
  const jLook = mainArcAt(LAND.look.rx, LAND.look.rz);
  const jRiver = mainArcAt(LAND.riverCross.rx, LAND.riverCross.rz);
  const ACCESS_M = cs[jAccess];
  const LOOK_M = cs[jLook];
  const RIVER_M = cs[jRiver];
  // The pad plane meets the road at the platform's outer edge — crown and
  // shoulder crossfall already taken off — so a truck turns off onto it without
  // a step, and rises away from the road from there.
  const PAD_Y0 = cy[jAccess] - MAIN_CROWN - MAIN_SHOULDER * MAIN_SHED - 0.02;
  // Where, in the pad's own axis, the plane starts: just inside the road's
  // ditch bank, so the apron and the road's batter overlap and the road wins.
  const PAD_A0 = -(WORLD.camp.offset - MAIN_EDGE) - 1.5;

  /** The camp access, culverting the ditch on the pad's side of the road. */
  function access(s) {
    return 1 - smoothstep(6.5, 9.5, Math.abs(s - ACCESS_M));
  }
  /** The overlook turnout: the platform widens on the view side over the crest. */
  function turnout(s) {
    return 1 - smoothstep(7, 15, Math.abs(s - LOOK_M));
  }

  /**
   * The graded camp site: a plane with a cut-and-fill batter round it, an access
   * apron joining it to the road, and the churn where vehicles turn in.
   *
   * `g` is the mask (1 on the pad), `y` the plane, `apron` the strip to the
   * road, `churn` the turned-over ground at the mouth. Written into `out` and
   * only evaluated inside 50 m of the centre — beyond that the whole thing is
   * zero and the fbm below is not worth calling.
   */
  const _site = { g: 0, y: 0, apron: 0, churn: 0, edge: 1e3 };
  function siteAt(x, z, base) {
    const C = LAND.camp;
    const dx = x - C.x;
    const dz = z - C.z;
    if (dx * dx + dz * dz > 62 * 62) {
      _site.g = 0;
      _site.apron = 0;
      _site.churn = 0;
      _site.edge = 1e3;
      _site.y = base;
      return _site;
    }
    const a = dx * C.ax + dz * C.az;
    const b = dx * C.bx + dz * C.bz;
    const ra = a < 0 ? PAD_R_ROAD : PAD_R_FAR;
    const qn = Math.sqrt((a * a) / (ra * ra) + (b * b) / (PAD_R_SIDE * PAD_R_SIDE));
    // The grader stopped where it stopped: the edge wanders by a metre or so.
    const wob = (fbm(x * 0.09 + 3, z * 0.09 + 5, { octaves: 2, period: 64, seed: 501 }) - 0.5) * 2.4;
    const edge = (qn - 1) * PAD_R_SIDE + wob;
    const yPad = PAD_Y0 + PAD_SLOPE * Math.max(0, a - PAD_A0);
    const cut = base - yPad;
    // A cut face stands at about one to one and a fill lies down at one and a
    // half, the same asymmetry the road's batter has — it is the one thing that
    // says a machine made this edge.
    const bw = 1.1 + Math.min(2.6, Math.abs(cut) * (cut > 0 ? 0.9 : 1.4));
    let g = 1 - smoothstep(0, bw, edge);
    // The apron: a strip along the access axis, flared where it meets the road
    // because trucks swing wide turning off.
    const flare = smoothstep(-22, -28, a) * 3.0;
    const ap =
      (1 - smoothstep(4.4 + flare, 6.4 + flare, Math.abs(b))) *
      smoothstep(PAD_A0 - 2.5, PAD_A0 + 0.5, a) *
      (1 - smoothstep(-PAD_R_ROAD + 1.5, -PAD_R_ROAD + 5, a));
    g = Math.max(g, ap);
    _site.g = g;
    _site.y = yPad;
    _site.apron = ap;
    _site.edge = edge;
    // Churned where everything drives in: the apron itself, and a fan inside
    // the mouth where vehicles spread out onto the pad.
    _site.churn = g * Math.max(ap * 0.9, (1 - smoothstep(5, 16, Math.hypot(a + PAD_R_ROAD, b * 0.8))) * 0.9);
    return _site;
  }

  /**
   * The dry river channel, cut into the base before the roads grade over it —
   * so the mainline crosses it on a fill, which is the embankment the culvert
   * headwalls stand on. `chan` runs 1 on the sandy floor to 0 past the top of
   * the bank; `carve` is the depth in metres.
   */
  const _chan = { chan: 0, carve: 0, floor: 0 };
  function riverAt(x, z, rv) {
    if (rv.d > RIVER_HALF + RIVER_BANK + 3.5) {
      _chan.chan = 0;
      _chan.carve = 0;
      _chan.floor = 0;
      return _chan;
    }
    // Shallows out at both ends rather than stopping, and the banks wander.
    const taper = smoothstep(0, 22, rv.along) * (1 - smoothstep(rv.total - 24, rv.total, rv.along));
    const hw = RIVER_HALF + (fbm(rv.along * 0.045 + 2, 1.3, { octaves: 3, period: 64, seed: 521 }) - 0.5) * 1.6;
    const rd = rv.d + (fbm(x * 0.21, z * 0.21, { octaves: 2, period: 64, seed: 523 }) - 0.5) * 0.8;
    const floor = (1 - smoothstep(hw, hw + RIVER_BANK, rd)) * taper;
    // a dished floor: the last flow scoured the middle
    _chan.carve = RIVER_DEPTH * floor + 0.18 * (1 - smoothstep(0, hw, rd)) * taper;
    _chan.chan = (1 - smoothstep(hw - 0.6, hw + RIVER_BANK + 2.2, rd)) * taper;
    _chan.floor = floor;
    return _chan;
  }

  /** The water hole: a trampled dish with the water sitting in the bottom half of it. */
  const _hole = { dish: 0, mud: 0, tramp: 0 };
  function holeAt(x, z) {
    const H = LAND.hole;
    const hd = Math.hypot(x - H.x, z - H.z);
    if (hd > HOLE_BASIN + 14) {
      _hole.dish = 0;
      _hole.mud = 0;
      _hole.tramp = 0;
      return _hole;
    }
    // the shore is irregular: where a hippo path comes down, where a bank
    // has slumped
    const hdj = hd + (fbm(x * 0.17 + 1, z * 0.17 + 4, { octaves: 2, period: 64, seed: 531 }) - 0.5) * 2.2;
    _hole.dish = 1 - smoothstep(0, HOLE_BASIN, hdj);
    // Mud: saturated at the waterline, drying out over the margin.
    _hole.mud = 1 - smoothstep(HOLE_BASIN * 0.5, HOLE_BASIN + 6, hdj);
    // Trampled bare ground, wider again: every animal for miles walks in here.
    _hole.tramp = 1 - smoothstep(HOLE_BASIN * 0.4, HOLE_BASIN + 12, hdj);
    return _hole;
  }

  /**
   * Wobble on the corridor edge, so the boundary is never a clean ribbon.
   *
   * Amplitude matters more than it looks: `edge` is what the track and verge
   * masks are keyed off, so a wobble of ±1 m against a 1.5 m half width pushes
   * the verge mask right across the running surface on half the stretches and
   * takes the rut tint down with it. Two thirds of ROAD_HALF is the ceiling.
   */
  function edgeWobble(s) {
    return (
      (fbm(s * 0.085, 8.3, { octaves: 3, period: 64, seed: 23 }) - 0.5) * 0.86 +
      (fbm(s * 0.34, 2.1, { octaves: 2, period: 64, seed: 61 }) - 0.5) * 0.32
    );
  }

  /**
   * Standing water, 0-1, at one point in road space. Baked into a vertex
   * attribute rather than derived in the shader so the dish in the mesh and the
   * water surface in the fragment shader cannot disagree — the alternative is
   * reimplementing the same fbm in GLSL and hoping the two stay in step.
   *
   * Water sits where a rut is deep and the road dips, so the field is the
   * product of a slow along-road stretch, a puddle-sized blob and the rut
   * profile itself.
   */
  function wetnessAt(ax, along, grade) {
    if (grade < 0.02) return 0;
    const trough = Math.max(
      Math.exp(-((ax - RUT_C) ** 2) / (2 * (RUT_W * 1.35) ** 2)),
      // the strip between the ruts holds a little water too where it is worn
      0.5 * Math.exp(-(ax ** 2) / (2 * 0.45 ** 2)),
    );
    const stretch = smoothstep(0.16, 0.46, fbm(along * 0.019 + 4.1, 2.7, { octaves: 3, period: 64, seed: 203 }));
    // Roughly 5 m of road per blob, and only the top of each one holds water, so
    // a puddle is one to two metres long. At a 7 m wavelength and a low
    // threshold the water joined up into a continuous ribbon down the rut and
    // read as a drainage canal rather than as standing water.
    const blob = fbm(along * 0.2, 9.3 + ax * 0.4, { octaves: 3, period: 64, seed: 311 });
    return clamp01((blob - 0.42) * 4.4) * stretch * trough * grade;
  }

  /**
   * Everything the mesh needs at one ground position.
   * Writes into `out` so the mesh build does not allocate 400k objects.
   */
  function surfaceInfo(x, z, out) {
    const nr = nearestRoad(x, z, out.near);
    const nt = nr.t;
    const nm = nr.m;
    let base = baseHeight(x, z);

    // --- the features, cut into the base before the roads grade it ----------
    // Order matters: the river and the water hole are cut first, then the pad
    // is laid over the result, so the pad is a plane whatever was under it and
    // the road — blended in below by authority — crosses the channel on a fill.
    const rv = riverDistance(x, z, _riv);
    const river = riverAt(x, z, rv);
    base -= river.carve;
    const hole = holeAt(x, z);
    base -= HOLE_DEPTH * hole.dish;
    const site = siteAt(x, z, base);
    base = lerp(base, site.y, site.g);

    // --- mainline cross-section ---------------------------------------------
    // Everything here is zero past thirteen metres — the batter is the last
    // term to die and it reaches ten — so beyond fourteen the whole block is
    // skipped. It is eight fbm evaluations and the far field is most of the
    // half million calls this function takes during a build.
    const mSgn = nm.lat < 0 ? -1 : 1;
    const mLatAbs = nm.dist > 20 ? nm.dist : Math.min(nm.dist, Math.abs(nm.lat));
    const mNear = nm.dist < 14;
    let mSide = mSgn * mLatAbs;
    let apM = 0;
    let gM = 0;
    let mDrop = 0;
    let tOut = 0;
    if (mNear) {
      mSide -= mainShift(nm.s);
      const mAx0 = Math.abs(mSide);
      apM = apronMain(nm.s, mAx0);
      // Which side of the road this is, softened across the crown so nothing
      // keyed off it steps at the centreline. world.js's side +1 is the left
      // driving with t, which is *negative* lateral in the sample frame.
      const sideP = smoothstep(-0.6, 0.6, -mSide);
      const sideN = 1 - sideP;
      // The overlook turnout: the platform widens on the view side over the
      // crest, and the ditch is left out there — a turnout on a crest drains
      // off the crest. The camp access culverts the ditch on the pad's side.
      const tO = turnout(nm.s) * (LAND.look.side > 0 ? sideP : sideN);
      const cA = access(nm.s) * (WORLD.camp.side > 0 ? sideP : sideN);
      // Trucks swing wide off a mainline, so the platform is wider at the
      // junction and the ditch is culverted through it. 2.4 m, not 3.4: at the
      // wider figure the flare plus the trail's own and the forest's clearance
      // came to forty metres of open graded ground, which reads as a landing
      // rather than as a junction. A crossing is legible because two roads of
      // different widths meet, so the flare has to stay small enough that both
      // of them still have a width.
      const mHalf = MAIN_HALF + apM * 2.4 + tO * 3.4;
      const mPlat = mHalf + MAIN_SHOULDER;
      // The edge wobble is tapered in from the middle of the running surface,
      // for the same reason the trail's is: applied flat it slides the
      // wheel-path masks across the crown.
      const mEdge = mAx0 - mainWobble(nm.s) * smoothstep(mHalf * 0.5, mHalf + 1.0, mAx0);
      const cM = culvert(nm.s);
      const cAny = Math.max(cM, cA, tO);
      const mDitchC = mPlat + MAIN_DITCH * 0.55;
      const mOuter = mPlat + MAIN_DITCH * (1 - cAny * 0.5) * 1.25;
      const mCut = base - nm.y;
      // A cut face stands up at about one to one and a fill slope lies down at
      // one and a half, which is the one asymmetry that says a machine built
      // this rather than that it eroded. Bounded because the batter has to fit
      // inside MAIN_CORRIDOR — the grade line is smoothed only as far as that
      // allows.
      const mBatter = 0.95 + Math.min(2.2, Math.abs(mCut) * (mCut > 0 ? 0.75 : 1.15));
      // The culvert crossing. Over the river floor the fill is retained by
      // the headwalls, so it ends in a face rather than lying down at one and
      // a half: the batter is pulled in to a hand's width at the wall line and
      // the channel floor runs right up to it. Keyed off the floor mask, so
      // the banks either side of the wall still carry the ordinary slope that
      // wraps round a headwall's wing walls. Laid out to the same figure as the
      // headwalls in roadside.js: MAIN_EDGE + 1.1 m from the centreline.
      const wallK = river.floor;
      const bOuter = lerp(mOuter, MAIN_EDGE + 1.1 - 0.2, wallK);
      const bBatter = lerp(mBatter, 0.3, wallK);
      // the wall line does not wobble with the grader's edge
      gM = 1 - smoothstep(bOuter, bOuter + bBatter, lerp(mEdge, mAx0, wallK));

      // 4% parabolic crown over the running surface, flattened across the apron
      // so a vehicle can cross the road rather than climb over its middle.
      const cw = Math.min(mAx0, mHalf) / mHalf;
      mDrop -= MAIN_CROWN * (1 - cM * 0.5) * cw * cw;
      // the shoulder sheds nearly twice as hard as the running surface
      mDrop -= Math.min(Math.max(0, mEdge - mHalf), MAIN_SHOULDER + 0.5) * MAIN_SHED;
      // Ditch. Culverted through the junction, and it silts up along its length
      // rather than running to a constant section.
      const mSilt = 0.62 + fbm(nm.s * 0.035 + 3.3, 7.7, { octaves: 3, period: 64, seed: 355 }) * 0.62;
      const mDitch = Math.exp(-((mEdge - mDitchC) ** 2) / (2 * (MAIN_DITCH * 0.5) ** 2));
      mDrop -= mDitch * MAIN_DITCH_D * clamp01(mSilt) * (1 - cAny);
      // A centimetre and a half of wheel path. Any more and it is a rut, which
      // is the trail's job; any less and the road has no travelled way in it.
      const mRut =
        Math.exp(-((mAx0 - MAIN_RUT_C) ** 2) / (2 * MAIN_RUT_W ** 2)) *
        clamp01(0.45 + fbm(nm.s * 0.028 + 5, 2.9, { octaves: 3, period: 64, seed: 361 }) * 0.9);
      mDrop -= mRut * MAIN_RUT_D * (1 - apM * 0.6);
      // A grader leaves a windrow of material it could not pull back onto the
      // road. It sits on the shoulder's outer edge and it is the single feature
      // that reads as "maintained" from a distance.
      const mWind = Math.exp(-((mEdge - (mPlat + 0.12)) ** 2) / (2 * 0.3 ** 2));
      mDrop +=
        mWind * 0.055 * clamp01(0.3 + fbm(nm.s * 0.19 + 8, 1.4, { octaves: 2, period: 64, seed: 373 }) * 1.3) * (1 - cAny);
      tOut = tO;
    }
    const mAx = Math.abs(mSide);

    // --- two-track cross-section --------------------------------------------
    // Same early out, at eight and a half metres: past the widest surface mask
    // the shader has, the lateral coordinate is the plain distance and the
    // wander, the wobble and the rut profile are all worth nothing.
    const sgn = nt.lat < 0 ? -1 : 1;
    const latAbs = nt.dist > 14 ? nt.dist : Math.min(nt.dist, Math.abs(nt.lat));
    const tNear = nt.dist < 8.5;
    const side = tNear ? sgn * latAbs - roadShift(nt.s) : sgn * latAbs;
    const ax = Math.abs(side);
    // The spur fans out into the mainline: a mouth, not a butt joint. This is
    // also what carries the trail's dirt onto the apron in the shader, since
    // every surface mask is keyed off the same lateral coordinate.
    const apT = tNear ? apronTrail(nt.s, ax) : 0;
    const tHalf = ROAD_HALF + apT * 2.4;
    // The wobble is tapered in from the middle of the running surface outward.
    // Applied flat it moves the whole lateral coordinate, so the track and verge
    // masks slide across the ruts and the two-track disappears on any stretch
    // where the wobble happens to be negative.
    const edge = tNear ? ax - edgeWobble(nt.s) * smoothstep(ROAD_HALF * 0.5, ROAD_HALF * 1.25, ax) : ax;

    // a grader cuts a steep face into the uphill side and rolls a wider fill
    // out below, so the transition width follows the cross slope. Tightened from
    // 3.7 m: blending out over that distance turns a 2.5 m trail into ten metres
    // of disturbed ground with no edge to it.
    const cut = base - nt.y;
    const fall = lerp(1.55, 0.8, smoothstep(-0.6, 1.6, cut));
    const gT = 1 - smoothstep(tHalf + 0.1, tHalf + 0.1 + fall, edge);

    // Which road owns this patch of ground. Both profiles are computed
    // everywhere and mixed by authority rather than switched between, because a
    // switch is a line — and the line would run down the middle of the one part
    // of the world the whole feature exists to be looked at.
    const m = gM <= 1e-5 ? 0 : gM / (gT + gM + 1e-5);
    const gAny = Math.max(gT, gM);
    const wT = gT * (1 - m);

    let y = base + ((nt.y - base) * (1 - m) + (nm.y - base) * m) * gAny;
    // the mainline's own cross-section, on the share of the ground it owns
    y += gM * m * mDrop;
    // The lip where the graded surface meets the unmade one.
    //
    // A mainline is a *built layer* — imported rock laid on top of the ground —
    // and a two-track is a groove worn into the ground. Where the second runs
    // onto the first there is a step up onto the layer, four or five
    // centimetres of it, with the spur's dirt banked against the edge. It is
    // the smallest feature at this junction and it is the one that says the two
    // surfaces were made at different times by different machines, rather than
    // being one surface with a texture change across it. Placed at the edge of
    // the platform in the mainline's frame and gated on the spur, so it appears
    // twice — once on each side of the crossing — and nowhere else.
    const lipAt = MAIN_HALF + apM * 2.4 + 0.45;
    y += apT * gM * Math.exp(-((mAx - lipAt) ** 2) / (2 * 0.55 ** 2)) * 0.055;

    // Outside of a bend gets the pushed-out material, inside gets cut. 34 puts a
    // 30 m radius corner at full strength, which is about the tightest this
    // centreline gets.
    const outside = clamp01(-Math.sign(side) * nt.k * 34);
    let rut = 0;
    let wear = 0;
    if (gT > 1e-4) {
      // Rut depth is modulated along the road: a two-track is never a pair of
      // extruded channels, it deepens through the wet stretches and washboards
      // out over the dry ones. Costs nothing against the vertical budget because
      // the modulation only ever takes depth away.
      // Ruts die on the apron. A spur's wheel tracks run out onto the graded
      // surface and stop, which is most of what makes a junction read as a
      // junction rather than as two roads laid over each other.
      wear = (0.52 + fbm(nt.s * 0.031 + 11, 5.3, { octaves: 3, period: 64, seed: 141 }) * 0.72) * (1 - apT * 0.85);
      const wash = 1 + Math.sin(nt.s * 2.1 + fbm(nt.s * 0.02, 1.7, { octaves: 2, period: 64, seed: 96 }) * 9) * 0.16;
      rut = Math.exp(-((ax - RUT_C) ** 2) / (2 * RUT_W ** 2));
      // dirt squeezed out of the trough and piled either side of it. This is
      // where the apparent depth comes from: the trough itself cannot go below
      // -RUT_D without the suspension running out of travel.
      const lip =
        Math.exp(-((ax - (RUT_C - RUT_W * 1.9)) ** 2) / (2 * 0.16 ** 2)) +
        Math.exp(-((ax - (RUT_C + RUT_W * 1.9)) ** 2) / (2 * 0.18 ** 2));
      // The lip is squeezed out of the trough in clods, not extruded as a bead:
      // without a strong along-road break it reads as a pair of moulded kerbs.
      const lipVar = 0.35 + fbm(nt.s * 0.62, 4.4, { octaves: 2, period: 64, seed: 181 }) * 1.35;
      const crown = 1 - smoothstep(0.1, 0.5, ax);
      const berm = Math.exp(-((edge - (tHalf + 0.75)) ** 2) / (2 * 0.9 ** 2));
      y += wT * (crown * CROWN_H - rut * RUT_D * clamp01(wear) * wash + lip * LIP_H * clamp01(wear) * lipVar);
      const inside = clamp01(Math.sign(side) * nt.k * 34);
      const bermW = smoothstep(0.05, 0.5, gT) * (1 - m) * (1 - apT);
      y += bermW * berm * BERM_H * (0.72 + outside * 0.95);
      y -= bermW * berm * 0.05 * inside;
    }

    // a puddle sits in a dish, not on a flat floor. A crowned road with a ditch
    // either side does not hold water — that is what the crown is for — so the
    // wetness field is the mainline's share taken back out of it.
    // Dry season: the trail's puddles are gone. The field is kept, at a third,
    // as the damp hollows where the last rain sat longest — the mud is at the
    // water hole now, and it arrives through `hole.mud` below.
    const wet = wetnessAt(ax, nt.s, gT * (1 - m) * (1 - apT * 0.7)) * 0.3;
    y -= wet * 0.026;

    // Lumpy ground, flattened out on the compacted surfaces: the roads, the
    // graded pad, the trampled mud round the water hole and the sandy floor of
    // the river. The fine chop only exists where the dense corridor mesh can
    // carry it.
    const smoothOut = (1 - gAny * 0.86) * (1 - site.g * 0.92) * (1 - hole.mud * 0.85) * (1 - river.floor * 0.7);
    y += (fbm(x * 0.128, z * 0.128, { octaves: 3, period: 64, seed: 29 }) - 0.5) * 0.5 * smoothOut;
    // The pad has settled since it was graded, and the mouth is churned.
    y += (fbm(x * 0.07 + 2, z * 0.07 + 6, { octaves: 2, period: 64, seed: 541 }) - 0.5) * 0.07 * site.g * (1 - gM);
    y += (fbm(x * 0.8 + 1, z * 0.8 + 3, { octaves: 2, period: 64, seed: 543 }) - 0.5) * 0.05 * site.churn * (1 - gM);
    // Hoof-pocked mud, at a wavelength the refined ring can carry.
    y += (fbm(x * 0.7 + 5, z * 0.7 + 2, { octaves: 2, period: 64, seed: 547 }) - 0.5) * 0.06 * hole.mud * (1 - hole.dish * 0.9);
    // A graded surface is not flat, it is a plane a machine last passed over
    // some months ago: long soft undulations from settlement and re-grading,
    // and nothing shorter than the blade is wide.
    y += (fbm(x * 0.058 + 4.4, z * 0.058 + 1.7, { octaves: 3, period: 64, seed: 383 }) - 0.5) * 0.11 * gM * m;
    y += (fbm(x * 0.21 + 9.1, z * 0.21 + 2.3, { octaves: 2, period: 64, seed: 389 }) - 0.5) * 0.022 * gM * m;
    // One distance, in the trail's units, so every constant downstream — the
    // refinement mask, the near-field detail ramp, the analytic normal's sample
    // radius — keeps the meaning it was tuned with. The mainline's corridor is
    // half again as wide, so its distance is scaled into the trail's before the
    // two are compared.
    const distEq = Math.min(nt.dist, nm.dist * (CORRIDOR / (MAIN_CORRIDOR + apM * 3.4)));
    const near = 1 - smoothstep(CORRIDOR * NEAR_IN, CORRIDOR * NEAR_OUT, distEq);
    if (near > 0.001) {
      y += (fbm(x * 0.36, z * 0.36, { octaves: 3, period: 64, seed: 5 }) - 0.5) * 0.14 * near * (1 - gAny * 0.7);
      // hoof-and-tyre chop on the running surface itself, at a frequency the
      // 0.29 m corridor grid can just carry. Off the mainline: its cells are
      // 0.59 m and a metre-wavelength term on them aliases into a lattice.
      y += (fbm(x * 0.95, z * 0.95, { octaves: 2, period: 64, seed: 118 }) - 0.5) * 0.026 * wT * (1 - wet);
      // Braking ripples across the ruts, in road space so they run *across* the
      // direction of travel like the real thing. 1.37 m pitch is four corridor
      // cells, which is the finest the mesh can carry without aliasing, and it
      // is the one geometric feature that says a wheel did this rather than a
      // grader. Kept out of the crown so the truck's own ride is unaffected.
      // Irregular in *pitch*, not just in phase. The old form was
      // sin( 4.6 s + noise( 0.09 s ) ), and a phase term that varies over eleven
      // metres is effectively constant across any one framing — so every rib in
      // shot sat at exactly 1.37 m, and near-uniform pitch is the single thing that
      // reads as machined rather than driven. It is also the reason this survived
      // three passes of shading work: a pure sine in the geometry does not care what
      // the normal tiers are doing, and the measured spectral peak sat flat at 42
      // while the shading amplitude came down by half. Warping s at a wavelength
      // close to the ripple's own stretches and compresses the spacing rib to rib.
      // The warp is held below the fold — 0.42 against a gradient of at most 1.7 —
      // so the coordinate stays monotonic and no rib doubles back on itself.
      const warp = fbm(nt.s * 0.55, 5.7, { octaves: 2, period: 64, seed: 171 }) - 0.5;
      // Amplitude per rib as well as pitch. A tyre shoves up a ridge where the
      // surface was soft enough to take one and skips it where the ground was too
      // hard, so a third of them are missing outright and the rest run two to one.
      const rAmp = smoothstep(0.24, 0.72, fbm(nt.s * 0.42 + 11, 3.1, { octaves: 2, period: 64, seed: 204 }));
      const ripple = Math.sin((nt.s + warp * 0.42) * 4.6);
      const rippleBand = rut * smoothstep(0.3, 0.7, ax);
      // 9 mm, down from 14, and that is now the ceiling rather than the value: with
      // rAmp on top the mean is nearer 5 mm. The ribs were casting shadows as deep
      // as the rut form, which puts the 10 cm tier above the form tier instead of
      // under it.
      y += ripple * 0.009 * rAmp * rippleBand * wT * near * clamp01(wear) * (1 - wet);
    }

    out.y = y;
    out.side = THREE.MathUtils.clamp(side, -20, 20);
    out.edge = THREE.MathUtils.clamp(edge, -2, 20);
    out.along = nt.s;
    out.dist = distEq;
    out.wet = wet;
    out.grade = gAny;
    out.outside = outside;
    // The zone masks the shader draws its other surfaces from. The pad and the
    // churn give way to the road where the road has authority — the apron is
    // pad material running up to gravel, not over it.
    out.pad = site.g * (1 - gM * m);
    out.chan = river.chan * (1 - gM * m);
    out.mud = hole.mud;
    out.churn = Math.max(site.churn * (1 - gM * m), hole.tramp * 0.8);
    out.dish = hole.dish;
    // Which surface the shader should draw, on a wider and softer boundary than
    // the geometry's: the graded platform's *material* runs a little past the
    // ground it graded, because a truck throws gravel off the shoulder. Weighted
    // toward the mainline where they overlap — the apron is a graded surface
    // with mud dragged onto it, not a two-track with gravel dropped on it.
    const gTs = 1 - smoothstep(ROAD_HALF + 2.6, ROAD_HALF + 5.6, ax);
    const gMs = 1 - smoothstep(MAIN_EDGE + 0.7, MAIN_EDGE + 3.8, mAx);
    let share = gMs <= 1e-4 ? 0 : Math.min(1, gMs / (gTs * 0.55 + gMs + 1e-4));
    // On the graded platform itself the answer is not a weighting, it is gravel.
    // The competition above is the right model out on the margins, where the
    // spur's dirt and the material thrown off the shoulder genuinely interleave
    // — but run across the running surface it left the crossing at 0.65 gravel
    // and 0.35 two-track, and 35% of a warm dirt tile over the one part of the
    // world the two surfaces have to be told apart in is what made every
    // junction framing come back tan. It is also simply wrong: a grader
    // maintains its road *through* a junction, so the platform is continuous
    // and what a spur puts on it is mud lying on gravel, which the drag term
    // below already draws. The dirt starts where the gravel stops.
    const plat = MAIN_HALF + apM * 2.4 + tOut * 3.4 + MAIN_SHOULDER;
    share = Math.max(share, 1 - smoothstep(plat - 0.5, plat + 1.1, mAx));
    // Gravel does not lie in the river: where the channel floor runs out from
    // under the embankment the sand takes over.
    share *= 1 - river.floor * (1 - gM);
    out.share = share;
    out.mSide = THREE.MathUtils.clamp(mSide, -24, 24);
    out.mAlong = nm.s;
    // Road tangent, blended by share and sign-aligned first. The two roads meet
    // at fifty degrees, so taking the dominant one's outright would put a hard
    // line down the apron in every term keyed off direction — the drag grain,
    // the tyre print, the streak field.
    //
    // Round 4: the *minor* road's tangent is the one that gets flipped, not
    // always the mainline's. Flipping the mainline's to agree with the trail's
    // made the mainline's sign depend on which trail sample happened to be
    // nearest — and along the mainline past the camp spur that sample's
    // heading swings through ninety degrees, so `aTan` reversed along a
    // straight line across the road (measured: every vertex past x ≈ 72 at
    // z ≈ −5 carried (−0.88, 0.48) against (0.90, −0.44) before it). The
    // shader's rut tilt is `-lat * sign( vMain.y )`, so on the far side of
    // that line the shaded wall of each wheel path swapped sides: a 0.4 m
    // lateral jog in both paths, 47 m out in `truck_day/mainroad` and a hard
    // seam across the road from overhead. The sign of `lat` has to be the
    // sign `mSide` was measured in — the mainline's own tangent — wherever
    // the mainline's terms are live, and the trail's own wherever the print
    // tile is (its lug shadow reads the sign too). The discontinuity that is
    // left sits on the share = 0.5 contour inside the junction apron, where
    // `apM` has already switched the rut tilt off.
    const flip = nt.tx * nm.tx + nt.tz * nm.tz < 0 ? -1 : 1;
    const mainDom = out.share > 0.5;
    const fT = mainDom ? flip : 1;
    const fM = mainDom ? 1 : flip;
    const bx = nt.tx * fT * (1 - out.share) + nm.tx * fM * out.share;
    const bz = nt.tz * fT * (1 - out.share) + nm.tz * fM * out.share;
    const bl = Math.hypot(bx, bz) || 1;
    out.tanX = bx / bl;
    out.tanZ = bz / bl;
    return out;
  }

  const makeInfo = () => ({
    near: { t: makeNear(), m: makeNear() },
    y: 0,
    side: 0,
    edge: 0,
    along: 0,
    dist: 0,
    wet: 0,
    grade: 0,
    tanX: 0,
    tanZ: 1,
    outside: 0,
    share: 0,
    mSide: 0,
    mAlong: 0,
    pad: 0,
    chan: 0,
    mud: 0,
    churn: 0,
    dish: 0,
  });
  const _hInfo = makeInfo();
  const _vInfo = makeInfo();

  function surfaceHeight(x, z) {
    return surfaceInfo(x, z, _hInfo).y;
  }

  // --- mesh ----------------------------------------------------------------
  const cell = SIZE / COARSE;
  const half = SIZE / 2;
  const gx = (i) => -half + i * cell;

  // Refinement level per coarse cell: 1 is the far field, FINE_MAIN the
  // mainline, FINE the two-track. The mainline is graded, so it carries nothing
  // finer than the ditch and a 0.59 m grid renders it identically to a 0.29 m
  // one — at a fifth of the triangles. It is by a long way the widest corridor
  // in the world and paying the trail's rate for it would have been most of the
  // terrain's whole budget.
  const cellLevel = new Uint8Array(COARSE * COARSE);
  let fineCells = 0;
  let mainCells = 0;
  for (let j = 0; j < COARSE; j++) {
    for (let i = 0; i < COARSE; i++) {
      const mx = gx(i) + cell * 0.5;
      const mz = gx(j) + cell * 0.5;
      const nr = nearestRoad(mx, mz);
      let lv = 1;
      if (nr.m.dist < MAIN_CORRIDOR + 3.4 * apronMain(nr.m.s, Math.abs(nr.m.lat)) + 3.4 * turnout(nr.m.s) + cell) {
        lv = FINE_MAIN;
      }
      // The features get the mainline's rate: the river banks are a metre and a
      // half over two and a half, the pad's batter is a metre over one to three,
      // and the water hole's shore is where the sheet has to meet the mud. The
      // pad's flat interior is a plane and the coarse grid carries a plane
      // exactly, so only its edge ring, the apron and the churned mouth are
      // refined.
      const rv = riverDistance(mx, mz, _riv);
      if (rv.d < RIVER_HALF + RIVER_BANK + 3.4 + cell && rv.along > 6 && rv.along < rv.total - 6) {
        lv = FINE_MAIN;
        // the culvert: the fill ends in a face at the headwall line, and a
        // 0.6 m grid smears a 0.3 m face out past the wall that hides it
        if (nr.m.dist < MAIN_EDGE + 4 + cell) lv = FINE;
      }
      if (Math.hypot(mx - LAND.hole.x, mz - LAND.hole.z) < HOLE_BASIN + 7 + cell) lv = FINE_MAIN;
      const st = siteAt(mx, mz, baseHeight(mx, mz));
      if ((Math.abs(st.edge) < 4.5 + cell && st.edge < 4.5) || st.apron > 0.01 || st.churn > 0.15) lv = FINE_MAIN;
      if (nr.t.dist < CORRIDOR + cell) lv = FINE;
      if (lv === FINE) fineCells++;
      else if (lv === FINE_MAIN) mainCells++;
      cellLevel[j * COARSE + i] = lv;
    }
  }
  const levelAt = (i, j) => (i >= 0 && j >= 0 && i < COARSE && j < COARSE ? cellLevel[j * COARSE + i] : 1);

  const gridVerts = (COARSE + 1) * (COARSE + 1);
  const fineVerts = fineCells * (FINE + 1) ** 2 + mainCells * (FINE_MAIN + 1) ** 2;
  const vertCount = gridVerts + fineVerts;
  const triCount =
    (COARSE * COARSE - fineCells - mainCells) * 2 + fineCells * FINE * FINE * 2 + mainCells * FINE_MAIN * FINE_MAIN * 2;

  const position = new Float32Array(vertCount * 3);
  const normals = new Float32Array(vertCount * 3);
  const uvs = new Float32Array(vertCount * 2);
  const aSide = new Float32Array(vertCount);
  const aEdge = new Float32Array(vertCount);
  const aAlong = new Float32Array(vertCount);
  const aWet = new Float32Array(vertCount);
  // Which road's surface this vertex belongs to, and where it sits in the
  // mainline's own road space. x is the blend, y the signed lateral offset,
  // z the arc length — the mainline's equivalents of aSide and aAlong, which
  // stay the trail's so nothing already keyed off them has to move.
  const aMain = new Float32Array(vertCount * 3);
  // Road tangent in world XZ. The surface tiles are all world space, so without
  // this the shader has no idea which way "along the road" points and nothing on
  // the trail can have a grain to it — which is most of why the ruts read as a
  // pair of soft channels rather than as something a wheel dragged through.
  const aTan = new Float32Array(vertCount * 2);
  // The savanna zones: pad, river channel (1 floor, 0 bank top), water-hole
  // mud, churned or trampled ground. Baked like the wetness, so the shader's
  // surfaces and the mesh's shaping come out of the same numbers.
  const aZone = new Float32Array(vertCount * 4);
  const index = vertCount > 65535 ? new Uint32Array(triCount * 3) : new Uint16Array(triCount * 3);

  /**
   * Analytic normal. The sample radius is a continuous function of the
   * distance to the road — never of the cell size — so two cells at different
   * densities produce the same normal at a shared position and there is no
   * shading seam on the boundary.
   *
   * On the road it is 0.13 m, well inside the 0.29 m grid. Differencing at
   * anything near the grid spacing low-passes the rut cross-section into a
   * gentle swell: at 0.3 m the lip and the trough were averaging into each
   * other and the two-track had no shading gradient left to read from.
   */
  function writeVertex(k, x, z, yOverride) {
    const info = surfaceInfo(x, z, _vInfo);
    // Tighter on the river banks and the water hole's shore, which are the
    // only steep things off the road: at 1.15 m a 1.5 m bank over 2.6 m
    // differenced into a soft swell. Still a function of position alone, so
    // the shared-edge argument holds.
    const e =
      lerp(1.15, 0.13, 1 - smoothstep(CORRIDOR * NEAR_IN, CORRIDOR * NEAR_OUT, info.dist)) *
      (1 - 0.62 * Math.max(info.chan, info.mud));
    const y = yOverride === undefined ? info.y : yOverride;
    const side = info.side;
    const edge = info.edge;
    const along = info.along;
    const wet = info.wet;
    const hx = surfaceHeight(x + e, z) - surfaceHeight(x - e, z);
    const hz = surfaceHeight(x, z + e) - surfaceHeight(x, z - e);
    const nx = -hx;
    const nz = -hz;
    const ny = 2 * e;
    const len = Math.hypot(nx, ny, nz) || 1;
    position[k * 3] = x;
    position[k * 3 + 1] = y;
    position[k * 3 + 2] = z;
    normals[k * 3] = nx / len;
    normals[k * 3 + 1] = ny / len;
    normals[k * 3 + 2] = nz / len;
    uvs[k * 2] = x * 0.05;
    uvs[k * 2 + 1] = z * 0.05;
    aSide[k] = side;
    aEdge[k] = edge;
    aAlong[k] = along;
    aWet[k] = wet;
    aMain[k * 3] = info.share;
    aMain[k * 3 + 1] = info.mSide;
    aMain[k * 3 + 2] = info.mAlong;
    aTan[k * 2] = info.tanX;
    aTan[k * 2 + 1] = info.tanZ;
    aZone[k * 4] = info.pad;
    aZone[k * 4 + 1] = info.chan;
    aZone[k * 4 + 2] = info.mud;
    aZone[k * 4 + 3] = info.churn;
  }

  /**
   * Height along one cell edge, sampled at `level` nodes and interpolated.
   *
   * A fine edge that meets a coarser one has to *be* the coarser one, or the
   * seam opens as a hairline crack. With one refinement level that meant
   * clamping to the straight line between the coarse quad's corners; with two it
   * has to be the neighbour's own polyline, so the sampling rate is the argument
   * and `level = 1` reproduces the original behaviour exactly.
   */
  function edgeHeight(x0, z0, x1, z1, f, level) {
    const g = f * level;
    const k = Math.min(level - 1, Math.floor(g));
    const a = k / level;
    const b = (k + 1) / level;
    const ya = surfaceHeight(lerp(x0, x1, a), lerp(z0, z1, a));
    const yb = surfaceHeight(lerp(x0, x1, b), lerp(z0, z1, b));
    return lerp(ya, yb, g - k);
  }

  for (let j = 0; j <= COARSE; j++) {
    for (let i = 0; i <= COARSE; i++) {
      writeVertex(j * (COARSE + 1) + i, gx(i), gx(j));
    }
  }

  let vi = gridVerts;
  let ii = 0;
  const gi = (i, j) => j * (COARSE + 1) + i;
  for (let j = 0; j < COARSE; j++) {
    for (let i = 0; i < COARSE; i++) {
      const L = cellLevel[j * COARSE + i];
      if (L === 1) {
        const a = gi(i, j);
        const b = gi(i + 1, j);
        const c = gi(i + 1, j + 1);
        const d = gi(i, j + 1);
        // alternate the diagonal so the far field has no directional grain
        if ((i + j) & 1) {
          index[ii++] = a;
          index[ii++] = d;
          index[ii++] = b;
          index[ii++] = b;
          index[ii++] = d;
          index[ii++] = c;
        } else {
          index[ii++] = a;
          index[ii++] = d;
          index[ii++] = c;
          index[ii++] = a;
          index[ii++] = c;
          index[ii++] = b;
        }
        continue;
      }
      const x0 = gx(i);
      const z0 = gx(j);
      const x1 = x0 + cell;
      const z1 = z0 + cell;
      // Sampling rate each edge has to agree with: whichever side is coarser.
      // A cell only snaps an edge when the neighbour is below its own level, so
      // exactly one of any pair does the work and they land on the same polyline.
      const lW = Math.min(L, levelAt(i - 1, j));
      const lE = Math.min(L, levelAt(i + 1, j));
      const lS = Math.min(L, levelAt(i, j - 1));
      const lN = Math.min(L, levelAt(i, j + 1));
      const base = vi;
      for (let v = 0; v <= L; v++) {
        for (let u = 0; u <= L; u++) {
          const fu = u / L;
          const fv = v / L;
          const x = x0 + fu * cell;
          const z = z0 + fv * cell;
          let y;
          if (u === 0 && lW < L) y = edgeHeight(x0, z0, x0, z1, fv, lW);
          else if (u === L && lE < L) y = edgeHeight(x1, z0, x1, z1, fv, lE);
          else if (v === 0 && lS < L) y = edgeHeight(x0, z0, x1, z0, fu, lS);
          else if (v === L && lN < L) y = edgeHeight(x0, z1, x1, z1, fu, lN);
          writeVertex(base + v * (L + 1) + u, x, z, y);
        }
      }
      vi += (L + 1) * (L + 1);
      for (let v = 0; v < L; v++) {
        for (let u = 0; u < L; u++) {
          const a = base + v * (L + 1) + u;
          const b = a + 1;
          const c = a + L + 2;
          const d = a + L + 1;
          if ((u + v) & 1) {
            index[ii++] = a;
            index[ii++] = d;
            index[ii++] = b;
            index[ii++] = b;
            index[ii++] = d;
            index[ii++] = c;
          } else {
            index[ii++] = a;
            index[ii++] = d;
            index[ii++] = c;
            index[ii++] = a;
            index[ii++] = c;
            index[ii++] = b;
          }
        }
      }
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(position, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.setAttribute('aSide', new THREE.BufferAttribute(aSide, 1));
  geo.setAttribute('aEdge', new THREE.BufferAttribute(aEdge, 1));
  geo.setAttribute('aAlong', new THREE.BufferAttribute(aAlong, 1));
  geo.setAttribute('aWet', new THREE.BufferAttribute(aWet, 1));
  geo.setAttribute('aMain', new THREE.BufferAttribute(aMain, 3));
  geo.setAttribute('aTan', new THREE.BufferAttribute(aTan, 2));
  geo.setAttribute('aZone', new THREE.BufferAttribute(aZone, 4));
  geo.setIndex(new THREE.BufferAttribute(index, 1));
  geo.computeBoundingSphere();

  // --- material ------------------------------------------------------------
  const track = trackMaps();
  const gravel = gravelMaps();
  const verge = vergeMaps();
  const litter = savannaMaps();
  const sand = sandMaps();
  const tracks = trackStamps();
  const tread = treadImprint();
  const detail = detailNormal();
  const grain = grainMaps();
  const macro = macroVariation();
  const relief = reliefMaps();
  const tiles384 = packTiles([verge.normal, litter.normal, sand.normal, relief.height, relief.normal], 'terrainTiles384');
  const tiles256 = packTiles([tracks.normal, tread.normal, detail, grain, macro], 'terrainTiles256');
  const sunV = sunVector();

  const material = new THREE.MeshStandardMaterial({
    map: track.map,
    normalMap: track.normal,
    // The close framings look along the ground, where anisotropic filtering
    // runs out of taps and the fine tiers blur away. What survives at that
    // angle is the 10-30 cm clod relief in the base normal map, so it carries
    // more than it would on a surface seen face on.
    normalScale: new THREE.Vector2(2.2, 2.2),
    roughness: 1.0,
    metalness: 0.0,
    // The key rakes in low and the canopy eats most of it, so the sky does the
    // lifting in shade. It used to be 3.2, which on a mid-dark chromatic albedo
    // washes the whole surface toward the sky's own colour — that plus a light
    // albedo is what made the trail read as plaster. 1.5 went too far the other
    // way and the dirt under the truck went to a featureless black.
    // 1.3, down from 2.1, and in step with the albedo scale at the end of the
    // fragment injection. Only the indirect *specular* runs through this, so it
    // does not scale with albedo — halving the diffuse and leaving this alone
    // would have doubled the sky sheen's share of the surface and put a haze back
    // over the near field that no roughness floor could hold.
    envMapIntensity: 1.3,
    color: 0xffffff,
    dithering: true,
  });

  const uniforms = {
    uVergeMap: { value: verge.map },
    // Round 5. Two array textures carry ten of the tiles: every normal map
    // but the gravel's, the relief pair, the stamps, the grain and the macro
    // field. This material had 21 samplers — these fifteen plus three's map,
    // normalMap, envMap, DFG table and two shadow cascades — and the WebGL2
    // floor, which is what nearly every desktop and phone browser reports
    // for MAX_TEXTURE_IMAGE_UNITS (16; web3dsurvey has 16 on 100 % of
    // Windows, Mac and iOS and 32 on 2–3 %), so on any machine but the
    // capture box the program did not link and the near ground was never
    // drawn: what a player saw under the truck was the far mesh's flat, 1.8 m
    // down, dark chocolate at 0.13/0.06/0.04 sRGB, headwall footings and
    // wheels in the air. Measured against the user's own frame: 0.138/0.073/
    // 0.045, hue 18, saturation 0.67 — the far flat to the digit. Packed, the
    // material binds 13. A layer is a texture of the same size and format,
    // so the tiles are grouped by size; one anisotropy per array (16, the
    // relief height was 2 and the macro 8).
    uTile384: { value: tiles384 },
    uTile256: { value: tiles256 },
    uGravelMap: { value: gravel.map },
    uGravelNrm: { value: gravel.normal },
    uLitterMap: { value: litter.map },
    uSandMap: { value: sand.map },
    uTracksScale: { value: 1 / TRACKS_TILE },
    // The overlook turnout in the mainline's frame: arc length, half-width
    // gain, and which sign of lateral offset it is on.
    uLook: { value: new THREE.Vector4(LOOK_M, 3.4, LAND.look.side > 0 ? -1 : 1, 0) },
    uAccess: { value: new THREE.Vector2(ACCESS_M, WORLD.camp.side > 0 ? -1 : 1) },
    uReliefScale: { value: 1 / RELIEF_TILE },
    uReliefDepth: { value: RELIEF_DEPTH },
    // Lateral step per unit of relief height when marching toward the sun, so
    // the self-shadowing lines up with the directional light in sky.js.
    uSunStep: { value: new THREE.Vector2(sunV.x / sunV.y, sunV.z / sunV.y) },
    // A/B dial for the whole near-field relief tier. Whether a surface is
    // carrying parallax or not is not a thing to have an opinion about: render it
    // twice with this at 1 and 0 and difference the frames.
    uReliefAmt: { value: 1 },
    // Per-term A/B dials for the near-field normal stack: drag grain, 11 cm
    // grit, 45 cm grit, tyre print. Seven terms add into one mapN and any of
    // them can be the one drawing an artefact; sweeping them from the page is
    // the difference between finding that in one render pass and guessing at it
    // for four.
    uNearAmt: { value: new THREE.Vector4(1, 1, 1, 1) },
    // metres per tile: track, verge, litter
    uScale: { value: new THREE.Vector3(1 / 2.6, 1 / 2.2, 1 / 2.4) },
    uDetailScale: { value: 2.2 },
    // 40 cm and 11 cm tiles of close-range aggregate
    uGrainScale: { value: new THREE.Vector2(2.5, 9.1) },
    uMacroScale: { value: 1 / 110 },
    uJitterScale: { value: 1 / 5.2 },
    uTreadPitch: { value: tread.pitch },
    uMean: {
      value: new THREE.Vector4(
        Math.max(track.mean, 0.01),
        Math.max(litter.mean, 0.01),
        Math.max(gravel.mean, 0.01),
        Math.max(sand.mean, 0.01),
      ),
    },
    // The gravel tile's mean colour in linear, for re-expanding the summed
    // coarse taps about it (see tGrav3 in the fragment stage).
    uGravMean: { value: texMeanLinear(gravel.map) },
    // 1 = the mid-ground second taps are on; 0 restores the single-tap fields for A/B.
    uMidBreak: { value: 1 },
    // Ground bounce follows the hour's irradiance (1) or is the noon constant
    // (0, shipped — see the term in the fragment stage). uBounceRef is the
    // noon hemisphere-plus-environment irradiance luma the constant was tuned
    // at, read off debug mode 14.
    uBounceFollow: { value: 0 },
    uBounceRef: { value: 1.0 },
    uRoad: { value: new THREE.Vector4(ROAD_HALF, SHOULDER, RUT_C, RUT_W) },
    // The mainline's cross-section, so the shader places its surfaces off the
    // same numbers the mesh was graded to rather than off a second set that
    // has to be kept in step by hand.
    uMain: { value: new THREE.Vector4(MAIN_HALF, MAIN_SHOULDER, MAIN_RUT_C, MAIN_RUT_W) },
    // Junction: arc length along each road, then the ditch offset and the
    // outer edge of the graded platform.
    uJunc: { value: new THREE.Vector4(JUNC_M, JUNC_T, MAIN_DITCH, MAIN_EDGE) },
    uGravelScale: { value: 1 / GRAVEL_TILE },
    // Global weather dial: 0 is a dry-season track, 1 is soaked. It was 0.8 for
    // the forest; the savanna is at the end of the dry season, and everything
    // keyed off this — the damp patches, the polished rut floors, the puddle
    // sheets — has to be nearly gone so the dust can be what is left.
    uWet: { value: 0.12 },
    // Round 6: the pride's trodden ring — xz of the rest point, then the
    // radius the ground is fully trodden to and the radius it has recovered
    // by. 6 and 11 m: forest.js keys its lawn off the same 7–11 m ring.
    uPride: { value: new THREE.Vector4(LAND.pride.x, LAND.pride.z, 6, 11) },
    uContacts: { value: [new THREE.Vector4(), new THREE.Vector4(), new THREE.Vector4(), new THREE.Vector4()] },
    // 1 shows the surface masks, 2 the unlit albedo, 3 the road-space masks
    // unlit, 4 the water mask. Everything here is one surface blended from
    // seven textures and a handful of masks, and telling "the mask is zero"
    // from "the mask is right but the tint cancels" is not something a software
    // render will answer.
    uDebug: { value: 0 },
  };
  material.userData.uniforms = uniforms;

  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);

    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        attribute float aSide;
        attribute float aEdge;
        attribute float aAlong;
        attribute float aWet;
        attribute vec3 aMain;
        attribute vec2 aTan;
        attribute vec4 aZone;
        varying float vSide;
        varying float vEdge;
        varying float vAlong;
        varying float vWet;
        varying vec3 vMain;
        varying vec2 vTan;
        varying vec4 vZone;
        varying vec2 vTile;
        varying vec3 vWorld;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vSide = aSide;
        vEdge = aEdge;
        vAlong = aAlong;
        vWet = aWet;
        vMain = aMain;
        vTan = aTan;
        vZone = aZone;
        vec4 wp = modelMatrix * vec4( transformed, 1.0 );
        vWorld = wp.xyz;
        vTile = wp.xz;`,
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform sampler2D uVergeMap, uLitterMap, uSandMap;
        uniform sampler2D uGravelMap, uGravelNrm;
        // Round 5: ten of the tiles ride in two array textures (see
        // packTiles) — one sampler each instead of ten. Layer order below.
        uniform sampler2DArray uTile384, uTile256;
        #define uVergeNrm_L 0.0
        #define uLitterNrm_L 1.0
        #define uSandNrm_L 2.0
        #define uReliefH_L 3.0
        #define uReliefN_L 4.0
        #define uTracks_L 0.0
        #define uTread_L 1.0
        #define uDetailNrm_L 2.0
        #define uGrain_L 3.0
        #define uMacro_L 4.0
        uniform vec3 uScale;
        uniform vec2 uGrainScale;
        uniform vec2 uSunStep;
        uniform vec4 uRoad;
        uniform vec4 uMain;
        uniform vec4 uJunc;
        uniform vec4 uLook;
        uniform vec2 uAccess;
        uniform vec4 uNearAmt;
        uniform vec4 uPride;
        uniform vec4 uContacts[ 4 ];
        uniform float uReliefScale, uReliefDepth, uReliefAmt;
        uniform float uDetailScale, uMacroScale, uJitterScale, uTreadPitch, uWet;
        uniform float uGravelScale, uTracksScale;
        uniform float uDebug;
        uniform vec4 uMean;
        uniform vec3 uGravMean;
        uniform float uMidBreak;
        uniform float uBounceFollow, uBounceRef;
        varying float vSide;
        varying float vEdge;
        varying float vAlong;
        varying float vWet;
        varying vec3 vMain;
        varying vec2 vTan;
        varying vec4 vZone;
        varying vec2 vTile;
        varying vec3 vWorld;

        // Second tap of the same tile at a different scale, folded in as a
        // value ratio rather than a multiply, so breaking up the repetition
        // does not also darken the surface by half a stop.
        vec3 breakUp( vec3 base, vec3 second, float mean ) {
          float m = dot( second, vec3( 0.2126, 0.7152, 0.0722 ) ) / mean;
          return base * mix( 1.0, clamp( m, 0.4, 2.1 ), 0.5 );
        }`,
      )
      .replace(
        '#include <map_fragment>',
        `vec2 uvT = vTile * uScale.x;
        vec2 uvV = vTile * uScale.y;
        vec2 uvL = vTile * uScale.z;
        vec4 mac = texture( uTile256, vec3( vTile * uMacroScale + 0.37, uMacro_L ) );
        // same texture at a five metre scale: mask jitter in r, mid-scale
        // value in g, damp patches in b
        vec4 mid = texture( uTile256, vec3( vTile * uJitterScale, uMacro_L ) );

        vec3 toCam = cameraPosition - vWorld;
        float camDist = length( toCam ) + 1e-4;
        // Round 4: past eight metres this tile is what the mid-ground is made
        // of — every finer tier has mipped to its mean by twenty — and a 5.2 m
        // period read on its own is a 5.2 m repeat. Measured on a rectified
        // strip of the mainline in \`truck_day/mainroad\`, 40–60 m out, the
        // along-road autocorrelation peaked at 5.6 m (0.11) with nothing at
        // the 1.9 m aggregate tile (−0.19). A second tap at 1.59 times the
        // period and 37 degrees round, summed and re-expanded so the field
        // keeps its contrast, has no repeat short of the tile's 110 m macro.
        // It comes in over 8–24 m so the near field is untouched: inside
        // eight metres this tile is a jitter and a warp on tiers that are
        // sharp enough to hide it, and the round-3 near-field balance was
        // tuned on it as it stands.
        float midFar = smoothstep( 8.0, 24.0, camDist ) * uMidBreak;
        vec2 midUv2 = mat2( 0.7986, 0.6018, -0.6018, 0.7986 ) * vTile * ( uJitterScale * 0.63 ) + vec2( 0.31, 0.77 );
        vec4 mid2 = texture( uTile256, vec3( midUv2, uMacro_L ) );
        mid = mix( mid, clamp( ( mid + mid2 - 1.0 ) * 0.7071 + 0.5, 0.0, 1.0 ), midFar );
        float jit = mid.r - 0.5;
        vec3 viewN = toCam / camDist;
        // Faded out where the surface is seen nearly edge-on. At three degrees
        // of incidence a texture lookup wants an anisotropy ratio near twenty
        // and the hardware gives four to sixteen, so every fine tier is resolved
        // as a long smear along the view ray — and five tiers smearing at five
        // different scales is what turned the 40 cm framings into burr walnut.
        // Nothing is lost: at three degrees a 1 cm grain is well under a pixel,
        // so the tiers being faded out here could not have been resolved anyway.
        float grazeFade = smoothstep( 0.035, 0.17, viewN.y );
        float nearFade = 1.0 - smoothstep( 2.2, 7.0, camDist );
        float detailFade = ( 1.0 - smoothstep( 9.0, 26.0, camDist ) ) * mix( 0.4, 1.0, grazeFade );
        float gritFade = nearFade * grazeFade;
        // Footprint anisotropy of the tile coordinate every close-range tier is
        // fetched on. This is the corrugation the integrated foreground was covered
        // in, at the root.
        //
        // The ribbing is not in any tile — the relief height and normal maps are
        // round clods with no directional structure in them at all — and it is not
        // the parallax, the sun march or the tile scale: it survives zeroing the
        // relief depth and it survives enlarging the relief tile threefold. It dies
        // completely at normalScale zero and it gets dramatically *worse* at
        // anisotropy 1, which places it. A pixel of ground at this camera height
        // covers a few millimetres across the view and several centimetres along it,
        // so the texture footprint is a long thin quad; past the sampler's
        // anisotropy limit the fetch averages the field along the major axis and
        // keeps the variation across it, which turns an isotropic clod field into
        // filaments pointing down the view ray. Enough parallel filaments is a
        // corrugation.
        //
        // Cutting the base tile to a tenth was this same artefact treated one tier
        // at a time, and it only moved the problem to whichever tier took over.
        // Every close-range tier is fetched on these coordinates and every one of
        // them smears identically, so they are tapered together, by the one quantity
        // that says whether the fetch can be resolved at all.
        //
        // Full strength while the footprint is roughly round, half by 2.3:1, a third
        // by 4:1 — the range these framings actually live in. It costs nothing in
        // the framings the near tiers exist for: a knee-height camera looking *down*
        // at the dirt has a round footprint and gets every tier at full strength. It
        // gives up detail only where the sampler was going to turn it into filaments
        // anyway, and six thousand loose stones carry that range in geometry instead.
        vec2 dTx = dFdx( vTile );
        vec2 dTy = dFdy( vTile );
        float fpMaj = max( length( dTx ), length( dTy ) );
        float fpMin = min( length( dTx ), length( dTy ) );
        float fpFade = 1.0 / ( 1.0 + max( fpMaj / max( fpMin, 1e-6 ) - 1.15, 0.0 ) * 0.75 );

        float ax = abs( vSide );
        // Ragged in road space as well as in world space. The verge boundary is
        // what gives the trail its edge, and an edge that only wobbles with a
        // world-space noise field still reads as a ribbon laid over the ground.
        vec4 rsEdge = texture( uTile256, vec3( vec2( vAlong * 0.33, vSide * 0.19 + 0.61 ), uMacro_L ) );
        // jitter tapered the same way vEdge's wobble is: everything keyed off
        // axj has to stay clear of the rut band
        float axj = vEdge + ( jit * 0.24 + ( rsEdge.g - 0.5 ) * 0.44 ) *
                    smoothstep( uRoad.x * 0.5, uRoad.x * 1.3, ax );
        float mTrack = 1.0 - smoothstep( uRoad.x - 0.15, uRoad.x + 0.55, axj );
        // Three zones out from the running surface instead of two: dirt scuffed
        // off the track, then loose verge material, then litter. The scuff band
        // is what stops the trail from ending on a line.
        // Two and a half metres of scuff band, not ninety centimetres. In plan
        // the trail still ended on a line: a 45 cm graded margin against a 7 m
        // road is a kerb, and a kerb is the single most obvious thing in an
        // overhead framing. Broken along the road by rsEdge below so the band
        // itself is ragged rather than a parallel stripe.
        float mScuff = smoothstep( uRoad.x - 0.55, uRoad.x + 0.15, axj ) *
                       ( 1.0 - smoothstep( uRoad.x + 0.55, uRoad.x + 2.5, axj ) );
        // Inner edge pulled in from roadHalf - 1.3. On a narrow trail the old
        // figure put loose verge gravel over the crown and the ruts, which is
        // most of why the trail read as one undifferentiated wash. The outer
        // edge runs 55 cm further out than it did, so the verge fades into
        // litter over two metres rather than one.
        float mVerge = smoothstep( uRoad.x - 0.1, uRoad.x + 0.5, axj ) *
                       ( 1.0 - smoothstep( uRoad.x + 0.8, uRoad.x + uRoad.y + 0.9, axj ) );
        // Flat-topped band, not the gaussian the mesh profile uses. A bell
        // spends most of its width in the falloff, and once it has been mipped
        // down at fifteen metres a bell reads as a soft smudge while a band with
        // an edge on it still reads as a wheel track. The rut *geometry* stays a
        // gaussian — this is only what the shading is keyed off.
        float dRut = abs( ax - uRoad.z ) - jit * 0.1;
        float mRut = ( 1.0 - smoothstep( uRoad.w * 1.15, uRoad.w * 1.8, dRut ) ) * mTrack;
        // Kept clear of the rut band: at 0.66 m the crown mask was still 0.2
        // and the rut mask already 0.8, so the two were cancelling each other
        // out exactly where the edge between them needed to be sharpest.
        float mCrown = ( 1.0 - smoothstep( 0.1, 0.46, ax + jit * 0.22 ) ) * mTrack;

        // --- near-field relief ------------------------------------------------
        // Everything above this is a normal map, and a normal map gives itself
        // away the moment the camera drops to knee height: the shading says
        // there are stones but the surface still slides past as a flat plane and
        // nothing occludes anything. Inside a few metres the relief tile is
        // marched twice — once along the view ray, which gives a clod a lee side
        // that hides what is behind it, and once toward the sun, which puts a
        // hard little shadow on the far side of every pebble and twig. That
        // shadow is the single thing that separates aggregate from a pattern.
        //
        // The tile is warped by a five metre noise field before it is sampled,
        // so its 0.95 m grid never lines up with itself twice in a frame.
        // 62 cm of warp on a 95 cm tile is not breaking up a repeat, it is
        // shearing the tile into itself — the sample coordinate slides by two
        // thirds of a period as the 5 m field crosses, and the aggregate folds
        // into bands. 28 cm still offsets adjacent tiles by a third of a period,
        // which is enough that the grid does not read.
        vec2 uvR0 = ( vTile + ( mid.gb - 0.5 ) * 0.28 ) * uReliefScale;
        // Tapered off as the view goes grazing. A four-step relaxed fixed point
        // solves h( uv + d ( 1 - h ) ) = h only while d is small compared with
        // the features in h; at 40 cm off the dirt looking along it the offset
        // came to 15 cm against 12 cm clods, the iteration stopped converging,
        // and the trail rendered as nested contour rings — wood grain, not dirt.
        // Below about 20 degrees the parallax is worth less than the artefact.
        float graze = smoothstep( 0.1, 0.36, viewN.y );
        // 0.45 + 0.55 was written before the offset below was clamped to 4 cm of
        // tile. With that clamp in place the iteration cannot walk off its own
        // clod any more, so the taper is no longer paying for a divergence — and
        // at 0.45 it was removing more than half the relief from the one framing
        // the whole tier exists for: 40 cm off the dirt looking *along* a rut,
        // which is by definition the most grazing view in the scene. That framing
        // came back as combed brown fur while the cross-slope view two metres
        // away had all three tiers in it.
        float pFade = ( 1.0 - smoothstep( 2.8, 8.0, camDist ) ) * uReliefAmt *
                      ( 0.78 + 0.22 * graze );
        // The *offset* is tapered separately from the detail, which is the whole
        // fix for the corduroy the integrated frames showed.
        //
        // pFade used to gate both, so the two were traded against each other: at
        // 0.45 + 0.55 * graze the artefact was gone and so was the near-field
        // relief, and at 0.78 + 0.22 * graze the relief was back and the trail
        // rendered as a ploughed field. They are not the same term. The relaxed
        // fixed point below is what misbehaves, and it misbehaves in proportion to
        // the offset; the normal, cavity, AO and debris channels are all plain
        // fetches and are perfectly well behaved at any angle. So the offset gets
        // the hard taper and the detail keeps the soft one — full three-frequency
        // grain looking along a rut, and no ribbing, from one pair of numbers
        // instead of one compromise between them.
        float pPar = pFade * ( 0.12 + 0.88 * graze * graze );
        // coarser material stands proud further out on the verge; litter is soft
        float rDepth = uReliefDepth * ( 0.8 + mVerge * 0.45 + mTrack * 0.3 );
        vec2 uvR = uvR0;
        float rShadow = 0.0;
        if ( pFade > 0.02 ) {
          // Offset per unit of depth. viewN.y is floored well off zero: these
          // framings look along the ground, where the true value goes to nothing
          // and an unlimited offset swims by half a metre a pixel.
          vec2 pDir = -( viewN.xz / max( viewN.y, 0.5 ) ) * rDepth * uReliefScale * pPar;
          // 2.8 cm of offset in tile units. Anything past this and the four steps
          // below land on a different clod than the one they started on — and a
          // four-step relaxed iteration that lands on the wrong clod does not just
          // lose the parallax, it locks into a standing wave with a period set by
          // the offset. That is a regular corrugation aligned with the view, at an
          // amplitude the height field's full range, which is precisely what the
          // integrated foreground was covered in.
          float pl = length( pDir );
          pDir *= min( pl, 0.028 ) / max( pl, 1e-5 );
          float rh = texture( uTile384, vec3( uvR0, uReliefH_L ) ).r;
          // relaxed fixed point on h( uv + pDir * ( 1 - h ) ) = h
          for ( int i = 0; i < 4; i ++ ) {
            rh = mix( rh, texture( uTile384, vec3( uvR0 + pDir * ( 1.0 - rh ), uReliefH_L ) ).r, 0.66 );
          }
          uvR = uvR0 + pDir * ( 1.0 - rh );
        }
        vec4 relH = texture( uTile384, vec3( uvR, uReliefH_L ) );
        vec4 relN = texture( uTile384, vec3( uvR, uReliefN_L ) );
        if ( pFade > 0.02 ) {
          vec2 sDir = uSunStep * rDepth * uReliefScale;
          float occ = 0.0;
          for ( int i = 1; i <= 4; i ++ ) {
            float dh = float( i ) * 0.14;
            // ray height after climbing dh against the height field there
            occ = max( occ, ( texture( uTile384, vec3( uvR + sDir * dh, uReliefH_L ) ).r - ( relH.r + dh ) ) / ( 0.1 + dh ) );
          }
          rShadow = clamp( occ * 0.68, 0.0, 1.0 ) * pFade;
        }
        // the same displacement in metres, so the finer tiers ride the relief
        // instead of sliding across it
        vec2 pWorld = ( uvR - uvR0 ) / uReliefScale;

        vec4 tTrack = texture2D( map, uvT );
        vec4 tTrack2 = texture2D( map, uvT * 0.27 + 0.41 );
        // The mainline's aggregate, at its own tile scale, plus a coarse tap.
        // The coarse one does two jobs: it breaks up a 1.9 m tile that would
        // otherwise repeat four times across a seven metre road, and read on
        // its own it *is* the unsorted material on the shoulder — same rock,
        // two and a half times the piece size, which is what a grader leaves
        // when it pushes the oversize off the running surface.
        vec2 uvG = vTile * uGravelScale;
        vec4 tGrav = texture2D( uGravelMap, uvG );
        vec4 tGrav2 = texture2D( uGravelMap, uvG * 0.4 + 0.27 );
        // Round 4: the coarse tap is this tile at 4.75 m, and with the 1.9 m
        // tap it repeats exactly every 9.5 m — the one period the mid-ground
        // of a straight road shows off. Same treatment as the 5.2 m macro tap
        // above: a third tap at 1.62 times the period, turned 37 degrees,
        // summed and re-expanded about the tile mean, brought in past 8 m.
        vec4 tGrav3 = texture2D( uGravelMap, mat2( 0.7986, 0.6018, -0.6018, 0.7986 ) * uvG * 0.247 + vec2( 0.63, 0.19 ) );
        tGrav2.rgb = mix( tGrav2.rgb, max( ( tGrav2.rgb + tGrav3.rgb ) * 0.7071 - 0.4142 * uGravMean, 0.0 ), midFar );
        // And the 1.9 m tap itself, which turned out to be the repeat that was
        // actually visible. Measured on the mainline from 30 m overhead, in the
        // albedo alone: the along-road autocorrelation peaked at 4.25 m (0.63)
        // and 8.45 m (0.48) with the two taps above already decorrelated —
        // and 4.25 m is this tile's 1.9 m period crossed at the road's 27°
        // heading (1.9 / sin 27° = 4.19). Past twenty metres the aggregate
        // has mipped away and what is left of the tap is its slow content, a
        // plate of light and dark the size of the tile, laid end to end. Take
        // that slow content out — the tile's own level-5 mip is a 12 cm box
        // filter of it — and put the mean back, so the mid-ground keeps the
        // tile's colour and its aggregate where the aggregate still resolves,
        // and the variation at metre scale comes from the two decorrelated
        // taps and the surface-condition terms instead of from the tile.
        // Level 5 took the 4.25 m peak to 0.13 (level 6: 0.29; level 7 made
        // it worse, 0.55 — a 4 x 4 mip is a wave of its own at the tile's
        // period and subtracting it adds that wave). The tile's repeating
        // content lives at 0.3–0.6 m, which the truck's camera resolves at
        // 20 m along the road and not at 40.
        vec3 gLow = textureLod( uGravelMap, uvG, 5.0 ).rgb;
        tGrav.rgb = mix( tGrav.rgb, max( tGrav.rgb - gLow + uGravMean, 0.0 ), midFar );
        vec4 nGrav = texture2D( uGravelNrm, uvG );
        vec4 tVerge = texture2D( uVergeMap, uvV );
        vec4 tLit = texture2D( uLitterMap, uvL );
        vec4 tLit2 = texture2D( uLitterMap, uvL * 0.23 + 0.67 );
        vec4 nTrack = texture2D( normalMap, uvT );
        vec4 nVerge = texture( uTile384, vec3( uvV, uVergeNrm_L ) );
        vec4 nLit = texture( uTile384, vec3( uvL, uLitterNrm_L ) );
        // The zones. Sand on the river floor, eroded bank above it, the graded
        // pad, the mud round the water hole and the churn where things drive or
        // walk in. Only fetched where a zone is live: most of the world is none
        // of them and the branch is coherent across whole cells.
        float zPad = vZone.x;
        float zSand = smoothstep( 0.58, 0.9, vZone.y );
        float zBank = smoothstep( 0.04, 0.5, vZone.y ) * ( 1.0 - zSand );
        float zMud = vZone.z;
        float zChurn = vZone.w;
        float zAny = max( max( zPad, vZone.y ), max( zMud, zChurn ) );
        vec4 tSand = vec4( 0.0 );
        vec4 nSand = vec4( 0.5, 0.5, 1.0, 1.0 );
        vec4 trk = vec4( 0.5, 0.5, 1.0, 0.6 );
        float trkHi = 0.6;
        if ( zAny > 0.002 ) {
          vec2 uvS = vTile * uGravelScale * 1.15;
          tSand = texture2D( uSandMap, uvS );
          vec4 tSand2 = texture2D( uSandMap, uvS * 0.31 + 0.19 );
          tSand.rgb = breakUp( tSand.rgb, tSand2.rgb, uMean.w );
          nSand = texture( uTile384, vec3( uvS, uSandNrm_L ) );
          vec2 uvK = vTile * uTracksScale + ( mid.gb - 0.5 ) * 0.2;
          trk = texture( uTile256, vec3( uvK, uTracks_L ) );
          trkHi = texture( uTile256, vec3( uvK + uSunStep * 0.02 * uTracksScale, uTracks_L ) ).w;
        }
        vec4 nDetail4 = texture( uTile256, vec3( ( vTile + pWorld ) * uDetailScale, uDetailNrm_L ) );
        // Second tier of the same grit at four times the frequency, faded in
        // over the last few metres. The wheel and contact framings sit 30 cm
        // off the dirt, where a 45 cm tile is already smooth.
        vec4 nGrit = texture( uTile256, vec3( ( vTile + pWorld ) * uDetailScale * 4.3 + 0.21, uDetailNrm_L ) );
        // Close-range aggregate as a multiplicative tint, at two scales. This
        // is what carries chroma detail in the bottom of the frame, where the
        // 2.6 m surface tile is magnified sevenfold and has nothing left.
        vec3 grainA = texture( uTile256, vec3( ( vTile + pWorld ) * uGrainScale.x, uGrain_L ) ).rgb * 2.0;
        vec4 grainB4 = texture( uTile256, vec3( ( vTile + pWorld ) * uGrainScale.y + 0.53, uGrain_L ) );
        // Clod tier, 1.3 m. Between the 2.6 m surface tile and the 40 cm
        // aggregate there was nothing at all, so a metre of trail in the bottom
        // of a low framing carried detail at two scales with a hole between
        // them — which is what "mushy" actually looks like. A graded surface
        // dries and breaks into plates about this size.
        vec4 clod = texture( uTile256, vec3( vTile * 0.78 + vec2( 0.29, 0.83 ), uMacro_L ) );

        vec3 cTrack = breakUp( tTrack.rgb, tTrack2.rgb, uMean.x );
        vec3 cLit = breakUp( tLit.rgb, tLit2.rgb, uMean.y );
        // The gravel's de-tiling tap is held to a fifth of the swing the other
        // two get, and this is a correction rather than a preference. breakUp
        // modulates by the second tap's luminance over the tile mean, and the
        // second tap here is *this same tile* at two and a half times the size
        // — so what it modulates by is the shape of individual 4 cm pieces
        // magnified into 25 cm blobs. At the shared 0.5 strength that is a
        // value swing of 0.7 to 1.55 in the shape of stones, laid over a
        // surface made of stones, and the low framings came back as a cobbled
        // pavement: pieces the right size for a road, sitting inside pieces
        // five times too big. The trail gets away with it because its second
        // tap is a different tile. The metre-scale variety this was supposed to
        // provide is carried properly further down by the scour, silt,
        // washboard and pothole terms, which vary the surface by condition
        // rather than by magnifying its own grain.
        float gm = dot( tGrav2.rgb, vec3( 0.2126, 0.7152, 0.0722 ) ) / uMean.z;
        vec3 cGrav = tGrav.rgb * mix( 1.0, clamp( gm, 0.72, 1.34 ), 0.5 );

        // --- the mainline, in its own road space ------------------------------
        // vMain is the graded road's equivalent of vSide / vAlong, with the
        // trail-versus-gravel blend in x. Everything below is placed off it, so
        // a wheel path stays a wheel path through a bend and the ditch does not
        // wander across the shoulder.
        float share = vMain.x;
        float mAx = abs( vMain.y );
        // Ragged, but nothing like as ragged as the trail's. A grader leaves an
        // edge that wanders by a hand's width over ten metres; a two-track's
        // edge is wherever the last vehicle happened to put a wheel. Making
        // both roads equally ragged was the first thing tried and it read as
        // one road at two widths.
        vec4 mrs = texture( uTile256, vec3( vec2( vMain.z * 0.026, vMain.y * 0.14 + 0.44 ), uMacro_L ) );
        float mAxj = mAx + ( mrs.g - 0.5 ) * 0.42 * smoothstep( uMain.x * 0.4, uMain.x * 1.3, mAx );
        // Junction influence, in both roads' frames. These have to be the same
        // numbers as apronMain / apronTrail in the mesh profile, and the
        // flare the same 2.4 m: the geometry was tightened from a 21 m by 12 m
        // ellipse to 14 by 9.5 when the junction read as a landing strip, and
        // for a while these did not follow. What that mismatch draws is the
        // worst of both — a platform graded to one width carrying scuffing,
        // widening and mud drag sized for a much larger one, so the material
        // apron ran out past the shoulder and over the ditch and every framing
        // came back as one continuous dirt yard with roads leaving it. The
        // junction is the thing this whole feature is looked at for; it is
        // legible only while both roads still have an edge inside it.
        float apM = ( 1.0 - smoothstep( 3.5, 10.0, abs( vMain.z - uJunc.x ) ) ) *
                    ( 1.0 - smoothstep( 3.0, 7.5, mAx ) );
        float apT = ( 1.0 - smoothstep( 3.0, 11.0, abs( vAlong - uJunc.y ) ) ) *
                    ( 1.0 - smoothstep( 2.0, 5.5, ax ) );
        // The culvert, which is a different length from the apron and has to
        // match the culvert() term in the profile: the ditch and the windrow
        // are carried through the junction and interrupted only where the spur
        // actually crosses.
        float cM = 1.0 - smoothstep( 3.2, 6.5, abs( vMain.z - uJunc.x ) );
        // The overlook turnout and the camp access, matching turnout() and
        // access() in the profile: the platform widens on the view side over
        // the crest, and the ditch is culverted at both.
        float sideL = smoothstep( -0.6, 0.6, vMain.y * uLook.z );
        float tO = ( 1.0 - smoothstep( 7.0, 15.0, abs( vMain.z - uLook.x ) ) ) * sideL;
        float sideC = smoothstep( -0.6, 0.6, vMain.y * uAccess.y );
        float cA = ( 1.0 - smoothstep( 6.5, 9.5, abs( vMain.z - uAccess.x ) ) ) * sideC;
        cM = max( cM, max( tO, cA ) );
        float mHalf = uMain.x + apM * 2.4 + tO * uLook.y;
        float mPlat = mHalf + uMain.y;
        float mRun = 1.0 - smoothstep( mHalf - 0.35, mHalf + 0.3, mAxj );
        // The travelled way. Two strips where every wheel that has been down
        // this road has run, polished into the fines; a graded road's whole
        // legibility at distance is these two bands against the loose material
        // between them, exactly as a two-track's is its ruts.
        float mWheel = ( 1.0 - smoothstep( uMain.w * 1.05, uMain.w * 2.1, abs( mAx - uMain.z ) ) ) * mRun;
        // The crown strip: nothing drives over the middle of a road this wide,
        // so the loose surface course survives there.
        float mMid = ( 1.0 - smoothstep( 0.24, 0.72, mAx ) ) * mRun;
        float mShld = smoothstep( mHalf - 0.3, mHalf + 0.4, mAxj ) *
                      ( 1.0 - smoothstep( mPlat - 0.05, mPlat + 0.8, mAxj ) );
        // The ditch invert, and the bank climbing out of it.
        float mDitch = ( 1.0 - smoothstep( 0.25, 1.05, abs( mAxj - ( mPlat + uJunc.z * 0.55 ) ) ) ) * ( 1.0 - cM );
        // Windrow: the bead of material the grader could not pull back onto the
        // road, sitting on the shoulder's outer lip. The one feature that says
        // "maintained" from thirty metres.
        float mWind = ( 1.0 - smoothstep( 0.08, 0.42, abs( mAxj - ( mPlat + 0.12 ) ) ) ) * ( 1.0 - cM );

        vec3 albedo = mix( cLit, tVerge.rgb, mVerge );
        // Dirt scuffed off the running surface onto the margin, broken along the
        // road so the graded band is not itself a stripe.
        albedo = mix( albedo, mix( albedo, cTrack, 0.66 ), mScuff * ( 0.3 + rsEdge.b * 0.8 ) );
        albedo = mix( albedo, cTrack, mTrack );
        // Fines thrown off the running surface and onto the margin, in patches
        // rather than as a wash: what the tyres sling out lands in clumps, and a
        // graded band with an even dusting over it is still a band.
        float mCast = mScuff * smoothstep( 0.4, 0.86, rsEdge.b * 0.6 + mid.g * 0.55 );
        albedo = mix( albedo, cTrack * 1.06, mCast * 0.7 );
        // crevice occlusion folded into the albedo as well as the indirect
        // term: in shade the direct light is gone and an AO term on the
        // ambient alone is not enough to keep the surface from going flat
        float surfAo = mix( mix( mix( nLit.w, nVerge.w, mVerge ), nTrack.w, mTrack ), nGrav.w, share );
        albedo *= mix( 1.0, clamp( surfAo, 0.0, 1.3 ), 0.55 );

        // Road space: distance along the centreline against lateral offset.
        // Anything keyed off it varies down the road instead of with the world
        // grid, which is what stops the print and the crown strip from reading
        // as one continuous painted stripe.
        vec4 rsp = texture( uTile256, vec3( vec2( vAlong * 0.021, vSide * 0.11 + 0.3 ), uMacro_L ) );

        // The tyre print tile repeats, so it has to be masked to one tyre
        // width either side of each rut or it bands across the whole road as
        // a rubber mat.
        float treadU = ( vSide - sign( vSide ) * uRoad.z ) * 2.9;
        // Phase offset per stretch and per side. Without it every lug row on the
        // left rut is exactly abreast of the one on the right for three hundred
        // metres, and two perfectly parallel ladders read as a moulded pattern
        // whatever the contrast is.
        // Along-road warp, so the *pitch* is irregular and not just the phase.
        // A per-stretch phase offset shifts the whole ladder without changing the
        // spacing inside it, so within any one frame the rungs were evenly pitched
        // — and an evenly pitched repeat is read as machined however irregular its
        // contrast is. Warping the along-road coordinate by a quarter of a metre
        // over a 3.6 m field compresses and stretches the spacing locally, which
        // is what later passes landing slightly out of step actually do to a
        // print. Amplitude is held below the fold: 0.25 m over 3.6 m is a slope of
        // 0.44, so the coordinate stays monotonic and the tile never doubles back.
        vec4 rsWarp = texture( uTile256, vec3( vec2( vAlong * 0.28 + 0.11, vSide * 0.05 + 0.6 ), uMacro_L ) );
        float treadV = ( vAlong + ( rsWarp.r - 0.5 ) * 0.5 ) / uTreadPitch +
                       rsEdge.a * 1.7 + step( 0.0, vSide ) * 0.37;
        vec4 tread = texture( uTile256, vec3( vec2( treadU + 0.5, treadV ), uTread_L ) );
        // Broken into runs of a metre or two. A tyre lays a print where the
        // surface is soft and scuffs it out again everywhere else; an unbroken
        // print down the whole trail is a rubber mat, which is exactly what the
        // first pass at full contrast looked like from above.
        // Floored rather than gated. Two multiplied smoothsteps of two noise
        // fields average about 0.28 between them, so the print was at a quarter
        // strength almost everywhere and absent outright over most of the trail
        // — which is exactly how it measured in the frames. It still breaks into
        // runs, it just never disappears.
        // Only where a tyre pressed it, and only where the ground would hold one.
        //
        // The 0.42 floor was added because two multiplied smoothsteps averaged 0.28
        // and the print was measuring as absent. The floor fixed that by putting
        // the print at two fifths of strength over the *entire* tyre band for three
        // hundred metres, which is the thing the integrated frames are complaining
        // about: tread only prints where the surface was soft, and hard-packed
        // ground takes none. So the floor goes and the two gates are widened
        // instead — same mean, but it genuinely breaks into runs with bare ground
        // between them. mac.g and mid.b are the fields the damp term is built from
        // further down; soft ground is damp ground.
        float soft = smoothstep( 0.3, 0.66, mac.g * 0.6 + mid.b * 0.4 + 0.14 );
        float mPrint = ( 1.0 - smoothstep( 0.3, 0.5, abs( treadU ) ) ) * mTrack *
                       smoothstep( 0.2, 0.62, rsp.r ) * smoothstep( 0.12, 0.52, rsEdge.r ) *
                       ( 0.28 + 0.72 * soft ) * ( 1.0 - mCrown * 0.75 );
        // Eaten into by the grit up close. A tyre print a foot from the camera is
        // a worn hollow with fines washed into it, not a clean stamp — at full
        // strength the imprint tile read as a row of rubber rings pressed into
        // lino below about half a metre. 0.4 was too far the other way: it took
        // the print out of exactly the framings it most needed to be in.
        mPrint *= mix( 1.0, 0.66 + nGrit.w * 0.5, gritFade );
        // Floored well off zero — the imprint's occlusion channel bottoms out at
        // 0.42, and a black arc stamped into tan is worse than no print at all.
        // But 0.62 gave a maximum darkening of 22 per cent, which on damp earth
        // under a canopy is nothing: the print measured as absent in every frame.
        // 0.42 is a hollow you can see without being a hole.
        // 0.34 was a 3:1 darkening under the print, which is deeper than the rut
        // tint itself — so the 10 cm tier was outweighing the form tier and the
        // running surface read as corrugated rather than as rutted. Something you
        // notice on the second look wants about a third of a stop.
        float printAo = mix( 1.0, 0.66 + tread.w * 0.4, mPrint * 0.95 );
        albedo *= printAo;
        // Lug crowns push fines aside and the bare block face is a shade lighter
        // and greyer than the hollow: the print needs a light side as well as a
        // dark one or it reads as a stain rather than as something pressed in.
        albedo *= mix( 1.0, 1.0 + smoothstep( 0.62, 0.95, tread.w ) * 0.11, mPrint );
        // The wall of a lug hollow casts a hard shadow into it, and that shadow
        // is the whole reason a print reads as depth rather than as a stencilled
        // pattern. A symmetric AO darkening cannot do it — a hollow with the
        // same shading all the way round it is a stain. The sun step arrives in
        // world XZ, so it has to be rotated into road space against the tangent
        // the vertex shader carries.
        vec2 tanN = normalize( vTan + vec2( 1e-5, 0.0 ) );
        vec2 perpN = vec2( -tanN.y, tanN.x );
        // 1.4 cm of lug depth, expressed in the print tile's own uv units
        vec2 sunRS = vec2( dot( uSunStep, perpN ) * 2.9, dot( uSunStep, tanN ) / uTreadPitch ) * 0.014;
        float wallHi = texture( uTile256, vec3( vec2( treadU + 0.5, treadV ) + sunRS, uTread_L ) ).w;
        float wall = clamp( ( wallHi - tread.w ) * 2.6, 0.0, 1.0 );
        float printShade = 1.0 - wall * mPrint * 0.22;
        albedo *= printShade;

        // Two-track legibility comes from the ruts, and it has to survive at
        // fifteen metres where every texture tier has mipped away to its mean.
        // A rut floor is compacted, damp and polished: distinctly darker and
        // more chromatic than the loose fines on the crown and the shoulder.
        float weather = clamp( uWet, 0.0, 1.0 );
        // Damp stretches at the macro scale, on top of the global dial. Held
        // well off its ceiling: a uniform darkening of the whole running surface
        // spends the contrast budget without buying any *shape*, and the rut
        // tint below is where that contrast has to go.
        float damp = clamp( weather * ( 0.3 + mac.g * 0.6 + mid.b * 0.4 - 0.22 ), 0.0, 1.0 );
        // The rut tint below is a 3.3:1 darkening, and modulating it by the print
        // tile's own occlusion at plus or minus 0.44 put a lug-shaped swing on
        // the darkest band in the frame — long dark strokes down both wheel
        // tracks. The print has its own albedo and normal terms above; it does
        // not need to drive the rut tint as well.
        float sweep = mRut * ( 0.82 + tread.w * 0.22 );
        // the driest a rut ever gets is still darker than the crown beside it
        float dusty = ( 1.0 - damp ) * smoothstep( 0.5, 0.92, rsp.a );
        // Dark end lifted from 0.3 to 0.42. This is a 3.3:1 darkening sitting under
        // a global halving, a 0.52 aggregate occlusion floor and a 0.4 cavity floor,
        // and the integrated foreground showed the result: the troughs read as
        // near-black channels rather than as damp compacted earth. 2.4:1 still puts
        // the ruts clearly under the crown, which is all this term is for.
        // Redder at the dark end than the forest's: a compacted laterite floor is
        // the iron showing through where the dust has been pressed off it.
        vec3 rutTint = mix( vec3( 0.5, 0.4, 0.33 ), vec3( 0.7, 0.62, 0.52 ), dusty );
        albedo *= mix( vec3( 1.0 ), rutTint, sweep );
        float dry = mCrown * ( 0.3 + mac.a * 0.5 ) * ( 1.0 - damp * 0.7 );

        // Fines dragged along the direction of travel. A dirt road streaks
        // lengthwise and the world-space tiles cannot know which way that is,
        // so the streak is sampled in road space and stretched 6:1.
        vec4 streak = texture( uTile256, vec3( vec2( vAlong * 0.42, vSide * 2.6 + 0.7 ), uMacro_L ) );
        // 0.72 + 0.52 was a 1.7:1 swing along a 6:1 stretched tile, stacked on
        // top of the finer drag tap and the relief cavity. All three pull the
        // same way — lengthwise — and together they combed the whole trail into
        // dark filaments that read as matted hair rather than as dirt.
        albedo *= mix( 1.0, 0.9 + streak.r * 0.18, mTrack * ( 0.3 + mRut * 0.7 ) * 0.5 );
        // Second, finer tier of the same thing: tyre-drag grain rather than a
        // wash pattern. This is the term that makes a rut look scored instead of
        // moulded, and it is the reason the road tangent is carried up here as an
        // attribute — the grain has to have a *direction*, and a world-space tile
        // cannot know what it is.
        //
        // The along-road frequency has to stay low. At 1.9 the tile repeated
        // every 53 cm down the trail, and a smooth noise field repeating that
        // often at a 12:1 stretch is not grain, it is marbling — the whole trail
        // came back looking like varnished wood. 0.42 puts the repeat at 2.4 m
        // and the lateral jitter keeps the two axes from lining up.
        vec4 drag = texture( uTile256, vec3( vec2( vAlong * 0.42 + 0.4, vSide * 7.5 + rsp.g * 1.4 ), uMacro_L ) );
        float dragAmt = mRut * detailFade;
        // Contrast halved and broken along the road. Stretched 18:1 this tile has
        // a correlation length of two and a half metres down the trail, so at a
        // grazing framing every filament of it runs from the near edge of the
        // frame to the horizon — and three hundred parallel filaments is combed
        // fur, not tyre drag. The streak tap above pulls the same way, so the two
        // of them together were the whole near-field read looking down a rut.
        // rsEdge breaks it into runs so the grain starts and stops.
        albedo *= mix( 1.0, 0.93 + drag.r * 0.14, dragAmt * 0.85 * ( 0.45 + 0.55 * rsEdge.b ) );

        // Damp earth is darker and more saturated than dry earth, not just
        // darker: water fills the pores between the fines so light stops
        // scattering back out of the top millimetre. Eased off the crown, which
        // is the one strip that has to stay lighter than the ruts either side.
        albedo = mix( albedo, albedo * vec3( 0.62, 0.56, 0.5 ), damp * mTrack * 0.75 * ( 1.0 - mCrown * 0.55 ) );
        float drift = mTrack * smoothstep( 0.62, 0.94, streak.b );
        albedo = mix( albedo, cLit, drift * 0.26 );

        // Dark, light, dark across the road, with the ruts as the dark bands:
        // loose dry material survives on the crown between the wheels and gets
        // pushed out onto the shoulder, and those two paler strips are what make
        // the ruts read as ruts from a distance.
        float mLoose = ( 1.0 - smoothstep( 0.08, 0.8, abs( axj - uRoad.x - 0.05 ) ) ) * mTrack;
        // greyer as well as lighter: this is dried fines and coarse material,
        // and lifting the value alone just made a bright tan stripe
        // Both lifts trimmed hard. Between them, the dry lift and the macro
        // variation below, the crown of the trail was carrying about 1.6 times the
        // base dirt value — and the crown is the widest, flattest, best-lit strip
        // on the running surface, so that is exactly the pale chalky tan ribbon the
        // integrated wide shots showed. The strips still have to read as paler than
        // the ruts either side, which is what makes a two-track legible at
        // distance, but a tenth is enough for that: the rut tint below is a 2.4:1
        // darkening and it does most of the work.
        // Khaki, not blue-grey: the loose material on a laterite track is the
        // same earth ground to flour, and flour is paler and *warmer* than the
        // packed surface, never cooler.
        albedo *= mix( vec3( 1.0 ), vec3( 1.1, 1.07, 1.0 ), mLoose * 0.8 );
        albedo *= mix( vec3( 1.0 ), vec3( 1.12, 1.09, 1.02 ), mCrown * 0.8 );

        // Vegetation surviving down the middle of the two-track. Clumped along
        // the road and shot through with the litter tile's own detail, or it
        // reads as a green line painted down the crown. Tight to the centreline:
        // spread over the whole crown it puts a green cast on the trail.
        // Broken along the road and shot through with the streak field: a
        // continuous band of it down the exact centre reads as a mown grass line
        // painted on the trail, which is what a 0.34 m hard-edged mask gave.
        float lum = dot( tLit.rgb, vec3( 0.2126, 0.7152, 0.0722 ) ) / uMean.y;
        // The per-texel luminance gate is out of the mask. It was multiplying a
        // coherent clump mask by a field that varies texel to texel, so at a metre
        // — where one texel is one pixel — single pixels got the full mix to a
        // colour with twice the dirt's relative green. That is the yellow-green
        // confetti every close crop of the crown had in it, and it survived
        // halving the grain tint's chroma because it is not the grain tint.
        // Weeds grow in clumps, so the mask has to be a clump.
        float mVeg = ( 1.0 - smoothstep( 0.1, 0.52, ax + jit * 0.3 ) ) * mTrack *
                     smoothstep( 0.34, 0.72, rsp.b ) * smoothstep( 0.28, 0.66, streak.g );
        // Straw, not weed: what survives down the middle of a dry-season
        // two-track is last year's grass, bleached, with a little grey-green at
        // the base of it.
        vec3 veg = mix( vec3( 0.09, 0.08, 0.042 ), vec3( 0.17, 0.15, 0.085 ), mac.b );
        // lum runs to about two, so the old 0.5 + lum * 0.9 put the bright end
        // of the litter tile out at 2.3 times a fairly warm olive. Capped, and
        // used only inside the colour now rather than in the mask.
        albedo = mix( albedo, veg * ( 0.62 + min( lum, 1.5 ) * 0.26 ), mVeg * 0.6 );

        // large scale value and warmth variation, so 2 m tiles never read as
        // a repeating pattern in a wide shot. Narrower than it was: at ±20% it
        // was throwing patches across the road big enough to compete with the
        // rut bands for the eye.
        albedo *= mix( 0.9, 1.02, mac.r ) * mix( 0.94, 1.06, mid.g );
        // Warmth variation, held to a much narrower spread than it was. The
        // clay tint in the tile, this term and the warm bounce below all pull
        // the same way, and together they were taking the trail past PNW brown
        // into red laterite.
        albedo *= mix( vec3( 0.96, 0.99, 1.03 ), vec3( 1.04, 1.0, 0.94 ), mac.a );
        albedo = mix( albedo, albedo * 1.05, dry );

        // --- landform: the plain at two hundred metres -----------------------
        // Every term above lives inside a hundred metres; the critics' read was
        // that the ground at 5 m and at 200 m is the same mottle. Two things a
        // plain has that a tile does not: a colour that drifts over hundreds of
        // metres — a grazed flat here, a burnt patch there, a drainage line
        // greener than the rise beside it — and a value that follows the
        // ground's own shape, because a slope facing the sun is drier and paler
        // and a slope steep enough to shed its topsoil shows the laterite
        // gravel under it. Both are slow multiplies, so the close-range
        // laterite every critic praised keeps its internal ratios exactly.
        //
        // The shape comes off the vertex normal, which the mesh already carries
        // analytically at a 1.15 m radius in the far field — the landform, not
        // the ruts. Rotated back into world space through the view matrix's
        // transpose, which is its inverse for a rotation.
        vec4 macFar = texture( uTile256, vec3( vTile / 420.0 + vec2( 0.71, 0.13 ), uMacro_L ) );
        vec3 formN = normalize( ( vec4( vNormal, 0.0 ) * viewMatrix ).xyz );
        vec2 sunXZ = normalize( uSunStep );
        float formSlope = smoothstep( 0.03, 0.22, 1.0 - formN.y );
        float formAspect = dot( formN.xz, sunXZ );
        // Held off the graded surfaces: a road is one material by construction,
        // and the pad was levelled.
        float offRoad = ( 1.0 - max( share, mTrack ) ) * ( 1.0 - zPad * 0.7 );
        albedo *= mix( 1.0, mix( 0.86, 1.12, macFar.r ), 1.0 - share * 0.7 );
        albedo *= mix( vec3( 1.0 ), mix( vec3( 0.95, 1.0, 1.05 ), vec3( 1.07, 1.0, 0.92 ), macFar.a ), offRoad );
        albedo *= 1.0 + formAspect * 0.11 * offRoad;
        // Rock exposure on the steep faces: laterite gravel and the grey of the
        // subsoil, patchy through the mid-scale field so it is a scar and not a
        // contour band.
        vec3 exposed = mix( vec3( 0.19, 0.15, 0.115 ), vec3( 0.26, 0.17, 0.11 ), mid.g );
        albedo = mix( albedo, exposed, formSlope * offRoad * ( 0.3 + 0.4 * mid.g ) );

        // No chromatic trim here any more. Under the old 0xffd2a1 / 7.6 key the
        // rendered trail measured a red/blue ratio of 2.4 — terracotta, not
        // loam — and needed a hard 0.88/1.26 correction at this point. With the
        // key at 0xffe2c6 the trail measures 1.71 to 1.77 across the low
        // framings, against 1.70 for PALETTE.dirt itself, so the correction has
        // moved upstream where it belongs and anything here would overshoot cool.

        // --- standing water ---------------------------------------------------
        // The one thing that separates dirt from sand at a glance. vWet comes
        // from the same function that dished the mesh, so the water is always
        // in a hollow. Three zones: a wide damp halo, a soaked dark rim, and a
        // smooth centre that takes its value from the sky instead of the dirt.
        float pool = vWet * weather;
        float soak = smoothstep( 0.02, 0.3, pool );
        float water = smoothstep( 0.17, 0.44, pool ) * ( 0.62 + 0.38 * smoothstep( 0.3, 0.75, 1.0 - abs( jit ) * 2.0 ) );
        // The water hole's margin does not go through the weather dial: it is
        // wet in the dry season, that is the whole point of it. Saturated mud
        // at the waterline, drying out over the trampled margin in patches —
        // a hoof-pocked shore dries where it is trodden thin and stays dark
        // where it is deep.
        float mudWet = zMud * ( 0.55 + 0.45 * smoothstep( 0.3, 0.7, mac.g * 0.5 + mid.b * 0.5 + zMud * 0.4 ) );
        soak = max( soak, smoothstep( 0.05, 0.6, mudWet ) * 0.85 );
        water = max( water, smoothstep( 0.8, 0.97, zMud ) );
        // The wet band at the waterline. zMud is 1 at the sheet's edge (the
        // dish holds water out to where its depth is half HOLE_DEPTH, which is
        // where the mud mask's inner plateau ends) and 0.9 about three metres
        // out, so 0.86-0.97 is the two metres of shore that was under water
        // last month: saturated, near black, cooler than the dry mud. Broken
        // by the damp field so it is a shore and not a painted ring.
        float shoreRing = smoothstep( 0.84, 0.965, zMud ) * ( 0.72 + 0.28 * mid.b );
        albedo *= mix( vec3( 1.0 ), vec3( 0.4, 0.42, 0.46 ), shoreRing );
        // A soaked rim, several times wider than the water itself. This is most
        // of the cue: a hard-edged dark patch reads as a stain, a dark halo
        // fading out around a smooth centre reads as standing water.
        albedo *= mix( 1.0, 0.5, soak );
        // Cooler as well as darker: water absorbs red first, and what it is
        // reflecting here is a blue-grey sky. These three terms multiply, so
        // they are individually mild — at 0.42 / 0.46 / 0.6 the stack came to an
        // eightfold darkening and the pool read as a char mark on the trail.
        // Eased off where the sheet mesh covers it. Both terms were tuned when
        // there was no water mesh at all; stacked under one they made the pool
        // a hole in the trail rather than a reflective surface on it.
        albedo = mix( albedo, albedo * vec3( 0.58, 0.62, 0.68 ), water * 0.55 );
        // Waterline. The sheet thins to nothing at the edge, so the darkest
        // part of a puddle is the ring of saturated mud right at the margin,
        // not the middle. Without it the pool has a soft outer halo and a
        // uniform interior, which is the silhouette of a bare patch.
        albedo *= mix( 1.0, 0.68, clamp( water * ( 1.0 - water ) * 4.0, 0.0, 1.0 ) * 0.7 );

        // wheels press the dirt down and shade it
        float contact = 0.0;
        float shade = 0.0;
        float scatter = 0.0;
        vec2 contactDir = vec2( 0.0 );
        for ( int i = 0; i < 4; i ++ ) {
          vec4 c = uContacts[ i ];
          if ( c.w <= 0.0 ) continue;
          vec2 d = vWorld.xz - c.xy;
          float r = length( d ) + 1e-4;
          float fall = ( 1.0 - smoothstep( 0.3, 1.2, abs( vWorld.y - c.z ) ) );
          // the patch is one tyre wide: any bigger and it reads as an oil
          // stain rather than as the tyre pressing into the dirt
          float k = c.w * ( 1.0 - smoothstep( 0.12, 0.38, r ) ) * fall;
          // the occlusion from the wheel above reaches further than the dirt
          // it has actually pressed into
          shade = max( shade, c.w * fall * ( 1.0 - smoothstep( 0.2, 0.8, r ) ) );
          // material thrown out around the patch
          scatter = max( scatter, c.w * fall * ( 1.0 - smoothstep( 0.34, 0.78, r ) ) * smoothstep( 0.16, 0.38, r ) );
          if ( k > contact ) { contact = k; contactDir = d / r; }
        }
        // 0.54 with a 0.55 occlusion on top of it came to a 0.3x hole in the
        // trail, and the shade radius is 80 cm — three times a tyre. With the
        // truck hidden the plan framing showed four black discs on the road.
        albedo *= mix( 1.0, 0.7, contact );
        albedo *= 1.0 + scatter * ( 0.6 + jit * 1.0 );

        // --- graded gravel ------------------------------------------------------
        // Built as a whole surface and blended in, rather than as a set of tints
        // over the trail. The two roads share no term: the trail is a matrix of
        // damp fines with ruts cut into it and water standing in them, and this
        // is crushed rock with a crown on it that has never held water in its
        // life. Trying to reach one from the other with masks is what makes a
        // second road read as the first one scaled up.
        // Hoisted: the normal and roughness stages downstream need the same
        // washboard and the same scoured patches the albedo just drew, or the
        // corrugation is a painted stripe and the scour is a stain.
        float gWash = 0.0;
        float gScour = 0.0;
        float gPot = 0.0;
        if ( share > 0.002 ) {
          vec3 gAlb = cGrav;
          // The wheel paths, polished. Fines worked to the top by every axle
          // that has been down here, then compacted: darker, slightly warmer
          // than the broken rock beside it, and smoother. This is the feature
          // the whole surface is read by.
          // A little over two to one against the loose material beside it, and
          // *warmer* as well as darker — what is polished here is the fines,
          // which are the dirt-coloured fraction of the aggregate worked to the
          // top, not the rock. Two warm-dark strips on a cool grey platform is
          // the whole read of a gravel road at any distance past ten metres,
          // and it is the mainline's equivalent of the trail's ruts.
          gAlb *= mix( vec3( 1.0 ), vec3( 0.54, 0.47, 0.41 ), mWheel * 0.96 );
          // The lip either side of the wheel path: the loose fraction the
          // tyres shove outward stands a shade paler and dustier than the
          // surface course beyond it. Paired with the slope term in the normal
          // stage this is what turns the wheel path from a painted stripe into
          // a trough with an edge — dark compacted centre, light ridge.
          float mLipD = abs( mAx - uMain.z );
          // 25-60 cm off the path's centre: the shoulder of the tyre-width
          // channel the normal stage cuts, not the whole gap between paths
          float mLip = smoothstep( 0.22, 0.4, mLipD ) *
                       ( 1.0 - smoothstep( 0.55, 1.0, mLipD ) ) * mRun;
          gAlb *= mix( vec3( 1.0 ), vec3( 1.16, 1.13, 1.08 ), mLip * 0.85 );
          // The wheel path is also the only part of this road that holds water,
          // and it holds it because compaction is what made it impermeable —
          // everything either side drains through the voids between the pieces
          // within minutes of the rain stopping. That is the exact opposite of
          // the trail, where the whole running surface goes dark and the ruts
          // stand full, and it is the third thing separating the two surfaces
          // after aggregate size and hue.
          gAlb *= mix( 1.0, 0.82, mWheel * weather * 0.7 );
          // Loose surface course either side of the wheel paths. Same rock,
          // uncompacted, with dust still on it — so it lifts value without
          // gaining chroma, which is what separates it from the trail's pale
          // dry crown.
          float mLooseG = mRun * ( 1.0 - mWheel * 0.9 ) * ( 0.45 + 0.55 * mMid );
          gAlb *= mix( vec3( 1.0 ), vec3( 1.14, 1.12, 1.08 ), mLooseG * 0.9 );
          // Murram. The running surface measured on screen at a red-to-green
          // ratio of 1.2 — a pale tan, the colour of a granite road — and this
          // is laterite: the fines that bind the surface are iron-red, and the
          // whole road carries their cast. A gentle pull over the platform only;
          // the verge and the grassland beyond keep their own hue.
          gAlb *= mix( vec3( 1.0 ), vec3( 1.02, 0.93, 0.85 ), mRun );
          // Shoulder: the oversize the grader pushed off, breaking down into
          // the verge. Coarse tap on its own, then part way to verge material.
          gAlb = mix( gAlb, mix( tGrav2.rgb * 1.08, tVerge.rgb, 0.45 ), mShld * 0.9 );
          gAlb = mix( gAlb, tGrav2.rgb * 1.2, mWind * 0.85 );
          // Spill: aggregate thrown past the ditch onto the verge, in patches,
          // over the two metres beyond the platform's edge. The grass beyond
          // (the forest's) starts on a line; this is the road's side of a
          // shoulder blend — pale chips thinning out into the straw.
          float mSpill = smoothstep( uJunc.w - 0.5, uJunc.w + 0.2, mAxj ) *
                         ( 1.0 - smoothstep( uJunc.w + 0.4, uJunc.w + 2.2, mAxj ) ) *
                         smoothstep( 0.3, 0.72, mrs.b * 0.55 + mid.g * 0.55 );
          gAlb = mix( gAlb, tGrav2.rgb * 1.12, mSpill * 0.6 );
          // Ditch. The one part of this road that is wet, and it is wet because
          // the crown put the water there — which is the argument the whole
          // cross-section is making. Silt, dark, with weed taking hold in it.
          // Dry season: the ditch is silted with fines and blown straw, not wet.
          // Darker than the platform because it is in its own shadow and the
          // fines are the red fraction, but nothing in it is damp.
          vec3 silt = mix( cLit * 0.78, cTrack * 0.7, 0.45 );
          gAlb = mix( gAlb, silt, mDitch * ( 0.5 + 0.35 * mid.b ) );
          // Grass and moss down the middle where nothing runs. Sparse — a road
          // still in use, not an abandoned one.
          float mGrass = mMid * smoothstep( 0.55, 0.85, mrs.a ) * ( 1.0 - apM );
          gAlb = mix( gAlb, mix( vec3( 0.1, 0.09, 0.05 ), vec3( 0.16, 0.14, 0.08 ), mac.b ), mGrass * 0.42 );
          // Dust film. A gravel road in use is coated in its own grindings and
          // that film is what makes it read as a road rather than as a quarry
          // stockpile; it lies thickest where nothing has swept it off.
          // Neutral, because it is this road's own rock ground up. The trail's
          // dust is soil and pulls warm; this is granite flour and it has no
          // business doing the same, and a warm film over the whole running
          // surface was a measurable part of why the mainline kept measuring
          // at the trail's hue however cool the tile under it was authored.
          // (Laterite now: the dust on a murram road is the road's own red
          // fines, so the film lifts value and pulls a shade warmer with it.)
          gAlb *= mix( vec3( 1.0 ), vec3( 1.09, 1.06, 1.0 ), mRun * ( 1.0 - mWheel ) * ( 1.0 - damp ) * mac.a * 0.5 );

          // --- what a gravel road actually looks like from twenty metres --------
          // Everything above is either a 1.9 m tile, which has mipped to its mean
          // by ten metres, or a cross-section mask, which is the same all the way
          // down the road. Between them they describe a surface with no features
          // at the range it is mostly seen from, and the first pass came back as
          // a smooth ribbon with two darker strips on it — legible as a road and
          // not as gravel. What is missing is metre-scale condition: this is a
          // surface that is *maintained*, which means it is unmaintained
          // everywhere the last grader pass has worn off.
          //
          // Scoured patches: traffic and run-off take the fines away and leave
          // the coarse fraction standing proud. Lighter, greyer, rougher.
          float scour = smoothstep( 0.52, 0.88, mrs.r * 0.55 + mac.g * 0.55 ) * mRun;
          gAlb *= mix( vec3( 1.0 ), vec3( 1.22, 1.23, 1.24 ), scour * 0.75 );
          // And where they have collected instead: a skin of rock flour over the
          // aggregate, which goes dark the moment it is damp because unlike the
          // stone it holds water.
          float silted = smoothstep( 0.5, 0.85, 1.0 - mrs.r * 0.6 - mid.b * 0.4 ) * mRun;
          // Darker, not browner. Same argument as the dust film: this is the
          // same mineral as everything else on the road, wet.
          gAlb *= mix( vec3( 1.0 ), vec3( 0.76, 0.755, 0.75 ), silted * ( 0.4 + 0.6 * damp ) * 0.8 );
          // Washboard. A gravel road corrugates across the direction of travel
          // wherever anything brakes or accelerates on it, and nothing else in
          // the world does that — it is the one feature that names the surface
          // outright. It lives in the shading rather than in the mesh: the brief
          // for this road is that it rides smoother than the trail, and 2 cm
          // ripples at a 70 cm pitch under a 0.16 m suspension would be the
          // roughest thing in the world. Irregular in pitch as well as phase,
          // for the reason the trail's ripples are: an evenly spaced repeat
          // reads as machined however good its contrast is.
          float wbWarp = texture( uTile256, vec3( vec2( vMain.z * 0.09, vMain.y * 0.04 + 0.2 ), uMacro_L ) ).r - 0.5;
          float wbPhase = ( vMain.z + wbWarp * 0.9 ) * 8.6;
          // Only on the travelled way, only where a truck works — it forms on
          // grades, on the approach to the junction and through bends, not down
          // an idle straight — and only in runs of a few metres.
          //
          // The first pass had it at three quarters strength across the whole
          // platform, and the overhead framing came back as a ploughed field:
          // a hundred metres of perfectly parallel, perfectly even ribs from
          // ditch to ditch. Corrugation on a real road covers maybe a fifth of
          // the surface, it lives in the wheel paths where the load is, and its
          // crests vary by a factor of three along any one run. Something you
          // notice on the second look, not the first.
          float wbAmt = mWheel * smoothstep( 0.55, 0.86, mrs.a * 0.55 + mac.r * 0.5 ) *
                        smoothstep( 0.35, 0.7, mid.r );
          // Per-crest amplitude, at a wavelength close to the ripple's own, so
          // the ribs come and go along a run rather than marching evenly through
          // it. Same argument as the trail's braking ripples: irregular *pitch*
          // and irregular *amplitude*, or an evenly spaced repeat reads as
          // machined however good its contrast is.
          float wbVar = 0.25 + 0.75 * smoothstep( 0.3, 0.75, texture( uTile256, vec3( vec2( vMain.z * 0.42 + 0.7, 0.31 ), uMacro_L ) ).g );
          float wb = sin( wbPhase ) * 0.5 + 0.5;
          wbAmt *= wbVar;
          gAlb *= mix( 1.0, 0.93 + wb * 0.15, wbAmt * 0.7 );
          // Potholes at the start of their lives: a shallow dish with the fines
          // gone out of it and a ring of loose stone round the rim. Rare, and
          // never on the crown — water has to stand for one to form.
          float ph = smoothstep( 0.78, 0.94, mrs.b * 0.6 + clod.g * 0.55 ) * mRun * ( 1.0 - mMid * 0.7 );
          gAlb *= mix( 1.0, 0.66, ph * 0.8 );
          // The derivative of the ripple, not the ripple: what the normal wants
          // is the slope of the corrugation, which is a quarter period out of
          // phase with its shading.
          gWash = cos( wbPhase ) * wbAmt;
          gScour = scour;
          gPot = ph;
          // --- the junction -----------------------------------------------------
          // Mud dragged out of the spur. A truck coming off an unmade road
          // carries a wheel's worth of it onto the graded surface and lays it
          // down over the first fifteen metres, in strips that break up as they
          // go. This is the single most legible thing about a real junction and
          // it is what stops the two roads reading as two ribbons crossing.
          // It has to stay *streaky* and it has to stay off most of the apron.
          // The first pass mixed four fifths of the way to dirt across the whole
          // flare, which put warm brown over the gravel exactly where the two
          // surfaces have to be told apart — so the junction rendered as one
          // continuous dirt yard with a road leaving it. What a truck actually
          // lays down is two wheel-widths of it, swinging out of the spur and
          // fading over ten metres or so, with clean gravel between and beside.
          // Both branches carry the wheel-width band, not just the mainline's.
          // The spur's own flare was a full-strength wash over everything
          // inside it, so the one part of the apron a driver is looking at as
          // they come out of the trees — the ground straight ahead, where the
          // spur meets the gravel — was the part with no gravel left in it.
          // A truck lays down two wheel-widths of mud, and the road either
          // side of them stays the road.
          float dragBand = 1.0 - smoothstep( 0.3, 0.85, abs( abs( vMain.y ) - uMain.z ) );
          float dragOut = max( apM * apM, apT * 0.85 ) * ( 0.2 + 0.8 * dragBand ) *
                          smoothstep( 0.34, 0.78, mrs.b * 0.6 + rsEdge.b * 0.6 );
          gAlb = mix( gAlb, cTrack * 0.82, clamp( dragOut, 0.0, 1.0 ) * 0.62 );
          // Scuffing: the apron is churned rather than graded, so the surface
          // course is turned over and the fines are up. Darker and more broken
          // than the road either side of it.
          gAlb *= mix( 1.0, 0.88 + mrs.r * 0.24, apM );
          // The voids between the pieces, which is where packed aggregate gets
          // its thickness from — deeper and narrower than anything on the
          // trail, so it takes more occlusion, not less.
          gAlb *= mix( 1.0, clamp( nGrav.w, 0.0, 1.3 ), 0.62 );
          albedo = mix( albedo, gAlb, share );
        }

        // --- the savanna zones -----------------------------------------------
        // Each is a surface in its own right, blended in over whatever the roads
        // left, and the order is the order they lie in: the river's bank and
        // floor, then the pad over the top of any of it, then the mud, which is
        // a condition rather than a material and darkens whatever it is on.
        float trkMask = 0.0;
        if ( zAny > 0.002 ) {
          // The bank: the grass stripped off and the laterite subsoil showing,
          // with the stones the flow left standing out of it. Same earth as the
          // track, a little darker, no dust film.
          vec3 bankAlb = mix( cTrack * 0.86, cLit * 0.8, 0.3 ) * mix( 0.88, 1.06, clod.g );
          albedo = mix( albedo, bankAlb, zBank * 0.85 );
          // The floor: sand. Pale, and the one surface here that is not red.
          albedo = mix( albedo, tSand.rgb, zSand );
          // The pad: compacted laterite with murram worked into it, graded flat
          // and driven over for a season. Between the track and the gravel —
          // dirt with stone in it — and dustier than either, because nothing
          // sheds the dust off a pad.
          float padStone = smoothstep( 0.35, 0.75, mid.g * 0.6 + clod.r * 0.5 );
          vec3 padAlb = mix( cTrack * 1.02, cGrav * 0.84, 0.3 + padStone * 0.4 );
          padAlb *= mix( vec3( 1.0 ), vec3( 1.12, 1.09, 1.02 ), smoothstep( 0.3, 0.8, mac.a ) * 0.6 );
          // Grass creeping back over the parts nobody parks on.
          float padGrass = smoothstep( 0.62, 0.9, mrs.a * 0.5 + mac.b * 0.6 ) * ( 1.0 - zChurn );
          padAlb = mix( padAlb, cLit * 0.95, padGrass * 0.55 );
          albedo = mix( albedo, padAlb, zPad * ( 1.0 - share ) );
          // Churn: turned-over earth. The dust film is gone off it, the clods
          // are up, and it is darker and rougher than the surface beside it.
          float clods = smoothstep( 0.3, 0.75, clod.r );
          albedo *= mix( vec3( 1.0 ), mix( vec3( 0.62, 0.55, 0.5 ), vec3( 1.0, 0.97, 0.94 ), clods ), zChurn * 0.9 );
          // Mud. Water in the pores: darker, more saturated, redder still.
          albedo = mix( albedo, albedo * vec3( 0.5, 0.42, 0.37 ), smoothstep( 0.02, 0.6, mudWet ) * 0.85 );
          // Tracks pressed into anything soft: the mud round the water hole and
          // the churned apron. Shaded like the tyre print — a hollow, a lip, and
          // a wall that shadows toward the sun.
          trkMask = clamp( smoothstep( 0.1, 0.6, zMud ) * 1.0 + zChurn * 0.55, 0.0, 1.0 ) * ( 1.0 - water );
          float trkAo = mix( 1.0, 0.7 + trk.w * 0.36, trkMask );
          float trkWall = clamp( ( trkHi - trk.w ) * 2.4, 0.0, 1.0 );
          albedo *= trkAo * ( 1.0 - trkWall * trkMask * 0.24 );
        }
        // Grain in the albedo up close, so nothing within reach is ever flat.
        // The tint tiers carry hue as well as value — a pebble that is only
        // darker still reads as a smudge, a pebble that is darker *and* greyer
        // than the earth around it reads as a stone.
        // Damped inside the rut: the trough is polished, and stacking two tiers
        // of pebble tint over it turned the one band that has to read as packed
        // and smooth into the roughest thing in the frame.
        float loose = 1.0 - sweep * 0.62;
        // The old tiers are pulled back where the relief tile takes over, or the
        // same 3 cm features get drawn twice at slightly different scales, which
        // is the definition of mush.
        // Eased a little on the mainline. The relief tile still takes over
        // there, so the pull-back stands, but the 10.6 cm tier it is pulling
        // back is 3.5 mm grit — which is the fines fraction of a graded
        // aggregate and describes this road as well as it describes the trail.
        float oldTier = 1.0 - pFade * 0.7 * ( 1.0 - share * 0.3 );
        // Relief aggregate. Three frequencies out of one fetch: the cavity term
        // darkens the hollows between the clods, the stone mask lifts and greys
        // the exposed caps, and the debris mask drops bark and needle fragments
        // over the lot. Damped in the rut trough, which is the one band that has
        // to read as polished rather than as scree.
        // Eased off from 0.55. A rut floor is polished compared with the crown,
        // but at 40 cm it is still earth: it has grain, pressed-in chips and the
        // odd stone in it. Halving the relief in the rut on top of handing the
        // near field over from the tile left the one band the camera spends most
        // of its time over as the flattest thing in the frame.
        // fpFade belongs here as well as on the normals. The cavity, stone and
        // debris channels come out of the same fetch on the same coordinate, so at
        // an oblique footprint they smear into filaments exactly as the normal does
        // — and these three write straight into the albedo, so their filaments are
        // dark streaks rather than shaded ones. Tapering the normals alone left the
        // comb behind at half contrast, which is how this was found.
        // Barely eased on the mainline, and it was tried at a fifth and put
        // straight back. The relief tile is a field of dirt clods, which is a
        // fair account of a two-track and a loose one of crushed rock — but it
        // is the only near-field tier in this shader that does *not* streak at
        // a grazing footprint, because the parallax offset and the sun march
        // move with it, and the base tile has just been taken back down to the
        // trail's 0.42 for exactly that reason. Something has to carry the
        // shape inside two metres. Its clods are the right size for aggregate
        // and the wrong shape, and wrong-shaped shape beats a comb.
        float relLoose = ( 1.0 - sweep * 0.32 ) * ( 1.0 - water * 0.9 ) * ( 1.0 - share * 0.25 );
        float relAmt = pFade * relLoose * fpFade;

        // One occlusion for the whole aggregate stack, not five multiplies.
        //
        // The clod, grit, detail and relief-cavity tiers are all height fields of
        // the same surface, so their hollows sit on top of each other — a texel
        // low in one is low in all of them. Multiplied independently they came to
        // 0.9 * 0.72 * 0.76 * 0.68 = 0.33, landing on top of the 0.3 rut tint and
        // the 0.62 damp term, with the ambient stack below then doing the same
        // thing again for another factor of seven. Two correlated stacks
        // multiplying out to a thousandth is the arithmetic behind "the near
        // field is black blobs with pale stones standing in it": the three tiers
        // of shape were all present and being drawn between two and seven per
        // cent reflectance, where nothing is legible and where an unoccluded
        // pebble looks like paper. Summed into one deficit and applied once, the
        // same tiers give the same shape over a range light can be seen in.
        float aggOcc = 0.0;
        aggOcc += ( 0.34 - relH.g * 0.5 ) * relAmt;
        aggOcc += ( 0.24 - nDetail4.w * 0.36 ) * detailFade * loose * oldTier;
        aggOcc += ( 0.2 - nGrit.w * 0.3 ) * gritFade * loose * oldTier;
        aggOcc += ( 0.08 - clod.r * 0.16 ) * detailFade * 0.75;
        albedo *= clamp( 1.0 - aggOcc, 0.66, 1.14 );
        // The chromatic tiers stay separate, because these carry hue rather than
        // value and a pebble that is only darker reads as a smudge where one that
        // is darker *and* greyer reads as a stone. Both are re-centred on one so
        // they cannot rejoin the darkening stack.
        // Half the chroma, all the value. These are per-texel ratio fields, so at
        // a metre a single texel is a single pixel — and an isolated pixel half a
        // stop off its neighbours in *hue* is a speck of confetti, where the same
        // pixel off in value is grain. The close crops had olive and yellow-green
        // flecks scattered through the near field from exactly this.
        vec3 gA = grainA * 0.5 + 0.5;
        vec3 gB = grainB4.rgb + 0.5;
        gA = mix( vec3( dot( gA, vec3( 0.3, 0.59, 0.11 ) ) ), gA, 0.55 );
        gB = mix( vec3( dot( gB, vec3( 0.3, 0.59, 0.11 ) ) ), gB, 0.55 );
        // Taken most of the way out over the mainline, and this is a hue
        // correction rather than a detail decision. These two tiers, the stone
        // cap lift and the organic debris multiply below are all built from the
        // *dirt* grain tile, and every one of them pulls warm. Stacked on the
        // gravel they were taking a tile authored at a 0.96 red/blue ratio to
        // 1.30 before a single light touched it, and the warm key then took that
        // to 1.76 — which is the trail's own hue, on the road whose entire job
        // is to not be the trail. They describe a matrix of fines with grit in
        // it, which is not what is on this road.
        float dirtTier = 1.0 - share * 0.72;
        albedo *= mix( vec3( 1.0 ), gA, detailFade * 0.7 * loose * dirtTier );
        albedo *= mix( vec3( 1.0 ), gB, gritFade * 0.5 * loose * dirtTier );
        // Held down: the cap of an embedded stone is a shade lighter than the
        // matrix, not a third lighter. At 0.45 the tile's stone mask was putting
        // measurable pale speckle over the whole trail again.
        albedo = mix( albedo, albedo * vec3( 1.2, 1.18, 1.13 ), relH.b * relAmt * 0.3 * dirtTier );
        // Debris, as a multiply rather than a mix to a fixed near-black. 0.030
        // against a trail rendering at 0.06 is a hole punched in the surface, and
        // the stamped needles are 0.7 mm wide — so what the tile actually drew
        // was a mat of black hairs, which is most of what the near-field speckle
        // was. Bark and needles are dark brown and they are lying *on* the dirt.
        // Bark and needles trodden into the surface. There is far less of it on
        // a road in the open than on a two-track under a closed canopy, and what
        // there is does not have the dirt's own hue.
        albedo = mix( albedo, albedo * mix( vec3( 0.5, 0.44, 0.36 ), vec3( 0.52, 0.5, 0.47 ), share ), relH.a * relAmt * 0.7 );
        // water is a mirror, not a diffuser: kill whatever aggregate the tint
        // tiers just put into it
        albedo = mix( albedo, albedo * vec3( 0.9, 0.94, 1.0 ), water * 0.5 );

        // --- the pride's trodden ring (round 6) -------------------------------
        // Under the lions the ground was the open plain's tile: pale laterite
        // with the straw litter stamped on it, and a lawn of straw-coloured
        // tufts on top. Where a pride lies up every day the straw is gone and
        // the earth is packed: darker than the plain, greyer, and without the
        // stems and the pale stone caps. The litter is what the litter tile
        // has over and under its own local mean (the tile five mips down:
        // 20 cm at the near camera, the tile's mean from the air), so the
        // plain's composed albedo is divided by that ratio — the stems, the
        // stone caps and the tuft discs go, the finer grain tiers composed
        // in above it stay — then pulled halfway to a dust grey and taken to
        // 0.75 of itself. Measured from 60 m up with the vegetation and the
        // lions hidden, against the plain 18–22 m out to either side (the
        // road's verge is 20 m north of the rest point and the hole 18 m
        // south, so the whole annulus reads 15 % high): the division alone
        // is luma-neutral — the dark tuft discs go with the pale stems — so
        // at 0.88 the ring sat at 0.995 of the plain, grey and litter-free
        // but not trodden; 0.75 puts it at 0.85. Two earlier cuts: the mip-3
        // tile in place of the albedo lost the occlusion and clod terms
        // composed into the plain and came out a blurred beige disc;
        // dividing out only the pale excess left the dark discs and half
        // the lattice (stem coverage 14.8 → 10 %).
        // Full inside 6 m of the rest point, recovered by 11 (forest.js's
        // lawn ring is 7–11). The road, the pad and the water hole's mud keep
        // their own surfaces.
        float prideD = distance( vWorld.xz, uPride.xy );
        float trodK = ( 1.0 - smoothstep( uPride.z, uPride.w, prideD ) ) * ( 1.0 - max( share, mTrack ) ) * ( 1.0 - zMud ) * ( 1.0 - zPad );
        // a few metres of unevenness so the ring is a worn patch, not a stencil
        trodK *= 0.8 + 0.2 * smoothstep( 0.25, 0.75, mid.g * 0.6 + mac.b * 0.4 );
        if ( trodK > 0.002 ) {
          const vec3 TROD_LUMA = vec3( 0.2126, 0.7152, 0.0722 );
          float litLowL = max( dot( texture2D( uLitterMap, uvL, 5.0 ).rgb, TROD_LUMA ), 1e-3 );
          // the tile's own variation over its local mean, both ways — the pale
          // stems and stone caps and the dark tuft discs are all last season's
          // litter, and trodden earth has none of them; the finer grain tiers
          // composed into the albedo stay, so it is packed earth, not a fill
          float stem = clamp( dot( tLit.rgb, TROD_LUMA ) / litLowL, 0.4, 2.5 );
          // and the second tap's: breakUp modulates the tile by the same tile
          // at 4.3× the size, so its drifts are ten-metre pale blobs on the plain
          float stem2 = mix( 1.0, clamp( dot( tLit2.rgb, TROD_LUMA ) / uMean.y, 0.4, 2.1 ), 0.5 );
          vec3 trod = albedo / ( stem * stem2 );
          float trodL = dot( trod, TROD_LUMA );
          trod = mix( trod, vec3( trodL ) * vec3( 1.03, 0.99, 0.94 ), 0.5 ) * 0.75;
          // paw-scuffed unevenness at the clod scale, in value only
          trod *= 0.92 + 0.16 * clod.g;
          albedo = mix( albedo, trod, trodK );
        }

        // --- level, against the surroundings rather than in isolation ----------
        //
        // One scale, applied last, because a multiply is the only operation that
        // moves the level without touching a single internal ratio: every tier
        // above keeps exactly the contrast in stops it was tuned to have.
        //
        // The forest was re-lit under me — the foliage picked up its own aerial
        // perspective and the scene fog halved in linear — and this surface was
        // balanced against the brighter version. Measured off the integrated
        // frames, the ground was running at 0.13 to 0.19 linear luminance against
        // 0.02 to 0.05 for the canopy standing on it and 0.08 for the brightest
        // sunlit foliage in the frame. Four to eight times the trees is not a track
        // through a wood, it is a lit ribbon with a wood painted behind it, and it
        // took the eye straight off the truck. A damp compacted forest track is a
        // dark surface that is merely lighter than the shade beside it.
        // 0.6, not 0.5. At 0.5 the shaded stretches of trail went to 5 thousandths
        // of white against 20 for the shaded foliage — the track stopped being a
        // dark surface and became a hole, which is the failure on the other side of
        // the one this is fixing. The sunlit top end is what pulls the eye, and it
        // is brought down by the bounce and sky terms below rather than by taking
        // the albedo further: those two are most of the light in shade and almost
        // none of it in sun, so moving them separates the two ends instead of
        // sliding both.
        // 0.68. The level cut is shared now rather than carried entirely here: the
        // pale-crown, loose-fines and dry lifts above have come down with it, and
        // those are what actually made the top end chalky. Measured on the frames,
        // a flat scale was the wrong instrument on its own — the trail's internal
        // range came out *wider* than it started (36:1 against 28:1) because the
        // tone curve's toe steepens whatever you feed into it, so sliding the whole
        // surface down cost more at the bottom than at the top. Trimming the lifts
        // takes the top end down where it is actually too bright, which lets this
        // stay high enough that the shaded stretches keep their detail.
        albedo *= 0.68;
        // 0.65, not 0.5, where the sheet mesh covers it: the dirt under standing
        // water is what the pool shows through its own reflection, and taking that
        // down with everything else would turn every puddle into a black hole in
        // the trail rather than a dark surface with the canopy on it.
        albedo *= mix( 1.0, 1.3, water );

        diffuseColor.rgb *= albedo;
        if ( uDebug > 0.5 && uDebug < 1.5 ) diffuseColor.rgb = vec3( mTrack * 0.5 + mVerge * 0.5, mRut, mPrint );
        if ( uDebug > 2.5 && uDebug < 3.5 ) albedo = vec3( sweep, mRut, mPrint );
        if ( uDebug > 3.5 && uDebug < 4.5 ) diffuseColor.rgb = vec3( water, soak, damp );
        // 5 is the mainline: which road owns the fragment, where the travelled
        // way is, and where the shoulder and ditch fall. Two roads blended by
        // authority cannot be debugged from a lit frame — every failure mode
        // looks like "the colour is a bit off".
        // Written into albedo rather than into diffuseColor, and read back
        // unlit below. A mask drawn through the light rig is a mask multiplied
        // by an 8-intensity key, and every one of these came back at 1.0.
        if ( uDebug > 4.5 && uDebug < 5.5 ) albedo = vec3( share, mWheel, mShld + mDitch );
        if ( uDebug > 5.5 && uDebug < 6.5 ) albedo = vec3( mRun, apM, apT );
        // 7 is the savanna zones: pad, river floor and bank, mud and churn.
        if ( uDebug > 6.5 && uDebug < 7.5 ) albedo = vec3( zPad, zSand + zBank * 0.5, zMud + zChurn * 0.5 );
        // 15 is the pride's trodden ring, unlit; 16 the albedo itself, unlit.
        if ( uDebug > 14.5 && uDebug < 15.5 ) albedo = vec3( trodK );
        // 12 and 13: the two mid-ground taps as fields, for the repeat measurement.
        if ( uDebug > 11.5 && uDebug < 12.5 ) albedo = vec3( mid.g );
        if ( uDebug > 12.5 && uDebug < 13.5 ) albedo = vec3( dot( tGrav2.rgb, vec3( 0.2126, 0.7152, 0.0722 ) ) / uMean.z * 0.5 );`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `float roughnessFactor = roughness * mix( mix( tLit.a, tVerge.a, mVerge ), tTrack.a, mTrack );
        // Floored. The grain tile's alpha runs down near zero in places, and a
        // 0.1 roughness on dirt carrying full aggregate normals against a 2.1
        // envMapIntensity and a blue sky is a field of hard cyan specks — which
        // is what every close crop had scattered over the running surface.
        roughnessFactor *= mix( 1.0, mix( max( grainB4.a, 0.62 ), 1.0, 1.0 - gritFade ), 0.9 );
        // An exposed stone cap is the only part of a dirt surface that has been
        // polished by anything, so it is also the only part with a sheen. Without
        // this the aggregate has the right shape and the wrong substance.
        // 0.62 is a broad enough lobe on a 2.1 envMapIntensity to pick the blue
        // sky straight out of the environment, and the close crops came back
        // with cyan sparkle over the whole near field. A wet-looking stone is
        // worth less than a trail with no glitter on it.
        roughnessFactor = mix( roughnessFactor, 0.79, relH.b * pFade * 0.4 );
        roughnessFactor = mix( roughnessFactor, 0.99, relH.a * pFade * 0.6 );
        // a compacted rut floor is polished by the tyres; damp fines are
        // smoother again
        // 0.66 at up to 0.85 weight put a near-plastic lustre over the whole rut
        // band, and damp is a broad macro field rather than a puddle halo, so
        // that band is most of the corridor. Under the drag grain's along-road
        // normal the result was a hard anisotropic streak down each trough —
        // shrink wrap, not damp earth. Zeroing uWet removed it completely, which
        // is how it was pinned. A damp patch is a *broad* lustre, so what it wants
        // is a small step toward mid roughness, not a mirror.
        roughnessFactor = mix( roughnessFactor, 0.74, sweep * ( 0.12 + damp * 0.38 ) );
        // The rim stops at 0.68. Dropping it to 0.5 put a low-roughness sheen on
        // ground that still has full aggregate normals on it, and the result was
        // a band of hard warm sparkle around every puddle.
        roughnessFactor = mix( roughnessFactor, 0.81, soak * 0.7 );
        // Open water. 0.18 spreads the sun's own lobe over ten degrees of
        // surface, and a puddle seen from standing height is most of ten degrees
        // wide — so the whole pool lit up as one flat mustard plate with a dark
        // rim, reading as a bald patch rather than as water. Tight enough now
        // that the sun is a glint and the sky is a legible reflection; the
        // ripple normal below is what keeps that from reading as sheet ice.
        // Keyed off a hard threshold on the water mask, not off the mask itself.
        // A half-strength mask gave half a mirror finish on ground that still
        // has full aggregate normals on it, and a bumpy normal under a 0.4
        // roughness against a blue sky is not damp earth, it is cyan glitter —
        // which is what the close crops showed all round every puddle margin.
        // The normal flattens on the same curve below, so the sheen and the
        // flatness arrive together.
        // Damp mud, not a mirror. The wetness field runs continuously down the
        // rut trough, so a 0.13 roughness keyed off it painted a polished ribbon
        // three hundred metres long — an oil slick lying in the wheel track, with
        // the sky sliding along it. The mirror belongs to the puddle *mesh*,
        // which is discrete; all this term has to do is say the fines here are
        // saturated.
        roughnessFactor = mix( roughnessFactor, 0.56, smoothstep( 0.3, 0.72, water ) );
        // 0.28 rather than 0.05. Nothing on this surface is water any more — the
        // puddle sheet is its own mesh — and there is no part of damp earth or
        // exposed aggregate that belongs under a quarter roughness. Everything
        // that did was rendering as sparkle.
        // Floor at 0.4, not 0.28. A 0.28 roughness against a 2.1 envMapIntensity
        // and a blue sky puts a specular lobe narrow enough to resolve the sky as
        // a *colour* on every up-facing aggregate normal in the near field, and
        // the close crops still had cyan pinpricks scattered through the grain.
        // Dry earth and weathered stone do not have a lobe that tight.
        roughnessFactor = clamp( roughnessFactor + dry * 0.06, 0.4, 1.0 );
        // The mainline's wetness behaviour, which is the third thing that has
        // to separate it from the trail after aggregate size and hue.
        //
        // Compacted earth holds water across its whole surface: it darkens
        // everywhere, it stands in the ruts, and the sheen is broad. Crushed
        // rock does not hold water at all — that is what the crown and the
        // ditches are for — so the only smooth thing on this road is the
        // polished fines in the two wheel paths, and everything else stays
        // matte however hard it is raining. A gravel road in the wet reads as
        // two dark satin strips on a dry-looking surface, and that contrast is
        // the whole cue.
        if ( share > 0.002 ) {
          float gRough = tGrav.a;
          gRough = mix( gRough, 0.66, mWheel * ( 0.3 + 0.45 * weather ) );
          gRough = mix( gRough, 0.8, mDitch * 0.55 );
          // Fresh broken faces in the windrow and on the shoulder: nothing has
          // been over them, so they are the roughest thing on the road.
          gRough = min( 1.0, gRough + ( mShld + mWind + gScour * 0.5 ) * 0.06 );
          // A pothole holds what the rest of the road sheds.
          gRough = mix( gRough, 0.7, gPot * 0.5 );
          roughnessFactor = mix( roughnessFactor, clamp( gRough, 0.46, 1.0 ), share );
        }
        // Sand is matte whatever the light does; the pad is the track's finish;
        // saturated mud is the one broad sheen in the savanna, and it is broad —
        // a step toward mid roughness, not a mirror, for the reason the damp
        // term above is.
        roughnessFactor = mix( roughnessFactor, max( tSand.a, 0.86 ), zSand );
        // Round 5: 0.92, from 0.58. From the pride camera the margin is seen
        // at three degrees, where any finish under 0.8 returns a good part of
        // the sky as sheen over an albedo of 0.05 — and the trampled ring
        // rendered as a pale grey band (0.28 linear Y) *brighter* than the
        // pool it surrounds (0.24); at 0.72 it still matched the plain
        // (0.27) with the plain's hue washed to a pink-grey. Trampled mud a
        // few metres from the water is damp, not wet: matte, its own dark
        // colour showing, and the sheen belongs to the last half metre.
        roughnessFactor = mix( roughnessFactor, 0.92, smoothstep( 0.3, 0.9, mudWet ) * 0.8 );
        // Round 5: the wet annulus. The last 0.6 m before the waterline was
        // under water this morning and has not dried: a broad sheen at 0.35,
        // which is what tells the shore from the trampled margin behind it.
        // zMud is 1 at the line and falls as the square of the distance out
        // — 0.993 at 0.6 m, 0.985 at 0.9 m — so the band is 0.984–0.996.
        // The albedo there is already the soaked margin's (0.45 of the plain,
        // from the soak and the cooling above), so only the finish changes.
        roughnessFactor = mix( roughnessFactor, 0.35, smoothstep( 0.984, 0.996, zMud ) );`,
      )
      .replace(
        '#include <normal_fragment_maps>',
        `vec3 mapN = mix( nLit.xyz, nVerge.xyz, mVerge );
        mapN = mix( mapN, nTrack.xyz, mTrack );
        mapN = mix( mapN, nGrav.xyz, share );
        // Sand ripples on the river floor; the pad takes the track's tile; mud
        // is smooth under the prints, which are added as their own slope below.
        mapN = mix( mapN, nSand.xyz, zSand );
        mapN = mix( mapN, nTrack.xyz, zPad * ( 1.0 - share ) * 0.7 );
        // the trodden ring: the stems' relief is trodden flat with the stems
        mapN = mix( mapN, vec3( 0.5, 0.5, 1.0 ), max( smoothstep( 0.3, 0.9, mudWet ) * 0.7, trodK * 0.7 ) ) * 2.0 - 1.0;
        // Prints: a hollow with a lip round it, about a centimetre deep, at
        // full strength wherever the ground was soft enough to take one.
        mapN.xy += ( trk.xy * 2.0 - 1.0 ) * 0.9 * trkMask * fpFade;
        // Aggregate standing proud is what this surface is, so its tile keeps
        // more of its own relief than the trail's does — but the wheel paths
        // are compacted flat and the pieces in them are bedded down, so the
        // slope comes off there. A polished strip with full aggregate relief on
        // it is the one thing that would give the wheel path away as a tint.
        mapN.xy *= mix( 1.0, 1.0 - mWheel * 0.55, share );
        // The surface tile is 2.6 m across 512 px, so its normal map is a
        // gradient measured over 5 mm steps at a strength of 6.4. Magnified
        // eightfold in a 30 cm framing those slopes tilt micro-facets right off
        // the key, and the tile's worley stone caps come out as hard black
        // crescents stamped into tan — the "rings" every low framing had. The
        // 40 cm and 11 cm tiers below are the right scale for that range, so
        // hand the relief over to them as the camera comes in. 0.45 here cut the
        // near-black crescents threefold but took a quarter of the measured
        // high-frequency energy in the 30 cm framing with it, which is the mushy
        // close range this surface started out with; 0.62 keeps most of the
        // relief and the finer tiers below are lifted to cover the rest.
        // Handed over almost entirely to the relief tier inside two metres. The
        // surface tile is a 2.6 m height field at 5 mm a texel and most of its
        // normal energy is a warped worley crack network; magnified eightfold in
        // a knee-height framing that network resolves as long curving grooves,
        // and five tiers of it at slightly different scales is what made every
        // 40 cm framing look like burr walnut. Setting normalScale to zero
        // removed the artefact completely and left the albedo clean, which is
        // what finally placed it. Keyed off distance alone, not gritFade, which
        // now also carries the grazing-angle taper and would have brought the
        // tile back to full strength in exactly the framings that showed it.
        // 0.1, not 0.45. Isolated at last by rendering the rut framing with every
        // other tier's uniform zeroed: the base tile *alone* draws the combed-fur
        // streaks, and it draws them at 0.45 just as clearly as at 1.0. It is a
        // 2.6 m height field at 5 mm a texel and the near field looks along it at
        // three to eight degrees, where no anisotropy ratio the hardware offers
        // can resolve a 5 mm gradient — so every texel of it is smeared into a
        // filament pointing down the view ray, and three hundred parallel
        // filaments is brushed hair. The relief tier is a finer height field
        // (2.5 mm a texel) with a parallax offset and a sun march that agree with
        // it, and it does not streak; it can have the near field to itself.
        // Back to 0.32 from 0.1. The filament smearing this was cut to nothing for
        // is real, but at 0.1 the near field had exactly one tier of shape in it
        // and the relief tier had to be overdriven to cover for that — which is
        // what produced a single dominant frequency across the whole running
        // surface. A third of the tile is below the streaking threshold and puts a
        // second, coarser gradient under the relief.
        // The mainline is under exactly the same discipline as the trail here,
        // and the argument for exempting it was wrong in a way worth recording
        // because it cost three rounds.
        //
        // It went: the taper exists because the trail's near-field shape is a
        // warped worley crack network, which is directional, so it resolves as
        // filaments down the view ray at an oblique footprint; packed aggregate
        // is isotropic blobs, which smear into a slightly blurrier blob field
        // instead. So the gravel kept 0.72 of its tile against the trail's 0.32
        // and got half its footprint taper waived.
        //
        // What that actually rendered was combed fur — the identical artefact,
        // slightly finer. The mistake is that the smear has nothing to do with
        // whether the *features* are directional. It is the sampler: a footprint
        // twenty times longer than it is wide averages twenty texels along the
        // view ray and one across, so whatever is in the tile comes back as a
        // streak pointing down that ray, and neighbouring streaks line up
        // because they are all pointing at the same vanishing point. Isotropy
        // buys nothing. And the gravel tile is *finer* than the trail's — 3.7 mm
        // a texel against 5 mm — so it was always going to smear harder, not
        // less. Three rounds went on the aggregate underneath, which was fine
        // and could never have shown through this.
        //
        // 0.42 against the trail's 0.32, which is the one part of the original
        // argument that survives: the pieces are genuinely bolder than the
        // trail's grain and the tile can hold a little more before it streaks.
        mapN.xy *= mix( mix( 1.0, 0.32, nearFade ), mix( 1.0, 0.42, nearFade ), share ) * fpFade;
        // Washboard, as slope rather than as tint. The ridges run across the
        // road, so what they tilt is the along-road axis — vTan is the mainline's
        // own tangent wherever share is high, which is exactly what this needs
        // and is why the tangent is blended by share rather than switched.
        mapN.xy += tanN * gWash * 0.11 * share;
        // Fines gone, coarse fraction standing proud: more relief, not less.
        mapN.xy *= 1.0 + gScour * share * 0.5;
        // Tapered close in. At 1.15 the lug walls tilt far enough to face away
        // from the key entirely, and a micro-facet with no light on it is black —
        // which is what turned the print into a row of hard crescents in the
        // bottom of the low framings. Full strength is still what makes it read
        // at three to eight metres, so only the near end is pulled back.
        mapN.xy += ( tread.xy * 2.0 - 1.0 ) * mPrint * 0.62 * mix( 1.0, 0.62, nearFade ) * uNearAmt.w * fpFade;
        mapN.xy += ( nDetail4.xy * 2.0 - 1.0 ) * 0.85 * detailFade * loose * oldTier * uNearAmt.z * fpFade;
        // The 11 cm and 1.3 m tiers are at the right scale for a camera this
        // close, and neither carries the surface tile's worley stone caps, so
        // they can take over the relief the line above gave up.
        mapN.xy += ( nGrit.xy * 2.0 - 1.0 ) * 1.05 * gritFade * loose * oldTier * uNearAmt.y * fpFade;
        // No normal term off the macro tile. Its r and g are two *unrelated*
        // fbm fields with different periods and seeds, so using them as a
        // gradient pair is not a normal map of anything — it is two smooth
        // fields fighting, and at a 1.28 m tile and 0.68 strength what it drew
        // was nested contour bands. Every low framing came back looking like
        // varnished burr walnut and it survived turning the relief, the wetness
        // and the streak terms off, which is how it was finally cornered. The
        // relief tile is a real height field at the same scale and does this
        // job properly.
        // The relief tier, which is the one that agrees with the parallax offset
        // and the sun march. It has to be the dominant normal inside a few
        // metres or the shading and the displacement disagree and the surface
        // reads as a decal sliding over a plane.
        // 1.45, not 2.2. 2.2 was set to compensate for handing the base tile's
        // normal away at close range, but it put the 10 cm tier's slopes above the
        // 1.25 total-slope limit on its own — so the limiter was normalising the
        // whole sum down to the relief's direction and every other tier became a
        // rounding error. That is a surface with one frequency of shape on it,
        // which is the corrugation read from the other side.
        // Raising this tier and lowering the footprint taper to compensate was tried
        // and measured worse: at 0.7 against a 0.6 taper, with the grit tiers up to
        // take the slack, the comb came back at the bottom of the frame. Three
        // decorrelated tiers do cross each other rather than lining up, but not
        // enough to pay for the taper being eased — the taper is what actually
        // removes the artefact, and the tiers only spread what is left of it.
        mapN.xy += ( relN.xy * 2.0 - 1.0 ) * 0.9 * relAmt * fpFade;
        // Drag grain, perpendicular to the direction of travel. vTan is the road
        // tangent in world XZ and the tile UVs are world XZ, so its perpendicular
        // is the lateral axis straight off.
        vec2 latRaw = vec2( vTan.y, -vTan.x );
        vec2 lat = latRaw / max( length( latRaw ), 1e-3 );
        // The mainline's wheel paths as shape. The mesh carries them at 3 cm
        // on 0.6 m cells, which is a swell the shading cannot find; every
        // critic read the ruts as painted stripes. This is the gradient of the
        // same gaussian the mesh was graded to, at a 24 cm effective depth —
        // exaggerated the way a normal map for a footprint always is — so the
        // wall toward the sun catches the key and the wall away from it goes
        // into shade, at every range the road is looked at from. vMain.y is
        // signed lateral offset and lat is that axis in world xz (see the drag
        // grain below), so the outward direction is lat against its sign. Off
        // through the junction apron, where the surface is churned flat.
        // Two widths: the broad swell the grader left (sigma 0.52 m, the
        // mesh's own) and a tight tyre-width channel down its middle (sigma
        // 0.24 m) — the second is what gives the path an *edge*; without it
        // the first pass this round was still a soft band under a low sun.
        float rutD = mAx - uMain.z;
        float rutG = exp( -rutD * rutD / ( 2.0 * uMain.w * uMain.w ) );
        float rutG2 = exp( -rutD * rutD / 0.1152 );
        vec2 rutOut = -lat * sign( vMain.y );
        mapN.xy -= rutOut * ( rutD / ( uMain.w * uMain.w ) * rutG * 0.24 + rutD / 0.0576 * rutG2 * 0.14 ) * share * mRun * ( 1.0 - apM );
        // 0.34, not 0.55. This tier is deliberately anisotropic — it tilts the
        // surface laterally so the grain has a direction — which means it is the one
        // normal term that survives the footprint taper looking like a comb, because
        // its structure and the smear direction agree. With the relief tier brought
        // back inside its slope budget it is now the loudest thing left in the
        // near-field streaking.
        mapN.xy += lat * ( drag.a - 0.5 ) * 0.22 * dragAmt * uNearAmt.x * fpFade;
        // the tyre sinks in: tilt the surface into the contact patch
        // 2.4 tilted the rim of the patch far enough to face away from the key
        // entirely, and with the truck hidden the diagnostic framings showed
        // black craters in the trail where the wheels are. A tyre presses a dish,
        // not a shell hole.
        mapN.xy -= contactDir * contact * 0.9;
        // Seven tiers add into mapN.xy as slopes, and inside two metres all
        // seven are at full weight: the tile, the print, the 45 cm grit, the
        // 11 cm grit, the relief, the drag grain and the contact patch sum past
        // four. atan( 4 ) is 76 degrees off the surface, which takes N dot L
        // negative across broad regions, and the shading terminator then draws
        // hard curving grooves through the near field — the "burr walnut" every
        // knee-height framing came back with. It survived removing each tier one
        // at a time, because removing one of seven still leaves the sum over the
        // limit, and it vanished completely at normalScale zero. Limiting the
        // total slope keeps every tier and removes the artefact; atan( 1.25 ) is
        // 51 degrees, which is steeper than any real dirt micro-facet.
        // 0.9, not 1.25. The limiter was written to stop the sum going non-physical,
        // but a limiter that most of the surface is *sitting on* is not a safety
        // net, it is the shading model: direction is preserved and magnitude is
        // discarded, so every texel that clips renders at the same tilt and the
        // near field loses its slope range. atan( 0.9 ) is 42 degrees, still
        // steeper than any dirt micro-facet at this scale, and with the relief tier
        // brought back inside its budget above the sum now clips rarely rather than
        // continuously.
        float slopeLen = length( mapN.xy );
        mapN.xy *= min( slopeLen, 0.9 ) / max( slopeLen, 1e-4 );
        mapN.xy *= normalScale;
        // A water surface is flat, whatever the dirt under it is doing — but
        // dead flat reflects the sky as one uniform plate, and a uniform plate
        // is a bald patch, not a puddle. A trace of ripple gives the sheen a
        // direction and an edge to catch on. It has to be a *slow* ripple: at a
        // 27 cm tile this was a few pixels across at two metres, and a few-pixel
        // normal under a 0.1 roughness is not a sheen, it is a field of hard
        // white glints — the snow speckle this whole surface started out with.
        vec4 rip = texture( uTile256, vec3( vTile * 0.9 + vec2( 0.13, 0.61 ), uMacro_L ) );
        mapN = mix( mapN, vec3( ( rip.rg - 0.5 ) * 0.15, 1.0 ), smoothstep( 0.15, 0.6, water ) * 0.55 );
        normal = normalize( tbn * mapN );`,
      )
      .replace(
        '#include <aomap_fragment>',
        `float ambientOcclusion = clamp( surfAo * printAo, 0.0, 1.0 ) * mix( 1.0, 0.55, shade );
        // a rut is a trough: it sees less of the sky than the crown beside it,
        // and the lip squeezed up either side shades it further
        ambientOcclusion *= mix( 1.0, 0.72, mRut );
        ambientOcclusion *= mix( 1.0, 0.85, soak );
        // a print is a hollow, and the sand between the pebbles on the river
        // floor sees less sky than the pebbles do
        ambientOcclusion *= mix( 1.0, 0.72 + trk.w * 0.3, trkMask * 0.8 );
        ambientOcclusion *= mix( 1.0, clamp( nSand.w, 0.5, 1.1 ), zSand * 0.6 );
        // A drainage ditch is a half-metre trench with a bank on one side and a
        // road embankment on the other, so it sees a fraction of the sky the
        // running surface does. This is what draws the road's edge from a
        // distance: a dark line either side of a light platform.
        ambientOcclusion *= mix( 1.0, 0.6, mDitch * share );
        // Crevice occlusion from the close-range tiers, collapsed into one
        // deficit for the same reason the albedo stack above is. This is what
        // keeps the bottom of a low framing from going to a smooth wash — most of
        // this corridor is under a canopy with no key on it, and under flat
        // ambient light occlusion is the only thing that can describe a shape —
        // but as four independent multiplies it came to 0.62 * 0.9 * 0.34 * 0.86
        // in the hollows, which took the sky term to a sixth at exactly the texels
        // where the albedo was already down to a thirtieth.
        float cavOcc = 0.0;
        cavOcc += ( 0.4 - relH.g * 0.62 ) * relAmt;
        cavOcc += ( 0.32 - nGrit.w * 0.5 ) * gritFade * oldTier;
        cavOcc += ( 0.08 - clod.b * 0.16 ) * detailFade * 0.7;
        cavOcc += ( 0.72 - relN.w * 0.9 ) * relAmt * 0.5;
        // Floors lifted with the global scale. Occlusion is a ratio, so halving the
        // level does not change what these terms do — but it does halve the
        // absolute value they bottom out at, and the deepest hollows were already
        // as dark as anything in the frame.
        ambientOcclusion *= clamp( 1.0 - cavOcc, 0.6, 1.1 );
        // A puddle still sits in a hollow that sees less sky than the crown, so
        // it does not get to shed all of its occlusion.
        ambientOcclusion = mix( ambientOcclusion, 1.0, water * 0.5 );
        // light that bounces between the facets of a rough surface comes back
        // carrying its albedo twice, so ambient-lit dirt is warmer and more
        // saturated than a single-bounce diffuse term makes it. Without this
        // the shaded ground is lit by sky alone and reads as cool grey.
        reflectedLight.indirectDiffuse *= ambientOcclusion * vec3( 1.09, 1.0, 0.9 );
        // Ground bounce. The canopy shades most of the road, so the only light
        // reaching the dirt there has come off the dirt itself and there is no
        // term in the standard model for it. It used to be 0.42, which on its
        // own is most of a second light source — that is a large part of why no
        // amount of darkening the albedo made the trail stop reading as sand.
        // Up to 0.5 with the level cut, which against a 0.68 albedo scale is still
        // less bounce in absolute terms than the 0.42 this used to be. This is a
        // term that only exists in shade —
        // in sun it is a rounding error next to the key — so raising it holds the
        // shaded trail off black while the sunlit trail stays where the level scale
        // put it. That is the whole reason the re-baseline does not flatten: the
        // level came off the albedo, which scales everything equally, and the dark
        // end was then given back through the one term that only reaches the dark
        // end.
        // Two thirds of it on the mainline. This term stands in for light that
        // has come off the dirt and back down from the canopy, and the forest
        // clears twenty-odd metres for a road this wide — so over the mainline
        // there is no canopy to bounce off, only open sky, which the standard
        // model already accounts for through the environment. Left at full
        // strength it was adding half an albedo of fill to the one surface in
        // the world that is in direct sun, and the road came back as a pale
        // wash with its aggregate lit from every side at once.
        // Round 4. This term is a radiance that does not read the scene: in the
        // trail's shade in \`truck_day/forest\` it is 74–85 per cent of the
        // ground's indirect (the occlusion product there is 0.16–0.25, so the
        // sky and environment reach the dirt at a fifth of what they give a
        // stock Standard material — the "third" the lighting builder
        // measured), and on the open mainline 24–34 per cent. The *level* is
        // right at noon (ground over stock 1.02–1.16 in shade), which is why
        // the term was tuned this way; the *response* is not — turn the
        // hemisphere up a stop and a prop goes up a stop while this dirt goes
        // up a quarter. With uBounceFollow at 1 the bounce follows the light
        // it stands in for: scaled by the hour's hemisphere-plus-environment
        // irradiance over the noon value it was tuned at (uBounceRef: 1.0 on
        // level ground, 0.88–0.92 in the trail's ruts, read off debug 14), so
        // noon is unchanged to within the normal's tilt and dusk and night
        // take the hour's fall by themselves. It ships at 0 because sky.js already dims the whole
        // indirect by hour (groundIndirect 0.8 dusk, 0.1 night) to hold this
        // very term down, and those two dials would take the fall twice; the
        // hand-off is to flip this on and set both to 1.0 in the same commit.
        float bounceE = mix( 1.0, clamp( dot( irradiance + iblIrradiance, vec3( 0.2126, 0.7152, 0.0722 ) ) / uBounceRef, 0.0, 2.0 ), uBounceFollow );
        reflectedLight.indirectDiffuse += albedo * mix( 0.5, 0.17, share ) * ambientOcclusion * ( 1.0 - water ) * bounceE;
        // Relief self-shadowing. The shadow map is 4 cm a texel over this
        // corridor, so nothing the size of a pebble can ever cast into it — the
        // sun march is the only way a 4 cm stone gets a shadow, and a hard little
        // shadow with a crisp edge is precisely what says "loose aggregate" and
        // not "a picture of loose aggregate". It lands on the direct terms only:
        // a hollow that the sun cannot see still sees most of the sky.
        // 0.1 is a hole, not a shadow. A tenth of the key removed by a 4 cm clod
        // puts the 10 cm tier's contrast above the rut form's, so the aggregate
        // stopped sitting *under* the shape of the road and started competing with
        // it — the ribs in the integrated foreground were reading as deep as the
        // ruts themselves. A pebble's shadow on damp earth under a canopy is about
        // a stop and a half of the direct term and no more.
        reflectedLight.directDiffuse *= mix( 1.0, 0.42, rShadow );
        reflectedLight.directSpecular *= mix( 1.0, 0.4, rShadow );
        reflectedLight.indirectDiffuse *= mix( 1.0, 0.86, rShadow );
        // 8: the indirect term a stock Standard material would return at this
        // texel (three's own hemisphere + environment irradiance on the same
        // diffuse colour, no occlusion stack, no bounce), for A/B against the
        // ground's own. 9: the occlusion product alone, unlit. 10: the
        // ground's own indirect alone (direct and specular zeroed). 11: the
        // stock indirect alone. 10 over 11, in linear, is the ratio the
        // lighting builder measured as "a third".
        if ( uDebug > 7.5 && uDebug < 8.5 ) {
          reflectedLight.indirectDiffuse = ( irradiance + iblIrradiance ) * BRDF_Lambert( diffuseColor.rgb );
        }
        if ( uDebug > 9.5 && uDebug < 11.5 ) {
          if ( uDebug > 10.5 ) reflectedLight.indirectDiffuse = ( irradiance + iblIrradiance ) * BRDF_Lambert( diffuseColor.rgb );
          reflectedLight.directDiffuse = vec3( 0.0 );
          reflectedLight.directSpecular = vec3( 0.0 );
          reflectedLight.indirectSpecular = vec3( 0.0 );
        }
        // 14: the hemisphere-plus-environment irradiance itself, for uBounceRef.
        if ( uDebug > 13.5 && uDebug < 14.5 ) {
          reflectedLight.directDiffuse = irradiance + iblIrradiance;
          reflectedLight.indirectDiffuse = vec3( 0.0 );
          reflectedLight.directSpecular = vec3( 0.0 );
          reflectedLight.indirectSpecular = vec3( 0.0 );
        }
        if ( uDebug > 8.5 && uDebug < 9.5 ) {
          reflectedLight.directDiffuse = vec3( ambientOcclusion );
          reflectedLight.indirectDiffuse = vec3( 0.0 );
          reflectedLight.directSpecular = vec3( 0.0 );
          reflectedLight.indirectSpecular = vec3( 0.0 );
        }
        if ( ( uDebug > 1.5 && uDebug < 2.5 ) || ( uDebug > 4.5 && uDebug < 7.5 ) || ( uDebug > 11.5 && uDebug < 13.5 ) || ( uDebug > 14.5 && uDebug < 16.5 ) ) {
          reflectedLight.directDiffuse = albedo;
          reflectedLight.indirectDiffuse = vec3( 0.0 );
          reflectedLight.directSpecular = vec3( 0.0 );
          reflectedLight.indirectSpecular = vec3( 0.0 );
        }
        #if defined( USE_ENVMAP ) && defined( STANDARD )
          float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
          // At the grazing angles every close framing looks along, Fresnel goes
          // to one and an unattenuated sky reflection buries the albedo under a
          // flat pale sheet. Dirt has a sheen at glancing incidence but not that
          // much of one — water, on the other hand, is nearly all reflection,
          // and letting it through here is what makes a puddle read as a puddle.
          // Gated on water squared, so the damp halo around a puddle gets none
          // of the boost: the halo still carries aggregate normals, and a
          // specular lift on those reads as glitter rather than as wet ground.
          reflectedLight.indirectSpecular *=
            computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness ) * mix( 0.24, 0.5, water * water );
        #endif`,
      );
  };
  material.customProgramCacheKey = () => 'terrain-relief-v1';

  const mesh = new THREE.Mesh(geo, material);
  mesh.name = 'terrain';
  mesh.receiveShadow = true;
  mesh.castShadow = false;
  if (env) material.envMap = env;

  // Hung off the terrain mesh rather than a wrapper group so everything that
  // already reaches for terrain.mesh.geometry or toggles its visibility keeps
  // working, and one scene.add still brings the whole ground in.
  const scatter = buildScatter(curve, mainCurve, surfaceInfo, env, sunV);
  mesh.add(scatter.stones);
  mesh.add(scatter.shadows);
  const water = buildWater(curve, surfaceInfo, surfaceHeight, sunV);
  mesh.add(water);
  const farHills = buildFarHills(env);
  mesh.add(farHills);

  contactSink = uniforms.uContacts.value;

  // --- the features, resolved for everyone else -----------------------------
  const holeFloor = surfaceHeight(LAND.hole.x, LAND.hole.z);
  const lookP = new THREE.Vector3(cx[jLook], cy[jLook], cz[jLook]);
  const lookLat = { x: -ctz[jLook] * LAND.look.side, z: ctx[jLook] * LAND.look.side };
  const boardOff = MAIN_HALF + 3.4 + MAIN_SHOULDER + 0.7;
  const board = { x: lookP.x + lookLat.x * boardOff, z: lookP.z + lookLat.z * boardOff };
  board.y = surfaceHeight(board.x, board.z);
  const riverP = { x: cx[jRiver], y: cy[jRiver], z: cz[jRiver] };
  const riverLat = { x: -ctz[jRiver], z: ctx[jRiver] };
  // Headwalls: on the fill slope either side of the road, at the channel
  // centreline, facing out along the river.
  // The river meets the road off square, so the wall is slid along the road
  // until it sits on the channel's own centreline.
  const headwalls = [1, -1].map((sgn) => {
    const off = MAIN_EDGE + 1.1;
    const ox = riverP.x + riverLat.x * off * sgn;
    const oz = riverP.z + riverLat.z * off * sgn;
    let best = 0;
    let bestD = Infinity;
    for (let u = -6; u <= 6; u += 0.25) {
      const d = riverDistance(ox + ctx[jRiver] * u, oz + ctz[jRiver] * u, _riv).d;
      if (d < bestD) {
        bestD = d;
        best = u;
      }
    }
    const hx = ox + ctx[jRiver] * best;
    const hz = oz + ctz[jRiver] * best;
    return { x: hx, y: surfaceHeight(hx, hz), z: hz, nx: riverLat.x * sgn, nz: riverLat.z * sgn, side: -sgn };
  });
  const campAccess = {
    x: cx[jAccess],
    y: cy[jAccess],
    z: cz[jAccess],
    t: (jAccess - SAMPLES) / (MSAMPLES - 1),
    tx: ctx[jAccess],
    tz: ctz[jAccess],
    side: WORLD.camp.side,
    // the mouth of the apron: where a gate would stand
    mouth: {
      x: LAND.camp.x - LAND.camp.ax * (PAD_R_ROAD + 4),
      z: LAND.camp.z - LAND.camp.az * (PAD_R_ROAD + 4),
    },
  };
  campAccess.mouth.y = surfaceHeight(campAccess.mouth.x, campAccess.mouth.z);

  return {
    mesh,
    stones: scatter.stones,
    shadows: scatter.shadows,
    water,
    farHills,
    material,
    curve,
    mainCurve,
    heightAt: surfaceHeight,
    /**
     * Distance to the nearest road, in the trail's units.
     *
     * The forest keys every planting rule off this — trees at 7.4 m,
     * undergrowth at 1.3, deadwood at 3.5 — and all of those numbers mean
     * "metres from a centreline whose surface ends at 1.25". The mainline's
     * surface ends at 6.6, so what comes back for it is the distance to its
     * *edge* shifted into the same frame. Reporting the raw distance would put
     * a stand of firs down the middle of it.
     *
     * The graded pad, the river channel and the water hole are folded in on
     * the same footing — as the distance past their edge, shifted so a tree
     * needs to be about a metre clear of the edge and undergrowth stays off
     * the pad, the sand and the mud. Trees are welcome on the river banks.
     */
    roadDistance: (x, z) => {
      const nr = nearestRoad(x, z);
      let d = Math.min(nr.t.dist, Math.max(0, nr.m.dist - MAIN_DIST_BIAS));
      const st = siteAt(x, z, 0);
      if (st.g > 0 || st.edge < 6) d = Math.min(d, Math.max(0, st.edge + 6.2));
      const rv = riverDistance(x, z, _riv);
      if (rv.d < 20 && rv.along > 10 && rv.along < rv.total - 10) {
        d = Math.min(d, Math.max(0, rv.d - (RIVER_HALF + RIVER_BANK) + 6.4));
      }
      const hd = Math.hypot(x - LAND.hole.x, z - LAND.hole.z);
      if (hd < HOLE_BASIN + 30) d = Math.min(d, Math.max(0, hd - HOLE_BASIN - 4 + 6.2));
      return d;
    },
    /**
     * The graded campground pad: centre, level at the centre, and the radius
     * inside which the ground is the graded plane. The pad is an ellipse —
     * `radii` gives it toward the road, away from it and sideways, and `axis`
     * is the unit vector from the road to the centre — but `radius` is a
     * safe disc for anyone who only wants one number.
     */
    campPad: {
      x: LAND.camp.x,
      z: LAND.camp.z,
      y: surfaceHeight(LAND.camp.x, LAND.camp.z),
      radius: PAD_R_ROAD,
      radii: { road: PAD_R_ROAD, far: PAD_R_FAR, side: PAD_R_SIDE },
      axis: { x: LAND.camp.ax, z: LAND.camp.az },
      slope: PAD_SLOPE,
      access: campAccess,
    },
    /** The scenic overlook: mainline t at the crest, the turnout side, and where the board stands. */
    overlook: {
      t: (jLook - SAMPLES) / (MSAMPLES - 1),
      x: lookP.x,
      y: lookP.y,
      z: lookP.z,
      tx: ctx[jLook],
      tz: ctz[jLook],
      side: LAND.look.side,
      widen: 3.4,
      board,
    },
    /** The water hole: centre, the water level, the radius of the sheet and of the mud round it. */
    waterHole: {
      x: LAND.hole.x,
      z: LAND.hole.z,
      y: holeFloor + HOLE_DEPTH * 0.5,
      floor: holeFloor,
      radius: water.userData.holeRadius,
      mudRadius: HOLE_BASIN + 6,
      basinRadius: HOLE_BASIN + 12,
    },
    /** The dry river: its polyline, its section, where it crosses the mainline and where the headwalls go. */
    riverbed: {
      points: LAND.river.map((p) => ({ x: p.x, z: p.z })),
      halfWidth: RIVER_HALF,
      bankWidth: RIVER_BANK,
      depth: RIVER_DEPTH,
      crossing: { ...riverP, t: (jRiver - SAMPLES) / (MSAMPLES - 1), tx: ctx[jRiver], tz: ctz[jRiver] },
      headwalls,
      /** Distance to the channel centreline, and how far along it. */
      distance: (x, z) => {
        const rv = riverDistance(x, z, _riv);
        return { d: rv.d, along: rv.along, total: rv.total };
      },
    },
    roadHalf: ROAD_HALF,
    shoulder: SHOULDER,
    mainHalf: MAIN_HALF,
    /** Outer edge of the graded platform: the far bank of the ditch. Signs stand past it. */
    mainEdge: MAIN_EDGE,
    mainShoulder: MAIN_SHOULDER,
    size: SIZE,
    /** Centreline arc length in metres, so anything following it can move at a real speed. */
    roadLength: cs[SAMPLES - 1],
    mainLength: cs[TOTAL - 1],
    /**
     * Where the two roads meet, in every frame anything might want it in:
     * world position, and the curve parameter on each road.
     */
    junction: {
      x: JX,
      y: cy[jMain],
      z: JZ,
      trailT: jTrail / (SAMPLES - 1),
      mainT: (jMain - SAMPLES) / (MSAMPLES - 1),
    },
    stats: {
      vertCount,
      triCount,
      fineCells,
      mainCells,
      stoneTris: scatter.stones.geometry.attributes.position.count / 3,
      shadowTris: scatter.shadows.geometry.index.count / 3,
      waterTris: water.geometry.index.count / 3,
      farTris: farHills.geometry.index.count / 3,
      puddles: water.userData.count,
    },
    /** Position + tangent on the graded centreline at curve parameter t. */
    roadPoint(t) {
      const p = curve.getPoint(THREE.MathUtils.clamp(t, 0, 1));
      const i = Math.min(SAMPLES - 1, Math.max(0, Math.round(t * (SAMPLES - 1))));
      p.y = cy[i];
      return p;
    },
    roadTangent(t) {
      return curve.getTangent(THREE.MathUtils.clamp(t, 0, 1)).normalize();
    },
    /**
     * The same pair for the mainline. Deliberately separate methods rather than
     * a road argument on the existing ones: auto-drive, the canopy clearing and
     * the forest's deadwood alignment all call roadPoint, and every one of them
     * means the trail.
     */
    mainPoint(t) {
      const p = mainCurve.getPoint(THREE.MathUtils.clamp(t, 0, 1));
      const i = SAMPLES + Math.min(MSAMPLES - 1, Math.max(0, Math.round(t * (MSAMPLES - 1))));
      p.y = cy[i];
      return p;
    },
    mainTangent(t) {
      return mainCurve.getTangent(THREE.MathUtils.clamp(t, 0, 1)).normalize();
    },
  };
}

// ---------------------------------------------------------------------------
// Loose material scattered over the corridor, and the shadows it casts.
//
// A texture cannot put a silhouette on the ground and it cannot cast a shadow
// onto its neighbour, and the close framings sit 30 cm off the dirt where both
// of those are exactly what is missing. Four tiers:
//
//   embedded stone   pressed flush by the grader, only a cap showing
//   loose gravel     sitting proud, collected in patches, the noisy tier
//   twigs and bark   thin dark slivers lying on the surface
//   surface roots    crossing the trail, alternately buried and exposed
//
// All four merge into one static buffer — at eight to twenty triangles apiece
// the draw call is the only cost worth caring about, and merging lets every
// piece be a different lump with its own baked colour rather than one shape
// repeated at different scales.
//
// The shadows are a second merged buffer of multiply-blended quads. The sun's
// shadow map is 2 to 4 cm a texel across this corridor, so nothing the size of a
// pebble can ever cast into it; without these the gravel sits in the dirt with
// no contact at all and reads as sprinkles. Each quad is stretched along the
// sun's ground projection by the height of the thing casting it, so the shadow
// direction agrees with every other shadow in the frame.
// ---------------------------------------------------------------------------

// Round 1: every critic read this tier as "grey confetti" — dozens of small
// uniform shards. Fewer and larger: the small tier's floor is up at 4 cm so
// nothing under 8 cm across is drawn on the trail, and a third of the tier is
// now the big prototype rather than a fifth.
const STONE_COUNT = 520;
const GRAVEL_COUNT = 4000;
// The mainline is a surface made of loose stone, so the tier that is decoration
// on the trail is the substance here — and it has seven metres of width and
// three hundred metres of length to cover against the trail's two and a half.
// It is still the cheapest legibility per triangle in the world: an eight-face
// chip is 8 triangles and it is the only thing that puts real relief and a real
// cast shadow on a surface the shadow map cannot resolve.
const MAIN_CHIP_COUNT = 5200;
const MAIN_ROCK_COUNT = 900;
// Half what the forest had: there is no canopy dropping bark on a savanna track,
// and what there is is bleached grey. No roots at all — nothing here has them
// across a road.
const TWIG_COUNT = 240;
const ROOT_COUNT = 0;
// Cobbles in the dry river, stones round the water hole and along the pad's
// batter: the loose material the features shed.
const RIVER_COBBLES = 640;
const HOLE_STONES = 140;
const PAD_STONES = 260;
const ROOT_SEGS = 11;

// The same level scale the terrain shader applies to its own albedo. These are
// objects half-buried in that surface, so they have to move with it: at the old
// level against a halved trail every stone and twig would have read as a pale
// fleck scattered over dark ground, which is the "sprinkles" failure the shadow
// decals exist to prevent, arrived at from the other direction.
const SCATTER_LEVEL = 0.5;

// The soil every stone is half-buried in, in the scatter's own pre-level scale
// (SCATTER_LEVEL halves it on the way into the buffer). PALETTE.earth is
// 0x9a5a34 — 0.32/0.10/0.034 linear — and the terrain renders it at roughly two
// thirds of that after its level cut and occlusion stack, so this is the dirt
// as it actually lands on screen, a touch greyer because it is the dust
// fraction. A stone lying in laterite is coated in laterite fines: it inherits
// a good third of the soil's colour before its own mineral shows, and that is
// what seats it *in* the dirt rather than on it.
//
// Round 1 had every stone keyed under the dirt as a cool neutral or a dark
// basalt. At that albedo the only light a stone returned was the environment
// map's specular — a blue-grey that never moved with the hour, so the tier sat
// grey on wine-red dirt at dusk and grey on dark dirt at night, and all three
// critics called it confetti. Inheriting the soil is the one change that fixes
// the hour as well as the day: a stone that is mostly diffuse grades with the
// key like the ground does.
const SOIL = [0.29, 0.115, 0.05];
const SOIL_MIX = 0.36;
/** Mix a mineral colour toward the soil it lies in, with a per-instance dark tint. */
function soilTint(c, rnd, mixK = SOIL_MIX) {
  // One stone in three is noticeably darker than its neighbours — shade,
  // damp, a different face of the same rock. A tier at one value is a stipple.
  const t = 0.64 + rnd() * 0.36;
  return [
    (c[0] * (1 - mixK) + SOIL[0] * mixK) * t,
    (c[1] * (1 - mixK) + SOIL[1] * mixK) * t,
    (c[2] * (1 - mixK) + SOIL[2] * mixK) * t,
  ];
}

/**
 * Colour of one piece of quarried aggregate, keyed to the mainline's tile.
 *
 * Not `aggColour`, which is the trail's: that is a brown family, because the
 * stones on a two-track are whatever the ground was cut through, coated in the
 * same fines as the matrix around them. This is imported crushed rock — one
 * quarry face, mostly dark basalt with a pale weathered minority — and it has
 * to be *cool*, because the same warm key that takes the tile's 0.95 red/blue
 * ratio to 1.3 on screen does the same to every one of these.
 *
 * Keyed under the surface it lies on rather than over it, for the reason the
 * trail's tier is: a scatter of pale chips on a mid-grey road reads as gravel
 * spilled on the road, not as the road.
 */
function mineralColour(rnd) {
  // A quarter of them are the pale weathered fraction. They are what puts an
  // edge on the tier — three hundred metres of uniformly dark chips against a
  // mid-grey surface has no silhouette anywhere on it.
  // Every piece is dusted with the road's own red fines — less than a trail
  // stone buried in dirt, but a crushed-rock chip on a murram road is not
  // clean basalt either. This is what stops the tier reading blue-grey against
  // the road at dusk.
  if (rnd() < 0.24) {
    const v = 0.05 + rnd() * 0.055;
    return soilTint([v * 0.94, v * 0.98, v], rnd, 0.26);
  }
  if (rnd() < 0.12) {
    // iron-stained, the only warm piece in the pit
    const v = 0.036 + rnd() ** 1.4 * 0.03;
    return soilTint([v * 1.16, v * 0.94, v * 0.7], rnd, 0.26);
  }
  const v = 0.03 + rnd() ** 1.6 * 0.036;
  return soilTint([v * 0.9, v * 0.97, v], rnd, 0.26);
}

const nearSlot = () => ({ dist: 1e6, lat: 1e6, y: 0, t: 0, s: 0, k: 0, tx: 0, tz: 1 });

const makeScatterInfo = () => ({
  near: { t: nearSlot(), m: nearSlot() },
  y: 0,
  side: 0,
  edge: 0,
  along: 0,
  dist: 0,
  wet: 0,
  grade: 0,
  tanX: 0,
  tanZ: 1,
  outside: 0,
  share: 0,
  mSide: 0,
  mAlong: 0,
  pad: 0,
  chan: 0,
  mud: 0,
  churn: 0,
  dish: 0,
});

/**
 * Keep a flat, depth-write-disabled overlay out of the screen-space AO prepass.
 *
 * GTAOPass builds its depth and normal buffer with `scene.overrideMaterial` set
 * to a plain MeshNormalMaterial, which ignores `transparent`, `depthWrite` and
 * every uniform the real material has. A shadow decal or a puddle sheet is then
 * a *solid opaque quad* floating two centimetres over the dirt with a zero
 * normal, and GTAO obliges by drawing a hard black rectangle there. That is
 * what put a field of pure black tiles across the trail — immune to the decal's
 * colour, immune to its blend mode, and gone the instant the mesh was hidden,
 * which is a combination nothing in the material itself can produce. Same trap
 * `forest.js` hit with its leaf cards.
 */
function skipAoPrepass(mesh, also) {
  mesh.onBeforeRender = (renderer, scene, camera, geometry, material) => {
    if (material.isMeshNormalMaterial) geometry.setDrawRange(0, 0);
    else if (also) also();
  };
  mesh.onAfterRender = (renderer, scene, camera, geometry, material) => {
    if (material.isMeshNormalMaterial) geometry.setDrawRange(0, Infinity);
  };
  return mesh;
}

/**
 * Weld a prototype's duplicated vertices, then hand back `count` variants with
 * every unique vertex pushed in or out.
 *
 * Welding is the point. Jittering the raw non-indexed positions moves the same
 * corner by a different amount in each triangle that shares it, which opens the
 * lump into a loose bag of triangles — invisible on a 4 cm pebble but a hole you
 * can see through on anything larger.
 */
function lumpVariants(geo, count, amount, rnd) {
  const src = geo.index ? geo.toNonIndexed() : geo;
  const p = src.attributes.position;
  const key = new Map();
  const uniq = [];
  const idx = new Int32Array(p.count);
  for (let i = 0; i < p.count; i++) {
    const k = `${p.getX(i).toFixed(4)}|${p.getY(i).toFixed(4)}|${p.getZ(i).toFixed(4)}`;
    let j = key.get(k);
    if (j === undefined) {
      j = uniq.length / 3;
      key.set(k, j);
      uniq.push(p.getX(i), p.getY(i), p.getZ(i));
    }
    idx[i] = j;
  }
  const out = [];
  for (let v = 0; v < count; v++) {
    const jp = new Float32Array(uniq.length);
    for (let i = 0; i < uniq.length; i += 3) {
      const k = 1 - amount + rnd() * amount * 2;
      jp[i] = uniq[i] * k;
      jp[i + 1] = uniq[i + 1] * k;
      jp[i + 2] = uniq[i + 2] * k;
    }
    const tri = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) {
      const a = idx[i] * 3;
      tri[i * 3] = jp[a];
      tri[i * 3 + 1] = jp[a + 1];
      tri[i * 3 + 2] = jp[a + 2];
    }
    out.push(tri);
  }
  return out;
}

function buildScatter(curve, mainCurve, surfaceInfo, env, sunV) {
  const rnd = mulberry32(0x51a7);
  const info = makeScatterInfo();

  const lumps = lumpVariants(new THREE.IcosahedronGeometry(1, 0), 14, 0.26, rnd);
  // The big tier is 15-35 cm across and only its cap shows, and the cap of a
  // twenty-face lump is three or four large triangles. Flat-shaded, that renders
  // as a smooth pale wedge — the "tent pitched on the trail" in the close crops.
  // Eighty faces puts a dozen across the cap, which is what a weathered stone
  // actually looks like at half a metre.
  const boulders = lumpVariants(new THREE.IcosahedronGeometry(1, 1), 8, 0.2, rnd);
  // Icosahedron, not octahedron. A 4 cm pebble covers six or seven pixels at a
  // metre and an octahedron only has eight faces, so one of them fills the whole
  // silhouette and the stone renders as a flat plate with straight edges — which
  // is what the close crops showed. Twenty faces puts four or five across the
  // same silhouette, and that is the difference between a chip of paper and a
  // rounded stone.
  const pebbles = lumpVariants(new THREE.IcosahedronGeometry(1, 0), 12, 0.32, rnd);
  // Rut-floor chips: eight faces, jittered hard and squashed flat by the caller.
  // A chip of shale trodden into a packed floor really is angular and really is
  // three or four facets, so the objection that sank the octahedron for the loose
  // tier — one face fills the silhouette — is the correct read here, and it buys
  // back the triangles the loose tier needs to double in density.
  const chips = lumpVariants(new THREE.OctahedronGeometry(1, 0), 10, 0.42, rnd);
  const sticks = lumpVariants(new THREE.CylinderGeometry(1, 0.7, 1, 3, 1, true), 5, 0.12, rnd);
  // Eight sides, not five. Five puts a 70 degree facet on the crown of the tube,
  // which across a 40 cm segment is a flat plate wide enough to read as milled.
  const roots = lumpVariants(new THREE.CylinderGeometry(1, 1, 1, 8, 1, true), 4, 0.16, rnd);

  // Twenty-face pebbles instead of eight cost two and a half times the
  // triangles for the tier there are most of. It is 97 k in one draw call
  // against 2.5 M in the frame, so it is 1.5 per cent of the budget for the
  // difference between a stone and a paper chip — but the cap has to have the
  // headroom or the roots at the end of the list get silently dropped.
  // Raised from 142 k for the mainline's own aggregate. That tier is 60 k on
  // its own — 5200 eight-face chips and 900 twenty-face oversize — which is two
  // per cent of the frame's triangles in the one draw call the whole scatter
  // shares, for the difference between a graded road and a smooth ribbon. The
  // cap has to have headroom or `emit` silently drops whatever is at the end of
  // the list, which here is the twigs and the roots.
  // Raised again for the savanna's own material: six hundred river cobbles, a
  // ring of stones round the water hole and the murram along the pad's edge
  // are another 30 k between them.
  const MAX_TRIS = 250000;
  const pos = new Float32Array(MAX_TRIS * 9);
  const nrm = new Float32Array(MAX_TRIS * 9);
  const col = new Float32Array(MAX_TRIS * 9);

  const MAX_DECALS = 24000;
  const dPos = new Float32Array(MAX_DECALS * 12);
  const dUv = new Float32Array(MAX_DECALS * 8);
  const dStr = new Float32Array(MAX_DECALS * 4);
  const dIdx = new Uint32Array(MAX_DECALS * 6);
  let dn = 0;

  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const ab = new THREE.Vector3();
  const ac = new THREE.Vector3();
  const n = new THREE.Vector3();
  const ns = new THREE.Vector3();
  const UP = new THREE.Vector3(0, 1, 0);
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const m = new THREE.Matrix4();
  const s = new THREE.Vector3();
  const p = new THREE.Vector3();

  let w = 0;

  /** Append one transformed prototype, flat-lit off its own faces. */
  function emit(src, mat, cr, cg, cb, upLean, seed) {
    const tris = src.length / 9;
    if ((w + tris * 3) * 3 > pos.length) return;
    for (let f = 0; f < tris; f++) {
      const o = f * 9;
      a.set(src[o], src[o + 1], src[o + 2]).applyMatrix4(mat);
      b.set(src[o + 3], src[o + 4], src[o + 5]).applyMatrix4(mat);
      c.set(src[o + 6], src[o + 7], src[o + 8]).applyMatrix4(mat);
      // cross( b - a, c - a ) — the other way round gives the inward normal,
      // which lights every stone from behind and renders it as a black chip
      n.crossVectors(ab.subVectors(b, a), ac.subVectors(c, a));
      if (n.lengthSq() < 1e-14) continue;
      n.normalize();
      // Shading normal leaned toward vertical. A twenty-facet lump has facets
      // pointing every which way, and any one of them that happens to face an
      // 8.8-intensity sun renders as a flat pale triangle with straight edges —
      // the "chips of paper on the trail". Leaning the shading normal toward the
      // ground's own keeps the silhouette and the facet break while cutting the
      // spread of N.L that caused it.
      ns.copy(n).lerp(UP, upLean).normalize();
      const verts = [a, b, c];
      for (let vi = 0; vi < 3; vi++) {
        const q3 = w * 3;
        pos[q3] = verts[vi].x;
        pos[q3 + 1] = verts[vi].y;
        pos[q3 + 2] = verts[vi].z;
        nrm[q3] = ns.x;
        nrm[q3 + 1] = ns.y;
        nrm[q3 + 2] = ns.z;
        // Mottled per face, or a flat-shaded lump reads as a faceted bead. A
        // wider spread than the shading alone gives: the cap of a weathered
        // stone is patchy in albedo as well as in slope, and the value range
        // inside one 8 cm object is most of what makes it read as solid.
        // Widened to 0.68-1.36. Twenty facets at plus or minus 22 per cent all
        // land inside one perceptual step, so an eight centimetre lump rendered
        // as a single value with creases in it — the "grey origami" read. Half a
        // stop between adjacent faces is what a weathered stone actually has.
        const mot = 0.68 + (((f * 37 + seed * 13) % 23) / 23) * 0.68;
        // Seat, baked per vertex off the prototype's own local height. A plain
        // standard material has no occlusion term, so where the terrain shader
        // hands the dirt a cavity and a sun march the stone gets flat sky over
        // its whole surface — every facet at the same brightness, no darkening
        // where it meets the ground, and the close crops came back with pale tan
        // origami sitting on the trail. The dirt is what occludes the bottom
        // third of a half-buried stone, and this is the cheapest honest way to
        // say so: it also gives the lump a light top and a dark base, which is
        // the value range that reads as solid rather than as cut paper.
        const ly = src[o + vi * 3 + 1];
        // Deeper at the base than it was (0.54): with the albedo up at the
        // soil's level the contact has to be carried by the stone as well as
        // by the decal under it, or the lit cap and the seated base read as
        // one value and the stone is a disc again.
        const seat = 0.4 + 0.6 * Math.min(1, Math.max(0, (ly + 0.35) / 1.15));
        col[q3] = cr * mot * seat * SCATTER_LEVEL;
        col[q3 + 1] = cg * mot * seat * SCATTER_LEVEL;
        col[q3 + 2] = cb * mot * seat * SCATTER_LEVEL;
        w++;
      }
    }
  }

  // Sun ground projection, so every decal falls the same way as every shadow
  // the shadow map draws.
  const sl = Math.hypot(sunV.x, sunV.z) || 1;
  const e1x = -sunV.x / sl;
  const e1z = -sunV.z / sl;
  const e2x = -e1z;
  const e2z = e1x;
  const tanEl = sunV.y / sl;

  /**
   * One contact-plus-cast shadow quad under something `r` wide and `h` tall.
   *
   * These multiply, so their size is the thing that matters most: gravel sits in
   * patches, and a penumbra even slightly wider than the gap between two stones
   * means four or five of them stack on the same pixel. At 0.4 per decal that is
   * a 0.4^5 hole in the trail, which is what the first pass drew — a field of
   * round black blobs. Tight core, short penumbra, modest strength.
   */
  function decal(x, y, z, r, h, strength) {
    if (dn >= MAX_DECALS) return;
    // A 1.05r footprint with a 0.3 core radius put four legible pixels under an
    // 8 cm stone, and hiding the whole buffer moved the verge framing's mean by
    // one part in three thousand — so the stones had silhouettes and light and
    // dark sides but no cast shadow on the ground beside them.
    const len = r * 1.25 + h / Math.max(0.3, tanEl);
    const wid = r * 1.2;
    const cx = x + e1x * (len * 0.5 - r * 0.4);
    const cz = z + e1z * (len * 0.5 - r * 0.4);
    const ax = e1x * len * 0.55;
    const az = e1z * len * 0.55;
    const bx = e2x * wid;
    const bz = e2z * wid;
    const base = dn * 4;
    // Lifted well clear of the dirt. `y` comes from the analytic surface, but
    // what gets rasterised is the mesh interpolating that surface across 29 cm
    // cells, and the height field carries a centimetre of noise at a one metre
    // wavelength — so at 8 mm a good half of these quads were below the
    // triangle they were supposed to sit on and got depth-tested away. That is
    // why the stones had silhouettes and no contact.
    const yy = y + 0.024;
    for (let k = 0; k < 4; k++) {
      const su = k === 0 || k === 3 ? -1 : 1;
      const sv = k < 2 ? -1 : 1;
      const i3 = (base + k) * 3;
      dPos[i3] = cx + ax * su + bx * sv;
      dPos[i3 + 1] = yy;
      dPos[i3 + 2] = cz + az * su + bz * sv;
      dUv[(base + k) * 2] = su * 0.5 + 0.5;
      dUv[(base + k) * 2 + 1] = sv * 0.5 + 0.5;
      dStr[base + k] = strength;
    }
    // Wound the other way round. e1 x e2 is ( 0, -1, 0 ) — the sun's ground
    // projection crossed with its own perpendicular points *down* — so the
    // obvious winding gave every quad a downward normal and the whole buffer was
    // back-face culled. Four hundred stones with silhouettes and no contact
    // shadow under any of them, and it measured as an exactly zero difference in
    // the ground mean with the mesh hidden, which is how it was finally caught.
    const o = dn * 6;
    dIdx[o] = base;
    dIdx[o + 1] = base + 2;
    dIdx[o + 2] = base + 1;
    dIdx[o + 3] = base;
    dIdx[o + 4] = base + 3;
    dIdx[o + 5] = base + 2;
    dn++;
  }

  /**
   * Aggregate colour in the dirt's own family: brown mostly, grey in the tail.
   *
   * The floor matters more than the range. PALETTE.dirt is 0.107/0.067/0.037
   * linear and the terrain shader knocks its tile down by occlusion, cavity and
   * grain before anything is lit, so the trail renders at maybe 0.06 red. A
   * stone keyed at 0.048 with the blue lifted to 0.6 of red is *brighter and
   * less saturated* than the ground it sits in, and that is a paper chip
   * however sharp its silhouette is. Keyed under the dirt instead, with the
   * blue held down, a lit facet reads as a lit stone.
   */
  function aggColour(vBias) {
    // Two mineral families, not one long tail.
    //
    // The single dark tail was measurable: hiding the whole stone mesh in the
    // 40 cm framing moved the frame mean by a seventh of a per cent and the
    // before/after crops were pixel-identical. Every lump was keyed *under* the
    // dirt it sat in, so a dark stone on dark damp earth in a shaded corridor had
    // no silhouette to be sharp about however good its geometry was.
    //
    // Real aggregate on a logging cut is sorted: mostly dark basalt and
    // ironstone, and one in four a pale weathered mineral — quartz, granite, a
    // limestone chip. The pale quarter is what catches the key and puts an edge
    // on the tier; the dark three quarters are what stop it reading as gravel
    // spilled on the trail. Both families keep the per-face mottle and the seat
    // gradient, so even a pale lump has a dark base where it meets the dirt.
    if (rnd() < 0.28) {
      // Properly neutral, not a warm grey. At 0.84 green and 0.78 blue against a
      // warm key these came back as pink flecks in the plan framing; quartz and
      // weathered granite are neutral to slightly cool, and it is the *lack* of
      // the dirt's chroma that says "mineral" rather than "clod".
      const shade = 0.075 + rnd() * vBias * 2.2;
      const grey = 0.93 + rnd() * 0.07;
      // Coated in the soil it lies in, like every other piece — the neutral
      // is what shows on the lit cap once the fines are accounted for, not the
      // whole stone. Bare, these were the confetti; a fifth brighter than the
      // dark family so a few caps still catch the key and the tier has an edge.
      return soilTint([shade, shade * grey, shade * (grey - 0.05 + rnd() * 0.1)], rnd, 0.3);
    }
    // Floored at 0.034, not 0.024. Times the 0.68 low end of the per-face mottle
    // and the 0.44 low end of the seat gradient, 0.024 renders at 0.007 — which
    // at two pixels across is not a dark stone, it is a dead pixel, and the close
    // crops came back peppered with them.
    // Ironstone and laterite gravel: redder than the forest's basalt family,
    // because it is the same iron that colours the earth round it.
    const v = rnd() ** 1.7;
    const shade = 0.042 + v * vBias * 1.3;
    const grey = rnd() ** 1.6;
    return soilTint([shade, shade * (0.68 + grey * 0.18), shade * (0.44 + grey * 0.26)], rnd);
  }

  let placed = 0;
  for (let guard = 0; guard < STONE_COUNT * 14 && placed < STONE_COUNT; guard++) {
    // Placed in road space so the density follows the two-track: most of them
    // in the rut troughs and along the shoulder where the grader left the
    // coarse material, a few scattered over the crown.
    const t = rnd();
    // Deliberately *not* in the rut troughs. A rut floor is where the tyres
    // have polished the fines flat; loose stone collects on the lip either side
    // of it and out on the shoulder. Filling the troughs with pebbles was what
    // made the two-track read as rough scree rather than as a packed channel.
    let lat;
    const sgn = rnd() < 0.5 ? -1 : 1;
    if (t < 0.34) lat = sgn * (RUT_C + (rnd() < 0.5 ? -1 : 1) * (RUT_W * 1.7 + rnd() * 0.22));
    else if (t < 0.78) lat = sgn * (ROAD_HALF + 0.05 + rnd() * 1.9);
    else lat = (rnd() - 0.5) * 0.8;

    const u = rnd();
    const cp = curve.getPoint(u, p);
    const tg = curve.getTangent(u, ab).normalize();
    const x = cp.x - tg.z * lat;
    const z = cp.z + tg.x * lat;
    surfaceInfo(x, z, info);
    if (info.grade < 0.06) continue;
    // never inside a puddle: a stone poking out of standing water needs a
    // waterline to look right and there is nothing here to draw one with
    if (info.wet > 0.22) continue;

    // Most of them are pebbles. A handful are big enough to be worth steering
    // around, which is what gives the corridor a sense of scale. Anything under
    // about 6 cm across is a sub-pixel speck by the time the camera is a metre
    // off the dirt, so the small tier starts where it can still be read.
    const big = rnd() < 0.32;
    // The two tiers used to overlap: the small one ran to 10 cm, which is a
    // 25 cm stone once the width jitter is on it, and at that size a twenty-face
    // lump squashed to 0.4 of its height and sunk four fifths of the way in
    // shows exactly three facets. That is a low pyramid, and the close crops
    // were full of them. The tiers are separated now and the size decides the
    // prototype, so nothing above 7 cm is drawn with twenty faces.
    // Small tier floored at 4 cm (8 cm across): under that, at the 30 cm the
    // close framings sit off the dirt, a stone is a grey speck with no shading
    // range inside it — the confetti.
    const r = big ? 0.075 + rnd() * 0.075 : 0.04 + rnd() * 0.035;
    s.set(r * (0.8 + rnd() * 0.42), r * (0.55 + rnd() * 0.4), r * (0.8 + rnd() * 0.42));
    // Mostly level, not tumbled. A stone pressed into a track by traffic lies
    // on its broad face; random Euler angles stood a third of them on a corner,
    // which is the "shard" read — a blade of rock with one facet full to the
    // key and the dirt showing under its edge.
    e.set((rnd() - 0.5) * 0.7, rnd() * 6.283, (rnd() - 0.5) * 0.7);
    q.setFromEuler(e);
    // Sunk so only a cap shows, like something the grader pressed in — but not
    // so far that the cap is all that is left. A stone with a third of itself
    // above the dirt has a silhouette; one with a tenth has an outline.
    // A quarter deeper than round 1 (0.34–0.64): the critics read the tier as
    // lying on the surface, and the lean stones above no longer stand tall
    // enough for a deeper seat to bury them.
    const sink = 0.44 + rnd() * 0.3;
    m.compose(new THREE.Vector3(x, info.y - s.y * sink, z), q, s);

    // Aggregate value, skewed dark for the same reason the textures are: a
    // scatter of light pebbles over a dark trail reads as gravel spilled on it.
    // Top of the range sits at about the dirt's own albedo, not above it. The
    // terrain knocks its tile down with occlusion, grain and clod tints before
    // anything is lit, so a stone keyed to the raw tile mean still renders two
    // to three times brighter than the ground it is sitting in — which is a
    // pale flake with straight edges, whatever colour it is.
    const cc = aggColour(0.038);
    // 0.62 flattened the shading normal so far toward the ground's own that
    // every facet of a lump rendered at the same brightness. A stone with one
    // brightness is a plate however sharp its outline is — the value range
    // *inside* the 8 cm object is the thing that says "solid".
    const proto = big ? boulders[(rnd() * boulders.length) | 0] : lumps[(rnd() * lumps.length) | 0];
    // 0.26, from 0.34: with the stones lying flat rather than on a corner the
    // facet spread is already narrower, so the shading normal can follow the
    // sun more honestly — a lit side and a shaded side is what says "solid".
    emit(proto, m, cc[0], cc[1], cc[2], 0.26, placed);
    // Only the ones that stand proud enough to throw anything — but 14 mm was
    // most of the small tier, so most stones sat in the dirt with no contact
    // under them at all and read as pasted on.
    // Stronger and a shade wider than round 1: the contact is what every critic
    // said was missing, and at 0.6 under a stone the soil's own colour it did
    // not register against the dirt's cavity term.
    if (s.y * (1 - sink) > 0.007) decal(x, info.y, z, r * 0.95, s.y * (1 - sink), big ? 1.0 : 0.85);
    placed++;
  }

  // --- loose gravel ---------------------------------------------------------
  // The tier that actually answers "is this real dirt". Unlike the embedded
  // stones these sit on top, so each one has a silhouette against the ground
  // behind it and a hard little shadow beside it. Placed in patches rather than
  // evenly: gravel collects where water has run and where the tyres have thrown
  // it, and a uniform sprinkle over three hundred metres of trail reads as
  // scenery dressing.
  let gravel = 0;
  for (let guard = 0; guard < GRAVEL_COUNT * 9 && gravel < GRAVEL_COUNT; guard++) {
    const t = rnd();
    let lat;
    const sgn = rnd() < 0.5 ? -1 : 1;
    // Three bands, and the budget is on the running surface now rather than out
    // past the shoulder. A quarter of the tier used to be scattered from
    // ROAD_HALF to ROAD_HALF + 1.5, which the forest's undergrowth covers
    // completely — a quarter of the triangles drawn where nothing can see them,
    // while the 40 cm framing over the wheel path had eight chips in it.
    //
    //   chip   trodden into the rut floor, angular, only a cap showing
    //   loose  lying on the rut lip and the wheel path, most of it proud
    //   crown  the strip between the ruts, mixed
    const chip = t < 0.3;
    if (chip) lat = sgn * (RUT_C + (rnd() - 0.5) * RUT_W * 1.6);
    else if (t < 0.66) lat = sgn * (RUT_C + (rnd() - 0.5) * RUT_W * 3.4);
    else if (t < 0.86) lat = (rnd() - 0.5) * 1.15;
    else lat = sgn * (ROAD_HALF + 0.05 + rnd() * 1.1);

    const u = rnd();
    const cp = curve.getPoint(u, p);
    const tg = curve.getTangent(u, ab).normalize();
    const x = cp.x - tg.z * lat;
    const z = cp.z + tg.x * lat;
    surfaceInfo(x, z, info);
    if (info.grade < 0.05) continue;
    // Only open water is excluded. Damp ground is where aggregate is *most*
    // visible, not least: the fines wash off it and leave the stone proud, and
    // 0.2 was throwing the whole tier away over any stretch the wetness field
    // touched — which is most of the corridor and all of the framings that
    // matter.
    if (info.wet > (chip ? 0.72 : 0.5)) continue;
    // Patchiness, in road space so it follows the trail rather than the world
    // grid. The trough tier skips it: a tyre track is continuous, and a rut with
    // chips in it for two metres and nothing for the next four reads as a
    // scattering of debris rather than as a trodden surface.
    const patch = fbm(info.along * 0.42, lat * 0.7 + 3.3, { octaves: 3, period: 64, seed: 401 });
    if (!chip && patch < 0.42) continue;

    // 1.3 to 3.5 cm sunk four fifths of the way in is a sub-pixel speck at a
    // metre, which is what the whole loose tier was. The proud band runs 3 to
    // 8 cm now and keeps two thirds of itself above the dirt, so it has a
    // silhouette against the ground behind it and something for the contact
    // decal to be the shadow of.
    // Proud tier floored at 4 cm, and lying on a face rather than tumbled —
    // see the embedded tier for why. Sunk a fifth deeper than it was: a pebble
    // with three quarters of itself in the air on a packed track is not
    // something traffic leaves behind.
    const r = chip ? 0.012 + rnd() ** 1.4 * 0.019 : 0.04 + rnd() ** 1.3 * 0.045;
    const flat = chip ? 0.3 + rnd() * 0.3 : 0.52 + rnd() * 0.44;
    s.set(r * (0.82 + rnd() * 0.42), r * flat, r * (0.82 + rnd() * 0.42));
    if (chip) e.set(rnd() * 6.283, rnd() * 6.283, rnd() * 6.283);
    else e.set((rnd() - 0.5) * 0.8, rnd() * 6.283, (rnd() - 0.5) * 0.8);
    q.setFromEuler(e);
    const sink = chip ? 0.38 + rnd() * 0.3 : 0.24 + rnd() * 0.3;
    m.compose(new THREE.Vector3(x, info.y - s.y * sink, z), q, s);
    const cc = aggColour(0.038);
    // Barely leaned for the proud tier. A stone sitting on the ground is
    // supposed to have a light side and a dark side, and leaning the shading
    // normal toward the ground's own is what collapsed that range — every facet
    // of every lump at one brightness, which is a plate however sharp its
    // outline is. The chips keep more lean: they are flush with a polished floor
    // and a chip that shades like a boulder reads as a hole in it.
    emit(chip ? chips[(rnd() * chips.length) | 0] : pebbles[(rnd() * pebbles.length) | 0], m, cc[0], cc[1], cc[2], chip ? 0.34 : 0.14, gravel);
    const proud = s.y * (1 - sink);
    // Nothing under 1.2 cm of exposure gets a quad. The chip tier is the densest
    // thing in the scatter by a long way, and the decals compound where they
    // overlap — so the smallest members of the densest tier are where nearly all
    // the overlap comes from, and they are also the ones whose shadow is a single
    // pixel wide from any framing. Skipping them removes most of the compounding
    // at no visible cost.
    if (proud > 0.012) decal(x, info.y, z, r * 0.95, proud, chip ? 0.45 : 0.95);
    gravel++;
  }

  // --- the mainline's own aggregate ----------------------------------------
  // On the trail loose stone is dressing over a surface that is fundamentally
  // dirt. Here it *is* the surface: a graded road is a layer of crushed rock,
  // and the top centimetre of it is not bound to anything. So this tier is not
  // the trail's tier moved sideways — it is denser, it is angular rather than
  // rounded, it is graded into two sizes rather than one, and it is placed by
  // where traffic has swept it rather than by where water has left it.
  //
  // It is also the only thing in the world that gives the mainline shape at
  // arm's length. The tile mips to its mean by ten metres and the cross-section
  // masks are the same all the way down the road; without geometry the first
  // pass rendered as a smooth ribbon, which is a road and not a gravel one.
  let chips2 = 0;
  for (let guard = 0; guard < MAIN_CHIP_COUNT * 8 && chips2 < MAIN_CHIP_COUNT; guard++) {
    const t = rnd();
    const sgn = rnd() < 0.5 ? -1 : 1;
    let lat;
    // Swept, not scattered. Wheels throw the loose fraction off the travelled
    // way and it piles between the wheel paths and along the shoulder, so the
    // two strips a vehicle actually runs on are the *clearest* part of the
    // surface — which is the inverse of the trail, where the rut lips collect
    // and the crown stays bare.
    if (t < 0.3) lat = (rnd() - 0.5) * 1.5;
    else if (t < 0.52) lat = sgn * (MAIN_RUT_C + (rnd() - 0.5) * MAIN_RUT_W * 2.4);
    else if (t < 0.78) lat = sgn * (MAIN_RUT_C + MAIN_RUT_W * 1.6 + rnd() * (MAIN_HALF - MAIN_RUT_C - MAIN_RUT_W));
    else lat = sgn * (MAIN_HALF - 0.2 + rnd() * (MAIN_SHOULDER + 0.6));

    const u = rnd();
    const cp = mainCurve.getPoint(u, p);
    const tg = mainCurve.getTangent(u, ab).normalize();
    const x = cp.x - tg.z * lat;
    const z = cp.z + tg.x * lat;
    surfaceInfo(x, z, info);
    if (info.share < 0.45) continue;
    // Patchiness in the mainline's own road space, so it follows the road
    // rather than the world grid: a graded surface is swept clean in places and
    // has half an inch of loose stone standing on it in others.
    if (fbm(info.mAlong * 0.3, lat * 0.55 + 7.1, { octaves: 3, period: 64, seed: 419 }) < 0.36) continue;

    // Two sizes, which is what "graded aggregate" means: a 3-6 cm surface
    // course with a 1-2 cm fraction filling between it. One size reads as
    // gravel poured out of a bag.
    const coarse = rnd() < 0.42;
    const r = coarse ? 0.022 + rnd() ** 1.2 * 0.036 : 0.009 + rnd() ** 1.4 * 0.014;
    // Angular. Crushed rock sits on a face with its arrises up, so it is
    // squatter than a river pebble and its silhouette has corners in it.
    const flat = 0.42 + rnd() * 0.4;
    s.set(r * (0.8 + rnd() * 0.5), r * flat, r * (0.8 + rnd() * 0.5));
    e.set(rnd() * 6.283, rnd() * 6.283, rnd() * 6.283);
    q.setFromEuler(e);
    // Barely sunk. This is loose material lying on a compacted base, not
    // aggregate pressed into mud — the trail's stones are half buried and
    // these are not, and that difference is visible at half a metre.
    const sink = 0.06 + rnd() * 0.24;
    m.compose(new THREE.Vector3(x, info.y - s.y * sink, z), q, s);
    const cc = mineralColour(rnd);
    // Chips keep a shallow lean so their facets do not all catch the key at
    // once, which on 5200 objects in open sun is a field of white flakes.
    emit(chips[(rnd() * chips.length) | 0], m, cc[0], cc[1], cc[2], 0.3, chips2 + 7000);
    const proud = s.y * (1 - sink);
    if (proud > 0.01) decal(x, info.y, z, r * 0.85, proud, coarse ? 0.7 : 0.45);
    chips2++;
  }

  // Oversize: the pieces too big for the surface course, which end up shoved
  // to the shoulder and standing in the windrow. This is what gives the road's
  // edge a scale, and it is the tier a headlamp picks out at night.
  let mrock = 0;
  for (let guard = 0; guard < MAIN_ROCK_COUNT * 10 && mrock < MAIN_ROCK_COUNT; guard++) {
    const sgn = rnd() < 0.5 ? -1 : 1;
    const t = rnd();
    const lat =
      t < 0.68
        ? sgn * (MAIN_HALF + 0.1 + rnd() * (MAIN_SHOULDER + 0.5))
        : sgn * (MAIN_HALF + MAIN_SHOULDER + rnd() * MAIN_DITCH * 1.1);
    const u = rnd();
    const cp = mainCurve.getPoint(u, p);
    const tg = mainCurve.getTangent(u, ab).normalize();
    const x = cp.x - tg.z * lat;
    const z = cp.z + tg.x * lat;
    surfaceInfo(x, z, info);
    if (info.share < 0.3) continue;
    const r = 0.06 + rnd() ** 1.5 * 0.11;
    s.set(r * (0.85 + rnd() * 0.4), r * (0.5 + rnd() * 0.42), r * (0.85 + rnd() * 0.4));
    e.set(rnd() * 6.283, rnd() * 6.283, rnd() * 6.283);
    q.setFromEuler(e);
    const sink = 0.18 + rnd() * 0.32;
    m.compose(new THREE.Vector3(x, info.y - s.y * sink, z), q, s);
    const cc = mineralColour(rnd);
    emit(pebbles[(rnd() * pebbles.length) | 0], m, cc[0], cc[1], cc[2], 0.22, mrock + 21000);
    const proud = s.y * (1 - sink);
    if (proud > 0.012) decal(x, info.y, z, r * 0.85, proud, 0.8);
    mrock++;
  }

  // --- twigs, bark flakes and stripped needle clusters ----------------------
  let twigs = 0;
  for (let guard = 0; guard < TWIG_COUNT * 9 && twigs < TWIG_COUNT; guard++) {
    const t = rnd();
    const sgn = rnd() < 0.5 ? -1 : 1;
    // mostly off the running surface: what lands on the track gets ground in
    const lat = t < 0.72 ? sgn * (ROAD_HALF + 0.1 + rnd() * 2.6) : (rnd() - 0.5) * ROAD_HALF * 1.7;
    const u = rnd();
    const cp = curve.getPoint(u, p);
    const tg = curve.getTangent(u, ab).normalize();
    const x = cp.x - tg.z * lat;
    const z = cp.z + tg.x * lat;
    surfaceInfo(x, z, info);
    if (info.wet > 0.25) continue;

    const len = 0.075 + rnd() ** 1.7 * 0.26;
    const rad = 0.0045 + rnd() * 0.0085;
    s.set(rad, len, rad * (0.8 + rnd() * 0.5));
    // lying down: rolled onto its side, then yawed, with a little pitch so one
    // end lifts off the ground
    e.set(Math.PI * 0.5 + (rnd() - 0.5) * 0.34, rnd() * 6.283, (rnd() - 0.5) * 0.5);
    q.setFromEuler(e);
    m.compose(new THREE.Vector3(x, info.y + rad * (0.35 + rnd() * 0.5), z), q, s);
    // sun-bleached: grey wood, not bark brown
    const v = rnd();
    const shade = 0.04 + v * 0.03;
    emit(sticks[(rnd() * sticks.length) | 0], m, shade, shade * (0.9 + v * 0.06), shade * (0.76 + v * 0.12), 0.3, twigs);
    decal(x, info.y, z, len * 0.26, rad * 1.4, 0.45);
    twigs++;
  }

  // --- the features' own loose material -------------------------------------
  // One placer for all three: a world position, a size range, a colour family,
  // and how far the stone is sunk. Water-worn cobbles in the river are rounder
  // and paler than anything on the road, and they sit *on* the sand rather
  // than pressed into it.
  function placeStone(x, z, rMin, rMax, sink, cc, upLean, seed, rounded) {
    surfaceInfo(x, z, info);
    const r = rMin + rnd() * (rMax - rMin);
    s.set(r * (0.85 + rnd() * 0.35), r * (rounded ? 0.7 + rnd() * 0.3 : 0.5 + rnd() * 0.4), r * (0.85 + rnd() * 0.35));
    e.set(rnd() * 6.283, rnd() * 6.283, rnd() * 6.283);
    q.setFromEuler(e);
    m.compose(new THREE.Vector3(x, info.y - s.y * sink, z), q, s);
    const big = r > 0.07;
    const proto = big ? boulders[(rnd() * boulders.length) | 0] : lumps[(rnd() * lumps.length) | 0];
    emit(proto, m, cc[0], cc[1], cc[2], upLean, seed);
    if (s.y * (1 - sink) > 0.007) decal(x, info.y, z, r * 0.85, s.y * (1 - sink), big ? 0.85 : 0.6);
  }
  /** Water-worn quartzite and granite: pale, grey, a little warm. */
  function cobbleColour() {
    const v = 0.055 + rnd() ** 1.3 * 0.05;
    const warm = rnd() * 0.12;
    return [v * (0.98 + warm), v * 0.96, v * (0.86 - warm * 0.5)];
  }

  // Cobbles: along the channel, mostly on the floor, gathered into bars.
  {
    const pts = LAND.river;
    let done = 0;
    for (let guard = 0; guard < RIVER_COBBLES * 6 && done < RIVER_COBBLES; guard++) {
      const seg = 1 + ((rnd() * (pts.length - 3)) | 0);
      const f = rnd();
      const ax0 = pts[seg].x + (pts[seg + 1].x - pts[seg].x) * f;
      const az0 = pts[seg].z + (pts[seg + 1].z - pts[seg].z) * f;
      const lat = (rnd() - 0.5) * 2 * (RIVER_HALF + 1.2);
      const dx = pts[seg + 1].x - pts[seg].x;
      const dz = pts[seg + 1].z - pts[seg].z;
      const l = Math.hypot(dx, dz) || 1;
      const x = ax0 - (dz / l) * lat;
      const z = az0 + (dx / l) * lat;
      // bars: the stones gather where the flow dropped them
      if (fbm(x * 0.11, z * 0.11, { octaves: 2, period: 64, seed: 561 }) < 0.42 && rnd() < 0.7) continue;
      surfaceInfo(x, z, info);
      // not under the embankment, not where the channel has run out
      if (info.chan < 0.3 || info.share > 0.05) continue;
      const big = rnd() < 0.22;
      placeStone(x, z, big ? 0.08 : 0.03, big ? 0.16 : 0.07, 0.3 + rnd() * 0.25, cobbleColour(), 0.3, 900 + done, true);
      done++;
    }
  }
  // The water hole's margin: stones the animals have kicked clear of the mud,
  // lying on the trampled ring outside it.
  for (let i = 0; i < HOLE_STONES; i++) {
    const ang = rnd() * 6.283;
    const rr = HOLE_BASIN * 0.7 + rnd() ** 0.7 * 12;
    const x = LAND.hole.x + Math.cos(ang) * rr;
    const z = LAND.hole.z + Math.sin(ang) * rr;
    surfaceInfo(x, z, info);
    if (info.mud > 0.85) continue;
    placeStone(x, z, 0.03, 0.11, 0.4 + rnd() * 0.3, aggColour(0.04), 0.34, 1600 + i, false);
  }
  // Murram the grader pushed to the pad's edge, and the odd stone left on it.
  for (let i = 0; i < PAD_STONES; i++) {
    const C = LAND.camp;
    const ang = rnd() * 6.283;
    const onEdge = rnd() < 0.72;
    const ca = Math.cos(ang);
    const sa = Math.sin(ang);
    const ra = ca < 0 ? PAD_R_ROAD : PAD_R_FAR;
    const scale = onEdge ? 1 + (rnd() - 0.3) * 0.12 : rnd() ** 0.5 * 0.92;
    const a = ca * ra * scale;
    const b = sa * PAD_R_SIDE * scale;
    const x = C.x + C.ax * a + C.bx * b;
    const z = C.z + C.az * a + C.bz * b;
    surfaceInfo(x, z, info);
    if (info.share > 0.05 || info.pad < 0.05) continue;
    placeStone(x, z, 0.03, onEdge ? 0.12 : 0.06, 0.4 + rnd() * 0.3, aggColour(0.042), 0.34, 2000 + i, false);
  }

  // --- surface roots crossing the trail -------------------------------------
  // A track through conifers has roots across it, and they are the one feature
  // that says the trail was cut through something rather than drawn on it.
  for (let i = 0; i < ROOT_COUNT; i++) {
    const u = 0.02 + (i + rnd() * 0.7) / (ROOT_COUNT + 1);
    const cp = curve.getPoint(u, p).clone();
    const tg = curve.getTangent(u, ab).normalize().clone();
    const span = 2.0 + rnd() * 1.8;
    const skew = (rnd() - 0.5) * 0.8;
    const phase = rnd() * 6.283;
    const phase2 = rnd() * 6.283;
    const rad0 = 0.026 + rnd() * 0.026;
    const v = rnd();
    const shade = 0.026 + v * 0.02;
    let px = 0;
    let pz = 0;
    let py = 0;
    for (let k = 0; k <= ROOT_SEGS; k++) {
      const f = k / ROOT_SEGS;
      const lat = (f - 0.5) * 2 * span;
      // Two wander frequencies, and the fast one has real amplitude. At five
      // segments over four metres with one slow sine on it the whole root was a
      // straight line in plan, and a straight line 4 cm wide and 4 m long with a
      // flat top facet is a length of angle iron lying on the trail — which is
      // exactly what the close crops showed. A root follows the path of least
      // resistance between stones and changes direction every half metre.
      const along =
        Math.sin(f * 3.1 + phase) * 0.42 + Math.sin(f * 11.3 + phase2) * 0.16 + skew * lat * 0.2;
      const x = cp.x - tg.z * lat + tg.x * along;
      const z = cp.z + tg.x * lat + tg.z * along;
      surfaceInfo(x, z, info);
      // Alternately buried and standing proud, biased under: a root crossing a
      // graded track is mostly *in* it, with a knuckle showing every half metre.
      // The knuckles have to *stand* though — at a peak of 0.16 of the radius all
      // that showed was the very crown of the tube, which is a flat sliver running
      // the whole length rather than a series of humps.
      const bulge = Math.sin(f * 7.4 + phase) * 0.78 - 0.3;
      const y = info.y + rad0 * bulge;
      // Segments that are entirely under the dirt are not drawn at all, so the
      // gaps between the knuckles are real gaps. A continuous tube with its
      // bottom hidden still reads as a pipe; a run of humps with dirt between
      // them reads as a root.
      if (k > 0 && bulge > -0.62) {
        const dx = x - px;
        const dy = y - py;
        const dz = z - pz;
        const seg = Math.hypot(dx, dy, dz);
        if (seg > 1e-3) {
          // Tapered toward both ends as well as knuckled along the length, so it
          // runs out into the dirt instead of stopping at full thickness.
          const taper = 0.45 + 0.55 * Math.sin(Math.PI * Math.min(1, Math.max(0, f)));
          const r = rad0 * taper * (0.72 + Math.sin(f * 5.1 + phase) * 0.28);
          s.set(r, seg * 1.04, r * 0.82);
          q.setFromUnitVectors(UP, ac.set(dx, dy, dz).multiplyScalar(1 / seg));
          m.compose(new THREE.Vector3(px + dx * 0.5, py + dy * 0.5, pz + dz * 0.5), q, s);
          // Barely leaned. At 0.34 the one wide top facet of a seven-sided prism
          // was handed most of the ground's own normal, so it caught the key flat
          // across a whole 40 cm segment and came back as a pale grey plank.
          emit(roots[(rnd() * roots.length) | 0], m, shade, shade * 0.8, shade * 0.6, 0.12, i * 7 + k);
          if (bulge > 0.0) decal(x, info.y, z, r * 1.3, r * bulge, 0.6);
        }
      }
      px = x;
      py = y;
      pz = z;
    }
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos.subarray(0, w * 3), 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nrm.subarray(0, w * 3), 3));
  g.setAttribute('color', new THREE.BufferAttribute(col.subarray(0, w * 3), 3));
  g.computeBoundingSphere();

  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    // 0.92, from 0.88, and the environment term below cut to a third. Together
    // these are why the tier stopped grading with the hour: the aggregate was
    // keyed dark enough that its diffuse return was a few thousandths, and at
    // that level the indirect *specular* off the sky map — which does not
    // scale with albedo and is blue-grey at every hour — was most of the light
    // on every stone. Dusk took the dirt to wine red and left the stones the
    // colour of the noon sky.
    roughness: 0.92,
    metalness: 0.0,
    // Half the terrain's 2.1, not matched to it. The terrain multiplies its
    // indirect term by a hand-rolled occlusion map and gates its specular on
    // it; a plain standard material has neither, so matching the number gave
    // the stones an unoccluded sky term twice the strength of the dirt's. That
    // is why they stayed pale in shadow while the trail around them went dark.
    //
    // Back up to 1.7 now the aggregate albedo is keyed under the dirt rather
    // than over it. Most of this corridor is under a canopy with no key on it,
    // so the sky term is nearly all the light a stone gets; at half the terrain's
    // figure the stones came back *darker* than the trail and read as holes
    // punched in it — black polygons in the plan framing.
    // Back down from 1.7 now the terrain's own occlusion stack is bounded rather
    // than multiplying out to a thirtieth: the dirt got about a stop brighter in
    // its hollows when that was collapsed, so the gap this number was
    // compensating for has closed. 1.25 with the seat gradient and the widened
    // per-face mottle on top of it went a step too far the other way and the
    // stones came back as dark slate chips.
    // Down with the terrain's, and for the same reason: the sky term is nearly all
    // the light a stone under a canopy gets, so leaving it at 1.5 against a halved
    // dirt albedo would have handed the whole level cut back on the one surface
    // that most needs to stay keyed under the trail.
    // 0.4 now the albedo inherits the soil: the stones no longer need the sky
    // term to keep them out of black, and it was the sky term that kept them
    // grey. (The indirect diffuse still comes through the hemisphere light,
    // which follows the hour.)
    envMapIntensity: 0.4,
    // Off so the softened per-face normals above are actually used: flat
    // shading derives the normal from screen-space derivatives and throws the
    // normal attribute away.
    flatShading: false,
    dithering: true,
  });
  if (env) mat.envMap = env;

  const stoneMesh = new THREE.Mesh(g, mat);
  stoneMesh.name = 'roadStones';
  stoneMesh.castShadow = false;
  stoneMesh.receiveShadow = true;

  // --- the shadows ----------------------------------------------------------
  const dg = new THREE.BufferGeometry();
  dg.setAttribute('position', new THREE.BufferAttribute(dPos.subarray(0, dn * 12), 3));
  dg.setAttribute('uv', new THREE.BufferAttribute(dUv.subarray(0, dn * 8), 2));
  dg.setAttribute('aStr', new THREE.BufferAttribute(dStr.subarray(0, dn * 4), 1));
  dg.setIndex(new THREE.BufferAttribute(dIdx.subarray(0, dn * 6), 1));
  dg.computeBoundingSphere();

  const dMat = new THREE.ShaderMaterial({
    uniforms: {
      // What a shadow removes is the warm key; what is left is skylight, so a
      // shadow on warm dirt is cooler as well as darker. Multiplicative, so it
      // never lifts a black or tints a highlight.
      // 0.42/0.45/0.54 at a 0.53 core alpha is a 29 per cent darkening, and the
      // dirt it lands on already carries a cavity term with more range than
      // that — so the contact disappeared into the grain and the stones went on
      // reading as pasted on. A shadow on a horizontal surface in a forest is
      // most of a stop and a half down.
      uShadow: { value: new THREE.Color(0.26, 0.29, 0.38) },
    },
    vertexShader: /* glsl */ `
      attribute float aStr;
      varying vec2 vUv;
      varying float vStr;
      varying float vFade;
      void main() {
        vUv = uv;
        vStr = aStr;
        vec4 mv = modelViewMatrix * vec4( position, 1.0 );
        // Faded out past a few metres, which is the fix for the black blotches the
        // integrated wide shots had all over the trail.
        //
        // These are multiply-blended, and the blend resolves to
        // dst * ( 1 - a + a * uShadow ) — so two quads that overlap darken by the
        // square of that and three by the cube. Close to the camera they hardly
        // overlap, because the stones they belong to do not. At fifteen metres the
        // same scatter of fifteen thousand quads falls inside a few thousand pixels,
        // every one of them lands on several others, and the compounding takes the
        // running surface to black in patches. Proved by hiding this mesh: the
        // blotches go and the trail underneath is clean.
        //
        // Nothing is given up by fading them. This tier exists because the sun's
        // shadow map is 4 cm a texel and cannot resolve a pebble; past six metres a
        // pebble's shadow is smaller than the pixel it would land in, so there is
        // nothing left to resolve either way.
        vFade = 1.0 - smoothstep( 5.0, 13.0, -mv.z );
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uShadow;
      varying vec2 vUv;
      varying float vStr;
      varying float vFade;
      void main() {
        if ( vFade <= 0.001 ) discard;
        float d = length( vUv - 0.5 ) * 2.0;
        // a tight core for the contact and a short penumbra for the cast part
        // 0.55/0.35 against a 0.52 shadow colour came to a sixteen per cent
        // darkening at the core, which on damp earth under a canopy is nothing:
        // the close crops showed stones with real silhouettes sitting on the
        // dirt with no contact under them at all. A stone without a shadow reads
        // as pasted on, and that shadow is most of what this whole tier is for.
        // The core is what says "this object is touching the ground" and it wants
        // a hard edge, not a radial gradient from the centre out — a contact
        // shadow under a 4 cm stone is 4 cm of near-solid dark with a millimetre
        // of penumbra. Held flat to 0.3 and then dropped.
        float core = 1.0 - smoothstep( 0.38, 0.74, d );
        float pen = 1.0 - smoothstep( 0.3, 1.0, d );
        // Zeroed at the quad's own boundary as well as radially. A radial
        // falloff on a rectangle reaches zero at 0.9 of the half-width but the
        // corners are at 1.41, so anything that saturates the middle leaves the
        // outline of the quad showing — and a 4 cm decal at 43 per cent is
        // saturated everywhere. The trail came back covered in hard black tiles.
        float box = 1.0 - smoothstep( 0.7, 1.0, max( abs( vUv.x - 0.5 ), abs( vUv.y - 0.5 ) ) * 2.0 );
        float a = clamp( core * 0.86 + pen * 0.32, 0.0, 1.0 ) * vStr * box * vFade;
        // Premultiplied, because that is the only form of MultiplyBlending three
        // implements: the blend resolves to dst * ( 1 - a + a * uShadow ), which
        // is a shadow that can never lift a black or tint a highlight.
        gl_FragColor = vec4( uShadow * a, a );
      }`,
    transparent: true,
    blending: THREE.MultiplyBlending,
    premultipliedAlpha: true,
    depthWrite: false,
    fog: false,
  });

  const shadowMesh = new THREE.Mesh(dg, dMat);
  shadowMesh.name = 'roadStoneShadows';
  shadowMesh.renderOrder = 1;
  shadowMesh.castShadow = false;
  shadowMesh.receiveShadow = false;
  skipAoPrepass(shadowMesh);
  return { stones: stoneMesh, shadows: shadowMesh };
}

// ---------------------------------------------------------------------------
// Standing water.
//
// The one element in the frame that can prove the ground is not a painted
// plane, because it is the only thing that shows a sharp reflection of anything.
// The terrain shader already darkens and cools the dirt where the wetness field
// is high; this is the sheet itself, as its own thin mesh so it can be flat
// while the dirt under it is not.
//
// Each puddle's outline is found by walking outward from its centre until the
// ground rises above the water level, so the silhouette is the depression's own
// contour rather than a disc laid on top of it — which is what stops it reading
// as a decal. The reflection is analytic: at the grazing angles a puddle is seen
// from, what is in it is trunks and the underside of the canopy, and only the
// last few degrees are sky.
// ---------------------------------------------------------------------------

const PUDDLE_RING = 32;

/**
 * The live dome parameter arrays sky.js installs on every stock material's fog
 * uniforms (a Float32Array of four each, shared by reference and rewritten per
 * frame). A ShaderMaterial does not get them, so the water reads them off one
 * ShaderLib entry. Zeros with w = 0 when the sky has not installed its fog, in
 * which case the shader falls back to the fog-colour gradient.
 */
function skyDomeUniform(name) {
  const u = THREE.ShaderLib.lambert?.uniforms?.[name];
  return u && u.value && u.value.length === 4 ? u.value : new Float32Array([0, 0, 0, 0]);
}

/** How many kopje boulders the water hole's reflection carries. */
const WATER_ROCKS = 20;

/**
 * Round 5. Several same-size RGBA8 DataTextures as the layers of one
 * DataArrayTexture, so the terrain material samples them through one unit
 * (`texture( arr, vec3( uv, layer ) )`). The source tiles are built with
 * flipY on, which for a DataTexture is a row flip at upload; a 3D upload does
 * not get that flip on every backend, so it is baked into the layer here and
 * the array is uploaded straight. Wrap, filters and mips as the tiles had.
 */
function packTiles(list, name) {
  const w = list[0].image.width;
  const h = list[0].image.height;
  const row = w * 4;
  const data = new Uint8Array(w * h * 4 * list.length);
  list.forEach((t, i) => {
    if (t.image.width !== w || t.image.height !== h || !t.image.data) throw new Error(`packTiles(${name}): layer ${i} is ${t.image.width}x${t.image.height}`);
    const src = t.image.data;
    const base = i * w * h * 4;
    if (t.flipY) {
      for (let y = 0; y < h; y++) data.set(src.subarray((h - 1 - y) * row, (h - y) * row), base + y * row);
    } else {
      data.set(src, base);
    }
  });
  const arr = new THREE.DataArrayTexture(data, w, h, list.length);
  arr.name = name;
  arr.format = THREE.RGBAFormat;
  arr.type = THREE.UnsignedByteType;
  arr.wrapS = arr.wrapT = THREE.RepeatWrapping;
  arr.magFilter = THREE.LinearFilter;
  arr.minFilter = THREE.LinearMipmapLinearFilter;
  arr.generateMipmaps = true;
  arr.anisotropy = 16;
  arr.flipY = false;
  arr.needsUpdate = true;
  return arr;
}

function buildWater(curve, surfaceInfo, heightAt, sunV) {
  const info = makeScatterInfo();
  const p = new THREE.Vector3();
  const tg = new THREE.Vector3();
  const rnd = mulberry32(0x2b19);

  const sites = [];
  const total = curve.getLength();
  const steps = Math.max(64, Math.round(total / 0.45));
  const lats = [-RUT_C, RUT_C, 0];
  for (let i = 0; i < steps; i++) {
    const u = i / (steps - 1);
    curve.getPoint(u, p);
    curve.getTangent(u, tg).normalize();
    for (const lat of lats) {
      const x = p.x - tg.z * lat;
      const z = p.z + tg.x * lat;
      surfaceInfo(x, z, info);
      if (info.wet < 0.62) continue;
      // Two metres apart, not eighty centimetres. A rut holds water along its
      // whole length, so accepting every local maximum chains the puddles into
      // one continuous ribbon down the trough — which reads as a drainage canal,
      // not as standing water. Discrete pools with dry rut between them is the
      // thing that says "it rained here", so the spacing is the art direction.
      let clash = false;
      for (const s of sites) {
        if ((s.x - x) ** 2 + (s.z - z) ** 2 < 7.3) {
          clash = true;
          break;
        }
      }
      if (clash) continue;
      sites.push({ x, z, y: info.y, wet: info.wet, cap: 0.34 + rnd() * 0.38 });
    }
  }

  // The water hole. Same machinery as a puddle — a sheet at one level, its
  // edge found by marching the ground — at forty times the radius, so the
  // march steps are coarser, the ring has more spokes, and the fade band at
  // the shore is a hand's width rather than a fifth of the radius.
  {
    const floor = heightAt(LAND.hole.x, LAND.hole.z);
    sites.push({
      x: LAND.hole.x,
      z: LAND.hole.z,
      y: floor,
      wet: 1,
      cap: HOLE_BASIN,
      level: floor + HOLE_DEPTH * 0.5,
      // 160 spokes, from 80 (round 4). At 80 the chord on a 6.4 m radius is
      // half a metre — ten pixels from the near shore at sixteen metres — and
      // the far rim's alpha ramp, linear across each quad, drew the waterline
      // as an octogon's worth of straight runs with corners. A shoreline is a
      // contour: 160 spokes put the chord at a quarter metre, under the
      // shallows band's own softness from any framing outside the mud.
      ring: 160,
      step: 0.1,
      // 0.8 of a 6.5 m radius is a 1.3 m shallows band, which is the shore
      // depth fade the critics asked for: the sheet thins over the last metre
      // and a half rather than ending on a line.
      innerF: 0.8,
      hole: true,
    });
  }

  let maxV = 0;
  let maxI = 0;
  for (const s of sites) {
    const ring = s.ring ?? PUDDLE_RING;
    maxV += ring * 2 + 1;
    maxI += ring * 9;
  }
  const pos = new Float32Array(maxV * 3);
  const alpha = new Float32Array(maxV);
  const depth = new Float32Array(maxV);
  const holeF = new Float32Array(maxV);
  const idx = new Uint32Array(maxI);
  let vw = 0;
  let iw = 0;
  let puddles = 0;
  let holeRadius = 0;

  for (const site of sites) {
    const RING = site.ring ?? PUDDLE_RING;
    const step = site.step ?? 0.035;
    // The dish the wetness field cut into the mesh is 2.6 cm at its deepest, so
    // filling to 1.6 cm above the low point leaves a millimetre of margin at
    // the rim and about a centimetre of water in the middle.
    const wy = site.level ?? site.y + 0.016;
    const rim = new Float32Array(RING);
    for (let k = 0; k < RING; k++) {
      const ang = (k / RING) * Math.PI * 2;
      const dx = Math.cos(ang);
      const dz = Math.sin(ang);
      // Capped at 70 cm. A rut holds water along its whole length, so a ray
      // fired down the trough finds no rising ground for metres and the pool
      // stretches into a ribbon — which from a low framing is a shiny slug
      // lying on the road, not standing water.
      let r = step;
      while (r < site.cap) {
        if (heightAt(site.x + dx * (r + step), site.z + dz * (r + step)) > wy - 0.001) break;
        r += step;
      }
      // pulled in slightly and roughened, so the waterline is not a clean curve
      rim[k] = Math.max(0.03, r * (site.hole ? 0.97 + rnd() * 0.02 : 0.86 + rnd() * 0.13));
    }
    // Smoothed around the ring. The ray march quantises in 3.5 cm steps, so two
    // neighbouring spokes routinely differ by a whole step and the outline came
    // out as a saw — a flat-bottomed polygon with a spike off one side, which
    // reads as a torn piece of paper lying on the trail rather than as a water
    // line. A puddle edge is a contour of a smooth surface: it wanders, but it
    // does not have corners. Three-tap circular mean keeps the wander.
    // The hole gets the pass three times over its doubled ring: the march
    // finds the shore on a 0.59 m mesh whose facets cross the water plane
    // as a polyline, and one three-tap on 160 spokes leaves those facet
    // corners in the rim (round 4: the dumped ring ran 6.38, 6.31, 6.23,
    // 6.10, 6.00 m over consecutive spokes, then flattened — bends at the
    // mesh's own pitch, not the wobble's).
    const sm = new Float32Array(RING);
    const passes = site.hole ? 3 : 1;
    let sum = 0;
    for (let pass = 0; pass < passes; pass++) {
      for (let k = 0; k < RING; k++) {
        const a0 = rim[(k + RING - 1) % RING];
        const a2 = rim[(k + 1) % RING];
        sm[k] = rim[k] * 0.5 + (a0 + a2) * 0.25;
      }
      sum = 0;
      for (let k = 0; k < RING; k++) {
        rim[k] = sm[k];
        sum += rim[k];
      }
    }
    const mean = sum / RING;
    // anything smaller than this is a wet speck, and a wet speck with a mirror
    // finish on it is a bright fleck rather than a puddle
    if (mean < 0.13) continue;
    if (site.hole) holeRadius = mean;
    if (site.hole) holeF.fill(1, vw, vw + RING * 2 + 1);

    const centre = vw;
    pos[vw * 3] = site.x;
    pos[vw * 3 + 1] = wy;
    pos[vw * 3 + 2] = site.z;
    alpha[vw] = 1;
    depth[vw] = wy - site.y;
    vw++;
    const inner = vw;
    const innerF = site.innerF ?? 0.78;
    for (let k = 0; k < RING; k++) {
      const ang = (k / RING) * Math.PI * 2;
      const dx = Math.cos(ang);
      const dz = Math.sin(ang);
      const ri = rim[k] * innerF;
      pos[vw * 3] = site.x + dx * ri;
      pos[vw * 3 + 1] = wy;
      pos[vw * 3 + 2] = site.z + dz * ri;
      alpha[vw] = 1;
      depth[vw] = Math.max(0, wy - heightAt(site.x + dx * ri, site.z + dz * ri));
      vw++;
    }
    const outer = vw;
    for (let k = 0; k < RING; k++) {
      const ang = (k / RING) * Math.PI * 2;
      const dx = Math.cos(ang);
      const dz = Math.sin(ang);
      pos[vw * 3] = site.x + dx * rim[k];
      pos[vw * 3 + 1] = wy;
      pos[vw * 3 + 2] = site.z + dz * rim[k];
      alpha[vw] = 0;
      depth[vw] = 0;
      vw++;
    }
    // Wound anticlockwise in x/z, which is *clockwise* seen from above: the ring
    // runs ( cos a, sin a ) so ( A - centre ) x ( B - centre ) comes out as
    // ( 0, -something, 0 ) and the front face points at the ground. Every
    // triangle of every pool was back-face culled — thirty-nine puddles in the
    // buffer, a correct bounding sphere, a compiled program, and not one pixel.
    // Flat opaque magenta with the depth test off still rendered nothing, which
    // is what finally pinned it. Same trap as the shadow quads below.
    for (let k = 0; k < RING; k++) {
      const k1 = (k + 1) % RING;
      idx[iw++] = centre;
      idx[iw++] = inner + k1;
      idx[iw++] = inner + k;
      idx[iw++] = inner + k;
      idx[iw++] = outer + k1;
      idx[iw++] = outer + k;
      idx[iw++] = inner + k;
      idx[iw++] = inner + k1;
      idx[iw++] = outer + k1;
    }
    puddles++;
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos.subarray(0, vw * 3), 3));
  g.setAttribute('aAlpha', new THREE.BufferAttribute(alpha.subarray(0, vw), 1));
  g.setAttribute('aDepth', new THREE.BufferAttribute(depth.subarray(0, vw), 1));
  g.setAttribute('aHole', new THREE.BufferAttribute(holeF.subarray(0, vw), 1));
  g.setIndex(new THREE.BufferAttribute(idx.subarray(0, iw), 1));
  // computeBoundingSphere on an empty attribute leaves a NaN centre behind,
  // which poisons frustum culling for the whole subtree
  if (vw > 0) g.computeBoundingSphere();
  else g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 0);

  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uRipple: { value: rippleMap() },
      uCanopy: { value: horizonReflection() },
      uSunDir: { value: sunV.clone() },
      uSunCol: { value: new THREE.Color(0xffe2c6) },
      // Refreshed every frame from sky.js below, so the sheet reflects the
      // hour's sky rather than the noon one it was authored under. Round 1 had
      // these as constants and the water hole sat pale blue-grey at dusk and
      // at night, brighter than the sky above it.
      uSkyTop: { value: new THREE.Color(0x4c7fb5) },
      uSkyLow: { value: new THREE.Color(0xa8b3ae) },
      // The panorama card's own sky, so its skyline can be re-keyed to the
      // hour: the card is divided by this and multiplied by the live sky, which
      // keeps the acacia and hill silhouettes and throws the noon colour away.
      uCardLow: { value: new THREE.Color(PALETTE.skyHorizon) },
      uCardTop: { value: new THREE.Color(PALETTE.skyTop) },
      // Silt, not water: what a shallow puddle on a dirt track shows where the
      // reflection is weak is the mud at the bottom of it.
      // Silt under the sheet, down with the dirt it is silt from.
      // Laterite clay in suspension: what a water hole shows where the
      // reflection is weak is murky red-brown, not the forest's black silt.
      uBody: { value: new THREE.Color(0.03, 0.021, 0.013) },
      // Off the palette, not a copy of it. This was a hardcoded 0x97a69c, which
      // is the value the airlight had before it was halved in linear — so the
      // puddles were fogging toward a colour half a stop brighter than everything
      // else in the frame and the far ones read as pale patches.
      uFog: { value: new THREE.Color(PALETTE.fogColor) },
      uFogDensity: { value: FOG.density },
      uTime: { value: 0 },
      // Round 5: the dome itself, for the hole's reflection. sky.js writes
      // the displayed dome's parameters into every stock material's fog
      // uniforms each frame (horizon, zenith, haze band, anti-solar, aureole,
      // key direction); the arrays are shared by reference, so reading them
      // off one ShaderLib entry here is reading the live values. A
      // ShaderMaterial gets none of them by itself.
      uSkyHor: { value: skyDomeUniform('uSkyHor') },
      uSkyZen: { value: skyDomeUniform('uSkyZen') },
      uSkyHaze: { value: skyDomeUniform('uSkyHaze') },
      uSkyAnti: { value: skyDomeUniform('uSkyAnti') },
      uSkySun: { value: skyDomeUniform('uSkySun') },
      uSkyDir: { value: skyDomeUniform('uSkyDir') },
      // Round 5: the kopje in the water. The panorama card is a painted
      // skyline and knows nothing about the outcrop twenty metres behind the
      // hole, and there is no reflection pass at `fast`, so the pool never
      // showed the one thing standing over it. The boulders are ellipsoids
      // (forest.js builds them from a unit icosahedron under an instance
      // matrix), so the reflected ray is intersected with the nearest of
      // them analytically: each rock is a mat4 taking world space to its own
      // unit sphere, read off the instanced meshes once the scene is up
      // (below). Twenty rocks, hole pixels only, no draw call, no texture.
      uRockInv: { value: Array.from({ length: WATER_ROCKS }, () => new THREE.Matrix4()) },
      uRockCol: { value: Array.from({ length: WATER_ROCKS }, () => new THREE.Vector4()) },
      uRockN: { value: 0 },
      // Round 6: the kopje's own albedo tile, read off the instanced mesh's
      // material with the matrices, so a reflected boulder carries the
      // granite's speckle and not one flat shade per ellipsoid (the round-5
      // critics' "smooth dark domes" at 1280). One more sampler on this
      // program — three, against the terrain's thirteen — and no draw call.
      // uRockMean is the tile's mean in linear, so the tile modulates the
      // shade about unity and the matched value the shade was tuned to holds.
      uRockMap: { value: null },
      uRockMean: { value: new THREE.Vector3(1, 1, 1) },
      uRockTex: { value: 0 },
      // 1 writes the reflected-boulder mask (hit = white) for measurement.
      uWaterDebug: { value: 0 },
    },
    vertexShader: /* glsl */ `
      attribute float aAlpha;
      attribute float aDepth;
      attribute float aHole;
      varying vec3 vWorld;
      varying float vAlpha;
      varying float vDepth;
      varying float vHole;
      void main() {
        vec4 wp = modelMatrix * vec4( position, 1.0 );
        vWorld = wp.xyz;
        vAlpha = aAlpha;
        vDepth = aDepth;
        vHole = aHole;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D uRipple, uCanopy, uRockMap;
      uniform vec3 uSunDir, uSunCol, uSkyTop, uSkyLow, uBody, uFog, uCardLow, uCardTop, uRockMean;
      uniform float uFogDensity, uTime, uRockTex, uWaterDebug;
      uniform vec4 uSkyHor, uSkyZen, uSkyHaze, uSkyAnti, uSkySun, uSkyDir;
      uniform mat4 uRockInv[ ${WATER_ROCKS} ];
      uniform vec4 uRockCol[ ${WATER_ROCKS} ];
      uniform int uRockN;
      varying vec3 vWorld;
      varying float vAlpha;
      varying float vDepth;
      varying float vHole;
      // The dome in a world direction — the same gradient sky.js draws and
      // fogs everything to (its fog chunk, minus the disc, clouds and stars),
      // in scene-linear radiance, which is what this material writes.
      vec3 skyDome( vec3 d ) {
        vec3 w = vec3( d.x, max( d.y, 0.0 ), d.z );
        w /= max( length( w ), 1e-4 );
        float h = w.y;
        float c = clamp( dot( w, uSkyDir.xyz ), -1.0, 1.0 );
        float hz = exp( -h * uSkyZen.w );
        float side = smoothstep( -1.0, 1.0, c );
        vec3 s = mix( uSkyHor.rgb, uSkyZen.rgb, pow( h, uSkyHor.w ) );
        s = mix( s, uSkyHaze.rgb, hz * 0.52 * mix( 1.0, 0.5 + 0.5 * side, uSkyHaze.w ) );
        s = mix( s, uSkyHaze.rgb, hz * side * uSkySun.w );
        s = mix( s, uSkyAnti.rgb, pow( max( -c, 0.0 ), 2.5 ) * hz * uSkyAnti.w );
        s += uSkySun.rgb * pow( max( c, 0.0 ), 6.0 ) * ( 0.35 + hz * 0.9 );
        return s;
      }
      void main() {
        vec3 toCam = cameraPosition - vWorld;
        float dist = length( toCam ) + 1e-4;
        vec3 V = toCam / dist;

        // Two slow scales only. A fine ripple under a mirror finish is not a
        // sheen, it is a field of hard white glints — which is exactly the snow
        // speckle this whole surface started out with.
        vec2 r1 = texture2D( uRipple, vWorld.xz * 0.85 + vec2( 0.013, 0.007 ) * uTime ).xy * 2.0 - 1.0;
        vec2 r2 = texture2D( uRipple, vWorld.xz * 2.3 - vec2( 0.004, 0.011 ) * uTime ).xy * 2.0 - 1.0;
        // 0.075 was enough tilt to scatter the reflected ray by four degrees,
        // which broke the canopy image into a field of unrelated bright specks —
        // glitter, not water. A puddle in still air under trees is very nearly a
        // mirror; the ripple is here to give the sheen an edge to catch on, not
        // to disturb the image.
        // The water hole is flagged per vertex — keying it off depth left the
        // shore, where the depth runs out, as a ring of puddle-mirror round a
        // murky pool. Open water in a wind carries real ripples, and a mirror
        // the size of a tennis court with nothing to break it read as a blue
        // enamel disc.
        float hole = vHole;
        // 0.022 on the hole, from 0.11 then 0.08. From a standing camera the
        // reflected ray leaves at five to ten degrees, and the whole skyline
        // in the card — hills, grass line, acacias — lives in the first eight
        // degrees of it. A 0.08 tilt swings the ray by nine, so every pixel of
        // the sheet sampled a different row of that band and the average was
        // a featureless pale grey: the disc. At 0.022 the skyline wobbles but
        // it is there, which is the difference between water and a plate.
        vec2 slope = ( r1 * 0.7 + r2 * 0.3 ) * mix( 0.03, 0.022, hole );
        vec3 N = normalize( vec3( slope.x, 1.0, slope.y ) );

        vec3 R = reflect( -V, N );
        float up = clamp( R.y, -1.0, 1.0 );
        float az = atan( R.z, R.x + 1e-6 ) * 0.15915494 + 0.5;
        // The card covers the whole upward hemisphere, near enough linearly.
        // Compressing it into the first eighteen degrees was the reason the
        // puddles read as flat grey discs: a puddle three metres from a standing
        // camera reflects a ray going up at about thirty degrees, which saturated
        // the lookup at its top row, so every pixel of every puddle sampled the
        // sky and none of them sampled a tree. Twenty metre conifers eight metres
        // away fill everything up to sixty degrees.
        float upC = clamp( max( up, 0.0 ), 0.004, 0.996 );
        vec3 card = texture2D( uCanopy, vec2( az, upC ) ).rgb;
        // Round 4. The card is 512 texels round and its crowns are painted
        // as a hard mask, so from sixteen metres — where the hole spans some
        // forty degrees of azimuth over three hundred pixels — every crown
        // and ridge in the reflection was a run of 5 x 2 pixel blocks, and
        // that stepped skyline lying in the water is what read as a stepped
        // shore. Open water in a wind does not hold a hard image: four taps
        // at ±0.8 texel, on the hole only, are a two-and-a-half texel tent
        // over the bilinear — the crowns are still there, without corners.
        // The puddles keep the single tap; their reflections are a metre
        // away and want the edge.
        if ( hole > 0.5 ) {
          vec2 cpx = vec2( 0.8 / 512.0, 0.8 / 192.0 );
          card = ( texture2D( uCanopy, vec2( az + cpx.x, upC + cpx.y ) ).rgb +
                   texture2D( uCanopy, vec2( az - cpx.x, upC + cpx.y ) ).rgb +
                   texture2D( uCanopy, vec2( az + cpx.x, upC - cpx.y ) ).rgb +
                   texture2D( uCanopy, vec2( az - cpx.x, upC - cpx.y ) ).rgb ) * 0.25;
        }
        // The card was painted under the noon sky. Divide its own sky back out
        // and put the hour's in, so what survives of it is the skyline — the
        // acacias and the hill line as a darkening — and not its colour.
        // Re-keyed by luminance only. A per-channel ratio compounded the card's
        // grey-blue hills against its warm horizon and the hour's blue zenith,
        // and the hole came out cobalt — the skyline is a darkening pattern
        // laid over the hour's sky, and that is all it is allowed to carry.
        vec3 cardSky = mix( uCardLow, uCardTop, smoothstep( 0.02, 0.85, upC ) );
        const vec3 LUMA = vec3( 0.2126, 0.7152, 0.0722 );
        float key = clamp( dot( card, LUMA ) / max( dot( cardSky, LUMA ), 1e-3 ), 0.0, 1.1 );
        // Round 5: over the hole the card's skyline is a darkening of no more
        // than a fifth. From the pride camera the reflected ray leaves at
        // three to four degrees, which is the card's painted hill line and
        // its acacias, and their key ran 0.4–0.6 — so the sheet reflected a
        // range a stop darker than the one the far mesh now draws at 0.8 of
        // the sky, and measured 0.74 of the sky over it against a target of
        // ±0.3 st. Real hills in that much air are 0.8 of the sky; the trees
        // and the grass line on a sheet ruffled by wind are a softening, not
        // a silhouette.
        key = mix( key, max( key, 0.78 ), hole );
        // The sky leaves the horizon band fast: measured against the camp
        // framing, four degrees up it is already half way to blue-grey and by
        // seven it is most of the way. A smoothstep to 0.7 kept the whole of
        // the sheet's reflection — rays at three to ten degrees — inside the
        // cream band, and a cream sheet on cream sand is the sand read. A
        // cubic knee puts the ray at six degrees a third of the way to the
        // zenith colour, which is the cool grey a pool has against dirt.
        float skyT = 1.0 - pow( 1.0 - clamp( up / 0.6, 0.0, 1.0 ), 3.0 );
        vec3 sky = mix( uSkyLow, uSkyTop, skyT );
        // Round 5: over the hole the reflection is the dome itself, sampled
        // along the reflected ray, not the fog colour pulled toward a guessed
        // zenith. From the pride camera the ray leaves at 8–15 degrees, where
        // the displayed sky is already well off the horizon band — a cooler,
        // darker blue-grey than the fog colour, which is the band. Measured
        // before this (\`lion_pride\`): pool 0.57 st under the sky it should
        // mirror, 0.03 st from the mud beside it. The puddles keep the card.
        if ( uSkyDir.w > 0.5 ) sky = mix( sky, skyDome( R ), hole );
        vec3 refl = mix( card, sky * key, hole );
        // The kopje (round 5): nearest boulder the reflected ray meets. The
        // ray is taken from the sheet at the unrippled surface's reflection
        // plus the ripple's tilt, so the outcrop wobbles as the skyline does.
        float rockHit = 0.0;
        if ( hole > 0.5 && R.y > 0.0 ) {
          float rockT = 1e9;
          vec3 rockShade = vec3( 0.0 );
          vec2 rockUv = vec2( 0.0 );
          // Round 6: the rock test runs on a ray tilted by three times the
          // ripple the sky's image already carries. The sky's reflection
          // wobbles with the sheet; the boulders' did not, so every one had
          // a clean elliptical rim standing still in moving water (critic C,
          // 1280). A boulder's image is broken by the same ripple, more so —
          // it is the dark shape the ripple is seen against.
          vec3 Rj = normalize( R + vec3( slope.x, 0.0, slope.y ) * 3.0 );
          for ( int i = 0; i < ${WATER_ROCKS}; i ++ ) {
            if ( i >= uRockN ) break;
            vec3 o = ( uRockInv[ i ] * vec4( vWorld, 1.0 ) ).xyz;
            vec3 d = ( uRockInv[ i ] * vec4( Rj, 0.0 ) ).xyz;
            float a = dot( d, d );
            float b = dot( o, d );
            float c = dot( o, o ) - 1.0;
            float disc = b * b - a * c;
            if ( disc <= 0.0 ) continue;
            float t = ( -b - sqrt( disc ) ) / a;
            if ( t <= 0.0 || t >= rockT ) continue;
            rockT = t;
            // the ellipsoid's normal is the inverse-transpose of its local one
            vec3 nl = o + d * t;
            vec3 nw = normalize( ( transpose( uRockInv[ i ] ) * vec4( nl, 0.0 ) ).xyz );
            // Lit granite: keyed the way the rock itself renders — a third of
            // the horizon sky on every face, the key's colour at unit strength
            // on the faces toward it. Matched to the outcrop on screen: its
            // sunlit faces at 0.45 linear, its undersides at 0.03–0.05, and
            // the reflection sees mostly undersides, so it is a dark shape on
            // the sky's image, as a rock over water is.
            float ndl = max( dot( nw, uSunDir ), 0.0 );
            rockShade = uRockCol[ i ].rgb * ( uSkyHor.rgb * 0.35 + uSunCol * ndl );
            // The tile is wrapped round the ellipsoid's own unit sphere —
            // longitude and latitude of the local hit, three repeats round,
            // offset per rock — so the grain rides with the rock and not
            // with the sheet, and two rocks do not share a speckle.
            vec3 nn = normalize( nl );
            rockUv = vec2( atan( nn.z, nn.x ) * 0.15915494 + 0.5, asin( clamp( nn.y, -1.0, 1.0 ) ) * 0.31830989 + 0.5 ) * vec2( 3.0, 1.5 ) + uRockCol[ i ].w;
          }
          if ( rockT < 1e8 ) {
            rockHit = 1.0;
            // The granite's own value variation, about unity. The tile's
            // contrast is what separates a boulder from a dome, so it is
            // taken slightly over unity: the reflection is seen through a
            // ruffled surface that softens whatever is in it.
            // Three mips up from what the derivatives pick. The wrap puts
            // three tile repeats round a boulder that is 100–200 px across at
            // 1280, so the automatic level is 3–4 — a tile blurred ten texels
            // wide, which is the mean with a slow drift on it, and the first
            // cut of this measured no more high-frequency variation inside
            // the reflected mask than the flat shade had (0.201 → 0.203 of
            // the mean). The bias brings the speckle back at about the pixel;
            // the ripple over it takes the sparkle.
            vec3 grain = texture2D( uRockMap, rockUv, -3.0 ).rgb / max( uRockMean, vec3( 1e-3 ) );
            rockShade *= mix( vec3( 1.0 ), pow( grain, vec3( 1.6 ) ), uRockTex );
            refl = rockShade;
          }
        }
        // Only the last few degrees before the zenith are actually open.
        refl = mix( refl, sky, smoothstep( 0.86, 0.99, up ) );
        // The sun's own disc, and only that. At 1.6 the lobe bloomed across the
        // whole sheet and took the canopy image with it — the puddle came back a
        // field of white streaks, which is the one thing worse than a grey disc.
        float gl = pow( max( dot( R, uSunDir ), 1e-4 ), 520.0 );
        refl += uSunCol * gl * 0.85;

        // Water is a dielectric: 2 per cent straight on, near total at a
        // glancing angle. A puddle read from standing height is almost all
        // reflection, and that is the whole reason it is here.
        // A textbook 0.02 + 0.98 * ( 1 - cosT )^5 gives six per cent reflectance
        // at the sixty degrees a puddle three metres from a standing camera is
        // actually seen at, and six per cent of a dark treeline over near-black
        // silt is a scorch mark on the trail — which is exactly how the puddles
        // measured. Real standing water on a track is a centimetre deep over
        // suspended clay, so most of what does not reflect comes straight back
        // off the silt rather than being lost; a cubic falloff with a tenth of a
        // floor puts the reflection at a fifth straight down and nearly all of
        // it at a glance, which is the read.
        float f = clamp( dot( N, V ), 0.0, 1.0 );
        // A 0.2 floor leaves nearly two thirds of the pool showing the silt at the
        // squat angles these framings use, and the silt is near-black — so the
        // reflection was a third of a dark image and the pool read as a hollow
        // rather than as a surface. What a shallow puddle over clay does is send
        // most of the transmitted light straight back out again, so the honest
        // lumped figure is much closer to the reflection than a bare Fresnel term
        // suggests.
        float fres = clamp( 0.42 + 0.58 * pow( 1.0 - f, 3.0 ), 0.0, 1.0 );
        vec3 body = uBody * ( 0.35 + clamp( 1.0 - vDepth * 26.0, 0.0, 1.0 ) * 1.3 );
        // The water hole is half a metre of laterite clay in suspension: what
        // shows through is the murk itself, khaki-brown and fairly bright, not
        // the black silt floor a puddle has a centimetre down. It takes less of
        // the reflection — turbid water scatters most of what goes in straight
        // back out, unpolarised — and what it does reflect is the sky through
        // dust, so the saturated zenith blue is pulled toward the horizon grey.
        // Round 1's version mixed the reflection more than half way to a flat
        // pale grey and let a bright khaki murk through at a 0.16 floor, and the
        // hole rendered as a pale disc brighter than the sky it stood under.
        // Now: the deep water is dark — clay in suspension absorbs, it does not
        // glow — and lightens to the murk only over the shallows, so the
        // shore has a depth gradient; the reflection is the hour's sky through
        // the card's skyline, undiluted; and the Fresnel is the dielectric
        // curve with a small turbidity floor, which at the ten-to-fifteen
        // degree grazing angle a standing camera sees the hole at comes to a
        // third — the sky, darkened, with the mud showing through.
        // The deep colour is a dark olive-brown, not black: seen from above
        // (the plan probe) a 0.014 floor rendered the sheet as a tar disc,
        // and half a metre of clay water is opaque *brown*, whatever the angle.
        // ...and not tar either: at 0.03 the sheet from a raised camera was a
        // black dish with a soft rim, a hollow rather than a surface. Half a
        // metre of laterite water is a khaki brown around a tenth.
        vec3 murk = mix( vec3( 0.15, 0.12, 0.07 ), vec3( 0.085, 0.07, 0.042 ), smoothstep( 0.05, 0.45, vDepth ) );
        body = mix( body, murk, hole );
        // 0.62 of the dielectric curve, not all of it: a ruffled, turbid sheet
        // never reaches a mirror's grazing reflectance, and at the full curve
        // the hole from thirty metres was 85 per cent of the horizon sky's
        // value — a pale sheet a shade under the sky, still a plate. At 0.62
        // it sits at about two thirds of the sky, with the murk showing.
        // Round 5: 0.25 + 0.75 (1 - f)^3, from 0.08 + 0.62 (1 - f)^5. At the
        // pride camera's grazing angle (f ≈ 0.25) the fifth power gave 0.23
        // — three quarters of every pixel was murk, and the pool measured
        // 0.03 st from the mud beside it. A pool seen at 15 degrees reflects
        // most of what it is looking at, turbid or not: 0.25 + 0.75 · 0.42 =
        // 0.57 here, 0.25 straight down, where the murk is the picture.
        fres = mix( fres, clamp( 0.25 + 0.75 * pow( 1.0 - f, 3.0 ), 0.0, 1.0 ), hole );
        vec3 col = mix( body, refl, fres );
        // Waterline. Where the sheet thins to nothing the reflection goes with
        // it and what is left is saturated mud, so the darkest ring of a puddle
        // is its own margin. Without this the pool has a soft outer taper and a
        // uniform interior, which is the silhouette of a bare patch — and the
        // hard dark line against the lit dirt outside is most of what makes a
        // puddle read as a surface with an edge rather than as a stain.
        col *= mix( 0.6, 1.0, smoothstep( 0.0, 0.55, vAlpha ) );

        float fogFactor = 1.0 - exp( -uFogDensity * uFogDensity * dist * dist );
        col = mix( col, uFog, fogFactor );
        // The hole's shallows: the sheet goes to nothing over the last metre
        // and a half as a smooth ramp, so the wet mud under it shows through a
        // thinning film rather than meeting a line.
        float holeA = smoothstep( 0.0, 1.0, vAlpha ) * 0.97;
        float a = clamp( mix( vAlpha * ( 0.62 + fres * 0.5 ), holeA, hole ), 0.0, 1.0 );
        if ( uWaterDebug > 0.5 ) { col = vec3( rockHit ); a = 1.0; }
        gl_FragColor = vec4( max( col, 0.0 ), a );
      }`,
    transparent: true,
    depthWrite: false,
    fog: false,
  });

  const mesh = new THREE.Mesh(g, mat);
  mesh.name = 'roadWater';
  mesh.renderOrder = 2;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.userData.count = puddles;
  mesh.userData.holeRadius = holeRadius;
  // What the sheet reflects follows the hour. sky.js owns the rig and exposes
  // the horizon colour and the sun direction for the current mode; the scene
  // fog colour is the airlight it has already set. The zenith is not exposed,
  // so it is taken as the horizon pulled toward blue at the ratio the day and
  // dusk rigs share — the sheet is almost all horizon band from a standing
  // camera, so that is a small approximation on a small part of the image.
  // Desaturated on purpose: the sheet is seen at a grazing angle and the
  // reflected ray never gets far above the horizon band, so the zenith only
  // has to cool and darken the top of the blend, not turn it cobalt.
  // Measured off the rendered sky: seven degrees over the horizon it sits at
  // 0.34/0.55/1.0 of the band. The sheet's gradient reaches this by thirty.
  const zenithK = new THREE.Color(0.34, 0.55, 1.0);
  skipAoPrepass(mesh, () => {
    mat.uniforms.uTime.value = performance.now() * 0.001;
    mat.uniforms.uSunDir.value.copy(sunDirection());
  });
  // The kopje's boulders, read off the scene once it is up. forest.js builds
  // each kopje as instanced meshes named `kopje_<k>` over a unit-diameter
  // icosahedron flattened in y by the style (slab a third, boulder 0.82), so
  // an instance matrix times that flattening, inverted and scaled by two, takes
  // the world to the rock's unit sphere. The nearest twenty to the hole inside
  // forty-five metres are kept; anything further is under the ripple.
  let rockScans = 0;
  const _rm = new THREE.Matrix4();
  const _rs = new THREE.Matrix4();
  const _rp = new THREE.Vector3();
  const _rc = new THREE.Color();
  const scanRocks = (scene) => {
    const hx = LAND.hole.x;
    const hz = LAND.hole.z;
    const found = [];
    scene.traverse((o) => {
      if (!o.isInstancedMesh || !/^kopje_(\d)/.test(o.name)) return;
      const k = Number(o.name.slice(6, 7));
      const flat = k === 2 ? 0.34 : 0.82;
      // Round 6: the boulders' albedo tile, for the grain in the reflection.
      // The same texture object the rocks draw with — no copy, no upload.
      const rockMap = o.material?.map;
      if (rockMap && !mat.uniforms.uRockMap.value) {
        mat.uniforms.uRockMap.value = rockMap;
        mat.uniforms.uRockMean.value.copy(texMeanLinear(rockMap));
        mat.uniforms.uRockTex.value = 1;
      }
      o.updateMatrixWorld(true);
      for (let i = 0; i < o.count; i++) {
        o.getMatrixAt(i, _rm);
        _rm.premultiply(o.matrixWorld);
        _rp.setFromMatrixPosition(_rm);
        const d = Math.hypot(_rp.x - hx, _rp.z - hz);
        if (d > 45) continue;
        if (o.instanceColor) _rc.fromBufferAttribute(o.instanceColor, i);
        else _rc.set(1, 1, 1);
        // 0.44, from 0.5 (round 6): rockGeo scales its unit icosahedron by
        // 0.7–1.45 per vertex (mean 1.07), so the 0.5 ellipsoid was the
        // rock's outer hull and read as a dome standing proud of the
        // boulder over it; a shade under the mean radius keeps the mass and
        // lets the ripple jitter break the rim into the lumps.
        found.push({ d, m: _rm.clone().multiply(_rs.makeScale(0.44, 0.44 * flat, 0.44)), c: _rc.clone() });
      }
    });
    found.sort((a, b) => a.d - b.d);
    const n = Math.min(found.length, WATER_ROCKS);
    for (let i = 0; i < n; i++) {
      mat.uniforms.uRockInv.value[i].copy(found[i].m).invert();
      // granite under a dusting of the same laterite as everything else; w is
      // the rock's own offset into the albedo tile
      mat.uniforms.uRockCol.value[i].set(0.5 * found[i].c.r, 0.45 * found[i].c.g, 0.4 * found[i].c.b, i * 0.377);
    }
    mat.uniforms.uRockN.value = n;
    return n;
  };
  mesh.onBeforeRender = ((prev) => (renderer, scene, camera, geometry, material) => {
    // Until the kopje is in the scene — forest.js builds in chunks and the
    // outcrop can land minutes after the water on a slow boot — look for it
    // every ninety frames. Six tries was not enough: the pool booted without
    // its reflection in one capture out of three.
    // Capped at forty scans (a minute) so a scene without a kopje does not
    // walk the graph every ninety frames for the rest of the session.
    if (mat.uniforms.uRockN.value === 0 && rockScans < 40 && (rockScans === 0 || renderer.info.render.frame % 90 === 0)) {
      rockScans++;
      scanRocks(scene);
    }
    if (scene.fog?.color) {
      // The scene fog colour *is* the hour's horizon band — sky.js builds it
      // as horizonOf(sky) for every rig — and it is what the far ground and
      // the sky meet in, so it is what the sheet should mirror. horizonColor()
      // was tried first and came back a greener grey than the sky actually
      // renders at the horizon (0.39/0.45/0.42 against the fog's
      // 0.43/0.41/0.39 at noon), which put a green cast on the pool.
      mat.uniforms.uFog.value.copy(scene.fog.color);
      mat.uniforms.uSkyLow.value.copy(scene.fog.color);
      mat.uniforms.uSkyTop.value.copy(scene.fog.color).multiply(zenithK);
    }
    if (scene.fog?.density !== undefined) mat.uniforms.uFogDensity.value = scene.fog.density;
    prev(renderer, scene, camera, geometry, material);
  })(mesh.onBeforeRender);
  return mesh;
}

// ---------------------------------------------------------------------------
// The far hills.
//
// A square annulus from the terrain's edge out to a kilometre and a half, on
// the same height function, so the horizon is the same ground carried on
// rather than a painted ring. Geometric spacing: 18 m cells against the inner
// edge, 160 m at the outside, where the fog has most of the pixel anyway. Two
// thousand vertices and one draw call.
//
// It sits 1.8 m under the surface out to 400 m. The forest's own skirt covers
// that range and two meshes on one height field interleave unless one is
// kept clear under the other; if the skirt goes, the drop is hidden behind
// the terrain's lip from any camera inside the square.
//
// Round 4. It was 0.6 m, and that was the orange strip under the hills in
// the pride framings. Measured along the `lion_far` sight line: the skirt's
// rings are 3–50 m apart and this mesh's cells 16–40 m across in the same
// range, both linearly interpolating a surface that carries a 48 m swell of
// ±1.3 m and the water hole's basin — so over the basin (r = 190–350 m) this
// mesh's chords ran 0.3–0.9 m *above* the skirt (far −0.69 against skirt
// −1.27 at r = 214; −0.08 against −0.40 at 317) and its lit straw showed
// through the skirt as a saturated band (luma 0.50–0.55, sat 0.5–0.6) with
// the interleave edges as dark streaks in it. Hiding the skirt changed
// nothing, which is why it was read as ground past the skirt; hiding this
// mesh removed it. 1.8 m clears the worst chord by 0.9 m. What the skirt's
// outer edge then stands over is hidden behind that edge from any camera
// inside the square until the mesh has climbed back to the surface by 620 m.
// ---------------------------------------------------------------------------

function buildFarHills(env) {
  const INNER = 146;
  const OUTER = 1500;
  const STEPS = 22;
  const coords = [];
  for (let i = STEPS; i >= 0; i--) coords.push(-INNER * Math.pow(OUTER / INNER, i / STEPS));
  for (let i = 0; i <= STEPS; i++) coords.push(INNER * Math.pow(OUTER / INNER, i / STEPS));
  const N = coords.length;
  const pos = new Float32Array(N * N * 3);
  const uv = new Float32Array(N * N * 2);
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      const x = coords[i];
      const z = coords[j];
      const r = Math.hypot(x, z);
      const drop = 1.8 * (1 - smoothstep(400, 620, r));
      const k = j * N + i;
      pos[k * 3] = x;
      pos[k * 3 + 1] = baseHeight(x, z) - drop;
      pos[k * 3 + 2] = z;
      uv[k * 2] = x / 90;
      uv[k * 2 + 1] = z / 90;
    }
  }
  const idx = [];
  for (let j = 0; j < N - 1; j++) {
    for (let i = 0; i < N - 1; i++) {
      // the one cell the terrain itself fills
      if (i === STEPS && j === STEPS) continue;
      const a = j * N + i;
      const b = a + 1;
      const c = a + N + 1;
      const d = a + N;
      idx.push(a, d, b, b, d, c);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  g.computeBoundingSphere();
  // Two tones, by height. The plain carries on at the near ground's level so
  // the forest's straw skirt runs into it without a line; the hills go dark.
  // Under a 9.4 sun through ACES any albedo above about a sixth tone-maps to
  // the same pale sand — measured: a 0.16–0.28 crest tint rendered the exact
  // gold of the haze band, a 0.02 tint rendered a grey-brown escarpment in
  // haze, which is the picture. Isolated by ablation: not the environment
  // map, not the fog, not the ridge cards — the albedo. So the scrub slopes
  // sit at a twentieth, which is what dark bush seen edge-on at a kilometre
  // is, and the haze mix below is what lifts them.
  //
  // The tone is keyed off height *per fragment*, not per vertex: the cells out
  // here are 60–160 m across, and a vertex tint interpolated over one of them
  // put a golden skirt a hundred metres tall under every hill — the plain's
  // colour smeared up the flank. Off the interpolated world height the band is
  // the fifteen metres it is written as.
  // Lambert, not Standard. Every ablation on the pale crests — the map, the
  // fog, the ridge cards, the environment term — left one thing standing: a
  // Standard material at roughness 1 still puts a 4 per cent dielectric
  // specular on the key, and under a 9.4 sun that is a tenth of a stop of
  // light that does not scale with albedo. On a slope keyed at a twentieth it
  // was most of the light, which is why no tint ever got the crests under the
  // sky. Diffuse only: what a dry scrub hillside is at a kilometre.
  const mat = new THREE.MeshLambertMaterial({
    map: farGroundMap(),
    dithering: true,
  });
  void env;
  const hillUniforms = {
    // The same macro tile the ground reads, at a 460 m period, for the
    // two-tone variation the critics asked for on the mid hills. Its r and a
    // channels are two unrelated slow fields, which is exactly right here:
    // one is a value shift, the other a warmth shift, and the slopes stop
    // being one khaki.
    uHillMacro: { value: macroVariation() },
    // 1 the sky over the ridge the chunk keys to, 2 the air, 3 the fog fraction, 4 hillK,
    // 5 the shade side, 6 distance / 1000, 7 the lit value before the air,
    // 8 the floor off, 9 both guards off, 10 the floor's key
    uHillDebug: { value: 0 },
    // Round 6: the dome's cirrus and glow, for the over-ridge sky sample —
    // sun colour + cloud amount, cloud colour + glow. Zero until the sky
    // mesh is found (below), which leaves the sample the clear gradient.
    uHillSky: { value: new THREE.Vector4(0, 0, 0, 0) },
    uHillCloud: { value: new THREE.Vector4(0, 0, 0, 0) },
    // Round 6: x is the over-ridge sample's elevation over the ray, in
    // direction units — 11/360 of the camera's vertical field of view, the
    // middle of the critics' sky window (rows −18..−4 over the ridge, on a
    // 360-row frame). Set per frame from the camera (below); 0.012 until then.
    uHillView: { value: new THREE.Vector4(0.012, 0, 0, 0) },
  };
  mat.userData.hillUniforms = hillUniforms;
  // The dome's own value noise (sky.js `hash` / `noise` / `fbm`, verbatim), so
  // the cirrus the sample evaluates is the cirrus the dome draws.
  const HILL_NOISE = `
    float hillHash( vec2 p ) { return fract( sin( dot( p, vec2( 127.1, 311.7 ) ) ) * 43758.5453123 ); }
    float hillNoise( vec2 p ) {
      vec2 i = floor( p ), f = fract( p );
      vec2 u = f * f * ( 3.0 - 2.0 * f );
      return mix( mix( hillHash( i ), hillHash( i + vec2( 1, 0 ) ), u.x ),
                  mix( hillHash( i + vec2( 0, 1 ) ), hillHash( i + vec2( 1, 1 ) ), u.x ), u.y );
    }
    float hillFbm( vec2 p ) {
      float v = 0.0, a = 0.5;
      for ( int i = 0; i < 5; i ++ ) { v += a * hillNoise( p ); p *= 2.03; a *= 0.5; }
      return v;
    }
    uniform vec4 uHillSky, uHillCloud, uHillView;`;
  // The scene fog is authored for the plain — a sand-coloured airlight at a
  // density that has the ground three quarters gone by six hundred metres,
  // which is right for a flat horizon and wrong for anything standing above
  // it: fogged to the haze band's own colour with a hard silhouette against
  // the blue over it, the hills were dunes whatever they were made of. So they
  // take the scene's fog *colour*, which follows the hour, at their own rate:
  // never more than a third of the way in by the crests, and then straight to
  // the airlight over the last seventy metres before the far plane, where the
  // stock fog would otherwise have cut them off with a wall. A third, not
  // three fifths: the airlight is bright and the tone curve is already on its
  // shoulder there, so a 58% blend of near-black into it measured on screen
  // as brighter than the sky above the crests — which is the dune read again,
  // from the other side. Hills in haze are lighter than they are; they are
  // never lighter than the sky they stand against.
  // Round 2. Three things changed here, all on the critics' "hills clip toward
  // white and fight the sky" item:
  //
  //   - The plain tint is down from 0.74 to 0.56. The far plain is lit by the
  //     same 9.4 key as the near ground but carries none of the near ground's
  //     level cut or occlusion, so at 0.74 it rendered a good stop brighter
  //     than the dirt in the foreground — and a plain brighter than the ground
  //     you are standing on is the "white band" read. The forest's straw skirt
  //     covers this mesh to 420 m and is 40 per cent fogged by then, so the
  //     join is a soft value step under haze, not a line.
  //   - The haze runs to 0.62 by the crests rather than a third, and it goes
  //     toward the *sky's* horizon — fogColor is horizonOf(sky) by
  //     construction, cooled a little further for the blue the air in front of
  //     a dark hill scatters. With the lit value held under the haze colour
  //     (the cap in the fog chunk) the crests cannot come out lighter than
  //     the sky they stand against at any hour, and the crest tint can sit at
  //     a real scrub value (0.06) instead of a floor under a highlight.
  //   - Two-tone macro variation, ±14 per cent in value and a warmth shift,
  //     at a 460 m period, so the mid hills are not one khaki.
  //   - The wall no longer goes all the way to the airlight. At 100 per cent
  //     the escarpment past 780 m rendered as a cream cut-out of hill shape
  //     standing above the darker nearer slopes — brighter than the blue-grey
  //     sky over it, which is the "pale band with mesas in it" in the rear and
  //     camp framings once the ridge cards were gone. Capped at 0.86 and
  //     cooled, the far crests keep a seventh of their own dark and sit just
  //     under the horizon band, which is where a range at thirty kilometres
  //     sits in real air.
  //   - The flat takes the plain's fog. The slow rate was applied to the whole
  //     mesh, so the far plain between the forest's skirt (40 per cent fogged
  //     at 420 m) and the hill foot sat in clearer air than the ground in
  //     front of it and rendered as a lit cream band under every hill — the
  //     actual "white band" in the rear and camp frames. Now the scene's own
  //     fog chunk runs first, its factor is kept for the flat, and only what
  //     stands above the plain (the same height key as the tint) is held back
  //     to the slow rate. Same rule for the scrub domes, which stand on slopes
  //     by construction.
  // Round 3, after the sky's fog chunk started converging every material on
  // the dome itself: the hand-built air (fogColor, cooled by elevation) is
  // gone and the air is the chunk's own `hzCol` under one flat tone; the flat
  // is back on the plain's fog entirely; the flat's tint is down again, to
  // meet the near ground, and falls off with distance; the mesh past 860 m is
  // folded onto a sphere instead of being cut by the far plane. The notes
  // above stand as the record of why each piece is where it is.
  const hazeChunk = (hillKExpr, airScale = '1.0') => {
    const stock = THREE.ShaderChunk.fog_fragment;
    // the sky's patched chunk carries the view vector and a lit-dust colour;
    // stock fog only the depth and the flat colour
    const patched = stock.includes('hzDist');
    const dist = patched ? 'hzDist' : 'vFogDepth';
    const air = patched ? 'hzCol' : 'fogColor';
    const blend = `
      float hillDist = ${dist};
      // Round 3. The airlight is the sky in the ray's own direction, and the
      // sky's fog chunk now hands it over ready-made: \`hzCol\` is the displayed
      // dome — the same gradient, tone curve and transfer the sky went
      // through — evaluated at this ray's elevation and azimuth, so a crest
      // fogs to the exact pixel the sky puts just above it and the flat fogs
      // to the horizon it stands against. Round 2 built the same thing by
      // hand out of \`fogColor\`: a per-elevation cooling on the *linear* fog
      // colour, mixed into a display-space frame, which is why the hills
      // came out a saturated navy at 0.25–0.30 luma under a sky of 0.65 — a
      // stop and a third under the sky at their base, and bluer than any air.
      // Measured from the pride into the sun, before: hills 0.22–0.28, hue
      // 220, saturation 0.5–0.6; sky over the ridge 0.62.
      //
      // So: the air is \`hzCol\`, under one flat tone (below). No cooling by
      // elevation — the dome's gradient already carries the fall to blue-grey
      // over the first degrees — and no separate wall colour, because the
      // mesh is no longer cut (see the fold at the vertex stage).
      //
      // The flat is the plain. It takes the scene fog exactly as the near
      // ground does (the scene fog converges on the horizon sky for a ray to
      // the ground, so the round-2 fold of the far flat into the hill
      // treatment is gone with the cream band it was there for), and only
      // what stands above the plain — the height key — is on the hills' rate.
      float hillK = ${hillKExpr};
      // The hills' rate is the scene fog's, floored. A ray to a crest is up
      // out of the dust layer and the layer integral thins it, which is right
      // for the first few hundred metres — a hill at 450 m still shows its
      // own dark bush — but by the crests it has to have gone most of the way
      // to the sky: real hills in dusty air sit at 0.7–0.9 of the horizon
      // sky's luminance, a little bluer and greyer, never a stop under it.
      // The floor takes them from 0.58 at 500 m to 0.72 by 650 m — measured
      // from the pride and the rear framing, crests at 0.75–0.85 of the sky
      // over the ridge, the hill foot running on into the plain's band;
      // the stock chunk's own far-plane wall (0.55–0.92 of the far plane for
      // a ray over the horizon) carries them the rest of the way to the air
      // by the fold radius, so the far range past it is all air.
      //
      // Round 5. The ramp starts at 60 m and is at its floor by 380 m — which
      // is where the first hill stands — and the floor is 0.90 on a lit
      // flank, 0.94 on one that faces away from the key. (With the key at
      // 58 degrees no slope under 60 degrees is on the far side of it, so the
      // shade term is a dusk term; by day the hills are nine tenths air.) It was 0.82 by
      // 560 m, from 100 m to 0.76 by 650 m. Read off the chunk's own debug
      // output on \`lion_far\` into the sun: the near ridge stands at 370–430 m
      // and was 0.44–0.52 air there, the middle ridge at 510–575 m was 0.65–
      // 0.78 air, and the lit value under both is near black (0.003–0.02 of
      // display, the dark side of a 0.05 albedo), so the ridges came out at
      // 0.54–0.66 of the sky over them against a floor of 0.72. The air in
      // front of a hill is the same air whichever way the hill faces, so the
      // fraction that is air is what was wrong, not the tone: real hills in
      // dusty air at four hundred metres are five sixths air. The shaded
      // side takes a little more still, which is the forward scatter of a
      // sun that is in front of the camera whenever the near face is in
      // shadow — and the reason a backlit range is always the hazier one.
      float hillNL = dot( normalize( normal ), normalize( ( viewMatrix * vec4( ${patched ? 'uSkyDir.xyz' : 'vec3( 0.0, 1.0, 0.0 )'}, 0.0 ) ).xyz ) );
      float hillShade = 1.0 - smoothstep( -0.15, 0.35, hillNL );
      float hillFog = smoothstep( 60.0, 380.0, hillDist ) * mix( 0.90, 0.94, hillShade );
      // A hill is a little darker and a little bluer than the sky in its own
      // direction, always — including at the fold, where the fog has taken
      // it entirely. The dome is brightest in the first degree over the
      // horizon and falls 13 per cent by two degrees (measured: band 0.72,
      // sky over the ridge 0.61–0.64, per channel 0.81/0.85/0.92), so a hill
      // flank fogged to exactly the sky at its own half-degree came out 3–4
      // per cent *brighter* than the sky over the crest in the camp and
      // forest framings — the pale-band read, in miniature. At 0.87 of the
      // sky in its direction the whole hill sits under the sky over its
      // ridge and 13 per cent under the plain at its foot, which is where a
      // range at the horizon sits in a photograph of dusty air.
      //
      // Round 4: the tone is keyed by *distance*, not by the height key. It
      // was on the height key — the flat untoned so it would meet the horizon
      // exactly, the hill toned — and that put the seam in the picture: at
      // the hill foot, plain and slope are at one distance in one air, and
      // the flat there fogged to the full band while the slope beside it
      // fogged to 0.87 of it. Measured on \`lion_far\`: the flat under the hill
      // 0.60–0.62, the foot 0.41–0.49, the sky over the ridge 0.45–0.50 — the
      // brightest ground in the frame, brighter than the sky it was read
      // against. Now everything on this mesh past 620 m fogs to the toned
      // air, plain and hill alike, and the tone comes in over 400–620 m so
      // the forest's skirt (which fogs to the full band and ends at 420 m)
      // meets the flat at the band. Where the plain runs to an open horizon
      // it sits 13 per cent under the sky at the line, which is what a dusty
      // plain does. The crests, all past 620 m, are exactly where they were.
      //
      // And by hour: at dusk the dome falls 0.66 → 0.42 over the first
      // degrees, and a crest at 0.87 of the sky in its own direction stood
      // 0.04 under the sky over the ridge — the hills dissolved (measured on
      // \`truck_dusk/mainroad\`). The sun's elevation is in the sky uniforms the
      // fog chunk already carries; under 0.4 the tone deepens toward 0.78,
      // which is a low sun's contrast against a horizon it is still lighting.
      // Day (sun at 58°) and the moon (43°) are untouched.
      float hillFar = smoothstep( 400.0, 620.0, hillDist );
      float hillSunY = ${patched ? 'uSkyDir.y' : '1.0'};
      float hillDusk = 1.0 - smoothstep( 0.08, 0.4, hillSunY );
      // Round 5: 0.90 by day, 0.71 at dusk, from 0.87 and 0.78 — the air is
      // now read over the ridge (below), which is already 0.93–1.05 of the
      // sky a critic reads it against, and the two reductions multiplied;
      // nine tenths air at 0.90 of that puts a hill at 0.81 of the sample
      // before the guards, the middle of the 0.72–0.92 band with room for
      // the sample to miss the critic's rows by a tenth either way (cirrus
      // over the ridge, the frame's field of view). The day tone is neutral
      // so the hill's saturation is the sky's: at (0.87, 0.88, 0.91) the
      // hill sat 0.05–0.08 over the sky it fogged to and read 0.27–0.31
      // against the 0.24 ceiling. Dusk keeps a hundredth of blue per step.
      // Dusk sits lower because the round-4 contrast floor (sky over the
      // ridge minus the crest, 0.06 in display luma) is a ratio of 0.81 at
      // the dusk sky's level: the band there is 0.72–0.81. The dusk dome is
      // steeper still over the ridge (haze falloff 10, the warm side), so the
      // sample runs 6–12 per cent over the critic's rows and a tone of 0.82
      // displayed at 0.84–0.92 (contrast 0.025–0.075); 0.71 with nine tenths
      // air lands at 0.70 before the guards, which move to 0.66 and 0.73 with
      // the hour, for 0.74–0.80 on screen.
      //
      // Then measured, the whole set: with the sample two thirds of a degree
      // over the ray and the tone at 0.90 the crests came to 0.84–0.89 of the
      // sky *at the skyline* (linear, on screen) and 0.99–1.03 of the sky the
      // critics box, which is two to three degrees over the ridge — 8–28
      // rows up at 640 wide — where the dome is a tenth darker. Both readings
      // are of the same hill; the band is 0.72–0.92 on either, so the hill
      // goes between them: 0.86 by day (a twentieth down on screen, read
      // with the higher sample below), and dusk *up*, 0.71 → 0.76, since
      // the dusk crests stood at 0.64–0.80 of the sky over them with a
      // contrast of 0.10 in display luma — 0.04 of room over the 0.06 floor.
      vec3 hillTone = mix( vec3( 0.86 ), vec3( 0.76, 0.765, 0.78 ), hillDusk );
      // Round 5: the air a far hill fogs to is the sky *over its ridge*, not
      // the sky at its own ray. The dome is steep in its first degrees — the
      // haze band e-folds over six degrees of elevation and the zenith mix
      // has come a quarter of the way in by two — so a crest that had gone
      // entirely to 0.87 of the sky at its own half-degree still stood at
      // 1.01–1.24 of the sky two to four degrees over it, which is where a
      // critic (and an eye) reads the sky a ridge stands against. Measured
      // on \`mainroad\`: crest rows 0.64 sRGB against 0.656 at the skyline and
      // 0.60–0.62 fifteen rows up. The dome's own terms are in the fog
      // uniforms, so the same gradient is evaluated here just over the ridge
      // (0.012 in the vertical, two thirds of a degree — the critics average
      // 0.3–2.5 degrees over the skyline; at 0.035 the sample was 0.73–0.92
      // of that average and at 0.02 still 0.88 in the narrow pride framing,
      // too dark to key to) and the hill takes 0.90 of that.
      // Same rule for the flat past 620 m, so the hill foot and the plain
      // under it stay one value; the flat under 400 m keeps the plain's own
      // fog and the forest's skirt meets it at the band, as in round 4.
      //
      // And by day the sample is never under 0.025 of elevation (a degree
      // and a half). A ray to a hill's lower flank runs a hair over the horizon
      // and read the band there — the brightest sky in the frame — so a flank
      // at 400 m, nine tenths air, came out *brighter* than the crest over it
      // and level with the sky at the skyline (\`mainroad\` rows 84–99 rising
      // 0.617 → 0.652 sRGB under a crest at 0.61). A hill stands against the
      // sky over its ridge, all of it. (At 0.035 the ridges that stand a
      // few rows over the horizon — \`lion_far\`, \`camp_beyond\` — read a
      // sky a fifth darker than the band they are seen against and came out
      // at 0.67 of it.) Dusk keeps the ray's own sample: the dusk dome falls
      // a tenth over the same degrees and the dusk crests are tuned against
      // the sky they had.
      //
      // Round 6: the offset follows the field of view. The critics' window is
      // in rows — the middle of it is 11 rows over the ridge on a 360-row
      // frame — so its elevation is 11/360 of the vertical fov: 0.016 at the
      // pride's 30°, 0.023 at the truck views' 44°, against the fixed 0.012.
      // Measured with the frame's own sky (uHillDebug 1, cirrus off on both):
      // on \`mainroad\` the fixed sample read 1.05–1.10 of the sky the rows
      // hold — two thirds of a degree lower on a dome that e-folds over six
      // — so every crest the ceiling set at 0.83 of the sample stood at
      // 0.88–0.93 of the sky, and the near flank, sampling lower still, was
      // 5–13 % paler than its crest (critic B's plate). On the pride's narrow
      // frame the fixed offset was near the middle already (0.94–0.98).
      // Dusk keeps the ray's own 0.012.
      vec3 hillSkyUp = ${air};
      ${
        patched
          ? `if ( uSkyDir.w > 0.5 ) {
        float upOff = mix( uHillView.x, 0.012, hillDusk );
        vec3 upW = vec3( dot( hzDir, viewMatrix[ 0 ].xyz ), max( max( hzRayY, 0.0 ) + upOff, 0.025 * ( 1.0 - hillDusk ) ), dot( hzDir, viewMatrix[ 2 ].xyz ) );
        upW /= max( length( upW ), 1e-4 );
        float upH = upW.y;
        float upC = clamp( dot( upW, uSkyDir.xyz ), -1.0, 1.0 );
        float upHaze = exp( -upH * uSkyZen.w );
        float upSide = smoothstep( -1.0, 1.0, upC );
        vec3 upSky = mix( uSkyHor.rgb, uSkyZen.rgb, pow( upH, uSkyHor.w ) );
        upSky = mix( upSky, uSkyHaze.rgb, upHaze * 0.52 * mix( 1.0, 0.5 + 0.5 * upSide, uSkyHaze.w ) );
        upSky = mix( upSky, uSkyHaze.rgb, upHaze * upSide * uSkySun.w );
        upSky = mix( upSky, uSkyAnti.rgb, pow( max( -upC, 0.0 ), 2.5 ) * upHaze * uSkyAnti.w );
        upSky += uSkySun.rgb * pow( max( upC, 0.0 ), 6.0 ) * ( 0.35 + upHaze * 0.9 );
        // Round 6, the into-sun crests. The dome is not the clear gradient
        // the fog uniforms carry: sky.js lays a field of cirrus over it
        // (\`uCloud\`, half strength by day, lit toward the sun) and a
        // ten-degree glow round the sun, and neither was in this sample.
        // Ablated on \`lion_far\` (uHillDebug 1 against the frame's own
        // sky): over the left ridge, nine degrees up and toward the sun,
        // the sample read 0.80 of the sky the frame shows — a lit cirrus
        // sheet — so the 0.80 ceiling put the crest at 0.64 of the dome
        // and 0.60 of the sky on screen, under a floor that was keyed to
        // the same short sample and never engaged (frames with the floor
        // off were pixel-identical). Elsewhere the sample was 0.93–0.99
        // of the sky. The dome's own cirrus and glow, evaluated on the
        // same direction with the dome's own noise, so the guards hold
        // against the sky a crest actually stands in. uHillSky is the
        // dome's sun colour and cloud amount, uHillCloud its cloud colour
        // and glow, read off the sky mesh's uniforms each frame.
        if ( uHillSky.w > 0.0 ) {
          vec2 upCuv = upW.xz / ( upH + 0.22 );
          float upCl = hillFbm( upCuv * 1.35 + 4.0 );
          upCl = smoothstep( 0.52, 0.86, upCl ) * smoothstep( 0.0, 0.22, upH );
          vec3 upLit = mix( uHillCloud.rgb, uHillSky.rgb * 1.35, pow( max( upC, 0.0 ), 2.0 ) * 0.8 );
          upSky = mix( upSky, upLit * ( 0.7 + uHillCloud.w * 0.02 ), upCl * uHillSky.w );
        }
        upSky += uHillSky.rgb * pow( max( upC, 0.0 ), 90.0 ) * uHillCloud.w;
        #if defined( TONE_MAPPING )
          upSky = toneMapping( upSky );
        #endif
        hillSkyUp = linearToOutputTexel( vec4( upSky, 1.0 ) ).rgb;
      }`
          : ''
      }
      vec3 hillAir = mix( ${air}, hillSkyUp * hillTone, hillFar );
      // the scrub domes fog to a shade under the air, so one standing past the
      // crest it grows on — hazier than the crest in front of it — is still a
      // dark speck in the haze and not a pale plate over a dark ridge. A
      // darkening, not a cooling: at 0.8 of a cooled air the domes were grey-
      // blue specks on a cream slope, which is a field of pebbles.
      hillAir *= ${airScale};
      float hillF = mix( fogFactor, max( fogFactor, hillFog ), hillK );
      // The rule, enforced rather than tuned for: a hill is never lighter
      // than the air in front of it. The lit value is soft-compressed under
      // 0.92 of the haze colour's luminance — a knee, so the sunlit flank
      // still shades against the shaded one — before the haze is mixed in.
      // Measured before this: crests at 0.048 albedo under the noon key and
      // the sky's ambient rendered at 195 sRGB against a sky of 163 above
      // them, at a range where the slow haze had only reached a third.
      const vec3 HILL_LUMA = vec3( 0.2126, 0.7152, 0.0722 );
      // Round 5: the knee is under the sky over the ridge as well as under
      // the air — a lit flank at 450 m is in the plain's air, which is the
      // band, and the band is brighter than the sky the flank's crest stands
      // against.
      float hillUpL = dot( hillSkyUp, HILL_LUMA );
      // Round 5, measured: 0.80 by day (was 0.84; the crests it held stood at
      // 0.89 of the skyline sky on screen, 1.01 of the critics' sky; at 0.76
      // they were 0.75 and 0.91), 0.78 at dusk (was 0.73; see the tone).
      // Round 6: 0.87 by day, from 0.80; the guards on their own key. This
      // chunk runs after the tone map and the OETF (three fogs in display
      // space), so the ratios here are ratios of *displayed* luma and land
      // on screen about as written: with the ceiling at 0.87 the crest rows
      // measure 0.85–0.87 of the sample, with the floor at 0.84, 0.81–0.84.
      // (The round-5 note's "0.86–0.92 on screen" for 0.84 was the sample
      // over-reading the critics' rows, not the transfer.) Why the floor did
      // not hold, measured on \`lion_far\` with the sample and the keys written
      // out (uHillDebug 1, 4, 10): (a) both guards were weighted by hillK,
      // the height key, and hillK on the crest rows of a low far range is
      // 0.57–0.75 — the ridge is 8–15 m over the flat and the critics' hill
      // rows sit 3–14 m under it, where the 2.5–15 m ramp is half way — so
      // the 0.76 floor lifted an into-sun crest 0.6 of the way and a 0.87
      // ceiling let a bare crest through at 0.6 × 0.87 + 0.4 = 0.92 of the
      // sample (\`mainroad\` cols 460–520, 0.90–0.93 on screen); (b) over the
      // into-sun ridge the sample read 0.80 of the sky the frame shows — a
      // lit cirrus sheet that was not in the sample — and 0.89–0.92 with the
      // cirrus in it (above). 0.76 × 0.6-engaged × 0.80 is the 0.55–0.65 the
      // critics measured. The guards now run on hillG, which is 1 by four
      // metres over the flat on any hill past the tone's 400–620 m ramp
      // (the flat there fogs to the toned air, under the ceiling, so there
      // is no step at the foot); nearer hills keep the height key, where the
      // foot meets a plain that is still its own colour. Dusk keeps 0.78.
      float hillCeil = mix( 0.87, 0.78, hillDusk );
      float hillG = max( hillK, smoothstep( 0.5, 4.0, vHillY ) * hillFar );
      float hillAirL = max( min( dot( hillAir, HILL_LUMA ), hillUpL * hillCeil ) * 0.92, 1e-3 );
      float hillLitL = max( dot( gl_FragColor.rgb, HILL_LUMA ), 1e-4 );
      vec3 hillLitRGB = gl_FragColor.rgb;
      float hillCapL = hillAirL * ( 1.0 - exp( -hillLitL / hillAirL ) );
      gl_FragColor.rgb *= mix( 1.0, hillCapL / hillLitL, hillK );
      gl_FragColor.rgb = mix( gl_FragColor.rgb, hillAir, hillF );
      // The guard (round 5, critic B's): whatever the mix came to, a hill is
      // under hillCeil of the sky over its ridge (0.87 by day — see the note
      // at hillCeil); 0.78 at dusk, for the contrast floor. A luminance
      // scale, not a per-channel min, so the clamp cannot turn a warm crest
      // grey; on hillG (the height key, saturating by 4 m on a far hill), so
      // the flat — which meets the near terrain at 146 m with no guard on
      // that side — is not touched. Everything above is tuned to land under
      // this; it is here for the sunlit flank at 300 m that is still mostly
      // its own colour.
      //
      // And a floor, for the other end of the same rule: past 380 m a hill is
      // never under 0.84 of the sky over its ridge, whichever way it faces;
      // 0.71 at dusk (was 0.66). On distance as well as the key, so a hill
      // flank at 200 m, which is in clear air and is its own colour, is not
      // lifted. With the key saturating, the far crests sit between the
      // floor and the ceiling: a range in dusty air, a few hundredths of
      // modelling, the sky's colour.
      float hillOutL = max( dot( gl_FragColor.rgb, HILL_LUMA ), 1e-4 );
      float hillFloor = hillG * smoothstep( 300.0, 380.0, hillDist );
      vec3 hillNoGuard = gl_FragColor.rgb;
      gl_FragColor.rgb *= mix( 1.0, min( 1.0, hillUpL * hillCeil / hillOutL ), hillG );
      vec3 hillNoFloor = gl_FragColor.rgb;
      // 0.84 by day (round 6, from 0.76 by way of 0.82): with the guards on
      // hillG the crest rows of a far range land between the floor and the
      // ceiling of the sample, and the sample reads 0.89–1.03 of the sky a
      // critic boxes (the cirrus-lit corner of \`lion_far\` at the low end),
      // so 0.84–0.87 of it is 0.75–0.90 on screen, inside 0.72–0.92 with
      // three hundredths either side.
      gl_FragColor.rgb *= mix( 1.0, max( 1.0, hillUpL * mix( 0.84, 0.71, hillDusk ) / hillOutL ), hillFloor );
      if ( uHillDebug > 0.5 ) {
        if ( uHillDebug < 1.5 ) gl_FragColor.rgb = hillSkyUp;
        else if ( uHillDebug < 2.5 ) gl_FragColor.rgb = hillAir;
        else if ( uHillDebug < 3.5 ) gl_FragColor.rgb = vec3( hillF );
        else if ( uHillDebug < 4.5 ) gl_FragColor.rgb = vec3( hillK );
        else if ( uHillDebug < 5.5 ) gl_FragColor.rgb = vec3( hillShade );
        else if ( uHillDebug < 6.5 ) gl_FragColor.rgb = vec3( hillDist / 1000.0 );
        else if ( uHillDebug < 7.5 ) gl_FragColor.rgb = hillLitRGB;
        // 8 the floor off, 9 both guards off, 10 the floor's own key: ablation
        else if ( uHillDebug < 8.5 ) gl_FragColor.rgb = hillNoFloor;
        else if ( uHillDebug < 9.5 ) gl_FragColor.rgb = hillNoGuard;
        else gl_FragColor.rgb = vec3( hillFloor );
      }`;
    const out = stock.replace(/gl_FragColor\.rgb\s*=\s*mix\([^;]*;/, blend);
    return out === stock ? stock : out;
  };
  // The fold. The mesh runs to 1500 m and the camera's far plane is at 900, so
  // the far third of it was never drawn: the plane cut the hills off in a
  // jagged contour at 900 m and the stock fog's wall had to take everything
  // inside that to the exact sky so the contour would not show. Which meant
  // a hill at the wall *was* the sky in its own direction — and the sky in a
  // low ray's direction is the horizon band, brighter than the sky over the
  // crest above it. Everything past 860 m is drawn on a sphere of that
  // radius round the camera instead: a vertex beyond it slides down its own
  // sight line, so the skyline keeps its exact angular shape and nothing is
  // cut. What was clipped is the far range itself — the hills at 900–1500 m
  // that the brief describes and that no frame had ever shown. Normals and
  // the height key are read off the unfolded position, so the light and the
  // tint are unchanged; only the depth moves, and at 860 m the fog is at
  // its wall whatever the ray, so nothing folded carries lit value the eye
  // could see slide. The far plane stays at 900 for the culling it does.
  const HILL_FOLD = 860;
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, hillUniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying float vHillY;\nvarying vec2 vHillXZ;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
      vHillY = position.y;
      vHillXZ = position.xz;
      {
        vec3 hillV = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz - cameraPosition;
        float hillR = length( hillV );
        if ( hillR > ${HILL_FOLD.toFixed(1)} ) transformed += hillV * ( ${HILL_FOLD.toFixed(1)} / hillR - 1.0 );
      }`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vHillY;\nvarying vec2 vHillXZ;\nuniform sampler2D uHillMacro;\nuniform float uHillDebug;' + HILL_NOISE)
      .replace(
        '#include <map_fragment>',
        `#include <map_fragment>
      vec4 hMac = texture2D( uHillMacro, vHillXZ / 460.0 + 0.23 );
      // Round 4: the albedo key runs 5–42 m, not 2.5–15. The far rise is a
      // slope of a few per cent from 390 m out, so a key complete at 15 m of
      // elevation put the plain's straw and the scrub's near-black side by
      // side on ground that was continuous — the other half of the value
      // step at the hill foot in \`mainroad\` and \`camp_beyond\`. The first
      // forty metres of an escarpment's footslope is the plain running
      // uphill; the bush takes over above it. The haze rate keeps its own
      // key (below), which is about what stands above the dust layer.
      float hillTint = smoothstep( 5.0, 42.0, vHillY );
      // Round 3: the plain tint down again, 0.56 to 0.285, and a shade redder.
      // At 0.56 the flat between 70 and 300 m rendered 0.70–0.73 into the sun
      // at 4–30 per cent fog — brighter than the dirt in the foreground
      // (0.54–0.58) and a saturated hue-40 yellow against the hue-28 laterite
      // it continues, which is the strip under the treeline in the pride
      // framing. The near ground carries a 0.68 level cut and an occlusion
      // stack this mesh has none of, so its tint has to carry the same cut
      // for the two to meet at one value where the terrain ends.
      //
      // And the plain's lit term falls off with distance, to 0.55 by 520 m.
      // The plain fogs to the horizon band, which is the brightest sky there
      // is (0.72 into the sun); the hills behind it fog to the sky a few
      // degrees up, which is 0.62. So a far plain three quarters fogged still
      // carries a quarter of its own lit straw on top of a floor that is
      // already the band, and rendered 0.66–0.67 under hills at 0.60–0.63:
      // the one band in the frame brighter than the sky over it. What the
      // near ground has and this mesh lacks is the grazing-angle occlusion
      // of clods and stems, which is real and is why a plain seen edge-on
      // into the sun is darker than the same dirt underfoot. The forest's
      // skirt carries the identical curve, so the two meet at one value.
      float hillD = distance( vec3( vHillXZ.x, vHillY, vHillXZ.y ), cameraPosition );
      float hillFlatK = mix( 1.0, 0.55, smoothstep( 240.0, 520.0, hillD ) );
      // Round 5: the scrub down from 0.06 to 0.05, so a lit flank starts under
      // the sky over its ridge and the guard in the fog chunk is a guard.
      diffuseColor.rgb *= mix( hillFlatK * vec3( 0.285, 0.25, 0.24 ), vec3( 0.05, 0.052, 0.045 ), hillTint );
      // two-tone: darker, cooler patches of denser bush against lighter dry
      // grass, strongest on the mid slopes where there is a hill to vary
      diffuseColor.rgb *= mix( 0.86, 1.14, hMac.r ) * mix( vec3( 0.92, 0.96, 1.03 ), vec3( 1.08, 1.03, 0.95 ), hMac.a );
      // bush clumps: the tile's vegetation field at a ten metre period,
      // thresholded to dark patches over the top third of the slopes' albedo,
      // so a slope is a mottled thing at a kilometre and not a smooth cast
      float hBush = smoothstep( 0.5, 0.82, texture2D( uHillMacro, vHillXZ / 64.0 + 0.61 ).b );
      diffuseColor.rgb *= 1.0 - 0.7 * hBush * hillTint;`,
      )
      .replace('#include <fog_fragment>', hazeChunk('smoothstep( 2.5, 15.0, vHillY )'));
  };
  const mesh = new THREE.Mesh(g, mat);
  mesh.name = 'farHills';
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.frustumCulled = false;
  // The dome's cirrus and glow terms, copied off the sky mesh's uniforms each
  // frame (sky.js rewrites them per hour on the one material, so a copy per
  // frame follows the hour; a reference taken at compile time would not
  // reach the scrub's program). The mesh is looked up once.
  let skyMat = null;
  let skyScans = 0;
  mesh.onBeforeRender = (renderer, scene, camera) => {
    // the over-ridge sample's elevation: 11/360 of the vertical fov (radians;
    // a direction's y at these angles is the angle)
    // (y > 0.5 freezes x, for the ablation captures)
    if (camera?.isPerspectiveCamera && hillUniforms.uHillView.value.y < 0.5) hillUniforms.uHillView.value.x = (camera.fov * Math.PI / 180) * (11 / 360);
    if (!skyMat && skyScans < 40 && (skyScans === 0 || renderer.info.render.frame % 90 === 0)) {
      skyScans++;
      const sky = scene.getObjectByName('sky');
      if (sky?.material?.uniforms?.uCloud) skyMat = sky.material;
    }
    if (!skyMat) return;
    const u = skyMat.uniforms;
    const sc = u.uSunColor.value;
    const cc = u.uCloudCol.value;
    hillUniforms.uHillSky.value.set(sc.r, sc.g, sc.b, u.uCloud.value);
    hillUniforms.uHillCloud.value.set(cc.r, cc.g, cc.b, u.uGlow.value);
  };

  // --- scrub on the slopes ----------------------------------------------------
  // A vegetated hillside a kilometre off is a smooth value with dark specks on
  // it, and the far tile's bush cells are two metres across — mipped to their
  // mean long before that range. What reads at a kilometre is a blob twelve
  // metres wide, so those are placed as geometry: squashed low-poly domes,
  // one merged buffer, one draw call, dark olive, gathered along the drainage
  // lines by a slow noise field and thinning out toward the crests. The
  // forest's own billboards would be the richer impostor for this, but they
  // stop at 420 m and this is the range past it; at 16 k triangles the domes
  // are 3 per cent of the terrain's budget.
  const scrub = (() => {
    const rnd = mulberry32(0x7a11);
    const COUNT = 760;
    // a polyhedron geometry is already non-indexed: one flat triangle list
    const proto = new THREE.IcosahedronGeometry(1, 0);
    const pp = proto.attributes.position.array;
    const tris = pp.length / 9;
    const pos = new Float32Array(COUNT * tris * 9);
    const nrm = new Float32Array(COUNT * tris * 9);
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    const c = new THREE.Vector3();
    const n = new THREE.Vector3();
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    const e = new THREE.Euler();
    let w = 0;
    let placed = 0;
    for (let guard = 0; guard < COUNT * 12 && placed < COUNT; guard++) {
      // in the annulus the hills mesh actually shows: past the skirt, inside
      // the wall; denser nearer, where a blob is still a few pixels
      const r = 430 + rnd() ** 1.4 * 420;
      const ang = rnd() * Math.PI * 2;
      const x = Math.cos(ang) * r;
      const z = Math.sin(ang) * r;
      const y = baseHeight(x, z);
      // On the slopes, not the flat. The first pass scattered these over the
      // plain as well and they read as discs lying on it; bush on a hillside
      // reads as the hillside's texture. So: only where the far rise has
      // lifted the ground a few metres, thinning again toward the bare crests.
      // From 12 m, not 3: the height key that puts the hill on the slow haze
      // is complete at 15 m, and a dome on lower ground stood in the plain's
      // fog — half way to cream at 450 m — in front of a hill that was in the
      // hill's, and read as a pale pebble against a dark slope.
      // From 24 m, not 12 (round 4): the albedo key now leaves the footslope
      // in the plain's straw to 42 m, and a 0.004 dome on straw is a hard
      // dark dot, not a speck in the bush.
      const onSlope = smoothstep(24, 38, y) * (1 - smoothstep(70, 150, y));
      if (rnd() > onSlope) continue;
      // gathered: bush follows the drainage, so the field that decides where
      // a blob may stand is slow and most of a slope is still open
      const gather = fbm(x * 0.0025 + 5, z * 0.0025 + 1, { octaves: 3, period: 64, seed: 811 });
      if (rnd() > smoothstep(0.34, 0.7, gather) * 0.9 + 0.1) continue;
      // Acacia-crown sized: 4-9 m across and a dome, not a plate. Round 1's
      // 6-17 m saucers were thirty pixels wide at the near end, and the first
      // pass this round sat them on the surface with flat-shaded facets, which
      // is a field of grey pebbles. Sunk to the equator so only the crown
      // shows, with sphere normals so the shading is one smooth gradient.
      // 3-6 m, from 4-9, and sunk to the equator: at 4-9 m the domes on a
      // crest stood a whole diameter above the silhouette, and one behind the
      // crest is in more air than the crest — lighter — so the skyline grew a
      // row of pale lumps. A bush is a speck *in* the slope; at 3-6 m it is
      // one at 500 m, and what crosses the skyline is a metre of dark.
      const wid = 3 + rnd() ** 1.4 * 3;
      const hgt = wid * (0.45 + rnd() * 0.25);
      s.set(wid * (0.85 + rnd() * 0.3), hgt, wid * (0.85 + rnd() * 0.3));
      e.set(0, rnd() * 6.283, 0);
      q.setFromEuler(e);
      m.compose(new THREE.Vector3(x, y - hgt * 0.5, z), q, s);
      for (let f = 0; f < tris; f++) {
        const o = f * 9;
        for (let k = 0; k < 3; k++) {
          a.set(pp[o + k * 3], pp[o + k * 3 + 1], pp[o + k * 3 + 2]);
          // the unit sphere's normal is its position; under a non-uniform
          // scale it goes through the inverse scale
          n.set(a.x / s.x, a.y / s.y, a.z / s.z).applyQuaternion(q).normalize();
          a.applyMatrix4(m);
          pos[w] = a.x;
          pos[w + 1] = a.y;
          pos[w + 2] = a.z;
          nrm[w] = n.x;
          nrm[w + 1] = n.y;
          nrm[w + 2] = n.z;
          w += 3;
        }
      }
      placed++;
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(pos.subarray(0, w), 3));
    sg.setAttribute('normal', new THREE.BufferAttribute(nrm.subarray(0, w), 3));
    sg.computeBoundingSphere();
    // Dark olive, half the crest tint: a dome's crown faces the sun where the
    // slope under it faces away, so at equal albedo the domes rendered
    // *lighter* than the hill they stood on. A bush is the darkest thing on a
    // hillside at every hour; it has to be darker than the slope after the
    // key has had its say, not before.
    //
    // Lambert, for the reason the hill is. The domes were pale grey plates at
    // 0.042, at 0.014 and at 0.008 alike — hiding them was the only ablation
    // that changed the frame — because a Standard material's 4 per cent
    // dielectric specular on a 9.4 key is a tenth of a stop that no albedo
    // touches. With that gone the colour is the whole of what a dome returns.
    //
    // 0.004, from 0.012. With the hill's air now the sky at the ray's
    // elevation — a stop darker than the band — the crest at 500 m renders
    // at about 0.08 linear, and a dome whose crown takes the key at 0.012 puts
    // 0.03 of warm lit value on top of the same haze: a third lighter than
    // the slope, and beige. At 0.004 the lit term is under a hundredth and
    // what a dome is, at any range, is the haze at 0.82 — a speck a fifth
    // darker than the slope it stands on.
    const sm = new THREE.MeshLambertMaterial({
      color: new THREE.Color(0.004, 0.005, 0.003),
      dithering: true,
    });
    // Same height key as the hill under them. With the domes on the slow haze
    // everywhere and the hill's lower slopes on the plain's fog, a dome on a
    // low slope was in different air from the ground it stood on — cooler and
    // clearer — and rendered as a distinct grey pebble on a cream slope.
    sm.onBeforeCompile = (shader) => {
      shader.uniforms.uHillDebug = hillUniforms.uHillDebug;
      shader.uniforms.uHillSky = hillUniforms.uHillSky;
      shader.uniforms.uHillCloud = hillUniforms.uHillCloud;
      shader.uniforms.uHillView = hillUniforms.uHillView;
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying float vHillY;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvHillY = position.y;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying float vHillY;\nuniform float uHillDebug;' + HILL_NOISE)
        // 0.93 of the hill's air, which is itself 0.87 of the sky: the domes
        // land at 0.81 of the sky, where the old 0.82 of an untoned air had them
        .replace('#include <fog_fragment>', hazeChunk('smoothstep( 2.5, 15.0, vHillY )', '0.93'));
    };
    const sMesh = new THREE.Mesh(sg, sm);
    sMesh.name = 'farScrub';
    sMesh.castShadow = false;
    sMesh.receiveShadow = false;
    sMesh.frustumCulled = false;
    return sMesh;
  })();
  mesh.add(scrub);
  mesh.userData.scrub = scrub;
  return mesh;
}

// ---------------------------------------------------------------------------
// Wheel contact patches. main.js only hands the contact points to the dust,
// so the dust forwards them here; the terrain shader uses them to press and
// shade the dirt under the tyres, which conforms to the ground exactly and
// costs nothing next to a decal.
// ---------------------------------------------------------------------------

let contactSink = null;

/** @param list array of { x, y, z, strength } in world space, up to four. */
export function reportWheelContacts(list) {
  if (!contactSink) return;
  for (let i = 0; i < 4; i++) {
    const c = list[i];
    // xy is the ground position, z the height, w the strength
    if (c) contactSink[i].set(c.x, c.z, c.y, c.strength ?? 1);
    else contactSink[i].set(0, 0, 0, 0);
  }
}
