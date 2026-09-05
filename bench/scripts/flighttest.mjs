#!/usr/bin/env node
/**
 * Automated flight-model test suite for the seaplane. Drives the FlightModel directly at a fixed 60 Hz
 * step inside the bench page (graphics settings do not matter) and reports one JSON summary compared
 * against the handling targets. Every test starts from an explicit `place()` so the results are
 * deterministic; the whole suite is run twice (page reload in between) and the two summaries compared.
 *
 *   node bench/scripts/flighttest.mjs [url] [outJson] [--single]
 *
 *   url      dev/preview server (default http://127.0.0.1:4173/)
 *   outJson  detailed logs + summary (default bench/out/flighttest.json)
 *   --single skip the second (determinism) run
 *
 * Tests: rest datum; water takeoff with a 5 m/s tailwind (bench `water-landing` state, heading 086) and
 * into the wind (heading 289); steady roll rate at full aileron at 55 m/s (+ aileron yaw sense); full
 * elevator step (peak pitch rate, overshoots, settle time); steady 45-degree turn rate vs theory;
 * power-off stall entry and hands-off recovery; phugoid damping; water landing from 60 m at 32 m/s with
 * flaps (touchdown sink, bounces, stop distance); runway 09 landing on the wheels; inverted-on-surface
 * and terrain-impact crash resets; chase-camera aircraft-centroid stability over a 6 s manoeuvring clip.
 */
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith('--')));
const positional = args.filter((a) => !a.startsWith('--'));
const url = (positional[0] || 'http://127.0.0.1:4173/').replace(/\/?$/, '/');
const out = positional[1] || 'bench/out/flighttest.json';
const runs = flags.has('--single') ? 1 : 2;

const TARGETS = {
  restY: { range: [1.91, 2.01], unit: 'm', label: 'rest datum y' },
  restPitchDeg: { range: [-1.5, 3.5], unit: 'deg', label: 'rest pitch' },
  takeoffHeadTimeS: { range: [18, 26], unit: 's', label: 'takeoff into wind, rest to liftoff' },
  takeoffHeadLiftoffMs: { range: [30, 34], unit: 'm/s', label: 'liftoff IAS into wind' },
  takeoffTailLiftoffMs: { range: [29, 35], unit: 'm/s', label: 'liftoff IAS with tailwind' },
  rollRateDegS: { range: [45, 65], unit: 'deg/s', label: 'steady roll rate, full aileron, 55 m/s' },
  adverseYaw: { equals: true, label: 'aileron yaw is adverse' },
  elevatorPeakPitchRateDegS: { range: [12, 20], unit: 'deg/s', label: 'full elevator step peak pitch rate' },
  elevatorOvershoots: { range: [0, 1], unit: '', label: 'pitch-rate overshoots' },
  elevatorSettleS: { range: [0, 4], unit: 's', label: 'pitch-rate settle time' },
  turnRateErrorPct: { range: [-15, 15], unit: '%', label: '45-degree turn rate vs g tan(phi)/V' },
  stallRecoverS: { range: [0, 6], unit: 's', label: 'hands-off stall recovery time' },
  stallAltLostM: { range: [0, 60], unit: 'm', label: 'altitude lost in the stall recovery' },
  phugoidDamping: { range: [0.1, 1], unit: '', label: 'phugoid damping ratio' },
  waterTouchdownSinkMs: { range: [0, 1.5], unit: 'm/s', label: 'water landing touchdown sink' },
  waterBounces: { range: [0, 1], unit: '', label: 'water landing bounces' },
  runwayUprightStopped: { equals: true, label: 'runway landing rolls out upright and stops' },
  maxInvertedS: { range: [0, 3], unit: 's', label: 'longest inverted-on-surface spell' },
  cameraMinX: { range: [0.45, 0.55], unit: '', label: 'chase camera centroid x (min)' },
  cameraMaxX: { range: [0.45, 0.55], unit: '', label: 'chase camera centroid x (max)' },
  // the chase camera looks 6 m ahead of the datum, so the aircraft sits in the lower third; the settled spring pose
  // (camera.ts settle/chaseDesired) puts the datum at 0.67-0.70 through a 45-degree bank, climb and push-over
  cameraMinY: { range: [0.5, 0.72], unit: '', label: 'chase camera centroid y (min)' },
  cameraMaxY: { range: [0.5, 0.72], unit: '', label: 'chase camera centroid y (max)' },
  nanCount: { range: [0, 0], unit: '', label: 'non-finite telemetry samples' },
};

