import * as THREE from 'three';
import { Sequence, ramp, ease, clamp, window_ } from '../../core/timeline.js';
import { buildStarfield, buildTatooinePlanet, buildSpaceLighting } from '../../world/space.js';
import { buildTantiveIV, buildStarDestroyer } from '../../lego/ships.js';
import { BlasterBolts, LaserBeams, Explosions, EngineTrails, Sparks } from '../../fx/effects.js';
import { makeRng } from '../../core/rng.js';

/*
 * The chase.
 *
 * A small ship running, a very large ship arriving. The whole shot exists to
 * sell one contrast, so the Star Destroyer enters slowly from the top of frame
 * and simply keeps coming.
 */
const SD_SPEED = 42;
const RUNNER_SPEED = 34;

export class ChaseSequence extends Sequence {
  constructor() {
    super('chase', {
      duration: 33,
      fadeIn: 1.2,
      fadeOut: 0.9,
      exposure: 1.02,
      bloom: { strength: 0.7, radius: 0.6, threshold: 0.7 },
    });
    this.chapter = { t: 0.9, hold: 3.6, title: 'THE CHASE', subtitle: 'Over Tatooine' };
    this.cues = [
      { t: 0.0, kind: 'cue', name: 'chase' },
      { t: 1.0, kind: 'vo', id: 'n02' },
      { t: 0.2, kind: 'sfx', name: 'engine_rumble', opts: { duration: 32, gain: 0.42 } },
      { t: 7.6, kind: 'sfx', name: 'turbolaser', opts: { pan: 0.4 } },
      { t: 8.5, kind: 'sfx', name: 'turbolaser', opts: { pan: -0.3 } },
      { t: 9.4, kind: 'sfx', name: 'explosion_small', opts: { gain: 0.8 } },
      { t: 10.9, kind: 'sfx', name: 'turbolaser', opts: { pan: 0.2 } },
      { t: 11.6, kind: 'sfx', name: 'explosion_small', opts: { gain: 0.7, pan: -0.2 } },
      { t: 13.2, kind: 'sfx', name: 'turbolaser', opts: { pan: -0.5 } },
      { t: 15.6, kind: 'cue', name: 'imperial', opts: { gain: 0.9 } },
      { t: 16.0, kind: 'sfx', name: 'low_boom', opts: { gain: 0.9 } },
      { t: 17.4, kind: 'vo', id: 'n03' },
      { t: 24.6, kind: 'sfx', name: 'hologram_hum', opts: { duration: 8, gain: 0.5 } },
      { t: 25.4, kind: 'vo', id: 'o01' },
    ];
  }

  async build(ctx) {
    const s = this.scene;
    s.background = new THREE.Color(0x01020a);

    this.stars = buildStarfield({ count: 3000, radius: 2600 });
    s.add(this.stars);

    this.planet = buildTatooinePlanet({ radius: 420 });
    this.planet.position.set(-120, -520, -420);
    s.add(this.planet);

    s.add(buildSpaceLighting(s));

    this.runner = buildTantiveIV();
    s.add(this.runner);

    this.destroyer = buildStarDestroyer();
    s.add(this.destroyer);

    this.trails = new EngineTrails(s, { color: 0x9fd8ff });
    for (const e of this.runner.userData.engines || []) this.trails.attach(e, { radius: 1.1, length: 26 });
    this.trailsSD = new EngineTrails(s, { color: 0xbfe4ff });
    for (const e of this.destroyer.userData.engines || []) this.trailsSD.attach(e, { radius: 3.4, length: 60 });

    this.beams = new LaserBeams(s, {});
    this.bolts = new BlasterBolts(s, { pool: 60 });
    this.booms = new Explosions(s, {});
    this.sparks = new Sparks(s, {});

    this.rng = makeRng('chase');
    this._fired = new Set();
    this._tmp = new THREE.Vector3();
  }

  enter(ctx) {
    ctx.rig.reset();
    this._fired.clear();
  }

