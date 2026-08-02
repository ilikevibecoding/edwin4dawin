// Sound effects, all synthesised. Same contract as the instruments: schedule
// into a context at an absolute time, no real-time processing, so the offline
// render is sample-identical to live playback.

import { noiseSource, getNoise } from './synth.js';

function gainNode(ctx, v = 1) {
  const g = ctx.createGain();
  g.gain.value = v;
  return g;
}

function bp(ctx, freq, q = 1, type = 'bandpass') {
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  return f;
}

/** Blaster bolt: a hard downward sweep with a metallic tail. */
export function blaster(ctx, out, { when, vel = 1, pitch = 1, tail = 0.14 } = {}) {
  const o = ctx.createOscillator();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(2400 * pitch, when);
  o.frequency.exponentialRampToValueAtTime(180 * pitch, when + 0.11);
  const f = bp(ctx, 2600 * pitch, 3.2);
  f.frequency.setValueAtTime(3200 * pitch, when);
  f.frequency.exponentialRampToValueAtTime(400 * pitch, when + 0.12);
  const g = gainNode(ctx, 0);
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(0.42 * vel, when + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, when + 0.1 + tail);
  o.connect(f).connect(g).connect(out);
  o.start(when);
  o.stop(when + 0.3 + tail);
  // Short slapback gives it the "shot down a corridor" quality.
  const dly = ctx.createDelay(0.3);
  dly.delayTime.value = 0.055;
  const fb = gainNode(ctx, 0.28);
  const dw = gainNode(ctx, 0.35 * vel);
  g.connect(dly); dly.connect(fb); fb.connect(dly); dly.connect(dw); dw.connect(out);
}

/** Capital-ship turbolaser: slower, fatter, with sub. */
export function turbolaser(ctx, out, { when, vel = 1 } = {}) {
  const o = ctx.createOscillator();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(900, when);
  o.frequency.exponentialRampToValueAtTime(70, when + 0.35);
  const sub = ctx.createOscillator();
  sub.type = 'sine';
  sub.frequency.setValueAtTime(150, when);
  sub.frequency.exponentialRampToValueAtTime(38, when + 0.4);
  const f = bp(ctx, 1400, 2.4, 'lowpass');
  f.frequency.setValueAtTime(2600, when);
  f.frequency.exponentialRampToValueAtTime(220, when + 0.36);
  const g = gainNode(ctx);
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(0.55 * vel, when + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, when + 0.55);
  const sg = gainNode(ctx, 0.5 * vel);
  sg.gain.setValueAtTime(0.0001, when);
  sg.gain.exponentialRampToValueAtTime(0.5 * vel, when + 0.02);
  sg.gain.exponentialRampToValueAtTime(0.0001, when + 0.6);
  o.connect(f).connect(g).connect(out);
  sub.connect(sg).connect(out);
  o.start(when); o.stop(when + 0.7);
  sub.start(when); sub.stop(when + 0.7);
}

/** Explosion: noise body, sub drop, long rumble tail. */
export function explosion(ctx, out, { when, vel = 1, size = 1 } = {}) {
  const n = noiseSource(ctx, { loop: false, rate: 0.7 });
  const lp = bp(ctx, 900, 0.8, 'lowpass');
  lp.frequency.setValueAtTime(4200, when);
  lp.frequency.exponentialRampToValueAtTime(180, when + 1.4 * size);
  const g = gainNode(ctx);
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(0.75 * vel, when + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, when + 1.9 * size);
  n.connect(lp).connect(g).connect(out);
  n.start(when);
  n.stop(when + 2.4 * size);

  const sub = ctx.createOscillator();
  sub.type = 'sine';
  sub.frequency.setValueAtTime(120, when);
  sub.frequency.exponentialRampToValueAtTime(24, when + 0.9 * size);
  const sg = gainNode(ctx);
  sg.gain.setValueAtTime(0.0001, when);
  sg.gain.exponentialRampToValueAtTime(0.7 * vel, when + 0.02);
  sg.gain.exponentialRampToValueAtTime(0.0001, when + 1.5 * size);
  sub.connect(sg).connect(out);
  sub.start(when);
  sub.stop(when + 1.8 * size);
}

