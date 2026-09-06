// Geometry helpers specific to the Recusant rebuild (the shared sweeps live in munificentGeo.js):
// lofts between explicit metric cross-sections that change shape along the hull (blade -> deck ->
// tail), outward offsets of those sections for wrap-around paint bands, the tent-dome arch profile
// and its surface function, octagonal thruster nozzles with a lit interior, antenna spikes and a
// hexagonal Confederacy roundel.
import * as THREE from "three";
import {
  bar,
  flipFaces,
  loftZ,
  quadAt,
  ringZ,
  superellipsePoint,
  table,
} from "./munificentGeo.js";
import { bellGradient } from "./munificentEngines.js";

/**
 * Loft between explicit cross-sections: sections = [{ z, pts: [[x, y], ...] }], every section with
 * the same point count, counter-clockwise seen from +z (x right, y up). Faces are flat. UVs: u =
 * perimeter arc length, v = z (both × texel). Open sections (closed = false) give a strip.
 */
export function sectionLoft(
  sections,
  { capStart = false, capEnd = false, texel = 1 / 16, closed = true } = {},
) {
  const n = sections.length;
  const m = sections[0].pts.length;
  const pos = [];
  const uvs = [];
  const arcs = sections.map((s) => {
    const out = [0];
    for (let j = 1; j <= m; j++) {
      const p = s.pts[j % m];
      const q = s.pts[j - 1];
      out.push(out[j - 1] + Math.hypot(p[0] - q[0], p[1] - q[1]));
    }
    return out;
  });
  const P = (i, j) => {
    const s = sections[i];
    const p = s.pts[j % m];
    return [p[0], p[1], s.z];
  };
  const UV = (i, j) => [arcs[i][j] * texel, sections[i].z * texel];
  const tri = (a, b, c, ua, ub, uc) => {
    pos.push(...a, ...b, ...c);
    uvs.push(...ua, ...ub, ...uc);
  };
  const segs = closed ? m : m - 1;
  for (let i = 0; i + 1 < n; i++)
    for (let j = 0; j < segs; j++) {
      const a = P(i, j);
      const b = P(i, j + 1);
      const c = P(i + 1, j + 1);
      const d = P(i + 1, j);
      const ua = UV(i, j);
      const ub = UV(i, j + 1);
      const uc = UV(i + 1, j + 1);
      const ud = UV(i + 1, j);
      tri(a, b, c, ua, ub, uc);
      tri(a, c, d, ua, uc, ud);
    }
  const cap = (i, forward) => {
    const s = sections[i];
    let cx = 0;
    let cy = 0;
    for (const [x, y] of s.pts) {
      cx += x / m;
      cy += y / m;
    }
    const c = [cx, cy, s.z];
    const uc = [cx * texel, cy * texel];
    for (let j = 0; j < m; j++) {
      const p = P(i, j);
      const q = P(i, j + 1);
      const up = [p[0] * texel, p[1] * texel];
      const uq = [q[0] * texel, q[1] * texel];
      if (forward) tri(c, p, q, uc, up, uq);
      else tri(c, q, p, uc, uq, up);
    }
  };
  if (closed && capStart) cap(0, false);
  if (closed && capEnd) cap(n - 1, true);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  g.computeVertexNormals();
  return g;
}

/** Outward offset of a closed CCW polygon by d metres (vertex normals = mean of the edge normals). */
export function offsetPoly(pts, d) {
  const m = pts.length;
  const out = [];
  for (let i = 0; i < m; i++) {
    const p = pts[(i + m - 1) % m];
    const c = pts[i];
    const q = pts[(i + 1) % m];
    let nx = c[1] - p[1] + (q[1] - c[1]);
    let ny = -(c[0] - p[0]) - (q[0] - c[0]);
    const l = Math.hypot(nx, ny) || 1;
    nx /= l;
    ny /= l;
    out.push([c[0] + nx * d, c[1] + ny * d]);
  }
  return out;
}

