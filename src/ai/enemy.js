import * as THREE from 'three';
import { rand, randRange, randInt, randSpread } from '../core/rand.js';
import { perceive, think, hitChance, wrapAngle } from './behavior.js';

const UP = new THREE.Vector3(0, 1, 0);
const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _q2 = new THREE.Quaternion();
const _q3 = new THREE.Quaternion();
const _m = new THREE.Matrix4();
const ZERO = new THREE.Vector3(0, 0, 0);
const Q_IDENT = new THREE.Quaternion();
const X_AXIS = new THREE.Vector3(1, 0, 0);
const Z_AXIS = new THREE.Vector3(0, 0, 1);

let ENEMY_ID = 1;

// approximate clip speeds of the soldier Walk/Run cycles at timeScale 1
const WALK_REF = 1.75;
const RUN_REF = 4.7;
const FALL_ANGLE = Math.PI / 2 * 0.97;

// two-hand aim pose overlay (found empirically via ?armtest — see report);
// arms carried ~3° lower than round 1 so the mount reads braced, not zombie-reach
const D2R = THREE.MathUtils.degToRad;
const AIM_R_ARM = new THREE.Quaternion().setFromEuler(new THREE.Euler(D2R(-47), 0, D2R(-55)));
const AIM_R_FOREARM = new THREE.Quaternion().setFromEuler(new THREE.Euler(D2R(-14), 0, D2R(-10)));
const AIM_L_ARM = new THREE.Quaternion().setFromEuler(new THREE.Euler(D2R(-39), 0, D2R(48)));
const AIM_L_FOREARM = new THREE.Quaternion().setFromEuler(new THREE.Euler(D2R(-38), 0, D2R(14)));

/**
 * One AI soldier. Contract used by other systems:
 *   alive, health, position (Vector3, feet), state
 *   damage(amount, headshot, point, dir), die(headshot, cause), eyePos(out)
 */
export class Enemy {
  constructor(sys, pos, opts = {}) {
    this.sys = sys;
    this.game = sys.game;
    this.id = ENEMY_ID++;

    // --- contract state ----------------------------------------------------
    this.position = pos.clone();
    this.position.y = 0;
    this.health = 100;
    this.alive = true;
    this.state = 'patrol';
    this.yaw = opts.yaw ?? rand() * Math.PI * 2;

    // --- perception ----------------------------------------------------------
    this.canSee = false;
    this.lastKnown = null;
    this.awareT = 99;
    this.heardT = 0;
    this.reactionT = 0;
    this.engageT = 0;
    this.hadContact = false;
    this.playerDist = 999;

    // --- movement -------------------------------------------------------------
    this.path = null;
    this.pathIdx = 0;
    this.repathT = randRange(0, 1.5);
    this.holdT = 0;
    this.stateT = 0;
    this.stuckT = 0;
    this.faceYaw = null;
    this.speed = 0;
    this.speedSmooth = 0;
    this.walkSpeed = randRange(1.6, 2.0);
    this.runSpeed = randRange(4.1, 4.9);

    // --- combat -----------------------------------------------------------------
    this.burstLeft = 0;
    this.shotT = 0;
    this.burstCd = randRange(0.2, 0.8);
    this.burstsFired = 0;
    this.suppressT = 0;
    this.tookCover = false;
    this.coverWaited = false;
    this.scanCount = 0;
    this.devLock = opts.devLock ?? null;

    // --- reactions / death ---------------------------------------------------
    this.flinch = 0;
    this.flinchVel = 0;
    this.flinchLat = 1;
    this.hitStop = 0;
    this.aimTwist = 0;
    this.aimPitch = 0;
    this.aimBlend = 0;
    this._lastHitDir = null;
    this._explCause = null;
    this.deathT = 0;

    // --- visuals ---------------------------------------------------------------
    this.variant = opts.variant ?? randInt(0, 2);
    this.inst = sys.factory.create(this.variant);
    this.group = new THREE.Group();
    this.group.add(this.inst.root);
    this.inst.root.rotation.y = sys.modelYawOffset;
    this.group.position.copy(this.position);
    this.group.rotation.y = this.yaw;
    for (const hb of this.inst.hitboxes) {
      hb.userData.enemy = this;
      if (sys.dev.hitboxDebug) { hb.visible = true; hb.material = sys.factory.hitboxDebugMat; }
    }
    this.game.scene.add(this.group);
    this.group.updateMatrixWorld(true);
    this.bloodPool = null;

    // soft contact-shadow blob so the soldier never floats on the road
    const f = sys.factory;
    this.blob = new THREE.Mesh(f.blobGeo, new THREE.MeshBasicMaterial({
      map: f.blobTex, transparent: true, opacity: 0.55, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -2,
    }));
    this.blob.rotation.x = -Math.PI / 2;
    this.blob.position.set(this.position.x, 0.011, this.position.z);
    this.blob.scale.setScalar(0.55);
    this.blob.renderOrder = 2;
    this.game.scene.add(this.blob);
  }

