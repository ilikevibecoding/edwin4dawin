// Three fictionalized interceptor batteries with distinct silhouettes,
// animated launcher components, status lighting, decals and launch states.
// RAMPART  — Patriot-inspired canted box-canister trailer (fast, terminal)
// ZENITH   — THAAD-inspired erecting tube rack on a heavy truck (high alt)
// SENTINEL — fictional twin-silo long-range test article (max spectacle)
import * as THREE from 'three';
import { BATTERIES } from './constants.js';
import { panelTexture, metalTexture, hazardStripesTexture, stencilTexture, concreteTexture } from './textures.js';

const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();

export const BSTATE = {
  READY: 'READY',
  PREP: 'PREP',
  RELOAD: 'RELOAD',
  EMPTY: 'EMPTY',
};

class Battery {
  constructor(def, group, ctx) {
    this.def = def;
    this.id = def.id;
    this.group = group;
    this.ctx = ctx;
    this.state = BSTATE.READY;
    this.ammo = def.ammo;
    this.timer = 0;
    this.heat = 0;
    this.pendingTrack = null;
    this.tubeIndex = 0;
    // set by subclass builders:
    this.elevGroup = null;      // rotating/elevating part
    this.yawGroup = null;       // slewing part
    this.muzzles = [];          // Object3D muzzle anchors in launcher space
    this.statusLampMat = null;
    this.targetElev = 0;
    this.currentElev = 0;
    this.targetYaw = 0;
    this.currentYaw = 0;
    this.restElev = 0;
    this.restYaw = 0;
    this.time = 0;
    this.scorchMats = [];
  }

  get ready() { return this.state === BSTATE.READY && this.ammo > 0; }

  statusColor() {
    if (this.state === BSTATE.READY) return 0x3dff6e;
    if (this.state === BSTATE.PREP) return 0xffd23e;
    if (this.state === BSTATE.RELOAD) return 0xffa02e;
    return 0xff3a2e;
  }

  /** point launcher toward a world position (visual slew) */
  slewToward(worldPos) {
    _v.copy(worldPos).sub(this.group.position);
    const yaw = Math.atan2(_v.x, _v.z) - this.group.rotation.y;
    this.targetYaw = yaw;
    this.targetElev = this.maxElev;
  }

  /**
   * Begin launch sequence against a track. Returns {ok, reason}.
   * After def.prepTime the interceptor actually leaves the rail.
   */
  requestLaunch(track) {
    if (this.ammo <= 0) return { ok: false, reason: `${this.def.name} magazine empty` };
    if (this.state !== BSTATE.READY) return { ok: false, reason: `${this.def.name} not ready (${this.state})` };
    this.state = BSTATE.PREP;
    this.timer = this.def.prepTime;
    this.pendingTrack = track;
    if (track?.threat) this.slewToward(track.threat.pos);
    this.ctx.events.emit('battery-prep', { battery: this });
    return { ok: true };
  }

  cancelPending(reason = 'launch canceled') {
    if (this.state === BSTATE.PREP) {
      this.state = this.ammo > 0 ? BSTATE.READY : BSTATE.EMPTY;
      this.pendingTrack = null;
      this.ctx.events.emit('battery-abort', { battery: this, reason });
    }
  }

  muzzleWorld(out = new THREE.Vector3()) {
    const muzzle = this.muzzles[this.tubeIndex % this.muzzles.length];
    return muzzle.getWorldPosition(out);
  }
  muzzleDirWorld(out = new THREE.Vector3()) {
    const muzzle = this.muzzles[this.tubeIndex % this.muzzles.length];
    muzzle.getWorldDirection(out);
    return out;
  }

  _fire() {
    const track = this.pendingTrack;
    this.pendingTrack = null;
    this.tubeIndex++;
    this.ammo--;
    this.heat = 1;
    this.state = this.ammo > 0 ? BSTATE.RELOAD : BSTATE.EMPTY;
    this.timer = this.def.reloadTime;
    const muzzle = this.muzzleWorld(new THREE.Vector3());
    const dir = this.muzzleDirWorld(new THREE.Vector3());
    this.ctx.interceptors.launch(this, track, muzzle, dir);
    this.ctx.effects.launchBlast(new THREE.Vector3(this.group.position.x, 0.3, this.group.position.z), this.def.plumeScale);
    this.ctx.events.emit('battery-fired', { battery: this, track });
  }

