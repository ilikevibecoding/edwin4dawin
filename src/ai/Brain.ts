import * as THREE from 'three';
import { clamp, saturate } from '../core/MathUtils';
import {
  Action,
  BehaviorTree,
  Condition,
  Cooldown,
  FAILURE,
  Guard,
  RUNNING,
  SUCCESS,
  Selector,
  Sequence,
  Timeout,
  type Status,
} from './Behavior';
import type { Agent } from './Agent';
import { STANCE_CROUCH, STANCE_PRONE, STANCE_STAND } from './SoldierRig';
import { ROLE_FLANK, ROLE_HOLD, ROLE_SUPPRESS } from './Squad';
import { AI } from './Tuning';

/**
 * The soldier's behaviour, as a priority tree read top to bottom.
 *
 * Every branch below is a claim about what should beat what. Fleeing beats
 * fighting; an empty magazine beats a target; being pinned beats a plan; a
 * grenade beats walking into a room you cannot see into. Reading the root
 * selector's children in order is reading the whole doctrine, and moving a
 * behaviour up or down the list is the entire mechanism for changing it — which
 * is the reason for a tree rather than eleven states and their transitions.
 *
 * Two structural details do real work. `Guard` aborts its child the instant its
 * condition stops holding, so an agent who loses his contact mid-approach drops
 * the claim on the cover point he was walking to rather than arriving at a
 * position that no longer means anything. And `Cooldown` is a decorator rather
 * than a field on the agent, so "not more than one grenade every so often" is
 * visible in the shape of the tree instead of buried in a method.
 */

const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _cover = new THREE.Vector3();

/* ------------------------------- conditions ------------------------------- */

const engaged = (a: Agent): boolean => a.perception.engaged && a.perception.lastKnownAge < 12;

const suspicious = (a: Agent): boolean =>
  a.perception.alerted && a.perception.lastKnownAge < 22 && !a.perception.investigated;

const shouldFlee = (a: Agent): boolean => {
  if (a.health > a.profile.fleeHealth * AI.maxHealth) return false;
  // A wounded man with friends still standing fights; alone, he runs.
  const mates = a.squad ? a.squad.aliveCount : 1;
  return mates <= 1 || a.health < a.profile.fleeHealth * AI.maxHealth * 0.5;
};

const needsReload = (a: Agent): boolean => {
  if (a.magazine <= 0) return true;
  // Top up in the lull rather than in the middle of a burst.
  return a.magazine < 9 && (!a.perception.visible || a.perception.lastKnownAge > 1.4);
};

const pinnedInCover = (a: Agent): boolean => a.pinned;

const shouldGrenade = (a: Agent): boolean => {
  if (!a.canThrowGrenade(a.believed)) return false;
  // Grenades are for a target you cannot shoot: one you have lost behind
  // something, or one that has not moved in a while.
  const stationary = a.perception.lastKnownVel.lengthSq() < 1.4;
  const hidden = !a.perception.visible && a.perception.lastKnownAge < 5;
  if (!stationary && !hidden) return false;
  return a.rng.next() < 0.35 + a.profile.aggression * 0.5;
};

const tooFarToFight = (a: Agent): boolean =>
  a.believed.distanceTo(a.position) > AI.maxEngageRange ||
  (!a.perception.visible && a.perception.lastKnownAge > 2.2);

const wantsFlank = (a: Agent): boolean => {
  if (a.role !== ROLE_FLANK || !a.squad) return false;
  // Only worth it while somebody else is holding the target's attention.
  for (const m of a.squad.members) {
    if (m !== a && m.alive && m.role === ROLE_SUPPRESS && m.perception.visible) return true;
  }
  return false;
};

/* --------------------------------- actions -------------------------------- */

/**
 * Faces the belief, shoots when there is a line and the reaction has elapsed.
 *
 * Every combat action goes through here, and the reason is the first line: the
 * soldier watches where he thinks you are whether or not he can currently see
 * you. Aiming only at a target already visible sounds equivalent and is not —
 * the vision cone is measured off this facing, so an agent who only looks at
 * what he can see can never acquire anything he cannot, and a man with a
 * radioed contact twenty metres away will walk to cover staring at the horizon
 * he spawned facing.
 */
function engageFrom(a: Agent, allowFire: boolean): void {
  a.aiming = true;
  a.lookWeight = 1;
  a.aimPoint.copy(a.believed);
  if (!allowFire || !a.perception.visible || a.reaction > 0 || a.reloading) {
    a.holdFire();
    return;
  }
  a.fireAt(a.believed);
}

