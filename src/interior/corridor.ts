/**
 * Modular blockade-runner corridor.
 *
 * A corridor is assembled from repeated 4 m sections: an arched off-white wall
 * shell with inset panels, a dark grated floor, a recessed ceiling light strip
 * and periodic structural ribs. Sections are placed along +Z from the origin,
 * so a corridor of length n occupies z ∈ [0, n·4].
 *
 * Everything shares three materials, and the ribs and wall panels are drawn
 * with instancing, so a fourteen-section corridor costs a handful of calls.
 */

import * as THREE from 'three';
import {
  corridorWallMaterial,
  corridorFloorMaterial,
  metalMaterial,
  emissiveMaterial,
  paintMaterial,
} from '../assets/materials';
import { roundedBox } from '../assets/geometry';
import { Rng } from '../core/rng';
import { ControlPanel } from './control-panel';
import type { QualitySettings } from '../core/quality';

export const SECTION_LENGTH = 4;
export const CORRIDOR_WIDTH = 3.4;
export const CORRIDOR_HEIGHT = 3.1;

/** One 4 m module. Used directly by the asset preview page. */
export class CorridorSection {
  readonly group = new THREE.Group();
  private lampMat: THREE.MeshStandardMaterial;

  constructor(quality: QualitySettings, seed = 'section', variant = 0) {
    this.group.name = 'CorridorSection';
    const rng = new Rng(seed);
    const wall = corridorWallMaterial(`wall${variant % 3}`);
    const floorMat = corridorFloorMaterial();
    const struct = metalMaterial('corridorStruct', '#8d9096', 0.5, 0.55);
    const dark = metalMaterial('corridorDark', '#41454b', 0.7, 0.5);
    this.lampMat = emissiveMaterial('corridorLamp', '#f2f6ff', 1.4).clone();

    const hw = CORRIDOR_WIDTH / 2;
    const h = CORRIDOR_HEIGHT;
    // The wall runs vertically to `wallTop`, then a quarter-round shoulder of
    // radius `shoulderR` turns it into the flat ceiling.
    const shoulderR = 0.9;
    const wallTop = h - shoulderR;
    const ceilingHalf = hw - shoulderR;

    /* floor */
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(CORRIDOR_WIDTH, SECTION_LENGTH), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.z = SECTION_LENGTH / 2;
    floor.receiveShadow = true;
    this.group.add(floor);

    // Floor edge kick-plates.
    for (const s of [-1, 1]) {
      const kick = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.22, SECTION_LENGTH), dark);
      kick.position.set(s * (hw - 0.06), 0.11, SECTION_LENGTH / 2);
      this.group.add(kick);
    }

    /* walls — vertical lower section plus a curved upper shoulder */
    for (const s of [-1, 1]) {
      const lower = new THREE.Mesh(new THREE.PlaneGeometry(SECTION_LENGTH, wallTop), wall);
      lower.rotation.y = (-s * Math.PI) / 2;
      lower.position.set(s * hw, wallTop / 2, SECTION_LENGTH / 2);
      lower.receiveShadow = true;
      this.group.add(lower);

      // Quarter-cylinder shoulder. After rotating the cylinder's axis onto −Z,
      // theta = 0 faces up and theta = ±π/2 faces ±X, so a quarter sweep from
      // vertical to horizontal is exactly what we want.
      const shoulder = new THREE.Mesh(
        new THREE.CylinderGeometry(
          shoulderR, shoulderR, SECTION_LENGTH, 12, 1, true,
          s > 0 ? 0 : -Math.PI / 2,
          Math.PI / 2,
        ),
        wall,
      );
      shoulder.rotation.x = -Math.PI / 2;
      shoulder.position.set(s * ceilingHalf, wallTop, SECTION_LENGTH / 2);
      shoulder.material = wall;
      this.group.add(shoulder);
    }

    /* ceiling */
    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(ceilingHalf * 2, SECTION_LENGTH), wall);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(0, h, SECTION_LENGTH / 2);
    this.group.add(ceiling);

    /* structural rib at the section joint */
    const ribMat = struct;
    for (const s of [-1, 1]) {
      const post = new THREE.Mesh(roundedBox(0.14, wallTop, 0.3, 0.04), ribMat);
      post.position.set(s * (hw - 0.07), wallTop / 2, 0.16);
      this.group.add(post);
    }
    const lintel = new THREE.Mesh(roundedBox(ceilingHalf * 2 + 0.2, 0.14, 0.3, 0.04), ribMat);
    lintel.position.set(0, h - 0.07, 0.16);
    this.group.add(lintel);

    /* ceiling light strip */
    const housing = new THREE.Mesh(roundedBox(0.52, 0.1, SECTION_LENGTH * 0.74, 0.03), dark);
    housing.position.set(0, h - 0.03, SECTION_LENGTH / 2);
    this.group.add(housing);
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.03, SECTION_LENGTH * 0.7), this.lampMat);
    lamp.position.set(0, h - 0.08, SECTION_LENGTH / 2);
    lamp.name = 'CeilingLamp';
    this.group.add(lamp);

    /* wall fittings — conduits, vents and the occasional readout */
    for (const s of [-1, 1]) {
      const conduit = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, SECTION_LENGTH, 6), dark);
      conduit.rotation.x = Math.PI / 2;
      conduit.position.set(s * (hw - 0.1), wallTop - 0.12, SECTION_LENGTH / 2);
      this.group.add(conduit);

      if (rng.chance(0.5)) {
        const vent = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.32, 0.7), dark);
        vent.position.set(s * (hw - 0.03), 0.5, rng.range(0.8, 3.2));
        this.group.add(vent);
      }
    }
    if (quality.level !== 'low' && rng.chance(0.45)) {
      const side = rng.chance(0.5) ? 1 : -1;
      const panel = new ControlPanel(`${seed}-cp`);
      panel.group.position.set(side * (hw - 0.06), 1.35, rng.range(1, 3));
      panel.group.rotation.y = (-side * Math.PI) / 2;
      this.group.add(panel.group);
    }

    // A faint amber floor guide strip: pure art direction, but it gives the
    // corridor a direction and helps the eye read depth.
    const guide = new THREE.Mesh(
      new THREE.PlaneGeometry(0.05, SECTION_LENGTH * 0.86),
      paintMaterial('guide', '#c98b32', 0.6, 0),
    );
    guide.rotation.x = -Math.PI / 2;
    guide.position.set(hw - 0.28, 0.012, SECTION_LENGTH / 2);
    this.group.add(guide);
  }

  setLightLevel(v: number): void {
    this.lampMat.emissiveIntensity = 1.4 * v;
  }

  update(_dt: number, _elapsed: number): void {
    /* sections are static; the corridor owner animates lighting */
  }
}

