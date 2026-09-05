// Procedural geometry helpers shared by the Separatist Munificent and Recusant models: closed/open
// profile sweeps along curves (smooth or flat normals, optional caps, arc-length UVs so plating never
// stretches), lofts along z, per-face planar UVs, gradient tints, oriented bars and quads, frame rims
// for recessed window slots, concave sensor dishes, open box interiors for bays, strips that hug a
// surface (soot streaks), scorch discs, and a part wrapper that keeps the shipKit part contract
// ({ geo, mat, lod, name }) while using those UVs and tints.
import * as THREE from "three";
import { tintGeometry } from "../fleet.js";

const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _c = new THREE.Vector3();
const _n = new THREE.Vector3();

// ---------------------------------------------------------------------------
// profiles: polygons in [-1, 1]^2 as [u, v] pairs, counter-clockwise (u right, v up)
// ---------------------------------------------------------------------------

// rounded rectangle with k segments per corner; rx / ry are the corner radii as fractions of the half size
export function roundedRect(k = 3, rx = 0.3, ry = rx) {
  const pts = [];
  const cx = 1 - rx;
  const cy = 1 - ry;
  for (let c = 0; c < 4; c++) {
    const sx = c === 0 || c === 3 ? 1 : -1;
    const sy = c < 2 ? 1 : -1;
    const a0 = (c * Math.PI) / 2;
    for (let i = 0; i <= k; i++) {
      const a = a0 + ((i / k) * Math.PI) / 2;
      pts.push([sx * cx + rx * Math.cos(a), sy * cy + ry * Math.sin(a)]);
    }
  }
  return pts;
}

// |u|^p + |v|^p = 1 (p = 2 circle, larger = squarer)
export function superellipse(n = 24, p = 2.5) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    pts.push(superellipsePoint(a, p));
  }
  return pts;
}
// point of the unit superellipse at parameter angle a (matches superellipse())
export function superellipsePoint(a, p = 2.5) {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [
    Math.sign(c) * Math.abs(c) ** (2 / p),
    Math.sign(s) * Math.abs(s) ** (2 / p),
  ];
}

// u extent of a superellipse at height v
export function superellipseU(v, p = 2.5) {
  const t = Math.min(1, Math.abs(v));
  return (1 - t ** p) ** (1 / p);
}

// rounded rectangle whose top carries a trapezoidal channel (rim half-width w1, floor half-width w0,
// depth d); returns { hull, channel } open strips that together close the section, plus the full loop
// and the hull split into two flank strips with the bottom (|u| < wb) left open for a recessed bay
export function channelRect(k, rx, ry, w1, w0, d, wb = 0.42) {
  const rr = roundedRect(k, rx, ry);
  const per = k + 1;
  const arc0 = rr.slice(0, per); // right-top corner (0..90°)
  const arc1 = rr.slice(per, 2 * per); // left-top
  const arc2 = rr.slice(2 * per, 3 * per);
  const arc3 = rr.slice(3 * per, 4 * per);
  const notch = [
    [w1, 1],
    [w0, 1 - d],
    [-w0, 1 - d],
    [-w1, 1],
  ];
  const hull = [[-w1, 1], ...arc1, ...arc2, ...arc3, ...arc0, [w1, 1]];
  return {
    hull,
    channel: notch,
    loop: [...arc0, ...notch, ...arc1, ...arc2, ...arc3],
    hullLeft: [[-w1, 1], ...arc1, ...arc2, [-wb, -1]],
    hullRight: [[wb, -1], ...arc3, ...arc0, [w1, 1]],
  };
}

// fin blade section: wide root at v = -1 tapering to a rounded edge at v = 1 (root is meant to be buried)
export function blade() {
  return [
    [1, -1],
    [1, -0.55],
    [0.78, 0.1],
    [0.5, 0.62],
    [0.22, 0.92],
    [0, 1],
    [-0.22, 0.92],
    [-0.5, 0.62],
    [-0.78, 0.1],
    [-1, -0.55],
    [-1, -1],
  ];
}
// half thickness fraction of blade() at height v
export function bladeU(v) {
  const b = blade();
  for (let i = 0; i + 1 < 6; i++) {
    const [u0, v0] = b[i];
    const [u1, v1] = b[i + 1];
    if (v >= v0 && v <= v1) return u0 + ((v - v0) / (v1 - v0)) * (u1 - u0);
  }
  return v < -1 ? 1 : 0;
}

