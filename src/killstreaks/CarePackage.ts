import * as THREE from 'three';
import type { KsServices } from './KillstreakSystem';
import { KS, ensureKillstreakStyles } from './killstreaks.css';
import { TAU, clamp } from '../core/MathX';

/**
 * CarePackage.ts — the 7-kill streak.
 *
 * A transport helicopter flies in (spinning main/tail rotors with motion-blur
 * discs, skids, a slung crate on a cable), releases a crate on a parachute that
 * physically falls, lands with a thud and a dust puff, and shows a capture
 * prompt. Securing it tops up ammo.
 */

type Phase = 'inbound' | 'release' | 'falling' | 'landed' | 'captured' | 'done';

const _v = new THREE.Vector3();

export class CarePackage {
  private phase: Phase = 'inbound';
  private heli = new THREE.Group();
  private crate = new THREE.Group();
  private chute = new THREE.Group();
  private mainRotor: THREE.Mesh | null = null;
  private tailRotor: THREE.Mesh | null = null;
  private geo: THREE.BufferGeometry[] = [];

  private drop = new THREE.Vector3();
  private heliPos = new THREE.Vector3();
  private crateVel = new THREE.Vector3();
  private groundY = 0;
  private t = 0;
  private captureProgress = 0;
  private life = 60;

  private dom: HTMLDivElement | null = null;
  private fill: HTMLDivElement | null = null;

  constructor(private sv: KsServices) {}

  call(dropPoint: THREE.Vector3) {
    this.drop.copy(dropPoint);
    this.groundY = this.sv.groundAt(dropPoint.x, dropPoint.z);
    this.drop.y = this.groundY;

    // Fly in from the nearest map edge along +x.
    const b = this.sv.level?.bounds;
    const edgeX = b ? b.min.x - 30 : this.drop.x - 80;
    this.heliPos.set(edgeX, 34, this.drop.z);

    this.build();
    this.sv.scene.add(this.heli, this.crate);
    this.crate.visible = false;
    this.sv.events.emit('ui:notify', { text: 'CARE PACKAGE INBOUND', tone: 'good' });
    this.sv.audio?.play('airstrike_rumble', { gain: 0.4, rate: 0.85 });
  }

