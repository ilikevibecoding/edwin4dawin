/**
 * The site.
 *
 * Lays out the operating area - command shelter, radar installation, three
 * battery pads, support vehicles, ground kit, roads, barriers, fencing and
 * lighting - collects the player colliders, and drives all the site animation
 * (array rotation, beacons, floodlights, night searchlights).
 */

import * as THREE from 'three';
import { createTerrain, terrainHeight } from './base/terrain.js';
import {
  buildCommandShelter, buildRadarStation, buildSupportTruck, buildFloodlightMast,
  buildAntennaFarm, buildSearchlight, buildConcretePad, buildRoad, buildPerimeter,
  buildBarrierRun, buildEquipmentCluster, boxCollider, cylCollider,
} from './base/structures.js';
import { BATTERIES, WORLD, QUALITY } from './config.js';
import { clamp, clamp01, lerp, damp, DEG } from './util/mathx.js';
import { Random } from './util/rng.js';
import { optimizeStatic } from './util/kit.js';

const _v = new THREE.Vector3();

export class Base {
  constructor(scene, qualityId = 'high') {
    this.scene = scene;
    this.q = QUALITY[qualityId] ?? QUALITY.high;
    this.group = new THREE.Group();
    this.group.name = 'site';
    scene.add(this.group);

    this.colliders = [];
    this.floodMasts = [];
    this.searchlights = [];
    this.spotLights = [];
    this.beacons = [];
    this.trucks = [];
    this.time = 0;
    this.searchlightActive = false;
    this.floodLevel = 0;

    this._buildTerrain();
    this._buildGround();
    this._buildShelter();
    this._buildRadar();
    this._buildSupport();
    this._buildLighting();
    this._buildPerimeter();

    // Collapse the site's static geometry into a handful of draws. Animated
    // subtrees are flagged `noMerge`; everything else is baked in place.
    // Runtime control is always via shared materials, which survive merging.
    this.mergedMeshes = optimizeStatic(this.group);
  }

  // ------------------------------------------------------------- terrain

  _buildTerrain() {
    const t = createTerrain(this.q);
    this.terrain = t;
    this.group.add(t.group);
  }

  heightAt(x, z) {
    return terrainHeight(x, z);
  }

  // -------------------------------------------------------------- ground

