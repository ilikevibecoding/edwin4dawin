/**
 * Reusable body-part geometry for the humanoid figures.
 *
 * Parts are authored so they hang from a joint at the local origin and extend
 * downward along −Y, which matches the rig in `figure.ts`.
 */

import * as THREE from 'three';
import { roundedBox } from '../assets/geometry';
import { metalMaterial, emissiveMaterial, additiveMaterial } from '../assets/materials';
import { glowSprite } from '../assets/textures';

/** A tapered limb segment hanging from the joint origin. */
export function limb(
  length: number,
  rTop: number,
  rBottom: number,
  material: THREE.Material,
  segments = 10,
): THREE.Mesh {
  const geo = new THREE.CylinderGeometry(rTop, rBottom, length, segments, 1);
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.y = -length / 2;
  mesh.castShadow = true;
  return mesh;
}

/** Rounded cap for shoulders, knees and elbows. */
export function ball(radius: number, material: THREE.Material, y = 0): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 10, 8), material);
  mesh.position.y = y;
  mesh.castShadow = true;
  return mesh;
}

/** Torso slab, centred so it grows upward from the joint. */
export function torsoBlock(
  w: number,
  h: number,
  d: number,
  material: THREE.Material,
  radius = 0.05,
): THREE.Mesh {
  const mesh = new THREE.Mesh(roundedBox(w, h, d, radius, 3), material);
  mesh.position.y = h / 2;
  mesh.castShadow = true;
  return mesh;
}

/** A boot: sole plus ankle cuff, sitting at the foot joint. */
export function boot(material: THREE.Material, scale = 1): THREE.Group {
  const g = new THREE.Group();
  const sole = new THREE.Mesh(roundedBox(0.1 * scale, 0.06 * scale, 0.25 * scale, 0.025 * scale), material);
  sole.position.set(0, 0.03 * scale, -0.045 * scale);
  sole.castShadow = true;
  g.add(sole);
  const cuff = new THREE.Mesh(roundedBox(0.095 * scale, 0.11 * scale, 0.11 * scale, 0.03 * scale), material);
  cuff.position.set(0, 0.09 * scale, 0);
  g.add(cuff);
  return g;
}

export function glove(material: THREE.Material, scale = 1): THREE.Mesh {
  const m = new THREE.Mesh(roundedBox(0.062 * scale, 0.1 * scale, 0.08 * scale, 0.028 * scale), material);
  m.position.y = -0.04 * scale;
  m.castShadow = true;
  return m;
}

/* -------------------------------------------------------------------------
   Weapons
   ------------------------------------------------------------------------- */

export interface Weapon {
  group: THREE.Group;
  muzzle: THREE.Object3D;
  flash: (on: boolean) => void;
  update: (dt: number) => void;
}

/**
 * Blaster carbine. Held in the right hand; its muzzle anchor is what the
 * bolt system spawns from, so bolts always leave the barrel.
 */
export function blasterCarbine(boltColor: string, scale = 1): Weapon {
  const g = new THREE.Group();
  g.name = 'Blaster';
  const body = metalMaterial('gunBody', '#26292e', 0.55, 0.65);
  const grip = metalMaterial('gunGrip', '#17191c', 0.8, 0.2);

  const receiver = new THREE.Mesh(roundedBox(0.05, 0.075, 0.3, 0.015), body);
  receiver.position.set(0, 0, -0.06);
  g.add(receiver);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.017, 0.24, 8), body);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.012, -0.3);
  g.add(barrel);
  const handle = new THREE.Mesh(roundedBox(0.035, 0.11, 0.05, 0.012), grip);
  handle.position.set(0, -0.075, 0.02);
  handle.rotation.x = -0.22;
  g.add(handle);
  const stock = new THREE.Mesh(roundedBox(0.035, 0.06, 0.14, 0.015), body);
  stock.position.set(0, -0.012, 0.15);
  g.add(stock);
  const sight = new THREE.Mesh(roundedBox(0.014, 0.03, 0.07, 0.006), body);
  sight.position.set(0, 0.055, -0.1);
  g.add(sight);

  const muzzle = new THREE.Object3D();
  muzzle.name = 'Muzzle';
  muzzle.position.set(0, 0.012, -0.43);
  g.add(muzzle);

  const flashMat = additiveMaterial('muzzleFlash', boltColor, 0, glowSprite(0.25)).clone();
  flashMat.opacity = 0;
  const flashCard = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.3), flashMat);
  flashCard.position.copy(muzzle.position);
  flashCard.visible = false;
  flashCard.onBeforeRender = (_r, _s, camera) => flashCard.quaternion.copy(camera.quaternion);
  g.add(flashCard);

  g.scale.setScalar(scale);

  let flashTime = 0;
  return {
    group: g,
    muzzle,
    flash: (on: boolean) => {
      if (on) flashTime = 0.06;
    },
    update: (dt: number) => {
      if (flashTime > 0) {
        flashTime -= dt;
        const k = Math.max(0, flashTime / 0.06);
        flashCard.visible = k > 0;
        flashMat.opacity = k;
        flashCard.scale.setScalar(0.7 + k * 0.9);
      } else if (flashCard.visible) {
        flashCard.visible = false;
        flashMat.opacity = 0;
      }
    },
  };
}

