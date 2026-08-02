/*
 * Narration playback.
 *
 * The voice tracks are the one thing in this film that is not synthesized in
 * the browser: they are rendered ahead of time by tools/vo.mjs (Piper neural
 * TTS, then a per-character ffmpeg chain) into public/audio/vo/. This module
 * fetches them once, decodes them into whichever AudioContext is rendering, and
 * schedules them at absolute times so live playback and the offline render line
 * up sample for sample.
 */

export class Narration {
  constructor(baseUrl = 'audio/vo/') {
    this.baseUrl = baseUrl;
    this.manifest = null;
    this.raw = new Map();       // id -> ArrayBuffer
    this.buffers = new Map();   // id -> AudioBuffer (per decoded context)
    this._decodedFor = null;
  }

  async load(onProgress) {
    const res = await fetch(this.baseUrl + 'manifest.json');
    if (!res.ok) throw new Error('narration manifest missing — run `node tools/vo.mjs`');
    this.manifest = await res.json();
    const ids = Object.keys(this.manifest.lines);
    let done = 0;
    await Promise.all(ids.map(async (id) => {
      const r = await fetch(`${this.baseUrl}${id}.wav`);
      this.raw.set(id, await r.arrayBuffer());
      onProgress?.(++done / ids.length);
    }));
    return this;
  }

  async decode(ctx) {
    if (this._decodedFor === ctx) return this;
    this.buffers.clear();
    for (const [id, buf] of this.raw) {
      // decodeAudioData detaches its input, so hand it a copy.
      this.buffers.set(id, await ctx.decodeAudioData(buf.slice(0)));
    }
    this._decodedFor = ctx;
    return this;
  }

  info(id) { return this.manifest?.lines?.[id] || null; }
  duration(id) { return this.info(id)?.duration ?? 0; }

  /** Schedule a line on the vo bus at an absolute context time. */
  schedule(audio, id, when, opts = {}) {
    const buf = this.buffers.get(id);
    if (!buf) return 0;
    const src = audio.ctx.createBufferSource();
    src.buffer = buf;
    const g = audio.ctx.createGain();
    g.gain.value = opts.gain ?? 1;
    src.connect(g).connect(audio.vo || audio.master);
    src.start(Math.max(0, when));
    return buf.duration;
  }
}

/** Caption entries for the subtitle plate, derived from the film's cue sheet. */
export function captionsFromCues(cues, narration) {
  const out = [];
  for (const c of cues) {
    if (c.kind !== 'vo') continue;
    const info = narration.info(c.id);
    if (!info) continue;
    out.push({
      t0: c.t,
      t1: c.t + info.duration + 0.35,
      text: info.caption || info.text,
      speaker: info.speaker || '',
    });
  }
  return out.sort((a, b) => a.t0 - b.t0);
}
