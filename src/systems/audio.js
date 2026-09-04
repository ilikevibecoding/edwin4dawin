// Procedural sound design layer for the ISD Redoubt (owner: audio placeholders workstream).
// No audio files: every sound is synthesised with WebAudio the moment it is needed. Callers never touch the
// graph — they call `audio.event(name, data)` and `audio.setRoom(profile)`, so a future asset pass can swap
// any synth for a decoded sample (see "REPLACING A SYNTH WITH AN ASSET") without touching a single caller.
//
// PUBLIC API (stable — main.js, doors.js, lifts.js, lighting.js, interact.js, fighters rely on it)
//   start(ctx?)               create the AudioContext + graph. Idempotent. Safe without a user gesture: a
//                             suspended context resumes on the next pointer / key gesture. `ctx` lets tests
//                             pass an OfflineAudioContext. No-op (enabled=false) when WebAudio is missing.
//   setRoom(profile | def)    crossfade the ambience to a room profile (~1 s). Accepts the legacy
//                             { hum, air, cutoff } triple, the extended shape below, or a room def from
//                             layout.js (then the built-in table is used). Extra layers missing from the
//                             argument are filled from the built-in table for the current room.
//   event(name, data)         fire a one-shot (EVENTS below). Always appended to `log` and dispatched to
//                             `on()` handlers, even when audio is disabled or muted.
//   on(name, fn)              subscribe to events (fn(data)).
//   update(dt)                optional per-frame tick: alert klaxon follows SYSTEMS.lighting.alert, safety
//                             time-outs. A cheap 200 ms interval started by start() does the same job when
//                             main.js does not call it. Allocation-free.
//   listener                  {x,y,z} the distance / panning reference (main.js assigns player.position).
//                             In exterior mode (player.enabled === false) the camera position is used.
//   volume(v) / mute(on?)     master level, clamped to MASTER_MAX (0.6) / mute toggle (also key M).
//   rideHum(on)               turbolift cab hum (driven automatically by lift_start / lift_arrive).
//   registerSample(key, buf)  asset hook — see below.
//   profileFor(def)           built-in ambience profile for a room def (also exported as roomProfile()).
//   graph()                   counters for tests: { state, nodes, voices, layers, timers, klaxon, ride, … }.
//   dispose()                 stop everything and close the context (start() may be called again).
//   enabled, muted, log (last 200 events: { name, t, kind, played, gain, pan }), profile, ctx
//
// EVENTS — name · data fields · synthesis. Positional events read data.position ({x,y,z} or [x,y,z]);
// distance gain is a smooth roll-off to 0 at the event's range, panning is a StereoPannerNode driven by the
// camera's right vector. Fighter events are attenuated by 0.3 when heard from another cluster (bulkheads).
//   door_open      { position, kind:'slide'|'blast'|'secure', id }
//                  slide  : pneumatic hiss (band-passed noise sweep) + servo whir, release click
//                  blast  : heavy motor rumble (detuned saws + brown noise through a moving low-pass) with a
//                           clank at the start; door height (layout DOORS[id].h) scales pitch and duration
//                  secure : two-tone access chirp, then the slide hiss
//   door_close     { position, kind, id }   same voices reversed; slide adds a latch clank, blast a heavy
//                  clank + sub thud when the halves meet, secure a lock tone
//   lift_start     { position }   relay click + motor spin-up (60→190 Hz saw, opening low-pass); the cab ride
//                  hum then stays on until lift_arrive (rideHum(true), 25 s safety time-out)
//   lift_arrive    { position }   spin-down + two-note arrival chime; ride hum fades out
//   fighter_launch { position?, id? }   twin-ion-engine style scream: two detuned saws + a sub square
//                  sweeping 1500→270 Hz through a tracking band-pass and a soft-clip wave-shaper, 27 Hz ion
//                  tremolo, band-passed hiss sweeping down. Original synthesis, range 400 m.
//   field_pass     { position?, id? }   containment-field crackle: gated noise bursts (high-passed) + zap
//                  slide + sub pop, range 250 m
//   depart / return{ position?, id? }   fly-by whoosh: band-passed noise + saw engine tone with a
//                  doppler-like pitch slide (depart falls, return rises then settles), pan sweeps across
//   dock           { position?, id? }   tractor clamp thud (75→38 Hz) + metallic clank + hydraulic hiss
//   alert          {}   two-tone klaxon loop (non-positional); stops when SYSTEMS.lighting.alert < 0.05
//                  (polled by update()); 12 s safety stop when no lighting controller is reachable
//   ui_open / ui_choose / ui_cancel / ui_hover / ui_toast   soft sine blips (auto-hooked to the HUD menu and
//                  interaction prompt when SYSTEMS.hud is reachable; the fighters/HUD never call these)
//   launch         { id, … }   alias emitted by fighter traffic → fighter_launch (de-duplicated within 400 ms)
//   any other name is logged and dispatched to handlers only.
//
// PROFILE SHAPE (every field optional; legacy { hum, air, cutoff } still works; unknown fields ignored)
//   hum 0..1      electrical hum bed (48 / 96.5 / 144 Hz sines)
//   air 0..1      filtered air-handling noise (stereo)      cutoff Hz   its low-pass cutoff
//   throb 0..1    reactor sub-bass pulse (34 + 51 Hz sines under a 0.45 Hz LFO, brown rumble)
//   whine 0..1    hyperdrive whine sweeping slowly up and down (saw 580..1060 Hz, band-passed, shimmer)
//   wind 0..1     wide airy roar with gusts (hangar)         drone 0..1  low beating drone (detention)
//   tone 0..1     clean high sines (medbay)                  warm 0..1   warm low triangle hum (mess)
//   beeps         'console' (random soft chirps) | 'monitor' (steady heartbeat blip) | 'none'
//   beepRate      console chirps per minute                  clanks 0..1 distant machinery clank density
//   swoosh 0..1   distant door swoosh density                space 'small'|'medium'|'large'|'huge' reverb
//   crowd false   reserved (no NPCs yet; ignored)            id   room id (filled in by setRoom)
//
// REPLACING A SYNTH WITH AN ASSET LATER
//   1. `ctx.decodeAudioData(bytes).then((buf) => audio.registerSample("door_open:blast", buf))` — keys are
//      `${event}:${kind}` or `${event}` (kind-less fallback).
//   2. event() plays a registered sample through the same spatial chain (distance gain, pan, reverb sends)
//      instead of the synth. Nothing else changes.
//   3. Ambience: swap one entry of `buildAmbience()` for a looping AudioBufferSourceNode feeding the same
//      layer gain node; setRoom() keeps working because it only drives the gains.
import { SYSTEMS } from "../core/systems.js";
import { ROOM_BY_ID, DOORS } from "../core/layout.js";

export const MASTER_MAX = 0.6;
export const EVENT_MAX = 0.5;
const MAX_VOICES = 24;
const XFADE = 0.33; // setTargetAtTime time constant: 3τ ≈ 1 s crossfade
const GESTURES = ["pointerdown", "keydown", "touchend", "click"];
const DOOR_BY_ID = Object.fromEntries(DOORS.map((d) => [d.id, d]));

// full-scale level of each ambience layer at profile value 1
const LAYER_LEVEL = { hum: 0.08, air: 0.05, throb: 0.14, whine: 0.02, wind: 0.07, drone: 0.06, tone: 0.014, warm: 0.05 };
// reverb send levels per room size (small = 0.55 s IR, large = 2.6 s IR)
const SPACES = {
  small: { small: 0.22, large: 0.0 },
  medium: { small: 0.18, large: 0.12 },
  large: { small: 0.1, large: 0.3 },
  huge: { small: 0.05, large: 0.5 },
};
const EVENT_GAIN = { door_open: 0.35, door_close: 0.35, lift_start: 0.4, lift_arrive: 0.35, fighter_launch: 0.5, field_pass: 0.4, depart: 0.45, return: 0.45, dock: 0.45 };
const EVENT_RANGE = { door_open: 45, door_close: 45, lift_start: 30, lift_arrive: 30, fighter_launch: 400, field_pass: 250, depart: 600, return: 600, dock: 200 };

