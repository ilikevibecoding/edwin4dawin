// Small shared helpers.

export const $ = (sel) => document.querySelector(sel);

export function el(tag, cls, parent, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  if (parent) parent.appendChild(n);
  return n;
}

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const rand = (a, b) => a + Math.random() * (b - a);
export const pick = (arr) => arr[(Math.random() * arr.length) | 0];

export function wait(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

export function nextFrame() {
  return new Promise((res) => requestAnimationFrame(() => res()));
}

// Global settings parsed from the URL (dev/testing affordances).
const q = new URLSearchParams(location.search);
export const SETTINGS = {
  fast: q.get('fast') === '1',
  startChapter: q.get('ch') ? parseInt(q.get('ch'), 10) : null,
  gallery: q.get('gallery') === '1',
  shot: q.get('shot') || null,
  mute: q.get('mute') === '1',
  auto: q.get('auto') === '1',
  nogate: q.get('nogate') === '1',
  uistate: q.get('ui') || null,
};

// Time scaling for fast test mode.
export const T = (ms) => (SETTINGS.fast ? Math.max(40, ms * 0.25) : ms);

// HUD visibility helper (cinematic moments own the frame).
export function setHudHidden(hidden) {
  const hud = document.getElementById('hud');
  if (hud) hud.classList.toggle('hud-hidden', hidden);
}
