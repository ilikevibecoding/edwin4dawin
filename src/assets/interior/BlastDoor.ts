import * as THREE from 'three';
import { box, cyl, merge } from '../geometry';
import { bulkhead, corridorTrim, emissive } from '../materials';
import { clamp01, easeOutCubic, smoothstep } from '../../core/math';

/**
 * Sealed bulkhead door that can be cut open from the far side.
 *
 * `breachProgress` (0..1) drives three stages the boarding sequence relies on:
 *   0.00-0.55  a molten seam is cut around the frame and the leaves bulge inward
 *   0.55-0.85  the seam runs white hot and the leaves shudder
 *   0.85-1.00  the leaves blow inward and drop out of the frame
 * The door faces +Z in its own space; the corridor rotates it into place.
 */
export interface BlastDoorOptions {
  width: number;
  height: number;
  thickness?: number;
}

export class BlastDoor {
  readonly root = new THREE.Group();
  readonly leftLeaf = new THREE.Group();
  readonly rightLeaf = new THREE.Group();
  readonly frame: THREE.Mesh;

  private seam: THREE.Mesh;
  private glowLight: THREE.PointLight;
  private progress = 0;
  private openAmount = 0;
  private readonly width: number;
  private readonly height: number;

  constructor(opts: BlastDoorOptions) {
    const w = (this.width = opts.width);
    const h = (this.height = opts.height);
    const t = opts.thickness ?? 0.3;
    this.root.name = 'BlastDoor';

    this.frame = new THREE.Mesh(
      merge([
        box(0.34, h + 0.3, t * 1.5, { pos: [-w / 2 - 0.17, h / 2, 0] }),
        box(0.34, h + 0.3, t * 1.5, { pos: [w / 2 + 0.17, h / 2, 0] }),
        box(w + 0.7, 0.3, t * 1.5, { pos: [0, h + 0.15, 0] }),
        box(w + 0.7, 0.18, t * 1.5, { pos: [0, 0.05, 0] }),
        cyl(0.1, 0.1, h * 0.8, 8, { pos: [-w / 2 - 0.12, h / 2, t * 0.8] }),
        cyl(0.1, 0.1, h * 0.8, 8, { pos: [w / 2 + 0.12, h / 2, t * 0.8] }),
      ]),
      corridorTrim(),
    );
    this.frame.castShadow = true;
    this.frame.receiveShadow = true;
    this.root.add(this.frame);

    const leafGeo = (sign: number): THREE.BufferGeometry =>
      merge([
        box(w / 2, h, t, { pos: [(sign * w) / 4, h / 2, 0] }),
        box(w / 2 - 0.24, h - 0.3, t * 0.4, { pos: [(sign * w) / 4, h / 2, t * 0.62] }),
        box(w / 2 - 0.6, 0.14, t * 0.5, { pos: [(sign * w) / 4, h * 0.72, t * 0.7] }),
        box(w / 2 - 0.6, 0.14, t * 0.5, { pos: [(sign * w) / 4, h * 0.3, t * 0.7] }),
        box(0.18, h * 0.5, t * 0.6, { pos: [sign * 0.16, h * 0.5, t * 0.66] }),
      ]);

    for (const [sign, leaf] of [
      [-1, this.leftLeaf],
      [1, this.rightLeaf],
    ] as Array<[number, THREE.Group]>) {
      const mesh = new THREE.Mesh(leafGeo(sign), bulkhead());
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      leaf.add(mesh);
      this.root.add(leaf);
    }

    // Cut seam: a rounded rectangle outline of emissive geometry.
    const inset = 0.34;
    const seamW = w - inset * 2;
    const seamH = h - inset * 1.6;
    this.seam = new THREE.Mesh(
      merge([
        box(seamW, 0.075, 0.06, { pos: [0, inset * 0.8, t * 0.55] }),
        box(seamW, 0.075, 0.06, { pos: [0, inset * 0.8 + seamH, t * 0.55] }),
        box(0.075, seamH, 0.06, { pos: [-seamW / 2, inset * 0.8 + seamH / 2, t * 0.55] }),
        box(0.075, seamH, 0.06, { pos: [seamW / 2, inset * 0.8 + seamH / 2, t * 0.55] }),
      ]),
      new THREE.MeshStandardMaterial({
        color: 0x120806,
        emissive: new THREE.Color(0xff5a1e),
        emissiveIntensity: 0,
        roughness: 0.9,
        toneMapped: true,
      }),
    );
    this.seam.name = 'BlastDoor_Seam';
    this.root.add(this.seam);

    this.glowLight = new THREE.PointLight(0xff6a28, 0, 12, 1.8);
    this.glowLight.position.set(0, h * 0.5, t * 1.2);
    this.root.add(this.glowLight);

    // Status readout beside the frame.
    const status = new THREE.Mesh(
      box(0.22, 0.5, 0.08, { pos: [w / 2 + 0.42, h * 0.55, t * 0.6] }),
      emissive('doorStatus', 0x54ff9a, 1.6),
    );
    this.root.add(status);
  }

