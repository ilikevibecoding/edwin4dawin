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

function geoFrom(arr, uvs = null) {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(arr, 3));
  if (uvs) g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  g.computeVertexNormals();
  return g;
}

/**
 * Loft a closed 2D profile along z. `sections` = [{ z, pts: [[x, y], ...] }] sorted by z, all with the
 * same point count; edge j runs from pts[j] to pts[j+1]. `tags[j]` names the material group of that
 * edge's strip (default "hull"), so recess walls can be "dark". Profiles must be counter-clockwise seen
 * from +z (bottom edge running +x); the function fixes the winding if not. Returns { tag: geometry }.
 *
 * `uv` (tiles per metre) bakes texture coordinates per strip: strips whose mean normal lies within ~25
 * degrees of an axis get the object-space planar projection (so they match planar-mapped detail parts),
 * oblique strips (angled flanks, chamfers, prong slopes) are mapped along their own surface — u along z,
 * v across the strip in metres — so the plating never stretches or flips between the two triangles of a
 * twisted quad. Caps are planar in x/y. Use `part(geo, mat, { uv: "keep" })` with these.
 */
export function loftProfile(
  sections,
  {
    tags = null,
    capStart = true,
    capEnd = true,
    capTag = "hull",
    defaultTag = "hull",
    uv = null,
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
  const push = (tag, verts, uvs = null) => {
    let b = buckets.get(tag);
    if (!b) buckets.set(tag, (b = { pos: [], uv: [] }));
    for (const p of verts) b.pos.push(p[0], p[1], p[2]);
    if (uv && uvs) for (const t of uvs) b.uv.push(t[0], t[1]);
  };
  const d2 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  // strip mode: mean (area-weighted) normal per edge decides planar vs along-surface mapping
  const mode = new Array(n).fill(0); // 0 planar-y, 1 planar-x, 2 planar-z, 3 strip
  if (uv) {
    for (let j = 0; j < n; j++) {
      const k = (j + 1) % n;
      const acc = new THREE.Vector3();
      for (let i = 0; i + 1 < secs.length; i++) {
        const A = secs[i];
        const B = secs[i + 1];
        const a0 = new THREE.Vector3(A.pts[j][0], A.pts[j][1], A.z);
        const a1 = new THREE.Vector3(A.pts[k][0], A.pts[k][1], A.z);
        const b1 = new THREE.Vector3(B.pts[k][0], B.pts[k][1], B.z);
        const b0 = new THREE.Vector3(B.pts[j][0], B.pts[j][1], B.z);
        acc.add(
          new THREE.Vector3()
            .crossVectors(a1.clone().sub(a0), b1.clone().sub(a0))
            .add(
              new THREE.Vector3().crossVectors(
                b1.clone().sub(a0),
                b0.clone().sub(a0),
              ),
            ),
        );
      }
      if (acc.lengthSq() < 1e-9) continue;
      acc.normalize();
      const ax = Math.abs(acc.x);
      const ay = Math.abs(acc.y);
      const az = Math.abs(acc.z);
      const m = Math.max(ax, ay, az);
      if (m < 0.9) mode[j] = 3;
      else mode[j] = ay === m ? 0 : ax === m ? 1 : 2;
    }
  }
  const uvFor = (p, md, t, len) => {
    switch (md) {
      case 0:
        return [p[0] * uv, p[2] * uv];
      case 1:
        return [p[2] * uv, p[1] * uv];
      case 2:
        return [p[0] * uv, p[1] * uv];
      default:
        return [p[2] * uv, t * len * uv];
    }
  };
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
      let uvs = null;
      if (uv) {
        const la = d2(A.pts[j], A.pts[k]);
        const lb = d2(B.pts[j], B.pts[k]);
        const md = mode[j];
        const ua0 = uvFor(a0, md, 0, la);
        const ua1 = uvFor(a1, md, 1, la);
        const ub0 = uvFor(b0, md, 0, lb);
        const ub1 = uvFor(b1, md, 1, lb);
        uvs = [ua0, ua1, ub1, ua0, ub1, ub0];
      }
      push(tg[j], [a0, a1, b1, a0, b1, b0], uvs);
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
      const verts = order.map((p) => [p[0], p[1], sec.z]);
      push(capTag, verts, uv ? verts.map((p) => [p[0] * uv, p[1] * uv]) : null);
    }
  };
  if (capStart) cap(secs[0], -1);
  if (capEnd) cap(secs[secs.length - 1], 1);
  const out = {};
  for (const [tag, b] of buckets) out[tag] = geoFrom(b.pos, uv ? b.uv : null);
  return out;
}

