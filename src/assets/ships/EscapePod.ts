import * as THREE from 'three';
import { Rng } from '../../core/Rng';
import { saturate } from '../../core/mathx';
import type { MaterialLibrary } from '../materials';
import { greebleField, loftGeometry, mergeAll, roundedRectProfile } from '../geometry';

/**
 * Escape pod - a 9 m unarmed lifeboat.
 *
 * Blunt nose, ribbed body, four retro thrusters, one blinking beacon and an
 * ablative heat shield that glows once it meets atmosphere. Local space: nose at
 * +Z, hatch on -X.
 */
export class EscapePod {
  readonly group = new THREE.Group();
  readonly anchors: Record<string, THREE.Object3D> = {};

  private thrusterHalos: THREE.Sprite[] = [];
  private beacon: THREE.Mesh;
  private beaconMat: THREE.MeshBasicMaterial;
  private beaconLight: THREE.PointLight;
  private heatShieldMat: THREE.MeshBasicMaterial;
  private heatShield: THREE.Mesh;
  private engineLevel = 0;
  private reentry = 0;

  constructor(lib: MaterialLibrary, seed = 'escape-pod') {
    const rng = new Rng(seed);
    this.group.name = 'EscapePod';
    const q = lib.qualitySettings;

    const profile = roundedRectProfile(0.55, 4);
    const bodyGeo = loftGeometry(profile, [
      { z: 4.6, sx: 1.35, sy: 1.35 },
      { z: 4.0, sx: 1.85, sy: 1.85 },
      { z: 2.0, sx: 2.15, sy: 2.15 },
      { z: -2.0, sx: 2.2, sy: 2.2 },
      { z: -3.6, sx: 2.05, sy: 2.05 },
      { z: -4.3, sx: 1.7, sy: 1.7 },
    ], true, true, new THREE.Vector2(2, 2));
    lib.registry.track(bodyGeo);
    const body = new THREE.Mesh(bodyGeo, lib.rebel.hull);
    body.castShadow = body.receiveShadow = q.shadows;
    this.group.add(body);

    // Structural ribs.
    const ribParts: THREE.BufferGeometry[] = [];
    for (const z of [3.0, 0.6, -1.8]) {
      const r = new THREE.TorusGeometry(2.28, 0.13, 6, 18);
      r.scale(1, 1, 1);
      r.translate(0, 0, z);
      ribParts.push(r);
    }
    const ribs = mergeAll(ribParts);
    if (ribs) {
      const rm = new THREE.Mesh(ribs, lib.rebel.trench);
      this.group.add(rm);
      lib.registry.track(ribs);
    }

    // Forward viewport band.
    const glassGeo = new THREE.CylinderGeometry(1.92, 1.92, 0.9, 16, 1, true);
    glassGeo.rotateX(Math.PI / 2);
    glassGeo.translate(0, 0, 3.4);
    lib.registry.track(glassGeo);
    const glass = new THREE.Mesh(glassGeo, lib.rebel.windows);
    (glass.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
    this.group.add(glass);

    // Hatch on the port face.
    const hatchGeo = new THREE.PlaneGeometry(2.4, 2.8);
    hatchGeo.rotateY(-Math.PI / 2);
    hatchGeo.translate(-2.2, 0, 0.4);
    lib.registry.track(hatchGeo);
    this.group.add(new THREE.Mesh(hatchGeo, lib.rebel.hullDark));

    // Retro thrusters.
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const x = Math.cos(a) * 1.15;
      const y = Math.sin(a) * 1.15;
      const nozzle = new THREE.CylinderGeometry(0.4, 0.5, 0.9, 10);
      nozzle.rotateX(Math.PI / 2);
      nozzle.translate(x, y, -4.5);
      lib.registry.track(nozzle);
      this.group.add(new THREE.Mesh(nozzle, lib.rebel.trench));

      const halo = new THREE.Sprite(lib.rebel.engineHalo);
      halo.position.set(x, y, -5.2);
      halo.scale.setScalar(2.6);
      halo.userData.baseScale = 2.6;
      this.group.add(halo);
      this.thrusterHalos.push(halo);
    }

    // Beacon.
    const beaconGeo = new THREE.SphereGeometry(0.22, 8, 6);
    beaconGeo.translate(0, 2.3, 1.2);
    lib.registry.track(beaconGeo);
    this.beaconMat = new THREE.MeshBasicMaterial({ color: 0xff5533, toneMapped: false });
    lib.registry.track(this.beaconMat);
    this.beacon = new THREE.Mesh(beaconGeo, this.beaconMat);
    this.group.add(this.beacon);
    this.beaconLight = new THREE.PointLight(0xff5533, 0, 40, 2);
    this.beaconLight.position.set(0, 2.6, 1.2);
    this.group.add(this.beaconLight);

    // Ablative heat shield: a cap ahead of the nose that ignites on re-entry.
    const shieldGeo = new THREE.SphereGeometry(2.6, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.42);
    shieldGeo.rotateX(Math.PI / 2);
    shieldGeo.translate(0, 0, 4.2);
    lib.registry.track(shieldGeo);
    this.heatShieldMat = new THREE.MeshBasicMaterial({
      color: 0xffb066, transparent: true, opacity: 0, toneMapped: false,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    });
    lib.registry.track(this.heatShieldMat);
    this.heatShield = new THREE.Mesh(shieldGeo, this.heatShieldMat);
    this.group.add(this.heatShield);

    const greebles = greebleField(rng.fork('pod'), {
      count: Math.round(22 * q.greebleScale),
      bounds: new THREE.Box3(new THREE.Vector3(-1.1, 0, -3), new THREE.Vector3(1.1, 0, 2.6)),
      face: '+y',
      minSize: new THREE.Vector3(0.2, 0.1, 0.2),
      maxSize: new THREE.Vector3(0.7, 0.3, 1.1),
      surface: (x) => 2.05 - Math.abs(x) * 0.25,
    });
    if (greebles) {
      this.group.add(new THREE.Mesh(greebles, lib.rebel.greeble));
      lib.registry.track(greebles);
    }

    this.addAnchor('hatch', -2.4, 0, 0.4);
    this.addAnchor('nose', 0, 0, 5);
    this.addAnchor('tail', 0, 0, -5.4);
  }

