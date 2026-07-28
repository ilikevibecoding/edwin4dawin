/**
 * Aiming and shooting.
 *
 * This is the file that decides whether the AI feels fair. Four mechanisms do
 * that work, and all four exist to stop the one failure mode that ruins shooter
 * AI: a hitscan weapon plus a known target position is a machine that deletes the
 * player the instant they are visible.
 *
 *  1. **Reaction time.** Nothing fires until `reactionTime` has passed since the
 *     target was positively identified, scaled per archetype. A marksman is slower
 *     to react and far more accurate; a shock trooper is the reverse.
 *
 *  2. **Convergence.** The aim point is a physical thing that chases the target at
 *     a finite rate. Stepping out of cover into an enemy's field of view gives you
 *     a fraction of a second before their aim arrives, which is the window that
 *     makes movement worth anything.
 *
 *  3. **A persistent offset, not per-shot noise.** Randomising every shot
 *     independently averages out over a burst and reads as a shotgun. Holding one
 *     offset for a third of a second and then resampling means a burst either
 *     mostly hits or mostly misses, which is how real fire feels and gives the
 *     player something to react to.
 *
 *  4. **A first-shot penalty** that decays over the first second of an
 *     engagement, so the opening round is a warning rather than a hit.
 *
 * Damage never happens here. Every round goes through `combat.fireBullet`, so
 * penetration, falloff, hitboxes, near-miss suppression and impact FX are all the
 * combat module's, exactly once.
 */
import * as THREE from 'three';
import type { HitResult } from '../core/GameTypes';
import { clamp, damp, DEG2RAD, saturate } from '../core/MathUtils';
import type { AIWeapon } from './Archetypes';
import type { Blackboard } from './Blackboard';
import type { Enemy } from './Enemy';
import { FIGHT, SFX, SIGHT, VOICE } from './Tuning';

/**
 * Widest the visible aim is allowed to sit off the target.
 *
 * The error multipliers stack — no positive ID, no engagement token, moving,
 * suppressed — and nothing bounded the product, so an idle soldier was working
 * with a 39 degree "cone" and a suppressed moving one with several hundred. Past
 * a few degrees `tan` stops behaving like an angle at all, and the aim point it
 * produces lands tens or hundreds of metres away; the animator then faithfully
 * points the rifle at it, which is why an entire squad stood in the street aiming
 * at the sky.
 *
 * Capping only moves error, it does not remove it: whatever is left over becomes
 * bullet dispersion in `fire`, so how often a man hits is unchanged and the only
 * difference is that he is now looking roughly where his rounds are going.
 */
const MAX_AIM_CONE = 12 * DEG2RAD;

export class Combatant {
  weapon: AIWeapon;
  ammo: number;
  grenades = 0;

  /** Converging aim point in world space. This is what the weapon points at. */
  readonly aimPoint = new THREE.Vector3();
  /** Where the aim is trying to get to, before error. */
  readonly aimGoal = new THREE.Vector3();

  reloading = false;
  /** 0..1 while reloading, -1 otherwise. */
  reloadProgress = -1;
  /** Rounds left in the current burst. */
  burst = 0;
  shotsFired = 0;
  /** True on any frame a round left the barrel. */
  firedThisFrame = false;
  /** Engine time of the most recent shot. */
  lastShotAt = -100;

  private reloadEndAt = 0;
  private reloadDuration = 1;
  private nextShotAt = 0;
  private nextBurstAt = 0;
  private errorResampleAt = 0;
  private readonly errorOffset = new THREE.Vector3();
  /** Aim error past `MAX_AIM_CONE`, spent as bullet dispersion instead. */
  private residualSpread = 0;
  private engagementStart = -1;
  private grenadeReadyAt = 0;
  private grenadeThrowAt = -1;
  private readonly grenadeTarget = new THREE.Vector3();
  private tracerCounter = 0;
  private converged = 0;

  private readonly scratchA = new THREE.Vector3();
  private readonly scratchB = new THREE.Vector3();
  private readonly direction = new THREE.Vector3();
  private readonly perpA = new THREE.Vector3();
  private readonly perpB = new THREE.Vector3();

  constructor(weapon: AIWeapon) {
    this.weapon = weapon;
    this.ammo = weapon.magSize;
  }

