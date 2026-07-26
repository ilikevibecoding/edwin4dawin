// All non-HUD screens: title, settings, controls, difficulty, briefing,
// loadout, loading, pause, victory, defeat. Pure DOM; navigation via the
// mode state machine. Gameplay is started through flow handlers set by main.

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

const screens = new Map();
function screen(mode, ...content) {
  const s = el('div', { class: 'screen', id: `screen-${mode}` }, ...content);
  screens.set(mode, s);
  onEnter(mode, () => s.classList.add('active'));
  onExit(mode, () => s.classList.remove('active'));
  return s;
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
    el('div', { class: 'screen-veil' }),
    el('div', { class: 'frame' },
      el('div', { class: 'eyebrow' }, 'AEGIS TACTICAL RESPONSE UNIT // OP 7-311'),
      el('h1', { class: 'game-title' }, 'NORTHSTAR', el('span', { class: 'thin' }, 'RESCUE')),
      el('div', { class: 'subtle' }, `A blizzard, a seized headquarters, two lives inside. ${C.GAME_SUBTITLE.toLowerCase()} — single operator, no second try.`),
      menu,
      el('div', { class: 'spacer' }),
      el('div', { class: 'footer-hints' },
        el('span', {}, el('b', {}, 'v' + C.VERSION)),
        el('span', { html: '<kbd>F</kbd> fullscreen' }),
        el('span', {}, 'All assets original — no external IP.'),
      ),
    ),
  );
}

function buildSettings() {
  const grid = el('div', { class: 'set-grid' });

  function slider(key, label, min, max, step, fmt = (v) => v.toFixed(2)) {
    const val = el('span', { class: 'value' }, fmt(getSetting(key)));
    const input = el('input', { type: 'range', min, max, step, value: getSetting(key) });
    input.addEventListener('input', () => { const v = parseFloat(input.value); setSetting(key, v); val.textContent = fmt(v); });
    grid.append(el('div', { class: 'set-row' }, el('label', {}, label), input, val));
    return () => { input.value = getSetting(key); val.textContent = fmt(getSetting(key)); };
  }
  function toggle(key, label) {
    const t = el('div', { class: `toggle ${getSetting(key) ? 'on' : ''}` }, el('div', { class: 'track' }));
    t.addEventListener('click', () => { sfx('ui_click'); setSetting(key, !getSetting(key)); t.classList.toggle('on', getSetting(key)); });
    grid.append(el('div', { class: 'set-row' }, el('label', {}, label), el('div'), t));
    return () => t.classList.toggle('on', getSetting(key));
  }
  function segmented(key, label, options, fmt = (o) => o) {
    const seg = el('div', { class: 'seg' });
    const paint = () => [...seg.children].forEach((b) => b.classList.toggle('on', b.dataset.v === String(getSetting(key))));
    for (const o of options) {
      const b = el('button', { 'data-v': String(o) }, fmt(o));
      b.addEventListener('click', () => { sfx('ui_click'); setSetting(key, o); paint(); });
      seg.append(b);
    }
    paint();
    grid.append(el('div', { class: 'set-row' }, el('label', {}, label), seg, el('div')));
    return paint;
  }

  const refreshers = [
    slider('masterVolume', 'Master volume', 0, 1, 0.05, (v) => Math.round(v * 100) + '%'),
    slider('sfxVolume', 'Effects volume', 0, 1, 0.05, (v) => Math.round(v * 100) + '%'),
    slider('musicVolume', 'Music volume', 0, 1, 0.05, (v) => Math.round(v * 100) + '%'),
    slider('mouseSensitivity', 'Mouse sensitivity', 0.05, 1.5, 0.05, (v) => v.toFixed(2)),
    toggle('invertY', 'Invert Y axis'),
    slider('fov', 'Field of view', 60, 100, 1, (v) => Math.round(v) + '°'),
    segmented('quality', 'Graphics quality', ['low', 'medium', 'high', 'ultra']),
    slider('resolutionScale', 'Resolution scale', 0.5, 1, 0.05, (v) => Math.round(v * 100) + '%'),
    toggle('crosshair', 'Show crosshair'),
    toggle('reducedMotion', 'Reduce camera motion'),
    toggle('reducedBlood', 'Reduce blood effects'),
    toggle('subtitles', 'Subtitles / event text'),
  ];

  return screen(MODES.SETTINGS,
    el('div', { class: 'screen-veil heavy' }),
    el('div', { class: 'frame' },
      el('h2', { class: 'screen-title' }, 'Settings'),
      el('div', { class: 'panel' }, grid),
      el('div', { class: 'row' },
        btn('Back', () => { sfx('ui_back'); setMode(previousMode() === MODES.PAUSED ? MODES.PAUSED : MODES.TITLE); }),
        btn('Reset Defaults', () => { resetSettings(); refreshers.forEach((r) => r()); }),
      ),
    ),
  );
}

