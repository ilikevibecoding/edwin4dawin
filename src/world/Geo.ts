import * as THREE from 'three';

/**
 * Geometry authoring primitives for the level generator.
 *
 * Two conventions run through the whole world module and everything downstream
 * depends on them:
 *
 * 1. **UVs are metres.** Every primitive writes texture coordinates in world
 *    metres rather than 0..1, so a merged mesh made of forty walls tiles
 *    continuously across all of them and one material serves every size of
 *    surface. `Batcher` sets each material's tile uniform to `1 / tileSize` so
 *    the art lands at its authored physical scale.
 * 2. **Every vertex carries a colour.** Merging destroys per-object material
 *    overrides, so the only place per-building tint, dirt gradients and edge
 *    bleaching can live is the colour attribute. It is a multiplier centred on
 *    1, never a replacement for the albedo map.
 */

export type RGB = readonly [number, number, number];

export const WHITE: RGB = [1, 1, 1];

/** Face selection bitmask, so abutting boxes can drop their hidden sides. */
export const FX_PX = 1;
export const FX_NX = 2;
export const FX_PY = 4;
export const FX_NY = 8;
export const FX_PZ = 16;
export const FX_NZ = 32;
export const FX_ALL = 63;
export const FX_SIDES = FX_PX | FX_NX | FX_PZ | FX_NZ;
/** A wall or slab seen from outside and above but never from below. */
export const FX_NO_BOTTOM = FX_ALL & ~FX_NY;

export interface BoxOpts {
  /** Rotation about Y in radians. */
  rotY?: number;
  color?: RGB;
  /** Which faces to emit. */
  faces?: number;
  /**
   * Darkens the bottom `grimeHeight` metres of the vertical faces. Splash-back
   * dirt at the base of a wall is the single cheapest cue that a building is
   * standing on the ground rather than intersecting it.
   */
  grime?: number;
  grimeHeight?: number;
  /** Lightens the top of vertical faces; sun bleaching on an exposed edge. */
  bleach?: number;
  /** Swaps u and v on the side faces, for materials with a grain direction. */
  uvSwap?: boolean;
  /**
   * Added to every uv, to break alignment between identical neighbours.
   *
   * World-metre uvs mean two piers standing five metres apart under a material
   * that tiles at 2.5 m sample the map at exactly the same place, so whatever
   * large feature the material draws — a fallen patch of render, a rust bloom —
   * appears on both at the same height and the same shape. A metre or two of
   * offset per object costs nothing and is the difference between a row of piers
   * and a row of copies of one pier.
   */
  uvOffset?: readonly [number, number];
  /**
   * Multiplies every uv. Uvs are authored in metres and the library sets each
   * material's repeat from its own art-directed tile size, which is chosen for
   * the surface the material was designed for. Where a material is reused at a
   * different scale — floor tiles indoors are a third the size of the paving the
   * same material draws outside — this rescales it without a second material and
   * therefore without a second draw call.
   */
  uvScale?: number;
}

const _v = new THREE.Vector3();
const _n = new THREE.Vector3();
const _nm = new THREE.Matrix3();

/**
 * A growable, non-indexed-friendly vertex soup. Plain arrays beat typed arrays
 * here because the final size is not known until the district is finished, and
 * the whole thing is converted exactly once.
 */
export class GeoBuf {
  readonly pos: number[] = [];
  readonly nrm: number[] = [];
  readonly uv: number[] = [];
  readonly col: number[] = [];
  readonly idx: number[] = [];

  get vertexCount(): number {
    return this.pos.length / 3;
  }

  get triangleCount(): number {
    return this.idx.length / 3;
  }

  get empty(): boolean {
    return this.idx.length === 0;
  }

  vert(
    x: number, y: number, z: number,
    nx: number, ny: number, nz: number,
    u: number, v: number,
    r: number, g: number, b: number,
  ): number {
    const i = this.pos.length / 3;
    this.pos.push(x, y, z);
    this.nrm.push(nx, ny, nz);
    this.uv.push(u, v);
    this.col.push(r, g, b);
    return i;
  }

  tri(a: number, b: number, c: number): void {
    this.idx.push(a, b, c);
  }

  /** Winding is counter-clockwise seen from the side the normal points to. */
  quad(a: number, b: number, c: number, d: number): void {
    this.idx.push(a, b, c, a, c, d);
  }

