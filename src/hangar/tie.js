// Original TIE-style fighter: ball cockpit with an octagonal viewport, twin pylons and two tall hexagonal
// solar-panel wings with a framed lattice. Every craft is exactly three meshes (geometry merged per
// material, vertex colours carry the shading, tint and unit stencil):
//   hull  - lit, vertex-coloured: pod, pylons, hubs, viewport / hatch rings and struts, wing lattice
//   panel - lit, vertex-coloured, double-sided: the two solar wings and the rear hatch plate
//   glow  - unlit HDR: twin red-orange ion engines (bloom picks them up), faint blue viewport light
// A shared < 300-triangle far LOD (buildTieFar) is what traffic.js instances for distant fighters.
// Forward is -Z, up is +Y, units are metres. Exterior lighting comes from the same kind of injected sun
// term the hull uses, so the fighters never depend on interior light fixtures.
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

export const TIE = {
  span: 6.5, // outer wing face to outer wing face
  wingHeight: 7.0,
  wingDepth: 4.6,
  podRadius: 2.0,
  // half extents of the whole craft in its local frame (x span, y height, z depth)
  halfExtents: Object.freeze({ x: 3.5, y: 3.6, z: 2.45 }),
  farDistance: 600, // beyond this the instanced far LOD is drawn instead of the three detail meshes
};

// Default sun (matches the exterior's initial sun); traffic.js shares the exterior's uniforms when it can.
export function makeSun() {
  return {
    dir: { value: new THREE.Vector3(-0.46, 0.38, 0.8).normalize() },
    color: { value: new THREE.Color(1.0, 0.95, 0.88).multiplyScalar(2.4) },
  };
}

// Same idea as the exterior hull materials: a directional sun term added inside the standard lighting
// loop, so no scene DirectionalLight (and no shadow map) is needed for objects flying in space.
function sunPatch(mat, sun) {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uSunDir = sun.dir;
    shader.uniforms.uSunColor = sun.color;
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform vec3 uSunDir;\nuniform vec3 uSunColor;")
      .replace(
        "#include <lights_fragment_begin>",
        `#include <lights_fragment_begin>
  {
    IncidentLight sunLight;
    sunLight.color = uSunColor;
    sunLight.direction = normalize( ( viewMatrix * vec4( uSunDir, 0.0 ) ).xyz );
    sunLight.visible = true;
    RE_Direct( sunLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
  }`,
      );
  };
  mat.customProgramCacheKey = () => "tie-sun";
  mat.fog = false;
  return mat;
}

// ---------------------------------------------------------------------------
// palette (hex = sRGB, converted to linear by THREE.Color; glow values are linear HDR)
// ---------------------------------------------------------------------------
const C = {
  pod: new THREE.Color(0x9ea4ab),
  mid: new THREE.Color(0x767d86),
  frame: new THREE.Color(0x474d57),
  panel: new THREE.Color(0x22272f),
  engine: new THREE.Color(1.0, 0.36, 0.18).multiplyScalar(3.4),
  viewport: new THREE.Color(0.05, 0.13, 0.32),
};
// unit stencils: squadron colour of the painted band across one row of solar cells
const UNIT_BANDS = [new THREE.Color(0x8c2424), new THREE.Color(0xc4c8ce), new THREE.Color(0x2f568f)];
// slight per-craft variation of the hull paint
const TINTS = [
  new THREE.Color(1.0, 1.0, 1.0),
  new THREE.Color(1.03, 1.0, 0.96),
  new THREE.Color(0.95, 0.97, 1.03),
  new THREE.Color(0.9, 0.9, 0.92),
  new THREE.Color(1.05, 1.04, 1.02),
  new THREE.Color(0.97, 0.99, 1.0),
];

// hexagon wing outline in the (y, z) plane: flat vertical edges between +-H/2, points at +-H
const H = TIE.wingHeight / 2; // 3.5
const D = TIE.wingDepth / 2; // 2.3
const PANEL_X = 3.18; // wing plane; lattice bars straddle it, outer bar face at 3.27
const HEX = [
  [H, 0],
  [H / 2, D],
  [-H / 2, D],
  [-H, 0],
  [-H / 2, -D],
  [H / 2, -D],
];
// half depth of the hexagon at height y
const hexDepth = (y) => (Math.abs(y) <= H / 2 ? D : (D * (H - Math.abs(y))) / (H / 2));

