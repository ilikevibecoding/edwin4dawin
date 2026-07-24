/**
 * ship.js — the freighter interior: shell, rooms, props, greebles, light rig.
 *
 * Everything static is accumulated into per-(room, material) buckets and merged
 * once, which keeps the whole ship at a few dozen draw calls.
 *
 * Layout (metres, +X right, +Y up, bow toward -Z):
 *   corridor   x[-1.1, 1.1]  z[-21.0, -1.0]  h 2.60
 *   cockpit    x[-3.0, 3.0]  z[-27.0, -21.2] h 2.35
 *   quarters   x[-5.6,-1.3]  z[-11.0, -6.0]  h 2.50
 *   galley     x[ 1.3, 5.0]  z[-15.5,-10.5]  h 2.50
 *   bathroom   x[-3.6,-1.3]  z[-18.2,-15.2]  h 2.40
 */
import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { M, PALETTE, buildMaterials, mulberry32, scaleUV, makeScreenTexture } from './materials.js';
import {
  boxGeo, cylGeo, tubeGeo, torusGeo, sphereGeo, planeGeo, xform, mergeAll,
  ribGeo, doorFrameGeo, conduitBundleGeo, pipeRunGeo, ventGeo, greebleClusterGeo,
  boltRowGeo, cableGeo, crateGeo, handrailGeo, lightHousingGeo, equipBoxGeo,
} from './greeble.js';

export const LAYER = { CORRIDOR: 1, COCKPIT: 2, QUARTERS: 3, GALLEY: 4, BATH: 5 };

export const ROOM = {
  corridor: { x0: -1.1, x1: 1.1, z0: -21.0, z1: -1.0, h: 2.6, layer: LAYER.CORRIDOR },
  cockpit: { x0: -3.0, x1: 3.0, z0: -27.0, z1: -21.2, h: 2.35, layer: LAYER.COCKPIT },
  quarters: { x0: -5.6, x1: -1.3, z0: -11.0, z1: -6.0, h: 2.5, layer: LAYER.QUARTERS },
  galley: { x0: 1.3, x1: 5.0, z0: -15.5, z1: -10.5, h: 2.5, layer: LAYER.GALLEY },
  bath: { x0: -3.6, x1: -1.3, z0: -18.2, z1: -15.2, h: 2.4, layer: LAYER.BATH },
};

const T = 0.2;          // wall thickness
const WALL_TOP = 3.0;   // walls always run to here; ceilings hide the rest
const FLOOR_BOT = -0.3;

/* ------------------------------------------------------------------ the kit */

class Kit {
  constructor() {
    this.buckets = new Map();
    this.colliders = [];
    this.meshes = [];
  }
  add(layer, mat, geo) {
    if (!geo) return;
    const key = layer + '|' + mat;
    let b = this.buckets.get(key);
    if (!b) { b = []; this.buckets.set(key, b); }
    b.push(geo);
  }
  at(layer, mat, geo, tf) { this.add(layer, mat, xform(geo, tf)); }
  box(layer, mat, w, h, d, pos, rot = [0, 0, 0], tile = 0.5) {
    this.add(layer, mat, xform(boxGeo(w, h, d, tile), { pos, rot }));
  }
  /** Axis-aligned collider from centre + size (XZ only matters). */
  collider(cx, cz, w, d) {
    this.colliders.push(new THREE.Box3(
      new THREE.Vector3(cx - w / 2, -1, cz - d / 2),
      new THREE.Vector3(cx + w / 2, 4, cz + d / 2),
    ));
  }
  colliderMinMax(x0, z0, x1, z1) {
    this.colliders.push(new THREE.Box3(
      new THREE.Vector3(Math.min(x0, x1), -1, Math.min(z0, z1)),
      new THREE.Vector3(Math.max(x0, x1), 4, Math.max(z0, z1)),
    ));
  }
  finish(scene) {
    for (const [key, geos] of this.buckets) {
      const [layerStr, matName] = key.split('|');
      const geo = mergeAll(geos);
      if (!geo) continue;
      geo.computeBoundingSphere();
      const mesh = new THREE.Mesh(geo, M[matName]);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.layers.set(Number(layerStr));
      mesh.name = `${matName}_${layerStr}`;
      scene.add(mesh);
      this.meshes.push(mesh);
    }
    return this.meshes;
  }
}

/* ------------------------------------------------------------ shell helpers */

/** Wall running along Z at a given X (inner face at `xInner`, growing outward by dir). */
function wallZ(kit, layers, xInner, dir, z0, z1, openings = [], mat = 'hull') {
  const segs = splitSpan(z0, z1, openings);
  const xc = xInner + (dir * T) / 2;
  for (const [a, b] of segs.solid) {
    for (const L of layers) kit.box(L, mat, T, WALL_TOP, b - a, [xc, WALL_TOP / 2, (a + b) / 2], [0, 0, 0], 1.0);
    kit.colliderMinMax(xInner, a, xInner + dir * T, b);
  }
  for (const o of segs.open) {
    // lintel above the opening
    const top = o.top ?? 2.05;
    for (const L of layers) kit.box(L, mat, T, WALL_TOP - top, o.end - o.start, [xc, (WALL_TOP + top) / 2, (o.start + o.end) / 2], [0, 0, 0], 1.0);
  }
}

/** Wall running along X at a given Z. */
function wallX(kit, layers, zInner, dir, x0, x1, openings = [], mat = 'hull') {
  const segs = splitSpan(x0, x1, openings);
  const zc = zInner + (dir * T) / 2;
  for (const [a, b] of segs.solid) {
    for (const L of layers) kit.box(L, mat, b - a, WALL_TOP, T, [(a + b) / 2, WALL_TOP / 2, zc], [0, 0, 0], 1.0);
    kit.colliderMinMax(a, zInner, b, zInner + dir * T);
  }
  for (const o of segs.open) {
    const top = o.top ?? 2.05;
    for (const L of layers) kit.box(L, mat, o.end - o.start, WALL_TOP - top, T, [(o.start + o.end) / 2, (WALL_TOP + top) / 2, zc], [0, 0, 0], 1.0);
  }
}

function splitSpan(a0, a1, openings) {
  const list = openings.slice().sort((p, q) => p.start - q.start);
  const solid = [];
  let cur = a0;
  for (const o of list) {
    if (o.start > cur) solid.push([cur, o.start]);
    cur = Math.max(cur, o.end);
  }
  if (cur < a1) solid.push([cur, a1]);
  return { solid, open: list };
}

function floorSlab(kit, layer, x0, z0, x1, z1, mat = 'floor') {
  kit.box(layer, mat, x1 - x0, -FLOOR_BOT, z1 - z0, [(x0 + x1) / 2, FLOOR_BOT / 2, (z0 + z1) / 2], [0, 0, 0], 1.0);
}

function ceilSlab(kit, layer, x0, z0, x1, z1, y, mat = 'ceiling') {
  kit.box(layer, mat, x1 - x0, 0.2, z1 - z0, [(x0 + x1) / 2, y + 0.1, (z0 + z1) / 2], [0, 0, 0], 1.0);
}

/* --------------------------------------------------------------- porthole -- */

/**
 * Round window in a Z-running wall. The wall must already have a square
 * opening; the annulus plates hide the square corners.
 */
function porthole(kit, layer, xInner, dir, z, y, rInner, rOuter) {
  const rot = [0, dir > 0 ? -Math.PI / 2 : Math.PI / 2, 0];
  const xIn = xInner + dir * 0.001;
  const xOut = xInner + dir * (T - 0.001);
  const ring = new THREE.RingGeometry(rInner, rOuter, 40, 1);
  kit.at(layer, 'metal', ring, { pos: [xIn, y, z], rot });
  kit.at(layer, 'structure', ring, { pos: [xOut, y, z], rot: [0, dir > 0 ? Math.PI / 2 : -Math.PI / 2, 0] });
  // rim + bolts + a chunky hood
  kit.at(layer, 'metal', torusGeo(rInner + 0.02, 0.035, 8, 28), { pos: [xIn + dir * 0.02, y, z], rot });
  kit.at(layer, 'structure', cylGeo(rOuter * 0.98, rOuter * 0.98, T * 0.9, 28, 0.4), {
    pos: [xInner + dir * T * 0.5, y, z], rot: [0, 0, Math.PI / 2],
  });
  const bolts = [];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    bolts.push(xform(cylGeo(0.018, 0.02, 0.03, 6, 0.1), {
      pos: [xIn + dir * 0.015, y + Math.sin(a) * (rOuter - 0.06), z + Math.cos(a) * (rOuter - 0.06)],
      rot: [0, 0, Math.PI / 2],
    }));
  }
  kit.add(layer, 'metal', mergeAll(bolts));
  // glass
  const glass = new THREE.Mesh(new THREE.CircleGeometry(rInner + 0.01, 32), M.glass);
  glass.position.set(xInner + dir * T * 0.5, y, z);
  glass.rotation.set(0, dir > 0 ? -Math.PI / 2 : Math.PI / 2, 0);
  glass.layers.set(layer);
  glass.renderOrder = 2;
  return glass;
}

