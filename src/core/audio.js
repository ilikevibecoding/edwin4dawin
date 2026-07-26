// Procedural WebAudio engine. Every sound is synthesized at runtime — the game
// ships zero recorded audio, so nothing can be missing or infringing.
// API: initAudio(), sfx(name, {pos, vol, rate}), setListenerPose(), startAmbience(zone)

import { getSetting, onSettingsApplied } from './settings.js';

let ctx = null;
let master, sfxBus, musicBus, ambBus;
let muted = false;
const buffers = new Map();
let listener = { x: 0, y: 0, z: 0, fx: 0, fz: -1 };

export function initAudio({ silent = false } = {}) {
  muted = silent;
  if (silent) return;
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
  } catch { ctx = null; return; }
  master = ctx.createGain();
  master.connect(ctx.destination);
  sfxBus = ctx.createGain(); sfxBus.connect(master);
  musicBus = ctx.createGain(); musicBus.connect(master);
  ambBus = ctx.createGain(); ambBus.connect(master);
  applyVolumes();
  onSettingsApplied((k) => { if (k.includes('Volume') || k === '*') applyVolumes(); });
  const resume = () => { if (ctx && ctx.state === 'suspended') ctx.resume(); };
  window.addEventListener('pointerdown', resume);
  window.addEventListener('keydown', resume);
}

function applyVolumes() {
  if (!ctx) return;
  master.gain.value = getSetting('masterVolume');
  sfxBus.gain.value = getSetting('sfxVolume');
  musicBus.gain.value = getSetting('musicVolume');
  ambBus.gain.value = getSetting('sfxVolume') * 0.8;
}

export function setListenerPose(x, y, z, fx, fz) {
  listener = { x, y, z, fx, fz };
}

// ---------------- synthesis helpers ----------------
function makeBuffer(seconds, fill) {
  const sr = ctx.sampleRate;
  const buf = ctx.createBuffer(1, Math.max(1, Math.floor(seconds * sr)), sr);
  const d = buf.getChannelData(0);
  fill(d, sr);
  return buf;
}
function noiseBuf(seconds) {
  return makeBuffer(seconds, (d) => { for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; });
}

// Each entry builds an AudioBuffer once, lazily.
const RECIPES = {
  ui_click: () => makeBuffer(0.07, (d, sr) => {
    for (let i = 0; i < d.length; i++) {
      const t = i / sr;
      d[i] = Math.sin(2 * Math.PI * 1400 * t) * Math.exp(-t * 70) * 0.5 + Math.sin(2 * Math.PI * 2200 * t) * Math.exp(-t * 90) * 0.25;
    }
  }),
  ui_hover: () => makeBuffer(0.05, (d, sr) => {
    for (let i = 0; i < d.length; i++) { const t = i / sr; d[i] = Math.sin(2 * Math.PI * 900 * t) * Math.exp(-t * 80) * 0.22; }
  }),
  ui_confirm: () => makeBuffer(0.24, (d, sr) => {
    for (let i = 0; i < d.length; i++) {
      const t = i / sr;
      d[i] = (Math.sin(2 * Math.PI * 880 * t) * Math.exp(-t * 16) + Math.sin(2 * Math.PI * 1320 * (t - 0.07)) * Math.exp(-Math.max(0, t - 0.07) * 18) * (t > 0.07 ? 1 : 0)) * 0.3;
    }
  }),
  ui_back: () => makeBuffer(0.14, (d, sr) => {
    for (let i = 0; i < d.length; i++) { const t = i / sr; d[i] = Math.sin(2 * Math.PI * (700 - 300 * t) * t) * Math.exp(-t * 26) * 0.3; }
  }),
};

function getBuffer(name) {
  if (!buffers.has(name)) {
    const recipe = RECIPES[name];
    if (!recipe) return null;
    buffers.set(name, recipe());
  }
  return buffers.get(name);
}

export function registerSound(name, builder) { RECIPES[name] = builder; }
export function audioCtx() { return ctx; }
export function makeAudioBuffer(seconds, fill) { return makeBuffer(seconds, fill); }
export function makeNoiseBuffer(seconds) { return noiseBuf(seconds); }

// Positional playback with distance attenuation + simple stereo pan.
export function sfx(name, { pos = null, vol = 1, rate = 1, rateJitter = 0 } = {}) {
  if (muted || !ctx || ctx.state === 'closed') return;
  const buf = getBuffer(name);
  if (!buf) { return; }
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.playbackRate.value = rate * (rateJitter ? 1 + (Math.random() * 2 - 1) * rateJitter : 1);
  const g = ctx.createGain();
  let out = g;
  let v = vol;
  if (pos) {
    const dx = pos.x - listener.x, dy = (pos.y ?? listener.y) - listener.y, dz = pos.z - listener.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    v *= 1 / (1 + dist * dist * 0.02);
    if (v < 0.004) return;
    // pan by angle between listener facing and source
    const pan = ctx.createStereoPanner();
    const rightX = -listener.fz, rightZ = listener.fx;
    const side = (dx * rightX + dz * rightZ) / (dist || 1);
    pan.pan.value = Math.max(-0.85, Math.min(0.85, side));
    g.connect(pan); pan.connect(sfxBus); out = null;
  }
  if (out) g.connect(sfxBus);
  g.gain.value = Math.min(1.5, v);
  src.connect(g);
  src.start();
  return src;
}

// Looping ambience (returns stop function)
export function loopSound(builderName, { vol = 0.2, fadeIn = 1 } = {}) {
  if (muted || !ctx) return () => {};
  const buf = getBuffer(builderName);
  if (!buf) return () => {};
  const src = ctx.createBufferSource();
  src.buffer = buf; src.loop = true;
  const g = ctx.createGain();
  g.gain.value = 0;
  g.gain.linearRampToValueAtTime(vol, ctx.currentTime + fadeIn);
  src.connect(g); g.connect(ambBus);
  src.start();
  return () => {
    try {
      g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6);
      setTimeout(() => { try { src.stop(); } catch { /* already stopped */ } }, 700);
    } catch { /* ctx closed */ }
  };
}

export function isAudioMuted() { return muted; }

// Zone ambience switching — expanded by the audio pass (Wave B).
// Called by the game when the player's room zone changes; null on dispose.
export function setAmbienceZone(zone) { /* implemented by audio pass */ }
