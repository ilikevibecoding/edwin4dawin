/**
 * Scene 2 — Boarders.
 *
 * A white corridor aboard the captured corvette. The rebels hold a barricade,
 * the blast door comes apart into the bricks it was built from, troopers pour
 * through, and then the corridor goes quiet and something tall and black walks
 * out of the smoke.
 *
 * Narration (scene-local seconds):
 *    1.40 –  6.00  "The rebels braced in the corridor, blasters up..."
 *    7.70 – 10.54  "The door came apart in a hail of bricks."
 *   13.95 – 19.72  "Then the shooting stopped, the smoke parted..."
 *   21.12 – 27.54  VADER: "The plans are aboard this ship..."
 *
 * Everything here is a pure function of t. The offline renderer shards the
 * timeline across parallel browsers, so nothing may accumulate between frames
 * and nothing may call Math.random().
 */
import * as THREE from 'three';
import { Bricks, PLATE } from '../engine/brick.js';
import { COLORS, KIT } from '../engine/palette.js';
import { standardLights, cameraRig, handheld } from '../engine/stage.js';
import { BoltPool, BrickBurst, Sparks, Fireball, Smoke, glowSprite } from '../engine/fx.js';
import { hash11 } from '../engine/rng.js';
import { poseAim, poseWalk, poseStand, bakeFigure, Crowd } from '../kit/minifig.js';
import { makeVader, makeStormtrooper, makeRebelTrooper, makeMouseDroid } from '../kit/characters.js';
import * as ease from '../engine/ease.js';

export const meta = { id: 'boarding', title: 'Boarders', duration: 34, letterbox: 0.105 };

// ---------------------------------------------------------------------------
// The set, in brick units: x and z in studs (1 stud = 1 world unit), y in
// plates (0.4 world units). The door is at -z, the camera starts at +z.
// ---------------------------------------------------------------------------

/** Half the corridor width. The bore is 16 studs — eight minifigs abreast. */
const HALF_W = 8;
/** Ceiling height in plates. 26 plates = 10.4 units, about two minifigs. */
const CEIL = 26;
const DOOR_Z = -46;
const BACK_Z = 40;
const BARRICADE_Z = 10;

/** World y of the ceiling, used to place lights and glows. */
const CEIL_Y = CEIL * PLATE;

// ------------------------------------------------------------------- timing
const BLAST = 7.9; // the door goes
const POUR = 10.9; // troopers come through
const CEASE = 15.2; // shooting stops
const VADER_IN = 16.4; // he is in the doorway
const SPEAK = 21.1; // his line starts

/**
 * Vader's walk, as a piecewise-LINEAR track of z against t. Linear matters:
 * eased keys would make him creep, lunge and creep again, and a menacing walk
 * is above all a constant one. The speed changes that are left (1.6, 1.3, 2.2,
 * then braking) all land on or near a cut.
 */
const VADER_PATH = [
  [VADER_IN, DOOR_Z + 1], // -45: filling the doorway itself
  [19.6, DOOR_Z + 6], // -40: one slow stride clear of it
  [22.0, DOOR_Z + 9.2], // -36.8: into the corridor as his line begins
  [32.2, -14.0], // steady 2.2 studs a second while he speaks
  [34.0, -12.6], // braking to a halt in front of the lens
];
/** Studs of travel per stride, used to lock his feet to the floor. */
const STRIDE = 1.32;

