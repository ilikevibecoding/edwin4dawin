/**
 * Pressure door / blast bulkhead.
 *
 * Two leaves in a heavy frame. The door has three behaviours the timeline
 * drives directly:
 *
 *   `setOpen(t)`   — normal iris, leaves sliding apart;
 *   `setCutting(t)`— a breaching charge heats the seam: the leaves buckle,
 *                    an orange cut-line traces across them and the metal glows;
 *   `blowIn(t)`    — the leaves tear off their runners and tumble inward.
 *
 * Local space: the doorway faces ±Z, hinge line on X, floor at y = 0.
 */

import * as THREE from 'three';
import { metalMaterial, emissiveMaterial, additiveMaterial, corridorWallMaterial } from '../assets/materials';
import { roundedBox } from '../assets/geometry';
import { glowSprite } from '../assets/textures';
import { CORRIDOR_WIDTH, CORRIDOR_HEIGHT } from './corridor';
import type { QualitySettings } from '../core/quality';

export class BlastDoor {
  readonly group = new THREE.Group();
  private leaves: THREE.Group[] = [];
  private leafRest: THREE.Vector3[] = [];
  private cutMat: THREE.MeshStandardMaterial;
  private cutLine: THREE.Mesh;
  private heatMat: THREE.MeshStandardMaterial;
  private glowCard: THREE.Mesh;
  private glowMat: THREE.MeshBasicMaterial;
  private breachLight: THREE.PointLight;
  private warnMats: THREE.MeshStandardMaterial[] = [];

  private openAmount = 0;
  private cutAmount = 0;
  private blown = 0;

