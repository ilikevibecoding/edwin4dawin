import type { IWeapons, WeaponStats } from '../../core/Interfaces';
import { clamp01, div, el, TextCell } from '../dom';
import { weaponIcon } from '../Icons';
import { header, StatBar } from './Widgets';

/**
 * The loadout screen.
 *
 * ## The preview is the real weapon
 *
 * There is no second renderer here and no orbiting turntable. Selecting a weapon
 * calls `IWeapons.switchTo`, which raises the actual first-person model in the
 * actual viewmodel pass, lit by the actual sky — and `IWeapons.inspect` turns it
 * in the player's hands. A bespoke preview would need its own scene, its own
 * lighting rig and its own copy of the weapon build code, and after all that it
 * would look *worse* than the thing the game already draws sixty times a second.
 *
 * The consequence for layout is that the bottom right of the frame belongs to
 * the weapon and nothing may be placed there. The list takes the left column and
 * the statistics sit above it on the right, which is also the arrangement that
 * puts the name of what you are holding next to the thing itself.
 *
 * ## Bars, not numbers
 *
 * Six bars, each normalised across the whole armoury so the shape of a weapon is
 * legible at a glance — a bar chart is the only reason anyone can tell that an
 * MP5 out-handles an M4 without firing either. The raw numbers are underneath
 * for the players who do want them, because a bar cannot tell you a magazine
 * holds thirty.
 */

const CLASS_NAMES: Record<string, string> = {
  rifle: 'Assault rifle',
  smg: 'Submachine gun',
  sniper: 'Marksman rifle',
  shotgun: 'Shotgun',
  pistol: 'Sidearm',
  knife: 'Melee',
};

const FIRE_MODE_NAMES: Record<string, string> = {
  auto: 'Fully automatic',
  semi: 'Semi automatic',
  burst: 'Three-round burst',
  bolt: 'Bolt action',
  pump: 'Pump action',
};

const SCOPE_NAMES: Record<string, string> = {
  none: 'Iron sights',
  reflex: 'Reflex sight',
  holo: 'Holographic sight',
  acog: '4× ACOG',
  sniper: '10× telescopic',
};

interface Row {
  node: HTMLElement;
  id: string;
}

export class LoadoutScreen {
  readonly root: HTMLElement;
  private readonly list: HTMLElement;
  private readonly rows: Row[] = [];
  private readonly name: TextCell;
  private readonly cls: TextCell;
  private readonly caliber: TextCell;
  private readonly bars: StatBar[] = [];
  private readonly numbers: TextCell[] = [];
  private readonly blurb: TextCell;
  private weapons: IWeapons | null = null;
  private selected = '';

  constructor(parent: HTMLElement, private readonly onSelect: (id: string) => void) {
    this.root = div('mscreen mscreen-loadout', parent);

    const left = div('lo-left', this.root);
    header(left, '02', 'Loadout');
    // Rows are built on `attach`, once the armoury is known.
    this.list = div('lo-list', left);

    const panel = div('lo-panel', this.root);
    const title = div('lo-title', panel);
    this.name = new TextCell(el('h2', 'lo-name', title));
    const sub = div('lo-sub', title);
    this.cls = new TextCell(el('span', 'lo-class', sub));
    this.caliber = new TextCell(el('span', 'lo-caliber', sub));

    const stats = div('lo-stats', panel);
    for (const label of BAR_LABELS) this.bars.push(new StatBar(stats, label));

    const grid = div('lo-numbers', panel);
    for (const label of NUMBER_LABELS) {
      const cell = div('lo-num', grid);
      el('span', 'lo-num-key', cell).textContent = label;
      this.numbers.push(new TextCell(el('span', 'lo-num-value', cell)));
    }

    this.blurb = new TextCell(el('p', 'lo-blurb', panel));
  }

  attach(weapons: IWeapons | null): void {
    this.weapons = weapons;
    const loadout = weapons?.loadout ?? [];
    if (this.rows.length === loadout.length) return;

    this.list.textContent = '';
    this.rows.length = 0;
    for (const stats of loadout) {
      const node = el('button', 'lo-row interactive', this.list);
      node.type = 'button';
      div('lo-row-icon', node).innerHTML = weaponIcon(stats.id, 'ic-weapon');
      const text = div('lo-row-text', node);
      el('span', 'lo-row-name', text).textContent = stats.name;
      el('span', 'lo-row-class', text).textContent =
        CLASS_NAMES[stats.id] ?? stats.fireMode.toUpperCase();
      el('span', 'lo-row-slot', node).textContent = String(this.rows.length + 1);
      node.addEventListener('click', (e) => {
        e.stopPropagation();
        this.select(stats.id);
      });
      this.rows.push({ node, id: stats.id });
    }
    this.show(weapons?.current?.id ?? loadout[0]?.id ?? '');
  }