// flattened octagon: a slab with bevelled edges
export function slabProfile(bevel = 0.3, sideV = 0.35) {
  return [
    [1, -sideV],
    [1, sideV],
    [1 - bevel, 1],
    [-(1 - bevel), 1],
    [-1, sideV],
    [-1, -sideV],
    [-(1 - bevel), -1],
    [1 - bevel, -1],
  ];
}

// lens-like wing section: full thickness over the centre, thin swept tips (tip thickness = tipV)
export function wingProfile(tipV = 0.08, shoulder = 0.7) {
  return [
    [1, -tipV],
    [1, tipV],
    [shoulder, 0.78],
    [0.32, 1],
    [-0.32, 1],
    [-shoulder, 0.78],
    [-1, tipV],
    [-1, -tipV],
    [-shoulder, -0.78],
    [-0.32, -1],
    [0.32, -1],
    [shoulder, -0.78],
  ];
}

export function mirrorV(profile) {
  return profile.map(([u, v]) => [u, -v]).reverse();
}
export function scaleProfile(profile, su, sv = su) {
  return profile.map(([u, v]) => [u * su, v * sv]);
}
export function offsetProfile(profile, du, dv) {
  return profile.map(([u, v]) => [u + du, v + dv]);
}
// sub-range of a closed profile (indices i0..i1 inclusive, wrapping) as an open strip
export function strip(profile, i0, i1) {
  const out = [];
  const m = profile.length;
  let i = i0;
  for (;;) {
    out.push(profile[i]);
    if (i === i1) break;
    i = (i + 1) % m;
  }
  return out;
}

// ---------------------------------------------------------------------------
// sweeps
// ---------------------------------------------------------------------------

/**
 * Sweep a profile along stations. Each station: { p: [x,y,z], sx, sy, t?: tangent, up?: up hint, roll? }.
 * Frame: N = up × T (profile u), B = T × N (profile v). Closed profiles get side quads all round and
 * optional flat caps; open profiles are strips. Smooth normals unless `flat`. With `texel`, UVs are
 * written from the profile arc length and the path length in metres (× texel) so plating never
 * stretches on curved or slanted faces; pass uv: "keep" to mpart in that case.
 */
