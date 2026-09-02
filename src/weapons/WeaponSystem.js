import * as THREE from 'three';
import { createRig, RELOAD_PHASES } from './rig.js';
import { Spring3, easeInOut, easeOut, easeIn, easeOutBack, phase } from './springs.js';
import { buildAttachments } from './attachments/index.js';
import { buildArms } from './arms/index.js';
import { upgradeGunMaterials } from './materials.js';

/**
 * First-person weapon: M4A1 carbine (CC0 glTF) + procedural attachments + arms, fully procedurally animated.
 *
 * Public interface (see docs/ARCHITECTURE.md):
 *   current { name, ammo, magSize, reserve, state, isAiming, fireRate, damage, fireMode }
 *   viewModelRoot, muzzle (Object3D), rig, getMuzzleWorldPosition(out), fire(), reload(), setAiming(b), setVisible(b), inspect()
 * Emits: weapon:fire, weapon:casing, weapon:reload:start/end, weapon:empty, weapon:ammo, weapon:aim, weapon:magdrop, weapon:draw
 */

// Reference framing (MW2019): receiver bottom-right, handguard running to the upper-left, gun close to the lens.
const HIP_POSE = { pos: new THREE.Vector3(0.10, -0.094, -0.25), rot: new THREE.Euler(0.055, 0.25, -0.055) };
const SPRINT_POSE = { pos: new THREE.Vector3(0.07, -0.15, -0.30), rot: new THREE.Euler(0.2, 0.6, -0.25) };
const LOWERED_POSE = { pos: new THREE.Vector3(0.15, -0.5, -0.28), rot: new THREE.Euler(-0.75, 0.15, 0) };
const RELOAD_TILT = { pos: new THREE.Vector3(0.02, -0.035, 0.02), rot: new THREE.Euler(-0.12, 0.12, -0.42) };
const ADS_EYE_RELIEF = 0.265;
const ADS_ZOOM = 1.32;

const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _m = new THREE.Matrix4();

export class WeaponSystem {
  constructor(game) {
    this.game = game;
    this.events = game.events;
    this.current = {
      name: 'M4A1',
      ammo: 30,
      magSize: 30,
      reserve: 180,
      state: 'idle',
      isAiming: false,
      fireRate: 800,
      damage: 34,
      fireMode: 'AUTO',
      spreadHip: 0.011,
      spreadAds: 0.0012,
    };
    this.rig = null;
    this.viewModelRoot = null;
    this.muzzle = null;
    this.attachments = null;
    this.arms = null;

    this._cooldown = 0;
    this._triggerHeld = false;
    this._boltT = -1; // bolt cycle timer (-1 idle)
    this._boltLockedBack = false;
    this._dustOpen = 0;
    this._lastFireTime = -10;
    this._shotsInBurst = 0;

    this._sway = new Spring3(140, 13); // rotation offsets from mouse look (radians)
    this._swayPos = new Spring3(90, 11);
    this._recoilPos = new Spring3(320, 16);
    this._recoilRot = new Spring3(260, 15);
    this._posePos = new Spring3(70, 11);
    this._poseRot = new Spring3(70, 11);
    this._landDip = new Spring3(160, 12);
    this._lastYaw = 0;
    this._lastPitch = 0;
    this._aimBlend = 0;
    this._sprintBlend = 0;
    this._loweredBlend = 1;
    this._drawT = 0;
    this._inspectT = -1;
    this._reloadT = -1;
    this._reloadDuration = 0;
    this._reloadEmpty = false;
    this._magDropped = false;
    this._magNew = false;
    this._pendingTargets = { left: 'grip', right: 'grip' };
    this._tmpPos = new THREE.Vector3();
    this._tmpRot = new THREE.Euler();
    this._adsPos = new THREE.Vector3();
    this._bobPhaseLast = 0;
    this._pivots = {};
    this._droppedMags = [];
    this._fireModeSelector = 'AUTO';
    this.debugAim = null; // true/false forces ADS on/off (screenshot tooling); null = use input
    this.debugSprint = false;
    this.poses = { hip: HIP_POSE, sprint: SPRINT_POSE, lowered: LOWERED_POSE, reloadTilt: RELOAD_TILT }; // live-tunable
  }

  /* ------------------------------------------------------------------ loading */

