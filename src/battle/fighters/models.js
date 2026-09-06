// Starfighter models: the Battle of Coruscant roster as seven low-poly designs (≤ 400 triangles each)
// matched against reference stills and cutaways from the top, side and front — ARC-170, V-19 Torrent and
// Eta-2 Actis for the Republic; Vulture droid, Tri-fighter, Hyena bomber and HMP droid gunship for the
// Separatists. All types share ONE lit material. Every vertex carries a colour plus two scalars packed
// into the (otherwise unused) uv attribute:
//   uv.x = paint mask   1 where the per-instance squadron colour replaces the vertex colour (stripes, hulls)
//   uv.y = emissive     > 0 for unlit glowing parts (engine nozzles, photoreceptors, canopy light)
// fighterMaterial() patches a MeshStandardMaterial so those two channels work with THREE.BatchedMesh, which
// lets all types render as one draw call (multi-draw) with a per-instance colour.
// Units are metres, forward is -Z, up is +Y, origin at the hull centre (same conventions as the ships).
import * as THREE from "three";
import { battlePatch } from "../battleShader.js";

// ---------------------------------------------------------------------------
// geometry helpers (all output non-indexed geometry with position/normal/uv/color)
// ---------------------------------------------------------------------------

const _c = new THREE.Color();

function toColor(c) {
  if (c && c.isColor) return c;
  return _c.set(c);
}