export function sweep(profile, stations, opts = {}) {
  const {
    closed = true,
    capStart = false,
    capEnd = false,
    flat = false,
    up = [0, 1, 0],
    texel = 0,
    vOffset = 0,
  } = opts;
  const n = stations.length;
  const m = profile.length;
  const R = closed ? m + 1 : m; // closed rings repeat the seam vertex so UVs do not wrap
  const pos = [];
  const uvs = [];
  const centres = [];
  const U0 = new THREE.Vector3(...up);
  const T = new THREE.Vector3();
  const N = new THREE.Vector3();
  const B = new THREE.Vector3();
  const P = new THREE.Vector3();
  const U = new THREE.Vector3();
  let pathLen = vOffset;
  for (let i = 0; i < n; i++) {
    const s = stations[i];
    P.set(s.p[0], s.p[1], s.p[2]);
    if (s.t) T.set(s.t[0], s.t[1], s.t[2]).normalize();
    else {
      const prev = stations[Math.max(0, i - 1)].p;
      const next = stations[Math.min(n - 1, i + 1)].p;
      T.set(
        next[0] - prev[0],
        next[1] - prev[1],
        next[2] - prev[2],
      ).normalize();
    }
    if (s.up) U.set(s.up[0], s.up[1], s.up[2]);
    else U.copy(U0);
    N.crossVectors(U, T).normalize();
    B.crossVectors(T, N).normalize();
    if (s.roll) {
      const q = new THREE.Quaternion().setFromAxisAngle(T, s.roll);
      N.applyQuaternion(q);
      B.applyQuaternion(q);
    }
    if (i > 0) pathLen += P.distanceTo(centres[i - 1]);
    centres.push(P.clone());
    let arc = 0;
    for (let j = 0; j < R; j++) {
      const [u, v] = profile[j % m];
      if (j > 0) {
        const [u0, v0] = profile[(j - 1) % m];
        arc += Math.hypot((u - u0) * s.sx, (v - v0) * s.sy);
      }
      pos.push(
        P.x + N.x * u * s.sx + B.x * v * s.sy,
        P.y + N.y * u * s.sx + B.y * v * s.sy,
        P.z + N.z * u * s.sx + B.z * v * s.sy,
      );
      uvs.push(arc * texel, pathLen * texel);
    }
  }
  const idx = [];
  for (let i = 0; i + 1 < n; i++) {
    for (let j = 0; j + 1 < R; j++) {
      const a = i * R + j;
      const b = i * R + j + 1;
      const c = (i + 1) * R + j + 1;
      const d = (i + 1) * R + j;
      idx.push(a, b, c, a, c, d);
    }
  }
  const cap = (i, forward) => {
    const base = pos.length / 3;
    const c = centres[i];
    const s = stations[i];
    pos.push(c.x, c.y, c.z);
    uvs.push(0, 0);
    for (let j = 0; j < m; j++) {
      const k = (i * R + j) * 3;
      pos.push(pos[k], pos[k + 1], pos[k + 2]);
      uvs.push(profile[j][0] * s.sx * texel, profile[j][1] * s.sy * texel);
    }
    for (let j = 0; j < m; j++) {
      const j1 = (j + 1) % m;
      if (forward) idx.push(base, base + 1 + j, base + 1 + j1);
      else idx.push(base, base + 1 + j1, base + 1 + j);
    }
  };
  if (closed && capStart) cap(0, false);
  if (closed && capEnd) cap(n - 1, true);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  if (texel) g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(idx);
  if (flat) {
    const ng = g.toNonIndexed();
    ng.computeVertexNormals();
    return ng;
  }
  g.computeVertexNormals();
  if (closed) {
    // the repeated seam vertex must share the averaged normal or a crease shows along the seam
    const nor = g.attributes.normal;
    for (let i = 0; i < n; i++) {
      const a = i * R;
      const b = i * R + m;
      _a.fromBufferAttribute(nor, a).add(_b.fromBufferAttribute(nor, b));
      _a.normalize();
      nor.setXYZ(a, _a.x, _a.y, _a.z);
      nor.setXYZ(b, _a.x, _a.y, _a.z);
    }
  }
  return g.toNonIndexed();
}

// loft along +z: stations { z, sx, sy, x = 0, y = 0 }; rings stay perpendicular to z
export function loftZ(profile, stations, opts = {}) {
  return sweep(
    profile,
    stations.map((s) => ({
      p: [s.x || 0, s.y || 0, s.z],
      sx: s.sx,
      sy: s.sy,
      t: [0, 0, 1],
      roll: s.roll,
    })),
    opts,
  );
}

// flat ring frame between z0 and z1: outer and inner closed loops (same point count, CCW, in metres)
export function ringZ(outer, inner, z0, z1) {
  const m = outer.length;
  const pos = [];
  const quad = (a, b, c, d) => pos.push(...a, ...b, ...c, ...a, ...c, ...d);
  for (let i = 0; i < m; i++) {
    const j = (i + 1) % m;
    const o0 = [outer[i][0], outer[i][1], z0];
    const o1 = [outer[j][0], outer[j][1], z0];
    const n0 = [inner[i][0], inner[i][1], z0];
    const n1 = [inner[j][0], inner[j][1], z0];
    const O0 = [outer[i][0], outer[i][1], z1];
    const O1 = [outer[j][0], outer[j][1], z1];
    const N0 = [inner[i][0], inner[i][1], z1];
    const N1 = [inner[j][0], inner[j][1], z1];
    quad(o0, n0, n1, o1); // front face (-z)
    quad(O0, O1, N1, N0); // back face (+z)
    quad(o0, o1, O1, O0); // outer side
    quad(n0, N0, N1, n1); // inner side
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

// chamfered rectangle in metres: half sizes w, h; c = fraction of the side kept straight
export function octagon(w, h, c = 0.6) {
  return [
    [w, -c * h],
    [w, c * h],
    [c * w, h],
    [-c * w, h],
    [-w, c * h],
    [-w, -c * h],
    [-c * w, -h],
    [c * w, -h],
  ];
}

// flat plate: a closed profile extruded between z0 and z1 with both caps
export function plateZ(profile, sx, sy, z0, z1, x = 0, y = 0) {
  return loftZ(
    profile,
    [
      { z: z0, sx, sy, x, y },
      { z: z1, sx, sy, x, y },
    ],
    { capStart: true, capEnd: true, flat: true },
  );
}

// linear interpolation on a [[t, value], ...] table
export function table(rows, t) {
  if (t <= rows[0][0]) return rows[0][1];
  for (let i = 0; i + 1 < rows.length; i++) {
    const [t0, v0] = rows[i];
    const [t1, v1] = rows[i + 1];
    if (t <= t1) return v0 + ((t - t0) / (t1 - t0)) * (v1 - v0);
  }
  return rows[rows.length - 1][1];
}

// ---------------------------------------------------------------------------
// primitives
// ---------------------------------------------------------------------------

// box from p0 to p1 with cross-section w (local x) by h (local y)
export function bar(p0, p1, w, h = w) {
  const a = new THREE.Vector3(...p0);
  const b = new THREE.Vector3(...p1);
  const d = b.clone().sub(a);
  const len = d.length();
  const g = new THREE.BoxGeometry(w, h, len);
  const q = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 0, 1),
    d.normalize(),
  );
  g.applyQuaternion(q);
  g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
  return g;
}

