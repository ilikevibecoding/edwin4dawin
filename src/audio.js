// Fully procedural audio. No sample files: every cue is synthesised from
// oscillators and noise buffers, so the build stays asset-free.
//
// Distant events are delayed by the speed of sound, which makes high-altitude
// intercepts read correctly - the flash arrives first, the rumble follows.

const SPEED_OF_SOUND = 340;

export class Audio {
  constructor() {
    this.ctx = null;
    this.ready = false;
    this.muted = false;
    this.masterVolume = 0.7;
    this.alarmOn = false;
    this.listener = { x: 0, y: 0, z: 0 };
  }

  /** Must be called from a user gesture. */
  init() {
    if (this.ctx) return this.ready;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try {
      this.ctx = new AC();
    } catch (e) {
      return false;
    }
    const ctx = this.ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : this.masterVolume;
    this.master.connect(ctx.destination);

    // gentle bus compression keeps launches from clipping the mix
    this.comp = ctx.createDynamicsCompressor();
    this.comp.threshold.value = -18;
    this.comp.knee.value = 12;
    this.comp.ratio.value = 6;
    this.comp.attack.value = 0.006;
    this.comp.release.value = 0.25;
    this.comp.connect(this.master);

    // shared reverb-ish tail: a short feedback delay network
    this.tailIn = ctx.createGain();
    this.tailIn.gain.value = 0.5;
    const delay = ctx.createDelay(1.0);
    delay.delayTime.value = 0.19;
    const fb = ctx.createGain();
    fb.gain.value = 0.55;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1400;
    this.tailIn.connect(delay);
    delay.connect(lp);
    lp.connect(fb);
    fb.connect(delay);
    lp.connect(this.comp);

    this.noise = this._makeNoise(3.0);
    this.ready = true;
    this._startAmbient();
    return true;
  }

