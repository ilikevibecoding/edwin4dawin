import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  LatheGeometry,
  Path,
  Shape,
  SphereGeometry,
  TorusGeometry,
  Vector2,
} from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';

export function roundedBox(w, h, d, radius = 0.012, segs = 2) {
  const r = Math.min(radius, w * 0.45, h * 0.45, d * 0.45);
  return new RoundedBoxGeometry(w, h, d, segs, r);
}

export function box(w, h, d) {
  return new BoxGeometry(w, h, d);
}

export function cyl(rTop, rBot, h, radial = 16, heightSegs = 1, open = false) {
  return new CylinderGeometry(rTop, rBot, h, radial, heightSegs, open);
}

export function sphere(r, w = 12, h = 8) {
  return new SphereGeometry(r, w, h);
}

export function torus(radius, tube, radial = 16, tubular = 12, arc = Math.PI * 2) {
  return new TorusGeometry(radius, tube, radial, tubular, arc);
}

export function mergeGeoms(geoms) {
  const filtered = geoms.filter(Boolean);
  if (filtered.length === 0) return new BufferGeometry();
  if (filtered.length === 1) return filtered[0];
  const merged = BufferGeometryUtils.mergeGeometries(filtered, false);
  return merged || filtered[0];
}

export function placed(geometry, x, y, z, rx = 0, ry = 0, rz = 0) {
  const g = geometry.clone();
  g.rotateX(rx);
  g.rotateY(ry);
  g.rotateZ(rz);
  g.translate(x, y, z);
  return g;
}

export function tBeamRing(radius, web = 0.045, flange = 0.07, thickness = 0.018, segs = 48, y0 = -0.08) {
  const parts = [];
  const step = (Math.PI * 2) / segs;
  for (let i = 0; i < segs; i++) {
    const a0 = i * step;
    const a1 = (i + 1) * step;
    const mid = (a0 + a1) * 0.5;
    const y = Math.sin(mid) * radius;
    if (y < y0) continue;
    const x = Math.cos(mid) * radius;
    const len = radius * step * 1.08;
    const webG = placed(box(len, web, thickness), x, y, 0, 0, 0, mid + Math.PI * 0.5);
    const flG = placed(box(len, thickness, flange), x, y, 0, 0, 0, mid + Math.PI * 0.5);
    parts.push(webG, flG);
  }
  return mergeGeoms(parts);
}

export function hatchOpeningShape(width, height, radius = 0.22) {
  const hw = width * 0.5;
  const r = Math.min(radius, hw - 0.01, height * 0.35);
  const shape = new Shape();
  shape.moveTo(-hw, 0);
  shape.lineTo(-hw, height - r);
  shape.absarc(-hw + r, height - r, r, Math.PI, Math.PI * 0.5, true);
  shape.lineTo(hw - r, height);
  shape.absarc(hw - r, height - r, r, Math.PI * 0.5, 0, true);
  shape.lineTo(hw, 0);
  shape.closePath();
  return shape;
}

export function windowBulkhead(outerR, winW, winH, winY, depth = 0.08) {
  const shape = new Shape();
  const segs = 48;
  for (let i = 0; i <= segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    const x = Math.cos(a) * outerR;
    const y = Math.sin(a) * outerR;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  const hole = new Path();
  const hw = winW * 0.5;
  const hh = winH * 0.5;
  const r = Math.min(0.12, hw - 0.02, hh - 0.02);
  hole.moveTo(-hw + r, winY - hh);
  hole.lineTo(hw - r, winY - hh);
  hole.absarc(hw - r, winY - hh + r, r, -Math.PI * 0.5, 0, false);
  hole.lineTo(hw, winY + hh - r);
  hole.absarc(hw - r, winY + hh - r, r, 0, Math.PI * 0.5, false);
  hole.lineTo(-hw + r, winY + hh);
  hole.absarc(-hw + r, winY + hh - r, r, Math.PI * 0.5, Math.PI, false);
  hole.lineTo(-hw, winY - hh + r);
  hole.absarc(-hw + r, winY - hh + r, r, Math.PI, Math.PI * 1.5, false);
  hole.closePath();
  shape.holes.push(hole);
  const geo = new ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.012,
    bevelSize: 0.01,
    bevelSegments: 2,
  });
  geo.translate(0, 0, -depth * 0.5);
  return geo;
}

