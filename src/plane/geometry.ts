import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/** Cross-section of a lofted body at station x. Widths/heights are half-extents from (x, yc). */
export interface Section {
  x: number;
  yc: number;
  w: number;
  top: number;
  bot: number;
  /** superellipse exponent (2 = ellipse, higher = boxier) */
  n?: number;
  /** exponent for the lower half (V-shaped hulls use < 2) */
  nBot?: number;
}

const TWO_PI = Math.PI * 2;

/**
 * Point on a section at ring parameter t: 0 top, 0.25 starboard (+Z), 0.5 belly, 0.75 port, 1 top.
 * Returns [y, z] in body space.
 */
export function sectionPoint(s: Section, t: number, out: [number, number] = [0, 0]): [number, number] {
  const n = s.n ?? 2.2, nb = s.nBot ?? n;
  const a = t * TWO_PI - Math.PI / 2;
  const c = Math.cos(a), si = Math.sin(a);
  const upper = si <= 0;
  const ex = upper ? n : nb;
  out[1] = Math.sign(c) * Math.pow(Math.abs(c), 2 / ex) * s.w;
  out[0] = s.yc - Math.sign(si) * Math.pow(Math.abs(si), 2 / ex) * (upper ? s.top : s.bot);
  return out;
}

/** Ring parameter on the starboard half (0..0.5) where the section passes through height y; null if y is outside it. */
export function tOfHeight(s: Section, y: number): number | null {
  const n = s.n ?? 2.2, nb = s.nBot ?? n;
  const py = y - s.yc;
  if (py >= 0) {
    if (py >= s.top) return null;
    return (Math.PI / 2 - Math.asin(Math.pow(py / s.top, n / 2))) / TWO_PI;
  }
  if (-py >= s.bot) return null;
  return (Math.PI / 2 + Math.asin(Math.pow(-py / s.bot, nb / 2))) / TWO_PI;
}

/** Half-width of a section at height y (0 outside the section). */
export function halfWidthAt(s: Section, y: number): number {
  const t = tOfHeight(s, y);
  if (t === null) return 0;
  return Math.abs(sectionPoint(s, t)[1]);
}

export function sectionPerimeter(s: Section, steps = 64): number {
  let len = 0;
  const a = sectionPoint(s, 0), b: [number, number] = [0, 0];
  for (let i = 1; i <= steps; i++) {
    sectionPoint(s, i / steps, b);
    len += Math.hypot(b[0] - a[0], b[1] - a[1]);
    a[0] = b[0]; a[1] = b[1];
  }
  return len;
}

/**
 * Texture v of ring parameter t: the normalised arc length around the section (0 top, 0.5 belly, 1 top again).
 * The raw superellipse parameter spends most of its range in the corners of a boxy section, so a texture mapped by
 * t squeezes the whole flat side wall into a few texels (livery text there magnified into vertical smears).
 */
const ARC_STEPS = 4096; // a boxy section's whole side wall can sit inside 1/200 of the parameter range
const arcTables = new WeakMap<Section, Float32Array>();
function arcTable(s: Section): Float32Array {
  let tab = arcTables.get(s);
  if (tab) return tab;
  tab = new Float32Array(ARC_STEPS + 1);
  const a = sectionPoint(s, 0), b: [number, number] = [0, 0];
  for (let i = 1; i <= ARC_STEPS; i++) {
    sectionPoint(s, 0.5 * (i / ARC_STEPS), b);
    tab[i] = tab[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1]);
    a[0] = b[0]; a[1] = b[1];
  }
  const half = tab[ARC_STEPS] || 1e-9;
  for (let i = 0; i <= ARC_STEPS; i++) tab[i] = 0.5 * tab[i] / half;
  arcTables.set(s, tab);
  return tab;
}
export function arcFraction(s: Section, t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  if (t > 0.5) return 1 - arcFraction(s, 1 - t);
  const tab = arcTable(s);
  const f = t * 2 * ARC_STEPS, i = Math.min(Math.floor(f), ARC_STEPS - 1);
  return tab[i] + (tab[i + 1] - tab[i]) * (f - i);
}

function lerpSection(a: Section, b: Section, f: number, x: number): Section {
  const l = (p: number, q: number) => p + (q - p) * f;
  const na = a.n ?? 2.2, nb = b.n ?? 2.2;
  return { x, yc: l(a.yc, b.yc), w: l(a.w, b.w), top: l(a.top, b.top), bot: l(a.bot, b.bot), n: l(na, nb), nBot: l(a.nBot ?? na, b.nBot ?? nb) };
}

/** Section interpolated at station x (sections may run along +X or -X). Clamps beyond the ends. */
export function sectionAt(sections: Section[], x: number): Section {
  const S = sections.length;
  for (let i = 0; i < S - 1; i++) {
    const a = sections[i], b = sections[i + 1];
    const lo = Math.min(a.x, b.x), hi = Math.max(a.x, b.x);
    if (x >= lo - 1e-9 && x <= hi + 1e-9) return lerpSection(a, b, hi === lo ? 0 : (x - a.x) / (b.x - a.x), x);
  }
  const first = sections[0], last = sections[S - 1];
  const nearFirst = Math.abs(x - first.x) < Math.abs(x - last.x);
  return { ...(nearFirst ? first : last), x };
}

/** Sections with extra interpolated stations inserted at the given x values (keeps the original direction). */
export function withStations(sections: Section[], xs: number[]): Section[] {
  const out = sections.slice();
  const desc = sections[0].x > sections[sections.length - 1].x;
  for (const x of xs) {
    if (out.some((s) => Math.abs(s.x - x) < 1e-6)) continue;
    out.push(sectionAt(sections, x));
  }
  out.sort((a, b) => (desc ? b.x - a.x : a.x - b.x));
  return out;
}

/** Sections shrunk by a skin thickness (interior shell). */
export function insetSections(sections: Section[], d: number): Section[] {
  return sections.map((s) => ({ ...s, w: Math.max(s.w - d, 0.01), top: Math.max(s.top - d, 0.01), bot: Math.max(s.bot - d, 0.01) }));
}

// ------------------------------------------------------------------ grid loft

/**
 * Vertex grid of a lofted body: S stations x (R+1) ring vertices. Ring parameters may differ per station
 * (so specific heights can be hit exactly), UV u runs along the body, v is the ring's normalised arc length.
 * Normals are those of the complete closed surface so any subset (body, glass) shades continuously.
 */
export interface LoftGrid {
  sections: Section[];
  R: number;
  t: number[][];
  u: number[];
  pos: Float32Array;
  uv: Float32Array;
  normal: Float32Array;
  forwardX: boolean;
}

export function uniformRing(R: number): number[] {
  const t: number[] = [];
  for (let j = 0; j <= R; j++) t.push(j / R);
  return t;
}