  _makeNoise(seconds) {
    const ctx = this.ctx;
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      // mildly pink-ish noise reads warmer than pure white
      last = 0.98 * last + 0.02 * w;
      d[i] = w * 0.7 + last * 3.2;
    }
    return buf;
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : this.masterVolume;
  }

  setVolume(v) {
    this.masterVolume = v;
    if (this.master && !this.muted) this.master.gain.value = v;
  }

  setListener(pos) {
    this.listener.x = pos.x;
    this.listener.y = pos.y;
    this.listener.z = pos.z;
  }

  _dist(pos) {
    if (!pos) return 0;
    return Math.hypot(pos.x - this.listener.x, pos.y - this.listener.y, pos.z - this.listener.z);
  }

  /** Attenuation + air absorption for a point source. */
  _spatial(pos, refDist = 40) {
    const d = this._dist(pos);
    const gain = Math.min(1, refDist / Math.max(refDist, d) * 1.0) * Math.pow(refDist / (refDist + d * 0.55), 0.85);
    const cutoff = Math.max(240, 16000 * Math.pow(1 / (1 + d / 900), 1.4));
    const delay = d / SPEED_OF_SOUND;
    return { gain, cutoff, delay, dist: d };
  }

  _noiseSource(t0, dur, { cutoff = 4000, q = 0.6, type = 'lowpass', gain = 1, attack = 0.005, decay = 0.4, out = null }) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    src.playbackRate.value = 0.8 + Math.random() * 0.4;
    const filt = ctx.createBiquadFilter();
    filt.type = type;
    filt.frequency.value = cutoff;
    filt.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filt);
    filt.connect(g);
    g.connect(out || this.comp);
    src.start(t0);
    src.stop(t0 + dur + 0.05);
    return { src, filt, g };
  }

  _tone(t0, freq, dur, { type = 'sine', gain = 0.2, attack = 0.004, sweepTo = null, out = null }) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (sweepTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, sweepTo), t0 + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(out || this.comp);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
    return { osc, g };
  }

  // ---- ambience ----------------------------------------------------------

  _startAmbient() {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 380;
    bp.Q.value = 0.5;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 160;
    lfo.connect(lfoGain);
    lfoGain.connect(bp.frequency);
    const g = ctx.createGain();
    g.gain.value = 0.05;
    src.connect(bp);
    bp.connect(g);
    g.connect(this.master);
    src.start();
    lfo.start();
    this.windGain = g;

    // low generator hum from the site's power units
    const hum = ctx.createOscillator();
    hum.type = 'sawtooth';
    hum.frequency.value = 51;
    const humFilt = ctx.createBiquadFilter();
    humFilt.type = 'lowpass';
    humFilt.frequency.value = 180;
    const humGain = ctx.createGain();
    humGain.gain.value = 0.018;
    hum.connect(humFilt);
    humFilt.connect(humGain);
    humGain.connect(this.master);
    hum.start();
    this.humGain = humGain;
  }

  setAmbience(indoor) {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    this.windGain.gain.setTargetAtTime(indoor ? 0.012 : 0.05, t, 0.4);
    this.humGain.gain.setTargetAtTime(indoor ? 0.05 : 0.016, t, 0.4);
  }

  // ---- cues --------------------------------------------------------------

  footstep(intensity = 1) {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    this._noiseSource(t, 0.13, {
      cutoff: 900 + Math.random() * 500, type: 'lowpass', gain: 0.1 * intensity, attack: 0.002, decay: 0.1,
    });
    this._tone(t, 90 + Math.random() * 30, 0.08, { type: 'sine', gain: 0.05 * intensity, sweepTo: 55 });
  }

  click(freq = 1400) {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    this._tone(t, freq, 0.05, { type: 'square', gain: 0.06 });
  }

  beep(freq = 880, dur = 0.09, gain = 0.07) {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    this._tone(t, freq, dur, { type: 'square', gain });
  }

  /** Rising confirmation chirp used for assign / authorize. */
  confirm() {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    this._tone(t, 620, 0.09, { type: 'triangle', gain: 0.08 });
    this._tone(t + 0.08, 930, 0.12, { type: 'triangle', gain: 0.08 });
  }

  deny() {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    this._tone(t, 220, 0.16, { type: 'square', gain: 0.07, sweepTo: 140 });
  }

  radarPing() {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    this._tone(t, 1650, 0.16, { type: 'sine', gain: 0.05, out: this.tailIn });
  }

  /** Launch: ignition crack, sustained roar, long rumble tail. */
  launch(pos, scale = 1) {
    if (!this.ready) return;
    const sp = this._spatial(pos, 60);
    const t = this.ctx.currentTime + sp.delay;
    const g = sp.gain;
    // ignition transient
    this._noiseSource(t, 0.5, {
      cutoff: Math.min(sp.cutoff, 5200), type: 'lowpass', gain: 0.5 * g * scale, attack: 0.004, out: this.tailIn,
    });
    // sustained motor roar
    this._noiseSource(t + 0.02, 2.4 + scale * 1.4, {
      cutoff: Math.min(sp.cutoff, 1400), type: 'lowpass', gain: 0.42 * g * scale, attack: 0.12,
    });
    // body-shaking low end
    this._tone(t, 74 * (1 / Math.sqrt(scale)), 1.9 + scale, {
      type: 'sine', gain: 0.34 * g * scale, sweepTo: 34, out: this.tailIn,
    });
    this._tone(t + 0.01, 112, 0.7, { type: 'triangle', gain: 0.14 * g * scale, sweepTo: 60 });
  }

  /** Explosion / intercept: sharp crack then a rolling boom. */
  explosion(pos, scale = 1) {
    if (!this.ready) return;
    const sp = this._spatial(pos, 120);
    const t = this.ctx.currentTime + sp.delay;
    const g = sp.gain;
    this._noiseSource(t, 0.35, {
      cutoff: Math.min(sp.cutoff, 7000), type: 'lowpass', gain: 0.55 * g * scale, attack: 0.002, out: this.tailIn,
    });
    this._noiseSource(t + 0.03, 2.2 + scale, {
      cutoff: Math.min(sp.cutoff, 700), type: 'lowpass', gain: 0.4 * g * scale, attack: 0.05, out: this.tailIn,
    });
    this._tone(t, 62, 1.6 + scale * 0.6, { type: 'sine', gain: 0.4 * g * scale, sweepTo: 28, out: this.tailIn });
  }

  /** Sonic rumble of a body passing overhead. */
  whoosh(pos, scale = 1) {
    if (!this.ready) return;
    const sp = this._spatial(pos, 200);
    if (sp.gain < 0.02) return;
    const t = this.ctx.currentTime + sp.delay;
    this._noiseSource(t, 1.4, {
      cutoff: Math.min(sp.cutoff, 900), type: 'lowpass', gain: 0.3 * sp.gain * scale, attack: 0.3,
    });
  }

  /** Threat detection klaxon. */
  startAlarm() {
    if (!this.ready || this.alarmOn) return;
    this.alarmOn = true;
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    osc.type = 'square';
    const lfo = ctx.createOscillator();
    lfo.type = 'square';
    lfo.frequency.value = 1.6;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 120;
    osc.frequency.value = 620;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = 2200;
    const g = ctx.createGain();
    g.gain.value = 0;
    g.gain.setTargetAtTime(0.055, ctx.currentTime, 0.15);
    osc.connect(filt);
    filt.connect(g);
    g.connect(this.comp);
    osc.start();
    lfo.start();
    this._alarm = { osc, lfo, g };
  }

  stopAlarm() {
    if (!this.ready || !this.alarmOn) return;
    this.alarmOn = false;
    const { osc, lfo, g } = this._alarm;
    const t = this.ctx.currentTime;
    g.gain.setTargetAtTime(0, t, 0.12);
    osc.stop(t + 0.8);
    lfo.stop(t + 0.8);
    this._alarm = null;
  }

  /** Short mechanical servo whine for launcher slewing. */
  servo(pos, dur = 0.4) {
    if (!this.ready) return;
    const sp = this._spatial(pos, 30);
    if (sp.gain < 0.04) return;
    const t = this.ctx.currentTime + sp.delay;
    this._tone(t, 320, dur, { type: 'sawtooth', gain: 0.03 * sp.gain, sweepTo: 260 });
  }
}