  constructor(_quality: QualitySettings, seed = 'door') {
    this.group.name = 'BlastDoor';

    const frameMat = metalMaterial('doorFrame', '#6f747b', 0.5, 0.7);
    const leafMat = corridorWallMaterial(`${seed}-leaf`);
    const ribMat = metalMaterial('doorRib', '#585d64', 0.55, 0.72);
    this.heatMat = new THREE.MeshStandardMaterial({
      color: '#d8d5ce',
      emissive: new THREE.Color('#ff5a12'),
      emissiveIntensity: 0,
      roughness: 0.6,
      metalness: 0.4,
    });

    const hw = CORRIDOR_WIDTH / 2;
    const h = CORRIDOR_HEIGHT;

    /* frame */
    for (const s of [-1, 1]) {
      const jamb = new THREE.Mesh(roundedBox(0.26, h, 0.42, 0.05), frameMat);
      jamb.position.set(s * (hw - 0.13), h / 2, 0);
      this.group.add(jamb);
    }
    const header = new THREE.Mesh(roundedBox(CORRIDOR_WIDTH, 0.3, 0.42, 0.05), frameMat);
    header.position.set(0, h - 0.15, 0);
    this.group.add(header);
    const sill = new THREE.Mesh(roundedBox(CORRIDOR_WIDTH, 0.06, 0.42, 0.02), ribMat);
    sill.position.set(0, 0.03, 0);
    this.group.add(sill);

    /* warning stripes on the jambs */
    for (const s of [-1, 1]) {
      const m = emissiveMaterial('doorWarn', '#e8a53a', 0.9).clone();
      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.05, h * 0.7, 0.03), m);
      strip.position.set(s * (hw - 0.28), h * 0.42, 0.21);
      this.group.add(strip);
      this.warnMats.push(m);
    }

    /* two leaves */
    const leafW = hw - 0.2;
    for (const s of [-1, 1]) {
      const leaf = new THREE.Group();
      leaf.name = `DoorLeaf${s > 0 ? 'R' : 'L'}`;
      const slab = new THREE.Mesh(roundedBox(leafW, h - 0.28, 0.18, 0.03), leafMat);
      slab.position.set(0, (h - 0.28) / 2 + 0.06, 0);
      slab.castShadow = true;
      leaf.add(slab);

      // Ribs give the leaves a heavy, engineered look.
      for (let i = 0; i < 3; i++) {
        const rib = new THREE.Mesh(roundedBox(leafW * 0.86, 0.1, 0.22, 0.02), ribMat);
        rib.position.set(0, 0.55 + i * 0.85, 0);
        leaf.add(rib);
      }
      // Inner edge plate that will glow when cut.
      const edge = new THREE.Mesh(new THREE.BoxGeometry(0.07, h - 0.34, 0.2), this.heatMat);
      edge.position.set((-s * leafW) / 2 + s * 0.035, (h - 0.28) / 2 + 0.06, 0);
      leaf.add(edge);

      leaf.position.set((s * (leafW + 0.02)) / 2, 0, 0);
      this.leafRest.push(leaf.position.clone());
      this.group.add(leaf);
      this.leaves.push(leaf);
    }

    /* cutting torch line + heat glow card */
    this.cutMat = emissiveMaterial('doorCut', '#ff7a1a', 0).clone();
    this.cutLine = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.02, 0.24), this.cutMat);
    this.cutLine.visible = false;
    this.group.add(this.cutLine);

    this.glowMat = additiveMaterial('doorGlow', '#ff8a2a', 0, glowSprite(0.3)).clone();
    this.glowMat.opacity = 0;
    this.glowCard = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 3.2), this.glowMat);
    this.glowCard.position.set(0, h * 0.5, 0.16);
    this.glowCard.visible = false;
    this.group.add(this.glowCard);

    this.breachLight = new THREE.PointLight(0xff6a20, 0, 9, 2);
    this.breachLight.position.set(0, h * 0.5, 0.4);
    this.group.add(this.breachLight);
  }

  /** 0 = sealed, 1 = fully open. */
  setOpen(v: number): void {
    this.openAmount = THREE.MathUtils.clamp(v, 0, 1);
  }

  /** 0 = intact, 1 = seam fully cut and glowing white-hot. */
  setCutting(v: number): void {
    this.cutAmount = THREE.MathUtils.clamp(v, 0, 1);
  }

  /** 0 = in place, 1 = leaves torn from their runners and tumbled inward. */
  blowIn(v: number): void {
    this.blown = THREE.MathUtils.clamp(v, 0, 1);
  }

  get isBlown(): boolean {
    return this.blown > 0.02;
  }

  update(_dt: number, elapsed: number): void {
    const h = CORRIDOR_HEIGHT;
    const leafW = CORRIDOR_WIDTH / 2 - 0.2;

    for (let i = 0; i < this.leaves.length; i++) {
      const s = i === 0 ? -1 : 1;
      const leaf = this.leaves[i];
      const rest = this.leafRest[i];

      // Shudder while the torch works, then a violent inward tumble.
      const shudder = this.cutAmount > 0.05 && this.blown < 0.02
        ? Math.sin(elapsed * 27 + i * 2.1) * 0.012 * this.cutAmount
        : 0;

      const slide = this.openAmount * (leafW + 0.1) * s;
      // Torn off the runners: the leaves tumble inward and end up flat-ish on
      // the deck, leaning against the frame rather than hovering.
      const b = this.blown;
      const blowZ = b * (2.4 + i * 0.6);
      const blowX = b * s * 0.5;
      const drop = -b * (h - 0.28) * 0.42;

      leaf.position.set(rest.x + slide + blowX + shudder, rest.y + drop, rest.z + blowZ);
      leaf.rotation.set(
        b * (1.12 + i * 0.16),
        b * s * 0.42,
        b * s * (0.22 + i * 0.14) + shudder * 0.6,
      );
    }

    // Cut line travels down the seam as the charge burns through.
    const cutting = this.cutAmount > 0.01 && this.blown < 0.02;
    this.cutLine.visible = cutting;
    if (cutting) {
      const travel = THREE.MathUtils.clamp(this.cutAmount * 1.25, 0, 1);
      this.cutLine.position.set(0, h * 0.92 - travel * (h * 0.85), 0.12);
      this.cutMat.emissiveIntensity = 6 + Math.sin(elapsed * 40) * 2;
    }

    this.heatMat.emissiveIntensity = this.blown > 0.02 ? 1.6 : this.cutAmount * 3.4;

    const glow = cutting ? this.cutAmount : this.blown > 0.02 ? Math.max(0, 1 - this.blown * 1.2) : 0;
    this.glowCard.visible = glow > 0.01;
    this.glowMat.opacity = glow * 0.55;
    this.breachLight.intensity = glow * 26;

    for (const m of this.warnMats) {
      m.emissiveIntensity = this.cutAmount > 0.05 ? (Math.sin(elapsed * 8) > 0 ? 2.6 : 0.3) : 0.9;
    }
  }
}
