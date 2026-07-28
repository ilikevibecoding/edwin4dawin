import type { Mesher } from './Mesher';

/**
 * Primitive solids for the gun toolkit.
 *
 * The whole set exists to make one thing easy: **chamfered edges**. A gun built
 * from sharp-cornered boxes reads as a stack of boxes no matter how good the
 * material is, because a real machined part catches a highlight along every
 * edge it was broken on. So every primitive here takes a chamfer or a bevel and
 * the default is never zero.
 *
 * Axis convention: solids of revolution run along **Z**, which is the barrel
 * axis, and boxes are centred on the origin. UVs are box-projected from local
 * position in metres, so a part lands at the right texel density wherever it is
 * placed and the material's machining grain never stretches.
 */

/* ------------------------------ helpers -------------------------------- */

/** Box-projected UV: the two axes least aligned with the normal, in metres. */
function emit(
  m: Mesher,
  x: number,
  y: number,
  z: number,
  nx: number,
  ny: number,
  nz: number,
): number {
  const ax = Math.abs(nx);
  const ay = Math.abs(ny);
  const az = Math.abs(nz);
  let u: number;
  let v: number;
  if (ax >= ay && ax >= az) {
    u = z;
    v = y;
  } else if (ay >= az) {
    u = x;
    v = z;
  } else {
    u = x;
    v = y;
  }
  return m.vertex(x, y, z, nx, ny, nz, u, v);
}

/** Emits with explicit UVs, for surfaces where the grain direction matters. */
function emitUV(
  m: Mesher,
  x: number,
  y: number,
  z: number,
  nx: number,
  ny: number,
  nz: number,
  u: number,
  v: number,
): number {
  return m.vertex(x, y, z, nx, ny, nz, u, v);
}

export type Poly = number[];

/* -------------------------------- box ---------------------------------- */

/**
 * Chamfered box centred on the origin. 44 triangles at one chamfer segment,
 * which buys the single most valuable read on a gun: a bright line along every
 * broken edge.
 */
export function box(m: Mesher, w: number, h: number, d: number, chamfer = 0.0012): void {
  const hx = w * 0.5;
  const hy = h * 0.5;
  const hz = d * 0.5;
  const c = Math.max(0, Math.min(chamfer, hx * 0.6, hy * 0.6, hz * 0.6));
  if (c <= 1e-6) {
    plainBox(m, hx, hy, hz);
    return;
  }
  const ix = hx - c;
  const iy = hy - c;
  const iz = hz - c;

  // Six faces, inset by the chamfer on both of their in-plane axes.
  const faces: Array<[number, number, number]> = [
    [1, 0, 0],
    [-1, 0, 0],
    [0, 1, 0],
    [0, -1, 0],
    [0, 0, 1],
    [0, 0, -1],
  ];
  for (const [nx, ny, nz] of faces) {
    const px = nx * hx;
    const py = ny * hy;
    const pz = nz * hz;
    // u,v chosen so that u x v = n, which keeps every face wound outward.
    let ux = 0, uy = 0, uz = 0, vx = 0, vy = 0, vz = 0;
    if (nx !== 0) {
      uy = nx > 0 ? iy : 0;
      uz = nx > 0 ? 0 : iz;
      vy = nx > 0 ? 0 : iy;
      vz = nx > 0 ? iz : 0;
    } else if (ny !== 0) {
      uz = ny > 0 ? iz : 0;
      ux = ny > 0 ? 0 : ix;
      vx = ny > 0 ? ix : 0;
      vz = ny > 0 ? 0 : iz;
    } else {
      ux = nz > 0 ? ix : 0;
      uy = nz > 0 ? 0 : iy;
      vx = nz > 0 ? 0 : ix;
      vy = nz > 0 ? iy : 0;
    }
    const a = emit(m, px - ux - vx, py - uy - vy, pz - uz - vz, nx, ny, nz);
    const b = emit(m, px + ux - vx, py + uy - vy, pz + uz - vz, nx, ny, nz);
    const cc = emit(m, px + ux + vx, py + uy + vy, pz + uz + vz, nx, ny, nz);
    const dd = emit(m, px - ux + vx, py - uy + vy, pz + uz + vz, nx, ny, nz);
    m.quad(a, b, cc, dd);
  }

  // Twelve chamfer strips: one per edge, normal at 45 degrees between faces.
  const s = Math.SQRT1_2;
  // Edges along Z (x,y signs), along Y (x,z), along X (y,z).
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      const nx = sx * s;
      const ny = sy * s;
      const a = emit(m, sx * hx, sy * iy, -iz, nx, ny, 0);
      const b = emit(m, sx * ix, sy * hy, -iz, nx, ny, 0);
      const cq = emit(m, sx * ix, sy * hy, iz, nx, ny, 0);
      const dq = emit(m, sx * hx, sy * iy, iz, nx, ny, 0);
      if (sx * sy > 0) m.quad(a, b, cq, dq);
      else m.quad(a, dq, cq, b);
    }
  }
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const nx = sx * s;
      const nz = sz * s;
      const a = emit(m, sx * hx, -iy, sz * iz, nx, 0, nz);
      const b = emit(m, sx * ix, -iy, sz * hz, nx, 0, nz);
      const cq = emit(m, sx * ix, iy, sz * hz, nx, 0, nz);
      const dq = emit(m, sx * hx, iy, sz * iz, nx, 0, nz);
      if (sx * sz > 0) m.quad(a, dq, cq, b);
      else m.quad(a, b, cq, dq);
    }
  }
  for (const sy of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const ny = sy * s;
      const nz = sz * s;
      const a = emit(m, -ix, sy * hy, sz * iz, 0, ny, nz);
      const b = emit(m, -ix, sy * iy, sz * hz, 0, ny, nz);
      const cq = emit(m, ix, sy * iy, sz * hz, 0, ny, nz);
      const dq = emit(m, ix, sy * hy, sz * iz, 0, ny, nz);
      if (sy * sz > 0) m.quad(a, b, cq, dq);
      else m.quad(a, dq, cq, b);
    }
  }

  // Eight corner triangles closing the chamfer strips.
  const t = 1 / Math.sqrt(3);
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const nx = sx * t;
        const ny = sy * t;
        const nz = sz * t;
        const a = emit(m, sx * hx, sy * iy, sz * iz, nx, ny, nz);
        const b = emit(m, sx * ix, sy * hy, sz * iz, nx, ny, nz);
        const cc = emit(m, sx * ix, sy * iy, sz * hz, nx, ny, nz);
        if (sx * sy * sz > 0) m.tri(a, b, cc);
        else m.tri(a, cc, b);
      }
    }
  }
}

