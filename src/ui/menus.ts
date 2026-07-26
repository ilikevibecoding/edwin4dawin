import { settings, type Quality } from '../core/settings';
import { WEAPONS } from '../game/weapons/defs';
import { DIFFICULTIES } from '../game/difficulty';
import type { DifficultyId, WeaponId } from '../game/types';
import { Minimap } from './minimap';
import { audio } from '../core/audio';
import { clock } from '../core/clock';
import { registerAsset } from '../assets/registry';

registerAsset({
  id: 'ui.screens',
  name: 'Interface screens (title, settings, controls, difficulty, briefing, loadout, loading, pause, victory, defeat)',
  category: 'ui',
  agent: 'Fable 1',
  files: 'src/ui/menus.ts, styles/main.css',
  where: 'all non-playing states',
  dims: 'resolution-independent DOM',
  materials: 'n/a',
  textures: 'canvas weapon silhouettes, vector map',
  collision: 'none',
  lod: 'none',
  anim: 'CSS transitions',
  audio: 'ui-move/click/confirm',
  status: 'integrated',
  accept: 'original title treatment; complete flow; settings persist; menu never traps the player',
});

export interface MenuCallbacks {
  onStartMission(): void;
  onSelectDifficulty(d: DifficultyId): void;
  onDeploy(primary: WeaponId): void;
  onResume(): void;
  onRestart(): void;
  onQuitToMenu(): void;
  onSettingsChanged(): void;
}

const STAR_SVG = `<svg class="title-star" viewBox="0 0 64 64"><path d="M32 2l4.6 20.2L57 27l-20.4 4.8L32 52l-4.6-20.2L7 27l20.4-4.8z" fill="none" stroke="#37d0e6" stroke-width="2.2"/><circle cx="32" cy="27" r="3" fill="#e6b64c"/></svg>`;

export class Menus {
  private root: HTMLElement;
  private cb: MenuCallbacks;
  private current: HTMLElement | null = null;
  private minimap = new Minimap();
  selectedPrimary: WeaponId = 'vc7';
  selectedDifficulty: DifficultyId = 'operator';
  private settingsReturn: 'title' | 'pause' = 'title';

  constructor(root: HTMLElement, cb: MenuCallbacks) {
    this.root = root;
    this.cb = cb;
  }

  clear(): void {
    this.current?.remove();
    this.current = null;
  }

  private show(el: HTMLElement): void {
    this.clear();
    // CSS animations stall in frame-on-demand test mode; skip the fade there
    if (!clock.testMode) el.classList.add('fade-in');
    this.root.appendChild(el);
    this.current = el;
  }

  private clickSound = (): void => audio.play('ui-click', { vol: 0.7 });

  private btn(label: string, cls: string, onClick: () => void): HTMLButtonElement {
    const b = document.createElement('button');
    b.className = `btn ${cls}`;
    b.textContent = label;
    b.addEventListener('click', () => {
      audio.init();
      this.clickSound();
      onClick();
    });
    b.addEventListener('mouseenter', () => audio.play('ui-move', { vol: 0.5 }));
    return b;
  }

  // ---------------- title ----------------
  showTitle(): void {
    const el = document.createElement('div');
    el.className = 'screen transparent';
    el.innerHTML = `
      <div class="title-treatment">
        ${STAR_SVG}
        <div class="title-main">NORTHSTAR RESCUE</div>
        <div class="title-sub">TACTICAL RESPONSE</div>
        <div class="title-rule"></div>
        <div class="title-tag">A NORRSKEN DYNAMICS INCIDENT — SINGLE OPERATOR VERTICAL SLICE</div>
      </div>
    `;
    const buttons = document.createElement('div');
    buttons.className = 'menu-buttons';
    buttons.appendChild(this.btn('Start Mission', 'primary', () => this.cb.onStartMission()));
    buttons.appendChild(this.btn('Settings', '', () => this.showSettings('title')));
    buttons.appendChild(this.btn('Controls', '', () => this.showControls()));
    el.appendChild(buttons);
    const foot = document.createElement('div');
    foot.className = 'footer-hint';
    foot.textContent = 'All assets original & procedurally generated · Fictional locations and manufacturers';
    el.appendChild(foot);
    this.show(el);
  }