export function bulkheadPlate(outerR, width, height, sill, depth = 0.08) {
  const shape = new Shape();
  const segs = 48;
  for (let i = 0; i <= segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    const x = Math.cos(a) * outerR;
    const y = Math.sin(a) * outerR;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  const hole = hatchOpeningShape(width, height);
  hole.curves.forEach(() => {});
  const holePath = new Path();
  const hw = width * 0.5;
  const r = Math.min(0.22, hw - 0.01);
  const yOff = sill - outerR * 0.02;
  holePath.moveTo(-hw, yOff);
  holePath.lineTo(-hw, yOff + height - r);
  holePath.absarc(-hw + r, yOff + height - r, r, Math.PI, Math.PI * 0.5, true);
  holePath.lineTo(hw - r, yOff + height);
  holePath.absarc(hw - r, yOff + height - r, r, Math.PI * 0.5, 0, true);
  holePath.lineTo(hw, yOff);
  holePath.closePath();
  shape.holes.push(holePath);

  const geo = new ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.012,
    bevelSize: 0.01,
    bevelSegments: 2,
  });
  geo.translate(0, 0, -depth * 0.5);
  return geo;
}

export function pipeElbow(radius, tubeR, segs = 10) {
  return new TorusGeometry(radius, tubeR, 10, segs, Math.PI * 0.5);
}

export function flangeRing(innerR, outerR, depth = 0.018, segs = 20) {
  const shape = new Shape();
  shape.absarc(0, 0, outerR, 0, Math.PI * 2, false);
  const hole = new Path();
  hole.absarc(0, 0, innerR, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  const geo = new ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.003,
    bevelSize: 0.003,
    bevelSegments: 1,
  });
  geo.rotateX(Math.PI * 0.5);
  geo.translate(0, depth * 0.5, 0);
  return geo;
}

export function valveWheel(radius = 0.09, tube = 0.01, spokes = 5) {
  const parts = [new TorusGeometry(radius, tube, 8, 18)];
  for (let i = 0; i < spokes; i++) {
    const a = (i / spokes) * Math.PI * 2;
    parts.push(placed(cyl(tube * 0.7, tube * 0.7, radius * 1.7, 6), 0, 0, 0, Math.PI * 0.5, 0, a));
  }
  parts.push(sphere(tube * 1.8, 8, 6));
  return mergeGeoms(parts);
}

export function latheProfile(points, segs = 20) {
  return new LatheGeometry(points.map(([x, y]) => new Vector2(x, y)), segs);
}

export function motorHousing(radius, length) {
  const pts = [
    [radius * 0.35, -length * 0.5],
    [radius * 0.92, -length * 0.42],
    [radius, -length * 0.28],
    [radius, length * 0.22],
    [radius * 0.88, length * 0.34],
    [radius * 0.55, length * 0.42],
    [radius * 0.28, length * 0.5],
  ];
  return latheProfile(pts, 28);
}

export function pumpBody(radius, length) {
  const pts = [
    [radius * 0.4, -length * 0.5],
    [radius * 0.85, -length * 0.3],
    [radius, -length * 0.1],
    [radius * 0.95, length * 0.15],
    [radius * 0.7, length * 0.35],
    [radius * 0.45, length * 0.5],
  ];
  return latheProfile(pts, 20);
}

export function invertNormals(geometry) {
  const idx = geometry.index;
  if (idx) {
    const a = idx.array;
    for (let i = 0; i < a.length; i += 3) {
      const tmp = a[i];
      a[i] = a[i + 1];
      a[i + 1] = tmp;
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
  return geometry;
}

export function computeVertexNormalsSafe(geometry) {
  geometry.computeVertexNormals();
  return geometry;
}

export function addUv2(geometry) {
  const uv = geometry.attributes.uv;
  if (uv) geometry.setAttribute('uv2', new BufferAttribute(uv.array, 2));
  return geometry;
}
