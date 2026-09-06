// Maglev sound for the space train, built on GameAudio's loop API (src/audio.js is shared and not edited here):
//   - a low electric hum: a sine fundamental at 80..160 Hz rising with speed plus a filtered sawtooth an octave
//     up for texture, and a low-passed wind bed that only comes in at speed;
//   - doppler: for a listener who is not riding, the hum is pitched by the train's radial speed (approaching up,
//     receding down) and a bandpass whoosh sweeps down as the hull passes;
//   - a two-tone door chime (ascending on open, descending on close) and the arrival / departure announcement blips.
// All gains are scaled by the listener's distance to the hull (audio.spatial), so nothing plays out of range.
import { SCHEDULE } from './route.js';

const SPEED_OF_SOUND = 110;   // blocks/s: exaggerated so a 30 blocks/s pass-by shifts the hum audibly
const HUM_MIN = 80, HUM_MAX = 160;
const RANGE = 150;            // blocks: audible radius of the hum

export class TrainAudio {
  constructor(audio) {
    this.audio = audio;
    this.on = false;
    this.nearest = { x: 0, y: 0, z: 0 };   // point of the hull nearest to the listener (world), refreshed by update
    this.lastAhead = 0;                    // sign of (listener - hull) along the track, for the pass-by whoosh
    this.lastDoorChime = -1;
    this.stats = { hum: 0, doppler: 1, whooshes: 0, chimes: 0, blips: 0 };
  }

  get ready() { const a = this.audio; return !!(a && a.ctx && a.enabled); }

  // Called every frame with the train (bounds, state, isPlayerRiding). Starts / stops the loops by distance.
  update(train) {
    const audio = this.audio, b = train.bounds;
    if (!audio || !audio.ctx || !b) return;
    const L = audio.listener;
    const n = this.nearest;
    n.x = Math.max(b.x0, Math.min(b.x1, L.x)); n.y = Math.max(b.y0, Math.min(b.y1, L.y)); n.z = Math.max(b.z0, Math.min(b.z1, L.z));
    const [g, pan] = audio.spatial(n, RANGE);
    const v = train.state.v, f = Math.min(1, Math.abs(v) / SCHEDULE.vmax);
    const riding = train.isPlayerRiding();
    if (g > 0.002 && audio.enabled) {
      if (!this.on) {
        audio.loopStart('trainHum', { kind: 'osc', type: 'sine', freq: HUM_MIN, cutoff: 260, q: 0.8, gain: 0 });
        audio.loopStart('trainHumHi', { kind: 'osc', type: 'sawtooth', freq: HUM_MIN * 2, cutoff: 320, q: 1.5, gain: 0 });
        audio.loopStart('trainWind', { kind: 'noise', filter: 'lowpass', cutoff: 200, q: 0.6, gain: 0 });
        this.on = true;
      }
      // doppler for a standing listener: radial speed of the nearest hull point toward the listener
      let doppler = 1;
      const ahead = Math.sign(L.x - n.x);   // +1: listener east of the hull, -1: west, 0: alongside
      if (!riding && ahead !== 0 && Math.abs(v) > 0.5) {
        const vr = v * ahead;               // > 0 approaching
        doppler = Math.max(0.72, Math.min(1.38, SPEED_OF_SOUND / (SPEED_OF_SOUND - vr)));
        // the hull front just passed the listener at speed: a whoosh sweeping down
        if (this.lastAhead !== 0 && ahead !== this.lastAhead && Math.abs(v) > 6 && g > 0.15) {
          audio.noise(0.9, 'bandpass', 700 + 400 * f, 0.9, 0.45 * g, n, RANGE, 0.12, 180);
          this.stats.whooshes++;
        }
      }
      this.lastAhead = riding ? 0 : ahead;
      const inside = riding ? 0.65 : 1;    // the hull damps the hum for passengers
      const hum = HUM_MIN + (HUM_MAX - HUM_MIN) * f;
      audio.loopSet('trainHum', { freq: hum * doppler, cutoff: 220 + 220 * f, gain: g * (0.12 + 0.14 * f) * inside, pan }, 0.15);
      audio.loopSet('trainHumHi', { freq: hum * 2 * doppler, cutoff: 260 + 260 * f, gain: g * (0.02 + 0.045 * f) * inside, pan }, 0.15);
      audio.loopSet('trainWind', { gain: g * 0.14 * f * f * inside, cutoff: 180 + 520 * f, rate: (0.7 + 0.5 * f) * doppler, pan }, 0.2);
      this.stats.hum = hum; this.stats.doppler = doppler;
    } else if (this.on) {
      this.stop(0.8);
    }
  }

  stop(fade = 0.6) {
    if (!this.on) return;
    this.audio.loopStop('trainHum', fade); this.audio.loopStop('trainHumHi', fade); this.audio.loopStop('trainWind', fade);
    this.on = false;
  }

  // Two-tone chime at the hull point nearest to the listener: ascending for opening doors, descending for closing.
  doors(open) {
    if (!this.ready) return;
    const a = this.audio, pos = { ...this.nearest };
    const [g] = a.spatial(pos, 60);
    if (g <= 0) return;
    const notes = open ? [880, 1174.7] : [1174.7, 880];
    a.tone('sine', notes[0], notes[0], 0.28, 0.22, pos, 60, 0.008);
    setTimeout(() => a.tone('sine', notes[1], notes[1], 0.36, 0.2, pos, 60, 0.008), 150);
    this.stats.chimes++;
  }

  // Arrival announcement: three soft ascending blips (C5 E5 G5); departure: two descending.
  arrive() { this.blips([523.3, 659.3, 784], 0.16); }
  depart() { this.blips([784, 523.3], 0.18); }
  blips(freqs, gain) {
    if (!this.ready) return;
    const a = this.audio, pos = { ...this.nearest };
    const [g] = a.spatial(pos, 80);
    if (g <= 0) return;
    freqs.forEach((f, i) => setTimeout(() => a.tone('sine', f, f, 0.14, gain, pos, 80, 0.01), i * 110));
    this.stats.blips++;
  }
}
