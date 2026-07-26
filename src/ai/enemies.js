import * as THREE from 'three';
import { bus, EVT } from '../core/events.js';
import { Rng, hashString } from '../core/rng.js';
import { SURFACE } from '../physics/world.js';
import {
  ENEMY_POSTS, PATROL_ROUTES, CHECKPOINTS, OPENINGS, FLOOR_Y, roomAt, floorForY,
} from '../map/layout.js';
import { buildEnemy } from '../characters/enemy-model.js';
import { buildWeaponModel } from '../characters/weapons-models.js';
import { weaponDef, damageAtRange, regionMultiplier } from '../weapons/defs.js';
import { difficultyPreset, ENEMY_DAMAGE_SCALE } from '../mission/objectives.js';
import { Perception, AWARENESS } from './perception.js';
import { resumeIndex, climbStep, STAIR_SWEEP_PAD, STAIR_ENTRY_PAD } from './navgrid.js';

// ---------------------------------------------------------------------------
// Hostile force.  (owner: opus3)
//
// STATES
//   idle         at a post, looking around, weapon low
//   patrol       walking a route from PATROL_ROUTES
//   suspicious   something registered; stop, face it, weapon up
//   investigate  walk to a specific point and look
//   search       sweep a set of points around a lost contact
//   combat       positive ID: engage from where it stands
//   takingCover  moving to a scored cover slot, then peeking from it
//   reloading    magazine change, from cover when cover is available
//   flanking     working around a pinned player to a new angle
//   suppressed   pinned by incoming fire; heads down, no shooting
//   blinded      flashbanged; stumbling, cannot shoot
//   retreating   badly hurt, backing off to cover away from the threat
//   dead         death animation then a settled corpse
//
// GUARANTEES the quality bar asks for
//   * never stands still doing nothing — idle runs a look-around and posts
//     periodically shuffle to a nearby nav point; every state has an action
//   * never sees through walls — all detection goes through Perception, which
//     requires a clear CollisionWorld ray
//   * never fires through impossible geometry — `_lineOfFire` re-tests the
//     muzzle-to-target ray immediately before every single shot
//   * never permanently stuck — a watchdog re-plans when a hostile with an
//     active path has not moved 0.35 m in 2.5 s, and snaps to the nearest
//     walkable cell after three consecutive failures
//   * never ignores combat events — gunshots, glass, doors and ally deaths all
//     arrive through Perception's noise queue or the radio alert
//
// DETERMINISM: every hostile owns an Rng seeded from its index, all timers are
// dt accumulators, and no wall-clock time or Math.random is read anywhere.
// ---------------------------------------------------------------------------

export const ENEMY_STATE = {
  IDLE: 'idle',
  PATROL: 'patrol',
  SUSPICIOUS: 'suspicious',
  INVESTIGATE: 'investigate',
  SEARCH: 'search',
  COMBAT: 'combat',
  TAKING_COVER: 'takingCover',
  RELOADING: 'reloading',
  FLANKING: 'flanking',
  SUPPRESSED: 'suppressed',
  BLINDED: 'blinded',
  RETREATING: 'retreating',
  DEAD: 'dead',
};

/** Which weapon from Opus 2's table each silhouette carries. */
const VARIANT_KIT = {
  breacher: { weapon: 'carbine', speed: 3.0, health: 1.15, view: 0.95, aim: 1.0 },
  runner: { weapon: 'smg', speed: 3.7, health: 0.9, view: 0.9, aim: 1.15 },
  marksman: { weapon: 'sniper', speed: 2.6, health: 1.0, view: 1.35, aim: 0.72 },
};

/**
 * Hostile spawn priority. Both hostage guard pairs come first so the objective
 * is always defended, then the choke points, then the roaming patrols.
 */
const POST_PRIORITY = [
  'post-conference', 'post-conference2', 'post-exec', 'post-exec2',
  'post-vestibule', 'post-lobby', 'post-corr', 'post-loading',
  'post-landing', 'post-execcorr', 'post-office-e', 'post-garage',
  'post-server', 'post-archive', 'post-office-w', 'post-service',
  'post-copy', 'post-break', 'post-waiting',
];

/** Patrol route per starting room, so a hostile walks somewhere sensible. */
const ROOM_ROUTE = {
  vestibule: 'frontLoop', lobby: 'frontLoop', waiting: 'frontLoop',
  openoffice: 'officeLoop', breakroom: 'officeLoop', midcorr: 'backLoop',
  copyroom: 'backLoop', servicecorr: 'backLoop', serverroom: 'backLoop',
  loading: 'dockLoop', garage: 'dockLoop',
  execcorr: 'execLoop', upperlanding: 'execLoop', archive: 'execLoop',
};

const AGENT_RADIUS = 0.30;
const AGENT_HEIGHT = 1.72;
const EYE_HEIGHT = 1.55;
const CROUCH_SCALE = 0.72;
const GRAVITY = 18;
const REPLAN_INTERVAL = 0.55;
const STUCK_WINDOW = 2.5;
const STUCK_DISTANCE = 0.35;
const STUCK_LIMIT = 3;
/**
 * Bark pacing. A bark is a discrete event, not a radio net: exactly one line is
 * ever in flight, `BARK_GAP` apart, so the HUD (which holds a subtitle for 3.6 s
 * and shows at most two) never stacks a wall of chatter.
 *
 * On top of that, lines are paced in two tiers. Something happening — a
 * sighting, a casualty, a flashbang — is worth interrupting for. Running
 * commentary on a fight already in progress is not, and is held back much
 * harder, because there is always more of it than there is of anything else.
 *
 * Everything below is in seconds of simulated time.
 */
const BARK_GAP = 2.4;
/** Per hostile: how long before it may say anything at all again. */
const VOICE_COOLDOWN = 5.0;
/** Per hostile, per line: the same words never come round again this soon. */
const LINE_REPEAT_COOLDOWN = 14.0;
/** Across the squad, per line: nobody echoes what a squad-mate just said. */
const SQUAD_LINE_COOLDOWN = 8.0;
/** A queued line older than this is no longer about anything. Drop it. */
const BARK_STALE = 1.6;
/**
 * Which line wins when two want the same breath. A sighting outranks a status
 * call; anything about a casualty outranks movement chatter.
 */
const BARK_PRIORITY = {
  contact: 100, down: 92, hit: 88, blinded: 84, loud: 80, radio: 74,
  engage: 70, retreat: 60, reload: 56, suppress: 44, flank: 40, cover: 36,
  suspicious: 32, searching: 28, investigate: 24, lost: 20, moving: 14, clear: 10,
};
/**
 * Lines at or below this priority are running commentary on a fight that is
 * already happening — taking cover, moving up, reloading. They are the majority
 * of everything a squad wants to say, and left on the same pacing as a sighting
 * they fill every gap for as long as the fight lasts. A minute of that stops
 * reading as a squad and starts reading as a radio left on.
 */
const CHATTER_CEILING = BARK_PRIORITY.reload;
/** So two pieces of running commentary are never back to back. */
const CHATTER_GAP = 9.0;
/** And so the squad does not work through the same status line every 8 s. */
const CHATTER_SQUAD_COOLDOWN = 22.0;
/** How long a hostile keeps listening after a noise before the meter drains. */
const HEAR_HOLD = 1.15;
/** A sighting this recent still counts as "I can see him" for a contact call. */
const SIGHTING_MEMORY = 1.5;
/**
 * How long the squad has to be off the player before his position is worth
 * calling out again from the same room.
 */
const CONTACT_RECALL = 25.0;
/**
 * Ears alone never reach CONFIRMED. Sound places a hostile on the meter as far
 * as "go and look", but a positive identification is something only eyes make —
 * otherwise a player walking behind a wall accumulates footsteps into a
 * confirmed contact and gets shot at through it.
 */
const HEARD_CEILING = AWARENESS.CONFIRMED - 0.02;

/**
 * How a hostile names a room out loud. The room's own `name` is signage —
 * "Open-Plan Cubicle Floor" reduces to "floor", which reads as nonsense in a
 * bark — so the spoken form is written out here instead.
 */
const ROOM_CALL = {
  courtyard: 'the lot', eastapron: 'the yard', entrance: 'the entrance',
  vestibule: 'the vestibule', lobby: 'the lobby', waiting: 'the waiting area',
  weststair: 'the west stair', stairwell: 'the main stair',
  eastlink: 'the east link', openoffice: 'the cubicles',
  conference: 'the conference room', breakroom: 'the break room',
  restrooms: 'the restrooms', midcorr: 'the cross corridor',
  janitor: 'the janitor closet', copyroom: 'the copy room',
  itroom: 'the IT bench', serverroom: 'the server room',
  mechanical: 'the plant room', servicecorr: 'the service corridor',
  loading: 'the dock', garage: 'the garage', upperlanding: 'the landing',
  execcorr: 'the gallery', execoffice: "the director's office",
  archive: 'the archive', upperweststair: 'the west stair head',
};

/**
 * Original bark lines. Nothing here quotes another game. Each takes the
 * manager's dedicated voice Rng so the wording varies without repeating and
 * without touching any stream a combat decision depends on.
 */
const LINES = {
  contact: (r, room) => (room
    ? r.pick([`Contact in ${room}!`, `He is in ${room}!`, `Eyes on — ${room}!`])
    : r.pick(['Contact!', 'Eyes on him!'])),
  // Entering a fight without ever having seen him: shot in the back, flashed,
  // or handed the position over the radio.
  engage: (r) => r.pick(['He is on us — weapons up!', 'He is inside our line!', 'Find him, he is right here!']),
  suspicious: (r) => r.pick(['Hold up. Something moved.', 'Wait — did you catch that?', 'Something is off in here.']),
  investigate: (r) => r.pick(['Checking it out.', 'I will take a look.', 'Going to have a look.']),
  searching: (r) => r.pick(['Sweep it, he is close.', 'He is in here. Look sharp.', 'Corner to corner. Go.']),
  lost: (r) => r.pick(['Where did he go?', 'Lost him. Anyone got eyes?', 'He broke off. Stay on it.']),
  clear: (r) => r.pick(['Nothing here. Back to post.', 'Clear. Returning.', 'All quiet. Resetting.']),
  reload: (r) => r.pick(['Reloading, cover me!', 'Dry — cover!', 'Changing mags, hold him!']),
  moving: (r) => r.pick(['Moving up!', 'Pushing on him!', 'On the move!']),
  flank: (r) => r.pick(['Going wide, keep him pinned!', 'Taking the side, hold his front!', 'Working around — pin him!']),
  suppress: (r) => r.pick(['Suppressing, work around him!', 'Keeping his head down. Move!', 'On him — go now!']),
  cover: (r) => r.pick(['Taking cover!', 'Getting behind something!', 'Down, down!']),
  hit: (r) => r.pick(['I am hit!', 'Hit — I am hit!', 'He got me!']),
  down: (r) => r.pick(['Man down!', 'We just lost one!', 'They dropped him!']),
  blinded: (r) => r.pick(['Cannot see! Cannot see!', 'I am blind — blind!', 'My eyes, I have nothing!']),
  radio: (r) => r.pick(['All posts, we have a runner inside.', 'All posts — intruder in the building.']),
  loud: (r) => r.pick(['Facility alert. Hunt him down.', 'Full alert. Find him and finish it.']),
  retreat: (r) => r.pick(['Falling back, I need a minute!', 'Breaking off — I am hurt!']),
};

let uid = 0;

