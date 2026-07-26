// Gameplay sound bank — every effect synthesized from noise/oscillator
// primitives. registerGameSounds() installs recipes into the audio engine.

import { registerSound, makeAudioBuffer, audioCtx } from './audio.js';

function expNoise(d, sr, { decay = 30, lp = 1, hp = 0, gain = 1, start = 0 }) {
  let lpState = 0, hpState = 0, prev = 0;
  const s0 = Math.floor(start * sr);
  for (let i = s0; i < d.length; i++) {
    const t = (i - s0) / sr;
    let v = (Math.random() * 2 - 1) * Math.exp(-t * decay);
    lpState += (v - lpState) * lp;
    v = lpState;
    if (hp > 0) { hpState += (v - hpState) * hp; v = v - hpState; }
    d[i] += v * gain;
    prev = v;
  }
}
function tone(d, sr, { freq = 440, decay = 10, gain = 0.4, start = 0, slide = 0, type = 'sine' }) {
  const s0 = Math.floor(start * sr);
  let phase = 0;
  for (let i = s0; i < d.length; i++) {
    const t = (i - s0) / sr;
    const f = freq + slide * t;
    phase += (Math.PI * 2 * f) / sr;
    let v = Math.sin(phase);
    if (type === 'square') v = Math.sign(v) * 0.7;
    if (type === 'tri') v = Math.asin(Math.sin(phase)) * 0.63;
    d[i] += v * Math.exp(-t * decay) * gain;
  }
}
function thump(d, sr, { freq = 90, decay = 18, gain = 0.9, start = 0 }) {
  const s0 = Math.floor(start * sr);
  let phase = 0;
  for (let i = s0; i < d.length; i++) {
    const t = (i - s0) / sr;
    phase += (Math.PI * 2 * (freq * Math.exp(-t * 6))) / sr;
    d[i] += Math.sin(phase) * Math.exp(-t * decay) * gain;
  }
}

