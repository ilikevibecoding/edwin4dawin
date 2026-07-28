import type { IWeapons, WeaponStats } from '../../core/Interfaces';
import { ClassCell, StyleCell, TextCell, div, el, markup } from '../dom';
import { glyph, ring, weaponIcon } from '../Icons';

/**
 * The ammunition block, bottom right.
 *
 * The one HUD element a player looks at directly, so it is built for reading
 * rather than for decoration: the magazine count is the largest type on the
 * screen, the reserve is subordinate to it, and the weapon's name and selector
 * sit above as context you glance at rather than read.
 *
 * State is carried by colour and by one extra element each time, never by
 * moving anything: low ammunition tints the count amber, an empty magazine
 * turns it red and swaps the selector chip for a reload prompt, and a running
 * reload fills the ring around the weapon glyph. Nothing in this block ever
 * changes size, because a counter that reflows when it crosses from 100 to 99
 * is a counter you have to re-find every time it ticks.
 */

const RELOAD_RING = ring(15, 2.6, 'ammo-ring');

export class AmmoPanel {
  readonly root: HTMLElement;
  private readonly name: TextCell;
  private readonly mode: TextCell;
  private readonly mag: TextCell;
  private readonly reserve: TextCell;
  private readonly icon: HTMLElement;
  private readonly ringFill: SVGCircleElement | null;
  private readonly ringOffset: StyleCell | null;
  private readonly low: ClassCell;
  private readonly empty: ClassCell;
  private readonly reloading: ClassCell;
  private readonly equipment: EquipmentRow;
  private iconId = '';

  constructor(parent: HTMLElement) {
    this.root = div('hud-ammo', parent);
    this.equipment = new EquipmentRow(this.root);

    const meta = div('hud-ammo-meta', this.root);
    this.name = new TextCell(el('span', 'ammo-name', meta));
    this.mode = new TextCell(el('span', 'ammo-mode', meta));

    const row = div('hud-ammo-row', this.root);
    const holder = markup('hud-ammo-icon', RELOAD_RING.html, row);
    this.icon = div('ammo-weapon', holder);
    this.ringFill = holder.querySelector('.ring-fill');
    this.ringOffset = this.ringFill
      ? new StyleCell(this.ringFill as unknown as HTMLElement, 'stroke-dashoffset')
      : null;

    this.mag = new TextCell(el('span', 'ammo-mag', row));
    this.reserve = new TextCell(el('span', 'ammo-reserve', row));

    this.low = new ClassCell(this.root, 'low');
    this.empty = new ClassCell(this.root, 'empty');
    this.reloading = new ClassCell(this.root, 'reloading');
  }

  update(weapons: IWeapons | null, stats: WeaponStats | null): void {
    if (!stats) {
      this.name.set('UNARMED');
      this.mode.set('—');
      this.mag.set('--');
      this.reserve.set('');
      return;
    }
    if (this.iconId !== stats.id) {
      this.iconId = stats.id;
      this.icon.innerHTML = weaponIcon(stats.id, 'ic-weapon');
    }

    const mag = weapons ? weapons.mag : 0;
    const reserve = weapons ? weapons.reserve : 0;
    const reloading = !!weapons?.reloading;
    const progress = weapons?.reloadProgress ?? 0;

    this.name.set(stats.name);
    this.mode.set(reloading ? 'RELOADING' : mag === 0 ? 'RELOAD' : modeLabel(weapons, stats));
    this.mag.set(mag.toString());
    this.reserve.set(reserve > 0 ? `/ ${reserve}` : '/ ---');

    const fraction = stats.magSize > 0 ? mag / stats.magSize : 1;
    this.low.set(mag > 0 && fraction <= 0.34);
    this.empty.set(mag === 0);
    this.reloading.set(reloading);
    if (this.ringOffset) {
      const shown = reloading ? progress : mag / Math.max(1, stats.magSize);
      this.ringOffset.set((RELOAD_RING.circumference * (1 - shown)).toFixed(2));
    }

    this.equipment.update(weapons);
  }
}

function modeLabel(weapons: IWeapons | null, stats: WeaponStats): string {
  const mode = weapons?.fireMode ?? stats.fireMode;
  switch (mode) {
    case 'auto':
      return 'AUTO';
    case 'semi':
      return 'SEMI';
    case 'burst':
      return `BURST ${stats.burstCount ?? 3}`;
    case 'bolt':
      return 'BOLT';
    case 'pump':
      return 'PUMP';
    default:
      return String(mode).toUpperCase();
  }
}

/* ------------------------------- equipment -------------------------------- */

interface Slot {
  node: HTMLElement;
  count: TextCell;
  spent: ClassCell;
}

// Only the fragmentation grenade has a key on it — `tactical` is the fire-mode
// selector, not a throw. A chip promising T for two different grenades is worse
// than no chip, so the other two are inventory counts and nothing more.
const EQUIPMENT: Array<{ key: keyof IWeapons['grenades']; icon: string; bind: string }> = [
  { key: 'frag', icon: 'frag', bind: 'G' },
  { key: 'flash', icon: 'flash', bind: '' },
  { key: 'smoke', icon: 'smoke', bind: '' },
];

/** Lethal, tactical and smoke, with their keybinds and remaining counts. */
class EquipmentRow {
  private readonly slots: Slot[] = [];

  constructor(parent: HTMLElement) {
    const row = div('hud-equip', parent);
    for (const spec of EQUIPMENT) {
      const node = markup('eq', glyph(spec.icon, 'ic'), row);
      const count = el('span', 'eq-count', node);
      if (spec.bind) el('span', 'eq-bind', node).textContent = spec.bind;
      this.slots.push({
        node,
        count: new TextCell(count),
        spent: new ClassCell(node, 'spent'),
      });
    }
  }

  update(weapons: IWeapons | null): void {
    const bag = weapons?.grenades;
    for (let i = 0; i < EQUIPMENT.length; i++) {
      const n = bag ? bag[EQUIPMENT[i].key] : 0;
      this.slots[i].count.set(n.toString());
      this.slots[i].spent.set(n <= 0);
    }
  }
}