  eyePos(out = new THREE.Vector3()) {
    return out.set(this.position.x, this.position.y + 1.58, this.position.z);
  }

  /** Squad radio / heard shots: know roughly where the player is. */
  alert(pos) {
    if (!this.alive) return;
    if (!this.lastKnown) this.lastKnown = new THREE.Vector3();
    this.lastKnown.copy(pos);
    this.heardT = 4;
    if (this.awareT > 2.5) this.awareT = 2.5;
    if (this.state === 'patrol') { this.state = 'hunt'; this.stateT = 0; this.path = null; this.scanCount = 0; }
  }

  /** Near-miss explosion: scatter. */
  suppress(fromPos) {
    if (!this.alive) return;
    this.suppressT = randRange(2.2, 3.6);
    this.state = 'suppressed';
    this.stateT = 0;
    this.burstLeft = 0;
    _v.set(this.position.x - fromPos.x, 0, this.position.z - fromPos.z);
    if (_v.lengthSq() < 0.01) _v.set(randSpread(1), 0, randSpread(1));
    _v.normalize();
    const goal = this.game.world.navgrid.nearestWalkable(
      this.position.x + _v.x * randRange(8, 13) + randSpread(3),
      this.position.z + _v.z * randRange(8, 13) + randSpread(3));
    this.path = this.game.world.navgrid.findPath(this.position, goal);
    this.pathIdx = 0;
  }

  damage(amount, headshot, point, dir) {
    if (!this.alive) return;
    const cause = this._explCause ?? 'gun';
    this._explCause = null;
    this.health -= amount;
    if (dir) this._lastHitDir = (this._lastHitDir || new THREE.Vector3()).copy(dir);
    if (point) this.game.vfx.blood(point.clone(), dir ? _v.copy(dir).clone() : UP.clone());

    // flinch jolt + brief hit-stop on the animation
    this.flinchVel += randRange(3.2, 5.2) * (headshot ? 1.5 : 1);
    this.flinchLat = randSpread(1);
    this.hitStop = 0.09;

    this.game.events.emit('enemy:damage', { enemy: this, amount, headshot: !!headshot });

    // getting shot reveals the player
    if (this.game.player.alive) {
      if (!this.lastKnown) this.lastKnown = new THREE.Vector3();
      this.lastKnown.copy(this.game.player.position);
      if (this.awareT > 1.2) this.awareT = 1.2;
      if (this.state === 'patrol' || this.state === 'hunt') { this.state = 'combat'; this.stateT = 0; this.repathT = randRange(0.3, 0.9); }
    }

    if (this.health <= 0) this.die(headshot, cause);
  }

  die(headshot, cause = 'gun') {
    if (!this.alive) return;
    this.alive = false;
    this.state = 'dead';
    this.deathT = 0;
    this.corpseLife = randRange(8, 10);
    this.headshotDeath = !!headshot;

    // fall along the shot direction (or away from blast), else backwards
    let d = this._lastHitDir ? _v.copy(this._lastHitDir).setY(0) : _v.set(0, 0, 0);
    if (d.lengthSq() < 1e-4) d.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    this.fallDir = d.normalize().clone();
    this.fallAxis = new THREE.Vector3().crossVectors(UP, this.fallDir).normalize();
    this.baseQuat = this.group.quaternion.clone();
    this.fallDur = (headshot ? 0.45 : 0.58) * randRange(0.92, 1.12);
    this.fallSpin = randSpread(0.35) + (headshot ? randSpread(0.7) : 0);
    this.stagger = headshot ? randRange(0.25, 0.45) : randRange(0.05, 0.16);
    this.dustDone = false;
    this._fading = false;

    if (headshot) {
      // extra spray from the head
      this.game.vfx.blood(_v2.set(this.position.x, this.position.y + 1.6, this.position.z).clone(), this.fallDir.clone().multiplyScalar(0.5).add(UP));
    }

    this.game.events.emit('enemy:death', {
      enemy: this,
      position: this.position.clone(),
      headshot: !!headshot,
      cause,
    });
  }

