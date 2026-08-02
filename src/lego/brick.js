import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {
  STUD, PLATE, BRICK, STUD_R, STUD_H, SEAM, BEVEL, P, B,
  boxGeo, studGeo, cylGeo, coneGeo, sphereGeo, domeGeo, prismGeo, slopeGeo,
  slopeInvGeo, wedgeGeo, curveSlopeGeo, barGeo, flatten,
} from './parts.js';
import { C, FINISH, defaultFinish } from './palette.js';
import { mat } from './materials.js';

export { STUD, PLATE, BRICK, P, B };

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _v = new THREE.Vector3();
const _c = new THREE.Color();

/**
 * Collects part placements, then bakes them into as few draw calls as possible.
 *
 * Coordinates: x/z are the CENTRE of the footprint, y is the BOTTOM of the part,
 * all in stud units (1 unit = 8 mm). Rotation `rot` is yaw in radians.
 *
 * Solid parts get baked into a single vertex-coloured mesh, so an entire Star
 * Destroyer is one draw call. Transparent / glowing / metallic parts get their
 * own merged mesh per colour.
 */
export class BrickBuilder {
  constructor(opts = {}) {
    this.opts = {
      studs: true,        // emit studs at all
      bevel: true,        // chamfered edges (off = cheaper, flatter look)
      cullStuds: true,    // hide studs covered by another part
      seams: true,        // shrink parts slightly so seams are visible
      vertexColors: true, // bake solid colours into one mesh
      studSeg: 10,
      ...opts,
    };
    this.specs = [];
    this.occ = new Set();
    this.nodes = {};
    this._bevel = this.opts.bevel ? BEVEL : 0;
  }

  get seam() { return this.opts.seams ? SEAM : 0; }

  // ---------------------------------------------------------------- helpers

  _key(ix, iy, iz) { return `${ix}|${iy}|${iz}`; }

  _occupy(x, y, z, w, d, h) {
    const layers = Math.max(1, Math.round(h / PLATE));
    const x0 = x - w / 2, z0 = z - d / 2;
    const iy0 = Math.round(y / PLATE);
    for (let i = 0; i < w; i++) {
      const ix = Math.round(x0 + i + 0.5 - 0.5);
      for (let k = 0; k < d; k++) {
        const iz = Math.round(z0 + k + 0.5 - 0.5);
        for (let j = 0; j < layers; j++) this.occ.add(this._key(ix, iy0 + j, iz));
      }
    }
  }

  _covered(sx, sy, sz) {
    return this.occ.has(this._key(Math.round(sx - 0.5), Math.round(sy / PLATE), Math.round(sz - 0.5)));
  }

  _push(geom, matrix, color, finish, opts) {
    this.specs.push({ geom, matrix: matrix.clone(), color, finish: finish || defaultFinish(color), opts: opts || null });
  }

  /** Expose a named empty at a position -- engine nozzles, gun muzzles, seats. */
  node(name, x, y, z, rot = 0) {
    const o = new THREE.Object3D();
    o.position.set(x, y, z);
    o.rotation.y = rot;
    o.name = name;
    this.nodes[name] = o;
    return o;
  }

  // ------------------------------------------------------------ part makers

  /**
   * @param {number} x centre X (studs)
   * @param {number} y bottom Y
   * @param {number} z centre Z
   * @param {number} w width in studs
   * @param {number} d depth in studs
   * @param {object} o { h, color, rot, studs, finish, tile }
   */
  brick(x, y, z, w, d, o = {}) {
    const h = o.h ?? BRICK;
    const color = o.color ?? C.lightBluishGray;
    const rot = o.rot ?? 0;
    const swap = Math.abs(Math.sin(rot)) > 0.5;
    const ww = swap ? d : w, dd = swap ? w : d;
    const s = this.seam;
    const g = boxGeo(w - s, h - s * 0.5, d - s, o.bevel ?? this._bevel);
    _m.compose(_v.set(x, y + h / 2, z), _q.setFromEuler(_e.set(0, rot, 0)), new THREE.Vector3(1, 1, 1));
    this._push(g, _m, color, o.finish, o.matOpts);

    if (!o.free) this._occupy(x, y, z, ww, dd, h);

    const wantStuds = (o.studs ?? true) && this.opts.studs && !o.tile;
    if (wantStuds) {
      this.specs.push({
        studBatch: true, x, y: y + h, z, w: ww, d: dd, color: o.studColor ?? color,
        finish: o.finish, opts: o.matOpts,
      });
    }
    return this;
  }

