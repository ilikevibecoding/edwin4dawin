/**
 * Interface controller: title, menus, briefing, loadout, loading, HUD, end screens.
 * Owner: Fable 1.
 *
 * The HUD stays out of the way during play — vitals bottom left, weapon bottom right, objective
 * top left, and nothing in the middle except the crosshair and, when it is genuinely useful, a
 * single interaction prompt. Everything instructional lives in the menus and the briefing.
 */
import type {
  DifficultyId, GameMode, HostageBehaviour, ObjectiveStatus, Settings, WeaponId,
} from '../core/Types';
import { PRIMARY_CHOICES, UTILITY_CHOICES, WEAPONS, weaponStats } from '../combat/WeaponDefs';
import { brandMark, crosshairSvg, damageArcSvg, hitMarkerSvg, UiIcons, WeaponIcons } from './Icons';
import { drawPlan, type MinimapMarker } from './Minimap';
import { DIFFICULTIES } from '../mission/Difficulty';
import { CHECKPOINTS } from '../world/MapLayout';

export interface HudObjective {
  id: string;
  label: string;
  status: ObjectiveStatus;
}

export interface HudHostage {
  id: string;
  name: string;
  behaviour: HostageBehaviour;
  location: string;
}

export interface HudState {
  health: number;
  armor: number;
  weaponName: string;
  weaponIcon: string;
  magazine: number;
  reserve: number;
  fireMode: string;
  spreadPx: number;
  hasAmmo: boolean;
  reloading: boolean;
  timerText: string;
  timerUrgent: boolean;
  objectives: HudObjective[];
  hostages: HudHostage[];
  prompt: { key: string; text: string; locked: boolean } | null;
  markers: MinimapMarker[];
  playerX: number;
  playerZ: number;
  playerYaw: number;
  level: 0 | 1;
  roomName: string;
  damageDirections: { angle: number; strength: number }[];
  fps: number;
  drawCalls: number;
  triangles: number;
}

export interface UICallbacks {
  onStart: () => void;
  onDifficultyChosen: (d: DifficultyId) => void;
  onBriefingContinue: () => void;
  onLoadoutConfirmed: (primary: WeaponId, utility: WeaponId) => void;
  onResume: () => void;
  onRestart: () => void;
  onReturnToMenu: () => void;
  onSettingsChanged: (s: Settings) => void;
  onOpenGallery: () => void;
  onQuit: () => void;
}

const DIFFICULTY_ORDER: DifficultyId[] = ['recruit', 'operator', 'veteran', 'blackout'];

export class UIRoot {
  private rootEl: HTMLElement;
  private screens = new Map<string, HTMLElement>();
  private cb: UICallbacks;
  private settings: Settings;

  private hudEl!: HTMLElement;
  private crosshairEl!: HTMLElement;
  private hitMarkerEl!: HTMLElement;
  private healthEl!: HTMLElement;
  private armorEl!: HTMLElement;
  private weaponEl!: HTMLElement;
  private objectivesEl!: HTMLElement;
  private hostagesEl!: HTMLElement;
  private promptEl!: HTMLElement;
  private announceEl!: HTMLElement;
  private subtitleEl!: HTMLElement;
  private damageEl!: HTMLElement;
  private minimapCanvas!: HTMLCanvasElement;
  private minimapLabel!: HTMLElement;
  private feedEl!: HTMLElement;
  private fpsEl!: HTMLElement;
  private galleryBar!: HTMLElement;
  private qaPanel!: HTMLElement;
  private dialogEl!: HTMLElement;

  private selectedDifficulty: DifficultyId = 'operator';
  private selectedPrimary: WeaponId = 'lynx-mk4';
  private selectedUtility: WeaponId = 'flash-device';

  private lastSpread = -1;
  private lastCrosshairColor = '';
  private hitMarkerTimer = 0;
  private announcements: { el: HTMLElement; ttl: number }[] = [];
  private feedItems: { el: HTMLElement; ttl: number }[] = [];
  private subtitleQueue: { el: HTMLElement; ttl: number }[] = [];
  private currentMode: GameMode = 'boot';
  private minimapCtx: CanvasRenderingContext2D | null = null;
  private briefingCtx: CanvasRenderingContext2D | null = null;

  constructor(root: HTMLElement, settings: Settings, cb: UICallbacks) {
    this.rootEl = root;
    this.settings = settings;
    this.cb = cb;
    this.build();
  }

  // -------------------------------------------------------------------------
  // construction
  // -------------------------------------------------------------------------

  private build(): void {
    this.rootEl.innerHTML = '';
    this.rootEl.append(
      this.buildTitle(),
      this.buildDifficulty(),
      this.buildBriefing(),
      this.buildLoadout(),
      this.buildLoading(),
      this.buildSettings(),
      this.buildControls(),
      this.buildPause(),
      this.buildResult('victory'),
      this.buildResult('defeat'),
      this.buildHud(),
      this.buildGalleryBar(),
      this.buildQaPanel(),
      this.buildDialog(),
    );
  }

  private screen(id: string, cls = ''): HTMLElement {
    const el = document.createElement('div');
    el.id = `screen-${id}`;
    el.className = `screen ${cls}`.trim();
    el.dataset.screen = id;
    const backdrop = document.createElement('div');
    backdrop.className = 'menu-backdrop';
    const grid = document.createElement('div');
    grid.className = 'menu-grid-overlay';
    const frame = document.createElement('div');
    frame.className = 'menu-frame';
    const body = document.createElement('div');
    body.className = 'menu-body scroll-thin';
    el.append(backdrop, grid, frame, body);
    this.screens.set(id, el);
    return el;
  }

  private bodyOf(id: string): HTMLElement {
    return this.screens.get(id)!.querySelector('.menu-body') as HTMLElement;
  }

  private menuButton(label: string, hint: string, onClick: () => void, primary = false): HTMLButtonElement {
    const b = document.createElement('button');
    b.className = `menu-item${primary ? ' primary' : ''}`;
    b.type = 'button';
    b.innerHTML = `<span>${label}</span><span class="hint">${hint}</span>`;
    b.addEventListener('click', onClick);
    b.dataset.action = label.toLowerCase().replace(/[^a-z]+/g, '-');
    return b;
  }

  // --- title ---------------------------------------------------------------

