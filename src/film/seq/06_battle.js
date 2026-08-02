import * as THREE from 'three';
import { Sequence, ramp, ease, clamp } from '../../core/timeline.js';
import { buildStarfield } from '../../world/space.js';
import { buildTrench, buildExhaustPort, buildSurfacePanels, buildTrenchTurret, buildDeathStarLighting } from '../../world/deathstar.js';
import { buildXwing, buildTieFighter, buildDeathStarPlanet } from '../../lego/ships.js';
import { BlasterBolts, Explosions, EngineTrails, Sparks, SmokeSystem, ImpactFlash, buildStarLines } from '../../fx/effects.js';
import { svgPlane, targetingHudSvg } from '../../svg/assets.js';
import { makeRng } from '../../core/rng.js';
import { flyOrient } from '../../core/cameraRig.js';

/*
 * The run.
 *
 * Three X-wings, a trench and a two-metre target. The trench is a chain of
 * modular sections recycled ahead of the fighters, so the ships fly in a
 * straight line down -Z forever and the world comes to them.
 */
const TRENCH_LEN = 1400;
const RUN_SPEED = 96;

export class BattleSequence extends Sequence {
  constructor() {
    super('battle', {
      duration: 43,
      fadeIn: 1.0,
      fadeOut: 1.4,
      exposure: 1.0,
      bloom: { strength: 0.8, radius: 0.62, threshold: 0.66 },
    });
    this.chapter = { t: 0.8, hold: 3.4, title: 'THE RUN', subtitle: 'Two metres wide' };
    this.cues = [
      { t: 0.0, kind: 'cue', name: 'battle' },
      { t: 0.6, kind: 'vo', id: 'n09' },
      { t: 0.2, kind: 'sfx', name: 'engine_rumble', opts: { duration: 42, gain: 0.4 } },
      { t: 6.4, kind: 'sfx', name: 'tie_scream', opts: { pan: 0.6 } },
      { t: 8.2, kind: 'sfx', name: 'blaster_rebel', opts: { gain: 0.7 } },
      { t: 8.5, kind: 'sfx', name: 'blaster_rebel', opts: { gain: 0.7 } },
      { t: 9.1, kind: 'sfx', name: 'explosion_small', opts: { gain: 0.9 } },
      { t: 10.6, kind: 'sfx', name: 'tie_scream', opts: { pan: -0.5 } },
      { t: 11.4, kind: 'sfx', name: 'blaster_imperial', opts: { gain: 0.6, pan: -0.3 } },
      { t: 12.0, kind: 'sfx', name: 'explosion_small', opts: { gain: 0.8, pan: -0.4 } },
      { t: 13.2, kind: 'vo', id: 'k01' },
      { t: 15.2, kind: 'stop', name: 'battle', fade: 1.6 },
      { t: 15.6, kind: 'cue', name: 'trench' },
      { t: 16.0, kind: 'sfx', name: 'engine_whoosh', opts: { gain: 0.8 } },
      ...[18.4, 20.1, 21.9, 23.6, 25.2, 27.0, 28.7].map((t, i) => ({
        t, kind: 'sfx', name: 'blaster_imperial', opts: { gain: 0.55, pan: i % 2 ? 0.5 : -0.5 },
      })),
      { t: 22.0, kind: 'vo', id: 'b01' },
      { t: 24.4, kind: 'sfx', name: 'tie_scream', opts: { pan: 0.2, gain: 0.8 } },
      { t: 29.6, kind: 'vo', id: 'k02' },
      { t: 30.2, kind: 'sfx', name: 'blaster_rebel', opts: { gain: 1.0 } },
      { t: 33.4, kind: 'sfx', name: 'explosion_large', opts: { gain: 1.0 } },
      { t: 34.6, kind: 'stop', name: 'trench', fade: 0.8 },
      { t: 34.8, kind: 'sfx', name: 'explosion_huge', opts: { gain: 1.0 } },
      { t: 35.0, kind: 'sfx', name: 'low_boom', opts: { gain: 1.0 } },
      { t: 36.2, kind: 'vo', id: 'n10' },
      { t: 36.0, kind: 'cue', name: 'triumph' },
    ];
  }