export async function build(ctx) {
  /** Scene length, from the narration audio rather than from meta. */
  const END = ctx.duration;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(46, ctx.aspect, 0.1, 900);
  const lights = standardLights(scene, 'interior', { shadowRadius: 34, shadowMap: 2048, intensity: 0.85 });
  scene.background = new THREE.Color(0x05070b);
  scene.fog = new THREE.FogExp2(0x0a0e15, 0.006);

  // The corridor's own strips do the modelling; the preset's key is only there
  // to keep the whites from going flat, and comes from over the camera's
  // shoulder so the far end of the corridor falls away into the dark.
  lights.key.position.set(10, 34, 40);
  lights.key.intensity = 2.1;
  lights.rim.position.set(-4, 9, -70);
  lights.rim.intensity = 1.0;
  lights.rim.color.set(0xcfe0ff);
  // The preset's hemisphere is deep-blue over brown, which turns a white
  // corvette corridor into a grey-blue one. Neutral sky, warm floor bounce.
  lights.hemi.color.set(0xc2ccd8);
  lights.hemi.groundColor.set(0x3b3630);

  // ------------------------------------------------------------- the set
  scene.add(buildCorridor());

  const doorBuilder = buildBlastDoor();
  const door = doorBuilder.build();
  scene.add(door);

  // The gag: the door does not slide, it comes apart into its own bricks and
  // tumbles down the corridor. The burst origin sits just BEHIND the slab so
  // every brick's launch vector points down the corridor, at the lens.
  const doorBurst = new BrickBurst(door.userData.parts, {
    t0: BLAST,
    origin: new THREE.Vector3(0, 4.4, DOOR_Z - 3),
    // Fast and heavily staggered, so the hail arrives at the retreating lens
    // over the length of the shot rather than in one puff at the doorway.
    speed: 22,
    spin: 7,
    // BrickBurst is ballistic and knows nothing about the floor, so at any
    // honest gravity the bricks are all under the deck a second and a half
    // later and the corridor is bare while the narration is still talking about
    // them. Light gravity keeps them in the air for the length of the shot; they
    // fade out as a static pile takes over underneath.
    gravity: -5.5,
    spread: 0.75,
    radial: 1.05,
    stagger: 0.4,
    fade: 2.6,
    max: 700,
    seed: 9,
  });
  doorBurst.object.visible = false;
  scene.add(doorBurst.object);

  const rubble = buildRubble();
  scene.add(rubble);
  /** Fade the pile in as the airborne bricks fade out. */
  const rubbleFade = (a) => {
    for (const m of rubble.userData.materials) {
      m.opacity = a;
      m.transparent = a < 0.995;
    }
  };
  rubbleFade(0);

  // The hot key from the blown doorway: everything past the breach is meant to
  // read as a lit hangar the boarders came out of.
  const breach = new THREE.PointLight(0xffd0a0, 0, 110, 2);
  breach.position.set(0, 5.2, DOOR_Z - 1);
  scene.add(breach);
  // Held high in the opening: at floor level this sprite lights the deck right
  // under Vader and he loses his feet in a white puddle.
  const breachGlow = glowSprite(0xffc890, 14, 0);
  breachGlow.position.set(0, 6.4, DOOR_Z - 2.5);
  scene.add(breachGlow);

  // ------------------------------------------------------------ the cast
  // Four rebels at the barricade. They are the foreground of the first beat,
  // so they are real minifigs rather than crowd instances.
  const rebels = [];
  const rebelSpots = [
    [-4.9, 0, BARRICADE_Z + 2.6],
    [-1.7, 0, BARRICADE_Z + 4.2],
    [2.0, 0, BARRICADE_Z + 2.4],
    [5.2, 0, BARRICADE_Z + 4.6],
  ];
  for (let i = 0; i < rebelSpots.length; i++) {
    const fig = await makeRebelTrooper({ variant: i, seed: 3.1 + i * 1.7 });
    fig.root.position.set(...rebelSpots[i]);
    fig.root.rotation.y = Math.PI + (hash11(i, 5) - 0.5) * 0.2;
    scene.add(fig.root);
    rebels.push(fig);
  }

  // Two troopers are individually posed — they flank Vader in the last shots,
  // close enough to the lens that instanced copies of one pose would show.
  const heroTroopers = [];
  for (let i = 0; i < 2; i++) {
    const fig = await makeStormtrooper({ variant: i, seed: 8.2 + i * 2.3 });
    scene.add(fig.root);
    heroTroopers.push(fig);
  }

  // ...and the rest of the squad is one instanced draw per material instead of
  // a dozen per figure. Baked mid-aim: legs apart, blaster up, which reads both
  // as advancing (with bob and roll on top) and as holding a firing line.
  const squadTemplate = await makeStormtrooper({ variant: 7, seed: 1.4 });
  poseAim(squadTemplate, 0);
  const squadBaked = bakeFigure(squadTemplate);
  const SQUAD = 8;
  const squadPlacements = [];
  for (let i = 0; i < SQUAD; i++) {
    squadPlacements.push({
      template: 0,
      position: [0, 0, 0],
      // Facing +z: the boarders come out of the door at -z and everything they
      // do — advancing, firing at the barricade, following Vader — is up-ship.
      rotationY: (hash11(i, 32) - 0.5) * 0.18,
      seed: hash11(i, 31) * 6.28,
    });
  }
  const squad = new Crowd([squadBaked], squadPlacements, { castShadow: true });
  scene.add(squad.object);

  /**
   * Where each squad member goes. `lane` is the x it advances up; `hold` is the
   * z of the firing line it stops on; `wall` is the x it slides out to once the
   * shooting stops, which is what clears the centre of the corridor for Vader —
   * and, just as importantly, keeps the camera's path down that centre free of
   * white plastic at point-blank range.
   */
  const squadLanes = squadPlacements.map((_, i) => {
    const col = i % 4;
    const lane = -6.0 + col * 4.0 + (hash11(i, 41) - 0.5) * 0.7;
    return {
      lane,
      hold: -39.0 + col * 1.7 + Math.floor(i / 4) * 4.4,
      // Where they stand once the shooting stops: out against the walls and
      // back toward the door, which clears the whole centre of the corridor for
      // him to walk out of. It also gets eight white figures out of the near
      // foreground, where they were bigger and brighter in frame than he was.
      wall: Math.sign(lane || 1) * (6.1 + hash11(i, 43) * 0.6),
      back: -43.2 + col * 1.3 + Math.floor(i / 4) * 2.1,
      lag: col * 0.28 + Math.floor(i / 4) * 0.75 + hash11(i, 42) * 0.22,
      // Studs behind Vader once they fall in, chosen so the formation lands
      // roughly on top of the firing line they were already holding — anything
      // else and eight troopers visibly slide up the corridor without walking.
      follow: 4.6 + (i % 4) * 1.5 + Math.floor(i / 4) * 3.0,
      file: (i % 2 ? 3.4 : -3.4) + (hash11(i, 45) - 0.5) * 1.2,
    };
  });

  const vader = await makeVader({ seed: 2.2 });
  vader.root.visible = false;
  scene.add(vader.root);

  // Vader is near-black plastic in a dim corridor, so he travels with his own
  // rig. Both keys are deliberately short-range: at the 30-unit range a first
  // pass used they lit forty studs of white wall as well, and he went back to
  // being the darkest thing in a bright frame.
  //  - `vaderKey` is up at helmet height and ahead of him, which is the only
  //    thing that puts the mask, the shoulder line and the chest panel on
  //    screen at all.
  //  - `vaderFill` is low and to one side, for the cape and the boots.
  //  - `vaderRim` sits behind him in the breach and draws his edges.
  const vaderKey = new THREE.PointLight(0xd2e2ff, 0, 13, 2);
  const vaderFill = new THREE.PointLight(0x9fb8dc, 0, 14, 2);
  const vaderRim = new THREE.PointLight(0xffb070, 0, 26, 2);
  scene.add(vaderKey, vaderFill, vaderRim);

  // A mouse droid, scaled up to the size LEGO gives it next to a minifig.
  const mouse = await makeMouseDroid({ seed: 4, scale: 3.0 });
  scene.add(mouse.root);

  // ------------------------------------------------------------- gunfire
  // `width` drives the halo as well as the core, and the halo is nine times as
  // wide and a quarter longer than the bolt: at 0.2 a bolt crossing a stud from
  // the lens is a green bar a quarter of the frame across.
  const rebelBolts = new BoltPool({ color: KIT.laserRed, length: 4.2, width: 0.11, glow: 0.85, max: 64 });
  const imperialBolts = new BoltPool({ color: KIT.laserGreen, length: 4.2, width: 0.11, glow: 0.85, max: 64 });
  scene.add(rebelBolts.object, imperialBolts.object);

  /**
   * The exchange: 46 bolts over four seconds, alternating sides. Both streams
   * are aimed deliberately off the corridor's axis and across it, because a
   * bolt travelling straight down the barrel of the lens is one bright pixel;
   * it only reads as fire when it crosses the frame.
   */
  const SHOTS = [];
  for (let i = 0; i < 46; i++) {
    const t0 = POUR + 0.3 + i * 0.092 + hash11(i, 61) * 0.05;
    const imp = i % 2 === 0;
    const h = (k) => hash11(i, k) - 0.5;
    SHOTS.push({
      t0,
      imp,
      // Kept inside |x| < 5, which is what stops a bolt passing through the
      // lens in the shot that watches them come through the door: additive
      // geometry a stud from the glass is a green slab across half the frame.
      from: imp ? [h(62) * 9, 3.2 + hash11(i, 69), -36 + h(63) * 6] : [h(64) * 9, 3.0, BARRICADE_Z + 1.5],
      to: imp
        ? [h(65) * 10, 1.4 + hash11(i, 66) * 5.4, BARRICADE_Z + 2.5]
        : [h(67) * 10, 1.6 + hash11(i, 68) * 5.4, -34],
    });
  }
  const BOLT_V = 150;
  for (const s of SHOTS) (s.imp ? imperialBolts : rebelBolts).add({ t0: s.t0, from: s.from, to: s.to, speed: BOLT_V });

  // Impact sparks, on eight of the forty-six. Each Sparks is its own draw call,
  // so they are rationed: the rest of the bolts read from the streak and the
  // report alone.
  const wallHits = [];
  const HIT_EVERY = 6;
  for (let i = 0; i < SHOTS.length; i += HIT_EVERY) {
    const s = SHOTS[i];
    const d = Math.hypot(s.to[0] - s.from[0], s.to[1] - s.from[1], s.to[2] - s.from[2]);
    wallHits.push(
      new Sparks({
        t0: s.t0 + d / BOLT_V,
        life: 0.42,
        count: 24,
        speed: 13,
        gravity: -17,
        color: s.imp ? 0xa8ff90 : 0xffa060,
        size: 0.24,
        origin: s.to,
        seed: 100 + i,
      })
    );
  }
  for (const s of wallHits) scene.add(s.object);

  // ---------------------------------------------------------- blast + smoke
  // Kept small on purpose. At bloom threshold 0.78 a fireball wide enough to
  // fill the doorway turns the whole frame white and the brick gag — the point
  // of the beat — is invisible under it.
  const blastBall = new Fireball({
    t0: BLAST,
    life: 1.15,
    radius: 5.5,
    position: [0, 4.6, DOOR_Z - 0.5],
    color: 0xffa838,
  });
  scene.add(blastBall.object);
  const blastSparks = new Sparks({
    t0: BLAST,
    life: 1.8,
    count: 170,
    speed: 26,
    gravity: -17,
    color: 0xffc266,
    size: 0.3,
    origin: [0, 4.2, DOOR_Z],
    cone: { axis: [0, 0.12, 1], spread: 0.8 },
    seed: 12,
  });
  scene.add(blastSparks.object);

  // Three overlapping banks of smoke, drifting back up the corridor. They have
  // to survive until Vader walks out of them at 16.4, so they are long-lived
  // and slow.
  const smokes = [];
  for (let i = 0; i < 3; i++) {
    const s = new Smoke({
      t0: BLAST + 0.1 + i * 0.55,
      life: 17,
      count: 22,
      origin: [(hash11(i, 71) - 0.5) * 7, 2.6, DOOR_Z + 4 + i * 8],
      rise: 0.5,
      spread: 12,
      size: 10,
      color: 0x8d949c,
      opacity: 0.19,
      seed: 30 + i * 7,
    });
    smokes.push(s);
    scene.add(s.object);
  }

  // ------------------------------------------------------------------ sound
  ctx.sfx(0.2, 'engine_rumble', { gain: 0.3 });
  ctx.sfx(6.4, 'engine_rumble', { gain: 0.26 });
  ctx.sfx(4.6, 'computer_beeps', { gain: 0.45 });
  ctx.sfx(6.7, 'blast_door_open', { gain: 0.55, rate: 0.7 }); // the door being cut
  ctx.sfx(BLAST - 0.05, 'door_blast', { gain: 1.0 });
  ctx.sfx(BLAST + 0.08, 'explosion_small', { gain: 0.8 });
  ctx.sfx(BLAST + 0.45, 'brick_scatter', { gain: 0.85 });
  ctx.sfx(BLAST + 1.1, 'brick_scatter', { gain: 0.4, rate: 1.3 });
  // Every other bolt gets a report — forty-six of them inside four seconds is a
  // machine gun, not a firefight.
  for (let i = 0; i < SHOTS.length; i += 2) {
    ctx.sfx(SHOTS[i].t0, SHOTS[i].imp ? 'blaster_imperial' : 'blaster_rebel', { gain: 0.6 });
  }
  for (let i = 0; i < SHOTS.length; i += HIT_EVERY * 2) ctx.sfx(SHOTS[i].t0 + 0.2, 'laser_impact', { gain: 0.4 });
  ctx.sfx(POUR - 0.2, 'footsteps_troopers', { gain: 0.5 });
  ctx.sfx(13.1, 'impact_hit', { gain: 0.5 });
  ctx.sfx(14.5, 'impact_hit', { gain: 0.45 });
  // He breathes all the way through, from the doorway to the last frame.
  for (let k = 0; k < 6; k++) ctx.sfx(VADER_IN - 0.8 + k * 3.1, 'vader_breath', { gain: 0.85 - k * 0.03 });
  ctx.sfx(SPEAK - 1.4, 'footsteps_troopers', { gain: 0.32 });
  ctx.sfx(26.0, 'footsteps_troopers', { gain: 0.28 });

  // ----------------------------------------------------------------- camera
  // Eight shots. Keys either sit on a cut (two keys 0.05s apart, a hard cut at
  // 24fps) or inside one shot, so no move ever runs across a cut.
  const CAM = {
    pos: [
      // 1 — wide, pushing in from behind the barricade
      [0, [1.2, 4.3, 33]],
      [3.5, [1.0, 3.7, 21]],
      // 2 — reverse: their faces over the barricade, droid crossing the fore.
      //     Tilted down a little further than the composition wants, because
      //     level with the barricade top the deck in front of it — and the droid
      //     on it — is entirely below the bottom of frame.
      [3.55, [3.5, 3.3, -3]],
      [7.0, [1.9, 3.15, 2.5]],
      // 3 — the door, and the bricks coming at the lens
      [7.05, [1.7, 3.2, -9]],
      [BLAST + 0.9, [2.0, 3.3, -3.5]],
      [11.0, [2.3, 3.2, 2.0]],
      // 4 — low and off-axis as the squad comes through the breach
      [11.05, [-7.0, 1.8, -25]],
      [13.4, [-6.6, 2.2, -21]],
      // 5 — high and behind the rebel line as it takes casualties. Near the
      // corridor's axis on purpose: bolts run the length of a corridor, so from
      // any real cross-angle both streams are foreshortened into dots.
      [13.45, [3.4, 4.6, 27]],
      [CEASE + 0.4, [2.7, 4.1, 22]],
      // 6 — the quiet, and him. Low and near the door, backing off as he comes
      // on: a static lens would take him from a fifth of the frame to all of it
      // in five seconds, and this beat wants him to grow, not to charge.
      [CEASE + 0.45, [2.7, 1.5, -25]],
      [19.0, [2.3, 1.4, -22.5]],
      [22.0, [1.9, 1.5, -20]],
    ],
    look: [
      [0, [0, 4.1, -26]],
      [3.5, [0, 4.0, -32]],
      [3.55, [-0.7, 2.5, 14]],
      [7.0, [-0.5, 2.5, 13]],
      [7.05, [0, 4.1, DOOR_Z + 1]],
      [BLAST + 0.9, [0, 4.2, DOOR_Z + 3]],
      [11.0, [0, 4.0, DOOR_Z + 6]],
      [11.05, [0.8, 3.4, DOOR_Z + 3]],
      [13.4, [0.8, 3.2, DOOR_Z + 8]],
      [13.45, [-0.7, 2.8, 4]],
      [CEASE + 0.4, [-0.7, 2.6, 1]],
      // The tilt: it starts level on the smoke lying in the doorway and ends on
      // his helmet, which is the whole point of the beat.
      [CEASE + 0.45, [0, 1.4, DOOR_Z + 2]],
      [17.3, [0, 2.9, DOOR_Z + 3.5]],
      [19.8, [0, 4.9, DOOR_Z + 6]],
      [22.0, [0, 4.6, DOOR_Z + 9]],
    ],
    fov: [
      [0, 48],
      [3.5, 45],
      [3.55, 40],
      [7.0, 37],
      [7.05, 38],
      [11.0, 44],
      [11.05, 52],
      [13.4, 48],
      [13.45, 47],
      [CEASE + 0.4, 45],
      [CEASE + 0.45, 45],
      [17.3, 40],
      [19.8, 34],
      [22.0, 33],
    ],
    shake: [
      [BLAST - 0.05, 0],
      [BLAST + 0.08, 0.85],
      [BLAST + 1.5, 0],
      [POUR + 0.3, 0.12],
      [CEASE, 0],
    ],
    ease: ease.inOutCubic,
  };

  // ------------------------------------------------------------------ update
  return {
    scene,
    camera,
    bloom: { strength: 0.5, radius: 0.6, threshold: 0.78 },
    update(t) {
      // ---------------------------------------------------------- 1. staging
      // Everything downstream hangs off where Vader is, so he goes first.
      const vz = ease.track(VADER_PATH, t, (x) => x);
      // Distance walked, which drives his stride so his feet never skate.
      const vDist = vz - (DOOR_Z + 1);

      // ------------------------------------------------------- 2. the rebels
      for (let i = 0; i < rebels.length; i++) {
        const fig = rebels[i];
        poseAim(fig, t + i * 1.31, { yaw: (hash11(i, 81) - 0.5) * 0.16 });
        // They duck at the blast, then lean back into the barricade.
        const flinch = ease.pulse(t, BLAST, 0.06, 0.14, 0.8);
        fig.torso.rotation.x = 0.05 + flinch * 0.55;
        fig.body.position.y = -flinch * 0.4;
        // Two of them are hit and go over backwards, away from the door.
        if (i < 2) {
          const down = ease.smooth(ease.range(t, 12.9 + i * 1.6, 13.5 + i * 1.6));
          fig.root.rotation.x = down * 1.5;
          fig.root.position.y = -down * 0.18;
        }
      }

      // --------------------------------------------------- 3. the stormtroopers
      // Three phases: pour through the breach, hold a firing line, then fall in
      // behind Vader once he is past. `pull` slides them out to the walls, which
      // is what leaves the centre of the corridor to him.
      const pull = ease.smooth(ease.range(t, CEASE - 0.6, CEASE + 1.6));
      const fallIn = ease.smooth(ease.range(t, 21.4, 24.6));
      squad.update(t, (i, seed, out) => {
        const L = squadLanes[i];
        const march = ease.outCubic(ease.range(t, POUR + L.lag, POUR + L.lag + 2.6));
        const holdZ = ease.lerp(ease.lerp(DOOR_Z - 6, L.hold, march), L.back, pull);
        const holdX = ease.lerp(L.lane, L.wall, pull);
        out.x = ease.lerp(holdX, L.file + (hash11(i, 44) - 0.5) * 0.8, fallIn);
        out.z = ease.lerp(holdZ, vz - L.follow, fallIn);
        // Bob only while the boots are actually moving.
        const moving = (march > 0.02 && march < 0.985) || fallIn > 0.05;
        out.y = moving ? Math.abs(Math.sin(vDist * 2.1 + t * 3.4 + seed)) * 0.11 : 0;
        out.rotY = Math.sin(t * 2.6 + seed) * 0.045;
      });
      squad.object.visible = t > POUR - 0.4;

      // The two hero troopers lead the assault, then flank him.
      for (let i = 0; i < heroTroopers.length; i++) {
        const fig = heroTroopers[i];
        const march = ease.outCubic(ease.range(t, POUR + i * 0.3, POUR + 2.4 + i * 0.3));
        const holdZ = ease.lerp(DOOR_Z - 4, -39.5 + i * 3.2, march);
        const holdX = ease.lerp(-3.4 + i * 6.8, (i ? 1 : -1) * 6.3, pull);
        fig.root.position.set(
          ease.lerp(holdX, (i ? 1 : -1) * 4.4, fallIn),
          0,
          ease.lerp(holdZ, vz - 5.6 - i * 1.6, fallIn)
        );
        fig.root.rotation.y = (i ? -1 : 1) * 0.07;
        fig.root.visible = t > POUR - 0.3;
        if (march < 0.98) poseWalk(fig, t, { speed: 3.2, amp: 0.62, bob: 0.1 });
        else if (fallIn > 0.04) poseWalk(fig, vDist / STRIDE + i * 0.4, { speed: 1, amp: 0.34, bob: 0.06 });
        else poseAim(fig, t + i);
      }
      rubble.visible = t > BLAST + 0.7;
      rubbleFade(ease.smooth(ease.range(t, BLAST + 0.8, BLAST + 1.7)));

      // ------------------------------------------------- 4. the mouse droid
      // It crosses well forward of the barricade, three studs off the lens in
      // shot 2, and is gone before anything happens. Any further up the corridor
      // and a knee-high droid is four pixels tall.
      const mu = ease.range(t, 1.8, 4.8);
      mouse.root.position.set(ease.lerp(-7.2, 7.2, mu), 0, 8.0);
      mouse.root.rotation.y = Math.PI / 2;
      mouse.root.visible = mu > 0.01 && mu < 0.99;
      mouse.roll(t, { speed: 1.4 });

      // ------------------------------------------------------- 5. the door
      const blown = t >= BLAST;
      door.visible = !blown;
      doorBurst.object.visible = blown;
      if (blown) doorBurst.update(t);
      blastBall.update(t);
      blastSparks.update(t);
      for (const s of smokes) s.update(t);

      // Breach light: a hard flash on the blast, then a steady hot spill that
      // is what Vader is a silhouette against.
      const flash = ease.pulse(t, BLAST, 0.04, 0.36, 2.4);
      const spill = blown ? ease.lerp(0.6, 0.3, ease.range(t, BLAST + 2, 20)) : 0;
      breach.intensity = (flash * 1.1 + spill) * 150;
      breachGlow.material.opacity = flash * 0.34 + spill * 0.13;
      breachGlow.scale.setScalar(13 + flash * 18);

      // ---------------------------------------------------------- 6. gunfire
      for (const s of wallHits) s.update(t);

      // ----------------------------------------------------------- 7. Vader
      vader.root.visible = t >= VADER_IN - 0.15;
      if (vader.root.visible) {
        vader.root.position.set(0, 0, vz);
        // One walk cycle per stride of ground covered, so the feet stay put.
        poseWalk(vader, vDist / STRIDE, { speed: 1, amp: 0.42, bob: 0.055, roll: 0.03 });
        if (vDist < 0.05) poseStand(vader, t, { rate: 0.5, sway: 0.02 });
        vader.cape?.userData?.wave?.(t, 1.15);
        vader.head.rotation.y = Math.sin(t * 0.33) * 0.06;

        // His travelling rig, close in on all three so it stays on him.
        const on = ease.smooth(ease.range(t, VADER_IN, VADER_IN + 1.3));
        vaderKey.position.set(1.7, 5.6, vz + 3.0);
        vaderKey.intensity = on * 95;
        vaderFill.position.set(-2.8, 2.2, vz + 3.4);
        vaderFill.intensity = on * 55;
        vaderRim.position.set(-1.6, 6.4, vz - 4.2);
        vaderRim.intensity = on * 170;
      } else {
        vaderKey.intensity = 0;
        vaderFill.intensity = 0;
        vaderRim.intensity = 0;
      }

      // ---------------------------------------------------------- 8. camera
      // Shots 1–6 are keyed; the last two follow him, so they are computed from
      // his own track instead of being keyed against the clock.
      if (t < 22.05) {
        cameraRig(camera, t, CAM);
      } else if (t < 26.45) {
        // 7 — three-quarter medium, riding ahead and off his right shoulder as
        // his line lands. The lens is long and the offset small on purpose: at
        // the wide angle a first pass used, whichever trooper was nearest the
        // right-hand wall sat beside the lens, cropped and twice his size.
        const u = ease.smooth(ease.range(t, 22.05, 26.45));
        camera.position.set(ease.lerp(2.9, 2.4, u), ease.lerp(2.2, 2.0, u), vz + ease.lerp(12.0, 10.2, u));
        camera.up.set(0, 1, 0);
        camera.lookAt(0, 4.3, vz + 0.4);
        setFov(camera, 34);
      } else {
        // 8 — dead ahead, sinking toward the deck as the gap closes, so he
        // grows into the lens and ends looming over it.
        const u = ease.smooth(ease.range(t, 26.45, END));
        camera.position.set(ease.lerp(1.7, 0.4, u), ease.lerp(2.0, 1.5, u), vz + ease.lerp(13.0, 6.4, u));
        camera.up.set(0, 1, 0);
        camera.lookAt(0, ease.lerp(4.2, 4.3, u), vz + 0.4);
        setFov(camera, ease.lerp(37, 44, u));
      }
      // Bolt billboards need the final camera, so they are updated after it.
      rebelBolts.update(t, camera);
      imperialBolts.update(t, camera);
      handheld(camera, t, 0.05, 0.5, 2);

      // ------------------------------------------------------- 9. the room
      // The corridor loses its own lighting as the smoke fills it, which is
      // what makes the doorway the brightest thing in frame by 16s.
      const gloom = ease.smooth(ease.range(t, BLAST, BLAST + 2.5));
      lights.hemi.intensity = ease.lerp(0.64, 0.3, gloom);
      lights.key.intensity = ease.lerp(1.5, 0.95, gloom);
      scene.fog.density = ease.lerp(0.006, 0.0145, gloom);
    },
  };
}