function plainBox(m: Mesher, hx: number, hy: number, hz: number): void {
  const faces: Array<[number, number, number]> = [
    [1, 0, 0],
    [-1, 0, 0],
    [0, 1, 0],
    [0, -1, 0],
    [0, 0, 1],
    [0, 0, -1],
  ];
  for (const [nx, ny, nz] of faces) {
    const px = nx * hx;
    const py = ny * hy;
    const pz = nz * hz;
    let ux = 0, uy = 0, uz = 0, vx = 0, vy = 0, vz = 0;
    if (nx !== 0) {
      uy = nx > 0 ? hy : 0;
      uz = nx > 0 ? 0 : hz;
      vy = nx > 0 ? 0 : hy;
      vz = nx > 0 ? hz : 0;
    } else if (ny !== 0) {
      uz = ny > 0 ? hz : 0;
      ux = ny > 0 ? 0 : hx;
      vx = ny > 0 ? hx : 0;
      vz = ny > 0 ? 0 : hz;
    } else {
      ux = nz > 0 ? hx : 0;
      uy = nz > 0 ? 0 : hy;
      vx = nz > 0 ? 0 : hx;
      vy = nz > 0 ? hy : 0;
    }
    const a = emit(m, px - ux - vx, py - uy - vy, pz - uz - vz, nx, ny, nz);
    const b = emit(m, px + ux - vx, py + uy - vy, pz + uz - vz, nx, ny, nz);
    const cc = emit(m, px + ux + vx, py + uy + vy, pz + uz + vz, nx, ny, nz);
    const dd = emit(m, px - ux + vx, py - uy + vy, pz + uz + vz, nx, ny, nz);
    m.quad(a, b, cc, dd);
  }
}

/**
 * Inward-facing box: the inside of a cavity. An ejection port is only a real
 * cut-out if there is an interior behind it, and a solid receiver's back faces
 * are culled — so the receiver gets a shell of walls and one of these.
 */
