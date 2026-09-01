// Day / rest-cycle lighting controller. Smoothly blends practical lights, emissive
// strips and screens between the normal ship state and a dim red night watch.
import * as THREE from "three";
import { PALETTE } from "./materials.js";

const NIGHT_TEAL = new THREE.Color("#ff3b24");
const NIGHT_WARM = new THREE.Color("#ff6a3a");

export function createLightingController({ lights, materials, hemi }) {
  const warm = lights.warm;
  const teal = lights.teal;
  const cool = lights.cool;
  const emitTeal = materials.emitTeal;
  const emitWarm = materials.emitWarm;
  const emitOrange = materials.emitOrange;
  const emitCool = materials.emitCool;
  const screens = materials.screens;
  const base = {
    emitTeal: emitTeal.emissiveIntensity,
    emitWarm: emitWarm.emissiveIntensity,
    emitOrange: emitOrange.emissiveIntensity,
    emitCool: emitCool.emissiveIntensity,
    screens: screens.map((m) => m.emissiveIntensity),
    leds: materials.leds.emissiveIntensity,
    hemi: hemi ? hemi.intensity : 0,
  };
  const tealBase = emitTeal.emissive.clone();
  const warmBase = emitWarm.emissive.clone();
  const tmp = new THREE.Color();

  const state = { current: 0, target: 0, speed: 1.0 };

  function apply(t) {
    const day = 1 - t;
    for (const l of warm) {
      l.intensity = l.userData.baseIntensity * (0.06 + 0.94 * day);
      tmp.copy(l.userData.baseColor).lerp(NIGHT_WARM, t * 0.8);
      l.color.copy(tmp);
    }
    for (const l of teal) {
      l.intensity = l.userData.baseIntensity * (0.7 + 0.3 * day);
      tmp.copy(l.userData.baseColor).lerp(NIGHT_TEAL, t);
      l.color.copy(tmp);
    }
    for (const l of cool) l.intensity = l.userData.baseIntensity * (0.55 + 0.45 * day);
    emitWarm.emissiveIntensity = base.emitWarm * (0.05 + 0.95 * day);
    emitWarm.emissive.copy(warmBase).lerp(NIGHT_WARM, t * 0.7);
    emitTeal.emissiveIntensity = base.emitTeal * (0.75 + 0.25 * day);
    emitTeal.emissive.copy(tealBase).lerp(NIGHT_TEAL, t);
    emitOrange.emissiveIntensity = base.emitOrange * (0.6 + 0.4 * day);
    emitCool.emissiveIntensity = base.emitCool * (0.35 + 0.65 * day);
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
