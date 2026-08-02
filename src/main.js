import * as THREE from 'three';
import { Engine } from './core/engine.js';
import { CameraRig } from './core/cameraRig.js';
import { Overlay, fatal } from './ui/overlay.js';
import { Narration, captionsFromCues } from './audio/narration.js';
import { loadAudioModules, createMixer, scheduleTrack, autoDuck, audioAvailable } from './audio/mixer.js';
import { buildFilm } from './film/index.js';
import { logoSvg } from './svg/assets.js';

const params = new URLSearchParams(location.search);
const CAPTURE = params.get('capture') === '1';

const canvas = document.getElementById('c');
const startEl = document.getElementById('start');
const loadBar = document.getElementById('loadBar');
const loadStatus = document.getElementById('loadStatus');
const playBtn = document.getElementById('play');
const overlay = new Overlay();

// ---------------------------------------------------------------- sizing --

// 2.39:1 is the film's aspect; the canvas is letterboxed into whatever the
// window gives us so composition never changes with the browser size.
const ASPECT = 2.39;
const quality = params.get('q') || (CAPTURE ? 'high' : 'auto');
const baseWidth = CAPTURE ? +(params.get('w') || 1280) : 0;
const baseHeight = CAPTURE ? +(params.get('h') || Math.round(1280 / ASPECT)) : 0;

let renderScale = quality === 'high' ? 1 : quality === 'low' ? 0.6 : 0.85;

const engine = new Engine(canvas, {
  width: 16, height: 9,
  pixelRatio: 1,
  preserveDrawingBuffer: CAPTURE,
  shadows: quality !== 'low',
});
engine.grade.uLetterbox.value = 0;   // the canvas itself is already 2.39:1

function layout() {
  let cssW, cssH;
  if (CAPTURE) {
    cssW = baseWidth; cssH = baseHeight;
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
  } else {
    const availW = window.innerWidth;
    const availH = window.innerHeight;
    cssW = Math.min(availW, availH * ASPECT);
    cssH = cssW / ASPECT;
    canvas.style.width = `${Math.round(cssW)}px`;
    canvas.style.height = `${Math.round(cssH)}px`;
  }
  const w = Math.max(320, Math.round(cssW * renderScale));
  engine.setSize(w, Math.round(w / ASPECT));
}
addEventListener('resize', layout);

// ------------------------------------------------------------------- film --

const rig = new CameraRig(engine.camera);
const ctx = {
  engine,
  scene: null,
  camera: engine.camera,
  rig,
  quality,
  capture: CAPTURE,
  assets: {},
};

const narration = new Narration('audio/vo/');
let timeline = null;
let cues = [];
let audio = null;
let audioCtx = null;
let startedAt = 0;
let playing = false;
let ready = false;

function status(msg, pct) {
  loadStatus.textContent = msg;
  if (pct !== undefined) loadBar.style.width = `${Math.round(pct * 100)}%`;
}

async function boot() {
  layout();

  try {
    document.getElementById('startLogo').innerHTML = logoSvg({ title: 'STAR WARS' });
  } catch { /* the logo is decoration; never block the film on it */ }

  status('loading narration', 0.05);
  await narration.load((p) => status('loading narration', 0.05 + p * 0.1));

  status('warming up the orchestra', 0.16);
  await loadAudioModules();

  status('placing bricks', 0.2);
  const film = await buildFilm(ctx, (p, id) => status(`building — ${id}`, 0.2 + p * 0.75));
  timeline = film.timeline;
  cues = film.cues.concat(autoDuck(film.cues, narration));
  overlay.setCaptions(captionsFromCues(film.cues, narration));
  overlay.setChapters(film.chapters || []);

  timeline.seek(0);
  timeline.update(0, 0);
  engine.render();

  status(`ready — ${fmtTime(timeline.duration)}`, 1);
  ready = true;
  playBtn.disabled = false;

  overlay.showDev(params.get('dev') === '1');

  if (CAPTURE) exposeCaptureApi();
  if (params.get('auto') === '1') start();
}

function fmtTime(s) { return `${(s / 60) | 0}:${String(Math.round(s) % 60).padStart(2, '0')}`; }

// ---------------------------------------------------------------- playback --

async function start() {
  if (!ready || playing) return;
  startEl.classList.add('gone');
  audioCtx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'playback' });
  await audioCtx.resume();
  audio = createMixer(audioCtx, {});
  await narration.decode(audioCtx);
  startedAt = audioCtx.currentTime + 0.4;
  scheduleTrack(audio, cues, startedAt, narration, { verbose: params.get('dev') === '1' });
  playing = true;
  document.getElementById('transport').classList.add('show');
  setTimeout(() => document.getElementById('transport').classList.remove('show'), 2600);
}

playBtn.addEventListener('click', start);

// ------------------------------------------------------------------- loop --

let lastT = 0;
let frameAvg = 16;
let scaleCooldown = 0;