  reset(weapon: AIWeapon, grenades: number): void {
    this.weapon = weapon;
    this.ammo = weapon.magSize;
    this.grenades = grenades;
    this.reloading = false;
    this.reloadProgress = -1;
    this.burst = 0;
    this.shotsFired = 0;
    this.engagementStart = -1;
    this.nextShotAt = 0;
    this.nextBurstAt = 0;
    this.grenadeReadyAt = 0;
    this.grenadeThrowAt = -1;
    this.errorOffset.set(0, 0, 0);
    this.residualSpread = 0;
    this.converged = 0;
    this.lastShotAt = -100;
    // Zero means "unset", which makes the next tick snap the aim to wherever this
    // body is looking instead of dragging it in from the previous owner's target.
    this.aimPoint.set(0, 0, 0);
    this.aimGoal.set(0, 0, 0);
    this.errorResampleAt = 0;
  }

  get magFraction(): number {
    return this.ammo / Math.max(1, this.weapon.magSize);
  }

  get empty(): boolean {
    return this.ammo <= 0;
  }

  /** True when a lull is a good moment to top up. */
  get wantsReload(): boolean {
    return !this.reloading && this.magFraction <= FIGHT.tacticalReloadFraction;
  }

  /** 0..1 how close the aim is to the target. 1 means a shot is worth taking. */
  get aimQuality(): number {
    return this.converged;
  }

  beginReload(bb: Blackboard, self: Enemy): void {
    if (this.reloading) return;
    this.reloading = true;
    this.reloadDuration = this.weapon.reloadTime;
    this.reloadEndAt = bb.now + this.reloadDuration;
    this.reloadProgress = 0;
    this.burst = 0;
    bb.play(SFX.magOut, self.feet, 0.6, 1);
    self.say(bb, VOICE.reloading, 0.85);
  }

  private finishReload(bb: Blackboard, self: Enemy): void {
    this.reloading = false;
    this.reloadProgress = -1;
    this.ammo = this.weapon.magSize;
    this.nextBurstAt = bb.now + 0.18;
    bb.play(SFX.reload, self.feet, 0.7, 1);
  }

  /**
   * Advances the aim and, when everything lines up, fires.
   *
   * `allowFire` is the behaviour layer's veto: a suppressed agent, one in transit
   * to cover, or one that has not been told to engage yet still tracks the target
   * with its weapon, which is what makes an enemy look like it is paying attention
   * even when it is not shooting.
   */
  update(dt: number, bb: Blackboard, self: Enemy, allowFire: boolean): void {
    this.firedThisFrame = false;
    const now = bb.now;

    if (this.reloading) {
      this.reloadProgress = saturate(1 - (this.reloadEndAt - now) / Math.max(0.05, this.reloadDuration));
      if (now >= this.reloadEndAt) this.finishReload(bb, self);
    }

    const perception = self.perception;
    const target = bb.target;
    const engaged = perception.engaged && target.alive;

    if (!engaged) {
      if (this.engagementStart >= 0 && now - perception.lastSeenAt > 4) this.engagementStart = -1;
    } else if (this.engagementStart < 0) {
      this.engagementStart = perception.acquiredAt >= 0 ? perception.acquiredAt : now;
    }

    this.trackAim(dt, bb, self);

    if (!allowFire || this.reloading || !engaged) return;
    if (this.ammo <= 0) return;
    if (now < this.readyAt(bb, self)) return;

    const distance = perception.distance;
    if (distance > self.archetype.maxRange) return;

    // Blind fire: keep a target pinned for a moment after losing sight of them,
    // and let a suppressor spend rounds on a position rather than a person.
    const blind = !perception.visible;
    if (blind) {
      const since = perception.timeSinceSeen(now);
      const willing =
        since < FIGHT.blindFireWindow ||
        (self.archetype.suppressiveFire > 0.5 && since < 2.6 && this.magFraction > 0.3);
      if (!willing) return;
    }

    if (this.burst > 0) {
      if (now >= this.nextShotAt) this.fire(bb, self);
      return;
    }
    if (now < this.nextBurstAt) return;
    // Do not open up until the aim has at least roughly arrived, or a rusher
    // sprinting into a room would spray at the ceiling.
    if (this.converged < 0.42 && !blind) return;

    const archetype = self.archetype;
    this.burst = Math.max(1, Math.round(bb.rng.range(archetype.burstMin, archetype.burstMax + 0.49)));
    if (this.burst > this.ammo) this.burst = this.ammo;
    this.nextShotAt = now;
    this.fire(bb, self);
  }