  /**
   * Appends another buffer's contents, rebasing its indices. Lets the batcher
   * fold buckets together after the fact, which is how a material that appears
   * once in each of five cells stops costing five draw calls.
   */
  absorb(other: GeoBuf): void {
    const base = this.pos.length / 3;
    for (let i = 0; i < other.pos.length; i++) this.pos.push(other.pos[i]);
    for (let i = 0; i < other.nrm.length; i++) this.nrm.push(other.nrm[i]);
    for (let i = 0; i < other.uv.length; i++) this.uv.push(other.uv[i]);
    for (let i = 0; i < other.col.length; i++) this.col.push(other.col[i]);
    for (let i = 0; i < other.idx.length; i++) this.idx.push(other.idx[i] + base);
  }

  /**
   * Appends a prop geometry transformed into world space, tinted by `tint`.
   *
   * The point is to stop paying a draw call for a prop that only appears two or
   * three times. Instancing is the right answer for forty water tanks and the
   * wrong one for a single television: the mesh costs a call in the main pass and
   * another in every shadow cascade regardless of how little is in it, and a
   * hundred-triangle object cannot earn that back. Absorbed here the geometry is
   * byte-for-byte the same on screen and costs nothing to draw.
   */
  absorbInstance(geo: THREE.BufferGeometry, matrix: THREE.Matrix4, tint: RGB): void {
    const pos = geo.getAttribute('position');
    if (!pos) return;
    const nrm = geo.getAttribute('normal');
    const uvs = geo.getAttribute('uv');
    const cols = geo.getAttribute('color');
    const base = this.pos.length / 3;
    _nm.getNormalMatrix(matrix);
    for (let i = 0; i < pos.count; i++) {
      _v.fromBufferAttribute(pos, i).applyMatrix4(matrix);
      this.pos.push(_v.x, _v.y, _v.z);
      if (nrm) {
        _n.fromBufferAttribute(nrm, i).applyMatrix3(_nm).normalize();
        this.nrm.push(_n.x, _n.y, _n.z);
      } else {
        this.nrm.push(0, 1, 0);
      }
      if (uvs) this.uv.push(uvs.getX(i), uvs.getY(i));
      else this.uv.push(0, 0);
      if (cols) {
        this.col.push(cols.getX(i) * tint[0], cols.getY(i) * tint[1], cols.getZ(i) * tint[2]);
      } else {
        this.col.push(tint[0], tint[1], tint[2]);
      }
    }
    const index = geo.getIndex();
    if (index) for (let i = 0; i < index.count; i++) this.idx.push(index.getX(i) + base);
    else for (let i = 0; i < pos.count; i++) this.idx.push(base + i);
  }