  // ---------------- settings ----------------
  showSettings(from: 'title' | 'pause'): void {
    this.settingsReturn = from;
    const el = document.createElement('div');
    el.className = 'screen';
    const panel = document.createElement('div');
    panel.className = 'panel';
    panel.innerHTML = `<h2>Settings</h2><div class="kicker">Video · Audio · Input · Accessibility</div>`;

    const slider = (label: string, key: 'masterVolume' | 'effectsVolume' | 'musicVolume' | 'mouseSensitivity' | 'fov' | 'resolutionScale', min: number, max: number, step: number, fmt: (v: number) => string): void => {
      const row = document.createElement('div');
      row.className = 'row';
      const value = settings.get(key) as number;
      row.innerHTML = `<label>${label}</label>`;
      const input = document.createElement('input');
      input.type = 'range';
      input.min = String(min);
      input.max = String(max);
      input.step = String(step);
      input.value = String(value);
      const val = document.createElement('span');
      val.className = 'value';
      val.textContent = fmt(value);
      input.addEventListener('input', () => {
        const v = parseFloat(input.value);
        settings.set(key, v as never);
        val.textContent = fmt(v);
        this.cb.onSettingsChanged();
      });
      row.appendChild(input);
      row.appendChild(val);
      panel.appendChild(row);
    };
    const toggle = (label: string, key: 'invertY' | 'crosshair' | 'reducedMotion' | 'reducedBlood' | 'subtitles'): void => {
      const row = document.createElement('div');
      row.className = 'row';
      row.innerHTML = `<label>${label}</label>`;
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.checked = settings.get(key);
      input.addEventListener('change', () => {
        settings.set(key, input.checked);
        this.cb.onSettingsChanged();
      });
      row.appendChild(input);
      panel.appendChild(row);
    };

    slider('Master volume', 'masterVolume', 0, 1, 0.05, (v) => `${Math.round(v * 100)}%`);
    slider('Effects volume', 'effectsVolume', 0, 1, 0.05, (v) => `${Math.round(v * 100)}%`);
    slider('Music volume', 'musicVolume', 0, 1, 0.05, (v) => `${Math.round(v * 100)}%`);
    slider('Mouse sensitivity', 'mouseSensitivity', 0.2, 3, 0.05, (v) => v.toFixed(2));
    toggle('Invert Y axis', 'invertY');
    slider('Field of view', 'fov', 60, 110, 1, (v) => `${v.toFixed(0)}°`);

    const qrow = document.createElement('div');
    qrow.className = 'row';
    qrow.innerHTML = `<label>Graphics quality</label>`;
    const sel = document.createElement('select');
    for (const q of ['low', 'medium', 'high', 'ultra'] as Quality[]) {
      const o = document.createElement('option');
      o.value = q;
      o.textContent = q.toUpperCase();
      if (settings.get('quality') === q) o.selected = true;
      sel.appendChild(o);
    }
    sel.addEventListener('change', () => {
      settings.set('quality', sel.value as Quality);
      this.cb.onSettingsChanged();
    });
    qrow.appendChild(sel);
    panel.appendChild(qrow);

    slider('Resolution scale', 'resolutionScale', 0.5, 1.5, 0.05, (v) => `${Math.round(v * 100)}%`);
    toggle('Crosshair', 'crosshair');
    toggle('Reduced camera motion', 'reducedMotion');
    toggle('Reduced blood', 'reducedBlood');
    toggle('Subtitles', 'subtitles');

    const back = this.btn('Back', 'primary', () => {
      if (this.settingsReturn === 'title') this.showTitle();
      else this.showPause();
    });
    back.style.marginTop = '20px';
    panel.appendChild(back);
    el.appendChild(panel);
    this.show(el);
  }

  // ---------------- controls ----------------
  showControls(): void {
    const el = document.createElement('div');
    el.className = 'screen';
    const panel = document.createElement('div');
    panel.className = 'panel';
    panel.innerHTML = `<h2>Controls</h2><div class="kicker">Operator reference</div>
      <div class="controls-grid">
        ${[
          ['Move', 'W A S D'], ['Look / Aim', 'MOUSE'], ['Fire', 'LMB'], ['Aim down sights', 'RMB'],
          ['Slow walk (quiet)', 'SHIFT'], ['Crouch (toggle)', 'C / CTRL'], ['Jump', 'SPACE'], ['Interact', 'E'],
          ['Reload', 'R'], ['Primary weapon', '1'], ['Sidearm', '2'], ['Blade', '3'],
          ['Flash device', '4'], ['Smoke device', '5'], ['Pause', 'ESC'], ['Fullscreen', 'F'],
        ].map(([a, k]) => `<div class="row"><label>${a}</label><span><kbd>${k}</kbd></span></div>`).join('')}
      </div>`;
    const back = this.btn('Back', 'primary', () => this.showTitle());
    back.style.marginTop = '20px';
    panel.appendChild(back);
    el.appendChild(panel);
    this.show(el);
  }