  // ---------------------------------------------------------------------------

  update(dt) {
    if (!this.alive) return this._updateDeath(dt);
    if (this.heardT > 0) this.heardT -= dt;

    perceive(this, dt);
    think(this, dt);
    this._locomote(dt);
    this._animate(dt);
    return null;
  }

  _stateSpeed() {
    switch (this.state) {
      case 'patrol': return this.walkSpeed;
      case 'hunt': return this.runSpeed * 0.92;
      case 'combat': return this.playerDist > 26 ? this.runSpeed : 2.4;
      case 'cover': return this.runSpeed * 1.02;
      case 'flank': return this.runSpeed;
      case 'suppressed': return this.runSpeed * 1.1;
      default: return this.walkSpeed;
    }
  }

  _locomote(dt) {
    const { player, world } = this.game;
    if (this.holdT > 0) { this.holdT -= dt; this.path = null; }

    // --- follow path ---------------------------------------------------------
    let moveX = 0, moveZ = 0, moving = false;
    if (this.path && this.pathIdx < this.path.length) {
      const wp = this.path[this.pathIdx];
      const dx = wp.x - this.position.x, dz = wp.z - this.position.z;
      const dl = Math.hypot(dx, dz);
      if (dl < 0.45) {
        this.pathIdx++;
        if (this.pathIdx >= this.path.length) this.path = null;
      } else {
        moveX = dx / dl;
        moveZ = dz / dl;
        moving = true;
      }
    }

    // separation from squadmates
    let sepX = 0, sepZ = 0;
    for (const o of this.sys.enemies) {
      if (o === this || !o.alive) continue;
      const dx = this.position.x - o.position.x, dz = this.position.z - o.position.z;
      const d2 = dx * dx + dz * dz;
      if (d2 < 1.44 && d2 > 1e-6) {
        const d = Math.sqrt(d2);
        const push = (1.2 - d) / 1.2;
        sepX += (dx / d) * push;
        sepZ += (dz / d) * push;
      }
    }

    const targetSpeed = moving ? this._stateSpeed() : 0;
    this.speed = THREE.MathUtils.damp(this.speed, targetSpeed, 7, dt);
    if (this.speed > 0.02 || sepX !== 0 || sepZ !== 0) {
      const before = _v.copy(this.position);
      this.position.x += (moveX * this.speed + sepX * 1.6) * dt;
      this.position.z += (moveZ * this.speed + sepZ * 1.6) * dt;
      // keep to walkable cells & world bounds
      const H = (world.bounds?.half ?? 88) - 1.5;
      this.position.x = THREE.MathUtils.clamp(this.position.x, -H, H);
      this.position.z = THREE.MathUtils.clamp(this.position.z, -H, H);
      if (!world.navgrid.isWalkable(this.position.x, this.position.z)) {
        this.position.copy(before);
        this.stuckT += dt * 2;
      }
      // stuck watchdog — barely moving while wanting to move
      if (moving && this.position.distanceToSquared(before) < (0.2 * this.speed * dt) ** 2) this.stuckT += dt;
      else this.stuckT = Math.max(0, this.stuckT - dt * 2);
      if (this.stuckT > 1.2) {
        this.stuckT = 0;
        this.path = null;
        this.repathT = 0;
        const esc = world.navgrid.nearestWalkable(this.position.x + randSpread(4), this.position.z + randSpread(4));
        this.path = world.navgrid.findPath(this.position, esc);
        this.pathIdx = 0;
      }
    }

    // --- facing ------------------------------------------------------------------
    const engaging = (this.state === 'combat' || this.state === 'cover' || this.state === 'flank') &&
      (this.canSee || this.awareT < 1.5);
    let face = null;
    let twistTarget = 0;
    const playerYaw = Math.atan2(player.position.x - this.position.x, player.position.z - this.position.z);
    if (engaging && moving) {
      // legs follow the move direction, chest twists toward the player
      face = Math.atan2(moveX, moveZ);
      twistTarget = THREE.MathUtils.clamp(wrapAngle(playerYaw - this.yaw), -0.85, 0.85);
    } else if (engaging) {
      face = playerYaw;
      twistTarget = THREE.MathUtils.clamp(wrapAngle(playerYaw - this.yaw), -0.85, 0.85) * 0.6;
    } else if (moving) {
      face = Math.atan2(moveX, moveZ);
    } else if (this.faceYaw != null) {
      face = this.faceYaw;
    }
    if (face != null) {
      const d = wrapAngle(face - this.yaw);
      this.yaw += d * Math.min(1, dt * 7);
    }
    this.twistTarget = twistTarget;
    this.pitchTarget = engaging
      ? THREE.MathUtils.clamp(Math.atan2(player.eyePos().y - (this.position.y + 1.35), Math.max(this.playerDist, 0.5)), -0.5, 0.5) * 0.8
      : 0;

    this.group.position.copy(this.position);
    this.group.rotation.y = this.yaw;

    // contact shadow tracks the feet, widening a touch when braced or sprinting
    const blobS = 0.55 * (1 + 0.16 * this.aimBlend + 0.1 * Math.min(1, this.speedSmooth / 4.5));
    this.blob.scale.setScalar(blobS);
    this.blob.position.set(this.position.x, 0.011, this.position.z);
  }