// ---------------------------------------------------------------------------
// geometry helpers: every part becomes non-indexed with a constant vertex colour so parts of one
// material merge into a single BufferGeometry
// ---------------------------------------------------------------------------
const _m4 = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _v = new THREE.Vector3();
const _s = new THREE.Vector3(1, 1, 1);

function colorize(geo, color) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  if (g !== geo) geo.dispose();
  const n = g.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    arr[i * 3] = color.r;
    arr[i * 3 + 1] = color.g;
    arr[i * 3 + 2] = color.b;
  }
  g.setAttribute("color", new THREE.BufferAttribute(arr, 3));
  return g;
}

function place(geo, x, y, z, rx = 0, ry = 0, rz = 0) {
  _q.setFromEuler(new THREE.Euler(rx, ry, rz));
  _m4.compose(_v.set(x, y, z), _q, _s);
  geo.applyMatrix4(_m4);
  return geo;
}

// a bar between two points in the wing plane at x = px, square cross-section t
function bar(px, y0, z0, y1, z1, t, color) {
  const len = Math.hypot(y1 - y0, z1 - z0);
  const g = colorize(new THREE.BoxGeometry(t, len, t), color);
  // box Y axis aligned with the (y, z) direction of the bar
  const ang = Math.atan2(z1 - z0, y1 - y0);
  return place(g, px, (y0 + y1) / 2, (z0 + z1) / 2, ang, 0, 0);
}

function wingLattice(side, out) {
  const px = side * PANEL_X;
  for (let i = 0; i < 6; i++) {
    const [ay, az] = HEX[i];
    const [by, bz] = HEX[(i + 1) % 6];
    out.push(bar(px, ay, az, by, bz, 0.2, C.frame));
    out.push(bar(px, 0, 0, ay, az, 0.13, C.frame));
  }
  // cross ribs that split the cells: two horizontals at the hexagon corners, two verticals
  for (const y of [H / 2, -H / 2]) out.push(bar(px, y, -D, y, D, 0.11, C.frame));
  for (const z of [-D / 2, D / 2]) {
    const yTop = H - (H / 2) * (Math.abs(z) / D);
    out.push(bar(px, -yTop, z, yTop, z, 0.11, C.frame));
  }
}

// ---------------------------------------------------------------------------
// hull (shared geometry)
// ---------------------------------------------------------------------------
let hullGeo = null;
function buildHullGeometry() {
  if (hullGeo) return hullGeo;
  const parts = [];
  const R = TIE.podRadius;
  parts.push(colorize(new THREE.SphereGeometry(R, 24, 16), C.pod));
  // viewport ring + 8 struts (octagon with a flat top)
  const oct = Math.PI / 8;
  parts.push(place(colorize(new THREE.TorusGeometry(1.12, 0.09, 6, 8), C.frame), 0, 0, -1.7, 0, 0, oct));
  for (let i = 0; i < 8; i++) {
    const a = i * (Math.PI / 4) + oct;
    const g = colorize(new THREE.BoxGeometry(0.06, 1.08, 0.06), C.frame);
    place(g, Math.cos(a) * 0.56, Math.sin(a) * 0.56, -1.8, 0, 0, a - Math.PI / 2);
    parts.push(g);
  }
  // raised bezel behind the ring so the viewport reads as a hatch, not a decal
  parts.push(place(colorize(new THREE.CylinderGeometry(1.24, 1.32, 0.22, 8), C.mid), 0, 0, -1.58, Math.PI / 2, oct, 0));
  // rear hatch ring
  parts.push(place(colorize(new THREE.TorusGeometry(0.84, 0.08, 6, 8), C.frame), 0, 0, 1.78, 0, 0, oct));
  // twin engine housings, low on the aft face
  for (const x of [-0.62, 0.62]) parts.push(place(colorize(new THREE.CylinderGeometry(0.44, 0.36, 0.5, 12), C.frame), x, -0.42, 1.8, Math.PI / 2, 0, 0));
  // pylons: collar at the pod, tapered strut, wing hub
  for (const side of [-1, 1]) {
    parts.push(place(colorize(new THREE.CylinderGeometry(0.72, 0.72, 0.3, 12), C.mid), side * 2.02, 0, 0, 0, 0, Math.PI / 2));
    parts.push(place(colorize(new THREE.CylinderGeometry(0.5, 0.62, 1.4, 10), C.mid), side * 2.45, 0, 0, 0, 0, Math.PI / 2));
    parts.push(place(colorize(new THREE.CylinderGeometry(0.95, 0.95, 0.46, 12), C.mid), side * 2.95, 0, 0, 0, 0, Math.PI / 2));
    parts.push(place(colorize(new THREE.CylinderGeometry(0.5, 0.5, 0.22, 10), C.frame), side * 3.36, 0, 0, 0, 0, Math.PI / 2));
    wingLattice(side, parts);
  }
  hullGeo = mergeGeometries(parts, false);
  for (const p of parts) p.dispose();
  hullGeo.computeBoundingSphere();
  return hullGeo;
}

