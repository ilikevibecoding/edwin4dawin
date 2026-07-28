import * as THREE from 'three';
import type { GameContext, System } from '../core/GameContext';
import type {
  IAI,
  IDirector,
  IKillstreaks,
  IPlayer,
  IRenderPipeline,
  IWeapons,
  IWorld,
  WeaponStats,
} from '../core/Interfaces';
import { ClassCell, StyleCell, clamp01, div } from './dom';
import { Compass } from './Compass';
import { Minimap } from './Minimap';
import { Reticle } from './Reticle';
import { Vitals, screenBearing } from './Vitals';
import { AmmoPanel } from './panels/Ammo';
import { DeathCard } from './panels/Death';
import { Killfeed } from './panels/Killfeed';
import { InboundChip, Notifications } from './panels/Notices';
import { ScorePops, StatusPanel } from './panels/Status';
import { StreakBanner, StreakTray } from './panels/Streaks';

/**
 * The heads-up display.
 *
 * ## Why this is DOM
 *
 * Almost all of it is DOM and CSS, and that is a deliberate reversal of the
 * obvious choice. The HUD composites over a WebGL canvas, so the tempting answer
 * is to draw it in WebGL too — but browser text rasterisation with subpixel
 * hinting and real font metrics is dramatically sharper than anything a canvas
 * atlas or an SDF quad produces at HUD sizes, and it is free: the compositor
 * already has to composite the page over the canvas. Layout, containment,
 * clipping, transitions and DPI scaling all come for nothing as well.
 *
 * Canvas is used in exactly the three places where DOM is the wrong tool —
 * the crosshair, the radar and the damage arcs — because all three are per-frame
 * vector graphics at arbitrary angles, and none of them contains text that has
 * to survive close inspection.
 *
 * ## The frame budget
 *
 * The rule the whole module is written against: **the HUD must not cause layout**.
 * Every readout goes through a cell that compares before it writes, every
 * animation is `transform` or `opacity`, no element's geometry is ever set from
 * `update`, and the three canvases are sized once per resize rather than per
 * frame. What is left is a few dozen string comparisons and three small 2D
 * draws, which does not show up in a profile.
 *
 * ## Visibility
 *
 * One root class drives everything. `hidden` for menus and for capture runs that
 * are not photographing the HUD, `dead` to swap the combat layer for the death
 * card, `targeting` to stand the combat layer down while a strike is designated.
 * Widgets are not individually shown and hidden; CSS decides from the root state,
 * which means a new state cannot leave one panel behind.
 *
 * ## What this deliberately does not draw
 *
 * A designation is the one moment the HUD gets out of the way completely. The
 * killstreak system already composites a full-frame instrument panel for its
 * targeting view — title, run-in bearing, ordnance, pattern, footprint coverage,
 * hostiles in the box, the confirm prompts and the clock — drawn into a texture
 * and blended by the same shader that desaturates the frame behind it. A second
 * overlay from here would collide with it in all four corners and disagree with
 * it about the numbers. So `killstreak:targeting` is consumed to *stand down*,
 * and `killstreak:target` only to keep the radar's strike marker honest.
 */

const _dir = new THREE.Vector3();
const _pos = new THREE.Vector3();
const _fwd = new THREE.Vector3();

export default class HUDSystem implements System {
  readonly key = 'hud';
  readonly order = 90;

  private ctx!: GameContext;
  private root!: HTMLElement;

  private reticle!: Reticle;
  private vitals!: Vitals;
  private minimap!: Minimap;
  private compass!: Compass;
  private ammo!: AmmoPanel;
  private killfeed!: Killfeed;
  private streaks!: StreakTray;
  private banner!: StreakBanner;
  private status!: StatusPanel;
  private pops!: ScorePops;
  private notices!: Notifications;
  private inbound!: InboundChip;
  private death!: DeathCard;

  private flash!: HTMLElement;
  private flashOpacity!: StyleCell;
  private flashAmount = 0;
  private flashDecay = 1;

  private hiddenClass!: ClassCell;
  private deadClass!: ClassCell;
  private targetingClass!: ClassCell;

