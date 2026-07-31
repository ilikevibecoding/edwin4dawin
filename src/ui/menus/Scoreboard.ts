/**
 * The scoreboard, held open on a key rather than toggled.
 *
 * Rows are pooled: holding the key down while a firefight rewrites the standings
 * must not churn the DOM, so a row is created once and then only its numbers are
 * rewritten, through the cached text setter that skips writes that would not
 * change anything.
 */
import { div, setClass, setText, span } from '../Dom';
import type { RosterEntry } from '../Roster';

interface Row {
  node: HTMLDivElement;
  team: HTMLElement;
  name: HTMLElement;
  kills: HTMLElement;
  deaths: HTMLElement;
  score: HTMLElement;
  streak: HTMLElement;
}

const COLUMNS: readonly string[] = ['', 'Operator', 'Kills', 'Deaths', 'Score', 'Streak'];

/** Rows the card can show at 720p without scrolling. The tail is a count. */
const MAX_ROWS = 14;

export class Scoreboard {
  readonly root: HTMLDivElement;

  private readonly table: HTMLDivElement;
  private readonly subEl: HTMLElement;
  private readonly moreEl: HTMLDivElement;
  private readonly rows: Row[] = [];
  private readonly view: RosterEntry[] = [];
  private open = false;

  constructor(parent: HTMLElement) {
    this.root = div('ob-sb', parent);
    const card = div('ob-card ob-sb-card', this.root);

    const head = div('ob-sb-head', card);
    const title = div('ob-h2', head);
    setText(title, 'Standings');
    this.subEl = span('lbl', head, '');

    this.table = div('ob-sb-table', card);
    const header = div('ob-sb-tr head', this.table);
    for (const column of COLUMNS) span(undefined, header, column.toUpperCase());

    this.moreEl = div('ob-sb-more lbl', card);
  }

  setOpen(open: boolean): void {
    if (this.open === open) return;
    this.open = open;
    setClass(this.root, 'open', open);
  }

  get isOpen(): boolean {
    return this.open;
  }

  /** Only called while the board is visible; there is nothing to read otherwise. */
  update(entries: readonly RosterEntry[], hostiles: number): void {
    if (!this.open) return;

    const shown = Math.min(entries.length, MAX_ROWS);
    this.view.length = 0;
    for (let i = 0; i < shown; i++) this.view.push(entries[i]);
    if (shown < entries.length) {
      // A player who has been beaten down the board still has to find their own
      // row, so it takes the last slot when it would otherwise be cut off.
      const local = entries.find((entry) => entry.isLocal);
      if (local && !this.view.includes(local)) this.view[shown - 1] = local;
    }

    while (this.rows.length < shown) this.rows.push(this.makeRow());
    for (let i = shown; i < this.rows.length; i++) {
      setClass(this.rows[i].node, 'gone', true);
    }

    for (let i = 0; i < shown; i++) {
      const entry = this.view[i];
      const row = this.rows[i];
      setClass(row.node, 'gone', false);
      setClass(row.node, 'me', entry.isLocal);
      setClass(row.node, 'dead', !entry.alive);
      setClass(row.node, 'friendly', entry.team === 'player');
      setText(row.team, entry.team === 'player' ? 'TF' : 'OP');
      setText(row.name, entry.label.toUpperCase());
      setText(row.kills, String(entry.kills));
      setText(row.deaths, String(entry.deaths));
      setText(row.score, String(entry.score));
      setText(row.streak, entry.streak > 0 ? String(entry.streak) : '—');
    }

    setText(this.subEl, `${hostiles} HOSTILES ACTIVE · ${entries.length} OPERATORS`);
    const hidden = entries.length - shown;
    setText(this.moreEl, hidden > 0 ? `+${hidden} not shown` : '');
    setClass(this.moreEl, 'gone', hidden <= 0);
  }

  private makeRow(): Row {
    const node = div('ob-sb-tr', this.table);
    return {
      node,
      team: span('ob-sb-team', node, ''),
      name: span('ob-sb-name', node, ''),
      kills: span('ob-sb-num', node, '0'),
      deaths: span('ob-sb-num', node, '0'),
      score: span('ob-sb-num', node, '0'),
      streak: span('ob-sb-num', node, '0'),
    };
  }
}
