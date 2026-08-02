/**
 * LEGO brick construction kit.
 *
 * Everything in the film is assembled from these primitives so that models
 * share the same stud grid, the same chamfered plastic look, and the same
 * merge-by-material build step (one draw call per colour instead of one per
 * brick).
 *
 * UNITS -- all builder coordinates are in LEGO units, not world units:
 *   x, z : stud positions   (1 stud  = PITCH world units)
 *   y    : plate heights    (1 plate = PLATE world units, 1 brick = 3 plates)
 * Parts are anchored at their minimum corner, so `brick(0,0,0, 2,4)` fills
 * studs x:0..2, z:0..4 and rises from y:0 to y:3.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ConvexGeometry } from 'three/examples/jsm/geometries/ConvexGeometry.js';
import { COLORS, FINISH } from './palette.js';

export const PITCH = 1.0; // stud-to-stud spacing
export const PLATE = 0.4; // one plate of height
export const BRICK = 3 * PLATE; // one brick = three plates
export const STUD_R = 0.29;
export const STUD_H = 0.19;

const CHAMFER = 0.045;

// ---------------------------------------------------------------------------
// Geometry primitives
// ---------------------------------------------------------------------------

const geoCache = new Map();
function cached(key, make) {
  let g = geoCache.get(key);
  if (!g) {
    g = make();
    geoCache.set(key, g);
  }
  return g;
}

/** Convex hull of a point cloud, flat-shaded. Winding is always correct. */
function convexHull(points) {
  const g = new ConvexGeometry(points.map((p) => new THREE.Vector3(p[0], p[1], p[2])));
  const flat = g.index ? g.toNonIndexed() : g;
  flat.computeVertexNormals();
  if (!flat.attributes.uv) {
    flat.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(flat.attributes.position.count * 2), 2));
  }
  return flat;
}

/**
 * A box with 45-degree chamfered edges, centred on the origin. Built as the
 * convex hull of the six inset face rectangles, which is exactly the beveled
 * cube that moulded ABS reads as.
 */
export function chamferBox(w, h, d, c = CHAMFER) {
  c = Math.min(c, w / 2.5, h / 2.5, d / 2.5);
  const hx = w / 2, hy = h / 2, hz = d / 2;
  const ix = hx - c, iy = hy - c, iz = hz - c;
  const pts = [];
  for (const sy of [-1, 1]) for (const sz of [-1, 1]) { pts.push([hx, sy * iy, sz * iz]); pts.push([-hx, sy * iy, sz * iz]); }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { pts.push([sx * ix, hy, sz * iz]); pts.push([sx * ix, -hy, sz * iz]); }
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) { pts.push([sx * ix, sy * iy, hz]); pts.push([sx * ix, sy * iy, -hz]); }
  return convexHull(pts);
}

/**
 * A chamfered frustum: a box whose top face can differ in size from its
 * bottom face. Used for moulded shapes like a minifigure torso.
 */
export function taperBox(wBottom, wTop, h, dBottom, dTop, c = CHAMFER) {
  const hy = h / 2;
  const iy = hy - c;
  const pts = [];
  const ring = (w, d, y, inset) => {
    const hx = w / 2 - inset;
    const hz = d / 2 - inset;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) pts.push([sx * hx, y, sz * hz]);
  };
  // side walls at full width, top/bottom faces inset by the chamfer
  ring(wBottom, dBottom, -iy, 0);
  ring(wTop, dTop, iy, 0);
  ring(wBottom + (wTop - wBottom) * (c / h), dBottom + (dTop - dBottom) * (c / h), -hy, c);
  ring(wTop - (wTop - wBottom) * (c / h), dTop - (dTop - dBottom) * (c / h), hy, c);
  return convexHull(pts);
}

export function studGeometry(segments = 10) {
  return cached('stud' + segments, () => {
    const g = new THREE.CylinderGeometry(STUD_R, STUD_R * 1.02, STUD_H, segments, 1, false);
    g.translate(0, STUD_H / 2, 0);
    return g;
  });
}

// ---------------------------------------------------------------------------
// Materials
// ---------------------------------------------------------------------------

