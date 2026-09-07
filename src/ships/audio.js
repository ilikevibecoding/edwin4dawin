// Ship sound: a LOW layered engine hum per audible ship, synthesised on the game's Web Audio context (no assets).
//   voice   = sawtooth at the class's f0 (70..110 Hz) + sine at 2 f0 -> resonant low-pass (400..900 Hz, opening with
//             thrust and proximity) + brown noise rumble -> gain -> stereo pan -> the ship bus -> game master
//   doppler = f * c / (c + radial speed) from the change of the camera distance between updates
//   falloff = (1 - d / AUDIO_DIST)^1.5 like the game's other positional sounds, idle ships on the pad hum at 15 %
//   landing = a triangle whine that glides down from 3.5 f0 to 1.5 f0 as the ship descends the approach column
//   take-off = departure / climb: gain surge and the low-pass thrown open
// At most MAX_VOICES voices, nearest ships first; a ship that leaves the set fades out and its voice is reused. No
// one-shot chirps: everything a ship emits is below the low-pass, so the mix's dominant frequency stays under 400 Hz.
export const MAX_VOICES = 8;
export const AUDIO_DIST = 240;        // blocks; beyond this a ship is silent
const SPEED_OF_SOUND = 340;           // blocks per second
const UPDATE_DT = 0.1;                // seconds between parameter updates (ramps hide the steps)
const RAMP = 0.12;

// two seconds of brown noise (leaky integration of white noise), normalised
function brownNoise(ctx) {
  const len = ctx.sampleRate * 2, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
  let last = 0, peak = 0;
  for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last; if (Math.abs(last) > peak) peak = Math.abs(last); }
  const k = peak > 0 ? 0.9 / peak : 1;
  for (let i = 0; i < len; i++) d[i] *= k;
  // seamless loop: cross-fade the last 2000 samples into the first
  for (let i = 0; i < 2000; i++) { const f = i / 2000; d[len - 2000 + i] = d[len - 2000 + i] * (1 - f) + d[i] * f; }
  return buf;
}

export class ShipAudio {
  constructor(gameAudio) {
    this.audio = gameAudio;
    this.ctx = gameAudio.ctx;
    this.bus = this.ctx.createGain();
    this.bus.gain.value = 1;
    this.bus.connect(gameAudio.master);
    this.brown = brownNoise(this.ctx);
    this.voices = [];
    this.timer = 0;
    this.disposed = false;
  }

  makeVoice() {
    const ctx = this.ctx, t = ctx.currentTime;
    const saw = ctx.createOscillator(); saw.type = 'sawtooth'; saw.frequency.value = 90;
    const sine = ctx.createOscillator(); sine.type = 'sine'; sine.frequency.value = 180;
    const sineGain = ctx.createGain(); sineGain.gain.value = 0.35;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 500; lp.Q.value = 0.9;
    const noise = ctx.createBufferSource(); noise.buffer = this.brown; noise.loop = true;
    const nlp = ctx.createBiquadFilter(); nlp.type = 'lowpass'; nlp.frequency.value = 260; nlp.Q.value = 0.5;
    const noiseGain = ctx.createGain(); noiseGain.gain.value = 0.4;
    const whine = ctx.createOscillator(); whine.type = 'triangle'; whine.frequency.value = 300;
    const whineGain = ctx.createGain(); whineGain.gain.value = 0;
    const gain = ctx.createGain(); gain.gain.value = 0;
    let out = gain, pan = null;
    if (ctx.createStereoPanner) { pan = ctx.createStereoPanner(); gain.connect(pan); out = pan; }
    out.connect(this.bus);
    saw.connect(lp); sine.connect(sineGain); sineGain.connect(lp); lp.connect(gain);
    noise.connect(nlp); nlp.connect(noiseGain); noiseGain.connect(gain);
    whine.connect(whineGain); whineGain.connect(gain);
    saw.start(t); sine.start(t); noise.start(t, Math.random() * 1.5); whine.start(t);
    return { saw, sine, lp, noise, nlp, noiseGain, whine, whineGain, gain, pan, ship: null, lastDist: 0, nodes: [saw, sine, noise, whine] };
  }