/** Engine bed: brown noise + drone, held for `dur`. */
export function engineBed(ctx, out, { when, dur, vel = 1, freq = 48, cutoff = 220 } = {}) {
  const n = noiseSource(ctx, { brown: true });
  const lp = bp(ctx, cutoff, 0.7, 'lowpass');
  const g = gainNode(ctx, 0);
  const o = ctx.createOscillator();
  o.type = 'sawtooth';
  o.frequency.value = freq;
  const of = bp(ctx, freq * 4, 3, 'lowpass');
  const og = gainNode(ctx, 0.22);
  o.connect(of).connect(og).connect(g);
  n.connect(lp).connect(g).connect(out);
  const fade = Math.min(1.2, dur * 0.2);
  g.gain.setValueAtTime(0.0001, when);
  g.gain.linearRampToValueAtTime(0.34 * vel, when + fade);
  g.gain.setValueAtTime(0.34 * vel, when + dur - fade);
  g.gain.linearRampToValueAtTime(0.0001, when + dur);
  n.start(when); n.stop(when + dur + 0.1);
  o.start(when); o.stop(when + dur + 0.1);
}

/** TIE fighter scream: resonant sweep with a doppler fall. */
export function tieScream(ctx, out, { when, vel = 1, dur = 1.1 } = {}) {
  const n = noiseSource(ctx, { loop: true, rate: 1 });
  const f1 = bp(ctx, 900, 14);
  const f2 = bp(ctx, 1700, 18);
  f1.frequency.setValueAtTime(500, when);
  f1.frequency.exponentialRampToValueAtTime(1500, when + dur * 0.35);
  f1.frequency.exponentialRampToValueAtTime(300, when + dur);
  f2.frequency.setValueAtTime(1100, when);
  f2.frequency.exponentialRampToValueAtTime(2600, when + dur * 0.35);
  f2.frequency.exponentialRampToValueAtTime(650, when + dur);
  const g = gainNode(ctx, 0);
  g.gain.setValueAtTime(0.0001, when);
  g.gain.linearRampToValueAtTime(0.5 * vel, when + dur * 0.3);
  g.gain.linearRampToValueAtTime(0.0001, when + dur);
  n.connect(f1).connect(g);
  n.connect(f2).connect(g);
  g.connect(out);
  n.start(when);
  n.stop(when + dur + 0.1);
}

/** Fighter fly-by whoosh. */
export function flyby(ctx, out, { when, vel = 1, dur = 0.9, low = 220, high = 2600 } = {}) {
  const n = noiseSource(ctx, { loop: true });
  const f = bp(ctx, low, 1.4);
  f.frequency.setValueAtTime(low, when);
  f.frequency.exponentialRampToValueAtTime(high, when + dur * 0.45);
  f.frequency.exponentialRampToValueAtTime(low * 0.6, when + dur);
  const g = gainNode(ctx, 0);
  g.gain.setValueAtTime(0.0001, when);
  g.gain.linearRampToValueAtTime(0.42 * vel, when + dur * 0.45);
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  n.connect(f).connect(g).connect(out);
  n.start(when);
  n.stop(when + dur + 0.1);
}

/** Hyperdrive: rising whine, then the punch and the long stretch. */
export function hyperjump(ctx, out, { when, vel = 1 } = {}) {
  const o = ctx.createOscillator();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(90, when);
  o.frequency.exponentialRampToValueAtTime(1800, when + 1.7);
  const f = bp(ctx, 800, 6, 'lowpass');
  f.frequency.setValueAtTime(600, when);
  f.frequency.exponentialRampToValueAtTime(6000, when + 1.7);
  const g = gainNode(ctx, 0);
  g.gain.setValueAtTime(0.0001, when);
  g.gain.linearRampToValueAtTime(0.3 * vel, when + 1.5);
  g.gain.exponentialRampToValueAtTime(0.0001, when + 2.1);
  o.connect(f).connect(g).connect(out);
  o.start(when); o.stop(when + 2.3);
  // The punch.
  explosion(ctx, out, { when: when + 1.68, vel: 0.55 * vel, size: 0.8 });
  const n = noiseSource(ctx, { loop: true });
  const nf = bp(ctx, 4000, 0.7, 'highpass');
  const ng = gainNode(ctx, 0);
  ng.gain.setValueAtTime(0.0001, when + 1.7);
  ng.gain.linearRampToValueAtTime(0.28 * vel, when + 1.78);
  ng.gain.exponentialRampToValueAtTime(0.0001, when + 3.4);
  n.connect(nf).connect(ng).connect(out);
  n.start(when + 1.7);
  n.stop(when + 3.6);
}

