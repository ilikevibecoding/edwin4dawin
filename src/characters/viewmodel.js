import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { bus, EVT } from '../core/events.js';
import { settings } from '../core/settings.js';
import { bevelBox, box, cyl, sphere, mesh } from '../map/kit.js';
import { fabric, hardPlastic, plainMaterial } from '../art/materials.js';
import { WEAPONS, buildWeaponModel, resolveWeaponKind } from './weapons-models.js';
import { registerCharacterAssets } from './manifest.js';

// ---------------------------------------------------------------------------
// First-person viewmodel.  (owner: fable4)
//
// RENDER INTEGRATION (documented decision)
// ----------------------------------------
// The arms + weapon are rendered in a SEPARATE overlay THREE.Scene with a
// dedicated camera (FOV 55°, near 0.01), drawn after the main pass with the
// depth buffer cleared, so the weapon can never intersect walls and never
// clips the main camera's near plane.
//
// Nothing is registered with `engine.addFrameSystem` for rendering (the lead
// already registers `viewmodel.update` at order 20 for STATE only). Instead
// the constructor wraps `game.engine.render` ONCE (idempotent via a marker on
// the wrapper function): the wrapper calls the original render, then draws
// the overlay into whatever render target is current.
//
// Wrap ordering with PostFX (which also wraps `engine.render`): the Game
// constructs ViewModel BEFORE PostFX, so at runtime PostFX's wrapper is the
// OUTERMOST. PostFX binds its scene render target, invokes the inner chain
// (main scene render + this overlay, both into that target), then runs its
// composite. The viewmodel therefore receives post-processing (tone map, AA,
// grade) exactly like the rest of the frame. Both wrappers are marked so
// re-construction (mission restart / hot reload) never double-wraps.
// ---------------------------------------------------------------------------

// Main gameplay camera runs at 82° vertical FOV; rendering the viewmodel at
// 55° magnified the weapon ~1.7x relative to the scene. 66° plus the pulled
// back per-weapon hip offsets keeps the weapon in the lower-right sixth of
// the frame with the muzzle at or below the horizontal centre line.
const VM_FOV = 66;

const GLOVE = () => fabric(0x30353b, 'vm-glove');
const KNUCKLE = () => hardPlastic(0x2b2f34, 'vm-knuckle', 0.7);
const SLEEVE = () => fabric(0x383f47, 'vm-sleeve');
const SKINV = () => plainMaterial(0xc9a184, { roughness: 0.6 }, 'vm-skin');

// ------------------------------------------------------------------ hands --

/**
 * A pre-posed tactical glove. Local space: wrist at origin, knuckle line at
 * -Y, palm normal facing +X (right hand) / -X (left hand). Two grip presets:
 *   'wrap'   fingers curl around a vertical grip column (firing hand)
 *   'cradle' fingers curl up and around a horizontal handguard (support hand)
 *   'fist'   closed around a grenade body
 * Returns { group, trigger } — `trigger` is the index finger group so the
 * firing animation can flex it onto the trigger.
 */
