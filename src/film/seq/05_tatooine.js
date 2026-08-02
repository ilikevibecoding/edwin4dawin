import * as THREE from 'three';
import { Sequence, ramp, ease, clamp } from '../../core/timeline.js';
import { buildDesert, buildRockFormation, buildDesertSky, buildDuneSeaHorizon, buildVaporator } from '../../world/tatooine.js';
import { buildTwinSuns } from '../../world/space.js';
import { buildR2D2, buildC3PO, buildJawa } from '../../lego/characters.js';
import { buildEscapePod, buildSandcrawler } from '../../lego/ships.js';
import { DustKick, SmokeSystem, EngineTrails, Sparks } from '../../fx/effects.js';
import { makeRng } from '../../core/rng.js';

/*
 * The dune sea.
 *
 * Hot, empty and very wide. The desert is stacked plates and slope bricks, so
 * the low sun rakes across a landscape of visible steps — which is exactly the
 * look we want.
 */
export class TatooineSequence extends Sequence {
  constructor() {
    super('tatooine', {
      duration: 32,
      fadeIn: 1.4,
      fadeOut: 1.2,
      exposure: 1.12,
      bloom: { strength: 0.5, radius: 0.6, threshold: 0.85 },
    });
    this.chapter = { t: 1.0, hold: 3.6, title: 'TATOOINE', subtitle: 'The dune sea' };
    this.cues = [
      { t: 0.0, kind: 'cue', name: 'desert' },
      { t: 0.0, kind: 'sfx', name: 'wind', opts: { duration: 31, gain: 0.34 } },
      { t: 0.4, kind: 'sfx', name: 'engine_whoosh', opts: { gain: 0.8 } },
      { t: 1.0, kind: 'vo', id: 'n07' },
      { t: 3.6, kind: 'sfx', name: 'rumble_impact', opts: { gain: 0.9 } },
      { t: 7.6, kind: 'sfx', name: 'metal_impact', opts: { gain: 0.5 } },
      { t: 8.4, kind: 'sfx', name: 'r2_beep', opts: { mood: 'happy' } },
      { t: 9.8, kind: 'vo', id: 'p03' },
      { t: 15.0, kind: 'sfx', name: 'r2_beep', opts: { mood: 'chirp' } },
      { t: 17.0, kind: 'vo', id: 'n08' },
      { t: 23.0, kind: 'sfx', name: 'r2_beep', opts: { mood: 'worried' } },
      { t: 26.0, kind: 'cue', name: 'desert', opts: { gain: 0.8, duration: 8 } },
    ];
  }

  async build(ctx) {
    const s = this.scene;
    s.background = new THREE.Color(0xd8b784);
    s.fog = new THREE.Fog(0xe3c493, 90, 620);

    this.desert = buildDesert({ size: 420, seed: 'dune-sea' });
    s.add(this.desert);
    this.h = this.desert.userData.heightAt || (() => 0);

    s.add(buildDesertSky());
    s.add(buildDuneSeaHorizon());

    const rocks = new THREE.Group();
    for (const [x, z, sc, seed] of [[-92, -140, 1.3, 'r1'], [110, -190, 1.7, 'r2'], [-160, -60, 1.0, 'r3'], [64, -300, 2.1, 'r4']]) {
      const r = buildRockFormation({ seed, size: sc });
      r.position.set(x, this.h(x, z) - 0.5, z);
      rocks.add(r);
    }
    s.add(rocks);

    const vap = buildVaporator();
    vap.position.set(-34, this.h(-34, -86), -86);
    s.add(vap);

    this.suns = buildTwinSuns({});
    s.add(this.suns);

    // Hot key from the low twin suns plus bounce off the sand.
    const key = new THREE.DirectionalLight(0xffd9a0, 3.1);
    key.position.set(-120, 90, -170);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.near = 10; key.shadow.camera.far = 460;
    key.shadow.camera.left = -110; key.shadow.camera.right = 110;
    key.shadow.camera.top = 110; key.shadow.camera.bottom = -110;
    key.shadow.bias = -0.0008;
    key.shadow.normalBias = 0.05;
    s.add(key);
    this.key = key;
    s.add(new THREE.HemisphereLight(0xffe6bd, 0xc9a877, 1.15));
    const fill = new THREE.DirectionalLight(0xffc98a, 0.6);
    fill.position.set(140, 40, 120);
    s.add(fill);

    this.pod = buildEscapePod();
    s.add(this.pod);

    this.crawler = buildSandcrawler();
    this.crawler.position.set(190, this.h(190, -330), -330);
    this.crawler.rotation.y = -0.7;
    this.crawler.scale.setScalar(1.6);
    s.add(this.crawler);

    this.jawas = [];
    for (let i = 0; i < 3; i++) {
      const j = buildJawa();
      j.position.set(150 + i * 5, this.h(150 + i * 5, -300 + i * 7), -300 + i * 7);
      j.rotation.y = -0.8;
      s.add(j);
      this.jawas.push(j);
    }

    this.r2 = buildR2D2();
    s.add(this.r2);
    this.threepio = buildC3PO();
    s.add(this.threepio);

    this.dust = new DustKick(s, {});
    this.smoke = new SmokeSystem(s, {});
    this.sparks = new Sparks(s, {});
    this.podTrail = new EngineTrails(s, { color: 0xffc070 });
    for (const e of this.pod.userData.engines || []) this.podTrail.attach(e, { radius: 0.8, length: 14 });

    this.rng = makeRng('tatooine');
    this._done = new Set();
    this.LANDING = new THREE.Vector3(-14, 0, -46);
    this.LANDING.y = this.h(this.LANDING.x, this.LANDING.z);
  }

