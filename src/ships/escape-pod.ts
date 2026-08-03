/**
 * Class-C escape pod.
 *
 * A stubby riveted lifeboat: ogive nose, ribbed barrel, tapered stern with
 * four retro bells, one flank porthole and a boarding hatch. Roughly five
 * metres long, so that when it drops away from the corvette the scale
 * relationship is readable without a caption.
 *
 * Local space: nose at −Z, stern at +Z, boarding hatch on +X. Every fitting is
 * positioned through `podZ`/`podR`, which evaluate the same profile the hull
 * loft uses — rings and patches therefore hug the skin instead of floating
 * beside it.
 */

import * as THREE from 'three';
import {
  hullMaterial,
  metalMaterial,
  emissiveMaterial,
  nozzleMaterial,
  additiveMaterial,
  glassMaterial,
} from '../assets/materials';
import { loftedHull, roundedBox } from '../assets/geometry';
import { flareSprite } from '../assets/textures';

export const POD_LENGTH = 4.8;
export const POD_RADIUS = 1.32;

/** Radius multiplier along the hull; t = 0 at the nose, 1 at the stern. */
function podProfile(t: number): number {
  if (t < 0.24) {
    const u = t / 0.24;
    return Math.sqrt(Math.max(0.0009, 1 - (1 - u) * (1 - u)));
  }
  if (t < 0.74) return 1 + (t - 0.24) * 0.05;
  const u = (t - 0.74) / 0.26;
  return 1.025 - 0.235 * u * u;
}
const podZ = (t: number) => -POD_LENGTH / 2 + t * POD_LENGTH;
const podR = (t: number) => POD_RADIUS * podProfile(t);

/**
 * A patch of shell that follows the hull curvature: a cylinder segment whose
 * axis is rotated onto the pod's Z axis and centred on the +X flank.
 */
function hullPatch(
  radius: number,
  arc: number,
  length: number,
  material: THREE.Material,
  segments = 10,
): THREE.Mesh {
  const geo = new THREE.CylinderGeometry(radius, radius, length, segments, 1, true, Math.PI / 2 - arc / 2, arc);
  const mesh = new THREE.Mesh(geo, material);
  mesh.rotation.x = Math.PI / 2;
  return mesh;
}

export class EscapePod {
  readonly group = new THREE.Group();
  /** Where a droid stands when it is climbing aboard, in pod-local space. */
  readonly boardingPoint = new THREE.Vector3(2.55, -1.45, 0.35);
  private thrusterFlares: THREE.Mesh[] = [];
  private thrusterMat: THREE.MeshStandardMaterial;
  private clamps: THREE.Mesh[] = [];
  private reentryGlow: THREE.Mesh;
  private reentryMat: THREE.MeshBasicMaterial;
  private beaconMats: THREE.MeshStandardMaterial[] = [];
  private cabinMat: THREE.MeshStandardMaterial;
  private light: THREE.PointLight;

  private burn = 0;

  constructor(seed = 'pod') {
    this.group.name = 'EscapePod';

    // The pod is small and gets photographed from two metres away, so the
    // plating has to be fine-grained: the hull maps that work on a 150 m
    // corvette read as poured concrete at this scale.
    const shell = hullMaterial('pod', {
      color: '#dedcd4',
      grime: 0.34,
      cell: 30,
      roughness: 0.6,
      metalness: 0.14,
      normalScale: 0.75,
      grimeTint: 'cool',
      seed: `${seed}-shell`,
      repeat: 3,
    });
    const band = metalMaterial('podBand', '#565b62', 0.48, 0.8);
    const dark = metalMaterial('podDark', '#2b2f34', 0.66, 0.55);
    const trim = metalMaterial('podTrim', '#9a4038', 0.7, 0.2);
    this.thrusterMat = nozzleMaterial('podThruster', '#ffd0a0', 0.4).clone();
    this.cabinMat = emissiveMaterial('podCabin', '#9fd0ff', 0.9).clone();

    /* --------------------------------------------------------------- hull */
    const body = new THREE.Mesh(loftedHull(POD_LENGTH, POD_RADIUS, podProfile, 22, 30, 1), shell);
    body.castShadow = true;
    body.receiveShadow = true;
    this.group.add(body);

    // Reinforcing ribs. Collars rather than tori: a torus of the same radius as
    // the hull shows its far side around the silhouette and reads as a wire
    // hoop floating in space.
    for (const t of [0.31, 0.5, 0.69]) {
      const rib = new THREE.Mesh(
        new THREE.CylinderGeometry(podR(t) + 0.035, podR(t) + 0.035, 0.17, 22, 1, true),
        band,
      );
      rib.rotation.x = Math.PI / 2;
      rib.position.z = podZ(t);
      this.group.add(rib);
    }
    // Heavier collar where the barrel breaks into the stern taper.
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(podR(0.76) + 0.04, podR(0.8) + 0.04, 0.3, 22, 1, true), band);
    collar.rotation.x = Math.PI / 2;
    collar.position.z = podZ(0.78);
    this.group.add(collar);