function buildGloveHand(side, preset) {
  const s = side === 'L' ? -1 : 1;
  const g = new THREE.Group();
  g.name = `vm-hand-${side}`;
  const glove = GLOVE();
  const knuckle = KNUCKLE();

  // Palm + back-of-hand armour pad.
  const palm = mesh(bevelBox(0.03, 0.085, 0.075, 0.01), glove);
  palm.position.set(0, -0.045, 0);
  g.add(palm);
  const pad = mesh(bevelBox(0.012, 0.05, 0.05, 0.006), knuckle);
  pad.position.set(s * -0.017, -0.04, 0);
  g.add(pad);
  // Cuff.
  const cuff = mesh(cyl(0.032, 0.036, 0.04, 10), glove);
  cuff.position.set(0, 0.014, 0);
  g.add(cuff);

  const mkFinger = (idx, len, baseCurl, spread) => {
    const root = new THREE.Group();
    // Base of the finger sits on the knuckle line.
    root.position.set(0, -0.088, -0.028 + idx * 0.019);
    const seg1 = mesh(bevelBox(0.016, len * 0.55, 0.015, 0.005), glove);
    seg1.position.y = -len * 0.275;
    root.add(seg1);
    const mid = new THREE.Group();
    mid.position.y = -len * 0.55;
    const seg2 = mesh(bevelBox(0.0145, len * 0.5, 0.014, 0.005), glove);
    seg2.position.y = -len * 0.25;
    mid.add(seg2);
    root.add(mid);
    root.rotation.x = baseCurl;
    root.rotation.z = spread;
    mid.rotation.x = baseCurl * 0.9;
    root.userData.mid = mid;
    g.add(root);
    return root;
  };

  let curl;
  if (preset === 'wrap') curl = [1.5, 1.62, 1.68, 1.72];
  else if (preset === 'cradle') curl = [1.15, 1.3, 1.35, 1.3];
  else curl = [1.75, 1.85, 1.9, 1.9]; // fist

  const fingers = [];
  for (let i = 0; i < 4; i++) {
    const len = [0.062, 0.07, 0.066, 0.052][i];
    fingers.push(mkFinger(i, len, curl[i], 0));
  }
  // Index finger is fingers[0] (nearest -Z, toward the trigger).
  const trigger = fingers[0];
  if (preset === 'wrap') {
    // Trigger discipline: index rests straight along the frame until firing.
    trigger.rotation.x = 0.25;
    trigger.userData.mid.rotation.x = 0.15;
  }

  // Thumb: wraps the other side.
  const thumb = new THREE.Group();
  thumb.position.set(s * 0.012, -0.05, -0.03);
  const t1 = mesh(bevelBox(0.017, 0.05, 0.017, 0.005), glove);
  t1.position.y = -0.024;
  thumb.add(t1);
  const t2 = mesh(bevelBox(0.015, 0.036, 0.015, 0.005), glove);
  t2.position.y = -0.062;
  thumb.add(t2);
  thumb.rotation.set(preset === 'cradle' ? 0.9 : 0.5, 0, s * -1.05);
  g.add(thumb);

  return { group: g, trigger, fingers, thumb };
}

/**
 * Forearm stub running from the wrist back toward the camera's lower corner.
 * Deliberately short: at ADS the hands sit at screen centre and a full-length
 * sleeve pointing down-back sweeps across the whole lower frame; a rolled-cuff
 * stub reads as an arm without ever reaching the middle of the screen.
 */
function buildForearm(side, bare = false) {
  const g = new THREE.Group();
  g.name = `vm-forearm-${side}`;
  const arm = mesh(cyl(0.026, 0.032, 0.15, 12), bare ? SKINV() : SLEEVE());
  arm.position.y = 0.085;
  g.add(arm);
  const cuffTrim = mesh(cyl(0.03, 0.032, 0.024, 12), SLEEVE());
  cuffTrim.position.y = 0.032;
  g.add(cuffTrim);
  // Orientation is set by orientForearm() below.
  return g;
}

/**
 * Point a forearm group (meshes along local +Y) along `dir`, given in
 * VIEW/ROOT space (camera looks down -Z, +Y up), compensating for the full
 * rotation chain from the weapon group down to the hand. Must be called after
 * any static weapon-group pose (def.vm.rot) has been applied.
 */
const _upY = new THREE.Vector3(0, 1, 0);
const _q0 = new THREE.Quaternion();
function orientForearm(fore, dir) {
  fore.parent.updateWorldMatrix(true, false);
  fore.parent.getWorldQuaternion(_q0);
  const local = dir.clone().normalize().applyQuaternion(_q0.invert());
  fore.quaternion.setFromUnitVectors(_upY, local);
}

// ------------------------------------------------------------- controller --

