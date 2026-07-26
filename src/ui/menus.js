// All non-HUD screens: title, settings, controls, difficulty, briefing,
// loadout, loading, pause, victory, defeat. Pure DOM; navigation via the
// mode state machine. Gameplay is started through flow handlers set by main.
// Art direction: docs/visual-bible.md (Fable 1).

import { MODES, setMode, onEnter, onExit, previousMode } from '../core/state.js';
import { allSettings, setSetting, getSetting, resetSettings } from '../core/settings.js';
import { sfx } from '../core/audio.js';
import * as C from '../game/constants.js';
import { drawBriefingMap } from './briefingMap.js';
import { weaponSvg } from './weaponIcons.js';

let flow = {
  startMission: () => {}, restartMission: () => {}, abortToTitle: () => {}, resumeGame: () => {},
  openGallery: null,
};
export function setFlowHandlers(h) { Object.assign(flow, h); }

const sel = { difficulty: 'operator', loadout: { ...C.DEFAULT_LOADOUT } };
export function getMissionConfig() { return { difficulty: sel.difficulty, loadout: { ...sel.loadout } }; }
export function setMissionConfig(cfg) {
  if (cfg?.difficulty) sel.difficulty = cfg.difficulty;
  if (cfg?.loadout) Object.assign(sel.loadout, cfg.loadout);
}

// -------------------------------------------------- tiny DOM helpers
function el(tag, attrs = {}, ...children) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') n.className = v;
    else if (k === 'html') n.innerHTML = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v);
  }
  for (const c of children) if (c != null) n.append(c);
  return n;
}
function btn(label, onClick, cls = '', hint = '') {
  const b = el('button', { class: `btn ${cls}`, onclick: () => { sfx('ui_click'); onClick(); } }, label);
  if (hint) b.append(el('span', { class: 'hint' }, hint));
  b.addEventListener('mouseenter', () => sfx('ui_hover', { vol: 0.4 }));
  return b;
}
// Two-step destructive button: first click arms it, second confirms.
function confirmBtn(label, onConfirm, cls = '') {
  let armed = false; let timer = 0;
  const b = el('button', { class: `btn ${cls}` }, label);
  b.addEventListener('mouseenter', () => sfx('ui_hover', { vol: 0.4 }));
  b.addEventListener('click', () => {
    sfx('ui_click');
    if (!armed) {
      armed = true; b.textContent = 'CONFIRM — CLICK AGAIN'; b.classList.add('danger');
      timer = setTimeout(() => { armed = false; b.textContent = label; b.classList.remove('danger'); }, 2600);
    } else { clearTimeout(timer); armed = false; b.textContent = label; b.classList.remove('danger'); onConfirm(); }
  });
  return b;
}
// Selection cards are keyboard-operable (Enter/Space) for accessibility.
function makeCardInteractive(card, onPick) {
  card.setAttribute('tabindex', '0');
  card.setAttribute('role', 'button');
  card.addEventListener('click', onPick);
  card.addEventListener('keydown', (e) => {
    if (e.code === 'Enter' || e.code === 'Space') { e.preventDefault(); onPick(); }
  });
}

const screens = new Map();
function screen(mode, ...content) {
  const s = el('div', { class: 'screen', id: `screen-${mode}` }, ...content);
  screens.set(mode, s);
  onEnter(mode, () => s.classList.add('active'));
  onExit(mode, () => s.classList.remove('active'));
  return s;
}

// -------------------------------------------------- shared original artwork

// The game's single emblem (visual bible §5): four-point star with an
// elongated north limb, fine ring, cardinal ticks. Strokes use currentColor
// so screens can tint it (ice by default, green for victory, red for defeat).
export function starNorthSvg(size = 64, cls = '') {
  return `<svg class="${cls}" width="${size}" height="${size}" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">
    <circle cx="32" cy="34" r="21" stroke="currentColor" stroke-opacity="0.45" stroke-width="1.2"/>
    <path d="M32 34 m0 -25 v4 M32 34 m0 21 v4 M32 34 m-25 0 h4 M32 34 m21 0 h4" stroke="currentColor" stroke-opacity="0.7" stroke-width="1.2"/>
    <path d="M32 3 L36 30 L48 34 L36 38 L32 51 L28 38 L16 34 L28 30 Z" fill="currentColor"/>
    <path d="M32 3 L36 30 L32 34 L28 30 Z" fill="#e8f1f8"/>
  </svg>`;
}

