import * as THREE from 'three';
import { ShotList } from '../engine/camera.js';
import { tryMake, setupScene } from './_kit.js';
import { Motes, lightShaft } from '../engine/effects.js';
import { C, FINISH } from '../lego/palette.js';
import { mat } from '../lego/materials.js';
import { FIG } from '../lego/minifig.js';
import { ramp, ease, clamp, lerp } from '../engine/util.js';

/*
 * Chapter 9 -- the hall.
 * Symmetry, height, and a slow push down the aisle. Everything the rest of the
 * film is not: still, bright, and lined up.
 *
 * The ceremony is staged at the foot of the dais, at the far (-Z) end of a
 * 150-stud hall, and shot from one side of the eyeline all the way through:
 * wide of the hall, medium on Leia as she hangs the medal, close on Luke, wide
 * on the ranks. A minifig has no face in profile -- the print stops at the
 * cheek -- so a two-shot of two people facing each other only works if both
 * are cheated open toward the camera and their eyelines are pulled part of the
 * way off each other. Every body angle below is a deliberate cheat, not the
 * direction the character is actually looking.
 */

const CZ = -128.5;                 // the ceremony, on the hall's centre line
const OPEN = new THREE.Vector3(0.9, 6.0, -118.5);  // where the lens lives, downstage

/** Deterministic pose blending: assert the outgoing pose, then lerp off it. */
function poseChain(fig, stages) {
  for (const [name, amount] of stages) {
    const a = clamp(amount, 0, 1);
    if (a > 0) fig.setPose(name, a);
  }
}

/**
 * The medal: a short blue ribbon with a gold disc under it, built flat so its
 * face is its local +Z.
 *
 * Not a neck hoop. A closed ring big enough to pass over a minifig head is
 * 1.6 across, and this ceremony is covered from a lens at the same height as
 * the ribbon -- a horizontal ring seen from its own height is not a ring, it
 * is a blue bar laid across both their faces. Flat against the chest reads
 * from any angle, which is also how the part exists in plastic.
 */
function makeMedal() {
  const g = new THREE.Group();
  const ribbon = new THREE.Mesh(
    new THREE.BoxGeometry(0.34, 0.58, 0.09),
    mat(C.brightLightBlue, FINISH.SOLID, { roughness: 0.5 }),
  );
  ribbon.position.set(0, 0.30, 0);
  g.add(ribbon);
  // Gold, but not FINISH.METAL: at metalness 0.9 a face has almost no diffuse
  // and lives entirely off the env map, which this chapter runs at 0.3 -- the
  // disc came out a brown coin. Painted gold instead, so the practicals over
  // the dais actually land on it.
  const disc = new THREE.Mesh(
    new THREE.CylinderGeometry(0.40, 0.40, 0.10, 20),
    mat(C.pearlGold, FINISH.SOLID, { roughness: 0.26 }),
  );
  disc.rotation.x = Math.PI / 2;
  disc.position.set(0, -0.28, 0.02);
  g.add(disc);
  for (const o of [ribbon, disc]) o.castShadow = true;
  return g;
}

