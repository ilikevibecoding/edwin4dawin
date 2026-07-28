/**
 * The UI system.
 *
 * Everything the player reads: the HUD, the menus, the scoreboard and the death
 * screen. Three rules shape the implementation.
 *
 * One, the HUD never reads a gameplay system from a widget. `Sampler` collects
 * one flat snapshot per frame and the widgets diff against their own last
 * written values, so the number of cross-system reads is fixed and no widget can
 * end up holding a pooled event payload.
 *
 * Two, nothing writes the DOM unless the value changed. Every text and style
 * write goes through the cached setters in `Dom.ts`, and the canvas layers keep
 * their own dirty flags, so a standing player with a full magazine costs a
 * handful of comparisons and no mutations at all.
 *
 * Three, `isMenuOpen` is load-bearing. The player module checks it before it
 * grabs the pointer and the weapon module checks it before it accepts input, so
 * every path that opens or closes a screen has to leave it correct — including
 * the ones that run while the engine is paused and this is the only system still
 * being updated.
 */
import * as THREE from 'three';
import type { EngineContext, System } from '../core/System';
import { ORDER } from '../core/System';
import type {
  AudioSystem,
  KillstreakSystem,
  PhysicsSystem,
  PlayerSystem,
  UISystem,
  WeaponSystem,
  WorldSystem,
} from '../core/Contracts';
import type { Damageable, DamageType, HitResult } from '../core/GameTypes';
import { div } from './Dom';
import { UiDemo } from './Demo';
import {
  ContactTracker,
  Sampler,
  UavSweep,
  createFrameState,
  type ScopeKind,
  type UavBlip,
} from './HudState';
import { Roster } from './Roster';
import { Settings } from './Settings';
import { UiSound } from './Sound';
import { injectStyles, removeStyles } from './Style';
import { TIMING } from './Theme';
import { Hud } from './hud/Hud';
import type { HitKind } from './hud/Hitmarker';
import { Menus } from './menus/Menus';
import { streakDisplay } from './StreakDefs';

/** Seconds between scope rangefinder probes. */
const RANGE_PERIOD = 0.12;
/** Metres the rangefinder starts ahead of the eye, to clear the player capsule. */
const RANGE_OFFSET = 0.7;
/** Seconds a hostile stays on the minimap after giving their position away. */
const CONTACT_LIFE = 4;
/** Matches the player module's own respawn delay, used for the countdown. */
const RESPAWN_DELAY = 3.2;

interface NearMiss {
  attacker: Damageable | null;
  distance: number;
}

interface CombatHit {
  result: HitResult;
  attacker: Damageable | null;
  damage: number;
}

export class UISystemImpl implements UISystem, System {
  readonly name = 'ui' as const;
  readonly order = ORDER.UI;
  /** The minimap rasterises the nav grid at init, so the world must exist first. */
  readonly dependencies = ['world'] as const;

  private ctx: EngineContext | null = null;
  private root: HTMLDivElement | null = null;
  private hud: Hud | null = null;
  private menus: Menus | null = null;
  private settings: Settings | null = null;
  private demo: UiDemo | null = null;

  private readonly state = createFrameState();
  private readonly sampler = new Sampler();
  private readonly contacts = new ContactTracker();
  readonly uav = new UavSweep();
  private readonly roster = new Roster();
  private readonly sound = new UiSound();
  private readonly offs: Array<() => void> = [];
  private readonly scratch = new THREE.Vector3();
  private readonly look = new THREE.Vector3();

