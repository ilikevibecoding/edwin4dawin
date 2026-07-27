/**
 * Ground and air movement.
 *
 * Source-engine lineage, retuned for Call of Duty pacing. The core is still
 * `accelerate()`: the wish direction is projected against the current velocity
 * and only the shortfall along that axis is filled in, which is what makes a
 * strafe change direction instantly while a straight-line sprint still ramps.
 *
 * Two deliberate departures from the classic model:
 *
 * - **Friction is directional.** Quake bleeds the whole velocity vector every
 *   tick and relies on a huge acceleration term to win the fight; the price is a
 *   top speed a few percent under the authored one and a permanent tug on the
 *   input axis. Here friction takes the component *across* the wish direction in
 *   full — which is what kills ice-skating — and only takes the component along
 *   it when that component is above the cap. Steady state is then exactly
 *   `speedCap`, and a slide boost still decays back down to it.
 *
 * - **Grounded movement is planar, not horizontal.** The displacement handed to
 *   the character controller is built tangent to the ground plane, so a slope is
 *   neither a wall that eats speed on the way up nor a ramp that launches you on
 *   the way down. Horizontal speed is the controlled quantity, which is what
 *   makes a hill feel like constant effort rather than a slow-down.
 *
 * Everything integrates on the fixed 120 Hz step, one `handle.move()` per step.
 */
import * as THREE from 'three';
import type { CharacterControllerHandle } from '../core/Contracts';
import { GAMEPLAY } from '../core/Config';
import { angleDelta, clamp } from '../core/MathUtils';
import type { PlayerInput, PlayerState } from './State';
import { TUNE } from './Tuning';

const P = GAMEPLAY.player;

export interface MoveResult {
  /** Touchdown happened this step. */
  landed: boolean;
  /** Downward speed at the instant of touchdown, m/s. */
  impactSpeed: number;
  /**
   * Vertical motion the controller invented on its own — an autostep onto a kerb
   * or a snap down off one. The capsule teleports; the camera must not.
   */
  stepUpDelta: number;
}

export class Movement {
  /** Unit wish direction in world space, horizontal. Zero when there is no input. */
  readonly wish = new THREE.Vector3();

  private readonly disp = new THREE.Vector3();
  private readonly result: MoveResult = { landed: false, impactSpeed: 0, stepUpDelta: 0 };

  private coyote = 0;
  private jumpCooldown = 0;
  private hopChain = 0;
  /** Set by `launchJump` so the launch step skips friction and gravity. */
  private launching = false;
  /** Last step came back blocked; pad the next request for the solver's probe. */
  private stepBoost = false;

  reset(): void {
    this.wish.set(0, 0, 0);
    this.coyote = 0;
    this.jumpCooldown = 0;
    this.hopChain = 0;
    this.launching = false;
    this.stepBoost = false;
  }

  /** True when a buffered jump would be honoured right now. */
  jumpReady(s: PlayerState): boolean {
    return this.jumpCooldown <= 0 && (s.grounded || this.coyote > 0);
  }

  /**
   * Commit to a jump. Called by the orchestrator once the stance machine has
   * agreed to it, so that a crouch stands up and a slide converts into a
   * slide-jump rather than being cut short.
   */
  launchJump(s: PlayerState): void {
    // A chain of jumps taken straight off the ground is capped harder every time,
    // so bunny hopping trades away speed instead of building it.
    this.hopChain = s.groundTime > 0 && s.groundTime < TUNE.hopChainWindow
      ? Math.min(TUNE.hopChainMax, this.hopChain + 1)
      : 0;
    const cap = s.speedCap * TUNE.hopFirstBonus * Math.pow(TUNE.hopDecay, this.hopChain);
    const speed = Math.hypot(s.velocity.x, s.velocity.z);
    if (speed > cap && speed > 1e-4) {
      const scale = cap / speed;
      s.velocity.x *= scale;
      s.velocity.z *= scale;
    }

    s.velocity.y = P.jumpVelocity;
    s.grounded = false;
    s.jumped = true;
    s.groundTime = 0;
    this.coyote = 0;
    this.jumpCooldown = TUNE.jumpCooldown;
    this.launching = true;
  }