/**
 * Surface frame on a loft: position and orthonormal frame on the strip of profile edge `j`, at parameter
 * `t` (0..1 along the edge) and depth `z`. `n` points out of the hull, `v` runs along z, `u` along the edge.
 * The position and normal are taken on the strip's actual two triangles (diagonal a0-b1, as loftProfile
 * builds them), not on the bilinear patch: tapering strips are twisted by metres, and detail placed on
 * the patch would sink into one triangle and float over the other.
 */
export function loftFrame(sections, j, t, z) {
  let i = 0;
  while (i + 2 < sections.length && sections[i + 1].z < z) i++;
  const A = sections[i];
  const B = sections[i + 1];
  const f = clamp((z - A.z) / (B.z - A.z), 0, 1);
  const np = A.pts.length;
  const k = (j + 1) % np;
  const a0 = new THREE.Vector3(A.pts[j][0], A.pts[j][1], A.z);
  const a1 = new THREE.Vector3(A.pts[k][0], A.pts[k][1], A.z);
  const b0 = new THREE.Vector3(B.pts[j][0], B.pts[j][1], B.z);
  const b1 = new THREE.Vector3(B.pts[k][0], B.pts[k][1], B.z);
  const e1 = b1.clone().sub(a0);
  const p = a0.clone();
  const nrm = new THREE.Vector3();
  if (t >= f) {
    const e0 = a1.clone().sub(a0);
    p.addScaledVector(e0, t - f).addScaledVector(e1, f);
    nrm.crossVectors(e0, e1);
  } else {
    const e2 = b0.clone().sub(a0);
    p.addScaledVector(e1, t).addScaledVector(e2, f - t);
    nrm.crossVectors(e1, e2);
  }
  if (nrm.lengthSq() < 1e-12) {
    // degenerate triangle (collapsed edge): fall back to the patch normal
    const ea = a1.clone().sub(a0).setZ(0);
    const eb = b1.clone().sub(b0).setZ(0);
    const uu = ea.lerp(eb, f);
    nrm.crossVectors(uu, new THREE.Vector3(0, 0, 1));
  }
  nrm.normalize();
  const pa = a0.clone().lerp(a1, t);
  const pb = b0.clone().lerp(b1, t);
  const v = pb.sub(pa).normalize();
  v.addScaledVector(nrm, -v.dot(nrm)).normalize();
  const u = new THREE.Vector3().crossVectors(v, nrm).normalize();
  return { p, n: nrm, u, v };
}

// Length of profile edge j at depth z (interpolated between sections).
export function loftEdgeLength(sections, j, z) {
  let i = 0;
  while (i + 2 < sections.length && sections[i + 1].z < z) i++;
  const A = sections[i];
  const B = sections[i + 1];
  const f = clamp((z - A.z) / (B.z - A.z), 0, 1);
  const k = (j + 1) % A.pts.length;
  const p0 = [
    lerp(A.pts[j][0], B.pts[j][0], f),
    lerp(A.pts[j][1], B.pts[j][1], f),
  ];
  const p1 = [
    lerp(A.pts[k][0], B.pts[k][0], f),
    lerp(A.pts[k][1], B.pts[k][1], f),
  ];
  return Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
}

/**
 * Wrap a flat geometry (in its own XY plane, metres) onto the strip of profile edge `j`: x runs along the
 * edge from parameter t0 at depth z0, y runs along z. Vertices are lifted `lift` metres off the surface, so
 * decals stay flush on twisted strips where a flat quad would sink at the corners.
 */
export function mapToLoft(sections, j, t0, z0, geo, lift = 0.3) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const a = pos.getX(i);
    const z = z0 + pos.getY(i);
    const len = loftEdgeLength(sections, j, z);
    const fr = loftFrame(sections, j, t0 + a / len, z);
    const p = fr.p.addScaledVector(fr.n, lift);
    pos.setXYZ(i, p.x, p.y, p.z);
  }
  pos.needsUpdate = true;
  g.deleteAttribute("normal");
  g.computeVertexNormals();
  return g;
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