  private localEntity: Damageable | null = null;
  private localName = 'PLAYER';
  private awaitingDeathDetail = false;
  private lastWeaponId = '';
  /** This frame's `update` cost, banked until `lateUpdate` can close it out. */
  private pendingCost = 0;
  private nextRange = 0;
  private scoreboardHeld = false;
  private capture = false;
  private qualityPending = true;

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  init(ctx: EngineContext): void {
    this.ctx = ctx;
    this.sound.bind(ctx);
    injectStyles();

    const host = document.getElementById('ui-root') ?? document.body;
    this.root = div('ob-ui', host);

    const params = new URLSearchParams(location.search);
    const demoRequested = params.get('uidemo') === '1';
    this.capture = demoRequested || params.get('capture') === '1';

    this.settings = new Settings(ctx);
    this.settings.applyAll();

    this.hud = new Hud(this.root, () => this.sampler.killstreakSystem);
    this.hud.minimap.setUav(this.uav);
    this.menus = new Menus(this.root, {
      settings: this.settings,
      input: ctx.input,
      canvas: ctx.engine.canvas,
      sound: this.sound,
      loadout: {
        loadout: () => ctx.tryGet<WeaponSystem>('weapons')?.loadout ?? [],
        currentId: () => this.state.weaponId,
        currentName: () => this.state.weaponName,
        streaks: () => this.sampler.killstreakSystem,
        earned: () => this.state.available,
      },
      onPlay: () => this.resumePlay(),
      onRestart: () => this.restart(),
      onSettingsApplied: () => this.applySettings(),
    });

    this.settings.onChange(() => this.applySettings());
    this.applySettings();

    this.buildWorldData(ctx);
    this.bindEvents(ctx);
    this.resolveLocalPlayer(ctx);
    this.hud.resize();

    if (demoRequested) {
      this.demo = new UiDemo(this, this.hud, this.roster);
      this.demo.start();
    }
    // The capture harness photographs the running game, so a deploy screen over
    // the top of it would be the only thing in every shot.
    if (!this.capture) this.menus.show('main');
  }

  private buildWorldData(ctx: EngineContext): void {
    const world = ctx.tryGet<WorldSystem>('world');
    const hud = this.hud;
    if (!hud) return;
    let nav = null;
    try {
      nav = world?.getNavGrid() ?? null;
    } catch (err) {
      console.warn('[ui] nav grid unavailable; minimap falls back to a grid', err);
    }
    const bounds = world?.bounds;
    const halfExtent = bounds
      ? Math.max(bounds.max.x - bounds.min.x, bounds.max.z - bounds.min.z) * 0.5
      : 60;
    hud.buildMap(nav, halfExtent);
    hud.setLandmarks(world?.getLandmarks());
  }

  private resolveLocalPlayer(ctx: EngineContext): void {
    const player = ctx.tryGet<PlayerSystem>('player');
    if (!player) return;
    this.localEntity = player.entity;
    this.localName = displayNameOf(player.entity);
    this.roster.setLocal(player.entity, this.localName);
  }

  private applySettings(): void {
    const settings = this.settings;
    if (!settings || !this.hud || !this.root) return;
    this.hud.applySettings(settings.data, settings.streakKeys);
    this.root.classList.toggle('no-blur', !settings.data.hudBlur);
  }

  // ---------------------------------------------------------------------------
  // Events
  // ---------------------------------------------------------------------------

