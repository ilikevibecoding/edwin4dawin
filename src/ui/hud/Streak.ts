/**
 * Score, killstreak progress and the killstreak tray.
 *
 * The progress block answers the only question a player has about streaks —
 * "how many more" — with the icon of the reward next to the count, and the tray
 * shows what is in hand with the key that fires it. A freshly earned streak
 * pulses until it is used, because earning one during a firefight is exactly when
 * a player misses the toast.
 */
import { div, el, markup, setClass, setStyle, setText, span } from '../Dom';
import { streakIcon } from '../Icons';
import type { FrameState, KillstreakExtras } from '../HudState';
import { nextStreak, streakDisplay, streakList } from '../StreakDefs';

interface Slot {
  node: HTMLDivElement;
  id: string;
}

export class Streak {
  readonly root: HTMLDivElement;
  readonly selection: HTMLDivElement;

  private readonly scoreEl: HTMLElement;
  private readonly killsEl: HTMLElement;
  private readonly deathsEl: HTMLElement;
  private readonly nextBlock: HTMLDivElement;
  private readonly nextIcon: HTMLDivElement;
  private readonly nextName: HTMLElement;
  private readonly nextSub: HTMLElement;
  private readonly nextBar: HTMLElement;
  private readonly trayEl: HTMLDivElement;

  private slots: Slot[] = [];
  private freshUntil = new Map<string, number>();
  private available: readonly string[] = [];
  private lastSignature = '';
  private lastNextId = '';
  private lastScore = -1;
  private lastKills = -1;
  private lastDeaths = -1;
  private lastSub = '';
  private selectionOpen = false;
  private hotkeys: readonly string[] = [];

  constructor(
    parent: HTMLElement,
    overlayParent: HTMLElement,
    private readonly system: () => KillstreakExtras | undefined,
  ) {
    this.root = div('ob-stk', parent);
    const panel = div('ob-stk-panel', this.root);

    const score = div('ob-stk-score', panel);
    this.scoreEl = this.cell(score, 'Score');
    this.killsEl = this.cell(score, 'Kills');
    this.deathsEl = this.cell(score, 'Deaths');

    this.nextBlock = div('ob-stk-next', panel);
    this.nextIcon = markup('ob-stk-icon', streakIcon('uav'), this.nextBlock);
    const text = div('ob-stk-next-text', this.nextBlock);
    this.nextName = span('ob-stk-name', text, 'UAV RECON');
    this.nextSub = span('ob-stk-sub', text, '3 MORE KILLS');
    const bar = div('ob-stk-bar', this.nextBlock);
    this.nextBar = el('i', undefined, bar);

    this.trayEl = div('ob-stk-tray', this.root);

    // The picker is a full-screen overlay, so it hangs off the HUD root rather
    // than off the corner block this widget otherwise lives in.
    this.selection = div('ob-ksel', overlayParent);
  }

  private cell(parent: HTMLElement, label: string): HTMLElement {
    const cell = div('ob-stk-cell', parent);
    span('lbl', cell, label);
    return span('n', cell, '0');
  }

  /**
   * Labels for the slot keys, straight from the live bindings. A player who
   * moves killstreak1 off the number row has to be told, or the tray is
   * instructing them to press a key that no longer does anything.
   */
  setHotkeys(keys: readonly string[]): void {
    if (keys === this.hotkeys) return;
    this.hotkeys = keys;
    this.rebuildTray();
    if (this.selectionOpen) this.buildSelection();
  }

  setSelectionOpen(open: boolean): void {
    if (this.selectionOpen === open) return;
    this.selectionOpen = open;
    setClass(this.selection, 'open', open);
    if (open) this.buildSelection();
  }

  markEarned(id: string, now: number): void {
    this.freshUntil.set(id, now + 12);
  }

