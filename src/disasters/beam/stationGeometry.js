// Voxel geometry for the battle station: the sphere, its equatorial trench, the superlaser crater and the
// emitter nodes are all carved into one block volume (1 block per voxel by default) which is then greedy-
// meshed into a single indexed BufferGeometry. Every vertex carries the axis-aligned face normal and a
// material id (aFace = nx+1, ny+1, nz+1, mat) so the shader can texture each face per block.
//
// Model frame: origin at the sphere centre, +Y = station "north" (the trench lies in the XZ plane), the dish
// axis lies in the YZ plane tilted DISH_LAT above the equator, pointing roughly +Z.
import * as THREE from 'three';

export const MAT = { HULL: 1, LIP: 2, TRENCH: 3, WALL: 4, RIM: 5, BOWL: 6, SEAM: 7, EMITTER: 8 };

const DISH_LAT = 26 * Math.PI / 180;
const RIM_NODES = 8;
const DEG = Math.PI / 180;

// All feature sizes in blocks for a station of radius R.
export function stationLayout(R, voxel = 1) {
  const D = new THREE.Vector3(0, Math.sin(DISH_LAT), Math.cos(DISH_LAT));
  const U = new THREE.Vector3(1, 0, 0);                    // dish-plane basis (perpendicular to D)
  const V = new THREE.Vector3().crossVectors(D, U);        // (0, cos, -sin)
  const a = R * 0.31;                                       // crater radius measured on the sphere surface
  const h = R * 0.15;                                       // bowl depth below the surface
  const rc = (a * a + h * h) / (2 * h);                     // radius of the (negative) bowl sphere
  const L = R - h + rc;                                     // its centre distance from the station centre
  const alpha = Math.asin(a / R);                           // angular radius of the crater edge
  const rimRaise = Math.max(2, Math.round(R * 0.04));
  const rimIn = alpha - 2.5 / R, rimOut = alpha + 3.5 / R;
  const trenchHalf = Math.max(4, R * 0.065);
  const trenchDepth = Math.max(3.5, R * 0.065);
  const lipHalf = trenchHalf + 2, lipRaise = 1;
  const emitterR = L - rc + 1.5;                            // centre emitter sits on the bowl floor
  const nodeAng = (rimIn + rimOut) * 0.5, nodeR = R + rimRaise + 0.5;
  return {
    R, voxel, D, U, V, C: D.clone().multiplyScalar(L), rc, L, alpha, rimIn, rimOut, rimRaise,
    trenchHalf, trenchDepth, lipHalf, lipRaise, emitterR, nodeAng, nodeR, rimNodes: RIM_NODES,
    seamLons: [30, 90, 150, 210, 270, 330].map((d) => d * DEG), seamLat: 52 * DEG, seamMaxLat: 70 * DEG,
    outer: R + Math.max(rimRaise, lipRaise) + 0.5,
  };
}

// Point on the dish rim ring (angle `theta` around the dish axis) at distance `radius` from the centre.
export function ringPoint(lay, theta, radius, out) {
  const sa = Math.sin(lay.nodeAng), ca = Math.cos(lay.nodeAng);
  out.copy(lay.D).multiplyScalar(ca);
  out.addScaledVector(lay.U, sa * Math.cos(theta)).addScaledVector(lay.V, sa * Math.sin(theta));
  return out.multiplyScalar(radius);
}

function emitterCentres(lay) {
  const pts = [lay.D.clone().multiplyScalar(lay.emitterR)];
  for (let i = 0; i < lay.rimNodes; i++) pts.push(ringPoint(lay, (i / lay.rimNodes) * Math.PI * 2, lay.nodeR, new THREE.Vector3()));
  return pts;
}