// Title backdrop: original layered scene — storm sky, business-park
// silhouettes, the Northstar Administrative Center with a handful of live
// windows, drifted snow foreground. Pure SVG, no external assets.
function titleSceneSvg() {
  // scattered lit windows on the hero building (amber = exec wing, ice = security lighting)
  let winders = '';
  const lit = [
    [1150, 618, '#ffb454', 0.5], [1197, 618, '#ffb454', 0.34], [1385, 618, '#7fd2ff', 0.3],
    [1291, 664, '#7fd2ff', 0.4], [1479, 664, '#ffb454', 0.42], [1103, 664, '#7fd2ff', 0.22],
    [1338, 710, '#ffb454', 0.28], [1244, 710, '#7fd2ff', 0.33], [1432, 618, '#7fd2ff', 0.2],
  ];
  for (const [x, y, c, o] of lit) winders += `<rect x="${x}" y="${y}" width="26" height="16" fill="${c}" opacity="${o}"/>`;
  // dark window grid rows for the hero slab
  let grid = '';
  for (let r = 0; r < 3; r++) for (let i = 0; i < 11; i++) {
    grid += `<rect x="${1056 + i * 47}" y="${618 + r * 46}" width="26" height="16" fill="#152435" opacity="0.85"/>`;
  }
  return `<svg viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMax slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs>
      <linearGradient id="ts-sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#060b13"/><stop offset="0.55" stop-color="#0b1622"/><stop offset="1" stop-color="#17293a"/>
      </linearGradient>
      <linearGradient id="ts-fog" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#1a2c3e" stop-opacity="0"/><stop offset="1" stop-color="#243a4e" stop-opacity="0.55"/>
      </linearGradient>
      <linearGradient id="ts-snowfield" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#22374a"/><stop offset="1" stop-color="#101c29"/>
      </linearGradient>
    </defs>
    <rect width="1920" height="1080" fill="url(#ts-sky)"/>
    <!-- storm moon behind cloud haze -->
    <circle cx="1490" cy="240" r="150" fill="#9db4c6" opacity="0.05"/>
    <circle cx="1490" cy="240" r="86" fill="#c9d8e4" opacity="0.07"/>
    <circle cx="1490" cy="240" r="46" fill="#dfe9f1" opacity="0.12"/>
    <!-- distant ridge -->
    <path d="M0 640 L240 596 L430 632 L640 574 L880 628 L1100 590 L1370 636 L1580 600 L1780 640 L1920 616 L1920 1080 L0 1080 Z" fill="#0c1826" opacity="0.85"/>
    <!-- far campus blocks -->
    <g fill="#0e1c2b">
      <rect x="120" y="668" width="270" height="190"/><rect x="352" y="704" width="150" height="150"/>
      <rect x="1620" y="686" width="220" height="170"/><rect x="530" y="722" width="190" height="130"/>
    </g>
    <g fill="#7fd2ff" opacity="0.16">
      <rect x="150" y="692" width="18" height="11"/><rect x="205" y="692" width="18" height="11"/><rect x="315" y="734" width="18" height="11"/>
      <rect x="1655" y="710" width="18" height="11"/><rect x="1747" y="752" width="18" height="11"/><rect x="575" y="748" width="16" height="10"/>
    </g>
    <!-- hero: Northstar Administrative Center -->
    <g>
      <rect x="1032" y="588" width="520" height="290" fill="#0a141f"/>
      <rect x="1032" y="588" width="520" height="9" fill="#152538"/>
      <rect x="1216" y="548" width="150" height="40" fill="#0c1723"/>
      <rect x="1258" y="452" width="5" height="96" fill="#0c1723"/>
      <circle cx="1260.5" cy="448" r="4" fill="#ff5a4e" opacity="0.85"/>
      <rect x="1462" y="560" width="52" height="28" fill="#0c1723"/>
      ${grid}${winders}
      <!-- entrance glow -->
      <rect x="1262" y="806" width="60" height="72" fill="#7fd2ff" opacity="0.13"/>
      <rect x="1272" y="816" width="40" height="62" fill="#cfe8f8" opacity="0.2"/>
    </g>
    <!-- ground fog + snowfield -->
    <rect x="0" y="700" width="1920" height="240" fill="url(#ts-fog)"/>
    <path d="M0 880 Q 340 842 700 872 T 1400 866 T 1920 876 L1920 1080 L0 1080 Z" fill="url(#ts-snowfield)"/>
    <path d="M0 940 Q 480 906 960 934 T 1920 928 L1920 1080 L0 1080 Z" fill="#0d1723" opacity="0.9"/>
  </svg>`;
}