  private readyAt(bb: Blackboard, self: Enemy): number {
    const start = this.engagementStart;
    if (start < 0) return Infinity;
    return start + bb.difficulty.reactionTime * self.archetype.reactionScale;
  }

  /**
   * Moves the aim point. Runs whether or not the agent is allowed to shoot, so a
   * weapon is always pointing somewhere deliberate.
   */
  private trackAim(dt: number, bb: Blackboard, self: Enemy): void {
    const perception = self.perception;
    const target = bb.target;
    const now = bb.now;

    if (perception.visible && target.alive) {
      // Centre of mass, plus a little lead so a strafing player is not free.
      const height = Math.max(0.9, target.height);
      this.aimGoal.set(target.feet.x, target.feet.y + height * 0.6, target.feet.z);
      const lead = FIGHT.leadFraction * clamp(0.08 + perception.distance / 420, 0.08, 0.32);
      this.aimGoal.x += target.velocity.x * lead;
      this.aimGoal.z += target.velocity.z * lead;
    } else if (perception.everSeen) {
      perception.bestGuess(bb, this.scratchA);
      this.aimGoal.set(this.scratchA.x, this.scratchA.y + 1.05, this.scratchA.z);
    } else if (perception.investigate) {
      this.aimGoal.set(
        perception.investigate.x,
        perception.investigate.y + 1.2,
        perception.investigate.z,
      );
    } else {
      // Nothing to aim at: look down the body's facing at a middle distance so the
      // weapon does not point at the floor.
      this.aimGoal.set(
        self.feet.x - Math.sin(self.bodyYaw) * 14,
        self.feet.y + 1.5,
        self.feet.z - Math.cos(self.bodyYaw) * 14,
      );
    }

    // Persistent offset, resampled on a timer rather than per shot.
    if (now >= this.errorResampleAt) {
      this.errorResampleAt = now + bb.rng.range(FIGHT.errorResampleMin, FIGHT.errorResampleMax);
      const spread = this.errorRadians(bb, self);
      const aimCone = Math.min(spread, MAX_AIM_CONE);
      this.residualSpread = spread - aimCone;
      // Measured to the goal rather than taken from perception: the goal is always
      // a real point, whereas the sighting distance is stale between perception
      // ticks and unknown before the first one.
      this.direction.subVectors(this.aimGoal, self.eye(this.scratchB));
      const range = this.direction.length();
      const reach = clamp(range, 2, SIGHT.maxRange);
      const radius = Math.tan(aimCone) * reach;
      // Sample in the plane normal to the line of fire.
      if (range > 1e-4) this.direction.multiplyScalar(1 / range);
      else this.direction.set(0, 0, -1);
      pickPerpendiculars(this.direction, this.perpA, this.perpB);
      const a = bb.rng.gaussian(0, 0.5);
      const b = bb.rng.gaussian(0, 0.5);
      this.errorOffset
        .copy(this.perpA)
        .multiplyScalar(a * radius)
        .addScaledVector(this.perpB, b * radius);
      // Bias the vertical component down: shooting over someone's head is more
      // forgiving to the player and more plausible than shooting under them.
      this.errorOffset.y -= radius * 0.18;
      // A gaussian has no worst case of its own, and one three-sigma sample is
      // enough to swing the weapon somewhere absurd for the third of a second
      // this offset is held.
      const bound = Math.tan(MAX_AIM_CONE) * reach;
      if (this.errorOffset.lengthSq() > bound * bound) this.errorOffset.setLength(bound);
    }

    this.scratchA.copy(this.aimGoal).add(this.errorOffset);
    if (!finite(this.scratchA)) this.scratchA.copy(this.aimGoal);

    const converge =
      bb.difficulty.aimConverge / Math.max(0.45, self.archetype.aimErrorScale) *
      (self.suppression > 0.4 ? 0.4 : 1);
    // The aim point drives the whole upper body through the animator, so it is
    // never allowed to be unset or non-finite: one bad value would otherwise stick
    // for the agent's lifetime, because every blend from it stays bad.
    if (this.aimPoint.lengthSq() < 1e-6 || !finite(this.aimPoint)) this.aimPoint.copy(this.scratchA);
    else {
      const f = Math.exp(-converge * dt);
      this.aimPoint.x = this.scratchA.x + (this.aimPoint.x - this.scratchA.x) * f;
      this.aimPoint.y = this.scratchA.y + (this.aimPoint.y - this.scratchA.y) * f;
      this.aimPoint.z = this.scratchA.z + (this.aimPoint.z - this.scratchA.z) * f;
    }

    // Convergence measured as an angle, not a distance, so it means the same thing
    // at five metres and fifty.
    self.eye(this.scratchB);
    const distance = Math.max(1, this.aimGoal.distanceTo(this.scratchB));
    const miss = this.aimPoint.distanceTo(this.aimGoal);
    this.converged = damp(this.converged, saturate(1 - miss / (distance * 0.09)), 12, dt);
  }

