// Entry point: boot gate, preloader, main menu, chapter orchestration,
// ending computation and the ?gallery art-review mode.

import { $, el, wait, SETTINGS, T } from './util.js';
import { audio } from './audio.js';
import { fx } from './fx.js';
import { stage, SHOTS } from './stage.js';
import { ui } from './ui.js';
import { Engine } from './engine.js';
import { ch1 } from './story/ch1.js';
import { ch2 } from './story/ch2.js';
import { ch3 } from './story/ch3.js';

const CHAPTERS = { ch1, ch2, ch3 };
const ORDER = ['ch1', 'ch2', 'ch3'];

const settings = { auto: SETTINGS.auto };
const engine = new Engine(settings);

function preload(onProgress) {
  const srcs = Object.values(SHOTS).map((s) => s.src);
  let done = 0;
  return Promise.all(srcs.map((src) => new Promise((res) => {
    const img = new Image();
    img.onload = img.onerror = () => { done++; onProgress(done / srcs.length); res(); };
    img.src = src;
  })));
}

// ---------- boot gate ----------
function gate() {
  return new Promise((resolve) => {
    const g = el('div', 'gate', $('#overlays'));
    el('div', 'gate-logo', g, 'AXIOM');
    el('div', 'gate-sub', g, 'NEURAL CORE OFFLINE');
    const bar = el('div', 'gate-bar', g);
    const fill = el('div', 'gate-fill', bar);
    const status = el('div', 'gate-status', g, 'INITIALIZING…');
    let ready = false;

    preload((p) => {
      fill.style.width = Math.round(p * 100) + '%';
      status.textContent = `LOADING MEMORY BANKS — ${Math.round(p * 100)}%`;
      if (p >= 1) {
        ready = true;
        status.textContent = 'CLICK ANYWHERE TO INITIALIZE';
        status.classList.add('pulse');
        g.classList.add('ready');
      }
    });

    g.addEventListener('pointerdown', () => {
      if (!ready) return;
      audio.unlock();
      audio.flushPending();
      g.classList.add('out');
      setTimeout(() => g.remove(), 800);
      resolve();
    });
  });
}

// ---------- main menu ----------
function mainMenu() {
  return new Promise(async (resolve) => {
    stage.setLetterbox(false);
    ui.hideDialogue();
    await stage.show('title_keyart', { move: 'drift' });
    audio.setAmbience('somber');

    const m = el('div', 'menu', $('#overlays'));
    const box = el('div', 'menu-box', m);
    el('div', 'menu-over', box, 'AXIOM ROBOTICS PRESENTS');
    const ttl = el('div', 'menu-title', box);
    ttl.innerHTML = 'DEVIANT<br/><span>PROTOCOL</span>';
    el('div', 'menu-sub', box, 'A CINEMATIC INTERACTIVE DEMO — INSPIRED BY DETROIT: BECOME HUMAN');
    const list = el('div', 'menu-list', box);

    const mkItem = (label, hint, fn) => {
      const it = el('div', 'menu-item', list);
      it.innerHTML = `<span class="mi-label">${label}</span><span class="mi-hint">${hint}</span>`;
      it.addEventListener('pointerenter', () => audio.uiMove());
      it.addEventListener('pointerdown', (e) => { e.stopPropagation(); audio.tick(); fn(); });
      return it;
    };

    const close = () => { m.classList.add('out'); setTimeout(() => m.remove(), 700); };

    mkItem('NEW GAME', 'BEGIN THE DEMO — ~10 MINUTES', () => { close(); resolve({ mode: 'new' }); });
    mkItem('CHAPTERS', 'JUMP TO A CHAPTER', () => {
      if (box.querySelector('.menu-chapters')) return;
      const row = el('div', 'menu-chapters', box);
      [['I — THE NEGOTIATOR', 'ch1', 'ch1_rooftop_wide'], ['II — COLD ROOM', 'ch2', 'ch2_interrogation'], ['III — CROSSROADS', 'ch3', 'ch3_march']].forEach(([t, id, img]) => {
        const c = el('div', 'chap-card', row);
        c.style.backgroundImage = `url(${SHOTS[img].src})`;
        el('span', 'cc-label', c, t);
        c.addEventListener('pointerdown', (e) => { e.stopPropagation(); audio.tick(); close(); resolve({ mode: 'chapter', id }); });
      });
    });
    mkItem('ABOUT', 'CREDITS & CONTROLS', () => {
      if (box.querySelector('.menu-about')) return;
      const a = el('div', 'menu-about', box);
      a.innerHTML = 'CONTROLS — click / SPACE: advance · arrows or 1-4: choices · A: toggle auto-play<br/>' +
        'Timed choices default on expiry. Evidence unlocks dialogue. Your choices persist across chapters.<br/>' +
        '<b>A fan-made homage inspired by Detroit: Become Human (Quantic Dream).</b> All art generated for this demo.';
    });

    el('div', 'menu-foot', m, 'DEVIANT PROTOCOL — DEMO BUILD 0038 · MODEL AD4M-900 «ADAM»');
  });
}

