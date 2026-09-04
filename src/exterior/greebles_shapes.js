// Shape catalogue for the exterior detail layers (EXT-B). Every factory returns ONE merged geometry
// (non-indexed, with position / normal / uv / color) sized in metres, sitting on the surface plane
// y = 0 and extending toward +y. Per-part tints are baked into the vertex colour so a single
// InstancedMesh (one material) can mix light plates, mid-grey machinery and near-black trim; the
// instance colour multiplies on top for per-copy variation.
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { worldUVs, setVertexColor } from "../kit.js";
import { PALETTE } from "../materials.js";

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const _e = new THREE.Euler();

// Greebles read by shadow, not by albedo: bodies sit in the plate tones (light / mid), `dark` is for
// rims, saddles and brackets, `black` only for vent throats, recess back plates and pipe undersides.
export const TINT = {
  light: PALETTE.hullLight,
  mid: PALETTE.hullMid,
  dark: PALETTE.hullDark,
  trench: PALETTE.hullTrench,
  black: new THREE.Color("#23262b"),
  white: new THREE.Color("#ffffff"),
};

/**
 * Base-darkening gradient baked into the vertex colours: the lowest `band` metres of a shape fall to
 * `floor` of their tone (a studio-model style contact shadow / grime line where the part meets the
 * plating), so parts read as sitting ON the hull even in flat fill light.
 */
export function baseGradient(geo, { floor = 0.66, band = null } = {}) {
  const pos = geo.attributes.position;
  const col = geo.attributes.color;
  if (!pos || !col) return geo;
  if (!geo.boundingBox) geo.computeBoundingBox();
  const h = geo.boundingBox.max.y - geo.boundingBox.min.y;
  const b = band ?? Math.min(2.4, Math.max(0.3, h * 0.45));
  for (let i = 0; i < pos.count; i++) {
    const t = Math.min(1, Math.max(0, (pos.getY(i) - geo.boundingBox.min.y) / b));
    const k = floor + (1 - floor) * t * t * (3 - 2 * t);
    col.setXYZ(i, col.getX(i) * k, col.getY(i) * k, col.getZ(i) * k);
  }
  col.needsUpdate = true;
  return geo;
}

/**
 * Kit-bash a list of parts into one geometry.
 * part: { geo, pos: [x,y,z], rot: [rx,ry,rz], scale: [sx,sy,sz], color: THREE.Color|number }
 * texel: planar world-UV density (tiles per metre) applied per part in shape-local space.
 * gradient: bake the base-darkening gradient (default on; emissive / flat fittings pass false).
 */
export function bash(parts, { texel = 1 / 8, gradient = true } = {}) {
  const geos = [];
  for (const part of parts) {
    let g = part.geo;
    _q.identity();
    if (part.rot) _q.setFromEuler(_e.set(part.rot[0], part.rot[1], part.rot[2]));
    _p.set(...(part.pos || [0, 0, 0]));
    _s.set(...(part.scale || [1, 1, 1]));
    _m.compose(_p, _q, _s);
    g.applyMatrix4(_m);
    if (g.index) g = g.toNonIndexed();
    if (!g.attributes.normal) g.computeVertexNormals();
    worldUVs(g, part.texel || texel);
    setVertexColor(g, part.color === undefined ? TINT.mid : part.color);
    for (const key of Object.keys(g.attributes)) if (!["position", "normal", "uv", "color"].includes(key)) g.deleteAttribute(key);
    geos.push(g);
  }
  const merged = mergeGeometries(geos, false);
  if (!merged) throw new Error("bash: nothing to merge");
  merged.computeBoundingBox();
  merged.computeBoundingSphere();
  if (gradient) baseGradient(merged);
  return merged;
}

/** Triangle count of a (non-indexed or indexed) geometry. */
export function triCount(geo) {
  return geo.index ? geo.index.count / 3 : geo.attributes.position.count / 3;
}

