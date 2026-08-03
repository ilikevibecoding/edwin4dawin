import * as THREE from 'three';
import type { Shot } from '../camera/CameraDirector';
import type { Stage } from './Stage';
import { INTERIOR_ORIGIN, PLANET_POSITION } from './Stage';

/** Unit vector from the action toward the desert world. */
const PLANET_DIRECTION = PLANET_POSITION.clone().normalize();
import { clamp, easeInOut, easeOutCubic, lerp, smootherstep, smoothstep } from '../core/MathX';
import { BREACH_TIME, VADER_ENTRY } from './Blocking';

/**
 * The shot list.
 *
 * Each entry is one deliberate camera setup with a fixed screen direction:
 * throughout the pursuit the ships always travel toward frame-left/-Z, and
 * inside the corridor the boarders always come from screen-forward.
 */

const SPACE_NEAR = 1.2;
const SPACE_FAR = 30000;
const INT_NEAR = 0.06;
const INT_FAR = 260;

/** Interior-local coordinates to world. */
export function ip(x: number, y: number, z: number, out = new THREE.Vector3()): THREE.Vector3 {
  return out.set(x, y, z).add(INTERIOR_ORIGIN);
}

const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _c = new THREE.Vector3();

export function buildShots(stage: Stage): Shot[] {
  const runner = stage.runner.root;
  const destroyer = stage.destroyer.root;
  const pod = stage.exteriorPod.root;

  const shots: Shot[] = [];
  const add = (s: Shot): void => {
    shots.push(s);
  };

  /* ---------------------------------------------------------- prologue */
  add({
    id: 'prologue.void',
    label: 'Prologue — the void',
    start: 0,
    end: 42,
    handheld: 0.006,
    apply: (ctx, pose) => {
      pose.position.set(0, 0, 0);
      pose.target.set(Math.sin(ctx.time * 0.03) * 1.2, -0.4 + Math.sin(ctx.time * 0.021) * 0.5, -30);
      pose.fov = 52;
      pose.near = 0.1;
      pose.far = SPACE_FAR;
      pose.dof = 0;
    },
  });

  /* -------------------------------------------------- Tatooine reveal */
  add({
    id: 'tatooine.establish',
    label: 'Tatooine — establishing',
    start: 42,
    end: 62,
    blend: 1.6,
    handheld: 0.02,
    apply: (ctx, pose) => {
      const k = ctx.progress;
      pose.position.set(0, 0, 0);
      // Tilt down onto the limb, then ease back toward the horizon.
      const pitch = lerp(-0.52, -0.34, easeInOut(k));
      const yaw = lerp(0.16, -0.02, easeInOut(k));
      pose.target.set(Math.sin(yaw) * 100, Math.sin(pitch) * 100, -Math.cos(yaw) * 100);
      pose.fov = lerp(48, 42, easeInOut(k));
      pose.near = SPACE_NEAR;
      pose.far = SPACE_FAR;
    },
  });

  add({
    id: 'tatooine.limb',
    label: 'Tatooine — bright limb',
    start: 62,
    end: 78,
    blend: 2.4,
    handheld: 0.02,
    apply: (ctx, pose) => {
      const k = ctx.progress;
      pose.position.set(0, 0, 0);
      const pitch = lerp(-0.30, -0.16, easeInOut(k));
      const yaw = lerp(-0.02, -0.30, easeInOut(k));
      pose.target.set(Math.sin(yaw) * 100, Math.sin(pitch) * 100, -Math.cos(yaw) * 100);
      pose.fov = 40;
      pose.near = SPACE_NEAR;
      pose.far = SPACE_FAR;
    },
  });

  /* ----------------------------------------------------------- pursuit */
  // The corvette crosses frame at speed; the camera holds still and lets her go.
  add({
    id: 'pursuit.enter',
    label: 'Corvette enters',
    start: 78,
    end: 89,
    handheld: 0.05,
    apply: (ctx, pose) => {
      const k = easeInOut(ctx.progress);
      _a.copy(runner.position);
      // A slow orbit from off her bow round to her quarter. Nothing in deep
      // space gives parallax — no ground, no near stars — so the only way to
      // put movement in this shot is to change the aspect of the ship itself,
      // which also walks the audience round the silhouette: hammerhead first,
      // then the spine, then eleven lit engine throats.
      pose.position.set(_a.x + lerp(268, 342, k), _a.y + lerp(52, 24, k), _a.z + lerp(-330, 180, k));
      pose.target.set(_a.x - 40, _a.y + 4, _a.z - 60);
      pose.fov = 44;
      pose.near = SPACE_NEAR;
      pose.far = SPACE_FAR;
      pose.dof = 0;
    },
  });

  // The reveal. Camera holds a fixed heading and lets the wedge overrun it.
  add({
    id: 'pursuit.reveal',
    label: 'Destroyer reveal (low angle)',
    start: 89,
    end: 113,
    handheld: 0.09,
    apply: (ctx, pose) => {
      const travel = ctx.local * 120;
      const baseZ = -2530 + 430;
      // Sits close under the destroyer's flight level: the gap to the belly is
      // about a tenth of the ship's length, which is what sells the size.
      pose.position.set(16, 188, baseZ - travel);
      _a.copy(runner.position);
      // Hold on the corvette, then let the aim settle as the hull overhead
      // takes the top two thirds of the frame.
      const up = smoothstep(2, 11, ctx.local) * 70;
      pose.target.set(_a.x * 0.4, 150 + up, _a.z - 200);
      pose.fov = lerp(54, 60, smoothstep(0, 10, ctx.local));
      pose.near = SPACE_NEAR;
      pose.far = SPACE_FAR;
    },
  });

  // Profile two-shot: scale relationship in a single frame.
  add({
    id: 'pursuit.profile',
    label: 'Battle profile',
    start: 113,
    end: 131,
    handheld: 0.35,
    apply: (ctx, pose) => {
      const k = easeInOut(ctx.progress);
      _a.copy(runner.position);
      // Ahead of the corvette and off her bow, looking back down the chase.
      // Framing both ships whole needs two kilometres of stand-off, at which
      // point the corvette is eight per cent of frame height and the contrast
      // is lost; instead she is held close and the wedge runs out of frame.
      pose.position.set(_a.x + 430 - k * 40, _a.y + 54 + k * 22, _a.z - 470 - k * 40);
      pose.target.set(_a.x - 96, _a.y + 128, _a.z + 430);
      pose.fov = lerp(46, 42, k);
      pose.near = SPACE_NEAR;
      pose.far = SPACE_FAR;
    },
  });

  // Chase camera riding just off the corvette's flank.
  add({
    id: 'pursuit.chase',
    label: 'Corvette chase cam',
    start: 131,
    end: 148,
    handheld: 0.5,
    apply: (ctx, pose) => {
      const k = ctx.progress;
      _a.copy(runner.position);
      const swing = Math.sin(ctx.local * 0.22) * 26;
      pose.position.set(_a.x - 78 + swing, _a.y + 26 + k * 8, _a.z + 168 - k * 20);
      pose.target.set(_a.x, _a.y + 4, _a.z - 60);
      pose.fov = 44;
      pose.near = SPACE_NEAR;
      pose.far = SPACE_FAR;
    },
  });

  // Tight on the hull as the shields fail.
  add({
    id: 'pursuit.impacts',
    label: 'Shields fail',
    start: 148,
    end: 163,
    handheld: 0.35,
    apply: (ctx, pose) => {
      const k = ctx.progress;
      _a.copy(runner.position);
      pose.position.set(_a.x + 62, _a.y + 20 - k * 8, _a.z + 46 + k * 26);
      pose.target.set(_a.x, _a.y + 2, _a.z - 24);
      pose.fov = lerp(38, 34, k);
      pose.near = SPACE_NEAR;
      pose.far = SPACE_FAR;
      pose.dof = 0.35;
      pose.focus = 90;
      pose.focusRange = 260;
    },
  });

  // Dead in space.
  add({
    id: 'pursuit.dead',
    label: 'Drive failure',
    start: 163,
    end: 176,
    blend: 1.2,
    handheld: 0.2,
    apply: (ctx, pose) => {
      const k = ctx.progress;
      _a.copy(runner.position);
      pose.position.set(_a.x - 120 - k * 30, _a.y - 34, _a.z - 210 - k * 40);
      pose.target.set(_a.x, _a.y + 6, _a.z + 20);
      pose.fov = 40;
      pose.near = SPACE_NEAR;
      pose.far = SPACE_FAR;
    },
  });

  /* ----------------------------------------------------------- capture */
  add({
    id: 'capture.tractor',
    label: 'Tractor beam',
    start: 176,
    end: 192,
    handheld: 0.25,
    apply: (ctx, pose) => {
      const k = ctx.progress;
      _a.copy(runner.position);
      _b.copy(destroyer.position);
      pose.position.set(_a.x - 720 + k * 120, _a.y + 40, _a.z + 620 - k * 130);
      _c.lerpVectors(_a, _b, 0.3);
      pose.target.set(_c.x, _a.y + 150, _c.z);
      pose.fov = 44;
      pose.near = SPACE_NEAR;
      pose.far = SPACE_FAR;
    },
  });

  add({
    id: 'capture.underbelly',
    label: 'Held beneath the wedge',
    start: 192,
    end: 204,
    handheld: 0.2,
    apply: (ctx, pose) => {
      const k = easeInOut(ctx.progress);
      _a.copy(runner.position);
      // Stand off far enough that the belly overhead reads as a ceiling rather
      // than an unresolvable wall of plating, with the prize small beneath it.
      pose.position.set(_a.x + 700 - k * 140, _a.y - 110 + k * 30, _a.z + 235 - k * 70);
      pose.target.set(_a.x - 40, _a.y + 176, _a.z - 250);
      pose.fov = lerp(50, 46, k);
      pose.near = SPACE_NEAR;
      pose.far = SPACE_FAR;
    },
  });

  // Push in to a lit window; the white flash lands on the cut to the interior.
  add({
    id: 'capture.window',
    label: 'Push to the hull',
    start: 204,
    end: 210,
    handheld: 0.1,
    apply: (ctx, pose) => {
      const k = easeInOut(ctx.progress);
      _a.copy(runner.position);
      const dist = lerp(190, 26, k);
      pose.position.set(_a.x + dist * 0.9, _a.y + 8 + dist * 0.1, _a.z + dist * 0.35);
      pose.target.set(_a.x + 6, _a.y + 2.4, _a.z + 24);
      pose.fov = lerp(44, 36, k);
      pose.near = SPACE_NEAR;
      pose.far = SPACE_FAR;
      pose.dof = 0.5;
      pose.focus = dist;
      pose.focusRange = 140;
    },
  });

  /* ---------------------------------------------------------- corridor */
  add({
    id: 'corridor.establish',
    label: 'Forward passage — wide',
    start: 210,
    end: 223,
    handheld: 0.004,
    apply: (ctx, pose) => {
      const k = easeInOut(ctx.progress);
      ip(0, 1.62, lerp(9.4, 5.2, k), pose.position);
      ip(0, 1.42, -14.6, pose.target);
      pose.fov = lerp(52, 46, k);
      pose.near = INT_NEAR;
      pose.far = INT_FAR;
      pose.dof = 0;
    },
  });

  add({
    id: 'corridor.defender',
    label: 'Defender eye level',
    start: 223,
    end: BREACH_TIME,
    handheld: 0.008,
    apply: (ctx, pose) => {
      const k = easeInOut(ctx.progress);
      ip(0.92, 1.52, lerp(-1.4, -3.4, k), pose.position);
      ip(-0.1, 1.32, -14.8, pose.target);
      pose.fov = 40;
      pose.near = INT_NEAR;
      pose.far = INT_FAR;
      pose.dof = 0.4;
      pose.focus = 12;
      pose.focusRange = 14;
    },
  });

  add({
    id: 'corridor.breach',
    label: 'Door breach',
    start: BREACH_TIME,
    end: BREACH_TIME + 7,
    handheld: 0.02,
    apply: (ctx, pose) => {
      const k = ctx.progress;
      ip(-1.05, 1.06, lerp(-8.6, -7.4, easeOutCubic(k)), pose.position);
      ip(0.1, 1.4, -15, pose.target);
      pose.fov = lerp(54, 48, k);
      pose.near = INT_NEAR;
      pose.far = INT_FAR;
      pose.dof = 0;
    },
  });

  add({
    id: 'corridor.crossfire',
    label: 'Crossfire',
    start: BREACH_TIME + 7,
    end: BREACH_TIME + 17,
    handheld: 0.02,
    apply: (ctx, pose) => {
      const k = ctx.progress;
      // Above head height in the middle of the passage: defenders read as
      // mid-ground silhouettes instead of filling the lens with a face.
      ip(0.18, 2.05, lerp(4.4, 2.6, easeInOut(k)), pose.position);
      ip(-0.1, 1.15, -12.5, pose.target);
      pose.fov = 46;
      pose.near = INT_NEAR;
      pose.far = INT_FAR;
    },
  });

  add({
    id: 'corridor.advance',
    label: 'Boarders advance',
    start: BREACH_TIME + 17,
    end: BREACH_TIME + 26,
    handheld: 0.016,
    apply: (ctx, pose) => {
      const k = ctx.progress;
      ip(-1.18, 1.28, lerp(-12.2, -10.4, easeInOut(k)), pose.position);
      ip(0.4, 1.24, 1.5, pose.target);
      pose.fov = 46;
      pose.near = INT_NEAR;
      pose.far = INT_FAR;
    },
  });

  add({
    id: 'corridor.quiet',
    label: 'After the fighting',
    start: BREACH_TIME + 26,
    end: VADER_ENTRY,
    blend: 0.9,
    handheld: 0.006,
    apply: (ctx, pose) => {
      const k = easeInOut(ctx.progress);
      ip(0.32, 1.74, lerp(3.4, 0.6, k), pose.position);
      ip(0, 1.24, -13.6, pose.target);
      pose.fov = 42;
      pose.near = INT_NEAR;
      pose.far = INT_FAR;
      pose.dof = 0.35;
      pose.focus = 13;
      pose.focusRange = 16;
    },
  });

  // Low, centred on the doorway: he fills it before he moves. The camera sits
  // between the two rear trooper stations so nobody crosses the lens.
  add({
    id: 'corridor.vader',
    label: 'Arrival',
    start: VADER_ENTRY,
    end: VADER_ENTRY + 14,
    handheld: 0.004,
    apply: (ctx, pose) => {
      // Most of the move happens in the first two seconds, so he has weight
      // from the moment he clears the doorway rather than at the end of the
      // shot. The long lens keeps the flanking troopers outside the frame:
      // white armour in the near foreground dwarfs anything behind it.
      const k = easeOutCubic(ctx.progress);
      const vz = stage.vader.root.position.z;
      // Held aft of every trooper station and pulled in on a long lens. Put
      // the lens between them and two suits of white armour crop the frame
      // either side and dwarf the one figure the shot is about.
      const camZ = lerp(-2.4, -4.8, k);
      ip(0.0, lerp(0.74, 0.88, k), camZ, pose.position);
      ip(0, lerp(1.34, 1.52, k), vz + 0.25, pose.target);
      pose.fov = lerp(35, 22, k);
      pose.near = INT_NEAR;
      pose.far = INT_FAR;
      pose.dof = 0.45;
      pose.focus = Math.abs(vz - camZ);
      pose.focusRange = 7;
    },
  });

  add({
    id: 'corridor.vader.walk',
    label: 'The dark lord advances',
    start: VADER_ENTRY + 14,
    end: 288,
    blend: 0.7,
    handheld: 0.01,
    apply: (ctx, pose) => {
      const vz = stage.vader.root.position.z;
      const k = ctx.progress;
      ip(1.24, 1.46, vz + lerp(4.6, 3.6, k), pose.position);
      ip(0, 1.58, vz, pose.target);
      pose.fov = 42;
      pose.near = INT_NEAR;
      pose.far = INT_FAR;
      pose.dof = 0.35;
      pose.focus = 4.4;
      pose.focusRange = 7;
    },
  });

  /* ------------------------------------------------------------- plans */
  add({
    id: 'plans.approach',
    label: 'Aft of the fighting',
    start: 288,
    end: 297,
    handheld: 0.008,
    apply: (ctx, pose) => {
      const k = easeInOut(ctx.progress);
      ip(lerp(1.9, 0.6, k), 1.55, lerp(21.6, 20.6, k), pose.position);
      // Character transforms are set-local; lift them into world space.
      const p = stage.leia.root.position;
      ip(p.x, p.y + 1.2, p.z, pose.target);
      pose.fov = 42;
      pose.near = INT_NEAR;
      pose.far = INT_FAR;
      pose.dof = 0.4;
      pose.focus = 2.6;
      pose.focusRange = 4;
    },
  });

  add({
    id: 'plans.console',
    label: 'The plans unfold',
    start: 297,
    end: 312,
    handheld: 0.006,
    apply: (ctx, pose) => {
      const k = easeInOut(ctx.progress);
      ip(lerp(-0.55, -1.15, k), lerp(1.72, 1.62, k), lerp(20.5, 19.9, k), pose.position);
      ip(-3.0, 1.78, 18.5, pose.target);
      pose.fov = lerp(40, 34, k);
      pose.near = INT_NEAR;
      pose.far = INT_FAR;
      pose.dof = 0.55;
      pose.focus = 2.3;
      pose.focusRange = 3.2;
    },
  });

  add({
    id: 'plans.transfer',
    label: 'Handing over the file',
    start: 312,
    end: 324,
    handheld: 0.005,
    apply: (ctx, pose) => {
      const k = easeInOut(ctx.progress);
      // Side-on two-shot: the princess kneeling on the left of frame, the
      // droid on the right, and the stream of data visible between them.
      ip(lerp(0.55, 0.2, k), lerp(1.3, 1.12, k), lerp(15.6, 16.1, k), pose.position);
      ip(-2.1, 1.05, 17.9, pose.target);
      pose.fov = lerp(44, 40, k);
      pose.near = INT_NEAR;
      pose.far = INT_FAR;
      pose.dof = 0.6;
      pose.focus = 1.9;
      pose.focusRange = 2.6;
    },
  });

  add({
    id: 'plans.threat',
    label: 'They are coming aft',
    start: 324,
    end: 332,
    handheld: 0.012,
    apply: (ctx, pose) => {
      const k = easeInOut(ctx.progress);
      ip(-2.4, 1.62, lerp(18.4, 19.4, k), pose.position);
      ip(0.4, 1.4, lerp(9.0, 6.0, k), pose.target);
      pose.fov = 44;
      pose.near = INT_NEAR;
      pose.far = INT_FAR;
      pose.dof = 0.3;
      pose.focus = 8;
      pose.focusRange = 10;
    },
  });

  /* --------------------------------------------------------------- pod */
  add({
    id: 'pod.run',
    label: 'Droids to the bay',
    start: 332,
    end: 343,
    handheld: 0.012,
    apply: (ctx, pose) => {
      const k = easeInOut(ctx.progress);
      const r2 = stage.r2.root.position;
      ip(lerp(-1.2, 1.2, k), 1.02, lerp(20.0, 19.4, k), pose.position);
      ip(r2.x, r2.y + 0.6, r2.z, pose.target);
      pose.fov = 48;
      pose.near = INT_NEAR;
      pose.far = INT_FAR;
      pose.dof = 0.35;
      pose.focus = 3.4;
      pose.focusRange = 5;
    },
  });

  add({
    id: 'pod.bay',
    label: 'Pod bay six',
    start: 343,
    end: 352,
    handheld: 0.01,
    apply: (ctx, pose) => {
      const k = easeInOut(ctx.progress);
      // Shooting through the bay doorway from inside the vestibule.
      ip(lerp(1.5, 3.3, k), lerp(1.48, 1.36, k), lerp(17.9, 17.4, k), pose.position);
      ip(6.5, 1.16, 17.0, pose.target);
      pose.fov = lerp(50, 44, k);
      pose.near = INT_NEAR;
      pose.far = INT_FAR;
      pose.dof = 0.35;
      pose.focus = 3.6;
      pose.focusRange = 5;
    },
  });

  // Held off the corvette's starboard flank: the pod separates toward the
  // camera and drops out of the bottom of frame past the hull.
  add({
    id: 'pod.launch',
    label: 'Pod away',
    start: 352,
    end: 362,
    handheld: 0.4,
    apply: (ctx, pose) => {
      const k = easeInOut(ctx.progress);
      _a.copy(runner.position);
      _b.copy(pod.position);
      pose.position.set(_a.x + 92 + k * 26, _a.y + 6 - k * 12, _a.z + 46 - k * 10);
      // Start on the hatch, then follow the pod out.
      _c.set(_a.x + 12, _a.y - 2, _a.z + 22);
      pose.target.lerpVectors(_c, _b, smoothstep(0.1, 0.6, ctx.progress));
      pose.fov = lerp(42, 48, k);
      pose.near = SPACE_NEAR;
      pose.far = SPACE_FAR;
      pose.dof = 0;
    },
  });

  // Trailing the pod: it sits in the near foreground with the two captured
  // ships receding directly behind it, which is the whole point of the beat.
  add({
    id: 'pod.away',
    label: 'Falling clear',
    start: 362,
    end: 374,
    handheld: 0.25,
    apply: (ctx, pose) => {
      const k = easeInOut(ctx.progress);
      _b.copy(pod.position);
      _a.copy(runner.position);
      const toShips = _c.copy(_a).sub(_b).normalize();
      const side = new THREE.Vector3().crossVectors(toShips, new THREE.Vector3(0, 1, 0)).normalize();
      pose.position
        .copy(_b)
        .addScaledVector(toShips, -(70 + k * 60))
        .addScaledVector(side, 42 + k * 26)
        .add(new THREE.Vector3(0, 20 + k * 10, 0));
      pose.target.copy(_b).addScaledVector(toShips, 26);
      pose.fov = 46;
      pose.near = SPACE_NEAR;
      pose.far = SPACE_FAR;
    },
  });

  // Looking along the pod's fall so the desert world fills the background.
  add({
    id: 'pod.descent',
    label: 'Atmospheric entry',
    start: 374,
    end: 382,
    blend: 1.4,
    handheld: 0.3,
    apply: (ctx, pose) => {
      const k = easeInOut(ctx.progress);
      _b.copy(pod.position);
      const away = PLANET_DIRECTION.clone().multiplyScalar(-1);
      const side = new THREE.Vector3().crossVectors(away, new THREE.Vector3(0, 1, 0)).normalize();
      pose.position
        .copy(_b)
        .addScaledVector(away, 150 + k * 260)
        .addScaledVector(side, 90 + k * 120);
      pose.target.copy(_b);
      pose.fov = lerp(44, 34, k);
      pose.near = SPACE_NEAR;
      pose.far = SPACE_FAR;
    },
  });

  /* ---------------------------------------------------------- epilogue */
  // The closing geography in one frame: captured ships high, planet low, and
  // the pod a bright point falling between them. The camera sits abeam of the
  // line joining the two, so their real vertical separation reads on screen.
  add({
    id: 'epilogue.wide',
    label: 'The ships remain',
    start: 382,
    end: 395,
    blend: 1.8,
    handheld: 0.3,
    apply: (ctx, pose) => {
      const k = easeInOut(ctx.progress);
      _a.copy(runner.position);
      _b.copy(pod.position);
      _c.lerpVectors(_b, _a, 0.46);
      const axis = _a.clone().sub(_b).normalize();
      const side = new THREE.Vector3().crossVectors(axis, new THREE.Vector3(0, 1, 0)).normalize();
      const dist = 4300 + k * 500;
      pose.position.copy(_c).addScaledVector(side, dist).add(new THREE.Vector3(0, 120, 0));
      pose.target.copy(_c);
      pose.fov = 50;
      pose.near = SPACE_NEAR;
      pose.far = SPACE_FAR;
    },
  });

  add({
    id: 'epilogue.card',
    label: 'Closing card',
    start: 395,
    end: 404,
    blend: 2.2,
    handheld: 0.05,
    apply: (ctx, pose) => {
      const k = smootherstep(0, 1, ctx.progress);
      _a.copy(runner.position);
      _b.copy(pod.position);
      _c.lerpVectors(_b, _a, 0.5);
      const axis = _a.clone().sub(_b).normalize();
      const side = new THREE.Vector3().crossVectors(axis, new THREE.Vector3(0, 1, 0)).normalize();
      pose.position
        .copy(_c)
        .addScaledVector(side, 5200 + k * 1400)
        .add(new THREE.Vector3(0, 240 + k * 200, 0));
      pose.target.copy(_c);
      pose.fov = lerp(48, 44, k);
      pose.near = SPACE_NEAR;
      pose.far = SPACE_FAR;
    },
  });

  return shots;
}

