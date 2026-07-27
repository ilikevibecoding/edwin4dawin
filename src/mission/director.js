import * as THREE from 'three';
import { bus, EVT } from '../core/events.js';
import { garageShutter } from '../map/kit.js';
import { assets } from '../core/assets.js';
import { MAT } from '../art/materials.js';
import { SURFACE } from '../physics/world.js';
import { EXTRACTION, HOSTAGE_POINTS, roomAt, floorForY } from '../map/layout.js';
import { HOSTAGE_STATE, insideExtraction } from '../ai/hostages.js';
import {
  OBJECTIVE_STATE, buildObjectives, difficultyPreset,
} from './objectives.js';

// ---------------------------------------------------------------------------
// Mission director.  (owner: opus3)
//
// Owns the beat structure of a run:
//
//   infiltrate -> locate hostage A -> secure A -> locate hostage B -> secure B
//   -> raise the vehicle bay shutter -> escort both into the bay
//   -> hold the bay until the pickup completes -> victory
//
// It also owns the three things that flow required but nothing else built: the
// garage shutter (mesh + collider + animation, driven through DoorSystem so
// the player's normal door prompt works on it), the mission clock, and the
// end-of-run result payload.
//
// Objective conditions are re-evaluated every step rather than latched by a
// script, so completing beats out of order (securing the mezzanine hostage
// first, for instance) can never wedge the chain.
// ---------------------------------------------------------------------------

const HOSTAGE_A = HOSTAGE_POINTS[0]?.id || 'hostage-a';
const HOSTAGE_B = HOSTAGE_POINTS[1]?.id || 'hostage-b';

const LOCATE_RADIUS = 9;      // how close counts as "found them"
const DEATH_BEAT = 1.2;       // let a death animation read before the end card
const AUTO_PICKUP_DELAY = 1.5; // grace before the hold starts on its own
const TIMER_WARNINGS = [180, 60, 30];

// =========================================================================
// Garage shutter
// =========================================================================

/**
 * The vehicle bay roller shutter. Duck-types `map/doors.js` Door closely
 * enough to live in `DoorSystem.doors`, which gets it animated, reset, put in
 * the door text-state, and reachable through the player's own door prompt.
 */
class GarageShutter {
  constructor(spec, collision, scene) {
    this.spec = spec;
    this.id = spec.id;
    this.collision = collision;
    this.state = 'closed';
    this.initialState = 'closed';
    this.openAmount = 0;
    this.targetAmount = 0;
    this.locked = false;
    this.damaged = false;
    this.health = 900;
    this.lastUseTime = -99;
    this.leaves = [];
    this.userData = { open: 0 };

    this.group = new THREE.Group();
    this.group.name = `shutter:${spec.id}`;
    this.group.position.set(spec.x, spec.y, spec.z);
    this.group.rotation.y = spec.rotY || 0;
    this._curtain = null;
    this._meshStep = -1;
    this._material = MAT?.metalPainted
      || new THREE.MeshStandardMaterial({ color: 0x6b7076, roughness: 0.55, metalness: 0.6 });
    this._buildMesh();
    scene?.add?.(this.group);

    this.colliders = [];
    this._makeColliders();
    this._applyCollision();
  }

  _buildMesh() {
    // `garageShutter` bakes the slat count from `open`, so the curtain is
    // rebuilt in twelfths as it rises. That is ~12 rebuilds per run.
    const step = Math.round(THREE.MathUtils.clamp(this.openAmount, 0, 1) * 12) / 12;
    if (step === this._meshStep) return;
    this._meshStep = step;
    if (this._curtain) {
      this.group.remove(this._curtain);
      disposeTree(this._curtain);
      this._curtain = null;
    }
    try {
      this._curtain = garageShutter({
        width: this.spec.width,
        height: this.spec.height,
        material: this._material,
        open: step,
      });
      this.group.add(this._curtain);
      assets.tag(this._curtain, 'ARCH-GARAGE-SHUTTER');
    } catch (err) {
      console.warn('[mission] shutter mesh failed', err);
    }
    this.userData.open = this.openAmount;
    this.group.userData.open = this.openAmount;
  }