// disc facing +z (aft) — engine glow
export function discZ(r, n, x, y, z) {
  const g = new THREE.CircleGeometry(r, n);
  g.translate(x, y, z);
  return g;
}

// cone/cylinder along z: r0 at the +z end, r1 at the -z end, centred on (x, y, zc)
export function tubeZ(r0, r1, len, seg, x, y, zc, open = true) {
  const g = new THREE.CylinderGeometry(r0, r1, len, seg, 1, open);
  g.rotateX(Math.PI / 2);
  g.translate(x, y, zc);
  return g;
}

// reverse winding (and normals) so a shell is seen from the inside
export function flipFaces(geo) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  const pos = g.attributes.position;
  for (let t = 0; t < pos.count; t += 3) {
    const bx = pos.getX(t + 1);
    const by = pos.getY(t + 1);
    const bz = pos.getZ(t + 1);
    pos.setXYZ(t + 1, pos.getX(t + 2), pos.getY(t + 2), pos.getZ(t + 2));
    pos.setXYZ(t + 2, bx, by, bz);
  }
  if (g.attributes.uv) {
    const uv = g.attributes.uv;
    for (let t = 0; t < uv.count; t += 3) {
      const u = uv.getX(t + 1);
      const v = uv.getY(t + 1);
      uv.setXY(t + 1, uv.getX(t + 2), uv.getY(t + 2));
      uv.setXY(t + 2, u, v);
    }
  }
  g.deleteAttribute("normal");
  g.computeVertexNormals();
  return g;
}

// orthonormal frame for a surface patch: n = normal, a = along (projected), b = n × a
function patchFrame(normal, along) {
  const n = new THREE.Vector3(...normal).normalize();
  const a = new THREE.Vector3(...along);
  a.addScaledVector(n, -a.dot(n)).normalize();
  const b = new THREE.Vector3().crossVectors(n, a).normalize();
  return { n, a, b };
}

// flat quad centred at c, facing `normal`, `len` along `along` and `wid` across, lifted `lift` off c
export function quadAt(c, normal, along, len, wid, lift = 0) {
  const { n, a, b } = patchFrame(normal, along);
  const C = new THREE.Vector3(...c).addScaledVector(n, lift);
  const P = (sa, sb) =>
    C.clone()
      .addScaledVector(a, (sa * len) / 2)
      .addScaledVector(b, (sb * wid) / 2);
  const p0 = P(-1, -1);
  const p1 = P(1, -1);
  const p2 = P(1, 1);
  const p3 = P(-1, 1);
  const pos = [...p0, ...p2, ...p1, ...p0, ...p3, ...p2];
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  // orient toward the requested normal
  _a.fromBufferAttribute(g.attributes.normal, 0);
  if (_a.dot(n) < 0) return flipFaces(g);
  return g;
}

