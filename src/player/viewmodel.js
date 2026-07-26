// ============================================================================
// First-person viewmodel (Fable 4 — weapons): arms + weapon rendered in an
// overlay scene with its own camera, driven procedurally from live weapon /
// player state and bus events. No keyframed clips — every motion is tweened.
//
// installViewmodel(game) sets game.viewmodel = {
//   update(dt)            advance animation (called every render frame)
//   renderPass(renderer)  draw the FP scene over the main frame (clearDepth)
//   getMuzzleWorld()      current muzzle tip in WORLD space {x,y,z}
//   setVisible(v)
// }
// ============================================================================
import * as THREE from 'three';
import { bus } from '../core/events.js';
import { settings } from '../core/settings.js';
import {
  buildWeaponModel, buildFistModel, buildForearmModel,
  buildMuzzleFlash, buildShellProp,
} from '../assets/weapons_models.js';

// Per-weapon view tuning: hip pose (weapon-space, camera looks down -Z),
// ADS distance, fire kick strengths. aimRef (from the model) supplies the
// ADS x/y so the sight line lands exactly on the camera axis.
const VIEW_TUNING = {
  ad9:      { hip: [0.14, -0.15, -0.33], hipRot: [0.012, 0.05, 0.03], adsZ: -0.30, kick: { z: 0.024, up: 0.05, side: 0.016 }, blowback: true, flash: 0.8 },
  vesper:   { hip: [0.16, -0.175, -0.38], hipRot: [0.01, 0.045, 0.025], adsZ: -0.33, kick: { z: 0.016, up: 0.03, side: 0.012 }, flash: 0.9 },
  bdr15:    { hip: [0.165, -0.185, -0.44], hipRot: [0.01, 0.045, 0.02], adsZ: -0.37, kick: { z: 0.022, up: 0.042, side: 0.013 }, flash: 1.0 },
  havelock: { hip: [0.155, -0.195, -0.44], hipRot: [0.008, 0.04, 0.015], adsZ: -0.40, kick: { z: 0.05, up: 0.1, side: 0.02 }, flash: 1.5 },
  meridian: { hip: [0.165, -0.20, -0.48], hipRot: [0.008, 0.04, 0.015], adsZ: -0.38, kick: { z: 0.034, up: 0.08, side: 0.014 }, scoped: true, flash: 1.4 },
  knife:    { hip: [0.165, -0.115, -0.30], hipRot: [0.5, 0.2, -0.15], adsZ: -0.30, kick: { z: 0, up: 0, side: 0 } },
  flash:    { hip: [0.16, -0.155, -0.31], hipRot: [0.22, -0.7, 0.08], adsZ: -0.31, kick: { z: 0, up: 0, side: 0 } },
  smoke:    { hip: [0.16, -0.155, -0.31], hipRot: [0.22, -0.7, 0.08], adsZ: -0.31, kick: { z: 0, up: 0, side: 0 } },
};

const ELBOW_R = new THREE.Vector3(0.24, -0.45, 0.08);
const ELBOW_L = new THREE.Vector3(-0.26, -0.47, 0.12);
const V_ZERO = new THREE.Vector3();

export function installViewmodel(game) {
  const vm = new Viewmodel(game);
  game.viewmodel = vm;
  return vm;
}

