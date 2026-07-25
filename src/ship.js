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
import { Reflector } from 'three/addons/objects/Reflector.js';
import { M, PALETTE, buildMaterials, mulberry32, scaleUV, makeScreenTexture, decalUV, mirrorShader } from './materials.js';
import {
  boxGeo, cylGeo, tubeGeo, torusGeo, sphereGeo, planeGeo, xform, mergeAll,
  ribGeo, doorFrameGeo, conduitBundleGeo, pipeRunGeo, ventGeo, greebleClusterGeo,
  boltRowGeo, cableGeo, crateGeo, handrailGeo, lightHousingGeo, equipBoxGeo,
  roundedBoxGeo, drapeGeo, softClothGeo, hangClothGeo,
} from './greeble.js';

export const LAYER = { CORRIDOR: 1, COCKPIT: 2, QUARTERS: 3, GALLEY: 4, BATH: 5 };

export const ROOM = {
  corridor: { x0: -1.1, x1: 1.1, z0: -21.0, z1: -1.0, h: 2.6, layer: LAYER.CORRIDOR },
  cockpit: { x0: -3.0, x1: 3.0, z0: -27.0, z1: -21.2, h: 2.35, layer: LAYER.COCKPIT },
  quarters: { x0: -5.6, x1: -1.3, z0: -11.0, z1: -6.0, h: 2.5, layer: LAYER.QUARTERS },
  galley: { x0: 1.3, x1: 5.0, z0: -15.5, z1: -10.5, h: 2.5, layer: LAYER.GALLEY },
  bath: { x0: -3.6, x1: -1.3, z0: -18.2, z1: -15.2, h: 2.4, layer: LAYER.BATH },
};

const T = 0.2;            // wall thickness
const WALL_TOP = 3.0;     // walls always run to here; ceilings hide the rest
const FLOOR_BOT = -0.3;
const WALL_TILE = 2.6;    // metres per texture repeat on walls
const FLOOR_TILE = 2.2;
const CEIL_TILE = 2.0;

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
    for (const L of layers) kit.box(L, mat, T, WALL_TOP, b - a, [xc, WALL_TOP / 2, (a + b) / 2], [0, 0, 0], WALL_TILE);
    kit.colliderMinMax(xInner, a, xInner + dir * T, b);
  }
  for (const o of segs.open) {
    // lintel above the opening
    const top = o.top ?? 2.05;
    for (const L of layers) kit.box(L, mat, T, WALL_TOP - top, o.end - o.start, [xc, (WALL_TOP + top) / 2, (o.start + o.end) / 2], [0, 0, 0], WALL_TILE);
  }
}