  toGeometry(): THREE.BufferGeometry {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(this.nrm, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    geo.setIndex(this.idx);
    geo.computeBoundingSphere();
    geo.computeBoundingBox();
    return geo;
  }
}

/* --------------------------- planar helpers ---------------------------- */

/** Appends a quad from four explicit corners, with explicit uvs. */
export function addQuad(
  buf: GeoBuf,
  p0: THREE.Vector3, p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3,
  uvs: readonly number[],
  color: RGB = WHITE,
  normal?: THREE.Vector3,
): void {
  let nx: number, ny: number, nz: number;
  if (normal) {
    nx = normal.x; ny = normal.y; nz = normal.z;
  } else {
    _v.copy(p1).sub(p0);
    _n.copy(p3).sub(p0);
    _v.cross(_n).normalize();
    nx = _v.x; ny = _v.y; nz = _v.z;
  }
  const [r, g, b] = color;
  const a = buf.vert(p0.x, p0.y, p0.z, nx, ny, nz, uvs[0], uvs[1], r, g, b);
  buf.vert(p1.x, p1.y, p1.z, nx, ny, nz, uvs[2], uvs[3], r, g, b);
  buf.vert(p2.x, p2.y, p2.z, nx, ny, nz, uvs[4], uvs[5], r, g, b);
  buf.vert(p3.x, p3.y, p3.z, nx, ny, nz, uvs[6], uvs[7], r, g, b);
  buf.quad(a, a + 1, a + 2, a + 3);
}

const _cu = new THREE.Vector3();
const _cn = new THREE.Vector3();

/**
 * A quad of hanging cloth: the sheet, plus its far face a few centimetres
 * behind it.
 *
 * Cloth is the one surface a solid-geometry renderer has no good answer for. A
 * zero-thickness sheet with a reversed back normal is geometrically correct and
 * looks like a black lid, because a downward normal under a horizontal awning
 * receives neither sun nor sky. Coplanar faces sharing an upward normal are
 * worse: the ambient-occlusion prepass sees a surface facing away from the
 * camera at the same depth as one facing it, and resolves the pair to solid
 * black.
 *
 * So the far face is genuinely offset — `offset` metres along `-normal` — and
 * carries `farNormal`, which callers aim near the horizon. With the sun ten
 * degrees up, a horizontal normal is close to fully lit, and one layer of
 * cotton with the sun behind it is meant to be the brightest thing in the lane.
 */
export function addCloth(
  buf: GeoBuf,
  p0: THREE.Vector3, p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3,
  uvs: readonly number[],
  near: RGB,
  far: RGB,
  nearNormal: THREE.Vector3,
  farNormal: THREE.Vector3,
  offset = 0.03,
): void {
  addQuad(buf, p0, p3, p2, p1,
    [uvs[0], uvs[1], uvs[6], uvs[7], uvs[4], uvs[5], uvs[2], uvs[3]], near, nearNormal);
  _cu.copy(nearNormal).multiplyScalar(-offset);
  const q0 = _cn.copy(p0).add(_cu).clone();
  const q1 = _cn.copy(p1).add(_cu).clone();
  const q2 = _cn.copy(p2).add(_cu).clone();
  const q3 = _cn.copy(p3).add(_cu).clone();
  addQuad(buf, q1, q2, q3, q0,
    [uvs[2], uvs[3], uvs[4], uvs[5], uvs[6], uvs[7], uvs[0], uvs[1]], far, farNormal);
}

/**
 * Appends a double-sided triangle from three explicit corners.
 *
 * Exists for the handful of things whose silhouette is the whole point —
 * bunting pennants, torn cloth corners, awning gussets — where cutting the
 * shape out of a quad would leave the very straight edge being avoided.
 */
export function addTri(
  buf: GeoBuf,
  p0: THREE.Vector3, p1: THREE.Vector3, p2: THREE.Vector3,
  scale: number,
  front: RGB = WHITE,
  back?: RGB,
): void {
  _v.copy(p1).sub(p0);
  _n.copy(p2).sub(p0);
  _v.cross(_n).normalize();
  const uv = (p: THREE.Vector3): [number, number] => [p.x * scale, p.z * scale + p.y * scale];
  const [r, g, b] = front;
  const [u0, v0] = uv(p0);
  const [u1, v1] = uv(p1);
  const [u2, v2] = uv(p2);
  const a = buf.vert(p0.x, p0.y, p0.z, _v.x, _v.y, _v.z, u0, v0, r, g, b);
  buf.vert(p1.x, p1.y, p1.z, _v.x, _v.y, _v.z, u1, v1, r, g, b);
  buf.vert(p2.x, p2.y, p2.z, _v.x, _v.y, _v.z, u2, v2, r, g, b);
  buf.tri(a, a + 1, a + 2);
  const [br, bg, bb] = back ?? front;
  const d = buf.vert(p0.x, p0.y, p0.z, -_v.x, -_v.y, -_v.z, u0, v0, br, bg, bb);
  buf.vert(p2.x, p2.y, p2.z, -_v.x, -_v.y, -_v.z, u2, v2, br, bg, bb);
  buf.vert(p1.x, p1.y, p1.z, -_v.x, -_v.y, -_v.z, u1, v1, br, bg, bb);
  buf.tri(d, d + 1, d + 2);
}

/**
 * An irregular flat polygon lying on the ground, following its undulation.
 *
 * Ground detail — surviving asphalt, tar repairs, oil, scorch — has to be
 * coplanar with the surface it is on, and a box cannot be. A box has a lip and
 * a level top, so on a cambered road it stands proud on one side and buries
 * itself on the other; a row of them reads as carpet tiles dropped in the
 * street, which is exactly what the first pass at the market street looked
 * like. This samples the height field at every vertex and lifts by a couple of
 * centimetres, so the patch is welded to the road all the way across, and takes
 * a per-vertex radius so no edge of the outline is straight.
 *
 * `radii` is indexed by angle step, `aspect` stretches the shape along local x
 * before `rot` spins it, and the fan's centre carries the same colour as its
 * rim — these are big and flat and any centre-to-edge gradient reads as a dome.
 */
export function addGroundPatch(
  buf: GeoBuf,
  cx: number, cz: number,
  radii: readonly number[],
  rot: number,
  aspect: number,
  heightAt: (x: number, z: number) => number,
  lift: number,
  color: RGB,
): void {
  const n = radii.length;
  if (n < 3) return;
  const [r, g, b] = color;
  const cs = Math.cos(rot);
  const sn = Math.sin(rot);
  const centre = buf.vert(cx, heightAt(cx, cz) + lift, cz, 0, 1, 0, cx, cz, r, g, b);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const lx = Math.cos(a) * radii[i] * aspect;
    const lz = Math.sin(a) * radii[i];
    const px = cx + lx * cs - lz * sn;
    const pz = cz + lx * sn + lz * cs;
    buf.vert(px, heightAt(px, pz) + lift, pz, 0, 1, 0, px, pz, r, g, b);
  }
  for (let i = 0; i < n; i++) {
    buf.tri(centre, centre + 1 + ((i + 1) % n), centre + 1 + i);
  }
}