  async build(ctx) {
    const s = this.scene;
    s.background = new THREE.Color(0x02030a);

    this.stars = buildStarfield({ count: 2600, radius: 3000 });
    s.add(this.stars);

    this.station = buildDeathStarPlanet({ radius: 300 });
    this.station.position.set(120, -60, -900);
    s.add(this.station);

    this.surface = buildSurfacePanels({ size: 900, seed: 'ds-surface' });
    this.surface.position.set(0, -18, -400);
    s.add(this.surface);

    this.trench = buildTrench({ sections: 14, seed: 'trench' });
    this.trench.position.set(0, 0, 0);
    s.add(this.trench);
    this.trenchLen = this.trench.userData.length || TRENCH_LEN;

    this.port = buildExhaustPort();
    s.add(this.port);

    this.turrets = [];
    for (let i = 0; i < 6; i++) {
      const tur = buildTrenchTurret();
      tur.position.set(i % 2 ? 19 : -19, 13, -120 - i * 150);
      s.add(tur);
      this.turrets.push(tur);
    }

    s.add(buildDeathStarLighting());

    this.xwings = [];
    for (let i = 0; i < 3; i++) {
      const x = buildXwing({ sFoils: true });
      s.add(x);
      this.xwings.push(x);
    }
    this.hero = this.xwings[0];

    this.ties = [];
    for (let i = 0; i < 4; i++) {
      const ti = buildTieFighter();
      s.add(ti);
      this.ties.push(ti);
    }

    this.trails = new EngineTrails(s, { color: 0xa9ecff });
    for (const x of this.xwings) for (const e of x.userData.engines || []) this.trails.attach(e, { radius: 0.55, length: 16 });
    this.tieTrails = new EngineTrails(s, { color: 0xff9a6a });
    for (const ti of this.ties) for (const e of ti.userData.engines || []) this.tieTrails.attach(e, { radius: 0.45, length: 9 });

    this.bolts = new BlasterBolts(s, { pool: 120 });
    this.booms = new Explosions(s, {});
    this.sparks = new Sparks(s, {});
    this.smoke = new SmokeSystem(s, {});
    this.flash = new ImpactFlash(s, {});
    this.lines = buildStarLines({ count: 260 });
    s.add(this.lines);

    // The targeting overlay lives on a plane pinned in front of the camera.
    this.hud = await svgPlane(targetingHudSvg({ lock: 0, distance: 800, armed: true }), {
      width: 2.0, height: 0.84, glow: 1.1, opacity: 0,
    });
    this.hudLocked = await svgPlane(targetingHudSvg({ lock: 1, distance: 60, armed: true, blink: true }), {
      width: 2.0, height: 0.84, glow: 1.3, opacity: 0,
    });
    s.add(this.hud, this.hudLocked);

    this.rng = makeRng('battle');
    this._done = new Set();
    this._v = new THREE.Vector3();
    this._v2 = new THREE.Vector3();
    this.PORT_Z = -RUN_SPEED * 33.6 + 60;
  }

  enter(ctx) {
    ctx.rig.reset();
    this._done.clear();
  }

  /** Where the hero fighter is at time t. Everything else keys off this. */
  heroPath(t, out) {
    const inTrench = t > 15.6;
    const z = t < 15.6 ? 260 - t * 30 : -220 - (t - 15.6) * RUN_SPEED;
    const y = inTrench
      ? 5.2 + Math.sin(t * 1.7) * 0.5
      : 40 - clamp((t - 12.6) / 3.0) * 34 + Math.sin(t * 0.8) * 3;
    const x = inTrench
      ? Math.sin(t * 0.9) * 3.0
      : Math.sin(t * 0.42) * 26;
    return out.set(x, y, z);
  }

