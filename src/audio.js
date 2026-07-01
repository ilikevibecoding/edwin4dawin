// WebAudio-synthesized SFX. No samples — everything is oscillators + noise.
let ctx = null;
let master = null;
let enabled = true;

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) { enabled = false; return null; }
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.32;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

export function unlockAudio() { ac(); }

function tone({ f0 = 440, f1 = f0, type = 'square', dur = 0.12, vol = 1, delay = 0, curve = 'exp' }) {
  const c = ac(); if (!c || !enabled) return;
  const t0 = c.currentTime + delay;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t0);
  if (curve === 'exp') o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur);
  else o.frequency.linearRampToValueAtTime(f1, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(vol, t0 + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(master);
  o.start(t0); o.stop(t0 + dur + 0.05);
}

function noise({ dur = 0.2, vol = 1, delay = 0, hp = 0, lp = 8000 }) {
  const c = ac(); if (!c || !enabled) return;
  const t0 = c.currentTime + delay;
  const len = Math.ceil(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource();
  src.buffer = buf;
  const g = c.createGain();
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  let node = src;
  if (lp < 8000) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; node.connect(f); node = f; }
  if (hp > 0) { const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp; node.connect(f); node = f; }
  node.connect(g); g.connect(master);
  src.start(t0);
}

export const sfx = {
  tap() { tone({ f0: 660, f1: 880, type: 'triangle', dur: 0.07, vol: 0.5 }); },
  select() { tone({ f0: 520, f1: 700, type: 'triangle', dur: 0.09, vol: 0.5 }); },
  deploy() {
    tone({ f0: 300, f1: 170, type: 'square', dur: 0.12, vol: 0.4 });
    noise({ dur: 0.1, vol: 0.25, lp: 1200 });
  },
  spellLaunch() { tone({ f0: 350, f1: 900, type: 'sawtooth', dur: 0.28, vol: 0.3 }); },
  hit() {
    tone({ f0: 200 + Math.random() * 60, f1: 90, type: 'square', dur: 0.07, vol: 0.35 });
    noise({ dur: 0.05, vol: 0.2, hp: 900 });
  },
  arrow() { tone({ f0: 1200, f1: 500, type: 'triangle', dur: 0.09, vol: 0.22 }); },
  poof() { noise({ dur: 0.22, vol: 0.35, lp: 900 }); tone({ f0: 300, f1: 90, type: 'sine', dur: 0.2, vol: 0.3 }); },
  explosion() {
    noise({ dur: 0.55, vol: 0.8, lp: 700 });
    tone({ f0: 120, f1: 40, type: 'sawtooth', dur: 0.5, vol: 0.55 });
  },
  towerDown() {
    noise({ dur: 0.7, vol: 0.9, lp: 500 });
    tone({ f0: 100, f1: 30, type: 'sawtooth', dur: 0.65, vol: 0.6 });
    tone({ f0: 880, f1: 1320, type: 'triangle', dur: 0.3, vol: 0.35, delay: 0.32 });
  },
  chestTap() {
    tone({ f0: 190, f1: 150, type: 'square', dur: 0.09, vol: 0.5 });
    noise({ dur: 0.06, vol: 0.2, lp: 2400 });
  },
  chestOpen() {
    noise({ dur: 0.4, vol: 0.5, hp: 600 });
    [523, 659, 784, 1047].forEach((f, i) => tone({ f0: f, f1: f, type: 'triangle', dur: 0.32, vol: 0.34, delay: i * 0.07 }));
  },
  coin(i = 0) { tone({ f0: 990 + i * 60, f1: 1400 + i * 60, type: 'triangle', dur: 0.09, vol: 0.3 }); },
  cardReveal() { tone({ f0: 620, f1: 930, type: 'triangle', dur: 0.16, vol: 0.4 }); },
  elixirSpend() { tone({ f0: 700, f1: 320, type: 'sine', dur: 0.16, vol: 0.35 }); },
  crown() {
    [784, 988, 1175].forEach((f, i) => tone({ f0: f, f1: f, type: 'triangle', dur: 0.2, vol: 0.4, delay: i * 0.08 }));
  },
  victory() {
    const seq = [[523, 0], [659, 0.13], [784, 0.26], [1047, 0.42], [784, 0.6], [1047, 0.72]];
    seq.forEach(([f, d]) => tone({ f0: f, f1: f, type: 'square', dur: 0.22, vol: 0.26, delay: d }));
    seq.forEach(([f, d]) => tone({ f0: f / 2, f1: f / 2, type: 'triangle', dur: 0.26, vol: 0.3, delay: d }));
  },
  defeat() {
    [[392, 0], [330, 0.22], [262, 0.44], [196, 0.68]].forEach(([f, d]) =>
      tone({ f0: f, f1: f * 0.97, type: 'triangle', dur: 0.34, vol: 0.32, delay: d }));
  },
  countdown() { tone({ f0: 880, f1: 880, type: 'triangle', dur: 0.1, vol: 0.35 }); },
};