/**
 * Raised armour plate with bevelled edges, local space: base w x d on the xz plane at y = -sink (inside
 * the hull), top (w - 2b) x (d - 2b) at y = h. No bottom face (10 triangles). UVs are baked in metres x
 * `texel` with a per-plate offset so tiled plating never repeats plate to plate; the sides map along
 * their length so nothing stretches. Position with `applyMatrix4(frameMatrix(...))` and keep the UVs
 * (`part(..., { uv: "keep" })`).
 */
export function bevelPlate(
  w,
  d,
  h,
  bevel = 0.6,
  { texel = 1 / 16, sink = 0.3, u0 = 0, v0 = 0 } = {},
) {
  const b = Math.min(bevel, w * 0.45, d * 0.45);
  const x0 = -w / 2;
  const x1 = w / 2;
  const z0 = -d / 2;
  const z1 = d / 2;
  const yb = -sink;
  const pos = [];
  const uv = [];
  const tri = (a, b_, c, ua, ub, uc) => {
    pos.push(...a, ...b_, ...c);
    uv.push(...ua, ...ub, ...uc);
  };
  const top = (x, z) => [x, h, z];
  const bot = (x, z) => [x, yb, z];
  const tuv = (x, z) => [(x + u0) * texel, (z + v0) * texel];
  // top face (counter-clockwise seen from +y)
  const A = [x0 + b, z0 + b];
  const B = [x1 - b, z0 + b];
  const C = [x1 - b, z1 - b];
  const D = [x0 + b, z1 - b];
  tri(top(...A), top(...C), top(...B), tuv(...A), tuv(...C), tuv(...B));
  tri(top(...A), top(...D), top(...C), tuv(...A), tuv(...D), tuv(...C));
  const hh = h + sink;
  // side quads: p0,p1 run along the bottom edge so that (p1 - p0) x up points outward; p2,p3 top
  const side = (p0, p1, p2, p3, s0, s1) => {
    tri(p0, p1, p2, [s0 * texel, 0], [s1 * texel, 0], [s1 * texel, hh * texel]);
    tri(
      p0,
      p2,
      p3,
      [s0 * texel, 0],
      [s1 * texel, hh * texel],
      [s0 * texel, hh * texel],
    );
  };
  // +x: bottom edge runs -z
  side(bot(x1, z1), bot(x1, z0), top(...B), top(...C), z1 + v0, z0 + v0);
  // -x: bottom edge runs +z
  side(bot(x0, z0), bot(x0, z1), top(...D), top(...A), z0 + v0, z1 + v0);
  // +z: bottom edge runs +x
  side(bot(x0, z1), bot(x1, z1), top(...C), top(...D), x0 + u0, x1 + u0);
  // -z: bottom edge runs -x
  side(bot(x1, z0), bot(x0, z0), top(...A), top(...B), x1 + u0, x0 + u0);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
}

// Bevelled plate sitting on a surface frame (base centre at the frame point, plus offsets along u/v).
export function framePlate(frame, w, d, h, bevel, opts = {}, du = 0, dv = 0) {
  const g = bevelPlate(w, d, h, bevel, {
    ...opts,
    u0: opts.u0 ?? frame.p.x + du,
    v0: opts.v0 ?? frame.p.z + dv,
  });
  const p = frame.p
    .clone()
    .addScaledVector(frame.u, du)
    .addScaledVector(frame.v, dv);
  g.applyMatrix4(frameMatrix(p, frame.n, frame.v));
  return g;
}

// Axis-aligned bevelled plate from min/max corners (x/z footprint, y from the surface up to y1).
export function plateMM(x0, x1, z0, z1, ySurf, h, bevel = 0.6, opts = {}) {
  const g = bevelPlate(x1 - x0, z1 - z0, h, bevel, {
    ...opts,
    u0: (x0 + x1) / 2,
    v0: (z0 + z1) / 2,
  });
  g.translate((x0 + x1) / 2, ySurf, (z0 + z1) / 2);
  return g;
}

/**
 * Flat decal lying on a surface frame, `w` along u and `d` along v, lifted `lift` metres. Vertex colours
 * come from `colorFn(u, v, color)` with u, v in -1..1, so a streak or scorch can fade to the base tint at
 * its border (the same plating texture underneath makes it read as stained armour, not a sticker).
 */