  update(t, dt, ctx) {
    const s = this.scene;
    const hp = this.heroPath(t, this._v).clone();

    // --- fighters ---------------------------------------------------------
    for (let i = 0; i < this.xwings.length; i++) {
      const x = this.xwings[i];
      const lag = i * 0.42;
      const p = this.heroPath(t - lag, this._v2);
      const off = i === 0 ? [0, 0, 0] : (i === 1 ? [7.5, 1.6, 14] : [-8.0, -1.4, 18]);
      x.position.set(p.x + off[0], p.y + off[1], p.z + off[2]);
      const vel = this._v2.set(0, 0, -1);
      const bank = Math.cos(t * (i === 0 ? 0.9 : 0.42) + lag) * (t > 15.6 ? 0.22 : 0.5);
      x.rotation.set(0, 0, 0);
      flyOrient(x, vel, bank);
      x.userData.setSFoils?.(clamp((t - 3.5) / 2.5));
      x.visible = i === 0 || t < 33.5;
    }
    this.trails.setThrottle(1);
    this.trails.update(t, dt);

    // TIEs sweep across early, then chase down the trench.
    for (let i = 0; i < this.ties.length; i++) {
      const ti = this.ties[i];
      if (t < 15.0) {
        const u = (t - 5.4 - i * 1.3) * 1.0;
        ti.visible = u > -1 && u < 8;
        ti.position.set(-70 + u * 26 + i * 12, 34 + Math.sin(u * 1.4 + i) * 9, 120 - u * 42 - i * 30);
        ti.rotation.set(0, -0.6 + Math.sin(u) * 0.2, Math.sin(u * 1.2) * 0.5);
      } else if (i < 3) {
        const u = clamp((t - 19) / 6);
        ti.visible = t > 19 && t < 34;
        const p = this.heroPath(t - 1.1 - i * 0.28, this._v2);
        ti.position.set(p.x + (i - 1) * 6.5, p.y + 1.2, p.z + 40 - u * 12);
        ti.rotation.set(0, Math.PI, Math.sin(t * 2 + i) * 0.35);
      } else {
        ti.visible = false;
      }
    }
    this.tieTrails.setThrottle(0.8);
    this.tieTrails.update(t, dt);

    // --- recycle the trench ahead of the fighters -------------------------
    if (t > 14) {
      const period = this.trenchLen;
      const base = Math.floor((hp.z + 300) / period) * period;
      this.trench.position.z = base;
      this.surface.position.z = base;
    }
    this.port.position.set(0, 0.4, this.PORT_Z);
    this.port.visible = t > 26;
    for (let i = 0; i < this.turrets.length; i++) {
      const tur = this.turrets[i];
      const spacing = 150;
      const zz = hp.z - 90 - ((i * spacing) % 900);
      tur.position.z = zz;
      tur.userData.aimAt?.(hp);
    }

    // --- scripted violence -------------------------------------------------
    const dogfight = [
      [8.2, 'x', 0], [8.5, 'x', 1], [11.4, 't', 0], [18.4, 't', 1], [20.1, 't', 2],
      [21.9, 't', 0], [23.6, 't', 1], [25.2, 't', 2], [27.0, 't', 0], [28.7, 't', 1],
    ];
    for (let i = 0; i < dogfight.length; i++) {
      const [ft, who] = dogfight[i];
      if (t >= ft && !this._done.has('f' + i)) {
        this._done.add('f' + i);
        if (who === 'x') {
          const g = this.hero.userData.points || {};
          const muzzle = g.gunL1 ? this.hero.localToWorld(g.gunL1.clone()) : this.hero.position.clone();
          this.bolts.spawn(muzzle, this._v2.set(0, 0, -1), { color: 0xff2a10, speed: 260, length: 8, width: 0.22, life: 1.6 });
          this.bolts.spawn(muzzle.clone().add(this._v2.set(-6, 0, 0)), this._v2.set(0, 0, -1),
            { color: 0xff2a10, speed: 260, length: 8, width: 0.22, life: 1.6 });
        } else {
          const src = hp.clone().add(new THREE.Vector3(this.rng.range(-8, 8), this.rng.range(-2, 4), 44));
          this.bolts.spawn(src, this._v2.set(this.rng.range(-0.05, 0.05), this.rng.range(-0.03, 0.03), -1).normalize(),
            { color: 0x39ff62, speed: 220, length: 7, width: 0.2, life: 1.4 });
        }
      }
    }
    if (t >= 9.1 && !this._done.has('tiedie')) {
      this._done.add('tiedie');
      const p = this.ties[0].position.clone();
      this.booms.burst(p, { size: 4.5, debris: 18, smoke: true });
      this.ties[0].visible = false;
    }
    if (t >= 12.0 && !this._done.has('tiedie2')) {
      this._done.add('tiedie2');
      this.booms.burst(this.ties[1].position.clone(), { size: 4.0, debris: 14, smoke: true });
    }
    if (t >= 24.4 && !this._done.has('wingdown')) {
      this._done.add('wingdown');
      const p = this.xwings[2].position.clone();
      this.booms.burst(p, { size: 5.0, debris: 22, smoke: true });
      this.xwings[2].visible = false;
      ctx.rig.shake(0.8);
    }

    // --- torpedoes and the end of the Death Star ---------------------------
    if (t >= 30.2 && !this._done.has('torp')) {
      this._done.add('torp');
      const p = hp.clone().add(new THREE.Vector3(0, -1.2, -4));
      for (const dx of [-1.6, 1.6]) {
        this.bolts.spawn(p.clone().add(new THREE.Vector3(dx, 0, 0)), this._v2.set(0, 0, -1),
          { color: 0xaee9ef, speed: 210, length: 5, width: 0.4, life: 4 });
      }
    }
    if (t >= 33.4 && !this._done.has('hit')) {
      this._done.add('hit');
      this.booms.burst(new THREE.Vector3(0, 1, this.PORT_Z), { size: 9, debris: 40, smoke: true });
      ctx.rig.shake(1.6);
    }
    if (t >= 34.8 && !this._done.has('kaboom')) {
      this._done.add('kaboom');
      for (let i = 0; i < 14; i++) {
        this.booms.burst(new THREE.Vector3(
          this.rng.range(-160, 160), this.rng.range(-90, 90), -700 + this.rng.range(-160, 160)),
          { size: 26 + this.rng.range(0, 22), debris: 20, smoke: true });
      }
      ctx.rig.shake(2.4);
    }
    if (t > 34.8) {
      this.station.scale.setScalar(1 + (t - 34.8) * 0.06);
      this.station.visible = t < 39.5;
    }

    // --- HUD ---------------------------------------------------------------
    const hudOn = t > 17.5 && t < 33.8;
    const lock = clamp((t - 26.5) / 3.4);
    const cam = ctx.camera;
    for (const [plane, want] of [[this.hud, hudOn && lock < 1], [this.hudLocked, hudOn && lock >= 1]]) {
      plane.visible = want;
      if (!want) { plane.material.opacity = 0; continue; }
      plane.material.opacity = 0.9 * Math.min(ramp(t, 17.5, 18.4), 1 - ramp(t, 33.0, 33.8));
      plane.position.copy(cam.position);
      plane.quaternion.copy(cam.quaternion);
      plane.translateZ(-1.6);
    }

    this.bolts.update(t, dt);
    this.booms.update(t, dt);
    this.sparks.update(t, dt);
    this.smoke.update(t, dt);
    this.flash.update(t, dt);
    this.lines.userData.setSpeed?.(t > 15.6 ? 1 : 0.2);
    this.lines.userData.update?.(t, dt);
    this.lines.position.copy(hp);
    this.lines.visible = t > 15.6 && t < 34;

    // --- camera --------------------------------------------------------------
    if (t < 5.0) {
      // Establish: the station fills the background, fighters cross frame.
      const u = t / 5;
      ctx.rig.set([hp.x + 60 - u * 20, hp.y + 26, hp.z + 90], [hp.x, hp.y + 4, hp.z - 120], 42);
      ctx.rig.handheld(0.03, 0.5);
    } else if (t < 12.6) {
      // Dogfight: sit on the hero's shoulder.
      const u = (t - 5) / 7.6;
      ctx.rig.set([hp.x - 14 + u * 4, hp.y + 6, hp.z + 26], [hp.x, hp.y, hp.z - 40], 46);
      ctx.rig.handheld(0.09, 1.6);
    } else if (t < 16.4) {
      // The dive.
      const u = (t - 12.6) / 3.8;
      ctx.rig.set([hp.x + 20 - u * 12, hp.y + 16 - u * 6, hp.z + 34], [hp.x, hp.y - 6, hp.z - 60], 44);
      ctx.rig.handheld(0.06, 1.2);
    } else if (t < 26.5) {
      // In the trench, chase cam.
      const u = (t - 16.4) / 10.1;
      ctx.rig.set([hp.x * 0.6, hp.y + 2.6, hp.z + 20 - u * 4], [hp.x * 0.3, hp.y + 0.6, hp.z - 90], 52);
      ctx.rig.handheld(0.055, 1.8);
    } else if (t < 33.6) {
      // Cockpit-ish: right behind the hull, target dead ahead.
      ctx.rig.set([hp.x, hp.y + 1.2, hp.z + 6.5], [hp.x * 0.2, hp.y + 0.4, hp.z - 140], 58);
      ctx.rig.handheld(0.045, 2.2);
    } else {
      // Pull out and watch it go.
      const u = clamp((t - 33.6) / 9.4);
      ctx.rig.set(
        [hp.x + 40 + u * 180, hp.y + 30 + u * 120, hp.z + 120 + u * 320],
        [0, 0, -700],
        40 + u * 14,
      );
      ctx.rig.handheld(0.03, 0.6);
    }
  }
}
