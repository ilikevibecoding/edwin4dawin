import * as THREE from 'three';

/**
 * A small procedural mesh builder with skinning.
 *
 * Everything the soldier is made of comes out of four primitives — a swept
 * elliptical tube, a box, an ellipsoid and a quad strip — because that is
 * genuinely enough to build a man in kit, and a bigger vocabulary would only
 * make the result harder to keep inside a triangle budget.
 *
 * Two things are worth knowing about it. First, normals are written
 * analytically rather than recovered with `computeVertexNormals`: a tube has a
 * uv seam, and averaging across it leaves a visible crease down the outside of
 * every limb. Second, geometry is accumulated into one bucket per material and
 * concatenated at the end, so a whole soldier is one `BufferGeometry` with a
 * handful of draw groups instead of forty meshes.
 */

/** Up to four influences per vertex, matching the skinning attributes. */
export interface Binding {
  bones: number[];
  weights: number[];
}

/**
 * A radius multiplier around and along a swept section or an ellipsoid.
 *
 * `angle` is the position around the section in radians and `along` runs 0..1
 * from the first ring to the last. Returning 1 everywhere is the plain shape.
 *
 * This exists because a constant-radius tube is the mannequin tell. A real
 * trouser leg is lumpy: it creases behind the knee, bags on the outboard side
 * where the cargo pocket hangs, and gathers where it is bloused. All of that is
 * a few percent of radius varying with angle, and none of it costs a triangle —
 * it moves the vertices a tube was going to spend anyway onto a silhouette that
 * is not a circle. Only called while geometry is being authored, so a closure
 * per part is free.
 */
export type Warp = (angle: number, along: number) => number;

/** Finite-difference step for warp normals; small against a 2π sweep. */
const WARP_H = 0.02;

export function bind1(bone: number): Binding {
  return { bones: [bone, 0, 0, 0], weights: [1, 0, 0, 0] };
}

export function bind2(a: number, wa: number, b: number, wb: number): Binding {
  const sum = wa + wb || 1;
  return { bones: [a, b, 0, 0], weights: [wa / sum, wb / sum, 0, 0] };
}

export function bind3(
  a: number,
  wa: number,
  b: number,
  wb: number,
  c: number,
  wc: number,
): Binding {
  const sum = wa + wb + wc || 1;
  return { bones: [a, b, c, 0], weights: [wa / sum, wb / sum, wc / sum, 0] };
}

/** One cross-section of a swept tube. */
export interface Ring {
  p: THREE.Vector3;
  /** Radius along the frame's side axis and its binormal. */
  rx: number;
  rz: number;
  bind: Binding;
  /** Vertex colour for this ring; interpolated across the span between rings. */
  color: THREE.Color;
  /** Lateral shift of the section within its own plane, for a shaped limb. */
  offsetX?: number;
  offsetZ?: number;
}

interface Bucket {
  position: number[];
  normal: number[];
  uv: number[];
  color: number[];
  skinIndex: number[];
  skinWeight: number[];
  index: number[];
}

const _t = new THREE.Vector3();
const _side = new THREE.Vector3();
const _bin = new THREE.Vector3();
const _tmp = new THREE.Vector3();
const _n = new THREE.Vector3();
const _p = new THREE.Vector3();
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _c = new THREE.Vector3();
const _tan = new THREE.Vector3();
const _du = new THREE.Vector3();
const _dv = new THREE.Vector3();
const UP_Y = new THREE.Vector3(0, 1, 0);

/* ----------------------------- albedo break-up ---------------------------- */

/** Signed hash of a lattice point, in -1..1. */
function hash3(i: number, j: number, k: number): number {
  let n = Math.imul(i, 374761393) + Math.imul(j, 668265263) + Math.imul(k, 1274126177);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return (((n ^ (n >>> 16)) >>> 8) & 0xffff) / 32767.5 - 1;
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}

