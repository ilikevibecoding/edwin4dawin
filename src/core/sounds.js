// Gameplay sound bank — every effect synthesized from noise/oscillator
// primitives. registerGameSounds() installs recipes into the audio engine.
// Layout: primitives, weapons, movement/world, combat feedback, interface &
// mission, ambience beds (zone layers, see ZONE_MIX in audio.js), title music.

import { registerSound, makeAudioBuffer, __audioBufferStats } from './audio.js';

// ---------------- primitives ----------------
function expNoise(d, sr, { decay = 30, lp = 1, hp = 0, gain = 1, start = 0 }) {
  let lpState = 0, hpState = 0;
  const s0 = Math.floor(start * sr);
  for (let i = s0; i < d.length; i++) {
    const t = (i - s0) / sr;
    let v = (Math.random() * 2 - 1) * Math.exp(-t * decay);
    lpState += (v - lpState) * lp;
    v = lpState;
    if (hp > 0) { hpState += (v - hpState) * hp; v = v - hpState; }
    d[i] += v * gain;
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
// Metallic ping: fundamental + inharmonic partials (bell-like, not musical).
function ping(d, sr, { freq = 3000, decay = 55, gain = 0.15, start = 0 }) {
  tone(d, sr, { freq, decay, gain, start });
  tone(d, sr, { freq: freq * 1.51, decay: decay * 1.3, gain: gain * 0.5, start });
  tone(d, sr, { freq: freq * 2.32, decay: decay * 1.7, gain: gain * 0.28, start });
}
// Seamless loop: fill (seconds + xfade) worth of samples, then fold the extra
// tail back over the head with an equal-weight crossfade — filter/LFO state
// carries across the seam without a click.
function makeLoopBuffer(seconds, fill, xfade = 0.5) {
  return makeAudioBuffer(seconds, (d, sr) => {
    const xf = Math.floor(xfade * sr);
    const tmp = new Float32Array(d.length + xf);
    fill(tmp, sr);
    d.set(tmp.subarray(0, d.length));
    for (let i = 0; i < xf; i++) {
      const w = i / xf;
      d[i] = d[i] * w + tmp[d.length + i] * (1 - w);
    }
  });
}
// Quantize a frequency to a whole number of cycles per loop so tonal layers
// (hums, fan whines, LFOs) are phase-exact across the loop seam.
const quantHz = (f, seconds) => Math.max(1, Math.round(f * seconds)) / seconds;

export function registerGameSounds() {
  // =====================================================================
  // WEAPONS — four layers per shot:
  //   1. transient crack  (wideband hp noise, 1-4 ms — the "snap")
  //   2. mid body         (lowpassed noise burst — the "bark")
  //   3. low thump        (pitch-dropping sine — chest punch)
  //   4. indoor tail      (slow dark noise — short room boom)
  // Each family gets its own balance; tanh soft-clip glues the layers.
  // =====================================================================
  const gunshot = ({ len, crackG, crackDecay = 320, crackHp = 0.3, bodyG, bodyDecay, bodyLp = 0.45, thumpF, thumpDecay, thumpG, tailG, tailDecay, tailLp = 0.1, drive = 1.7 }) =>
    () => makeAudioBuffer(len, (d, sr) => {
      expNoise(d, sr, { decay: crackDecay, lp: 1, hp: crackHp, gain: crackG });
      expNoise(d, sr, { decay: bodyDecay, lp: bodyLp, gain: bodyG });
      thump(d, sr, { freq: thumpF, decay: thumpDecay, gain: thumpG });
      expNoise(d, sr, { decay: tailDecay, lp: tailLp, gain: tailG, start: 0.012 });
      for (let i = 0; i < d.length; i++) d[i] = Math.tanh(d[i] * drive) * 0.92;
    });
  // pistol: dry snap — hard transient, tight body, short tail
  registerSound('shot_pistol', gunshot({ len: 0.42, crackG: 0.95, crackDecay: 360, bodyG: 0.7, bodyDecay: 62, bodyLp: 0.5, thumpF: 150, thumpDecay: 30, thumpG: 0.9, tailG: 0.13, tailDecay: 9 }));
  // smg: fast light crack — recognizable in bursts, decays quickly
  registerSound('shot_smg', gunshot({ len: 0.32, crackG: 0.82, crackDecay: 400, bodyG: 0.62, bodyDecay: 76, bodyLp: 0.5, thumpF: 135, thumpDecay: 33, thumpG: 0.8, tailG: 0.1, tailDecay: 11 }));
  // carbine: authoritative — full mid body, solid thump, medium tail
  registerSound('shot_carbine', gunshot({ len: 0.52, crackG: 0.88, crackDecay: 300, bodyG: 0.88, bodyDecay: 46, bodyLp: 0.42, thumpF: 105, thumpDecay: 24, thumpG: 1.0, tailG: 0.22, tailDecay: 7 }));
  // shotgun: deep boom — wide dark body, big slow thump
  registerSound('shot_shotgun', gunshot({ len: 0.7, crackG: 0.7, crackDecay: 260, crackHp: 0.22, bodyG: 1.0, bodyDecay: 30, bodyLp: 0.3, thumpF: 72, thumpDecay: 18, thumpG: 1.15, tailG: 0.3, tailDecay: 5.5, tailLp: 0.09, drive: 1.9 }));
  // precision rifle: massive crack + the longest tail in the bank
  registerSound('shot_precision', gunshot({ len: 1.0, crackG: 1.05, crackDecay: 290, crackHp: 0.4, bodyG: 0.9, bodyDecay: 26, bodyLp: 0.38, thumpF: 62, thumpDecay: 16, thumpG: 1.05, tailG: 0.42, tailDecay: 4.2, tailLp: 0.09, drive: 1.8 }));

  // distant/enemy variants: transient swallowed by walls — dark lowpassed
  // body + soft thump + proportionally larger tail
  const distantShot = ({ len, thumpF, bodyDecay, tailG }) => () => makeAudioBuffer(len, (d, sr) => {
    expNoise(d, sr, { decay: bodyDecay, lp: 0.14, gain: 0.75 });
    thump(d, sr, { freq: thumpF, decay: 20, gain: 0.55 });
    expNoise(d, sr, { decay: 5, lp: 0.07, gain: tailG, start: 0.02 });
    for (let i = 0; i < d.length; i++) d[i] = Math.tanh(d[i] * 1.3) * 0.9;
  });
  registerSound('shot_pistol_d', distantShot({ len: 0.4, thumpF: 145, bodyDecay: 52, tailG: 0.14 }));
  registerSound('shot_smg_d', distantShot({ len: 0.42, thumpF: 130, bodyDecay: 46, tailG: 0.16 }));
  registerSound('shot_carbine_d', distantShot({ len: 0.55, thumpF: 105, bodyDecay: 34, tailG: 0.24 }));
  registerSound('shot_shotgun_d', distantShot({ len: 0.7, thumpF: 80, bodyDecay: 24, tailG: 0.3 }));
  registerSound('shot_precision_d', distantShot({ len: 0.95, thumpF: 66, bodyDecay: 20, tailG: 0.4 }));

  // dry fire: hard sear click, all attack, no body
  registerSound('dry_fire', () => makeAudioBuffer(0.07, (d, sr) => {
    expNoise(d, sr, { decay: 500, lp: 1, hp: 0.35, gain: 0.5 });
    ping(d, sr, { freq: 2450, decay: 130, gain: 0.14 });
    tone(d, sr, { freq: 620, decay: 150, gain: 0.12, type: 'square' });
  }));
  // ejected casing: 2-3 inharmonic brass pings, variety via caller rateJitter
  registerSound('casing', () => makeAudioBuffer(0.5, (d, sr) => {
    ping(d, sr, { freq: 5200, decay: 46, gain: 0.11 });
    ping(d, sr, { freq: 4300, decay: 52, gain: 0.07, start: 0.12 });
    ping(d, sr, { freq: 6100, decay: 64, gain: 0.045, start: 0.21 });
  }));
  // pump: two crunchy rack stages with metallic edges
  registerSound('pump', () => makeAudioBuffer(0.32, (d, sr) => {
    expNoise(d, sr, { decay: 70, lp: 0.6, gain: 0.5 });
    ping(d, sr, { freq: 1450, decay: 90, gain: 0.09 });
    tone(d, sr, { freq: 210, decay: 60, gain: 0.2, type: 'square' });
    expNoise(d, sr, { decay: 55, lp: 0.65, gain: 0.6, start: 0.15 });
    ping(d, sr, { freq: 1150, decay: 70, gain: 0.11, start: 0.15 });
    thump(d, sr, { freq: 120, decay: 40, gain: 0.4, start: 0.15 });
  }));
  // bolt: lift ping, pull scrape, firm return clack
  registerSound('bolt_cycle', () => makeAudioBuffer(0.44, (d, sr) => {
    ping(d, sr, { freq: 1700, decay: 80, gain: 0.1 });
    expNoise(d, sr, { decay: 60, lp: 0.55, gain: 0.42 });
    expNoise(d, sr, { decay: 26, lp: 0.4, gain: 0.18, start: 0.08 });
    ping(d, sr, { freq: 1250, decay: 70, gain: 0.12, start: 0.24 });
    expNoise(d, sr, { decay: 65, lp: 0.55, gain: 0.5, start: 0.24 });
    thump(d, sr, { freq: 140, decay: 45, gain: 0.45, start: 0.25 });
  }));
  // mag out (cloth + latch) ... firm seat thock
  registerSound('reload_mag', () => makeAudioBuffer(0.6, (d, sr) => {
    expNoise(d, sr, { decay: 80, lp: 0.55, gain: 0.42 });
    ping(d, sr, { freq: 950, decay: 110, gain: 0.07 });
    expNoise(d, sr, { decay: 30, lp: 0.2, gain: 0.14, start: 0.16 });
    thump(d, sr, { freq: 150, decay: 44, gain: 0.55, start: 0.42 });
    expNoise(d, sr, { decay: 90, lp: 0.65, gain: 0.55, start: 0.42 });
    ping(d, sr, { freq: 1350, decay: 90, gain: 0.09, start: 0.43 });
  }));
  registerSound('reload_empty', () => makeAudioBuffer(0.8, (d, sr) => {
    tone(d, sr, { freq: 380, decay: 70, gain: 0.22, type: 'square' });
    expNoise(d, sr, { decay: 75, lp: 0.55, gain: 0.4, start: 0.08 });
    ping(d, sr, { freq: 1100, decay: 80, gain: 0.08, start: 0.1 });
    expNoise(d, sr, { decay: 80, lp: 0.62, gain: 0.5, start: 0.5 });
    thump(d, sr, { freq: 145, decay: 42, gain: 0.5, start: 0.5 });
    ping(d, sr, { freq: 1500, decay: 85, gain: 0.1, start: 0.62 });
  }));
  registerSound('reload_start', () => makeAudioBuffer(0.25, (d, sr) => {
    expNoise(d, sr, { decay: 65, lp: 0.5, gain: 0.4 });
    ping(d, sr, { freq: 880, decay: 100, gain: 0.06 });
  }));
  registerSound('reload_end', () => makeAudioBuffer(0.22, (d, sr) => {
    thump(d, sr, { freq: 160, decay: 50, gain: 0.4 });
    expNoise(d, sr, { decay: 95, lp: 0.7, gain: 0.4 });
    ping(d, sr, { freq: 1600, decay: 100, gain: 0.08 });
  }));
  registerSound('shell_insert', () => makeAudioBuffer(0.16, (d, sr) => {
    ping(d, sr, { freq: 780, decay: 90, gain: 0.09 });
    expNoise(d, sr, { decay: 110, lp: 0.6, gain: 0.42 });
    thump(d, sr, { freq: 170, decay: 70, gain: 0.25 });
  }));
  registerSound('weapon_draw', () => makeAudioBuffer(0.22, (d, sr) => {
    expNoise(d, sr, { decay: 40, lp: 0.4, gain: 0.32 });
    ping(d, sr, { freq: 1050, decay: 110, gain: 0.05, start: 0.06 });
  }));
  registerSound('throw', () => makeAudioBuffer(0.18, (d, sr) => expNoise(d, sr, { decay: 30, lp: 0.25, gain: 0.3 })));

  registerSound('knife_swing', () => makeAudioBuffer(0.16, (d, sr) => expNoise(d, sr, { decay: 26, lp: 0.3, hp: 0.15, gain: 0.35 })));
  registerSound('knife_hit', () => makeAudioBuffer(0.2, (d, sr) => {
    thump(d, sr, { freq: 130, decay: 40, gain: 0.6 });
    expNoise(d, sr, { decay: 60, lp: 0.5, gain: 0.4 });
  }));
  registerSound('knife_wall', () => makeAudioBuffer(0.12, (d, sr) => {
    ping(d, sr, { freq: 1500, decay: 90, gain: 0.16 });
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
  // garage shutter: motor hum + slat clatter for the 3.5s scripted travel,
  // hard stop clunk at the top (matches shutter.update() in builder.js)
  registerSound('shutter_roll', () => makeAudioBuffer(3.9, (d, sr) => {
    thump(d, sr, { freq: 70, decay: 22, gain: 0.55 });               // brake release
    expNoise(d, sr, { decay: 26, lp: 0.35, gain: 0.3 });
    tone(d, sr, { freq: 52, decay: 0.55, gain: 0.16, type: 'tri' }); // motor fundamental
    tone(d, sr, { freq: 104.3, decay: 0.6, gain: 0.09, type: 'tri' });
    tone(d, sr, { freq: 33, decay: 0.5, gain: 0.1 });
    for (let t = 0.18; t < 3.45; t += 0.19 + (t * 37 % 1) * 0.09) {  // slats over drum
      expNoise(d, sr, { decay: 150, lp: 0.45, gain: 0.16 + (t * 53 % 1) * 0.1, start: t });
      if ((t * 17 % 1) > 0.72) ping(d, sr, { freq: 900 + (t * 71 % 1) * 500, decay: 120, gain: 0.05, start: t });
    }
    thump(d, sr, { freq: 62, decay: 18, gain: 0.8, start: 3.5 });    // top stop clunk
    expNoise(d, sr, { decay: 40, lp: 0.3, gain: 0.4, start: 3.5 });
    ping(d, sr, { freq: 1300, decay: 60, gain: 0.07, start: 3.52 });
    for (let i = 0; i < d.length; i++) d[i] = Math.tanh(d[i] * 1.3) * 0.9;
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
  // heavier: sub punch + body; sfx-bus lowpass dip is triggered in audio.js
  registerSound('player_hurt', () => makeAudioBuffer(0.35, (d, sr) => {
    thump(d, sr, { freq: 85, decay: 16, gain: 1.0 });
    thump(d, sr, { freq: 55, decay: 11, gain: 0.6, start: 0.02 });
    expNoise(d, sr, { decay: 32, lp: 0.25, gain: 0.35 });
    for (let i = 0; i < d.length; i++) d[i] = Math.tanh(d[i] * 1.4) * 0.9;
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
  // near-miss: supersonic snap first, then a short whoosh
  registerSound('bullet_whiz', () => makeAudioBuffer(0.13, (d, sr) => {
    expNoise(d, sr, { decay: 450, lp: 1, hp: 0.4, gain: 0.4 });
    expNoise(d, sr, { decay: 42, lp: 0.9, hp: 0.45, gain: 0.3, start: 0.004 });
  }));
  // hit confirmation ticks (registered for the lead to wire to hit-marker events)
  registerSound('hit_tick', () => makeAudioBuffer(0.06, (d, sr) => {
    tone(d, sr, { freq: 2150, decay: 150, gain: 0.16 });
    expNoise(d, sr, { decay: 380, lp: 1, hp: 0.3, gain: 0.1 });
  }));
  registerSound('hit_kill', () => makeAudioBuffer(0.18, (d, sr) => {
    tone(d, sr, { freq: 1480, decay: 70, gain: 0.16 });
    tone(d, sr, { freq: 740, decay: 46, gain: 0.16, start: 0.035 });
    thump(d, sr, { freq: 150, decay: 40, gain: 0.3, start: 0.03 });
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
    ping(d, sr, { freq: 800, decay: 75, gain: 0.14 });
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
  // relieved two-tone: exhale of noise, then a soft rising pair
  registerSound('hostage_freed', () => makeAudioBuffer(0.6, (d, sr) => {
    expNoise(d, sr, { decay: 18, lp: 0.2, gain: 0.2 });
    tone(d, sr, { freq: 440, decay: 18, gain: 0.15, start: 0.1 });
    tone(d, sr, { freq: 587, decay: 14, gain: 0.18, start: 0.28 });
  }));
  registerSound('hostage_secured', () => makeAudioBuffer(0.7, (d, sr) => {
    tone(d, sr, { freq: 620, decay: 15, gain: 0.24 });
    tone(d, sr, { freq: 930, decay: 15, gain: 0.24, start: 0.16 });
    tone(d, sr, { freq: 1240, decay: 13, gain: 0.26, start: 0.32 });
  }));
  // colder/cleaner ping: pure fifth pair with a faint detune shimmer
  registerSound('objective_ping', () => makeAudioBuffer(0.45, (d, sr) => {
    tone(d, sr, { freq: 1320, decay: 17, gain: 0.15 });
    tone(d, sr, { freq: 1326, decay: 17, gain: 0.05 });
    tone(d, sr, { freq: 1980, decay: 24, gain: 0.08, start: 0.03 });
  }));
  // radio squelch for Overwatch subtitles (lead wires): open / close
  registerSound('radio_in', () => makeAudioBuffer(0.22, (d, sr) => {
    expNoise(d, sr, { decay: 700, lp: 1, hp: 0.3, gain: 0.28 });
    expNoise(d, sr, { decay: 30, lp: 0.85, hp: 0.5, gain: 0.1 });
    tone(d, sr, { freq: 1240, decay: 90, gain: 0.11, start: 0.04 });
    tone(d, sr, { freq: 1860, decay: 110, gain: 0.05, start: 0.04 });
  }));
  registerSound('radio_out', () => makeAudioBuffer(0.16, (d, sr) => {
    tone(d, sr, { freq: 940, decay: 110, gain: 0.1 });
    expNoise(d, sr, { decay: 45, lp: 0.8, hp: 0.5, gain: 0.08 });
    expNoise(d, sr, { decay: 800, lp: 1, hp: 0.3, gain: 0.2, start: 0.07 });
  }));
  // 4-note A-minor resolve, each note a detuned pair over a low root pad
  registerSound('mission_win', () => makeAudioBuffer(2.2, (d, sr) => {
    tone(d, sr, { freq: 110, decay: 1.6, gain: 0.12 });
    tone(d, sr, { freq: 110.4, decay: 1.6, gain: 0.08 });
    const seq = [329.63, 440, 523.25, 659.26];
    seq.forEach((f, i) => {
      tone(d, sr, { freq: f, decay: 3.4, gain: 0.15, start: i * 0.22 });
      tone(d, sr, { freq: f * 1.003, decay: 3.4, gain: 0.09, start: i * 0.22 });
    });
  }));
  // sagging low tones, each sliding flat as it decays
  registerSound('mission_fail', () => makeAudioBuffer(2.4, (d, sr) => {
    tone(d, sr, { freq: 220, decay: 2.4, gain: 0.2, type: 'tri', slide: -26 });
    tone(d, sr, { freq: 174.6, decay: 2.2, gain: 0.22, type: 'tri', slide: -22, start: 0.5 });
    tone(d, sr, { freq: 130.8, decay: 1.7, gain: 0.26, type: 'tri', slide: -16, start: 1.0 });
    expNoise(d, sr, { decay: 2.2, lp: 0.04, gain: 0.5, start: 0.9 });
  }));

  registerAmbienceBeds();
  registerTitleMusic();
}

// =====================================================================
// AMBIENCE BEDS — seamless loop layers mixed per zone (audio.js ZONE_MIX).
// All are filtered-noise processes and seam-quantized tones; loop seams are
// crossfaded inside the buffer, so a bare `loop = true` source is silent-safe.
// =====================================================================
function registerAmbienceBeds() {
  const bed = (name, seconds, fill) => registerSound(name, () => makeLoopBuffer(seconds, fill));

  // soft HVAC rumble: double-lowpassed noise with a slow breathing LFO
  bed('amb_hvac', 6, (d, sr) => {
    let a = 0, b = 0;
    const lf = quantHz(0.16, 6);
    for (let i = 0; i < d.length; i++) {
      const w = Math.random() * 2 - 1;
      a += (w - a) * 0.02;
      b += (a - b) * 0.02;
      const lfo = 0.78 + 0.22 * Math.sin(2 * Math.PI * lf * i / sr);
      d[i] = b * 4.2 * lfo;
    }
  });
  // fluorescent ballast: faint 100/120 Hz pair + 240 Hz edge + buzz grit
  bed('amb_hum', 4, (d, sr) => {
    const f1 = quantHz(100, 4), f2 = quantHz(120, 4), f3 = quantHz(240, 4);
    let p1 = 0, p2 = 0, p3 = 0;
    for (let i = 0; i < d.length; i++) {
      p1 += 2 * Math.PI * f1 / sr; p2 += 2 * Math.PI * f2 / sr; p3 += 2 * Math.PI * f3 / sr;
      d[i] = Math.sin(p1) * 0.09 + Math.sin(p2) * 0.12 + Math.sin(p3) * 0.035
           + Math.sign(Math.sin(p2)) * 0.012;
    }
  });
  // very sparse muffled building ticks (thermal creaks in the structure)
  bed('amb_ticks', 8, (d, sr) => {
    for (let k = 0; k < 6; k++) {
      expNoise(d, sr, {
        decay: 260 + Math.random() * 340,
        lp: 0.1 + Math.random() * 0.12,
        gain: 0.35 + Math.random() * 0.55,
        start: Math.random() * 7.4,
      });
    }
  });
  // airy neutral wash (lobby volume, stairwells)
  bed('amb_air', 6, (d, sr) => {
    let a = 0;
    const lf = quantHz(0.12, 6);
    for (let i = 0; i < d.length; i++) {
      a += ((Math.random() * 2 - 1) - a) * 0.06;
      d[i] = a * 1.6 * (0.8 + 0.2 * Math.sin(2 * Math.PI * lf * i / sr));
    }
  });
  // distant storm heard through the shell: dark gusting noise + low howl
  bed('amb_storm', 8, (d, sr) => {
    let a = 0, b = 0, p = 0;
    const g1 = quantHz(0.11, 8), g2 = quantHz(0.27, 8), fh = quantHz(46, 8);
    for (let i = 0; i < d.length; i++) {
      const t = i / sr;
      a += ((Math.random() * 2 - 1) - a) * 0.045;
      b += (a - b) * 0.045;
      const gust = 0.5 + 0.32 * Math.sin(2 * Math.PI * g1 * t) + 0.18 * Math.sin(2 * Math.PI * g2 * t + 1.7);
      p += 2 * Math.PI * fh / sr;
      d[i] = b * 3.2 * gust + Math.sin(p) * 0.05 * gust;
    }
  });
  // fridge compressor: motor hum that kicks in, runs ~5 s, shuts off
  bed('amb_fridge', 8, (d, sr) => {
    const f1 = quantHz(118, 8), f2 = quantHz(236, 8);
    let p1 = 0, p2 = 0, n = 0;
    for (let i = 0; i < d.length; i++) {
      const t = i / sr;
      let env = 0;
      if (t > 0.4 && t < 5.6) {
        env = Math.min(1, (t - 0.4) / 0.5) * Math.min(1, (5.6 - t) / 0.6);
      }
      p1 += 2 * Math.PI * f1 / sr; p2 += 2 * Math.PI * f2 / sr;
      n += ((Math.random() * 2 - 1) - n) * 0.12;
      d[i] = (Math.sin(p1) * 0.16 + Math.sin(p2) * 0.05 + n * 0.35) * env;
    }
  });
  // restroom vent fan: banded whir + blade tone with slight flutter
  bed('amb_vent', 5, (d, sr) => {
    let a = 0, b = 0, p = 0;
    const fb = quantHz(88, 5), fl = quantHz(1.2, 5);
    for (let i = 0; i < d.length; i++) {
      const t = i / sr;
      a += ((Math.random() * 2 - 1) - a) * 0.22;
      b += (a - b) * 0.03;
      const band = a - b; // mid-band whir
      const flutter = 1 + 0.1 * Math.sin(2 * Math.PI * fl * t);
      p += 2 * Math.PI * fb * flutter / sr;
      d[i] = band * 0.5 + Math.sin(p) * 0.07 + Math.sin(p * 2) * 0.025;
    }
  });
  // server room: dense fan drone (three quantized rotors) + faint high whine
  bed('amb_server', 6, (d, sr) => {
    const f1 = quantHz(116, 6), f2 = quantHz(174, 6), f3 = quantHz(233, 6);
    const w1 = quantHz(4150, 6), w2 = quantHz(8300, 6);
    let p1 = 0, p2 = 0, p3 = 0, q1 = 0, q2 = 0, a = 0, b = 0;
    for (let i = 0; i < d.length; i++) {
      p1 += 2 * Math.PI * f1 / sr; p2 += 2 * Math.PI * f2 / sr; p3 += 2 * Math.PI * f3 / sr;
      q1 += 2 * Math.PI * w1 / sr; q2 += 2 * Math.PI * w2 / sr;
      a += ((Math.random() * 2 - 1) - a) * 0.3;
      b += (a - b) * 0.06;
      d[i] = Math.sin(p1) * 0.1 + Math.sin(p2) * 0.07 + Math.sin(p3) * 0.05
           + (a - b) * 0.4 + b * 1.2
           + Math.sin(q1) * 0.016 + Math.sin(q2) * 0.011;
    }
  });
  // deep basement rumble: triple-lowpassed noise, very slow swell
  bed('amb_rumble', 8, (d, sr) => {
    let a = 0, b = 0, c = 0;
    const lf = quantHz(0.09, 8);
    for (let i = 0; i < d.length; i++) {
      a += ((Math.random() * 2 - 1) - a) * 0.012;
      b += (a - b) * 0.012;
      c += (b - c) * 0.012;
      d[i] = c * 6 * (0.75 + 0.25 * Math.sin(2 * Math.PI * lf * i / sr));
    }
  });
  // pipe drips: sparse plinks with a faint immediate echo
  bed('amb_drips', 8, (d, sr) => {
    for (let k = 0; k < 5; k++) {
      const st = Math.random() * 7.4;
      const f = 850 + Math.random() * 750;
      const g = 0.1 + Math.random() * 0.12;
      ping(d, sr, { freq: f, decay: 34, gain: g, start: st });
      ping(d, sr, { freq: f * 0.98, decay: 30, gain: g * 0.35, start: st + 0.13 });
    }
  });
  // blizzard wind: brighter band with two competing gust cycles
  bed('amb_wind', 8, (d, sr) => {
    let a = 0, b = 0;
    const g1 = quantHz(0.14, 8), g2 = quantHz(0.31, 8);
    for (let i = 0; i < d.length; i++) {
      const t = i / sr;
      a += ((Math.random() * 2 - 1) - a) * 0.1;
      b += (a - b) * 0.02;
      const band = a - b; // whistling band
      const gust = 0.45 + 0.35 * Math.sin(2 * Math.PI * g1 * t + 0.6) + 0.2 * Math.sin(2 * Math.PI * g2 * t);
      d[i] = (band * 1.5 + b * 1.2) * gust;
    }
  });
  // dry snow hiss against glass
  bed('amb_snowhiss', 5, (d, sr) => {
    let h = 0;
    const lf = quantHz(0.4, 5);
    for (let i = 0; i < d.length; i++) {
      const w = Math.random() * 2 - 1;
      h += (w - h) * 0.55;
      d[i] = (w - h) * 0.16 * (0.75 + 0.25 * Math.sin(2 * Math.PI * lf * i / sr));
    }
  });
}

// =====================================================================
// TITLE MUSIC — generative cold pad, original progression Am–F–C–G
// (i–VI–III–VII), 24 s seamless loop: detuned sine pairs with slow attack /
// release per chord plus a soft filtered-noise swell. Restrained by design.
// =====================================================================
function registerTitleMusic() {
  const CHORD_SEC = 6;
  const CHORDS = [
    [110, 164.81, 220, 261.63, 329.63],   // A minor
    [87.31, 130.81, 174.61, 220, 261.63], // F major
    [130.81, 196, 261.63, 329.63],        // C major
    [98, 146.83, 196, 246.94, 293.66],    // G major
  ];
  const padNote = (d, sr, { freq, start, dur, gain }) => {
    const atk = 1.7, rel = 2.4;
    const s0 = Math.floor(start * sr);
    const n = Math.min(d.length, Math.floor((start + dur + rel) * sr));
    let p1 = 0, p2 = 0;
    const det = 1.004;
    for (let i = s0; i < n; i++) {
      const t = (i - s0) / sr;
      const env = Math.min(1, t / atk) * (t > dur ? Math.exp(-(t - dur) / (rel * 0.42)) : 1);
      p1 += 2 * Math.PI * freq / sr;
      p2 += 2 * Math.PI * freq * det / sr;
      // sine pair + a whisper of triangle brightness
      d[i] += (Math.sin(p1) + Math.sin(p2) * 0.75 + Math.asin(Math.sin(p1)) * 0.1) * env * gain;
    }
  };
  registerSound('music_title', () => makeLoopBuffer(CHORD_SEC * CHORDS.length, (d, sr) => {
    CHORDS.forEach((chord, ci) => {
      const start = ci * CHORD_SEC;
      chord.forEach((f, ni) => {
        padNote(d, sr, { freq: f, start: start + ni * 0.06, dur: CHORD_SEC - 1.2, gain: ni === 0 ? 0.055 : 0.042 });
      });
      // soft noise swell cresting mid-chord
      let a = 0, b = 0;
      const s0 = Math.floor(start * sr);
      const n = Math.min(d.length, s0 + Math.floor(CHORD_SEC * sr));
      for (let i = s0; i < n; i++) {
        const t = (i - s0) / CHORD_SEC / sr; // 0..1 across the chord
        a += ((Math.random() * 2 - 1) - a) * 0.04;
        b += (a - b) * 0.04;
        d[i] += b * 1.4 * Math.sin(Math.PI * t) * 0.045;
      }
    });
  }, 2));
}

// QA/debug: build every registered buffer, report peak/rms/duration/NaN.
// Used by the audio probe via `import('/src/core/sounds.js')` in-page.
export function __audioDebugBuildAll() {
  return __audioBufferStats();
}