/** Lightsaber ignition: snap-hiss up to the hum. */
export function saberIgnite(ctx, out, { when, vel = 1 } = {}) {
  const o = ctx.createOscillator();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(60, when);
  o.frequency.exponentialRampToValueAtTime(150, when + 0.32);
  const f = bp(ctx, 400, 5, 'lowpass');
  f.frequency.setValueAtTime(300, when);
  f.frequency.exponentialRampToValueAtTime(2200, when + 0.3);
  const g = gainNode(ctx, 0);
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(0.4 * vel, when + 0.05);
  g.gain.exponentialRampToValueAtTime(0.14 * vel, when + 0.4);
  o.connect(f).connect(g).connect(out);
  o.start(when); o.stop(when + 0.55);
  const n = noiseSource(ctx, { loop: false });
  const nf = bp(ctx, 1800, 1.2);
  const ng = gainNode(ctx, 0);
  ng.gain.setValueAtTime(0.0001, when);
  ng.gain.exponentialRampToValueAtTime(0.3 * vel, when + 0.02);
  ng.gain.exponentialRampToValueAtTime(0.0001, when + 0.45);
  n.connect(nf).connect(ng).connect(out);
  n.start(when); n.stop(when + 0.6);
}

/** Continuous saber hum with a slow wobble. */
export function saberHum(ctx, out, { when, dur, vel = 1, base = 108 } = {}) {
  const g = gainNode(ctx, 0);
  const a = ctx.createOscillator(); a.type = 'sawtooth'; a.frequency.value = base;
  const b = ctx.createOscillator(); b.type = 'sawtooth'; b.frequency.value = base * 1.005;
  const c = ctx.createOscillator(); c.type = 'sine'; c.frequency.value = base * 0.5;
  const f = bp(ctx, base * 6, 7, 'lowpass');
  const wob = ctx.createOscillator(); wob.type = 'sine'; wob.frequency.value = 3.1;
  const wobG = gainNode(ctx, base * 0.02);
  wob.connect(wobG); wobG.connect(a.frequency); wobG.connect(b.frequency);
  const mix = gainNode(ctx, 0.3);
  a.connect(mix); b.connect(mix);
  const cg = gainNode(ctx, 0.25); c.connect(cg).connect(f);
  mix.connect(f).connect(g).connect(out);
  const fade = Math.min(0.35, dur * 0.2);
  g.gain.setValueAtTime(0.0001, when);
  g.gain.linearRampToValueAtTime(0.2 * vel, when + fade);
  g.gain.setValueAtTime(0.2 * vel, when + dur - fade);
  g.gain.linearRampToValueAtTime(0.0001, when + dur);
  [a, b, c, wob].forEach((o) => { o.start(when); o.stop(when + dur + 0.1); });
}

/** Blade clash: bright crack plus a ringing overtone. */
export function saberClash(ctx, out, { when, vel = 1 } = {}) {
  const n = noiseSource(ctx, { loop: false });
  const f = bp(ctx, 3200, 1.6);
  const g = gainNode(ctx, 0);
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(0.5 * vel, when + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, when + 0.35);
  n.connect(f).connect(g).connect(out);
  n.start(when); n.stop(when + 0.45);
  for (const [mult, gain] of [[1, 0.22], [2.4, 0.12], [3.7, 0.07]]) {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = 620 * mult;
    const og = gainNode(ctx, 0);
    og.gain.setValueAtTime(0.0001, when);
    og.gain.exponentialRampToValueAtTime(gain * vel, when + 0.006);
    og.gain.exponentialRampToValueAtTime(0.0001, when + 0.5);
    o.connect(og).connect(out);
    o.start(when); o.stop(when + 0.6);
  }
}