  update(t, dt, ctx) {
    const runner = this.runner;
    const sd = this.destroyer;

    // --- ship motion ----------------------------------------------------
    runner.position.set(
      Math.sin(t * 0.32) * 5.5,
      2.5 + Math.sin(t * 0.24 + 1.2) * 2.2,
      120 - t * RUNNER_SPEED,
    );
    runner.rotation.set(
      Math.sin(t * 0.24 + 1.2) * 0.03,
      Math.sin(t * 0.32) * 0.05,
      -Math.sin(t * 0.32) * 0.22,
    );

    sd.position.set(6, 74, 470 - (t - 12) * SD_SPEED);
    sd.rotation.set(-0.035, 0.02, 0.01);

    this.trails.setThrottle(1);
    this.trails.update(t, dt);
    this.trailsSD.setThrottle(0.85);
    this.trailsSD.update(t, dt);

    // --- turbolaser barrage ---------------------------------------------
    const shots = [7.6, 8.5, 10.9, 13.2, 19.4, 21.0];
    for (let i = 0; i < shots.length; i++) {
      const st = shots[i];
      if (t >= st && !this._fired.has('s' + i)) {
        this._fired.add('s' + i);
        const from = this._tmp.set(
          sd.position.x + this.rng.range(-26, 26),
          sd.position.y - 14,
          sd.position.z - 40 + this.rng.range(-30, 30),
        ).clone();
        const to = runner.position.clone().add(new THREE.Vector3(
          this.rng.range(-14, 14), this.rng.range(-6, 6), this.rng.range(-16, 16)));
        this.beams.fire(from, to, { color: 0x39ff62, width: 0.85, duration: 0.36 });
      }
    }
    const hits = [9.4, 11.6, 14.0];
    for (let i = 0; i < hits.length; i++) {
      if (t >= hits[i] && !this._fired.has('h' + i)) {
        this._fired.add('h' + i);
        const p = runner.position.clone().add(new THREE.Vector3(
          this.rng.range(-6, 6), this.rng.range(-1, 3), this.rng.range(-10, 12)));
        this.booms.burst(p, { size: 2.6 + i * 0.5, debris: 10, smoke: true });
        this.sparks.burst(p, new THREE.Vector3(0, 1, 0), 18, {});
        ctx.rig.shake(0.55);
      }
    }

    this.beams.update(t, dt);
    this.bolts.update(t, dt);
    this.booms.update(t, dt);
    this.sparks.update(t, dt);
    this.planet.userData.update?.(t, dt);
    this.stars.userData.update?.(t, dt);

    // --- camera ----------------------------------------------------------
    if (t < 6.2) {
      // Wide on the planet, drifting; the runner is a spark crossing frame.
      const u = t / 6.2;
      ctx.rig.set(
        [40 - u * 14, 26 - u * 8, 190],
        [-40 + u * 20, -12 + u * 8, -40],
        40,
      );
    } else if (t < 15.8) {
      // Riding alongside as the barrage starts.
      const u = (t - 6.2) / 9.6;
      const p = runner.position;
      ctx.rig.set(
        [p.x + 34 - u * 8, p.y + 9 + u * 3, p.z + 46 + u * 16],
        [p.x, p.y, p.z - 22],
        38 - u * 3,
      );
      ctx.rig.handheld(0.05, 0.7);
    } else if (t < 26) {
      // The reveal: hold low and let the Destroyer slide in over the top.
      const u = (t - 15.8) / 10.2;
      const p = runner.position;
      ctx.rig.set(
        [p.x + 5, p.y - 5.5, p.z + 66 + u * 26],
        [p.x + 2, p.y + 9 + u * 22, p.z - 60],
        44 + u * 6,
      );
      ctx.rig.handheld(0.03, 0.5);
    } else {
      // Pull wide: the runner is a fleck under the Destroyer's belly.
      const u = (t - 26) / 7;
      const p = runner.position;
      ctx.rig.set(
        [p.x + 130 + u * 60, p.y + 34 + u * 14, p.z + 120 + u * 60],
        [p.x + 10, p.y + 26, p.z - 30],
        34,
      );
      ctx.rig.handheld(0.02, 0.4);
    }
  }
}
