// ---------------------------------------------------------------------------
// Ambience.  (owner: fable4)
//
// Positional room-tone emitters derived from the floor plan in
// src/map/layout.js: HVAC rumble, fluorescent fixture hum (100/120 Hz buzz
// with occasional flicker ticks), the server-room fan wall, wind at exterior
// openings, a global storm bed with gusts and distant rumble, a dripping tap
// in the restrooms and one dying light sputtering in the service corridor.
//
// Emitters are culled by listener distance with hysteresis so only the
// handful you could actually hear keep nodes alive.
// ---------------------------------------------------------------------------

import { ROOMS, FLOOR_Y } from '../map/layout.js';
import { def } from './sfx.js';

const MIN = 0.0001;

/** LFO helper: modulates an AudioParam around its scheduled value. */
function lfo(k, param, { rate = 0.1, depth = 0.1, dur = 12, type = 'sine' } = {}) {
  const o = k.ctx.createOscillator();
  o.type = type;
  o.frequency.value = rate * k.jitter(1, 0.15);
  const g = k.ctx.createGain();
  g.gain.value = depth;
  o.connect(g);
  g.connect(param);
  o.start(k.t);
  o.stop(k.t + dur + 0.1);
  k._track(o, k.t + dur + 0.1);
}

/** Standard long-form loop envelope: fade in, hold, fade out. */
function holdEnv(gain, dur, fade = 1.2) {
  return [[0, MIN], [fade, gain], [Math.max(fade + 0.1, dur - fade), gain], [dur, MIN]];
}

// ===========================================================================
// Loop recipes (finite but arbitrarily long via opts.duration)
// ===========================================================================

def('amb_hvac', { bus: 'ambience', priority: 1, ref: 2.6, max: 26 }, (k, o) => {
  const dur = o?.duration ?? 12;
  const lp = k.chain(k.filter('lowpass', 135, 0.5));
  const g = k.noise({ color: 'brown', dur, gain: 0.55, env: holdEnv(0.55, dur), dest: lp, noPitch: true });
  lfo(k, g.gain, { rate: 0.13, depth: 0.16, dur });
});

def('amb_hvac_heavy', { bus: 'ambience', priority: 1, ref: 3, max: 30 }, (k, o) => {
  const dur = o?.duration ?? 12;
  const lp = k.chain(k.filter('lowpass', 170, 0.6));
  const g = k.noise({ color: 'brown', dur, gain: 0.8, env: holdEnv(0.8, dur), dest: lp, noPitch: true });
  lfo(k, g.gain, { rate: 0.21, depth: 0.2, dur });
  // air-handler fundamental + belt harmonic
  const body = k.chain(k.filter('lowpass', 300, 2));
  k.osc({ type: 'sawtooth', freq: 49, dur, gain: 0.12, dest: body, noPitch: true, env: holdEnv(0.12, dur) });
  k.osc({ type: 'sine', freq: 98.5, dur, gain: 0.05, dest: body, noPitch: true, env: holdEnv(0.05, dur) });
});

def('amb_fluorescent', { bus: 'ambience', priority: 0, ref: 2, max: 14 }, (k, o) => {
  const dur = o?.duration ?? 12;
  // mains buzz: 120 Hz fundamental with a thin 240 Hz partial
  const buzz = k.chain(k.filter('bandpass', 120, 6), k.gainNode(1));
  k.osc({ type: 'triangle', freq: 120, dur, gain: 0.22, dest: buzz, noPitch: true, env: holdEnv(0.22, dur, 0.8) });
  k.osc({ type: 'sine', freq: 240, dur, gain: 0.05, noPitch: true, env: holdEnv(0.05, dur, 0.8) });
  // ballast hiss
  const hiss = k.chain(k.filter('bandpass', 7400, 2.5));
  k.noise({ dur, gain: 0.028, dest: hiss, noPitch: true, env: holdEnv(0.028, dur, 0.8) });
});

def('amb_server_fans', { bus: 'ambience', priority: 1, ref: 2.8, max: 26 }, (k, o) => {
  const dur = o?.duration ?? 12;
  const wall = k.chain(k.filter('bandpass', 520, 0.7));
  const g = k.noise({ color: 'pink', dur, gain: 0.85, env: holdEnv(0.85, dur), dest: wall, noPitch: true });
  lfo(k, g.gain, { rate: 0.31, depth: 0.1, dur });
  // fan whine pair (slightly detuned so they beat)
  k.osc({ type: 'sine', freq: 462, dur, gain: 0.045, noPitch: true, env: holdEnv(0.045, dur) });
  k.osc({ type: 'sine', freq: 466.5, dur, gain: 0.04, noPitch: true, env: holdEnv(0.04, dur) });
  k.osc({ type: 'sine', freq: 924, dur, gain: 0.018, noPitch: true, env: holdEnv(0.018, dur) });
});