  _buildGround() {
    const rng = new Random(4242);

    // Battery pads
    const padSpecs = [
      { def: BATTERIES[0], w: 26, d: 22, label: 'PAD 1', sub: 'VANGUARD' },
      { def: BATTERIES[1], w: 30, d: 24, label: 'PAD 2', sub: 'HIGH LANCE' },
      { def: BATTERIES[2], w: 34, d: 34, label: 'PAD 3', sub: 'SENTINEL' },
    ];
    this.padCenters = {};
    padSpecs.forEach((spec, i) => {
      const pad = buildConcretePad(spec.w, spec.d, {
        marking: spec.label, sub: spec.sub, seed: 20 + i * 7,
      });
      pad.group.position.set(spec.def.position.x, 0, spec.def.position.z);
      pad.group.rotation.y = spec.def.heading;
      this.group.add(pad.group);
      this.padCenters[spec.def.id] = new THREE.Vector3(spec.def.position.x, 0, spec.def.position.z);
      // Pads are low enough to walk onto: no blocking collider, just support.
      this.colliders.push({
        ...pad.collider,
        x: spec.def.position.x, z: spec.def.position.z, rotY: spec.def.heading,
      });
    });

    // Radar pad and support apron
    const radarPad = buildConcretePad(20, 16, { marking: 'RDR', sub: 'ARRAY', seed: 44 });
    radarPad.group.position.set(30, 0, 4);
    radarPad.group.rotation.y = 0.3;
    this.group.add(radarPad.group);
    this.colliders.push({ ...radarPad.collider, x: 30, z: 4, rotY: 0.3 });

    const apron = buildConcretePad(34, 20, { marking: 'APRON', sub: 'SUPPORT', seed: 61, kerb: false });
    apron.group.position.set(4, 0, 26);
    this.group.add(apron.group);
    this.colliders.push({ ...apron.collider, x: 4, z: 26 });

    // Service roads
    const roads = [
      [new THREE.Vector3(0, 0, 152), new THREE.Vector3(0, 0, 96), new THREE.Vector3(2, 0, 52), new THREE.Vector3(4, 0, 30)],
      [new THREE.Vector3(4, 0, 26), new THREE.Vector3(-14, 0, 18), new THREE.Vector3(-40, 0, -6), new THREE.Vector3(-58, 0, -30)],
      [new THREE.Vector3(4, 0, 26), new THREE.Vector3(26, 0, 14), new THREE.Vector3(52, 0, -20), new THREE.Vector3(64, 0, -40)],
      [new THREE.Vector3(4, 0, 26), new THREE.Vector3(6, 0, -10), new THREE.Vector3(4, 0, -60), new THREE.Vector3(4, 0, -92)],
      [new THREE.Vector3(12, 0, 22), new THREE.Vector3(24, 0, 12), new THREE.Vector3(30, 0, 6)],
    ];
    for (const pts of roads) {
      const r = buildRoad(pts, 7.5);
      this.group.add(r.group);
    }

    // Barriers: jersey runs along the main road and HESCO around the shelter
    const barrierRuns = [
      [new THREE.Vector3(-9, 0, 44), new THREE.Vector3(-9, 0, 14), 'jersey'],
      [new THREE.Vector3(17, 0, 44), new THREE.Vector3(17, 0, 20), 'jersey'],
      [new THREE.Vector3(-36, 0, 30), new THREE.Vector3(-14, 0, 30), 'hesco'],
      [new THREE.Vector3(-36, 0, 30), new THREE.Vector3(-36, 0, 6), 'hesco'],
      [new THREE.Vector3(44, 0, 16), new THREE.Vector3(44, 0, -8), 'hesco'],
      [new THREE.Vector3(-22, 0, -78), new THREE.Vector3(26, 0, -78), 'jersey'],
    ];
    for (const [a, b, kind] of barrierRuns) {
      const run = buildBarrierRun(a, b, { height: kind === 'hesco' ? 2.1 : 1.0, kind });
      this.group.add(run.group);
      this.colliders.push(...run.colliders);
    }

    // Loose equipment clusters
    const clusterSpots = [
      [10, 22], [-6, 24], [26, 20], [-30, 12], [-52, -26], [58, -34], [10, -88], [34, 2],
    ];
    clusterSpots.forEach(([x, z], i) => {
      const c = buildEquipmentCluster(90 + i * 13);
      c.group.position.set(x, 0, z);
      c.group.rotation.y = (i * 1.37) % 6.28;
      this.group.add(c.group);
    });
  }

  // ------------------------------------------------------------- shelter

  _buildShelter() {
    const s = buildCommandShelter();
    this.shelter = s;
    s.group.position.set(-22, 0, 18);
    s.group.rotation.y = 0.12;
    this.group.add(s.group);
    // Transform shelter colliders into world space.
    const cosA = Math.cos(s.group.rotation.y), sinA = Math.sin(s.group.rotation.y);
    for (const c of s.colliders) {
      this.colliders.push({
        ...c,
        x: -22 + c.x * cosA + c.z * sinA,
        z: 18 - c.x * sinA + c.z * cosA,
        rotY: (c.rotY || 0) + s.group.rotation.y,
      });
    }
    s.group.updateWorldMatrix(true, true);
    this.consoleAnchor = s.consoleAnchor.clone().applyMatrix4(s.group.matrixWorld);
    this.doorAnchor = s.doorAnchor.clone().applyMatrix4(s.group.matrixWorld);
    this.beacons.push(s.beacon, s.doorLamp);
    this.shelterScreens = s.screens;
  }

  // --------------------------------------------------------------- radar

  _buildRadar() {
    const r = buildRadarStation();
    this.radarStation = r;
    r.group.position.set(30, 0.24, 4);
    r.group.rotation.y = 0.3;
    this.group.add(r.group);
    const cosA = Math.cos(0.3), sinA = Math.sin(0.3);
    for (const c of r.colliders) {
      this.colliders.push({
        ...c,
        x: 30 + c.x * cosA + c.z * sinA,
        z: 4 - c.x * sinA + c.z * cosA,
        rotY: (c.rotY || 0) + 0.3,
        y: 0.24,
      });
    }
    this.beacons.push(...r.arrayLamps, r.cabinLamp);
  }

  // ------------------------------------------------------------- support

