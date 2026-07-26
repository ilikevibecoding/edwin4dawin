// Weapon handling: data-driven definitions, firing (hitscan + pellets),
// recoil/spread, reloads, throwables (flash/smoke), melee. Original fictional
// manufacturers: Aster Dynamics (AD), Borealis Defense (BDR), Vesper, Havelock,
// Meridian. No real-world branding.
import { bus } from '../core/events.js';

export const WEAPON_DEFS = {
  knife: {
    id: 'knife', slot: 3, name: 'K2 Field Knife', kind: 'melee', damage: 55,
    fireInterval: 0.55, range: 1.9, drawTime: 0.3, auto: false, icon: 'knife',
  },
  ad9: {
    id: 'ad9', slot: 2, name: 'AD-9 Sidearm', kind: 'gun', family: 'pistol',
    damage: 26, headMult: 3.2, rpm: 400, auto: false, mag: 12, reserve: 48,
    reloadTime: 1.55, drawTime: 0.42, spreadBase: 0.35, spreadMove: 1.5, spreadShot: 0.5,
    recoilUp: 0.75, recoilSide: 0.28, penetration: 1, falloffStart: 18, falloffEnd: 45, falloffMin: 0.62,
    adsZoom: 1.12, icon: 'pistol', tracerEvery: 1,
  },
  vesper: {
    id: 'vesper', slot: 1, name: 'Vesper K10', kind: 'gun', family: 'smg',
    damage: 21, headMult: 2.9, rpm: 780, auto: true, mag: 25, reserve: 100,
    reloadTime: 2.15, drawTime: 0.5, spreadBase: 0.5, spreadMove: 1.15, spreadShot: 0.28,
    recoilUp: 0.5, recoilSide: 0.32, penetration: 1, falloffStart: 14, falloffEnd: 38, falloffMin: 0.55,
    adsZoom: 1.18, icon: 'smg', tracerEvery: 2,
  },
  bdr15: {
    id: 'bdr15', slot: 1, name: 'BDR-15 Carbine', kind: 'gun', family: 'rifle',
    damage: 31, headMult: 3.6, rpm: 660, auto: true, mag: 30, reserve: 90,
    reloadTime: 2.4, drawTime: 0.55, spreadBase: 0.28, spreadMove: 1.9, spreadShot: 0.34,
    recoilUp: 0.82, recoilSide: 0.4, penetration: 2, falloffStart: 26, falloffEnd: 60, falloffMin: 0.7,
    adsZoom: 1.3, icon: 'carbine', tracerEvery: 2,
  },
  havelock: {
    id: 'havelock', slot: 1, name: 'Havelock S8', kind: 'gun', family: 'shotgun',
    damage: 9, pellets: 8, headMult: 1.6, rpm: 66, auto: false, mag: 6, reserve: 24,
    reloadTime: 0.62, reloadPerShell: true, drawTime: 0.6, spreadBase: 2.6, spreadMove: 1.15, spreadShot: 0.2,
    recoilUp: 2.6, recoilSide: 0.7, penetration: 0, falloffStart: 7, falloffEnd: 20, falloffMin: 0.3,
    adsZoom: 1.08, icon: 'shotgun', pump: true, pumpTime: 0.62, tracerEvery: 0,
  },
  meridian: {
    id: 'meridian', slot: 1, name: 'Meridian LR-7', kind: 'gun', family: 'sniper',
    damage: 92, headMult: 3.0, rpm: 42, auto: false, mag: 5, reserve: 20,
    reloadTime: 3.0, drawTime: 0.85, spreadBase: 3.5, spreadAds: 0.03, spreadMove: 2.2, spreadShot: 1.2,
    recoilUp: 3.4, recoilSide: 0.5, penetration: 3, falloffStart: 60, falloffEnd: 120, falloffMin: 0.85,
    adsZoom: 3.6, scoped: true, bolt: true, boltTime: 1.1, icon: 'sniper', tracerEvery: 1,
  },
  flash: {
    id: 'flash', slot: 4, name: 'MK2 Dazzler', kind: 'throwable', effect: 'flash',
    count: 2, fuse: 1.5, throwSpeed: 13, drawTime: 0.35, fireInterval: 0.8, icon: 'flash',
  },
  smoke: {
    id: 'smoke', slot: 5, name: 'Cirrus Screen', kind: 'throwable', effect: 'smoke',
    count: 1, fuse: 1.2, throwSpeed: 11, drawTime: 0.35, fireInterval: 0.8, icon: 'smoke',
  },
};

