/**
 * Scene 2 — Boarders.
 *
 * A white corridor aboard the captured corvette. The rebels hold a barricade,
 * the blast door comes apart into its own bricks, troopers pour through, and
 * then the corridor goes quiet and something tall and black walks out of the
 * smoke.
 *
 * Narration (scene-local seconds):
 *    1.40 –  6.00  "The rebels braced in the corridor, blasters up..."
 *    7.70 – 10.54  "The door came apart in a hail of bricks."
 *   13.95 – 19.72  "Then the shooting stopped, the smoke parted..."
 *   21.12 – 27.54  VADER: "The plans are aboard this ship..."
 */
import * as THREE from 'three';
import { Bricks } from '../engine/brick.js';
import { COLORS, KIT } from '../engine/palette.js';
import { standardLights, cameraRig, handheld } from '../engine/stage.js';
import { BoltPool, BrickBurst, Sparks, Fireball, Smoke, glowSprite } from '../engine/fx.js';
import { hash11 } from '../engine/rng.js';
import { poseAim, poseWalk, poseStand, bakeFigure, Crowd } from '../kit/minifig.js';
import {
  makeVader,
  makeStormtrooper,
  makeRebelTrooper,
  makeMouseDroid,
} from '../kit/characters.js';
import * as ease from '../engine/ease.js';

export const meta = { id: 'boarding', title: 'Boarders', duration: 34, letterbox: 0.105 };

// Corridor geometry, in studs. The door is at -Z; camera starts at +Z.
const HALF_W = 8; // half the corridor width
const CEIL = 26; // ceiling height in plates
const DOOR_Z = -46;
const BACK_Z = 40;
const BARRICADE_Z = 10;

const BLAST = 7.9; // when the door goes
const VADER_IN = 16.4; // when he steps through
const WALK_START = 20.4;

