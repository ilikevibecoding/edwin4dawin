import { Film } from './engine/app.js';
import { Hud } from './engine/hud.js';
import { whenPrintsReady } from './lego/svg.js';
import { makeEnv } from './engine/lighting.js';
import timing from './story/timing.json';
import { CHAPTERS } from './scenes/index.js';

const q = new URLSearchParams(location.search);
const CAPTURE = q.get('capture') === '1';
const W = +(q.get('w') || 1600);
const H = +(q.get('h') || 900);
const QUALITY = q.get('quality') || (CAPTURE ? 'high' : 'high');

const frame = document.getElementById('frame');
const canvas = document.getElementById('c');
const overlay = document.getElementById('overlay');
const boot = document.getElementById('boot');
const bar = document.querySelector('#bar i');
const bootlbl = document.getElementById('bootlbl');
const playBtn = document.getElementById('play');

function fit() {
  const aspect = W / H;
  const vw = window.innerWidth, vh = window.innerHeight;
  let w = vw, h = vw / aspect;
  if (h > vh) { h = vh; w = vh * aspect; }
  frame.style.width = `${Math.floor(w)}px`;
  frame.style.height = `${Math.floor(h)}px`;
}
if (CAPTURE) {
  frame.style.width = `${W}px`;
  frame.style.height = `${H}px`;
  document.getElementById('stage').style.display = 'block';
  frame.style.position = 'absolute';
  frame.style.left = '0';
  frame.style.top = '0';
} else {
  fit();
  window.addEventListener('resize', fit);
}

const film = new Film({ canvas, width: W, height: H, quality: QUALITY, capture: CAPTURE });
const hud = new Hud(overlay, { timing });

for (const mod of CHAPTERS) {
  const entry = timing.chapters.find((c) => c.id === mod.id);
  mod.dur = entry ? entry.dur : mod.dur || 20;
  film.chapter(mod);
}
film.layout();

// Chapters read their own narration lines out of the shared timing table.
for (const mod of CHAPTERS) {
  mod.lines = timing.lines.filter((l) => l.ch === mod.id)
    .map((l) => ({ ...l, local: l.start - (timing.chapters.find((c) => c.id === mod.id)?.start ?? 0) }));
}

/** Subtitles obey the active chapter -- the crawl reads itself, for instance. */
function drawHud(t) {
  const inst = film.activeInst;
  const show = inst?.subtitlesAt ? inst.subtitlesAt(film.activeLocal) : true;
  hud.update(show ? t : -999);
  if (inst?.slateAt) {
    const s = inst.slateAt(film.activeLocal);
    hud.setSlate(s?.text, s?.opacity ?? 0);
  } else {
    hud.setSlate('', 0);
  }
}

const audio = new Audio();
audio.preload = 'auto';
audio.src = './audio/master.mp3';
let audioOk = false;
audio.addEventListener('canplaythrough', () => { audioOk = true; }, { once: true });
audio.addEventListener('error', () => { audioOk = false; });

const ready = (async () => {
  // Canvas text is baked during scene build, so the webfonts must be resident
  // before anything draws or the crawl silently falls back to a system face.
  bootlbl.textContent = 'loading fonts…';
  await Promise.all([
    document.fonts.load('700 100px CrawlSans'),
    document.fonts.load('400 100px CrawlSans'),
    document.fonts.load('400 100px TitleGothic'),
  ]).catch(() => {});
  await document.fonts.ready;

  makeEnv(film.renderer, 'space', 0.28);
  await film.preload((p, id) => {
    bar.style.width = `${(p * 100).toFixed(0)}%`;
    bootlbl.textContent = `building ${id}…`;
  });
  await whenPrintsReady();
  bootlbl.textContent = `${film.duration.toFixed(0)} seconds · ${CHAPTERS.length} chapters`;
  playBtn.disabled = false;
  film.renderAt(0);
  drawHud(0);
  return true;
})();

// ------------------------------------------------------------------ capture

window.__film = {
  ready,
  get duration() { return film.duration; },
  chapters: () => film.chapters.map((c) => ({ id: c.id, start: c._start, dur: c.dur })),
  renderAt(t) {
    film.renderAt(t);
    drawHud(t);
    return t;
  },
  /** Advance simulation state to `t` without drawing (parallel-segment warmup). */
  warm(from, to, dt = 1 / 30) {
    const c = film.chapterAt(to);
    const inst = film.built.get(c.id);
    if (!inst) return;
    const a = Math.max(from, c._start) - c._start;
    const b = to - c._start;
    film.warm(inst, a, b, dt);
    film.lastT = to;
  },
  hideBoot() { boot.style.display = 'none'; },
};

// -------------------------------------------------------------- live player

let playing = false;
let clock0 = 0;

function tick() {
  requestAnimationFrame(tick);
  if (!playing) return;
  const t = audioOk && !audio.paused ? audio.currentTime : (performance.now() - clock0) / 1000;
  if (t >= film.duration) { playing = false; return; }
  film.renderAt(t);
  drawHud(t);
}

playBtn.addEventListener('click', async () => {
  await ready;
  boot.classList.add('hidden');
  setTimeout(() => { boot.style.display = 'none'; }, 700);
  clock0 = performance.now();
  if (audioOk) { audio.currentTime = 0; audio.play().catch(() => {}); }
  playing = true;
});

window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') { e.preventDefault(); if (audioOk) { audio.paused ? audio.play() : audio.pause(); } playing = !playing || !audioOk ? !playing : playing; }
  if (e.code === 'ArrowRight') { const t = Math.min(film.duration - 0.1, (audioOk ? audio.currentTime : 0) + 10); if (audioOk) audio.currentTime = t; }
  if (e.code === 'ArrowLeft') { const t = Math.max(0, (audioOk ? audio.currentTime : 0) - 10); if (audioOk) audio.currentTime = t; }
});

if (CAPTURE) {
  boot.style.display = 'none';
} else {
  tick();
}