function loop() {
  requestAnimationFrame(loop);
  if (!ready || CAPTURE) return;

  const t0 = performance.now();
  let t, dt;
  if (playing) {
    t = audioCtx.currentTime - startedAt;
    if (t < 0) t = 0;
    dt = Math.min(0.1, Math.max(0, t - lastT));
    lastT = t;
    if (t > timeline.duration) { finish(); return; }
  } else {
    t = timeline.time;
    dt = 0;
  }

  timeline.update(dt, t);
  rig.update(t, dt);
  engine.render();
  overlay.update(t, timeline.duration);

  const ms = performance.now() - t0;
  frameAvg += (ms - frameAvg) * 0.1;
  if (quality === 'auto' && (scaleCooldown -= dt) <= 0) {
    if (frameAvg > 46 && renderScale > 0.45) { renderScale = Math.max(0.45, renderScale - 0.12); layout(); scaleCooldown = 1.5; }
    else if (frameAvg < 20 && renderScale < 1) { renderScale = Math.min(1, renderScale + 0.08); layout(); scaleCooldown = 2.5; }
  }
  overlay.dev(
    `t ${t.toFixed(2)} / ${timeline.duration.toFixed(1)}\n` +
    `seq ${timeline.active?.id}  (${(t - (timeline.active?.start || 0)).toFixed(2)})\n` +
    `${ms.toFixed(1)} ms  scale ${renderScale.toFixed(2)}  ${engine.size.w}x${engine.size.h}\n` +
    `calls ${engine.renderer.info.render.calls}  tris ${(engine.renderer.info.render.triangles / 1000).toFixed(0)}k\n` +
    `audio ${audioAvailable() ? 'on' : 'silent'}`,
  );
}

function finish() {
  playing = false;
  overlay.hideAll();
  document.getElementById('transport').classList.add('show');
}

// -------------------------------------------------------------- transport --

document.getElementById('tPlay')?.addEventListener('click', () => {
  if (!playing) start();
  else if (audioCtx.state === 'running') audioCtx.suspend();
  else audioCtx.resume();
});
document.getElementById('tFull')?.addEventListener('click', () => {
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen?.();
});
addEventListener('keydown', (e) => {
  if (e.key === ' ') { e.preventDefault(); document.getElementById('tPlay').click(); }
  if (e.key === 'd') overlay.showDev(!document.getElementById('dev').classList.contains('on'));
});

// ---------------------------------------------------------------- capture --

/**
 * Hooks for tools/render.mjs. The renderer drives time explicitly, one frame at
 * a time, so the output is deterministic regardless of how slow the machine is.
 */
function exposeCaptureApi() {
  window.__film = {
    duration: timeline.duration,
    sequences: timeline.sequences.map((s) => ({ id: s.id, start: s.start, duration: s.duration })),
    cues,
    captions: captionsFromCues(cues.filter((c) => c.kind === 'vo'), narration),

    frame(i, fps) {
      const t = i / fps;
      const dt = 1 / fps;
      timeline.update(dt, t);
      rig.update(t, dt);
      engine.render();
      return t;
    },

    /** Render the entire soundtrack offline and hand back a WAV. */
    async renderAudio(duration, sampleRate = 48000) {
      const oc = new OfflineAudioContext(2, Math.ceil(duration * sampleRate), sampleRate);
      const a = createMixer(oc, { offline: true });
      await narration.decode(oc);
      scheduleTrack(a, cues, 0.0, narration);
      const buf = await oc.startRendering();
      return wavBase64(buf);
    },
  };
  window.__filmReady = true;
}

function wavBase64(buffer) {
  const ch = buffer.numberOfChannels;
  const len = buffer.length;
  const bytes = 44 + len * ch * 2;
  const ab = new ArrayBuffer(bytes);
  const view = new DataView(ab);
  const str = (o, s) => { for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i)); };
  str(0, 'RIFF'); view.setUint32(4, bytes - 8, true); str(8, 'WAVE');
  str(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
  view.setUint16(22, ch, true); view.setUint32(24, buffer.sampleRate, true);
  view.setUint32(28, buffer.sampleRate * ch * 2, true); view.setUint16(32, ch * 2, true);
  view.setUint16(34, 16, true); str(36, 'data'); view.setUint32(40, len * ch * 2, true);
  const data = [];
  for (let c = 0; c < ch; c++) data.push(buffer.getChannelData(c));
  let o = 44;
  for (let i = 0; i < len; i++) {
    for (let c = 0; c < ch; c++) {
      const s = Math.max(-1, Math.min(1, data[c][i]));
      view.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      o += 2;
    }
  }
  let bin = '';
  const u8 = new Uint8Array(ab);
  const CHUNK = 0x8000;
  for (let i = 0; i < u8.length; i += CHUNK) bin += String.fromCharCode.apply(null, u8.subarray(i, i + CHUNK));
  return btoa(bin);
}

addEventListener('error', (e) => fatal(e.error || e.message));
addEventListener('unhandledrejection', (e) => fatal(e.reason));

boot().catch(fatal);

// Expose for console poking.
window.__engine = engine;
window.__THREE = THREE;
