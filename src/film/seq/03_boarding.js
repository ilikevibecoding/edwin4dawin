import * as THREE from 'three';
import { Sequence, ramp, ease, clamp } from '../../core/timeline.js';
import { buildCorridor, buildBlastDoor, buildCorridorLighting } from '../../world/corridor.js';
import { buildStormtrooper, buildRebelTrooper, buildVader } from '../../lego/characters.js';
import { BlasterBolts, Explosions, SmokeSystem, Sparks, ImpactFlash, BrickDebris } from '../../fx/effects.js';
import { makeRng } from '../../core/rng.js';

/*
 * Boarding.
 *
 * Shot down the length of a corridor: the door goes, troopers come through the
 * smoke, and the sequence ends on a low angle as the villain steps into frame.
 * The firefight is a fixed schedule rather than a simulation so the sound
 * effects can be scheduled against it to the frame.
 */

// Every shot in the firefight: [time, from(-1 rebel side / 1 imperial side), lane, height]
const SHOTS = [];
{
  const r = makeRng('boarding-shots');
  for (let i = 0; i < 46; i++) {
    const t = 6.4 + i * 0.21 + r.range(0, 0.12);
    if (t > 16.2) break;
    SHOTS.push({ t, side: r.bool(0.55) ? 1 : -1, x: r.range(-3.6, 3.6), y: r.range(2.2, 4.6) });
  }
}

export class BoardingSequence extends Sequence {
  constructor() {
    super('boarding', {
      duration: 33,
      fadeIn: 0.9,
      fadeOut: 1.0,
      exposure: 1.05,
      bloom: { strength: 0.62, radius: 0.55, threshold: 0.72 },
    });
    this.chapter = { t: 0.8, hold: 3.4, title: 'BOARDED', subtitle: 'Deck four, aft corridor' };
    this.cues = [
      { t: 0.0, kind: 'sfx', name: 'alarm_klaxon', opts: { duration: 7, gain: 0.5 } },
      { t: 0.6, kind: 'vo', id: 'n04' },
      { t: 0.2, kind: 'cue', name: 'chase', opts: { gain: 0.5 } },
      { t: 5.0, kind: 'sfx', name: 'door_blast', opts: { gain: 1.0 } },
      { t: 5.0, kind: 'sfx', name: 'explosion_large', opts: { gain: 0.9 } },
      { t: 5.6, kind: 'vo', id: 'r01' },
      { t: 7.8, kind: 'vo', id: 't01' },
      ...SHOTS.map((s) => ({
        t: s.t,
        kind: 'sfx',
        name: s.side > 0 ? 'blaster_imperial' : 'blaster_rebel',
        opts: { gain: 0.45, pan: s.x / 5 },
      })),
      { t: 17.0, kind: 'stop', name: 'chase', fade: 2.0 },
      { t: 18.4, kind: 'cue', name: 'imperial' },
      { t: 19.6, kind: 'sfx', name: 'vader_breath', opts: { gain: 0.85 } },
      { t: 23.4, kind: 'sfx', name: 'vader_breath', opts: { gain: 0.85 } },
      { t: 22.0, kind: 'vo', id: 'v01' },
      { t: 27.0, kind: 'sfx', name: 'vader_breath', opts: { gain: 0.8 } },
      { t: 27.6, kind: 'vo', id: 'v02' },
    ];
  }

