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

  const inner = (a: number): [number, number] => [-half * Math.cos(a), rise * Math.sin(a)];
  const outer = (a: number): [number, number] => [-(half + t) * Math.cos(a), (rise + t) * Math.sin(a)];
  // Arc length so far, for continuous UVs around the soffit.
  let run = 0;

  for (let i = 0; i < stones; i++) {
    const slot = Math.PI / stones;
    const pad = slot * joint * 0.5;
    const a0 = slot * i + pad;
    const a1 = slot * (i + 1) - pad;
    const dz = depth / 2 + (jitter > 0 ? rand() * jitter : 0);

    const [ix0, iy0] = inner(a0);
    const [ix1, iy1] = inner(a1);
    const [ox0, oy0] = outer(a0);
    const [ox1, oy1] = outer(a1);
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

/** Right-angle wedge: vertical face at -d/2, sloping down to +d/2. */
export function driftProfile(d: number, h: number): Profile {
  return [
    [-d / 2, 0],
    [d / 2, 0],
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
  return [
    [-d / 2, 0],
    [d / 2, 0],
    [c + d * 0.17, h * 0.66],
    [c, h],
    [c - d * 0.19, h * 0.52],
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