// =========================================================================
// One hostile
// =========================================================================

class Enemy {
  constructor(manager, { post = null, position, variant = 'runner', index = 0 }) {
    this.manager = manager;
    this.game = manager.game;
    this.index = index;
    this.id = `enemy-${++uid}`;
    this.variant = variant;
    this.kit = VARIANT_KIT[variant] || VARIANT_KIT.runner;
    this.weaponKey = this.kit.weapon;
    this.weaponDef = weaponDef(this.weaponKey);
    this.rng = new Rng(hashString(`northstar:enemy:${index}:${variant}`));

    this.post = post;
    this.homePos = position.clone();
    this.homeYaw = post?.facing ?? 0;
    this.guards = post?.guards || null;
    this.role = post?.role || 'patrol';
    this.routeName = post ? ROOM_ROUTE[post.room] || null : null;

    this.position = position.clone();
    this.velocity = new THREE.Vector3();
    this.yaw = this.homeYaw;
    this.desiredYaw = this.yaw;
    this.eye = new THREE.Vector3();
    this.ear = new THREE.Vector3();
    this.grounded = true;
    this.hitWall = false;
    this.crouched = false;
    this.speed = 0;
    /** Tread height to ease toward while on a flight; null on open floor. */
    this.climbY = null;

    this.alive = true;
    this.dead = false;
    this.health = 100;
    this.maxHealth = 100;
    this.armor = 0;
    this.eyeHeight = EYE_HEIGHT;

    this.state = ENEMY_STATE.IDLE;
    this.stateTime = 0;
    this.awareness = 0;
    this.alert = 0;
    this.detection = 1;
    this.viewRange = 24;
    this.hearing = 1;
    this.lastNoiseSeq = 0;

    this.lastKnownPos = null;
    this.lastSeenTime = -99;
    this.reactionTimer = 0;
    this.searchPoints = [];
    this.searchIndex = 0;
    this.searchTimer = 0;

    this.path = null;
    this.pathIndex = 0;
    this.pathAge = 0;
    this.goal = null;
    this.replanTimer = 0;
    this.stuckTimer = 0;
    this.stuckFails = 0;
    this._watchPos = position.clone();

    this.ammo = 30;
    this.magSize = 30;
    this.reloadTimer = 0;
    this.burstLeft = 0;
    this.shotTimer = 0;
    this.burstTimer = 0;
    this.trackTime = 0;
    this.aimError = 0.05;
    this.suppressionFire = 0;

    this.coverPos = null;
    this.coverFull = false;
    this.coverTimer = 0;
    this.peeking = false;
    this.peekTimer = 0;

    this.blindRemaining = 0;
    this.blindDuration = 0;
    this.blindUntil = 0;
    this.suppression = 0;
    this.suppressedTimer = 0;
    this.flinchTimer = 0;
    this.deathTimer = 0;
    this.deathClip = 'death_back';
    this.voiceTimer = 0;
    this.hearHold = 0;
    this.lineTimes = new Map();
    this.revealed = false;

    this.model = null;
    this.animator = null;
    this.group = null;
    this.collider = null;
    this.hitRegions = makeRegions();
    this._lodBias = 1;
  }

  get forward() {
    return new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
  }

  get room() {
    return roomAt(this.position.x, this.position.z, floorForY(this.position.y));
  }

  get engaged() {
    return this.state === ENEMY_STATE.COMBAT
      || this.state === ENEMY_STATE.TAKING_COVER
      || this.state === ENEMY_STATE.FLANKING
      || this.state === ENEMY_STATE.SUPPRESSED
      || this.state === ENEMY_STATE.RETREATING;
  }

  /**
   * States that run to completion. An alert must not pull a hostile out of one:
   * a magazine change that keeps restarting is a hostile that never shoots
   * again, and it is what a radio call every few frames would otherwise cause.
   */
  get committed() {
    return this.state === ENEMY_STATE.RELOADING
      || this.state === ENEMY_STATE.BLINDED
      || this.state === ENEMY_STATE.DEAD;
  }

  // ------------------------------------------------------------------ damage

  /**
   * Accepts both shapes the codebase uses: `applyDamage(amount, infoObject)`
   * from CombatSystem, and `applyDamage(amount, regionName, fromPos)`.
   */
  applyDamage(amount, region = 'chest', fromPos = null) {
    if (!this.alive) return 0;
    let info = null;
    let regionName = 'chest';
    let from = fromPos;
    if (region && typeof region === 'object') {
      info = region;
      regionName = info.region || 'chest';
      from = info.from || info.sourcePos || fromPos;
    } else if (typeof region === 'string') {
      regionName = region;
    }
    const dealt = Math.max(0, Number(amount) || 0);
    this.health -= dealt;
    this.flinchTimer = Math.max(this.flinchTimer, 0.34);
    this.suppression = Math.min(3, this.suppression + 0.7);
    if (from) this.lastHitFrom = toVec3(from);

    if (this.health <= 0) {
      this.die({ region: regionName, from: this.lastHitFrom, byPlayer: info?.byPlayer !== false });
      return dealt;
    }

    // Being shot is the least ignorable event there is.
    this.awareness = AWARENESS.MAX;
    if (this.lastHitFrom) this.lastKnownPos = groundPoint(this.lastHitFrom);
    else if (this.game.player) this.lastKnownPos = groundPoint(this.game.player.position);
    this.manager.raiseAlert(this, this.lastKnownPos, 'hit');
    this.manager.bark(this, 'hit');
    return dealt;
  }

  /** CombatSystem calls this so we know which way the shot came from. */
  notifyHit(fromPos) {
    if (fromPos) this.lastHitFrom = toVec3(fromPos);
  }

  /** Generic alert hook used by other systems. */
  alertTo(pos) {
    if (!pos) return;
    this.lastKnownPos = groundPoint(pos);
    this.awareness = Math.max(this.awareness, AWARENESS.ALERTED + 0.05);
  }

  /** Flashbang contract (see weapons/system.js). */
  blind(duration, position = null) {
    const d = Math.max(0, Number(duration) || 0);
    if (d <= 0) return;
    this.blindRemaining = Math.max(this.blindRemaining, d);
    this.blindDuration = Math.max(this.blindDuration, d);
    this.blindUntil = (this.game.engine?.simTime || 0) + this.blindRemaining;
    if (position) this.lastKnownPos = groundPoint(position);
    this.awareness = Math.max(this.awareness, AWARENESS.ALERTED);
    this._setState(ENEMY_STATE.BLINDED);
    this.manager.bark(this, 'blinded');
  }

  die(info = {}) {
    if (this.dead) return;
    this.alive = false;
    this.dead = true;
    this.health = 0;
    this.path = null;
    this.velocity.set(0, 0, 0);
    this.deathTimer = 0;
    this._setState(ENEMY_STATE.DEAD);

    // Pick a fall that matches where the round came from.
    const from = info.from || this.lastHitFrom;
    if (String(info.region || '').includes('head')) this.deathClip = 'death_slump';
    else if (from) {
      const toShooter = new THREE.Vector3().subVectors(from, this.position).setY(0).normalize();
      this.deathClip = toShooter.dot(this.forward) > 0 ? 'death_back' : 'death_forward';
    } else {
      this.deathClip = this.rng.bool(0.5) ? 'death_back' : 'death_forward';
    }
    this.animator?.play(this.deathClip, { fade: 0.06, force: true });

    this.manager.onDeath(this, info);
  }

  _setState(next) {
    if (this.state === next) return;
    this.prevState = this.state;
    this.state = next;
    this.stateTime = 0;
  }
}

// =========================================================================
// Manager
// =========================================================================

export class EnemyManager {
  constructor(game) {
    this.game = game;
    this.perception = new Perception(game);
    this.rng = new Rng(hashString('northstar:enemies'));
    /** @type {Enemy[]} */
    this.enemies = [];
    this.time = 0;
    this.difficulty = game?.difficulty || 'operator';
    this.preset = difficultyPreset(this.difficulty);
    this.alertCount = 0;
    this.facilityLoud = false;
    this.kills = 0;
    this._revealUntil = -1;
    /** Voice lines only: keeping it off `rng` stops wording moving aim rolls. */
    this.voiceRng = new Rng(hashString('northstar:barks'));
    this._pendingBark = null;
    this._barkGap = 0;
    this._lastChatter = -1e9;
    this._contactRoom = null;
    this._contactTime = -1e9;
    this._squadLines = new Map();
    /** `auditPosts` output; the QA overlay and the mission report read it. */
    this.postAudit = [];
    this._postPos = new Map();
    this._postAuditLogged = false;
    /** `auditRoutes` output, keyed the same way for the same readers. */
    this.routeAudit = [];
    this._routePos = new Map();
    this._routeAuditLogged = false;
    this._pool = new Map();
    this._queryOut = [];
    this._doorCooldown = new Map();
    this._offs = [
      // Rounds cracking past make a hostile duck even if they miss.
      bus.on(EVT.IMPACT, (p) => this._onImpact(p)),
    ];
    this.reset(this.difficulty);
  }

  get list() {
    return this.enemies;
  }

  get alive() {
    return this.enemies.filter((e) => e.alive);
  }

  dispose() {
    for (const off of this._offs) off?.();
    this._offs.length = 0;
    this.perception.detach();
  }

  // ------------------------------------------------------------------- reset

  /** Full rebuild. Nothing from the previous run may survive this. */
  reset(difficulty = this.difficulty) {
    this.difficulty = difficulty;
    this.preset = difficultyPreset(difficulty);
    this.time = 0;
    this.alertCount = 0;
    this.facilityLoud = false;
    this.kills = 0;
    this._revealUntil = -1;
    this._pendingBark = null;
    this._barkGap = 0;
    this._lastChatter = -1e9;
    this._contactRoom = null;
    this._contactTime = -1e9;
    this._squadLines.clear();
    this._doorCooldown.clear();
    this.rng.reseed(hashString(`northstar:enemies:${difficulty}`));
    this.voiceRng.reseed(hashString(`northstar:barks:${difficulty}`));
    this.perception.reset();
    // Not `invalidate()`: the grid's own Rng has to be rewound too, or the
    // second run from a seed picks up its search points where the first left off.
    this.game.nav?.resetRun?.();
    uid = 0;

    for (const e of this.enemies) this._release(e);
    this.enemies.length = 0;

    this.auditPosts();
    this.auditRoutes();
    const posts = this._selectPosts(this.preset.enemyCount);
    for (let i = 0; i < posts.length; i++) {
      this._spawn(posts[i], i);
    }
    return this;
  }