const matCache = new Map();

/**
 * Shared material lookup. `opts` may set finish, emissive, emissiveIntensity,
 * opacity, transparent, flatShading, side.
 */
export function brickMaterial(color = COLORS.lightBluishGray, opts = {}) {
  const finish = opts.finish || 'plastic';
  const key = [
    color,
    finish,
    opts.emissive ?? 'x',
    opts.emissiveIntensity ?? 1,
    opts.opacity ?? 1,
    opts.transparent ? 1 : 0,
    opts.flatShading ? 1 : 0,
    opts.side ?? 0,
    opts.map?.uuid ?? '',
    opts.depthWrite === false ? 'nd' : '',
    opts.toneMapped === false ? 'nt' : '',
  ].join('|');
  let m = matCache.get(key);
  if (m) return m;

  const base = FINISH[finish] || FINISH.plastic;
  const params = {
    color,
    roughness: base.roughness,
    metalness: base.metalness,
    flatShading: !!opts.flatShading,
  };
  if (base.transparent || opts.transparent || (opts.opacity ?? 1) < 1) {
    params.transparent = true;
    params.opacity = opts.opacity ?? base.opacity ?? 1;
  }
  if (opts.emissive !== undefined) {
    params.emissive = opts.emissive;
    params.emissiveIntensity = opts.emissiveIntensity ?? 1;
  }
  if (opts.map) params.map = opts.map;
  if (opts.side !== undefined) params.side = opts.side;
  if (opts.depthWrite !== undefined) params.depthWrite = opts.depthWrite;
  if (opts.toneMapped !== undefined) params.toneMapped = opts.toneMapped;

  m = new THREE.MeshStandardMaterial(params);
  matCache.set(key, m);
  return m;
}

function materialKey(color, opts) {
  return [
    color,
    opts.finish || 'plastic',
    opts.emissive ?? 'x',
    opts.emissiveIntensity ?? 1,
    opts.opacity ?? 1,
    opts.transparent ? 1 : 0,
    opts.flatShading ? 1 : 0,
    opts.side ?? 0,
    opts.map?.uuid ?? '',
    opts.depthWrite === false ? 'nd' : '',
    opts.toneMapped === false ? 'nt' : '',
  ].join('|');
}

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

const _m = new THREE.Matrix4();
const _v = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();

/**
 * Collects parts in LEGO coordinates, then merges them into a small number of
 * meshes. Supports a transform stack so sub-assemblies can be built at the
 * origin and then placed/rotated.
 */
export class Bricks {
  constructor(opts = {}) {
    this.parts = [];
    this.stack = [new THREE.Matrix4()];
    this.studSegments = opts.studSegments ?? 10;
    this.defaultColor = opts.color ?? COLORS.lightBluishGray;
  }

  get matrix() {
    return this.stack[this.stack.length - 1];
  }

  push() {
    this.stack.push(this.matrix.clone());
    return this;
  }
  pop() {
    if (this.stack.length > 1) this.stack.pop();
    return this;
  }
  /** Translate in LEGO units (studs on x/z, plates on y). */
  translate(x = 0, y = 0, z = 0) {
    this.matrix.multiply(_m.makeTranslation(x * PITCH, y * PLATE, z * PITCH));
    return this;
  }
  /** Translate in raw world units. */
  translateWorld(x = 0, y = 0, z = 0) {
    this.matrix.multiply(_m.makeTranslation(x, y, z));
    return this;
  }
  rotateX(a) {
    this.matrix.multiply(_m.makeRotationX(a));
    return this;
  }
  rotateY(a) {
    this.matrix.multiply(_m.makeRotationY(a));
    return this;
  }
  rotateZ(a) {
    this.matrix.multiply(_m.makeRotationZ(a));
    return this;
  }
  scale(x, y = x, z = x) {
    this.matrix.multiply(_m.makeScale(x, y, z));
    return this;
  }
  /** Mirror across the YZ plane; useful for symmetric builds. */
  mirrorX() {
    this.matrix.multiply(_m.makeScale(-1, 1, 1));
    return this;
  }