  // ---------------- difficulty ----------------
  showDifficulty(): void {
    const el = document.createElement('div');
    el.className = 'screen';
    const panel = document.createElement('div');
    panel.className = 'panel';
    panel.style.minWidth = '820px';
    panel.innerHTML = `<h2>Response Level</h2><div class="kicker">Select difficulty</div>`;
    const cards = document.createElement('div');
    cards.className = 'cards';
    const colors: Record<DifficultyId, string> = { recruit: '', operator: 'gold', veteran: 'red' };
    for (const d of Object.values(DIFFICULTIES)) {
      const card = document.createElement('div');
      card.className = `card ${colors[d.id]}`;
      card.innerHTML = `
        <h3>${d.name}</h3>
        <p>${d.tagline}</p>
        <ul>
          <li>Hostiles: <b>${d.enemyCount}</b></li>
          <li>Armor issued: <b>${d.playerArmor}</b></li>
          <li>Mission window: <b>${Math.round(d.missionTime / 60)} min</b></li>
        </ul>`;
      card.addEventListener('click', () => {
        audio.init();
        this.clickSound();
        this.selectedDifficulty = d.id;
        this.cb.onSelectDifficulty(d.id);
      });
      cards.appendChild(card);
    }
    panel.appendChild(cards);
    const back = this.btn('Back', '', () => this.showTitle());
    back.style.marginTop = '20px';
    panel.appendChild(back);
    el.appendChild(panel);
    this.show(el);
  }

  // ---------------- briefing ----------------
  showBriefing(onContinue: () => void): void {
    const el = document.createElement('div');
    el.className = 'screen';
    const panel = document.createElement('div');
    panel.className = 'panel';
    panel.style.maxWidth = '980px';
    panel.innerHTML = `<h2>Mission Briefing</h2><div class="kicker">Operation Northstar · 06:42 local · blizzard conditions</div>`;
    const body = document.createElement('div');
    body.className = 'briefing-body';
    body.innerHTML = `
      <div class="briefing-text">
        <p>At 06:10 an armed cell identifying as <b>KESTREL</b> seized the
        <b>Northstar Administrative Annex</b>, the satellite office of Norrsken
        Dynamics' mountain campus. The storm has cut road access and grounded
        aviation. You are <b>VANGUARD-2</b>, the only operator in reach.</p>
        <p><span class="obj">■ Objective 1</span> — Infiltrate through the snowbound employee
        entrance on the north face.</p>
        <p><span class="obj">■ Objective 2</span> — Locate and free two staff members:
        <b>M. Halvorsen</b> (believed held in the <b>server room</b>, ground floor east) and
        <b>R. Bek</b> (believed held in the <b>conference room</b>, level 2).</p>
        <p><span class="obj">■ Objective 3</span> — Escort both hostages to the
        <b>extraction garage</b> at the south-east corner and hold until the shutter opens.</p>
        <p>Kestrel patrols react to gunfire, glass and running footsteps. Move
        deliberately: walk with <b>SHIFT</b>, use interior glass for recon, and pick
        your engagements. Reinforcements arrive when the mission timer expires.</p>
      </div>
      <div class="briefing-map">
        <canvas id="brief-map-0" width="320" height="240"></canvas>
        <div class="map-caption">Level 1 — entry north · extraction south-east</div>
        <canvas id="brief-map-1" width="320" height="240" style="margin-top:10px"></canvas>
        <div class="map-caption">Level 2 — executive floor</div>
      </div>
    `;
    panel.appendChild(body);
    const cont = this.btn('Continue to Loadout', 'primary', onContinue);
    cont.style.marginTop = '18px';
    panel.appendChild(cont);
    const back = this.btn('Back', '', () => this.showDifficulty());
    back.style.marginTop = '8px';
    panel.appendChild(back);
    el.appendChild(panel);
    this.show(el);
    // draw maps
    const c0 = panel.querySelector('#brief-map-0') as HTMLCanvasElement;
    const c1 = panel.querySelector('#brief-map-1') as HTMLCanvasElement;
    this.minimap.draw(c0.getContext('2d')!, 320, 240, 0, [
      { x: 9, z: 2.2, floor: 0, kind: 'player', yaw: Math.PI },
      { x: 45, z: 14, floor: 0, kind: 'objective' },
      { x: 42, z: 35, floor: 0, kind: 'extract' },
    ]);
    this.minimap.draw(c1.getContext('2d')!, 320, 240, 1, [
      { x: 38, z: 14, floor: 1, kind: 'objective' },
    ]);
  }