export class ViewModel {
  constructor(game) {
    registerCharacterAssets();
    this.game = game;

    // Overlay scene + camera.
    this.vmScene = new THREE.Scene();
    this.vmCamera = new THREE.PerspectiveCamera(VM_FOV, 16 / 9, 0.01, 12);
    this.vmScene.add(this.vmCamera);

    // Dedicated presentation light rig. The overlay is its own scene, so it
    // gets a studio-style key/fill/rim tuned for ACES tone mapping (which
    // eats ~1 stop) rather than inheriting the room lights. The weapon sits
    // around (0.18, -0.2, -0.5) in this space; directional lights aim at the
    // origin, which is close enough at these distances.
    const hemi = new THREE.HemisphereLight(0xbfccda, 0x484d54, 1.3);
    this.vmScene.add(hemi);
    const key = new THREE.DirectionalLight(0xffe2c0, 2.2);   // warm tungsten key, upper-left
    key.position.set(-0.9, 1.1, 0.5);
    this.vmScene.add(key);
    const fill = new THREE.DirectionalLight(0x9fb6cc, 0.7);  // cool fill from the right
    fill.position.set(1.1, -0.25, 0.45);
    this.vmScene.add(fill);
    // Cold rim from beyond the muzzle. Kept restrained: at 2+ intensity the
    // whole top rail blew out to a white strip; the rim should draw a thin
    // separation line on the silhouette, nothing more.
    const rim = new THREE.DirectionalLight(0xd6e6f6, 0.85);
    rim.position.set(0.35, 0.6, -1.6);
    this.vmScene.add(rim);
    // Metals (steel/aluminium, metalness ~0.9) have no diffuse response, so
    // without an environment they render black no matter how many analytic
    // lights are added. Give the overlay a neutral studio environment, weak
    // enough that dark parkerised steel stays dark.
    if (game.engine?.renderer) {
      try {
        const pmrem = new THREE.PMREMGenerator(game.engine.renderer);
        this.vmScene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
        this.vmScene.environmentIntensity = 0.3;
        pmrem.dispose();
      } catch { /* env map is a nicety; the light rig still reads */ }
    }

    // Root that all weapon offsets accumulate into.
    this.root = new THREE.Group();
    this.root.name = 'vm-root';
    this.vmCamera.add(this.root);

    /** @type {Record<string, object>} built weapon entries by kind */
    this._entries = {};
    this.activeKind = null;
    this.active = null;

    // Animation state.
    this.state = 'draw'; // draw|idle|holster|reload|inspect
    this.stateT = 0;
    this.drawDur = 0.34;
    this.holsterDur = 0.24;
    this.pendingKind = null;
    this.reload = null;   // {kind:'tactical'|'empty', t, dur}
    this.inspectT = -1;
    this.adsBlend = 0;

    // Springs / lag.
    this.swayPos = new THREE.Vector3();
    this.swayRot = new THREE.Vector3();
    this.kickPos = 0;
    this.kickRot = 0;
    this.kickVelPos = 0;
    this.kickVelRot = 0;
    this.landDip = 0;
    this.landVel = 0;
    this.bobPhase = 0;
    this.cycleT = -1;      // slide/bolt cycle timer
    this.cycleDelay = 0;
    this.triggerT = -1;
    this._prevYaw = null;
    this._prevPitch = null;
    this._lastFireFrame = -1;
    this._lastReloadFrame = -1;
    this._time = 0;

    // --- render wrap (see file header) -------------------------------------
    const engine = game.engine;
    if (engine && !engine.render.__nsViewModelWrapped) {
      const original = engine.render.bind(engine);
      const wrapped = () => {
        original();
        this.render(engine.renderer);
      };
      wrapped.__nsViewModelWrapped = true;
      engine.render = wrapped;
    }

    // Events (defensive double-trigger guard: the weapon system may call
    // onFire()/onReload() directly per the interface contract AND emit bus
    // events; frame stamps make that safe either way).
    this._offs = [
      bus.on(EVT.WEAPON_FIRE, (p) => this.onFire(p?.weapon || p)),
      bus.on(EVT.WEAPON_DRY, () => this.dryFire()),
      bus.on(EVT.WEAPON_RELOAD_START, (p) => this.onReload(p?.kind || (p?.empty ? 'empty' : 'tactical'))),
      bus.on(EVT.WEAPON_SWITCH, () => { /* handled by polling weapons.current */ }),
      bus.on(EVT.PLAYER_LAND, (p) => { this.landVel = Math.min(3, 1 + (p?.impact || 0)); }),
      bus.on('engine:resize', ({ width, height }) => {
        this.vmCamera.aspect = width / height;
        this.vmCamera.updateProjectionMatrix();
      }),
    ];
    this.vmCamera.aspect = engine ? engine.viewportWidth / Math.max(1, engine.viewportHeight) : 16 / 9;
    this.vmCamera.updateProjectionMatrix();
  }

  // ------------------------------------------------------------- weapons --

