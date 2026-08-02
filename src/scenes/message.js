import * as THREE from 'three';
import { ShotList } from '../engine/camera.js';
import { tryMake, setupScene, nodesLike } from './_kit.js';
import { makeHologram, projectorCone, engineFlare, SpritePool, flashTexture, Motes } from '../engine/effects.js';
import { starfield } from '../engine/stars.js';
import { C } from '../lego/palette.js';
import { ramp, env, ease, clamp, lerp } from '../engine/util.js';
import { RNG } from '../engine/rng.js';

/*
 * Chapter 4 -- the plans go into the droid, the pod goes out the side.
 * Half interior (a service alcove off the corridor), half exterior.
 */

export default {
  id: 'message',
  dur: 29,
  async build(ctx) {
    const root = new THREE.Group();
    const rng = new RNG(404);
    setupScene(ctx, 'dark', { background: 0x04060a, envIntensity: 0.19, fog: [0x05070c, 40, 260] });

    root.add(starfield({ count: 1500, radius: 3200, seed: 17, size: 2.6 }));

    // --- interior half ----------------------------------------------------
    const interior = new THREE.Group();
    root.add(interior);
    // The corridor kit is modelled from z = 0 back to z = -length, so it gets
    // pushed forward to put the cast inside the set instead of out in space.
    const alcove = await tryMake('corridor', { length: 60, alcove: true }, { size: [20, 15, 60], color: C.lightBluishGray });
    alcove.position.z = 30;
    interior.add(alcove);

    const leia = await tryMake('leia', {}, { size: [1.8, 5, 1], color: C.white });
    leia.position.set(-1.0, 0, 4.0);
    leia.rotation.y = Math.PI * 0.06;
    interior.add(leia);

    const r2 = await tryMake('r2', {}, { size: [2, 3.4, 2], color: C.white });
    r2.position.set(0.9, 0, 8.6);
    r2.rotation.y = Math.PI * 1.06;
    interior.add(r2);

    const threepio = await tryMake('c3po', {}, { size: [1.8, 5, 1], color: C.pearlGold });
    threepio.position.set(-3.6, 0, 7.8);
    threepio.rotation.y = Math.PI * 0.62;
    interior.add(threepio);

    // Hologram of the battle station plans: a wireframe sphere with an
    // equatorial trench and the dish, so it reads as the thing they stole.
    const holoSource = new THREE.Group();
    const shell = new THREE.Mesh(
      new THREE.SphereGeometry(1.15, 20, 14),
      new THREE.MeshBasicMaterial({ color: 0x74d8ff, wireframe: true }),
    );
    const trench = new THREE.Mesh(
      new THREE.TorusGeometry(1.16, 0.05, 5, 44),
      new THREE.MeshBasicMaterial({ color: 0xd8f4ff }),
    );
    trench.rotation.x = Math.PI / 2;
    const dish = new THREE.Mesh(
      new THREE.SphereGeometry(0.34, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0xd8f4ff, wireframe: true }),
    );
    dish.position.set(-0.42, 0.82, 0.55);
    dish.rotation.set(-0.5, 0, -0.4);
    // A survey grid sweeping the sphere sells it as a schematic, not a ball.
    const grid = new THREE.Mesh(
      new THREE.TorusGeometry(1.32, 0.02, 4, 40),
      new THREE.MeshBasicMaterial({ color: 0x9fe0ff }),
    );
    grid.rotation.set(Math.PI / 2, 0, 0.5);
    holoSource.add(shell, trench, dish, grid);
    const holo = makeHologram(holoSource, { color: 0x86dcff, scale: 1.0 });
    const holoNode = r2.userData?.nodes?.holoOrigin;
    const holoAnchor = new THREE.Group();
    holoAnchor.position.copy(holoNode ? holoNode.getWorldPosition(new THREE.Vector3()).sub(r2.position).add(r2.position) : r2.position.clone().add(new THREE.Vector3(0, 3.4, 0)));
    holoAnchor.position.y = Math.max(holoAnchor.position.y, 3.4);
    interior.add(holoAnchor);
    holo.position.set(0, 2.4, 0);
    holoAnchor.add(holo);
    const cone = projectorCone(0.95, 1.9, 0x74d8ff);
    holoAnchor.add(cone);
    const holoLight = new THREE.PointLight(0x9fd0e8, 0, 22, 2);
    holoLight.position.set(0, 2.4, 0);
    holoAnchor.add(holoLight);

    const motes = new Motes(ctx.scene, { count: 90, box: [16, 10, 30], size: 0.06, color: 0xbfe6ff, seed: 8, speed: 0.3 });

    // --- exterior half ----------------------------------------------------
    const exterior = new THREE.Group();
    exterior.visible = false;
    root.add(exterior);

    const corvette = await tryMake('corvette', {}, { size: [10, 6, 70], color: C.white });
    corvette.rotation.y = Math.PI * 0.5;
    corvette.position.set(0, 0, 0);
    exterior.add(corvette);

    const destroyer = await tryMake('stardestroyer', {}, { size: [180, 40, 340], color: C.lightBluishGray });
    destroyer.position.set(30, 120, -300);
    destroyer.rotation.set(-0.03, Math.PI * 0.5 + 0.16, 0.02);
    exterior.add(destroyer);

    const planet = await tryMake('desertplanet', { radius: 700 }, { size: [300, 300, 300], color: C.darkTan });
    planet.position.set(-140, -880, 260);
    exterior.add(planet);

    const pod = await tryMake('escapepod', {}, { size: [5, 5, 9], color: C.white });
    exterior.add(pod);
    const podFlare = engineFlare(C.transNeonOrange, 0.7, 4.4);
    (pod.userData?.nodes?.thruster || pod).add(podFlare);

    const sparks = new SpritePool(ctx.scene, { max: 40, texture: flashTexture() });

    // --- beats ------------------------------------------------------------
    const m1 = ctx.cue('m1', 1.0);
    const m2 = ctx.cue('m2', 8.0);
    const m3 = ctx.cue('m3', 16.0);
    const CUT = m3 - 1.6;
    const LAUNCH = m3 + 0.7;

    const shots = new ShotList();
    shots.add({           // 1. down the alcove: Leia, the droid and the plans
      t: 0, dur: m2 - 0.6, fov: 40, ease: 'linear',
      pos: [2.6, 5.4, -2.4], to: [2.1, 5.2, -0.6],
      look: [-0.2, 3.4, 6.6],
      handheld: 0.3,
    });
    shots.add({           // 2. reverse onto Leia's face for her last order.
                          // High enough that R2 falls out of the bottom of
                          // frame instead of masking her.
      t: m2 - 0.6, dur: (CUT) - (m2 - 0.6), fov: 32, ease: 'inOutQuad',
      pos: [3.4, 6.6, 11.6], to: [2.9, 6.3, 10.3],
      look: () => leia.position.clone().add(new THREE.Vector3(0, 4.7, 0)),
      handheld: 0.28,
    });
    shots.add({           // 3. exterior: the pod drops away
      t: CUT, dur: (ctx.dur - 5.0) - CUT, fov: 42, ease: 'linear',
      pos: (u) => [58 - u * 6, 16 + u * 4, 44 + u * 12],
      look: () => pod.position,
    });
    shots.add({           // 4. the pod falls toward the planet
      t: ctx.dur - 5.0, dur: 5.0, fov: 36, ease: 'inOutQuad',
      pos: () => pod.position.clone().add(new THREE.Vector3(-16, 9, 26)),
      look: () => pod.position,
      shake: 0.1,
    });

    let lastT = -1;

    return {
      root,
      shots,
      exposure: 2.2,
      grade: { uVignette: 0.44, uGrain: 0.034 },
      update(t, dt) {
        const interiorOn = t < CUT + 0.02;
        interior.visible = interiorOn;
        exterior.visible = !interiorOn;
        motes.points.visible = interiorOn;

        if (interiorOn) {
          // the plans go in
          // The plans come up while the narrator describes them, then collapse
          // back into the droid so the reverse onto Leia has a clean field.
          const on = clamp(ramp(t, m1 + 1.4, m1 + 3.0), 0, 1)
            * (1 - clamp(ramp(t, m2 - 1.6, m2 - 0.5), 0, 1));
          holo.visible = on > 0.01;
          cone.visible = on > 0.01;
          cone.material.opacity = 0.09 * on;
          holoLight.intensity = 11 * on * (0.85 + Math.sin(t * 31) * 0.12);
          holo.scale.setScalar(0.15 + 0.95 * ease.outBack(clamp(ramp(t, m1 + 1.4, m1 + 3.0), 0, 1)) * on);
          holo.rotation.y = t * 0.55;
          holo.userData.update?.(t, dt);

          const lf = leia.userData.fig;
          if (lf) {
            lf.setPose(t < m2 - 0.3 ? 'reach' : 'hold_right', 0.08);
            lf.lookAt(r2.position.clone().setY(3.2), 0.55);
            lf.update(dt, t);
          }
          r2.userData.spinDome?.(Math.sin(t * 1.1) * 0.5);
          r2.userData.update?.(t, dt);
          threepio.userData.fig?.setPose('panic', 0.03);
          threepio.userData.update?.(t, dt);
          motes.update(t);
        } else {
          // pod launch
          const u = clamp(ramp(t, LAUNCH, ctx.dur), 0, 1);
          const e = ease.inQuad(u);
          pod.position.set(
            lerp(6, -40, e) + Math.sin(t * 0.9) * 1.2,
            lerp(-1, -34, e * e),
            lerp(2, 150, e),
          );
          pod.rotation.set(t * 0.35, t * 0.22, Math.sin(t * 0.7) * 0.25);
          podFlare.userData.set(0.5 + 0.5 * Math.sin(t * 14));
          if (t > LAUNCH && t < LAUNCH + 0.4) {
            for (let i = 0; i < 4; i++) {
              sparks.spawn(pod.position, {
                ttl: rng.range(0.2, 0.5), size0: 0.5, size1: 0.05,
                vel: new THREE.Vector3(rng.gauss(0, 1), rng.gauss(0, 1), rng.gauss(0, 1)).normalize().multiplyScalar(rng.range(8, 26)),
                color: 0xffd08a,
              });
            }
          }
          corvette.userData.update?.(t, dt);
          destroyer.userData.update?.(t, dt);
        }
        sparks.update(dt, ctx.camera);
        lastT = t;
      },
    };
  },
};