function buildControls() {
  const rows = C.CONTROLS_REFERENCE.map(([k, v]) =>
    el('div', { class: 'set-row' }, el('label', {}, v), el('div'), el('span', { class: 'value' }, k)));
  return screen(MODES.CONTROLS,
    el('div', { class: 'screen-veil heavy' }),
    el('div', { class: 'frame' },
      el('h2', { class: 'screen-title' }, 'Controls'),
      el('div', { class: 'panel' }, el('div', { class: 'set-grid' }, ...rows)),
      el('div', { class: 'row' }, btn('Back', () => { sfx('ui_back'); setMode(previousMode() === MODES.PAUSED ? MODES.PAUSED : MODES.TITLE); })),
    ),
  );
}

function buildDifficulty() {
  const cards = el('div', { class: 'card-row' });
  const paint = () => [...cards.children].forEach((c) => c.classList.toggle('selected', c.dataset.id === sel.difficulty));
  for (const d of Object.values(C.DIFFICULTIES)) {
    const card = el('div', { class: 'card', 'data-id': d.id },
      el('h4', {}, d.name),
      el('div', { class: 'desc' }, d.tagline),
      el('div', { class: 'stat' }, el('span', {}, 'Hostile strength'), el('b', {}, String(d.enemyCount))),
      el('div', { class: 'stat' }, el('span', {}, 'Mission clock'), el('b', {}, `${d.missionMinutes} min`)),
      el('div', { class: 'stat' }, el('span', {}, 'Hostile damage'), el('b', {}, `${Math.round(d.enemyDamageMult * 100)}%`)),
    );
    card.addEventListener('click', () => { sfx('ui_click'); sel.difficulty = d.id; paint(); });
    cards.append(card);
  }
  paint();
  return screen(MODES.DIFFICULTY,
    el('div', { class: 'screen-veil heavy' }),
    el('div', { class: 'frame' },
      el('div', { class: 'eyebrow' }, 'STEP 1 / 3'),
      el('h2', { class: 'screen-title' }, 'Rules of Engagement'),
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
  return screen(MODES.BRIEFING,
    el('div', { class: 'screen-veil heavy' }),
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
            ...C.MISSION.rules.map((r) => el('div', { class: 'subtle', style: 'margin-bottom:6px' }, '— ' + r)),
          ),
        ),
        el('div', {},
          el('div', { class: 'panel', style: 'margin-bottom:14px' },
            el('h3', {}, C.MISSION.location),
            mapBox,
          ),
          el('div', { class: 'panel' },
            el('h3', {}, 'Persons of interest'),
            ...C.MISSION.hostages.map((h) => el('div', { class: 'subtle', style: 'margin-bottom:5px' }, `• ${h.name} — ${h.role}`)),
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
  for (const id of C.LOADOUT_PRIMARIES) {
    const w = C.WEAPONS[id];
    const card = el('div', { class: 'card', 'data-id': id },
      el('div', { class: 'wpn-art', html: weaponSvg(id) }),
      el('h4', {}, w.name),
      el('div', { class: 'desc' }, w.desc),
      el('div', { class: 'stat' }, el('span', {}, 'Damage'), el('b', {}, w.pellets ? `${w.damage}×${w.pellets}` : String(w.damage))),
      el('div', { class: 'stat' }, el('span', {}, 'Rate'), el('b', {}, `${w.rpm} rpm`)),
      el('div', { class: 'stat' }, el('span', {}, 'Magazine'), el('b', {}, `${w.mag} / ${w.reserve}`)),
    );
    card.addEventListener('click', () => { sfx('ui_click'); sel.loadout.primary = id; paint(); });
    primRow.append(card);
  }
  for (const id of C.LOADOUT_GADGETS) {
    const w = C.WEAPONS[id];
    const card = el('div', { class: 'card', 'data-id': id },
      el('div', { class: 'wpn-art', html: weaponSvg(id) }),
      el('h4', {}, w.name),
      el('div', { class: 'desc' }, w.desc),
      el('div', { class: 'stat' }, el('span', {}, 'Carried'), el('b', {}, `×${w.count}`)),
    );
    card.addEventListener('click', () => { sfx('ui_click'); sel.loadout.gadget = id; paint(); });
    gadRow.append(card);
  }
  paint();
  const side = C.WEAPONS.vireo;
  return screen(MODES.LOADOUT,
    el('div', { class: 'screen-veil heavy' }),
    el('div', { class: 'frame' },
      el('div', { class: 'eyebrow' }, 'STEP 3 / 3'),
      el('h2', { class: 'screen-title' }, 'Loadout'),
      el('div', { class: 'panel' }, el('h3', {}, 'Primary weapon'), primRow),
      el('div', { class: 'row', style: 'gap:16px; align-items:stretch;' },
        el('div', { class: 'panel', style: 'flex:1' }, el('h3', {}, 'Equipment'), gadRow),
        el('div', { class: 'panel', style: 'flex:0 0 300px' },
          el('h3', {}, 'Always carried'),
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

let loadFill, loadLabel, loadTip;
function buildLoading() {
  loadFill = el('div', { class: 'fill' });
  loadLabel = el('div', { class: 'load-tip', style: 'color:var(--ice)' }, 'PREPARING');
  loadTip = el('div', { class: 'load-tip' }, '');
  onEnter(MODES.LOADING, () => {
    loadTip.textContent = 'TIP — ' + C.LOADING_TIPS[Math.floor(Math.random() * C.LOADING_TIPS.length)];
    setLoadingProgress(0, 'PREPARING');
  });
  return screen(MODES.LOADING,
    el('div', { class: 'screen-veil heavy' }),
    el('div', { class: 'frame', style: 'align-items:center; justify-content:center; gap:22px; text-align:center;' },
      el('div', { class: 'eyebrow' }, 'DEPLOYING'),
      el('h2', { class: 'screen-title' }, C.MISSION.location.split('—')[0].trim()),
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
    el('div', { class: 'frame' },
      el('div', { class: 'eyebrow' }, 'OPERATION SUSPENDED'),
      el('h2', { class: 'screen-title' }, 'Paused'),
      el('div', { class: 'menu-col' },
        btn('Resume', () => flow.resumeGame(), 'primary', 'Esc'),
        btn('Settings', () => setMode(MODES.SETTINGS)),
        btn('Controls', () => setMode(MODES.CONTROLS)),
        confirmBtn('Restart Mission', () => flow.restartMission()),
        confirmBtn('Abort to Title', () => flow.abortToTitle()),
      ),
    ),
  );
}

function resultScreen(mode, titleText, titleCls) {
  const statsRow = el('div', { class: 'result-stats' });
  const reasonEl = el('div', { class: 'subtle' }, '');
  onEnter(mode, (_from, payload = {}) => {
    reasonEl.textContent = payload.reason || '';
    statsRow.innerHTML = '';
    const s = payload.stats || {};
    const items = [
      ['TIME', s.time || '—'], ['HOSTILES DOWN', s.kills ?? '—'], ['SHOTS FIRED', s.shots ?? '—'],
      ['ACCURACY', s.accuracy != null ? s.accuracy + '%' : '—'], ['HOSTAGES', s.hostages || '—'],
    ];
    for (const [k, v] of items) statsRow.append(el('div', { class: 'result-stat' }, el('div', { class: 'v' }, String(v)), el('div', { class: 'k' }, k)));
  });
  return screen(mode,
    el('div', { class: 'screen-veil heavy' }),
    el('div', { class: 'frame' },
      el('div', { class: 'eyebrow' }, 'AFTER-ACTION REPORT'),
      el('h2', { class: `screen-title ${titleCls}`, style: 'font-size:44px' }, titleText),
      reasonEl, statsRow,
      el('div', { class: 'menu-col' },
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