  /** Selects and equips. */
  select(id: string): void {
    if (id === this.selected) {
      // Re-selecting the weapon already in hand turns it over instead, which is
      // what the player is trying to do when they click it twice.
      this.weapons?.inspect?.();
      return;
    }
    this.show(id);
    this.onSelect(id);
  }

  /** Selects without equipping, for the initial paint. */
  show(id: string): void {
    const stats = this.weapons?.loadout.find((w) => w.id === id);
    this.selected = id;
    for (const row of this.rows) row.node.classList.toggle('on', row.id === id);
    if (!stats) return;

    this.name.set(stats.name);
    this.cls.set(CLASS_NAMES[stats.id] ?? 'Firearm');
    this.caliber.set(`${formatCaliber(stats)} · ${SCOPE_NAMES[stats.scope ?? 'none'] ?? 'Optic'}`);

    const values = barValues(stats);
    for (let i = 0; i < this.bars.length; i++) {
      this.bars[i].set(values[i].fraction, values[i].text);
    }

    this.numbers[0].set(`${stats.rpm} rpm`);
    this.numbers[1].set(`${stats.magSize} + ${stats.reserveAmmo}`);
    this.numbers[2].set(`${stats.headshotMultiplier.toFixed(1)} ×`);
    this.numbers[3].set(`${Math.round(stats.adsTime * 1000)} ms`);
    this.numbers[4].set(`${stats.reloadTime.toFixed(2)} s`);
    this.numbers[5].set(`${Math.round(stats.muzzleVelocity)} m/s`);

    this.blurb.set(blurb(stats));
  }

  /** The player pressed a number key while the screen was open. */
  selectSlot(index: number): void {
    const row = this.rows[index];
    if (row) this.select(row.id);
  }

  get current(): string {
    return this.selected;
  }
}

/* ------------------------------- normalising ---------------------------- */

const BAR_LABELS = ['Damage', 'Fire rate', 'Accuracy', 'Range', 'Handling', 'Control'];
/* The bar block already carries damage, so the grid spends that slot on the
   headshot bonus instead — the one number that changes how a weapon is aimed
   rather than how it compares. */
const NUMBER_LABELS = ['Cyclic', 'Capacity', 'Headshot', 'Aim time', 'Reload', 'Velocity'];

/**
 * Bars are normalised against the whole armoury rather than each weapon's own
 * ceiling, which is the difference between a chart that compares weapons and one
 * that just draws five full bars. The divisors are the extremes of the catalogue
 * with a little headroom, and the two spread-derived axes are square-rooted
 * because spread is an angle and its perceptual scale is not linear.
 */
function barValues(s: WeaponStats): Array<{ fraction: number; text: string }> {
  const pellets = s.pellets ?? 1;
  const perShot = s.damage * pellets;
  const accuracy = 1 - Math.sqrt(clamp01(s.adsSpread / 0.04));
  const control = 1 - Math.sqrt(clamp01(s.recoilVertical / 0.055));
  const handling = clamp01(1 - (s.adsTime - 0.14) / 0.32);
  return [
    { fraction: clamp01(perShot / 150), text: String(perShot) },
    { fraction: clamp01(s.rpm / 820), text: String(s.rpm) },
    { fraction: accuracy, text: rate(accuracy) },
    { fraction: clamp01(s.falloffEnd / 220), text: `${Math.round(s.falloffEnd)} m` },
    { fraction: handling, text: rate(handling) },
    { fraction: control, text: rate(control) },
  ];
}

function rate(v: number): string {
  if (v > 0.85) return 'Excellent';
  if (v > 0.68) return 'Good';
  if (v > 0.45) return 'Fair';
  if (v > 0.22) return 'Poor';
  return 'Very poor';
}

function formatCaliber(s: WeaponStats): string {
  if (s.caliber === 12) return '12 gauge';
  if (s.caliber === 5.56) return '5.56 × 45 mm';
  if (s.caliber === 8.6) return '.338 Lapua';
  if (s.caliber === 9) return '9 × 19 mm';
  return `${s.caliber} mm`;
}

function blurb(s: WeaponStats): string {
  const mode = FIRE_MODE_NAMES[s.fireMode] ?? s.fireMode;
  const modes = s.fireModes && s.fireModes.length > 1 ? ` Selector: ${s.fireModes.join(' / ')}.` : '';
  const pen =
    s.penetration > 0.2
      ? ' Will punch through a breeze block.'
      : s.penetration > 0.08
        ? ' Penetrates light cover.'
        : ' Stopped by anything structural.';
  return `${mode}, effective to ${Math.round(s.falloffStart)} m and falling off to ${Math.round(
    s.falloffEnd,
  )} m.${pen}${modes}`;
}