/** Trilinear value noise on a lattice of the given cell size, in -1..1. */
function vnoise(x: number, y: number, z: number, cell: number): number {
  const fx = x / cell;
  const fy = y / cell;
  const fz = z / cell;
  const ix = Math.floor(fx);
  const iy = Math.floor(fy);
  const iz = Math.floor(fz);
  const tx = smooth(fx - ix);
  const ty = smooth(fy - iy);
  const tz = smooth(fz - iz);
  let sum = 0;
  for (let dz = 0; dz < 2; dz++) {
    const wz = dz ? tz : 1 - tz;
    for (let dy = 0; dy < 2; dy++) {
      const wy = dy ? ty : 1 - ty;
      for (let dx = 0; dx < 2; dx++) {
        const wx = dx ? tx : 1 - tx;
        sum += wx * wy * wz * hash3(ix + dx, iy + dy, iz + dz);
      }
    }
  }
  return sum;
}

/**
 * Two octaves of value noise, one at the scale of a blotch and one at the scale
 * of a fold, summed to about -1..1.
 *
 * Deliberately spatial rather than per-vertex: white noise indexed by vertex
 * reads as television static and disappears under a mip, while a 25 cm blotch
 * survives to the distance the figure is actually seen at. The critique
 * measured the town's flattest wall at an albedo standard deviation of 6.8 on
 * 0-255 and called for 15-25; a uniform costs the same amount of nothing.
 */
function blotch(x: number, y: number, z: number): number {
  return vnoise(x, y, z, 0.27) * 0.72 + vnoise(x + 11.3, y - 5.7, z + 2.9, 0.075) * 0.4;
}

const BOX_FACES: ReadonlyArray<{
  n: readonly [number, number, number];
  v: ReadonlyArray<readonly [number, number, number]>;
}> = [
  { n: [1, 0, 0], v: [[1, -1, -1], [1, -1, 1], [1, 1, 1], [1, 1, -1]] },
  { n: [-1, 0, 0], v: [[-1, -1, 1], [-1, -1, -1], [-1, 1, -1], [-1, 1, 1]] },
  { n: [0, 1, 0], v: [[-1, 1, -1], [1, 1, -1], [1, 1, 1], [-1, 1, 1]] },
  { n: [0, -1, 0], v: [[-1, -1, 1], [1, -1, 1], [1, -1, -1], [-1, -1, -1]] },
  { n: [0, 0, 1], v: [[-1, -1, 1], [-1, 1, 1], [1, 1, 1], [1, -1, 1]] },
  { n: [0, 0, -1], v: [[1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, -1]] },
];

export class MeshBuilder {
  private buckets: Bucket[] = [];
  /** Metres of world one texture tile covers, so uvs come out at the right density. */
  tile = 0.55;
  /**
   * Per-material albedo break-up, as a fraction of the vertex colour. Cloth
   * wants a lot of this and steel almost none, which is why it is per material
   * rather than one number for the model.
   */
  readonly mottle: number[];
  /** Shifts the break-up lattice, so two soldiers are not dirty in the same places. */
  mottleSeed = 0;

  constructor(materialCount: number) {
    this.mottle = new Array<number>(materialCount).fill(0);
    for (let i = 0; i < materialCount; i++) {
      this.buckets.push({
        position: [],
        normal: [],
        uv: [],
        color: [],
        skinIndex: [],
        skinWeight: [],
        index: [],
      });
    }
  }

  get triangleCount(): number {
    let n = 0;
    for (const b of this.buckets) n += b.index.length / 3;
    return n;
  }

