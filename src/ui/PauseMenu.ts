import type { EngineContext } from '../core/Engine';
import type { QualityPreset, Settings, UserSettings } from '../core/Settings';
import type { HudState } from './HudSystem';

/**
 * PauseMenu.ts — a proper pause/options menu, live in `pausedUpdate`.
 *
 * Resume / Loadout / Settings / Restart, styled to match the HUD (no default
 * buttons, fonts or focus rings). The Settings page drives the real `Settings`
 * object — quality preset, FOV, sensitivity, invert-Y, volumes, film grain,
 * exposure, view-bob, camera shake, crosshair and FPS toggles — applying each
 * change immediately.
 */

const PRESETS: QualityPreset[] = ['low', 'medium', 'high', 'ultra', 'cinematic'];
const LOADOUT: [string, string, string][] = [
  ['ar_wolverine', 'WOLVERINE', 'ASSAULT RIFLE · AUTO'],
  ['smg_viper', 'VIPER', 'SMG · AUTO'],
  ['sniper_longbow', 'LONGBOW', 'SNIPER · BOLT'],
  ['shotgun_breacher', 'BREACHER', 'SHOTGUN · PUMP'],
  ['pistol_sidearm', 'SIDEARM', 'PISTOL · SEMI'],
  ['lmg_bulwark', 'BULWARK', 'LMG · AUTO'],
];

type Page = 'root' | 'loadout' | 'settings';

export class PauseMenu {
  readonly el: HTMLDivElement;
  private rail: HTMLDivElement;
  private pageEl: HTMLDivElement;
  private open = false;
  private page: Page = 'root';
  private refreshers: (() => void)[] = [];

  constructor(
    root: HTMLElement,
    private settings: Settings,
    private ctx: EngineContext
  ) {
    this.el = document.createElement('div');
    this.el.className = 'hud-menu';
    this.el.innerHTML = `
      <div class="rail">
        <div class="brand">
          <h1 class="hud-cond hud-cond-l">PAUSED</h1>
          <p class="hud-cond hud-cond-l">OPERATION BLACKOUT</p>
        </div>
      </div>
      <div class="page"></div>`;
    this.rail = this.el.querySelector('.rail')!;
    this.pageEl = this.el.querySelector('.page')!;
    root.appendChild(this.el);

    this.buildNav();
    this.show('root');
  }

  private buildNav() {
    const items: [string, Page | 'resume' | 'restart', boolean][] = [
      ['Resume', 'resume', false],
      ['Loadout', 'loadout', false],
      ['Settings', 'settings', false],
      ['Restart', 'restart', true],
    ];
    for (const [label, target, danger] of items) {
      const b = document.createElement('button');
      b.className = 'hud-nav hud-cond hud-cond-l' + (danger ? ' danger' : '');
      b.textContent = label;
      b.addEventListener('click', () => this.onNav(target));
      this.rail.appendChild(b);
    }
    const foot = document.createElement('div');
    foot.className = 'foot hud-cond hud-cond-l';
    foot.innerHTML = 'PRESS <kbd>ESC</kbd> TO RESUME';
    this.rail.appendChild(foot);
  }

  private onNav(target: Page | 'resume' | 'restart') {
    if (target === 'resume') {
      this.ctx.engine.setPaused(false);
      this.ctx.input.requestLock?.();
      return;
    }
    if (target === 'restart') {
      this.ctx.events.emit('game:restart');
      this.ctx.engine.setPaused(false);
      this.ctx.input.requestLock?.();
      return;
    }
    this.show(target);
  }

  private show(page: Page) {
    this.page = page;
    for (const b of Array.from(this.rail.querySelectorAll<HTMLButtonElement>('.hud-nav'))) {
      const isActive =
        (page === 'loadout' && b.textContent === 'Loadout') ||
        (page === 'settings' && b.textContent === 'Settings');
      b.classList.toggle('active', isActive);
    }
    this.refreshers = [];
    if (page === 'settings') this.buildSettings();
    else if (page === 'loadout') this.buildLoadout();
    else this.buildRoot();
  }