  _animate(dt) {
    const inst = this.inst;
    // flinch spring always integrates (cheap)
    this.flinchVel += (-90 * this.flinch - 11 * this.flinchVel) * dt;
    this.flinch += this.flinchVel * dt;
    this.hitStop -= dt;

    if (!inst.mixer) return; // fallback primitive
    if (this.sys.shouldSkipMixer(this)) return;

    this.speedSmooth = THREE.MathUtils.damp(this.speedSmooth, this.speed, 9, dt);
    const s = this.speedSmooth;
    const wRun = THREE.MathUtils.clamp((s - 2.3) / (4.2 - 2.3), 0, 1);
    const wWalk = THREE.MathUtils.clamp((s - 0.12) / (1.2 - 0.12), 0, 1) * (1 - wRun);
    const wIdle = Math.max(0, 1 - wWalk - wRun);
    const a = inst.actions;
    const k = 1 - Math.exp(-12 * dt);
    a.idle.weight += (wIdle - a.idle.weight) * k;
    a.walk.weight += (wWalk - a.walk.weight) * k;
    a.run.weight += (wRun - a.run.weight) * k;
    a.walk.timeScale = THREE.MathUtils.clamp(s / WALK_REF, 0.7, 1.6);
    a.run.timeScale = THREE.MathUtils.clamp(s / RUN_REF, 0.75, 1.35);

    inst.mixer.update(dt * (this.hitStop > 0 ? 0.15 : 1));
    this._applyBoneOverlays(dt);
    this._orientRifle(dt);
  }

  get engaged() {
    return (this.state === 'combat' || this.state === 'flank' || this.state === 'cover') &&
      (this.canSee || this.awareT < 1.5) && this.game.player.alive;
  }

