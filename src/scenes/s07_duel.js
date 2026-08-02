// Sequence 7 -- the duel. Two old men and a hangar the size of a cathedral.

import * as THREE from 'three';
import { makeStage } from '../core/film.js';
import { music, vo, sfx } from './kit.js';
import { hangarBay } from '../models/station.js';
import { tieFighter } from '../models/fighters.js';
import { freighter } from '../models/civilian.js';
import { crates } from '../models/props.js';
import { vashek, robedFigure, hero, stormtrooper, lightsaber, idle, walk } from '../models/chars.js';
import { SparkPool } from '../fx/combat.js';
import { CameraRig } from '../core/camera.js';
import { starfield } from '../worlds/space.js';
import { clamp, lerp, smoothstep, Ease } from '../util/math.js';
import { RNG } from '../util/rng.js';

const DURATION = 36;
const IGNITE_T = 13.4;
const KILL_T = 29.6;

// Clash beats: [time, height, side] -- the choreography is a list.
const CLASHES = [
  [15.0, 1.9, 0.6], [15.9, 1.5, -0.7], [16.7, 2.15, 0.2],
  [18.2, 1.35, -0.5], [19.1, 2.0, 0.8], [20.4, 1.6, -0.2],
  [22.3, 2.2, 0.5], [23.4, 1.4, -0.8], [24.6, 1.85, 0.3],
  [26.2, 2.05, -0.4], [27.3, 1.55, 0.7],
];

