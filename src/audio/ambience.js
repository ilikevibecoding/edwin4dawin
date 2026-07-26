import { rand, randRange, randInt } from '../core/rand.js';

// far ambience one-shots: gentle rolloff so 150-380m sources stay audible,
// cheap equalpower panning, routed to the ambience bus
const FAR = { ref: 60, roll: 0.7, hrtf: false, bus: 'amb' };

/**
 * War-zone atmosphere:
 *  - constant bed: low wind (LFO-wobbled), distant city rumble, faint air hiss
 *  - seeded one-shots on timers: artillery thumps, far firefight exchanges,
 *    wind gusts, rare siren wails — all positional around the listener.
 * Driven by AudioSystem: start()/stop() from setAmbience, update(dt) each frame.
 */
export class Ambience {
  constructor(audio) {
    this.audio = audio;
    this.on = false;
    this.bed = null;
    this._tArt = randRange(12, 30);
    this._tGun = randRange(14, 34);
    this._tSiren = randRange(100, 220);
    this._tGust = randRange(6, 16);
  }

  start() {
    this.on = true;
    const a = this.audio, ctx = a.ctx;
    if (!ctx || this.bed) return;
    const kit = a.kit, bus = a.buses.amb;
    const B = { sources: [], tails: [] };

    const loop = (buf) => {
      const s = ctx.createBufferSource();
      s.buffer = buf;
      s.loop = true;
      s.start(ctx.currentTime, randRange(0, buf.duration * 0.9));
      B.sources.push(s);
      return s;
    };
    const filt = (type, f, q = 0.4) => {
      const x = ctx.createBiquadFilter();
      x.type = type; x.frequency.value = f; x.Q.value = q;
      return x;
    };
    const gain = (v) => { const g = ctx.createGain(); g.gain.value = v; return g; };
    const lfo = (hz, depth, param) => {
      const o = ctx.createOscillator();
      o.frequency.value = hz;
      const g = gain(depth);
      o.connect(g); g.connect(param);
      o.start(ctx.currentTime);
      B.sources.push(o);
    };

    // low wind — slow double-LFO swell on gain, breathing filter
    const w = loop(kit.white), wf = filt('lowpass', 340, 0.35), wg = gain(0.05);
    w.connect(wf); wf.connect(wg); wg.connect(bus);
    lfo(0.06, 0.02, wg.gain);
    lfo(0.017, 0.015, wg.gain);
    lfo(0.045, 90, wf.frequency);

    // distant city / war rumble
    const r = loop(kit.brown), rf = filt('lowpass', 110, 0.5), rg = gain(0.06);
    r.connect(rf); rf.connect(rg); rg.connect(bus);
    lfo(0.031, 0.02, rg.gain);

    // faint high air
    const h = loop(kit.white), hf = filt('bandpass', 5400, 0.5), hg = gain(0.006);
    h.connect(hf); hf.connect(hg); hg.connect(bus);

    B.tails.push(wg, rg, hg);
    this.bed = B;
  }

  stop() {
    this.on = false;
    if (!this.bed) return;
    for (const s of this.bed.sources) { try { s.stop(); } catch { /* already stopped */ } }
    for (const t of this.bed.tails) { try { t.disconnect(); } catch { /* detached */ } }
    this.bed = null;
  }

  update(dt) {
    if (!this.on || !this.audio.ctx || dt <= 0) return;
    if ((this._tArt -= dt) <= 0) { this._tArt = randRange(15, 40); this._artillery(); }
    if ((this._tGun -= dt) <= 0) { this._tGun = randRange(20, 50); this._exchange(); }
    if ((this._tSiren -= dt) <= 0) { this._tSiren = randRange(130, 260); this._siren(); }
    if ((this._tGust -= dt) <= 0) { this._tGust = randRange(8, 22); this._gust(); }
  }

  /** Random point on a ring around the listener, above the skyline. */
  _farPos(rMin, rMax, yMax = 26) {
    const cam = this.audio.game.camera;
    const cx = cam ? cam.position.x : 0;
    const cz = cam ? cam.position.z : 0;
    const ang = rand() * Math.PI * 2;
    const r = randRange(rMin, rMax);
    return { x: cx + Math.cos(ang) * r, y: randRange(4, yMax), z: cz + Math.sin(ang) * r };
  }

  _artillery() {
    const vd = randRange(180, 330);
    this.audio._at3d(this._farPos(200, 380), 'artillery',
      { volume: randRange(0.35, 0.65), virtualDist: vd, rate: randRange(0.85, 1.15) }, FAR);
    // batteries often fire in pairs
    if (rand() < 0.35) {
      this.audio._at3d(this._farPos(200, 380), 'artillery',
        { volume: randRange(0.25, 0.45), virtualDist: vd + 40, delay: randRange(0.3, 0.9), rate: randRange(0.85, 1.15) }, FAR);
    }
  }

  _exchange() {
    const a = this.audio;
    const burst = (p, n, gap, d0, vol) => {
      for (let i = 0; i < n; i++) {
        a._at3d(p, 'pop_far', {
          volume: vol * randRange(0.75, 1.1),
          delay: d0 + i * gap * randRange(0.88, 1.15),
          rate: randRange(0.9, 1.1),
          virtualDist: randRange(160, 260),
        }, FAR);
      }
    };
    burst(this._farPos(150, 300), randInt(4, 9), randRange(0.085, 0.16), 0, randRange(0.5, 0.8));
    // sometimes answering fire from another direction
    if (rand() < 0.55) {
      burst(this._farPos(150, 300), randInt(3, 7), randRange(0.1, 0.19), randRange(0.7, 1.6), randRange(0.4, 0.65));
    }
  }

  _siren() {
    this.audio._at3d(this._farPos(220, 360, 12), 'siren',
      { volume: randRange(0.5, 0.8), virtualDist: 240 }, FAR);
  }

  _gust() {
    if (!this.audio.kit) return;
    this.audio.kit.spawn('gust', this.audio.buses.amb,
      { volume: randRange(0.35, 0.9), pan: randRange(-0.7, 0.7), rate: randRange(0.8, 1.2) });
  }
}