export function hollow(m: Mesher, w: number, h: number, d: number): void {
  const hx = w * 0.5;
  const hy = h * 0.5;
  const hz = d * 0.5;
  const faces: Array<[number, number, number]> = [
    [1, 0, 0],
    [-1, 0, 0],
    [0, 1, 0],
    [0, -1, 0],
    [0, 0, 1],
    [0, 0, -1],
  ];
  for (const [nx, ny, nz] of faces) {
    const px = nx * hx;
    const py = ny * hy;
    const pz = nz * hz;
    let ux = 0, uy = 0, uz = 0, vx = 0, vy = 0, vz = 0;
    if (nx !== 0) {
      uy = nx > 0 ? hy : 0;
      uz = nx > 0 ? 0 : hz;
      vy = nx > 0 ? 0 : hy;
      vz = nx > 0 ? hz : 0;
    } else if (ny !== 0) {
      uz = ny > 0 ? hz : 0;
      ux = ny > 0 ? 0 : hx;
      vx = ny > 0 ? hx : 0;
      vz = ny > 0 ? 0 : hz;
    } else {
      ux = nz > 0 ? hx : 0;
      uy = nz > 0 ? 0 : hy;
      vx = nz > 0 ? 0 : hx;
      vy = nz > 0 ? hy : 0;
    }
    const a = emit(m, px - ux - vx, py - uy - vy, pz - uz - vz, -nx, -ny, -nz);
    const b = emit(m, px + ux - vx, py + uy - vy, pz + uz - vz, -nx, -ny, -nz);
    const cc = emit(m, px + ux + vx, py + uy + vy, pz + uz + vz, -nx, -ny, -nz);
    const dd = emit(m, px - ux + vx, py - uy + vy, pz + uz + vz, -nx, -ny, -nz);
    m.quad(a, dd, cc, b);
  }
}

/** Chamfered box placed by its centre, for callers that do not want a push/pop. */
export function boxAt(
  m: Mesher,
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  d: number,
  chamfer = 0.0012,
): void {
  m.push();
  m.translate(x, y, z);
  box(m, w, h, d, chamfer);
  m.pop();
}

/* ----------------------------- cylinders -------------------------------- */

export interface CylOptions {
  /** Radius at the +Z end; defaults to `r` (a straight cylinder). */
  r2?: number;
  segments?: number;
  /** Break on both rims. */
  chamfer?: number;
  capA?: boolean;
  capB?: boolean;
  /** Radians of arc; less than TAU leaves an open C-section. */
  arc?: number;
  arcStart?: number;
}

/** Cylinder or truncated cone along Z, centred on the origin. */
export function cyl(m: Mesher, r: number, len: number, opts: CylOptions = {}): void {
  const seg = Math.max(3, opts.segments ?? 16);
  const r2 = opts.r2 ?? r;
  const hz = len * 0.5;
  const c = Math.max(0, Math.min(opts.chamfer ?? 0, r * 0.5, r2 * 0.5, hz * 0.8));
  const capA = opts.capA ?? true;
  const capB = opts.capB ?? true;
  const arc = opts.arc ?? Math.PI * 2;
  const closed = arc >= Math.PI * 2 - 1e-6;
  const start = opts.arcStart ?? 0;
  const count = closed ? seg : seg + 1;

  // Slope of the side wall, so the ring normals are correct on a cone.
  const dr = r2 - r;
  const sideLen = Math.hypot(dr, len) || 1;
  const nz = dr !== 0 ? -dr / sideLen : 0;
  const nr = len / sideLen;

  const zA = -hz + (c > 0 ? c : 0);
  const zB = hz - (c > 0 ? c : 0);
  const ringA: number[] = [];
  const ringB: number[] = [];
  const circumference = Math.max(r, r2) * arc;
  for (let i = 0; i < count; i++) {
    const t = i / seg;
    const a = start + t * arc;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    const rA = r + (c > 0 ? (dr * c) / len : 0);
    const rB = r2 - (c > 0 ? (dr * c) / len : 0);
    const u = t * circumference;
    ringA.push(emitUV(m, ca * rA, sa * rA, zA, ca * nr, sa * nr, nz, u, zA));
    ringB.push(emitUV(m, ca * rB, sa * rB, zB, ca * nr, sa * nr, nz, u, zB));
  }
  for (let i = 0; i < seg; i++) {
    const j = (i + 1) % count;
    m.quad(ringA[i], ringA[j], ringB[j], ringB[i]);
  }

  const rimA = c > 0 ? r + (dr * c) / len - c : r;
  const rimB = c > 0 ? r2 - (dr * c) / len - c : r2;
  if (c > 0) {
    const s = Math.SQRT1_2;
    const chA: number[] = [];
    const chB: number[] = [];
    for (let i = 0; i < count; i++) {
      const t = i / seg;
      const a = start + t * arc;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      const u = t * circumference;
      chA.push(emitUV(m, ca * rimA, sa * rimA, -hz, ca * s, sa * s, -s, u, -hz));
      chB.push(emitUV(m, ca * rimB, sa * rimB, hz, ca * s, sa * s, s, u, hz));
    }
    for (let i = 0; i < seg; i++) {
      const j = (i + 1) % count;
      m.quad(chA[i], chA[j], ringA[j], ringA[i]);
      m.quad(ringB[i], ringB[j], chB[j], chB[i]);
    }
    if (capA) fan(m, rimA, -hz, 0, 0, -1, seg, arc, start, count);
    if (capB) fan(m, rimB, hz, 0, 0, 1, seg, arc, start, count);
  } else {
    if (capA) fan(m, r, -hz, 0, 0, -1, seg, arc, start, count);
    if (capB) fan(m, r2, hz, 0, 0, 1, seg, arc, start, count);
  }
}