  _makeColliders() {
    if (!this.collision?.add) return;
    const s = this.spec;
    const isZ = s.axis === 'z';
    const half = s.width / 2;
    const c = this.collision.add({
      min: [s.x - (isZ ? 0.08 : half), s.y, s.z - (isZ ? half : 0.08)],
      max: [s.x + (isZ ? 0.08 : half), s.y + s.height, s.z + (isZ ? half : 0.08)],
      surface: SURFACE.METAL,
      // The `door:` prefix is what NavGrid and the bullet filters already
      // understand for a moving opening.
      tag: `door:${this.id}`,
      dynamic: true,
      blocksSight: true,
      ref: this,
    });
    this.colliders = c ? [c] : [];
  }

  _applyCollision() {
    const c = this.colliders[0];
    if (!c) return;
    c.enabled = this.openAmount < 0.5;
    c.blocksSight = this.openAmount < 0.35;
  }

  get isOpen() {
    return this.openAmount > 0.55;
  }

  get isPassable() {
    return this.openAmount > 0.5;
  }

  /** Any use raises it; a shutter this size is not a door you swing shut. */
  use(byPlayer = true, atTime = 0) {
    this.lastUseTime = atTime;
    if (this.targetAmount > 0.5) return this.isOpen ? 'open' : 'opening';
    this.open();
    bus.emit(EVT.DOOR_STATE, { id: this.id, state: 'opening', door: this, byPlayer, shutter: true });
    return 'opening';
  }

  open() {
    if (this.targetAmount > 0.5) return false;
    this.targetAmount = 1;
    this.state = 'opening';
    return true;
  }

  forceOpen(amount = 1) {
    this.targetAmount = THREE.MathUtils.clamp(amount, 0, 1);
    this.state = this.targetAmount > 0.5 ? 'opening' : 'closing';
  }

  /** Rounds and blast just dent painted steel. */
  damage() {}

  update(dt) {
    if (Math.abs(this.openAmount - this.targetAmount) <= 0.0005) return;
    const dir = Math.sign(this.targetAmount - this.openAmount);
    this.openAmount = THREE.MathUtils.clamp(this.openAmount + dir * 0.35 * dt, 0, 1);
    this._buildMesh();
    this._applyCollision();
    if (Math.abs(this.openAmount - this.targetAmount) <= 0.0005) {
      this.openAmount = this.targetAmount;
      this.state = this.openAmount > 0.5 ? 'open' : 'closed';
      bus.emit(EVT.DOOR_STATE, { id: this.id, state: this.state, door: this, settled: true, shutter: true });
    }
  }

  reset() {
    this.openAmount = 0;
    this.targetAmount = 0;
    this.state = 'closed';
    this.locked = false;
    this.damaged = false;
    this._buildMesh();
    this._applyCollision();
  }

  toJSON(playerPos) {
    const d = playerPos ? Math.hypot(this.spec.x - playerPos.x, this.spec.z - playerPos.z) : null;
    return {
      id: this.id,
      state: this.state,
      open: +this.openAmount.toFixed(2),
      locked: false,
      damaged: false,
      shutter: true,
      position: [+this.spec.x.toFixed(2), +this.spec.y.toFixed(2), +this.spec.z.toFixed(2)],
      ...(d !== null ? { distance: +d.toFixed(2) } : {}),
    };
  }
}

// =========================================================================
// Director
// =========================================================================