/**
 * Raised rim around a recessed slot: an outer rectangle len × wid standing `height` above the
 * surface point c, with an inner opening inset by `border`; the top face, the inner walls (down to
 * `floor`) and the outer walls are built. Used with a dark backing quad + a lit strip inside.
 */
export function frameAt(
  c,
  normal,
  along,
  len,
  wid,
  border,
  height,
  floor = 0.05,
) {
  const { n, a, b } = patchFrame(normal, along);
  const C = new THREE.Vector3(...c);
  const pt = (sa, sb, inset, h) =>
    C.clone()
      .addScaledVector(a, sa * (len / 2 - inset))
      .addScaledVector(b, sb * (wid / 2 - inset))
      .addScaledVector(n, h);
  const pos = [];
  const quad = (p0, p1, p2, p3) => {
    pos.push(...p0, ...p1, ...p2, ...p0, ...p2, ...p3);
  };
  const corners = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ];
  for (let i = 0; i < 4; i++) {
    const [sa0, sb0] = corners[i];
    const [sa1, sb1] = corners[(i + 1) % 4];
    // top face ring segment
    quad(
      pt(sa0, sb0, 0, height),
      pt(sa1, sb1, 0, height),
      pt(sa1, sb1, border, height),
      pt(sa0, sb0, border, height),
    );
    // inner wall (faces the opening)
    quad(
      pt(sa0, sb0, border, height),
      pt(sa1, sb1, border, height),
      pt(sa1, sb1, border, floor),
      pt(sa0, sb0, border, floor),
    );
    // outer wall
    quad(
      pt(sa1, sb1, 0, height),
      pt(sa0, sb0, 0, height),
      pt(sa0, sb0, 0, 0),
      pt(sa1, sb1, 0, 0),
    );
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  // the corner order gives outward normals when (a, b, n) is right-handed; fix if the top faces down
  const top = new THREE.Vector3().fromBufferAttribute(g.attributes.normal, 0);
  return top.dot(n) < 0 ? flipFaces(g) : g;
}

/**
 * Concave sensor dish: paraboloid of radius r and depth `depth`, opening toward +Y with the vertex at
 * the origin; both faces are built (a thin shell). `aim` orients +Y onto the aim direction.
 */
export function dishGeo(r, depth, seg = 16, rings = 4, aim = null, at = null) {
  const pos = [];
  const front = [];
  const back = [];
  const shell = 0.6;
  const ring = (k, off) => {
    const t = k / rings;
    const rr = r * t;
    const y = depth * t * t - off;
    const out = [];
    for (let j = 0; j < seg; j++) {
      const a = (j / seg) * Math.PI * 2;
      out.push([Math.cos(a) * rr, y, Math.sin(a) * rr]);
    }
    return out;
  };
  for (let k = 0; k <= rings; k++) {
    front.push(ring(k, 0));
    back.push(ring(k, shell));
  }
  const tri = (p0, p1, p2) => pos.push(...p0, ...p1, ...p2);
  for (let k = 0; k < rings; k++)
    for (let j = 0; j < seg; j++) {
      const j1 = (j + 1) % seg;
      // front (concave, faces +Y): counter-clockwise seen from +Y
      tri(front[k][j], front[k + 1][j1], front[k + 1][j]);
      tri(front[k][j], front[k][j1], front[k + 1][j1]);
      // back (convex, faces -Y)
      tri(back[k][j], back[k + 1][j], back[k + 1][j1]);
      tri(back[k][j], back[k + 1][j1], back[k][j1]);
    }
  // rim between the shells
  for (let j = 0; j < seg; j++) {
    const j1 = (j + 1) % seg;
    tri(front[rings][j], back[rings][j], back[rings][j1]);
    tri(front[rings][j], back[rings][j1], front[rings][j1]);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  if (aim) {
    const q = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(...aim).normalize(),
    );
    g.applyQuaternion(q);
  }
  if (at) g.translate(at[0], at[1], at[2]);
  return g;
}

/**
 * Interior of a recessed bay: five inward-facing walls of the box centred at c with half sizes h,
 * the `open` side ("-y", "+y", "-x", "+x", "-z", "+z") left out. Seen through the opening.
 */
