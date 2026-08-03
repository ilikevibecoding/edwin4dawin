// Sequence 4 -- Tessaru. Two droids, nine thousand kilometres of sand, and a
// scrap hauler on the horizon.

import * as THREE from 'three';
import { makeStage } from '../core/film.js';
import { music, vo, sfx } from './kit.js';
import { dunes, skyDome, twinSuns, desertLights, sandDrift, scatterRocks } from '../worlds/desert.js';
import { astromech, protocolDroid } from '../models/droids.js';
import { sandcrawler } from '../models/civilian.js';
import { rockSpire } from '../models/props.js';
import { escapePod } from '../models/capital.js';
import { CameraRig } from '../core/camera.js';
import { clamp, lerp, Ease } from '../util/math.js';

const DURATION = 35;

export default {
  id: 'desert',
  duration: DURATION,
  fadeIn: 0.8,
  fadeOut: 0.6,
  cues: [
    music('desert', 0.5, { gain: 0.95 }),
    sfx('wind', 0, { dur: 34, vel: 1.0 }),
    vo('n8', 1.4),
    vo('d1', 9.6),
    sfx('droidBeeps', 15.2, { vel: 0.7, count: 7, seed: 11, mood: 0.7 }),
    vo('d2', 16.6),
    sfx('droidBeeps', 21.6, { vel: 0.5, count: 3, seed: 5, mood: 0.4 }),
    vo('n9', 24.4),
    sfx('engineBed', 26.5, { dur: 8, vel: 0.5, freq: 32, cutoff: 120 }),
  ],

  build() {
    const { scene, camera } = makeStage({
      background: 0xc9ab84,
      fog: new THREE.FogExp2(0xd8bb92, 0.00042),
      fov: 40, near: 0.2, far: 12000,
    });
    scene.add(camera);

    scene.add(skyDome({
      radius: 9000,
      stops: [[0, '#f2d3a4'], [0.14, '#dcb98c'], [0.4, '#8fa2b8'], [1, '#2c4a72']],
    }));
    const suns = twinSuns({ azimuth: -0.26, elevation: 0.155, separation: 0.058, distance: 7200, scale: 1, intensity: 0.85 });
    scene.add(suns);
    desertLights(scene, { azimuth: -0.26, elevation: 0.3, keyIntensity: 3.4, skyIntensity: 1.4, bounceIntensity: 1.0 });

    const ground = dunes({ size: 6000, segments: 160, seed: 12, amplitude: 30 });
    scene.add(ground);
    const h = ground.userData.height;
    scatterRocks(scene, h, { count: 90, seed: 6, area: 1400, scale: 1.4 });

    for (let i = 0; i < 4; i++) {
      const r = rockSpire({ scale: 6 + i * 2, seed: 20 + i, tall: 1.6 });
      const a = -1.1 + i * 0.7;
      const d = 700 + i * 260;
      r.position.set(Math.sin(a) * d, h(Math.sin(a) * d, -Math.cos(a) * d) - 4, -Math.cos(a) * d);
      scene.add(r);
    }

    const drift = sandDrift({ count: 700, area: 260, height: 14, size: 0.9 });
    scene.add(drift);

    // The crashed pod, half buried, in the opening wide.
    const pod = escapePod({ size: 6 });
    pod.position.set(-46, h(-46, 60) + 1.2, 60);
    pod.rotation.set(-0.35, 1.1, 0.24);
    scene.add(pod);

    // Our droids, trudging.
    const r2 = astromech({ scale: 1.0 });
    const tk = protocolDroid({ scale: 1.0 });
    scene.add(r2, tk);

    const walkPath = (t) => {
      const u = t * 1.5;               // metres travelled
      const x = -18 + u * 0.55;
      const z = 26 - u * 0.82;
      return new THREE.Vector3(x, h(x, z), z);
    };

    // Sandcrawler crossing the horizon.
    const crawler = sandcrawler({ scale: 1.0 });
    scene.add(crawler);

    const rig = new CameraRig(camera);
    rig.handheld = 0.006;
    const droidMid = (t) => {
      const p = walkPath(t);
      return new THREE.Vector3(p.x + 0.8, p.y + 1.0, p.z);
    };

    rig.setTrack([
      // Shot 1: the empty wide, suns high.
      { t: 0, pos: [120, h(120, 300) + 46, 300], look: [-60, 30, -240], fov: 34 },
      { t: 8.6, pos: [60, h(60, 250) + 34, 250], look: [-60, 24, -260], fov: 32, ease: Ease.linear },
      // Shot 2: low, tracking the droids from the side.
      { t: 8.601, cut: true, pos: (t) => droidMid(t).clone().add(new THREE.Vector3(9, -0.35, 5.5)), look: (t) => droidMid(t), fov: 40 },
      { t: 20.4, pos: (t) => droidMid(t).clone().add(new THREE.Vector3(6.5, 0.1, 3.4)), look: (t) => droidMid(t), fov: 38, ease: Ease.linear },
      // Shot 3: ground level behind them, sandcrawler appearing.
      { t: 20.401, cut: true, pos: (t) => droidMid(t).clone().add(new THREE.Vector3(-2.2, -0.55, 7)), look: (t) => droidMid(t).clone().add(new THREE.Vector3(-14, 4, -34)), fov: 44 },
      { t: 27.4, pos: (t) => droidMid(t).clone().add(new THREE.Vector3(-1.6, 0.2, 6)), look: (t) => droidMid(t).clone().add(new THREE.Vector3(-16, 6, -40)), fov: 42, ease: Ease.linear },
      // Shot 4: the hauler, big, grinding past.
      { t: 27.401, cut: true, pos: [-96, h(-96, -40) + 7, -40], look: [-190, 22, -215], fov: 40 },
      { t: DURATION, pos: [-110, h(-110, -52) + 9, -52], look: [-182, 20, -208], fov: 38, ease: Ease.linear },
    ]);

    return {
      scene,
      camera,
      bloom: 0.55,

      update(t, dt) {
        const p = walkPath(t);
        const heading = Math.atan2(0.55, -0.82);
        r2.position.copy(p);
        r2.position.x -= 1.1;
        r2.position.y = h(r2.position.x, r2.position.z);
        r2.rotation.y = heading;
        r2.userData.step(t, 0.9);
        r2.userData.lookAround(t);

        tk.position.copy(p);
        tk.position.x += 0.9;
        tk.position.z += 0.6;
        tk.position.y = h(tk.position.x, tk.position.z);
        tk.rotation.y = heading;
        tk.userData.step(t, 1.0);

        // The hauler grinds in from the left on the last two shots.
        const cu = clamp((t - 18) / 20);
        const cx = lerp(-520, -150, cu);
        const cz = -230;
        crawler.position.set(cx, h(cx, cz) - 2, cz);
        crawler.rotation.y = Math.PI * 0.42;

        drift.position.set(p.x, 0, p.z);
        drift.userData.update(dt, 0.9, 0.4);

        rig.update(t);
      },

      dispose() {},
    };
  },
};