const GENERIC = { hum: 0.5, air: 0.5, cutoff: 400, throb: 0, whine: 0, wind: 0, drone: 0, tone: 0, warm: 0, beeps: "none", beepRate: 6, clanks: 0, swoosh: 0, space: "small", crowd: false };
const CORRIDOR = { hum: 0.5, air: 0.5, cutoff: 400, swoosh: 0.6, space: "small" };
const LOBBY = { hum: 0.5, air: 0.5, cutoff: 400, swoosh: 0.4, space: "small" };

/** Built-in ambience per room id (a room entry replaces the accent / cluster fallbacks, it is not merged). */
export const ROOM_PROFILES = {
  // engineering
  reactor: { hum: 1, air: 0.4, cutoff: 260, throb: 1, clanks: 0.25, space: "huge" },
  hyperdrive: { hum: 0.9, air: 0.3, cutoff: 500, whine: 1, throb: 0.3, space: "large" },
  engineering: { hum: 0.7, air: 0.4, cutoff: 500, throb: 0.35, beeps: "console", beepRate: 8, space: "medium" },
  life_support: { hum: 0.5, air: 0.9, cutoff: 700, wind: 0.3, clanks: 0.35, space: "large" },
  eng_corridor: { ...CORRIDOR, hum: 0.55, throb: 0.15 },
  eng_lobby: { ...LOBBY, throb: 0.15 },
  // hangar deck
  hangar: { hum: 0.4, air: 1, cutoff: 900, wind: 1, clanks: 1, space: "huge" },
  shuttle_bay: { hum: 0.4, air: 0.8, cutoff: 800, wind: 0.7, clanks: 0.6, space: "huge" },
  fighter_maint: { hum: 0.5, air: 0.7, cutoff: 700, wind: 0.3, clanks: 0.8, space: "large" },
  cargo_bay: { hum: 0.4, air: 0.6, cutoff: 600, wind: 0.2, clanks: 0.5, space: "large" },
  repair_bay: { hum: 0.5, air: 0.6, cutoff: 700, clanks: 0.7, beeps: "console", beepRate: 3, space: "large" },
  hangar_lobby: { ...LOBBY, wind: 0.15, swoosh: 0.5 },
  flight_control: { hum: 0.4, air: 0.4, cutoff: 700, wind: 0.2, beeps: "console", beepRate: 14, space: "small" },
  // command tower
  bridge: { hum: 0.3, air: 0.35, cutoff: 600, beeps: "console", beepRate: 10, space: "medium" },
  tactical: { hum: 0.35, air: 0.35, cutoff: 600, beeps: "console", beepRate: 8, space: "medium" },
  nav_station: { hum: 0.35, air: 0.35, cutoff: 600, beeps: "console", beepRate: 8, space: "medium" },
  comms: { hum: 0.35, air: 0.35, cutoff: 650, beeps: "console", beepRate: 12, space: "medium" },
  observation: { hum: 0.25, air: 0.3, cutoff: 500, tone: 0.15, space: "medium" },
  intelligence: { hum: 0.35, air: 0.3, cutoff: 450, drone: 0.2, beeps: "console", beepRate: 5, space: "small" },
  briefing: { hum: 0.35, air: 0.4, cutoff: 500, space: "medium" },
  officers_quarters: { hum: 0.3, air: 0.35, cutoff: 400, warm: 0.4, space: "small" },
  cmd_corridor: { ...CORRIDOR, swoosh: 0.7 },
  lift_lobby_tower: { ...LOBBY },
  // crew deck
  crew_lobby: { ...LOBBY },
  crew_corridor: { ...CORRIDOR },
  crew_connector: { ...CORRIDOR, swoosh: 0.4 },
  crew_corridor_fwd: { ...CORRIDOR },
  crew_quarters: { hum: 0.3, air: 0.4, cutoff: 380, warm: 0.5, space: "small" },
  mess: { hum: 0.45, air: 0.45, cutoff: 450, warm: 1, clanks: 0.2, space: "medium" },
  lounge: { hum: 0.35, air: 0.4, cutoff: 500, warm: 0.6, beeps: "console", beepRate: 4, space: "medium" },
  medbay: { hum: 0.3, air: 0.35, cutoff: 900, tone: 1, beeps: "monitor", space: "small" },
  armory: { hum: 0.4, air: 0.4, cutoff: 400, drone: 0.3, space: "small" },
  detention: { hum: 0.35, air: 0.3, cutoff: 300, drone: 1, swoosh: 0.2, space: "medium" },
  escape_pods: { hum: 0.45, air: 0.5, cutoff: 450, beeps: "console", beepRate: 4, space: "medium" },
};
const ACCENT_PROFILES = {
  corridor: CORRIDOR,
  bridge: { hum: 0.3, air: 0.35, cutoff: 600, beeps: "console", beepRate: 8, space: "medium" },
  hangar: { hum: 0.4, air: 0.8, cutoff: 800, wind: 0.5, clanks: 0.6, space: "large" },
  engineering: { hum: 0.6, air: 0.4, cutoff: 500, throb: 0.3, space: "medium" },
  reactor: ROOM_PROFILES.reactor,
  hyperdrive: ROOM_PROFILES.hyperdrive,
  crew: { hum: 0.3, air: 0.4, cutoff: 400, warm: 0.4, space: "small" },
  medbay: ROOM_PROFILES.medbay,
  detention: { hum: 0.35, air: 0.3, cutoff: 300, drone: 0.8, space: "medium" },
  mess: ROOM_PROFILES.mess,
};
const CLUSTER_PROFILES = {
  tower: { hum: 0.35, air: 0.35, cutoff: 500, space: "medium" },
  hangar: { hum: 0.4, air: 0.7, cutoff: 700, wind: 0.3, space: "large" },
  engineering: { hum: 0.6, air: 0.4, cutoff: 450, throb: 0.2, space: "medium" },
  crew: { hum: 0.4, air: 0.4, cutoff: 400, warm: 0.3, space: "small" },
};

/** Complete ambience profile for a room def (id → accent → cluster → generic). `def` may be null. */
export function roomProfile(def) {
  const p = { ...GENERIC };
  if (!def) return p;
  Object.assign(p, ROOM_PROFILES[def.id] || ACCENT_PROFILES[def.accent] || CLUSTER_PROFILES[def.cluster] || {});
  p.id = def.id;
  return p;
}

const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const rand = (a, b) => a + Math.random() * (b - a);
const num = (v, d) => (typeof v === "number" && Number.isFinite(v) ? v : d);
const px = (p) => (p.x !== undefined ? p.x : p[0]);
const py = (p) => (p.y !== undefined ? p.y : p[1]);
const pz = (p) => (p.z !== undefined ? p.z : p[2]);
const MIN = 0.0001; // exponential ramps cannot reach 0

export class AudioSystem {
  constructor() {
    this.ctx = null;
    this.enabled = false;
    this.listener = null; // Vector3 to measure distance from
    this.ambience = null;
    this.room = null; // legacy alias of `profile`
    this.profile = null;
    this.handlers = new Map();
    this.log = [];
    this.muted = false;
    this.samples = new Map();
    this._volume = 0.5;
    this._offline = false;
    this._pendingResume = false;
    this._resumeFn = null;
    this._timers = new Map(); // timeout id -> tag
    this._voiceEnds = []; // wall-clock end times of live one-shots (voice cap that works while suspended)
    this._nodes = 0;
    this._persistent = []; // never-ending sources (ambience oscillators / noise), stopped by dispose()
    this._profileToken = 0;
    this._klaxon = { active: false, until: 0 };
    this._ride = null;
    this._interval = null;
    this._lastTick = 0;
    this._hooked = false;
    this._softCurve = null;
    this._onKey = (e) => {
      if (e.code === "KeyM" && !e.repeat && !e.ctrlKey && !e.metaKey && !e.altKey) this.mute();
    };
    if (typeof window !== "undefined") window.addEventListener("keydown", this._onKey);
  }