export class MissionDirector {
  constructor(game) {
    this.game = game;
    this.difficulty = game?.difficulty || 'operator';
    this.preset = difficultyPreset(this.difficulty);

    this.objectives = buildObjectives();
    this._byId = new Map(this.objectives.map((o) => [o.id, o]));

    this.timeLimit = this.preset.missionTime;
    this.timeRemaining = this.timeLimit;
    this.elapsed = 0;
    this.extractionHold = this.preset.extractionHold;
    this.holdRemaining = this.extractionHold;
    this.holding = false;
    this.pickupCalled = false;
    this.readyTimer = 0;

    this.intelRevealed = false;
    this.garageRequested = false;
    this._outcome = null;
    this.endReason = null;
    this.endPayload = null;
    this._pendingDefeat = null;
    this._announced = new Set();
    this._warned = new Set();
    this._lost = new Set();

    // A runtime level repair used to run here to work around apertures that the
    // map builder cut at the mirror of their doorway. That bug is fixed at the
    // source, every walk-through opening is passable as built, and the repair
    // is gone.
    this.levelRepair = null;

    this.shutter = this._installShutter();

    this._offs = [
      bus.on(EVT.PLAYER_DEATH, () => this._onPlayerDeath()),
      bus.on(EVT.HOSTAGE_STATE, (p) => this._onHostageState(p)),
    ];
    this.reset(this.difficulty);
  }

  dispose() {
    for (const off of this._offs) off?.();
    this._offs.length = 0;
  }

  get outcome() {
    return this._outcome;
  }

  get hostagesTotal() {
    return this.game.hostages?.list?.length ?? HOSTAGE_POINTS.length;
  }

  get garageOpen() {
    return !!this.shutter?.isOpen;
  }

  // ------------------------------------------------------------------ setup

  /**
   * Nothing else builds the `DOOR-GARAGE` shutter spec — `DoorSystem` skips
   * it deliberately. Build it here and register it so doors, weather, the
   * player prompt and the text state all treat it as a normal opening.
   */
  _installShutter() {
    const spec = this.game.level?.doorSpecs?.get?.('DOOR-GARAGE');
    if (!spec) return null;
    const existing = this.game.doors?.get?.('DOOR-GARAGE');
    if (existing) return existing;
    let shutter = null;
    try {
      shutter = new GarageShutter(spec, this.game.collision, this.game.scene);
    } catch (err) {
      console.warn('[mission] shutter build failed', err);
      return null;
    }
    // Registering means DoorSystem.update()/reset() drive it for us.
    this.game.doors?.doors?.set?.(shutter.id, shutter);
    return shutter;
  }

  // ------------------------------------------------------------------ reset

  /** Absolutely everything this file owns goes back to its initial state. */
  reset(difficulty = this.difficulty) {
    this.difficulty = difficulty || this.difficulty;
    this.preset = difficultyPreset(this.difficulty);

    this.objectives = buildObjectives();
    this._byId = new Map(this.objectives.map((o) => [o.id, o]));

    this.timeLimit = this.preset.missionTime;
    this.timeRemaining = this.timeLimit;
    this.elapsed = 0;
    this.extractionHold = this.preset.extractionHold;
    this.holdRemaining = this.extractionHold;
    this.holding = false;
    this.pickupCalled = false;
    this.readyTimer = 0;

    this.intelRevealed = false;
    this.garageRequested = false;
    this._outcome = null;
    this.endReason = null;
    this.endPayload = null;
    this._pendingDefeat = null;
    this._announced.clear();
    this._warned.clear();
    this._lost.clear();

    // The shutter may already be closed by DoorSystem.reset(); make sure.
    this.shutter?.reset?.();

    this._activate();
    bus.emit(EVT.MISSION_START, {
      difficulty: this.difficulty,
      timeLimit: this.timeLimit,
      hostages: this.hostagesTotal,
      objectives: this.objectives.map((o) => ({ id: o.id, text: o.text, state: o.state })),
    });
    this._announce('brief', 'NORTHSTAR RESCUE', 'Two hostages inside. Bring them both out.', 'info');
    return this;
  }

  // ----------------------------------------------------------------- update

