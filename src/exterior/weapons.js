// Weapons & sensor emplacements (EXT-B): heavy twin-barrel turbolaser batteries, single-barrel ion
// cannon turrets, point-defence emplacements on the trench floors, tractor-beam projector domes around
// the hangar mouth and dish / lattice sensor arrays on the terrace roofs. Sites come from
// weapons_layout.js (which greebles.js also uses to keep the surface detail clear of them).
//
// Static parts (bases, point defence, tractors, arrays, base lights) are merged per material.
// The animated parts (turret housings, barrel groups, dish heads) are one InstancedMesh per kind whose
// matrices are rewritten every frame: a slow ±10° traverse plus barrel elevation, and a per-instance
// LOD that collapses the detailed instance to zero scale beyond 1500 m while a simple box takes over.
// Signature: buildWeapons({ group, materials }) -> { update(camera, dt, t), stats }
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { prism, insideOut, rng } from "../kit.js";
import { hullTopY, hullBottomY, trenchBand } from "../spec.js";
import { bash, TINT, triCount } from "./greebles_shapes.js";
import { heavyTurretSites, ionTurretSites, pointDefenceSites, tractorSites, sensorSites } from "./weapons_layout.js";

export const TURRET_LOD_DISTANCE = 1500;
const TRAVERSE = THREE.MathUtils.degToRad(10);

// surface slopes (dy/dz) so bases sit flush on the tilted plates
const TOP_SLOPE = (hullTopY(0) - hullTopY(-800)) / 800;
const BOTTOM_SLOPE = (hullBottomY(0) - hullBottomY(-800)) / 800;
const FLOOR_SLOPE = (trenchBand(0).yBottom - trenchBand(-800).yBottom) / 800;

const box = (w, h, d, x, y, z, color, rot) => ({ geo: new THREE.BoxGeometry(w, h, d), pos: [x, y, z], color, rot });
const cylY = (r, h, x, y, z, color, seg = 16, r2 = r) => ({ geo: new THREE.CylinderGeometry(r2, r, h, seg, 1, false), pos: [x, y, z], color });
/** Cylinder along -z (barrel): rTip at the muzzle end (-z), rBase at +z. Centre at (x, y, z). */
const barrel = (rTip, rBase, len, x, y, z, color, seg = 12) => ({ geo: new THREE.CylinderGeometry(rTip, rBase, len, seg, 1, false).rotateX(-Math.PI / 2), pos: [x, y, z], color });

