import type { Action, InputManager } from '../../core/Input';
import { div, el } from '../dom';
import { header } from './Widgets';

/**
 * The controls reference.
 *
 * Read from `InputManager.bindings` rather than from a hand-written list, so a
 * binding added to the input manager appears here without anybody remembering to
 * update a second table. Several codes map to the same action — `KeyC` and
 * `ControlLeft` both crouch — so the table is inverted and the codes for one
 * action are shown together, which is also how a player thinks about them.
 *
 * The groups and the ordering are editorial: a shooter's control list is read by
 * someone looking for one specific key, and alphabetical order is the worst
 * possible arrangement for that.
 */

const ACTION_NAMES: Record<Action, string> = {
  forward: 'Move forward',
  back: 'Move back',
  left: 'Strafe left',
  right: 'Strafe right',
  sprint: 'Sprint',
  jump: 'Jump / vault',
  crouch: 'Crouch',
  prone: 'Go prone',
  leanLeft: 'Lean left',
  leanRight: 'Lean right',
  fire: 'Fire',
  ads: 'Aim down sights',
  reload: 'Reload',
  melee: 'Melee',
  grenade: 'Frag grenade',
  tactical: 'Tactical grenade',
  use: 'Use / interact',
  weapon1: 'Primary weapon',
  weapon2: 'Secondary weapon',
  weapon3: 'Sidearm',
  nextWeapon: 'Next weapon',
  prevWeapon: 'Previous weapon',
  killstreak1: 'Killstreak 1',
  killstreak2: 'Killstreak 2',
  killstreak3: 'Killstreak 3',
  scoreboard: 'Scoreboard',
  pause: 'Pause / back',
  photoMode: 'Photo mode',
};

const GROUPS: Array<{ title: string; actions: Action[] }> = [
  {
    title: 'Movement',
    actions: ['forward', 'back', 'left', 'right', 'sprint', 'jump', 'crouch', 'prone'],
  },
  {
    title: 'Combat',
    actions: ['fire', 'ads', 'reload', 'melee', 'grenade', 'tactical', 'leanLeft', 'leanRight'],
  },
  {
    title: 'Equipment',
    actions: [
      'weapon1',
      'weapon2',
      'weapon3',
      'nextWeapon',
      'prevWeapon',
      'killstreak1',
      'killstreak2',
      'killstreak3',
    ],
  },
  { title: 'System', actions: ['use', 'scoreboard', 'pause', 'photoMode'] },
];

/** Mouse and wheel are hard-wired in the input manager rather than bound. */
const FIXED: Partial<Record<Action, string[]>> = {
  fire: ['LMB'],
  ads: ['RMB'],
  melee: ['MMB'],
  nextWeapon: ['Wheel ↑'],
  prevWeapon: ['Wheel ↓'],
};

export class ControlsScreen {
  readonly root: HTMLElement;
  private built = false;

  constructor(parent: HTMLElement) {
    this.root = div('mscreen mscreen-controls', parent);
  }

  build(input: InputManager): void {
    if (this.built) return;
    this.built = true;

    header(this.root, '04', 'Controls');

    const byAction = new Map<Action, string[]>();
    for (const [code, action] of Object.entries(input.bindings) as Array<[string, Action]>) {
      const list = byAction.get(action) ?? [];
      list.push(prettyKey(code));
      byAction.set(action, list);
    }

    const columns = div('mcolumns ctl-columns', this.root);
    for (const group of GROUPS) {
      const column = div('mcolumn', columns);
      const block = div('ctl-group', column);
      el('span', 'mgroup-title', block).textContent = group.title;
      const rows = div('ctl-rows', block);
      for (const action of group.actions) {
        const keys = [...(FIXED[action] ?? []), ...(byAction.get(action) ?? [])];
        if (keys.length === 0) continue;
        const row = div('ctl-row', rows);
        el('span', 'ctl-name', row).textContent = ACTION_NAMES[action] ?? action;
        const caps = div('ctl-keys', row);
        for (const key of keys.slice(0, 3)) {
          el('kbd', 'ctl-key', caps).textContent = key;
        }
      }
    }

    el('p', 'mnote ctl-note', this.root).textContent =
      'A gamepad is picked up automatically when one is connected: sticks to move and look, triggers to aim and fire.';
  }
}

/** `KeyW` is not a key cap. Turn a `KeyboardEvent.code` into one. */
function prettyKey(code: string): string {
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Arrow')) return ARROWS[code.slice(5)] ?? code;
  switch (code) {
    case 'ControlLeft':
      return 'Ctrl';
    case 'ControlRight':
      return 'R Ctrl';
    case 'ShiftLeft':
      return 'Shift';
    case 'ShiftRight':
      return 'R Shift';
    case 'AltLeft':
      return 'Alt';
    case 'Space':
      return 'Space';
    case 'Escape':
      return 'Esc';
    case 'Tab':
      return 'Tab';
    default:
      return code;
  }
}

const ARROWS: Record<string, string> = { Up: '↑', Down: '↓', Left: '←', Right: '→' };
