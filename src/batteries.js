import * as THREE from 'three';
import { settings } from './settings.js';
import { Rng } from './util/rng.js';
import * as G from './util/geo.js';
import * as M from './materials.js';
import * as T from './util/textures.js';
import { Kit } from './base.js';
import { clamp, saturate, lerp, damp, degToRad } from './util/mathx.js';

/**
 * The three fictional interceptor batteries.
 *
 * Each has a distinct silhouette, a distinct launch sequence and a distinct
 * (entirely invented) engagement envelope. Performance numbers here are
 * gameplay balance values, not any real system's capabilities.
 */

const UP = new THREE.Vector3(0, 1, 0);
const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _q = new THREE.Quaternion();

/** Shared, non-cached status lamp material (each battery needs its own). */
function statusLampMaterial(color = '#2bff8a') {
  return new THREE.MeshStandardMaterial({
    color: '#0b0b0b',
    emissive: new THREE.Color(color),
    emissiveIntensity: 3.2,
    roughness: 0.3,
    metalness: 0.1,
    toneMapped: false
  });
}

export const BATTERY_SPECS = {
  patriot: {
    id: 'patriot',
    name: 'HAWKEYE-T',
    subtitle: 'TERMINAL BATTERY',
    codeLetter: 'A',
    accent: '#5ad6ff',
    tubes: 4,
    ammo: 8,
    prepTime: 1.4,
    salvoGap: 0.55,
    reloadTime: 7.0,
    stowElevation: 12,
    fireElevation: 42,
    traverseRate: 55,
    elevateRate: 22,
    // Fictional envelope, tuned so terminal-phase intercepts read well.
    envelope: { minAlt: 60, maxAlt: 7500, minRange: 400, maxRange: 12000 },
    interceptor: {
      length: 5.3,
      radius: 0.21,
      boostAccel: 320,
      boostTime: 3.2,
      sustainAccel: 26,
      sustainTime: 5.0,
      maxSpeed: 1250,
      maxG: 26,
      responseRate: 7.5,
      bc: 3400,
      trailWidth: 1.3,
      plumeScale: 0.9,
      warhead: 22
    },
    coldLaunch: false,
    description: 'Fast reaction, tight envelope. Best against threats already in their terminal dive.'
  },
  thaad: {
    id: 'thaad',
    name: 'HIGHTOWER',
    subtitle: 'HIGH-ALTITUDE BATTERY',
    codeLetter: 'B',
    accent: '#ffb545',
    tubes: 6,
    ammo: 6,
    prepTime: 3.4,
    salvoGap: 0.9,
    reloadTime: 11.0,
    stowElevation: 6,
    fireElevation: 72,
    traverseRate: 32,
    elevateRate: 13,
    envelope: { minAlt: 1800, maxAlt: 26000, minRange: 2500, maxRange: 32000 },
    interceptor: {
      length: 6.6,
      radius: 0.24,
      boostAccel: 260,
      boostTime: 6.0,
      sustainAccel: 14,
      sustainTime: 10.0,
      maxSpeed: 1900,
      maxG: 15,
      responseRate: 4.6,
      bc: 9000,
      trailWidth: 1.7,
      plumeScale: 1.4,
      warhead: 30
    },
    coldLaunch: false,
    description: 'Slower to prepare, but reaches far higher and earlier in the descent.'
  },
  sentinel: {
    id: 'sentinel',
    name: 'SENTINEL',
    subtitle: 'LONG-RANGE TEST BATTERY',
    codeLetter: 'C',
    accent: '#c98bff',
    tubes: 2,
    ammo: 2,
    prepTime: 5.2,
    salvoGap: 3.0,
    reloadTime: 26.0,
    stowElevation: 0,
    fireElevation: 88,
    traverseRate: 20,
    elevateRate: 9,
    envelope: { minAlt: 3000, maxAlt: 60000, minRange: 3000, maxRange: 60000 },
    interceptor: {
      length: 9.4,
      radius: 0.34,
      boostAccel: 300,
      boostTime: 8.5,
      sustainAccel: 18,
      sustainTime: 14.0,
      maxSpeed: 2600,
      maxG: 11,
      responseRate: 3.4,
      bc: 16000,
      trailWidth: 2.6,
      plumeScale: 2.3,
      warhead: 46
    },
    coldLaunch: true,
    ejectSpeed: 42,
    ignitionDelay: 0.85,
    description: 'Experimental. Two rounds only, but the longest reach and the biggest show.'
  }
};

/* ------------------------------------------------------------------ *
 * Base class
 * ------------------------------------------------------------------ */

export class Battery {
  constructor(spec, anchor, scene, collision, rng) {
    this.spec = spec;
    this.id = spec.id;
    this.anchor = anchor;
    this.scene = scene;
    this.collision = collision;
    this.rng = rng;

    this.group = new THREE.Group();
    this.group.name = `battery-${spec.id}`;
    this.group.position.copy(anchor.pos);
    this.group.rotation.y = anchor.yaw;
    scene.add(this.group);

    this.turret = new THREE.Group();
    this.turret.name = 'turret';
    this.group.add(this.turret);

    this.erector = new THREE.Group();
    this.erector.name = 'erector';
    this.turret.add(this.erector);

    /** Rounds remaining for the whole engagement. */
    this.ammo = spec.ammo;
    this.maxAmmo = spec.ammo;
    /** Rounds currently sitting in tubes and ready to fire. */
    this.loaded = Math.min(spec.tubes, spec.ammo);
    this.state = 'ready';
    this.stateTimer = 0;
    this.assignedTrack = null;
    this.tubeSpent = new Array(spec.tubes).fill(false);
    this.nextTube = 0;

    this.traverse = 0;
    this.targetTraverse = 0;
    this.elevation = degToRad(spec.stowElevation);
    this.targetElevation = degToRad(spec.stowElevation);
    this.hydraulics = [];
    this.lamps = [];
    this.lampMaterials = {};
    this.tubes = [];
    this.covers = [];
    this.time = 0;
    this.lastLaunchAt = -999;
  }