  async build(ctx) {
    const s = this.scene;
    s.background = new THREE.Color(0x05070a);

    this.corridor = buildCorridor({ sections: 7 });
    s.add(this.corridor);

    this.door = buildBlastDoor();
    this.door.position.set(0, 0, -46);
    s.add(this.door);

    s.add(buildCorridorLighting());

    // Rebels dug in near camera, facing the door.
    this.rebels = [];
    const rp = [[-3.2, -6], [3.0, -9], [-2.6, -14], [3.4, -17]];
    for (let i = 0; i < rp.length; i++) {
      const f = buildRebelTrooper();
      f.position.set(rp[i][0], 0, rp[i][1]);
      f.rotation.y = 0;                       // faces -z, toward the door
      s.add(f);
      this.rebels.push({ fig: f, phase: i * 1.3, downAt: 9.4 + i * 2.1 });
    }

    // Troopers pour in from the far end.
    this.troopers = [];
    const tp = [[-2.4, -52], [2.2, -55], [-3.6, -60], [3.4, -63], [0.2, -67]];
    for (let i = 0; i < tp.length; i++) {
      const f = buildStormtrooper();
      f.position.set(tp[i][0], 0, tp[i][1]);
      f.rotation.y = Math.PI;                 // faces +z, toward camera
      s.add(f);
      this.troopers.push({ fig: f, x: tp[i][0], z0: tp[i][1], phase: i * 0.7 });
    }

    this.vader = buildVader();
    this.vader.position.set(0, 0, -62);
    this.vader.rotation.y = Math.PI;
    s.add(this.vader);

    this.bolts = new BlasterBolts(s, { pool: 90 });
    this.booms = new Explosions(s, {});
    this.smoke = new SmokeSystem(s, {});
    this.sparks = new Sparks(s, {});
    this.flash = new ImpactFlash(s, {});
    this.debris = new BrickDebris(s, {});

    this.rng = makeRng('boarding');
    this._done = new Set();
    this._v = new THREE.Vector3();
    this._v2 = new THREE.Vector3();
  }

  enter(ctx) {
    ctx.rig.reset();
    this._done.clear();
  }

