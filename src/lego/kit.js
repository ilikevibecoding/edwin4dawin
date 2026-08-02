import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { getMaterial, FINISH } from '../core/materials.js';

/*
 * Kit — the LEGO parts bin.
 *
 * Everything in this film is built out of studded bricks placed on a stud grid.
 * A Kit collects part placements and, on build(), batches them into one
 * InstancedMesh per (geometry, material) pair. A 12,000 brick Star Destroyer
 * therefore costs a few dozen draw calls rather than 12,000.
 *
 * Coordinates are in stud units:
 *   1.0  = one stud pitch (8mm on a real brick)
 *   0.4  = one plate of height (3.2mm)
 *   1.2  = one brick of height (three plates)
 *
 * Placement is CENTRE-of-footprint, BOTTOM-of-part. kit.brick(0, 0, 0, 4, 2)
 * puts a 4x2 brick centred on the origin sitting on the ground plane. Builds are
 * usually symmetric about x = 0, which makes centre placement the convenient
 * choice; use kit.sym() to mirror a sub-assembly across that axis.
 */

export const STUD = 1.0;
export const PLATE = 0.4;
export const BRICK = 1.2;
export const STUD_R = 0.3;
export const STUD_H = 0.22;
export const GAP = 0.03;      // seam between neighbouring parts
export const BEVEL = 0.045;   // edge break; the thing that makes ABS read as ABS

const geoCache = new Map();
function cached(key, make) {
  let g = geoCache.get(key);
  if (!g) { g = make(); g.userData.key = key; geoCache.set(key, g); }
  return g;
}

function studGeometry(segments = 12) {
  return cached(`stud${segments}`, () => {
    const g = new THREE.CylinderGeometry(STUD_R, STUD_R * 0.98, STUD_H, segments);
    g.translate(0, STUD_H / 2, 0);
    return g;
  });
}

/** Studded (or bare) rectangular part, origin at centre of the bottom face. */
export function boxGeometry(w, d, h, { studs = true, bevel = true, studSeg = 12, tube = false } = {}) {
  const key = `box|${w}|${d}|${h}|${studs}|${bevel}|${studSeg}|${tube}`;
  return cached(key, () => {
    const sw = Math.max(0.02, w - GAP);
    const sd = Math.max(0.02, d - GAP);
    let base = bevel
      ? new RoundedBoxGeometry(sw, h, sd, 1, Math.min(BEVEL, h * 0.35, sw * 0.35, sd * 0.35))
      : new THREE.BoxGeometry(sw, h, sd);
    base.translate(0, h / 2, 0);
    const parts = [base];
    if (studs) {
      const sg = studGeometry(studSeg);
      const nx = Math.max(1, Math.round(w));
      const nz = Math.max(1, Math.round(d));
      for (let i = 0; i < nx; i++) {
        for (let j = 0; j < nz; j++) {
          const s = sg.clone();
          s.translate(-(nx - 1) / 2 + i, h, -(nz - 1) / 2 + j);
          parts.push(s);
        }
      }
    }
    if (tube) {
      // Under-side tube, only visible on parts seen from below.
      const t = new THREE.CylinderGeometry(STUD_R * 1.6, STUD_R * 1.6, h * 0.5, 10, 1, true);
      t.translate(0, h * 0.25, 0);
      parts.push(t);
    }
    // RoundedBoxGeometry is non-indexed while the cylinder primitives are
    // indexed; mergeGeometries needs one or the other, never both.
    const flat = parts.map((p) => (p.index ? p.toNonIndexed() : p));
    const merged = BufferGeometryUtils.mergeGeometries(flat, false);
    merged.computeVertexNormals();
    return merged;
  });
}