/** Runs inside the page. Must stay self-contained (serialised by puppeteer). */
function suite() {
  const g = window.__game;
  const f = g.aircraft.flight;
  const inp = g.aircraft.inputs;
  const model = g.aircraft.model;
  const fc = g.flightCamera;
  const bench = window.__bench;
  const DT = 1 / 60;
  const D2R = Math.PI / 180, R2D = 180 / Math.PI;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const r1 = (v) => Math.round(v * 10) / 10;
  const r2 = (v) => Math.round(v * 100) / 100;
  const r3 = (v) => Math.round(v * 1000) / 1000;
  const ambientTurbulence = g.atmos.preset.turbulence;
  const logs = {};
  const results = {};
  let nanCount = 0;
  let maxInvertedS = 0, invertedS = 0;
  const upY = () => { const q = f.quaternion; return 1 - 2 * (q.x * q.x + q.z * q.z); }; // y of the body up axis
  const finite = (...vs) => vs.every(Number.isFinite);

  const place = (x, y, z, hdgDeg, pitchDeg, bankDeg, speed, throttle, flaps = 0) => {
    g.aircraft.place(x, y, z, hdgDeg * D2R, pitchDeg * D2R, bankDeg * D2R, speed, throttle);
    inp.throttle = throttle; inp.pitch = 0; inp.roll = 0; inp.yaw = 0; inp.flaps = flaps; inp.brake = false;
  };
  const sample = (t, T) => ({ t: r2(t), ias: r1(T.airspeed), alt: r1(T.altitude), vs: r2(T.verticalSpeed), hdg: r1(T.heading), bank: r1(T.bank * R2D), pitch: r1(T.pitchAngle * R2D), alpha: r1(T.alpha * R2D), p: r1(f.omega.x * R2D), q: r1(f.omega.z * R2D), r: r1(f.omega.y * R2D), stalled: T.stalled, water: T.onWater, ground: T.onGround, rpm: r2(T.rpm), shake: r2(T.shake), el: r2(inp.pitch), ail: r2(inp.roll), thr: r2(inp.throttle), crashed: T.crashed === true });
  /** step the flight model for up to `seconds`; control(t, T) may return true to stop early; after(t) runs post-step. */
  const sim = (name, seconds, control, every = 15, after = null) => {
    const log = logs[name] || (logs[name] = []);
    const n = Math.round(seconds / DT);
    let t = 0;
    for (let i = 0; i < n; i++) {
      const T = f.telemetry;
      if (control(t, T, i) === true) break;
      f.step(inp, DT);
      t += DT;
      if (after) after(t, i);
      const T2 = f.telemetry;
      const p = f.position, v = f.velocity, w = f.omega, q = f.quaternion;
      if (!finite(T2.airspeed, T2.altitude, T2.verticalSpeed, T2.heading, T2.alpha, T2.beta, T2.bank, T2.pitchAngle, T2.gForce, T2.shake, p.x, p.y, p.z, v.x, v.y, v.z, w.x, w.y, w.z, q.x, q.y, q.z, q.w)) nanCount++;
      const nearSurface = T2.onWater || T2.onGround || T2.agl < 4;
      if (upY() < 0 && nearSurface) { invertedS += DT; maxInvertedS = Math.max(maxInvertedS, invertedS); } else invertedS = 0;
      if (i % every === 0) log.push(sample(t, T2));
    }
    log.push(sample(t, f.telemetry));
    return t;
  };
  // autopilot helpers. Pitch is a cascade: vertical-speed error -> pitch-attitude command -> elevator with
  // pitch-rate damping and a slow integrator for the trim offset, so it works across control-authority changes.
  const makeAttitudeHold = () => { let ei = 0; return (T, thetaCmd) => { const e = thetaCmd - T.pitchAngle; ei = clamp(ei + e * DT, -0.5, 0.5); return clamp(4.0 * e + 1.5 * ei - 0.6 * f.omega.z, -0.8, 0.9); }; };
  const makeVsHold = (kp = 0.035, ki = 0.012) => { let ei = 0; const att = makeAttitudeHold(); return (T, targetVs) => { const e = targetVs - T.verticalSpeed; ei = clamp(ei + e * DT, -6, 6); return att(T, clamp(kp * e + ki * ei + 0.03, -0.25, 0.3)); }; };
  const bankHold = (T, targetBank) => clamp((targetBank - T.bank) * 3.0 - 0.35 * f.omega.x, -1, 1);
  const hdgToBank = (T, targetHdg, maxBank = 30 * D2R) => { const dh = ((targetHdg - T.heading + 540) % 360) - 180; return clamp(dh * 0.02, -maxBank, maxBank); };
  const makeSpeedHold = (base = 0.65) => { let ei = 0; return (T, targetV) => { const e = targetV - T.airspeed; ei = clamp(ei + e * DT, -10, 10); return clamp(base + e * 0.06 + ei * 0.02, 0.05, 1); }; };
  const unwrapHeading = () => { let last = null, acc = 0; return (h) => { if (last !== null) { let d = h - last; if (d > 180) d -= 360; if (d < -180) d += 360; acc += d; } last = h; return acc; }; };

  // ------------------------------------------------------------------ 1. rest datum on the water
  {
    f.turbulence = ambientTurbulence;
    place(-500, 1.96, 3330, 86, 0, 0, 0, 0, 0);
    let minY = Infinity, maxY = -Infinity; const ys = [], pitches = [];
    sim('rest', 10, (t, T) => { minY = Math.min(minY, T.altitude); maxY = Math.max(maxY, T.altitude); if (t > 8) { ys.push(T.altitude); pitches.push(T.pitchAngle * R2D); } }, 6);
    const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length;
    results.rest = { restY: r3(mean(ys)), restPitchDeg: r2(mean(pitches)), minY: r3(minY), maxY: r3(maxY), settledHeaveMm: r1((Math.max(...ys) - Math.min(...ys)) * 1000) };
  }

  // ------------------------------------------------------------------ 2/3. water takeoffs
  const takeoff = (name, hdg) => {
    f.turbulence = ambientTurbulence;
    place(-500, 1.96, 3330, hdg, 0, 0, 0, 0, 0.5);
    const x0 = f.position.x, z0 = f.position.z;
    const vsHold = makeVsHold();
    const att = makeAttitudeHold();
    let airborne = null, liftoff = null, skips = 0, climb8 = null, maxRunPitch = -99, runDist = null;
    sim(name, 70, (t, T) => {
      inp.throttle = 1; inp.flaps = 0.5;
      if (liftoff === null) {
        // floatplane technique: yoke back to raise the bows, hold ~5 deg nose-up on the step, rotate at 30 m/s
        const V = T.airspeed;
        inp.pitch = T.onWater ? (V < 12 ? 0.5 : V < 30 ? att(T, 5 * D2R) : 0.7) : 0.5;
        inp.roll = bankHold(T, 0);
        maxRunPitch = Math.max(maxRunPitch, T.pitchAngle * R2D);
        if (!T.onWater) {
          if (airborne === null) airborne = { t, ias: T.airspeed, pitchDeg: T.pitchAngle * R2D, dist: Math.hypot(f.position.x - x0, f.position.z - z0) };
          else if (t - airborne.t > 1.0) { liftoff = airborne; runDist = airborne.dist; } // airborne for a full second: not a skip
        } else { if (airborne !== null) skips++; airborne = null; }
      } else {
        inp.pitch = vsHold(T, 3.0); inp.roll = bankHold(T, 0);
        if (t - liftoff.t >= 9 && climb8 === null) { climb8 = T.verticalSpeed; return true; }
      }
    }, 6);
    results[name] = liftoff ? { timeS: r2(liftoff.t), liftoffIasMs: r2(liftoff.ias), liftoffPitchDeg: r1(liftoff.pitchDeg), runDistanceM: Math.round(runDist), skips, maxRunPitchDeg: r1(maxRunPitch), climbAt8sMs: r2(climb8 ?? f.telemetry.verticalSpeed), iasAt8sMs: r1(f.telemetry.airspeed), headwindMs: r2(-(f.wind.x * Math.sin(hdg * D2R) - f.wind.z * Math.cos(hdg * D2R))) } : { timeS: null, liftoffIasMs: null, failed: 'no liftoff within 70 s', skips, maxRunPitchDeg: r1(maxRunPitch) };
  };
  takeoff('takeoffTail', 86);
  takeoff('takeoffHead', 289);

  // ------------------------------------------------------------------ 4. roll rate at 55 m/s
  /** level flight at `speed` with a slow throttle loop; returns the trimmed elevator and throttle */
  const trimLevel = (name, seconds, speed) => {
    const vsHold = makeVsHold();
    const spd = makeSpeedHold(0.65);
    let elSum = 0, elN = 0, thr = 0.65;
    sim(name, seconds, (t, T) => { thr = spd(T, speed); inp.throttle = thr; inp.pitch = vsHold(T, 0); inp.roll = bankHold(T, 0); if (t > seconds - 1) { elSum += inp.pitch; elN++; } }, 30);
    return { el: elSum / Math.max(1, elN), thr };
  };
  {
    f.turbulence = 0;
    place(1800, 300, 1200, 290, 0, 0, 55, 0.6, 0);
    const { el: trimEl, thr: trimThr } = trimLevel('rollTrim', 12, 55);
    const ps = [], rs = [], betas = [];
    let peakP = 0;
    sim('roll', 2.0, (t, T) => {
      inp.roll = 1; inp.pitch = trimEl; inp.yaw = 0; inp.throttle = trimThr;
      ps.push([t, f.omega.x * R2D]); rs.push([t, f.omega.y * R2D]); betas.push([t, T.beta * R2D]);
      peakP = Math.max(peakP, f.omega.x * R2D);
    }, 3);
    const win = (arr, a, b) => { const v = arr.filter(([t]) => t >= a && t < b).map(([, x]) => x); return v.reduce((s, x) => s + x, 0) / Math.max(1, v.length); };
    const steady = win(ps, 1.2, 1.8);
    const t63 = ps.find(([, p]) => p >= 0.63 * steady)?.[0] ?? null;
    const yaw0 = win(rs, 0.05, 0.4); // +r = nose left; adverse yaw for a right roll command is nose left
    const beta05 = betas.find(([t]) => t >= 0.5)?.[1] ?? 0;
    results.roll = { steadyRollRateDegS: r1(steady), peakRollRateDegS: r1(peakP), timeTo63PctS: t63 === null ? null : r2(t63), initialYawRateDegS: r2(yaw0), betaAt05sDeg: r2(beta05), adverseYaw: yaw0 > 0, bankAt1sDeg: r1((logs.roll.find((s) => s.t >= 1.0) ?? logs.roll[logs.roll.length - 1]).bank), iasMs: r1(f.telemetry.airspeed), trimThrottle: r2(trimThr) };
    sim('rollRecover', 3, (t, T) => { inp.roll = bankHold(T, 0); inp.pitch = trimEl; }, 30);
  }

  // ------------------------------------------------------------------ 5. elevator step
  {
    f.turbulence = 0;
    place(1800, 300, 1200, 290, 0, 0, 55, 0.6, 0);
    const { thr: trimThr } = trimLevel('elevatorTrim', 12, 55);
    const pitch0 = f.telemetry.pitchAngle * R2D, alt0 = f.telemetry.altitude, ias0 = f.telemetry.airspeed;
    const qs = [];
    let maxPitch = -99, maxVs = -99, maxG = 0, minIas = 999;
    sim('elevatorStep', 4, (t, T) => {
      inp.pitch = 1; inp.roll = bankHold(T, 0); inp.throttle = trimThr;
      qs.push([t, f.omega.z * R2D]);
      maxPitch = Math.max(maxPitch, T.pitchAngle * R2D); maxVs = Math.max(maxVs, T.verticalSpeed); maxG = Math.max(maxG, T.gForce); minIas = Math.min(minIas, T.airspeed);
    }, 3);
    const peak = Math.max(...qs.map(([, q]) => q));
    const tPeak = qs.find(([, q]) => q === peak)[0];
    // steady trend: linear fit over the last two seconds (the rate drifts slowly as the speed bleeds off)
    const tail = qs.filter(([t]) => t >= 2);
    const n = tail.length, sx = tail.reduce((s, [t]) => s + t, 0), sy = tail.reduce((s, [, q]) => s + q, 0), sxx = tail.reduce((s, [t]) => s + t * t, 0), sxy = tail.reduce((s, [t, q]) => s + t * q, 0);
    const slope = (n * sxy - sx * sy) / Math.max(1e-9, n * sxx - sx * sx), icpt = (sy - slope * sx) / n;
    const trend = (t) => icpt + slope * Math.max(t, 2);
    const band = 0.1 * peak;
    let settle = 0;
    for (const [t, q] of qs) if (Math.abs(q - trend(t)) > band) settle = t;
    // overshoots: local extrema of (q - trend) after the peak that leave the +-5% band
    let overshoots = 0;
    for (let i = 1; i < qs.length - 1; i++) {
      const [t, q] = qs[i];
      if (t <= tPeak) continue;
      const d = q - trend(t), dp = qs[i - 1][1] - trend(qs[i - 1][0]), dn = qs[i + 1][1] - trend(qs[i + 1][0]);
      if (Math.abs(d) > 0.05 * peak && ((d > dp && d > dn) || (d < dp && d < dn))) overshoots++;
    }
    overshoots += 1; // the first peak itself is the overshoot above the steady trend
    if (peak - trend(4) < 0.05 * peak) overshoots -= 1;
    results.elevator = { peakPitchRateDegS: r1(peak), tPeakS: r2(tPeak), steadyPitchRateDegS: r1(trend(4)), overshoots, settleS: r2(settle), pitchGainDeg: r1(maxPitch - pitch0), maxVsMs: r1(maxVs), maxG: r2(maxG), entryIasMs: r1(ias0), minIasMs: r1(minIas), altGainM: r1(f.telemetry.altitude - alt0) };
  }

  // ------------------------------------------------------------------ 6. 45-degree turn
  {
    f.turbulence = 0;
    place(1800, 300, 1200, 290, 0, 0, 55, 0.85, 0);
    const vsHold = makeVsHold();
    const unwrap = unwrapHeading();
    let h0 = null, hEnd = 0, vSum = 0, bankSum = 0, nS = 0, alt0 = 0;
    sim('turn', 22, (t, T) => {
      inp.throttle = 0.85; inp.roll = bankHold(T, 45 * D2R); inp.pitch = vsHold(T, clamp((300 - T.altitude) * 0.3, -2, 2));
      const h = unwrap(T.heading);
      if (t >= 7 && h0 === null) { h0 = h; alt0 = T.altitude; }
      if (t >= 7) { hEnd = h; vSum += T.airspeed; bankSum += T.bank; nS++; }
    }, 15);
    const V = vSum / nS, bank = bankSum / nS;
    const rate = Math.abs(hEnd - h0) / 15;
    const theory = 9.81 * Math.tan(bank) / V * R2D;
    results.turn = { turnRateDegS: r2(rate), theoryDegS: r2(theory), errorPct: r1((rate / theory - 1) * 100), meanBankDeg: r1(bank * R2D), meanIasMs: r1(V), altDriftM: r1(f.telemetry.altitude - alt0), timeFor360S: r1(360 / rate) };
  }

  // ------------------------------------------------------------------ 7. power-off stall, hands-off recovery
  /**
   * Power-off stall from a 1.2 deg/s nose-up ramp. `release` = 'trim': the yoke goes back to where the aircraft
   * was trimmed on the way in (the elevator that held 1.3 Vs; there is no trim wheel, so this is what a real
   * hands-off release means) and full power is applied; 'neutral': elevator fully to zero, i.e. re-trimmed for
   * cruise, which necessarily dives to cruise speed (energy: (55^2 - 28^2) / 2g ~ 115 m) and is reported only.
   * Recovered = unstalled, above 1.15 x the minimum speed, sink rate back within 2 m/s.
   */
  const stallTest = (name, release) => {
    f.turbulence = 0;
    place(1800, 400, 1200, 290, 0, 0, 45, 0.05, 0);
    let stall = null, rel = null, minSpeed = 999, maxSink = 0, minAlt = 999, recovered = null, maxBank = 0, breakPitch = null, maxAlphaDeg = 0, trimEl = 0.3, arrested = null;
    sim(name, 45, (t, T) => {
      if (rel === null) {
        inp.throttle = 0.05;
        // raise the nose ~1.2 deg/s from 5 deg so the speed bleeds at roughly a knot per second
        const target = Math.min(22, 5 + 1.2 * t) * D2R;
        inp.pitch = clamp((target - T.pitchAngle) * 3.0 - 0.5 * f.omega.z + 0.1, -0.5, 1);
        inp.roll = bankHold(T, 0);
        if (T.airspeed > 37) trimEl = inp.pitch; // elevator that was holding ~1.3 Vs on the way in
        if (T.stalled && stall === null) stall = { t, ias: T.airspeed, alphaDeg: T.alpha * R2D, pitchDeg: T.pitchAngle * R2D, alt: T.altitude, trimEl };
        if (stall && t - stall.t >= 1.0) rel = { t, alt: T.altitude, ias: T.airspeed, pitchDeg: T.pitchAngle * R2D };
        if (t > 30 && !stall) return true;
      } else {
        // standard recovery action on the power lever only: full throttle; yoke released, feet off
        inp.pitch = release === 'trim' ? stall.trimEl : 0; inp.roll = 0; inp.yaw = 0; inp.throttle = 1;
        minSpeed = Math.min(minSpeed, T.airspeed); maxSink = Math.min(maxSink, T.verticalSpeed); minAlt = Math.min(minAlt, T.altitude);
        maxBank = Math.max(maxBank, Math.abs(T.bank * R2D)); maxAlphaDeg = Math.max(maxAlphaDeg, T.alpha * R2D);
        if (breakPitch === null || T.pitchAngle * R2D < breakPitch) breakPitch = T.pitchAngle * R2D;
        if (recovered === null && !T.stalled && T.airspeed > 1.15 * Math.max(minSpeed, 20) && T.verticalSpeed >= -2 && t - rel.t > 0.3) recovered = t;
        if (arrested === null && !T.stalled && T.verticalSpeed >= 0 && t - rel.t > 0.3) arrested = t;
        if (arrested !== null || t - rel.t > 25) return true;
      }
    }, 6);
    results[name] = stall ? {
      release, stallIasMs: r1(stall.ias), stallAlphaDeg: r1(stall.alphaDeg), pitchAtStallDeg: r1(stall.pitchDeg), releasePitchDeg: r1(rel?.pitchDeg ?? 0), releaseElevator: r2(release === 'trim' ? stall.trimEl : 0), lowestPitchDeg: r1(breakPitch ?? 0),
      minIasMs: r1(minSpeed), maxSinkMs: r1(maxSink), altLostM: r1((rel?.alt ?? stall.alt) - minAlt), altLostFromStallM: r1(stall.alt - Math.min(minAlt, stall.alt)),
      recoverS: recovered === null ? null : r2(recovered - rel.t), descentArrestedS: arrested === null ? null : r2(arrested - rel.t), maxBankDeg: r1(maxBank), maxAlphaDeg: r1(maxAlphaDeg),
    } : { failed: 'no stall flag within 30 s' };
  };
  stallTest('stall', 'trim');
  stallTest('stallNeutral', 'neutral');

  // ------------------------------------------------------------------ 8. phugoid
  {
    f.turbulence = 0;
    place(1800, 300, 1200, 290, 0, 0, 55, 0.72, 0);
    const series = [];
    sim('phugoid', 100, (t, T) => {
      inp.throttle = 0.72; inp.roll = bankHold(T, 0); inp.yaw = 0;
      inp.pitch = t < 4 ? 0 : t < 5.5 ? 0.5 : 0; // settle, pulse, hands off
      if (t >= 5.5) series.push([t, T.airspeed]);
    }, 15);
    // peaks/troughs of airspeed with a 6 s minimum spacing
    const ext = [];
    for (let i = 60; i < series.length - 60; i++) {
      const v = series[i][1];
      let isMax = true, isMin = true;
      for (let k = i - 60; k <= i + 60; k++) { if (series[k][1] > v) isMax = false; if (series[k][1] < v) isMin = false; }
      if ((isMax || isMin) && (ext.length === 0 || series[i][0] - ext[ext.length - 1].t > 6)) ext.push({ t: series[i][0], v, kind: isMax ? 'max' : 'min' });
    }
    const amps = [];
    for (let i = 0; i + 1 < ext.length; i++) amps.push(Math.abs(ext[i + 1].v - ext[i].v));
    const decs = [];
    for (let i = 0; i + 2 < amps.length; i++) if (amps[i + 2] > 0.05) decs.push(Math.log(amps[i] / amps[i + 2]));
    const delta = decs.length ? decs.slice(0, 3).reduce((s, v) => s + v, 0) / Math.min(3, decs.length) : null;
    const zeta = delta === null ? null : delta / Math.sqrt(4 * Math.PI * Math.PI + delta * delta);
    const periods = [];
    for (let i = 0; i + 2 < ext.length; i++) periods.push(ext[i + 2].t - ext[i].t);
    results.phugoid = { dampingRatio: zeta === null ? null : r3(zeta), periodS: periods.length ? r1(periods.reduce((s, v) => s + v, 0) / periods.length) : null, halfCycles: amps.length, firstAmplitudeMs: amps.length ? r2(amps[0]) : null, lastAmplitudeMs: amps.length ? r2(amps[amps.length - 1]) : null, trimIasMs: r1(series.length ? series[series.length - 1][1] : 0) };
  }

  // ------------------------------------------------------------------ 9. water landing
  const approach = (name, start, hdg, surfaceY, landingMode) => {
    f.turbulence = ambientTurbulence;
    place(start[0], start[1], start[2], hdg, 0, 0, 32, 0.35, 1);
    const vsHold = makeVsHold(0.04, 0.015);
    const spd = makeSpeedHold(0.35);
    let td = null, airborneFrames = 0, bounces = 0, stop = null, maxPitchRateAfter = 0, maxAbsPitch = 0, maxAbsBank = 0, tdPoint = null, crashedSeen = false, minUp = 1, minVsBeforeTd = 0;
    const onSurface = (T) => (landingMode === 'water' ? T.onWater : T.onGround);
    sim(name, 90, (t, T) => {
      inp.flaps = 1;
      if (T.crashed === true) crashedSeen = true;
      if (!td) {
        const agl = T.altitude - surfaceY;
        // stabilised approach: 3 m/s down high up, shallowing continuously into a 0.4 m/s flare; 30 m/s held.
        // The profile is read 1.5 s ahead (height plus closure) because the V/S loop lags a ramping target by
        // about that much - the same anticipation a pilot uses in the flare.
        const targetVs = -clamp((agl + 1.5 * T.verticalSpeed) * 0.12 + 0.3, 0.4, 3.0);
        inp.pitch = vsHold(T, targetVs);
        inp.roll = bankHold(T, hdgToBank(T, hdg, 15 * D2R) * (agl > 15 ? 1 : 0));
        inp.throttle = agl > 6 ? spd(T, 30) : agl > 2.5 ? 0.2 : 0.08;
        minVsBeforeTd = Math.min(minVsBeforeTd, T.verticalSpeed);
        if (onSurface(T)) { td = { t, sink: -T.verticalSpeed, ias: T.airspeed, pitchDeg: T.pitchAngle * R2D, gs: T.groundSpeed }; tdPoint = [f.position.x, f.position.z]; }
      } else {
        inp.throttle = 0; inp.pitch = 0.35; inp.roll = bankHold(T, 0); inp.brake = landingMode === 'runway';
        if (!onSurface(T)) airborneFrames++; else { if (airborneFrames >= 3) bounces++; airborneFrames = 0; }
        maxPitchRateAfter = Math.max(maxPitchRateAfter, Math.abs(f.omega.z * R2D));
        maxAbsPitch = Math.max(maxAbsPitch, Math.abs(T.pitchAngle * R2D)); maxAbsBank = Math.max(maxAbsBank, Math.abs(T.bank * R2D));
        minUp = Math.min(minUp, upY());
        if (stop === null && T.groundSpeed < 0.5 && t - td.t > 2) { stop = { t, dist: Math.hypot(f.position.x - tdPoint[0], f.position.z - tdPoint[1]) }; }
        if (stop && t - stop.t > 2) return true;
      }
    }, 6);
    const T = f.telemetry;
    results[name] = td ? {
      touchdownSinkMs: r2(td.sink), touchdownIasMs: r1(td.ias), touchdownGroundSpeedMs: r1(td.gs), touchdownPitchDeg: r1(td.pitchDeg), bounces, stopDistanceM: stop ? Math.round(stop.dist) : null, stopTimeS: stop ? r1(stop.t - td.t) : null,
      maxPitchRateAfterTdDegS: r1(maxPitchRateAfter), maxAbsPitchDeg: r1(maxAbsPitch), maxAbsBankDeg: r1(maxAbsBank), minUpY: r2(minUp), finalUpY: r2(upY()), finalY: r2(f.position.y), finalGroundSpeedMs: r2(T.groundSpeed), crashedSeen, uprightStopped: upY() > 0.95 && T.groundSpeed < 0.5 && !crashedSeen, steepestApproachVsMs: r1(minVsBeforeTd),
      centerlineOffsetM: landingMode === 'runway' ? r1(f.position.z - start[2]) : undefined,
    } : { failed: 'no touchdown within 90 s', finalAlt: r1(T.altitude), finalIas: r1(T.airspeed) };
  };
  approach('waterLanding', [0, 60, 3295], 266, 0, 'water');
  approach('runwayLanding', [-9800, 2.9 + 55, -1350], 90, 2.9, 'runway');

  // ------------------------------------------------------------------ 11. crash resets
  {
    f.turbulence = ambientTurbulence;
    // inverted at rest on runway 09
    place(-8000, 2.9 + 2.2, -1350, 90, 0, 180, 0, 0, 0);
    let upright = null, crashedSeen = false, crashedAt = null;
    sim('inverted', 8, (t, T) => { if (T.crashed === true) { crashedSeen = true; if (crashedAt === null) crashedAt = t; } if (upright === null && upY() > 0.9) upright = t; }, 6);
    results.invertedReset = { uprightAfterS: upright === null ? null : r2(upright), crashedSeen, crashedAtS: crashedAt === null ? null : r2(crashedAt), finalUpY: r2(upY()), finalY: r2(f.position.y), finalSpeedMs: r2(f.velocity.length()) };
    // steep dive into the airport grass at ~-20 m/s vertical, elevator held forward
    place(-8000, 2.8 + 60, -1600, 90, -30, 0, 40, 0.5, 0);
    let impactVs = 0, tImpact = null, atRest = null, prevVs = 0; crashedSeen = false;
    sim('terrainImpact', 10, (t, T) => {
      inp.pitch = tImpact === null ? -0.5 : 0; inp.throttle = tImpact === null ? 0.5 : 0;
      if (tImpact === null && (T.onGround || T.onWater)) { tImpact = t; impactVs = prevVs; }
      prevVs = T.verticalSpeed;
      if (T.crashed === true) crashedSeen = true;
      if (tImpact !== null && atRest === null && f.velocity.length() < 0.3 && upY() > 0.95) atRest = t;
    }, 6);
    results.terrainImpact = { impactVsMs: r1(impactVs), crashedSeen, atRestAfterImpactS: atRest === null || tImpact === null ? null : r2(atRest - tImpact), finalUpY: r2(upY()), finalY: r2(f.position.y), finalSpeedMs: r2(f.velocity.length()), finalAglM: r2(f.telemetry.agl) };
  }

  // ------------------------------------------------------------------ 12. chase camera centroid stability
  {
    f.turbulence = ambientTurbulence;
    place(1800, 300, 1200, 290, 0, 0, 55, 0.72, 0);
    // settle at the spring's steady pose for the aircraft's velocity: integrating the spring against a frozen
    // aircraft parks the camera a feed-forward lead (v * C/K ~ 13 m) ahead of that pose, and the first simulated
    // frame then projects the aircraft off the bottom of the frame (centroid y 1.06) before the spring recovers
    fc.mode = 'chase'; fc.orbitYaw = 0; fc.orbitPitch = 0; fc.baseFov = 50;
    fc.settle(f, model, DT);
    const vsHold = makeVsHold();
    let minX = 1, maxX = 0, minY = 1, maxY = 0, offscreen = 0;
    const xs = [];
    sim('camera', 6, (t, T) => {
      // level, roll into a 45-degree left bank with a climb, roll out and push over
      if (t < 1) { inp.roll = bankHold(T, 0); inp.pitch = vsHold(T, 0); }
      else if (t < 3.5) { inp.roll = bankHold(T, -45 * D2R); inp.pitch = vsHold(T, 3); }
      else { inp.roll = bankHold(T, 0); inp.pitch = vsHold(T, -3); }
      inp.throttle = 0.72;
    }, 60, (t, i) => {
      // camera in lock-step with the physics, aircraft datum projected to screen-normalised coordinates
      fc.update(f, model, DT);
      g.camera.updateMatrixWorld(true);
      const pr = bench.project(f.position.x, f.position.y, f.position.z);
      if (!pr) { offscreen++; return; }
      minX = Math.min(minX, pr[0]); maxX = Math.max(maxX, pr[0]); minY = Math.min(minY, pr[1]); maxY = Math.max(maxY, pr[1]);
      if (i % 30 === 0) xs.push([r2(t), r3(pr[0]), r3(pr[1])]);
    });
    results.camera = { minX: r3(minX), maxX: r3(maxX), minY: r3(minY), maxY: r3(maxY), offscreenFrames: offscreen, fov: r1(g.camera.fov), samples: xs, maxBankDeg: r1(Math.max(...logs.camera.map((s) => Math.abs(s.bank)))) };
  }

  results.maxInvertedS = r2(maxInvertedS);
  results.nanCount = nanCount;
  return { results, logs };
}