  private buildTitle(): HTMLElement {
    const el = this.screen('title');
    const b = this.bodyOf('title');
    b.innerHTML = `
      <div class="title-mark">
        ${brandMark(76)}
        <div class="mark-text">Northstar<br/>Administrative Center</div>
      </div>
      <div class="eyebrow">Tactical Response — Single Operator</div>
      <h1 class="title-word">NORTHSTAR<br/><span class="thin">RESCUE</span></h1>
      <div class="title-tag">Two civilians. One way out.</div>
    `;
    const list = document.createElement('ul');
    list.className = 'menu-list';
    const items: [string, string, () => void, boolean][] = [
      ['Begin Mission', 'ENTER', () => this.cb.onStart(), true],
      ['Settings', '', () => this.setMode('settings'), false],
      ['Controls', '', () => this.setMode('controls'), false],
      ['Asset Gallery', 'DEV', () => this.cb.onOpenGallery(), false],
    ];
    for (const [label, hint, fn, primary] of items) {
      const li = document.createElement('li');
      li.append(this.menuButton(label, hint, fn, primary));
      list.append(li);
    }
    b.append(list);
    const foot = document.createElement('div');
    foot.className = 'title-foot';
    foot.innerHTML = `An original single-player vertical slice. All names, marks, layouts, models,
      textures, interface art and audio in this build are generated for this project.
      <br/>Press <kbd>F</kbd> for fullscreen at any time. <kbd>Esc</kbd> exits fullscreen and pauses.`;
    this.screens.get('title')!.append(foot);
    return el;
  }

  // --- difficulty ----------------------------------------------------------

  private buildDifficulty(): HTMLElement {
    const el = this.screen('difficulty');
    const b = this.bodyOf('difficulty');
    b.innerHTML = `
      <div class="eyebrow">Step 1 of 3</div>
      <h2 class="screen-title">Threat Assessment</h2>
      <div class="rule"></div>
      <p class="subtitle">Select the operating profile. This sets hostile alertness, accuracy and
      numbers, how much punishment you can absorb, and how long you have before the hostiles
      move the hostages out of the building.</p>
    `;
    const row = document.createElement('div');
    row.className = 'card-row';
    for (const id of DIFFICULTY_ORDER) {
      const d = DIFFICULTIES[id];
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'card';
      card.dataset.difficulty = id;
      card.innerHTML = `
        <h3>${d.name}</h3>
        <div class="card-sub">${d.tagline}</div>
        <p>${d.description}</p>
        <dl>
          <dt>Hostiles</dt><dd>${d.enemyCount}</dd>
          <dt>Their accuracy</dt><dd>${Math.round(d.enemyAccuracy * 100)}%</dd>
          <dt>Their reaction</dt><dd>${d.reactionTime.toFixed(2)} s</dd>
          <dt>Damage to you</dt><dd>${Math.round(d.damageToPlayer * 100)}%</dd>
          <dt>Mission clock</dt><dd>${Math.floor(d.timeLimit / 60)}:${String(d.timeLimit % 60).padStart(2, '0')}</dd>
        </dl>
      `;
      card.addEventListener('click', () => {
        this.selectedDifficulty = id;
        row.querySelectorAll('.card').forEach((c) => c.classList.remove('selected'));
        card.classList.add('selected');
      });
      row.append(card);
    }
    b.append(row);
    const back = document.createElement('div');
    back.className = 'back-row';
    const cont = document.createElement('button');
    cont.className = 'menu-item primary';
    cont.type = 'button';
    cont.dataset.action = 'continue';
    cont.innerHTML = '<span>Continue to Briefing</span><span class="hint">ENTER</span>';
    cont.addEventListener('click', () => this.cb.onDifficultyChosen(this.selectedDifficulty));
    const bk = document.createElement('button');
    bk.className = 'ghost';
    bk.type = 'button';
    bk.textContent = 'Back';
    bk.addEventListener('click', () => this.setMode('title'));
    back.append(bk, cont);
    b.append(back);
    // default selection
    row.querySelector('[data-difficulty="operator"]')?.classList.add('selected');
    return el;
  }

  // --- briefing ------------------------------------------------------------

  private buildBriefing(): HTMLElement {
    const el = this.screen('briefing');
    const b = this.bodyOf('briefing');
    b.innerHTML = `
      <div class="eyebrow">Step 2 of 3</div>
      <h2 class="screen-title">Mission Briefing — Operation Northstar</h2>
      <div class="rule"></div>
    `;
    const layout = document.createElement('div');
    layout.className = 'briefing-layout';
    const text = document.createElement('div');
    text.className = 'briefing-text scroll-thin';
    text.innerHTML = `
      <div class="stamp">Restricted</div>
      <div class="brief-block">
        <h4>Situation</h4>
        <p>At 06:12 local, an armed group entered the <strong>Northstar Administrative Center</strong>
        through the goods-in dock during a category-two winter storm. Staff evacuated through the
        south courtyard. <strong>Two employees did not get out.</strong></p>
        <p>Local response is forty minutes out on closed roads. You are already on site.</p>
      </div>
      <div class="brief-block">
        <h4>Objectives</h4>
        <ul>
          <li><strong>Infiltrate</strong> via the south employee entrance.</li>
          <li><strong>Locate and secure</strong> both civilians. Approach and hold
            <kbd>E</kbd> to cut restraints; they will follow you once freed.</li>
          <li><strong>Escort</strong> them to the extraction garage on the north-west corner.
            <kbd>H</kbd> orders the civilian nearest you to hold position or resume following —
            use it to park them in cover before you clear a room.</li>
          <li><strong>Extract</strong>. Stand in the marked bay with both civilians present.</li>
        </ul>
      </div>
      <div class="brief-block">
        <h4>Building</h4>
        <p>Two storeys. A double-height reception on the south face, an open-plan floor at the
        core, an executive level above reached by the enclosed east stair or the lobby feature
        stair, and a single-storey service wing to the north containing the plant, loading dock,
        data hall and the extraction garage.</p>
        <p>The service corridor runs the full width of the building. It is the fastest route
        west, and the longest sightline on site. Treat it accordingly.</p>
      </div>
      <div class="brief-block">
        <h4>Rules of engagement</h4>
        <p>Hostiles react to gunfire, running footsteps, doors and breaking glass. Moving slowly
        (<kbd>Shift</kbd>) or crouched (<kbd>Ctrl</kbd>) cuts the noise you make.
        <strong>Do not let a civilian take fire</strong> — losing either one ends the operation.</p>
      </div>
    `;
    const map = document.createElement('div');
    map.className = 'briefing-map';
    const canvas = document.createElement('canvas');
    canvas.width = 720;
    canvas.height = 620;
    canvas.id = 'briefing-plan';
    map.append(canvas);
    this.briefingCtx = canvas.getContext('2d');
    layout.append(text, map);
    b.append(layout);

    const back = document.createElement('div');
    back.className = 'back-row';
    const bk = document.createElement('button');
    bk.className = 'ghost';
    bk.type = 'button';
    bk.textContent = 'Back';
    bk.addEventListener('click', () => this.setMode('difficulty'));
    const cont = document.createElement('button');
    cont.className = 'menu-item primary';
    cont.type = 'button';
    cont.dataset.action = 'continue';
    cont.innerHTML = '<span>Select Loadout</span><span class="hint">ENTER</span>';
    cont.addEventListener('click', () => this.cb.onBriefingContinue());
    back.append(bk, cont);
    b.append(back);
    return el;
  }

