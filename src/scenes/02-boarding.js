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
  //
  // It is two bursts over the same parts list, alternating bricks, because one
  // speed cannot do both halves of the shot: slow bricks make the wall of
  // rubble that fills the doorway on the frame of the blast, and fast ones are
  // what actually reach the retreating lens three seconds later. With only the
  // slow set the corridor is bare by 10s while the narration is still talking
  // about the bricks; with only the fast set there is no bang, just a doorway
  // that empties.
  const doorParts = door.userData.parts;
  const burst = (keep, opts) =>
    new BrickBurst(doorParts.filter((_, i) => i % 2 === keep), {
      t0: BLAST,
      spin: 7,
      radial: 1.05,
      max: 500,
      // BrickBurst is ballistic and knows nothing about the floor, so the bricks
      // cannot land — they fade out while a static pile takes over underneath.
      ...opts,
    });
  // Two bursts over alternating bricks, and what separates them is where their
  // ORIGIN is, because that is the only handle BrickBurst gives on direction: it
  // launches every part along the vector from the origin to the part.
  //
  //  - The BANG is thrown from just behind the slab. A flat wall twelve studs
  //    wide and ten tall seen from two studs back is nearly all sideways, so this
  //    one goes outward: it fills the doorway on the frame of the blast and is
  //    gone into the walls a second later, which is exactly what it is for.
  //  - The HAIL is thrown from thirty studs back, where the z term dominates for
  //    every brick in the door, with the jitter nearly off. That is what actually
  //    tumbles the length of the corridor at the lens over the next two seconds.
  //    Anything with real lateral velocity leaves a 16-stud bore inside a second
  //    and a half and there is nothing behind it: a first pass at this threw the
  //    whole door outward from the slab and the corridor was empty by 9.5s, with
  //    "a hail of bricks" still being spoken over it.
  //
  // Their fades run the length of that line for the same reason. `fade` is linear
  // from t0, so a 2.4-second fade is already two thirds gone 1.6 seconds in.
  const bursts = [
    burst(0, {
      origin: new THREE.Vector3(0, 4.4, DOOR_Z - 2),
      speed: 12,
      spread: 0.9,
      gravity: -5.5,
      stagger: 0.1,
      fade: 2.2,
      seed: 9,
    }),
    burst(1, {
      origin: new THREE.Vector3(0, 4.6, DOOR_Z - 30),
      speed: 14,
      spread: 0.16,
      gravity: -2.2,
      stagger: 0.5,
      fade: 3.6,
      seed: 17,
    }),
  ];
  for (const b of bursts) {
    b.object.visible = false;
    scene.add(b.object);
  }

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
  // Held well back and high in the airlock throat. Any nearer and it is the
  // troopers' glossy white armour and their blaster barrels that photograph it,
  // as compact specular hits that bloom into flares wherever they happen to be
  // standing; from nine studs further away the spill on the corridor mouth is
  // the same and those highlights are a third of the size.
  const breach = new THREE.PointLight(0xffd0a0, 0, 110, 2);
  breach.position.set(0, 7.0, DOOR_Z - 9);
  scene.add(breach);
  // Held high in the opening: at floor level this sprite lights the deck right
  // under Vader and he loses his feet in a white puddle.
  const breachGlow = glowSprite(0xffc890, 14, 0);
  breachGlow.position.set(0, 6.4, DOOR_Z - 2.5);
  scene.add(breachGlow);

  // Three practicals in the ceiling channel, so the strips overhead actually
  // put light in the room rather than only glowing. They are what the last shot
  // is lit by: he ends six studs off the lens with his helmet across the panel
  // behind him, and with nothing else down this end of the corridor a black
  // costume against an unlit set is simply a black frame.
  //
  // Hung three and a half units clear of the panels they belong to, and no
  // brighter: at a unit under the ceiling a lamp this size puts twenty-odd units
  // of irradiance on the plate beside it and prints a hard white rectangle up
  // there. The one furthest forward is behind the lens in every shot and is
  // purely there to keep him off a black background as he closes.
  //
  // Seven of them, and the two furthest aft are for the rebel end: it is fifty
  // studs from the breach, the preset's key comes down as the smoke rises, and
  // shot 5 was a dark blue-grey corridor with a firefight somewhere in it.
  for (const z of [26, 13, 2, -9, -18, -27, -38]) {
    const lamp = new THREE.PointLight(0xffeccc, 14, 26, 2);
    lamp.position.set(0, CEIL_Y - 3.4, z);
    scene.add(lamp);
  }

  // ------------------------------------------------------------ the cast
  // Four rebels at the barricade.
  //
  // They are instanced, one baked template each, and it is the draw-call budget
  // that decides that: the kit builds an articulated minifig out of eighteen
  // meshes, and shot 5 looks down the whole length of the corridor with every
  // figure in the scene inside the frustum at once. Four of these as real
  // minifigs is seventy-two calls on their own and put that frame at 151 against
  // a budget of 120; baked, the same four cost what their materials cost.
  //
  // What that costs dramatically is per-limb animation, and here it costs almost
  // nothing, because everything they actually do is whole-body: they hold an aim
  // (baked), they duck at the blast, and two of them go over backwards. Crowd's
  // `tilt` and `y` cover all three.
  //
  // TWO templates for the four of them, and that number is a compromise both
  // ways. Crowd turns frustum culling off — it has to, since its instances move
  // — so every template it holds is paid for in every frame of the scene, not
  // only the ones the rebels are in shot for: four templates was worse than four
  // real minifigs, because the minifigs at least vanished from the count in the
  // seven shots that face the other way. One template pays least, but shot 2 is
  // a reverse a few studs off their helmets and four identical poses at that
  // range is a chorus line. Two, with the pair sharing a template kept apart in
  // depth and turned different ways, is what fits.
  const rebelSpots = [
    [-4.9, 0, BARRICADE_Z + 2.6],
    [-1.7, 0, BARRICADE_Z + 4.2],
    [2.0, 0, BARRICADE_Z + 2.4],
    [5.2, 0, BARRICADE_Z + 4.6],
  ];
  const rebelBaked = [];
  for (const variant of [0, 2]) {
    const fig = await makeRebelTrooper({ variant, seed: 3.1 + variant * 1.7 });
    poseAim(fig, variant * 1.31, { yaw: (hash11(variant, 81) - 0.5) * 0.16 });
    // Down behind the crates. A minifig has no knees, so a crouch is both legs
    // swung forward at the hip with the body dropped by as much as that shortens
    // them — 0.34 for 0.62 radians, which puts the soles back on the deck. A
    // third of a unit, and it is the difference between four men taking cover and
    // four men standing at a counter.
    //
    // The arms come up with it. `poseAim` levels them at the shoulder, which is
    // right for a man standing; a third of a unit lower that is a blaster aimed
    // into the back of the crate in front of him. Twenty-odd degrees of elevation
    // puts the muzzles back over the top edge, where the narration says they are.
    fig.legL.rotation.x = 0.62;
    fig.legR.rotation.x = 0.56;
    fig.body.position.y -= 0.34;
    fig.torso.rotation.x = 0.12;
    fig.armL.rotation.x = -1.5;
    fig.armR.rotation.x = -1.54;
    matte(fig.root);
    rebelBaked.push(bakeFigure(fig));
  }
  const rebels = new Crowd(
    rebelBaked,
    rebelSpots.map((p, i) => ({
      template: i % 2,
      position: p,
      rotationY: Math.PI + (hash11(i, 5) - 0.5) * 0.28,
      scale: 0.97 + hash11(i, 9) * 0.06,
      seed: i * 1.7,
    })),
    { castShadow: false }
  );
  scene.add(rebels.object);

  // Two troopers are individually posed — they flank Vader in the last shots,
  // close enough to the lens that instanced copies of one pose would show.
  const heroTroopers = [];
  for (let i = 0; i < 2; i++) {
    const fig = await makeStormtrooper({ variant: i, seed: 8.2 + i * 2.3 });
    // Same reasoning as the crowd: they are never the thing casting the shadow
    // that matters, and every mesh they own would be drawn twice.
    fig.root.traverse((n) => {
      if (n.isMesh) n.castShadow = false;
    });
    matte(fig.root);
    scene.add(fig.root);
    heroTroopers.push(fig);
  }

  // ...and the rest of the squad is one instanced draw per material instead of
  // a dozen per figure.
  //
  // TWO baked poses, walking and aiming, and the whole squad changes from one to
  // the other on the frame its phase changes. That costs nothing: `Crowd` sizes
  // every template for the whole crowd, and three.js skips an InstancedMesh
  // whose count is zero before it counts the draw call — so the second pose is
  // free at every instant when the first one is unused. With one pose the beat
  // read as a chorus line: eight identical figures at the same stance sliding up
  // the corridor without walking, then standing in it without firing.
  const squadBaked = [];
  for (const walking of [true, false]) {
    const fig = await makeStormtrooper({ variant: 7, seed: 1.4 });
    if (walking) {
      // Phase chosen so sin() is at 1: legs at full extension, which is the
      // single frame of a walk cycle that reads as walking when it is frozen.
      poseWalk(fig, (Math.PI / 2 - (fig.seed ?? 0)) / Math.PI, { speed: 1, amp: 0.7, bob: 0, roll: 0.05 });
    } else {
      poseAim(fig, 0);
    }
    matte(fig.root);
    squadBaked.push(bakeFigure(fig));
  }
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
  // No shadow casting on the crowd: `renderer.info` counts the shadow pass, and
  // a dozen instanced meshes rendered twice is a tenth of the whole scene's
  // draw-call budget for shadows that fall on wall the lens never looks at.
  const squad = new Crowd(squadBaked, squadPlacements, { castShadow: false });
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
    const row = Math.floor(i / 4);
    // The second rank is offset half a lane, not stacked behind the first: four
    // abreast twice over is a grid, and from the low angle shot 4 takes it read
    // as a parade rather than as a squad coming through a hole in a wall.
    const lane = -6.0 + col * 4.0 + row * 2.0 + (hash11(i, 41) - 0.5) * 1.1;
    return {
      lane,
      // Seven studs between the ranks rather than four: at four, and with a lens
      // twenty studs off them, both ranks land on the same screen row and eight
      // troopers read as one line of seven.
      hold: -42.5 + col * 1.4 + row * 7.4 + (hash11(i, 47) - 0.5) * 3.0,
      // Where they stand once the shooting stops: out against the walls and
      // back toward the door, which clears the whole centre of the corridor for
      // him to walk out of. It also gets eight white figures out of the near
      // foreground, where they were bigger and brighter in frame than he was.
      wall: Math.sign(lane || 1) * (6.1 + hash11(i, 43) * 0.6),
      // Right back at the jambs, not a few studs out in front of them: shot 6 is
      // a 40 from twenty-two studs off the doorway, and at -39 the second rank
      // stood fourteen studs from that lens with two of them cropped by the frame
      // edges — a pair of white masses either side of the hole, each larger and
      // three times brighter than the man walking out of it.
      back: -45.0 + col * 0.9 + Math.floor(i / 4) * 1.7,
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
  // rig of three.
  //  - `vaderKey` is up at helmet height and ahead of him, which is the only
  //    thing that puts the mask, the shoulder line and the chest panel on
  //    screen at all.
  //  - `vaderFill` is low and to one side, for the cape and the boots.
  //  - `vaderRim` sits behind him in the breach and draws his edges.
  //
  // Their FALLOFF is the load-bearing part here, not their strength. He is black
  // ABS — call it 0.05 albedo — and the troopers who flank him are glossy white
  // at 0.93, eighteen times more sensitive to the same photon, standing six
  // studs off his shoulders. A plain point light bright enough to expose his
  // helmet therefore blows the nearest chest plate to paper, which is exactly
  // what the frame showed: a white slab, and Vader as the dark thing next to it.
  // Winding it down instead just loses him.
  //
  // So the two that have to be strong are CONES, narrow enough to fall entirely
  // inside his own silhouette — at nine degrees off his axis a trooper is
  // already unlit, and they are never closer than thirty — and the low fill is a
  // point light whose `distance` (a hard cutoff in three.js: the falloff is
  // windowed to zero there) dies a stud inside the gap between them.
  const vaderKey = new THREE.SpotLight(0xd2e2ff, 0, 13, 0.5, 0.72, 2);
  const vaderFill = new THREE.PointLight(0x9fb8dc, 0, 4.6, 2);
  const vaderRim = new THREE.SpotLight(0xffb070, 0, 12, 0.55, 0.8, 2);
  scene.add(vaderKey, vaderKey.target, vaderFill, vaderRim, vaderRim.target);

  // A mouse droid, scaled up to the size LEGO gives it next to a minifig.
  const mouse = await makeMouseDroid({ seed: 4, scale: 3.0 });
  scene.add(mouse.root);

  // ------------------------------------------------------------- gunfire
  // `width` drives the halo as well as the core, and the halo is nine times as
  // wide and a quarter longer than the bolt: at 0.2 a bolt crossing a stud from
  // the lens is a green bar a quarter of the frame across.
  // `glow` is the halo's opacity, and the halo is what the bloom pass sees. At
  // 0.55 an additive plane laid over a white corridor wall lands well past the
  // 0.78 threshold and blooms into a green wash over a third of the frame — the
  // bolt itself is a fifth of that size. At 0.35 the streak still has a glow on
  // it and the wall stays white.
  const bolt = { length: 2.8, width: 0.075, glow: 0.35, max: 64 };
  const rebelBolts = new BoltPool({ ...bolt, color: KIT.laserRed });
  const imperialBolts = new BoltPool({ ...bolt, color: KIT.laserGreen });
  scene.add(rebelBolts.object, imperialBolts.object);

  /**
   * The exchange: 46 bolts over four seconds, alternating sides. Both streams
   * are aimed deliberately off the corridor's axis and across it, because a
   * bolt travelling straight down the barrel of the lens is one bright pixel;
   * it only reads as fire when it crosses the frame.
   */
  const SHOTS = [];
  for (let i = 0; i < 76; i++) {
    const t0 = POUR + 0.3 + i * 0.056 + hash11(i, 61) * 0.05;
    const imp = i % 2 === 0;
    const h = (k) => hash11(i, k) - 0.5;
    SHOTS.push({
      t0,
      imp,
      // Confined to the middle 7 studs of a 16-stud bore, at both ends. Both
      // streams run nearly the whole length of the corridor, so they cross the
      // plane of every camera that stands in it — and shot 4 stands two and a
      // half studs off the port wall. Bolts allowed out to |x| = 5 passed within
      // a stud of that lens and photographed as a green bar a third of the frame
      // wide, which is not a blaster bolt, it is a lightsaber. Held inside 3.4
      // they clear it by three studs and read as fire going past.
      from: imp ? [h(62) * 6.4, 3.2 + hash11(i, 69), -36 + h(63) * 6] : [h(64) * 6.4, 3.0, BARRICADE_Z + 1.5],
      to: imp
        ? [h(65) * 6.8, 1.4 + hash11(i, 66) * 5.4, BARRICADE_Z + 2.5]
        : [h(67) * 6.8, 1.6 + hash11(i, 68) * 5.4, -34],
    });
  }
  // Slow, and deliberately so. The pool's default 220 units a second crosses
  // this corridor in a fifth of a second, so at thirteen shots a second there
  // were under three bolts in the air at any instant across both sides and the
  // firefight photographed as one streak and a lot of noise on the soundtrack.
  // At 95 each one is airborne for half a second, six or seven are up at once,
  // and they read as tracer instead of as a strobe.
  const BOLT_V = 95;
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
  //
  // Five puffs each, not twenty-two: Smoke is a group of plain sprites, so every
  // puff is its own draw call, and three banks of twenty-two was on its own half
  // the scene's entire draw-call budget. Fewer and larger reads the same at
  // these distances — a bank of smoke fifty studs down a corridor is a tonal
  // wash, and no one counts the sprites in it.
  //
  // All three sit in the twelve studs in front of the threshold, and that is the
  // load-bearing number here. Spread up the corridor as far as DOOR_Z+20 the
  // third bank straddled the lens of the two shots that watch the doorway, and a
  // 19-unit sprite at 40% opacity a stud off the glass is not smoke in a
  // corridor, it is a milk filter over the whole frame: the shot went flat, the
  // corridor stopped being white and Vader stopped being black. Kept down at the
  // far end they read as what they are — something he walks out of — and every
  // one of them is between the lens and him, which is the only place smoke does
  // any good.
  const smokes = [];
  for (let i = 0; i < 3; i++) {
    const s = new Smoke({
      t0: BLAST + 0.1 + i * 0.55,
      life: 12.5,
      count: 4,
      origin: [(hash11(i, 71) - 0.5) * 6, 2.6, DOOR_Z + 2 + i * 5],
      rise: 0.5,
      spread: 8,
      size: 19,
      color: 0x8d949c,
      opacity: 0.2,
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
  // Every third bolt gets a report — seventy-six of them inside four seconds is a
  // machine gun, not a firefight.
  for (let i = 0; i < SHOTS.length; i += 3) {
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
      // 1 — wide, pushing in from behind the barricade. It stops eleven studs
      // short of them, not five: the rebel line is at z 12.6–14.6 and a minifig
      // is four units tall, so at five studs one helmet is three quarters of the
      // frame and the shot is a shoulder, not the tableau the narration is
      // describing. From eleven the four of them, the barricade and the whole
      // length of corridor down to the door are all in it.
      [0, [1.2, 5.0, 36]],
      [3.5, [1.0, 4.5, 25.5]],
      // 2 — reverse: their faces over the barricade, droid crossing the fore.
      //     Tilted down a little further than the composition wants, because
      //     level with the barricade top the deck in front of it — and the droid
      //     on it — is entirely below the bottom of frame.
      // Rising through the shot: it has to start low enough to keep the deck the
      // droid crosses in frame, and end high enough to clear the crate tops,
      // which are level with their shoulders and otherwise hide the blasters the
      // narration is talking about.
      // Well back off the barricade too. At six studs its 3.2-unit face is a
      // featureless grey slab across the bottom half of the frame; at thirteen it
      // is a third of it and the corridor behind the rebel line reads.
      [3.55, [3.2, 4.4, -7.5]],
      [7.0, [2.4, 4.8, -2.0]],
      // 3 — the door, and the bricks coming at the lens
      [7.05, [1.7, 3.2, -9]],
      [BLAST + 0.9, [2.0, 3.3, -3.5]],
      [11.0, [2.3, 3.2, 2.0]],
      // 4 — low and off-axis as the squad comes through the breach. Low, but not
      // down among the debris: at 1.8 the nearest brick of the door is three
      // studs off the lens and a third of the frame, and the assault happens
      // behind it. And a stud and a half further off the wall than it wants to
      // be, because the wall carries a pilaster every four studs and at -7.0 the
      // nearest one was a black band up the left third of the frame.
      [11.05, [-5.6, 3.1, -25]],
      [13.4, [-5.2, 3.3, -21]],
      // 5 — the rebel line taking casualties. Close on it and off to one side,
      // which is a change of mind: this was a wide from twenty studs behind them
      // that tried to hold both ends of the corridor at once, and at that range
      // the rebels were small, the imperials seventy-five studs away were four
      // pixels tall, and the two men going over backwards — the whole content of
      // the shot — happened somewhere in the middle of an empty grey corridor.
      // From ten studs and off the axis the casualties read, and the corridor
      // still runs away to the breach behind them because that is where it looks.
      [13.45, [5.4, 4.7, 24.5]],
      [CEASE + 0.4, [4.4, 4.3, 20.5]],
      // 6 — the quiet, and him. Low and near the door, backing off as he comes
      // on: a static lens would take him from a fifth of the frame to all of it
      // in five seconds, and this beat wants him to grow, not to charge.
      //
      // Low, and a unit higher than low wants to be: the door is lying on the
      // deck in front of this lens as a field of 1.2-unit bricks, and from 1.5
      // their top edge cuts the frame at his waist for the whole beat.
      [CEASE + 0.45, [2.7, 2.5, -25]],
      [19.0, [2.3, 2.4, -22.5]],
      [22.0, [1.9, 2.4, -20]],
    ],
    look: [
      [0, [0, 4.1, -26]],
      [3.5, [0, 3.9, -32]],
      // Pitched down eight degrees rather than five. The droid crosses the deck
      // twelve studs out and the letterbox takes a fifth of the frame height with
      // it, so on the flatter line it ran along the very bottom edge of the
      // visible frame with half of it under the bar.
      [3.55, [-0.6, 2.5, 13]],
      [7.0, [-0.4, 2.8, 12]],
      [7.05, [0, 4.1, DOOR_Z + 1]],
      [BLAST + 0.9, [0, 4.2, DOOR_Z + 3]],
      [11.0, [0, 4.0, DOOR_Z + 6]],
      [11.05, [0.8, 3.4, DOOR_Z + 3]],
      [13.4, [0.8, 3.2, DOOR_Z + 8]],
      [13.45, [-1.4, 3.0, 5.5]],
      [CEASE + 0.4, [-1.2, 2.9, 1.5]],
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
      [13.45, 43],
      [CEASE + 0.4, 41],
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
      // They duck at the blast, breathe a little while they wait, and two of
      // them are hit and go over backwards away from the door.
      const flinch = ease.pulse(t, BLAST, 0.06, 0.14, 0.8);
      rebels.update(t, (i, seed, out) => {
        const down = i < 2 ? ease.smooth(ease.range(t, 12.9 + i * 1.6, 13.5 + i * 1.6)) : 0;
        out.tilt = flinch * 0.42 + down * 1.5;
        out.y = -flinch * 0.34 - down * 0.18;
        out.rotY = Math.sin(t * 0.7 + seed) * 0.03 * (1 - down);
      });
      // Nothing looks at them again after shot 5. Crowd has to leave frustum
      // culling off — its instances move — so its meshes are drawn in every frame
      // of the scene whether they are in shot or not, and two rebel templates are
      // a dozen calls out of a budget of 120 on a frame where they are forty studs
      // behind the lens.
      rebels.object.visible = t < CEASE + 0.55;

      // --------------------------------------------------- 3. the stormtroopers
      // Three phases: pour through the breach, hold a firing line, then fall in
      // behind Vader once he is past. `pull` slides them out to the walls, which
      // is what leaves the centre of the corridor to him.
      const pull = ease.smooth(ease.range(t, CEASE - 0.6, CEASE + 1.6));
      const fallIn = ease.smooth(ease.range(t, 21.4, 24.6));
      squad.update(t, (i, seed, out) => {
        const L = squadLanes[i];
        // `raw` is linear time through the advance and `march` is the eased
        // distance along it. The pose switch has to hang off the former: outCubic
        // is 98% done at 72% of the way through, so anything keyed off the eased
        // value leaves them walking almost to the end of the beat, and the frame
        // in the middle of a firefight showed eight troopers standing in a rank
        // with their arms by their sides. Off `raw` they cover nine tenths of the
        // ground in the first half of it, then plant and fire for the rest.
        const raw = ease.range(t, POUR + L.lag, POUR + L.lag + 2.6);
        const march = ease.outCubic(raw);
        // They start ON the threshold, not six studs behind it inside the lit
        // throat: pre-staged back there, eight white figures packed into a 12x24
        // opening read as a pale slab filling the doorway from the moment they
        // were switched on — which was half a second before they moved, on the
        // frame the bricks were still coming down.
        const holdZ = ease.lerp(ease.lerp(DOOR_Z - 1.5, L.hold, march), L.back, pull);
        const holdX = ease.lerp(L.lane, L.wall, pull);
        out.x = ease.lerp(holdX, L.file + (hash11(i, 44) - 0.5) * 0.8, fallIn);
        out.z = ease.lerp(holdZ, vz - L.follow, fallIn);
        // Bob only while the boots are actually moving — and stand on the walking
        // pose while they do, on the firing pose while they hold.
        const moving = (raw > 0.01 && raw < 0.55) || fallIn > 0.05;
        out.template = moving ? 0 : 1;
        out.y = moving ? Math.abs(Math.sin(vDist * 2.1 + t * 3.4 + seed)) * 0.11 : 0;
        out.rotY = Math.sin(t * 2.6 + seed) * 0.045 + (moving ? 0 : (hash11(i, 51) - 0.5) * 0.3);
        // A little lean into the firing line, different for each of them.
        out.tilt = moving ? 0 : (hash11(i, 53) - 0.5) * 0.09;
      });
      squad.object.visible = t > POUR - 0.05;

      // The two hero troopers lead the assault, then flank him.
      for (let i = 0; i < heroTroopers.length; i++) {
        const fig = heroTroopers[i];
        const march = ease.outCubic(ease.range(t, POUR + i * 0.3, POUR + 2.4 + i * 0.3));
        const holdZ = ease.lerp(DOOR_Z - 1.5, -39.5 + i * 3.2, march);
        // Back against the jambs once the shooting stops, not out in the corridor
        // beside him. Held at -39/-36 they stood twelve studs off shot 6's lens
        // at the frame edges: two cropped white masses either side of the doorway,
        // each of them brighter and bigger than the entrance they were framing.
        // At -43 they are twenty studs back, small, and read as flanking the hole
        // he walks out of.
        const holdX = ease.lerp(-3.4 + i * 6.8, (i ? 1 : -1) * 5.6, pull);
        fig.root.position.set(
          ease.lerp(holdX, (i ? 1 : -1) * 4.4, fallIn),
          0,
          ease.lerp(ease.lerp(holdZ, -43.4 + i * 1.6, pull), vz - 5.6 - i * 1.6, fallIn)
        );
        fig.root.rotation.y = (i ? -1 : 1) * 0.07;
        fig.root.visible = t > POUR - 0.1;
        if (march < 0.98) poseWalk(fig, t, { speed: 3.2, amp: 0.62, bob: 0.1 });
        else if (fallIn > 0.04) poseWalk(fig, vDist / STRIDE + i * 0.4, { speed: 1, amp: 0.34, bob: 0.06 });
        else poseAim(fig, t + i);
      }
      rubble.visible = t > BLAST + 1.0;
      rubbleFade(ease.smooth(ease.range(t, BLAST + 1.1, BLAST + 2.4)));

      // ------------------------------------------------- 4. the mouse droid
      // It crosses well forward of the barricade, ten studs off the lens in
      // shot 2, and is gone before anything happens. Any further up the corridor
      // and a knee-high droid is four pixels tall.
      //
      // Timed to the reverse angle rather than to the wide. Crossing at 1.8–4.8
      // it did its whole run while the camera was twenty-five studs behind four
      // rebels' backs, where it was a few pixels of grey on a grey deck; the beat
      // of comedy is only a beat of comedy if the shot it happens in is looking
      // at the floor it crosses.
      const mu = ease.range(t, 4.0, 6.7);
      mouse.root.position.set(ease.lerp(-7.2, 7.2, mu), 0, 8.0);
      mouse.root.rotation.y = Math.PI / 2;
      mouse.root.visible = mu > 0.01 && mu < 0.99;
      mouse.roll(t, { speed: 1.4 });

      // ------------------------------------------------------- 5. the door
      const blown = t >= BLAST;
      door.visible = !blown;
      // The bursts are hidden once faded out rather than left at zero opacity:
      // an invisible InstancedMesh still costs its draw call.
      const flying = blown && t < BLAST + 3.7;
      for (const b of bursts) {
        b.object.visible = flying;
        if (!flying) continue;
        b.update(t);
        // fx.BrickBurst fades linearly over its whole life, which means the hail
        // spends nearly all of it half transparent: the bricks read as glass
        // rather than as plastic, and the corridor wall shows through the ones
        // tumbling past the lens. Held solid and taken out sharply at the end
        // they are bricks all the way, and by then the static pile has arrived to
        // take over from them.
        const a = 1 - Math.pow(Math.min(1, Math.max(0, (t - b.t0) / b.fade)), 4);
        b.material.opacity = a;
        b.material.transparent = a < 1;
      }
      blastBall.update(t);
      blastSparks.update(t);
      for (const s of smokes) s.update(t);

      // Breach light: a hard flash on the blast, then a steady hot spill that
      // is what Vader is a silhouette against.
      const flash = ease.pulse(t, BLAST, 0.04, 0.36, 2.4);
      // Held low: the troopers' armour is glossy white, and much more than this
      // from a point source eight studs away blooms their chest plates out.
      const spill = blown ? ease.lerp(0.36, 0.18, ease.range(t, BLAST + 2, 20)) : 0;
      breach.intensity = (flash * 1.1 + spill) * 105;
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

        // His travelling rig. Each sits three or four studs off the part of him
        // it is for, and both cones are aimed at his mask.
        //
        // The numbers here are small and they have to be. He is 0.05-albedo ABS
        // three or four studs from these lamps, so with decay 2 the irradiance on
        // his chest is intensity/16 — and it takes barely two units of that to
        // put black plastic at mid grey. A first pass ran the key at 150 and the
        // frame showed exactly that: a charcoal Vader with the near-black print
        // on his mask blown out to white, so the grille read as five bright bars
        // and the narration's "something tall and black" was the palest figure in
        // the shot after the troopers. Forty is enough to find the shoulder line
        // and the bevel of the helmet and leave the rest of him where it belongs.
        //
        // The KEY also waits. Through the doorway beat he is lit from behind by
        // the breach alone, which is the shot the script asks for — in silhouette
        // — and any frontal light at all fills that in. It comes up over the two
        // seconds after he is clear of the threshold.
        const on = ease.smooth(ease.range(t, VADER_IN, VADER_IN + 1.3));
        const front = ease.smooth(ease.range(t, 19.3, 21.4));
        vaderKey.position.set(1.6, 6.6, vz + 3.6);
        vaderKey.target.position.set(0, 4.4, vz);
        // Opened up a little over the last four seconds: he is closing on the
        // lens and the corridor behind him is running out, so the only thing left
        // to separate a black helmet from a dark frame is the helmet itself.
        vaderKey.intensity = front * ease.lerp(40, 56, ease.smooth(ease.range(t, 29, 33)));
        // Up at chest height, not at knee height: a lamp this close to a white
        // deck at 1.6 puts four units of irradiance on the tiles right in front of
        // him and burns a hole in the floor of the frame.
        vaderFill.position.set(-2.4, 2.9, vz + 2.8);
        vaderFill.intensity = front * 9;
        // Off the axis rather than straight up his spine. Directly behind him the
        // rim lands on the back of the costume, which the lens never sees, and the
        // doorway beat — where he has no key at all — was a featureless black
        // monolith with a dome on it. From two and a half studs to starboard it
        // grazes one side of the helmet and the trailing edge of the cape, and
        // there is a shape in the doorway instead of a hole.
        // Well behind the shoulder line, or it stops being a rim: from vz-2.6 the
        // cone reached round onto the front of the mask and put a white flare over
        // one lens, which on a costume this dark is the brightest thing in the
        // frame. From vz-4.4 it is on his edge only.
        vaderRim.position.set(3.0, 6.6, vz - 4.4);
        vaderRim.target.position.set(0, 4.5, vz - 0.6);
        vaderRim.intensity = on * 82;
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
        // 7 — a real three-quarter, tracking beside him up the starboard wall as
        // his line lands.
        //
        // The angle is the point of this shot and it took two goes to get there.
        // Held three studs off the centre line at thirteen studs back, the lens is
        // thirteen degrees off his axis, which is a frontal single with a slight
        // lean — and shots 6, 7 and 8 were then eighteen consecutive seconds of
        // frontal singles of the same man in the same corridor, each one a little
        // larger than the last. From x +5.8 at eight studs it is thirty-six
        // degrees: his cape, the swing of his arm and the file of troopers behind
        // him all read in depth, the wall streams past to sell the walk, and the
        // cut to the head-on close that follows it lands as a cut.
        //
        // Framed for the whole figure, not the chest — and framed against the
        // LETTERBOXED height, not the render's. The mask crops 10.5% off the top
        // and the bottom, so the 8.7 units a 37 covers at thirteen studs are 6.9
        // by the time anyone sees them: centred on his chest at 4.3 that put his
        // boots and half his cape under the bar. Centred at 3.2 he is in it from
        // the deck up with headroom to spare.
        const u = ease.smooth(ease.range(t, 22.05, 26.45));
        camera.position.set(ease.lerp(5.6, 6.0, u), ease.lerp(2.6, 2.3, u), vz + ease.lerp(9.5, 7.5, u));
        camera.up.set(0, 1, 0);
        camera.lookAt(ease.lerp(0.4, 0, u), 3.2, vz + ease.lerp(1.4, 0.2, u));
        setFov(camera, ease.lerp(46, 44, u));
      } else {
        // 8 — nearly dead ahead, sinking toward the deck as the gap closes, so
        // he grows into the lens and ends looming over it. It stops seven studs
        // off him rather than six: at six his helmet covers the lit ceiling panel
        // behind it and there is nothing in frame for a black costume to be
        // black against.
        //
        // A stud and a half off the axis at the end rather than dead on it. Down
        // the exact centre line the frame is symmetrical — him in the middle,
        // two troopers mirrored either side, the corridor vanishing behind his
        // helmet — and a symmetrical frame of a man walking at you is oddly
        // static. Off-centre, one trooper reads and the other is a shoulder.
        const u = ease.smooth(ease.range(t, 26.45, END));
        camera.position.set(ease.lerp(1.7, 1.35, u), ease.lerp(2.1, 1.35, u), vz + ease.lerp(13.0, 7.0, u));
        camera.up.set(0, 1, 0);
        camera.lookAt(ease.lerp(0, 0.35, u), ease.lerp(4.2, 4.5, u), vz + 0.4);
        setFov(camera, ease.lerp(37, 45, u));
      }
      // Bolt billboards need the final camera, so they are updated after it.
      const firing = t > POUR && t < CEASE + 1.0;
      rebelBolts.object.visible = firing;
      imperialBolts.object.visible = firing;
      if (firing) {
        rebelBolts.update(t, camera);
        imperialBolts.update(t, camera);
      }
      handheld(camera, t, 0.05, 0.5, 2);

      // ------------------------------------------------------- 9. the room
      // The corridor loses its own lighting as the smoke fills it, which is
      // what makes the doorway the brightest thing in frame by 16s — and gets
      // three quarters of it back as the smoke thins behind him, because the
      // last shot is a close single of a black costume and there is nothing for
      // it to be black against if the corridor is dark too.
      const gloom =
        ease.smooth(ease.range(t, BLAST, BLAST + 2.5)) * (1 - 0.72 * ease.smooth(ease.range(t, 25.5, 31)));
      lights.hemi.intensity = ease.lerp(0.64, 0.42, gloom);
      lights.key.intensity = ease.lerp(1.5, 1.15, gloom);
      scene.fog.density = ease.lerp(0.006, 0.0135, gloom);
    },
  };
}

/**
 * Take the shine off a figure's plastic.
 *
 * The kit finishes trooper armour 'glossy', which is correct for it and is a
 * problem in this particular room: there are six point and cone lights in here,
 * and a low-roughness specular lobe returns tens of times the diffuse response
 * at whatever spot on a curved surface happens to line up. On white ABS that
 * lands well past the bloom threshold, and what the frame shows is a flare
 * hanging off a blaster barrel or a shoulder bell with no visible cause. Diffuse
 * exposure is already under control light by light; this is the specular half of
 * the same problem, and roughness is the only knob for it.
 *
 * Materials are cloned before being touched — the kit caches them across
 * figures, and the offline renderer builds every scene of the film into one
 * page, so mutating one in place would reach into other people's scenes.
 */
function matte(root, roughness = 0.66) {
  const swapped = new Map();
  const swap = (m) => {
    let c = swapped.get(m);
    if (!c) {
      c = m.clone();
      if (c.roughness !== undefined) c.roughness = Math.max(c.roughness, roughness);
      if (c.metalness !== undefined) c.metalness = Math.min(c.metalness, 0.06);
      swapped.set(m, c);
    }
    return c;
  };
  root.traverse((o) => {
    if (!o.material) return;
    o.material = Array.isArray(o.material) ? o.material.map(swap) : swap(o.material);
  });
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
          // Under the 0.78 bloom threshold, not over it. At 1.3 a three-stud
          // readout luminance-averages 0.95 and blooms into a star a third of a
          // minifig across: every trooper who walked past one arrived with a white
          // flare welded to his shoulder, which read as a blown highlight on the
          // armour rather than as a lamp on the wall behind him.
          b.panel(inner - (sx > 0 ? 0.55 : 0), 12, z + 0.7, 0.55, 2.2, 3, COLORS.transClear, {
            emissive: 0x66ccff,
            emissiveIntensity: 0.95,
            finish: 'plastic',
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
  //
  //     Eight narrow crates of four different heights rather than four wide ones
  //     of the same height. Shot 2 is a reverse a dozen studs off this thing and
  //     the barricade is the whole bottom half of the frame: as one continuous
  //     3.2-unit face it is a blank grey slab with two seams in it, and there is
  //     nothing in the shot to say the rebels are behind cover rather than
  //     standing at a counter. Stepped tops, mixed colours and exposed studs
  //     give it a silhouette; the tallest crates land just under the rebels'
  //     shoulders so their blasters still clear it.
  //
  //     The profile is not arbitrary: the four SHORT crates are the four the
  //     rebels are behind. Nine plates plus a lid is 4.0 units, and a crouched
  //     minifig's helmet tops out at 3.6, so a barricade of one height either
  //     buries the men or is too low to be cover for any of them. Piled high at
  //     the walls and in the centre, low where somebody has to shoot over it, it
  //     both reads as thrown together and leaves four helmets and four blasters
  //     clear of the top edge.
  // Concave: highest against the two walls, lowest across the middle. Both the
  // tall crates in the first pass of this landed inboard, one of them dead on the
  // corridor's centre line, where a 4.0-unit stack is the tallest thing in the
  // reverse angle and stands between two of the men it is meant to be covering.
  const crateH = [9, 6, 8, 6, 7, 6, 6, 9];
  // Greys, whites and one tan. The wall stacks behind the line are olive and
  // dark tan, and running the same colours through the barricade as well turned
  // the whole bottom half of the reverse angle into a heap of assorted plastic
  // with no read: the barricade is deck furniture and wants to be the corridor's
  // own colours, with the quartermaster's crates as the accent behind it.
  const crateC = [grey, grey, COLORS.darkBluishGray, COLORS.darkTan, grey, grey, COLORS.white, grey];
  for (let i = 0; i < 8; i++) {
    const x = -HALF_W + i * 2;
    const h = crateH[i];
    b.box(x, 0, BARRICADE_Z, 2, 2, h, crateC[i]);
    // The tall ones get a smooth lid; the low ones are left open with their studs
    // up, which both breaks the top edge along its length and keeps the four the
    // men are behind at their bare height.
    if (h > 7) b.tile(x, h, BARRICADE_Z, 2, 2, dark);
    // A dark shadow gap between crates: the seam is what reads at distance.
    if (i) b.panel(x - 0.08, 0, BARRICADE_Z - 0.05, 0.16, 2.1, h, COLORS.darkBluishGray);
  }
  // Clutter along the top, and behind the line rather than in front of it: the
  // reverse angle stands a dozen studs off the threshold side of this thing, and
  // loose bricks scattered on that deck sat six studs from the lens as a row of
  // boulders across the bottom of the frame.
  b.brick(-7.6, 9, BARRICADE_Z + 0.4, 2, 1, COLORS.darkTan);
  b.brick(-3.7, 8, BARRICADE_Z + 0.5, 1, 2, COLORS.oliveGreen);
  b.brick(6.1, 8, BARRICADE_Z + 0.3, 2, 1, COLORS.darkTan);
  for (let i = 0; i < 5; i++) {
    const h = (k) => hash11(i, 200 + k);
    b.push();
    b.translateWorld((h(1) - 0.5) * 13, 0.6, BARRICADE_Z + 3.4 + h(2) * 3.4);
    b.rotateY(h(3) * Math.PI);
    b.brick(-0.5, -1.5, -1, 1, 2, h(4) > 0.6 ? COLORS.darkTan : grey);
    b.pop();
  }
  // The quartermaster's stacks: aft of the barricade, and all of them along the
  // PORT wall. Two constraints pin them there and between them they leave one
  // place to stand. On the threshold side, at z 2–5, they were six studs off the
  // reverse angle's lens — two olive blocks filling both frame edges, larger in
  // shot than any of the four men the shot is of. Moved aft but kept on both
  // walls, the starboard pair landed five studs in front of shot 5, which stands
  // at x +5 between z 20 and 24: a featureless grey face across the right half of
  // the frame with the casualties behind it. Port-side only, they are twelve
  // studs across the corridor from that lens and read as background in it.
  for (let i = 0; i < 5; i++) {
    const row = i % 2;
    b.box(
      -HALF_W + 0.5 + row * 0.4,
      row * 6,
      BARRICADE_Z + 2 + Math.floor(i / 2) * 3.4,
      2.6,
      2.6,
      6,
      i % 3 ? COLORS.oliveGreen : COLORS.darkTan
    );
  }

  // --- door frame: jambs, a lintel and a threshold plate
  for (const sx of [-1, 1]) b.box(sx * 6 - (sx > 0 ? 0 : 2), 0, DOOR_Z - 1, 2, 3, CEIL, dark);
  b.box(-8, CEIL - 3, DOOR_Z - 1, 16, 3, 3, dark);
  // Dark grey, not silver: this plate lies directly under the breach light, and
  // a metallic finish there returns a specular hit off a 12x3 tile that burns a
  // hole in the deck at the exact centre of every shot that faces the doorway.
  b.tile(-6, -1, DOOR_Z - 1, 12, 3, COLORS.darkBluishGray);

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
  // The door's own palette, so the pile is visibly the door: mostly its greys
  // and whites, with the odd piece off its dark seam and its hazard chevrons.
  // Weighted, not uniform: the door was two thirds grey and white with a single
  // course of chevrons across it, and one brick in six coming up canary yellow
  // put more of it on the deck than was ever on the door.
  const palette = [
    COLORS.lightBluishGray,
    COLORS.white,
    COLORS.lightBluishGray,
    COLORS.white,
    COLORS.lightBluishGray,
    COLORS.darkBluishGray,
    COLORS.white,
    COLORS.darkBluishGray,
    COLORS.lightBluishGray,
    COLORS.white,
    COLORS.lightBluishGray,
    COLORS.yellow,
  ];
  const soft = { transparent: true, opacity: 0 };
  for (let i = 0; i < 46; i++) {
    const h = (k) => hash11(i, k);
    // Thickest at the threshold, thinning up the corridor, and it stops well
    // short of the lens. Shots 4 and 6 both sit at z ≈ -22: with the field
    // running to -26 the nearest brick was a stud off the glass and a third of
    // the frame, and the assault and his entrance both happened behind it. Even
    // at -32 the front rank of it walled off the bottom third of his entrance, so
    // the run is shorter again and the distribution biased harder at the door.
    const z = DOOR_Z + 1 + Math.pow(h(11), 2.3) * 11;
    const x = (h(12) - 0.5) * 14.4;
    const flat = h(15) > 0.45; // lying down, or tipped up on an edge
    const c = palette[Math.floor(h(14) * palette.length) % palette.length];
    // STUDDED, and rotated on the transform stack rather than dropped in as a
    // bare box. This debris ends up two or three studs from the lens in the
    // shot the boarders come through, and at that range a smooth cuboid is a
    // polystyrene block: the studs are the only thing that says LEGO brick.
    b.push();
    b.translateWorld(x, flat ? 0.6 : 0.63, z);
    b.rotateY(h(13) * Math.PI);
    if (!flat) {
      b.rotateZ(1.35);
      b.rotateX((h(16) - 0.5) * 0.5);
    }
    // Anchored on its own centre so the rotations happen about the brick rather
    // than about a corner of it, then lifted onto the deck by the translate.
    b.brick(-0.5, -1.5, -1, 1, 2, c, soft);
    b.pop();
  }
  const group = b.build({ castShadow: false, receiveShadow: true });
  const mats = new Set();
  group.traverse((n) => {
    if (n.isMesh) mats.add(n.material);
  });
  // Rough them off. `build()` gives every model its own material instances, so
  // this is local. A polished 1x2 brick three studs from a point light returns a
  // specular highlight well past the bloom threshold, and the frame shows a
  // brick with a hole burnt in it.
  for (const m of mats) {
    if (m.roughness !== undefined) m.roughness = Math.max(m.roughness, 0.72);
    if (m.metalness !== undefined) m.metalness = 0;
  }
  group.userData.materials = [...mats];
  return group;
}