const box = (w, h, d, x, y, z, color, rot) => ({ geo: new THREE.BoxGeometry(w, h, d), pos: [x, y, z], color, rot });
const cylY = (r, h, x, y, z, color, seg = 10, r2 = r, open = false) => ({ geo: new THREE.CylinderGeometry(r2, r, h, seg, 1, open), pos: [x, y, z], color });
const cylZ = (r, len, x, y, z, color, seg = 8, open = true) => ({ geo: new THREE.CylinderGeometry(r, r, len, seg, 1, open), pos: [x, y, z], rot: [Math.PI / 2, 0, 0], color });
const cylX = (r, len, x, y, z, color, seg = 8, open = true) => ({ geo: new THREE.CylinderGeometry(r, r, len, seg, 1, open), pos: [x, y, z], rot: [0, 0, Math.PI / 2], color });

// ---------------------------------------------------------------------------
// Flat-surface details (hatches, plates)
// ---------------------------------------------------------------------------
/** Small maintenance hatch: dark rim, raised light plate, hinge bar. ~2.6 m */
export function hatchSmall() {
  return bash([
    box(2.8, 0.22, 2.8, 0, 0.11, 0, TINT.dark),
    box(2.3, 0.45, 2.3, 0, 0.42, 0, TINT.light),
    box(0.35, 0.18, 2.0, -0.95, 0.72, 0, TINT.dark),
    box(0.5, 0.12, 0.5, 0.7, 0.7, 0.7, TINT.dark),
  ]);
}
/** Large access hatch: rim, two door leaves with a seam, hinge bars. ~7 m */
export function hatchLarge() {
  return bash([
    box(7.2, 0.35, 7.2, 0, 0.17, 0, TINT.dark),
    box(3.1, 0.7, 6.4, -1.7, 0.6, 0, TINT.light),
    box(3.1, 0.7, 6.4, 1.7, 0.6, 0, TINT.light),
    box(0.3, 0.3, 6.4, 0, 0.75, 0, TINT.black),
    box(0.6, 0.25, 5.8, -3.1, 1.05, 0, TINT.dark),
    box(0.6, 0.25, 5.8, 3.1, 1.05, 0, TINT.dark),
  ]);
}
/** Large service bay plate (L band): raised slab, rim, two door panels, corner bollards. 16 × 12 m */
export function bayPlate() {
  return bash(
    [
      box(16, 0.5, 12, 0, 0.25, 0, TINT.dark),
      box(15, 1.2, 11, 0, 1.0, 0, TINT.mid),
      box(6.6, 0.5, 9.6, -3.5, 1.8, 0, TINT.light),
      box(6.6, 0.5, 9.6, 3.5, 1.8, 0, TINT.light),
      box(0.5, 0.6, 9.6, 0, 1.85, 0, TINT.black),
      box(1.2, 1.6, 1.2, -7.0, 1.3, -5.2, TINT.mid),
      box(1.2, 1.6, 1.2, 7.0, 1.3, -5.2, TINT.mid),
      box(1.2, 1.6, 1.2, -7.0, 1.3, 5.2, TINT.mid),
      box(1.2, 1.6, 1.2, 7.0, 1.3, 5.2, TINT.mid),
    ],
    { texel: 1 / 14 },
  );
}
/** Raised panel-seam strip: 0.5 wide, 0.35 tall, 1 m long (scaled along z); no gradient (it IS the shadow line). */
export function seamStrip() {
  return bash([box(0.5, 0.35, 1, 0, 0.17, 0, TINT.dark)], { gradient: false });
}
/** Landing / service pad (L): 10 m disc with a ring and centre marker. */
export function landingPad() {
  return bash([cylY(5.2, 0.5, 0, 0.25, 0, TINT.dark, 16), cylY(4.6, 0.3, 0, 0.65, 0, TINT.light, 16), cylY(1.2, 0.2, 0, 0.9, 0, TINT.dark, 8)], { texel: 1 / 10 });
}

