// Sequence 9 -- after. Ships going home, and the titles.

import * as THREE from 'three';
import { makeStage } from '../core/film.js';
import { music, vo, sfx, cameraQuad } from './kit.js';
import { starfield, nebulaSky, sunBillboard, debrisField } from '../worlds/space.js';
import { planet } from '../worlds/planet.js';
import { xwing, ywing } from '../models/fighters.js';
import { freighter } from '../models/civilian.js';
import { greebled } from '../gfx/materials.js';
import { logoTexture, textCard } from '../gfx/textures.js';
import { TITLE, END_CARDS } from '../data/script.js';
import { CameraRig, aimAlong } from '../core/camera.js';
import { smoothstep, Ease } from '../util/math.js';

const DURATION = 42;
const TITLE_T = 17.5;
const CREDIT_T = 26.5;

export default {
  id: 'finale',
  duration: DURATION,
  fadeIn: 1.6,
  fadeOut: 3.0,
  cues: [
    music('finale', 0.5, { gain: 1.0 }),
    sfx('engineBed', 0, { dur: 16, vel: 0.5, freq: 58, cutoff: 300 }),
    vo('n19', 1.8),
    sfx('flyby', 6.4, { vel: 0.75, dur: 1.2 }),
    vo('n20', 8.6),
    music('endTitle', 24.5, { gain: 0.9 }),
  ],

  build() {
    const { scene, camera } = makeStage({ background: 0x02040a, fov: 40, near: 1, far: 120000 });
    scene.add(camera);
    scene.add(nebulaSky({ radius: 90000, seed: 33, density: 0.5, hueA: [40, 30, 110], hueB: [130, 45, 60] }));
    scene.add(starfield({ count: 2800, radius: 70000 }));
    scene.add(sunBillboard({ color: 0xfff0d0, size: 700, distance: 50000, dir: [-0.5, 0.25, -1] }));

    scene.add(new THREE.AmbientLight(0x2a3a54, 2.0));
    const key = new THREE.DirectionalLight(0xffeedd, 3.4);
    key.position.set(-0.5, 0.4, -1).multiplyScalar(1000);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0x6f92c8, 1.2);
    fill.position.set(0.8, -0.2, 0.6).multiplyScalar(1000);
    scene.add(fill);

    const world = planet({ radius: 14000, seed: 21, sunDir: [-0.5, 0.3, -0.8], atmosphere: 0x8ec4ff, segments: 56 });
    world.position.set(-6000, -16000, -30000);
    scene.add(world);

    // What is left of the station.
    const debris = debrisField({
      count: 300, radius: 9000, seed: 12, size: [20, 160],
      material: greebled({ seed: 66, repeat: [1, 1], base: [104, 108, 118] }),
    });
    debris.position.set(2000, 1200, -34000);
    scene.add(debris);

    const rhea = xwing({ scale: 1.0, stripe: 0xd0402c });
    rhea.userData.setSFoils(0);
    scene.add(rhea);
    const others = [xwing({ scale: 1, stripe: 0xd8b13a }), ywing({ scale: 1 }), freighter({ scale: 1 })];
    for (const o of others) {
      if (o.userData.setSFoils) o.userData.setSFoils(0);
      if (o.userData.setGear) o.userData.setGear(false);
      scene.add(o);
    }

    // Titles.
    const logoTex = logoTexture({ w: 2048, h: 1024, top: TITLE.main[0], bottom: TITLE.main[1], sub: TITLE.sub });
    const logo = cameraQuad(camera, logoTex, { distance: 10, widthFrac: 0.62, opacity: 0 });
    const creditTex = textCard({
      w: 2048, h: 512, lines: END_CARDS[1].lines,
      font: '400 62px "News Cycle", Arial, sans-serif', color: '#dceaf5', lineGap: 1.55,
    });
    const credit = cameraQuad(camera, creditTex, { distance: 10, widthFrac: 0.82, opacity: 0, y: -0.01 });

    const rig = new CameraRig(camera);
    const dir = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);

    const flight = (t, i) => {
      const u = t * 150;
      const lane = [[0, 0, 0], [34, 11, 74], [-40, -8, 122], [26, -26, 210]][i];
      return new THREE.Vector3(
        lane[0] + Math.sin(t * 0.35 + i) * 12,
        lane[1] + Math.sin(t * 0.27 + i * 2) * 7,
        900 - u + lane[2],
      );
    };

    rig.setTrack([
      // Shot 1: they pass the camera, planet behind.
      { t: 0, pos: (t) => flight(t, 0).clone().add(new THREE.Vector3(52, 15, 62)), look: (t) => flight(t, 0), fov: 44 },
      { t: 8.0, pos: (t) => flight(t, 0).clone().add(new THREE.Vector3(30, 8, 40)), look: (t) => flight(t, 0), fov: 40, ease: Ease.linear },
      // Shot 2: riding alongside.
      { t: 8.001, cut: true, pos: (t) => flight(t, 0).clone().add(new THREE.Vector3(-22, 5.5, 27)), look: (t) => flight(t, 0), fov: 42 },
      { t: 16.0, pos: (t) => flight(t, 0).clone().add(new THREE.Vector3(-16, 4, 22)), look: (t) => flight(t, 0), fov: 40, ease: Ease.linear },
      // Shot 3: hold on the starfield for the titles.
      { t: 16.001, cut: true, pos: (t) => flight(t, 0).clone().add(new THREE.Vector3(0, 40, 260)), look: (t) => flight(t, 0).clone().add(new THREE.Vector3(0, 0, -2600)), fov: 44 },
      { t: DURATION, pos: (t) => flight(t, 0).clone().add(new THREE.Vector3(0, 66, 620)), look: (t) => flight(t, 0).clone().add(new THREE.Vector3(0, 0, -3400)), fov: 42, ease: Ease.linear },
    ]);

    const prev = [flight(0, 0).clone(), flight(0, 1).clone(), flight(0, 2).clone(), flight(0, 3).clone()];

    return {
      scene,
      camera,
      bloom: 0.85,

      update(t, dt) {
        const ships = [rhea, ...others];
        ships.forEach((s, i) => {
          const p = flight(t, i);
          s.position.copy(p);
          dir.subVectors(p, prev[i]);
          if (dir.lengthSq() > 1e-6) aimAlong(s, dir, up, Math.sin(t * 0.5 + i) * 0.12);
          prev[i].copy(p);
          s.userData.setThrottle?.(0.85);
          s.visible = t < 17.2;
        });

        const titleA = smoothstep(TITLE_T, TITLE_T + 1.6, t) * (1 - smoothstep(CREDIT_T - 2.2, CREDIT_T - 0.4, t));
        logo.material.opacity = titleA;
        logo.visible = titleA > 0.01;

        const creditA = smoothstep(CREDIT_T, CREDIT_T + 1.6, t) * (1 - smoothstep(DURATION - 4.5, DURATION - 2.2, t));
        credit.material.opacity = creditA * 0.95;
        credit.visible = creditA > 0.01;

        debris.userData.update(t * 0.05);
        rig.update(t);
      },

      dispose() {
        camera.remove(logo);
        camera.remove(credit);
      },
    };
  },
};
