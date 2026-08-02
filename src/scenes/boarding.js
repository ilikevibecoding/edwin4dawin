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

// The corridor model is built from z = 0 (near door) back to z = -len, so the
// whole set is pushed forward to put the rebel line, the cameras and the far
// blast door inside it rather than in the void beyond the near threshold.
const CORRIDOR_LEN = 90;
const CORRIDOR_Z = 34;
const FAR_DOOR = CORRIDOR_Z - CORRIDOR_LEN + 0.9;   // -55.1

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
    corridor.position.z = CORRIDOR_Z;
    root.add(corridor);

    // red alert wash + a warm key from the blown doorway
    const alertL = new THREE.PointLight(0xff3020, 0, 60, 2);
    alertL.position.set(0, 11, 6);
    const alertR = new THREE.PointLight(0xff3020, 0, 60, 2);
    alertR.position.set(0, 11, -30);
    const doorGlow = new THREE.PointLight(0xffd0a0, 0, 90, 2);
    doorGlow.position.set(0, 7, FAR_DOOR + 1);
    // A cold practical over the standoff so the figures are not pure silhouette.
    const standoffKey = new THREE.SpotLight(0xdce8ff, 0, 46, 0.7, 0.7, 1.7);
    standoffKey.position.set(2.6, 13, -9);
    standoffKey.target.position.set(1.2, 3, -9);
    root.add(alertL, alertR, doorGlow, standoffKey, standoffKey.target);

    // ---- cast -----------------------------------------------------------
    const rebels = [];
    for (let i = 0; i < 4; i++) {
      const r = await tryMake('rebeltrooper', {}, { size: [1.6, 5, 1] , color: C.sandBlue });
      const x = [-3.4, -1.4, 1.5, 3.5][i];
      r.position.set(x, 0, 20 + (i % 2) * 4);
      r.rotation.y = Math.PI;               // facing -Z, down the corridor
      r.userData.fig?.setPose(i % 2 ? 'aim' : 'hold_two');
      root.add(r);
      rebels.push(r);
    }

    // Troopers hug the walls. The centre lane has to stay clear: every camera
    // in this chapter travels down it, and a helmet at 1.5 studs fills frame.
    const TROOPER_X = [-3.4, 3.3, -3.5, 3.4, -3.3, 3.5];
    const TROOPER_Z = [-4.5, -8.0, -12.8, -15.5, -18.6, -21.5];
    const troopers = [];
    for (let i = 0; i < 6; i++) {
      const s = await tryMake('stormtrooper', {}, { size: [1.6, 5, 1], color: C.white });
      s.position.set(TROOPER_X[i], 0, FAR_DOOR + 5 + i * 3);
      s.userData.fig?.setPose('aim');
      root.add(s);
      troopers.push(s);
    }

    const vader = await tryMake('vader', {}, { size: [2, 5.6, 1.2], color: C.black });
    vader.position.set(0, 0, FAR_DOOR + 1.5);
    root.add(vader);
    const vaderFig = vader.userData.fig;

    const officer = await tryMake('imperialofficer', {}, { size: [1.6, 5, 1], color: C.darkGreen });
    officer.position.set(2.1, 0, -5.4);
    officer.rotation.y = Math.PI * 0.94;
    root.add(officer);

    // ---- effects ---------------------------------------------------------
    const redBolts = new BoltPool(ctx.scene, { max: 46, color: C.transRed, core: 0xffdcd6, radius: 0.10, length: 2.6, speed: 95 });
    const grnBolts = new BoltPool(ctx.scene, { max: 30, color: C.transGreen, core: 0xdcffd6, radius: 0.10, length: 2.6, speed: 95 });
    const boom = new Explosions(ctx.scene, { seed: 77, colors: [C.white, C.lightBluishGray, C.darkBluishGray] });
    const smoke = new SpritePool(ctx.scene, { max: 60, texture: smokeTexture(), additive: false, color: 0x3a3f48 });
    const sparks = new SpritePool(ctx.scene, { max: 60, texture: flashTexture() });
    const motes = new Motes(ctx.scene, { count: 140, box: [20, 14, CORRIDOR_LEN], size: 0.07, color: 0xffd9b0, seed: 12, speed: 0.35 });
    motes.points.position.z = CORRIDOR_Z - CORRIDOR_LEN * 0.5;

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
      pos: [1.4, 4.6, 31], to: [0.6, 4.4, 27.5],
      look: [0, 5.2, FAR_DOOR], handheld: 0.35,
    });
    // 2. the breach, from behind the rebel line -- and staying behind it, or
    //    the dolly drives straight through a trooper's head
    shots.add({
      t: BLOW - 0.15, dur: (VADER_IN - 1.4) - (BLOW - 0.15), fov: 52,
      pos: [-2.4, 3.6, 30], to: [-1.4, 3.9, 27],
      look: [0, 5, -22], shake: (u) => 0.9 * Math.exp(-u * 5) + 0.22, handheld: 0.5,
    });
    // 3. low, tilting up as he steps through
    shots.add({
      t: VADER_IN - 1.4, dur: (b3 - 0.6) - (VADER_IN - 1.4), fov: 40, ease: 'outCubic',
      pos: [1.0, 2.4, 6], to: [0.6, 3.4, 12],
      look: () => vader.position.clone().add(new THREE.Vector3(0, 3.0, 0)),
      lookTo: () => vader.position.clone().add(new THREE.Vector3(0, 5.4, 0)),
      handheld: 0.28,
    });
    // 4. over the officer's shoulder as Vader closes. The corridor's interior
    //    is only 9 studs wide, so every camera here has to stay inside
    //    |x| < 4.2 or it ends up buried in a wall looking at nothing.
    shots.add({
      t: b3 - 0.6, dur: (LIFT) - (b3 - 0.6), fov: 38, ease: 'linear',
      pos: [0.7, 5.4, 1.4], to: [0.4, 5.3, -0.4],
      look: () => vader.position.clone().add(new THREE.Vector3(0, 4.8, 0)),
      handheld: 0.3,
    });
    // 5. the lift: low and wide, the officer hanging near camera and Vader
    //    looming small and unhurried at the far end of the same frame
    shots.add({
      t: LIFT, dur: (b5 - 0.5) - LIFT, fov: 44, ease: 'inOutQuad',
      pos: [-3.2, 2.6, -8.2], to: [-3.3, 3.5, -9.6],
      look: [1.1, 5.0, -9.6],
      handheld: 0.35,
    });
    // 6. push in on the mask
    shots.add({
      t: b5 - 0.5, dur: ctx.dur - (b5 - 0.5), fov: 30, ease: 'outQuad',
      pos: [0.5, 5.9, -8.4], to: [0.2, 5.75, -10.9],
      look: () => vader.position.clone().add(new THREE.Vector3(0, 5.3, 0)),
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
      // White ABS walls under four practicals blow out fast; the aberration is
      // pulled in too, because it fringes hard green over a bloomed frame.
      exposure: 1.85,
      grade: { uVignette: 0.5, uGrain: 0.045, uAberration: 0.0010, uContrast: 1.09 },
      update(t, dt) {
        if (t < lastT) idx = 0;
        lastT = t;

        // alert lighting
        const alert = 0.5 + 0.5 * Math.sin(t * 2.6);
        alertL.intensity = 26 * (0.35 + alert * 0.65);
        alertR.intensity = 26 * (0.35 + (1 - alert) * 0.65);
        doorGlow.intensity = 90 * env(t, BLOW - 0.06, BLOW + 5.5, 0.08, 3.4)
          + 34 * clamp(ramp(t, BLOW, BLOW + 1), 0, 1);

        standoffKey.intensity = 130 * clamp(ramp(t, VADER_IN - 1.0, VADER_IN + 2.4), 0, 1);

        // the door
        corridor.userData.setDoor?.(clamp(ramp(t, BLOW, BLOW + 0.5), 0, 1));

        if (t >= BLOW && t < BLOW + 0.2 && t - dt < BLOW) {
          const p = new THREE.Vector3(0, 5, FAR_DOOR + 1.5);
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
          s.position.z = lerp(FAR_DOOR + 5 + i * 3, TROOPER_Z[i], ease.outQuad(adv));
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
        vader.position.z = lerp(FAR_DOOR + 1.5, -14, ease.inOutQuad(vin));
        // Minifigs face +Z, and he advances toward +Z: leave him unrotated or
        // he moonwalks the entire entrance.
        vader.rotation.y = 0;
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