  _buildSupport() {
    const truckSpecs = [
      { variant: 'cargo', x: -4, z: 31, rot: 1.9, seed: 11 },
      { variant: 'reload', x: 22, z: 24, rot: -1.2, seed: 23 },
      { variant: 'cargo', x: -44, z: -20, rot: 0.7, seed: 37 },
      { variant: 'reload', x: 52, z: -32, rot: 2.4, seed: 51 },
      { variant: 'cargo', x: 18, z: -84, rot: -0.5, seed: 67 },
    ];
    for (const spec of truckSpecs) {
      const t = buildSupportTruck({ variant: spec.variant, seed: spec.seed });
      t.group.position.set(spec.x, 0, spec.z);
      t.group.rotation.y = spec.rot;
      this.group.add(t.group);
      this.trucks.push(t);
      const cosA = Math.cos(spec.rot), sinA = Math.sin(spec.rot);
      for (const c of t.colliders) {
        this.colliders.push({
          ...c,
          x: spec.x + c.x * cosA + c.z * sinA,
          z: spec.z - c.x * sinA + c.z * cosA,
          rotY: (c.rotY || 0) + spec.rot,
        });
      }
      this.beacons.push(t.beacon);
    }

    const farm = buildAntennaFarm(3);
    farm.group.position.set(-46, 0, 34);
    farm.group.rotation.y = -0.4;
    this.group.add(farm.group);
    const cosA = Math.cos(-0.4), sinA = Math.sin(-0.4);
    for (const c of farm.colliders) {
      this.colliders.push({
        ...c,
        x: -46 + c.x * cosA + c.z * sinA,
        z: 34 - c.x * sinA + c.z * cosA,
        rotY: (c.rotY || 0) - 0.4,
      });
    }
    this.antennaFarm = farm;
    this.beacons.push(farm.lamp);
    for (const m of farm.masts) if (m.userData.tipLamp) this.beacons.push(m.userData.tipLamp);
  }

  // ------------------------------------------------------------ lighting

  _buildLighting() {
    const mastSpots = [
      [-34, 8], [32, 32], [-8, -28], [50, 2], [-68, -16], [28, -70], [-30, -56],
    ];
    mastSpots.forEach(([x, z], i) => {
      const mast = buildFloodlightMast({
        height: 9 + (i % 3) * 1.2, heads: 4,
        aim: new THREE.Vector3(x * 0.2, 0, z * 0.2),
      });
      mast.group.position.set(x, 0, z);
      mast.group.rotation.y = Math.atan2(-x, -z);
      this.group.add(mast.group);
      this.floodMasts.push(mast);
      this.colliders.push(cylCollider(x, z, 0.6, mast.height));
      this.beacons.push(mast.beacon);
    });

    // A handful of real spot lights for the masts nearest the working area.
    const litMasts = this.q.id === 'low' ? 2 : 4;
    for (let i = 0; i < Math.min(litMasts, this.floodMasts.length); i++) {
      const mast = this.floodMasts[i];
      const spot = new THREE.SpotLight(0xffeccd, 0, 190, 0.85, 0.5, 1.3);
      spot.position.set(mast.group.position.x, mast.height - 0.3, mast.group.position.z);
      const target = new THREE.Object3D();
      target.position.set(mast.group.position.x * 0.25, 0, mast.group.position.z * 0.25);
      this.group.add(target);
      spot.target = target;
      spot.castShadow = false;
      this.group.add(spot);
      this.spotLights.push(spot);
    }

    // Sweeping searchlights for the night scenario
    const slSpots = [[-52, 12], [48, 18], [-18, -64], [38, -86]];
    slSpots.forEach(([x, z], i) => {
      const sl = buildSearchlight({ height: 5.4 });
      sl.group.position.set(x, 0, z);
      this.group.add(sl.group);
      sl.phase = i * 1.9;
      sl.rate = 0.16 + i * 0.045;
      this.searchlights.push(sl);
      this.colliders.push(...sl.colliders.map((c) => ({ ...c, x, z })));
    });
  }

  _buildPerimeter() {
    const p = buildPerimeter({ radius: 152, posts: 84, gateAngle: Math.PI / 2 });
    this.group.add(p.group);
    this.colliders.push(...p.colliders);
    this.gateAnchor = p.gateAnchor;
  }

  // -------------------------------------------------------------- update

