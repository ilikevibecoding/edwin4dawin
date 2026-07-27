import * as THREE from 'three';
import type { KsServices } from './KillstreakSystem';
import type { IActor } from '../core/Contracts';
import { TAU, clamp } from '../core/MathX';

/**
 * AttackHelicopter.ts — the 9-kill gunship.
 *
 * Orbits the map, acquires hostiles, hoses them with a chin-gun tracer stream
 * and salvos rockets, kicks up rotor-wash dust on the ground below, and can be
 * shot down — a health pool, then a smoking death spiral into a crash blast.
 */

type Phase = 'orbit' | 'dying' | 'done';

interface Rocket {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  target: THREE.Vector3;
  life: number;
}

const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _gun = new THREE.Vector3();
const _aim = new THREE.Vector3();

export class AttackHelicopter {
  private phase: Phase = 'orbit';
  private group = new THREE.Group();
  private mainRotor: THREE.Mesh | null = null;
  private tailRotor: THREE.Mesh | null = null;
  private gunNode = new THREE.Object3D();
  private geo: THREE.BufferGeometry[] = [];
  private ownMat: THREE.Material[] = [];

  private center = new THREE.Vector3();
  private angle = Math.random() * TAU;
  private radius = 42;
  private alt = 28;
  private health = 100;
  private life = 45;

  private fireAcc = 0;
  private rocketAcc = 0;
  private washAcc = 0;
  private rockets: Rocket[] = [];

  private dieVel = new THREE.Vector3();
  private dieSpin = 0;
  private trailAcc = 0;

  constructor(private sv: KsServices) {
    const b = sv.level?.bounds;
    if (b) b.getCenter(this.center);
    this.center.y = 0;
    this.build();
    sv.scene.add(this.group);
    sv.events.emit('ui:notify', { text: 'ATTACK HELO ON STATION', tone: 'good' });
    sv.audio?.play('airstrike_rumble', { gain: 0.5, rate: 0.7 });
  }