  private buildRoot() {
    this.pageEl.innerHTML = `
      <h2 class="hud-cond hud-cond-l">MISSION STATUS</h2>
      <div class="foot hud-cond hud-cond-l" style="line-height:1.9">
        AL-RASHID DISTRICT · ACTIVE ENGAGEMENT<br>
        Select <b style="color:var(--accent)">SETTINGS</b> to tune performance and controls,
        or <b style="color:var(--accent)">LOADOUT</b> to switch weapon.
      </div>`;
  }

  private buildLoadout() {
    this.pageEl.innerHTML = `<h2 class="hud-cond hud-cond-l">LOADOUT</h2>`;
    const list = document.createElement('div');
    list.className = 'hud-load';
    const currentId = this.ctx.has('weapons')
      ? (this.ctx.get('weapons') as { current: { id: string } }).current.id
      : '';
    for (const [id, name, cls] of LOADOUT) {
      const w = document.createElement('div');
      w.className = 'w' + (id === currentId ? ' sel' : '');
      w.innerHTML = `
        <svg viewBox="0 0 48 16"><path d="M2 8h30l3-2h4v2h5v2h-6l-2 2h-4v-2H14v3h-3v-3H2z"/></svg>
        <div class="meta"><div class="nm hud-cond hud-cond-l">${name}</div>
        <div class="cl hud-cond hud-cond-l">${cls.replace('·', '·')}</div></div>`;
      w.addEventListener('click', () => {
        if (this.ctx.has('weapons')) {
          (this.ctx.get('weapons') as { switchTo: (id: string) => void }).switchTo(id);
        }
        for (const n of Array.from(list.children)) n.classList.remove('sel');
        w.classList.add('sel');
      });
      list.appendChild(w);
    }
    this.pageEl.appendChild(list);
  }

  private buildSettings() {
    this.pageEl.innerHTML = '';
    this.section('DISPLAY');
    this.segment('Quality Preset', 'render fidelity vs. framerate', () => this.settings.user.quality, (p) =>
      this.settings.setPreset(p)
    );
    this.slider('Field of View', '', 'fov', 60, 120, 1, (v) => `${Math.round(v)}°`);
    this.slider('Exposure', '', 'exposure', 0.5, 1.8, 0.01, (v) => v.toFixed(2));
    this.slider('Brightness', '', 'brightness', 0.6, 1.6, 0.01, (v) => v.toFixed(2));
    this.slider('Film Grain', '', 'filmGrainAmount', 0, 2, 0.05, (v) => `${Math.round(v * 100)}%`);

    this.section('CONTROLS');
    this.slider('Sensitivity', '', 'sensitivity', 0.2, 3, 0.01, (v) => v.toFixed(2), (v) => {
      this.ctx.input.sensitivity = v;
    });
    this.slider('ADS Sensitivity', '', 'adsSensitivity', 0.3, 1.5, 0.01, (v) => v.toFixed(2));
    this.toggle('Invert Look Y', '', 'invertY', (v) => {
      this.ctx.input.invertY = v;
    });
    this.slider('View Bob', '', 'viewBob', 0, 2, 0.05, (v) => `${Math.round(v * 100)}%`);
    this.slider('Camera Shake', '', 'cameraShake', 0, 2, 0.05, (v) => `${Math.round(v * 100)}%`);
    this.toggle('Crosshair', '', 'crosshair');
    this.toggle('FPS Counter', 'show frame stats', 'showFps');

    this.section('AUDIO');
    this.slider('Master Volume', '', 'masterVolume', 0, 1, 0.01, (v) => `${Math.round(v * 100)}%`);
    this.slider('SFX Volume', '', 'sfxVolume', 0, 1, 0.01, (v) => `${Math.round(v * 100)}%`);
    this.slider('Music Volume', '', 'musicVolume', 0, 1, 0.01, (v) => `${Math.round(v * 100)}%`);
  }

