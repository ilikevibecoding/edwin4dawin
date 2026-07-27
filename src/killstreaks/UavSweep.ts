import * as THREE from 'three';
import type { KsServices } from './KillstreakSystem';
import type { IActor } from '../core/Contracts';
import { TAU } from '../core/MathX';

/**
 * UavSweep.ts — the 3-kill recon streak.
 *
 * A slender fixed-wing drone circles high overhead for 30s while every hostile
 * is painted on the minimap. The revealed set is published on {@link revealed}
 * so the HUD (owned by another agent) can render enemy blips: read it via
 * `ctx.get<KillstreakSystem>('killstreaks').revealedEnemies`.
 */
export class UavSweep {
  /** Live positions of every revealed hostile, refreshed each frame. */
  readonly revealed: THREE.Vector3[] = [];

  private group = new THREE.Group();
  private geo: THREE.BufferGeometry[] = [];
  private life = 30;
  private angle = Math.random() * TAU;
  private center = new THREE.Vector3();
  private radius = 46;
  private alt = 74;
  private done = false;

  constructor(private sv: KsServices) {
    this.build();
    const b = sv.level?.bounds;
    if (b) b.getCenter(this.center);
    this.center.y = 0;
    sv.scene.add(this.group);
    sv.hud?.notify('UAV RECON ONLINE', 'ENEMIES REVEALED', 'good');
    sv.audio?.play('airstrike_rumble', { gain: 0.25, rate: 1.5 });
  }

  private build() {
    const geo = <T extends THREE.BufferGeometry>(x: T) => (this.geo.push(x), x);
    const body = this.sv.mats.droneBody;
    const dark = this.sv.mats.heliDark;

    const fuse = new THREE.Mesh(geo(new THREE.CapsuleGeometry(0.35, 2.6, 6, 10)), body);
    fuse.rotation.x = Math.PI / 2;
    this.group.add(fuse);
    // Nose sensor ball.
    const ball = new THREE.Mesh(geo(new THREE.SphereGeometry(0.32, 12, 10)), dark);
    ball.position.z = -1.5;
    this.group.add(ball);
    // Straight high-aspect wings.
    const wing = new THREE.Mesh(geo(new THREE.BoxGeometry(9, 0.12, 0.9)), body);
    wing.position.y = 0.18;
    this.group.add(wing);
    // Downturned wingtips.
    for (const s of [-1, 1]) {
      const tip = new THREE.Mesh(geo(new THREE.BoxGeometry(0.12, 0.5, 0.7)), body);
      tip.position.set(s * 4.5, 0.0, 0);
      this.group.add(tip);
    }
    // V-tail.
    for (const s of [-1, 1]) {
      const tail = new THREE.Mesh(geo(new THREE.BoxGeometry(0.1, 1.1, 0.7)), body);
      tail.position.set(0, 0.4, 1.5);
      tail.rotation.z = s * 0.6;
      this.group.add(tail);
    }
    // Blinking nav strobe.
    const strobe = new THREE.Mesh(geo(new THREE.SphereGeometry(0.12, 8, 8)), this.sv.mats.glowRed);
    strobe.name = 'strobe';
    strobe.position.set(0, -0.2, -1.0);
    this.group.add(strobe);

    this.group.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) m.castShadow = false;
    });
  }

  update(dt: number) {
    if (this.done) return;
    this.life -= dt;

    // Circle high overhead, banked into the turn.
    this.angle += dt * 0.35;
    const x = this.center.x + Math.cos(this.angle) * this.radius;
    const z = this.center.z + Math.sin(this.angle) * this.radius;
    this.group.position.set(x, this.alt, z);
    // Face along the tangent.
    const tx = -Math.sin(this.angle);
    const tz = Math.cos(this.angle);
    this.group.rotation.y = Math.atan2(tx, tz);
    this.group.rotation.z = 0.28;

    const strobe = this.group.getObjectByName('strobe');
    if (strobe) strobe.visible = Math.sin(this.life * 8) > 0;

    // Refresh the revealed set.
    this.revealed.length = 0;
    const hostiles = (this.sv.ai?.hostiles() ?? []) as IActor[];
    for (const h of hostiles) this.revealed.push(h.position);

    if (this.life <= 0) {
      this.done = true;
      this.revealed.length = 0;
      this.group.visible = false;
      this.sv.hud?.notify('UAV OFFLINE', undefined, 'info');
    }
  }

  get active(): boolean {
    return !this.done;
  }

  get finished(): boolean {
    return this.done;
  }

  dispose() {
    this.sv.scene.remove(this.group);
    for (const g of this.geo) g.dispose();
    this.geo.length = 0;
    this.revealed.length = 0;
  }
}
