import * as THREE from 'three';
import { ShotList } from '../engine/camera.js';
import { tryMake, setupScene, nodesLike } from './_kit.js';
import { starfield } from '../engine/stars.js';
import { BoltPool, Explosions, engineFlare, SpritePool, flashTexture } from '../engine/effects.js';
import { C } from '../lego/palette.js';
import { ramp, env, ease, clamp, lerp } from '../engine/util.js';
import { RNG } from '../engine/rng.js';

/*
 * Chapter 8 -- the trench run.
 * Everything here is about speed: walls close on both sides, the camera rides
 * behind the fighter, and the cut rate goes up until the shot.
 */

const TRENCH_LEN = 1400;

export default {
  id: 'trench',
  dur: 55,
  async build(ctx) {
    const root = new THREE.Group();
    const rng = new RNG(66613);
    setupScene(ctx, 'space', { background: 0x04060b, envIntensity: 0.22 });
    root.add(starfield({ count: 1600, radius: 5000, seed: 5, size: 2.6 }));

    const surface = await tryMake('deathstar_surface', { size: 900 }, { size: [900, 4, 900], color: C.darkBluishGray });
    surface.position.set(0, -22, -300);
    root.add(surface);

    const trench = await tryMake('trench', { length: TRENCH_LEN }, { size: [40, 30, TRENCH_LEN], color: C.darkBluishGray });
    trench.position.set(0, -22, -TRENCH_LEN * 0.5 + 200);
    root.add(trench);
    const port = trench.userData?.nodes?.exhaustPort;

    // --- flight -----------------------------------------------------------
    const hero = await tryMake('xwing', {}, { size: [22, 6, 30], color: C.white });
    root.add(hero);
    hero.userData.setSFoils?.(1);
    const heroEngines = nodesLike(hero, 'engine');
    const heroFlares = heroEngines.map((n) => { const f = engineFlare(C.transNeonOrange, 0.34, 3.4); n.add(f); return f; });
    const heroGuns = nodesLike(hero, 'gun');

    const wing = [];
    for (let i = 0; i < 2; i++) {
      const x = await tryMake('xwing', {}, { size: [22, 6, 30], color: C.white });
      x.userData.setSFoils?.(1);
      for (const n of nodesLike(x, 'engine')) n.add(engineFlare(C.transNeonOrange, 0.30, 3.0));
      root.add(x);
      wing.push(x);
    }

    const ties = [];
    for (let i = 0; i < 3; i++) {
      const tie = await tryMake('tiefighter', {}, { size: [16, 12, 10], color: C.darkBluishGray });
      root.add(tie);
      ties.push(tie);
    }

    const green = new BoltPool(ctx.scene, { max: 60, color: C.transGreen, core: 0xd8ffd0, radius: 0.18, length: 6, speed: 300 });
    const red = new BoltPool(ctx.scene, { max: 60, color: C.transRed, core: 0xffd8d0, radius: 0.16, length: 5, speed: 300 });
    const boom = new Explosions(ctx.scene, { seed: 909, colors: [C.lightBluishGray, C.white, C.darkBluishGray] });
    const sparks = new SpritePool(ctx.scene, { max: 70, texture: flashTexture() });

    // --- beats ------------------------------------------------------------
    const r1 = ctx.cue('r1', 1.0);
    const r2c = ctx.cue('r2', 3.0);
    const r3 = ctx.cue('r3', 10.0);
    const r4 = ctx.cue('r4', 22.0);
    const r5 = ctx.cue('r5', 30.0);
    const r6 = ctx.cue('r6', 36.0);
    const DIVE_END = Math.min(r3 - 0.5, 9.0);
    const FIRE = r6 + 1.4;
    const HIT = FIRE + 1.1;
    const BLOW = HIT + 1.6;
    const RUN_END = ctx.dur - 3.0;

    // hero path: dive from above, into the trench, down the length of it
    const heroAt = (t) => {
      const dive = clamp(ramp(t, 0, DIVE_END), 0, 1);
      const run = clamp(ramp(t, DIVE_END, RUN_END), 0, 1);
      const y = lerp(150, -13, ease.inOutCubic(dive));
      const z = lerp(430, 130, ease.inOutQuad(dive)) - run * (TRENCH_LEN - 260);
      const x = Math.sin(t * 0.9) * (1 - run * 0.55) * 3.2 + lerp(30, 0, ease.inOutCubic(dive));
      return new THREE.Vector3(x, y + Math.sin(t * 1.7) * 0.8 * (1 - dive) , z);
    };

    const shots = new ShotList();
    shots.add({            // 1. the dive, wide
      t: 0, dur: DIVE_END - 1.0, fov: 46, ease: 'linear',
      pos: (u) => { const p = heroAt(0.001); return [p.x + 70 - u * 20, p.y + 26 - u * 18, p.z + 66]; },
      look: () => hero.position, shake: 0.12,
    });
    shots.add({            // 2. chase cam, entering the trench
      t: DIVE_END - 1.0, dur: (r4 - 1.2) - (DIVE_END - 1.0), fov: 58, ease: 'linear',
      pos: () => hero.position.clone().add(new THREE.Vector3(0, 4.6, 36)),
      look: () => hero.position.clone().add(new THREE.Vector3(0, 1.0, -40)),
      shake: 0.35, shakeFreq: 22,
    });
    shots.add({            // 3. reverse: looking back at the pursuing TIEs
      t: r4 - 1.2, dur: 5.0, fov: 52, ease: 'linear',
      pos: () => hero.position.clone().add(new THREE.Vector3(0, 3.2, -34)),
      look: () => ties[0].position,
      shake: 0.4, shakeFreq: 20,
    });
    shots.add({            // 4. tight on the cockpit side
      t: r4 + 3.8, dur: (r6 - 0.6) - (r4 + 3.8), fov: 44, ease: 'linear',
      pos: () => hero.position.clone().add(new THREE.Vector3(17, 3.4, 10)),
      look: () => hero.position.clone().add(new THREE.Vector3(0, 0.6, -6)),
      shake: 0.45, shakeFreq: 24,
    });
    shots.add({            // 5. down the barrel of the trench to the port
      t: r6 - 0.6, dur: (BLOW) - (r6 - 0.6), fov: 62, ease: 'linear',
      pos: () => hero.position.clone().add(new THREE.Vector3(0, 3.4, 32)),
      look: () => hero.position.clone().add(new THREE.Vector3(0, -1.6, -80)),
      shake: 0.5, shakeFreq: 26,
    });
    shots.add({            // 6. pull out, the station goes
      t: BLOW, dur: ctx.dur - BLOW, fov: 40, ease: 'outQuad',
      pos: (u) => [120 + u * 260, 90 + u * 220, 420 + u * 500],
      look: [0, -20, -400], shake: (u) => 0.8 * Math.exp(-u * 3),
    });

    // firing schedules
    const tieFire = [];
    for (let t = r4 - 3; t < r6; t += 0.34) tieFire.push({ t, which: rng.int(0, 2) });
    const wallHits = [];
    for (let t = DIVE_END; t < r6; t += 0.55) wallHits.push({ t, side: rng.sign() });
    let ti = 0, wi = 0, lastT = -1, fired = false, hitDone = false, blown = false;

    const flash = new THREE.PointLight(0xfff0c0, 0, 1400, 2);
    flash.position.set(0, -10, -TRENCH_LEN * 0.5);
    root.add(flash);

    return {
      root,
      shots,
      exposure: 1.8,
      grade: { uVignette: 0.44, uGrain: 0.032, uAberration: 0.0022 },
      update(t, dt) {
        if (t < lastT) { ti = 0; wi = 0; fired = false; hitDone = false; blown = false; }
        lastT = t;

        const p = heroAt(t);
        hero.position.copy(p);
        const nxt = heroAt(t + 0.05);
        hero.lookAt(nxt.x, nxt.y, nxt.z - 1);
        hero.rotation.z = -Math.cos(t * 0.9) * 0.22 * clamp(1 - ramp(t, DIVE_END, DIVE_END + 3), 0.25, 1);
        for (const f of heroFlares) f.userData.set(0.85 + Math.sin(t * 19) * 0.1);

        wing.forEach((x, i) => {
          const lag = 0.55 + i * 0.5;
          const q = heroAt(t - lag);
          x.position.set(q.x + (i ? 9 : -9), q.y + 1.4, q.z + 12 + i * 4);
          const qn = heroAt(t - lag + 0.05);
          x.lookAt(qn.x + (i ? 9 : -9), qn.y + 1.4, qn.z + 11);
          x.rotation.z = -Math.cos((t - lag) * 0.9) * 0.2;
          x.visible = t < r4 + 6.5;   // they get picked off
          x.userData.update?.(t, dt);
        });

        ties.forEach((tie, i) => {
          const lag = 1.5 + i * 0.42;
          const q = heroAt(t - lag);
          tie.position.set(q.x + (i - 1) * 6.5, q.y + 2.0 + i * 0.6, q.z + 42 + i * 12);
          tie.lookAt(hero.position);
          tie.visible = t > r4 - 5.5 && t < BLOW;
          tie.userData.update?.(t, dt);
        });

        // TIEs shooting at the hero
        while (ti < tieFire.length && tieFire[ti].t <= t) {
          const f = tieFire[ti++];
          const src = ties[f.which];
          const from = src.position.clone().add(new THREE.Vector3(rng.sign() * 3, 0, -4));
          const to = hero.position.clone().add(new THREE.Vector3(rng.gauss(0, 2.4), rng.gauss(0, 1.6), 0));
          green.fireAt(from, to, { ttl: 0.55 });
          if (rng.next() < 0.35) {
            for (const g of heroGuns.slice(0, 2)) {
              const gp = g.getWorldPosition(new THREE.Vector3());
              red.fire(gp, new THREE.Vector3(0, 0, -1).applyQuaternion(hero.quaternion), { ttl: 0.6 });
            }
          }
        }

        // hits kicking sparks off the trench walls
        while (wi < wallHits.length && wallHits[wi].t <= t) {
          const h = wallHits[wi++];
          const hp = hero.position.clone().add(new THREE.Vector3(h.side * 17, rng.range(-6, 8), rng.range(-30, 10)));
          for (let i = 0; i < 5; i++) {
            sparks.spawn(hp, {
              ttl: rng.range(0.15, 0.4), size0: 0.6, size1: 0.05,
              vel: new THREE.Vector3(-h.side * rng.range(4, 14), rng.gauss(0, 6), rng.range(20, 60)),
              color: 0xffe0a0,
            });
          }
        }

        // a wingman is lost
        if (t > r4 + 6.2 && t < r4 + 6.6 && !hitDone) {
          hitDone = true;
          boom.boom(wing[0].position.clone(), { scale: 1.2, brickCount: 40, brickSpeed: 26 });
        }

        // the shot
        if (!fired && t >= FIRE) {
          fired = true;
          const target = (port ? port.getWorldPosition(new THREE.Vector3()) : new THREE.Vector3(0, -19, hero.position.z - 220));
          for (const g of (heroGuns.length ? heroGuns.slice(0, 2) : [hero])) {
            const gp = g.getWorldPosition(new THREE.Vector3());
            red.fireAt(gp, target, { ttl: 1.4, speed: 220 });
          }
        }
        if (fired && !blown && t >= HIT) {
          const target = (port ? port.getWorldPosition(new THREE.Vector3()) : new THREE.Vector3(0, -19, hero.position.z - 200));
          boom.boom(target, { scale: 1.6, brickCount: 30, brickSpeed: 24 });
        }
        if (!blown && t >= BLOW) {
          blown = true;
          for (let i = 0; i < 9; i++) {
            boom.boom(new THREE.Vector3(rng.gauss(0, 130), rng.range(-40, 40), -420 + rng.gauss(0, 180)), {
              scale: rng.range(2.2, 4.2), brickCount: 26, brickSpeed: 44,
            });
          }
        }
        if (t >= BLOW) {
          const u = (t - BLOW) / 3;
          flash.intensity = 90000 * Math.exp(-u * 2.2);
          surface.visible = u < 0.55;
          trench.visible = u < 0.55;
        } else {
          flash.intensity = 0;
        }

        green.update(dt); red.update(dt);
        boom.update(dt, ctx.camera);
        sparks.update(dt, ctx.camera);
        hero.userData.update?.(t, dt);
        trench.userData.update?.(t, dt);
        surface.userData.update?.(t, dt);
      },
    };
  },
};