  /**
   * `ENEMY_POSTS` is authored in `layout.js`, which moved several room
   * rectangles without moving the posts standing in them, so a post can now sit
   * in a wall or in the wrong room. Check every entry against the baked mesh:
   * anything unwalkable is snapped to the nearest cell so the hostile still
   * works, and named in a warning so the rectangle can be fixed at the source.
   *
   * @returns {Array<object>} one record per post; `issues` is empty when it is
   *   exactly where it claims to be
   */
  auditPosts() {
    const nav = this.game.nav;
    const audit = [];
    for (const post of ENEMY_POSTS) {
      const raw = new THREE.Vector3(post.pos[0], post.pos[1], post.pos[2]);
      const floor = floorForY(raw.y);
      const actual = roomAt(raw.x, raw.z, floor);
      const issues = [];
      if (!actual) issues.push('outside every room rectangle');
      else if (actual.id !== post.room) issues.push(`stands in "${actual.id}", declares "${post.room}"`);
      if (Math.abs((FLOOR_Y[floor] ?? 0) - raw.y) > 0.1) issues.push(`y=${raw.y} is not a storey height`);

      let pos = raw;
      let snapped = 0;
      if (!nav?.isWalkable?.(raw)) {
        const near = nav?.nearestWalkable?.(raw, 4);
        if (near) {
          pos = near.clone();
          snapped = +raw.distanceTo(near).toFixed(2);
          issues.push(`not walkable, snapped ${snapped} m to ${fmt(pos)}`);
        } else {
          issues.push('not walkable, and nothing walkable within 4 m');
        }
      }
      audit.push({
        id: post.id,
        declaredRoom: post.room,
        actualRoom: actual?.id ?? null,
        pos: pos.toArray().map((v) => +v.toFixed(2)),
        snapped,
        issues,
      });
    }
    this.postAudit = audit;
    this._postPos = new Map(audit.map((a) => [a.id, new THREE.Vector3(...a.pos)]));

    if (!this._postAuditLogged) {
      this._postAuditLogged = true;
      for (const a of audit) {
        if (a.issues.length) console.warn(`[ai] ENEMY_POSTS "${a.id}": ${a.issues.join('; ')}`);
      }
    }
    return audit;
  }

  /**
   * `PATROL_ROUTES` names checkpoints, and the same rectangle moves left three
   * of those standing inside furniture (`reception` is in the reception desk,
   * `conference` in the meeting table, `loading` in the pallet stack). Resolve
   * every waypoint once here, snapped to the mesh, so a patrol never plans a
   * path into a solid prop and every bad checkpoint gets named.
   *
   * @returns {Array<object>} one record per checkpoint used by a route
   */
  auditRoutes() {
    const nav = this.game.nav;
    const used = new Map();
    for (const [route, names] of Object.entries(PATROL_ROUTES)) {
      for (const name of names) {
        if (!used.has(name)) used.set(name, []);
        if (!used.get(name).includes(route)) used.get(name).push(route);
      }
    }

    const audit = [];
    this._routePos = new Map();
    for (const [name, routes] of used) {
      const cp = CHECKPOINTS[name];
      if (!cp) {
        audit.push({ checkpoint: name, routes, pos: null, snapped: 0, issues: ['no such checkpoint'] });
        continue;
      }
      const raw = new THREE.Vector3(cp.pos[0], cp.pos[1], cp.pos[2]);
      const actual = roomAt(raw.x, raw.z, floorForY(raw.y));
      const issues = [];
      if (actual && cp.room && actual.id !== cp.room) {
        issues.push(`stands in "${actual.id}", declares "${cp.room}"`);
      }
      let pos = raw;
      let snapped = 0;
      if (!nav?.isWalkable?.(raw)) {
        const near = nav?.nearestWalkable?.(raw, 4);
        if (near) {
          pos = near.clone();
          snapped = +raw.distanceTo(near).toFixed(2);
          issues.push(`not walkable, snapped ${snapped} m to ${fmt(pos)}`);
        } else {
          issues.push('not walkable, and nothing walkable within 4 m');
        }
      }
      this._routePos.set(name, pos);
      audit.push({
        checkpoint: name,
        routes,
        declaredRoom: cp.room ?? null,
        actualRoom: actual?.id ?? null,
        pos: pos.toArray().map((v) => +v.toFixed(2)),
        snapped,
        issues,
      });
    }
    this.routeAudit = audit;

    if (!this._routeAuditLogged) {
      this._routeAuditLogged = true;
      for (const a of audit) {
        if (a.issues.length) {
          console.warn(`[ai] PATROL_ROUTES checkpoint "${a.checkpoint}" (${a.routes.join(', ')}): ${a.issues.join('; ')}`);
        }
      }
    }
    return audit;
  }

  _selectPosts(count) {
    const byId = new Map(ENEMY_POSTS.map((p) => [p.id, p]));
    const ordered = [];
    for (const id of POST_PRIORITY) {
      const p = byId.get(id);
      if (p) { ordered.push(p); byId.delete(id); }
    }
    for (const p of ENEMY_POSTS) if (byId.has(p.id)) ordered.push(p);
    return ordered.slice(0, Math.max(1, Math.min(ordered.length, count)));
  }

  _variantFor(post, index) {
    if (post?.role === 'guard') return index % 2 === 0 ? 'breacher' : 'runner';
    if (post?.role === 'sentry') return index % 3 === 0 ? 'marksman' : 'breacher';
    return index % 3 === 0 ? 'marksman' : index % 2 === 0 ? 'runner' : 'breacher';
  }

  _spawn(post, index) {
    const variant = this._variantFor(post, index);
    const nav = this.game.nav;
    const raw = new THREE.Vector3(post.pos[0], post.pos[1], post.pos[2]);
    const snapped = this._postPos?.get(post.id)
      || (nav?.isWalkable?.(raw) ? raw : (nav?.nearestWalkable?.(raw, 4) || raw));
    const e = new Enemy(this, { post, position: snapped, variant, index });
    this._configure(e);
    this._attachModel(e);
    this._addCollider(e);
    // Before the first update, so a hostile spawned into a frozen world is
    // still shootable instead of carrying its hit spheres at the origin.
    this._updateRegions(e);
    this.enemies.push(e);
    e._setState(post.role === 'patrol' ? ENEMY_STATE.PATROL : ENEMY_STATE.IDLE);
    return e;
  }

  /** Public spawn hook (QA, scripted reinforcements). */
  spawnAt(pos, variant = 'runner') {
    const p = toVec3(pos);
    const nav = this.game.nav;
    const snapped = nav?.isWalkable?.(p) ? p : (nav?.nearestWalkable?.(p, 5) || p);
    const index = this.enemies.length;
    const post = { id: `spawn-${index}`, pos: snapped.toArray(), room: roomAt(snapped.x, snapped.z, floorForY(snapped.y))?.id, role: 'patrol', facing: 0 };
    const e = new Enemy(this, { post, position: snapped, variant, index });
    this._configure(e);
    this._attachModel(e);
    this._addCollider(e);
    this._updateRegions(e);
    this.enemies.push(e);
    e._setState(ENEMY_STATE.PATROL);
    return e;
  }

  _configure(e) {
    const p = this.preset;
    const kit = e.kit;
    e.maxHealth = Math.round(p.enemyHealth * kit.health);
    e.health = e.maxHealth;
    e.armor = p.enemyArmor;
    e.detection = p.detectionSpeed;
    e.viewRange = p.viewRange * kit.view;
    e.hearing = 1;
    e.magSize = Math.max(6, e.weaponDef.magSize || 30);
    e.ammo = e.magSize;
    e.aimError = this._baseAimError(e);
    e.moveSpeed = kit.speed;
    // Stagger the expensive cover/replan work across hostiles.
    e.coverTimer = (e.index % 7) * 0.11;
    e.replanTimer = (e.index % 5) * 0.09;
  }

  _baseAimError(e) {
    // Radians of one-sigma aim error before tracking tightens it.
    const base = 0.075 / Math.max(0.2, this.preset.enemyAccuracy);
    return base / Math.max(0.4, e.kit.aim);
  }

  _attachModel(e) {
    const pool = this._pool.get(e.variant) || [];
    let model = pool.pop();
    if (!model) {
      model = buildEnemy(e.variant, { seed: e.index + 1 });
      try {
        const weapon = buildWeaponModel(e.weaponKey, { world: true });
        model.attachWeapon(weapon);
        model._weapon = weapon;
      } catch (err) {
        console.warn('[ai] enemy weapon model failed', err);
      }
    } else if (model._weapon && !model.weapon) {
      model.attachWeapon(model._weapon);
    }
    this._pool.set(e.variant, pool);
    e.model = model;
    e.animator = model.animator;
    e.group = model.group;
    e.group.visible = true;
    e.group.position.copy(e.position);
    e.group.rotation.y = e.yaw;
    e.animator.breathe = true;
    e.animator.play('guard', { force: true });
    this.game.scene?.add?.(e.group);
  }

  _release(e) {
    if (e.collider) {
      this.game.collision?.remove?.(e.collider);
      e.collider = null;
    }
    if (e.droppedWeapon) {
      this.game.scene?.remove?.(e.droppedWeapon);
      e.droppedWeapon = null;
    }
    const model = e.model;
    if (model) {
      this.game.scene?.remove?.(model.group);
      model.group.visible = false;
      model.setLOD?.(0);
      if (model._weapon && !model.weapon) model.attachWeapon(model._weapon);
      const pool = this._pool.get(e.variant) || [];
      pool.push(model);
      this._pool.set(e.variant, pool);
    }
    e.model = null;
    e.animator = null;
    e.group = null;
  }

  _addCollider(e) {
    if (!this.game.collision?.add) return;
    e.collider = this.game.collision.add({
      min: [e.position.x - AGENT_RADIUS, e.position.y, e.position.z - AGENT_RADIUS],
      max: [e.position.x + AGENT_RADIUS, e.position.y + AGENT_HEIGHT, e.position.z + AGENT_RADIUS],
      surface: SURFACE.FLESH,
      tag: `character:enemy:${e.id}`,
      dynamic: true,
      blocksSight: false,
      blocksNav: false,
      ref: e,
    });
    e._colliderAnchor = e.position.clone();
  }

  _syncCollider(e) {
    const c = e.collider;
    if (!c) return;
    if (!e.alive) {
      c.enabled = false;
      return;
    }
    if (e._colliderAnchor.distanceToSquared(e.position) < 0.04) return;
    const h = e.crouched ? AGENT_HEIGHT * CROUCH_SCALE : AGENT_HEIGHT;
    this.game.collision.remove(c);
    c.setBounds(
      [e.position.x - AGENT_RADIUS, e.position.y, e.position.z - AGENT_RADIUS],
      [e.position.x + AGENT_RADIUS, e.position.y + h, e.position.z + AGENT_RADIUS]
    );
    this.game.collision.add(c);
    e._colliderAnchor.copy(e.position);
  }

  // ------------------------------------------------------------------ update

  update(dt) {
    if (dt <= 0) return;
    this.time += dt;
    this.perception.update(dt);

    for (const e of this.enemies) {
      e.stateTime += dt;
      e.voiceTimer = Math.max(0, e.voiceTimer - dt);
      e.flinchTimer = Math.max(0, e.flinchTimer - dt);
      e.eye.set(e.position.x, e.position.y + (e.crouched ? EYE_HEIGHT * CROUCH_SCALE : EYE_HEIGHT), e.position.z);
      e.ear.copy(e.eye);

      if (!e.alive) {
        e.deathTimer += dt;
        this._updateRegions(e);
        this._syncCollider(e);
        continue;
      }

      e.alert = this.facilityLoud ? 1 : (e.awareness >= AWARENESS.SUSPICIOUS ? 1 : 0);
      this.perception.sense(e, dt);
      this._hear(e);
      this._think(e, dt);
      this._integrate(e, dt);
      this._watchdog(e, dt);
      this._updateRegions(e);
      this._syncCollider(e);
    }

    this._drainBarks(dt);
  }

  // ------------------------------------------------------------------ hearing