// ---------------------------------------------------------------------------
// Machinery
// ---------------------------------------------------------------------------
/** Plain equipment box (scale in the instance matrix). 1 × 1 × 1 */
export function plainBox() {
  return bash([box(1, 1, 1, 0, 0.5, 0, TINT.mid)]);
}
/** Stacked equipment block: three offset boxes. ~4 m */
export function boxStack() {
  return bash([box(4, 1.6, 3, 0, 0.8, 0, TINT.light), box(2.6, 1.4, 2.2, -0.5, 2.3, 0.2, TINT.mid), box(1.2, 1.0, 1.2, 1.0, 3.5, -0.3, TINT.light)]);
}
/** Horizontal tank on saddles, axis z, r 1, length 4. */
export function tankH() {
  return bash([
    { geo: new THREE.CylinderGeometry(1, 1, 4, 10, 1, false), pos: [0, 1.25, 0], rot: [Math.PI / 2, 0, 0], color: TINT.light },
    box(2.4, 0.5, 0.5, 0, 0.25, -1.3, TINT.dark),
    box(2.4, 0.5, 0.5, 0, 0.25, 1.3, TINT.dark),
    box(0.3, 0.3, 4.4, 0, 2.3, 0, TINT.dark),
  ]);
}
/** Vertical tank / silo with a top valve block. r 1.2 h 3 */
export function tankV() {
  return bash([cylY(1.2, 3, 0, 1.5, 0, TINT.light, 10), cylY(1.35, 0.4, 0, 0.2, 0, TINT.dark, 10), box(0.7, 0.6, 0.7, 0, 3.3, 0, TINT.dark), cylY(0.2, 1.0, 0.9, 3.5, 0, TINT.dark, 6)]);
}
/** Large cylindrical reservoir (L): r 3, len 12, with two collar rings and a cradle. */
export function tankLarge() {
  return bash(
    [
      { geo: new THREE.CylinderGeometry(3, 3, 12, 14, 1, false), pos: [0, 3.6, 0], rot: [Math.PI / 2, 0, 0], color: TINT.light },
      { geo: new THREE.CylinderGeometry(3.2, 3.2, 0.8, 14, 1, true), pos: [0, 3.6, -3.5], rot: [Math.PI / 2, 0, 0], color: TINT.mid },
      { geo: new THREE.CylinderGeometry(3.2, 3.2, 0.8, 14, 1, true), pos: [0, 3.6, 3.5], rot: [Math.PI / 2, 0, 0], color: TINT.mid },
      box(7, 1.2, 2, 0, 0.6, -4, TINT.dark),
      box(7, 1.2, 2, 0, 0.6, 4, TINT.dark),
      box(0.6, 0.6, 12.5, 0, 6.6, 0, TINT.dark),
    ],
    { texel: 1 / 12 },
  );
}
/** Slatted vent: dark throat with five angled light louvres. 2.4 × 1.2 × 1.6 */
export function vent() {
  const parts = [box(2.4, 1.2, 1.6, 0, 0.6, 0, TINT.black)];
  for (let i = 0; i < 5; i++) parts.push(box(2.2, 0.16, 0.5, 0, 0.25 + i * 0.2, -0.75 + 0.05, TINT.light, [0.55, 0, 0]));
  return bash(parts);
}
/** Large intake vent (M): hull-tone frame, dark throat behind seven vertical louvres. 5 × 3 × 2 */
export function ventLarge() {
  const parts = [box(5, 0.5, 2, 0, 0.25, 0, TINT.dark), box(4.2, 2.6, 0.6, 0, 1.6, 0.5, TINT.black), box(0.4, 3, 2, -2.3, 1.5, 0, TINT.light), box(0.4, 3, 2, 2.3, 1.5, 0, TINT.light), box(5, 0.4, 2, 0, 3.0, 0, TINT.light)];
  for (let i = 0; i < 7; i++) parts.push(box(0.16, 2.5, 1.4, -1.8 + i * 0.6, 1.6, 0, TINT.light, [0, 0.5, 0]));
  return bash(parts);
}
/** Radiator: base with seven fins. 3 × 1.6 × 2 */
export function radiator() {
  const parts = [box(3, 0.3, 2, 0, 0.15, 0, TINT.dark)];
  for (let i = 0; i < 7; i++) parts.push(box(0.12, 1.4, 1.8, -1.2 + i * 0.4, 1.0, 0, TINT.light));
  return bash(parts);
}
/** Conduit junction: box with two stub pipes. */
export function junction() {
  return bash([box(1.2, 0.9, 0.9, 0, 0.45, 0, TINT.mid), cylX(0.18, 0.9, -0.9, 0.55, 0, TINT.dark, 6), cylX(0.18, 0.9, 0.9, 0.55, 0, TINT.dark, 6)]);
}
/** Pipe segment along z, r 0.35, length 1 (scale z for the run; scale x/y for the bore). Light on top, dark underside. */
export function pipe() {
  const g = bash([{ geo: new THREE.CylinderGeometry(0.35, 0.35, 1, 8, 1, true), pos: [0, 0.55, 0], rot: [Math.PI / 2, 0, 0], color: TINT.light }], { gradient: false });
  const pos = g.attributes.position;
  const col = g.attributes.color;
  for (let i = 0; i < pos.count; i++) {
    const k = 0.45 + 0.55 * Math.min(1, Math.max(0, (pos.getY(i) - 0.2) / 0.6));
    col.setXYZ(i, col.getX(i) * k, col.getY(i) * k, col.getZ(i) * k);
  }
  return g;
}
/** Pipe bracket (saddle under a pipe run). */
export function bracket() {
  return bash([box(1.2, 0.5, 0.4, 0, 0.25, 0, TINT.dark), box(0.4, 0.6, 0.4, 0, 0.6, 0, TINT.dark)]);
}
/** Small dome (sensor / reactor cap). r 1 */
export function dome() {
  return bash([{ geo: new THREE.SphereGeometry(1, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2), pos: [0, 0.2, 0], color: TINT.light }, cylY(1.1, 0.25, 0, 0.12, 0, TINT.dark, 10)]);
}
/** Large sensor dome (L): r 6 on a two-step base. */
export function domeLarge() {
  return bash([{ geo: new THREE.SphereGeometry(6, 18, 9, 0, Math.PI * 2, 0, Math.PI / 2), pos: [0, 1.0, 0], color: TINT.light }, cylY(6.6, 0.6, 0, 0.3, 0, TINT.dark, 18), cylY(6.2, 0.5, 0, 0.8, 0, TINT.mid, 18)], { texel: 1 / 12 });
}
/** Antenna mast: base block, pole, two cross-bars, dipole tips. 6 m tall */
export function mast() {
  return bash([
    box(1.2, 0.6, 1.2, 0, 0.3, 0, TINT.dark),
    cylY(0.16, 6, 0, 3.5, 0, TINT.dark, 6, 0.1, true),
    box(2.4, 0.12, 0.12, 0, 4.2, 0, TINT.light),
    box(0.12, 0.12, 1.6, 0, 5.4, 0, TINT.light),
    cylY(0.12, 0.6, -1.2, 4.5, 0, TINT.light, 5, 0.12, true),
    cylY(0.12, 0.6, 1.2, 4.5, 0, TINT.light, 5, 0.12, true),
  ]);
}
/** Sensor cluster: pole with three small cone dishes and an equipment box. ~5 m */
export function sensorCluster() {
  const cone = (x, y, z, ry) => ({ geo: new THREE.ConeGeometry(0.7, 0.5, 8, 1, true), pos: [x, y, z], rot: [Math.PI / 2, 0, ry], color: TINT.light });
  return bash([
    box(1.6, 1.2, 1.6, 0, 0.6, 0, TINT.mid),
    cylY(0.22, 4, 0, 3.0, 0, TINT.dark, 6, 0.18, true),
    cone(0.9, 3.2, 0, 0),
    cone(-0.6, 4.0, 0.6, 2.2),
    cone(-0.4, 4.6, -0.7, -2.0),
    box(0.5, 0.5, 0.5, 0, 5.2, 0, TINT.light),
  ]);
}
/** Gantry crane (L): two posts, a beam, trolley. 14 m span, 6 m tall */
export function gantry() {
  return bash(
    [box(1.2, 6, 1.2, -6.4, 3, 0, TINT.mid), box(1.2, 6, 1.2, 6.4, 3, 0, TINT.mid), box(14, 1.0, 1.6, 0, 6.3, 0, TINT.light), box(2.4, 1.4, 2.0, -1.5, 5.6, 0, TINT.light), box(1.6, 0.6, 1.6, -6.4, 0.3, 0, TINT.dark), box(1.6, 0.6, 1.6, 6.4, 0.3, 0, TINT.dark)],
    { texel: 1 / 10 },
  );
}
/** Stepped "city block" for terrace slopes: two boxes. 3 × 2.4 × 3 */
export function cityBlock() {
  return bash([box(3, 1.4, 3, 0, 0.7, 0, TINT.light), box(1.8, 1.2, 2.0, 0.3, 2.0, -0.2, TINT.light)]);
}

