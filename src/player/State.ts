/**
 * The controller's working set.
 *
 * Movement, stances, mantling, the camera rig and footsteps are separate files
 * because they are separate problems, but they are one mechanism: they all read
 * and write the same body. Passing this record around beats threading a dozen
 * arguments through every call and keeps the ownership of each field explicit in
 * one place.
 */
import * as THREE from 'three';
import type { Stance } from '../core/Contracts';
import type { SurfaceType } from '../core/GameTypes';
import { GAMEPLAY } from '../core/Config';
import { STAND_HEIGHT } from './Tuning';

/**
 * Latched controller input.
 *
 * Sampled once per rendered frame, because the engine runs zero, one or several
 * fixed steps per frame and an edge-triggered action has to fire exactly once
 * regardless. Level-triggered fields could be read straight from `Input`; they
 * are latched too so that every fixed step of a frame sees one consistent intent.
 *
 * The press fields are *sticky until consumed*, not per-frame booleans. A frame
 * that runs no fixed step must not lose the press, so sampling ORs into them; and
 * a frame that runs eight steps must not repeat it, so the first step to run
 * clears them via `consumePresses`. Assigning per frame breaks the first case and
 * leaving them set breaks the second — the second is worse, because a press that
 * survives into the next step reads as a *second* press, which is how a single
 * tap of sprint becomes a tactical sprint and a prone press cancels itself.
 */
export interface PlayerInput {
  /** -1..1 strafe, +1 = right. */
  moveX: number;
  /** -1..1 forward, +1 = forward. */
  moveZ: number;
  sprintHeld: boolean;
  crouchHeld: boolean;
  crouchPressed: boolean;
  pronePressed: boolean;
  jumpHeld: boolean;
  /** Remaining jump-press credit; non-zero means "jump as soon as it is legal". */
  jumpBuffer: number;
  /** Forward or sprint was double-tapped: the ask for a tactical sprint. */
  tacticalRequested: boolean;
  firePressed: boolean;
  fireHeld: boolean;
  aimHeld: boolean;
  /** -1 lean left, +1 lean right. */
  leanAxis: number;
  /** False while dead, paused, or with a menu open. */
  enabled: boolean;
}

export function createPlayerInput(): PlayerInput {
  return {
    moveX: 0,
    moveZ: 0,
    sprintHeld: false,
    crouchHeld: false,
    crouchPressed: false,
    pronePressed: false,
    jumpHeld: false,
    jumpBuffer: 0,
    tacticalRequested: false,
    firePressed: false,
    fireHeld: false,
    aimHeld: false,
    leanAxis: 0,
    enabled: true,
  };
}

/**
 * Retire the presses a fixed step has now acted on. Called once per step, so the
 * remaining steps of the same frame see a press only in the step that handled it.
 * `jumpBuffer` is deliberately excluded: it is a timer that expires on its own and
 * is zeroed by whatever honours it.
 */
export function consumePresses(input: PlayerInput): void {
  input.crouchPressed = false;
  input.pronePressed = false;
  input.tacticalRequested = false;
  input.firePressed = false;
}

export function clearPlayerInput(input: PlayerInput): void {
  input.moveX = 0;
  input.moveZ = 0;
  input.sprintHeld = false;
  input.crouchHeld = false;
  input.jumpHeld = false;
  input.jumpBuffer = 0;
  input.fireHeld = false;
  input.aimHeld = false;
  input.leanAxis = 0;
  consumePresses(input);
}

export interface PlayerState {
  // --- Body ----------------------------------------------------------------
  /**
   * Capsule feet — the contact point on the floor, mirroring the character
   * handle. The crown is at `feet.y + height`, the eye at `feet.y + eyeHeight`.
   */
  readonly feet: THREE.Vector3;
  /** World velocity. Y is only meaningful in the air; see Movement. */
  readonly velocity: THREE.Vector3;
  readonly groundNormal: THREE.Vector3;
  /** Horizontal speed, metres per second. */
  speed: number;

  // --- Aim -----------------------------------------------------------------
  /** Aim yaw and pitch, recoil included, cosmetic camera layers excluded. */
  yaw: number;
  pitch: number;