// Classify one voxel (centre x,y,z in blocks): 0 = empty, else a MAT id.
function makeClassifier(lay) {
  const { R, D, C, rc, rimIn, rimOut, rimRaise, trenchHalf, trenchDepth, lipHalf, lipRaise } = lay;
  const outer2 = lay.outer * lay.outer, R2 = R * R;
  const rc2 = rc * rc, bowlSkin2 = (rc + 1.6) * (rc + 1.6);
  const deep2 = (R - trenchDepth - 1.5) * (R - trenchDepth - 1.5);
  const trenchR = R - trenchDepth, trenchR2 = trenchR * trenchR;
  const lipR2 = (R + lipRaise) * (R + lipRaise), rimR2 = (R + rimRaise) * (R + rimRaise);
  const seams = lay.seamLons.map((p) => ({ nx: Math.cos(p), nz: -Math.sin(p), dx: Math.sin(p), dz: Math.cos(p) }));
  const emit = emitterCentres(lay);
  const emitRad = [2.0].concat(new Array(lay.rimNodes).fill(1.0));
  const emitNear = Math.min(lay.emitterR, lay.nodeR * Math.cos(lay.nodeAng)) - 3;
  return (x, y, z) => {
    const r2 = x * x + y * y + z * z;
    if (r2 > outer2) return 0;
    const dd = x * D.x + y * D.y + z * D.z;             // = r cos(angle to dish axis)
    let dc2 = Infinity;
    if (dd > 0) { const ex = x - C.x, ey = y - C.y, ez = z - C.z; dc2 = ex * ex + ey * ey + ez * ez; }
    // emitter nodes (glowing blocks) win over everything else
    if (dd > emitNear) {
      for (let i = 0; i < emit.length; i++) {
        const e = emit[i], ex = x - e.x, ey = y - e.y, ez = z - e.z;
        if (ex * ex + ey * ey + ez * ez < emitRad[i] * emitRad[i]) return MAT.EMITTER;
      }
    }
    if (dc2 < rc2) return 0;                             // superlaser bowl (void)
    if (r2 < deep2) return dc2 < bowlSkin2 ? MAT.BOWL : MAT.HULL;   // deep interior: never exposed except at the bowl
    const r = Math.sqrt(r2), ay = Math.abs(y);
    if (ay < trenchHalf) return r2 <= trenchR2 ? MAT.TRENCH : 0;
    if (ay < lipHalf) return r2 <= lipR2 ? MAT.LIP : 0;
    if (dd > 0) {
      const t = Math.acos(Math.min(1, dd / r));
      if (t > rimIn && t < rimOut) return r2 <= rimR2 ? MAT.RIM : 0;
      if (r2 > R2) return 0;
      if (dc2 < bowlSkin2) return MAT.BOWL;
    } else if (r2 > R2) return 0;
    // hull: faint seams along a few meridians and one latitude ring per hemisphere
    const lat = Math.asin(Math.max(-1, Math.min(1, y / r)));
    if (Math.abs(lat) < lay.seamMaxLat) {
      for (let i = 0; i < seams.length; i++) {
        const s = seams[i];
        if (x * s.dx + z * s.dz > 0 && Math.abs(x * s.nx + z * s.nz) < 0.5) return MAT.SEAM;
      }
    }
    if (Math.abs(Math.abs(lat) - lay.seamLat) * r < 0.5) return MAT.SEAM;
    return MAT.HULL;
  };
}

// Face material may differ from the cell material: the trench-facing sides of the lip rows are dark walls.
function faceMat(mat, axis, positive, cellCoord) {
  if (mat === MAT.LIP && axis === 1 && (positive ? cellCoord < 0 : cellCoord > 0)) return MAT.WALL;
  return mat;
}