/** Set a field of view without rebuilding the projection matrix every frame. */
function setFov(camera, fov) {
  if (Math.abs(camera.fov - fov) > 1e-3) {
    camera.fov = fov;
    camera.updateProjectionMatrix();
  }
}

// ---------------------------------------------------------------------------
// The corridor
// ---------------------------------------------------------------------------

/**
 * One merged build for the whole set: floor, ceiling, both walls, the barricade
 * and the door frame. Everything is `{ studs: false }` except the floor and the
 * crates — a stud on every wall brick is four hundred thousand triangles and
 * they are edge-on to the lens anyway.
 */
function buildCorridor() {
  const b = new Bricks({ studSegments: 6 });
  const white = COLORS.white;
  const grey = COLORS.lightBluishGray;
  const dark = COLORS.darkBluishGray;
  const Z0 = DOOR_Z - 8;

  // --- floor: dark tiles with a lighter runner down the middle
  for (let z = Z0; z < BACK_Z; z += 4) {
    for (let x = -HALF_W; x < HALF_W; x += 4) {
      b.tile(x, -1, z, 4, 4, Math.abs(x + 2) < 4 ? grey : dark);
    }
  }

  // --- ceiling: two panels either side of a recessed lighting channel.
  //     The channel is 4 studs wide on the centreline; the panels have to fill
  //     exactly what is left of a 16-stud bore, or the corridor has a slot of
  //     open space along one side and the shadows go wrong.
  for (let z = Z0; z < BACK_Z; z += 4) {
    b.panel(-HALF_W, CEIL, z, 6, 4, 2, grey);
    b.panel(2, CEIL, z, 6, 4, 2, grey);
    const bay = ((z - DOOR_Z) / 4) | 0;
    if (bay % 2 === 0) {
      // Lit panel. Held well down in intensity: at bloom threshold 0.78 a
      // ceiling of 2.5-emissive strips fogs the whole frame.
      b.panel(-2, CEIL - 1, z, 4, 4, 1, COLORS.transClear, {
        emissive: 0xfff2d8,
        emissiveIntensity: 1.15,
        finish: 'glossy',
      });
      b.panel(-2.4, CEIL - 1, z, 0.4, 4, 1, dark);
      b.panel(2, CEIL - 1, z, 0.4, 4, 1, dark);
    } else {
      b.panel(-2, CEIL - 1, z, 4, 4, 1, dark);
    }
  }

  // --- walls: white courses over a dark skirting, ribbed every other bay
  for (const sx of [-1, 1]) {
    const wx = sx > 0 ? HALF_W : -HALF_W - 4;
    const inner = sx > 0 ? HALF_W : -HALF_W; // the face that shows
    for (let z = Z0; z < BACK_Z; z += 4) {
      const bay = ((z - DOOR_Z) / 4) | 0;
      for (let row = 0; row < 8; row++) {
        const y = row * 3;
        const c = row < 2 ? dark : row === 7 ? grey : white;
        b.brick(wx, y, z, 4, 4, c, { studs: false });
      }
      b.panel(wx, 24, z, 4, 4, 2, grey); // capping course up to the ceiling

      if (bay % 2 === 0) {
        // A full-height rib standing proud of the wall.
        b.panel(inner - (sx > 0 ? 0.8 : 0), 0, z + 1, 0.8, 2, 24, grey);
        b.panel(inner - (sx > 0 ? 1.1 : 0), 22, z + 1, 1.1, 2, 2, dark);
      } else {
        // ...and a greeble bay between the ribs: a recessed dark panel, a small
        // hatch, and on every fourth bay a lit readout.
        b.panel(inner - (sx > 0 ? 0.45 : 0), 7, z + 0.5, 0.45, 3, 8, dark);
        b.panel(inner - (sx > 0 ? 0.7 : 0), 3, z + 2.4, 0.7, 1.2, 3, grey);
        if (bay % 4 === 1) {
          b.panel(inner - (sx > 0 ? 0.55 : 0), 12, z + 0.7, 0.55, 2.2, 3, COLORS.transClear, {
            emissive: 0x66ccff,
            emissiveIntensity: 1.3,
            finish: 'glossy',
          });
        }
      }
    }
    // Two continuous conduit runs high on each wall. Continuous matters: a run
    // of short cylinders one bay apart reads as a row of tin cans hanging off
    // the wall, which is exactly how a first pass at this looked.
    const face = (sx > 0 ? HALF_W : -HALF_W) - sx * 0.55;
    for (const [py, r] of [
      [20.4, 0.3],
      [22.6, 0.19],
    ]) {
      b.bar([face, py * PLATE, Z0], [face, py * PLATE, BACK_Z], r, COLORS.flatSilver, { segments: 8 });
    }
    // Brackets, so the runs are carried rather than floating.
    for (let z = Z0 + 2; z < BACK_Z; z += 8) {
      b.panel(sx > 0 ? HALF_W - 0.9 : -HALF_W, 19.6, z, 0.9, 1, 4, dark);
    }
  }

  // --- the barricade: a low wall of crates across the corridor.
  //     The supply crates are stacked against the walls rather than behind the
  //     line: from the reverse angle, anything in the middle of the deck stands
  //     between the lens and the men it is there to photograph.
  for (let x = -HALF_W; x < HALF_W; x += 4) {
    b.box(x, 0, BARRICADE_Z, 4, 2, 8, grey);
    b.tile(x, 8, BARRICADE_Z, 4, 2, dark);
  }
  for (let i = 0; i < 6; i++) {
    const sx = i % 2 ? 1 : -1;
    const row = Math.floor(i / 2);
    b.box(
      sx > 0 ? HALF_W - 3.1 : -HALF_W + 0.5,
      row === 1 ? 6 : 0,
      BARRICADE_Z - 8 + row * 3.2,
      2.6,
      2.6,
      6,
      i % 3 ? COLORS.oliveGreen : COLORS.darkTan
    );
  }

  // --- door frame: jambs, a lintel and a threshold plate
  for (const sx of [-1, 1]) b.box(sx * 6 - (sx > 0 ? 0 : 2), 0, DOOR_Z - 1, 2, 3, CEIL, dark);
  b.box(-8, CEIL - 3, DOOR_Z - 1, 16, 3, 3, dark);
  b.tile(-6, -1, DOOR_Z - 1, 12, 3, COLORS.flatSilver);

  // --- beyond the door: a short boarding throat with a lit back wall, so that
  //     once the door is gone the opening reads as a hole into somewhere the
  //     boarders came from rather than as fog.
  for (const sx of [-1, 1]) b.panel(sx * 6 - (sx > 0 ? 0 : 1.4), 0, DOOR_Z - 11, 1.4, 10, 24, dark);
  b.panel(-7, 24, DOOR_Z - 11, 14, 10, 4, dark);
  b.panel(-6, -1, DOOR_Z - 11, 12, 10, 1, COLORS.darkBluishGray);
  b.panel(-5.6, 1, DOOR_Z - 11.6, 11.2, 0.6, 20, COLORS.transClear, {
    emissive: 0xffd9a8,
    emissiveIntensity: 0.85,
    finish: 'glossy',
  });
  // Ribs across the throat, so the light behind is broken up rather than flat.
  for (let i = 0; i < 4; i++) {
    b.panel(-6, 1 + i * 5, DOOR_Z - 11.2, 12, 0.5, 1.4, dark);
  }

  return b.build();
}