  _entry(kind) {
    if (this._entries[kind]) return this._entries[kind];
    const def = WEAPONS[kind];
    const group = buildWeaponModel(kind);
    const e = {
      kind, def, group,
      mag: group.getObjectByName('magazine'),
      slide: group.getObjectByName('slide'),
      muzzle: group.getObjectByName('muzzle'),
      eject: group.getObjectByName('eject'),
      gripR: group.getObjectByName('gripR'),
      gripL: group.getObjectByName('gripL'),
    };
    e.magHome = e.mag ? e.mag.position.clone() : null;
    e.magHomeRot = e.mag ? e.mag.rotation.clone() : null;
    e.slideHome = e.slide ? e.slide.position.clone() : null;

    // Optional per-weapon held pose (e.g. the knife shows its blade profile
    // instead of pointing edge-on away from the camera). Applied before the
    // hands so orientForearm sees the final rotation chain.
    if (def.vm.rot) group.rotation.set(def.vm.rot[0], def.vm.rot[1], def.vm.rot[2]);

    // Firing hand at the grip.
    const isGrenade = def.family === 'grenade';
    const handR = buildGloveHand('R', isGrenade ? 'fist' : 'wrap');
    handR.group.position.copy(e.gripR ? e.gripR.position : new THREE.Vector3());
    handR.group.position.x += 0.002;
    handR.group.position.y += 0.075;
    handR.group.rotation.set(-0.15, 0, 0.06);
    group.add(handR.group);
    const foreR = buildForearm('R');
    handR.group.add(foreR);
    // Down and slightly right/back in view space: the sleeve must never lean
    // toward the lens, where perspective balloons it across the frame.
    orientForearm(foreR, new THREE.Vector3(0.3, -1.0, 0.2));
    e.handR = handR;

    // Support hand. On the shotgun it rides the pump so it cycles with it.
    if (e.gripL) {
      const handL = buildGloveHand('L', 'cradle');
      const parent = kind === 'shotgun' && e.slide ? e.slide : group;
      const anchor = e.gripL.position.clone();
      if (parent === e.slide) anchor.sub(e.slide.position);
      handL.group.position.copy(anchor);
      handL.group.position.y += 0.02;
      handL.group.rotation.set(-0.2, 0.12, kind === 'shotgun' ? -1.35 : -1.15);
      parent.add(handL.group);
      const foreL = buildForearm('L', false);
      handL.group.add(foreL);
      orientForearm(foreL, new THREE.Vector3(-0.35, -1.0, 0.2));
      e.handL = handL;
      e.handLHome = handL.group.position.clone();
      e.handLParent = parent;
    } else {
      e.handL = null;
    }

    // Overlay scene has no shadow pass.
    group.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
    this._entries[kind] = e;
    return e;
  }

  _setActive(kind) {
    if (this.active) this.root.remove(this.active.group);
    this.activeKind = kind;
    this.active = this._entry(kind);
    this.active.group.visible = true;
    this.root.add(this.active.group);
    this._restoreParts();
  }

  _restoreParts() {
    const e = this.active;
    if (!e) return;
    if (e.mag && e.magHome) { e.mag.position.copy(e.magHome); e.mag.rotation.copy(e.magHomeRot); e.mag.visible = true; }
    if (e.slide && e.slideHome) e.slide.position.copy(e.slideHome);
    if (e.handL) { e.handL.group.position.copy(e.handLHome); e.handL.group.visible = true; }
  }

  // --------------------------------------------------------------- events --

  /** Weapon discharged. Kicks, cycles the action, flash + shell via effects. */
  onFire(weaponDef) {
    const frame = this.game.engine?.frame ?? 0;
    if (frame === this._lastFireFrame) return;
    this._lastFireFrame = frame;
    const e = this.active;
    if (!e) return;
    const def = e.def;

    if (def.family === 'melee') { this._melee(); return; }
    if (def.family === 'grenade') { this._throw(); return; }

    this.kickVelPos += def.vm.kick * 30;
    this.kickVelRot += def.vm.kickRot * 30;
    this.triggerT = 0;

    // Slide/bolt: instant cycle for self-loaders, delayed manual cycle for
    // pump/bolt guns.
    if (def.family === 'shotgun' || def.family === 'sniper') {
      this.cycleDelay = 0.16;
      this.cycleT = -2; // armed, waiting for delay
    } else {
      this.cycleT = 0;
    }

    const fx = this.game.effects;
    if (fx) {
      const muzzle = this._worldOf(e.muzzle);
      const dir = this._cameraForward();
      fx.muzzleFlash?.(muzzle, dir, def.family);
      if (def.family !== 'shotgun' && def.family !== 'sniper') {
        this._ejectShell();
      }
    }
  }

