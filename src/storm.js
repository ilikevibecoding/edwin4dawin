import * as THREE from 'three';
import { STORM_PHASES, STORM_START_RADIUS, HALF } from './config.js';
import { lerp, formatTime } from './utils.js';

export class Storm {
  constructor(game) {
    this.game = game;
    const rng = game.rng;
    this.center = new THREE.Vector2(rng.range(-70, 70), rng.range(-70, 70));
    this.radius = STORM_START_RADIUS;
    this.phaseIndex = 0;
    this.phaseTime = 0;
    this.shrinking = false;
    this.fromCenter = this.center.clone();
    this.fromRadius = this.radius;
    this.nextCenter = this.center.clone();
    this.nextRadius = this.radius;
    this.finished = false;
    this.computeNext();

    const geo = new THREE.CylinderGeometry(1, 1, 500, 96, 1, true);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x9b3dff, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false, fog: false,
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.y = 200;
    this.mesh.renderOrder = 5;
    game.scene.add(this.mesh);
    this.updateMesh();
  }

  get phase() {
    return STORM_PHASES[Math.min(this.phaseIndex, STORM_PHASES.length - 1)];
  }

  get dps() {
    return this.phase.dps;
  }

  computeNext() {
    if (this.phaseIndex >= STORM_PHASES.length) {
      this.finished = true;
      return;
    }
    const ph = STORM_PHASES[this.phaseIndex];
    const rng = this.game.rng;
    this.nextRadius = ph.radius;
    const maxShift = Math.max(0, this.radius - ph.radius) * 0.85;
    const ang = rng.range(0, Math.PI * 2);
    const dist = rng.range(0, maxShift);
    const nx = this.center.x + Math.cos(ang) * dist;
    const nz = this.center.y + Math.sin(ang) * dist;
    // keep the safe zone over the island
    const lim = HALF - 110;
    this.nextCenter.set(Math.max(-lim, Math.min(lim, nx)), Math.max(-lim, Math.min(lim, nz)));
  }

  update(dt) {
    if (this.finished) {
      this.radius = Math.max(0, this.radius - dt * 0.5);
      this.updateMesh();
      return;
    }
    const ph = STORM_PHASES[this.phaseIndex];
    this.phaseTime += dt;
    if (!this.shrinking) {
      if (this.phaseTime >= ph.wait) {
        this.shrinking = true;
        this.phaseTime = 0;
        this.fromCenter.copy(this.center);
        this.fromRadius = this.radius;
        this.game.hud.announce('THE STORM IS CLOSING IN', 'Get to the safe zone', 2.8);
        this.game.audio.play('zone');
      }
    } else {
      const t = Math.min(1, this.phaseTime / ph.shrink);
      this.center.lerpVectors(this.fromCenter, this.nextCenter, t);
      this.radius = lerp(this.fromRadius, this.nextRadius, t);
      if (t >= 1) {
        this.shrinking = false;
        this.phaseTime = 0;
        this.phaseIndex++;
        this.computeNext();
      }
    }
    this.updateMesh();
  }

  updateMesh() {
    const r = Math.max(0.5, this.radius);
    this.mesh.position.x = this.center.x;
    this.mesh.position.z = this.center.y;
    this.mesh.scale.set(r, 1, r);
  }

  isOutside(x, z) {
    const dx = x - this.center.x;
    const dz = z - this.center.y;
    return dx * dx + dz * dz > this.radius * this.radius;
  }

  distanceOutside(x, z) {
    return Math.hypot(x - this.center.x, z - this.center.y) - this.radius;
  }

  statusText() {
    if (this.finished) return 'FINAL STORM';
    const ph = STORM_PHASES[this.phaseIndex];
    if (this.shrinking) return `STORM SHRINKING  ${formatTime(ph.shrink - this.phaseTime)}`;
    return `STORM MOVES IN  ${formatTime(ph.wait - this.phaseTime)}`;
  }
}
