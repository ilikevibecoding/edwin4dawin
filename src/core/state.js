// Top-level game mode state machine. UI screens and gameplay systems key off
// the current mode. Transitions emit 'modechange' on the event bus.

import { emit } from './events.js';

export const MODES = {
  BOOT: 'boot',
  TITLE: 'title',
  SETTINGS: 'settings',
  CONTROLS: 'controls',
  DIFFICULTY: 'difficulty',
  BRIEFING: 'briefing',
  LOADOUT: 'loadout',
  LOADING: 'loading',
  PLAYING: 'playing',
  PAUSED: 'paused',
  VICTORY: 'victory',
  DEFEAT: 'defeat',
  GALLERY: 'gallery',
};

let mode = MODES.BOOT;
let prevMode = null;
const enterHooks = new Map();
const exitHooks = new Map();

export function currentMode() { return mode; }
export function previousMode() { return prevMode; }

export function onEnter(m, fn) {
  if (!enterHooks.has(m)) enterHooks.set(m, new Set());
  enterHooks.get(m).add(fn);
}
export function onExit(m, fn) {
  if (!exitHooks.has(m)) exitHooks.set(m, new Set());
  exitHooks.get(m).add(fn);
}

export function setMode(next, payload = {}) {
  if (next === mode) return;
  const from = mode;
  prevMode = from;
  mode = next;
  for (const fn of exitHooks.get(from) || []) { try { fn(next, payload); } catch (e) { console.error(e); } }
  for (const fn of enterHooks.get(next) || []) { try { fn(from, payload); } catch (e) { console.error(e); } }
  emit('modechange', { from, to: next, payload });
}

export function isGameplay() { return mode === MODES.PLAYING; }