  /** @param {'tactical'|'empty'} kind */
  onReload(kind = 'tactical') {
    const frame = this.game.engine?.frame ?? 0;
    if (frame === this._lastReloadFrame) return;
    this._lastReloadFrame = frame;
    const e = this.active;
    if (!e || !e.mag) return;
    const dur = (kind === 'empty' ? 2.6 : 2.0) * (e.def.family === 'sniper' ? 1.15 : 1);
    this.reload = { kind, t: 0, dur };
    this.inspectT = -1;
    this.state = 'reload';
    this.stateT = 0;
  }

  dryFire() {
    this.triggerT = 0;
    this.kickVelRot += 0.008;
  }

  inspect() {
    if (this.state !== 'idle') return;
    this.inspectT = 0;
  }

  reset() {
    this.reload = null;
    this.inspectT = -1;
    this.cycleT = -1;
    this.kickPos = this.kickRot = this.kickVelPos = this.kickVelRot = 0;
    this.swayPos.set(0, 0, 0);
    this.swayRot.set(0, 0, 0);
    this.adsBlend = 0;
    this.state = 'draw';
    this.stateT = 0;
    this._prevYaw = null;
    this._prevPitch = null;
    const kind = resolveWeaponKind(this.game.weapons?.current);
    this._setActive(kind);
  }

  // --------------------------------------------------------------- update --

