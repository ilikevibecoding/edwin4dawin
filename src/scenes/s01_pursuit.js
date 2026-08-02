// Sequence 1 -- the chase above Tessaru. A corvette running, and a destroyer
// that keeps entering frame long after you thought it had finished.

import * as THREE from 'three';
import { spaceStage, music, vo, sfx, cameraQuad } from './kit.js';
import { starDestroyer, corvette } from '../models/capital.js';
import { planet } from '../worlds/planet.js';
import { sunBillboard } from '../worlds/space.js';
import { BoltPool, ExplosionPool, turbolaserPool, hullFire } from '../fx/combat.js';
import { evalTrack, CameraRig } from '../core/camera.js';
import { clamp, lerp, smoothstep, Ease, shakeNoise } from '../util/math.js';
import { glowPlane, emissive } from '../gfx/materials.js';
import { radialGlow } from '../gfx/textures.js';

const DURATION = 46;

// Flight plan, in metres and seconds. Both ships run along -Z, and the camera
// sits just under the destroyer's flight path so that its belly enters frame
// from the top and keeps on entering.
const SD_SPEED = 245;
const SD_NOSE_T0 = 100;
const SD_Y = 190;
const COR_SPEED = 250;
const COR_Z0 = -1500;

const sdNoseZ = (t) => SD_NOSE_T0 - SD_SPEED * t;
const corZ = (t) => COR_Z0 - COR_SPEED * t + smoothstep(24, 34, t) * 1500;