// paint a geometry: constant colour, paint mask and emissive strength
function paint(g, color, mask = 0, emis = 0) {
  const geo = g.index ? g.toNonIndexed() : g;
  if (!geo.attributes.normal) geo.computeVertexNormals();
  const n = geo.attributes.position.count;
  const col = new Float32Array(n * 3);
  const uv = new Float32Array(n * 2);
  const c = toColor(color);
  for (let i = 0; i < n; i++) {
    col[i * 3] = c.r;
    col[i * 3 + 1] = c.g;
    col[i * 3 + 2] = c.b;
    uv[i * 2] = mask;
    uv[i * 2 + 1] = emis;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  for (const k of Object.keys(geo.attributes))
    if (!["position", "normal", "uv", "color"].includes(k))
      geo.deleteAttribute(k);
  return geo;
}

// concatenate painted geometries
export function merge(list) {
  let count = 0;
  for (const g of list) count += g.attributes.position.count;
  const pos = new Float32Array(count * 3);
  const nor = new Float32Array(count * 3);
  const uv = new Float32Array(count * 2);
  const col = new Float32Array(count * 3);
  let o = 0;
  for (const g of list) {
    const n = g.attributes.position.count;
    pos.set(g.attributes.position.array, o * 3);
    nor.set(g.attributes.normal.array, o * 3);
    uv.set(g.attributes.uv.array, o * 2);
    col.set(g.attributes.color.array, o * 3);
    o += n;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  out.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
  out.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  out.setAttribute("color", new THREE.BufferAttribute(col, 3));
  out.computeBoundingSphere();
  return out;
}

export function triangleCount(g) {
  return g.attributes.position.count / 3;
}

// box centred at (cx, cy, cz)
function box(cx, cy, cz, sx, sy, sz, color, o = {}) {
  const g = new THREE.BoxGeometry(sx, sy, sz);
  if (o.rz) g.rotateZ(o.rz);
  if (o.ry) g.rotateY(o.ry);
  if (o.rx) g.rotateX(o.rx);
  g.translate(cx, cy, cz);
  return paint(g, color, o.mask || 0, o.emis || 0);
}

// cylinder along an axis ('z' default), optionally open-ended (no caps: 2 tris per segment)
function cyl(cx, cy, cz, r0, r1, len, color, o = {}) {
  const seg = o.seg || 6;
  const g = new THREE.CylinderGeometry(r0, r1, len, seg, 1, o.open !== false);
  const axis = o.axis || "z";
  if (axis === "z") g.rotateX(Math.PI / 2);
  else if (axis === "x") g.rotateZ(Math.PI / 2);
  if (o.rz) g.rotateZ(o.rz);
  if (o.rx) g.rotateX(o.rx);
  if (o.ry) g.rotateY(o.ry);
  g.translate(cx, cy, cz);
  return paint(g, color, o.mask || 0, o.emis || 0);
}

// flat disc facing +axis (or -axis when o.flip); `seg` triangles
function disc(cx, cy, cz, r, color, o = {}) {
  const g = new THREE.CircleGeometry(r, o.seg || 6);
  // CircleGeometry faces +Z
  const axis = o.axis || "z";
  if (axis === "z" && o.flip) g.rotateY(Math.PI);
  if (axis === "y") g.rotateX(o.flip ? Math.PI / 2 : -Math.PI / 2);
  if (axis === "x") g.rotateY(o.flip ? -Math.PI / 2 : Math.PI / 2);
  g.translate(cx, cy, cz);
  return paint(g, color, o.mask || 0, o.emis || 0);
}

// hemisphere dome (flat side down, or oriented by o.rx/o.ry/o.rz before translation); o.sx/sy/sz scale it
function dome(cx, cy, cz, r, color, o = {}) {
  const g = new THREE.SphereGeometry(
    r,
    o.ws || 6,
    o.hs || 2,
    0,
    Math.PI * 2,
    0,
    Math.PI / 2,
  );
  if (o.sx || o.sy || o.sz) g.scale(o.sx || 1, o.sy || 1, o.sz || 1);
  if (o.rx) g.rotateX(o.rx);
  if (o.rz) g.rotateZ(o.rz);
  if (o.ry) g.rotateY(o.ry);
  g.translate(cx, cy, cz);
  return paint(g, color, o.mask || 0, o.emis || 0);
}

function sphere(cx, cy, cz, r, color, o = {}) {
  const g = new THREE.SphereGeometry(r, o.ws || 8, o.hs || 4);
  if (o.sx || o.sy || o.sz) g.scale(o.sx || 1, o.sy || 1, o.sz || 1);
  g.translate(cx, cy, cz);
  return paint(g, color, o.mask || 0, o.emis || 0);
}

function torus(cx, cy, cz, r, tube, color, o = {}) {
  const g = new THREE.TorusGeometry(r, tube, o.radial || 3, o.tubular || 12);
  // TorusGeometry lies in the XY plane (axis +Z) which is what a forward-facing ring needs
  if (o.rx) g.rotateX(o.rx);
  g.translate(cx, cy, cz);
  return paint(g, color, o.mask || 0, o.emis || 0);
}

// push quad a-b-c-d (two triangles) wound so its normal points away from `centre`
function quadOut(arr, a, b, c, d, centre) {
  const ux = b[0] - a[0];
  const uy = b[1] - a[1];
  const uz = b[2] - a[2];
  const vx = c[0] - a[0];
  const vy = c[1] - a[1];
  const vz = c[2] - a[2];
  const nx = uy * vz - uz * vy;
  const ny = uz * vx - ux * vz;
  const nz = ux * vy - uy * vx;
  const mx = (a[0] + b[0] + c[0] + d[0]) / 4 - centre[0];
  const my = (a[1] + b[1] + c[1] + d[1]) / 4 - centre[1];
  const mz = (a[2] + b[2] + c[2] + d[2]) / 4 - centre[2];
  if (nx * mx + ny * my + nz * mz >= 0)
    arr.push(...a, ...b, ...c, ...a, ...c, ...d);
  else arr.push(...a, ...c, ...b, ...a, ...d, ...c);
}

// push triangle a-b-c wound so its normal points away from `centre`
function triOut(arr, a, b, c, centre) {
  const ux = b[0] - a[0];
  const uy = b[1] - a[1];
  const uz = b[2] - a[2];
  const vx = c[0] - a[0];
  const vy = c[1] - a[1];
  const vz = c[2] - a[2];
  const nx = uy * vz - uz * vy;
  const ny = uz * vx - ux * vz;
  const nz = ux * vy - uy * vx;
  const mx = (a[0] + b[0] + c[0]) / 3 - centre[0];
  const my = (a[1] + b[1] + c[1]) / 3 - centre[1];
  const mz = (a[2] + b[2] + c[2]) / 3 - centre[2];
  if (nx * mx + ny * my + nz * mz >= 0) arr.push(...a, ...b, ...c);
  else arr.push(...a, ...c, ...b);
}

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const norm = (a) => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
const mid = (a, b) => [
  (a[0] + b[0]) / 2,
  (a[1] + b[1]) / 2,
  (a[2] + b[2]) / 2,
];

function rawGeo(pos) {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

/**
 * Lofted hull along +Z from rectangular cross sections [{ z, hw, y0, y1, x?, color?, mask?, emis? }].
 * Each segment takes the colour of its first section. Flat faceted normals. Options: top/bottom/sides
 * (default true) and capStart/capEnd (default false) to skip hidden faces.
 */
function loft(sections, color, o = {}) {
  const parts = [];
  const quad = (arr, a, b, c, d) => {
    arr.push(...a, ...b, ...c, ...a, ...c, ...d);
  };
  for (let i = 0; i + 1 < sections.length; i++) {
    const A = sections[i];
    const B = sections[i + 1];
    const ax = A.x || 0;
    const bx = B.x || 0;
    const pos = [];
    const a0 = [ax - A.hw, A.y0, A.z];
    const a1 = [ax + A.hw, A.y0, A.z];
    const a2 = [ax + A.hw, A.y1, A.z];
    const a3 = [ax - A.hw, A.y1, A.z];
    const b0 = [bx - B.hw, B.y0, B.z];
    const b1 = [bx + B.hw, B.y0, B.z];
    const b2 = [bx + B.hw, B.y1, B.z];
    const b3 = [bx - B.hw, B.y1, B.z];
    if (o.top !== false) quad(pos, a3, a2, b2, b3);
    if (o.bottom !== false) quad(pos, a1, a0, b0, b1);
    if (o.sides !== false) {
      quad(pos, a2, a1, b1, b2);
      quad(pos, a0, a3, b3, b0);
    }
    if (i === 0 && o.capStart) quad(pos, a0, a1, a2, a3);
    if (i === sections.length - 2 && o.capEnd) quad(pos, b1, b0, b3, b2);
    parts.push(
      paint(
        rawGeo(pos),
        A.color !== undefined ? A.color : color,
        A.mask !== undefined ? A.mask : o.mask || 0,
        A.emis !== undefined ? A.emis : o.emis || 0,
      ),
    );
  }
  return merge(parts);
}

/**
 * Lofted body along +Z from octagonal cross sections [{ z, hw, y0, y1, x?, c?, color?, mask?, emis? }]:
 * a rectangle hw x (y1 - y0) with its corners chamfered by fraction `c` (default 0.36) of the half-width
 * and half-height, so fuselages read as rounded rather than boxy. 16 triangles per segment, colour per
 * segment from its first section, optional fan caps (capStart/capEnd, 8 triangles each). A section's
 * `side: { color, mask }` recolours the two vertical flank faces of its segment (stripes for free).
 */
function loft8(sections, color, o = {}) {
  const rings = sections.map((s) => {
    const c = s.c !== undefined ? s.c : o.c !== undefined ? o.c : 0.36;
    const x = s.x || 0;
    const hh = (s.y1 - s.y0) / 2;
    const cy = (s.y0 + s.y1) / 2;
    const dx = s.hw * c;
    const dy = hh * c;
    return [
      [x - s.hw + dx, cy + hh, s.z],
      [x + s.hw - dx, cy + hh, s.z],
      [x + s.hw, cy + hh - dy, s.z],
      [x + s.hw, cy - hh + dy, s.z],
      [x + s.hw - dx, cy - hh, s.z],
      [x - s.hw + dx, cy - hh, s.z],
      [x - s.hw, cy - hh + dy, s.z],
      [x - s.hw, cy + hh - dy, s.z],
    ];
  });
  const parts = [];
  for (let i = 0; i + 1 < sections.length; i++) {
    const A = rings[i];
    const B = rings[i + 1];
    const S = sections[i];
    const T = sections[i + 1];
    const centre = [
      ((S.x || 0) + (T.x || 0)) / 2,
      (S.y0 + S.y1 + T.y0 + T.y1) / 4,
      (S.z + T.z) / 2,
    ];
    const pos = [];
    const flank = [];
    for (let k = 0; k < 8; k++) {
      const k1 = (k + 1) & 7;
      // ring points 2-3 and 6-7 are the vertical flank faces
      const arr = S.side && (k === 2 || k === 6) ? flank : pos;
      quadOut(arr, A[k], A[k1], B[k1], B[k], centre);
    }
    if (i === 0 && o.capStart) {
      const cc = [S.x || 0, (S.y0 + S.y1) / 2, S.z];
      for (let k = 0; k < 8; k++)
        triOut(pos, cc, A[k], A[(k + 1) & 7], centre);
    }
    if (i === sections.length - 2 && o.capEnd) {
      const cc = [T.x || 0, (T.y0 + T.y1) / 2, T.z];
      for (let k = 0; k < 8; k++)
        triOut(pos, cc, B[k], B[(k + 1) & 7], centre);
    }
    parts.push(
      paint(
        rawGeo(pos),
        S.color !== undefined ? S.color : color,
        S.mask !== undefined ? S.mask : o.mask || 0,
        S.emis !== undefined ? S.emis : o.emis || 0,
      ),
    );
    if (flank.length)
      parts.push(
        paint(rawGeo(flank), S.side.color, S.side.mask || 0, S.side.emis || 0),
      );
  }
  return merge(parts);
}

/**
 * Tube along a polyline: stations [{ p: [x,y,z], w, t, color?, mask?, emis? }] with a rectangular (or
 * o.diamond) cross section of half-width w (along W) and half-thickness t (along T). W is the local axis
 * crossed with o.up (default world up, so W is horizontal), T completes the frame. Pointed ends come from
 * tiny end sections; caps are added where the end section has area. Blades, arms and struts.
 */
function tube(stations, color, o = {}) {
  const up = o.up || [0, 1, 0];
  const n = stations.length;
  const rings = [];
  for (let i = 0; i < n; i++) {
    const s = stations[i];
    const prev = stations[Math.max(0, i - 1)].p;
    const next = stations[Math.min(n - 1, i + 1)].p;
    const axis = norm(sub(next, prev));
    let W = cross(axis, s.u || up);
    if (Math.hypot(...W) < 1e-4) W = cross(axis, [1, 0, 0]);
    W = norm(W);
    const T = norm(cross(W, axis));
    const w = s.w;
    const t = s.t;
    rings.push(
      o.diamond
        ? [
            add(s.p, mul(W, w)),
            add(s.p, mul(T, t)),
            add(s.p, mul(W, -w)),
            add(s.p, mul(T, -t)),
          ]
        : [
            add(add(s.p, mul(W, -w)), mul(T, -t)),
            add(add(s.p, mul(W, w)), mul(T, -t)),
            add(add(s.p, mul(W, w)), mul(T, t)),
            add(add(s.p, mul(W, -w)), mul(T, t)),
          ],
    );
  }
  const parts = [];
  for (let i = 0; i + 1 < n; i++) {
    const A = rings[i];
    const B = rings[i + 1];
    const S = stations[i];
    const centre = mid(stations[i].p, stations[i + 1].p);
    const pos = [];
    for (let k = 0; k < 4; k++) {
      const k1 = (k + 1) & 3;
      quadOut(pos, A[k], A[k1], B[k1], B[k], centre);
    }
    if (i === 0 && stations[0].w * stations[0].t > 0.004)
      quadOut(pos, A[0], A[1], A[2], A[3], centre);
    if (i === n - 2 && stations[n - 1].w * stations[n - 1].t > 0.004)
      quadOut(pos, B[0], B[1], B[2], B[3], centre);
    parts.push(
      paint(
        rawGeo(pos),
        S.color !== undefined ? S.color : color,
        S.mask !== undefined ? S.mask : o.mask || 0,
        S.emis !== undefined ? S.emis : o.emis || 0,
      ),
    );
  }
  return merge(parts);
}

/**
 * Flat panel (wing, fin, S-foil) whose chord runs along Z: stations [{ p: [x,y], lead, trail, color?, mask? }]
 * are chord lines in the XY plane; the panel spans from station to station with thickness `thick`
 * perpendicular to the span. Root cap optional (o.capStart), tip cap always.
 */
function panel(stations, thick, color, o = {}) {
  const n = stations.length;
  const rings = [];
  const h = thick / 2;
  for (let i = 0; i < n; i++) {
    const s = stations[i];
    const prev = stations[Math.max(0, i - 1)].p;
    const next = stations[Math.min(n - 1, i + 1)].p;
    let nx = -(next[1] - prev[1]);
    let ny = next[0] - prev[0];
    const l = Math.hypot(nx, ny) || 1;
    nx /= l;
    ny /= l;
    const hh = s.thick !== undefined ? s.thick / 2 : h;
    rings.push([
      [s.p[0] - nx * hh, s.p[1] - ny * hh, s.lead],
      [s.p[0] + nx * hh, s.p[1] + ny * hh, s.lead],
      [s.p[0] + nx * hh, s.p[1] + ny * hh, s.trail],
      [s.p[0] - nx * hh, s.p[1] - ny * hh, s.trail],
    ]);
  }
  const parts = [];
  for (let i = 0; i + 1 < n; i++) {
    const A = rings[i];
    const B = rings[i + 1];
    const S = stations[i];
    const centre = [
      (S.p[0] + stations[i + 1].p[0]) / 2,
      (S.p[1] + stations[i + 1].p[1]) / 2,
      (S.lead + S.trail + stations[i + 1].lead + stations[i + 1].trail) / 4,
    ];
    const pos = [];
    for (let k = 0; k < 4; k++) {
      const k1 = (k + 1) & 3;
      quadOut(pos, A[k], A[k1], B[k1], B[k], centre);
    }
    if (i === 0 && o.capStart) quadOut(pos, A[0], A[1], A[2], A[3], centre);
    if (i === n - 2 && o.capEnd !== false)
      quadOut(pos, B[0], B[1], B[2], B[3], centre);
    parts.push(
      paint(
        rawGeo(pos),
        S.color !== undefined ? S.color : color,
        S.mask !== undefined ? S.mask : o.mask || 0,
        S.emis !== undefined ? S.emis : o.emis || 0,
      ),
    );
  }
  return merge(parts);
}

/**
 * Lenticular shell over a plan outline (the HMP gunship's shield body): `outline` is a closed polygon
 * of [x, z] points around the centre (cx, cz); the top and bottom surfaces are fans through `rings`
 * (fractions of the outline radius) whose heights come from yTop(u) / yBot(u) with u = 0 at the centre
 * and 1 at the rim; `sag(x, z)` (optional) lowers both surfaces (drooping wings). Colours per surface:
 * o.topInner (u < rings[0], painted) / o.top / o.bottom / o.rim.
 */
function shell(outline, cz, rings, yTop, yBot, o = {}) {
  const parts = [];
  const sag = o.sag || (() => 0);
  const n = outline.length;
  const ringPts = (u, yFn) =>
    outline.map(([x, z]) => {
      const px = x * u;
      const pz = cz + (z - cz) * u;
      return [px, yFn(u) - sag(px, pz), pz];
    });
  const centre = [0, 0, cz];
  const surface = (yFn, colors) => {
    const levels = [0, ...rings, 1];
    let prev = null;
    for (let li = 1; li < levels.length; li++) {
      const u0 = levels[li - 1];
      const u1 = levels[li];
      const pos = [];
      const outer = ringPts(u1, yFn);
      if (u0 === 0) {
        const cc = [0, yFn(0) - sag(0, cz), cz];
        for (let k = 0; k < n; k++)
          triOut(pos, cc, outer[k], outer[(k + 1) % n], centre);
      } else {
        for (let k = 0; k < n; k++) {
          const k1 = (k + 1) % n;
          quadOut(pos, prev[k], prev[k1], outer[k1], outer[k], centre);
        }
      }
      const c = colors[Math.min(li - 1, colors.length - 1)];
      parts.push(paint(rawGeo(pos), c.color, c.mask || 0, 0));
      prev = outer;
    }
    return prev;
  };
  const topRim = surface(yTop, o.top);
  const botRim = surface(yBot, o.bottom);
  const pos = [];
  for (let k = 0; k < n; k++) {
    const k1 = (k + 1) % n;
    quadOut(pos, topRim[k], topRim[k1], botRim[k1], botRim[k], centre);
  }
  parts.push(paint(rawGeo(pos), o.rim.color, o.rim.mask || 0, 0));
  return merge(parts);
}

// ---------------------------------------------------------------------------
// palette (sRGB hex; THREE.Color converts to the working space)
// ---------------------------------------------------------------------------
const GREY = 0xc4c0b6; // Republic light hull
const GREY_DARK = 0x8f8c85;
const DARK = 0x2e3036;
const GUN = 0x3a3c40;
const GLASS = 0x18222f;
const AMBER_GLASS = 0x7a4a1e; // V-19 canopy
const WHITE = 0xffffff; // painted areas carry white + mask so the instance colour shows
const DROID_LIGHT = 0x9aa0a6; // Separatist light plating
const DROID_MID = 0x5d6470;
const DROID_DARK = 0x2c3038;
const HMP_LIGHT = 0xa8adb0;
// kept below 1.0 radiance so ACES does not desaturate the photoreceptors to salmon
const RED_EYE = new THREE.Color(1.0, 0.09, 0.05);
const BLUE_ENGINE = new THREE.Color(0.55, 0.78, 1.0);
const AMBER_ENGINE = new THREE.Color(1.0, 0.55, 0.22);
const RED_ENGINE = new THREE.Color(1.0, 0.25, 0.15);

// ---------------------------------------------------------------------------
// the fighters
// ---------------------------------------------------------------------------

// ARC-170 (Incom/Subpro): 14.5 m long, 22.6 m span with the S-foils open, 4.78 m high. Reference facts
// (ICS cutaway, film stills): a long flattened fuselage with a broad wedge nose; the greenhouse for pilot
// and copilot runs from ~25 % to ~48 % of the length, the astromech sits behind it at mid-length and the
// rear-facing tail gunner's canopy at 55–68 %; two 2 m intake nacelles flank the cockpit with their mouths
// at ~35 % of the length and nozzles at ~85 %; the wings root on the nacelles with a 6.5 m chord and taper
// straight to 3 m squared tips 11.3 m out, each wing split into an upper and a lower S-foil opened ±11°;
// one long medium laser cannon per wing at a foil tip (port upper, starboard lower) reaching the nose
// line; two small tail stabilisers and two aft cannons. Light grey with red intake lips, a red stripe
// along each flank from the nose to the intakes and a red band along the inner leading edge of each wing.
function arc170() {
  const P = [];
  const stripe = { color: WHITE, mask: 1 };
  P.push(
    loft8(
      [
        { z: -7.25, hw: 0.72, y0: -0.14, y1: 0.14, side: stripe },
        { z: -5.0, hw: 1.15, y0: -0.48, y1: 0.42, side: stripe },
        { z: -2.0, hw: 1.25, y0: -0.7, y1: 0.6 },
        { z: 1.8, hw: 1.1, y0: -0.7, y1: 0.58 },
        { z: 5.0, hw: 0.75, y0: -0.5, y1: 0.46 },
        { z: 7.25, hw: 0.32, y0: -0.2, y1: 0.26 },
      ],
      GREY,
      { capStart: true, capEnd: true, c: 0.4 },
    ),
  );
  // greenhouse: pilot + copilot, then the astromech, then the rear-facing gunner canopy
  P.push(
    loft(
      [
        { z: -4.4, hw: 0.5, y0: 0.5, y1: 0.56 },
        { z: -3.4, hw: 0.74, y0: 0.55, y1: 1.28 },
        { z: -1.0, hw: 0.76, y0: 0.55, y1: 1.34 },
        { z: 0.0, hw: 0.6, y0: 0.55, y1: 0.8 },
      ],
      GLASS,
      { bottom: false, emis: 0.25 },
    ),
  );
  P.push(dome(0, 0.62, 0.6, 0.4, GREY_DARK, { ws: 6, hs: 2 }));
  P.push(
    loft(
      [
        { z: 1.2, hw: 0.56, y0: 0.55, y1: 0.78 },
        { z: 2.4, hw: 0.7, y0: 0.55, y1: 1.24 },
        { z: 4.6, hw: 0.42, y0: 0.5, y1: 0.58 },
      ],
      GLASS,
      { bottom: false, emis: 0.25 },
    ),
  );
  // twin aft cannons for the tail gunner, and the two small tail stabilisers
  P.push(box(0, 0.6, 7.4, 0.14, 0.14, 1.8, GUN));
  P.push(box(0, -0.3, 7.4, 0.14, 0.14, 1.8, GUN));
  for (const s of [-1, 1]) {
    P.push(
      panel(
        [
          { p: [s * 0.6, 0.05], lead: 4.6, trail: 6.9 },
          { p: [s * 2.6, 0.25], lead: 5.7, trail: 7.0 },
        ],
        0.14,
        GREY,
      ),
    );
    // intake nacelle: red lip ring, open barrel, dark intake face, glowing nozzle
    const nx = s * 1.95;
    const ny = -0.05;
    P.push(cyl(nx, ny, -2.0, 1.02, 0.98, 0.7, WHITE, { seg: 6, mask: 1 }));
    P.push(cyl(nx, ny, 1.75, 0.98, 0.9, 6.8, GREY, { seg: 6 }));
    P.push(disc(nx, ny, -2.35, 0.98, DARK, { seg: 6, flip: true }));
    P.push(disc(nx, ny, 5.15, 0.76, BLUE_ENGINE, { seg: 6, emis: 2.2 }));
    // S-foils: upper and lower, ±11° open, straight taper from the 6.5 m root chord to the squared tip
    for (const v of [-1, 1]) {
      const d = v * 0.19;
      const at = (r) => [s * (2.9 + r * Math.cos(d)), ny + r * Math.sin(d)];
      P.push(
        panel(
          [
            { p: at(0), lead: -1.9, trail: 4.6 },
            { p: at(8.4), lead: 0.3, trail: 3.5 },
          ],
          0.2,
          GREY,
        ),
      );
      // red band along the inner leading edge
      P.push(
        panel(
          [
            { p: at(0.3), lead: -1.85, trail: -1.0 },
            { p: at(3.6), lead: -1.0, trail: -0.4 },
          ],
          0.26,
          WHITE,
          { mask: 1, capEnd: false },
        ),
      );
      // one medium laser cannon per wing: port upper, starboard lower
      if ((s < 0 && v > 0) || (s > 0 && v < 0)) {
        const [cx, cy] = at(8.1);
        P.push(box(cx, cy, 1.0, 0.5, 0.46, 3.2, GUN));
        P.push(box(cx, cy, -3.4, 0.16, 0.16, 6.2, GUN));
      }
    }
  }
  return merge(P);
}

// V-19 Torrent (Slayn & Korpil): 6 m long. Reference facts (TCW render, Clone Wars stills): a compact
// boxy fuselage with an amber bubble canopy on the nose, two 1.1 m engine pods on the upper corners with
// round intakes forward, a swept dorsal fin between them, and two big folding wings hinged low on the
// flanks that swing 45° below horizontal in flight (an inverted Y from the front). The wings are about the
// body's length with a nearly constant 3.5 m chord and a laser cannon housing at each squared tip.
// White-grey with a maroon nose, and broad maroon panels along the mid-chord of the fin and both wings.
function v19() {
  const P = [];
  P.push(
    loft8(
      [
        { z: -3.0, hw: 0.36, y0: -0.28, y1: 0.2 },
        { z: -1.9, hw: 0.8, y0: -0.56, y1: 0.5 },
        { z: 0.2, hw: 0.9, y0: -0.66, y1: 0.6 },
        { z: 2.0, hw: 0.86, y0: -0.62, y1: 0.6 },
        { z: 3.0, hw: 0.6, y0: -0.46, y1: 0.5 },
      ],
      GREY,
      { capStart: true, capEnd: true, c: 0.3 },
    ),
  );
  // amber bubble canopy on the nose
  P.push(
    loft(
      [
        { z: -2.5, hw: 0.36, y0: 0.3, y1: 0.36 },
        { z: -1.7, hw: 0.5, y0: 0.4, y1: 1.02 },
        { z: -0.6, hw: 0.52, y0: 0.5, y1: 1.06 },
        { z: 0.1, hw: 0.4, y0: 0.58, y1: 0.66 },
      ],
      AMBER_GLASS,
      { bottom: false, emis: 0.35 },
    ),
  );
  // maroon nose band
  P.push(box(0, 0.24, -2.4, 0.6, 0.1, 1.0, WHITE, { mask: 1 }));
  // dorsal fin: swept leading edge, straight trailing edge, maroon mid-chord panel
  P.push(
    panel(
      [
        { p: [0, 0.55], lead: -0.4, trail: 2.7 },
        { p: [0, 3.5], lead: 1.3, trail: 2.8 },
      ],
      0.16,
      GREY,
    ),
  );
  P.push(
    panel(
      [
        { p: [0, 0.9], lead: 0.5, trail: 2.1 },
        { p: [0, 3.2], lead: 1.75, trail: 2.4 },
      ],
      0.18,
      WHITE,
      { mask: 1, capEnd: false },
    ),
  );
  // main rear engine
  P.push(disc(0, 0.05, 3.02, 0.38, BLUE_ENGINE, { seg: 6, emis: 2.0 }));
  const a = 0.8; // wing droop (rad below horizontal)
  for (const s of [-1, 1]) {
    // engine pods on the upper corners
    P.push(cyl(s * 1.0, 0.62, 0.7, 0.5, 0.52, 3.2, GREY, { seg: 6 }));
    P.push(disc(s * 1.0, 0.62, 2.31, 0.5, BLUE_ENGINE, { seg: 6, emis: 2.2 }));
    P.push(disc(s * 1.0, 0.62, -0.91, 0.46, DARK, { seg: 6, flip: true }));
    // wing hinge barrel low on the flank
    P.push(cyl(s * 1.05, -0.3, 0.7, 0.3, 0.3, 0.8, GREY_DARK, { axis: "x" }));
    // folding wing: near-constant chord, squared tip, broad maroon mid-chord panel on both faces
    const L = 4.9;
    const px = (r) => s * (1.05 + r * Math.cos(a));
    const py = (r) => -0.3 - r * Math.sin(a);
    P.push(
      panel(
        [
          { p: [px(0.2), py(0.2)], lead: -1.2, trail: 2.5 },
          { p: [px(L), py(L)], lead: -0.7, trail: 2.2 },
        ],
        0.2,
        GREY,
        { capStart: true },
      ),
    );
    P.push(
      panel(
        [
          { p: [px(0.5), py(0.5)], lead: -0.4, trail: 1.9 },
          { p: [px(L - 0.3), py(L - 0.3)], lead: 0.0, trail: 1.65 },
        ],
        0.22,
        WHITE,
        { mask: 1, capEnd: false },
      ),
    );
    // wingtip laser cannon: housing at the leading corner, barrel ahead
    P.push(cyl(px(L - 0.25), py(L - 0.25), -0.3, 0.26, 0.26, 1.4, GUN, { seg: 6 }));
    P.push(box(px(L - 0.25), py(L - 0.25), -1.9, 0.12, 0.12, 1.8, GUN));
  }
  return merge(P);
}

// Eta-2 Actis Jedi interceptor (Kuat Systems): 5.47 m long, 4.3 m wide. Reference facts (Revenge of the
// Sith model): an arrowhead — a slim central body whose spine runs from the tail to the nose, with the
// bubble-canopy cockpit at 55–80 % of the length and the astromech socket in the starboard wing root
// beside it, twin ion engines at the pod's flanks; two thick-rooted wedge wings whose leading edges sweep
// 60° from the nose prongs to the tips at 70 % of the length, each prong carrying a laser cannon; the
// tips carry radiator panels that split open into a V in combat. Painted body and wing roots (yellow or
// red) over grey-white wings.
function eta2() {
  const P = [];
  P.push(
    loft8(
      [
        { z: -2.6, hw: 0.16, y0: -0.1, y1: 0.12, color: GREY, mask: 0 },
        { z: -0.8, hw: 0.5, y0: -0.4, y1: 0.36 },
        { z: 0.8, hw: 0.56, y0: -0.5, y1: 0.44 },
        { z: 2.1, hw: 0.46, y0: -0.4, y1: 0.4 },
        { z: 2.75, hw: 0.3, y0: -0.22, y1: 0.28 },
      ],
      WHITE,
      { capStart: true, capEnd: true, mask: 1, c: 0.4 },
    ),
  );
  P.push(
    loft(
      [
        { z: -0.3, hw: 0.3, y0: 0.34, y1: 0.4 },
        { z: 0.4, hw: 0.4, y0: 0.4, y1: 0.98 },
        { z: 1.4, hw: 0.4, y0: 0.44, y1: 0.94 },
        { z: 2.0, hw: 0.3, y0: 0.4, y1: 0.46 },
      ],
      GLASS,
      { bottom: false, emis: 0.3 },
    ),
  );
  // astromech socket on the starboard wing root
  P.push(dome(1.05, 0.14, 0.3, 0.36, GREY_DARK, { ws: 6, hs: 2 }));
  for (const s of [-1, 1]) {
    // wedge wing: 0.6 m thick painted root flattening to a thin grey outer panel, leading edge swept
    // from the nose prong to the tip
    P.push(
      panel(
        [
          { p: [s * 0.45, 0.0], lead: -2.4, trail: 2.5, thick: 0.6, color: WHITE, mask: 1 },
          { p: [s * 1.2, 0.0], lead: -1.1, trail: 2.35, thick: 0.22 },
          { p: [s * 2.05, 0.0], lead: 0.35, trail: 2.2, thick: 0.12 },
        ],
        0.14,
        GREY,
      ),
    );
    // radiator panels at the tip, split open above and below (45°)
    for (const v of [-1, 1]) {
      P.push(
        panel(
          [
            { p: [s * 2.05, 0.0], lead: 0.4, trail: 2.2 },
            { p: [s * 2.95, v * 0.85], lead: 0.6, trail: 2.1 },
          ],
          0.1,
          GREY,
        ),
      );
    }
    // laser cannon on the nose prong, and the ion engine beside the pod
    P.push(box(s * 0.7, 0.04, -1.6, 0.16, 0.16, 2.8, GUN));
    P.push(cyl(s * 0.9, -0.08, 1.7, 0.3, 0.34, 1.8, GREY_DARK, { seg: 6 }));
    P.push(disc(s * 0.9, -0.08, 2.61, 0.3, BLUE_ENGINE, { seg: 6, emis: 2.2 }));
  }
  return merge(P);
}

// pointed blade along a polyline of hinge -> (elbow) -> tip with a diamond cross section: `pts` are the
// centreline points, `w`/`t` the half-width/half-thickness at the widest station (the elbow); o.root is
// the width fraction at the hinge (default a point), the tip is always a point
function blade(pts, w, t, color, o = {}) {
  const st = [];
  const n = pts.length;
  const root = o.root !== undefined ? o.root : 0.06;
  for (let i = 0; i < n; i++) {
    const k = i === 0 ? root : i === n - 1 ? 0.06 : i === 1 ? 1 : 0.7;
    st.push({ p: pts[i], w: Math.max(0.03, w * k), t: Math.max(0.02, t * k) });
  }
  return tube(st, color, { diamond: true, ...o });
}

// Vulture droid (Xi Char / Haor Chall): 3.6 m body, 6.96 m long and ~7 m across in flight. Reference facts
// (TCW render, film stills): the body IS the head — a slender 1 m wide flat-topped bullet with two
// vertical red photoreceptor slits on its front top, tapering to a tail with the thruster; shoulder blocks
// on the rear flanks carry two wing pairs, each pair an upper and a lower blade stacked with a gap that
// widens toward the tips; the blades run out to an elbow beside the nose then sweep forward and outward
// so the tips sit 3 m ahead of the nose — a dart from above, an X from ahead. Laser cannons under the
// lower blade tips. Blue-grey plating with lighter plates.
function vulture() {
  const P = [];
  P.push(
    loft8(
      [
        { z: -1.7, hw: 0.16, y0: -0.1, y1: 0.12 },
        { z: -0.9, hw: 0.4, y0: -0.3, y1: 0.4 },
        { z: 0.1, hw: 0.5, y0: -0.42, y1: 0.42 },
        { z: 1.1, hw: 0.42, y0: -0.36, y1: 0.32 },
        { z: 1.9, hw: 0.28, y0: -0.24, y1: 0.22 },
      ],
      WHITE,
      { capStart: true, capEnd: true, mask: 1, c: 0.45 },
    ),
  );
  // two red photoreceptor slits leaning back along the nose slope
  for (const s of [-1, 1])
    P.push(
      box(s * 0.12, 0.3, -1.2, 0.07, 0.26, 0.1, RED_EYE, { emis: 0.9, rx: -0.35 }),
    );
  // thruster
  P.push(cyl(0, -0.02, 1.95, 0.2, 0.26, 0.4, DROID_DARK, { seg: 6 }));
  P.push(disc(0, -0.02, 2.16, 0.2, AMBER_ENGINE, { seg: 6, emis: 2.2 }));
  for (const s of [-1, 1]) {
    // shoulder block on the rear flank
    P.push(box(s * 0.56, 0.0, 1.0, 0.3, 0.5, 1.0, DROID_DARK));
    for (const v of [-1, 1]) {
      // upper/lower blades of the pair: out to the elbow beside the nose, then forward and outward
      const hinge = [s * 0.7, v * 0.3, 1.3];
      const elbow = [s * 1.6, v * 0.5, -0.4];
      const tip = [s * 3.3, v * 0.62, -4.9];
      P.push(blade([hinge, elbow, tip], 0.42, 0.16, WHITE, { mask: 1, root: 0.4 }));
      // laser cannon under the lower blade near the tip
      if (v < 0) P.push(box(s * 2.75, -0.7, -3.6, 0.1, 0.1, 1.2, DROID_DARK));
    }
  }
  return merge(P);
}

// Droid tri-fighter (Colicoid / Phlac-Arphocc): 5.4 m long. Reference facts (TCW render): a 2 m spherical
// droid-brain core with a dark triangular face carrying three red photoreceptors, a thick ring aft with
// three thrusters, and three broad curved arms 120° apart (one up, two down and out) that leave the ring,
// bow out to 1.9 m and close in again to pointed tips 2 m ahead of the sphere, each tipped with a laser
// cannon. Dark grey-blue with light plates.
function tri() {
  const P = [];
  P.push(sphere(0, 0, 0.3, 1.0, DROID_MID, { ws: 10, hs: 5 }));
  P.push(torus(0, 0, 1.5, 1.3, 0.18, DROID_DARK, { radial: 3, tubular: 9 }));
  for (let i = 0; i < 3; i++) {
    const a = Math.PI / 2 + (i * Math.PI * 2) / 3; // one arm up, two down-and-out
    const ux = Math.cos(a);
    const uy = Math.sin(a);
    const at = (r, z) => [ux * r, uy * r, z];
    const rad = [ux, uy, 0];
    P.push(
      tube(
        [
          { p: at(1.3, 1.5), w: 0.36, t: 0.1, u: rad },
          { p: at(1.85, 0.4), w: 0.56, t: 0.1, u: rad, color: WHITE, mask: 1 },
          { p: at(1.9, -1.0), w: 0.5, t: 0.09, u: rad, color: WHITE, mask: 1 },
          { p: at(1.5, -2.3), w: 0.26, t: 0.08, u: rad },
          { p: at(0.9, -3.5), w: 0.05, t: 0.04, u: rad },
        ],
        DROID_DARK,
      ),
    );
    // cannon at the arm tip
    P.push(box(ux * 0.95, uy * 0.95, -3.8, 0.1, 0.1, 1.2, GUN));
    // photoreceptor on the sphere's face between two arms
    const b = a + Math.PI / 3;
    P.push(
      box(Math.cos(b) * 0.5, Math.sin(b) * 0.5, -0.56, 0.3, 0.16, 0.16, RED_EYE, {
        emis: 0.9,
        rz: b,
      }),
    );
    // thruster on the ring between the arms
    P.push(
      disc(Math.cos(b) * 1.3, Math.sin(b) * 1.3, 1.69, 0.24, RED_ENGINE, {
        seg: 6,
        emis: 2.2,
      }),
    );
  }
  return merge(P);
}

// Hyena-class droid bomber (Baktoid): 12 m long. Reference facts (TCW stills): the Vulture's big brother
// — a flat, wide wedge fuselage (3.3 m across, under 1 m deep) with a low brow at the front top carrying
// the two red photoreceptor slits and a smaller sensor dome behind it to starboard, big hinge blocks at
// the rear flanks carrying two wing pairs of broad, thick root-hinged blades stacked with a gap, swept
// 30° forward so the tips reach ahead of the nose (span ≈ length), twin ion drives at the tail and a bomb
// rack under the belly. Dark grey with lighter plates.
function hyena() {
  const P = [];
  P.push(
    loft8(
      [
        { z: -4.0, hw: 0.7, y0: -0.16, y1: 0.16 },
        { z: -2.6, hw: 1.3, y0: -0.4, y1: 0.42 },
        { z: -0.6, hw: 1.55, y0: -0.5, y1: 0.46 },
        { z: 1.8, hw: 1.65, y0: -0.5, y1: 0.44 },
        { z: 3.8, hw: 1.3, y0: -0.44, y1: 0.4 },
        { z: 5.6, hw: 0.6, y0: -0.26, y1: 0.28 },
      ],
      WHITE,
      { capStart: true, capEnd: true, mask: 1, c: 0.4 },
    ),
  );
  // low brow at the front top with the eye slits, and the sensor dome behind it to starboard
  P.push(
    dome(0, 0.3, -2.6, 0.9, DROID_MID, { ws: 6, hs: 2, sz: 1.4, sy: 0.45 }),
  );
  for (const s of [-1, 1])
    P.push(
      box(s * 0.22, 0.5, -3.4, 0.1, 0.3, 0.12, RED_EYE, { emis: 0.9, rx: -0.5 }),
    );
  P.push(dome(1.0, 0.44, -0.4, 0.5, DROID_MID, { ws: 6, hs: 2, sz: 1.3 }));
  // twin ion drives at the tail
  for (const s of [-1, 1]) {
    P.push(cyl(s * 0.95, -0.02, 5.5, 0.42, 0.46, 1.0, DROID_DARK, { seg: 6 }));
    P.push(disc(s * 0.95, -0.02, 6.01, 0.4, AMBER_ENGINE, { seg: 6, emis: 2.2 }));
  }
  // bomb rack under the belly
  P.push(box(0, -0.75, 1.2, 1.7, 0.5, 3.0, DROID_DARK));
  for (const s of [-1, 1]) {
    // hinge block on the flank at 60 % of the length
    P.push(box(s * 1.8, 0.0, 1.8, 0.7, 0.9, 2.0, DROID_DARK));
    for (const v of [-1, 1]) {
      const hinge = [s * 2.15, v * 0.45, 1.8];
      const elbow = [s * 4.3, v * 0.62 + 0.05, -0.4];
      const tip = [s * 6.0, v * 0.8 - 0.2, -6.0];
      P.push(blade([hinge, elbow, tip], 0.9, 0.26, WHITE, { mask: 1, root: 0.75 }));
    }
  }
  return merge(P);
}

// HMP droid gunship (Baktoid Fleet Ordnance): 12.3 m long, 11 m wide, 3.1 m high. Reference facts (ICS
// cutaway, TCW renders): an arrowhead shield body 7.6 m across — broadly rounded aft, widest at 60 % of
// the length, narrowing to the blocky sensor head at the nose (raised spine, two red light bars, chin
// cannon); a big circular reactor cap on the dorsal centre-rear; two broad, thick arms leave the flanks
// and sweep 30° forward to the front corners, each ending in a 1.7 m spherical laser turret with twin
// barrels hanging below and carrying a missile rack underneath; twin drives at the trailing edge. Light
// grey with blue-grey dorsal plating.
function hmp() {
  const P = [];
  // shell plan outline (x, z), starboard half mirrored to port, from the nose clockwise
  const half = [
    [0.0, -4.6],
    [1.5, -4.3],
    [2.8, -3.2],
    [3.6, -1.4],
    [3.8, 0.8],
    [3.4, 3.0],
    [2.2, 4.6],
  ];
  const outline = [];
  for (const p of half) outline.push(p);
  outline.push([0, 5.3]);
  for (let i = half.length - 1; i > 0; i--) outline.push([-half[i][0], half[i][1]]);
  P.push(
    shell(
      outline,
      0.4,
      [0.55],
      (u) => (u === 0 ? 1.0 : u < 1 ? 0.8 : 0.12),
      (u) => (u === 0 ? -0.7 : u < 1 ? -0.55 : -0.12),
      {
        top: [{ color: WHITE, mask: 1 }, { color: HMP_LIGHT }],
        bottom: [{ color: HMP_LIGHT }, { color: HMP_LIGHT }],
        rim: { color: DROID_MID },
      },
    ),
  );
  // reactor cap on the dorsal centre-rear
  P.push(cyl(0, 0.9, 1.4, 1.9, 1.9, 0.3, DROID_DARK, { seg: 8, axis: "y" }));
  P.push(disc(0, 1.06, 1.4, 1.9, DROID_MID, { seg: 8, axis: "y" }));
  // sensor head: blocky face under the shell's nose with a raised spine and two red light bars, chin
  // cannon below
  P.push(box(0, -0.15, -5.3, 1.9, 1.1, 1.8, DROID_DARK));
  P.push(box(0, 0.42, -5.2, 0.5, 0.5, 1.6, DROID_MID));
  for (const s of [-1, 1])
    P.push(
      box(s * 0.6, 0.05, -6.22, 0.6, 0.08, 0.06, RED_EYE, { emis: 0.9, rz: s * 0.25 }),
    );
  P.push(box(0, -0.85, -5.6, 0.16, 0.16, 2.6, GUN));
  for (const s of [-1, 1]) {
    // swept wing arm: a thick flat wing whose 5 m root chord spans the shell's side, leading edge swept
    // 37° and trailing edge 63° forward to the 2 m tip chord at the turret pod
    P.push(
      panel(
        [
          { p: [s * 2.9, -0.05], lead: -3.5, trail: 1.6, thick: 0.7 },
          { p: [s * 5.4, -0.15], lead: -5.3, trail: -3.2, thick: 0.5 },
        ],
        0.6,
        HMP_LIGHT,
      ),
    );
    // ball turret under the arm tip with twin barrels
    P.push(sphere(s * 5.2, -0.8, -4.3, 0.85, DROID_MID, { ws: 6, hs: 3 }));
    P.push(box(s * 5.0, -0.8, -6.0, 0.1, 0.1, 2.2, GUN));
    P.push(box(s * 5.4, -0.8, -6.0, 0.1, 0.1, 2.2, GUN));
    // missile rack under the arm and the drive at the trailing edge
    P.push(
      box(s * 4.2, -0.7, -1.8, 1.2, 0.6, 2.6, DROID_DARK, { ry: -s * 0.3 }),
    );
    P.push(cyl(s * 1.8, -0.15, 4.9, 0.42, 0.46, 1.0, DROID_DARK, { seg: 6 }));
    P.push(disc(s * 1.8, -0.15, 5.41, 0.4, BLUE_ENGINE, { seg: 6, emis: 2.0 }));
  }
  return merge(P);
}

// ---------------------------------------------------------------------------
// type table
// ---------------------------------------------------------------------------
// length: nominal length (m) for tooling; speed: [min, cruise, max] m/s; turn: rad/s; hp: hits to
// destroy; flight: fighters per flight; spacing: formation slot unit (m); paint: per-instance squadron
// colours (cycled); engine: glow sprite anchors (local, one or more), radius (m), streak length (in
// radii), colour, intensity; burst/gap/reload: rounds per burst, seconds between rounds, cooldown range;
// role: mission weights — cap (patrol the home ship), dogfight (chance per upkeep tick to pick a fight),
// sight (acquisition radius), bomber, hunter, escort; turret: fire at enemies regardless of heading.
export const FIGHTER_DEFS = {
  arc170: {
    side: "republic",
    build: arc170,
    length: 14.5,
    count: 66,
    speed: [200, 245, 300],
    turn: 1.3,
    hp: 3,
    flight: 3,
    spacing: 44,
    paint: [0x9c2a22],
    engine: {
      pos: [
        [-1.95, -0.05, 5.3],
        [1.95, -0.05, 5.3],
      ],
      size: 1.6,
      tail: 5,
      color: [0.55, 0.75, 1.0],
      glow: 1.1,
    },
    role: { cap: 0.2, dogfight: 0.1, sight: 1200 },
  },
  v19: {
    side: "republic",
    build: v19,
    length: 6,
    count: 60,
    speed: [220, 285, 340],
    turn: 1.9,
    hp: 2,
    flight: 3,
    spacing: 30,
    paint: [0x8e2c2a],
    engine: {
      pos: [
        [-1.0, 0.62, 2.45],
        [1.0, 0.62, 2.45],
      ],
      size: 1.2,
      tail: 5,
      color: [0.55, 0.75, 1.0],
      glow: 1.1,
    },
    role: { cap: 0.45, dogfight: 0.45, sight: 2200 },
  },
  eta2Y: {
    side: "republic",
    build: eta2,
    geometry: "eta2",
    length: 5.47,
    count: 8,
    speed: [240, 310, 360],
    turn: 2.5,
    hp: 6,
    flight: 2,
    pairWith: "eta2R",
    spacing: 26,
    paint: [0xe0b83a],
    engine: {
      pos: [
        [-0.9, -0.08, 2.72],
        [0.9, -0.08, 2.72],
      ],
      size: 1.1,
      tail: 6,
      color: [0.6, 0.8, 1.0],
      glow: 1.1,
    },
    role: { hunter: 1, dogfight: 0.7, sight: 4500 },
  },
  eta2R: {
    side: "republic",
    build: eta2,
    geometry: "eta2",
    length: 5.47,
    count: 8,
    speed: [240, 310, 360],
    turn: 2.5,
    hp: 6,
    flight: 2,
    spacing: 26,
    paint: [0xb0362c],
    engine: {
      pos: [
        [-0.9, -0.08, 2.72],
        [0.9, -0.08, 2.72],
      ],
      size: 1.1,
      tail: 6,
      color: [0.6, 0.8, 1.0],
      glow: 1.1,
    },
    role: { hunter: 1, dogfight: 0.7, sight: 4500 },
  },
  vulture: {
    side: "separatist",
    build: vulture,
    length: 7,
    count: 130,
    speed: [210, 275, 335],
    turn: 2.0,
    hp: 1,
    flight: 4,
    spacing: 22,
    paint: [0x4a5262, 0x3e4552, 0x555c68, 0x434a58],
    engine: {
      pos: [[0, -0.02, 2.24]],
      size: 1.3,
      tail: 5,
      color: [1.0, 0.5, 0.2],
      glow: 1.2,
    },
    role: { cap: 0.25, dogfight: 0.4, sight: 2000 },
  },
  tri: {
    side: "separatist",
    build: tri,
    length: 5.4,
    count: 60,
    speed: [220, 290, 350],
    turn: 2.2,
    hp: 2,
    flight: 3,
    spacing: 26,
    paint: [0x8a9099, 0x7a808a, 0x9aa0a8],
    engine: {
      pos: [[0, 0, 1.72]],
      size: 1.7,
      tail: 5,
      color: [1.0, 0.3, 0.2],
      glow: 1.2,
    },
    role: { cap: 0.25, dogfight: 0.3, sight: 1800 },
  },
  hyena: {
    side: "separatist",
    build: hyena,
    length: 12,
    count: 24,
    speed: [170, 205, 250],
    turn: 0.95,
    hp: 3,
    flight: 3,
    spacing: 46,
    paint: [0x3b3f47, 0x444952, 0x363a41],
    engine: {
      pos: [
        [-0.95, -0.02, 6.12],
        [0.95, -0.02, 6.12],
      ],
      size: 1.6,
      tail: 4,
      color: [1.0, 0.5, 0.2],
      glow: 1.1,
    },
    burst: 5,
    gap: 0.22,
    reload: [4, 7],
    role: { bomber: 1 },
  },
  hmp: {
    side: "separatist",
    build: hmp,
    length: 12.3,
    count: 14,
    speed: [140, 165, 200],
    turn: 0.75,
    hp: 6,
    flight: 2,
    spacing: 60,
    paint: [0x3f5677, 0x36506e],
    engine: {
      pos: [
        [-1.8, -0.15, 5.52],
        [1.8, -0.15, 5.52],
      ],
      size: 1.3,
      tail: 3,
      color: [0.55, 0.75, 1.0],
      glow: 1.0,
    },
    burst: 4,
    gap: 0.16,
    reload: [1.6, 3.2],
    role: { escort: 1 },
    turret: { range: 1000, cone: -1 },
  },
};

// Build every distinct geometry once (types may share one, e.g. the two interceptor colour schemes).
export function buildFighterGeometries() {
  const out = {};
  for (const [id, def] of Object.entries(FIGHTER_DEFS)) {
    const key = def.geometry || id;
    if (!out[key]) out[key] = def.build();
  }
  return out;
}

/**
 * The single lit fighter material. On top of the battle lighting patch it teaches the shader the two
 * packed uv channels: the paint mask limits the per-instance (batching) colour to painted vertices, and
 * the emissive channel turns vertex colour into unlit glow.
 */
export function fighterMaterial(sun) {
  const mat = battlePatch(
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.55,
      metalness: 0.3,
      envMapIntensity: 0.1,
    }),
    sun,
  );
  const base = mat.onBeforeCompile;
  // onBeforeCompile sees unresolved #include directives, so the colour chunk is replaced as a whole:
  // same as three's color_vertex but the instance/batch colour only applies where the paint mask is set
  const colorVertex = /* glsl */ `
#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
  vColor = vec4( 1.0 );
#endif
#ifdef USE_COLOR_ALPHA
  vColor *= color;
#elif defined( USE_COLOR )
  vColor.rgb *= color;
#endif
#ifdef USE_INSTANCING_COLOR
  vColor.rgb = mix( vColor.rgb, vColor.rgb * instanceColor.rgb, uv.x );
#endif
#ifdef USE_BATCHING_COLOR
  vColor.rgb = mix( vColor.rgb, vColor.rgb * getBatchingColor( getIndirectIndex( gl_DrawID ) ).rgb, uv.x );
#endif`;
  mat.onBeforeCompile = (shader, renderer) => {
    base(shader, renderer);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying float vEmis;")
      .replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nvEmis = uv.y;",
      )
      .replace("#include <color_vertex>", colorVertex);
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying float vEmis;")
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
  totalEmissiveRadiance += diffuseColor.rgb * vEmis;
  diffuseColor.rgb *= 1.0 - min( vEmis, 1.0 );`,
      );
  };
  mat.customProgramCacheKey = () => "battlepatch-fighters";
  return mat;
}
