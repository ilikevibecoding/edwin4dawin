import * as THREE from 'three';

/**
 * The hull is lofted from a table of stations (cross sections) running from the
 * transom (t = 0) to the stem (t = 1). Everything else on the ship - gunports,
 * cannons, channels, deck furniture - is positioned by querying the same
 * functions, so fittings always land exactly on the planking.
 */

export const STERN_Z = -15.5;
export const BOW_Z = 16.5;
export const LENGTH = BOW_Z - STERN_Z;
export const MAX_HALF_BEAM = 4.6;
const RAIL_INSET = 0.32;

// [t, beam factor, keel Y, rail Y, deck Y]
const STATIONS = [
  [0.0, 0.62, -1.3, 5.6, 3.1],
  [0.06, 0.74, -2.3, 5.25, 2.95],
  [0.16, 0.88, -2.95, 4.7, 2.7],
  [0.3, 0.97, -3.2, 4.25, 2.5],
  [0.45, 1.0, -3.3, 4.0, 2.42],
  [0.58, 0.99, -3.25, 3.95, 2.42],
  [0.7, 0.93, -3.1, 4.1, 2.5],
  [0.8, 0.76, -2.9, 4.35, 2.65],
  [0.88, 0.54, -2.6, 4.7, 2.85],
  [0.94, 0.31, -2.2, 5.05, 3.05],
  [0.98, 0.14, -1.7, 5.35, 3.25],
  [1.0, 0.04, -1.2, 5.6, 3.4],
];

/** Catmull-Rom interpolation over the station table (non-uniform spacing). */
function curve(column) {
  const ts = STATIONS.map((s) => s[0]);
  const vs = STATIONS.map((s) => s[column]);
  return (t) => {
    const x = Math.min(Math.max(t, 0), 1);
    let i = 0;
    while (i < ts.length - 2 && x > ts[i + 1]) i++;
    const t1 = ts[i];
    const t2 = ts[i + 1];
    const p1 = vs[i];
    const p2 = vs[i + 1];
    const t0 = ts[Math.max(i - 1, 0)];
    const p0 = vs[Math.max(i - 1, 0)];
    const t3 = ts[Math.min(i + 2, ts.length - 1)];
    const p3 = vs[Math.min(i + 2, vs.length - 1)];
    const dt = t2 - t1;
    const u = (x - t1) / dt;
    const m1 = t2 - t0 > 0 ? ((p2 - p0) / (t2 - t0)) * dt : 0;
    const m2 = t3 - t1 > 0 ? ((p3 - p1) / (t3 - t1)) * dt : 0;
    const u2 = u * u;
    const u3 = u2 * u;
    return (
      (2 * u3 - 3 * u2 + 1) * p1 + (u3 - 2 * u2 + u) * m1 + (-2 * u3 + 3 * u2) * p2 + (u3 - u2) * m2
    );
  };
}

const beamCurve = curve(1);
const keelCurve = curve(2);
const railCurve = curve(3);
const deckCurve = curve(4);

export const zAt = (t) => STERN_Z + t * LENGTH;
export const tAtZ = (z) => Math.min(Math.max((z - STERN_Z) / LENGTH, 0), 1);
export const halfBeamAt = (t) => beamCurve(t) * MAX_HALF_BEAM;
export const keelYAt = (t) => keelCurve(t);
export const railYAt = (t) => railCurve(t);
export const deckYAt = (t) => deckCurve(t);

const smoothstep = (edge0, edge1, x) => {
  const k = Math.min(Math.max((x - edge0) / (edge1 - edge0), 0), 1);
  return k * k * (3 - 2 * k);
};

/** Section profile: 0 at the keel, widest just below the rail, slight tumblehome. */
export function sectionWidth(v) {
  const base = Math.sin(Math.pow(Math.min(Math.max(v, 0), 1), 0.55) * Math.PI * 0.5);
  return base * (1 - 0.09 * smoothstep(0.55, 1, v));
}

export const railHalfWidthAt = (t) => halfBeamAt(t) * sectionWidth(1);
export const deckHalfWidthAt = (t) => Math.max(railHalfWidthAt(t) - RAIL_INSET, 0.05);

/** A point on the outer planking. `t` runs aft-to-fore, `v` keel-to-rail. */
export function hullPoint(t, v, side = 1, target = new THREE.Vector3()) {
  const keel = keelYAt(t);
  const rail = railYAt(t);
  return target.set(halfBeamAt(t) * sectionWidth(v) * side, keel + (rail - keel) * v, zAt(t));
}

/** Outward-facing normal of the planking, from finite differences. */
export function hullNormal(t, v, side = 1, target = new THREE.Vector3()) {
  const e = 0.004;
  const a = hullPoint(Math.min(t + e, 1), v, side, new THREE.Vector3());
  const b = hullPoint(Math.max(t - e, 0), v, side, new THREE.Vector3());
  const c = hullPoint(t, Math.min(v + e, 1), side, new THREE.Vector3());
  const d = hullPoint(t, Math.max(v - e, 0), side, new THREE.Vector3());
  const dt = a.sub(b);
  const dv = c.sub(d);
  target.copy(dt).cross(dv).normalize();
  if (target.x * side < 0) target.negate();
  return target;
}