  update(dt) {
    this.time += dt;
    // state machine
    if (this.state === BSTATE.PREP) {
      this.timer -= dt;
      // wait for slew to be roughly aligned before firing
      const aligned = Math.abs(this.currentYaw - this.targetYaw) < 0.12 && Math.abs(this.currentElev - this.targetElev) < 0.1;
      if (this.timer <= 0 && (aligned || this.fixedVertical)) this._fire();
    } else if (this.state === BSTATE.RELOAD) {
      this.timer -= dt;
      if (this.timer <= 0) {
        this.state = this.ammo > 0 ? BSTATE.READY : BSTATE.EMPTY;
        this.ctx.events.emit('battery-ready', { battery: this });
      }
    }
    // return to rest pose when idle
    if (this.state === BSTATE.READY || this.state === BSTATE.EMPTY) {
      this.targetYaw = this.restYaw;
      this.targetElev = this.restElev;
    }
    // animate slew/elevation
    const slewRate = this.slewRate ?? 0.7;
    const dy = this.targetYaw - this.currentYaw;
    this.currentYaw += THREE.MathUtils.clamp(dy, -slewRate * dt, slewRate * dt);
    const de = this.targetElev - this.currentElev;
    this.currentElev += THREE.MathUtils.clamp(de, -(this.elevRate ?? 0.35) * dt, (this.elevRate ?? 0.35) * dt);
    if (this.yawGroup) this.yawGroup.rotation.y = this.currentYaw;
    if (this.elevGroup) this.elevGroup.rotation.x = -this.currentElev;
    // status lamp pulse
    if (this.statusLampMat) {
      const c = this.statusColor();
      const pulse = this.state === BSTATE.PREP ? (Math.sin(this.time * 14) > 0 ? 1 : 0.15) : (0.72 + 0.28 * Math.sin(this.time * 2.2));
      this.statusLampMat.color.set(c).multiplyScalar(pulse);
    }
    // heat discoloration cool-down
    if (this.heat > 0) {
      this.heat = Math.max(0, this.heat - dt / 26);
      for (const m of this.scorchMats) {
        m.opacity = 0.32 + this.heat * 0.6;
      }
    }
    this._updateExtra?.(dt);
  }
}

// ---------------------------------------------------------------------------
export class Batteries {
  constructor(ctx) {
    // ctx: {scene, events, rng, base, effects, interceptors(assigned later)}
    this.ctx = ctx;
    this.list = [];
    this.map = new Map();
    const pads = ctx.base.pads;
    this._buildRampart(pads.rampart);
    this._buildZenith(pads.zenith);
    this._buildSentinel(pads.sentinel);
    for (const b of this.list) this.map.set(b.id, b);
  }

  get(id) { return this.map.get(id); }

  resetAll() {
    for (const b of this.list) {
      b.state = BSTATE.READY;
      b.ammo = b.def.ammo;
      b.timer = 0;
      b.pendingTrack = null;
      b.tubeIndex = 0;
    }
  }

  update(dt) { for (const b of this.list) b.update(dt); }

