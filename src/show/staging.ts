/**
 * The show.
 *
 * This is the script: every chapter, every shot, every cue. It is deliberately
 * one file, because a cinematic is a single continuous argument and splitting
 * it across modules makes the timing impossible to read.
 *
 * Three kinds of content are registered:
 *   · continuous animators — pure functions of show time
 *   · one-shot events      — audio and effect cues, fired at most once
 *   · camera shots         — named framings with their own clip range and fov
 */

import * as THREE from 'three';
import { clamp, lerp, smoothstep, smootherstep, progress, orientAlong, Ease } from '../core/math';
import { Rng } from '../core/rng';
import type { World } from './world';
import { CORRIDOR_MARKS, INTERIOR_ORIGIN, BAY_STATION } from './world';
import { BOARDING_X, PLATFORM_Y, PLATFORM_BACK_Z, PLATFORM_FRONT_Z } from '../interior/pod-bay';
import type { CameraDirector, Shot } from './camera-director';
import type { Timeline, ShowEvent } from './timeline';
import type { AudioEngine } from '../audio/engine';
import type { SfxLibrary, SustainedSource } from '../audio/sfx';
import type { MusicDirector } from '../audio/music';
import type { Narrator } from '../audio/narrator';
import type { Stage } from '../core/renderer';
import type { Prologue, EpilogueCard } from './prologue';
import type { CharState, Figure } from '../characters/figure';
import { PALETTE } from '../assets/materials';

/** Corridor station of the pod bay's centre. */
const BAY_Z = BAY_STATION;

/* ========================================================================== *
 *  Chapter plan
 * ========================================================================== */

export const CHAPTER_PLAN = [
  { id: 'prologue', title: 'Prologue', start: 0, end: 34, synopsis: 'A stolen design, and a ship running out of dark.' },
  { id: 'tatooine', title: 'The desert world', start: 34, end: 66, synopsis: 'Twin suns over an ocean of sand.' },
  { id: 'pursuit', title: 'The pursuit', start: 66, end: 150, synopsis: 'A corvette, and the thing that is faster.' },
  { id: 'capture', title: 'Capture', start: 150, end: 186, synopsis: 'Drawn in, held, and boarded.' },
  { id: 'corridor', title: 'The corridor', start: 186, end: 252, synopsis: 'Six defenders, one door, and what comes through it.' },
  { id: 'plans', title: 'The plans', start: 252, end: 288, synopsis: 'A courier the Empire will not think to search.' },
  { id: 'pod', title: 'The pod', start: 288, end: 322, synopsis: 'Two droids and one journey.' },
  { id: 'epilogue', title: 'Epilogue', start: 322, end: 344, synopsis: 'Everything that comes after begins here.' },
] as const;

export const SHOW_DURATION = CHAPTER_PLAN[CHAPTER_PLAN.length - 1].end;

/* ========================================================================== *
 *  Ship motion — pure functions of show time
 * ========================================================================== */

/** Forward speed of the corvette in metres per second at time `t`. */
function runnerSpeedAt(t: number): number {
  if (t < 78) return 150;
  if (t < 100) return lerp(150, 88, (t - 78) / 22);
  if (t < 130) return 88;
  if (t < 142) return lerp(88, 26, (t - 130) / 12);
  if (t < 156) return lerp(26, 4, (t - 142) / 14);
  if (t < 174) return lerp(4, 0, (t - 156) / 18);
  return 0;
}

/** Integrated travel, sampled once and interpolated thereafter. */
const TRAVEL_STEP = 0.25;
const TRAVEL_TABLE: number[] = (() => {
  const table: number[] = [0];
  let sum = 0;
  for (let i = 1; i * TRAVEL_STEP <= SHOW_DURATION + 4; i++) {
    const t = i * TRAVEL_STEP;
    sum += ((runnerSpeedAt(t - TRAVEL_STEP) + runnerSpeedAt(t)) / 2) * TRAVEL_STEP;
    table.push(sum);
  }
  return table;
})();

function runnerTravel(t: number): number {
  const x = clamp(t, 0, SHOW_DURATION + 3) / TRAVEL_STEP;
  const i = Math.min(TRAVEL_TABLE.length - 2, Math.floor(x));
  const f = x - i;
  return lerp(TRAVEL_TABLE[i], TRAVEL_TABLE[i + 1], f);
}

/** Where the corvette's centre of mass is, in world space. */
export function runnerPosition(t: number, out = new THREE.Vector3()): THREE.Vector3 {
  const z = 11200 - runnerTravel(t);
  // Lazy cruise weave, plus hard evasive jinking once the guns open up.
  const cruise = Math.sin(t * 0.14) * 24 + Math.sin(t * 0.33) * 8;
  const evade = smoothstep(104, 112, t) * (1 - smoothstep(140, 150, t));
  const jink = Math.sin(t * 0.95) * 46 + Math.sin(t * 1.7 + 1.2) * 18;
  const drift = smoothstep(150, 176, t) * 26;
  const x = cruise + jink * evade + drift;
  const y = Math.sin(t * 0.11) * 12 + Math.sin(t * 0.27 + 2) * 5 - smoothstep(150, 176, t) * 18;
  return out.set(x, y, z);
}

const _velA = new THREE.Vector3();
const _velB = new THREE.Vector3();

/** Finite-difference velocity, used to orient the hull along its flight path. */
export function runnerVelocity(t: number, out = new THREE.Vector3()): THREE.Vector3 {
  runnerPosition(t - 0.08, _velA);
  runnerPosition(t + 0.08, _velB);
  return out.subVectors(_velB, _velA).multiplyScalar(1 / 0.16);
}

/** Offset of the destroyer from the corvette. Positive Z is astern. */
const DESTROYER_KEYS: Array<[number, number, number, number]> = [
  [0, 0, 470, 9000],
  [70, 0, 450, 6600],
  [88, 0, 380, 3000],
  [96, 0, 300, 1400],
  [101, 0, 258, 620],
  // Between 101 and 116 the bow passes over the camera and 1.6 km of hull
  // streams overhead: this is the reveal.
  [110, 8, 232, -260],
  [118, 34, 226, -680],
  [128, 110, 236, -800],
  [140, 220, 248, -840],
  [152, 320, 258, -830],
  [166, 412, 236, -620],
  [178, 450, 208, -430],
  [196, 458, 202, -380],
  [SHOW_DURATION + 10, 460, 200, -372],
];

export function destroyerOffset(t: number, out = new THREE.Vector3()): THREE.Vector3 {
  let i = 0;
  while (i < DESTROYER_KEYS.length - 2 && DESTROYER_KEYS[i + 1][0] < t) i++;
  const a = DESTROYER_KEYS[i];
  const b = DESTROYER_KEYS[i + 1];
  const k = Ease.sine(progress(t, a[0], b[0]));
  return out.set(lerp(a[1], b[1], k), lerp(a[2], b[2], k), lerp(a[3], b[3], k));
}

export function destroyerPosition(t: number, out = new THREE.Vector3()): THREE.Vector3 {
  const r = runnerPosition(t, new THREE.Vector3());
  return out.copy(r).add(destroyerOffset(t, new THREE.Vector3()));
}

/** Direction from the ships toward the planet, used for the pod's descent. */
export const PLANET_DIRECTION = new THREE.Vector3(-2200, -5400, -1800).normalize();

/** Compass bearing of the planet, used to build sky-relative framings. */
const PLANET_AZIMUTH = new THREE.Vector2(PLANET_DIRECTION.x, PLANET_DIRECTION.z).normalize();

/**
 * A unit direction at `elevationDeg` above the horizon, on the planet's
 * bearing rotated by `bearingOffsetDeg`. Chapter two is framed entirely with
 * this, so moving the planet never breaks the shots.
 */
function skyDirection(elevationDeg: number, bearingOffsetDeg = 0, out = new THREE.Vector3()): THREE.Vector3 {
  const b = (bearingOffsetDeg * Math.PI) / 180;
  const cosB = Math.cos(b);
  const sinB = Math.sin(b);
  const ax = PLANET_AZIMUTH.x * cosB - PLANET_AZIMUTH.y * sinB;
  const az = PLANET_AZIMUTH.x * sinB + PLANET_AZIMUTH.y * cosB;
  const e = (elevationDeg * Math.PI) / 180;
  return out.set(ax * Math.cos(e), Math.sin(e), az * Math.cos(e)).normalize();
}

/** Escape-pod trajectory after launch. */
export function podPosition(t: number, out = new THREE.Vector3()): THREE.Vector3 {
  const launch = 308.5;
  const r = runnerPosition(Math.min(t, 320), new THREE.Vector3());
  // Bay is on the corvette's port flank.
  const bay = new THREE.Vector3(-10.4, -0.6, 13.6);
  if (t <= launch) return out.copy(r).add(bay);
  const dt = t - launch;
  // A short lateral kick out of the tube, then a long accelerating fall.
  const lateral = new THREE.Vector3(-1, 0, 0).multiplyScalar(Math.min(dt, 2.2) * 26);
  const fall = PLANET_DIRECTION.clone().multiplyScalar(Math.pow(Math.max(0, dt - 0.6), 2) * 12);
  return out.copy(r).add(bay).add(lateral).add(fall);
}

/* ========================================================================== *
 *  Character tracks
 * ========================================================================== */

interface TrackKey {
  t: number;
  /** Lateral offset across the corridor; 0 is the centreline. */
  x: number;
  /** Distance along the corridor. */
  z: number;
  /** Deck height; only the pod bay's boarding platform is above zero. */
  y?: number;
  state?: CharState;
  /** Absolute facing in radians; omit to face the direction of travel. */
  facing?: number;
  ease?: (t: number) => number;
}

interface TrackSample {
  x: number;
  z: number;
  y: number;
  state: CharState;
  facing?: number;
  /**
   * Metres walked along the path so far. Segments are straight lines, so the
   * arc length is exact regardless of the easing used to traverse them — which
   * makes the gait a pure function of show time and therefore scrub-safe.
   */
  distance: number;
}