  private world: IWorld | null = null;
  private ai: IAI | null = null;
  private player: IPlayer | null = null;
  private weapons: IWeapons | null = null;
  private killstreaks: IKillstreaks | null = null;
  private pipeline: IRenderPipeline | null = null;
  private director: IDirector | null = null;

  private readonly unsubscribe: Array<() => void> = [];
  private showcase: { update?(dt: number): void; dispose?(): void } | null = null;

  /** True while a full-screen menu owns the frame. */
  private menuOpen = false;
  /** True for capture runs of somebody else's vantage point. */
  private quiet = false;
  private showcaseMode = false;

  private firing = 0;
  private score = 0;
  private lastScore = 0;
  private killedBy = 'ENEMY';
  private cause = 'HOSTILE FIRE';
  private deathClock = 0;
  private cssWidth = 1280;
  private cssHeight = 720;
  /** True while a strike is being designated and the HUD has stood down. */
  private designating = false;

  async init(ctx: GameContext): Promise<void> {
    this.ctx = ctx;
    const params = new URLSearchParams(typeof location === 'undefined' ? '' : location.search);
    this.showcaseMode = params.get('showcase') === 'hud';
    // Other agents photograph the world, the weapons and the effects through the
    // same harness. A HUD drawn over those shots would ruin every one of them,
    // so a capture run only gets a HUD if it explicitly asked for one.
    this.quiet = params.has('capture') && !this.showcaseMode;

    this.build(ctx);
    this.resolve(ctx);
    this.listen(ctx);

    ctx.renderer.getDrawingBufferSize(_buffer);
    this.resize(_buffer.x, _buffer.y, ctx);

    if (this.showcaseMode) {
      try {
        const mod = await import('./HUDShowcase');
        this.showcase = new mod.HUDShowcase(ctx, this);
      } catch (err) {
        console.error('[hud] showcase failed to load:', err);
      }
    }
  }

  private build(ctx: GameContext): void {
    this.root = div('hud', ctx.uiRoot);
    if (this.quiet) this.root.style.display = 'none';

    // Order is stacking order. Screen-wide washes first, then the map layer,
    // then panels, then the things that must never be occluded.
    div('hud-scrim', this.root);
    this.vitals = new Vitals(this.root);
    this.reticle = new Reticle(this.root);

    const topLeft = div('hud-corner tl hud-combat', this.root);
    this.minimap = new Minimap(topLeft);
    this.streaks = new StreakTray(topLeft);

    const top = div('hud-top hud-combat', this.root);
    this.compass = new Compass(top);
    this.inbound = new InboundChip(top);
    this.notices = new Notifications(top);

    this.killfeed = new Killfeed(this.root);
    this.status = new StatusPanel(this.root);
    this.ammo = new AmmoPanel(this.root);
    this.pops = new ScorePops(this.root);
    this.banner = new StreakBanner(this.root);
    this.death = new DeathCard(this.root);

    // The killfeed survives a death — you want to see who got you and who your
    // squad got while you wait — but nothing survives a strike designation.
    this.killfeed.root.classList.add('hud-persist');
    for (const node of [this.status.root, this.ammo.root, this.pops.root]) {
      node.classList.add('hud-combat');
    }

    this.flash = div('hud-flash', this.root);
    this.flashOpacity = new StyleCell(this.flash, 'opacity');

    this.hiddenClass = new ClassCell(this.root, 'hidden');
    this.deadClass = new ClassCell(this.root, 'dead');
    this.targetingClass = new ClassCell(this.root, 'targeting');
  }

  private resolve(ctx: GameContext): void {
    this.world = ctx.tryGet<IWorld>('world') ?? null;
    this.ai = ctx.tryGet<IAI>('ai') ?? null;
    this.player = ctx.tryGet<IPlayer>('player') ?? null;
    this.weapons = ctx.tryGet<IWeapons>('weapons') ?? null;
    this.killstreaks = ctx.tryGet<IKillstreaks>('killstreaks') ?? null;
    this.pipeline = ctx.tryGet<IRenderPipeline>('render') ?? null;
    this.minimap.attach(this.world, this.ai);
    this.compass.attach(this.world);
    this.status.setObjective('Awaiting deployment');
  }

