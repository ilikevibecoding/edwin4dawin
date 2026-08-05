// Kit — accumulate primitive geometries per material and merge them into a
// handful of draw calls. Used for all static procedural modeling.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const _m = new THREE.Matrix4();
const _p = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _e = new THREE.Euler();

export class Kit {
  constructor() {
    this.byMat = new Map(); // material -> geometry[]
  }

  addGeo(geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
    const g = geo.clone();
    _e.set(rx, ry, rz);
    _q.setFromEuler(_e);
    _p.set(x, y, z); _s.set(sx, sy, sz);
    _m.compose(_p, _q, _s);
    g.applyMatrix4(_m);
    if (!this.byMat.has(mat)) this.byMat.set(mat, []);
    this.byMat.get(mat).push(g);
    return this;
  }

  box(mat, w, h, d, x, y, z, rx = 0, ry = 0, rz = 0) {
    return this.addGeo(new THREE.BoxGeometry(w, h, d), mat, x, y, z, rx, ry, rz);
  }

  cyl(mat, rTop, rBot, h, seg, x, y, z, rx = 0, ry = 0, rz = 0) {
    return this.addGeo(new THREE.CylinderGeometry(rTop, rBot, h, seg), mat, x, y, z, rx, ry, rz);
  }

  cone(mat, r, h, seg, x, y, z, rx = 0, ry = 0, rz = 0) {
    return this.addGeo(new THREE.ConeGeometry(r, h, seg), mat, x, y, z, rx, ry, rz);
  }

  sphere(mat, r, w, hSeg, x, y, z, sx = 1, sy = 1, sz = 1) {
    return this.addGeo(new THREE.SphereGeometry(r, w, hSeg), mat, x, y, z, 0, 0, 0, sx, sy, sz);
  }

  torus(mat, r, tube, rad, tub, x, y, z, rx = 0, ry = 0, rz = 0, arc = Math.PI * 2) {
    return this.addGeo(new THREE.TorusGeometry(r, tube, rad, tub, arc), mat, x, y, z, rx, ry, rz);
  }

  plane(mat, w, h, x, y, z, rx = 0, ry = 0, rz = 0) {
    return this.addGeo(new THREE.PlaneGeometry(w, h), mat, x, y, z, rx, ry, rz);
  }

  lathe(mat, points, seg, x, y, z, rx = 0, ry = 0, rz = 0) {
    return this.addGeo(new THREE.LatheGeometry(points, seg), mat, x, y, z, rx, ry, rz);
  }

  tube(mat, curve, seg, r, rSeg, x = 0, y = 0, z = 0) {
    return this.addGeo(new THREE.TubeGeometry(curve, seg, r, rSeg, false), mat, x, y, z);
  }

  // cylinder strut between two world points
  bar(mat, ax, ay, az, bx, by, bz, r, seg = 6) {
    const dx = bx - ax, dy = by - ay, dz = bz - az;
    const len = Math.hypot(dx, dy, dz);
    if (len < 1e-5) return this;
    const g = new THREE.CylinderGeometry(r, r, len, seg);
    _q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(dx / len, dy / len, dz / len));
    _p.set((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2);
    _s.set(1, 1, 1);
    _m.compose(_p, _q, _s);
    g.applyMatrix4(_m);
    if (!this.byMat.has(mat)) this.byMat.set(mat, []);
    this.byMat.get(mat).push(g);
    return this;
  }

  // Merge everything into one mesh per material, added to a group.
  build({ castShadow = true, receiveShadow = true, name = 'kit' } = {}) {
    const group = new THREE.Group();
    group.name = name;
    for (const [mat, geos] of this.byMat) {
      if (!geos.length) continue;
      const merged = mergeGeometries(geos, false);
      geos.forEach(g => g.dispose());
      const mesh = new THREE.Mesh(merged, mat);
      mesh.castShadow = castShadow;
      mesh.receiveShadow = receiveShadow;
      group.add(mesh);
    }
    this.byMat.clear();
    return group;
  }
}

// Instanced repetition of one geometry+material with a list of matrices.
export function instanced(geo, mat, transforms, { castShadow = true, receiveShadow = true } = {}) {
  const im = new THREE.InstancedMesh(geo, mat, transforms.length);
  transforms.forEach((t, i) => {
    _e.set(t.rx || 0, t.ry || 0, t.rz || 0);
    _q.setFromEuler(_e);
    _p.set(t.x || 0, t.y || 0, t.z || 0);
    const s = t.s || 1;
    _s.set(t.sx || s, t.sy || s, t.sz || s);
    _m.compose(_p, _q, _s);
    im.setMatrixAt(i, _m);
  });
  im.castShadow = castShadow;
  im.receiveShadow = receiveShadow;
  im.instanceMatrix.needsUpdate = true;
  return im;
}

// Catenary-ish sagging cable between two points.
export function cableCurve(a, b, sag = 0.5) {
  const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
  mid.y -= sag;
  return new THREE.CatmullRomCurve3([a.clone(), mid, b.clone()]);
}
