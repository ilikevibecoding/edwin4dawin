import * as THREE from 'three';
import { ShotList } from '../engine/camera.js';
import { tryMake, setupScene } from './_kit.js';
import { Motes, lightShaft } from '../engine/effects.js';
import { C } from '../lego/palette.js';
import { ramp, ease, clamp, lerp } from '../engine/util.js';

/*
 * Chapter 9 -- the hall.
 * Symmetry, height, and a slow push down the aisle. Everything the rest of the
 * film is not: still, bright, and lined up.
 */

export default {
  id: 'medals',
  dur: 29,
  async build(ctx) {
    const root = new THREE.Group();
    setupScene(ctx, 'interior', {
      background: 0x0c1118, envIntensity: 0.3, fog: [0x161c26, 90, 400], shadowSize: 60,
    });

    const hall = await tryMake('throneroom', {}, { size: [70, 30, 140], color: C.white });
    root.add(hall);

    for (const x of [-16, 16]) {
      const s = lightShaft(2.4, 9, 30, 0xfff0d0, 0.028);
      s.position.set(x, 16, -20);
      root.add(s);
    }
    const keyA = new THREE.PointLight(0xfff2dc, 70, 130, 2);
    keyA.position.set(0, 26, -46);
    root.add(keyA);

    const luke = await tryMake('luke', {}, { size: [1.8, 5, 1], color: C.white });
    const leia = await tryMake('leia', {}, { size: [1.8, 5, 1], color: C.white });
    const pilot = await tryMake('rebelpilot', {}, { size: [1.8, 5, 1], color: C.orange });
    const r2 = await tryMake('r2', {}, { size: [2, 3.4, 2], color: C.white });
    const threepio = await tryMake('c3po', {}, { size: [1.8, 5, 1], color: C.pearlGold });

    luke.position.set(-2.6, 0, -30);
    pilot.position.set(3.4, 0, -30);
    r2.position.set(-7.0, 0, -28.5);
    threepio.position.set(8.0, 0, -28.5);
    leia.position.set(0.4, 3.6, -40);        // up on the dais
    for (const o of [luke, pilot, r2, threepio]) { o.rotation.y = Math.PI; root.add(o); }
    root.add(leia);

    // ranks of troops down both sides of the aisle
    const crowd = await tryMake('crowd_troopers', { count: 10, rebel: true }, { size: [30, 5, 30], color: C.sandBlue });
    crowd.visible = !crowd.userData.placeholder;
    crowd.position.set(0, 0, -12);
    root.add(crowd);

    const motes = new Motes(ctx.scene, { count: 150, box: [60, 24, 90], size: 0.06, color: 0xffe8c8, seed: 55, speed: 0.22 });

    const f1 = ctx.cue('f1', 3.0);
    const f2 = ctx.cue('f2', 9.0);

    const shots = new ShotList();
    shots.add({          // 1. low, down the aisle toward the dais
      t: 0, dur: f2 - 1.2, fov: 40, ease: 'linear',
      pos: [0, 4.6, 24], to: [0, 5.4, 6],
      look: [0, 6.5, -40],
    });
    shots.add({          // 2. the medal, close
      t: f2 - 1.2, dur: 8.0, fov: 30, ease: 'inOutQuad',
      pos: [-7.0, 6.6, -19], to: [-5.6, 6.4, -22],
      look: () => luke.position.clone().add(new THREE.Vector3(0, 4.6, 0)),
      handheld: 0.18,
    });
    shots.add({          // 3. crane up and back for the last image
      t: f2 + 6.8, dur: ctx.dur - (f2 + 6.8), fov: 42, ease: 'inOutCubic',
      pos: [0, 7, -14], to: [0, 40, 62],
      look: [0, 5, -38],
    });

    return {
      root,
      shots,
      exposure: 1.45,
      grade: { uVignette: 0.36, uGrain: 0.026, uSaturation: 1.04 },
      update(t, dt) {
        const bow = clamp(ramp(t, f2 - 0.4, f2 + 1.6), 0, 1);
        const lf = luke.userData.fig;
        if (lf) {
          lf.setPose('idle', 0.05);
          lf.torso.rotation.x = lerp(0, 0.36, Math.sin(bow * Math.PI));
          lf.lookAt(leia.position.clone().setY(7.4), 0.7);
          lf.update(dt, t);
        }
        const lea = leia.userData.fig;
        if (lea) {
          lea.setPose(t > f2 - 0.8 && t < f2 + 3 ? 'hold_two' : 'idle', 0.05);
          lea.lookAt(luke.position.clone().setY(5.4), 0.7);
          lea.update(dt, t);
        }
        const pf = pilot.userData.fig;
        if (pf) { pf.setPose(t > f2 + 2 ? 'salute' : 'stand_wide', 0.05); pf.update(dt, t); }

        r2.userData.spinDome?.(Math.sin(t * 0.8) * 0.6);
        r2.userData.update?.(t, dt);
        threepio.userData.update?.(t, dt);
        crowd.userData.marchAt?.(t);
        crowd.userData.update?.(t, dt);
        hall.userData.update?.(t, dt);
        motes.update(t);
      },
    };
  },
};