  /** Low-level: add a geometry with a local offset/orientation, in world units. */
  addGeometry(geo, { x = 0, y = 0, z = 0, rot = null, color, opts = {}, tag = null } = {}) {
    const m = this.matrix.clone();
    m.multiply(_m.makeTranslation(x, y, z));
    if (rot) {
      _q.setFromEuler(new THREE.Euler(rot[0] || 0, rot[1] || 0, rot[2] || 0));
      m.multiply(_m.makeRotationFromQuaternion(_q));
    }
    this.parts.push({
      geo,
      matrix: m,
      color: color ?? this.defaultColor,
      opts,
      tag,
    });
    return this;
  }

  // -- boxy elements ------------------------------------------------------

  /**
   * Generic box element.
   * @param {number} x stud x of min corner
   * @param {number} y plate y of bottom
   * @param {number} z stud z of min corner
   * @param {number} w width in studs
   * @param {number} d depth in studs
   * @param {number} h height in plates
   */
  box(x, y, z, w, d, h, color, opts = {}) {
    const studs = opts.studs ?? true;
    const W = w * PITCH;
    const D = d * PITCH;
    const H = h * PLATE;
    const inset = opts.inset ?? 0.012;
    const geo = cached(`box:${W.toFixed(3)}:${H.toFixed(3)}:${D.toFixed(3)}:${inset}`, () =>
      chamferBox(W - inset * 2, H - inset * 2, D - inset * 2)
    );
    const cx = (x + w / 2) * PITCH;
    const cy = (y + h / 2) * PLATE;
    const cz = (z + d / 2) * PITCH;
    this.addGeometry(geo, { x: cx, y: cy, z: cz, color, opts, tag: opts.tag });

    if (studs) {
      const sg = studGeometry(opts.studSegments ?? this.studSegments);
      for (let i = 0; i < Math.round(w); i++) {
        for (let j = 0; j < Math.round(d); j++) {
          this.addGeometry(sg, {
            x: (x + i + 0.5) * PITCH,
            y: (y + h) * PLATE - 0.005,
            z: (z + j + 0.5) * PITCH,
            color,
            opts,
          });
        }
      }
    }
    return this;
  }

  brick(x, y, z, w, d, color, opts = {}) {
    return this.box(x, y, z, w, d, 3, color, opts);
  }
  plate(x, y, z, w, d, color, opts = {}) {
    return this.box(x, y, z, w, d, 1, color, opts);
  }
  tile(x, y, z, w, d, color, opts = {}) {
    return this.box(x, y, z, w, d, 1, color, { ...opts, studs: false });
  }
  /** A brick-height element with no studs (useful for hull panels). */
  panel(x, y, z, w, d, h, color, opts = {}) {
    return this.box(x, y, z, w, d, h, color, { ...opts, studs: false });
  }

  /**
   * Sloped brick. `dir` picks the direction the slope faces:
   * '+x' | '-x' | '+z' | '-z'. `h` in plates, `run` in studs (default 1).
   */
  slope(x, y, z, w, d, h, color, opts = {}) {
    const dir = opts.dir || '+x';
    const W = w * PITCH;
    const D = d * PITCH;
    const H = h * PLATE;
    const inverted = !!opts.inverted;
    const key = `slope:${W.toFixed(3)}:${H.toFixed(3)}:${D.toFixed(3)}:${dir}:${inverted}`;
    const geo = cached(key, () => makeSlopeGeometry(W, H, D, dir, inverted));
    this.addGeometry(geo, {
      x: (x + w / 2) * PITCH,
      y: (y + h / 2) * PLATE,
      z: (z + d / 2) * PITCH,
      color,
      opts,
      tag: opts.tag,
    });
    if (opts.studs) {
      const sg = studGeometry(opts.studSegments ?? this.studSegments);
      // studs only on the flat top strip (1 stud wide at the high edge)
      const along = dir === '+x' || dir === '-x';
      const n = along ? Math.round(d) : Math.round(w);
      for (let i = 0; i < n; i++) {
        const sx = along ? (dir === '+x' ? x + 0.5 : x + w - 0.5) : x + i + 0.5;
        const sz = along ? z + i + 0.5 : dir === '+z' ? z + 0.5 : z + d - 0.5;
        this.addGeometry(sg, { x: sx * PITCH, y: (y + h) * PLATE - 0.005, z: sz * PITCH, color, opts });
      }
    }
    return this;
  }