export function tintDecal(
  frame,
  w,
  d,
  colorFn,
  { nu = 2, nv = 4, lift = 0.1 } = {},
) {
  const g = new THREE.PlaneGeometry(w, d, nu, nv).toNonIndexed();
  g.rotateX(-Math.PI / 2); // lie in xz, normal +y; plane v (height) becomes -z
  const pos = g.attributes.position;
  const col = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const u = pos.getX(i) / (w / 2);
    const v = pos.getZ(i) / (d / 2);
    colorFn(u, v, c);
    col[i * 3] = c.r;
    col[i * 3 + 1] = c.g;
    col[i * 3 + 2] = c.b;
  }
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  const p = frame.p.clone().addScaledVector(frame.n, lift);
  g.applyMatrix4(frameMatrix(p, frame.n, frame.v));
  return g;
}

// Scorch weight along the radius (0 = centre, 1 = rim): a blast core, a lighter halo, a soot ring at
// ~70 % and a soft fade to the base at the rim — an impact burn rather than a blurred dark spot.
export function scorchWeight(k) {
  const core = Math.max(0, 1 - k / 0.3) ** 1.2;
  const ring = Math.exp(-(((k - 0.7) / 0.14) ** 2));
  const haze = Math.max(0, 1 - k) * 0.35;
  return Math.min(1, 0.95 * core + 0.8 * ring + haze);
}

/**
 * Scorch disc in the xy plane facing +z (non-indexed), `rings` radial subdivisions so the profile above
 * is actually sampled: vertex colours mix `outer` (the base tint, [r, g, b]) toward `inner` (full soot).
 */
export function scorchDisc(r, inner, outer, seg = 14, rings = 6) {
  const g = new THREE.RingGeometry(r * 0.02, r, seg, rings).toNonIndexed();
  const pos = g.attributes.position;
  const col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const k = Math.min(1, Math.hypot(pos.getX(i), pos.getY(i)) / r);
    const w = scorchWeight(k);
    col[i * 3] = lerp(outer[0], inner[0], w);
    col[i * 3 + 1] = lerp(outer[1], inner[1], w);
    col[i * 3 + 2] = lerp(outer[2], inner[2], w);
  }
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  return g;
}

// Round scorch decal lying on a surface frame, `inner` soot at the core and ring, `outer` base at the rim.
export function scorchDecal(frame, r, inner, outer, seg = 14, lift = 0.1) {
  const g = scorchDisc(r, inner, outer, seg);
  g.rotateX(-Math.PI / 2);
  const p = frame.p.clone().addScaledVector(frame.n, lift);
  g.applyMatrix4(frameMatrix(p, frame.n, frame.v));
  return g;
}

// Thin panel-line groove on a surface frame: a 2-triangle strip `w` wide and `len` long (along v),
// lifted just off the surface. Dark material makes it read as a recessed seam.
export function groove(frame, w, len, { du = 0, dv = 0, lift = 0.06 } = {}) {
  const g = new THREE.PlaneGeometry(w, len).toNonIndexed();
  g.rotateX(-Math.PI / 2);
  const p = frame.p
    .clone()
    .addScaledVector(frame.u, du)
    .addScaledVector(frame.v, dv)
    .addScaledVector(frame.n, lift);
  g.applyMatrix4(frameMatrix(p, frame.n, frame.v));
  return g;
}

// Axis-aligned groove on a horizontal surface at height y, from (x0,z0) to (x1,z1) (one of them thin).
export function grooveMM(x0, x1, z0, z1, y, lift = 0.06) {
  const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0).toNonIndexed();
  g.rotateX(-Math.PI / 2);
  g.translate((x0 + x1) / 2, y + lift, (z0 + z1) / 2);
  return g;
}

// Low-poly faceted dome (flat-shaded rings of an n-gon), radius r, height h, base centre at the origin.
export function facetedDome(r, h, n = 8, rings = 3) {
  const secs = [];
  for (let i = 0; i <= rings; i++) {
    const a = (i / rings) * (Math.PI / 2);
    const rr = Math.max(0.15 * r, r * Math.cos(a));
    const y = h * Math.sin(a);
    const pts = [];
    for (let k = 0; k < n; k++) {
      const t = (k / n) * Math.PI * 2 + Math.PI / n;
      pts.push([rr * Math.cos(t), -(rr * Math.sin(t))]);
    }
    secs.push({ z: y, pts });
  }
  const out = loftProfile(
    secs.map((s) => ({ z: s.z, pts: s.pts })),
    { capStart: false, capEnd: true },
  );
  const g = out.hull;
  g.rotateX(-Math.PI / 2);
  return g;
}