  get displayName() {
    return this.spec.name;
  }

  get ready() {
    return (this.state === 'ready' || this.state === 'armed') && this.loaded > 0;
  }

  get armed() {
    return this.state === 'armed' && this.loaded > 0;
  }

  get statusText() {
    if (this.ammo <= 0 && this.state !== 'firing') return 'WINCHESTER';
    switch (this.state) {
      case 'ready': return 'READY';
      case 'armed': return 'ARMED';
      case 'preparing': return 'PREPARING';
      case 'firing': return 'FIRING';
      case 'reloading': return 'RELOADING';
      case 'offline': return 'OFFLINE';
      default: return this.state.toUpperCase();
    }
  }

  get statusColor() {
    if (this.ammo <= 0 && this.state !== 'firing') return '#ff5a4a';
    if (this.state === 'armed') return '#7cff5a';
    if (this.state === 'ready') return '#3dff9b';
    if (this.state === 'preparing' || this.state === 'firing') return '#ffc247';
    if (this.state === 'reloading') return '#ff8a3d';
    return '#8a8f96';
  }

  /** Fraction of the current timed state that has elapsed (for progress bars). */
  get progress() {
    if (this.state === 'preparing') return 1 - this.stateTimer / this.spec.prepTime;
    if (this.state === 'reloading') return 1 - this.stateTimer / this.spec.reloadTime;
    if (this.state === 'firing') return 1 - this.stateTimer / this.spec.salvoGap;
    return 1;
  }

  /** Fictional engagement check used for UI feedback and gating. */
  canEngage(threat) {
    if (!threat || !threat.alive) return { ok: false, reason: 'NO TRACK' };
    if (this.loaded <= 0 && this.ammo <= 0) return { ok: false, reason: 'NO ROUNDS' };
    if (this.state === 'reloading') return { ok: false, reason: 'RELOADING' };
    if (this.state === 'firing') return { ok: false, reason: 'FIRING' };
    const e = this.spec.envelope;
    const alt = threat.pos.y;
    const range = _v.copy(threat.pos).sub(this.worldPosition).length();
    if (alt > e.maxAlt) return { ok: false, reason: 'TOO HIGH' };
    if (alt < e.minAlt) return { ok: false, reason: 'TOO LOW' };
    if (range > e.maxRange) return { ok: false, reason: 'OUT OF RANGE' };
    if (range < e.minRange) return { ok: false, reason: 'TOO CLOSE' };
    return { ok: true, reason: 'IN ENVELOPE' };
  }

  get worldPosition() {
    if (!this._worldPos) this._worldPos = new THREE.Vector3();
    return this._worldPos.copy(this.anchor.pos).setY(this.launchHeight ?? 3);
  }

  /** Point the launcher at a track (or return to stow when unassigned). */
  aimAt(worldPoint) {
    if (!worldPoint) {
      this.targetTraverse = 0;
      this.targetElevation = degToRad(this.spec.stowElevation);
      return;
    }
    _v.copy(worldPoint).sub(this.group.position);
    // Traverse is measured in the battery's local frame.
    const local = _v.clone().applyAxisAngle(UP, -this.anchor.yaw);
    this.targetTraverse = Math.atan2(local.x, -local.z);
    const horiz = Math.hypot(local.x, local.z);
    const desired = Math.atan2(local.y, horiz);
    // The launcher never depresses below its stow angle, and tops out near
    // vertical - a deliberately simple presentation rule.
    this.targetElevation = clamp(
      lerp(degToRad(this.spec.fireElevation), desired, 0.45),
      degToRad(this.spec.stowElevation),
      degToRad(89)
    );
  }

  /** Muzzle transform for a tube index, in world space. */
  getTubeTransform(index, outPos = new THREE.Vector3(), outDir = new THREE.Vector3()) {
    const tube = this.tubes[index % this.tubes.length];
    outPos.copy(tube.muzzle);
    this.erector.localToWorld(outPos);
    outDir.set(0, 1, 0).applyQuaternion(this.erector.getWorldQuaternion(_q)).normalize();
    return { pos: outPos, dir: outDir };
  }

  /** Begin the prepare -> fire sequence. Returns false if unavailable. */
  beginEngagement(track) {
    if (!this.ready) return false;
    this.assignedTrack = track;
    this.state = 'preparing';
    this.stateTimer = this.spec.prepTime;
    return true;
  }

  cancelEngagement() {
    if (this.state === 'preparing') {
      this.state = 'ready';
      this.stateTimer = 0;
    }
    this.assignedTrack = null;
  }

