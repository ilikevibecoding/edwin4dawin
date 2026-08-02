// Boot: build the film, wire up playback, and expose a deterministic
// frame-stepping API for the offline renderer.

import * as THREE from 'three';
import { Engine } from './core/engine.js';
import { Film } from './core/film.js';
import { SEQUENCES } from './scenes/index.js';
import { collectCues, collectSubtitles } from './scenes/kit.js';
import { AudioDirector, encodeWav } from './audio/engine.js';

const params = new URLSearchParams(location.search);
const CAPTURE = params.get('capture') === '1';
const W = Number(params.get('w') || 0);
const H = Number(params.get('h') || 0);

const canvas = document.getElementById('c');
const subsEl = document.getElementById('subs');
const uiEl = document.getElementById('ui');
const gateEl = document.getElementById('gate');
const scrubEl = document.getElementById('scrub');
const clockEl = document.getElementById('clock');
const chapterEl = document.getElementById('chapter');
const playBtn = document.getElementById('playBtn');
const muteBtn = document.getElementById('muteBtn');

// Text textures are drawn into canvases, so the webfonts must be resident
// before anything is generated or the crawl silently falls back to Arial.
async function waitForFonts() {
  if (!document.fonts) return;
  await Promise.all([
    document.fonts.load('400 46px "News Cycle"'),
    document.fonts.load('700 46px "News Cycle"'),
    document.fonts.load('400 200px Anton'),
    document.fonts.load('400 20px Orbitron'),
  ]);
  await document.fonts.ready;
}

const engine = new Engine(canvas, {
  fixedSize: CAPTURE && W && H ? [W, H] : null,
  quality: params.get('quality') || (CAPTURE ? 'high' : 'high'),
  preserveDrawingBuffer: CAPTURE,
  pixelRatio: CAPTURE ? 1 : Math.min(window.devicePixelRatio || 1, 1.6),
});

const film = new Film(engine, SEQUENCES, {});
const cues = collectCues(SEQUENCES);
const subtitles = collectSubtitles(SEQUENCES);
const audio = new AudioDirector({ cues });

let playing = false;
let lastFrameTime = 0;
let muted = CAPTURE;

