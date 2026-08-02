import * as THREE from 'three';
import { Rng } from '../../core/Rng';
import { saturate, smoothstep } from '../../core/mathx';
import type { MaterialLibrary } from '../materials';

/**
 * The stolen plans, rendered as a volumetric data projection.
 *
 * Deliberately schematic and abstract: a wireframe sphere with a polar
 * emplacement, equatorial trench, orbiting analysis rings and floating readout
 * cards. It communicates "this is the design of a very large weapon" without
 * imitating any specific hologram from the films.
 */
export class DataProjection {
  readonly group = new THREE.Group();
  private core: THREE.LineSegments;
  private shell: THREE.Mesh;
  private dish: THREE.Mesh;
  private trench: THREE.Mesh;
  private rings: THREE.Mesh[] = [];
  private cards: THREE.Mesh[] = [];
  private scan: THREE.Mesh;
  private light: THREE.PointLight;
  private materials: Array<THREE.Material & { opacity: number }> = [];
  private beam: THREE.Mesh;
  private beamMat: THREE.MeshBasicMaterial;

  constructor(lib: MaterialLibrary, radius = 0.42, seed = 'plans') {
    const rng = new Rng(seed);
    this.group.name = 'dataProjection';
    const color = 0x8fe8ff;

    const track = <T extends THREE.Material & { opacity: number }>(m: T): T => {
      lib.registry.track(m);
      this.materials.push(m);
      return m;
    };

    // Wireframe skeleton.
    const sphere = new THREE.IcosahedronGeometry(radius, 2);
    const wire = new THREE.WireframeGeometry(sphere);
    sphere.dispose();
    lib.registry.track(wire);
    this.core = new THREE.LineSegments(wire, track(new THREE.LineBasicMaterial({
      color, transparent: true, opacity: 0.55, toneMapped: false, blending: THREE.AdditiveBlending, depthWrite: false,
    })));
    this.group.add(this.core);

    // Translucent shell so the wireframe reads as a solid body.
    const shellGeo = new THREE.SphereGeometry(radius * 0.985, 28, 20);
    lib.registry.track(shellGeo);
    this.shell = new THREE.Mesh(shellGeo, track(new THREE.MeshBasicMaterial({
      color: 0x1d7fa8, transparent: true, opacity: 0.16, toneMapped: false,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    })));
    this.group.add(this.shell);

    // Polar emplacement.
    const dishGeo = new THREE.SphereGeometry(radius * 0.3, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.5);
    dishGeo.rotateX(-Math.PI * 0.32);
    dishGeo.translate(radius * 0.16, radius * 0.62, 0);
    lib.registry.track(dishGeo);
    this.dish = new THREE.Mesh(dishGeo, track(new THREE.MeshBasicMaterial({
      color: 0xbff2ff, transparent: true, opacity: 0.45, wireframe: true, toneMapped: false,
      blending: THREE.AdditiveBlending, depthWrite: false,
    })));
    this.group.add(this.dish);

    // Equatorial trench.
    const trenchGeo = new THREE.TorusGeometry(radius * 1.002, radius * 0.028, 6, 60);
    trenchGeo.rotateX(Math.PI / 2);
    lib.registry.track(trenchGeo);
    this.trench = new THREE.Mesh(trenchGeo, track(new THREE.MeshBasicMaterial({
      color: 0xd8f6ff, transparent: true, opacity: 0.6, toneMapped: false,
      blending: THREE.AdditiveBlending, depthWrite: false,
    })));
    this.group.add(this.trench);

    // Analysis rings.
    for (let i = 0; i < 3; i++) {
      const r = radius * (1.28 + i * 0.22);
      const g = new THREE.TorusGeometry(r, 0.004, 4, 64);
      lib.registry.track(g);
      const m = new THREE.Mesh(g, track(new THREE.MeshBasicMaterial({
        color, transparent: true, opacity: 0.35 - i * 0.07, toneMapped: false,
        blending: THREE.AdditiveBlending, depthWrite: false,
      })));
      m.rotation.set(rng.range(-1, 1), rng.range(0, Math.PI), rng.range(-0.6, 0.6));
      this.group.add(m);
      this.rings.push(m);
    }

    // Floating readout cards.
    for (let i = 0; i < 5; i++) {
      const w = rng.range(0.1, 0.2);
      const g = new THREE.PlaneGeometry(w, w * rng.range(0.4, 0.8));
      lib.registry.track(g);
      const m = new THREE.Mesh(g, track(new THREE.MeshBasicMaterial({
        color: 0xcdf3ff, transparent: true, opacity: 0.22, toneMapped: false,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, wireframe: true,
      })));
      const a = (i / 5) * Math.PI * 2;
      m.position.set(Math.cos(a) * radius * 1.7, rng.range(-0.3, 0.4), Math.sin(a) * radius * 1.7);
      m.userData.angle = a;
      this.group.add(m);
      this.cards.push(m);
    }

    // Horizontal scan plane that sweeps the sphere.
    const scanGeo = new THREE.CircleGeometry(radius * 1.16, 40);
    scanGeo.rotateX(-Math.PI / 2);
    lib.registry.track(scanGeo);
    this.scan = new THREE.Mesh(scanGeo, track(new THREE.MeshBasicMaterial({
      color: 0xe2fbff, transparent: true, opacity: 0.12, toneMapped: false,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    })));
    this.group.add(this.scan);

    // Projector cone from below.
    const beamGeo = new THREE.CylinderGeometry(radius * 1.05, 0.03, 0.9, 20, 1, true);
    beamGeo.translate(0, -0.45, 0);
    lib.registry.track(beamGeo);
    this.beamMat = track(new THREE.MeshBasicMaterial({
      color: 0x6fd0ff, transparent: true, opacity: 0.07, toneMapped: false,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    }));
    this.beam = new THREE.Mesh(beamGeo, this.beamMat);
    this.group.add(this.beam);

    this.light = new THREE.PointLight(0x6fd0ff, 0, 4.5, 2);
    this.group.add(this.light);
    this.group.visible = false;
  }