  private bindEvents(ctx: EngineContext): void {
    const on = <T>(type: string, handler: (payload: T) => void): void => {
      this.offs.push(ctx.events.on<T>(type, handler));
    };

    on<{ amount: number; direction: THREE.Vector3; health: number }>('player:damaged', (p) => {
      this.sampler.noteDamage(this.state, p.amount);
    });

    on<{ killer: Damageable | null; cause: DamageType }>('player:death', (p) => {
      this.onLocalDeath(p.killer, p.cause);
    });

    on('player:spawn', () => this.onLocalSpawn());

    on<{ duration: number }>('weapon:reloadStart', (p) => {
      this.hud?.ammo.beginReload(this.state.time, p.duration);
    });
    on('weapon:reloadEnd', () => this.hud?.ammo.endReload());
    on('weapon:empty', () => this.hud?.ammo.flashEmpty());

    on<CombatHit>('combat:hit', (p) => {
      // The attacker's real position, which is the only honest way to put a
      // shooter on the minimap. Read synchronously: the payload is pooled.
      if (!p.attacker || p.result?.target !== this.localEntity) return;
      p.attacker.getPosition(this.scratch);
      this.contacts.add(this.scratch.x, this.scratch.z, this.state.time, CONTACT_LIFE);
    });

    on<NearMiss>('combat:nearmiss', (p) => {
      this.state.suppression = Math.min(1, this.state.suppression + 0.45);
      if (!p.attacker) return;
      p.attacker.getPosition(this.scratch);
      this.contacts.add(this.scratch.x, this.scratch.z, this.state.time, CONTACT_LIFE);
    });

    on<{
      victim: Damageable;
      killer: Damageable | null;
      weaponId: string;
      isHeadshot: boolean;
      distance: number;
    }>('combat:kill', (p) => {
      this.roster.noteKill(p.killer, p.victim, p.isHeadshot);
      if (p.victim === this.localEntity) this.awaitingDeathDetail = true;
    });

    on<{ position: THREE.Vector3; radius: number }>('combat:explosion', (p) => {
      const distance = p.position.distanceTo(this.state.eye);
      if (distance > p.radius * 2.4) return;
      const near = 1 - Math.min(1, distance / Math.max(1, p.radius * 2.4));
      this.state.suppression = Math.min(1, this.state.suppression + near * 0.8);
    });

    on<{ score: number; kills: number; deaths: number; streak: number }>('score:changed', (p) => {
      this.state.score = p.score;
      this.state.kills = p.kills;
      this.state.deaths = p.deaths;
      this.roster.setLocalScore(p.score, p.kills, p.deaths, p.streak);
    });

    on<{ enemyId: number }>('ai:spawn', (p) => this.roster.noteSpawn(p.enemyId));

    // The killstreak module deliberately leaves this one to the HUD, and the
    // audio module plays the sting off the same event — so the toast goes up
    // without a cue of its own rather than through the public `notify`.
    on<{ id: string; name: string }>('killstreak:earned', (p) => {
      const def = streakDisplay(p.id, this.sampler.killstreakSystem);
      this.hud?.streak.markEarned(p.id, this.state.time);
      this.hud?.announce.notify(p.name || def.name, 'Killstreak ready', 'reward', this.state.time);
    });
    // Nothing on `killstreak:used`: every streak announces its own activation
    // with detail this could not add — bearing, grid, time to touchdown — and a
    // toast reading "DEPLOYED" underneath it is the same news, quieter.

    // What the drone actually painted, rather than every hostile the AI system
    // knows about. Pooled: the array outlives the emit and is longer than the
    // count, so the tracker copies out of it here and now.
    on<{ contacts?: ArrayLike<UavBlip>; count?: number; sweep?: number }>(
      'killstreak:uavContacts',
      (p) => {
        this.uav.accept(p.contacts, p.count ?? 0, p.sweep ?? 0, this.state.time);
      },
    );
    // No callout on `killstreak:airstrikeCalled` either: the strike announces
    // itself with the run-in bearing and the grid, and the audio module answers
    // the same event with the radio traffic.
    on<{ position: THREE.Vector3 }>('killstreak:airstrikeImpact', () => {
      this.state.suppression = Math.min(1, this.state.suppression + 0.5);
    });

    // No cue here: the audio module answers this event itself. A direct call to
    // `notify` does not go through the bus, so that path plays its own.
    on<{ text: string; sub?: string; kind?: 'info' | 'warn' | 'reward' }>('ui:notify', (p) => {
      this.hud?.announce.notify(p.text, p.sub, p.kind ?? 'info', this.state.time);
    });

    on<boolean>('engine:paused', (paused) => {
      // The mixer ducks the world buses while paused and restores them to full
      // on the way out, which would undo the player's own effects volume. This
      // system initialises after audio, so this handler runs after theirs.
      if (!paused) this.settings?.applyAudio();
      if (!this.menus) return;
      this.menus.onPaused(paused, this.state.time);
      this.syncMenuState();
    });

    on('engine:resize', () => this.hud?.resize());
  }

