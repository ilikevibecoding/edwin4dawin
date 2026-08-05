// audio.js — fully procedural WebAudio: wind ambience, generator hum, radar
// pings, klaxons, launches, explosions with distance delay, footsteps, UI.
// No audio files; every sound is synthesized.
import { clamp } from './util.js';

export function createAudio(ctx) {
  let ac = null;
  let master = null;
  let muted = false;
  let started = false;
  let windGain = null, windFilter = null;
  const pending = [];

  function ensure() {
    if (ac || muted) return !!ac;
    try {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      master = ac.createDynamicsCompressor();
      master.threshold.value = -18;
      master.knee.value = 22;
      master.ratio.value = 8;
      const vol = ac.createGain();
      vol.gain.value = ctx.settings.volume;
      master.connect(vol);
      vol.connect(ac.destination);
      api._volNode = vol;
      return true;
    } catch {
      return false;
    }
  }

  function noiseBuffer(seconds = 2, lowpassed = false) {
    const len = Math.floor(ac.sampleRate * seconds);
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (lowpassed) {
        last = last * 0.96 + w * 0.04;
        d[i] = last * 6;
      } else {
        d[i] = w;
      }
    }
    return buf;
  }
  let _noise = null, _brown = null;
  const noise = () => (_noise ??= noiseBuffer(2, false));
  const brown = () => (_brown ??= noiseBuffer(3, true));

  /** distance-based gain + speed-of-sound delay for world events */
  function spatial(pos, baseGain, ref = 60) {
    const d = pos ? pos.distanceTo(ctx.camera.position) : 0;
    const gain = baseGain * clamp(ref / Math.max(d, ref), 0.04, 1);
    const delay = d / 340;
    return { gain, delay: clamp(delay, 0, 8) };
  }

  function env(node, t0, a, peak, d, sustain = 0.0001) {
    node.gain.setValueAtTime(0.0001, t0);
    node.gain.linearRampToValueAtTime(peak, t0 + a);
    node.gain.exponentialRampToValueAtTime(Math.max(sustain, 0.0001), t0 + a + d);
  }

  // ------------------------------------------- one-shot synths
  function boom(pos, big = 1) {
    if (!ensure()) return;
    const { gain, delay } = spatial(pos, 0.9 * big, 120);
    const t0 = ac.currentTime + delay;
    // sub thump
    const osc = ac.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(clamp(90 * big, 40, 120), t0);
    osc.frequency.exponentialRampToValueAtTime(30, t0 + 0.9);
    const og = ac.createGain();
    env(og, t0, 0.005, gain * 0.9, 1.1);
    osc.connect(og); og.connect(master);
    osc.start(t0); osc.stop(t0 + 1.4);
    // noise crack + rumble
    const src = ac.createBufferSource();
    src.buffer = noise();
    const f = ac.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(clamp(3200 * big, 800, 5200), t0);
    f.frequency.exponentialRampToValueAtTime(140, t0 + 1.6);
    const ng = ac.createGain();
    env(ng, t0, 0.004, gain, 1.8);
    src.connect(f); f.connect(ng); ng.connect(master);
    src.start(t0); src.stop(t0 + 2.2);
  }

  function launchRoar(pos, big = 1) {
    if (!ensure()) return;
    const { gain, delay } = spatial(pos, 0.75 * big, 90);
    const t0 = ac.currentTime + delay;
    const src = ac.createBufferSource();
    src.buffer = brown();
    src.loop = true;
    const f = ac.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.setValueAtTime(160, t0);
    f.frequency.exponentialRampToValueAtTime(900, t0 + 0.7);
    f.frequency.exponentialRampToValueAtTime(220, t0 + 3.2);
    f.Q.value = 0.8;
    const g2 = ac.createGain();
    g2.gain.setValueAtTime(0.0001, t0);
    g2.gain.linearRampToValueAtTime(gain, t0 + 0.25);
    g2.gain.setValueAtTime(gain, t0 + 1.6);
    g2.gain.exponentialRampToValueAtTime(0.0001, t0 + 4.2);
    src.connect(f); f.connect(g2); g2.connect(master);
    src.start(t0); src.stop(t0 + 4.4);
    // crackle
    const c = ac.createBufferSource();
    c.buffer = noise();
    const cf = ac.createBiquadFilter();
    cf.type = 'highpass';
    cf.frequency.value = 1800;
    const cg = ac.createGain();
    env(cg, t0, 0.02, gain * 0.4, 2.4);
    c.connect(cf); cf.connect(cg); cg.connect(master);
    c.start(t0); c.stop(t0 + 2.6);
  }

  function beep(freq = 880, dur = 0.09, gain = 0.14, type = 'square') {
    if (!ensure()) return;
    const t0 = ac.currentTime;
    const osc = ac.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    const g2 = ac.createGain();
    env(g2, t0, 0.005, gain, dur);
    osc.connect(g2); g2.connect(master);
    osc.start(t0); osc.stop(t0 + dur + 0.1);
  }

  function klaxon(reps = 3) {
    if (!ensure()) return;
    const t0 = ac.currentTime;
    for (let i = 0; i < reps; i++) {
      const osc = ac.createOscillator();
      osc.type = 'sawtooth';
      const g2 = ac.createGain();
      const s = t0 + i * 0.62;
      osc.frequency.setValueAtTime(620, s);
      osc.frequency.linearRampToValueAtTime(440, s + 0.42);
      g2.gain.setValueAtTime(0.0001, s);
      g2.gain.linearRampToValueAtTime(0.16, s + 0.03);
      g2.gain.setValueAtTime(0.16, s + 0.4);
      g2.gain.exponentialRampToValueAtTime(0.0001, s + 0.55);
      const f = ac.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 2200;
      osc.connect(f); f.connect(g2); g2.connect(master);
      osc.start(s); osc.stop(s + 0.6);
    }
  }

  function radarPing() {
    if (!ensure()) return;
    const t0 = ac.currentTime;
    const osc = ac.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1240, t0);
    osc.frequency.exponentialRampToValueAtTime(880, t0 + 0.18);
    const g2 = ac.createGain();
    env(g2, t0, 0.004, 0.1, 0.3);
    osc.connect(g2); g2.connect(master);
    osc.start(t0); osc.stop(t0 + 0.4);
  }

  function footstep(sprint) {
    if (!ensure()) return;
    const t0 = ac.currentTime;
    const src = ac.createBufferSource();
    src.buffer = noise();
    src.playbackRate.value = 0.6 + Math.random() * 0.25;
    const f = ac.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 340 + Math.random() * 160;
    const g2 = ac.createGain();
    env(g2, t0, 0.003, sprint ? 0.11 : 0.07, 0.09);
    src.connect(f); f.connect(g2); g2.connect(master);
    src.start(t0); src.stop(t0 + 0.16);
  }

  function whooshBy(pos, speed) {
    if (!ensure()) return;
    const { gain, delay } = spatial(pos, clamp(speed / 900, 0.2, 0.7), 50);
    const t0 = ac.currentTime + delay;
    const src = ac.createBufferSource();
    src.buffer = noise();
    const f = ac.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.setValueAtTime(2400, t0);
    f.frequency.exponentialRampToValueAtTime(320, t0 + 0.8);
    f.Q.value = 1.4;
    const g2 = ac.createGain();
    env(g2, t0, 0.12, gain, 0.7);
    src.connect(f); f.connect(g2); g2.connect(master);
    src.start(t0); src.stop(t0 + 1.1);
  }

  // ------------------------------------------- ambient loops
  function startAmbient() {
    if (!ensure() || started) return;
    started = true;
    // wind
    const src = ac.createBufferSource();
    src.buffer = brown();
    src.loop = true;
    windFilter = ac.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.value = 300;
    windFilter.Q.value = 0.4;
    windGain = ac.createGain();
    windGain.gain.value = 0.05;
    src.connect(windFilter); windFilter.connect(windGain); windGain.connect(master);
    src.start();
    // generator hum (nearest generator, approximated globally + distance gain)
    const hum = ac.createOscillator();
    hum.type = 'sawtooth';
    hum.frequency.value = 55;
    const humF = ac.createBiquadFilter();
    humF.type = 'lowpass';
    humF.frequency.value = 180;
    const humG = ac.createGain();
    humG.gain.value = 0.0;
    hum.connect(humF); humF.connect(humG); humG.connect(master);
    hum.start();
    api._humG = humG;
  }

  // ------------------------------------------- event wiring
  ctx.events.on('fx-launch', ({ pos, scale }) => launchRoar(pos, scale));
  ctx.events.on('fx-explosion', ({ pos, scale }) => boom(pos, scale));
  ctx.events.on('footstep', ({ sprint }) => footstep(sprint));
  ctx.events.on('threat-tracked', () => { radarPing(); });
  ctx.events.on('scenario-started', () => klaxon(3));
  ctx.events.on('threat-impact', ({ onBase }) => { if (onBase) klaxon(2); });
  ctx.events.on('track-assigned', () => beep(980, 0.07, 0.12));
  ctx.events.on('launch-authorized', () => { beep(760, 0.09); setTimeout(() => beep(760, 0.09), 140); });
  ctx.events.on('intercept-success', () => { beep(1180, 0.1, 0.14, 'sine'); setTimeout(() => beep(1560, 0.14, 0.14, 'sine'), 130); });
  ctx.events.on('intercept-miss', () => beep(300, 0.3, 0.13, 'sawtooth'));
  ctx.events.on('ui-click', () => beep(1320, 0.04, 0.07, 'sine'));

  let flybyCooldown = 0;

  const api = {
    get muted() { return muted; },
    setMuted(v) {
      muted = v;
      if (api._volNode) api._volNode.gain.value = v ? 0 : ctx.settings.volume;
    },
    setVolume(v) {
      ctx.settings.volume = v;
      if (api._volNode && !muted) api._volNode.gain.value = v;
    },
    unlock() {
      if (!ensure()) return;
      if (ac.state === 'suspended') ac.resume().catch(() => {});
      startAmbient();
    },
    beep, klaxon, radarPing, boom, launchRoar,
    update(dt) {
      if (!ac || !started) return;
      // wind loudness follows weather wind + slight movement
      const w = ctx.world.wind.length();
      if (windGain) windGain.gain.value = clamp(0.03 + w * 0.012, 0.02, 0.14);
      if (windFilter) windFilter.frequency.value = 240 + w * 30;
      // generator hum by proximity
      if (api._humG && ctx.base?.generators?.length) {
        let best = 1e9;
        for (const g2 of ctx.base.generators) {
          best = Math.min(best, g2.position.distanceTo(ctx.camera.position));
        }
        api._humG.gain.value = clamp(0.09 * (14 / Math.max(best, 6)), 0, 0.09);
      }
      // interceptor flybys
      flybyCooldown -= dt;
      if (flybyCooldown <= 0) {
        for (const it of ctx.interceptors?.active ?? []) {
          const d = it.pos.distanceTo(ctx.camera.position);
          if (d < 320 && it.vel.length() > 250) {
            whooshBy(it.pos, it.vel.length());
            flybyCooldown = 1.4;
            break;
          }
        }
      }
    },
  };
  return api;
}