  /** Total aim error, in radians of cone half-angle. */
  private errorRadians(bb: Blackboard, self: Enemy): number {
    let degrees = bb.difficulty.aimErrorDeg * self.archetype.aimErrorScale;
    const now = bb.now;
    if (this.engagementStart >= 0) {
      const age = now - this.engagementStart;
      if (age < FIGHT.firstShotDecay) {
        const t = 1 - age / FIGHT.firstShotDecay;
        degrees *= 1 + (FIGHT.firstShotPenalty - 1) * t * t;
      }
    }
    if (self.locomotion.velocity.lengthSq() > 1.4) degrees *= FIGHT.movingErrorScale;
    if (self.suppression > 0.1) {
      degrees *= 1 + (FIGHT.suppressedErrorScale - 1) * saturate(self.suppression / FIGHT.maxSuppression);
    }
    if (!self.perception.visible) degrees *= 2.6;
    if (self.stance === 'crouch') degrees *= 0.82;
    // Without an engagement token this man is laying rounds down the street, not
    // trying to put them through anybody. The director decides who holds one.
    if (!self.focused) degrees *= FIGHT.unfocusedErrorScale;
    return degrees * DEG2RAD;
  }

  // -------------------------------------------------------------------------
  // The shot
  // -------------------------------------------------------------------------

  private fire(bb: Blackboard, self: Enemy): void {
    const weapon = this.weapon;
    const now = bb.now;
    this.burst--;
    this.ammo--;
    this.shotsFired++;
    this.firedThisFrame = true;
    this.lastShotAt = now;
    this.nextShotAt = now + weapon.shotInterval;
    if (this.burst <= 0 || this.ammo <= 0) {
      const archetype = self.archetype;
      const pause =
        (archetype.burstPause + bb.rng.range(0, archetype.burstPauseJitter)) *
        bb.difficulty.burstPauseScale;
      this.nextBurstAt = now + pause;
      this.burst = 0;
    }

    const animator = self.animator;
    const origin = animator.muzzle;
    this.direction.subVectors(this.aimPoint, origin);
    if (this.direction.lengthSq() < 1e-6) this.direction.set(0, 0, -1);
    this.direction.normalize();

    animator.notifyShot(clamp(0.45 + weapon.impulse * 0.012, 0.4, 1.5));

    const combat = bb.combat;
    const pellets = Math.max(1, weapon.pellets);
    // The aim error the pose refused to show is spent here instead.
    const cone = weapon.spreadDeg * DEG2RAD + this.residualSpread;
    let result: HitResult | null = null;
    for (let p = 0; p < pellets; p++) {
      this.scratchA.copy(this.direction);
      if (cone > 0) {
        pickPerpendiculars(this.scratchA, this.perpA, this.perpB);
        const angle = bb.rng.range(0, Math.PI * 2);
        const spread = Math.tan(cone) * Math.sqrt(bb.rng.next());
        this.scratchA
          .addScaledVector(this.perpA, Math.cos(angle) * spread)
          .addScaledVector(this.perpB, Math.sin(angle) * spread)
          .normalize();
      }
      const tracer = weapon.tracerEvery > 0 && this.tracerCounter++ % weapon.tracerEvery === 0;
      if (combat) {
        const hit = combat.fireBullet({
          origin,
          direction: this.scratchA,
          damage: weapon.damage * bb.difficulty.damageScale,
          falloffStart: weapon.falloffStart,
          falloffEnd: weapon.falloffEnd,
          minDamageScale: weapon.minDamageScale,
          penetrationPower: weapon.penetrationPower,
          attacker: self,
          weaponId: weapon.id,
          tracer,
          tracerColor: weapon.tracerColor,
          impulse: weapon.impulse,
        });
        if (hit && !result) result = hit;
      }
    }

    this.present(bb, self, origin);
  }