  async load() {
    const { assets, render, camera } = this.game;
    const gltf = await assets.loadModel('models/weapons/M4A1.glb');
    const scene = gltf.scene;
    this.rig = createRig(camera, scene);
    this.viewModelRoot = this.rig.root;
    this.muzzle = this.rig.sockets.muzzle;

    // The detachable carry handle is replaced by an optic + flip-up sight.
    if (this.rig.parts.carryHandle) this.rig.parts.carryHandle.visible = false;
    for (const p of this.rig.parts.carryHandleParts || []) p.visible = false;

    // Wrap animated GLB parts in metre-space pivots (the GLB nodes live in a cm-scaled, X-rotated root).
    this._pivots.magazine = this._makePivot(this.rig.parts.magazine, 'MagazinePivot');
    this._pivots.bolt = this._makePivot(this.rig.parts.bolt, 'BoltPivot');
    this._pivots.chargingHandle = this._makePivot(this.rig.parts.chargingHandle, 'ChargingPivot');
    this._pivots.trigger = this._makePivot(this.rig.parts.trigger, 'TriggerPivot', new THREE.Vector3(0, -0.021, 0.012));
    this._pivots.dustCover = this._makePivot(this.rig.parts.dustCover, 'DustCoverPivot', new THREE.Vector3(0.016, -0.006, -0.043));
    this._pivots.selector = this._makePivot(this.rig.parts.selector, 'SelectorPivot', new THREE.Vector3(-0.01, -0.016, 0.06));

    upgradeGunMaterials(this.game, this.rig);

    this.attachments = await buildAttachments(this.game, this.rig);
    this.attachments?.holo?.setEyeRelief?.(ADS_EYE_RELIEF);
    this.arms = await buildArms(this.game, this.rig);

    this._computeAdsPose();
    const startPose = this.game.settings.shotMode ? HIP_POSE : LOWERED_POSE;
    this._posePos.value.copy(startPose.pos);
    this._poseRot.value.set(startPose.rot.x, startPose.rot.y, startPose.rot.z);
    this._posePos.target.copy(HIP_POSE.pos);
    this._poseRot.target.set(HIP_POSE.rot.x, HIP_POSE.rot.y, HIP_POSE.rot.z);
    this._drawT = 0;
    if (this.game.settings.shotMode) this._loweredBlend = 0;

    render.setupObject(this.rig.root);
    render.setViewModel(this.rig.root);
    this.rig.root.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });

    this.events.on('player:land', (e) => this._landDip.kick(0, -Math.min(0.9, 0.25 + e.impact * 0.08), 0));
    this.events.on('player:jump', () => this._landDip.kick(0, 0.25, 0));
    this.events.on('player:respawn', () => this.draw());
    this.events.on('game:state', ({ state }) => {
      if (state === 'playing' && this._loweredBlend > 0.5 && !this.game.settings.shotMode) this.draw();
    });

    this._registerDebugViews();
    this.events.emit('weapon:ammo', { ammo: this.current.ammo, magSize: this.current.magSize, reserve: this.current.reserve });
  }

  /** Re-parent a GLB node under a metre-space pivot placed at `origin` (gunRoot space) so it can be animated simply. */
  _makePivot(node, name, origin = null) {
    if (!node) return null;
    const pivot = new THREE.Group();
    pivot.name = name;
    this.rig.gunRoot.updateWorldMatrix(true, true);
    if (origin) pivot.position.copy(origin);
    else {
      node.getWorldPosition(_v);
      this.rig.gunRoot.worldToLocal(_v);
      pivot.position.copy(_v);
    }
    this.rig.gunRoot.add(pivot);
    pivot.updateWorldMatrix(true, false);
    pivot.attach(node);
    pivot.userData.rest = { position: pivot.position.clone(), quaternion: pivot.quaternion.clone() };
    return pivot;
  }

  _computeAdsPose() {
    // Sway-pivot position that puts the reticle centre on the camera axis at ADS_EYE_RELIEF metres.
    const aim = this.rig.sockets.sightAim.position;
    this._adsPos.set(-aim.x, -aim.y, -ADS_EYE_RELIEF - aim.z);
  }

  /* ------------------------------------------------------------------ public API */

  getMuzzleWorldPosition(out = new THREE.Vector3()) {
    return this.muzzle.getWorldPosition(out);
  }

  setVisible(v) {
    if (this.rig) this.rig.root.visible = v;
  }

  setAiming(aiming) {
    if (this.current.isAiming === aiming) return;
    if (aiming && (this._reloadT >= 0 || this._loweredBlend > 0.6)) return;
    this.current.isAiming = aiming;
    this.game.player.isAiming = aiming;
    this.game.render.setAds(aiming ? 1 : 0, ADS_ZOOM);
    if (aiming) this._inspectT = -1;
    this.events.emit('weapon:aim', { aiming });
  }

  draw() {
    this._drawT = 0.001;
    this._reloadT = -1;
    this._inspectT = -1;
    this.current.state = 'drawing';
    this.events.emit('weapon:draw', {});
  }

  inspect() {
    if (this._reloadT >= 0 || this.current.isAiming || this._inspectT >= 0) return;
    this._inspectT = 0;
    this.current.state = 'inspecting';
  }

  fire() {
    const w = this.current;
    if (this._cooldown > 0 || this._reloadT >= 0 || this._drawT > 0 || this._loweredBlend > 0.5) return false;
    if (w.ammo <= 0) {
      this.events.emit('weapon:empty', {});
      this._cooldown = 0.22;
      return false;
    }
    if (this._inspectT >= 0) this._inspectT = -1;
    w.ammo--;
    this._cooldown = 60 / w.fireRate;
    w.state = 'firing';
    const now = this.game.time;
    this._shotsInBurst = now - this._lastFireTime < 0.25 ? this._shotsInBurst + 1 : 1;
    this._lastFireTime = now;

    const { origin, direction } = this.game.player.getViewRay(_v, _v2);
    const spread = w.isAiming ? w.spreadAds : w.spreadHip * (1 + Math.min(this._shotsInBurst, 12) * 0.06) * (this.game.player.speedFactor > 0.3 ? 1.5 : 1);
    const muzzle = this.getMuzzleWorldPosition(new THREE.Vector3());
    this.events.emit('weapon:fire', { origin: origin.clone(), direction: direction.clone(), muzzle, muzzleObject: this.muzzle, weapon: w, spread });
    this.events.emit('weapon:ammo', { ammo: w.ammo, magSize: w.magSize, reserve: w.reserve });

    // Recoil: view model kick + camera punch (rises with sustained fire, tighter when aiming).
    const ads = w.isAiming ? 0.55 : 1;
    const climb = Math.min(1, this._shotsInBurst / 8);
    this._recoilPos.kick((Math.random() - 0.5) * 0.06 * ads, 0.04 * ads, 0.9 * ads + Math.random() * 0.25);
    this._recoilRot.kick(0.95 * ads + Math.random() * 0.3, (Math.random() - 0.5) * 0.5 * ads, (Math.random() - 0.5) * 0.7 * ads);
    this.game.player.addViewPunch(0.0075 * ads + climb * 0.003 + Math.random() * 0.002, (Math.random() - 0.5) * 0.0045 * ads + (climb * 0.0015 * (Math.random() < 0.6 ? 1 : -1)));

    // Bolt cycle + ejected casing.
    this._boltT = 0;
    this._dustOpen = 1;
    this._ejectCasing();
    if (w.ammo === 0) this._boltLockedBack = true;
    return true;
  }

  reload() {
    const w = this.current;
    if (this._reloadT >= 0 || w.ammo === w.magSize || w.reserve <= 0 || this._drawT > 0) return;
    this.setAiming(false);
    this._inspectT = -1;
    this._reloadEmpty = w.ammo === 0;
    this._reloadT = 0;
    this._reloadDuration = this._reloadEmpty ? RELOAD_PHASES.RETURN[1] : RELOAD_PHASES.RETURN[1] - 0.25;
    this._magDropped = false;
    this._magNew = false;
    w.state = 'reloading';
    this.events.emit('weapon:reload:start', { duration: this._reloadDuration, empty: this._reloadEmpty });
  }

  _finishReload() {
    const w = this.current;
    const need = w.magSize - w.ammo;
    const take = Math.min(need, w.reserve);
    w.ammo += take;
    w.reserve -= take;
    this._boltLockedBack = false;
    w.state = 'idle';
    this._reloadT = -1;
    this.events.emit('weapon:reload:end', {});
    this.events.emit('weapon:ammo', { ammo: w.ammo, magSize: w.magSize, reserve: w.reserve });
  }

  /* ------------------------------------------------------------------ casings & dropped mags */

  _ejectCasing() {
    const port = this.rig.sockets.ejectionPort;
    port.getWorldPosition(_v);
    this.rig.gunRoot.getWorldQuaternion(_q);
    // Ejection direction in gun space: right, up and slightly back, with spread.
    _v2.set(1, 0.55 + Math.random() * 0.25, 0.25 + Math.random() * 0.2).normalize().applyQuaternion(_q).multiplyScalar(2.2 + Math.random() * 1.1);
    this.events.emit('weapon:casing', {
      position: _v.clone(),
      velocity: { x: _v2.x, y: _v2.y, z: _v2.z },
      angularVelocity: { x: (Math.random() - 0.5) * 60, y: (Math.random() - 0.5) * 40, z: (Math.random() - 0.5) * 60 },
    });
  }

  _dropMagazine() {
    const mag = this.rig.parts.magazine;
    const { scene, physics, render, camera } = this.game;
    if (!mag || !physics) return;
    mag.updateWorldMatrix(true, false);
    // Body frame = a box centred on the magazine's local bounding box, in the magazine's world orientation.
    if (!mag.geometry.boundingBox) mag.geometry.computeBoundingBox();
    const bb = mag.geometry.boundingBox;
    const center = bb.getCenter(new THREE.Vector3());
    const worldScale = mag.getWorldScale(new THREE.Vector3());
    const half = bb.getSize(new THREE.Vector3()).multiply(worldScale).multiplyScalar(0.5);
    const worldCenter = mag.localToWorld(center.clone());
    const worldQuat = mag.getWorldQuaternion(new THREE.Quaternion());
    // Map from view-model space to world so the mag appears where the gun is drawn.
    const wrapper = new THREE.Group();
    wrapper.name = 'DroppedMagazine';
    const clone = new THREE.Mesh(mag.geometry, mag.material);
    clone.position.copy(center).multiply(worldScale).negate();
    clone.scale.copy(worldScale);
    clone.castShadow = true;
    clone.receiveShadow = true;
    wrapper.add(clone);
    wrapper.position.copy(this._viewModelToWorld(worldCenter));
    wrapper.quaternion.copy(worldQuat);
    scene.add(wrapper);
    render.setupObject(wrapper);
    camera.getWorldDirection(_v2);
    const body = physics.addDynamicBody({
      position: wrapper.position,
      quaternion: wrapper.quaternion,
      shape: { type: 'box', hx: Math.max(0.01, half.x), hy: Math.max(0.01, half.y), hz: Math.max(0.01, half.z) },
      mass: 0.45,
      friction: 0.7,
      restitution: 0.15,
      linvel: { x: _v2.x * 0.6 + (Math.random() - 0.5) * 0.4, y: -1.2, z: _v2.z * 0.6 + (Math.random() - 0.5) * 0.4 },
      angvel: { x: (Math.random() - 0.5) * 6, y: (Math.random() - 0.5) * 4, z: (Math.random() - 0.5) * 6 },
      object: wrapper,
      data: { surface: 'metal', kind: 'magazine' },
    });
    this._droppedMags.push({ body, wrapper, life: 25 });
    if (this._droppedMags.length > 4) this._removeDroppedMag(this._droppedMags.shift());
    this.events.emit('weapon:magdrop', { position: wrapper.position.clone() });
  }

  _removeDroppedMag(item) {
    item.body.remove();
    item.wrapper.removeFromParent();
  }

  /** View-model world point → main-camera world point on the same pixel (the two cameras have different FOVs). */
  _viewModelToWorld(point) {
    const cam = this.game.camera;
    const wcam = this.game.render.weaponCamera;
    const out = point.clone().applyMatrix4(cam.matrixWorldInverse);
    const k = Math.tan(THREE.MathUtils.degToRad(cam.fov) * 0.5) / Math.tan(THREE.MathUtils.degToRad(wcam.fov) * 0.5);
    out.x *= k;
    out.y *= k;
    return out.applyMatrix4(cam.matrixWorld);
  }

  /* ------------------------------------------------------------------ per-frame */

  update(dt) {
    if (!this.rig) return;
    const { input, player } = this.game;
    const w = this.current;
    const rig = this.rig;
    const st = rig.state;

    if (dt > 0) {
      this._cooldown = Math.max(0, this._cooldown - dt);
      const canUse = player.alive && this.game.isPlaying && player.controlsEnabled && !this.game.debug?.isFreeCam;
      const lowered = !canUse && !this.game.settings.shotMode;
      this._loweredBlend += ((lowered ? 1 : 0) - this._loweredBlend) * Math.min(1, dt * 6);
      if (this.game.settings.shotMode && this._drawT === 0 && this._loweredBlend > 0.5) this._loweredBlend = 0;

      if (this._drawT > 0) {
        this._drawT += dt;
        if (this._drawT > 0.75) {
          this._drawT = 0;
          w.state = 'idle';
        }
      }

      // Input (debugAim / debugSprint let tooling hold a pose without real input)
      if (canUse && this._drawT === 0) {
        const wantsAim = (this.debugAim ?? input.isDown('aim')) && !player.isSprinting && this._reloadT < 0;
        this.setAiming(wantsAim);
        this._triggerHeld = input.isDown('fire');
        if (this._triggerHeld) this.fire();
        if (input.justPressed('reload') || (w.ammo === 0 && input.justPressed('fire') && w.reserve > 0)) this.reload();
        if (input.justPressed('inspect')) this.inspect();
      } else {
        this._triggerHeld = false;
        if (this.current.isAiming) this.setAiming(false);
      }

      // Reload timeline
      if (this._reloadT >= 0) {
        this._reloadT += dt;
        const t = this._reloadT;
        if (!this._magDropped && t >= RELOAD_PHASES.MAG_OUT[1]) {
          this._magDropped = true;
          rig.parts.magazine.visible = false;
          this._dropMagazine();
        }
        if (!this._magNew && t >= RELOAD_PHASES.MAG_IN[0]) {
          this._magNew = true;
          rig.parts.magazine.visible = true;
        }
        if (t >= this._reloadDuration) this._finishReload();
      }
      if (this._inspectT >= 0) {
        this._inspectT += dt;
        if (this._inspectT > 3.4) {
          this._inspectT = -1;
          w.state = 'idle';
        }
      }
      if (this._cooldown === 0 && w.state === 'firing') w.state = 'idle';
      if (this._boltT >= 0) {
        this._boltT += dt;
        if (this._boltT > 0.09) this._boltT = -1;
      }
      for (let i = this._droppedMags.length - 1; i >= 0; i--) {
        const m = this._droppedMags[i];
        m.life -= dt;
        if (m.life <= 0) {
          this._removeDroppedMag(m);
          this._droppedMags.splice(i, 1);
        }
      }
    }

    // Blends
    const aimTarget = w.isAiming ? 1 : 0;
    this._aimBlend += (aimTarget - this._aimBlend) * Math.min(1, dt * 11);
    const sprintTarget = (player.isSprinting || this.debugSprint) && this._reloadT < 0 && !w.isAiming ? 1 : 0;
    this._sprintBlend += (sprintTarget - this._sprintBlend) * Math.min(1, dt * 7);

    st.aiming = w.isAiming;
    st.aimBlend = this._aimBlend;
    st.sprintBlend = this._sprintBlend;
    st.reloading = this._reloadT >= 0;
    st.reloadT = this._reloadT;
    st.reloadDuration = this._reloadDuration;
    st.reloadEmpty = this._reloadEmpty;
    st.inspecting = this._inspectT >= 0;
    st.inspectT = this._inspectT;
    st.firing = this._cooldown > 0 && w.state === 'firing';
    st.lowered = this._loweredBlend > 0.5;
    st.drawT = this._drawT;
    st.pose = st.reloading ? 'reload' : st.inspecting ? 'inspect' : this._aimBlend > 0.5 ? 'ads' : this._sprintBlend > 0.5 ? 'sprint' : this._drawT > 0 ? 'draw' : 'idle';

    this._animatePose(dt);
    this._animateParts(dt);
    this._updateHandTargets();
    this.attachments?.update?.(dt, st);
    this.arms?.update?.(dt, st);
  }

  _animatePose(dt) {
    const { player } = this.game;
    const rig = this.rig;
    const t = this.game.time;

    // --- Base pose target (hip ↔ ads ↔ sprint ↔ lowered) ---
    const pos = this._tmpPos.copy(HIP_POSE.pos);
    const rot = this._tmpRot.copy(HIP_POSE.rot);
    // ADS
    pos.lerp(this._adsPos, this._aimBlend);
    rot.x = THREE.MathUtils.lerp(rot.x, 0, this._aimBlend);
    rot.y = THREE.MathUtils.lerp(rot.y, 0, this._aimBlend);
    rot.z = THREE.MathUtils.lerp(rot.z, 0, this._aimBlend);
    // Sprint
    pos.lerp(SPRINT_POSE.pos, this._sprintBlend);
    rot.x = THREE.MathUtils.lerp(rot.x, SPRINT_POSE.rot.x, this._sprintBlend);
    rot.y = THREE.MathUtils.lerp(rot.y, SPRINT_POSE.rot.y, this._sprintBlend);
    rot.z = THREE.MathUtils.lerp(rot.z, SPRINT_POSE.rot.z, this._sprintBlend);
    // Crouch: gun a touch higher/closer
    if (player.isCrouching) {
      pos.y += 0.012 * (1 - this._aimBlend);
      pos.z += 0.01 * (1 - this._aimBlend);
    }
    // Reload tilt
    if (this._reloadT >= 0) {
      const tr = this._reloadT;
      const k = Math.min(phase(tr, RELOAD_PHASES.TILT), 1 - phase(tr, RELOAD_PHASES.RETURN));
      const e = easeInOut(k);
      pos.addScaledVector(RELOAD_TILT.pos, e);
      rot.x += RELOAD_TILT.rot.x * e;
      rot.y += RELOAD_TILT.rot.y * e;
      rot.z += RELOAD_TILT.rot.z * e;
      // Seat jolt & bolt-release jolt
      const seat = phase(tr, RELOAD_PHASES.SEAT);
      if (seat > 0 && seat < 1) {
        const j = Math.sin(seat * Math.PI);
        pos.y -= 0.014 * j;
        rot.x -= 0.05 * j;
      }
      const bolt = phase(tr, RELOAD_PHASES.BOLT);
      if (this._reloadEmpty && bolt > 0.55 && bolt < 1) {
        const j = Math.sin(((bolt - 0.55) / 0.45) * Math.PI);
        pos.z += 0.012 * j;
        rot.x += 0.03 * j;
      }
    }
    // Inspect: show left side then right side
    if (this._inspectT >= 0) {
      const ti = this._inspectT;
      const a = easeInOut(Math.min(1, ti / 0.6));
      const b = easeInOut(Math.min(1, Math.max(0, (ti - 1.2) / 0.7)));
      const c = easeInOut(Math.min(1, Math.max(0, (ti - 2.6) / 0.7)));
      const show = a * (1 - c);
      pos.x -= 0.05 * show;
      pos.y += 0.03 * show;
      pos.z -= 0.02 * show;
      rot.y += (0.9 - 1.9 * b) * show;
      rot.z += (-0.25 + 0.5 * b) * show;
      rot.x += 0.12 * show;
    }
    // Draw: rise from below with a settle
    if (this._drawT > 0) {
      const k = 1 - easeOutBack(Math.min(1, this._drawT / 0.6));
      pos.y -= 0.32 * k;
      pos.z += 0.04 * k;
      rot.x -= 0.6 * k;
      rot.y += 0.15 * k;
    }
    // Lowered (menu / dead)
    pos.lerp(LOWERED_POSE.pos, this._loweredBlend);
    rot.x = THREE.MathUtils.lerp(rot.x, LOWERED_POSE.rot.x, this._loweredBlend);
    rot.y = THREE.MathUtils.lerp(rot.y, LOWERED_POSE.rot.y, this._loweredBlend);

    this._posePos.target.copy(pos);
    this._poseRot.target.set(rot.x, rot.y, rot.z);
    // Snappier when aiming for a crisp ADS.
    this._posePos.stiffness = this._poseRot.stiffness = 70 + this._aimBlend * 90;
    this._posePos.damping = this._poseRot.damping = 11 + this._aimBlend * 4;
    this._posePos.update(dt);
    this._poseRot.update(dt);

    // --- Mouse-look sway (the gun lags behind the camera) ---
    if (dt > 0) {
      let dYaw = player.yaw - this._lastYaw;
      let dPitch = player.pitch - this._lastPitch;
      if (dYaw > Math.PI) dYaw -= Math.PI * 2;
      if (dYaw < -Math.PI) dYaw += Math.PI * 2;
      this._lastYaw = player.yaw;
      this._lastPitch = player.pitch;
      const rate = 1 / Math.max(dt, 1 / 240);
      const swayScale = (1 - this._aimBlend * 0.85) * (1 - this._loweredBlend);
      this._sway.target.set(
        THREE.MathUtils.clamp(dPitch * rate * 0.012, -0.09, 0.09) * swayScale,
        THREE.MathUtils.clamp(dYaw * rate * 0.014, -0.1, 0.1) * swayScale,
        THREE.MathUtils.clamp(-dYaw * rate * 0.008, -0.07, 0.07) * swayScale,
      );
      this._swayPos.target.set(THREE.MathUtils.clamp(-dYaw * rate * 0.004, -0.03, 0.03) * swayScale, THREE.MathUtils.clamp(-dPitch * rate * 0.003, -0.02, 0.02) * swayScale, 0);
      // Strafing / acceleration lean
      const vx = player.velocity.x * Math.cos(-player.yaw) - player.velocity.z * Math.sin(-player.yaw);
      this._swayPos.target.x += THREE.MathUtils.clamp(-vx * 0.003, -0.015, 0.015) * swayScale;
      this._sway.target.z += THREE.MathUtils.clamp(-vx * 0.006, -0.03, 0.03) * swayScale;
      this._sway.update(dt);
      this._swayPos.update(dt);
      this._recoilPos.update(dt);
      this._recoilRot.update(dt);
      this._landDip.update(dt);
    }

    // --- Walk / sprint bob (figure-8) + breathing ---
    const bobAmt = player.bobAmount * (1 - this._aimBlend * 0.82) * (1 - this._loweredBlend);
    const sprintMul = 1 + this._sprintBlend * 1.4;
    const ph = player.bobPhase;
    const bobX = Math.sin(ph) * 0.0085 * bobAmt * sprintMul;
    const bobY = Math.sin(ph * 2) * 0.0055 * bobAmt * sprintMul - Math.abs(Math.sin(ph)) * 0.003 * bobAmt;
    const bobRotZ = Math.sin(ph) * 0.02 * bobAmt * sprintMul;
    const bobRotX = Math.sin(ph * 2 + 0.6) * 0.012 * bobAmt * sprintMul;
    const bobRotY = Math.sin(ph) * 0.01 * bobAmt;
    const breathe = 1 - this._aimBlend * 0.6;
    const brX = Math.sin(t * 1.55) * 0.0012 * breathe;
    const brY = Math.sin(t * 1.55 * 0.5 + 1.2) * 0.0016 * breathe;
    const brRotX = Math.sin(t * 1.3 + 0.4) * 0.0025 * breathe;
    const brRotZ = Math.sin(t * 0.9) * 0.002 * breathe;

    // --- Compose onto the sway pivot ---
    const sp = rig.swayPivot;
    const rp = this._recoilPos.value;
    const rr = this._recoilRot.value;
    const kick = 1 - this._aimBlend * 0.35;
    sp.position.set(
      this._posePos.value.x + this._swayPos.value.x + bobX + brX + rp.x * 0.03 * kick,
      this._posePos.value.y + this._swayPos.value.y + bobY + brY + rp.y * 0.03 * kick + this._landDip.value.y * 0.05,
      this._posePos.value.z + rp.z * 0.038 * kick,
    );
    sp.rotation.set(
      this._poseRot.value.x + this._sway.value.x + bobRotX + brRotX + rr.x * 0.05 * kick + this._landDip.value.y * 0.08,
      this._poseRot.value.y + this._sway.value.y + bobRotY + rr.y * 0.03 * kick,
      this._poseRot.value.z + this._sway.value.z + bobRotZ + brRotZ + rr.z * 0.035 * kick,
    );
  }

  _animateParts(dt) {
    const p = this._pivots;
    const rig = this.rig;
    const w = this.current;

    // Trigger
    if (p.trigger) {
      const pull = this._triggerHeld && w.ammo > 0 && this._reloadT < 0 ? 1 : 0;
      p.trigger.rotation.x += ((pull ? 0.32 : 0) - p.trigger.rotation.x) * Math.min(1, dt * 40 || 1);
    }
    // Bolt carrier: snaps back over ~25 ms then returns; locked back on an empty magazine.
    if (p.bolt) {
      let back = 0;
      if (this._boltT >= 0) {
        const c = this._boltT / 0.09;
        back = c < 0.28 ? easeOut(c / 0.28) : 1 - easeIn((c - 0.28) / 0.72);
      }
      if (this._boltLockedBack) back = Math.max(back, 1);
      if (this._reloadT >= 0 && this._reloadEmpty) {
        const bolt = phase(this._reloadT, RELOAD_PHASES.BOLT);
        if (bolt > 0.6) back = Math.min(back, 1 - easeOut((bolt - 0.6) / 0.4));
      }
      p.bolt.position.z = p.bolt.userData.rest.position.z + back * 0.052;
    }
    // Dust cover pops open with the first shot and stays open.
    if (p.dustCover) {
      const open = this._dustOpen ? 1 : 0;
      const target = open * -1.15;
      p.dustCover.rotation.z += (target - p.dustCover.rotation.z) * Math.min(1, dt * 30 || 1);
    }
    // Charging handle: pulled during an empty reload's bolt phase (alternative animation).
    if (p.chargingHandle) p.chargingHandle.position.z = p.chargingHandle.userData.rest.position.z;

    // Magazine during reload
    if (p.magazine) {
      const rest = p.magazine.userData.rest;
      p.magazine.position.copy(rest.position);
      p.magazine.quaternion.copy(rest.quaternion);
      if (this._reloadT >= 0) {
        const tr = this._reloadT;
        const out = phase(tr, RELOAD_PHASES.MAG_OUT);
        const inn = phase(tr, RELOAD_PHASES.MAG_IN);
        if (out > 0 && tr < RELOAD_PHASES.MAG_IN[0]) {
          const e = easeIn(out);
          p.magazine.position.y -= 0.17 * e;
          p.magazine.position.z += 0.03 * e;
          p.magazine.rotation.x = -0.35 * e;
        } else if (tr >= RELOAD_PHASES.MAG_IN[0] && tr < RELOAD_PHASES.SEAT[0]) {
          const e = 1 - easeOut(inn);
          p.magazine.position.y -= 0.19 * e;
          p.magazine.position.z += 0.04 * e;
          p.magazine.rotation.x = -0.28 * e;
        }
      }
    }
  }

  /** Drive the hand targets the arms module follows. */
  _updateHandTargets() {
    const { sockets, swayPivot, gunRoot } = this.rig;
    const right = sockets.rightHandTarget;
    const left = sockets.leftHandTarget;
    // Right hand always on the pistol grip.
    this._socketToPivotSpace(sockets.gripRight, right);

    // Left hand: handguard by default; follows the magazine and bolt release during a reload.
    if (this._reloadT < 0) {
      this._socketToPivotSpace(sockets.gripLeft, left);
      left.userData.pose = 'grip';
      return;
    }
    const tr = this._reloadT;
    const R = RELOAD_PHASES;
    const magPivot = this._pivots.magazine;
    const gripLeftPos = _v.copy(sockets.gripLeft.position);
    const magPos = _v2.copy(magPivot ? magPivot.position : sockets.magWell.position).add(new THREE.Vector3(-0.005, -0.075, 0.0));
    const downPos = new THREE.Vector3(-0.04, -0.42, 0.02);
    const boltPos = new THREE.Vector3(-0.045, 0.02, 0.005);
    let target = gripLeftPos;
    let pose = 'grip';
    if (tr < R.TILT[1]) {
      target = gripLeftPos.clone().lerp(magPos, easeInOut(phase(tr, R.TILT)));
      pose = 'magGrab';
    } else if (tr < R.MAG_OUT[1]) {
      target = magPos;
      pose = 'magGrab';
    } else if (tr < R.HAND_DOWN[1]) {
      const k = phase(tr, R.HAND_DOWN);
      target = k < 0.5 ? magPos.clone().lerp(downPos, easeInOut(k * 2)) : downPos.clone().lerp(magPos, easeInOut((k - 0.5) * 2));
      pose = 'magGrab';
    } else if (tr < R.MAG_IN[1]) {
      target = magPos;
      pose = 'magGrab';
    } else if (tr < R.SEAT[1]) {
      target = magPos.clone().add(new THREE.Vector3(0, 0.06 * Math.sin(phase(tr, R.SEAT) * Math.PI), 0));
      pose = 'slap';
    } else if (tr < R.BOLT[1]) {
      const k = phase(tr, R.BOLT);
      target = this._reloadEmpty ? magPos.clone().lerp(boltPos, easeInOut(Math.min(1, k * 1.8))) : magPos.clone().lerp(gripLeftPos, easeInOut(k));
      pose = this._reloadEmpty ? 'boltSlap' : 'grip';
    } else {
      const k = phase(tr, R.RETURN);
      target = (this._reloadEmpty ? boltPos : gripLeftPos).clone().lerp(gripLeftPos, easeInOut(k));
      pose = 'grip';
    }
    left.position.copy(target);
    swayPivot.updateWorldMatrix(true, false);
    left.quaternion.copy(sockets.gripLeft.quaternion);
    left.userData.pose = pose;
  }

  _socketToPivotSpace(socket, target) {
    // gunRoot is a direct child of swayPivot with identity transform, so socket-local == pivot-local.
    target.position.copy(socket.position);
    target.quaternion.copy(socket.quaternion);
    target.userData.pose = 'grip';
  }

  /* ------------------------------------------------------------------ debug */

  _registerDebugViews() {
    const d = this.game.debug;
    if (!d) {
      // Debug is created after the weapons load.
      this.events.once('game:ready', () => this._registerDebugViews());
      return;
    }
    d.registerView('weapon_hero', { pos: [0, 0, 12], yaw: 0, pitch: -2, hud: false });
    d.registerView('weapon_ads', { pos: [0, 0, 12], yaw: 0, pitch: 0, ads: true, hud: false });
    d.registerView('weapon_sprint', { pos: [0, 0, 12], yaw: 0, pitch: -2, hud: false, exec: 'weapons.debugSprint = true;' });
    d.registerView('weapon_inspect', { pos: [0, 0, 12], yaw: 0, pitch: -2, hud: false, exec: 'weapons.inspect();' });
  }
}
