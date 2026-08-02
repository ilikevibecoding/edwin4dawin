/**
 * Scene 1 — the chase.
 *
 *   0.0  establishing: the corvette runs for a desert world
 *   5.2  the reveal: a Star Destroyer slides in over the camera and keeps coming
 *  11.6  reverse angle from the destroyer's bow, turbolasers open up
 *  17.4  tight on the engine bank as it is shot out, one bell at a time
 *  24.0  the dead corvette drifts under a wall of grey
 */
import * as THREE from 'three';
import { corvette, starDestroyer, setEngineGlow } from '../models/ships.js';
import { spaceBackdrop, planet } from '../models/environments.js';
import {
  lightRig, Bolts, volley, Impacts, Fireball, Smoke,
  beat, clamp, lerp, smoothstep, noise, flash,
} from './_kit.js';

export const id = 'chase';

const S0 = 0, S1 = 5.2, S2 = 11.6, S3 = 17.4, S4 = 24.0, END = 30;

export async function build(ctx) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  const lights = lightRig(scene, 'space', { shadows: false, fog: false });
  lights.key.position.set(600, 300, 400);

  scene.add(spaceBackdrop({ seed: 22, radius: 5200, count: 5200 }));

  const world = planet({ radius: 620, type: 'desert', seed: 4242, seg: 72 });
  world.position.set(1150, -560, -3100);
  world.userData.setSunDir(new THREE.Vector3(600, 300, 400).normalize());
  scene.add(world);

  // the reveal is lit from below-front so the underside greebles read against space
  const revealFill = new THREE.DirectionalLight(0xa9c4ff, 0);
  revealFill.position.set(-40, -120, 90);
  scene.add(revealFill, revealFill.target);

  const cv = corvette({ seed: 11 });
  scene.add(cv);
  const sd = starDestroyer({ seed: 7 });
  scene.add(sd);

  /* --- ordnance ------------------------------------------------------- */

  // shot 0: a few ranging shots streak past the camera
  const b0 = new Bolts(scene, [
    ...volley({ t0: 1.6, count: 3, interval: 0.22, from: [40, 34, 120], to: [-14, 1, -320], speed: 420, color: 0x63ff4a, len: 16, thick: 0.4, seed: 3, spread: 34 }),
    ...volley({ t0: 3.4, count: 4, interval: 0.19, from: [-38, 30, 130], to: [-4, 3, -340], speed: 430, color: 0x63ff4a, len: 16, thick: 0.4, seed: 9, spread: 26 }),
  ]);

  // shot 2: sustained turbolaser fire from the destroyer's bow
  const b2 = new Bolts(scene, [
    ...volley({ t0: S2 + 1.0, count: 5, interval: 0.28, from: [4, -6, -200], to: [-34, 5, -470], speed: 520, color: 0x63ff4a, len: 22, thick: 0.5, seed: 5, spread: 22, fromSpread: 22 }),
    ...volley({ t0: S2 + 3.1, count: 6, interval: 0.24, from: [0, -10, -190], to: [-34, 5, -500], speed: 520, color: 0x63ff4a, len: 22, thick: 0.5, seed: 15, spread: 16, fromSpread: 22 }),
  ]);
  const i2 = new Impacts(scene, b2.impacts().map((h) => ({ t: h.t, pos: [h.pos.x, h.pos.y, h.pos.z], size: 5, color: 0x9dffb0 })));

  // shot 3: hits landing on the engine bank, seen from behind
  const engineHits = [
    { t: S3 + 1.4, e: 10 }, { t: S3 + 2.0, e: 7 }, { t: S3 + 2.9, e: 4 },
    { t: S3 + 3.6, e: 9 }, { t: S3 + 4.4, e: 1 }, { t: S3 + 5.0, e: 6 },
  ];
  const b3 = new Bolts(scene, engineHits.map((h, i) => ({
    t0: h.t - 0.36, from: [-22 + i * 7, 34 - i * 3, 150], to: [-3 + (i % 3) * 2.6, 6.5, 27], speed: 380, color: 0x63ff4a, len: 14, thick: 0.36,
  })));
  const fires = engineHits.map((h, i) => new Fireball(scene, {
    t0: h.t, pos: [-5 + (i % 3) * 4.0, 5.2 + (i % 2) * 2.4, 27], size: 4.2, dur: 1.15, seed: 30 + i, brickCount: 12, gravity: 0, ring: false,
  }));

  const wreckSmoke = new Smoke(cv, {
    t0: S3 + 1.6, count: 26, origin: [-2, 6, 27], spread: 9, size: 7, rise: 0.5,
    life: 4.2, opacity: 0.42, color: 0x5a626b, spawnWindow: 5.5, seed: 12,
  });
  const driftSmoke = new Smoke(cv, {
    t0: S4 - 1, count: 22, origin: [0, 2, 28], spread: 12, size: 9, rise: 0.25,
    life: 6, opacity: 0.3, color: 0x4d545c, spawnWindow: 6, seed: 44,
  });

  /* --- helpers -------------------------------------------------------- */

  const tmp = new THREE.Vector3();
  const place = (o, x, y, z, ry = 0, rz = 0, rx = 0) => {
    o.position.set(x, y, z);
    o.rotation.set(rx, ry, rz);
  };

  return {
    scene,

    cues: [
      { t: 0.15, sfx: 'enginePass', opts: { gain: 0.55, dur: 2.6 } },
      { t: 1.62, sfx: 'turbolaser', opts: { gain: 0.5 } },
      { t: 3.42, sfx: 'turbolaser', opts: { gain: 0.55 } },
      { t: S1 + 0.2, sfx: 'engineRumble', opts: { gain: 0.85, dur: 7.5 } },
      { t: S1 + 0.4, sfx: 'rumbleSub', opts: { gain: 0.9, dur: 6.4 } },
      { t: S2 + 1.0, sfx: 'turbolaser', opts: { gain: 0.9 } },
      { t: S2 + 1.3, sfx: 'turbolaser', opts: { gain: 0.85 } },
      { t: S2 + 1.6, sfx: 'turbolaser', opts: { gain: 0.9 } },
      { t: S2 + 3.1, sfx: 'turbolaser', opts: { gain: 0.95 } },
      { t: S2 + 3.5, sfx: 'turbolaser', opts: { gain: 0.9 } },
      { t: S2 + 3.9, sfx: 'turbolaser', opts: { gain: 0.95 } },
      ...engineHits.map((h) => ({ t: h.t, sfx: 'hullImpact', opts: { gain: 0.9 } })),
      ...engineHits.slice(0, 4).map((h) => ({ t: h.t + 0.05, sfx: 'explosion', opts: { gain: 0.6, size: 0.6 } })),
      { t: S3 + 0.6, sfx: 'alarm', opts: { gain: 0.35, dur: 6 } },
      { t: S4 + 0.3, sfx: 'ionDrone', opts: { gain: 0.5, dur: 5.5 } },
    ],

    update(t, c) {
      const cam = c.camera;
      cam.up.set(0, 1, 0);

      // engines die on schedule, recomputed from scratch every frame
      const eng = cv.userData.engines || [];
      for (let i = 0; i < eng.length; i++) {
        const dead = engineHits.some((h) => h.e === i && t > h.t);
        cv.userData.killEngine(i, dead);
      }
      // engine glow is kept modest: eleven bells at full bore just blow out to white
      cv.userData.setThrottle(t < S3 ? 0.62 : t < S4 ? 0.5 * clamp(1 - beat(t, S3 + 1.2, S3 + 5.4)) : 0);
      revealFill.intensity = (t > S1 && t < S2) || t > S4 ? 2.4 : 0;

      b0.update(t); b2.update(t); i2.update(t); b3.update(t);
      for (const f of fires) f.update(t);
      wreckSmoke.update(t);
      driftSmoke.update(t);
      flash(c.stage, t, [
        ...engineHits.slice(0, 5).map((h) => ({ t: h.t, dur: 0.22, amount: 0.28, color: 0xffd9a0 })),
      ]);

      if (t < S1) {
        /* --- establishing: the corvette runs, close enough to read ----- */
        const k = t / (S1 - S0);
        place(cv, 0, 0, -62 - 34 * t, 0.05, Math.sin(t * 0.7) * 0.05);
        place(sd, 0, 400, 1400);
        const push = smoothstep(0, 1, k);
        cam.position.set(26 + push * 14, 9 + push * 5, 34 + push * 26);
        cam.lookAt(cv.position.x - 2, cv.position.y + 1, cv.position.z + 18);
        cam.fov = 40 - push * 4;
      } else if (t < S2) {
        /* --- the reveal: the hull arrives and keeps arriving ----------- */
        const k = beat(t, S1, S2);
        place(cv, 3, -3, -300 - 26 * (t - S1), 0.02, 0);
        // group origin sits ~150 behind the nose, so drive the nose directly
        const noseZ = 96 - 74 * (t - S1);
        place(sd, -14, 30, noseZ + 150, Math.PI * 0.004, 0.012);
        cam.position.set(0, -18, 62);
        cam.lookAt(-4, 30 - k * 40, -150);
        cam.rotateZ(-0.015 + k * 0.045);
        cam.fov = 52 - k * 10;
      } else if (t < S3) {
        /* --- reverse: a wall of grey on one side, a speck on the other - */
        const k = beat(t, S2, S3);
        place(cv, -22, 16, -250 - 20 * (t - S2), 0.03, Math.sin(t) * 0.03);
        place(sd, 14, -34, -110, 0.02, 0.008);
        cam.position.set(104 - k * 12, 44 - k * 10, 24 - k * 12);
        cam.lookAt(-16 + k * 4, 12, -300);
        cam.fov = 36 - k * 5;
      } else if (t < S4) {
        /* --- engines shot out, from just off the tail ------------------ */
        const k = beat(t, S3, S4);
        const yaw = 0.03 * Math.sin(t * 1.7) * k + 0.14 * beat(t, S3 + 4.2, S4);
        const roll = 0.09 * beat(t, S3 + 3.4, S4) * Math.sin(t * 0.9);
        place(cv, 0, 0, 0, yaw, roll);
        place(sd, 60, 130, 900, 0.02, 0);
        const shake = 0.6 * engineHits.reduce((a, h) => a + Math.max(0, 1 - Math.abs(t - h.t) * 5), 0);
        cam.position.set(54 + noise(t * 0.7, 1) * 0.9 * shake, 22 + noise(t * 0.8, 2) * 0.9 * shake, 58 - k * 8);
        cam.lookAt(0, 5, 10);
        cam.rotateZ(noise(t * 3.1, 5) * 0.018 * shake);
        cam.fov = 32;
      } else {
        /* --- drifting under a wall of grey ---------------------------- */
        const k = beat(t, S4, END);
        const list = 0.2 + k * 0.1;
        // side on now, so the dead ship reads as a silhouette against the hull behind it
        place(cv, -6, -2, -76, 1.42 + k * 0.06, list, 0.05 * Math.sin(t * 0.4));
        place(sd, -18, 96, -250 + 40 * k, 0.06, 0.015);
        cam.position.set(38 - k * 6, 4 + k * 3, 26 - k * 9);
        cam.lookAt(-14, 12 + k * 6, -150);
        cam.fov = 40 + k * 4;
      }

      // the planet is a backdrop: park it where it composes for the shot in hand
      if (t < S2) world.position.set(1150, -560, -3100);
      else if (t < S3) world.position.set(-1500, -640, -3200);
      else if (t < S4) world.position.set(-2400, -900, -2600);
      else world.position.set(1500, -700, -3000);

      cam.updateProjectionMatrix();
      world.userData.update?.(t);
    },
  };
}