// ---------------------------------------------------------------------------
// Geometry factories (metres; local origin on the mount point, barrels along -z)
// ---------------------------------------------------------------------------
function heavyBase() {
  const parts = [cylY(11.2, 1.2, 0, 0.6, 0, TINT.dark, 28), cylY(9.8, 1.1, 0, 1.75, 0, TINT.mid, 28), cylY(8.6, 0.8, 0, 2.7, 0, TINT.black, 28)];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    parts.push(box(2.2, 0.5, 1.6, Math.cos(a) * 10.1, 1.45, Math.sin(a) * 10.1, TINT.light, [0, -a, 0]));
  }
  return bash(parts, { texel: 1 / 10 });
}
function heavyHousing() {
  // side profile (z, y) extruded across x; sloped glacis toward the barrels (-z)
  const body = prism(
    [
      [6.8, 0],
      [-7.4, 0],
      [-6.0, 3.4],
      [-2.5, 5.0],
      [5.6, 5.0],
      [6.8, 3.6],
    ],
    15.0,
  ).rotateY(-Math.PI / 2);
  return bash(
    [
      { geo: body, color: TINT.light },
      box(15.6, 1.0, 3.0, 0, 2.6, 6.4, TINT.dark),
      box(3.0, 3.4, 4.6, -8.8, 2.6, -2.8, TINT.mid),
      box(3.0, 3.4, 4.6, 8.8, 2.6, -2.8, TINT.mid),
      box(2.2, 0.6, 2.2, -8.8, 4.6, -2.8, TINT.black),
      box(2.2, 0.6, 2.2, 8.8, 4.6, -2.8, TINT.black),
      box(3.4, 0.5, 3.4, -4.2, 5.2, 2.2, TINT.dark),
      box(3.4, 0.5, 3.4, 4.2, 5.2, 2.2, TINT.dark),
      box(2.0, 1.6, 2.6, 0, 5.8, 3.6, TINT.dark),
      { geo: new THREE.CylinderGeometry(0.45, 0.45, 3.2, 10, 1, false).rotateX(Math.PI / 2), pos: [0, 6.5, 3.4], color: TINT.black },
      box(1.2, 0.7, 6.0, 0, 5.3, -1.0, TINT.black),
      box(0.8, 1.2, 0.8, -6.5, 5.6, 4.8, TINT.black),
      box(0.8, 1.2, 0.8, 6.5, 5.6, 4.8, TINT.black),
    ],
    { texel: 1 / 10 },
  );
}
function heavyBarrels() {
  const parts = [box(9.8, 2.4, 2.6, 0, 0, 1.8, TINT.dark)];
  for (const x of [-3.2, 3.2]) {
    parts.push(barrel(0.72, 1.25, 22, x, 0, -9, TINT.light));
    parts.push(barrel(1.4, 1.4, 1.8, x, 0, -19.2, TINT.dark));
    parts.push(barrel(1.15, 1.15, 1.2, x, 0, -13.6, TINT.dark));
    parts.push(barrel(1.5, 1.5, 2.6, x, 0, -1.2, TINT.mid));
    parts.push(box(2.8, 2.8, 4.4, x, 0, 1.0, TINT.mid));
    parts.push(barrel(0.38, 0.38, 7.5, x, 1.7, -5.2, TINT.black, 8));
  }
  return bash(parts, { texel: 1 / 10 });
}
function heavyProxy() {
  return bash([box(16, 5.2, 14.4, 0, 2.6, 0, TINT.light), box(9, 2.8, 20, 0, 3.2, -7, TINT.mid)], { texel: 1 / 10 });
}

function ionBase() {
  return bash([cylY(7.6, 1.0, 0, 0.5, 0, TINT.dark, 24), cylY(6.5, 0.9, 0, 1.45, 0, TINT.mid, 24), cylY(5.7, 0.7, 0, 2.25, 0, TINT.black, 24), box(1.6, 0.5, 1.2, 0, 1.15, 7.0, TINT.light), box(1.6, 0.5, 1.2, 0, 1.15, -7.0, TINT.light)], { texel: 1 / 10 });
}
function ionHousing() {
  return bash(
    [
      cylY(5.4, 3.2, 0, 1.6, 0, TINT.light, 24),
      { geo: new THREE.SphereGeometry(5.0, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2), pos: [0, 3.2, 0], color: TINT.light },
      box(2.6, 2.8, 4.0, -5.6, 2.2, -1.5, TINT.mid),
      box(2.6, 2.8, 4.0, 5.6, 2.2, -1.5, TINT.mid),
      box(4.6, 1.4, 2.6, 0, 2.8, 5.6, TINT.dark),
      box(1.4, 1.2, 1.4, 0, 8.4, 0.5, TINT.dark),
      { geo: new THREE.CylinderGeometry(0.3, 0.3, 2.4, 8, 1, false).rotateX(Math.PI / 2), pos: [0, 9.0, 0.5], color: TINT.black },
      box(0.6, 0.6, 5.0, 0, 6.5, -2.0, TINT.black),
    ],
    { texel: 1 / 10 },
  );
}
function ionBarrel() {
  return bash([barrel(0.85, 1.4, 18, 0, 0, -7, TINT.light), barrel(1.75, 1.75, 2.0, 0, 0, -15.2, TINT.dark), barrel(2.1, 2.1, 0.8, 0, 0, -16.5, TINT.black), barrel(1.3, 1.3, 1.4, 0, 0, -10.5, TINT.dark), box(3.2, 3.2, 4.4, 0, 0, 0.8, TINT.mid), barrel(0.35, 0.35, 6, 0.9, 1.6, -4.5, TINT.black, 8), barrel(0.35, 0.35, 6, -0.9, 1.6, -4.5, TINT.black, 8)], { texel: 1 / 10 });
}
function ionProxy() {
  return bash([box(11, 6.5, 11, 0, 3.2, 0, TINT.light), box(3.2, 3.2, 18, 0, 2.8, -6.5, TINT.mid)], { texel: 1 / 10 });
}