/** Compact sidearm for Leia and officers. */
export function blasterPistol(boltColor: string, scale = 1): Weapon {
  const g = new THREE.Group();
  g.name = 'Sidearm';
  const body = metalMaterial('pistolBody', '#2a2d33', 0.5, 0.6);
  const grip = metalMaterial('pistolGrip', '#191b1f', 0.85, 0.15);

  const receiver = new THREE.Mesh(roundedBox(0.038, 0.055, 0.14, 0.012), body);
  receiver.position.set(0, 0, -0.03);
  g.add(receiver);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.013, 0.1, 8), body);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.008, -0.13);
  g.add(barrel);
  const handle = new THREE.Mesh(roundedBox(0.03, 0.085, 0.042, 0.01), grip);
  handle.position.set(0, -0.06, 0.015);
  handle.rotation.x = -0.2;
  g.add(handle);

  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, 0.008, -0.19);
  g.add(muzzle);

  const flashMat = additiveMaterial('pistolFlash', boltColor, 0, glowSprite(0.25)).clone();
  flashMat.opacity = 0;
  const flashCard = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.2), flashMat);
  flashCard.position.copy(muzzle.position);
  flashCard.visible = false;
  flashCard.onBeforeRender = (_r, _s, camera) => flashCard.quaternion.copy(camera.quaternion);
  g.add(flashCard);

  g.scale.setScalar(scale);
  let flashTime = 0;
  return {
    group: g,
    muzzle,
    flash: (on: boolean) => {
      if (on) flashTime = 0.055;
    },
    update: (dt: number) => {
      if (flashTime > 0) {
        flashTime -= dt;
        const k = Math.max(0, flashTime / 0.055);
        flashCard.visible = k > 0;
        flashMat.opacity = k;
      } else if (flashCard.visible) {
        flashCard.visible = false;
      }
    },
  };
}

/**
 * Lightsabre hilt with a retractable blade.
 *
 * The blade is a capsule with an additive glow sleeve and a point light. It
 * stays retracted unless the timeline explicitly ignites it.
 */
export class Lightsabre {
  readonly group = new THREE.Group();
  private blade: THREE.Mesh;
  private sleeve: THREE.Mesh;
  private sleeveMat: THREE.MeshBasicMaterial;
  private coreMat: THREE.MeshStandardMaterial;
  private light: THREE.PointLight;
  private readonly bladeLength: number;
  private ignition = 0;

  constructor(color = '#ff3a2a', bladeLength = 1.05) {
    this.group.name = 'Lightsabre';
    this.bladeLength = bladeLength;
    const hiltMat = metalMaterial('hilt', '#3a3d42', 0.35, 0.9);
    const gripMat = metalMaterial('hiltGrip', '#141518', 0.9, 0.3);

    const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.021, 0.26, 12), hiltMat);
    hilt.position.y = -0.13;
    this.group.add(hilt);
    for (let i = 0; i < 4; i++) {
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.0205, 0.004, 5, 12), gripMat);
      band.rotation.x = Math.PI / 2;
      band.position.y = -0.07 - i * 0.045;
      this.group.add(band);
    }
    const emitter = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.02, 0.03, 12), gripMat);
    emitter.position.y = 0.012;
    this.group.add(emitter);

    this.coreMat = emissiveMaterial('sabreCore', '#ffd8d0', 6).clone();
    this.blade = new THREE.Mesh(new THREE.CapsuleGeometry(0.012, bladeLength, 4, 10), this.coreMat);
    this.blade.position.y = bladeLength / 2 + 0.03;
    this.group.add(this.blade);

    this.sleeveMat = additiveMaterial('sabreGlow', color, 0.75).clone();
    this.sleeve = new THREE.Mesh(new THREE.CapsuleGeometry(0.034, bladeLength, 4, 12), this.sleeveMat);
    this.sleeve.position.copy(this.blade.position);
    this.group.add(this.sleeve);

    this.light = new THREE.PointLight(new THREE.Color(color), 0, 4.5, 2);
    this.light.position.y = bladeLength * 0.5;
    this.group.add(this.light);

    this.setIgnition(0);
  }

  /** 0 = retracted, 1 = fully extended. */
  setIgnition(v: number): void {
    this.ignition = THREE.MathUtils.clamp(v, 0, 1);
    const on = this.ignition > 0.001;
    this.blade.visible = on;
    this.sleeve.visible = on;
    const l = Math.max(0.001, this.ignition);
    this.blade.scale.y = l;
    this.sleeve.scale.y = l;
    this.blade.position.y = (this.bladeLength * l) / 2 + 0.03;
    this.sleeve.position.y = this.blade.position.y;
    this.light.intensity = this.ignition * 6;
    this.light.position.y = this.bladeLength * l * 0.5;
  }

  update(_dt: number, elapsed: number): void {
    if (this.ignition <= 0.001) return;
    const hum = 1 + Math.sin(elapsed * 31) * 0.05 + Math.sin(elapsed * 17.3) * 0.03;
    this.sleeveMat.opacity = 0.72 * hum;
    this.coreMat.emissiveIntensity = 6 * hum;
    this.light.intensity = this.ignition * 6 * hum;
  }
}