/**
 * The blast door, built as its own `Bricks` so `userData.parts` can be handed
 * to a BrickBurst. 1x2 bricks rather than 2x2: twice the parts, and a hail of
 * bricks wants to be a hail.
 */
function buildBlastDoor() {
  const b = new Bricks({ studSegments: 6 });
  const grey = COLORS.lightBluishGray;
  const dark = COLORS.darkBluishGray;
  for (let x = -6; x < 6; x += 1) {
    for (let row = 0; row < 8; row++) {
      const y = row * 3;
      // Running bond, so the seams stagger the way a real course would.
      const c = (row + (x < 0 ? 1 : 0)) % 2 === 0 ? grey : COLORS.white;
      b.brick(x, y, DOOR_Z, 1, 2, c, { studs: false });
    }
  }
  // Hazard chevrons, a central seam and a warning plate.
  for (let i = 0; i < 5; i++) {
    b.panel(-5.6 + i * 2.4, 10, DOOR_Z - 0.4, 1.6, 0.5, 3, i % 2 ? COLORS.yellow : dark);
  }
  b.panel(-0.4, 0, DOOR_Z - 0.4, 0.8, 0.5, 24, dark);
  b.panel(-5, 19, DOOR_Z - 0.4, 3, 0.5, 3, COLORS.red);
  b.panel(2.4, 4, DOOR_Z - 0.4, 2.2, 0.5, 2, COLORS.flatSilver);
  return b;
}