// small geometric stat icons for the after-action report
function statIcon(kind) {
  const s = (inner) => `<svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="#9db4c6" stroke-width="1.4">${inner}</svg>`;
  switch (kind) {
    case 'time': return s('<circle cx="9" cy="9" r="7"/><path d="M9 5v4l3 2"/>');
    case 'kills': return s('<circle cx="9" cy="9" r="6"/><path d="M9 1v4M9 13v4M1 9h4M13 9h4"/>');
    case 'shots': return s('<path d="M6 2h6v9l-3 5-3-5z"/><path d="M6 8h6"/>');
    case 'accuracy': return s('<circle cx="9" cy="9" r="7"/><circle cx="9" cy="9" r="3"/><circle cx="9" cy="9" r="0.8" fill="#9db4c6"/>');
    case 'hostages': return s('<circle cx="9" cy="6" r="3"/><path d="M3.5 16c0.8-3.4 2.8-5 5.5-5s4.7 1.6 5.5 5"/>');
    default: return s('<rect x="4" y="4" width="10" height="10"/>');
  }
}

// per-difficulty marks: chevron (recruit), star-north (operator), crescent watch (nightwatch)
function difficultyMark(id) {
  const wrap = (inner) => `<svg width="46" height="46" viewBox="0 0 46 46" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">${inner}</svg>`;
  if (id === 'recruit') {
    return wrap(`<circle cx="23" cy="23" r="19" stroke="#3e7ea6" stroke-width="1.2"/>
      <path d="M13 27 L23 17 L33 27" stroke="#7fd2ff" stroke-width="2.4"/>
      <path d="M13 33 L23 23 L33 33" stroke="#3e7ea6" stroke-width="2.4" opacity="0.5"/>`);
  }
  if (id === 'nightwatch') {
    return wrap(`<circle cx="23" cy="23" r="19" stroke="#3e7ea6" stroke-width="1.2"/>
      <path d="M9 23 Q23 11 37 23 Q23 35 9 23 Z" stroke="#7fd2ff" stroke-width="2"/>
      <circle cx="23" cy="23" r="4.5" fill="#7fd2ff"/>
      <circle cx="24.5" cy="21.5" r="1.4" fill="#e8f1f8"/>`);
  }
  // operator: the emblem itself
  return wrap(`<circle cx="23" cy="23" r="19" stroke="#3e7ea6" stroke-width="1.2"/>
    <path d="M23 6 L25.6 20.4 L34 23 L25.6 25.6 L23 36 L20.4 25.6 L12 23 L20.4 20.4 Z" fill="#7fd2ff"/>
    <path d="M23 6 L25.6 20.4 L23 23 L20.4 20.4 Z" fill="#e8f1f8"/>`);
}

// stat row with a proportional bar (v in 0..1)
function statBar(label, valueText, v) {
  return el('div', { class: 'stat' },
    el('span', {}, label),
    el('span', { class: 'sbar', style: `--v:${Math.max(0.04, Math.min(1, v)).toFixed(3)}` }, el('i')),
    el('b', {}, valueText),
  );
}