export const PRIMARY_CHOICES = ['vesper', 'bdr15', 'havelock', 'meridian'];

export class WeaponSystem {
  constructor(game) {
    this.game = game;
    this.reset(['bdr15']);
  }

  reset(loadout = ['bdr15']) {
    // slots: 1 primary, 2 sidearm, 3 knife, 4 flash, 5 smoke
    this.slots = {};
    const primary = loadout[0] || 'bdr15';
    this._addWeapon(primary);
    this._addWeapon('ad9');
    this._addWeapon('knife');
    this._addWeapon('flash');
    this._addWeapon('smoke');
    this.currentId = primary;
    this.state = 'draw';
    this.stateT = WEAPON_DEFS[primary].drawTime;
    this.cooldown = 0;
    this.ads = 0;         // 0..1 aim-down-sights blend
    this.spreadHeat = 0;  // accumulated spread from firing
    this.recoilIndex = 0;
    this.throwables = [];
    this.pendingShellReload = false;
    this.lastFireTick = -999;
  }

  _addWeapon(id) {
    const d = WEAPON_DEFS[id];
    if (!d) return;
    this.slots[d.slot] = {
      id, def: d,
      mag: d.kind === 'gun' ? d.mag : 0,
      reserve: d.kind === 'gun' ? d.reserve : 0,
      count: d.kind === 'throwable' ? d.count : 0,
      chambered: true,
    };
  }

  current() {
    for (const s of Object.values(this.slots)) if (s.id === this.currentId) return s;
    return this.slots[3];
  }

  currentDef() { return this.current().def; }
  adsFactor() { return this.ads; }

  effectiveSpreadDeg(player) {
    const w = this.current();
    const d = w.def;
    if (d.kind !== 'gun') return 0;
    const hSpeed = Math.hypot(player.vel.x, player.vel.z);
    const moveFactor = Math.min(1, hSpeed / 4.7);
    let spread = d.spreadBase + d.spreadMove * moveFactor + this.spreadHeat;
    if (player.crouched) spread *= 0.72;
    if (!player.onGround) spread *= 2.4;
    if (d.scoped) {
      spread = this.ads > 0.8 ? (d.spreadAds + d.spreadMove * moveFactor * 2 + this.spreadHeat * 0.4) : spread + 4;
    } else {
      spread *= (1 - 0.45 * this.ads);
    }
    return spread;
  }

  selectSlot(slot) {
    const w = this.slots[slot];
    if (!w || w.id === this.currentId) return;
    if (w.def.kind === 'throwable' && w.count <= 0) return;
    const from = this.current();
    this.currentId = w.id;
    this.state = 'draw';
    this.stateT = w.def.drawTime;
    this.ads = 0;
    this.pendingShellReload = false;
    bus.emit('weapon-switch', { from: from?.id, to: w.id });
  }

  cycle(dir) {
    const order = [1, 2, 3, 4, 5].filter((s) => this.slots[s] && (this.slots[s].def.kind !== 'throwable' || this.slots[s].count > 0));
    const cur = order.indexOf(this.currentDef().slot);
    const next = order[(cur + (dir > 0 ? 1 : order.length - 1)) % order.length];
    this.selectSlot(next);
  }

  update(dt, input, player, world) {
    const w = this.current();
    const d = w.def;
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.spreadHeat = Math.max(0, this.spreadHeat - dt * 3.2);

    // ADS blend
    const wantAds = input.isDown('aim') && d.kind === 'gun' && this.state !== 'reload';
    this.ads += ((wantAds ? 1 : 0) - this.ads) * Math.min(1, dt * 10);
    if (this.ads < 0.01) this.ads = 0;

    // state machine
    if (this.stateT > 0) {
      this.stateT -= dt;
      if (this.stateT <= 0) {
        if (this.state === 'reload') this._finishReload(w);
        else if (this.state === 'bolt' || this.state === 'pump') { this.state = 'idle'; }
        else if (this.state === 'draw') this.state = 'idle';
        else this.state = 'idle';
      }
    }

    // slot selection
    for (let s = 1; s <= 5; s++) if (input.wasPressed('slot' + s)) this.selectSlot(s);

    // reload input
    if (input.wasPressed('reload') && d.kind === 'gun' && this.state === 'idle') this.startReload();

    // shotgun shell-by-shell reload continues until full or interrupted by fire
    if (this.pendingShellReload && this.state === 'idle') {
      if (w.mag < d.mag && w.reserve > 0 && !input.isDown('fire')) this.startReload();
      else this.pendingShellReload = false;
    }

    // fire
    const wantFire = d.auto ? input.isDown('fire') : input.wasPressed('fire');
    if (wantFire && this.state === 'idle' && this.cooldown <= 0) {
      this._tryFire(w, player, world);
    }

    // update throwable projectiles
    this._updateThrowables(dt, world);
  }