  enter(ctx) {
    ctx.rig.reset();
    this._done.clear();
  }

  update(t, dt, ctx) {
    const L = this.LANDING;

    // --- descent and touchdown -------------------------------------------
    const d = clamp(t / 3.6);
    if (t < 3.6) {
      const e = ease('in', d);
      this.pod.position.set(L.x + 180 * (1 - e), L.y + 170 * (1 - e), L.z + 230 * (1 - e));
      this.pod.rotation.set(-0.6 + e * 0.5, -0.9, Math.sin(t * 3) * 0.1);
      this.podTrail.setThrottle(1);
    } else {
      this.pod.position.set(L.x, L.y + 0.35, L.z);
      this.pod.rotation.set(0.12, -0.9, 0.06);
      this.podTrail.setThrottle(0);
      if (!this._done.has('land')) {
        this._done.add('land');
        for (let i = 0; i < 26; i++) {
          this.dust.kick(new THREE.Vector3(L.x + this.rng.range(-9, 9), L.y + 0.4, L.z + this.rng.range(-9, 9)),
            { amount: 1.5 });
        }
        ctx.rig.shake(1.1);
      }
    }
    this.podTrail.update(t, dt);

    // --- the droids set off ------------------------------------------------
    const walkT = Math.max(0, t - 8.0);
    const speed = 2.35;
    const dirA = new THREE.Vector3(0.92, 0, 0.39).normalize();

    const r2p = new THREE.Vector3().copy(L).addScaledVector(dirA, 5 + walkT * speed * 0.86);
    r2p.y = this.h(r2p.x, r2p.z);
    this.r2.position.copy(r2p);
    this.r2.rotation.y = Math.atan2(dirA.x, dirA.z) + Math.PI;
    this.r2.userData.update?.(t, dt);

    const splitT = Math.max(0, t - 21.0);
    const dirB = new THREE.Vector3(0.62, 0, 0.78).normalize();
    const tp = new THREE.Vector3().copy(L).addScaledVector(dirA, 3.4 + Math.min(walkT, 13) * speed * 0.82);
    if (splitT > 0) tp.addScaledVector(dirB, splitT * 1.9);
    tp.y = this.h(tp.x, tp.z);
    this.threepio.position.copy(tp);
    this.threepio.rotation.y = Math.atan2(splitT > 0 ? dirB.x : dirA.x, splitT > 0 ? dirB.z : dirA.z) + Math.PI;
    if (t > 8.2) this.threepio.userData.walk?.(t, 0.62, { amp: 0.44 });
    this.threepio.userData.update?.(t, dt);

    // A puff of sand at every footfall.
    if (t > 8.2 && Math.floor(t * 4) !== this._lastStep) {
      this._lastStep = Math.floor(t * 4);
      this.dust.kick(tp.clone().add(new THREE.Vector3(0, 0.1, 0)), { amount: 0.32 });
      this.dust.kick(r2p.clone().add(new THREE.Vector3(0, 0.1, 0)), { amount: 0.24 });
    }

    this.crawler.userData.update?.(t, dt);
    this.dust.update(t, dt);
    this.smoke.update(t, dt);
    this.sparks.update(t, dt);
    this.suns.userData.update?.(t, dt);

    // --- camera --------------------------------------------------------------
    if (t < 4.4) {
      // Track the pod in, then whip-pan with the impact.
      const p = this.pod.position;
      ctx.rig.set([L.x + 46, L.y + 26, L.z + 62], [p.x, p.y, p.z], 40);
      ctx.rig.handheld(0.05, 0.9);
    } else if (t < 8.6) {
      const u = (t - 4.4) / 4.2;
      ctx.rig.set([L.x + 15 - u * 3, L.y + 4.2, L.z + 17 + u * 3], [L.x, L.y + 2.2, L.z], 42 - u * 6);
      ctx.rig.handheld(0.02, 0.5);
    } else if (t < 15.4) {
      // Low, in the sand, watching them walk past.
      const u = (t - 8.6) / 6.8;
      const p = this.threepio.position;
      ctx.rig.set([p.x + 9 - u * 2, this.h(p.x + 9, p.z + 5) + 1.1, p.z + 7], [p.x + 1.2, 2.6, p.z], 38);
      ctx.rig.handheld(0.015, 0.4);
    } else if (t < 22.6) {
      // Tracking wide, suns in frame.
      const u = (t - 15.4) / 7.2;
      const p = this.threepio.position;
      ctx.rig.set([p.x - 24, this.h(p.x - 24, p.z + 20) + 7 + u * 2, p.z + 22], [p.x + 6, 3.4, p.z - 4], 44);
      ctx.rig.handheld(0.02, 0.4);
    } else {
      // Crane out: two specks and a lot of sand.
      const u = (t - 22.6) / 9.4;
      const p = this.r2.position;
      ctx.rig.set(
        [p.x - 30 - u * 40, 12 + ease('inout', u) * 62, p.z + 34 + u * 62],
        [p.x + 14, 2, p.z - 10],
        40,
      );
      ctx.rig.handheld(0.012, 0.3);
    }
  }
}
