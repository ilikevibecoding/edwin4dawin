/**
 * Wall-mounted control panel: an angled bezel with an illuminated readout
 * face, a row of status lamps and a small physical keypad.
 *
 * The readout material is emissive but deliberately kept below the bloom
 * threshold so panels glow without smearing.
 */

import * as THREE from 'three';
import { metalMaterial, emissiveMaterial } from '../assets/materials';
import { controlPanelTexture } from '../assets/textures';
import { roundedBox } from '../assets/geometry';
import { Rng } from '../core/rng';

export class ControlPanel {
  readonly group = new THREE.Group();
  private lamps: THREE.MeshStandardMaterial[] = [];
  private screenMat: THREE.MeshStandardMaterial;
  private phases: number[] = [];

  constructor(seed = 'panel') {
    this.group.name = 'ControlPanel';
    const rng = new Rng(seed);
    const bezel = metalMaterial('panelBezel', '#4a4f56', 0.55, 0.6);

    const body = new THREE.Mesh(roundedBox(0.56, 0.42, 0.09, 0.02), bezel);
    this.group.add(body);

    const tex = controlPanelTexture(seed);
    this.screenMat = new THREE.MeshStandardMaterial({
      map: tex,
      emissiveMap: tex,
      emissive: new THREE.Color('#ffffff'),
      emissiveIntensity: 0.85,
      color: 0x111111,
      roughness: 0.35,
      metalness: 0,
    });
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.3), this.screenMat);
    screen.position.z = 0.047;
    screen.position.y = 0.03;
    this.group.add(screen);

    const colours = ['#6fd6ff', '#e8b657', '#7dffa8', '#ff5a4a'];
    for (let i = 0; i < 5; i++) {
      const m = emissiveMaterial(`lamp${i}`, rng.pick(colours), 1.4).clone();
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.028, 0.012), m);
      lamp.position.set(-0.2 + i * 0.1, -0.155, 0.05);
      this.group.add(lamp);
      this.lamps.push(m);
      this.phases.push(rng.range(0, Math.PI * 2));
    }
  }

  update(_dt: number, elapsed: number): void {
    for (let i = 0; i < this.lamps.length; i++) {
      const p = this.phases[i];
      this.lamps[i].emissiveIntensity = 0.4 + 1.1 * (0.5 + 0.5 * Math.sin(elapsed * (1.4 + i * 0.3) + p));
    }
    this.screenMat.emissiveIntensity = 0.78 + 0.09 * Math.sin(elapsed * 3.1);
  }
}