  // ---------------------------------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------------------------------

  /** Create the context and the ambience graph. Idempotent; resumes a suspended context when re-called. */
  start(externalCtx = null) {
    if (this.ctx) {
      if (!this._offline && this.ctx.state === "suspended") this._resume();
      this._hook();
      return;
    }
    if (externalCtx) this.ctx = externalCtx;
    else {
      const AC = typeof window !== "undefined" && (window.AudioContext || window.webkitAudioContext);
      if (!AC) return;
      try {
        this.ctx = new AC({ latencyHint: "interactive" });
      } catch {
        this.ctx = null;
        return;
      }
    }
    const c = this.ctx;
    this._offline = typeof c.startRendering === "function";
    try {
      // master → soft limiter → destination. Nothing can clip: the limiter catches stacked events.
      this.limiter = this._n(c.createDynamicsCompressor());
      this.limiter.threshold.value = -8;
      this.limiter.knee.value = 6;
      this.limiter.ratio.value = 12;
      this.limiter.attack.value = 0.002;
      this.limiter.release.value = 0.2;
      this.limiter.connect(c.destination);
      this.master = this._gain(this.muted ? 0 : this._volume, this.limiter);
      // one-shot voices: dry + two reverb sends whose levels follow the room profile
      this.voiceBus = this._gain(1, this.master);
      this.sendSmall = this._gain(SPACES.small.small);
      this.sendLarge = this._gain(SPACES.small.large);
      this.voiceBus.connect(this.sendSmall);
      this.voiceBus.connect(this.sendLarge);
      this.convSmall = this._n(c.createConvolver());
      this.convSmall.buffer = this._impulse(0.55, 3.0, 0.004);
      this.convLarge = this._n(c.createConvolver());
      this.convLarge.buffer = this._impulse(2.6, 2.2, 0.014);
      this.sendSmall.connect(this.convSmall).connect(this.master);
      this.sendLarge.connect(this.convLarge).connect(this.master);
      this._buffers = { white: this._noiseBuffer(2, 2, false), brown: this._noiseBuffer(1, 2, true) };
      this.enabled = true;
      this.buildAmbience();
    } catch (err) {
      // a broken WebAudio implementation must never take the app down
      this.enabled = false;
      this.ambience = null;
      console.warn("[audio] disabled:", err && err.message ? err.message : err);
      return;
    }
    if (this.profile) {
      this._applyProfile(this.profile);
      this._scheduleAmbient(this.profile);
    }
    if (!this._offline && c.state !== "running") this._armResume();
    this._hook();
    if (!this._offline && !this._interval && typeof setInterval === "function") this._interval = setInterval(() => this._tick(), 200);
  }

  /** Stop everything and close the context. start() may be called again afterwards. */
  dispose() {
    this._clearTimers();
    if (this._interval) clearInterval(this._interval);
    this._interval = null;
    this._klaxon.active = false;
    this._ride = null;
    for (const s of this._persistent) {
      try {
        s.stop();
      } catch {
        /* already stopped */
      }
    }
    this._persistent = [];
    this._voiceEnds.length = 0;
    if (this._resumeFn) this._disarmResume();
    const c = this.ctx;
    this.ctx = null;
    this.ambience = null;
    this.enabled = false;
    this._nodes = 0;
    if (c && !this._offline && typeof c.close === "function") c.close().catch(() => {});
    this._offline = false;
  }

  _resume() {
    const c = this.ctx;
    if (!c || c.state !== "suspended") return;
    const p = c.resume();
    if (p && p.catch) p.catch(() => {});
    if (c.state !== "running") this._armResume();
  }

  /** The context was created without a gesture: resume it on the first pointer / key gesture. */
  _armResume() {
    if (this._pendingResume || typeof window === "undefined") return;
    this._pendingResume = true;
    this._resumeFn = () => {
      const c = this.ctx;
      if (!c) return this._disarmResume();
      const p = c.resume();
      const done = () => {
        if (this.ctx && this.ctx.state === "running") this._disarmResume();
      };
      if (p && p.then) p.then(done, () => {});
      else done();
    };
    for (const ev of GESTURES) window.addEventListener(ev, this._resumeFn, true);
    if (this.ctx) {
      this.ctx.onstatechange = () => {
        if (this.ctx && this.ctx.state === "running") this._disarmResume();
      };
    }
  }

  _disarmResume() {
    if (!this._pendingResume) return;
    this._pendingResume = false;
    for (const ev of GESTURES) window.removeEventListener(ev, this._resumeFn, true);
    this._resumeFn = null;
  }

  /** Lazy hooks into systems that exist only after main.js filled SYSTEMS. Only for the registered instance. */
  _hook() {
    if (this._hooked) return;
    if (SYSTEMS.audio && SYSTEMS.audio !== this) {
      this._hooked = true; // a standalone instance (tests) never wraps the shared systems
      return;
    }
    const F = SYSTEMS.fighters;
    const tr = F && F.traffic;
    const hud = SYSTEMS.hud;
    if (!tr && !hud) return; // SYSTEMS not filled yet: try again on the next start()/tick
    this._hooked = true;
    if (tr && typeof tr.on === "function" && !tr.__audioHooked) {
      tr.__audioHooked = true;
      tr.on("launch", (d) => {
        // the hangar module may also call audio.event('fighter_launch') itself: avoid a double
        if (!this._recent("fighter_launch", d && d.id, 400)) this.event("fighter_launch", d || {});
      });
      for (const ev of ["field_pass", "depart", "return", "dock"]) tr.on(ev, (d) => this.event(ev, d || {}));
    }
    if (hud && !hud.__audioHooked && typeof hud.showMenu === "function") {
      hud.__audioHooked = true;
      const showMenu = hud.showMenu.bind(hud);
      hud.showMenu = (title, items, onChoose) => {
        this.event("ui_open", { title });
        return showMenu(title, items, (k) => {
          this.event(k === null ? "ui_cancel" : "ui_choose", { index: k });
          onChoose(k);
        });
      };
      if (typeof hud.showPrompt === "function") {
        const showPrompt = hud.showPrompt.bind(hud);
        hud.showPrompt = (key, label) => {
          this.event("ui_hover", { label });
          return showPrompt(key, label);
        };
      }
    }
  }

  _recent(name, id, ms) {
    const now = performance.now();
    for (let i = this.log.length - 1; i >= 0; i--) {
      const e = this.log[i];
      if (now - e.t > ms) return false;
      if (e.name === name && (id === undefined || e.id === id)) return true;
    }
    return false;
  }

  // ---------------------------------------------------------------------------------------------------
  // Ambience
  // ---------------------------------------------------------------------------------------------------