// Single quad (2 triangles) of w x h at `center`, facing `dir`, with `up` as its vertical.
export function quadFacing(center, dir, up, w, h) {
  const g = new THREE.PlaneGeometry(w, h);
  const z = new THREE.Vector3(...dir).normalize();
  let y = new THREE.Vector3(...up);
  y.addScaledVector(z, -y.dot(z));
  if (y.lengthSq() < 1e-8)
    y =
      Math.abs(z.y) < 0.9
        ? new THREE.Vector3(0, 1, 0)
        : new THREE.Vector3(1, 0, 0);
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

// Cylinder of radius r from point a to point b (Vector3 or [x, y, z]); `open` drops the end caps for
// runs whose ends are buried or butt against the next segment.
export function tube(a, b, r, seg = 6, open = false) {
  const pa = a.isVector3 ? a : new THREE.Vector3(...a);
  const pb = b.isVector3 ? b : new THREE.Vector3(...b);
  const d = pb.clone().sub(pa);
  const len = d.length();
  const g = new THREE.CylinderGeometry(r, r, len, seg, 1, open);
  const q = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    d.normalize(),
  );
  g.applyQuaternion(q);
  g.translate((pa.x + pb.x) / 2, (pa.y + pb.y) / 2, (pa.z + pb.z) / 2);
  return g;
}

/**
 * Engine nozzle bell along +z (aft), mouth plane at z = `lip`. Returns { dark: [geometries], mouth: z }:
 * a flared shroud, the rim, an interior wall receding `depth` metres into the hull with stiffening rings
 * and vanes, and a throat plate, so the bell has real depth from any angle. The glow and plume are drawn
 * by the fleet's shared engine-plume system from the model's `engines[]` entries, not here.
 * detail 0 = far LOD (shroud + closing disc), 1 = interior wall + rings, 2 = vanes + lip collar.
 */
export function nozzle(
  r,
  { depth = null, lip = null, seg = 20, rings = 2, vanes = 8, detail = 2 } = {},
) {
  depth = depth ?? r * 1.1;
  lip = lip ?? r * 0.45;
  const dark = [];
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
  } else {
    // far LOD: a flat dark disc closes the shroud just inside the mouth
    const plate = new THREE.CircleGeometry(r * 1.06, seg);
    plate.translate(0, 0, -1);
    dark.push(plate.toNonIndexed());
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
    // lip collar: a thicker band around the mouth with four clamp lugs
    dark.push(
      cylZ(r * 1.14, r * 1.2, r * 0.12, seg, true).translate(
        0,
        0,
        lip - r * 0.06,
      ),
    );
    for (let i = 0; i < 4; i++) {
      const g = new THREE.BoxGeometry(r * 0.12, r * 0.1, r * 0.3);
      g.translate(0, r * 1.18, lip - r * 0.2);
      g.rotateZ((i / 4) * Math.PI * 2 + Math.PI / 4);
      dark.push(g);
    }
  }
  return { dark, mouth: lip };
}