  private drawBriefingPlan(): void {
    const ctx = this.briefingCtx;
    if (!ctx) return;
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;
    drawPlan(ctx, w, h, [
      { x: 0, z: 21.5, level: 0, kind: 'player', yaw: 0, label: 'INSERT' },
      { x: 12.2, z: 7.6, level: 0, kind: 'hostage', label: 'CIV 2' },
      { x: -15.5, z: -18.1, level: 0, kind: 'extraction', label: 'EXTRACT' },
    ], {
      scale: 12.6,
      centerX: 0,
      centerZ: -3,
      level: 0,
      rotate: 0,
      labels: true,
      showAll: true,
      grid: true,
    });
    ctx.font = '600 13px "Barlow Condensed", sans-serif';
    ctx.fillStyle = 'rgba(206, 224, 236, 0.85)';
    ctx.textAlign = 'left';
    ctx.fillText('GROUND FLOOR — LEVEL 0 SHOWN, LEVEL 1 GHOSTED', 14, 22);
    ctx.fillStyle = 'rgba(140, 168, 188, 0.75)';
    ctx.font = '400 11px "Roboto Mono", monospace';
    ctx.fillText('N', w / 2, 40);
    ctx.beginPath();
    ctx.moveTo(w / 2, 46);
    ctx.lineTo(w / 2, 62);
    ctx.moveTo(w / 2, 46);
    ctx.lineTo(w / 2 - 4, 53);
    ctx.moveTo(w / 2, 46);
    ctx.lineTo(w / 2 + 4, 53);
    ctx.strokeStyle = 'rgba(140, 168, 188, 0.75)';
    ctx.stroke();
  }

  // --- loadout -------------------------------------------------------------

  private buildLoadout(): HTMLElement {
    const el = this.screen('loadout');
    const b = this.bodyOf('loadout');
    b.innerHTML = `
      <div class="eyebrow">Step 3 of 3</div>
      <h2 class="screen-title">Loadout</h2>
      <div class="rule"></div>
    `;
    const layout = document.createElement('div');
    layout.className = 'loadout-layout';
    const col = document.createElement('div');
    col.className = 'slot-col scroll-thin';
    const detail = document.createElement('div');
    detail.className = 'weapon-detail';

    const renderDetail = (id: WeaponId) => {
      const d = WEAPONS[id];
      const stats = weaponStats(d);
      detail.innerHTML = `
        <div class="eyebrow">${d.maker}</div>
        <h2 class="screen-title" style="font-size:2em">${d.name}</h2>
        <p class="subtitle" style="margin-bottom:1.4em">${d.blurb}</p>
        ${stats.map((s) => `
          <div class="stat-row">
            <span class="label">${s.label}</span>
            <span class="stat-bar"><span style="width:${Math.round(s.value * 100)}%"></span></span>
            <span class="val">${s.text}</span>
          </div>`).join('')}
      `;
    };

    const makeOption = (id: WeaponId, group: 'primary' | 'utility') => {
      const d = WEAPONS[id];
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'weapon-option';
      btn.dataset.weapon = id;
      btn.innerHTML = `
        <span class="icon" style="color:#${d.tint.toString(16).padStart(6, '0')}">${WeaponIcons[d.iconPath]}</span>
        <span>
          <span class="wname">${d.name}</span><br/>
          <span class="wmeta">${d.family.toUpperCase()} · ${d.magazine ? `${d.magazine} rnd` : 'utility'} · ${d.rpm} rpm</span>
        </span>`;
      btn.addEventListener('click', () => {
        if (group === 'primary') this.selectedPrimary = id;
        else this.selectedUtility = id;
        col.querySelectorAll(`[data-group="${group}"] .weapon-option`).forEach((o) => o.classList.remove('selected'));
        btn.classList.add('selected');
        renderDetail(id);
      });
      btn.addEventListener('mouseenter', () => renderDetail(id));
      return btn;
    };

    const primaryTitle = document.createElement('div');
    primaryTitle.className = 'slot-title';
    primaryTitle.textContent = 'Primary weapon';
    const primaryWrap = document.createElement('div');
    primaryWrap.dataset.group = 'primary';
    for (const id of PRIMARY_CHOICES) primaryWrap.append(makeOption(id, 'primary'));

    const utilTitle = document.createElement('div');
    utilTitle.className = 'slot-title';
    utilTitle.textContent = 'Utility';
    const utilWrap = document.createElement('div');
    utilWrap.dataset.group = 'utility';
    for (const id of UTILITY_CHOICES) utilWrap.append(makeOption(id, 'utility'));

    const fixedTitle = document.createElement('div');
    fixedTitle.className = 'slot-title';
    fixedTitle.textContent = 'Always carried';
    const fixedWrap = document.createElement('div');
    fixedWrap.innerHTML = (['vk7-sidearm', 'talon-knife'] as WeaponId[]).map((id) => {
      const d = WEAPONS[id];
      return `<div class="weapon-option" style="opacity:.62;cursor:default">
        <span class="icon" style="color:#${d.tint.toString(16).padStart(6, '0')}">${WeaponIcons[d.iconPath]}</span>
        <span><span class="wname">${d.name}</span><br/>
        <span class="wmeta">${d.family.toUpperCase()} · standard issue</span></span></div>`;
    }).join('');

    col.append(primaryTitle, primaryWrap, utilTitle, utilWrap, fixedTitle, fixedWrap);
    layout.append(col, detail);
    b.append(layout);

    const back = document.createElement('div');
    back.className = 'back-row';
    const bk = document.createElement('button');
    bk.className = 'ghost';
    bk.type = 'button';
    bk.textContent = 'Back';
    bk.addEventListener('click', () => this.setMode('briefing'));
    const go = document.createElement('button');
    go.className = 'menu-item primary';
    go.type = 'button';
    go.dataset.action = 'deploy';
    go.innerHTML = '<span>Deploy</span><span class="hint">ENTER</span>';
    go.addEventListener('click', () => this.cb.onLoadoutConfirmed(this.selectedPrimary, this.selectedUtility));
    back.append(bk, go);
    b.append(back);

    // default selections
    primaryWrap.querySelector('[data-weapon="lynx-mk4"]')?.classList.add('selected');
    utilWrap.querySelector('[data-weapon="flash-device"]')?.classList.add('selected');
    renderDetail('lynx-mk4');
    return el;
  }

