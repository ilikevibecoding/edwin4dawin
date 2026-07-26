// ---------------------------------------------------------------------------
// Procedural music bed.  (owner: fable4)
//
// A low-key tension score with no samples and no fixed arrangement: a slow
// evolving two-voice drone in A minor under a lowpass that opens with
// `intensity`, a sparse pentatonic pluck that keeps the space alive when
// nothing is happening, and a pulse layer (sub thump + ticking eighth) that
// fades in as combat heats up. The AudioEngine feeds `intensity` from combat
// events and calls update() from its service timer; everything is scheduled
// a beat ahead so a throttled tab cannot glitch it.
// ---------------------------------------------------------------------------

import { noiseBuffer } from './synth.js';

const MIN = 0.0001;
const BEAT = 60 / 92; // 92 bpm pulse when tense

const PENTATONIC = [220, 261.63, 293.66, 329.63, 392]; // A C D E G

export class MusicBed {
  /**
   * @param {AudioContext} ctx
   * @param {AudioNode} dest  the music bus
   */
  constructor(ctx, dest) {
    this.ctx = ctx;
    this.dest = dest;
    this.running = false;
    this.intensity = 0;         // smoothed
    this.target = 0;            // set by the engine
    this.nextPluck = 0;
    this.nextPulse = 0;
    this.nodes = [];
    this.master = ctx.createGain();
    this.master.gain.value = MIN;
    this.master.connect(dest);
  }

  start() {
    if (this.running) return;
    this.running = true;
    const ctx = this.ctx;
    const t = ctx.currentTime;

    // --- drone: A1 + E2, detuned pairs through a shared lowpass
    this.droneFilter = ctx.createBiquadFilter();
    this.droneFilter.type = 'lowpass';
    this.droneFilter.frequency.value = 260;
    this.droneFilter.Q.value = 0.8;
    this.droneGain = ctx.createGain();
    this.droneGain.gain.value = 0.16;
    this.droneFilter.connect(this.droneGain);
    this.droneGain.connect(this.master);

    for (const [freq, det, g] of [[55, 0, 0.5], [55, 8, 0.3], [82.41, -6, 0.28], [110, 4, 0.12]]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = freq;
      o.detune.value = det;
      const og = ctx.createGain();
      og.gain.value = g;
      o.connect(og);
      og.connect(this.droneFilter);
      o.start(t);
      this.nodes.push(o, og);
    }
    // Very slow breathing on the filter so the drone never sits still.
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.043;
    const lfoG = ctx.createGain();
    lfoG.gain.value = 90;
    lfo.connect(lfoG);
    lfoG.connect(this.droneFilter.frequency);
    lfo.start(t);
    this.nodes.push(lfo, lfoG);

    // fade the whole bed in
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setValueAtTime(MIN, t);
    this.master.gain.exponentialRampToValueAtTime(1, t + 3);

    this.nextPluck = t + 2;
    this.nextPulse = t + 1;
  }

  stop(fade = 1.5) {
    if (!this.running) return;
    this.running = false;
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setValueAtTime(Math.max(this.master.gain.value, MIN), t);
    this.master.gain.exponentialRampToValueAtTime(MIN, t + fade);
    const nodes = this.nodes;
    this.nodes = [];
    for (const n of nodes) {
      try { n.stop?.(t + fade + 0.1); } catch { /* not a source */ }
      // Gains disconnect once their sources end; sweep in one pass later.
      setTimeout(() => { try { n.disconnect(); } catch { /* detached */ } }, (fade + 0.3) * 1000);
    }
    this.droneFilter = null;
  }

  /** 0 = sneaking about, 1 = full contact. */
  setTarget(v) {
    this.target = Math.max(0, Math.min(1, v));
  }

  /** Called every ~120 ms by the engine while the context runs. */
  update(now) {
    if (!this.running) return;
    // Rise fast when combat starts, relax slowly when it ends.
    const rate = this.target > this.intensity ? 0.35 : 0.045;
    this.intensity += (this.target - this.intensity) * rate;

    // drone opens up and leans louder as things heat up
    if (this.droneFilter) {
      this.droneFilter.frequency.setTargetAtTime(260 + this.intensity * 1100, now, 0.4);
      this.droneGain.gain.setTargetAtTime(0.16 + this.intensity * 0.1, now, 0.4);
    }

    // sparse pluck - slower and darker when calm
    if (now >= this.nextPluck) {
      const interval = 3.6 - this.intensity * 2.1;
      this.nextPluck = now + interval * (0.75 + Math.random() * 0.5);
      if (Math.random() < 0.85) this._pluck(now + 0.08);
    }

    // pulse layer only exists under tension
    if (now >= this.nextPulse) {
      this.nextPulse = now + BEAT;
      if (this.intensity > 0.45) this._pulse(now + 0.05, this.intensity);
    }
  }

  _pluck(t) {
    const ctx = this.ctx;
    const note = PENTATONIC[Math.floor(Math.random() * PENTATONIC.length)] * (Math.random() < 0.3 ? 0.5 : 1);
    const dur = 1.4;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = note * 2;
    f.Q.value = 9;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.16 + this.intensity * 0.06, t);
    g.gain.exponentialRampToValueAtTime(MIN, t + dur);
    // noise excitation into a resonant band reads as a plucked string
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(ctx, 'white');
    src.loop = true;
    src.connect(f);
    f.connect(g);
    g.connect(this.master);
    src.start(t);
    src.stop(t + dur + 0.05);
    src.onended = () => { try { g.disconnect(); f.disconnect(); } catch { /* detached */ } };
  }

  _pulse(t, intensity) {
    const ctx = this.ctx;
    // sub thump
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(70, t);
    o.frequency.exponentialRampToValueAtTime(38, t + 0.12);
    const g = ctx.createGain();
    const peak = 0.12 * (intensity - 0.3);
    g.gain.setValueAtTime(MIN, t);
    g.gain.exponentialRampToValueAtTime(Math.max(peak, MIN), t + 0.008);
    g.gain.exponentialRampToValueAtTime(MIN, t + 0.3);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    o.stop(t + 0.35);
    o.onended = () => { try { g.disconnect(); } catch { /* detached */ } };
    // ticking eighth on the offbeat at high tension
    if (intensity > 0.7) {
      const f = ctx.createBiquadFilter();
      f.type = 'highpass';
      f.frequency.value = 5000;
      const tg = ctx.createGain();
      tg.gain.setValueAtTime(0.05, t + BEAT / 2);
      tg.gain.exponentialRampToValueAtTime(MIN, t + BEAT / 2 + 0.05);
      const src = ctx.createBufferSource();
      src.buffer = noiseBuffer(ctx, 'white');
      src.connect(f);
      f.connect(tg);
      tg.connect(this.master);
      src.start(t + BEAT / 2);
      src.stop(t + BEAT / 2 + 0.08);
      src.onended = () => { try { tg.disconnect(); f.disconnect(); } catch { /* detached */ } };
    }
  }

  dispose() {
    this.stop(0.1);
    setTimeout(() => { try { this.master.disconnect(); } catch { /* detached */ } }, 500);
  }
}
