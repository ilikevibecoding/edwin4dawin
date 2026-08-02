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

/**
 * Where Vader is at time `t`. Everything that needs his position calls this
 * rather than reading `vader.root.position`, which is only correct after his
 * own block has run — reading it earlier made the frame depend on the previous
 * frame, and the escort troopers visibly jumped at shard boundaries.
 */
function vaderZAt(t) {
  if (t < VADER_IN) return DOOR_Z + 3;
  if (t < WALK_START) return DOOR_Z + 3 + ease.range(t, VADER_IN, VADER_IN + 1.6) * 4.5;
  const walk = ease.range(t, WALK_START, 34 - 1.4);
  return ease.lerp(DOOR_Z + 3, -1, ease.inOutCubic(walk) * 0.98);
}

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
    speed: 15,
    spin: 7,
    gravity: -10,
    spread: 0.75,
    radial: 1.05,
    stagger: 0.1,
    // BrickBurst is ballistic with no floor, so left running the bricks simply
    // sink through the deck and the corridor is bare two seconds later. They
    // fade out instead, and a static pile takes over underneath them.
    fade: 1.9,
    max: 700,
    seed: 9,
  });
  doorBurst.object.visible = false;
  scene.add(doorBurst.object);

  const rubble = buildRubble();
  scene.add(rubble);

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
      rotationY: Math.PI,
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
      hold: -41.5 + col * 1.7 + Math.floor(i / 4) * 4.6,
      wall: Math.sign(lane || 1) * (5.9 + hash11(i, 43) * 0.7),
      lag: col * 0.28 + Math.floor(i / 4) * 0.75 + hash11(i, 42) * 0.22,
      follow: 5.0 + i * 1.15, // studs behind Vader once they fall in
      file: i % 2 ? 3.3 : -3.3, // ...and which side of him
    };
  });

  const vader = await makeVader({ seed: 2.2 });
  vader.root.rotation.y = Math.PI;
  vader.root.visible = false;
  scene.add(vader.root);

  // Vader is black plastic in a dim corridor, so he travels with his own rig: a
  // cool key low and in front, which is the only thing that puts the mask and
  // the shoulders on screen, and a warm kicker from the breach behind him that
  // draws the edge of the helmet and the hem of the cape.
  const vaderKey = new THREE.PointLight(0xc6dcff, 0, 34, 2);
  const vaderRim = new THREE.PointLight(0xffb070, 0, 30, 2);
  scene.add(vaderKey, vaderRim);

  // A mouse droid, scaled up to the size LEGO gives it next to a minifig.
  const mouse = await makeMouseDroid({ seed: 4, scale: 2.6 });
  scene.add(mouse.root);

  // ------------------------------------------------------------- gunfire
  const rebelBolts = new BoltPool({ color: KIT.laserRed, length: 4.6, width: 0.3, max: 40 });
  const imperialBolts = new BoltPool({ color: KIT.laserGreen, length: 4.6, width: 0.3, max: 40 });
  scene.add(rebelBolts.object, imperialBolts.object);

  /**
   * The exchange. 22 bolts over four seconds, alternating sides, aimed so both
   * streams cross the middle of the corridor rather than running up its axis
   * where a bolt is one pixel wide.
   */
  const SHOTS = [];
  for (let i = 0; i < 22; i++) {
    const t0 = POUR + 0.35 + i * 0.19 + hash11(i, 61) * 0.09;
    const imp = i % 2 === 0;
    const h = (k) => hash11(i, k) - 0.5;
    SHOTS.push({
      t0,
      imp,
      from: imp ? [h(62) * 11, 3.4, -37 + h(63) * 6] : [h(64) * 10, 3.0, BARRICADE_Z + 1.5],
      to: imp ? [h(65) * 13, 2.6 + hash11(i, 66) * 4, BARRICADE_Z + 2.5] : [h(67) * 13, 2.8 + hash11(i, 68) * 4, -34],
    });
  }
  const BOLT_V = 155;
  for (const s of SHOTS) (s.imp ? imperialBolts : rebelBolts).add({ t0: s.t0, from: s.from, to: s.to, speed: BOLT_V });

  // Impact sparks, on eight of the twenty-two. Each Sparks is its own draw
  // call, so they are rationed: the rest of the bolts read from the streak and
  // the report alone.
  const wallHits = [];
  for (let i = 0; i < SHOTS.length; i += 3) {
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
      opacity: 0.26,
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
  for (const s of SHOTS) {
    ctx.sfx(s.t0, s.imp ? 'blaster_imperial' : 'blaster_rebel', { gain: 0.62 });
  }
  for (let i = 0; i < wallHits.length; i += 2) ctx.sfx(SHOTS[i * 3].t0 + 0.18, 'laser_impact', { gain: 0.4 });
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
      // 2 — reverse: their faces over the barricade, droid crossing the fore
      [3.55, [3.5, 3.15, -3]],
      [7.0, [1.9, 3.0, 2.5]],
      // 3 — the door, and the bricks coming at the lens
      [7.05, [1.7, 3.2, -9]],
      [BLAST + 0.9, [2.0, 3.3, -3.5]],
      [11.0, [2.3, 3.2, 2.0]],
      // 4 — low and off-axis as the squad comes through the breach
      [11.05, [-6.4, 1.9, -17]],
      [13.4, [-6.0, 2.3, -12.5]],
      // 5 — back over the rebel line as it takes casualties
      [13.45, [5.8, 3.0, 20]],
      [CEASE + 0.4, [5.0, 2.8, 16.5]],
      // 6 — the quiet, and him: low, mid-corridor, tilting up
      [CEASE + 0.45, [2.7, 1.5, -16]],
      [19.0, [2.2, 1.4, -19]],
      [22.0, [1.9, 1.5, -22]],
      // 7 — locked off wide while he speaks and the squad falls in
      [22.05, [3.2, 1.3, -3.5]],
      [27.6, [2.7, 1.25, -1.5]],
      // 8 — the tracking close-up is driven in code, see update()
      [27.65, [1.6, 1.9, 0]],
    ],
    look: [
      [0, [0, 4.1, -26]],
      [3.5, [0, 4.0, -32]],
      [3.55, [-0.7, 3.5, 14]],
      [7.0, [-0.5, 3.4, 13]],
      [7.05, [0, 4.1, DOOR_Z + 1]],
      [BLAST + 0.9, [0, 4.2, DOOR_Z + 3]],
      [11.0, [0, 4.0, DOOR_Z + 6]],
      [11.05, [0.6, 3.4, DOOR_Z + 3]],
      [13.4, [0.6, 3.2, DOOR_Z + 9]],
      [13.45, [-1.6, 2.9, 8]],
      [CEASE + 0.4, [-1.6, 2.8, 6]],
      // The tilt: it starts level on the smoke lying in the doorway and ends on
      // his helmet, which is the whole point of the beat.
      [CEASE + 0.45, [0, 1.5, DOOR_Z + 3]],
      [17.3, [0, 2.7, DOOR_Z + 4]],
      [19.8, [0, 4.7, DOOR_Z + 7]],
      [22.0, [0, 4.5, DOOR_Z + 11]],
      [22.05, [0, 4.2, -30]],
      [27.6, [0, 4.4, -22]],
      [27.65, [0, 4.3, -12]],
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
      [13.45, 46],
      [CEASE + 0.4, 45],
      [CEASE + 0.45, 44],
      [17.3, 38],
      [19.8, 33],
      [22.0, 33],
      [22.05, 40],
      [27.6, 40],
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
      const fallIn = ease.smooth(ease.range(t, 22.6, 25.4));
      squad.update(t, (i, seed, out) => {
        const L = squadLanes[i];
        const march = ease.outCubic(ease.range(t, POUR + L.lag, POUR + L.lag + 2.6));
        const holdZ = ease.lerp(DOOR_Z - 6, L.hold, march);
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
          ease.lerp(holdX, (i ? 1 : -1) * 3.9, fallIn),
          0,
          ease.lerp(holdZ, vz - 3.4 - i * 0.9, fallIn)
        );
        fig.root.rotation.y = Math.PI;
        fig.root.visible = t > POUR - 0.3;
        if (march < 0.98) poseWalk(fig, t, { speed: 3.2, amp: 0.62, bob: 0.1 });
        else if (fallIn > 0.04) poseWalk(fig, vDist / STRIDE + i * 0.4, { speed: 1, amp: 0.34, bob: 0.06 });
        else poseAim(fig, t + i);
      }

      // ------------------------------------------------- 4. the mouse droid
      // It crosses in front of the barricade early, close enough to the lens in
      // shot 2 to register, and is gone well before anything happens.
      const mu = ease.range(t, 1.8, 4.8);
      mouse.root.position.set(ease.lerp(-7.2, 7.2, mu), 0, 6);
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
      const spill = blown ? ease.lerp(0.62, 0.4, ease.range(t, BLAST + 2, 20)) : 0;
      breach.intensity = (flash * 1.1 + spill) * 190;
      breachGlow.material.opacity = flash * 0.36 + spill * 0.2;
      breachGlow.scale.setScalar(16 + flash * 20);

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

        // His travelling rig. The key sits low and ahead so it rakes up the
        // mask; the kicker stays behind him, in the breach.
        const on = ease.smooth(ease.range(t, VADER_IN, VADER_IN + 1.3));
        vaderKey.position.set(2.4, 2.6, vz + 5.5);
        vaderKey.intensity = on * 150;
        vaderRim.position.set(-2.0, 6.2, vz - 4.5);
        vaderRim.intensity = on * 190;
      } else {
        vaderKey.intensity = 0;
        vaderRim.intensity = 0;
      }

      // ---------------------------------------------------------- 8. camera
      if (t < 27.65) {
        cameraRig(camera, t, CAM);
      } else {
        // Shot 8 rides a shrinking distance ahead of him and sinks toward the
        // floor, so he grows into the lens from a low angle. Driven in code
        // rather than keyed because it has to follow his track exactly.
        const u = ease.smooth(ease.range(t, 27.65, END));
        camera.position.set(ease.lerp(1.6, 0.5, u), ease.lerp(1.9, 1.25, u), vz + ease.lerp(12.5, 5.6, u));
        camera.up.set(0, 1, 0);
        camera.lookAt(0, ease.lerp(4.3, 4.8, u), vz + 0.4);
        const fov = ease.lerp(37, 41, u);
        if (Math.abs(camera.fov - fov) > 1e-3) {
          camera.fov = fov;
          camera.updateProjectionMatrix();
        }
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

  // --- the barricade: a low wall of crates across the corridor
  for (let x = -HALF_W; x < HALF_W; x += 4) {
    b.box(x, 0, BARRICADE_Z, 4, 2, 8, grey);
    b.tile(x, 8, BARRICADE_Z, 4, 2, dark);
  }
  for (let i = 0; i < 5; i++) {
    b.box(-6.4 + i * 3.1, 0, BARRICADE_Z + 2.6 + (i % 2) * 2.4, 2.6, 2.6, 6, i % 2 ? COLORS.oliveGreen : COLORS.darkTan);
  }
  // A toppled crate on the near side, for something in the foreground of the
  // reverse angle to sit behind.
  b.box(-7.6, 0, BARRICADE_Z + 9, 2.6, 2.6, 6, COLORS.darkTan);

  // --- door frame: jambs, a lintel and a threshold plate
  for (const sx of [-1, 1]) b.box(sx * 6 - (sx > 0 ? 0 : 2), 0, DOOR_Z - 1, 2, 3, CEIL, dark);
  b.box(-8, CEIL - 3, DOOR_Z - 1, 16, 3, 3, dark);
  b.tile(-6, -1, DOOR_Z - 1, 12, 3, COLORS.flatSilver);

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
