/**
 * `?uidemo=1` — every HUD element populated at once.
 *
 * HUD layout and typography cannot be judged from source, and they cannot be
 * judged from a live frame either, because a live frame shows an empty killfeed,
 * no markers and full health. This drives plausible data into every widget and
 * keeps re-driving the transient ones, so a screenshot taken at any moment shows
 * the whole surface rather than whatever happened to be on screen.
 */
import * as THREE from 'three';
import type { UISystem } from '../core/Contracts';
import type { FrameState, ScopeKind, UavBlip, UavSweep } from './HudState';
import type { Roster } from './Roster';
import type { Hud } from './hud/Hud';

/**
 * The contract, plus the one piece of internal state the demo has to reach:
 * the UAV tracker the killstreak module would be feeding. Structural rather
 * than an import of the system class, which would be a cycle.
 */
type DemoTarget = UISystem & { readonly uav: UavSweep };

/** Feedback that lives for a fraction of a second is re-driven this often. */
const HIT_PERIOD = 0.22;
/** Damage arcs last 1.2 s, so they are re-pushed faster than the rest. */
const ARC_PERIOD = 0.8;
/** The killfeed and toasts are refilled on this cycle. */
const SEED_PERIOD = 5;
/** The announcement runs slightly shorter than its own cycle. */
const ANNOUNCE_PERIOD = 6.4;
/** Stand-in reload length, near enough the carbine's real one. */
const RELOAD_HOLD = 2;

const FEED: ReadonlyArray<[string, string, string, boolean]> = [
  ['GHOST-2', 'RIFLEMAN-41', 'ar_mk4', false],
  ['PLAYER', 'MARKSMAN-17', 'sniper_tac50', true],
  ['SHIELD-08', 'GHOST-4', 'lmg_pkp', false],
  ['PLAYER', 'BREACHER-26', 'ar_mk4', false],
  ['GHOST-3', 'RIFLEMAN-33', 'frag', false],
];

const ROSTER = [
  { name: 'PLAYER', team: 'player' as const, kills: 14, deaths: 3, headshots: 5, score: 2450, streak: 4, bestStreak: 7, alive: true, isLocal: true },
  { name: 'GHOST-2', team: 'player' as const, kills: 11, deaths: 6, headshots: 2, score: 1780, streak: 2, bestStreak: 5, alive: true },
  { name: 'GHOST-3', team: 'player' as const, kills: 8, deaths: 7, headshots: 1, score: 1240, streak: 0, bestStreak: 4, alive: false },
  { name: 'GHOST-4', team: 'player' as const, kills: 5, deaths: 9, headshots: 1, score: 810, streak: 0, bestStreak: 3, alive: false },
  { name: 'SHIELD-08', team: 'enemy' as const, kills: 9, deaths: 9, headshots: 3, score: 1390, streak: 1, bestStreak: 3, alive: true },
  { name: 'MARKSMAN-17', team: 'enemy' as const, kills: 6, deaths: 11, headshots: 4, score: 980, streak: 0, bestStreak: 2, alive: false },
  { name: 'RIFLEMAN-41', team: 'enemy' as const, kills: 4, deaths: 12, headshots: 0, score: 620, streak: 0, bestStreak: 2, alive: false },
  { name: 'BREACHER-26', team: 'enemy' as const, kills: 3, deaths: 10, headshots: 1, score: 470, streak: 0, bestStreak: 2, alive: true },
  { name: 'RIFLEMAN-33', team: 'enemy' as const, kills: 1, deaths: 13, headshots: 0, score: 190, streak: 0, bestStreak: 1, alive: false },
];

/**
 * Magnifications to pair with a forced scope, so the aperture the overlay draws
 * is the one that optic would actually produce rather than the carbine's.
 */
const SCOPE_ZOOM: Record<ScopeKind, number> = {
  none: 1,
  holo: 1.22,
  // The real prism sights in the game run 2x to 2.7x, all below the point where
  // the optic takes over the frame. Posing one above that would photograph a
  // blackout the player will never see.
  acog: 2.6,
  sniper: 4.6,
  thermal: 2.8,
};

/** Hostiles the stand-in UAV has painted: offset from the player, and how
 *  recently the sweep touched them. */
const CONTACTS: ReadonlyArray<[number, number, number]> = [
  [14, -22, 1],
  [-9, -31, 0.8],
  [26, 8, 0.55],
  [-24, -6, 0.3],
  [4, 19, 0.95],
];

/** Marker offsets from the player, chosen to cover all three projection cases. */
const MARKERS: ReadonlyArray<{ id: string; label: string; offset: [number, number, number] }> = [
  { id: 'objective_alpha', label: 'Objective Alpha', offset: [11, 1.2, -26] },
  { id: 'objective_exfil', label: 'Exfil', offset: [-38, 0.5, 9] },
  { id: 'killstreak_paint', label: 'Strike', offset: [16, 4, 34] },
];

export class UiDemo {
  private readonly marker = new THREE.Vector3();
  private readonly direction = new THREE.Vector3();
  /** Reused slots, matching the pooled array the real payload carries. */
  private readonly contacts: UavBlip[] = CONTACTS.map(() => ({ x: 0, z: 0, strength: 1 }));
  private nextHit = 0;
  private nextArc = 0;
  private nextSeed = 0;
  private nextAnnounce = 0;
  private anchored = false;
  private scope: ScopeKind = 'none';
  private health = 0.58;
  private reload = -1;

  constructor(
    private readonly ui: DemoTarget,
    private readonly hud: Hud,
    private readonly roster: Roster,
  ) {}