function fan(
  m: Mesher,
  r: number,
  z: number,
  nx: number,
  ny: number,
  nz: number,
  seg: number,
  arc: number,
  start: number,
  count: number,
): void {
  const centre = emitUV(m, 0, 0, z, nx, ny, nz, 0, 0);
  const ring: number[] = [];
  for (let i = 0; i < count; i++) {
    const a = start + (i / seg) * arc;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    ring.push(emitUV(m, ca * r, sa * r, z, nx, ny, nz, ca * r, sa * r));
  }
  for (let i = 0; i < seg; i++) {
    const j = (i + 1) % count;
    if (nz > 0) m.tri(centre, ring[i], ring[j]);
    else m.tri(centre, ring[j], ring[i]);
  }
}

/**
 * Hollow tube along Z with a visible bore: the inner wall is wound inward so a
 * muzzle actually reads as a hole rather than as a dark disc.
 */
export function tube(
  m: Mesher,
  rOuter: number,
  rInner: number,
  len: number,
  segments = 16,
  chamfer = 0.0006,
): void {
  const seg = Math.max(3, segments);
  const hz = len * 0.5;
  const c = Math.max(0, Math.min(chamfer, (rOuter - rInner) * 0.4, hz * 0.5));
  const outerA: number[] = [];
  const outerB: number[] = [];
  const innerA: number[] = [];
  const innerB: number[] = [];
  const circ = rOuter * Math.PI * 2;
  for (let i = 0; i < seg; i++) {
    const t = i / seg;
    const a = t * Math.PI * 2;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    const u = t * circ;
    outerA.push(emitUV(m, ca * rOuter, sa * rOuter, -hz + c, ca, sa, 0, u, -hz));
    outerB.push(emitUV(m, ca * rOuter, sa * rOuter, hz - c, ca, sa, 0, u, hz));
    innerA.push(emitUV(m, ca * rInner, sa * rInner, -hz, -ca, -sa, 0, u, -hz));
    innerB.push(emitUV(m, ca * rInner, sa * rInner, hz, -ca, -sa, 0, u, hz));
  }
  for (let i = 0; i < seg; i++) {
    const j = (i + 1) % seg;
    m.quad(outerA[i], outerA[j], outerB[j], outerB[i]);
    m.quad(innerB[i], innerB[j], innerA[j], innerA[i]);
  }
  // Chamfered annulus at each end.
  const ringA: number[] = [];
  const ringB: number[] = [];
  const rc = rOuter - c;
  for (let i = 0; i < seg; i++) {
    const t = i / seg;
    const a = t * Math.PI * 2;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    const u = t * circ;
    ringA.push(emitUV(m, ca * rc, sa * rc, -hz, ca * 0.7, sa * 0.7, -0.7, u, -hz));
    ringB.push(emitUV(m, ca * rc, sa * rc, hz, ca * 0.7, sa * 0.7, 0.7, u, hz));
  }
  for (let i = 0; i < seg; i++) {
    const j = (i + 1) % seg;
    m.quad(ringA[i], ringA[j], outerA[j], outerA[i]);
    m.quad(outerB[i], outerB[j], ringB[j], ringB[i]);
  }
  // Flat annulus between the chamfer and the bore.
  const faceA: number[] = [];
  const faceB: number[] = [];
  const faceAi: number[] = [];
  const faceBi: number[] = [];
  for (let i = 0; i < seg; i++) {
    const t = i / seg;
    const a = t * Math.PI * 2;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    faceA.push(emitUV(m, ca * rc, sa * rc, -hz, 0, 0, -1, ca * rc, sa * rc));
    faceAi.push(emitUV(m, ca * rInner, sa * rInner, -hz, 0, 0, -1, ca * rInner, sa * rInner));
    faceB.push(emitUV(m, ca * rc, sa * rc, hz, 0, 0, 1, ca * rc, sa * rc));
    faceBi.push(emitUV(m, ca * rInner, sa * rInner, hz, 0, 0, 1, ca * rInner, sa * rInner));
  }
  for (let i = 0; i < seg; i++) {
    const j = (i + 1) % seg;
    m.quad(faceA[i], faceAi[i], faceAi[j], faceA[j]);
    m.quad(faceB[i], faceB[j], faceBi[j], faceBi[i]);
  }
}