/** Prism from a 2D profile in the (z, y) plane, extruded along x. Slopes, wedges. */
export function profileGeometry(profile, width, { bevel = true, key = '' } = {}) {
  const k = `prof|${key || JSON.stringify(profile)}|${width}|${bevel}`;
  return cached(k, () => {
    const shape = new THREE.Shape();
    shape.moveTo(profile[0][0], profile[0][1]);
    for (let i = 1; i < profile.length; i++) shape.lineTo(profile[i][0], profile[i][1]);
    shape.closePath();
    const b = bevel ? Math.min(BEVEL, width * 0.2) : 0;
    const g = new THREE.ExtrudeGeometry(shape, {
      depth: Math.max(0.02, width - GAP) - 2 * b,
      bevelEnabled: bevel, bevelSize: b, bevelThickness: b, bevelSegments: 1, curveSegments: 8,
    });
    g.translate(0, 0, -(Math.max(0.02, width - GAP) - 2 * b) / 2 - b);
    g.rotateY(Math.PI / 2);          // extrusion axis z -> x
    g.computeVertexNormals();
    return g;
  });
}

/** Polygon in the (x, z) plane extruded upward by h. Ship hulls, wings, terrain. */
export function polyGeometry(points, h, { bevel = true, key = '' } = {}) {
  const k = `poly|${key || JSON.stringify(points)}|${h}|${bevel}`;
  return cached(k, () => {
    const shape = new THREE.Shape();
    shape.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) shape.lineTo(points[i][0], points[i][1]);
    shape.closePath();
    const b = bevel ? Math.min(BEVEL, h * 0.25) : 0;
    const g = new THREE.ExtrudeGeometry(shape, {
      depth: Math.max(0.02, h) - 2 * b,
      bevelEnabled: bevel, bevelSize: b, bevelThickness: b, bevelSegments: 1, curveSegments: 8,
    });
    g.rotateX(-Math.PI / 2);         // extrude up (+y) instead of +z
    g.translate(0, b, 0);
    g.computeVertexNormals();
    return g;
  });
}

export function cylGeometry(r, h, seg = 16, r2 = null, open = false) {
  const key = `cyl|${r}|${h}|${seg}|${r2}|${open}`;
  return cached(key, () => {
    const g = new THREE.CylinderGeometry(r2 === null ? r : r2, r, h, seg, 1, open);
    g.translate(0, h / 2, 0);
    return g;
  });
}

export function sphereGeometry(r, seg = 18) {
  return cached(`sph|${r}|${seg}`, () => new THREE.SphereGeometry(r, seg, Math.max(6, seg >> 1)));
}

export function torusGeometry(r, tube, seg = 20, tseg = 10, arc = Math.PI * 2) {
  return cached(`tor|${r}|${tube}|${seg}|${tseg}|${arc}`, () => new THREE.TorusGeometry(r, tube, tseg, seg, arc));
}

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _v = new THREE.Vector3();

export class Kit {
  constructor(name = 'kit') {
    this.name = name;
    this.entries = [];
    this.extras = [];               // pre-made Object3Ds to fold in
    this.points = {};               // named attach points
    this._stack = [];
    this._m = new THREE.Matrix4();
    this.defaultFinish = FINISH.plastic;
  }

  // ---- transform stack -------------------------------------------------
  push() { this._stack.push(this._m.clone()); return this; }
  pop() { this._m = this._stack.pop() || new THREE.Matrix4(); return this; }
  translate(x, y, z) { this._m.multiply(_m.makeTranslation(x, y, z)); return this; }
  rotX(a) { this._m.multiply(_m.makeRotationX(a)); return this; }
  rotY(a) { this._m.multiply(_m.makeRotationY(a)); return this; }
  rotZ(a) { this._m.multiply(_m.makeRotationZ(a)); return this; }
  scale(x, y = x, z = x) { this._m.multiply(_m.makeScale(x, y, z)); return this; }
  matrix(m) { this._m.multiply(m); return this; }

  /** Run fn(+1) then fn(-1) so mirrored halves are written once. */
  sym(fn) { fn(1); fn(-1); return this; }

  /** Record a named point in the current frame; survives on group.userData.points. */
  point(name, x = 0, y = 0, z = 0) {
    this.points[name] = new THREE.Vector3(x, y, z).applyMatrix4(this._m);
    return this;
  }