  /**
   * The rifle's position rides the right hand bone, but its world orientation
   * is procedural: low-ready when calm; in combat it sits canted ACROSS the
   * chest (readable diagonal silhouette at range) and snaps onto the target
   * only while a burst is live.
   */
  _orientRifle(dt) {
    const rifle = this.inst.rifle;
    const bones = this.inst.bones;
    if (!rifle || !bones) return;

    const k = 1 - Math.exp(-8 * dt);
    this.aimBlend += ((this.engaged ? 1 : 0) - this.aimBlend) * k;

    // "hot" while a burst is live (+ short linger so it doesn't twitch)
    if (this.burstLeft > 0) this._hotT = 0.55;
    else if (this._hotT > 0) this._hotT -= dt;
    const kh = 1 - Math.exp(-10 * dt);
    this.aimHot = (this.aimHot ?? 0) + (((this._hotT ?? 0) > 0 ? 1 : 0) - (this.aimHot ?? 0)) * kh;

    // low-ready: facing direction, tilted down
    _v.set(Math.sin(this.yaw), -0.42, Math.cos(this.yaw)).normalize();
    if (this.aimBlend > 0.01) {
      const p = this.game.player;
      _v2.set(
        p.position.x - this.position.x,
        (p.position.y + 1.32) - (this.position.y + 1.35),
        p.position.z - this.position.z).normalize();
      // combat-ready: aim direction swept across the chest + muzzle dipped,
      // so the rifle doesn't foreshorten into the body from the player's view
      const aYaw = Math.atan2(_v2.x, _v2.z);
      const aPitch = Math.asin(THREE.MathUtils.clamp(_v2.y, -1, 1));
      const rYaw = aYaw + 0.62, rPitch = aPitch - 0.26;
      _v3.set(Math.sin(rYaw) * Math.cos(rPitch), Math.sin(rPitch), Math.cos(rYaw) * Math.cos(rPitch));
      _v3.lerp(_v2, this.aimHot).normalize(); // ready → on target while firing
      _v.lerp(_v3, this.aimBlend).normalize();
    }
    _m.lookAt(_v, ZERO, UP); // object convention: +Z faces dir
    _q.setFromRotationMatrix(_m);
    bones.rHand.getWorldQuaternion(_q2);
    rifle.quaternion.copy(_q2.invert()).multiply(_q);
  }

  /** Post-mixer additive bone rotations: aim twist, aim pitch, flinch. */
  _applyBoneOverlays(dt) {
    const b = this.inst.bones;
    if (!b) return;
    const k = 1 - Math.exp(-10 * dt);
    this.aimTwist += ((this.twistTarget ?? 0) - this.aimTwist) * k;
    this.aimPitch += ((this.pitchTarget ?? 0) - this.aimPitch) * k;

    const twist = this.aimTwist;
    const pitch = this.aimPitch;
    const fl = this.flinch;

    if (Math.abs(twist) > 0.002 || Math.abs(pitch) > 0.002 || Math.abs(fl) > 0.002) {
      // spine1 carries most of the twist + flinch jolt
      _q.setFromAxisAngle(UP, twist * 0.5);
      if (Math.abs(fl) > 0.002) {
        _q2.setFromAxisAngle(X_AXIS, -fl * 0.22);
        _q.multiply(_q2);
        _q2.setFromAxisAngle(Z_AXIS, fl * 0.18 * this.flinchLat);
        _q.multiply(_q2);
      }
      if (Math.abs(pitch) > 0.002) {
        _q2.setFromAxisAngle(X_AXIS, -pitch * 0.55);
        _q.multiply(_q2);
      }
      b.spine1.quaternion.multiply(_q);

      _q.setFromAxisAngle(UP, twist * 0.35);
      if (Math.abs(pitch) > 0.002) {
        _q2.setFromAxisAngle(X_AXIS, -pitch * 0.35);
        _q.multiply(_q2);
      }
      b.spine2.quaternion.multiply(_q);

      _q.setFromAxisAngle(UP, twist * 0.3);
      b.neck.quaternion.multiply(_q);
    }

    // braced combat weight: ~5° forward torso lean + slight stance widen when
    // planted, so firing reads leaned-in instead of bolt-upright
    if (this.aimBlend > 0.01) {
      _q.setFromAxisAngle(X_AXIS, this.aimBlend * 0.09);
      b.spine.quaternion.multiply(_q);
      const brace = this.aimBlend * THREE.MathUtils.clamp(1 - this.speedSmooth / 1.4, 0, 1);
      if (brace > 0.01 && b.lUpLeg && b.rUpLeg) {
        _q.setFromAxisAngle(Z_AXIS, brace * 0.085);
        b.lUpLeg.quaternion.multiply(_q);
        _q.setFromAxisAngle(Z_AXIS, -brace * 0.085);
        b.rUpLeg.quaternion.multiply(_q);
      }
    }

    // aim pose: raise arms toward the target; ease off while sprinting so the
    // run cycle's arm pump doesn't fight the overlay too hard; relax a touch
    // between bursts to match the across-chest ready rifle
    const armAmt = this.aimBlend * (1 - 0.45 * THREE.MathUtils.clamp(this.speedSmooth / 4.5, 0, 1)) *
      (0.82 + 0.18 * (this.aimHot ?? 0));
    if (armAmt > 0.01) {
      if (b.rArm) { _q3.copy(Q_IDENT).slerp(AIM_R_ARM, armAmt); b.rArm.quaternion.multiply(_q3); }
      if (b.rForeArm) { _q3.copy(Q_IDENT).slerp(AIM_R_FOREARM, armAmt); b.rForeArm.quaternion.multiply(_q3); }
      if (b.lArm) { _q3.copy(Q_IDENT).slerp(AIM_L_ARM, armAmt); b.lArm.quaternion.multiply(_q3); }
      if (b.lForeArm) { _q3.copy(Q_IDENT).slerp(AIM_L_FOREARM, armAmt); b.lForeArm.quaternion.multiply(_q3); }
    }

    // dev: interactive arm pose tuning (?armtest=rx,ry,rz etc, degrees)
    const dev = this.sys.dev;
    if (dev.armTest) this._testEuler(b.rArm, dev.armTest);
    if (dev.foreArmTest) this._testEuler(b.rForeArm, dev.foreArmTest);
    if (dev.lArmTest) this._testEuler(b.lArm, dev.lArmTest);
    if (dev.lForeArmTest) this._testEuler(b.lForeArm, dev.lForeArmTest);
  }

