import * as THREE from 'three';
import type { GameContext, System } from '../core/GameContext';
import type { IAudio, IDirector, IKillstreaks, IPlayer, IWeapons } from '../core/Interfaces';
import { getVantage, listVantages, type Vantage } from '../core/Vantage';
import { div, el, StyleCell, TextCell } from './dom';
import { bootLoadingScreen } from './menus/Loading';
import { ControlsScreen } from './menus/Controls';
import { LoadoutScreen } from './menus/Loadout';
import { SettingsScreen } from './menus/Settings';
import { button, header } from './menus/Widgets';

/**
 * Menus.
 *
 * ## The background is the game
 *
 * The main menu is posed at one of the cinematic vantage points the world
 * registers for the screenshot harness, drifting slowly, and cutting to another
 * every quarter of a minute. This costs one camera transform per frame — the
 * scene was going to be rendered anyway — and it is the single highest
 * value-per-line decision in this file: a menu over the real level at golden
 * hour looks like a game, and a menu over a flat colour looks like a prototype.
 *
 * The cut is a hard cut behind a two-tenths-of-a-second dip to black rather than
 * a crossfade, because a crossfade needs two frames of the same scene and we only
 * ever have one.
 *
 * ## Pointer lock
 *
 * One rule: **the pointer is locked if and only if no screen is open.** Losing
 * lock while playing opens the pause screen, which is what the player wanted
 * when they hit Escape or tabbed away; opening a screen releases it; closing the
 * last screen asks for it back. Because the request must come from a gesture, it
 * is always made inside the click handler that closed the screen.
 *
 * ## What a menu is allowed to touch
 *
 * The simulation is stopped through `IDirector.pause`, never through
 * `Engine.paused`, because the frame must keep being drawn: the pause menu sits
 * over a live scene, the main menu needs its camera drift, and the HUD needs to
 * animate itself out of the way. Nothing here reaches into another system except
 * through its interface.
 */

export type ScreenName = 'none' | 'main' | 'loadout' | 'settings' | 'controls' | 'pause' | 'over';

/** Vantage points worth putting a title over, best first. */
const MENU_VANTAGES = [
  'market_hero',
  'souk',
  'villa_court',
  'cross_street',
  'rooftop',
  'sea_wall',
  'gate_approach',
  'alley',
  'fountain_low',
  'compound_gate',
];

/** Seconds a menu shot holds before cutting to the next. */
const SHOT_LENGTH = 15;
const CUT_LENGTH = 0.55;
const CUT_DARK = CUT_LENGTH * 0.4;

const _target = new THREE.Vector3();
const _offset = new THREE.Vector3();

// The loading screen has to exist before `Engine.init` starts generating the
// level, which is many seconds before this system is constructed. Importing this
// module is the earliest hook available, so it is used.
bootLoadingScreen();

export default class MenuSystem implements System {
  readonly key = 'menu';
  readonly order = 92;

  private ctx!: GameContext;
  private root!: HTMLElement;
  private cutOpacity!: StyleCell;

  private main!: HTMLElement;
  private pause!: HTMLElement;
  private over!: HTMLElement;
  private loadout!: LoadoutScreen;
  private settings!: SettingsScreen;
  private controls!: ControlsScreen;

  private pauseWave!: TextCell;
  private pauseScore!: TextCell;
  private overTitle!: TextCell;
  private overSub!: TextCell;
  private overStats: TextCell[] = [];
  private shotName!: TextCell;

  private screen: ScreenName = 'none';
  /** Where Escape and the back button return to from a sub-screen. */
  private returnTo: ScreenName = 'main';

  private director: IDirector | null = null;
  private player: IPlayer | null = null;
  private weapons: IWeapons | null = null;
  private audio: IAudio | null = null;

  private shots: Vantage[] = [];
  private shotIndex = 0;
  private shotClock = 0;
  private cutClock = -1;
  private audioUnlocked = false;
  /** True for capture runs; the harness owns the camera and the screen state. */
  private quiet = false;

  private readonly unsubscribe: Array<() => void> = [];

  init(ctx: GameContext): void {
    this.ctx = ctx;
    this.quiet =
      typeof location !== 'undefined' && new URLSearchParams(location.search).has('capture');

    this.director = ctx.tryGet<IDirector>('director') ?? null;
    this.player = ctx.tryGet<IPlayer>('player') ?? null;
    this.weapons = ctx.tryGet<IWeapons>('weapons') ?? null;
    this.audio = ctx.tryGet<IAudio>('audio') ?? null;

    // Whatever progress is left belongs to the loading screen, which has been on
    // screen since long before this system existed.
    bootLoadingScreen()?.attach(ctx.events);

    this.build(ctx);
    this.collectShots();

    const on = ctx.events.on.bind(ctx.events);
    this.unsubscribe.push(
      on('game:ready', () => {
        if (!this.quiet) this.open('main');
      }),
      on('game:over', (e) => this.showOver(e.won)),
    );

    ctx.input.setLockChangeHandler((locked) => this.onLockChange(locked));
  }

