// Arsenal: per-slot weapon instances with full state machines (draw/holster/fire/reload/pump/
// throw/dry-fire), ammunition accounting, deterministic recoil patterns, bloom-based spread and
// per-weapon ADS. (Opus 2 domain)
//
// Recoil is a two-part model so that it reads as a learnable pattern rather than as noise:
//
//   punch (kickPitch/kickYaw)  — the snappy part of each shot, decays fast (recoil.settle)
//   climb (climbPitch/climbYaw) — the accumulated walk up the authored pattern; it is held while
//                                 the trigger is down and only recovers afterwards (recoil.recover)
//
// The camera and the viewmodel read the sum through recoilPitch/recoilYaw. Both components decay
// exponentially towards zero, which means recovery approaches the pre-fire aim and never crosses
// it — the shot that follows a burst lands where the player is pointing, not past it.
import { WEAPONS } from './defs.js';
import { audio } from '../core/audio.js';
import { bus } from '../core/events.js';

const DEG = Math.PI / 180;
// Ceiling on the total view offset. The viewmodel multiplies recoilPitch by ~1.8 for the weapon's
// own pitch, so letting this grow without bound would swing the model off screen.
const MAX_RECOIL_PITCH = 0.19;

const smooth01 = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

class WeaponInstance {
  constructor(defId) {
    this.def = WEAPONS[defId];
    this.mag = this.def.magSize;
    this.reserve = this.def.carried != null ? this.def.carried - 1 : this.def.reserveMax;
    if (this.def.class === 'melee') { this.mag = Infinity; this.reserve = Infinity; }
  }
  refill() {
    this.mag = this.def.class === 'melee' ? Infinity : this.def.magSize;
    this.reserve = this.def.carried != null ? this.def.carried - 1 : this.def.reserveMax;
  }
}

export class Arsenal {
  constructor(player) {
    this.player = player;
    this.slots = {};        // slot number -> WeaponInstance
    this.active = 1;
    this.previous = 1;
    this.state = 'idle';    // idle|draw|holster|reload|pump|throw|melee
    this.stateT = 0;
    this.stateDur = 0;
    this.pendingSlot = null;
    this.fireCooldown = 0;
    this.needsPump = false;
    this.reloadWasEmpty = false;
    this.reloadCap = 0;     // magazine target frozen when the reload starts (see capacity())
    // recoil
    this.recoilPitch = 0;
    this.recoilYaw = 0;
    this.rollKick = 0;
    this.kickPitch = 0; this.kickYaw = 0;
    this.climbPitch = 0; this.climbYaw = 0;
    this.recoilIndex = 0;   // position in the weapon's pattern
    this.recoilResetT = 0;
    this.recoilHoldT = 0;
    // spread
    this.heat = 0;          // consecutive-fire bloom, in degrees
    this.bloomHoldT = 0;
    // aiming
    this.isAiming = false;
    this.adsBlend = 0;      // 0 hip .. 1 sights fully up
    this.scopeSwayX = 0;
    this.scopeSwayY = 0;
    this.steady = 0;        // 0..1 breath-hold blend
    this.steadyLeft = 0;    // seconds of breath left
    this.lastFireT = 0;
    this.time = 0;
    this._lowAmmo = false;
  }

  equipLoadout(loadout) {
    this.slots = {};
    this.slots[2] = new WeaponInstance(loadout.primary);
    this.slots[1] = new WeaponInstance(loadout.sidearm || 'karst-p9');
    this.slots[3] = new WeaponInstance('cq-blade');
    if (loadout.slot4) this.slots[4] = new WeaponInstance(loadout.slot4);
    if (loadout.slot5) this.slots[5] = new WeaponInstance(loadout.slot5);
    this.active = 2;
    this.previous = 1;
    this.state = 'draw';
    this.stateT = 0;
    this.stateDur = this.current.def.drawMs / 1000;
    this.fireCooldown = 0;
    this.needsPump = false;
    this._resetRecoil();
    this.heat = 0;
    this.bloomHoldT = 0;
    this.isAiming = false;
    this.adsBlend = 0;
    this.scopeSwayX = this.scopeSwayY = 0;
    this.steady = 0;
    this.steadyLeft = this.current.def.sway?.budget ?? 3.2;
    this._lowAmmo = false;
    bus.emit('weapon-changed', { id: this.current.def.id });
  }

