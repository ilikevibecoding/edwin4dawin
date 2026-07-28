/**
 * The killfeed.
 *
 * `KILLER  [weapon]  VICTIM`, newest at the top, six seconds each. Rows are
 * created and removed on events only — the per-frame cost is one timestamp
 * comparison per live row — and the enter/exit animations are CSS so the
 * compositor owns them.
 */
import { div, markup, setClass, span } from '../Dom';
import { headshotIcon, weaponIcon } from '../Icons';
import { TIMING } from '../Theme';

interface Row {
  node: HTMLDivElement;
  expires: number;
  removeAt: number;
}

const MAX_ROWS = 6;
const EXIT_MS = 400;

export class Killfeed {
  readonly root: HTMLDivElement;
  private readonly rows: Row[] = [];

  constructor(parent: HTMLElement) {
    this.root = div('ob-kf region-tr', parent);
  }

  push(
    killer: string,
    victim: string,
    weaponId: string,
    headshot: boolean,
    localInvolved: boolean,
    localName: string,
    now: number,
  ): void {
    const node = div('ob-kf-row');
    const killerIsLocal = localInvolved && killer === localName;
    const victimIsLocal = localInvolved && victim === localName;
    setClass(node, 'local', killerIsLocal);
    setClass(node, 'victim', victimIsLocal && !killerIsLocal);

    const killerEl = span('ob-kf-name', node, killer);
    if (killerIsLocal) killerEl.classList.add('ob-kf-you');
    markup('ob-kf-icon', weaponIcon(weaponId), node);
    if (headshot) markup('ob-kf-hs', headshotIcon(), node);
    const victimEl = span('ob-kf-name ob-kf-victim', node, victim);
    if (victimIsLocal) victimEl.classList.add('ob-kf-you');

    // Newest first: the eye starts at the top of the stack.
    this.root.insertBefore(node, this.root.firstChild);
    this.rows.push({ node, expires: now + TIMING.killfeedLife, removeAt: Number.POSITIVE_INFINITY });

    while (this.rows.length > MAX_ROWS) {
      const oldest = this.rows.shift();
      oldest?.node.remove();
    }
  }

  update(now: number): void {
    for (let i = this.rows.length - 1; i >= 0; i--) {
      const row = this.rows[i];
      if (now >= row.removeAt) {
        row.node.remove();
        this.rows.splice(i, 1);
        continue;
      }
      if (now >= row.expires && !Number.isFinite(row.removeAt)) {
        row.node.classList.add('out');
        row.removeAt = now + EXIT_MS / 1000;
      }
    }
  }

  clear(): void {
    for (const row of this.rows) row.node.remove();
    this.rows.length = 0;
  }
}