  update(dt) {
    if (dt <= 0 || !this.game.levelReady) return;
    if (this.game.state !== 'playing') return;

    if (this._pendingDefeat) {
      this._pendingDefeat.delay -= dt;
      if (this._pendingDefeat.delay <= 0) {
        const reason = this._pendingDefeat.reason;
        this._pendingDefeat = null;
        this._finish('defeat', reason);
      }
      return;
    }
    if (this._outcome) return;

    this.elapsed += dt;
    this.timeRemaining = Math.max(0, this.timeRemaining - dt);

    this._evaluate();
    this._extraction(dt);
    this._checkFailure();
    this._timerWarnings();
  }

  // ------------------------------------------------------- objective status

  _hostage(id) {
    return this.game.hostages?.list?.find((h) => h.id === id) || null;
  }

  _found(id) {
    const h = this._hostage(id);
    if (!h) return false;
    if (h.revealed || h.secured || !h.alive) return true;
    const player = this.game.player;
    if (!player) return false;
    return h.position.distanceTo(player.position) <= LOCATE_RADIUS;
  }

  _securedAlive(id) {
    const h = this._hostage(id);
    return !!h && h.alive && h.secured;
  }

  _inside() {
    const player = this.game.player;
    if (!player) return false;
    const room = roomAt(player.position.x, player.position.z, floorForY(player.position.y));
    return !!room && room.zone !== 'exterior';
  }

  /** Every living hostage is secured and standing in the bay. */
  _hostagesStaged() {
    const list = this.game.hostages?.list || [];
    if (!list.length) return false;
    for (const h of list) {
      if (!h.alive) return false;
      if (!h.secured) return false;
      if (h.state !== HOSTAGE_STATE.EXTRACTED && !insideExtraction(h.position)) return false;
    }
    return true;
  }

  _condition(id) {
    switch (id) {
      case 'infiltrate': return this._inside();
      case 'locate-hostage-a': return this._found(HOSTAGE_A);
      case 'secure-hostage-a': return this._securedAlive(HOSTAGE_A);
      case 'locate-hostage-b': return this._found(HOSTAGE_B);
      case 'secure-hostage-b': return this._securedAlive(HOSTAGE_B);
      case 'open-garage': return this.garageOpen;
      case 'escort-hostages': return this._hostagesStaged();
      case 'hold-extraction': return this._outcome === 'victory';
      default: return false;
    }
  }

  /** Latch anything whose condition now holds, then re-pick the active beat. */
  _evaluate() {
    for (const o of this.objectives) {
      if (o.state === OBJECTIVE_STATE.DONE || o.state === OBJECTIVE_STATE.FAILED) continue;
      if (!this._condition(o.id)) continue;
      this._complete(o);
    }
    this._activate();
  }

  _complete(o) {
    if (o.state === OBJECTIVE_STATE.DONE || o.state === OBJECTIVE_STATE.FAILED) return;
    o.state = OBJECTIVE_STATE.DONE;
    o.completedAt = +this.elapsed.toFixed(2);
    bus.emit(EVT.OBJECTIVE_UPDATE, {
      id: o.id, state: o.state, text: o.text,
      announce: `Objective complete — ${o.text}`,
      tone: 'good',
      position: o.marker.slice(),
    });
    this._beat(o.id);
  }

  _fail(o, reason) {
    if (!o || o.state === OBJECTIVE_STATE.FAILED) return;
    o.state = OBJECTIVE_STATE.FAILED;
    o.failedAt = +this.elapsed.toFixed(2);
    bus.emit(EVT.OBJECTIVE_UPDATE, {
      id: o.id, state: o.state, text: o.text,
      announce: `Objective failed — ${o.text}`,
      tone: 'alert',
      reason: reason || null,
      position: o.marker.slice(),
    });
  }

  /** Exactly one pending objective is `active`: the first one still open. */
  _activate() {
    let active = null;
    for (const o of this.objectives) {
      if (o.state === OBJECTIVE_STATE.DONE || o.state === OBJECTIVE_STATE.FAILED) continue;
      if (!active) {
        active = o;
        o.state = OBJECTIVE_STATE.ACTIVE;
      } else if (o.state === OBJECTIVE_STATE.ACTIVE) {
        o.state = OBJECTIVE_STATE.PENDING;
      }
    }
    this.activeObjective = active;
    return active;
  }