  private vertex(
    mat: number,
    x: number,
    y: number,
    z: number,
    nx: number,
    ny: number,
    nz: number,
    u: number,
    v: number,
    color: THREE.Color,
    bind: Binding,
  ): number {
    const bk = this.buckets[mat];
    const idx = bk.position.length / 3;
    bk.position.push(x, y, z);
    bk.normal.push(nx, ny, nz);
    bk.uv.push(u, v);
    const amp = this.mottle[mat];
    if (amp > 0) {
      const s = this.mottleSeed;
      const m = 1 + amp * blotch(x + s, y + s * 0.7, z - s * 1.3);
      bk.color.push(color.r * m, color.g * m, color.b * m);
    } else {
      bk.color.push(color.r, color.g, color.b);
    }
    bk.skinIndex.push(bind.bones[0], bind.bones[1], bind.bones[2], bind.bones[3]);
    bk.skinWeight.push(bind.weights[0], bind.weights[1], bind.weights[2], bind.weights[3]);
    return idx;
  }

  /**
   * Two triangles from four corners, which must be given anticlockwise as seen
   * from the side the normals point at. Get that backwards and the surface is
   * culled: what survives is the inside of the far wall, which keeps the
   * silhouette, loses every detail on the near side, and shades to black
   * because its normals face away from the light.
   */
  private quad(mat: number, a: number, b: number, c: number, d: number): void {
    const idx = this.buckets[mat].index;
    idx.push(a, b, c, a, c, d);
  }

  /* ------------------------------- tube -------------------------------- */

  /**
   * Sweeps an elliptical section along a polyline of rings.
   *
   * `up` seeds the frame; a limb runs vertically so its sections are framed
   * against world +Z, while the rifle runs horizontally and is framed against
   * world +Y. Passing the wrong one makes a limb twist rather than break, which
   * is the sort of bug that survives a screenshot, so it is explicit.
   */
  tube(
    mat: number,
    rings: Ring[],
    segments: number,
    up: THREE.Vector3,
    capStart = true,
    capEnd = true,
    warp: Warp | null = null,
  ): void {
    const n = rings.length;
    if (n < 2) return;
    let arc = 0;
    const startFrame = new THREE.Matrix4();
    const endFrame = new THREE.Matrix4();
    // Length of the whole sweep, so a warp that varies along it can be turned
    // into a slope. Without this, folds running across a limb are geometrically
    // there and lit as though they were not, and cloth that is not lit as cloth
    // is the whole mannequin complaint.
    let sweep = 0;
    for (let i = 1; i < n; i++) sweep += rings[i].p.distanceTo(rings[i - 1].p);
    sweep = Math.max(1e-4, sweep);

    for (let i = 0; i < n; i++) {
      const ring = rings[i];
      const prev = rings[Math.max(0, i - 1)];
      const next = rings[Math.min(n - 1, i + 1)];
      _t.copy(next.p).sub(prev.p);
      if (_t.lengthSq() < 1e-12) _t.set(0, 1, 0);
      _t.normalize();
      _side.crossVectors(up, _t);
      if (_side.lengthSq() < 1e-8) {
        _side.crossVectors(_t.clone().addScalar(0.3).normalize(), _t);
      }
      _side.normalize();
      _bin.crossVectors(_t, _side).normalize();

      if (i > 0) arc += ring.p.distanceTo(rings[i - 1].p);
      const v = arc / this.tile;

      // Slope of the profile, so a tapered limb gets a normal that leans in.
      const dr =
        i === 0 || i === n - 1
          ? 0
          : (next.rx + next.rz - (prev.rx + prev.rz)) * 0.5 /
            Math.max(1e-4, prev.p.distanceTo(next.p));

      const perimeter = Math.PI * (ring.rx + ring.rz);
      const ox = ring.offsetX ?? 0;
      const oz = ring.offsetZ ?? 0;
      const along = n > 1 ? i / (n - 1) : 0;
      const base: number[] = [];
      for (let s = 0; s <= segments; s++) {
        const a = (s / segments) * Math.PI * 2;
        const ca = Math.cos(a);
        const sa = Math.sin(a);
        const w = warp ? warp(a, along) : 1;
        _p.copy(ring.p)
          .addScaledVector(_side, ca * ring.rx * w + ox)
          .addScaledVector(_bin, sa * ring.rz * w + oz);
        _n.set(0, 0, 0)
          .addScaledVector(_side, ca / Math.max(1e-4, ring.rx))
          .addScaledVector(_bin, sa / Math.max(1e-4, ring.rz))
          .normalize()
          .addScaledVector(_t, -dr);
        if (warp) {
          // A radius that varies around the section tilts the surface
          // tangentially by d(log r)/da. Without this the lumps are lit as if
          // they were not there and the whole point of them is lost.
          const dw = (warp(a + WARP_H, along) - warp(a - WARP_H, along)) / (2 * WARP_H);
          if (dw !== 0) {
            _tan
              .set(0, 0, 0)
              .addScaledVector(_side, -sa * ring.rx)
              .addScaledVector(_bin, ca * ring.rz)
              .normalize();
            _n.addScaledVector(_tan, -dw / Math.max(0.2, w));
          }
          // And the same along the sweep, for the crease that runs round a limb
          // rather than up it. The radial displacement is r·w, so the surface
          // rises d(r·w)/ds against the axis; over the sweep's own length that
          // is the slope the normal has to lean back by.
          const dwt = (warp(a, along + WARP_H) - warp(a, along - WARP_H)) / (2 * WARP_H);
          if (dwt !== 0) {
            _n.addScaledVector(_t, (-dwt * (ring.rx + ring.rz) * 0.5) / sweep);
          }
        }
        _n.normalize();
        base.push(
          this.vertex(
            mat,
            _p.x, _p.y, _p.z,
            _n.x, _n.y, _n.z,
            (s / segments) * (perimeter / this.tile),
            v,
            ring.color,
            ring.bind,
          ),
        );
      }
      if (i === 0) startFrame.makeBasis(_side, _t, _bin);
      if (i === n - 1) endFrame.makeBasis(_side, _t, _bin);
      if (i > 0) {
        for (let s = 0; s < segments; s++) {
          const cur = base[s];
          const cur1 = base[s + 1];
          // Around the ring first, then along the sweep: the other way round is
          // clockwise from outside, because (side, binormal, tangent) is right
          // handed and the section is swept in the tangent's direction.
          this.quad(mat, PREV[s], PREV[s + 1], cur1, cur);
        }
      }
      for (let s = 0; s <= segments; s++) PREV[s] = base[s];
    }

    if (capStart) this.cap(mat, rings[0], segments, startFrame, true, warp, 0);
    if (capEnd) this.cap(mat, rings[n - 1], segments, endFrame, false, warp, 1);
  }

