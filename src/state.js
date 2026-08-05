/**
 * Central game state and event bus.
 *
 * Systems never reach into each other directly - they read this store and emit
 * events through it. That keeps the UI, audio and gameplay loops decoupled and
 * makes the whole thing trivially inspectable from Playwright.
 */

import { BATTERIES, SCENARIOS, RESULT } from './config.js';

export const PHASE = {
  LOADING: 'loading',
  MENU: 'menu',
  STANDBY: 'standby',
  INBOUND: 'inbound',
  COMPLETE: 'complete',
};

class EventBus {
  constructor() { this.map = new Map(); }
  on(type, fn) {
    if (!this.map.has(type)) this.map.set(type, new Set());
    this.map.get(type).add(fn);
    return () => this.off(type, fn);
  }
  off(type, fn) { this.map.get(type)?.delete(fn); }
  emit(type, payload) {
    const set = this.map.get(type);
    if (set) for (const fn of set) fn(payload);
    const all = this.map.get('*');
    if (all) for (const fn of all) fn({ type, payload });
  }
}

export class GameState {
  constructor() {
    this.bus = new EventBus();

    this.phase = PHASE.LOADING;
    this.condition = 'day';
    this.scenarioId = 'single';
    this.selectedBatteryId = BATTERIES[0].id;
    this.selectedTrackId = null;
    this.consoleOpen = false;
    this.nearConsole = false;

    this.seed = (Math.random() * 0xffffffff) >>> 0;
    this.runIndex = 0;
    this.clock = 0;          // seconds since scenario start
    this.wallClock = 0;      // seconds since boot

    this.settings = {
      reducedMotion: false,
      audio: true,
      quality: 'high',
      hudScale: 1,
    };

    this.stats = this.freshStats();
    this.log = [];
    this.lastResult = null;
  }

  freshStats() {
    return {
      spawned: 0, intercepted: 0, impacted: 0, leaked: 0,
      decoysDestroyed: 0, decoysSpawned: 0, roundsFired: 0, misses: 0,
      resolved: 0, bestIntercept: 0, duration: 0,
    };
  }

  get scenario() { return SCENARIOS.find((s) => s.id === this.scenarioId); }
  get batteryDef() { return BATTERIES.find((b) => b.id === this.selectedBatteryId); }

  set(key, value) {
    if (this[key] === value) return;
    const prev = this[key];
    this[key] = value;
    this.bus.emit('change', { key, value, prev });
    this.bus.emit('change:' + key, { value, prev });
  }

  setPhase(phase) {
    if (this.phase === phase) return;
    this.set('phase', phase);
    this.bus.emit('phase', phase);
  }

  /** Append a line to the on-screen event log. */
  logEvent(text, kind = 'info') {
    const entry = { t: this.clock, text, kind, id: this.log.length };
    this.log.push(entry);
    if (this.log.length > 120) this.log.shift();
    this.bus.emit('log', entry);
    return entry;
  }

  emit(type, payload) { this.bus.emit(type, payload); }
  on(type, fn) { return this.bus.on(type, fn); }

  resetRun(seed) {
    this.runIndex++;
    if (seed !== undefined) this.seed = seed >>> 0;
    else this.seed = (Math.random() * 0xffffffff) >>> 0;
    this.clock = 0;
    this.stats = this.freshStats();
    this.log.length = 0;
    this.lastResult = null;
    this.selectedTrackId = null;
    this.bus.emit('reset', { seed: this.seed });
  }

  /** Scenario is over once every spawned track has resolved. */
  checkComplete(activeThreats, pendingSpawns, interceptorsInFlight) {
    if (this.phase !== PHASE.INBOUND) return false;
    if (activeThreats > 0 || pendingSpawns > 0 || interceptorsInFlight > 0) return false;
    this.stats.duration = this.clock;
    const s = this.stats;
    const cleanSweep = s.impacted === 0 && s.intercepted > 0;
    this.lastResult = {
      code: s.impacted > 0 ? RESULT.IMPACT : RESULT.INTERCEPT,
      clean: cleanSweep,
      stats: { ...s },
    };
    this.setPhase(PHASE.COMPLETE);
    this.bus.emit('complete', this.lastResult);
    return true;
  }
}

export const state = new GameState();