  _hear(e) {
    const heard = this.perception.pollNoises(e);
    if (!heard.length) return;
    e.hearHold = HEAR_HOLD;
    for (const n of heard) {
      if (n.source === 'enemy' && n.kind === 'gunshot' && !this.facilityLoud) {
        // Friendly fire tells us where the fight is, not where the player is.
        if (!e.engaged) {
          e.lastKnownPos = groundPoint(n.position);
          e.awareness = Math.max(e.awareness, AWARENESS.ALERTED - 0.05);
        }
        continue;
      }
      const loud = n.kind === 'gunshot' || n.kind === 'glass' || n.kind === 'flashbang' || n.kind === 'melee';
      const bump = loud ? 0.85 : Math.min(0.5, n.level * 0.75);
      // Never drags an already-confirmed contact back down, but never lifts one
      // to confirmed either.
      const ceiling = Math.max(e.awareness, HEARD_CEILING);
      e.awareness = Math.min(ceiling, e.awareness + bump);
      e.lastKnownPos = groundPoint(n.position);
      e.lastHeardKind = n.kind;
      if (loud) {
        this.raiseAlert(e, n.position, n.kind);
        if (e.state === ENEMY_STATE.IDLE || e.state === ENEMY_STATE.PATROL) {
          this._beginInvestigate(e, n.position, true);
        }
      }
      break; // loudest only; the queue is already sorted
    }
  }