  private onLocalDeath(killer: Damageable | null, cause: DamageType): void {
    this.menus?.death.show(RESPAWN_DELAY, this.state.time);
    this.roster.setLocalAlive(false);
    this.state.alive = false;
    this.contacts.clear();
    // Falls and fire produce no killfeed row, so the screen is filled in now and
    // refined by `pushKillfeed` if one turns up.
    if (!killer) this.menus?.death.setKiller(causeLabel(cause), cause, false);
  }

  private onLocalSpawn(): void {
    this.menus?.death.hide();
    this.roster.setLocalAlive(true);
    this.awaitingDeathDetail = false;
    this.state.damageFlash = 0;
    this.state.suppression = 0;
    this.sampler.reset();
    this.contacts.clear();
    this.hud?.reticle.reset();
  }

  // ---------------------------------------------------------------------------
  // Frame
  // ---------------------------------------------------------------------------

  update(dt: number, ctx: EngineContext): void {
    const hud = this.hud;
    const menus = this.menus;
    if (!hud || !menus) return;
    const started = performance.now();

    // A paused engine runs `update` but not `lateUpdate`, so a cost left over
    // from the previous frame is banked here instead of being dropped.
    if (this.pendingCost > 0) {
      hud.debug.sample(this.pendingCost, this.state.dt, this.state.fps);
      this.pendingCost = 0;
    }

    if (this.qualityPending) {
      // Deferred out of init: applying quality resizes every system, and the
      // renderer initialises after this one.
      this.qualityPending = false;
      this.settings?.applyQuality();
    }

    this.sampler.sample(this.state, ctx, dt);
    this.demo?.update(this.state);
    this.contacts.prune(this.state.time);
    this.state.menuOpen = menus.isOpen;

    this.readInput(ctx, menus);
    this.probeRange(ctx, hud);
    this.trackWeapon();

    hud.setHidden(menus.isOpen);
    hud.setStandDown(this.deviceTakenOver && !menus.isOpen);
    hud.update(this.state, dt, ctx.camera.fov, this.contacts.list);
    menus.update(this.state.time);

    if (this.scoreboardHeld || menus.scoreboard.isOpen) {
      menus.setScoreboard(this.scoreboardHeld, this.roster.entries, this.state.aliveEnemies);
    }
    if (menus.current === 'pause') {
      menus.setStatus(
        hud.placeName || 'Deployed',
        this.state.score,
        this.state.kills,
        this.state.deaths,
        this.state.streak,
      );
    }

    this.pendingCost = performance.now() - started;
  }

  lateUpdate(_dt: number, ctx: EngineContext): void {
    const hud = this.hud;
    if (!hud) return;
    const started = performance.now();
    hud.lateUpdate(ctx.camera, this.state);
    hud.debug.sample(this.pendingCost + (performance.now() - started), this.state.dt, this.state.fps);
    this.pendingCost = 0;
  }

  resize(): void {
    this.hud?.resize();
  }

  /**
   * The pause key, the scoreboard hold and the streak picker. Read here rather
   * than in the menus so there is exactly one place that decides what a press
   * means given the current screen.
   */
  private readInput(ctx: EngineContext, menus: Menus): void {
    const input = ctx.input;
    const held = input.isDown('scoreboard') && !menus.isOpen && this.state.alive;
    if (held !== this.scoreboardHeld) this.scoreboardHeld = held;

    if (input.wasPressed('pause')) {
      const consumed = menus.handlePause(this.state.time);
      if (!consumed) ctx.engine.setPaused(true);
      this.syncMenuState();
    }
  }