/** Dish head (yaw-animated): yoke, double-sided spherical dish facing -z tilted up 35°, feed horn. size = radius */
function dishHead(size) {
  const tilt = -(Math.PI / 2 - THREE.MathUtils.degToRad(35));
  const cap = new THREE.SphereGeometry(size, 24, 8, 0, Math.PI * 2, 0, 0.62);
  cap.translate(0, -size * Math.cos(0.62), 0); // rim on the equator plane of the pivot
  // the cap's pole points away from the target so the concave side faces -z
  cap.rotateX(tilt + Math.PI);
  const back = cap.clone();
  const front = insideOut(cap.clone());
  const axis = new THREE.Vector3(0, Math.sin(THREE.MathUtils.degToRad(35)), -Math.cos(THREE.MathUtils.degToRad(35)));
  const focus = axis.clone().multiplyScalar(size * 0.55);
  const parts = [
    box(1.6, 2.6, 1.6, 0, 1.3, 0, TINT.dark),
    box(4.0, 0.8, 0.8, 0, 2.6, 0, TINT.mid),
    { geo: back, pos: [0, 2.6, 0], color: TINT.light },
    { geo: front, pos: [0, 2.6, 0], color: TINT.mid },
    // feed horn at the focus, apex toward the dish
    { geo: new THREE.ConeGeometry(0.45, 1.2, 8, 1, false).rotateX(tilt + Math.PI), pos: [focus.x, 2.6 + focus.y, focus.z], color: TINT.black },
  ];
  const rimR = size * Math.sin(0.62);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + Math.PI / 2;
    const rim = new THREE.Vector3(Math.cos(a) * rimR, Math.sin(a) * rimR, 0).applyAxisAngle(new THREE.Vector3(1, 0, 0), tilt + Math.PI / 2);
    const mid = rim.clone().add(focus).multiplyScalar(0.5);
    const len = rim.distanceTo(focus);
    const dir = focus.clone().sub(rim).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    const e = new THREE.Euler().setFromQuaternion(q);
    parts.push({ geo: new THREE.CylinderGeometry(0.08, 0.08, len, 5, 1, true), pos: [mid.x, 2.6 + mid.y, mid.z], rot: [e.x, e.y, e.z], color: TINT.black });
  }
  return bash(parts, { texel: 1 / 8 });
}
function dishPedestal() {
  return bash([cylY(2.6, 0.5, 0, 0.25, 0, TINT.dark, 16), cylY(1.5, 2.6, 0, 1.8, 0, TINT.mid, 12), cylY(1.9, 0.4, 0, 3.0, 0, TINT.black, 12)], { texel: 1 / 8 });
}
function dishProxy(size) {
  return bash([box(size * 2, size * 1.3, size * 1.4, 0, 3.0 + size * 0.4, -size * 0.3, TINT.light)], { texel: 1 / 8 });
}