function flatten(results) {
  const r = results;
  return {
    restY: r.rest.restY, restPitchDeg: r.rest.restPitchDeg,
    takeoffTailTimeS: r.takeoffTail.timeS, takeoffTailLiftoffMs: r.takeoffTail.liftoffIasMs, takeoffTailRunM: r.takeoffTail.runDistanceM ?? null,
    takeoffHeadTimeS: r.takeoffHead.timeS, takeoffHeadLiftoffMs: r.takeoffHead.liftoffIasMs, takeoffHeadRunM: r.takeoffHead.runDistanceM ?? null,
    rollRateDegS: r.roll.steadyRollRateDegS, rollTimeTo63PctS: r.roll.timeTo63PctS, adverseYaw: r.roll.adverseYaw, initialYawRateDegS: r.roll.initialYawRateDegS,
    elevatorPeakPitchRateDegS: r.elevator.peakPitchRateDegS, elevatorOvershoots: r.elevator.overshoots, elevatorSettleS: r.elevator.settleS, elevatorPitchGainDeg: r.elevator.pitchGainDeg, elevatorMaxVsMs: r.elevator.maxVsMs, elevatorMaxG: r.elevator.maxG,
    turnRateDegS: r.turn.turnRateDegS, turnTheoryDegS: r.turn.theoryDegS, turnRateErrorPct: r.turn.errorPct,
    stallIasMs: r.stall.stallIasMs, stallAlphaDeg: r.stall.stallAlphaDeg, stallMinIasMs: r.stall.minIasMs, stallMaxSinkMs: r.stall.maxSinkMs, stallAltLostM: r.stall.altLostM, stallRecoverS: r.stall.recoverS, stallLowestPitchDeg: r.stall.lowestPitchDeg, stallMaxBankDeg: r.stall.maxBankDeg,
    stallNeutralAltLostM: r.stallNeutral.altLostM, stallNeutralRecoverS: r.stallNeutral.recoverS, stallNeutralLowestPitchDeg: r.stallNeutral.lowestPitchDeg,
    phugoidDamping: r.phugoid.dampingRatio, phugoidPeriodS: r.phugoid.periodS,
    waterTouchdownSinkMs: r.waterLanding.touchdownSinkMs, waterBounces: r.waterLanding.bounces, waterStopDistanceM: r.waterLanding.stopDistanceM, waterTouchdownPitchDeg: r.waterLanding.touchdownPitchDeg,
    runwayTouchdownSinkMs: r.runwayLanding.touchdownSinkMs, runwayRolloutM: r.runwayLanding.stopDistanceM, runwayMaxAbsPitchDeg: r.runwayLanding.maxAbsPitchDeg, runwayMaxAbsBankDeg: r.runwayLanding.maxAbsBankDeg, runwayUprightStopped: r.runwayLanding.uprightStopped ?? false,
    invertedUprightAfterS: r.invertedReset.uprightAfterS, terrainImpactCrashed: r.terrainImpact.crashedSeen, maxInvertedS: r.maxInvertedS,
    cameraMinX: r.camera.minX, cameraMaxX: r.camera.maxX, cameraMinY: r.camera.minY, cameraMaxY: r.camera.maxY,
    nanCount: r.nanCount,
  };
}

