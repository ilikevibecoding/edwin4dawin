import * as THREE from 'three';
import { fbm, lerp, smoothstep } from './textures/core.js';
import {
  detailNormal,
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
const FINE = 6; // sub-quads per corridor cell -> 0.39 m
const CORRIDOR = 9; // metres either side of the centreline that gets the fine grid

const ROAD_HALF = 1.8; // compacted running surface, half width
const SHOULDER = 1.7; // loose material beyond the compacted surface
const RUT_C = 0.845; // rut centres — the truck's track half width, so it drives in its own ruts
const RUT_W = 0.38;

// Vertical budget: the suspension has 0.11 m of travel and the body rides on
// heightAt() at the truck's centre, so the crown-to-rut drop has to stay
// inside that or the wheels hang above the dirt.
const CROWN_H = 0.04;
const RUT_D = 0.07;
const BERM_H = 0.22;

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
    out.dist = Math.sqrt(best);
    out.lat = (x - cx[bi]) * ctz[bi] - (z - cz[bi]) * ctx[bi];
    out.y = cy[bi];
    out.t = bi / (SAMPLES - 1);
    out.s = cs[bi];
    return out;
  }

  /** Lateral wander of the two-track inside its corridor, in metres. */
  function roadShift(s) {
    return (fbm(s * 0.048, 3.7, { octaves: 3, period: 64, seed: 88 }) - 0.5) * 1.15;
  }

  /** Wobble on the corridor edge, so the boundary is never a clean ribbon. */
  function edgeWobble(s) {
    return (
      (fbm(s * 0.085, 8.3, { octaves: 3, period: 64, seed: 23 }) - 0.5) * 1.5 +
      (fbm(s * 0.34, 2.1, { octaves: 2, period: 64, seed: 61 }) - 0.5) * 0.5
    );
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
    const edge = ax - edgeWobble(nr.s);

    // a grader cuts a steep face into the uphill side and rolls a wider fill
    // out below, so the transition width follows the cross slope
    const cut = base - nr.y;
    const fall = lerp(3.7, 1.8, smoothstep(-0.6, 1.6, cut));
    const grade = 1 - smoothstep(ROAD_HALF + 0.1, ROAD_HALF + 0.1 + fall, edge);

    let y = base + (nr.y - base) * grade;
    const rut = Math.exp(-((ax - RUT_C) ** 2) / (2 * RUT_W ** 2));
    const crown = 1 - smoothstep(0.14, 0.62, ax);
    const berm = Math.exp(-((edge - (ROAD_HALF + 0.75)) ** 2) / (2 * 0.9 ** 2));
    y += grade * (crown * CROWN_H - rut * RUT_D);
    y += smoothstep(0.05, 0.5, grade) * berm * BERM_H;

    // lumpy forest floor, flattened out on the compacted surface. The fine
    // chop only exists where the dense corridor mesh can carry it.
    const smoothOut = 1 - grade * 0.86;
    y += (fbm(x * 0.128, z * 0.128, { octaves: 3, period: 64, seed: 29 }) - 0.5) * 0.5 * smoothOut;
    const near = 1 - smoothstep(CORRIDOR * 0.6, CORRIDOR * 1.55, nr.dist);
    if (near > 0.001) {
      y += (fbm(x * 0.36, z * 0.36, { octaves: 3, period: 64, seed: 5 }) - 0.5) * 0.14 * near * (1 - grade * 0.7);
    }

    out.y = y;
    out.side = THREE.MathUtils.clamp(side, -20, 20);
    out.edge = THREE.MathUtils.clamp(edge, -2, 20);
    out.along = nr.s;
    out.dist = nr.dist;
    return out;
  }

  const makeInfo = () => ({ near: { dist: 0, lat: 0, y: 0, t: 0, s: 0 }, y: 0, side: 0, edge: 0, along: 0, dist: 0 });
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
  const index = vertCount > 65535 ? new Uint32Array(triCount * 3) : new Uint16Array(triCount * 3);

  /**
   * Analytic normal. The sample radius is a continuous function of the
   * distance to the road — never of the cell size — so two cells at different
   * densities produce the same normal at a shared position and there is no
   * shading seam on the boundary.
   */
  function writeVertex(k, x, z, yOverride) {
    const info = surfaceInfo(x, z, _vInfo);
    const e = lerp(1.15, 0.3, 1 - smoothstep(CORRIDOR * 0.6, CORRIDOR * 1.55, info.dist));
    const y = yOverride === undefined ? info.y : yOverride;
    const side = info.side;
    const edge = info.edge;
    const along = info.along;
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
  geo.setIndex(new THREE.BufferAttribute(index, 1));
  geo.computeBoundingSphere();

  // --- material ------------------------------------------------------------
  const track = trackMaps();
  const verge = vergeMaps();
  const litter = litterMaps();
  const tread = treadImprint();
  const detail = detailNormal();
  const macro = macroVariation();

  const material = new THREE.MeshStandardMaterial({
    map: track.map,
    normalMap: track.normal,
    normalScale: new THREE.Vector2(1.6, 1.6),
    roughness: 1.0,
    metalness: 0.0,
    // the key rakes in at 26 degrees and the canopy eats most of it, so the
    // sky has to do the lifting in shade or the dirt under the truck is a
    // black hole in every close framing
    envMapIntensity: 3.2,
    color: 0xffffff,
    dithering: true,
  });

  const uniforms = {
    uVergeMap: { value: verge.map },
    uVergeNrm: { value: verge.normal },
    uLitterMap: { value: litter.map },
    uLitterNrm: { value: litter.normal },
    uDetailNrm: { value: detail },
    uMacro: { value: macro },
    uTread: { value: tread.normal },
    // metres per tile: track, verge, litter
    uScale: { value: new THREE.Vector3(1 / 2.6, 1 / 2.2, 1 / 2.4) },
    uDetailScale: { value: 2.2 },
    uMacroScale: { value: 1 / 110 },
    uJitterScale: { value: 1 / 5.2 },
    uTreadPitch: { value: tread.pitch },
    uMean: { value: new THREE.Vector2(Math.max(track.mean, 0.01), Math.max(litter.mean, 0.01)) },
    uRoad: { value: new THREE.Vector4(ROAD_HALF, SHOULDER, RUT_C, RUT_W) },
    uWet: { value: 0.45 },
    uContacts: { value: [new THREE.Vector4(), new THREE.Vector4(), new THREE.Vector4(), new THREE.Vector4()] },
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
        varying float vSide;
        varying float vEdge;
        varying float vAlong;
        varying vec2 vTile;
        varying vec3 vWorld;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vSide = aSide;
        vEdge = aEdge;
        vAlong = aAlong;
        vec4 wp = modelMatrix * vec4( transformed, 1.0 );
        vWorld = wp.xyz;
        vTile = wp.xz;`,
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform sampler2D uVergeMap, uVergeNrm, uLitterMap, uLitterNrm;
        uniform sampler2D uDetailNrm, uMacro, uTread;
        uniform vec3 uScale;
        uniform vec4 uRoad;
        uniform vec4 uContacts[ 4 ];
        uniform float uDetailScale, uMacroScale, uJitterScale, uTreadPitch, uWet;
        uniform float uDebug;
        uniform vec2 uMean;
        varying float vSide;
        varying float vEdge;
        varying float vAlong;
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
        float axj = vEdge + jit * 0.6;
        float mTrack = 1.0 - smoothstep( uRoad.x - 0.45, uRoad.x + 0.7, axj );
        float mVerge = smoothstep( uRoad.x - 1.3, uRoad.x + 0.45, axj ) *
                       ( 1.0 - smoothstep( uRoad.x + 0.8, uRoad.x + uRoad.y + 0.7, axj ) );
        // squared by hand: pow() of a negative base is undefined and one NaN
        // pixel spreads through the bloom and blacks out the frame
        float dRut = ax - uRoad.z;
        float mRut = exp( -( dRut * dRut ) / ( 2.0 * uRoad.w * uRoad.w ) ) * mTrack;
        float mCrown = ( 1.0 - smoothstep( 0.18, 0.66, ax + jit * 0.3 ) ) * mTrack;

        vec4 tTrack = texture2D( map, uvT );
        vec4 tTrack2 = texture2D( map, uvT * 0.27 + 0.41 );
        vec4 tVerge = texture2D( uVergeMap, uvV );
        vec4 tLit = texture2D( uLitterMap, uvL );
        vec4 tLit2 = texture2D( uLitterMap, uvL * 0.23 + 0.67 );
        vec4 nTrack = texture2D( normalMap, uvT );
        vec4 nVerge = texture2D( uVergeNrm, uvV );
        vec4 nLit = texture2D( uLitterNrm, uvL );
        float detailFade = 1.0 - smoothstep( 9.0, 26.0, length( vWorld - cameraPosition ) );
        vec4 nDetail4 = texture2D( uDetailNrm, vTile * uDetailScale );

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
                       smoothstep( 0.2, 0.62, rsp.r );
        float printAo = mix( 1.0, tread.w, mPrint * 0.9 );
        albedo *= printAo;

        // Two-track legibility comes from the ruts. A rut is where the tyres
        // have polished the fines into a compacted floor: darker and browner
        // than the loose dust around it, except in the driest stretches where
        // it powders back up to pale.
        float wet = clamp( uWet * ( mac.g * 1.5 + mid.b * 1.0 - 1.2 ), 0.0, 1.0 );
        float sweep = mRut * ( 0.6 + tread.w * 0.5 );
        vec3 pale = vec3( 0.315, 0.281, 0.222 );
        // a rut is compacted whatever the weather, so the tint only ever runs
        // from much darker to slightly darker — never up past the dust around it
        float dusty = ( 1.0 - wet ) * smoothstep( 0.55, 0.9, rsp.a );
        vec3 rutTint = mix( vec3( 0.48, 0.44, 0.4 ), vec3( 0.9, 0.87, 0.82 ), dusty );
        albedo *= mix( vec3( 1.0 ), rutTint, sweep );
        float dry = mCrown * ( 0.35 + mac.a * 0.5 );

        // Fines dragged along the direction of travel. A dirt road streaks
        // lengthwise and the world-space tiles cannot know which way that is,
        // so the streak is sampled in road space and stretched 6:1.
        vec4 streak = texture2D( uMacro, vec2( vAlong * 0.42, vSide * 2.6 + 0.7 ) );
        albedo *= mix( 1.0, 0.74 + streak.r * 0.58, mTrack * ( 0.3 + mRut * 0.7 ) * 0.6 );

        // Dry compacted dirt on its own is one pale value from edge to edge.
        // The dark end of the road's range comes from the stretches that hold
        // water and from litter blown in off the forest floor.
        albedo = mix( albedo, albedo * vec3( 0.5, 0.47, 0.46 ), wet * mTrack * 0.85 );
        float drift = mTrack * smoothstep( 0.52, 0.88, streak.b );
        albedo = mix( albedo, cLit * 1.2, drift * 0.6 );

        // Light, dark, light, dark, light across the road: loose dry material
        // survives on the crown and gets pushed out to the shoulder, and those
        // pale bands are what make the compacted ruts read as ruts.
        float mLoose = ( 1.0 - smoothstep( 0.1, 0.95, abs( axj - uRoad.x - 0.15 ) ) ) * mTrack;
        albedo = mix( albedo, albedo * 1.24 + pale * 0.03, mLoose * 0.6 );
        albedo = mix( albedo, albedo * 1.14 + pale * 0.02, mCrown * 0.5 );

        // Vegetation surviving down the middle of the two-track. Clumped along
        // the road and shot through with the litter tile's own detail, or it
        // reads as a green line painted down the crown.
        float lum = dot( tLit.rgb, vec3( 0.2126, 0.7152, 0.0722 ) ) / uMean.y;
        float mVeg = mCrown * smoothstep( 0.26, 0.58, rsp.b ) * ( 0.4 + smoothstep( 0.3, 0.9, lum ) * 0.6 );
        vec3 veg = mix( vec3( 0.052, 0.068, 0.024 ), vec3( 0.116, 0.098, 0.04 ), mac.b );
        albedo = mix( albedo, veg * ( 0.5 + lum * 0.9 ), mVeg * 0.9 );

        // large scale value and warmth variation, so 2 m tiles never read as
        // a repeating pattern in a wide shot
        albedo *= mix( 0.86, 1.18, mac.r ) * mix( 0.93, 1.08, mid.g );
        albedo *= mix( vec3( 0.95, 0.97, 1.02 ), vec3( 1.07, 1.0, 0.9 ), mac.a );
        albedo = mix( albedo, albedo * 1.18, dry );

        // wheels press the dirt down and shade it
        float contact = 0.0;
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
          float k = c.w * ( 1.0 - smoothstep( 0.1, 0.34, r ) ) * fall;
          // material thrown out around the patch
          scatter = max( scatter, c.w * fall * ( 1.0 - smoothstep( 0.3, 0.72, r ) ) * smoothstep( 0.14, 0.34, r ) );
          if ( k > contact ) { contact = k; contactDir = d / r; }
        }
        albedo *= mix( 1.0, 0.62, contact );
        albedo *= 1.0 + scatter * ( 0.4 + jit * 0.9 );
        // grain in the albedo up close, so nothing within reach is ever flat
        albedo *= mix( 1.0, 0.62 + nDetail4.w * 0.5, detailFade );

        diffuseColor.rgb *= albedo;
        if ( uDebug > 0.5 ) diffuseColor.rgb = vec3( mTrack * 0.5 + mVerge * 0.5, mRut, mPrint );
        if ( uDebug > 2.5 ) albedo = vec3( sweep, mRut, mPrint );`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `float roughnessFactor = roughness * mix( mix( tLit.a, tVerge.a, mVerge ), tTrack.a, mTrack );
        roughnessFactor = mix( roughnessFactor, 0.6, wet * sweep * 0.9 );
        roughnessFactor = clamp( roughnessFactor + dry * 0.06 - sweep * 0.1, 0.05, 1.0 );`,
      )
      .replace(
        '#include <normal_fragment_maps>',
        `vec3 mapN = mix( nLit.xyz, nVerge.xyz, mVerge );
        mapN = mix( mapN, nTrack.xyz, mTrack ) * 2.0 - 1.0;
        mapN.xy += ( tread.xy * 2.0 - 1.0 ) * mPrint * 1.15;
        mapN.xy += ( nDetail4.xy * 2.0 - 1.0 ) * 0.75 * detailFade;
        // the tyre sinks in: tilt the surface into the contact patch
        mapN.xy -= contactDir * contact * 1.7;
        mapN.xy *= normalScale;
        normal = normalize( tbn * mapN );`,
      )
      .replace(
        '#include <aomap_fragment>',
        `float ambientOcclusion = clamp( surfAo * printAo, 0.0, 1.0 ) * mix( 1.0, 0.4, contact );
        // a rut is a trough: it sees less of the sky than the crown beside it
        ambientOcclusion *= mix( 1.0, 0.82, mRut );
        // light that bounces between the facets of a rough surface comes back
        // carrying its albedo twice, so ambient-lit dirt is warmer and more
        // saturated than a single-bounce diffuse term makes it. Without this
        // the shaded ground is lit by sky alone and reads as cool grey.
        reflectedLight.indirectDiffuse *= ambientOcclusion * vec3( 1.14, 1.0, 0.84 );
        if ( uDebug > 1.5 ) {
          reflectedLight.directDiffuse = albedo;
          reflectedLight.indirectDiffuse = vec3( 0.0 );
          reflectedLight.directSpecular = vec3( 0.0 );
          reflectedLight.indirectSpecular = vec3( 0.0 );
        }
        #if defined( USE_ENVMAP ) && defined( STANDARD )
          float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
          // envMapIntensity is turned up well past one to keep shaded dirt off
          // the floor, and that lands on the specular IBL too: at the grazing
          // angles every close framing looks along, Fresnel goes to one and the
          // sky reflection buries the albedo under a flat pale sheet. Dirt has
          // a sheen at glancing incidence but not that much of one.
          reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness ) * 0.22;
        #endif`,
      );
  };
  material.customProgramCacheKey = () => 'terrain-blend-v2';

  const mesh = new THREE.Mesh(geo, material);
  mesh.name = 'terrain';
  mesh.receiveShadow = true;
  mesh.castShadow = false;
  if (env) material.envMap = env;

  contactSink = uniforms.uContacts.value;

  return {
    mesh,
    material,
    curve,
    heightAt: surfaceHeight,
    roadDistance: (x, z) => nearestRoad(x, z).dist,
    roadHalf: ROAD_HALF,
    shoulder: SHOULDER,
    size: SIZE,
    stats: { vertCount, triCount, fineCells },
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