  // ships: the traffic's ship records (x, y, z, dist to the camera, phase, thrust, deckY, type) updated every frame
  update(dt, ships, models) {
    if (this.disposed) return;
    this.timer += dt;
    if (this.timer < UPDATE_DT) return;
    const step = this.timer; this.timer = 0;
    const ctx = this.ctx, t = ctx.currentTime;
    const near = [];
    for (const sh of ships) if (sh.dist < AUDIO_DIST) near.push(sh);
    near.sort((a, b) => a.dist - b.dist);
    const want = near.length > MAX_VOICES ? near.slice(0, MAX_VOICES) : near;
    for (const v of this.voices) if (v.ship && !want.includes(v.ship)) { v.gain.gain.setTargetAtTime(0, t, RAMP); v.whineGain.gain.setTargetAtTime(0, t, RAMP); v.ship = null; }
    for (const sh of want) {
      if (this.voices.some((v) => v.ship === sh)) continue;
      let v = this.voices.find((x) => !x.ship);
      if (!v) { if (this.voices.length >= MAX_VOICES) continue; v = this.makeVoice(); this.voices.push(v); }
      v.ship = sh; v.lastDist = sh.dist;
      const m = models[sh.type], f0 = m.engineHz * (0.9 + 0.2 * sh.thrust);
      v.saw.frequency.setValueAtTime(f0, t); v.sine.frequency.setValueAtTime(2 * f0, t);   // no glide from the previous ship's pitch
    }
    for (const v of this.voices) {
      const sh = v.ship;
      if (!sh) continue;
      const m = models[sh.type];
      const radial = (sh.dist - v.lastDist) / step;                     // blocks/s, positive when receding
      v.lastDist = sh.dist;
      const doppler = SPEED_OF_SOUND / Math.min(SPEED_OF_SOUND * 1.6, Math.max(SPEED_OF_SOUND * 0.6, SPEED_OF_SOUND + radial));
      const thrust = Math.max(0, Math.min(1, sh.thrust));
      const f0 = m.engineHz * (0.9 + 0.2 * thrust) * doppler;
      const near01 = Math.max(0, 1 - sh.dist / AUDIO_DIST), falloff = Math.pow(near01, 1.5);
      let gain = m.gain * 0.45 * falloff * (0.15 + 0.85 * thrust);
      let cutoff = 400 + 500 * near01 * thrust;
      let whine = 0, whineHz = 2 * f0;
      if (sh.phase === 'departure' || sh.phase === 'climb') { gain *= 1.5; cutoff = 900; }
      else if (sh.phase === 'approach' || sh.phase === 'touchdown') {
        const h = Math.max(0, Math.min(1, (sh.y - (sh.deckY || 0)) / 33));
        whine = 0.22 * falloff; whineHz = f0 * (1.5 + 2 * h);
      }
      const pan = this.audio.spatial({ x: sh.x, y: sh.y, z: sh.z }, AUDIO_DIST)[1];
      v.saw.frequency.setTargetAtTime(f0, t, RAMP); v.sine.frequency.setTargetAtTime(2 * f0, t, RAMP);
      v.lp.frequency.setTargetAtTime(cutoff, t, RAMP);
      v.noise.playbackRate.setTargetAtTime(0.7 + 0.6 * thrust, t, RAMP);
      v.noiseGain.gain.setTargetAtTime(0.25 + 0.35 * thrust, t, RAMP);
      v.whine.frequency.setTargetAtTime(whineHz, t, RAMP); v.whineGain.gain.setTargetAtTime(whine, t, RAMP);
      v.gain.gain.setTargetAtTime(this.audio.enabled ? gain : 0, t, RAMP);
      if (v.pan) v.pan.pan.setTargetAtTime(pan, t, RAMP);
    }
  }

  voiceCount() { let n = 0; for (const v of this.voices) if (v.ship) n++; return n; }
  // parameters of the live voices (for tests / HUD): [{ ship, f0, gain }]
  snapshot() { return this.voices.filter((v) => v.ship).map((v) => ({ ship: v.ship.name, f0: v.saw.frequency.value, gain: v.gain.gain.value, dist: v.ship.dist })); }
  stopAll() { const t = this.ctx.currentTime; for (const v of this.voices) { v.gain.gain.setTargetAtTime(0, t, RAMP); v.ship = null; } }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    const t = this.ctx.currentTime;
    for (const v of this.voices) { v.gain.gain.setTargetAtTime(0, t, 0.1); for (const n of v.nodes) { try { n.stop(t + 0.5); } catch (e) { /* already stopped */ } } }
    setTimeout(() => { try { this.bus.disconnect(); } catch (e) { /* detached */ } }, 700);
    this.voices = [];
  }
}