  /** Consume a round and return the tube used, or -1. */
  consumeTube() {
    if (this.loaded <= 0) return -1;
    let idx = -1;
    for (let i = 0; i < this.spec.tubes; i++) {
      const t = (this.nextTube + i) % this.spec.tubes;
      if (!this.tubeSpent[t]) {
        idx = t;
        break;
      }
    }
    if (idx < 0) return -1;
    this.tubeSpent[idx] = true;
    this.nextTube = (idx + 1) % this.spec.tubes;
    this.ammo--;
    this.loaded--;
    if (this.covers[idx]) this.covers[idx].visible = false;
    return idx;
  }

  setState(state, timer = 0) {
    this.state = state;
    this.stateTimer = timer;
  }

  update(dt) {
    this.time += dt;

    if (this.stateTimer > 0) {
      this.stateTimer = Math.max(0, this.stateTimer - dt);
      if (this.stateTimer === 0) this._onTimerElapsed();
    }

    // Smooth, motorised traverse and elevation.
    const trRate = degToRad(this.spec.traverseRate) * dt;
    let dTr = this.targetTraverse - this.traverse;
    while (dTr > Math.PI) dTr -= Math.PI * 2;
    while (dTr < -Math.PI) dTr += Math.PI * 2;
    this.traverse += clamp(dTr, -trRate, trRate);
    const elRate = degToRad(this.spec.elevateRate) * dt;
    this.elevation += clamp(this.targetElevation - this.elevation, -elRate, elRate);

    this.turret.rotation.y = this.traverse;
    this.erector.rotation.x = -this.elevation;

    this._updateHydraulics();
    this._updateLamps();
  }

  /**
   * State machine: preparing -> armed -> firing -> (ready | reloading | empty).
   * Rounds live in tubes; when the pallet runs dry the crew reloads, and when
   * the magazine runs dry the battery is out for the rest of the engagement.
   */
  _onTimerElapsed() {
    if (this.state === 'preparing') {
      this.state = 'armed';
    } else if (this.state === 'firing') {
      if (this.loaded <= 0 && this.ammo > 0) {
        this.state = 'reloading';
        this.stateTimer = this.spec.reloadTime;
      } else if (this.ammo <= 0) {
        this.state = 'empty';
      } else {
        this.state = this.assignedTrack && this.assignedTrack.alive ? 'armed' : 'ready';
      }
    } else if (this.state === 'reloading') {
      this.loaded = Math.min(this.spec.tubes, this.ammo);
      this.tubeSpent.fill(false);
      for (let i = 0; i < this.covers.length; i++) this.covers[i].visible = i < this.loaded;
      this.state = this.ammo > 0 ? 'ready' : 'empty';
    }
  }

  /** Called by the game right after a round leaves the tube. */
  onFired() {
    this.state = 'firing';
    this.stateTimer = this.spec.salvoGap;
    this.lastLaunchAt = this.time;
  }

  /** Hydraulic rams stretch to follow the erector. */
  _updateHydraulics() {
    if (this.hydraulics.length === 0) return;
    // The rams read live world transforms, so refresh them after this frame's
    // traverse/elevation update rather than waiting for the render pass.
    this.group.updateMatrixWorld(true);
    for (const h of this.hydraulics) {
      const anchorWorld = _v.copy(h.baseLocal);
      this.turret.localToWorld(anchorWorld);
      const tipWorld = _v2.copy(h.tipLocal);
      this.erector.localToWorld(tipWorld);
      const len = anchorWorld.distanceTo(tipWorld);
      h.mesh.position.copy(anchorWorld).lerp(tipWorld, 0.5);
      this.group.worldToLocal(h.mesh.position);
      _v2.sub(anchorWorld).normalize();
      h.mesh.quaternion.setFromUnitVectors(UP, _v2.applyQuaternion(_q.copy(this.group.quaternion).invert()));
      h.mesh.scale.set(1, Math.max(0.05, len / h.restLength), 1);
    }
  }

  _updateLamps() {
    const c = this.statusColor;
    const pulse =
      this.state === 'preparing' || this.state === 'firing'
        ? 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(this.time * 9))
        : this.state === 'reloading'
          ? 0.35 + 0.35 * (0.5 + 0.5 * Math.sin(this.time * 3.2))
          : 1;
    for (const key of Object.keys(this.lampMaterials)) {
      const m = this.lampMaterials[key];
      m.emissive.set(c);
      m.emissiveIntensity = 2.6 * pulse;
    }
  }

  /** Which visual launch treatment this battery uses. */
  get launchStyle() {
    return this.spec.coldLaunch ? 'cold' : 'hot';
  }

  /* -------- shared construction helpers -------- */

  _addStatusPanel(kit, pos, yaw = 0, key = 'main') {
    const dark = M.darkMetal();
    kit.place(dark, G.roundedBox(0.5, 0.34, 0.12, 0.02), pos, [0, yaw, 0]);
    const mat = statusLampMaterial('#3dff9b');
    this.lampMaterials[key] = mat;
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.075, 12), mat);
    lens.position.set(pos[0], pos[1] + 0.07, pos[2] - 0.07);
    lens.rotation.y = yaw + Math.PI;
    this.group.add(lens);
    const lens2 = new THREE.Mesh(new THREE.CircleGeometry(0.05, 10), mat);
    lens2.position.set(pos[0] + 0.16, pos[1] - 0.07, pos[2] - 0.07);
    lens2.rotation.y = yaw + Math.PI;
    this.group.add(lens2);
  }

  _addHydraulic(baseLocal, tipLocal, radius = 0.075) {
    const rest = new THREE.Vector3().fromArray(baseLocal).distanceTo(new THREE.Vector3().fromArray(tipLocal));
    const geo = new THREE.CylinderGeometry(radius, radius * 1.15, rest, 10);
    const barrel = new THREE.Mesh(geo, M.metal('#4a4e46', 0.5, 0.9));
    barrel.castShadow = settings.quality.shadows;
    this.group.add(barrel);
    // Chromed rod peeking out of the barrel.
    const rod = new THREE.Mesh(
      new THREE.CylinderGeometry(radius * 0.5, radius * 0.5, rest * 1.1, 8),
      M.chrome()
    );
    rod.castShadow = false;
    barrel.add(rod);
    this.hydraulics.push({
      mesh: barrel,
      baseLocal: new THREE.Vector3().fromArray(baseLocal),
      tipLocal: new THREE.Vector3().fromArray(tipLocal),
      restLength: rest
    });
  }
}