/** Static lattice sensor array: four posts, beams, platform, antenna rods, tilted panel. size ≈ height */
function sensorArray(size, rand) {
  const s = size / 6;
  const parts = [box(7 * s, 0.5, 7 * s, 0, 0.25, 0, TINT.dark)];
  for (const [x, z] of [
    [-2.6, -2.6],
    [2.6, -2.6],
    [2.6, 2.6],
    [-2.6, 2.6],
  ])
    parts.push(box(0.5 * s, 6 * s, 0.5 * s, x * s, 3 * s, z * s, TINT.black));
  for (const y of [2.2, 4.4]) {
    parts.push(box(5.7 * s, 0.25 * s, 0.25 * s, 0, y * s, -2.6 * s, TINT.mid), box(5.7 * s, 0.25 * s, 0.25 * s, 0, y * s, 2.6 * s, TINT.mid));
    parts.push(box(0.25 * s, 0.25 * s, 5.7 * s, -2.6 * s, y * s, 0, TINT.mid), box(0.25 * s, 0.25 * s, 5.7 * s, 2.6 * s, y * s, 0, TINT.mid));
  }
  parts.push(box(6.4 * s, 0.4 * s, 6.4 * s, 0, 6.1 * s, 0, TINT.light));
  parts.push(box(5.2 * s, 0.3 * s, 3.2 * s, 0, 7.8 * s, 0.4 * s, TINT.light, [0.5, 0, 0]));
  parts.push(box(0.6 * s, 1.6 * s, 0.6 * s, 0, 7.0 * s, 1.2 * s, TINT.dark));
  for (let i = 0; i < 6; i++) {
    const x = (rand() - 0.5) * 5 * s;
    const z = (rand() - 0.5) * 5 * s;
    const h = (2 + rand() * 3) * s;
    parts.push({ geo: new THREE.CylinderGeometry(0.06, 0.1, h, 5, 1, true), pos: [x, 6.3 * s + h / 2, z], color: TINT.black });
  }
  return bash(parts, { texel: 1 / 8 });
}

/** Point-defence emplacement: base ring, rotating drum, housing with twin short barrels along -z. */
function pointDefence() {
  return bash(
    [
      cylY(2.1, 0.5, 0, 0.25, 0, TINT.dark, 14),
      cylY(1.45, 1.1, 0, 1.05, 0, TINT.mid, 14),
      box(2.4, 1.5, 2.8, 0, 2.3, 0.2, TINT.light),
      box(0.8, 0.8, 0.8, 0, 3.3, 0.6, TINT.black),
      barrel(0.22, 0.26, 3.8, -0.6, 2.35, -2.4, TINT.black, 8),
      barrel(0.22, 0.26, 3.8, 0.6, 2.35, -2.4, TINT.black, 8),
      barrel(0.34, 0.34, 0.5, -0.6, 2.35, -3.9, TINT.dark, 8),
      barrel(0.34, 0.34, 0.5, 0.6, 2.35, -3.9, TINT.dark, 8),
    ],
    { texel: 1 / 6 },
  );
}
/** Tractor-beam projector: pedestal, collar, dome, ring; built with +y away from the hull (flipped on placement). */
function tractorBody() {
  const parts = [cylY(7.6, 2.0, 0, 1.0, 0, TINT.dark, 28), cylY(6.4, 1.4, 0, 2.7, 0, TINT.mid, 28), { geo: new THREE.SphereGeometry(6, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), pos: [0, 3.4, 0], color: TINT.light }, { geo: new THREE.TorusGeometry(6.1, 0.5, 8, 40).rotateX(Math.PI / 2), pos: [0, 3.9, 0], color: TINT.black }];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    parts.push(box(1.2, 1.2, 1.2, Math.cos(a) * 4.6, 7.3, Math.sin(a) * 4.6, TINT.black, [0, -a, 0]));
  }
  return bash(parts, { texel: 1 / 10 });
}