function fmt(s) {
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${String(r).padStart(2, '0')}`;
}

let subIndex = -1;
function updateSubtitles(t) {
  let found = -1;
  for (let i = 0; i < subtitles.length; i++) {
    if (t >= subtitles[i].t && t < subtitles[i].end) { found = i; break; }
    if (subtitles[i].t > t) break;
  }
  if (found === subIndex) return;
  subIndex = found;
  if (found < 0) {
    subsEl.classList.remove('on');
    subsEl.innerHTML = '';
  } else {
    const s = subtitles[found];
    subsEl.innerHTML = (s.speaker ? `<span class="who" style="color:${s.color}">${s.speaker}</span>` : '')
      + `<span style="color:${s.speaker ? s.color : '#e9e6de'}">${s.text}</span>`;
    subsEl.classList.add('on');
  }
}

function renderFrameAt() {
  engine.render(film.time);
}

function tick(now) {
  requestAnimationFrame(tick);
  if (!playing) return;
  const dt = Math.min(0.05, (now - lastFrameTime) / 1000 || 0.016);
  lastFrameTime = now;
  film.update(dt);
  updateSubtitles(film.time);
  renderFrameAt();
  if (!CAPTURE) {
    scrubEl.value = String((film.time / film.duration) * 1000);
    clockEl.textContent = `${fmt(film.time)} / ${fmt(film.duration)}`;
    chapterEl.textContent = film.labelAt(film.time);
  }
  if (film.time >= film.duration - 1e-3) {
    playing = false;
    playBtn.textContent = 'REPLAY';
  }
}

async function startPlayback(from = 0) {
  film.seek(from);
  updateSubtitles(from);
  if (!muted) {
    try { await audio.playFrom(from); } catch (e) { console.warn('audio failed', e); }
  }
  lastFrameTime = performance.now();
  playing = true;
  playBtn.textContent = 'PAUSE';
}

// --- UI --------------------------------------------------------------------

let uiTimer = 0;
function pokeUI() {
  uiEl.classList.add('show');
  clearTimeout(uiTimer);
  uiTimer = setTimeout(() => uiEl.classList.remove('show'), 2600);
}
window.addEventListener('mousemove', pokeUI);

playBtn.addEventListener('click', async () => {
  if (playing) {
    playing = false;
    audio.stop();
    playBtn.textContent = 'PLAY';
  } else if (film.time >= film.duration - 1e-3) {
    await startPlayback(0);
  } else {
    await startPlayback(film.time);
  }
});

muteBtn.addEventListener('click', () => {
  muted = !muted;
  audio.setMuted(muted);
  muteBtn.textContent = muted ? 'UNMUTE' : 'MUTE';
});

scrubEl.addEventListener('input', async () => {
  const t = (Number(scrubEl.value) / 1000) * film.duration;
  const wasPlaying = playing;
  playing = false;
  audio.stop();
  film.seek(t);
  updateSubtitles(t);
  renderFrameAt();
  clockEl.textContent = `${fmt(t)} / ${fmt(film.duration)}`;
  if (wasPlaying) await startPlayback(t);
});

window.addEventListener('keydown', async (e) => {
  if (e.code === 'Space') { e.preventDefault(); playBtn.click(); }
  if (e.code === 'ArrowRight') { film.seek(Math.min(film.duration, film.time + 10)); renderFrameAt(); }
  if (e.code === 'ArrowLeft') { film.seek(Math.max(0, film.time - 10)); renderFrameAt(); }
});

// --- capture API -----------------------------------------------------------

function exposeCaptureAPI() {
  window.__STORY__ = {
    ready: false,
    duration: film.duration,
    sequences: SEQUENCES.map((s, i) => ({ id: s.id, duration: s.duration, start: film.starts[i] })),
    /** Absolute seek + render. Use for sparse audit stills. */
    renderAt(t) {
      film.seek(t);
      updateSubtitles(t);
      engine.render(t);
      engine.flush();
      return film.labelAt(t);
    },
    /** Sequential stepping: what the frame capture loop uses. */
    seekTo(t) {
      film.seek(t);
      updateSubtitles(t);
    },
    step(dt) {
      film.update(dt);
      updateSubtitles(film.time);
      engine.render(film.time);
      engine.flush();
      return film.time;
    },
    info() {
      return {
        t: film.time,
        seq: film.labelAt(film.time),
        calls: engine.renderer.info.render.calls,
        tris: engine.renderer.info.render.triangles,
        duration: film.duration,
      };
    },
    /**
     * Renders the entire soundtrack offline into a WAV held in memory and
     * returns its size; the renderer then pulls it down in chunks, because a
     * 70 MB base64 string in one CDP message is a bad idea.
     */
    async renderAudio(duration) {
      const buf = await audio.renderOffline(duration || film.duration);
      window.__WAV__ = new Uint8Array(encodeWav(buf));
      return { bytes: window.__WAV__.length, duration: buf.duration, sampleRate: buf.sampleRate };
    },
    audioChunk(offset, length) {
      const bytes = window.__WAV__.subarray(offset, offset + length);
      let bin = '';
      const step = 0x8000;
      for (let i = 0; i < bytes.length; i += step) {
        bin += String.fromCharCode.apply(null, bytes.subarray(i, i + step));
      }
      return btoa(bin);
    },
  };
}

// --- go --------------------------------------------------------------------

(async function boot() {
  await waitForFonts();
  film.seek(0);
  engine.render(0);

  window.__film = film;
  window.__engine = engine;

  if (CAPTURE) {
    gateEl.classList.add('hidden');
    exposeCaptureAPI();
    window.__STORY__.ready = true;
    return;
  }

  document.getElementById('loading')?.remove();
  gateEl.addEventListener('click', async () => {
    gateEl.classList.add('hidden');
    pokeUI();
    muted = false;
    await startPlayback(0);
  }, { once: true });
  requestAnimationFrame(tick);
  window.__film = film;
})();

requestAnimationFrame(tick);