  /** Frame system (order 20). Advances animation state ONLY — no rendering. */
  update(dt) {
    // NOTE: dt must NOT be clamped here. advanceTime() feeds 80 ms slices and
    // software rendering produces multi-second real frames; clamping made the
    // whole viewmodel animate in slow motion (a weapon draw never finished
    // under scripted time). Timers and blends below are stable at any step;
    // only the explicit-Euler springs need substepping, done where they
    // integrate.
    this._time += dt;
    const game = this.game;
    const weapons = game.weapons;

    // Weapon selection (poll — robust to any weapon system implementation).
    const wantKind = resolveWeaponKind(weapons?.current);
    if (!this.active) this._setActive(wantKind);
    else if (wantKind !== this.activeKind && this.state !== 'holster') {
      this.pendingKind = wantKind;
      this.state = 'holster';
      this.stateT = 0;
      this.reload = null;
    }

    // State machine.
    this.stateT += dt;
    if (this.state === 'holster' && this.stateT >= this.holsterDur) {
      this._setActive(this.pendingKind || this.activeKind);
      this.pendingKind = null;
      this.state = 'draw';
      this.stateT = 0;
    } else if (this.state === 'draw' && this.stateT >= this.drawDur) {
      this.state = 'idle';
      this.stateT = 0;
    } else if (this.state === 'reload') {
      if (!this.reload) { this.state = 'idle'; this.stateT = 0; }
    }

    const e = this.active;
    if (!e) return;
    const def = e.def;

    // ADS blend (weapon system owns the true factor; fall back to easing).
    const adsTarget = typeof weapons?.adsFactor === 'number' ? weapons.adsFactor : 0;
    this.adsBlend += (adsTarget - this.adsBlend) * Math.min(1, dt * 14);

    // Scoped weapons: the eye goes "into" the scope, so the rifle model would
    // only block the (already magnified) main-camera view. Hide it while fully
    // scoped; the grenade throw animation also toggles visibility, so respect
    // an in-flight throw.
    const scoped = !!(weapons?.current?.def?.scope || def.family === 'sniper');
    if (scoped && this._throwT < 0) {
      e.group.visible = this.adsBlend < 0.72;
    }

    // --- movement sway: look-delta lag + velocity bob -----------------------
    const player = game.player;
    const yaw = player?.yaw ?? 0;
    const pitch = player?.pitch ?? 0;
    if (this._prevYaw === null) { this._prevYaw = yaw; this._prevPitch = pitch; }
    let dYaw = yaw - this._prevYaw;
    let dPitch = pitch - this._prevPitch;
    if (dYaw > Math.PI) dYaw -= Math.PI * 2;
    if (dYaw < -Math.PI) dYaw += Math.PI * 2;
    this._prevYaw = yaw;
    this._prevPitch = pitch;
    const lagScale = 1 - this.adsBlend * 0.82;
    const k = Math.min(1, dt * 10);
    this.swayPos.x += (THREE.MathUtils.clamp(-dYaw * 0.9, -0.03, 0.03) * lagScale - this.swayPos.x) * k;
    this.swayPos.y += (THREE.MathUtils.clamp(dPitch * 0.6, -0.025, 0.025) * lagScale - this.swayPos.y) * k;
    this.swayRot.z += (THREE.MathUtils.clamp(dYaw * 6, -0.06, 0.06) * lagScale - this.swayRot.z) * k;
    this.swayRot.x += (THREE.MathUtils.clamp(dPitch * 4, -0.05, 0.05) * lagScale - this.swayRot.x) * k;
    this.swayRot.y += (THREE.MathUtils.clamp(-dYaw * 4, -0.05, 0.05) * lagScale - this.swayRot.y) * k;

    const speed = player?.speed ?? 0;
    const grounded = player?.grounded ?? true;
    if (grounded && speed > 0.2) this.bobPhase += dt * (4.6 + speed * 1.6);
    const bobAmp = Math.min(1, speed / 3.2) * 0.008 * lagScale * (settings.get('reducedCameraMotion') ? 0.35 : 1);
    const bobX = Math.sin(this.bobPhase) * bobAmp;
    const bobY = -Math.abs(Math.cos(this.bobPhase)) * bobAmp * 1.2;
    // Vertical velocity lag (falls/jumps drag the weapon).
    const velY = player?.velocity?.y ?? 0;
    const velLag = THREE.MathUtils.clamp(velY * 0.006, -0.02, 0.02);

    // Landing-dip + recoil springs. Explicit Euler diverges above ~1/60 s, so
    // integrate in fixed substeps; anything beyond half a second is dropped —
    // these springs are at rest well before that.
    let springRem = Math.min(dt, 0.5);
    while (springRem > 0) {
      const h = Math.min(springRem, 1 / 120);
      springRem -= h;
      this.landDip += this.landVel * h;
      this.landVel -= (this.landDip * 260 + this.landVel * 14) * h;
      this.landVel *= Math.max(0, 1 - h * 2);
      this.kickPos += this.kickVelPos * h;
      this.kickVelPos -= (this.kickPos * 320 + this.kickVelPos * 16) * h;
      this.kickRot += this.kickVelRot * h;
      this.kickVelRot -= (this.kickRot * 260 + this.kickVelRot * 14) * h;
    }
    if (!Number.isFinite(this.kickPos + this.kickVelPos + this.kickRot + this.kickVelRot
      + this.landDip + this.landVel)) {
      this.kickPos = this.kickVelPos = this.kickRot = this.kickVelRot = 0;
      this.landDip = this.landVel = 0;
    }

    // Idle breathing sway.
    const breathe = (1 - this.adsBlend * 0.75);
    const bx = Math.sin(this._time * 1.1) * 0.0016 * breathe;
    const by = Math.sin(this._time * 2.2) * 0.0013 * breathe;

    // --- pose composition ---------------------------------------------------
    const hip = def.vm.hip;
    const adsY = -(def.sightY);
    const t = this.adsBlend;
    const px = hip[0] * (1 - t) + 0 * t + this.swayPos.x + bobX + bx;
    const py = hip[1] * (1 - t) + adsY * t + this.swayPos.y + bobY + by + velLag - this.landDip * 0.05;
    const pz = hip[2] * (1 - t) + def.vm.adsZ * t + this.kickPos;

    let rx = this.swayRot.x - this.kickRot - this.landDip * 0.25;
    // At the hip the weapon stays nearly parallel to the view direction so
    // foreshortening keeps the barrel short on screen (running steeply out of
    // frame, not diagonally across it), with a slight inward cant; both blend
    // out during ADS.
    let ry = this.swayRot.y + (1 - t) * 0.02;
    let rz = this.swayRot.z + (1 - t) * 0.02;

    // Draw / holster arcs.
    if (this.state === 'draw') {
      const dk = 1 - Math.min(1, this.stateT / this.drawDur);
      const ease = dk * dk;
      this.root.position.set(px, py - 0.28 * ease, pz + 0.06 * ease);
      rx -= 0.9 * ease;
      rz += 0.35 * ease;
    } else if (this.state === 'holster') {
      const hk = Math.min(1, this.stateT / this.holsterDur);
      const ease = hk * hk;
      this.root.position.set(px, py - 0.3 * ease, pz + 0.05 * ease);
      rx -= 1.0 * ease;
      rz += 0.3 * ease;
    } else {
      this.root.position.set(px, py, pz);
    }

    // Inspect: roll the weapon over, then back.
    if (this.inspectT >= 0) {
      this.inspectT += dt;
      const T = 2.4;
      if (this.inspectT >= T || this.adsBlend > 0.3 || this.reload) this.inspectT = -1;
      else {
        const w = Math.sin((this.inspectT / T) * Math.PI);
        ry += w * 0.85;
        rz += w * 0.55;
        rx += w * 0.15;
      }
    }

    // Melee / throw overlays.
    if (this._meleeT >= 0) {
      this._meleeT += dt;
      const T = 0.32;
      if (this._meleeT >= T) this._meleeT = -1;
      else {
        const w = Math.sin((this._meleeT / T) * Math.PI);
        this.root.position.z -= w * 0.22;
        this.root.position.x -= w * 0.1;
        ry -= w * 0.7;
        rz -= w * 0.4;
      }
    }
    if (this._throwT >= 0) {
      this._throwT += dt;
      const T = 0.5;
      if (this._throwT >= T) { this._throwT = -1; e.group.visible = true; }
      else {
        const w = Math.sin(Math.min(1, this._throwT / (T * 0.5)) * Math.PI * 0.5);
        this.root.position.z -= w * 0.3;
        rx -= w * 1.1;
        if (this._throwT > T * 0.55) e.group.visible = false;
      }
    }

    this.root.rotation.set(rx, ry, rz);

    // --- part animation ------------------------------------------------------
    this._updateCycle(dt, e, def);
    this._updateTrigger(dt, e);
    this._updateReload(dt, e, def);
  }

