/**
 * The deploy screen.
 *
 * Shares its typography with the boot overlay so the transition from loading to
 * menu reads as one screen rather than two. Requesting pointer lock is the player
 * module's job — this only has to close itself, because that module listens on
 * the canvas and will not grab the pointer while `isMenuOpen` is true.
 */
import { div, el, setText, span } from '../Dom';
import { BINDABLE, bindingLabel, keyLabel, type Binding } from '../Settings';
import type { ActionName } from '../../core/Input';
import { button } from './Widgets';

/** Actions worth putting on the deploy screen; the rest live in Controls. */
const BRIEF: readonly ActionName[] = [
  'sprint',
  'jump',
  'crouch',
  'prone',
  'fire',
  'aim',
  'reload',
  'switchWeapon',
  'grenade',
  'melee',
  'toggleFireMode',
  'killstreak1',
  'scoreboard',
  'pause',
];

/** The four directions, shown as one row rather than four near-identical ones. */
const MOVE: readonly ActionName[] = ['forward', 'left', 'back', 'right'];

export class MainMenu {
  readonly root: HTMLDivElement;

  private readonly keyRows: Array<{ action: ActionName; bind: HTMLElement }> = [];
  private readonly moveBind: HTMLElement;

  constructor(
    parent: HTMLElement,
    private readonly bindings: () => Record<ActionName, Binding>,
    onDeploy: () => void,
    onSettings: () => void,
  ) {
    this.root = div('ob-menu ob-main', parent);
    const body = div('ob-menu-body ob-main-body', this.root);

    const title = el('h1', 'ob-title', body);
    setText(title, 'Operation Blackout');
    const sub = div('ob-sub', body);
    setText(sub, 'Tactical Response Division');

    const deploy = el('button', 'ob-main-deploy', body);
    deploy.type = 'button';
    setText(deploy, 'Click to deploy');
    deploy.addEventListener('click', (event) => {
      event.stopPropagation();
      onDeploy();
    });

    const hint = div('ob-main-hint', body);
    setText(hint, 'Mouse look · Escape to pause');

    const keys = div('ob-keys', body);
    const labels = new Map(BINDABLE.map((entry) => [entry.action, entry.label] as const));
    const moveRow = div('ob-key-row', keys);
    span('ob-key-act', moveRow, 'Move');
    this.moveBind = span('ob-key-bind', moveRow, '');
    for (const action of BRIEF) {
      const row = div('ob-key-row', keys);
      span('ob-key-act', row, labels.get(action) ?? action);
      const bind = span('ob-key-bind', row, '');
      this.keyRows.push({ action, bind });
    }

    const foot = div('ob-main-foot', body);
    button(foot, 'Settings', onSettings, { className: 'ghost' });

    // Clicking anywhere on the backdrop deploys, which is what "click to play"
    // means; the buttons stop propagation so they do not also deploy.
    this.root.addEventListener('click', () => onDeploy());
    this.refresh();
  }

  refresh(): void {
    const binds = this.bindings();
    for (const row of this.keyRows) setText(row.bind, bindingLabel(binds[row.action]));
    // Primary key only: "W / UP A / LEFT S / DOWN D / RIGHT" is not a legend.
    const move = MOVE.map((action) => {
      const key = binds[action]?.keys[0];
      return key ? keyLabel(key) : '—';
    });
    setText(this.moveBind, move.join(' '));
  }
}