/** Wall running along X at a given Z. */
function wallX(kit, layers, zInner, dir, x0, x1, openings = [], mat = 'hull') {
  const segs = splitSpan(x0, x1, openings);
  const zc = zInner + (dir * T) / 2;
  for (const [a, b] of segs.solid) {
    for (const L of layers) kit.box(L, mat, b - a, WALL_TOP, T, [(a + b) / 2, WALL_TOP / 2, zc], [0, 0, 0], WALL_TILE);
    kit.colliderMinMax(a, zInner, b, zInner + dir * T);
  }
  for (const o of segs.open) {
    const top = o.top ?? 2.05;
    for (const L of layers) kit.box(L, mat, o.end - o.start, WALL_TOP - top, T, [(o.start + o.end) / 2, (WALL_TOP + top) / 2, zc], [0, 0, 0], WALL_TILE);
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
  kit.box(layer, mat, x1 - x0, -FLOOR_BOT, z1 - z0, [(x0 + x1) / 2, FLOOR_BOT / 2, (z0 + z1) / 2], [0, 0, 0], FLOOR_TILE);
}

function ceilSlab(kit, layer, x0, z0, x1, z1, y, mat = 'ceiling') {
  kit.box(layer, mat, x1 - x0, 0.2, z1 - z0, [(x0 + x1) / 2, y + 0.1, (z0 + z1) / 2], [0, 0, 0], CEIL_TILE);
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
  kit.at(layer, 'structure', cylGeo(rInner + 0.03, rInner + 0.03, T * 1.1, 28, 0.4, true), {
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
    this.envDay = 0.42;
    this.envRest = 0.24;
  }
  /**
   * @param cull  null = always on, otherwise {ref:[x,z], range:m}. three.js only
   *              tests light layers against the *camera*, so per-room light
   *              isolation has to be done by hand: anything far from the player
   *              is switched off, which also keeps the shader light count low.
   */
  addLight(light, dayI, restI, dayC, restC, cull = null) {
    light.userData.dayI = dayI;
    light.userData.restI = restI;
    light.userData.dayC = new THREE.Color(dayC ?? light.color.getHex());
    light.userData.restC = new THREE.Color(restC ?? dayC ?? light.color.getHex());
    light.userData.cull = cull;
    this.entries.push(light);
    return light;
  }

  /**
   * Switch off lights the player is nowhere near, then hard-cap how many can be
   * live at once (keeps the shader light loop short and the look deliberate).
   */
  cull(camPos, cap = 13) {
    const live = [];
    for (const l of this.entries) {
      const c = l.userData.cull;
      if (!c) continue;
      const dx = camPos.x - c.ref[0];
      const dz = camPos.z - c.ref[1];
      const d2 = dx * dx + dz * dz;
      const on = d2 < c.range * c.range;
      if (l.visible !== on) l.visible = on;
      if (on) live.push([d2, l]);
    }
    if (live.length > cap) {
      live.sort((a, b) => a[0] - b[0]);
      for (let i = cap; i < live.length; i++) live[i][1].visible = false;
    }
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
      this.scene.fog.density = THREE.MathUtils.lerp(0.030, 0.038, t);
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
  const mirrors = [];      // baked with a one-off CubeCamera in main.js

  buildCorridor(kit, rig, scene, dynamic);
  buildCockpit(kit, rig, scene, dynamic);
  buildQuarters(kit, rig, scene, dynamic, interactables);
  buildGalley(kit, rig, scene, dynamic, interactables);
  buildBathroom(kit, rig, scene, dynamic, interactables, mirrors);
  buildAmbient(rig, scene);

  const meshes = kit.finish(scene);
  rig.apply();

  return { colliders: kit.colliders, interactables, rig, mirrors, meshes: meshes.concat(dynamic) };
}

/* ------------------------------------------------------------------ ambient */

function buildAmbient(rig, scene) {
  const hemi = new THREE.HemisphereLight(0x1b2c3e, 0x080b0d, 0.32);
  hemi.layers.enableAll();
  scene.add(hemi);
  rig.addLight(hemi, 0.32, 0.20, 0x1b2c3e, 0x18293c);
  // dim emitter variants also follow the day/rest cycle
  rig.addEmissive(M.emissiveWarmDim, 1.0, 0.1);
  rig.addEmissive(M.emissiveTealDim, 1.15, 0.85);
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
  kit.box(L, 'hull', T, portA.bottom, portA.end - portA.start, [R.x1 + T / 2, portA.bottom / 2, (portA.start + portA.end) / 2], [0, 0, 0], WALL_TILE);
  kit.box(LAYER.GALLEY, 'hull', T, portA.bottom, portA.end - portA.start, [R.x1 + T / 2, portA.bottom / 2, (portA.start + portA.end) / 2], [0, 0, 0], WALL_TILE);
  kit.box(L, 'hull', T, portB.bottom, portB.end - portB.start, [R.x0 - T / 2, portB.bottom / 2, (portB.start + portB.end) / 2], [0, 0, 0], WALL_TILE);
  kit.colliderMinMax(R.x1, portA.start, R.x1 + T, portA.end);
  kit.colliderMinMax(R.x0 - T, portB.start, R.x0, portB.end);

  dynamic.push(porthole(kit, L, R.x1, +1, -4.5, 1.62, 0.42, 0.66));
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

  // horizontal stringers: stop the wall reading as one big field.
  // They must skip the doorways and the portholes.
  const skipsByWall = {
    '-1': [[-9.25, -7.75], [-17.2, -15.8], [-20.6, -18.4]],
    '1': [[-15.3, -13.7], [-5.6, -3.4]],
  };
  for (const sx of [-1, 1]) {
    const x = sx * (R.x1 - 0.015);
    const skips = skipsByWall[String(sx)].map(([a, b]) => ({ start: a, end: b }));
    const spans = splitSpan(R.z0 + 0.15, R.z1 - 0.15, skips).solid;
    for (const [a, b] of spans) {
      const len = b - a, zc = (a + b) / 2;
      if (len < 0.25) continue;
      kit.box(L, 'structure', 0.06, 0.09, len, [x, 1.62, zc], [0, 0, 0], 0.6);
      kit.at(L, 'metal', boltRowGeo(len * 0.94, Math.max(2, Math.round(len * 1.4)), 0.011, 0.009),
        { pos: [sx * (R.x1 - 0.05), 1.62, zc], rot: [0, sx * Math.PI / 2, 0] });
    }
    // low rail + wainscot only need to dodge the doorways
    const lowSkips = (sx < 0 ? [[-9.25, -7.75], [-17.2, -15.8]] : [[-15.3, -13.7]]).map(([a, b]) => ({ start: a, end: b }));
    for (const [a, b] of splitSpan(R.z0 + 0.15, R.z1 - 0.15, lowSkips).solid) {
      const len = b - a, zc = (a + b) / 2;
      if (len < 0.25) continue;
      kit.box(L, 'structure', 0.05, 0.06, len, [x, 0.72, zc], [0, 0, 0], 0.6);
      kit.box(L, 'hullDark', 0.03, 0.62, len, [x, 0.38, zc], [0, 0, 0], 1.2);
    }
  }

  // ceiling practicals — pools of warm light with dark gaps between them
  rig.addEmissive(M.emissiveWarm, 2.3, 0.18);
  for (let i = 0; i < 5; i++) {
    const z = R.z0 + 2.2 + i * 4.0;
    if (z > R.z1 - 0.6) break;
    kit.at(L, 'structure', lightHousingGeo(0.44, 1.05, 0.09), { pos: [0, R.h - 0.045, z], rot: [Math.PI / 2, 0, 0] });
    kit.at(L, 'emissiveWarm', planeGeo(0.36, 0.95), { pos: [0, R.h - 0.075, z], rot: [Math.PI / 2, 0, 0] });
    const sp = new THREE.SpotLight(0xffc9a0, 16, 7.5, 1.15, 0.75, 2);
    sp.position.set(0, R.h - 0.14, z);
    sp.target.position.set(0, 0, z + 0.35);
    if (i === 1) {
      sp.castShadow = true;
      sp.shadow.mapSize.set(768, 768);
      sp.shadow.camera.near = 0.3;
      sp.shadow.camera.far = 9;
      sp.shadow.bias = -0.0007;
      sp.shadow.normalBias = 0.035;
    }
    sp.layers.set(L);
    scene.add(sp, sp.target);
    rig.addLight(sp, 16, 1.3, 0xffc9a0, 0xff8a3c, { ref: [0, z], range: 7.6 });
  }

  // teal floor guide strips (emissive only — bloom does the work)
  rig.addEmissive(M.emissiveTeal, 2.9, 2.0);
  for (let z = R.z0 + 1.0; z < R.z1 - 0.5; z += 1.0) {
    kit.at(L, 'emissiveTeal', planeGeo(0.1, 0.03), { pos: [0.55, 0.014, z], rot: [-Math.PI / 2, 0, 0] });
    kit.at(L, 'emissiveTeal', planeGeo(0.1, 0.03), { pos: [-0.55, 0.014, z], rot: [-Math.PI / 2, 0, 0] });
  }
  // wall-washing teal strips at knee height; only two carry a real light
  let tealLit = 0;
  for (const sx of [-1, 1]) {
    for (let z = R.z0 + 2; z < R.z1 - 1; z += 4.0) {
      kit.at(L, 'structure', lightHousingGeo(1.6, 0.07, 0.05), { pos: [sx * (R.x1 - 0.03), 0.42, z], rot: [0, sx * Math.PI / 2, 0] });
      kit.at(L, 'emissiveTeal', planeGeo(1.5, 0.04), { pos: [sx * (R.x1 - 0.05), 0.42, z], rot: [0, sx * Math.PI / 2, 0] });
      if (tealLit < 4 && (z + 22) % 8 < 4.1) {
        const pl = new THREE.PointLight(PALETTE.teal, 2.6, 3.4, 2);
        pl.position.set(sx * (R.x1 - 0.3), 0.5, z);
        pl.layers.set(L);
        scene.add(pl);
        rig.addLight(pl, 2.6, 2.0, PALETTE.teal, PALETTE.teal, { ref: [sx * R.x1, z], range: 4.2 });
        tealLit++;
      }
    }
  }

  // cool spill from the portholes — the palette's cold counterweight
  for (const [px, pz] of [[R.x1, -4.5], [R.x0, -19.5]]) {
    const cl = new THREE.PointLight(PALETTE.cool, 2.3, 3.8, 2);
    cl.position.set(px * 0.45, 1.5, pz);
    cl.layers.set(L);
    scene.add(cl);
    rig.addLight(cl, 2.3, 1.5, PALETTE.cool, 0x7fa8e0, { ref: [px, pz], range: 5.4 });
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
    if (pts.length > 2) kit.add(L, 'structure', pipeRunGeo(pts, 0.042, 2));
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
      kit.at(L, 'structure', ventGeo(0.55, 0.42, 6, 0.06), { pos: [x, 1.7, z], rot: [0, ry, 0] });
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
  // orange accent furniture so the palette is not all bone + teal
  for (const [sx, z, len] of [[-1, -11.6, 2.2], [1, -7.4, 2.0], [-1, -19.0, 1.8], [1, -17.4, 2.0]]) {
    kit.box(L, 'accent', 0.05, 0.11, len, [sx * (R.x1 - 0.02), 1.28, z], [0, 0, 0], 0.6);
    kit.at(L, 'metal', boltRowGeo(len * 0.9, Math.round(len * 3), 0.012, 0.01),
      { pos: [sx * (R.x1 - 0.05), 1.28, z], rot: [0, sx * Math.PI / 2, 0] });
  }
  for (const [sx, z] of [[1, -9.4], [-1, -13.2]]) {
    kit.at(L, 'accent', boxGeo(0.12, 0.5, 0.34, 0.3), { pos: [sx * (R.x1 - 0.06), 0.9, z] });
    kit.at(L, 'metal', cylGeo(0.035, 0.035, 0.5, 8, 0.2), { pos: [sx * (R.x1 - 0.14), 0.9, z] });
  }

  // --- decals: sparse, asymmetric, never twice in the same spot
  const IN = 0.008;
  decal(kit, L, 0, 0.62, 0.36, R.x0 + IN, 1.95, -6.4, '+x');          // A-04
  decal(kit, L, 10, 0.5, 0.5, R.x1 - IN, 2.05, -10.2, '-x');          // 07
  decal(kit, L, 4, 0.5, 0.28, R.x1 - IN, 0.68, -12.4, '-x');          // arrow
  decal(kit, L, 4, 0.5, 0.28, R.x0 + IN, 0.68, -5.1, '+x', Math.PI);
  decal(kit, L, 2, 0.72, 0.3, R.x1 - IN, 1.9, -16.2, '-x');           // CAUTION
  decal(kit, L, 5, 0.34, 0.34, R.x0 + IN, 1.28, -12.9, '+x');         // hazard triangle
  decal(kit, L, 6, 0.44, 0.3, R.x1 - IN, 1.2, -7.3, '-x');            // barcode
  decal(kit, L, 12, 0.4, 0.44, R.x0 + IN, 1.62, -14.9, '+x');         // wiring placard
  decal(kit, L, 11, 0.28, 0.15, R.x1 - IN, 2.18, -6.9, '-x');         // EXIT
  decal(kit, L, 3, 0.6, 0.3, R.x0 + IN, 2.1, -18.2, '+x');            // HULL 07
  decal(kit, L, 15, 0.55, 0.3, R.x1 - IN, 1.42, -19.6, '-x');         // A-12
  decal(kit, L, 9, 0.62, 0.26, 0.0, 0.016, -9.8, 'floor');            // NO STEP
  decal(kit, L, 7, 1.3, 1.3, R.x1 - IN, 1.0, -3.2, '-x');             // scorch
  decal(kit, L, 7, 1.6, 1.6, R.x0 + IN, 0.9, -17.4, '+x');
  decal(kit, L, 8, 0.9, 0.3, R.x0 + IN, 0.22, -10.8, '+x');           // hazard stripe
  decal(kit, L, 13, 0.4, 0.24, R.x1 - IN, 0.95, -18.9, '-x');         // HOT
  decal(kit, L, 14, 0.34, 0.34, R.x0 + IN, 0.95, -3.7, '+x');         // O2

  // aft ceiling services so the near-camera ceiling band is not bare
  kit.add(L, 'metal', pipeRunGeo([[-0.62, R.h - 0.1, -1.4], [-0.62, R.h - 0.1, -6.2]], 0.045, 3));
  kit.at(L, 'structure', boxGeo(0.5, 0.07, 0.6, 0.4), { pos: [0.5, R.h - 0.05, -2.4] });
  kit.at(L, 'metal', greebleClusterGeo(951, 0.45, 0.55, 1.1), { pos: [0.5, R.h - 0.1, -2.4], rot: [Math.PI / 2, 0, 0] });
  kit.at(L, 'metal', ventGeo(0.42, 0.3, 4, 0.05), { pos: [-0.1, R.h - 0.05, -3.6], rot: [Math.PI / 2, 0, 0] });
  decal(kit, L, 4, 0.4, 0.18, 0.62, R.h - 0.04, -4.6, 'ceil');

  // mid-field clutter: floor hatch, wall toolbox, drooping looms
  kit.box(L, 'structure', 0.86, 0.03, 0.86, [0.0, 0.022, -11.4], [0, 0, 0], 0.5);
  kit.at(L, 'grate', planeGeo(0.8, 0.8, 0.5), { pos: [0.0, 0.045, -11.4], rot: [-Math.PI / 2, 0, 0] });
  for (const sx of [-1, 1]) {
    kit.at(L, 'metal', cylGeo(0.03, 0.03, 0.16, 8, 0.2), { pos: [sx * 0.38, 0.05, -11.02], rot: [0, 0, Math.PI / 2] });
    kit.at(L, 'metal', cylGeo(0.03, 0.03, 0.16, 8, 0.2), { pos: [sx * 0.38, 0.05, -11.78], rot: [0, 0, Math.PI / 2] });
  }
  kit.at(L, 'accent', boxGeo(0.5, 0.34, 0.28, 0.4), { pos: [-0.86, 0.62, -10.3] });
  kit.at(L, 'structure', boxGeo(0.54, 0.06, 0.32, 0.3), { pos: [-0.86, 0.8, -10.3] });
  kit.at(L, 'metal', boxGeo(0.16, 0.04, 0.05, 0.2), { pos: [-0.86, 0.85, -10.16] });
  kit.at(L, 'metal', greebleClusterGeo(881, 0.5, 0.26, 1.4), { pos: [-0.6, 0.62, -10.3], rot: [0, -Math.PI / 2, 0] });
  kit.collider(-0.9, -10.3, 0.55, 0.35);
  kit.at(L, 'structure', crateGeo(0.42, 0.34, 0.38, 33), { pos: [0.84, 0, -12.7], rot: [0, 0.22, 0] });
  kit.collider(0.86, -12.7, 0.46, 0.42);
  kit.add(L, 'rubber', cableGeo([-0.95, R.h - 0.22, -9.9], [-0.55, R.h - 0.22, -10.7], 0.3, 0.015));
  kit.add(L, 'rubber', cableGeo([0.95, R.h - 0.26, -13.4], [0.62, R.h - 0.26, -14.3], 0.26, 0.012));
  kit.at(L, 'metal', ventGeo(0.5, 0.36, 5, 0.05), { pos: [0, R.h - 0.06, -12.4], rot: [Math.PI / 2, 0, 0] });

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

/**
 * Stencil / placard decal from the atlas.
 * face: '+x' | '-x' | '+z' | '-z' | 'floor'  (direction the decal faces)
 */
function decal(kit, layer, index, w, h, x, y, z, face, tilt = 0) {
  const rot =
    face === '+x' ? [0, Math.PI / 2, tilt] :
    face === '-x' ? [0, -Math.PI / 2, tilt] :
    face === '+z' ? [0, 0, tilt] :
    face === '-z' ? [0, Math.PI, tilt] :
    face === 'ceil' ? [Math.PI / 2, 0, tilt] :
    [-Math.PI / 2, 0, tilt];
  kit.at(layer, 'decal', decalUV(planeGeo(w, h), index), { pos: [x, y, z], rot });
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
  const CH = 2.3;                      // cockpit ceiling
  const zFront = R.z0 + 0.1;

  floorSlab(kit, L, R.x0 - T, R.z0, R.x1 + T, R.z1 + T);
  // slate structural ceiling, not the warm hull set: under the warm practical the
  // bone panels were reading as plywood.
  ceilSlab(kit, L, R.x0 - T, R.z0, R.x1 + T, R.z1 + T, CH, 'ceilingDark');

  // aft wall (shared with corridor) with the throat opening
  wallX(kit, [L, LAYER.CORRIDOR], R.z1, +1, R.x0 - T, R.x1 + T,
    [{ start: -0.6, end: 0.6, top: 2.05 }], 'hull');
  addDoorSurround2(kit, L, R.z1, +1, 0, 1.2, 2.05);

  wallZ(kit, [L], R.x0, -1, R.z0, R.z1 + T, [], 'hull');
  wallZ(kit, [L], R.x1, +1, R.z0, R.z1 + T, [], 'hull');

  /* ---------------------------------------------------------- viewport --- */
  const sill = 0.95, head = 1.98, cant = 0.16;
  kit.box(L, 'hull', (R.x1 - R.x0) + T * 2, sill, T, [0, sill / 2, zFront - T / 2], [0, 0, 0], WALL_TILE);
  kit.colliderMinMax(R.x0 - T, zFront - T, R.x1 + T, zFront + 0.42);
  kit.box(L, 'hull', (R.x1 - R.x0) + T * 2, WALL_TOP - head, T, [0, (WALL_TOP + head) / 2, zFront - 0.30], [0, 0, 0], WALL_TILE);

  // sill: dark structural lip + bolt row + hazard paint, not a bare edge
  kit.box(L, 'structure', (R.x1 - R.x0) + 0.14, 0.17, 0.44, [0, sill - 0.05, zFront + 0.24], [0, 0, 0], 0.5);
  kit.at(L, 'metal', boltRowGeo(5.5, 20, 0.015, 0.013), { pos: [0, sill + 0.045, zFront + 0.44], rot: [Math.PI / 2, 0, 0] });
  kit.at(L, 'accent', boxGeo(0.5, 0.03, 0.12, 0.2), { pos: [-2.2, sill + 0.045, zFront + 0.44] });
  kit.at(L, 'accent', boxGeo(0.5, 0.03, 0.12, 0.2), { pos: [2.2, sill + 0.045, zFront + 0.44] });

  // thin mullions + glass
  const paneW = (R.x1 - R.x0) / 3;
  const glassH = head - sill;
  for (let i = 0; i <= 3; i++) {
    const x = R.x0 + i * paneW;
    const w = (i === 0 || i === 3) ? 0.13 : 0.075;
    kit.at(L, 'structure', boxGeo(w, glassH + 0.44, 0.14, 0.4), { pos: [x, (sill + head) / 2, zFront - 0.12], rot: [cant, 0, 0] });
    if (i > 0 && i < 3) {
      kit.at(L, 'metal', cylGeo(0.028, 0.028, glassH, 8, 0.2), { pos: [x, (sill + head) / 2, zFront - 0.03], rot: [cant, 0, 0] });
    }
  }
  kit.at(L, 'structure', boxGeo((R.x1 - R.x0) + 0.24, 0.13, 0.34, 0.4), { pos: [0, head + 0.02, zFront - 0.26], rot: [cant, 0, 0] });
  kit.at(L, 'metal', boltRowGeo(5.6, 22, 0.013, 0.011), { pos: [0, head + 0.02, zFront - 0.1], rot: [0, 0, 0] });
  for (let i = 0; i < 3; i++) {
    const x = R.x0 + (i + 0.5) * paneW;
    const pane = new THREE.Mesh(planeGeo(paneW - 0.1, glassH), M.glass);
    pane.position.set(x, (sill + head) / 2, zFront - 0.08);
    pane.rotation.x = cant;
    pane.layers.set(L);
    pane.renderOrder = 2;
    scene.add(pane);
    dynamic.push(pane);
  }
  // angled side panes
  for (const sx of [-1, 1]) {
    kit.at(L, 'structure', boxGeo(0.1, glassH + 0.36, 0.1, 0.4), { pos: [sx * (R.x1 - 0.02), (sill + head) / 2, zFront + 1.75] });
    const side = new THREE.Mesh(planeGeo(1.6, glassH * 0.9), M.glass);
    side.position.set(sx * (R.x1 - 0.01), (sill + head) / 2 - 0.02, zFront + 0.95);
    side.rotation.set(0, sx * Math.PI / 2, 0);
    side.layers.set(L);
    side.renderOrder = 2;
    scene.add(side);
    dynamic.push(side);
    kit.box(L, 'hull', T, sill, 1.75, [sx * (R.x1 + T / 2), sill / 2, zFront + 0.95], [0, 0, 0], WALL_TILE);
    kit.box(L, 'hull', T, WALL_TOP - head, 1.75, [sx * (R.x1 + T / 2), (WALL_TOP + head) / 2, zFront + 0.95], [0, 0, 0], WALL_TILE);
    kit.at(L, 'metal', boltRowGeo(1.6, 7, 0.014, 0.012), { pos: [sx * (R.x1 - 0.01), sill - 0.06, zFront + 0.95], rot: [0, sx * Math.PI / 2, 0] });
  }

  /* --------------------------------------------------------------- dash --- */
  buildDash(kit, scene, dynamic, L, zFront, sill);

  /* -------------------------------------------------------------- seats --- */
  for (const sx of [-1, 1]) buildSeat(kit, L, sx * 1.02, zFront + 2.25);

  /* ---------------------------------------------------- overhead panel --- */
  const opZ = zFront + 1.5;
  kit.box(L, 'hullDark', 2.7, 0.09, 0.86, [0, CH - 0.13, opZ], [0.2, 0, 0], 0.6);
  kit.box(L, 'structure', 2.82, 0.05, 0.94, [0, CH - 0.085, opZ], [0.2, 0, 0], 0.4);
  kit.box(L, 'structure', 3.1, 0.06, 0.08, [0, CH - 0.2, opZ - 0.48], [0.2, 0, 0], 0.3);
  kit.at(L, 'metal', greebleClusterGeo(77, 2.5, 0.72, 2.0), { pos: [0, CH - 0.185, opZ], rot: [Math.PI / 2 + 0.2, 0, 0] });
  kit.at(L, 'emissiveTeal', planeGeo(0.7, 0.025), { pos: [-0.9, CH - 0.2, opZ + 0.3], rot: [Math.PI / 2 + 0.2, 0, 0] });
  kit.at(L, 'emissiveOrange', planeGeo(0.28, 0.025), { pos: [0.75, CH - 0.2, opZ + 0.3], rot: [Math.PI / 2 + 0.2, 0, 0] });
  const ohScreen = new THREE.Mesh(planeGeo(0.5, 0.2), M.screenList);
  ohScreen.position.set(0.55, CH - 0.205, opZ - 0.12);
  ohScreen.rotation.set(Math.PI / 2 + 0.2, 0, 0);
  ohScreen.layers.set(L);
  scene.add(ohScreen); dynamic.push(ohScreen);

  /* ------------------------------------------------------- ceiling kit --- */
  // Glare shield: a deep brow over the viewport. It shades the ceiling from the
  // window key light (which was washing it into one flat bright slab) and is what
  // a real cockpit has anyway.
  kit.at(L, 'structure', boxGeo((R.x1 - R.x0) + 0.2, 0.1, 0.62, 0.4), { pos: [0, head + 0.13, zFront + 0.26], rot: [0.06, 0, 0] });
  kit.at(L, 'hullDark', boxGeo((R.x1 - R.x0) + 0.16, 0.05, 0.58, 0.4), { pos: [0, head + 0.08, zFront + 0.26], rot: [0.06, 0, 0] });
  kit.at(L, 'metal', boltRowGeo(5.6, 20, 0.013, 0.011), { pos: [0, head + 0.185, zFront + 0.5], rot: [Math.PI / 2, 0, 0] });
  for (const sx of [-1, 1]) {
    kit.at(L, 'structure', boxGeo(0.1, 0.26, 0.6, 0.3), { pos: [sx * (R.x1 - 0.12), head + 0.02, zFront + 0.28], rot: [0.06, 0, 0] });
  }

  for (let i = 0; i < 3; i++) {
    const z = zFront + 0.9 + i * 1.6;
    kit.at(L, 'structure', ribGeo((R.x1 - R.x0) + T * 2 + 0.02, CH + 0.02, 0.09, 0.14), { pos: [0, 0, z] });
  }
  // ceiling services: conduit pairs, recessed avionics bays, handholds
  for (const sx of [-1, 1]) {
    kit.add(L, 'metal', pipeRunGeo([[sx * 1.55, CH - 0.09, zFront + 0.7], [sx * 1.55, CH - 0.09, zFront + 5.5]], 0.05, 3));
    kit.at(L, 'hullDark', boxGeo(0.9, 0.07, 1.1, 0.5), { pos: [sx * 1.85, CH - 0.055, zFront + 2.5] });
    kit.at(L, 'metal', greebleClusterGeo(940 + sx, 0.8, 1.0, 1.1), { pos: [sx * 1.85, CH - 0.1, zFront + 2.5], rot: [Math.PI / 2, 0, 0] });
    kit.at(L, 'metal', boltRowGeo(1.1, 6, 0.012, 0.01), { pos: [sx * 1.36, CH - 0.045, zFront + 2.5], rot: [Math.PI / 2, 0, Math.PI / 2] });
    kit.at(L, 'accent', boxGeo(0.5, 0.03, 0.09, 0.2), { pos: [sx * 2.3, CH - 0.05, zFront + 1.2] });
    kit.at(L, 'metal', handrailGeo(0.9), { pos: [sx * 2.55, CH - 0.13, zFront + 4.3], rot: [Math.PI, 0, 0] });
  }
  kit.at(L, 'structure', ventGeo(0.6, 0.42, 5, 0.06), { pos: [0, CH - 0.05, zFront + 1.15], rot: [Math.PI / 2, 0, 0] });
  decal(kit, L, 1, 0.5, 0.22, -1.1, CH - 0.045, zFront + 4.1, 'ceil');
  for (const sx of [-1, 1]) {
    kit.at(L, 'metal', conduitBundleGeo(4.8, 4, 0.04, 0.13, 400 + sx), { pos: [sx * 2.5, CH - 0.16, zFront + 2.6] });
    // in-frame side consoles beside the pilots
    kit.at(L, 'hullDark', boxGeo(0.62, 0.95, 1.5, 0.6), { pos: [sx * (R.x1 - 0.34), 0.48, zFront + 2.2] });
    kit.at(L, 'structure', boxGeo(0.68, 0.07, 1.56, 0.4), { pos: [sx * (R.x1 - 0.34), 0.98, zFront + 2.2] });
    kit.at(L, 'metal', greebleClusterGeo(620 + sx, 1.4, 0.5, 1.6), { pos: [sx * (R.x1 - 0.34), 1.02, zFront + 2.2], rot: [-Math.PI / 2, 0, sx * Math.PI / 2] });
    kit.at(L, 'accent', boxGeo(0.06, 0.09, 0.5, 0.3), { pos: [sx * (R.x1 - 0.05), 0.72, zFront + 2.2] });
    kit.at(L, 'emissiveTeal', planeGeo(0.02, 1.2), { pos: [sx * (R.x1 - 0.66), 0.99, zFront + 2.2], rot: [Math.PI / 2, 0, 0] });
    kit.collider(sx * (R.x1 - 0.34), zFront + 2.2, 0.7, 1.6);
    kit.at(L, 'structure', equipBoxGeo(1.1, 0.8, 0.18, 700 + sx), { pos: [sx * (R.x1 - 0.02), 1.62, zFront + 2.3], rot: [0, sx > 0 ? -Math.PI / 2 : Math.PI / 2, 0] });
    // upper wall: breaker cabinet, pipe drop, placard, strip light
    kit.at(L, 'hullDark', boxGeo(0.26, 0.66, 1.05, 0.6), { pos: [sx * (R.x1 - 0.12), 2.05, zFront + 1.15] });
    kit.at(L, 'metal', greebleClusterGeo(910 + sx, 0.95, 0.55, 1.7), { pos: [sx * (R.x1 - 0.25), 2.05, zFront + 1.15], rot: [0, sx > 0 ? -Math.PI / 2 : Math.PI / 2, 0] });
    kit.at(L, 'structure', lightHousingGeo(1.5, 0.06, 0.05), { pos: [sx * (R.x1 - 0.04), 1.72, zFront + 3.1], rot: [0, sx > 0 ? -Math.PI / 2 : Math.PI / 2, 0] });
    kit.at(L, 'emissiveTeal', planeGeo(1.4, 0.03), { pos: [sx * (R.x1 - 0.07), 1.72, zFront + 3.1], rot: [0, sx > 0 ? -Math.PI / 2 : Math.PI / 2, 0] });
    kit.add(L, 'metal', pipeRunGeo([[sx * (R.x1 - 0.1), 2.25, zFront + 0.5], [sx * (R.x1 - 0.1), 2.25, zFront + 4.6]], 0.042, 3));
    kit.at(L, 'accent', boxGeo(0.04, 0.1, 0.7, 0.3), { pos: [sx * (R.x1 - 0.02), 1.28, zFront + 1.2] });
    kit.at(L, 'structure', equipBoxGeo(1.4, 1.0, 0.2, 300 + sx), { pos: [sx * (R.x1 - 0.02), 1.42, zFront + 4.0], rot: [0, sx > 0 ? -Math.PI / 2 : Math.PI / 2, 0] });
    kit.at(L, 'metal', greebleClusterGeo(500 + sx, 1.5, 0.9, 1.1), { pos: [sx * (R.x1 - 0.02), 1.5, zFront + 5.2], rot: [0, sx > 0 ? -Math.PI / 2 : Math.PI / 2, 0] });
    kit.at(L, 'metal', handrailGeo(1.2), { pos: [sx * (R.x1 - 0.1), 1.02, zFront + 3.0], rot: [0, Math.PI / 2, 0] });
    kit.add(L, 'metal', pipeRunGeo([[sx * (R.x1 - 0.12), 0.4, zFront + 1.0], [sx * (R.x1 - 0.12), 0.4, zFront + 5.4]], 0.05, 3));
  }
  // floor cable channel
  kit.box(L, 'structure', 0.5, 0.04, 4.0, [0, 0.02, zFront + 3.4], [0, 0, 0], 0.5);
  kit.at(L, 'grate', planeGeo(0.46, 3.9, 0.5), { pos: [0, 0.045, zFront + 3.4], rot: [-Math.PI / 2, 0, 0] });
  kit.at(L, 'rubber', boxGeo(1.1, 0.014, 0.8, 0.5), { pos: [0, 0.008, zFront + 2.9] });

  /* --- decals */
  decal(kit, L, 3, 0.7, 0.34, R.x0 + 0.01, 2.1, zFront + 4.2, '+x');
  decal(kit, L, 2, 0.66, 0.28, R.x1 - 0.01, 2.05, zFront + 2.4, '-x');
  decal(kit, L, 12, 0.44, 0.48, R.x1 - 0.01, 1.45, zFront + 4.6, '-x');
  decal(kit, L, 5, 0.3, 0.3, R.x0 + 0.01, 1.5, zFront + 2.2, '+x');
  decal(kit, L, 8, 1.2, 0.26, 0, 0.017, zFront + 0.74, 'floor');
  decal(kit, L, 14, 0.3, 0.3, R.x0 + 0.01, 0.72, zFront + 5.1, '+x');
  decal(kit, L, 6, 0.4, 0.28, R.x1 - 0.01, 0.7, zFront + 5.3, '-x');
  decal(kit, L, 11, 0.36, 0.2, 0.55, 1.02, R.z1 - 0.02, '-z');

  /* ------------------------------------------------------------ lights --- */
  // The viewport is the key light: cool, broad, motivated by the planet outside.
  const rect = new THREE.RectAreaLight(PALETTE.cool, 8.4, 5.6, 1.05);
  rect.position.set(0, (sill + head) / 2, zFront + 0.06);
  rect.lookAt(0, 0.78, zFront + 3.6);   // aimed at the dash, not the ceiling
  rect.layers.set(L);
  scene.add(rect);
  rig.addLight(rect, 8.4, 3.6, PALETTE.cool, 0x6f9fd8, { ref: [0, zFront], range: 13 });

  const key = new THREE.DirectionalLight(0xbfd9ff, 2.1);
  key.position.set(-5, 3.4, zFront - 6);
  key.target.position.set(0.4, 0.9, zFront + 2.5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 24;
  key.shadow.camera.left = -4.2; key.shadow.camera.right = 4.2;
  key.shadow.camera.top = 3; key.shadow.camera.bottom = -2;
  key.shadow.bias = -0.0008;
  key.shadow.normalBias = 0.03;
  key.layers.set(L);
  scene.add(key, key.target);
  rig.addLight(key, 2.1, 0.4, 0xbfd9ff, 0x8fb4e8, { ref: [0, zFront + 2], range: 11 });

  const warm1 = new THREE.PointLight(0xffd9bb, 1.9, 3.4, 2);
  warm1.position.set(0, 1.32, zFront + 2.75);
  warm1.layers.set(L);
  scene.add(warm1);
  rig.addLight(warm1, 1.9, 0.4, 0xffd9bb, 0xff7a30, { ref: [0, zFront + 2.75], range: 9 });

  const glow = new THREE.PointLight(PALETTE.teal, 3.2, 2.8, 2);
  glow.position.set(0, 1.0, zFront + 0.95);
  glow.layers.set(L);
  scene.add(glow);
  rig.addLight(glow, 3.2, 1.8, PALETTE.teal, PALETTE.teal, { ref: [0, zFront + 0.95], range: 9 });

  // Overhead practical, pushed aft of the pilot position and deeply recessed: from
  // the seats you see the pool of light it throws on the dash, never the emitter.
  const clZ = zFront + 5.55;
  kit.at(L, 'structure', lightHousingGeo(0.44, 1.5, 0.17), { pos: [0, CH + 0.01, clZ], rot: [Math.PI / 2, 0, 0] });
  kit.at(L, 'emissiveWarm', planeGeo(0.15, 0.9), { pos: [0, CH - 0.13, clZ], rot: [Math.PI / 2, 0, 0] });
  kit.at(L, 'structure', boxGeo(0.06, 0.05, 1.25, 0.3), { pos: [0, CH - 0.105, clZ] });
  kit.at(L, 'structure', boltRowGeo(1.3, 7, 0.012, 0.01), { pos: [0.2, CH - 0.05, clZ], rot: [Math.PI / 2, 0, Math.PI / 2] });
  const cl = new THREE.PointLight(0xffc9a0, 2.5, 4.4, 2);
  cl.position.set(0, CH - 0.26, clZ);
  cl.layers.set(L);
  scene.add(cl);
  rig.addLight(cl, 2.5, 0.5, 0xffc9a0, 0xff8a3c, { ref: [0, clZ], range: 26 });
}

/** Continuous instrument dash across the bow with angled screen faces. */
function buildDash(kit, scene, dynamic, L, zFront, sill) {
  const zc = zFront + 0.85;
  // main body
  kit.box(L, 'hullDark', 5.4, 0.74, 0.66, [0, 0.37, zc], [0, 0, 0], 0.7);
  kit.box(L, 'structure', 5.5, 0.1, 0.72, [0, 0.76, zc], [0, 0, 0], 0.5);
  // angled instrument face
  kit.box(L, 'structure', 5.4, 0.44, 0.1, [0, 0.94, zc - 0.16], [-0.6, 0, 0], 0.5);
  kit.at(L, 'metal', greebleClusterGeo(210, 5.2, 0.4, 1.9), { pos: [0, 0.955, zc - 0.11], rot: [-0.6 - Math.PI / 2, 0, 0] });
  kit.collider(0, zc, 5.5, 0.9);

  // knee bolsters + vents under the dash
  for (const sx of [-1, 1]) {
    kit.at(L, 'metal', ventGeo(0.7, 0.34, 5, 0.05), { pos: [sx * 1.7, 0.42, zc + 0.34], rot: [0, Math.PI, 0] });
    kit.at(L, 'accent', boxGeo(0.34, 0.07, 0.1, 0.2), { pos: [sx * 2.45, 0.6, zc + 0.34] });
  }
  kit.at(L, 'metal', greebleClusterGeo(211, 1.2, 0.5, 1.2), { pos: [0, 0.42, zc + 0.34], rot: [0, Math.PI, 0] });

  // screens along the angled face
  const kinds = ['nav', 'wave', 'bars', 'list', 'nav'];
  const xs = [-2.05, -1.05, 0, 1.05, 2.05];
  for (let i = 0; i < xs.length; i++) {
    const scr = new THREE.Mesh(planeGeo(0.78, 0.36), M[`screen${kinds[i][0].toUpperCase()}${kinds[i].slice(1)}`]);
    scr.position.set(xs[i], 0.965, zc - 0.09);
    scr.rotation.x = -0.6;
    scr.layers.set(L);
    scene.add(scr);
    dynamic.push(scr);
    kit.at(L, 'structure', boxGeo(0.86, 0.44, 0.03, 0.3), { pos: [xs[i], 0.955, zc - 0.105], rot: [-0.6, 0, 0] });
  }

  // throttle quadrant on the centre pedestal
  kit.box(L, 'structure', 0.72, 0.5, 0.8, [0, 0.25, zc + 1.0], [0, 0, 0], 0.5);
  kit.at(L, 'metal', greebleClusterGeo(212, 0.62, 0.68, 1.6), { pos: [0, 0.51, zc + 1.0], rot: [-Math.PI / 2, 0, 0] });
  for (let i = 0; i < 2; i++) {
    kit.at(L, 'metal', cylGeo(0.018, 0.018, 0.3, 8, 0.2), { pos: [-0.14 + i * 0.16, 0.62, zc + 0.86], rot: [0.55, 0, 0] });
    kit.at(L, 'rubber', sphereGeo(0.038, 10, 8), { pos: [-0.14 + i * 0.16, 0.75, zc + 0.93] });
  }
  kit.at(L, 'accent', boxGeo(0.1, 0.2, 0.1, 0.2), { pos: [0.24, 0.6, zc + 0.82], rot: [0.3, 0, 0] });
  kit.collider(0, zc + 1.0, 0.9, 0.9);

  // yokes in front of each seat
  for (const sx of [-1, 1]) {
    kit.at(L, 'structure', cylGeo(0.05, 0.06, 0.34, 10, 0.2), { pos: [sx * 1.02, 0.62, zc + 0.5], rot: [0.35, 0, 0] });
    kit.at(L, 'rubber', torusGeo(0.15, 0.026, 8, 20), { pos: [sx * 1.02, 0.8, zc + 0.56], rot: [1.2, 0, 0] });
    kit.at(L, 'metal', boxGeo(0.1, 0.05, 0.1, 0.2), { pos: [sx * 1.02, 0.79, zc + 0.56] });
  }
}

/**
 * Pilot seat. Built to read as a seat from behind (the cockpit money shot looks
 * over the headrests): pedestal → gas strut → tilted pan with a rolled front lip →
 * a narrow backrest that stops short of a separate floating headrest → soft side
 * bolsters → four-point harness webbing over the shoulders.
 */
function buildSeat(kit, L, x, z) {
  const seatFab = 'fabricSeat';
  // floor rails + pedestal + gas strut
  for (const sx of [-1, 1]) kit.at(L, 'metal', boxGeo(0.07, 0.035, 0.78, 0.3), { pos: [x + sx * 0.19, 0.018, z] });
  kit.at(L, 'structure', boxGeo(0.44, 0.05, 0.5, 0.4), { pos: [x, 0.06, z] });
  kit.at(L, 'metal', cylGeo(0.085, 0.11, 0.26, 12, 0.2), { pos: [x, 0.19, z] });
  kit.at(L, 'metal', cylGeo(0.055, 0.055, 0.12, 10, 0.15), { pos: [x, 0.35, z] });
  kit.at(L, 'structure', boxGeo(0.5, 0.07, 0.52, 0.4), { pos: [x, 0.42, z], rot: [0.05, 0, 0] });

  // seat pan: tilted cushion with a rolled front lip
  kit.at(L, seatFab, roundedBoxGeo(0.5, 0.13, 0.5, 0.05, 2), { pos: [x, 0.52, z], rot: [0.07, 0, 0] });
  kit.at(L, seatFab, cylGeo(0.065, 0.065, 0.46, 12, 0.2), { pos: [x, 0.5, z - 0.24], rot: [0, 0, Math.PI / 2] });
  for (const sx of [-1, 1]) {
    kit.at(L, seatFab, cylGeo(0.055, 0.055, 0.46, 10, 0.2), { pos: [x + sx * 0.22, 0.55, z], rot: [Math.PI / 2, 0, 0] });
  }

  // backrest: narrow spine plate, cushion, bolsters — stops at 1.06 so the
  // headrest reads as a separate floating block above it
  kit.at(L, 'structure', boxGeo(0.4, 0.52, 0.07, 0.4), { pos: [x, 0.86, z + 0.28], rot: [-0.17, 0, 0] });
  // tubular frame round the backrest so the seat has an edge that catches light
  for (const sx of [-1, 1]) {
    kit.at(L, 'metal', cylGeo(0.02, 0.02, 0.62, 8, 0.15), { pos: [x + sx * 0.24, 0.9, z + 0.3], rot: [-0.17, 0, 0] });
  }
  kit.at(L, 'metal', cylGeo(0.02, 0.02, 0.48, 8, 0.15), { pos: [x, 1.2, z + 0.25], rot: [0, 0, Math.PI / 2] });
  kit.at(L, seatFab, roundedBoxGeo(0.38, 0.5, 0.13, 0.045, 2), { pos: [x, 0.86, z + 0.21], rot: [-0.17, 0, 0] });
  for (const sx of [-1, 1]) {
    kit.at(L, seatFab, cylGeo(0.062, 0.05, 0.5, 10, 0.2), { pos: [x + sx * 0.2, 0.86, z + 0.19], rot: [-0.17, 0, 0] });
  }
  // shoulder yoke + floating headrest on two posts
  kit.at(L, 'structure', boxGeo(0.44, 0.06, 0.1, 0.3), { pos: [x, 1.11, z + 0.3], rot: [-0.17, 0, 0] });
  for (const sx of [-1, 1]) kit.at(L, 'metal', cylGeo(0.014, 0.014, 0.11, 8, 0.1), { pos: [x + sx * 0.08, 1.17, z + 0.31] });
  kit.at(L, seatFab, roundedBoxGeo(0.26, 0.14, 0.15, 0.045, 2), { pos: [x, 1.27, z + 0.29], rot: [-0.17, 0, 0] });
  kit.at(L, 'emissiveTealDim', planeGeo(0.012, 0.42), { pos: [x - 0.215, 0.9, z + 0.14], rot: [-0.17, 0, 0] });
  kit.at(L, 'emissiveTealDim', planeGeo(0.012, 0.42), { pos: [x + 0.215, 0.9, z + 0.14], rot: [-0.17, 0, 0] });

  // four-point harness: two webbing straps over the shoulders into a centre buckle
  for (const sx of [-1, 1]) {
    kit.at(L, 'fabricWarm', boxGeo(0.055, 0.58, 0.012, 0.3), { pos: [x + sx * 0.11, 0.84, z + 0.115], rot: [-0.2, 0, sx * 0.14] });
    kit.at(L, 'metal', boxGeo(0.05, 0.035, 0.02, 0.2), { pos: [x + sx * 0.1, 1.09, z + 0.19], rot: [-0.2, 0, 0] });
  }
  kit.at(L, 'accent', boxGeo(0.075, 0.075, 0.03, 0.2), { pos: [x, 0.6, z - 0.03], rot: [0.2, 0, 0] });

  // armrests + recline lever
  for (const sx of [-1, 1]) {
    kit.at(L, 'structure', boxGeo(0.055, 0.055, 0.36, 0.3), { pos: [x + sx * 0.3, 0.71, z - 0.02] });
    kit.at(L, 'rubber', roundedBoxGeo(0.08, 0.045, 0.34, 0.02, 1), { pos: [x + sx * 0.3, 0.765, z - 0.02] });
    kit.at(L, 'structure', boxGeo(0.045, 0.2, 0.05, 0.2), { pos: [x + sx * 0.3, 0.6, z + 0.12] });
  }
  kit.at(L, 'metal', cylGeo(0.012, 0.012, 0.16, 8, 0.1), { pos: [x + 0.32, 0.62, z - 0.16], rot: [0, 0, 0.5] });
  kit.collider(x, z, 0.7, 0.8);
}

function addDoorSurround2(kit, layer, zInner, dir, x, w, h) {
  kit.at(layer, 'structure', doorFrameGeo(w, h, T * 1.05, 0.14), { pos: [x, 0, zInner + dir * T * 0.5] });
  kit.at(layer, 'accent', boxGeo(w * 0.92, 0.1, 0.1, 0.3), { pos: [x, h + 0.2, zInner + dir * 0.06] });
}

const cap = (s) => s[0].toUpperCase() + s.slice(1);

/* ----------------------------------------------------------------- quarters */

function buildQuarters(kit, rig, scene, dynamic, interactables) {
  const R = ROOM.quarters;
  const L = LAYER.QUARTERS;
  const rnd = mulberry32(1717);

  floorSlab(kit, L, R.x0 - T, R.z0 - T, R.x1, R.z1 + T);
  ceilSlab(kit, L, R.x0 - T, R.z0 - T, R.x1, R.z1 + T, R.h);
  wallZ(kit, [L], R.x0, -1, R.z0 - T, R.z1 + T, [], 'hull');
  wallX(kit, [L], R.z0, -1, R.x0 - T, R.x1, [], 'hull');
  wallX(kit, [L], R.z1, +1, R.x0 - T, R.x1, [], 'hull');

  const cx = (R.x0 + R.x1) / 2, cz = (R.z0 + R.z1) / 2;

  /* -------------------------------------------------- structure + trim --- */
  for (let z = R.z0 + 0.9; z < R.z1; z += 1.7) {
    kit.at(L, 'structure', ribGeo(R.x1 - R.x0 + T * 2, R.h + 0.02, 0.085, 0.13), { pos: [cx - T / 2, 0, z] });
  }
  // wainscot + stringer on the long walls
  for (const [z0, z1] of [[R.z0 + 0.1, R.z1 - 0.1]]) {
    for (const [wz, face] of [[R.z0 + 0.02, 1], [R.z1 - 0.02, -1]]) {
      kit.box(L, 'structure', R.x1 - R.x0 - 0.1, 0.07, 0.05, [cx - 0.05, 1.58, wz], [0, 0, 0], 0.6);
      kit.box(L, 'hullDark', R.x1 - R.x0 - 0.1, 0.5, 0.03, [cx - 0.05, 0.3, wz], [0, 0, 0], 1.2);
      kit.at(L, 'metal', boltRowGeo(R.x1 - R.x0 - 0.4, 12, 0.011, 0.009), { pos: [cx - 0.05, 1.58, wz + face * 0.03] });
    }
    kit.box(L, 'structure', 0.05, 0.07, z1 - z0, [R.x0 + 0.02, 1.58, cz], [0, 0, 0], 0.6);
    kit.box(L, 'hullDark', 0.03, 0.5, z1 - z0, [R.x0 + 0.02, 0.3, cz], [0, 0, 0], 1.2);
  }
  // ceiling services
  kit.at(L, 'metal', conduitBundleGeo(4.8, 4, 0.038, 0.11, 88), { pos: [R.x0 + 0.42, R.h - 0.14, cz] });
  kit.at(L, 'structure', conduitBundleGeo(4.8, 2, 0.055, 0.08, 89), { pos: [R.x1 - 0.5, R.h - 0.13, cz] });
  kit.add(L, 'metal', pipeRunGeo([[R.x0 + 0.14, 0.28, R.z0 + 0.3], [R.x0 + 0.14, 2.2, R.z0 + 0.3], [R.x0 + 0.14, 2.2, R.z1 - 0.4]], 0.05, 2));
  kit.add(L, 'rubber', cableGeo([R.x0 + 0.5, R.h - 0.2, R.z0 + 1.2], [R.x0 + 1.4, R.h - 0.2, R.z0 + 2.0], 0.22, 0.013));
  kit.at(L, 'metal', ventGeo(0.6, 0.4, 6, 0.06), { pos: [cx + 0.9, 2.0, R.z0 + 0.03] });
  kit.at(L, 'structure', equipBoxGeo(0.8, 0.6, 0.16, 501), { pos: [R.x1 - 0.02, 1.9, R.z0 + 1.4], rot: [0, -Math.PI / 2, 0] });

  /* ------------------------------------------------------------- bunk --- */
  const bx = R.x0 + 1.12, bz = cz + 0.15;          // centre of the bunk
  const BW = 2.02, BD = 1.02;                       // length (z) x width (x)

  // welded frame: posts, rails, headboard, perforated deck
  const frame = [];
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      frame.push(xform(cylGeo(0.045, 0.05, 0.46, 8, 0.3), { pos: [sx * (BD / 2 - 0.05), 0.23, sz * (BW / 2 - 0.05)] }));
    }
  }
  frame.push(xform(boxGeo(BD, 0.07, 0.07, 0.4), { pos: [0, 0.44, -BW / 2 + 0.05] }));
  frame.push(xform(boxGeo(BD, 0.07, 0.07, 0.4), { pos: [0, 0.44, BW / 2 - 0.05] }));
  frame.push(xform(boxGeo(0.07, 0.07, BW, 0.4), { pos: [-BD / 2 + 0.05, 0.44, 0] }));
  frame.push(xform(boxGeo(0.07, 0.07, BW, 0.4), { pos: [BD / 2 - 0.05, 0.44, 0] }));
  frame.push(xform(boxGeo(BD - 0.1, 0.04, BW - 0.1, 0.5), { pos: [0, 0.425, 0] }));
  frame.push(xform(boxGeo(BD - 0.02, 0.5, 0.05, 0.5), { pos: [0, 0.24, BW / 2 - 0.03] }));
  frame.push(xform(boxGeo(0.05, 0.5, BW - 0.06, 0.5), { pos: [-BD / 2 + 0.03, 0.24, 0] }));
  // headboard panel with a shelf
  frame.push(xform(boxGeo(BD, 0.7, 0.06, 0.5), { pos: [0, 0.86, -BW / 2 + 0.02] }));
  frame.push(xform(boxGeo(BD, 0.045, 0.22, 0.4), { pos: [0, 1.24, -BW / 2 + 0.12] }));
  kit.at(L, 'structure', mergeAll(frame), { pos: [bx, 0, bz] });
  kit.at(L, 'metal', greebleClusterGeo(313, 0.9, 0.36, 1.2), { pos: [bx, 0.92, bz - BW / 2 + 0.06] });
  kit.at(L, 'metal', boltRowGeo(0.9, 5, 0.012, 0.01), { pos: [bx, 0.46, bz + BW / 2 - 0.02], rot: [Math.PI / 2, 0, 0] });

  // drawers under the bunk
  for (let i = 0; i < 2; i++) {
    const dz = bz - 0.5 + i * 1.0;
    kit.at(L, 'hullDark', boxGeo(BD - 0.14, 0.2, 0.92, 0.5), { pos: [bx, 0.13, dz] });
    kit.at(L, 'metal', boxGeo(0.05, 0.035, 0.3, 0.2), { pos: [bx + BD / 2 - 0.06, 0.15, dz] });
    kit.at(L, 'accent', boxGeo(0.02, 0.05, 0.16, 0.2), { pos: [bx + BD / 2 - 0.08, 0.22, dz - 0.3] });
  }

  // curtain rail + half-drawn curtain
  kit.at(L, 'metal', cylGeo(0.016, 0.016, BW, 8, 0.2), { pos: [bx + BD / 2 - 0.04, 1.66, bz], rot: [Math.PI / 2, 0, 0] });
  kit.at(L, 'metal', cylGeo(0.02, 0.02, 0.14, 6, 0.1), { pos: [bx + BD / 2 - 0.04, 1.73, bz - BW / 2 + 0.03] });
  kit.at(L, 'metal', cylGeo(0.02, 0.02, 0.14, 6, 0.1), { pos: [bx + BD / 2 - 0.04, 1.73, bz + BW / 2 - 0.03] });
  kit.at(L, 'rubber', drapeGeo(0.4, 0.92, 4, 0.035, 5), { pos: [bx + BD / 2 - 0.04, 1.64, bz - BW / 2 + 0.22], rot: [0, Math.PI / 2, 0] });

  // mattress + blanket + pillow (soft silhouettes)
  const mattress = new THREE.Mesh(roundedBoxGeo(BD - 0.1, 0.19, BW - 0.08, 0.07, 6), M.fabricPale);
  mattress.position.set(bx, 0.56, bz);
  mattress.castShadow = mattress.receiveShadow = true;
  mattress.layers.set(L);
  scene.add(mattress);

  // Duvet: a displaced cloth surface (sag + fold ridges + drooping edges) with a
  // turned-back cuff at the head. Box stacks read as planks however you arrange
  // them; a displaced grid reads as fabric.
  const blanketParts = [];
  blanketParts.push(xform(softClothGeo({
    w: BD - 0.02, d: 1.34, nx: 16, nz: 30, seed: 51,
    amp: 0.02, edgeDrop: 0.075, skirt: 0.26, headBulge: 0.055, tile: 0.5,
    folds: [
      { z: -0.42, h: 0.055, sigma: 0.08 },
      { z: -0.02, h: 0.042, sigma: 0.1, x: -0.12, xs: 0.42 },
      { z: 0.3, h: 0.036, sigma: 0.09 },
      { z: 0.52, h: 0.03, sigma: 0.07, x: 0.2, xs: 0.36 },
    ],
  }), { pos: [0, 0.735, 0.42] }));
  // turned-back cuff where the sleeper's chest would be
  blanketParts.push(xform(softClothGeo({
    w: BD - 0.02, d: 0.3, nx: 14, nz: 8, seed: 77,
    amp: 0.012, edgeDrop: 0.03, skirt: 0.1, tile: 0.4,
    folds: [{ z: 0.06, h: 0.045, sigma: 0.07 }],
  }), { pos: [0, 0.775, -0.32], rot: [0.16, 0, 0] }));
  const blanket = new THREE.Mesh(mergeAll(blanketParts), M.fabricCool);
  blanket.position.set(bx, 0, bz);
  blanket.castShadow = blanket.receiveShadow = true;
  blanket.layers.set(L);
  scene.add(blanket);
  // rust-orange trim at the foot keeps the palette honest
  kit.at(L, 'fabricWarm', roundedBoxGeo(BD - 0.05, 0.05, 0.12, 0.03, 5), { pos: [bx, 0.71, bz + 0.95] });

  const pillow = new THREE.Mesh(
    mergeAll([
      xform(roundedBoxGeo(0.66, 0.16, 0.4, 0.085, 6), { pos: [0, 0.72, -0.66], rot: [0.06, 0.12, 0.04] }),
      xform(roundedBoxGeo(0.5, 0.12, 0.3, 0.07, 6), { pos: [0.02, 0.79, -0.58], rot: [0.1, -0.2, 0] }),
    ]),
    M.fabricPale,
  );
  pillow.position.set(bx, 0, bz);
  pillow.castShadow = pillow.receiveShadow = true;
  pillow.layers.set(L);
  scene.add(pillow);

  // warm strip inside the berth, under the headboard shelf
  kit.at(L, 'structure', lightHousingGeo(0.9, 0.07, 0.09), { pos: [bx, 1.2, bz - BW / 2 + 0.2], rot: [0.5, 0, 0] });
  kit.at(L, 'emissiveWarmDim', planeGeo(0.82, 0.03), { pos: [bx, 1.192, bz - BW / 2 + 0.215], rot: [0.5, 0, 0] });
  const berth = new THREE.PointLight(0xffb98a, 2.6, 2.4, 2);
  berth.position.set(bx, 1.1, bz - BW / 2 + 0.4);
  berth.layers.set(L);
  scene.add(berth);
  rig.addLight(berth, 2.6, 1.0, 0xffb98a, 0xff8040, { ref: [bx, bz], range: 7 });

  dynamic.push(mattress, blanket, pillow);
  kit.collider(bx, bz, BD + 0.1, BW + 0.1);
  interactables.push({
    id: 'bed', label: 'Sleep', meshes: [mattress, blanket, pillow],
    point: new THREE.Vector3(bx + 0.5, 0.75, bz), range: 2.6,
  });

  /* ------------------------------------------------------------ locker --- */
  const lx = R.x0 + 0.52, lz = R.z1 - 0.85;
  kit.at(L, 'hullDark', boxGeo(0.92, 1.92, 0.66, 0.7), { pos: [lx, 0.96, lz] });
  kit.at(L, 'structure', boxGeo(0.96, 0.08, 0.7, 0.4), { pos: [lx, 1.96, lz] });
  for (const sx of [-1, 1]) {
    kit.at(L, 'metal', boxGeo(0.43, 1.72, 0.03, 0.5), { pos: [lx + sx * 0.23, 0.95, lz + 0.34] });
    kit.at(L, 'metal', boxGeo(0.035, 0.28, 0.035, 0.2), { pos: [lx + sx * 0.04, 1.05, lz + 0.37] });
  }
  kit.at(L, 'metal', ventGeo(0.6, 0.26, 5, 0.035), { pos: [lx, 1.68, lz + 0.36] });
  kit.at(L, 'accent', boxGeo(0.3, 0.09, 0.02, 0.2), { pos: [lx - 0.2, 1.42, lz + 0.36] });
  kit.at(L, 'metal', greebleClusterGeo(317, 0.8, 0.3, 1.2), { pos: [lx, 2.14, lz], rot: [-Math.PI / 2, 0, 0] });
  kit.collider(lx, lz, 1.0, 0.76);

  /* -------------------------------------------------------------- desk --- */
  const dx = R.x1 - 0.78, dz = R.z0 + 1.05;
  kit.at(L, 'metal', boxGeo(1.36, 0.055, 0.62, 0.5), { pos: [dx, 0.78, dz] });
  kit.at(L, 'structure', boxGeo(0.07, 0.78, 0.54, 0.4), { pos: [dx - 0.62, 0.39, dz] });
  kit.at(L, 'structure', boxGeo(0.07, 0.78, 0.54, 0.4), { pos: [dx + 0.62, 0.39, dz] });
  kit.at(L, 'structure', boxGeo(1.3, 0.05, 0.1, 0.4), { pos: [dx, 0.3, dz - 0.2] });
  kit.at(L, 'hullDark', boxGeo(0.5, 0.5, 0.5, 0.5), { pos: [dx + 0.4, 0.27, dz] });     // drawer unit
  kit.at(L, 'metal', boxGeo(0.04, 0.03, 0.24, 0.2), { pos: [dx + 0.16, 0.36, dz] });
  kit.at(L, 'metal', boxGeo(0.04, 0.03, 0.24, 0.2), { pos: [dx + 0.16, 0.18, dz] });
  // clutter
  kit.at(L, 'metal', cylGeo(0.048, 0.045, 0.11, 12, 0.2), { pos: [dx + 0.3, 0.86, dz + 0.14] });
  kit.at(L, 'accent', cylGeo(0.042, 0.038, 0.1, 12, 0.2), { pos: [dx - 0.38, 0.86, dz - 0.08] });
  kit.at(L, 'metal', torusGeo(0.03, 0.008, 6, 14), { pos: [dx + 0.3, 0.86, dz + 0.2], rot: [0, 0, Math.PI / 2] });
  kit.at(L, 'structure', boxGeo(0.2, 0.03, 0.28, 0.3), { pos: [dx - 0.16, 0.8, dz + 0.12], rot: [0, 0.3, 0] });
  kit.at(L, 'hullDark', boxGeo(0.17, 0.04, 0.24, 0.3), { pos: [dx - 0.14, 0.83, dz + 0.1], rot: [0, 0.24, 0] });
  kit.at(L, 'metal', greebleClusterGeo(63, 0.44, 0.24, 1.3), { pos: [dx + 0.1, 0.81, dz - 0.18], rot: [-Math.PI / 2, 0, 0] });
  kit.collider(dx, dz, 1.45, 0.72);

  const deskScreen = new THREE.Mesh(planeGeo(0.46, 0.27), M.screenWave);
  deskScreen.position.set(dx - 0.02, 1.08, dz - 0.2);
  deskScreen.rotation.x = -0.16;
  deskScreen.layers.set(L);
  scene.add(deskScreen);
  dynamic.push(deskScreen);
  kit.at(L, 'structure', boxGeo(0.54, 0.34, 0.05, 0.3), { pos: [dx - 0.02, 1.08, dz - 0.23], rot: [-0.16, 0, 0] });
  kit.at(L, 'metal', cylGeo(0.03, 0.04, 0.2, 8, 0.2), { pos: [dx - 0.02, 0.86, dz - 0.24] });

  // stool
  kit.at(L, 'fabricWarm', cylGeo(0.19, 0.19, 0.08, 14, 0.3), { pos: [dx - 0.1, 0.5, dz + 0.7] });
  kit.at(L, 'metal', cylGeo(0.05, 0.06, 0.46, 8, 0.2), { pos: [dx - 0.1, 0.23, dz + 0.7] });
  kit.at(L, 'metal', torusGeo(0.14, 0.014, 6, 14), { pos: [dx - 0.1, 0.14, dz + 0.7], rot: [Math.PI / 2, 0, 0] });

  /* ------------------------------------------------- shelf + clutter --- */
  const sz2 = R.z1 - 1.9;
  kit.at(L, 'metal', boxGeo(0.28, 0.035, 1.5, 0.4), { pos: [R.x1 - 0.16, 1.5, sz2] });
  kit.at(L, 'structure', boxGeo(0.06, 0.24, 0.05, 0.2), { pos: [R.x1 - 0.05, 1.38, sz2 - 0.66] });
  kit.at(L, 'structure', boxGeo(0.06, 0.24, 0.05, 0.2), { pos: [R.x1 - 0.05, 1.38, sz2 + 0.66] });
  for (let i = 0; i < 6; i++) {
    const h = 0.16 + rnd() * 0.1;
    kit.at(L, i % 3 === 0 ? 'accent' : (i % 3 === 1 ? 'hullDark' : 'structure'),
      boxGeo(0.16 + rnd() * 0.06, h, 0.05 + rnd() * 0.05, 0.3),
      { pos: [R.x1 - 0.18, 1.52 + h / 2, sz2 - 0.6 + i * 0.22], rot: [0, 0, (rnd() - 0.5) * 0.12] });
  }
  kit.at(L, 'metal', cylGeo(0.05, 0.05, 0.13, 12, 0.2), { pos: [R.x1 - 0.2, 1.58, sz2 + 0.6] });

  // jacket on a hook
  kit.at(L, 'metal', cylGeo(0.015, 0.015, 0.1, 6, 0.1), { pos: [R.x1 - 0.06, 1.75, R.z1 - 0.5], rot: [0, 0, Math.PI / 2] });
  kit.at(L, 'fabricWarm', drapeGeo(0.42, 0.72, 5, 0.05, 9), { pos: [R.x1 - 0.14, 1.72, R.z1 - 0.5], rot: [0, -Math.PI / 2, 0] });
  // boots
  for (let i = 0; i < 2; i++) {
    kit.at(L, 'rubber', roundedBoxGeo(0.13, 0.15, 0.3, 0.04, 5), { pos: [R.x0 + 2.5 + i * 0.18, 0.08, R.z0 + 0.55], rot: [0, 0.2 - i * 0.4, 0] });
  }
  // floor mat + spare crate
  kit.at(L, 'rubber', boxGeo(1.5, 0.014, 0.95, 0.5), { pos: [cx + 0.35, 0.008, cz - 0.4], rot: [0, 0.08, 0] });
  kit.at(L, 'structure', crateGeo(0.44, 0.36, 0.4, 21), { pos: [R.x1 - 0.42, 0, R.z1 - 0.55], rot: [0, -0.2, 0] });
  kit.collider(R.x1 - 0.42, R.z1 - 0.55, 0.5, 0.46);

  // pinned notes + photos on the headboard wall
  for (let i = 0; i < 8; i++) {
    const w = 0.09 + rnd() * 0.09, h = 0.07 + rnd() * 0.09;
    kit.at(L, i % 4 === 0 ? 'accent' : 'hull', boxGeo(w, h, 0.005, 0.2),
      { pos: [R.x0 + 1.9 + rnd() * 1.9, 1.42 + rnd() * 0.5, R.z0 + 0.02], rot: [0, 0, (rnd() - 0.5) * 0.28] });
  }

  // overhead cabinet run above the desk + pinboard
  kit.at(L, 'hullDark', boxGeo(1.7, 0.62, 0.36, 0.6), { pos: [dx, 1.82, R.z0 + 0.2] });
  kit.at(L, 'structure', boxGeo(1.76, 0.07, 0.4, 0.4), { pos: [dx, 2.16, R.z0 + 0.2] });
  for (let i = 0; i < 3; i++) {
    kit.at(L, 'metal', boxGeo(0.52, 0.5, 0.03, 0.4), { pos: [dx - 0.56 + i * 0.56, 1.82, R.z0 + 0.39] });
    kit.at(L, 'metal', boxGeo(0.22, 0.03, 0.035, 0.2), { pos: [dx - 0.56 + i * 0.56, 1.62, R.z0 + 0.41] });
  }
  kit.at(L, 'accent', boxGeo(0.4, 0.06, 0.02, 0.2), { pos: [dx - 0.56, 2.05, R.z0 + 0.4] });
  kit.at(L, 'structure', boxGeo(0.9, 0.62, 0.03, 0.5), { pos: [dx - 1.5, 1.5, R.z0 + 0.03] });
  for (let i = 0; i < 6; i++) {
    kit.at(L, i % 3 === 0 ? 'accent' : 'hull', boxGeo(0.11 + rnd() * 0.08, 0.09 + rnd() * 0.07, 0.006, 0.2),
      { pos: [dx - 1.8 + rnd() * 0.62, 1.28 + rnd() * 0.44, R.z0 + 0.05], rot: [0, 0, (rnd() - 0.5) * 0.3] });
  }
  kit.at(L, 'metal', ventGeo(0.44, 0.3, 4, 0.05), { pos: [dx + 1.05, 1.5, R.z0 + 0.03] });
  kit.add(L, 'metal', pipeRunGeo([[R.x1 - 0.1, 2.2, R.z0 + 0.35], [dx - 1.9, 2.2, R.z0 + 0.35]], 0.045, 2));

  /* ------------------------------------------------------------ decals --- */
  decal(kit, L, 15, 0.46, 0.24, R.x0 + 0.01, 2.12, R.z0 + 2.4, '+x');
  decal(kit, L, 6, 0.38, 0.26, R.x1 - 0.01, 1.86, R.z1 - 1.2, '-x');
  decal(kit, L, 7, 1.2, 1.2, R.x0 + 0.01, 0.95, R.z1 - 1.6, '+x');
  decal(kit, L, 9, 0.46, 0.2, cx + 0.6, 0.016, R.z0 + 0.95, 'floor');
  decal(kit, L, 12, 0.34, 0.38, cx + 1.5, 1.62, R.z0 + 0.02, '+z');
  decal(kit, L, 5, 0.24, 0.24, R.x1 - 0.01, 2.16, R.z0 + 2.0, '-x');

  /* ------------------------------------------------------------ lights --- */
  rig.addEmissive(M.emissiveWarm, 2.3, 0.18);

  // key: bedside lamp with a real housing and a shade
  const lampX = R.x0 + 0.2, lampZ = bz - 0.72;
  kit.at(L, 'structure', boxGeo(0.12, 0.16, 0.2, 0.2), { pos: [lampX, 1.42, lampZ] });
  kit.at(L, 'metal', cylGeo(0.014, 0.014, 0.22, 6, 0.1), { pos: [lampX + 0.13, 1.42, lampZ], rot: [0, 0, Math.PI / 2] });
  kit.at(L, 'structure', cylGeo(0.09, 0.12, 0.14, 12, 0.2, true), { pos: [lampX + 0.26, 1.4, lampZ], rot: [0, 0, 1.2] });
  kit.at(L, 'emissiveWarm', planeGeo(0.13, 0.11), { pos: [lampX + 0.3, 1.36, lampZ], rot: [0, Math.PI / 2, 0] });
  const lamp = new THREE.SpotLight(0xffc190, 13, 5.6, 1.05, 0.7, 2);
  lamp.position.set(lampX + 0.34, 1.4, lampZ);
  lamp.target.position.set(R.x0 + 2.3, 0.45, bz + 0.5);
  lamp.castShadow = true;
  lamp.shadow.mapSize.set(1024, 1024);
  lamp.shadow.camera.near = 0.2;
  lamp.shadow.camera.far = 8;
  lamp.shadow.bias = -0.0009;
  lamp.shadow.normalBias = 0.03;
  lamp.layers.set(L);
  scene.add(lamp, lamp.target);
  rig.addLight(lamp, 13, 1.8, 0xffc190, 0xff7038, { ref: [lampX, lampZ], range: 7 });

  // fill: ceiling strip
  // deeper housing + dim emitter: seen edge-on from standing height this used to
  // clip to white across the top-right of the frame
  kit.at(L, 'structure', lightHousingGeo(1.0, 0.3, 0.15), { pos: [cx + 0.5, R.h - 0.04, R.z0 + 1.5], rot: [Math.PI / 2, 0, 0] });
  kit.at(L, 'emissiveWarmDim', planeGeo(0.88, 0.2), { pos: [cx + 0.5, R.h - 0.115, R.z0 + 1.5], rot: [Math.PI / 2, 0, 0] });
  const ceil = new THREE.PointLight(0xffd2ae, 4.6, 6.2, 2);
  ceil.position.set(cx + 0.5, R.h - 0.22, R.z0 + 1.5);
  ceil.layers.set(L);
  scene.add(ceil);
  rig.addLight(ceil, 4.6, 0.3, 0xffd2ae, 0xff8a3c, { ref: [cx + 0.5, R.z0 + 1.5], range: 9 });

  // ambient bounce so the room reads moody rather than black
  const bounce = new THREE.PointLight(0x7d8ea6, 2.6, 8.0, 2);
  bounce.position.set(cx, 1.7, cz);
  bounce.layers.set(L);
  scene.add(bounce);
  rig.addLight(bounce, 2.6, 0.6, 0x7d8ea6, 0x2a3a54, { ref: [cx, cz], range: 9 });

  // accent: teal under-bunk marker ticks. A continuous strip at full emissive read
  // as a green glare bar through bloom; six short segments read as fitted lighting.
  for (let i = 0; i < 6; i++) {
    const zz = bz - 0.85 + i * 0.34;
    kit.at(L, 'emissiveTealDim', planeGeo(0.16, 0.022), { pos: [bx + BD / 2 - 0.02, 0.1, zz], rot: [0, Math.PI / 2, 0] });
  }
  kit.at(L, 'structure', boxGeo(0.03, 0.05, 1.98, 0.3), { pos: [bx + BD / 2 - 0.035, 0.135, bz] });
  const under = new THREE.PointLight(PALETTE.teal, 0.85, 2.2, 2);
  under.position.set(bx + BD / 2 + 0.1, 0.22, bz);
  under.layers.set(L);
  scene.add(under);
  rig.addLight(under, 0.85, 1.3, PALETTE.teal, PALETTE.teal, { ref: [bx, bz], range: 7 });

  // cool spill through the doorway
  const spill = new THREE.PointLight(PALETTE.cool, 2.4, 3.4, 2);
  spill.position.set(R.x1 - 0.35, 1.6, -8.5);
  spill.layers.set(L);
  scene.add(spill);
  rig.addLight(spill, 2.4, 0.9, PALETTE.cool, 0x5f86c8, { ref: [R.x1 - 0.35, -8.5], range: 8 });
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
  rig.addLight(hot, 2.6, 1.6, PALETTE.accent, PALETTE.accent, { ref: [cx, R.z0 + 1.1], range: 7 });

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
  // dispense bay: recess, nozzle, drip tray, button panel, spill stains
  kit.at(L, 'structureDark', boxGeo(0.22, 0.3, 0.42, 0.3), { pos: [R.x0 + 0.58, 0.98, dz] });
  kit.at(L, 'metal', cylGeo(0.028, 0.022, 0.1, 10, 0.2), { pos: [R.x0 + 0.6, 1.09, dz] });
  kit.at(L, 'metal', boxGeo(0.16, 0.02, 0.34, 0.2), { pos: [R.x0 + 0.62, 0.845, dz] });
  kit.at(L, 'grate', planeGeo(0.14, 0.3, 0.4), { pos: [R.x0 + 0.62, 0.857, dz], rot: [-Math.PI / 2, 0, 0] });
  for (let i = 0; i < 3; i++) {
    kit.at(L, i === 1 ? 'accent' : 'metal', cylGeo(0.016, 0.016, 0.02, 8, 0.1), {
      pos: [R.x0 + 0.695, 1.24, dz - 0.12 + i * 0.12], rot: [0, 0, Math.PI / 2],
    });
  }
  kit.at(L, 'metal', greebleClusterGeo(124, 0.34, 0.22, 1.3), { pos: [R.x0 + 0.68, 1.68, dz], rot: [0, Math.PI / 2, 0] });
  // task light over the bay: the dispenser used to sit in its own shadow
  kit.at(L, 'structure', lightHousingGeo(0.5, 0.06, 0.08), { pos: [R.x0 + 0.74, 1.52, dz], rot: [0, Math.PI / 2, 0] });
  kit.at(L, 'emissiveWarmDim', planeGeo(0.4, 0.03), { pos: [R.x0 + 0.765, 1.5, dz], rot: [0, Math.PI / 2, 0] });
  const bay = new THREE.PointLight(0xffd2ae, 1.9, 2.3, 2);
  bay.position.set(R.x0 + 0.95, 1.42, dz);
  bay.layers.set(L);
  scene.add(bay);
  rig.addLight(bay, 1.9, 0.5, 0xffd2ae, 0xff9a54, { ref: [R.x0 + 0.9, dz], range: 5.5 });
  decal(kit, L, 13, 0.2, 0.16, R.x0 + 0.7, 0.72, dz + 0.22, '+x');
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

  // --- aft wall: stores. This wall is the far field of the galley frame and used
  // to be 3.7 m of bare bone panel, which is what "flat undetailed region" means.
  {
    const wz = R.z1 - 0.005;
    // horizontal stringers + skirting to break up the panel field
    for (const y of [0.95, 1.98]) {
      kit.at(L, 'structure', boxGeo(R.x1 - R.x0, 0.07, 0.05, 0.4), { pos: [(R.x0 + R.x1) / 2, y, wz - 0.03] });
    }
    kit.at(L, 'rubber', boxGeo(R.x1 - R.x0, 0.13, 0.03, 0.3), { pos: [(R.x0 + R.x1) / 2, 0.065, wz - 0.02] });
    kit.at(L, 'metal', boltRowGeo(3.3, 12, 0.014, 0.012), { pos: [(R.x0 + R.x1) / 2, 2.24, wz - 0.03], rot: [Math.PI / 2, 0, 0] });

    // Stores bank. Doors flush with their own carcass in the same material read as
    // wall panels from 2 m away — what makes a locker a locker is the shadow line
    // around a proud door and the dark hole where one is missing. So: a deep-slate
    // carcass, doors standing 50 mm off it, and the right-hand bay left open with
    // shelves and stock in it.
    const lx = 3.3, lw = 1.9;
    kit.at(L, 'hullDark', boxGeo(lw, 1.94, 0.44, 0.45), { pos: [lx, 1.03, wz - 0.22] });
    kit.at(L, 'structure', boxGeo(lw + 0.08, 0.06, 0.5, 0.3), { pos: [lx, 2.03, wz - 0.25] });
    kit.at(L, 'accent', boxGeo(lw, 0.1, 0.07, 0.2), { pos: [lx, 0.07, wz - 0.035] });
    // task strip under the cap, washing the doors and the shelf stock
    kit.at(L, 'emissiveWarmDim', planeGeo(1.7, 0.03), { pos: [lx, 1.985, wz - 0.28], rot: [Math.PI / 2, 0, 0] });
    const bank = new THREE.PointLight(0xffcfa4, 2.2, 2.3, 2);
    bank.position.set(lx, 1.92, wz - 0.34);
    bank.layers.set(L);
    scene.add(bank);
    rig.addLight(bank, 2.4, 0.5, 0xffcfa4, 0xff9a54, { ref: [lx, wz - 0.34], range: 6 });

    // left bay: 2x2 louvred doors, proud of the carcass, with pull handles
    for (let c = 0; c < 2; c++) {
      for (let r = 0; r < 2; r++) {
        const dx = 2.62 + c * 0.44, dy = 0.55 + r * 0.93;
        kit.at(L, 'structure', boxGeo(0.4, 0.86, 0.04, 0.35), { pos: [dx, dy, wz - 0.03] });
        kit.at(L, 'structureDark', ventGeo(0.31, 0.36, 6, 0.045), { pos: [dx, dy + 0.17, wz - 0.075], rot: [0, Math.PI, 0] });
        kit.at(L, 'metal', cylGeo(0.013, 0.013, 0.2, 8, 0.2), { pos: [dx + 0.15, dy - 0.14, wz - 0.095] });
        for (const hy of [-0.23, -0.05]) {
          kit.at(L, 'metal', boxGeo(0.025, 0.02, 0.05, 0.1), { pos: [dx + 0.15, dy + hy, wz - 0.072] });
        }
        kit.at(L, r ? 'metal' : 'accent', cylGeo(0.016, 0.016, 0.03, 8, 0.1), { pos: [dx - 0.13, dy - 0.3, wz - 0.062], rot: [Math.PI / 2, 0, 0] });
      }
    }

    // right bay: open shelving with the ship's dry stores on it
    kit.at(L, 'structureDark', boxGeo(0.86, 1.9, 0.02, 0.4), { pos: [3.81, 1.03, wz - 0.4] });
    kit.at(L, 'structure', boxGeo(0.07, 1.94, 0.12, 0.2), { pos: [3.38, 1.03, wz - 0.06] });
    kit.at(L, 'structure', boxGeo(0.07, 1.94, 0.12, 0.2), { pos: [4.24, 1.03, wz - 0.06] });
    const snd = mulberry32(414);
    for (let s = 0; s < 3; s++) {
      const sy = 0.42 + s * 0.52;
      kit.at(L, 'metal', boxGeo(0.82, 0.022, 0.36, 0.3), { pos: [3.81, sy, wz - 0.2] });
      kit.at(L, 'rubber', boxGeo(0.82, 0.012, 0.012, 0.2), { pos: [3.81, sy + 0.13, wz - 0.035] });
      // stock: tins, ration boxes, a bottle, a folded cloth
      let px = 3.45;
      while (px < 4.16) {
        const kind = snd();
        if (kind < 0.42) {
          const r = 0.035 + snd() * 0.014;
          kit.at(L, snd() < 0.4 ? 'accent' : 'metal', cylGeo(r, r, 0.11 + snd() * 0.05, 10, 0.2),
            { pos: [px + r, sy + 0.07, wz - 0.2 - snd() * 0.08] });
          px += r * 2 + 0.012;
        } else if (kind < 0.78) {
          const w = 0.1 + snd() * 0.06;
          kit.at(L, snd() < 0.5 ? 'hullDark' : 'structure', crateGeo(w, 0.15 + snd() * 0.06, 0.16, 500 + s * 7 + px * 13),
            { pos: [px + w / 2, sy + 0.09, wz - 0.22], rot: [0, (snd() - 0.5) * 0.2, 0] });
          px += w + 0.015;
        } else {
          kit.at(L, 'structureDark', cylGeo(0.026, 0.036, 0.19, 10, 0.2), { pos: [px + 0.04, sy + 0.11, wz - 0.21] });
          px += 0.09;
        }
      }
    }
    kit.at(L, 'fabricPale', boxGeo(0.2, 0.06, 0.24, 0.3), { pos: [4.0, 1.49, wz - 0.24], rot: [0, 0.12, 0] });
    kit.collider(lx, wz - 0.22, lw, 0.46);

    // extinguisher on a bracket, with a pinboard above it
    kit.at(L, 'accent', cylGeo(0.075, 0.075, 0.34, 14, 0.3), { pos: [2.06, 1.16, wz - 0.11] });
    kit.at(L, 'metal', cylGeo(0.028, 0.03, 0.09, 10, 0.2), { pos: [2.06, 1.37, wz - 0.11] });
    kit.at(L, 'metal', torusGeo(0.045, 0.008, 6, 14), { pos: [2.06, 1.42, wz - 0.11], rot: [0, Math.PI / 2, 0] });
    kit.at(L, 'structure', boxGeo(0.2, 0.03, 0.1, 0.2), { pos: [2.06, 0.98, wz - 0.09] });
    kit.at(L, 'structureDark', boxGeo(0.44, 0.32, 0.02, 0.3), { pos: [2.06, 1.76, wz - 0.015] });
    const pnd = mulberry32(311);
    for (let i = 0; i < 5; i++) {
      kit.at(L, 'fabricPale', boxGeo(0.09 + pnd() * 0.05, 0.11 + pnd() * 0.05, 0.004, 0.2), {
        pos: [1.9 + pnd() * 0.32, 1.66 + pnd() * 0.2, wz - 0.028], rot: [0, 0, (pnd() - 0.5) * 0.22],
      });
    }

    // coiled hose + crate stack in the corner behind the counter
    kit.at(L, 'rubber', torusGeo(0.15, 0.022, 8, 22), { pos: [4.52, 1.72, wz - 0.06], rot: [0, 0, 0] });
    kit.at(L, 'metal', cylGeo(0.02, 0.02, 0.1, 8, 0.2), { pos: [4.52, 1.9, wz - 0.09], rot: [Math.PI / 2, 0, 0] });
    kit.at(L, 'hullDark', crateGeo(0.5, 0.34, 0.44, 21), { pos: [4.6, 0.17, wz - 0.28] });
    kit.at(L, 'structure', crateGeo(0.42, 0.28, 0.38, 22), { pos: [4.55, 0.48, wz - 0.3], rot: [0, 0.16, 0] });
    kit.collider(4.6, wz - 0.29, 0.55, 0.5);
    // mop and a spare pipe leaning in the corner
    kit.at(L, 'metal', cylGeo(0.016, 0.016, 1.5, 8, 0.3), { pos: [1.52, 0.76, wz - 0.16], rot: [0.1, 0, 0.06] });
    kit.at(L, 'fabricPale', cylGeo(0.05, 0.03, 0.16, 8, 0.2), { pos: [1.6, 0.06, wz - 0.24] });
    kit.at(L, 'structure', cylGeo(0.022, 0.022, 1.3, 8, 0.3), { pos: [1.44, 0.66, wz - 0.1], rot: [-0.08, 0, 0.1] });
    // stencils on the bank
    decal(kit, L, 6, 0.3, 0.22, 2.86, 1.72, wz - 0.045, '-z');
    decal(kit, L, 0, 0.26, 0.16, 3.74, 0.86, wz - 0.045, '-z');
    decal(kit, L, 4, 0.24, 0.16, 4.86, 1.2, wz - 0.02, '-z');
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

  // --- decals
  decal(kit, L, 13, 0.36, 0.22, R.x1 - 0.01, 1.5, R.z0 + 0.6, '-x');
  decal(kit, L, 2, 0.6, 0.26, R.x0 + 0.01, 2.05, R.z0 + 2.4, '+x');
  decal(kit, L, 6, 0.4, 0.28, R.x0 + 0.01, 1.3, R.z1 - 2.2, '+x');
  decal(kit, L, 7, 1.0, 1.0, R.x1 - 0.02, 1.9, R.z1 - 1.6, '-x');

  // --- lighting
  // The ceiling fixture used to sit at x1-0.75, i.e. 0.35 m in front of the
  // overhead cabinet's face and level with its top edge: the cone hit that face
  // at point-blank range and burned a white blob into the middle of the frame.
  // Moved inboard so the cone axis passes *under* the cabinet and lands on the
  // counter, which is what a strip light over a galley run should do.
  const keyX = R.x1 - 1.62;
  const keyZ = (R.z0 + R.z1) / 2;
  kit.at(L, 'structure', lightHousingGeo(0.34, 2.6, 0.07), { pos: [keyX, R.h - 0.04, keyZ], rot: [Math.PI / 2, 0, 0] });
  kit.at(L, 'emissiveWarm', planeGeo(0.26, 2.5), { pos: [keyX, R.h - 0.07, keyZ], rot: [Math.PI / 2, 0, 0] });
  // eggcrate diffuser: 2.5 m of bare emitter is one white slab across the top of
  // the frame, and bloom makes it worse. Breaking it into cells reads as a fitting.
  for (let i = -5; i <= 5; i++) {
    kit.at(L, 'structure', boxGeo(0.27, 0.022, 0.016, 0.2), { pos: [keyX, R.h - 0.088, keyZ + i * 0.225] });
  }
  for (const dx of [-0.09, 0.09]) {
    kit.at(L, 'structure', boxGeo(0.014, 0.02, 2.46, 0.3), { pos: [keyX + dx, R.h - 0.088, keyZ] });
  }
  const key = new THREE.SpotLight(0xffc39a, 20, 7, 0.82, 0.75, 2);
  key.position.set(keyX, R.h - 0.16, (R.z0 + R.z1) / 2);
  key.target.position.set(R.x1 - 0.45, 0.92, (R.z0 + R.z1) / 2);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.near = 0.2;
  key.shadow.camera.far = 9;
  key.shadow.bias = -0.0009;
  key.shadow.normalBias = 0.03;
  key.layers.set(L);
  scene.add(key, key.target);
  rig.addLight(key, 22, 2.0, 0xffc39a, 0xff7a38, { ref: [keyX, (R.z0 + R.z1) / 2], range: 10 });

  // Under-cabinet teal strip. Its point light used to sit 0.06 m *in front of*
  // the cabinet's front face, so half of it escaped upward and washed the whole
  // ceiling teal. Tucked back under the carcass, which now shades it.
  kit.at(L, 'emissiveTealDim', planeGeo(0.03, 2.4), { pos: [cx + 0.05, 1.585, (R.z0 + R.z1) / 2], rot: [Math.PI / 2, 0, 0] });
  const strip = new THREE.PointLight(PALETTE.teal, 1.7, 2.6, 2);
  strip.position.set(cx + 0.08, 1.54, (R.z0 + R.z1) / 2);
  strip.layers.set(L);
  scene.add(strip);
  rig.addLight(strip, 2.0, 1.3, PALETTE.teal, PALETTE.teal, { ref: [cx + 0.08, (R.z0 + R.z1) / 2], range: 8 });

  const spill = new THREE.PointLight(PALETTE.cool, 2.2, 3.4, 2);
  spill.position.set(R.x0 + 0.3, 1.6, -14.5);
  spill.layers.set(L);
  scene.add(spill);
  rig.addLight(spill, 2.2, 0.7, PALETTE.cool, 0x5f86c8, { ref: [R.x0 + 0.3, -14.5], range: 8 });

  // stores light: the ceiling run stops 1.3 m short of the aft wall, so the locker
  // bank sat in the dark and all that detail was unreadable
  // Far enough off the wall that the bank's top cap doesn't block its own light —
  // at 0.6 m the cone grazed the cap and left every door in shadow.
  kit.at(L, 'structure', lightHousingGeo(0.7, 0.24, 0.08), { pos: [3.3, R.h - 0.05, R.z1 - 1.02], rot: [Math.PI / 2, 0, 0] });
  kit.at(L, 'emissiveWarmDim', planeGeo(0.6, 0.16), { pos: [3.3, R.h - 0.09, R.z1 - 1.02], rot: [Math.PI / 2, 0, 0] });
  const stores = new THREE.SpotLight(0xffd0a8, 11, 4.4, 0.95, 0.85, 2);
  stores.position.set(3.3, R.h - 0.16, R.z1 - 1.02);
  stores.target.position.set(3.3, 0.95, R.z1 - 0.12);
  stores.layers.set(L);
  scene.add(stores, stores.target);
  rig.addLight(stores, 12, 1.1, 0xffd0a8, 0xff9048, { ref: [3.3, R.z1 - 1.02], range: 6.5 });
}

/* ----------------------------------------------------------------- bathroom */

function buildBathroom(kit, rig, scene, dynamic, interactables, mirrors = []) {
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

  // Mirror: a real planar reflection. A baked cube probe (what this used to be)
  // reflects a dark room into mottled grey and reads as a slab of stone or a hole
  // in the wall — the thing that sells a mirror is recognising the room in it.
  // `Reflector` costs one 640x360 scene render, and only while the plate is in
  // frustum, i.e. only while the player is in the head. main.js clamps it to one
  // reflection render per displayed frame.
  const mirror = new Reflector(planeGeo(0.62, 0.7), {
    textureWidth: 640, textureHeight: 360, multisample: 0, clipBias: 0.004,
    shader: mirrorShader(),
  });
  mirror.position.set(sx, 1.5, R.z0 + 0.02);
  mirror.layers.set(L);
  mirror.castShadow = mirror.receiveShadow = false;
  // only the head and the corridor beyond the door can appear in this mirror, so
  // the reflection pass has no business drawing (or lighting) the rest of the ship
  mirror.userData.reflectLayers = [L, LAYER.CORRIDOR];
  scene.add(mirror);
  mirrors.push(mirror);
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
  rig.addLight(vanity, 10, 1.4, 0xdff0ff, 0x6fa8c8, { ref: [sx, R.z0 + 0.25], range: 8 });

  // --- vac toilet against the forward wall, beside the vanity
  const tx = cx + 0.55, tz = R.z0 + 0.32;
  // Lid closed. An open seat needs an inner bowl, a rim, a hinge and a propped
  // lid to look like anything but a chrome ring on a black box, and none of that
  // is worth the polygons on a prop you never use.
  kit.at(L, 'hullDark', boxGeo(0.44, 0.36, 0.5, 0.4), { pos: [tx, 0.18, tz] });
  kit.at(L, 'structure', boxGeo(0.46, 0.05, 0.52, 0.3), { pos: [tx, 0.385, tz] });
  kit.at(L, 'structure', roundedBoxGeo(0.38, 0.1, 0.42, 0.045), { pos: [tx, 0.45, tz + 0.02] });
  kit.at(L, 'metal', boxGeo(0.12, 0.03, 0.05, 0.1), { pos: [tx, 0.47, tz - 0.2] });
  kit.at(L, 'rubber', boxGeo(0.4, 0.012, 0.02, 0.2), { pos: [tx, 0.4, tz + 0.245] });
  // paper roll on a spindle bracketed to the side wall
  kit.at(L, 'metal', boxGeo(0.04, 0.06, 0.06, 0.1), { pos: [R.x1 - 0.03, 0.72, tz - 0.1] });
  kit.at(L, 'metal', cylGeo(0.009, 0.009, 0.16, 6, 0.1), { pos: [R.x1 - 0.11, 0.72, tz - 0.1], rot: [0, 0, Math.PI / 2] });
  kit.at(L, 'fabricPale', cylGeo(0.055, 0.055, 0.1, 14, 0.2), { pos: [R.x1 - 0.13, 0.72, tz - 0.1], rot: [0, 0, Math.PI / 2] });
  // flush panel + service pipe
  kit.at(L, 'structure', boxGeo(0.16, 0.12, 0.03, 0.2), { pos: [tx, 0.78, R.z0 + 0.03] });
  kit.at(L, 'accent', cylGeo(0.022, 0.022, 0.02, 10, 0.1), { pos: [tx - 0.04, 0.78, R.z0 + 0.05], rot: [Math.PI / 2, 0, 0] });
  kit.at(L, 'metal', cylGeo(0.018, 0.018, 0.02, 10, 0.1), { pos: [tx + 0.04, 0.78, R.z0 + 0.05], rot: [Math.PI / 2, 0, 0] });
  kit.add(L, 'metal', pipeRunGeo([[tx + 0.19, 0.06, tz], [tx + 0.19, 0.06, R.z0 + 0.09], [tx + 0.19, 0.72, R.z0 + 0.09]], 0.028, 3));
  kit.collider(tx, tz, 0.5, 0.56);

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

  // --- splash-back wainscot: stainless sheet to shoulder height with a nosing
  // cap and vertical battens, so the walls in frame are not one flat grey field
  {
    const a = R.z0 - T, b = R.z1 + T, fx = R.x0 + 0.012;
    kit.at(L, 'metal', boxGeo(0.012, 1.18, b - a, 0.55), { pos: [fx, 0.59, (a + b) / 2] });
    kit.at(L, 'accent', boxGeo(0.05, 0.05, b - a, 0.3), { pos: [fx + 0.014, 1.2, (a + b) / 2] });
    for (let zz = a + 0.5; zz < b; zz += 0.72) {
      kit.at(L, 'structure', boxGeo(0.022, 1.16, 0.05, 0.2), { pos: [fx + 0.014, 0.59, zz] });
    }
  }
  kit.at(L, 'metal', boxGeo(R.x1 - R.x0, 1.18, 0.012, 0.55), { pos: [cx, 0.59, R.z0 + 0.012] });
  kit.at(L, 'accent', boxGeo(R.x1 - R.x0, 0.05, 0.05, 0.3), { pos: [cx, 1.2, R.z0 + 0.026] });
  for (let xx = R.x0 + 0.42; xx < R.x1; xx += 0.72) {
    kit.at(L, 'structure', boxGeo(0.05, 1.16, 0.022, 0.2), { pos: [xx, 0.59, R.z0 + 0.026] });
  }
  // grab rail at hip height on the long wall
  kit.at(L, 'metal', handrailGeo(1.1, 0.09, 0.02), { pos: [R.x0 + 0.06, 1.02, sz + 0.35], rot: [0, Math.PI / 2, 0] });

  // upper long wall: a service cabinet, a cable tray and a filter housing, so the
  // band above the wainscot is not 1.2 m of empty paint
  kit.at(L, 'hullDark', boxGeo(0.2, 0.44, 0.56, 0.4), { pos: [R.x0 + 0.11, 1.86, sz + 0.72] });
  kit.at(L, 'structure', boxGeo(0.03, 0.4, 0.5, 0.3), { pos: [R.x0 + 0.22, 1.86, sz + 0.72] });
  kit.at(L, 'structureDark', ventGeo(0.3, 0.16, 6, 0.03), { pos: [R.x0 + 0.245, 1.92, sz + 0.72], rot: [0, Math.PI / 2, 0] });
  kit.at(L, 'metal', cylGeo(0.011, 0.011, 0.16, 6, 0.1), { pos: [R.x0 + 0.25, 1.7, sz + 0.72], rot: [Math.PI / 2, 0, 0] });
  kit.at(L, 'structure', boxGeo(0.11, 0.06, 1.5, 0.3), { pos: [R.x0 + 0.08, 2.24, sz + 0.2] });
  for (let zz = sz - 0.45; zz < sz + 0.95; zz += 0.34) {
    kit.at(L, 'metal', boxGeo(0.13, 0.03, 0.03, 0.1), { pos: [R.x0 + 0.09, 2.2, zz] });
  }
  kit.at(L, 'metal', cylGeo(0.07, 0.07, 0.26, 12, 0.3), { pos: [R.x0 + 0.16, 1.42, R.z1 - 0.35], rot: [0, 0, 0] });
  kit.at(L, 'structureDark', cylGeo(0.08, 0.08, 0.05, 12, 0.2), { pos: [R.x0 + 0.16, 1.57, R.z1 - 0.35] });
  kit.at(L, 'accent', boxGeo(0.02, 0.05, 0.16, 0.1), { pos: [R.x0 + 0.24, 1.5, R.z1 - 0.35] });

  // --- towel folded over a rail (continuous cloth, not slabs)
  const rz = sz + 0.72;
  for (const dz of [-0.2, 0.2]) {
    kit.at(L, 'metal', boxGeo(0.11, 0.02, 0.03, 0.1), { pos: [R.x0 + 0.08, 1.44, rz + dz] });
  }
  kit.at(L, 'metal', cylGeo(0.014, 0.014, 0.46, 8, 0.2), { pos: [R.x0 + 0.13, 1.44, rz], rot: [Math.PI / 2, 0, 0] });
  kit.at(L, 'fabricTowel', hangClothGeo({
    w: 0.4, h: 0.44, backH: 0.3, railR: 0.026, thickness: 0.014,
    nx: 20, pleats: 2.6, amp: 0.026, hemSag: 0.018, seed: 9, tile: 0.45,
  }), { pos: [R.x0 + 0.13, 1.44, rz], rot: [0, Math.PI / 2, 0] });
  // face cloth on a hook, bunched
  kit.at(L, 'metal', cylGeo(0.008, 0.008, 0.05, 6, 0.1), { pos: [R.x0 + 0.05, 1.3, rz + 0.44], rot: [0, 0, Math.PI / 2] });
  kit.at(L, 'fabricTowel', hangClothGeo({
    w: 0.14, h: 0.2, backH: 0.12, railR: 0.012, thickness: 0.012,
    nx: 10, pleats: 1.8, amp: 0.02, seed: 31, tile: 0.3,
  }), { pos: [R.x0 + 0.09, 1.29, rz + 0.44], rot: [0, Math.PI / 2, 0] });

  // --- soap dispenser + shelf with bottles
  kit.at(L, 'structureDark', roundedBoxGeo(0.09, 0.17, 0.08, 0.02), { pos: [R.x0 + 0.07, 1.24, sz - 0.2] });
  kit.at(L, 'metal', cylGeo(0.009, 0.009, 0.05, 8, 0.1), { pos: [R.x0 + 0.13, 1.17, sz - 0.2], rot: [0, 0, Math.PI / 2] });
  kit.at(L, 'structure', boxGeo(0.15, 0.018, 0.46, 0.2), { pos: [R.x0 + 0.1, 1.62, sz + 0.06] });
  for (const dz of [-0.19, 0.19]) {
    kit.at(L, 'metal', boxGeo(0.13, 0.05, 0.016, 0.1), { pos: [R.x0 + 0.09, 1.585, sz + 0.06 + dz] });
  }
  const brnd = mulberry32(77);
  for (let i = 0; i < 4; i++) {
    const r = 0.026 + brnd() * 0.012;
    kit.at(L, i === 1 ? 'accent' : i === 3 ? 'structureDark' : 'metal',
      cylGeo(r, r * 0.92, 0.1 + brnd() * 0.07, 10, 0.2),
      { pos: [R.x0 + 0.09 + brnd() * 0.05, 1.69, sz - 0.12 + i * 0.12] });
  }
  // wall vent + a valve stack low on the wall
  kit.at(L, 'metal', ventGeo(0.34, 0.24, 4, 0.05), { pos: [cx + 0.55, 1.95, R.z0 + 0.04] });
  kit.at(L, 'metal', torusGeo(0.07, 0.012, 6, 16), { pos: [R.x0 + 0.19, 0.52, R.z1 - 0.5], rot: [0, 0, Math.PI / 2] });
  kit.at(L, 'metal', cylGeo(0.02, 0.02, 0.1, 8, 0.2), { pos: [R.x0 + 0.14, 0.52, R.z1 - 0.5], rot: [0, 0, Math.PI / 2] });
  kit.at(L, 'structureDark', boxGeo(0.1, 0.14, 0.14, 0.2), { pos: [R.x0 + 0.07, 0.36, R.z1 - 0.5] });

  // --- shower curtain, on its track (a single gathered panel)
  kit.at(L, 'curtain', hangClothGeo({
    w: 0.82, h: 1.62, backH: 0, railR: 0, thickness: 0.01,
    nx: 26, pleats: 5.5, amp: 0.05, topAmp: 0.45, hemSag: 0.03, seed: 13, tile: 0.7,
  }), { pos: [R.x1 - 0.47, 1.98, R.z1 - 1.02] });
  hazardStrip(kit, L, R.x1 - 0.47, R.z1 - 1.05, 0.9, 0.06, 'accent');

  // --- decals
  decal(kit, L, 14, 0.22, 0.22, R.x0 + 0.03, 1.72, R.z0 + 1.5, '+x');
  decal(kit, L, 7, 0.4, 0.4, R.x1 - 0.01, 1.72, R.z0 + 2.1, '-x');
  decal(kit, L, 2, 0.3, 0.13, R.x1 - 0.01, 1.3, R.z0 + 1.1, '-x');
  decal(kit, L, 6, 0.22, 0.16, cx + 0.98, 1.42, R.z0 + 0.03, '+z');
  decal(kit, L, 9, 0.4, 0.18, (R.x0 + R.x1) / 2 - 0.5, 0.016, R.z1 - 1.6, 'floor');

  // ceiling light
  kit.at(L, 'structure', lightHousingGeo(0.32, 0.32, 0.06), { pos: [cx, R.h - 0.03, (R.z0 + R.z1) / 2], rot: [Math.PI / 2, 0, 0] });
  kit.at(L, 'emissiveCool', planeGeo(0.24, 0.24), { pos: [cx, R.h - 0.06, (R.z0 + R.z1) / 2], rot: [Math.PI / 2, 0, 0] });
  const ceil = new THREE.PointLight(0xcfe6ff, 3.0, 4.0, 2);
  ceil.position.set(cx, R.h - 0.2, (R.z0 + R.z1) / 2);
  ceil.layers.set(L);
  scene.add(ceil);
  rig.addLight(ceil, 3.4, 0.4, 0xcfe6ff, 0x5f86c8, { ref: [cx, (R.z0 + R.z1) / 2], range: 8 });

  const warm = new THREE.PointLight(PALETTE.warm, 1.6, 2.6, 2);
  warm.position.set(R.x1 - 0.4, 1.2, R.z1 - 0.9);
  warm.layers.set(L);
  scene.add(warm);
  rig.addLight(warm, 1.6, 0.3, PALETTE.warm, 0xff8a3c, { ref: [R.x1 - 0.4, R.z1 - 0.9], range: 7 });
}