def('amb_wind', { bus: 'ambience', priority: 1, ref: 3.4, max: 34 }, (k, o) => {
  const dur = o?.duration ?? 12;
  const f = k.filter('bandpass', 340, 0.35);
  k.chain(f);
  const g = k.noise({ color: 'pink', dur, gain: 0.5, env: holdEnv(0.5, dur, 1.6), dest: f, noPitch: true });
  lfo(k, g.gain, { rate: 0.07, depth: 0.2, dur });
  lfo(k, g.gain, { rate: 0.19, depth: 0.09, dur });
  lfo(k, f.frequency, { rate: 0.05, depth: 130, dur });
});

def('amb_storm', { bus: 'ambience', priority: 1, max: 1e9 }, (k, o) => {
  const dur = o?.duration ?? 12;
  const lp = k.chain(k.filter('lowpass', 85, 0.6));
  const g = k.noise({ color: 'brown', dur, gain: 0.42, env: holdEnv(0.42, dur, 2), dest: lp, noPitch: true });
  lfo(k, g.gain, { rate: 0.045, depth: 0.16, dur });
});

def('amb_light_buzz', { bus: 'ambience', priority: 0, ref: 1.8, max: 16 }, (k, o) => {
  const dur = o?.duration ?? 12;
  const band = k.chain(k.filter('bandpass', 760, 2.2));
  const g = k.osc({ type: 'square', freq: 119.5, dur, gain: 0.075, dest: band, noPitch: true, env: holdEnv(0.075, dur, 0.5) });
  // uneven sputter: fast-ish AM plus arcing crackle
  lfo(k, g.gain, { rate: 1.3, depth: 0.045, dur, type: 'square' });
  const arc = k.chain(k.filter('highpass', 3000, 0.8));
  k.noise({ color: 'crackle', dur, gain: 0.03, rate: 0.7, dest: arc, noPitch: true, env: holdEnv(0.03, dur, 0.5) });
});

// ===========================================================================
// Scheduled one-shots fired by the manager while an emitter is audible
// ===========================================================================

def('drip', { bus: 'ambience', priority: 0, ref: 1.4, max: 15 }, (k) => {
  k.osc({ type: 'sine', dur: 0.06, gain: 0.28, freqEnv: [[0, k.jitter(1500, 0.15)], [0.055, 560]] });
  k.ping({ at: 0.11, freq: k.jitter(980, 0.1), dur: 0.09, gain: 0.07 }); // basin echo
});

def('light_flicker', { bus: 'ambience', priority: 0, ref: 1.8, max: 16 }, (k) => {
  k.click({ freq: 3300, Q: 3, dur: 0.012, gain: 0.16 });
  // the tube stumbles: one or two short buzz gasps
  const n = 1 + Math.floor(k.rand(0, 2));
  for (let i = 0; i < n; i++) {
    k.osc({ type: 'square', at: 0.03 + i * 0.09, freq: 119, dur: 0.05, gain: 0.05, noPitch: true });
  }
});

def('storm_gust', { bus: 'ambience', priority: 0, max: 1e9 }, (k) => {
  const dur = k.rand(2.2, 3.6);
  const f = k.filter('bandpass', 420, 0.4, { glideTo: 760, glideDur: dur * 0.5 });
  k.chain(f);
  k.noise({
    color: 'pink', dur, gain: 0.34, noPitch: true,
    env: [[0, MIN], [dur * 0.4, 0.34], [dur, MIN]], dest: f,
  });
});

def('storm_rumble', { bus: 'ambience', priority: 0, max: 1e9 }, (k) => {
  const dur = k.rand(1.8, 3.0);
  const lp = k.chain(k.filter('lowpass', 62, 0.8));
  k.noise({ color: 'brown', dur, gain: 0.5, noPitch: true, env: [[0, MIN], [0.4, 0.5], [dur, MIN]], dest: lp });
  k.osc({ type: 'sine', dur: dur * 0.7, gain: 0.14, freqEnv: [[0, 44], [dur * 0.7, 30]], noPitch: true });
});

// ===========================================================================
// Emitter placement from the floor plan
// ===========================================================================

function roomCentre(id, y = 2.3) {
  const r = ROOMS.find((rm) => rm.id === id);
  if (!r) return null;
  return [(r.x0 + r.x1) / 2, FLOOR_Y[r.floor] + y, (r.z0 + r.z1) / 2];
}