  /** Right-triangular plate/wedge, hypotenuse from +x edge to +z edge. */
  wedge(x, y, z, w, d, h, color, opts = {}) {
    const rot = opts.rot ?? 0; // 0..3 quarter turns
    const key = `wedge:${w}:${d}:${h}:${rot}`;
    const geo = cached(key, () => makeWedgeGeometry(w * PITCH, h * PLATE, d * PITCH, rot));
    this.addGeometry(geo, {
      x: (x + w / 2) * PITCH,
      y: (y + h / 2) * PLATE,
      z: (z + d / 2) * PITCH,
      color,
      opts,
      tag: opts.tag,
    });
    return this;
  }

  // -- round elements -----------------------------------------------------

  /** Cylinder standing on Y. `r` in studs, `h` in plates. Centre-anchored in x/z. */
  cyl(x, y, z, r, h, color, opts = {}) {
    const seg = opts.segments ?? 14;
    const R = r * PITCH;
    const H = h * PLATE;
    const rt = (opts.rTop ?? r) * PITCH;
    const geo = cached(`cyl:${R.toFixed(3)}:${rt.toFixed(3)}:${H.toFixed(3)}:${seg}:${opts.open ? 1 : 0}`, () => {
      const g = new THREE.CylinderGeometry(rt, R, H, seg, 1, !!opts.open);
      return g;
    });
    this.addGeometry(geo, { x: x * PITCH, y: y * PLATE + H / 2, z: z * PITCH, color, opts, rot: opts.rot, tag: opts.tag });
    if (opts.stud) {
      this.addGeometry(studGeometry(this.studSegments), {
        x: x * PITCH,
        y: y * PLATE + H - 0.005,
        z: z * PITCH,
        color,
        opts,
      });
    }
    return this;
  }

  /** Horizontal bar/rod between two world-space points. */
  bar(from, to, r, color, opts = {}) {
    const a = new THREE.Vector3(...from);
    const b = new THREE.Vector3(...to);
    const dir = b.clone().sub(a);
    const len = dir.length();
    if (len < 1e-6) return this;
    const seg = opts.segments ?? 8;
    const geo = cached(`bar:${r.toFixed(3)}:${len.toFixed(3)}:${seg}`, () => {
      const g = new THREE.CylinderGeometry(r, r, len, seg, 1);
      return g;
    });
    const mid = a.clone().add(b).multiplyScalar(0.5);
    const m = this.matrix.clone();
    m.multiply(_m.makeTranslation(mid.x, mid.y, mid.z));
    const up = new THREE.Vector3(0, 1, 0);
    _q.setFromUnitVectors(up, dir.normalize());
    m.multiply(_m.makeRotationFromQuaternion(_q));
    this.parts.push({ geo, matrix: m, color: color ?? this.defaultColor, opts, tag: opts.tag });
    return this;
  }

  cone(x, y, z, rBottom, rTop, h, color, opts = {}) {
    const seg = opts.segments ?? 14;
    const geo = cached(`cone:${rBottom}:${rTop}:${h}:${seg}`, () =>
      new THREE.CylinderGeometry(rTop * PITCH, rBottom * PITCH, h * PLATE, seg, 1)
    );
    this.addGeometry(geo, { x: x * PITCH, y: y * PLATE + (h * PLATE) / 2, z: z * PITCH, color, opts, tag: opts.tag });
    return this;
  }

  sphere(x, y, z, r, color, opts = {}) {
    const seg = opts.segments ?? 16;
    const geo = cached(`sph:${r}:${seg}:${opts.phi ?? 0}:${opts.phiLen ?? 0}`, () =>
      new THREE.SphereGeometry(
        r * PITCH,
        seg,
        Math.max(6, seg / 2),
        0,
        Math.PI * 2,
        opts.phi ?? 0,
        opts.phiLen ?? Math.PI
      )
    );
    this.addGeometry(geo, { x: x * PITCH, y: y * PLATE, z: z * PITCH, color, opts, rot: opts.rot, tag: opts.tag });
    return this;
  }