  /** One-off flavour for each completed beat. */
  _beat(id) {
    switch (id) {
      case 'infiltrate':
        this._announce('beat:in', 'INSIDE', 'Two hostages. Find them before the crew moves them.', 'info');
        break;
      case 'secure-hostage-a':
      case 'secure-hostage-b': {
        const h = this._hostage(id === 'secure-hostage-a' ? HOSTAGE_A : HOSTAGE_B);
        this._announce(`beat:${id}`, `${h?.name || 'Hostage'} SECURE`, 'Keep them behind you.', 'good');
        if (this._securedAlive(HOSTAGE_A) && this._securedAlive(HOSTAGE_B)) {
          this._announce('beat:both', 'BOTH HOSTAGES SECURE', 'Raise the vehicle bay shutter and get out.', 'good');
        }
        break;
      }
      case 'open-garage':
        this._announce('beat:bay', 'BAY DOOR OPEN', 'Extraction point is live.', 'good');
        break;
      case 'escort-hostages':
        this._announce('beat:staged', 'HOSTAGES IN THE BAY', 'Hold the bay until the vehicle is loaded.', 'good');
        break;
      default:
        break;
    }
  }

  // ---------------------------------------------------------- extraction --

  _extraction(dt) {
    const hostages = this.game.hostages;
    const player = this.game.player;
    if (!hostages || !player) return;

    // The bay opening is the cue for the hostages to break for the vehicle.
    if (this.garageOpen && this._securedAlive(HOSTAGE_A) && this._securedAlive(HOSTAGE_B)) {
      hostages.beginExtraction?.();
    }

    const ready = this.garageOpen && this._hostagesStaged() && insideExtraction(player.position);
    if (!ready) {
      this.readyTimer = 0;
      if (this.holding) {
        this.holding = false;
        this._announce('hold:break', 'PICKUP HELD', 'Everyone back in the bay.', 'alert', 'hold:start');
      }
      // Losing the zone costs progress but does not wipe it.
      this.holdRemaining = Math.min(this.extractionHold, this.holdRemaining + dt * 0.5);
      return;
    }

    this.readyTimer += dt;
    if (!this.holding && (this.pickupCalled || this.readyTimer >= AUTO_PICKUP_DELAY)) {
      this.holding = true;
      this._announce('hold:start', 'EXTRACTION INBOUND', `Hold the bay for ${Math.round(this.extractionHold)} seconds`, 'info', 'hold:break');
    }
    if (!this.holding) return;

    this.holdRemaining = Math.max(0, this.holdRemaining - dt);
    if (this.holdRemaining <= 0) {
      this.game.hostages?.markExtracted?.();
      this._complete(this._byId.get('escort-hostages'));
      this._finish('victory', 'hostagesExtracted');
    }
  }

  // ------------------------------------------------------------- failure --

  _checkFailure() {
    if (this._outcome || this._pendingDefeat) return;
    const player = this.game.player;
    if (player && player.alive === false) {
      this._pendingDefeat = { reason: 'playerDead', delay: DEATH_BEAT };
      return;
    }
    for (const h of this.game.hostages?.list || []) {
      if (!h.alive) {
        this._loseHostage(h);
        return;
      }
    }
    if (this.timeRemaining <= 0) {
      this._announce('timeout', 'OUT OF TIME', 'The storm window has closed', 'danger');
      this._pendingDefeat = { reason: 'timeout', delay: 0.4 };
    }
  }