// ---------------------------------------------------------------------------
// Trench fittings: the wall's outward normal becomes local +y (the shape stands proud of the wall);
// local +z runs along the ship's length, local x is "up the wall".
// ---------------------------------------------------------------------------
/** Service access doorway: lintel, sill, two jambs (dark), a porch hood. Door is 2.4 wide × 3.2 tall (x up). */
export function doorFrame() {
  return bash(
    [
      box(0.5, 0.6, 3.4, 1.9, 0.3, 0, TINT.mid), // lintel (top, +x is up the wall)
      box(0.5, 0.6, 3.4, -1.9, 0.3, 0, TINT.dark), // sill
      box(3.8, 0.6, 0.5, 0, 0.3, -1.45, TINT.mid), // jambs
      box(3.8, 0.6, 0.5, 0, 0.3, 1.45, TINT.mid),
      box(0.4, 1.4, 4.2, 2.3, 0.7, 0, TINT.dark), // porch hood
    ],
    { gradient: false },
  );
}
/** Docking-bay recess (L): frame 14 × 9, back plate, two blast-door leaves, side lamp housings. */
export function dockRecess() {
  return bash(
    [
      box(0.8, 0.5, 15, 4.9, 0.25, 0, TINT.dark),
      box(0.8, 0.5, 15, -4.9, 0.25, 0, TINT.dark),
      box(10.6, 0.5, 0.8, 0, 0.25, -7.1, TINT.dark),
      box(10.6, 0.5, 0.8, 0, 0.25, 7.1, TINT.dark),
      box(9.0, 0.12, 13.4, 0, 0.06, 0, TINT.black), // back plate (near-flush)
      box(8.2, 0.3, 6.1, 0, 0.15, -3.3, TINT.mid), // door leaves
      box(8.2, 0.3, 6.1, 0, 0.15, 3.3, TINT.mid),
      box(1.4, 1.2, 1.2, 4.2, 0.6, -7.8, TINT.dark), // lamp housings
      box(1.4, 1.2, 1.2, 4.2, 0.6, 7.8, TINT.dark),
      box(0.8, 2.2, 16.6, 5.9, 1.1, 0, TINT.dark), // top hood
    ],
    { texel: 1 / 12, gradient: false },
  );
}
/** Wall-mounted equipment cabinet with a grille. 1.6 (up) × 0.7 (proud) × 1.2 */
export function cabinet() {
  return bash([box(1.6, 0.7, 1.2, 0, 0.35, 0, TINT.mid), box(0.9, 0.1, 0.8, 0.1, 0.75, 0, TINT.black)], { gradient: false });
}

