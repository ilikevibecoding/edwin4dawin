import * as THREE from 'three';
import { ShotList } from '../engine/camera.js';
import { tryMake, setupScene } from './_kit.js';
import { Motes, SpritePool, smokeTexture } from '../engine/effects.js';
import { C } from '../lego/palette.js';
import { ramp, ease, clamp, lerp } from '../engine/util.js';
import { RNG } from '../engine/rng.js';

/*
 * Chapter 5 -- two droids, a lot of sand, no plan.
 * Stepped-plate dune country under a hard double sun, then dusk.
 *
 * The dune field is a real height field, not a ground plane, so nothing in
 * here may assume y = 0. Every figure, vehicle and camera is placed against
 * sand() below; drop that and the whole chapter films the inside of a dune.
 */


/**
 * The twin-suns asset is a wide sky backdrop card; keep it facing the camera.
 * `swing` yaws the pair off the view axis so the discs sit to one side of the
 * frame instead of sitting on whatever the shot is actually about.
 */
function faceCamera(card, camera, swing = 0) {
  const d = new THREE.Vector3();
  camera.getWorldDirection(d);
  card.rotation.y = Math.atan2(-d.x, -d.z) + swing;
}

export default {
  id: 'dunes',
  dur: 24,
  async build(ctx) {
    const root = new THREE.Group();
    setupScene(ctx, 'desert', {
      background: 0xd7a266,
      envIntensity: 0.39,
      fog: [0xc79a63, 240, 980],
      shadowSize: 90,
    });

    const dunes = await tryMake('dunes', { size: 260, seed: 3, amp: 16 }, { size: [260, 6, 260], color: C.tan });
    root.add(dunes);

    /*
     * Sand height under a point. The plate grid is quantised on a 4-stud cell,
     * so a raw lookup makes anything that follows it climb in visible steps;
     * a five-tap blur is enough to walk and drive on.
     */
    const plate = dunes.userData.heightAt || (() => 0);
    const sand = (x, z) => plate(x, z) * 0.44
      + (plate(x + 4, z) + plate(x - 4, z) + plate(x, z + 4) + plate(x, z - 4)) * 0.14;
    /** Same, but averaged over a vehicle-sized footprint. */
    const bed = (x, z, r) => (sand(x, z) + sand(x + r, z) + sand(x - r, z)
      + sand(x, z + r) + sand(x, z - r)) / 5;

    // The whole chapter plays in one long valley between two dune ridges.
    const FLOOR = sand(40, 20);

    // Pushed further out and scaled down: at the stock 260 studs the halo is
    // 53 degrees wide and washes out everything it is meant to be lighting.
    const suns = await tryMake('twinsuns', { sundist: 400, scale: 0.9 }, { size: [30, 30, 1], color: C.brightLightYellow });
    // y = 0 on the suns card is meant to be the horizon; ours is a dune floor.
    // High suns for the trek: it is the middle of the day, and the card's sky
    // wash thins out as they rise, which keeps the glare off the droids.
    suns.position.set(0, FLOOR, 0);
    suns.userData.setRidge?.(false);
    suns.userData.setHeight?.(0.92);
    root.add(suns);

    const crawler = await tryMake('sandcrawler', {}, { size: [33, 34, 58], color: C.reddishBrown });
    crawler.userData.setRamp?.(0);
    root.add(crawler);

    const threepio = await tryMake('c3po', {}, { size: [1.8, 5, 1], color: C.pearlGold });
    const r2 = await tryMake('r2', {}, { size: [2, 3.4, 2], color: C.white });
    root.add(threepio, r2);

    const dust = new Motes(ctx.scene, { count: 200, box: [110, 26, 110], size: 0.11, color: 0xffe0a8, seed: 21, speed: 0.9 });
    dust.points.position.set(40, FLOOR, 20);
    // Additive, not alpha: the smoke texture is dark grey, so a normal-blended
    // puff over lit sand reads as a fingerprint on the lens rather than dust.
    const puffs = new SpritePool(ctx.scene, { max: 60, texture: smokeTexture(), additive: true, color: 0xffd2a0 });

    const d1 = ctx.cue('d1', 1.2);
    const d2 = ctx.cue('d2', 8.6);
    const d3 = ctx.cue('d3', 15.0);
    const DUSK = d3 - 1.2;

    // -------------------------------------------------------------- staging
    // The droids trudge down the valley, roughly -Z with a slow drift east.
    const WALK_FROM = new THREE.Vector3(30, 0, 82);
    const WALK_TO = new THREE.Vector3(46, 0, 6);
    const WALK_END = d3 + 0.4;
    const HEADING = Math.atan2(WALK_TO.x - WALK_FROM.x, WALK_TO.z - WALK_FROM.z);
    // Body axes of the marching pair, so the formation holds through the turn.
    const RIGHT = new THREE.Vector3(Math.cos(HEADING), 0, -Math.sin(HEADING));
    const AHEAD = new THREE.Vector3(Math.sin(HEADING), 0, Math.cos(HEADING));

    // The sandcrawler grinds up the same valley from the far end and stops
    // short of them; the ridge at z = -55 is what it crests on the way.
    const CRAWL_FROM = new THREE.Vector3(72, 0, -104);
    const CRAWL_TO = new THREE.Vector3(52, 0, -34);
    const CRAWL_START = 2.0;
    const CRAWL_STOP = d3 + 2.6;
    const crawlAt = (t) => CRAWL_FROM.clone()
      .lerp(CRAWL_TO, ease.smooth(clamp(ramp(t, CRAWL_START, CRAWL_STOP), 0, 1)));

    /*
     * Camera helpers. Offsets are relative to Threepio so the framing holds
     * while he walks; the eye is then floated clear of whatever dune it
     * happens to be standing over.
     */
    const eye = (dx, dy, dz) => () => {
      const x = threepio.position.x + dx;
      const z = threepio.position.z + dz;
      return new THREE.Vector3(x, Math.max(threepio.position.y + dy, sand(x, z) + 2.6), z);
    };
    const at = (dx, dy, dz) => () => threepio.position.clone().add(new THREE.Vector3(dx, dy, dz));

    /*
     * The first three shots look back up the valley, so the sandcrawler --
     * which is grinding up behind the lens the whole time -- stays out of
     * frame until the cut at d3 turns round and finds it.
     */
    const shots = new ShotList();
    shots.add({          // 1. dune country, the pair walking down out of it
      t: 0, dur: (d2 - 2.4), fov: 36, ease: 'linear',
      pos: eye(-20, 5.6, -26), to: eye(-14, 4.6, -17.5),
      look: at(-0.6, 2.6, 3.5),
      handheld: 0.3,
    });
    shots.add({          // 2. broadside, low: two small figures grinding past
      t: d2 - 2.4, dur: 2.4, fov: 34, ease: 'linear',
      pos: eye(-15.5, 2.3, -5.5), to: eye(-14.5, 2.6, -1.5),
      look: at(-0.6, 2.9, 0.4),
      handheld: 0.55,
    });
    shots.add({          // 3. "We are doomed" -- Threepio, big
      t: d2, dur: (DUSK - 0.6) - d2, fov: 32, ease: 'linear',
      pos: eye(-11.8, 3.3, -11.2), to: eye(-10.2, 3.6, -9.6),
      look: at(-0.7, 3.5, 0.2),
      handheld: 0.45,
    });
    shots.add({          // 4. turn round: the thing coming up the valley
      t: DUSK - 0.6, dur: (d3 + 3.4) - (DUSK - 0.6), fov: 42, ease: 'inOutQuad',
      pos: eye(-6.5, 5.6, 26), to: eye(-4.5, 5.2, 19),
      look: () => crawler.position.clone().add(new THREE.Vector3(0, 12, 12)),
    });
    shots.add({          // 5. at its feet, looking up: the droids for scale
      t: d3 + 3.4, dur: ctx.dur - (d3 + 3.4), fov: 46, ease: 'inOutQuad',
      pos: () => { const p = new THREE.Vector3(34, 0, 26); p.y = sand(p.x, p.z) + 3.2; return p; },
      to: () => { const p = new THREE.Vector3(37, 0, 19); p.y = sand(p.x, p.z) + 3.0; return p; },
      look: () => crawler.position.clone().add(new THREE.Vector3(-1, 14, 15)),
      handheld: 0.3,
      shake: (u) => 0.10 + u * 0.16,
    });

    const lights = ctx.scene.getObjectByName('rig_desert')?.userData?.lights;
    if (lights?.key) {
      /*
       * Hard sun raking in from the west and slightly high. Every camera in
       * the chapter sits on the -X side of whatever it is pointed at, so a
       * key from -X models the droids and the crawler's flank from the lens
       * side instead of turning them into backlit cut-outs.
       */
      lights.key.position.set(-34, 78, 30);
      lights.key.target.position.set(42, 0, 16);
      root.add(lights.key.target);
    }
    if (lights?.key2) lights.key2.position.set(30, 34, 120);

    return {
      root,
      shots,
      exposure: 0.85,
      grade: { uVignette: 0.34, uGrain: 0.03, uSaturation: 1.12, uContrast: 1.09 },
      update(t, dt) {
        faceCamera(suns, ctx.camera, 0.34);

        // ---------------------------------------------------------- droids
        const u = clamp(ramp(t, 0, WALK_END), 0, 1);
        const p = WALK_FROM.clone().lerp(WALK_TO, u);
        const walking = t < WALK_END - 0.3;

        threepio.position.copy(p).addScaledVector(RIGHT, 2.5);
        threepio.position.y = sand(threepio.position.x, threepio.position.z);
        r2.position.copy(p).addScaledVector(RIGHT, -2.2).addScaledVector(AHEAD, -2.0);
        r2.position.y = sand(r2.position.x, r2.position.z) + Math.abs(Math.sin(t * 6.2)) * 0.10;

        // Once the crawler is on them they stop and turn to face it.
        const turn = clamp(ramp(t, WALK_END - 0.2, WALK_END + 1.6), 0, 1);
        const toCrawler = Math.atan2(crawler.position.x - p.x, crawler.position.z - p.z);
        let delta = ((toCrawler - HEADING + Math.PI) % (Math.PI * 2)) - Math.PI;
        threepio.rotation.y = HEADING + delta * ease.inOutQuad(turn);
        r2.rotation.y = threepio.rotation.y;

        const tf = threepio.userData.fig;
        if (tf) {
          if (walking) {
            // Phase driven off absolute time: the film is seeked, not played.
            tf.walkPhase = t * 0.62 * 7.0;
            tf.walk(0, 0.62);
          } else {
            tf.stopWalk();
            tf.setPose('idle', 0.08);
          }
          // He gets his hands going for "doomed", then throws one at R2.
          if (t > d2 - 0.4 && t < d2 + 4.4) {
            const g = Math.sin((t - d2) * 5.4);
            tf.arms.R.rotation.x = lerp(tf.arms.R.rotation.x, -1.55 + g * 0.55, 0.3);
            tf.arms.L.rotation.x = lerp(tf.arms.L.rotation.x, -1.15 - g * 0.4, 0.3);
            tf.arms.R.rotation.z = -0.5;
            tf.arms.L.rotation.z = 0.5;
            tf.lookAt(r2.position.clone().setY(r2.position.y + 3.0), 0.75);
          } else if (!walking) {
            tf.lookAt(crawler.position.clone().setY(crawler.position.y + 24), 0.8);
          }
          tf.update(dt, t);
        }
        r2.userData.spinDome?.(Math.sin(t * 0.9) * 0.7);
        r2.userData.update?.(t, dt);

        // Sand kicked up at their feet.
        if (walking) {
          const k = Math.floor(t / 0.34);
          const q = new RNG(500 + k);
          const back = AHEAD.clone().multiplyScalar(-1.1);
          puffs.spawn(threepio.position.clone().add(back).add(new THREE.Vector3(q.gauss(0, 0.4), 0.15, 0)), {
            ttl: q.range(1.0, 1.7), size0: 0.4, size1: q.range(1.6, 2.8),
            vel: new THREE.Vector3(q.gauss(0, 0.4), 0.5, q.gauss(0, 0.4)), drag: 0.94,
          });
          puffs.spawn(r2.position.clone().add(back).add(new THREE.Vector3(q.gauss(0, 0.4), 0.15, 0)), {
            ttl: q.range(0.9, 1.5), size0: 0.35, size1: q.range(1.3, 2.2),
            vel: new THREE.Vector3(q.gauss(0, 0.4), 0.4, q.gauss(0, 0.4)), drag: 0.94,
          });
        }

        // ------------------------------------------------------ sandcrawler
        const c = crawlAt(t);
        const ahead = crawlAt(t + 0.4);
        crawler.position.set(c.x, bed(c.x, c.z, 18) - 2.4, c.z);
        crawler.rotation.y = Math.atan2(ahead.x - c.x, ahead.z - c.z) || Math.atan2(
          CRAWL_TO.x - CRAWL_FROM.x, CRAWL_TO.z - CRAWL_FROM.z,
        );
        crawler.userData.setRamp?.(clamp(ramp(t, CRAWL_STOP + 0.6, CRAWL_STOP + 3.0), 0, 1));
        crawler.userData.update?.(t, dt);

        // Dust boiling off the tracks, kept low so it dirties the treads
        // rather than fogging the whole lower half of the frame.
        if (t > DUSK - 2.0) {
          const k = Math.floor(t / 0.26);
          const q = new RNG(9000 + k);
          puffs.spawn(new THREE.Vector3(
            crawler.position.x + q.range(-15, 15),
            crawler.position.y + 1.4,
            crawler.position.z - 22 + q.gauss(0, 3),
          ), {
            ttl: q.range(1.8, 3.0), size0: 2, size1: q.range(9, 15),
            vel: new THREE.Vector3(q.gauss(0, 0.5), q.range(0.3, 0.9), q.gauss(0, 0.5)),
            drag: 0.95,
          });
        }

        // ------------------------------------------------------------ dusk
        const dusk = clamp(ramp(t, DUSK - 2.0, ctx.dur - 1.5), 0, 1);
        suns.userData.setHeight?.(lerp(0.92, 0.24, dusk));
        suns.userData.update?.(t);
        if (lights?.key) {
          lights.key.intensity = lerp(3.1, 1.5, dusk) * 0.58;
          lights.key.color.setHex(dusk > 0.5 ? 0xffb066 : 0xfff0cc);
          if (lights.fill) lights.fill.intensity = lerp(1.05, 0.62, dusk) * 0.58;
          if (lights.key2) lights.key2.intensity = lerp(1.2, 0.5, dusk) * 0.58;
        }
        if (ctx.scene.fog) ctx.scene.fog.color.setHex(dusk > 0.5 ? 0xa9703f : 0xc79a63);
        ctx.scene.background?.setHex?.(dusk > 0.5 ? 0xb06a3c : 0xd7a266);

        dunes.userData.update?.(t, dt);
        dust.update(t);
        puffs.update(dt, ctx.camera);
      },
    };
  },
};