  _onImpact(p) {
    if (!p?.point || this.facilityLoud === undefined) return;
    const pt = toVec3(p.point);
    if (!pt) return;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const d2 = e.position.distanceToSquared(pt);
      if (d2 > 6.5) continue;
      e.suppression = Math.min(3, e.suppression + (d2 < 1.4 ? 0.7 : 0.35));
      if (!e.lastKnownPos && this.game.player) e.lastKnownPos = groundPoint(this.game.player.position);
      e.awareness = Math.max(e.awareness, AWARENESS.ALERTED);
    }
  }

  // -------------------------------------------------------------- behaviour

  _think(e, dt) {
    const player = this.game.player;
    const sense = e._senseOut;
    const canSee = !!sense?.visible && player?.alive !== false;
    if (canSee) {
      e.lastSeenTime = this.time;
      e.lastKnownPos = groundPoint(player.position);
      e.trackTime += dt;
    } else {
      e.trackTime = Math.max(0, e.trackTime - dt * 1.6);
    }

    e.suppression = Math.max(0, e.suppression - dt * 0.85);
    if (e.blindRemaining > 0) {
      e.blindRemaining = Math.max(0, e.blindRemaining - dt);
      if (e.state !== ENEMY_STATE.BLINDED) e._setState(ENEMY_STATE.BLINDED);
    }

    // Reloading and blindness are committed states; everything else can be
    // pre-empted by a confirmed contact.
    switch (e.state) {
      case ENEMY_STATE.BLINDED: return this._stateBlinded(e, dt);
      case ENEMY_STATE.RELOADING: return this._stateReloading(e, dt);
      case ENEMY_STATE.DEAD: return;
      default: break;
    }

    if (e.awareness >= AWARENESS.CONFIRMED && player?.alive !== false) {
      if (!e.engaged) {
        e.reactionTimer = this.preset.reactionTime;
        this._enterCombat(e, canSee);
      }
    } else if (e.awareness >= AWARENESS.ALERTED && !e.engaged) {
      if (e.state !== ENEMY_STATE.INVESTIGATE && e.state !== ENEMY_STATE.SEARCH) {
        this._beginInvestigate(e, e.lastKnownPos, false);
      }
    } else if (e.awareness >= AWARENESS.SUSPICIOUS && !e.engaged
      && e.state !== ENEMY_STATE.INVESTIGATE && e.state !== ENEMY_STATE.SEARCH
      && e.state !== ENEMY_STATE.SUSPICIOUS) {
      e._setState(ENEMY_STATE.SUSPICIOUS);
      this.bark(e, 'suspicious');
    }

    if (e.reactionTimer > 0) e.reactionTimer = Math.max(0, e.reactionTimer - dt);

    switch (e.state) {
      case ENEMY_STATE.IDLE: return this._stateIdle(e, dt);
      case ENEMY_STATE.PATROL: return this._statePatrol(e, dt);
      case ENEMY_STATE.SUSPICIOUS: return this._stateSuspicious(e, dt);
      case ENEMY_STATE.INVESTIGATE: return this._stateInvestigate(e, dt);
      case ENEMY_STATE.SEARCH: return this._stateSearch(e, dt);
      case ENEMY_STATE.COMBAT: return this._stateCombat(e, dt, canSee);
      case ENEMY_STATE.TAKING_COVER: return this._stateTakingCover(e, dt, canSee);
      case ENEMY_STATE.FLANKING: return this._stateFlanking(e, dt, canSee);
      case ENEMY_STATE.SUPPRESSED: return this._stateSuppressed(e, dt, canSee);
      case ENEMY_STATE.RETREATING: return this._stateRetreating(e, dt, canSee);
      default: return this._stateIdle(e, dt);
    }
  }

  // --- idle / patrol --------------------------------------------------------

  /**
   * A hostile at a post is never inert: it sweeps its arc, and every few
   * seconds it shifts its feet to a nearby nav point so it reads as alive.
   */
  _stateIdle(e, dt) {
    e.crouched = false;
    if (e.path) {
      this._followPath(e, dt, e.moveSpeed * 0.45);
      if (!e.path) e.lookTimer = 0;
      return;
    }
    e.lookTimer = (e.lookTimer || 0) + dt;
    const sweep = Math.sin(this.time * 0.55 + e.index) * 0.85;
    e.desiredYaw = e.homeYaw + sweep;
    if (e.lookTimer > 5.5 + (e.index % 4)) {
      e.lookTimer = 0;
      const spot = this.game.nav?.randomPointNear?.(e.homePos, this.guardLeash(e), e.rng);
      if (spot && !inDoorway(spot) && spot.distanceToSquared(e.position) > 0.6) this._setGoal(e, spot);
    }
    if (e.homePos.distanceToSquared(e.position) > 9) this._setGoal(e, e.homePos);
  }

  /** Hostage guards stay tight to their post; roamers get more rope. */
  guardLeash(e) {
    return e.guards ? 2.2 : e.role === 'sentry' ? 3.0 : 5.0;
  }

  _statePatrol(e, dt) {
    e.crouched = false;
    if (!e.route) {
      const names = PATROL_ROUTES[e.routeName || 'officeLoop'] || PATROL_ROUTES.officeLoop;
      // `auditRoutes` already snapped these off the baked mesh. A hostile placed
      // by QA rather than by a mission start can get here without one.
      if (!this._routePos.size) this.auditRoutes();
      e.route = names.map((n) => this._routePos.get(n)).filter(Boolean);
      e.routeIndex = e.index % Math.max(1, e.route.length);
    }
    if (!e.route.length) return this._stateIdle(e, dt);

    if (!e.path) {
      if (e.waypointPause > 0) {
        e.waypointPause -= dt;
        e.desiredYaw = e.homeYaw + Math.sin(this.time * 0.7 + e.index) * 1.15;
        return;
      }
      e.routeIndex = (e.routeIndex + 1) % e.route.length;
      const target = e.route[e.routeIndex];
      if (!this._setGoal(e, target)) {
        // Unreachable waypoint: skip it rather than freeze.
        e.waypointPause = 0.4;
      }
      return;
    }
    this._followPath(e, dt, e.moveSpeed * 0.62);
    if (!e.path) e.waypointPause = 1.6 + e.rng.float() * 2.4;
  }

  // --- suspicion chain ------------------------------------------------------

  _stateSuspicious(e, dt) {
    e.crouched = false;
    e.path = null;
    if (e.lastKnownPos) this._faceTowards(e, e.lastKnownPos);
    if (e.awareness < AWARENESS.SUSPICIOUS * 0.7) {
      this._returnToDuty(e);
      return;
    }
    if (e.stateTime > 1.4 && e.lastKnownPos) {
      this._beginInvestigate(e, e.lastKnownPos, false);
    }
  }

  _beginInvestigate(e, point, urgent) {
    const target = point ? groundPoint(point) : null;
    if (!target) {
      this._returnToDuty(e);
      return;
    }
    e._setState(ENEMY_STATE.INVESTIGATE);
    e.investigatePoint = target.clone();
    e.path = null;
    this._setGoal(e, target);
    this.bark(e, urgent ? 'searching' : 'investigate');
  }

  _stateInvestigate(e, dt) {
    e.crouched = false;
    if (e.path) {
      this._followPath(e, dt, e.moveSpeed * 0.85);
      return;
    }
    // Arrived (or never had a path): look around, then start a proper sweep.
    e.desiredYaw = e.yaw + Math.sin(this.time * 1.5 + e.index) * 0.05 + 0.9 * dt;
    if (e.stateTime > 3.2) this._beginSearch(e, e.investigatePoint || e.lastKnownPos);
  }

  _beginSearch(e, around) {
    const centre = around ? toVec3(around) : e.position.clone();
    const nav = this.game.nav;
    e._setState(ENEMY_STATE.SEARCH);
    // Sweeping means positive ID has been lost. Leaving the meter at CONFIRMED
    // would have the escalation in _think drag them back into combat next frame.
    e.awareness = Math.min(e.awareness, AWARENESS.CONFIRMED - 0.02);
    e.suppressionFire = 0;
    e.searchPoints = [];
    for (let i = 0; i < 4; i++) {
      // A sweep point in a doorway parks a body in the only way through it.
      for (let attempt = 0; attempt < 3; attempt++) {
        const p = nav?.randomPointNear?.(centre, 3.5 + i * 2.0, e.rng);
        if (!p) break;
        if (inDoorway(p)) continue;
        e.searchPoints.push(p);
        break;
      }
    }
    e.searchIndex = 0;
    e.searchTimer = this.preset.searchTime;
    e.path = null;
    this.bark(e, 'searching');
  }

  _stateSearch(e, dt) {
    e.crouched = false;
    e.searchTimer -= dt;
    if (e.searchTimer <= 0 || e.searchIndex >= e.searchPoints.length) {
      this.bark(e, 'clear');
      this._returnToDuty(e);
      return;
    }
    if (e.path) {
      this._followPath(e, dt, e.moveSpeed * 0.8);
      return;
    }
    if (e.searchPause > 0) {
      e.searchPause -= dt;
      e.desiredYaw += 1.5 * dt;
      return;
    }
    const target = e.searchPoints[e.searchIndex++];
    if (!target || !this._setGoal(e, target)) e.searchPause = 0.5;
    else e.searchPause = 0;
    if (!e.path) e.searchPause = 1.5;
  }

  _returnToDuty(e) {
    e.path = null;
    e.searchPoints = [];
    e.coverPos = null;
    e.awareness = Math.min(e.awareness, AWARENESS.SUSPICIOUS * 0.5);
    e._setState(e.role === 'patrol' ? ENEMY_STATE.PATROL : ENEMY_STATE.IDLE);
    if (e.role !== 'patrol') this._setGoal(e, e.homePos);
  }

  // --- combat ---------------------------------------------------------------

  _enterCombat(e, canSee) {
    e.path = null;
    e._setState(ENEMY_STATE.COMBAT);
    e.burstLeft = 0;
    e.burstTimer = 0;
    // Without this a hostile that just gave up looking would re-enter combat
    // with the give-up timer already expired and bounce straight back out.
    e.lostTimer = 0;
    // "Contact" is a sighting call, so it needs a sighting. Reaching CONFIRMED
    // any other way — a round in the back, a flashbang, a position relayed over
    // the radio — is a hostile reacting to something it has not seen, and
    // calling the player's room out loud on that basis is what made the squad
    // sound like it was reading a map rather than fighting.
    if (canSee || this.time - e.lastSeenTime < SIGHTING_MEMORY) {
      const player = this.game.player?.position;
      const room = (player ? roomAt(player.x, player.z, floorForY(player.y)) : null) || e.room;
      const id = room?.id ?? null;
      // A contact call is news, and it stops being news the moment the squad is
      // already fighting him there. Re-announcing the same room every time
      // somebody re-acquires him is how five hostiles end up calling out one
      // conference room. He has to have moved, or the squad has to have been off
      // him long enough for it to be worth saying again.
      if (id !== this._contactRoom || this.time - this._contactTime > CONTACT_RECALL) {
        if (this.bark(e, 'contact', shortRoom(room))) {
          this._contactRoom = id;
          this._contactTime = this.time;
        }
      }
    } else {
      this.bark(e, 'engage');
    }
    this.raiseAlert(e, e.lastKnownPos || this.game.player?.position, 'contact');
    if (canSee && e.rng.float() < this.preset.coverUse) this._seekCover(e);
  }

  _stateCombat(e, dt, canSee) {
    const player = this.game.player;
    if (!player || player.alive === false) {
      this._returnToDuty(e);
      return;
    }
    if (e.ammo <= 0) return this._beginReload(e);

    if (e.health < e.maxHealth * 0.24 && e.stateTime > 1.2 && e.rng.float() < 0.02) {
      return this._beginRetreat(e);
    }
    if (e.suppression > 1.6 && e.coverPos) {
      e._setState(ENEMY_STATE.SUPPRESSED);
      e.suppressedTimer = 0.9 + e.rng.float() * 0.7;
      return;
    }

    const target = this._aimPoint(player);
    const hasLof = canSee && this._lineOfFire(e, target);

    if (hasLof) {
      e.crouched = !!e.coverPos && !e.coverFull && e.position.distanceToSquared(e.coverPos) < 0.5 && !e.peeking;
      this._faceTowards(e, player.position);
      e.lostTimer = 0;
      // Hold the line unless there is a better slot to shoot from.
      if (!e.coverPos && e.coverTimer <= 0 && e.rng.float() < this.preset.coverUse * 0.5) {
        this._seekCover(e);
      } else {
        e.path = null;
        this._tryFire(e, dt, target);
      }
      return;
    }

    e.lostTimer = (e.lostTimer || 0) + dt;
    e.crouched = false;

    // Smoke or a corner: keep the pressure on the last place we saw him.
    if (e.lostTimer < 1.6 && e.lastKnownPos && e.suppressionFire > 0) {
      this._suppressiveFire(e, dt);
      return;
    }
    if (e.lostTimer > 0.5 && e.lostTimer < 2.4 && e.lastKnownPos && e.ammo > e.magSize * 0.4
      && e.rng.float() < 0.02 && this._lineOfFire(e, this._raise(e.lastKnownPos, 1.1))) {
      e.suppressionFire = 3 + Math.floor(e.rng.float() * 3);
      this.bark(e, 'suppress');
      return;
    }
    if (e.lostTimer > 2.0) {
      if (this.preset.flank && e.rng.float() < 0.5) this._beginFlank(e);
      else {
        this.bark(e, 'lost');
        this._beginSearch(e, e.lastKnownPos);
      }
      return;
    }
    // Close the distance to the last known position.
    if (!e.path && e.lastKnownPos) {
      this._setGoal(e, e.lastKnownPos);
      this.bark(e, 'moving');
    }
    if (e.path) this._followPath(e, dt, e.moveSpeed);
  }

  _stateTakingCover(e, dt, canSee) {
    if (e.ammo <= 0 && !e.path) return this._beginReload(e);
    if (!e.coverPos) {
      e._setState(ENEMY_STATE.COMBAT);
      return;
    }
    if (e.path) {
      this._followPath(e, dt, e.moveSpeed * 0.95);
      if (!e.path) this.bark(e, 'cover');
      return;
    }
    // In cover: crouch, then peek on a rhythm and shoot from the peek.
    const player = this.game.player;
    if (!player || player.alive === false) {
      this._returnToDuty(e);
      return;
    }
    e.peekTimer -= dt;
    if (e.peekTimer <= 0) {
      e.peeking = !e.peeking;
      e.peekTimer = e.peeking ? 0.9 + e.rng.float() * 0.9 : 0.6 + e.rng.float() * 0.8;
    }
    e.crouched = !e.peeking && !e.coverFull;
    this._faceTowards(e, player.position);
    const target = this._aimPoint(player);
    if (e.peeking && canSee && this._lineOfFire(e, target)) {
      this._tryFire(e, dt, target);
    } else if (!canSee && e.stateTime > 4.5) {
      e.coverPos = null;
      e._setState(ENEMY_STATE.COMBAT);
    }
  }

  _stateFlanking(e, dt, canSee) {
    if (e.ammo <= 0) return this._beginReload(e);
    if (e.path) {
      this._followPath(e, dt, e.moveSpeed);
      return;
    }
    e._setState(ENEMY_STATE.COMBAT);
  }

  _stateSuppressed(e, dt, canSee) {
    e.crouched = true;
    e.suppressedTimer -= dt;
    if (e.coverPos) this._faceTowards(e, e.coverPos.clone().negate().add(e.position.clone().multiplyScalar(2)));
    if (e.suppressedTimer <= 0) {
      e.suppression = 0;
      e._setState(e.coverPos ? ENEMY_STATE.TAKING_COVER : ENEMY_STATE.COMBAT);
    }
  }

  _stateRetreating(e, dt, canSee) {
    if (e.path) {
      this._followPath(e, dt, e.moveSpeed * 1.05);
      return;
    }
    e.crouched = true;
    if (e.stateTime > 2.5) {
      if (e.ammo < e.magSize * 0.5) return this._beginReload(e);
      e._setState(ENEMY_STATE.COMBAT);
    }
  }

  _stateBlinded(e, dt) {
    e.crouched = true;
    e.path = null;
    // Flailing turn, no firing at all.
    e.desiredYaw += (e.index % 2 ? 1 : -1) * 2.2 * dt;
    if (e.blindRemaining <= 0) {
      e.suppression = 0;
      if (e.awareness >= AWARENESS.CONFIRMED) this._enterCombat(e, false);
      else this._beginSearch(e, e.lastKnownPos || e.position);
    }
  }

  _beginReload(e) {
    if (e.state === ENEMY_STATE.RELOADING) return; // never restart the timer
    e._setState(ENEMY_STATE.RELOADING);
    const def = e.weaponDef;
    e.reloadTimer = (def.reload?.empty ?? 2.4) / Math.max(0.5, this.preset.enemyFireRate || 1);
    e.path = null;
    this.bark(e, 'reload');
    e.animator?.playUpper?.('reload');
    // Reload behind something when there is something to hide behind.
    if (!e.coverPos && e.coverTimer <= 0) this._seekCover(e, true);
    if (e.coverPos && e.position.distanceToSquared(e.coverPos) > 0.6) this._setGoal(e, e.coverPos);
  }

  _stateReloading(e, dt) {
    e.reloadTimer -= dt;
    e.crouched = !!e.coverPos;
    if (e.path) this._followPath(e, dt, e.moveSpeed * 0.9);
    else if (this.game.player) this._faceTowards(e, e.lastKnownPos || this.game.player.position);
    if (e.reloadTimer <= 0) {
      e.ammo = e.magSize;
      e._setState(e.awareness >= AWARENESS.CONFIRMED ? ENEMY_STATE.COMBAT : ENEMY_STATE.SEARCH);
      if (e.state === ENEMY_STATE.SEARCH && !e.searchPoints.length) {
        this._beginSearch(e, e.lastKnownPos || e.position);
      }
    }
  }

  _beginRetreat(e) {
    const player = this.game.player;
    if (!player) return;
    const away = new THREE.Vector3().subVectors(e.position, player.position).setY(0);
    if (away.lengthSq() < 0.01) away.set(1, 0, 0);
    away.normalize().multiplyScalar(7);
    const target = this.game.nav?.nearestWalkable?.(e.position.clone().add(away), 5);
    e._setState(ENEMY_STATE.RETREATING);
    this.bark(e, 'retreat');
    if (target) this._setGoal(e, target);
  }

  _beginFlank(e) {
    const player = this.game.player;
    const nav = this.game.nav;
    if (!player || !nav) {
      this._beginSearch(e, e.lastKnownPos);
      return;
    }
    const toPlayer = new THREE.Vector3().subVectors(player.position, e.position).setY(0);
    if (toPlayer.lengthSq() < 0.04) toPlayer.set(0, 0, 1);
    toPlayer.normalize();
    const side = e.rng.bool(0.5) ? 1 : -1;
    const lateral = new THREE.Vector3(-toPlayer.z * side, 0, toPlayer.x * side).multiplyScalar(6.5);
    const wanted = player.position.clone().add(lateral).sub(toPlayer.clone().multiplyScalar(2.5));
    const target = nav.isWalkable(wanted) ? wanted : nav.nearestWalkable(wanted, 6);
    if (!target) {
      this._beginSearch(e, e.lastKnownPos);
      return;
    }
    e._setState(ENEMY_STATE.FLANKING);
    this.bark(e, 'flank');
    this._setGoal(e, target);
    if (!e.path) e._setState(ENEMY_STATE.COMBAT);
  }

  // --- cover ---------------------------------------------------------------

  /**
   * Score nearby solids and move to the best slot behind one. A slot must be
   * walkable, must actually break the player's line to a crouched body, and is
   * worth much more when a short sidestep still gives us a shot.
   */
  _seekCover(e, forReload = false) {
    e.coverTimer = 0.9 + e.rng.float() * 0.5;
    const player = this.game.player;
    const nav = this.game.nav;
    const collision = this.game.collision;
    if (!player || !nav || !collision) return null;

    const threat = player.eyePosition ? player.eyePosition.clone() : this._raise(player.position, 1.6);
    const R = 9;
    const min = new THREE.Vector3(e.position.x - R, e.position.y - 0.3, e.position.z - R);
    const max = new THREE.Vector3(e.position.x + R, e.position.y + 2.6, e.position.z + R);
    const hits = collision.query(min, max, this._queryOut).slice();

    let best = null;
    let bestScore = Infinity;
    let examined = 0;
    for (const c of hits) {
      if (examined > 22) break;
      if (!c.enabled) continue;
      const tag = c.tag || '';
      if (/^(character|floor:|deck:|ceil|railing:|stairrail:)/.test(tag)) continue;
      const top = c.max.y - e.position.y;
      if (top < 0.55 || top > 3.2) continue;
      const full = top > 1.5;
      const cx = (c.min.x + c.max.x) * 0.5;
      const cz = (c.min.z + c.max.z) * 0.5;
      const hx = (c.max.x - c.min.x) * 0.5;
      const hz = (c.max.z - c.min.z) * 0.5;
      if (hx > 6 || hz > 6) continue; // walls handle themselves via corners
      const away = new THREE.Vector3(cx - threat.x, 0, cz - threat.z);
      if (away.lengthSq() < 0.01) continue;
      away.normalize();
      examined++;

      const reach = Math.max(hx, hz) + AGENT_RADIUS + 0.32;
      const spot = new THREE.Vector3(cx + away.x * reach, e.position.y, cz + away.z * reach);
      if (!nav.isWalkable(spot)) continue;
      const snapped = nav.nearestWalkable(spot, 0.9);
      if (!snapped) continue;
      // Never take cover in a doorway: it walls the player out of the route
      // rather than making a fight of it.
      if (inDoorway(snapped)) continue;

      const bodyY = full ? 1.25 : 0.82;
      const breaks = !collision.lineOfSight(threat, this._raise(snapped, bodyY));
      if (!breaks) continue;

      // Can we still shoot from a sidestep?
      const lateral = new THREE.Vector3(-away.z, 0, away.x).multiplyScalar(hx + hz > 2 ? 0.85 : 0.6);
      const peek = snapped.clone().add(lateral);
      const canShoot = nav.isWalkable(peek)
        && collision.lineOfSight(this._raise(peek, EYE_HEIGHT), this._aimPoint(player));

      const dist = e.position.distanceTo(snapped);
      const toThreat = snapped.distanceTo(player.position);
      let score = dist * 1.0;
      if (!canShoot) score += forReload ? 1.0 : 4.2;
      if (full) score -= 1.4;
      if (toThreat < 4) score += 3.0;
      if (toThreat > 26) score += 2.0;
      if (score < bestScore) {
        bestScore = score;
        best = { pos: snapped, full, peek: canShoot ? peek : null };
      }
    }

    if (!best) {
      e.coverPos = null;
      return null;
    }
    e.coverPos = best.pos;
    e.coverFull = best.full;
    e.coverPeek = best.peek;
    e.peeking = false;
    e.peekTimer = 0.35;
    if (!forReload) {
      e._setState(ENEMY_STATE.TAKING_COVER);
      this._setGoal(e, best.pos);
    }
    return best.pos;
  }

  // --- shooting -------------------------------------------------------------

  _aimPoint(player) {
    const crouched = (player.crouchBlend ?? 0) > 0.5;
    return new THREE.Vector3(
      player.position.x,
      player.position.y + (crouched ? 0.72 : 1.12),
      player.position.z
    );
  }

  _raise(v, y) {
    return new THREE.Vector3(v.x, v.y + y, v.z);
  }

  _muzzle(e) {
    const f = e.forward;
    const y = e.crouched ? EYE_HEIGHT * CROUCH_SCALE : EYE_HEIGHT;
    return new THREE.Vector3(
      e.position.x + f.x * 0.34,
      e.position.y + y - 0.1,
      e.position.z + f.z * 0.34
    );
  }

  /** A shot is only ever taken when this returns true. */
  _lineOfFire(e, target) {
    const collision = this.game.collision;
    if (!collision?.raycast) return false;
    const from = this._muzzle(e);
    const dir = new THREE.Vector3().subVectors(target, from);
    const dist = dir.length();
    if (dist < 0.35) return false;
    if (dist > 90) return false;
    dir.divideScalar(dist);
    const hit = collision.raycast(from, dir, dist - 0.05, (c) => {
      if (!c.enabled) return false;
      const tag = c.tag || '';
      if (tag.startsWith('character')) return false; // bodies do not block aim
      if (c.surface === SURFACE.GLASS) return false; // they will shoot through it
      return true;
    });
    return !hit.hit;
  }

  _tryFire(e, dt, target) {
    if (e.reactionTimer > 0) return;
    if (e.ammo <= 0) return;
    const def = e.weaponDef;
    e.shotTimer -= dt;
    e.burstTimer -= dt;

    if (e.burstLeft <= 0) {
      if (e.burstTimer > 0) return;
      const [lo, hi] = this.preset.burst;
      const single = def.fireModes?.includes('bolt') || def.fireModes?.includes('pump');
      e.burstLeft = single ? 1 : lo + Math.floor(e.rng.float() * (hi - lo + 1));
      e.shotTimer = 0;
    }
    if (e.shotTimer > 0) return;

    // Aim tightens the longer the hostile has had eyes on the target.
    const track = Math.min(1, e.trackTime / 1.6);
    const moving = e.speed > 1.2 ? 1.5 : 1;
    const sigma = this._baseAimError(e) * (1.55 - 0.75 * track) * moving
      * (e.crouched ? 0.82 : 1);
    e.aimError = sigma;
    this._shoot(e, target, sigma);

    e.ammo--;
    e.burstLeft--;
    const interval = Math.max(0.06, (def.shotInterval || 0.12));
    e.shotTimer = interval;
    if (e.burstLeft <= 0) {
      const [pl, ph] = this.preset.burstPause;
      e.burstTimer = pl + e.rng.float() * (ph - pl);
    }
    if (e.ammo <= 0) this._beginReload(e);
  }

  _suppressiveFire(e, dt) {
    if (!e.lastKnownPos || e.suppressionFire <= 0) return;
    e.shotTimer -= dt;
    if (e.shotTimer > 0) return;
    const target = this._raise(e.lastKnownPos, 1.05);
    this._faceTowards(e, e.lastKnownPos);
    if (!this._lineOfFire(e, target)) {
      e.suppressionFire = 0;
      return;
    }
    // Deliberately loose: this is about pinning, not hitting.
    this._shoot(e, target, this._baseAimError(e) * 3.2);
    e.ammo--;
    e.suppressionFire--;
    e.shotTimer = Math.max(0.1, (e.weaponDef.shotInterval || 0.14) * 1.6);
    if (e.ammo <= 0) this._beginReload(e);
  }

  /** One round: perturb, resolve against the player capsule, spawn effects. */
  _shoot(e, target, sigma) {
    const def = e.weaponDef;
    const from = this._muzzle(e);
    const base = new THREE.Vector3().subVectors(target, from);
    const dist = base.length() || 1;
    base.divideScalar(dist);

    const yawErr = e.rng.gaussian(0, sigma);
    const pitchErr = e.rng.gaussian(0, sigma);
    const lateral = Math.tan(yawErr) * dist;
    const vertical = Math.tan(pitchErr) * dist;

    const right = new THREE.Vector3(-base.z, 0, base.x).normalize();
    const up = new THREE.Vector3().crossVectors(right, base).normalize();
    const dir = base.clone()
      .addScaledVector(right, Math.tan(yawErr))
      .addScaledVector(up, Math.tan(pitchErr))
      .normalize();

    this.game.effects?.muzzleFlash?.(from, dir, def.family);
    bus.emit(EVT.ENEMY_FIRE, {
      id: e.id, position: from.toArray(), direction: dir.toArray(),
      weapon: def.key, audioId: def.audio?.fire, suppressed: !!def.suppressed,
      loudness: def.loudness,
    });
    bus.emit('world:noise', {
      position: from.toArray(),
      loudness: def.loudness ?? 1,
      radius: def.noiseRadius ?? 30,
      kind: 'gunshot', source: 'enemy', weapon: def.key,
      suppressed: !!def.suppressed, time: this.game.engine?.simTime || this.time,
    });
    e.animator?.playUpper?.('fire');

    const player = this.game.player;
    const hitPlayer = player && player.alive !== false
      && Math.abs(lateral) < 0.32 && vertical < 0.62 && vertical > -0.95;

    if (hitPlayer) {
      const region = vertical > 0.42 ? 'head' : vertical < -0.5 ? 'leg_r' : 'chest';
      const raw = damageAtRange(def, dist)
        * ENEMY_DAMAGE_SCALE
        * this.preset.enemyDamage
        * this.preset.playerDamageTaken
        * Math.min(2.6, regionMultiplier(region));
      const amount = Math.max(2, Math.round(raw));
      player.applyDamage(amount, e.position.clone(), region === 'head' ? 'headshot' : 'bullet');
      this.game.effects?.bloodSpray?.(this._aimPoint(player), dir.clone().negate(), { damage: amount });
      this.game.effects?.tracer?.(from, this._aimPoint(player), def.family);
    } else {
      const hit = this.game.collision?.raycast?.(from, dir, 80, (c) => c.enabled && !(c.tag || '').startsWith('character'));
      const end = hit?.hit ? hit.point : from.clone().addScaledVector(dir, 40);
      this.game.effects?.tracer?.(from, end, def.family);
      if (hit?.hit) {
        this.game.effects?.spawnImpact?.(hit.point, hit.normal, hit.surface || SURFACE.CONCRETE, { weapon: def.key, byEnemy: true });
        bus.emit(EVT.IMPACT, {
          point: hit.point.toArray(), normal: hit.normal.toArray(),
          surface: hit.surface || SURFACE.CONCRETE, weapon: def.key, byEnemy: true,
        });
      }
    }
  }

  // --- movement -------------------------------------------------------------

  _setGoal(e, target) {
    const nav = this.game.nav;
    if (!nav || !target) return false;
    // Halfway down a flight there is no cell under our feet, so a re-plan would
    // snap back to the stair head and send us up again. Finish the flight first.
    if (e.path && nav.stairAt?.(e.position)) {
      e.replanTimer = REPLAN_INTERVAL;
      return true;
    }
    e.goal = toVec3(target);
    const path = nav.findPath(e.position, e.goal);
    if (!path || !path.length) {
      e.path = null;
      return false;
    }
    e.path = path;
    e.pathIndex = resumeIndex(e.position, path);
    e.pathAge = 0;
    e.replanTimer = REPLAN_INTERVAL;
    // The watchdog window is deliberately NOT reset here: a hostile that
    // re-plans on a throttle while wedged must still be detected.
    return true;
  }

  _followPath(e, dt, speed) {
    const path = e.path;
    if (!path || e.pathIndex >= path.length) {
      e.path = null;
      e.velocity.x = 0;
      e.velocity.z = 0;
      return;
    }
    e.pathAge += dt;
    let wp = path[e.pathIndex];
    const dx = wp.x - e.position.x;
    const dz = wp.z - e.position.z;
    const flat = Math.hypot(dx, dz);
    // Doorway waypoints have to be hit tightly or the corner-cut clips a jamb.
    const arrive = Math.abs(wp.y - e.position.y) > 0.6 ? 0.5
      : this.game.nav?.doorIdAt?.(wp) ? 0.24 : 0.36;
    if (flat < arrive) {
      e.pathIndex++;
      if (e.pathIndex >= path.length) {
        e.path = null;
        e.velocity.x = 0;
        e.velocity.z = 0;
        return;
      }
      wp = path[e.pathIndex];
    }

    this._openDoorsAhead(e, wp);
    e.climbY = this._climbTarget(e, wp);

    const dir = new THREE.Vector3(wp.x - e.position.x, 0, wp.z - e.position.z);
    if (dir.lengthSq() > 1e-6) dir.normalize();
    // Soft separation so hostiles do not stack up in a doorway.
    for (const other of this.enemies) {
      if (other === e || !other.alive) continue;
      const ox = e.position.x - other.position.x;
      const oz = e.position.z - other.position.z;
      const d2 = ox * ox + oz * oz;
      if (d2 > 0.62 || d2 < 1e-5) continue;
      const inv = 1 / Math.sqrt(d2);
      dir.x += ox * inv * 0.55;
      dir.z += oz * inv * 0.55;
    }
    if (dir.lengthSq() > 1e-6) dir.normalize();

    e.velocity.x = dir.x * speed;
    e.velocity.z = dir.z * speed;
    e.desiredYaw = Math.atan2(-dir.x, -dir.z);
  }

  /**
   * Height to ease toward while walking a flight, or null on open floor. The
   * traversal itself is `climbStep` in navgrid.js, which explains why a flight
   * cannot be walked with the capsule sweep.
   */
  _climbTarget(e, waypoint) {
    const nav = this.game.nav;
    if (!nav?.stairAt) return null;
    // Heading onto a flight from beside it: the entry band is wide because the
    // central flight can only be entered sideways out of the stairwell aisle.
    if (nav.stairAt(waypoint)) {
      return nav.stairAt(e.position, STAIR_ENTRY_PAD) ? waypoint.y : null;
    }
    // Walking a flight, or stepping off the bottom of one toward the landing.
    // The narrower band still reaches past the footprint, because the capsule
    // overlaps the bottom tread for its own radius beyond the last step.
    return nav.stairAt(e.position, STAIR_SWEEP_PAD) ? waypoint.y : null;
  }

  /**
   * AI opens doors instead of walking through them. Nav marks door cells, so we
   * only ever ask about a door that is genuinely on the route.
   */
  _openDoorsAhead(e, waypoint) {
    const nav = this.game.nav;
    const doors = this.game.doors;
    if (!nav?.doorIdAt || !doors?.get) return;
    const id = nav.doorIdAt(waypoint) || nav.doorIdAt(e.position);
    if (!id) return;
    const door = doors.get(id);
    if (!door || door.isPassable) return;
    const dist = Math.hypot(door.spec.x - e.position.x, door.spec.z - e.position.z);
    if (dist > 1.9) return;
    const last = this._doorCooldown.get(id) || -99;
    if (this.time - last < 1.1) return;
    this._doorCooldown.set(id, this.time);
    // Hostiles have building access, so a badge reader is not an obstacle.
    door.use(false, this.game.engine?.simTime || this.time, true);
    nav.invalidate?.();
  }

  _integrate(e, dt) {
    // Turn toward the desired facing at a state-appropriate rate.
    const turnRate = e.engaged ? 7.5 : 3.4;
    e.yaw = turnToward(e.yaw, e.desiredYaw, turnRate * dt);

    if (!e.path) {
      e.velocity.x *= Math.max(0, 1 - 12 * dt);
      e.velocity.z *= Math.max(0, 1 - 12 * dt);
    }

    // Consumed once per step: any state that stops following a path drops back
    // to the swept move on its very next integration.
    const climbY = e.climbY;
    e.climbY = null;
    if (climbY !== null && climbY !== undefined) {
      e.speed = climbStep(e, dt, climbY) / Math.max(1e-5, dt);
      return;
    }
    // Standing on a flight with nowhere to go — fighting from the stairs, say.
    // The sweep still must not run: a capsule on a tread overlaps the treads
    // above it, the resolver reads that as deep penetration, and it ejects the
    // agent clear of the entire staircase into the open stairwell.
    if (this.game.nav?.stairAt?.(e.position, STAIR_SWEEP_PAD)) {
      e.velocity.x = 0;
      e.velocity.z = 0;
      e.speed = 0;
      e.velocity.y = 0;
      e.grounded = true;
      e.hitWall = false;
      return;
    }

    e.velocity.y -= GRAVITY * dt;
    if (e.velocity.y < -28) e.velocity.y = -28;

    const collision = this.game.collision;
    if (!collision?.moveCapsule) return;
    const before = e.position.clone();
    const res = collision.moveCapsule(e.position, e.velocity, dt, {
      radius: AGENT_RADIUS,
      height: e.crouched ? AGENT_HEIGHT * CROUCH_SCALE : AGENT_HEIGHT,
      stepHeight: 0.34,
      ignore: (c) => (c.tag || '').startsWith('character'),
    });
    // moveCapsule resolves into a fresh vector rather than in place.
    if (res.position) e.position.copy(res.position);
    e.grounded = res.grounded;
    e.hitWall = res.hitWall;
    e.speed = before.distanceTo(e.position) / Math.max(1e-5, dt);

    // Fell out of the world (should not happen; the landing patch closes the
    // only hole) — put them back on the mesh rather than losing them.
    if (e.position.y < -6) {
      const snap = this.game.nav?.nearestWalkable?.(e.homePos, 6) || e.homePos;
      e.position.copy(snap);
      e.velocity.set(0, 0, 0);
    }
  }


  /**
   * Watchdog. A hostile with an active path that has not covered 0.35 m in
   * 2.5 s is stuck: re-plan. Three failures in a row and it is snapped to the
   * nearest walkable cell, which is the last resort and always succeeds.
   */
  _watchdog(e, dt) {
    e.coverTimer = Math.max(0, e.coverTimer - dt);
    e.replanTimer = Math.max(0, e.replanTimer - dt);

    if (!e.path) {
      e.stuckTimer = 0;
      e.wallTimer = 0;
      e._watchPos.copy(e.position);
      return;
    }

    // Fast recovery for the common case: shoulder against a door jamb after
    // cutting a corner. Re-planning from where they actually are fixes it long
    // before the 2.5 s window would.
    if (e.hitWall && e.speed < 0.6) {
      e.wallTimer = (e.wallTimer || 0) + dt;
      if (e.wallTimer > 0.4) {
        e.wallTimer = 0;
        const goal = e.goal;
        e.path = null;
        if (goal) this._setGoal(e, goal);
        return;
      }
    } else {
      e.wallTimer = 0;
    }

    e.stuckTimer += dt;
    if (e.stuckTimer < STUCK_WINDOW) return;
    const moved = e._watchPos.distanceTo(e.position);
    e.stuckTimer = 0;
    e._watchPos.copy(e.position);
    if (moved >= STUCK_DISTANCE) {
      e.stuckFails = 0;
      return;
    }
    e.stuckFails++;
    if (e.stuckFails < STUCK_LIMIT) {
      const goal = e.goal || e.homePos;
      e.path = null;
      this.game.nav?.invalidate?.();
      if (!this._setGoal(e, goal)) {
        const detour = this.game.nav?.randomPointNear?.(e.position, 3.5, e.rng);
        if (detour) this._setGoal(e, detour);
      }
      return;
    }
    const snap = this.game.nav?.nearestWalkable?.(e.position, 6);
    if (snap) {
      e.position.copy(snap);
      this.game.collision?.resolveOverlap?.(e.position, AGENT_RADIUS, AGENT_HEIGHT);
    }
    e.velocity.set(0, 0, 0);
    e.stuckFails = 0;
    e.path = null;
  }

  _faceTowards(e, point) {
    const dx = point.x - e.position.x;
    const dz = point.z - e.position.z;
    if (dx * dx + dz * dz < 1e-5) return;
    e.desiredYaw = Math.atan2(-dx, -dz);
  }

  // ----------------------------------------------------------- squad comms --

  /**
   * Radio alert: everyone inside the preset's radius learns the position,
   * regardless of walls, because it is a radio and not a shout. Enough alerts
   * and the whole facility starts hunting.
   */
  raiseAlert(source, position, reason = 'contact') {
    const pos = position ? groundPoint(position) : null;
    this.alertCount++;
    const radius = this.preset.alertRadius;
    let notified = 0;
    for (const e of this.enemies) {
      if (!e.alive || e === source) continue;
      if (pos && e.position.distanceTo(source ? source.position : pos) > radius) continue;
      if (pos) e.lastKnownPos = groundPoint(pos);
      e.awareness = Math.max(e.awareness, AWARENESS.ALERTED + 0.12);
      notified++;
      if (!e.engaged && !e.committed && e.state !== ENEMY_STATE.INVESTIGATE && pos) {
        this._beginInvestigate(e, pos, true);
      }
    }
    if (this.alertCount === 1) this.bark(source, 'radio');
    if (!this.facilityLoud && this.alertCount >= this.preset.alertsToGoLoud) this.goLoud(pos);
    bus.emit(EVT.ENEMY_ALERT, {
      id: source?.id || null,
      reason,
      position: pos ? pos.toArray() : null,
      notified,
      alertCount: this.alertCount,
      facilityLoud: this.facilityLoud,
    });
    return notified;
  }

  /** Facility-wide hunt: everyone gets the position and starts moving. */
  goLoud(position = null) {
    if (this.facilityLoud) return;
    this.facilityLoud = true;
    const pos = position ? groundPoint(position) : groundPoint(this.game.player?.position);
    for (const e of this.enemies) {
      if (!e.alive) continue;
      e.awareness = Math.max(e.awareness, AWARENESS.ALERTED + 0.2);
      e.alert = 1;
      if (pos && !e.engaged && !e.committed) this._beginInvestigate(e, pos, true);
    }
    bus.emit(EVT.ANNOUNCE, {
      title: 'FACILITY ALERT',
      subtitle: 'Hostiles are sweeping the building',
      tone: 'danger',
    });
    const speaker = this.enemies.find((e) => e.alive);
    if (speaker) this.bark(speaker, 'loud');
  }

  onDeath(e, info = {}) {
    this.kills++;
    if (e.collider) {
      this.game.collision?.remove?.(e.collider);
      e.collider = null;
    }
    this._dropWeapon(e);
    bus.emit(EVT.ENEMY_DEATH, {
      enemy: e, id: e.id, variant: e.variant,
      position: e.position.toArray(),
      region: info.region || 'chest',
      byPlayer: info.byPlayer !== false,
      audioId: 'enemy_death',
    });
    // The squad notices a body dropping.
    const from = info.from ? toVec3(info.from) : (this.game.player?.position?.clone() || null);
    let witness = null;
    for (const other of this.enemies) {
      if (!other.alive) continue;
      const d = other.position.distanceTo(e.position);
      if (d > this.preset.alertRadius) continue;
      if (!witness || d < witness.position.distanceTo(e.position)) witness = other;
    }
    if (witness) this.bark(witness, 'down');
    this.raiseAlert(e, from || e.position, 'death');
  }

  _dropWeapon(e) {
    const model = e.model;
    const weapon = model?.weapon;
    if (!weapon || !this.game.scene) return;
    weapon.updateWorldMatrix(true, false);
    const worldPos = new THREE.Vector3().setFromMatrixColumn(weapon.matrixWorld, 3);
    model.attachWeapon(null);
    weapon.position.set(worldPos.x, Math.max(e.position.y + 0.06, worldPos.y - 0.4), worldPos.z);
    weapon.rotation.set(0, e.yaw + 0.8, Math.PI / 2);
    this.game.scene.add(weapon);
    e.droppedWeapon = weapon;
  }

  /**
   * Ask for a bark. Nothing is spoken here: the line goes into a single-slot
   * queue that `_drainBarks` empties one line at a time, `BARK_GAP` apart, so a
   * squad that all reacts on the same tick produces one call and not three
   * overlapping subtitles.
   *
   * Rejected when the speaker is still on its own cooldown, when it or a
   * squad-mate has used the same line recently, or when something more urgent is
   * already waiting to be said.
   *
   * @param {Enemy} e speaker
   * @param {string} line key into LINES; also the audio id and the priority key
   * @param {*} [arg] passed through to the line builder (a room name, so far)
   * @returns {boolean} whether the line was queued
   */
  bark(e, line, arg = null) {
    if (!e || !e.alive) return false;
    const make = LINES[line];
    if (!make) return false;
    if (e.voiceTimer > 0) return false;
    if (this.time - (e.lineTimes.get(line) ?? -1e9) < LINE_REPEAT_COOLDOWN) return false;
    const priority = BARK_PRIORITY[line] ?? 20;
    const chatter = priority <= CHATTER_CEILING;
    const squadCooldown = chatter ? CHATTER_SQUAD_COOLDOWN : SQUAD_LINE_COOLDOWN;
    if (this.time - (this._squadLines.get(line) ?? -1e9) < squadCooldown) return false;
    if (chatter && this.time - this._lastChatter < CHATTER_GAP) return false;
    if (this._pendingBark && this._pendingBark.priority >= priority) return false;
    this._pendingBark = {
      e, line, priority, at: this.time, text: make(this.voiceRng, arg),
    };
    return true;
  }

  /** Speak at most one queued line per `BARK_GAP`, dropping anything stale. */
  _drainBarks(dt) {
    this._barkGap = Math.max(0, this._barkGap - dt);
    const b = this._pendingBark;
    if (!b) return;
    if (this.time - b.at > BARK_STALE || !b.e.alive) {
      this._pendingBark = null;
      return;
    }
    if (this._barkGap > 0) return;
    this._pendingBark = null;
    this._barkGap = BARK_GAP;
    b.e.voiceTimer = VOICE_COOLDOWN;
    b.e.lineTimes.set(b.line, this.time);
    this._squadLines.set(b.line, this.time);
    if (b.priority <= CHATTER_CEILING) this._lastChatter = this.time;
    bus.emit(EVT.ENEMY_VOICE, {
      id: b.e.id,
      line: b.line,
      text: b.text,
      position: b.e.position.toArray(),
      variant: b.e.variant,
      audioId: `voice_enemy_${b.line}`,
    });
  }

  // -------------------------------------------------------------- hitboxes --

  /**
   * World-space hit regions, refreshed on the fixed step so the player's shots
   * resolve identically at any frame rate. CombatSystem reads
   * `enemy.hitRegions[i].center` / `.size` / `.damageMultiplier`.
   */
  _updateRegions(e) {
    const scale = e.alive ? (e.crouched ? CROUCH_SCALE : 1) : 0.24;
    const s = Math.sin(e.yaw);
    const c = Math.cos(e.yaw);
    // Right vector for yaw where forward is (-sin, 0, -cos).
    const rx = -c;
    const rz = s;
    for (const r of e.hitRegions) {
      const lay = r.layout;
      r.center.set(
        e.position.x + rx * lay.side,
        e.position.y + lay.y * scale,
        e.position.z + rz * lay.side
      );
      r.size.set(lay.sx, lay.sy * scale, lay.sz);
      r.halfExtents.set(lay.sx * 0.5, lay.sy * scale * 0.5, lay.sz * 0.5);
    }
    e.eyeHeight = EYE_HEIGHT * scale;
  }

  // ---------------------------------------------------------------- visuals --

  updateVisual(dt) {
    const camera = this.game.camera;
    for (const e of this.enemies) {
      const group = e.group;
      if (!group) continue;
      group.position.copy(e.position);
      group.rotation.y = e.yaw;
      if (camera) e.model?.updateLOD?.(camera.position, e._lodBias);

      const animator = e.animator;
      if (!animator) continue;
      if (!e.alive) {
        if (e.deathTimer > 1.35) animator.breathe = false;
        animator.update(dt, { speed: 0, aiming: false, crouched: false });
        continue;
      }
      const clip = this._clipFor(e);
      if (clip) animator.play(clip, { fade: clip.startsWith('death') ? 0.05 : 0.18 });
      if (e.flinchTimer > 0.2 && !e.engaged) animator.playUpper?.('flinch');
      animator.update(dt, {
        speed: e.speed,
        aiming: e.engaged,
        crouched: e.crouched,
        armsBusy: true,
      });
    }
    if (this._revealUntil > 0 && this.time > this._revealUntil) {
      this._revealUntil = -1;
      for (const e of this.enemies) e.revealed = false;
    }
  }

  _clipFor(e) {
    if (e.speed > 0.35) {
      if (e.crouched) return 'crouch_walk';
      return e.speed > 2.6 ? 'run' : 'walk';
    }
    switch (e.state) {
      case ENEMY_STATE.BLINDED: return 'crouch_idle';
      case ENEMY_STATE.SUPPRESSED: return 'take_cover';
      case ENEMY_STATE.TAKING_COVER: return e.crouched ? 'take_cover' : 'aim';
      case ENEMY_STATE.RELOADING: return e.crouched ? 'crouch_idle' : 'aim';
      case ENEMY_STATE.COMBAT:
      case ENEMY_STATE.FLANKING:
      case ENEMY_STATE.RETREATING:
      case ENEMY_STATE.SUSPICIOUS: return e.crouched ? 'crouch_idle' : 'aim';
      case ENEMY_STATE.INVESTIGATE: return 'investigate';
      case ENEMY_STATE.SEARCH: return 'search';
      default: return 'guard';
    }
  }

  /** QA: mark every hostile as visible through geometry for `seconds`. */
  revealAll(seconds = 8) {
    this._revealUntil = this.time + Math.max(0, seconds);
    for (const e of this.enemies) e.revealed = true;
    return this._revealUntil;
  }

  // ------------------------------------------------------------------- state --

  toJSON(eyePos, forward) {
    const eye = eyePos ? toVec3(eyePos) : null;
    const fwd = forward ? toVec3(forward) : null;
    const out = [];
    for (const e of this.enemies) {
      const distance = eye ? eye.distanceTo(e.position) : null;
      let visible = false;
      if (eye && e.alive) {
        const to = new THREE.Vector3(e.position.x, e.position.y + 1.2, e.position.z).sub(eye);
        const d = to.length() || 1;
        to.divideScalar(d);
        const facing = !fwd || to.dot(fwd) > 0.15;
        visible = facing && (this.game.collision?.lineOfSight?.(eye, new THREE.Vector3(e.position.x, e.position.y + 1.2, e.position.z)) ?? false);
      }
      out.push({
        id: e.id,
        variant: e.variant,
        state: e.state,
        alive: e.alive,
        health: Math.max(0, Math.round(e.health)),
        maxHealth: e.maxHealth,
        position: [+e.position.x.toFixed(2), +e.position.y.toFixed(2), +e.position.z.toFixed(2)],
        yaw: +e.yaw.toFixed(3),
        room: e.room?.id || null,
        awareness: +e.awareness.toFixed(3),
        alerted: e.awareness >= AWARENESS.ALERTED,
        weapon: e.weaponKey,
        ammo: e.ammo,
        blindRemaining: +e.blindRemaining.toFixed(2),
        hasPath: !!e.path,
        ...(distance !== null ? { distance: +distance.toFixed(2), visible } : {}),
        ...(e.revealed ? { revealed: true } : {}),
      });
    }
    out.sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));
    return {
      count: this.enemies.length,
      alive: this.enemies.filter((e) => e.alive).length,
      neutralised: this.enemies.filter((e) => !e.alive).length,
      alertCount: this.alertCount,
      facilityLoud: this.facilityLoud,
      difficulty: this.difficulty,
      list: out,
    };
  }
}