    // A single Alliance-red band around the shoulders. One saturated accent on
    // an otherwise off-white hull is what stops the pod reading as a pipe.
    const stripe = new THREE.Mesh(
      new THREE.CylinderGeometry(podR(0.255) + 0.012, podR(0.235) + 0.012, 0.34, 22, 1, true),
      trim,
    );
    stripe.rotation.x = Math.PI / 2;
    stripe.position.z = podZ(0.245);
    this.group.add(stripe);

    /* -------------------------------------------------------------- nose */
    // Ablative cap over the tip, following the loft rather than sitting on it.
    // Ablative cap over the tip: the same loft at a slightly larger radius,
    // trimmed to the nose, so it lies on the hull instead of ballooning off it.
    const cap = new THREE.Mesh(
      loftedHull(POD_LENGTH, POD_RADIUS + 0.025, podProfile, 20, 8, 1, [0, 0.21]),
      metalMaterial('podNoseCap', '#8b8f94', 0.55, 0.6),
    );
    this.group.add(cap);
    // Attitude thruster quads around the shoulder of the nose.
    for (let i = 0; i < 4; i++) {
      const a = Math.PI / 4 + (i / 4) * Math.PI * 2;
      const r = podR(0.27) - 0.04;
      const jet = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.14, 8), band);
      jet.position.set(Math.cos(a) * r, Math.sin(a) * r, podZ(0.27));
      jet.rotation.z = Math.PI / 2 - a;
      jet.rotation.y = Math.PI / 2;
      this.group.add(jet);
    }

    /* ------------------------------------------------------- flank fittings */
    // Porthole forward on the boarding flank, and one to port so the pod also
    // reads from the far side during the exterior fall.
    // Placed on the surface normal rather than on a world axis, so the pane
    // lies flat against the curve instead of hovering off the shoulder.
    const onHull = (mesh: THREE.Mesh, t: number, phi: number, lift: number) => {
      const r = podR(t) + lift;
      mesh.position.set(Math.cos(phi) * r, Math.sin(phi) * r, podZ(t));
      mesh.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 0, 1),
        new THREE.Vector3(Math.cos(phi), Math.sin(phi), 0),
      );
      this.group.add(mesh);
    };
    for (const s of [-1, 1]) {
      const t = s > 0 ? 0.33 : 0.4;
      const phi = s > 0 ? 0.24 : Math.PI - 0.24;
      onHull(new THREE.Mesh(new THREE.CircleGeometry(0.46, 18), band), t, phi, 0.02);
      onHull(new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.075, 6, 18), band), t, phi, 0.06);
      // Cabin light behind the pane, so the pod reads as occupied.
      onHull(new THREE.Mesh(new THREE.CircleGeometry(0.37, 18), this.cabinMat), t, phi, 0.05);
      onHull(
        new THREE.Mesh(new THREE.CircleGeometry(0.38, 18), glassMaterial('podGlass', '#0c1c2a', 0.5)),
        t,
        phi,
        0.075,
      );
    }

    // Boarding hatch on the +X flank: a recessed dark well, a curved plate that
    // follows the hull, a frame and three grab bars.
    const hatchT = 0.57;
    const hatchZ = podZ(hatchT);
    const hatchR = podR(hatchT);
    // Everything here has to sit *outside* the skin: the hull loft is closed,
    // so a plate at a smaller radius is simply invisible. The recess is faked
    // by a raised surround with the door proud of the hull but inside it.
    const surround = hullPatch(hatchR + 0.075, 1.16, 1.5, band, 14);
    surround.position.z = hatchZ;
    this.group.add(surround);
    const well = hullPatch(hatchR + 0.05, 1.04, 1.34, dark, 14);
    well.position.z = hatchZ;
    this.group.add(well);
    const plate = hullPatch(hatchR + 0.022, 0.94, 1.22, metalMaterial('podHatchPlate', '#c2c0b7', 0.58, 0.26), 14);
    plate.position.z = hatchZ;
    this.group.add(plate);
    // One grab handle across the door, sitting just proud of the plate.
    const bar = new THREE.Mesh(roundedBox(0.07, 0.07, 0.8, 0.02), band);
    bar.position.set(hatchR + 0.06, -0.02, hatchZ);
    this.group.add(bar);
    const hatchLamp = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, 0.24), emissiveMaterial('podHatchLamp', '#7dff9a', 1.4));
    hatchLamp.position.set(hatchR * 0.86 + 0.09, 0.78, hatchZ + 0.62);
    this.group.add(hatchLamp);
    // Hazard flash beside the hatch, so the boarding side is obvious at a glance.
    const flash = hullPatch(hatchR + 0.03, 0.42, 0.2, trim, 8);
    flash.position.z = hatchZ - 1.1;
    this.group.add(flash);

    /* -------------------------------------------------------------- stern */
    const sternZ = podZ(1);
    const sternR = podR(1);
    const sternPlate = new THREE.Mesh(new THREE.CylinderGeometry(sternR, sternR * 0.94, 0.26, 22), band);
    sternPlate.rotation.x = Math.PI / 2;
    sternPlate.position.z = sternZ + 0.12;
    this.group.add(sternPlate);

    const flareTex = flareSprite();
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const x = Math.cos(a) * 0.5;
      const y = Math.sin(a) * 0.5;
      const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.31, 0.4, 12, 1, true), dark);
      bell.rotation.x = Math.PI / 2;
      bell.position.set(x, y, sternZ + 0.44);
      this.group.add(bell);
      const core = new THREE.Mesh(new THREE.CircleGeometry(0.29, 14), this.thrusterMat);
      core.position.set(x, y, sternZ + 0.6);
      this.group.add(core);
      const flare = new THREE.Mesh(
        new THREE.PlaneGeometry(1.7, 1.7),
        additiveMaterial('podFlare', '#ffc07a', 0, flareTex).clone(),
      );
      flare.position.set(x, y, sternZ + 0.78);
      flare.visible = false;
      this.group.add(flare);
      this.thrusterFlares.push(flare);
    }
    // Stern greeble: a pair of tank cylinders straddling the thruster cluster.
    for (const s of [-1, 1]) {
      const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.72, 10), band);
      tank.rotation.x = Math.PI / 2;
      tank.position.set(s * 0.78, -0.12, sternZ + 0.2);
      this.group.add(tank);
    }

    /* ------------------------------------------------------------ fittings */
    // Separation clamps: collars round the barrel that grip the cradle.
    for (let i = 0; i < 3; i++) {
      const a = Math.PI * 0.5 + ((i - 1) * Math.PI * 2) / 3;
      const t = 0.42;
      const r = podR(t);
      const clamp = new THREE.Mesh(roundedBox(0.42, 0.26, 1.05, 0.05), dark);
      clamp.position.set(Math.cos(a) * (r + 0.1), Math.sin(a) * (r + 0.1), podZ(t));
      clamp.rotation.z = a;
      this.group.add(clamp);
      this.clamps.push(clamp);
    }

    // Strobes: one on the spine, one under the belly.
    for (const dy of [1, -1]) {
      const m = emissiveMaterial('podBeacon', '#ff6a4a', 3).clone();
      const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 7), m);
      beacon.position.set(0, dy * (podR(0.62) - 0.02), podZ(0.62));
      this.group.add(beacon);
      this.beaconMats.push(m);
    }

    // Re-entry shock envelope, revealed during atmospheric descent.
    this.reentryMat = additiveMaterial('podReentry', '#ff9a44', 0, flareTex).clone();
    this.reentryMat.opacity = 0;
    this.reentryGlow = new THREE.Mesh(new THREE.SphereGeometry(2.3, 18, 12), this.reentryMat);
    this.reentryGlow.scale.set(1, 1, 1.5);
    this.reentryGlow.position.z = -0.6;
    this.reentryGlow.visible = false;
    this.group.add(this.reentryGlow);

    this.light = new THREE.PointLight(0xffc07a, 0, 60, 2);
    this.light.position.z = sternZ + 1.5;
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
    this.thrusterMat.emissiveIntensity = 0.25 + level * 4.2;
    for (const f of this.thrusterFlares) {
      (f.material as THREE.MeshBasicMaterial).opacity = level * 0.85;
      f.visible = level > 0.02;
    }
    this.light.intensity = level * 70;
    const strobe = Math.sin(elapsed * 5.6) > 0.82 ? 1 : 0.06;
    for (const m of this.beaconMats) m.emissiveIntensity = 0.4 + strobe * 5;
    this.cabinMat.emissiveIntensity = 0.85 + Math.sin(elapsed * 1.7) * 0.05;
  }
}