// -------------------------------------------------- screens
function buildTitle() {
  const menu = el('div', { class: 'menu-col' },
    btn('New Operation', () => setMode(MODES.DIFFICULTY), 'primary'),
    btn('Settings', () => setMode(MODES.SETTINGS)),
    btn('Controls', () => setMode(MODES.CONTROLS)),
  );
  if (new URLSearchParams(location.search).has('qa')) {
    menu.append(btn('Asset Gallery (dev)', () => flow.openGallery && flow.openGallery()));
  }
  return screen(MODES.TITLE,
    el('div', { class: 'title-scene', html: titleSceneSvg() }),
    el('div', { class: 'snow-layer far' }),
    el('div', { class: 'screen-veil title' }),
    el('div', { class: 'snow-layer near' }),
    el('div', { class: 'frame title-frame' },
      el('div', { class: 'eyebrow' }, 'AEGIS TACTICAL RESPONSE UNIT // OP 7-311'),
      el('div', { class: 'title-mark-row' },
        el('div', { class: 'logomark', style: 'color:var(--ice)', html: starNorthSvg(92) }),
        el('h1', { class: 'game-title' }, 'NORTHSTAR', el('span', { class: 'thin' }, 'RESCUE')),
      ),
      el('div', { class: 'title-tagline' }, `A blizzard, a seized headquarters, two lives inside. ${C.GAME_SUBTITLE.toLowerCase()} — single operator, no second try.`),
      menu,
      el('div', { class: 'title-footer' },
        el('span', {}, el('b', {}, 'v' + C.VERSION)),
        el('span', { html: '<kbd>F</kbd> fullscreen' }),
        el('span', { class: 'rule' }),
        el('span', {}, 'All assets original — no external IP.'),
      ),
    ),
  );
}

function buildSettings() {
  const refreshers = [];

  function slider(grid, key, label, min, max, step, fmt = (v) => v.toFixed(2)) {
    const val = el('span', { class: 'value' }, fmt(getSetting(key)));
    const input = el('input', { type: 'range', min, max, step, value: getSetting(key), 'aria-label': label });
    input.addEventListener('input', () => { const v = parseFloat(input.value); setSetting(key, v); val.textContent = fmt(v); });
    grid.append(el('div', { class: 'set-row' }, el('label', {}, label), input, val));
    refreshers.push(() => { input.value = getSetting(key); val.textContent = fmt(getSetting(key)); });
  }
  function toggle(grid, key, label) {
    const t = el('div', { class: `toggle ${getSetting(key) ? 'on' : ''}`, tabindex: '0', role: 'switch', 'aria-label': label });
    t.append(el('div', { class: 'track' }));
    const flip = () => { sfx('ui_click'); setSetting(key, !getSetting(key)); t.classList.toggle('on', getSetting(key)); };
    t.addEventListener('click', flip);
    t.addEventListener('keydown', (e) => { if (e.code === 'Enter' || e.code === 'Space') { e.preventDefault(); flip(); } });
    grid.append(el('div', { class: 'set-row' }, el('label', {}, label), el('div'), t));
    refreshers.push(() => t.classList.toggle('on', getSetting(key)));
  }
  function segmented(grid, key, label, options, fmt = (o) => o) {
    const seg = el('div', { class: 'seg' });
    const paint = () => [...seg.children].forEach((b) => b.classList.toggle('on', b.dataset.v === String(getSetting(key))));
    for (const o of options) {
      const b = el('button', { 'data-v': String(o) }, fmt(o));
      b.addEventListener('click', () => { sfx('ui_click'); setSetting(key, o); paint(); });
      seg.append(b);
    }
    paint();
    grid.append(el('div', { class: 'set-row' }, el('label', {}, label), seg, el('div')));
    refreshers.push(paint);
  }
  function group(title) {
    const grid = el('div', { class: 'set-grid' });
    const panel = el('div', { class: 'panel' }, el('h3', {}, title), grid);
    return [panel, grid];
  }

  const [audioPanel, audio] = group('Audio');
  slider(audio, 'masterVolume', 'Master volume', 0, 1, 0.05, (v) => Math.round(v * 100) + '%');
  slider(audio, 'sfxVolume', 'Effects volume', 0, 1, 0.05, (v) => Math.round(v * 100) + '%');
  slider(audio, 'musicVolume', 'Music volume', 0, 1, 0.05, (v) => Math.round(v * 100) + '%');

  const [videoPanel, video] = group('Display');
  segmented(video, 'quality', 'Graphics quality', ['low', 'medium', 'high', 'ultra']);
  slider(video, 'resolutionScale', 'Resolution scale', 0.5, 1, 0.05, (v) => Math.round(v * 100) + '%');
  slider(video, 'fov', 'Field of view', 60, 100, 1, (v) => Math.round(v) + '°');

  const [aimPanel, aim] = group('Handling');
  slider(aim, 'mouseSensitivity', 'Mouse sensitivity', 0.05, 1.5, 0.05, (v) => v.toFixed(2));
  toggle(aim, 'invertY', 'Invert Y axis');
  toggle(aim, 'crosshair', 'Show crosshair');

  const [accPanel, acc] = group('Accessibility');
  toggle(acc, 'reducedMotion', 'Reduce camera motion');
  toggle(acc, 'reducedBlood', 'Reduce blood effects');
  toggle(acc, 'subtitles', 'Subtitles / event text');

  return screen(MODES.SETTINGS,
    el('div', { class: 'screen-veil heavy' }),
    el('div', { class: 'screen-grid' }),
    el('div', { class: 'frame' },
      el('div', { class: 'eyebrow' }, 'SYSTEM CONFIGURATION'),
      el('h2', { class: 'screen-title' }, 'Settings'),
      el('div', { class: 'set-groups' }, audioPanel, videoPanel, aimPanel, accPanel),
      el('div', { class: 'row' },
        btn('Back', () => { sfx('ui_back'); setMode(previousMode() === MODES.PAUSED ? MODES.PAUSED : MODES.TITLE); }),
        el('div', { class: 'spacer' }),
        btn('Reset Defaults', () => { resetSettings(); refreshers.forEach((r) => r()); }),
      ),
    ),
  );
}