/**
 * Where the door ends up: a scatter of loose bricks on the deck between the
 * threshold and the barricade.
 *
 * The airborne bricks cannot land — BrickBurst is ballistic and knows nothing
 * about the floor — so the shot hands over from one to the other. This pile is
 * what the corridor still has strewn down it when Vader walks out of the smoke
 * fifteen seconds later, which is the whole payoff of building the door out of
 * bricks in the first place.
 */
function buildRubble() {
  const b = new Bricks({ studSegments: 6 });
  const grey = COLORS.lightBluishGray;
  for (let i = 0; i < 54; i++) {
    const h = (k) => hash11(i, k);
    // Thickest at the threshold, thinning up the corridor.
    const z = DOOR_Z + 1 + Math.pow(h(11), 1.7) * 26;
    const x = (h(12) - 0.5) * 14.4;
    const flat = h(15) > 0.45; // lying down, or tipped up on an edge
    b.addGeometry(rubbleBrick(), {
      x,
      y: flat ? 0.58 : 0.64,
      z,
      rot: [flat ? 0 : (h(16) - 0.5) * 0.5, h(13) * Math.PI, flat ? 0 : 1.35],
      color: h(14) > 0.5 ? grey : COLORS.white,
      opts: { transparent: true, opacity: 0 },
    });
  }
  const group = b.build({ castShadow: false, receiveShadow: true });
  const mats = new Set();
  group.traverse((n) => {
    if (n.isMesh) mats.add(n.material);
  });
  group.userData.materials = [...mats];
  return group;
}

/** One 1x2 brick — 1 stud by 2 studs by 3 plates — shared by every piece. */
let _rubbleGeo = null;
function rubbleBrick() {
  if (!_rubbleGeo) _rubbleGeo = new THREE.BoxGeometry(0.96, 3 * PLATE, 1.96);
  return _rubbleGeo;
}