export function openBoxInterior(c, h, open = "-y") {
  const [cx, cy, cz] = c;
  const [hx, hy, hz] = h;
  const V = (sx, sy, sz) => [cx + sx * hx, cy + sy * hy, cz + sz * hz];
  const pos = [];
  const quad = (p0, p1, p2, p3) =>
    pos.push(...p0, ...p1, ...p2, ...p0, ...p2, ...p3);
  // each face wound so its normal points into the box
  const faces = {
    "+y": () => quad(V(-1, 1, -1), V(1, 1, -1), V(1, 1, 1), V(-1, 1, 1)),
    "-y": () => quad(V(-1, -1, -1), V(-1, -1, 1), V(1, -1, 1), V(1, -1, -1)),
    "+x": () => quad(V(1, -1, -1), V(1, -1, 1), V(1, 1, 1), V(1, 1, -1)),
    "-x": () => quad(V(-1, -1, -1), V(-1, 1, -1), V(-1, 1, 1), V(-1, -1, 1)),
    "+z": () => quad(V(-1, -1, 1), V(-1, 1, 1), V(1, 1, 1), V(1, -1, 1)),
    "-z": () => quad(V(-1, -1, -1), V(1, -1, -1), V(1, 1, -1), V(-1, 1, -1)),
  };
  for (const k of Object.keys(faces)) if (k !== open) faces[k]();
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  // verify the +y face normal points down (inward); flip everything otherwise
  const nrm = g.attributes.normal;
  let flip = false;
  for (let i = 0; i < nrm.count; i++) {
    const py = g.attributes.position.getY(i);
    if (Math.abs(py - (cy + hy)) < 1e-4 && open !== "+y") {
      flip = nrm.getY(i) > 0;
      break;
    }
    if (Math.abs(py - (cy - hy)) < 1e-4 && open !== "-y") {
      flip = nrm.getY(i) < 0;
      break;
    }
  }
  return flip ? flipFaces(g) : g;
}

/**
 * Strip hugging a surface: `points` along the strip centre-line with matching outward `normals`;
 * `halfW` across (number or fn(i)); lifted `lift` above the surface. 5 vertices across so a tint
 * function can fade from the centre to the edges: tint(x, y, z, out, across) with across in [-1, 1].
 */
export function surfaceStrip(points, normals, halfW, lift = 0.3, across = 5) {
  const n = points.length;
  const pos = [];
  const acr = [];
  const side = new THREE.Vector3();
  const tan = new THREE.Vector3();
  const nor = new THREE.Vector3();
  const P = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[Math.min(n - 1, i + 1)];
    tan.set(p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]).normalize();
    nor.set(...normals[i]).normalize();
    side.crossVectors(nor, tan).normalize();
    const hw = typeof halfW === "function" ? halfW(i) : halfW;
    for (let k = 0; k < across; k++) {
      const t = (k / (across - 1)) * 2 - 1;
      P.set(...points[i])
        .addScaledVector(nor, lift)
        .addScaledVector(side, t * hw);
      pos.push(P.x, P.y, P.z);
      acr.push(t);
    }
  }
  const idx = [];
  for (let i = 0; i + 1 < n; i++)
    for (let k = 0; k + 1 < across; k++) {
      const a = i * across + k;
      const b = a + 1;
      const c = (i + 1) * across + k + 1;
      const d = (i + 1) * across + k;
      idx.push(a, b, c, a, c, d);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("across", new THREE.Float32BufferAttribute(acr, 1));
  g.setIndex(idx);
  g.computeVertexNormals();
  const ng = g.toNonIndexed();
  // faces must point along the surface normal, not into the hull
  _a.fromBufferAttribute(ng.attributes.normal, 0);
  _b.set(...normals[0]);
  return _a.dot(_b) < 0 ? flipFaces(ng) : ng;
}

