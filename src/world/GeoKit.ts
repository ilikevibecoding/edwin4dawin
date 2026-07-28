import * as THREE from 'three';

/**
 * Geometry primitives for the level builder.
 *
 * Everything here authors UVs in *tile units* — that is, `uv = metres / tile` —
 * which is the same convention `LevelSystem.box()` uses. Getting this wrong is
 * the single easiest way to make a surface look fake, because the texel density
 * stops matching its neighbours and the eye reads the seam instantly.
 */

/** A closed 2-D outline, listed counter-clockwise, in (u, v) local units. */
export type Profile = Array<[number, number]>;

const _v2a = new THREE.Vector2();
const _v2b = new THREE.Vector2();
const _m4 = new THREE.Matrix4();

/**
 * Extrudes a closed profile along an axis.
 *
 * The profile is authored in the plane perpendicular to `axis`: for `axis: 'z'`
 * the pair is (x, y), for `axis: 'x'` it is (z, y). Concave profiles are handled
 * — stepped cornices and gutter channels are both concave — and every face gets
 * UVs measured along the profile's own perimeter, so a moulding's texture runs
 * continuously around it instead of stretching across the step.
 *
 * Built in the (x, y) / extrude-along-Z frame and then rotated into place, so
 * there is only one winding convention to get right.
 */
export function prism(
  profile: Profile,
  length: number,
  tile: number,
  axis: 'x' | 'y' | 'z' = 'x',
): THREE.BufferGeometry {
  const n = profile.length;
  const contour = profile.map(([a, b]) => new THREE.Vector2(a, b));
  const tris = THREE.ShapeUtils.triangulateShape(contour, []);
  const contourCCW = !THREE.ShapeUtils.isClockWise(contour);

  const pos: number[] = [];
  const nor: number[] = [];
  const uv: number[] = [];
  const half = length / 2;

  // ---- end caps ----
  // A counter-clockwise triangle in the (x, y) plane faces +Z.
  for (const cap of [-1, 1]) {
    const flip = (cap > 0) !== contourCCW;
    for (const t of tris) {
      const order = flip ? [t[2], t[1], t[0]] : [t[0], t[1], t[2]];
      for (const i of order) {
        const [a, b] = profile[i];
        pos.push(a, b, cap * half);
        nor.push(0, 0, cap);
        uv.push(a / tile, b / tile);
      }
    }
  }

  // ---- side walls ----
  let run = 0;
  for (let i = 0; i < n; i++) {
    const [a0, b0] = profile[i];
    const [a1, b1] = profile[(i + 1) % n];
    const seg = _v2a.set(a1 - a0, b1 - b0);
    const segLen = seg.length();
    if (segLen < 1e-6) continue;
    // Outward normal of a counter-clockwise contour is the right-hand
    // perpendicular of the edge direction.
    const pn = _v2b.set(seg.y, -seg.x).multiplyScalar((contourCCW ? 1 : -1) / segLen);

    const u0 = run / tile;
    const u1 = (run + segLen) / tile;
    const v0 = -half / tile;
    const v1 = half / tile;

    const quad: Array<[number, number, number, number, number]> = [
      [a0, b0, -half, u0, v0],
      [a1, b1, -half, u1, v0],
      [a1, b1, half, u1, v1],
      [a0, b0, -half, u0, v0],
      [a1, b1, half, u1, v1],
      [a0, b0, half, u0, v1],
    ];
    for (const [a, b, t, tu, tv] of quad) {
      pos.push(a, b, t);
      nor.push(pn.x, pn.y, 0);
      uv.push(tu, tv);
    }
    run += segLen;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));

  // Rotations only — a mirror would invert every face.
  if (axis === 'x') geo.applyMatrix4(_m4.makeRotationY(Math.PI / 2));
  else if (axis === 'y') geo.applyMatrix4(_m4.makeRotationX(-Math.PI / 2));
  return geo;
}

export interface ArchRingOptions {
  /** Number of voussoirs across the half-turn. */
  stones?: number;
  /** Radial depth of the ring: extrados radius minus intrados radius. */
  thickness?: number;
  /** Extrusion through the wall. */
  depth?: number;
  /** Extra projection beyond `depth`, drawn at random per stone. */
  jitter?: number;
  /** Fraction of each stone's angular slot left as an open joint. */
  joint?: number;
  tile?: number;
  /** Deterministic 0..1 source; without it the stones are uniform. */
  rand?: () => number;
  /**
   * Radial rise of the centre stone above the extrados, and its extra
   * projection through the wall. Zero for a plain ring.
   *
   * An arch without a keystone has no centre. The eye reads a voussoir ring by
   * following the joints up to the crown, and if the crown stone is the same size
   * as its neighbours there is nothing there to arrive at — which is most of what
   * the review meant by "architecturally illiterate". Only takes effect on an odd
   * stone count, because an even one has a joint at the crown, not a stone.
   */
  keystone?: number;
}

/**
 * A voussoir ring for a segmental or semicircular arch.
 *
 * Springing sits at the origin, the arch opens upward, and the soffit runs from
 * (-half, 0) to (half, 0) through (0, rise). Each stone is a separate solid, so
 * the bed joints between them catch light and the ring reads as cut masonry.
 *
 * Built as discrete wedges rather than tangentially-rotated boxes on purpose:
 * a box rotated to the local tangent only touches the curve at its midpoint, so
 * on anything but a shallow arc the corners splay off the ring and the whole
 * thing reads as a starburst instead of an arch.
 */