/** Horizontal quad spanning an axis-aligned rectangle at height `y`. */
export function addFloor(
  buf: GeoBuf,
  x0: number, z0: number, x1: number, z1: number,
  y: number,
  color: RGB = WHITE,
  up = true,
): void {
  const [r, g, b] = color;
  const ny = up ? 1 : -1;
  const a = buf.vert(x0, y, z0, 0, ny, 0, x0, z0, r, g, b);
  const b1 = buf.vert(x1, y, z0, 0, ny, 0, x1, z0, r, g, b);
  const c = buf.vert(x1, y, z1, 0, ny, 0, x1, z1, r, g, b);
  const d = buf.vert(x0, y, z1, 0, ny, 0, x0, z1, r, g, b);
  if (up) buf.quad(a, d, c, b1);
  else buf.quad(a, b1, c, d);
}

/* ------------------------------- boxes --------------------------------- */

const FACE_DEFS: ReadonlyArray<{
  bit: number;
  /** Local-space normal. */
  n: readonly [number, number, number];
  /** Corners in local unit space, counter-clockwise seen from outside. */
  c: ReadonlyArray<readonly [number, number, number]>;
}> = [
  { bit: FX_PX, n: [1, 0, 0], c: [[1, -1, 1], [1, -1, -1], [1, 1, -1], [1, 1, 1]] },
  { bit: FX_NX, n: [-1, 0, 0], c: [[-1, -1, -1], [-1, -1, 1], [-1, 1, 1], [-1, 1, -1]] },
  { bit: FX_PY, n: [0, 1, 0], c: [[-1, 1, 1], [1, 1, 1], [1, 1, -1], [-1, 1, -1]] },
  { bit: FX_NY, n: [0, -1, 0], c: [[-1, -1, -1], [1, -1, -1], [1, -1, 1], [-1, -1, 1]] },
  { bit: FX_PZ, n: [0, 0, 1], c: [[-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]] },
  { bit: FX_NZ, n: [0, 0, -1], c: [[1, -1, -1], [-1, -1, -1], [-1, 1, -1], [1, 1, -1]] },
];

/**
 * The level's workhorse. A box centred on (cx,cy,cz) with full extents
 * (sx,sy,sz), optionally spun about Y.
 *
 * UVs come from the box's own frame offset by its world centre projected onto
 * that frame, which means axis-aligned boxes get exact world-space uvs (so
 * neighbours tile seamlessly) and rotated ones stay internally continuous.
 */