function buildControls() {
  const rows = C.CONTROLS_REFERENCE.map(([k, v]) =>
    el('div', { class: 'ctl-row' },
      el('span', { class: 'act' }, v),
      el('span', { class: 'keys' }, ...k.split(' / ').map((part) => el('kbd', {}, part))),
    ));
  return screen(MODES.CONTROLS,
    el('div', { class: 'screen-veil heavy' }),
    el('div', { class: 'screen-grid' }),
    el('div', { class: 'frame' },
      el('div', { class: 'eyebrow' }, 'OPERATOR REFERENCE'),
      el('h2', { class: 'screen-title' }, 'Controls'),
      el('div', { class: 'panel' }, el('h3', {}, 'Bindings'), el('div', { class: 'ctl-grid' }, ...rows)),
      el('div', { class: 'row' }, btn('Back', () => { sfx('ui_back'); setMode(previousMode() === MODES.PAUSED ? MODES.PAUSED : MODES.TITLE); })),
    ),
  );
}

function buildDifficulty() {
  const cards = el('div', { class: 'card-row' });
  const paint = () => [...cards.children].forEach((c) => c.classList.toggle('selected', c.dataset.id === sel.difficulty));
  const list = Object.values(C.DIFFICULTIES);
  const maxEnemies = Math.max(...list.map((d) => d.enemyCount));
  const maxMinutes = Math.max(...list.map((d) => d.missionMinutes));
  const maxDmg = Math.max(...list.map((d) => d.enemyDamageMult));
  for (const d of list) {
    const card = el('div', { class: 'card', 'data-id': d.id },
      el('div', { class: 'diff-mark', html: difficultyMark(d.id) }),
      el('h4', {}, d.name),
      el('div', { class: 'desc' }, d.tagline),
      statBar('Hostile strength', String(d.enemyCount), d.enemyCount / maxEnemies),
      statBar('Mission clock', `${d.missionMinutes} min`, d.missionMinutes / maxMinutes),
      statBar('Hostile damage', `${Math.round(d.enemyDamageMult * 100)}%`, d.enemyDamageMult / maxDmg),
    );
    makeCardInteractive(card, () => { sfx('ui_click'); sel.difficulty = d.id; paint(); });
    cards.append(card);
  }
  paint();
  return screen(MODES.DIFFICULTY,
    el('div', { class: 'screen-veil heavy' }),
    el('div', { class: 'screen-grid' }),
    el('div', { class: 'frame' },
      el('div', { class: 'eyebrow' }, 'STEP 1 / 3'),
      el('h2', { class: 'screen-title' }, 'Rules of Engagement'),
      el('div', { class: 'subtle' }, 'Set the opposition. This decides patrol density, reaction speed and how much of the storm window you get.'),
      cards,
      el('div', { class: 'row' },
        btn('Back', () => { sfx('ui_back'); setMode(MODES.TITLE); }),
        el('div', { class: 'spacer' }),
        btn('Continue', () => setMode(MODES.BRIEFING), 'primary'),
      ),
    ),
  );
}