  /** One fixed step of integration plus the single character-controller move. */
  step(
    dt: number,
    s: PlayerState,
    input: PlayerInput,
    handle: CharacterControllerHandle,
  ): MoveResult {
    this.jumpCooldown = Math.max(0, this.jumpCooldown - dt);
    this.coyote = s.grounded ? TUNE.coyoteTime : Math.max(0, this.coyote - dt);

    this.buildWish(s, input);

    if (s.stance === 'slide') this.slide(dt, s);
    else if (s.grounded) this.ground(dt, s);
    else this.air(dt, s);

    if (!s.grounded && !this.launching) {
      s.velocity.y = Math.max(-TUNE.terminalVelocity, s.velocity.y + P.gravity * dt);
    }

    this.integrate(dt, s, handle);
    this.launching = false;
    s.jumped = false;
    return this.result;
  }

  // -------------------------------------------------------------------------
  // Intent
  // -------------------------------------------------------------------------

  /**
   * Wish direction from the movement axes, kept strictly horizontal: the slope
   * is dealt with when the displacement is built, so the speed model only ever
   * reasons about ground-plane speed.
   */
  private buildWish(s: PlayerState, input: PlayerInput): void {
    const sin = Math.sin(s.yaw);
    const cos = Math.cos(s.yaw);
    // Yaw 0 faces -Z, matching the camera and the world's spawn headings.
    const x = cos * input.moveX - sin * input.moveZ;
    const z = -sin * input.moveX - cos * input.moveZ;
    const len = Math.hypot(x, z);
    if (len < 1e-4) this.wish.set(0, 0, 0);
    else this.wish.set(x / len, 0, z / len);
  }

  // -------------------------------------------------------------------------
  // Acceleration models
  // -------------------------------------------------------------------------

  private ground(dt: number, s: PlayerState): void {
    if (this.launching) return;
    if (this.wish.lengthSq() < 1e-8) {
      this.brake(dt, s, s.friction);
      return;
    }
    this.accelerate(dt, s, s.speedCap, s.acceleration, s.friction);
  }

  /**
   * Air control. The same projection as on the ground, but the cap along the wish
   * direction is only `airControl` of the walk speed, so pressing forward while
   * already moving forward buys nothing while pressing sideways rotates the
   * velocity vector. Enough to correct a jump, nowhere near enough to fly.
   */
  private air(dt: number, s: PlayerState): void {
    if (this.wish.lengthSq() < 1e-8) return;
    this.accelerate(dt, s, s.speedCap * P.airControl, P.airAcceleration, 0);
  }

  /**
   * A slide keeps whatever speed it was given and decays it, with gravity along
   * the slope added in: downhill accelerates, uphill drains fast. Steering
   * rotates the velocity rather than accelerating it, so a slide cannot be used
   * to gain speed by wiggling.
   */
  private slide(dt: number, s: PlayerState): void {
    const v = s.velocity;

    if (this.wish.lengthSq() > 1e-8) {
      const current = Math.atan2(v.z, v.x);
      const wanted = Math.atan2(this.wish.z, this.wish.x);
      const turn = clamp(angleDelta(current, wanted), -TUNE.slideSteer * dt, TUNE.slideSteer * dt);
      const speed = Math.hypot(v.x, v.z);
      const heading = current + turn;
      v.x = Math.cos(heading) * speed;
      v.z = Math.sin(heading) * speed;
    }

    // Gravity resolved into the horizontal plane: `|n.xz|` is the sine of the
    // slope angle and `-n.xz` points downhill.
    const n = s.groundNormal;
    const grade = Math.hypot(n.x, n.z);
    if (s.grounded && grade > 1e-3) {
      const accel = -P.gravity * grade * TUNE.slideSlopeGain * dt;
      v.x -= (n.x / grade) * accel;
      v.z -= (n.z / grade) * accel;
    }

    this.brake(dt, s, P.slideFriction);

    const speed = Math.hypot(v.x, v.z);
    if (speed > TUNE.slideMaxSpeed) {
      const scale = TUNE.slideMaxSpeed / speed;
      v.x *= scale;
      v.z *= scale;
    }
  }