  // --- Contact -------------------------------------------------------------
  grounded: boolean;
  groundSurface: SurfaceType;
  /** Seconds since leaving the ground; 0 while grounded. */
  airTime: number;
  /** Seconds since touching down; 0 while airborne. */
  groundTime: number;
  /** Seconds of pushing into something that will not move. Drives auto-vault. */
  blockedTime: number;
  /** Set for one step when a jump was launched. */
  jumped: boolean;

  // --- Stance --------------------------------------------------------------
  stance: Stance;
  /** Current capsule height, interpolated across a stance change. */
  height: number;
  /** Where the eye should settle, above the feet. */
  eyeHeight: number;
  /** 0 = stood up, 1 = fully crouched. */
  crouchAmount: number;
  /** 0 = off the deck, 1 = fully prone. */
  proneAmount: number;
  /** True while geometry is refusing a stand-up. */
  stanceBlocked: boolean;

  // --- Locomotion budget: written by StanceMachine, read by Movement -------
  /** Ground speed the current stance, sprint and ADS state allows. */
  speedCap: number;
  acceleration: number;
  friction: number;

  // --- Sprint --------------------------------------------------------------
  isSprinting: boolean;
  isTacticalSprinting: boolean;
  /** 0..1 sprint pose blend. */
  sprintAmount: number;
  /** 0..1 tactical sprint pose blend. */
  tacticalAmount: number;
  /** 0..1 remaining tactical sprint charge. */
  tacticalCharge: number;
  /** Seconds left before the weapon may fire again after sprinting. */
  sprintOut: number;

  // --- Slide ---------------------------------------------------------------
  /** 0..1 slide blend, for the camera and the viewmodel pose. */
  slideAmount: number;
  /** +1 / -1 roll direction chosen when the slide started. */
  slideSide: number;

  // --- Mantle --------------------------------------------------------------
  /** 0..1 progress through the current mantle. */
  mantleAmount: number;
  mantlePitch: number;
  mantleRoll: number;
  mantleDip: number;

  // --- Lean ----------------------------------------------------------------
  /** -1..1 after the wall clamp. */
  leanAmount: number;

  // --- Borrowed from other systems ----------------------------------------
  /** 0..1 ADS blend from the weapon system. */
  adsAmount: number;
  /** Field-of-view divisor of the equipped optic. */
  adsZoom: number;
  /** True for high-magnification optics, which breathe far more visibly. */
  scoped: boolean;
  holdingBreath: boolean;
  alive: boolean;

  // --- Per-step results ----------------------------------------------------
  /** Horizontal distance the last fixed step actually covered. */
  stepDistance: number;
  /** Stride phase in radians; a foot lands on every multiple of PI. */
  bobPhase: number;
}

export function createPlayerState(): PlayerState {
  return {
    feet: new THREE.Vector3(),
    velocity: new THREE.Vector3(),
    groundNormal: new THREE.Vector3(0, 1, 0),
    speed: 0,

    yaw: 0,
    pitch: 0,

    grounded: false,
    groundSurface: 'concrete',
    airTime: 0,
    groundTime: 0,
    blockedTime: 0,
    jumped: false,

    stance: 'stand',
    height: STAND_HEIGHT,
    eyeHeight: STAND_HEIGHT + GAMEPLAY.player.eyeOffset,
    crouchAmount: 0,
    proneAmount: 0,
    stanceBlocked: false,

    speedCap: GAMEPLAY.player.walkSpeed,
    acceleration: GAMEPLAY.player.acceleration,
    friction: GAMEPLAY.player.friction,

    isSprinting: false,
    isTacticalSprinting: false,
    sprintAmount: 0,
    tacticalAmount: 0,
    tacticalCharge: 1,
    sprintOut: 0,

    slideAmount: 0,
    slideSide: 1,

    mantleAmount: 0,
    mantlePitch: 0,
    mantleRoll: 0,
    mantleDip: 0,

    leanAmount: 0,

    adsAmount: 0,
    adsZoom: 1,
    scoped: false,
    holdingBreath: false,
    alive: true,

    stepDistance: 0,
    bobPhase: 0,
  };
}