// Greedy-meshed voxel body. Returns { geometry, quads, cells } (cells is the volume, kept for debugging).
export function buildBodyGeometry(lay) {
  const v = lay.voxel;
  let N = Math.ceil((2 * lay.outer) / v) + 2;
  if (N & 1) N++;                                   // even: voxel faces lie on integer model coordinates
  const half = N / 2;
  const classify = makeClassifier(lay);
  const cells = new Uint8Array(N * N * N);
  const outer2 = lay.outer * lay.outer;
  // fill only the cells inside the station's bounding sphere (the array starts out empty)
  for (let i = 0; i < N; i++) {
    const x = (i + 0.5 - half) * v;
    for (let j = 0; j < N; j++) {
      const y = (j + 0.5 - half) * v;
      const rem = outer2 - x * x - y * y;
      if (rem <= 0) continue;
      const zr = Math.sqrt(rem) / v;
      const k0 = Math.max(0, Math.floor(half - 0.5 - zr)), k1 = Math.min(N - 1, Math.ceil(half - 0.5 + zr));
      const row = (i * N + j) * N;
      for (let k = k0; k <= k1; k++) cells[row + k] = classify(x, y, (k + 0.5 - half) * v);
    }
  }
  const pos = [], face = [], index = [];
  let quads = 0;
  const mask = new Uint16Array(N * N);
  const stride = [N * N, N, 1];
  const coord = [0, 0, 0], du = [0, 0, 0], dv = [0, 0, 0];
  const q = [[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]];
  const lo = Math.max(0, Math.floor(half - lay.outer / v) - 1), hi = Math.min(N, Math.ceil(half + lay.outer / v) + 1);
  for (let d = 0; d < 3; d++) {
    const u = (d + 1) % 3, w = (d + 2) % 3;
    const sd = stride[d], su = stride[u], sw = stride[w];
    const nrm = [0, 0, 0];
    for (let s = lo; s <= hi; s++) {
      // mask of exposed faces between slice s-1 and s along axis d; code = mat | side<<8 (side 1 = normal points +d)
      let any = false;                       // (the merge pass below leaves the mask all-zero again)
      const y0 = (s - 1 + 0.5 - half) * v, y1 = (s + 0.5 - half) * v;   // cell coordinates along d (for the lip walls)
      for (let a = lo; a < hi; a++) {
        const rowBase = s * sd + a * su;
        for (let b = lo; b < hi; b++) {
          const i1 = rowBase + b * sw;
          const m0 = s > 0 ? cells[i1 - sd] : 0;
          const m1 = s < N ? cells[i1] : 0;
          if (m0 === 0 && m1 === 0) continue;
          let code = 0;
          if (m0 && !m1) code = faceMat(m0, d, true, y0) | 256;
          else if (!m0 && m1) code = faceMat(m1, d, false, y1);
          if (code) { mask[a * N + b] = code; any = true; }
        }
      }
      if (!any) continue;
      for (let a = lo; a < hi; a++) for (let b = lo; b < hi; b++) {
        const code = mask[a * N + b];
        if (!code) continue;
        let wdt = 1;
        while (b + wdt < hi && mask[a * N + b + wdt] === code) wdt++;
        let hgt = 1;
        outer: while (a + hgt < hi) {
          for (let k = 0; k < wdt; k++) if (mask[(a + hgt) * N + b + k] !== code) break outer;
          hgt++;
        }
        for (let i = 0; i < hgt; i++) for (let k = 0; k < wdt; k++) mask[(a + i) * N + b + k] = 0;
        const positive = (code & 256) !== 0, mat = code & 255;
        nrm[0] = nrm[1] = nrm[2] = 0; nrm[d] = positive ? 1 : -1;
        coord[d] = s; coord[u] = a; coord[w] = b;
        du[0] = du[1] = du[2] = 0; du[u] = hgt;
        dv[0] = dv[1] = dv[2] = 0; dv[w] = wdt;
        for (let c = 0; c < 3; c++) {
          q[0][c] = coord[c]; q[1][c] = coord[c] + du[c]; q[2][c] = coord[c] + du[c] + dv[c]; q[3][c] = coord[c] + dv[c];
        }
        const base = pos.length / 3;
        const order = positive ? [0, 1, 2, 3] : [0, 3, 2, 1];
        for (const oi of order) {
          pos.push((q[oi][0] - half) * v, (q[oi][1] - half) * v, (q[oi][2] - half) * v);
          face.push(nrm[0] + 1, nrm[1] + 1, nrm[2] + 1, mat);
        }
        index.push(base, base + 1, base + 2, base, base + 2, base + 3);
        quads++;
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aFace', new THREE.Uint8BufferAttribute(face, 4));
  g.setIndex(index);
  g.computeBoundingSphere();
  return { geometry: g, quads, cells: N };
}

// Nine camera-facing glow quads (centre emitter + rim nodes). The vertex shader billboards them around
// `position` using aCorner; aKind 0 = centre, 1 = rim node.
export function buildHaloGeometry(lay) {
  const pts = emitterCentres(lay);
  const pos = [], corner = [], kind = [], index = [];
  pts.forEach((p, i) => {
    const base = pos.length / 3;
    for (const [cx, cy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { pos.push(p.x, p.y, p.z); corner.push(cx, cy); kind.push(i === 0 ? 0 : 1); }
    index.push(base, base + 1, base + 2, base, base + 2, base + 3);
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aCorner', new THREE.Float32BufferAttribute(corner, 2));
  g.setAttribute('aKind', new THREE.Float32BufferAttribute(kind, 1));
  g.setIndex(index);
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), lay.R * 1.6);
  return g;
}