function evaluate(flat) {
  const checks = {};
  let all = true;
  for (const [k, tgt] of Object.entries(TARGETS)) {
    const v = flat[k];
    let ok;
    if ('equals' in tgt) ok = v === tgt.equals;
    else ok = typeof v === 'number' && Number.isFinite(v) && v >= tgt.range[0] && v <= tgt.range[1];
    checks[k] = { value: v ?? null, target: 'equals' in tgt ? tgt.equals : tgt.range, pass: ok, label: tgt.label };
    if (!ok) all = false;
  }
  return { checks, allPass: all };
}

async function runOnce(browser) {
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.error('[page error]', e.message));
  await page.goto(`${url}?bench=water-landing&w=640&h=360&quality=low&freeze=1`, { waitUntil: 'load', timeout: 300000 });
  await page.waitForFunction('window.__benchReady === true', { timeout: 900000, polling: 250 });
  const r = await page.evaluate(suite);
  await page.close();
  return r;
}

const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || '/usr/local/bin/google-chrome', headless: true, args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'], defaultViewport: { width: 640, height: 360 }, protocolTimeout: 1800000 });
const t0 = Date.now();
const first = await runOnce(browser);
let deterministic = null;
if (runs > 1) {
  const second = await runOnce(browser);
  deterministic = JSON.stringify(first.results) === JSON.stringify(second.results);
  if (!deterministic) {
    for (const k of Object.keys(first.results)) if (JSON.stringify(first.results[k]) !== JSON.stringify(second.results[k])) console.error(`non-deterministic: ${k}\n  run1 ${JSON.stringify(first.results[k])}\n  run2 ${JSON.stringify(second.results[k])}`);
  }
}
await browser.close();

