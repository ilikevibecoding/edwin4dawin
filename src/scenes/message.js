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
    const alcove = await tryMake('corridor', { length: 60, alcove: true }, { size: [20, 15, 60], color: C.lightBluishGray });
    interior.add(alcove);

    const leia = await tryMake('leia', {}, { size: [1.8, 5, 1], color: C.white });
    leia.position.set(-1.6, 0, 4);
    leia.rotation.y = Math.PI * 0.92;
    interior.add(leia);

    const r2 = await tryMake('r2', {}, { size: [2, 3.4, 2], color: C.white });
    r2.position.set(2.2, 0, 3.2);
    r2.rotation.y = -Math.PI * 0.42;
    interior.add(r2);

    const threepio = await tryMake('c3po', {}, { size: [1.8, 5, 1], color: C.pearlGold });
    threepio.position.set(5.6, 0, 6.6);
    threepio.rotation.y = -Math.PI * 0.75;
    interior.add(threepio);

    // hologram of the battle station plans, projected off R2's dome
    const holoSource = new THREE.Group();
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.5, 0.06, 6, 40),
      new THREE.MeshBasicMaterial({ color: 0x9fe0ff }),
    );
    ring.rotation.x = Math.PI / 2;
    const shell = new THREE.Mesh(
      new THREE.SphereGeometry(1.35, 18, 12),
      new THREE.MeshBasicMaterial({ color: 0x74d8ff, wireframe: true }),
    );
    const dish = new THREE.Mesh(
      new THREE.SphereGeometry(0.42, 12, 8),
      new THREE.MeshBasicMaterial({ color: 0x9fe0ff, wireframe: true }),
    );
    dish.position.set(-0.55, 0.6, 0.7);
    holoSource.add(ring, shell, dish);
    const holo = makeHologram(holoSource, { color: 0x86dcff, scale: 1.0 });
    const holoNode = r2.userData?.nodes?.holoOrigin;
    const holoAnchor = new THREE.Group();
    holoAnchor.position.copy(holoNode ? holoNode.getWorldPosition(new THREE.Vector3()).sub(r2.position).add(r2.position) : r2.position.clone().add(new THREE.Vector3(0, 3.4, 0)));
    holoAnchor.position.y = Math.max(holoAnchor.position.y, 3.4);
    interior.add(holoAnchor);
    holo.position.set(0, 2.4, 0);
    holoAnchor.add(holo);
    const cone = projectorCone(1.8, 2.4, 0x74d8ff);
    holoAnchor.add(cone);
    const holoLight = new THREE.PointLight(0x74d8ff, 0, 26, 2);
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
    shots.add({           // 1. over Leia's shoulder onto the droid
      t: 0, dur: m2 - 0.6, fov: 36, ease: 'linear',
      pos: [-6.4, 6.2, 10.5], to: [-5.2, 5.6, 9.0],
      look: () => r2.position.clone().add(new THREE.Vector3(0, 2.6, 0)),
      handheld: 0.3,
    });
    shots.add({           // 2. on Leia, hologram light on her face
      t: m2 - 0.6, dur: (CUT) - (m2 - 0.6), fov: 30, ease: 'inOutQuad',
      pos: [5.0, 5.4, 8.6], to: [4.2, 5.2, 7.4],
      look: () => leia.position.clone().add(new THREE.Vector3(0, 4.6, 0)),
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
      grade: { uVignette: 0.44, uGrain: 0.034 },
      update(t, dt) {
        const interiorOn = t < CUT + 0.02;
        interior.visible = interiorOn;
        exterior.visible = !interiorOn;
        motes.points.visible = interiorOn;

        if (interiorOn) {
          // the plans go in
          const load = clamp(ramp(t, m1 + 0.6, m1 + 3.2), 0, 1);
          const on = clamp(ramp(t, m1 + 2.6, m1 + 4.4), 0, 1);
          holo.visible = on > 0.01;
          cone.visible = on > 0.01;
          cone.material.opacity = 0.14 * on;
          holoLight.intensity = 34 * on * (0.85 + Math.sin(t * 31) * 0.12);
          holo.scale.setScalar(0.15 + 0.85 * ease.outBack(on));
          holo.rotation.y = t * 0.55;
          holo.userData.update?.(t, dt);

          const lf = leia.userData.fig;
          if (lf) {
            lf.setPose(t < m2 - 0.3 ? 'reach' : 'hold_right', 0.08);
            lf.lookAt(r2.position.clone().setY(3.0), 0.8);
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
