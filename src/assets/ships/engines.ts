import * as THREE from 'three';
import { emissive } from '../materials';
import { softDiscMap } from '../textures';
import { clamp01 } from '../../core/math';

/**
 * Reusable engine bank.
 *
 * Each nozzle is three layers: a recessed emissive disc, an additive halo
 * billboard that always faces the camera, and a stretched additive cone that
 * reads as exhaust when seen from behind. Throttle drives all three plus an
 * optional point light so the spill actually moves across nearby hulls.
 */

export interface NozzleSpec {
  x: number;
  y: number;
  radius: number;
}

export interface EngineBankOptions {
  nozzles: NozzleSpec[];
  /** Local Z of the exhaust plane (ships face +Z, so this is negative). */
  z: number;
  color: number;
  coreColor?: number;
  /** Length multiplier of the exhaust plume relative to nozzle radius. */
  plume?: number;
  haloScale?: number;
  light?: { intensity: number; distance: number; color?: number };
  emissiveKey: string;
}

export class EngineBank {
  readonly root = new THREE.Group();
  private discs: THREE.Mesh;
  private halos: THREE.Sprite[] = [];
  private plumes: THREE.Mesh[] = [];
  private light: THREE.PointLight | null = null;
  private baseIntensity = 1;
  private throttleValue = 1;

  constructor(private readonly opts: EngineBankOptions) {
    this.root.name = 'EngineBank';
    const discGeos: THREE.BufferGeometry[] = [];
    const coreColor = opts.coreColor ?? 0xffffff;

    for (const n of opts.nozzles) {
      const disc = new THREE.CircleGeometry(n.radius, 20);
      disc.rotateY(Math.PI);
      disc.translate(n.x, n.y, opts.z);
      discGeos.push(disc);

      const halo = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: softDiscMap(),
          color: new THREE.Color(opts.color),
          transparent: true,
          opacity: 0.9,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          toneMapped: false,
        }),
      );
      const hs = n.radius * (opts.haloScale ?? 5.2);
      halo.scale.set(hs, hs, hs);
      halo.position.set(n.x, n.y, opts.z - n.radius * 0.2);
      halo.userData.baseScale = hs;
      this.root.add(halo);
      this.halos.push(halo);

      const plumeLen = n.radius * (opts.plume ?? 7);
      const plumeGeo = new THREE.ConeGeometry(n.radius * 0.92, plumeLen, 16, 4, true);
      plumeGeo.rotateX(Math.PI / 2);
      plumeGeo.translate(0, 0, -plumeLen * 0.5);
      // Vertex colours fade the exhaust to nothing at its tail so the cone
      // never reads as a hard triangle of solid light.
      const pPos = plumeGeo.getAttribute('position');
      const pCol = new Float32Array(pPos.count * 3);
      for (let vi = 0; vi < pPos.count; vi++) {
        const t = Math.min(1, Math.max(0, -pPos.getZ(vi) / plumeLen));
        const f = Math.pow(1 - t, 2.6);
        pCol[vi * 3] = f;
        pCol[vi * 3 + 1] = f;
        pCol[vi * 3 + 2] = f;
      }
      plumeGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3));
      const plume = new THREE.Mesh(
        plumeGeo,
        new THREE.MeshBasicMaterial({
          color: new THREE.Color(opts.color),
          vertexColors: true,
          transparent: true,
          opacity: 0.3,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          side: THREE.DoubleSide,
          toneMapped: false,
        }),
      );
      plume.position.set(n.x, n.y, opts.z);
      plume.userData.baseLen = plumeLen;
      plume.renderOrder = 3;
      this.root.add(plume);
      this.plumes.push(plume);
    }

    // One draw call for every nozzle disc.
    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    let offset = 0;
    for (const g of discGeos) {
      const p = g.getAttribute('position');
      const nrm = g.getAttribute('normal');
      const uv = g.getAttribute('uv');
      for (let i = 0; i < p.count; i++) {
        positions.push(p.getX(i), p.getY(i), p.getZ(i));
        normals.push(nrm.getX(i), nrm.getY(i), nrm.getZ(i));
        uvs.push(uv.getX(i), uv.getY(i));
      }
      const idx = g.getIndex()!;
      for (let i = 0; i < idx.count; i++) indices.push(idx.getX(i) + offset);
      offset += p.count;
      g.dispose();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    this.discs = new THREE.Mesh(geo, emissive(opts.emissiveKey, coreColor, 3.4));
    this.discs.name = 'EngineDiscs';
    this.root.add(this.discs);

    if (opts.light) {
      this.light = new THREE.PointLight(
        opts.light.color ?? opts.color,
        opts.light.intensity,
        opts.light.distance,
        1.7,
      );
      this.baseIntensity = opts.light.intensity;
      this.light.position.set(0, 0, opts.z - 4);
      this.root.add(this.light);
    }
  }

  /** 0 = shut down, 1 = full burn. Values above 1 flare the plume. */
  set throttle(v: number) {
    this.throttleValue = Math.max(0, v);
  }

  get throttle(): number {
    return this.throttleValue;
  }

  update(elapsed: number): void {
    const t = this.throttleValue;
    const flicker = 1 + Math.sin(elapsed * 22.7) * 0.025 + Math.sin(elapsed * 9.1) * 0.02;
    const mat = this.discs.material as THREE.MeshStandardMaterial;
    mat.emissiveIntensity = 3.4 * clamp01(t) * flicker;
    for (const halo of this.halos) {
      const s = (halo.userData.baseScale as number) * (0.45 + 0.55 * t) * flicker;
      halo.scale.set(s, s, s);
      (halo.material as THREE.SpriteMaterial).opacity = 0.9 * clamp01(t);
    }
    for (const plume of this.plumes) {
      const s = (0.25 + 0.75 * t) * flicker;
      plume.scale.set(1, 1, Math.max(0.001, s));
      (plume.material as THREE.MeshBasicMaterial).opacity = 0.3 * clamp01(t * 1.2);
      plume.visible = t > 0.02;
    }
    if (this.light) this.light.intensity = this.baseIntensity * t * flicker;
  }

  get exhaustZ(): number {
    return this.opts.z;
  }
}