  private addAnchor(name: string, x: number, y: number, z: number): void {
    const o = new THREE.Object3D();
    o.name = `pod:${name}`;
    o.position.set(x, y, z);
    this.group.add(o);
    this.anchors[name] = o;
  }

  setEngineLevel(v: number): void {
    this.engineLevel = saturate(v);
  }

  /** 0 = vacuum, 1 = fully ablating in atmosphere. */
  setReentry(v: number): void {
    this.reentry = saturate(v);
  }

  update(t: number): void {
    const level = this.engineLevel * (0.9 + Math.sin(t * 27) * 0.1);
    for (const halo of this.thrusterHalos) {
      const base = halo.userData.baseScale as number;
      halo.scale.setScalar(base * (0.4 + level * 1.1));
      (halo.material as THREE.SpriteMaterial).opacity = level;
      halo.visible = level > 0.02;
    }
    const blink = Math.sin(t * 5.4) > 0.55 ? 1 : 0.08;
    this.beaconMat.color.setRGB(1, 0.33 * blink, 0.2 * blink);
    this.beaconLight.intensity = blink * 1.4;
    this.beacon.scale.setScalar(0.8 + blink * 0.5);

    this.heatShieldMat.opacity = this.reentry * (0.65 + Math.sin(t * 19) * 0.12);
    this.heatShieldMat.color.setRGB(1, 0.55 + this.reentry * 0.3, 0.28);
    this.heatShield.visible = this.reentry > 0.01;
    this.heatShield.scale.setScalar(1 + this.reentry * 0.35);
  }
}
