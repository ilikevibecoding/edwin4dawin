// Shared building blocks for battle ship models: materials (plating with the battle lighting patch,
// stripes, dark recesses, emissive glows), geometry helpers and the model assembler that turns a list of
// tagged geometries into instancing-ready parts per LOD with hull surface samples for impacts.
import * as THREE from "three";
import { makeHullPlating, makeMachinery } from "../../exterior/hullTextures.js";
import { battlePatch } from "../battleShader.js";
import { mergeParts, planarUV, sampleSurface, tintGeometry } from "../fleet.js";

let shared = null;
export function shipMaterials(sun) {
  if (shared) return shared;
  const plating = makeHullPlating(1024, 611);
  const machinery = makeMachinery(512, 617);
  const std = (set, extra) =>
    battlePatch(
      new THREE.MeshStandardMaterial({
        map: set.map,
        roughnessMap: set.roughnessMap,
        metalnessMap: set.metalnessMap,
        normalMap: set.normalMap,
        normalScale: new THREE.Vector2(0.8, 0.8),
        vertexColors: true,
        roughness: 1,
        metalness: 1,
        envMapIntensity: 0.15,
        ...extra,
      }),
      sun,
    );
  shared = {
    hull: std(plating, {}), // tint via vertex colours
    dark: std(machinery, {}),
    // flat painted panels (stripes, insignia) — plating normal only
    paint: battlePatch(
      new THREE.MeshStandardMaterial({
        normalMap: plating.normalMap,
        normalScale: new THREE.Vector2(0.4, 0.4),
        vertexColors: true,
        roughness: 0.75,
        metalness: 0.1,
        envMapIntensity: 0.1,
      }),
      sun,
    ),
    engineGlow: new THREE.MeshBasicMaterial({
      color: 0xffffff,
      vertexColors: true,
      fog: false,
    }),
    windows: new THREE.MeshBasicMaterial({
      color: 0xffffff,
      vertexColors: true,
      fog: false,
    }),
    plumeAdd: new THREE.MeshBasicMaterial({
      color: 0xffffff,
      vertexColors: true,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    }),
  };
  return shared;
}