class Viewmodel {
  constructor(game) {
    this.game = game;

    // ---- overlay scene + camera -----------------------------------------
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(55, game.camera?.aspect || 16 / 9, 0.01, 5);
    this.camera.rotation.order = 'YXZ';
    this.scene.add(this.camera);

    this.hemi = new THREE.HemisphereLight(0xbfd2e4, 0x33383e, 0.85);
    this.dir = new THREE.DirectionalLight(0xf2ead8, 0.8);
    this.dir.position.set(0.7, 1.2, 0.9);
    this.scene.add(this.hemi, this.dir, this.dir.target);
    this.scene.environment = game.scene?.environment || null;
    this.scene.environmentIntensity = 0.26;

    // ---- rig graph: camera > rig > sway > pose > (weapon, hands) --------
    this.rig = new THREE.Group();
    this.camera.add(this.rig);
    this.sway = new THREE.Group();
    this.rig.add(this.sway);
    this.pose = new THREE.Group();
    this.sway.add(this.pose);
    this.weaponNode = new THREE.Group();
    this.pose.add(this.weaponNode);

    this.handR = buildFistModel('right');
    this.handL = buildFistModel('left');
    this.pose.add(this.handR, this.handL);
    this.forearmR = buildForearmModel('right');
    this.forearmL = buildForearmModel('left');
    this.rig.add(this.forearmR, this.forearmL);

    this.flashFx = buildMuzzleFlash();
    this.weaponNode.add(this.flashFx);
    this.shellProp = buildShellProp();
    this.shellProp.visible = false;
    this.handL.add(this.shellProp);
    this.shellProp.position.set(0, 0.035, -0.045);

    // ---- state ------------------------------------------------------------
    this._models = new Map();
    this.shownId = null;
    this.model = null;
    this.ud = null;
    this.tune = VIEW_TUNING.bdr15;
    this._visible = true;
    this._externallyDriven = false;
    this._legacyCall = false;

    // event-driven animation timers (sim-time anchored => deterministic)
    this.evt = {
      fire: -99, fireSeed: 0, dry: -99, melee: -99, throw: -99,
      land: -99, landAmp: 0, jump: -99, reloadEmpty: false,
    };
    // sway tracking
    this.prevYaw = null;
    this.prevPitch = null;
    this.swYaw = 0;
    this.swPitch = 0;
    // smoothed hand targets
    this._handLPos = new THREE.Vector3();
    this._handLRot = new THREE.Euler();
    this._handRPos = new THREE.Vector3();
    this._handRRot = new THREE.Euler();
    this._tmpV = new THREE.Vector3();
    this._tmpV2 = new THREE.Vector3();
    this._flashSpin = 0;
    this._flashScale = 1;

    this._offs = [
      bus.on('weapon-fired', () => {
        this.evt.fire = this._now();
        this.evt.fireSeed = Math.random() * 2 - 1;
        this._flashSpin = Math.random() * Math.PI * 2;
        this._flashScale = 0.85 + Math.random() * 0.4;
      }),
      bus.on('weapon-dryfire', () => { this.evt.dry = this._now(); }),
      bus.on('weapon-reload-start', (e) => { this.evt.reloadEmpty = !!e?.empty; }),
      bus.on('weapon-melee', () => { this.evt.melee = this._now(); }),
      bus.on('throwable-thrown', () => { this.evt.throw = this._now(); }),
      bus.on('player-land', (v) => {
        this.evt.land = this._now();
        this.evt.landAmp = clamp(((v || 6) - 5.5) / 6, 0.35, 1);
      }),
      bus.on('player-jump', () => { this.evt.jump = this._now(); }),
    ];

    if (game.weapons) this._swap(game.weapons.currentId);
  }

  _now() { return this.game.loop?.simTime ?? 0; }

  // ------------------------------------------------------------- weapon swap
  _getModel(id) {
    if (!this._models.has(id)) {
      this._models.set(id, buildWeaponModel(id, { firstPerson: true }));
    }
    return this._models.get(id);
  }