/* ------------------------------------------------------------------ *
 * HAWKEYE-T : Patriot-inspired terminal battery
 * ------------------------------------------------------------------ */

class TerminalBattery extends Battery {
  build() {
    const kit = new Kit();
    const rng = this.rng;
    const body = M.camoMat('desert', 1.1);
    const painted = M.painted('#6b6f5e', { repeat: 1.8 });
    const dark = M.darkMetal();
    const heat = M.heatMat('#4a4640');

    // --- trailer chassis ---
    kit.place(dark, new THREE.BoxGeometry(7.6, 0.34, 2.5), [0, 0.72, 0]);
    kit.place(body, G.roundedBox(2.2, 0.9, 2.4, 0.08), [-2.6, 1.32, 0]);
    // Drawbar.
    kit.place(dark, new THREE.BoxGeometry(2.4, 0.2, 0.28), [-4.6, 0.7, 0]);
    kit.place(dark, new THREE.CylinderGeometry(0.16, 0.16, 0.3, 10), [-5.7, 0.66, 0]);
    // Wheels.
    const wheel = new THREE.CylinderGeometry(0.62, 0.62, 0.42, 14);
    wheel.rotateX(Math.PI / 2);
    for (const x of [1.4, 2.7]) {
      for (const z of [-1.3, 1.3]) {
        kit.place(M.rubberMat(1.2), wheel, [x, 0.62, z]);
        kit.place(M.metal('#6e6e66', 0.5, 0.85), new THREE.CylinderGeometry(0.2, 0.2, 0.44, 8), [x, 0.62, z], [Math.PI / 2, 0, 0]);
      }
    }
    // Outrigger jacks planted on the pad.
    for (const [x, z] of [[-2.2, -1.7], [-2.2, 1.7], [3.4, -1.7], [3.4, 1.7]]) {
      kit.place(dark, new THREE.CylinderGeometry(0.09, 0.09, 0.95, 8), [x, 0.5, z]);
      kit.place(M.metal('#8b8f88', 0.42, 0.9), new THREE.CylinderGeometry(0.34, 0.38, 0.1, 12), [x, 0.05, z]);
    }
    // Power / hydraulic pack and cable spool.
    kit.place(painted, G.roundedBox(1.5, 0.9, 1.6, 0.06), [-1.0, 1.35, 0]);
    kit.place(heat, G.pipe(0.08, 0.9, 0.018, 8), [-1.5, 2.2, 0.5]);
    kit.place(dark, new THREE.CylinderGeometry(0.42, 0.42, 0.5, 14), [-2.6, 1.05, 1.35], [Math.PI / 2, 0, 0]);
    this._addStatusPanel(kit, [-2.6, 1.6, -1.25], 0, 'main');

    this.launchHeight = 3.2;
    this.group.add(kit.build('terminal-chassis'));

    // --- turret ring ---
    const turretKit = new Kit();
    turretKit.place(painted, new THREE.CylinderGeometry(1.15, 1.35, 0.42, 20), [0.4, 1.1, 0]);
    turretKit.place(dark, new THREE.TorusGeometry(1.2, 0.06, 8, 24), [0.4, 1.32, 0], [Math.PI / 2, 0, 0]);
    // Erector trunnion posts.
    turretKit.place(M.metal('#585c52', 0.5, 0.9), new THREE.BoxGeometry(0.28, 1.1, 0.3), [0.4, 1.85, -1.05]);
    turretKit.place(M.metal('#585c52', 0.5, 0.9), new THREE.BoxGeometry(0.28, 1.1, 0.3), [0.4, 1.85, 1.05]);
    this.turret.add(turretKit.build('terminal-turret'));

    // --- erector: a box of four rectangular canisters ---
    const eKit = new Kit();
    const canW = 0.62;
    const canH = 0.62;
    const canL = 5.6;
    const frameMat = M.painted('#5c6152', { repeat: 1.6, panels: 3 });
    const canMat = M.camoMat('grey', 1.6);

    // Frame around the canister pallet.
    eKit.place(frameMat, new THREE.BoxGeometry(1.55, 0.14, canL + 0.4), [0, -0.42, 0], [Math.PI / 2, 0, 0]);
    for (const sx of [-0.72, 0.72]) {
      eKit.place(frameMat, new THREE.BoxGeometry(0.12, canL + 0.4, 0.9), [sx, 0, 0], [Math.PI / 2, 0, 0]);
    }
    // Cross braces.
    for (const t of [-0.35, 0.05, 0.45]) {
      eKit.place(M.metal('#4e5249', 0.5, 0.9), new THREE.BoxGeometry(1.5, 0.09, 0.09), [0, t * canL * 0.9, 0], [Math.PI / 2, 0, 0]);
    }

    this.tubes = [];
    this.covers = [];
    const positions = [
      [-0.36, 0.36], [0.36, 0.36],
      [-0.36, -0.36], [0.36, -0.36]
    ];
    for (let i = 0; i < 4; i++) {
      const [lx, ly] = positions[i];
      // Canister body (the missile axis is +Y in erector space).
      const can = G.roundedBox(canW, canL, canH, 0.05);
      eKit.place(canMat, can, [lx, 0, ly]);
      // Ribs and end frames.
      for (let r = 0; r < 5; r++) {
        const y = -canL / 2 + 0.5 + (r / 4) * (canL - 1.0);
        eKit.place(M.metal('#3f433c', 0.55, 0.9), new THREE.BoxGeometry(canW + 0.06, 0.07, canH + 0.06), [lx, y, ly]);
      }
      // Blast cap on the muzzle end, removed when the tube fires.
      const capMat = M.hazardMat(1);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(canW * 0.96, 0.06, canH * 0.96), capMat);
      cap.position.set(lx, canL / 2 + 0.04, ly);
      this.erector.add(cap);
      this.covers.push(cap);
      // Scorched rear plate.
      eKit.place(M.heatMat('#43403a'), new THREE.BoxGeometry(canW * 0.98, 0.1, canH * 0.98), [lx, -canL / 2 - 0.05, ly]);

      this.tubes.push({ muzzle: new THREE.Vector3(lx, canL / 2 + 0.2, ly) });
    }