function sampleTrack(keys: TrackKey[], t: number, out: TrackSample): TrackSample {
  if (t <= keys[0].t) {
    out.x = keys[0].x;
    out.z = keys[0].z;
    out.y = keys[0].y ?? 0;
    out.state = keys[0].state ?? 'idle';
    out.facing = keys[0].facing;
    out.distance = 0;
    return out;
  }
  let travelled = 0;
  const last = keys[keys.length - 1];
  if (t >= last.t) {
    for (let i = 1; i < keys.length; i++) {
      travelled += Math.hypot(keys[i].x - keys[i - 1].x, keys[i].z - keys[i - 1].z);
    }
    out.x = last.x;
    out.z = last.z;
    out.y = last.y ?? 0;
    out.state = last.state ?? 'idle';
    out.facing = last.facing;
    out.distance = travelled;
    return out;
  }
  let i = 0;
  while (i < keys.length - 2 && keys[i + 1].t <= t) i++;
  for (let n = 1; n <= i; n++) {
    travelled += Math.hypot(keys[n].x - keys[n - 1].x, keys[n].z - keys[n - 1].z);
  }
  const a = keys[i];
  const b = keys[i + 1];
  const ease = b.ease ?? Ease.sine;
  const k = ease(progress(t, a.t, b.t));
  out.x = lerp(a.x, b.x, k);
  out.z = lerp(a.z, b.z, k);
  out.y = lerp(a.y ?? 0, b.y ?? 0, k);
  out.state = a.state ?? 'idle';
  out.facing = a.facing !== undefined && b.facing !== undefined ? lerp(a.facing, b.facing, k) : a.facing;
  out.distance = travelled + Math.hypot(b.x - a.x, b.z - a.z) * k;
  return out;
}

const _sample: TrackSample = { x: 0, z: 0, y: 0, state: 'idle', facing: undefined, distance: 0 };
const _sampleAhead: TrackSample = { x: 0, z: 0, y: 0, state: 'idle', facing: undefined, distance: 0 };
const _sampleBehind: TrackSample = { x: 0, z: 0, y: 0, state: 'idle', facing: undefined, distance: 0 };

/** Drive a figure from a keyed corridor track. */
function driveFigure(fig: Figure, keys: TrackKey[], t: number, dt: number): void {
  const s = sampleTrack(keys, t, _sample);
  // Central difference for the ground speed, so a paused frame still knows
  // whether this figure is walking and how fast.
  const h = 0.08;
  const speed =
    (sampleTrack(keys, t + h, _sampleAhead).distance - sampleTrack(keys, t - h, _sampleBehind).distance) / (2 * h);
  fig.setState(s.state);
  // Figures are children of the interior group, so tracks are authored — and
  // applied — in corridor-local coordinates.
  fig.track(s.x, s.z, dt, s.facing === undefined, s.facing, s.distance, Math.max(0, speed), s.y);
}

/* ========================================================================== *
 *  Build
 * ========================================================================== */

export interface StagingDeps {
  world: World;
  director: CameraDirector;
  timeline: Timeline;
  audio: AudioEngine;
  sfx: SfxLibrary;
  music: MusicDirector;
  narrator: Narrator;
  stage: Stage;
  prologue: Prologue;
  epilogue: EpilogueCard;
}

export interface ShowRuntime {
  /** Called on every seek so sustained audio and effects do not survive it. */
  resetAudio(): void;
  dispose(): void;
}