  /**
   * Pins an optic on. The weapons module rewrites the overlay every frame from
   * its own ADS state, and it updates before this system does, so a scope cannot
   * be held on from outside the frame — it has to be re-asserted from in here.
   */
  setScope(kind: ScopeKind): void {
    this.scope = kind;
  }

  /**
   * Health as a fraction. Held at a nick rather than at death's door by default,
   * because the escalating blood vignette and the heartbeat would otherwise be
   * over every screenshot of every other widget — but they are HUD surface too,
   * so there has to be a way to ask for them.
   */
  setHealth(fraction: number): void {
    this.health = Math.max(0.01, Math.min(1, fraction));
  }

  /**
   * Holds the reload arc at a fixed fraction, or lets it go with a negative.
   * A reload is a two-second window, and a capture here takes the best part of a
   * minute, so the timer ring around the ammo count is otherwise unphotographable.
   */
  setReload(progress: number): void {
    this.reload = progress < 0 ? -1 : Math.min(0.99, progress);
  }

  start(): void {
    this.roster.seedDemo(ROSTER);
    this.hud.streak.markEarned('uav', 0);
    this.hud.streak.markEarned('airstrike', 0);
    this.hud.scope.setRange(184);
  }

  /** Runs after the sampler, so these values are the ones the widgets read. */
  update(state: FrameState): void {
    state.maxHealth = 100;
    state.healthFraction = this.health;
    state.health = Math.max(1, Math.round(this.health * 100));
    state.alive = true;
    state.regenerating = false;
    state.score = 2450;
    state.kills = 14;
    state.deaths = 3;
    state.streak = 4;
    state.available = DEMO_STREAKS;
    state.aliveEnemies = 9;
    state.damageFlash = Math.max(state.damageFlash, 0.3);
    state.suppression = Math.max(state.suppression, 0.4);
    if (state.magSize === 0) {
      state.weaponName = 'MK4 CARBINE';
      state.weaponClass = 'ar';
      state.fireMode = 'auto';
      state.caliber = '5.56x45';
      state.magSize = 30;
      state.ammoInMag = 19;
      state.reserve = 120;
      state.grenades = 2;
    }

    if (this.scope !== 'none') {
      state.scopeZoom = SCOPE_ZOOM[this.scope];
      state.adsAmount = 1;
      this.ui.setScopeOverlay(this.scope, 1);
    }
    if (this.reload >= 0) {
      state.reloading = true;
      // Re-anchored every frame, so the arc's own elapsed-over-duration lands on
      // the same fraction each time rather than sweeping past it.
      this.hud.ammo.beginReload(state.time - this.reload * RELOAD_HOLD, RELOAD_HOLD);
    }

    if (!this.anchored && (state.eye.x !== 0 || state.eye.z !== 0)) {
      this.anchored = true;
      this.placeMarkers(state);
    }
    this.paintContacts(state);

    const now = state.time;
    if (now >= this.nextHit) {
      this.nextHit = now + HIT_PERIOD;
      this.ui.showHitmarker('headshot');
    }
    if (now >= this.nextArc) {
      this.nextArc = now + ARC_PERIOD;
      // Three bearings so the arcs read as a stack rather than as one blob.
      for (const angle of [0.6, 2.4, -1.9]) {
        this.direction.set(-Math.sin(angle), 0, Math.cos(angle));
        this.ui.showDamageDirection(this.direction);
      }
    }
    if (now >= this.nextSeed) {
      this.nextSeed = now + SEED_PERIOD;
      this.seed();
    }
    if (now >= this.nextAnnounce) {
      this.nextAnnounce = now + ANNOUNCE_PERIOD;
      this.ui.announce('Airstrike inbound', 'Grid 04-22 · danger close', 5.4);
    }
  }

  /**
   * Stands in for a UAV on station. The killstreak module publishes these every
   * frame while its drone is up, so this has to as well or the tracker times
   * the sweep out — and it goes through the same pooled shape, which is a free
   * check that the copy-on-receive path is right.
   */
  private paintContacts(state: FrameState): void {
    for (let i = 0; i < CONTACTS.length; i++) {
      const [dx, dz, strength] = CONTACTS[i];
      const blip = this.contacts[i];
      blip.x = state.eye.x + dx;
      blip.z = state.eye.z + dz;
      blip.strength = strength;
    }
    this.ui.uav.accept(this.contacts, CONTACTS.length, state.time * 0.6, state.time);
  }

  private placeMarkers(state: FrameState): void {
    for (const entry of MARKERS) {
      this.marker.set(
        state.eye.x + entry.offset[0],
        state.eye.y + entry.offset[1],
        state.eye.z + entry.offset[2],
      );
      this.ui.setObjectiveMarker(entry.id, this.marker, entry.label);
    }
  }

  private seed(): void {
    this.hud.killfeed.clear();
    for (const [killer, victim, weapon, headshot] of FEED) {
      const local = killer === 'PLAYER' || victim === 'PLAYER';
      this.ui.pushKillfeed(killer, victim, weapon, headshot, local);
    }
    // The feed just credited five kills the scoreboard is not supposed to
    // accumulate; re-asserting the fixed rows keeps the numbers still between
    // one screenshot and the next.
    this.roster.seedDemo(ROSTER);
    this.ui.notify('UAV recon', 'Ready · press 3', 'reward');
    this.ui.notify('Taking fire', 'North-east', 'warn');
  }
}

const DEMO_STREAKS = ['uav', 'airstrike'] as const;
