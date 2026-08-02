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

export const BAY_WIDTH = 9.0;
export const BAY_DEPTH = 6.4;
/** Centre of the launch tube, in bay-local X. */
export const TUBE_X = -7.3;
/** Where the pod sits before launch. */
export const POD_SEAT_X = -7.0;
/** Bay-local X of the tube mouth: droids board here. */
export const TUBE_MOUTH_X = -4.1;

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

    // Starboard wall is solid; the port wall is built around the tube opening
    // so the pod inside the tube is actually visible from the bay.
    const starboard = new THREE.Mesh(new THREE.PlaneGeometry(BAY_DEPTH, h), wall);
    starboard.position.set(hw, h / 2, 0);
    starboard.rotation.y = -Math.PI / 2;
    this.group.add(starboard);

    const openHalf = 1.95;
    const openY = 1.5;
    const portPanel = (width: number, height: number, y: number, z: number) => {
      const panel = new THREE.Mesh(new THREE.PlaneGeometry(width, height), wall);
      panel.position.set(-hw, y, z);
      panel.rotation.y = Math.PI / 2;
      this.group.add(panel);
    };
    const topH = h - (openY + openHalf);
    portPanel(BAY_DEPTH, topH, openY + openHalf + topH / 2, 0);
    const botH = openY - openHalf;
    if (botH > 0.01) portPanel(BAY_DEPTH, botH, botH / 2, 0);
    const sideD = BAY_DEPTH / 2 - openHalf;
    for (const s of [-1, 1]) {
      portPanel(sideD, openHalf * 2, openY, s * (openHalf + sideD / 2));
    }
    // A heavy frame around the opening.
    for (const [w, hgt, y, z] of [
      [0.3, openHalf * 2 + 0.6, openY, -openHalf - 0.15],
      [0.3, openHalf * 2 + 0.6, openY, openHalf + 0.15],
    ] as Array<[number, number, number, number]>) {
      const jamb = new THREE.Mesh(roundedBox(0.3, hgt, w, 0.05), struct);
      jamb.position.set(-hw + 0.14, y, z);
      this.group.add(jamb);
    }
    const lintel = new THREE.Mesh(roundedBox(0.3, 0.3, openHalf * 2 + 0.6, 0.05), struct);
    lintel.position.set(-hw + 0.14, openY + openHalf + 0.15, 0);
    this.group.add(lintel);

    /* ---- launch tube in the port (−X) wall ---- */
    const tubeR = 1.72;
    const tubeLen = 5.8;
    const tube = new THREE.Mesh(
      new THREE.CylinderGeometry(tubeR, tubeR, tubeLen, 26, 1, true),
      metalMaterial('bayTube', '#606670', 0.55, 0.68),
    );
    tube.rotation.z = Math.PI / 2;
    tube.position.set(TUBE_X, 1.5, 0);
    this.group.add(tube);
    // Interior ribs so the tube reads as a structure, not a pipe.
    for (let i = 0; i < 5; i++) {
      const rib = new THREE.Mesh(new THREE.TorusGeometry(tubeR - 0.02, 0.06, 5, 22), dark);
      rib.rotation.y = Math.PI / 2;
      rib.position.set(TUBE_X - tubeLen / 2 + 0.7 + i * 1.1, 1.5, 0);
      this.group.add(rib);
    }
    const collar = new THREE.Mesh(new THREE.TorusGeometry(tubeR + 0.14, 0.18, 8, 28), struct);
    collar.rotation.y = Math.PI / 2;
    collar.position.set(TUBE_MOUTH_X, 1.5, 0);
    this.group.add(collar);

    const hatchX = TUBE_X - tubeLen / 2 - 0.2;
    for (const s of [-1, 1]) {
      const leaf = new THREE.Mesh(
        new THREE.CylinderGeometry(tubeR, tubeR, 0.16, 24, 1, false, s > 0 ? 0 : Math.PI, Math.PI),
        metalMaterial('bayHatch', '#4a4f56', 0.5, 0.75),
      );
      leaf.rotation.z = Math.PI / 2;
      leaf.position.set(hatchX, 1.5, 0);
      this.hatchLeaves.push(leaf);
      this.group.add(leaf);
    }

    this.hatchGlowMat = additiveMaterial('bayHatchGlow', '#9ec8ff', 0, glowSprite(0.35)).clone();
    this.hatchGlowMat.opacity = 0;
    this.hatchGlow = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 5.5), this.hatchGlowMat);
    this.hatchGlow.rotation.y = -Math.PI / 2;
    this.hatchGlow.position.set(hatchX - 0.1, 1.5, 0);
    this.hatchGlow.visible = false;
    this.group.add(this.hatchGlow);

    // The pod's nose (local −Z) must point out of the tube, along −X.
    this.podSeat.position.set(POD_SEAT_X, 1.5, 0);
    this.podSeat.rotation.y = Math.PI / 2;
    this.group.add(this.podSeat);
    this.hatchCentre.position.set(hatchX, 1.5, 0);
    this.group.add(this.hatchCentre);

    /* ---- fittings ---- */
    this.panel = new ControlPanel('bay-panel');
    this.panel.group.position.set(hw - 0.08, 1.4, -1.4);
    this.panel.group.rotation.y = -Math.PI / 2;
    this.group.add(this.panel.group);

    const plinth = new THREE.Mesh(roundedBox(0.5, 1.05, 0.4, 0.05), dark);
    plinth.position.set(hw - 0.55, 0.52, 1.9);
    this.group.add(plinth);
    const plinthTop = new THREE.Mesh(roundedBox(0.55, 0.09, 0.45, 0.03), struct);
    plinthTop.position.set(hw - 0.55, 1.08, 1.9);
    plinthTop.rotation.x = -0.24;
    this.group.add(plinthTop);
    const plinthLight = new THREE.Mesh(
      new THREE.PlaneGeometry(0.34, 0.24),
      emissiveMaterial('plinthUi', '#7dc8ff', 0.9),
    );
    plinthLight.position.set(hw - 0.55, 1.14, 1.92);
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

    // A light inside the tube, so the pod reads instead of sitting in a void.
    const tubeLight = new THREE.PointLight(0xbcd4f0, 9, 9, 2);
    tubeLight.position.set(TUBE_X + 1.6, 1.7, 0);
    this.group.add(tubeLight);
    this.lights.push(tubeLight);

    // Launch warning beacons either side of the tube.
    for (const z of [-2.1, 2.1]) {
      const m = emissiveMaterial('bayWarn', '#ffb02a', 0.6).clone();
      const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.085, 10, 7), m);
      beacon.position.set(-hw + 0.25, 2.7, z);
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
      chev.position.set(-hw + 1.0 + i * 0.62, 0.012, 0);
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
      this.hatchLeaves[i].position.z = s * this.hatchOpen * 1.9;
    }
    this.hatchGlow.visible = this.hatchOpen > 0.02;
    this.hatchGlowMat.opacity = this.hatchOpen * 0.22;
    const strobe = this.alarm * (Math.sin(elapsed * 6.4) > 0 ? 1 : 0.08);
    for (const m of this.warnMats) m.emissiveIntensity = 0.4 + strobe * 4.5;
  }
}
