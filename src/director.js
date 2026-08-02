/**
 * The director.
 *
 * Owns the master clock, builds every scene, cuts between them, drives
 * subtitles and chapter cards, and schedules the entire soundtrack (score,
 * effects and narration) on either a realtime or an offline AudioContext.
 *
 * Two clock modes:
 *   live   - time comes from the AudioContext, so picture never drifts from sound
 *   render - time is set externally, one exact frame at a time, for the film render
 */
import * as THREE from 'three';
import { timeline, voiceLines, DURATION } from './story.js';
import { texturesReady } from './lego/svgtex.js';
import { SCENE_MODULES } from './scenes/index.js';

/**
 * The audio modules are loaded lazily so the picture side of the film still
 * renders if the soundtrack fails to load for any reason.
 */
let AUDIO = null;
export async function loadAudioModules() {
  if (AUDIO) return AUDIO;
  try {
    const base = new URL('./audio/', import.meta.url).href;
    const [engine, score, sfx] = await Promise.all([
      import(/* @vite-ignore */ base + 'engine.js'),
      import(/* @vite-ignore */ base + 'score.js'),
      import(/* @vite-ignore */ base + 'sfx.js'),
    ]);
    AUDIO = { createBus: engine.createBus, scheduleScore: score.scheduleScore, scheduleCues: sfx.scheduleCues };
  } catch (e) {
    console.warn('soundtrack modules unavailable:', e.message);
    AUDIO = { createBus: null };
  }
  return AUDIO;
}

const FADE = 0.55;

export class Director {
  constructor(stage, opts = {}) {
    this.stage = stage;
    this.opts = opts;
    this.mode = opts.mode || 'live';
    this.T = 0;
    this.playing = false;
    this.duration = DURATION;
    this.tl = timeline();
    this.lines = voiceLines();
    this.scenes = new Map();
    this.active = null;
    this.voiceBuffers = new Map();
    this.audio = null;
    this.cues = [];
    this.onTime = null;
  }

  /** Build every scene up front: the render must never hitch mid-take. */
  async build() {
    const ctx = {
      quality: this.opts.quality || 'high',
      renderer: this.stage.renderer,
      duration: this.duration,
    };
    for (const s of this.tl.scenes) {
      const mod = SCENE_MODULES[s.id];
      if (!mod) { console.warn('no scene module for', s.id); continue; }
      const built = await mod.build({ ...ctx, dur: s.dur, id: s.id, start: s.start });
      built.scene.userData.id = s.id;
      this.scenes.set(s.id, { ...s, ...built });
      for (const c of built.cues || []) {
        this.cues.push({ ...c, t: s.start + c.t });
      }
    }
    this.cues.sort((a, b) => a.t - b.t);
    await texturesReady();
    // warm every shader so the first frame of each scene isn't a stall
    for (const s of this.scenes.values()) {
      this.stage.renderer.compile(s.scene, this.stage.camera);
    }
    return this;
  }

  sceneAt(T) {
    for (const s of this.scenes.values()) if (T >= s.start && T < s.end) return s;
    return this.scenes.get(this.tl.scenes[this.tl.scenes.length - 1].id);
  }

  /** Fade-to-black amount at the seams between scenes. */
  fadeAt(T) {
    const s = this.sceneAt(T);
    if (!s) return 1;
    if (T < 0.9) return 1 - T / 0.9;
    if (T > this.duration - 2.2) return Math.min(1, (T - (this.duration - 2.2)) / 2.0);
    const inT = T - s.start;
    const outT = s.end - T;
    const fi = s.fadeIn ?? FADE;
    const fo = s.fadeOut ?? FADE;
    if (inT < fi) return 1 - inT / fi;
    if (outT < fo) return 1 - outT / fo;
    return 0;
  }

  /** Advance the world to absolute time T and draw one frame. */
  frame(T) {
    this.T = Math.max(0, Math.min(T, this.duration));
    const s = this.sceneAt(this.T);
    if (!s) return;
    if (this.active !== s) {
      this.active = s;
      this.stage.camera.fov = 42;
      this.stage.camera.updateProjectionMatrix();
    }
    const local = this.T - s.start;
    s.update(local, { camera: this.stage.camera, T: this.T, stage: this.stage });
    this.stage.film.uniforms.uFade.value = this.fadeAt(this.T);
    this.stage.render(s.scene, this.T);
    this.updateOverlays(this.T, s);
    if (this.onTime) this.onTime(this.T);
  }

  updateOverlays(T, s) {
    const subs = document.getElementById('subs');
    const chap = document.getElementById('chapter');
    if (subs) {
      let text = '';
      for (const l of this.lines) {
        const d = this.voiceBuffers.get(l.id)?.duration || l.text.length / 14;
        if (T >= l.t - 0.12 && T < l.t + d + 0.35) { text = l.text; break; }
      }
      if (text !== this._subText) {
        this._subText = text;
        subs.textContent = text;
        subs.classList.toggle('on', !!text);
      }
    }
    if (chap) {
      const inT = T - s.start;
      const show = s.id !== 'crawl' && inT > 0.7 && inT < 5.0;
      if (show !== this._chapShow) {
        this._chapShow = show;
        chap.textContent = s.chapter || '';
        chap.classList.toggle('on', show);
      }
    }
  }