  _resetRecoil() {
    this.recoilPitch = this.recoilYaw = this.rollKick = 0;
    this.kickPitch = this.kickYaw = 0;
    this.climbPitch = this.climbYaw = 0;
    this.recoilIndex = 0;
    this.recoilResetT = 0;
    this.recoilHoldT = 0;
  }

  get current() { return this.slots[this.active]; }

  /**
   * Rounds this weapon can hold right now. A closed-bolt weapon (`chamber`) reloaded while a round
   * is still chambered ends up one over the magazine size; reloading from empty does not, because
   * the bolt closed on an empty chamber.
   */
  capacity(w = this.current) {
    const def = w.def;
    if (def.magSize === Infinity) return Infinity;
    if (def.reloadPerShell) return def.magSize;
    return def.chamber && w.mag > 0 ? def.magSize + 1 : def.magSize;
  }

  /** Walk speed multiplier from aiming, blended over the weapon's own ADS time. */
  get aimMoveMul() {
    const def = this.current?.def;
    if (!def) return 1;
    return 1 + ((def.adsMoveMul ?? 0.75) - 1) * this.adsBlend;
  }

  // Place a weapon into its natural slot and switch to it (QA + world pickups).
  giveWeapon(defId, ammo = null) {
    const def = WEAPONS[defId];
    if (!def) return 'unknown weapon: ' + defId;
    const inst = new WeaponInstance(defId);
    if (ammo) {
      if (ammo.mag != null) inst.mag = Math.max(0, Math.min(ammo.mag, def.magSize + 1));
      if (ammo.reserve != null) inst.reserve = Math.max(0, Math.min(ammo.reserve, def.reserveMax));
    }
    this.slots[def.slot] = inst;
    this.active = def.slot;
    this.state = 'draw';
    this.stateT = 0;
    this.stateDur = def.drawMs / 1000;
    this._resetRecoil();
    this.heat = 0;
    this.needsPump = false;
    this.fireCooldown = 0;
    bus.emit('weapon-changed', { id: defId });
    bus.emit('ammo-changed', {});
    return defId;
  }

  trySwitch(slot) {
    if (!this.slots[slot] || slot === this.active) return;
    if (this.state === 'throw') return;
    // A reload in progress is abandoned, and its progress is lost: nothing goes into the magazine
    // and nothing comes out of the reserve until a reload actually completes.
    if (this.state === 'reload') bus.emit('weapon-state', { state: 'reload-cancelled', id: this.current.def.id });
    this.pendingSlot = slot;
    this.state = 'holster';
    this.stateT = 0;
    this.stateDur = (this.current.def.holsterMs ?? 180) / 1000;
    audio.mech('holster');
  }