export function addBox(
  buf: GeoBuf,
  cx: number, cy: number, cz: number,
  sx: number, sy: number, sz: number,
  opts: BoxOpts = {},
): void {
  const rot = opts.rotY ?? 0;
  const faces = opts.faces ?? FX_ALL;
  const color = opts.color ?? WHITE;
  const grime = opts.grime ?? 0;
  const grimeH = opts.grimeHeight ?? 0.55;
  const bleach = opts.bleach ?? 0;
  const cs = Math.cos(rot);
  const sn = Math.sin(rot);
  const hx = sx * 0.5;
  const hy = sy * 0.5;
  const hz = sz * 0.5;
  const uOff = opts.uvOffset ? opts.uvOffset[0] : 0;
  const vOff = opts.uvOffset ? opts.uvOffset[1] : 0;

  // World centre projected onto the box's own axes; makes uvs world-continuous.
  const baseU = cx * cs - cz * sn + uOff;
  const baseW = cx * sn + cz * cs + vOff;
  const bottom = cy - hy;
  const top = cy + hy;

  for (const face of FACE_DEFS) {
    if ((faces & face.bit) === 0) continue;
    const nlx = face.n[0];
    const nly = face.n[1];
    const nlz = face.n[2];
    const nx = nlx * cs + nlz * sn;
    const nz = -nlx * sn + nlz * cs;
    const first = buf.vertexCount;
    for (const corner of face.c) {
      const lx = corner[0] * hx;
      const ly = corner[1] * hy;
      const lz = corner[2] * hz;
      const wx = cx + lx * cs + lz * sn;
      const wy = cy + ly;
      const wz = cz - lx * sn + lz * cs;

      let u: number;
      let v: number;
      if (nly !== 0) {
        u = lx + baseU;
        v = lz + baseW;
      } else if (nlx !== 0) {
        u = lz + baseW;
        v = wy + vOff;
      } else {
        u = lx + baseU;
        v = wy + vOff;
      }
      if (opts.uvSwap && nly === 0) {
        const t = u;
        u = v;
        v = t;
      }
      if (opts.uvScale !== undefined) {
        u *= opts.uvScale;
        v *= opts.uvScale;
      }

      let shade = 1;
      if (grime > 0 && sy > 0.01) {
        const t = Math.min(1, Math.max(0, (wy - bottom) / grimeH));
        shade *= 1 - grime * (1 - t) * (1 - t);
      }
      if (bleach > 0 && sy > 0.01) {
        const t = Math.min(1, Math.max(0, (top - wy) / Math.max(0.2, hy)));
        shade *= 1 + bleach * (1 - t);
      }
      buf.vert(wx, wy, wz, nx, nly, nz, u, v, color[0] * shade, color[1] * shade, color[2] * shade);
    }
    buf.quad(first, first + 1, first + 2, first + 3);
  }
}

/**
 * Triangular prism, extruded along Z (or spun about Y). The sloped face runs
 * from the low edge at -x to the high edge at +x. Ramps, sand drifts against
 * walls, kerb chamfers and rubble wedges are all this.
 */
export function addWedge(
  buf: GeoBuf,
  cx: number, cy: number, cz: number,
  sx: number, sy: number, sz: number,
  opts: BoxOpts = {},
): void {
  const rot = opts.rotY ?? 0;
  const color = opts.color ?? WHITE;
  const cs = Math.cos(rot);
  const sn = Math.sin(rot);
  const hx = sx * 0.5;
  const hz = sz * 0.5;
  const y0 = cy;
  const y1 = cy + sy;
  const baseU = cx * cs - cz * sn;
  const baseW = cx * sn + cz * cs;

  const put = (lx: number, ly: number, lz: number, nlx: number, nly: number, nlz: number,
    u: number, v: number, shade: number): number => {
    const wx = cx + lx * cs + lz * sn;
    const wz = cz - lx * sn + lz * cs;
    const nx = nlx * cs + nlz * sn;
    const nz = -nlx * sn + nlz * cs;
    return buf.vert(wx, ly, wz, nx, nly, nz, u, v, color[0] * shade, color[1] * shade, color[2] * shade);
  };

  // Sloped top face. The surface climbs toward +x, so its normal leans -x.
  const slopeLen = Math.hypot(sx, sy);
  const sny = sx / slopeLen;
  const snx = -sy / slopeLen;
  {
    const a = put(-hx, y0, hz, snx, sny, 0, baseU - hx, baseW + hz, 1);
    const b = put(hx, y1, hz, snx, sny, 0, baseU + hx, baseW + hz, 1);
    const c = put(hx, y1, -hz, snx, sny, 0, baseU + hx, baseW - hz, 1);
    const d = put(-hx, y0, -hz, snx, sny, 0, baseU - hx, baseW - hz, 1);
    buf.quad(a, b, c, d);
  }
  // Vertical back face at +x.
  {
    const a = put(hx, y0, -hz, 1, 0, 0, baseW - hz, y0, 1 - (opts.grime ?? 0));
    const b = put(hx, y0, hz, 1, 0, 0, baseW + hz, y0, 1 - (opts.grime ?? 0));
    const c = put(hx, y1, hz, 1, 0, 0, baseW + hz, y1, 1);
    const d = put(hx, y1, -hz, 1, 0, 0, baseW - hz, y1, 1);
    buf.quad(a, d, c, b);
  }
  // Triangular ends.
  {
    const a = put(-hx, y0, hz, 0, 0, 1, baseU - hx, y0, 1);
    const b = put(hx, y0, hz, 0, 0, 1, baseU + hx, y0, 1);
    const c = put(hx, y1, hz, 0, 0, 1, baseU + hx, y1, 1);
    buf.tri(a, b, c);
  }
  {
    const a = put(hx, y0, -hz, 0, 0, -1, baseU + hx, y0, 1);
    const b = put(-hx, y0, -hz, 0, 0, -1, baseU - hx, y0, 1);
    const c = put(hx, y1, -hz, 0, 0, -1, baseU + hx, y1, 1);
    buf.tri(a, b, c);
  }
}