export function archRing(half: number, rise: number, opts: ArchRingOptions = {}): THREE.BufferGeometry {
  const stones = opts.stones ?? 13;
  const t = opts.thickness ?? 0.34;
  const depth = opts.depth ?? 0.4;
  const jitter = opts.jitter ?? 0;
  const joint = opts.joint ?? 0.06;
  const tile = opts.tile ?? 1.4;
  const rand = opts.rand ?? (() => 0.5);

  const pos: number[] = [];
  const nor: number[] = [];
  const uv: number[] = [];

  // Emits a quad as two triangles with a flat normal and explicit UVs.
  const quad = (
    p: number[][],
    n: [number, number, number],
    uvs: Array<[number, number]>,
  ): void => {
    for (const i of [0, 1, 2, 0, 2, 3]) {
      pos.push(p[i][0], p[i][1], p[i][2]);
      nor.push(n[0], n[1], n[2]);
      uv.push(uvs[i][0], uvs[i][1]);
    }
  };

  const key = opts.keystone ?? 0;
  const keyIdx = stones % 2 === 1 ? (stones - 1) / 2 : -1;
  const inner = (a: number): [number, number] => [-half * Math.cos(a), rise * Math.sin(a)];
  const outer = (a: number, ex: number): [number, number] =>
    [-(half + t + ex) * Math.cos(a), (rise + t + ex) * Math.sin(a)];
  // Arc length so far, for continuous UVs around the soffit.
  let run = 0;

  for (let i = 0; i < stones; i++) {
    const slot = Math.PI / stones;
    const pad = slot * joint * 0.5;
    const a0 = slot * i + pad;
    const a1 = slot * (i + 1) - pad;
    // The crown stone stands proud both radially and through the wall, so it
    // throws a shadow onto its neighbours as well as breaking the extrados line.
    const isKey = i === keyIdx && key > 0;
    const ex = isKey ? key : 0;
    const dz = depth / 2 + (jitter > 0 ? rand() * jitter : 0) + (isKey ? key * 0.4 : 0);

    const [ix0, iy0] = inner(a0);
    const [ix1, iy1] = inner(a1);
    const [ox0, oy0] = outer(a0, ex);
    const [ox1, oy1] = outer(a1, ex);
    const arc = Math.hypot(ix1 - ix0, iy1 - iy0);
    const u0 = run / tile;
    const u1 = (run + arc) / tile;
    run += arc + 2 * pad * half;

    const i0f = [ix0, iy0, dz]; const i1f = [ix1, iy1, dz];
    const o0f = [ox0, oy0, dz]; const o1f = [ox1, oy1, dz];
    const i0b = [ix0, iy0, -dz]; const i1b = [ix1, iy1, -dz];
    const o0b = [ox0, oy0, -dz]; const o1b = [ox1, oy1, -dz];

    const vz0 = -dz / tile;
    const vz1 = dz / tile;
    // Face UVs use the stone's own footprint so texel density holds.
    const fu = [
      [ix0 / tile, iy0 / tile], [ix1 / tile, iy1 / tile],
      [ox1 / tile, oy1 / tile], [ox0 / tile, oy0 / tile],
    ] as Array<[number, number]>;

    quad([i0f, i1f, o1f, o0f], [0, 0, 1], fu);
    quad([o0b, o1b, i1b, i0b], [0, 0, -1], fu);
    // Soffit (intrados) and extrados.
    const mid = (a0 + a1) / 2;
    const rn: [number, number, number] = [-Math.cos(mid), Math.sin(mid), 0];
    quad(
      [i0b, i1b, i1f, i0f],
      [-rn[0], -rn[1], 0],
      [[u0, vz0], [u1, vz0], [u1, vz1], [u0, vz1]],
    );
    quad(
      [o1b, o0b, o0f, o1f],
      rn,
      [[u1, vz0], [u0, vz0], [u0, vz1], [u1, vz1]],
    );
    // Bed joints, visible wherever a neighbour projects less.
    const t0: [number, number, number] = [-Math.sin(a0), -Math.cos(a0), 0];
    quad(
      [i0f, o0f, o0b, i0b],
      t0,
      [[0, vz1], [t / tile, vz1], [t / tile, vz0], [0, vz0]],
    );
    quad(
      [o1f, i1f, i1b, o1b],
      [-t0[0], -t0[1], 0],
      [[t / tile, vz1], [0, vz1], [0, vz0], [t / tile, vz0]],
    );
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  return geo;
}

/** Adds a mirrored copy of every triangle so a single-sheet mesh renders from behind. */
export function doubleSided(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  const src = geo.index ? geo.toNonIndexed() : geo;
  const pos = src.getAttribute('position') as THREE.BufferAttribute;
  const nor = src.getAttribute('normal') as THREE.BufferAttribute;
  const uv = src.getAttribute('uv') as THREE.BufferAttribute;
  const count = pos.count;

  const p = new Float32Array(count * 6);
  const nn = new Float32Array(count * 6);
  const u = new Float32Array(count * 4);
  p.set(pos.array as Float32Array, 0);
  nn.set(nor.array as Float32Array, 0);
  u.set(uv.array as Float32Array, 0);

  for (let t = 0; t < count / 3; t++) {
    for (let k = 0; k < 3; k++) {
      const from = t * 3 + (2 - k);
      const to = count + t * 3 + k;
      p[to * 3] = pos.getX(from);
      p[to * 3 + 1] = pos.getY(from);
      p[to * 3 + 2] = pos.getZ(from);
      nn[to * 3] = -nor.getX(from);
      nn[to * 3 + 1] = -nor.getY(from);
      nn[to * 3 + 2] = -nor.getZ(from);
      u[to * 2] = uv.getX(from);
      u[to * 2 + 1] = uv.getY(from);
    }
  }

  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(p, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nn, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(u, 2));
  if (src !== geo) src.dispose();
  return out;
}

export interface ClothOptions {
  /** Downward droop at mid-span, as for a sheet slung between two fixings. */
  sag?: number;
  /** Amplitude of the standing folds running down the sheet. */
  fold?: number;
  /** Number of folds across the width. */
  folds?: number;
  /** Extra droop of the free bottom edge, on top of `sag`. */
  hem?: number;
  segsX?: number;
  segsY?: number;
  tile?: number;
  /** Emit back faces too. Almost always wanted for hanging cloth. */
  bothSides?: boolean;
}

/**
 * A hanging sheet in the XY plane: pinned along y = 0, falling to y = -h.
 *
 * Cloth is one of the few things in a scene the eye checks for *softness*, so
 * the sheet gets three separate deformations — span sag, vertical folds, and a
 * wavering hem — rather than a single sine. A flat quad with a cloth texture
 * always reads as cardboard.
 */
export function clothPanel(w: number, h: number, opts: ClothOptions = {}): THREE.BufferGeometry {
  const segsX = opts.segsX ?? 10;
  const segsY = opts.segsY ?? 6;
  const tile = opts.tile ?? 2.5;
  const sag = opts.sag ?? 0;
  const fold = opts.fold ?? 0;
  const folds = opts.folds ?? 3;
  const hem = opts.hem ?? 0;

  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];

  for (let j = 0; j <= segsY; j++) {
    const v = j / segsY;
    for (let i = 0; i <= segsX; i++) {
      const u = i / segsX;
      const x = (u - 0.5) * w;
      // Span sag is a parabola pinned at both ends; the hem sags more because
      // it carries no tension.
      const span = Math.sin(Math.PI * u);
      const y = -v * h - sag * span - hem * span * v * v;
      const z = Math.sin(u * Math.PI * folds) * fold * (0.35 + v * 0.65) +
        Math.sin(v * 4.1 + u * 2.3) * fold * 0.25;
      pos.push(x, y, z);
      uv.push((u * w) / tile, (v * h) / tile);
    }
  }
  for (let j = 0; j < segsY; j++) {
    for (let i = 0; i < segsX; i++) {
      const a = j * (segsX + 1) + i;
      const b = a + 1;
      const c = a + segsX + 1;
      const dd = c + 1;
      idx.push(a, c, b, b, c, dd);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();

  if (opts.bothSides ?? true) {
    const two = doubleSided(geo);
    geo.dispose();
    return two;
  }
  return geo;
}

/** A slack cable between two world points, sagging by `sag` at mid-span. */
export function sagCable(
  a: THREE.Vector3,
  b: THREE.Vector3,
  sag: number,
  radius = 0.022,
  segs = 10,
): THREE.BufferGeometry {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    pts.push(new THREE.Vector3(
      THREE.MathUtils.lerp(a.x, b.x, t),
      THREE.MathUtils.lerp(a.y, b.y, t) - Math.sin(t * Math.PI) * sag,
      THREE.MathUtils.lerp(a.z, b.z, t),
    ));
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  // Three sides: a 20 mm cable is at most a pixel or two wide, so the extra
  // radial segments are invisible and there are a lot of cables.
  const tube = new THREE.TubeGeometry(curve, segs + 2, radius, 3, false);
  const uv = tube.getAttribute('uv') as THREE.BufferAttribute;
  const len = a.distanceTo(b);
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, uv.getX(i) * (len / 0.6), uv.getY(i) * (Math.PI * 2 * radius) / 0.6);
  }
  uv.needsUpdate = true;
  return tube;
}

