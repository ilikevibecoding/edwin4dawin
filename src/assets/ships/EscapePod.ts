import * as THREE from 'three';
import { box, cyl, merge, sphere, torus } from '../geometry';
import { darkMechanical, emissive, gunmetal, rebelHull, rebelHullDark } from '../materials';
import { softDiscMap } from '../textures';
import { EngineBank } from './engines';
import { makeAnchor } from './StarDestroyer';
import { clamp01 } from '../../core/math';

const _flareWorld = new THREE.Vector3();
const _camWorld = new THREE.Vector3();

/**
 * Class-6 style escape pod: a stubby white cylinder with a blunt nose, three
 * clamp lugs and a small thruster ring. Roughly 7 m long so it reads as tiny
 * beside the runner and vanishingly small beside the destroyer.
 */
export class EscapePod {
  readonly root = new THREE.Group();
  readonly length: number;
  readonly engines: EngineBank;
  readonly anchors: Record<string, THREE.Object3D> = {};

  private clamps: THREE.Mesh;
  private beacon: THREE.Mesh;
  private beaconLight: THREE.PointLight;
  private heatShield: THREE.Mesh;
  private reentryGlow: THREE.Mesh;
  private flare: THREE.Sprite;
  private trail: THREE.Mesh;
  private reentry = 0;

