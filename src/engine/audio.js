/**
 * Web Audio playback for interactive viewing.
 *
 * The offline renderer does not use this at all: it builds the soundtrack with
 * ffmpeg from the exact same cue list, so the exported film and the live page
 * stay in sync by construction.
 */
export class FilmAudio {
  constructor() {
    this.ctx = null;
    this.buffers = new Map();
    this.cues = [];
    this.playing = false;
    this.active = [];
    this.baseTime = 0; // film time at ctx.currentTime === startedAt
    this.startedAt = 0;
    this.master = null;
    this.muted = false;
  }

  async init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 1;
    this.master.connect(this.ctx.destination);
  }

  /**
   * @param {Array<{t:number,url:string,gain:number,rate:number,kind:string}>} cues
   */
  async load(cues, onProgress) {
    await this.init();
    this.cues = cues.slice().sort((a, b) => a.t - b.t);
    const urls = [...new Set(cues.map((c) => c.url))];
    let done = 0;
    await Promise.all(
      urls.map(async (u) => {
        try {
          const res = await fetch(u);
          if (!res.ok) throw new Error(res.status);
          const buf = await res.arrayBuffer();
          this.buffers.set(u, await this.ctx.decodeAudioData(buf));
        } catch (e) {
          console.warn('audio load failed', u, e.message);
        }
        onProgress?.(++done / urls.length);
      })
    );
  }

  /** Narration windows, used to duck the music. Set by the caller. */
  setVoiceWindows(windows) {
    this.voiceWindows = windows.slice().sort((a, b) => a.t - b.t);
  }

  /**
   * Ramp a music cue's gain down while narration plays.
   * `t` is the film time playback started from; `cue.t` is the cue's film time.
   */
  scheduleDuck(gainNode, base, cue, t, dur) {
    if (!this.voiceWindows?.length) return;
    const DUCK = 0.52;
    const LEAD = 0.12;
    const TAIL = 0.55;
    const cueStart = Math.max(cue.t, t);
    const cueEnd = cue.t + dur;
    const clock = (filmTime) => this.startedAt + Math.max(0, filmTime - t);
    for (const w of this.voiceWindows) {
      const a = w.t - LEAD;
      const b = w.t + w.dur + TAIL;
      if (b < cueStart || a > cueEnd) continue;
      const down = clock(Math.max(a, cueStart));
      const bottom = down + 0.18;
      const up = clock(Math.min(b, cueEnd));
      try {
        gainNode.gain.setValueAtTime(base, down);
        gainNode.gain.linearRampToValueAtTime(base * (1 - DUCK), bottom);
        gainNode.gain.setValueAtTime(base * (1 - DUCK), up);
        gainNode.gain.linearRampToValueAtTime(base, up + 0.9);
      } catch {}
    }
  }

  stopAll() {
    for (const s of this.active) {
      try {
        s.stop();
      } catch {}
    }
    this.active = [];
  }

  /** Start playback from film time `t`. */
  play(t) {
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    this.stopAll();
    this.playing = true;
    this.baseTime = t;
    this.startedAt = this.ctx.currentTime + 0.06;
    for (const cue of this.cues) {
      const buf = this.buffers.get(cue.url);
      if (!buf) continue;
      const rate = cue.rate ?? 1;
      const dur = buf.duration / rate;
      const end = cue.t + dur;
      if (end <= t) continue;
      const offset = Math.max(0, t - cue.t) * rate;
      const when = this.startedAt + Math.max(0, cue.t - t);
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      src.playbackRate.value = rate;
      const g = this.ctx.createGain();
      const base = (cue.gain ?? 1) * (this.muted ? 0 : 1);
      g.gain.value = base;
      // Duck the score under narration, matching what tools/mixaudio.mjs does
      // offline so the page and the exported film sound the same.
      if (cue.kind === 'music') this.scheduleDuck(g, base, cue, t, dur);
      src.connect(g).connect(this.master);
      try {
        src.start(when, offset);
      } catch {}
      this.active.push(src);
    }
  }

  pause() {
    this.playing = false;
    this.stopAll();
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 1;
  }

  /** Film time implied by the audio clock (used to keep video locked to sound). */
  currentTime() {
    if (!this.playing || !this.ctx) return null;
    return this.baseTime + (this.ctx.currentTime - this.startedAt);
  }
}