  _swap(id) {
    if (this.model) this.weaponNode.remove(this.model);
    this.shownId = id;
    this.model = this._getModel(id);
    this.ud = this.model.userData;
    this.tune = VIEW_TUNING[id] || VIEW_TUNING.bdr15;
    this.weaponNode.add(this.model);
    this.weaponNode.visible = true;

    // remember home transforms of the animated nodes
    const home = (node) => node && {
      pos: node.position.clone(), rot: node.rotation.clone(),
    };
    this._magHome = home(this.ud.magazine);
    this._boltHome = home(this.ud.boltOrSlide);

    // muzzle flash sits at the muzzle tip
    this.flashFx.position.copy(this.ud.muzzle || V_ZERO);
    this.flashFx.visible = false;

    // hands: right always on the grip; left per weapon (may ride the pump)
    const g = this.ud.grips || {};
    this._applyGrip(this.handR, g.right, this.pose);
    if (g.left) {
      const parent = g.left.parent === 'slide' && this.ud.boltOrSlide ? this.ud.boltOrSlide : this.pose;
      this._applyGrip(this.handL, g.left, parent);
      this.handL.visible = true;
      this.forearmL.visible = true;
    } else {
      this.handL.visible = false;
      this.forearmL.visible = false;
    }
    this._handLHome = g.left ? { pos: g.left.pos.clone(), rot: g.left.rot.clone() } : null;
    this._handRHome = g.right ? { pos: g.right.pos.clone(), rot: g.right.rot.clone() } : null;
    this._handLPos.copy(this.handL.position);
    this._handRPos.copy(this.handR.position);
    this.shellProp.visible = false;
  }

  _applyGrip(hand, gripDef, parent) {
    if (!gripDef) return;
    if (hand.parent !== parent) parent.add(hand);
    hand.position.copy(gripDef.pos);
    hand.rotation.set(gripDef.rot.x, gripDef.rot.y, gripDef.rot.z);
  }