  private build() {
    const geo = <T extends THREE.BufferGeometry>(x: T) => (this.geo.push(x), x);
    const body = this.sv.mats.heliBody;
    const dark = this.sv.mats.heliDark;
    const disc = this.sv.mats.rotorDisc;

    // --- Helicopter --------------------------------------------------------
    const fuse = new THREE.Mesh(geo(new THREE.CapsuleGeometry(1.5, 3.2, 6, 12)), body);
    fuse.rotation.z = Math.PI / 2;
    this.heli.add(fuse);
    const cockpit = new THREE.Mesh(geo(new THREE.SphereGeometry(1.4, 14, 12)), this.sv.mats.glass);
    cockpit.scale.set(1.1, 0.9, 1.3);
    cockpit.position.set(2.6, 0.1, 0);
    this.heli.add(cockpit);
    // Tail boom + fin.
    const boom = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.4, 0.24, 5.0, 10)), body);
    boom.rotation.z = Math.PI / 2;
    boom.position.set(-3.8, 0.3, 0);
    this.heli.add(boom);
    const fin = new THREE.Mesh(geo(new THREE.BoxGeometry(0.9, 1.4, 0.14)), dark);
    fin.position.set(-6.1, 0.9, 0);
    this.heli.add(fin);
    // Skids.
    for (const s of [-1, 1]) {
      const skid = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.09, 0.09, 4, 8)), dark);
      skid.rotation.x = Math.PI / 2;
      skid.position.set(0.4, -1.6, s * 1.2);
      this.heli.add(skid);
    }
    // Main rotor disc (blur) + blades.
    const mast = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.12, 0.12, 0.6, 8)), dark);
    mast.position.set(0.3, 1.7, 0);
    this.heli.add(mast);
    const rotor = new THREE.Mesh(geo(new THREE.CircleGeometry(6.2, 32)), disc);
    rotor.rotation.x = -Math.PI / 2;
    rotor.position.set(0.3, 2.0, 0);
    this.heli.add(rotor);
    this.mainRotor = rotor;
    for (let i = 0; i < 4; i++) {
      const blade = new THREE.Mesh(geo(new THREE.BoxGeometry(12, 0.06, 0.4)), dark);
      blade.position.set(0.3, 2.02, 0);
      blade.rotation.y = (i / 4) * TAU;
      rotor.add(blade);
      blade.position.set(0, 0.02, 0);
    }
    // Tail rotor.
    const tail = new THREE.Mesh(geo(new THREE.CircleGeometry(1.2, 20)), disc);
    tail.position.set(-6.1, 0.9, 0.25);
    this.heli.add(tail);
    this.tailRotor = tail;

    // Slung crate under the belly on a cable (reparented on release).
    this.buildCrate();
    this.crate.position.set(0.3, -3.2, 0);
    this.heli.add(this.crate);

    this.heli.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) m.castShadow = false;
    });
  }

  private buildCrate() {
    const geo = <T extends THREE.BufferGeometry>(x: T) => (this.geo.push(x), x);
    const crateMat = this.sv.mats.crate;
    const trim = this.sv.mats.crateTrim;

    const box = new THREE.Mesh(geo(new THREE.BoxGeometry(1.5, 1.4, 1.5)), crateMat);
    this.crate.add(box);
    // Straps.
    for (const ax of [0, 1]) {
      const strap = new THREE.Mesh(geo(new THREE.BoxGeometry(ax ? 0.16 : 1.55, 1.45, ax ? 1.55 : 0.16)), trim);
      this.crate.add(strap);
    }
    // Corner posts.
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) {
        const post = new THREE.Mesh(geo(new THREE.BoxGeometry(0.14, 1.45, 0.14)), trim);
        post.position.set(sx * 0.72, 0, sz * 0.72);
        this.crate.add(post);
      }
    // Beacon on top.
    const beacon = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.1, 0.1, 0.3, 8)), this.sv.mats.glowBlue);
    beacon.position.set(0, 0.85, 0);
    beacon.name = 'beacon';
    this.crate.add(beacon);

    // Parachute (built collapsed on the crate; expands on release).
    const canopy = new THREE.Mesh(geo(new THREE.SphereGeometry(3.4, 20, 12, 0, TAU, 0, Math.PI / 2)), this.sv.mats.chute);
    canopy.position.y = 4.6;
    this.chute.add(canopy);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      const cord = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.02, 0.02, 4.2, 4)), this.sv.mats.cord);
      cord.position.set(Math.cos(a) * 1.5, 2.5, Math.sin(a) * 1.5);
      cord.rotation.z = Math.cos(a) * 0.3;
      cord.rotation.x = -Math.sin(a) * 0.3;
      this.chute.add(cord);
    }
    this.chute.visible = false;
    this.crate.add(this.chute);
  }

  update(dt: number) {
    this.t += dt;
    this.life -= dt;
    if (this.mainRotor) this.mainRotor.rotation.y += dt * 34;
    if (this.tailRotor) this.tailRotor.rotation.x += dt * 46;

    switch (this.phase) {
      case 'inbound': {
        const target = _v.set(this.drop.x, 32, this.drop.z);
        this.heliPos.lerp(target, clamp(dt * 0.5, 0, 1));
        this.heli.position.copy(this.heliPos);
        this.heli.rotation.y = Math.atan2(this.drop.x - this.heliPos.x, this.drop.z - this.heliPos.z) - Math.PI / 2;
        this.heli.rotation.z = -0.08;
        if (this.heliPos.distanceTo(target) < 3) this.phase = 'release';
        break;
      }
      case 'release': {
        // Detach the crate into world space and deploy the chute.
        this.heli.remove(this.crate);
        this.crate.visible = true;
        this.crate.position.copy(this.heli.position).add(_v.set(0.3, -3.2, 0));
        this.crate.rotation.set(0, 0, 0);
        this.sv.scene.add(this.crate);
        this.chute.visible = true;
        this.crateVel.set(0, -0.5, 0);
        this.phase = 'falling';
        this.sv.audio?.play('cloth', { gain: 0.6 });
        break;
      }
      case 'falling': {
        // Parachute drag: gentle terminal velocity, a little sway.
        this.crateVel.y += (-9 - this.crateVel.y * 3.2) * dt; // approach ~ -2.8 m/s
        this.crate.position.addScaledVector(this.crateVel, dt);
        this.crate.position.x = this.drop.x + Math.sin(this.t * 1.3) * 0.6;
        this.crate.position.z = this.drop.z + Math.cos(this.t * 1.1) * 0.5;
        this.crate.rotation.z = Math.sin(this.t * 1.3) * 0.08;
        this.flyHeliOut(dt);
        if (this.crate.position.y - 0.7 <= this.groundY) {
          this.crate.position.y = this.groundY + 0.7;
          this.phase = 'landed';
          this.chute.visible = false;
          this.sv.vfx?.dustKickup(_v.set(this.drop.x, this.groundY, this.drop.z), 1.4);
          this.sv.audio?.playAt('land_hard', this.crate.position, { gain: 0.9 });
          this.sv.events.emit('ui:notify', { text: 'CARE PACKAGE DROPPED', sub: 'SECURE THE CRATE', tone: 'good' });
        }
        break;
      }
      case 'landed': {
        this.flyHeliOut(dt);
        this.tryCapture(dt);
        break;
      }
      case 'captured':
      case 'done':
        this.flyHeliOut(dt);
        break;
    }

    // Beacon blink.
    const beacon = this.crate.getObjectByName('beacon');
    if (beacon) beacon.visible = Math.sin(this.t * 6) > -0.3;

    if (this.life <= 0 && this.phase !== 'done') this.phase = 'done';
  }

  private flyHeliOut(dt: number) {
    // Peel away and climb out toward +x edge.
    this.heliPos.x += dt * 14;
    this.heliPos.y += dt * 2;
    this.heli.position.copy(this.heliPos);
    this.heli.rotation.z = 0.12;
    if (this.heliPos.x > (this.sv.level?.bounds.max.x ?? 42) + 40) this.heli.visible = false;
  }

  private tryCapture(dt: number) {
    const player = this.sv.player;
    if (!player) return;
    const d = player.position.distanceTo(this.crate.position);
    const near = d < 3.2;
    if (near) {
      this.showPrompt(true);
      const holding = this.sv.ctx.input.isDown('use') || this.sv.capture;
      if (holding) {
        this.captureProgress = clamp(this.captureProgress + dt / 1.2, 0, 1);
        if (this.fill) this.fill.style.width = `${this.captureProgress * 100}%`;
        if (this.captureProgress >= 1) this.secure();
      }
    } else {
      this.showPrompt(false);
    }
  }

  private secure() {
    this.phase = 'captured';
    this.showPrompt(false);
    this.crate.visible = false;
    this.sv.vfx?.dustKickup(this.crate.position, 0.6);
    this.sv.weapons?.giveAmmo(180);
    this.sv.events.emit('ui:notify', { text: 'RESUPPLY', sub: '+180 AMMO', tone: 'good' });
    this.sv.audio?.play('ui_objective', { gain: 0.8 });
  }

  private showPrompt(show: boolean) {
    if (typeof document === 'undefined') return;
    if (show && !this.dom) {
      ensureKillstreakStyles();
      const root = document.createElement('div');
      root.className = KS.root;
      const c = document.createElement('div');
      c.className = `${KS.capture} ${KS.show}`;
      c.innerHTML = `HOLD <kbd>F</kbd> TO SECURE CRATE<div class="${KS.captureBar}"><div class="${KS.captureFill}"></div></div>`;
      root.appendChild(c);
      document.body.appendChild(root);
      this.dom = root;
      this.fill = c.querySelector(`.${KS.captureFill}`);
    } else if (!show && this.dom) {
      this.dom.remove();
      this.dom = null;
      this.fill = null;
    }
  }

  get finished(): boolean {
    return this.phase === 'done' || this.phase === 'captured';
  }

  dispose() {
    this.showPrompt(false);
    this.sv.scene.remove(this.heli, this.crate);
    for (const g of this.geo) g.dispose();
    this.geo.length = 0;
  }
}
