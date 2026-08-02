import * as THREE from 'three';
import { ShotList } from '../engine/camera.js';
import { tryMake, setupScene } from './_kit.js';
import { Motes, lightShaft } from '../engine/effects.js';
import { Lightsaber } from '../lego/minifig.js';
import { C } from '../lego/palette.js';
import { ramp, env, ease, clamp, lerp } from '../engine/util.js';

/*
 * Chapter 7 -- the hermit's hut, the chest, and the blade.
 * Warm, still, low-key. The ignition is the only bright thing in the room.
 */

export default {
  id: 'saber',
  dur: 34,
  async build(ctx) {
    const root = new THREE.Group();
    setupScene(ctx, 'interior', {
      background: 0x1a120c, envIntensity: 0.19, fog: [0x1a120c, 40, 200],
      shadowSize: 34,
    });

    const hut = await tryMake('hermithut', {}, { size: [26, 12, 26], color: C.darkTan });
    root.add(hut);

    // warm daylight through the doorway
    const shaft = lightShaft(1.4, 4.4, 14, 0xffd9a0, 0.035);
    shaft.position.set(-6, 8, 6);
    shaft.rotation.z = 0.35;
    root.add(shaft);
    const key = new THREE.PointLight(0xffcf96, 26, 40, 2);
    key.position.set(-5, 9, 8);
    root.add(key);

    const obiwan = await tryMake('obiwan', {}, { size: [1.8, 5, 1], color: C.darkTan });
    obiwan.position.set(-2.6, 0, -1.5);
    obiwan.rotation.y = Math.PI * 0.72;
    root.add(obiwan);

    const luke = await tryMake('luke', {}, { size: [1.8, 5, 1], color: C.white });
    luke.position.set(3.2, 0, 2.4);
    luke.rotation.y = -Math.PI * 0.78;
    root.add(luke);

    // the saber itself lives in this scene so we can hand it over
    const saber = new Lightsaber({ color: C.transLightBlue, coreColor: 0xeaf6ff, len: 4.6 });
    root.add(saber.object3D);

    const glowFromBlade = new THREE.PointLight(0x9fd8ff, 0, 26, 2);
    root.add(glowFromBlade);

    const motes = new Motes(ctx.scene, { count: 130, box: [16, 10, 16], size: 0.055, color: 0xffe0b8, seed: 44, speed: 0.28 });

    const k1 = ctx.cue('k1', 1.2);
    const k2 = ctx.cue('k2', 6.5);
    const k3 = ctx.cue('k3', 14.0);
    const k4 = ctx.cue('k4', 24.0);
    const HANDOVER = k2 + 1.2;
    const IGNITE = HANDOVER + 2.6;

    const shots = new ShotList();
    shots.add({          // 1. the chest opening, low and close
      t: 0, dur: k2 - 0.8, fov: 34, ease: 'linear',
      pos: [5.0, 3.4, 9.5], to: [4.2, 3.8, 8.0],
      look: () => obiwan.position.clone().add(new THREE.Vector3(0, 3.4, 0)),
      handheld: 0.3,
    });
    shots.add({          // 2. the handover, two shot
      t: k2 - 0.8, dur: (IGNITE - 0.7) - (k2 - 0.8), fov: 36, ease: 'inOutQuad',
      pos: [-1.0, 5.4, 11.5], to: [0.4, 5.0, 10.0],
      look: [0.4, 4.2, 0.4], handheld: 0.26,
    });
    shots.add({          // 3. ignition, close on the blade
      t: IGNITE - 0.7, dur: 4.2, fov: 30, ease: 'outQuad',
      pos: [5.6, 5.2, 9.0], to: [4.4, 5.6, 7.6],
      look: () => saber.object3D.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 2.0, 0)),
      handheld: 0.25,
    });
    shots.add({          // 4. Obi-Wan, lit blue from below
      t: IGNITE + 3.5, dur: (k4 - 0.6) - (IGNITE + 3.5), fov: 32, ease: 'linear',
      pos: [1.8, 5.2, 6.6], to: [1.2, 5.1, 5.6],
      look: () => obiwan.position.clone().add(new THREE.Vector3(0, 4.4, 0)),
      handheld: 0.22,
    });
    shots.add({          // 5. Luke's face, resolved
      t: k4 - 0.6, dur: ctx.dur - (k4 - 0.6), fov: 28, ease: 'inOutQuad',
      pos: [-2.6, 5.6, 9.2], to: [-1.6, 5.5, 8.0],
      look: () => luke.position.clone().add(new THREE.Vector3(0, 4.5, 0)),
      handheld: 0.2,
    });

    return {
      root,
      shots,
      exposure: 1.15,
      grade: { uVignette: 0.5, uGrain: 0.036, uSaturation: 1.05 },
      update(t, dt) {
        const of = obiwan.userData.fig;
        const lf = luke.userData.fig;

        // the saber passes from one hand to the other
        const pass = clamp(ramp(t, HANDOVER, HANDOVER + 1.6), 0, 1);
        const obiHand = of?.hands?.R;
        const lukeHand = lf?.hands?.R;
        const a = new THREE.Vector3(), b = new THREE.Vector3();
        if (obiHand) obiHand.getWorldPosition(a); else a.set(-2.0, 4.2, -1.0);
        if (lukeHand) lukeHand.getWorldPosition(b); else b.set(2.6, 4.2, 2.0);
        saber.object3D.position.copy(a).lerp(b, ease.inOutCubic(pass));
        saber.object3D.rotation.set(
          lerp(-1.5, -0.15, pass),
          lerp(0.6, -0.5, pass),
          lerp(0.3, 0.05, pass),
        );

        if (of) {
          of.setPose(t < HANDOVER ? 'reach' : (t < IGNITE ? 'hold_right' : 'idle'), 0.06);
          of.lookAt(luke.position.clone().setY(5.0), 0.75);
          of.update(dt, t);
        }
        if (lf) {
          lf.setPose(t < HANDOVER + 0.4 ? 'idle' : (t < IGNITE ? 'reach' : 'saber_guard'), 0.06);
          lf.lookAt(saber.object3D.position.clone().add(new THREE.Vector3(0, 1.5, 0)), 0.8);
          lf.update(dt, t);
        }

        // ignition
        const ign = clamp(ramp(t, IGNITE, IGNITE + 0.55), 0, 1);
        saber.setExtension(ease.outQuad(ign));
        saber.update(dt, t);
        const bladeMid = saber.object3D.position.clone().add(new THREE.Vector3(0, 2.4 * ign, 0));
        glowFromBlade.position.copy(bladeMid);
        glowFromBlade.intensity = 30 * ign * (0.9 + Math.sin(t * 27) * 0.08);

        key.intensity = 26 * (0.96 + Math.sin(t * 0.7) * 0.04);
        motes.update(t);
        hut.userData.update?.(t, dt);
      },
    };
  },
};