/* ------------------------------ revolves -------------------------------- */

export interface CylOpts {
  segments?: number;
  color?: RGB;
  /** Radius at the top; defaults to the bottom radius. */
  topRadius?: number;
  /**
   * Which ends to close. `'top'` and `'bottom'` exist because most cylinders in
   * a level have one end buried in whatever they stand on, and an n-gon disc is
   * a seventh of a small cylinder's geometry.
   */
  caps?: boolean | 'top' | 'bottom';
  /** Rotation about Y, only meaningful for a non-round segment count. */
  rotY?: number;
  /** Smooth-shade the side wall. Off gives faceted barrels and bollards. */
  smooth?: boolean;
  grime?: number;
}

/** Vertical cylinder with its base at `y`. */
export function addCylinder(
  buf: GeoBuf,
  cx: number, y: number, cz: number,
  radius: number, height: number,
  opts: CylOpts = {},
): void {
  const seg = Math.max(3, opts.segments ?? 12);
  const color = opts.color ?? WHITE;
  const rTop = opts.topRadius ?? radius;
  const capTop = opts.caps !== false && opts.caps !== 'bottom';
  const capBottom = opts.caps !== false && opts.caps !== 'top';
  const rot = opts.rotY ?? 0;
  const smooth = opts.smooth !== false;
  const grime = opts.grime ?? 0;
  const circ = Math.PI * 2 * Math.max(radius, rTop);
  const [r, g, b] = color;

  for (let i = 0; i < seg; i++) {
    const a0 = rot + (i / seg) * Math.PI * 2;
    const a1 = rot + ((i + 1) / seg) * Math.PI * 2;
    const u0 = (i / seg) * circ;
    const u1 = ((i + 1) / seg) * circ;
    const c0 = Math.cos(a0);
    const s0 = Math.sin(a0);
    const c1 = Math.cos(a1);
    const s1 = Math.sin(a1);
    let n0x = c0;
    let n0z = s0;
    let n1x = c1;
    let n1z = s1;
    if (!smooth) {
      const am = (a0 + a1) * 0.5;
      n0x = n1x = Math.cos(am);
      n0z = n1z = Math.sin(am);
    }
    const sh = 1 - grime;
    const p0 = buf.vert(cx + c0 * radius, y, cz + s0 * radius, n0x, 0, n0z, u0, 0, r * sh, g * sh, b * sh);
    buf.vert(cx + c1 * radius, y, cz + s1 * radius, n1x, 0, n1z, u1, 0, r * sh, g * sh, b * sh);
    buf.vert(cx + c1 * rTop, y + height, cz + s1 * rTop, n1x, 0, n1z, u1, height, r, g, b);
    buf.vert(cx + c0 * rTop, y + height, cz + s0 * rTop, n0x, 0, n0z, u0, height, r, g, b);
    buf.quad(p0, p0 + 3, p0 + 2, p0 + 1);
  }

  if (capTop) {
    const top = buf.vert(cx, y + height, cz, 0, 1, 0, cx, cz, r, g, b);
    for (let i = 0; i < seg; i++) {
      const a0 = rot + (i / seg) * Math.PI * 2;
      const a1 = rot + ((i + 1) / seg) * Math.PI * 2;
      const v0 = buf.vert(cx + Math.cos(a0) * rTop, y + height, cz + Math.sin(a0) * rTop, 0, 1, 0,
        cx + Math.cos(a0) * rTop, cz + Math.sin(a0) * rTop, r, g, b);
      const v1 = buf.vert(cx + Math.cos(a1) * rTop, y + height, cz + Math.sin(a1) * rTop, 0, 1, 0,
        cx + Math.cos(a1) * rTop, cz + Math.sin(a1) * rTop, r, g, b);
      buf.tri(top, v1, v0);
    }
  }
  if (capBottom) {
    const bot = buf.vert(cx, y, cz, 0, -1, 0, cx, cz, r, g, b);
    for (let i = 0; i < seg; i++) {
      const a0 = rot + (i / seg) * Math.PI * 2;
      const a1 = rot + ((i + 1) / seg) * Math.PI * 2;
      const v0 = buf.vert(cx + Math.cos(a0) * radius, y, cz + Math.sin(a0) * radius, 0, -1, 0,
        cx + Math.cos(a0) * radius, cz + Math.sin(a0) * radius, r, g, b);
      const v1 = buf.vert(cx + Math.cos(a1) * radius, y, cz + Math.sin(a1) * radius, 0, -1, 0,
        cx + Math.cos(a1) * radius, cz + Math.sin(a1) * radius, r, g, b);
      buf.tri(bot, v0, v1);
    }
  }
}