  /** Flat fan closing one end of a tube, oriented by that end's own frame. */
  private cap(
    mat: number,
    ring: Ring,
    segments: number,
    frame: THREE.Matrix4,
    front: boolean,
    warp: Warp | null = null,
    along = 0,
  ): void {
    const e = frame.elements;
    _side.set(e[0], e[1], e[2]);
    _t.set(e[4], e[5], e[6]);
    _bin.set(e[8], e[9], e[10]);
    _n.copy(_t).multiplyScalar(front ? -1 : 1);
    const centre = this.vertex(
      mat,
      ring.p.x, ring.p.y, ring.p.z,
      _n.x, _n.y, _n.z,
      0.5, 0.5,
      ring.color,
      ring.bind,
    );
    const rim: number[] = [];
    for (let s = 0; s <= segments; s++) {
      const a = (s / segments) * Math.PI * 2;
      const w = warp ? warp(a, along) : 1;
      _p.copy(ring.p)
        .addScaledVector(_side, Math.cos(a) * ring.rx * w + (ring.offsetX ?? 0))
        .addScaledVector(_bin, Math.sin(a) * ring.rz * w + (ring.offsetZ ?? 0));
      rim.push(
        this.vertex(
          mat,
          _p.x, _p.y, _p.z,
          _n.x, _n.y, _n.z,
          0.5 + Math.cos(a) * 0.5,
          0.5 + Math.sin(a) * 0.5,
          ring.color,
          ring.bind,
        ),
      );
    }
    const idx = this.buckets[mat].index;
    for (let s = 0; s < segments; s++) {
      if (front) idx.push(centre, rim[s + 1], rim[s]);
      else idx.push(centre, rim[s], rim[s + 1]);
    }
  }

