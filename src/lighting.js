// Ship lighting states: normal / rest cycle (dimmed) / red alert (strips pulse red, practicals dim).
// Blends emissive families and the active interior lights each frame.
import * as THREE from "three";
import { IMP } from "./core/palette.js";

const ALERT_RED = new THREE.Color("#ff2a1a");

export function createLightingController({ materials, rooms, hemi, audio = null }) {
  const fams = ["emitWhite", "emitWhiteSoft", "emitWarmSoft", "emitBlue", "emitCyan", "emitAmber", "emitGreen", "emitViolet"];
  const base = {};
  for (const k of fams) base[k] = { i: materials[k].emissiveIntensity, c: materials[k].emissive.clone() };
  base.screen = materials.screen.emissiveIntensity;
  base.leds = materials.leds.emissiveIntensity;
  base.hemi = hemi ? hemi.intensity : 0;
  const state = { rest: 0, restTarget: 0, alert: 0, alertTarget: 0, speed: 1.0, t: 0 };
  const tmp = new THREE.Color();

  function apply() {
    const day = 1 - state.rest * 0.7;
    const a = state.alert;
    const pulse = 0.55 + 0.45 * Math.sin(state.t * 4.0);
    for (const k of fams) {
      const m = materials[k];
      const b = base[k];
      m.emissiveIntensity = b.i * day * (1 - a * 0.35 + a * 0.35 * pulse);
      if (k === "emitWhite" || k === "emitWhiteSoft" || k === "emitBlue" || k === "emitCyan") tmp.copy(b.c).lerp(ALERT_RED, a * 0.85);
      else tmp.copy(b.c);
      m.emissive.copy(tmp);
    }
    materials.screen.emissiveIntensity = base.screen * (0.5 + 0.5 * day);
    materials.leds.emissiveIntensity = base.leds;
    if (hemi) hemi.intensity = base.hemi * (0.4 + 0.6 * day);
    // active interior lights: dim in rest, red-shift in alert
    for (const r of rooms.visibleRooms) {
      if (!r.ctx) continue;
      for (const l of r.ctx.lights) {
        if (l.userData.baseIntensity === undefined) {
          l.userData.baseIntensity = l.intensity;
          l.userData.baseColor = l.color.clone();
        }
        l.intensity = l.userData.baseIntensity * (0.25 + 0.75 * day) * (1 - a * 0.4);
        tmp.copy(l.userData.baseColor).lerp(ALERT_RED, a * 0.6);
        l.color.copy(tmp);
      }
    }
  }

  return {
    state,
    setRest(t, instant = false) {
      state.restTarget = THREE.MathUtils.clamp(t, 0, 1);
      if (instant) state.rest = state.restTarget;
    },
    setAlert(t, instant = false) {
      const was = state.alertTarget;
      state.alertTarget = THREE.MathUtils.clamp(t, 0, 1);
      if (instant) state.alert = state.alertTarget;
      if (audio && was < 0.5 && t >= 0.5) audio.event("alert", {});
    },
    update(dt) {
      state.t += dt;
      for (const [k, tk] of [["rest", "restTarget"], ["alert", "alertTarget"]]) {
        const d = state[tk] - state[k];
        if (Math.abs(d) > 1e-4) state[k] += Math.sign(d) * Math.min(Math.abs(d), dt * state.speed);
      }
      apply();
    },
    get rest() {
      return state.rest;
    },
    get alert() {
      return state.alert;
    },
    palette: IMP,
  };
}
