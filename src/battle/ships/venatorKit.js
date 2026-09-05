// Geometry helpers for the Venator model: a tagged profile loft (hull cross sections with recesses whose
// walls can carry a different material), surface frames on that loft for placing detail, oriented boxes and
// quads, an engine nozzle with interior depth, a rectangle partition for raised plate fields and small
// colour utilities. Everything is object space (ship forward -Z, up +Y) and non-indexed so the assembler
// can merge it per material.
import * as THREE from "three";

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);

// piecewise-linear curve through [[x, y], ...] sorted by x, clamped at the ends
export function pw(points, x) {
  if (x <= points[0][0]) return points[0][1];
  for (let i = 0; i + 1 < points.length; i++) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[i + 1];
    if (x <= x1) return lerp(y0, y1, (x - x0) / (x1 - x0));
  }
  return points[points.length - 1][1];
}

export function signedArea(pts) {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const q = pts[(i + 1) % pts.length];
    a += p[0] * q[1] - q[0] * p[1];
  }
  return a / 2;
}

function geoFrom(arr) {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(arr, 3));
  g.computeVertexNormals();
  return g;
}

/**
 * Loft a closed 2D profile along z. `sections` = [{ z, pts: [[x, y], ...] }] sorted by z, all with the
 * same point count; edge j runs from pts[j] to pts[j+1]. `tags[j]` names the material group of that
 * edge's strip (default "hull"), so recess walls can be "dark". Profiles must be counter-clockwise seen
 * from +z (bottom edge running +x); the function fixes the winding if not. Returns { tag: geometry }.
 */
export function loftProfile(
  sections,
  {
    tags = null,
    capStart = true,
    capEnd = true,
    capTag = "hull",
    defaultTag = "hull",
  } = {},
) {
  const n = sections[0].pts.length;
  let secs = sections;
  let tg = tags ? tags.slice() : new Array(n).fill(defaultTag);
  let best = 0;
  let area = 0;
  for (const s of sections) {
    const a = signedArea(s.pts);
    if (Math.abs(a) > Math.abs(best)) best = a;
    area = best;
  }
  if (area < 0) {
    secs = sections.map((s) => ({ ...s, pts: s.pts.slice().reverse() }));
    const orig = tg;
    tg = orig.map((_, k) => orig[(n - 2 - k + n) % n]);
  }
  const buckets = new Map();
  const push = (tag, ...v) => {
    let b = buckets.get(tag);
    if (!b) buckets.set(tag, (b = []));
    for (const p of v) b.push(p[0], p[1], p[2]);
  };
  const d2 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  for (let i = 0; i + 1 < secs.length; i++) {
    const A = secs[i];
    const B = secs[i + 1];
    for (let j = 0; j < n; j++) {
      const k = (j + 1) % n;
      if (d2(A.pts[j], A.pts[k]) < 1e-6 && d2(B.pts[j], B.pts[k]) < 1e-6)
        continue;
      const a0 = [A.pts[j][0], A.pts[j][1], A.z];
      const a1 = [A.pts[k][0], A.pts[k][1], A.z];
      const b0 = [B.pts[j][0], B.pts[j][1], B.z];
      const b1 = [B.pts[k][0], B.pts[k][1], B.z];
      push(tg[j], a0, a1, b1, a0, b1, b0);
    }
  }
  const cap = (sec, dir) => {
    const pts = [];
    for (const p of sec.pts) {
      const q = pts[pts.length - 1];
      if (!q || d2(q, p) > 1e-6) pts.push(p);
    }
    while (pts.length > 1 && d2(pts[0], pts[pts.length - 1]) < 1e-6) pts.pop();
    if (pts.length < 3) return;
    const contour = pts.map((p) => new THREE.Vector2(p[0], p[1]));
    const tris = THREE.ShapeUtils.triangulateShape(contour, []);
    for (const [a, b, c] of tris) {
      const pa = pts[a];
      const pb = pts[b];
      const pc = pts[c];
      const ar =
        (pb[0] - pa[0]) * (pc[1] - pa[1]) - (pc[0] - pa[0]) * (pb[1] - pa[1]);
      const ccw = ar > 0;
      const order = ccw === dir > 0 ? [pa, pb, pc] : [pa, pc, pb];
      push(capTag, ...order.map((p) => [p[0], p[1], sec.z]));
    }
  };
  if (capStart) cap(secs[0], -1);
  if (capEnd) cap(secs[secs.length - 1], 1);
  const out = {};
  for (const [tag, arr] of buckets) out[tag] = geoFrom(arr);
  return out;
}