// ------------------------------------------------------------------ helpers --

/**
 * Hit-box layout in body space: `side` is the offset along the hostile's right
 * vector, `y` the centre height above the feet. Boxes are axis-aligned in world
 * space, which is what CombatSystem's slab test wants.
 */
function makeRegions() {
  const layout = [
    { name: 'head', side: 0, y: 1.60, sx: 0.24, sy: 0.26, sz: 0.26, mult: 4.0 },
    { name: 'chest', side: 0, y: 1.26, sx: 0.46, sy: 0.40, sz: 0.30, mult: 1.0 },
    { name: 'stomach', side: 0, y: 0.96, sx: 0.38, sy: 0.28, sz: 0.27, mult: 1.25 },
    { name: 'arm_l', side: -0.31, y: 1.20, sx: 0.16, sy: 0.60, sz: 0.18, mult: 0.75 },
    { name: 'arm_r', side: 0.31, y: 1.20, sx: 0.16, sy: 0.60, sz: 0.18, mult: 0.75 },
    { name: 'leg_l', side: -0.13, y: 0.46, sx: 0.21, sy: 0.92, sz: 0.23, mult: 0.75 },
    { name: 'leg_r', side: 0.13, y: 0.46, sx: 0.21, sy: 0.92, sz: 0.23, mult: 0.75 },
  ];
  return layout.map((l) => ({
    name: l.name,
    layout: l,
    center: new THREE.Vector3(),
    size: new THREE.Vector3(l.sx, l.sy, l.sz),
    halfExtents: new THREE.Vector3(l.sx / 2, l.sy / 2, l.sz / 2),
    damageMultiplier: l.mult,
  }));
}