  // ---------------- loadout ----------------
  showLoadout(): void {
    const el = document.createElement('div');
    el.className = 'screen';
    const panel = document.createElement('div');
    panel.className = 'panel';
    panel.style.minWidth = '820px';
    panel.innerHTML = `<h2>Loadout</h2><div class="kicker">Select primary weapon · sidearm, blade & devices are standard issue</div>`;
    const grid = document.createElement('div');
    grid.className = 'loadout-grid';
    const primaries: WeaponId[] = ['vc7', 'kis10', 'br8', 'lr30'];
    const cards = new Map<WeaponId, HTMLDivElement>();
    for (const id of primaries) {
      const def = WEAPONS[id];
      const card = document.createElement('div');
      card.className = 'weapon-card' + (this.selectedPrimary === id ? ' selected' : '');
      const canvas = document.createElement('canvas');
      canvas.width = 320;
      canvas.height = 128;
      drawWeaponSilhouette(canvas, id);
      card.appendChild(canvas);
      card.insertAdjacentHTML('beforeend', `
        <div class="wmaker">${def.maker}</div>
        <div class="wname">${def.name}</div>
        <div class="wstats">DMG ${def.damage} · RPM ${def.rpm}<br/>MAG ${def.magSize} · ${def.auto ? 'AUTO' : def.category === 'shotgun' ? 'PUMP' : 'SEMI'}</div>
      `);
      card.addEventListener('click', () => {
        this.clickSound();
        this.selectedPrimary = id;
        for (const [cid, c] of cards) c.classList.toggle('selected', cid === id);
      });
      cards.set(id, card);
      grid.appendChild(card);
    }
    panel.appendChild(grid);
    panel.insertAdjacentHTML('beforeend', `
      <div class="row"><label>Sidearm</label><span class="value">Vektra P-9</span></div>
      <div class="row"><label>Blade</label><span class="value">Fieldmate</span></div>
      <div class="row"><label>Devices</label><span class="value">2× Starburst flash · 1× Whiteout smoke</span></div>
    `);
    const deploy = this.btn('Deploy', 'primary', () => this.cb.onDeploy(this.selectedPrimary));
    deploy.style.marginTop = '20px';
    panel.appendChild(deploy);
    const back = this.btn('Back', '', () => this.showBriefing(() => this.showLoadout()));
    back.style.marginTop = '8px';
    panel.appendChild(back);
    el.appendChild(panel);
    this.show(el);
  }

  // ---------------- loading ----------------
  showLoading(): { setProgress: (p: number) => void } {
    const el = document.createElement('div');
    el.className = 'screen';
    el.innerHTML = `
      <div class="title-treatment">
        ${STAR_SVG}
        <div class="title-main" style="font-size:34px">NORTHSTAR ANNEX</div>
        <div class="title-sub">PREPARING INSERTION</div>
      </div>
      <div class="loading-bar"><div class="loading-fill"></div></div>
      <div class="loading-tip">Quiet movement keeps patrols calm — SHIFT to walk silently</div>
    `;
    this.show(el);
    const fill = el.querySelector('.loading-fill') as HTMLDivElement;
    return {
      setProgress: (p: number) => {
        fill.style.width = `${Math.round(p * 100)}%`;
      },
    };
  }

  // ---------------- pause ----------------
  showPause(): void {
    const el = document.createElement('div');
    el.className = 'screen transparent';
    el.innerHTML = `<div id="pause-title">PAUSED</div>`;
    const buttons = document.createElement('div');
    buttons.className = 'menu-buttons';
    buttons.appendChild(this.btn('Resume', 'primary', () => this.cb.onResume()));
    buttons.appendChild(this.btn('Settings', '', () => this.showSettings('pause')));
    buttons.appendChild(this.btn('Restart Mission', '', () => this.confirmRestart()));
    buttons.appendChild(this.btn('Abort to Menu', 'danger', () => this.cb.onQuitToMenu()));
    el.appendChild(buttons);
    this.show(el);
  }

  private confirmRestart(): void {
    const el = document.createElement('div');
    el.className = 'screen';
    const panel = document.createElement('div');
    panel.className = 'panel';
    panel.innerHTML = `<h2>Restart mission?</h2><div class="kicker">Progress in the current attempt will be lost</div>`;
    const buttons = document.createElement('div');
    buttons.className = 'menu-buttons';
    buttons.appendChild(this.btn('Yes — restart', 'danger', () => this.cb.onRestart()));
    buttons.appendChild(this.btn('No — back', '', () => this.showPause()));
    panel.appendChild(buttons);
    el.appendChild(panel);
    this.show(el);
  }

