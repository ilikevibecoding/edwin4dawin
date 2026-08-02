// Sequence 3 -- the escape pod: dropped, ignored, and falling into atmosphere.

import * as THREE from 'three';
import { spaceStage, music, vo, sfx } from './kit.js';
import { escapePod, corvette, starDestroyer } from '../models/capital.js';
import { planet } from '../worlds/planet.js';
import { CameraRig } from '../core/camera.js';
import { glowPlane, emissive } from '../gfx/materials.js';
import { radialGlow } from '../gfx/textures.js';
import { RNG } from '../util/rng.js';
import { clamp, lerp, smoothstep, Ease } from '../util/math.js';

const DURATION = 28;

export default {
  id: 'pod',
  duration: DURATION,
  fadeIn: 0.6,
  fadeOut: 0.8,
  cues: [
    music('drift', 0.4, { gain: 0.9 }),
    sfx('clang', 2.1, { vel: 0.55 }),
    vo('n6', 1.0),
    vo('o3', 7.2),
    sfx('droidBeeps', 11.6, { vel: 0.55, count: 6, seed: 4, mood: 1.4 }),
    vo('n7', 12.6),
    sfx('engineBed', 17.5, { dur: 9.5, vel: 0.8, freq: 60, cutoff: 400 }),
    sfx('explosion', 18.2, { vel: 0.35, size: 2.2 }),
  ],

  build() {
    const { scene, camera } = spaceStage({
      fov: 42, near: 0.5, far: 60000, nebulaSeed: 91, starCount: 2200, density: 0.6,
      hueA: [50, 34, 130], hueB: [150, 50, 70],
      lights: { keyIntensity: 3.4, keyDir: [0.7, 0.4, 0.5], fillIntensity: 1.0, ambient: 0x2a3850, ambientIntensity: 2.2 },
    });

    const world = planet({ radius: 6400, seed: 21, sunDir: [0.55, 0.3, 0.78], atmosphere: 0x8ec4ff, segments: 56 });
    world.position.set(1600, -7100, -2600);
    scene.add(world);

    const cor = corvette({ length: 150 });
    cor.rotation.set(0.06, Math.PI * 0.92, 0.2);
    cor.position.set(-30, 120, -260);
    scene.add(cor);

    const sd = starDestroyer({ length: 1600, detail: 0.5 });
    sd.rotation.y = Math.PI * 0.94;
    sd.position.set(240, 300, -1500);
    scene.add(sd);

    const pod = escapePod({ size: 6 });
    scene.add(pod);

    // Re-entry: a plasma cone and a debris trail behind the pod.
    const entry = new THREE.Mesh(
      new THREE.PlaneGeometry(46, 46),
      glowPlane({ color: 0xff9a44, opacity: 0 }),
    );
    entry.renderOrder = 6;
    scene.add(entry);
    const trailMat = glowPlane({ color: 0xff7a30, opacity: 0 });
    const trail = new THREE.Mesh(new THREE.PlaneGeometry(12, 190), trailMat);
    trail.renderOrder = 5;
    scene.add(trail);

    const rig = new CameraRig(camera);
    const podPos = new THREE.Vector3();
    const podPath = (t) => {
      // Drift clear of the corvette, then fall toward the planet.
      const drift = clamp(t / 9);
      const fall = clamp((t - 8) / 20);
      podPos.set(
        lerp(-28, 42, drift) + fall * 60,
        lerp(112, 60, Ease.outQuad(drift)) - Ease.inQuad(fall) * 640,
        lerp(-250, -190, drift) + fall * 130,
      );
      return podPos;
    };

    rig.setTrack([
      // Shot 1: tight on the pod leaving the corvette's flank.
      { t: 0, pos: [-4, 118, -196], look: (t) => podPath(t), fov: 40 },
      { t: 9.6, pos: [10, 96, -170], look: (t) => podPath(t), fov: 34, ease: Ease.inOutQuad },
      // Shot 2: from behind the pod, planet filling the frame.
      { t: 9.601, cut: true, pos: (t) => podPath(t).clone().add(new THREE.Vector3(-26, 16, 34)), look: (t) => podPath(t), fov: 44 },
      { t: 17.4, pos: (t) => podPath(t).clone().add(new THREE.Vector3(-14, 9, 22)), look: (t) => podPath(t), fov: 40, ease: Ease.linear },
      // Shot 3: wide, the pod as a streak entering atmosphere.
      { t: 17.401, cut: true, pos: (t) => podPath(t).clone().add(new THREE.Vector3(210, 70, 260)), look: (t) => podPath(t), fov: 36 },
      { t: DURATION, pos: (t) => podPath(t).clone().add(new THREE.Vector3(150, 40, 200)), look: (t) => podPath(t), fov: 32, ease: Ease.linear },
    ]);

    const dir = new THREE.Vector3();
    const prev = podPath(0).clone();

    return {
      scene,
      camera,
      bloom: 0.8,

      update(t, dt) {
        const p = podPath(t);
        pod.position.copy(p);
        dir.subVectors(p, prev);
        if (dir.lengthSq() > 1e-6) {
          const target = p.clone().add(dir);
          pod.lookAt(target);
        }
        prev.copy(p);
        pod.rotation.z += 0.0;
        pod.rotateZ(Math.sin(t * 0.8) * 0.04);

        // Thruster kick on separation.
        const kick = smoothstep(1.6, 2.1, t) * (1 - smoothstep(2.4, 4.2, t));
        pod.userData.thruster.material.opacity = kick * 0.9;
        pod.userData.thruster.scale.setScalar(0.5 + kick);
        pod.userData.thruster.quaternion.copy(camera.quaternion);

        // Atmospheric entry.
        const heat = smoothstep(17.5, 20.5, t);
        entry.material.opacity = heat * 0.9;
        entry.position.copy(p).add(dir.clone().normalize().multiplyScalar(4));
        entry.quaternion.copy(camera.quaternion);
        entry.scale.setScalar(0.5 + heat * 1.1);
        trailMat.opacity = heat * 0.55;
        trail.position.copy(p).sub(dir.clone().normalize().multiplyScalar(90));
        trail.lookAt(camera.position);
        const up = dir.clone().normalize();
        trail.quaternion.copy(camera.quaternion);
        trail.rotation.z = Math.atan2(up.x, up.y);
        trail.scale.set(1, 0.4 + heat, 1);

        rig.update(t);
      },

      dispose() {},
    };
  },
};
