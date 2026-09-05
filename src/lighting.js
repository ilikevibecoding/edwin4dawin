// Day / rest-cycle lighting controller. Smoothly blends practical lights, emissive
// strips and screens between the normal ship state and a dim red night watch.
// Works on every "emit*" material in the library so new instrument colours join automatically.
import * as THREE from "three";
import { PALETTE } from "./materials.js";

const NIGHT_COOL = new THREE.Color("#ff3b24");
const NIGHT_WARM = new THREE.Color("#ff6a3a");

// per-family behaviour: [floor intensity at full rest, how far the colour shifts toward the night red]
const FAMILY = {
  warm: [0.05, 0.7], // amber / warm fixtures nearly off, shift red
  cool: [0.35, 0.0], // white fixtures dimmed
  blue: [0.75, 1.0], // blue-white instrument strips go red
  red: [1.0, 0.0], // red stays
};
function familyOf(key) {
  if (/Warm|Amber|Orange/.test(key)) return "warm";
  if (/Red/.test(key)) return "red";
  if (/Cool|White/.test(key)) return "cool";
  return "blue"; // emitTeal / emitBlue
}

export function createLightingController({ lights, materials, hemi }) {
  // `lights` may be a function returning { warm, cool, teal } so streamed-in fixtures join the cycle
  const current = () => (typeof lights === "function" ? lights() : lights);
  const emits = Object.entries(materials)
    .filter(([k, m]) => k.startsWith("emit") && m && m.isMaterial)
    .map(([k, m]) => ({ m, family: familyOf(k), base: m.emissiveIntensity, color: m.emissive.clone() }));
  const screens = materials.screens;
  const base = {
    screens: screens.map((m) => m.emissiveIntensity),
    leds: materials.leds.emissiveIntensity,
    hemi: hemi ? hemi.intensity : 0,
  };
  const tmp = new THREE.Color();

  const state = { current: 0, target: 0, speed: 1.0 };

  function apply(t) {
    const day = 1 - t;
    const { warm = [], teal = [], cool = [] } = current();
    for (const l of warm) {
      l.intensity = l.userData.baseIntensity * (0.06 + 0.94 * day);
      tmp.copy(l.userData.baseColor).lerp(NIGHT_WARM, t * 0.8);
      l.color.copy(tmp);
    }
    for (const l of teal) {
      l.intensity = l.userData.baseIntensity * (0.7 + 0.3 * day);
      tmp.copy(l.userData.baseColor).lerp(NIGHT_COOL, t);
      l.color.copy(tmp);
    }
    for (const l of cool) l.intensity = l.userData.baseIntensity * (0.55 + 0.45 * day);
    for (const e of emits) {
      const [floor, shift] = FAMILY[e.family];
      e.m.emissiveIntensity = e.base * (floor + (1 - floor) * day);
      if (shift > 0) e.m.emissive.copy(e.color).lerp(e.family === "warm" ? NIGHT_WARM : NIGHT_COOL, t * shift);
    }
    screens.forEach((m, i) => (m.emissiveIntensity = base.screens[i] * (0.45 + 0.55 * day)));
    materials.leds.emissiveIntensity = base.leds;
    if (hemi) hemi.intensity = base.hemi * (0.35 + 0.65 * day);
  }

  return {
    state,
    /** t: 0 = day, 1 = rest cycle. instant: skip the blend. */
    setRest(t, instant = false) {
      state.target = THREE.MathUtils.clamp(t, 0, 1);
      if (instant) {
        state.current = state.target;
        apply(state.current);
      }
    },
    update(dt) {
      if (Math.abs(state.current - state.target) < 1e-4) return;
      const dir = Math.sign(state.target - state.current);
      state.current += dir * dt * state.speed;
      if ((dir > 0 && state.current > state.target) || (dir < 0 && state.current < state.target)) state.current = state.target;
      apply(state.current);
    },
    get rest() {
      return state.current;
    },
    palette: PALETTE,
  };
}