  update(t, dt, ctx) {
    const s = this.scene;

    // --- the door -------------------------------------------------------
    if (t < 5) {
      this.door.userData.setOpen?.(0);
    } else if (!this._done.has('door')) {
      this._done.add('door');
      this.door.userData.setDamaged?.(true);
      this.booms.burst(new THREE.Vector3(0, 3.4, -46), { size: 5.5, debris: 26, smoke: true });
      for (let i = 0; i < 10; i++) {
        this.smoke.puff(new THREE.Vector3(this.rng.range(-5, 5), this.rng.range(0.5, 6), -44 + this.rng.range(-3, 3)),
          { size: 5 + this.rng.range(0, 4), life: 7, drift: 0.5 });
      }
      this.debris.scatter(new THREE.Vector3(0, 3, -45), 22, { force: 16, floorY: 0.2 });
      ctx.rig.shake(1.4);
    }
    if (t >= 5) this.door.userData.setOpen?.(clamp((t - 5) / 1.1));

    // --- rebels ---------------------------------------------------------
    for (const r of this.rebels) {
      const fig = r.fig;
      if (t < r.downAt) {
        const aim = 0.9 + Math.sin(t * 3 + r.phase) * 0.06;
        fig.userData.pose?.({
          armR: aim, armL: aim - 0.15, elbowR: 0.55, elbowL: 0.7,
          crouch: 0.35, lean: 0.18, headTurn: Math.sin(t * 1.4 + r.phase) * 0.1,
        });
      } else {
        const u = clamp((t - r.downAt) / 0.55);
        fig.rotation.x = -ease('out', u) * 1.5;
        fig.position.y = -ease('out', u) * 0.6;
        if (!this._done.has('down' + r.downAt)) {
          this._done.add('down' + r.downAt);
          this.sparks.burst(fig.position.clone().setY(3), new THREE.Vector3(0, 0, 1), 10, {});
        }
      }
    }

    // --- troopers advance ------------------------------------------------
    for (const tr of this.troopers) {
      const fig = tr.fig;
      const march = clamp((t - 5.6) / 11) * 26;
      fig.position.z = tr.z0 + march;
      if (t > 5.6 && t < 16) {
        fig.userData.walk?.(t + tr.phase, 0.55, { amp: 0.45 });
        fig.userData.pose?.({ armR: 1.0, elbowR: 0.5, armL: 0.85, elbowL: 0.8 });
      }
      fig.visible = t < 17.5 || fig.position.x < -1;
    }

    // --- the firefight ---------------------------------------------------
    for (let i = 0; i < SHOTS.length; i++) {
      const sh = SHOTS[i];
      if (t >= sh.t && !this._done.has('b' + i)) {
        this._done.add('b' + i);
        const fromZ = sh.side > 0 ? -44 : -12;
        const toZ = sh.side > 0 ? -8 : -48;
        this._v.set(sh.x, sh.y, fromZ);
        this._v2.set(sh.x * -0.5 + this.rng.range(-2, 2), sh.y + this.rng.range(-0.8, 0.8), toZ).sub(this._v).normalize();
        this.bolts.spawn(this._v, this._v2, {
          color: sh.side > 0 ? 0x39ff62 : 0xff2a10,
          speed: 62, length: 2.6, width: 0.16, life: 1.2,
        });
        if (this.rng.bool(0.35)) {
          const p = new THREE.Vector3(sh.x * 1.6, sh.y, sh.side > 0 ? -10 : -46);
          this.flash.flash(p, new THREE.Vector3(0, 0, 1), { color: sh.side > 0 ? 0x39ff62 : 0xff2a10, size: 1.2 });
          this.sparks.burst(p, new THREE.Vector3(0, 0.4, 1), 7, {});
        }
      }
    }

    // --- Vader ------------------------------------------------------------
    const vIn = clamp((t - 18.2) / 6.5);
    this.vader.visible = t > 17.6;
    this.vader.position.z = -62 + ease('inout', vIn) * 30;
    if (t > 17.6) {
      if (vIn < 1) this.vader.userData.walk?.(t, 0.34, { amp: 0.34, roll: 0.5 });
      else this.vader.userData.pose?.({ armL: 0.1, armR: 0.1, elbowL: 0.5, elbowR: 0.5, headTurn: Math.sin(t * 0.5) * 0.07 });
      this.vader.userData.capeParams = { speed: vIn < 1 ? 0.32 : 0.06, gust: 0.1 };
      this.vader.userData.update?.(t, dt);
    }

    // --- smoke bed --------------------------------------------------------
    if (t > 5.2 && t < 24 && Math.floor(t * 3) !== this._lastPuff) {
      this._lastPuff = Math.floor(t * 3);
      this.smoke.puff(new THREE.Vector3(this.rng.range(-5, 5), this.rng.range(0.2, 2.2), this.rng.range(-50, -34)),
        { size: 4.5, life: 8, drift: 0.35, color: 0x9aa4ac });
    }

    this.bolts.update(t, dt);
    this.booms.update(t, dt);
    this.smoke.update(t, dt);
    this.sparks.update(t, dt);
    this.flash.update(t, dt);
    this.debris.update(t, dt);

    // --- camera ------------------------------------------------------------
    if (t < 4.6) {
      const u = t / 4.6;
      ctx.rig.set([2.6 - u * 1.4, 3.4, 4 - u * 5], [0.4, 3.2, -46], 44);
      ctx.rig.handheld(0.035, 0.8);
    } else if (t < 8.2) {
      const u = (t - 4.6) / 3.6;
      ctx.rig.set([-1.2, 2.6 + u * 0.5, -2 - u * 3], [0, 3.2, -46], 48);
      ctx.rig.handheld(0.09, 1.5);
    } else if (t < 12.6) {
      const u = (t - 8.2) / 4.4;
      ctx.rig.set([4.6 - u * 1.0, 4.6, -26 + u * 3], [-1.5, 3.0, -46], 40);
      ctx.rig.handheld(0.075, 1.3);
    } else if (t < 17.4) {
      const u = (t - 12.6) / 4.8;
      ctx.rig.set([-4.4, 2.2, -30 - u * 2], [1.0, 3.4, -52], 42);
      ctx.rig.handheld(0.07, 1.2);
    } else {
      // Low and looking up as he arrives.
      const u = clamp((t - 17.4) / 12);
      const vz = this.vader.position.z;
      ctx.rig.set(
        [0.4, 1.1 + u * 0.5, vz + 15 - u * 5],
        [0, 3.6 + u * 1.0, vz],
        46 - u * 8,
      );
      ctx.rig.handheld(0.022, 0.5);
    }
  }
}