// ---- geometry helpers (object space, ship forward is -Z, up +Y) ----
export function box(cx, cy, cz, sx, sy, sz) {
  const g = new THREE.BoxGeometry(sx, sy, sz);
  g.translate(cx, cy, cz);
  return g;
}
export function boxMM(min, max) {
  return box(
    (min[0] + max[0]) / 2,
    (min[1] + max[1]) / 2,
    (min[2] + max[2]) / 2,
    max[0] - min[0],
    max[1] - min[1],
    max[2] - min[2],
  );
}
export function cylZ(r0, r1, len, seg = 20, open = false) {
  const g = new THREE.CylinderGeometry(r0, r1, len, seg, 1, open);
  g.rotateX(Math.PI / 2);
  return g;
}
export function cylY(r0, r1, len, seg = 20) {
  return new THREE.CylinderGeometry(r0, r1, len, seg, 1, false);
}
// Extruded 2D profile (in the XZ plane, plan view) between y0 and y1: for wedge hulls.
export function prism(points, y0, y1) {
  const shape = new THREE.Shape();
  points.forEach(([x, z], i) =>
    i === 0 ? shape.moveTo(x, z) : shape.lineTo(x, z),
  );
  shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: y1 - y0,
    bevelEnabled: false,
  });
  // shape lies in XY with z as depth: rotate so shape-y -> world z and depth -> world y
  g.rotateX(-Math.PI / 2);
  g.translate(0, y0, 0);
  return g;
}
// Tapered slab: a box whose top/bottom follow linear height profiles along z (hull wedges with a sloped deck).
export function lofted(sections, nx = 2) {
  // sections: [{ z, halfW, yBottom, yTop }] sorted by z; builds a closed hull with flat side quads
  const pos = [];
  const push = (a, b, c) => pos.push(...a, ...b, ...c);
  const quad = (a, b, c, d) => {
    push(a, b, c);
    push(a, c, d);
  };
  for (let i = 0; i + 1 < sections.length; i++) {
    const A = sections[i];
    const B = sections[i + 1];
    // top (+y)
    for (let k = 0; k < nx; k++) {
      const t0 = -1 + (2 * k) / nx;
      const t1 = -1 + (2 * (k + 1)) / nx;
      quad(
        [t0 * A.halfW, A.yTop, A.z],
        [t1 * A.halfW, A.yTop, A.z],
        [t1 * B.halfW, B.yTop, B.z],
        [t0 * B.halfW, B.yTop, B.z],
      );
      quad(
        [t0 * A.halfW, A.yBottom, A.z],
        [t0 * B.halfW, B.yBottom, B.z],
        [t1 * B.halfW, B.yBottom, B.z],
        [t1 * A.halfW, A.yBottom, A.z],
      );
    }
    // sides
    quad(
      [A.halfW, A.yBottom, A.z],
      [A.halfW, A.yTop, A.z],
      [B.halfW, B.yTop, B.z],
      [B.halfW, B.yBottom, B.z],
    );
    quad(
      [-A.halfW, A.yBottom, A.z],
      [-B.halfW, B.yBottom, B.z],
      [-B.halfW, B.yTop, B.z],
      [-A.halfW, A.yTop, A.z],
    );
  }
  // caps
  const F = sections[0];
  const L = sections[sections.length - 1];
  quad(
    [-F.halfW, F.yBottom, F.z],
    [-F.halfW, F.yTop, F.z],
    [F.halfW, F.yTop, F.z],
    [F.halfW, F.yBottom, F.z],
  );
  quad(
    [-L.halfW, L.yBottom, L.z],
    [L.halfW, L.yBottom, L.z],
    [L.halfW, L.yTop, L.z],
    [-L.halfW, L.yTop, L.z],
  );
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

// Tag a geometry with material + tint + lod for the assembler.
export function part(
  geo,
  mat,
  { color = 0xffffff, texel = 1 / 16, lod = 0, uv = "planar", name = "" } = {},
) {
  let g = geo.index ? geo.toNonIndexed() : geo;
  if (!g.attributes.normal) g.computeVertexNormals();
  if (uv === "planar") g = planarUV(g, texel);
  tintGeometry(g, color);
  return { geo: g, mat, lod, name };
}

/**
 * Assemble a model: groups parts by (material, lod) into merged geometries, samples the hull surface
 * from the lod-0 hull parts, and returns the structure the Fleet expects.
 */
export function assemble(
  {
    id,
    side,
    length,
    parts,
    hardpoints = [],
    engines = [],
    bounds = null,
    surfaceFrom = null,
  },
  mats,
) {
  const groups = new Map();
  for (const p of parts) {
    const key = p.mat + "|" + p.lod;
    if (!groups.has(key)) groups.set(key, { mat: p.mat, lod: p.lod, geos: [] });
    groups.get(key).geos.push(p.geo);
  }
  const out = [];
  let hullGeo = null;
  for (const g of groups.values()) {
    const merged = mergeParts(g.geos);
    merged.computeBoundingSphere();
    out.push({
      geometry: merged,
      material: mats[g.mat],
      lod: g.lod,
      name: g.mat,
    });
    if (g.lod === 0 && g.mat === (surfaceFrom || "hull")) hullGeo = merged;
  }
  const radius = bounds ? bounds.radius : length * 0.55;
  const surface = hullGeo ? sampleSurface(hullGeo, 600, 7) : new Float32Array();
  // object-space box over every LOD-0 part: cameras and fighters use it to stay outside the hull
  const bb = new THREE.Box3();
  for (const p of out)
    if (p.lod === 0) bb.expandByObject(new THREE.Mesh(p.geometry));
  const half = [
    (bb.max.x - bb.min.x) / 2 || 1,
    (bb.max.y - bb.min.y) / 2 || 1,
    (bb.max.z - bb.min.z) / 2 || 1,
  ];
  const centre = [
    (bb.max.x + bb.min.x) / 2 || 0,
    (bb.max.y + bb.min.y) / 2 || 0,
    (bb.max.z + bb.min.z) / 2 || 0,
  ];
  return {
    id,
    side,
    length,
    parts: out,
    hardpoints,
    engines,
    bounds: { radius, half, centre },
    surface,
  };
}

export const COLORS = {
  republicHull: 0xb8b1a5, // warm light grey
  republicDark: 0x4a4a4e,
  maroon: 0x7a1e1e,
  redTrim: 0x9c2a22,
  separatistBlue: 0x6c7484,
  separatistTan: 0xa4957a,
  separatistGrey: 0x8e8f93,
  engineBlue: 0x9fd0ff,
  windowWarm: 0xffe2b0,
};