  /* ================================ build ================================= */

  private build(ctx: GameContext): void {
    this.root = div('menus', ctx.uiRoot);
    div('menu-veil', this.root);
    this.cutOpacity = new StyleCell(div('menu-cut', this.root), 'opacity');
    this.cutOpacity.set('0');

    this.buildMain();
    this.loadout = new LoadoutScreen(this.root, (id) => this.weapons?.switchTo(id));
    this.settings = new SettingsScreen(this.root);
    this.controls = new ControlsScreen(this.root);
    this.buildPause();
    this.buildOver();
    this.paint();
  }

  private buildMain(): void {
    this.main = div('mscreen mscreen-main', this.root);
    const left = div('mm-left', this.main);

    const brand = div('mm-brand', left);
    el('span', 'mm-kicker', brand).textContent = 'Task Force 141 · Classified';
    const title = div('mm-title', brand);
    el('span', 'mm-title-1', title).textContent = 'Operation';
    el('span', 'mm-title-2', title).textContent = 'Blackout';
    div('mm-rule', brand);
    el('span', 'mm-blurb', brand).textContent =
      'Wave survival · Market district · Hold the ground and call in what you earn.';

    const nav = div('mm-nav', left);
    button(nav, {
      label: 'Deploy',
      hint: 'Begin the operation',
      kind: 'primary',
      onClick: () => this.deploy(),
    });
    button(nav, {
      label: 'Loadout',
      hint: 'Choose your primary',
      onClick: () => this.open('loadout', 'main'),
    });
    button(nav, {
      label: 'Settings',
      hint: 'Display, aiming and audio',
      onClick: () => this.open('settings', 'main'),
    });
    button(nav, {
      label: 'Controls',
      hint: 'Keyboard, mouse and gamepad',
      onClick: () => this.open('controls', 'main'),
    });

    const foot = div('mm-foot', this.main);
    el('span', 'mm-build', foot).textContent = 'Build 0.9.4 · Three.js · Procedurally generated';
    this.shotName = new TextCell(el('span', 'mm-shot', foot));
  }

  private buildPause(): void {
    this.pause = div('mscreen mscreen-pause', this.root);
    const card = div('mp-card', this.pause);
    header(card, '00', 'Mission paused');

    const readout = div('mp-readout', card);
    this.pauseWave = new TextCell(statCell(readout, 'Wave'));
    this.pauseScore = new TextCell(statCell(readout, 'Score'));

    const nav = div('mp-nav', card);
    button(nav, { label: 'Resume', kind: 'primary', onClick: () => this.resume() });
    button(nav, { label: 'Loadout', onClick: () => this.open('loadout', 'pause') });
    button(nav, { label: 'Settings', onClick: () => this.open('settings', 'pause') });
    button(nav, { label: 'Controls', onClick: () => this.open('controls', 'pause') });
    button(nav, {
      label: 'Restart mission',
      kind: 'quiet',
      onClick: () => {
        this.director?.restart();
        this.close();
      },
    });
    button(nav, {
      label: 'Abandon mission',
      kind: 'danger',
      onClick: () => this.abandon(),
    });
  }

  private buildOver(): void {
    this.over = div('mscreen mscreen-over', this.root);
    const card = div('mo-card', this.over);
    this.overTitle = new TextCell(el('h2', 'mo-title', card));
    this.overSub = new TextCell(el('span', 'mo-sub', card));
    div('mo-rule', card);

    const grid = div('mo-stats', card);
    for (const label of ['Score', 'Waves held', 'Kills', 'Best streak']) {
      this.overStats.push(new TextCell(statCell(grid, label)));
    }

    const nav = div('mo-nav', card);
    button(nav, {
      label: 'Redeploy',
      kind: 'primary',
      onClick: () => {
        this.director?.restart();
        this.close();
      },
    });
    button(nav, { label: 'Main menu', onClick: () => this.abandon() });
  }

  /* =============================== screens ================================ */