/**
 * Horizontal cylinder from `a` to `b`; pipes, rebar, poles, cables.
 *
 * `caps` closes the ends, and it matters far more than it sounds. A cable or a
 * length of conduit is seen from the side and its ends are buried in something,
 * so the side wall is the whole of it — which is why this had no caps at all. But
 * a short, wide tube is a *disc* seen end-on, and with no cap there is nothing
 * there: the near face is missing and the far face is back-facing and culled, so
 * the object is invisible from exactly the direction it has the most area. The
 * bus wheels were built this way and could not be seen from the side of the bus,
 * which was diagnosed twice as a lighting problem and once as a tint problem.
 */
export function addTube(
  buf: GeoBuf,
  a: THREE.Vector3, b: THREE.Vector3,
  radius: number,
  segments = 6,
  color: RGB = WHITE,
  caps = false,
): void {
  _v.copy(b).sub(a);
  const len = _v.length();
  if (len < 1e-5) return;
  _v.multiplyScalar(1 / len);
  // Any perpendicular will do; pick the one furthest from the axis.
  _n.set(0, 1, 0);
  if (Math.abs(_v.y) > 0.9) _n.set(1, 0, 0);
  const t1 = new THREE.Vector3().crossVectors(_v, _n).normalize();
  const t2 = new THREE.Vector3().crossVectors(_v, t1).normalize();
  const circ = Math.PI * 2 * radius;
  const [r, g, bl] = color;

  for (let i = 0; i < segments; i++) {
    const a0 = (i / segments) * Math.PI * 2;
    const a1 = ((i + 1) / segments) * Math.PI * 2;
    const c0 = Math.cos(a0);
    const s0 = Math.sin(a0);
    const c1 = Math.cos(a1);
    const s1 = Math.sin(a1);
    const n0x = t1.x * c0 + t2.x * s0;
    const n0y = t1.y * c0 + t2.y * s0;
    const n0z = t1.z * c0 + t2.z * s0;
    const n1x = t1.x * c1 + t2.x * s1;
    const n1y = t1.y * c1 + t2.y * s1;
    const n1z = t1.z * c1 + t2.z * s1;
    const u0 = (i / segments) * circ;
    const u1 = ((i + 1) / segments) * circ;
    const p = buf.vert(a.x + n0x * radius, a.y + n0y * radius, a.z + n0z * radius,
      n0x, n0y, n0z, u0, 0, r, g, bl);
    buf.vert(a.x + n1x * radius, a.y + n1y * radius, a.z + n1z * radius, n1x, n1y, n1z, u1, 0, r, g, bl);
    buf.vert(b.x + n1x * radius, b.y + n1y * radius, b.z + n1z * radius, n1x, n1y, n1z, u1, len, r, g, bl);
    buf.vert(b.x + n0x * radius, b.y + n0y * radius, b.z + n0z * radius, n0x, n0y, n0z, u0, len, r, g, bl);
    buf.quad(p, p + 1, p + 2, p + 3);
  }

  if (!caps) return;
  for (const end of [0, 1]) {
    const o = end === 0 ? a : b;
    const sx = end === 0 ? -_v.x : _v.x;
    const sy = end === 0 ? -_v.y : _v.y;
    const sz = end === 0 ? -_v.z : _v.z;
    const hub = buf.vert(o.x, o.y, o.z, sx, sy, sz, 0, 0, r, g, bl);
    for (let i = 0; i < segments; i++) {
      const a0 = (i / segments) * Math.PI * 2;
      const a1 = ((i + 1) / segments) * Math.PI * 2;
      const rim = (ang: number): number => {
        const c = Math.cos(ang);
        const s = Math.sin(ang);
        return buf.vert(
          o.x + (t1.x * c + t2.x * s) * radius,
          o.y + (t1.y * c + t2.y * s) * radius,
          o.z + (t1.z * c + t2.z * s) * radius,
          sx, sy, sz, c * radius, s * radius, r, g, bl,
        );
      };
      const v0 = rim(a0);
      const v1 = rim(a1);
      // `t1 × t2 = _v`, so increasing angle runs clockwise as seen from the `a`
      // end and counter-clockwise from `b`.
      if (end === 0) buf.tri(hub, v1, v0);
      else buf.tri(hub, v0, v1);
    }
  }
}