// ---------------------------------------------------------------------------
// panels (per craft: tint + stencil band live in the vertex colours)
// ---------------------------------------------------------------------------
const ROW_EDGES = [-H, -H * 0.75, -H / 2, -H / 4, 0, H / 4, H / 2, H * 0.75, H];

function buildPanelGeometry(variant) {
  const tint = TINTS[variant % TINTS.length];
  const band = UNIT_BANDS[variant % UNIT_BANDS.length];
  const bandRow = 1 + (variant % 6);
  const pos = [];
  const nrm = [];
  const col = [];
  const uv = [];
  const c = new THREE.Color();
  const quad = (x, y0, y1, ci) => {
    // trapezoid row of the hexagon, both faces come from DoubleSide on the material
    const d0 = hexDepth(y0);
    const d1 = hexDepth(y1);
    const pts = [
      [x, y0, -d0],
      [x, y0, d0],
      [x, y1, d1],
      [x, y1, -d1],
    ];
    const idx = x > 0 ? [0, 2, 1, 0, 3, 2] : [0, 1, 2, 0, 2, 3];
    for (const k of idx) {
      pos.push(...pts[k]);
      nrm.push(Math.sign(x), 0, 0);
      col.push(ci.r, ci.g, ci.b);
      uv.push(pts[k][2] / (2 * D) + 0.5, pts[k][1] / (2 * H) + 0.5);
    }
  };
  for (const side of [-1, 1]) {
    for (let r = 0; r < ROW_EDGES.length - 1; r++) {
      if (r === bandRow) c.copy(band);
      else c.copy(C.panel).multiplyScalar(r % 2 ? 0.9 : 1.08);
      c.multiply(tint);
      quad(side * PANEL_X, ROW_EDGES[r], ROW_EDGES[r + 1], c);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  // rear hatch plate (dark, sits inside the hatch ring)
  const hatch = place(colorize(new THREE.CircleGeometry(0.8, 8), C.panel.clone().multiply(tint)), 0, 0, 1.8, 0, 0, Math.PI / 8);
  const merged = mergeGeometries([g, hatch], false);
  g.dispose();
  hatch.dispose();
  merged.computeBoundingSphere();
  return merged;
}

// ---------------------------------------------------------------------------
// glow (shared): engine discs + viewport plate
// ---------------------------------------------------------------------------
let glowGeo = null;
function buildGlowGeometry() {
  if (glowGeo) return glowGeo;
  const parts = [];
  for (const x of [-0.62, 0.62]) parts.push(place(colorize(new THREE.CircleGeometry(0.33, 12), C.engine), x, -0.42, 2.02));
  const plate = colorize(new THREE.CircleGeometry(1.06, 8), C.viewport);
  plate.rotateZ(Math.PI / 8);
  plate.rotateY(Math.PI); // face -Z
  plate.translate(0, 0, -1.78);
  parts.push(plate);
  glowGeo = mergeGeometries(parts, false);
  for (const p of parts) p.dispose();
  glowGeo.computeBoundingSphere();
  return glowGeo;
}

// ---------------------------------------------------------------------------
// materials
// ---------------------------------------------------------------------------
const sharedMats = new WeakMap(); // sun -> { panel, glow }
function materialsFor(sun) {
  let m = sharedMats.get(sun);
  if (!m) {
    m = {
      panel: sunPatch(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.62, metalness: 0.45, side: THREE.DoubleSide }), sun),
      glow: new THREE.MeshBasicMaterial({ vertexColors: true, fog: false }),
    };
    sharedMats.set(sun, m);
  }
  return m;
}
function hullMaterial(tint, sun) {
  return sunPatch(new THREE.MeshStandardMaterial({ color: tint, vertexColors: true, roughness: 0.5, metalness: 0.55 }), sun);
}

