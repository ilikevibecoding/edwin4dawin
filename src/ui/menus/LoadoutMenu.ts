/**
 * The loadout screen.
 *
 * `openMenu('loadout')` is in the contract, so it needs somewhere to go. There is
 * no loadout editing in the game — the weapon module owns the kit — so this is a
 * read-only briefing card: what is carried, which slot is live, and which
 * killstreaks are in hand.
 */
import { div, markup, setClass, span } from '../Dom';
import { streakIcon, weaponIcon } from '../Icons';
import { streakList } from '../StreakDefs';
import type { KillstreakExtras } from '../HudState';
import { button, heading, rule } from './Widgets';

export interface LoadoutSource {
  /** Weapon ids in carry order. */
  loadout(): readonly string[];
  currentId(): string;
  currentName(): string;
  streaks(): KillstreakExtras | undefined;
  earned(): readonly string[];
}

const CLASS_LABEL: ReadonlyArray<[string, string]> = [
  ['ar_', 'Assault rifle'],
  ['smg_', 'Submachine gun'],
  ['lmg_', 'Light machine gun'],
  ['sniper_', 'Sniper rifle'],
  ['shotgun_', 'Shotgun'],
  ['pistol_', 'Sidearm'],
  ['launcher_', 'Launcher'],
  ['melee_', 'Melee'],
];

export class LoadoutMenu {
  readonly root: HTMLDivElement;

  private readonly weaponsEl: HTMLDivElement;
  private readonly streaksEl: HTMLDivElement;

  constructor(parent: HTMLElement, private readonly source: LoadoutSource, onClose: () => void) {
    this.root = div('ob-menu ob-loadout', parent);
    const body = div('ob-menu-body', this.root);
    const card = div('ob-card ob-loadout-card', body);

    heading(card, 'Loadout', 'ISSUED KIT');
    rule(card);
    span('lbl ob-pane-label', card, 'Weapons');
    this.weaponsEl = div('ob-lo-list', card);
    rule(card);
    span('lbl ob-pane-label', card, 'Killstreaks');
    this.streaksEl = div('ob-lo-streaks', card);
    rule(card);
    button(card, 'Back', onClose, { hint: 'ESC', className: 'ghost' });
  }

  refresh(): void {
    const current = this.source.currentId();
    const ids = this.source.loadout();
    this.weaponsEl.textContent = '';
    if (ids.length === 0) {
      span('ob-lo-empty lbl', this.weaponsEl, 'NO KIT ISSUED');
    }
    ids.forEach((id, index) => {
      const row = div('ob-lo-row', this.weaponsEl);
      setClass(row, 'on', id === current);
      markup('ob-lo-icon', weaponIcon(id), row);
      const text = div('ob-lo-text', row);
      span('ob-lo-name', text, id === current ? this.source.currentName().toUpperCase() : prettify(id));
      span('lbl', text, classOf(id));
      span('ob-lo-slot lbl', row, index === 0 ? 'PRIMARY' : index === 1 ? 'SECONDARY' : `SLOT ${index + 1}`);
    });

    const earned = this.source.earned();
    this.streaksEl.textContent = '';
    // The killstreak module's own ladder, cheapest first. Listing a hardcoded
    // set of ids here would go stale the first time one is added or retuned.
    const ladder = streakList(this.source.streaks());
    if (ladder.length === 0) {
      span('ob-lo-empty lbl', this.streaksEl, 'NO KILLSTREAKS AVAILABLE');
    }
    for (const def of ladder) {
      // The same row as a weapon rather than a tile: these carry a sentence of
      // prose each, and a sentence set in a 9-unit column is a stack of orphans.
      const row = div('ob-lo-row ob-lo-streak', this.streaksEl);
      setClass(row, 'on', earned.includes(def.id));
      markup('ob-lo-icon', streakIcon(def.id), row);
      const text = div('ob-lo-text', row);
      span('ob-lo-name', text, def.name.toUpperCase());
      if (def.description) span('ob-lo-desc', text, def.description);
      span('ob-lo-slot lbl', row, `${def.cost} KILLS`);
    }
  }
}

function classOf(id: string): string {
  for (const [prefix, label] of CLASS_LABEL) {
    if (id.startsWith(prefix)) return label.toUpperCase();
  }
  return 'STANDARD ISSUE';
}

/** Weapon ids are `class_name`; the class is already shown, so drop it. */
function prettify(id: string): string {
  const cut = id.indexOf('_');
  const name = cut >= 0 ? id.slice(cut + 1) : id;
  return name.replace(/_/g, ' ').toUpperCase();
}