const flee = new Action<Agent>('flee', (a, dt) => {
  a.stance = STANCE_STAND;
  a.holdFire();
  a.aiming = false;
  a.lookWeight = 0.4;
  if (!a.hasGoal || a.arrived || a.pathFailed) {
    // Away from the threat, as far as the map allows, in one hop.
    _v.copy(a.position).sub(a.believed);
    _v.y = 0;
    if (_v.lengthSq() < 1e-4) _v.set(1, 0, 0);
    _v.normalize().multiplyScalar(16 + a.rng.next() * 8);
    _v.add(a.position);
    _v.y = a.position.y;
    a.pathTo(_v, AI.sprintSpeed, 1.4);
  }
  void dt;
  return RUNNING;
});

const reload = new Action<Agent>(
  'reload',
  (a) => {
    if (!a.reloading && !a.startReload() && a.magazine > 0) return SUCCESS;
    a.holdFire();
    a.aiming = false;
    // Duck behind whatever is there while the magazine changes.
    if (a.inCover || a.coverIndex >= 0) a.stance = a.coverIsLow() ? STANCE_CROUCH : STANCE_STAND;
    if (a.coverIndex >= 0 && !a.atCover() && a.coverPosition(_cover)) {
      a.pathTo(_cover, AI.runSpeed, 0.5);
    } else {
      a.stop();
    }
    return a.reloading ? RUNNING : SUCCESS;
  },
  (a) => a.stop(),
);

const duck = new Action<Agent>('pinned', (a, dt) => {
  a.holdFire();
  a.aiming = false;
  a.lookWeight = 0.7;
  a.stop();
  a.peekTime = 0;
  a.duckTimer += dt;
  a.stance = a.coverIsLow() || !a.inCover ? STANCE_CROUCH : STANCE_STAND;
  // Blind fire over the top once the worst of it passes; it keeps the player
  // honest and it is what makes suppression feel two-way.
  if (a.suppression < AI.suppressPinned * 1.15 && a.duckTimer > 0.8 && a.magazine > 3) {
    a.aimPoint.copy(a.believed);
    a.aimPoint.y += 0.9;
    a.fireAt(a.aimPoint);
  }
  return a.pinned ? RUNNING : SUCCESS;
});

const grenade = new Action<Agent>('grenade', (a, dt) => {
  a.stop();
  a.holdFire();
  a.aiming = false;
  a.stance = STANCE_STAND;
  if (a.grenadeThrow < 0) {
    // Aim for the ground beside the target, which is how a real throw flushes
    // somebody out rather than bouncing off the wall they are behind.
    _v.copy(a.believed);
    _v.y -= 1.05;
    a.startGrenade(_v);
    return RUNNING;
  }
  _v.copy(a.believed);
  _v.y -= 1.05;
  return a.tickGrenade(dt, _v) ? SUCCESS : RUNNING;
});

const flank = new Action<Agent>(
  'flank',
  (a) => {
    a.stance = STANCE_STAND;
    engageFrom(a, true);

    if (!a.takeCover(a.believed, a.flankSide)) return FAILURE;
    if (!a.coverPosition(_cover)) return FAILURE;
    if (a.atCover()) return SUCCESS;
    a.pathTo(_cover, AI.runSpeed, 0.5);
    if (a.pathFailed) {
      // Let the point go, exactly as `to-cover` does. Failing without releasing
      // is worse here than it looks: the claim is refreshed for as long as the
      // agent holds the index, `takeCover` keeps handing the same still-valid
      // point back, and a wall on the far side of a fence stays reserved for a
      // man who will never reach it while the rest of the squad is told it is
      // taken.
      a.releaseCover();
      return FAILURE;
    }
    return RUNNING;
  },
  (a) => a.stop(),
);

const advance = new Action<Agent>(
  'advance',
  (a) => {
    a.stance = STANCE_STAND;
    engageFrom(a, a.believed.distanceTo(a.position) < AI.maxEngageRange);
    _v.copy(a.believed);
    _v.y -= 1.05;
    a.pathTo(_v, AI.runSpeed, 3.2);
    if (a.arrived) return SUCCESS;
    return a.pathFailed ? FAILURE : RUNNING;
  },
  (a) => a.stop(),
);

