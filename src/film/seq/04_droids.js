import * as THREE from 'three';
import { Sequence, ramp, ease, clamp } from '../../core/timeline.js';
import { buildCorridor, buildCorridorLighting } from '../../world/corridor.js';
import { buildR2D2, buildC3PO, buildLeia } from '../../lego/characters.js';
import { buildTantiveIV, buildEscapePod, buildStarDestroyer } from '../../lego/ships.js';
import { buildStarfield, buildTatooinePlanet, buildSpaceLighting } from '../../world/space.js';
import { Hologram, EngineTrails, Sparks, SmokeSystem, buildHoloBeam } from '../../fx/effects.js';
import { makeRng } from '../../core/rng.js';

/*
 * The couriers.
 *
 * Two acts in one sequence: a hurried handoff below decks, then the pod punching
 * out into space. The scene keeps both sets and cuts between them by moving the
 * camera, which is cheaper than swapping scenes and lets the audio run through.
 */
export class DroidsSequence extends Sequence {
  constructor() {
    super('droids', {
      duration: 32,
      fadeIn: 0.9,
      fadeOut: 0.8,
      exposure: 1.03,
      bloom: { strength: 0.7, radius: 0.6, threshold: 0.7 },
    });
    this.chapter = { t: 0.7, hold: 3.2, title: 'THE COURIERS', subtitle: 'Two droids and a secret' };
    this.cues = [
      { t: 0.0, kind: 'cue', name: 'droids' },
      { t: 0.6, kind: 'vo', id: 'n05' },
      { t: 1.2, kind: 'sfx', name: 'r2_beep', opts: { mood: 'worried' } },
      { t: 3.4, kind: 'sfx', name: 'c3po_servo', opts: { gain: 0.5 } },
      { t: 7.3, kind: 'sfx', name: 'hologram_hum', opts: { duration: 9, gain: 0.55 } },
      { t: 8.0, kind: 'vo', id: 'l01' },
      { t: 12.4, kind: 'sfx', name: 'r2_beep', opts: { mood: 'chirp' } },
      { t: 13.2, kind: 'vo', id: 'p01' },
      { t: 17.4, kind: 'vo', id: 'p02' },
      { t: 17.6, kind: 'sfx', name: 'r2_beep', opts: { mood: 'alarm' } },
      { t: 21.4, kind: 'sfx', name: 'console_beep', opts: {} },
      { t: 22.6, kind: 'cue', name: 'chase', opts: { gain: 0.75 } },
      { t: 23.0, kind: 'sfx', name: 'pod_launch', opts: { gain: 1.0 } },
      { t: 23.4, kind: 'vo', id: 'n06' },
      { t: 24.2, kind: 'sfx', name: 'engine_whoosh', opts: { gain: 0.7 } },
    ];
  }