  plate(x, y, z, w, d, o = {}) { return this.brick(x, y, z, w, d, { ...o, h: o.h ?? PLATE }); }

  tile(x, y, z, w, d, o = {}) { return this.brick(x, y, z, w, d, { ...o, h: o.h ?? PLATE, tile: true }); }

  /** Slope brick. `rot` points the high edge: 0 = high at +X. */
  slope(x, y, z, w, d, o = {}) {
    const h = o.h ?? BRICK;
    const g = (o.inverted ? slopeInvGeo : slopeGeo)(w - this.seam, h - this.seam * 0.5, d - this.seam, this._bevel * 0.7);
    _m.compose(_v.set(x, y, z), _q.setFromEuler(_e.set(0, o.rot ?? 0, 0)), new THREE.Vector3(1, 1, 1));
    this._push(g, _m, o.color ?? C.lightBluishGray, o.finish, o.matOpts);
    if (!o.free) this._occupy(x, y, z, w, d, h);
    return this;
  }

  /** Curved windscreen / nose cone slope. */
  curveSlope(x, y, z, w, d, o = {}) {
    const h = o.h ?? BRICK;
    const g = curveSlopeGeo(w - this.seam, h, d - this.seam, o.segments ?? 5);
    _m.compose(_v.set(x, y, z), _q.setFromEuler(_e.set(0, o.rot ?? 0, 0)), new THREE.Vector3(1, 1, 1));
    this._push(g, _m, o.color ?? C.lightBluishGray, o.finish, o.matOpts);
    return this;
  }

  /** Triangular wedge plate (wings). */
  wedge(x, y, z, w, d, o = {}) {
    const h = o.h ?? PLATE;
    const g = wedgeGeo(w - this.seam, d - this.seam, h, !!o.mirror);
    _m.compose(_v.set(x, y + h / 2, z), _q.setFromEuler(_e.set(0, o.rot ?? 0, 0)), new THREE.Vector3(1, 1, 1));
    this._push(g, _m, o.color ?? C.lightBluishGray, o.finish, o.matOpts);
    return this;
  }

  /** Free-form extruded profile (hull plating, greebles, odd panels). */
  prism(pts, depth, o = {}) {
    const g = prismGeo(pts, depth, o.bevel ?? this._bevel * 0.7);
    _m.compose(
      _v.set(o.x ?? 0, o.y ?? 0, o.z ?? 0),
      _q.setFromEuler(_e.set(o.rx ?? 0, o.ry ?? 0, o.rz ?? 0)),
      new THREE.Vector3(o.sx ?? 1, o.sy ?? 1, o.sz ?? 1),
    );
    this._push(g, _m, o.color ?? C.lightBluishGray, o.finish, o.matOpts);
    return this;
  }

  /** Round brick / cylinder. axis: 'y' (default), 'x', 'z'. */
  cyl(x, y, z, r, h, o = {}) {
    const g = cylGeo(o.rTop ?? r, o.rBottom ?? r, h, o.seg ?? 14, !!o.open);
    const rx = o.axis === 'z' ? Math.PI / 2 : 0;
    const rz = o.axis === 'x' ? Math.PI / 2 : 0;
    const yOff = o.axis ? 0 : h / 2;
    _m.compose(
      _v.set(x, y + yOff, z),
      _q.setFromEuler(_e.set(rx + (o.rx ?? 0), o.ry ?? 0, rz + (o.rz ?? 0))),
      new THREE.Vector3(1, 1, 1),
    );
    this._push(g, _m, o.color ?? C.lightBluishGray, o.finish, o.matOpts);
    if (o.stud !== false && this.opts.studs && !o.axis && !o.tile) {
      this.specs.push({ studBatch: true, x, y: y + h, z, w: 1, d: 1, color: o.color ?? C.lightBluishGray, finish: o.finish, opts: o.matOpts, r: Math.min(STUD_R, r * 0.62) });
    }
    return this;
  }