export function buildShow(deps: StagingDeps): ShowRuntime {
  const { world, director, timeline, sfx, music, narrator, stage, prologue, epilogue } = deps;
  const rng = new Rng('staging');
  const _shieldOut = new THREE.Vector3();

  for (const c of CHAPTER_PLAN) timeline.addChapter({ ...c });

  /* ---------------------------------------------------------- sustained */
  let runnerEngine: SustainedSource | null = null;
  let destroyerEngine: SustainedSource | null = null;
  let alarmLoop: SustainedSource | null = null;
  let torchLoop: SustainedSource | null = null;
  let tractorLoop: SustainedSource | null = null;
  let respiratorLoop: SustainedSource | null = null;
  let entryLoop: SustainedSource | null = null;
  let droidRoll: SustainedSource | null = null;

  const stopAll = () => {
    for (const s of [runnerEngine, destroyerEngine, alarmLoop, torchLoop, tractorLoop, respiratorLoop, entryLoop, droidRoll]) {
      s?.stop(0.2);
    }
    runnerEngine = destroyerEngine = alarmLoop = torchLoop = tractorLoop = respiratorLoop = entryLoop = droidRoll = null;
    sfx.stopAllSustained(0.2);
  };

  /* ============================ CONTINUOUS ============================== */

  const _rPos = new THREE.Vector3();
  const _rVel = new THREE.Vector3();
  const _dPos = new THREE.Vector3();
  const _pPos = new THREE.Vector3();
  const _tmp = new THREE.Vector3();

  // --- region, fades, global mood -----------------------------------------
  timeline.addContinuous((t) => {
    const interior = t >= 185.6 && t < 309.6;
    world.setRegion(interior ? 'interior' : 'exterior');
    stage.skyVisible = !interior;

    // Chapter transitions are short dips to black; the interior cut at 186 is
    // a hard match cut through white.
    let fade = 0;
    let colour = 0x000000;
    fade = Math.max(fade, 1 - smootherstep(0, 2.6, t)); // opening fade-in
    fade = Math.max(fade, smootherstep(64.2, 65.6, t) * (1 - smootherstep(66.0, 67.4, t)));
    const cut = smootherstep(183.6, 185.5, t) * (1 - smootherstep(185.7, 187.6, t));
    if (cut > 0.01) colour = 0xdfe6f2;
    fade = Math.max(fade, cut);
    const podCut = smootherstep(308.4, 309.5, t) * (1 - smootherstep(309.7, 311.2, t));
    fade = Math.max(fade, podCut);
    fade = Math.max(fade, smootherstep(SHOW_DURATION - 2.4, SHOW_DURATION, t) * 0.94);
    stage.fade = fade;
    stage.fadeColor.setHex(colour);

    // Starfield reads brighter in the void and dimmer beside a lit planet.
    const starBrightness = t < 30 ? lerp(0.25, 1.0, smootherstep(2, 26, t)) : t < 40 ? 1 : 0.78;
    world.starfield.setBrightness(starBrightness);
  });

  // --- exterior ships ------------------------------------------------------
  timeline.addContinuous((t, dt) => {
    if (world.currentRegion !== 'exterior') return;

    runnerPosition(t, _rPos);
    runnerVelocity(t, _rVel);
    world.runner.group.position.copy(_rPos);
    if (_rVel.length() > 2) {
      // Bank into the turn: roll proportional to lateral acceleration.
      const ax = runnerPosition(t + 0.2, _tmp).x - 2 * _rPos.x + runnerPosition(t - 0.2, new THREE.Vector3()).x;
      orientAlong(world.runner.group, _rVel, clamp(-ax * 2.2, -0.55, 0.55));
    } else {
      // Powerless: hold heading, with a slow dying tumble.
      const drift = smoothstep(146, 184, t);
      world.runner.group.quaternion.identity();
      world.runner.group.rotateY(drift * 0.16);
      world.runner.group.rotateX(drift * 0.07);
      world.runner.group.rotateZ(-drift * 0.13);
    }

    const throttle = t < 130 ? 1 : t < 143 ? lerp(1, 0.35, progress(t, 130, 143)) : 0;
    world.runner.setThrottle(throttle);
    world.runner.setDamage(smoothstep(126, 145, t));

    destroyerPosition(t, _dPos);
    world.destroyer.group.position.copy(_dPos);
    // The destroyer flies −Z like the corvette. A ship this size does not
    // visibly manoeuvre, so its attitude is fixed.
    world.destroyer.group.quaternion.identity();
    world.destroyer.setThrottle(t < 168 ? 1 : lerp(1, 0.28, progress(t, 168, 182)));

    // Tractor beam.
    const beam = smoothstep(151, 156, t) * (1 - smoothstep(178, 183, t));
    world.destroyer.setTractorBeam(beam > 0.01 ? _rPos : null, beam);

    // Lighting mood: full sun during the chase, a dip as 1.6 km of hull slides
    // between the corvette and the star, then permanent shadow once captured.
    const eclipse = smoothstep(103, 110, t) * (1 - smoothstep(124, 134, t)) * 0.75;
    const shadowed = Math.max(eclipse, smoothstep(158, 178, t));
    world.setExteriorMood(1 - shadowed * 0.55, 1 - shadowed * 0.35);

    // Escape pod.
    const podVisible = t >= 308.5;
    if (podVisible) {
      if (world.pod.group.parent !== world.exterior) world.exterior.add(world.pod.group);
      world.pod.group.visible = true;
      podPosition(t, _pPos);
      world.pod.group.position.copy(_pPos);
      const vel = podPosition(t + 0.1, new THREE.Vector3()).sub(podPosition(t - 0.1, new THREE.Vector3()));
      if (vel.lengthSq() > 1e-8) orientAlong(world.pod.group, vel, Math.sin(t * 1.3) * 0.12);
      world.pod.setClampsAttached(t < 309.4);
      world.pod.setBurn(smoothstep(309.2, 310.4, t) * (1 - smoothstep(318, 322, t) * 0.55));
      world.pod.setReentry(smoothstep(314, 326, t));
      // Grow the pod as it recedes so it stays a readable point of light.
      const far = smoothstep(313, 336, t);
      world.pod.group.scale.setScalar(1 + far * 26);
      world.pod.update(dt, t);
    } else if (world.pod.group.parent === world.exterior) {
      world.pod.group.visible = false;
    }
  });

  // --- interior staging ----------------------------------------------------
  // Rebel firing positions: alternating sides, staggered depth.
  const rebelTracks: TrackKey[][] = world.rebels.map((_, i) => {
    const side = i % 2 === 0 ? -1 : 1;
    const lane = side * (0.95 + (i % 3) * 0.14);
    // Tight stagger. The two firing lines have to fit in one frame, and a
    // 3.4 m corridor gives the camera nowhere to stand except on the axis.
    const post = CORRIDOR_MARKS.rebelLine + Math.floor(i / 2) * 2.2;
    const fallback = CORRIDOR_MARKS.rebelFallback + Math.floor(i / 2) * 1.4;
    const downAt = 216 + i * 2.6;
    return [
      { t: 0, x: lane * 0.4, z: post + 8, state: 'idle', facing: 0 },
      { t: 186, x: lane * 0.4, z: post + 8, state: 'run', facing: 0 },
      { t: 189.5 + i * 0.25, x: lane, z: post, state: 'crouch', facing: 0 },
      { t: 196, x: lane, z: post, state: 'aim', facing: 0 },
      { t: 208, x: lane, z: post, state: 'aim', facing: 0 },
      // Half fall back, half hold. Nobody just stands still.
      ...(i % 2 === 0
        ? ([
            { t: downAt, x: lane, z: post, state: 'react', facing: 0 },
            { t: downAt + 0.9, x: lane * 1.15, z: post + 0.4, state: 'fall', facing: 0 },
            { t: downAt + 2.4, x: lane * 1.15, z: post + 0.4, state: 'down', facing: 0 },
            { t: 400, x: lane * 1.15, z: post + 0.4, state: 'down', facing: 0 },
          ] as TrackKey[])
        : ([
            { t: 214 + i, x: lane, z: post, state: 'walk', facing: 0 },
            { t: 219 + i, x: lane * 1.1, z: fallback, state: 'crouch', facing: 0 },
            { t: 224 + i, x: lane * 1.1, z: fallback, state: 'aim', facing: 0 },
            { t: 228 + i * 0.7, x: lane * 1.1, z: fallback, state: 'react', facing: 0 },
            { t: 229.5 + i * 0.7, x: lane * 1.2, z: fallback + 0.5, state: 'fall', facing: 0 },
            { t: 231.5 + i * 0.7, x: lane * 1.2, z: fallback + 0.5, state: 'down', facing: 0 },
            { t: 400, x: lane * 1.2, z: fallback + 0.5, state: 'down', facing: 0 },
          ] as TrackKey[])),
    ];
  });

  const trooperTracks: TrackKey[][] = world.troopers.map((_, i) => {
    const side = i % 2 === 0 ? -1 : 1;
    const lane = side * (0.72 + (i % 3) * 0.1);
    // The lead pair pushes furthest; the rest stack up behind them toward the
    // breach. Advancing *past* the rebel line would put the two sides inside
    // one another.
    const stop = CORRIDOR_MARKS.troopAdvance - Math.floor(i / 2) * 1.3;
    // Once the shooting stops they clear right back toward the breach and
    // stand hard against the walls. Vader then walks past them rather than
    // through them, which is what lets the entrance shot put him alone in the
    // middle of the frame with the escort small and behind.
    const hold = CORRIDOR_MARKS.breachDoor + 0.6 + (i % 2) * 0.9 + Math.floor(i / 2) * 1.1;
    const enter = 207.4 + i * 0.55;
    return [
      { t: 0, x: lane, z: CORRIDOR_MARKS.breachDoor - 5, state: 'idle', facing: Math.PI },
      { t: enter, x: lane, z: CORRIDOR_MARKS.breachDoor - 1.2, state: 'run', facing: Math.PI },
      { t: enter + 2.6, x: lane, z: stop - 2.4, state: 'aim', facing: Math.PI },
      { t: enter + 6.5, x: lane, z: stop, state: 'aim', facing: Math.PI },
      { t: 234, x: lane, z: stop, state: 'aim', facing: Math.PI },
      { t: 238.5, x: side * 1.42, z: hold, state: 'alert', facing: Math.PI },
      { t: 252, x: side * 1.42, z: hold, state: 'alert', facing: Math.PI },
      { t: 262, x: lane * 1.35, z: stop + 8 + i, state: 'walk', facing: Math.PI },
      { t: 284, x: lane * 1.4, z: CORRIDOR_MARKS.midCorridor + 4 + i * 1.4, state: 'walk', facing: Math.PI },
      { t: 300, x: lane * 1.4, z: CORRIDOR_MARKS.leiaStart - 6 + i * 1.2, state: 'walk', facing: Math.PI },
      { t: 400, x: lane * 1.4, z: CORRIDOR_MARKS.leiaStart - 4 + i * 1.2, state: 'aim', facing: Math.PI },
    ];
  });

  const officerTrack: TrackKey[] = [
    { t: 0, x: 1.0, z: CORRIDOR_MARKS.breachDoor - 6, state: 'idle', facing: Math.PI },
    { t: 214, x: 1.0, z: CORRIDOR_MARKS.breachDoor - 0.5, state: 'walk', facing: Math.PI },
    { t: 222, x: 1.05, z: CORRIDOR_MARKS.breachDoor + 2.6, state: 'alert', facing: Math.PI },
    // Steps aside and falls in behind Vader rather than sharing the frame with
    // him: two figures at the same depth read as a crowd, not as an escort.
    { t: 240, x: 1.22, z: CORRIDOR_MARKS.breachDoor + 1.2, state: 'alert', facing: Math.PI },
    { t: 252, x: 1.22, z: CORRIDOR_MARKS.breachDoor + 1.2, state: 'alert', facing: Math.PI },
    { t: 268, x: 1.15, z: CORRIDOR_MARKS.midCorridor, state: 'walk', facing: Math.PI },
    { t: 400, x: 1.15, z: CORRIDOR_MARKS.midCorridor + 3, state: 'alert', facing: Math.PI },
  ];

  const vaderTrack: TrackKey[] = [
    { t: 0, x: 0, z: CORRIDOR_MARKS.breachDoor - 4.5, state: 'idle', facing: Math.PI },
    { t: 239, x: 0, z: CORRIDOR_MARKS.breachDoor - 2.4, state: 'march', facing: Math.PI },
    { t: 242.5, x: 0, z: CORRIDOR_MARKS.breachDoor + 1.4, state: 'march', facing: Math.PI, ease: Ease.linear },
    { t: 252, x: 0, z: CORRIDOR_MARKS.troopAdvance + 1.2, state: 'march', facing: Math.PI, ease: Ease.linear },
    { t: 258, x: 0, z: CORRIDOR_MARKS.troopAdvance + 3.0, state: 'alert', facing: Math.PI },
    { t: 274, x: 0, z: CORRIDOR_MARKS.troopAdvance + 3.0, state: 'alert', facing: Math.PI },
    { t: 292, x: 0, z: CORRIDOR_MARKS.midCorridor + 2, state: 'march', facing: Math.PI, ease: Ease.linear },
    { t: 310, x: 0, z: CORRIDOR_MARKS.midCorridor + 11, state: 'march', facing: Math.PI, ease: Ease.linear },
    { t: 400, x: 0, z: CORRIDOR_MARKS.midCorridor + 13, state: 'alert', facing: Math.PI },
  ];

  const leiaTrack: TrackKey[] = [
    { t: 0, x: -0.62, z: CORRIDOR_MARKS.leiaStart, state: 'idle', facing: Math.PI },
    { t: 252, x: -0.62, z: CORRIDOR_MARKS.leiaStart, state: 'walk', facing: undefined },
    { t: 257.5, x: -0.62, z: CORRIDOR_MARKS.transfer - 1.5, state: 'interact', facing: Math.PI },
    { t: 282, x: -0.62, z: CORRIDOR_MARKS.transfer - 1.5, state: 'kneel', facing: Math.PI },
    { t: 286, x: -0.62, z: CORRIDOR_MARKS.transfer - 1.5, state: 'alert', facing: Math.PI },
    { t: 289, x: -0.62, z: CORRIDOR_MARKS.transfer - 1.5, state: 'walk', facing: undefined },
    { t: 295, x: 0.7, z: CORRIDOR_MARKS.transfer - 7.5, state: 'alert', facing: 0 },
    { t: 400, x: 0.7, z: CORRIDOR_MARKS.transfer - 7.5, state: 'alert', facing: 0 },
  ];

  // Bay stations, in corridor coordinates. The whole boarding sequence is one
  // straight line: down the corridor, into the bay, up the ramp, into the pod.
  const RAMP_FOOT_Z = BAY_Z + PLATFORM_BACK_Z - 2.3;
  const PLATFORM_EDGE_Z = BAY_Z + PLATFORM_BACK_Z;
  const BOARD_Z = BAY_Z + PLATFORM_FRONT_Z - 0.6;

  const r2Track: TrackKey[] = [
    { t: 0, x: 0.55, z: CORRIDOR_MARKS.transfer, state: 'idle', facing: 0 },
    { t: 286, x: 0.55, z: CORRIDOR_MARKS.transfer, state: 'idle', facing: 0 },
    { t: 288.5, x: 0.55, z: CORRIDOR_MARKS.transfer, state: 'walk', facing: Math.PI },
    { t: 296, x: 0.1, z: CORRIDOR_MARKS.bayDoor - 1.5, state: 'walk', facing: Math.PI },
    { t: 300.2, x: BOARDING_X, z: RAMP_FOOT_Z, state: 'walk', facing: Math.PI },
    { t: 302.2, x: BOARDING_X, z: PLATFORM_EDGE_Z, y: PLATFORM_Y, state: 'walk', facing: Math.PI },
    { t: 304, x: BOARDING_X, z: BOARD_Z, y: PLATFORM_Y, state: 'walk', facing: Math.PI },
    { t: 400, x: BOARDING_X, z: BOARD_Z, y: PLATFORM_Y, state: 'idle', facing: Math.PI },
  ];

  const c3poTrack: TrackKey[] = [
    { t: 0, x: -1.35, z: CORRIDOR_MARKS.transfer - 3.0, state: 'idle', facing: 0.5 },
    { t: 288, x: -1.35, z: CORRIDOR_MARKS.transfer - 3.0, state: 'cower', facing: 0.5 },
    { t: 290.5, x: -1.3, z: CORRIDOR_MARKS.transfer - 2.4, state: 'walk', facing: Math.PI },
    { t: 299.4, x: 0.35, z: CORRIDOR_MARKS.bayDoor - 2.2, state: 'walk', facing: Math.PI },
    { t: 302.4, x: BOARDING_X + 0.95, z: RAMP_FOOT_Z - 0.5, state: 'cower', facing: Math.PI - 0.5 },
    { t: 304.7, x: BOARDING_X + 0.95, z: RAMP_FOOT_Z - 0.5, state: 'walk', facing: Math.PI },
    { t: 305.9, x: BOARDING_X + 0.3, z: PLATFORM_EDGE_Z, y: PLATFORM_Y, state: 'walk', facing: Math.PI },
    { t: 306.7, x: BOARDING_X, z: BOARD_Z, y: PLATFORM_Y, state: 'walk', facing: Math.PI },
    { t: 400, x: BOARDING_X, z: BOARD_Z, y: PLATFORM_Y, state: 'idle', facing: Math.PI },
  ];

  timeline.addContinuous((t, dt) => {
    if (world.currentRegion !== 'interior') return;

    // Visibility gates.
    const troopersIn = t >= 206.9;
    for (let i = 0; i < world.troopers.length; i++) {
      world.troopers[i].group.visible = troopersIn;
      if (troopersIn) driveFigure(world.troopers[i], trooperTracks[i], t, dt);
    }
    world.officer.group.visible = t >= 213.5;
    if (world.officer.group.visible) driveFigure(world.officer, officerTrack, t, dt);

    world.vader.group.visible = t >= 238.6;
    if (world.vader.group.visible) {
      driveFigure(world.vader, vaderTrack, t, dt);
      world.setVaderKeyPosition(world.vader.group.position.z);
    }

    for (let i = 0; i < world.rebels.length; i++) {
      driveFigure(world.rebels[i], rebelTracks[i], t, dt);
    }

    world.leia.group.visible = t < 296.5;
    if (world.leia.group.visible) driveFigure(world.leia, leiaTrack, t, dt);

    // Droids disappear as they board; the pod porthole takes over.
    world.r2.group.visible = t < 304.2;
    if (world.r2.group.visible) {
      driveFigure(world.r2, r2Track, t, dt);
      world.r2.setTripod(t > 288 && t < 304 ? 0.15 : 1);
      world.r2.agitation = smoothstep(276, 292, t) * 0.8;
    }
    world.c3po.group.visible = t < 306.9;
    if (world.c3po.group.visible) {
      driveFigure(world.c3po, c3poTrack, t, dt);
      world.c3po.anxiety = 0.45 + smoothstep(286, 300, t) * 0.5;
    }

    // Look targets keep eyelines correct without any extra authoring.
    const doorPoint = world.corridorPoint(CORRIDOR_MARKS.breachDoor, 0, 1.5);
    for (const r of world.rebels) r.lookTarget = t < 236 ? doorPoint : null;
    for (const r of world.rebels) r.aimTarget = t >= 196 && t < 232 ? doorPoint : null;
    const rebelPoint = world.corridorPoint(CORRIDOR_MARKS.rebelLine + 3, 0, 1.4);
    for (const tr of world.troopers) {
      tr.aimTarget = t >= 209 && t < 233 ? rebelPoint : null;
      tr.lookTarget = t >= 238 && t < 260 ? world.vader.chestWorld(new THREE.Vector3()) : null;
    }
    world.leia.lookTarget =
      t >= 258 && t < 284 ? world.r2.headWorld(new THREE.Vector3()) : t >= 284 ? doorPoint : null;
    world.c3po.lookTarget = t >= 288 && t < 304.4 ? world.r2.headWorld(new THREE.Vector3()) : doorPoint;
    world.r2.setDomeTarget(
      t >= 258 && t < 285 ? world.leia.headWorld(new THREE.Vector3()) : t > 296 ? world.podBay.hatchCentre.getWorldPosition(new THREE.Vector3()) : null,
    );

    // Door: torch cut, then blown inward.
    world.blastDoor.setCutting(smoothstep(194, 206.4, t));
    world.blastDoor.blowIn(smootherstep(206.5, 208.6, t));

    // Interior mood: alarm from the moment the hull is boarded; Vader's
    // arrival pulls the corridor toward red and darkens the fill.
    world.corridor.setAlarm(t < 236 ? smoothstep(186, 188, t) : lerp(1, 0.25, progress(t, 236, 244)));
    world.podBay.setAlarm(t > 296 ? 1 : 0);
    const vaderPresence = smoothstep(238, 246, t) * (1 - smoothstep(288, 300, t) * 0.6);
    world.setInteriorMood(1 - vaderPresence * 0.46, vaderPresence);

    // The plans: revealed, studied, then poured into the droid.
    const reveal = smootherstep(259, 266, t) * (1 - smootherstep(277, 282.5, t));
    world.plans.setReveal(reveal);
    world.plans.setScale(0.56 * (1 - smootherstep(277, 282.5, t) * 0.78));
    world.plans.group.position.y = 1.34 - smootherstep(277, 282.5, t) * 0.5;

    // Pod bay hatch, and the pod riding its rail out through it.
    world.podBay.setHatch(smootherstep(304.8, 307.4, t));
    const podInBay = t < 309.5;
    if (podInBay) {
      if (world.pod.group.parent !== world.podBay.podSeat) {
        world.podBay.podSeat.add(world.pod.group);
        world.pod.group.position.set(0, 0, 0);
        world.pod.group.rotation.set(0, 0, 0);
        world.pod.group.scale.setScalar(1);
      }
      world.pod.group.visible = true;
      const run = smootherstep(307.8, 309.5, t);
      world.pod.setClampsAttached(run < 0.02);
      world.pod.setBurn(0);
      world.pod.setReentry(0);
      world.pod.group.position.z = -run * 6.2;
      // Boarding door: open from the moment the droids reach the bay, sealed
      // again the instant the protocol droid is inside.
      world.pod.setHatch(smootherstep(298, 300.5, t) * (1 - smootherstep(306.9, 307.7, t)));
    } else {
      world.pod.setHatch(0);
    }
  });

  // --- camera shake from proximity ----------------------------------------
  timeline.addContinuous((t) => {
    // Continuous low rumble shake while the corvette is under fire.
    const underFire = smoothstep(116, 120, t) * (1 - smoothstep(144, 150, t));
    director.shakeScale = 1 + underFire * 0.4;
  });

  /* ============================== EVENTS ================================ */

  const events: ShowEvent[] = [];
  const ev = (t: number, id: string, run: () => void) => events.push({ t, id, run });

  /* ---- narration ---- */
  for (const line of narrator.lines) {
    ev(line.t, `narr-${line.id}`, () => narrator.speak(line.id));
  }

  /* ---- music ---- */
  const musicCues: Array<[number, Parameters<MusicDirector['setCue']>[0], number]> = [
    [0.5, 'prologue', 3],
    [34, 'planet', 5],
    [66, 'chase', 3],
    [97, 'destroyer', 2.2],
    [120, 'battle', 2.5],
    [146, 'capture', 4],
    [186, 'corridor', 2],
    [206, 'breach', 0.6],
    [210, 'battle', 1.2],
    [236, 'corridor', 3],
    [239, 'vader', 1.6],
    [252, 'leia', 3],
    [274, 'transfer', 2.5],
    [288, 'escape', 2],
    [312, 'descent', 2.5],
    [322, 'epilogue', 3],
  ];
  for (const [t, cue, fade] of musicCues) ev(t, `music-${cue}-${t}`, () => music.setCue(cue, fade));
  ev(SHOW_DURATION - 2, 'music-out', () => music.stop(2));

  /* ---- exterior sound ---- */
  ev(65, 'runner-engine-on', () => {
    runnerEngine?.stop(0.2);
    runnerEngine = sfx.engine('corvette');
    runnerEngine.setLevel(0.9, 0.6);
  });
  ev(88, 'destroyer-engine-on', () => {
    destroyerEngine?.stop(0.2);
    destroyerEngine = sfx.engine('capital');
    destroyerEngine.setLevel(0.15, 2);
  });
  ev(99, 'destroyer-swell', () => {
    destroyerEngine?.setLevel(0.95, 5);
    sfx.transition({ gain: 0.9 }, true);
  });
  ev(143, 'runner-engine-die', () => runnerEngine?.setLevel(0.05, 2.5));
  ev(151.5, 'tractor-on', () => {
    tractorLoop?.stop(0.2);
    tractorLoop = sfx.tractorBeam();
    tractorLoop.setLevel(0.5, 2);
  });
  ev(180, 'tractor-off', () => tractorLoop?.setLevel(0.12, 3));
  ev(185, 'exterior-audio-out', () => {
    runnerEngine?.stop(1.2);
    destroyerEngine?.stop(1.2);
    tractorLoop?.stop(1.2);
    runnerEngine = destroyerEngine = tractorLoop = null;
  });

  /* ---- turbolaser exchange ---- */
  // Deterministic, seeded schedule so a replay is identical.
  {
    const fireRng = new Rng('turbolaser');
    for (let t = 116.5; t < 143; t += 0.28 + fireRng.next() * 0.34) {
      const shotTime = t;
      const hits = shotTime > 126 ? fireRng.chance(0.55) : fireRng.chance(0.22);
      ev(shotTime, `tl-${shotTime.toFixed(2)}`, () => {
        const turrets = world.destroyer.turrets;
        const turret = turrets[Math.floor(fireRng.next() * turrets.length)];
        const target = runnerPosition(timeline.time + 0.9, new THREE.Vector3());
        turret.aimAt(target);
        turret.flash();
        const from = turret.muzzleWorld(new THREE.Vector3());
        const aimPoint = hits
          ? target.clone()
          : target.clone().add(new THREE.Vector3(fireRng.range(-190, 190), fireRng.range(-120, 120), fireRng.range(-160, 160)));
        const dir = aimPoint.clone().sub(from).normalize();
        world.exteriorBolts.fire({
          origin: from,
          direction: dir,
          speed: 950,
          color: PALETTE.laserRed,
          length: 130,
          radius: 3.6,
          life: 3.2,
          hitAt: aimPoint,
          onEnd: (pos, wasHit) => {
            if (!wasHit) return;
            const runnerPos = world.runner.group.position;
            const near = pos.distanceTo(runnerPos) < 150;
            if (near) {
              const shielded = timeline.time < 130;
              if (shielded) {
                world.shields.flash(runnerPos, 96, pos, 1);
                sfx.shieldHit({ at: pos, ref: 90 }, 1);
              } else {
                world.exteriorSparks.burst(pos, Math.round(34 * world.quality.particleScale), {
                  speed: 34, spread: Math.PI * 0.7, color: '#ffd08a', size: 1.1, life: 1.1,
                });
                world.exteriorDebris.burst(pos, Math.round(6 * world.quality.particleScale), {
                  speed: 22, size: 2.4, life: 2.6,
                });
                sfx.impact({ at: pos, ref: 90 }, 0.85);
              }
              director.impulseNear(pos, shielded ? 0.3 : 0.62, 320);
            }
          },
        });
        sfx.turbolaser({ at: from, ref: 260, gain: 0.85 });
      });
    }
    // The corvette returns fire early on — futile, but it is trying.
    for (let t = 118; t < 133; t += 0.6 + fireRng.next() * 0.8) {
      const shotTime = t;
      ev(shotTime, `rl-${shotTime.toFixed(2)}`, () => {
        const turret = world.runner.turrets[Math.floor(fireRng.next() * world.runner.turrets.length)];
        const target = destroyerPosition(timeline.time, new THREE.Vector3()).add(
          new THREE.Vector3(fireRng.range(-160, 160), fireRng.range(-60, 60), fireRng.range(-300, 300)),
        );
        turret.aimAt(target);
        turret.flash();
        const from = turret.muzzleWorld(new THREE.Vector3());
        const dir = target.clone().sub(from).normalize();
        world.exteriorBolts.fire({
          origin: from, direction: dir, speed: 1500, color: PALETTE.laserBlue,
          length: 46, radius: 1.6, life: 2.2, hitAt: target,
          onEnd: (pos) => {
            world.shields.flash(pos, 150, pos.clone().add(_shieldOut.subVectors(pos, world.destroyer.group.position).setLength(150)), 0.55, '#9ec8ff');
            sfx.shieldHit({ at: pos, ref: 260 }, 0.5);
          },
        });
        sfx.blaster({ at: from, ref: 120, gain: 0.7 }, 0.7);
      });
    }
  }

  /* ---- capture beats ---- */
  ev(158, 'capture-clank-1', () => sfx.clamp({ at: world.runner.group.position.clone(), ref: 100 }, 1.6));
  ev(172, 'capture-clank-2', () => {
    sfx.clamp({ at: world.runner.group.position.clone(), ref: 100 }, 2);
    director.impulse(0.35);
  });
  ev(180.5, 'boarding-clank', () => {
    sfx.clamp({ at: world.runner.group.position.clone(), ref: 100 }, 1.3);
    director.impulse(0.28);
  });

  /* ---- interior beats ---- */
  ev(186, 'alarm-on', () => {
    alarmLoop?.stop(0.2);
    alarmLoop = sfx.alarm({ at: world.corridorPoint(CORRIDOR_MARKS.midCorridor, 0, 2.6), ref: 16 });
    alarmLoop.setLevel(0.3, 1.5);
  });
  ev(194, 'torch-on', () => {
    torchLoop?.stop(0.2);
    torchLoop = sfx.cuttingTorch({ at: world.corridorPoint(CORRIDOR_MARKS.breachDoor, 0, 1.5), ref: 7 });
    torchLoop.setLevel(0.55, 1.2);
  });
  // Sparks from the cutting torch.
  for (let t = 195; t < 206.3; t += 0.42) {
    const st = t;
    ev(st, `torch-spark-${st.toFixed(2)}`, () => {
      const p = world.corridorPoint(
        CORRIDOR_MARKS.breachDoor + 0.14,
        rng.range(-0.1, 0.1),
        2.7 - progress(st, 195, 206) * 2.2,
      );
      world.interiorSparks.burst(p, Math.round(22 * world.quality.particleScale), {
        speed: 5.2, spread: Math.PI * 0.55, normal: new THREE.Vector3(0, -0.3, 1),
        color: '#ffb45c', size: 0.8, life: 1.1,
      });
      world.smoke.emit(p, 1, { speed: 0.5, size: 0.5, life: 3.4, opacity: 0.2 });
      sfx.sparks({ at: p, ref: 6 }, 0.6);
    });
  }
  ev(206.5, 'door-breach', () => {
    const p = world.corridorPoint(CORRIDOR_MARKS.breachDoor, 0, 1.4);
    sfx.doorBreach({ at: p, ref: 9 });
    world.interiorDebris.burst(p, Math.round(34 * world.quality.particleScale), {
      speed: 9, size: 0.32, life: 6, direction: new THREE.Vector3(0, 0.25, 1), spread: 0.65,
    });
    world.interiorSparks.burst(p, Math.round(120 * world.quality.particleScale), {
      speed: 12, spread: Math.PI, color: '#ffb45c', size: 0.9, life: 1.3,
    });
    // Enough to fill the doorway, not the ship. Long-lived puffs this large
    // turn the whole corridor into flat grey fog within a couple of seconds.
    world.smoke.emit(p, Math.round(26 * world.quality.particleScale), {
      speed: 3.4, size: 1.45, life: 6.5, opacity: 0.72, direction: new THREE.Vector3(0, 0.3, 1), spread: 0.85,
    });
    world.smoke.emit(world.corridorPoint(CORRIDOR_MARKS.breachDoor + 1.4, 0, 1.2), Math.round(12 * world.quality.particleScale), {
      speed: 2.2, size: 1.7, life: 8, opacity: 0.5, direction: new THREE.Vector3(0, 0.5, 0.7), spread: 0.8,
    });
    director.impulse(1.05);
    torchLoop?.stop(0.15);
    torchLoop = null;
    alarmLoop?.setLevel(0.42, 0.4);
  });
  // Lingering smoke in the doorway, thinning as the fight moves aft.
  for (let t = 207.4; t < 240; t += 1.5) {
    const st = t;
    ev(st, `breach-smoke-${st.toFixed(1)}`, () => {
      const fade = 1 - progress(st, 207, 238);
      world.smoke.emit(world.corridorPoint(CORRIDOR_MARKS.breachDoor + 0.4, rng.range(-0.8, 0.8), 0.35), 1, {
        speed: 0.7, size: 1.1, life: 6, opacity: 0.1 + 0.24 * fade, direction: new THREE.Vector3(0, 1, 0.25), spread: 0.6,
      });
    });
  }
  // Embers dying in the doorway.
  for (let t = 208.4; t < 236; t += 1.7) {
    const st = t;
    ev(st, `breach-ember-${st.toFixed(1)}`, () => {
      const p = world.corridorPoint(CORRIDOR_MARKS.breachDoor + 0.2, rng.range(-1.3, 1.3), rng.range(0.1, 2.2));
      world.interiorSparks.burst(p, Math.round(7 * world.quality.particleScale), {
        speed: 1.4, spread: Math.PI, color: '#ff9a44', size: 0.09, life: 1.4,
      });
      sfx.sparks({ at: p, ref: 6 }, 0.35);
    });
  }

  /* ---- corridor firefight ---- */
  {
    const IMPERIAL_BOLT = PALETTE.laserRed;
    const REBEL_BOLT = PALETTE.laserBlue;
    const fRng = new Rng('firefight');
    const corridorFire = (
      from: THREE.Vector3,
      to: THREE.Vector3,
      colour: string,
      pitch: number,
      spread: number,
    ) => {
      const aim = to.clone().add(new THREE.Vector3(fRng.range(-spread, spread), fRng.range(-spread * 0.7, spread * 0.7), fRng.range(-0.5, 0.5)));
      const dir = aim.clone().sub(from).normalize();
      world.interiorBolts.fire({
        // Slow enough that the eye can follow a shot across the corridor:
        // visible travel time is what makes an exchange of fire readable.
        origin: from, direction: dir, speed: 24, color: colour,
        length: 1.6, radius: 0.075, life: 2.2, hitAt: aim,
        onEnd: (pos) => {
          world.interiorSparks.burst(pos, Math.round(12 * world.quality.particleScale), {
            speed: 3.4, spread: Math.PI * 0.8, color: colour === IMPERIAL_BOLT ? '#ffc0a8' : '#bfe6ff',
            size: 0.055, life: 0.5,
          });
          sfx.impact({ at: pos, ref: 5 }, 0.12);
        },
      });
      sfx.blaster({ at: from, ref: 6, gain: 0.55 }, pitch);
    };

    for (let t = 208.6; t < 233; t += 0.055 + fRng.next() * 0.11) {
      const st = t;
      const imperial = fRng.chance(0.62);
      ev(st, `ff-${st.toFixed(2)}`, () => {
        if (imperial) {
          const shooters = world.troopers.filter((x) => x.group.visible);
          if (!shooters.length) return;
          const shooter = shooters[Math.floor(fRng.next() * shooters.length)];
          const from = new THREE.Vector3();
          const dir = new THREE.Vector3();
          if (!shooter.muzzleWorld(from, dir)) return;
          shooter.fire();
          corridorFire(from, world.corridorPoint(CORRIDOR_MARKS.rebelLine + fRng.range(0, 8), fRng.range(-1.2, 1.2), fRng.range(0.7, 1.7)), IMPERIAL_BOLT, 1, 0.35);
        } else {
          const shooters = world.rebels.filter((x) => x.state === 'aim' || x.state === 'crouch');
          if (!shooters.length) return;
          const shooter = shooters[Math.floor(fRng.next() * shooters.length)];
          const from = new THREE.Vector3();
          const dir = new THREE.Vector3();
          if (!shooter.muzzleWorld(from, dir)) return;
          shooter.fire();
          corridorFire(from, world.corridorPoint(CORRIDOR_MARKS.breachDoor + fRng.range(0, 7), fRng.range(-1.2, 1.2), fRng.range(0.7, 1.7)), REBEL_BOLT, 0.82, 0.35);
        }
      });
    }
  }

  /* ---- Vader ---- */
  ev(238.6, 'vader-arrive', () => {
    respiratorLoop?.stop(0.2);
    respiratorLoop = sfx.respirator({ at: world.corridorPoint(CORRIDOR_MARKS.breachDoor, 0, 1.6), ref: 7 });
    respiratorLoop.setLevel(0.85, 1.5);
    sfx.transition({ gain: 0.7 }, false);
  });
  // Vader's footfalls: slow, heavy, and exactly on the beat.
  for (let i = 0; i < 26; i++) {
    const st = 243.4 + i * 0.86;
    if (st > 312) break;
    ev(st, `vader-step-${i}`, () => {
      if (!world.vader.group.visible) return;
      sfx.footstep({ at: world.vader.group.position.clone().setY(INTERIOR_ORIGIN.y), ref: 6, gain: 1.5 }, true);
    });
  }
  ev(300, 'respirator-fade', () => respiratorLoop?.setLevel(0.35, 6));

  /* ---- Leia and the plans ---- */
  ev(259, 'holo-on', () => {
    sfx.hologram({ at: world.corridorPoint(CORRIDOR_MARKS.transfer - 0.9, 0.1, 1.2), ref: 5 });
    world.r2.setProjecting(0.9);
  });
  ev(277, 'transfer-start', () => {
    sfx.dataTransfer({ at: world.corridorPoint(CORRIDOR_MARKS.transfer, 0.55, 0.6), ref: 5 });
    sfx.droidChirp({ at: world.corridorPoint(CORRIDOR_MARKS.transfer, 0.55, 0.8), ref: 5 }, 'urgent');
  });
  ev(283, 'transfer-done', () => {
    world.r2.setProjecting(0);
    sfx.droidChirp({ at: world.corridorPoint(CORRIDOR_MARKS.transfer, 0.55, 0.8), ref: 5 }, 'calm');
  });
  for (const [t, mood] of [
    [262, 'calm'], [269, 'calm'], [287, 'urgent'], [293, 'urgent'], [299, 'calm'], [304, 'urgent'],
  ] as Array<[number, 'calm' | 'urgent' | 'worried']>) {
    ev(t, `chirp-${t}`, () => {
      if (!world.r2.group.visible) return;
      sfx.droidChirp({ at: world.r2.headWorld(new THREE.Vector3()), ref: 5 }, mood);
    });
  }
  for (const t of [289, 296, 302, 306]) {
    ev(t, `servo-${t}`, () => {
      if (!world.c3po.group.visible) return;
      sfx.servo({ at: world.c3po.chestWorld(new THREE.Vector3()), ref: 4 }, 0.55);
    });
  }

  /* ---- droid movement audio ---- */
  ev(288.4, 'droid-roll-on', () => {
    droidRoll?.stop(0.2);
    droidRoll = sfx.droidRoll({ at: world.r2.group.position.clone(), ref: 5 });
    droidRoll.setLevel(0.55, 0.4);
  });
  ev(304, 'droid-roll-off', () => {
    droidRoll?.stop(0.5);
    droidRoll = null;
  });
  // Protocol-droid footsteps: short, stiff, mechanical.
  for (let i = 0; i < 40; i++) {
    const st = 290.6 + i * 0.44;
    if (st > 307.5) break;
    ev(st, `c3po-step-${i}`, () => {
      if (!world.c3po.group.visible) return;
      sfx.footstep({ at: world.c3po.group.position.clone().setY(INTERIOR_ORIGIN.y), ref: 5, gain: 0.8 }, true);
    });
  }

  /* ---- pod launch ---- */
  ev(304.8, 'bay-hatch', () => {
    sfx.doorServo({ at: world.podBay.hatchCentre.getWorldPosition(new THREE.Vector3()), ref: 8 }, true);
  });
  ev(307.8, 'pod-clamps', () => {
    sfx.clamp({ at: world.podBay.podSeat.getWorldPosition(new THREE.Vector3()), ref: 7 }, 1.1);
    director.impulse(0.45);
  });
  ev(309.4, 'pod-launch', () => {
    const p = podPosition(309.4, new THREE.Vector3());
    sfx.clamp({ at: p, ref: 60 }, 1.6);
    sfx.impact({ at: p, ref: 60 }, 0.4);
    world.exteriorSparks.burst(p, Math.round(40 * world.quality.particleScale), {
      speed: 12, spread: Math.PI, color: '#ffd8a0', size: 0.7, life: 0.9,
    });
    director.impulse(0.6);
  });
  ev(310, 'pod-engine', () => {
    runnerEngine?.stop(0.3);
    runnerEngine = null;
    destroyerEngine?.stop(0.3);
    destroyerEngine = sfx.engine('capital');
    destroyerEngine.setLevel(0.35, 3);
  });
  ev(316.5, 'entry-rumble', () => {
    entryLoop?.stop(0.2);
    entryLoop = sfx.atmosphericEntry();
    entryLoop.setLevel(0.05, 1);
  });
  ev(320, 'entry-build', () => entryLoop?.setLevel(0.65, 8));
  ev(SHOW_DURATION - 4, 'entry-out', () => entryLoop?.stop(3.5));

  timeline.addEvents(events);

  /* ---- named beats for the diagnostics overlay and the scrubber ---- */
  const beats: Array<[number, string]> = [
    [0, 'Darkness'],
    [4, 'Prologue text'],
    [34, 'Planet reveal'],
    [62, 'Empty sky'],
    [66, 'Corvette enters'],
    [86, 'Low pursuit'],
    [98, 'Destroyer reveal'],
    [116, 'Turbolasers open'],
    [132, 'Drives hit'],
    [146, 'Powerless'],
    [151, 'Tractor beam'],
    [166, 'Drawn alongside'],
    [183, 'Match cut'],
    [186, 'Corridor'],
    [194, 'Cutting charge'],
    [206.5, 'Breach'],
    [209, 'Firefight'],
    [232, 'Silence'],
    [239, 'Vader enters'],
    [252, 'Leia moves aft'],
    [259, 'The plans'],
    [277, 'Data transfer'],
    [288, 'Droids run'],
    [300, 'Pod bay'],
    [309, 'Launch'],
    [316, 'Descent'],
    [322, 'Epilogue'],
  ];
  for (const [t, label] of beats) timeline.addBeat(t, label);

  /* ============================== SHOTS ================================= */
  director.addAll(buildShots(world, prologue, epilogue));

  return {
    resetAudio: () => {
      stopAll();
      narrator.stop();
    },
    dispose: () => {
      stopAll();
    },
  };
}

