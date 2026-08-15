import * as THREE from "three";

export function invertNormals(geometry) {
  const idx = geometry.index;
  if (idx) {
    const a = idx.array;
    for (let i = 0; i < a.length; i += 3) {
      const t = a[i + 1];
      a[i + 1] = a[i + 2];
      a[i + 2] = t;
    }
    idx.needsUpdate = true;
  }
  const n = geometry.attributes.normal;
  if (n) {
    for (let i = 0; i < n.count; i++) {
      n.setXYZ(i, -n.getX(i), -n.getY(i), -n.getZ(i));
    }
    n.needsUpdate = true;
  }
  geometry.computeVertexNormals();
  return geometry;
}

export function roundedRectShape(w, h, r) {
  const shape = new THREE.Shape();
  const hw = w * 0.5;
  const hh = h * 0.5;
  const rr = Math.min(r, hw, hh);
  shape.moveTo(-hw + rr, -hh);
  shape.lineTo(hw - rr, -hh);
  shape.absarc(hw - rr, -hh + rr, rr, -Math.PI / 2, 0, false);
  shape.lineTo(hw, hh - rr);
  shape.absarc(hw - rr, hh - rr, rr, 0, Math.PI / 2, false);
  shape.lineTo(-hw + rr, hh);
  shape.absarc(-hw + rr, hh - rr, rr, Math.PI / 2, Math.PI, false);
  shape.lineTo(-hw, -hh + rr);
  shape.absarc(-hw + rr, -hh + rr, rr, Math.PI, Math.PI * 1.5, false);
  return shape;
}

export function beveledPanel(w, h, depth, radius = 0.018, bevel = 0.008) {
  const shape = roundedRectShape(w, h, radius);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
    curveSegments: 6,
  });
  geo.center();
  geo.computeVertexNormals();
  return geo;
}

export function beveledBox(w, h, d, bevel = 0.012) {
  const shape = roundedRectShape(w, d, bevel * 2.2);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: h,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
    curveSegments: 5,
  });
  geo.rotateX(-Math.PI / 2);
  geo.center();
  geo.computeVertexNormals();
  return geo;
}

export function cylinderZ(radius, length, radial = 16, open = false) {
  const geo = new THREE.CylinderGeometry(radius, radius, length, radial, 1, open);
  geo.rotateX(Math.PI / 2);
  geo.computeVertexNormals();
  return geo;
}

export function lathe(points, segments = 32) {
  const vecs = points.map((p) => new THREE.Vector2(p[0], p[1]));
  const geo = new THREE.LatheGeometry(vecs, segments);
  geo.computeVertexNormals();
  return geo;
}

export function mergeGroup(meshes) {
  const geos = [];
  for (const mesh of meshes) {
    mesh.updateWorldMatrix(true, false);
    const g = mesh.geometry.clone();
    g.applyMatrix4(mesh.matrixWorld);
    geos.push(g);
  }
  const merged = geos[0].constructor === THREE.BufferGeometry
    ? (awaitImportMerge(geos))
    : null;
  return merged;
}

function awaitImportMerge(geos) {
  // placeholder replaced by mergeGeometries import at call sites
  return geos[0];
}

export function disposeMesh(mesh) {
  mesh.geometry?.dispose?.();
}

export function setShadow(mesh, cast = true, receive = true) {
  mesh.castShadow = cast;
  mesh.receiveShadow = receive;
  return mesh;
}

export function lookGroup(position, target) {
  const g = new THREE.Group();
  g.position.copy(position);
  g.lookAt(target);
  return g;
}

export function uvProjectBox(geometry) {
  geometry.computeBoundingBox();
  const bb = geometry.boundingBox;
  const size = new THREE.Vector3();
  bb.getSize(size);
  const pos = geometry.attributes.position;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const x = (pos.getX(i) - bb.min.x) / Math.max(size.x, 1e-5);
    const y = (pos.getY(i) - bb.min.y) / Math.max(size.y, 1e-5);
    uv[i * 2] = x;
    uv[i * 2 + 1] = y;
  }
  geometry.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return geometry;
}