  // ------------------------------------------------------------------ update
  update(dt) {
    if (!this._legacyCall) this._externallyDriven = true;
    const g = this.game;
    const w = g.weapons;
    const p = g.player;
    if (!w || !p) return;

    const dtc = clamp(dt, 0, 0.1);
    const dtEff = Math.max(dt, 1 / 240);
    const now = this._now();
    const reduced = settings.get('reducedMotion');

    if (w.currentId !== this.shownId) this._swap(w.currentId);
    const cur = w.current();
    const def = w.currentDef();
    const tune = this.tune;
    const ud = this.ud;

    // ---------- pose accumulator (weapon space) ---------------------------
    const ads = def.kind === 'gun' ? w.ads : 0;
    const a = ads * ads * (3 - 2 * ads); // smoothstep the (already eased) blend
    let px = lerp(tune.hip[0], -(ud.aimRef?.x || 0), a);
    let py = lerp(tune.hip[1], -(ud.aimRef?.y || 0), a);
    let pz = lerp(tune.hip[2], tune.adsZ, a);
    let rx = lerp(tune.hipRot[0], 0, a);
    let ry = lerp(tune.hipRot[1], 0, a);
    let rz = lerp(tune.hipRot[2], 0, a);

    // scoped weapon: melt out of view as the scope overlay takes over
    let weaponHidden = false;
    if (tune.scoped) {
      const h = clamp((ads - 0.62) / 0.2, 0, 1);
      py -= 0.34 * h;
      pz += 0.06 * h;
      rx -= 0.55 * h;
      weaponHidden = h > 0.97;
    }

    // ---------- weapon state machine (draw / reload / bolt / pump) --------
    // animated-node defaults (restored every frame, overridden below)
    const mag = ud.magazine;
    const bolt = ud.boltOrSlide;
    if (mag && this._magHome) { mag.position.copy(this._magHome.pos); mag.rotation.copy(this._magHome.rot); mag.visible = true; }
    if (bolt && this._boltHome) { bolt.position.copy(this._boltHome.pos); bolt.rotation.copy(this._boltHome.rot); }
    if (ud.boltArm) ud.boltArm.rotation.z = -0.95;

    let handLTarget = null; // {pos, rot} in the left hand's parent space
    let handRTarget = null;
    let shellVisible = false;

    if (w.state === 'draw' && def.drawTime) {
      const dp = easeOutCubic(1 - clamp(w.stateT / def.drawTime, 0, 1));
      py -= 0.26 * (1 - dp);
      px += 0.05 * (1 - dp);
      rx -= 0.5 * (1 - dp);
      rz -= 0.45 * (1 - dp);
    } else if (w.state === 'reload' && def.reloadTime) {
      const rp = 1 - clamp(w.stateT / def.reloadTime, 0, 1);
      if (def.reloadPerShell) {
        // ---- shotgun: hand carries a shell to the loading port ----------
        // roll the bottom port toward the camera so the insert reads
        const env = smooth01(rp / 0.18) * (1 - smooth01((rp - 0.86) / 0.14));
        rz -= 0.5 * env;
        rx += 0.14 * env;
        ry += 0.1 * env;
        px -= 0.015 * env;
        py += 0.012 * env;
        // left hand path in PUMP space (hand is parented to the pump),
        // approaching along the camera-side flank of the tube
        const toStage = smooth01(rp / 0.3);
        const toPort = smooth01((rp - 0.3) / 0.32);
        const back = smooth01((rp - 0.72) / 0.28);
        const stage = this._tmpV.set(-0.06, -0.13, 0.2);
        const port = this._tmpV2.set(-0.025, -0.055, 0.27);
        const hp = new THREE.Vector3().copy(this._handLHome.pos)
          .lerp(stage, toStage)
          .lerp(port, toPort)
          .lerp(stage, back * 0.7);
        handLTarget = { pos: hp, rot: new THREE.Euler(Math.PI / 2 + 0.4 * toPort - 0.5 * toStage, 0.2 * toStage, 0.55 * toStage - 0.2 * toPort) };
        shellVisible = rp > 0.12 && rp < 0.68;
      } else {
        // ---- box magazine: out + drop, insert, seat, (rack if empty) ----
        const env = smooth01(rp / 0.14) * (1 - smooth01((rp - 0.84) / 0.16));
        rz += 0.45 * env;
        rx += 0.16 * env;
        ry += 0.12 * env;
        px -= 0.025 * env;
        py -= 0.015 * env;
        if (mag && this._magHome) {
          const out = easeInQuad(smooth01((rp - 0.06) / 0.2));
          const fall = easeInQuad(smooth01((rp - 0.26) / 0.18));
          const inn = easeOutCubic(smooth01((rp - 0.46) / 0.26));
          const dir = ud.magDir || new THREE.Vector3(0, -1, 0);
          let k;
          let tumble = 0;
          if (rp < 0.46) { k = out * 0.13 + fall * 0.3; tumble = fall * 0.9; } // old mag drops away
          else { k = 0.17 * (1 - inn); tumble = 0.15 * (1 - inn); }           // fresh mag comes up
          mag.position.copy(this._magHome.pos).addScaledVector(dir, k);
          mag.rotation.x = this._magHome.rot.x + tumble * 0.5;
          mag.visible = !(rp >= 0.4 && rp < 0.46); // brief blink as the old mag leaves
          // left hand follows the fresh magazine to the well
          const fw = smooth01((rp - 0.1) / 0.16) * (1 - smooth01((rp - 0.76) / 0.16));
          if (this._handLHome && fw > 0.001) {
            const magPos = this._nodePosInPoseSpace(mag);
            magPos.y -= 0.05;
            magPos.z += 0.01;
            const hp = new THREE.Vector3().copy(this._handLHome.pos).lerp(magPos, fw);
            handLTarget = {
              pos: hp,
              rot: new THREE.Euler(
                this._handLHome.rot.x - 0.5 * fw,
                this._handLHome.rot.y,
                this._handLHome.rot.z + 0.3 * fw),
            };
          }
        }
        // charge on empty reload: slide slams / handle racked near the end
        if (bolt && this._boltHome && this.evt.reloadEmpty) {
          if (tune.blowback) {
            const back = 1 - smooth01((rp - 0.88) / 0.08);
            bolt.position.z = this._boltHome.pos.z + (ud.slideTravel || 0.03) * back;
          } else {
            const rack = pulse01(smooth01((rp - 0.8) / 0.17));
            bolt.position.z = this._boltHome.pos.z + (ud.slideTravel || 0.05) * rack;
          }
        }
      }
    } else if (w.state === 'pump' && def.pumpTime) {
      const pp = 1 - clamp(w.stateT / def.pumpTime, 0, 1);
      const back = smooth01((pp - 0.08) / 0.34) * (1 - smooth01((pp - 0.55) / 0.33));
      if (bolt && this._boltHome) bolt.position.z = this._boltHome.pos.z + (ud.slideTravel || 0.1) * back;
      rx += 0.05 * Math.sin(Math.PI * clamp(pp, 0, 1));
      pz += 0.012 * back;
    } else if (w.state === 'bolt' && def.boltTime) {
      const bp = 1 - clamp(w.stateT / def.boltTime, 0, 1);
      const lift = smooth01((bp - 0.12) / 0.16) * (1 - smooth01((bp - 0.72) / 0.14));
      const pull = smooth01((bp - 0.3) / 0.16) * (1 - smooth01((bp - 0.52) / 0.16));
      if (bolt && this._boltHome) {
        bolt.rotation.z = this._boltHome.rot.z + (ud.boltLift || 0.9) * lift;
        bolt.position.z = this._boltHome.pos.z + (ud.slideTravel || 0.07) * pull;
      }
      // cant the rifle left so the bolt work on the right flank reads
      rz -= 0.3 * lift;
      rx += 0.08 * lift;
      px -= 0.02 * lift;
      py += 0.01 * lift;
      // right hand rides the bolt knob
      const fw = smooth01(bp / 0.14) * (1 - smooth01((bp - 0.82) / 0.16));
      if (fw > 0.001 && bolt) {
        const knob = this._boltKnobInPoseSpace();
        knob.x += 0.012;
        knob.y -= 0.03;
        const hp = new THREE.Vector3().copy(this._handRHome.pos).lerp(knob, fw);
        handRTarget = {
          pos: hp,
          rot: new THREE.Euler(
            this._handRHome.rot.x + (Math.PI / 2 - 0.4 - this._handRHome.rot.x) * fw,
            this._handRHome.rot.y - 0.2 * fw,
            this._handRHome.rot.z - 0.5 * fw),
        };
      }
    }

    // pistol slide lock-back on an empty magazine
    if (tune.blowback && bolt && this._boltHome && def.kind === 'gun' &&
        cur.mag === 0 && w.state !== 'reload' && w.state !== 'draw') {
      bolt.position.z = this._boltHome.pos.z + (ud.slideTravel || 0.03);
    }

    // ---------- transient event animations --------------------------------
    // fire: sharp kick back + muzzle rise + quick recover (+ slide blowback)
    const ft = now - this.evt.fire;
    if (ft >= 0 && ft < 0.5 && def.kind === 'gun') {
      const kickScale = 1 - 0.3 * a;
      pz += tune.kick.z * Math.exp(-ft / 0.06) * kickScale;
      rx += tune.kick.up * Math.exp(-ft / 0.085) * kickScale;
      rz += tune.kick.side * this.evt.fireSeed * Math.exp(-ft / 0.11);
      ry += tune.kick.side * 0.6 * this.evt.fireSeed * Math.exp(-ft / 0.11);
      if (tune.blowback && bolt && this._boltHome && w.state !== 'reload' && cur.mag > 0) {
        const c = ft < 0.045 ? ft / 0.045 : Math.max(0, 1 - (ft - 0.045) / 0.075);
        bolt.position.z = this._boltHome.pos.z + (ud.slideTravel || 0.03) * c;
      }
    }
    // muzzle flash card
    const showFlash = def.kind === 'gun' && ft >= 0 && ft < 0.05 && !weaponHidden;
    this.flashFx.visible = showFlash;
    if (showFlash) {
      const s = (tune.flash || 1) * this._flashScale * (1 - ft / 0.06);
      this.flashFx.scale.setScalar(Math.max(0.05, s));
      this.flashFx.rotation.z = this._flashSpin;
    }

    // dry fire: tiny click twitch
    const dyt = now - this.evt.dry;
    if (dyt >= 0 && dyt < 0.14) rx -= 0.02 * Math.sin((dyt / 0.14) * Math.PI);

    // knife slash: windup -> diagonal cut -> recover
    const mt = now - this.evt.melee;
    if (mt >= 0 && mt < 0.44 && def.kind === 'melee') {
      const mp = mt / 0.44;
      const wind = smooth01(mp / 0.24) * (1 - smooth01((mp - 0.24) / 0.2));
      const cut = smooth01((mp - 0.24) / 0.22) * (1 - smooth01((mp - 0.62) / 0.38));
      px += 0.07 * wind - 0.16 * cut;
      py += 0.06 * wind - 0.10 * cut;
      pz += 0.05 * wind - 0.13 * cut;
      rx += 0.35 * wind - 0.35 * cut;
      ry += 0.35 * wind - 0.9 * cut;
      rz += -0.45 * wind + 0.85 * cut;
    }

    // throwable: windup, whip forward, device leaves the hand, re-grab
    const tt = now - this.evt.throw;
    if (tt >= 0 && def.kind === 'throwable') {
      const tp = clamp(tt / 0.66, 0, 1);
      const wind = smooth01(tp / 0.27) * (1 - smooth01((tp - 0.27) / 0.16));
      const whip = smooth01((tp - 0.27) / 0.2) * (1 - smooth01((tp - 0.62) / 0.38));
      px += 0.05 * wind - 0.02 * whip;
      py += 0.09 * wind - 0.08 * whip;
      pz += 0.10 * wind - 0.16 * whip;
      rx += 0.75 * wind - 0.7 * whip;
      rz += -0.2 * wind + 0.15 * whip;
      const released = tp >= 0.4;
      weaponHidden = weaponHidden || (released && (cur.count <= 0 || tp < 0.8));
    }

    // landing dip / jump hop
    const lt = now - this.evt.land;
    if (lt >= 0 && lt < 0.55 && !reduced) {
      const e = lt / 0.55;
      const env = Math.sin(Math.PI * Math.min(1, e * 1.25)) * Math.exp(-1.8 * e);
      py -= 0.055 * env * this.evt.landAmp;
      rx -= 0.07 * env * this.evt.landAmp;
    }
    const jt = now - this.evt.jump;
    if (jt >= 0 && jt < 0.3 && !reduced) {
      py += 0.018 * Math.sin((jt / 0.3) * Math.PI);
    }

    // ---------- sway / bob / breathing (render-feel layer) ----------------
    let sx = 0, sy = 0, sz = 0, srx = 0, sry = 0, srz = 0;
    if (!reduced) {
      // breathing
      const br = (1 - 0.85 * a);
      sy += (Math.sin(now * 1.5) * 0.0016 + Math.sin(now * 0.83 + 1.4) * 0.001) * br;
      srx += Math.sin(now * 1.2 + 0.6) * 0.0016 * br;

      // look sway: weapon lags behind yaw/pitch velocity
      if (this.prevYaw === null) { this.prevYaw = p.yaw; this.prevPitch = p.pitch; }
      const yawVel = clamp((p.yaw - this.prevYaw) / dtEff, -7, 7);
      const pitchVel = clamp((p.pitch - this.prevPitch) / dtEff, -7, 7);
      this.prevYaw = p.yaw;
      this.prevPitch = p.pitch;
      const k = Math.min(1, dtc * 9);
      this.swYaw += (yawVel - this.swYaw) * k;
      this.swPitch += (pitchVel - this.swPitch) * k;
      const swayAmt = 1 - 0.85 * a;
      sry += this.swYaw * 0.011 * swayAmt;
      srx += -this.swPitch * 0.010 * swayAmt;
      sx += -this.swYaw * 0.0035 * swayAmt;
      sy += -this.swPitch * 0.0028 * swayAmt;
      srz += this.swYaw * 0.006 * swayAmt;

      // movement sway: strafing rolls, forward speed pulls the weapon back
      const rt = p.right();
      const fw = p.forward();
      const lat = p.vel.x * rt.x + p.vel.z * rt.z;
      const fwd = p.vel.x * fw.x + p.vel.z * fw.z;
      srz += -lat * 0.0065 * swayAmt;
      sx += -lat * 0.0011 * swayAmt;
      sz += Math.abs(fwd) * 0.0011 * swayAmt;
      if (!p.onGround) sy -= clamp(p.vel.y, -8, 8) * 0.0028 * swayAmt;

      // walk/run bob (synced to the player's stride)
      const amp = p.bobAmp * (1 - 0.85 * a);
      sx += Math.cos(p.bobPhase * 0.5) * 0.013 * amp;
      sy -= Math.abs(Math.sin(p.bobPhase + 0.4)) * 0.011 * amp;
      srz += Math.sin(p.bobPhase * 0.5) * 0.01 * amp;
      srx += Math.sin(p.bobPhase * 2 + 1) * 0.004 * amp;
    }

    // ---------- apply ------------------------------------------------------
    this.pose.position.set(px, py, pz);
    this.pose.rotation.set(rx, ry, rz);
    this.sway.position.set(sx, sy, sz);
    this.sway.rotation.set(srx, sry, srz);
    this.weaponNode.visible = !weaponHidden;
    this.handR.visible = true;
    this.handL.visible = !!this._handLHome && !weaponHidden;
    if (tune.scoped) this.handR.visible = this.handL.visible = !weaponHidden;

    // hands ease toward their targets (grip home unless a phase overrides)
    this._settleHand(this.handR, this._handRHome, handRTarget, dtc);
    if (this._handLHome) this._settleHand(this.handL, this._handLHome, handLTarget, dtc);
    this.shellProp.visible = shellVisible;

    // forearms stretch between fixed elbow anchors and the animated wrists
    this.rig.updateMatrixWorld(true);
    this._solveForearm(this.forearmR, this.handR, ELBOW_R);
    if (this.handL.visible) this._solveForearm(this.forearmL, this.handL, ELBOW_L);
    this.forearmR.visible = this.handR.visible;
    this.forearmL.visible = this.handL.visible;

    // cheap scene-brightness mimic: follow the world lighting rig
    const L = this.game.lighting;
    if (L?.hemi && L?.sun) {
      const f = clamp(0.3 + 0.7 * (L.hemi.intensity / 0.85), 0.3, 1.5);
      this.hemi.intensity = 0.85 * f;
      this.dir.intensity = 1.05 * clamp(0.35 + 0.65 * (L.sun.intensity / 2.6), 0.35, 1.3);
    }
  }

