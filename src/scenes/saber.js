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
    const rig = setupScene(ctx, 'interior', {
      background: 0x1a120c, envIntensity: 0.19, fog: [0x1a120c, 40, 200],
      shadowSize: 34,
    });
    // The rig's warm bounce sits at -X/-Z, which for a camera at +X/+Z is the
    // exact mirror direction off every horizontal surface in the room. ABS
    // carries a clearcoat, so that glinted a row of over-threshold white
    // specular hits up the table and the shelf. Swing it round to the camera
    // side: same warm bounce, mirror lobe now thrown away from the lens.
    rig.userData.lights.bounce.position.set(26, 15, 24);

    // The set's practicals are dialled for a wide master -- a 90 candela lamp
    // one brick above the table top -- and at the distances this chapter shoots
    // from they clip the table to white. Take the set dark and light it here.
    const hut = await tryMake('hermithut', { lights: false }, { size: [26, 12, 26], color: C.darkTan });
    root.add(hut);

    // The lamp bulb is a 1.5-stud GLOW sphere written well over the 1.3 bloom
    // threshold: at this chapter's distances it was a white hole on the table,
    // and even dimmed it is a beach ball. Shrink it to a flame and take it to a
    // warm amber under the threshold. Both on clones -- mat() and BrickBuilder
    // hand out shared materials and geometry.
    const bulb = hut.getObjectByName(`abs_glow_${C.transNeonOrange.toString(16)}`);
    if (bulb) {
      bulb.material = bulb.material.clone();
      bulb.material.color.setRGB(0.42, 0.13, 0.035);
      bulb.geometry = bulb.geometry.clone();
      bulb.geometry.computeBoundingBox();
      const c = bulb.geometry.boundingBox.getCenter(new THREE.Vector3());
      bulb.geometry.translate(-c.x, -c.y, -c.z);
      bulb.geometry.scale(0.5, 0.62, 0.5);
      bulb.geometry.translate(c.x, c.y - 0.1, c.z);
    }

    // This room is stone, timber and sand, none of which are glossy, and the
    // clearcoat on default ABS is what has been throwing clipped white specular
    // hits off the table and the shelf every time a lamp lands near the mirror
    // angle of the lens. Take it off the set and the whole class of them goes.
    // Materials are cached and shared with the characters, so clone first.
    hut.traverse((o) => {
      const m = o.material;
      if (!m || m.clearcoat === undefined || m.metalness > 0.2) return;
      o.material = m.clone();
      o.material.clearcoat = 0;
      o.material.roughness = Math.max(m.roughness ?? 0.34, 0.66);
    });

    // Stone in a shuttered room: without a bounce term the walls go to black and
    // take Ben's cowl with them.
    root.add(new THREE.HemisphereLight(0xffd9a8, 0x2a1c10, 1.2));

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

    // Afternoon light through the slit. lightShaft is a double-sided additive
    // cylinder, so a fat one placed where the camera stands reads as a pane of
    // glass laid over the actors. Keep it thin and short enough to stay in the
    // near-wall corner, out of the lens and off Ben's face.
    const shaft = lightShaft(0.5, 1.5, 7.5, 0xffd9a0, 0.05);
    shaft.position.set(9.2, 3.0, 0.6);
    shaft.rotation.z = -0.85;
    root.add(shaft);

    const key = new THREE.PointLight(0xffcf96, 46, 46, 2);
    key.position.set(6.6, 8.4, 8.4);
    root.add(key);

    // Noon on the sand bank behind the back doorway. The hut is built with a
    // real opening and a dune a few studs beyond it rather than a black panel
    // stuck on the stonework, but the set's own practicals are switched off
    // here -- so without a lamp of its own that opening is a rectangle of pure
    // black over Ben's shoulder through half the coverage, which is the one
    // thing a doorway must never be.
    //
    // Stood inside the room rather than out in the sand with the thing it is
    // lighting. The bank is thirteen studs across and its lit face points back
    // at the hut, so a lamp tucked in behind the threshold is a stud and a half
    // off it and inverse square takes the edges to nothing -- one hot streak
    // down the middle of the opening. From this side the throw is six studs and
    // even, and the spill lands on the inner face of the back wall, which is
    // the surface Ben's cowl was disappearing into.
    const outside = new THREE.PointLight(0xffdca8, 26, 26, 2);
    outside.position.set(-4.6, 4.6, -7.6);
    root.add(outside);

    // Back-right corner. Everything else in here comes from the open front, so
    // without this the wall Ben stands against goes to black and he sinks into
    // it; from behind him it also gives the cowl an edge. Directional and far
    // off, not a practical up against the stone: the +X wall is seen at a
    // grazing angle from every camera here, and grazing angles are exactly
    // where a near point light puts a clipped clearcoat glint on the wall.
    const back = new THREE.DirectionalLight(0xffc890, 0.5);
    back.position.set(17, 13, -19);
    root.add(back);

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
    const saber = new Lightsaber({ color: 0x2f8bff, coreColor: 0xd8ecff, len: 4.6 });
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
      // Clear of x = 8.6 to 12.2 at the front of the set. The open fourth wall
      // has a stub return standing in that corner, and the old start position
      // was buried inside it -- the lit inside face of it filled a third of the
      // frame and bloomed the first two seconds of the chapter to cream.
      t: 0, dur: k2 - 0.9, fov: 38, ease: 'linear',
      pos: [7.5, 7.5, 11.2], to: [7.9, 7.0, 9.3],
      look: [1.6, 4.5, -1.9],
      handheld: 0.28,
    });
    shots.add({          // 2. the handover, three-quarter two shot
      t: k2 - 0.9, dur: (IGNITE - 0.5) - (k2 - 0.9), fov: 34, ease: 'inOutQuad',
      pos: [7.8, 6.4, 7.6], to: [7.2, 6.2, 6.8],
      look: [1.7, 4.4, -1.8], handheld: 0.26,
    });
    shots.add({          // 3. ignition: a single on Luke, blade up past his face
      // Ben sits almost exactly on the right frame edge from here, so this is
      // framed to leave him out rather than slice his head in half.
      t: IGNITE - 0.5, dur: 3.9, fov: 32, ease: 'outQuad',
      pos: [5.8, 5.6, 5.2], to: [5.2, 5.8, 4.4],
      look: () => lukeHead().add(new THREE.Vector3(-0.95, -0.9, 0.7)),
      lookTo: () => lukeHead().add(new THREE.Vector3(-0.95, 0.2, 0.7)),
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
      exposure: 1.26,
      // Every key this chapter cares about is named, including the ones set to
      // the house value: one grade pass serves all nine chapters and nothing
      // resets it between them, so a key left unmentioned is inherited from
      // whichever chapter happened to draw last. uAberration is the one that
      // bites -- the trench climax runs it up to 0.008.
      grade: {
        uVignette: 0.46, uGrain: 0.036, uAberration: 0.0012,
        uSaturation: 1.1, uContrast: 1.05,
      },
      update(t, dt) {
        const of = obiwan.userData.fig;
        const lf = luke.userData.fig;
        const sw = env(t, SWING - 0.2, SWING + 1.0, 0.4, 0.6);

        // Arms first, and the world matrices with them. The blade is hung off
        // whichever fist is holding it by reading that hand's world position,
        // and three.js only refreshes world matrices at draw time -- so posing
        // after the read leaves the hands a frame stale. Played forward that is
        // 33 ms of lag and invisible; on a seek it is a whole different pose,
        // and the blade ends up buried in Luke's head with a 21-candela light
        // on it. The film is rendered by seeking, so read nothing stale.
        if (of) {
          poseChain(of, [
            ['idle', 1],
            ['hold_right', ramp(t, k1 + 0.4, k1 + 1.6)],
            ['hold_two', ramp(t, HANDOVER - 1.3, HANDOVER - 0.1)],
            ['idle', ramp(t, IGNITE - 0.3, IGNITE + 0.9)],
          ]);
        }
        if (lf) {
          poseChain(lf, [
            ['idle', 1],
            ['hold_two', ramp(t, HANDOVER - 0.6, HANDOVER + 0.5)],
            ['hold_right', ramp(t, IGNITE - 0.5, IGNITE + 0.6)],
            ['saber_high', sw],
          ]);
        }
        obiwan.updateMatrixWorld(true);
        luke.updateMatrixWorld(true);

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
        saber.object3D.rotation.set(
          lerp(-1.4, -0.12, pass) - sw * 0.45,
          lerp(-0.7, 0.35, pass),
          lerp(-0.3, -0.05, pass) - sw * 0.7,
        );
        saber.object3D.updateMatrixWorld(true);   // Luke's eyeline reads it back

        if (of) {
          // Never all the way onto Luke, even when he is talking to him. Luke
          // stands at -X of him and every camera in this chapter is at +X, so a
          // head aimed squarely at Luke is a head aimed 78 degrees off the lens
          // -- and what is on the back of this one is a cowl. A third of the way
          // to the open side keeps his face on the camera through his own lines;
          // on the long speech he looks off past it, which plays the line too.
          const away = env(t, k3 - 0.5, k3 + 6.6, 1.1, 1.5);
          const open = new THREE.Vector3(8.4, 6.4, 8.0);
          const gaze = lukeHead().lerp(open, 0.34 + 0.4 * away);
          of.lookAt(gaze, 0.62);
          of.update(dt, t);
        }
        if (lf) {
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
        glowFromBlade.intensity = 21 * ign * (0.9 + Math.sin(t * 27) * 0.08);

        lamp.intensity = 4.6 * (0.94 + Math.sin(t * 2.3) * 0.06);
        key.intensity = 46 * (0.96 + Math.sin(t * 0.7) * 0.04);
        motes.update(t);
        hut.userData.update?.(t, dt);
      },
    };
  },
};