  // --- loading -------------------------------------------------------------

  private buildLoading(): HTMLElement {
    const el = this.screen('loading');
    const b = this.bodyOf('loading');
    b.innerHTML = `
      <div class="eyebrow">Deploying</div>
      <h1 class="title-word" style="font-size:clamp(34px,5vw,72px)">NORTHSTAR<span class="thin"> ADMINISTRATIVE CENTER</span></h1>
      <div class="load-bar-wrap">
        <div class="load-bar"><span id="load-progress" style="width:0%"></span></div>
        <div class="load-status" id="load-status">Initialising</div>
        <div class="load-tip" id="load-tip"></div>
      </div>
    `;
    return el;
  }

  setLoadingProgress(pct: number, status: string): void {
    const bar = document.getElementById('load-progress');
    const st = document.getElementById('load-status');
    if (bar) bar.style.width = `${Math.round(Math.max(0, Math.min(100, pct)))}%`;
    if (st) st.textContent = status;
  }

  setLoadingTip(tip: string): void {
    const el = document.getElementById('load-tip');
    if (el) el.innerHTML = tip;
  }

  // --- settings ------------------------------------------------------------

  private buildSettings(): HTMLElement {
    const el = this.screen('settings');
    const b = this.bodyOf('settings');
    b.innerHTML = `
      <div class="eyebrow">Configuration</div>
      <h2 class="screen-title">Settings</h2>
      <div class="rule"></div>
    `;
    const scroll = document.createElement('div');
    scroll.className = 'settings-scroll scroll-thin';

    const group = (title: string) => {
      const g = document.createElement('div');
      g.className = 'settings-group';
      g.innerHTML = `<h4>${title}</h4>`;
      scroll.append(g);
      return g;
    };

    const slider = (
      parent: HTMLElement, label: string, key: keyof Settings,
      min: number, max: number, step: number, fmt: (v: number) => string,
    ) => {
      const row = document.createElement('div');
      row.className = 'setting';
      const id = `set-${String(key)}`;
      row.innerHTML = `<label for="${id}">${label}</label>
        <input type="range" id="${id}" data-setting="${String(key)}" min="${min}" max="${max}" step="${step}" value="${this.settings[key]}"/>
        <span class="value" id="${id}-val">${fmt(this.settings[key] as number)}</span>`;
      parent.append(row);
      const input = row.querySelector('input') as HTMLInputElement;
      const val = row.querySelector('.value') as HTMLElement;
      input.addEventListener('input', () => {
        (this.settings[key] as number) = parseFloat(input.value);
        val.textContent = fmt(parseFloat(input.value));
        this.cb.onSettingsChanged(this.settings);
      });
    };

    const toggle = (parent: HTMLElement, label: string, key: keyof Settings) => {
      const row = document.createElement('div');
      row.className = 'setting';
      const id = `set-${String(key)}`;
      row.innerHTML = `<label for="${id}">${label}</label>
        <input type="checkbox" class="toggle" id="${id}" data-setting="${String(key)}" ${this.settings[key] ? 'checked' : ''}/>
        <span class="value" id="${id}-val">${this.settings[key] ? 'ON' : 'OFF'}</span>`;
      parent.append(row);
      const input = row.querySelector('input') as HTMLInputElement;
      const val = row.querySelector('.value') as HTMLElement;
      input.addEventListener('change', () => {
        (this.settings[key] as boolean) = input.checked;
        val.textContent = input.checked ? 'ON' : 'OFF';
        this.cb.onSettingsChanged(this.settings);
      });
    };

    const select = (
      parent: HTMLElement, label: string, key: keyof Settings, options: [string, string][],
    ) => {
      const row = document.createElement('div');
      row.className = 'setting';
      const id = `set-${String(key)}`;
      row.innerHTML = `<label for="${id}">${label}</label>
        <select id="${id}" data-setting="${String(key)}">${options.map(
        ([v, t]) => `<option value="${v}"${this.settings[key] === v ? ' selected' : ''}>${t}</option>`,
      ).join('')}</select><span class="value"></span>`;
      parent.append(row);
      const input = row.querySelector('select') as HTMLSelectElement;
      input.addEventListener('change', () => {
        (this.settings[key] as string) = input.value;
        this.cb.onSettingsChanged(this.settings);
      });
    };

    const audio = group('Audio');
    slider(audio, 'Master volume', 'masterVolume', 0, 1, 0.01, (v) => `${Math.round(v * 100)}%`);
    slider(audio, 'Effects volume', 'effectsVolume', 0, 1, 0.01, (v) => `${Math.round(v * 100)}%`);
    slider(audio, 'Music volume', 'musicVolume', 0, 1, 0.01, (v) => `${Math.round(v * 100)}%`);
    toggle(audio, 'Subtitles and text cues', 'subtitles');

    const controls = group('Controls');
    slider(controls, 'Mouse sensitivity', 'mouseSensitivity', 0.15, 4, 0.05, (v) => v.toFixed(2));
    toggle(controls, 'Invert vertical look', 'invertY');
    slider(controls, 'Field of view', 'fieldOfView', 65, 110, 1, (v) => `${Math.round(v)}\u00b0`);

    const gfx = group('Graphics');
    select(gfx, 'Quality preset', 'quality', [
      ['low', 'Low — software / integrated'],
      ['medium', 'Medium'],
      ['high', 'High'],
      ['ultra', 'Ultra'],
    ]);
    slider(gfx, 'Resolution scale', 'resolutionScale', 0.5, 1, 0.05, (v) => `${Math.round(v * 100)}%`);
    toggle(gfx, 'Motion blur', 'motionBlur');

    const access = group('Comfort and accessibility');
    toggle(access, 'Reduced camera motion', 'reducedCameraMotion');
    toggle(access, 'Reduced blood', 'reducedBlood');
    toggle(access, 'Show crosshair', 'crosshairVisible');
    toggle(access, 'Show minimap', 'minimap');
    toggle(access, 'Show performance readout', 'showFps');

    b.append(scroll);
    const back = document.createElement('div');
    back.className = 'back-row';
    const bk = document.createElement('button');
    bk.className = 'ghost';
    bk.type = 'button';
    bk.dataset.action = 'settings-back';
    bk.textContent = 'Back';
    bk.addEventListener('click', () => this.closeSubScreen());
    back.append(bk);
    b.append(back);
    return el;
  }