  /** Opens a screen. `from` is where Escape should return to. */
  open(screen: ScreenName, from?: ScreenName): void {
    if (screen === 'none') {
      this.close();
      return;
    }
    if (from) this.returnTo = from;
    if (screen === 'main' || screen === 'over') this.returnTo = screen;

    const previous = this.screen;
    this.screen = screen;

    // Built on first open so their initial values are the ones in force, not the
    // ones that happened to be set during boot.
    if (screen === 'settings') {
      this.settings.build(this.ctx);
      this.settings.refresh();
    }
    if (screen === 'controls') this.controls.build(this.ctx.input);
    if (screen === 'loadout') this.loadout.attach(this.weapons);

    if (previous === 'none') {
      this.ctx.input.exitLock();
      if (screen === 'main') this.shotClock = SHOT_LENGTH;
    }
    this.paint();
  }

  /** Returns to gameplay, or to the menu backdrop when there is no match. */
  close(): void {
    if (this.screen === 'none') return;
    this.screen = 'none';
    this.paint();
    this.unlockAudio();
    if (!this.quiet) this.ctx.input.requestLock();
  }

  private back(): void {
    if (this.screen === 'pause') {
      this.resume();
      return;
    }
    if (this.screen === 'main' || this.screen === 'over' || this.screen === 'none') return;
    this.open(this.returnTo);
  }

  private deploy(): void {
    this.unlockAudio();
    this.director?.start();
    this.close();
  }

  private resume(): void {
    this.director?.pause(false);
    this.close();
  }

  private abandon(): void {
    this.director?.toMenu?.();
    this.open('main');
    this.shotClock = SHOT_LENGTH;
  }

  private showOver(won: boolean): void {
    const d = this.director;
    this.overTitle.set(won ? 'Operation complete' : 'Mission failed');
    this.overSub.set(
      won
        ? 'The district is held. Every hostile in the sector is down.'
        : `Overrun on wave ${d?.wave ?? 1}. The market is lost.`,
    );
    this.overStats[0].set(String(d?.score ?? 0));
    this.overStats[1].set(String(Math.max(0, (d?.wave ?? 1) - (won ? 0 : 1))));
    this.overStats[2].set(String(d?.kills ?? 0));
    this.overStats[3].set(String(d?.bestStreak ?? this.ctx.tryGet<IKillstreaks>('killstreaks')?.bestStreak ?? 0));
    this.open('over');
  }

  /**
   * The only place the screen state reaches the DOM. One class on the root and
   * one on each screen, so switching screens is two class writes rather than a
   * cascade of `display` flips.
   */
  private paint(): void {
    const open = this.screen !== 'none';
    this.root.classList.toggle('open', open);
    // `interactive` is the opt-in that `#ui-root` requires. Without it the menu
    // cannot be clicked; with it left on, gameplay clicks never reach the canvas.
    this.root.classList.toggle('interactive', open);
    this.root.classList.toggle('cinematic', this.cinematic);
    this.root.dataset.screen = this.screen;

    for (const [name, node] of this.nodes()) {
      node.classList.toggle('on', name === this.screen);
    }
    this.ctx.events.emit('ui:screen', { screen: this.screen });
  }

  private nodes(): Array<[ScreenName, HTMLElement]> {
    return [
      ['main', this.main],
      ['loadout', this.loadout.root],
      ['settings', this.settings.root],
      ['controls', this.controls.root],
      ['pause', this.pause],
      ['over', this.over],
    ];
  }

  /** True while the menu owns the camera rather than sitting over a live match. */
  private get cinematic(): boolean {
    if (this.screen === 'none' || this.screen === 'pause') return false;
    const state = this.director?.state;
    return state === undefined || state === 'menu' || state === 'over';
  }

  /* ============================== pointer lock ============================ */

  private onLockChange(locked: boolean): void {
    if (locked) return;
    // Lock is lost by Escape, by alt-tab, or by us. The first two should pause a
    // running match; the third already has a screen open, so this does nothing.
    if (this.screen !== 'none') return;
    const state = this.director?.state;
    if (state === 'playing' || state === 'briefing' || state === 'dead') {
      this.director?.pause(true);
      this.open('pause');
    }
  }

  private unlockAudio(): void {
    if (this.audioUnlocked) return;
    this.audioUnlocked = true;
    // WebAudio needs a gesture, and every path into gameplay goes through a
    // button, so this is the one place it can be done without a nag banner.
    // `IAudio` is only partly implemented while the audio system is a stub, so
    // the method is probed rather than assumed.
    void this.audio?.resume?.().catch(() => {});
  }

  /* ================================ frame ================================= */