  _settleHand(hand, homeDef, target, dtc) {
    const wantPos = target ? target.pos : homeDef?.pos;
    const wantRot = target ? target.rot : homeDef?.rot;
    if (!wantPos) return;
    const k = Math.min(1, dtc * 16);
    hand.position.lerp(wantPos, k);
    hand.rotation.x += (wantRot.x - hand.rotation.x) * k;
    hand.rotation.y += (wantRot.y - hand.rotation.y) * k;
    hand.rotation.z += (wantRot.z - hand.rotation.z) * k;
  }

  // position of an animated node expressed in pose space (weapon root space)
  _nodePosInPoseSpace(node) {
    const v = new THREE.Vector3();
    let n = node;
    while (n && n !== this.pose) {
      n.updateMatrix();
      v.applyMatrix4(n.matrix);
      n = n.parent;
    }
    return v;
  }

  _boltKnobInPoseSpace() {
    const bolt = this.ud.boltOrSlide;
    const knob = this._tmpV.set(0.04, 0, 0.03);
    if (this.ud.boltArm) {
      this.ud.boltArm.updateMatrix();
      knob.applyMatrix4(this.ud.boltArm.matrix);
    }
    bolt.updateMatrix();
    knob.applyMatrix4(bolt.matrix);
    return knob.clone();
  }