/**
 * Fluted barrel: a cylinder whose radius dips into `flutes` scallops. Real
 * fluting is a weight-saving cut, and it is the detail that separates a sniper
 * barrel from a pipe.
 */
export function flutedCyl(
  m: Mesher,
  r: number,
  len: number,
  flutes: number,
  depth: number,
  segments = 40,
): void {
  const seg = Math.max(flutes * 4, segments);
  const hz = len * 0.5;
  const ringA: number[] = [];
  const ringB: number[] = [];
  const radiusAt = (a: number): number => {
    const f = Math.cos(a * flutes);
    // Scallops only where the cosine is positive, so the flats stay flat.
    return r - depth * Math.max(0, f) ** 1.6;
  };
  const circ = r * Math.PI * 2;
  for (let i = 0; i < seg; i++) {
    const t = i / seg;
    const a = t * Math.PI * 2;
    const rr = radiusAt(a);
    // Numeric normal from the radial derivative keeps the flute walls shaded.
    const h = 0.01;
    const dr = (radiusAt(a + h) - radiusAt(a - h)) / (2 * h);
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    let nx = ca * rr + sa * dr;
    let ny = sa * rr - ca * dr;
    const inv = 1 / (Math.hypot(nx, ny) || 1);
    nx *= inv;
    ny *= inv;
    const u = t * circ;
    ringA.push(emitUV(m, ca * rr, sa * rr, -hz, nx, ny, 0, u, -hz));
    ringB.push(emitUV(m, ca * rr, sa * rr, hz, nx, ny, 0, u, hz));
  }
  for (let i = 0; i < seg; i++) {
    const j = (i + 1) % seg;
    m.quad(ringA[i], ringA[j], ringB[j], ringB[i]);
  }
}

/* ------------------------------- lathe ---------------------------------- */

/**
 * Surface of revolution from a `[z, radius]` profile. The workhorse for
 * suppressors, muzzle devices and scope tubes, where the silhouette is the
 * whole read.
 */
export function lathe(
  m: Mesher,
  profile: Array<[number, number]>,
  segments = 20,
  capStart = true,
  capEnd = true,
): void {
  const seg = Math.max(3, segments);
  if (profile.length < 2) return;
  const rings: number[][] = [];
  let maxR = 0;
  for (const [, r] of profile) maxR = Math.max(maxR, r);
  const circ = maxR * Math.PI * 2;

  for (let p = 0; p < profile.length; p++) {
    const [z, r] = profile[p];
    const prev = profile[Math.max(0, p - 1)];
    const next = profile[Math.min(profile.length - 1, p + 1)];
    const dz = next[0] - prev[0];
    const dr = next[1] - prev[1];
    const len = Math.hypot(dz, dr) || 1;
    // Outward normal of the profile tangent, rotated into the radial plane.
    const nr = dz / len;
    const nz = -dr / len;
    const ring: number[] = [];
    for (let i = 0; i < seg; i++) {
      const t = i / seg;
      const a = t * Math.PI * 2;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      ring.push(emitUV(m, ca * r, sa * r, z, ca * nr, sa * nr, nz, t * circ, z));
    }
    rings.push(ring);
  }
  for (let p = 0; p < rings.length - 1; p++) {
    const a = rings[p];
    const b = rings[p + 1];
    for (let i = 0; i < seg; i++) {
      const j = (i + 1) % seg;
      m.quad(a[i], a[j], b[j], b[i]);
    }
  }
  if (capStart && profile[0][1] > 1e-5) {
    fan(m, profile[0][1], profile[0][0], 0, 0, -1, seg, Math.PI * 2, 0, seg);
  }
  if (capEnd && profile[profile.length - 1][1] > 1e-5) {
    const last = profile[profile.length - 1];
    fan(m, last[1], last[0], 0, 0, 1, seg, Math.PI * 2, 0, seg);
  }
}

/* ------------------------------ extrusion ------------------------------- */

/** Signed area; positive when the polygon winds counter-clockwise. */
function polyArea(pts: Poly): number {
  let a = 0;
  const n = pts.length / 2;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    a += pts[i * 2] * pts[j * 2 + 1] - pts[j * 2] * pts[i * 2 + 1];
  }
  return a * 0.5;
}

