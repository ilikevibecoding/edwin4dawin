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
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.computeVertexNormals();
    parts.push(
      paint(
        g,
        A.color !== undefined ? A.color : color,
        A.mask !== undefined ? A.mask : o.mask || 0,
        A.emis !== undefined ? A.emis : o.emis || 0,
      ),
    );
  }
  return merge(parts);
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
  if (nx * mx + ny * my + nz * mz >= 0) arr.push(...a, ...b, ...c, ...a, ...c, ...d);
  else arr.push(...a, ...c, ...b, ...a, ...d, ...c);
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
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.computeVertexNormals();
    parts.push(
      paint(
        g,
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
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.computeVertexNormals();
    parts.push(
      paint(
        g,
        S.color !== undefined ? S.color : color,
        S.mask !== undefined ? S.mask : o.mask || 0,
        S.emis !== undefined ? S.emis : o.emis || 0,
      ),
    );
  }
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

// ARC-170 (Incom/Subpro): 14.5 m long, 22.6 m span with the S-foils open, 4.78 m high. Long flattened
// fuselage with a three-seat greenhouse (pilot, copilot, rear-facing tail gunner), astromech socket amid,
// two big intake nacelles flanking the fuselage carrying the wings; each wing splits into an upper and a
// lower foil (an X from the front), one medium laser cannon per wing at a foil tip reaching to the nose
// line; two aft cannons at the tail. Light grey with red squadron markings on the nose, flanks and tips.
function arc170() {
  const P = [];
  P.push(
    loft(
      [
        { z: -7.25, hw: 0.3, y0: -0.2, y1: 0.22 },
        { z: -6.2, hw: 0.62, y0: -0.42, y1: 0.4 },
        { z: -4.4, hw: 0.86, y0: -0.6, y1: 0.62 },
        { z: -2.4, hw: 0.96, y0: -0.72, y1: 0.7 },
        { z: 1.6, hw: 0.96, y0: -0.74, y1: 0.7 },
        { z: 4.6, hw: 0.84, y0: -0.62, y1: 0.66 },
        { z: 6.6, hw: 0.5, y0: -0.36, y1: 0.46 },
        { z: 7.25, hw: 0.28, y0: -0.18, y1: 0.26 },
      ],
      GREY,
      { capStart: true, capEnd: true },
    ),
  );
  // red nose saddle and dorsal spine stripe (painted -> instance colour)
  P.push(box(0, 0.46, -5.4, 1.1, 0.1, 2.2, WHITE, { mask: 1 }));
  // front greenhouse (pilot + copilot) and the rear-facing gunner canopy behind the astromech
  P.push(
    loft(
      [
        { z: -3.9, hw: 0.5, y0: 0.66, y1: 0.72 },
        { z: -2.8, hw: 0.72, y0: 0.66, y1: 1.34 },
        { z: -0.6, hw: 0.74, y0: 0.66, y1: 1.4 },
        { z: 0.6, hw: 0.6, y0: 0.66, y1: 0.9 },
      ],
      GLASS,
      { bottom: false, emis: 0.25 },
    ),
  );
  P.push(dome(0, 0.72, 1.35, 0.42, GREY_DARK, { ws: 6, hs: 2 }));
  P.push(
    loft(
      [
        { z: 2.0, hw: 0.56, y0: 0.62, y1: 0.86 },
        { z: 2.9, hw: 0.68, y0: 0.62, y1: 1.3 },
        { z: 4.6, hw: 0.6, y0: 0.62, y1: 1.22 },
        { z: 5.6, hw: 0.4, y0: 0.62, y1: 0.68 },
      ],
      GLASS,
      { bottom: false, emis: 0.25 },
    ),
  );
  // twin aft cannons for the tail gunner
  P.push(box(0, 0.62, 7.6, 0.14, 0.14, 1.6, GUN));
  P.push(box(0, -0.28, 7.6, 0.14, 0.14, 1.6, GUN));
  for (const s of [-1, 1]) {
    // intake nacelle: open-ended barrel, dark intake face, glowing nozzle
    P.push(cyl(s * 1.8, -0.1, 1.5, 0.92, 0.9, 7.2, GREY, { seg: 8 }));
    P.push(disc(s * 1.8, -0.1, -2.1, 0.9, DARK, { seg: 8, flip: true }));
    P.push(disc(s * 1.8, -0.1, 5.1, 0.72, BLUE_ENGINE, { seg: 8, emis: 2.2 }));
    // red flank stripe along the nacelle
    P.push(box(s * 2.62, -0.1, 1.2, 0.14, 0.42, 4.4, WHITE, { mask: 1 }));
    // S-foils: upper and lower, ±12° open, swept trailing edge, red tips
    for (const v of [-1, 1]) {
      const d = v * 0.21;
      const tipX = 2.6 + 8.7 * Math.cos(d);
      const tipY = -0.1 + 8.7 * Math.sin(d);
      P.push(
        panel(
          [
            { p: [s * 2.6, -0.1], lead: -0.6, trail: 4.9 },
            {
              p: [s * (2.6 + 6.6 * Math.cos(d)), -0.1 + 6.6 * Math.sin(d)],
              lead: 0.5,
              trail: 4.2,
              color: WHITE,
              mask: 1,
            },
            { p: [s * tipX, tipY], lead: 0.9, trail: 4.0, color: WHITE, mask: 1 },
          ],
          0.22,
          GREY,
        ),
      );
      // one medium laser cannon per wing: port upper, starboard lower
      if ((s < 0 && v > 0) || (s > 0 && v < 0)) {
        const cx = s * (tipX - 0.3);
        const cy = tipY;
        P.push(box(cx, cy, 0.6, 0.5, 0.44, 2.6, GUN));
        P.push(box(cx, cy, -3.4, 0.16, 0.16, 6.0, GUN));
        P.push(box(cx, cy, -6.4, 0.24, 0.24, 0.5, DARK));
      }
    }
  }
  return merge(P);
}

// V-19 Torrent (Slayn & Korpil): 6 m long, a compact pod fuselage with an amber bubble canopy, a tall
// swept dorsal fin and two big folding wings below that swing down 50° in flight (an inverted Y from the
// front, the three plates the size of the body). Engine pods at the upper wing roots, a wingtip laser
// cannon at each lower wing. White-grey with maroon panels and stripes.
function v19() {
  const P = [];
  P.push(
    loft(
      [
        { z: -2.4, hw: 0.26, y0: -0.22, y1: 0.16 },
        { z: -1.5, hw: 0.62, y0: -0.5, y1: 0.42 },
        { z: -0.3, hw: 0.8, y0: -0.62, y1: 0.58 },
        { z: 1.4, hw: 0.78, y0: -0.58, y1: 0.6 },
        { z: 2.6, hw: 0.5, y0: -0.4, y1: 0.5 },
      ],
      GREY,
      { capStart: true, capEnd: true },
    ),
  );
  P.push(
    loft(
      [
        { z: -1.7, hw: 0.36, y0: 0.4, y1: 0.46 },
        { z: -0.9, hw: 0.5, y0: 0.44, y1: 1.05 },
        { z: 0.3, hw: 0.5, y0: 0.5, y1: 1.02 },
        { z: 0.9, hw: 0.4, y0: 0.56, y1: 0.62 },
      ],
      AMBER_GLASS,
      { bottom: false, emis: 0.35 },
    ),
  );
  // nose stripe
  P.push(box(0, 0.32, -1.9, 0.5, 0.08, 1.0, WHITE, { mask: 1 }));
  // dorsal fin: swept, maroon leading band and tip
  P.push(
    panel(
      [
        { p: [0, 0.5], lead: -0.5, trail: 2.5 },
        { p: [0, 2.2], lead: 0.4, trail: 2.6 },
        { p: [0, 2.3], lead: 0.45, trail: 2.62, color: WHITE, mask: 1 },
        { p: [0, 3.6], lead: 1.3, trail: 2.7, color: WHITE, mask: 1 },
      ],
      0.16,
      GREY,
    ),
  );
  // main rear engine
  P.push(disc(0, 0.05, 2.62, 0.34, BLUE_ENGINE, { seg: 6, emis: 2.0 }));
  const a = 0.87; // wing droop (rad below horizontal)
  for (const s of [-1, 1]) {
    // wing pivot barrel and the engine pod above it
    P.push(cyl(s * 1.0, -0.1, 1.0, 0.3, 0.3, 0.7, GREY_DARK, { axis: "x" }));
    P.push(cyl(s * 0.95, 0.45, 0.9, 0.4, 0.42, 2.3, GREY, { seg: 6 }));
    P.push(disc(s * 0.95, 0.45, 2.06, 0.4, BLUE_ENGINE, { seg: 6, emis: 2.2 }));
    P.push(disc(s * 0.95, 0.45, -0.26, 0.36, DARK, { seg: 6, flip: true }));
    // folding wing: root chord nearly the body length, tapered, raked tip; maroon panels
    const L = 3.6;
    const px = (r) => s * (1.0 + r * Math.cos(a));
    const py = (r) => -0.1 - r * Math.sin(a);
    P.push(
      panel(
        [
          { p: [px(0.2), py(0.2)], lead: -1.3, trail: 2.5 },
          { p: [px(1.4), py(1.4)], lead: -0.8, trail: 2.5, color: WHITE, mask: 1 },
          { p: [px(2.2), py(2.2)], lead: -0.4, trail: 2.55 },
          { p: [px(L), py(L)], lead: 0.4, trail: 2.6, color: WHITE, mask: 1 },
        ],
        0.18,
        GREY,
        { capStart: true },
      ),
    );
    // wingtip laser cannon reaching ahead of the nose
    P.push(box(px(L - 0.15), py(L - 0.15), 0.3, 0.34, 0.34, 1.3, GUN));
    P.push(box(px(L - 0.15), py(L - 0.15), -1.7, 0.12, 0.12, 2.8, GUN));
  }
  return merge(P);
}

// Eta-2 Actis Jedi interceptor (Kuat Systems): 5.47 m long, 4.3 m wide. A tiny cockpit pod at the rear
// centre between two ion engines, an astromech socket in the starboard wing root, and two big flat wing
// panels reaching forward to a shared nose point; the outer wing edges carry radiator panels that split
// open into a V in combat. Laser cannons at the forward corners. Painted pod and stripes (yellow or red).
function eta2() {
  const P = [];
  P.push(
    loft(
      [
        { z: -1.0, hw: 0.3, y0: -0.2, y1: 0.24 },
        { z: -0.2, hw: 0.52, y0: -0.44, y1: 0.4 },
        { z: 1.2, hw: 0.56, y0: -0.5, y1: 0.46 },
        { z: 2.3, hw: 0.42, y0: -0.36, y1: 0.4 },
        { z: 2.75, hw: 0.3, y0: -0.2, y1: 0.28 },
      ],
      WHITE,
      { capStart: true, capEnd: true, mask: 1 },
    ),
  );
  P.push(
    loft(
      [
        { z: -0.5, hw: 0.3, y0: 0.38, y1: 0.44 },
        { z: 0.2, hw: 0.4, y0: 0.4, y1: 0.98 },
        { z: 1.3, hw: 0.4, y0: 0.44, y1: 0.94 },
        { z: 1.9, hw: 0.3, y0: 0.4, y1: 0.46 },
      ],
      GLASS,
      { bottom: false, emis: 0.3 },
    ),
  );
  // astromech socket on the starboard wing root
  P.push(dome(1.05, 0.12, 0.6, 0.34, GREY_DARK, { ws: 6, hs: 2 }));
  for (const s of [-1, 1]) {
    // wing panel: leading edge from the nose point back to the forward corner, straight outer edge
    P.push(
      panel(
        [
          { p: [s * 0.1, 0.02], lead: -2.72, trail: 2.4 },
          { p: [s * 0.55, 0.02], lead: -2.2, trail: 2.4 },
          { p: [s * 2.0, 0.02], lead: -0.7, trail: 1.7 },
          { p: [s * 2.15, 0.02], lead: -0.5, trail: 1.6 },
        ],
        0.14,
        GREY,
      ),
    );
    // painted stripe along the wing's leading half
    P.push(
      panel(
        [
          { p: [s * 0.6, 0.1], lead: -2.15, trail: -0.9 },
          { p: [s * 1.9, 0.1], lead: -0.75, trail: 0.4 },
        ],
        0.02,
        WHITE,
        { mask: 1, capEnd: false },
      ),
    );
    // radiator panels at the outer edge, split open above and below (45°)
    for (const v of [-1, 1]) {
      P.push(
        panel(
          [
            { p: [s * 2.15, 0.0], lead: -0.5, trail: 1.6 },
            { p: [s * 3.05, v * 0.9], lead: -0.3, trail: 1.5, color: WHITE, mask: 1 },
          ],
          0.1,
          GREY,
        ),
      );
    }
    // laser cannon at the forward corner and ion engine beside the pod
    P.push(box(s * 1.95, 0.0, -1.5, 0.14, 0.14, 1.9, GUN));
    P.push(cyl(s * 0.9, -0.1, 1.5, 0.3, 0.34, 1.9, GREY_DARK, { seg: 6 }));
    P.push(disc(s * 0.9, -0.1, 2.46, 0.3, BLUE_ENGINE, { seg: 6, emis: 2.2 }));
  }
  return merge(P);
}

// leaf-shaped blade from the hinge `h` along unit direction `dir`: `back` metres behind the hinge to
// `fwd` ahead, half-width w (in the plane ⟂ up) and half-thickness t, pointed at both ends
function blade(h, dir, back, fwd, w, t, color, o = {}) {
  const at = (k) => add(h, mul(dir, k));
  const L = back + fwd;
  return tube(
    [
      { p: at(-back), w: 0.03, t: 0.02 },
      { p: at(-back + L * 0.18), w: w * 0.7, t: t * 0.8 },
      { p: at(-back + L * 0.42), w, t },
      { p: at(-back + L * 0.72), w: w * 0.72, t: t * 0.8 },
      { p: at(fwd), w: 0.03, t: 0.02 },
    ],
    color,
    { diamond: true, ...o },
  );
}

// Vulture droid (Xi Char / Haor Chall): 3.5 m body, ~7 m across in flight configuration. A bullet body
// tapering to a tail, the domed head on top at the front with two vertical red photoreceptors, and two
// wing pairs: each side an upper and a lower blade hinged at the flank, swept 40° forward and opened
// ±25° so the four blades make an X from the front and a tuning fork from above, tips ahead of the nose.
// Laser cannons on the lower blades near the tips, thruster aft. Blue-grey with lighter plates.
function vulture() {
  const P = [];
  P.push(
    loft(
      [
        { z: -1.55, hw: 0.28, y0: -0.2, y1: 0.16 },
        { z: -0.9, hw: 0.56, y0: -0.48, y1: 0.36 },
        { z: 0.0, hw: 0.64, y0: -0.56, y1: 0.42 },
        { z: 0.9, hw: 0.5, y0: -0.42, y1: 0.36 },
        { z: 1.95, hw: 0.14, y0: -0.12, y1: 0.12 },
      ],
      WHITE,
      { capStart: true, capEnd: true, mask: 1 },
    ),
  );
  // head: domed helmet on the front, eyes on its forward face
  P.push(
    dome(0, 0.42, -0.55, 0.5, DROID_LIGHT, {
      ws: 6,
      hs: 2,
      sz: 1.4,
      sy: 1.1,
    }),
  );
  for (const s of [-1, 1])
    P.push(
      box(s * 0.14, 0.62, -1.02, 0.08, 0.3, 0.1, RED_EYE, { emis: 0.9 }),
    );
  // thruster
  P.push(cyl(0, -0.05, 1.7, 0.2, 0.26, 0.5, DROID_DARK, { seg: 6 }));
  P.push(disc(0, -0.05, 1.96, 0.2, AMBER_ENGINE, { seg: 6, emis: 2.2 }));
  const sweep = 0.75; // blade yaw from the forward axis (rad)
  const elev = 0.4; // blade rise/fall from the horizontal (rad)
  for (const s of [-1, 1]) {
    const hinge = [s * 0.62, -0.05, 0.35];
    for (const v of [-1, 1]) {
      const dir = norm([
        s * Math.sin(sweep) * Math.cos(elev),
        v * Math.sin(elev),
        -Math.cos(sweep) * Math.cos(elev),
      ]);
      P.push(blade(hinge, dir, 1.2, 4.0, 0.44, 0.14, WHITE, { mask: 1 }));
      // laser cannon housing near the tip of the lower blade
      if (v < 0) {
        const tip = add(hinge, mul(dir, 3.1));
        P.push(
          box(tip[0], tip[1] - 0.12, tip[2] - 0.4, 0.14, 0.14, 1.4, DROID_DARK),
        );
      }
    }
  }
  return merge(P);
}

// Droid tri-fighter (Colicoid / Phlac-Arphocc): 5.4 m long. A spherical droid-brain core with three red
// photoreceptor pods on its face, a ring aft carrying three thrusters, and three broad curved arms that
// sweep forward from the ring around the core, bowing out and closing in toward a point, each tipped with
// a laser cannon. Dark grey-blue with light plates.
function tri() {
  const P = [];
  P.push(sphere(0, 0, 0.1, 1.0, DROID_MID, { ws: 8, hs: 4 }));
  P.push(torus(0, 0, 1.55, 1.35, 0.16, DROID_DARK, { radial: 3, tubular: 9 }));
  for (let i = 0; i < 3; i++) {
    const a = Math.PI / 2 + (i * Math.PI * 2) / 3; // one arm up, two down-and-out
    const ux = Math.cos(a);
    const uy = Math.sin(a);
    const at = (r, z) => [ux * r, uy * r, z];
    const rad = [ux, uy, 0];
    P.push(
      tube(
        [
          { p: at(1.35, 1.55), w: 0.34, t: 0.12, u: rad },
          { p: at(1.9, 0.3), w: 0.4, t: 0.14, u: rad, color: WHITE, mask: 1 },
          { p: at(1.75, -1.3), w: 0.36, t: 0.12, u: rad, color: WHITE, mask: 1 },
          { p: at(1.15, -2.7), w: 0.2, t: 0.1, u: rad },
        ],
        DROID_DARK,
      ),
    );
    // cannon at the arm tip
    P.push(box(ux * 1.1, uy * 1.1, -3.4, 0.12, 0.12, 1.3, GUN));
    // photoreceptor pod between two arms, on the sphere's face
    const b = a + Math.PI / 3;
    P.push(
      box(Math.cos(b) * 0.55, Math.sin(b) * 0.55, -0.82, 0.3, 0.18, 0.16, RED_EYE, {
        emis: 0.9,
        rz: b,
      }),
    );
    // thruster on the ring between the arms
    P.push(
      disc(Math.cos(b) * 1.35, Math.sin(b) * 1.35, 1.72, 0.22, RED_ENGINE, {
        seg: 6,
        emis: 2.2,
      }),
    );
  }
  return merge(P);
}

const HYENA_K = 1.42; // the Hyena is modelled at Vulture scale and enlarged to its 12.5 m

// Hyena-class droid bomber (Baktoid): 12.5 m long. The Vulture's big brother: a flat, wide wedge body
// with a raised photoreceptor head at the nose, two hinged wing pairs of broad blades swept forward and
// opened into a shallow X, twin ion drives at the tail and bomb racks under the belly. Dark grey.
function hyena() {
  const P = [];
  P.push(
    loft(
      [
        { z: -3.6, hw: 0.4, y0: -0.3, y1: 0.2 },
        { z: -2.2, hw: 1.1, y0: -0.5, y1: 0.4 },
        { z: -0.4, hw: 1.6, y0: -0.6, y1: 0.5 },
        { z: 1.8, hw: 1.7, y0: -0.62, y1: 0.55 },
        { z: 3.6, hw: 1.2, y0: -0.5, y1: 0.5 },
      ],
      WHITE,
      { capStart: true, capEnd: true, mask: 1 },
    ),
  );
  // head dome and eyes
  P.push(
    dome(0, 0.4, -2.1, 0.7, DROID_LIGHT, { ws: 6, hs: 2, sz: 1.5, sy: 1.1 }),
  );
  for (const s of [-1, 1])
    P.push(box(s * 0.2, 0.7, -2.9, 0.1, 0.4, 0.12, RED_EYE, { emis: 0.9 }));
  // twin ion drives at the tail
  for (const s of [-1, 1]) {
    P.push(cyl(s * 0.7, -0.05, 3.7, 0.42, 0.46, 1.0, DROID_DARK, { seg: 6 }));
    P.push(disc(s * 0.7, -0.05, 4.21, 0.4, AMBER_ENGINE, { seg: 6, emis: 2.2 }));
  }
  // bomb racks under the belly
  P.push(box(0, -0.85, 0.8, 1.6, 0.5, 2.6, DROID_DARK));
  const sweep = 0.5;
  const elev = 0.36;
  for (const s of [-1, 1]) {
    const hinge = [s * 1.65, -0.05, 1.2];
    for (const v of [-1, 1]) {
      const dir = norm([
        s * Math.sin(sweep) * Math.cos(elev),
        v * Math.sin(elev),
        -Math.cos(sweep) * Math.cos(elev),
      ]);
      P.push(blade(hinge, dir, 2.6, 6.8, 0.95, 0.28, WHITE, { mask: 1 }));
    }
  }
  // modelled at 8.6 m over the blades; the class is 12.5 m long
  return merge(P).scale(HYENA_K, HYENA_K, HYENA_K);
}

// HMP droid gunship (Baktoid Fleet Ordnance): 12.3 m long, 11 m wide, 3.1 m high. A broad flat shield
// body — the wings are the swept outer thirds, drooping — with a big circular reactor cap on the dorsal
// rear, a blocky sensor head at the nose with red light bars, two spherical laser turrets slung under the
// forward corners, a chin cannon, missile racks under the wings and ion drives at the wing tips.
// Blue-grey dorsal plating over light grey.
function hmp() {
  const P = [];
  P.push(
    loft(
      [
        { z: -6.15, hw: 0.7, y0: -0.3, y1: 0.4 },
        { z: -5.2, hw: 1.3, y0: -0.55, y1: 0.6 },
        { z: -3.4, hw: 1.7, y0: -0.7, y1: 0.75 },
        { z: 0.0, hw: 1.9, y0: -0.75, y1: 0.8 },
        { z: 3.5, hw: 1.9, y0: -0.65, y1: 0.8 },
        { z: 5.6, hw: 1.5, y0: -0.4, y1: 0.6 },
        { z: 6.15, hw: 1.0, y0: -0.15, y1: 0.35 },
      ],
      HMP_LIGHT,
      { capStart: true, capEnd: true },
    ),
  );
  // dorsal blue plating band and the reactor cap
  P.push(box(0, 0.83, 0.4, 3.4, 0.08, 8.6, WHITE, { mask: 1 }));
  P.push(cyl(0, 0.9, 1.6, 1.9, 1.9, 0.24, DROID_DARK, { seg: 8, open: true }));
  P.push(disc(0, 1.03, 1.6, 1.9, DROID_MID, { seg: 8, axis: "y" }));
  // sensor head: face plate with two red light bars
  P.push(box(0, 0.2, -6.1, 1.3, 0.6, 0.5, DROID_DARK));
  for (const s of [-1, 1])
    P.push(
      box(s * 0.36, 0.22, -6.38, 0.5, 0.08, 0.06, RED_EYE, { emis: 0.9 }),
    );
  // chin cannon
  P.push(box(0, -0.6, -5.4, 0.16, 0.16, 2.6, GUN));
  for (const s of [-1, 1]) {
    // swept wing: thick root blending into the body, drooping tip, ion drive at the tip
    P.push(
      panel(
        [
          { p: [s * 1.85, 0.0], lead: -4.6, trail: 5.4, thick: 1.4 },
          {
            p: [s * 3.6, -0.15],
            lead: -3.6,
            trail: 4.6,
            thick: 0.9,
            color: WHITE,
            mask: 1,
          },
          { p: [s * 5.0, -0.4], lead: -2.0, trail: 3.6, thick: 0.55 },
          { p: [s * 5.5, -0.55], lead: -1.2, trail: 3.2, thick: 0.35 },
        ],
        1.0,
        HMP_LIGHT,
      ),
    );
    P.push(cyl(s * 5.15, -0.45, 3.4, 0.42, 0.46, 1.6, DROID_DARK, { seg: 6 }));
    P.push(
      disc(s * 5.15, -0.45, 4.21, 0.4, BLUE_ENGINE, { seg: 6, emis: 2.0 }),
    );
    // ball turret under the forward corner with twin barrels
    P.push(sphere(s * 2.3, -0.95, -3.8, 0.75, DROID_MID, { ws: 6, hs: 3 }));
    P.push(box(s * 2.12, -0.95, -5.1, 0.12, 0.12, 2.0, GUN));
    P.push(box(s * 2.48, -0.95, -5.1, 0.12, 0.12, 2.0, GUN));
    // missile rack under the wing
    P.push(box(s * 3.9, -0.8, 1.2, 1.0, 0.6, 2.6, DROID_DARK));
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
        [-1.8, -0.1, 5.3],
        [1.8, -0.1, 5.3],
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
        [-0.95, 0.45, 2.2],
        [0.95, 0.45, 2.2],
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
        [-0.9, -0.1, 2.5],
        [0.9, -0.1, 2.5],
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
        [-0.9, -0.1, 2.5],
        [0.9, -0.1, 2.5],
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
      pos: [[0, -0.05, 2.0]],
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
      pos: [[0, 0, 1.75]],
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
    length: 12.5,
    count: 24,
    speed: [170, 205, 250],
    turn: 0.95,
    hp: 3,
    flight: 3,
    spacing: 46,
    paint: [0x3b3f47, 0x444952, 0x363a41],
    engine: {
      pos: [
        [-1.0, -0.07, 6.0],
        [1.0, -0.07, 6.0],
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
        [-5.15, -0.6, 4.3],
        [5.15, -0.45, 4.3],
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