  constructor(length = 7) {
    const L = (this.length = length);
    const R = L * 0.26;
    this.root.name = 'EscapePod';

    const bodyParts: THREE.BufferGeometry[] = [
      cyl(R, R * 1.02, L * 0.62, 16, { pos: [0, 0, 0], rot: [Math.PI / 2, 0, 0] }),
      sphere(R * 1.01, 16, 10, { pos: [0, 0, L * 0.31], scale: [1, 1, 0.66] }),
      cyl(R * 1.02, R * 0.86, L * 0.16, 16, { pos: [0, 0, -L * 0.39], rot: [Math.PI / 2, 0, 0] }),
    ];
    const body = new THREE.Mesh(merge(bodyParts), rebelHull());
    body.name = 'Pod_Body';
    body.castShadow = true;
    body.receiveShadow = true;
    this.root.add(body);

    // Reinforcing bands and dark equipment strip.
    const bands = new THREE.Mesh(
      merge([
        torus(R * 1.03, R * 0.05, { pos: [0, 0, L * 0.18] }, 6, 20),
        torus(R * 1.03, R * 0.05, { pos: [0, 0, -L * 0.1] }, 6, 20),
        box(R * 0.5, R * 0.16, L * 0.5, { pos: [0, R * 0.98, 0] }),
        box(R * 0.34, R * 0.12, L * 0.36, { pos: [0, -R * 0.98, -L * 0.02] }),
      ]),
      rebelHullDark(),
    );
    this.root.add(bands);

    // Forward viewport band.
    const glass = new THREE.Mesh(
      merge([
        box(R * 0.86, R * 0.3, L * 0.02, { pos: [0, R * 0.26, L * 0.435] }),
        box(R * 0.26, R * 0.26, L * 0.02, { pos: [R * 0.72, R * 0.1, L * 0.33] }),
        box(R * 0.26, R * 0.26, L * 0.02, { pos: [-R * 0.72, R * 0.1, L * 0.33] }),
      ]),
      emissive('podGlass', 0x9fd0ff, 1.1),
    );
    this.root.add(glass);

    // Docking clamp lugs — released at launch.
    this.clamps = new THREE.Mesh(
      merge([
        box(R * 0.3, R * 0.5, R * 0.4, { pos: [R * 0.95, R * 0.4, L * 0.12] }),
        box(R * 0.3, R * 0.5, R * 0.4, { pos: [-R * 0.95, R * 0.4, L * 0.12] }),
        box(R * 0.3, R * 0.5, R * 0.4, { pos: [0, R * 1.05, -L * 0.2] }),
      ]),
      gunmetal(),
    );
    this.root.add(this.clamps);

    // Blunt ablative shield on the nose.
    this.heatShield = new THREE.Mesh(
      new THREE.SphereGeometry(R * 1.06, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.42),
      new THREE.MeshStandardMaterial({ color: 0x4a4642, roughness: 0.95, metalness: 0.08 }),
    );
    this.heatShield.rotation.x = Math.PI / 2;
    this.heatShield.position.z = L * 0.3;
    this.heatShield.scale.set(1, 1, 0.7);
    this.root.add(this.heatShield);

    this.reentryGlow = new THREE.Mesh(
      new THREE.SphereGeometry(R * 1.5, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.55),
      new THREE.MeshBasicMaterial({
        color: 0xff9a4a,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
        toneMapped: false,
      }),
    );
    this.reentryGlow.rotation.x = Math.PI / 2;
    this.reentryGlow.position.z = L * 0.3;
    this.reentryGlow.scale.set(1, 1, 1.4);
    this.root.add(this.reentryGlow);

    // Thruster cluster.
    const nozzles = [
      { x: 0, y: 0, radius: R * 0.28 },
      { x: R * 0.52, y: R * 0.3, radius: R * 0.16 },
      { x: -R * 0.52, y: R * 0.3, radius: R * 0.16 },
      { x: 0, y: -R * 0.55, radius: R * 0.16 },
    ];
    const rims = new THREE.Mesh(
      merge(
        nozzles.map((n) =>
          cyl(n.radius * 1.25, n.radius * 1.3, L * 0.04, 10, {
            pos: [n.x, n.y, -L * 0.44],
            rot: [Math.PI / 2, 0, 0],
          }),
        ),
      ),
      darkMechanical(),
    );
    this.root.add(rims);

    this.engines = new EngineBank({
      nozzles,
      z: -L * 0.46,
      color: 0xa8dcff,
      coreColor: 0xffffff,
      plume: 6,
      haloScale: 4.6,
      light: { intensity: 3, distance: L * 6, color: 0xa8dcff },
      emissiveKey: 'podEngine',
    });
    this.engines.throttle = 0;
    this.root.add(this.engines.root);

    // Locator beacon.
    this.beacon = new THREE.Mesh(
      sphere(R * 0.11, 8, 6, { pos: [0, R * 1.12, L * 0.02] }),
      emissive('podBeacon', 0xff6a4a, 3),
    );
    this.root.add(this.beacon);
    this.beaconLight = new THREE.PointLight(0xff6a4a, 0, L * 3, 2);
    this.beaconLight.position.set(0, R * 1.3, L * 0.02);
    this.root.add(this.beaconLight);

    // Long-range readability. At the end of the show the pod is a 7 m object
    // two kilometres away: without a screen-space-anchored flare and a trail it
    // is literally two pixels, and the closing image has no subject.
    this.flare = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: softDiscMap(),
        color: 0xffd7a8,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: false,
        toneMapped: false,
      }),
    );
    this.flare.renderOrder = 6;
    this.root.add(this.flare);

    this.trail = new THREE.Mesh(
      new THREE.ConeGeometry(1, 1, 12, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0xff9040,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
        toneMapped: false,
      }),
    );
    // Cone apex forward (+Z, the direction of travel), skirt trailing aft.
    this.trail.geometry.translate(0, -0.5, 0);
    this.trail.rotation.x = Math.PI / 2;
    this.trail.visible = false;
    this.root.add(this.trail);

    this.anchors.nose = makeAnchor('nose', 0, 0, L * 0.5, this.root);
    this.anchors.stern = makeAnchor('stern', 0, 0, -L * 0.55, this.root);
    this.anchors.hatch = makeAnchor('hatch', 0, -R * 0.9, L * 0.05, this.root);
  }

  releaseClamps(): void {
    this.clamps.visible = false;
  }

  attachClamps(): void {
    this.clamps.visible = true;
  }

  /** 0..1 atmospheric-entry heating on the shield. */
  setReentry(v: number): void {
    const t = clamp01(v);
    this.reentry = t;
    (this.reentryGlow.material as THREE.MeshBasicMaterial).opacity = t * 0.85;
    const mat = this.heatShield.material as THREE.MeshStandardMaterial;
    mat.emissive.setHex(0xff7a2a);
    mat.emissiveIntensity = t * 3.2;
    this.reentryGlow.scale.set(1 + t * 0.4, 1 + t * 0.4, 1.4 + t * 1.6);
    const trailMat = this.trail.material as THREE.MeshBasicMaterial;
    trailMat.opacity = t * 0.5;
    this.trail.visible = t > 0.02;
    this.trail.scale.set(this.length * 0.5, this.length * (2 + t * 22), this.length * 0.5);
  }

  update(_dt: number, elapsed: number, camera?: THREE.Camera): void {
    this.engines.update(elapsed);
    const blink = Math.sin(elapsed * 6.2) > 0.55 ? 1 : 0.08;
    (this.beacon.material as THREE.MeshStandardMaterial).emissiveIntensity = 3 * blink;
    this.beaconLight.intensity = 2.4 * blink;

    // Hold the flare at a constant angular size so the pod stays a visible
    // point of light from a hundred metres out to a couple of kilometres. It
    // only fades in once the hull itself is too small to read — up close the
    // pod should look like a machine, not like a light source.
    const flareMat = this.flare.material as THREE.SpriteMaterial;
    if (camera) {
      this.root.getWorldPosition(_flareWorld);
      const dist = camera.getWorldPosition(_camWorld).distanceTo(_flareWorld);
      const size = Math.max(this.length * 1.1, dist * 0.05);
      this.flare.scale.set(size, size, 1);
      const far = clamp01((dist - this.length * 6) / (this.length * 24));
      const heat = 0.35 + this.reentry * 0.65;
      flareMat.opacity = heat * far * (0.85 + 0.15 * Math.sin(elapsed * 3.1));
      flareMat.color.setRGB(1, 0.86 - this.reentry * 0.22, 0.68 - this.reentry * 0.36);
    } else {
      flareMat.opacity = 0;
    }
  }
}