export async function build(ctx) {
  /** Scene length, from the narration audio rather than from meta. */
  const END = ctx.duration;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, ctx.aspect, 0.1, 900);
  const lights = standardLights(scene, 'interior', { shadowRadius: 34, shadowMap: 2048, intensity: 0.85 });
  scene.background = new THREE.Color(0x05070b);
  scene.fog = new THREE.FogExp2(0x0a0e15, 0.0075);

  // Aim the key light down the corridor so the far end falls away into dark.
  lights.key.position.set(6, 30, 26);
  lights.rim.position.set(-4, 8, -60);
  lights.rim.intensity = 1.25;
  lights.rim.color.set(0xcfe0ff);

  // ------------------------------------------------------------- the set
  const corridor = buildCorridor();
  scene.add(corridor);

  const doorBuilder = buildBlastDoor();
  const door = doorBuilder.build();
  scene.add(door);

  // The gag: the door does not slide, it comes apart into the bricks it was
  // built from and tumbles down the corridor.
  const doorBurst = new BrickBurst(door.userData.parts, {
    t0: BLAST,
    origin: new THREE.Vector3(0, 5, DOOR_Z - 2),
    speed: 15,
    spin: 7,
    gravity: -13,
    spread: 0.7,
    radial: 1.05,
    stagger: 0.12,
    max: 700,
    seed: 9,
  });
  doorBurst.object.visible = false;
  scene.add(doorBurst.object);

  // Light spilling through the breach once the door is gone.
  const breach = new THREE.PointLight(0xffd9a0, 0, 120, 2);
  breach.position.set(0, 6, DOOR_Z + 3);
  scene.add(breach);
  const breachGlow = glowSprite(0xffd0a0, 26, 0);
  breachGlow.position.set(0, 6, DOOR_Z + 1);
  scene.add(breachGlow);

  // ------------------------------------------------------------ the cast
  const rebels = [];
  const rebelSpots = [
    [-4.6, 0, BARRICADE_Z + 2.4],
    [-1.6, 0, BARRICADE_Z + 4.0],
    [1.9, 0, BARRICADE_Z + 2.2],
    [5.0, 0, BARRICADE_Z + 4.4],
  ];
  for (let i = 0; i < rebelSpots.length; i++) {
    const fig = await makeRebelTrooper({ variant: i, seed: 3.1 + i * 1.7 });
    fig.root.position.set(...rebelSpots[i]);
    fig.root.rotation.y = Math.PI + (hash11(i, 5) - 0.5) * 0.2;
    scene.add(fig.root);
    rebels.push(fig);
  }

  // Two troopers are individually posed; the rest of the squad is instanced.
  const heroTroopers = [];
  for (let i = 0; i < 2; i++) {
    const fig = await makeStormtrooper({ variant: i, seed: 8.2 + i * 2.3 });
    scene.add(fig.root);
    heroTroopers.push(fig);
  }

  const squadTemplate = await makeStormtrooper({ variant: 7, seed: 1.4 });
  poseAim(squadTemplate, 0);
  const squadBaked = bakeFigure(squadTemplate);
  const SQUAD = 7;
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
  // Each trooper's lane and how far behind the front rank it runs.
  const squadLanes = squadPlacements.map((_, i) => ({
    x: -5.2 + (i % 4) * 3.4 + (hash11(i, 41) - 0.5) * 0.9,
    lag: (i % 4) * 0.16 + Math.floor(i / 4) * 0.5 + hash11(i, 42) * 0.2,
  }));

  const vader = await makeVader({ seed: 2.2 });
  vader.root.position.set(0, 0, DOOR_Z + 2);
  vader.root.rotation.y = Math.PI;
  vader.root.visible = false;
  scene.add(vader.root);

  // Vader is black plastic in a dim corridor, so he travels with his own
  // lighting: a cool key from ahead and a warm kicker from the breach behind.
  const vaderKey = new THREE.SpotLight(0xbcd6ff, 0, 30, 0.55, 0.7, 1.6);
  const vaderRim = new THREE.SpotLight(0xffb070, 0, 26, 0.6, 0.75, 1.6);
  const vaderTarget = new THREE.Object3D();
  scene.add(vaderKey, vaderRim, vaderTarget);
  vaderKey.target = vaderTarget;
  vaderRim.target = vaderTarget;

  const mouse = await makeMouseDroid({ seed: 4 });
  scene.add(mouse.root ?? mouse);
  const mouseRoot = mouse.root ?? mouse;

  // ------------------------------------------------------------- gunfire
  const rebelBolts = new BoltPool({ color: KIT.laserRed, length: 3.4, width: 0.15, max: 60 });
  const imperialBolts = new BoltPool({ color: KIT.laserGreen, length: 3.4, width: 0.15, max: 80 });
  scene.add(rebelBolts.object, imperialBolts.object);

  const wallHits = [];
  for (let i = 0; i < 16; i++) {
    const t0 = 11.3 + i * 0.28 + hash11(i, 61) * 0.12;
    const fromImperial = i % 2 === 0;
    const from = fromImperial
      ? [(hash11(i, 62) - 0.5) * 9, 3.2, DOOR_Z + 8 + hash11(i, 63) * 12]
      : [(hash11(i, 64) - 0.5) * 9, 3.0, BARRICADE_Z + 2];
    const to = fromImperial
      ? [(hash11(i, 65) - 0.5) * 12, 2.4 + hash11(i, 66) * 4, BARRICADE_Z + 3]
      : [(hash11(i, 67) - 0.5) * 12, 2.6 + hash11(i, 68) * 4, DOOR_Z + 10];
    (fromImperial ? imperialBolts : rebelBolts).add({ t0, from, to, speed: 150 });
    const dist = Math.hypot(to[0] - from[0], to[1] - from[1], to[2] - from[2]);
    wallHits.push(
      new Sparks({
        t0: t0 + dist / 150,
        life: 0.5,
        count: 26,
        speed: 11,
        gravity: -16,
        color: fromImperial ? 0x9dff8a : 0xffa060,
        size: 0.28,
        origin: to,
        seed: 100 + i,
      })
    );
  }
  for (const s of wallHits) scene.add(s.object);

  // ---------------------------------------------------------- blast + smoke
  const blastBall = new Fireball({
    t0: BLAST,
    life: 1.5,
    radius: 11,
    position: [0, 6, DOOR_Z + 2],
    color: 0xffb040,
  });
  scene.add(blastBall.object);
  const blastSparks = new Sparks({
    t0: BLAST,
    life: 2.2,
    count: 240,
    speed: 30,
    gravity: -16,
    color: 0xffcc70,
    size: 0.42,
    origin: [0, 5, DOOR_Z + 2],
    cone: { axis: [0, 0.15, 1], spread: 0.75 },
    seed: 12,
  });
  scene.add(blastSparks.object);

  const smokes = [];
  for (let i = 0; i < 3; i++) {
    // Kept down at the door end: a nine-unit sprite drifting past the lens
    // reads as a grey wall, not as smoke.
    const s = new Smoke({
      t0: BLAST + 0.15 + i * 0.5,
      life: 13,
      count: 22,
      origin: [(hash11(i, 71) - 0.5) * 7, 3.2, DOOR_Z + 4 + i * 6],
      rise: 0.5,
      spread: 11,
      size: 6.5,
      color: 0x7d858f,
      opacity: 0.28,
      seed: 30 + i * 7,
    });
    smokes.push(s);
    scene.add(s.object);
  }

  // ------------------------------------------------------------------ sound
  ctx.sfx(0.2, 'engine_rumble', { gain: 0.35 });
  ctx.sfx(6.0, 'engine_rumble', { gain: 0.3 });
  ctx.sfx(4.9, 'computer_beeps', { gain: 0.5 });
  ctx.sfx(6.9, 'blast_door_open', { gain: 0.7 });
  ctx.sfx(BLAST - 0.05, 'door_blast', { gain: 1.0 });
  ctx.sfx(BLAST + 0.1, 'explosion_small', { gain: 0.8 });
  ctx.sfx(BLAST + 0.5, 'brick_scatter', { gain: 0.8 });
  for (let i = 0; i < 16; i++) {
    const t0 = 11.3 + i * 0.28 + hash11(i, 61) * 0.12;
    ctx.sfx(t0, i % 2 === 0 ? 'blaster_imperial' : 'blaster_rebel', { gain: 0.7 });
    if (i % 3 === 0) ctx.sfx(t0 + 0.16, 'laser_impact', { gain: 0.45 });
  }
  ctx.sfx(15.6, 'footsteps_troopers', { gain: 0.45 });
  for (let k = 0; k < 5; k++) ctx.sfx(VADER_IN - 0.6 + k * 3.9, 'vader_breath', { gain: 0.85 });
  ctx.sfx(WALK_START, 'footsteps_troopers', { gain: 0.35 });
  ctx.sfx(19.4, 'impact_hit', { gain: 0.45 });

  // ------------------------------------------------------------------ update
  return {
    scene,
    camera,
    bloom: { strength: 0.5, radius: 0.6, threshold: 0.78 },
    update(t) {
      // --- rebels: braced, then flinching at the blast, then firing
      for (let i = 0; i < rebels.length; i++) {
        const fig = rebels[i];
        const ph = i * 1.31;
        poseAim(fig, t + ph, { yaw: (hash11(i, 81) - 0.5) * 0.16 });
        const flinch = ease.pulse(t, BLAST, 0.06, 0.12, 0.7);
        fig.torso.rotation.x = 0.05 + flinch * 0.5;
        fig.body.position.y = -flinch * 0.35;
        // Two of them go down during the exchange.
        if (i < 2) {
          const down = ease.range(t, 12.6 + i * 1.4, 13.2 + i * 1.4);
          fig.root.rotation.x = down * 1.45;
          fig.root.position.y = -down * 1.1;
        }
      }

      // --- stormtroopers advance through the breach
      const advance = ease.range(t, 10.9, 15.4);
      // Once he is walking they fall in behind him, which keeps them out of a
      // lens that is tracking backwards down the corridor.
      const escort = ease.range(t, VADER_IN + 1.0, VADER_IN + 3.0);
      const vaderZ = vader.root.position.z;
      squad.update(t, (i, seed, out) => {
        const lane = squadLanes[i];
        const u = ease.clamp(advance - lane.lag * 0.22, 0, 1);
        const held = ease.lerp(DOOR_Z - 4, -30 + (i % 3) * 6, ease.outCubic(u));
        const behind = vaderZ - 11 - (i % 3) * 5.5;
        out.x = lane.x;
        out.z = ease.lerp(held, Math.min(held, behind), escort);
        const moving = (u > 0.02 && u < 0.99) || (escort > 0.02 && t > WALK_START);
        out.y = moving ? Math.abs(Math.sin(t * 7 + seed)) * 0.12 : 0;
        out.rotY = Math.sin(t * 3 + seed) * 0.05;
      });
      squad.object.visible = t > 10.6;

      for (let i = 0; i < heroTroopers.length; i++) {
        const fig = heroTroopers[i];
        const u = ease.range(t, 11.0 + i * 0.35, 15.0);
        const held = ease.lerp(DOOR_Z - 2, -30 - i * 6, ease.outCubic(u));
        const behind = vader.root.position.z - 13 - i * 5;
        const z = ease.lerp(held, Math.min(held, behind), ease.range(t, VADER_IN + 1.0, VADER_IN + 3.0));
        fig.root.position.set(-6.0 + i * 12.0, 0, z);
        fig.root.rotation.y = Math.PI;
        fig.root.visible = t > 10.7;
        if (u < 0.98) poseWalk(fig, t, { speed: 3.4, amp: 0.7, bob: 0.1 });
        else poseAim(fig, t + i);
      }

      // --- the mouse droid scoots across early, for a beat of life
      const mu = ease.range(t, 2.4, 5.4);
      mouseRoot.position.set(ease.lerp(-9, 9, mu), 0, 22);
      mouseRoot.rotation.y = Math.PI / 2;
      mouseRoot.visible = mu > 0.01 && mu < 0.99;
      mouse.roll?.(t);

      // --- the door
      const blown = t >= BLAST;
      door.visible = !blown;
      doorBurst.object.visible = blown;
      if (blown) doorBurst.update(t);
      blastBall.update(t);
      blastSparks.update(t);
      for (const s of smokes) s.update(t);

      const glow = ease.pulse(t, BLAST, 0.04, 0.5, 3.5) * 0.8 + (blown ? 0.35 : 0);
      breach.intensity = glow * 420;
      breachGlow.material.opacity = glow * 0.5;
      breachGlow.scale.setScalar(20 + glow * 16);

      // --- gunfire
      rebelBolts.update(t, camera);
      imperialBolts.update(t, camera);
      for (const s of wallHits) s.update(t);

      // --- Vader
      const walk = ease.range(t, WALK_START, END - 1.4);
      vader.root.visible = t >= VADER_IN;
      if (vader.root.visible) {
        const z = t < WALK_START ? DOOR_Z + 3 : ease.lerp(DOOR_Z + 3, -1, ease.inOutCubic(walk) * 0.98);
        vader.root.position.set(0, 0, z);
        if (t < WALK_START) {
          poseStand(vader, t, { rate: 0.5, sway: 0.02 });
          // A slow, deliberate arrival: he stops just inside the doorway.
          const step = ease.range(t, VADER_IN, VADER_IN + 1.6);
          vader.root.position.z = DOOR_Z + 3 + step * 4.5;
          poseWalk(vader, t, { speed: 0.9, amp: 0.34, bob: 0.05, roll: 0.03 });
        } else {
          poseWalk(vader, t, { speed: 1.15, amp: 0.4, bob: 0.06, roll: 0.035 });
        }
        vader.cape?.userData?.wave?.(t, 1.1);
        vader.head.rotation.y = Math.sin(t * 0.4) * 0.07;
      }

      // --- lights that ride with him
      if (vader.root.visible) {
        const vz = vader.root.position.z;
        const near = ease.range(t, VADER_IN, VADER_IN + 1.2);
        vaderTarget.position.set(0, 3.4, vz);
        vaderKey.position.set(4.2, 7.0, vz + 5.5);
        vaderKey.intensity = near * 26;
        vaderRim.position.set(-2.6, 5.2, vz - 5.0);
        vaderRim.intensity = near * 88;
      } else {
        vaderKey.intensity = 0;
        vaderRim.intensity = 0;
      }

      // --- camera
      if (t < 24.0) {
        cameraRig(camera, t, {
          pos: [
            [0, [0.5, 8.2, BACK_Z - 2]],
            [3.0, [0.5, 6.4, BACK_Z - 12]],
            [3.4, [3.0, 2.7, -2]],
            [6.4, [1.6, 2.5, 3.5]],
            [6.9, [0.0, 3.8, DOOR_Z + 16]],
            [BLAST + 1.4, [0.0, 3.6, DOOR_Z + 13]],
            [10.0, [-6.2, 3.2, DOOR_Z + 30]],
            [12.6, [-6.0, 2.6, DOOR_Z + 34]],
            [13.1, [5.4, 2.4, BARRICADE_Z - 6]],
            [VADER_IN - 0.6, [4.6, 2.2, BARRICADE_Z - 10]],
            [VADER_IN + 2.2, [1.0, 1.9, DOOR_Z + 15]],
            [24.0, [1.2, 2.2, DOOR_Z + 20]],
          ],
          look: [
            [0, [0, 4.4, DOOR_Z + 16]],
            [3.0, [0, 4.2, DOOR_Z + 10]],
            [3.4, [-0.5, 3.7, BARRICADE_Z + 3.5]],
            [6.4, [-0.5, 3.7, BARRICADE_Z + 3.0]],
            [6.9, [0, 4.6, DOOR_Z + 2]],
            [BLAST + 1.4, [0, 4.6, DOOR_Z + 2]],
            [10.0, [0, 4.0, DOOR_Z + 6]],
            [12.6, [-1, 3.4, DOOR_Z + 12]],
            [13.1, [-0.5, 3.4, DOOR_Z + 22]],
            [VADER_IN - 0.6, [0, 4.4, DOOR_Z + 6]],
            [VADER_IN + 2.2, [0, 4.4, DOOR_Z + 6]],
            [24.0, [0, 4.4, DOOR_Z + 9]],
          ],
          fov: [
            [0, 52],
            [3.0, 46],
            [3.4, 40],
            [6.9, 38],
            [10.0, 56],
            [13.1, 44],
            [VADER_IN - 0.6, 36],
            [VADER_IN + 2.2, 33],
            [24.0, 34],
          ],
          shake: [
            [BLAST - 0.05, 0],
            [BLAST + 0.08, 0.9],
            [BLAST + 1.6, 0],
            [11.2, 0.14],
            [15.0, 0],
          ],
          ease: ease.inOutCubic,
        });
      } else {
        // Tracking shot: hold a fixed offset ahead of him and drift lower and
        // closer as he comes on, so he grows into the lens.
        const u = ease.range(t, 24.0, END);
        const vz = vader.root.position.z;
        const lead = ease.lerp(11.0, 6.0, ease.inOutCubic(u));
        camera.position.set(
          ease.lerp(1.8, 0.4, u) + Math.sin(t * 0.5) * 0.12,
          ease.lerp(2.6, 2.0, u),
          vz + lead
        );
        camera.up.set(0, 1, 0);
        camera.lookAt(0, ease.lerp(4.4, 4.7, u), vz + 0.6);
        const fov = ease.lerp(34, 39, u);
        if (Math.abs(camera.fov - fov) > 1e-3) {
          camera.fov = fov;
          camera.updateProjectionMatrix();
        }
      }
      handheld(camera, t, 0.05, 0.5, 2);

      // The corridor dims a little once the door is gone and smoke fills it.
      const gloom = ease.range(t, BLAST, BLAST + 2.5);
      lights.hemi.intensity = ease.lerp(0.64, 0.34, gloom);
      lights.key.intensity = ease.lerp(1.7, 1.1, gloom);
      scene.fog.density = ease.lerp(0.0075, 0.016, gloom);
    },
  };
}