  /** Slide the leaves apart for ordinary use (0 = shut, 1 = fully open). */
  setOpen(v: number): void {
    this.openAmount = clamp01(v);
    const slide = easeOutCubic(this.openAmount) * (this.width / 2 + 0.05);
    this.leftLeaf.position.x = -slide;
    this.rightLeaf.position.x = slide;
  }

  get open(): number {
    return this.openAmount;
  }

  /** Drive the cutting-torch breach. */
  setBreach(v: number): void {
    this.progress = clamp01(v);
    const p = this.progress;

    const cut = smoothstep(p / 0.55);
    const heat = p < 0.85 ? cut : 1;
    const mat = this.seam.material as THREE.MeshStandardMaterial;
    mat.emissiveIntensity = heat * (p < 0.55 ? 5 : 11);
    mat.emissive.setHSL(0.055 - 0.03 * smoothstep((p - 0.4) / 0.45), 1, 0.45 + 0.35 * cut);
    this.glowLight.intensity = heat * (p < 0.55 ? 8 : 22);
    this.glowLight.color.setHSL(0.06 - 0.035 * cut, 1, 0.55);

    // Bulge: the leaves lean into the corridor as pressure builds.
    const bulge = p < 0.85 ? smoothstep(p / 0.85) : 1;
    const shudder = p > 0.5 && p < 0.85 ? Math.sin(p * 220) * 0.012 * bulge : 0;
    for (const [sign, leaf] of [
      [-1, this.leftLeaf],
      [1, this.rightLeaf],
    ] as Array<[number, THREE.Group]>) {
      leaf.rotation.y = sign * bulge * 0.055 + shudder;
      leaf.position.z = bulge * 0.14;
      leaf.position.x = sign * bulge * 0.02;
    }

    if (p > 0.85) {
      // Blow-in: the leaves tear out of the frame, fall forward and come to
      // rest flat on the deck to either side. They must not end up standing up
      // in the doorway — the boarding party and the dark lord walk through it.
      const k = easeOutCubic((p - 0.85) / 0.15);
      for (const [sign, leaf] of [
        [-1, this.leftLeaf],
        [1, this.rightLeaf],
      ] as Array<[number, THREE.Group]>) {
        leaf.position.z = 0.14 + k * 1.15;
        leaf.position.x = sign * (0.02 + k * 0.72);
        leaf.position.y = 0;
        leaf.rotation.x = k * (Math.PI / 2 - 0.16);
        leaf.rotation.y = sign * (0.055 + k * 0.28);
        leaf.rotation.z = sign * k * 0.2;
      }
      mat.emissiveIntensity = 11 * (1 - k * 0.75);
      this.glowLight.intensity = 22 * (1 - k);
    }
  }

  get breach(): number {
    return this.progress;
  }

  /** World-space centre of the doorway — used for camera aim and effects. */
  getCentre(out: THREE.Vector3): THREE.Vector3 {
    this.root.updateWorldMatrix(true, false);
    return out.set(0, this.height * 0.5, 0).applyMatrix4(this.root.matrixWorld);
  }
}