  _updateCycle(dt, e, def) {
    if (!e.slide || !e.slideHome) return;
    if (this.cycleT === -2) {
      // Manual action waiting for the recoil to settle.
      this.cycleDelay -= dt;
      if (this.cycleDelay <= 0) {
        this.cycleT = 0;
        this._ejectShell();
      }
      return;
    }
    if (this.cycleT < 0) return;
    const dur = Math.max(0.05, def.vm.cycleTime);
    this.cycleT += dt;
    const k = this.cycleT / dur;
    if (k >= 1) {
      this.cycleT = -1;
      e.slide.position.copy(e.slideHome);
      return;
    }
    // Back fast, forward slower.
    const travel = e.slide.userData.travel || 0.05;
    const pulse = k < 0.35 ? k / 0.35 : 1 - (k - 0.35) / 0.65;
    e.slide.position.z = e.slideHome.z + travel * pulse;
  }

  _updateTrigger(dt, e) {
    if (!e.handR?.trigger || this.triggerT < 0) return;
    this.triggerT += dt;
    const T = 0.14;
    if (this.triggerT >= T) {
      this.triggerT = -1;
      e.handR.trigger.rotation.x = 0.25;
      return;
    }
    const w = Math.sin((this.triggerT / T) * Math.PI);
    e.handR.trigger.rotation.x = 0.25 + w * 0.55;
  }