/**
 * Surface frame on a loft: position and orthonormal frame on the strip of profile edge `j`, at parameter
 * `t` (0..1 along the edge) and depth `z`. `n` points out of the hull, `v` runs along z, `u` along the edge.
 */
export function loftFrame(sections, j, t, z) {
  let i = 0;
  while (i + 2 < sections.length && sections[i + 1].z < z) i++;
  const A = sections[i];
  const B = sections[i + 1];
  const f = clamp((z - A.z) / (B.z - A.z), 0, 1);
  const np = A.pts.length;
  const k = (j + 1) % np;
  const l2 = (p, q, s) => [lerp(p[0], q[0], s), lerp(p[1], q[1], s)];
  const pa = l2(A.pts[j], A.pts[k], t);
  const pb = l2(B.pts[j], B.pts[k], t);
  const p = new THREE.Vector3(lerp(pa[0], pb[0], f), lerp(pa[1], pb[1], f), z);
  const ea = [A.pts[k][0] - A.pts[j][0], A.pts[k][1] - A.pts[j][1]];
  const eb = [B.pts[k][0] - B.pts[j][0], B.pts[k][1] - B.pts[j][1]];
  const u = new THREE.Vector3(
    lerp(ea[0], eb[0], f),
    lerp(ea[1], eb[1], f),
    0,
  ).normalize();
  const v = new THREE.Vector3(pb[0] - pa[0], pb[1] - pa[1], B.z - A.z).normalize();
  const nrm = new THREE.Vector3().crossVectors(u, v).normalize();
  return { p, n: nrm, u, v };
}

// Right-handed basis matrix with local +Y = normal, +Z = along (projected), positioned at p.
export function frameMatrix(p, normal, along) {
  const y = normal.clone().normalize();
  const z = along.clone().addScaledVector(y, -along.dot(y)).normalize();
  const x = new THREE.Vector3().crossVectors(y, z).normalize();
  const m = new THREE.Matrix4().makeBasis(x, y, z);
  m.setPosition(p);
  return m;
}

// Box of size [sx, sy, sz] placed with matrix m (local origin at the box centre).
export function orientedBox(size, m) {
  const g = new THREE.BoxGeometry(size[0], size[1], size[2]);
  g.applyMatrix4(m);
  return g;
}

// A box sitting on a surface frame: `size` = [along u, thickness, along v]; sunk `sink` metres into the hull.
export function surfaceBox(frame, size, { du = 0, dv = 0, sink = 0.25 } = {}) {
  const p = frame.p
    .clone()
    .addScaledVector(frame.u, du)
    .addScaledVector(frame.v, dv)
    .addScaledVector(frame.n, size[1] / 2 - sink);
  return orientedBox(size, frameMatrix(p, frame.n, frame.v));
}

// Single quad (2 triangles) of w x h at `center`, facing `dir`, with `up` as its vertical.
export function quadFacing(center, dir, up, w, h) {
  const g = new THREE.PlaneGeometry(w, h);
  const z = new THREE.Vector3(...dir).normalize();
  let y = new THREE.Vector3(...up);
  y.addScaledVector(z, -y.dot(z));
  if (y.lengthSq() < 1e-8) y = Math.abs(z.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
  y.addScaledVector(z, -y.dot(z)).normalize();
  const x = new THREE.Vector3().crossVectors(y, z).normalize();
  const m = new THREE.Matrix4().makeBasis(x, y, z);
  m.setPosition(new THREE.Vector3(...center));
  g.applyMatrix4(m);
  return g.toNonIndexed();
}

// Flat ring (annulus) with an optional gap, facing `dir`. thetaLength < 2π leaves the gap.
export function ringFacing(center, dir, up, rIn, rOut, seg = 24, gap = 0) {
  const g = new THREE.RingGeometry(
    rIn,
    rOut,
    seg,
    1,
    gap / 2,
    Math.PI * 2 - gap,
  );
  const z = new THREE.Vector3(...dir).normalize();
  let y = new THREE.Vector3(...up);
  y.addScaledVector(z, -y.dot(z)).normalize();
  const x = new THREE.Vector3().crossVectors(y, z).normalize();
  const m = new THREE.Matrix4().makeBasis(x, y, z);
  m.setPosition(new THREE.Vector3(...center));
  g.applyMatrix4(m);
  return g.toNonIndexed();
}

// Reverse the winding (and normals) of a geometry so its faces point the other way.
export function flipGeometry(geo) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  const pos = g.attributes.position;
  const arr = pos.array;
  for (let i = 0; i < pos.count; i += 3) {
    for (let c = 0; c < 3; c++) {
      const a = arr[(i + 1) * 3 + c];
      arr[(i + 1) * 3 + c] = arr[(i + 2) * 3 + c];
      arr[(i + 2) * 3 + c] = a;
    }
  }
  pos.needsUpdate = true;
  g.deleteAttribute("normal");
  g.computeVertexNormals();
  return g;
}