  _testEuler(boneObj, deg) {
    if (!boneObj) return;
    _q.setFromEuler(new THREE.Euler(
      THREE.MathUtils.degToRad(deg[0] || 0),
      THREE.MathUtils.degToRad(deg[1] || 0),
      THREE.MathUtils.degToRad(deg[2] || 0)));
    boneObj.quaternion.multiply(_q);
  }

  /** Fire one round at the player — hit decided by probability, then staged. */
  fireShot() {
    const { player, world, vfx, events } = this.game;
    const muzzleObj = this.inst.muzzle;
    muzzleObj.updateWorldMatrix(true, false);
    const from = muzzleObj.getWorldPosition(new THREE.Vector3());

    const pEye = player.eyePos();
    const dist = from.distanceTo(pEye);
    // dev-locked enemies fire blanks so screenshot runs don't kill the player
    const willHit = !this.devLock && rand() < hitChance(this, dist);

    let target;
    if (willHit) {
      target = pEye.clone();
      target.y -= randRange(0.1, 0.45); // chest
      target.x += randSpread(0.1);
      target.z += randSpread(0.1);
    } else {
      // stage a believable near-miss that whizzes past
      _v.set(pEye.x - from.x, 0, pEye.z - from.z).normalize();
      _v2.set(-_v.z, 0, _v.x); // perpendicular
      const off = (rand() < 0.5 ? 1 : -1) * randRange(0.4, 1.4);
      target = pEye.clone().addScaledVector(_v2, off);
      target.y += randSpread(0.7) + 0.1;
    }
    const dir = target.sub(from).normalize();

    // light:false — the flash point light sits centimetres from the skinned
    // mesh and cooked the whole body into a gold bloom (round-2 verdict);
    // the sprite alone still reads as a bright point at the muzzle.
    vfx.muzzleFlash(from.clone(), dir.clone(), { scale: 1.15, light: false });
    events.emit('enemy:fire', { position: from.clone() });

    const worldHit = world.colliders.raycast(from, dir, 140);
    if (willHit && (!worldHit || worldHit.distance > dist - 0.6)) {
      player.damage(randRange(8, 14), this.position.clone());
      vfx.tracer(from.clone(), pEye.clone().add(_v3.set(randSpread(0.15), randSpread(0.15), randSpread(0.15))), { speed: 300 });
    } else {
      const end = worldHit ? worldHit.point : from.clone().addScaledVector(dir, 140);
      vfx.tracer(from.clone(), end, { speed: 300 });
      if (worldHit) vfx.impact(worldHit.point, worldHit.normal, worldHit.surface);
    }
  }

  // ---------------------------------------------------------------------------