  _updateReload(dt, e, def) {
    if (!this.reload || !e.mag) return;
    const r = this.reload;
    r.t += dt;
    const n = r.t / r.dur; // normalized
    const mag = e.mag;
    const handL = e.handL?.group;

    // Timeline (fractions of dur):
    //   0.00-0.15 support hand moves to the magazine
    //   0.15-0.38 mag out + down (hand carries it)
    //   0.38-0.60 hands below view (swap)
    //   0.60-0.82 fresh mag rises + seats
    //   0.82-1.00 tactical: settle | empty: bolt release / charging handle
    const out = smooth(THREE.MathUtils.clamp((n - 0.15) / 0.23, 0, 1));
    const back = smooth(THREE.MathUtils.clamp((n - 0.60) / 0.22, 0, 1));
    const drop = out * (1 - back);
    mag.position.set(
      e.magHome.x,
      e.magHome.y - drop * 0.22,
      e.magHome.z + drop * 0.05
    );
    mag.rotation.x = e.magHomeRot.x + drop * 0.5;
    mag.visible = !(n > 0.42 && n < 0.56); // brief swap moment below view

    if (handL && e.handLParent !== e.slide) {
      const reach = smooth(THREE.MathUtils.clamp(n / 0.15, 0, 1)) * (1 - back);
      const magPos = mag.position;
      handL.position.lerpVectors(
        e.handLHome,
        new THREE.Vector3(magPos.x - 0.01, magPos.y - 0.06, magPos.z + 0.01),
        reach
      );
    }

    // Weapon tilts toward the player during the swap.
    const tilt = Math.sin(Math.min(1, n / 0.9) * Math.PI) * 0.28;
    e.group.rotation.z = tilt * 0.6;
    e.group.rotation.x = tilt * 0.25;

    // Empty reload: cycle the action in the last stretch.
    if (r.kind === 'empty' && e.slide && e.slideHome) {
      const ck = THREE.MathUtils.clamp((n - 0.84) / 0.14, 0, 1);
      if (ck > 0) {
        const travel = e.slide.userData.travel || 0.05;
        const pulse = ck < 0.5 ? ck / 0.5 : 1 - (ck - 0.5) / 0.5;
        e.slide.position.z = e.slideHome.z + travel * pulse;
      }
    }

    if (n >= 1) {
      this.reload = null;
      this._restoreParts();
      e.group.rotation.set(0, 0, 0);
      if (this.state === 'reload') { this.state = 'idle'; this.stateT = 0; }
    }
  }

  _melee() { this._meleeT = 0; }
  _throw() { this._throwT = 0; }

  _ejectShell() {
    const e = this.active;
    const fx = this.game.effects;
    if (!e?.eject || !fx?.ejectShell) return;
    const pos = this._worldOf(e.eject);
    const d = e.eject.userData.dir || [1, 0.6, 0.15];
    const right = new THREE.Vector3().setFromMatrixColumn(this.game.camera.matrixWorld, 0);
    const up = new THREE.Vector3().setFromMatrixColumn(this.game.camera.matrixWorld, 1);
    const fwd = this._cameraForward();
    const dir = new THREE.Vector3()
      .addScaledVector(right, d[0])
      .addScaledVector(up, d[1])
      .addScaledVector(fwd, -d[2])
      .normalize();
    fx.ejectShell(pos, dir, e.def.family);
  }

  /** Overlay-space object -> main-camera world space (for effects). */
  _worldOf(obj) {
    const p = new THREE.Vector3();
    if (!obj) return p;
    this.vmCamera.updateMatrixWorld(true);
    obj.getWorldPosition(p); // overlay scene space == camera space
    return p.applyMatrix4(this.game.camera.matrixWorld);
  }

  _cameraForward() {
    return new THREE.Vector3(0, 0, -1).applyQuaternion(this.game.camera.quaternion);
  }

  // --------------------------------------------------------------- render --

  /**
   * Draw the overlay into the CURRENT render target with the depth buffer
   * cleared. Called by the engine.render wrapper installed in the
   * constructor; also public per the interface contract.
   */
  render(renderer) {
    const game = this.game;
    if (!game.levelReady || !this.active) return;
    const st = game.state;
    if (st !== 'playing' && st !== 'paused') return;
    const prevAutoClear = renderer.autoClear;
    renderer.autoClear = false;
    renderer.clearDepth();
    renderer.render(this.vmScene, this.vmCamera);
    renderer.autoClear = prevAutoClear;
  }

  /** Alias kept for the spec / external callers. */
  renderOverlay(renderer) {
    this.render(renderer);
  }

  dispose() {
    for (const off of this._offs) off?.();
  }
}

ViewModel.prototype._meleeT = -1;
ViewModel.prototype._throwT = -1;

function smooth(x) { return x * x * (3 - 2 * x); }
