import { el, setStyle } from './dom.js';
import { RIFLE, BOMB, SKULL, KNIFE } from './icons.js';

const ICONS = { bullet: RIFLE, explosion: BOMB, melee: KNIFE };

/**
 * Top-right kill feed: newest entry at the bottom, max `max` rows, each fades after `ttl` seconds.
 * Fades are driven from the HUD clock so they are deterministic in shot mode.
 */
export class KillFeed {
  constructor(game, root, { max = 5, ttl = 6, fade = 0.6 } = {}) {
    this.game = game;
    this.root = root;
    this.max = max;
    this.ttl = ttl;
    this.fade = fade;
    this.rows = [];
  }

  /**
   * @param {object} o { killer, killerTeam: 'blue'|'red'|'neutral', victim, victimTeam, cause: 'bullet'|'explosion'|'melee', headshot }
   */
  push({ killer, killerTeam = 'blue', victim, victimTeam = 'red', cause = 'bullet', headshot = false }, now) {
    const icon = ICONS[cause] || RIFLE;
    const row = el(
      `<div class="kf__row${headshot ? ' kf__row--hs' : ''}">
        <span class="kf__name kf__name--${killerTeam}">${escape(killer)}</span>
        <span class="kf__icon kf__icon--${cause}">${icon}</span>
        ${headshot ? `<span class="kf__skull" title="Headshot">${SKULL}</span>` : ''}
        <span class="kf__name kf__name--${victimTeam}">${escape(victim)}</span>
      </div>`,
    );
    this.root.appendChild(row);
    this.rows.push({ el: row, t: now, removed: false });
    while (this.rows.length > this.max) this._remove(this.rows[0]);
  }

  update(now) {
    for (let i = this.rows.length - 1; i >= 0; i--) {
      const r = this.rows[i];
      const age = now - r.t;
      if (age > this.ttl + this.fade) {
        this._remove(r);
      } else if (age > this.ttl) {
        const k = 1 - (age - this.ttl) / this.fade;
        setStyle(r.el, 'opacity', k.toFixed(2));
        setStyle(r.el, 'transform', `translateX(${((1 - k) * 12).toFixed(1)}px)`);
      } else if (age < 0.25) {
        const k = age / 0.25;
        setStyle(r.el, 'opacity', k.toFixed(2));
        setStyle(r.el, 'transform', `translateX(${((1 - k) * 24).toFixed(1)}px)`);
      } else {
        setStyle(r.el, 'opacity', '1');
        setStyle(r.el, 'transform', 'none');
      }
    }
  }

  clear() {
    for (const r of [...this.rows]) this._remove(r);
  }

  _remove(r) {
    if (r.removed) return;
    r.removed = true;
    r.el.remove();
    const i = this.rows.indexOf(r);
    if (i >= 0) this.rows.splice(i, 1);
  }
}

function escape(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
}
