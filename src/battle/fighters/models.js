// Starfighter models: seven original low-poly designs (≤ 300 triangles each) that share ONE lit material.
// Every vertex carries a colour plus two scalars packed into the (otherwise unused) uv attribute:
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

// hemisphere dome (flat side down, or oriented by o.rx/o.ry/o.rz before translation)
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
  if (o.rx) g.rotateX(o.rx);
  if (o.rz) g.rotateZ(o.rz);
  if (o.ry) g.rotateY(o.ry);
  g.translate(cx, cy, cz);
  return paint(g, color, o.mask || 0, o.emis || 0);
}

function sphere(cx, cy, cz, r, color, o = {}) {
  const g = new THREE.SphereGeometry(r, o.ws || 8, o.hs || 4);
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

// a lofted plate built along +Z (span) with chord along X, then swung to span along ±X:
// side = +1 right wing, -1 left wing; dihedral tilts the tip up (+) or down (-); rootAt = [x, y, z]
function wingPanel(sections, color, side, dihedral, rootAt, o = {}) {
  const g = loft(sections, color, { capEnd: true, ...o });
  g.rotateY((side * Math.PI) / 2); // +Z span -> ±X
  g.rotateZ(side * dihedral);
  g.translate(rootAt[0], rootAt[1], rootAt[2]);
  return g;
}

// ---------------------------------------------------------------------------
// palette (sRGB hex; THREE.Color converts to the working space)
// ---------------------------------------------------------------------------
const GREY = 0xb9b5ac;
const GREY_DARK = 0x8f8c85;
const DARK = 0x2e3036;
const GLASS = 0x1a2434;
const WHITE = 0xffffff; // painted areas carry white + mask so the instance colour shows
const BRONZE = 0x6e6152;
const BRONZE_DARK = 0x2b2622;
const TRI_DARK = 0x2a2c31;
// kept below 1.0 radiance so ACES does not desaturate the photoreceptors to salmon
const RED_EYE = new THREE.Color(1.0, 0.09, 0.05);
const BLUE_ENGINE = new THREE.Color(0.55, 0.78, 1.0);
const AMBER_ENGINE = new THREE.Color(1.0, 0.55, 0.22);

// ---------------------------------------------------------------------------
// the fighters
// ---------------------------------------------------------------------------

// Republic heavy starfighter: long fuselage, gunner pod aft, four wing panels in an X with red tips,
// twin engines. ~14 m.
function heavyFighter() {
  const P = [];
  P.push(
    loft(
      [
        { z: -7.6, hw: 0.32, y0: -0.28, y1: 0.28 },
        { z: -5.2, hw: 0.95, y0: -0.8, y1: 0.66 },
        { z: -2.2, hw: 1.3, y0: -1.05, y1: 0.92 },
        { z: 1.6, hw: 1.3, y0: -1.05, y1: 0.92 },
        { z: 4.6, hw: 1.12, y0: -0.9, y1: 0.82 },
        { z: 6.6, hw: 0.75, y0: -0.55, y1: 0.58 },
      ],
      GREY,
      { capStart: true, capEnd: true },
    ),
  );
  // canopy (front) and rear gunner pod: dark glass with a faint cabin glow
  P.push(
    loft(
      [
        { z: -3.6, hw: 0.5, y0: 0.88, y1: 0.94 },
        { z: -2.4, hw: 0.74, y0: 0.88, y1: 1.62 },
        { z: -0.4, hw: 0.74, y0: 0.88, y1: 1.66 },
        { z: 0.7, hw: 0.55, y0: 0.88, y1: 0.98 },
      ],
      GLASS,
      { bottom: false, emis: 0.3 },
    ),
  );
  P.push(
    loft(
      [
        { z: 2.9, hw: 0.5, y0: 0.82, y1: 0.9 },
        { z: 3.7, hw: 0.7, y0: 0.82, y1: 1.55 },
        { z: 5.2, hw: 0.62, y0: 0.82, y1: 1.42 },
        { z: 6.1, hw: 0.4, y0: 0.82, y1: 0.86 },
      ],
      GLASS,
      { bottom: false, emis: 0.3 },
    ),
  );
  // red squadron stripe over the nose and two flank stripes (painted -> instance colour)
  P.push(box(0, 0.62, -5.4, 0.42, 0.08, 2.8, WHITE, { mask: 1 }));
  for (const s of [-1, 1]) {
    P.push(box(s * 1.31, -0.1, -0.3, 0.06, 0.34, 3.6, WHITE, { mask: 1 }));
    // nose cannon
    P.push(box(s * 0.95, -0.25, -7.2, 0.16, 0.16, 3.2, DARK));
    // wing panels: upper and lower, deployed in an X; grey root, red tip
    for (const v of [-1, 1]) {
      P.push(
        wingPanel(
          [
            { z: 0, hw: 1.85, y0: -0.15, y1: 0.15 },
            { z: 4.6, hw: 1.5, y0: -0.11, y1: 0.11, color: WHITE, mask: 1 },
            { z: 7.0, hw: 1.28, y0: -0.08, y1: 0.08 },
          ],
          GREY,
          s,
          v * 0.4,
          [s * 1.2, v * 0.45, 1.4],
        ),
      );
    }
    // twin engines: dark nacelle, glowing nozzle
    P.push(cyl(s * 1.95, -0.2, 4.6, 0.62, 0.72, 4.2, DARK, { seg: 6 }));
    P.push(
      disc(s * 1.95, -0.2, 6.72, 0.62, BLUE_ENGINE, {
        seg: 6,
        emis: 2.2,
      }),
    );
  }
  // engine block joining nacelles to the fuselage
  P.push(box(0, -0.2, 4.8, 3.9, 1.1, 2.6, DARK));
  return merge(P);
}

// Republic wing fighter: small pod with a bubble canopy, two tall fins angled outward with red tips,
// engines at the fin roots. ~7 m.
function wingFighter() {
  const P = [];
  P.push(
    loft(
      [
        { z: -3.6, hw: 0.24, y0: -0.2, y1: 0.2 },
        { z: -2.0, hw: 0.74, y0: -0.7, y1: 0.55 },
        { z: 0.0, hw: 0.9, y0: -0.85, y1: 0.7 },
        { z: 2.0, hw: 0.8, y0: -0.75, y1: 0.7 },
        { z: 3.5, hw: 0.52, y0: -0.48, y1: 0.5 },
      ],
      GREY,
      { capStart: true, capEnd: true },
    ),
  );
  P.push(
    loft(
      [
        { z: -1.7, hw: 0.36, y0: 0.6, y1: 0.66 },
        { z: -0.7, hw: 0.5, y0: 0.6, y1: 1.26 },
        { z: 0.8, hw: 0.5, y0: 0.66, y1: 1.2 },
        { z: 1.6, hw: 0.4, y0: 0.7, y1: 0.76 },
      ],
      GLASS,
      { bottom: false, emis: 0.3 },
    ),
  );
  // astromech dome behind the cockpit
  P.push(dome(0, 0.72, 2.3, 0.34, GREY_DARK, { ws: 6, hs: 2 }));
  // nose stripe
  P.push(box(0, 0.5, -2.2, 0.3, 0.06, 1.8, WHITE, { mask: 1 }));
  for (const s of [-1, 1]) {
    // fin (tall, canted outward) with a red tip band
    P.push(box(s * 1.65, 1.7, 0.7, 0.16, 4.2, 2.0, GREY, { rz: -s * 0.42 }));
    P.push(
      box(s * 2.55, 3.7, 0.7, 0.2, 0.7, 2.06, WHITE, {
        rz: -s * 0.42,
        mask: 1,
      }),
    );
    // engine at the fin root
    P.push(cyl(s * 1.15, 0.05, 1.4, 0.42, 0.48, 2.4, DARK, { seg: 6 }));
    P.push(
      disc(s * 1.15, 0.05, 2.62, 0.42, BLUE_ENGINE, { seg: 6, emis: 2.2 }),
    );
  }
  // main engine at the tail
  P.push(disc(0, 0, 3.52, 0.34, BLUE_ENGINE, { seg: 6, emis: 2.0 }));
  return merge(P);
}

// Jedi interceptor: tiny cockpit pod, flat wing panels with tip fins, astromech dome, two engines.
// The pod and panels are painted (yellow or red per instance). ~5.5 m.
function interceptor() {
  const P = [];
  P.push(
    loft(
      [
        { z: -2.9, hw: 0.2, y0: -0.14, y1: 0.14 },
        { z: -1.6, hw: 0.55, y0: -0.5, y1: 0.42 },
        { z: 0.0, hw: 0.7, y0: -0.6, y1: 0.55 },
        { z: 1.6, hw: 0.6, y0: -0.5, y1: 0.5 },
        { z: 2.6, hw: 0.4, y0: -0.34, y1: 0.36 },
      ],
      WHITE,
      { capStart: true, capEnd: true, mask: 1 },
    ),
  );
  P.push(
    loft(
      [
        { z: -1.2, hw: 0.3, y0: 0.42, y1: 0.46 },
        { z: -0.3, hw: 0.42, y0: 0.44, y1: 1.02 },
        { z: 0.7, hw: 0.42, y0: 0.48, y1: 0.96 },
        { z: 1.3, hw: 0.3, y0: 0.5, y1: 0.54 },
      ],
      GLASS,
      { bottom: false, emis: 0.3 },
    ),
  );
  // astromech socket on the right of the cockpit
  P.push(dome(0.8, 0.3, -0.6, 0.32, GREY, { ws: 6, hs: 2 }));
  P.push(cyl(0.8, 0.12, -0.6, 0.32, 0.32, 0.36, GREY_DARK, { axis: "y" }));
  for (const s of [-1, 1]) {
    // flat painted panel, slightly swept forward; dark grey leading edge strip
    P.push(
      wingPanel(
        [
          { z: 0, hw: 1.3, y0: -0.06, y1: 0.06 },
          { z: 2.7, hw: 1.15, y0: -0.05, y1: 0.05 },
        ],
        WHITE,
        s,
        0.05,
        [s * 0.7, 0.05, 0.4],
        { mask: 1 },
      ),
    );
    // wing-tip fin (vertical) and engine
    P.push(box(s * 3.35, 0.52, 0.5, 0.12, 1.0, 2.1, DARK));
    P.push(cyl(s * 1.05, -0.36, 1.1, 0.3, 0.34, 2.0, DARK, { seg: 6 }));
    P.push(
      disc(s * 1.05, -0.36, 2.12, 0.3, BLUE_ENGINE, { seg: 6, emis: 2.2 }),
    );
  }
  return merge(P);
}

// Separatist droid fighter: bronze head with two red photoreceptors, long wings bent down at the elbow
// and back up at the tips (flight configuration), rear thruster. ~3.8 m body, 7 m span.
function droidFighter() {
  const P = [];
  P.push(
    loft(
      [
        { z: -2.0, hw: 0.42, y0: -0.34, y1: 0.36 },
        { z: -1.0, hw: 0.66, y0: -0.7, y1: 0.76 },
        { z: 0.4, hw: 0.7, y0: -0.8, y1: 0.86 },
        { z: 1.4, hw: 0.55, y0: -0.6, y1: 0.7 },
        { z: 1.9, hw: 0.34, y0: -0.34, y1: 0.4 },
      ],
      WHITE,
      { capStart: true, capEnd: true, mask: 1 },
    ),
  );
  // photoreceptors
  for (const s of [-1, 1])
    P.push(box(s * 0.24, 0.08, -2.02, 0.2, 0.15, 0.12, RED_EYE, { emis: 0.9 }));
  for (const s of [-1, 1]) {
    // inner wing: from the head top, angled down; outer wing: bent back up, darker
    P.push(
      wingPanel(
        [
          { z: 0, hw: 0.85, y0: -0.11, y1: 0.11 },
          { z: 1.9, hw: 0.7, y0: -0.09, y1: 0.09 },
        ],
        WHITE,
        s,
        -0.62,
        [s * 0.55, 0.55, 0.3],
        { mask: 1, capEnd: false },
      ),
    );
    const ex = s * (0.55 + Math.cos(0.62) * 1.9);
    const ey = 0.55 - Math.sin(0.62) * 1.9;
    P.push(
      wingPanel(
        [
          { z: 0, hw: 0.72, y0: -0.1, y1: 0.1 },
          { z: 2.7, hw: 0.5, y0: -0.07, y1: 0.07 },
        ],
        BRONZE_DARK,
        s,
        0.32,
        [ex, ey, 0.3],
      ),
    );
    // claw at the tip
    const tx = ex + s * Math.cos(0.32) * 2.7;
    const ty = ey + Math.sin(0.32) * 2.7;
    P.push(box(tx, ty - 0.3, 0.0, 0.16, 0.7, 0.9, BRONZE_DARK, { rx: 0.35 }));
  }
  // thruster
  P.push(cyl(0, 0, 2.25, 0.3, 0.36, 0.8, BRONZE_DARK, { seg: 6 }));
  P.push(disc(0, 0, 2.66, 0.3, AMBER_ENGINE, { seg: 6, emis: 2.2 }));
  return merge(P);
}

// Separatist tri-arm droid fighter: dark sphere core with a red eye, three arms reaching forward
// around a ring, thruster aft. ~5.4 m.
function triFighter() {
  const P = [];
  P.push(sphere(0, 0, 0, 1.05, WHITE, { ws: 8, hs: 4, mask: 1 }));
  P.push(
    dome(0, 0, -1.0, 0.36, RED_EYE, {
      ws: 6,
      hs: 2,
      rx: -Math.PI / 2,
      emis: 0.9,
    }),
  );
  for (let i = 0; i < 3; i++) {
    const a = Math.PI / 2 + (i * Math.PI * 2) / 3;
    const cx = Math.cos(a);
    const cy = Math.sin(a);
    // radial strut from the core out to the ring, then the forward arm
    P.push(
      box(cx * 1.35, cy * 1.35, -0.3, 1.7, 0.34, 0.34, TRI_DARK, { rz: a }),
    );
    P.push(box(cx * 2.05, cy * 2.05, -0.6, 0.3, 0.3, 3.4, TRI_DARK));
    // tip cap
    P.push(box(cx * 2.05, cy * 2.05, -2.45, 0.42, 0.42, 0.4, DARK));
  }
  P.push(torus(0, 0, -0.9, 2.05, 0.15, TRI_DARK, { radial: 3, tubular: 12 }));
  P.push(cyl(0, 0, 1.3, 0.36, 0.42, 0.8, TRI_DARK, { seg: 6 }));
  P.push(disc(0, 0, 1.72, 0.36, AMBER_ENGINE, { seg: 6, emis: 2.2 }));
  return merge(P);
}

// Republic gunship: boxy troop transport with a canopy, side bay doors, stub wings with engine pods,
// twin tail fins and two ball turrets. ~17 m.
function gunship() {
  const P = [];
  P.push(
    loft(
      [
        { z: -8.6, hw: 0.9, y0: -0.6, y1: 0.6 },
        { z: -6.0, hw: 1.6, y0: -1.3, y1: 1.2 },
        { z: -2.0, hw: 1.8, y0: -1.5, y1: 1.4 },
        { z: 3.0, hw: 1.8, y0: -1.5, y1: 1.4 },
        { z: 6.6, hw: 1.3, y0: -1.0, y1: 1.1 },
        { z: 8.6, hw: 0.7, y0: -0.4, y1: 0.7 },
      ],
      GREY,
      { capStart: true, capEnd: true },
    ),
  );
  P.push(
    loft(
      [
        { z: -7.2, hw: 0.7, y0: 1.08, y1: 1.14 },
        { z: -6.0, hw: 0.9, y0: 1.14, y1: 1.9 },
        { z: -4.0, hw: 0.9, y0: 1.3, y1: 1.9 },
        { z: -3.2, hw: 0.7, y0: 1.34, y1: 1.4 },
      ],
      GLASS,
      { bottom: false, emis: 0.3 },
    ),
  );
  // painted flank stripes and a nose stripe
  P.push(box(0, 1.35, -6.6, 0.6, 0.06, 2.4, WHITE, { mask: 1 }));
  for (const s of [-1, 1]) {
    P.push(box(s * 1.82, 1.0, 0.2, 0.08, 0.36, 7.2, WHITE, { mask: 1 }));
    // side bay door (dark recess)
    P.push(box(s * 1.84, -0.35, 0.6, 0.08, 1.7, 4.6, DARK));
    // stub wing and engine pod
    P.push(box(s * 3.2, 0.7, 1.2, 3.2, 0.3, 2.4, GREY));
    P.push(cyl(s * 4.9, 0.7, 1.6, 0.7, 0.78, 3.6, DARK, { seg: 6 }));
    P.push(disc(s * 4.9, 0.7, 3.42, 0.7, BLUE_ENGINE, { seg: 6, emis: 2.2 }));
    // tail fin (canted) and ball turret under the wing root
    P.push(box(s * 0.95, 1.9, 7.0, 0.14, 2.0, 2.0, GREY, { rz: -s * 0.35 }));
    P.push(
      dome(s * 2.8, -0.85, -1.4, 0.5, GREY_DARK, {
        ws: 6,
        hs: 2,
        rx: Math.PI,
      }),
    );
  }
  return merge(P);
}

// ---------------------------------------------------------------------------
// type table
// ---------------------------------------------------------------------------
// speed: [min, cruise, max] m/s; turn: rad/s; hp: hits to destroy; flight: fighters per flight;
// spacing: formation slot unit (m); paint: per-instance squadron colours (cycled);
// engine: glow sprite anchor (local), radius (m), streak length (in radii), colour, intensity.
export const FIGHTER_DEFS = {
  heavy: {
    side: "republic",
    build: heavyFighter,
    count: 84,
    speed: [200, 245, 300],
    turn: 1.35,
    hp: 3,
    flight: 3,
    spacing: 42,
    paint: [0x9c2a22, 0x9c2a22, 0x9c2a22, 0xc9a227],
    engine: {
      pos: [0, -0.2, 6.9],
      size: 2.6,
      tail: 5,
      color: [0.55, 0.75, 1.0],
      glow: 1.2,
    },
    role: { cap: 0.3 },
  },
  wing: {
    side: "republic",
    build: wingFighter,
    count: 48,
    speed: [220, 280, 330],
    turn: 1.8,
    hp: 2,
    flight: 2,
    spacing: 30,
    paint: [0x9c2a22],
    engine: {
      pos: [0, 0, 3.6],
      size: 1.9,
      tail: 5,
      color: [0.55, 0.75, 1.0],
      glow: 1.2,
    },
    role: { cap: 0.45 },
  },
  interceptorY: {
    side: "republic",
    build: interceptor,
    geometry: "interceptor",
    count: 10,
    speed: [230, 300, 350],
    turn: 2.4,
    hp: 6,
    flight: 2,
    pairWith: "interceptorR",
    spacing: 26,
    paint: [0xe0b83a],
    engine: {
      pos: [0, -0.36, 2.2],
      size: 1.6,
      tail: 6,
      color: [0.6, 0.8, 1.0],
      glow: 1.2,
    },
    role: { cap: 0.2 },
  },
  interceptorR: {
    side: "republic",
    build: interceptor,
    geometry: "interceptor",
    count: 10,
    speed: [230, 300, 350],
    turn: 2.4,
    hp: 6,
    flight: 2,
    spacing: 26,
    paint: [0xb0362c],
    engine: {
      pos: [0, -0.36, 2.2],
      size: 1.6,
      tail: 6,
      color: [0.6, 0.8, 1.0],
      glow: 1.2,
    },
    role: { cap: 0.2 },
  },
  gunship: {
    side: "republic",
    build: gunship,
    count: 8,
    speed: [200, 215, 240],
    turn: 0.9,
    hp: 4,
    flight: 2,
    spacing: 60,
    paint: [0x9c2a22],
    engine: {
      pos: [0, 0.7, 3.5],
      size: 2.6,
      tail: 3,
      color: [0.55, 0.75, 1.0],
      glow: 1.0,
    },
    role: { transit: 1 },
  },
  droid: {
    side: "separatist",
    build: droidFighter,
    count: 140,
    speed: [210, 270, 330],
    turn: 2.0,
    hp: 1,
    flight: 4,
    spacing: 22,
    paint: [0x7a6a55, 0x6b5d4c, 0x85735c, 0x5f5546],
    engine: {
      pos: [0, 0, 2.7],
      size: 1.6,
      tail: 5,
      color: [1.0, 0.5, 0.2],
      glow: 1.2,
    },
    role: { cap: 0.25 },
  },
  tri: {
    side: "separatist",
    build: triFighter,
    count: 70,
    speed: [220, 290, 350],
    turn: 2.2,
    hp: 2,
    flight: 3,
    spacing: 26,
    paint: [0x4a4d54, 0x3f4247, 0x55585f],
    engine: {
      pos: [0, 0, 1.8],
      size: 1.8,
      tail: 5,
      color: [1.0, 0.45, 0.25],
      glow: 1.2,
    },
    role: { cap: 0.25 },
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