  /* ---------------- audio ---------------- */

  async loadVoices() {
    const res = await fetch(new URL('vo/manifest.json', document.baseURI));
    const man = await res.json();
    this.voiceManifest = man;
    const ac = new (window.AudioContext || window.webkitAudioContext)();
    await Promise.all(
      man.lines.map(async (l) => {
        const r = await fetch(new URL(l.file, document.baseURI));
        const ab = await r.arrayBuffer();
        const buf = await ac.decodeAudioData(ab);
        this.voiceBuffers.set(l.id, buf);
      })
    );
    await ac.close();
  }

  /**
   * Schedule the full soundtrack on any BaseAudioContext.
   * Identical code path for live playback and the offline film render, so the
   * mix you hear in the browser is the mix that lands in the MP4.
   */
  scheduleAll(actx, t0, from = 0) {
    if (!AUDIO || !AUDIO.createBus) {
      const g = actx.createGain();
      g.connect(actx.destination);
      return { voice: g, master: g };
    }
    const { createBus, scheduleScore, scheduleCues } = AUDIO;
    const bus = createBus(actx, {});
    const sections = this.tl.scenes
      .filter((s) => s.end > from)
      .map((s) => ({ id: s.music, start: t0 + Math.max(s.start, from) - from, dur: s.end - Math.max(s.start, from), from: Math.max(0, from - s.start) }));
    scheduleScore(actx, bus, sections, { seed: 1337 });
    scheduleCues(actx, bus, this.cues.filter((c) => c.t >= from).map((c) => ({ ...c, t: t0 + c.t - from })));
    for (const l of this.lines) {
      const buf = this.voiceBuffers.get(l.id);
      if (!buf || l.t < from) continue;
      const src = actx.createBufferSource();
      src.buffer = buf;
      const g = actx.createGain();
      g.gain.value = l.gain ?? 1;
      src.connect(g).connect(bus.voice);
      src.start(t0 + l.t - from);
      bus.duckVoice?.(t0 + l.t - from, buf.duration);
    }
    return bus;
  }

  async play(from = 0) {
    if (this.mode === 'render') return;
    await loadAudioModules();
    this.stopAudio();
    const actx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'playback' });
    await actx.resume();
    const t0 = actx.currentTime + 0.25;
    const bus = this.scheduleAll(actx, t0, from);
    this.audio = { actx, bus, t0, from };
    this.playing = true;
  }

  stopAudio() {
    if (this.audio) {
      try { this.audio.actx.close(); } catch { /* already closed */ }
      this.audio = null;
    }
    this.playing = false;
  }

  /** Live clock: derived from the audio hardware clock. */
  liveTime() {
    if (!this.audio) return this.T;
    return this.audio.from + (this.audio.actx.currentTime - this.audio.t0);
  }

  /** Render the complete soundtrack in one offline pass. Returns a WAV Uint8Array. */
  async renderSoundtrack(sampleRate = 48000) {
    await loadAudioModules();
    const len = Math.ceil((this.duration + 3) * sampleRate);
    const octx = new OfflineAudioContext(2, len, sampleRate);
    this.scheduleAll(octx, 0.05, 0);
    const buf = await octx.startRendering();
    return encodeWav(buf);
  }
}

/** 16-bit PCM WAV encoder. */
export function encodeWav(buffer) {
  const ch = buffer.numberOfChannels;
  const len = buffer.length;
  const data = new DataView(new ArrayBuffer(44 + len * ch * 2));
  const w = (o, s) => { for (let i = 0; i < s.length; i++) data.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); data.setUint32(4, 36 + len * ch * 2, true); w(8, 'WAVE');
  w(12, 'fmt '); data.setUint32(16, 16, true); data.setUint16(20, 1, true);
  data.setUint16(22, ch, true); data.setUint32(24, buffer.sampleRate, true);
  data.setUint32(28, buffer.sampleRate * ch * 2, true); data.setUint16(32, ch * 2, true);
  data.setUint16(34, 16, true); w(36, 'data'); data.setUint32(40, len * ch * 2, true);
  const chans = [];
  for (let c = 0; c < ch; c++) chans.push(buffer.getChannelData(c));
  let o = 44;
  for (let i = 0; i < len; i++) {
    for (let c = 0; c < ch; c++) {
      const v = Math.max(-1, Math.min(1, chans[c][i]));
      data.setInt16(o, v < 0 ? v * 0x8000 : v * 0x7fff, true);
      o += 2;
    }
  }
  return new Uint8Array(data.buffer);
}