/** Sub-range i0..i1 (inclusive, wrapping) of a closed polygon as an open strip. */
export function polyRange(pts, i0, i1) {
  const out = [];
  const m = pts.length;
  let i = i0;
  for (;;) {
    out.push(pts[i]);
    if (i === i1) break;
    i = (i + 1) % m;
  }
  return out;
}

/**
 * Tent-dome arch: the upper half of a superellipse (exponent p) from (1, 0) over the crest to (-1, 0),
 * n segments, closed with two points just below the base line (hidden inside the hull). archOpen()
 * gives the arch alone for bands and rims.
 */
export function archOpen(n = 24, p = 2.3) {
  const pts = [];
  for (let k = 0; k <= n; k++)
    pts.push(superellipsePoint((Math.PI * k) / n, p));
  return pts;
}
export function archProfile(n = 24, p = 2.3) {
  return [...archOpen(n, p), [-1, -0.06], [1, -0.06]];
}
// outward normal (u, v) of the unit superellipse at parameter angle a
export function archNormal(a, p = 2.3) {
  const [u, v] = superellipsePoint(a, p);
  const nx = Math.sign(u) * Math.abs(u) ** (p - 1);
  const ny = Math.sign(v) * Math.abs(v) ** (p - 1);
  const l = Math.hypot(nx, ny) || 1;
  return [nx / l, ny / l];
}

/**
 * Surface of a dome lofted from archProfile along z: stations { z, sx, sy, y } (base line y, half
 * width sx, height sy). Returns { p, n } at parameter angle a (0 = starboard base .. PI = port base).
 */
export function domeSurface(stations, a, z, lift = 0, p = 2.3) {
  const sx = table(
    stations.map((s) => [s.z, s.sx]),
    z,
  );
  const sy = table(
    stations.map((s) => [s.z, s.sy]),
    z,
  );
  const y0 = table(
    stations.map((s) => [s.z, s.y]),
    z,
  );
  const [u, v] = superellipsePoint(a, p);
  const [nu, nv] = archNormal(a, p);
  // normal of the scaled section: divide by the scale factors, ignore the small z slope
  const n = new THREE.Vector3(
    nu / Math.max(1e-3, sx),
    nv / Math.max(1e-3, sy),
    0,
  ).normalize();
  const pt = new THREE.Vector3(u * sx, y0 + v * sy, z).addScaledVector(n, lift);
  return { p: pt.toArray(), n: n.toArray() };
}

// chamfered rectangle in metres centred at (cx, cy): half sizes w, h; c = fraction kept straight
export function octagonAt(w, h, cx, cy, c = 0.6) {
  return [
    [w, -c * h],
    [w, c * h],
    [c * w, h],
    [-c * w, h],
    [-w, c * h],
    [-w, -c * h],
    [-c * w, -h],
    [c * w, -h],
  ].map(([x, y]) => [x + cx, y + cy]);
}

