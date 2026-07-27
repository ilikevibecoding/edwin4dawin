import * as THREE from 'three';
import { clamp as clamp01, fbm, lerp, mulberry32, smoothstep } from './textures/core.js';
import {
  detailNormal,
  grainMaps,
  litterMaps,
  macroVariation,
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
const LIP_H = 0.032;
const BERM_H = 0.24;

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

  const _near = { dist: 1e6, lat: 1e6, y: 0, t: 0, s: 0 };

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
    const stretch = smoothstep(0.24, 0.54, fbm(along * 0.019 + 4.1, 2.7, { octaves: 3, period: 64, seed: 203 }));
    // Roughly 5 m of road per blob, and only the top of each one holds water, so
    // a puddle is one to two metres long. At a 7 m wavelength and a low
    // threshold the water joined up into a continuous ribbon down the rut and
    // read as a drainage canal rather than as standing water.
    const blob = fbm(along * 0.2, 9.3 + ax * 0.4, { octaves: 3, period: 64, seed: 311 });
    return clamp01((blob - 0.46) * 4.4) * stretch * trough * grade;
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
    const crown = 1 - smoothstep(0.1, 0.5, ax);
    const berm = Math.exp(-((edge - (ROAD_HALF + 0.75)) ** 2) / (2 * 0.9 ** 2));
    y += grade * (crown * CROWN_H - rut * RUT_D * clamp01(wear) * wash + lip * LIP_H * clamp01(wear));
    y += smoothstep(0.05, 0.5, grade) * berm * BERM_H;
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
    }

    out.y = y;
    out.side = THREE.MathUtils.clamp(side, -20, 20);
    out.edge = THREE.MathUtils.clamp(edge, -2, 20);
    out.along = nr.s;
    out.dist = nr.dist;
    out.wet = wet;
    out.grade = grade;
    return out;
  }

  const makeInfo = () => ({
    near: { dist: 0, lat: 0, y: 0, t: 0, s: 0 },
    y: 0,
    side: 0,
    edge: 0,
    along: 0,
    dist: 0,
    wet: 0,
    grade: 0,
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
    envMapIntensity: 2.1,
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
        varying float vSide;
        varying float vEdge;
        varying float vAlong;
        varying float vWet;
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
        uniform vec3 uScale;
        uniform vec2 uGrainScale;
        uniform vec4 uRoad;
        uniform vec4 uContacts[ 4 ];
        uniform float uDetailScale, uMacroScale, uJitterScale, uTreadPitch, uWet;
        uniform float uDebug;
        uniform vec2 uMean;
        varying float vSide;
        varying float vEdge;
        varying float vAlong;
        varying float vWet;
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

        float ax = abs( vSide );
        // jitter tapered the same way vEdge's wobble is, and at a fifth of the
        // amplitude: everything keyed off axj has to stay clear of the rut band
        float axj = vEdge + jit * 0.24 * smoothstep( uRoad.x * 0.5, uRoad.x * 1.3, ax );
        float mTrack = 1.0 - smoothstep( uRoad.x - 0.15, uRoad.x + 0.55, axj );
        // Inner edge pulled in from roadHalf - 1.3. On a narrow trail the old
        // figure put loose verge gravel over the crown and the ruts, which is
        // most of why the trail read as one undifferentiated wash.
        float mVerge = smoothstep( uRoad.x - 0.1, uRoad.x + 0.5, axj ) *
                       ( 1.0 - smoothstep( uRoad.x + 0.75, uRoad.x + uRoad.y + 0.35, axj ) );
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

        vec4 tTrack = texture2D( map, uvT );
        vec4 tTrack2 = texture2D( map, uvT * 0.27 + 0.41 );
        vec4 tVerge = texture2D( uVergeMap, uvV );
        vec4 tLit = texture2D( uLitterMap, uvL );
        vec4 tLit2 = texture2D( uLitterMap, uvL * 0.23 + 0.67 );
        vec4 nTrack = texture2D( normalMap, uvT );
        vec4 nVerge = texture2D( uVergeNrm, uvV );
        vec4 nLit = texture2D( uLitterNrm, uvL );
        float camDist = length( vWorld - cameraPosition );
        float detailFade = 1.0 - smoothstep( 9.0, 26.0, camDist );
        vec4 nDetail4 = texture2D( uDetailNrm, vTile * uDetailScale );
        // Second tier of the same grit at four times the frequency, faded in
        // over the last few metres. The wheel and contact framings sit 30 cm
        // off the dirt, where a 45 cm tile is already smooth.
        float gritFade = 1.0 - smoothstep( 2.2, 7.0, camDist );
        vec4 nGrit = texture2D( uDetailNrm, vTile * uDetailScale * 4.3 + 0.21 );
        // Close-range aggregate as a multiplicative tint, at two scales. This
        // is what carries chroma detail in the bottom of the frame, where the
        // 2.6 m surface tile is magnified sevenfold and has nothing left.
        vec3 grainA = texture2D( uGrain, vTile * uGrainScale.x ).rgb * 2.0;
        vec4 grainB4 = texture2D( uGrain, vTile * uGrainScale.y + 0.53 );
        // Clod tier, 1.3 m. Between the 2.6 m surface tile and the 40 cm
        // aggregate there was nothing at all, so a metre of trail in the bottom
        // of a low framing carried detail at two scales with a hole between
        // them — which is what "mushy" actually looks like. A graded surface
        // dries and breaks into plates about this size.
        vec4 clod = texture2D( uMacro, vTile * 0.78 + vec2( 0.29, 0.83 ) );

        vec3 cTrack = breakUp( tTrack.rgb, tTrack2.rgb, uMean.x );
        vec3 cLit = breakUp( tLit.rgb, tLit2.rgb, uMean.y );

        vec3 albedo = mix( cLit, tVerge.rgb, mVerge );
        albedo = mix( albedo, cTrack, mTrack );
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
        vec4 tread = texture2D( uTread, vec2( treadU + 0.5, vAlong / uTreadPitch ) );
        float mPrint = ( 1.0 - smoothstep( 0.34, 0.55, abs( treadU ) ) ) * mTrack *
                       smoothstep( 0.02, 0.4, rsp.r );
        // Eaten into by the grit up close. A tyre print a foot from the camera is
        // a worn hollow with fines washed into it, not a clean stamp — at full
        // strength the imprint tile read as a row of rubber rings pressed into
        // lino below about half a metre.
        mPrint *= mix( 1.0, 0.4 + nGrit.w * 0.85, gritFade );
        // Floored well off zero. The imprint's occlusion channel bottoms out at
        // 0.42, which is a reasonable hollow at three metres and a black arc
        // stamped into tan at thirty centimetres, where one lug gap covers a
        // hundred pixels.
        float printAo = mix( 1.0, 0.62 + tread.w * 0.38, mPrint * 0.9 );
        albedo *= printAo;

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
        float sweep = mRut * ( 0.66 + tread.w * 0.44 );
        // the driest a rut ever gets is still darker than the crown beside it
        float dusty = ( 1.0 - damp ) * smoothstep( 0.5, 0.92, rsp.a );
        vec3 rutTint = mix( vec3( 0.3, 0.265, 0.245 ), vec3( 0.66, 0.62, 0.55 ), dusty );
        albedo *= mix( vec3( 1.0 ), rutTint, sweep );
        float dry = mCrown * ( 0.3 + mac.a * 0.5 ) * ( 1.0 - damp * 0.7 );

        // Fines dragged along the direction of travel. A dirt road streaks
        // lengthwise and the world-space tiles cannot know which way that is,
        // so the streak is sampled in road space and stretched 6:1.
        vec4 streak = texture2D( uMacro, vec2( vAlong * 0.42, vSide * 2.6 + 0.7 ) );
        albedo *= mix( 1.0, 0.72 + streak.r * 0.52, mTrack * ( 0.3 + mRut * 0.7 ) * 0.7 );

        // Damp earth is darker and more saturated than dry earth, not just
        // darker: water fills the pores between the fines so light stops
        // scattering back out of the top millimetre. Eased off the crown, which
        // is the one strip that has to stay lighter than the ruts either side.
        albedo = mix( albedo, albedo * vec3( 0.62, 0.56, 0.5 ), damp * mTrack * 0.75 * ( 1.0 - mCrown * 0.55 ) );
        float drift = mTrack * smoothstep( 0.62, 0.94, streak.b );
        albedo = mix( albedo, cLit, drift * 0.4 );

        // Dark, light, dark across the road, with the ruts as the dark bands:
        // loose dry material survives on the crown between the wheels and gets
        // pushed out onto the shoulder, and those two paler strips are what make
        // the ruts read as ruts from a distance.
        float mLoose = ( 1.0 - smoothstep( 0.08, 0.8, abs( axj - uRoad.x - 0.05 ) ) ) * mTrack;
        // greyer as well as lighter: this is dried fines and coarse material,
        // and lifting the value alone just made a bright tan stripe
        albedo *= mix( vec3( 1.0 ), vec3( 1.13, 1.17, 1.22 ), mLoose * 0.8 );
        albedo *= mix( vec3( 1.0 ), vec3( 1.24, 1.24, 1.2 ), mCrown * 0.8 );

        // Vegetation surviving down the middle of the two-track. Clumped along
        // the road and shot through with the litter tile's own detail, or it
        // reads as a green line painted down the crown. Tight to the centreline:
        // spread over the whole crown it puts a green cast on the trail.
        // Broken along the road and shot through with the streak field: a
        // continuous band of it down the exact centre reads as a mown grass line
        // painted on the trail, which is what a 0.34 m hard-edged mask gave.
        float lum = dot( tLit.rgb, vec3( 0.2126, 0.7152, 0.0722 ) ) / uMean.y;
        float mVeg = ( 1.0 - smoothstep( 0.1, 0.52, ax + jit * 0.3 ) ) * mTrack *
                     smoothstep( 0.34, 0.72, rsp.b ) * smoothstep( 0.2, 0.6, streak.g ) *
                     ( 0.35 + smoothstep( 0.3, 0.9, lum ) * 0.65 );
        vec3 veg = mix( vec3( 0.046, 0.056, 0.026 ), vec3( 0.1, 0.088, 0.042 ), mac.b );
        albedo = mix( albedo, veg * ( 0.5 + lum * 0.9 ), mVeg * 0.85 );

        // large scale value and warmth variation, so 2 m tiles never read as
        // a repeating pattern in a wide shot. Narrower than it was: at ±20% it
        // was throwing patches across the road big enough to compete with the
        // rut bands for the eye.
        albedo *= mix( 0.88, 1.1, mac.r ) * mix( 0.94, 1.06, mid.g );
        // Warmth variation, held to a much narrower spread than it was. The
        // clay tint in the tile, this term and the warm bounce below all pull
        // the same way, and together they were taking the trail past PNW brown
        // into red laterite.
        albedo *= mix( vec3( 0.96, 0.99, 1.03 ), vec3( 1.04, 1.0, 0.94 ), mac.a );
        albedo = mix( albedo, albedo * 1.12, dry );

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
        albedo = mix( albedo, albedo * vec3( 0.58, 0.62, 0.68 ), water * 0.9 );
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
        albedo *= mix( 1.0, 0.54, contact );
        albedo *= 1.0 + scatter * ( 0.6 + jit * 1.0 );
        // Grain in the albedo up close, so nothing within reach is ever flat.
        // The tint tiers carry hue as well as value — a pebble that is only
        // darker still reads as a smudge, a pebble that is darker *and* greyer
        // than the earth around it reads as a stone.
        // Damped inside the rut: the trough is polished, and stacking two tiers
        // of pebble tint over it turned the one band that has to read as packed
        // and smooth into the roughest thing in the frame.
        float loose = 1.0 - sweep * 0.62;
        albedo *= mix( 1.0, 0.84 + clod.r * 0.34, detailFade * 0.75 );
        albedo *= mix( vec3( 1.0 ), grainA, detailFade * 0.8 * loose );
        albedo *= mix( vec3( 1.0 ), grainB4.rgb * 2.0, gritFade * 0.6 * loose );
        albedo *= mix( 1.0, 0.72 + nDetail4.w * 0.42, detailFade * loose );
        albedo *= mix( 1.0, 0.76 + nGrit.w * 0.36, gritFade * loose );
        // water is a mirror, not a diffuser: kill whatever aggregate the tint
        // tiers just put into it
        albedo = mix( albedo, albedo * vec3( 0.9, 0.94, 1.0 ), water * 0.5 );

        diffuseColor.rgb *= albedo;
        if ( uDebug > 0.5 ) diffuseColor.rgb = vec3( mTrack * 0.5 + mVerge * 0.5, mRut, mPrint );
        if ( uDebug > 2.5 ) albedo = vec3( sweep, mRut, mPrint );
        if ( uDebug > 3.5 ) diffuseColor.rgb = vec3( water, soak, damp );`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `float roughnessFactor = roughness * mix( mix( tLit.a, tVerge.a, mVerge ), tTrack.a, mTrack );
        roughnessFactor *= mix( 1.0, mix( grainB4.a, 1.0, 1.0 - gritFade ), 0.9 );
        // a compacted rut floor is polished by the tyres; damp fines are
        // smoother again
        roughnessFactor = mix( roughnessFactor, 0.66, sweep * ( 0.35 + damp * 0.5 ) );
        // The rim stops at 0.68. Dropping it to 0.5 put a low-roughness sheen on
        // ground that still has full aggregate normals on it, and the result was
        // a band of hard warm sparkle around every puddle.
        roughnessFactor = mix( roughnessFactor, 0.76, soak * 0.7 );
        // Open water. 0.18 spreads the sun's own lobe over ten degrees of
        // surface, and a puddle seen from standing height is most of ten degrees
        // wide — so the whole pool lit up as one flat mustard plate with a dark
        // rim, reading as a bald patch rather than as water. Tight enough now
        // that the sun is a glint and the sky is a legible reflection; the
        // ripple normal below is what keeps that from reading as sheet ice.
        roughnessFactor = mix( roughnessFactor, 0.13, water );
        roughnessFactor = clamp( roughnessFactor + dry * 0.06, 0.05, 1.0 );`,
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
        mapN.xy *= mix( 1.0, 0.62, gritFade );
        // Tapered close in. At 1.15 the lug walls tilt far enough to face away
        // from the key entirely, and a micro-facet with no light on it is black —
        // which is what turned the print into a row of hard crescents in the
        // bottom of the low framings. Full strength is still what makes it read
        // at three to eight metres, so only the near end is pulled back.
        mapN.xy += ( tread.xy * 2.0 - 1.0 ) * mPrint * 0.9 * mix( 1.0, 0.5, gritFade );
        mapN.xy += ( nDetail4.xy * 2.0 - 1.0 ) * 0.85 * detailFade * loose;
        // The 11 cm and 1.3 m tiers are at the right scale for a camera this
        // close, and neither carries the surface tile's worley stone caps, so
        // they can take over the relief the line above gave up.
        mapN.xy += ( nGrit.xy * 2.0 - 1.0 ) * 1.05 * gritFade * loose;
        mapN.xy += ( clod.rg - 0.5 ) * 0.68 * detailFade * loose;
        // the tyre sinks in: tilt the surface into the contact patch
        mapN.xy -= contactDir * contact * 2.4;
        mapN.xy *= normalScale;
        // A water surface is flat, whatever the dirt under it is doing — but
        // dead flat reflects the sky as one uniform plate, and a uniform plate
        // is a bald patch, not a puddle. A trace of ripple gives the sheen a
        // direction and an edge to catch on. It has to be a *slow* ripple: at a
        // 27 cm tile this was a few pixels across at two metres, and a few-pixel
        // normal under a 0.1 roughness is not a sheen, it is a field of hard
        // white glints — the snow speckle this whole surface started out with.
        vec4 rip = texture2D( uMacro, vTile * 0.9 + vec2( 0.13, 0.61 ) );
        mapN = mix( mapN, vec3( ( rip.rg - 0.5 ) * 0.15, 1.0 ), water * 0.94 );
        normal = normalize( tbn * mapN );`,
      )
      .replace(
        '#include <aomap_fragment>',
        `float ambientOcclusion = clamp( surfAo * printAo, 0.0, 1.0 ) * mix( 1.0, 0.55, shade );
        // a rut is a trough: it sees less of the sky than the crown beside it,
        // and the lip squeezed up either side shades it further
        ambientOcclusion *= mix( 1.0, 0.72, mRut );
        ambientOcclusion *= mix( 1.0, 0.85, soak );
        // crevice occlusion from the close-range tiers. This is what keeps the
        // bottom of a low framing from going to a smooth wash: at 0.3 m the
        // only thing with any structure left is the 11 cm tile.
        ambientOcclusion *= mix( 1.0, 0.62 + nGrit.w * 0.52, gritFade * 0.9 );
        ambientOcclusion *= mix( 1.0, 0.84 + clod.b * 0.3, detailFade * 0.7 );
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
        reflectedLight.indirectDiffuse += albedo * 0.24 * ambientOcclusion * ( 1.0 - water );
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
            computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness ) * mix( 0.24, 1.15, water * water );
        #endif`,
      );
  };
  material.customProgramCacheKey = () => 'terrain-blend-v3';

  const mesh = new THREE.Mesh(geo, material);
  mesh.name = 'terrain';
  mesh.receiveShadow = true;
  mesh.castShadow = false;
  if (env) material.envMap = env;

  // Hung off the terrain mesh rather than a wrapper group so everything that
  // already reaches for terrain.mesh.geometry or toggles its visibility keeps
  // working, and one scene.add still brings the whole ground in.
  const stones = buildStones(curve, surfaceInfo, env);
  mesh.add(stones);

  contactSink = uniforms.uContacts.value;

  return {
    mesh,
    stones,
    material,
    curve,
    heightAt: surfaceHeight,
    roadDistance: (x, z) => nearestRoad(x, z).dist,
    roadHalf: ROAD_HALF,
    shoulder: SHOULDER,
    size: SIZE,
    stats: { vertCount, triCount, fineCells, stoneTris: stones.geometry.attributes.position.count / 3 },
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
// Stones embedded in the corridor.
//
// A texture cannot put a silhouette on the ground, and the close framings sit
// 30 cm off the dirt where a silhouette is exactly what is missing. These are
// merged into one static buffer rather than instanced: at twenty triangles a
// stone the draw call is the only cost worth caring about, and merging lets
// every stone be a different lump with its own baked colour instead of one
// shape repeated at different scales.
// ---------------------------------------------------------------------------

const STONE_COUNT = 1000;

function buildStones(curve, surfaceInfo, env) {
  const rnd = mulberry32(0x51a7);
  const info = {
    near: { dist: 0, lat: 0, y: 0, t: 0, s: 0 },
    y: 0,
    side: 0,
    edge: 0,
    along: 0,
    dist: 0,
    wet: 0,
    grade: 0,
  };

  const src = new THREE.IcosahedronGeometry(1, 0);
  const srcPos = (src.index ? src.toNonIndexed() : src).attributes.position.array;
  const triPerStone = srcPos.length / 9;
  const total = STONE_COUNT * triPerStone * 3;
  const pos = new Float32Array(total * 3);
  const nrm = new Float32Array(total * 3);
  const col = new Float32Array(total * 3);
  const uv = new Float32Array(total * 2);

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
  const jitter = new Float32Array(srcPos.length);

  let w = 0;
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
    const big = rnd() < 0.12;
    // The big tier stopped at 23 cm, which is a facet a hand's width across —
    // large enough that a single flat triangle of it reads as a dropped object
    // rather than as stone in the ground.
    const r = big ? 0.09 + rnd() * 0.085 : 0.04 + rnd() * 0.062;
    s.set(r * (0.75 + rnd() * 0.5), r * (0.4 + rnd() * 0.42), r * (0.75 + rnd() * 0.5));
    e.set(rnd() * 6.283, rnd() * 6.283, rnd() * 6.283);
    q.setFromEuler(e);
    // Sunk so only a cap shows, like something the grader pressed in. A convex
    // lump sitting proud of the surface reads as an object dropped on the road
    // however well it is coloured.
    m.compose(new THREE.Vector3(x, info.y - s.y * (0.46 + rnd() * 0.34), z), q, s);

    // Aggregate value, skewed dark for the same reason the textures are: a
    // scatter of light pebbles over a dark trail reads as gravel spilled on it.
    // The range is narrow and centred near the dirt's own 0.07 linear, because
    // the first pass ran 0.1-0.5 and eighteen hundred of them peppered the
    // whole trail with black flecks.
    // Top of the range sits at about the dirt's own albedo, not above it. The
    // terrain knocks its tile down with occlusion, grain and clod tints before
    // anything is lit, so a stone keyed to the raw tile mean still renders two
    // to three times brighter than the ground it is sitting in — which is a
    // pale flake with straight edges, whatever colour it is.
    const v = rnd() ** 2.1;
    const shade = 0.048 + v * 0.05;
    // Hue in the dirt's own family. The first pass multiplied only the red
    // channel and left green and blue pinned near 1.0, which makes an
    // achromatic chip — and an achromatic chip on warm brown earth reads as a
    // shard of plastic at any brightness, which is exactly what it did. Most
    // stones are brown like the clay they sit in; the tail runs to grey gravel.
    const grey = rnd() ** 1.6;
    const cg = 0.74 + grey * 0.21;
    const cb = 0.54 + grey * 0.3;

    // per-stone vertex jitter so no two lumps share a silhouette
    for (let i = 0; i < srcPos.length; i += 3) {
      const k = 0.72 + rnd() * 0.5;
      jitter[i] = srcPos[i] * k;
      jitter[i + 1] = srcPos[i + 1] * k;
      jitter[i + 2] = srcPos[i + 2] * k;
    }

    for (let f = 0; f < triPerStone; f++) {
      const o = f * 9;
      a.set(jitter[o], jitter[o + 1], jitter[o + 2]).applyMatrix4(m);
      b.set(jitter[o + 3], jitter[o + 4], jitter[o + 5]).applyMatrix4(m);
      c.set(jitter[o + 6], jitter[o + 7], jitter[o + 8]).applyMatrix4(m);
      // cross( b - a, c - a ) — the other way round gives the inward normal,
      // which lights every stone from behind and renders it as a black chip
      n.crossVectors(ab.subVectors(b, a), ac.subVectors(c, a)).normalize();
      // Shading normal leaned toward vertical. A twenty-facet lump pressed into
      // the dirt has facets pointing every which way, and any one of them that
      // happens to face an 8.8-intensity sun renders as a flat pale triangle
      // with straight edges — the "chips of paper on the trail". Leaning the
      // shading normal toward the ground's own keeps the silhouette and the
      // facet break while cutting the spread of N.L that caused it. There is no
      // hand-rolled sky term here any more either: the environment map already
      // gives an upward facet more irradiance than a vertical one, and adding a
      // second n.y brightening on top of it was double-counting.
      ns.copy(n).lerp(UP, 0.62).normalize();
      const verts = [a, b, c];
      for (let vi = 0; vi < 3; vi++) {
        const q3 = w * 3;
        pos[q3] = verts[vi].x;
        pos[q3 + 1] = verts[vi].y;
        pos[q3 + 2] = verts[vi].z;
        nrm[q3] = ns.x;
        nrm[q3 + 1] = ns.y;
        nrm[q3 + 2] = ns.z;
        // mottled per face, or a flat-shaded lump reads as a faceted plastic bead
        const mot = 0.88 + (((f * 37 + placed * 13) % 17) / 17) * 0.24;
        col[q3] = shade * mot;
        col[q3 + 1] = shade * cg * mot;
        col[q3 + 2] = shade * cb * mot;
        uv[w * 2] = verts[vi].x * 3.2;
        uv[w * 2 + 1] = verts[vi].z * 3.2;
        w++;
      }
    }
    placed++;
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos.subarray(0, w * 3), 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nrm.subarray(0, w * 3), 3));
  g.setAttribute('color', new THREE.BufferAttribute(col.subarray(0, w * 3), 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv.subarray(0, w * 2), 2));
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
    envMapIntensity: 1.0,
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
  return stoneMesh;
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