    // Stencils on the canister flanks.
    const decal = M.decalMat(['HAWKEYE-T'], { w: 512, h: 128, color: '#d8d3bd', font: 'bold 52px "Courier New", monospace' });
    eKit.place(decal, new THREE.PlaneGeometry(3.2, 0.42), [-0.78, 0.4, 0], [0, -Math.PI / 2, Math.PI / 2]);
    const decal2 = M.decalMat(['DANGER', 'BLAST'], { w: 512, h: 256, color: '#e8c34a' });
    eKit.place(decal2, new THREE.PlaneGeometry(0.9, 0.45), [0.79, -1.6, 0], [0, Math.PI / 2, Math.PI / 2]);

    // Cable loom from the pallet down to the trailer.
    const hose = M.hoseMat();
    eKit.add(hose, G.cable([-0.7, -2.2, -0.45], [-0.7, -2.9, -0.95], 0.15, 0.03, 8));
    eKit.add(hose, G.cable([0.7, -2.2, -0.45], [0.7, -2.9, -0.95], 0.15, 0.03, 8));

    const erectorMesh = eKit.build('terminal-erector');
    this.erector.add(erectorMesh);
    this.erector.position.set(0.4, 2.35, 0);

    // Hydraulic rams from the turret deck to the underside of the pallet.
    this._addHydraulic([-0.95, 1.35, -0.9], [0, -1.9, -0.55], 0.08);
    this._addHydraulic([-0.95, 1.35, 0.9], [0, -1.9, 0.55], 0.08);

    this.collision.addBox(
      this.anchor.pos.x,
      1.6,
      this.anchor.pos.z,
      4.2,
      1.6,
      1.8,
      this.anchor.yaw,
      'battery'
    );
    void rng;
    return this;
  }
}

/* ------------------------------------------------------------------ *
 * HIGHTOWER : THAAD-inspired high-altitude battery
 * ------------------------------------------------------------------ */