  update(dt: number, ctx: GameContext): void {
    if (this.quiet) return;

    if (ctx.input.wasPressed('pause')) this.onPauseKey();

    if (this.screen === 'loadout') {
      // The weapon slot keys work on the loadout screen, because that is what a
      // player who has just read "1 · primary" will try.
      if (ctx.input.wasPressed('weapon1')) this.loadout.selectSlot(0);
      if (ctx.input.wasPressed('weapon2')) this.loadout.selectSlot(1);
      if (ctx.input.wasPressed('weapon3')) this.loadout.selectSlot(2);
    }

    if (this.screen === 'pause') {
      const d = this.director;
      this.pauseWave.set(String(d?.wave ?? 0).padStart(2, '0'));
      this.pauseScore.set(String(d?.score ?? 0));
    }

    if (this.cutClock >= 0) {
      const was = this.cutClock;
      this.cutClock += dt;
      // The shot changes at the darkest point of the dip, so the cut is never
      // seen — only the darkness either side of it.
      if (was < CUT_DARK && this.cutClock >= CUT_DARK) {
        this.shotIndex = (this.shotIndex + 1) % this.shots.length;
        this.shotClock = 0;
      }
      const t = this.cutClock / CUT_LENGTH;
      const alpha = t < 0.4 ? t / 0.4 : Math.max(0, 1 - (t - 0.4) / 0.6);
      this.cutOpacity.set(alpha.toFixed(3));
      if (this.cutClock >= CUT_LENGTH) {
        this.cutClock = -1;
        this.cutOpacity.set('0');
      }
    }
  }

  private onPauseKey(): void {
    if (this.screen !== 'none') {
      this.back();
      return;
    }
    const state = this.director?.state;
    if (state === 'playing' || state === 'briefing' || state === 'dead') {
      this.director?.pause(true);
      this.open('pause');
    }
  }

  /**
   * Camera drift, in `lateUpdate` so it runs after the player controller has had
   * its say — while the menu is up the controller is disabled and returns early,
   * but the ordering means nothing has to be coordinated for that to be true.
   */
  lateUpdate(dt: number, ctx: GameContext): void {
    if (this.quiet || !this.cinematic || this.shots.length === 0) return;

    this.shotClock += dt;
    if (this.shotClock >= SHOT_LENGTH && this.cutClock < 0) this.cutClock = 0;

    const shot = this.shots[this.shotIndex];
    _target.copy(shot.lookAt ?? shot.position);
    _offset.copy(shot.position).sub(_target);

    // A slow orbit about the point of interest, a slower push in, and a gentle
    // rise. Three periods that do not divide into each other, so the motion never
    // visibly loops in the quarter minute the shot is up.
    const t = this.shotClock;
    const yaw = Math.sin(t * 0.085) * 0.05;
    const cos = Math.cos(yaw);
    const sin = Math.sin(yaw);
    const x = _offset.x * cos - _offset.z * sin;
    const z = _offset.x * sin + _offset.z * cos;
    const push = 1 - 0.035 * (1 - Math.cos(t * 0.055));
    ctx.camera.position.set(
      _target.x + x * push,
      _target.y + (_offset.y + Math.sin(t * 0.13) * 0.22) * push,
      _target.z + z * push,
    );
    ctx.camera.lookAt(_target);
    const fov = shot.fov ?? 52;
    if (Math.abs(ctx.camera.fov - fov) > 0.01) {
      ctx.camera.fov = fov;
      ctx.camera.updateProjectionMatrix();
    }
    ctx.camera.updateMatrixWorld(true);

    this.shotName.set(shot.name.replace(/_/g, ' '));
  }

  private collectShots(): void {
    const known = new Set(listVantages());
    for (const name of MENU_VANTAGES) {
      if (!known.has(name)) continue;
      const v = getVantage(name);
      // A shot without a look-at target cannot be orbited, and every world
      // vantage has one; the weapon and effect ones do not and are not wanted.
      if (v?.lookAt) this.shots.push(v);
    }
    if (this.shots.length === 0) {
      for (const name of known) {
        const v = getVantage(name);
        if (v?.lookAt) this.shots.push(v);
        if (this.shots.length >= 4) break;
      }
    }
  }

  /* ============================== harness ================================= */

  /** Opens a screen under the capture harness, which is otherwise held silent. */
  poseScreen(screen: ScreenName): void {
    const wasQuiet = this.quiet;
    this.quiet = false;
    this.open(screen, screen === 'pause' ? 'pause' : 'main');
    this.quiet = wasQuiet;
    if (screen === 'over') {
      this.overTitle.set('Mission failed');
      this.overSub.set('Overrun on wave 7. The market is lost.');
    }
  }

  get loadoutScreen(): LoadoutScreen {
    return this.loadout;
  }

  dispose(): void {
    for (const off of this.unsubscribe) off();
    this.unsubscribe.length = 0;
    this.root?.remove();
  }
}

function statCell(parent: HTMLElement, label: string): HTMLElement {
  const node = div('mstatcell', parent);
  el('span', 'mstatcell-key', node).textContent = label;
  return el('span', 'mstatcell-value', node);
}