  /** Distance to whatever is under the crosshair, for the scope's readout. */
  private probeRange(ctx: EngineContext, hud: Hud): void {
    if (!hud.scope.wantsRange) return;
    if (this.state.time < this.nextRange) return;
    this.nextRange = this.state.time + RANGE_PERIOD;
    const physics = ctx.tryGet<PhysicsSystem>('physics');
    const player = ctx.tryGet<PlayerSystem>('player');
    if (!physics?.ready || !player) return;
    player.getLookDirection(this.look);
    // Started clear of the shooter's own capsule: from the eye the cast lands on
    // the player's collider and the rangefinder reads zero.
    this.scratch.copy(this.state.eye).addScaledVector(this.look, RANGE_OFFSET);
    const hit = physics.raycast(this.scratch, this.look, { maxDistance: 900 });
    hud.scope.setRange(hit ? hit.distance + RANGE_OFFSET : -1);
  }

  /** A weapon change is worth a toast; the first equip at spawn is not. */
  private trackWeapon(): void {
    const id = this.state.weaponId;
    if (id === this.lastWeaponId) return;
    const first = this.lastWeaponId === '';
    this.lastWeaponId = id;
    if (first || !id) return;
    this.notify(this.state.weaponName, this.state.caliber, 'info');
  }

  private syncMenuState(): void {
    const menus = this.menus;
    if (!menus) return;
    this.state.menuOpen = menus.isOpen;
    if (menus.isOpen) this.scoreboardHeld = false;
  }

  private resumePlay(): void {
    const ctx = this.ctx;
    this.syncMenuState();
    if (!ctx) return;
    // Inside the click that asked for it: a pointer lock request outside a user
    // gesture is rejected, and audio cannot be unlocked any other way.
    void ctx.tryGet<AudioSystem>('audio')?.unlock();
    ctx.engine.setPaused(false);
    void ctx.input.requestLock();
  }

  private restart(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    ctx.tryGet<PlayerSystem>('player')?.respawn();
    ctx.tryGet<KillstreakSystem>('killstreaks')?.resetStreak();
    this.roster.reset();
    this.resolveLocalPlayer(ctx);
    this.contacts.clear();
    this.uav.clear();
    this.hud?.reset();
    this.hud?.markers.clear();
    this.notify('Mission restarted', undefined, 'info');
  }

  // ---------------------------------------------------------------------------
  // UISystem
  // ---------------------------------------------------------------------------

  get isMenuOpen(): boolean {
    return this.menus?.isOpen ?? false;
  }

  /**
   * Measured cost of the UI's own update and lateUpdate, in milliseconds. Not
   * part of the contract; the settings menu and the visual-QA script read it.
   */
  get frameCost(): { mean: number; p95: number; peak: number; samples: number } {
    return {
      mean: this.hud?.debug.meanMs ?? 0,
      p95: this.hud?.debug.p95Ms ?? 0,
      peak: this.hud?.debug.peakMs ?? 0,
      samples: this.hud?.debug.sampleCount ?? 0,
    };
  }

  /** The `?uidemo=1` driver. Null in a real run; the visual-QA script poses it. */
  get demoDriver(): UiDemo | null {
    return this.demo;
  }

  showHitmarker(kind: HitKind): void {
    this.hud?.hitmarker(kind);
  }

  showDamageDirection(worldDirection: THREE.Vector3): void {
    this.hud?.reticle.damage.push(worldDirection);
  }

  pushKillfeed(
    killer: string,
    victim: string,
    weapon: string,
    headshot: boolean,
    isLocalPlayer: boolean,
  ): void {
    this.hud?.killfeed.push(
      killer,
      victim,
      weapon,
      headshot,
      isLocalPlayer,
      this.localName,
      this.state.time,
    );
    this.roster.noteFeed(killer, victim, headshot, isLocalPlayer);
    // `combat:kill` normally arms this a frame before the death event, but a
    // kill credited only through the feed still has to name the killer, so the
    // victim's name is accepted as evidence too.
    if (this.awaitingDeathDetail || (!this.state.alive && victim === this.localName)) {
      this.awaitingDeathDetail = false;
      this.menus?.death.setKiller(killer, weapon, headshot);
    }
  }