/** Screen fade schedule: chapter punctuation and the two hard transitions. */
export function fadeAt(time: number): { amount: number; color: THREE.Color } {
  const black = new THREE.Color(0, 0, 0);
  const white = new THREE.Color(1, 1, 1);
  // Open from black.
  if (time < 3.2) return { amount: 1 - smoothstep(0.6, 3.2, time), color: black };
  // Prologue to starfield.
  if (time >= 40.6 && time < 43.4) {
    const k = clamp((time - 40.6) / 2.8, 0, 1);
    return { amount: 1 - Math.abs(k - 0.5) * 2, color: black };
  }
  // Hull to interior: a bright flash through the window.
  if (time >= 209.1 && time < 211.4) {
    const k = clamp((time - 209.1) / 2.3, 0, 1);
    return { amount: Math.pow(1 - Math.abs(k - 0.42) / 0.58, 2), color: white };
  }
  // Interior to exterior at the launch.
  if (time >= 351.4 && time < 353.2) {
    const k = clamp((time - 351.4) / 1.8, 0, 1);
    return { amount: 1 - Math.abs(k - 0.5) * 2, color: black };
  }
  // Final fade.
  if (time > 401.4) return { amount: smoothstep(401.4, 404, time) * 0.92, color: black };
  return { amount: 0, color: black };
}