const moveToCover = new Action<Agent>(
  'to-cover',
  (a) => {
    if (!a.takeCover(a.believed, 0)) return FAILURE;
    if (!a.coverPosition(_cover)) return FAILURE;
    if (a.atCover()) {
      a.inCover = true;
      a.stop();
      return SUCCESS;
    }
    a.inCover = false;
    a.stance = STANCE_STAND;
    // Shoot on the move when there is a line; a squad that only fires from
    // cover reads as a firing range.
    engageFrom(a, a.rng.next() < 0.55);
    a.pathTo(_cover, AI.runSpeed, 0.45);
    if (a.pathFailed) {
      // Nothing wrong with the position except that he cannot get to it.
      // Letting go of the claim is what makes the next scoring pass pick
      // somewhere else instead of walking into the same fence forever.
      a.releaseCover();
      return FAILURE;
    }
    return RUNNING;
  },
  (a) => {
    a.stop();
    a.inCover = false;
  },
);

/**
 * The peek cycle. Out, a burst, back in — with the time spent exposed capped by
 * difficulty, so a veteran holds an angle longer than a recruit does. The
 * player's counterplay is the whole point: an enemy who never breaks contact
 * cannot be flanked, and one who is always behind the wall cannot be shot.
 */
const peekFire = new Action<Agent>(
  'peek-fire',
  (a, dt) => {
    if (!a.atCover()) {
      a.inCover = false;
      return FAILURE;
    }
    a.inCover = true;
    a.stop();
    a.lookWeight = 1;
    a.stance = a.coverIsLow() ? STANCE_CROUCH : STANCE_STAND;

    const exposed = a.peekTime > 0;
    if (exposed) {
      a.peekTime += dt;
      a.aiming = true;
      engageFrom(a, true);
      const limit = a.profile.peekDuration * (a.suppression > 0.35 ? 0.55 : 1);
      if (a.peekTime > limit || a.magazine <= 0 || a.suppression > 0.55) {
        a.peekTime = 0;
        a.duckTimer = 0;
      }
    } else {
      a.duckTimer += dt;
      a.aiming = false;
      a.holdFire();
      a.aimPoint.copy(a.believed);
      // The pause before coming back out is where aggression lives.
      const wait = 0.55 + (1 - a.profile.aggression) * 1.4 + a.suppression * 1.6;
      if (a.duckTimer > wait) {
        a.peekTime = 1e-4;
        a.duckTimer = 0;
        // Lean out of the side the target is not on, so the wall stays between.
        _v.copy(a.believed).sub(a.position);
        a.coverSide = _v.x * Math.cos(a.heading) - _v.z * Math.sin(a.heading) > 0 ? 1 : -1;
      }
    }
    return RUNNING;
  },
  (a) => {
    a.peekTime = 0;
    a.inCover = false;
  },
);

/** No cover to be had: stand, shoot, and shuffle so as not to be a statue. */
const standAndFight = new Action<Agent>(
  'stand-fight',
  (a, dt) => {
    a.stance = a.role === ROLE_HOLD ? STANCE_CROUCH : STANCE_STAND;
    engageFrom(a, true);

    a.strafeTimer -= dt;
    if (a.strafeTimer <= 0) {
      a.strafeTimer = 1.2 + a.rng.next() * 1.6;
      a.strafeSign = -a.strafeSign;
    }
    // Sidestep across the target's front, which keeps the silhouette moving
    // without closing the distance.
    _v.copy(a.believed).sub(a.position);
    _v.y = 0;
    const len = _v.length();
    if (len > 1e-3 && a.perception.visible) {
      _v2.set(-_v.z / len, 0, _v.x / len).multiplyScalar(a.strafeSign * 2.6);
      _v2.add(a.position);
      // Close a little if the target is a long way off.
      if (len > AI.preferredRangeMax) _v2.addScaledVector(_v.multiplyScalar(1 / len), 3.5);
      a.pathTo(_v2, AI.runSpeed * 0.7, 0.8);
    } else {
      a.stop();
    }
    return RUNNING;
  },
  (a) => a.stop(),
);

const investigate = new Action<Agent>(
  'investigate',
  (a) => {
    a.stance = STANCE_STAND;
    a.aiming = true;
    a.lookWeight = 1;
    a.holdFire();
    _v.copy(a.perception.lastKnown);
    a.aimPoint.copy(_v);
    a.aimPoint.y += 1.2;
    a.pathTo(_v, AI.walkSpeed * 1.8, 1.5);
    if (a.arrived || a.pathFailed) return SUCCESS;
    return RUNNING;
  },
  (a) => a.stop(),
);