  /** Refresh setting widgets from the model (used after quality auto-detection). */
  syncSettings(s: Settings): void {
    this.settings = s;
    for (const el of Array.from(this.rootEl.querySelectorAll('[data-setting]'))) {
      const key = (el as HTMLElement).dataset.setting as keyof Settings;
      const v = s[key];
      if (el instanceof HTMLInputElement) {
        if (el.type === 'checkbox') el.checked = Boolean(v);
        else el.value = String(v);
      } else if (el instanceof HTMLSelectElement) {
        el.value = String(v);
      }
      const valEl = document.getElementById(`${el.id}-val`);
      if (valEl) {
        if (typeof v === 'boolean') valEl.textContent = v ? 'ON' : 'OFF';
      }
    }
  }

  // --- controls ------------------------------------------------------------

  private buildControls(): HTMLElement {
    const el = this.screen('controls');
    const b = this.bodyOf('controls');
    b.innerHTML = `
      <div class="eyebrow">Reference</div>
      <h2 class="screen-title">Controls</h2>
      <div class="rule"></div>
      <div class="settings-scroll scroll-thin">
      <table class="controls-table">
        <tr><th colspan="2">Movement</th></tr>
        <tr><td class="key"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></td><td>Move</td></tr>
        <tr><td class="key"><kbd>Shift</kbd></td><td>Slow walk — roughly a third of the noise</td></tr>
        <tr><td class="key"><kbd>Ctrl</kbd> / <kbd>C</kbd></td><td>Crouch — smaller profile, tighter hip fire, near silent</td></tr>
        <tr><td class="key"><kbd>Space</kbd></td><td>Jump</td></tr>
        <tr><th colspan="2">Combat</th></tr>
        <tr><td class="key"><kbd>Mouse</kbd></td><td>Look</td></tr>
        <tr><td class="key"><kbd>LMB</kbd></td><td>Fire</td></tr>
        <tr><td class="key"><kbd>RMB</kbd></td><td>Aim down sights (hold)</td></tr>
        <tr><td class="key"><kbd>R</kbd></td><td>Reload</td></tr>
        <tr><td class="key"><kbd>1</kbd>–<kbd>4</kbd></td><td>Primary / sidearm / knife / utility</td></tr>
        <tr><td class="key"><kbd>Q</kbd></td><td>Previous weapon</td></tr>
        <tr><td class="key"><kbd>Wheel</kbd></td><td>Cycle weapons</td></tr>
        <tr><td class="key"><kbd>V</kbd></td><td>Quick melee</td></tr>
        <tr><td class="key"><kbd>G</kbd></td><td>Throw utility</td></tr>
        <tr><th colspan="2">Mission</th></tr>
        <tr><td class="key"><kbd>E</kbd></td><td>Interact — doors, hostages, shutter controls</td></tr>
        <tr><td class="key"><kbd>H</kbd></td><td>Order nearest civilian to hold or follow</td></tr>
        <tr><td class="key"><kbd>Tab</kbd></td><td>Objective summary (hold)</td></tr>
        <tr><td class="key"><kbd>M</kbd></td><td>Toggle minimap</td></tr>
        <tr><th colspan="2">System</th></tr>
        <tr><td class="key"><kbd>F</kbd></td><td>Toggle fullscreen</td></tr>
        <tr><td class="key"><kbd>Esc</kbd></td><td>Exit fullscreen / pause</td></tr>
        <tr><td class="key"><kbd>F8</kbd></td><td>QA panel (development builds)</td></tr>
      </table></div>
    `;
    const back = document.createElement('div');
    back.className = 'back-row';
    const bk = document.createElement('button');
    bk.className = 'ghost';
    bk.type = 'button';
    bk.dataset.action = 'controls-back';
    bk.textContent = 'Back';
    bk.addEventListener('click', () => this.closeSubScreen());
    back.append(bk);
    b.append(back);
    return el;
  }

  // --- pause ---------------------------------------------------------------

  private buildPause(): HTMLElement {
    const el = this.screen('pause');
    const b = this.bodyOf('pause');
    b.innerHTML = `
      <div class="eyebrow">Operation suspended</div>
      <h2 class="screen-title">Paused</h2>
      <div class="rule"></div>
      <p class="subtitle" id="pause-context"></p>
    `;
    const list = document.createElement('ul');
    list.className = 'menu-list';
    const items: [string, string, () => void, boolean][] = [
      ['Resume', 'ESC', () => this.cb.onResume(), true],
      ['Settings', '', () => this.setMode('settings'), false],
      ['Controls', '', () => this.setMode('controls'), false],
      ['Restart Mission', '', () => this.showDialog(
        'Restart mission?',
        'All progress in this attempt is lost. Hostiles, civilians, doors, ammunition and the mission clock reset to their starting state.',
        'Restart', () => this.cb.onRestart(),
      ), false],
      ['Abort to Main Menu', '', () => this.showDialog(
        'Abort operation?',
        'The mission ends immediately and you return to the main menu.',
        'Abort', () => this.cb.onReturnToMenu(),
      ), false],
    ];
    for (const [label, hint, fn, primary] of items) {
      const li = document.createElement('li');
      li.append(this.menuButton(label, hint, fn, primary));
      list.append(li);
    }
    b.append(list);
    return el;
  }