  /**
   * Counted once per hostage per run. The tally lives here rather than as a flag
   * on the hostage so that `reset` alone is enough to forget it.
   */
  _loseHostage(h) {
    if (!h || this._lost.has(h.id)) return;
    this._lost.add(h.id);
    const which = h.id === HOSTAGE_B ? 'b' : 'a';
    this._fail(this._byId.get(`secure-hostage-${which}`), 'hostageDead');
    this._fail(this._byId.get('escort-hostages'), 'hostageDead');
    this._announce(`lost:${h.id}`, 'HOSTAGE LOST', `${h.name || 'A hostage'} is down`, 'danger');
    if (!this._pendingDefeat && !this._outcome) {
      this._pendingDefeat = { reason: 'hostageDead', delay: DEATH_BEAT };
    }
  }

  /** Called by HostageManager the moment a hostage dies. */
  onHostageLost(h) {
    this._loseHostage(h);
  }

  _onHostageState(p) {
    const state = String(p?.state || '').toLowerCase();
    if (state !== HOSTAGE_STATE.DEAD) return;
    const h = p?.hostage || this._hostage(p?.id);
    if (h) this._loseHostage(h);
  }

  _onPlayerDeath() {
    if (this._outcome || this._pendingDefeat) return;
    this._pendingDefeat = { reason: 'playerDead', delay: DEATH_BEAT };
  }

  _timerWarnings() {
    for (const t of TIMER_WARNINGS) {
      if (this._warned.has(t) || this.timeRemaining > t) continue;
      this._warned.add(t);
      const label = t >= 60 ? `${Math.round(t / 60)} MINUTE${t >= 120 ? 'S' : ''}` : `${t} SECONDS`;
      this._announce(`warn:${t}`, `${label} REMAINING`, '', t <= 60 ? 'danger' : 'alert');
    }
  }

  // -------------------------------------------------------------- outcome --

  _finish(outcome, reason) {
    if (this._outcome) return this._outcome;
    this._outcome = outcome;
    this.endReason = reason;
    if (outcome === 'victory') {
      this._complete(this._byId.get('hold-extraction'));
      for (const o of this.objectives) {
        if (o.state === OBJECTIVE_STATE.ACTIVE || o.state === OBJECTIVE_STATE.PENDING) this._complete(o);
      }
    } else {
      const active = this.activeObjective;
      if (active) this._fail(active, reason);
    }

    const stats = safeCall(() => this.game.combat?.summary?.()) || {};
    const hostages = this.game.hostages;
    const saved = outcome === 'victory'
      ? (hostages?.extractedCount ?? this.hostagesTotal)
      : (hostages?.securedCount ?? 0);
    const enemies = this.game.enemies?.list || [];
    const neutralised = stats.enemiesNeutralised ?? enemies.filter((e) => !e.alive).length;

    this.endPayload = {
      outcome,
      result: outcome,
      victory: outcome === 'victory',
      won: outcome === 'victory',
      reason,
      difficulty: this.difficulty,
      time: +this.elapsed.toFixed(2),
      elapsed: +this.elapsed.toFixed(2),
      timeRemaining: +this.timeRemaining.toFixed(2),
      timeLimit: this.timeLimit,
      hostagesTotal: this.hostagesTotal,
      hostagesSecured: saved,
      hostagesSaved: saved,
      hostagesLost: hostages?.lostCount ?? 0,
      enemiesNeutralised: neutralised,
      enemiesTotal: enemies.length,
      accuracy: stats.accuracy ?? 0,
      damageTaken: stats.damageTaken ?? 0,
      // The end card prefers `stats`; make sure the hostage count there is the
      // director's authoritative one rather than an event-derived tally.
      stats: { ...stats, hostagesSecured: saved, enemiesNeutralised: neutralised },
      objectives: this.objectives.map((o) => ({ id: o.id, text: o.text, state: o.state })),
    };

    this._announce(
      `end:${outcome}`,
      outcome === 'victory' ? 'EXTRACTION COMPLETE' : 'MISSION FAILED',
      outcome === 'victory' ? 'Both hostages are out.' : reasonText(reason),
      outcome === 'victory' ? 'good' : 'danger'
    );
    bus.emit(EVT.MISSION_END, this.endPayload);
    return this._outcome;
  }

