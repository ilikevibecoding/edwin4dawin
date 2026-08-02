import * as THREE from 'three';
import { ShotList } from '../engine/camera.js';
import { tryMake, setupScene } from './_kit.js';
import { Motes } from '../engine/effects.js';
import { C } from '../lego/palette.js';
import { ramp, ease, clamp, lerp } from '../engine/util.js';

/*
 * Chapter 6 -- the binary sunset.
 * The quietest chapter and the one that has to land emotionally: one figure,
 * one ridge, two suns, and a slow pull back as the light goes.
 *
 * Everything is staged on one axis. Luke faces -Z, the suns and the key light
 * are at -Z, and every camera sits at +Z of him, so he is backlit and reads
 * as a silhouette from the first frame to the last.
 */


/**
 * The twin-suns asset is a wide sky backdrop card; keep it facing the camera.
 * `swing` yaws the pair off the view axis so the discs frame the figure
 * instead of sitting behind his head.
 */
function faceCamera(card, camera, swing = 0) {
  const d = new THREE.Vector3();
  camera.getWorldDirection(d);
  card.rotation.y = Math.atan2(-d.x, -d.z) + swing;
}

/**
 * Take the flare furniture down.
 *
 * The set draws its halo and six-point burst at 260 and 330 studs across; at
 * any sane sun distance that is a 50-degree additive wash over the whole
 * frame, and it flattens the silhouette this chapter exists for. Returns the
 * sky-gradient card, whose opacity setHeight() rewrites every frame.
 */
function tameGlare(suns, { halo = 0.4, burst = 0.25 } = {}) {
  for (const s of [suns.userData.nodes?.big, suns.userData.nodes?.small]) {
    const p = s?.userData?.parts;
    if (!p) continue;
    p.halo.material.opacity *= halo;
    p.burst.material.opacity *= burst;
  }
  let sky = null;
  suns.traverse((o) => { if (o.isMesh && o.renderOrder === -880) sky = o; });
  return sky;
}