// ---------------------------------------------------------------------------
// Emissive fittings (extEmit* materials): the instance colour is ignored by the emissive term
// ---------------------------------------------------------------------------
/** Small warning light: 0.6 m cube on a stub. */
export function lightSmall() {
  return bash([box(0.6, 0.5, 0.6, 0, 0.45, 0, TINT.white)], { gradient: false });
}
/** Beacon: 1.4 m lamp. */
export function beacon() {
  return bash([box(1.4, 0.9, 1.4, 0, 0.6, 0, TINT.white)], { gradient: false });
}
/** Lit doorway slab: 2.4 wide × 3.2 tall (x up), proud 0.15. */
export function doorLight() {
  return bash([box(3.2, 0.15, 2.4, 0, 0.1, 0, TINT.white)], { gradient: false });
}
/** Dock light strip: 12 m long, along z. */
export function lightStrip() {
  return bash([box(0.4, 0.3, 12, 0, 0.2, 0, TINT.white)], { gradient: false });
}
/** Window slit strip for trench machinery blocks: 0.3 tall × 3 long (x up, z along). */
export function windowStrip() {
  return bash([box(0.3, 0.12, 3, 0, 0.08, 0, TINT.white)], { gradient: false });
}

export const SHAPES = {
  hatchSmall,
  hatchLarge,
  bayPlate,
  seamStrip,
  landingPad,
  plainBox,
  boxStack,
  tankH,
  tankV,
  tankLarge,
  vent,
  ventLarge,
  radiator,
  junction,
  pipe,
  bracket,
  dome,
  domeLarge,
  mast,
  sensorCluster,
  gantry,
  cityBlock,
  doorFrame,
  dockRecess,
  cabinet,
  lightSmall,
  beacon,
  doorLight,
  lightStrip,
  windowStrip,
};
