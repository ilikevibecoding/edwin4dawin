// Audio director. Takes the film's cue sheet -- music, effects and voice, all
// tagged with absolute timeline times -- and schedules it into either a live
// AudioContext or an OfflineAudioContext for the video render.

import { makeReverb } from './synth.js';
import { scheduleCue, cueLength } from './score.js';
import { SFX } from './sfx.js';
import { voUrl } from '../data/vo-manifest.js';

export class AudioDirector {
  constructor({ cues = [], musicGain = 0.62, sfxGain = 0.8, voiceGain = 1.0 } = {}) {
    this.cues = [...cues].sort((a, b) => a.t - b.t);
    this.levels = { music: musicGain, sfx: sfxGain, voice: voiceGain };
    this.voBuffers = new Map();
    this.ctx = null;
    this.nodes = null;
    this.startedAt = 0;
    this.startedFrom = 0;
    this.playing = false;
  }

  voIds() {
    return [...new Set(this.cues.filter((c) => c.kind === 'vo').map((c) => c.id))];
  }

  /** Fetches and decodes every voice line. Safe to call more than once. */
  async loadVoices(ctx) {
    const ids = this.voIds();
    await Promise.all(ids.map(async (id) => {
      if (this.voBuffers.has(id)) return;
      try {
        const res = await fetch(voUrl(id));
        if (!res.ok) throw new Error(`${res.status}`);
        const data = await res.arrayBuffer();
        const buf = await ctx.decodeAudioData(data);
        this.voBuffers.set(id, buf);
      } catch (e) {
        console.warn(`voice line ${id} unavailable:`, e.message);
      }
    }));
    return this.voBuffers.size;
  }

  buildGraph(ctx) {
    const master = ctx.createGain();
    master.gain.value = 0.9;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.knee.value = 22;
    comp.ratio.value = 3.2;
    comp.attack.value = 0.006;
    comp.release.value = 0.22;
    master.connect(comp).connect(ctx.destination);

    const { conv, wetGain } = makeReverb(ctx, { seconds: 3.2, decay: 2.4, wet: 1 });
    const reverbReturn = ctx.createGain();
    reverbReturn.gain.value = 0.5;
    wetGain.connect(reverbReturn).connect(master);

    const mk = (v) => { const g = ctx.createGain(); g.gain.value = v; g.connect(master); return g; };
    const music = mk(this.levels.music);
    const sfx = mk(this.levels.sfx);
    const voice = mk(this.levels.voice);
    // Voice gets a small send so it sits in the same space as the picture.
    const voiceSend = ctx.createGain();
    voiceSend.gain.value = 0.1;
    voice.connect(voiceSend).connect(conv);

    // Music ducks under dialogue so the narrator is always intelligible.
    const musicDuck = ctx.createGain();
    musicDuck.gain.value = 1;
    music.disconnect();
    music.connect(musicDuck).connect(master);

    this.nodes = { master, music, musicDuck, sfx, voice, conv, bus: { dry: music, wet: conv } };
    return this.nodes;
  }

  /**
   * Schedules every cue at or after `from`.
   * @param {BaseAudioContext} ctx
   * @param {number} originTime ctx time that corresponds to timeline t = `from`
   */
  schedule(ctx, originTime, from = 0, until = Infinity) {
    const n = this.nodes;
    const duckEvents = [];
    for (const cue of this.cues) {
      const end = cue.t + (cue.dur || 0);
      if (end < from || cue.t > until) continue;
      const when = originTime + (cue.t - from);
      if (cue.kind === 'music') {
        scheduleCue(ctx, { dry: n.music, wet: n.conv }, cue.id, when, {
          gain: cue.gain ?? 1,
          skipBefore: originTime,
          fadeOut: cue.fadeOut,
        });
      } else if (cue.kind === 'sfx') {
        const fn = SFX[cue.id];
        if (!fn) { console.warn('unknown sfx', cue.id); continue; }
        const target = cue.reverb === false ? n.sfx : n.sfx;
        if (when >= originTime - 0.05) fn(ctx, target, { when: Math.max(when, originTime), ...(cue.opts || {}) });
        if (cue.send) {
          // A copy through the hall for big exterior bangs.
          const s = ctx.createGain();
          s.gain.value = cue.send;
          s.connect(n.conv);
          fn(ctx, s, { when: Math.max(when, originTime), ...(cue.opts || {}) });
        }
      } else if (cue.kind === 'vo') {
        const buf = this.voBuffers.get(cue.id);
        if (!buf) continue;
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const g = ctx.createGain();
        g.gain.value = cue.gain ?? 1;
        src.connect(g).connect(n.voice);
        const offset = Math.max(0, originTime - when);
        if (offset < buf.duration) src.start(Math.max(when, originTime), offset);
        duckEvents.push([when, when + buf.duration]);
      }
    }
    // Build the ducking automation from the voice cues.
    const duck = n.musicDuck.gain;
    duck.setValueAtTime(1, originTime);
    for (const [a, b] of duckEvents.sort((x, y) => x[0] - y[0])) {
      const s = Math.max(originTime, a - 0.35);
      duck.setValueAtTime(duck.value, s);
      duck.linearRampToValueAtTime(0.42, Math.max(s + 0.05, a));
      duck.setValueAtTime(0.42, b);
      duck.linearRampToValueAtTime(1, b + 0.6);
    }
  }

  async playFrom(t) {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 48000 });
      await this.loadVoices(this.ctx);
    }
    if (this.ctx.state === 'suspended') await this.ctx.resume();
    this.stop();
    this.buildGraph(this.ctx);
    const origin = this.ctx.currentTime + 0.12;
    this.schedule(this.ctx, origin, t);
    this.startedAt = origin;
    this.startedFrom = t;
    this.playing = true;
  }

  stop() {
    if (this.nodes) {
      try { this.nodes.master.disconnect(); } catch (e) { /* already gone */ }
    }
    this.playing = false;
  }

  setMuted(m) {
    if (this.nodes) this.nodes.master.gain.value = m ? 0 : 0.9;
  }

  /** Renders the whole soundtrack offline and returns an AudioBuffer. */
  async renderOffline(duration, sampleRate = 48000) {
    const ctx = new OfflineAudioContext(2, Math.ceil(duration * sampleRate), sampleRate);
    await this.loadVoices(ctx);
    this.buildGraph(ctx);
    this.schedule(ctx, 0, 0, duration);
    return ctx.startRendering();
  }
}

/** Interleaved 16-bit PCM WAV encoder (used to hand audio to ffmpeg). */
export function encodeWav(buffer) {
  const chans = buffer.numberOfChannels;
  const frames = buffer.length;
  const bytes = frames * chans * 2;
  const out = new ArrayBuffer(44 + bytes);
  const view = new DataView(out);
  const str = (off, s) => { for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i)); };
  str(0, 'RIFF');
  view.setUint32(4, 36 + bytes, true);
  str(8, 'WAVE');
  str(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, chans, true);
  view.setUint32(24, buffer.sampleRate, true);
  view.setUint32(28, buffer.sampleRate * chans * 2, true);
  view.setUint16(32, chans * 2, true);
  view.setUint16(34, 16, true);
  str(36, 'data');
  view.setUint32(40, bytes, true);
  const data = [];
  for (let c = 0; c < chans; c++) data.push(buffer.getChannelData(c));
  let off = 44;
  for (let i = 0; i < frames; i++) {
    for (let c = 0; c < chans; c++) {
      let s = Math.max(-1, Math.min(1, data[c][i]));
      view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      off += 2;
    }
  }
  return out;
}

export { cueLength };