  update(dt, input) {
    this.time += dt;
    const w = this.current;
    const def = w.def;
    this.fireCooldown = Math.max(0, this.fireCooldown - dt);

    this._updateRecoil(dt, def);
    this._updateBloom(dt, def);
    this._updateAim(dt, input, def);

    // switching input
    if (input.slotPressed) this.trySwitch(input.slotPressed);
    else if (input.lastWeaponPressed) this.trySwitch(this.previous);
    else if (input.wheel !== 0) {
      const order = [1, 2, 3, 4, 5].filter((s) => this.slots[s]);
      let idx = order.indexOf(this.active);
      idx = (idx + (input.wheel > 0 ? 1 : -1) + order.length) % order.length;
      this.trySwitch(order[idx]);
    }

    // Shell-by-shell interrupt-to-fire. A shotgun topping up is abandoned the instant the player
    // asks to shoot, provided there is something to shoot: the shell being pushed in is dropped
    // rather than seated, which is what makes the reload feel cancellable under pressure. Waiting
    // for the current shell to finish (the check further down) reads as unresponsive.
    if (this.state === 'reload' && def.reloadPerShell && (input.firePressed || input.firing)
        && w.mag > 0 && this.fireCooldown <= 0) {
      this.state = 'idle';
      this.stateT = 0;
      bus.emit('weapon-state', { state: 'reload-interrupted', id: def.id });
    }

    // state machine
    if (this.state !== 'idle') {
      this.stateT += dt;
      if (this.stateT >= this.stateDur) {
        if (this.state === 'holster') {
          this.previous = this.active;
          this.active = this.pendingSlot ?? this.active;
          this.pendingSlot = null;
          this.state = 'draw';
          this.stateT = 0;
          this.stateDur = this.current.def.drawMs / 1000;
          this._resetRecoil();
          this.heat = 0;
          this.adsBlend = 0;
          this.needsPump = false; // the shotgun's pending pump does not follow you to the sidearm
          this.fireCooldown = 0;  // nor does its cycle time
          this.steadyLeft = this.current.def.sway?.budget ?? 3.2;
          audio.mech('draw');
          bus.emit('weapon-changed', { id: this.current.def.id });
        } else if (this.state === 'reload') {
          const cur = this.current;
          if (cur.def.reloadPerShell) {
            // shotgun: insert one shell, continue while the player is not asking to shoot
            if (cur.reserve > 0 && cur.mag < cur.def.magSize) {
              cur.mag++; cur.reserve--;
              audio.mech('magin');
              bus.emit('ammo-changed', {});
            }
            if (cur.mag < cur.def.magSize && cur.reserve > 0 && !input.firePressed && !input.firing) {
              this.stateT = 0;
              this.stateDur = cur.def.reloadMs / 1000;
            } else {
              this.state = 'idle';
              bus.emit('weapon-state', { state: 'idle', id: cur.def.id });
            }
          } else {
            const need = Math.max(0, (this.reloadCap || this.capacity(cur)) - cur.mag);
            const take = Math.min(need, cur.reserve);
            cur.mag += take;
            cur.reserve -= take;
            this.state = 'idle';
            audio.mech(this.reloadWasEmpty ? 'rack' : 'magin');
            bus.emit('ammo-changed', {});
            bus.emit('weapon-state', { state: 'idle', id: cur.def.id });
          }
          this._checkLowAmmo();
        } else if (this.state === 'pump') {
          this.needsPump = false;
          this.state = 'idle';
        } else if (this.state === 'throw') {
          this.state = 'idle';
          this._afterThrow();
        } else {
          this.state = 'idle';
        }
      }
    }

    // reload input
    if (input.reloadPressed && this.state === 'idle' && def.magSize !== Infinity && def.class !== 'thrown') {
      this.startReload();
    }

    // fire input
    const wantFire = def.auto ? input.firing : input.firePressed;
    if (wantFire && this.state === 'idle' && this.fireCooldown <= 0) {
      this.tryFire();
    }
    // Shotgun pump after a shot (auto-pump when idle). The pumpMs guard matters: needsPump used to
    // be able to follow the player onto a weapon that has no pump, which produced a NaN state
    // duration the state machine could never finish — the gun was silently bricked for good.
    if (this.needsPump && this.state === 'idle' && this.fireCooldown <= 0.02) {
      if (def.pumpMs > 0) {
        this.state = 'pump';
        this.stateT = 0;
        this.stateDur = def.pumpMs / 1000;
        audio.mech('pump');
      } else {
        this.needsPump = false;
      }
    }
  }

  // ---------------------------------------------------------------- recoil
  _updateRecoil(dt, def) {
    const r = def.recoil;
    // the punch always settles
    const ks = 1 - Math.exp(-(r.settle ?? 14) * dt);
    this.kickPitch -= this.kickPitch * ks;
    this.kickYaw -= this.kickYaw * ks;
    if (Math.abs(this.kickPitch) < 1e-5) this.kickPitch = 0;
    if (Math.abs(this.kickYaw) < 1e-5) this.kickYaw = 0;
    // the climb is held for `hold` seconds after each shot, then walks back to the original aim
    this.recoilHoldT = Math.max(0, this.recoilHoldT - dt);
    if (this.recoilHoldT <= 0) {
      const kc = 1 - Math.exp(-(r.recover ?? 9) * dt);
      this.climbPitch -= this.climbPitch * kc;
      this.climbYaw -= this.climbYaw * kc;
      if (Math.abs(this.climbPitch) < 1e-5) this.climbPitch = 0;
      if (Math.abs(this.climbYaw) < 1e-5) this.climbYaw = 0;
    }
    this.recoilPitch = this.kickPitch + this.climbPitch;
    this.recoilYaw = this.kickYaw + this.climbYaw;
    this.rollKick *= Math.max(0, 1 - dt * 11);
    // pattern position rewinds once the trigger has been idle long enough
    this.recoilResetT = Math.max(0, this.recoilResetT - dt);
    if (this.recoilResetT <= 0) this.recoilIndex = 0;
  }