/**
 * A sagging line between two points, drawn as a thin tube. Power cables and
 * washing lines strung across a street are one of the strongest "this is a
 * real place" cues available, and they cost almost nothing.
 */
export function addCatenary(
  buf: GeoBuf,
  ax: number, ay: number, az: number,
  bx: number, by: number, bz: number,
  sag: number,
  radius: number,
  steps = 8,
  color: RGB = WHITE,
): void {
  const prev = new THREE.Vector3();
  const cur = new THREE.Vector3();
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const droop = Math.sin(t * Math.PI) * sag;
    cur.set(ax + (bx - ax) * t, ay + (by - ay) * t - droop, az + (bz - az) * t);
    if (i > 0) addTube(buf, prev, cur, radius, 4, color);
    prev.copy(cur);
  }
}

/* --------------------------- generic append ----------------------------- */

/**
 * Appends an arbitrary THREE geometry through a matrix. Used for the handful of
 * shapes where a stock generator is genuinely the right tool (torus tyres,
 * lathed pots, sphere fruit). `uvScale` converts the source geometry's 0..1
 * parameterisation into metres so it matches everything authored by hand.
 */
export function appendGeometry(
  buf: GeoBuf,
  geo: THREE.BufferGeometry,
  matrix: THREE.Matrix4,
  color: RGB = WHITE,
  uvScale: readonly [number, number] = [1, 1],
): void {
  const pos = geo.getAttribute('position');
  const nrm = geo.getAttribute('normal');
  const uv = geo.getAttribute('uv');
  const index = geo.getIndex();
  const base = buf.vertexCount;
  _nm.getNormalMatrix(matrix);
  const [r, g, b] = color;

  for (let i = 0; i < pos.count; i++) {
    _v.fromBufferAttribute(pos as THREE.BufferAttribute, i).applyMatrix4(matrix);
    if (nrm) {
      _n.fromBufferAttribute(nrm as THREE.BufferAttribute, i).applyMatrix3(_nm).normalize();
    } else {
      _n.set(0, 1, 0);
    }
    const u = uv ? (uv as THREE.BufferAttribute).getX(i) * uvScale[0] : _v.x;
    const w = uv ? (uv as THREE.BufferAttribute).getY(i) * uvScale[1] : _v.z;
    buf.vert(_v.x, _v.y, _v.z, _n.x, _n.y, _n.z, u, w, r, g, b);
  }

  if (index) {
    for (let i = 0; i < index.count; i++) buf.idx.push(base + index.getX(i));
  } else {
    for (let i = 0; i < pos.count; i++) buf.idx.push(base + i);
  }
}

/* ---------------------------- standalone geo ---------------------------- */

/** Builds a standalone BufferGeometry from a callback that fills a GeoBuf. */
export function makeGeometry(fill: (buf: GeoBuf) => void): THREE.BufferGeometry {
  const buf = new GeoBuf();
  fill(buf);
  return buf.toGeometry();
}

/**
 * Rewrites a geometry so its origin sits at the centre of its footprint and its
 * base at y=0. Instanced props are placed by their contact point, which is the
 * only way to guarantee they are not floating.
 */
export function groundGeometry(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  geo.computeBoundingBox();
  const bb = geo.boundingBox;
  if (!bb) return geo;
  geo.translate(-(bb.min.x + bb.max.x) * 0.5, -bb.min.y, -(bb.min.z + bb.max.z) * 0.5);
  geo.computeBoundingSphere();
  geo.computeBoundingBox();
  return geo;
}