  // ---------------- end screens ----------------
  showEnd(victory: boolean, reason: string, stats: { kills: number; elapsed: number; shots: number; hits: number }): void {
    const el = document.createElement('div');
    el.className = 'screen';
    const m = Math.floor(stats.elapsed / 60);
    const s = Math.floor(stats.elapsed % 60);
    const acc = stats.shots > 0 ? Math.round((stats.hits / stats.shots) * 100) : 0;
    el.innerHTML = `
      <div class="end-title ${victory ? 'victory' : 'defeat'}">${victory ? 'HOSTAGES SECURED' : 'MISSION FAILED'}</div>
      <div class="end-reason">${victory ? 'Both civilians extracted from the Northstar Annex.' : reason}</div>
      <div class="stats-grid">
        <div class="stat-box"><div class="v">${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}</div><div class="k">Time</div></div>
        <div class="stat-box"><div class="v">${stats.kills}</div><div class="k">Hostiles down</div></div>
        <div class="stat-box"><div class="v">${stats.shots}</div><div class="k">Rounds fired</div></div>
        <div class="stat-box"><div class="v">${acc}%</div><div class="k">Accuracy</div></div>
      </div>
    `;
    const buttons = document.createElement('div');
    buttons.className = 'menu-buttons';
    buttons.appendChild(this.btn(victory ? 'Play Again' : 'Retry Mission', 'primary', () => this.cb.onRestart()));
    buttons.appendChild(this.btn('Return to Menu', '', () => this.cb.onQuitToMenu()));
    el.appendChild(buttons);
    this.show(el);
  }
}

/** 2D side-profile weapon silhouettes for loadout cards (original shapes). */
export function drawWeaponSilhouette(canvas: HTMLCanvasElement, id: WeaponId): void {
  const ctx = canvas.getContext('2d')!;
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#141e28';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(120,160,190,0.14)';
  for (let x = 0; x < w; x += 16) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
  }
  ctx.fillStyle = '#cfdce8';
  ctx.strokeStyle = '#8fa8bd';
  ctx.lineWidth = 2;
  const cy = h / 2 + 6;
  ctx.save();
  ctx.translate(26, cy);
  const R = (x: number, y: number, ww: number, hh: number): void => {
    ctx.fillRect(x, y, ww, hh);
  };
  switch (id) {
    case 'vc7': // carbine: receiver, mag, stock, barrel, rail, grip
      R(60, -16, 96, 22);       // receiver
      R(150, -10, 92, 11);      // barrel/handguard
      R(242, -8, 26, 7);        // muzzle
      R(0, -12, 62, 16);        // stock
      R(96, 6, 20, 34);         // mag (angled)
      ctx.transform(1, 0, -0.25, 1, 0, 0);
      R(130, 6, 14, 26);        // grip
      ctx.setTransform(1, 0, 0, 1, 26, cy);
      R(70, -24, 70, 7);        // optic rail
      R(96, -34, 26, 12);       // optic
      break;
    case 'kis10': // compact SMG
      R(40, -14, 86, 24);
      R(124, -9, 56, 10);
      R(180, -7, 18, 6);
      R(6, -10, 36, 10);        // folding stock (skeleton)
      R(70, 8, 16, 30);
      ctx.transform(1, 0, -0.22, 1, 0, 0);
      R(104, 8, 13, 22);
      ctx.setTransform(1, 0, 0, 1, 26, cy);
      R(48, -20, 60, 5);
      break;
    case 'br8': // pump shotgun
      R(56, -13, 90, 18);
      R(140, -9, 96, 9);        // barrel
      R(140, 2, 66, 9);         // pump
      ctx.beginPath();          // stock silhouette
      ctx.moveTo(56, -12);
      ctx.lineTo(4, -4);
      ctx.lineTo(4, 16);
      ctx.lineTo(56, 6);
      ctx.closePath();
      ctx.fill();
      break;
    case 'lr30': // precision rifle
      R(52, -12, 110, 16);
      R(158, -8, 104, 8);
      R(258, -10, 14, 12);      // brake
      R(0, -10, 54, 14);
      R(96, 4, 16, 26);
      R(66, -22, 84, 6);
      R(88, -34, 44, 14);       // scope
      ctx.beginPath();
      ctx.arc(88, -27, 7, 0, Math.PI * 2);
      ctx.fill();
      break;
    default:
      R(40, -12, 80, 20);
  }
  ctx.restore();
  // accent line
  ctx.fillStyle = '#37d0e6';
  ctx.fillRect(0, h - 3, w, 3);
}