  notify(text: string, sub?: string, kind: 'info' | 'warn' | 'reward' = 'info'): void {
    this.hud?.announce.notify(text, sub, kind, this.state.time);
    this.sound.play(kind === 'reward' ? 'reward' : kind === 'warn' ? 'error' : 'notify');
  }

  announce(text: string, sub?: string, duration: number = TIMING.announceDefault): void {
    // The warning read only changes how it looks. The one warning-shaped cue the
    // mixer has is its denial tone, and a denial under "AIRSTRIKE INBOUND" says
    // the opposite of what the callout does.
    const warn = /inbound|danger|incoming|warning/i.test(text);
    this.hud?.announce.announce(text, sub, duration, this.state.time, warn);
    this.sound.play('objective');
  }

  setObjectiveMarker(id: string, worldPosition: THREE.Vector3 | null, label?: string): void {
    this.hud?.markers.set(id, worldPosition, label);
  }

  setCrosshairSpread(radians: number): void {
    this.state.spread = radians;
  }

  setScopeOverlay(kind: ScopeKind, amount: number): void {
    this.hud?.setScope(kind, amount);
  }

  /**
   * True while another system has taken the input device — the killstreak
   * tablet or the door gun. Both are full-screen instruments that composite
   * below `#ui-root`, so the HUD has to get out of their way and the menus have
   * to stay shut. `isTargeting` is the contract signal but only covers the
   * tablet; the shared input being switched off covers both, and anything else
   * that takes the device in future.
   */
  private get deviceTakenOver(): boolean {
    return this.state.targeting || this.ctx?.input.enabled === false;
  }

  setKillstreakSelectionOpen(open: boolean): void {
    this.hud?.streak.setSelectionOpen(open);
  }

  openMenu(id: 'pause' | 'settings' | 'loadout' | 'none'): void {
    const menus = this.menus;
    const ctx = this.ctx;
    if (!menus) return;
    // Opening over another module's instrument would pause the engine in the
    // middle of its sequence and leave the player holding a frozen tablet, so
    // the request is refused rather than queued.
    if (id !== 'none' && this.deviceTakenOver) return;
    menus.show(id === 'none' ? 'none' : id, this.state.time);
    this.syncMenuState();
    if (!ctx) return;
    if (id === 'none') ctx.engine.setPaused(false);
    else ctx.engine.setPaused(true);
  }

  dispose(): void {
    for (const off of this.offs) off();
    this.offs.length = 0;
    this.menus?.dispose();
    this.hud?.dispose();
    this.settings?.dispose();
    this.root?.remove();
    removeStyles();
    this.hud = null;
    this.menus = null;
    this.root = null;
    this.ctx = null;
  }
}

/** Mirrors the combat module's naming so the roster and the killfeed agree. */
function displayNameOf(entity: Damageable): string {
  const named = entity as unknown as { displayName?: unknown; name?: unknown };
  if (typeof named.displayName === 'string' && named.displayName.length > 0) {
    return named.displayName;
  }
  if (typeof named.name === 'string' && named.name.length > 0) return named.name;
  return entity.team === 'player' ? 'PLAYER' : `HOSTILE ${entity.id}`;
}

const CAUSE_LABEL: Partial<Record<DamageType, string>> = {
  fall: 'The ground',
  fire: 'Fire',
  explosive: 'Explosion',
  shrapnel: 'Shrapnel',
  collision: 'Impact',
};

function causeLabel(cause: DamageType): string {
  return CAUSE_LABEL[cause] ?? 'Unknown contact';
}