  /* -------------------------------- box -------------------------------- */

  /** Oriented box. `quat` may be null for an axis-aligned one. */
  box(
    mat: number,
    centre: THREE.Vector3,
    half: THREE.Vector3,
    quat: THREE.Quaternion | null,
    color: THREE.Color,
    bind: Binding,
    bevel = 0,
  ): void {
    const b = Math.min(bevel, Math.min(half.x, Math.min(half.y, half.z)) * 0.7);
    for (const face of BOX_FACES) {
      _n.set(face.n[0], face.n[1], face.n[2]);
      if (quat) _n.applyQuaternion(quat);
      const ids: number[] = [];
      for (let k = 0; k < 4; k++) {
        const v = face.v[k];
        // Bevelling pulls the corner in on the two axes the face does not own,
        // which is enough to catch a highlight on an edge without a real chamfer.
        const shrink = b;
        _p.set(
          v[0] * (half.x - (face.n[0] === 0 ? shrink : 0)),
          v[1] * (half.y - (face.n[1] === 0 ? shrink : 0)),
          v[2] * (half.z - (face.n[2] === 0 ? shrink : 0)),
        );
        if (quat) _p.applyQuaternion(quat);
        _p.add(centre);
        ids.push(
          this.vertex(
            mat,
            _p.x, _p.y, _p.z,
            _n.x, _n.y, _n.z,
            (k === 1 || k === 2 ? 1 : 0) * (half.x * 2) / this.tile,
            (k >= 2 ? 1 : 0) * (half.y * 2) / this.tile,
            color,
            bind,
          ),
        );
      }
      // BOX_FACES lists each face clockwise from outside, so it is walked back
      // to front. The table is left as it is because the uvs key off its order.
      this.quad(mat, ids[0], ids[3], ids[2], ids[1]);
    }
  }

  /* ----------------------------- ellipsoid ------------------------------ */