  /* =============================== events ================================= */

  private listen(ctx: GameContext): void {
    const on = ctx.events.on.bind(ctx.events);
    const off = this.unsubscribe;

    off.push(
      on('ui:hitmarker', (e) => this.reticle.hit(e.damage, e.lethal, e.headshot)),
      on('ui:killfeed', (e) => this.killfeed.push(e)),
      on('ui:notify', (e) => this.notices.push(e)),
      on('ui:objective', (e) => this.status.setObjective(e.text)),
      on('ui:score', (e) => {
        this.score = e.score;
        this.pops.push(e.delta, e.reason);
      }),
      on('weapon:fire', () => {
        this.firing = 0.12;
      }),
      on('player:damage', (e) => this.onDamage(e.amount, e.from)),
      on('player:death', (e) => this.onDeath(e.by)),
      on('player:spawn', () => this.onSpawn()),
      on('killstreak:progress', (e) => {
        this.streakKills = e.kills;
        this.streakNext = e.next;
      }),
      on('killstreak:earned', (e) => {
        const def = this.killstreaks?.available.find((d) => d.id === e.id);
        this.banner.show(e.name, def?.icon ?? e.id, 'KILLSTREAK READY');
      }),
      on('killstreak:uav', (e) => this.minimap.setUav(e.active, e.sweepPeriod)),
      on('killstreak:package', (e) => {
        if (e.state === 'collected') this.minimap.clearMarkers('package');
        else this.minimap.mark('package', e.position, 90);
      }),
      on('killstreak:aircraft', (e) => {
        if (e.active) this.minimap.mark('aircraft', e.position, 2);
      }),
      on('killstreak:targeting', (e) => {
        this.designating = e.active;
      }),
      // Only the marker: the killstreak system's own instrument panel owns every
      // readout in this event, and the radar is not on screen during a
      // designation anyway — this is so the marker is already correct when the
      // HUD comes back up and the ordnance is still in the air.
      on('killstreak:target', (e) => this.minimap.mark('strike', e.position, 0.4)),
      on('airstrike:inbound', (e) => this.inbound.set(e.secondsToImpact)),
      on('airstrike:begin', (e) => this.minimap.mark('strike', e.target, 30)),
      on('airstrike:end', () => {
        this.inbound.hide();
        this.minimap.clearMarkers('strike');
      }),
      on('fx:flashbang', () => {
        this.flashAmount = 1;
        this.flashDecay = 0.38;
      }),
      on('game:wave', (e) => {
        if (e.phase === 'incoming') {
          this.banner.show(`WAVE ${e.wave}`, 'wave', `${e.size} HOSTILES INBOUND`);
        } else if (e.phase === 'cleared') {
          this.banner.show(`WAVE ${e.wave} CLEARED`, 'medal', 'REGROUP AND RESUPPLY');
        }
      }),
      on('ui:screen', (e) => {
        this.menuOpen = e.screen !== 'none';
      }),
      on('game:restart', () => this.reset()),
    );
  }

  private streakKills = 0;
  private streakNext: string | null = null;

  private onDamage(amount: number, from?: THREE.Vector3): void {
    if (!from) return;
    const player = this.player;
    if (player) {
      _pos.copy(player.eyePosition);
      _fwd.copy(player.forward);
    } else {
      _pos.copy(this.ctx.camera.position);
      this.ctx.camera.getWorldDirection(_fwd);
    }
    this.vitals.hit(screenBearing(_pos, _fwd, from), amount);
  }

  private onDeath(by: string): void {
    this.killedBy = by === 'enemy' ? 'HOSTILE INFANTRY' : by.toUpperCase();
    this.cause = by === 'falling' ? 'FALL DAMAGE' : 'SMALL ARMS FIRE';
    this.death.show(this.killedBy, this.cause);
    this.deathClock = 0;
    this.reticle.clearMarkers();
  }

  private onSpawn(): void {
    this.deathClock = 0;
    this.vitals.clear();
    this.reticle.clearMarkers();
  }

