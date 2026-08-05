import * as THREE from 'three';
import { damp } from './math';

export interface ActorLightPalette {
  key: THREE.ColorRepresentation;
  keyIntensity: number;
  rim: THREE.ColorRepresentation;
  rimIntensity: number;
  fill: THREE.ColorRepresentation;
  fillIntensity: number;
  /** Which side the key comes from: -1 = camera left, +1 = camera right. */
  keySide: number;
  /** Height of the key above the subject's eye line. */
  keyHeight: number;
  /** Lateral distance of the key from the subject. */
  keySpread: number;
}

export const DEFAULT_PALETTE: ActorLightPalette = {
  key: 0xdfe9f6,
  keyIntensity: 7.5,
  rim: 0x7fd6ff,
  rimIntensity: 14,
  fill: 0x8fb2cc,
  fillIntensity: 1.1,
  keySide: -1,
  keyHeight: 1.15,
  keySpread: 1.5,
};

/**
 * A travelling three-point rig aimed at whoever the camera is on. Set lighting
 * alone leaves faces muddy in a night scene; this is the same trick a film crew
 * uses - the key follows the actor, not the room.
 */
export class ActorLightRig {
  readonly group = new THREE.Group();
  private key: THREE.SpotLight;
  private rim: THREE.SpotLight;
  private fill: THREE.PointLight;
  private target = new THREE.Vector3(0, 1.6, 0);
  private smoothTarget = new THREE.Vector3(0, 1.6, 0);
  private palette: ActorLightPalette = { ...DEFAULT_PALETTE };
  private strength = 1;
  private targetStrength = 1;

  constructor() {
    this.key = new THREE.SpotLight(DEFAULT_PALETTE.key, DEFAULT_PALETTE.keyIntensity, 9, 0.9, 0.75, 2);
    this.rim = new THREE.SpotLight(DEFAULT_PALETTE.rim, DEFAULT_PALETTE.rimIntensity, 9, 0.7, 0.85, 2);
    this.fill = new THREE.PointLight(DEFAULT_PALETTE.fill, DEFAULT_PALETTE.fillIntensity, 7, 2);
    for (const l of [this.key, this.rim]) {
      l.target.position.set(0, 1.6, 0);
      this.group.add(l, l.target);
    }
    this.group.add(this.fill);
    this.group.name = 'actorLightRig';
  }

  setPalette(p: Partial<ActorLightPalette>) {
    Object.assign(this.palette, p);
  }

  /** 0 disables the rig (used for wide establishing shots). */
  setStrength(v: number) {
    this.targetStrength = v;
  }

  lookAt(point: THREE.Vector3) {
    this.target.copy(point);
  }

  update(dt: number, camera: THREE.PerspectiveCamera) {
    this.strength = damp(this.strength, this.targetStrength, 4, dt);
    this.smoothTarget.set(
      damp(this.smoothTarget.x, this.target.x, 7, dt),
      damp(this.smoothTarget.y, this.target.y, 7, dt),
      damp(this.smoothTarget.z, this.target.z, 7, dt),
    );
    const s = this.smoothTarget;
    const axis = new THREE.Vector3().subVectors(s, camera.position);
    const dist = Math.max(0.6, axis.length());
    axis.normalize();
    const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), axis).normalize();
    const p = this.palette;

    // Key: three-quarter front, above the eye line.
    const keyPos = s
      .clone()
      .add(right.clone().multiplyScalar(p.keySpread * p.keySide))
      .add(new THREE.Vector3(0, p.keyHeight, 0))
      .add(axis.clone().multiplyScalar(-1.1));
    this.key.position.copy(keyPos);
    this.key.target.position.copy(s);
    this.key.color.set(p.key);
    this.key.intensity = p.keyIntensity * this.strength;
    this.key.distance = 8 + dist * 0.4;

    // Rim: behind and opposite the key.
    const rimPos = s
      .clone()
      .add(right.clone().multiplyScalar(-1.9 * p.keySide))
      .add(new THREE.Vector3(0, 1.5, 0))
      .add(axis.clone().multiplyScalar(2.1));
    this.rim.position.copy(rimPos);
    this.rim.target.position.copy(s);
    this.rim.color.set(p.rim);
    this.rim.intensity = p.rimIntensity * this.strength;
    this.rim.distance = 9 + dist * 0.4;

    // Fill: an eye light just off the lens.
    this.fill.position.copy(camera.position).add(new THREE.Vector3(0, 0.25, 0)).add(axis.clone().multiplyScalar(0.3));
    this.fill.color.set(p.fill);
    this.fill.intensity = p.fillIntensity * this.strength;
  }
}