// regular octagon profile with flats on top / bottom / sides (unit)
export function octaProfile() {
  const pts = [];
  for (let k = 0; k < 8; k++) {
    const a = Math.PI / 8 + (k * Math.PI) / 4;
    const r = 1 / Math.cos(Math.PI / 8);
    pts.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  return pts;
}

/**
 * Octagonal thruster nozzle facing +z: mouth centre (x, y, zMouth), mouth half size r, lit interior
 * gradient (engineGlow) `depth` deep, a dark octagonal shell `protrude` long in front of the mouth
 * with a rim. Returns the engines[] entry (glow radius scaled so the disc stays inside the rim).
 */
export function octNozzle(
  add,
  { x, y, zMouth, r, depth = 26, protrude = 10, lod = 0, shell, shellDark },
) {
  const prof = octaProfile();
  // outer shell: slight flare toward the mouth
  add(
    loftZ(
      prof,
      [
        { z: zMouth - protrude, sx: r + 1.0, sy: r + 1.0, x, y },
        { z: zMouth - protrude * 0.35, sx: r + 1.6, sy: r + 1.6, x, y },
        { z: zMouth, sx: r + 2.4, sy: r + 2.4, x, y },
      ],
      { flat: true, texel: 1 / 4 },
    ),
    "dark",
    {
      uv: "keep",
      lod,
      tint: (px, py, pz, o) =>
        o
          .copy(shell)
          .lerp(shellDark, (pz - (zMouth - protrude)) / Math.max(1, protrude)),
    },
  );
  // rim between the shell and the throat
  const outer = prof.map(([u, v]) => [x + u * (r + 2.4), y + v * (r + 2.4)]);
  const inner = prof.map(([u, v]) => [x + u * (r + 0.2), y + v * (r + 0.2)]);
  add(ringZ(outer, inner, zMouth - 1.4, zMouth), "dark", {
    texel: 1 / 3,
    lod,
    tint: (px, py, pz, o) =>
      o.copy(shellDark).lerp(new THREE.Color(0x4d80c8), 0.35),
  });
  // lit interior seen from astern
  const st =
    lod === 2
      ? [0, 0.5, 1]
      : lod === 1
        ? [0, 0.3, 0.6, 0.85, 1]
        : [0, 0.14, 0.3, 0.48, 0.66, 0.82, 0.92, 1];
  const radiusAt = (t) => r * (1 - 0.7 * t ** 0.8);
  add(
    flipFaces(
      loftZ(
        prof,
        st.map((t) => ({
          z: zMouth - t * depth,
          sx: radiusAt(t),
          sy: radiusAt(t),
          x,
          y,
        })),
        { capStart: true },
      ),
    ),
    "engineGlow",
    {
      lod,
      uv: "keep",
      tint: (px, py, pz, o) => bellGradient((zMouth - pz) / depth, o),
    },
  );
  return { pos: [x, y, zMouth], r: +(r * 0.72).toFixed(1) };
}

/** Antenna spike: a thin mast, optional cross bar near the top and a dark base block. */
export function spike(
  add,
  { x, y, z, h, w = 1.1, lod = 0, mast, base, cross = true },
) {
  add(bar([x, y, z], [x, y + h, z], w, w), "dark", {
    color: mast,
    texel: 1 / 3,
    lod,
  });
  if (lod === 0) {
    add(
      new THREE.BoxGeometry(w * 2.4, 1.6, w * 2.4).translate(x, y + 0.8, z),
      "dark",
      {
        color: base,
        texel: 1 / 3,
        lod,
      },
    );
    if (cross)
      add(
        bar(
          [x - w * 1.8, y + h * 0.78, z],
          [x + w * 1.8, y + h * 0.78, z],
          0.35,
          0.35,
        ),
        "dark",
        {
          color: mast,
          texel: 1 / 3,
          lod,
        },
      );
  }
}

/**
 * Confederacy roundel on a surface point c with normal n: white hexagonal ring, a small white hub
 * and six spokes over the hull colour (flat paint quads / discs lifted off the surface).
 */
export function roundel(add, { c, n, r, lod = 0, white, hull }) {
  const nn = new THREE.Vector3(...n).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 0, 1),
    nn,
  );
  const at = (lift) =>
    new THREE.Vector3(...c).addScaledVector(nn, lift).toArray();
  const hex = (rad, lift, color) => {
    const g = new THREE.CircleGeometry(rad, 6)
      .applyQuaternion(q)
      .translate(...at(lift));
    add(g, "paint", { color, lod, uv: "keep" });
  };
  hex(r, 0.3, white);
  hex(r * 0.76, 0.42, hull);
  hex(r * 0.3, 0.54, white);
  if (lod === 0) {
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(q);
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      const dir = new THREE.Vector3(...up.toArray()).applyAxisAngle(nn, a);
      const mid = new THREE.Vector3(...at(0.5)).addScaledVector(dir, r * 0.53);
      add(
        quadAt(mid.toArray(), n, dir.toArray(), r * 0.48, r * 0.11, 0),
        "paint",
        {
          color: white,
          lod,
          uv: "keep",
        },
      );
    }
  }
}