  setPauseContext(text: string): void {
    const el = document.getElementById('pause-context');
    if (el) el.textContent = text;
  }

  // --- results -------------------------------------------------------------

  private buildResult(kind: 'victory' | 'defeat'): HTMLElement {
    const el = this.screen(kind);
    const b = this.bodyOf(kind);
    b.innerHTML = `
      <div class="eyebrow">${kind === 'victory' ? 'Operation complete' : 'Operation failed'}</div>
      <h1 class="result-title">${kind === 'victory' ? 'CIVILIANS SECURE' : 'MISSION LOST'}</h1>
      <div class="rule"></div>
      <p class="subtitle" id="${kind}-summary"></p>
      <div class="result-stats" id="${kind}-stats"></div>
    `;
    const list = document.createElement('ul');
    list.className = 'menu-list';
    list.append(
      (() => { const li = document.createElement('li'); li.append(this.menuButton('Run It Again', 'R', () => this.cb.onRestart(), true)); return li; })(),
      (() => { const li = document.createElement('li'); li.append(this.menuButton('Main Menu', '', () => this.cb.onReturnToMenu(), false)); return li; })(),
    );
    b.append(list);
    return el;
  }

  showResult(
    kind: 'victory' | 'defeat',
    summary: string,
    stats: { k: string; v: string }[],
  ): void {
    const s = document.getElementById(`${kind}-summary`);
    if (s) s.textContent = summary;
    const box = document.getElementById(`${kind}-stats`);
    if (box) {
      box.innerHTML = stats.map((st) =>
        `<div class="result-stat"><div class="k">${st.k}</div><div class="v">${st.v}</div></div>`).join('');
    }
  }

  // --- dialog --------------------------------------------------------------

  private buildDialog(): HTMLElement {
    const el = document.createElement('div');
    el.className = 'dialog-veil';
    el.id = 'confirm-dialog';
    el.innerHTML = `
      <div class="dialog">
        <h3 id="dialog-title"></h3>
        <p id="dialog-body"></p>
        <div class="row">
          <button class="ghost" type="button" data-action="dialog-cancel">Cancel</button>
          <button class="ghost" type="button" data-action="dialog-confirm" style="border-color:var(--danger);color:var(--danger)"></button>
        </div>
      </div>`;
    this.dialogEl = el;
    el.querySelector('[data-action="dialog-cancel"]')!.addEventListener('click', () => this.hideDialog());
    return el;
  }

  showDialog(title: string, body: string, confirmLabel: string, onConfirm: () => void): void {
    (document.getElementById('dialog-title') as HTMLElement).textContent = title;
    (document.getElementById('dialog-body') as HTMLElement).textContent = body;
    const btn = this.dialogEl.querySelector('[data-action="dialog-confirm"]') as HTMLButtonElement;
    btn.textContent = confirmLabel;
    const fresh = btn.cloneNode(true) as HTMLButtonElement;
    btn.replaceWith(fresh);
    fresh.addEventListener('click', () => {
      this.hideDialog();
      onConfirm();
    });
    this.dialogEl.classList.add('active');
  }

  hideDialog(): void {
    this.dialogEl.classList.remove('active');
  }

  get dialogOpen(): boolean {
    return this.dialogEl.classList.contains('active');
  }

  // --- HUD -----------------------------------------------------------------

  private buildHud(): HTMLElement {
    const hud = document.createElement('div');
    hud.id = 'hud';
    hud.innerHTML = `
      <div id="hud-damage"></div>
      <div id="crosshair"></div>
      <div id="hit-marker"></div>
      <div class="hud-vitals">
        <div class="vital" id="hud-health">
          <span class="glyph">${UiIcons.health}</span>
          <span><span class="num">100</span><span class="unit"> HP</span>
          <span class="vital-bar"><span style="width:100%"></span></span></span>
        </div>
        <div class="vital" id="hud-armor">
          <span class="glyph">${UiIcons.armor}</span>
          <span><span class="num">100</span><span class="unit"> AP</span>
          <span class="vital-bar"><span style="width:100%"></span></span></span>
        </div>
      </div>
      <div class="hud-weapon" id="hud-weapon">
        <div class="wpn-icon"></div>
        <div class="wpn-name">—</div>
        <div class="ammo"><span class="mag">0</span><span class="reserve">/0</span></div>
        <div class="fire-mode">—</div>
      </div>
      <div id="hud-objectives">
        <div class="obj-timer">--:--</div>
        <div class="obj-label">Objectives</div>
        <ul class="obj-list"></ul>
      </div>
      <div id="hud-hostages"></div>
      <div id="hud-prompt"><kbd>E</kbd><span class="ptext"></span></div>
      <div id="hud-announce"></div>
      <div id="hud-subtitles"></div>
      <div id="hud-minimap"><canvas width="320" height="320"></canvas><div class="mm-label">—</div></div>
      <div id="hud-feed"></div>
      <div id="hud-fps"></div>
    `;
    this.hudEl = hud;
    this.crosshairEl = hud.querySelector('#crosshair') as HTMLElement;
    this.hitMarkerEl = hud.querySelector('#hit-marker') as HTMLElement;
    this.healthEl = hud.querySelector('#hud-health') as HTMLElement;
    this.armorEl = hud.querySelector('#hud-armor') as HTMLElement;
    this.weaponEl = hud.querySelector('#hud-weapon') as HTMLElement;
    this.objectivesEl = hud.querySelector('#hud-objectives .obj-list') as HTMLElement;
    this.hostagesEl = hud.querySelector('#hud-hostages') as HTMLElement;
    this.promptEl = hud.querySelector('#hud-prompt') as HTMLElement;
    this.announceEl = hud.querySelector('#hud-announce') as HTMLElement;
    this.subtitleEl = hud.querySelector('#hud-subtitles') as HTMLElement;
    this.damageEl = hud.querySelector('#hud-damage') as HTMLElement;
    this.minimapCanvas = hud.querySelector('#hud-minimap canvas') as HTMLCanvasElement;
    this.minimapLabel = hud.querySelector('#hud-minimap .mm-label') as HTMLElement;
    this.feedEl = hud.querySelector('#hud-feed') as HTMLElement;
    this.fpsEl = hud.querySelector('#hud-fps') as HTMLElement;
    this.minimapCtx = this.minimapCanvas.getContext('2d');
    this.crosshairEl.innerHTML = crosshairSvg(4);
    this.hitMarkerEl.innerHTML = hitMarkerSvg(false);
    return hud;
  }

