import * as THREE from 'three';
import { DIAL, GAUGES } from '../textures';
import type { FlightTelemetry, FloatState } from '../physics';
import type { PlaneModel } from '../model';
import { CANVAS_PERIOD, CH, DEG, LIGHT, YOKE_HUB_X } from './context';

// Per-frame animation of the model: `PlaneModel.setWaterline` / `animate` / `setInstruments` delegate here.

/**
 * Move the wet line on each float to the immersion the flight model reports (hull-local y at the bow and stern
 * keel points: bow keel -2.08, stern keel -1.98). The water climbs the stem with the bow wave and stands a little
 * higher at the transom at displacement speed; when a hull rises (rebound, planing) the film it leaves drains
 * off at ~0.2 m/s, so a bow that has just lifted clear still glistens for a second and a planing float is dry.
 */
export function setWaterline(model: PlaneModel, floats: readonly FloatState[], dt: number, speed: number): void {
  const v = model.wetLine.value;
  const planingW = THREE.MathUtils.smoothstep(speed, 11, 19);
  const climbBow = 0.02 + 0.012 * Math.min(speed, 6) + 0.03 * planingW;
  const climbStern = 0.03 + 0.008 * Math.min(speed, 6) * (1 - planingW);
  const drain = 0.2 * dt;
  for (let i = 0; i < 2; i++) {
    const f = floats[i];
    const bow = -2.08 + f.bow + climbBow, stern = -1.98 + f.stern + climbStern;
    const ob = i === 0 ? v.x : v.z, os = i === 0 ? v.y : v.w;
    const nb = Math.max(bow, ob - drain), ns = Math.max(stern, os - drain);
    if (i === 0) v.set(nb, ns, v.z, v.w); else v.set(v.x, v.y, nb, ns);
  }
}

/**
 * Animate control surfaces, propeller, lights, cockpit controls and instruments. Inputs in [-1,1], flaps 0..1,
 * rpm 0..1. With `telemetry` the gauges read the live flight state (`throttle` drives the throttle lever).
 */
export function animate(model: PlaneModel, pitch: number, roll: number, yaw: number, flaps: number, rpm: number, dt: number, time: number, night: number, gearDown: boolean, telemetry: FlightTelemetry | null = null, throttle = rpm): void {
  model.aileronR.rotation.z = -roll * 0.35;
  model.aileronL.rotation.z = roll * 0.35;
  model.flapR.rotation.z = flaps * 0.6;
  model.flapL.rotation.z = flaps * 0.6;
  model.elevator.rotation.z = pitch * 0.4;
  model.rudder.rotation.y = -yaw * 0.45;
  for (const wr of model.waterRudders) wr.rotation.y = -yaw * 0.5;
  // the engine idles at 600 RPM (the tachometer's reading, setInstruments) and the prop turns at that speed too
  const rpmVal = 600 + rpm * 2000;
  model.propeller.rotation.x += rpmVal * (Math.PI * 2 / 60) * dt;
  model.propDiscPivot.rotation.x += 1.7 * dt;
  // cross-fade from crisp blades to the blur disc between ~500 and ~1200 RPM (at idle the blades are already a
  // third of the way to a smear: 10 turns a second); above that only the disc and the spinner remain
  const blend = Math.pow(THREE.MathUtils.clamp((rpmVal - 500) / 700, 0, 1), 0.6);
  const disc = model.propDisc.material as THREE.MeshBasicMaterial;
  // a spinning prop is mostly see-through: the disc only tints, the tip arc is a faint ring (from the seat the
  // old 0.6 read as a bright double ring with spokes over the windshield)
  disc.opacity = 0.42 * blend;
  const bladeMat = model.propBlades.material as THREE.MeshStandardMaterial;
  bladeMat.opacity = 1 - blend;
  model.propBlades.visible = blend < 0.999;
  model.propBlades.castShadow = blend < 0.5;
  // position lights, rotating beacon and strobes: only emissive after dusk (`night` 0 by day .. 1 at night).
  // Beacon: a rotating red lamp, ~1 Hz, a sharp flash on a dim floor so the lens always reads red; strobes: a
  // double flash (50 ms, 100 ms apart) every 1.5 s; the landing light is on while on the water (taxiing lamp)
  const glow = Math.pow(night, 0.6);
  const strobePhase = time % 1.5;
  const strobeOn = strobePhase < 0.05 || (strobePhase > 0.15 && strobePhase < 0.20);
  const beaconFlash = Math.pow(Math.max(0, Math.cos(time * Math.PI * 2)), 6);
  const P = model.lightPower.value;
  P[LIGHT.red] = P[LIGHT.green] = 7 * glow;
  P[LIGHT.tail] = 6 * glow;
  P[LIGHT.beacon] = (1.5 + 14 * beaconFlash) * glow;
  P[LIGHT.strobe] = (strobeOn ? 40 : 0) * glow;
  P[LIGHT.landing] = telemetry && telemetry.onWater ? 10 * glow : 0;
  model.glassUniforms.uCabinGlow.value = glow;
  model.wheels.visible = gearDown;
  model.wheels.position.y = gearDown ? 0 : 0.3;
  // controls: the yoke turns with roll (right roll = clockwise seen by the pilot) and slides fore/aft with pitch
  // (pull = toward the pilot), pedals swing with the rudder, the throttle and flap levers follow their inputs
  for (const y of [model.yokeL, model.yokeR]) { y.rotation.x = roll * 0.9; y.position.x = YOKE_HUB_X - pitch * 0.08; }
  // yaw + = nose left = left pedal pushed forward (its top swings to +X, a negative rotation about Z)
  model.pedalsL.rotation.z = -yaw * 0.32;
  model.pedalsR.rotation.z = yaw * 0.32;
  model.throttleLever.rotation.z = (0.5 - THREE.MathUtils.clamp(throttle, 0, 1)) * 0.9;
  model.flapLever.rotation.z = -(1.75 + THREE.MathUtils.clamp(flaps, 0, 1) * 1.05) + Math.PI / 2;
  // instrument lighting: the dials, the screen and the panel legends glow after dusk
  model.panelMat.emissiveIntensity = 0.1 + 1.3 * glow;
  model.instMat.emissiveIntensity = 0.15 + 1.4 * glow;
  model.gpsMat.emissiveIntensity = 0.55 + 1.2 * glow;
  model.canvasAcc += dt;
  setInstruments(model, telemetry, rpm, throttle);
}