function toVec3(v) {
  if (!v) return new THREE.Vector3();
  if (v.isVector3) return v.clone();
  if (Array.isArray(v)) return new THREE.Vector3(v[0] || 0, v[1] || 0, v[2] || 0);
  return new THREE.Vector3(v.x || 0, v.y || 0, v.z || 0);
}

/**
 * Drop a remembered position onto the floor of its storey. Everything that
 * feeds `lastKnownPos` is not necessarily foot-level — a gunshot on the noise
 * bus carries the muzzle height of the weapon that made it — and the value is
 * then used both as a nav goal and as the base for a +1.05 m aim point, so a
 * raised source would have hostiles suppressing thin air above the player.
 */
function groundPoint(v) {
  const p = toVec3(v);
  p.y = FLOOR_Y[floorForY(p.y)] ?? 0;
  return p;
}

function turnToward(current, target, maxStep) {
  let diff = target - current;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  if (Math.abs(diff) <= maxStep) return target;
  return current + Math.sign(diff) * maxStep;
}

function fmt(v) {
  return `(${v.x.toFixed(2)}, ${v.y.toFixed(2)}, ${v.z.toFixed(2)})`;
}

// A body standing in a narrow walk-through aperture seals it: a 1.05 m doorway
// with a 0.6 m hostile in it leaves less gap than the player capsule is wide,
// and since bodies are solid the route through simply closes. Wide arches are
// exempt because there is room to walk past.
const DOORWAY_MAX_WIDTH = 2.0;
const DOORWAY_DEPTH = 0.9;
const DOORWAY_TYPES = new Set(['door', 'doubledoor', 'arch']);
let doorwayBoxes = null;