/** Ear-clipping triangulation, so profiles do not have to be convex. */
function triangulate(pts: Poly): number[] {
  const n = pts.length / 2;
  const out: number[] = [];
  if (n < 3) return out;
  const idx: number[] = [];
  for (let i = 0; i < n; i++) idx.push(i);
  const ccw = polyArea(pts) > 0;
  if (!ccw) idx.reverse();

  const cross = (ax: number, ay: number, bx: number, by: number, cx: number, cy: number): number =>
    (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);

  let guard = 0;
  while (idx.length > 3 && guard++ < n * n + 16) {
    let clipped = false;
    for (let i = 0; i < idx.length; i++) {
      const i0 = idx[(i + idx.length - 1) % idx.length];
      const i1 = idx[i];
      const i2 = idx[(i + 1) % idx.length];
      const ax = pts[i0 * 2];
      const ay = pts[i0 * 2 + 1];
      const bx = pts[i1 * 2];
      const by = pts[i1 * 2 + 1];
      const cx = pts[i2 * 2];
      const cy = pts[i2 * 2 + 1];
      if (cross(ax, ay, bx, by, cx, cy) <= 1e-12) continue;
      let contains = false;
      for (const k of idx) {
        if (k === i0 || k === i1 || k === i2) continue;
        const px = pts[k * 2];
        const py = pts[k * 2 + 1];
        if (
          cross(ax, ay, bx, by, px, py) >= 0 &&
          cross(bx, by, cx, cy, px, py) >= 0 &&
          cross(cx, cy, ax, ay, px, py) >= 0
        ) {
          contains = true;
          break;
        }
      }
      if (contains) continue;
      out.push(i0, i1, i2);
      idx.splice(i, 1);
      clipped = true;
      break;
    }
    if (!clipped) break;
  }
  if (idx.length === 3) out.push(idx[0], idx[1], idx[2]);
  return out;
}

/** Offsets a closed polygon inward by `d` along the mitred vertex bisectors. */
export function insetPoly(pts: Poly, d: number): Poly {
  const n = pts.length / 2;
  const out: Poly = new Array(pts.length);
  const ccw = polyArea(pts) > 0 ? 1 : -1;
  for (let i = 0; i < n; i++) {
    const p = ((i - 1) + n) % n;
    const q = (i + 1) % n;
    const x0 = pts[p * 2];
    const y0 = pts[p * 2 + 1];
    const x1 = pts[i * 2];
    const y1 = pts[i * 2 + 1];
    const x2 = pts[q * 2];
    const y2 = pts[q * 2 + 1];
    let e0x = x1 - x0;
    let e0y = y1 - y0;
    let e1x = x2 - x1;
    let e1y = y2 - y1;
    const l0 = Math.hypot(e0x, e0y) || 1;
    const l1 = Math.hypot(e1x, e1y) || 1;
    e0x /= l0;
    e0y /= l0;
    e1x /= l1;
    e1y /= l1;
    // Inward normals for the two edges meeting at this vertex.
    const n0x = ccw * e0y;
    const n0y = -ccw * e0x;
    const n1x = ccw * e1y;
    const n1y = -ccw * e1x;
    let bx = n0x + n1x;
    let by = n0y + n1y;
    const bl = Math.hypot(bx, by);
    if (bl < 1e-6) {
      bx = n0x;
      by = n0y;
    } else {
      bx /= bl;
      by /= bl;
    }
    const cosHalf = Math.max(0.25, bx * n0x + by * n0y);
    const miter = Math.min(d / cosHalf, d * 4);
    out[i * 2] = x1 - bx * miter;
    out[i * 2 + 1] = y1 - by * miter;
  }
  return out;
}

/** Replaces every corner with a small arc, for a rounded silhouette. */
export function roundPoly(pts: Poly, radius: number, segments = 2): Poly {
  const n = pts.length / 2;
  const out: Poly = [];
  for (let i = 0; i < n; i++) {
    const p = ((i - 1) + n) % n;
    const q = (i + 1) % n;
    const x1 = pts[i * 2];
    const y1 = pts[i * 2 + 1];
    let ax = pts[p * 2] - x1;
    let ay = pts[p * 2 + 1] - y1;
    let bx = pts[q * 2] - x1;
    let by = pts[q * 2 + 1] - y1;
    const la = Math.hypot(ax, ay) || 1;
    const lb = Math.hypot(bx, by) || 1;
    const r = Math.min(radius, la * 0.45, lb * 0.45);
    ax /= la;
    ay /= la;
    bx /= lb;
    by /= lb;
    const sax = x1 + ax * r;
    const say = y1 + ay * r;
    const sbx = x1 + bx * r;
    const sby = y1 + by * r;
    out.push(sax, say);
    for (let s = 1; s < segments; s++) {
      const t = s / segments;
      // Quadratic Bezier through the corner: cheap, and visually an arc.
      const mt = 1 - t;
      out.push(
        mt * mt * sax + 2 * mt * t * x1 + t * t * sbx,
        mt * mt * say + 2 * mt * t * y1 + t * t * sby,
      );
    }
    out.push(sbx, sby);
  }
  return out;
}

