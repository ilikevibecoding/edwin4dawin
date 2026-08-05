// Central mutable game state plus a tiny event bus. UI, audio and radar all read
// from here so there is exactly one source of truth for what the player sees.

import { BATTERIES, SCENARIOS } from './config.js';

export const PHASE = {
  BOOT: 'BOOT',
  BRIEFING: 'BRIEFING',
  ACTIVE: 'ACTIVE',
  DEBRIEF: 'DEBRIEF',
};

export const BATTERY_STATE = {
  READY: 'READY',
  PREP: 'PREPARING',
  RELOAD: 'RELOADING',
  EXPENDED: 'EXPENDED',
  OFFLINE: 'OFFLINE',
};

class Emitter {
  constructor() {
    this.map = new Map();
  }

  on(evt, fn) {
    if (!this.map.has(evt)) this.map.set(evt, new Set());
    this.map.get(evt).add(fn);
    return () => this.off(evt, fn);
  }

  off(evt, fn) {
    const s = this.map.get(evt);
    if (s) s.delete(fn);
  }

  emit(evt, payload) {
    const s = this.map.get(evt);
    if (s) for (const fn of s) fn(payload);
    const all = this.map.get('*');
    if (all) for (const fn of all) fn({ evt, payload });
  }
}

export const bus = new Emitter();

export const state = {
  phase: PHASE.BOOT,
  seed: 1,
  scenarioId: SCENARIOS[0].id,
  todId: 'day',
  selectedBatteryId: BATTERIES[0].id,
  /** Radar track id the player has designated, if any. */
  selectedTrackId: null,
  /** Track ids with an interceptor committed. */
  assignedTrackId: null,
  time: 0,
  scenarioTime: 0,
  scenarioDuration: 0,
  reducedMotion: false,
  quality: 'high',
  masterVolume: 0.8,
  subtitles: true,
  colorblind: 'none',
  consoleFocus: false,
  paused: false,
  stats: {
    launched: 0,
    intercepted: 0,
    leakers: 0,
    decoysWasted: 0,
    spawned: 0,
    active: 0,
    inFlight: 0,
  },
  lastResult: null,
  results: [],
  messages: [],
  batteries: {},
  hudTargetTrackId: null,
  perf: { fps: 0, frameMs: 0, cpuMs: 0, drawCalls: 0, triangles: 0, particles: 0 },
};

export function resetBatteryState() {
  state.batteries = {};
  for (const b of BATTERIES) {
    state.batteries[b.id] = {
      id: b.id,
      ammo: b.ammo,
      state: BATTERY_STATE.READY,
      timer: 0,
      assignedTrackId: null,
      inFlight: 0,
    };
  }
}

export function pushMessage(text, kind = 'info', ttl = 6) {
  const msg = { text, kind, t: state.time, ttl, id: `${state.time.toFixed(3)}:${text}` };
  state.messages.push(msg);
  if (state.messages.length > 40) state.messages.shift();
  bus.emit('message', msg);
  return msg;
}

export function setPhase(p) {
  if (state.phase === p) return;
  state.phase = p;
  bus.emit('phase', p);
}

resetBatteryState();
