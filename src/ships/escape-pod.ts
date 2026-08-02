/**
 * Class-C escape pod.
 *
 * A stubby, riveted lifeboat: rounded nose, banded midsection, four retro
 * thrusters, a single porthole and a ring of separation clamps. Roughly 5 m
 * long — small enough that when it drops away from the runner the scale
 * relationship is instantly readable.
 *
 * Local space: nose at −Z.
 */

import * as THREE from 'three';
import { hullMaterial, metalMaterial, emissiveMaterial, additiveMaterial, glassMaterial } from '../assets/materials';
import { loftedHull, roundedBox } from '../assets/geometry';
import { flareSprite } from '../assets/textures';

export class EscapePod {
  readonly group = new THREE.Group();
  readonly interior = new THREE.Group();
  private thrusterFlares: THREE.Mesh[] = [];
  private thrusterMat: THREE.MeshStandardMaterial;
  private clamps: THREE.Mesh[] = [];
  private reentryGlow: THREE.Mesh;
  private reentryMat: THREE.MeshBasicMaterial;
  private beacon: THREE.Mesh;
  private beaconMat: THREE.MeshStandardMaterial;
  private light: THREE.PointLight;

  private burn = 0;

  constructor(seed = 'pod') {
    this.group.name = 'EscapePod';

    const shell = hullMaterial('pod', {
      color: '#d6d3ca',
      grime: 0.6,
      scorch: 3,
      cell: 42,
      roughness: 0.66,
      metalness: 0.3,
      seed: `${seed}-shell`,
      repeat: 2,
    });
    const band = metalMaterial('podBand', '#5d6167', 0.55, 0.8);
    const dark = metalMaterial('podDark', '#33373c', 0.7, 0.6);
    this.thrusterMat = emissiveMaterial('podThruster', '#ffd9a0', 3).clone();
    this.beaconMat = emissiveMaterial('podBeacon', '#ff6a4a', 3).clone();

    // Hull: a rounded-nose capsule that flares slightly toward the stern.
    const body = new THREE.Mesh(
      loftedHull(
        5.0,
        1.35,
        (t) => {
          if (t < 0.22) return Math.sqrt(Math.max(0.02, 1 - Math.pow(1 - t / 0.22, 2))) * 0.94;
          if (t < 0.78) return 0.94 + (t - 0.22) * 0.14;
          return 1.02 - (t - 0.78) * 0.5;
        },
        18,
        26,
        1,
      ),
      shell,
    );
    body.position.z = -2.5;
    body.castShadow = true;
    this.group.add(body);

    // Reinforcing bands.
    for (const z of [-3.2, -1.4, 0.6]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.31, 0.075, 6, 20), band);
      ring.position.z = z;
      this.group.add(ring);
    }

    // Porthole.
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.07, 6, 16), band);
    rim.rotation.y = Math.PI / 2;
    rim.position.set(-1.24, 0.24, -2.4);
    this.group.add(rim);
    const glass = new THREE.Mesh(new THREE.CircleGeometry(0.42, 16), glassMaterial('podGlass', '#132836', 0.9));
    glass.rotation.y = -Math.PI / 2;
    glass.position.set(-1.27, 0.24, -2.4);
    this.group.add(glass);
    const cabinGlow = new THREE.Mesh(new THREE.CircleGeometry(0.36, 16), emissiveMaterial('podCabin', '#9fd0ff', 0.9));
    cabinGlow.rotation.y = -Math.PI / 2;
    cabinGlow.position.set(-1.22, 0.24, -2.4);
    this.group.add(cabinGlow);

    // Stern plate and four retro thrusters.
    const stern = new THREE.Mesh(new THREE.CylinderGeometry(1.18, 1.02, 0.32, 18), band);
    stern.rotation.x = Math.PI / 2;
    stern.position.z = 1.42;
    this.group.add(stern);

    const flareTex = flareSprite();
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const x = Math.cos(a) * 0.62;
      const y = Math.sin(a) * 0.62;
      const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.36, 0.5, 10), dark);
      bell.rotation.x = Math.PI / 2;
      bell.position.set(x, y, 1.68);
      this.group.add(bell);
      const core = new THREE.Mesh(new THREE.CircleGeometry(0.26, 12), this.thrusterMat);
      core.position.set(x, y, 1.95);
      this.group.add(core);
      const flare = new THREE.Mesh(
        new THREE.PlaneGeometry(2.1, 2.1),
        additiveMaterial('podFlare', '#ffc07a', 0, flareTex).clone(),
      );
      flare.position.set(x, y, 2.15);
      this.group.add(flare);
      this.thrusterFlares.push(flare);
    }

    // Separation clamps — visible while docked, retracted at launch.
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      const clamp = new THREE.Mesh(roundedBox(0.5, 0.24, 1.4, 0.06), dark);
      clamp.position.set(Math.cos(a) * 1.42, Math.sin(a) * 1.42, -1.2);
      clamp.lookAt(0, 0, -1.2);
      this.group.add(clamp);
      this.clamps.push(clamp);
    }

    // Strobe beacon.
    this.beacon = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), this.beaconMat);
    this.beacon.position.set(0, 1.3, -1.6);
    this.group.add(this.beacon);

    // Re-entry shock envelope, revealed during atmospheric descent.
    this.reentryMat = additiveMaterial('podReentry', '#ff9a44', 0, flareTex).clone();
    this.reentryMat.opacity = 0;
    this.reentryGlow = new THREE.Mesh(new THREE.SphereGeometry(2.4, 18, 12), this.reentryMat);
    this.reentryGlow.scale.set(1, 1, 1.5);
    this.reentryGlow.position.z = -1.4;
    this.reentryGlow.visible = false;
    this.group.add(this.reentryGlow);

    this.light = new THREE.PointLight(0xffc07a, 0, 60, 2);
    this.light.position.z = 3;
    this.group.add(this.light);
  }

  /** 0 = drifting, 1 = full retro burn. */
  setBurn(v: number): void {
    this.burn = THREE.MathUtils.clamp(v, 0, 1);
  }

  setClampsAttached(attached: boolean): void {
    for (const c of this.clamps) c.visible = attached;
  }

  /** 0 = vacuum, 1 = deep in the upper atmosphere. */
  setReentry(v: number): void {
    const k = THREE.MathUtils.clamp(v, 0, 1);
    this.reentryGlow.visible = k > 0.01;
    this.reentryMat.opacity = k * 0.85;
    this.reentryGlow.scale.set(1 + k * 0.5, 1 + k * 0.5, 1.5 + k * 1.6);
  }

  update(_dt: number, elapsed: number): void {
    const flicker = 0.88 + Math.sin(elapsed * 33) * 0.08 + Math.sin(elapsed * 11.4) * 0.04;
    const level = this.burn * flicker;
    this.thrusterMat.emissiveIntensity = 0.2 + level * 4.5;
    for (const f of this.thrusterFlares) {
      (f.material as THREE.MeshBasicMaterial).opacity = level * 0.9;
      f.visible = level > 0.01;
    }
    this.light.intensity = level * 70;
    const strobe = Math.sin(elapsed * 5.6) > 0.82 ? 1 : 0.06;
    this.beaconMat.emissiveIntensity = 0.4 + strobe * 5;
  }
}