// ---------- ending computation ----------
function endingData(flags, marks) {
  const insPct = Math.min(100, (flags.ins || 0) * 12);
  const reese = flags.reese || 0;
  const opinion = flags.opinion || 0;
  const relText = reese <= 0 ? 'COLD' : reese <= 2 ? 'WARY' : reese <= 4 ? 'PARTNER' : 'FRIEND';
  const opText = opinion <= -2 ? 'HOSTILE' : opinion <= 1 ? 'DIVIDED' : 'SYMPATHETIC';
  const ch1Out = marks.has('m_failed') ? 'LILY WAS LOST' : marks.has('m_peace') ? 'PEACEFUL RESOLUTION' : marks.has('m_catch') ? 'CAUGHT AT THE EDGE' : marks.has('m_lucas_falls') ? 'LILY SAVED, LUCAS FELL' : '—';
  const ch2Out = marks.has('m2_confess') ? 'CONFESSION OBTAINED' : marks.has('m2_destruct') ? 'SUBJECT SELF-DESTRUCTED' : 'LOCKDOWN — NO CONFESSION';
  const deviant = flags.ending === 'deviant';
  return {
    ending: deviant ? 'I AM ALIVE' : 'I AM A MACHINE',
    stats: [
      ['SOFTWARE INSTABILITY', insPct + '%', insPct],
      ['REESE — RELATIONSHIP', relText, Math.min(100, Math.max(8, (reese + 2) * 18))],
      ['PUBLIC OPINION', opText, Math.min(100, Math.max(8, (opinion + 3) * 16))],
      ['ROOFTOP', ch1Out, marks.has('m_failed') ? 20 : 88],
      ['COLD ROOM', ch2Out, marks.has('m2_confess') ? 88 : 30],
      ['FINAL CHOICE', deviant ? 'DEVIANT' : 'MACHINE', deviant ? 96 : 50],
    ],
  };
}

// ---------- play ----------
async function playFrom(startId) {
  const flags = { ins: 0, reese: 0, opinion: 0, evidence: 0 };
  const marks = new Set();
  let id = startId;
  while (id && CHAPTERS[id]) {
    const res = await engine.run(CHAPTERS[id], flags, marks);
    id = res.next;
    if (id === 'fin') {
      stage.setLetterbox(false);
      await ui.endScreen(endingData(flags, marks));
      id = null;
    }
  }
}

// ---------- gallery (art-review) mode ----------
async function gallery() {
  const names = Object.keys(SHOTS);
  let i = 0;
  if (SETTINGS.shot && names.includes(SETTINGS.shot)) i = names.indexOf(SETTINGS.shot);
  stage.setLetterbox(true);
  const chip = el('div', 'gallery-chip', $('#overlays'));
  const show = async () => {
    chip.textContent = `${i + 1}/${names.length} — ${names[i]}`;
    await stage.show(names[i], { cut: false });
  };
  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { i = (i + 1) % names.length; show(); }
    if (e.key === 'ArrowLeft') { i = (i - 1 + names.length) % names.length; show(); }
  });
  window.addEventListener('pointerdown', (e) => {
    i = (i + (e.clientX > innerWidth / 2 ? 1 : -1) + names.length) % names.length;
    show();
  });
  await show();
}

// ---------- boot ----------
async function boot() {
  fx.init();
  stage.init();
  ui.init(settings);

  await gate();

  if (SETTINGS.gallery || SETTINGS.shot) { await gallery(); return; }

  if (SETTINGS.startChapter) {
    const id = 'ch' + SETTINGS.startChapter;
    if (CHAPTERS[id]) {
      // sensible defaults when jumping ahead
      const pre = { 2: { reese: 0 }, 3: { reese: 2, opinion: 1, ins: 3 } }[SETTINGS.startChapter] || {};
      const flags = { ins: 0, reese: 0, opinion: 0, evidence: 0, ...pre };
      const marks = new Set(SETTINGS.startChapter === 3 ? ['m_peace', 'm2_confess', 'm2_ra9'] : []);
      let id2 = id;
      while (id2 && CHAPTERS[id2]) {
        const res = await engine.run(CHAPTERS[id2], flags, marks);
        id2 = res.next;
        if (id2 === 'fin') {
          stage.setLetterbox(false);
          await ui.endScreen(endingData(flags, marks));
          id2 = null;
        }
      }
      while (true) { const a = await mainMenu(); if (a.mode === 'new') await playFrom('ch1'); else if (a.mode === 'chapter') await playFrom(a.id); }
    }
    return;
  }

  while (true) {
    const action = await mainMenu();
    if (action.mode === 'new') await playFrom('ch1');
    else if (action.mode === 'chapter') await playFrom(action.id);
  }
}

boot();