  /** Persistent layers; setRoom() only moves their gains. Each `this.ambience.<layer>` is a GainNode. */
  buildAmbience() {
    const M = this.master;
    const layer = () => this._gain(0, M);
    // electrical hum: 48 Hz + detuned octave + faint 3rd harmonic
    const hum = layer();
    this._free("sine", 48, hum);
    this._free("sine", 96.5, hum);
    this._free("sine", 144, this._gain(0.35, hum));
    // air handling: stereo noise through a low-pass whose cutoff is the profile's `cutoff`
    const air = layer();
    const lp = this._filter("lowpass", 400, 0.7, air);
    this._freeNoise("white", lp);
    // reactor throb: sub sines + brown rumble, amplitude pulsed by a slow LFO
    const throb = layer();
    const throbLp = this._filter("lowpass", 120, 0.8, throb);
    const throbVca = this._gain(0.6, throbLp);
    this._lfo(0.45, 0.4, throbVca.gain);
    this._free("sine", 34, throbVca);
    this._free("sine", 51, this._gain(0.6, throbVca));
    this._freeNoise("brown", this._gain(0.5, throbVca));
    // hyperdrive whine: saw sweeping slowly up and down through a band-pass, plus an octave shimmer
    const whine = layer();
    const whineBp = this._filter("bandpass", 820, 2.5, whine);
    const whineOsc = this._free("sawtooth", 820, whineBp);
    this._lfo(0.07, 240, whineOsc.frequency).gain.connect(whineBp.frequency);
    this._free("sine", 1640, this._gain(0.3, whine));
    // hangar roar: wide band-passed noise with slow frequency drift and gusts, plus an airy high band
    const wind = layer();
    const windVca = this._gain(0.7, wind);
    this._lfo(0.17, 0.3, windVca.gain);
    const windBp = this._filter("bandpass", 330, 0.7, windVca);
    this._lfo(0.11, 120, windBp.frequency);
    this._freeNoise("white", windBp);
    const windHi = this._filter("bandpass", 1400, 0.5, this._gain(0.35, windVca));
    this._freeNoise("white", windHi);
    // ominous drone: beating triangle + saw through a slowly breathing low-pass
    const drone = layer();
    const droneLp = this._filter("lowpass", 170, 1.2, drone);
    this._lfo(0.05, 60, droneLp.frequency);
    this._free("triangle", 55, droneLp);
    this._free("sawtooth", 55.7, this._gain(0.5, droneLp));
    // clean medbay tone: soft fifth
    const tone = layer();
    this._free("sine", 261.6, tone);
    this._free("sine", 392, this._gain(0.4, tone));
    // warm hum (mess / quarters): low triangle + octave through a low-pass
    const warm = layer();
    const warmLp = this._filter("lowpass", 300, 0.8, warm);
    this._free("triangle", 65.4, warmLp);
    this._free("sine", 130.8, this._gain(0.5, warmLp));
    this.ambience = { hum, air, lp, throb, whine, wind, drone, tone, warm };
  }

  /** Crossfade to a room profile. Accepts the legacy triple, the extended shape, or a layout room def. */
  setRoom(profile) {
    const p = this._resolveProfile(profile);
    this.profile = p;
    this.room = p;
    this._profileToken++;
    this._clearTimers("ambient");
    if (!this.ambience) return;
    this._applyProfile(p);
    this._scheduleAmbient(p);
  }

  /** Built-in profile for a room def (id → accent → cluster → generic). */
  profileFor(def) {
    return roomProfile(def);
  }

  _resolveProfile(arg) {
    let def = null;
    let over = null;
    if (arg && typeof arg === "object") {
      if (Array.isArray(arg.box) && arg.cluster) def = arg; // a layout room def
      else {
        over = arg;
        if (typeof arg.id === "string" && ROOM_BY_ID[arg.id]) def = ROOM_BY_ID[arg.id];
      }
    }
    if (!def && SYSTEMS.rooms && SYSTEMS.rooms.current) def = SYSTEMS.rooms.current;
    const p = roomProfile(def);
    if (over) for (const k of Object.keys(over)) if (k !== "id" && over[k] !== undefined) p[k] = over[k];
    return p;
  }

  _applyProfile(p) {
    const A = this.ambience;
    const t = this.ctx.currentTime;
    const set = (g, v) => g.gain.setTargetAtTime(v, t, XFADE);
    for (const k of Object.keys(LAYER_LEVEL)) set(A[k], LAYER_LEVEL[k] * clamp(num(p[k], 0), 0, 1));
    A.lp.frequency.setTargetAtTime(clamp(num(p.cutoff, 400), 60, 8000), t, XFADE);
    const sp = SPACES[p.space] || SPACES.small;
    set(this.sendSmall, sp.small);
    set(this.sendLarge, sp.large);
  }

  /** Random scheduled one-shots that characterise the room (all self-cancel on the next setRoom). */
  _scheduleAmbient(p) {
    const token = this._profileToken;
    const alive = () => token === this._profileToken && this.enabled;
    const loop = (minS, maxS, fn, first = null) => {
      const arm = (ms) =>
        this._later(
          () => {
            if (!alive()) return;
            fn();
            arm(rand(minS, maxS) * 1000);
          },
          ms,
          "ambient",
        );
      arm(first !== null ? first * 1000 : rand(minS, maxS) * 1000);
    };
    const clanks = clamp(num(p.clanks, 0), 0, 1);
    if (clanks > 0) loop(6 / clanks, 18 / clanks, () => this._ambientClank(), rand(2, 6));
    if (p.beeps === "console") {
      const rate = clamp(num(p.beepRate, 6), 0.5, 60);
      loop(30 / rate, 90 / rate, () => this._ambientChirp(), rand(1, 4));
    } else if (p.beeps === "monitor") loop(0.94, 0.96, () => this._ambientMonitor(), 0.5);
    const swoosh = clamp(num(p.swoosh, 0), 0, 1);
    if (swoosh > 0) loop(12 / swoosh, 30 / swoosh, () => this._ambientSwoosh(), rand(4, 12));
  }

  // ---------------------------------------------------------------------------------------------------
  // Events
  // ---------------------------------------------------------------------------------------------------

  on(name, fn) {
    if (!this.handlers.has(name)) this.handlers.set(name, []);
    this.handlers.get(name).push(fn);
  }

  /** Fire an audio event. data: { position?: Vector3|[x,y,z], kind?, id?, ... } */
  event(name, data = {}) {
    const entry = { name, t: performance.now(), kind: data.kind, id: data.id, played: false };
    this.log.push(entry);
    if (this.log.length > 200) this.log.shift();
    for (const fn of this.handlers.get(name) || []) fn(data);
    if (!this.enabled) return;
    try {
      entry.played = this._play(name, data, entry);
    } catch (err) {
      entry.error = String(err && err.message ? err.message : err);
    }
  }

  _play(name, data, entry) {
    const pos = posOf(data);
    const sample = this.samples.get(data.kind ? `${name}:${data.kind}` : name) || this.samples.get(name);
    if (sample) return this._playSample(sample, name, pos, entry);
    let v;
    switch (name) {
      case "door_open":
      case "door_close": {
        const open = name === "door_open";
        const kind = data.kind || "slide";
        const spec = DOOR_BY_ID[data.id];
        const h = spec ? spec.h : 2.6;
        const size = h >= 8 ? 1.9 : h >= 3.4 ? 1.2 : 1;
        v = this._voice({ position: pos, gain: kind === "blast" ? 0.5 : EVENT_GAIN[name], range: EVENT_RANGE[name] * (size > 1.5 ? 2 : 1), dur: 2.2 * size, entry });
        if (!v) return false;
        if (kind === "blast") this._doorBlast(v, open, size);
        else if (kind === "secure") this._doorSecure(v, open, size);
        else this._doorSlide(v, v.t, open, size);
        return true;
      }
      case "lift_start":
        v = this._voice({ position: pos, gain: EVENT_GAIN[name], range: EVENT_RANGE[name], dur: 1.6, entry });
        if (v) this._liftStart(v);
        this.rideHum(true);
        return !!v;
      case "lift_arrive":
        this.rideHum(false);
        v = this._voice({ position: pos, gain: EVENT_GAIN[name], range: EVENT_RANGE[name], dur: 1.4, entry });
        if (v) this._liftArrive(v);
        return !!v;
      case "launch":
      case "fighter_launch":
        v = this._voice({ position: pos, gain: EVENT_GAIN.fighter_launch * this._bulkhead(), range: EVENT_RANGE.fighter_launch, dur: 1.8, entry });
        if (v) this._scream(v);
        return !!v;
      case "field_pass":
        v = this._voice({ position: pos, gain: EVENT_GAIN[name] * this._bulkhead(), range: EVENT_RANGE[name], dur: 0.6, entry });
        if (v) this._crackle(v);
        return !!v;
      case "depart":
      case "return":
        v = this._voice({ position: pos, gain: EVENT_GAIN[name] * this._bulkhead(), range: EVENT_RANGE[name], dur: 2.1, entry });
        if (v) this._whoosh(v, name === "return");
        return !!v;
      case "dock":
        v = this._voice({ position: pos, gain: EVENT_GAIN[name] * this._bulkhead(), range: EVENT_RANGE[name], dur: 1.2, entry });
        if (v) this._dock(v);
        return !!v;
      case "alert":
        this._klaxon.until = performance.now() + 12000;
        this._startKlaxon();
        return this._klaxon.active;
      case "ui_open":
        v = this._voice({ gain: 0.12, pan: 0, dur: 0.25, entry });
        if (v) {
          this._blipAt(v.input, v.t, 1320, 0.05, 0.8);
          this._blipAt(v.input, v.t + 0.07, 1760, 0.07, 0.8);
        }
        return !!v;
      case "ui_choose":
        v = this._voice({ gain: 0.12, pan: 0, dur: 0.25, entry });
        if (v) {
          this._blipAt(v.input, v.t, 1760, 0.05, 0.8);
          this._blipAt(v.input, v.t + 0.08, 2217, 0.09, 0.8);
        }
        return !!v;
      case "ui_cancel":
        v = this._voice({ gain: 0.1, pan: 0, dur: 0.15, entry });
        if (v) this._blipAt(v.input, v.t, 880, 0.09, 0.8);
        return !!v;
      case "ui_hover":
        v = this._voice({ gain: 0.05, pan: 0, dur: 0.05, entry });
        if (v) this._blipAt(v.input, v.t, 2000, 0.02, 0.8);
        return !!v;
      case "ui_toast":
        v = this._voice({ gain: 0.07, pan: 0, dur: 0.2, entry });
        if (v) {
          this._blipAt(v.input, v.t, 1568, 0.04, 0.8);
          this._blipAt(v.input, v.t + 0.09, 2093, 0.07, 0.8);
        }
        return !!v;
      default:
        return false;
    }
  }