export function registerGameSounds() {
  // ---- gunshots: punchy noise burst + body thump + tail ----
  const gunshot = (bodyF, punchDecay, tailGain, len = 0.5) => () => makeAudioBuffer(len, (d, sr) => {
    thump(d, sr, { freq: bodyF, decay: 26, gain: 1.0 });
    expNoise(d, sr, { decay: punchDecay, lp: 0.7, gain: 0.9 });
    expNoise(d, sr, { decay: 7, lp: 0.12, gain: tailGain }); // low rumble tail
    // soft clip
    for (let i = 0; i < d.length; i++) d[i] = Math.tanh(d[i] * 1.6) * 0.9;
  });
  registerSound('shot_pistol', gunshot(150, 60, 0.16, 0.42));
  registerSound('shot_smg', gunshot(130, 70, 0.14, 0.36));
  registerSound('shot_carbine', gunshot(105, 52, 0.22, 0.5));
  registerSound('shot_shotgun', gunshot(75, 34, 0.32, 0.65));
  registerSound('shot_precision', gunshot(62, 30, 0.4, 0.85));
  // distant/enemy variants: softer transients
  registerSound('shot_smg_d', gunshot(140, 40, 0.1, 0.4));
  registerSound('shot_carbine_d', gunshot(115, 36, 0.16, 0.5));
  registerSound('shot_shotgun_d', gunshot(85, 26, 0.2, 0.6));
  registerSound('shot_precision_d', gunshot(70, 24, 0.3, 0.8));

  registerSound('dry_fire', () => makeAudioBuffer(0.09, (d, sr) => {
    tone(d, sr, { freq: 1900, decay: 90, gain: 0.25, type: 'square' });
    expNoise(d, sr, { decay: 120, lp: 0.9, gain: 0.3 });
  }));
  registerSound('pump', () => makeAudioBuffer(0.3, (d, sr) => {
    expNoise(d, sr, { decay: 55, lp: 0.5, gain: 0.5 });
    expNoise(d, sr, { decay: 45, lp: 0.6, gain: 0.55, start: 0.14 });
  }));
  registerSound('bolt_cycle', () => makeAudioBuffer(0.42, (d, sr) => {
    tone(d, sr, { freq: 900, decay: 70, gain: 0.2 });
    expNoise(d, sr, { decay: 60, lp: 0.55, gain: 0.4, start: 0.0 });
    tone(d, sr, { freq: 700, decay: 60, gain: 0.25, start: 0.22 });
    expNoise(d, sr, { decay: 55, lp: 0.5, gain: 0.4, start: 0.24 });
  }));
  registerSound('reload_mag', () => makeAudioBuffer(0.6, (d, sr) => {
    expNoise(d, sr, { decay: 70, lp: 0.5, gain: 0.42 });
    tone(d, sr, { freq: 520, decay: 50, gain: 0.18, start: 0.3 });
    expNoise(d, sr, { decay: 80, lp: 0.65, gain: 0.5, start: 0.42 });
  }));
  registerSound('reload_empty', () => makeAudioBuffer(0.8, (d, sr) => {
    tone(d, sr, { freq: 380, decay: 60, gain: 0.25 });
    expNoise(d, sr, { decay: 70, lp: 0.55, gain: 0.4, start: 0.1 });
    expNoise(d, sr, { decay: 70, lp: 0.6, gain: 0.5, start: 0.5 });
    tone(d, sr, { freq: 720, decay: 60, gain: 0.2, start: 0.62 });
  }));
  registerSound('reload_start', () => makeAudioBuffer(0.25, (d, sr) => expNoise(d, sr, { decay: 60, lp: 0.5, gain: 0.4 })));
  registerSound('reload_end', () => makeAudioBuffer(0.2, (d, sr) => {
    tone(d, sr, { freq: 850, decay: 70, gain: 0.2 });
    expNoise(d, sr, { decay: 90, lp: 0.7, gain: 0.35 });
  }));
  registerSound('shell_insert', () => makeAudioBuffer(0.16, (d, sr) => {
    tone(d, sr, { freq: 620, decay: 80, gain: 0.2 });
    expNoise(d, sr, { decay: 100, lp: 0.6, gain: 0.4 });
  }));
  registerSound('weapon_draw', () => makeAudioBuffer(0.22, (d, sr) => expNoise(d, sr, { decay: 40, lp: 0.4, gain: 0.32 })));
  registerSound('throw', () => makeAudioBuffer(0.18, (d, sr) => expNoise(d, sr, { decay: 30, lp: 0.25, gain: 0.3 })));

  registerSound('knife_swing', () => makeAudioBuffer(0.16, (d, sr) => expNoise(d, sr, { decay: 26, lp: 0.3, hp: 0.15, gain: 0.35 })));
  registerSound('knife_hit', () => makeAudioBuffer(0.2, (d, sr) => {
    thump(d, sr, { freq: 130, decay: 40, gain: 0.6 });
    expNoise(d, sr, { decay: 60, lp: 0.5, gain: 0.4 });
  }));
  registerSound('knife_wall', () => makeAudioBuffer(0.12, (d, sr) => {
    tone(d, sr, { freq: 1500, decay: 90, gain: 0.25 });
    expNoise(d, sr, { decay: 110, lp: 0.8, gain: 0.3 });
  }));

  // ---- footsteps by surface ----
  const step = (lp, freq, gain, decay = 40) => () => makeAudioBuffer(0.18, (d, sr) => {
    thump(d, sr, { freq, decay: decay + 12, gain: gain * 0.7 });
    expNoise(d, sr, { decay, lp, gain });
  });
  registerSound('step_carpet', step(0.16, 55, 0.3, 55));
  registerSound('step_tile', step(0.5, 85, 0.42, 46));
  registerSound('step_vinyl', step(0.4, 75, 0.38, 50));
  registerSound('step_concrete', step(0.45, 70, 0.45, 42));
  registerSound('step_metal', step(0.6, 110, 0.42, 38));
  registerSound('step_snow', step(0.12, 45, 0.42, 30));
  registerSound('step_wood', step(0.35, 65, 0.4, 44));
  registerSound('step_drywall', step(0.4, 70, 0.4, 44));
  registerSound('step_glass', step(0.55, 90, 0.4, 44));

  // ---- doors ----
  registerSound('door_open', () => makeAudioBuffer(0.5, (d, sr) => {
    tone(d, sr, { freq: 300, decay: 24, gain: 0.14, slide: 60 });
    expNoise(d, sr, { decay: 16, lp: 0.2, gain: 0.22 });
    tone(d, sr, { freq: 90, decay: 30, gain: 0.2 });
  }));
  registerSound('door_close', () => makeAudioBuffer(0.4, (d, sr) => {
    expNoise(d, sr, { decay: 20, lp: 0.2, gain: 0.18 });
    thump(d, sr, { freq: 95, decay: 30, gain: 0.7, start: 0.16 });
    expNoise(d, sr, { decay: 60, lp: 0.4, gain: 0.4, start: 0.16 });
  }));
  registerSound('door_locked', () => makeAudioBuffer(0.28, (d, sr) => {
    tone(d, sr, { freq: 260, decay: 60, gain: 0.3, type: 'square' });
    tone(d, sr, { freq: 240, decay: 60, gain: 0.3, type: 'square', start: 0.13 });
  }));
  registerSound('door_unlock', () => makeAudioBuffer(0.35, (d, sr) => {
    tone(d, sr, { freq: 880, decay: 30, gain: 0.22 });
    tone(d, sr, { freq: 1240, decay: 30, gain: 0.22, start: 0.12 });
    expNoise(d, sr, { decay: 80, lp: 0.6, gain: 0.25, start: 0.2 });
  }));

  // ---- glass ----
  registerSound('glass_crack', () => makeAudioBuffer(0.3, (d, sr) => {
    expNoise(d, sr, { decay: 60, lp: 0.85, gain: 0.5 });
    tone(d, sr, { freq: 2400, decay: 60, gain: 0.2 });
  }));
  registerSound('glass_break', () => makeAudioBuffer(0.9, (d, sr) => {
    expNoise(d, sr, { decay: 24, lp: 0.9, gain: 0.7 });
    for (let k = 0; k < 8; k++) {
      tone(d, sr, { freq: 1800 + k * 420, decay: 30 + k * 6, gain: 0.09, start: 0.03 + k * 0.05 });
    }
    expNoise(d, sr, { decay: 12, lp: 0.75, gain: 0.3, start: 0.15 });
  }));

  // ---- combat feedback ----
  registerSound('player_hurt', () => makeAudioBuffer(0.25, (d, sr) => {
    thump(d, sr, { freq: 120, decay: 26, gain: 0.8 });
    expNoise(d, sr, { decay: 40, lp: 0.3, gain: 0.3 });
  }));
  registerSound('enemy_hurt', () => makeAudioBuffer(0.2, (d, sr) => {
    tone(d, sr, { freq: 190, decay: 32, gain: 0.3, type: 'tri' });
    expNoise(d, sr, { decay: 50, lp: 0.3, gain: 0.2 });
  }));
  registerSound('enemy_death', () => makeAudioBuffer(0.6, (d, sr) => {
    tone(d, sr, { freq: 150, decay: 12, gain: 0.28, type: 'tri', slide: -80 });
    expNoise(d, sr, { decay: 12, lp: 0.25, gain: 0.3, start: 0.2 });
    thump(d, sr, { freq: 70, decay: 24, gain: 0.7, start: 0.3 });
  }));
  registerSound('enemy_bark', () => makeAudioBuffer(0.3, (d, sr) => {
    tone(d, sr, { freq: 220, decay: 16, gain: 0.22, type: 'tri', slide: 40 });
    expNoise(d, sr, { decay: 26, lp: 0.2, gain: 0.16 });
  }));
  registerSound('bullet_whiz', () => makeAudioBuffer(0.14, (d, sr) => {
    expNoise(d, sr, { decay: 34, lp: 0.9, hp: 0.4, gain: 0.3 });
  }));

  // ---- gadgets ----
  registerSound('flash_pop', () => makeAudioBuffer(1.0, (d, sr) => {
    expNoise(d, sr, { decay: 18, lp: 0.95, gain: 0.9 });
    tone(d, sr, { freq: 3400, decay: 3.2, gain: 0.3 });
    tone(d, sr, { freq: 2900, decay: 2.4, gain: 0.18 });
    for (let i = 0; i < d.length; i++) d[i] = Math.tanh(d[i] * 1.5);
  }));
  registerSound('smoke_pop', () => makeAudioBuffer(0.8, (d, sr) => {
    thump(d, sr, { freq: 110, decay: 20, gain: 0.6 });
    expNoise(d, sr, { decay: 5, lp: 0.1, gain: 0.3 });
  }));
  registerSound('grenade_bounce', () => makeAudioBuffer(0.15, (d, sr) => {
    tone(d, sr, { freq: 700, decay: 70, gain: 0.25 });
    expNoise(d, sr, { decay: 90, lp: 0.6, gain: 0.3 });
  }));

  // ---- interactions & objectives ----
  registerSound('pickup', () => makeAudioBuffer(0.3, (d, sr) => {
    tone(d, sr, { freq: 660, decay: 24, gain: 0.25 });
    tone(d, sr, { freq: 990, decay: 24, gain: 0.22, start: 0.09 });
  }));
  registerSound('keycard_read', () => makeAudioBuffer(0.4, (d, sr) => {
    tone(d, sr, { freq: 1180, decay: 40, gain: 0.2 });
    tone(d, sr, { freq: 1560, decay: 40, gain: 0.22, start: 0.14 });
  }));
  registerSound('hostage_freed', () => makeAudioBuffer(0.5, (d, sr) => {
    expNoise(d, sr, { decay: 24, lp: 0.35, gain: 0.3 });
    tone(d, sr, { freq: 520, decay: 22, gain: 0.2, start: 0.2 });
  }));
  registerSound('hostage_secured', () => makeAudioBuffer(0.7, (d, sr) => {
    tone(d, sr, { freq: 620, decay: 15, gain: 0.24 });
    tone(d, sr, { freq: 930, decay: 15, gain: 0.24, start: 0.16 });
    tone(d, sr, { freq: 1240, decay: 13, gain: 0.26, start: 0.32 });
  }));
  registerSound('objective_ping', () => makeAudioBuffer(0.5, (d, sr) => {
    tone(d, sr, { freq: 880, decay: 14, gain: 0.22 });
    tone(d, sr, { freq: 1320, decay: 16, gain: 0.16, start: 0.1 });
  }));
  registerSound('mission_win', () => makeAudioBuffer(1.6, (d, sr) => {
    const seq = [392, 523, 659, 784];
    seq.forEach((f, i) => tone(d, sr, { freq: f, decay: 5.5, gain: 0.2, start: i * 0.17 }));
  }));
  registerSound('mission_fail', () => makeAudioBuffer(1.8, (d, sr) => {
    tone(d, sr, { freq: 220, decay: 3.2, gain: 0.26, type: 'tri' });
    tone(d, sr, { freq: 174, decay: 2.8, gain: 0.26, type: 'tri', start: 0.35 });
    tone(d, sr, { freq: 130, decay: 2.2, gain: 0.3, type: 'tri', start: 0.8 });
  }));
}