function buildBriefing() {
  const mapCanvas = el('canvas');
  const mapBox = el('div', { class: 'brief-map' }, mapCanvas);
  onEnter(MODES.BRIEFING, () => requestAnimationFrame(() => drawBriefingMap(mapCanvas)));
  const initials = (name) => name.replace(/^(Dr|Mr|Ms|Mrs)\.\s*/i, '').split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  return screen(MODES.BRIEFING,
    el('div', { class: 'screen-veil heavy' }),
    el('div', { class: 'screen-grid' }),
    el('div', { class: 'frame' },
      el('div', { class: 'eyebrow' }, 'STEP 2 / 3 — EYES ONLY'),
      el('h2', { class: 'screen-title' }, 'Mission Briefing'),
      el('div', { class: 'brief-wrap' },
        el('div', {},
          el('div', { class: 'panel' },
            el('h3', {}, 'Situation'),
            el('div', { class: 'subtle' }, C.MISSION.situation),
          ),
          el('div', { class: 'panel', style: 'margin-top:14px' },
            el('h3', {}, 'Objectives'),
            el('ol', { class: 'objective-list' },
              ...C.MISSION.objectivesText.map((o, i) => el('li', {}, el('span', { class: 'idx' }, `0${i + 1}`), el('span', {}, o))),
            ),
          ),
          el('div', { class: 'panel', style: 'margin-top:14px' },
            el('h3', {}, 'Notes'),
            ...C.MISSION.rules.map((r) => el('div', { class: 'note-line' }, r)),
          ),
        ),
        el('div', {},
          el('div', { class: 'panel', style: 'margin-bottom:14px' },
            el('h3', {}, C.MISSION.location),
            mapBox,
          ),
          el('div', { class: 'panel' },
            el('h3', {}, 'Persons of interest'),
            ...C.MISSION.hostages.map((h) => el('div', { class: 'poi-card' },
              el('div', { class: 'poi-avatar' }, initials(h.name)),
              el('div', { class: 'poi-info' },
                el('div', { class: 'poi-name' }, h.name),
                el('div', { class: 'poi-role' }, h.role),
                el('div', { class: 'poi-status' }, 'STATUS — HELD · LOCATION UNCONFIRMED'),
              ),
            )),
          ),
        ),
      ),
      el('div', { class: 'row' },
        btn('Back', () => { sfx('ui_back'); setMode(MODES.DIFFICULTY); }),
        el('div', { class: 'spacer' }),
        btn('Continue to Loadout', () => setMode(MODES.LOADOUT), 'primary'),
      ),
    ),
  );
}

