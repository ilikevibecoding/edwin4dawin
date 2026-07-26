import * as THREE from 'three';
import { rand, randRange, randInt, randSpread } from '../core/rand.js';

/**
 * Combat behavior for one enemy: perception, state transitions, movement
 * goals and fire control. Pure logic — physical acts (moving, shooting,
 * animating) live in enemy.js.
 *
 * States: patrol | hunt | combat | cover | flank | suppressed | dead
 */

export const SIGHT_RANGE = 65;
export const SIGHT_COS = Math.cos(THREE.MathUtils.degToRad(60)); // 120° full cone
export const HEAR_RANGE = 30;

const _a = new THREE.Vector3();
const _b = new THREE.Vector3();

export function wrapAngle(a) {
  return ((a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
}

/** Update canSee / lastKnown / awareness timers. */
export function perceive(e, dt) {
  const { player, world } = e.game;
  const wasSeen = e.canSee;
  e.canSee = false;
  if (player.alive) {
    const pEye = player.eyePos();
    const dx = pEye.x - e.position.x, dz = pEye.z - e.position.z;
    const dist = Math.hypot(dx, dz);
    e.playerDist = dist;
    if (dist < SIGHT_RANGE) {
      // vision cone relative to body yaw; once alerted they track all around
      const fwdDot = (dx * Math.sin(e.yaw) + dz * Math.cos(e.yaw)) / Math.max(dist, 1e-4);
      const alerted = e.awareT < 3.0;
      if ((fwdDot > SIGHT_COS || alerted || dist < 4) &&
          world.colliders.clearLine(e.eyePos(_a), pEye)) {
        e.canSee = true;
      }
    }
  } else {
    e.playerDist = 999;
  }

  if (e.canSee) {
    // reaction delay before the first shot of a (re)acquisition
    if (!wasSeen && (!e.hadContact || e.awareT > 3.5)) {
      e.reactionT = e.hadContact ? randRange(0.18, 0.35) : randRange(0.25, 0.5);
    }
    e.hadContact = true;
    e.awareT = 0;
    if (!e.lastKnown) e.lastKnown = new THREE.Vector3();
    e.lastKnown.copy(player.position);
  } else {
    e.awareT += dt;
  }
  if (e.canSee && e.reactionT > 0) e.reactionT -= dt;
}

/** Chance a fired round connects — the knob that makes fights fair. */
export function hitChance(e, dist) {
  const p = e.game.player;
  let c = 0.32 + 0.36 * Math.min(1, e.engageT / 4.5); // aim settles the longer they engage
  c *= 1 - THREE.MathUtils.clamp((dist - 10) / 75, 0, 0.72);
  const ps = p.planarSpeed ? p.planarSpeed() : 0;
  if (!p.onGround) c *= 0.45;
  else if (ps > 4.5) c *= 0.55;
  else if (ps > 1.5) c *= 0.72;
  if (p.aiming) c *= 1.12;      // ADS = slow/stationary target
  if (p.crouching) c *= 0.85;
  if (p.sliding) c *= 0.5;
  if (e.suppressT > 0) c *= 0.5;
  return THREE.MathUtils.clamp(c, 0.04, 0.82);
}

/** Sample a nearby navgrid point that breaks LOS to the player. */
export function findCoverPoint(e) {
  const { world, player } = e.game;
  const pEye = player.eyePos();
  let best = null, bestScore = -Infinity;
  for (let i = 0; i < 16; i++) {
    const a = rand() * Math.PI * 2;
    const r = randRange(4.5, 15);
    const x = e.position.x + Math.sin(a) * r;
    const z = e.position.z + Math.cos(a) * r;
    if (!world.navgrid.isWalkable(x, z)) continue;
    const dPlayer = Math.hypot(x - player.position.x, z - player.position.z);
    if (dPlayer < 7) continue;
    const hidden = !world.colliders.clearLine(pEye, _b.set(x, 1.35, z));
    const score = (hidden ? 10 : 0) - r * 0.12 + Math.min(dPlayer, 26) * 0.05 + rand();
    if (score > bestScore) { bestScore = score; best = new THREE.Vector3(x, 0, z); }
  }
  return best;
}

/** Point ~100-140° around the player at mid range. */
export function findFlankPoint(e) {
  const { player, world } = e.game;
  const baseA = Math.atan2(e.position.x - player.position.x, e.position.z - player.position.z);
  const a = baseA + (rand() < 0.5 ? 1 : -1) * randRange(1.7, 2.4);
  const r = randRange(11, 19);
  return world.navgrid.nearestWalkable(
    player.position.x + Math.sin(a) * r,
    player.position.z + Math.cos(a) * r
  );
}

function setGoal(e, goal) {
  if (!goal) return false;
  e.path = e.game.world.navgrid.findPath(e.position, goal);
  e.pathIdx = 0;
  return !!e.path;
}

function enterCombat(e) {
  e.state = 'combat';
  e.stateT = 0;
  e.holdT = 0;
  e.repathT = randRange(0.4, 1.2);
  e.sys.alertSquadAround(e);
}

/** Full per-frame decision step. */
export function think(e, dt) {
  const { player, world } = e.game;
  e.stateT += dt;
  if (e.suppressT > 0) e.suppressT -= dt;

  // --- dev-forced states (screenshot harness) -----------------------------
  if (e.devLock) { thinkLocked(e, dt); return; }

  const dist = e.playerDist;

  switch (e.state) {
    case 'patrol': {
      if (e.canSee) { enterCombat(e); break; }
      if (e.lastKnown && e.heardT > 0) { e.state = 'hunt'; e.stateT = 0; setGoal(e, e.lastKnown); break; }
      e.repathT -= dt;
      if (e.holdT <= 0 && !e.path && e.repathT <= 0) {
        // pause & look around sometimes, otherwise wander
        if (rand() < 0.35) {
          e.holdT = randRange(1.2, 3.0);
          e.faceYaw = e.yaw + randSpread(2.2);
        } else {
          setGoal(e, world.navgrid.randomPoint(e.position.x, e.position.z, 38));
        }
        e.repathT = randRange(2, 5);
      }
      break;
    }

    case 'hunt': {
      if (e.canSee) { enterCombat(e); break; }
      const lk = e.lastKnown;
      if (!lk || (!e.path && e.stateT > 1)) {
        const d = lk ? Math.hypot(lk.x - e.position.x, lk.z - e.position.z) : 0;
        if (!lk || d < 2.5) {
          // arrived, nothing here — scan then resume patrol
          if (e.holdT <= 0 && e.scanCount > 1) { e.state = 'patrol'; e.stateT = 0; e.lastKnown = null; e.heardT = 0; e.scanCount = 0; }
          else if (e.holdT <= 0) { e.holdT = randRange(1, 1.8); e.faceYaw = e.yaw + randSpread(2.6); e.scanCount = (e.scanCount || 0) + 1; }
        } else {
          setGoal(e, lk);
        }
      }
      if (e.stateT > 14) { e.state = 'patrol'; e.stateT = 0; e.heardT = 0; }
      break;
    }

    case 'combat': {
      if (!player.alive) { e.state = 'patrol'; e.stateT = 0; e.path = null; break; }
      if (!e.canSee && e.awareT > 2.8) { e.state = 'hunt'; e.stateT = 0; e.scanCount = 0; if (e.lastKnown) setGoal(e, e.lastKnown); break; }

      // low health → break for cover (once per engagement)
      if (e.health < 42 && !e.tookCover && e.canSee) {
        const c = findCoverPoint(e);
        if (c) { e.tookCover = true; e.state = 'cover'; e.stateT = 0; e.holdT = 0; setGoal(e, c); break; }
      }

      // occasional flanker when the squad has numbers
      if (e.sys.flankCd <= 0 && e.sys.combatCount >= 3 && dist > 14 && rand() < 0.5) {
        e.sys.flankCd = randRange(7, 12);
        e.state = 'flank';
        e.stateT = 0;
        setGoal(e, findFlankPoint(e));
        break;
      }

      // movement: keep 10-30m, otherwise strafe-reposition between bursts
      e.repathT -= dt;
      if (!e.path && e.repathT <= 0) {
        let goal = null;
        if (dist > 30) {
          _a.set(player.position.x - e.position.x, 0, player.position.z - e.position.z).normalize();
          goal = world.navgrid.nearestWalkable(
            e.position.x + _a.x * randRange(8, 12) + randSpread(4),
            e.position.z + _a.z * randRange(8, 12) + randSpread(4));
        } else if (dist < 9) {
          _a.set(e.position.x - player.position.x, 0, e.position.z - player.position.z).normalize();
          goal = world.navgrid.nearestWalkable(
            e.position.x + _a.x * randRange(7, 11) + randSpread(3),
            e.position.z + _a.z * randRange(7, 11) + randSpread(3));
        } else if (e.burstsFired >= 2) {
          // sidestep to a new firing position
          e.burstsFired = 0;
          const side = rand() < 0.5 ? 1 : -1;
          _a.set(player.position.x - e.position.x, 0, player.position.z - e.position.z).normalize();
          goal = world.navgrid.nearestWalkable(
            e.position.x + -_a.z * side * randRange(4, 8) + randSpread(2),
            e.position.z + _a.x * side * randRange(4, 8) + randSpread(2));
        }
        if (goal) setGoal(e, goal);
        e.repathT = randRange(1.6, 3.2);
      }
      break;
    }

    case 'cover': {
      if (!player.alive) { e.state = 'patrol'; e.stateT = 0; break; }
      if (!e.path) {
        // in cover: wait, then peek back out
        if (e.holdT <= 0 && !e.coverWaited) { e.holdT = randRange(2, 3.5); e.coverWaited = true; e.faceYaw = Math.atan2(player.position.x - e.position.x, player.position.z - e.position.z); }
        else if (e.holdT <= 0 && e.coverWaited) { e.coverWaited = false; enterCombat(e); }
      }
      if (e.canSee && dist < 7) { e.coverWaited = false; enterCombat(e); } // flushed out
      if (e.stateT > 9) { e.coverWaited = false; enterCombat(e); }
      break;
    }

    case 'flank': {
      if (!player.alive) { e.state = 'patrol'; e.stateT = 0; break; }
      if (!e.path || e.stateT > 9 || (e.canSee && dist < 18)) { enterCombat(e); break; }
      break;
    }

    case 'suppressed': {
      if (e.suppressT <= 0 || !e.path) {
        e.suppressT = 0;
        if (e.awareT < 4 && player.alive) enterCombat(e);
        else { e.state = 'patrol'; e.stateT = 0; }
      }
      break;
    }
  }

  fireControl(e, dt);
}

/** Dev-forced states hold their pose/behavior for screenshots. */
function thinkLocked(e, dt) {
  const { player } = e.game;
  switch (e.devLock) {
    case 'idle':
      e.state = 'patrol';
      e.path = null;
      e.holdT = 1;
      e.faceYaw = e.devYawLock
        ? e.devYaw
        : Math.atan2(player.position.x - e.position.x, player.position.z - e.position.z);
      break;
    case 'combat':
      e.state = 'combat';
      e.canSee = true;
      e.awareT = 0;
      e.reactionT = 0;
      e.engageT = Math.max(e.engageT, 2);
      e.path = null; // stand and shoot — stable for screenshots
      if (!e.lastKnown) e.lastKnown = new THREE.Vector3();
      e.lastKnown.copy(player.position);
      fireControl(e, dt);
      break;
    case 'patrol':
      if (e.state !== 'patrol') { e.state = 'patrol'; e.path = null; }
      e.canSee = false;
      thinkPatrolOnly(e, dt);
      break;
    case 'cover':
      if (e.state !== 'cover') { e.state = 'cover'; setGoal(e, findCoverPoint(e)); }
      if (!e.path && e.holdT <= 0) { e.holdT = 5; e.faceYaw = Math.atan2(player.position.x - e.position.x, player.position.z - e.position.z); }
      break;
    case 'flank':
      if (e.state !== 'flank') { e.state = 'flank'; setGoal(e, findFlankPoint(e)); }
      if (!e.path) setGoal(e, findFlankPoint(e));
      break;
    case 'suppressed':
      if (e.state !== 'suppressed') e.suppress(player.position);
      break;
  }
}

function thinkPatrolOnly(e, dt) {
  const { world } = e.game;
  e.repathT -= dt;
  if (e.holdT <= 0 && !e.path && e.repathT <= 0) {
    if (rand() < 0.35) { e.holdT = randRange(1.2, 3.0); e.faceYaw = e.yaw + randSpread(2.2); }
    else setGoal(e, world.navgrid.randomPoint(e.position.x, e.position.z, 38));
    e.repathT = randRange(2, 5);
  }
}

/** Burst-fire cadence with reaction delay + accuracy ramp. */
function fireControl(e, dt) {
  const { player } = e.game;
  const engaged = (e.state === 'combat' || e.state === 'flank' || e.state === 'cover');
  const canFire = engaged && e.canSee && player.alive && e.playerDist < 60 && e.reactionT <= 0;

  if (canFire) {
    e.engageT += dt;
    if (e.burstLeft > 0) {
      e.shotT -= dt;
      if (e.shotT <= 0) {
        e.fireShot();
        e.burstLeft--;
        e.shotT = randRange(0.095, 0.13);
        if (e.burstLeft === 0) {
          e.burstsFired++;
          e.burstCd = randRange(0.7, 1.6) + (e.playerDist > 35 ? 0.5 : 0);
        }
      }
    } else {
      e.burstCd -= dt;
      if (e.burstCd <= 0) {
        e.burstLeft = randInt(3, 6);
        e.shotT = randRange(0, 0.06);
      }
    }
  } else {
    e.engageT = Math.max(0, e.engageT - dt * 0.6);
    if (!e.canSee) e.burstLeft = 0;
  }
}