  _kick(def) {
    const r = def.recoil;
    const pat = r.pattern ?? [[1, 0]];
    // the last authored entry repeats for the rest of the magazine
    const step = pat[Math.min(this.recoilIndex, pat.length - 1)];
    const rng = this.player.mission?.rng;
    const jitter = r.jitter ? ((rng ? rng.next() : 0.5) - 0.5) * 2 * r.jitter : 0;
    const pitchDeg = r.pitch * step[0];
    // Patterns are authored in screen space: a positive yaw step kicks to the player's RIGHT.
    // The camera's yaw decreases when you turn right (see Player.update look handling), hence the
    // negation on the way into the yaw offset.
    const yawScreenDeg = r.yaw * (step[1] + jitter);
    const yawDeg = -yawScreenDeg;
    const snap = r.snap ?? 0.5;
    const climbMax = (r.climbMax ?? 6) * DEG;

    this.climbPitch = Math.min(climbMax, this.climbPitch + pitchDeg * (1 - snap) * DEG);
    this.climbYaw = clamp(this.climbYaw + yawDeg * (1 - snap) * DEG, -climbMax, climbMax);
    this.kickPitch = Math.min(
      Math.max(0, MAX_RECOIL_PITCH - this.climbPitch),
      this.kickPitch + pitchDeg * snap * DEG,
    );
    this.kickYaw += yawDeg * snap * DEG;
    this.recoilPitch = this.kickPitch + this.climbPitch;
    this.recoilYaw = this.kickYaw + this.climbYaw;
    this.rollKick = -yawDeg * (r.roll ?? 0.5) * DEG;

    this.recoilIndex++;
    this.recoilResetT = (r.resetMs ?? 300) / 1000;
    this.recoilHoldT = r.hold ?? 0.1;
  }

  // ---------------------------------------------------------------- spread
  _updateBloom(dt, def) {
    this.bloomHoldT = Math.max(0, this.bloomHoldT - dt);
    if (this.bloomHoldT <= 0 && this.heat > 0) {
      this.heat = Math.max(0, this.heat - dt * (def.spread?.decay ?? 3));
    }
  }

  /**
   * Effective spread in degrees (cone diameter) for the current stance. The crosshair draws this
   * and the mission halves it for the ray cone, so the number the player sees is the number that
   * governs the shot.
   */
  spreadDeg(moveSpeed, crouched) {
    const def = this.current.def;
    const s = def.spread;
    if (!s || (s.base === 0 && s.max === 0)) return 0; // melee, devices
    const aim = smooth01(Math.min(1, this.adsBlend / 0.78));
    let deg = s.base + (s.aim - s.base) * aim;
    const ref = this.player.speedBase || 3.7;
    const m = clamp((moveSpeed - 0.35) / (ref - 0.35), 0, 1);
    deg += (s.move ?? 0) * Math.pow(m, 1.4) * (1 - 0.45 * aim);
    if (crouched) deg *= s.crouchMul ?? 0.7;
    // airborne is punished hard and aiming barely helps: you are not shooting straight mid-jump
    if (this.player.onGround === false) deg += (s.air ?? 5) * (1 - 0.15 * aim);
    deg += this.heat;
    return clamp(deg, 0.02, s.base + (s.max ?? 4) + (s.air ?? 6) + (s.move ?? 3));
  }

  // ---------------------------------------------------------------- aiming
  _updateAim(dt, input, def) {
    const aimable = def.class !== 'melee' && def.class !== 'thrown';
    this.isAiming = !!input.aiming && this.state === 'idle' && aimable;
    const want = this.isAiming ? 1 : 0;
    // sights come up over adsMs and drop noticeably faster
    const rate = 1 / Math.max(0.02, (def.adsMs ?? 200) / 1000);
    this.adsBlend = clamp(this.adsBlend + (want ? rate : -rate * 1.35) * dt, 0, 1);

    const sway = def.sway;
    if (!sway || this.adsBlend <= 0.001) {
      this.scopeSwayX = this.scopeSwayY = 0;
      this.steady = Math.max(0, this.steady - dt * 4);
      this.steadyLeft = Math.min(sway?.budget ?? 3.2, this.steadyLeft + dt * (sway?.refill ?? 1.1));
      return;
    }
    // breath hold: Shift steadies the scope until the budget runs out
    const holding = !!input.walk && this.isAiming && this.steadyLeft > 0;
    if (holding) this.steadyLeft = Math.max(0, this.steadyLeft - dt);
    else this.steadyLeft = Math.min(sway.budget, this.steadyLeft + dt * sway.refill);
    this.steady = clamp(this.steady + (holding ? dt * 5 : -dt * 3), 0, 1);

    const amp = (sway.amp + (sway.steadyAmp - sway.amp) * this.steady) * DEG * this.adsBlend;
    const t = this.time;
    // deterministic Lissajous: no rng, so a held breath traces the same figure every time
    this.scopeSwayX = Math.sin(t * sway.rateX) * amp;
    this.scopeSwayY = Math.sin(t * sway.rateY + 1.1) * amp * 0.62;
  }