  /**
   * @param t master clock
   * @param strength 0..1 overall presence
   * @param transfer 0..1 how much of the data has moved into the droid
   */
  update(t: number, strength: number, transfer = 0): void {
    const s = saturate(strength);
    this.group.visible = s > 0.01;
    if (!this.group.visible) return;

    // Boot-up flicker then a steady, slowly rotating projection.
    const boot = smoothstep(0, 1, s);
    const flicker = 0.88 + 0.12 * Math.sin(t * 27) * Math.sin(t * 9.3);
    const alpha = boot * flicker;

    this.group.scale.setScalar(0.35 + 0.65 * boot);
    this.core.rotation.y = t * 0.22;
    this.core.rotation.x = 0.24;
    this.shell.rotation.y = t * 0.22;
    this.dish.rotation.y = t * 0.22;
    this.trench.rotation.y = t * 0.22;

    for (let i = 0; i < this.rings.length; i++) {
      const r = this.rings[i];
      r.rotation.z += 0;
      r.rotation.y = t * (0.5 + i * 0.23) * (i % 2 ? -1 : 1);
    }
    for (let i = 0; i < this.cards.length; i++) {
      const c = this.cards[i];
      const a = (c.userData.angle as number) + t * 0.35;
      c.position.set(Math.cos(a) * 0.72, Math.sin(t * 0.7 + i) * 0.22, Math.sin(a) * 0.72);
      c.lookAt(0, c.position.y, 0);
    }
    this.scan.position.y = Math.sin(t * 0.9) * 0.42;

    // As the transfer completes the projection thins out and drains downward.
    const drain = 1 - saturate(transfer) * 0.75;
    const base = [0.55, 0.16, 0.45, 0.6, 0.35, 0.28, 0.21, 0.22, 0.22, 0.22, 0.22, 0.12, 0.07];
    this.materials.forEach((m, i) => {
      m.opacity = (base[i] ?? 0.3) * alpha * drain;
    });
    this.light.intensity = 1.5 * alpha * drain;
  }

  setPosition(x: number, y: number, z: number): void {
    this.group.position.set(x, y, z);
  }
}
