// Audio placeholders: a small WebAudio bus with synthesized stand-ins for every event the ship
// emits (doors, blast doors, turbolifts, fighter launches / fly-bys, alerts, footsteps) and one
// ambience loop per zone. Real sound design later only has to replace the `synth` table entries with
// buffers; every call site already passes an event name and a world position.
import * as THREE from "three";

const EVENTS = ["door_open", "door_close", "blast_open", "blast_close", "lift_start", "lift_arrive", "tie_launch", "tie_land", "tie_flyby", "alert", "footstep", "ui"];
const ZONES = {
  default: { color: 0.3, level: 0.05 },
  bridge: { color: 0.25, level: 0.05 },
  hangar: { color: 0.6, level: 0.09 },
  reactor: { color: 0.15, level: 0.11 },
  engineering: { color: 0.35, level: 0.08 },
  corridor: { color: 0.3, level: 0.05 },
  exterior: { color: 0.0, level: 0.0 },
};

export function createAudio(camera) {
  let ctx = null;
  let master = null;
  let ambGain = null;
  let ambFilter = null;
  let enabled = true;
  let zone = "default";
  const log = [];
  const tmp = new THREE.Vector3();

  function ensure() {
    if (ctx) return true;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      return false;
    }
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
    // ambience: looping filtered noise
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      last = last * 0.96 + w * 0.04; // brownish
      d[i] = last * 3;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    ambFilter = ctx.createBiquadFilter();
    ambFilter.type = "lowpass";
    ambFilter.frequency.value = 220;
    ambGain = ctx.createGain();
    ambGain.gain.value = 0;
    src.connect(ambFilter).connect(ambGain).connect(master);
    src.start();
    applyZone();
    return true;
  }
  function applyZone() {
    if (!ctx) return;
    const z = ZONES[zone] || ZONES.default;
    ambFilter.frequency.setTargetAtTime(120 + z.color * 900, ctx.currentTime, 0.8);
    ambGain.gain.setTargetAtTime(z.level, ctx.currentTime, 1.0);
  }
  function distanceGain(pos) {
    if (!pos) return 1;
    const d = tmp.copy(pos).distanceTo(camera.position);
    return THREE.MathUtils.clamp(12 / (d + 4), 0.02, 1);
  }
  // synthesized stand-ins
  const synth = {
    door_open(t, out) {
      tone(out, t, 420, 640, 0.18, "square", 0.05);
      noise(out, t, 0.28, 1800, 0.06);
    },
    door_close(t, out) {
      tone(out, t, 640, 380, 0.18, "square", 0.05);
      noise(out, t + 0.12, 0.2, 900, 0.07);
    },
    blast_open(t, out) {
      noise(out, t, 0.9, 260, 0.14);
      tone(out, t, 70, 55, 0.9, "sawtooth", 0.05);
    },
    blast_close(t, out) {
      noise(out, t, 0.7, 200, 0.14);
      tone(out, t + 0.5, 60, 40, 0.35, "sawtooth", 0.08);
    },
    lift_start(t, out) {
      tone(out, t, 180, 330, 1.2, "sine", 0.05);
      noise(out, t, 1.4, 600, 0.03);
    },
    lift_arrive(t, out) {
      tone(out, t, 330, 180, 0.9, "sine", 0.05);
      tone(out, t + 0.6, 880, 880, 0.12, "sine", 0.04);
    },
    tie_launch(t, out) {
      tone(out, t, 900, 300, 1.1, "sawtooth", 0.05);
      noise(out, t, 1.0, 2500, 0.04);
    },
    tie_land(t, out) {
      tone(out, t, 400, 700, 0.8, "sawtooth", 0.04);
    },
    tie_flyby(t, out) {
      tone(out, t, 1200, 500, 1.4, "sawtooth", 0.04);
    },
    alert(t, out) {
      for (let i = 0; i < 3; i++) tone(out, t + i * 0.35, 520, 520, 0.2, "square", 0.05);
    },
    footstep(t, out) {
      noise(out, t, 0.06, 500, 0.05);
    },
    ui(t, out) {
      tone(out, t, 1200, 1200, 0.05, "sine", 0.04);
    },
  };
  function tone(out, t, f0, f1, dur, type, gain) {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + dur + 0.05);
  }
  function noise(out, t, dur, cutoff, gain) {
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const s = ctx.createBufferSource();
    s.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = cutoff;
    const g = ctx.createGain();
    g.gain.value = gain;
    s.connect(f).connect(g).connect(out);
    s.start(t);
  }

  const api = {
    events: EVENTS,
    zones: Object.keys(ZONES),
    /** Call from a user gesture (click) to allow playback. */
    unlock() {
      if (ensure() && ctx.state === "suspended") ctx.resume();
    },
    get enabled() {
      return enabled;
    },
    set enabled(v) {
      enabled = v;
      if (master) master.gain.value = v ? 0.5 : 0;
    },
    play(name, pos = null) {
      log.push({ name, t: performance.now(), pos: pos ? pos.toArray().map((x) => +x.toFixed(1)) : null });
      if (log.length > 200) log.shift();
      if (!enabled || !ctx || ctx.state !== "running" || !synth[name]) return;
      const g = ctx.createGain();
      g.gain.value = distanceGain(pos);
      g.connect(master);
      synth[name](ctx.currentTime, g);
    },
    setZone(name) {
      if (zone === name) return;
      zone = ZONES[name] ? name : "default";
      applyZone();
    },
    get zone() {
      return zone;
    },
    /** Recent events (for tests / future replacement work). */
    recent() {
      return log.slice(-20);
    },
  };
  return api;
}