  private build() {
    const geo = <T extends THREE.BufferGeometry>(x: T) => (this.geo.push(x), x);
    const body = this.sv.mats.heliBody;
    const dark = this.sv.mats.heliDark;
    const disc = this.sv.mats.rotorDisc;

    const fuse = new THREE.Mesh(geo(new THREE.CapsuleGeometry(0.85, 4.2, 6, 12)), body);
    fuse.rotation.z = Math.PI / 2;
    this.group.add(fuse);
    // Tandem canopy.
    const canopy = new THREE.Mesh(geo(new THREE.SphereGeometry(0.8, 14, 12)), this.sv.mats.glass);
    canopy.scale.set(1.6, 0.8, 0.9);
    canopy.position.set(2.4, 0.3, 0);
    this.group.add(canopy);
    // Chin gun turret.
    const gun = new THREE.Mesh(geo(new THREE.BoxGeometry(0.9, 0.4, 0.4)), dark);
    gun.position.set(3.4, -0.7, 0);
    this.group.add(gun);
    const barrel = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.07, 0.07, 1.1, 8)), dark);
    barrel.rotation.z = Math.PI / 2;
    barrel.position.set(4.0, -0.7, 0);
    this.group.add(barrel);
    this.gunNode.position.set(4.6, -0.7, 0);
    this.group.add(this.gunNode);
    // Stub wings + rocket pods.
    for (const s of [-1, 1]) {
      const wing = new THREE.Mesh(geo(new THREE.BoxGeometry(0.7, 0.16, 1.2)), body);
      wing.position.set(0.4, 0.1, s * 1.1);
      this.group.add(wing);
      const pod = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.28, 0.28, 1.2, 10)), dark);
      pod.rotation.z = Math.PI / 2;
      pod.position.set(0.4, -0.25, s * 1.5);
      this.group.add(pod);
    }
    // Tail boom + fin + rotors.
    const boom = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.28, 0.16, 4.6, 10)), body);
    boom.rotation.z = Math.PI / 2;
    boom.position.set(-4.0, 0.2, 0);
    this.group.add(boom);
    const fin = new THREE.Mesh(geo(new THREE.BoxGeometry(0.7, 1.1, 0.12)), dark);
    fin.position.set(-6.2, 0.7, 0);
    this.group.add(fin);
    for (const s of [-1, 1]) {
      const skid = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.07, 0.07, 3.4, 8)), dark);
      skid.rotation.x = Math.PI / 2;
      skid.position.set(0.2, -1.2, s * 0.9);
      this.group.add(skid);
    }
    const mast = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.1, 0.1, 0.5, 8)), dark);
    mast.position.set(0.2, 1.2, 0);
    this.group.add(mast);
    const rotor = new THREE.Mesh(geo(new THREE.CircleGeometry(5.4, 32)), disc);
    rotor.rotation.x = -Math.PI / 2;
    rotor.position.set(0.2, 1.5, 0);
    this.group.add(rotor);
    this.mainRotor = rotor;
    for (let i = 0; i < 4; i++) {
      const blade = new THREE.Mesh(geo(new THREE.BoxGeometry(10.6, 0.06, 0.35)), dark);
      blade.rotation.y = (i / 4) * TAU;
      rotor.add(blade);
    }
    const tail = new THREE.Mesh(geo(new THREE.CircleGeometry(1.0, 18)), disc);
    tail.position.set(-6.2, 0.7, 0.2);
    this.group.add(tail);
    this.tailRotor = tail;

    this.group.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) m.castShadow = false;
    });
  }

  /** External damage hook (e.g. the player shooting it down). */
  damage(amount: number) {
    if (this.phase !== 'orbit') return;
    this.health -= amount;
    if (this.health <= 0) this.beginDeath();
  }

  private beginDeath() {
    this.phase = 'dying';
    this.dieVel.set((this.sv.rng() - 0.5) * 6, -2, (this.sv.rng() - 0.5) * 6);
    this.dieSpin = 4 + this.sv.rng() * 3;
    this.sv.events.emit('ui:notify', { text: 'HELO DOWN', tone: 'bad' });
    this.sv.audio?.play('airstrike_rumble', { gain: 0.7, rate: 0.5 });
  }

  update(dt: number) {
    if (this.phase === 'done') return;
    this.life -= dt;
    if (this.mainRotor) this.mainRotor.rotation.y += dt * (this.phase === 'dying' ? 12 : 40);
    if (this.tailRotor) this.tailRotor.rotation.x += dt * 52;

    if (this.phase === 'orbit') {
      this.orbit(dt);
      this.combat(dt);
      this.rotorWash(dt);
      if (this.life <= 0) this.leave(dt);
    } else if (this.phase === 'dying') {
      this.spiral(dt);
    }

    this.updateRockets(dt);
  }

  private orbit(dt: number) {
    this.angle += dt * 0.28;
    const x = this.center.x + Math.cos(this.angle) * this.radius;
    const z = this.center.z + Math.sin(this.angle) * this.radius;
    this.group.position.set(x, this.alt, z);
    this.group.rotation.y = Math.atan2(-Math.sin(this.angle), Math.cos(this.angle)) - Math.PI / 2;
    this.group.rotation.z = 0.18;
  }

  private leave(dt: number) {
    this.alt += dt * 3;
    this.radius += dt * 20;
    if (this.radius > 200) this.phase = 'done';
  }

  private combat(dt: number) {
    const hostiles = (this.sv.ai?.hostiles() ?? []) as IActor[];
    if (hostiles.length === 0) return;
    this.gunNode.getWorldPosition(_gun);

    // Chin-gun tracer stream at the nearest hostile.
    this.fireAcc -= dt;
    if (this.fireAcc <= 0) {
      this.fireAcc = 0.08;
      const t = this.pickTarget(hostiles, _gun);
      if (t) {
        _aim.copy(t.position).setY(t.position.y + 1);
        _aim.x += (this.sv.rng() - 0.5) * 1.6;
        _aim.z += (this.sv.rng() - 0.5) * 1.6;
        this.sv.vfx?.tracer(_gun, _aim, 260, 1.4);
      }
    }

    // Rocket salvo occasionally.
    this.rocketAcc -= dt;
    if (this.rocketAcc <= 0) {
      this.rocketAcc = 3.2 + this.sv.rng() * 2;
      const t = this.pickTarget(hostiles, _gun);
      if (t) this.fireRocket(_aim.copy(t.position).setY(t.position.y + 1));
    }
  }

  private pickTarget(hostiles: IActor[], from: THREE.Vector3): IActor | null {
    let best: IActor | null = null;
    let bestD = Infinity;
    for (const h of hostiles) {
      const d = from.distanceToSquared(h.position);
      if (d < bestD) {
        bestD = d;
        best = h;
      }
    }
    return best;
  }

  private fireRocket(target: THREE.Vector3) {
    const mat = this.sv.mats.heliDark;
    const mesh = new THREE.Mesh(this.rocketGeo(), mat);
    this.gunNode.getWorldPosition(mesh.position);
    _a.copy(target).sub(mesh.position).normalize();
    const rocket: Rocket = { mesh, vel: _a.clone().multiplyScalar(90), target: target.clone(), life: 3 };
    this.sv.scene.add(mesh);
    this.rockets.push(rocket);
    this.sv.vfx?.muzzleFlash(mesh.position, _a, 0.8);
  }

  private _rocketGeo: THREE.BufferGeometry | null = null;
  private rocketGeo(): THREE.BufferGeometry {
    if (!this._rocketGeo) {
      this._rocketGeo = new THREE.CapsuleGeometry(0.12, 0.5, 4, 6);
      this.geo.push(this._rocketGeo);
    }
    return this._rocketGeo;
  }

  private updateRockets(dt: number) {
    for (let i = this.rockets.length - 1; i >= 0; i--) {
      const r = this.rockets[i];
      r.life -= dt;
      r.mesh.position.addScaledVector(r.vel, dt);
      this.sv.vfx?.smokePlume(r.mesh.position, 0.18, 0.4);
      const reached = r.mesh.position.distanceToSquared(r.target) < 4;
      if (reached || r.life <= 0) {
        this.sv.events.emit('explosion', {
          position: r.mesh.position.clone(),
          radius: 6,
          damage: 120,
          force: 700,
          kind: 'rocket',
        });
        this.sv.scene.remove(r.mesh);
        this.rockets.splice(i, 1);
      }
    }
  }

  private rotorWash(dt: number) {
    this.washAcc -= dt;
    if (this.washAcc > 0) return;
    this.washAcc = 0.25;
    const gy = this.sv.groundAt(this.group.position.x, this.group.position.z);
    _b.set(this.group.position.x, gy, this.group.position.z);
    this.sv.vfx?.dustKickup(_b, 0.7);
  }

  private spiral(dt: number) {
    this.dieVel.y -= 9 * dt;
    this.group.position.addScaledVector(this.dieVel, dt);
    this.group.rotation.y += this.dieSpin * dt;
    this.group.rotation.z = clamp(this.group.rotation.z + dt * 0.8, 0, 1.4);
    this.group.rotation.x = clamp(this.group.rotation.x - dt * 0.5, -1.0, 0);

    // Smoke + fire trail.
    this.trailAcc -= dt;
    if (this.trailAcc <= 0) {
      this.trailAcc = 0.05;
      this.sv.vfx?.smokePlume(this.group.position, 1.0, 3);
      this.sv.vfx?.addFire(this.group.position, 0.8, 1.2);
    }

    const gy = this.sv.groundAt(this.group.position.x, this.group.position.z);
    if (this.group.position.y <= gy + 1) {
      this.group.position.y = gy + 1;
      this.sv.events.emit('explosion', {
        position: this.group.position.clone(),
        radius: 11,
        damage: 200,
        force: 1200,
        kind: 'bomb',
      });
      this.sv.vfx?.addFire(this.group.position, 3, 30);
      this.sv.vfx?.smokePlume(this.group.position, 3, 24);
      this.group.visible = false;
      this.phase = 'done';
    }
  }

  get finished(): boolean {
    return this.phase === 'done';
  }

  /** Current hull position (for the player's shoot-down aim check). */
  get worldPosition(): THREE.Vector3 {
    return this.group.position;
  }

  get alive(): boolean {
    return this.phase === 'orbit';
  }

  dispose() {
    for (const r of this.rockets) this.sv.scene.remove(r.mesh);
    this.rockets.length = 0;
    this.sv.scene.remove(this.group);
    for (const g of this.geo) g.dispose();
    for (const m of this.ownMat) m.dispose();
    this.geo.length = 0;
    this.ownMat.length = 0;
  }
}