const lookAround = new Action<Agent>('search', (a, dt) => {
  a.stop();
  a.aiming = true;
  a.lookWeight = 1;
  a.lookTimer += dt;
  // Sweep the muzzle across the area rather than standing to attention.
  const sweep = Math.sin(a.lookTimer * 1.35) * 1.15;
  _v.set(Math.sin(a.heading + sweep), 0, Math.cos(a.heading + sweep)).multiplyScalar(9);
  _v.add(a.position);
  _v.y = a.position.y + 1.4;
  a.aimPoint.copy(_v);
  if (a.lookTimer > 3.6) {
    a.lookTimer = 0;
    a.perception.investigated = true;
    return SUCCESS;
  }
  return RUNNING;
});

const patrol = new Action<Agent>('patrol', (a, dt) => {
  a.stance = STANCE_STAND;
  a.aiming = false;
  a.lookWeight = 0.55;
  a.holdFire();
  a.patrolTimer -= dt;

  if (a.patrolTimer <= 0 && (!a.hasGoal || a.arrived || a.pathFailed)) {
    a.patrolTimer = 4 + a.rng.next() * 7;
    if (a.rng.next() < 0.45) {
      a.stop();
    } else {
      const angle = a.rng.next() * Math.PI * 2;
      const radius = 3 + a.rng.next() * 9;
      _v.set(
        a.anchor.x + Math.cos(angle) * radius,
        a.anchor.y,
        a.anchor.z + Math.sin(angle) * radius,
      );
      a.pathTo(_v, AI.walkSpeed, 1.2);
    }
  }

  // Idle look: slow scan, so a sentry reads as awake.
  const sweep = Math.sin(a.patrolTimer * 0.55) * 0.9;
  _v.set(Math.sin(a.heading + sweep), 0, Math.cos(a.heading + sweep)).multiplyScalar(12);
  _v.add(a.position);
  _v.y = a.position.y + 1.5;
  a.aimPoint.copy(_v);
  return RUNNING;
});

/** Alerted but with nothing to go and look at: turn toward it and ready up. */
const alertHold = new Action<Agent>('alert', (a, dt) => {
  a.stop();
  a.stance = STANCE_STAND;
  a.aiming = true;
  a.lookWeight = 1;
  a.holdFire();
  a.aimPoint.copy(a.perception.lastKnown);
  a.aimPoint.y += 1.2;
  a.lookTimer += dt;
  return a.lookTimer > 2.5 ? SUCCESS : RUNNING;
});

/* ---------------------------------- tree ---------------------------------- */

function combat(): Selector<Agent> {
  return new Selector<Agent>('combat', [
    new Sequence<Agent>('rearm', [new Condition<Agent>('empty?', needsReload), reload]),
    new Sequence<Agent>('suppressed', [new Condition<Agent>('pinned?', pinnedInCover), duck]),
    new Cooldown<Agent>(
      'grenade-cd',
      (a) => a.profile.grenadeCooldown * 0.5,
      new Sequence<Agent>('frag', [new Condition<Agent>('flush?', shouldGrenade), grenade]),
    ),
    new Guard<Agent>('flanking', wantsFlank, new Timeout<Agent>('flank-t', 9, flank)),
    new Sequence<Agent>('close', [new Condition<Agent>('far?', tooFarToFight), advance]),
    new Sequence<Agent>('use-cover', [moveToCover, peekFire]),
    standAndFight,
  ]);
}

export function buildBrain(): BehaviorTree<Agent> {
  const root = new Selector<Agent>('root', [
    new Sequence<Agent>('retreat', [new Condition<Agent>('hurt?', shouldFlee), flee]),
    new Guard<Agent>('fight', engaged, combat()),
    new Guard<Agent>(
      'check',
      suspicious,
      new Sequence<Agent>('investigate-seq', [investigate, lookAround]),
    ),
    new Guard<Agent>('startle', (a) => a.perception.alerted, alertHold),
    patrol,
  ]);
  return new BehaviorTree<Agent>(root);
}

/**
 * Reaction time, applied when a contact first becomes real. Being flanked costs
 * extra, which is the mechanical expression of "he did not see you coming".
 */
export function reactionFor(a: Agent, contactDirection: THREE.Vector3): number {
  const p = a.profile;
  _v.set(Math.sin(a.heading), 0, Math.cos(a.heading));
  const dot = clamp(_v.x * contactDirection.x + _v.z * contactDirection.z, -1, 1);
  const behind = saturate((0.2 - dot) / 1.2);
  return p.reactionTime + behind * p.reactionPenaltyFlank;
}

export { STANCE_STAND, STANCE_CROUCH, STANCE_PRONE };
