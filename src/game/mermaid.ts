import * as THREE from 'three';
import { MeshBuilder } from '../core/meshbuilder';
import { clamp01, damp } from '../core/math';
import { Ocean } from '../world/ocean';

/**
 * The mermaid: appears when a pirate is left swimming far from their ship and
 * ferries them back aboard. Both a nod to the source material and the fix for
 * the very real problem of watching your sloop sail over the horizon without you.
 */
export class Mermaid {
  readonly group = new THREE.Group();
  position = new THREE.Vector3();
  active = false;

  private glow: THREE.PointLight;
  private bob = 0;
  private strandedTime = 0;
  private material: THREE.MeshBasicMaterial;

  constructor(scene: THREE.Scene) {
    const builder = new MeshBuilder();
    const skin = 0x7fe3d0;
    const tail = 0x2f9c8e;

    builder.addBox({ x: 0, y: 0.62, z: 0 }, { x: 0.34, y: 0.5, z: 0.24 }, skin);
    builder.addBox({ x: 0, y: 0.98, z: 0 }, { x: 0.22, y: 0.24, z: 0.22 }, skin);
    // Long hair down the back.
    builder.addBox({ x: 0, y: 0.88, z: -0.16 }, { x: 0.3, y: 0.62, z: 0.12 }, 0x1f6f6a);
    // Arms, one raised in invitation.
    builder.addBox({ x: -0.26, y: 0.66, z: 0 }, { x: 0.12, y: 0.42, z: 0.12 }, skin);
    builder.addBox({ x: 0.28, y: 0.78, z: 0.12 }, { x: 0.12, y: 0.38, z: 0.12 }, skin);
    // Tail, curling out of the water.
    builder.addBox({ x: 0, y: 0.28, z: 0 }, { x: 0.3, y: 0.42, z: 0.26 }, tail);
    builder.addBox({ x: 0, y: -0.06, z: 0.1 }, { x: 0.24, y: 0.36, z: 0.22 }, tail);
    const fin = new THREE.ConeGeometry(0.34, 0.5, 5);
    builder.addGeometry(
      fin,
      tail,
      new THREE.Matrix4().compose(
        new THREE.Vector3(0, -0.32, 0.24),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(0.9, 0, 0)),
        new THREE.Vector3(1, 1, 1),
      ),
    );
    fin.dispose();

    this.material = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.92 });
    const mesh = new THREE.Mesh(builder.build(), this.material);
    this.group.add(mesh);

    this.glow = new THREE.PointLight(0x6fe8d8, 0, 14, 1);
    this.glow.position.y = 0.8;
    this.group.add(this.glow);

    this.group.visible = false;
    scene.add(this.group);
  }

  /**
   * Call every frame. `stranded` should be true while the player is swimming far
   * from their ship; the mermaid surfaces after a few seconds of that.
   */
  update(dt: number, stranded: boolean, playerPosition: THREE.Vector3, ocean: Ocean): void {
    if (stranded) this.strandedTime += dt;
    else this.strandedTime = 0;

    const shouldShow = this.strandedTime > 4;
    if (shouldShow && !this.active) {
      // Surface a short swim away, off to one side.
      const angle = Math.random() * Math.PI * 2;
      this.position.set(playerPosition.x + Math.cos(angle) * 7, 0, playerPosition.z + Math.sin(angle) * 7);
      this.active = true;
      this.group.visible = true;
    } else if (!shouldShow && this.active) {
      this.active = false;
      this.group.visible = false;
    }
    if (!this.active) {
      this.glow.intensity = 0;
      return;
    }

    // Keep her within reach as the player drifts, and bobbing on the swell.
    const toPlayer = playerPosition.clone().sub(this.position).setY(0);
    if (toPlayer.length() > 9) {
      this.position.addScaledVector(toPlayer.normalize(), dt * 2.2);
    }
    this.bob += dt * 1.4;
    const surface = ocean.waterHeight(this.position.x, this.position.z);
    this.position.y = damp(this.position.y, surface - 0.35 + Math.sin(this.bob) * 0.09, 6, dt);
    this.group.position.copy(this.position);
    this.group.rotation.y = Math.atan2(toPlayer.x, toPlayer.z) + Math.sin(this.bob * 0.6) * 0.15;
    this.glow.intensity = 5 + Math.sin(this.bob * 2.2) * 1.2;
    this.material.opacity = 0.8 + clamp01(Math.sin(this.bob * 1.7)) * 0.15;
  }

  dismiss(): void {
    this.active = false;
    this.strandedTime = 0;
    this.group.visible = false;
    this.glow.intensity = 0;
  }
}