  // ---------------------------------------------------------------- ammo
  startReload() {
    const w = this.current;
    const cap = this.capacity(w);
    if (w.mag >= cap || w.reserve <= 0) return;
    this.reloadWasEmpty = w.mag === 0;
    this.reloadCap = cap;
    this.state = 'reload';
    this.stateT = 0;
    this.stateDur = (this.reloadWasEmpty ? w.def.reloadEmptyMs : w.def.reloadMs) / 1000;
    audio.mech('magout');
    bus.emit('weapon-state', { state: 'reload', id: w.def.id, empty: this.reloadWasEmpty });
  }

  tryFire() {
    const w = this.current;
    const def = w.def;
    if (def.class === 'melee') {
      this.fireCooldown = 60 / def.rpm;
      this.state = 'melee';
      this.stateT = 0;
      this.stateDur = 0.28;
      audio.mech('knife');
      bus.emit('player-melee', {});
      this._kick(def);
      return;
    }
    if (def.class === 'thrown') {
      if (w.mag <= 0) { audio.mech('dryfire'); return; }
      this.state = 'throw';
      this.stateT = 0;
      this.stateDur = def.throwMs / 1000;
      audio.mech('pin');
      bus.emit('player-throw', { def });
      return;
    }
    if (w.mag <= 0) {
      audio.mech('dryfire');
      this.fireCooldown = 0.35;
      bus.emit('weapon-dryfire', { id: def.id });
      return;
    }
    w.mag--;
    this.fireCooldown = 60 / def.rpm;
    this.lastFireT = this.time;
    if (def.class === 'shotgun') this.needsPump = true;
    audio.gunshot(def.sound);
    // The mission resolves the ray inside this emit, so the round leaves against the aim as it
    // stood BEFORE this shot: the first of a burst is on the crosshair and every later one carries
    // exactly the pattern the ones before it laid down.
    bus.emit('player-fired', { def, heat: this.heat, recoilIndex: this.recoilIndex });
    this.heat = Math.min(def.spread.max, this.heat + def.spread.perShot);
    this.bloomHoldT = def.spread.hold ?? 0.08;
    this._kick(def);
    bus.emit('ammo-changed', {});
    this._checkLowAmmo();
  }

  _checkLowAmmo() {
    const w = this.current;
    if (w.mag === Infinity) return;
    const low = w.mag > 0 && w.mag <= Math.ceil(w.def.magSize * 0.25);
    if (low && !this._lowAmmo) bus.emit('low-ammo', { id: w.def.id, mag: w.mag, reserve: w.reserve });
    this._lowAmmo = low;
  }

  _afterThrow() {
    const w = this.current;
    w.mag--;
    if (w.mag <= 0 && w.reserve > 0) { w.reserve--; w.mag = 1; }
    else if (w.mag <= 0) {
      // out of devices: switch back to previous weapon
      this.trySwitch(this.slots[2] ? 2 : 1);
    }
    bus.emit('ammo-changed', {});
  }

  textState() {
    const w = this.current;
    return {
      id: w.def.id, name: w.def.name, slot: this.active, state: this.state,
      magazine: w.mag === Infinity ? 'inf' : w.mag,
      reserve: w.reserve === Infinity ? 'inf' : w.reserve,
      aiming: this.isAiming,
      adsBlend: +this.adsBlend.toFixed(2),
      spreadDeg: +this.spreadDeg(Math.hypot(this.player.vel.x, this.player.vel.z), this.player.crouched).toFixed(2),
      recoilStep: this.recoilIndex,
    };
  }
}