  ellipsoid(
    mat: number,
    centre: THREE.Vector3,
    radii: THREE.Vector3,
    segments: number,
    stacks: number,
    color: THREE.Color,
    bind: Binding,
    quat: THREE.Quaternion | null = null,
    yMin = -1,
    yMax = 1,
    warp: Warp | null = null,
  ): void {
    const grid: number[][] = [];
    // Warped point in the ellipsoid's own frame, for numerical normals. A
    // warped surface's normal cannot be read off the radii any more, and a
    // helmet whose lumps are shaded flat is a helmet with no lumps.
    const at = (a: number, t: number, out: THREE.Vector3): THREE.Vector3 => {
      const sy = yMin + (yMax - yMin) * Math.min(1, Math.max(0, t));
      const phi = Math.asin(Math.max(-1, Math.min(1, sy)));
      const cr = Math.cos(phi);
      const w = warp ? warp(a, t) : 1;
      return out.set(
        radii.x * cr * Math.cos(a) * w,
        radii.y * Math.sin(phi) * w,
        radii.z * cr * Math.sin(a) * w,
      );
    };
    for (let j = 0; j <= stacks; j++) {
      const row: number[] = [];
      const t = j / stacks;
      const sy = yMin + (yMax - yMin) * t;
      const phi = Math.asin(Math.max(-1, Math.min(1, sy)));
      const cy = Math.sin(phi);
      const cr = Math.cos(phi);
      for (let s = 0; s <= segments; s++) {
        const a = (s / segments) * Math.PI * 2;
        if (warp) {
          at(a, t, _p);
          // Outward is d/dt crossed with d/da: latitude climbs +Y while
          // longitude runs +X to +Z, and that pair is left handed about the
          // outward normal, which is also why the quads below are wound the way
          // they are.
          const h = 1 / (stacks * 4);
          at(a, Math.min(1, t + h), _du);
          at(a, Math.max(0, t - h), _tmp);
          _du.sub(_tmp);
          at(a + WARP_H, t, _dv);
          at(a - WARP_H, t, _tmp);
          _dv.sub(_tmp);
          _n.crossVectors(_du, _dv).normalize();
          if (_n.lengthSq() < 0.5) _n.copy(_p).normalize();
        } else {
          _p.set(radii.x * cr * Math.cos(a), radii.y * cy, radii.z * cr * Math.sin(a));
          _n.set(
            (cr * Math.cos(a)) / radii.x,
            cy / radii.y,
            (cr * Math.sin(a)) / radii.z,
          ).normalize();
        }
        if (quat) {
          _p.applyQuaternion(quat);
          _n.applyQuaternion(quat);
        }
        _p.add(centre);
        row.push(
          this.vertex(
            mat,
            _p.x, _p.y, _p.z,
            _n.x, _n.y, _n.z,
            (s / segments) * ((Math.PI * (radii.x + radii.z)) / this.tile),
            t * ((Math.PI * radii.y) / this.tile),
            color,
            bind,
          ),
        );
      }
      grid.push(row);
    }
    for (let j = 0; j < stacks; j++) {
      for (let s = 0; s < segments; s++) {
        // Up a stack before round a segment: latitude climbs +Y while longitude
        // runs +X to +Z, and that pair is left handed about the outward normal.
        this.quad(mat, grid[j][s], grid[j + 1][s], grid[j + 1][s + 1], grid[j][s + 1]);
      }
    }
  }

  /* ------------------------------- strap -------------------------------- */

  /**
   * A flat band through a list of points, always facing away from an axis.
   * Used for slings, straps and the cummerbund's webbing.
   */
  strap(
    mat: number,
    points: THREE.Vector3[],
    width: number,
    thickness: number,
    outward: THREE.Vector3,
    color: THREE.Color,
    bind: Binding,
  ): void {
    if (points.length < 2) return;
    const left: number[] = [];
    const right: number[] = [];
    const leftIn: number[] = [];
    const rightIn: number[] = [];
    let arc = 0;
    for (let i = 0; i < points.length; i++) {
      const prev = points[Math.max(0, i - 1)];
      const next = points[Math.min(points.length - 1, i + 1)];
      _t.copy(next).sub(prev).normalize();
      _side.crossVectors(outward, _t).normalize();
      _bin.crossVectors(_t, _side).normalize();
      if (i > 0) arc += points[i].distanceTo(points[i - 1]);
      const v = arc / this.tile;
      _p.copy(points[i]).addScaledVector(_side, width * 0.5).addScaledVector(_bin, thickness);
      left.push(this.vertex(mat, _p.x, _p.y, _p.z, _bin.x, _bin.y, _bin.z, 0, v, color, bind));
      _p.copy(points[i]).addScaledVector(_side, -width * 0.5).addScaledVector(_bin, thickness);
      right.push(
        this.vertex(mat, _p.x, _p.y, _p.z, _bin.x, _bin.y, _bin.z, width / this.tile, v, color, bind),
      );
      _p.copy(points[i]).addScaledVector(_side, width * 0.5);
      leftIn.push(this.vertex(mat, _p.x, _p.y, _p.z, -_bin.x, -_bin.y, -_bin.z, 0, v, color, bind));
      _p.copy(points[i]).addScaledVector(_side, -width * 0.5);
      rightIn.push(
        this.vertex(mat, _p.x, _p.y, _p.z, -_bin.x, -_bin.y, -_bin.z, width / this.tile, v, color, bind),
      );
    }
    for (let i = 0; i < points.length - 1; i++) {
      this.quad(mat, left[i], right[i], right[i + 1], left[i + 1]);
      this.quad(mat, rightIn[i], leftIn[i], leftIn[i + 1], rightIn[i + 1]);
    }
  }