/** True when standing at `v` would seal a narrow doorway. */
function inDoorway(v) {
  if (!v) return false;
  for (const d of doorwayFootprints()) {
    if (Math.abs(v.y - d.y) > 1.5) continue;
    if (v.x < d.x0 || v.x > d.x1 || v.z < d.z0 || v.z > d.z1) continue;
    return true;
  }
  return false;
}

/** Footprints, cached, of every aperture too narrow to share with a body. */
function doorwayFootprints() {
  if (doorwayBoxes) return doorwayBoxes;
  doorwayBoxes = [];
  for (const o of OPENINGS) {
    if (!DOORWAY_TYPES.has(o.type)) continue;
    if ((o.sill ?? 0) > 0.3) continue;
    if ((o.width ?? 0) > DOORWAY_MAX_WIDTH) continue;
    const half = o.width * 0.5;
    const box = o.axis === 'x'
      ? { x0: o.at - half, x1: o.at + half, z0: o.coord - DOORWAY_DEPTH, z1: o.coord + DOORWAY_DEPTH }
      : { x0: o.coord - DOORWAY_DEPTH, x1: o.coord + DOORWAY_DEPTH, z0: o.at - half, z1: o.at + half };
    box.id = o.id;
    box.y = FLOOR_Y[o.floor] ?? 0;
    doorwayBoxes.push(box);
  }
  return doorwayBoxes;
}

/** The spoken name of a room, e.g. "the cubicles". Empty when unknown. */
function shortRoom(room) {
  if (!room) return '';
  return ROOM_CALL[room.id] || '';
}

export default EnemyManager;
