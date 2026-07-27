import * as THREE from 'three';
import { TAU } from '../core/MathX';

/**
 * Ordnance.ts — the stick of unguided bombs.
 *
 * Each bomb is a finned free-fall body integrated with real forward velocity +
 * gravity, so a stick released in sequence lays a walking line of impacts along
 * the run heading. Bombs are pooled; geometry/material are shared and disposed
 * with the pool.
 */

export interface OrdnanceMaterials {
  body: THREE.Material;
  fin: THREE.Material;
}

interface Bomb {
  root: THREE.Group;
  vel: THREE.Vector3;
  spin: number;
  alive: boolean;
  groundY: number;
  onImpact: ((pos: THREE.Vector3) => void) | null;
}

const _tgt = new THREE.Vector3();
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _up = new THREE.Vector3(0, 0, 1);

export class Ordnance {
  private pool: Bomb[] = [];
  private geos: THREE.BufferGeometry[] = [];

  constructor(
    private mats: OrdnanceMaterials,
    private scene: THREE.Scene,
    private gravity: number
  ) {}

  private makeBomb(): Bomb {
    const root = new THREE.Group();

    const body = new THREE.Mesh(this.geo(new THREE.CapsuleGeometry(0.16, 0.86, 6, 10)), this.mats.body);
    body.rotation.x = Math.PI / 2; // long axis -> local Z
    root.add(body);

    const nose = new THREE.Mesh(this.geo(new THREE.ConeGeometry(0.16, 0.34, 10)), this.mats.body);
    nose.rotation.x = -Math.PI / 2;
    nose.position.z = -0.72;
    root.add(nose);

    // Four boxy tail fins.
    const finGeo = this.geo(new THREE.BoxGeometry(0.03, 0.26, 0.3));
    for (let i = 0; i < 4; i++) {
      const fin = new THREE.Mesh(finGeo, this.mats.fin);
      const a = (i / 4) * TAU;
      fin.position.set(Math.cos(a) * 0.16, Math.sin(a) * 0.16, 0.62);
      fin.rotation.z = a;
      root.add(fin);
    }
    root.visible = false;
    this.scene.add(root);
    return { root, vel: new THREE.Vector3(), spin: 0, alive: false, groundY: 0, onImpact: null };
  }

  private geo<T extends THREE.BufferGeometry>(g: T): T {
    this.geos.push(g);
    return g;
  }

  /** Drop a bomb from `from` with initial `velocity`; `onImpact` fires at `groundY`. */
  release(
    from: THREE.Vector3,
    velocity: THREE.Vector3,
    groundY: number,
    onImpact: (pos: THREE.Vector3) => void
  ) {
    let b = this.pool.find((x) => !x.alive);
    if (!b) {
      b = this.makeBomb();
      this.pool.push(b);
    }
    b.alive = true;
    b.root.visible = true;
    b.root.position.copy(from);
    b.vel.copy(velocity);
    b.spin = (Math.random() - 0.5) * 3;
    b.groundY = groundY;
    b.onImpact = onImpact;
  }

  get liveCount(): number {
    let n = 0;
    for (const b of this.pool) if (b.alive) n++;
    return n;
  }

  update(dt: number) {
    for (const b of this.pool) {
      if (!b.alive) continue;
      b.vel.y -= this.gravity * dt;
      b.root.position.addScaledVector(b.vel, dt);

      // Nose follows velocity; add a lazy tumble around that axis.
      _tgt.copy(b.root.position).add(b.vel);
      _m.lookAt(b.root.position, _tgt, _up);
      _q.setFromRotationMatrix(_m);
      b.root.quaternion.copy(_q);
      b.root.rotateZ(b.spin * b.root.position.y * 0.02);

      if (b.root.position.y <= b.groundY) {
        b.root.position.y = b.groundY;
        b.alive = false;
        b.root.visible = false;
        const cb = b.onImpact;
        b.onImpact = null;
        cb?.(b.root.position);
      }
    }
  }

  clear() {
    for (const b of this.pool) {
      b.alive = false;
      b.root.visible = false;
    }
  }

  dispose() {
    for (const b of this.pool) this.scene.remove(b.root);
    for (const g of this.geos) g.dispose();
    this.pool.length = 0;
    this.geos.length = 0;
  }
}
