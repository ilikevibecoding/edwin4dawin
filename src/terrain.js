import * as THREE from 'three';
import { FOG, PALETTE, SUN } from './palette.js';
import { clamp as clamp01, fbm, lerp, mulberry32, smoothstep } from './textures/core.js';
import {
  canopyReflection,
  detailNormal,
  grainMaps,
  litterMaps,
  macroVariation,
  RELIEF_DEPTH,
  RELIEF_TILE,
  reliefMaps,
  rippleMap,
  trackMaps,
  treadImprint,
  vergeMaps,
} from './textures/ground.js';

// ---------------------------------------------------------------------------
// Rolling forest floor with a dirt two-track graded into it.
//
// One mesh, one draw call, but not one resolution: the far field is a 2.3 m
// grid and every cell within nine metres of the centreline is subdivided to
// 0.4 m, which is what it takes for wheel ruts and a crown to exist as
// geometry rather than as a normal map. Cells are stitched along the boundary
// so there are no T-junction cracks, and every normal is analytic so the
// duplicated vertices on cell seams shade identically.
//
// Three tiling surface sets (packed track, loose verge, needle litter) are
// blended in the fragment shader from a signed lateral road offset, so the
// ruts, the crown strip and the verge are placed in road space and the
// surfaces themselves tile in world space. No decals, no z-fighting.
// ---------------------------------------------------------------------------

const SIZE = 300;
const COARSE = 128; // 2.34 m cells in the far field
const FINE = 8; // sub-quads per corridor cell -> 0.29 m
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

/** Direction toward the sun, matching sky.js. Used for the relief sun march. */
function sunVector() {
  const phi = THREE.MathUtils.degToRad(90 - SUN.elevation);
  const theta = THREE.MathUtils.degToRad(SUN.azimuth);
  return new THREE.Vector3().setFromSphericalCoords(1, phi, theta);
}

function baseHeight(x, z) {
  const hills = fbm(x * 0.0052 + 40, z * 0.0052 + 12, { octaves: 4, period: 64, seed: 71 });
  const ridges = fbm(x * 0.0135 + 7, z * 0.0135 + 21, { octaves: 3, period: 64, seed: 51 });
  const medium = fbm(x * 0.021 + 3, z * 0.021 + 9, { octaves: 4, period: 64, seed: 12 });
  const fine = fbm(x * 0.075, z * 0.075, { octaves: 3, period: 64, seed: 33 });
  let y = (hills - 0.5) * 18 + (ridges - 0.5) * 6.5 + (medium - 0.5) * 2.6 + (fine - 0.5) * 0.7;
  // the ground keeps rising past the last trees, so the mesh boundary never
  // shows as a straight edge against the sky
  const r = Math.hypot(x, z);
  y += smoothstep(86, 152, r) * 11;
  return y;
}

export function createRoadCurve() {
  const pts = [];
  const n = 9;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const z = -SIZE * 0.55 + t * SIZE * 1.1;
    const x = Math.sin(t * Math.PI * 2.1) * 22 + Math.sin(t * Math.PI * 5.4 + 1.2) * 6.5;
    pts.push(new THREE.Vector3(x, 0, z));
  }
  return new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.5);
}