  /** Muzzle flash, dynamic light, report and shell. Enemy fire has to be loud. */
  private present(bb: Blackboard, self: Enemy, origin: THREE.Vector3): void {
    const weapon = this.weapon;
    bb.fx?.muzzleFlash(origin, this.direction, weapon.flashScale, weapon.suppressed, false);
    if (!weapon.suppressed) {
      bb.render?.requestDynamicLight(
        origin,
        0xffb257,
        14 * weapon.flashScale,
        7.5 * weapon.flashScale,
        0.055,
      );
    }
    bb.audio?.gunshot(`weapon_fire_${weapon.id}`, origin, weapon.suppressed, false);

    if (bb.fx) {
      const holder = self.model?.weaponHolder;
      if (holder) {
        this.scratchB.copy(self.animator.muzzleDir).multiplyScalar(-1);
        this.scratchB.x += bb.rng.range(-0.6, 0.6);
        this.scratchB.y += bb.rng.range(0.9, 1.7);
        this.scratchB.z += bb.rng.range(-0.6, 0.6);
        this.scratchA.copy(origin).addScaledVector(self.animator.muzzleDir, -0.34);
        this.scratchA.y += 0.12;
        bb.fx.shellEject(this.scratchA, this.scratchB.multiplyScalar(1.7), weapon.caliber, false);
      }
    }
  }

  // -------------------------------------------------------------------------
  // Grenades
  // -------------------------------------------------------------------------

  /** True when lobbing one now is both useful and fair. */
  wantsGrenade(bb: Blackboard, self: Enemy): boolean {
    if (this.grenades <= 0 || this.grenadeThrowAt >= 0) return false;
    if (bb.now < this.grenadeReadyAt) return false;
    if (!self.perception.everSeen) return false;
    const distance = self.perception.distance;
    if (distance < FIGHT.grenadeMinRange || distance > FIGHT.grenadeMaxRange) return false;
    // The point of a grenade is a target who will not move. Someone who is moving
    // is already solving the AI's problem for it.
    if (bb.target.stationaryTime < FIGHT.grenadeStaticTime) return false;
    if (self.perception.visible && self.perception.visibility > 0.66) return false;
    return bb.rng.next() < bb.difficulty.grenadeChance;
  }

  /** Starts the telegraph. The throw itself happens after the shout. */
  beginGrenade(bb: Blackboard, self: Enemy): void {
    this.grenadeThrowAt = bb.now + FIGHT.grenadeTelegraph;
    self.perception.bestGuess(bb, this.grenadeTarget);
    self.say(bb, VOICE.grenade, 1);
    bb.play(SFX.grenadePin, self.feet, 0.8, 1);
  }

  /** Completes a pending throw. Returns true on the frame the grenade leaves. */
  tickGrenade(bb: Blackboard, self: Enemy): boolean {
    if (this.grenadeThrowAt < 0 || bb.now < this.grenadeThrowAt) return false;
    this.grenadeThrowAt = -1;
    this.grenadeReadyAt = bb.now + FIGHT.grenadeCooldown;
    this.grenades--;
    self.eye(this.scratchA);
    this.scratchA.y += 0.12;
    if (bb.grenades.throwAt(this.scratchA, this.grenadeTarget, self, bb)) return true;
    // Bad arc: keep the grenade, try again later.
    this.grenades++;
    this.grenadeReadyAt = bb.now + 3;
    return false;
  }

  get throwPending(): boolean {
    return this.grenadeThrowAt >= 0;
  }

  /** True when the agent should stay put rather than shoot: the aim is hopeless. */
  hopeless(bb: Blackboard, self: Enemy): boolean {
    return (
      self.perception.awareness < SIGHT.engageThreshold * 0.55 &&
      self.perception.timeSinceSeen(bb.now) > 6
    );
  }
}

const TMP_UP = /* @__PURE__ */ new THREE.Vector3(0, 1, 0);
const TMP_SIDE = /* @__PURE__ */ new THREE.Vector3(1, 0, 0);

const finite = (v: THREE.Vector3): boolean =>
  Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.z);

/** Two unit vectors spanning the plane normal to `dir`. */
function pickPerpendiculars(dir: THREE.Vector3, a: THREE.Vector3, b: THREE.Vector3): void {
  const reference = Math.abs(dir.y) > 0.95 ? TMP_SIDE : TMP_UP;
  a.crossVectors(dir, reference);
  if (a.lengthSq() < 1e-8) a.set(1, 0, 0);
  a.normalize();
  b.crossVectors(dir, a).normalize();
}