  _tryFire(w, player, world) {
    const d = w.def;
    if (d.kind === 'gun') {
      if (w.mag <= 0) {
        this.cooldown = 0.3;
        bus.emit('weapon-dryfire', { id: w.id });
        if (w.reserve > 0) this.startReload();
        return;
      }
      w.mag--;
      this.cooldown = 60 / d.rpm;
      this.lastFireTick = this.game.loop.tick;
      this._fireHitscan(w, player, world);
      this.spreadHeat += d.spreadShot;
      const rng = this.game.rng;
      const side = d.recoilSide * (rng.next() - 0.5) * 2;
      const patternKick = d.recoilUp * (1 + Math.min(1.2, this.recoilIndex * 0.06));
      player.applyRecoil(patternKick * 0.011, side * 0.008);
      this.recoilIndex = Math.min(20, this.recoilIndex + 1);
      setTimeoutTick(this.game, 12, () => { this.recoilIndex = Math.max(0, this.recoilIndex - 2); });
      if (d.bolt && w.mag > 0) { this.state = 'bolt'; this.stateT = d.boltTime; }
      else if (d.pump && w.mag > 0) { this.state = 'pump'; this.stateT = d.pumpTime; }
      if (w.mag === 0 && w.reserve > 0) this.startReload();
    } else if (d.kind === 'melee') {
      this.cooldown = d.fireInterval;
      bus.emit('weapon-melee', { id: w.id });
      const eye = player.eyePos();
      const dir = player.lookDir();
      const hit = this.game.hitscan(eye, dir, d.range, { penetration: 0 });
      if (hit) {
        if (hit.entity) this.game.damageEntity(hit.entity, d.damage, { dir, point: hit.point, weapon: w.id, melee: true });
        else this.game.fx?.impact(hit.point, hit.normal, hit.box?.material || 'concrete', { melee: true });
        bus.emit('melee-hit', hit);
      }
    } else if (d.kind === 'throwable') {
      if (w.count <= 0) return;
      w.count--;
      this.cooldown = d.fireInterval;
      this._throw(w, player);
      if (w.count <= 0) {
        // auto-switch to primary after last throwable
        setTimeoutTick(this.game, 30, () => { if (this.current().id === w.id) this.selectSlot(1); });
      }
    }
  }

  _fireHitscan(w, player, world) {
    const d = w.def;
    const eye = player.eyePos();
    const baseDir = player.lookDir();
    const spreadDeg = this.effectiveSpreadDeg(player);
    const pellets = d.pellets || 1;
    const rng = this.game.rng;
    const hits = [];
    for (let i = 0; i < pellets; i++) {
      const dir = coneSpread(baseDir, spreadDeg, rng);
      const result = this.game.hitscanPenetrating(eye, dir, 200, d);
      hits.push(...result);
    }
    bus.emit('weapon-fired', {
      id: w.id, family: d.family, mag: w.mag, pos: eye, dir: baseDir,
      tracer: d.tracerEvery > 0 && (w.mag % d.tracerEvery === 0),
    });
  }

  _throw(w, player) {
    const d = w.def;
    const eye = player.eyePos();
    const dir = player.lookDir();
    const proj = {
      id: d.effect + '-' + Math.floor(this.game.loop.tick),
      effect: d.effect,
      pos: { x: eye.x + dir.x * 0.4, y: eye.y + dir.y * 0.4 - 0.1, z: eye.z + dir.z * 0.4 },
      vel: { x: dir.x * d.throwSpeed, y: dir.y * d.throwSpeed + 2.2, z: dir.z * d.throwSpeed },
      fuse: d.fuse,
      bounces: 0,
      done: false,
    };
    this.throwables.push(proj);
    bus.emit('throwable-thrown', { effect: d.effect, id: proj.id });
  }

