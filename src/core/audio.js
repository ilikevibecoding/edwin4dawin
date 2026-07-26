// Procedural WebAudio engine. Every sound is synthesized at runtime — the game
// ships zero recorded audio, so nothing can be missing or infringing.
// API: initAudio(), sfx(name, {pos, vol, rate, rateJitter}), setListenerPose(),
//      setAmbienceZone(zone), startMenuMusic() / stopMenuMusic(),
//      registerSound(), makeAudioBuffer(), loopSound(), __audioBufferStats().

import { getSetting, onSettingsApplied } from './settings.js';

let ctx = null;
let master, sfxBus, musicBus, ambBus;
let duck = null;                       // lowpass on sfx bus — hurt "muffle dip"
let revSend = null, revSmall = null, revLarge = null; // shared reverb send/returns
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
  // sfx chain: sfxBus -> duck (open lowpass, momentarily closed on hurt) -> master
  duck = ctx.createBiquadFilter();
  duck.type = 'lowpass';
  duck.frequency.value = 18000;
  duck.Q.value = 0.4;
  sfxBus = ctx.createGain(); sfxBus.connect(duck); duck.connect(master);
  musicBus = ctx.createGain(); musicBus.connect(master);
  ambBus = ctx.createGain(); ambBus.connect(master);
  // shared reverb: per-sfx sends feed one bus split into two generated IRs
  // (small dry office / large concrete shell); zone sets the return levels.
  revSend = ctx.createGain(); revSend.gain.value = 1;
  const convS = ctx.createConvolver(); convS.buffer = makeImpulse(0.8, 8.6);
  const convL = ctx.createConvolver(); convL.buffer = makeImpulse(1.6, 4.3);
  revSmall = ctx.createGain(); revSmall.gain.value = 0.08;
  revLarge = ctx.createGain(); revLarge.gain.value = 0;
  revSend.connect(convS); convS.connect(revSmall); revSmall.connect(sfxBus);
  revSend.connect(convL); convL.connect(revLarge); revLarge.connect(sfxBus);
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

// Stereo exp-decaying noise impulse response for the shared convolver.
function makeImpulse(seconds, decayK) {
  const sr = ctx.sampleRate;
  const buf = ctx.createBuffer(2, Math.max(1, Math.floor(seconds * sr)), sr);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let lp = 0;
    for (let i = 0; i < d.length; i++) {
      const t = i / sr;
      // darkening tail: one-pole lowpass over decaying noise
      lp += ((Math.random() * 2 - 1) - lp) * (0.5 - 0.3 * Math.min(1, t / seconds));
      d[i] = lp * Math.exp(-t * decayK);
    }
  }
  return buf;
}

