/**
 * Menu state.
 *
 * One screen at a time, and `isOpen` is the single source of truth the player
 * module reads before it grabs the pointer — so every path in here has to leave
 * it correct, including the ones that run while the engine is paused.
 *
 * Pointer lock is requested from the click that closes a screen rather than a
 * frame later, because the browser only honours the request inside the user
 * gesture that asked for it. The player module owns the lock everywhere else.
 */
import type { Input } from '../../core/Input';
import type { Binding, Settings } from '../Settings';
import type { ActionName } from '../../core/Input';
import type { RosterEntry } from '../Roster';
import { DeathScreen } from './DeathScreen';
import { LoadoutMenu, type LoadoutSource } from './LoadoutMenu';
import { MainMenu } from './MainMenu';
import { PauseMenu } from './PauseMenu';
import { Scoreboard } from './Scoreboard';
import { SettingsMenu } from './SettingsMenu';
import type { UiSound } from '../Sound';
import { setClass } from '../Dom';

export type Screen = 'none' | 'main' | 'pause' | 'settings' | 'loadout';

export interface MenuDeps {
  settings: Settings;
  input: Input;
  canvas: HTMLElement | null;
  sound: UiSound;
  loadout: LoadoutSource;
  /** Fired when the player asks to leave a blocking screen and play. */
  onPlay(): void;
  onRestart(): void;
  onSettingsApplied(): void;
}

/** A press that lands within this of an open is the press that caused it. */
const REOPEN_GUARD = 0.3;

export class Menus {
  readonly main: MainMenu;
  readonly pause: PauseMenu;
  readonly settingsMenu: SettingsMenu;
  readonly loadout: LoadoutMenu;
  readonly scoreboard: Scoreboard;
  readonly death: DeathScreen;

  private screen: Screen = 'none';
  private changedAt = -1;
  private cursorShown = false;

  constructor(parent: HTMLElement, private readonly deps: MenuDeps) {
    const bindings = (): Record<ActionName, Binding> => deps.settings.bindings;

    this.main = new MainMenu(
      parent,
      bindings,
      () => this.play(),
      () => this.show('settings'),
    );
    this.pause = new PauseMenu(parent, {
      resume: () => this.play(),
      loadout: () => this.show('loadout'),
      settings: () => this.show('settings'),
      controls: () => this.showControls(),
      restart: () => {
        this.deps.onRestart();
        this.play();
      },
    });
    this.settingsMenu = new SettingsMenu(
      parent,
      deps.settings,
      () => this.back(),
      () => deps.onSettingsApplied(),
    );
    this.loadout = new LoadoutMenu(parent, deps.loadout, () => this.back());
    this.scoreboard = new Scoreboard(parent);
    this.death = new DeathScreen(parent, deps.sound);

    // One delegated listener rather than a cue at every widget: the menus are
    // built from a handful of control classes, and the press that reaches any of
    // them is the press worth answering.
    parent.addEventListener('pointerdown', (event) => {
      const target = event.target as HTMLElement | null;
      if (!target?.closest) return;
      if (target.closest('.ob-btn, .ob-main-deploy')) this.deps.sound.play('select');
      else if (target.closest('.ob-sw, .ob-seg button, .ob-sl, .ob-tab, .ob-bind')) {
        this.deps.sound.play('nav');
      }
    });
  }

  // -------------------------------------------------------------------------
  // Screens
  // -------------------------------------------------------------------------

  get current(): Screen {
    return this.screen;
  }

  /** True whenever a screen is claiming the pointer. */
  get isOpen(): boolean {
    return this.screen !== 'none';
  }

  show(screen: Screen, now = -1): void {
    if (this.screen === screen) return;
    const wasOpen = this.isOpen;
    this.screen = screen;
    this.changedAt = now;
    if (screen === 'none') this.deps.sound.play('close');
    else if (!wasOpen) this.deps.sound.play('open');
    setClass(this.main.root, 'open', screen === 'main');
    setClass(this.pause.root, 'open', screen === 'pause');
    setClass(this.settingsMenu.root, 'open', screen === 'settings');
    setClass(this.loadout.root, 'open', screen === 'loadout');
    if (screen !== 'settings') this.settingsMenu.cancelCapture();
    if (screen === 'settings') this.settingsMenu.refresh();
    if (screen === 'loadout') this.loadout.refresh();
    if (screen === 'main') this.main.refresh();
    this.syncCursor();
  }

  private showControls(): void {
    this.show('settings');
    this.settingsMenu.openAt('controls');
  }

  /** Settings and loadout are opened from the pause screen and return to it. */
  private back(): void {
    this.show('pause');
  }

  /** Close every blocking screen and hand the pointer back to the game. */
  private play(): void {
    this.show('none');
    this.deps.onPlay();
  }

  /**
   * The pause action. Returns true when it was consumed, so the caller knows not
   * to also treat it as a request to pause the engine.
   */
  handlePause(now: number): boolean {
    if (this.settingsMenu.isCapturing) return true;
    if (now - this.changedAt < REOPEN_GUARD) return true;
    switch (this.screen) {
      case 'main':
        return true;
      case 'settings':
      case 'loadout':
        this.back();
        return true;
      case 'pause':
        this.play();
        return true;
      default:
        this.show('pause', now);
        return false;
    }
  }

  /** Driven by `engine:paused`; the engine pauses for reasons beyond this menu. */
  onPaused(paused: boolean, now: number): void {
    if (paused) {
      if (this.screen === 'none') this.show('pause', now);
      return;
    }
    if (this.screen !== 'main' && this.screen !== 'none') this.show('none', now);
  }

  // -------------------------------------------------------------------------
  // Overlays
  // -------------------------------------------------------------------------

  setScoreboard(open: boolean, entries: readonly RosterEntry[], hostiles: number): void {
    this.scoreboard.setOpen(open);
    this.scoreboard.update(entries, hostiles);
  }

  setStatus(place: string, score: number, kills: number, deaths: number, streak: number): void {
    this.pause.setStatus(place);
    this.pause.setScore(score, kills, deaths, streak);
  }

  update(now: number): void {
    this.death.update(now);
  }

  /**
   * The canvas hides the cursor while playing, so it has to come back for a
   * screen that can be clicked. This is the one place outside the HUD that
   * touches an element the UI does not own, and it only ever toggles that class.
   */
  private syncCursor(): void {
    const wanted = this.isOpen;
    if (wanted === this.cursorShown) return;
    this.cursorShown = wanted;
    if (this.deps.canvas) setClass(this.deps.canvas, 'unlocked', wanted);
  }

  dispose(): void {
    this.settingsMenu.cancelCapture();
    if (this.deps.canvas) setClass(this.deps.canvas, 'unlocked', false);
  }
}