  cone(x, y, z, r, h, o = {}) {
    const g = coneGeo(r, h, o.seg ?? 14);
    _m.compose(
      _v.set(x, y + h / 2, z),
      _q.setFromEuler(_e.set(o.rx ?? 0, o.ry ?? 0, o.rz ?? 0)),
      new THREE.Vector3(1, 1, 1),
    );
    this._push(g, _m, o.color ?? C.lightBluishGray, o.finish, o.matOpts);
    return this;
  }

  sphere(x, y, z, r, o = {}) {
    const g = o.dome ? domeGeo(r, o.seg ?? 16, o.rings ?? 8) : sphereGeo(r, o.seg ?? 16, o.rings ?? 12);
    _m.compose(
      _v.set(x, y, z),
      _q.setFromEuler(_e.set(o.rx ?? 0, o.ry ?? 0, o.rz ?? 0)),
      new THREE.Vector3(o.sx ?? 1, o.sy ?? 1, o.sz ?? 1),
    );
    this._push(g, _m, o.color ?? C.lightBluishGray, o.finish, o.matOpts);
    return this;
  }

  bar(x, y, z, r, len, o = {}) {
    const g = barGeo(r, len, o.seg ?? 8);
    _m.compose(
      _v.set(x, y, z),
      _q.setFromEuler(_e.set(o.rx ?? 0, o.ry ?? 0, o.rz ?? 0)),
      new THREE.Vector3(1, 1, 1),
    );
    this._push(g, _m, o.color ?? C.flatSilver, o.finish, o.matOpts);
    return this;
  }

  /** Drop in any geometry you like and let it ride along in the merge. */
  custom(geom, o = {}) {
    _m.compose(
      _v.set(o.x ?? 0, o.y ?? 0, o.z ?? 0),
      _q.setFromEuler(_e.set(o.rx ?? 0, o.ry ?? 0, o.rz ?? 0)),
      new THREE.Vector3(o.sx ?? 1, o.sy ?? 1, o.sz ?? 1),
    );
    if (o.matrix) _m.copy(o.matrix);
    this._push(flatten(geom), _m, o.color ?? C.lightBluishGray, o.finish, o.matOpts);
    return this;
  }

  /** Mirror everything added inside fn across X (build one wing, get two). */
  mirrorX(fn) {
    const start = this.specs.length;
    fn(this);
    const added = this.specs.slice(start);
    const flip = new THREE.Matrix4().makeScale(-1, 1, 1);
    for (const s of added) {
      if (s.studBatch) {
        this.specs.push({ ...s, x: -s.x });
      } else {
        this.specs.push({ ...s, matrix: flip.clone().multiply(s.matrix), flipped: !s.flipped });
      }
    }
    return this;
  }

  // ----------------------------------------------------------------- bake