class HighAltitudeBattery extends Battery {
  build() {
    const kit = new Kit();
    const body = M.camoMat('desert', 0.9);
    const painted = M.painted('#6f7362', { repeat: 1.6 });
    const dark = M.darkMetal();
    const glass = M.glassMat('#0f1c1e', 0.5);

    // --- heavy truck chassis ---
    kit.place(dark, new THREE.BoxGeometry(11.5, 0.42, 2.9), [0, 1.0, 0]);
    // Cab.
    kit.place(body, G.roundedBox(2.6, 2.0, 2.7, 0.12), [-4.3, 2.2, 0]);
    kit.place(glass, new THREE.BoxGeometry(0.08, 0.85, 2.3), [-5.62, 2.7, 0], [0, 0, 0.1]);
    kit.place(body, G.roundedBox(1.4, 1.0, 2.6, 0.1), [-5.9, 1.65, 0]);
    kit.place(dark, new THREE.BoxGeometry(0.24, 0.42, 2.8), [-6.65, 1.3, 0]);
    // Cab roof rack + beacon.
    kit.place(dark, new THREE.BoxGeometry(1.6, 0.1, 2.2), [-4.3, 3.25, 0]);
    // Wheels: 5 axles.
    const wheel = new THREE.CylinderGeometry(0.86, 0.86, 0.62, 16);
    wheel.rotateX(Math.PI / 2);
    const hub = new THREE.CylinderGeometry(0.3, 0.3, 0.66, 10);
    hub.rotateX(Math.PI / 2);
    for (const x of [-4.4, -2.9, 1.4, 2.9, 4.4]) {
      for (const z of [-1.6, 1.6]) {
        kit.place(M.rubberMat(1.3), wheel, [x, 0.86, z]);
        kit.place(M.metal('#6e6e66', 0.5, 0.85), hub, [x, 0.86, z]);
        // Mudflap.
        kit.place(M.tarpMat('#2a2c28'), new THREE.BoxGeometry(0.05, 0.55, 0.6), [x + 0.95, 0.5, z]);
      }
    }
    // Stowage boxes down the flanks.
    for (const x of [-1.4, 0.2]) {
      for (const z of [-1.62, 1.62]) {
        kit.place(painted, G.roundedBox(1.4, 0.7, 0.36, 0.04), [x, 1.55, z]);
      }
    }
    // Outriggers.
    for (const [x, z] of [[-1.8, -1.9], [-1.8, 1.9], [5.4, -1.9], [5.4, 1.9]]) {
      kit.place(dark, new THREE.BoxGeometry(0.24, 0.24, 1.0), [x, 1.0, z * 0.75]);
      kit.place(dark, new THREE.CylinderGeometry(0.11, 0.11, 1.3, 8), [x, 0.65, z]);
      kit.place(M.metal('#8b8f88', 0.42, 0.9), new THREE.CylinderGeometry(0.42, 0.46, 0.12, 12), [x, 0.06, z]);
    }
    // Power pack with a hot exhaust stack.
    kit.place(painted, G.roundedBox(1.8, 1.2, 2.2, 0.07), [-2.6, 1.8, 0]);
    kit.place(M.heatMat('#403d38'), G.pipe(0.12, 1.8, 0.02, 10), [-2.6, 3.2, 0.8]);
    this._addStatusPanel(kit, [-2.6, 2.3, -1.15], 0, 'main');
    // Cable runs to the pallet.
    kit.add(M.hoseMat(), G.cable([-1.8, 1.9, -1.0], [0.6, 1.5, -1.3], 0.35, 0.045, 10));
    kit.add(M.hoseMat(), G.cable([-1.8, 1.9, 1.0], [0.6, 1.5, 1.3], 0.35, 0.045, 10));

    this.launchHeight = 4.6;
    this.group.add(kit.build('hialt-chassis'));

    // --- turret ---
    const tKit = new Kit();
    tKit.place(painted, new THREE.CylinderGeometry(1.5, 1.75, 0.5, 22), [1.6, 1.45, 0]);
    tKit.place(dark, new THREE.TorusGeometry(1.6, 0.07, 8, 26), [1.6, 1.7, 0], [Math.PI / 2, 0, 0]);
    tKit.place(M.metal('#585c52', 0.5, 0.9), new THREE.BoxGeometry(0.34, 1.5, 0.36), [1.6, 2.4, -1.35]);
    tKit.place(M.metal('#585c52', 0.5, 0.9), new THREE.BoxGeometry(0.34, 1.5, 0.36), [1.6, 2.4, 1.35]);
    this.turret.add(tKit.build('hialt-turret'));

    // --- erector: six large cylindrical canisters in a 3x2 pallet ---
    const eKit = new Kit();
    const canR = 0.42;
    const canL = 7.2;
    const canMat = M.camoMat('grey', 1.2);
    const frameMat = M.painted('#585d4e', { repeat: 1.4, panels: 3 });

    eKit.place(frameMat, new THREE.BoxGeometry(2.9, 0.18, canL + 0.5), [0, -0.75, 0], [Math.PI / 2, 0, 0]);
    for (const sx of [-1.42, 1.42]) {
      eKit.place(frameMat, new THREE.BoxGeometry(0.16, canL + 0.5, 1.5), [sx, 0, 0], [Math.PI / 2, 0, 0]);
    }
    for (const t of [-0.42, -0.14, 0.14, 0.42]) {
      eKit.place(M.metal('#4a4e45', 0.5, 0.9), new THREE.BoxGeometry(2.85, 0.1, 0.1), [0, t * canL, 0], [Math.PI / 2, 0, 0]);
    }

    this.tubes = [];
    this.covers = [];
    const cols = [-0.92, 0, 0.92];
    const rows = [0.5, -0.5];
    for (const ly of rows) {
      for (const lx of cols) {
        const can = new THREE.CylinderGeometry(canR, canR, canL, 16);
        eKit.place(canMat, can, [lx, 0, ly]);
        for (let r = 0; r < 6; r++) {
          const y = -canL / 2 + 0.6 + (r / 5) * (canL - 1.2);
          eKit.place(M.metal('#3f433c', 0.55, 0.9), new THREE.TorusGeometry(canR + 0.03, 0.035, 6, 18), [lx, y, ly], [Math.PI / 2, 0, 0]);
        }
        const capMat = M.hazardMat(1);
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(canR * 0.98, canR * 0.98, 0.08, 16), capMat);
        cap.position.set(lx, canL / 2 + 0.05, ly);
        this.erector.add(cap);
        this.covers.push(cap);
        eKit.place(M.heatMat('#45423c'), new THREE.CylinderGeometry(canR * 0.99, canR * 0.99, 0.14, 16), [lx, -canL / 2 - 0.07, ly]);
        this.tubes.push({ muzzle: new THREE.Vector3(lx, canL / 2 + 0.3, ly) });
      }
    }

    const decal = M.decalMat(['HIGHTOWER  B-2'], { w: 512, h: 128, color: '#d5d0bb', font: 'bold 46px "Courier New", monospace' });
    eKit.place(decal, new THREE.PlaneGeometry(4.4, 0.5), [-1.5, 0.6, 0], [0, -Math.PI / 2, Math.PI / 2]);
    const warn = M.decalMat(['EXHAUST', 'HAZARD'], { w: 512, h: 256, color: '#e8c34a' });
    eKit.place(warn, new THREE.PlaneGeometry(1.2, 0.6), [1.51, -2.4, 0], [0, Math.PI / 2, Math.PI / 2]);

