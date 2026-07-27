import * as THREE from 'three';
import type { EngineContext } from '../core/Engine';
import type { ILevel } from '../core/Contracts';
import { makeRng, TAU, clamp } from '../core/MathX';
import { ParticleEngine, orthoBasis } from './ParticleEngine';
import { ALP } from './ParticleTextures';

const _t = new THREE.Vector3();
const _b = new THREE.Vector3();
const _n = new THREE.Vector3();
const _d = new THREE.Vector3();

interface Casing {
  active: boolean;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  spin: THREE.Vector3;
  quat: THREE.Quaternion;
  scale: number;
  ttl: number;
  rest: number;
}

export interface ChunkOpts {
  count: number;
  spread: number;
  speedMin: number;
  speedMax: number;
  sizeMin: number;
  sizeMax: number;
  life: number;
  gravity: number;
  r: number; g: number; b: number;
  trails: boolean;
}

/** Shell-casing pool (simple integrated physics + bounce) and GPU debris chunks. */
export class Debris {
  private rng = makeRng(0x7a1c9);
  private level: ILevel | null;

  private casingMesh: THREE.InstancedMesh;
  private casings: Casing[] = [];
  private casingHead = 0;
  private dummy = new THREE.Object3D();
  private geom: THREE.CylinderGeometry;
  private mat: THREE.MeshStandardMaterial;

