// Audio hooks and procedural ambience placeholders. No audio files: a Web Audio graph produces the
// engine hum / air handling drone per zone, and `play(name, at)` is the single entry point every system
// (doors, lifts, hangar machinery, fighters) calls so real sound design can replace the placeholders
// without touching gameplay code. Audio starts on the first user gesture (browser policy).
import * as THREE from "three";

const ZONE_PROFILES = {
  tower: { hum: 55, humGain: 0.05, air: 0.018 },
  engineering: { hum: 38, humGain: 0.11, air: 0.03 },
  hangar: { hum: 46, humGain: 0.07, air: 0.045 },
  exterior: { hum: 0, humGain: 0.0, air: 0.0 },
};

export function createAudio() {
  let ctx = null;
  let master = null;
  let hum = null;
  let humGain = null;
  let air = null;
  let airGain = null;
  let zone = "tower";
  const log = [];
  const listener = new THREE.Vector3();
  const enabled = { value: true };

  function ensure() {
    if (ctx || typeof AudioContext === "undefined") return;
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = 0.6;
    master.connect(ctx.destination);
    hum = ctx.createOscillator();
    hum.type = "sawtooth";
    humGain = ctx.createGain();
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 160;
    hum.connect(lp).connect(humGain).connect(master);
    hum.start();
    // filtered noise for air handling
    const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    air = ctx.createBufferSource();
    air.buffer = buf;
    air.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 420;
    bp.Q.value = 0.6;
    airGain = ctx.createGain();
    air.connect(bp).connect(airGain).connect(master);
    air.start();
    applyZone();
  }

  function applyZone() {
    if (!ctx) return;
    const p = ZONE_PROFILES[zone] || ZONE_PROFILES.tower;
    const t = ctx.currentTime;
    hum.frequency.setTargetAtTime(Math.max(20, p.hum || 20), t, 0.5);
    humGain.gain.setTargetAtTime(p.humGain, t, 0.8);
    airGain.gain.setTargetAtTime(p.air, t, 0.8);
  }

  // short synthesized cue: [freq, duration, type]
  const CUES = {
    "door.open": [220, 0.18, "square"],
    "door.close": [180, 0.16, "square"],
    "lift.start": [140, 0.5, "sawtooth"],
    "lift.arrive": [660, 0.25, "sine"],
    "hangar.launch": [90, 1.2, "sawtooth"],
    "hangar.capture": [330, 0.6, "triangle"],
    "console.beep": [880, 0.06, "sine"],
    "alarm": [520, 0.4, "square"],
  };

  return {
    enabled,
    log,
    resume() {
      ensure();
      if (ctx && ctx.state === "suspended") ctx.resume();
    },
    setZone(z) {
      zone = z;
      applyZone();
    },
    setListener(pos) {
      listener.copy(pos);
    },
    /** name: cue id; at: object with position / getWorldPosition, or a Vector3 (attenuated by distance). */
    play(name, at = null) {
      log.push({ t: performance.now(), name });
      if (log.length > 200) log.shift();
      if (!enabled.value || !ctx) return;
      const cue = CUES[name];
      if (!cue) return;
      let dist = 0;
      if (at) {
        const p = at.isVector3 ? at : at.getWorldPosition ? at.getWorldPosition(new THREE.Vector3()) : at.position ? new THREE.Vector3(at.position.x, at.position.y, at.position.z) : null;
        if (p) dist = p.distanceTo(listener);
      }
      const gain = 0.25 / (1 + dist * dist * 0.02);
      if (gain < 0.002) return;
      const [f, dur, type] = cue;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.value = f;
      g.gain.value = 0;
      o.connect(g).connect(master);
      const t = ctx.currentTime;
      g.gain.linearRampToValueAtTime(gain, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.start(t);
      o.stop(t + dur + 0.05);
    },
    update(_dt) {},
  };
}