// ---------------------------------------------------------------------------
// The corridor
// ---------------------------------------------------------------------------

function buildCorridor() {
  const b = new Bricks({ studSegments: 6 });
  const white = COLORS.white;
  const grey = COLORS.lightBluishGray;
  const dark = COLORS.darkBluishGray;

  // Floor: dark tiles with a lighter centre runner.
  for (let z = DOOR_Z - 8; z < BACK_Z; z += 4) {
    for (let x = -HALF_W; x < HALF_W; x += 4) {
      const mid = Math.abs(x + 2) < 4;
      b.tile(x, -1, z, 4, 4, mid ? grey : dark);
    }
  }

  // Ceiling with a recessed lighting channel down the middle.
  for (let z = DOOR_Z - 8; z < BACK_Z; z += 4) {
    for (const sx of [-1, 1]) {
      b.panel(sx * 2, CEIL, z, 6, 4, 2, grey);
    }
    // light strip
    if (((z / 4) | 0) % 2 === 0) {
      b.panel(-2, CEIL - 1, z, 4, 4, 1, COLORS.transClear, {
        emissive: 0xfff4dc,
        emissiveIntensity: 2.6,
        finish: 'glossy',
      });
    } else {
      b.panel(-2, CEIL - 1, z, 4, 4, 1, dark);
    }
  }

  // Walls: brick courses with a recessed rib every other bay, plus greebles.
  for (const sx of [-1, 1]) {
    const wx = sx > 0 ? HALF_W : -HALF_W - 4;
    for (let z = DOOR_Z - 8; z < BACK_Z; z += 4) {
      const bay = ((z - DOOR_Z) / 4) | 0;
      for (let row = 0; row < CEIL / 3; row++) {
        const y = row * 3;
        const c = row < 2 ? dark : row > 6 ? grey : white;
        b.brick(wx, y, z, 4, 4, c, { studs: false });
      }
      // vertical rib
      if (bay % 2 === 0) {
        b.panel(sx > 0 ? HALF_W - 0.7 : -HALF_W - 0.3, 0, z + 1, 1, 2, CEIL, grey);
      } else {
        // greeble cluster
        b.panel(sx > 0 ? HALF_W - 0.5 : -HALF_W - 0.5, 9, z + 0.6, 1, 2.8, 5, dark);
        b.cyl(sx > 0 ? HALF_W - 0.9 : -HALF_W + 0.9, 16, z + 2, 0.5, 4, COLORS.flatSilver, { segments: 8 });
        if (bay % 4 === 1) {
          b.panel(sx > 0 ? HALF_W - 0.6 : -HALF_W - 0.4, 4, z + 0.8, 1, 2.4, 3, COLORS.transClear, {
            emissive: 0x66ccff,
            emissiveIntensity: 1.8,
            finish: 'glossy',
          });
        }
      }
    }
    // pipe run along the top of each wall
    for (let z = DOOR_Z - 8; z < BACK_Z; z += 4) {
      b.cyl(sx > 0 ? HALF_W - 1.2 : -HALF_W + 1.2, 21, z + 2, 0.45, 1, COLORS.flatSilver, {
        segments: 8,
        rot: [Math.PI / 2, 0, 0],
      });
    }
  }

  // The barricade the rebels are behind: crates and a low wall.
  for (let x = -HALF_W; x < HALF_W; x += 4) {
    b.box(x, 0, BARRICADE_Z, 4, 2, 8, grey);
    b.tile(x, 8, BARRICADE_Z, 4, 2, dark);
  }
  for (let i = 0; i < 5; i++) {
    const x = -6 + i * 3;
    b.box(x, 0, BARRICADE_Z + 3 + (i % 2) * 2, 2.6, 2.6, 6, i % 2 ? COLORS.oliveGreen : COLORS.darkTan);
  }

  // Door frame.
  for (const sx of [-1, 1]) b.box(sx * 6 - (sx > 0 ? 0 : 2), 0, DOOR_Z - 1, 2, 3, CEIL, dark);
  b.box(-8, CEIL - 3, DOOR_Z - 1, 16, 3, 3, dark);

  return b.build();
}

/** The blast door, built so its parts list can be blown apart. */
function buildBlastDoor() {
  const b = new Bricks({ studSegments: 6 });
  const grey = COLORS.lightBluishGray;
  const dark = COLORS.darkBluishGray;
  for (let x = -6; x < 6; x += 2) {
    for (let row = 0; row < 8; row++) {
      const y = row * 3;
      const c = row % 2 === 0 ? grey : COLORS.white;
      b.brick(x, y, DOOR_Z, 2, 2, c, { studs: false });
    }
  }
  // Hazard chevrons and a central seam.
  for (let i = 0; i < 5; i++) {
    b.panel(-6 + i * 2.4, 10, DOOR_Z - 0.4, 1.6, 0.5, 3, i % 2 ? COLORS.yellow : dark);
  }
  b.panel(-0.4, 0, DOOR_Z - 0.4, 0.8, 0.5, 24, dark);
  b.panel(-5, 19, DOOR_Z - 0.4, 3, 0.5, 3, COLORS.red);
  return b;
}