/** @returns {Array<{id, sound, pos, gain, radius, schedules}>} */
export function buildEmitters() {
  const out = [];
  const add = (id, sound, pos, { gain = 1, radius = 20, schedules = [] } = {}) => {
    if (!pos && pos !== null) return;
    out.push({ id, sound, pos, gain, radius, schedules });
  };

  // Fluorescent fixtures in every strip-lit interior room.
  const fluorRooms = ['vestibule', 'openoffice', 'midcorr', 'copyroom', 'itroom', 'breakroom', 'conference', 'archive', 'restrooms'];
  for (const r of fluorRooms) {
    add(`amb-fluor-${r}`, 'amb_fluorescent', roomCentre(r, 2.5), {
      gain: 0.8, radius: 13,
      schedules: [{ sound: 'light_flicker', min: 7, max: 18, gain: 0.5 }],
    });
  }

  // HVAC rumble where ductwork runs; the mechanical room gets the plant.
  add('amb-hvac-office', 'amb_hvac', roomCentre('openoffice', 2.8), { gain: 0.8, radius: 22 });
  add('amb-hvac-exec', 'amb_hvac', roomCentre('execcorr', 2.7), { gain: 0.65, radius: 18 });
  add('amb-hvac-loading', 'amb_hvac', roomCentre('loading', 3.6), { gain: 0.7, radius: 20 });
  add('amb-hvac-mech', 'amb_hvac_heavy', roomCentre('mechanical', 1.6), { gain: 1, radius: 26 });

  // Server room fan wall.
  add('amb-server', 'amb_server_fans', roomCentre('serverroom', 1.4), { gain: 1, radius: 22 });

  // Wind at exterior openings.
  add('amb-wind-courtyard', 'amb_wind', roomCentre('courtyard', 3), { gain: 1, radius: 32 });
  add('amb-wind-apron', 'amb_wind', roomCentre('eastapron', 3), { gain: 0.9, radius: 28 });
  add('amb-wind-entrance', 'amb_wind', roomCentre('entrance', 2.6), { gain: 0.55, radius: 16 });
  add('amb-wind-garage', 'amb_wind', [27, 2.2, 12.5], { gain: 0.5, radius: 15 }); // at the shutter
  add('amb-wind-lobby', 'amb_wind', [0, 4.5, -8.2], { gain: 0.3, radius: 14 });   // curtain wall leak

  // Restroom drip: no loop bed, just the scheduled drips.
  add('amb-drip-restroom', null, roomCentre('restrooms', 1.0), {
    radius: 14,
    schedules: [{ sound: 'drip', min: 1.6, max: 4.4, gain: 1 }],
  });

  // The one dying tube in the service corridor.
  add('amb-buzz-servicecorr', 'amb_light_buzz', roomCentre('servicecorr', 2.4), {
    gain: 1, radius: 16,
    schedules: [{ sound: 'light_flicker', min: 2.2, max: 6.5, gain: 1 }],
  });

  // Global storm bed (non-positional) with gusts and distant rumble.
  add('amb-storm', 'amb_storm', null, {
    gain: 0.9, radius: Infinity,
    schedules: [
      { sound: 'storm_gust', min: 9, max: 24, gain: 1 },
      { sound: 'storm_rumble', min: 16, max: 42, gain: 0.9 },
    ],
  });

  return out;
}

const LOOP_SECONDS = 1800;          // loops are "finite" but effectively endless
const MAX_ACTIVE = 10;              // hard ceiling on live ambience voices
const HYSTERESIS = 1.15;            // stop radius = start radius * this

/**
 * Distance-culled emitter runtime. The host (AudioEngine) provides
 * `playAmbient(sound, pos, opts) -> handle{stop()}` and current time.
 */
export class AmbienceManager {
  constructor(host) {
    this.host = host;
    this.emitters = buildEmitters();
    /** @type {Map<string, {handle, timers: number[]}>} */
    this.active = new Map();
    this.enabled = false;
  }

  setEnabled(on) {
    this.enabled = on;
    if (!on) this.stopAll();
  }

  /** Called every ~0.4 s by the engine's service timer. */
  update(now, listenerPos) {
    if (!this.enabled || !listenerPos) return;
    const [lx, ly, lz] = listenerPos;
    for (const e of this.emitters) {
      const dist = e.pos
        ? Math.hypot(e.pos[0] - lx, e.pos[1] - ly, e.pos[2] - lz)
        : 0;
      const running = this.active.has(e.id);
      if (!running && dist < e.radius && this.active.size < MAX_ACTIVE) {
        this._start(e, now);
      } else if (running && dist > e.radius * HYSTERESIS) {
        this._stop(e.id);
      }
      // Scheduled one-shots while audible.
      if (this.active.has(e.id)) {
        const state = this.active.get(e.id);
        for (let i = 0; i < e.schedules.length; i++) {
          const s = e.schedules[i];
          if (now >= state.timers[i]) {
            state.timers[i] = now + s.min + Math.random() * (s.max - s.min);
            this.host.playAmbient(s.sound, e.pos, { volume: s.gain });
          }
        }
      }
    }
  }

  _start(e, now) {
    const handle = e.sound
      ? this.host.playAmbient(e.sound, e.pos, { volume: e.gain, duration: LOOP_SECONDS })
      : { stop() {} }; // schedule-only emitter (e.g. the restroom drip)
    if (!handle) return;
    const timers = e.schedules.map((s) => now + Math.random() * (s.max - s.min) * 0.5 + s.min * 0.3);
    this.active.set(e.id, { handle, timers });
  }

  _stop(id) {
    const state = this.active.get(id);
    if (!state) return;
    this.active.delete(id);
    state.handle?.stop?.(0.8);
  }

  stopAll() {
    for (const id of Array.from(this.active.keys())) this._stop(id);
  }
}
