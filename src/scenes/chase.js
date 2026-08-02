import * as THREE from 'three';
import { ShotList } from '../engine/camera.js';
import { starfield } from '../engine/stars.js';
import { tryMake, setupScene, throb, nodesLike } from './_kit.js';
import { BoltPool, Explosions, engineFlare, SpritePool, flashTexture } from '../engine/effects.js';
import { C } from '../lego/palette.js';
import { ramp, env, ease, clamp, lerp, noise1 } from '../engine/util.js';
import { RNG } from '../engine/rng.js';

/*
 * Chapter 2 -- the blockade runner and the thing behind it.
 * The whole point of the shot is scale: the corvette is 70 studs long and the
 * destroyer is 340, and the camera sits underneath while the big one keeps
 * arriving long after you expect it to stop.
 */

export default {
  id: 'chase',
  dur: 36,
  async build(ctx) {
    const root = new THREE.Group();
    const rng = new RNG(2077);
    setupScene(ctx, 'space', { background: 0x01030a, envIntensity: 0.25 });

    root.add(starfield({ count: 2200, radius: 4000, seed: 91, size: 3.0 }));

    const planet = await tryMake('desertplanet', { radius: 900 }, { size: [400, 400, 400], color: C.darkTan });
    planet.position.set(-320, -1150, -900);
    root.add(planet);

    const corvette = await tryMake('corvette', {}, { size: [10, 6, 70], color: C.white });
    root.add(corvette);
    const corvetteEngines = nodesLike(corvette, 'engine');
    const flares = corvetteEngines.map((n) => {
      const f = engineFlare(C.transLightBlue, 0.55, 5.5, { intensity: 1.05, coreIntensity: 1.25 });
      n.add(f);
      return f;
    });

    const destroyer = await tryMake('stardestroyer', {}, { size: [180, 40, 340], color: C.lightBluishGray });
    root.add(destroyer);
    // The destroyer is only ever seen from underneath and the space rig keys
    // from above, so without a bounce the whole hull reads as one flat shape.
    const belly = new THREE.DirectionalLight(0x9ec4ee, 0.8);
    belly.position.set(-24, -50, 46);
    root.add(belly);
    const dEngines = nodesLike(destroyer, 'engine');
    for (const n of dEngines) n.add(engineFlare(C.transLightBlue, 2.6, 26, { intensity: 1.2, coreIntensity: 1.6 }));

    // ---- effects ------------------------------------------------------
    const green = new BoltPool(ctx.scene, { max: 40, color: C.transGreen, core: 0xd8ffd0, radius: 0.55, length: 16, speed: 420, intensity: 0.95, coreIntensity: 1.25 });
    const red = new BoltPool(ctx.scene, { max: 40, color: C.transRed, core: 0xffd8d0, radius: 0.30, length: 9, speed: 380, intensity: 1.2, coreIntensity: 1.6 });
    const boom = new Explosions(ctx.scene, { seed: 31, colors: [C.white, C.lightBluishGray, C.red] });
    const sparks = new SpritePool(ctx.scene, { max: 60, texture: flashTexture() });

    // Tractor beam cone drawn under the destroyer's hangar mouth. Back faces
    // only: a double-sided additive cone this large reads as a sheet of
    // pale blue plastic laid across the frame.
    const beamGeo = new THREE.CylinderGeometry(11, 3, 1, 24, 1, true);
    const beam = new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({
      color: 0x6fc4f0, transparent: true, opacity: 0, depthWrite: false,
      blending: THREE.AdditiveBlending, side: THREE.BackSide, toneMapped: false,
    }));
    root.add(beam);

    // ---- staging ------------------------------------------------------
    const CORV_Y = 0;
    const corvPath = (t) => new THREE.Vector3(
      lerp(180, -120, t / 36) + Math.sin(t * 0.42) * 6,
      CORV_Y + Math.sin(t * 0.31) * 3,
      lerp(-40, 260, t / 36),
    );

    const c1 = ctx.cue('c1', 1.4);
    const c2 = ctx.cue('c2', 9.0);
    const c3 = ctx.cue('c3', 17.0);
    const c4 = ctx.cue('c4', 22.3);
    const REVEAL = c2 - 0.8;
    const TRACTOR = c4 - 1.2;

    const shots = new ShotList();
    // 1. wide establishing over the planet
    shots.add({
      t: 0, dur: REVEAL, fov: 40, ease: 'linear',
      pos: (u) => [230 - u * 40, 34 - u * 6, 210 + u * 30],
      to: [190, 28, 240],
      look: () => corvette.position,
    });
    // The chase runs along +Z, with the destroyer hanging back and above. To
    // see it arrive the camera has to get out in front and look back down the
    // chase -- the small ship near the lens is what gives the big one its size.
    const between = (k) => () => corvette.position.clone().lerp(destroyer.position, k);

    // 2. out ahead on a long lens: the corvette runs at the lens with the
    //    destroyer stacked behind it. Compression is what sells the size
    //    difference -- a wide lens just makes the big ship distant.
    shots.add({
      t: REVEAL, dur: c3 - REVEAL, fov: 32, ease: 'outQuad',
      pos: (u) => corvette.position.clone().add(
        new THREE.Vector3(-16 + u * 5, -20 + u * 4, 150 - u * 40)),
      look: between(0.30),
      shake: (u) => 0.15 + u * 0.25,
    });
    // 3. right under the belly: the hull runs off every edge of frame while
    //    the turbolasers come down past the lens
    shots.add({
      t: c3, dur: TRACTOR - c3, fov: 54, ease: 'linear',
      pos: (u) => destroyer.position.clone().add(
        new THREE.Vector3(-52 + u * 16, -96 - u * 10, 244 - u * 46)),
      look: () => destroyer.position.clone().add(new THREE.Vector3(4, -22, 26)),
      shake: 0.5, shakeFreq: 17,
    });
    // 4. tractor beam: looking up the shaft as it is drawn in
    shots.add({
      t: TRACTOR, dur: ctx.dur - TRACTOR - 5.5, fov: 46, ease: 'inOutCubic',
      pos: (u) => corvette.position.clone().add(
        new THREE.Vector3(50 - u * 12, -18 + u * 6, 40 - u * 8)),
      look: between(0.26),
      shake: 0.2,
    });
    // 5. final wide: swallowed
    shots.add({
      t: ctx.dur - 5.5, dur: 5.5, fov: 34, ease: 'inOutQuad',
      pos: [130, 58, 300], to: [186, 82, 344],
      look: () => destroyer.position,
    });

    // deterministic firing schedule
    const shotsFired = [];
    for (let t = c2 + 1.2; t < TRACTOR; t += 0.52) {
      shotsFired.push({ t, big: rng.next() < 0.45, hit: rng.next() < 0.5 });
    }
    let fireIdx = 0;
    let lastT = -1;

    return {
      root,
      shots,
      exposure: 1.9,
      grade: { uVignette: 0.4, uGrain: 0.028, uAberration: 0.0010 },
      slateAt: (t) => ({ text: t < 4 ? '' : '', opacity: 0 }),
      update(t, dt) {
        if (t < lastT) fireIdx = 0;   // rewound (seek/warmup)
        lastT = t;

        // corvette flight
        corvette.position.copy(corvPath(t));
        corvette.rotation.set(
          Math.sin(t * 0.37) * 0.05,
          Math.PI * 0.5 + 0.18 + Math.sin(t * 0.23) * 0.04,
          Math.sin(t * 0.51) * 0.10,
        );
        const throttle = t < TRACTOR ? 1 : Math.max(0.12, 1 - ramp(t, TRACTOR, TRACTOR + 2.2));
        for (const f of flares) f.userData.set(throttle * (0.85 + Math.sin(t * 11) * 0.06));

        // destroyer: enters from behind and above, closes the gap
        const dz = lerp(-660, -178, ease.outQuad(clamp(ramp(t, REVEAL - 7, TRACTOR + 2), 0, 1)));
        const dy = lerp(190, 58, ease.outQuad(clamp(ramp(t, REVEAL - 7, TRACTOR + 2), 0, 1)));
        destroyer.position.set(
          corvette.position.x + 26,
          corvette.position.y + dy,
          corvette.position.z + dz,
        );
        destroyer.rotation.set(-0.02, Math.PI * 0.5 + 0.2, 0.015);

        // turbolasers
        while (fireIdx < shotsFired.length && shotsFired[fireIdx].t <= t) {
          const s = shotsFired[fireIdx++];
          const from = new THREE.Vector3(
            destroyer.position.x + rng.range(-60, 60),
            destroyer.position.y - 24,
            destroyer.position.z + rng.range(20, 130),
          );
          const target = corvette.position.clone().add(new THREE.Vector3(
            rng.gauss(0, s.hit ? 4 : 22), rng.gauss(0, s.hit ? 3 : 16), rng.gauss(0, 14),
          ));
          green.fireAt(from, target, { ttl: 1.1, spread: 0 });
          if (s.hit) {
            const hp = corvette.position.clone().add(new THREE.Vector3(rng.gauss(0, 6), rng.gauss(1, 3), rng.gauss(0, 22)));
            boom.boom(hp, { scale: s.big ? 0.5 : 0.28, brickCount: s.big ? 14 : 6, brickSpeed: 16, smoke: false });
            for (let i = 0; i < 5; i++) {
              sparks.spawn(hp, {
                ttl: rng.range(0.25, 0.7), size0: 0.5, size1: 0.05,
                vel: new THREE.Vector3(rng.gauss(0, 1), rng.gauss(0, 1), rng.gauss(0, 1)).normalize().multiplyScalar(rng.range(10, 34)),
                color: 0xffd08a,
              });
            }
          }
          // corvette shoots back, briefly
          if (t < c3 + 3 && rng.next() < 0.4) {
            red.fire(corvette.position.clone().add(new THREE.Vector3(0, 4, -20)),
              new THREE.Vector3(0.1, 0.55, -1).normalize(), { ttl: 0.9 });
          }
        }

        // tractor beam
        const tb = env(t, TRACTOR, ctx.dur - 3.2, 1.6, 1.4);
        beam.material.opacity = tb * 0.05;
        beam.visible = tb > 0.01;
        if (tb > 0.01) {
          const top = destroyer.position.clone().add(new THREE.Vector3(-10, -14, 60));
          const bottom = corvette.position.clone();
          const mid = top.clone().add(bottom).multiplyScalar(0.5);
          const len = top.distanceTo(bottom);
          beam.position.copy(mid);
          beam.scale.set(1, len, 1);
          beam.quaternion.setFromUnitVectors(
            new THREE.Vector3(0, 1, 0),
            bottom.clone().sub(top).normalize().negate(),
          );
          // being reeled in
          const pull = ease.inOutCubic(clamp(ramp(t, TRACTOR + 1.0, ctx.dur - 3.0), 0, 1));
          corvette.position.lerp(top.clone().add(new THREE.Vector3(0, -6, 0)), pull * 0.92);
          corvette.rotation.z += Math.sin(t * 1.7) * 0.06 * pull;
        }

        green.update(dt); red.update(dt);
        boom.update(dt, ctx.camera);
        sparks.update(dt, ctx.camera);
        corvette.userData.update?.(t, dt);
        destroyer.userData.update?.(t, dt);
      },
    };
  },
};