  _updateDeath(dt) {
    this.deathT += dt;
    const t = this.deathT;

    // procedural fall: accelerating tip-over around the feet with a settle bounce
    const u = Math.min(1, t / this.fallDur);
    let ang;
    if (u < 1) {
      ang = FALL_ANGLE * Math.pow(u, 1.6);
      this.position.addScaledVector(this.fallDir, (this.stagger / this.fallDur) * dt);
    } else {
      const tt = t - this.fallDur;
      ang = FALL_ANGLE * (1 + 0.05 * Math.exp(-6 * tt) * Math.sin(15 * tt));
    }
    _q.setFromAxisAngle(this.fallAxis, ang);
    _q2.setFromAxisAngle(UP, this.fallSpin * u);
    this.group.quaternion.copy(this.baseQuat).premultiply(_q2).premultiply(_q);
    this.group.position.copy(this.position);
    this.group.position.y = 0.02;

    // ground-impact dust + blood pool
    if (!this.dustDone && ang > 1.32) {
      this.dustDone = true;
      this.impactT = t;
      const px = this.position.x + this.fallDir.x * 1.2;
      const pz = this.position.z + this.fallDir.z * 1.2;
      const smoke = this.game.vfx.smoke;
      if (smoke?.burst) {
        smoke.burst(7, () => ({
          pos: _v.set(px + randSpread(0.5), 0.12, pz + randSpread(0.5)).clone(),
          vel: _v2.set(randSpread(1.1), randRange(0.3, 0.9), randSpread(1.1)).clone(),
          life: randRange(0.5, 1.0),
          size0: 0.22, size1: randRange(0.6, 0.9),
          color: 0x8a7c68, alpha: 0.4, rotSpeed: randSpread(2), drag: 2.4, fadeIn: 0.04,
        }));
      }
      const f = this.sys.factory;
      const mat = new THREE.MeshBasicMaterial({
        map: f.bloodPoolTex, transparent: true, opacity: 0,
        depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4,
      });
      const pool = new THREE.Mesh(f.bloodPoolGeo, mat);
      pool.rotation.x = -Math.PI / 2;
      pool.rotation.z = rand() * Math.PI * 2;
      pool.position.set(
        this.position.x + this.fallDir.x * (this.headshotDeath ? 1.25 : 0.65),
        0.013,
        this.position.z + this.fallDir.z * (this.headshotDeath ? 1.25 : 0.65));
      pool.scale.setScalar(0.2);
      pool.renderOrder = 3;
      this.game.scene.add(pool);
      this.bloodPool = pool;
      this.bloodPoolMax = this.headshotDeath ? randRange(0.95, 1.15) : randRange(0.65, 0.85);
    }

    if (this.bloodPool) {
      const age = t - this.impactT;
      const grow = Math.sqrt(Math.min(1, age / 2.4));
      this.bloodPool.scale.setScalar(Math.max(0.2, this.bloodPoolMax * grow));
      this.bloodPool.material.opacity = 0.85 * Math.min(1, age / 1.2) * (this._fadeK ?? 1);
    }

    // contact shadow slides under the torso as the body tips over
    if (this.blob) {
      const bu = Math.min(1, t / this.fallDur);
      this.blob.position.set(
        this.position.x + this.fallDir.x * 0.55 * bu,
        0.011,
        this.position.z + this.fallDir.z * 0.55 * bu);
      this.blob.scale.setScalar(0.55 + 0.35 * bu);
      this.blob.material.opacity = 0.55 * (this._fadeK ?? 1);
    }

    // fade + sink at the end of corpse life
    const fadeStart = this.corpseLife - 1.6;
    if (t > fadeStart) {
      const fk = Math.max(0, 1 - (t - fadeStart) / 1.6);
      this._fadeK = fk;
      if (!this._fading) {
        this._fading = true;
        for (const m of this.inst.fadeMats) { m.transparent = true; m.depthWrite = false; }
      }
      for (const m of this.inst.fadeMats) m.opacity = fk;
      this.group.position.y = 0.02 - (1 - fk) * 0.45;
    }

    return t >= this.corpseLife ? 'remove' : null;
  }

  dispose() {
    this.game.scene.remove(this.group);
    if (this.blob) {
      this.game.scene.remove(this.blob);
      this.blob.material.dispose();
      this.blob = null;
    }
    if (this.bloodPool) {
      this.game.scene.remove(this.bloodPool);
      this.bloodPool.material.dispose();
      this.bloodPool = null;
    }
    if (this.inst.mixer) {
      this.inst.mixer.stopAllAction();
      this.inst.mixer.uncacheRoot(this.inst.root);
    }
    for (const m of this.inst.fadeMats) m.dispose();
  }
}
