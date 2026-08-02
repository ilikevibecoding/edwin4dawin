import * as THREE from 'three';
import { ShotList } from '../engine/camera.js';
import { tryMake, setupScene } from './_kit.js';
import { BoltPool, Explosions, SpritePool, flashTexture, smokeTexture, Motes } from '../engine/effects.js';
import { C } from '../lego/palette.js';
import { ramp, env, ease, clamp, lerp } from '../engine/util.js';
import { RNG } from '../engine/rng.js';
import { FIG } from '../lego/minifig.js';

/*
 * Chapter 3 -- the corridor.
 * Tight, dark, red-lit. The camera stays at minifig height so the corridor
 * feels long and the man who walks through the smoke feels tall.
 */

const CORRIDOR_LEN = 120;

export default {
  id: 'boarding',
  dur: 41,
  async build(ctx) {
    const root = new THREE.Group();
    const rng = new RNG(5150);
    const rig = setupScene(ctx, 'dark', {
      background: 0x05070b, envIntensity: 0.18,
      fog: [0x06080d, 30, 190],
    });

    const corridor = await tryMake('corridor', { length: CORRIDOR_LEN }, { size: [22, 16, CORRIDOR_LEN], color: C.lightBluishGray });
    root.add(corridor);

    // red alert wash + a warm key from the blown doorway
    const alertL = new THREE.PointLight(0xff3020, 0, 60, 2);
    alertL.position.set(0, 11, -20);
    const alertR = new THREE.PointLight(0xff3020, 0, 60, 2);
    alertR.position.set(0, 11, -70);
    const doorGlow = new THREE.PointLight(0xffd0a0, 0, 90, 2);
    doorGlow.position.set(0, 7, -CORRIDOR_LEN * 0.46);
    root.add(alertL, alertR, doorGlow);

    // ---- cast -----------------------------------------------------------
    const rebels = [];
    for (let i = 0; i < 4; i++) {
      const r = await tryMake('rebeltrooper', {}, { size: [1.6, 5, 1] , color: C.sandBlue });
      const x = [-4.2, -1.6, 1.8, 4.4][i];
      r.position.set(x, 0, 22 + (i % 2) * 5);
      r.rotation.y = Math.PI;               // facing -Z, down the corridor
      r.userData.fig?.setPose(i % 2 ? 'aim' : 'hold_two');
      root.add(r);
      rebels.push(r);
    }

    const troopers = [];
    for (let i = 0; i < 6; i++) {
      const s = await tryMake('stormtrooper', {}, { size: [1.6, 5, 1], color: C.white });
      s.position.set([-3.6, 0.2, 3.4, -5.2, 2.0, 5.4][i], 0, -CORRIDOR_LEN * 0.42 - i * 3);
      s.userData.fig?.setPose('aim');
      root.add(s);
      troopers.push(s);
    }

    const vader = await tryMake('vader', {}, { size: [2, 5.6, 1.2], color: C.black });
    vader.position.set(0, 0, -CORRIDOR_LEN * 0.46);
    root.add(vader);
    const vaderFig = vader.userData.fig;

    const officer = await tryMake('imperialofficer', {}, { size: [1.6, 5, 1], color: C.darkGreen });
    officer.position.set(2.4, 0, -6);
    officer.rotation.y = Math.PI * 0.86;
    root.add(officer);

    // ---- effects ---------------------------------------------------------
    const redBolts = new BoltPool(ctx.scene, { max: 46, color: C.transRed, core: 0xffdcd6, radius: 0.10, length: 2.6, speed: 95 });
    const grnBolts = new BoltPool(ctx.scene, { max: 30, color: C.transGreen, core: 0xdcffd6, radius: 0.10, length: 2.6, speed: 95 });
    const boom = new Explosions(ctx.scene, { seed: 77, colors: [C.white, C.lightBluishGray, C.darkBluishGray] });
    const smoke = new SpritePool(ctx.scene, { max: 60, texture: smokeTexture(), additive: false, color: 0x3a3f48 });
    const sparks = new SpritePool(ctx.scene, { max: 60, texture: flashTexture() });
    const motes = new Motes(ctx.scene, { count: 140, box: [20, 14, CORRIDOR_LEN], size: 0.07, color: 0xffd9b0, seed: 12, speed: 0.35 });
    motes.points.position.z = -CORRIDOR_LEN * 0.1;

    // ---- beats -----------------------------------------------------------
    const b1 = ctx.cue('b1', 1.0);
    const BLOW = ctx.cueEnd('b1', 5.2) + 0.35;
    const b2 = ctx.cue('b2', BLOW + 3.4);
    const VADER_IN = b2 - 0.9;
    const b3 = ctx.cue('b3', VADER_IN + 6.0);
    const b4 = ctx.cue('b4', b3 + 4.5);
    const b5 = ctx.cue('b5', b4 + 5.0);
    const LIFT = b4 + 0.8;

    const shots = new ShotList();
    // 1. looking down the corridor at the sealed blast door
    shots.add({
      t: 0, dur: BLOW - 0.15, fov: 44, ease: 'linear',
      pos: [1.4, 4.6, 44], to: [0.6, 4.4, 34],
      look: [0, 5.2, -CORRIDOR_LEN * 0.45], handheld: 0.35,
    });
    // 2. the breach, from behind the rebel line
    shots.add({
      t: BLOW - 0.15, dur: (VADER_IN - 1.4) - (BLOW - 0.15), fov: 52,
      pos: [-2.6, 3.2, 27], to: [-1.2, 3.6, 19],
      look: [0, 5, -30], shake: (u) => 0.9 * Math.exp(-u * 5) + 0.22, handheld: 0.5,
    });
    // 3. low, tilting up as he steps through
    shots.add({
      t: VADER_IN - 1.4, dur: (b3 - 0.6) - (VADER_IN - 1.4), fov: 40, ease: 'outCubic',
      pos: [1.0, 2.4, 6], to: [0.6, 3.4, 12],
      look: () => vader.position.clone().add(new THREE.Vector3(0, 3.0, 0)),
      lookTo: () => vader.position.clone().add(new THREE.Vector3(0, 5.4, 0)),
      handheld: 0.28,
    });
    // 4. over-shoulder on the officer as Vader closes
    shots.add({
      t: b3 - 0.6, dur: (LIFT) - (b3 - 0.6), fov: 34, ease: 'linear',
      pos: [5.4, 5.6, -3.0], to: [4.8, 5.7, -4.6],
      look: () => vader.position.clone().add(new THREE.Vector3(0, 4.6, 0)),
      handheld: 0.3,
    });
    // 5. the lift
    shots.add({
      t: LIFT, dur: (b5 - 0.5) - LIFT, fov: 38, ease: 'inOutQuad',
      pos: [-5.4, 4.2, -5.5], to: [-6.6, 5.6, -8.4],
      look: () => officer.position.clone().add(new THREE.Vector3(0, 3.2, 0)),
      handheld: 0.35,
    });
    // 6. push in on the mask
    shots.add({
      t: b5 - 0.5, dur: ctx.dur - (b5 - 0.5), fov: 30, ease: 'outQuad',
      pos: [0.9, 5.9, -7.6], to: [0.5, 5.85, -10.0],
      look: () => vader.position.clone().add(new THREE.Vector3(0, 5.2, 0)),
      handheld: 0.22,
    });

    // deterministic firefight
    const fire = [];
    for (let t = BLOW + 0.25; t < VADER_IN - 0.8; t += 0.16) {
      fire.push({ t, imperial: rng.next() < 0.62, lane: rng.int(0, 5) });
    }
    let idx = 0, lastT = -1;
    const downAt = BLOW + 2.1;

    return {
      root,
      shots,
      grade: { uVignette: 0.5, uGrain: 0.045, uAberration: 0.0018, uContrast: 1.09 },
      update(t, dt) {
        if (t < lastT) idx = 0;
        lastT = t;

        // alert lighting
        const alert = 0.5 + 0.5 * Math.sin(t * 2.6);
        alertL.intensity = 42 * (0.35 + alert * 0.65);
        alertR.intensity = 42 * (0.35 + (1 - alert) * 0.65);
        doorGlow.intensity = 260 * env(t, BLOW - 0.06, BLOW + 5.5, 0.08, 3.4)
          + 60 * clamp(ramp(t, BLOW, BLOW + 1), 0, 1);

        // the door
        corridor.userData.setDoor?.(clamp(ramp(t, BLOW, BLOW + 0.5), 0, 1));

        if (t >= BLOW && t < BLOW + 0.2 && t - dt < BLOW) {
          const p = new THREE.Vector3(0, 5, -CORRIDOR_LEN * 0.45);
          boom.boom(p, { scale: 1.5, brickCount: 46, brickSpeed: 26 });
          for (let i = 0; i < 12; i++) {
            smoke.spawn(p.clone().add(new THREE.Vector3(rng.gauss(0, 3), rng.range(0, 6), rng.gauss(0, 2))), {
              ttl: rng.range(3, 6), size0: 3, size1: rng.range(16, 30),
              vel: new THREE.Vector3(rng.gauss(0, 1.2), rng.range(0.4, 1.6), rng.range(2, 7)),
              drag: 0.985,
            });
          }
        }

        // firefight
        while (idx < fire.length && fire[idx].t <= t) {
          const f = fire[idx++];
          if (f.imperial) {
            const src = troopers[f.lane % troopers.length];
            const from = src.position.clone().add(new THREE.Vector3(0.6, 4.0, 1.2));
            const to = rebels[rng.int(0, rebels.length - 1)].position.clone()
              .add(new THREE.Vector3(rng.gauss(0, 1.6), 3.4 + rng.gauss(0, 1), 0));
            redBolts.fireAt(from, to, { ttl: 0.7 });
          } else {
            const src = rebels[f.lane % rebels.length];
            const from = src.position.clone().add(new THREE.Vector3(-0.6, 4.0, -1.2));
            const to = troopers[rng.int(0, troopers.length - 1)].position.clone()
              .add(new THREE.Vector3(rng.gauss(0, 1.6), 3.4, 0));
            grnBolts.fireAt(from, to, { ttl: 0.7 });
          }
          if (rng.next() < 0.22) {
            const hp = new THREE.Vector3(rng.range(-7, 7), rng.range(2, 10), rng.range(-30, 20));
            for (let i = 0; i < 3; i++) {
              sparks.spawn(hp, {
                ttl: rng.range(0.2, 0.5), size0: 0.35, size1: 0.02,
                vel: new THREE.Vector3(rng.gauss(0, 1), rng.gauss(0, 1), rng.gauss(0, 1)).normalize().multiplyScalar(rng.range(5, 16)),
                color: 0xffc880,
              });
            }
          }
        }

        // troopers advance, rebels fall back / fall over
        const adv = clamp(ramp(t, BLOW + 0.3, VADER_IN), 0, 1);
        troopers.forEach((s, i) => {
          s.position.z = lerp(-CORRIDOR_LEN * 0.42 - i * 3, -6 - i * 3.4, ease.outQuad(adv));
          const f = s.userData.fig;
          if (f) { if (adv > 0.02 && adv < 0.98) f.walk(dt, 1.1); else { f.stopWalk(); f.setPose('aim', 0.2); } }
          s.userData.update?.(t, dt);
        });
        rebels.forEach((r, i) => {
          const f = r.userData.fig;
          if (t > downAt + i * 0.5) {
            f?.setPose('fallen', 0.09);
            r.rotation.x = lerp(r.rotation.x, -1.35, 0.05);
            r.position.y = lerp(r.position.y, 1.6, 0.05);
          }
          r.userData.update?.(t, dt);
        });

        // Vader walks in
        const vin = clamp(ramp(t, VADER_IN, VADER_IN + 5.2), 0, 1);
        vader.position.z = lerp(-CORRIDOR_LEN * 0.45, -14, ease.inOutQuad(vin));
        vader.rotation.y = Math.PI;
        if (vaderFig) {
          if (vin > 0.01 && vin < 0.99) vaderFig.walk(dt, 0.72);
          else { vaderFig.stopWalk(); vaderFig.setPose('stand_wide', 0.08); }
          if (t > b3 - 0.2) vaderFig.lookAt(officer.position.clone().setY(6.2), 0.7);
          vaderFig.update(dt, t);
        }

        // the lift
        const lift = env(t, LIFT, b5 + 1.6, 0.9, 0.55);
        if (lift > 0.001) {
          officer.position.y = lift * 3.2;
          officer.rotation.z = Math.sin(t * 3.1) * 0.09 * lift;
          officer.userData.fig?.setPose('panic', 0.1);
          if (vaderFig) vaderFig.arms.R.rotation.x = lerp(vaderFig.arms.R.rotation.x, -1.62, 0.12);
        } else if (t > b5 + 1.6) {
          officer.position.y = Math.max(0, officer.position.y - dt * 22);
          officer.userData.fig?.setPose('fallen', 0.08);
        }

        redBolts.update(dt); grnBolts.update(dt);
        boom.update(dt, ctx.camera);
        smoke.update(dt, ctx.camera);
        sparks.update(dt, ctx.camera);
        motes.update(t);
        officer.userData.update?.(t, dt);
        corridor.userData.update?.(t, dt);
      },
    };
  },
};