  _solveForearm(forearm, hand, elbowLocal) {
    const wrist = hand.userData.wrist || V_ZERO;
    const wristWorld = this._tmpV.copy(wrist);
    hand.localToWorld(wristWorld);
    const wristRig = this.rig.worldToLocal(wristWorld.clone());
    const elbowWorld = this._tmpV2.copy(elbowLocal);
    this.rig.localToWorld(elbowWorld);
    forearm.position.copy(wristRig);
    forearm.lookAt(elbowWorld);
    forearm.scale.z = Math.max(0.05, wristRig.distanceTo(elbowLocal));
  }

  // -------------------------------------------------------------- rendering
  _syncCamera() {
    const g = this.game;
    if (!g.camera) return;
    this.camera.position.copy(g.camera.position);
    this.camera.quaternion.copy(g.camera.quaternion);
    if (Math.abs(this.camera.aspect - g.camera.aspect) > 1e-4) {
      this.camera.aspect = g.camera.aspect;
      this.camera.updateProjectionMatrix();
    }
  }

  _shouldShow() {
    const g = this.game;
    if (!this._visible || g.galleryActive) return false;
    if (!(g.state === 'playing' || g.state === 'paused' || g.state === 'victory' || g.state === 'defeat')) return false;
    return !!g.player?.alive;
  }