function buildLoadout() {
  const primRow = el('div', { class: 'card-row' });
  const gadRow = el('div', { class: 'card-row' });
  const paint = () => {
    [...primRow.children].forEach((c) => c.classList.toggle('selected', c.dataset.id === sel.loadout.primary));
    [...gadRow.children].forEach((c) => c.classList.toggle('selected', c.dataset.id === sel.loadout.gadget));
  };
  const prims = C.LOADOUT_PRIMARIES.map((id) => C.WEAPONS[id]);
  const maxDmg = Math.max(...prims.map((w) => w.damage * (w.pellets || 1)));
  const maxRpm = Math.max(...prims.map((w) => w.rpm));
  const maxMag = Math.max(...prims.map((w) => w.mag));
  for (const id of C.LOADOUT_PRIMARIES) {
    const w = C.WEAPONS[id];
    const card = el('div', { class: 'card', 'data-id': id },
      el('div', { class: 'wpn-art', html: weaponSvg(id) }),
      el('div', { class: 'card-kicker' }, `${w.maker} · ${w.class}`),
      el('h4', {}, w.name),
      el('div', { class: 'desc' }, w.desc),
      statBar('Damage', w.pellets ? `${w.damage}×${w.pellets}` : String(w.damage), (w.damage * (w.pellets || 1)) / maxDmg),
      statBar('Rate', `${w.rpm} rpm`, w.rpm / maxRpm),
      statBar('Magazine', `${w.mag} / ${w.reserve}`, w.mag / maxMag),
    );
    makeCardInteractive(card, () => { sfx('ui_click'); sel.loadout.primary = id; paint(); });
    primRow.append(card);
  }
  for (const id of C.LOADOUT_GADGETS) {
    const w = C.WEAPONS[id];
    const card = el('div', { class: 'card', 'data-id': id },
      el('div', { class: 'wpn-art', html: weaponSvg(id) }),
      el('div', { class: 'card-kicker' }, `${w.maker} · thrown`),
      el('h4', {}, w.name),
      el('div', { class: 'desc' }, w.desc),
      el('div', { class: 'stat' }, el('span', {}, 'Carried'), el('b', {}, `×${w.count}`)),
    );
    makeCardInteractive(card, () => { sfx('ui_click'); sel.loadout.gadget = id; paint(); });
    gadRow.append(card);
  }
  paint();
  const side = C.WEAPONS.vireo;
  return screen(MODES.LOADOUT,
    el('div', { class: 'screen-veil heavy' }),
    el('div', { class: 'screen-grid' }),
    el('div', { class: 'frame' },
      el('div', { class: 'eyebrow' }, 'STEP 3 / 3'),
      el('h2', { class: 'screen-title' }, 'Loadout'),
      el('div', { class: 'panel' }, el('h3', {}, 'Primary weapon'), primRow),
      el('div', { class: 'row', style: 'gap:16px; align-items:stretch;' },
        el('div', { class: 'panel', style: 'flex:1' }, el('h3', {}, 'Equipment'), gadRow),
        el('div', { class: 'panel', style: 'flex:0 0 300px' },
          el('h3', {}, 'Always carried'),
          el('div', { class: 'wpn-art', style: 'height:56px', html: weaponSvg('vireo') }),
          el('div', { class: 'subtle' }, `${side.name} sidearm — ${side.mag}/${side.reserve}`),
          el('div', { class: 'subtle' }, `${C.WEAPONS.talon.name} — silent takedowns`),
          el('div', { class: 'subtle', style: 'margin-top:8px;color:var(--amber)' }, 'Plate carrier — 100 armor'),
        ),
      ),
      el('div', { class: 'row' },
        btn('Back', () => { sfx('ui_back'); setMode(MODES.BRIEFING); }),
        el('div', { class: 'spacer' }),
        btn('Begin Mission', () => { sfx('ui_confirm'); flow.startMission(getMissionConfig()); }, 'primary'),
      ),
    ),
  );
}

// blueprint trace: stylized ground-floor plan of the admin center (original,
// hand-simplified from the real layout), animated dash + scanning line.
function loadingBlueprintSvg() {
  return `<svg viewBox="0 0 300 190" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">
    <g stroke="#3e7ea6" stroke-width="1" opacity="0.5">
      <path d="M40 30 h220 v96 h-70 v34 h-80 v-34 h-70 Z"/>
      <path d="M40 78 h220 M110 30 v48 M180 30 v48 M110 78 v48 M210 78 v48 M40 102 h70 M210 102 h50"/>
    </g>
    <path class="bp-trace" d="M40 30 h220 v96 h-70 v34 h-80 v-34 h-70 Z" stroke="#7fd2ff" stroke-width="1.6"/>
    <rect class="bp-scan" x="34" y="24" width="232" height="2" fill="#7fd2ff" opacity="0.25"/>
    <circle cx="150" cy="152" r="3" fill="#7dd87d"/>
    <path d="M245 60 l4 10 -4 -3 -4 3 Z" fill="#ffb454"/>
    <path d="M75 96 l4 10 -4 -3 -4 3 Z" fill="#ffb454"/>
    <text x="150" y="182" font-family="monospace" font-size="8" letter-spacing="3" fill="#5d7284" text-anchor="middle">NORTHSTAR ADMIN CTR — L1</text>
  </svg>`;
}