export function cylZ(r0, r1, len, seg = 16, open = false) {
  const g = new THREE.CylinderGeometry(r0, r1, len, seg, 1, open);
  g.rotateX(Math.PI / 2);
  return g;
}

/**
 * Engine nozzle along +z (aft), mouth plane at z = 0. Returns geometries per material key:
 * dark (shroud, interior wall, rings, vanes), glow (core discs with radial colour), haze (additive cone).
 * The interior recedes `depth` metres into the hull so the nozzle has real depth from any angle.
 * detail 0 = far LOD (shroud, core, haze), 1 = interior wall + rings, 2 = vanes, hot spot, mouth glow.
 */
export function nozzle(
  r,
  {
    depth = null,
    lip = null,
    seg = 20,
    haze = 3.2,
    rings = 2,
    vanes = 8,
    detail = 2,
  } = {},
) {
  depth = depth ?? r * 1.1;
  lip = lip ?? r * 0.45;
  const dark = [];
  const glow = [];
  const hazeGeos = [];
  // outer shroud: slightly flared, from inside the hull to the lip
  dark.push(
    cylZ(r * 1.06, r * 1.14, lip + 4, seg, true).translate(0, 0, lip / 2 - 2),
  );
  if (detail >= 1) {
    // rim ring closing the shroud wall to the interior
    const rim = new THREE.RingGeometry(r, r * 1.14, seg, 1);
    rim.translate(0, 0, lip);
    dark.push(rim.toNonIndexed());
    // interior wall (faces inward): from the lip radius r to the throat deep inside
    const inner = cylZ(r * 0.42, r, depth + lip, seg, true).translate(
      0,
      0,
      lip - (depth + lip) / 2,
    );
    dark.push(flipGeometry(inner));
    // throat plate at the back
    const throat = new THREE.CircleGeometry(r * 0.42, seg);
    throat.translate(0, 0, -depth);
    dark.push(throat.toNonIndexed());
  } else {
    // far LOD: a flat dark disc closes the shroud just inside the mouth
    const plate = new THREE.CircleGeometry(r * 1.06, seg);
    plate.translate(0, 0, -1);
    dark.push(plate.toNonIndexed());
  }
  if (detail >= 1) {
    for (let i = 0; i < rings; i++) {
      const f = (i + 1) / (rings + 1);
      const zz = lip - f * (depth + lip);
      const rr = lerp(r, r * 0.42, f) * 0.94;
      const band = cylZ(rr, rr, r * 0.08, seg, true).translate(0, 0, zz);
      dark.push(flipGeometry(band));
      // outward face of the band so the ledge reads from oblique angles
      const ledge = new THREE.RingGeometry(rr, rr / 0.94, seg, 1);
      ledge.translate(0, 0, zz + r * 0.04);
      dark.push(ledge.toNonIndexed());
    }
  }
  if (detail >= 2) {
    for (let i = 0; i < vanes; i++) {
      const a = (i / vanes) * Math.PI * 2;
      const len = r * 0.36;
      const g = new THREE.BoxGeometry(r * 0.05, len, r * 0.3);
      g.translate(0, r * 0.42 + len / 2 - r * 0.02, -depth * 0.78);
      g.rotateZ(a);
      dark.push(g);
    }
  }
  // core: a disc deep inside with a bright centre, plus a small white hot spot in front of it
  const coreZ = detail >= 1 ? -depth * 0.62 : -0.5;
  const core = new THREE.CircleGeometry(r * 0.72, seg);
  core.translate(0, 0, coreZ);
  glow.push({
    geo: core.toNonIndexed(),
    radial: [r * 0.72, [1, 1, 1], [0.3, 0.58, 1.0]],
  });
  if (detail >= 2) {
    const hot = new THREE.CircleGeometry(r * 0.3, Math.max(8, seg >> 1));
    hot.translate(0, 0, -depth * 0.55);
    glow.push({
      geo: hot.toNonIndexed(),
      radial: [r * 0.3, [1, 1, 1], [0.9, 0.95, 1.0]],
    });
  }
  // haze: nested additive cones fading to black. Seen from the side their projections overlap toward the
  // axis, so the plume is brightest along the centreline and dim at the rim instead of a hard-edged cone.
  const hseg = Math.max(6, seg >> 1);
  const shells = detail >= 1 ? [1.0, 0.72, 0.42] : [1.0, 0.5];
  for (const k of shells) {
    const len = r * haze * (0.75 + 0.45 * k);
    const cone = cylZ(r * 0.95 * k, r * 0.25 * k, len, hseg, true);
    cone.translate(0, 0, lip + len / 2);
    hazeGeos.push({
      geo: cone.toNonIndexed(),
      fade: [lip, lip + len],
      scale: 0.42,
    });
  }
  if (detail >= 1) {
    const mouth = new THREE.CircleGeometry(r * 0.95, hseg);
    mouth.translate(0, 0, lip + 0.5);
    hazeGeos.push({
      geo: mouth.toNonIndexed(),
      radial: [r * 0.95, [0.5, 0.7, 1.0], [0, 0, 0]],
    });
  }
  return { dark, glow, haze: hazeGeos };
}