  // ---------------------------------------------------------- public hooks --

  /** Reception terminal / intel prop: put both hostages on the HUD. */
  revealIntel() {
    if (this.intelRevealed) return false;
    this.intelRevealed = true;
    this.game.hostages?.reveal?.();
    for (const id of ['locate-hostage-a', 'locate-hostage-b']) {
      const o = this._byId.get(id);
      if (o && o.state !== OBJECTIVE_STATE.DONE && o.state !== OBJECTIVE_STATE.FAILED) this._complete(o);
    }
    this._activate();
    this._announce('intel', 'INTEL RECOVERED', 'Hostage locations marked on your map', 'good');
    return true;
  }

  /** Garage control box, or the shutter itself. Idempotent. */
  openGarage() {
    this.garageRequested = true;
    const shutter = this.shutter || this.game.doors?.get?.('DOOR-GARAGE');
    if (!shutter) return false;
    const raised = shutter.open ? shutter.open() : shutter.forceOpen?.(1);
    if (raised !== false) {
      this._announce('garage', 'BAY SHUTTER RISING', 'Extraction point opening', 'good');
    }
    this.game.nav?.invalidate?.();
    return true;
  }

  /** QA / scripting: skip straight to the pickup hold. */
  callPickup() {
    this.pickupCalled = true;
    return this.pickupCalled;
  }

  /** Marker positions for the HUD and minimap. */
  markers() {
    const out = [];
    for (const o of this.objectives) {
      if (o.state !== OBJECTIVE_STATE.ACTIVE) continue;
      out.push({ id: o.id, kind: 'objective', position: o.marker.slice() });
    }
    if (this.intelRevealed) {
      for (const h of this.game.hostages?.list || []) {
        if (!h.alive || h.state === HOSTAGE_STATE.EXTRACTED) continue;
        out.push({ id: h.id, kind: 'hostage', position: h.position.toArray() });
      }
    }
    out.push({ id: EXTRACTION.id, kind: 'extraction', position: EXTRACTION.center.slice() });
    return out;
  }

  // ----------------------------------------------------------- interaction --

  findInteractable(eye, dir, playerPos) {
    if (!eye || !dir) return null;
    const eyeV = toVec3(eye);
    const dirV = toVec3(dir);
    const pos = playerPos ? toVec3(playerPos) : eyeV;
    const candidates = [];

    // Manual shutter raise, for a player who never found the control box.
    if (this.shutter && !this.shutter.isOpen && this.shutter.targetAmount < 0.5) {
      const s = this.shutter.spec;
      const target = new THREE.Vector3(s.x, s.y + 1.2, s.z);
      const to = target.clone().sub(eyeV);
      const dist = to.length();
      if (dist < 3.4) {
        const dot = to.normalize().dot(dirV);
        if (dot > 0.5 || dist < 1.4) {
          candidates.push({
            kind: 'garage_shutter',
            id: 'DOOR-GARAGE',
            distance: dist,
            score: dist * (1.7 - dot) - 0.4,
            label: 'RAISE BAY SHUTTER',
            key: 'E',
            progress: 0,
            activate: (game) => {
              (game || this.game).director?.openGarage?.();
            },
          });
        }
      }
    }

    // Call the pickup in early once the bay is staged.
    if (this.garageOpen && !this.holding && !this._outcome
      && this._hostagesStaged() && insideExtraction(pos)) {
      const c = EXTRACTION.center;
      const target = new THREE.Vector3(c[0], c[1] + 1.1, c[2]);
      const dist = target.distanceTo(eyeV);
      candidates.push({
        kind: 'extraction',
        id: EXTRACTION.id,
        distance: dist,
        score: dist * 0.6,
        label: 'SIGNAL FOR PICKUP',
        key: 'E',
        progress: 0,
        activate: () => this.callPickup(),
      });
    }

    if (!candidates.length) return null;
    candidates.sort((a, b) => a.score - b.score);
    return candidates[0];
  }