/**
 * Extrudes a closed 2D profile along Z with a bevelled rim on both faces. This
 * is how every complex silhouette on a gun is built here — receiver flanks,
 * grips, stocks, trigger guards — because it gives a chamfered edge for free.
 */
export function extrude(m: Mesher, input: Poly, depth: number, bevel = 0.0012): void {
  const n = input.length / 2;
  if (n < 3) return;
  // Normalised to counter-clockwise once, here, so every winding below can be
  // written for a single case. A profile authored the other way round would
  // otherwise emit an entire part inside out and simply vanish.
  let pts = input;
  if (polyArea(input) < 0) {
    pts = new Array(input.length);
    for (let i = 0; i < n; i++) {
      pts[i * 2] = input[(n - 1 - i) * 2];
      pts[i * 2 + 1] = input[(n - 1 - i) * 2 + 1];
    }
  }
  const hz = depth * 0.5;
  const b = Math.max(0, Math.min(bevel, hz * 0.8));
  const inner = b > 0 ? insetPoly(pts, b) : pts;
  const zi = hz - b;
  const tris = triangulate(inner);

  // Caps.
  for (const sign of [1, -1] as const) {
    const z = sign * hz;
    const nz = sign;
    const base = m.vertexCount;
    for (let i = 0; i < n; i++) {
      emitUV(m, inner[i * 2], inner[i * 2 + 1], z, 0, 0, nz, inner[i * 2], inner[i * 2 + 1]);
    }
    for (let t = 0; t < tris.length; t += 3) {
      const a = base + tris[t];
      const bb = base + tris[t + 1];
      const c = base + tris[t + 2];
      if (sign > 0) m.tri(a, bb, c);
      else m.tri(a, c, bb);
    }
  }

  // Side wall plus the two bevel bands, one quad strip per edge so corners stay
  // crisp instead of smearing a normal across the silhouette.
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const x0 = pts[i * 2];
    const y0 = pts[i * 2 + 1];
    const x1 = pts[j * 2];
    const y1 = pts[j * 2 + 1];
    let ex = x1 - x0;
    let ey = y1 - y0;
    const el = Math.hypot(ex, ey) || 1;
    ex /= el;
    ey /= el;
    const nx = ey;
    const ny = -ex;

    const a = emitUV(m, x0, y0, -zi, nx, ny, 0, 0, -zi);
    const bb = emitUV(m, x1, y1, -zi, nx, ny, 0, el, -zi);
    const c = emitUV(m, x1, y1, zi, nx, ny, 0, el, zi);
    const d = emitUV(m, x0, y0, zi, nx, ny, 0, 0, zi);
    m.quad(a, bb, c, d);

    if (b <= 0) continue;
    const ix0 = inner[i * 2];
    const iy0 = inner[i * 2 + 1];
    const ix1 = inner[j * 2];
    const iy1 = inner[j * 2 + 1];
    const s = Math.SQRT1_2;
    const fa = emitUV(m, x0, y0, zi, nx * s, ny * s, s, 0, zi);
    const fb = emitUV(m, x1, y1, zi, nx * s, ny * s, s, el, zi);
    const fc = emitUV(m, ix1, iy1, hz, nx * s, ny * s, s, el, hz);
    const fd = emitUV(m, ix0, iy0, hz, nx * s, ny * s, s, 0, hz);
    m.quad(fa, fb, fc, fd);

    const ga = emitUV(m, ix0, iy0, -hz, nx * s, ny * s, -s, 0, -hz);
    const gb = emitUV(m, ix1, iy1, -hz, nx * s, ny * s, -s, el, -hz);
    const gc = emitUV(m, x1, y1, -zi, nx * s, ny * s, -s, el, -zi);
    const gd = emitUV(m, x0, y0, -zi, nx * s, ny * s, -s, 0, -zi);
    m.quad(ga, gb, gc, gd);
  }
}

/* -------------------------------- torus --------------------------------- */

