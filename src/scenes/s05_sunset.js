// Sequence 5 -- the binary sunset. The quiet one. A farm, an old man, a girl,
// and two suns going down on the only life she has ever had.

import * as THREE from 'three';
import { makeStage } from '../core/film.js';
import { music, vo, sfx } from './kit.js';
import { dunes, skyDome, twinSuns, desertLights, sandDrift, scatterRocks } from '../worlds/desert.js';
import { vaporator, desertHut, rockSpire } from '../models/props.js';
import { astromech } from '../models/droids.js';
import { hero, robedFigure, idle, walk } from '../models/chars.js';
import { speeder } from '../models/civilian.js';
import { CameraRig } from '../core/camera.js';
import { glowPlane, emissive, paint } from '../gfx/materials.js';
import { smokeSprite } from '../gfx/textures.js';
import { clamp, lerp, smoothstep, Ease } from '../util/math.js';
import { RNG } from '../util/rng.js';

const DURATION = 40;

export default {
  id: 'sunset',
  duration: DURATION,
  fadeIn: 1.4,
  fadeOut: 1.6,
  cues: [
    music('sunset', 0.6, { gain: 1.0 }),
    sfx('wind', 0, { dur: 39, vel: 0.75 }),
    vo('n10', 1.6),
    sfx('droidBeeps', 11.4, { vel: 0.5, count: 4, seed: 21, mood: 0.6 }),
    vo('ob1', 12.6),
    vo('r1', 20.4),
    vo('ob2', 24.6),
    sfx('engineBed', 29.4, { dur: 9, vel: 0.55, freq: 44, cutoff: 180 }),
    vo('n11', 30.8),
    sfx('explosion', 32.4, { vel: 0.4, size: 1.5 }),
  ],

  build() {
    const { scene, camera } = makeStage({
      background: 0xd08a52,
      fog: new THREE.FogExp2(0xd08a52, 0.00055),
      fov: 40, near: 0.15, far: 12000,
    });
    scene.add(camera);

    scene.add(skyDome({
      radius: 9000,
      stops: [[0, '#ffb166'], [0.1, '#e8834a'], [0.28, '#b25f52'], [0.55, '#5b4a6e'], [1, '#1b2445']],
    }));
    const suns = twinSuns({ azimuth: 0.06, elevation: 0.055, separation: 0.052, distance: 7200, scale: 1.5, intensity: 1.25 });
    scene.add(suns);
    desertLights(scene, {
      azimuth: 0.06, elevation: 0.06,
      keyColor: 0xffb070, keyIntensity: 4.4,
      skyColor: 0x9b7fb8, skyIntensity: 1.7,
      bounceColor: 0xe09a5e, bounceIntensity: 1.3,
    });

    const ground = dunes({ size: 5000, segments: 150, seed: 31, amplitude: 26, base: [198, 152, 108] });
    scene.add(ground);
    const h = ground.userData.height;
    scatterRocks(scene, h, { count: 70, seed: 9, area: 900, scale: 1.2 });

    // The farm: a domed homestead, vaporators, a speeder.
    const farm = new THREE.Group();
    farm.position.set(-26, 0, -34);
    scene.add(farm);
    const hut = desertHut({ scale: 1.0 });
    hut.position.set(0, h(-26, -34), 0);
    farm.add(hut);
    const vapPositions = [[14, -8], [24, 10], [6, 22], [-16, 14], [34, -14]];
    for (const [vx, vz] of vapPositions) {
      const v = vaporator({ scale: 1.15, seed: vx });
      v.position.set(vx, h(-26 + vx, -34 + vz), vz);
      farm.add(v);
    }
    const spd = speeder({ scale: 1.0 });
    spd.position.set(9, h(-17, -28) + 1.1, 6);
    spd.rotation.y = 0.7;
    farm.add(spd);

    // The two figures on the ridge.
    const ridgeX = 8;
    const ridgeZ = 2;
    const girl = hero({ height: 1.66 });
    girl.position.set(ridgeX, h(ridgeX, ridgeZ), ridgeZ);
    girl.rotation.y = Math.PI * 0.02;
    scene.add(girl);

    const old = robedFigure({ height: 1.8, color: 0x9b8461 });
    old.position.set(ridgeX - 1.6, h(ridgeX - 1.6, ridgeZ + 1.2), ridgeZ + 1.2);
    old.rotation.y = Math.PI * 0.08;
    scene.add(old);

    const r2 = astromech({ scale: 1.0 });
    r2.position.set(ridgeX + 1.7, h(ridgeX + 1.7, ridgeZ + 1.6), ridgeZ + 1.6);
    r2.rotation.y = -0.3;
    scene.add(r2);

    const drift = sandDrift({ count: 500, area: 90, height: 8, size: 0.8, color: 0xffd0a0 });
    scene.add(drift);

    // Smoke column for the burned-out farm at the end.
    const smoke = new THREE.Group();
    scene.add(smoke);
    const puffs = [];
    const rr = new RNG(4);
    for (let i = 0; i < 14; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), new THREE.MeshBasicMaterial({
        map: smokeSprite(), color: 0x2e2620, transparent: true, opacity: 0, depthWrite: false,
      }));
      m.userData = { phase: rr.float(0, 1), sway: rr.float(-1, 1) };
      smoke.add(m);
      puffs.push(m);
    }

    const rig = new CameraRig(camera);
    rig.handheld = 0.004;

    const eye = (dx, dy, dz) => new THREE.Vector3(ridgeX + dx, h(ridgeX, ridgeZ) + dy, ridgeZ + dz);
    const faces = () => new THREE.Vector3(ridgeX - 0.3, h(ridgeX, ridgeZ) + 1.45, ridgeZ + 0.4);

    rig.setTrack([
      // Shot 1: the wide -- farm, dunes, two suns on the horizon.
      { t: 0, pos: [64, h(64, 90) + 18, 90], look: [-30, 12, -60], fov: 30 },
      { t: 11.4, pos: [40, h(40, 74) + 14, 74], look: [-26, 10, -56], fov: 28, ease: Ease.linear },
      // Shot 2: the two of them in silhouette against the suns.
      { t: 11.401, cut: true, pos: eye(6.5, 1.35, 9.5), look: faces, fov: 34 },
      { t: 23.6, pos: eye(5.2, 1.4, 7.6), look: faces, fov: 32, ease: Ease.inOutQuad },
      // Shot 3: over her shoulder, straight into the suns.
      { t: 23.601, cut: true, pos: eye(1.4, 1.62, 2.6), look: () => new THREE.Vector3(ridgeX + 30, h(ridgeX, ridgeZ) + 6, ridgeZ - 400), fov: 36 },
      { t: 29.4, pos: eye(1.1, 1.66, 2.2), look: () => new THREE.Vector3(ridgeX + 26, h(ridgeX, ridgeZ) + 5, ridgeZ - 400), fov: 34, ease: Ease.linear },
      // Shot 4: the farm, burning, from far off.
      { t: 29.401, cut: true, pos: [30, h(30, 60) + 26, 60], look: [-26, 16, -34], fov: 26 },
      { t: DURATION, pos: [22, h(22, 54) + 22, 54], look: [-26, 14, -34], fov: 25, ease: Ease.linear },
    ]);

    return {
      scene,
      camera,
      bloom: 0.9,

      update(t, dt) {
        idle(girl.userData.rig, t * 0.8);
        girl.userData.rig.head.rotation.y = Math.sin(t * 0.3) * 0.08 - 0.1;
        // She turns to the old man when he speaks, then back to the suns.
        const turn = smoothstep(12.4, 14, t) * (1 - smoothstep(26, 28.4, t));
        girl.rotation.y = lerp(0.04, -0.55, turn);

        idle(old.userData.rig, t * 0.6 + 3, { amount: 0.6 });
        old.userData.rig.arms[0].shoulder.rotation.x = -0.15 + Math.sin(t * 0.7) * 0.05;
        const gesture = smoothstep(24.6, 25.6, t) * (1 - smoothstep(27.4, 28.6, t));
        old.userData.rig.arms[1].shoulder.rotation.x = lerp(-0.15, -1.25, gesture);
        old.userData.rig.arms[1].elbow.rotation.x = lerp(-0.2, -0.35, gesture);
        old.rotation.y = 0.42;

        r2.userData.lookAround(t * 0.5);
        r2.userData.step(0, 0);

        drift.position.set(ridgeX, 0, ridgeZ);
        drift.userData.update(dt, 0.5, 0.3);

        // The suns sink through the shot.
        const sink = t / DURATION;
        suns.position.y = -sink * 260;

        // The farm burns in the final shot.
        const burn = smoothstep(30.5, 33.5, t);
        puffs.forEach((m, i) => {
          const d = m.userData;
          const age = ((t - 30.5) * 0.1 + d.phase) % 1;
          if (burn <= 0.01) { m.material.opacity = 0; return; }
          m.position.set(
            -26 + d.sway * age * 26,
            h(-26, -34) + 2 + age * 70,
            -34 + d.sway * age * 8,
          );
          m.scale.setScalar(1 + age * 4.5);
          m.material.opacity = burn * Math.sin(age * Math.PI) * 0.42;
          m.quaternion.copy(camera.quaternion);
        });

        rig.update(t);
      },

      dispose() {},
    };
  },
};