/* ------------------------------------------------------------------- lights */

class LightRig {
  constructor(scene) {
    this.scene = scene;
    this.entries = [];
    this.emissives = [];
    this.preset = 'day';
    this.blend = 0;      // 0 = day, 1 = rest
    this.target = 0;
    this.speed = 1;
    this.fogDay = new THREE.Color(PALETTE.fogColor);
    this.fogRest = new THREE.Color(0x070d14);
    this.envDay = 0.55;
    this.envRest = 0.16;
  }
  addLight(light, dayI, restI, dayC, restC) {
    light.userData.dayI = dayI;
    light.userData.restI = restI;
    light.userData.dayC = new THREE.Color(dayC ?? light.color.getHex());
    light.userData.restC = new THREE.Color(restC ?? dayC ?? light.color.getHex());
    this.entries.push(light);
    return light;
  }
  addEmissive(mat, dayI, restI) {
    this.emissives.push({ mat, dayI, restI });
    return mat;
  }
  set(preset, seconds = 2) {
    this.preset = preset;
    this.target = preset === 'rest' ? 1 : 0;
    this.speed = 1 / Math.max(0.001, seconds);
  }
  update(dt) {
    if (this.blend !== this.target) {
      const d = Math.sign(this.target - this.blend) * this.speed * dt;
      this.blend = Math.abs(this.target - this.blend) <= Math.abs(d) ? this.target : this.blend + d;
      this.apply();
    }
  }
  apply() {
    const t = this.blend;
    for (const l of this.entries) {
      l.intensity = THREE.MathUtils.lerp(l.userData.dayI, l.userData.restI, t);
      l.color.copy(l.userData.dayC).lerp(l.userData.restC, t);
    }
    for (const e of this.emissives) {
      e.mat.emissiveIntensity = THREE.MathUtils.lerp(e.dayI, e.restI, t);
    }
    if (this.scene.fog) {
      this.scene.fog.color.copy(this.fogDay).lerp(this.fogRest, t);
      this.scene.fog.density = THREE.MathUtils.lerp(0.030, 0.045, t);
    }
    this.scene.environmentIntensity = THREE.MathUtils.lerp(this.envDay, this.envRest, t);
  }
}

/* -------------------------------------------------------------------- build */

export function buildShip({ scene, renderer }) {
  RectAreaLightUniformsLib.init();
  buildMaterials(renderer);

  const kit = new Kit();
  const rig = new LightRig(scene);
  const interactables = [];
  const dynamic = [];      // meshes added outside the kit (glass, interactables)

  buildCorridor(kit, rig, scene, dynamic);
  buildCockpit(kit, rig, scene, dynamic);
  buildQuarters(kit, rig, scene, dynamic, interactables);
  buildGalley(kit, rig, scene, dynamic, interactables);
  buildBathroom(kit, rig, scene, dynamic, interactables);
  buildAmbient(rig, scene);

  const meshes = kit.finish(scene);
  rig.apply();

  return { colliders: kit.colliders, interactables, rig, meshes: meshes.concat(dynamic) };
}

/* ------------------------------------------------------------------ ambient */

function buildAmbient(rig, scene) {
  const hemi = new THREE.HemisphereLight(0x24384a, 0x0d1013, 0.85);
  hemi.layers.enableAll();
  scene.add(hemi);
  rig.addLight(hemi, 0.85, 0.30, 0x24384a, 0x101c30);
}

/* ----------------------------------------------------------------- corridor */