/**
 * Catenary between two points, with the droop scaled to the span.
 *
 * `sagCable` takes an absolute droop, which is right when the span is fixed but
 * wrong everywhere it is not: the same 0.2 m on a 3 m washing line and on a 26 m
 * street crossing gives a visible curve on one and a dead straight line on the
 * other. A real conductor hangs at 2–6 % of its span, and it is the *ratio* the
 * eye reads, so that is what this takes.
 */
export function slackCable(
  a: THREE.Vector3,
  b: THREE.Vector3,
  sagFrac: number,
  radius = 0.022,
  segs = 10,
): THREE.BufferGeometry {
  return sagCable(a, b, a.distanceTo(b) * sagFrac, radius, segs);
}

/**
 * A parabolic dish: front bowl, back shell and a rolled rim.
 *
 * Authored facing +Z with the rim in the z = 0 plane and the vertex at
 * z = -depth. A single-sided spherical cap — which is what this replaces — is
 * invisible from behind and has no edge, so half the time it renders as a
 * hard-edged half disc floating on a pole.
 */
export function parabolicDish(
  r: number,
  depth: number,
  radial = 16,
  rings = 4,
  shell = 0.025,
): THREE.BufferGeometry {
  const pos: number[] = [];
  const nor: number[] = [];
  const uv: number[] = [];

  const zAt = (rad: number): number => -depth * (1 - (rad * rad) / (r * r));
  // Analytic normal of z = -depth + depth·rad²/r², pointing out of the bowl.
  const nAt = (x: number, y: number): [number, number, number] => {
    const k = (2 * depth) / (r * r);
    const nx = -k * x;
    const ny = -k * y;
    const len = Math.hypot(nx, ny, 1);
    return [nx / len, ny / len, 1 / len];
  };
  const vert = (x: number, y: number, z: number, n: [number, number, number], flip: boolean): void => {
    pos.push(x, y, z);
    nor.push(flip ? -n[0] : n[0], flip ? -n[1] : n[1], flip ? -n[2] : n[2]);
    uv.push(x / 0.5, y / 0.5);
  };

  for (let j = 0; j < rings; j++) {
    const r0 = (r * j) / rings;
    const r1 = (r * (j + 1)) / rings;
    for (let i = 0; i < radial; i++) {
      const a0 = (Math.PI * 2 * i) / radial;
      const a1 = (Math.PI * 2 * (i + 1)) / radial;
      const p = (rad: number, ang: number, back: boolean): [number, number, number] => {
        const x = rad * Math.cos(ang);
        const y = rad * Math.sin(ang);
        return [x, y, zAt(rad) - (back ? shell : 0)];
      };
      const corners: Array<[number, number]> = [[r0, a0], [r1, a0], [r1, a1], [r0, a1]];
      // Bowl face, wound so it is seen from in front.
      for (const k of [0, 2, 1, 0, 3, 2]) {
        const [rad, ang] = corners[k];
        const [x, y, z] = p(rad, ang, false);
        vert(x, y, z, nAt(x, y), false);
      }
      // Back shell.
      for (const k of [0, 1, 2, 0, 2, 3]) {
        const [rad, ang] = corners[k];
        const [x, y, z] = p(rad, ang, true);
        vert(x, y, z, nAt(x, y), true);
      }
    }
  }
  // Rolled rim closing the two shells, with a small forward return so the edge
  // catches light instead of ending on a knife line.
  for (let i = 0; i < radial; i++) {
    const a0 = (Math.PI * 2 * i) / radial;
    const a1 = (Math.PI * 2 * (i + 1)) / radial;
    const lip = shell * 1.4;
    const ring0: Array<[number, number, number]> = [
      [r * Math.cos(a0), r * Math.sin(a0), 0],
      [(r + lip) * Math.cos(a0), (r + lip) * Math.sin(a0), -shell * 0.5],
      [(r + lip) * Math.cos(a1), (r + lip) * Math.sin(a1), -shell * 0.5],
      [r * Math.cos(a1), r * Math.sin(a1), 0],
    ];
    const ring1: Array<[number, number, number]> = ring0.map(([x, y, z]) => [x, y, z - shell]);
    const band = (q: Array<[number, number, number]>, s: number): void => {
      for (const k of [0, 1, 2, 0, 2, 3]) {
        const [x, y, z] = q[k];
        const l = Math.hypot(x, y) || 1;
        vert(x, y, z, [(x / l) * s, (y / l) * s, 0], false);
      }
    };
    band([ring0[0], ring1[0], ring1[3], ring0[3]], 1);
    band([ring0[1], ring0[2], ring1[2], ring1[1]], 1);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  return geo;
}

export interface CorrugateOptions {
  /** Crest-to-crest spacing across the sheet. */
  pitch?: number;
  /** Half the crest-to-trough depth. */
  amp?: number;
  /** Sheet thickness; the back face is offset by this. */
  thick?: number;
  /** Bow across the width, as though the sheet has been pushed. */
  bow?: number;
  /** Deterministic 0..1 source; drives per-rib dents. */
  rand?: () => number;
  tile?: number;
}

/**
 * A sheet of corrugated iron, in the XY plane, corrugations running vertically.
 *
 * A flat quad with a striped texture on it is the single most obvious fake in a
 * shanty wall: corrugation is a 15 mm relief that self-shadows hard, so at any
 * raking sun the ribs are alternating light and dark *bands with soft edges*,
 * which no albedo stripe reproduces. The bow and the per-rib dents matter for
 * the same reason — a sheet that has been up for a decade is never planar, and
 * the kink where it has been bent is where the eye checks.
 */
export function corrugatedPanel(w: number, h: number, opts: CorrugateOptions = {}): THREE.BufferGeometry {
  const pitch = opts.pitch ?? 0.17;
  const amp = opts.amp ?? 0.016;
  const thick = opts.thick ?? 0.012;
  const bow = opts.bow ?? 0;
  const rand = opts.rand ?? (() => 0.5);
  const tile = opts.tile ?? 1.0;

  const ribs = Math.max(3, Math.round(w / pitch));
  const perRib = 4;
  const n = ribs * perRib;
  // Per-rib dent: one or two ribs pushed in, which is what gives a sheet its
  // read as metal rather than as a moulding.
  const dent: number[] = [];
  for (let i = 0; i <= ribs; i++) dent.push(rand() < 0.12 ? -amp * (1.4 + rand()) : 0);

  const xs: number[] = [];
  const zs: number[] = [];
  const nx: number[] = [];
  const nz: number[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = (t - 0.5) * w;
    const phase = (t * w) / pitch;
    const rib = Math.min(ribs, Math.floor(phase));
    const d = dent[rib] * Math.pow(Math.sin(Math.PI * (phase - rib)), 2);
    const z = Math.sin(phase * Math.PI * 2) * amp + d + Math.sin(t * Math.PI) * bow;
    // Slope of the corrugation, for a normal that follows the ribs.
    const slope = (Math.cos(phase * Math.PI * 2) * amp * Math.PI * 2) / pitch;
    const l = Math.hypot(slope, 1);
    xs.push(x); zs.push(z); nx.push(-slope / l); nz.push(1 / l);
  }

  const pos: number[] = [];
  const nor: number[] = [];
  const uv: number[] = [];
  const quad = (
    p: Array<[number, number, number]>,
    nrm: Array<[number, number, number]>,
    uvs: Array<[number, number]>,
  ): void => {
    for (const k of [0, 1, 2, 0, 2, 3]) {
      pos.push(p[k][0], p[k][1], p[k][2]);
      nor.push(nrm[k][0], nrm[k][1], nrm[k][2]);
      uv.push(uvs[k][0], uvs[k][1]);
    }
  };

  const y0 = -h / 2;
  const y1 = h / 2;
  for (let i = 0; i < n; i++) {
    const a = i, b = i + 1;
    // Front.
    quad(
      [[xs[a], y0, zs[a]], [xs[b], y0, zs[b]], [xs[b], y1, zs[b]], [xs[a], y1, zs[a]]],
      [[nx[a], 0, nz[a]], [nx[b], 0, nz[b]], [nx[b], 0, nz[b]], [nx[a], 0, nz[a]]],
      [[xs[a] / tile, y0 / tile], [xs[b] / tile, y0 / tile], [xs[b] / tile, y1 / tile], [xs[a] / tile, y1 / tile]],
    );
    // Back.
    quad(
      [[xs[a], y1, zs[a] - thick], [xs[b], y1, zs[b] - thick], [xs[b], y0, zs[b] - thick], [xs[a], y0, zs[a] - thick]],
      [[-nx[a], 0, -nz[a]], [-nx[b], 0, -nz[b]], [-nx[b], 0, -nz[b]], [-nx[a], 0, -nz[a]]],
      [[xs[a] / tile, y1 / tile], [xs[b] / tile, y1 / tile], [xs[b] / tile, y0 / tile], [xs[a] / tile, y0 / tile]],
    );
    // Top and bottom edges.
    quad(
      [[xs[a], y1, zs[a]], [xs[b], y1, zs[b]], [xs[b], y1, zs[b] - thick], [xs[a], y1, zs[a] - thick]],
      [[0, 1, 0], [0, 1, 0], [0, 1, 0], [0, 1, 0]],
      [[xs[a] / tile, 0], [xs[b] / tile, 0], [xs[b] / tile, thick / tile], [xs[a] / tile, thick / tile]],
    );
    quad(
      [[xs[a], y0, zs[a] - thick], [xs[b], y0, zs[b] - thick], [xs[b], y0, zs[b]], [xs[a], y0, zs[a]]],
      [[0, -1, 0], [0, -1, 0], [0, -1, 0], [0, -1, 0]],
      [[xs[a] / tile, 0], [xs[b] / tile, 0], [xs[b] / tile, thick / tile], [xs[a] / tile, thick / tile]],
    );
  }
  // Side returns.
  for (const [i, s] of [[0, -1], [n, 1]] as Array<[number, number]>) {
    quad(
      s < 0
        ? [[xs[i], y0, zs[i] - thick], [xs[i], y0, zs[i]], [xs[i], y1, zs[i]], [xs[i], y1, zs[i] - thick]]
        : [[xs[i], y0, zs[i]], [xs[i], y0, zs[i] - thick], [xs[i], y1, zs[i] - thick], [xs[i], y1, zs[i]]],
      [[s, 0, 0], [s, 0, 0], [s, 0, 0], [s, 0, 0]],
      [[0, y0 / tile], [thick / tile, y0 / tile], [thick / tile, y1 / tile], [0, y1 / tile]],
    );
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  return geo;
}

/**
 * A spray of tapered blades on a common origin: the leaf clump of a desert
 * shrub, the crown of a young palm, a bundle of reeds.
 *
 * Built as double-sided tapered triangles that droop under their own weight,
 * fanned over a cone. The point is the *silhouette*: an ovoid has none, and no
 * amount of shading fixes that, whereas twenty blades sticking out at different
 * angles read as a plant from a hundred metres.
 */
export function bladeSpray(
  count: number,
  len: number,
  width: number,
  spread: number,
  droop: number,
  rand: () => number,
): THREE.BufferGeometry {
  const pos: number[] = [];
  const nor: number[] = [];
  const uv: number[] = [];
  const segs = 3;

  for (let b = 0; b < count; b++) {
    const yaw = (b / count) * Math.PI * 2 + rand() * 0.6;
    const pitch = spread * (0.35 + rand() * 0.65);
    const l = len * (0.62 + rand() * 0.55);
    const wid = width * (0.7 + rand() * 0.6);
    const dr = droop * (0.5 + rand());
    const cy = Math.cos(yaw), sy = Math.sin(yaw);

    const pt = (t: number, side: number): [number, number, number] => {
      const horiz = Math.sin(pitch) * l * t;
      const vert = Math.cos(pitch) * l * t - dr * t * t;
      const half = (wid / 2) * (1 - t * t * 0.92);
      return [cy * horiz - sy * half * side, vert, sy * horiz + cy * half * side];
    };
    for (let s = 0; s < segs; s++) {
      const t0 = s / segs;
      const t1 = (s + 1) / segs;
      const a = pt(t0, -1), bb = pt(t0, 1), c = pt(t1, 1), d = pt(t1, -1);
      const n: [number, number, number] = [-sy * 0.35, 0.9, cy * 0.35];
      for (const [q, nn] of [[[a, bb, c, a, c, d], n], [[a, c, bb, a, d, c], [-n[0], -n[1], -n[2]]]] as Array<
        [Array<[number, number, number]>, [number, number, number]]
      >) {
        for (let k = 0; k < 6; k++) {
          pos.push(q[k][0], q[k][1], q[k][2]);
          nor.push(nn[0], nn[1], nn[2]);
          uv.push(k % 2, t0 + (k > 2 ? 1 / segs : 0));
        }
      }
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  return geo;
}

/**
 * A palm frond: a curving rachis carrying leaflets down both sides.
 *
 * Authored running along +X from the origin, arching up then over. The old
 * fronds were flat quads radiating from a point, which from any angle off the
 * plane collapse to lines.
 */
export function frond(len: number, width: number, arch: number, rand: () => number): THREE.BufferGeometry {
  const pos: number[] = [];
  const nor: number[] = [];
  const uv: number[] = [];
  const tri = (
    a: [number, number, number], b: [number, number, number], c: [number, number, number],
    n: [number, number, number],
  ): void => {
    for (const q of [a, b, c, a, c, b]) {
      pos.push(q[0], q[1], q[2]);
      nor.push(n[0], n[1], n[2]);
      uv.push(q[0] / 0.4, q[2] / 0.4);
    }
    // Second winding above renders the back; flip its normal.
    for (let i = 3; i < 6; i++) {
      nor[nor.length - (6 - i) * 3] = -n[0];
      nor[nor.length - (6 - i) * 3 + 1] = -n[1];
      nor[nor.length - (6 - i) * 3 + 2] = -n[2];
    }
  };

  const spine = (t: number): [number, number, number] => [
    len * t,
    arch * Math.sin(t * 1.9) - arch * 1.35 * t * t * t,
    0,
  ];
  const segs = 7;
  // Rachis: a thin tapered ribbon so the frond has a stem even edge-on.
  for (let s = 0; s < segs; s++) {
    const t0 = s / segs, t1 = (s + 1) / segs;
    const p0 = spine(t0), p1 = spine(t1);
    const r0 = width * 0.05 * (1 - t0 * 0.8) + 0.006;
    const r1 = width * 0.05 * (1 - t1 * 0.8) + 0.006;
    tri([p0[0], p0[1] - r0, -r0], [p1[0], p1[1] - r1, -r1], [p1[0], p1[1] + r1, r1], [0, 0.4, 0.9]);
    tri([p0[0], p0[1] - r0, -r0], [p1[0], p1[1] + r1, r1], [p0[0], p0[1] + r0, r0], [0, 0.4, 0.9]);
  }
  // Leaflets, alternating sides, shortening toward the tip.
  const pairs = 9;
  for (let i = 1; i <= pairs; i++) {
    const t = i / (pairs + 1);
    const base = spine(t);
    const l = width * (1 - Math.pow(t, 1.7)) * (0.72 + rand() * 0.5);
    for (const side of [-1, 1]) {
      const sweep = 0.5 + rand() * 0.4;
      const tipZ = side * l * Math.cos(sweep);
      const tipX = base[0] + l * Math.sin(sweep) * 0.55;
      const tipY = base[1] - l * (0.34 + rand() * 0.3);
      const nx = -side * 0.15;
      tri(
        [base[0] - 0.012, base[1], 0],
        [base[0] + 0.02, base[1], 0],
        [tipX, tipY, tipZ],
        [nx, 0.94, -side * 0.28],
      );
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  return geo;
}

/**
 * A laid rug or mat: a slightly rippled field, a rolled hem all round, and
 * fringe at the two ends.
 *
 * A 40 mm box lying on a roof reads as a decal with a hard rectangular edge and
 * no fringe, which is what three reviews of the rooftop shot have called out.
 * The hem is what carries it: a raised roll at the perimeter throws a shadow
 * onto the deck and gives the rug an outline of its own.
 */
export function rugGeometry(w: number, d: number, rand: () => number): THREE.BufferGeometry {
  const pos: number[] = [];
  const nor: number[] = [];
  const uv: number[] = [];
  const nx = 6, nz = 5;
  const hem = 0.02;
  const idx: number[] = [];

  const h = (u: number, v: number): number => {
    const edge = Math.min(u, 1 - u, v, 1 - v);
    const roll = edge < 0.09 ? hem * (1 - edge / 0.09) : 0;
    return roll + Math.sin(u * 5.1 + v * 2.3) * 0.008 + (rand() - 0.5) * 0.004;
  };
  for (let j = 0; j <= nz; j++) {
    for (let i = 0; i <= nx; i++) {
      const u = i / nx, v = j / nz;
      // Corners lift: nothing lies perfectly flat on a screed roof.
      const curl = Math.pow(Math.abs(u - 0.5) * 2, 3) * Math.pow(Math.abs(v - 0.5) * 2, 3) * 0.05;
      pos.push((u - 0.5) * w, h(u, v) + curl, (v - 0.5) * d);
      nor.push(0, 1, 0);
      uv.push((u * w) / 1.1, (v * d) / 1.1);
    }
  }
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      const a = j * (nx + 1) + i;
      idx.push(a, a + nx + 1, a + 1, a + 1, a + nx + 1, a + nx + 2);
    }
  }
  // Fringe: short tapered tabs off the two short ends, lying on the deck.
  let base = (nx + 1) * (nz + 1);
  for (const side of [-1, 1]) {
    const tabs = 9;
    for (let i = 0; i < tabs; i++) {
      const x = (-0.5 + (i + 0.5) / tabs) * w;
      const z = (side * d) / 2;
      const l = 0.045 + rand() * 0.035;
      pos.push(x - 0.014, 0.002, z, x + 0.014, 0.002, z, x + (rand() - 0.5) * 0.02, 0.001, z + side * l);
      for (let k = 0; k < 3; k++) { nor.push(0, 1, 0); uv.push(x, z); }
      idx.push(base, base + (side > 0 ? 1 : 2), base + (side > 0 ? 2 : 1));
      base += 3;
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  return geo;
}

/**
 * A heaped tray of produce: many small bodies, merged into one geometry.
 *
 * A market is defined by its goods, and the goods were a single squashed dome
 * per tray — which is the shape of a heap but has none of its information. What
 * makes a pile of fruit read is that its silhouette is *bumpy at the scale of one
 * fruit*: a hundred little highlights and a hundred little occlusions along an
 * edge the eye already knows the size of. One dome has one highlight, so it reads
 * as a sack, or as nothing.
 *
 * Piled properly, too — a mound, packed densely at the bottom of the tray and
 * thinning toward the crown, rather than scattered through a box. Costs about 36
 * triangles a fruit and merges to a single push.
 */
export function produceHeap(
  w: number,
  d: number,
  h: number,
  count: number,
  radius: number,
  rand: () => number,
): THREE.BufferGeometry {
  const pos: number[] = [];
  const nor: number[] = [];
  const uv: number[] = [];

  // ---- the mass under the fruit ----
  //
  // A tray holds hundreds of oranges and only the top layer is ever visible, so
  // modelling it as loose bodies is both ruinous and wrong-looking: at any count
  // that fits the budget the fruit end up sparse and read as beads scattered on a
  // board, which is what the first attempt produced. A solid dome underneath
  // carries the volume for nothing, and the loose bodies then only have to break
  // its surface — which is the one thing a dome on its own cannot do.
  {
    const rings = 4;
    const segs = 10;
    const domeH = h + radius * 1.1;
    const at = (i: number, k: number): [number, number, number] => {
      const t = i / rings;
      const a = (k / segs) * Math.PI * 2;
      // Flat-topped rather than hemispherical: produce is heaped, not piled.
      const rr = Math.sqrt(1 - t * t * 0.92);
      return [Math.cos(a) * (w / 2) * rr, domeH * t, Math.sin(a) * (d / 2) * rr];
    };
    for (let i = 0; i < rings; i++) {
      for (let k = 0; k < segs; k++) {
        const q = [at(i, k), at(i, k + 1), at(i + 1, k + 1), at(i, k), at(i + 1, k + 1), at(i + 1, k)];
        for (const v of q) {
          pos.push(v[0], v[1], v[2]);
          const l = Math.hypot(v[0], v[2]) || 1;
          nor.push((v[0] / l) * 0.5, 0.8, (v[2] / l) * 0.5);
          uv.push(v[0] / (radius * 4), v[2] / (radius * 4));
        }
      }
    }
  }
  // One master body, deformed per instance. Slightly out of round, because no
  // two are, and a perfect sphere is the one thing that never occurs in a crate.
  //
  // Five by three — twenty triangles. The heap is the point, not the individual
  // fruit: at the range a stall is seen from, one of these is fifteen pixels
  // across, and what carries is how many of them there are and how irregularly
  // they sit, neither of which a rounder sphere improves. Going from 6x4 to 5x3
  // took the market from a fifth of the map's triangle budget to a twentieth.
  const unit = new THREE.SphereGeometry(1, 5, 3);
  const up = unit.getAttribute('position') as THREE.BufferAttribute;
  const un = unit.getAttribute('normal') as THREE.BufferAttribute;
  const uu = unit.getAttribute('uv') as THREE.BufferAttribute;
  const uidx = unit.getIndex()!;

  for (let i = 0; i < count; i++) {
    // Sat on the dome's surface, not scattered through the box: each body sits
    // where the mass beneath it puts it, so they break the silhouette along the
    // crest instead of hovering inside the volume.
    const a = rand() * Math.PI * 2;
    const rr = Math.sqrt(rand());
    const ex = Math.cos(a) * rr * (w / 2 - radius);
    const ez = Math.sin(a) * rr * (d / 2 - radius);
    const surface = (h + radius * 1.1) * Math.sqrt(Math.max(0, 1 - rr * rr) / 0.92);
    const ey = Math.min(surface, h + radius * 1.1) * (0.82 + rand() * 0.2);
    const sx = radius * (0.82 + rand() * 0.36);
    const sy = radius * (0.8 + rand() * 0.34);
    const sz = radius * (0.82 + rand() * 0.36);
    const spin = rand() * Math.PI;
    const cs = Math.cos(spin);
    const sn = Math.sin(spin);
    for (let k = 0; k < uidx.count; k++) {
      const v = uidx.getX(k);
      const px = up.getX(v) * sx;
      const py = up.getY(v) * sy;
      const pz = up.getZ(v) * sz;
      pos.push(ex + px * cs - pz * sn, ey + py, ez + px * sn + pz * cs);
      const nx = un.getX(v);
      const nz = un.getZ(v);
      nor.push(nx * cs - nz * sn, un.getY(v), nx * sn + nz * cs);
      uv.push(uu.getX(v) * radius * 4, uu.getY(v) * radius * 4);
    }
  }
  unit.dispose();

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  return geo;
}

/**
 * An open sack: a slumped cylinder with its neck rolled down over itself.
 *
 * The rolled collar is the whole point. A closed sack is a bag shape and reads as
 * one; the roll gives it a hard bright torus at the top, a dark mouth inside it,
 * and a heaped surface below that — three tones stacked in 150 mm, which is what
 * tells you it is full of grain and open for business.
 */
export function sackOpen(r: number, h: number, rand: () => number): THREE.BufferGeometry {
  const segs = 9;
  const pos: number[] = [];
  const nor: number[] = [];
  const uv: number[] = [];
  const tile = 0.7;
  // Body profile: wide and slumped at the foot, drawn in under the collar.
  const prof: Array<[number, number]> = [
    [r * 0.86, 0], [r * 1.06, h * 0.16], [r * 1.02, h * 0.46],
    [r * 0.9, h * 0.74], [r * 0.94, h * 0.9],
  ];
  const jag = (i: number): number => 1 + (rand() - 0.5) * 0.1 * (i % 3);
  const rows = prof.map(([pr, py], i) => ({ r: pr * jag(i), y: py }));
  for (let i = 0; i < rows.length - 1; i++) {
    for (let k = 0; k < segs; k++) {
      const a0 = (k / segs) * Math.PI * 2;
      const a1 = ((k + 1) / segs) * Math.PI * 2;
      const q = [
        [Math.cos(a0) * rows[i].r, rows[i].y, Math.sin(a0) * rows[i].r],
        [Math.cos(a1) * rows[i].r, rows[i].y, Math.sin(a1) * rows[i].r],
        [Math.cos(a1) * rows[i + 1].r, rows[i + 1].y, Math.sin(a1) * rows[i + 1].r],
        [Math.cos(a0) * rows[i].r, rows[i].y, Math.sin(a0) * rows[i].r],
        [Math.cos(a1) * rows[i + 1].r, rows[i + 1].y, Math.sin(a1) * rows[i + 1].r],
        [Math.cos(a0) * rows[i + 1].r, rows[i + 1].y, Math.sin(a0) * rows[i + 1].r],
      ];
      for (const v of q) {
        pos.push(v[0], v[1], v[2]);
        const l = Math.hypot(v[0], v[2]) || 1;
        nor.push(v[0] / l, 0.18, v[2] / l);
        uv.push((Math.atan2(v[2], v[0]) * r) / tile, v[1] / tile);
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.computeVertexNormals();
  return geo;
}

/**
 * A line of raised Arabic-like script, for painted signboards.
 *
 * Not real text — it is a stroke grammar that produces the *statistics* of naskh
 * at the range a player reads a shopfront from. Arabic is cursive, so the letters
 * of a word sit on a continuous baseline rather than standing apart; what the eye
 * picks up at ten metres is that baseline, the vertical ascenders rising off it at
 * uneven intervals, the bowls that dip below it, and the scatter of dots above and
 * below. Reproduce those four things and the result is unmistakably Arabic even
 * though it spells nothing.
 *
 * This matters more than its triangle cost suggests. A sign is the only element in
 * a desert town that is allowed to be a saturated colour and carry a hard-edged
 * man-made pattern, so it is simultaneously the fix for "no cultural identity" and
 * the fix for "the whole map is one extruded material".
 *
 * Lies in the XY plane centred on the origin, raised along +Z from 0 to `depth`.
 * The back face is omitted — these are always applied to a board.
 */
export function scriptRun(
  width: number,
  height: number,
  depth: number,
  rand: () => number,
): THREE.BufferGeometry {
  const pos: number[] = [];
  const nor: number[] = [];
  const uv: number[] = [];
  const tile = 0.5;

  // Five faces of an axis-aligned box: front and four returns, no back.
  const slab = (x0: number, y0: number, x1: number, y1: number): void => {
    if (x1 - x0 < 1e-4 || y1 - y0 < 1e-4) return;
    const quad = (
      p: Array<[number, number, number]>,
      n: [number, number, number],
    ): void => {
      for (const i of [0, 1, 2, 0, 2, 3]) {
        pos.push(p[i][0], p[i][1], p[i][2]);
        nor.push(n[0], n[1], n[2]);
        // Planar UVs off the face's own two spanning axes, so texel density
        // holds whichever way the face points.
        uv.push(
          (Math.abs(n[0]) > 0.5 ? p[i][2] : p[i][0]) / tile,
          (Math.abs(n[1]) > 0.5 ? p[i][2] : p[i][1]) / tile,
        );
      }
    };
    quad([[x0, y0, depth], [x1, y0, depth], [x1, y1, depth], [x0, y1, depth]], [0, 0, 1]);
    quad([[x0, y0, 0], [x0, y0, depth], [x0, y1, depth], [x0, y1, 0]], [-1, 0, 0]);
    quad([[x1, y0, 0], [x1, y1, 0], [x1, y1, depth], [x1, y0, depth]], [1, 0, 0]);
    quad([[x0, y0, 0], [x1, y0, 0], [x1, y0, depth], [x0, y0, depth]], [0, -1, 0]);
    quad([[x0, y1, 0], [x0, y1, depth], [x1, y1, depth], [x1, y1, 0]], [0, 1, 0]);
  };

  // Stroke weight, and the baseline the script hangs off. Sitting the baseline
  // below centre leaves room for the ascenders, which are what carry the shape.
  const t = Math.max(0.012, height * 0.115);
  const base = -height * 0.13;
  const dot = t * 0.95;

  // Fill the band right-to-left with words, leaving a margin either end.
  const usable = width * 0.9;
  let cursor = usable / 2;
  const left = -usable / 2;
  let guard = 0;

  while (cursor - left > height * 0.5 && guard++ < 24) {
    const glyphs = 2 + Math.floor(rand() * 4);
    const adv = height * (0.3 + rand() * 0.16);
    const wordW = Math.min(glyphs * adv, cursor - left);
    const wStart = cursor - wordW;

    // The kashida: one continuous bar joining every letter of the word. Without
    // it the glyphs read as a row of Latin-ish marks rather than as script.
    slab(wStart, base, cursor, base + t);

    for (let g = 0; g < glyphs; g++) {
      const gx = cursor - adv * (g + 1);
      const cx = gx + adv * 0.5;
      const form = Math.floor(rand() * 6);
      if (form === 0) {
        // Alif / lam: a tall bare upright.
        slab(cx - t / 2, base, cx + t / 2, base + height * (0.38 + rand() * 0.14));
      } else if (form === 1) {
        // Tooth: the short stub that ba, ta and nun are built from.
        slab(cx - t / 2, base, cx + t / 2, base + height * (0.13 + rand() * 0.06));
        if (rand() < 0.6) {
          const dy = rand() < 0.5 ? base - dot * 2.2 : base + height * 0.3;
          slab(cx - dot / 2, dy, cx + dot / 2, dy + dot);
        }
      } else if (form === 2) {
        // Mim / ha: a closed loop sitting on the line.
        const r = Math.min(adv * 0.34, height * 0.15);
        slab(cx - r, base, cx - r + t, base + r * 2);
        slab(cx + r - t, base, cx + r, base + r * 2);
        slab(cx - r, base + r * 2 - t, cx + r, base + r * 2);
      } else if (form === 3) {
        // Sin / nun: a bowl swung below the line.
        const r = Math.min(adv * 0.4, height * 0.17);
        slab(cx - r, base - r, cx - r + t, base);
        slab(cx + r - t, base - r, cx + r, base);
        slab(cx - r, base - r, cx + r, base - r + t);
      } else if (form === 4) {
        // Ra / waw: a descender raked back under the following letter.
        const drop = height * (0.14 + rand() * 0.1);
        slab(cx - t / 2, base - drop, cx + t / 2, base + t);
        slab(cx - t / 2, base - drop, cx + adv * 0.3, base - drop + t);
      } else {
        // Kaf / tah: an upright with a crossbar.
        const up = height * (0.24 + rand() * 0.12);
        slab(cx - t / 2, base, cx + t / 2, base + up);
        slab(cx - adv * 0.22, base + up - t, cx + adv * 0.22, base + up);
      }
      // Diacritics: one to three dots, stacked the way Arabic stacks them.
      if (form !== 1 && rand() < 0.45) {
        const n = 1 + Math.floor(rand() * 3);
        const above = rand() < 0.62;
        const dy = above ? base + height * (0.3 + rand() * 0.1) : base - dot * 2.4;
        for (let k = 0; k < n; k++) {
          const dx = cx + (k - (n - 1) / 2) * dot * 1.7;
          slab(dx - dot / 2, dy, dx + dot / 2, dy + dot);
        }
      }
    }
    cursor = wStart - height * (0.16 + rand() * 0.12);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  return geo;
}

/** Cylinder with UVs scaled to world size. */
export function cyl(rTop: number, rBottom: number, h: number, segs: number, tile: number): THREE.CylinderGeometry {
  const geo = new THREE.CylinderGeometry(rTop, rBottom, h, segs, 1);
  const uv = geo.getAttribute('uv') as THREE.BufferAttribute;
  const circ = Math.PI * 2 * Math.max(rTop, rBottom);
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (circ / tile), uv.getY(i) * (h / tile));
  uv.needsUpdate = true;
  return geo;
}

/** Torus with UVs scaled to world size — tyres, drum hoops, cable coils. */
export function ring(radius: number, tubeR: number, radialSegs: number, tubeSegs: number, tile: number): THREE.TorusGeometry {
  const geo = new THREE.TorusGeometry(radius, tubeR, tubeSegs, radialSegs);
  const uv = geo.getAttribute('uv') as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, uv.getX(i) * (Math.PI * 2 * radius / tile), uv.getY(i) * (Math.PI * 2 * tubeR / tile));
  }
  uv.needsUpdate = true;
  return geo;
}

/**
 * A filled bag: a squashed, slightly irregular sphere.
 *
 * Reads as a filled sack far better than a rounded box, and costs the same at
 * this vertex count.
 */
export function bagGeometry(w: number, h: number, d: number): THREE.BufferGeometry {
  // 8x5 is the floor for this: a sandbag wall is hundreds of these, so the
  // segment count dominates the map's triangle budget, and the squash below
  // hides the faceting anyway.
  const geo = new THREE.SphereGeometry(0.5, 8, 5);
  const pos = geo.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const flat = 1 - Math.pow(Math.abs(y * 2), 3) * 0.25;
    pos.setXYZ(i, x * w * 2 * flat, y * h * 2, z * d * 2 * flat);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

/** Generates planar UVs from world position for geometries with none. */
export function planarUV(geo: THREE.BufferGeometry, tile: number): void {
  const pos = geo.getAttribute('position') as THREE.BufferAttribute;
  const existing = geo.getAttribute('uv') as THREE.BufferAttribute | undefined;
  const uvs = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    if (existing) {
      uvs[i * 2] = existing.getX(i) * (1 / tile) * 2;
      uvs[i * 2 + 1] = existing.getY(i) * (1 / tile) * 2;
    } else {
      uvs[i * 2] = pos.getX(i) / tile;
      uvs[i * 2 + 1] = pos.getZ(i) / tile;
    }
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
}

/** Kerb stone profile: chamfered top edge, slight batter on the road face. */
export function kerbProfile(w: number, h: number): Profile {
  const c = Math.min(0.045, w * 0.3);
  return [
    [-w / 2, 0],
    [w / 2 - 0.015, 0],
    [w / 2, h - c],
    [w / 2 - c, h],
    [-w / 2, h],
  ];
}

/**
 * Wedge against a wall: vertical face at -d/2, feathering out to +d/2.
 *
 * The slope is concave, not straight. A straight hypotenuse meets the ground at a
 * fixed angle all the way along, and where that angle is 15–20 degrees the toe
 * still resolves as a hard line with its own shadow — the review's "hard crease
 * with no skirt". Sand does not do that: it stands near its angle of repose
 * against the wall and then lies down almost flat over the last third, so the
 * edge fades out instead of stopping. One extra vertex per profile, and the
 * profile is extruded once and instanced everywhere.
 */
export function driftProfile(d: number, h: number): Profile {
  return [
    [-d / 2, 0],
    [d / 2, 0],
    [-d / 2 + d * 0.6, h * 0.17],
    [-d / 2 + d * 0.24, h * 0.62],
    [-d / 2, h],
  ];
}

/**
 * A free-standing drift: zero at both edges, crest `bias` of the way across.
 *
 * Blown sand out in the open has to be built from these rather than from flat
 * slabs. The tell is not the tone, it is the edge — a 60 mm box reads as a
 * poured pad from twenty metres away because its rim is a hard vertical line
 * with its own shadow, whereas a wedge that closes to nothing simply stops.
 */
export function duneProfile(d: number, h: number, bias = 0.44): Profile {
  const c = -d / 2 + d * bias;
  // Toes measured as a fraction of the run available on each side of the crest,
  // so a strongly biased crest still feathers on the short side instead of
  // folding the profile back through its own base.
  const rr = d / 2 - c;
  const rl = c + d / 2;
  return [
    [-d / 2, 0],
    [d / 2, 0],
    [c + rr * 0.56, h * 0.15],
    [c + rr * 0.3, h * 0.63],
    [c, h],
    [c - rl * 0.32, h * 0.5],
    [c - rl * 0.6, h * 0.13],
  ];
}

/** Three-step cornice, projecting `out` from the wall face at x = 0. */
export function corniceProfile(out: number, h: number): Profile {
  return [
    [0, 0],
    [out * 0.45, 0],
    [out * 0.45, h * 0.34],
    [out, h * 0.46],
    [out, h * 0.72],
    [out * 0.62, h * 0.86],
    [out * 0.62, h],
    [0, h],
  ];
}

/**
 * Parapet coping: overhangs the wall both sides, weathers to one side, and
 * carries a drip throat under each nose.
 *
 * Authored across the wall — u = 0 is the wall centreline — so one profile does
 * every run of parapet regardless of which way it faces. The overhang is the
 * whole point: a parapet finished flush with its wall is a plane that stops,
 * and it is the 40 mm shadow line under the nose that says the top of the
 * building is a separate stone laid on top of a wall.
 */
export function copingProfile(w: number, h: number, fall = 0.35): Profile {
  const g0 = 0.026;
  const g1 = 0.05;
  const gh = Math.min(0.018, h * 0.25);
  return [
    [-w / 2, 0],
    [-w / 2 + g0, 0],
    [-w / 2 + g0, gh],
    [-w / 2 + g1, gh],
    [-w / 2 + g1, 0],
    [w / 2 - g1, 0],
    [w / 2 - g1, gh],
    [w / 2 - g0, gh],
    [w / 2 - g0, 0],
    [w / 2, 0],
    [w / 2, h * (1 - fall * 0.5)],
    [w / 2 - w * 0.12, h * (1 - fall * 0.28)],
    [-w / 2 + w * 0.1, h],
    [-w / 2, h * 0.9],
  ];
}

/** Window sill: projecting nose with a drip throat underneath. */
export function sillProfile(out: number, h: number): Profile {
  return [
    [0, 0],
    [out * 0.55, 0],
    [out * 0.55, h * 0.22],
    [out, h * 0.34],
    [out, h * 0.62],
    [out * 0.3, h],
    [0, h],
  ];
}