// Each entry builds an AudioBuffer once, lazily. UI set lives here (quiet,
// glassy); the full game bank registers via registerSound() in sounds.js.
const RECIPES = {
  ui_click: () => makeBuffer(0.06, (d, sr) => {
    for (let i = 0; i < d.length; i++) {
      const t = i / sr;
      d[i] = Math.sin(2 * Math.PI * 1860 * t) * Math.exp(-t * 110) * 0.3
           + Math.sin(2 * Math.PI * 2760 * t) * Math.exp(-t * 150) * 0.16
           + (Math.random() * 2 - 1) * Math.exp(-t * 900) * 0.08;
    }
  }),
  ui_hover: () => makeBuffer(0.05, (d, sr) => {
    for (let i = 0; i < d.length; i++) {
      const t = i / sr;
      d[i] = Math.sin(2 * Math.PI * 1350 * t) * Math.exp(-t * 120) * 0.11
           + Math.sin(2 * Math.PI * 2025 * t) * Math.exp(-t * 160) * 0.05;
    }
  }),
  ui_confirm: () => makeBuffer(0.3, (d, sr) => {
    for (let i = 0; i < d.length; i++) {
      const t = i / sr;
      let v = (Math.sin(2 * Math.PI * 1046 * t) + Math.sin(2 * Math.PI * 1051 * t) * 0.6) * Math.exp(-t * 22) * 0.13;
      const t2 = t - 0.09;
      if (t2 > 0) v += (Math.sin(2 * Math.PI * 1568 * t2) + Math.sin(2 * Math.PI * 1574 * t2) * 0.6) * Math.exp(-t2 * 20) * 0.15;
      d[i] = v;
    }
  }),
  ui_back: () => makeBuffer(0.16, (d, sr) => {
    for (let i = 0; i < d.length; i++) {
      const t = i / sr;
      d[i] = Math.sin(2 * Math.PI * (1244 - 380 * t) * t) * Math.exp(-t * 34) * 0.16
           + Math.sin(2 * Math.PI * 933 * t) * Math.exp(-t * 30) * 0.07;
    }
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

// Short lowpass dip on the sfx bus — used for player_hurt weight.
function duckSfx() {
  if (!duck) return;
  const t = ctx.currentTime;
  try {
    duck.frequency.cancelScheduledValues(t);
    duck.frequency.setValueAtTime(Math.max(400, duck.frequency.value), t);
    duck.frequency.exponentialRampToValueAtTime(620, t + 0.025);
    duck.frequency.exponentialRampToValueAtTime(18000, t + 0.175);
  } catch { /* ctx closing */ }
}

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
  // global wet send (post-vol, pre-pan mono): zone sets return levels
  if (revSend) g.connect(revSend);
  g.gain.value = Math.min(1.5, v);
  src.connect(g);
  src.start();
  if (name === 'player_hurt') duckSfx();
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

// ---------------- zone ambience ----------------
// Every zone is a mix of shared looped "layers" (bed recipes registered in
// sounds.js). Zone changes ramp each layer gain to its new target over
// AMB_XFADE seconds — moving lobby -> exterior smoothly swells the storm
// instead of hard-swapping beds. Values are relative levels; AMB_LEVEL keeps
// the whole bed roughly -18 dB under gameplay sfx.
const AMB_XFADE = 2.0;
const AMB_LEVEL = 0.3;
const ZONE_MIX = {
  lobby:    { amb_air: 0.55, amb_hvac: 0.3, amb_storm: 0.24, amb_ticks: 0.3 },
  office:   { amb_hvac: 0.5, amb_hum: 0.5, amb_ticks: 0.5 },
  exec:     { amb_hvac: 0.42, amb_hum: 0.32, amb_ticks: 0.4 },
  archive:  { amb_hvac: 0.45, amb_hum: 0.2, amb_ticks: 0.6 },
  break:    { amb_hvac: 0.35, amb_hum: 0.28, amb_fridge: 0.7 },
  rr:       { amb_vent: 0.7, amb_hum: 0.22 },
  server:   { amb_server: 1.0, amb_hvac: 0.25 },
  stair:    { amb_air: 0.35, amb_rumble: 0.25 },
  corridor: { amb_hvac: 0.4, amb_hum: 0.3 },
  service:  { amb_rumble: 0.55, amb_drips: 0.5, amb_hum: 0.16 },
  basement: { amb_rumble: 0.7, amb_drips: 0.65 },
  loading:  { amb_rumble: 0.6, amb_drips: 0.45, amb_air: 0.25 },
  garage:   { amb_rumble: 0.6, amb_storm: 0.6, amb_air: 0.3 },
  exterior: { amb_storm: 1.4, amb_wind: 1.2, amb_snowhiss: 0.9 },
};
// Reverb character per zone: {s: small-room return, l: large-shell return}.
const ZONE_REVERB = {
  lobby:    { s: 0.09, l: 0.1 },
  office:   { s: 0.09, l: 0 },
  exec:     { s: 0.09, l: 0 },
  archive:  { s: 0.11, l: 0.04 },
  break:    { s: 0.1, l: 0 },
  rr:       { s: 0.16, l: 0 },
  server:   { s: 0.13, l: 0 },
  stair:    { s: 0.05, l: 0.22 },
  corridor: { s: 0.12, l: 0.04 },
  service:  { s: 0.1, l: 0.12 },
  basement: { s: 0.08, l: 0.18 },
  loading:  { s: 0.07, l: 0.2 },
  garage:   { s: 0.05, l: 0.26 },
  exterior: { s: 0, l: 0 },
};
const ambLayers = new Map(); // name -> {src, g}
let ambZone;
let ambKillTimer = null;

function rampGain(param, target, seconds) {
  const t = ctx.currentTime;
  param.cancelScheduledValues(t);
  param.setValueAtTime(param.value, t);
  param.linearRampToValueAtTime(target, t + seconds);
}

// Called by the game when the player's room zone changes; null on dispose.
export function setAmbienceZone(zone) {
  if (muted || !ctx || ctx.state === 'closed') return;
  if (zone === ambZone) return;
  ambZone = zone;
  if (ambKillTimer) { clearTimeout(ambKillTimer); ambKillTimer = null; }
  const mix = zone ? (ZONE_MIX[zone] || ZONE_MIX.corridor) : {};
  try {
    const names = new Set([...Object.keys(mix), ...ambLayers.keys()]);
    for (const name of names) {
      const target = (mix[name] || 0) * AMB_LEVEL;
      let layer = ambLayers.get(name);
      if (!layer) {
        if (target <= 0) continue;
        const buf = getBuffer(name);
        if (!buf) continue;
        const src = ctx.createBufferSource();
        src.buffer = buf; src.loop = true;
        const g = ctx.createGain();
        g.gain.value = 0;
        src.connect(g); g.connect(ambBus);
        // random loop offset so re-entering a zone never phase-repeats
        src.start(0, Math.random() * buf.duration);
        layer = { src, g };
        ambLayers.set(name, layer);
      }
      rampGain(layer.g.gain, target, AMB_XFADE);
    }
    // reverb sends follow the room
    const rv = zone ? (ZONE_REVERB[zone] || { s: 0.09, l: 0 }) : { s: 0, l: 0 };
    if (revSmall) rampGain(revSmall.gain, rv.s, AMB_XFADE);
    if (revLarge) rampGain(revLarge.gain, rv.l, AMB_XFADE);
    if (zone === null) {
      // dispose: stop everything once the fade has finished
      ambKillTimer = setTimeout(() => {
        ambKillTimer = null;
        for (const l of ambLayers.values()) { try { l.src.stop(); } catch { /* stopped */ } }
        ambLayers.clear();
      }, AMB_XFADE * 1000 + 200);
    }
  } catch { /* ctx tearing down */ }
}

// ---------------- menu music ----------------
// Generative cold pad (recipe 'music_title' in sounds.js) on the music bus.
let music = null;
export function startMenuMusic() {
  if (muted || !ctx || ctx.state === 'closed' || music) return;
  const buf = getBuffer('music_title');
  if (!buf) return;
  try {
    const src = ctx.createBufferSource();
    src.buffer = buf; src.loop = true;
    const g = ctx.createGain();
    g.gain.value = 0;
    g.gain.linearRampToValueAtTime(1, ctx.currentTime + 2.4);
    src.connect(g); g.connect(musicBus);
    src.start();
    music = { src, g };
  } catch { music = null; }
}
export function stopMenuMusic() {
  if (!music) return;
  const m = music;
  music = null;
  try {
    rampGain(m.g.gain, 0, 1.2);
    setTimeout(() => { try { m.src.stop(); } catch { /* stopped */ } }, 1400);
  } catch { try { m.src.stop(); } catch { /* stopped */ } }
}

// ---------------- offline validation ----------------
// Builds every registered buffer and reports peak/rms/duration/NaN count.
// Used by the QA probe (window.__probe) — cheap, and exercises every recipe.
export function __audioBufferStats() {
  if (muted || !ctx) return [];
  const out = [];
  for (const name of Object.keys(RECIPES)) {
    let buf = null;
    try { buf = getBuffer(name); } catch (e) { out.push({ name, error: String(e) }); continue; }
    if (!buf) { out.push({ name, error: 'no buffer' }); continue; }
    let peak = 0, sum = 0, nan = 0, count = 0;
    for (let ch = 0; ch < buf.numberOfChannels; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < d.length; i++) {
        const v = d[i];
        if (Number.isNaN(v)) { nan++; continue; }
        const a = Math.abs(v);
        if (a > peak) peak = a;
        sum += v * v; count++;
      }
    }
    out.push({
      name,
      seconds: Math.round(buf.duration * 100) / 100,
      peak: Math.round(peak * 1000) / 1000,
      rms: Math.round(Math.sqrt(sum / Math.max(1, count)) * 10000) / 10000,
      nan,
    });
  }
  return out;
}