export function createTerrain({ env = null } = {}) {
  const curve = createRoadCurve();

  // --- sample and grade the road centreline --------------------------------
  const SAMPLES = 900;
  const cx = new Float32Array(SAMPLES);
  const cz = new Float32Array(SAMPLES);
  const cy = new Float32Array(SAMPLES);
  const ctx = new Float32Array(SAMPLES); // unit tangent
  const ctz = new Float32Array(SAMPLES);
  const cs = new Float32Array(SAMPLES); // arc length, metres
  const tmp = new THREE.Vector3();
  for (let i = 0; i < SAMPLES; i++) {
    curve.getPoint(i / (SAMPLES - 1), tmp);
    cx[i] = tmp.x;
    cz[i] = tmp.z;
    cy[i] = baseHeight(tmp.x, tmp.z);
  }
  for (let i = 0; i < SAMPLES; i++) {
    const a = Math.max(0, i - 1);
    const b = Math.min(SAMPLES - 1, i + 1);
    const dx = cx[b] - cx[a];
    const dz = cz[b] - cz[a];
    const len = Math.hypot(dx, dz) || 1;
    ctx[i] = dx / len;
    ctz[i] = dz / len;
    cs[i] = i === 0 ? 0 : cs[i - 1] + Math.hypot(cx[i] - cx[i - 1], cz[i] - cz[i - 1]);
  }
  // Signed curvature, projected onto the same lateral frame `lat` uses, so its
  // sign says which side of the road is the *inside* of the bend. A truck
  // pushes material to the outside of every corner and cuts the inside, which
  // is the one thing that tells a bend apart from a straight from ground level.
  const ckn = new Float32Array(SAMPLES);
  for (let i = 0; i < SAMPLES; i++) {
    const a = Math.max(0, i - 8);
    const b = Math.min(SAMPLES - 1, i + 8);
    const ds = Math.max(1e-3, cs[b] - cs[a]);
    const dtx = (ctx[b] - ctx[a]) / ds;
    const dtz = (ctz[b] - ctz[a]) / ds;
    ckn[i] = dtx * ctz[i] - dtz * ctx[i];
  }

  // a grader would smooth the profile out; do the same with a wide box blur
  const smoothed = new Float32Array(SAMPLES);
  const W = 26;
  for (let i = 0; i < SAMPLES; i++) {
    let s = 0;
    let c = 0;
    for (let j = -W; j <= W; j++) {
      const k = i + j;
      if (k < 0 || k >= SAMPLES) continue;
      const w = 1 - Math.abs(j) / (W + 1);
      s += cy[k] * w;
      c += w;
    }
    smoothed[i] = s / c;
  }
  cy.set(smoothed);

  // --- uniform grid over the centreline samples ----------------------------
  // Flat typed arrays, not a Map: the mesh build asks for the nearest road
  // sample about half a million times and a hashed bucket lookup per ring cell
  // costs seconds of boot time on its own.
  const CELL = 8;
  const GRID = 44;
  const ORIGIN = -176;
  const cellOf = (v) => Math.floor((v - ORIGIN) / CELL);
  const counts = new Int32Array(GRID * GRID + 1);
  const cellIndex = new Int32Array(SAMPLES);
  for (let i = 0; i < SAMPLES; i++) {
    const ix = Math.min(GRID - 1, Math.max(0, cellOf(cx[i])));
    const iz = Math.min(GRID - 1, Math.max(0, cellOf(cz[i])));
    cellIndex[i] = iz * GRID + ix;
    counts[cellIndex[i] + 1]++;
  }
  for (let i = 0; i < GRID * GRID; i++) counts[i + 1] += counts[i];
  const items = new Int32Array(SAMPLES);
  const cursor = counts.slice(0, GRID * GRID);
  for (let i = 0; i < SAMPLES; i++) items[cursor[cellIndex[i]]++] = i;

  const _near = { dist: 1e6, lat: 1e6, y: 0, t: 0, s: 0, k: 0, tx: 0, tz: 1 };

  /** Nearest centreline sample, with the signed perpendicular offset. */
  function nearestRoad(x, z, out = _near) {
    const ix = cellOf(x);
    const iz = cellOf(z);
    let best = 1e9;
    let bi = -1;
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
            if (d < best) {
              best = d;
              bi = i;
            }
          }
        }
      }
      // everything still unsearched is at least r cells away
      if (bi >= 0 && best <= (r * CELL) ** 2) break;
    }
    if (bi < 0) {
      out.dist = 1e6;
      out.lat = 1e6;
      out.y = 0;
      out.t = 0;
      out.s = 0;
      out.k = 0;
      out.tx = 0;
      out.tz = 1;
      return out;
    }
    const dx = x - cx[bi];
    const dz = z - cz[bi];
    out.dist = Math.sqrt(best);
    out.lat = dx * ctz[bi] - dz * ctx[bi];
    out.y = cy[bi];
    out.t = bi / (SAMPLES - 1);
    // Arc length projected onto the segment, not the sample's own arc length.
    // The samples are 0.37 m apart and which one is nearest flips about as you
    // move sideways, so the raw value jitters by more than a tyre lug pitch —
    // enough to turn the road-space tread print into noise.
    out.s = cs[bi] + dx * ctx[bi] + dz * ctz[bi];
    out.k = ckn[bi];
    out.tx = ctx[bi];
    out.tz = ctz[bi];
    return out;
  }

  /** Lateral wander of the two-track inside its corridor, in metres. */
  function roadShift(s) {
    return (fbm(s * 0.048, 3.7, { octaves: 3, period: 64, seed: 88 }) - 0.5) * 1.15;
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
    const base = baseHeight(x, z);
    const sgn = nr.lat < 0 ? -1 : 1;
    const latAbs = nr.dist > 14 ? nr.dist : Math.min(nr.dist, Math.abs(nr.lat));
    const side = sgn * latAbs - roadShift(nr.s);
    const ax = Math.abs(side);
    // The wobble is tapered in from the middle of the running surface outward.
    // Applied flat it moves the whole lateral coordinate, so the track and verge
    // masks slide across the ruts and the two-track disappears on any stretch
    // where the wobble happens to be negative.
    const edge = ax - edgeWobble(nr.s) * smoothstep(ROAD_HALF * 0.5, ROAD_HALF * 1.25, ax);

    // a grader cuts a steep face into the uphill side and rolls a wider fill
    // out below, so the transition width follows the cross slope. Tightened from
    // 3.7 m: blending out over that distance turns a 2.5 m trail into ten metres
    // of disturbed ground with no edge to it.
    const cut = base - nr.y;
    const fall = lerp(1.55, 0.8, smoothstep(-0.6, 1.6, cut));
    const grade = 1 - smoothstep(ROAD_HALF + 0.1, ROAD_HALF + 0.1 + fall, edge);

    let y = base + (nr.y - base) * grade;
    // Rut depth is modulated along the road: a two-track is never a pair of
    // extruded channels, it deepens through the wet stretches and washboards
    // out over the dry ones. Costs nothing against the vertical budget because
    // the modulation only ever takes depth away.
    const wear = 0.52 + fbm(nr.s * 0.031 + 11, 5.3, { octaves: 3, period: 64, seed: 141 }) * 0.72;
    const wash = 1 + Math.sin(nr.s * 2.1 + fbm(nr.s * 0.02, 1.7, { octaves: 2, period: 64, seed: 96 }) * 9) * 0.16;
    const rut = Math.exp(-((ax - RUT_C) ** 2) / (2 * RUT_W ** 2));
    // dirt squeezed out of the trough and piled either side of it. This is
    // where the apparent depth comes from: the trough itself cannot go below
    // -RUT_D without the suspension running out of travel.
    const lip =
      Math.exp(-((ax - (RUT_C - RUT_W * 1.9)) ** 2) / (2 * 0.16 ** 2)) +
      Math.exp(-((ax - (RUT_C + RUT_W * 1.9)) ** 2) / (2 * 0.18 ** 2));
    // The lip is squeezed out of the trough in clods, not extruded as a bead:
    // without a strong along-road break it reads as a pair of moulded kerbs.
    const lipVar = 0.35 + fbm(nr.s * 0.62, 4.4, { octaves: 2, period: 64, seed: 181 }) * 1.35;
    const crown = 1 - smoothstep(0.1, 0.5, ax);
    const berm = Math.exp(-((edge - (ROAD_HALF + 0.75)) ** 2) / (2 * 0.9 ** 2));
    y += grade * (crown * CROWN_H - rut * RUT_D * clamp01(wear) * wash + lip * LIP_H * clamp01(wear) * lipVar);
    // Outside of a bend gets the pushed-out material, inside gets cut. 34 puts a
    // 30 m radius corner at full strength, which is about the tightest this
    // centreline gets.
    const outside = clamp01(-Math.sign(side) * nr.k * 34);
    const inside = clamp01(Math.sign(side) * nr.k * 34);
    y += smoothstep(0.05, 0.5, grade) * berm * BERM_H * (0.72 + outside * 0.95);
    y -= smoothstep(0.05, 0.5, grade) * berm * 0.05 * inside;
    // a puddle sits in a dish, not on a flat floor
    const wet = wetnessAt(ax, nr.s, grade);
    y -= wet * 0.026;

    // lumpy forest floor, flattened out on the compacted surface. The fine
    // chop only exists where the dense corridor mesh can carry it.
    const smoothOut = 1 - grade * 0.86;
    y += (fbm(x * 0.128, z * 0.128, { octaves: 3, period: 64, seed: 29 }) - 0.5) * 0.5 * smoothOut;
    const near = 1 - smoothstep(CORRIDOR * NEAR_IN, CORRIDOR * NEAR_OUT, nr.dist);
    if (near > 0.001) {
      y += (fbm(x * 0.36, z * 0.36, { octaves: 3, period: 64, seed: 5 }) - 0.5) * 0.14 * near * (1 - grade * 0.7);
      // hoof-and-tyre chop on the running surface itself, at a frequency the
      // 0.29 m corridor grid can just carry
      y += (fbm(x * 0.95, z * 0.95, { octaves: 2, period: 64, seed: 118 }) - 0.5) * 0.026 * grade * (1 - wet);
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
      const warp = fbm(nr.s * 0.55, 5.7, { octaves: 2, period: 64, seed: 171 }) - 0.5;
      // Amplitude per rib as well as pitch. A tyre shoves up a ridge where the
      // surface was soft enough to take one and skips it where the ground was too
      // hard, so a third of them are missing outright and the rest run two to one.
      const rAmp = smoothstep(0.24, 0.72, fbm(nr.s * 0.42 + 11, 3.1, { octaves: 2, period: 64, seed: 204 }));
      const ripple = Math.sin((nr.s + warp * 0.42) * 4.6);
      const rippleBand = rut * smoothstep(0.3, 0.7, ax);
      // 9 mm, down from 14, and that is now the ceiling rather than the value: with
      // rAmp on top the mean is nearer 5 mm. The ribs were casting shadows as deep
      // as the rut form, which puts the 10 cm tier above the form tier instead of
      // under it.
      y += ripple * 0.009 * rAmp * rippleBand * grade * near * clamp01(wear) * (1 - wet);
    }

    out.y = y;
    out.side = THREE.MathUtils.clamp(side, -20, 20);
    out.edge = THREE.MathUtils.clamp(edge, -2, 20);
    out.along = nr.s;
    out.dist = nr.dist;
    out.wet = wet;
    out.grade = grade;
    out.tanX = nr.tx;
    out.tanZ = nr.tz;
    out.outside = outside;
    return out;
  }

  const makeInfo = () => ({
    near: { dist: 0, lat: 0, y: 0, t: 0, s: 0, k: 0, tx: 0, tz: 1 },
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

  const fineFlag = new Uint8Array(COARSE * COARSE);
  let fineCells = 0;
  for (let j = 0; j < COARSE; j++) {
    for (let i = 0; i < COARSE; i++) {
      const mx = gx(i) + cell * 0.5;
      const mz = gx(j) + cell * 0.5;
      if (nearestRoad(mx, mz).dist < CORRIDOR + cell) {
        fineFlag[j * COARSE + i] = 1;
        fineCells++;
      }
    }
  }
  const flagged = (i, j) => i >= 0 && j >= 0 && i < COARSE && j < COARSE && fineFlag[j * COARSE + i] === 1;

  const gridVerts = (COARSE + 1) * (COARSE + 1);
  const fineVerts = fineCells * (FINE + 1) * (FINE + 1);
  const vertCount = gridVerts + fineVerts;
  const triCount = (COARSE * COARSE - fineCells) * 2 + fineCells * FINE * FINE * 2;

  const position = new Float32Array(vertCount * 3);
  const normals = new Float32Array(vertCount * 3);
  const uvs = new Float32Array(vertCount * 2);
  const aSide = new Float32Array(vertCount);
  const aEdge = new Float32Array(vertCount);
  const aAlong = new Float32Array(vertCount);
  const aWet = new Float32Array(vertCount);
  // Road tangent in world XZ. The surface tiles are all world space, so without
  // this the shader has no idea which way "along the road" points and nothing on
  // the trail can have a grain to it — which is most of why the ruts read as a
  // pair of soft channels rather than as something a wheel dragged through.
  const aTan = new Float32Array(vertCount * 2);
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
    const e = lerp(1.15, 0.13, 1 - smoothstep(CORRIDOR * NEAR_IN, CORRIDOR * NEAR_OUT, info.dist));
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
    aTan[k * 2] = info.tanX;
    aTan[k * 2 + 1] = info.tanZ;
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
      if (!fineFlag[j * COARSE + i]) {
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
      const h00 = surfaceHeight(x0, z0);
      const h10 = surfaceHeight(x1, z0);
      const h01 = surfaceHeight(x0, z1);
      const h11 = surfaceHeight(x1, z1);
      const coarseW = !flagged(i - 1, j);
      const coarseE = !flagged(i + 1, j);
      const coarseS = !flagged(i, j - 1);
      const coarseN = !flagged(i, j + 1);
      const base = vi;
      for (let v = 0; v <= FINE; v++) {
        for (let u = 0; u <= FINE; u++) {
          const fu = u / FINE;
          const fv = v / FINE;
          const x = x0 + fu * cell;
          const z = z0 + fv * cell;
          // a fine edge that meets a coarse quad has to be the coarse quad's
          // straight edge, or the seam opens up as a hairline crack
          let y;
          if (u === 0 && coarseW) y = lerp(h00, h01, fv);
          else if (u === FINE && coarseE) y = lerp(h10, h11, fv);
          else if (v === 0 && coarseS) y = lerp(h00, h10, fu);
          else if (v === FINE && coarseN) y = lerp(h01, h11, fu);
          writeVertex(base + v * (FINE + 1) + u, x, z, y);
        }
      }
      vi += (FINE + 1) * (FINE + 1);
      for (let v = 0; v < FINE; v++) {
        for (let u = 0; u < FINE; u++) {
          const a = base + v * (FINE + 1) + u;
          const b = a + 1;
          const c = a + FINE + 2;
          const d = a + FINE + 1;
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
  geo.setAttribute('aTan', new THREE.BufferAttribute(aTan, 2));
  geo.setIndex(new THREE.BufferAttribute(index, 1));
  geo.computeBoundingSphere();

  // --- material ------------------------------------------------------------
  const track = trackMaps();
  const verge = vergeMaps();
  const litter = litterMaps();
  const tread = treadImprint();
  const detail = detailNormal();
  const grain = grainMaps();
  const macro = macroVariation();
  const relief = reliefMaps();
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
    uVergeNrm: { value: verge.normal },
    uLitterMap: { value: litter.map },
    uLitterNrm: { value: litter.normal },
    uDetailNrm: { value: detail },
    uGrain: { value: grain },
    uMacro: { value: macro },
    uTread: { value: tread.normal },
    uReliefH: { value: relief.height },
    uReliefN: { value: relief.normal },
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
    uMean: { value: new THREE.Vector2(Math.max(track.mean, 0.01), Math.max(litter.mean, 0.01)) },
    uRoad: { value: new THREE.Vector4(ROAD_HALF, SHOULDER, RUT_C, RUT_W) },
    // global weather dial: 0 is a dry summer track, 1 is soaked
    uWet: { value: 0.8 },
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
        attribute vec2 aTan;
        varying float vSide;
        varying float vEdge;
        varying float vAlong;
        varying float vWet;
        varying vec2 vTan;
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
        vTan = aTan;
        vec4 wp = modelMatrix * vec4( transformed, 1.0 );
        vWorld = wp.xyz;
        vTile = wp.xz;`,
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform sampler2D uVergeMap, uVergeNrm, uLitterMap, uLitterNrm;
        uniform sampler2D uDetailNrm, uGrain, uMacro, uTread;
        uniform sampler2D uReliefH, uReliefN;
        uniform vec3 uScale;
        uniform vec2 uGrainScale;
        uniform vec2 uSunStep;
        uniform vec4 uRoad;
        uniform vec4 uNearAmt;
        uniform vec4 uContacts[ 4 ];
        uniform float uReliefScale, uReliefDepth, uReliefAmt;
        uniform float uDetailScale, uMacroScale, uJitterScale, uTreadPitch, uWet;
        uniform float uDebug;
        uniform vec2 uMean;
        varying float vSide;
        varying float vEdge;
        varying float vAlong;
        varying float vWet;
        varying vec2 vTan;
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
        vec4 mac = texture2D( uMacro, vTile * uMacroScale + 0.37 );
        // same texture at a five metre scale: mask jitter in r, mid-scale
        // value in g, damp patches in b
        vec4 mid = texture2D( uMacro, vTile * uJitterScale );
        float jit = mid.r - 0.5;

        vec3 toCam = cameraPosition - vWorld;
        float camDist = length( toCam ) + 1e-4;
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
        vec4 rsEdge = texture2D( uMacro, vec2( vAlong * 0.33, vSide * 0.19 + 0.61 ) );
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
          float rh = texture2D( uReliefH, uvR0 ).r;
          // relaxed fixed point on h( uv + pDir * ( 1 - h ) ) = h
          for ( int i = 0; i < 4; i ++ ) {
            rh = mix( rh, texture2D( uReliefH, uvR0 + pDir * ( 1.0 - rh ) ).r, 0.66 );
          }
          uvR = uvR0 + pDir * ( 1.0 - rh );
        }
        vec4 relH = texture2D( uReliefH, uvR );
        vec4 relN = texture2D( uReliefN, uvR );
        if ( pFade > 0.02 ) {
          vec2 sDir = uSunStep * rDepth * uReliefScale;
          float occ = 0.0;
          for ( int i = 1; i <= 4; i ++ ) {
            float dh = float( i ) * 0.14;
            // ray height after climbing dh against the height field there
            occ = max( occ, ( texture2D( uReliefH, uvR + sDir * dh ).r - ( relH.r + dh ) ) / ( 0.1 + dh ) );
          }
          rShadow = clamp( occ * 0.68, 0.0, 1.0 ) * pFade;
        }
        // the same displacement in metres, so the finer tiers ride the relief
        // instead of sliding across it
        vec2 pWorld = ( uvR - uvR0 ) / uReliefScale;

        vec4 tTrack = texture2D( map, uvT );
        vec4 tTrack2 = texture2D( map, uvT * 0.27 + 0.41 );
        vec4 tVerge = texture2D( uVergeMap, uvV );
        vec4 tLit = texture2D( uLitterMap, uvL );
        vec4 tLit2 = texture2D( uLitterMap, uvL * 0.23 + 0.67 );
        vec4 nTrack = texture2D( normalMap, uvT );
        vec4 nVerge = texture2D( uVergeNrm, uvV );
        vec4 nLit = texture2D( uLitterNrm, uvL );
        vec4 nDetail4 = texture2D( uDetailNrm, ( vTile + pWorld ) * uDetailScale );
        // Second tier of the same grit at four times the frequency, faded in
        // over the last few metres. The wheel and contact framings sit 30 cm
        // off the dirt, where a 45 cm tile is already smooth.
        vec4 nGrit = texture2D( uDetailNrm, ( vTile + pWorld ) * uDetailScale * 4.3 + 0.21 );
        // Close-range aggregate as a multiplicative tint, at two scales. This
        // is what carries chroma detail in the bottom of the frame, where the
        // 2.6 m surface tile is magnified sevenfold and has nothing left.
        vec3 grainA = texture2D( uGrain, ( vTile + pWorld ) * uGrainScale.x ).rgb * 2.0;
        vec4 grainB4 = texture2D( uGrain, ( vTile + pWorld ) * uGrainScale.y + 0.53 );
        // Clod tier, 1.3 m. Between the 2.6 m surface tile and the 40 cm
        // aggregate there was nothing at all, so a metre of trail in the bottom
        // of a low framing carried detail at two scales with a hole between
        // them — which is what "mushy" actually looks like. A graded surface
        // dries and breaks into plates about this size.
        vec4 clod = texture2D( uMacro, vTile * 0.78 + vec2( 0.29, 0.83 ) );

        vec3 cTrack = breakUp( tTrack.rgb, tTrack2.rgb, uMean.x );
        vec3 cLit = breakUp( tLit.rgb, tLit2.rgb, uMean.y );

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
        float surfAo = mix( mix( nLit.w, nVerge.w, mVerge ), nTrack.w, mTrack );
        albedo *= mix( 1.0, clamp( surfAo, 0.0, 1.3 ), 0.55 );

        // Road space: distance along the centreline against lateral offset.
        // Anything keyed off it varies down the road instead of with the world
        // grid, which is what stops the print and the crown strip from reading
        // as one continuous painted stripe.
        vec4 rsp = texture2D( uMacro, vec2( vAlong * 0.021, vSide * 0.11 + 0.3 ) );

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
        vec4 rsWarp = texture2D( uMacro, vec2( vAlong * 0.28 + 0.11, vSide * 0.05 + 0.6 ) );
        float treadV = ( vAlong + ( rsWarp.r - 0.5 ) * 0.5 ) / uTreadPitch +
                       rsEdge.a * 1.7 + step( 0.0, vSide ) * 0.37;
        vec4 tread = texture2D( uTread, vec2( treadU + 0.5, treadV ) );
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
        float wallHi = texture2D( uTread, vec2( treadU + 0.5, treadV ) + sunRS ).w;
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
        vec3 rutTint = mix( vec3( 0.42, 0.37, 0.34 ), vec3( 0.66, 0.62, 0.55 ), dusty );
        albedo *= mix( vec3( 1.0 ), rutTint, sweep );
        float dry = mCrown * ( 0.3 + mac.a * 0.5 ) * ( 1.0 - damp * 0.7 );

        // Fines dragged along the direction of travel. A dirt road streaks
        // lengthwise and the world-space tiles cannot know which way that is,
        // so the streak is sampled in road space and stretched 6:1.
        vec4 streak = texture2D( uMacro, vec2( vAlong * 0.42, vSide * 2.6 + 0.7 ) );
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
        vec4 drag = texture2D( uMacro, vec2( vAlong * 0.42 + 0.4, vSide * 7.5 + rsp.g * 1.4 ) );
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
        albedo *= mix( vec3( 1.0 ), vec3( 1.05, 1.07, 1.1 ), mLoose * 0.8 );
        albedo *= mix( vec3( 1.0 ), vec3( 1.1, 1.1, 1.08 ), mCrown * 0.8 );

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
        vec3 veg = mix( vec3( 0.046, 0.056, 0.026 ), vec3( 0.1, 0.088, 0.042 ), mac.b );
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
        float oldTier = 1.0 - pFade * 0.7;
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
        float relLoose = ( 1.0 - sweep * 0.32 ) * ( 1.0 - water * 0.9 );
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
        albedo *= mix( vec3( 1.0 ), gA, detailFade * 0.7 * loose );
        albedo *= mix( vec3( 1.0 ), gB, gritFade * 0.5 * loose );
        // Held down: the cap of an embedded stone is a shade lighter than the
        // matrix, not a third lighter. At 0.45 the tile's stone mask was putting
        // measurable pale speckle over the whole trail again.
        albedo = mix( albedo, albedo * vec3( 1.2, 1.18, 1.13 ), relH.b * relAmt * 0.3 );
        // Debris, as a multiply rather than a mix to a fixed near-black. 0.030
        // against a trail rendering at 0.06 is a hole punched in the surface, and
        // the stamped needles are 0.7 mm wide — so what the tile actually drew
        // was a mat of black hairs, which is most of what the near-field speckle
        // was. Bark and needles are dark brown and they are lying *on* the dirt.
        albedo = mix( albedo, albedo * vec3( 0.5, 0.44, 0.36 ), relH.a * relAmt * 0.7 );
        // water is a mirror, not a diffuser: kill whatever aggregate the tint
        // tiers just put into it
        albedo = mix( albedo, albedo * vec3( 0.9, 0.94, 1.0 ), water * 0.5 );

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
        if ( uDebug > 0.5 ) diffuseColor.rgb = vec3( mTrack * 0.5 + mVerge * 0.5, mRut, mPrint );
        if ( uDebug > 2.5 ) albedo = vec3( sweep, mRut, mPrint );
        if ( uDebug > 3.5 ) diffuseColor.rgb = vec3( water, soak, damp );`,
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
        roughnessFactor = clamp( roughnessFactor + dry * 0.06, 0.4, 1.0 );`,
      )
      .replace(
        '#include <normal_fragment_maps>',
        `vec3 mapN = mix( nLit.xyz, nVerge.xyz, mVerge );
        mapN = mix( mapN, nTrack.xyz, mTrack ) * 2.0 - 1.0;
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
        mapN.xy *= mix( 1.0, 0.32, nearFade ) * fpFade;
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
        vec4 rip = texture2D( uMacro, vTile * 0.9 + vec2( 0.13, 0.61 ) );
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
        reflectedLight.indirectDiffuse *= ambientOcclusion * vec3( 1.06, 1.0, 0.93 );
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
        reflectedLight.indirectDiffuse += albedo * 0.5 * ambientOcclusion * ( 1.0 - water );
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
        if ( uDebug > 1.5 && uDebug < 2.5 ) {
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
  const scatter = buildScatter(curve, surfaceInfo, env, sunV);
  mesh.add(scatter.stones);
  mesh.add(scatter.shadows);
  const water = buildWater(curve, surfaceInfo, surfaceHeight, sunV);
  mesh.add(water);

  contactSink = uniforms.uContacts.value;

  return {
    mesh,
    stones: scatter.stones,
    shadows: scatter.shadows,
    water,
    material,
    curve,
    heightAt: surfaceHeight,
    roadDistance: (x, z) => nearestRoad(x, z).dist,
    roadHalf: ROAD_HALF,
    shoulder: SHOULDER,
    size: SIZE,
    stats: {
      vertCount,
      triCount,
      fineCells,
      stoneTris: scatter.stones.geometry.attributes.position.count / 3,
      shadowTris: scatter.shadows.geometry.index.count / 3,
      waterTris: water.geometry.index.count / 3,
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

const STONE_COUNT = 760;
const GRAVEL_COUNT = 6400;
const TWIG_COUNT = 520;
const ROOT_COUNT = 20;
const ROOT_SEGS = 11;

// The same level scale the terrain shader applies to its own albedo. These are
// objects half-buried in that surface, so they have to move with it: at the old
// level against a halved trail every stone and twig would have read as a pale
// fleck scattered over dark ground, which is the "sprinkles" failure the shadow
// decals exist to prevent, arrived at from the other direction.
const SCATTER_LEVEL = 0.5;

const makeScatterInfo = () => ({
  near: { dist: 0, lat: 0, y: 0, t: 0, s: 0, k: 0, tx: 0, tz: 1 },
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

function buildScatter(curve, surfaceInfo, env, sunV) {
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
  const MAX_TRIS = 142000;
  const pos = new Float32Array(MAX_TRIS * 9);
  const nrm = new Float32Array(MAX_TRIS * 9);
  const col = new Float32Array(MAX_TRIS * 9);

  const MAX_DECALS = 15000;
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
        const seat = 0.54 + 0.46 * Math.min(1, Math.max(0, (ly + 0.35) / 1.15));
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
      const shade = 0.062 + rnd() * vBias * 1.9;
      const grey = 0.93 + rnd() * 0.07;
      return [shade, shade * grey, shade * (grey - 0.05 + rnd() * 0.1)];
    }
    // Floored at 0.034, not 0.024. Times the 0.68 low end of the per-face mottle
    // and the 0.44 low end of the seat gradient, 0.024 renders at 0.007 — which
    // at two pixels across is not a dark stone, it is a dead pixel, and the close
    // crops came back peppered with them.
    const v = rnd() ** 1.7;
    const shade = 0.042 + v * vBias * 1.3;
    const grey = rnd() ** 1.6;
    return [shade, shade * (0.76 + grey * 0.16), shade * (0.5 + grey * 0.26)];
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
    const big = rnd() < 0.18;
    // The two tiers used to overlap: the small one ran to 10 cm, which is a
    // 25 cm stone once the width jitter is on it, and at that size a twenty-face
    // lump squashed to 0.4 of its height and sunk four fifths of the way in
    // shows exactly three facets. That is a low pyramid, and the close crops
    // were full of them. The tiers are separated now and the size decides the
    // prototype, so nothing above 7 cm is drawn with twenty faces.
    const r = big ? 0.075 + rnd() * 0.075 : 0.035 + rnd() * 0.04;
    s.set(r * (0.8 + rnd() * 0.42), r * (0.55 + rnd() * 0.4), r * (0.8 + rnd() * 0.42));
    e.set(rnd() * 6.283, rnd() * 6.283, rnd() * 6.283);
    q.setFromEuler(e);
    // Sunk so only a cap shows, like something the grader pressed in — but not
    // so far that the cap is all that is left. A stone with a third of itself
    // above the dirt has a silhouette; one with a tenth has an outline.
    const sink = 0.34 + rnd() * 0.3;
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
    emit(proto, m, cc[0], cc[1], cc[2], 0.34, placed);
    // Only the ones that stand proud enough to throw anything — but 14 mm was
    // most of the small tier, so most stones sat in the dirt with no contact
    // under them at all and read as pasted on.
    if (s.y * (1 - sink) > 0.007) decal(x, info.y, z, r * 0.8, s.y * (1 - sink), big ? 0.85 : 0.6);
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
    const r = chip ? 0.012 + rnd() ** 1.4 * 0.019 : 0.03 + rnd() ** 1.3 * 0.05;
    const flat = chip ? 0.3 + rnd() * 0.3 : 0.52 + rnd() * 0.44;
    s.set(r * (0.82 + rnd() * 0.42), r * flat, r * (0.82 + rnd() * 0.42));
    e.set(rnd() * 6.283, rnd() * 6.283, rnd() * 6.283);
    q.setFromEuler(e);
    const sink = chip ? 0.38 + rnd() * 0.3 : 0.12 + rnd() * 0.26;
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
    if (proud > 0.012) decal(x, info.y, z, r * 0.85, proud, chip ? 0.45 : 0.8);
    gravel++;
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
    const v = rnd();
    const shade = 0.034 + v * 0.026;
    emit(sticks[(rnd() * sticks.length) | 0], m, shade, shade * (0.78 + v * 0.1), shade * (0.55 + v * 0.16), 0.3, twigs);
    decal(x, info.y, z, len * 0.26, rad * 1.4, 0.45);
    twigs++;
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
    roughness: 0.88,
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
    envMapIntensity: 0.95,
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

  const maxV = sites.length * (PUDDLE_RING * 2 + 1);
  const pos = new Float32Array(maxV * 3);
  const alpha = new Float32Array(maxV);
  const depth = new Float32Array(maxV);
  const idx = new Uint32Array(sites.length * PUDDLE_RING * 3 * 3);
  let vw = 0;
  let iw = 0;
  let puddles = 0;

  for (const site of sites) {
    // The dish the wetness field cut into the mesh is 2.6 cm at its deepest, so
    // filling to 1.6 cm above the low point leaves a millimetre of margin at
    // the rim and about a centimetre of water in the middle.
    const wy = site.y + 0.016;
    const rim = new Float32Array(PUDDLE_RING);
    for (let k = 0; k < PUDDLE_RING; k++) {
      const ang = (k / PUDDLE_RING) * Math.PI * 2;
      const dx = Math.cos(ang);
      const dz = Math.sin(ang);
      // Capped at 70 cm. A rut holds water along its whole length, so a ray
      // fired down the trough finds no rising ground for metres and the pool
      // stretches into a ribbon — which from a low framing is a shiny slug
      // lying on the road, not standing water.
      let r = 0.04;
      while (r < site.cap) {
        if (heightAt(site.x + dx * (r + 0.035), site.z + dz * (r + 0.035)) > wy - 0.001) break;
        r += 0.035;
      }
      // pulled in slightly and roughened, so the waterline is not a clean curve
      rim[k] = Math.max(0.03, r * (0.86 + rnd() * 0.13));
    }
    // Smoothed around the ring. The ray march quantises in 3.5 cm steps, so two
    // neighbouring spokes routinely differ by a whole step and the outline came
    // out as a saw — a flat-bottomed polygon with a spike off one side, which
    // reads as a torn piece of paper lying on the trail rather than as a water
    // line. A puddle edge is a contour of a smooth surface: it wanders, but it
    // does not have corners. Three-tap circular mean keeps the wander.
    const sm = new Float32Array(PUDDLE_RING);
    for (let k = 0; k < PUDDLE_RING; k++) {
      const a0 = rim[(k + PUDDLE_RING - 1) % PUDDLE_RING];
      const a2 = rim[(k + 1) % PUDDLE_RING];
      sm[k] = rim[k] * 0.5 + (a0 + a2) * 0.25;
    }
    let sum = 0;
    for (let k = 0; k < PUDDLE_RING; k++) {
      rim[k] = sm[k];
      sum += rim[k];
    }
    const mean = sum / PUDDLE_RING;
    // anything smaller than this is a wet speck, and a wet speck with a mirror
    // finish on it is a bright fleck rather than a puddle
    if (mean < 0.13) continue;

    const centre = vw;
    pos[vw * 3] = site.x;
    pos[vw * 3 + 1] = wy;
    pos[vw * 3 + 2] = site.z;
    alpha[vw] = 1;
    depth[vw] = wy - site.y;
    vw++;
    const inner = vw;
    for (let k = 0; k < PUDDLE_RING; k++) {
      const ang = (k / PUDDLE_RING) * Math.PI * 2;
      const dx = Math.cos(ang);
      const dz = Math.sin(ang);
      const ri = rim[k] * 0.78;
      pos[vw * 3] = site.x + dx * ri;
      pos[vw * 3 + 1] = wy;
      pos[vw * 3 + 2] = site.z + dz * ri;
      alpha[vw] = 1;
      depth[vw] = Math.max(0, wy - heightAt(site.x + dx * ri, site.z + dz * ri));
      vw++;
    }
    const outer = vw;
    for (let k = 0; k < PUDDLE_RING; k++) {
      const ang = (k / PUDDLE_RING) * Math.PI * 2;
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
    for (let k = 0; k < PUDDLE_RING; k++) {
      const k1 = (k + 1) % PUDDLE_RING;
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
  g.setIndex(new THREE.BufferAttribute(idx.subarray(0, iw), 1));
  // computeBoundingSphere on an empty attribute leaves a NaN centre behind,
  // which poisons frustum culling for the whole subtree
  if (vw > 0) g.computeBoundingSphere();
  else g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 0);

  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uRipple: { value: rippleMap() },
      uCanopy: { value: canopyReflection() },
      uSunDir: { value: sunV.clone() },
      uSunCol: { value: new THREE.Color(0xffe2c6) },
      uSkyTop: { value: new THREE.Color(0x4c7fb5) },
      uSkyLow: { value: new THREE.Color(0xa8b3ae) },
      // Silt, not water: what a shallow puddle on a dirt track shows where the
      // reflection is weak is the mud at the bottom of it.
      // Silt under the sheet, down with the dirt it is silt from.
      uBody: { value: new THREE.Color(0.016, 0.0135, 0.0098) },
      // Off the palette, not a copy of it. This was a hardcoded 0x97a69c, which
      // is the value the airlight had before it was halved in linear — so the
      // puddles were fogging toward a colour half a stop brighter than everything
      // else in the frame and the far ones read as pale patches.
      uFog: { value: new THREE.Color(PALETTE.fogColor) },
      uFogDensity: { value: FOG.density },
      uTime: { value: 0 },
    },
    vertexShader: /* glsl */ `
      attribute float aAlpha;
      attribute float aDepth;
      varying vec3 vWorld;
      varying float vAlpha;
      varying float vDepth;
      void main() {
        vec4 wp = modelMatrix * vec4( position, 1.0 );
        vWorld = wp.xyz;
        vAlpha = aAlpha;
        vDepth = aDepth;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D uRipple, uCanopy;
      uniform vec3 uSunDir, uSunCol, uSkyTop, uSkyLow, uBody, uFog;
      uniform float uFogDensity, uTime;
      varying vec3 vWorld;
      varying float vAlpha;
      varying float vDepth;
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
        vec2 slope = ( r1 * 0.7 + r2 * 0.3 ) * 0.03;
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
        vec3 refl = texture2D( uCanopy, vec2( az, clamp( max( up, 0.0 ), 0.004, 0.996 ) ) ).rgb;
        // Only the last few degrees before the zenith are actually open.
        vec3 sky = mix( uSkyLow, uSkyTop, smoothstep( 0.0, 0.7, up ) );
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
        float a = clamp( vAlpha * ( 0.62 + fres * 0.5 ), 0.0, 1.0 );
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
  skipAoPrepass(mesh, () => {
    mat.uniforms.uTime.value = performance.now() * 0.001;
  });
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
