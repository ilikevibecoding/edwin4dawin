/**
 * Killfeed.ts — top-right kill notifications.
 *
 * Entries read `KILLER  ⟨weapon⟩  VICTIM`, team-coloured (amber when the player
 * scored, red victim), with a headshot glyph. Rows slide in, expire after ~5s,
 * and the list is capped so it never grows without bound. Weapon icons are tiny
 * inline SVG silhouettes chosen by weapon class.
 */

const LIFETIME_MS = 5000;
const MAX_ROWS = 5;

/** Side-profile weapon silhouettes, drawn compact in a 48×16 box. */
const GLYPHS: Record<string, string> = {
  rifle:
    'M2 8h30l3-2h4v2h5v2h-6l-2 2h-4v-2H14v3h-3v-3H2z M9 10h2v3H9z',
  smg: 'M3 8h20l2-2h3v2h4v2h-5l-1 2h-3v-2H12v3H9v-3H3z',
  sniper:
    'M1 8h40l4-1v2h2v1h-6l-3 1H20v2h-3v-2H1z M10 6h10v1H10z',
  shotgun: 'M2 7h38v2H2z M2 9h30v2H2z M9 11h3v3H9z',
  pistol: 'M6 6h16v2h3v2h-3v-2h-2v6h-3v-6H6z',
  lmg: 'M2 7h30l3-2h5v2h4v3h-6l-2 2h-4v-2H16v-1h-3v4h-3v-4H2z M22 4h6v2h-6z',
};

const CLASS_OF: [string, string][] = [
  ['ar_', 'rifle'],
  ['lmg_', 'lmg'],
  ['smg_', 'smg'],
  ['sniper_', 'sniper'],
  ['shotgun_', 'shotgun'],
  ['pistol_', 'pistol'],
];

function glyphFor(weapon: string): string {
  const w = weapon.toLowerCase();
  for (const [pre, cls] of CLASS_OF) if (w.startsWith(pre)) return GLYPHS[cls];
  if (w.includes('sniper')) return GLYPHS.sniper;
  if (w.includes('shot')) return GLYPHS.shotgun;
  if (w.includes('pistol')) return GLYPHS.pistol;
  if (w.includes('smg')) return GLYPHS.smg;
  if (w.includes('grenade') || w.includes('explos') || w.includes('bomb') || w.includes('airstrike'))
    return GLYPHS.shotgun;
  return GLYPHS.rifle;
}

const HS_GLYPH =
  '<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="8" cy="8" r="1.6"/><path d="M8 0v3M8 13v3M0 8h3M13 8h3" stroke="currentColor" stroke-width="1.4"/></svg>';

function prettyName(raw: string): string {
  if (raw === 'PLAYER') return 'PLAYER';
  // `enemy_3` → `ENEMY 3`, `militia_7` → `MILITIA 7`.
  return raw.replace(/_/g, ' ').trim().toUpperCase();
}

export class Killfeed {
  readonly el: HTMLDivElement;
  private rows: { node: HTMLElement; timer: number }[] = [];
  private demoHold = false;

  constructor(root: HTMLElement) {
    this.el = document.createElement('div');
    this.el.className = 'hud-feed';
    root.appendChild(this.el);
  }

  setDemoHold(v: boolean) {
    this.demoHold = v;
  }

  add(killer: string, victim: string, weapon: string, headshot: boolean) {
    const mine = killer.toUpperCase().includes('PLAYER');
    const row = document.createElement('div');
    row.className = 'hud-feed-row' + (mine ? ' mine' : '');
    row.innerHTML =
      `<span class="k">${prettyName(killer)}</span>` +
      (headshot ? `<span class="hs">${HS_GLYPH}</span>` : '') +
      `<span class="wpn"><svg viewBox="0 0 48 16"><path d="${glyphFor(weapon)}"/></svg></span>` +
      `<span class="v">${prettyName(victim)}</span>`;
    this.el.appendChild(row);

    const entry = { node: row, timer: 0 };
    if (!this.demoHold) {
      entry.timer = window.setTimeout(() => this.expire(row), LIFETIME_MS);
    }
    this.rows.push(entry);

    while (this.rows.length > MAX_ROWS) {
      const old = this.rows.shift();
      if (old) {
        window.clearTimeout(old.timer);
        old.node.remove();
      }
    }
  }

  private expire(node: HTMLElement) {
    node.classList.add('out');
    window.setTimeout(() => {
      const i = this.rows.findIndex((r) => r.node === node);
      if (i >= 0) this.rows.splice(i, 1);
      node.remove();
    }, 320);
  }

  clear() {
    for (const r of this.rows) {
      window.clearTimeout(r.timer);
      r.node.remove();
    }
    this.rows.length = 0;
  }

  dispose() {
    this.clear();
    this.el.remove();
  }
}
