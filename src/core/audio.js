/**
 * Fully procedural WebAudio SFX engine — no audio assets.
 * Layered synthesis for gunfire, explosions, jets, footsteps, UI.
 */
export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.sfx = null;
    this.noiseBuf = null;
    this.started = false;
    this.lowHealth = false;
    this._heartTimer = 0;
    this._ambNodes = [];
  }

  ensure() {
    if (this.started) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    const c = this.ctx;

    this.master = c.createDynamicsCompressor();
    this.master.threshold.value = -14;
    this.master.knee.value = 22;
    this.master.ratio.value = 8;
    this.master.attack.value = 0.002;
    this.master.release.value = 0.18;

    const gain = c.createGain();
    gain.gain.value = 0.85;
    this.master.connect(gain).connect(c.destination);

    this.sfx = c.createGain();
    this.sfx.gain.value = 1;

    // Slap-back echo bus for urban exterior feel
    this.echo = c.createDelay(0.6);
    this.echo.delayTime.value = 0.21;
    this.echoGain = c.createGain(); this.echoGain.gain.value = 0.22;
    this.echoFilt = c.createBiquadFilter(); this.echoFilt.type = 'lowpass'; this.echoFilt.frequency.value = 1400;
    this.sfx.connect(this.master);
    this.sfx.connect(this.echo);
    this.echo.connect(this.echoFilt).connect(this.echoGain).connect(this.master);
    this.echoGain.connect(this.echo); // feedback

    // 2s white-noise buffer reused by everything
    const len = c.sampleRate * 2;
    this.noiseBuf = c.createBuffer(1, len, c.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

    this.started = true;
    this._startAmbience();
  }

  get t() { return this.ctx ? this.ctx.currentTime : 0; }

  _noise() {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    src.playbackRate.value = 0.98 + Math.random() * 0.04;
    return src;
  }

  _env(node, t0, a, peak, d, end = 0.0001) {
    node.gain.setValueAtTime(0.0001, t0);
    node.gain.linearRampToValueAtTime(peak, t0 + a);
    node.gain.exponentialRampToValueAtTime(end, t0 + a + d);
  }

  /* ---------------- weapons ---------------- */

  gunshot({ vol = 1, dist = 0, caliber = 1 } = {}) {
    if (!this.started) return;
    const c = this.ctx, t = this.t;
    const distMul = 1 / (1 + dist * 0.055);
    const out = c.createGain(); out.gain.value = vol * distMul;
    out.connect(this.sfx);

    // Crack — bandpassed noise, very short
    const n1 = this._noise();
    const bp = c.createBiquadFilter(); bp.type = 'bandpass';
    bp.frequency.value = (2600 - dist * 30) / caliber; bp.Q.value = 0.7;
    const g1 = c.createGain();
    this._env(g1, t, 0.001, 1.1, 0.05 + caliber * 0.02);
    n1.connect(bp).connect(g1).connect(out);
    n1.start(t); n1.stop(t + 0.25);

    // Body — lowpassed noise thump
    const n2 = this._noise();
    const lp = c.createBiquadFilter(); lp.type = 'lowpass';
    lp.frequency.setValueAtTime(900 * caliber, t);
    lp.frequency.exponentialRampToValueAtTime(120, t + 0.12);
    const g2 = c.createGain();
    this._env(g2, t, 0.001, 0.9 * caliber, 0.14 + caliber * 0.08);
    n2.connect(lp).connect(g2).connect(out);
    n2.start(t); n2.stop(t + 0.4);

    // Sub punch
    const osc = c.createOscillator(); osc.type = 'sine';
    osc.frequency.setValueAtTime(120 * caliber, t);
    osc.frequency.exponentialRampToValueAtTime(38, t + 0.09);
    const g3 = c.createGain();
    this._env(g3, t, 0.001, 0.55 * caliber, 0.1);
    osc.connect(g3).connect(out);
    osc.start(t); osc.stop(t + 0.2);
  }

  dryFire() {
    if (!this.started) return;
    this._click(1900, 0.04, 0.35);
  }

  reload(stage) {
    if (!this.started) return;
    if (stage === 'out') { this._click(700, 0.05, 0.5); this._click(300, 0.08, 0.4, 0.03); }
    else if (stage === 'in') { this._click(500, 0.06, 0.65); this._click(950, 0.03, 0.45, 0.04); }
    else { this._click(1400, 0.05, 0.6); this._click(800, 0.06, 0.55, 0.07); } // bolt
  }

  _click(freq, dur, vol, delay = 0) {
    const c = this.ctx, t = this.t + delay;
    const n = this._noise();
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = freq; bp.Q.value = 3.5;
    const g = c.createGain();
    this._env(g, t, 0.002, vol, dur);
    n.connect(bp).connect(g).connect(this.sfx);
    n.start(t); n.stop(t + dur + 0.05);
  }

  casing() {
    if (!this.started || Math.random() < 0.4) return;
    const c = this.ctx, t = this.t + 0.25 + Math.random() * 0.2;
    const f = 3800 + Math.random() * 2600;
    const osc = c.createOscillator(); osc.type = 'triangle'; osc.frequency.value = f;
    const g = c.createGain();
    this._env(g, t, 0.001, 0.045, 0.09);
    osc.connect(g).connect(this.sfx);
    osc.start(t); osc.stop(t + 0.15);
  }

  /* ---------------- impacts / explosions ---------------- */

  impact(dist = 8) {
    if (!this.started) return;
    const vol = 0.5 / (1 + dist * 0.12);
    if (vol < 0.02) return;
    this._click(500 + Math.random() * 2500, 0.05, vol);
  }

  explosion({ dist = 20, big = false } = {}) {
    if (!this.started) return;
    const c = this.ctx, t = this.t + dist / 340; // speed of sound delay
    const distMul = 1 / (1 + dist * (big ? 0.012 : 0.03));
    const out = c.createGain(); out.gain.value = distMul * (big ? 1.5 : 1);
    out.connect(this.sfx);

    // Deep sub drop
    const osc = c.createOscillator(); osc.type = 'sine';
    osc.frequency.setValueAtTime(big ? 90 : 70, t);
    osc.frequency.exponentialRampToValueAtTime(22, t + (big ? 0.9 : 0.5));
    const g1 = c.createGain();
    this._env(g1, t, 0.004, big ? 1.2 : 0.8, big ? 1.1 : 0.6);
    osc.connect(g1).connect(out);
    osc.start(t); osc.stop(t + 1.6);

    // Blast noise with closing lowpass
    const n = this._noise();
    const lp = c.createBiquadFilter(); lp.type = 'lowpass';
    lp.frequency.setValueAtTime(Math.max(300, 5000 - dist * 40), t);
    lp.frequency.exponentialRampToValueAtTime(90, t + (big ? 1.6 : 0.9));
    const g2 = c.createGain();
    this._env(g2, t, 0.002, big ? 1.1 : 0.75, big ? 1.7 : 0.9);
    n.connect(lp).connect(g2).connect(out);
    n.start(t); n.stop(t + 2.4);

    // Debris crackle
    for (let i = 0; i < (big ? 7 : 3); i++) {
      const dt = 0.15 + Math.random() * (big ? 1.2 : 0.5);
      this._click(400 + Math.random() * 1800, 0.06, 0.25 * distMul, (t - this.t) + dt);
    }
  }

  bombWhistle(dur = 1.6) {
    if (!this.started) return;
    const c = this.ctx, t = this.t;
    const osc = c.createOscillator(); osc.type = 'sine';
    osc.frequency.setValueAtTime(2350, t);
    osc.frequency.exponentialRampToValueAtTime(420, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.16, t + dur * 0.7);
    g.gain.linearRampToValueAtTime(0.02, t + dur);
    osc.connect(g).connect(this.sfx);
    osc.start(t); osc.stop(t + dur + 0.05);
  }

  jetFlyby(dur = 3.2) {
    if (!this.started) return;
    const c = this.ctx, t = this.t;
    const n = this._noise();
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 0.5;
    bp.frequency.setValueAtTime(240, t);
    bp.frequency.exponentialRampToValueAtTime(2100, t + dur * 0.45);
    bp.frequency.exponentialRampToValueAtTime(160, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.9, t + dur * 0.45);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    n.connect(bp).connect(g).connect(this.sfx);
    n.start(t); n.stop(t + dur + 0.1);

    // Turbine scream layer
    const osc = c.createOscillator(); osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(900, t);
    osc.frequency.exponentialRampToValueAtTime(2400, t + dur * 0.45);
    osc.frequency.exponentialRampToValueAtTime(500, t + dur);
    const g2 = c.createGain();
    g2.gain.setValueAtTime(0.0001, t);
    g2.gain.exponentialRampToValueAtTime(0.06, t + dur * 0.45);
    g2.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    const lp2 = c.createBiquadFilter(); lp2.type = 'lowpass'; lp2.frequency.value = 3000;
    osc.connect(lp2).connect(g2).connect(this.sfx);
    osc.start(t); osc.stop(t + dur + 0.1);
  }

  /* ---------------- movement / feedback ---------------- */

  footstep(run = false) {
    if (!this.started) return;
    const c = this.ctx, t = this.t;
    const n = this._noise();
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 480 + Math.random() * 260;
    const g = c.createGain();
    this._env(g, t, 0.003, run ? 0.22 : 0.13, 0.07);
    n.connect(lp).connect(g).connect(this.master); // dry — no echo on feet
    n.start(t); n.stop(t + 0.12);
  }

  hitmarker(kill = false) {
    if (!this.started) return;
    const c = this.ctx, t = this.t;
    const osc = c.createOscillator(); osc.type = 'square';
    osc.frequency.value = kill ? 720 : 2100;
    const g = c.createGain();
    this._env(g, t, 0.001, 0.12, kill ? 0.09 : 0.045);
    osc.connect(g).connect(this.master);
    osc.start(t); osc.stop(t + 0.12);
    if (kill) {
      const o2 = c.createOscillator(); o2.type = 'square'; o2.frequency.value = 480;
      const g2 = c.createGain();
      this._env(g2, t + 0.06, 0.001, 0.12, 0.1);
      o2.connect(g2).connect(this.master);
      o2.start(t + 0.06); o2.stop(t + 0.22);
    }
  }

  playerHurt() {
    if (!this.started) return;
    const c = this.ctx, t = this.t;
    const n = this._noise();
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 500;
    const g = c.createGain();
    this._env(g, t, 0.002, 0.5, 0.22);
    n.connect(lp).connect(g).connect(this.master);
    n.start(t); n.stop(t + 0.3);
  }

  heartbeat() {
    if (!this.started) return;
    const c = this.ctx, t = this.t;
    for (const [dt, v] of [[0, 0.5], [0.16, 0.32]]) {
      const osc = c.createOscillator(); osc.type = 'sine'; osc.frequency.value = 52;
      const g = c.createGain();
      this._env(g, t + dt, 0.008, v, 0.12);
      osc.connect(g).connect(this.master);
      osc.start(t + dt); osc.stop(t + dt + 0.2);
    }
  }

  uiClick(confirm = false) {
    if (!this.started) return;
    this._click(confirm ? 900 : 1600, 0.05, 0.3);
    if (confirm) this._click(1350, 0.06, 0.3, 0.07);
  }

  killstreakReady() {
    if (!this.started) return;
    const c = this.ctx, t = this.t;
    [660, 880, 1100].forEach((f, i) => {
      const osc = c.createOscillator(); osc.type = 'sine'; osc.frequency.value = f;
      const g = c.createGain();
      this._env(g, t + i * 0.09, 0.005, 0.14, 0.14);
      osc.connect(g).connect(this.master);
      osc.start(t + i * 0.09); osc.stop(t + i * 0.09 + 0.25);
    });
  }

  radio(msg = 0) {
    // Radio squelch beep
    if (!this.started) return;
    this._click(2400, 0.03, 0.2);
    this._click(1800, 0.03, 0.16, 0.05);
  }

  /* ---------------- ambience ---------------- */

  _startAmbience() {
    const c = this.ctx;
    // Wind bed
    const n = this._noise();
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 320;
    const g = c.createGain(); g.gain.value = 0.05;
    const lfo = c.createOscillator(); lfo.frequency.value = 0.11;
    const lfoG = c.createGain(); lfoG.gain.value = 90;
    lfo.connect(lfoG).connect(lp.frequency);
    n.connect(lp).connect(g).connect(this.master);
    n.start(); lfo.start();
    this._ambNodes.push(n, lfo);

    // Distant war rumbles on a randomized timer
    const rumble = () => {
      if (!this.started) return;
      if (Math.random() < 0.6) this.explosion({ dist: 320 + Math.random() * 400 });
      else { // distant MG chatter
        const k = 4 + Math.floor(Math.random() * 6);
        for (let i = 0; i < k; i++)
          setTimeout(() => this.gunshot({ vol: 0.5, dist: 260 + Math.random() * 200 }), i * (85 + Math.random() * 30));
      }
      setTimeout(rumble, 6000 + Math.random() * 14000);
    };
    setTimeout(rumble, 4000);
  }

  update(dt, healthFrac) {
    if (!this.started) return;
    const low = healthFrac < 0.35;
    if (low) {
      this._heartTimer -= dt;
      if (this._heartTimer <= 0) {
        this.heartbeat();
        this._heartTimer = 0.6 + healthFrac;
      }
    }
  }
}