  /* -------------------------------- cord -------------------------------- */

  /**
   * A round tube through a list of points, for antennas, bungee, cable and the
   * loose ends of a sling. Three or four of these hanging off a figure do more
   * for the outline than any amount of surface detail, because they are the only
   * things on it that are not a smooth convex volume.
   */
  cord(
    mat: number,
    points: THREE.Vector3[],
    radius: number,
    segments: number,
    color: THREE.Color,
    bind: Binding,
    up: THREE.Vector3 = UP_Y,
  ): void {
    if (points.length < 2) return;
    const rings: Ring[] = points.map((p) => ({ p, rx: radius, rz: radius, bind, color }));
    this.tube(mat, rings, segments, up, false, false);
  }

  /* ------------------------------ triangle ------------------------------ */

  /** Raw triangle, for the handful of shapes the primitives cannot express. */
  triangle(
    mat: number,
    a: THREE.Vector3,
    b: THREE.Vector3,
    c: THREE.Vector3,
    color: THREE.Color,
    bind: Binding,
  ): void {
    _a.copy(b).sub(a);
    _b.copy(c).sub(a);
    _c.crossVectors(_a, _b).normalize();
    const ia = this.vertex(mat, a.x, a.y, a.z, _c.x, _c.y, _c.z, 0, 0, color, bind);
    const ib = this.vertex(mat, b.x, b.y, b.z, _c.x, _c.y, _c.z, 1, 0, color, bind);
    const ic = this.vertex(mat, c.x, c.y, c.z, _c.x, _c.y, _c.z, 0, 1, color, bind);
    this.buckets[mat].index.push(ia, ib, ic);
  }

  /* ------------------------------- output ------------------------------- */

  /** Concatenates every bucket into one geometry with a group per material. */
  /**
   * Darkens the vertex colours inside a set of declared cavities.
   *
   * The review's second complaint about these men, after the silhouette, was
   * that "shading is so soft that upper arm does not separate from torso, and
   * there is no occlusion in the armpit, under the chin, under the vest lip, or
   * in the knee crease". That is not a lighting problem and it will not go away
   * with a better sun: two convex volumes meeting at a joint have no concavity
   * for the renderer's own ambient occlusion to find, because the concavity is
   * between them and each surface faces out of it. Screen-space AO at a 2.8 m
   * radius will not resolve a 4 cm armpit either.
   *
   * So the cavities are named by hand — six or eight of them on a figure — and
   * baked into the albedo as a smooth falloff on distance from a line segment.
   * Cheaper than any of the alternatives, exact in the pose the model is authored
   * in, and it is what the joints of a hand-painted character have always had.
   * Applied last, so a part built before or after makes no difference.
   *
   * `pinch` may be given to make a cavity one-sided: a vertex is only darkened
   * when it faces towards the cavity's axis, which keeps the shadow under the
   * vest lip off the top of the belt below it.
   */
  occlude(
    cavities: ReadonlyArray<{
      a: THREE.Vector3;
      b: THREE.Vector3;
      radius: number;
      strength: number;
      pinch?: boolean;
    }>,
  ): number {
    if (cavities.length === 0) return 0;
    let touched = 0;
    const ab = new THREE.Vector3();
    const ap = new THREE.Vector3();
    const near = new THREE.Vector3();
    for (const bk of this.buckets) {
      const n = bk.position.length / 3;
      for (let i = 0; i < n; i++) {
        const px = bk.position[i * 3];
        const py = bk.position[i * 3 + 1];
        const pz = bk.position[i * 3 + 2];
        let darkest = 0;
        for (const c of cavities) {
          ab.subVectors(c.b, c.a);
          ap.set(px - c.a.x, py - c.a.y, pz - c.a.z);
          const lenSq = Math.max(1e-8, ab.lengthSq());
          const t = Math.min(1, Math.max(0, ap.dot(ab) / lenSq));
          near.copy(c.a).addScaledVector(ab, t);
          const dx = px - near.x;
          const dy = py - near.y;
          const dz = pz - near.z;
          const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
          if (d >= c.radius) continue;
          // Smooth to zero at the rim, so a cavity never leaves an edge.
          const f = 1 - d / c.radius;
          let amount = c.strength * f * f;
          if (c.pinch) {
            // Facing the axis or away from it. A surface turned away from the
            // crease is lit by the sky and should not be darkened by it.
            const nx = bk.normal[i * 3];
            const ny = bk.normal[i * 3 + 1];
            const nz = bk.normal[i * 3 + 2];
            const inward = d > 1e-6 ? -(nx * dx + ny * dy + nz * dz) / d : 1;
            amount *= Math.max(0, inward);
          }
          darkest = Math.max(darkest, amount);
        }
        if (darkest <= 0.01) continue;
        const k = 1 - darkest;
        bk.color[i * 3] *= k;
        bk.color[i * 3 + 1] *= k;
        bk.color[i * 3 + 2] *= k;
        touched++;
      }
    }
    return touched;
  }