// ---------------------------------------------------------------------------
// Frames
// ---------------------------------------------------------------------------
const _x = new THREE.Vector3();
const _z = new THREE.Vector3();
const _n = new THREE.Vector3();
const _rotY = new THREE.Matrix4();
const _rotX = new THREE.Matrix4();
const _tmp = new THREE.Matrix4();
const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
/** out = T(pos) · basis(local +y = n, local +z = ship length projected) · Ry(yaw) */
function frameUp(n, yaw, pos, out) {
  _n.copy(n).normalize();
  _z.set(0, 0, 1).addScaledVector(_n, -_n.z).normalize();
  _x.crossVectors(_n, _z);
  out.makeBasis(_x, _n, _z);
  if (yaw) out.multiply(_rotY.makeRotationY(yaw));
  out.setPosition(pos);
  return out;
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------
export function buildWeapons({ group, materials }) {
  const rand = rng(4242);
  const staticGeos = new Map(); // material key -> merged geometry list
  const addStatic = (mat, geo, matrix) => {
    const g = geo.clone().applyMatrix4(matrix);
    if (!staticGeos.has(mat)) staticGeos.set(mat, []);
    staticGeos.get(mat).push(g);
  };
  const lightGeo = new THREE.BoxGeometry(0.9, 0.7, 0.9).toNonIndexed();
  const upTop = new THREE.Vector3(0, 1, -TOP_SLOPE);
  const upFloor = new THREE.Vector3(0, 1, FLOOR_SLOPE);
  const downBottom = new THREE.Vector3(0, -1, -BOTTOM_SLOPE);
  const upRoof = new THREE.Vector3(0, 1, 0);
  const M = new THREE.Matrix4();
  const P = new THREE.Vector3();

  // ---- animated turrets: per-kind instanced sets
  const kinds = {
    heavy: { sites: heavyTurretSites(), base: heavyBase(), housing: heavyHousing(), barrels: heavyBarrels(), proxy: heavyProxy(), pivotY: 3.1, trunnion: new THREE.Vector3(0, 3.0, -3.0), pitchRest: 0.14, pitchAmp: 0.06, up: upTop, lights: 10.4 },
    ion: { sites: ionTurretSites(), base: ionBase(), housing: ionHousing(), barrels: ionBarrel(), proxy: ionProxy(), pivotY: 2.6, trunnion: new THREE.Vector3(0, 2.6, -1.5), pitchRest: 0.12, pitchAmp: 0.05, up: upTop, lights: 7.0 },
  };
  const turrets = [];
  const animated = []; // { housingIM, barrelsIM, proxyIM, list }
  for (const [kind, k] of Object.entries(kinds)) {
    const n = k.sites.length;
    const housingIM = new THREE.InstancedMesh(k.housing, materials.hullPlate1, n);
    const barrelsIM = new THREE.InstancedMesh(k.barrels, materials.hullGreeble, n);
    const proxyIM = new THREE.InstancedMesh(k.proxy, materials.hullPlate1, n);
    housingIM.name = `weapons_${kind}_housing`;
    barrelsIM.name = `weapons_${kind}_barrels`;
    proxyIM.name = `weapons_${kind}_proxy`;
    const list = [];
    k.sites.forEach((s, i) => {
      P.set(s.x, s.y, s.z);
      frameUp(k.up, 0, P, M);
      addStatic("hullPlate1", k.base, M);
      // running lights on the base ring (red outboard, white inboard)
      for (const sx of [-1, 1]) {
        _tmp.makeTranslation(sx * k.lights, 1.6, 0);
        addStatic(Math.sign(s.x) === sx ? "extEmitRed" : "extEmitWhite", lightGeo, new THREE.Matrix4().multiplyMatrices(M, _tmp));
      }
      const t = {
        kind,
        index: i,
        pos: P.clone(),
        yawRest: s.yaw,
        yawPhase: rand() * Math.PI * 2,
        yawRate: (Math.PI * 2) / (26 + rand() * 24),
        pitchPhase: rand() * Math.PI * 2,
        pitchRate: (Math.PI * 2) / (17 + rand() * 14),
        siteFrame: frameUp(k.up, 0, P, new THREE.Matrix4()),
        housing: new THREE.Matrix4(),
        near: true,
      };
      list.push(t);
      turrets.push(t);
    });
    animated.push({ kind, k, housingIM, barrelsIM, proxyIM, list });
  }

  // ---- dishes (yaw-animated heads on static pedestals) and static lattice arrays
  const sensors = sensorSites();
  const dishSites = sensors.filter((s) => s.kind === "dish");
  const dishes = [];
  const dishSets = [];
  {
    // one instanced set per dish size (two sizes in the layout)
    const bySize = new Map();
    for (const s of dishSites) {
      if (!bySize.has(s.size)) bySize.set(s.size, []);
      bySize.get(s.size).push(s);
    }
    const pedestal = dishPedestal();
    for (const [size, sites] of bySize) {
      const headIM = new THREE.InstancedMesh(dishHead(size), materials.hullPlate1, sites.length);
      const proxyIM = new THREE.InstancedMesh(dishProxy(size), materials.hullPlate1, sites.length);
      headIM.name = `weapons_dish${size}_head`;
      proxyIM.name = `weapons_dish${size}_proxy`;
      const list = [];
      sites.forEach((s, i) => {
        P.set(s.x, s.y, s.z);
        frameUp(upRoof, 0, P, M);
        addStatic("hullPlate1", pedestal, M);
        list.push({ index: i, pos: P.clone(), yawRest: s.yaw, yawPhase: rand() * Math.PI * 2, yawRate: (Math.PI * 2) / (34 + rand() * 20), siteFrame: M.clone(), near: true });
      });
      dishes.push(...list);
      dishSets.push({ headIM, proxyIM, list, pivotY: 3.2 });
    }
    for (const s of sensors.filter((x) => x.kind === "array")) {
      P.set(s.x, s.y, s.z);
      frameUp(upRoof, s.yaw, P, M);
      addStatic("hullGreeble", sensorArray(s.size, rand), M);
      _tmp.makeTranslation(0, s.size * 1.35, 0);
      addStatic("extEmitRed", lightGeo, new THREE.Matrix4().multiplyMatrices(M, _tmp));
    }
  }

  // ---- point defence on the trench floors (scaled to the local trench depth)
  const pdGeo = pointDefence();
  const pdSites = pointDefenceSites();
  for (const s of pdSites) {
    const depth = trenchBand(s.z).depth;
    const sc = THREE.MathUtils.clamp(depth / 7.5, 0.55, 1.0);
    P.set(s.x, s.y, s.z);
    frameUp(upFloor, s.yaw, P, M);
    M.scale(new THREE.Vector3(sc, sc, sc));
    addStatic("hullGreeble", pdGeo, M);
  }

  // ---- tractor-beam projectors under the ventral plate (frame flipped: local +y points down)
  const tractorGeo = tractorBody();
  const emitterGeo = new THREE.CylinderGeometry(2.2, 2.2, 0.5, 24, 1, false).toNonIndexed();
  const tractors = tractorSites();
  for (const s of tractors) {
    P.set(s.x, s.y, s.z);
    frameUp(downBottom, 0, P, M);
    addStatic("hullPlate1", tractorGeo, M);
    _tmp.makeTranslation(0, 9.5, 0);
    addStatic("extEmitBlue", emitterGeo, new THREE.Matrix4().multiplyMatrices(M, _tmp));
  }

  // ---- build static meshes
  const meshes = [];
  let triangles = 0;
  for (const [mat, geos] of staticGeos) {
    const merged = mergeGeometries(geos, false);
    if (!merged) continue;
    merged.computeBoundingSphere();
    const material = materials[mat];
    if (!material) throw new Error("weapons: unknown material " + mat);
    const mesh = new THREE.Mesh(merged, material);
    mesh.name = "weapons_static_" + mat;
    mesh.castShadow = !mat.startsWith("extEmit");
    mesh.receiveShadow = true;
    group.add(mesh);
    meshes.push(mesh);
    triangles += triCount(merged);
  }
  const instanced = [];
  for (const a of animated) {
    for (const im of [a.housingIM, a.barrelsIM, a.proxyIM]) {
      im.castShadow = true;
      im.receiveShadow = true;
      im.frustumCulled = false;
      group.add(im);
      instanced.push(im);
      triangles += triCount(im.geometry) * im.count;
    }
  }
  for (const d of dishSets) {
    for (const im of [d.headIM, d.proxyIM]) {
      im.castShadow = true;
      im.receiveShadow = true;
      im.frustumCulled = false;
      group.add(im);
      instanced.push(im);
      triangles += triCount(im.geometry) * im.count;
    }
  }

  // ---- per-frame animation + LOD
  const camPos = new THREE.Vector3();
  const lodSq = TURRET_LOD_DISTANCE * TURRET_LOD_DISTANCE;
  let clock = 0;
  const pivot = new THREE.Matrix4();
  const trunnion = new THREE.Matrix4();
  function update(camera, dt, t) {
    clock = typeof t === "number" ? t : clock + (dt || 0.016);
    const hasCam = !!camera;
    if (hasCam) camera.getWorldPosition(camPos);
    for (const a of animated) {
      const k = a.k;
      let nNear = 0;
      for (const tr of a.list) {
        const near = !hasCam || camPos.distanceToSquared(tr.pos) < lodSq;
        if (near) nNear++;
        if (!near) {
          a.housingIM.setMatrixAt(tr.index, ZERO);
          a.barrelsIM.setMatrixAt(tr.index, ZERO);
          a.proxyIM.setMatrixAt(tr.index, tr.siteFrame);
          continue;
        }
        const yaw = tr.yawRest + TRAVERSE * Math.sin(clock * tr.yawRate + tr.yawPhase);
        const pitch = k.pitchRest + k.pitchAmp * Math.sin(clock * tr.pitchRate + tr.pitchPhase);
        pivot.makeTranslation(0, k.pivotY, 0).multiply(_rotY.makeRotationY(yaw));
        tr.housing.multiplyMatrices(tr.siteFrame, pivot);
        a.housingIM.setMatrixAt(tr.index, tr.housing);
        trunnion.makeTranslation(k.trunnion.x, k.trunnion.y, k.trunnion.z).multiply(_rotX.makeRotationX(pitch));
        _tmp.multiplyMatrices(tr.housing, trunnion);
        a.barrelsIM.setMatrixAt(tr.index, _tmp);
        a.proxyIM.setMatrixAt(tr.index, ZERO);
      }
      a.housingIM.instanceMatrix.needsUpdate = true;
      a.barrelsIM.instanceMatrix.needsUpdate = true;
      a.proxyIM.instanceMatrix.needsUpdate = true;
      // skip the draw call entirely for a set with no active instance
      a.housingIM.visible = a.barrelsIM.visible = nNear > 0;
      a.proxyIM.visible = nNear < a.list.length;
    }
    for (const d of dishSets) {
      let nNear = 0;
      for (const dh of d.list) {
        const near = !hasCam || camPos.distanceToSquared(dh.pos) < lodSq;
        if (near) nNear++;
        if (!near) {
          d.headIM.setMatrixAt(dh.index, ZERO);
          d.proxyIM.setMatrixAt(dh.index, dh.siteFrame);
          continue;
        }
        const yaw = dh.yawRest + 2.5 * TRAVERSE * Math.sin(clock * dh.yawRate + dh.yawPhase);
        pivot.makeTranslation(0, d.pivotY, 0).multiply(_rotY.makeRotationY(yaw));
        _tmp.multiplyMatrices(dh.siteFrame, pivot);
        d.headIM.setMatrixAt(dh.index, _tmp);
        d.proxyIM.setMatrixAt(dh.index, ZERO);
      }
      d.headIM.instanceMatrix.needsUpdate = true;
      d.proxyIM.instanceMatrix.needsUpdate = true;
      d.headIM.visible = nNear > 0;
      d.proxyIM.visible = nNear < d.list.length;
    }
  }
  update(null, 0, 0);

  const stats = {
    turrets: turrets.length,
    heavy: kinds.heavy.sites.length,
    ion: kinds.ion.sites.length,
    pointDefence: pdSites.length,
    tractors: tractors.length,
    dishes: dishes.length,
    arrays: sensors.length - dishes.length,
    meshes: meshes.length + instanced.length,
    triangles: Math.round(triangles),
  };
  console.log(`[weapons] ${stats.turrets} turrets (${stats.heavy} heavy, ${stats.ion} ion), ${stats.pointDefence} PD, ${stats.tractors} tractors, ${stats.dishes} dishes, ${stats.arrays} arrays; ${stats.meshes} meshes, ${(triangles / 1000).toFixed(0)}k triangles`);
  return { update, stats, meshes: [...meshes, ...instanced], turrets };
}
