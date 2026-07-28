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

  constructor(materialCount: number) {
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
    bk.color.push(color.r, color.g, color.b);
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
  ): void {
    const n = rings.length;
    if (n < 2) return;
    let arc = 0;
    const startFrame = new THREE.Matrix4();
    const endFrame = new THREE.Matrix4();

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
      const base: number[] = [];
      for (let s = 0; s <= segments; s++) {
        const a = (s / segments) * Math.PI * 2;
        const ca = Math.cos(a);
        const sa = Math.sin(a);
        _p.copy(ring.p)
          .addScaledVector(_side, ca * ring.rx + ox)
          .addScaledVector(_bin, sa * ring.rz + oz);
        _n.set(0, 0, 0)
          .addScaledVector(_side, ca / Math.max(1e-4, ring.rx))
          .addScaledVector(_bin, sa / Math.max(1e-4, ring.rz))
          .normalize()
          .addScaledVector(_t, -dr)
          .normalize();
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

    if (capStart) this.cap(mat, rings[0], segments, startFrame, true);
    if (capEnd) this.cap(mat, rings[n - 1], segments, endFrame, false);
  }

  /** Flat fan closing one end of a tube, oriented by that end's own frame. */
  private cap(
    mat: number,
    ring: Ring,
    segments: number,
    frame: THREE.Matrix4,
    front: boolean,
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
      _p.copy(ring.p)
        .addScaledVector(_side, Math.cos(a) * ring.rx + (ring.offsetX ?? 0))
        .addScaledVector(_bin, Math.sin(a) * ring.rz + (ring.offsetZ ?? 0));
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
  ): void {
    const grid: number[][] = [];
    for (let j = 0; j <= stacks; j++) {
      const row: number[] = [];
      const t = j / stacks;
      const sy = yMin + (yMax - yMin) * t;
      const phi = Math.asin(Math.max(-1, Math.min(1, sy)));
      const cy = Math.sin(phi);
      const cr = Math.cos(phi);
      for (let s = 0; s <= segments; s++) {
        const a = (s / segments) * Math.PI * 2;
        _p.set(radii.x * cr * Math.cos(a), radii.y * cy, radii.z * cr * Math.sin(a));
        _n.set(
          (cr * Math.cos(a)) / radii.x,
          cy / radii.y,
          (cr * Math.sin(a)) / radii.z,
        ).normalize();
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