/**
 * Build one detailed fighter: a Group with three meshes (hull, panel, glow) at the origin, facing -Z.
 * `variant` picks the hull tint, the squadron band colour and the band row; `sun` is the shared sun
 * uniform object ({ dir: { value: Vector3 }, color: { value: Color } }).
 */
export function buildTie({ variant = 0, sun = null } = {}) {
  const sunU = sun || defaultSun();
  const mats = materialsFor(sunU);
  const root = new THREE.Group();
  root.name = "tie";
  const hull = new THREE.Mesh(buildHullGeometry(), hullMaterial(TINTS[variant % TINTS.length], sunU));
  hull.name = "hull";
  const panel = new THREE.Mesh(buildPanelGeometry(variant), mats.panel);
  panel.name = "panel";
  const glow = new THREE.Mesh(buildGlowGeometry(), mats.glow);
  glow.name = "glow";
  for (const m of [hull, panel, glow]) {
    m.castShadow = false;
    m.receiveShadow = false;
    root.add(m);
  }
  root.userData.variant = variant;
  return root;
}

let _defaultSun = null;
function defaultSun() {
  if (!_defaultSun) _defaultSun = makeSun();
  return _defaultSun;
}

/**
 * Far LOD: one vertex-coloured low-poly body (pod, pylons, two hexagon plates; 116 triangles) and one
 * HDR glow quad on the aft face, both meant to be drawn through InstancedMesh for every distant fighter.
 */
export function buildTieFar(sun = null) {
  const sunU = sun || defaultSun();
  const parts = [];
  parts.push(colorize(new THREE.SphereGeometry(TIE.podRadius, 8, 6), C.pod));
  for (const side of [-1, 1]) {
    parts.push(place(colorize(new THREE.BoxGeometry(1.3, 1.1, 1.1), C.mid), side * 2.5, 0, 0));
    const hex = new THREE.BufferGeometry();
    const pos = [];
    const nrm = [];
    const col = [];
    const uv = [];
    const x = side * PANEL_X;
    for (let i = 0; i < 6; i++) {
      const [ay, az] = HEX[i];
      const [by, bz] = HEX[(i + 1) % 6];
      const tri = side > 0 ? [[x, 0, 0], [x, ay, az], [x, by, bz]] : [[x, 0, 0], [x, by, bz], [x, ay, az]];
      for (const p of tri) {
        pos.push(...p);
        nrm.push(side, 0, 0);
        col.push(C.panel.r, C.panel.g, C.panel.b);
        uv.push(0, 0);
      }
    }
    hex.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    hex.setAttribute("normal", new THREE.Float32BufferAttribute(nrm, 3));
    hex.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    hex.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    parts.push(hex);
  }
  const geometry = mergeGeometries(parts, false);
  for (const p of parts) p.dispose();
  geometry.computeBoundingSphere();
  const material = sunPatch(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.45, side: THREE.DoubleSide }), sunU);
  const glowGeometry = colorize(new THREE.PlaneGeometry(1.7, 0.7), C.engine);
  glowGeometry.translate(0, -0.42, 2.05);
  const glowMaterial = new THREE.MeshBasicMaterial({ vertexColors: true, fog: false });
  return { geometry, material, glowGeometry, glowMaterial };
}