function buildCorridor(kit, rig, scene, dynamic) {
  const R = ROOM.corridor;
  const L = LAYER.CORRIDOR;
  const rnd = mulberry32(4242);

  floorSlab(kit, L, R.x0 - T, R.z0, R.x1 + T, R.z1);
  ceilSlab(kit, L, R.x0 - T, R.z0, R.x1 + T, R.z1, R.h);

  // --- side walls with door openings + porthole squares
  const doorQ = { start: -9.05, end: -7.95, top: 2.05 };   // quarters
  const doorB = { start: -16.98, end: -16.02, top: 2.0 };  // bathroom
  const portA = { start: -4.95, end: -4.05, top: 2.0, bottom: 1.1 };  // +X porthole
  const portB = { start: -19.95, end: -19.05, top: 2.05, bottom: 1.15 };
  wallZ(kit, [L, LAYER.QUARTERS, LAYER.BATH], R.x0, -1, R.z0, R.z1,
    [doorQ, doorB, portB], 'hull');
  wallZ(kit, [L, LAYER.GALLEY], R.x1, +1, R.z0, R.z1,
    [{ start: -15.05, end: -13.95, top: 2.05 }, portA], 'hull');

  // fill under the portholes (openings run full height otherwise)
  kit.box(L, 'hull', T, portA.bottom, portA.end - portA.start, [R.x1 + T / 2, portA.bottom / 2, (portA.start + portA.end) / 2], [0, 0, 0], 1.0);
  kit.box(LAYER.GALLEY, 'hull', T, portA.bottom, portA.end - portA.start, [R.x1 + T / 2, portA.bottom / 2, (portA.start + portA.end) / 2], [0, 0, 0], 1.0);
  kit.box(L, 'hull', T, portB.bottom, portB.end - portB.start, [R.x0 - T / 2, portB.bottom / 2, (portB.start + portB.end) / 2], [0, 0, 0], 1.0);
  kit.colliderMinMax(R.x1, portA.start, R.x1 + T, portA.end);
  kit.colliderMinMax(R.x0 - T, portB.start, R.x0, portB.end);

  dynamic.push(porthole(kit, L, R.x1, +1, -4.5, 1.55, 0.42, 0.66));
  dynamic.push(porthole(kit, L, R.x0, -1, -19.5, 1.6, 0.36, 0.58));

  // --- aft bulkhead (dead end) at z1
  wallX(kit, [L], R.z1, +1, R.x0 - T, R.x1 + T, [], 'hullDark');
  buildBlastDoor(kit, L, 0, R.z1 - 0.02, rnd);

  // --- forward wall into the cockpit at z0 handled by cockpit builder

  // --- floor detail: grate strips over a dark recess + centre channel
  for (const sx of [-1, 1]) {
    const x = sx * 0.82;
    kit.box(L, 'structure', 0.5, 0.06, R.z1 - R.z0 - 0.2, [x, -0.03, (R.z0 + R.z1) / 2], [0, 0, 0], 0.4);
    const g = planeGeo(0.5, R.z1 - R.z0 - 0.2, 0.5);
    kit.at(L, 'grate', g, { pos: [x, 0.012, (R.z0 + R.z1) / 2], rot: [-Math.PI / 2, 0, 0] });
  }
  kit.box(L, 'structure', 0.42, 0.02, R.z1 - R.z0 - 0.2, [0, 0.011, (R.z0 + R.z1) / 2], [0, 0, 0], 0.5);
  // rubber kick strips
  for (const sx of [-1, 1]) {
    kit.box(L, 'rubber', 0.03, 0.12, R.z1 - R.z0, [sx * (R.x1 - 0.01), 0.06, (R.z0 + R.z1) / 2], [0, 0, 0], 0.3);
  }

  // --- ribs, wall furniture, ceiling lights every 2 m
  let panelIdx = 0;
  for (let z = R.z0 + 1.0; z < R.z1; z += 2.0) {
    kit.at(L, 'structure', ribGeo(2.62, R.h + 0.02, 0.1, 0.16), { pos: [0, 0, z] });
    kit.at(L, 'metal', boltRowGeo(2.3, 9, 0.014, 0.012), { pos: [0, R.h - 0.06, z + 0.09], rot: [Math.PI / 2, 0, 0] });
    panelIdx++;
  }

  // ceiling practical panels + point lights
  const warmMat = M.emissiveWarm;
  rig.addEmissive(warmMat, 3.4, 0.25);
  for (let i = 0; i < 5; i++) {
    const z = R.z0 + 2.2 + i * 4.0;
    if (z > R.z1 - 0.6) break;
    kit.at(L, 'structure', lightHousingGeo(0.44, 1.05, 0.09), { pos: [0, R.h - 0.045, z], rot: [Math.PI / 2, 0, 0] });
    kit.at(L, 'emissiveWarm', planeGeo(0.36, 0.95), { pos: [0, R.h - 0.075, z], rot: [Math.PI / 2, 0, 0] });
    const pl = new THREE.PointLight(PALETTE.warm, 9, 7.5, 2);
    pl.position.set(0, R.h - 0.16, z);
    pl.layers.set(L);
    scene.add(pl);
    rig.addLight(pl, 9, 0.9, PALETTE.warm, 0xff8a3c);
  }

  // teal floor guide strips
  rig.addEmissive(M.emissiveTeal, 4.2, 2.6);
  for (let z = R.z0 + 1.0; z < R.z1 - 0.5; z += 1.0) {
    kit.at(L, 'emissiveTeal', planeGeo(0.1, 0.03), { pos: [0.55, 0.014, z], rot: [-Math.PI / 2, 0, 0] });
    kit.at(L, 'emissiveTeal', planeGeo(0.1, 0.03), { pos: [-0.55, 0.014, z], rot: [-Math.PI / 2, 0, 0] });
  }
  // wall-washing teal strips at knee height
  for (const sx of [-1, 1]) {
    for (let z = R.z0 + 2; z < R.z1 - 1; z += 4.0) {
      kit.at(L, 'structure', lightHousingGeo(1.6, 0.07, 0.05), { pos: [sx * (R.x1 - 0.03), 0.42, z], rot: [0, sx * Math.PI / 2, 0] });
      kit.at(L, 'emissiveTeal', planeGeo(1.5, 0.04), { pos: [sx * (R.x1 - 0.05), 0.42, z], rot: [0, sx * Math.PI / 2, 0] });
      const pl = new THREE.PointLight(PALETTE.teal, 1.6, 3.0, 2);
      pl.position.set(sx * (R.x1 - 0.25), 0.5, z);
      pl.layers.set(L);
      scene.add(pl);
      rig.addLight(pl, 1.6, 1.1, PALETTE.teal, PALETTE.teal);
    }
  }

  // ceiling conduits + pipes along both top corners
  for (const sx of [-1, 1]) {
    kit.at(L, 'metal', conduitBundleGeo(R.z1 - R.z0 - 0.4, 4, 0.045, 0.14, 77 + sx), {
      pos: [sx * 0.86, R.h - 0.16, (R.z0 + R.z1) / 2],
    });
    kit.at(L, 'structure', conduitBundleGeo(R.z1 - R.z0 - 0.4, 2, 0.07, 0.1, 33 + sx), {
      pos: [sx * 0.62, R.h - 0.12, (R.z0 + R.z1) / 2],
    });
    // knee-height pipe run
    const pts = [];
    for (let z = R.z0 + 0.4; z <= R.z1 - 0.4; z += 2) pts.push([sx * (R.x1 - 0.12), 0.75 + (z % 4 === 0 ? 0.05 : 0), z]);
    if (pts.length > 2) kit.add(L, 'metal', pipeRunGeo(pts, 0.055, 2));
  }

  // wall panelling: equipment boxes, vents, screens, hazard paint, placards
  const props = [
    [-1, -2.6, 'equip'], [1, -3.4, 'vent'], [-1, -5.2, 'greeble'], [1, -6.6, 'equip'],
    [-1, -12.0, 'vent'], [1, -8.2, 'greeble'], [-1, -13.4, 'equip'], [1, -17.0, 'greeble'],
    [-1, -14.6, 'greeble'], [1, -18.4, 'equip'], [-1, -3.9, 'screen'], [1, -11.2, 'screen'],
    [-1, -20.2, 'vent'], [1, -20.4, 'greeble'], [1, -2.0, 'greeble'],
  ];
  for (const [sx, z, kind] of props) {
    const x = sx * (R.x1 - 0.02);
    const ry = sx > 0 ? -Math.PI / 2 : Math.PI / 2;
    if (kind === 'equip') {
      kit.at(L, 'structure', equipBoxGeo(0.7, 0.5, 0.13, z * 31), { pos: [x, 1.45, z], rot: [0, ry, 0] });
      kit.at(L, 'emissiveTeal', planeGeo(0.5, 0.02), { pos: [x - sx * 0.14, 1.62, z], rot: [0, ry, 0] });
    } else if (kind === 'vent') {
      kit.at(L, 'metal', ventGeo(0.55, 0.42, 6, 0.06), { pos: [x, 1.7, z], rot: [0, ry, 0] });
      kit.at(L, 'structure', boltRowGeo(0.6, 5, 0.014, 0.012), { pos: [x, 1.95, z], rot: [0, ry, 0] });
    } else if (kind === 'greeble') {
      kit.at(L, 'metal', greebleClusterGeo(Math.abs(z * 91) | 0, 0.8, 0.9, 0.8), { pos: [x, 1.3, z], rot: [0, ry, 0] });
    } else if (kind === 'screen') {
      kit.at(L, 'structure', boxGeo(0.52, 0.36, 0.06, 0.3), { pos: [x - sx * 0.02, 1.55, z], rot: [0, ry, 0] });
      const scr = new THREE.Mesh(planeGeo(0.42, 0.26), sx > 0 ? M.screenBars : M.screenList);
      scr.position.set(x - sx * 0.055, 1.55, z);
      scr.rotation.set(0, ry, 0);
      scr.layers.set(L);
      scene.add(scr);
      dynamic.push(scr);
    }
  }

  // door surrounds + hazard paint on the deck
  addDoorSurround(kit, L, R.x0, -1, -8.5, 1.1, 2.05);
  addDoorSurround(kit, L, R.x0, -1, -16.5, 0.96, 2.0);
  addDoorSurround(kit, L, R.x1, +1, -14.5, 1.1, 2.05);
  for (const z of [-8.5, -16.5]) hazardStrip(kit, L, -0.98, z, 0.32, 1.0, 'accent');
  hazardStrip(kit, L, 0.98, -14.5, 0.32, 1.0, 'accent');

  // hanging cables + handrails
  kit.add(L, 'rubber', cableGeo([-0.9, R.h - 0.2, -6.2], [-0.4, R.h - 0.2, -6.9], 0.22, 0.014));
  kit.add(L, 'rubber', cableGeo([0.9, R.h - 0.25, -11.4], [0.5, R.h - 0.25, -12.4], 0.3, 0.012));
  kit.add(L, 'rubber', cableGeo([-0.95, R.h - 0.3, -17.8], [-0.55, R.h - 0.3, -18.6], 0.26, 0.016));
  for (const sx of [-1, 1]) {
    for (const z of [-6.0, -11.0, -18.0]) {
      kit.at(L, 'metal', handrailGeo(1.6), { pos: [sx * (R.x1 - 0.1), 1.02, z], rot: [0, Math.PI / 2, 0] });
    }
  }

  // scattered floor crates near the aft end
  kit.at(L, 'accent', crateGeo(0.5, 0.42, 0.44, 5), { pos: [0.72, 0, -2.1], rot: [0, 0.3, 0] });
  kit.at(L, 'structure', crateGeo(0.4, 0.32, 0.36, 9), { pos: [0.76, 0.42, -2.05], rot: [0, -0.15, 0] });
  kit.collider(0.74, -2.08, 0.6, 0.6);
  kit.at(L, 'metal', crateGeo(0.46, 0.5, 0.4, 13), { pos: [-0.8, 0, -19.9], rot: [0, -0.25, 0] });
  kit.collider(-0.8, -19.9, 0.55, 0.5);
}

function addDoorSurround(kit, layer, xInner, dir, z, w, h) {
  const rot = [0, dir > 0 ? -Math.PI / 2 : Math.PI / 2, 0];
  kit.at(layer, 'structure', doorFrameGeo(w, h, T * 1.05, 0.14), { pos: [xInner + dir * T * 0.5, 0, z], rot });
  kit.at(layer, 'accent', boxGeo(0.1, 0.1, w * 0.92, 0.3), { pos: [xInner + dir * 0.06, h + 0.2, z] });
  // small status lamp
  kit.at(layer, 'emissiveTeal', planeGeo(0.12, 0.05), { pos: [xInner + dir * 0.055, h + 0.05, z + w / 2 + 0.06], rot });
}

function hazardStrip(kit, layer, x, z, w, d, mat) {
  kit.box(layer, mat, w, 0.012, d, [x, 0.008, z], [0, 0, 0], 0.5);
}

function buildBlastDoor(kit, layer, x, z, rnd) {
  const L = layer;
  kit.box(L, 'structure', 2.0, 2.3, 0.12, [x, 1.15, z - 0.06], [0, 0, 0], 0.6);
  kit.box(L, 'accent', 1.9, 0.16, 0.06, [x, 2.16, z - 0.13], [0, 0, 0], 0.4);
  kit.box(L, 'accent', 1.9, 0.16, 0.06, [x, 0.2, z - 0.13], [0, 0, 0], 0.4);
  for (const sx of [-1, 1]) {
    kit.at(L, 'metal', cylGeo(0.07, 0.07, 2.2, 10, 0.3), { pos: [x + sx * 0.82, 1.15, z - 0.16] });
    for (let i = 0; i < 4; i++) {
      kit.at(L, 'metal', boxGeo(0.2, 0.12, 0.16, 0.3), { pos: [x + sx * 0.82, 0.4 + i * 0.55, z - 0.2] });
    }
  }
  kit.at(L, 'metal', torusGeo(0.26, 0.045, 8, 24), { pos: [x, 1.2, z - 0.16], rot: [Math.PI / 2, 0, 0] });
  kit.at(L, 'metal', greebleClusterGeo(999, 1.4, 0.5, 0.7), { pos: [x, 1.75, z - 0.14] });
  kit.at(L, 'emissiveRed', planeGeo(0.1, 0.04), { pos: [x + 0.62, 1.95, z - 0.13] });
  kit.collider(x, z, 2.2, 0.4);
}