  /** Fighter sounds heard from another cluster come through bulkheads. */
  _bulkhead() {
    const P = SYSTEMS.player;
    const cur = SYSTEMS.rooms && SYSTEMS.rooms.current;
    if (!cur || (P && P.enabled === false)) return 1;
    if (cur.cluster !== "hangar") return 0.3;
    return cur.id === "hangar" || cur.id === "flight_control" ? 1 : 0.7;
  }

  /** Asset hook: play a decoded buffer through the spatial chain instead of a synth. */
  registerSample(key, buffer) {
    if (buffer) this.samples.set(key, buffer);
    else this.samples.delete(key);
  }

  _playSample(buf, name, pos, entry) {
    const v = this._voice({ position: pos, gain: EVENT_GAIN[name] || 0.35, range: EVENT_RANGE[name] || 45, dur: buf.duration, entry });
    if (!v) return false;
    const s = this._n(this.ctx.createBufferSource());
    s.buffer = buf;
    s.connect(v.input);
    s.start(v.t);
    s.stop(v.t + buf.duration + 0.05);
    return true;
  }

  // ---------------------------------------------------------------------------------------------------
  // Spatialisation
  // ---------------------------------------------------------------------------------------------------

  /** Legacy helper kept for callers: linear distance gain to 40 m. */
  distanceGain(pos) {
    if (!pos) return 1;
    return Math.max(0, 1 - this._distanceTo(pos) / 40);
  }

  _listenerPos() {
    const P = SYSTEMS.player;
    const cam = SYSTEMS.camera;
    if (P && P.enabled === false && cam) return cam.position;
    return this.listener || (cam && cam.position) || null;
  }