/** Saber swing: a filtered whoosh with a pitch bend. */
export function saberSwing(ctx, out, { when, vel = 1, dur = 0.42 } = {}) {
  const o = ctx.createOscillator();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(150, when);
  o.frequency.linearRampToValueAtTime(260, when + dur * 0.5);
  o.frequency.linearRampToValueAtTime(120, when + dur);
  const f = bp(ctx, 900, 4, 'bandpass');
  const g = gainNode(ctx, 0);
  g.gain.setValueAtTime(0.0001, when);
  g.gain.linearRampToValueAtTime(0.34 * vel, when + dur * 0.4);
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  o.connect(f).connect(g).connect(out);
  o.start(when); o.stop(when + dur + 0.1);
}

/** The Dark Lord's respirator: one in-out cycle, ~3.2 s. */
export function breath(ctx, out, { when, vel = 1 } = {}) {
  const mk = (t0, dur, f0, f1, peak) => {
    const n = noiseSource(ctx, { loop: true });
    const f = bp(ctx, f0, 3.4);
    f.frequency.setValueAtTime(f0, t0);
    f.frequency.linearRampToValueAtTime(f1, t0 + dur);
    const lp = bp(ctx, 1400, 0.7, 'lowpass');
    const g = gainNode(ctx, 0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(peak * vel, t0 + dur * 0.4);
    g.gain.linearRampToValueAtTime(0.0001, t0 + dur);
    n.connect(f).connect(lp).connect(g).connect(out);
    n.start(t0);
    n.stop(t0 + dur + 0.1);
  };
  mk(when, 1.25, 320, 620, 0.2);            // inhale
  mk(when + 1.55, 1.45, 540, 240, 0.26);    // exhale
}

/** Astromech chatter: a short run of swooping tones. */
export function droidBeeps(ctx, out, { when, vel = 1, count = 5, seed = 1, mood = 1 } = {}) {
  let s = seed * 9301 + 49297;
  const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  let t = when;
  for (let i = 0; i < count; i++) {
    const dur = 0.07 + rnd() * 0.16;
    const f0 = 380 + rnd() * 1500 * mood;
    const f1 = f0 * (0.4 + rnd() * 2.2);
    const o = ctx.createOscillator();
    o.type = rnd() < 0.4 ? 'square' : 'sine';
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(80, f1), t + dur);
    const g = gainNode(ctx, 0);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.16 * vel, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const f = bp(ctx, 2600, 0.8, 'lowpass');
    o.connect(f).connect(g).connect(out);
    o.start(t);
    o.stop(t + dur + 0.05);
    t += dur + 0.02 + rnd() * 0.07;
  }
}

