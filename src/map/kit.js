// Merged-geometry accumulator (Fable 2). Architectural finish detail is emitted into per-material
// buckets and flushed as ONE merged mesh per material — keeps draw calls flat while the trim pass
// adds thousands of parts. Geometry is baked in world space so worldUVs() tiles at 1 UV = 1 m.
import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { getMaterial } from '../materials/index.js';
import { worldUVs } from '../materials/uvtools.js';

export class Kit {
  constructor(map) {
    this.map = map;
    this.buckets = new Map(); // matName -> { geos: [], shadows: {cast, receive} }
  }

  _bucket(matName, cast = true, receive = true) {
    let b = this.buckets.get(matName);
    if (!b) { b = { geos: [], cast, receive }; this.buckets.set(matName, b); }
    b.cast = b.cast && cast; // a bucket only casts if every contributor wants to (cheapest wins)
    return b;
  }

  /** Add an arbitrary geometry already positioned in world space. */
  add(matName, geo, { uv = 1, cast = true, receive = true } = {}) {
    if (geo.index) { const ni = geo.toNonIndexed(); geo.dispose(); geo = ni; } // merge needs uniform indexing
    if (uv) worldUVs(geo, uv); // uv: 0 keeps native box UVs (canvas-texture signage)
    this._bucket(matName, cast, receive).geos.push(geo);
    return geo;
  }

  /** Axis-aligned box, centered at (x, y, z). rotY in radians (applied before translate). */
  box(matName, w, h, d, x, y, z, opts = {}) {
    const geo = new THREE.BoxGeometry(w, h, d);
    if (opts.rotY) geo.rotateY(opts.rotY);
    if (opts.rotX) geo.rotateX(opts.rotX);
    if (opts.rotZ) geo.rotateZ(opts.rotZ);
    geo.translate(x, y, z);
    this.add(matName, geo, opts);
    if (opts.collide) this.collide(x - w / 2, y - h / 2, z - d / 2, x + w / 2, y + h / 2, z + d / 2, opts);
    return geo;
  }

  /** Vertical cylinder (posts, poles, bollards). y = base. */
  cyl(matName, rTop, rBot, h, x, y, z, opts = {}) {
    const geo = new THREE.CylinderGeometry(rTop, rBot, h, opts.seg ?? 10);
    geo.translate(x, y + h / 2, z);
    this.add(matName, geo, opts);
    if (opts.collide) {
      const r = Math.max(rTop, rBot);
      this.collide(x - r, y, z - r, x + r, y + h, z + r, opts);
    }
    return geo;
  }

  /**
   * Continuous drift ribbon along a wall: a single tapered slope strip instead of discrete
   * wedges (discrete wedges read as "teeth" — their white slope faces vanish against the snow
   * ground and only the end caps show). `axis` is the RUN direction, `face` the wall-face
   * coordinate on the perpendicular axis, `dir` the outward sign. `nodes` = [{p, h, depth}]
   * sampled along the run in world coords; h should taper to 0 at both ends.
   */
  ribbon(matName, axis, face, nodes, dir, opts = {}) {
    const pos = [];
    const pt = (p, u, v) => (axis === 'x' ? [p, v, face + u * dir] : [face + u * dir, v, p]);
    for (let i = 0; i < nodes.length - 1; i++) {
      const a = nodes[i], b = nodes[i + 1];
      const rA = pt(a.p, 0, a.h), tA = pt(a.p, a.depth, 0);
      const rB = pt(b.p, 0, b.h), tB = pt(b.p, b.depth, 0);
      // wind so the slope faces up (check the first triangle's normal)
      const e1 = [tA[0] - rA[0], tA[1] - rA[1], tA[2] - rA[2]];
      const e2 = [rB[0] - rA[0], rB[1] - rA[1], rB[2] - rA[2]];
      const ny = e1[2] * e2[0] - e1[0] * e2[2];
      if (ny >= 0) pos.push(...rA, ...tA, ...rB, ...rB, ...tA, ...tB);
      else pos.push(...rA, ...rB, ...tA, ...rB, ...tB, ...tA);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Array((pos.length / 3) * 2).fill(0), 2));
    geo.computeVertexNormals();
    this.add(matName, geo, { cast: false, ...opts });
    return geo;
  }

  collide(x0, y0, z0, x1, y1, z1, opts = {}) {
    this.map.world.add({
      min: { x: Math.min(x0, x1), y: Math.min(y0, y1), z: Math.min(z0, z1) },
      max: { x: Math.max(x0, x1), y: Math.max(y0, y1), z: Math.max(z0, z1) },
      material: opts.material ?? 'concrete',
      tag: opts.tag ?? 'structure',
      blockShot: opts.blockShot,
      blockSight: opts.blockSight,
      thin: opts.thin,
    });
  }

  /** Merge every bucket into one mesh per material and add them to the map group. */
  flush(namePrefix = 'kit') {
    for (const [matName, b] of this.buckets) {
      if (!b.geos.length) continue;
      const merged = BufferGeometryUtils.mergeGeometries(b.geos, false);
      for (const g of b.geos) g.dispose();
      const mesh = new THREE.Mesh(merged, getMaterial(matName));
      mesh.name = `${namePrefix}-${matName}`;
      mesh.castShadow = b.cast;
      mesh.receiveShadow = b.receive;
      this.map.group.add(mesh);
    }
    this.buckets.clear();
  }
}
