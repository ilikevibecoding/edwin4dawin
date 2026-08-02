import * as THREE from 'three';
import { ShotList } from '../engine/camera.js';
import { tryMake, setupScene } from './_kit.js';
import { Motes } from '../engine/effects.js';
import { C } from '../lego/palette.js';
import { ramp, ease, clamp, lerp } from '../engine/util.js';

/*
 * Chapter 6 -- the binary sunset.
 * The quietest chapter and the one that has to land emotionally: one figure,
 * one ridge, two suns, and a slow crane up as the light goes.
 */

export default {
  id: 'twinsuns',
  dur: 32,
  async build(ctx) {
    const root = new THREE.Group();
    setupScene(ctx, 'sunset', {
      background: 0xd97a3c,
      envIntensity: 0.6,
      fog: [0xd98a54, 70, 420],
      shadowSize: 70,
    });

    const dunes = await tryMake('dunes', { size: 240, seed: 9 }, { size: [240, 6, 240], color: C.tan });
    root.add(dunes);

    const farm = await tryMake('moisturefarm', {}, { size: [30, 10, 30], color: C.darkTan });
    farm.position.set(34, 0, 48);
    farm.rotation.y = -0.5;
    root.add(farm);

    const suns = await tryMake('twinsuns', {}, { size: [30, 30, 1], color: C.brightLightYellow });
    suns.position.set(6, 0, -360);
    root.add(suns);

    const luke = await tryMake('luke', {}, { size: [1.8, 5, 1], color: C.white });
    root.add(luke);

    const speeder = await tryMake('landspeeder', {}, { size: [8, 4, 16], color: C.lightBluishGray });
    speeder.position.set(20, 0.9, 26);
    speeder.rotation.y = 0.9;
    root.add(speeder);

    const dust = new Motes(ctx.scene, { count: 120, box: [60, 14, 60], size: 0.09, color: 0xffcf9a, seed: 33, speed: 0.5 });

    const s1 = ctx.cue('s1', 1.6);
    const s2 = ctx.cue('s2', 11.0);
    const s3 = ctx.cue('s3', 20.0);
    const ARRIVE = Math.min(s2 - 1.2, 9.0);

    // Luke walks out to the ridge and stops.
    const from = new THREE.Vector3(16, 0, 34);
    const to = new THREE.Vector3(-1.5, 0, 2);

    const shots = new ShotList();
    shots.add({          // 1. behind him, walking out
      t: 0, dur: ARRIVE, fov: 38, ease: 'linear',
      pos: () => luke.position.clone().add(new THREE.Vector3(5.5, 5.0, 13)),
      look: () => luke.position.clone().add(new THREE.Vector3(-2, 4.0, -8)),
      handheld: 0.35,
    });
    shots.add({          // 2. the shot: silhouette against both suns
      t: ARRIVE, dur: (s3 - 1.0) - ARRIVE, fov: 30, ease: 'inOutCubic',
      pos: [7.0, 5.2, 20.0], to: [4.4, 6.4, 15.0],
      look: () => luke.position.clone().add(new THREE.Vector3(-0.6, 4.2, -3)),
      handheld: 0.2,
    });
    shots.add({          // 3. crane up and back, he is very small
      t: s3 - 1.0, dur: ctx.dur - (s3 - 1.0), fov: 34, ease: 'inOutQuad',
      pos: [4.4, 6.4, 15.0], to: [10.0, 26.0, 46.0],
      look: () => luke.position.clone().add(new THREE.Vector3(0, 3, -10)),
    });

    const lights = ctx.scene.getObjectByName('rig_sunset')?.userData?.lights;

    return {
      root,
      shots,
      grade: { uVignette: 0.4, uGrain: 0.028, uSaturation: 1.16, uContrast: 1.06 },
      update(t, dt) {
        const w = clamp(ramp(t, 0.6, ARRIVE - 0.4), 0, 1);
        luke.position.copy(from).lerp(to, ease.inOutQuad(w));
        luke.rotation.y = lerp(Math.atan2(to.x - from.x, to.z - from.z), Math.PI, clamp(ramp(t, ARRIVE - 1.4, ARRIVE + 0.6), 0, 1));

        const fig = luke.userData.fig;
        if (fig) {
          if (w > 0.02 && w < 0.98) fig.walk(dt, 0.62);
          else {
            fig.stopWalk();
            fig.setPose('idle', 0.06);
            // hands slowly fall to his sides; head tips up a little
            fig.head.rotation.x = lerp(fig.head.rotation.x, -0.16, 0.03);
          }
          fig.update(dt, t);
        }

        // the suns go down over the whole chapter
        const set = clamp(ramp(t, ARRIVE - 2, ctx.dur), 0, 1);
        suns.userData.setHeight?.(lerp(0.30, 0.02, ease.inOutQuad(set)));
        if (lights) {
          lights.key.intensity = lerp(2.6, 0.7, set);
          lights.key.color.setHex(set > 0.55 ? 0xff6a2a : 0xff9b4a);
          if (lights.fill) lights.fill.intensity = lerp(0.85, 0.4, set);
        }
        if (ctx.scene.fog) ctx.scene.fog.color.setHex(set > 0.55 ? 0xa8532c : 0xd98a54);
        if (ctx.scene.background?.setHex) ctx.scene.background.setHex(set > 0.55 ? 0xa8532c : 0xd97a3c);

        dust.update(t);
        farm.userData.update?.(t, dt);
        dunes.userData.update?.(t, dt);
      },
    };
  },
};
