// Arsenal: per-slot weapon instances with full state machines (draw/holster/fire/reload/pump/
// throw/dry-fire), ammunition accounting, recoil state. (Opus 2 domain)
import { WEAPONS } from './defs.js';
import { audio } from '../core/audio.js';
import { bus } from '../core/events.js';

class WeaponInstance {
  constructor(defId) {
    this.def = WEAPONS[defId];
    this.mag = Math.min(this.def.magSize, this.def.magSize);
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
    this.recoilPitch = 0;
    this.recoilYaw = 0;
    this.rollKick = 0;
    this.heat = 0;          // consecutive-fire spread bloom
    this.isAiming = false;
    this.lastFireT = 0;
    this.time = 0;
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
    this.recoilPitch = this.recoilYaw = this.rollKick = 0;
    this.heat = 0;
    bus.emit('weapon-changed', { id: this.current.def.id });
  }

  get current() { return this.slots[this.active]; }

  // QA/dev helper: place a weapon into its natural slot and switch to it.
  giveWeapon(defId) {
    const def = WEAPONS[defId];
    if (!def) return 'unknown weapon: ' + defId;
    this.slots[def.slot] = new WeaponInstance(defId);
    this.active = def.slot;
    this.state = 'draw';
    this.stateT = 0;
    this.stateDur = def.drawMs / 1000;
    bus.emit('weapon-changed', { id: defId });
    return defId;
  }

  trySwitch(slot) {
    if (!this.slots[slot] || slot === this.active) return;
    if (this.state === 'throw') return;
    this.pendingSlot = slot;
    this.state = 'holster';
    this.stateT = 0;
    this.stateDur = 0.18;
    audio.mech('holster');
  }

  update(dt, input) {
    this.time += dt;
    const w = this.current;
    const def = w.def;
    this.fireCooldown = Math.max(0, this.fireCooldown - dt);
    // recoil recovery
    const rec = def.recoil.recover;
    this.recoilPitch = Math.max(0, this.recoilPitch - dt * rec * (0.02 + this.recoilPitch * 2.2));
    this.recoilYaw *= Math.max(0, 1 - dt * rec * 1.6);
    this.rollKick *= Math.max(0, 1 - dt * 10);
    this.heat = Math.max(0, this.heat - dt * 2.2);
    this.isAiming = input.aiming && this.state === 'idle' && def.class !== 'melee' && def.class !== 'thrown';

    // switching input
    if (input.slotPressed) this.trySwitch(input.slotPressed);
    else if (input.lastWeaponPressed) this.trySwitch(this.previous);
    else if (input.wheel !== 0) {
      const order = [1, 2, 3, 4, 5].filter((s) => this.slots[s]);
      let idx = order.indexOf(this.active);
      idx = (idx + (input.wheel > 0 ? 1 : -1) + order.length) % order.length;
      this.trySwitch(order[idx]);
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
          audio.mech('draw');
          bus.emit('weapon-changed', { id: this.current.def.id });
        } else if (this.state === 'reload') {
          const cur = this.current;
          if (cur.def.reloadPerShell) {
            // shotgun: insert one shell, continue if player still holds reload need
            if (cur.reserve > 0 && cur.mag < cur.def.magSize) {
              cur.mag++; cur.reserve--;
              audio.mech('magin');
              bus.emit('ammo-changed', {});
            }
            if (cur.mag < cur.def.magSize && cur.reserve > 0 && !input.firePressed) {
              this.stateT = 0;
              this.stateDur = cur.def.reloadMs / 1000;
            } else {
              this.state = 'idle';
            }
          } else {
            const need = cur.def.magSize - cur.mag + (this.reloadWasEmpty ? 0 : 0);
            const take = Math.min(need, cur.reserve);
            cur.mag += take;
            cur.reserve -= take;
            this.state = 'idle';
            audio.mech(this.reloadWasEmpty ? 'rack' : 'magin');
            bus.emit('ammo-changed', {});
          }
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
    // shotgun pump after shot (auto-pump when idle)
    if (this.needsPump && this.state === 'idle' && this.fireCooldown <= 0.02) {
      this.state = 'pump';
      this.stateT = 0;
      this.stateDur = def.pumpMs / 1000;
      audio.mech('pump');
    }
  }

  startReload() {
    const w = this.current;
    if (w.mag >= w.def.magSize || w.reserve <= 0) return;
    this.reloadWasEmpty = w.mag === 0;
    this.state = 'reload';
    this.stateT = 0;
    this.stateDur = (this.reloadWasEmpty ? w.def.reloadEmptyMs : w.def.reloadMs) / 1000;
    audio.mech('magout');
    bus.emit('weapon-state', { state: 'reload' });
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
      this.fireCooldown = 0.28;
      bus.emit('weapon-dryfire', {});
      return;
    }
    w.mag--;
    this.fireCooldown = 60 / def.rpm;
    this.lastFireT = this.time;
    this.heat = Math.min(def.spread.max, this.heat + def.spread.perShot);
    this._kick(def);
    if (def.class === 'shotgun') this.needsPump = true;
    audio.gunshot(def.sound);
    bus.emit('player-fired', { def, heat: this.heat });
    bus.emit('ammo-changed', {});
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

  _kick(def) {
    const r = def.recoil;
    const rng = this.player.mission?.rng;
    const rnd = rng ? rng.next() : 0.5;
    const rnd2 = rng ? rng.next() : 0.5;
    this.recoilPitch = Math.min(0.2, this.recoilPitch + (r.pitch * Math.PI) / 180);
    this.recoilYaw += ((rnd - 0.5) * 2 * r.yaw * Math.PI) / 180;
    this.rollKick = ((rnd2 - 0.5) * 0.6 * Math.PI) / 180;
  }

  // Effective spread in degrees for the current stance
  spreadDeg(moveSpeed, crouched) {
    const def = this.current.def;
    const s = def.spread;
    let deg = s.base + this.heat;
    if (moveSpeed > 1.2) deg += s.move * Math.min(1, moveSpeed / 3.7);
    if (crouched) deg = Math.max(0.05, deg - (s.base - s.crouch));
    if (this.isAiming) deg *= def.scope ? 0.02 : 0.55;
    return Math.min(def.spread.max + s.base, deg);
  }

  textState() {
    const w = this.current;
    return {
      id: w.def.id, name: w.def.name, slot: this.active, state: this.state,
      magazine: w.mag === Infinity ? 'inf' : w.mag,
      reserve: w.reserve === Infinity ? 'inf' : w.reserve,
      aiming: this.isAiming,
    };
  }
}