  // ---- placement -------------------------------------------------------
  _place(geometry, color, opts = {}) {
    const local = new THREE.Matrix4();
    const pos = opts.pos || [0, 0, 0];
    const rot = opts.rot;             // radians about y, or [rx,ry,rz]
    const scl = opts.scl;
    local.makeTranslation(pos[0], pos[1], pos[2]);
    if (rot !== undefined && rot !== null) {
      if (Array.isArray(rot)) _q.setFromEuler(new THREE.Euler(rot[0], rot[1], rot[2], 'YXZ'));
      else _q.setFromEuler(new THREE.Euler(0, rot, 0));
      local.multiply(_m.makeRotationFromQuaternion(_q));
    }
    if (scl !== undefined) {
      if (Array.isArray(scl)) local.multiply(_m.makeScale(scl[0], scl[1], scl[2]));
      else local.multiply(_m.makeScale(scl, scl, scl));
    }
    const world = this._m.clone().multiply(local);
    const finish = opts.finish || this.defaultFinish;
    const material = getMaterial(color, finish, opts);
    this.entries.push({
      geometry, material, matrix: world,
      castShadow: opts.castShadow !== false && finish !== FINISH.glow,
      receiveShadow: opts.receiveShadow !== false,
      renderOrder: opts.renderOrder || 0,
    });
    return this;
  }

  /** Standard brick: w x d studs, one brick tall unless h given. */
  brick(x, y, z, w, d, color, opts = {}) {
    const h = opts.h ?? BRICK;
    return this._place(boxGeometry(w, d, h, opts), color, { ...opts, pos: [x, y, z] });
  }

  /** One plate tall (0.4). */
  plate(x, y, z, w, d, color, opts = {}) {
    return this.brick(x, y, z, w, d, color, { ...opts, h: opts.h ?? PLATE });
  }

  /** Plate with a smooth top. */
  tile(x, y, z, w, d, color, opts = {}) {
    return this.brick(x, y, z, w, d, color, { ...opts, h: opts.h ?? PLATE, studs: false });
  }

  /** Studless brick-height block. */
  block(x, y, z, w, d, color, opts = {}) {
    return this.brick(x, y, z, w, d, color, { ...opts, studs: false });
  }

  /** Free-form box in world units (not snapped to the stud grid). */
  box(x, y, z, w, h, d, color, opts = {}) {
    const g = cached(`raw|${w}|${h}|${d}|${opts.bevel !== false}`, () => {
      const gg = opts.bevel === false
        ? new THREE.BoxGeometry(w, h, d)
        : new RoundedBoxGeometry(w, h, d, 1, Math.min(BEVEL, w * 0.3, h * 0.3, d * 0.3));
      gg.translate(0, h / 2, 0);
      return gg;
    });
    return this._place(g, color, { ...opts, pos: [x, y, z] });
  }

  /**
   * Slope. Height falls from `h` at the back (-z) to `hFront` at the front (+z)
   * across `d` studs. Use opts.rot to point it any direction.
   */
  slope(x, y, z, w, d, color, opts = {}) {
    const h = opts.h ?? BRICK;
    const hf = opts.hFront ?? 0;
    const hb = opts.hBack ?? h;
    const dd = d - GAP;
    const g = profileGeometry(
      [[-dd / 2, 0], [dd / 2, 0], [dd / 2, Math.max(0.001, hf)], [-dd / 2, hb]],
      w, { bevel: opts.bevel !== false, key: `slope|${dd}|${hf}|${hb}` }
    );
    return this._place(g, color, { ...opts, pos: [x, y, z] });
  }

  /** Arbitrary vertical prism from an (x, z) polygon: hulls, wings, dunes. */
  poly(x, y, z, points, h, color, opts = {}) {
    return this._place(polyGeometry(points, h, opts), color, { ...opts, pos: [x, y, z] });
  }

  /** Free profile prism in the (z, y) plane extruded along x. */
  profile(x, y, z, points, w, color, opts = {}) {
    return this._place(profileGeometry(points, w, opts), color, { ...opts, pos: [x, y, z] });
  }