  /** LEGO dish / radar dish, opening upwards by default. */
  dish(x, y, z, r, depth, color, opts = {}) {
    const seg = opts.segments ?? 18;
    const geo = cached(`dish:${r}:${depth}:${seg}`, () => {
      const pts = [];
      const N = 8;
      for (let i = 0; i <= N; i++) {
        const u = i / N;
        pts.push(new THREE.Vector2(u * r * PITCH, Math.pow(u, 2) * depth * PLATE));
      }
      const g = new THREE.LatheGeometry(pts, seg);
      g.computeVertexNormals();
      return g;
    });
    this.addGeometry(geo, { x: x * PITCH, y: y * PLATE, z: z * PITCH, color, opts: { ...opts, side: THREE.DoubleSide }, rot: opts.rot, tag: opts.tag });
    return this;
  }

  torus(x, y, z, r, tube, color, opts = {}) {
    const geo = cached(`tor:${r}:${tube}:${opts.seg ?? 16}`, () =>
      new THREE.TorusGeometry(r * PITCH, tube * PITCH, 8, opts.seg ?? 16)
    );
    this.addGeometry(geo, { x: x * PITCH, y: y * PLATE, z: z * PITCH, color, opts, rot: opts.rot ?? [Math.PI / 2, 0, 0], tag: opts.tag });
    return this;
  }

  /** Rubber tyre plus hub, axle along X. */
  wheel(x, y, z, r, width, color = COLORS.trueBlack, hubColor = COLORS.lightBluishGray, opts = {}) {
    const seg = opts.segments ?? 16;
    const tyre = cached(`tyre:${r}:${width}:${seg}`, () => {
      const g = new THREE.CylinderGeometry(r * PITCH, r * PITCH, width * PITCH, seg, 1);
      g.rotateZ(Math.PI / 2);
      return g;
    });
    const hub = cached(`hub:${r}:${width}:${seg}`, () => {
      const g = new THREE.CylinderGeometry(r * 0.55 * PITCH, r * 0.55 * PITCH, width * 1.05 * PITCH, seg, 1);
      g.rotateZ(Math.PI / 2);
      return g;
    });
    this.addGeometry(tyre, { x: x * PITCH, y: y * PLATE, z: z * PITCH, color, opts: { ...opts, finish: 'rubber' } });
    this.addGeometry(hub, { x: x * PITCH, y: y * PLATE, z: z * PITCH, color: hubColor, opts });
    return this;
  }

  /** Merge another builder's parts into this one, under the current transform. */
  merge(other) {
    const base = this.matrix;
    for (const p of other.parts) {
      this.parts.push({ ...p, matrix: base.clone().multiply(p.matrix) });
    }
    return this;
  }

  /** Number of parts recorded so far. */
  get count() {
    return this.parts.length;
  }