  private buildGalleryBar(): HTMLElement {
    const el = document.createElement('div');
    el.id = 'gallery-bar';
    el.innerHTML = `
      <span class="gname" id="gal-name">—</span>
      <span class="gid" id="gal-id">—</span>
      <span class="gmeta" id="gal-meta">—</span>
      <span class="spacer"></span>
      <button class="ghost" type="button" data-action="gal-prev">&larr; Prev</button>
      <button class="ghost" type="button" data-action="gal-next">Next &rarr;</button>
      <button class="ghost" type="button" data-action="gal-light">Lighting</button>
      <button class="ghost" type="button" data-action="gal-exit">Exit Gallery</button>
    `;
    this.galleryBar = el;
    return el;
  }

  private buildQaPanel(): HTMLElement {
    const el = document.createElement('div');
    el.id = 'qa-panel';
    this.qaPanel = el;
    return el;
  }

  get galleryBarEl(): HTMLElement {
    return this.galleryBar;
  }

  get qaPanelEl(): HTMLElement {
    return this.qaPanel;
  }

  setGalleryInfo(name: string, id: string, meta: string): void {
    (document.getElementById('gal-name') as HTMLElement).textContent = name;
    (document.getElementById('gal-id') as HTMLElement).textContent = id;
    (document.getElementById('gal-meta') as HTMLElement).textContent = meta;
  }

  // -------------------------------------------------------------------------
  // mode switching
  // -------------------------------------------------------------------------

  private previousMenu: GameMode = 'title';

  setMode(mode: GameMode): void {
    if (mode === 'settings' || mode === 'controls') {
      if (this.currentMode !== 'settings' && this.currentMode !== 'controls') {
        this.previousMenu = this.currentMode;
      }
    }
    this.currentMode = mode;
    for (const [id, el] of this.screens) {
      el.classList.toggle('active', id === mode);
    }
    this.hudEl.classList.toggle('active', mode === 'playing');
    this.galleryBar.classList.toggle('active', mode === 'gallery');
    if (mode === 'briefing') this.drawBriefingPlan();
    if (mode !== 'playing') this.hideDialog();
    // Focus the primary action so keyboard users are never stranded.
    const active = this.screens.get(mode);
    const first = active?.querySelector<HTMLElement>('.menu-item.primary, .menu-item, .ghost');
    if (first && mode !== 'playing' && mode !== 'gallery' && mode !== 'loading') {
      setTimeout(() => first.focus(), 0);
    }
  }

  get mode(): GameMode {
    return this.currentMode;
  }

  closeSubScreen(): void {
    this.setMode(this.previousMenu === 'playing' ? 'paused' : this.previousMenu);
  }

  // -------------------------------------------------------------------------
  // per-frame HUD update
  // -------------------------------------------------------------------------