  /** Round brick / technic pin / engine nozzle. axis: 'x' | 'y' | 'z'. */
  cyl(x, y, z, r, h, color, opts = {}) {
    const g = cylGeometry(r, h, opts.seg || 16, opts.r2 ?? null, opts.open || false);
    const rot = opts.rot ?? (opts.axis === 'x' ? [0, 0, -Math.PI / 2] : opts.axis === 'z' ? [Math.PI / 2, 0, 0] : null);
    const o = { ...opts, pos: [x, y, z], rot };
    const kit = this._place(g, color, o);
    if (opts.stud) {
      this._place(studGeometry(12), color, { ...opts, pos: [x, y + h, z] });
    }
    return kit;
  }

  cone(x, y, z, rBottom, rTop, h, color, opts = {}) {
    return this.cyl(x, y, z, rBottom, h, color, { ...opts, r2: rTop });
  }

  sphere(x, y, z, r, color, opts = {}) {
    return this._place(sphereGeometry(r, opts.seg || 18), color, { ...opts, pos: [x, y, z] });
  }

  torus(x, y, z, r, tube, color, opts = {}) {
    return this._place(torusGeometry(r, tube, opts.seg || 20, opts.tseg || 10, opts.arc), color, { ...opts, pos: [x, y, z] });
  }

  /** A single stud, for greebling smooth surfaces. */
  stud(x, y, z, color, opts = {}) {
    return this._place(studGeometry(opts.seg || 12), color, { ...opts, pos: [x, y, z] });
  }

  /** Any geometry you built yourself. */
  custom(geometry, color, opts = {}) {
    return this._place(geometry, color, opts);
  }

  /** Fold an existing Object3D (another built kit, a sprite, a light) into this one. */
  add(object3d) { this.extras.push(object3d); return this; }

  /** Copy every placement from another kit through the current transform. */
  merge(kit, opts = {}) {
    for (const e of kit.entries) {
      this.entries.push({ ...e, matrix: this._m.clone().multiply(e.matrix) });
    }
    for (const [k, v] of Object.entries(kit.points)) {
      this.points[opts.prefix ? opts.prefix + k : k] = v.clone().applyMatrix4(this._m);
    }
    for (const o of kit.extras) {
      const c = o.clone();
      c.applyMatrix4(this._m);
      this.extras.push(c);
    }
    return this;
  }

  get brickCount() { return this.entries.length; }

  /** Batch into InstancedMeshes and return a Group. */
  build(opts = {}) {
    const group = new THREE.Group();
    group.name = opts.name || this.name;
    const buckets = new Map();
    for (const e of this.entries) {
      const key = `${e.geometry.userData.key || e.geometry.uuid}|${e.material.name}|${e.castShadow}|${e.receiveShadow}|${e.renderOrder}`;
      let b = buckets.get(key);
      if (!b) { b = { geometry: e.geometry, material: e.material, list: [], e }; buckets.set(key, b); }
      b.list.push(e.matrix);
    }
    for (const b of buckets.values()) {
      let mesh;
      if (b.list.length === 1) {
        mesh = new THREE.Mesh(b.geometry, b.material);
        mesh.applyMatrix4(b.list[0]);
      } else {
        mesh = new THREE.InstancedMesh(b.geometry, b.material, b.list.length);
        for (let i = 0; i < b.list.length; i++) mesh.setMatrixAt(i, b.list[i]);
        mesh.instanceMatrix.needsUpdate = true;
      }
      mesh.castShadow = b.e.castShadow && opts.castShadow !== false;
      mesh.receiveShadow = b.e.receiveShadow && opts.receiveShadow !== false;
      mesh.renderOrder = b.e.renderOrder;
      mesh.frustumCulled = opts.frustumCulled !== false;
      group.add(mesh);
    }
    for (const o of this.extras) group.add(o);
    group.userData.points = this.points;
    group.userData.brickCount = this.entries.length;
    return group;
  }
}

/** Convenience: build with a callback. */
export function build(name, fn, opts = {}) {
  const kit = new Kit(name);
  fn(kit);
  return kit.build({ name, ...opts });
}

export { FINISH };