const flat = flatten(first.results);
const { checks, allPass } = evaluate(flat);
const summary = { build: undefined, elapsedS: Math.round((Date.now() - t0) / 1000), allPass: allPass && (deterministic !== false), deterministic, checks, metrics: flat };
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify({ summary, results: first.results, logs: first.logs }, null, 1));

// ---- report
const line = (k, obj) => console.log(`${k.padEnd(16)} ${JSON.stringify(obj)}`);
for (const k of ['rest', 'takeoffTail', 'takeoffHead', 'roll', 'elevator', 'turn', 'stall', 'stallNeutral', 'phugoid', 'waterLanding', 'runwayLanding', 'invertedReset', 'terrainImpact', 'camera']) line(k, first.results[k]);
console.log('');
console.log('check'.padEnd(28) + 'value'.padStart(10) + '   target'.padEnd(18) + ' result   ' + 'description');
for (const [k, c] of Object.entries(checks)) {
  const tgt = Array.isArray(c.target) ? `[${c.target.map((v) => (Number.isFinite(v) ? v : '∞')).join(', ')}]` : String(c.target);
  console.log(k.padEnd(28) + String(c.value).padStart(10) + `   ${tgt}`.padEnd(18) + (c.pass ? ' PASS     ' : ' FAIL     ') + c.label);
}
console.log(`\ndeterministic: ${deterministic === null ? 'not checked (--single)' : deterministic}   allPass: ${summary.allPass}   (${summary.elapsedS} s)`);
console.log('\nFINAL_SUMMARY ' + JSON.stringify({ allPass: summary.allPass, deterministic, metrics: flat }));
process.exit(summary.allPass ? 0 : 1);