  private section(title: string) {
    const h = document.createElement('h2');
    h.className = 'hud-cond hud-cond-l';
    h.textContent = title;
    this.pageEl.appendChild(h);
  }

  private row(name: string, sub: string): { row: HTMLDivElement; mid: HTMLDivElement; val: HTMLDivElement } {
    const row = document.createElement('div');
    row.className = 'hud-set';
    const nm = document.createElement('div');
    nm.className = 'name hud-cond hud-cond-l';
    nm.innerHTML = sub ? `${name}<small>${sub}</small>` : name;
    const mid = document.createElement('div');
    const val = document.createElement('div');
    val.className = 'val';
    row.append(nm, mid, val);
    this.pageEl.appendChild(row);
    return { row, mid, val };
  }

  private slider(
    name: string,
    sub: string,
    key: keyof UserSettings,
    min: number,
    max: number,
    step: number,
    fmt: (v: number) => string,
    apply?: (v: number) => void
  ) {
    const { mid, val } = this.row(name, sub);
    const input = document.createElement('input');
    input.type = 'range';
    input.className = 'hud-range';
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    mid.appendChild(input);
    const refresh = () => {
      const v = Number(this.settings.user[key]);
      input.value = String(v);
      input.style.setProperty('--p', `${((v - min) / (max - min)) * 100}%`);
      val.textContent = fmt(v);
    };
    input.addEventListener('input', () => {
      const v = Number(input.value);
      this.settings.set(key, v as UserSettings[typeof key]);
      input.style.setProperty('--p', `${((v - min) / (max - min)) * 100}%`);
      val.textContent = fmt(v);
      apply?.(v);
    });
    refresh();
    this.refreshers.push(refresh);
  }

  private toggle(name: string, sub: string, key: keyof UserSettings, apply?: (v: boolean) => void) {
    const { mid } = this.row(name, sub);
    const t = document.createElement('div');
    t.className = 'hud-toggle';
    const knob = document.createElement('i');
    t.appendChild(knob);
    mid.appendChild(t);
    const refresh = () => t.classList.toggle('on', !!this.settings.user[key]);
    t.addEventListener('click', () => {
      const v = !this.settings.user[key];
      this.settings.set(key, v as UserSettings[typeof key]);
      t.classList.toggle('on', v);
      apply?.(v);
    });
    refresh();
    this.refreshers.push(refresh);
  }

  private segment(
    name: string,
    sub: string,
    get: () => QualityPreset,
    set: (p: QualityPreset) => void
  ) {
    const { mid } = this.row(name, sub);
    const seg = document.createElement('div');
    seg.className = 'hud-seg';
    const buttons: HTMLButtonElement[] = [];
    for (const p of PRESETS) {
      const b = document.createElement('button');
      b.className = 'hud-cond';
      b.textContent = p;
      b.addEventListener('click', () => {
        set(p);
        for (const bb of buttons) bb.classList.toggle('sel', bb === b);
      });
      seg.appendChild(b);
      buttons.push(b);
    }
    const refresh = () => {
      const cur = get();
      buttons.forEach((b, i) => b.classList.toggle('sel', PRESETS[i] === cur));
    };
    mid.appendChild(seg);
    // Span the segmented control across mid+val.
    (mid.parentElement as HTMLElement).style.gridTemplateColumns = 'minmax(120px,14vw) 1fr';
    refresh();
    this.refreshers.push(refresh);
  }

  setOpen(open: boolean) {
    if (open === this.open) return;
    this.open = open;
    this.el.classList.toggle('open', open);
    if (open) {
      this.show(this.page === 'root' ? 'root' : this.page);
      for (const r of this.refreshers) r();
    }
  }

  get isOpen() {
    return this.open;
  }

  /** Open the menu directly on a given page (used by the ?hudmenu demo). */
  openAt(page: 'root' | 'loadout' | 'settings') {
    this.page = page;
    this.setOpen(true);
    this.show(page);
  }

  pausedUpdate(_s: HudState) {
    // The menu is DOM-interactive on its own; nothing to poll here yet.
  }

  dispose() {
    this.el.remove();
  }
}