  interactablesNear(pos, radius = 6) {
    const p = toVec3(pos);
    const out = [];
    if (this.shutter && !this.shutter.isOpen) {
      const s = this.shutter.spec;
      const d = Math.hypot(s.x - p.x, s.z - p.z);
      if (d <= radius) {
        out.push({
          id: 'DOOR-GARAGE', kind: 'garage_shutter', label: 'Raise bay shutter',
          position: [s.x, s.y, s.z], distance: +d.toFixed(2),
        });
      }
    }
    const c = EXTRACTION.center;
    const de = Math.hypot(c[0] - p.x, c[2] - p.z);
    if (de <= radius) {
      out.push({
        id: EXTRACTION.id, kind: 'extraction', label: EXTRACTION.label,
        position: c.slice(), distance: +de.toFixed(2),
      });
    }
    out.sort((a, b) => a.distance - b.distance);
    return out;
  }

  // ----------------------------------------------------------------- state --

  /**
   * One announcement per key per run. `alsoClear` lets a pair of opposing
   * beats (pickup started / pickup held) alternate without ever spamming.
   */
  _announce(key, title, subtitle, tone = 'info', alsoClear = null) {
    if (this._announced.has(key)) return;
    this._announced.add(key);
    if (alsoClear) this._announced.delete(alsoClear);
    bus.emit(EVT.ANNOUNCE, {
      // The HUD reads `text`/`sub`; the brief asks for `title`/`subtitle`.
      title, subtitle, tone,
      text: title, sub: subtitle,
      key,
    });
  }

  toJSON() {
    const hostages = this.game.hostages;
    return {
      difficulty: this.difficulty,
      outcome: this._outcome,
      reason: this.endReason,
      timeLimit: this.timeLimit,
      timeRemaining: +this.timeRemaining.toFixed(2),
      elapsed: +this.elapsed.toFixed(2),
      hostagesTotal: this.hostagesTotal,
      hostagesSecured: hostages?.securedCount ?? 0,
      hostagesExtracted: hostages?.extractedCount ?? 0,
      hostagesLost: hostages?.lostCount ?? 0,
      intelRevealed: this.intelRevealed,
      garageOpen: this.garageOpen,
      garageAmount: +(this.shutter?.openAmount ?? 0).toFixed(2),
      extraction: {
        id: EXTRACTION.id,
        center: EXTRACTION.center.slice(),
        size: EXTRACTION.size.slice(),
        staged: this._hostagesStaged(),
        playerInside: this.game.player ? insideExtraction(this.game.player.position) : false,
        holding: this.holding,
        holdSeconds: this.extractionHold,
        holdRemaining: +this.holdRemaining.toFixed(2),
      },
      active: this.activeObjective?.id || null,
      objectives: this.objectives.map((o) => ({
        id: o.id,
        index: o.index,
        text: o.text,
        hint: o.hint,
        state: o.state,
        room: o.room,
        marker: o.marker.slice(),
        position: o.marker.slice(),
        completedAt: o.completedAt ?? null,
      })),
      markers: this.markers(),
    };
  }
}

// ------------------------------------------------------------------ helpers --

function reasonText(reason) {
  switch (reason) {
    case 'playerDead': return 'The operator is down.';
    case 'hostageDead': return 'A hostage was lost.';
    case 'timeout': return 'The storm window has closed.';
    default: return 'The operation could not be completed.';
  }
}

function disposeTree(root) {
  root?.traverse?.((o) => {
    if (o.isMesh) o.geometry?.dispose?.();
  });
}

function toVec3(v) {
  if (!v) return new THREE.Vector3();
  if (v.isVector3) return v.clone();
  if (Array.isArray(v)) return new THREE.Vector3(v[0] || 0, v[1] || 0, v[2] || 0);
  return new THREE.Vector3(v.x || 0, v.y || 0, v.z || 0);
}

function safeCall(fn) {
  try {
    return fn();
  } catch {
    return null;
  }
}

export default MissionDirector;
