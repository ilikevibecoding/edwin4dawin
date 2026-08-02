/**
 * Escape-pod bay at the aft end of the corridor.
 *
 * A short chamber with a circular launch tube in the port wall, a lit control
 * plinth, and the pod itself seated in the tube. The tube's outer hatch opens
 * before launch, showing starfield through the aperture.
 *
 * Local space: the chamber's floor is at y = 0, the corridor arrives from −Z,
 * and the launch tube points along −X.
 */

import * as THREE from 'three';
import {
  corridorWallMaterial,
  corridorFloorMaterial,
  metalMaterial,
  emissiveMaterial,
  additiveMaterial,
} from '../assets/materials';
import { roundedBox } from '../assets/geometry';
import { glowSprite } from '../assets/textures';
import { ControlPanel } from './control-panel';
import { CORRIDOR_WIDTH, CORRIDOR_HEIGHT } from './corridor';

export const BAY_WIDTH = 7.4;
export const BAY_DEPTH = 6.2;

export class PodBay {
  readonly group = new THREE.Group();
  /** Where the pod sits before launch, and the direction it leaves. */
  readonly podSeat = new THREE.Object3D();
  readonly hatchCentre = new THREE.Object3D();
  private hatchLeaves: THREE.Mesh[] = [];
  private hatchGlow: THREE.Mesh;
  private hatchGlowMat: THREE.MeshBasicMaterial;
  private lampMats: THREE.MeshStandardMaterial[] = [];
  private warnMats: THREE.MeshStandardMaterial[] = [];
  private panel: ControlPanel;
  private lights: THREE.PointLight[] = [];
  private hatchOpen = 0;
  private alarm = 0;

  constructor() {
    this.group.name = 'PodBay';
    const wall = corridorWallMaterial('bay');
    const floorMat = corridorFloorMaterial('bayfloor');
    const struct = metalMaterial('bayStruct', '#7f838a', 0.5, 0.6);
    const dark = metalMaterial('bayDark', '#33373d', 0.7, 0.55);

    const h = CORRIDOR_HEIGHT + 0.5;
    const hw = BAY_WIDTH / 2;
    const hd = BAY_DEPTH / 2;

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(BAY_WIDTH, BAY_DEPTH), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.group.add(floor);

    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(BAY_WIDTH, BAY_DEPTH), wall);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = h;
    this.group.add(ceiling);

    // Aft wall and the two side walls; the corridor enters through −Z.
    const aft = new THREE.Mesh(new THREE.PlaneGeometry(BAY_WIDTH, h), wall);
    aft.position.set(0, h / 2, hd);
    aft.rotation.y = Math.PI;
    this.group.add(aft);

    const forward = new THREE.Mesh(new THREE.PlaneGeometry(BAY_WIDTH, h), wall);
    forward.position.set(0, h / 2, -hd);
    this.group.add(forward);
    // Doorway cut-out is faked with a dark recess where the corridor meets it.
    const doorway = new THREE.Mesh(
      new THREE.PlaneGeometry(CORRIDOR_WIDTH, CORRIDOR_HEIGHT),
      metalMaterial('bayDoorway', '#101216', 0.9, 0.2),
    );
    doorway.position.set(0, CORRIDOR_HEIGHT / 2, -hd + 0.01);
    this.group.add(doorway);
    const doorFrame = new THREE.Mesh(roundedBox(CORRIDOR_WIDTH + 0.5, CORRIDOR_HEIGHT + 0.4, 0.25, 0.05), struct);
    doorFrame.position.set(0, (CORRIDOR_HEIGHT + 0.4) / 2, -hd + 0.14);
    this.group.add(doorFrame);

    for (const s of [-1, 1]) {
      const side = new THREE.Mesh(new THREE.PlaneGeometry(BAY_DEPTH, h), wall);
      side.position.set(s * hw, h / 2, 0);
      side.rotation.y = (-s * Math.PI) / 2;
      this.group.add(side);
    }

    /* ---- launch tube in the port (−X) wall ---- */
    const tubeR = 1.75;
    const tube = new THREE.Mesh(
      new THREE.CylinderGeometry(tubeR, tubeR, 3.4, 24, 1, true),
      metalMaterial('bayTube', '#585d64', 0.55, 0.7),
    );
    tube.rotation.z = Math.PI / 2;
    tube.position.set(-hw - 1.2, 1.5, 0);
    this.group.add(tube);
    const collar = new THREE.Mesh(new THREE.TorusGeometry(tubeR + 0.12, 0.16, 8, 26), struct);
    collar.rotation.y = Math.PI / 2;
    collar.position.set(-hw + 0.05, 1.5, 0);
    this.group.add(collar);