/** Torus in the XY plane, for sling loops and swivels. */
export function torus(
  m: Mesher,
  radius: number,
  thickness: number,
  major = 16,
  minor = 8,
  arc = Math.PI * 2,
): void {
  const closed = arc >= Math.PI * 2 - 1e-6;
  const majorCount = closed ? major : major + 1;
  const rings: number[][] = [];
  for (let i = 0; i < majorCount; i++) {
    const a = (i / major) * arc;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    const ring: number[] = [];
    for (let j = 0; j < minor; j++) {
      const b = (j / minor) * Math.PI * 2;
      const cb = Math.cos(b);
      const sb = Math.sin(b);
      const rr = radius + thickness * cb;
      ring.push(
        emitUV(
          m,
          ca * rr,
          sa * rr,
          sb * thickness,
          ca * cb,
          sa * cb,
          sb,
          a * radius,
          b * thickness,
        ),
      );
    }
    rings.push(ring);
  }
  for (let i = 0; i < major; i++) {
    const a = rings[i];
    const b = rings[(i + 1) % majorCount];
    for (let j = 0; j < minor; j++) {
      const k = (j + 1) % minor;
      m.quad(a[j], b[j], b[k], a[k]);
    }
  }
}

/* ----------------------------- fasteners -------------------------------- */

/**
 * A screw or pin head standing proud of a surface, sunk along -Z. Small, cheap,
 * and the single most effective way to make a flat panel read as a real part.
 */
export function screw(m: Mesher, radius: number, height: number, slot = true): void {
  cyl(m, radius, height, { segments: 10, chamfer: radius * 0.3 });
  if (!slot) return;
  m.push();
  m.translate(0, 0, height * 0.5 - radius * 0.12);
  box(m, radius * 1.7, radius * 0.28, radius * 0.3, 0.00006);
  m.pop();
}

/** Hex head, for scope rings and rail clamps. */
export function hexHead(m: Mesher, acrossFlats: number, height: number): void {
  const r = acrossFlats / Math.cos(Math.PI / 6) / 2;
  cyl(m, r, height, { segments: 6, chamfer: r * 0.12 });
}

/* -------------------------- repeated features --------------------------- */

/**
 * Cocking serrations: a run of angled ribs. Cut as raised ribs rather than as
 * grooves because a rib catches the key light, which is what makes a slide look
 * like a slide.
 */
export function serrations(
  m: Mesher,
  count: number,
  spacing: number,
  width: number,
  height: number,
  depth: number,
  lean = 0,
): void {
  const start = -((count - 1) * spacing) * 0.5;
  for (let i = 0; i < count; i++) {
    m.push();
    m.translate(0, 0, start + i * spacing);
    if (lean !== 0) m.rotateX(lean);
    box(m, width, height, depth, depth * 0.35);
    m.pop();
  }
}

/**
 * A picatinny rail section: base, then one raised tooth per slot with the
 * regulation 5.35 mm slot pitch. Every slot is real geometry, so the top of the
 * gun has the high-frequency detail the eye uses to judge scale.
 */
export function picatinny(m: Mesher, slots: number, width = 0.0212, height = 0.006): void {
  const pitch = 0.01;
  const toothDepth = 0.0055;
  const len = slots * pitch;
  // Base plate under the teeth.
  m.push();
  m.translate(0, -height * 0.5 + 0.0012, 0);
  box(m, width, 0.0024, len, 0.0004);
  m.pop();
  const top = height * 0.5;
  for (let i = 0; i < slots; i++) {
    const z = -len * 0.5 + pitch * (i + 0.5);
    m.push();
    m.translate(0, top - 0.0021, z);
    // 45-degree dovetail flanks: the rail's defining cross-section.
    trapezoid(m, width, width - 0.0042, 0.0042, toothDepth, 0.0004);
    m.pop();
  }
}

/**
 * Symmetric trapezoid prism along Z: `wBottom` at the base, `wTop` at the top,
 * used for dovetails, rail teeth and front sight bases.
 */
export function trapezoid(
  m: Mesher,
  wBottom: number,
  wTop: number,
  height: number,
  depth: number,
  bevel = 0.0004,
): void {
  const hb = wBottom * 0.5;
  const ht = wTop * 0.5;
  const hh = height * 0.5;
  extrude(m, [-hb, -hh, hb, -hh, ht, hh, -ht, hh], depth, bevel);
}

/** Vent holes around a tube, as an M-Lok / HK-style handguard would carry. */
export function ventedRing(
  m: Mesher,
  radius: number,
  holeRadius: number,
  count: number,
  depth: number,
): void {
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    m.push();
    m.translate(Math.cos(a) * radius, Math.sin(a) * radius, 0);
    m.rotateY(Math.PI / 2);
    m.rotateX(a);
    // A short recessed cup reads as a hole without cutting the parent solid.
    cyl(m, holeRadius, depth, { segments: 8, capB: false, chamfer: holeRadius * 0.25 });
    m.pop();
  }
}
