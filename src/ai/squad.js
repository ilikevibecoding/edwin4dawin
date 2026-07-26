// Squad coordination and shared stimuli (Opus 3 domain).
//
// Two jobs, both deliberately cheap and both event-driven or throttled so nothing here scales
// with the navigation graph:
//
// 1. Pressure tokens. At most `ai.maxPushers` hostiles may advance on the player at any moment;
//    the rest are told to hold an angle. The assignment is recomputed a few times a second from
//    the mission's own enemy list, so it costs one sort of the engaged subset — never a search.
// 2. Suppression. Bullet impacts land on the mission bus already; a single module-level listener
//    forwards near misses to whichever hostiles are close to them.
//
// Nothing in this file touches src/game/mission.js. The mission is only ever read.
import { bus } from '../core/events.js';
import { aiTuning } from '../game/difficulty.js';

const NEAR_MISS_RADIUS = 2.6;

/** Live hostiles, so the bus listener has something to talk to without walking the scene. */
const live = new Set();
let wired = false;

function wire() {
  if (wired) return;
  wired = true;
  // Impacts are emitted by ballistics for every round that lands, player or hostile. A hostile
  // ignores the impacts of its own fire (they land at the far end of its own bullet).
  bus.on('impact', (e) => {
    if (!e || !e.point || !live.size) return;
    const p = e.point;
    for (const en of live) {
      if (en.selfFireT > 0) continue;
      const dx = en.pos.x - p.x, dy = en.pos.y + 0.9 - p.y, dz = en.pos.z - p.z;
      if (dx * dx + dy * dy + dz * dz > NEAR_MISS_RADIUS * NEAR_MISS_RADIUS) continue;
      en.onNearMiss(p);
    }
  });
}

export function registerEnemy(e) {
  wire();
  live.add(e);
}

export function unregisterEnemy(e) {
  live.delete(e);
}

const squads = new WeakMap();

/**
 * Assigns push/hold tokens across the hostiles currently in combat. Called by every hostile's
 * update; the throttle means the work happens a few times a second, not once per hostile per step.
 */
export function coordinate(mission) {
  let s = squads.get(mission);
  if (!s) { s = { next: -1, lastT: 0 }; squads.set(mission, s); }
  if (mission.timer < s.lastT) s.next = -1;   // mission reset rewound the clock
  s.lastT = mission.timer;
  if (mission.timer < s.next) return;
  s.next = mission.timer + 0.3;

  const ai = aiTuning(mission.difficulty);
  const target = mission.player.pos;
  const engaged = [];
  for (const e of mission.enemies) {
    if (!e.alive) continue;
    if (!e.frozen && e.state === 'combat') engaged.push(e);
    // Tokens belong to the fight, not to the hostile: whoever drops out of contact loses both the
    // role and the angle it was told to hold, so neither follows it into the next engagement.
    else if (e.flankBearing != null || e.role !== 'push') { e.role = 'push'; e.flankBearing = null; }
  }
  if (!engaged.length) return;

  const d2 = (e) => {
    const dx = e.pos.x - target.x, dz = e.pos.z - target.z;
    return dx * dx + dz * dz + Math.abs(e.pos.y - target.y) * 40;
  };
  engaged.sort((a, b) => d2(a) - d2(b));

  let pushers = 0;
  for (const e of engaged) {
    // Anyone already at knife range fights regardless of the token budget: backing a hostile off
    // in the open next to the player looks broken, not disciplined.
    const forced = d2(e) < 16;
    const want = pushers < ai.maxPushers || forced ? 'push' : 'hold';
    if (want === 'push') pushers++;
    if (e.role !== want) {
      e.role = want;
      e.cover = -1;
      e.coverT = 0;
      e.holdT = 0;
    }
  }

  // Holders take up distinct bearings around the target and rotate through them periodically.
  let k = 0;
  for (const e of engaged) {
    if (e.role !== 'hold') continue;
    if (e.holdT > 0) { k++; continue; }
    const base = Math.atan2(e.pos.z - target.z, e.pos.x - target.x);
    const side = k % 2 === 0 ? 1 : -1;
    const swing = 0.8 + 0.5 * Math.floor(k / 2);
    e.flankBearing = base + side * swing;
    const [lo, hi] = ai.holdRepositionSec;
    e.holdT = lo + (hi - lo) * mission.rng.next();
    e.cover = -1;
    e.coverT = 0;
    k++;
  }
}