  updateHud(s: HudState, dt: number): void {
    // vitals
    const hNum = this.healthEl.querySelector('.num') as HTMLElement;
    const hBar = this.healthEl.querySelector('.vital-bar span') as HTMLElement;
    hNum.textContent = String(Math.max(0, Math.round(s.health)));
    hBar.style.width = `${Math.max(0, Math.min(100, s.health))}%`;
    this.healthEl.classList.toggle('low', s.health <= 34);
    const aNum = this.armorEl.querySelector('.num') as HTMLElement;
    const aBar = this.armorEl.querySelector('.vital-bar span') as HTMLElement;
    aNum.textContent = String(Math.max(0, Math.round(s.armor)));
    aBar.style.width = `${Math.max(0, Math.min(100, s.armor))}%`;
    this.armorEl.style.opacity = s.armor <= 0 ? '0.35' : '1';

    // weapon
    const icon = this.weaponEl.querySelector('.wpn-icon') as HTMLElement;
    if (icon.dataset.icon !== s.weaponIcon) {
      icon.dataset.icon = s.weaponIcon;
      icon.innerHTML = WeaponIcons[s.weaponIcon] ?? '';
    }
    (this.weaponEl.querySelector('.wpn-name') as HTMLElement).textContent = s.weaponName;
    (this.weaponEl.querySelector('.mag') as HTMLElement).textContent =
      s.magazine < 0 ? '—' : String(s.magazine);
    (this.weaponEl.querySelector('.reserve') as HTMLElement).textContent =
      s.reserve < 0 ? '' : `/${s.reserve}`;
    (this.weaponEl.querySelector('.fire-mode') as HTMLElement).textContent =
      s.reloading ? 'RELOADING' : s.fireMode;
    this.weaponEl.classList.toggle('empty', s.magazine === 0);

    // crosshair
    if (this.settings.crosshairVisible) {
      this.crosshairEl.style.display = '';
      const q = Math.round(s.spreadPx);
      const col = s.prompt ? '#ffc247' : '#eef3f7';
      if (q !== this.lastSpread || col !== this.lastCrosshairColor) {
        this.lastSpread = q;
        this.lastCrosshairColor = col;
        this.crosshairEl.innerHTML = crosshairSvg(q, col);
      }
    } else {
      this.crosshairEl.style.display = 'none';
    }
    if (this.hitMarkerTimer > 0) {
      this.hitMarkerTimer -= dt;
      this.hitMarkerEl.style.opacity = String(Math.min(1, this.hitMarkerTimer * 5));
    } else {
      this.hitMarkerEl.style.opacity = '0';
    }

    // objectives
    const sig = s.objectives.map((o) => `${o.id}:${o.status}`).join('|');
    if (this.objectivesEl.dataset.sig !== sig) {
      this.objectivesEl.dataset.sig = sig;
      this.objectivesEl.innerHTML = s.objectives.map((o) => {
        const tick = o.status === 'complete' ? '\u2713' : o.status === 'failed' ? '\u2715'
          : o.status === 'active' ? '\u25b8' : '\u00b7';
        return `<li class="${o.status}" data-objective="${o.id}"><span class="tick">${tick}</span><span>${o.label}</span></li>`;
      }).join('');
    }
    const timerEl = this.hudEl.querySelector('.obj-timer') as HTMLElement;
    timerEl.textContent = s.timerText;
    timerEl.classList.toggle('urgent', s.timerUrgent);

    // hostages
    const hsig = s.hostages.map((h) => `${h.id}:${h.behaviour}`).join('|');
    if (this.hostagesEl.dataset.sig !== hsig) {
      this.hostagesEl.dataset.sig = hsig;
      this.hostagesEl.innerHTML = s.hostages.map((h) => {
        const cls = h.behaviour === 'extracted' ? 'extracted'
          : h.behaviour === 'down' ? 'down'
            : h.behaviour === 'following' ? 'following'
              : h.behaviour === 'holding' || h.behaviour === 'freed' ? 'secured' : '';
        const label = h.behaviour === 'extracted' ? 'EXTRACTED'
          : h.behaviour === 'down' ? 'DOWN'
            : h.behaviour === 'following' ? 'FOLLOWING'
              : h.behaviour === 'holding' ? 'HOLDING'
                : h.behaviour === 'freed' ? 'SECURED' : h.location.toUpperCase();
        return `<div class="hostage-row ${cls}" data-hostage="${h.id}"><span class="dot"></span>
          <span>${h.name}</span><span style="color:var(--ink-faint);font-size:.86em">${label}</span></div>`;
      }).join('');
    }

    // prompt
    if (s.prompt) {
      this.promptEl.classList.add('visible');
      this.promptEl.classList.toggle('locked', s.prompt.locked);
      (this.promptEl.querySelector('kbd') as HTMLElement).textContent = s.prompt.key;
      (this.promptEl.querySelector('.ptext') as HTMLElement).textContent = s.prompt.text;
    } else {
      this.promptEl.classList.remove('visible');
    }

    // damage direction arcs
    if (s.damageDirections.length !== this.damageEl.childElementCount) {
      this.damageEl.innerHTML = s.damageDirections.map(() =>
        `<div class="dmg-arc">${damageArcSvg()}</div>`).join('');
    }
    const arcs = Array.from(this.damageEl.children) as HTMLElement[];
    s.damageDirections.forEach((d, i) => {
      const a = arcs[i];
      if (!a) return;
      a.style.transform = `rotate(${(d.angle * 180) / Math.PI}deg)`;
      a.style.opacity = String(Math.max(0, Math.min(1, d.strength)));
    });

    // minimap
    if (this.settings.minimap) {
      (this.hudEl.querySelector('#hud-minimap') as HTMLElement).style.display = '';
      if (this.minimapCtx) {
        drawPlan(this.minimapCtx, 320, 320, s.markers, {
          scale: 5.4,
          centerX: s.playerX,
          centerZ: s.playerZ,
          level: s.level,
          rotate: -s.playerYaw + Math.PI,
          labels: false,
          showAll: false,
          grid: false,
        });
      }
      this.minimapLabel.textContent = s.roomName;
    } else {
      (this.hudEl.querySelector('#hud-minimap') as HTMLElement).style.display = 'none';
    }

    // fps
    this.fpsEl.classList.toggle('active', this.settings.showFps);
    if (this.settings.showFps) {
      this.fpsEl.innerHTML = `${s.fps.toFixed(0)} fps<br/>${s.drawCalls} calls<br/>${(s.triangles / 1000).toFixed(0)}k tris`;
    }

    // timed lists
    this.tickTimedList(this.announcements, dt);
    this.tickTimedList(this.feedItems, dt);
    this.tickTimedList(this.subtitleQueue, dt);
  }

  private tickTimedList(list: { el: HTMLElement; ttl: number }[], dt: number): void {
    for (let i = list.length - 1; i >= 0; i--) {
      list[i].ttl -= dt;
      if (list[i].ttl <= 0) {
        list[i].el.remove();
        list.splice(i, 1);
      } else if (list[i].ttl < 0.4) {
        list[i].el.style.opacity = String(list[i].ttl / 0.4);
      }
    }
  }

  announce(text: string, tone: 'info' | 'objective' | 'warning' | 'success' | 'failure' = 'info'): void {
    const el = document.createElement('div');
    el.className = `announce-item ${tone}`;
    el.textContent = text;
    this.announceEl.append(el);
    this.announcements.push({ el, ttl: 4.2 });
    while (this.announcements.length > 3) {
      const old = this.announcements.shift();
      old?.el.remove();
    }
  }

  addFeed(html: string): void {
    const el = document.createElement('div');
    el.className = 'feed-item';
    el.innerHTML = html;
    this.feedEl.append(el);
    this.feedItems.push({ el, ttl: 5 });
    while (this.feedItems.length > 5) {
      const old = this.feedItems.shift();
      old?.el.remove();
    }
  }

  subtitle(who: string, text: string): void {
    if (!this.settings.subtitles) return;
    const el = document.createElement('span');
    el.className = 'cue';
    el.innerHTML = `<span class="who">${who}</span>${text}`;
    this.subtitleEl.append(el);
    this.subtitleQueue.push({ el, ttl: 3.4 });
    while (this.subtitleQueue.length > 3) {
      const old = this.subtitleQueue.shift();
      old?.el.remove();
    }
  }

  showHitMarker(lethal: boolean): void {
    this.hitMarkerEl.innerHTML = hitMarkerSvg(lethal);
    this.hitMarkerTimer = lethal ? 0.34 : 0.2;
  }

  clearTransient(): void {
    for (const a of this.announcements) a.el.remove();
    this.announcements.length = 0;
    for (const f of this.feedItems) f.el.remove();
    this.feedItems.length = 0;
    for (const s of this.subtitleQueue) s.el.remove();
    this.subtitleQueue.length = 0;
    this.hitMarkerTimer = 0;
  }

  get selection(): { difficulty: DifficultyId; primary: WeaponId; utility: WeaponId } {
    return {
      difficulty: this.selectedDifficulty,
      primary: this.selectedPrimary,
      utility: this.selectedUtility,
    };
  }

  /** Used by QA teleport list. */
  get checkpointNames(): string[] {
    return CHECKPOINTS.map((c) => c.id);
  }
}