  renderPass(renderer) {
    this._syncCamera();
    if (!this._shouldShow()) return;
    if (this.scene.environment !== this.game.scene?.environment) {
      this.scene.environment = this.game.scene?.environment || null;
    }
    const prevAutoClear = renderer.autoClear;
    renderer.autoClear = false;
    renderer.clearDepth();
    renderer.render(this.scene, this.camera);
    renderer.autoClear = prevAutoClear;
  }

  // Legacy per-frame hook: main.js currently calls viewmodel.render(elapsed)
  // BEFORE the world render, where drawing would be wiped by autoClear. Until
  // the lead wires update()+renderPass() after the world render, this keeps
  // the animation warm; it steps aside as soon as update() is driven
  // externally so time never advances twice per frame.
  render(elapsed) {
    if (this._externallyDriven) return;
    this._legacyCall = true;
    this.update(typeof elapsed === 'number' ? elapsed : 1 / 60);
    this._legacyCall = false;
  }

  getMuzzleWorld() {
    this._syncCamera();
    this.camera.updateMatrixWorld(true);
    const v = this._tmpV.copy(this.ud?.muzzle || V_ZERO);
    (this.model || this.weaponNode).localToWorld(v);
    return { x: v.x, y: v.y, z: v.z };
  }

  setVisible(v) { this._visible = !!v; }

  dispose() {
    for (const off of this._offs) off();
    this._offs = [];
  }
}

// ------------------------------------------------------------------ helpers
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function lerp(a, b, t) { return a + (b - a) * t; }
function smooth01(t) { const x = clamp(t, 0, 1); return x * x * (3 - 2 * x); }
function easeOutCubic(t) { const x = clamp(t, 0, 1); return 1 - Math.pow(1 - x, 3); }
function easeInQuad(t) { const x = clamp(t, 0, 1); return x * x; }
// 0->1->0 triangle with smooth ends
function pulse01(t) { const x = clamp(t, 0, 1); return Math.sin(Math.PI * x); }