export interface CorridorOptions {
  sections: number;
  seed?: string;
  /** Adds scorch marks, buckled plates and flickering lamps. */
  battleDamage?: number;
}

/**
 * A full corridor run with lighting, alarm strobes and damage state.
 *
 * The corridor runs along +Z. `stationAt(z)` converts a distance along the
 * corridor into a floor position, which is how every character path in the
 * boarding sequence is specified.
 */
export class Corridor {
  readonly group = new THREE.Group();
  readonly length: number;
  private lampMats: THREE.MeshStandardMaterial[] = [];
  private lights: THREE.PointLight[] = [];
  private alarmLights: THREE.PointLight[] = [];
  private alarmMats: THREE.MeshStandardMaterial[] = [];
  private flickerSeeds: number[] = [];
  private damageMeshes: THREE.Object3D[] = [];

  private alarm = 0;
  private lightLevel = 1;
  private tint = new THREE.Color('#ffffff');

  constructor(quality: QualitySettings, o: CorridorOptions) {
    this.group.name = 'Corridor';
    const rng = new Rng(o.seed ?? 'corridor');
    this.length = o.sections * SECTION_LENGTH;

    for (let i = 0; i < o.sections; i++) {
      const section = new CorridorSection(quality, `${o.seed ?? 'corridor'}-${i}`, i);
      section.group.position.z = i * SECTION_LENGTH;
      this.group.add(section.group);

      const lamp = section.group.getObjectByName('CeilingLamp') as THREE.Mesh;
      if (lamp) {
        const mat = (lamp.material as THREE.MeshStandardMaterial).clone();
        lamp.material = mat;
        this.lampMats.push(mat);
        this.flickerSeeds.push(rng.next() * 100);
      }

      // One point light every other section keeps the count sane while still
      // giving the corridor pools of light and shadow.
      if (i % 2 === 0 || quality.level === 'high') {
        const light = new THREE.PointLight(0xf0f5ff, 9, 11, 2);
        light.position.set(0, CORRIDOR_HEIGHT - 0.25, i * SECTION_LENGTH + SECTION_LENGTH / 2);
        light.castShadow = quality.shadows && i % 4 === 0;
        if (light.castShadow) {
          light.shadow.mapSize.set(quality.shadowMapSize, quality.shadowMapSize);
          light.shadow.bias = -0.004;
          light.shadow.camera.far = 14;
        }
        this.group.add(light);
        this.lights.push(light);
      }
    }

    /* alarm strobes at the ends and midpoint */
    const alarmMat = emissiveMaterial('alarm', '#ff3b25', 0).clone();
    for (const z of [SECTION_LENGTH * 1.5, this.length * 0.5, this.length - SECTION_LENGTH * 1.5]) {
      for (const s of [-1, 1]) {
        const m = alarmMat.clone();
        const dome = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 6), m);
        dome.position.set(s * (CORRIDOR_WIDTH / 2 - 0.08), CORRIDOR_HEIGHT - 0.55, z);
        this.group.add(dome);
        this.alarmMats.push(m);
      }
      const l = new THREE.PointLight(0xff3b25, 0, 9, 2);
      l.position.set(0, CORRIDOR_HEIGHT - 0.6, z);
      this.group.add(l);
      this.alarmLights.push(l);
    }

    /* end caps so the camera never sees out of the world */
    const capMat = metalMaterial('corridorCap', '#5b6067', 0.6, 0.5);
    for (const z of [-0.05, this.length + 0.05]) {
      const cap = new THREE.Mesh(new THREE.PlaneGeometry(CORRIDOR_WIDTH + 0.6, CORRIDOR_HEIGHT + 0.6), capMat);
      cap.position.set(0, CORRIDOR_HEIGHT / 2, z);
      cap.rotation.y = z < 0 ? 0 : Math.PI;
      this.group.add(cap);
    }

    /* battle damage: buckled plates and hanging conduits */
    const dmg = o.battleDamage ?? 0;
    if (dmg > 0) {
      const burnt = metalMaterial('corridorBurn', '#2a2724', 0.9, 0.3);
      const count = Math.round(6 * dmg);
      for (let i = 0; i < count; i++) {
        const s = rng.chance(0.5) ? 1 : -1;
        const z = rng.range(SECTION_LENGTH, this.length - SECTION_LENGTH);
        const plate = new THREE.Mesh(roundedBox(0.08, rng.range(0.4, 0.9), rng.range(0.5, 1.1), 0.02), burnt);
        plate.position.set(s * (CORRIDOR_WIDTH / 2 - 0.06), rng.range(0.6, 2.2), z);
        plate.rotation.set(rng.range(-0.3, 0.3), rng.range(-0.4, 0.4), rng.range(-0.5, 0.5));
        this.group.add(plate);
        this.damageMeshes.push(plate);
      }
      for (let i = 0; i < Math.round(3 * dmg); i++) {
        const cable = new THREE.Mesh(
          new THREE.CylinderGeometry(0.025, 0.025, rng.range(0.5, 1.2), 5),
          metalMaterial('cable', '#20242a', 0.8, 0.3),
        );
        cable.position.set(rng.range(-1, 1), CORRIDOR_HEIGHT - 0.35, rng.range(2, this.length - 2));
        cable.rotation.set(rng.range(-0.5, 0.5), 0, rng.range(-0.5, 0.5));
        this.group.add(cable);
        this.damageMeshes.push(cable);
      }
    }
  }

  /** Floor-level world position `d` metres along the corridor. */
  stationAt(d: number, lateral = 0, height = 0): THREE.Vector3 {
    return this.group.localToWorld(new THREE.Vector3(lateral, height, d));
  }

  /** 0 = dark, 1 = full corridor lighting. */
  setLightLevel(v: number): void {
    this.lightLevel = v;
  }

  /** 0 = no alarm, 1 = full red strobe. */
  setAlarm(v: number): void {
    this.alarm = THREE.MathUtils.clamp(v, 0, 1);
  }

  /** Shifts the corridor lamps toward a colour — used for Vader's entrance. */
  setTint(hex: string, mix: number): void {
    this.tint.copy(new THREE.Color('#f0f5ff')).lerp(new THREE.Color(hex), THREE.MathUtils.clamp(mix, 0, 1));
    for (const l of this.lights) l.color.copy(this.tint);
  }

  update(_dt: number, elapsed: number): void {
    for (let i = 0; i < this.lampMats.length; i++) {
      const seed = this.flickerSeeds[i];
      // Damaged lamps stutter; healthy ones sit still.
      const stutter =
        this.alarm > 0.3 && Math.sin(elapsed * (11 + seed * 0.4) + seed) > 0.86 ? 0.25 : 1;
      this.lampMats[i].emissiveIntensity = 1.5 * this.lightLevel * stutter;
    }
    const base = 9 * this.lightLevel;
    for (const l of this.lights) l.intensity = base;

    const strobe = this.alarm * (0.5 + 0.5 * Math.sin(elapsed * 4.2));
    for (const m of this.alarmMats) m.emissiveIntensity = strobe * 5;
    for (const l of this.alarmLights) l.intensity = strobe * 7;
  }
}