    const mesh = eKit.build('hialt-erector');
    this.erector.add(mesh);
    this.erector.position.set(1.6, 3.1, 0);

    this._addHydraulic([1.6 - 2.1, 1.7, -1.1], [0, -2.6, -0.7], 0.11);
    this._addHydraulic([1.6 - 2.1, 1.7, 1.1], [0, -2.6, 0.7], 0.11);

    this.collision.addBox(this.anchor.pos.x, 2.0, this.anchor.pos.z, 6.0, 2.0, 2.0, this.anchor.yaw, 'battery');
    return this;
  }
}

/* ------------------------------------------------------------------ *
 * SENTINEL : fictional long-range test battery
 * ------------------------------------------------------------------ */

class SentinelBattery extends Battery {
  build() {
    const kit = new Kit();
    const painted = M.painted('#54584c', { repeat: 1.6, panels: 4 });
    const pale = M.painted('#8d9186', { repeat: 1.4, panels: 3 });
    const dark = M.darkMetal();

    // --- fixed emplacement: a concrete cradle rather than a truck ---
    kit.place(M.concreteMat(4), new THREE.BoxGeometry(12, 1.1, 8), [0, 0.55, 0]);
    kit.place(M.concreteMat(2), new THREE.BoxGeometry(13, 0.4, 9), [0, 0.2, 0]);
    // Blast deflector wedge behind the launcher.
    const wedge = new THREE.CylinderGeometry(3.2, 3.2, 7.5, 4, 1, false, Math.PI * 0.25, Math.PI * 0.5);
    wedge.rotateZ(Math.PI / 2);
    kit.place(M.heatMat('#3b3833'), wedge, [-4.4, 1.9, 0], [0, Math.PI / 2, 0]);
    // Equipment vans either side.
    kit.place(painted, G.roundedBox(4.2, 2.4, 2.4, 0.09), [-1.0, 2.3, 5.0]);
    kit.place(painted, G.roundedBox(4.2, 2.4, 2.4, 0.09), [-1.0, 2.3, -5.0]);
    kit.place(dark, G.roundedBox(0.7, 1.9, 0.06, 0.02), [1.1, 2.05, 5.0], [0, Math.PI / 2, 0]);
    for (const sz of [5.0, -5.0]) {
      for (let i = 0; i < 4; i++) {
        kit.place(dark, new THREE.BoxGeometry(0.1, 0.5, 0.06), [-2.6 + i * 0.32, 2.9, sz - 1.22]);
      }
      kit.place(M.metal('#8d918a', 0.42, 0.92), G.ladder(2.2, 0.4), [1.4, 1.1, sz], [0, Math.PI / 2, 0]);
    }
    // Cryo / gas bottles for the ejection system.
    for (let i = 0; i < 5; i++) {
      kit.place(pale, new THREE.CylinderGeometry(0.3, 0.3, 2.0, 14), [3.4, 2.1, -3.0 + i * 1.5]);
      kit.place(dark, new THREE.SphereGeometry(0.31, 12, 8), [3.4, 3.1, -3.0 + i * 1.5]);
    }
    kit.add(M.hoseMat(), G.cable([3.4, 3.1, -3.0], [1.6, 2.2, 0], 0.4, 0.05, 12));
    this._addStatusPanel(kit, [2.2, 2.2, -1.5], 0, 'main');

    this.launchHeight = 6.5;
    this.group.add(kit.build('sentinel-base'));

    // --- turret ring ---
    const tKit = new Kit();
    tKit.place(painted, new THREE.CylinderGeometry(2.4, 2.7, 0.8, 26), [0, 1.5, 0]);
    tKit.place(dark, new THREE.TorusGeometry(2.5, 0.1, 8, 30), [0, 1.9, 0], [Math.PI / 2, 0, 0]);
    for (const sz of [-2.0, 2.0]) {
      tKit.place(M.metal('#4f544a', 0.5, 0.9), new THREE.BoxGeometry(0.5, 2.6, 0.5), [0, 3.1, sz]);
      tKit.place(M.metal('#4f544a', 0.5, 0.9), new THREE.BoxGeometry(0.4, 0.4, 1.6), [0, 4.2, sz * 0.7]);
    }
    this.turret.add(tKit.build('sentinel-turret'));

    // --- erector: two very large canisters ---
    const eKit = new Kit();
    const canR = 0.62;
    const canL = 10.4;
    const canMat = M.painted('#9aa094', { repeat: 1.4, panels: 4 });
    const frameMat = M.painted('#4d5147', { repeat: 1.2, panels: 3 });

    eKit.place(frameMat, new THREE.BoxGeometry(3.2, 0.3, canL + 0.8), [0, -1.05, 0], [Math.PI / 2, 0, 0]);
    for (const sx of [-1.55, 1.55]) {
      eKit.place(frameMat, new THREE.BoxGeometry(0.22, canL + 0.8, 2.0), [sx, 0, 0], [Math.PI / 2, 0, 0]);
    }
    for (const t of [-0.4, -0.13, 0.13, 0.4]) {
      eKit.place(M.metal('#464a42', 0.5, 0.9), new THREE.BoxGeometry(3.1, 0.14, 0.14), [0, t * canL, 0], [Math.PI / 2, 0, 0]);
    }

    this.tubes = [];
    this.covers = [];
    for (const lx of [-0.78, 0.78]) {
      const can = new THREE.CylinderGeometry(canR, canR, canL, 20);
      eKit.place(canMat, can, [lx, 0, 0]);
      for (let r = 0; r < 8; r++) {
        const y = -canL / 2 + 0.8 + (r / 7) * (canL - 1.6);
        eKit.place(M.metal('#3d4139', 0.55, 0.9), new THREE.TorusGeometry(canR + 0.04, 0.05, 6, 22), [lx, y, 0], [Math.PI / 2, 0, 0]);
      }
      // Frangible muzzle cover with a painted cross.
      const cap = new THREE.Mesh(
        new THREE.CylinderGeometry(canR * 0.99, canR * 0.99, 0.12, 20),
        M.hazardMat(1)
      );
      cap.position.set(lx, canL / 2 + 0.07, 0);
      this.erector.add(cap);
      this.covers.push(cap);
      eKit.place(M.heatMat('#413e39'), new THREE.CylinderGeometry(canR, canR, 0.2, 20), [lx, -canL / 2 - 0.1, 0]);
      // Umbilical connector block.
      eKit.place(dark, G.roundedBox(0.3, 0.5, 0.24, 0.03), [lx, -canL * 0.28, canR + 0.12]);
      this.tubes.push({ muzzle: new THREE.Vector3(lx, canL / 2 + 0.4, 0) });
    }

    const decal = M.decalMat(['SENTINEL', 'TEST ROUND'], { w: 512, h: 256, color: '#2b2f2a' });
    eKit.place(decal, new THREE.PlaneGeometry(2.0, 1.0), [0, 1.4, 0.64], [0, 0, 0]);
    const warn = M.decalMat(['EXPERIMENTAL'], { w: 512, h: 128, color: '#c85a3a', font: 'bold 46px "Courier New", monospace' });
    eKit.place(warn, new THREE.PlaneGeometry(3.4, 0.44), [0, -1.6, 0.64], [0, 0, 0]);

    // Umbilical cables to the erector.
    eKit.add(M.hoseMat(), G.cable([-0.78, -3.0, 0.7], [-1.5, -4.6, 1.4], 0.3, 0.05, 10));
    eKit.add(M.hoseMat(), G.cable([0.78, -3.0, 0.7], [1.5, -4.6, 1.4], 0.3, 0.05, 10));

    this.erector.add(eKit.build('sentinel-erector'));
    this.erector.position.set(0, 4.2, 0);

    this._addHydraulic([-0.0, 2.0, -2.6], [0, -3.4, -0.9], 0.15);
    this._addHydraulic([-0.0, 2.0, 2.6], [0, -3.4, 0.9], 0.15);

    this.collision.addBox(this.anchor.pos.x, 1.4, this.anchor.pos.z, 6.5, 1.4, 4.5, this.anchor.yaw, 'battery');
    this.collision.addBox(this.anchor.pos.x - 1.0, 2.6, this.anchor.pos.z + 5.0, 2.2, 2.6, 1.3, this.anchor.yaw, 'battery-van');
    this.collision.addBox(this.anchor.pos.x - 1.0, 2.6, this.anchor.pos.z - 5.0, 2.2, 2.6, 1.3, this.anchor.yaw, 'battery-van');
    return this;
  }
}