  async build(ctx) {
    const s = this.scene;
    s.background = new THREE.Color(0x03050a);

    // --- interior set (around z = 0) -------------------------------------
    this.interior = new THREE.Group();
    const corridor = buildCorridor({ sections: 4 });
    this.interior.add(corridor);
    this.interior.add(buildCorridorLighting());
    s.add(this.interior);

    this.r2 = buildR2D2();
    this.r2.position.set(1.4, 0, -6);
    this.r2.rotation.y = Math.PI * 0.92;
    this.interior.add(this.r2);

    this.threepio = buildC3PO();
    this.threepio.position.set(-1.9, 0, -8.4);
    this.threepio.rotation.y = Math.PI * 0.86;
    this.interior.add(this.threepio);

    this.leia = buildLeia();
    this.leia.position.set(3.0, 0, -10.5);
    this.leia.rotation.y = Math.PI * 1.22;
    this.interior.add(this.leia);

    // The plans, projected out of R2's dome.
    this.holoSource = buildDataCore();
    this.holo = new Hologram(this.holoSource, { color: 0x7fd0ff, scale: 1.0 });
    this.holo.group.position.set(1.4, 4.6, -6);
    this.holo.group.visible = false;
    this.interior.add(this.holo.group);
    this.holoBeam = buildHoloBeam(new THREE.Vector3(1.4, 3.1, -6), 1.7, 0.85);
    this.holoBeam.visible = false;
    this.interior.add(this.holoBeam);

    // --- exterior set (far away, around z = -900) -------------------------
    this.exterior = new THREE.Group();
    this.exterior.position.set(0, 400, -900);
    s.add(this.exterior);

    this.stars = buildStarfield({ count: 2200, radius: 2600 });
    this.exterior.add(this.stars);
    this.planet = buildTatooinePlanet({ radius: 380 });
    this.planet.position.set(30, -430, -520);
    this.exterior.add(this.planet);
    this.exterior.add(buildSpaceLighting(this.exterior));

    this.ship = buildTantiveIV();
    this.ship.position.set(-6, 0, 0);
    this.ship.rotation.y = 0.35;
    this.exterior.add(this.ship);

    this.destroyer = buildStarDestroyer();
    this.destroyer.position.set(40, 70, 300);
    this.destroyer.rotation.set(-0.04, 0.1, 0.02);
    this.exterior.add(this.destroyer);

    this.pod = buildEscapePod();
    this.exterior.add(this.pod);

    this.podTrail = new EngineTrails(this.exterior, { color: 0xffd9a0 });
    for (const e of this.pod.userData.engines || []) this.podTrail.attach(e, { radius: 0.7, length: 12 });
    this.shipTrail = new EngineTrails(this.exterior, { color: 0x9fd8ff });
    for (const e of this.ship.userData.engines || []) this.shipTrail.attach(e, { radius: 1.0, length: 20 });

    this.sparks = new Sparks(s, {});
    this.smoke = new SmokeSystem(s, {});
    this.rng = makeRng('droids');
    this._done = new Set();
  }

  enter(ctx) {
    ctx.rig.reset();
    this._done.clear();
  }