    // Two hatch leaves that iris apart at the outer end of the tube.
    for (const s of [-1, 1]) {
      const leaf = new THREE.Mesh(
        new THREE.CylinderGeometry(tubeR, tubeR, 0.16, 24, 1, false, s > 0 ? 0 : Math.PI, Math.PI),
        metalMaterial('bayHatch', '#4a4f56', 0.5, 0.75),
      );
      leaf.rotation.z = Math.PI / 2;
      leaf.position.set(-hw - 2.85, 1.5, 0);
      this.hatchLeaves.push(leaf);
      this.group.add(leaf);
    }

    this.hatchGlowMat = additiveMaterial('bayHatchGlow', '#9ec8ff', 0, glowSprite(0.35)).clone();
    this.hatchGlowMat.opacity = 0;
    this.hatchGlow = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 5.5), this.hatchGlowMat);
    this.hatchGlow.rotation.y = -Math.PI / 2;
    this.hatchGlow.position.set(-hw - 2.9, 1.5, 0);
    this.hatchGlow.visible = false;
    this.group.add(this.hatchGlow);

    this.podSeat.position.set(-hw - 1.1, 1.5, 0);
    this.podSeat.rotation.y = -Math.PI / 2; // nose points −X, out of the tube
    this.group.add(this.podSeat);
    this.hatchCentre.position.set(-hw - 2.9, 1.5, 0);
    this.group.add(this.hatchCentre);

    /* ---- fittings ---- */
    this.panel = new ControlPanel('bay-panel');
    this.panel.group.position.set(hw - 0.08, 1.4, -0.6);
    this.panel.group.rotation.y = -Math.PI / 2;
    this.group.add(this.panel.group);

    const plinth = new THREE.Mesh(roundedBox(0.5, 1.05, 0.4, 0.05), dark);
    plinth.position.set(hw - 0.55, 0.52, 1.3);
    this.group.add(plinth);
    const plinthTop = new THREE.Mesh(roundedBox(0.55, 0.09, 0.45, 0.03), struct);
    plinthTop.position.set(hw - 0.55, 1.08, 1.3);
    plinthTop.rotation.x = -0.24;
    this.group.add(plinthTop);
    const plinthLight = new THREE.Mesh(
      new THREE.PlaneGeometry(0.34, 0.24),
      emissiveMaterial('plinthUi', '#7dc8ff', 0.9),
    );
    plinthLight.position.set(hw - 0.55, 1.14, 1.32);
    plinthLight.rotation.x = -Math.PI / 2 + 0.24;
    this.group.add(plinthLight);

    // Ceiling lights.
    for (const z of [-1.7, 1.7]) {
      const housing = new THREE.Mesh(roundedBox(2.6, 0.1, 0.42, 0.03), dark);
      housing.position.set(0, h - 0.04, z);
      this.group.add(housing);
      const m = emissiveMaterial('bayLamp', '#f2f6ff', 1.5).clone();
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.03, 0.3), m);
      lamp.position.set(0, h - 0.09, z);
      this.group.add(lamp);
      this.lampMats.push(m);
      const light = new THREE.PointLight(0xf0f5ff, 11, 12, 2);
      light.position.set(0, h - 0.3, z);
      this.group.add(light);
      this.lights.push(light);
    }

    // Launch warning beacons either side of the tube.
    for (const z of [-2.1, 2.1]) {
      const m = emissiveMaterial('bayWarn', '#ffb02a', 0.6).clone();
      const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 7), m);
      beacon.position.set(-hw + 0.25, 2.5, z);
      this.group.add(beacon);
      this.warnMats.push(m);
    }

    // Hazard chevrons on the deck in front of the tube.
    for (let i = 0; i < 4; i++) {
      const chev = new THREE.Mesh(
        new THREE.PlaneGeometry(0.9, 0.16),
        emissiveMaterial('bayChevron', '#c98b32', 0.5),
      );
      chev.rotation.x = -Math.PI / 2;
      chev.position.set(-hw + 0.9 + i * 0.55, 0.012, 0);
      this.group.add(chev);
    }
  }

  /** 0 = sealed, 1 = fully open to vacuum. */
  setHatch(v: number): void {
    this.hatchOpen = THREE.MathUtils.clamp(v, 0, 1);
  }

  setAlarm(v: number): void {
    this.alarm = THREE.MathUtils.clamp(v, 0, 1);
  }

  setLightLevel(v: number): void {
    for (const m of this.lampMats) m.emissiveIntensity = 1.5 * v;
    for (const l of this.lights) l.intensity = 11 * v;
  }

  update(dt: number, elapsed: number): void {
    this.panel.update(dt, elapsed);
    for (let i = 0; i < this.hatchLeaves.length; i++) {
      const s = i === 0 ? -1 : 1;
      this.hatchLeaves[i].position.z = s * this.hatchOpen * 2.0;
    }
    this.hatchGlow.visible = this.hatchOpen > 0.02;
    this.hatchGlowMat.opacity = this.hatchOpen * 0.22;
    const strobe = this.alarm * (Math.sin(elapsed * 6.4) > 0 ? 1 : 0.08);
    for (const m of this.warnMats) m.emissiveIntensity = 0.4 + strobe * 4.5;
  }
}