// Paint per-vertex colours from a function of position: fn(x, y, z, color, nx, ny, nz) mutates `color`
// (the normal is the face normal on non-indexed geometry, so faces can be tinted by orientation).
export function shadeGeometry(geo, fn) {
  const pos = geo.attributes.position;
  if (!geo.attributes.normal) geo.computeVertexNormals();
  const nor = geo.attributes.normal;
  let col = geo.attributes.color;
  if (!col) {
    col = new THREE.BufferAttribute(new Float32Array(pos.count * 3).fill(1), 3);
    geo.setAttribute("color", col);
  }
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    c.setRGB(col.getX(i), col.getY(i), col.getZ(i));
    fn(
      pos.getX(i),
      pos.getY(i),
      pos.getZ(i),
      c,
      nor.getX(i),
      nor.getY(i),
      nor.getZ(i),
    );
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
export function partition(
  rand,
  rect,
  { max, min = max * 0.3, keep = 0.18 } = {},
) {
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

// Linear-space tint (vertex colours multiply the material's linear albedo; hex colours would be treated
// as sRGB and converted, so hull tints that must hit a measured albedo are given in linear directly).
export function lin(r, g, b) {
  return new THREE.Color().setRGB(r, g, b, THREE.LinearSRGBColorSpace);
}

export function mixColor(a, b, t) {
  const ca = new THREE.Color(a);
  const cb = new THREE.Color(b);
  return ca.lerp(cb, clamp(t, 0, 1));
}

/**
 * Loft along +y: `secs` = [{ y, pts: [[x, z], ...] }] (plan-view polygons, same point count, sorted by
 * y). Built with loftProfile along z then rotated, so `tags` per edge and `uv` work the same way (the
 * along-strip mapping keeps plating unstretched on sloped faces). Returns { tag: geometry }.
 */
export function yLoft(secs, opts = {}) {
  const out = loftProfile(
    secs.map(({ y, pts }) => ({ z: y, pts: pts.map(([x, z]) => [x, -z]) })),
    opts,
  );
  for (const g of Object.values(out)) g.rotateX(-Math.PI / 2);
  return out;
}

/**
 * Flat strip lying on a (possibly sloping) deck: quads between consecutive samples of `zrs`, spanning
 * x from xa(zr) to xb(zr) at height y(zr) (+lift), depth z = zOf(zr). Faces +y. Skips samples where the
 * strip would be narrower than `minW`.
 */
export function deckStrip(zrs, xa, xb, y, zOf, { lift = 0.15, minW = 2 } = {}) {
  const pos = [];
  for (let i = 0; i + 1 < zrs.length; i++) {
    const z0 = zrs[i];
    const z1 = zrs[i + 1];
    let a0 = xa(z0);
    let b0 = xb(z0);
    let a1 = xa(z1);
    let b1 = xb(z1);
    if (a0 > b0) [a0, b0] = [b0, a0];
    if (a1 > b1) [a1, b1] = [b1, a1];
    if (b0 - a0 < minW && b1 - a1 < minW) continue;
    const y0 = y(z0) + lift;
    const y1 = y(z1) + lift;
    const P00 = [a0, y0, zOf(z0)];
    const P10 = [b0, y0, zOf(z0)];
    const P01 = [a1, y1, zOf(z1)];
    const P11 = [b1, y1, zOf(z1)];
    pos.push(...P00, ...P11, ...P10, ...P00, ...P01, ...P11);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

// Flat polygon in the xz plane at height y (plan points [[x, z]], any winding), facing +y.
export function flatPoly(points, y) {
  const contour = points.map(([x, z]) => new THREE.Vector2(x, z));
  const tris = THREE.ShapeUtils.triangulateShape(contour, []);
  const pos = [];
  for (const [a, b, c] of tris) {
    const pa = points[a];
    const pb = points[b];
    const pc = points[c];
    // orient so the normal is +y: in the xz plane with y up, (b-a) x (c-a) has y = -(dxb*dzc - dxc*dzb)
    const cr =
      (pb[0] - pa[0]) * (pc[1] - pa[1]) - (pc[0] - pa[0]) * (pb[1] - pa[1]);
    const order = cr < 0 ? [pa, pb, pc] : [pa, pc, pb];
    for (const p of order) pos.push(p[0], y, p[1]);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

/**
 * Prism from a plan polygon: bottom at y0 (polygon `pts`, [[x, z]]), top at y1 (polygon `top`, same
 * point count, defaults to the bottom shrunk by `inset` toward its centroid). Side strips are tagged
 * per edge with `tags` (default "hull"), the top cap with `capTag`; no bottom cap (it sits on a deck).
 */
export function prismPoly(
  pts,
  y0,
  y1,
  { top = null, inset = 0, tags = null, capTag = "hull", uv = null } = {},
) {
  let tp = top;
  if (!tp) {
    let cx = 0;
    let cz = 0;
    for (const p of pts) {
      cx += p[0];
      cz += p[1];
    }
    cx /= pts.length;
    cz /= pts.length;
    tp = pts.map(([x, z]) => {
      const dx = x - cx;
      const dz = z - cz;
      const d = Math.hypot(dx, dz) || 1;
      const k = Math.max(0, 1 - inset / d);
      return [cx + dx * k, cz + dz * k];
    });
  }
  return yLoft(
    [
      { y: y0, pts },
      { y: y1, pts: tp },
    ],
    { tags, capStart: false, capEnd: true, capTag, uv },
  );
}