  _distanceTo(pos) {
    const L = this._listenerPos();
    if (!L) return 0;
    const dx = px(pos) - L.x;
    const dy = py(pos) - L.y;
    const dz = pz(pos) - L.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /** Stereo position from the camera's right vector (horizontal plane); centred for very near sources. */
  _panTo(pos, d) {
    const cam = SYSTEMS.camera;
    const L = this._listenerPos();
    if (!cam || !L || d < 0.5 || !cam.matrixWorld) return 0;
    const e = cam.matrixWorld.elements;
    const rx = e[0];
    const rz = e[2];
    const rl = Math.hypot(rx, rz);
    if (rl < 1e-4) return 0;
    const dx = px(pos) - L.x;
    const dz = pz(pos) - L.z;
    const hl = Math.hypot(dx, dz);
    if (hl < 1e-4) return 0;
    return ((rx * dx + rz * dz) / (rl * hl)) * Math.min(1, d / 3);
  }

  /**
   * Allocate a one-shot voice: spatial gain → stereo pan → voice bus (dry + reverb sends).
   * Returns { input, panner, t, gain, pan } or null when inaudible, over the voice cap, or the context is
   * suspended (queuing voices in a suspended context would make them all fire at once on resume).
   */
  _voice(o) {
    if (!this.enabled) return null;
    const c = this.ctx;
    if (!this._offline && c.state !== "running") {
      if (o.entry) o.entry.reason = "suspended";
      return null;
    }
    let g = clamp(num(o.gain, 0.3), 0, EVENT_MAX);
    let pan = o.pan;
    if (o.position) {
      const d = this._distanceTo(o.position);
      const k = 1 - d / (o.range || 45);
      if (k <= 0) {
        if (o.entry) o.entry.reason = "out of range";
        return null;
      }
      g *= k * k * (3 - 2 * k);
      if (pan === undefined) pan = this._panTo(o.position, d);
    }
    if (g < 0.003) {
      if (o.entry) o.entry.reason = "inaudible";
      return null;
    }
    if (!this._claimVoice(o.dur || 1)) {
      if (o.entry) o.entry.reason = "voice cap";
      return null;
    }
    const amp = this._gain(g);
    let tail = amp;
    let panner = null;
    if (typeof c.createStereoPanner === "function") {
      panner = this._n(c.createStereoPanner());
      panner.pan.value = clamp(pan || 0, -0.85, 0.85);
      amp.connect(panner);
      tail = panner;
    }
    tail.connect(this.voiceBus);
    if (o.entry) {
      o.entry.gain = +g.toFixed(3);
      o.entry.pan = +(pan || 0).toFixed(2);
    }
    return { input: amp, panner, t: c.currentTime, gain: g, pan: pan || 0 };
  }

  _claimVoice(dur) {
    const now = performance.now();
    const ends = this._voiceEnds;
    let n = 0;
    for (let i = 0; i < ends.length; i++) if (ends[i] > now) ends[n++] = ends[i];
    ends.length = n;
    if (n >= MAX_VOICES) return false;
    ends.push(now + dur * 1000);
    return true;
  }

  // ---------------------------------------------------------------------------------------------------
  // Voices — doors
  // ---------------------------------------------------------------------------------------------------

  _doorSlide(v, t, open, size) {
    const dur = 0.34 * size;
    // pneumatic hiss
    const bp = this._filter("bandpass", open ? 520 : 2100, 1.1, v.input);
    bp.frequency.setValueAtTime(open ? 520 : 2100, t);
    bp.frequency.exponentialRampToValueAtTime(open ? 2100 : 520, t + dur);
    const hg = this._gain(MIN, bp);
    this._env(hg.gain, t, 0.04, 0.55, dur * 0.4, dur * 0.6);
    this._noise("white", t, t + dur + 0.1, hg);
    // servo whir
    const lp = this._filter("lowpass", 700, 1, v.input);
    const sg = this._gain(MIN, lp);
    this._env(sg.gain, t, 0.05, 0.14, dur * 0.6, 0.2);
    const so = this._osc("sawtooth", open ? 140 : 190, t, t + dur + 0.35, sg);
    so.frequency.exponentialRampToValueAtTime(open ? 190 : 140, t + dur);
    if (open) this._click(v.input, t, 0.25);
    else this._clankAt(v.input, t + dur + 0.02, 480 / size, 0.35, 0.25);
  }

  _doorBlast(v, open, size) {
    const t = v.t;
    const dur = 1.4 * (size > 1.5 ? 1.35 : 1);
    const lp = this._filter("lowpass", 150, 0.8, v.input);
    lp.frequency.setValueAtTime(150, t);
    lp.frequency.linearRampToValueAtTime(260, t + dur * 0.5);
    lp.frequency.linearRampToValueAtTime(140, t + dur);
    const rg = this._gain(MIN, lp);
    this._env(rg.gain, t, 0.18, 0.7, dur - 0.55, 0.37);
    const f0 = 38 / Math.sqrt(size);
    const a = this._osc("sawtooth", f0, t, t + dur + 0.1, rg);
    a.detune.value = -6;
    const b = this._osc("sawtooth", f0 * 1.5 + 0.7, t, t + dur + 0.1, rg);
    b.detune.value = 9;
    const ng = this._gain(MIN, lp);
    this._env(ng.gain, t, 0.2, 0.5, dur - 0.55, 0.35);
    this._noise("brown", t, t + dur + 0.1, ng);
    if (open) this._clankAt(v.input, t + 0.05, 300 / size, 0.5, 0.5);
    else {
      this._clankAt(v.input, t + dur - 0.05, 240 / size, 0.7, 0.7);
      this._thudAt(v.input, t + dur - 0.05, 60, 34, 0.4, 0.8);
    }
  }

  _doorSecure(v, open, size) {
    const t = v.t;
    if (open) {
      this._blipAt(v.input, t, 1560, 0.05, 0.35);
      this._blipAt(v.input, t + 0.09, 2080, 0.07, 0.35);
      this._doorSlide(v, t + 0.2, true, size);
    } else {
      this._doorSlide(v, t, false, size);
      this._blipAt(v.input, t + 0.34 * size + 0.08, 1040, 0.06, 0.3);
    }
  }

  // ---------------------------------------------------------------------------------------------------
  // Voices — turbolift
  // ---------------------------------------------------------------------------------------------------

  _liftStart(v) {
    const t = v.t;
    this._click(v.input, t, 0.3);
    const lp = this._filter("lowpass", 220, 1.2, v.input);
    lp.frequency.setValueAtTime(220, t);
    lp.frequency.exponentialRampToValueAtTime(720, t + 1.3);
    const g = this._gain(MIN, lp);
    this._env(g.gain, t, 0.08, 0.5, 0.9, 0.45);
    const o = this._osc("sawtooth", 60, t, t + 1.5, g);
    o.frequency.exponentialRampToValueAtTime(190, t + 1.3);
    const sub = this._gain(0.35, g);
    const o2 = this._osc("square", 30, t, t + 1.5, sub);
    o2.frequency.exponentialRampToValueAtTime(95, t + 1.3);
  }

  _liftArrive(v) {
    const t = v.t;
    const lp = this._filter("lowpass", 700, 1.2, v.input);
    lp.frequency.setValueAtTime(700, t);
    lp.frequency.exponentialRampToValueAtTime(200, t + 0.9);
    const g = this._gain(MIN, lp);
    this._env(g.gain, t, 0.04, 0.4, 0.4, 0.5);
    const o = this._osc("sawtooth", 190, t, t + 1.0, g);
    o.frequency.exponentialRampToValueAtTime(60, t + 0.9);
    this._blipAt(v.input, t + 0.35, 880, 0.32, 0.45, true);
    this._blipAt(v.input, t + 0.62, 1174.66, 0.5, 0.45, true);
  }

  /** Cab hum while riding (sine + triangle under a 0.7 Hz wobble, brown rumble). Auto-stops after 25 s. */
  rideHum(on) {
    if (!this.enabled) return;
    const c = this.ctx;
    const t = c.currentTime;
    if (on) {
      if (this._ride) {
        this._ride.gain.gain.setTargetAtTime(0.11, t, 0.4);
        this._ride.until = performance.now() + 25000;
        return;
      }
      if (!this._offline && c.state !== "running") return;
      const out = this._gain(MIN, this.master);
      const lp = this._filter("lowpass", 260, 1, out);
      const vca = this._gain(0.85, lp);
      const nodes = [this._free("sine", 95, vca, false), this._free("triangle", 142.5, this._gain(0.5, vca), false), this._freeNoise("brown", this._gain(0.4, vca), false), this._lfo(0.7, 0.15, vca.gain, false).osc];
      out.gain.setTargetAtTime(0.11, t, 0.4);
      this._ride = { gain: out, nodes, until: performance.now() + 25000 };
    } else if (this._ride) {
      const r = this._ride;
      this._ride = null;
      r.gain.gain.cancelScheduledValues(t);
      r.gain.gain.setTargetAtTime(MIN, t, 0.2);
      for (const n of r.nodes) {
        try {
          n.stop(t + 1.2);
        } catch {
          /* already stopped */
        }
      }
    }
  }

  // ---------------------------------------------------------------------------------------------------
  // Voices — fighters
  // ---------------------------------------------------------------------------------------------------

  /** Twin-ion-engine style scream (original synthesis): detuned saws + sub square → tracking band-pass → soft clip. */
  _scream(v) {
    const c = this.ctx;
    const t = v.t;
    const dur = 1.7;
    const out = this._gain(MIN, v.input);
    this._env(out.gain, t, 0.07, 0.9, dur * 0.25, dur * 0.75);
    const shaper = this._n(c.createWaveShaper());
    shaper.curve = this._softClip();
    shaper.oversample = "2x";
    shaper.connect(out);
    const bp = this._filter("bandpass", 2300, 3.2, shaper);
    bp.frequency.setValueAtTime(2300, t);
    bp.frequency.exponentialRampToValueAtTime(380, t + dur);
    const pre = this._gain(0.7, bp);
    const oA = this._osc("sawtooth", 1500, t, t + dur + 0.05, pre);
    oA.frequency.exponentialRampToValueAtTime(270, t + dur);
    const oB = this._osc("sawtooth", 1515, t, t + dur + 0.05, pre);
    oB.frequency.exponentialRampToValueAtTime(276, t + dur);
    const subG = this._gain(0.35, bp);
    const oC = this._osc("square", 750, t, t + dur + 0.05, subG);
    oC.frequency.exponentialRampToValueAtTime(135, t + dur);
    // ion pulse tremolo on the drive
    const trem = this._osc("sine", 27, t, t + dur + 0.05, null);
    const tg = this._gain(0.3);
    trem.connect(tg);
    tg.connect(pre.gain);
    // exhaust hiss sweeping down with the engines
    const nbp = this._filter("bandpass", 3200, 0.9, out);
    nbp.frequency.setValueAtTime(3200, t);
    nbp.frequency.exponentialRampToValueAtTime(450, t + dur);
    this._noise("white", t, t + dur + 0.05, this._gain(0.3, nbp));
  }

  /** Containment-field crackle: gated noise bursts + zap slide + sub pop. */
  _crackle(v) {
    const c = this.ctx;
    const t = v.t;
    const dur = 0.5;
    const g = this._gain(MIN, v.input);
    this._env(g.gain, t, 0.01, 0.8, 0.05, dur - 0.06);
    const bp = this._filter("bandpass", 3400, 0.8, g);
    const hp = this._filter("highpass", 1600, 0.7, bp);
    const src = this._n(c.createBufferSource());
    src.buffer = this._gatedNoise(dur);
    src.connect(hp);
    src.start(t);
    src.stop(t + dur);
    const zg = this._gain(MIN, v.input);
    this._env(zg.gain, t, 0.005, 0.35, 0.02, 0.16);
    const zap = this._osc("sine", 2600, t, t + 0.2, zg);
    zap.frequency.exponentialRampToValueAtTime(380, t + 0.18);
    this._thudAt(v.input, t, 130, 45, 0.12, 0.3);
  }

  /** Fly-by whoosh with a doppler-like slide; the pan sweeps across the listener. */
  _whoosh(v, arriving) {
    const t = v.t;
    const dur = 2.0;
    const g = this._gain(MIN, v.input);
    g.gain.setValueAtTime(MIN, t);
    g.gain.exponentialRampToValueAtTime(0.9, t + dur * 0.4);
    g.gain.exponentialRampToValueAtTime(MIN, t + dur);
    const bp = this._filter("bandpass", 800, 1.3, g);
    if (arriving) {
      bp.frequency.setValueAtTime(280, t);
      bp.frequency.exponentialRampToValueAtTime(1000, t + dur * 0.45);
      bp.frequency.exponentialRampToValueAtTime(700, t + dur);
    } else {
      bp.frequency.setValueAtTime(1100, t);
      bp.frequency.exponentialRampToValueAtTime(300, t + dur);
    }
    this._noise("white", t, t + dur + 0.05, bp);
    const lp = this._filter("lowpass", 900, 1, g);
    const eg = this._gain(0.28, lp);
    const o = this._osc("sawtooth", arriving ? 230 : 440, t, t + dur + 0.05, eg);
    o.frequency.exponentialRampToValueAtTime(arriving ? 410 : 220, t + dur);
    if (v.panner) {
      const p0 = Math.abs(v.pan) > 0.05 ? v.pan : Math.random() < 0.5 ? -0.6 : 0.6;
      v.panner.pan.setValueAtTime(clamp(p0, -0.85, 0.85), t);
      v.panner.pan.linearRampToValueAtTime(clamp(-p0, -0.85, 0.85), t + dur);
    }
  }

  /** Tractor clamp: thud + clank + hydraulic hiss. */
  _dock(v) {
    const t = v.t;
    this._thudAt(v.input, t, 75, 38, 0.35, 1.0);
    this._clankAt(v.input, t + 0.01, 320, 0.4, 0.3);
    this._click(v.input, t, 0.4);
    const lp = this._filter("lowpass", 1400, 0.8, v.input);
    const hg = this._gain(MIN, lp);
    this._env(hg.gain, t + 0.25, 0.15, 0.15, 0.1, 0.6);
    this._noise("white", t + 0.25, t + 1.2, hg);
  }

  // ---------------------------------------------------------------------------------------------------
  // Alert klaxon (loop follows SYSTEMS.lighting.alert via _tick / update)
  // ---------------------------------------------------------------------------------------------------

  get klaxonActive() {
    return this._klaxon.active;
  }

  _startKlaxon() {
    if (this._klaxon.active || !this.enabled) return;
    this._klaxon.active = true;
    const loop = () => {
      if (!this._klaxon.active || !this.enabled) return;
      const v = this._voice({ gain: 0.18, pan: 0, dur: 1.1 });
      if (v) {
        this._klaxonBurst(v.input, v.t, 520, 470);
        this._klaxonBurst(v.input, v.t + 0.56, 392, 354);
      }
      this._later(loop, 1150, "klaxon");
    };
    loop();
  }

  _stopKlaxon() {
    this._klaxon.active = false;
    this._clearTimers("klaxon");
  }

  _klaxonBurst(dest, t, f0, f1) {
    const lp = this._filter("lowpass", 1500, 1, dest);
    const g = this._gain(MIN, lp);
    this._env(g.gain, t, 0.02, 1, 0.3, 0.1);
    const o = this._osc("sawtooth", f0, t, t + 0.45, g);
    o.frequency.linearRampToValueAtTime(f1, t + 0.42);
    const o2 = this._osc("square", f0 / 2, t, t + 0.45, this._gain(0.3, g));
    o2.frequency.linearRampToValueAtTime(f1 / 2, t + 0.42);
  }

  /** Optional per-frame tick from main.js; the internal interval calls the same code. */
  update() {
    this._tick();
  }

  _tick() {
    if (!this.enabled) return;
    const now = performance.now();
    if (now - this._lastTick < 100) return;
    this._lastTick = now;
    if (!this._hooked) this._hook();
    const L = SYSTEMS.lighting;
    if (L && typeof L.alert === "number") {
      if (L.alert > 0.5 && !this._klaxon.active) {
        this._klaxon.until = 0;
        this._startKlaxon();
      } else if (L.alert < 0.05 && this._klaxon.active) this._stopKlaxon();
    } else if (this._klaxon.active && now > this._klaxon.until) this._stopKlaxon();
    if (this._ride && now > this._ride.until) this.rideHum(false);
  }

  // ---------------------------------------------------------------------------------------------------
  // Master
  // ---------------------------------------------------------------------------------------------------

  /** Set the master level (clamped to MASTER_MAX). Returns the applied value. */
  volume(v) {
    this._volume = clamp(num(v, this._volume), 0, MASTER_MAX);
    this._applyMaster();
    return this._volume;
  }

  /** Toggle (or set) mute. Key M does the same. */
  mute(on) {
    this.muted = on === undefined ? !this.muted : !!on;
    this._applyMaster();
    const hud = SYSTEMS.hud;
    if (hud && typeof hud.setStatus === "function" && SYSTEMS.audio === this) hud.setStatus(this.muted ? "Audio muted — M to unmute" : "Audio on");
    return this.muted;
  }

  get masterTarget() {
    return this.muted ? 0 : this._volume;
  }

  _applyMaster() {
    if (!this.master) return;
    const t = this.ctx.currentTime;
    const g = this.master.gain;
    g.cancelScheduledValues(t);
    g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(this.masterTarget, t + 0.08);
  }

  /** Counters for tests and the debug overlay. */
  graph() {
    const now = performance.now();
    let voices = 0;
    for (const e of this._voiceEnds) if (e > now) voices++;
    return {
      state: this.ctx ? this.ctx.state : "none",
      enabled: this.enabled,
      offline: this._offline,
      nodes: this._nodes,
      voices,
      layers: this.ambience ? Object.keys(this.ambience).filter((k) => k !== "lp") : [],
      timers: this._timers.size,
      klaxon: this._klaxon.active,
      ride: !!this._ride,
      profile: this.profile ? this.profile.id || null : null,
      space: this.profile ? this.profile.space : null,
      muted: this.muted,
      volume: this._volume,
      masterTarget: this.masterTarget,
      pendingResume: this._pendingResume,
      hooked: this._hooked,
      samples: this.samples.size,
    };
  }

  // ---------------------------------------------------------------------------------------------------
  // Ambient one-shots (scheduled by _scheduleAmbient)
  // ---------------------------------------------------------------------------------------------------

  _ambientClank() {
    const v = this._voice({ gain: rand(0.05, 0.1), pan: rand(-0.8, 0.8), dur: 1.2 });
    if (!v) return;
    const lp = this._filter("lowpass", 1400, 0.7, v.input);
    this._clankAt(lp, v.t, rand(220, 650), 1, rand(0.5, 0.9));
  }

  _ambientChirp() {
    const v = this._voice({ gain: rand(0.05, 0.09), pan: rand(-0.7, 0.7), dur: 0.5 });
    if (!v) return;
    const n = 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) this._blipAt(v.input, v.t + i * 0.09, rand(1100, 2600), rand(0.035, 0.07), 0.8);
  }