export default {
  id: 'twinsuns',
  dur: 32,
  async build(ctx) {
    const root = new THREE.Group();
    setupScene(ctx, 'sunset', {
      background: 0xd07b3e,
      envIntensity: 0.13,
      fog: [0xa9603a, 240, 950],
      shadowSize: 80,
    });

    // Low, gentle dune country: this chapter needs a clean horizon and a boy
    // standing above it, not a wall of sand between the lens and the sky.
    const dunes = await tryMake('dunes', { size: 240, seed: 9, amp: 9 }, { size: [240, 6, 240], color: C.tan });
    root.add(dunes);

    const plate = dunes.userData.heightAt || (() => 0);
    const sand = (x, z) => plate(x, z) * 0.44
      + (plate(x + 4, z) + plate(x - 4, z) + plate(x, z + 4) + plate(x, z - 4)) * 0.14;

    // Where he ends up standing; the whole set is levelled against this.
    const RIDGE = new THREE.Vector3(-30, 0, -56);
    RIDGE.y = sand(RIDGE.x, RIDGE.z);

    // The homestead sits well out on the plain -- close enough to read as a
    // silhouette of domes and vaporators, far enough not to foul the lens.
    const farm = await tryMake('moisturefarm', { size: 76 }, { size: [30, 10, 30], color: C.darkTan });
    farm.position.set(-112, sand(-112, -118) - 1.4, -118);
    farm.rotation.y = 0.9;
    root.add(farm);

    const suns = await tryMake('twinsuns', { sundist: 330, scale: 0.95 }, { size: [30, 30, 1], color: C.brightLightYellow });
    // The card's y = 0 is its horizon line; ours is the sand he stands on.
    suns.position.set(0, RIDGE.y - 1.0, 0);
    suns.userData.setRidge?.(false);
    suns.userData.setHeight?.(0.52);
    const skyCard = tameGlare(suns, { halo: 0.34, burst: 0.22 });
    root.add(suns);

    const luke = await tryMake('luke', {}, { size: [1.8, 5, 1], color: C.white });
    root.add(luke);

    const speeder = await tryMake('landspeeder', {}, { size: [8, 4, 16], color: C.lightBluishGray });
    speeder.position.set(-41, sand(-41, -47) + 1.0, -47);
    speeder.rotation.y = 1.15;
    root.add(speeder);

    const dust = new Motes(ctx.scene, { count: 150, box: [90, 18, 90], size: 0.10, color: 0xffcf9a, seed: 33, speed: 0.5 });
    dust.points.position.set(-26, RIDGE.y, -44);

    const s1 = ctx.cue('s1', 1.6);
    const s2 = ctx.cue('s2', 12.4);
    const s3 = ctx.cue('s3', 19.3);
    const ARRIVE = Math.min(s2 - 3.6, 8.4);

    // He walks out of the yard to the lip of the ridge and stops.
    const from = new THREE.Vector3(-21, 0, -25);
    const to = RIDGE.clone();
    const HEADING = Math.atan2(to.x - from.x, to.z - from.z);

    const eye = (dx, dy, dz) => {
      const x = RIDGE.x + dx;
      const z = RIDGE.z + dz;
      return new THREE.Vector3(x, Math.max(RIDGE.y + dy, sand(x, z) + 2.0), z);
    };
    /** Same, but riding on Luke so the walking shot holds its framing. */
    const behind = (dx, dy, dz) => () => {
      const x = luke.position.x + dx;
      const z = luke.position.z + dz;
      return new THREE.Vector3(x, Math.max(luke.position.y + dy, sand(x, z) + 2.0), z);
    };
    /*
     * Aim past him, square to the lens axis, so he sits left of centre and
     * the two suns have the right-hand side of the frame to themselves.
     * Shot lists resolve `look` after the eye has moved, so reading the
     * camera here gives this frame's position, not the last one's.
     */
    const off = (dy, shift) => () => {
      const p = luke.position.clone().setY(luke.position.y + dy);
      const f = p.clone().sub(ctx.camera.position).setY(0).normalize();
      return p.add(new THREE.Vector3(-f.z, 0, f.x).multiplyScalar(shift));
    };

    const shots = new ShotList();
    shots.add({          // 1. over his shoulder, walking out to the ridge
      t: 0, dur: ARRIVE, fov: 38, ease: 'linear',
      pos: behind(7.0, 3.4, 13), to: behind(5.6, 3.2, 11.0),
      look: off(3.2, 3.4),
      handheld: 0.35,
    });
    shots.add({          // 2. the shot: one boy, two suns, a lot of sky
      t: ARRIVE, dur: (s2 - 1.2) - ARRIVE, fov: 32, ease: 'inOutCubic',
      pos: eye(13.0, 2.8, 25.0), to: eye(11.2, 2.6, 21.0),
      look: off(2.9, 5.2),
      handheld: 0.22,
    });
    shots.add({          // 3. "there is a whole galaxy out there" -- closer
      t: s2 - 1.2, dur: (s3 - 1.0) - (s2 - 1.2), fov: 30, ease: 'linear',
      pos: eye(10.0, 2.3, 17.5), to: eye(8.6, 2.5, 15.2),
      look: off(3.1, 4.0),
      handheld: 0.26,
    });
    shots.add({          // 4. drift back; the light goes out behind him
      t: s3 - 1.0, dur: ctx.dur - (s3 - 1.0), fov: 34, ease: 'inOutQuad',
      pos: eye(8.6, 2.5, 15.2), to: eye(19.0, 5.6, 40.0),
      look: off(2.6, 6.0),
      handheld: 0.18,
    });

    const lights = ctx.scene.getObjectByName('rig_sunset')?.userData?.lights;
    if (lights?.key) {
      // The key comes in from behind the ridge, straight down the lens axis,
      // so sand and boy alike go dark toward camera.
      lights.key.position.set(-52, 24, -196);
      lights.key.target.position.copy(RIDGE);
      root.add(lights.key.target);
    }
    // The stock rim sits at +X +Z -- on the camera side, which lights the one
    // surface that has to stay black. Put it behind him with the suns.
    if (lights?.rim) lights.rim.position.set(-96, 20, -190);

    return {
      root,
      shots,
      exposure: 0.92,
      grade: { uVignette: 0.42, uGrain: 0.028, uSaturation: 1.14, uContrast: 1.1 },
      update(t, dt) {
        faceCamera(suns, ctx.camera, 0.25);

        const w = clamp(ramp(t, 0.5, ARRIVE - 0.4), 0, 1);
        luke.position.copy(from).lerp(to, ease.inOutQuad(w));
        luke.position.y = sand(luke.position.x, luke.position.z);
        luke.rotation.y = HEADING;

        const fig = luke.userData.fig;
        if (fig) {
          if (w > 0.02 && w < 0.98) {
            fig.walkPhase = t * 0.62 * 7.0;
            fig.walk(0, 0.62);
          } else {
            fig.stopWalk();
            fig.setPose('idle', 0.06);
            // hands slowly fall to his sides; head tips up a little
            fig.head.rotation.x = lerp(fig.head.rotation.x, -0.16, 0.03);
          }
          fig.update(dt, t);
        }

        // the suns go down over the whole chapter
        const set = clamp(ramp(t, ARRIVE - 3, ctx.dur - 0.5), 0, 1);
        suns.userData.setHeight?.(lerp(0.52, 0.10, ease.inOutQuad(set)));
        suns.userData.update?.(t);
        if (skyCard) skyCard.material.opacity *= 0.48;
        if (lights) {
          lights.key.intensity = lerp(2.6, 1.0, set) * 0.58;
          lights.key.color.setHex(set > 0.55 ? 0xff6a2a : 0xff9b4a);
          // Ambient stays on the floor all chapter: any real fill here turns
          // the silhouette back into a boy in a white shirt.
          if (lights.fill) lights.fill.intensity = lerp(0.34, 0.20, set) * 0.58;
          if (lights.rim) lights.rim.intensity = lerp(1.5, 0.7, set) * 0.58;
        }
        if (ctx.scene.fog) ctx.scene.fog.color.setHex(set > 0.55 ? 0x8a4426 : 0xa9603a);
        if (ctx.scene.background?.setHex) ctx.scene.background.setHex(set > 0.55 ? 0x93482a : 0xc4703a);

        dust.update(t);
        farm.userData.update?.(t, dt);
        dunes.userData.update?.(t, dt);
      },
    };
  },
};