let loadFill, loadLabel, loadTip;
function buildLoading() {
  loadFill = el('div', { class: 'fill' });
  loadLabel = el('div', { class: 'load-tip', style: 'color:var(--ice); letter-spacing:0.3em' }, 'PREPARING');
  loadTip = el('div', { class: 'load-tip' }, '');
  onEnter(MODES.LOADING, () => {
    const tip = C.LOADING_TIPS[Math.floor(Math.random() * C.LOADING_TIPS.length)];
    loadTip.innerHTML = '';
    loadTip.append(el('b', {}, 'FIELD NOTE — '), tip);
    setLoadingProgress(0, 'PREPARING');
  });
  return screen(MODES.LOADING,
    el('div', { class: 'screen-veil heavy' }),
    el('div', { class: 'screen-grid' }),
    el('div', { class: 'frame', style: 'align-items:center; justify-content:center; gap:20px; text-align:center;' },
      el('div', { class: 'eyebrow', style: 'justify-content:center' }, 'DEPLOYING'),
      el('h2', { class: 'screen-title' }, C.MISSION.location.split('—')[0].trim()),
      el('div', { class: 'load-blueprint', html: loadingBlueprintSvg() }),
      el('div', { class: 'load-bar' }, loadFill),
      loadLabel, loadTip,
    ),
  );
}
export function setLoadingProgress(frac, label) {
  if (loadFill) loadFill.style.width = `${Math.round(frac * 100)}%`;
  if (label && loadLabel) loadLabel.textContent = label.toUpperCase();
}

function buildPause() {
  return screen(MODES.PAUSED,
    el('div', { class: 'screen-veil' }),
    el('div', { class: 'frame', style: 'align-items:center' },
      el('div', { class: 'pause-panel' },
        el('div', { class: 'eyebrow' }, 'OPERATION SUSPENDED'),
        el('h2', { class: 'screen-title', style: 'margin:10px 0 16px' }, 'Paused'),
        el('div', { class: 'menu-col' },
          btn('Resume', () => flow.resumeGame(), 'primary', 'Esc'),
          btn('Settings', () => setMode(MODES.SETTINGS)),
          btn('Controls', () => setMode(MODES.CONTROLS)),
          confirmBtn('Restart Mission', () => flow.restartMission()),
          confirmBtn('Abort to Title', () => flow.abortToTitle()),
        ),
      ),
    ),
  );
}

function resultScreen(mode, titleText, titleCls) {
  const isVictory = mode === MODES.VICTORY;
  const statsRow = el('div', { class: 'result-stats' });
  const reasonEl = el('div', { class: 'result-reason' }, '');
  onEnter(mode, (_from, payload = {}) => {
    reasonEl.textContent = payload.reason || '';
    statsRow.innerHTML = '';
    const s = payload.stats || {};
    const items = [
      ['time', 'TIME', s.time || '—'], ['kills', 'HOSTILES DOWN', s.kills ?? '—'], ['shots', 'SHOTS FIRED', s.shots ?? '—'],
      ['accuracy', 'ACCURACY', s.accuracy != null ? s.accuracy + '%' : '—'], ['hostages', 'HOSTAGES', s.hostages || '—'],
    ];
    for (const [icon, k, v] of items) {
      statsRow.append(el('div', { class: 'result-stat' },
        el('span', { html: statIcon(icon) }),
        el('div', { class: 'v' }, String(v)), el('div', { class: 'k' }, k)));
    }
  });
  const layers = isVictory
    ? [el('div', { class: 'snow-layer far' }), el('div', { class: 'screen-veil heavy' }), el('div', { class: 'snow-layer near' })]
    : [el('div', { class: 'screen-veil heavy' }), el('div', { class: 'defeat-pulse' })];
  return screen(mode,
    ...layers,
    el('div', { class: 'frame result-frame' },
      el('div', { class: 'eyebrow', style: 'justify-content:center' }, 'AFTER-ACTION REPORT'),
      el('div', {
        class: 'result-sigil',
        style: `color:${isVictory ? 'var(--ok)' : 'var(--danger)'}`,
        html: starNorthSvg(56),
      }),
      el('h2', { class: `screen-title result-title ${titleCls}` }, titleText),
      reasonEl, statsRow,
      el('div', { class: 'menu-col result-menu' },
        btn('Run It Again', () => flow.restartMission(), 'primary'),
        btn('Return to Title', () => flow.abortToTitle()),
      ),
    ),
  );
}

export function buildMenus() {
  const root = document.getElementById('ui-root');
  root.append(
    buildTitle(), buildSettings(), buildControls(), buildDifficulty(),
    buildBriefing(), buildLoadout(), buildLoading(), buildPause(),
    resultScreen(MODES.VICTORY, 'HOSTAGES SECURED', 'result-title-victory'),
    resultScreen(MODES.DEFEAT, 'OPERATION FAILED', 'result-title-defeat'),
  );
}
