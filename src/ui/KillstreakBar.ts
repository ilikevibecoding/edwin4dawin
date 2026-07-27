import type { HudState } from './HudSystem';
import { clamp } from '../core/MathX';

/**
 * KillstreakBar.ts — streak progress, earned rewards, and the earned banner.
 *
 * Bottom-left: a progress track toward the next reward with tick marks, plus a
 * row of earned-but-unused streaks as icons with a key prompt. When one is
 * earned a dramatic full-screen banner flashes in ("AIRSTRIKE READY — PRESS Z")
 * and slides out again.
 */

const ICONS: [string, string][] = [
  ['uav', '<svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 019 9M12 7a5 5 0 015 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="12" cy="12" r="1.6"/></svg>'],
  ['counter', '<svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 019 9M4 4l16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>'],
  ['air', '<svg viewBox="0 0 24 24"><path d="M2 13l20-7-7 20-3-8-10-5z" fill="currentColor"/></svg>'],
  ['strike', '<svg viewBox="0 0 24 24"><path d="M2 13l20-7-7 20-3-8-10-5z" fill="currentColor"/></svg>'],
  ['bomb', '<svg viewBox="0 0 24 24"><path d="M2 13l20-7-7 20-3-8-10-5z" fill="currentColor"/></svg>'],
  ['heli', '<svg viewBox="0 0 24 24"><path d="M3 8h18M11 8v3M7 11h9l2 4H6zM12 15v4M9 19h6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>'],
  ['chopper', '<svg viewBox="0 0 24 24"><path d="M3 8h18M11 8v3M7 11h9l2 4H6zM12 15v4M9 19h6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>'],
  ['sentry', '<svg viewBox="0 0 24 24"><path d="M4 20h16M12 20v-5M6 11l12-4M6 11l-2 4M8 8l10 3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>'],
];
const ICON_FALLBACK =
  '<svg viewBox="0 0 24 24"><path d="M12 2l3 7h7l-5.5 4.2L18 21l-6-4-6 4 1.5-7.8L2 9h7z" fill="currentColor"/></svg>';

function iconFor(id: string): string {
  const s = id.toLowerCase();
  for (const [k, svg] of ICONS) if (s.includes(k)) return svg;
  return ICON_FALLBACK;
}
function pretty(id: string): string {
  return id.replace(/[_-]+/g, ' ').toUpperCase();
}

export class KillstreakBar {
  readonly el: HTMLDivElement;
  private fill: HTMLDivElement;
  private label: HTMLDivElement;
  private ticks: HTMLDivElement;
  private icons: HTMLDivElement;
  private banner: HTMLDivElement;

  private lastKey = '';
  private lastAvail = '';
  private bannerTimer = 0;

  constructor(root: HTMLElement) {
    this.el = document.createElement('div');
    this.el.className = 'hud-ks';
    this.el.innerHTML = `
      <div class="hud-ks-icons"></div>
      <div class="hud-ks-prog">
        <div class="lbl hud-cond hud-cond-l"></div>
      </div>
      <div class="hud-ks-track"><div class="ticks"></div><i></i></div>`;
    root.appendChild(this.el);
    this.icons = this.el.querySelector('.hud-ks-icons')!;
    this.label = this.el.querySelector('.lbl')!;
    this.ticks = this.el.querySelector('.ticks')!;
    this.fill = this.el.querySelector('.hud-ks-track > i')!;

    this.banner = document.createElement('div');
    this.banner.className = 'hud-ks-banner';
    this.banner.innerHTML = `
      <div class="flash"></div>
      <div class="big hud-cond"><b></b> READY</div>
      <div class="cue hud-cond">PRESS <kbd>Z</kbd> TO DEPLOY</div>`;
    root.appendChild(this.banner);
  }

  setProgress(kills: number, next: { name: string; at: number } | null) {
    const key = `${kills}|${next ? next.name + next.at : ''}`;
    if (key === this.lastKey) return;
    this.lastKey = key;
    if (next && next.at > 0) {
      const prevAt = 0;
      const frac = clamp((kills - prevAt) / (next.at - prevAt), 0, 1);
      this.fill.style.transform = `scaleX(${frac.toFixed(3)})`;
      this.label.innerHTML = `<b>${kills}</b> / ${next.at} · ${pretty(next.name)}`;
      this.el.style.opacity = '1';
      // Tick marks at each integer kill up to the target (cap density).
      const n = Math.min(next.at, 12);
      if (this.ticks.childElementCount !== n - 1) {
        this.ticks.innerHTML = '';
        for (let i = 1; i < n; i++) {
          const u = document.createElement('u');
          u.style.left = `${(i / n) * 100}%`;
          this.ticks.appendChild(u);
        }
      }
    } else {
      this.fill.style.transform = 'scaleX(1)';
      this.label.innerHTML = `<b>MAX</b> STREAK`;
    }
  }

  private refreshAvailable(list: readonly string[]) {
    const key = list.join(',');
    if (key === this.lastAvail) return;
    this.lastAvail = key;
    this.icons.innerHTML = '';
    for (const id of list) {
      const d = document.createElement('div');
      d.className = 'hud-ks-icon ready';
      d.innerHTML = `${iconFor(id)}<span class="nm hud-cond">${pretty(id)}</span><span class="key">Z</span>`;
      this.icons.appendChild(d);
    }
  }

  announce(name: string, hold = false) {
    const b = this.banner.querySelector('.big b')!;
    b.textContent = pretty(name);
    this.banner.classList.remove('show');
    void this.banner.offsetWidth;
    if (hold) {
      this.banner.style.opacity = '1';
      this.banner.style.transform = 'none';
      return;
    }
    this.banner.classList.add('show');
    window.clearTimeout(this.bannerTimer);
    this.bannerTimer = window.setTimeout(() => this.banner.classList.remove('show'), 3600);
  }

  update(s: HudState) {
    const ks = s.killstreaks;
    if (ks) this.refreshAvailable(ks.available);
  }

  dispose() {
    window.clearTimeout(this.bannerTimer);
    this.el.remove();
    this.banner.remove();
  }
}