  build(name: string): THREE.BufferGeometry {
    const geo = new THREE.BufferGeometry();
    geo.name = name;
    let verts = 0;
    let indices = 0;
    for (const b of this.buckets) {
      verts += b.position.length / 3;
      indices += b.index.length;
    }
    const position = new Float32Array(verts * 3);
    const normal = new Float32Array(verts * 3);
    const uv = new Float32Array(verts * 2);
    const color = new Float32Array(verts * 3);
    const skinIndex = new Uint16Array(verts * 4);
    const skinWeight = new Float32Array(verts * 4);
    const index = verts > 65535 ? new Uint32Array(indices) : new Uint16Array(indices);

    let vo = 0;
    let io = 0;
    for (let m = 0; m < this.buckets.length; m++) {
      const b = this.buckets[m];
      const count = b.position.length / 3;
      position.set(b.position, vo * 3);
      normal.set(b.normal, vo * 3);
      uv.set(b.uv, vo * 2);
      color.set(b.color, vo * 3);
      skinIndex.set(b.skinIndex, vo * 4);
      skinWeight.set(b.skinWeight, vo * 4);
      for (let i = 0; i < b.index.length; i++) index[io + i] = b.index[i] + vo;
      if (b.index.length > 0) geo.addGroup(io, b.index.length, m);
      vo += count;
      io += b.index.length;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(position, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(normal, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.setAttribute('color', new THREE.BufferAttribute(color, 3));
    geo.setAttribute('skinIndex', new THREE.BufferAttribute(skinIndex, 4));
    geo.setAttribute('skinWeight', new THREE.BufferAttribute(skinWeight, 4));
    geo.setIndex(new THREE.BufferAttribute(index, 1));
    geo.computeBoundingBox();
    geo.computeBoundingSphere();
    return geo;
  }
}

/** Ring scratch shared by `tube`; sized for the widest section we ever sweep. */
const PREV = new Array<number>(129).fill(0);

/** Convenience: a ring at a point with a single bone influence. */
export function ring(
  x: number,
  y: number,
  z: number,
  rx: number,
  rz: number,
  bind: Binding,
  color: THREE.Color,
): Ring {
  return { p: new THREE.Vector3(x, y, z), rx, rz, bind, color };
}

/** Linear interpolation between two joints, for rings partway along a bone. */
export function lerpRing(
  a: THREE.Vector3,
  b: THREE.Vector3,
  t: number,
  rx: number,
  rz: number,
  bind: Binding,
  color: THREE.Color,
): Ring {
  return {
    p: _tmp.clone().copy(a).lerp(b, t),
    rx,
    rz,
    bind,
    color,
  };
}