// flat disc at c facing `normal` with a radial "across" attribute (0 centre .. 1 rim) for gradient tints
export function discAt(c, normal, r, seg = 14, lift = 0.3) {
  // "along" = the world axis least aligned with the normal
  const ax = [Math.abs(normal[0]), Math.abs(normal[1]), Math.abs(normal[2])];
  const k = ax.indexOf(Math.min(...ax));
  const along = [0, 0, 0];
  along[k] = 1;
  const { n, a, b } = patchFrame(normal, along);
  const C = new THREE.Vector3(...c).addScaledVector(n, lift);
  const pos = [];
  const acr = [];
  for (let j = 0; j < seg; j++) {
    const a0 = (j / seg) * Math.PI * 2;
    const a1 = ((j + 1) / seg) * Math.PI * 2;
    const p0 = C.clone()
      .addScaledVector(a, Math.cos(a0) * r)
      .addScaledVector(b, Math.sin(a0) * r);
    const p1 = C.clone()
      .addScaledVector(a, Math.cos(a1) * r)
      .addScaledVector(b, Math.sin(a1) * r);
    pos.push(C.x, C.y, C.z, ...p0, ...p1);
    acr.push(0, 1, 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("across", new THREE.Float32BufferAttribute(acr, 1));
  g.computeVertexNormals();
  _a.fromBufferAttribute(g.attributes.normal, 0);
  return _a.dot(n) < 0 ? flipFaces(g) : g;
}

// ---------------------------------------------------------------------------
// attributes
// ---------------------------------------------------------------------------

// object-space planar UVs chosen per face from the geometric face normal (no smearing where smooth
// vertex normals straddle an axis change)
export function faceUV(g, texel) {
  const pos = g.attributes.position;
  const uv = new Float32Array(pos.count * 2);
  for (let t = 0; t + 2 < pos.count; t += 3) {
    _a.fromBufferAttribute(pos, t);
    _b.fromBufferAttribute(pos, t + 1);
    _c.fromBufferAttribute(pos, t + 2);
    _n.crossVectors(_b.sub(_a), _c.sub(_a));
    const ax = Math.abs(_n.x);
    const ay = Math.abs(_n.y);
    const az = Math.abs(_n.z);
    for (let k = 0; k < 3; k++) {
      const x = pos.getX(t + k);
      const y = pos.getY(t + k);
      const z = pos.getZ(t + k);
      let u;
      let v;
      if (ay >= ax && ay >= az) ((u = x), (v = z));
      else if (ax >= az) ((u = z), (v = y));
      else ((u = x), (v = y));
      uv[(t + k) * 2] = u * texel;
      uv[(t + k) * 2 + 1] = v * texel;
    }
  }
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return g;
}

// per-vertex colour from position: fn(x, y, z, outColor, across) — `across` is the strip/disc
// attribute when present (0 or -1..1), else 0
export function tintBy(g, fn) {
  const pos = g.attributes.position;
  const acr = g.attributes.across;
  const arr = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    fn(pos.getX(i), pos.getY(i), pos.getZ(i), c, acr ? acr.getX(i) : 0);
    arr[i * 3] = c.r;
    arr[i * 3 + 1] = c.g;
    arr[i * 3 + 2] = c.b;
  }
  g.setAttribute("color", new THREE.BufferAttribute(arr, 3));
  if (acr) g.deleteAttribute("across");
  return g;
}

export function col(hex, k = 1) {
  return new THREE.Color(hex).multiplyScalar(k);
}
export function mix(a, b, t, out = new THREE.Color()) {
  return out.copy(a).lerp(b, t);
}
export function smoothstep(e0, e1, x) {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}
// per-plate tone: base × (1 ± amount), slight warm/cool drift
export function jitter(base, rand, amount = 0.08) {
  const k = 1 + (rand() - 0.5) * 2 * amount;
  const w = (rand() - 0.5) * 0.04;
  return new THREE.Color(
    base.r * k * (1 + w),
    base.g * k,
    base.b * k * (1 - w),
  );
}

/**
 * Part wrapper (same contract as shipKit.part): face-planar UVs unless uv === "keep", uniform `color`
 * tint or a `tint(x, y, z, out, across)` gradient.
 */
export function mpart(
  geo,
  mat,
  {
    color = 0xffffff,
    texel = 1 / 16,
    lod = 0,
    name = "",
    uv = "planar",
    tint = null,
  } = {},
) {
  let g = geo.index ? geo.toNonIndexed() : geo;
  if (!g.attributes.normal) g.computeVertexNormals();
  if (uv === "planar" || !g.attributes.uv) faceUV(g, texel);
  if (tint) tintBy(g, tint);
  else tintGeometry(g, color);
  if (g.attributes.across) g.deleteAttribute("across");
  return { geo: g, mat, lod, name };
}

// deterministic small PRNG for greeble placement
export function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