  /**
   * @param {number} dt
   * @param {object} opts { nightFactor, floodOn, searchlights, radarSweep, playerPos }
   */
  update(dt, opts = {}) {
    this.time += dt;
    const {
      nightFactor = 0, floodOn = false, searchlightsOn = false,
      radarSweep = 0, playerPos = null, alarm = false,
    } = opts;

    // Radar array: continuous rotation with the scope sweep, plus a slow nod.
    const r = this.radarStation;
    if (r) {
      r.rotator.rotation.y = -radarSweep;
      r.tilt.rotation.x = -0.42 + Math.sin(this.time * 0.25) * 0.05;
      r.dishRot.rotation.y += dt * 2.4;
      // Array face brightens as the beam "dwells".
      const pulse = 0.55 + 0.45 * Math.abs(Math.sin(this.time * 3.1));
      r.faceMat.emissiveIntensity = 0.35 + pulse * (alarm ? 0.85 : 0.35);
      r.elemMat.emissiveIntensity = 0.5 + pulse * (alarm ? 1.2 : 0.5);
    }
    if (this.shelter?.fanBlades) this.shelter.fanBlades.rotation.y += dt * 5.5;

    // Floodlights fade in for sunset/night.
    const want = floodOn ? 1 : 0;
    this.floodLevel = damp(this.floodLevel, want, 1.6, dt);
    const lit = this.floodLevel;
    for (const mast of this.floodMasts) {
      for (const head of mast.lampHeads) {
        head.userData.lensMat.emissiveIntensity = 0.15 + lit * 3.4;
      }
    }
    for (const spot of this.spotLights) spot.intensity = lit * 55;

    // Beacons blink; faster and redder when the site is on alert.
    const blinkFast = (this.time % 0.9) / 0.9 < 0.3;
    const blinkSlow = (this.time % 2.4) / 2.4 < 0.16;
    for (const b of this.beacons) {
      if (!b?.setOn) continue;
      b.setOn(alarm ? blinkFast : blinkSlow, alarm ? 1.8 : 0.9);
    }
    // Shelter interior lighting responds to darkness.
    if (this.shelter) {
      this.shelter.roomLight.intensity = 4 + nightFactor * 5;
      for (const strip of this.shelter.interiorLights) {
        strip.material.emissiveIntensity = 1.4 + nightFactor * 1.2;
      }
    }

    // Searchlights sweep the sky during the night scenario.
    this.searchlightActive = searchlightsOn;
    for (const sl of this.searchlights) {
      const on = searchlightsOn ? 1 : 0;
      sl.level = damp(sl.level ?? 0, on, 1.4, dt);
      sl.phase += dt * sl.rate;
      // Lissajous sweep keeps the beams from looking mechanically identical.
      sl.yaw.rotation.y = Math.sin(sl.phase) * 1.5 + Math.sin(sl.phase * 0.31) * 0.7;
      sl.pitch.rotation.x = -0.55 - 0.35 * Math.sin(sl.phase * 0.73 + 1.1);
      sl.spot.intensity = sl.level * 900;
      sl.lensMat.emissiveIntensity = 0.1 + sl.level * 5.5;
      sl.beamMat.uniforms.uOpacity.value = sl.level * 0.16;
      sl.beam.visible = sl.level > 0.02;
    }
  }

  /** Distance from the player to the console interaction point. */
  consoleDistance(pos) {
    return pos ? pos.distanceTo(this.consoleAnchor) : Infinity;
  }

  /** Aim the shelter's centre display at a live canvas (the radar scope). */
  bindScopeCanvas(canvas) {
    const screen = this.shelterScreens?.[1];
    if (!screen) return null;
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    screen.material.map = tex;
    screen.material.emissiveMap = tex;
    screen.material.emissiveIntensity = 1.5;
    screen.material.needsUpdate = true;
    this._scopeTexture = tex;
    return tex;
  }

  refreshScopeTexture() {
    if (this._scopeTexture) this._scopeTexture.needsUpdate = true;
  }

  /** Point a shelter display at a live texture (bound once at boot). */
  setScreenTexture(index, texture) {
    const screen = this.shelterScreens?.[index];
    if (!screen) return;
    screen.material.map = texture;
    screen.material.emissiveMap = texture;
    screen.material.emissiveIntensity = 1.4;
    screen.material.needsUpdate = true;
  }
}
