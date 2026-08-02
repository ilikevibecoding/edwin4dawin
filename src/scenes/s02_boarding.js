// Sequence 2 -- boarding. A corridor, a hole cut in the door, and the tallest
// thing in the galaxy walking through it.

import * as THREE from 'three';
import { makeStage } from '../core/film.js';
import { music, vo, sfx } from './kit.js';
import { corridorSection, blastDoor } from '../models/props.js';
import { stormtrooper, vashek, rigHumanoid, walk, idle } from '../models/chars.js';
import { BoltPool, SparkPool } from '../fx/combat.js';
import { CameraRig } from '../core/camera.js';
import { paint, emissive, glowPlane } from '../gfx/materials.js';
import { smokeSprite } from '../gfx/textures.js';
import { clamp, lerp, smoothstep, Ease } from '../util/math.js';
import { RNG } from '../util/rng.js';

const DURATION = 31;
const BREACH_T = 4.6;
const VASHEK_ENTER = 9.5;

export default {
  id: 'boarding',
  duration: DURATION,
  fadeIn: 0.6,
  fadeOut: 0.7,
  cues: [
    music('menace', 0.4, { gain: 0.95 }),
    sfx('roomTone', 0, { dur: 30, vel: 0.9 }),
    sfx('klaxon', 0.6, { vel: 0.4, times: 3 }),
    vo('n4', 0.9),
    sfx('clang', BREACH_T - 0.15, { vel: 1.0 }),
    sfx('explosion', BREACH_T, { vel: 0.6, size: 0.5 }),
    ...[0, 0.18, 0.42, 0.55, 0.8, 1.1, 1.35, 1.6, 2.0, 2.3].map((d) => sfx('blaster', BREACH_T + 0.6 + d, { vel: 0.75, pitch: 1 + (d % 0.3) })),
    sfx('breath', VASHEK_ENTER - 0.6, { vel: 0.9 }),
    sfx('breath', VASHEK_ENTER + 2.7, { vel: 0.9 }),
    vo('v1', 12.4),
    sfx('breath', 15.6, { vel: 0.8 }),
    vo('o2', 16.0),
    vo('v2', 20.6),
    sfx('breath', 22.9, { vel: 0.85 }),
    vo('n5', 24.6),
  ],

  build() {
    const { scene, camera } = makeStage({
      background: 0x05070a,
      fog: new THREE.Fog(0x0a1018, 14, 90),
      fov: 46, near: 0.05, far: 300,
    });
    scene.add(camera);

    // Corridor: five modules running down -Z, with a sealed door at the end.
    const corridor = new THREE.Group();
    scene.add(corridor);
    for (let i = 0; i < 6; i++) {
      const sec = corridorSection({ length: 8, seed: i + 1, lit: true });
      sec.position.z = -i * 8;
      corridor.add(sec);
    }
    const door = blastDoor({ width: 6.4, height: 3.4 });
    door.position.set(0, 0, -46);
    corridor.add(door);

    // The breach: a glowing cut, then a hole with smoke pouring through.
    const cutMat = emissive(0xff9c3a, { opacity: 0, blending: THREE.AdditiveBlending });
    const cut = new THREE.Mesh(new THREE.RingGeometry(1.05, 1.25, 24), cutMat);
    cut.position.set(0, 1.6, -45.7);
    cut.renderOrder = 6;
    scene.add(cut);
    const hole = new THREE.Mesh(new THREE.CircleGeometry(1.15, 24), paint(0x000000));
    hole.position.set(0, 1.6, -45.72);
    hole.visible = false;
    scene.add(hole);
    const breachGlow = new THREE.Mesh(new THREE.PlaneGeometry(9, 7), glowPlane({ color: 0xffb060, opacity: 0 }));
    breachGlow.position.set(0, 1.6, -45.3);
    breachGlow.renderOrder = 7;
    scene.add(breachGlow);

    // Smoke drifting into the corridor.
    const smokes = [];
    const rr = new RNG(3);
    for (let i = 0; i < 12; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), new THREE.MeshBasicMaterial({
        map: smokeSprite(), color: 0x8a8b8c, transparent: true, opacity: 0, depthWrite: false,
      }));
      m.userData = { phase: rr.float(0, 6), x: rr.float(-2.4, 2.4), y: rr.float(0.4, 3.2), z: rr.float(-46, -33), rise: rr.float(0.05, 0.3) };
      m.renderOrder = 5;
      scene.add(m);
      smokes.push(m);
    }

    // Rebel defenders in the near half, troopers pouring through the breach.
    const rebels = [];
    for (let i = 0; i < 3; i++) {
      const r = rigHumanoid({ height: 1.76, material: paint(0xb8a98a), suit: paint(0x4a4336), headMaterial: paint(0xc79a72) });
      r.position.set([-1.9, 1.7, -0.4][i], 0, [-14, -17, -21][i]);
      r.rotation.y = Math.PI;
      scene.add(r);
      rebels.push(r);
    }
    const troopers = [];
    for (let i = 0; i < 6; i++) {
      const s = stormtrooper({ height: 1.83 });
      s.position.set((i % 3 - 1) * 1.5, 0, -47 - (i > 2 ? 3 : 0));
      s.visible = false;
      scene.add(s);
      troopers.push(s);
    }

    const lord = vashek({ height: 2.06 });
    lord.position.set(0, 0, -48);
    scene.add(lord);
    const lordRim = new THREE.PointLight(0xbcd8ff, 0, 16, 2);
    lordRim.position.set(0.4, 2.6, -2.4);
    lord.add(lordRim);
    const lordKey = new THREE.PointLight(0xffb07a, 0, 14, 2);
    lordKey.position.set(-1.6, 2.0, 2.2);
    lord.add(lordKey);

    // Officer beside him for the exchange.
    const officer = rigHumanoid({ height: 1.78, material: paint(0x4a4a44), suit: paint(0x2a2a26), headMaterial: paint(0xcaa07a) });
    officer.position.set(1.5, 0, -44);
    officer.rotation.y = Math.PI * 0.86;
    officer.visible = false;
    scene.add(officer);

    // Lighting: hard practicals, plus one hot key from the breach.
    scene.add(new THREE.AmbientLight(0x2a3a52, 1.2));
    const key = new THREE.DirectionalLight(0xbcd0e8, 1.1);
    key.position.set(2, 6, 3);
    scene.add(key);
    const breachLight = new THREE.PointLight(0xff8a40, 0, 40, 2);
    breachLight.position.set(0, 2, -44);
    scene.add(breachLight);
    const backLight = new THREE.PointLight(0xbcd8ff, 90, 40, 2);
    backLight.position.set(0, 3, -50);
    scene.add(backLight);

    const bolts = new BoltPool({ max: 60, color: 0xff4a30, length: 2.6, radius: 0.12, speed: 130 });
    const sparks = new SparkPool({ bursts: 10, per: 20, size: 0.14, color: 0xffc27a });
    scene.add(bolts.group, sparks.group);
    const rng = new RNG(9);
    for (let i = 0; i < 22; i++) {
      const t = BREACH_T + 0.6 + i * 0.22 + rng.float(0, 0.1);
      const fromTrooper = i % 2 === 0;
      const from = fromTrooper
        ? new THREE.Vector3(rng.float(-1.6, 1.6), 1.4, -45)
        : new THREE.Vector3(rng.float(-1.8, 1.8), 1.3, -18);
      const to = fromTrooper
        ? new THREE.Vector3(rng.float(-2, 2), rng.float(0.6, 2.2), -16)
        : new THREE.Vector3(rng.float(-2, 2), rng.float(0.8, 2.4), -45);
      bolts.schedule(t, from, to, { color: fromTrooper ? 0xff3a22 : 0x5aff7a, travel: 0.22 });
      sparks.schedule(t + 0.22, to, { speed: 4, dur: 0.35, color: fromTrooper ? 0xffb070 : 0x9fffb0 });
    }

    const rig = new CameraRig(camera);
    rig.handheld = 0.012;
    rig.impulse(BREACH_T, 0.9, 0.5);

    // Shot 1: down the corridor at the door. Shot 2: low angle as troopers
    // advance. Shot 3: the Lord, from below.
    rig.setTrack([
      { t: 0, pos: [0.6, 1.75, -8], look: [0, 1.7, -46], fov: 50 },
      { t: 8.4, pos: [0.2, 1.6, -14], look: [0, 1.7, -46], fov: 46, ease: Ease.inOutQuad },

      { t: 8.401, cut: true, pos: [2.4, 0.65, -32], look: [-0.4, 1.7, -46], fov: 40 },
      { t: 14.6, pos: [2.0, 0.8, -35], look: [-0.2, 1.8, -46], fov: 38, ease: Ease.linear },

      { t: 14.601, cut: true, pos: [-1.9, 1.15, -34.5], look: () => new THREE.Vector3(lord.position.x, 1.35, lord.position.z), fov: 40 },
      { t: 24.2, pos: [-1.3, 1.25, -33.0], look: () => new THREE.Vector3(lord.position.x, 1.4, lord.position.z), fov: 38, ease: Ease.inOutQuad },

      { t: 24.201, cut: true, pos: [0, 2.6, -22], look: () => new THREE.Vector3(lord.position.x, 1.2, lord.position.z + 2), fov: 52 },
      { t: DURATION, pos: [0, 2.4, -26], look: () => new THREE.Vector3(lord.position.x, 1.3, lord.position.z + 2), fov: 50, ease: Ease.inOutQuad },
    ]);

    return {
      scene,
      camera,
      bloom: 0.75,

      update(t, dt) {
        // Breach.
        const cutT = clamp((t - (BREACH_T - 2.4)) / 2.4);
        cutMat.opacity = cutT * (1 - smoothstep(BREACH_T, BREACH_T + 0.4, t)) * 0.9;
        cut.scale.setScalar(0.3 + cutT * 0.75);
        hole.visible = t > BREACH_T;
        breachGlow.material.opacity = smoothstep(BREACH_T - 0.2, BREACH_T + 0.3, t) * (0.55 - smoothstep(BREACH_T, BREACH_T + 8, t) * 0.42);
        breachLight.intensity = smoothstep(BREACH_T - 0.3, BREACH_T + 0.2, t) * (160 - smoothstep(BREACH_T, BREACH_T + 6, t) * 120);

        for (const m of smokes) {
          const d = m.userData;
          const age = ((t - BREACH_T) * 0.22 + d.phase) % 6;
          m.position.set(d.x, d.y + age * d.rise * 4, d.z + age * 1.4);
          m.material.opacity = t > BREACH_T ? Math.sin((age / 6) * Math.PI) * 0.18 : 0;
          m.quaternion.copy(camera.quaternion);
          m.scale.setScalar(3 + age);
        }

        // Troopers advance through the hole after the breach.
        troopers.forEach((s, i) => {
          const start = BREACH_T + 0.35 + i * 0.28;
          const p = clamp((t - start) / 5.5);
          s.visible = t > start;
          if (!s.visible) return;
          s.position.z = lerp(-46.5, -30 + i * 1.4, Ease.outQuad(p));
          s.position.x = (i % 3 - 1) * 1.45 + Math.sin(i) * 0.3;
          s.rotation.y = Math.PI;
          if (p < 1) walk(s.userData.rig, (t - start) * 7 + i, { stride: 0.55, arms: 0.2 });
          else idle(s.userData.rig, t + i);
        });

        rebels.forEach((r, i) => {
          const dead = t > BREACH_T + 2.2 + i * 0.9;
          if (dead) {
            r.rotation.x = lerp(r.rotation.x, -1.45, 0.08);
            r.position.y = lerp(r.position.y, 0.1, 0.08);
          } else {
            idle(r.userData.rig, t * 1.6 + i * 2);
            r.userData.rig.arms[1].shoulder.rotation.x = -1.4;
            r.userData.rig.arms[0].shoulder.rotation.x = -1.3;
          }
        });

        // The Dark Lord walks in.
        const walkP = clamp((t - VASHEK_ENTER) / 6.5);
        lord.position.z = lerp(-47.5, -40.5, Ease.inOutQuad(walkP));
        lord.rotation.y = 0;
        if (walkP > 0 && walkP < 1) walk(lord.userData.rig, (t - VASHEK_ENTER) * 3.4, { stride: 0.34, arms: 0.16, bounce: 0.008 });
        else idle(lord.userData.rig, t * 0.6, { amount: 0.4 });
        lord.userData.swayCape(t, 1);
        const lordLit = smoothstep(VASHEK_ENTER, VASHEK_ENTER + 1.5, t);
        lordRim.intensity = lordLit * 26;
        lordKey.intensity = lordLit * 4.5;

        officer.visible = t > 15.2;
        if (officer.visible) {
          idle(officer.userData.rig, t * 1.2);
          officer.position.set(1.35, 0, -38.6);
          officer.rotation.y = Math.PI * 0.78;
        }

        bolts.update(t, camera);
        sparks.update(t);
        rig.update(t);
      },

      dispose() {},
    };
  },
};