  private reset(): void {
    this.score = 0;
    this.lastScore = 0;
    this.streakKills = 0;
    this.streakNext = null;
    this.killfeed.clear();
    this.notices.clear();
    this.pops.clear();
    this.streaks.clear();
    this.banner.clear();
    this.inbound.hide();
    this.designating = false;
    this.vitals.clear();
    this.reticle.clearMarkers();
    this.minimap.clear();
    this.flashAmount = 0;
  }

  /* ================================ frame ================================= */

  resize(width: number, height: number, ctx: GameContext): void {
    // `width`/`height` arrive in drawing-buffer pixels, which the render scale
    // has already been applied to. The HUD wants CSS pixels for layout and the
    // true device ratio for its canvases, so neither is taken from the argument.
    const css = ctx.canvas.clientWidth || Math.round(width);
    const cssH = ctx.canvas.clientHeight || Math.round(height);
    this.cssWidth = css;
    this.cssHeight = cssH;
    const ratio = Math.min(2, typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1);
    this.reticle.resize(css, cssH, ratio);
    this.vitals.resize(css, cssH, ratio);
    this.minimap.resize(css, cssH, ratio);
    this.compass.resize(css, cssH);
  }

  update(dt: number, ctx: GameContext): void {
    if (this.quiet) return;
    this.director ??= ctx.tryGet<IDirector>('director') ?? null;
    this.showcase?.update?.(dt);

    const player = this.player;
    const weapons = this.weapons;
    const stats: WeaponStats | null = weapons?.current ?? null;
    const state = this.director?.state ?? 'playing';
    const dead = state === 'dead' || (player ? !player.alive : false);
    const designating = this.designating || this.killstreaks?.targeting === true;
    const hidden =
      this.menuOpen || state === 'menu' || state === 'over' || (state === 'paused' && !dead);

    this.hiddenClass.set(hidden);
    this.deadClass.set(dead && !hidden);
    this.targetingClass.set(designating);

    const combatVisible = !hidden && !dead && !designating;
    this.firing = Math.max(0, this.firing - dt);

    if (player) {
      _pos.copy(player.position);
      _fwd.copy(player.forward);
    } else {
      _pos.copy(ctx.camera.position);
      ctx.camera.getWorldDirection(_fwd);
    }
    ctx.camera.getWorldDirection(_dir);
    const yaw =
      player?.viewYaw !== undefined ? player.viewYaw : Math.atan2(_dir.x, -_dir.z);

    /* ---- the middle of the screen ---- */
    this.reticle.update(dt, {
      spread: weapons?.spread ?? 0.012,
      fov: player?.fov ?? ctx.camera.fov,
      screenH: this.cssHeight,
      adsFactor: weapons?.adsFactor ?? player?.adsFactor ?? 0,
      weaponId: stats?.id ?? 'rifle',
      pelletSpread: stats?.pelletSpread ?? 0,
      firing: this.firing > 0,
      visible: combatVisible,
      dead,
    });

    /* ---- health ---- */
    const maxHealth = Math.max(1, player?.maxHealth ?? 100);
    const fraction = player ? clamp01(player.health / maxHealth) : 1;
    const vignette = this.vitals.update(dt, fraction, !dead, !hidden);
    // Written every frame, including zero. Skipping the write while a menu is up
    // leaves whatever the last frame of gameplay set, which paints the main menu
    // and the loadout screen red.
    this.pipeline?.setDamageVignette(hidden ? 0 : vignette);

    /* ---- map and heading ---- */
    if (combatVisible) {
      this.minimap.update(dt, {
        position: _pos,
        yaw,
        revealAll: this.killstreaks?.uavActive === true,
        visible: true,
      });
      this.compass.update(_pos, yaw);
    }

    /* ---- panels ---- */
    this.ammo.update(weapons, stats);
    this.streaks.update(
      this.killstreaks,
      this.killstreaks?.killstreak ?? this.streakKills,
      this.streakNext,
      this.killstreaks?.killsToNext ?? 0,
    );

    const director = this.director;
    const score = director?.score ?? this.score;
    if (score !== this.lastScore) this.lastScore = score;
    this.status.update({
      score,
      kills: director?.kills ?? 0,
      wave: director?.wave ?? 0,
      hostilesLeft: director?.enemiesLeft ?? this.ai?.aliveCount ?? 0,
      waveSize: director?.waveSize ?? 0,
      lives: director?.lives ?? 0,
      maxLives: director?.maxLives ?? 0,
    });

    this.killfeed.update(dt);
    this.notices.update(dt);
    this.pops.update(dt);
    this.banner.update(dt);
    this.inbound.update(dt);

    /* ---- death ---- */
    if (dead) {
      this.deathClock += dt;
      const total = director?.respawnTotal ?? 5;
      this.death.update({
        respawnIn: director?.respawnIn ?? Math.max(0, total - this.deathClock),
        respawnTotal: total,
        lives: director?.lives ?? 0,
        maxLives: director?.maxLives ?? 0,
        score,
        kills: director?.kills ?? 0,
        bestStreak: this.killstreaks?.bestStreak ?? 0,
      });
    }

    /* ---- flashbang recovery ---- */
    if (this.flashAmount > 0.001) {
      this.flashAmount = Math.max(0, this.flashAmount - dt * this.flashDecay);
      // Squared on the way out, so the useful part of the recovery — the last
      // half second where the world is coming back — is not spent at full white.
      this.flashOpacity.set((this.flashAmount * this.flashAmount).toFixed(3));
    } else {
      this.flashOpacity.set('0');
    }
  }

