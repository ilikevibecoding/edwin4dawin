import * as THREE from 'three';
import { ShotList } from '../engine/camera.js';
import { tryMake, setupScene } from './_kit.js';
import { Motes, SpritePool, smokeTexture } from '../engine/effects.js';
import { C } from '../lego/palette.js';
import { ramp, ease, clamp, lerp } from '../engine/util.js';
import { RNG } from '../engine/rng.js';

/*
 * Chapter 5 -- two droids, a lot of sand, no plan.
 * Stepped-plate dune country under a hard double sun, then dusk.
 */


/** The twin-suns asset is a wide sky backdrop card; keep it facing the camera. */
function faceCamera(card, camera) {
  const d = new THREE.Vector3();
  camera.getWorldDirection(d);
  card.rotation.y = Math.atan2(-d.x, -d.z);
}

export default {
  id: 'dunes',
  dur: 24,
  async build(ctx) {
    const root = new THREE.Group();
    const rng = new RNG(818);
    setupScene(ctx, 'desert', {
      background: 0xd7a266,
      envIntensity: 0.39,
      fog: [0xc79a63, 210, 900],
      shadowSize: 90,
    });

    const dunes = await tryMake('dunes', { size: 260, seed: 3 }, { size: [260, 6, 260], color: C.tan });
    root.add(dunes);

    const suns = await tryMake('twinsuns', {}, { size: [30, 30, 1], color: C.brightLightYellow });
    suns.position.set(0, 0, 0);
    suns.userData.setHeight?.(0.62);
    root.add(suns);

    const crawler = await tryMake('sandcrawler', {}, { size: [30, 26, 60], color: C.reddishBrown });
    crawler.position.set(120, 0, -210);
    crawler.rotation.y = -Math.PI * 0.38;
    crawler.scale.setScalar(1);
    root.add(crawler);

    const threepio = await tryMake('c3po', {}, { size: [1.8, 5, 1], color: C.pearlGold });
    const r2 = await tryMake('r2', {}, { size: [2, 3.4, 2], color: C.white });
    root.add(threepio, r2);

    const dust = new Motes(ctx.scene, { count: 160, box: [80, 12, 80], size: 0.10, color: 0xffe0a8, seed: 21, speed: 0.9 });
    const puffs = new SpritePool(ctx.scene, { max: 46, texture: smokeTexture(), additive: false, color: 0xe0bd8a });

    const d1 = ctx.cue('d1', 1.2);
    const d2 = ctx.cue('d2', 7.5);
    const d3 = ctx.cue('d3', 14.0);
    const DUSK = d3 - 1.0;

    // the droids trudge from -Z toward +X across the frame
    const walkFrom = new THREE.Vector3(-38, 0, 30);
    const walkTo = new THREE.Vector3(46, 0, -34);

    const shots = new ShotList();
    shots.add({          // 1. wide: two specks in a very large desert
      t: 0, dur: d2 - 1.0, fov: 34, ease: 'linear',
      pos: [-60, 26, 96], to: [-44, 22, 84],
      look: () => threepio.position.clone().add(new THREE.Vector3(6, 2, -6)),
    });
    shots.add({          // 2. low, tracking beside them
      t: d2 - 1.0, dur: (DUSK) - (d2 - 1.0), fov: 40, ease: 'linear',
      pos: () => threepio.position.clone().add(new THREE.Vector3(9, 3.2, 10)),
      look: () => threepio.position.clone().add(new THREE.Vector3(0, 3.4, 0)),
      handheld: 0.5,
    });
    shots.add({          // 3. the sandcrawler on the ridge at dusk
      t: DUSK, dur: ctx.dur - DUSK, fov: 32, ease: 'inOutQuad',
      pos: () => r2.position.clone().add(new THREE.Vector3(-16, 5.5, 20)),
      look: () => crawler.position.clone().add(new THREE.Vector3(0, 10, 0)),
    });

    const sun = ctx.scene.getObjectByName('rig_desert')?.userData?.lights;
    let lastPuff = -1;

    return {
      root,
      shots,
      exposure: 0.8,
      grade: { uVignette: 0.34, uGrain: 0.03, uSaturation: 1.12 },
      update(t, dt) {
        faceCamera(suns, ctx.camera);
        const u = clamp(t / (DUSK + 3), 0, 1);
        const p = walkFrom.clone().lerp(walkTo, ease.inOutQuad(u));

        threepio.position.copy(p);
        threepio.position.x -= 2.4;
        threepio.rotation.y = Math.atan2(walkTo.x - walkFrom.x, walkTo.z - walkFrom.z);
        r2.position.copy(p);
        r2.position.x += 2.0;
        r2.position.z += 1.4;
        r2.rotation.y = threepio.rotation.y;

        const walking = u > 0.01 && u < 0.99;
        const tf = threepio.userData.fig;
        if (tf) {
          if (walking) tf.walk(dt, 0.55);
          if (t > d2 - 0.3 && t < d2 + 5) {
            tf.arms.R.rotation.x = lerp(tf.arms.R.rotation.x, -1.9 + Math.sin(t * 5) * 0.5, 0.15);
            tf.lookAt(r2.position.clone().setY(3.2), 0.7);
          }
          tf.update(dt, t);
        }
        r2.userData.spinDome?.(Math.sin(t * 0.9) * 0.7);
        r2.userData.update?.(t, dt);
        r2.position.y = Math.abs(Math.sin(t * 6.2)) * 0.10;

        // little sand puffs at their feet
        if (walking && t - lastPuff > 0.36) {
          lastPuff = t;
          puffs.spawn(threepio.position.clone().add(new THREE.Vector3(rng.gauss(0, 0.5), 0.2, 0)), {
            ttl: rng.range(1.2, 2.2), size0: 0.5, size1: rng.range(3, 5.5),
            vel: new THREE.Vector3(rng.gauss(0, 0.4), 0.5, rng.gauss(0, 0.4)), drag: 0.94,
          });
          puffs.spawn(r2.position.clone().add(new THREE.Vector3(rng.gauss(0, 0.5), 0.2, 0)), {
            ttl: rng.range(1.0, 1.8), size0: 0.4, size1: rng.range(2.4, 4),
            vel: new THREE.Vector3(rng.gauss(0, 0.4), 0.4, rng.gauss(0, 0.4)), drag: 0.94,
          });
        }

        // dusk: suns drop, light warms and dims
        const dusk = clamp(ramp(t, DUSK - 2.5, ctx.dur - 1), 0, 1);
        suns.userData.setHeight?.(lerp(0.62, 0.16, dusk));
        if (sun) {
          sun.key.intensity = lerp(3.1, 1.35, dusk);
          sun.key.color.setHex(dusk > 0.5 ? 0xffb066 : 0xfff0cc);
          if (sun.fill) sun.fill.intensity = lerp(1.05, 0.55, dusk);
        }
        if (ctx.scene.fog) {
          ctx.scene.fog.color.setHex(dusk > 0.5 ? 0xa9703f : 0xc79a63);
          ctx.scene.background?.setHex?.(dusk > 0.5 ? 0xb06a3c : 0xd7a266);
        }

        crawler.position.x = lerp(120, 96, dusk);
        crawler.position.z = lerp(-210, -170, dusk);
        crawler.userData.update?.(t, dt);
        dunes.userData.update?.(t, dt);
        dust.update(t);
        puffs.update(dt, ctx.camera);
      },
    };
  },
};