/** `segs` ring parameters in (t0, t1] spaced by equal arc length along the section. */
function arcSpread(s: Section, t0: number, t1: number, segs: number, out: number[]): void {
  const N = 24;
  const len = [0];
  const a = sectionPoint(s, t0), b: [number, number] = [0, 0];
  for (let i = 1; i <= N; i++) {
    sectionPoint(s, t0 + (t1 - t0) * (i / N), b);
    len.push(len[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1]));
    a[0] = b[0]; a[1] = b[1];
  }
  const total = len[N] || 1e-9;
  let i = 1;
  for (let k = 1; k < segs; k++) {
    const target = total * (k / segs);
    while (i < N && len[i] < target) i++;
    const f = (target - len[i - 1]) / Math.max(len[i] - len[i - 1], 1e-9);
    out.push(t0 + (t1 - t0) * ((i - 1 + f) / N));
  }
  out.push(t1);
}

export interface RingKey {
  /** height to hit (may depend on the station) */
  y: number | ((s: Section) => number);
  /** subdivisions between the previous key (or the top) and this one */
  segs: number;
  /** ring parameter used when the station does not reach the height */
  fallbackT: number;
}

/**
 * Ring parameterisation that places vertices exactly at the given heights (starboard side, mirrored to port):
 * `keys` run from the top downwards; the subdivisions between keys and the `bellySegs` after the last key down to
 * the belly are spaced by arc length. Stations that do not reach a height fall back to the given t value.
 */
export function keyedRing(keys: RingKey[], bellySegs: number): (s: Section) => number[] {
  return (s: Section) => {
    const ts: number[] = [];
    let prev = 0;
    const half: number[] = [0];
    for (const k of keys) {
      const y = typeof k.y === 'function' ? k.y(s) : k.y;
      let t = s.yc + s.top * 0.97 > y && s.yc - s.bot * 0.97 < y ? tOfHeight(s, y)! : k.fallbackT;
      t = Math.max(t, prev + 0.0005);
      arcSpread(s, prev, t, k.segs, half);
      prev = t;
    }
    arcSpread(s, prev, 0.5, bellySegs, half);
    for (const t of half) ts.push(t);
    for (let i = half.length - 2; i >= 0; i--) ts.push(1 - half[i]);
    return ts;
  };
}

function pushQuad(idx: number[], i: number, j: number, R: number, forwardX: boolean, flip: boolean): void {
  const a = i * (R + 1) + j, b = a + R + 1;
  if (forwardX !== flip) idx.push(a, a + 1, b, a + 1, b + 1, b);
  else idx.push(a, b, a + 1, a + 1, b, b + 1);
}

export function loftGrid(sections: Section[], ringT: (s: Section, i: number) => number[]): LoftGrid {
  const S = sections.length;
  const t = sections.map((s, i) => ringT(s, i));
  const R = t[0].length - 1;
  let total = 0;
  const dist = [0];
  for (let i = 1; i < S; i++) { total += Math.abs(sections[i].x - sections[i - 1].x); dist.push(total); }
  const u = dist.map((d) => d / Math.max(total, 1e-6));
  const pos = new Float32Array(S * (R + 1) * 3), uv = new Float32Array(S * (R + 1) * 2);
  const p: [number, number] = [0, 0];
  for (let i = 0; i < S; i++) {
    for (let j = 0; j <= R; j++) {
      sectionPoint(sections[i], t[i][j], p);
      const k = i * (R + 1) + j;
      pos[k * 3] = sections[i].x; pos[k * 3 + 1] = p[0]; pos[k * 3 + 2] = p[1];
      uv[k * 2] = u[i]; uv[k * 2 + 1] = arcFraction(sections[i], t[i][j]);
    }
  }
  const forwardX = sections[S - 1].x >= sections[0].x;
  const full = new THREE.BufferGeometry();
  full.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const idx: number[] = [];
  for (let i = 0; i < S - 1; i++) for (let j = 0; j < R; j++) pushQuad(idx, i, j, R, forwardX, false);
  full.setIndex(idx);
  full.computeVertexNormals();
  const normal = (full.getAttribute('normal') as THREE.BufferAttribute).array as Float32Array;
  // the first and last ring vertex share a position: give them the same normal
  for (let i = 0; i < S; i++) {
    const a = i * (R + 1), b = a + R;
    let nx = normal[a * 3] + normal[b * 3], ny = normal[a * 3 + 1] + normal[b * 3 + 1], nz = normal[a * 3 + 2] + normal[b * 3 + 2];
    const l = Math.hypot(nx, ny, nz) || 1;
    nx /= l; ny /= l; nz /= l;
    normal[a * 3] = nx; normal[a * 3 + 1] = ny; normal[a * 3 + 2] = nz;
    normal[b * 3] = nx; normal[b * 3 + 1] = ny; normal[b * 3 + 2] = nz;
  }
  return { sections, R, t, u, pos, uv, normal, forwardX };
}

export interface GridMeshOptions {
  /** station range [i0, i1]; quads are emitted between consecutive stations inside it */
  i0?: number;
  i1?: number;
  /** include the quad between stations i,i+1 and ring vertices j,j+1 */
  quad?: (i: number, j: number) => boolean;
  /** reverse winding and normals (interior shell) */
  flip?: boolean;
  capStart?: boolean;
  capEnd?: boolean;
}

/** Geometry for a subset of the grid quads, optionally capped with flat discs at the range ends. */
export function gridGeometry(g: LoftGrid, o: GridMeshOptions = {}): THREE.BufferGeometry {
  const S = g.sections.length, R = g.R;
  const i0 = o.i0 ?? 0, i1 = o.i1 ?? S - 1;
  const flip = !!o.flip;
  const pos = Array.from(g.pos), uv = Array.from(g.uv), nrm = Array.from(g.normal);
  if (flip) for (let k = 0; k < nrm.length; k++) nrm[k] = -nrm[k];
  const idx: number[] = [];
  for (let i = i0; i < i1; i++) for (let j = 0; j < R; j++) if (!o.quad || o.quad(i, j)) pushQuad(idx, i, j, R, g.forwardX, flip);
  const cap = (i: number, start: boolean) => {
    const s = g.sections[i];
    const other = g.sections[start ? Math.min(i + 1, S - 1) : Math.max(i - 1, 0)];
    let nx = Math.sign(s.x - other.x) || (start ? -1 : 1);
    if (flip) nx = -nx;
    const base = pos.length / 3;
    pos.push(s.x, s.yc, 0); nrm.push(nx, 0, 0); uv.push(g.u[i], 0.5);
    for (let j = 0; j <= R; j++) {
      const k = i * (R + 1) + j;
      pos.push(g.pos[k * 3], g.pos[k * 3 + 1], g.pos[k * 3 + 2]); nrm.push(nx, 0, 0); uv.push(g.uv[k * 2], g.uv[k * 2 + 1]);
    }
    // ring runs top -> starboard -> belly -> port: viewed from +X that is counter-clockwise, so the fan
    // (centre, j, j+1) faces +X; reverse it for a -X facing cap
    for (let j = 0; j < R; j++) {
      if (nx > 0) idx.push(base, base + 1 + j, base + 2 + j);
      else idx.push(base, base + 2 + j, base + 1 + j);
    }
  };
  if (o.capStart) cap(i0, true);
  if (o.capEnd) cap(i1, false);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  return geo;
}