/** Section parameter whose planking sits at world height `y`. */
export function vAtHeight(t, y) {
  const keel = keelYAt(t);
  const rail = railYAt(t);
  return Math.min(Math.max((y - keel) / (rail - keel), 0), 1);
}

/** Texture V: pinned so the painted waterline stays flat while the sheer stripe follows the rail. */
function textureV(y, keel, rail) {
  return y >= 0 ? 0.37 + 0.63 * (y / rail) : 0.37 * (1 + y / -keel);
}

function buildPlanking() {
  const stations = 72;
  const sections = 16;
  const ringSize = sections * 2 + 1;

  const positions = [];
  const uvs = [];
  const indices = [];
  const point = new THREE.Vector3();

  for (let i = 0; i < stations; i++) {
    const t = i / (stations - 1);
    const keel = keelYAt(t);
    const rail = railYAt(t);
    for (let j = 0; j < ringSize; j++) {
      const side = j < sections ? -1 : 1;
      const v = j < sections ? 1 - j / sections : (j - sections) / sections;
      hullPoint(t, v, side, point);
      positions.push(point.x, point.y, point.z);
      uvs.push(t, textureV(point.y, keel, rail));
    }
  }

  for (let i = 0; i < stations - 1; i++) {
    for (let j = 0; j < ringSize - 1; j++) {
      const a = i * ringSize + j;
      const b = (i + 1) * ringSize + j;
      const c = b + 1;
      const d = a + 1;
      indices.push(a, d, c, a, c, b);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/** Flat cap closing the open section at the transom or the stem. */
function buildCap(t, flip) {
  const sections = 16;
  const positions = [];
  const uvs = [];
  const indices = [];
  const point = new THREE.Vector3();
  const keel = keelYAt(t);
  const rail = railYAt(t);

  positions.push(0, (keel + rail) * 0.5, zAt(t));
  uvs.push(0.5, 0.5);

  const ringSize = sections * 2 + 1;
  for (let j = 0; j < ringSize; j++) {
    const side = j < sections ? -1 : 1;
    const v = j < sections ? 1 - j / sections : (j - sections) / sections;
    hullPoint(t, v, side, point);
    positions.push(point.x, point.y, point.z);
    uvs.push(0.5 + point.x * 0.1, textureV(point.y, keel, rail));
  }
  for (let j = 1; j < ringSize; j++) {
    if (flip) indices.push(0, j, j + 1);
    else indices.push(0, j + 1, j);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  // The rim is planar, so a single flat normal avoids a starburst of shading.
  const normal = geometry.attributes.normal;
  for (let i = 0; i < normal.count; i++) normal.setXYZ(i, 0, 0, flip ? 1 : -1);
  return geometry;
}

/**
 * The flat, slightly raked stern board that carries the great cabin windows.
 * It follows the transom rim exactly, so it never pokes through the planking.
 */
const TRANSOM_V_START = 0.36;

/** Aft face of the transom board at world height `y` (for mounting fittings). */
export function transomZAt(y) {
  const v = vAtHeight(0, y);
  return zAt(0) - 0.24 - Math.max(v - TRANSOM_V_START, 0) * 0.55;
}

export function buildTransomBoard() {
  const levels = 12;
  const vStart = TRANSOM_V_START;
  const positions = [];
  const uvs = [];
  const indices = [];
  const point = new THREE.Vector3();

  const keel = keelYAt(0);
  const rail = railYAt(0);
  for (let i = 0; i <= levels; i++) {
    const v = vStart + (1 - vStart) * (i / levels);
    hullPoint(0, v, 1, point);
    const rake = -0.24 - (v - vStart) * 0.55; // leans aft as it rises
    positions.push(-point.x, point.y, point.z + rake, point.x, point.y, point.z + rake);
    // Match the planking's V so the painted bands line up with the hull sides.
    const tv = textureV(point.y, keel, rail);
    uvs.push(0, tv, 0.5, tv);
  }
  for (let i = 0; i < levels; i++) {
    const a = i * 2;
    indices.push(a, a + 2, a + 3, a, a + 3, a + 1);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/** Inner face of the bulwarks plus the deck they enclose. */
function buildInterior() {
  const stations = 60;
  const tStart = 0.03;
  const tEnd = 0.985;

  const wallPositions = [];
  const wallUvs = [];
  const wallIndices = [];
  const deckPositions = [];
  const deckUvs = [];
  const deckIndices = [];

  for (let i = 0; i < stations; i++) {
    const t = tStart + (tEnd - tStart) * (i / (stations - 1));
    const z = zAt(t);
    const hw = deckHalfWidthAt(t);
    const deckY = deckYAt(t);
    const railY = railYAt(t);

    for (const side of [-1, 1]) {
      wallPositions.push(side * hw, railY, z, side * hw, deckY - 0.15, z);
      wallUvs.push(t * 4, 1, t * 4, 0.55);
    }
    deckPositions.push(-hw, deckY, z, hw, deckY, z);
    deckUvs.push(z / 16, -hw / 7.8, z / 16, hw / 7.8);
  }

  for (let i = 0; i < stations - 1; i++) {
    for (let s = 0; s < 2; s++) {
      const a = (i * 2 + s) * 2;
      const b = ((i + 1) * 2 + s) * 2;
      wallIndices.push(a, a + 1, b + 1, a, b + 1, b);
    }
    const p = i * 2;
    deckIndices.push(p, p + 2, p + 3, p, p + 3, p + 1);
  }

  const wall = new THREE.BufferGeometry();
  wall.setAttribute('position', new THREE.Float32BufferAttribute(wallPositions, 3));
  wall.setAttribute('uv', new THREE.Float32BufferAttribute(wallUvs, 2));
  wall.setIndex(wallIndices);
  wall.computeVertexNormals();

  const deck = new THREE.BufferGeometry();
  deck.setAttribute('position', new THREE.Float32BufferAttribute(deckPositions, 3));
  deck.setAttribute('uv', new THREE.Float32BufferAttribute(deckUvs, 2));
  deck.setIndex(deckIndices);
  deck.computeVertexNormals();

  return { wall, deck };
}

/** Cap rail: the timber that closes the top of the bulwark, following the sheer. */
function buildCapRail() {
  const stations = 60;
  const tStart = 0.03;
  const tEnd = 0.99;
  const positions = [];
  const uvs = [];
  const indices = [];
  const outer = new THREE.Vector3();

  for (let i = 0; i < stations; i++) {
    const t = tStart + (tEnd - tStart) * (i / (stations - 1));
    hullPoint(t, 1, 1, outer);
    const inner = deckHalfWidthAt(t);
    const y = railYAt(t) + 0.06;
    for (const side of [-1, 1]) {
      positions.push(side * outer.x, y, outer.z, side * inner, y, outer.z);
      uvs.push(t * 8, 0, t * 8, 1);
    }
  }
  for (let i = 0; i < stations - 1; i++) {
    for (let s = 0; s < 2; s++) {
      const a = (i * 2 + s) * 2;
      const b = ((i + 1) * 2 + s) * 2;
      indices.push(a, b, b + 1, a, b + 1, a + 1);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/** Keel, stem and sternpost: the heavy timbers along the centreline. */
function buildBackbone(materials) {
  const group = new THREE.Group();

  const keelShape = [];
  for (let i = 0; i <= 40; i++) {
    const t = i / 40;
    keelShape.push(new THREE.Vector3(0, keelYAt(t) - 0.18, zAt(t)));
  }
  const keel = new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(keelShape), 60, 0.34, 6, false),
    materials.darkTimber,
  );
  group.add(keel);

  // Stem: the curved timber that carries the bow up out of the water.
  const stem = new THREE.Mesh(
    new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, keelYAt(0.93), zAt(0.93)),
        new THREE.Vector3(0, -0.4, BOW_Z + 0.45),
        new THREE.Vector3(0, 2.6, BOW_Z + 0.9),
        new THREE.Vector3(0, railYAt(1) - 0.2, BOW_Z + 0.35),
      ]),
      24,
      0.3,
      6,
      false,
    ),
    materials.darkTimber,
  );
  group.add(stem);

  const sternpost = new THREE.Mesh(new THREE.BoxGeometry(0.5, 3.6, 0.6), materials.darkTimber);
  sternpost.position.set(0, 0.4, STERN_Z + 0.35);
  sternpost.rotation.x = -0.22;
  group.add(sternpost);

  return group;
}

export function buildHullGroup(materials) {
  const group = new THREE.Group();
  group.name = 'hull';

  const planking = new THREE.Mesh(buildPlanking(), materials.hull);
  planking.castShadow = true;
  planking.receiveShadow = true;
  group.add(planking);

  const sternCap = new THREE.Mesh(buildCap(0, false), materials.hull);
  const bowCap = new THREE.Mesh(buildCap(1, true), materials.hull);
  sternCap.castShadow = true;
  bowCap.castShadow = true;
  group.add(sternCap, bowCap);

  const transom = new THREE.Mesh(buildTransomBoard(), materials.hull);
  transom.castShadow = true;
  transom.receiveShadow = true;
  group.add(transom);

  const interior = buildInterior();
  const innerWallMaterial = materials.hull.clone();
  innerWallMaterial.side = THREE.DoubleSide;
  innerWallMaterial.color = new THREE.Color('#a37b4c');
  const wall = new THREE.Mesh(interior.wall, innerWallMaterial);
  wall.receiveShadow = true;
  group.add(wall);

  const deckMaterial = materials.deck.clone();
  deckMaterial.side = THREE.DoubleSide;
  const deck = new THREE.Mesh(interior.deck, deckMaterial);
  deck.receiveShadow = true;
  deck.name = 'mainDeck';
  group.add(deck);

  const capRailMaterial = materials.darkTimber.clone();
  capRailMaterial.side = THREE.DoubleSide;
  const capRail = new THREE.Mesh(buildCapRail(), capRailMaterial);
  capRail.castShadow = true;
  capRail.receiveShadow = true;
  group.add(capRail);

  group.add(buildBackbone(materials));

  return group;
}
