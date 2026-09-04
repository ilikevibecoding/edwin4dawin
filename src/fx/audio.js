// Audio bus: named event hooks (doors, lift, footsteps, hangar traffic, mode changes) with positions,
// a ring buffer for debugging / tests, and lightweight procedural ambience (Web Audio oscillators +
// filtered noise) per zone so the ship hums without any audio assets. Everything is a placeholder for
// a real sound design pass: swap `synth()` for sample playback and keep the event names.
export const AUDIO_EVENTS = ["door_open", "door_close", "door_opened", "door_closed", "lift_doors", "lift_move", "lift_arrive", "footstep", "tie_launch", "tie_land", "tie_flyby", "blast_door", "alarm", "mode_exterior", "mode_interior", "console_beep"];

export function createAudioBus() {
  const log = [];
  let ctx = null;
  let master = null;
  let muted = false;
  let ambience = null;
  let listenerPos = { x: 0, y: 0, z: 0 };

  function ensureContext() {
    if (ctx) return true;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.35;
      master.connect(ctx.destination);
      return true;
    } catch (e) {
      return false;
    }
  }

  // very small synth vocabulary: a filtered noise burst and a sine blip, attenuated by distance
  function synth(name, pos) {
    if (!ctx || muted) return;
    let gain = 1;
    if (pos) {
      const d = Math.hypot(pos.x - listenerPos.x, pos.y - listenerPos.y, pos.z - listenerPos.z);
      gain = 1 / (1 + d * d * 0.02);
      if (gain < 0.01) return;
    }
    const t = ctx.currentTime;
    const g = ctx.createGain();
    g.connect(master);
    if (/door|blast|lift_doors/.test(name)) {
      // pneumatic hiss: noise through a band-pass sweep
      const len = name.startsWith("blast") ? 1.6 : 0.7;
      const buf = ctx.createBuffer(1, ctx.sampleRate * len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const f = ctx.createBiquadFilter();
      f.type = "bandpass";
      f.frequency.setValueAtTime(name.startsWith("blast") ? 220 : 900, t);
      f.frequency.exponentialRampToValueAtTime(name.startsWith("blast") ? 90 : 2400, t + len);
      f.Q.value = 1.2;
      src.connect(f).connect(g);
      g.gain.setValueAtTime(0.25 * gain, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + len);
      src.start(t);
    } else if (name === "lift_move" || name === "lift_arrive") {
      const o = ctx.createOscillator();
      o.type = "sawtooth";
      o.frequency.setValueAtTime(name === "lift_move" ? 60 : 140, t);
      o.frequency.exponentialRampToValueAtTime(name === "lift_move" ? 140 : 60, t + 1.2);
      const f = ctx.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = 400;
      o.connect(f).connect(g);
      g.gain.setValueAtTime(0.12 * gain, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 1.4);
      o.start(t);
      o.stop(t + 1.5);
    } else if (name === "footstep") {
      const o = ctx.createOscillator();
      o.type = "triangle";
      o.frequency.setValueAtTime(90 + Math.random() * 30, t);
      o.frequency.exponentialRampToValueAtTime(40, t + 0.08);
      o.connect(g);
      g.gain.setValueAtTime(0.08, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
      o.start(t);
      o.stop(t + 0.1);
    } else if (/tie_/.test(name)) {
      // the TIE scream: two detuned sawtooths sweeping down
      for (const det of [0, 7]) {
        const o = ctx.createOscillator();
        o.type = "sawtooth";
        o.frequency.setValueAtTime(880 + det * 10, t);
        o.frequency.exponentialRampToValueAtTime(220, t + 1.1);
        const f = ctx.createBiquadFilter();
        f.type = "bandpass";
        f.frequency.value = 1200;
        o.connect(f).connect(g);
        o.start(t);
        o.stop(t + 1.2);
      }
      g.gain.setValueAtTime(0.06 * gain, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
    } else if (name === "console_beep" || name === "alarm") {
      const o = ctx.createOscillator();
      o.type = "square";
      o.frequency.value = name === "alarm" ? 440 : 1400;
      o.connect(g);
      g.gain.setValueAtTime(0.04, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + (name === "alarm" ? 0.5 : 0.08));
      o.start(t);
      o.stop(t + 0.6);
    }
  }

  function startAmbience() {
    if (!ctx || ambience) return;
    // low ship hum: two detuned sines + a slow LFO on a filtered noise layer
    const g = ctx.createGain();
    g.gain.value = 0.0;
    g.connect(master);
    const o1 = ctx.createOscillator();
    o1.frequency.value = 48;
    const o2 = ctx.createOscillator();
    o2.frequency.value = 48.7;
    o1.connect(g);
    o2.connect(g);
    o1.start();
    o2.start();
    const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 180;
    const ng = ctx.createGain();
    ng.gain.value = 0.35;
    src.connect(f).connect(ng).connect(g);
    src.start();
    ambience = { gain: g, target: 0.12, noise: f };
  }

  return {
    log,
    get context() {
      return ctx;
    },
    /** Call from a user gesture (click to start). */
    unlock() {
      if (ensureContext()) {
        if (ctx.state === "suspended") ctx.resume();
        startAmbience();
      }
    },
    setListener(pos) {
      listenerPos = { x: pos.x, y: pos.y, z: pos.z };
    },
    /** Zone ambience: name selects the hum character. */
    setZone(name) {
      if (!ambience) return;
      const z = { hangar: [0.2, 400], engineering: [0.22, 120], bridge: [0.1, 220], corridor: [0.12, 180], exterior: [0.04, 90], lift: [0.16, 260] }[name] || [0.12, 180];
      ambience.target = z[0];
      ambience.noise.frequency.setTargetAtTime(z[1], ctx.currentTime, 0.8);
    },
    event(name, pos = null) {
      const entry = { t: performance.now(), name, pos: pos ? { x: +pos.x.toFixed(1), y: +pos.y.toFixed(1), z: +pos.z.toFixed(1) } : null };
      log.push(entry);
      if (log.length > 200) log.shift();
      synth(name, pos);
    },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.35;
      return muted;
    },
    update(dt) {
      if (!ambience) return;
      const g = ambience.gain.gain;
      g.value += (ambience.target - g.value) * Math.min(1, dt * 2);
    },
  };
}