  _ambientMonitor() {
    const v = this._voice({ gain: 0.06, pan: 0.35, dur: 0.1 });
    if (v) this._blipAt(v.input, v.t, 1000, 0.055, 0.8);
  }

  _ambientSwoosh() {
    const v = this._voice({ gain: 0.06, pan: rand(-0.7, 0.7), dur: 0.6 });
    if (!v) return;
    const t = v.t;
    const up = Math.random() < 0.5;
    const lp = this._filter("lowpass", 1600, 0.7, v.input);
    const bp = this._filter("bandpass", up ? 400 : 1400, 1.1, lp);
    bp.frequency.setValueAtTime(up ? 400 : 1400, t);
    bp.frequency.exponentialRampToValueAtTime(up ? 1400 : 400, t + 0.45);
    const g = this._gain(MIN, bp);
    this._env(g.gain, t, 0.05, 0.8, 0.15, 0.3);
    this._noise("white", t, t + 0.55, g);
  }

  // ---------------------------------------------------------------------------------------------------
  // Synth primitives (every created node is counted; every scheduled source stops itself)
  // ---------------------------------------------------------------------------------------------------

  _n(node) {
    this._nodes++;
    return node;
  }

  _gain(v, dest = null) {
    const g = this._n(this.ctx.createGain());
    g.gain.value = v;
    if (dest) g.connect(dest);
    return g;
  }