  build(opts = {}) {
    const group = new THREE.Group();
    const solid = [];               // vertex-coloured bucket
    const buckets = new Map();      // finish/colour -> geometry list

    const addToBucket = (geom, matrix, color, finish, matOpts, flipped) => {
      const g = geom.clone().applyMatrix4(matrix);
      if (flipped) flipNormals(g);
      const useVC = this.opts.vertexColors && (finish === FINISH.SOLID) && !matOpts;
      if (useVC) {
        applyVertexColor(g, color);
        solid.push(g);
      } else {
        const k = `${finish}|${color}|${matOpts ? JSON.stringify(matOpts) : ''}`;
        if (!buckets.has(k)) buckets.set(k, { color, finish, matOpts, list: [] });
        buckets.get(k).list.push(g);
      }
    };

    for (const s of this.specs) {
      if (s.studBatch) {
        if (!this.opts.studs) continue;
        const sg = studGeo(s.r ?? STUD_R, STUD_H, this.opts.studSeg);
        const x0 = s.x - s.w / 2, z0 = s.z - s.d / 2;
        for (let i = 0; i < Math.max(1, Math.round(s.w)); i++) {
          for (let k = 0; k < Math.max(1, Math.round(s.d)); k++) {
            const sx = x0 + i + 0.5, sz = z0 + k + 0.5;
            if (this.opts.cullStuds && this._covered(sx, s.y, sz)) continue;
            _m.makeTranslation(sx, s.y - this.seam * 0.5, sz);
            addToBucket(sg, _m, s.color, s.finish || defaultFinish(s.color), s.opts, false);
          }
        }
      } else {
        addToBucket(s.geom, s.matrix, s.color, s.finish, s.opts, s.flipped);
      }
    }

    if (solid.length) {
      const merged = mergeGeometries(solid, false);
      if (merged) {
        merged.computeBoundingSphere();
        const m = mat(0xffffff, FINISH.SOLID);
        const vcMat = m.clone();
        vcMat.vertexColors = true;
        vcMat.color = new THREE.Color(1, 1, 1);
        const mesh = new THREE.Mesh(merged, vcMat);
        mesh.castShadow = opts.castShadow ?? true;
        mesh.receiveShadow = opts.receiveShadow ?? true;
        mesh.name = 'abs_solid';
        group.add(mesh);
      }
      for (const g of solid) g.dispose();
    }

    for (const [, b] of buckets) {
      const merged = mergeGeometries(b.list, false);
      if (!merged) continue;
      merged.computeBoundingSphere();
      const material = mat(b.color, b.finish, b.matOpts || {});
      const mesh = new THREE.Mesh(merged, material);
      const isGlow = b.finish === FINISH.GLOW || b.finish === FINISH.TRANS;
      mesh.castShadow = !isGlow && (opts.castShadow ?? true);
      mesh.receiveShadow = !isGlow && (opts.receiveShadow ?? true);
      mesh.renderOrder = isGlow ? 2 : 0;
      mesh.name = `abs_${b.finish}_${b.color.toString(16)}`;
      group.add(mesh);
      for (const g of b.list) g.dispose();
    }

    for (const [name, o] of Object.entries(this.nodes)) group.add(o);
    group.userData.nodes = this.nodes;
    this.specs.length = 0;
    return group;
  }
}

function applyVertexColor(geom, color) {
  const n = geom.attributes.position.count;
  _c.setHex(color).convertSRGBToLinear();
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { arr[i * 3] = _c.r; arr[i * 3 + 1] = _c.g; arr[i * 3 + 2] = _c.b; }
  geom.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return geom;
}

function flipNormals(geom) {
  const pos = geom.attributes.position;
  const nor = geom.attributes.normal;
  const uv = geom.attributes.uv;
  for (let i = 0; i < pos.count; i += 3) {
    for (const a of [pos, nor, uv]) {
      if (!a) continue;
      const it = a.itemSize;
      for (let c = 0; c < it; c++) {
        const t = a.array[i * it + c];
        a.array[i * it + c] = a.array[(i + 2) * it + c];
        a.array[(i + 2) * it + c] = t;
      }
    }
  }
  if (nor) for (let i = 0; i < nor.array.length; i++) nor.array[i] *= -1;
  pos.needsUpdate = true;
  if (nor) nor.needsUpdate = true;
  return geom;
}

/** Convenience: build a model in one call. */
export function buildModel(fn, opts = {}) {
  const bb = new BrickBuilder(opts);
  fn(bb);
  return bb.build(opts);
}
