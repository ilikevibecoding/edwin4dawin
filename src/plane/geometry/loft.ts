import * as THREE from 'three';

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

/**
 * Sections with intermediate stations inserted wherever two consecutive stations are more than `maxSpan` apart,
 * the inserted sections following a monotone cubic (Fritsch-Carlson) through the neighbouring stations' parameters
 * instead of the straight line `sectionAt` draws. A loft with 1 m spans between hand-placed stations reads as a
 * series of cones under a clear-coat highlight (the "faceting bands" along the belly); the cubic gives it a smooth
 * curvature along its length without ever overshooting a station.
 */
export function smoothStations(sections: Section[], maxSpan: number): Section[] {
  const S = sections.length;
  if (S < 3) return sections.slice();
  const xs = sections.map((s) => s.x);
  const keys = ['yc', 'w', 'top', 'bot', 'n', 'nBot'] as const;
  const value = (s: Section, k: typeof keys[number]): number => (k === 'n' ? s.n ?? 2.2 : k === 'nBot' ? s.nBot ?? s.n ?? 2.2 : s[k]);
  const tangents = (ys: number[]): number[] => {
    const h: number[] = [], d: number[] = [];
    for (let i = 0; i < S - 1; i++) { h.push(xs[i + 1] - xs[i]); d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i])); }
    const m = new Array<number>(S).fill(0);
    m[0] = d[0]; m[S - 1] = d[S - 2];
    for (let i = 1; i < S - 1; i++) {
      if (d[i - 1] * d[i] <= 0) { m[i] = 0; continue; }
      m[i] = 3 * (h[i - 1] + h[i]) / ((2 * h[i] + h[i - 1]) / d[i - 1] + (h[i] + 2 * h[i - 1]) / d[i]);
    }
    return m;
  };
  const series = keys.map((k) => { const ys = sections.map((s) => value(s, k)); return { ys, m: tangents(ys) }; });
  const out: Section[] = [];
  for (let i = 0; i < S - 1; i++) {
    out.push(sections[i]);
    const h = xs[i + 1] - xs[i];
    const k = Math.floor(Math.abs(h) / maxSpan);
    for (let j = 1; j <= k; j++) {
      const f = j / (k + 1), f2 = f * f, f3 = f2 * f;
      const h00 = 2 * f3 - 3 * f2 + 1, h10 = f3 - 2 * f2 + f, h01 = -2 * f3 + 3 * f2, h11 = f3 - f2;
      const at = (ki: number) => { const { ys, m } = series[ki]; return h00 * ys[i] + h10 * h * m[i] + h01 * ys[i + 1] + h11 * h * m[i + 1]; };
      out.push({ x: xs[i] + h * f, yc: at(0), w: at(1), top: at(2), bot: at(3), n: at(4), nBot: at(5) });
    }
  }
  out.push(sections[S - 1]);
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
export function arcSpread(s: Section, t0: number, t1: number, segs: number, out: number[]): void {
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