/* ------------------------------------------------------------------ *
 * Manager
 * ------------------------------------------------------------------ */

export class BatteryPark {
  constructor(scene, collision, anchors) {
    this.scene = scene;
    this.rng = new Rng(settings.seed ^ 0xba77);
    this.list = [
      new TerminalBattery(BATTERY_SPECS.patriot, anchors.patriot, scene, collision, this.rng),
      new HighAltitudeBattery(BATTERY_SPECS.thaad, anchors.thaad, scene, collision, this.rng),
      new SentinelBattery(BATTERY_SPECS.sentinel, anchors.sentinel, scene, collision, this.rng)
    ];
    for (const b of this.list) b.build();
    this.byId = new Map(this.list.map((b) => [b.id, b]));
    this.selectedIndex = 0;
  }

  get selected() {
    return this.list[this.selectedIndex];
  }

  select(idOrIndex) {
    if (typeof idOrIndex === 'number') {
      this.selectedIndex = clamp(idOrIndex, 0, this.list.length - 1);
    } else {
      const i = this.list.findIndex((b) => b.id === idOrIndex);
      if (i >= 0) this.selectedIndex = i;
    }
    return this.selected;
  }

  cycle(dir = 1) {
    this.selectedIndex = (this.selectedIndex + dir + this.list.length) % this.list.length;
    return this.selected;
  }

  reset() {
    for (const b of this.list) {
      b.ammo = b.maxAmmo;
      b.loaded = Math.min(b.spec.tubes, b.maxAmmo);
      b.state = 'ready';
      b.stateTimer = 0;
      b.assignedTrack = null;
      b.tubeSpent.fill(false);
      b.nextTube = 0;
      for (let i = 0; i < b.covers.length; i++) b.covers[i].visible = i < b.loaded;
      b.targetTraverse = 0;
      b.targetElevation = degToRad(b.spec.stowElevation);
    }
  }

  update(dt) {
    for (const b of this.list) b.update(dt);
  }
}