/* ========================================================================== *
 *  Shot list
 * ========================================================================== */

function buildShots(world: World, prologue: Prologue, epilogue: EpilogueCard): Shot[] {
  const shots: Shot[] = [];
  const rp = new THREE.Vector3();
  const dp = new THREE.Vector3();
  const pp = new THREE.Vector3();
  const _shotA = new THREE.Vector3();
  const _shotB = new THREE.Vector3();
  const UP = new THREE.Vector3(0, 1, 0);
  const IO = INTERIOR_ORIGIN;

  /** Corridor point helper for camera work. */
  const cp = (z: number, x = 0, y = 1.55) => new THREE.Vector3(IO.x + x, IO.y + y, IO.z + z);

  /* ---------------------------------------------------- 1 · prologue ---- */
  shots.push({
    id: 'void',
    name: 'Prologue — the void',
    start: 0, end: 34, region: 'exterior', near: 1, far: 40000, fov: 44,
    apply(c) {
      // Drifting through empty space with a slow upward pitch.
      const drift = c.t * 0.9;
      c.eye.set(Math.sin(c.t * 0.05) * 14, 30 + drift * 0.4, 900 - drift);
      c.target.set(Math.sin(c.t * 0.05) * 14, 200 + drift * 0.4, -3000);
      prologue.update(c.t, worldCamera);
    },
  });

  /* --------------------------------------------------- 2 · Tatooine ----- */
  shots.push({
    id: 'planet-reveal',
    name: 'Tatooine — reveal',
    start: 34, end: 49, region: 'exterior', near: 1, far: 40000, fov: 46, blend: 2.4,
    apply(c) {
      prologue.setVisible(false);
      const k = Ease.sine(c.u);
      c.eye.set(Math.sin(c.t * 0.05) * 20, 30, 640);
      // A long, unhurried tilt from empty sky down onto the lit limb.
      const dir = skyDirection(lerp(16, -45, k), lerp(-6, 0, k));
      c.target.copy(c.eye).addScaledVector(dir, 3000);
    },
  });
  shots.push({
    id: 'planet-drift',
    name: 'Tatooine — high drift',
    start: 49, end: 62, region: 'exterior', near: 1, far: 40000, fov: 40, blend: 2.2,
    apply(c) {
      const k = Ease.sine(c.u);
      c.eye.set(lerp(-40, 120, k), 30, 640);
      // Hold on the day side and let the world turn under us.
      const dir = skyDirection(lerp(-47, -41, k), lerp(0, 15, k));
      c.target.copy(c.eye).addScaledVector(dir, 3000);
    },
  });
  shots.push({
    id: 'empty-sky',
    name: 'Empty sky',
    start: 62, end: 66, region: 'exterior', near: 1, far: 40000, fov: 36, blend: 1.6,
    apply(c) {
      runnerPosition(c.t, rp);
      const k = Ease.sine(c.u);
      c.eye.set(rp.x + 40, rp.y + 30, rp.z - 240);
      // Tilt up off the limb into the empty sky the corvette will come out of.
      const dir = skyDirection(lerp(-30, -4, k), 22);
      c.target.copy(c.eye).addScaledVector(dir, 3000);
    },
  });

  /* ---------------------------------------------------- 3 · pursuit ----- */
  shots.push({
    id: 'runner-entry',
    name: 'Corvette — entry',
    start: 66, end: 75, region: 'exterior', near: 0.6, far: 40000, fov: 42, blend: 1.2,
    apply(c) {
      // A fixed vantage the corvette tears past, so the speed is legible. The
      // camera sits astern of the mark, which puts the drive flares in frame
      // as she goes by rather than presenting a flat unlit broadside.
      const anchor = runnerPosition(70.5, new THREE.Vector3());
      c.eye.set(anchor.x + 52, anchor.y + 13, anchor.z + 108);
      runnerPosition(c.t, rp);
      c.target.copy(rp).add(new THREE.Vector3(0, 3, 0));
    },
  });
  shots.push({
    id: 'runner-track',
    name: 'Corvette — tracking three-quarter',
    start: 75, end: 87, region: 'exterior', near: 0.6, far: 40000, fov: 38, blend: 1.4,
    apply(c) {
      runnerPosition(c.t, rp);
      const k = Ease.sine(c.u);
      c.eye.set(rp.x - lerp(130, 88, k), rp.y + lerp(34, 20, k), rp.z - lerp(150, 96, k));
      c.target.copy(rp).add(new THREE.Vector3(0, 2, -6));
    },
  });
  shots.push({
    id: 'runner-low',
    name: 'Corvette — low pursuit',
    start: 87, end: 99, region: 'exterior', near: 0.6, far: 40000, fov: 40, blend: 1.6,
    apply(c) {
      runnerPosition(c.t, rp);
      c.eye.set(rp.x + 16, rp.y - 24, rp.z + 168);
      // Drift the framing upward: we are about to need the space above.
      c.target.set(rp.x, rp.y + lerp(10, 54, Ease.sine(c.u)), rp.z - 120);
    },
  });
  shots.push({
    id: 'destroyer-reveal',
    name: 'Destroyer — overhead reveal',
    start: 99, end: 118, region: 'exterior', near: 0.6, far: 40000, fov: 48, blend: 2.6,
    apply(c) {
      runnerPosition(c.t, rp);
      const k = Ease.sine(c.u);
      // Low and behind the corvette, tilted up into the empty sky it is about
      // to lose. The destroyer arrives from over our shoulder and simply keeps
      // arriving; the camera only has to hold still and let it.
      c.eye.set(rp.x + 74, rp.y - 40 - k * 10, rp.z + 215);
      // Aim ahead and above: elevation climbs as the hull fills the frame.
      const elevation = lerp(0.10, 0.46, smoothstep(0.05, 0.62, c.u));
      const ahead = 620;
      c.target.set(
        rp.x + 34,
        c.eye.y + ahead * Math.tan(elevation),
        c.eye.z - ahead,
      );
      c.fov = lerp(48, 58, k);
    },
  });
  shots.push({
    id: 'battle-profile',
    name: 'Battle — profile two-shot',
    start: 118, end: 133, region: 'exterior', near: 1, far: 40000, fov: 34, blend: 2.2,
    apply(c) {
      runnerPosition(c.t, rp);
      destroyerPosition(c.t, dp);
      const k = Ease.sine(c.u);
      // Stand off to port and slightly below so both ships are in frame and
      // the size difference is unmistakable.
      c.eye.set(rp.x - lerp(620, 780, k), rp.y - 90, rp.z + lerp(360, 130, k));
      c.target.copy(rp).lerp(dp, 0.24).add(new THREE.Vector3(0, 30, 0));
    },
  });
  shots.push({
    id: 'engines-hit',
    name: 'Corvette — drives hit',
    start: 133, end: 143, region: 'exterior', near: 0.4, far: 40000, fov: 42, blend: 1.4,
    apply(c) {
      runnerPosition(c.t, rp);
      const k = Ease.sine(c.u);
      c.eye.set(rp.x + lerp(120, 86, k), rp.y + 26, rp.z + lerp(230, 168, k));
      c.target.copy(rp).add(new THREE.Vector3(0, 0, 40));
    },
  });
  shots.push({
    id: 'drives-dead',
    name: 'Corvette — powerless',
    start: 143, end: 151, region: 'exterior', near: 1, far: 40000, fov: 32, blend: 2,
    apply(c) {
      runnerPosition(c.t, rp);
      destroyerPosition(c.t, dp);
      const k = Ease.sine(c.u);
      c.eye.set(rp.x - 300, rp.y + 60 + k * 40, rp.z + 320);
      c.target.copy(rp).lerp(dp, 0.16);
    },
  });

  /* ---------------------------------------------------- 4 · capture ----- */
  shots.push({
    id: 'tractor',
    name: 'Tractor beam',
    start: 151, end: 165, region: 'exterior', near: 1, far: 40000, fov: 36, blend: 2.4,
    apply(c) {
      runnerPosition(c.t, rp);
      destroyerPosition(c.t, dp);
      const k = Ease.sine(c.u);
      c.eye.set(rp.x - lerp(760, 560, k), rp.y - lerp(40, 130, k), rp.z + lerp(560, 380, k));
      c.target.copy(rp).lerp(dp, 0.3);
    },
  });
  shots.push({
    id: 'alongside',
    name: 'Drawn alongside',
    start: 165, end: 177, region: 'exterior', near: 1, far: 40000, fov: 40, blend: 2.6,
    apply(c) {
      runnerPosition(c.t, rp);
      destroyerPosition(c.t, dp);
      const k = Ease.sine(c.u);
      // Close on the corvette with the destroyer's flank filling the frame.
      c.eye.set(rp.x - lerp(340, 210, k), rp.y - 60, rp.z + lerp(300, 190, k));
      c.target.copy(rp).add(new THREE.Vector3(lerp(30, 90, k), lerp(20, 70, k), -20));
    },
  });
  shots.push({
    id: 'boarding',
    name: 'Boarding',
    start: 177, end: 184, region: 'exterior', near: 0.4, far: 40000, fov: 38, blend: 2,
    apply(c) {
      runnerPosition(c.t, rp);
      const k = Ease.sine(c.u);
      c.eye.set(rp.x - lerp(140, 62, k), rp.y + lerp(48, 24, k), rp.z + lerp(140, 66, k));
      c.target.copy(rp).add(new THREE.Vector3(6, 0, -4));
    },
  });
  shots.push({
    id: 'push-to-hull',
    name: 'Match cut — into the hull',
    start: 184, end: 186, region: 'exterior', near: 0.2, far: 40000, fov: 34, blend: 0.8,
    apply(c) {
      runnerPosition(c.t, rp);
      const k = Ease.inQuad(c.u);
      c.eye.set(rp.x - lerp(58, 17, k), rp.y + lerp(22, 3, k), rp.z + lerp(60, 14, k));
      c.target.copy(rp).add(new THREE.Vector3(2, 0, 0));
      c.fov = lerp(34, 26, k);
    },
  });

  /* --------------------------------------------------- 5 · corridor ----- */
  shots.push({
    id: 'corridor-establish',
    name: 'Corridor — establishing',
    start: 186, end: 197, region: 'interior', near: 0.05, far: 220, fov: 42,
    apply(c) {
      const k = Ease.sine(c.u);
      // Looking forward down the corridor toward the sealed door.
      c.eye.copy(cp(lerp(34, 27, k), lerp(0.5, 0.1, k), lerp(2.2, 1.85, k)));
      c.target.copy(cp(CORRIDOR_MARKS.breachDoor, 0, 1.5));
    },
  });
  shots.push({
    id: 'defender-eye',
    name: 'Defender — eye level',
    start: 197, end: 207, region: 'interior', near: 0.05, far: 220, fov: 36, blend: 1.1,
    apply(c) {
      const k = Ease.sine(c.u);
      // Behind the rearmost firing pair, on the centreline at head height, so
      // the whole line stacks into depth instead of straddling the lens.
      c.eye.copy(cp(lerp(29.8, 27.9, k), lerp(0.2, -0.05, k), lerp(1.52, 1.44, k)));
      c.target.copy(cp(CORRIDOR_MARKS.breachDoor + 0.2, 0.05, lerp(1.3, 1.5, k)));
    },
  });
  shots.push({
    id: 'door-breach',
    name: 'The breach',
    start: 207, end: 214, region: 'interior', near: 0.05, far: 220, fov: 44, blend: 0.55,
    apply(c) {
      const k = Ease.outCubic(c.u);
      // Close enough that the blast fills the frame, then pushed back as the
      // troopers come through — the recoil of the shot, not a zoom.
      c.eye.copy(cp(lerp(8.4, 14.6, k), lerp(0.35, -0.25, k), lerp(1.05, 1.45, k)));
      c.target.copy(cp(CORRIDOR_MARKS.breachDoor + 0.5, 0, 1.4));
      c.fov = lerp(54, 44, k);
    },
  });
  shots.push({
    id: 'firefight',
    name: 'Firefight — cross corridor',
    start: 214, end: 229, region: 'interior', near: 0.05, far: 220, fov: 46, blend: 1.2,
    apply(c) {
      const k = Ease.sine(c.u);
      // Behind and above the rebel line, looking down the corridor at the
      // advance. Two things follow from the angle: the corridor axis runs
      // diagonally so bolts streak across frame instead of shrinking to dots at
      // the vanishing point, and the lens sits above head height, which is the
      // only place in a 3.4 m corridor nobody can walk through.
      c.eye.copy(cp(lerp(26.6, 25.0, k), lerp(1.18, 0.98, k), lerp(2.12, 1.94, k)));
      c.target.copy(cp(lerp(13.4, 11.8, k), lerp(-0.45, -0.3, k), lerp(1.2, 1.1, k)));
      c.fov = lerp(56, 50, k);
    },
  });
  shots.push({
    id: 'fallback',
    name: 'Rebels — falling back',
    start: 229, end: 239, region: 'interior', near: 0.05, far: 220, fov: 38, blend: 1.3,
    apply(c) {
      const k = Ease.sine(c.u);
      c.eye.copy(cp(lerp(31, 28.5, k), lerp(-1.0, -0.4, k), lerp(1.1, 1.5, k)));
      c.target.copy(cp(lerp(22, 16, k), 0.1, 1.35));
    },
  });
  shots.push({
    id: 'vader-entrance',
    name: 'Vader — entrance',
    start: 239, end: 252, region: 'interior', near: 0.05, far: 220, fov: 34, blend: 1.8,
    apply(c) {
      const k = Ease.sine(c.u);
      // Riding backwards ahead of him and closing, low and on the centreline:
      // he has to be the tallest thing in the frame and the lens has to stay
      // under his eyeline for the whole shot. Holding the standoff relative to
      // him rather than to the set is what keeps his size constant while the
      // escort behind him shrinks away.
      const vz = world.vader.group.visible ? world.vader.group.position.z - IO.z : CORRIDOR_MARKS.breachDoor;
      c.eye.copy(cp(vz + lerp(6.6, 3.9, k), 0.05, lerp(0.48, 0.7, k)));
      c.target.copy(cp(vz + 0.3, 0, lerp(1.34, 1.6, k)));
      c.fov = lerp(40, 32, k);
    },
  });

  /* ------------------------------------------------------- 6 · plans ---- */
  shots.push({
    id: 'leia-aft',
    name: 'Leia — moving aft',
    start: 252, end: 263, region: 'interior', near: 0.05, far: 220, fov: 38, blend: 1.6,
    apply(c) {
      const k = Ease.sine(c.u);
      const lz = world.leia.group.position.z - IO.z;
      c.eye.copy(cp(lz + lerp(-3.4, -2.6, k), lerp(1.15, 0.75, k), lerp(1.62, 1.42, k)));
      c.target.copy(cp(lz + 0.4, -0.35, 1.3));
    },
  });
  shots.push({
    id: 'plans-projection',
    name: 'The plans',
    start: 263, end: 276, region: 'interior', near: 0.03, far: 220, fov: 34, blend: 1.6,
    apply(c) {
      const k = Ease.sine(c.u);
      // Aft of both subjects, looking forward down the corridor. The lens sits
      // between them on the centreline so they separate across the frame: she
      // reads on the left, the schematic on the right, neither in front of the
      // other, and her face is turned into the lens.
      c.eye.copy(cp(CORRIDOR_MARKS.transfer + lerp(2.5, 1.9, k), lerp(0.16, 0.1, k), lerp(1.62, 1.52, k)));
      c.target.copy(cp(CORRIDOR_MARKS.transfer - 1.2, lerp(0.06, 0.02, k), lerp(1.3, 1.26, k)));
      c.fov = lerp(42, 38, k);
    },
  });
  shots.push({
    id: 'transfer',
    name: 'Transfer — Leia and the droid',
    start: 276, end: 285, region: 'interior', near: 0.03, far: 220, fov: 32, blend: 1.4,
    apply(c) {
      const k = Ease.sine(c.u);
      // Across the pair at droid height: Leia kneeling on the left, the
      // astromech on the right, the schematic draining down between them.
      c.eye.copy(cp(CORRIDOR_MARKS.transfer + lerp(2.1, 1.75, k), lerp(1.35, 1.15, k), lerp(1.32, 1.12, k)));
      c.target.copy(cp(CORRIDOR_MARKS.transfer - 1.05, lerp(-0.2, -0.16, k), lerp(1.0, 0.86, k)));
      c.fov = lerp(40, 36, k);
    },
  });
  shots.push({
    id: 'search-approach',
    name: 'Imperials — searching aft',
    start: 285, end: 289, region: 'interior', near: 0.05, far: 220, fov: 40, blend: 1.1,
    apply(c) {
      const k = Ease.sine(c.u);
      c.eye.copy(cp(CORRIDOR_MARKS.transfer - 1.2, lerp(-1.0, -1.15, k), 1.6));
      c.target.copy(cp(CORRIDOR_MARKS.transfer - 18, 0.2, 1.5));
    },
  });

  /* --------------------------------------------------------- 7 · pod ---- */
  shots.push({
    id: 'droids-run',
    name: 'Droids — heading aft',
    start: 289, end: 299, region: 'interior', near: 0.05, far: 220, fov: 42, blend: 1.4,
    apply(c) {
      const rz = world.r2.group.visible ? world.r2.group.position.z - IO.z : CORRIDOR_MARKS.bayDoor;
      const cz = world.c3po.group.visible ? world.c3po.group.position.z - IO.z : rz - 3;
      const k = Ease.sine(c.u);
      // Ahead of the pair and backing away, low enough to put the astromech at
      // hero height. Shot from behind, the protocol droid's hip fills half the
      // frame and the astromech is a dot at the end of the corridor; shot from
      // in front, the difference in how the two of them move is the subject.
      c.eye.copy(cp(rz + lerp(3.6, 3.1, k), lerp(-0.05, 0.15, k), lerp(0.86, 0.74, k)));
      c.target.copy(cp(lerp(rz, cz + 0.6, 0.45), lerp(-0.25, -0.1, k), 0.95));
      c.fov = lerp(46, 42, k);
    },
  });
  shots.push({
    id: 'bay',
    name: 'Pod bay',
    start: 299, end: 307, region: 'interior', near: 0.05, far: 220, fov: 52, blend: 1.4,
    apply(c) {
      const k = Ease.sine(c.u);
      // Standing back by the corridor doorway, near square to the pod's axis.
      // Broadside is the only angle at which a lifeboat reads as a lifeboat:
      // the launch hatch is off its nose, the droids climb the ramp in the near
      // ground, and the whole geography is one frame. Ten degrees more toward
      // the stern than this and the pod photographs end-on as a barrel.
      c.eye.copy(cp(BAY_Z + lerp(-4.4, -4.2, k), lerp(0.7, 0.4, k), lerp(2.75, 2.5, k)));
      c.target.copy(cp(BAY_Z + lerp(1.5, 1.4, k), lerp(-1.9, -1.85, k), lerp(1.45, 1.35, k)));
      c.fov = lerp(56, 52, k);
    },
  });
  shots.push({
    id: 'tube',
    name: 'Launch hatch',
    start: 307, end: 309.6, region: 'interior', near: 0.05, far: 220, fov: 46, blend: 1.0,
    apply(c) {
      const k = Ease.inCubic(c.u);
      // Round behind the pod's stern quarter, looking down the launch line, so
      // the hatch parting on the stars is the deep end of the shot and the pod
      // exits away from the lens rather than across it.
      c.eye.copy(cp(BAY_Z + lerp(-3.4, -3.0, k), lerp(3.5, 3.2, k), lerp(2.9, 2.7, k)));
      c.target.copy(cp(BAY_Z + 1.55, lerp(-4.4, -5.4, k), lerp(2.0, 1.85, k)));
      c.fov = lerp(50, 46, k);
    },
  });
  shots.push({
    id: 'pod-away',
    name: 'Pod — away',
    start: 309.6, end: 317, region: 'exterior', near: 0.3, far: 40000, fov: 40,
    apply(c) {
      podPosition(c.t, pp);
      runnerPosition(c.t, rp);
      const k = Ease.sine(c.u);
      // Stand off on the far side of the pod from the ships, so the frame
      // reads pod-in-front-of-capital-ship however far the pod has fallen.
      const toShip = _shotA.subVectors(rp, pp).normalize();
      const side = _shotB.crossVectors(toShip, UP).normalize();
      const dist = lerp(26, 52, k);
      c.eye.copy(pp)
        .addScaledVector(toShip, -dist)
        .addScaledVector(side, dist * 0.55)
        .addScaledVector(UP, dist * 0.22);
      c.target.copy(pp).addScaledVector(toShip, dist * 0.5);
    },
  });
  shots.push({
    id: 'descent',
    name: 'Descent',
    start: 317, end: 322, region: 'exterior', near: 1, far: 40000, fov: 38, blend: 1.6,
    apply(c) {
      podPosition(c.t, pp);
      const k = Ease.sine(c.u);
      // The planet lives in the sky scene, so what puts it behind the pod is
      // the camera's *orientation*: look along the pod's fall line.
      const side = _shotB.crossVectors(PLANET_DIRECTION, UP).normalize();
      const dist = lerp(300, 620, k);
      c.eye.copy(pp)
        .addScaledVector(PLANET_DIRECTION, -dist)
        .addScaledVector(side, dist * 0.2)
        .addScaledVector(UP, dist * 0.12);
      c.target.copy(pp).addScaledVector(PLANET_DIRECTION, dist * 0.42);
    },
  });

  /* ---------------------------------------------------- 8 · epilogue ---- */
  shots.push({
    id: 'final-wide',
    name: 'Epilogue — wide',
    start: 322, end: 335, region: 'exterior', near: 1, far: 40000, fov: 46, blend: 2.6,
    apply(c) {
      runnerPosition(c.t, rp);
      destroyerPosition(c.t, dp);
      const k = Ease.sine(c.u);
      // Everything in one frame: the captured corvette and the destroyer above
      // it, the planet filling the lower half, the pod falling between them.
      // Stand off "above" the ships in the anti-planet direction and then tip
      // the lens back down, so the two subjects bracket the centre line.
      const away = _shotA.copy(PLANET_DIRECTION).negate();
      const side = _shotB.crossVectors(away, UP).normalize();
      const dist = lerp(2300, 2950, k);
      c.eye.copy(rp)
        .addScaledVector(away, dist * 0.77)
        .addScaledVector(side, dist * 0.64);
      const toShips = _shotA.copy(rp).lerp(dp, 0.3).sub(c.eye).normalize();
      // A third of the way from the ships toward the planet: ships high in
      // frame, the limb across the middle, the pod between the two.
      c.target.copy(c.eye).addScaledVector(toShips.lerp(PLANET_DIRECTION, 0.34).normalize(), 2400);
    },
  });
  shots.push({
    id: 'closing-card',
    name: 'Epilogue — closing line',
    start: 335, end: SHOW_DURATION, region: 'exterior', near: 1, far: 40000, fov: 40, blend: 2.4,
    apply(c) {
      runnerPosition(c.t, rp);
      podPosition(c.t, pp);
      const k = Ease.sine(c.u);
      c.eye.set(rp.x - 2100 - k * 220, rp.y + 460 + k * 90, rp.z + 2260 + k * 240);
      c.target.copy(pp).lerp(rp, 0.5);
      epilogue.setOpacity(smootherstep(336.5, 339, c.t) * (1 - smootherstep(SHOW_DURATION - 2.4, SHOW_DURATION - 0.4, c.t)), worldCamera);
    },
  });

  return shots;
}

/**
 * Shots need the live camera to park camera-locked overlays (the prologue
 * cards and the closing title). The app assigns it once at start-up.
 */
export let worldCamera: THREE.PerspectiveCamera = new THREE.PerspectiveCamera();
export function setWorldCamera(cam: THREE.PerspectiveCamera): void {
  worldCamera = cam;
}