  // ------------------------------------------------------------- helpers --
  _mkStatusLamp(parent, x, y, z) {
    const mat = new THREE.MeshBasicMaterial({ color: 0x3dff6e, toneMapped: false });
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), mat);
    lamp.position.set(x, y, z);
    parent.add(lamp);
    const housing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.14, 0.1, 8),
      new THREE.MeshStandardMaterial({ color: 0x23261f, roughness: 0.8 }),
    );
    housing.position.set(x, y - 0.09, z);
    parent.add(housing);
    return mat;
  }

  _mkScorch(parent, x, y, z, size, normal = 'z') {
    const mat = new THREE.MeshBasicMaterial({
      color: 0x181512, transparent: true, opacity: 0.32, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -2,
    });
    const s = new THREE.Mesh(new THREE.CircleGeometry(size, 16), mat);
    s.position.set(x, y, z);
    if (normal === 'z') s.rotation.set(0, 0, 0);
    else if (normal === 'y') s.rotation.set(-Math.PI / 2, 0, 0);
    parent.add(s);
    return mat;
  }

  _hydraulic(parent, from, to, r = 0.07) {
    // two nested cylinders that stretch between anchors; re-posed in update
    const mat = new THREE.MeshStandardMaterial({ map: metalTexture('#8b9190', 33), roughness: 0.35, metalness: 0.9 });
    const outer = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1, 8), mat);
    const inner = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.55, r * 0.55, 1, 8), mat);
    parent.add(outer, inner);
    return { outer, inner, from: from.clone(), to };
  }
  _poseHydraulic(h, elevGroup) {
    // `to` is in elev space — transform to parent space
    _v.copy(h.to).applyMatrix4(elevGroup.matrix);
    _v2.copy(h.from);
    const mid = new THREE.Vector3().addVectors(_v, _v2).multiplyScalar(0.5);
    const len = _v.distanceTo(_v2);
    for (const [mesh, frac, off] of [[h.outer, 0.55, 0.25], [h.inner, 0.55, 0.75]]) {
      mesh.position.lerpVectors(_v2, _v, off);
      mesh.scale.set(1, len * frac, 1);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), _v.clone().sub(_v2).normalize());
    }
  }

  // ------------------------------------------------------------- RAMPART --
  _buildRampart(pad) {
    const def = BATTERIES.rampart;
    const g = new THREE.Group();
    g.position.copy(pad.pos);
    g.rotation.y = pad.yaw;
    this.ctx.scene.add(g);
    const bat = new Battery(def, g, this.ctx);
    bat.maxElev = 0.95;
    bat.restElev = 0.62;
    bat.slewRate = 1.1;
    bat.elevRate = 0.5;

    const body = new THREE.MeshStandardMaterial({ map: panelTexture({ base: '#68715c', seed: 101 }), roughness: 0.75 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x23261f, roughness: 0.9 });

    // trailer
    const bed = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.5, 6.4), body);
    bed.position.y = 1.05;
    bed.castShadow = true;
    g.add(bed);
    const wheelGeo = new THREE.CylinderGeometry(0.52, 0.52, 0.4, 12);
    wheelGeo.rotateZ(Math.PI / 2);
    for (const [wx, wz] of [[-1.2, -1.9], [1.2, -1.9], [-1.2, -0.7], [1.2, -0.7], [-1.2, 2.2], [1.2, 2.2]]) {
      const w = new THREE.Mesh(wheelGeo, dark);
      w.position.set(wx, 0.52, wz);
      g.add(w);
    }
    // outriggers
    for (const [ox, oz] of [[-1.6, -2.6], [1.6, -2.6], [-1.6, 2.6], [1.6, 2.6]]) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.16, 0.16), body);
      arm.position.set(ox * 0.72, 0.86, oz);
      arm.rotation.y = ox > 0 ? 0 : Math.PI;
      g.add(arm);
      const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.16, 0.8, 8), dark);
      foot.position.set(ox, 0.42, oz);
      g.add(foot);
    }

    // yaw turntable + elevating canister block
    bat.yawGroup = new THREE.Group();
    bat.yawGroup.position.set(0, 1.36, -0.9);
    g.add(bat.yawGroup);
    const turntable = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.3, 0.26, 16), dark);
    bat.yawGroup.add(turntable);
    bat.elevGroup = new THREE.Group();
    bat.elevGroup.position.set(0, 0.3, 0.5);
    bat.yawGroup.add(bat.elevGroup);

    const canTex = panelTexture({ base: '#747e66', seed: 103, label: 'RMP-4' });
    const canMat = new THREE.MeshStandardMaterial({ map: canTex, roughness: 0.66 });
    const capMat = new THREE.MeshStandardMaterial({ map: panelTexture({ base: '#525a48', seed: 104, rivets: false }), roughness: 0.8 });
    bat.canisters = [];
    let mi = 0;
    for (let cx = 0; cx < 2; cx++) {
      for (let cy = 0; cy < 2; cy++) {
        const can = new THREE.Group();
        can.position.set((cx - 0.5) * 1.24, (cy - 0.5) * 1.06 + 0.62, -1.2);
        bat.elevGroup.add(can);
        const tube = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.96, 4.6), canMat);
        tube.castShadow = true;
        can.add(tube);
        const cap = new THREE.Mesh(new THREE.BoxGeometry(1.04, 0.88, 0.09), capMat.clone());
        cap.position.z = 2.34;
        can.add(cap);
        bat.scorchMats.push(this._mkScorch(can, 0, 0, 2.36, 0.42));
        const muzzle = new THREE.Object3D();
        muzzle.position.set(0, 0, 2.4);
        can.add(muzzle);
        bat.muzzles.push(muzzle);
        bat.canisters.push({ can, cap });
        // stencil number
        const num = new THREE.Mesh(
          new THREE.PlaneGeometry(0.5, 0.28),
          new THREE.MeshBasicMaterial({ map: stencilTexture(String(mi + 1).padStart(2, '0'), { w: 128, h: 64, size: 44 }), transparent: true }),
        );
        num.position.set(0.57, 0, 0.6);
        num.rotation.y = Math.PI / 2;
        can.add(num);
        mi++;
      }
    }
    // hydraulics bed → elev group
    bat._hyd = [
      this._hydraulic(bat.yawGroup, new THREE.Vector3(-0.8, 0.05, 1.1), new THREE.Vector3(-0.8, 0.4, 1.6)),
      this._hydraulic(bat.yawGroup, new THREE.Vector3(0.8, 0.05, 1.1), new THREE.Vector3(0.8, 0.4, 1.6)),
    ];
    bat._updateExtra = () => {
      for (const h of bat._hyd) this._poseHydraulic(h, bat.elevGroup);
      // illuminator wobble
      illum.rotation.y = Math.sin(bat.time * 0.6) * 0.5 + 0.3;
    };

    bat.statusLampMat = this._mkStatusLamp(g, 1.25, 1.5, 2.9);

    // separate illuminator radar trailer
    const illumBase = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.9, 2.2), body);
    illumBase.position.set(-4.6, 0.65, 3.4);
    illumBase.castShadow = true;
    g.add(illumBase);
    const illum = new THREE.Mesh(
      new THREE.BoxGeometry(1.7, 1.35, 0.16),
      new THREE.MeshStandardMaterial({ map: panelTexture({ base: '#7d876f', seed: 105, label: 'ILM-2' }), roughness: 0.6 }),
    );
    illum.position.set(-4.6, 1.9, 3.4);
    illum.rotation.x = -0.3;
    illum.castShadow = true;
    g.add(illum);

    // hazard stripes on trailer edge
    const stripe = new THREE.Mesh(
      new THREE.PlaneGeometry(2.6, 0.18),
      new THREE.MeshBasicMaterial({ map: hazardStripesTexture([2, 1]) }),
    );
    stripe.position.set(0, 0.82, 3.22);
    g.add(stripe);

    this.ctx.base.boxCollider(pad.pos.x, pad.pos.z, 5.5, 8.5, 3);
    this.ctx.base.boxCollider(
      pad.pos.x + Math.sin(pad.yaw + Math.PI / 2) * -4.6,
      pad.pos.z + Math.cos(pad.yaw + Math.PI / 2) * -4.6, 2.5, 3, 2.4,
    );
    this.list.push(bat);
  }

  // -------------------------------------------------------------- ZENITH --
  _buildZenith(pad) {
    const def = BATTERIES.zenith;
    const g = new THREE.Group();
    g.position.copy(pad.pos);
    g.rotation.y = pad.yaw;
    this.ctx.scene.add(g);
    const bat = new Battery(def, g, this.ctx);
    bat.maxElev = 1.22;
    bat.restElev = 0.4;
    bat.slewRate = 0.55;
    bat.elevRate = 0.3;

    const body = new THREE.MeshStandardMaterial({ map: panelTexture({ base: '#746e58', seed: 111 }), roughness: 0.78 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x26241d, roughness: 0.9 });

    // heavy truck: cab + long chassis
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.7, 9.6), body);
    chassis.position.y = 1.25;
    chassis.castShadow = true;
    g.add(chassis);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(2.9, 1.7, 2.0), body);
    cab.position.set(0, 2.15, 4.6);
    cab.castShadow = true;
    g.add(cab);
    const winMat = new THREE.MeshStandardMaterial({ color: 0x1d2b33, roughness: 0.25, metalness: 0.6 });
    const win = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.6, 0.06), winMat);
    win.position.set(0, 2.5, 5.62);
    g.add(win);
    const wheelGeo = new THREE.CylinderGeometry(0.68, 0.68, 0.5, 12);
    wheelGeo.rotateZ(Math.PI / 2);
    for (let i = 0; i < 5; i++) {
      for (const sx of [-1.35, 1.35]) {
        const w = new THREE.Mesh(wheelGeo, dark);
        w.position.set(sx, 0.68, 3.6 - i * 1.75);
        g.add(w);
      }
    }
    // erecting tube rack (2×4 round tubes)
    bat.yawGroup = new THREE.Group();
    bat.yawGroup.position.set(0, 1.7, -2.4);
    g.add(bat.yawGroup);
    bat.elevGroup = new THREE.Group();
    bat.yawGroup.add(bat.elevGroup);
    const rack = new THREE.Mesh(new THREE.BoxGeometry(2.75, 0.35, 6.6), body);
    rack.position.set(0, 0.55, -0.6);
    rack.castShadow = true;
    bat.elevGroup.add(rack);
    const tubeMat = new THREE.MeshStandardMaterial({ map: panelTexture({ base: '#858e77', seed: 113 }), roughness: 0.6 });
    const capMat = new THREE.MeshStandardMaterial({ color: 0x3d4434, roughness: 0.75 });
    const tubeGeo = new THREE.CylinderGeometry(0.44, 0.44, 6.4, 14);
    tubeGeo.rotateX(Math.PI / 2);
    for (let cx = 0; cx < 3; cx++) {
      for (let cy = 0; cy < 2; cy++) {
        const tube = new THREE.Mesh(tubeGeo, tubeMat);
        tube.position.set((cx - 1) * 0.95, 1.06 + cy * 0.92, -0.6);
        tube.castShadow = true;
        bat.elevGroup.add(tube);
        const cap = new THREE.Mesh(new THREE.CircleGeometry(0.41, 14), capMat.clone());
        cap.position.set((cx - 1) * 0.95, 1.06 + cy * 0.92, 2.62);
        bat.elevGroup.add(cap);
        bat.scorchMats.push(this._mkScorch(bat.elevGroup, (cx - 1) * 0.95, 1.06 + cy * 0.92, 2.64, 0.44));
        const muzzle = new THREE.Object3D();
        muzzle.position.set((cx - 1) * 0.95, 1.06 + cy * 0.92, 2.7);
        bat.elevGroup.add(muzzle);
        bat.muzzles.push(muzzle);
      }
    }
    // big label
    const label = new THREE.Mesh(
      new THREE.PlaneGeometry(2.2, 0.5),
      new THREE.MeshBasicMaterial({ map: stencilTexture('ZN-8 ZENITH', { w: 512, h: 96, size: 56 }), transparent: true }),
    );
    label.position.set(1.42, 0.7, -0.6);
    label.rotation.y = Math.PI / 2;
    bat.elevGroup.add(label);

    bat._hyd = [
      this._hydraulic(bat.yawGroup, new THREE.Vector3(-1.1, -0.3, 2.2), new THREE.Vector3(-1.1, 0.5, 1.4)),
      this._hydraulic(bat.yawGroup, new THREE.Vector3(1.1, -0.3, 2.2), new THREE.Vector3(1.1, 0.5, 1.4)),
    ];
    bat._updateExtra = () => {
      for (const h of bat._hyd) this._poseHydraulic(h, bat.elevGroup);
    };
    bat.statusLampMat = this._mkStatusLamp(g, 1.45, 2.3, 4.4);

    this.ctx.base.boxCollider(pad.pos.x, pad.pos.z, 6, 11, 3.4);
    this.list.push(bat);
  }

  // ------------------------------------------------------------ SENTINEL --
  _buildSentinel(pad) {
    const def = BATTERIES.sentinel;
    const g = new THREE.Group();
    g.position.copy(pad.pos);
    g.rotation.y = pad.yaw;
    this.ctx.scene.add(g);
    const bat = new Battery(def, g, this.ctx);
    bat.fixedVertical = true;
    bat.maxElev = 0; bat.restElev = 0;

    const steel = new THREE.MeshStandardMaterial({ map: metalTexture('#666d6b', 121), roughness: 0.5, metalness: 0.7 });
    const conc = new THREE.MeshStandardMaterial({ map: concreteTexture([2, 2]), roughness: 0.95 });

    // raised blast pad with deflector wedge
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(11, 1.1, 11), conc);
    plinth.position.y = 0.55;
    plinth.receiveShadow = true;
    g.add(plinth);
    const deflector = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2.6, 1.4, 4), steel);
    deflector.position.set(0, 1.6, -3.4);
    deflector.rotation.y = Math.PI / 4;
    deflector.castShadow = true;
    g.add(deflector);

    // twin silo tubes
    const tubeMat = new THREE.MeshStandardMaterial({ map: panelTexture({ base: '#6d7876', seed: 123, label: 'LR-X' }), roughness: 0.55, metalness: 0.35 });
    bat.hatches = [];
    for (const sx of [-1.9, 1.9]) {
      const silo = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.15, 7.8, 18), tubeMat);
      silo.position.set(sx, 4.6, 0.6);
      silo.castShadow = true;
      g.add(silo);
      const collar = new THREE.Mesh(new THREE.CylinderGeometry(1.22, 1.22, 0.4, 18), steel);
      collar.position.set(sx, 8.4, 0.6);
      g.add(collar);
      // hinged hatch
      const hinge = new THREE.Group();
      hinge.position.set(sx - 1.08, 8.62, 0.6);
      g.add(hinge);
      const hatch = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.14, 18), steel);
      hatch.position.set(1.08, 0, 0);
      hatch.castShadow = true;
      hinge.add(hatch);
      bat.hatches.push(hinge);
      bat.scorchMats.push(this._mkScorch(g, sx, 8.63, 0.6, 0.95, 'y'));
      const muzzle = new THREE.Object3D();
      muzzle.position.set(sx, 8.7, 0.6);
      muzzle.rotation.x = -Math.PI / 2; // world dir = up
      g.add(muzzle);
      bat.muzzles.push(muzzle);
    }
    // umbilical tower
    const tower = new THREE.Mesh(new THREE.BoxGeometry(0.9, 10.4, 0.9), steel);
    tower.position.set(0, 5.75, 3.4);
    tower.castShadow = true;
    g.add(tower);
    for (let i = 0; i < 3; i++) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 2.4), steel);
      arm.position.set(i % 2 ? -0.9 : 0.9, 3.4 + i * 2.4, 2.2);
      arm.rotation.y = i % 2 ? 0.5 : -0.5;
      g.add(arm);
    }
    const dishMat = new THREE.MeshStandardMaterial({ color: 0xd7d7cf, roughness: 0.5, side: THREE.DoubleSide });
    const dish = new THREE.Mesh(new THREE.SphereGeometry(0.65, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2.6), dishMat);
    dish.position.set(0, 11.3, 3.4);
    dish.rotation.x = Math.PI / 2.8;
    g.add(dish);
    // cable trays from tower to silos
    const cableMat = new THREE.MeshStandardMaterial({ color: 0x141618, roughness: 0.65 });
    for (const sx of [-1.9, 1.9]) {
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 7.6, 3.0),
        new THREE.Vector3(sx * 0.6, 7.0, 1.8),
        new THREE.Vector3(sx, 6.4, 0.9),
      ]);
      g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 12, 0.07, 6), cableMat));
    }
    // warning ring
    const ring = new THREE.Mesh(
      new THREE.PlaneGeometry(3.4, 0.5),
      new THREE.MeshBasicMaterial({ map: stencilTexture('SENTINEL LR-X — TEST ARTICLE', { w: 768, h: 80, size: 44, color: '#20221c', bg: '#d9b13b' }) }),
    );
    ring.position.set(0, 2.2, 5.56);
    ring.rotation.y = Math.PI;
    g.add(ring);

    bat.statusLampMat = this._mkStatusLamp(g, 0, 11.6, 3.4);

    // hatch animation during prep
    bat._updateExtra = (dt) => {
      const want = bat.state === BSTATE.PREP ? -2.0 : 0;
      for (const hinge of bat.hatches) {
        hinge.rotation.z += (want - hinge.rotation.z) * Math.min(1, dt * 1.6);
      }
    };

    this.ctx.base.boxCollider(pad.pos.x, pad.pos.z, 12, 12, 1.2);
    for (const sx of [-1.9, 1.9]) {
      const wx = pad.pos.x + Math.cos(pad.yaw) * sx;
      const wz = pad.pos.z - Math.sin(pad.yaw) * sx;
      this.ctx.base.cylCollider(wx, wz, 1.5, 9);
    }
    this.list.push(bat);
  }
}