  constructor(private engine: ParticleEngine, private ctx: EngineContext) {
    this.level = ctx.has('level') ? ctx.get<ILevel>('level') : null;

    const budget = Math.min(64, Math.max(16, ctx.settings.quality.debrisBudget));
    this.geom = new THREE.CylinderGeometry(0.006, 0.0065, 0.024, 7, 1);
    this.mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0.72, 0.52, 0.18),
      metalness: 0.95,
      roughness: 0.32,
    });
    this.casingMesh = new THREE.InstancedMesh(this.geom, this.mat, budget);
    this.casingMesh.frustumCulled = false;
    // Stays on the default layer so the scene sun/fill lights illuminate the
    // brass (the VFX layer is excluded from those lights).
    this.casingMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.casingMesh.name = 'vfx-casings';
    ctx.scene.add(this.casingMesh);

    for (let i = 0; i < budget; i++) {
      this.casings.push({
        active: false, pos: new THREE.Vector3(), vel: new THREE.Vector3(),
        spin: new THREE.Vector3(), quat: new THREE.Quaternion(), scale: 1, ttl: 0, rest: 0,
      });
      this.dummy.position.set(0, -9999, 0);
      this.dummy.scale.setScalar(0.0001);
      this.dummy.updateMatrix();
      this.casingMesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.casingMesh.instanceMatrix.needsUpdate = true;
  }

  ejectCasing(pos: THREE.Vector3, velocity: THREE.Vector3, caliber: string) {
    const i = this.casingHead;
    this.casingHead = (this.casingHead + 1) % this.casings.length;
    const c = this.casings[i];
    const rng = this.rng;
    c.active = true;
    c.pos.copy(pos);
    c.vel.copy(velocity);
    // add a little randomness so a burst doesn't eject a rigid stream
    c.vel.x += (rng() - 0.5) * 0.8;
    c.vel.y += rng() * 0.6;
    c.vel.z += (rng() - 0.5) * 0.8;
    c.spin.set((rng() - 0.5) * 40, (rng() - 0.5) * 40, (rng() - 0.5) * 40);
    c.quat.set(rng(), rng(), rng(), rng()).normalize();
    c.scale = caliber === 'shell' ? 2.3 : caliber === 'magnum' ? 1.5 : caliber === 'pistol' ? 1.1 : 1.35;
    c.ttl = 4 + rng() * 2;
    c.rest = 0;
  }

  private groundAt(x: number, z: number): number {
    return this.level?.sampleGround(x, z) ?? 0;
  }

  update(dt: number) {
    let anyActive = false;
    const dq = _tmpQuat;
    for (let i = 0; i < this.casings.length; i++) {
      const c = this.casings[i];
      if (!c.active) continue;
      anyActive = true;
      c.ttl -= dt;
      if (c.ttl <= 0) {
        c.active = false;
        this.dummy.position.set(0, -9999, 0);
        this.dummy.scale.setScalar(0.0001);
        this.dummy.updateMatrix();
        this.casingMesh.setMatrixAt(i, this.dummy.matrix);
        continue;
      }

      if (c.rest <= 0) {
        c.vel.y -= 22 * dt;
        c.vel.multiplyScalar(1 - 0.4 * dt);
        c.pos.addScaledVector(c.vel, dt);

        // spin
        const ang = c.spin.length() * dt;
        if (ang > 1e-5) {
          _n.copy(c.spin).normalize();
          dq.setFromAxisAngle(_n, ang);
          c.quat.premultiply(dq);
        }

        const gy = this.groundAt(c.pos.x, c.pos.z) + 0.012 * c.scale;
        if (c.pos.y <= gy) {
          c.pos.y = gy;
          if (Math.abs(c.vel.y) < 0.6 && c.vel.lengthSq() < 0.5) {
            c.rest = 1; // settle
            c.vel.set(0, 0, 0);
            c.spin.multiplyScalar(0.1);
          } else {
            c.vel.y = -c.vel.y * 0.42;
            c.vel.x *= 0.6; c.vel.z *= 0.6;
            c.spin.multiplyScalar(0.6);
          }
        }
      }

      this.dummy.position.copy(c.pos);
      this.dummy.quaternion.copy(c.quat);
      this.dummy.scale.setScalar(c.scale);
      this.dummy.updateMatrix();
      this.casingMesh.setMatrixAt(i, this.dummy.matrix);
    }
    if (anyActive) this.casingMesh.instanceMatrix.needsUpdate = true;
  }

  /** GPU debris chunks thrown along a cone about `dir`. */
  chunks(pos: THREE.Vector3, dir: THREE.Vector3, opts: ChunkOpts) {
    _n.copy(dir).normalize();
    orthoBasis(_n, _t, _b);
    const rng = this.rng;
    for (let i = 0; i < opts.count; i++) {
      const a = rng() * TAU;
      const s = Math.tan(opts.spread) * Math.sqrt(rng());
      _d.copy(_n).addScaledVector(_t, Math.cos(a) * s).addScaledVector(_b, Math.sin(a) * s).normalize();
      const speed = opts.speedMin + rng() * (opts.speedMax - opts.speedMin);
      const d = this.engine.desc.reset();
      d.px = pos.x; d.py = pos.y; d.pz = pos.z;
      d.vx = _d.x * speed; d.vy = _d.y * speed + rng() * 2; d.vz = _d.z * speed;
      const shade = 0.7 + rng() * 0.5;
      d.r0 = opts.r * shade; d.g0 = opts.g * shade; d.b0 = opts.b * shade;
      d.r1 = opts.r * shade * 0.5; d.g1 = opts.g * shade * 0.5; d.b1 = opts.b * shade * 0.5;
      d.life = opts.life * (0.7 + rng() * 0.6);
      d.size0 = opts.sizeMin + rng() * (opts.sizeMax - opts.sizeMin);
      d.size1 = d.size0 * 0.85;
      d.gravity = opts.gravity;
      d.drag = 0.25;
      d.cell = ALP.CHUNK;
      d.fadeMode = 4;
      d.lit = true; d.soft = false;
      d.rot = rng() * TAU;
      d.rotSpeed = (rng() - 0.5) * 12;
      d.opacity = 1;
      this.engine.alpha.spawn(d);

      // smoke trail hint on the bigger pieces
      if (opts.trails && d.size0 > (opts.sizeMin + opts.sizeMax) * 0.5) {
        const t = this.engine.desc.reset();
        t.px = pos.x; t.py = pos.y; t.pz = pos.z;
        t.vx = _d.x * speed * 0.7; t.vy = _d.y * speed * 0.7 + 1; t.vz = _d.z * speed * 0.7;
        t.r0 = 0.16; t.g0 = 0.15; t.b0 = 0.14;
        t.r1 = 0.07; t.g1 = 0.07; t.b1 = 0.07;
        t.life = clamp(d.life * 0.9, 0.5, 2);
        t.size0 = d.size0 * 2; t.size1 = d.size0 * 6;
        t.gravity = 1; t.drag = 1.2;
        t.cell = ALP.SMK0; t.frames = 8; t.fadeMode = 0;
        t.lit = true; t.soft = true; t.turb = true; t.turbAmt = 0.2;
        t.opacity = 0.55;
        this.engine.alpha.spawn(t);
        this.engine.markSoft(t.life);
      }
    }
  }

  dispose() {
    this.ctx.scene.remove(this.casingMesh);
    this.casingMesh.dispose();
    this.geom.dispose();
    this.mat.dispose();
  }
}

const _tmpQuat = new THREE.Quaternion();