  /**
   * The projected accelerate/friction pair. `along` is the speed already spent in
   * the wish direction and `perp` everything across it; friction owns `perp`
   * outright and only touches `along` when it is over budget.
   */
  private accelerate(
    dt: number,
    s: PlayerState,
    cap: number,
    accel: number,
    friction: number,
  ): void {
    const v = s.velocity;
    const w = this.wish;
    const along = v.x * w.x + v.z * w.z;
    let px = v.x - w.x * along;
    let pz = v.z - w.z * along;

    if (friction > 0) {
      const perp = Math.hypot(px, pz);
      if (perp > 1e-5) {
        const drop = Math.max(perp, TUNE.stopSpeed) * friction * dt;
        const scale = Math.max(0, perp - drop) / perp;
        px *= scale;
        pz *= scale;
      }
    }

    let next: number;
    if (along > cap) {
      const drop = friction > 0 ? Math.max(along, TUNE.stopSpeed) * friction * dt : 0;
      next = Math.max(cap, along - drop);
    } else {
      // Negative `along` means reversing; the same clamp carries the velocity
      // through zero, which is why a full about-face takes 2 * cap / accel.
      next = Math.min(cap, along + accel * dt);
    }

    v.x = px + w.x * next;
    v.z = pz + w.z * next;
  }

  /** Undirected friction, for standing still and for slides. */
  private brake(dt: number, s: PlayerState, friction: number): void {
    const v = s.velocity;
    const speed = Math.hypot(v.x, v.z);
    if (speed < 1e-4) {
      v.x = 0;
      v.z = 0;
      return;
    }
    const drop = Math.max(speed, TUNE.stopSpeed) * friction * dt;
    const scale = Math.max(0, speed - drop) / speed;
    v.x *= scale;
    v.z *= scale;
  }

  // -------------------------------------------------------------------------
  // Integration
  // -------------------------------------------------------------------------

  /**
   * Remove the part of the velocity that is pushing into whatever refused the
   * move. The shortfall between what was asked for and what happened points into
   * the obstruction, so clipping against it stops a head-on impact dead while
   * leaving a glancing one all of its tangential speed.
   *
   * The obvious alternative — adopt the solver's own result as the new velocity —
   * reads better on paper and is a trap. It zeroes the velocity on any step that
   * comes back even slightly short, and acceleration can only rebuild
   * `acceleration * dt` before the next step does it again: about 4 mm of travel
   * at 120 Hz. Against a marginal contact such as a stair nose the character then
   * never accumulates enough displacement for the controller's step assist to have
   * anything to work with, and a brief scrape becomes a permanent stop.
   */
  private clipVelocity(
    s: PlayerState,
    wantX: number,
    wantZ: number,
    applied: THREE.Vector3,
  ): void {
    const shortX = wantX - applied.x;
    const shortZ = wantZ - applied.z;
    const short = Math.hypot(shortX, shortZ);
    if (short < 1e-6) return;
    const nx = shortX / short;
    const nz = shortZ / short;
    const v = s.velocity;
    const into = v.x * nx + v.z * nz;
    if (into <= 0) return;
    v.x -= nx * into;
    v.z -= nz * into;
  }

