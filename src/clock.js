/**
 * The simulation clock, in seconds, for anything that animates by time.
 *
 * main.js advances it once per simulated step and zeroes it at the start of a
 * capture pre-roll. Shaders that used to read `performance.now()` — the beam
 * dust flicker, the water hole's ripple — moved with the wall clock between two
 * frozen frames of the same view, so the water and the headlamp cones were the
 * one part of a deterministic capture that was not. A paused game holds it,
 * which is what a frozen frame wants.
 */
export const simClock = { t: 0 };