/** Comm click / static burst that tops and tails radio lines. */
export function commClick(ctx, out, { when, vel = 1, dur = 0.09 } = {}) {
  const n = noiseSource(ctx, { loop: false });
  const f = bp(ctx, 1800, 1.1);
  const g = gainNode(ctx, 0);
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(0.16 * vel, when + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  n.connect(f).connect(g).connect(out);
  n.start(when); n.stop(when + dur + 0.05);
}

/** Klaxon: two-tone alarm, repeated. */
export function klaxon(ctx, out, { when, vel = 1, times = 3 } = {}) {
  for (let i = 0; i < times; i++) {
    const t = when + i * 0.9;
    for (const [f, off] of [[420, 0], [560, 0.42]]) {
      const o = ctx.createOscillator();
      o.type = 'square';
      o.frequency.value = f;
      const g = gainNode(ctx, 0);
      g.gain.setValueAtTime(0.0001, t + off);
      g.gain.linearRampToValueAtTime(0.14 * vel, t + off + 0.04);
      g.gain.setValueAtTime(0.14 * vel, t + off + 0.3);
      g.gain.exponentialRampToValueAtTime(0.0001, t + off + 0.4);
      const lp = bp(ctx, 1400, 0.8, 'lowpass');
      o.connect(lp).connect(g).connect(out);
      o.start(t + off);
      o.stop(t + off + 0.5);
    }
  }
}

/** Desert wind bed. */
export function wind(ctx, out, { when, dur, vel = 1 } = {}) {
  const n = noiseSource(ctx, { brown: false, loop: true, rate: 0.35 });
  const f = bp(ctx, 500, 0.9);
  const lfo = ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = 0.11;
  const lg = gainNode(ctx, 260);
  lfo.connect(lg).connect(f.frequency);
  const g = gainNode(ctx, 0);
  const fade = Math.min(2, dur * 0.25);
  g.gain.setValueAtTime(0.0001, when);
  g.gain.linearRampToValueAtTime(0.14 * vel, when + fade);
  g.gain.setValueAtTime(0.14 * vel, when + dur - fade);
  g.gain.linearRampToValueAtTime(0.0001, when + dur);
  n.connect(f).connect(g).connect(out);
  n.start(when); n.stop(when + dur + 0.1);
  lfo.start(when); lfo.stop(when + dur + 0.1);
}

/** Deep interior hum for corridors and hangars. */
export function roomTone(ctx, out, { when, dur, vel = 1, freq = 58 } = {}) {
  const o = ctx.createOscillator();
  o.type = 'sine';
  o.frequency.value = freq;
  const o2 = ctx.createOscillator();
  o2.type = 'sine';
  o2.frequency.value = freq * 1.5;
  const g2 = gainNode(ctx, 0.3);
  o2.connect(g2);
  const n = noiseSource(ctx, { brown: true });
  const nf = bp(ctx, 300, 0.6, 'lowpass');
  const ng = gainNode(ctx, 0.5);
  const g = gainNode(ctx, 0);
  o.connect(g); g2.connect(g);
  n.connect(nf).connect(ng).connect(g);
  g.connect(out);
  const fade = Math.min(1.5, dur * 0.2);
  g.gain.setValueAtTime(0.0001, when);
  g.gain.linearRampToValueAtTime(0.16 * vel, when + fade);
  g.gain.setValueAtTime(0.16 * vel, when + dur - fade);
  g.gain.linearRampToValueAtTime(0.0001, when + dur);
  o.start(when); o.stop(when + dur + 0.1);
  o2.start(when); o2.stop(when + dur + 0.1);
  n.start(when); n.stop(when + dur + 0.1);
}

/** Heavy mechanical impact -- blast doors, boarding clamps. */
export function clang(ctx, out, { when, vel = 1 } = {}) {
  const n = noiseSource(ctx, { loop: false });
  const f = bp(ctx, 220, 1.4, 'lowpass');
  const g = gainNode(ctx, 0);
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(0.6 * vel, when + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, when + 0.9);
  n.connect(f).connect(g).connect(out);
  n.start(when); n.stop(when + 1);
  const o = ctx.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(160, when);
  o.frequency.exponentialRampToValueAtTime(48, when + 0.5);
  const og = gainNode(ctx, 0);
  og.gain.setValueAtTime(0.0001, when);
  og.gain.exponentialRampToValueAtTime(0.5 * vel, when + 0.01);
  og.gain.exponentialRampToValueAtTime(0.0001, when + 0.8);
  o.connect(og).connect(out);
  o.start(when); o.stop(when + 0.9);
}

/** Superlaser charge-up and fire. */
export function superlaser(ctx, out, { when, vel = 1 } = {}) {
  const o = ctx.createOscillator();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(40, when);
  o.frequency.exponentialRampToValueAtTime(400, when + 2.4);
  const f = bp(ctx, 300, 8, 'lowpass');
  f.frequency.setValueAtTime(200, when);
  f.frequency.exponentialRampToValueAtTime(3000, when + 2.4);
  const g = gainNode(ctx, 0);
  g.gain.setValueAtTime(0.0001, when);
  g.gain.linearRampToValueAtTime(0.34 * vel, when + 2.3);
  g.gain.exponentialRampToValueAtTime(0.0001, when + 2.9);
  o.connect(f).connect(g).connect(out);
  o.start(when); o.stop(when + 3);
  explosion(ctx, out, { when: when + 2.4, vel: vel * 0.9, size: 1.6 });
}

export const SFX = {
  blaster, turbolaser, explosion, engineBed, tieScream, flyby, hyperjump,
  saberIgnite, saberHum, saberClash, saberSwing, breath, droidBeeps,
  commClick, klaxon, wind, roomTone, clang, superlaser,
};