  _filter(type, f, q, dest = null) {
    const b = this._n(this.ctx.createBiquadFilter());
    b.type = type;
    b.frequency.value = f;
    b.Q.value = q;
    if (dest) b.connect(dest);
    return b;
  }

  /** Oscillator scheduled from t0 to t1 (self-stopping). */
  _osc(type, f, t0, t1, dest) {
    const o = this._n(this.ctx.createOscillator());
    o.type = type;
    o.frequency.value = f;
    if (dest) o.connect(dest);
    o.start(t0);
    o.stop(t1);
    return o;
  }

  /** Never-ending oscillator for the ambience layers (stopped by dispose()). */
  _free(type, f, dest, track = true) {
    const o = this._n(this.ctx.createOscillator());
    o.type = type;
    o.frequency.value = f;
    o.connect(dest);
    o.start();
    if (track) this._persistent.push(o);
    return o;
  }

  _freeNoise(kind, dest, track = true) {
    const s = this._n(this.ctx.createBufferSource());
    s.buffer = this._buffers[kind];
    s.loop = true;
    s.connect(dest);
    s.start();
    if (track) this._persistent.push(s);
    return s;
  }

  /** LFO: sine at `f` Hz scaled by `depth`, added to an AudioParam. Returns { osc, gain }. */
  _lfo(f, depth, param, track = true) {
    const gain = this._gain(depth);
    gain.connect(param);
    const osc = this._free("sine", f, gain, track);
    return { osc, gain };
  }

  /** Looping noise from a shared buffer, random start offset, scheduled t0..t1. */
  _noise(kind, t0, t1, dest) {
    const s = this._n(this.ctx.createBufferSource());
    s.buffer = this._buffers[kind];
    s.loop = true;
    s.connect(dest);
    s.start(t0, Math.random() * (s.buffer.duration - 0.1));
    s.stop(t1);
    return s;
  }

  /** ADSR-ish exponential envelope on a gain AudioParam; returns the end time. */
  _env(param, t, attack, peak, hold, release) {
    const p = Math.max(peak, MIN * 2);
    param.setValueAtTime(MIN, t);
    param.exponentialRampToValueAtTime(p, t + attack);
    const h = Math.max(0, hold);
    if (h > 0) param.setValueAtTime(p, t + attack + h);
    param.exponentialRampToValueAtTime(MIN, t + attack + h + release);
    return t + attack + h + release;
  }

  /** Short sine blip (optionally with a bell-like 2nd partial). */
  _blipAt(dest, t, f, dur, gain, bell = false) {
    const g = this._gain(MIN, dest);
    this._env(g.gain, t, 0.008, gain, dur * 0.3, dur * 0.7);
    this._osc("sine", f, t, t + dur + 0.05, g);
    if (bell) this._osc("sine", f * 2.01, t, t + dur + 0.05, this._gain(0.25, g));
  }

  /** Metallic clank: inharmonic sine partials with staggered decays + a noise transient. */
  _clankAt(dest, t, base, gain, decay) {
    const g = this._gain(gain, dest);
    const ratios = [1, 2.32, 3.9, 5.43];
    const levels = [1, 0.55, 0.35, 0.2];
    const decays = [1, 0.7, 0.5, 0.35];
    for (let i = 0; i < ratios.length; i++) {
      const pg = this._gain(MIN, g);
      const d = decay * decays[i];
      this._env(pg.gain, t, 0.004, levels[i], 0, d);
      this._osc("sine", base * ratios[i], t, t + d + 0.05, pg);
    }
    const nb = this._filter("bandpass", base * 4, 2, g);
    const ng = this._gain(MIN, nb);
    this._env(ng.gain, t, 0.003, 0.6, 0, 0.05);
    this._noise("white", t, t + 0.1, ng);
  }

  /** Sub thud: sine gliding f0 → f1. */
  _thudAt(dest, t, f0, f1, dur, gain) {
    const g = this._gain(MIN, dest);
    this._env(g.gain, t, 0.006, gain, 0, dur);
    const o = this._osc("sine", f0, t, t + dur + 0.05, g);
    o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  }

  /** Relay / release click: 20 ms band-passed noise. */
  _click(dest, t, gain) {
    const bp = this._filter("bandpass", 2500, 1, dest);
    const g = this._gain(MIN, bp);
    this._env(g.gain, t, 0.002, gain, 0, 0.025);
    this._noise("white", t, t + 0.05, g);
  }

  _softClip() {
    if (!this._softCurve) {
      const n = 1024;
      const curve = new Float32Array(n);
      const k = Math.tanh(3);
      for (let i = 0; i < n; i++) curve[i] = Math.tanh(3 * ((i / (n - 1)) * 2 - 1)) / k;
      this._softCurve = curve;
    }
    return this._softCurve;
  }

  _noiseBuffer(channels, seconds, brown) {
    const c = this.ctx;
    const n = Math.floor(c.sampleRate * seconds);
    const buf = c.createBuffer(channels, n, c.sampleRate);
    for (let ch = 0; ch < channels; ch++) {
      const d = buf.getChannelData(ch);
      if (brown) {
        let last = 0;
        for (let i = 0; i < n; i++) {
          last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
          d[i] = last * 3.5;
        }
      } else for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    }
    return buf;
  }

  /** Randomly gated noise burst buffer (field crackle). */
  _gatedNoise(seconds) {
    const c = this.ctx;
    const n = Math.floor(c.sampleRate * seconds);
    const buf = c.createBuffer(1, n, c.sampleRate);
    const d = buf.getChannelData(0);
    let gate = 0;
    let amp = 0;
    let next = 0;
    for (let i = 0; i < n; i++) {
      if (i >= next) {
        gate = Math.random() < 0.55 ? 1 : 0;
        amp = 0.4 + 0.6 * Math.random();
        next = i + 40 + Math.floor(Math.random() * 400);
      }
      d[i] = gate ? (Math.random() * 2 - 1) * amp * (1 - i / n) : 0;
    }
    return buf;
  }

  /** Synthetic reverb impulse: exponentially decaying stereo noise with a short pre-delay. */
  _impulse(seconds, power, preDelay) {
    const c = this.ctx;
    const n = Math.floor(c.sampleRate * seconds);
    const pre = Math.floor(c.sampleRate * preDelay);
    const buf = c.createBuffer(2, n, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = pre; i < n; i++) {
        const k = 1 - (i - pre) / (n - pre);
        d[i] = (Math.random() * 2 - 1) * Math.pow(k, power);
      }
    }
    return buf;
  }

  _later(fn, ms, tag = "misc") {
    const id = setTimeout(() => {
      this._timers.delete(id);
      fn();
    }, ms);
    this._timers.set(id, tag);
    return id;
  }

  _clearTimers(tag = null) {
    for (const [id, tg] of this._timers) {
      if (tag && tg !== tag) continue;
      clearTimeout(id);
      this._timers.delete(id);
    }
  }
}

function posOf(data) {
  if (!data) return null;
  const p = data.position || data.pos || (data.object && data.object.position) || (data.fighter && data.fighter.object && data.fighter.object.position) || null;
  if (!p) return null;
  if (typeof p.x === "number" || (Array.isArray(p) && p.length >= 3)) return p;
  return null;
}