  update(t, dt, ctx) {
    const INTERIOR_END = 21.6;

    // --- interior performance --------------------------------------------
    if (t < INTERIOR_END + 1) {
      // R2 rolls up, waits, then scurries for the pod.
      const rollIn = clamp((t - 0.4) / 3.2);
      const scurry = clamp((t - 16.6) / 5.0);
      this.r2.position.z = -6 - ease('inout', rollIn) * 2.4 + ease('in', scurry) * 26;
      this.r2.position.x = 1.4 - scurry * 1.0;
      this.r2.userData.update?.(t, dt);
      if (scurry > 0 && scurry < 1) this.r2.rotation.y = Math.PI * 0.92 + scurry * 0.5;

      const step = clamp((t - 1.0) / 3.6);
      this.threepio.position.z = -8.4 + ease('inout', step) * 2.0 + ease('in', clamp((t - 18.4) / 3.4)) * 22;
      this.threepio.position.x = -1.9 + clamp((t - 18.4) / 3.4) * 0.6;
      if (t < 12 || t > 18.4) this.threepio.userData.walk?.(t, 0.5, { amp: 0.4 });
      else {
        // Flailing while he complains.
        const f = Math.sin(t * 6.2);
        this.threepio.userData.pose?.({
          armL: 0.5 + f * 0.55, armR: 0.5 - f * 0.55, elbowL: 1.0, elbowR: 1.0,
          headTurn: Math.sin(t * 2.1) * 0.35, lean: -0.08,
        });
      }
      this.threepio.userData.update?.(t, dt);

      const kneel = clamp((t - 5.4) / 1.6) * (1 - clamp((t - 15.0) / 1.6));
      this.leia.position.y = -kneel * 0.75;
      this.leia.userData.pose?.({
        armR: 0.35 + kneel * 0.9, elbowR: 0.4 + kneel * 0.6,
        armL: 0.1, elbowL: 0.5, lean: kneel * 0.28,
        headTilt: kneel * 0.16,
      });
      this.leia.userData.update?.(t, dt);

      const holoOn = t > 7.2 && t < 16.4;
      this.holo.group.visible = holoOn;
      this.holoBeam.visible = holoOn;
      if (holoOn) {
        this.holo.group.position.z = this.r2.position.z;
        this.holo.group.position.x = this.r2.position.x;
        this.holoBeam.position.set(this.r2.position.x, 3.1, this.r2.position.z);
        this.holo.setIntensity?.(Math.min(ramp(t, 7.2, 8.0), 1 - ramp(t, 15.4, 16.4)));
        this.holo.update(t, dt);
      }
    }

    // --- exterior: the pod punches out -----------------------------------
    const pt = t - 22.6;
    if (pt > -1) {
      const u = clamp(pt / 9.4);
      this.pod.position.set(
        -14 - ease('in', u) * 90,
        -3 - ease('in', u) * 26,
        6 + ease('in', u) * 210,
      );
      this.pod.rotation.set(0.2 + u * 0.1, -0.5 - u * 0.35, Math.sin(pt * 2.2) * 0.12);
      this.podTrail.setThrottle(clamp(pt * 2));
      this.podTrail.update(t, dt);
      if (pt > 0 && !this._done.has('launch')) {
        this._done.add('launch');
        ctx.rig.shake(0.5);
      }
    } else {
      this.pod.position.set(-14, -3, 6);
    }
    this.shipTrail.setThrottle(0.5);
    this.shipTrail.update(t, dt);
    this.planet.userData.update?.(t, dt);
    this.sparks.update(t, dt);
    this.smoke.update(t, dt);

    // --- camera ------------------------------------------------------------
    if (t < 5.2) {
      const u = t / 5.2;
      ctx.rig.set([5.4 - u * 1.6, 3.6, 3.2 - u * 1.4], [1.0, 2.6, -8], 42);
      ctx.rig.handheld(0.03, 0.7);
    } else if (t < 12.2) {
      // Close on the handoff and the hologram.
      const u = (t - 5.2) / 7;
      ctx.rig.set([4.0 - u * 0.6, 4.6 - u * 0.3, -0.6 - u * 0.8], [2.0, 4.0, -7.4], 34 - u * 4);
      ctx.rig.handheld(0.016, 0.5);
    } else if (t < 17.0) {
      const u = (t - 12.2) / 4.8;
      ctx.rig.set([-4.4, 3.6, -2.2 - u * 1.2], [-1.2, 3.6, -8.6], 40);
      ctx.rig.handheld(0.03, 0.9);
    } else if (t < 21.6) {
      // Chasing them down the corridor.
      const u = (t - 17) / 4.6;
      const z = this.r2.position.z;
      ctx.rig.set([0.8, 2.6, z + 12 - u * 2], [this.r2.position.x, 2.0, z - 4], 46);
      ctx.rig.handheld(0.05, 1.4);
    } else {
      // Outside, watching the pod go.
      const u = clamp((t - 21.6) / 10.4);
      const e = this.exterior.position;
      const p = this.pod.position;
      ctx.rig.set(
        [e.x + 46 + u * 30, e.y + 16 + u * 6, e.z + 70 + u * 40],
        [e.x + p.x * 0.5, e.y + p.y * 0.5, e.z + p.z * 0.4],
        40,
      );
      ctx.rig.handheld(0.02, 0.4);
    }
  }
}

/** A small brick-built "data core" that the hologram is projected from. */
function buildDataCore() {
  const g = new THREE.Group();
  const geo = new THREE.IcosahedronGeometry(0.9, 1);
  const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true });
  const core = new THREE.Mesh(geo, mat);
  g.add(core);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.35, 0.05, 6, 28), mat);
  ring.rotation.x = Math.PI / 2;
  g.add(ring);
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.04, 6, 24), mat);
  ring2.rotation.y = Math.PI / 3;
  g.add(ring2);
  return g;
}