export default {
  id: 'medals',
  dur: 29,
  async build(ctx) {
    const root = new THREE.Group();
    const rig = setupScene(ctx, 'interior', {
      background: 0x0c1118, envIntensity: 0.3, fog: [0x161c26, 110, 420], shadowSize: 60,
    });
    // The rig aims its key -- and therefore its shadow camera -- at the origin,
    // 128 studs up the hall from anything in this chapter. Point both at the
    // ceremony or the principals cast nothing.
    const key = rig.userData.lights.key;
    key.position.set(24, 50, -96);
    key.target.position.set(0, 0, CZ);
    root.add(key.target);

    const hall = await tryMake('throneroom', {}, { size: [70, 30, 140], color: C.white });
    root.add(hall);

    // The floor is 4-stud tiles with a 0.12 gap between them and nothing under
    // them, and one of those gaps runs the whole length of the hall along
    // x = 0 -- which is exactly where the opening crane sits. Sighted straight
    // down, it is a hard black line up the middle of the frame. Slide a plate
    // in under the tiles and every gap has a lit floor at the bottom of it, so
    // the seams read as grout. Parented to the set so it picks up the matte
    // pass below with everything else.
    const subfloor = new THREE.Mesh(
      new THREE.BoxGeometry(91, 0.35, 151),
      mat(C.veryLightGray, FINISH.SOLID, { roughness: 0.7 }),
    );
    subfloor.position.set(0, -0.225, -75);
    subfloor.receiveShadow = true;
    hall.add(subfloor);

    // White ABS carries a clearcoat, and a hall lit from the ceiling puts the
    // mirror image of every practical on the floor and on the step nosings --
    // straight into a low lens, well over the bloom threshold. This room is
    // meant to be stone: take the clearcoat off the pale bricks and leave the
    // gold trim alone, and the hot streaks go with it. Materials are cached and
    // shared with the characters, so clone before touching anything.
    hall.traverse((o) => {
      const m = o.material;
      if (!m || m.clearcoat === undefined || m.metalness > 0.2) return;
      o.material = m.clone();
      o.material.clearcoat = 0;
      o.material.roughness = Math.max(m.roughness ?? 0.34, 0.62);
    });

    // A runner down the aisle. Twenty-six studs of white tile run the length of
    // the hall and every lens in the chapter points along them: in the crane
    // that is the bottom third of the frame and in the reverse it is the whole
    // middle, and in both it was the largest empty area in the picture. Red
    // because the banners are the only other colour in the room, and matte
    // because a clearcoat here would mirror the ceiling coffers straight back.
    const runnerMat = mat(C.red, FINISH.SOLID, { roughness: 0.88 }).clone();
    runnerMat.clearcoat = 0;
    const runner = new THREE.Mesh(new THREE.BoxGeometry(13, 0.18, 128), runnerMat);
    runner.position.set(0, 0.09, -66);
    runner.receiveShadow = true;
    hall.add(runner);
    // Gold edging, which is what stops it reading as a strip of tape: the
    // runner is seen almost edge-on from every camera, so its own long sides
    // are barely a pixel and the trim is doing all the work of finding them.
    for (const s of [-1, 1]) {
      const trim = new THREE.Mesh(
        new THREE.BoxGeometry(0.7, 0.22, 128),
        mat(C.pearlGold, FINISH.SOLID, { roughness: 0.34 }),
      );
      trim.position.set(s * 6.15, 0.11, -66);
      hall.add(trim);
    }

    for (const x of [-17, 17]) {
      const s = lightShaft(2.2, 7, 30, 0xfff0d0, 0.022);
      s.position.set(x, 16, -114);
      root.add(s);
    }
    // A soft key over the ceremony itself: the set's practicals are hung to
    // rake the emblem and leave the floor in front of the dais flat.
    const keyA = new THREE.PointLight(0xfff2dc, 80, 60, 2);
    keyA.position.set(16, 20, -112);
    root.add(keyA);
    const keyB = new THREE.PointLight(0xdce8ff, 36, 52, 2);
    keyB.position.set(-15, 16, -139);
    root.add(keyB);

    const luke = await tryMake('luke', {}, { size: [1.8, 5, 1], color: C.white });
    const leia = await tryMake('leia', {}, { size: [1.8, 5, 1], color: C.white });
    const han = await tryMake('han', {}, { size: [1.8, 5, 1], color: C.darkBlue });
    const pilot = await tryMake('rebelpilot', {}, { size: [1.8, 5, 1], color: C.orange });
    const r2 = await tryMake('r2', {}, { size: [2, 3.4, 2], color: C.white });
    const threepio = await tryMake('c3po', {}, { size: [1.8, 5, 1], color: C.pearlGold });

    // The two of them stand across the hall from each other, Luke camera-left
    // and Leia camera-right, so their eyeline runs across the frame instead of
    // into it and one lens down the aisle holds both. Two studs apart and no
    // more: a minifig arm reaches 1.8 from its own shoulder, so any wider and
    // she cannot put the medal on him at all -- it just flies there.
    luke.position.set(-1.15, 0, -128.3);
    luke.rotation.y = 1.02;
    leia.position.set(1.15, 0, -128.6);
    leia.rotation.y = -0.85;
    // Han is next in the line, on Leia's far side. The narration names three
    // people and the hall only had two, so he has to be here -- but he cannot
    // be anywhere the two-shot or the single can see him, or he stands in the
    // corner of both with nothing to do. From x = 5.6 he is past the right
    // edge of every lens that holds the hand-off, and squarely in the wides.
    han.position.set(5.6, 0, -126.6);
    han.rotation.y = -1.16;
    // Everyone else is kept well off the aisle's centre line -- that is the
    // corridor the lens looks down, and a droid parked in it is a wall in front
    // of the ceremony -- but close enough to be in the wides.
    pilot.position.set(-7.6, 0, -123.6);
    pilot.rotation.y = 1.2;
    threepio.position.set(-9.8, 0, -124.6);
    threepio.rotation.y = 1.45;
    r2.position.set(-11.8, 0, -122.6);
    r2.rotation.y = 1.5;
    for (const o of [luke, leia, han, pilot, r2, threepio]) root.add(o);

    const medal = makeMedal();
    root.add(medal);

    // Han is already wearing his. One medal is animated across because one is
    // all the beat has room for; giving him a second one that is simply on
    // says she started at his end of the line, which is both true to the film
    // and cheaper than a second hand-off nobody has time to watch.
    const worn = makeMedal();
    worn.position.set(0, FIG.torsoH - 0.62, FIG.torsoD / 2 + 0.10);
    (han.userData.fig?.torso ?? han).add(worn);

    // Ranks of fleet troopers lining the aisle, facing the dais -- so the
    // reverse down the hall is a wall of faces rather than of backs. The
    // crowd_troopers model is a marching stormtrooper squad whatever options
    // it is handed, which is the wrong army for this room.
    const crowd = new THREE.Group();
    const guards = [];
    for (const sx of [-1, 1]) {
      for (let col = 0; col < 2; col++) {
        // In tight against the aisle edge rather than back at the walls: out
        // by the columns they are 50 degrees off any axis that also holds the
        // ceremony, so no single frame could ever contain both. And nothing
        // upstage of z = -115 -- the two-shot and the single both stand at
        // -119 or beyond, and a trooper level with the lens is a blur.
        //
        // Six ranks deep rather than four. The reverse looks the length of the
        // aisle, so the far ranks are what converges toward the doorway at the
        // vanishing point; with four the two blocks sat out at the frame edges
        // and the middle of the shot was thirty studs of bare floor.
        for (let row = 0; row < 6; row++) {
          const g = await tryMake('rebeltrooper', { pose: 'stand_wide' },
            { size: [1.8, 5, 1], color: C.sandBlue });
          g.position.set(sx * (10.0 + col * 4.0), 0, -91.8 - row * 4.6);
          g.rotation.y = Math.PI - sx * 0.16;
          crowd.add(g);
          guards.push(g);
        }
      }
    }
    root.add(crowd);

    const motes = new Motes(ctx.scene, { count: 150, box: [60, 24, 90], size: 0.06, color: 0xffe8c8, seed: 55, speed: 0.22 });
    motes.points.position.set(0, 0, -118);

    const f1 = ctx.cue('f1', 3.0);
    const f2 = ctx.cue('f2', 9.81);
    const MEDAL = f2 + 1.5;          // the ribbon goes over his head
    const SALUTE = MEDAL + 1.3;

    const head = (o) => o.position.clone().add(new THREE.Vector3(0, 4.9, 0));

    const shots = new ShotList();
    shots.add({          // 1. wide of the hall, craning down the aisle
      // Starts high enough to hold the whole starbird, then tilts off it as it
      // drops -- the emblem crops either way at this focal length, so it may as
      // well crop on a move that is going somewhere.
      // Stops at -86, short of the front rank: the guard now stands eight
      // studs further downstage than it used to and a crane that ran to -94
      // would end with its lens between two of them.
      t: 0, dur: f2 - 1.2, fov: 44, ease: 'inOutQuad',
      pos: [0, 17, -66], to: [0, 9.0, -86],
      look: [0, 27, -146], lookTo: [0, 6.0, -130],
    });
    shots.add({          // 2. the medal: two-shot across the eyeline
      t: f2 - 1.2, dur: 6.0, fov: 34, ease: 'inOutQuad',
      pos: [2.9, 5.3, -118.9], to: [2.2, 5.15, -120.4],
      look: [0, 4.55, -128.4], lookTo: [0, 4.45, -128.4],
      handheld: 0.16,
    });
    shots.add({          // 3. close on Luke
      // Aimed a little past him, away from Leia: at two studs apart she is
      // otherwise inside the frame edge from every angle that holds his face,
      // and this pushes her out and puts him off centre at the same time.
      t: f2 + 4.8, dur: 4.4, fov: 28, ease: 'outQuad',
      pos: [3.7, 5.4, -123.2], to: [3.35, 5.3, -123.9],
      look: () => head(luke).add(new THREE.Vector3(-0.85, -0.62, -0.12)),
      handheld: 0.18,
    });
    shots.add({          // 4. the reverse: the hall salutes, past the three of them
      // The ranks are drawn up facing the dais, so a lens anywhere down the
      // aisle only ever sees the backs of their heads -- which is what this
      // shot used to be, and the salute may as well not have happened. The
      // only camera that catches it is one standing on the dais looking back,
      // and that same position puts Luke, Leia and Han across the bottom of
      // the frame as foreground. Seven studs up, which is the whole range
      // available: any lower and the three of them mask the ranks, any higher
      // and all that is left of them is three hair pieces on the bottom edge.
      t: f2 + 9.2, dur: 4.7, fov: 44, ease: 'inOutQuad',
      pos: [1.8, 7.0, -137.2], to: [1.6, 7.5, -134.6],
      look: [0.6, 5.2, -112.0], lookTo: [0.5, 5.5, -108.0],
    });
    shots.add({          // 5. crane out for the last image of the film
      // Cuts across the line from shot 4, deliberately: it is a different
      // setup at a different scale on the last beat of the film, which is
      // where an audience expects the picture to open out. Starting high
      // rather than craning up into it keeps it from reading as a whip round.
      t: f2 + 13.9, dur: ctx.dur - (f2 + 13.9), fov: 42, ease: 'inOutCubic',
      pos: [6, 13, -104], to: [0, 30, -62],
      look: [0, 8.0, -131], lookTo: [0, 18, -143],
    });

    const _a = new THREE.Vector3(), _b = new THREE.Vector3();

    return {
      root,
      shots,
      exposure: 1.4,
      // Named in full, house values included: the grade pass is shared by all
      // nine chapters and never reset, so anything left out is inherited from
      // the chapter before -- and the one before this is the trench, which
      // finishes with its aberration wound up to 0.0022.
      grade: {
        uVignette: 0.36, uGrain: 0.026, uAberration: 0.0010,
        uSaturation: 1.04, uContrast: 1.04,
      },
      update(t, dt) {
        const lf = luke.userData.fig;
        const lea = leia.userData.fig;
        const bow = clamp(ramp(t, MEDAL - 0.8, MEDAL + 0.1), 0, 1)
          * (1 - clamp(ramp(t, MEDAL + 1.2, MEDAL + 2.3), 0, 1));

        if (lf) {
          poseChain(lf, [['idle', 1]]);
          lf.torso.rotation.x = lerp(0, 0.26, ease.inOutQuad(bow));
          // He looks at Leia, but only three quarters of the way: the rest
          // keeps his face toward the open side instead of edge-on to it.
          lf.lookAt(head(leia).lerp(OPEN, 0.30), 0.8);
          lf.update(dt, t);
        }
        if (lea) {
          poseChain(lea, [
            ['idle', 1],
            ['hold_two', ramp(t, MEDAL - 3.6, MEDAL - 1.8)],
            // hold_two, not reach: the medal goes on his chest, which is a
            // shade below her own shoulder, and reach carries her forearm up
            // across her own chin on the way there.
            ['hold_two', ramp(t, MEDAL - 1.3, MEDAL - 0.35)],
            // Straight back down to her sides after. Anything in between leaves
            // both her hands up beside his face, two studs away.
            ['idle', ramp(t, MEDAL + 0.6, MEDAL + 1.8)],
          ]);
          lea.lookAt(head(luke).lerp(OPEN, 0.26), 0.72);
          lea.update(dt, t);
        }

        // The medal is carried in Leia's hands, lifted over Luke's head and
        // left hanging on him. Both ends are read off the rigs each frame, so
        // it stays put through his bow and works on any seek.
        luke.updateMatrixWorld(true);
        leia.updateMatrixWorld(true);
        if (lea?.hands) {
          lea.hands.L.getWorldPosition(_a);
          lea.hands.R.getWorldPosition(_b);
          _a.lerp(_b, 0.5).add(new THREE.Vector3(0, 0.18, 0));
        } else {
          _a.copy(leia.position).add(new THREE.Vector3(-0.9, 4.0, 0.8));
        }
        if (lf) {
          _b.copy(lf.torso.localToWorld(
            new THREE.Vector3(0, FIG.torsoH - 0.62, FIG.torsoD / 2 + 0.10)));
        } else {
          _b.copy(luke.position).add(new THREE.Vector3(0, 3.6, 0.5));
        }
        const p = clamp(ramp(t, MEDAL - 1.0, MEDAL + 0.5), 0, 1);
        const across = ease.inOutQuad(p);
        medal.position.copy(_a).lerp(_b, across);
        medal.position.y += Math.sin(across * Math.PI) * 0.3;
        // Turned in her hands to face the room, then square on his chest.
        medal.rotation.y = lerp(leia.rotation.y, luke.rotation.y, across);

        const hf = han.userData.fig;
        if (hf) {
          poseChain(hf, [
            ['idle', 1],
            ['salute', ramp(t, SALUTE + 0.35, SALUTE + 1.1)],
          ]);
          hf.lookAt(head(luke).lerp(OPEN, 0.22), 0.7);
          hf.update(dt, t);
        }

        const pf = pilot.userData.fig;
        if (pf) {
          poseChain(pf, [
            ['stand_wide', 1],
            ['salute', ramp(t, SALUTE, SALUTE + 0.7)],
          ]);
          pf.lookAt(head(luke), 0.6);
          pf.update(dt, t);
        }

        // The ranks come to the salute in a ripple from the front of the hall
        // back, so the room reacts rather than switching pose in one frame.
        guards.forEach((g, i) => {
          const f = g.userData.fig;
          if (f) {
            const off = (i % 3) * 0.26 + (i > 5 ? 0.13 : 0);
            poseChain(f, [
              ['stand_wide', 1],
              ['salute', ramp(t, SALUTE + off, SALUTE + off + 0.8)],
            ]);
          }
          g.userData.update?.(t, dt);
        });

        r2.userData.spinDome?.(Math.sin(t * 0.8) * 0.6);
        r2.userData.update?.(t, dt);
        threepio.userData.update?.(t, dt);
        hall.userData.update?.(t, dt);
        motes.update(t);
        keyA.intensity = 80 * (0.98 + Math.sin(t * 0.6 + f1) * 0.02);
      },
    };
  },
};
