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
 *
 * The hut has no fourth wall on +Z, so the chapter is shot from the front-right
 * -- away from the table, which keeps the oil lamp out of the middle of frame --
 * and both actors are turned out toward that corner: bodies about 30 degrees
 * open off their own eyeline, head turns deliberately partial. That is what
 * keeps a two-shot on two faces instead of two profiles. Luke is staged with
 * his right hand toward camera so the blade he is given is never behind him.
 */

/**
 * Poses are read off a single seek, so they cannot be an exponential chase
 * toward a target: assert the outgoing pose at full strength, then lerp toward
 * the incoming one by a function of t.
 */
function poseChain(fig, stages) {
  for (const [name, amount] of stages) {
    const a = clamp(amount, 0, 1);
    if (a > 0) fig.setPose(name, a);
  }
}

export default {
  id: 'saber',
  dur: 34,
  async build(ctx) {
    const root = new THREE.Group();
    setupScene(ctx, 'interior', {
      background: 0x1a120c, envIntensity: 0.19, fog: [0x1a120c, 40, 200],
      shadowSize: 34,
    });

    // The set's practicals are dialled for a wide master -- a 90 candela lamp
    // one brick above the table top -- and at the distances this chapter shoots
    // from they clip the table to white. Take the set dark and light it here.
    const hut = await tryMake('hermithut', { lights: false }, { size: [26, 12, 26], color: C.darkTan });
    root.add(hut);

    // The lamp bulb is a GLOW sphere written well over the 1.3 bloom threshold,
    // which is what put a white hole on the table. Bring it down to a warm amber
    // under the threshold, on a clone: mat() hands out shared materials.
    const bulb = hut.getObjectByName(`abs_glow_${C.transNeonOrange.toString(16)}`);
    if (bulb) {
      bulb.material = bulb.material.clone();
      bulb.material.color.setRGB(0.36, 0.11, 0.03);
    }

    // Stone in a shuttered room: without a bounce term the walls go to black and
    // take Ben's cowl with them.
    root.add(new THREE.HemisphereLight(0xffd9a8, 0x2a1c10, 0.55));

    // High enough over the table that the glossy top plate does not throw a
    // clipped specular back at the lens.
    const lamp = new THREE.PointLight(0xffb464, 4.6, 22, 2);
    lamp.position.set(-2.05, 5.2, 1.5);
    root.add(lamp);
    const slit = new THREE.PointLight(0xffe6c0, 14, 26, 2);    // window slit
    slit.position.set(7.0, 4.4, 2.5);
    root.add(slit);
    const spill = new THREE.PointLight(0xcfe0ff, 60, 54, 2);   // the open front
    spill.position.set(0, 10.5, 13.0);
    root.add(spill);
    // low and on the camera side, so it gets in under the cowl
    const fill = new THREE.PointLight(0xffdcb4, 22, 30, 2);
    fill.position.set(6.4, 4.8, 5.6);
    root.add(fill);

    // afternoon light through the slit, landing across the sleeping mat
    const shaft = lightShaft(1.0, 3.4, 10, 0xffd9a0, 0.03);
    shaft.position.set(8.0, 3.6, 2.5);
    shaft.rotation.z = -1.05;
    root.add(shaft);

    const key = new THREE.PointLight(0xffcf96, 46, 46, 2);
    key.position.set(6.6, 8.4, 8.4);
    root.add(key);

    const obiwan = await tryMake('obiwan', { saber: 0 }, { size: [1.8, 5, 1], color: C.darkTan });
    obiwan.position.set(3.4, 0, -2.8);
    obiwan.rotation.y = -0.445;
    root.add(obiwan);
    // Ben is built holding his own lit blade, in the same fist as the one being
    // handed over. Two blades in one place is what read as a white streak.
    if (obiwan.userData.saber) obiwan.userData.saber.object3D.visible = false;

    const luke = await tryMake('luke', {}, { size: [1.8, 5, 1], color: C.white });
    luke.position.set(0.2, 0, -0.6);
    luke.rotation.y = 1.65;
    root.add(luke);

    // The saber itself lives in this scene so we can hand it over. A saturated
    // blue with a barely-tinted core: the class whitens the core 55% of the way
    // to `coreColor`, so anything near white there comes back a white blade.
    const saber = new Lightsaber({ color: 0x2f8bff, coreColor: 0x9ad2ff, len: 4.6 });
    root.add(saber.object3D);

    const glowFromBlade = new THREE.PointLight(0x6fc0ff, 0, 18, 2);
    root.add(glowFromBlade);

    const motes = new Motes(ctx.scene, { count: 130, box: [16, 10, 16], size: 0.055, color: 0xffe0b8, seed: 44, speed: 0.28 });

    const k1 = ctx.cue('k1', 1.2);
    const k2 = ctx.cue('k2', 6.5);
    const k3 = ctx.cue('k3', 14.0);
    const k4 = ctx.cue('k4', 24.0);
    const HANDOVER = k2 + 1.2;
    const IGNITE = HANDOVER + 2.6;
    const SWING = k3 + 3.2;          // the saber_swing cue in the mix

    const obiHead = () => obiwan.position.clone().add(new THREE.Vector3(0, 4.9, 0));
    const lukeHead = () => luke.position.clone().add(new THREE.Vector3(0, 4.9, 0));
    const bladeAt = (h) => saber.object3D.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, h, 0));

    const shots = new ShotList();
    shots.add({          // 1. the room: chest, lamp, the two of them
      t: 0, dur: k2 - 0.9, fov: 38, ease: 'linear',
      pos: [9.0, 7.4, 10.6], to: [8.2, 7.0, 9.4],
      look: [1.6, 4.5, -1.9],
      handheld: 0.28,
    });
    shots.add({          // 2. the handover, three-quarter two shot
      t: k2 - 0.9, dur: (IGNITE - 0.5) - (k2 - 0.9), fov: 34, ease: 'inOutQuad',
      pos: [7.8, 6.4, 7.6], to: [7.2, 6.2, 6.8],
      look: [1.7, 4.4, -1.8], handheld: 0.26,
    });
    shots.add({          // 3. ignition: the blade comes up past Luke's face
      t: IGNITE - 0.5, dur: 3.9, fov: 34, ease: 'outQuad',
      pos: [5.6, 5.2, 4.6], to: [5.2, 5.4, 3.8],
      look: () => bladeAt(1.0), lookTo: () => lukeHead().add(new THREE.Vector3(0, 0.1, 0)),
      handheld: 0.24,
    });
    shots.add({          // 4. Ben, lit blue off the blade, looking past it
      t: IGNITE + 3.4, dur: (SWING - 0.3) - (IGNITE + 3.4), fov: 32, ease: 'linear',
      pos: [7.6, 5.8, 3.4], to: [7.2, 5.7, 2.6],
      look: obiHead, handheld: 0.22,
    });
    shots.add({          // 5. the swing, wide enough to see the blade move
      t: SWING - 0.3, dur: (k4 - 0.7) - (SWING - 0.3), fov: 38, ease: 'inOutQuad',
      pos: [8.8, 6.8, 8.0], to: [8.0, 6.4, 7.0],
      look: [1.6, 4.8, -1.6], handheld: 0.24,
    });
    shots.add({          // 6. Luke's face, resolved, Ben still in frame
      t: k4 - 0.7, dur: ctx.dur - (k4 - 0.7), fov: 36, ease: 'inOutQuad',
      pos: [8.0, 6.0, 6.4], to: [6.9, 5.8, 5.0],
      look: () => lukeHead().add(new THREE.Vector3(0.4, -0.1, -0.2)),
      handheld: 0.2,
    });

    return {
      root,
      shots,
      exposure: 1.18,
      grade: { uVignette: 0.5, uGrain: 0.036, uSaturation: 1.1 },
      update(t, dt) {
        const of = obiwan.userData.fig;
        const lf = luke.userData.fig;

        // the saber passes from one hand to the other, bowing out toward the
        // open side of the set so camera sees the object change hands
        const pass = clamp(ramp(t, HANDOVER, HANDOVER + 1.6), 0, 1);
        const obiHand = of?.hands?.R;
        const lukeHand = lf?.hands?.R;
        const a = new THREE.Vector3(), b = new THREE.Vector3();
        if (obiHand) obiHand.getWorldPosition(a); else a.set(2.6, 4.2, -1.9);
        if (lukeHand) lukeHand.getWorldPosition(b); else b.set(0.9, 4.2, 0.2);
        saber.object3D.position.copy(a).lerp(b, ease.inOutCubic(pass));
        saber.object3D.position.z += Math.sin(pass * Math.PI) * 0.55;
        saber.object3D.position.y += Math.sin(pass * Math.PI) * 0.25;

        // upright in Luke's fist once he has it, with one slow sweep on the
        // swing cue
        const sw = env(t, SWING - 0.2, SWING + 1.0, 0.4, 0.6);
        saber.object3D.rotation.set(
          lerp(-1.4, -0.12, pass) - sw * 0.45,
          lerp(-0.7, 0.35, pass),
          lerp(-0.3, -0.05, pass) - sw * 0.7,
        );

        if (of) {
          poseChain(of, [
            ['idle', 1],
            ['hold_right', ramp(t, k1 + 0.4, k1 + 1.6)],
            ['hold_two', ramp(t, HANDOVER - 1.3, HANDOVER - 0.1)],
            ['idle', ramp(t, IGNITE - 0.3, IGNITE + 0.9)],
          ]);
          // On his long speech he looks off past the camera rather than at
          // Luke: it plays the line, and it turns the cowl off the lens.
          const away = env(t, k3 - 0.5, k3 + 6.6, 1.1, 1.5);
          const gaze = lukeHead().lerp(new THREE.Vector3(8.0, 6.6, 7.0), away);
          of.lookAt(gaze, 0.62);
          of.update(dt, t);
        }
        if (lf) {
          poseChain(lf, [
            ['idle', 1],
            ['hold_two', ramp(t, HANDOVER - 0.6, HANDOVER + 0.5)],
            ['hold_right', ramp(t, IGNITE - 0.5, IGNITE + 0.6)],
            ['saber_high', sw],
          ]);
          // before he has it he listens to Ben; after, he watches the blade,
          // which is also what turns his face into its light
          const held = clamp(ramp(t, IGNITE - 0.6, IGNITE + 0.4), 0, 1);
          if (held < 0.5) lf.lookAt(obiHead(), 0.58);
          else lf.lookAt(bladeAt(1.6), 0.85);
          lf.update(dt, t);
        }

        // ignition
        const ign = clamp(ramp(t, IGNITE, IGNITE + 0.55), 0, 1);
        saber.setExtension(ease.outQuad(ign));
        saber.update(dt, t);
        glowFromBlade.position.copy(saber.object3D.position).add(new THREE.Vector3(0, 2.2 * ign, 0));
        glowFromBlade.intensity = 13 * ign * (0.9 + Math.sin(t * 27) * 0.08);

        lamp.intensity = 4.6 * (0.94 + Math.sin(t * 2.3) * 0.06);
        key.intensity = 46 * (0.96 + Math.sin(t * 0.7) * 0.04);
        motes.update(t);
        hut.userData.update?.(t, dt);
      },
    };
  },
};
