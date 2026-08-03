import * as THREE from 'three';
import { clamp01, TAU } from '../core/math';
import { freshRng } from '../core/Random';

/**
 * Holographic technical readout of the Imperial battle station.
 *
 * An original schematic rather than a copy of any film hologram: a latitude /
 * longitude wire sphere, an equatorial construction trench, a recessed circular
 * emitter well, orbiting measurement rings and a scrolling column of glyph
 * ticks. Everything is drawn with additive lines so it stays readable against
 * the white corridor.
 */
export class DataProjection {
  readonly root = new THREE.Group();
  private wire: THREE.LineSegments;
  private trench: THREE.LineLoop;
  private dish: THREE.LineSegments;
  private shell: THREE.Mesh;
  private cone: THREE.Mesh;
  private rings: THREE.Group;
  private ticks: THREE.LineSegments;
  private light: THREE.PointLight;
  private material: THREE.LineBasicMaterial;
  private amount = 0;
  private target = 0;
  private glitch = 0;
  private baseScale = 1;

  constructor(radius = 0.5, color = 0x76d9ff) {
    this.root.name = 'DataProjection';
    const rng = freshRng('data-projection');

    this.material = new THREE.LineBasicMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });

    // --- wire sphere -------------------------------------------------------
    const pts: number[] = [];
    const LAT = 11;
    const LON = 18;
    for (let i = 1; i < LAT; i++) {
      const phi = (i / LAT) * Math.PI;
      const r = Math.sin(phi) * radius;
      const y = Math.cos(phi) * radius;
      for (let k = 0; k < LON * 2; k++) {
        const a0 = (k / (LON * 2)) * TAU;
        const a1 = ((k + 1) / (LON * 2)) * TAU;
        pts.push(Math.cos(a0) * r, y, Math.sin(a0) * r, Math.cos(a1) * r, y, Math.sin(a1) * r);
      }
    }
    for (let k = 0; k < LON; k++) {
      const a = (k / LON) * TAU;
      for (let i = 0; i < LAT * 2; i++) {
        const p0 = (i / (LAT * 2)) * Math.PI;
        const p1 = ((i + 1) / (LAT * 2)) * Math.PI;
        pts.push(
          Math.sin(p0) * Math.cos(a) * radius, Math.cos(p0) * radius, Math.sin(p0) * Math.sin(a) * radius,
          Math.sin(p1) * Math.cos(a) * radius, Math.cos(p1) * radius, Math.sin(p1) * Math.sin(a) * radius,
        );
      }
    }
    const wireGeo = new THREE.BufferGeometry();
    wireGeo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    this.wire = new THREE.LineSegments(wireGeo, this.material);
    this.root.add(this.wire);

    // --- equatorial construction trench -------------------------------------
    const trenchPts: THREE.Vector3[] = [];
    for (let k = 0; k <= 96; k++) {
      const a = (k / 96) * TAU;
      trenchPts.push(new THREE.Vector3(Math.cos(a) * radius * 1.005, 0, Math.sin(a) * radius * 1.005));
    }
    const trenchGeo = new THREE.BufferGeometry().setFromPoints(trenchPts);
    this.trench = new THREE.LineLoop(trenchGeo, this.material);
    this.root.add(this.trench);

    // --- recessed emitter well (northern hemisphere) ------------------------
    const dishPts: number[] = [];
    const dishCentre = new THREE.Vector3(0.34, 0.72, 0.5).normalize().multiplyScalar(radius);
    const basis = new THREE.Matrix4().lookAt(dishCentre, new THREE.Vector3(), new THREE.Vector3(0, 1, 0));
    const dishR = radius * 0.3;
    for (let ring = 1; ring <= 4; ring++) {
      const rr = (dishR * ring) / 4;
      for (let k = 0; k < 28; k++) {
        const a0 = (k / 28) * TAU;
        const a1 = ((k + 1) / 28) * TAU;
        const p0 = new THREE.Vector3(Math.cos(a0) * rr, Math.sin(a0) * rr, 0).applyMatrix4(basis).add(dishCentre);
        const p1 = new THREE.Vector3(Math.cos(a1) * rr, Math.sin(a1) * rr, 0).applyMatrix4(basis).add(dishCentre);
        dishPts.push(p0.x, p0.y, p0.z, p1.x, p1.y, p1.z);
      }
    }
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * TAU;
      const p0 = new THREE.Vector3(0, 0, 0).applyMatrix4(basis).add(dishCentre);
      const p1 = new THREE.Vector3(Math.cos(a) * dishR, Math.sin(a) * dishR, 0)
        .applyMatrix4(basis)
        .add(dishCentre);
      dishPts.push(p0.x, p0.y, p0.z, p1.x, p1.y, p1.z);
    }
    const dishGeo = new THREE.BufferGeometry();
    dishGeo.setAttribute('position', new THREE.Float32BufferAttribute(dishPts, 3));
    this.dish = new THREE.LineSegments(dishGeo, this.material);
    this.root.add(this.dish);

    // --- translucent volume -------------------------------------------------
    this.shell = new THREE.Mesh(
      new THREE.IcosahedronGeometry(radius * 0.985, 3),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(color),
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
        toneMapped: false,
      }),
    );
    this.root.add(this.shell);

    // --- projector cone -----------------------------------------------------
    const coneH = radius * 2.6;
    const coneGeo = new THREE.ConeGeometry(radius * 1.1, coneH, 22, 3, true);
    const cPos = coneGeo.getAttribute('position');
    const cCol = new Float32Array(cPos.count * 3);
    for (let i = 0; i < cPos.count; i++) {
      const t = clamp01((cPos.getY(i) + coneH / 2) / coneH);
      const f = Math.pow(t, 1.6) * 0.55;
      cCol[i * 3] = f;
      cCol[i * 3 + 1] = f;
      cCol[i * 3 + 2] = f;
    }
    coneGeo.setAttribute('color', new THREE.BufferAttribute(cCol, 3));
    this.cone = new THREE.Mesh(
      coneGeo,
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(color),
        vertexColors: true,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
        toneMapped: false,
      }),
    );
    this.cone.position.y = -coneH / 2 - radius * 0.05;
    this.root.add(this.cone);

    // --- orbiting measurement rings -----------------------------------------
    this.rings = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const r = radius * (1.25 + i * 0.16);
      const ringPts: THREE.Vector3[] = [];
      for (let k = 0; k <= 72; k++) {
        const a = (k / 72) * TAU;
        ringPts.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r));
      }
      const ring = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(ringPts), this.material);
      ring.rotation.set(rng.spread(1.1), rng.range(0, TAU), rng.spread(0.7));
      ring.userData.spin = rng.spread(0.5) + 0.25;
      this.rings.add(ring);
    }
    this.root.add(this.rings);

    // --- scrolling data ticks -----------------------------------------------
    const tickPts: number[] = [];
    for (let i = 0; i < 46; i++) {
      const y = -radius * 1.15 + (i / 46) * radius * 2.3;
      const len = radius * (0.08 + rng.next() * 0.3);
      const x = radius * 1.45;
      tickPts.push(x, y, 0, x + len, y, 0);
      if (rng.bool(0.35)) {
        tickPts.push(-x, y, 0, -x - len * 0.7, y, 0);
      }
    }
    const tickGeo = new THREE.BufferGeometry();
    tickGeo.setAttribute('position', new THREE.Float32BufferAttribute(tickPts, 3));
    this.ticks = new THREE.LineSegments(tickGeo, this.material);
    this.root.add(this.ticks);

    this.light = new THREE.PointLight(color, 0, radius * 14, 2);
    this.root.add(this.light);
  }

  /** 0 = off, 1 = fully projected. */
  setVisible(v: number): void {
    this.target = clamp01(v);
  }

  /**
   * Overall size. Owned here rather than written straight onto `root.scale` by
   * callers, because the per-frame stutter animation also drives that transform
   * and would otherwise stamp over it.
   */
  setScale(v: number): void {
    this.baseScale = Math.max(0.0001, v);
  }

  get isVisible(): boolean {
    return this.amount > 0.01;
  }

  /** Trigger a transmission stutter. */
  stutter(): void {
    this.glitch = 1;
  }

  update(dt: number, elapsed: number): void {
    this.amount += (this.target - this.amount) * (1 - Math.exp(-dt / 0.35));
    this.glitch = Math.max(0, this.glitch - dt * 3.2);

    const flicker =
      0.86 + 0.14 * Math.sin(elapsed * 27) + 0.06 * Math.sin(elapsed * 61.3) - this.glitch * 0.45;
    const a = this.amount * Math.max(0, flicker);

    this.material.opacity = a * 0.8;
    (this.shell.material as THREE.MeshBasicMaterial).opacity = a * 0.035;
    (this.cone.material as THREE.MeshBasicMaterial).opacity = a * 0.22;
    this.light.intensity = a * 1.6;

    this.root.visible = a > 0.004;
    if (!this.root.visible) return;

    this.wire.rotation.y = elapsed * 0.38;
    this.trench.rotation.y = elapsed * 0.38;
    this.dish.rotation.y = elapsed * 0.38;
    this.shell.rotation.y = elapsed * 0.38;
    this.wire.rotation.z = 0.22;
    this.trench.rotation.z = 0.22;
    this.dish.rotation.z = 0.22;

    for (const ring of this.rings.children) {
      ring.rotation.y += (ring.userData.spin as number) * dt;
    }
    // Ticks scroll upward and wrap.
    this.ticks.position.y = ((elapsed * 0.22) % 0.5) - 0.25;
    const s = this.baseScale * (1 + this.glitch * 0.06);
    this.root.scale.set(s, this.baseScale * (1 - this.glitch * 0.04), s);
  }

  dispose(): void {
    this.root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
    });
    this.material.dispose();
  }
}
