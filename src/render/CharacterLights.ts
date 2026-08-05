import * as THREE from 'three';
import { PALETTE } from './LookConfig';

/**
 * Portrait lighting rig for the acting area.
 *
 * Environment light alone leaves characters as flat silhouettes, which is the
 * single most common failure in a night exterior. This rig provides the three
 * sources a portrait needs — a cool key off the camera axis, a warm kicker from
 * the opposite rear quarter, and a dim bounce — aimed at head height and with a
 * short range so they model the actors without washing the whole set.
 *
 * The rig follows a target point so dialogue scenes can move it to whichever
 * pair of characters is currently playing.
 */
export interface CharacterLightOptions {
  keyColor?: number;
  kickerColor?: number;
  bounceColor?: number;
  keyIntensity?: number;
  kickerIntensity?: number;
  bounceIntensity?: number;
  /** Radius of the lit area in metres. */
  range?: number;
  /** Height above the focus point for the key. */
  keyHeight?: number;
  shadows?: boolean;
  shadowMapSize?: number;
}

export class CharacterLights {
  readonly group = new THREE.Group();
  private key: THREE.SpotLight;
  private kicker: THREE.SpotLight;
  private bounce: THREE.PointLight;
  private focus = new THREE.Vector3();
  /** Direction the key comes from, rotated per shot for variety. */
  private keyAzimuth = 0.9;

  constructor(opts: CharacterLightOptions = {}) {
    const range = opts.range ?? 7;

    this.key = new THREE.SpotLight(
      opts.keyColor ?? 0xc8dcff,
      opts.keyIntensity ?? 26,
      range,
      0.85,
      0.55,
      2
    );
    this.key.castShadow = opts.shadows ?? true;
    if (this.key.shadow) {
      const size = opts.shadowMapSize ?? 1024;
      this.key.shadow.mapSize.set(size, size);
      this.key.shadow.bias = -0.0012;
      this.key.shadow.normalBias = 0.02;
      this.key.shadow.camera.near = 0.4;
      this.key.shadow.camera.far = range * 1.5;
    }

    this.kicker = new THREE.SpotLight(
      opts.kickerColor ?? PALETTE.sodium,
      opts.kickerIntensity ?? 18,
      range,
      0.8,
      0.7,
      2
    );
    this.kicker.castShadow = false;

    this.bounce = new THREE.PointLight(opts.bounceColor ?? 0x2b4a6e, opts.bounceIntensity ?? 4, range, 2);

    this.group.add(this.key, this.key.target, this.kicker, this.kicker.target, this.bounce);
  }

  /**
   * Places the rig around a subject. `cameraPosition` is used to keep the key
   * off the camera axis, which is what gives the face modelling instead of a
   * flat, on-axis wash.
   */
  aim(subject: THREE.Vector3, cameraPosition: THREE.Vector3, opts: { keySide?: number; height?: number } = {}): void {
    this.focus.copy(subject);
    const toCamera = new THREE.Vector3().subVectors(cameraPosition, subject);
    toCamera.y = 0;
    if (toCamera.lengthSq() < 1e-6) toCamera.set(0, 0, 1);
    toCamera.normalize();
    const side = new THREE.Vector3(-toCamera.z, 0, toCamera.x);
    const keySide = opts.keySide ?? 1;

    // Key: 45 degrees off the camera axis, above the eyeline.
    const keyDir = toCamera
      .clone()
      .multiplyScalar(Math.cos(this.keyAzimuth))
      .addScaledVector(side, Math.sin(this.keyAzimuth) * keySide)
      .normalize();
    this.key.position.copy(subject).addScaledVector(keyDir, 2.6);
    this.key.position.y = subject.y + (opts.height ?? 1.4);
    this.key.target.position.copy(subject);
    this.key.target.updateMatrixWorld();

    // Kicker: behind the subject on the opposite side, low and warm.
    const kickDir = toCamera
      .clone()
      .multiplyScalar(-0.85)
      .addScaledVector(side, -0.55 * keySide)
      .normalize();
    this.kicker.position.copy(subject).addScaledVector(kickDir, 2.2);
    this.kicker.position.y = subject.y + 0.9;
    this.kicker.target.position.copy(subject);
    this.kicker.target.updateMatrixWorld();

    // Bounce: in front, below, very dim.
    this.bounce.position.copy(subject).addScaledVector(toCamera, 1.4);
    this.bounce.position.y = subject.y - 0.5;
  }

  setIntensity(scale: number): void {
    this.key.intensity = 26 * scale;
    this.kicker.intensity = 18 * scale;
    this.bounce.intensity = 4 * scale;
  }

  setColors(keyColor: number, kickerColor: number): void {
    this.key.color.set(keyColor);
    this.kicker.color.set(kickerColor);
  }

  /** Rotates the key around the subject; changes the mood between beats. */
  setKeyAzimuth(radians: number): void {
    this.keyAzimuth = radians;
  }

  get shadowCaster(): THREE.SpotLight {
    return this.key;
  }
}