/** Gauge readings from the flight state (deterministic: everything derives from the telemetry). */
export function setInstruments(model: PlaneModel, t: FlightTelemetry | null, rpm01: number, throttle: number): void {
  const A = model.instAngle.value, S = model.instShift.value;
  const G = GAUGES, s = model.gaugeState;
  const kt = t ? t.airspeed * 1.9438 : 0, ft = t ? t.altitude * 3.2808 : 0, fpm = t ? t.verticalSpeed * 196.85 : 0;
  const hdg = t ? t.heading : 0, bank = t ? t.bank : 0, pitch = t ? t.pitchAngle : 0, beta = t ? t.beta : 0;
  const V = t ? Math.max(t.airspeed, 15) : 15;
  // coordinated turn rate for the turn coordinator: standard rate (3 deg/s) puts the wing on the mark
  const turnRate = t && !t.onWater && !t.onGround ? (9.81 * Math.tan(bank) / V) / DEG : 0;
  const rpmVal = 600 + rpm01 * 2000;
  const map = THREE.MathUtils.clamp(11 + 19 * throttle - (t ? t.altitude : 0) / 300, 10, 35);
  s.kt = kt; s.ft = ft; s.fpm = fpm; s.hdg = hdg; s.bankDeg = bank / DEG; s.pitchDeg = pitch / DEG; s.rpm = rpmVal; s.map = map; s.turnRateDps = turnRate; s.slip = beta;
  A[CH.fixed] = 0;
  A[CH.asi] = -DIAL.asi(kt) * DEG;
  A[CH.adi] = bank; A[CH.adiBank] = bank;
  S[CH.adi * 2] = 0; S[CH.adi * 2 + 1] = -THREE.MathUtils.clamp(pitch / DEG, -25, 25) * (G.adi.r / 30);
  A[CH.alt100] = -DIAL.alt100(ft) * DEG;
  A[CH.alt1000] = -DIAL.alt1000(ft) * DEG;
  A[CH.tc] = -THREE.MathUtils.clamp(turnRate / 3, -1.6, 1.6) * 20 * DEG;
  const ballX = THREE.MathUtils.clamp(beta * 5, -1, 1) * 0.36 * G.tc.r;
  S[CH.tcBall * 2] = ballX; S[CH.tcBall * 2 + 1] = (ballX * ballX) / (2.3 * G.tc.r);
  A[CH.hdg] = hdg * DEG;
  A[CH.vsi] = -DIAL.vsi(fpm) * DEG;
  A[CH.rpm] = -DIAL.rpm(rpmVal) * DEG;
  A[CH.map] = -DIAL.map(map) * DEG;
  A[CH.oilp] = -DIAL.small(rpm01 > 0.05 ? 0.55 + 0.25 * rpm01 : 0) * DEG;
  A[CH.oilt] = -DIAL.small(0.35 + 0.35 * rpm01) * DEG;
  A[CH.egt] = -DIAL.small(0.15 + 0.6 * rpm01) * DEG;
  A[CH.fuell] = -DIAL.small(0.62) * DEG;
  A[CH.fuelr] = -DIAL.small(0.57) * DEG;
  // the moving map is a canvas: redraw at most 15 times per simulated second, and only when its numbers change
  if (model.canvasAcc >= CANVAS_PERIOD) {
    model.canvasAcc = 0;
    model.gps.draw(t ? t.groundSpeed * 1.9438 : 0, hdg, ft, fpm);
  }
}