  _updateThrowables(dt, world) {
    for (const p of this.throwables) {
      if (p.done) continue;
      p.fuse -= dt;
      p.vel.y -= 14 * dt;
      const speed = Math.hypot(p.vel.x, p.vel.y, p.vel.z);
      if (speed > 0.05) {
        const dir = { x: p.vel.x / speed, y: p.vel.y / speed, z: p.vel.z / speed };
        const step = speed * dt;
        const hit = world.collision.raycast(p.pos, dir, step + 0.12, { mode: 'solid' });
        if (hit && hit.dist <= step + 0.12) {
          const n = hit.normal;
          const dot = p.vel.x * n.x + p.vel.y * n.y + p.vel.z * n.z;
          p.vel.x -= 1.55 * dot * n.x; p.vel.y -= 1.55 * dot * n.y; p.vel.z -= 1.55 * dot * n.z;
          p.vel.x *= 0.62; p.vel.y *= 0.62; p.vel.z *= 0.62;
          p.bounces++;
          p.pos.x = hit.point.x + n.x * 0.13; p.pos.y = hit.point.y + n.y * 0.13; p.pos.z = hit.point.z + n.z * 0.13;
          bus.emit('throwable-bounce', { pos: { ...p.pos }, effect: p.effect });
        } else {
          p.pos.x += p.vel.x * dt; p.pos.y += p.vel.y * dt; p.pos.z += p.vel.z * dt;
        }
      }
      if (p.fuse <= 0) {
        p.done = true;
        bus.emit('throwable-detonate', { effect: p.effect, pos: { ...p.pos }, id: p.id });
        this.game.onDetonate(p);
      }
    }
    this.throwables = this.throwables.filter((p) => !p.done);
  }

  startReload() {
    const w = this.current();
    const d = w.def;
    if (d.kind !== 'gun' || w.reserve <= 0 || w.mag >= d.mag || this.state === 'reload') return;
    this.state = 'reload';
    this.stateT = d.reloadTime;
    this.ads = 0;
    bus.emit('weapon-reload-start', { id: w.id, empty: w.mag === 0, perShell: !!d.reloadPerShell });
  }

  _finishReload(w) {
    const d = w.def;
    if (d.reloadPerShell) {
      const take = Math.min(1, w.reserve, d.mag - w.mag);
      w.mag += take; w.reserve -= take;
      this.state = 'idle';
      this.pendingShellReload = w.mag < d.mag && w.reserve > 0;
      bus.emit('weapon-reload-shell', { id: w.id, mag: w.mag });
    } else {
      const take = Math.min(d.mag - w.mag, w.reserve);
      w.mag += take; w.reserve -= take;
      this.state = 'idle';
      bus.emit('weapon-reload-done', { id: w.id, mag: w.mag, reserve: w.reserve });
    }
  }

  addAmmo(id, amount) {
    for (const s of Object.values(this.slots)) {
      if (s.id === id && s.def.kind === 'gun') { s.reserve = Math.min(s.def.reserve * 2, s.reserve + amount); return true; }
    }
    return false;
  }

  giveWeapon(id) {
    const d = WEAPON_DEFS[id];
    if (!d) return false;
    this._addWeapon(id);
    this.selectSlot(d.slot);
    return true;
  }

  summary() {
    const w = this.current();
    return {
      id: w.id, name: w.def.name, slot: w.def.slot, state: this.state,
      mag: w.mag, reserve: w.def.kind === 'throwable' ? w.count : w.reserve,
      kind: w.def.kind, ads: Math.round(this.ads * 100) / 100,
      slots: Object.fromEntries(Object.entries(this.slots).map(([s, v]) => [s, {
        id: v.id, mag: v.mag, reserve: v.def.kind === 'throwable' ? v.count : v.reserve,
      }])),
    };
  }
}

function coneSpread(dir, spreadDeg, rng) {
  const spread = (spreadDeg * Math.PI) / 180;
  const a = rng.angle();
  const r = Math.abs(rng.gauss()) * spread;
  // build orthonormal basis around dir
  const up = Math.abs(dir.y) > 0.94 ? { x: 1, y: 0, z: 0 } : { x: 0, y: 1, z: 0 };
  const t1 = norm(cross(dir, up));
  const t2 = cross(t1, dir);
  const sx = Math.cos(a) * Math.sin(r), sy = Math.sin(a) * Math.sin(r), c = Math.cos(r);
  return norm({
    x: dir.x * c + t1.x * sx + t2.x * sy,
    y: dir.y * c + t1.y * sx + t2.y * sy,
    z: dir.z * c + t1.z * sx + t2.z * sy,
  });
}

function cross(a, b) { return { x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x }; }
function norm(v) { const l = Math.hypot(v.x, v.y, v.z) || 1; return { x: v.x / l, y: v.y / l, z: v.z / l }; }

// schedule a callback N ticks in the future on the game's tick timeline
function setTimeoutTick(game, ticks, fn) {
  game.tickTimers.push({ at: game.loop.tick + ticks, fn });
}