// Paint per-vertex colours from a function of position: fn(x, y, z, color) mutates `color`.
export function shadeGeometry(geo, fn) {
  const pos = geo.attributes.position;
  let col = geo.attributes.color;
  if (!col) {
    col = new THREE.BufferAttribute(new Float32Array(pos.count * 3).fill(1), 3);
    geo.setAttribute("color", col);
  }
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    c.setRGB(col.getX(i), col.getY(i), col.getZ(i));
    fn(pos.getX(i), pos.getY(i), pos.getZ(i), c);
    col.setXYZ(i, c.r, c.g, c.b);
  }
  col.needsUpdate = true;
  return geo;
}

// Radial vertex colours around an axis parallel to z through (cx, cy): inner colour at the centre, outer
// at radius R (measured in the xy plane so discs at any depth work).
export function radialColors(geo, center, R, inner, outer) {
  const [cx, cy] = center;
  return shadeGeometry(geo, (x, y, z, c) => {
    const d = Math.min(1, Math.hypot(x - cx, y - cy) / R);
    const k = d * d;
    c.setRGB(
      lerp(inner[0], outer[0], k),
      lerp(inner[1], outer[1], k),
      lerp(inner[2], outer[2], k),
    );
  });
}

// Linear fade of vertex colours along z between z0 (colour a) and z1 (colour b).
export function fadeZ(geo, z0, z1, a, b) {
  return shadeGeometry(geo, (x, y, z, c) => {
    const k = clamp((z - z0) / (z1 - z0), 0, 1);
    c.setRGB(lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k));
  });
}

// Recursive rectangle partition in metres: splits until both sides <= max, with random early stops so
// the cells vary in size and aspect. rect = { u0, v0, u1, v1 }.
export function partition(rand, rect, { max, min = max * 0.3, keep = 0.18 } = {}) {
  const out = [];
  const stack = [rect];
  while (stack.length) {
    const r = stack.pop();
    const w = r.u1 - r.u0;
    const h = r.v1 - r.v0;
    if (
      (w <= max && h <= max) ||
      (w < min * 2 && h < min * 2) ||
      (w <= max * 1.9 && h <= max * 1.9 && rand() < keep)
    ) {
      out.push(r);
      continue;
    }
    const t = 0.34 + rand() * 0.32;
    if (w >= h * 1.1 || (Math.abs(w - h) < h * 0.1 && rand() < 0.5)) {
      const c = r.u0 + w * t;
      stack.push({ ...r, u1: c }, { ...r, u0: c });
    } else {
      const c = r.v0 + h * t;
      stack.push({ ...r, v1: c }, { ...r, v0: c });
    }
  }
  return out;
}

// Slightly varied hull tone: luminance +-amount, a touch of warm/cool drift.
export function jitterColor(rand, base, amount = 0.08, warm = 0.02) {
  const c = new THREE.Color(base);
  const k = 1 + (rand() - 0.5) * 2 * amount;
  const w = (rand() - 0.5) * 2 * warm;
  c.r = clamp(c.r * k * (1 + w), 0, 1);
  c.g = clamp(c.g * k, 0, 1);
  c.b = clamp(c.b * k * (1 - w), 0, 1);
  return c;
}

export function mulColor(color, r, g = r, b = r) {
  const c = new THREE.Color(color);
  c.r = clamp(c.r * r, 0, 1);
  c.g = clamp(c.g * g, 0, 1);
  c.b = clamp(c.b * b, 0, 1);
  return c;
}