  update(state: FrameState): void {
    if (state.score !== this.lastScore) {
      this.lastScore = state.score;
      setText(this.scoreEl, String(state.score));
    }
    if (state.kills !== this.lastKills) {
      this.lastKills = state.kills;
      setText(this.killsEl, String(state.kills));
    }
    if (state.deaths !== this.lastDeaths) {
      this.lastDeaths = state.deaths;
      setText(this.deathsEl, String(state.deaths));
    }

    const system = this.system();
    const next = nextStreak(state.streak, system);
    if (next) {
      const remaining = Math.max(0, next.cost - state.streak);
      const previous = bandStart(next.cost, system);
      const band = Math.max(1, next.cost - previous);
      const progress = Math.max(0, Math.min(1, (state.streak - previous) / band));
      if (next.id !== this.lastNextId) {
        this.lastNextId = next.id;
        this.nextIcon.innerHTML = streakIcon(next.id);
        setText(this.nextName, next.name.toUpperCase());
      }
      const sub = remaining === 1 ? '1 MORE KILL' : `${remaining} MORE KILLS`;
      if (sub !== this.lastSub) {
        this.lastSub = sub;
        setText(this.nextSub, sub);
      }
      setStyle(this.nextBar, '--p', progress.toFixed(3));
      setStyle(this.nextBlock, 'display', 'flex');
    } else if (this.lastNextId !== 'none') {
      this.lastNextId = 'none';
      setText(this.nextName, 'ALL STREAKS EARNED');
      setText(this.nextSub, `STREAK ${state.streak}`);
      setStyle(this.nextBar, '--p', '1');
    }

    this.syncTray(state);
  }

  private syncTray(state: FrameState): void {
    const signature = state.available.join(',');
    if (signature !== this.lastSignature) {
      this.lastSignature = signature;
      // Copied: the sampler reuses its array between frames.
      this.available = state.available.slice();
      this.rebuildTray();
      // The picker can be open while a care package lands; it shows the same
      // list as the tray, so it has to follow the same rebuild.
      if (this.selectionOpen) this.buildSelection();
    }
    for (const slot of this.slots) {
      const fresh = (this.freshUntil.get(slot.id) ?? 0) > state.time;
      setClass(slot.node, 'fresh', fresh);
    }
  }

  private rebuildTray(): void {
    this.trayEl.textContent = '';
    this.slots = [];
    const system = this.system();
    this.available.forEach((id, index) => {
      const node = div('ob-stk-slot ready', this.trayEl);
      node.innerHTML = streakIcon(id);
      const key = this.hotkeys[index];
      if (key) span('ob-stk-key', node, key);
      const def = streakDisplay(id, system);
      node.title = `${def.name} — key ${key ?? '?'}`;
      this.slots.push({ node, id });
    });
  }

  /**
   * The targeting-mode picker: what is in hand and the key that fires it. Reads
   * the same sampled list the tray does rather than the killstreak system, so
   * the two can never disagree about what the player is holding.
   */
  private buildSelection(): void {
    this.selection.textContent = '';
    const system = this.system();
    div('ob-ksel-head', this.selection).textContent = 'Select killstreak';
    const row = div('ob-ksel-row', this.selection);
    if (this.available.length === 0) {
      const card = div('ob-ksel-card locked', row);
      span('ob-stk-name', card, 'NO KILLSTREAKS');
      span('ob-stk-sub', card, 'EARN KILLS TO UNLOCK');
      return;
    }
    this.available.forEach((id, index) => {
      const def = streakDisplay(id, system);
      const card = div('ob-ksel-card', row);
      card.innerHTML = streakIcon(id);
      span('ob-stk-name', card, def.name.toUpperCase());
      span('ob-stk-sub', card, `KEY ${this.hotkeys[index] ?? '-'}`);
    });
  }
}

/** Cost of the streak below `cost`, so the bar fills across one tier only. */
function bandStart(cost: number, system: KillstreakExtras | undefined): number {
  let best = 0;
  for (const def of streakList(system)) {
    if (def.cost < cost && def.cost > best) best = def.cost;
  }
  return best;
}