  private integrate(dt: number, s: PlayerState, handle: CharacterControllerHandle): void {
    const v = s.velocity;
    const disp = this.disp;
    let wantX = v.x * dt;
    let wantZ = v.z * dt;

    // Pad a request the controller's step probe would decline to act on. Measured
    // against the map's exterior stairs, it climbs a 0.37 m riser at 1.2 m/s and
    // sticks at 1.0 m/s, so a crouch-walk under ADS — 0.86 m/s — would never get
    // up a staircase. Only ever applied while pushing against something that
    // already refused a move, where the padding is either the difference between
    // climbing and sticking or is thrown away by the wall in front of us.
    if (this.stepBoost && this.wish.lengthSq() > 1e-8) {
      const h = Math.hypot(wantX, wantZ);
      if (h > TUNE.blockedMinDisp && h < TUNE.stepAssistMinDisp) {
        const k = TUNE.stepAssistMinDisp / h;
        wantX *= k;
        wantZ *= k;
      }
    }

    // The vertical motion the ground itself accounts for: tangent to the ground
    // plane while grounded, ballistic while not. Anything the controller does
    // beyond this is a step it invented, which is what the camera has to hide.
    let expectedY: number;
    const n = s.groundNormal;
    if (s.grounded) {
      expectedY = n.y > 0.2 ? -(wantX * n.x + wantZ * n.z) / n.y : 0;
    } else {
      expectedY = v.y * dt;
    }

    // The ground-stick bias presses along the ground normal, not straight down.
    //
    // This matters far more than it looks. The solver resolves a blocked move by
    // removing the component that points into the contact plane, so a bias along
    // world -Y arrives partly across that plane whenever the contact is tilted and
    // takes some of the forward move out with it when it goes. On the flat that
    // costs nothing, but on the nose of a stair tread — normal about 14 degrees off
    // vertical — it costs a fifth of a walking step, two thirds of a crouched one,
    // and at `acceleration * dt` it reverses the move outright and the capsule
    // wedges there permanently. Pressed along the normal instead, the bias lands
    // entirely in the component the solver was going to remove anyway, so it seats
    // the capsule on its collision skin and keeps snap-to-ground armed without ever
    // competing with the move it is supposed to be supporting.
    const stick = s.grounded ? TUNE.groundStick * dt : 0;
    disp.x = wantX - stick * n.x;
    disp.y = expectedY - stick * n.y;
    disp.z = wantZ - stick * n.z;

    const requestedY = disp.y;
    // Measured on the tangential move, which is the distance actually intended;
    // the stick term is a bias the solver is expected to consume, not travel.
    const requestedH = Math.hypot(wantX, wantZ);
    const fallSpeed = -v.y;
    const wasGrounded = s.grounded;

    const applied = handle.move(disp, dt);

    s.feet.copy(handle.position);
    // A capsule that was airborne and is still rising cannot have landed, whatever
    // the contact set says: the skin the controller keeps under the capsule is
    // thicker than one step of jump displacement.
    s.grounded = handle.grounded && !(!wasGrounded && requestedY > 0);
    s.groundNormal.copy(handle.groundNormal);
    s.groundSurface = handle.groundSurface;

    // Measured against the slope-follow term, not the requested displacement, so
    // the deliberate ground-stick bias never reads as a step the camera must
    // absorb and a ramp is excluded without needing a threshold to separate it.
    const invented = applied.y - expectedY;
    const climbed = invented > TUNE.stepSmoothMin;

    const appliedH = Math.hypot(applied.x, applied.z);
    // A step the controller climbed for us costs horizontal distance on the step
    // it happens — it lifts, then resolves the move from up there — so it must not
    // be mistaken for an obstruction, or every stair tread would bleed speed.
    if (
      !climbed &&
      requestedH > TUNE.blockedMinDisp &&
      appliedH < requestedH * TUNE.blockedFraction
    ) {
      // Only worth arming on the ground: the padding exists for the controller's
      // step probe, and that only runs on a grounded, mostly-horizontal move.
      this.stepBoost = s.grounded;
      this.clipVelocity(s, wantX, wantZ, applied);
      s.blockedTime += dt;
    } else {
      this.stepBoost = false;
      s.blockedTime = 0;
    }

    if (s.grounded) {
      v.y = 0;
    } else if (requestedY > 0 && applied.y < requestedY * 0.5) {
      v.y = 0;
    }

    this.result.stepUpDelta = Math.abs(invented) > TUNE.stepSmoothMin ? invented : 0;
    this.result.landed = !wasGrounded && s.grounded;
    this.result.impactSpeed = this.result.landed ? Math.max(0, fallSpeed) : 0;

    s.stepDistance = appliedH;
    s.speed = Math.hypot(v.x, v.z);
    if (s.grounded) {
      s.groundTime += dt;
      s.airTime = 0;
    } else {
      s.airTime += dt;
      s.groundTime = 0;
    }
  }
}