/* ------------------------------------------------------------------ cockpit */

function buildCockpit(kit, rig, scene, dynamic) {
  const R = ROOM.cockpit;
  const L = LAYER.COCKPIT;

  floorSlab(kit, L, R.x0 - T, R.z0, R.x1 + T, R.z1 + T);
  ceilSlab(kit, L, R.x0 - T, R.z0, R.x1 + T, R.z1 + T, R.h);

  // aft wall (shared with corridor) with the throat opening
  wallX(kit, [L, LAYER.CORRIDOR], R.z1, +1, R.x0 - T, R.x1 + T,
    [{ start: -0.6, end: 0.6, top: 2.05 }], 'hull');
  addDoorSurround2(kit, L, R.z1, +1, 0, 1.2, 2.05);

  // side walls
  wallZ(kit, [L], R.x0, -1, R.z0, R.z1 + T, [], 'hull');
  wallZ(kit, [L], R.x1, +1, R.z0, R.z1 + T, [], 'hull');

  // --- canted viewport across the bow
  const sill = 0.98, head = 2.05, cant = 0.16;   // radians
  const zFront = R.z0 + 0.1;
  // below-sill hull
  kit.box(L, 'hull', (R.x1 - R.x0) + T * 2, sill, T, [0, sill / 2, zFront - T / 2], [0, 0, 0], 1.0);
  kit.colliderMinMax(R.x0 - T, zFront - T, R.x1 + T, zFront + 0.35);
  // above-head hull (canted forward)
  kit.box(L, 'hull', (R.x1 - R.x0) + T * 2, WALL_TOP - head, T, [0, (WALL_TOP + head) / 2, zFront - 0.32], [0, 0, 0], 1.0);
  // sill console lip
  kit.box(L, 'structure', (R.x1 - R.x0) + 0.1, 0.16, 0.42, [0, sill - 0.05, zFront + 0.22], [0, 0, 0], 0.5);
  kit.at(L, 'metal', boltRowGeo(5.4, 18, 0.016, 0.014), { pos: [0, sill + 0.04, zFront + 0.42], rot: [Math.PI / 2, 0, 0] });

  // mullions + glass panes (3 panes)
  const paneW = (R.x1 - R.x0) / 3;
  const glassH = head - sill;
  for (let i = 0; i <= 3; i++) {
    const x = R.x0 + i * paneW;
    kit.at(L, 'structure', boxGeo(0.11, glassH + 0.5, 0.16, 0.4), { pos: [x, (sill + head) / 2, zFront - 0.13], rot: [cant, 0, 0] });
  }
  kit.at(L, 'structure', boxGeo((R.x1 - R.x0) + 0.2, 0.14, 0.3, 0.4), { pos: [0, head + 0.03, zFront - 0.28], rot: [cant, 0, 0] });
  for (let i = 0; i < 3; i++) {
    const x = R.x0 + (i + 0.5) * paneW;
    const pane = new THREE.Mesh(planeGeo(paneW - 0.14, glassH), M.glass);
    pane.position.set(x, (sill + head) / 2, zFront - 0.1);
    pane.rotation.x = cant;
    pane.layers.set(L);
    pane.renderOrder = 2;
    scene.add(pane);
    dynamic.push(pane);
  }
  // angled side panes
  for (const sx of [-1, 1]) {
    kit.at(L, 'structure', boxGeo(0.12, glassH + 0.4, 0.12, 0.4), { pos: [sx * (R.x1 - 0.02), (sill + head) / 2, zFront + 0.9] });
    const side = new THREE.Mesh(planeGeo(1.7, glassH * 0.92), M.glass);
    side.position.set(sx * (R.x1 - 0.01), (sill + head) / 2 - 0.02, zFront + 0.92);
    side.rotation.set(0, sx * Math.PI / 2, 0);
    side.layers.set(L);
    side.renderOrder = 2;
    scene.add(side);
    dynamic.push(side);
    // cut the hull: side wall segment stops short of the front, add filler above/below
    kit.box(L, 'hull', T, sill, 1.9, [sx * (R.x1 + T / 2), sill / 2, zFront + 0.9], [0, 0, 0], 1.0);
    kit.box(L, 'hull', T, WALL_TOP - head, 1.9, [sx * (R.x1 + T / 2), (WALL_TOP + head) / 2, zFront + 0.9], [0, 0, 0], 1.0);
  }

  // --- consoles
  buildConsoleBank(kit, scene, dynamic, L, -1.55, zFront + 0.75, 0.22);
  buildConsoleBank(kit, scene, dynamic, L, 1.55, zFront + 0.75, -0.22);
  // centre pedestal
  kit.box(L, 'structure', 1.0, 0.62, 0.7, [0, 0.31, zFront + 1.5], [0, 0, 0], 0.5);
  kit.at(L, 'metal', greebleClusterGeo(51, 0.85, 0.55, 1.4), { pos: [0, 0.63, zFront + 1.5], rot: [-Math.PI / 2, 0, 0] });
  kit.at(L, 'accent', boxGeo(0.1, 0.22, 0.1, 0.2), { pos: [-0.22, 0.72, zFront + 1.35], rot: [0.3, 0, 0] });
  kit.at(L, 'accent', boxGeo(0.1, 0.22, 0.1, 0.2), { pos: [-0.08, 0.72, zFront + 1.35], rot: [0.3, 0, 0] });
  kit.collider(0, zFront + 1.5, 1.1, 0.8);

  // --- seats
  for (const sx of [-1, 1]) buildSeat(kit, L, sx * 1.5, zFront + 1.95, sx);

  // --- overhead switch panel
  kit.box(L, 'structure', 3.4, 0.14, 0.9, [0, R.h - 0.1, zFront + 1.6], [0.22, 0, 0], 0.5);
  kit.at(L, 'metal', greebleClusterGeo(77, 3.1, 0.75, 1.3), { pos: [0, R.h - 0.19, zFront + 1.62], rot: [Math.PI / 2 + 0.22, 0, 0] });
  kit.at(L, 'emissiveTeal', planeGeo(0.9, 0.03), { pos: [0, R.h - 0.2, zFront + 1.2], rot: [Math.PI / 2 + 0.22, 0, 0] });

  // --- side equipment racks
  for (const sx of [-1, 1]) {
    kit.at(L, 'structure', equipBoxGeo(1.5, 1.2, 0.22, 300 + sx), { pos: [sx * (R.x1 - 0.02), 1.35, zFront + 3.3], rot: [0, sx > 0 ? -Math.PI / 2 : Math.PI / 2, 0] });
    kit.at(L, 'metal', conduitBundleGeo(3.0, 3, 0.05, 0.12, 400 + sx), { pos: [sx * (R.x1 - 0.14), R.h - 0.2, zFront + 3.2] });
    kit.at(L, 'metal', greebleClusterGeo(500 + sx, 1.2, 0.8, 0.9), { pos: [sx * (R.x1 - 0.02), 1.4, zFront + 5.0], rot: [0, sx > 0 ? -Math.PI / 2 : Math.PI / 2, 0] });
  }
  // floor cable channel
  kit.box(L, 'structure', 0.5, 0.04, 4.5, [0, 0.02, zFront + 3.2], [0, 0, 0], 0.5);
  kit.at(L, 'grate', planeGeo(0.46, 4.4, 0.5), { pos: [0, 0.045, zFront + 3.2], rot: [-Math.PI / 2, 0, 0] });

  // --- lighting: cool window light + warm console fill
  const rect = new THREE.RectAreaLight(PALETTE.cool, 5.5, 5.4, 1.0);
  rect.position.set(0, (sill + head) / 2, zFront + 0.05);
  rect.lookAt(0, 1.3, zFront + 4);
  rect.layers.set(L);
  scene.add(rect);
  rig.addLight(rect, 5.5, 3.0, PALETTE.cool, 0x6f9fd8);

  const key = new THREE.DirectionalLight(0xbfd9ff, 1.5);
  key.position.set(-4, 3.2, zFront - 6);
  key.target.position.set(0, 1.0, zFront + 2.5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 22;
  key.shadow.camera.left = -4; key.shadow.camera.right = 4;
  key.shadow.camera.top = 3; key.shadow.camera.bottom = -2;
  key.shadow.bias = -0.0008;
  key.shadow.normalBias = 0.03;
  key.layers.set(L);
  scene.add(key, key.target);
  rig.addLight(key, 1.5, 0.35, 0xbfd9ff, 0x8fb4e8);

  const warm1 = new THREE.PointLight(PALETTE.warm, 3.2, 4.2, 2);
  warm1.position.set(0, 1.5, zFront + 2.6);
  warm1.layers.set(L);
  scene.add(warm1);
  rig.addLight(warm1, 3.2, 0.5, PALETTE.warm, 0xff7a30);

  const glow = new THREE.PointLight(PALETTE.teal, 2.2, 3.4, 2);
  glow.position.set(0, 1.05, zFront + 1.1);
  glow.layers.set(L);
  scene.add(glow);
  rig.addLight(glow, 2.2, 1.4, PALETTE.teal, PALETTE.teal);

  // ceiling strip
  kit.at(L, 'structure', lightHousingGeo(0.5, 2.4, 0.08), { pos: [0, R.h - 0.04, zFront + 3.6], rot: [Math.PI / 2, 0, 0] });
  kit.at(L, 'emissiveWarm', planeGeo(0.4, 2.3), { pos: [0, R.h - 0.07, zFront + 3.6], rot: [Math.PI / 2, 0, 0] });
  const cl = new THREE.PointLight(PALETTE.warm, 5, 6, 2);
  cl.position.set(0, R.h - 0.2, zFront + 3.6);
  cl.layers.set(L);
  scene.add(cl);
  rig.addLight(cl, 5, 0.6, PALETTE.warm, 0xff8a3c);
}

function addDoorSurround2(kit, layer, zInner, dir, x, w, h) {
  kit.at(layer, 'structure', doorFrameGeo(w, h, T * 1.05, 0.14), { pos: [x, 0, zInner + dir * T * 0.5] });
  kit.at(layer, 'accent', boxGeo(w * 0.92, 0.1, 0.1, 0.3), { pos: [x, h + 0.2, zInner + dir * 0.06] });
}

function buildConsoleBank(kit, scene, dynamic, L, x, z, tilt) {
  kit.box(L, 'structure', 1.5, 0.72, 0.62, [x, 0.36, z], [0, 0, 0], 0.5);
  kit.box(L, 'structure', 1.5, 0.42, 0.5, [x, 0.9, z - 0.16], [-0.55, 0, 0], 0.5);
  kit.at(L, 'metal', greebleClusterGeo(Math.abs(x * 100) | 0, 1.35, 0.34, 1.5), { pos: [x, 0.95, z - 0.03], rot: [-0.55 - Math.PI / 2, 0, 0] });
  kit.at(L, 'accent', boxGeo(0.3, 0.06, 0.12, 0.2), { pos: [x + 0.5, 0.74, z + 0.2] });
  // throttle levers
  for (let i = 0; i < 2; i++) {
    kit.at(L, 'metal', cylGeo(0.02, 0.02, 0.26, 8, 0.2), { pos: [x - 0.5 + i * 0.14, 0.85, z + 0.18], rot: [0.5, 0, 0] });
    kit.at(L, 'rubber', sphereGeo(0.035, 8, 6), { pos: [x - 0.5 + i * 0.14, 0.96, z + 0.24] });
  }
  // screens
  const kinds = x < 0 ? ['nav', 'wave'] : ['bars', 'list'];
  for (let i = 0; i < 2; i++) {
    const scr = new THREE.Mesh(planeGeo(0.6, 0.3), i ? M[`screen${cap(kinds[1])}`] : M[`screen${cap(kinds[0])}`]);
    scr.position.set(x - 0.34 + i * 0.68, 0.93, z - 0.12);
    scr.rotation.x = -0.55;
    scr.layers.set(L);
    scene.add(scr);
    dynamic.push(scr);
  }
  kit.collider(x, z, 1.6, 0.8);
}

const cap = (s) => s[0].toUpperCase() + s.slice(1);

function buildSeat(kit, L, x, z, facing) {
  const yaw = Math.PI;
  kit.at(L, 'metal', cylGeo(0.18, 0.22, 0.12, 12, 0.3), { pos: [x, 0.06, z] });
  kit.at(L, 'metal', cylGeo(0.06, 0.06, 0.35, 10, 0.2), { pos: [x, 0.24, z] });
  kit.at(L, 'structure', boxGeo(0.62, 0.1, 0.6, 0.4), { pos: [x, 0.44, z], rot: [0, yaw, 0] });
  kit.at(L, 'fabric', boxGeo(0.58, 0.12, 0.56, 0.5), { pos: [x, 0.53, z], rot: [0, yaw, 0] });
  kit.at(L, 'structure', boxGeo(0.62, 0.72, 0.12, 0.4), { pos: [x, 0.92, z + 0.28], rot: [-0.12, yaw, 0] });
  kit.at(L, 'fabric', boxGeo(0.56, 0.66, 0.1, 0.5), { pos: [x, 0.93, z + 0.21], rot: [-0.12, yaw, 0] });
  kit.at(L, 'fabric', boxGeo(0.42, 0.2, 0.14, 0.4), { pos: [x, 1.34, z + 0.2], rot: [-0.12, yaw, 0] });
  for (const sx of [-1, 1]) {
    kit.at(L, 'structure', boxGeo(0.08, 0.08, 0.44, 0.3), { pos: [x + sx * 0.33, 0.72, z - 0.02] });
    kit.at(L, 'rubber', boxGeo(0.09, 0.05, 0.4, 0.3), { pos: [x + sx * 0.33, 0.78, z - 0.02] });
  }
  kit.at(L, 'accent', boxGeo(0.1, 0.32, 0.06, 0.2), { pos: [x, 0.7, z - 0.22], rot: [0.2, 0, 0] });
  kit.collider(x, z, 0.8, 0.8);
}

/* ----------------------------------------------------------------- quarters */

function buildQuarters(kit, rig, scene, dynamic, interactables) {
  const R = ROOM.quarters;
  const L = LAYER.QUARTERS;

  floorSlab(kit, L, R.x0 - T, R.z0 - T, R.x1, R.z1 + T);
  ceilSlab(kit, L, R.x0 - T, R.z0 - T, R.x1, R.z1 + T, R.h);
  wallZ(kit, [L], R.x0, -1, R.z0 - T, R.z1 + T, [], 'hull');
  wallX(kit, [L], R.z0, -1, R.x0 - T, R.x1, [], 'hull');
  wallX(kit, [L], R.z1, +1, R.x0 - T, R.x1, [], 'hull');

  // ceiling + wall trim
  for (let z = R.z0 + 0.8; z < R.z1; z += 1.6) {
    kit.at(L, 'structure', boxGeo(R.x1 - R.x0 + T, 0.08, 0.12, 0.5), { pos: [(R.x0 + R.x1) / 2, R.h - 0.04, z] });
  }
  kit.at(L, 'metal', conduitBundleGeo(4.6, 3, 0.04, 0.1, 88), { pos: [R.x0 + 0.4, R.h - 0.14, (R.z0 + R.z1) / 2] });
  kit.at(L, 'rubber', boxGeo(R.x1 - R.x0, 0.1, 0.03, 0.3), { pos: [(R.x0 + R.x1) / 2, 0.05, R.z0 + 0.02] });

  // --- bunk (interactable)
  const bx = R.x0 + 1.15, bz = (R.z0 + R.z1) / 2 + 0.2;
  const frame = [
    xform(boxGeo(2.0, 0.12, 1.0, 0.5), { pos: [0, 0.42, 0] }),
    xform(boxGeo(2.0, 0.5, 0.08, 0.4), { pos: [0, 0.2, -0.46] }),
    xform(boxGeo(0.1, 0.62, 1.0, 0.4), { pos: [-0.95, 0.31, 0] }),
    xform(boxGeo(0.1, 0.62, 1.0, 0.4), { pos: [0.95, 0.31, 0] }),
    xform(boxGeo(2.0, 0.28, 0.06, 0.4), { pos: [0, 0.8, -0.47] }),
  ];
  kit.at(L, 'structure', mergeAll(frame), { pos: [bx, 0, bz], rot: [0, Math.PI / 2, 0] });
  // drawers under the bunk
  for (let i = 0; i < 2; i++) {
    kit.at(L, 'metal', boxGeo(0.92, 0.3, 0.9, 0.4), { pos: [bx + 0.02, 0.18, bz - 0.52 + i * 1.0], rot: [0, Math.PI / 2, 0] });
    kit.at(L, 'metal', boxGeo(0.3, 0.04, 0.06, 0.2), { pos: [bx - 0.44, 0.2, bz - 0.52 + i * 1.0], rot: [0, Math.PI / 2, 0] });
  }

  const mattress = new THREE.Mesh(
    mergeAll([
      xform(boxGeo(1.94, 0.16, 0.94, 0.6), { pos: [0, 0.56, 0] }),
      xform(boxGeo(1.2, 0.1, 0.92, 0.6), { pos: [-0.35, 0.66, 0] }),   // blanket bulk
    ]),
    M.fabric,
  );
  mattress.position.set(bx, 0, bz);
  mattress.rotation.y = Math.PI / 2;
  mattress.castShadow = mattress.receiveShadow = true;
  mattress.layers.set(L);
  scene.add(mattress);

  const blanket = new THREE.Mesh(
    mergeAll([
      xform(boxGeo(1.16, 0.12, 0.96, 0.5), { pos: [-0.36, 0.67, 0] }),
      xform(boxGeo(0.1, 0.14, 0.96, 0.4), { pos: [0.22, 0.69, 0] }),
    ]),
    M.fabricWarm,
  );
  blanket.position.set(bx, 0, bz);
  blanket.rotation.y = Math.PI / 2;
  blanket.castShadow = blanket.receiveShadow = true;
  blanket.layers.set(L);
  scene.add(blanket);

  const pillow = new THREE.Mesh(
    mergeAll([xform(boxGeo(0.5, 0.14, 0.34, 0.3), { pos: [0.66, 0.68, 0.16] })]),
    M.fabric,
  );
  pillow.position.set(bx, 0, bz);
  pillow.rotation.y = Math.PI / 2;
  pillow.castShadow = pillow.receiveShadow = true;
  pillow.layers.set(L);
  scene.add(pillow);

  dynamic.push(mattress, blanket, pillow);
  kit.collider(bx, bz, 1.2, 2.1);
  interactables.push({
    id: 'bed', label: 'Sleep', meshes: [mattress, blanket, pillow],
    point: new THREE.Vector3(bx + 0.6, 0.9, bz), range: 2.4,
  });

  // --- locker
  const lx = R.x0 + 0.45, lz = R.z1 - 0.9;
  kit.at(L, 'hullDark', boxGeo(0.9, 1.9, 0.6, 0.6), { pos: [lx + 0.1, 0.95, lz] });
  kit.at(L, 'metal', ventGeo(0.6, 0.3, 5, 0.04), { pos: [lx + 0.1, 1.62, lz + 0.31] });
  kit.at(L, 'metal', boxGeo(0.05, 0.24, 0.05, 0.2), { pos: [lx + 0.42, 1.0, lz + 0.32] });
  kit.at(L, 'accent', boxGeo(0.34, 0.1, 0.02, 0.2), { pos: [lx + 0.1, 1.32, lz + 0.31] });
  kit.at(L, 'metal', greebleClusterGeo(31, 0.7, 0.4, 0.8), { pos: [lx + 0.1, 0.55, lz + 0.31] });
  kit.collider(lx + 0.1, lz, 1.0, 0.7);

  // --- desk + personal clutter
  const dx = R.x1 - 0.75, dz = R.z0 + 1.0;
  kit.at(L, 'metal', boxGeo(1.3, 0.06, 0.6, 0.5), { pos: [dx, 0.78, dz] });
  kit.at(L, 'structure', boxGeo(0.08, 0.78, 0.5, 0.4), { pos: [dx - 0.58, 0.39, dz] });
  kit.at(L, 'structure', boxGeo(0.08, 0.78, 0.5, 0.4), { pos: [dx + 0.58, 0.39, dz] });
  kit.at(L, 'metal', cylGeo(0.05, 0.05, 0.12, 10, 0.2), { pos: [dx + 0.3, 0.87, dz + 0.1] });
  kit.at(L, 'accent', cylGeo(0.045, 0.04, 0.1, 10, 0.2), { pos: [dx - 0.36, 0.86, dz - 0.05] });
  kit.at(L, 'metal', greebleClusterGeo(63, 0.5, 0.3, 1.1), { pos: [dx, 0.82, dz - 0.15], rot: [-Math.PI / 2, 0, 0] });
  kit.collider(dx, dz, 1.4, 0.7);
  const deskScreen = new THREE.Mesh(planeGeo(0.44, 0.26), M.screenWave);
  deskScreen.position.set(dx, 1.05, dz - 0.22);
  deskScreen.rotation.x = -0.18;
  deskScreen.layers.set(L);
  scene.add(deskScreen);
  dynamic.push(deskScreen);
  kit.at(L, 'structure', boxGeo(0.5, 0.32, 0.05, 0.3), { pos: [dx, 1.05, dz - 0.24], rot: [-0.18, 0, 0] });

  // pinned notes / photos on the wall
  const rnd = mulberry32(17);
  for (let i = 0; i < 7; i++) {
    const w = 0.1 + rnd() * 0.1, h = 0.08 + rnd() * 0.1;
    kit.at(L, i % 3 === 0 ? 'accent' : 'hull',
      boxGeo(w, h, 0.006, 0.2),
      { pos: [R.x0 + 1.6 + rnd() * 2.2, 1.5 + rnd() * 0.55, R.z0 + 0.02], rot: [0, 0, (rnd() - 0.5) * 0.3] });
  }

  // floor mat
  kit.at(L, 'rubber', boxGeo(1.4, 0.014, 0.9, 0.5), { pos: [R.x0 + 2.6, 0.008, R.z1 - 1.2], rot: [0, 0.1, 0] });

  // --- lighting
  rig.addEmissive(M.emissiveWarm, 3.4, 0.25);
  // bedside lamp
  kit.at(L, 'structure', boxGeo(0.16, 0.1, 0.22, 0.2), { pos: [R.x0 + 0.16, 1.35, bz - 0.6] });
  kit.at(L, 'emissiveWarm', planeGeo(0.12, 0.16), { pos: [R.x0 + 0.25, 1.35, bz - 0.6], rot: [0, Math.PI / 2, 0] });
  const lamp = new THREE.SpotLight(PALETTE.warm, 9, 5.5, 0.9, 0.6, 2);
  lamp.position.set(R.x0 + 0.4, 1.4, bz - 0.6);
  lamp.target.position.set(R.x0 + 2.2, 0.4, bz + 0.4);
  lamp.castShadow = true;
  lamp.shadow.mapSize.set(1024, 1024);
  lamp.shadow.camera.near = 0.2;
  lamp.shadow.camera.far = 8;
  lamp.shadow.bias = -0.0009;
  lamp.shadow.normalBias = 0.03;
  lamp.layers.set(L);
  scene.add(lamp, lamp.target);
  rig.addLight(lamp, 9, 1.6, PALETTE.warm, 0xff7038);

  // ceiling panel
  kit.at(L, 'structure', lightHousingGeo(0.9, 0.32, 0.07), { pos: [(R.x0 + R.x1) / 2 + 0.6, R.h - 0.04, R.z0 + 1.6], rot: [Math.PI / 2, 0, 0] });
  kit.at(L, 'emissiveWarm', planeGeo(0.8, 0.24), { pos: [(R.x0 + R.x1) / 2 + 0.6, R.h - 0.07, R.z0 + 1.6], rot: [Math.PI / 2, 0, 0] });
  const ceil = new THREE.PointLight(PALETTE.warm, 4.5, 6, 2);
  ceil.position.set((R.x0 + R.x1) / 2 + 0.6, R.h - 0.2, R.z0 + 1.6);
  ceil.layers.set(L);
  scene.add(ceil);
  rig.addLight(ceil, 4.5, 0.35, PALETTE.warm, 0xff8a3c);

  // teal underbunk strip
  kit.at(L, 'emissiveTeal', planeGeo(1.9, 0.03), { pos: [bx + 0.5, 0.1, bz], rot: [0, Math.PI / 2, 0] });
  const under = new THREE.PointLight(PALETTE.teal, 2.0, 3.2, 2);
  under.position.set(bx + 0.6, 0.2, bz);
  under.layers.set(L);
  scene.add(under);
  rig.addLight(under, 2.0, 2.4, PALETTE.teal, PALETTE.teal);

  // cool spill from the doorway
  const spill = new THREE.PointLight(PALETTE.cool, 1.4, 3.4, 2);
  spill.position.set(R.x1 - 0.3, 1.6, -8.5);
  spill.layers.set(L);
  scene.add(spill);
  rig.addLight(spill, 1.4, 0.6, PALETTE.cool, 0x5f86c8);
}

/* ------------------------------------------------------------------- galley */

function buildGalley(kit, rig, scene, dynamic, interactables) {
  const R = ROOM.galley;
  const L = LAYER.GALLEY;

  floorSlab(kit, L, R.x0, R.z0 - T, R.x1 + T, R.z1 + T);
  ceilSlab(kit, L, R.x0, R.z0 - T, R.x1 + T, R.z1 + T, R.h);
  wallZ(kit, [L], R.x1, +1, R.z0 - T, R.z1 + T, [], 'hull');
  wallX(kit, [L], R.z0, -1, R.x0, R.x1 + T, [], 'hull');
  wallX(kit, [L], R.z1, +1, R.x0, R.x1 + T, [], 'hull');

  // --- counter along the far wall
  const cx = R.x1 - 0.35;
  kit.at(L, 'hullDark', boxGeo(0.7, 0.88, 3.4, 0.6), { pos: [cx, 0.44, (R.z0 + R.z1) / 2] });
  kit.at(L, 'metal', boxGeo(0.76, 0.06, 3.5, 0.5), { pos: [cx, 0.91, (R.z0 + R.z1) / 2] });
  kit.at(L, 'metal', boxGeo(0.02, 0.5, 3.5, 0.5), { pos: [R.x1 - 0.01, 1.16, (R.z0 + R.z1) / 2] });
  kit.collider(cx, (R.z0 + R.z1) / 2, 0.8, 3.5);
  // cabinet doors + handles
  for (let i = 0; i < 4; i++) {
    const z = R.z0 + 0.75 + i * 0.85;
    kit.at(L, 'accent', boxGeo(0.03, 0.66, 0.78, 0.4), { pos: [cx - 0.36, 0.5, z] });
    kit.at(L, 'metal', boxGeo(0.04, 0.04, 0.3, 0.2), { pos: [cx - 0.39, 0.72, z] });
  }
  // overhead cabinets
  kit.at(L, 'hullDark', boxGeo(0.55, 0.7, 2.6, 0.6), { pos: [cx + 0.08, 1.95, (R.z0 + R.z1) / 2] });
  kit.at(L, 'metal', boxGeo(0.03, 0.04, 2.5, 0.4), { pos: [cx - 0.2, 1.65, (R.z0 + R.z1) / 2] });
  kit.at(L, 'metal', ventGeo(0.5, 0.3, 5, 0.05), { pos: [cx + 0.08, 1.95, R.z0 + 0.05], rot: [0, 0, 0] });

  // --- hotplate + pots + mugs
  kit.at(L, 'structure', boxGeo(0.6, 0.06, 0.6, 0.4), { pos: [cx, 0.96, R.z0 + 1.1] });
  kit.at(L, 'emissiveOrange', planeGeo(0.42, 0.42), { pos: [cx, 0.995, R.z0 + 1.1], rot: [-Math.PI / 2, 0, 0] });
  rig.addEmissive(M.emissiveOrange, 3.0, 1.6);
  kit.at(L, 'metal', cylGeo(0.16, 0.14, 0.2, 14, 0.3), { pos: [cx - 0.02, 1.1, R.z0 + 1.1] });
  kit.at(L, 'metal', torusGeo(0.16, 0.012, 6, 18), { pos: [cx - 0.02, 1.2, R.z0 + 1.1], rot: [Math.PI / 2, 0, 0] });
  for (let i = 0; i < 4; i++) {
    kit.at(L, i % 2 ? 'accent' : 'metal', cylGeo(0.045, 0.04, 0.09, 10, 0.2), { pos: [cx - 0.2 + (i % 2) * 0.12, 0.985, R.z1 - 0.7 - i * 0.16] });
  }
  const hot = new THREE.PointLight(PALETTE.accent, 2.2, 2.2, 2);
  hot.position.set(cx, 1.05, R.z0 + 1.1);
  hot.layers.set(L);
  scene.add(hot);
  rig.addLight(hot, 2.2, 1.4, PALETTE.accent, PALETTE.accent);

  // --- food dispenser (interactable)
  const dz = R.z1 - 1.0;
  kit.at(L, 'hullDark', boxGeo(0.62, 1.5, 0.9, 0.6), { pos: [R.x0 + 0.35, 0.75, dz] });
  kit.at(L, 'metal', greebleClusterGeo(123, 0.7, 0.5, 1.2), { pos: [R.x0 + 0.66, 1.5, dz], rot: [0, Math.PI / 2, 0] });
  kit.at(L, 'structure', boxGeo(0.3, 0.44, 0.6, 0.4), { pos: [R.x0 + 0.5, 1.0, dz] });
  const disp = new THREE.Mesh(
    mergeAll([
      xform(boxGeo(0.1, 0.42, 0.56, 0.4), { pos: [R.x0 + 0.68, 1.0, dz] }),
      xform(boxGeo(0.12, 0.1, 0.2, 0.2), { pos: [R.x0 + 0.7, 0.72, dz] }),
    ]),
    M.metal,
  );
  disp.castShadow = disp.receiveShadow = true;
  disp.layers.set(L);
  scene.add(disp);
  dynamic.push(disp);
  const dispScreen = new THREE.Mesh(planeGeo(0.34, 0.2), M.screenBars);
  dispScreen.position.set(R.x0 + 0.67, 1.42, dz);
  dispScreen.rotation.y = Math.PI / 2;
  dispScreen.layers.set(L);
  scene.add(dispScreen);
  dynamic.push(dispScreen);
  kit.at(L, 'emissiveOrange', planeGeo(0.5, 0.03), { pos: [R.x0 + 0.665, 0.6, dz], rot: [0, Math.PI / 2, 0] });
  kit.collider(R.x0 + 0.4, dz, 0.9, 1.0);
  interactables.push({
    id: 'galley', label: 'Eat', meshes: [disp],
    point: new THREE.Vector3(R.x0 + 0.7, 1.1, dz), range: 2.4,
  });

  // --- shelf with cans
  kit.at(L, 'metal', boxGeo(0.3, 0.04, 1.6, 0.4), { pos: [R.x0 + 0.2, 1.7, R.z0 + 1.4] });
  const rnd = mulberry32(55);
  for (let i = 0; i < 8; i++) {
    const r = 0.035 + rnd() * 0.02;
    kit.at(L, i % 3 ? 'metal' : 'accent', cylGeo(r, r, 0.1 + rnd() * 0.06, 10, 0.2),
      { pos: [R.x0 + 0.14 + rnd() * 0.12, 1.78, R.z0 + 0.75 + i * 0.18] });
  }

  // --- pipes + extractor
  kit.add(L, 'metal', pipeRunGeo([[R.x0 + 0.1, 2.3, R.z0 + 0.2], [R.x0 + 0.1, 2.3, R.z1 - 0.3], [R.x1 - 0.2, 2.3, R.z1 - 0.3]], 0.06, 2));
  kit.at(L, 'structure', boxGeo(0.8, 0.3, 1.2, 0.5), { pos: [cx, R.h - 0.25, R.z0 + 1.1] });
  kit.at(L, 'metal', cylGeo(0.14, 0.14, 0.4, 12, 0.3), { pos: [cx, R.h - 0.05, R.z0 + 1.1] });
  kit.at(L, 'metal', greebleClusterGeo(91, 1.0, 0.6, 0.9), { pos: [R.x0 + 0.02, 1.2, R.z0 + 0.9], rot: [0, Math.PI / 2, 0] });

  // fold-down table + stool
  kit.at(L, 'metal', boxGeo(0.8, 0.05, 0.9, 0.5), { pos: [R.x0 + 1.2, 0.82, R.z0 + 1.0] });
  kit.at(L, 'structure', cylGeo(0.04, 0.05, 0.8, 8, 0.2), { pos: [R.x0 + 1.2, 0.4, R.z0 + 1.0] });
  kit.at(L, 'fabricWarm', cylGeo(0.19, 0.19, 0.09, 14, 0.3), { pos: [R.x0 + 1.35, 0.52, R.z0 + 1.9] });
  kit.at(L, 'metal', cylGeo(0.05, 0.06, 0.48, 8, 0.2), { pos: [R.x0 + 1.35, 0.24, R.z0 + 1.9] });
  kit.collider(R.x0 + 1.2, R.z0 + 1.0, 0.9, 1.0);

  // floor + trim
  kit.at(L, 'rubber', boxGeo(1.2, 0.014, 2.0, 0.5), { pos: [R.x0 + 1.5, 0.008, (R.z0 + R.z1) / 2] });
  for (let z = R.z0 + 0.6; z < R.z1; z += 1.5) {
    kit.at(L, 'structure', boxGeo(R.x1 - R.x0 + T, 0.08, 0.1, 0.5), { pos: [(R.x0 + R.x1) / 2, R.h - 0.04, z] });
  }

  // --- lighting
  kit.at(L, 'structure', lightHousingGeo(0.34, 2.6, 0.07), { pos: [R.x1 - 0.75, R.h - 0.04, (R.z0 + R.z1) / 2], rot: [Math.PI / 2, 0, 0] });
  kit.at(L, 'emissiveWarm', planeGeo(0.26, 2.5), { pos: [R.x1 - 0.75, R.h - 0.07, (R.z0 + R.z1) / 2], rot: [Math.PI / 2, 0, 0] });
  const key = new THREE.SpotLight(PALETTE.warm, 16, 7, 1.0, 0.7, 2);
  key.position.set(R.x1 - 0.9, R.h - 0.2, (R.z0 + R.z1) / 2);
  key.target.position.set(R.x1 - 0.4, 0.9, (R.z0 + R.z1) / 2);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.near = 0.2;
  key.shadow.camera.far = 9;
  key.shadow.bias = -0.0009;
  key.shadow.normalBias = 0.03;
  key.layers.set(L);
  scene.add(key, key.target);
  rig.addLight(key, 16, 2.0, PALETTE.warm, 0xff7a38);

  // under-cabinet teal strip
  kit.at(L, 'emissiveTeal', planeGeo(0.03, 2.4), { pos: [cx - 0.18, 1.58, (R.z0 + R.z1) / 2], rot: [Math.PI / 2, 0, 0] });
  const strip = new THREE.PointLight(PALETTE.teal, 2.4, 3.2, 2);
  strip.position.set(cx - 0.25, 1.5, (R.z0 + R.z1) / 2);
  strip.layers.set(L);
  scene.add(strip);
  rig.addLight(strip, 2.4, 1.6, PALETTE.teal, PALETTE.teal);

  const spill = new THREE.PointLight(PALETTE.cool, 1.2, 3.2, 2);
  spill.position.set(R.x0 + 0.3, 1.6, -14.5);
  spill.layers.set(L);
  scene.add(spill);
  rig.addLight(spill, 1.2, 0.5, PALETTE.cool, 0x5f86c8);
}

/* ----------------------------------------------------------------- bathroom */

function buildBathroom(kit, rig, scene, dynamic, interactables) {
  const R = ROOM.bath;
  const L = LAYER.BATH;

  floorSlab(kit, L, R.x0 - T, R.z0 - T, R.x1, R.z1 + T);
  ceilSlab(kit, L, R.x0 - T, R.z0 - T, R.x1, R.z1 + T, R.h);
  wallZ(kit, [L], R.x0, -1, R.z0 - T, R.z1 + T, [], 'hullDark');
  wallX(kit, [L], R.z0, -1, R.x0 - T, R.x1, [], 'hullDark');
  wallX(kit, [L], R.z1, +1, R.x0 - T, R.x1, [], 'hullDark');

  const cx = (R.x0 + R.x1) / 2;

  // --- sink + mirror (interactable)
  const sx = R.x0 + 0.55, sz = R.z0 + 0.55;
  kit.at(L, 'hullDark', boxGeo(0.9, 0.75, 0.55, 0.5), { pos: [sx, 0.38, sz] });
  const basin = new THREE.Mesh(
    mergeAll([
      xform(cylGeo(0.24, 0.19, 0.14, 18, 0.3), { pos: [sx, 0.8, sz] }),
      xform(torusGeo(0.24, 0.018, 6, 20), { pos: [sx, 0.87, sz], rot: [Math.PI / 2, 0, 0] }),
      xform(cylGeo(0.02, 0.02, 0.22, 8, 0.2), { pos: [sx, 0.98, sz - 0.22] }),
      xform(cylGeo(0.018, 0.018, 0.16, 8, 0.2), { pos: [sx, 1.07, sz - 0.15], rot: [Math.PI / 2.2, 0, 0] }),
    ]),
    M.metal,
  );
  basin.castShadow = basin.receiveShadow = true;
  basin.layers.set(L);
  scene.add(basin);
  dynamic.push(basin);
  kit.collider(sx, sz, 1.0, 0.6);
  interactables.push({
    id: 'bathroom', label: 'Wash', meshes: [basin],
    point: new THREE.Vector3(sx, 0.95, sz), range: 2.2,
  });

  // mirror: low-roughness metal reflects the PMREM env
  const mirror = new THREE.Mesh(planeGeo(0.62, 0.7), new THREE.MeshStandardMaterial({
    color: 0xdfeaf0, roughness: 0.06, metalness: 1.0, envMapIntensity: 1.6,
  }));
  mirror.position.set(sx, 1.5, R.z0 + 0.02);
  mirror.layers.set(L);
  scene.add(mirror);
  dynamic.push(mirror);
  kit.at(L, 'metal', boxGeo(0.72, 0.8, 0.05, 0.3), { pos: [sx, 1.5, R.z0 - 0.01] });
  kit.at(L, 'metal', boltRowGeo(0.7, 4, 0.012, 0.01), { pos: [sx, 1.92, R.z0 + 0.03], rot: [Math.PI / 2, 0, 0] });

  // vanity strip
  kit.at(L, 'structure', lightHousingGeo(0.7, 0.06, 0.05), { pos: [sx, 1.98, R.z0 + 0.06] });
  kit.at(L, 'emissiveCool', planeGeo(0.64, 0.04), { pos: [sx, 1.98, R.z0 + 0.085] });
  rig.addEmissive(M.emissiveCool, 2.6, 1.2);
  const vanity = new THREE.SpotLight(0xdff0ff, 8, 4.2, 1.1, 0.8, 2);
  vanity.position.set(sx, 1.95, R.z0 + 0.25);
  vanity.target.position.set(sx, 0.8, R.z0 + 0.6);
  vanity.layers.set(L);
  scene.add(vanity, vanity.target);
  rig.addLight(vanity, 8, 1.2, 0xdff0ff, 0x6fa8c8);

  // --- shower nook
  kit.at(L, 'structure', boxGeo(0.06, 2.2, 0.06, 0.3), { pos: [R.x1 - 0.9, 1.1, R.z1 - 1.0] });
  kit.at(L, 'metal', cylGeo(0.02, 0.02, 1.0, 8, 0.2), { pos: [R.x1 - 0.45, 2.05, R.z1 - 1.0], rot: [0, 0, Math.PI / 2] });
  kit.at(L, 'metal', cylGeo(0.09, 0.06, 0.1, 12, 0.2), { pos: [R.x1 - 0.5, 2.0, R.z1 - 0.6] });
  kit.at(L, 'rubber', boxGeo(0.02, 1.7, 0.9, 0.5), { pos: [R.x1 - 0.9, 1.05, R.z1 - 0.55] });
  kit.at(L, 'structure', boxGeo(0.85, 0.05, 0.9, 0.4), { pos: [R.x1 - 0.45, 0.025, R.z1 - 0.55] });
  kit.at(L, 'grate', planeGeo(0.8, 0.85, 0.4), { pos: [R.x1 - 0.45, 0.055, R.z1 - 0.55], rot: [-Math.PI / 2, 0, 0] });

  // --- pipes everywhere
  kit.add(L, 'metal', pipeRunGeo([[R.x0 + 0.12, 0.2, R.z0 + 0.2], [R.x0 + 0.12, 2.1, R.z0 + 0.2], [R.x0 + 0.12, 2.1, R.z1 - 0.2]], 0.045, 2));
  kit.add(L, 'metal', pipeRunGeo([[R.x1 - 0.12, 0.35, R.z0 + 0.25], [R.x1 - 0.12, 1.9, R.z0 + 0.25]], 0.035, 3));
  kit.at(L, 'metal', conduitBundleGeo(2.6, 3, 0.03, 0.08, 71), { pos: [cx, R.h - 0.12, (R.z0 + R.z1) / 2] });
  kit.at(L, 'metal', greebleClusterGeo(43, 0.6, 0.5, 1.0), { pos: [R.x0 + 0.02, 1.7, R.z1 - 0.5], rot: [0, Math.PI / 2, 0] });
  kit.at(L, 'accent', boxGeo(0.02, 0.3, 0.12, 0.2), { pos: [R.x0 + 0.01, 1.2, R.z1 - 0.35] });

  // floor drain + wet grime strip
  kit.at(L, 'metal', torusGeo(0.08, 0.014, 6, 16), { pos: [cx + 0.3, 0.012, (R.z0 + R.z1) / 2], rot: [Math.PI / 2, 0, 0] });
  kit.at(L, 'rubber', boxGeo(0.5, 0.012, 0.7, 0.4), { pos: [cx - 0.4, 0.008, R.z0 + 1.0] });

  // ceiling light
  kit.at(L, 'structure', lightHousingGeo(0.32, 0.32, 0.06), { pos: [cx, R.h - 0.03, (R.z0 + R.z1) / 2], rot: [Math.PI / 2, 0, 0] });
  kit.at(L, 'emissiveCool', planeGeo(0.24, 0.24), { pos: [cx, R.h - 0.06, (R.z0 + R.z1) / 2], rot: [Math.PI / 2, 0, 0] });
  const ceil = new THREE.PointLight(0xcfe6ff, 3.0, 4.0, 2);
  ceil.position.set(cx, R.h - 0.2, (R.z0 + R.z1) / 2);
  ceil.layers.set(L);
  scene.add(ceil);
  rig.addLight(ceil, 3.0, 0.4, 0xcfe6ff, 0x5f86c8);

  const warm = new THREE.PointLight(PALETTE.warm, 1.2, 2.6, 2);
  warm.position.set(R.x1 - 0.4, 1.2, R.z1 - 0.9);
  warm.layers.set(L);
  scene.add(warm);
  rig.addLight(warm, 1.2, 0.3, PALETTE.warm, 0xff8a3c);
}