/** Block of grid quads [i0,i1) x [j0,j1); j1 may exceed R, in which case the block wraps across the ring seam. */
export interface QuadBlock { i0: number; i1: number; j0: number; j1: number; }

export function inBlock(b: QuadBlock, R: number, i: number, j: number): boolean {
  if (i < b.i0 || i >= b.i1) return false;
  return (j >= b.j0 && j < b.j1) || (j + R >= b.j0 && j + R < b.j1);
}

/**
 * Window frame reveal: ribbon joining the boundary of a quad block on the outer grid to the same boundary on the
 * inner (inset) grid. Both grids must share the station list and ring layout.
 */
export function revealGeometry(outer: LoftGrid, inner: LoftGrid, b: QuadBlock): THREE.BufferGeometry {
  const R = outer.R;
  const { i0, i1, j0, j1 } = b;
  // ring index j and j+R address the same seam vertex; keep j = R itself so the loop has no duplicate point
  const J = (j: number) => (j > R ? j - R : j);
  const loop: [number, number][] = [];
  for (let j = j0; j < j1; j++) loop.push([i0, J(j)]);
  for (let i = i0; i < i1; i++) loop.push([i, J(j1)]);
  for (let j = j1; j > j0; j--) loop.push([i1, J(j)]);
  for (let i = i1; i > i0; i--) loop.push([i, J(j0)]);
  const P = (g: LoftGrid, i: number, j: number) => { const k = (i * (R + 1) + j) * 3; return new THREE.Vector3(g.pos[k], g.pos[k + 1], g.pos[k + 2]); };
  const centre = new THREE.Vector3();
  for (const [i, j] of loop) centre.add(P(outer, i, j));
  centre.multiplyScalar(1 / loop.length);
  const pos: number[] = [], nrm: number[] = [], uv: number[] = [];
  const tri = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, n: THREE.Vector3) => {
    for (const v of [a, b, c]) { pos.push(v.x, v.y, v.z); nrm.push(n.x, n.y, n.z); uv.push(0, 0); }
  };
  const e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), n = new THREE.Vector3(), mid = new THREE.Vector3();
  for (let k = 0; k < loop.length; k++) {
    const [ia, ja] = loop[k], [ib, jb] = loop[(k + 1) % loop.length];
    const ao = P(outer, ia, ja), bo = P(outer, ib, jb), ai = P(inner, ia, ja), bi = P(inner, ib, jb);
    e1.subVectors(bo, ao); e2.subVectors(ai, ao);
    n.crossVectors(e1, e2).normalize();
    mid.addVectors(ao, bo).multiplyScalar(0.5).sub(centre).negate();
    if (n.dot(mid) >= 0) { tri(ao, bo, ai, n); tri(bo, bi, ai, n); }
    else { n.negate(); tri(ao, ai, bo, n); tri(bo, ai, bi, n); }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  return geo;
}

/**
 * One window pane of a quad block with its own [0,1]^2 UV (u along the body, v along the ring, both by arc length)
 * and an `aPane` attribute carrying the pane's physical size (m), a centre-seal flag and an inner-face flag (`flip`),
 * so the glass shader can draw a rubber seal / edge vignette of constant physical width on every pane and treat the
 * cabin side of the glass (cleaner, shaded by the roof) differently from the outside.
 */