  /**
   * Merge everything into one mesh per material and return a Group.
   * The group carries `userData.parts` describing every element (world-space
   * centre, size, colour) so effects can blow the model apart into bricks.
   */
  build(opts = {}) {
    const group = new THREE.Group();
    const byMat = new Map();
    for (const p of this.parts) {
      const key = materialKey(p.color, p.opts);
      let bucket = byMat.get(key);
      if (!bucket) {
        bucket = { color: p.color, opts: p.opts, geos: [] };
        byMat.set(key, bucket);
      }
      const g = p.geo.clone();
      g.applyMatrix4(p.matrix);
      // Drop attributes that differ between primitives so merging never fails.
      for (const name of Object.keys(g.attributes)) {
        if (name !== 'position' && name !== 'normal' && name !== 'uv') g.deleteAttribute(name);
      }
      if (!g.attributes.uv) {
        const n = g.attributes.position.count;
        g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(n * 2), 2));
      }
      bucket.geos.push(g.index ? g.toNonIndexed() : g);
    }
    for (const bucket of byMat.values()) {
      const merged = bucket.geos.length === 1 ? bucket.geos[0] : mergeGeometries(bucket.geos, false);
      if (!merged) continue;
      merged.computeBoundingSphere();
      const mesh = new THREE.Mesh(merged, brickMaterial(bucket.color, bucket.opts));
      mesh.castShadow = opts.castShadow ?? true;
      mesh.receiveShadow = opts.receiveShadow ?? true;
      if (bucket.opts.transparent || (bucket.opts.opacity ?? 1) < 1 || bucket.opts.finish === 'trans') {
        mesh.castShadow = false;
      }
      group.add(mesh);
    }
    group.userData.parts = this.parts.map((p) => {
      p.matrix.decompose(_v, _q, _s);
      p.geo.computeBoundingBox?.();
      const bb = p.geo.boundingBox;
      const size = bb
        ? new THREE.Vector3(bb.max.x - bb.min.x, bb.max.y - bb.min.y, bb.max.z - bb.min.z).multiply(_s)
        : new THREE.Vector3(PITCH, PLATE, PITCH);
      return {
        position: _v.clone(),
        quaternion: _q.clone(),
        size,
        color: p.color,
        tag: p.tag,
      };
    });
    group.userData.triangles = [...byMat.values()].reduce(
      (n, b) => n + b.geos.reduce((k, g) => k + g.attributes.position.count / 3, 0),
      0
    );
    return group;
  }
}

// ---------------------------------------------------------------------------
// Slope / wedge geometry helpers
// ---------------------------------------------------------------------------

function makeSlopeGeometry(W, H, D, dir, inverted) {
  const hx = W / 2, hy = H / 2, hz = D / 2;
  // Base profile descends toward +x: full height at -x, zero height at +x.
  const pts = [];
  if (!inverted) {
    for (const sz of [-1, 1]) {
      pts.push([-hx, -hy, sz * hz]);
      pts.push([hx, -hy, sz * hz]);
      pts.push([-hx, hy, sz * hz]);
    }
  } else {
    // Underside ramp: flat on top, rising from the bottom at +x.
    for (const sz of [-1, 1]) {
      pts.push([-hx, hy, sz * hz]);
      pts.push([hx, hy, sz * hz]);
      pts.push([-hx, -hy, sz * hz]);
    }
  }
  const g = convexHull(pts);
  if (dir === '-x') g.rotateY(Math.PI);
  else if (dir === '+z') g.rotateY(-Math.PI / 2);
  else if (dir === '-z') g.rotateY(Math.PI / 2);
  g.computeVertexNormals();
  return g;
}

function makeWedgeGeometry(W, H, D, rot) {
  const hx = W / 2, hy = H / 2, hz = D / 2;
  // Right-triangular footprint: (-x,-z), (+x,-z), (-x,+z)
  const pts = [];
  for (const sy of [-1, 1]) {
    pts.push([-hx, sy * hy, -hz]);
    pts.push([hx, sy * hy, -hz]);
    pts.push([-hx, sy * hy, hz]);
  }
  const g = convexHull(pts);
  if (rot) g.rotateY((-Math.PI / 2) * rot);
  g.computeVertexNormals();
  return g;
}

// ---------------------------------------------------------------------------
// Convenience
// ---------------------------------------------------------------------------

/** Build a studded ground plate of `w` x `d` studs. */
export function groundPlate(w, d, color = COLORS.darkBluishGray, opts = {}) {
  const b = new Bricks({ studSegments: 6 });
  const step = opts.step ?? 8;
  for (let x = 0; x < w; x += step) {
    for (let z = 0; z < d; z += step) {
      b.plate(x - w / 2, -1, z - d / 2, Math.min(step, w - x), Math.min(step, d - z), color, {
        studs: opts.studs ?? true,
      });
    }
  }
  return b.build({ castShadow: false });
}

/** Quick single-mesh brick, for one-off props. */
export function singleBrick(w, d, h, color, opts = {}) {
  const b = new Bricks();
  b.box(0, 0, 0, w, d, h, color, opts);
  return b.build();
}