export default {
  id: 'pursuit',
  duration: DURATION,
  fadeIn: 1.4,
  fadeOut: 0.9,
  cues: [
    music('imperial', 0.2, { gain: 0.9 }),
    sfx('engineBed', 0, { dur: 44, vel: 0.7, freq: 40 }),
    vo('n1', 1.6),
    vo('n2', 9.6),
    sfx('turbolaser', 15.2), sfx('turbolaser', 15.5), sfx('turbolaser', 16.4),
    sfx('turbolaser', 22.6), sfx('turbolaser', 23.0), sfx('turbolaser', 23.5),
    sfx('explosion', 24.0, { vel: 0.7, size: 0.9 }),
    sfx('turbolaser', 26.2), sfx('turbolaser', 26.6),
    sfx('explosion', 27.1, { vel: 0.9, size: 1.2 }),
    vo('o1', 28.2),
    sfx('klaxon', 31.6, { vel: 0.5, times: 2 }),
    vo('n3', 35.4),
  ],

  build() {
    const { scene, camera, rig: lights } = spaceStage({
      fov: 40, near: 2, far: 80000, nebulaSeed: 91, starCount: 2600, density: 0.7,
      hueA: [50, 34, 130], hueB: [150, 50, 70],
      lights: { keyIntensity: 4.2, keyDir: [0.8, 0.5, 0.4], fillIntensity: 1.2, ambient: 0x2b3a52, ambientIntensity: 2.6 },
    });
    // Planetshine from below, so the destroyer's belly is not a black hole.
    const bounce = new THREE.DirectionalLight(0x7fa2d2, 2.6);
    bounce.position.set(-200, -1000, 300);
    scene.add(bounce);

    // Tessaru fills the lower third of most of these shots.
    const world = planet({ radius: 12000, seed: 21, sunDir: [0.8, 0.35, 0.5], atmosphere: 0x8ec4ff, segments: 56 });
    world.position.set(2000, -14200, -14000);
    scene.add(world);
    scene.add(sunBillboard({ color: 0xfff4de, size: 480, distance: 40000, dir: [0.85, 0.4, 0.5] }));

    const sd = starDestroyer({ length: 1600, detail: 1 });
    sd.rotation.y = Math.PI;       // nose down -Z
    scene.add(sd);

    const cor = corvette({ length: 150 });
    cor.rotation.y = Math.PI;
    scene.add(cor);

    const fires = hullFire({ count: 6, size: 9, seed: 5 });
    fires.visible = false;
    cor.add(fires);
    fires.position.set(0, 2, -40);

    // Weapons.
    const green = turbolaserPool(0x7bff62);
    const red = new BoltPool({ max: 40, color: 0xff5a3a, length: 40, radius: 2.6, speed: 2200 });
    const booms = new ExplosionPool({ max: 10, seed: 8 });
    scene.add(green.group, red.group, booms.group);

    // The corvette shoots back early, then the destroyer answers.
    const corGun = new THREE.Vector3();
    const sdGun = new THREE.Vector3();
    for (let i = 0; i < 6; i++) {
      const t = 3.4 + i * 0.42;
      red.schedule(t, new THREE.Vector3(0, 14, corZ(t) + 40), new THREE.Vector3(60, SD_Y + 60, sdNoseZ(t) - 500), { travel: 0.5 });
    }
    const volleys = [15.2, 15.5, 16.4, 22.6, 23.0, 23.5, 26.2, 26.6];
    for (const t of volleys) {
      const from = new THREE.Vector3((Math.random() - 0.5) * 300, SD_Y + 30, sdNoseZ(t) + 260);
      const to = new THREE.Vector3(0, 10, corZ(t));
      green.schedule(t, from, to, { travel: 0.62 });
    }
    booms.schedule(24.05, new THREE.Vector3(0, 8, 0), { size: 26, dur: 1.6 });
    booms.schedule(27.15, new THREE.Vector3(0, 4, 0), { size: 34, dur: 2.0 });

    // Tractor beam.
    const beamMat = new THREE.MeshBasicMaterial({
      map: radialGlow({ inner: 'rgba(190,230,255,0.9)', mid: 'rgba(120,190,255,0.3)', outer: 'rgba(0,0,0,0)' }),
      color: 0x9fd0ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending,
      depthWrite: false, side: THREE.DoubleSide, toneMapped: false,
    });
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(30, 90, 1, 16, 1, true), beamMat);
    beam.renderOrder = 8;
    scene.add(beam);

    const rig = new CameraRig(camera);
    rig.impulse(24.05, 0.5, 0.8);
    rig.impulse(27.15, 0.9, 1.1);

    // --- shot list -----------------------------------------------------------
    // Shot 1 (0-19): the destroyer arrives over the top of frame.
    // Shot 2 (19-28): reverse, low and wide, the corvette taking fire.
    // Shot 3 (28-37): tight on the corvette as its engines die.
    // Shot 4 (37-46): the bay swallows it.
    const track = [
      { t: 0, pos: [34, -10, 40], look: () => new THREE.Vector3(0, 430, -1050), fov: 42 },
      { t: 19, pos: [60, 10, 90], look: () => new THREE.Vector3(0, 90, -2400), fov: 38, ease: Ease.inOutQuad },

      { t: 19.001, cut: true, pos: (t) => new THREE.Vector3(330, -60, corZ(t) + 620), look: (t) => new THREE.Vector3(0, 40, corZ(t) - 80), fov: 34 },
      { t: 28, pos: (t) => new THREE.Vector3(250, 30, corZ(t) + 540), look: (t) => new THREE.Vector3(0, 30, corZ(t) - 60), fov: 30, ease: Ease.inOutQuad },

      { t: 28.001, cut: true, pos: (t) => new THREE.Vector3(-72, 26, corZ(t) - 128), look: (t) => new THREE.Vector3(0, 6, corZ(t) + 20), fov: 38 },
      { t: 37, pos: (t) => new THREE.Vector3(-96, 8, corZ(t) - 190), look: (t) => new THREE.Vector3(0, 4, corZ(t) + 10), fov: 40, ease: Ease.inOutQuad },

      { t: 37.001, cut: true, pos: (t) => new THREE.Vector3(-620, 150, corZ(t) - 700), look: (t) => new THREE.Vector3(-40, 120, corZ(t) - 120), fov: 40 },
      { t: 46, pos: (t) => new THREE.Vector3(-330, 220, corZ(t) - 520), look: (t) => new THREE.Vector3(0, 150, corZ(t) - 60), fov: 38, ease: Ease.inOutQuad },
    ];
    rig.setTrack(track);

    const tmp = new THREE.Vector3();

    return {
      scene,
      camera,
      bloom: 0.62,

      update(t, dt) {
        const nose = sdNoseZ(t);
        sd.position.set(0, SD_Y, nose + 800);   // group origin is the hull centre
        const cz = corZ(t);
        cor.position.set(0, 0, cz);

        // The corvette loses power, yaws, and gets hauled up into the bay.
        const dead = smoothstep(26.5, 31, t);
        const capture = smoothstep(33, 45, t);
        cor.rotation.z = dead * 0.24 * Math.sin(t * 0.6) + capture * 0.1;
        cor.rotation.x = -dead * 0.05;
        cor.position.y = lerp(0, SD_Y - 40, Ease.inOutCubic(capture));
        cor.position.x = lerp(0, -10, capture);
        for (const halo of cor.userData.engineGlows) {
          halo.material.opacity = (1 - dead) * 0.8;
          halo.scale.setScalar(1 - dead * 0.7);
        }
        fires.visible = dead > 0.05;
        if (fires.visible) fires.userData.update(t, camera);

        // Destroyer engines idle bright.
        for (const halo of sd.userData.engineGlows) {
          halo.material.opacity = 0.75 + 0.12 * Math.sin(t * 1.7 + halo.position.x);
        }

        // Tractor beam from the ventral bay down to the corvette.
        const beamA = smoothstep(31.5, 34, t) * (1 - smoothstep(43, 46, t));
        beamMat.opacity = beamA * 0.55;
        beam.visible = beamA > 0.01;
        if (beam.visible) {
          const bayPos = new THREE.Vector3(0, SD_Y - 14, nose + 800 + 176);
          const target = cor.position.clone().add(new THREE.Vector3(0, 20, 0));
          const mid = bayPos.clone().add(target).multiplyScalar(0.5);
          const len = bayPos.distanceTo(target);
          beam.position.copy(mid);
          beam.scale.set(1, Math.max(1, len), 1);
          beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tmp.subVectors(target, bayPos).normalize());
        }

        green.update(t, camera);
        red.update(t, camera);
        booms.update(t, camera);
        rig.update(t);
      },

      dispose() {},
    };
  },
};