export function paneGeometry(g: LoftGrid, b: QuadBlock, flip: boolean, centreSeal = false): THREE.BufferGeometry {
  const R = g.R;
  const J = (j: number) => (j > R ? j - R : j);
  const ni = b.i1 - b.i0, nj = b.j1 - b.j0;
  const P = (i: number, j: number) => { const k = (i * (R + 1) + J(j)) * 3; return [g.pos[k], g.pos[k + 1], g.pos[k + 2]] as const; };
  const dist = (a: readonly [number, number, number], c: readonly [number, number, number]) => Math.hypot(a[0] - c[0], a[1] - c[1], a[2] - c[2]);
  // cumulative arc lengths along both directions
  const along = (ii: number, jj: number, dirI: boolean): [number, number] => {
    let acc = 0, total = 0;
    if (dirI) { for (let k = 0; k < ni; k++) { const d = dist(P(b.i0 + k, b.j0 + jj), P(b.i0 + k + 1, b.j0 + jj)); if (k < ii) acc += d; total += d; } }
    else { for (let k = 0; k < nj; k++) { const d = dist(P(b.i0 + ii, b.j0 + k), P(b.i0 + ii, b.j0 + k + 1)); if (k < jj) acc += d; total += d; } }
    return [acc, total];
  };
  let width = 0, height = 0;
  for (let jj = 0; jj <= nj; jj++) width += along(0, jj, true)[1] / (nj + 1);
  for (let ii = 0; ii <= ni; ii++) height += along(ii, 0, false)[1] / (ni + 1);
  const pos: number[] = [], nrm: number[] = [], uv: number[] = [], pane: number[] = [], idx: number[] = [];
  for (let ii = 0; ii <= ni; ii++) {
    for (let jj = 0; jj <= nj; jj++) {
      const i = b.i0 + ii, j = J(b.j0 + jj), k = i * (R + 1) + j;
      pos.push(g.pos[k * 3], g.pos[k * 3 + 1], g.pos[k * 3 + 2]);
      const f = flip ? -1 : 1;
      nrm.push(g.normal[k * 3] * f, g.normal[k * 3 + 1] * f, g.normal[k * 3 + 2] * f);
      const [au, tu] = along(ii, jj, true), [av, tv] = along(ii, jj, false);
      uv.push(au / Math.max(tu, 1e-6), av / Math.max(tv, 1e-6));
      pane.push(width, height, centreSeal ? 1 : 0, flip ? 1 : 0);
    }
  }
  for (let ii = 0; ii < ni; ii++) for (let jj = 0; jj < nj; jj++) {
    const a = ii * (nj + 1) + jj, c = a + nj + 1;
    if (g.forwardX !== flip) idx.push(a, a + 1, c, a + 1, c + 1, c);
    else idx.push(a, c, a + 1, a + 1, c, c + 1);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setAttribute('aPane', new THREE.Float32BufferAttribute(pane, 4));
  geo.setIndex(idx);
  return geo;
}

/**
 * Glare shield: a flat deck at height y from the rear edge xRear forward to xFront (trimmed to the body width minus
 * inset) whose rear edge rolls down into a half-round lip of radius lipR overhanging the instrument panel. UVs run
 * across the width (u) and rear lip -> front (v) inside the given atlas rectangle.
 */
export function glareShieldGeometry(sections: Section[], y: number, xRear: number, xFront: number, inset: number, lipR: number, uv: { u0: number; v0: number; u1: number; v1: number }, steps = 8): THREE.BufferGeometry {
  const hw = (x: number) => Math.max(halfWidthAt(sectionAt(sections, x), y) - inset, 0.02);
  const pos: number[] = [], nrm: number[] = [], uvs: number[] = [], idx: number[] = [];
  // rows of the strip: lip (rolling from the underside up over the edge) then the deck to the front
  const rows: { x: number; y: number; nx: number; ny: number; v: number }[] = [];
  const LIP = 7;
  for (let k = 0; k <= LIP; k++) {
    const a = (Math.PI * 1.5) - (k / LIP) * Math.PI; // 270 deg (underside) -> 90 deg (top edge)
    rows.push({ x: xRear + Math.cos(a) * lipR, y: y - lipR + Math.sin(a) * lipR, nx: Math.cos(a), ny: Math.sin(a), v: (k / LIP) * 0.3 });
  }
  for (let k = 1; k <= steps; k++) rows.push({ x: xRear + (xFront - xRear) * (k / steps), y, nx: 0, ny: 1, v: 0.3 + 0.7 * (k / steps) });
  const COLS = 10;
  for (const r of rows) {
    const w = hw(Math.max(r.x, xRear));
    for (let c = 0; c <= COLS; c++) {
      const z = -w + (2 * w) * (c / COLS);
      pos.push(r.x, r.y, z); nrm.push(r.nx, r.ny, 0);
      uvs.push(uv.u0 + (uv.u1 - uv.u0) * (c / COLS), uv.v1 + (uv.v0 - uv.v1) * r.v);
    }
  }
  for (let r = 0; r < rows.length - 1; r++) for (let c = 0; c < COLS; c++) {
    const a = r * (COLS + 1) + c, b = a + COLS + 1;
    idx.push(a, a + 1, b, a + 1, b + 1, b);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(idx);
  return geo;
}

/** Flat strap (seat belt) between two points: `width` across, `thick` along the given face normal. */
export function strapGeometry(a: THREE.Vector3, b: THREE.Vector3, width: number, thick: number, faceNormal: THREE.Vector3): THREE.BufferGeometry {
  const dir = b.clone().sub(a).normalize();
  const n = faceNormal.clone().addScaledVector(dir, -faceNormal.dot(dir)).normalize();
  const s = new THREE.Vector3().crossVectors(dir, n).normalize();
  const g = new THREE.BoxGeometry(width, a.distanceTo(b), thick);
  const m = new THREE.Matrix4().makeBasis(s, dir, n).setPosition(a.clone().add(b).multiplyScalar(0.5));
  g.applyMatrix4(m);
  return g;
}

/** Textured quad (placard, screen) of size w x h centred at the origin in the XY plane facing +Z, UVs inside an atlas rectangle. */
export function quadGeometry(w: number, h: number, uv: { u0: number; v0: number; u1: number; v1: number }): THREE.BufferGeometry {
  const g = new THREE.PlaneGeometry(w, h);
  const a = g.getAttribute('uv') as THREE.BufferAttribute;
  for (let i = 0; i < a.count; i++) a.setXY(i, uv.u0 + (uv.u1 - uv.u0) * a.getX(i), uv.v0 + (uv.v1 - uv.v0) * a.getY(i));
  return g;
}

/** Flat horizontal deck (floor, glare shield) at height y between stations x0..x1, trimmed to the body width minus inset. */
export function deckGeometry(sections: Section[], y: number, x0: number, x1: number, inset: number, steps = 8): THREE.BufferGeometry {
  const lo = Math.min(x0, x1), hi = Math.max(x0, x1);
  const pos: number[] = [], nrm: number[] = [], uv: number[] = [];
  const hw = (x: number) => Math.max(halfWidthAt(sectionAt(sections, x), y) - inset, 0.02);
  for (let i = 0; i < steps; i++) {
    const xa = lo + (hi - lo) * (i / steps), xb = lo + (hi - lo) * ((i + 1) / steps);
    const wa = hw(xa), wb = hw(xb);
    const quad = [[xa, -wa], [xb, wb], [xb, -wb], [xa, -wa], [xa, wa], [xb, wb]];
    for (const [x, z] of quad) { pos.push(x, y, z); nrm.push(0, 1, 0); uv.push((x - lo) / (hi - lo), z * 0.5 + 0.5); }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  return geo;
}

/**
 * Hump lofted along -X on top of a body (wing-root fairing): at each station the ring is the `top` curve from the
 * centreline out to z = +w, the `bottom` curve back across to -w and the top curve home. With `bottom` sunk into the
 * body skin and `top` blending tangentially into it, only the raised part is ever visible and there is no seam.
 * Stations run nose -> tail (x descending); the ends are capped.
 */
export function humpGeometry(
  stations: { x: number; w: number }[], top: (x: number, z: number) => number, bottom: (x: number, z: number) => number,
  topSegs = 16, botSegs = 6,
): THREE.BufferGeometry {
  const S = stations.length, half = topSegs / 2, R = topSegs + botSegs;
  const ringZ: number[] = [];
  for (let k = 0; k <= half; k++) ringZ.push(k / half);          // top: 0 -> +w
  for (let k = 1; k <= botSegs; k++) ringZ.push(1 - 2 * (k / botSegs)); // bottom: +w -> -w
  for (let k = 1; k <= half; k++) ringZ.push(-1 + k / half);      // top: -w -> 0
  const onTop = (j: number) => j <= half || j >= half + botSegs;
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  let total = 0;
  for (let i = 1; i < S; i++) total += Math.abs(stations[i].x - stations[i - 1].x);
  let dist = 0;
  for (let i = 0; i < S; i++) {
    const st = stations[i];
    if (i > 0) dist += Math.abs(st.x - stations[i - 1].x);
    for (let j = 0; j <= R; j++) {
      const z = ringZ[j] * st.w;
      pos.push(st.x, onTop(j) ? top(st.x, z) : bottom(st.x, z), z);
      uv.push(dist / Math.max(total, 1e-6), j / R);
    }
  }
  for (let i = 0; i < S - 1; i++) for (let j = 0; j < R; j++) pushQuad(idx, i, j, R, false, false);
  const cap = (i: number, nx: number) => {
    const base = pos.length / 3;
    let cy = 0;
    for (let j = 0; j < R; j++) cy += pos[(i * (R + 1) + j) * 3 + 1];
    pos.push(stations[i].x, cy / R, 0); uv.push(i === 0 ? 0 : 1, 0.5);
    for (let j = 0; j <= R; j++) { const k = i * (R + 1) + j; pos.push(pos[k * 3], pos[k * 3 + 1], pos[k * 3 + 2]); uv.push(uv[k * 2], uv[k * 2 + 1]); }
    for (let j = 0; j < R; j++) {
      if (nx > 0) idx.push(base, base + 1 + j, base + 2 + j);
      else idx.push(base, base + 2 + j, base + 1 + j);
    }
  };
  cap(0, 1);
  cap(S - 1, -1);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  // seam vertices (first/last of each ring) share a position: average their normals
  const nrm = g.getAttribute('normal') as THREE.BufferAttribute;
  for (let i = 0; i < S; i++) {
    const a = i * (R + 1), b = a + R;
    const n = new THREE.Vector3(nrm.getX(a) + nrm.getX(b), nrm.getY(a) + nrm.getY(b), nrm.getZ(a) + nrm.getZ(b)).normalize();
    nrm.setXYZ(a, n.x, n.y, n.z); nrm.setXYZ(b, n.x, n.y, n.z);
  }
  return g;
}

/** Simple closed loft through sections with uniform rings (floats). */
export function loft(sections: Section[], radial = 28, closeEnds = true): THREE.BufferGeometry {
  const grid = loftGrid(sections, () => uniformRing(radial));
  return gridGeometry(grid, { capStart: closeEnds, capEnd: closeEnds });
}

// ------------------------------------------------------------------ wings

export interface WingSpec {
  span: number;      // one side, root to tip
  rootChord: number;
  tipChord: number;
  sweep: number;     // tip x offset of the 30% chord line (negative = aft)
  dihedral: number;  // radians
  thickness: number; // t/c
  twist: number;     // tip incidence change (radians, negative = washout)
  camber?: number;   // max camber / chord
  /** trailing-edge half thickness / chord (a real skin-and-rivet TE is a few mm thick, never a knife edge) */
  te?: number;
}

const DEFAULT_TE = 0.0035;

function thicknessY(x: number, thickness: number, te = DEFAULT_TE): number {
  // NACA 4-digit half thickness (closed TE) plus a linear ramp that opens the trailing edge to `te`
  return 5 * thickness * (0.2969 * Math.sqrt(x) - 0.126 * x - 0.3516 * x * x + 0.2843 * x ** 3 - 0.1036 * x ** 4) + te * x;
}
function camberY(x: number, camber: number): number {
  return camber * Math.sin(Math.PI * x);
}

export function wingChord(spec: WingSpec, z: number): number {
  return spec.rootChord + (spec.tipChord - spec.rootChord) * (z / spec.span);
}
/** Leading-edge x in the wing frame (origin at the root 30% chord point). */
export function wingXLE(spec: WingSpec, z: number): number {
  return 0.3 * wingChord(spec, z) + spec.sweep * (z / spec.span);
}
export function wingXTE(spec: WingSpec, z: number): number {
  return wingXLE(spec, z) - wingChord(spec, z);
}
/** Lower-surface height (wing frame) at chordwise position x and span station z. */
export function wingLowerY(spec: WingSpec, x: number, z: number): number {
  const c = wingChord(spec, z);
  const p = THREE.MathUtils.clamp((wingXLE(spec, z) - x) / c, 0, 1);
  return Math.tan(spec.dihedral) * z + (camberY(p, spec.camber ?? 0.02) - thicknessY(p, spec.thickness, spec.te)) * c;
}
export function wingUpperY(spec: WingSpec, x: number, z: number): number {
  const c = wingChord(spec, z);
  const p = THREE.MathUtils.clamp((wingXLE(spec, z) - x) / c, 0, 1);
  return Math.tan(spec.dihedral) * z + (camberY(p, spec.camber ?? 0.02) + thicknessY(p, spec.thickness, spec.te)) * c;
}

export type WingPart = 'full' | 'front' | 'rear';

interface ProfilePt { x: number; y: number; u: number; /** endpoint of the flat hinge / nose face inside the hinge gap */ flat?: boolean; }

/**
 * Closed profile loop in chord units (x: 0 leading edge .. 1 trailing edge). Runs from the trailing edge (or hinge)
 * forward along the upper surface, around the nose and back along the lower surface. Corners are duplicated so
 * they shade as hard edges; the loop's last point repeats the first (UV seam).
 *  full  : complete airfoil
 *  front : airfoil ahead of the hinge at chord fraction f, closed by the flat hinge face
 *  rear  : control surface behind chord fraction f, closed by a flat nose face
 */
function profileLoop(part: WingPart, f: number, thickness: number, camber: number, n: number, te = DEFAULT_TE): ProfilePt[] {
  const up = (x: number): ProfilePt => ({ x, y: camberY(x, camber) + thicknessY(x, thickness, te), u: 0.5 - 0.5 * x });
  const lo = (x: number): ProfilePt => ({ x, y: camberY(x, camber) - thicknessY(x, thickness, te), u: 0.5 + 0.5 * x });
  const pts: ProfilePt[] = [];
  if (part === 'rear') {
    // blunt trailing edge: upper and lower skins end `te` apart and a tiny flat closes them
    pts.push(up(1));
    for (let k = 1; k < n; k++) pts.push(up(f + (1 - f) * (1 - k / n)));
    pts.push(up(f), { ...up(f), flat: true });      // hard corner at the nose face
    pts.push({ ...lo(f), flat: true }, lo(f));
    for (let k = 1; k < n; k++) pts.push(lo(f + (1 - f) * (k / n)));
    pts.push(lo(1), { ...up(1), u: 1 });
    return pts;
  }
  // One chord grid (quadratic: dense at the leading edge) shared by every part, so the surface vertices of a
  // 'front' panel coincide with those of a neighbouring 'full' panel and the seams can be welded smooth. The
  // grid points behind the hinge collapse onto it, so the loop length never depends on the hinge fraction
  // (which varies along a tapered panel with a straight hinge) and rings stay in lockstep.
  const grid = (k: number) => Math.pow(1 - k / n, 2);
  const xmax = part === 'front' ? f : 1;
  pts.push(up(xmax));
  if (part === 'front') pts.push(up(xmax));
  const inner: number[] = [];
  for (let k = 1; k <= n; k++) inner.push(Math.min(grid(k), xmax));
  for (const x of inner) pts.push(up(x));                          // upper surface to the leading edge (last item, x = 0)
  for (let i = inner.length - 2; i >= 0; i--) pts.push(lo(inner[i])); // lower surface back from the leading edge
  pts.push(lo(xmax));
  if (part === 'front') pts.push({ ...lo(xmax), flat: true });
  pts.push({ ...up(xmax), u: part === 'front' ? 0.5 - 0.5 * xmax : 1, flat: part === 'front' });
  return pts;
}

export interface PanelOptions {
  z0: number;
  z1: number;
  segments: number;
  part: WingPart;
  /** hinge line x in the wing frame (constant -> straight hinge); required for front/rear parts */
  hingeX?: number;
  /** gap between a rear part's nose and the hinge face */
  gap?: number;
  /** flat caps at the ends: fill the given profile region (the rear region at a notch wall, full at a stub) */
  capStart?: WingPart;
  capEnd?: WingPart;
  /** elliptical tip rounding appended after z1 (length along the span) */
  tipRound?: number;
  /** points per surface */
  n?: number;
  /** texture v of span station z (default z / span) */
  vOf?: (z: number) => number;
}

/** vertex colour of the flat faces inside a hinge gap (multiplies the paint so the gap reads as a dark line) */
const HINGE_SHADE = 0.22;

/**
 * Lofted wing panel along +Z in the wing frame (origin at the root 30% chord point, leading edge toward +X).
 * UV: u chordwise (0 trailing edge, 0.5 leading edge, 1 trailing edge under), v spanwise fraction. A `color`
 * attribute is white except on the hinge-gap faces, which are shaded dark (use a material with vertexColors).
 */
export function wingPanel(spec: WingSpec, o: PanelOptions): THREE.BufferGeometry {
  const camber = spec.camber ?? 0.02;
  const n = o.n ?? 12;
  const pos: number[] = [], uv: number[] = [], idx: number[] = [], col: number[] = [];
  const rings: { z: number; scale: number }[] = [];
  for (let i = 0; i <= o.segments; i++) rings.push({ z: o.z0 + (o.z1 - o.z0) * (i / o.segments), scale: 1 });
  if (o.tipRound && o.tipRound > 0) {
    const K = 6;
    for (let k = 1; k <= K; k++) {
      const phi = (k / K) * Math.PI / 2;
      rings.push({ z: o.z1 + o.tipRound * Math.sin(phi), scale: Math.max(Math.cos(phi), 0.02) });
    }
  }
  const hingeFraction = (z: number) => {
    const chord = wingChord(spec, z), xle = wingXLE(spec, z);
    return o.hingeX !== undefined ? (xle - o.hingeX) / chord : 0.75;
  };
  let P = 0;
  const place = (p: ProfilePt, z: number, zPlan: number, scale: number, out: number[]) => {
    const chord = wingChord(spec, zPlan), xle = wingXLE(spec, zPlan);
    const tw = spec.twist * (zPlan / spec.span);
    const px = 0.5 + (p.x - 0.5) * scale, py = p.y * scale;
    const lx = (px - 0.3) * chord, ly = py * chord;
    const c = Math.cos(tw), s = Math.sin(tw);
    // positive twist raises the leading edge
    const rx = lx * c + ly * s, ry = -lx * s + ly * c;
    out.push(-rx + (xle - 0.3 * chord), Math.tan(spec.dihedral) * z + ry, z);
  };
  const vOf = o.vOf ?? ((z: number) => Math.min(1, z / spec.span));
  for (const r of rings) {
    const zPlan = Math.min(r.z, o.z1);
    const chord = wingChord(spec, zPlan);
    const f = hingeFraction(zPlan);
    const loop = profileLoop(o.part, o.part === 'rear' ? f + (o.gap ?? 0.015) / chord : f, spec.thickness, camber, n, spec.te);
    P = loop.length;
    for (const p of loop) {
      place(p, r.z, zPlan, r.scale, pos);
      const v = vOf(Math.min(r.z, o.z1));
      // flat gap faces sample one plain spot of the paint (their u would otherwise sweep the whole chord)
      if (p.flat) { uv.push(0.02, v); col.push(HINGE_SHADE, HINGE_SHADE, HINGE_SHADE); }
      else { uv.push(p.u, v); col.push(1, 1, 1); }
    }
  }
  for (let i = 0; i < rings.length - 1; i++) {
    for (let j = 0; j < P - 1; j++) {
      const a = i * P + j, b = a + P;
      idx.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  // caps: flat fans over a profile region at an end station
  const cap = (z: number, region: WingPart, facingPlusZ: boolean) => {
    const f = hingeFraction(z);
    const loop = profileLoop(region, f, spec.thickness, camber, n, spec.te);
    const base = pos.length / 3;
    const tmp: number[] = [];
    for (const p of loop) place(p, z, z, 1, tmp);
    let cx = 0, cy = 0;
    const m = loop.length - 1;
    for (let k = 0; k < m; k++) { cx += tmp[k * 3]; cy += tmp[k * 3 + 1]; }
    pos.push(cx / m, cy / m, z); uv.push(0.5, vOf(z)); col.push(1, 1, 1);
    for (let k = 0; k < m; k++) { pos.push(tmp[k * 3], tmp[k * 3 + 1], tmp[k * 3 + 2]); uv.push(loop[k].u, vOf(z)); col.push(1, 1, 1); }
    // the loop runs clockwise seen from +Z (trailing edge -> forward along the top -> back along the bottom)
    for (let k = 0; k < m; k++) {
      const a = base + 1 + k, b = base + 1 + ((k + 1) % m);
      if (facingPlusZ) idx.push(base, b, a);
      else idx.push(base, a, b);
    }
  };
  if (o.capStart) cap(o.z0, o.capStart, false);
  if (o.capEnd) cap(o.z1, o.capEnd, true);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/**
 * Weld coincident vertices (same position, uv and colour) and recompute smooth normals over the welded mesh.
 * Merged panels that share their surface vertices shade continuously; deliberately duplicated corners (hinge
 * faces, chines) keep their hard edge because their uv / colour differ.
 */
export function weldSmooth(geo: THREE.BufferGeometry, tolerance = 1e-4): THREE.BufferGeometry {
  geo.deleteAttribute('normal');
  const g = mergeVertices(geo, tolerance);
  g.computeVertexNormals();
  return g;
}

/**
 * Propeller blade: round shank at the root widening to the widest chord around 40 % radius, then tapering to an
 * elliptically rounded tip. Twisted (coarse pitch at the root), slightly cambered. Root at origin, extends +Y;
 * the pitch axis sits at 35 % chord.
 */
export function bladeGeometry(length: number, rootChord: number, tipChord: number): THREE.BufferGeometry {
  const segs = 16, n = 12; // n points around the closed section
  const pos: number[] = [], idx: number[] = [], uv: number[] = [];
  const maxChord = rootChord * 1.35;
  const chordAt = (t: number) => {
    const grow = THREE.MathUtils.smoothstep(t, 0, 0.42);
    let c = rootChord * 0.75 + (maxChord - rootChord * 0.75) * grow;
    if (t > 0.42) c = maxChord + (tipChord - maxChord) * ((t - 0.42) / 0.58);
    // elliptical tip over the last 18 % of the radius
    if (t > 0.82) c *= Math.sqrt(Math.max(1 - Math.pow((t - 0.82) / 0.18, 2), 0));
    return Math.max(c, 0.012);
  };
  for (let i = 0; i <= segs; i++) {
    // denser rings toward the tip where the planform curves
    const t = i / segs;
    // clamp: at t = 1 the ratio rounds to 1 + 2e-16 and pow(negative, 1.6) is NaN (whole tip ring)
    const tt = t < 0.7 ? t : 0.7 + 0.3 * (1 - Math.pow(Math.max(0, 1 - (t - 0.7) / 0.3), 1.6));
    const y = tt * length;
    const chord = chordAt(tt);
    // thick, nearly round shank at the root blending into a thin airfoil outboard
    const tr = 0.075 + 0.55 * Math.pow(1 - tt, 3.2);
    const thick = chord * tr;
    const pitch = 0.95 - 0.7 * tt;
    const c = Math.cos(pitch), s = Math.sin(pitch);
    for (let j = 0; j < n; j++) {
      // walk around the section: leading edge -> upper surface -> trailing edge -> lower surface
      const a = (j / n) * Math.PI * 2;
      const u = -0.5 * Math.cos(a);                 // chordwise -0.5 .. 0.5 about the mid chord
      const upper = Math.sin(a) >= 0;
      const camber = 0.07 * chord * (1 - 4 * u * u) * (1 - Math.min(tr, 0.5) * 1.6);
      const half = 0.5 * thick * Math.sqrt(Math.max(0, 1 - 4 * u * u)) * Math.abs(Math.sin(a));
      const lx = (u + 0.15) * chord, lz = camber + (upper ? half : -half);
      pos.push(lx * c - lz * s, y, lx * s + lz * c);
      uv.push(j / n, tt);
    }
  }
  for (let i = 0; i < segs; i++) for (let j = 0; j < n; j++) {
    const j1 = (j + 1) % n;
    const a = i * n + j, b = a + n, a1 = i * n + j1, b1 = a1 + n;
    idx.push(a, b, a1, a1, b, b1);
  }
  // tip cap (the last ring is small but not a point)
  const tipBase = segs * n, centre = pos.length / 3;
  let cx = 0, cz = 0;
  for (let j = 0; j < n; j++) { cx += pos[(tipBase + j) * 3]; cz += pos[(tipBase + j) * 3 + 2]; }
  pos.push(cx / n, length, cz / n); uv.push(0.5, 1);
  for (let j = 0; j < n; j++) idx.push(centre, tipBase + j, tipBase + ((j + 1) % n));
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Ogival spinner of base radius r and length len, base at the origin, pointing +X. */
export function spinnerGeometry(r: number, len: number, segments = 24): THREE.BufferGeometry {
  const pts: THREE.Vector2[] = [];
  const N = 14;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    // tangent ogive: full radius at the base, gently rounding to the point
    pts.push(new THREE.Vector2(r * Math.pow(Math.max(1 - Math.pow(t, 1.7), 0), 0.72), t * len));
  }
  const g = new THREE.LatheGeometry(pts, segments);
  g.rotateZ(-Math.PI / 2); // lathe axis +Y -> +X
  return g;
}

/** Float hull station: chine height `yc`, half beam `w` at the chine, deck `top` above it, keel `bot` below. */
export interface FloatStation {
  x: number;
  yc: number;
  w: number;
  top: number;
  bot: number;
  /** deck / side roundness (superellipse exponent of the upper half; higher = squarer deck edge) */
  n?: number;
  /** bottom convexity exponent (1 = straight V from the chine to the keel) */
  vee?: number;
  /** emit this station twice with no quads between the copies: a hard edge across the hull (the step) */
  split?: boolean;
}

/**
 * Float hull loft with hard chine and keel lines: every station's ring runs deck centre -> rounded deck edge and
 * side down to the chine (duplicated vertex) -> V bottom to the keel (duplicated) -> mirrored. Texture v is fixed
 * per ring vertex (deck 0-0.12, side 0.12-0.22, chine 0.22, keel 0.5, port side mirrored) so the float paint
 * can put its deck, waterline and keel bands exactly on those features. Stations run bow -> stern along -X.
 */
export function floatHull(stations: FloatStation[], deckSegs = 8, bottomSegs = 5): THREE.BufferGeometry {
  const V_CHINE = 0.22;
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  const ring: { y: number; z: number; v: number }[] = [];
  const rows: { pos: number[]; x: number }[] = [];
  const ringOf = (s: FloatStation) => {
    ring.length = 0;
    const n = s.n ?? 3.0, vee = s.vee ?? 1.15;
    const half: { y: number; z: number; v: number }[] = [];
    // deck + side: superellipse upper half from the crown (t = 0) to the chine (t = 0.25), by arc length
    const sec: Section = { x: s.x, yc: s.yc, w: s.w, top: s.top, bot: s.bot, n };
    const ts: number[] = [];
    arcSpread(sec, 0, 0.25, deckSegs, ts);
    const p: [number, number] = [0, 0];
    half.push({ y: s.yc + s.top, z: 0, v: 0 });
    for (let k = 0; k < ts.length; k++) {
      sectionPoint(sec, ts[k], p);
      half.push({ y: p[0], z: p[1], v: V_CHINE * ((k + 1) / deckSegs) });
    }
    // chine duplicate, then the V bottom to the keel
    half.push({ y: s.yc, z: s.w, v: V_CHINE });
    for (let k = 1; k <= bottomSegs; k++) {
      const f = k / bottomSegs; // 0 at the chine .. 1 at the keel
      const z = s.w * (1 - f);
      half.push({ y: s.yc - s.bot * (1 - Math.pow(1 - f, vee)), z, v: V_CHINE + (0.5 - V_CHINE) * f });
    }
    for (const h of half) ring.push(h);
    // keel duplicate and the port side mirrored (bottom first, then deck) back to the crown
    for (let i = half.length - 1; i >= 0; i--) ring.push({ y: half[i].y, z: -half[i].z, v: 1 - half[i].v });
    return ring;
  };
  let total = 0;
  for (let i = 1; i < stations.length; i++) total += Math.abs(stations[i].x - stations[i - 1].x);
  let dist = 0;
  const emitRow = (s: FloatStation, u: number) => {
    const r = ringOf(s);
    const row: number[] = [];
    for (const q of r) { row.push(pos.length / 3); pos.push(s.x, q.y, q.z); uv.push(u, q.v); }
    rows.push({ pos: row, x: s.x });
  };
  const splitRows: number[] = [];
  for (let i = 0; i < stations.length; i++) {
    const s = stations[i];
    if (i > 0) dist += Math.abs(s.x - stations[i - 1].x);
    emitRow(s, dist / Math.max(total, 1e-6));
    if (s.split) { splitRows.push(rows.length - 1); emitRow(s, dist / Math.max(total, 1e-6)); }
  }
  const R = rows[0].pos.length;
  for (let i = 0; i < rows.length - 1; i++) {
    if (splitRows.includes(i)) continue; // no quads between the two copies of a split station
    const a = rows[i].pos, b = rows[i + 1].pos;
    for (let j = 0; j < R - 1; j++) {
      // stations run along -X and the ring is counter-clockwise seen from +X: (a[j], b[j], a[j+1]) winds outward
      idx.push(a[j], b[j], a[j + 1], a[j + 1], b[j], b[j + 1]);
    }
  }
  // end caps: fans facing away from the body (the ring is counter-clockwise seen from +X)
  const cap = (row: number[], x: number, nx: number) => {
    const c = pos.length / 3;
    let cy = 0;
    for (let j = 0; j < R - 1; j++) cy += pos[row[j] * 3 + 1];
    pos.push(x, cy / (R - 1), 0); uv.push(nx > 0 ? 0 : 1, 0.5);
    for (let j = 0; j < R - 1; j++) {
      if (nx > 0) idx.push(c, row[j], row[j + 1]);
      else idx.push(c, row[j + 1], row[j]);
    }
  };
  cap(rows[0].pos, rows[0].x, 1);
  cap(rows[rows.length - 1].pos, rows[rows.length - 1].x, -1);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  // the crown vertex opens and closes each ring: give both copies one normal
  const nrm = g.getAttribute('normal') as THREE.BufferAttribute;
  for (const r of rows) {
    const a = r.pos[0], b = r.pos[R - 1];
    const n = new THREE.Vector3(nrm.getX(a) + nrm.getX(b), nrm.getY(a) + nrm.getY(b), nrm.getZ(a) + nrm.getZ(b)).normalize();
    nrm.setXYZ(a, n.x, n.y, n.z); nrm.setXYZ(b, n.x, n.y, n.z);
  }
  return g;
}

/** Matrix placing a +Y cylinder of the right length between two points. */
function betweenMatrix(a: THREE.Vector3, b: THREE.Vector3): THREE.Matrix4 {
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  return new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1));
}

/** Tube between two points (geometry in the parent's space). */
export function strutGeometry(a: THREE.Vector3, b: THREE.Vector3, radius: number, segments = 8): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(radius, radius, a.distanceTo(b), segments);
  g.applyMatrix4(betweenMatrix(a, b));
  return g;
}

/** Streamlined (airfoil-section) strut between two points; wider than thick (geometry in the parent's space). */
export function fairedStrutGeometry(a: THREE.Vector3, b: THREE.Vector3, width: number, thick: number): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(0.5, 0.5, a.distanceTo(b), 10);
  g.scale(width, 1, thick);
  g.applyMatrix4(betweenMatrix(a, b));
  return g;
}

/** Tube between two points. */
export function strut(a: THREE.Vector3, b: THREE.Vector3, radius: number, mat: THREE.Material, segments = 8): THREE.Mesh {
  const m = new THREE.Mesh(strutGeometry(a, b, radius, segments), mat);
  m.castShadow = true;
  return m;
}

/** Streamlined (airfoil-section) strut between two points; wider than thick. */
export function fairedStrut(a: THREE.Vector3, b: THREE.Vector3, width: number, thick: number, mat: THREE.Material): THREE.Mesh {
  const m = new THREE.Mesh(fairedStrutGeometry(a, b, width, thick), mat);
  m.castShadow = true;
  return m;
}

// ------------------------------------------------------------------ batching

/** Local transform of a part: position, Euler rotation and scale (all optional). */
export function placement(position?: THREE.Vector3 | [number, number, number], rotation?: THREE.Euler | [number, number, number], scale?: THREE.Vector3 | [number, number, number] | number): THREE.Matrix4 {
  const p = position instanceof THREE.Vector3 ? position : new THREE.Vector3(...(position ?? [0, 0, 0]));
  const e = rotation instanceof THREE.Euler ? rotation : new THREE.Euler(...(rotation ?? [0, 0, 0]));
  const s = typeof scale === 'number' ? new THREE.Vector3(scale, scale, scale) : scale instanceof THREE.Vector3 ? scale : new THREE.Vector3(...(scale ?? [1, 1, 1]));
  return new THREE.Matrix4().compose(p, new THREE.Quaternion().setFromEuler(e), s);
}

/** Copy of a geometry with an explicit index (merging needs every part indexed or none). */
export function toIndexed(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  const g = geo.clone();
  if (g.index) return g;
  const n = g.getAttribute('position').count;
  const idx = new Uint32Array(n);
  for (let i = 0; i < n; i++) idx[i] = i;
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  return g;
}

/**
 * Copy of a geometry with a part's local matrix baked in. Mirroring (negative determinant) reverses the
 * orientation of every triangle, so the winding is flipped back to keep the faces front-facing.
 */
export function baked(geo: THREE.BufferGeometry, m?: THREE.Matrix4): THREE.BufferGeometry {
  const g = toIndexed(geo);
  if (!m) return g;
  g.applyMatrix4(m);
  if (m.determinant() < 0) {
    const idx = g.index!;
    for (let i = 0; i < idx.count; i += 3) {
      const b = idx.getX(i + 1), c = idx.getX(i + 2);
      idx.setX(i + 1, c); idx.setX(i + 2, b);
    }
  }
  return g;
}

/** Surface parameters of a part inside a batch (see `partsMaterial`): base colour, roughness, metalness. */
export interface Surf { color: number; roughness: number; metalness: number; }

/**
 * Give every vertex the part's colour (linear, `color` attribute) and roughness/metalness (`aSurf`). A function
 * picks the finish per vertex from its local position (e.g. headliner above the windows, trim below).
 */
export function tagSurface(g: THREE.BufferGeometry, surf: Surf | ((x: number, y: number, z: number) => Surf)): THREE.BufferGeometry {
  const pos = g.getAttribute('position');
  const n = pos.count;
  const col = new Float32Array(n * 3), sf = new Float32Array(n * 2);
  const c = new THREE.Color();
  let last: Surf | null = null;
  for (let i = 0; i < n; i++) {
    const s = typeof surf === 'function' ? surf(pos.getX(i), pos.getY(i), pos.getZ(i)) : surf;
    if (s !== last) { c.set(s.color); last = s; }
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    sf[i * 2] = s.roughness; sf[i * 2 + 1] = s.metalness;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setAttribute('aSurf', new THREE.BufferAttribute(sf, 2));
  return g;
}

/**
 * One lit material for many differently finished parts: the colour comes from the `color` attribute and
 * roughness/metalness from the `aSurf` attribute (see `tagSurface`), so struts, seats, rubber and metal
 * fittings merge into a single draw call while keeping their individual finishes.
 */
export function partsMaterial(): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1.0, metalness: 1.0, vertexColors: true });
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec2 aSurf;\nvarying vec2 vSurf;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvSurf = aSurf;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vSurf;')
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = roughness * vSurf.x;')
      .replace('#include <metalnessmap_fragment>', 'float metalnessFactor = metalness * vSurf.y;');
  };
  mat.customProgramCacheKey = () => 'plane-parts-v1';
  return mat;
}

/** Collects geometries (with baked placements) that share one material and merges them into a single geometry. */
export class Batch {
  private readonly parts: THREE.BufferGeometry[] = [];
  constructor(private readonly defaultSurf?: Surf) {}

  add(geo: THREE.BufferGeometry, m?: THREE.Matrix4, surf: Surf | ((x: number, y: number, z: number) => Surf) | undefined = this.defaultSurf): this {
    const g = baked(geo, m);
    if (surf) tagSurface(g, surf);
    this.parts.push(g);
    return this;
  }

  get size(): number { return this.parts.length; }

  build(): THREE.BufferGeometry {
    if (this.parts.length === 1) return this.parts[0];
    const merged = mergeGeometries(this.parts, false);
    if (!merged) throw new Error('Batch: parts have incompatible attributes');
    return merged;
  }
}