export default {
  id: 'duel',
  duration: DURATION,
  fadeIn: 1.2,
  fadeOut: 1.6,
  cues: [
    music('duel', 1.0, { gain: 0.95 }),
    sfx('roomTone', 0, { dur: 35, vel: 0.8, freq: 48 }),
    vo('n14', 1.0),
    sfx('breath', 6.2, { vel: 0.9 }),
    vo('v3', 7.4),
    vo('ob3', 10.4),
    sfx('saberIgnite', IGNITE_T, { vel: 1.0 }),
    sfx('saberIgnite', IGNITE_T + 0.45, { vel: 1.0 }),
    sfx('saberHum', IGNITE_T + 0.3, { dur: 16.5, vel: 0.55, base: 104 }),
    sfx('saberHum', IGNITE_T + 0.7, { dur: 16, vel: 0.5, base: 78 }),
    ...CLASHES.flatMap(([t]) => [sfx('saberSwing', t - 0.34, { vel: 0.7 }), sfx('saberClash', t, { vel: 0.95 })]),
    vo('v4', 17.4),
    vo('ob4', 21.4),
    sfx('breath', 25.2, { vel: 0.85 }),
    vo('n15', 27.6),
    sfx('saberSwing', KILL_T - 0.4, { vel: 1.0 }),
    sfx('saberClash', KILL_T, { vel: 0.7 }),
    sfx('clang', KILL_T + 0.25, { vel: 0.4 }),
    vo('r3', KILL_T + 0.9),
  ],

  build() {
    const { scene, camera } = makeStage({
      background: 0x05070c,
      fog: new THREE.Fog(0x0a1018, 60, 260),
      fov: 42, near: 0.05, far: 4000,
    });
    scene.add(camera);

    const bay = hangarBay({ width: 100, height: 36, depth: 150 });
    scene.add(bay);
    // Stars through the containment field.
    const sky = starfield({ count: 700, radius: 2600, size: 2.4 });
    sky.position.set(0, 16, 400);
    scene.add(sky);

    // Set dressing: parked TIEs, the freighter, crates.
    for (let i = 0; i < 3; i++) {
      const tie = tieFighter({ scale: 1.5 });
      tie.position.set(-34 + i * 5, 5.6, -46 + i * 22);
      tie.rotation.y = Math.PI * (0.5 + i * 0.02);
      scene.add(tie);
    }
    const ship = freighter({ scale: 0.9 });
    ship.position.set(30, 5.4, 34);
    ship.rotation.y = -1.9;
    ship.userData.setGear(true);
    ship.userData.setThrottle(0.05);
    scene.add(ship);
    const cr = crates({ count: 12, seed: 8, scale: 2.2 });
    cr.position.set(-30, 0, 18);
    scene.add(cr);

    for (let i = 0; i < 6; i++) {
      const s = stormtrooper({ height: 1.83 });
      s.position.set(-16 + i * 6.4, 0, -34 - (i % 2) * 3);
      s.rotation.y = Math.PI * 0.02;
      scene.add(s);
    }

    // The duellists.
    const lord = vashek({ height: 2.06 });
    scene.add(lord);
    const old = robedFigure({ height: 1.8, color: 0x8f7a58 });
    scene.add(old);
    const girl = hero({ height: 1.66 });
    girl.position.set(19, 0, 30);
    girl.rotation.y = -2.3;
    scene.add(girl);

    const redBlade = lightsaber({ color: 0xff3524, length: 1.32 });
    const blueBlade = lightsaber({ color: 0x49b6ff, length: 1.24 });
    // Sabers live in the right hand, pointing out of the fist.
    lord.userData.rig.arms[1].hand.add(redBlade);
    redBlade.position.set(0, -0.08, 0.05);
    redBlade.rotation.x = Math.PI * 0.5;
    old.userData.rig.arms[1].hand.add(blueBlade);
    blueBlade.position.set(0, -0.08, 0.05);
    blueBlade.rotation.x = Math.PI * 0.5;

    const sparks = new SparkPool({ bursts: 12, per: 26, size: 0.1, color: 0xffe0a0 });
    scene.add(sparks.group);
    for (const [t, y, side] of CLASHES) {
      sparks.schedule(t, new THREE.Vector3(side * 0.55, y, 12 - (t - 15) * 0.35), { speed: 3.4, dur: 0.4, gravity: 3 });
    }

    const clashLight = new THREE.PointLight(0xffd8a0, 0, 22, 2);
    scene.add(clashLight);

    // Lighting: hangar practicals plus a cold spill from the opening.
    scene.add(new THREE.AmbientLight(0x36485f, 2.6));
    const spill = new THREE.DirectionalLight(0x9fc4ff, 1.3);
    spill.position.set(0, 20, 200);
    scene.add(spill);
    const overhead = new THREE.DirectionalLight(0xffeccc, 2.0);
    overhead.position.set(10, 60, -20);
    scene.add(overhead);

    const rig = new CameraRig(camera);
    for (const [t] of CLASHES) rig.impulse(t, 0.25, 0.28);
    rig.impulse(KILL_T, 0.7, 1.0);

    // Positions: they circle a point on the deck.
    const centre = new THREE.Vector3(0, 0, 12);
    const posOf = (t, sign) => {
      const circle = clamp((t - IGNITE_T) / 16) * 0.9;
      const a = sign * (Math.PI / 2) + circle * 1.5 * sign;
      const r = 1.35;
      return new THREE.Vector3(centre.x + Math.cos(a) * r * 1.05, 0, centre.z + Math.sin(a) * r);
    };

    const bladeTip = new THREE.Vector3();

    rig.setTrack([
      // Shot 1: the hangar, wide and cold.
      { t: 0, pos: [-40, 21, 92], look: [4, 9, -20], fov: 46 },
      { t: 6.0, pos: [-26, 15, 74], look: [2, 7, -14], fov: 42, ease: Ease.inOutQuad },
      // Shot 2: low two-shot as they trade words.
      { t: 6.001, cut: true, pos: [8.5, 1.25, 22.5], look: () => new THREE.Vector3(0, 1.5, 11), fov: 40 },
      { t: 13.2, pos: [7.0, 1.35, 20.0], look: () => new THREE.Vector3(0, 1.55, 11.4), fov: 38, ease: Ease.linear },
      // Shot 3: the duel, tracking around them.
      { t: 13.201, cut: true, pos: (t) => new THREE.Vector3(Math.sin(t * 0.16) * 7.6, 2.4, 12 + Math.cos(t * 0.16) * 7.6), look: () => new THREE.Vector3(0, 1.7, 12), fov: 44 },
      { t: 21.4, pos: (t) => new THREE.Vector3(Math.sin(t * 0.16) * 6.4, 2.1, 12 + Math.cos(t * 0.16) * 6.4), look: () => new THREE.Vector3(0, 1.7, 12), fov: 42, ease: Ease.linear },
      // Shot 4: tighter, from the deck.
      { t: 21.401, cut: true, pos: [-5.6, 0.7, 16.5], look: () => new THREE.Vector3(0, 1.6, 12), fov: 40 },
      { t: 27.4, pos: [-4.4, 0.85, 15.2], look: () => new THREE.Vector3(0, 1.7, 12), fov: 38, ease: Ease.linear },
      // Shot 5: the strike, from behind the girl.
      { t: 27.401, cut: true, pos: [13.5, 1.55, 24], look: () => new THREE.Vector3(0.4, 1.5, 12), fov: 34 },
      { t: DURATION, pos: [11.5, 1.5, 21.5], look: () => new THREE.Vector3(0.2, 1.1, 12), fov: 32, ease: Ease.inOutQuad },
    ]);

    // Which clash are we between, and how far through?
    function clashPhase(t) {
      let i = -1;
      for (let k = 0; k < CLASHES.length; k++) if (t >= CLASHES[k][0] - 0.55) i = k;
      const cur = CLASHES[Math.max(0, i)];
      const next = CLASHES[Math.min(CLASHES.length - 1, i + 1)];
      return { i, cur, next };
    }

    return {
      scene,
      camera,
      bloom: 1.05,

      update(t, dt) {
        const lp = posOf(t, 1);
        const op = posOf(t, -1);
        lord.position.copy(lp);
        old.position.copy(op);
        lord.rotation.y = Math.atan2(op.x - lp.x, op.z - lp.z);
        old.rotation.y = Math.atan2(lp.x - op.x, lp.z - op.z);
        lord.userData.swayCape(t, 1);

        // Entrance: the old man walks in before the blades come out.
        if (t < 6) {
          old.position.z = lerp(38, op.z, smoothstep(0, 6, t));
          old.position.x = lerp(6, op.x, smoothstep(0, 6, t));
          old.rotation.y = Math.PI * 0.96;
          walk(old.userData.rig, t * 3.2, { stride: 0.34, arms: 0.2 });
        }

        const ignite = clamp((t - IGNITE_T) / 0.45);
        const ignite2 = clamp((t - IGNITE_T - 0.45) / 0.45);
        redBlade.userData.setExtend(ignite * (1 - smoothstep(KILL_T + 1.6, KILL_T + 2.4, t)));
        blueBlade.userData.setExtend(ignite2 * (1 - smoothstep(KILL_T - 0.05, KILL_T + 0.12, t)));

        const fighting = t > IGNITE_T && t < KILL_T;
        if (t < IGNITE_T) {
          idle(lord.userData.rig, t * 0.7, { amount: 0.5 });
          if (t >= 6) idle(old.userData.rig, t * 0.8, { amount: 0.7 });
          lord.userData.rig.arms[1].shoulder.rotation.x = -0.25;
          lord.userData.rig.arms[1].elbow.rotation.x = -0.5;
          old.userData.rig.arms[1].shoulder.rotation.x = -0.25;
          old.userData.rig.arms[1].elbow.rotation.x = -0.5;
        } else if (fighting) {
          const { cur, next } = clashPhase(t);
          const from = cur[0];
          const to = next[0] > from ? next[0] : from + 1.2;
          const u = clamp((t - from) / (to - from));
          // Swing away from the last clash, then in to the next.
          const swing = Math.sin(u * Math.PI);
          const targetY = lerp(cur[1], next[1], u);
          const targetX = lerp(cur[2], next[2], u);
          for (const [who, s] of [[lord, 1], [old, -1]]) {
            const r = who.userData.rig;
            const high = clamp((targetY - 1.2) / 1.1);
            r.arms[1].shoulder.rotation.x = lerp(-0.5, -2.5, high) - swing * 0.7;
            r.arms[1].shoulder.rotation.z = -s * targetX * 0.5 - s * swing * 0.35;
            r.arms[1].elbow.rotation.x = -0.35 - swing * 0.5;
            r.arms[0].shoulder.rotation.x = -0.6 + swing * 0.3;
            r.torso.rotation.y = -s * targetX * 0.18;
            r.torso.rotation.x = 0.06 + swing * 0.08;
            r.hips.position.y = r.unit * (0.98 - swing * 0.06);
            r.legs[0].hip.rotation.x = 0.28 - swing * 0.2;
            r.legs[1].hip.rotation.x = -0.22 + swing * 0.2;
            r.legs[0].knee.rotation.x = 0.2;
            r.legs[1].knee.rotation.x = 0.3;
          }
          // Clash flash.
          let flashAmt = 0;
          for (const [ct, cy, cx] of CLASHES) {
            const d = Math.abs(t - ct);
            if (d < 0.3) {
              flashAmt = Math.max(flashAmt, 1 - d / 0.3);
              clashLight.position.set(cx * 0.55, cy, 12 - (ct - 15) * 0.35);
            }
          }
          clashLight.intensity = flashAmt * 34;
        } else {
          // The killing blow, and the empty robe.
          const k = clamp((t - (KILL_T - 1.6)) / 1.6);
          const rr = old.userData.rig;
          rr.arms[1].shoulder.rotation.x = lerp(-0.4, -2.6, smoothstep(0, 0.6, k));
          rr.arms[1].shoulder.rotation.z = 0;
          rr.arms[1].elbow.rotation.x = -0.2;
          rr.arms[0].shoulder.rotation.x = -0.2;
          rr.torso.rotation.set(0, 0, 0);
          const lr = lord.userData.rig;
          const strike = clamp((t - (KILL_T - 0.45)) / 0.45);
          lr.arms[1].shoulder.rotation.x = lerp(-2.4, -0.1, Ease.inQuad(strike));
          lr.arms[1].shoulder.rotation.z = lerp(-0.7, 0.5, strike);
          lr.arms[1].elbow.rotation.x = -0.3;
          clashLight.intensity = 0;
          // The robe collapses.
          const fall = clamp((t - KILL_T) / 1.1);
          old.scale.set(1, lerp(1, 0.16, Ease.inQuad(fall)), 1);
          old.position.y = lerp(0, -0.02, fall);
          old.rotation.z = fall * 0.2;
          if (fall > 0.98) old.visible = false;
        }

        // The girl watches, then reacts.
        idle(girl.userData.rig, t * 0.9);
        const react = smoothstep(KILL_T, KILL_T + 0.5, t);
        girl.userData.rig.arms[0].shoulder.rotation.x = -react * 1.2;
        girl.userData.rig.arms[1].shoulder.rotation.x = -react * 1.1;
        girl.position.x = lerp(19, 15.5, smoothstep(KILL_T, KILL_T + 3, t));

        sparks.update(t);
        rig.update(t);
      },

      dispose() {},
    };
  },
};