  /* ============================== harness ================================= */

  /*
   * Everything below exists for the showcase. It is public because the showcase
   * is a separate module, and grouped here so it is obvious that no gameplay
   * path calls any of it.
   */

  get element(): HTMLElement {
    return this.root;
  }

  get parts(): {
    reticle: Reticle;
    vitals: Vitals;
    minimap: Minimap;
    compass: Compass;
    killfeed: Killfeed;
    notices: Notifications;
    banner: StreakBanner;
    inbound: InboundChip;
    streaks: StreakTray;
    status: StatusPanel;
    pops: ScorePops;
    death: DeathCard;
  } {
    return {
      reticle: this.reticle,
      vitals: this.vitals,
      minimap: this.minimap,
      compass: this.compass,
      killfeed: this.killfeed,
      notices: this.notices,
      banner: this.banner,
      inbound: this.inbound,
      streaks: this.streaks,
      status: this.status,
      pops: this.pops,
      death: this.death,
    };
  }

  /** Forces the death card up without a death, for the screenshot harness. */
  poseDeath(by: string, cause: string): void {
    this.death.show(by, cause);
  }

  /**
   * Points the HUD at stand-in implementations so a shot can be composed without
   * playing a match into the state it wants. Pass null for a slot to restore the
   * system the context holds.
   */
  substitute(over: {
    player?: IPlayer | null;
    weapons?: IWeapons | null;
    killstreaks?: IKillstreaks | null;
    director?: IDirector | null;
  }): void {
    if ('player' in over) this.player = over.player ?? this.ctx.tryGet<IPlayer>('player') ?? null;
    if ('weapons' in over) {
      this.weapons = over.weapons ?? this.ctx.tryGet<IWeapons>('weapons') ?? null;
    }
    if ('killstreaks' in over) {
      this.killstreaks = over.killstreaks ?? this.ctx.tryGet<IKillstreaks>('killstreaks') ?? null;
    }
    if ('director' in over) {
      this.director = over.director ?? this.ctx.tryGet<IDirector>('director') ?? null;
    }
  }

  /** Empties every transient so one shot cannot inherit the previous one's state. */
  poseReset(): void {
    this.reset();
    this.streakKills = 0;
    this.streakNext = null;
    this.designating = false;
    this.firing = 0;
    this.deathClock = 0;
  }

  dispose(): void {
    for (const fn of this.unsubscribe) fn();
    this.unsubscribe.length = 0;
    this.showcase?.dispose?.();
    this.showcase = null;
    this.root?.remove();
  }
}

const _buffer = new THREE.Vector2();
