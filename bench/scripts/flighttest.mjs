#!/usr/bin/env node
/**
 * Automated flight-model test: takeoff run from the water, climb, level cruise, 45-degree banked turn,
 * power-off stall, and a water landing. Runs at a fixed 60 Hz step through window.__bench-free direct
 * calls so graphics settings do not matter. Prints a telemetry table and writes JSON.
 *
 *   node bench/scripts/flighttest.mjs [url] [outJson]
 */
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

const url = process.argv[2] || 'http://127.0.0.1:4173/';
const out = process.argv[3] || 'bench/out/flighttest.json';
const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || '/usr/local/bin/google-chrome', headless: true, args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'], defaultViewport: { width: 640, height: 360 }, protocolTimeout: 1800000 });
const page = await browser.newPage();
await page.goto(`${url}?bench=water-landing&w=640&h=360&quality=low&freeze=1`, { waitUntil: 'load', timeout: 300000 });
await page.waitForFunction('window.__benchReady === true', { timeout: 900000, polling: 250 });

const result = await page.evaluate(() => {
  const g = window.__game;
  const f = g.aircraft.flight;
  const inp = g.aircraft.inputs;
  const dt = 1 / 60;
  const log = [];
  let t = 0;
  const rec = (phase) => { const T = f.telemetry; log.push({ t: +t.toFixed(2), phase, kias: +(T.airspeed * 1.9438).toFixed(1), altFt: +(T.altitude * 3.2808).toFixed(0), vsFpm: +(T.verticalSpeed * 196.85).toFixed(0), hdg: +T.heading.toFixed(0), bankDeg: +(T.bank * 57.3).toFixed(1), pitchDeg: +(T.pitchAngle * 57.3).toFixed(1), alphaDeg: +(T.alpha * 57.3).toFixed(1), stalled: T.stalled, onWater: T.onWater, rpm: +T.rpm.toFixed(2), shake: +T.shake.toFixed(2) }); };
  const run = (seconds, phase, control) => { const n = Math.round(seconds / dt); for (let i = 0; i < n; i++) { control(t, f.telemetry); f.step(inp, dt); t += dt; if (i % 60 === 0) rec(phase); } rec(phase); };
  // start at rest on the water in open bay water
  g.aircraft.place(1800, 1.9, 1200, 290 * Math.PI / 180, 0, 0, 0, 0); // open bay, into the prevailing WNW wind
  inp.throttle = 0; inp.pitch = 0; inp.roll = 0; inp.yaw = 0; inp.flaps = 0.5; inp.brake = false;
  run(3, 'idle-float', () => {});
  const marks = {};
  let liftoffT = null;
  // simple autopilot helpers: pitch to hold a vertical speed, roll to hold a bank
  const holdVs = (T, targetVs, gain = 0.06) => Math.max(-0.6, Math.min(0.7, (targetVs - T.verticalSpeed) * gain - T.pitchAngle * 0.3 + 0.05));
  const holdBank = (T, targetBank) => Math.max(-1, Math.min(1, (targetBank - T.bank) * 2.5));
  run(110, 'takeoff', (tt, T) => {
    inp.throttle = 1;
    if (T.onWater) inp.pitch = T.airspeed * 1.9438 > 45 ? 0.6 : 0.1;
    else inp.pitch = holdVs(T, T.altitude < 450 ? 4.5 : 0);
    inp.roll = holdBank(T, 0);
    if (!T.onWater && liftoffT === null && T.airspeed > 20) { liftoffT = tt; marks.liftoffKias = +(T.airspeed * 1.9438).toFixed(1); marks.liftoffTimeS = +(tt - 3).toFixed(1); }
    if (T.altitude > 250) { inp.flaps = 0; inp.throttle = T.altitude < 450 ? 1.0 : 0.75; }
  });
  marks.afterClimb = { altFt: +(f.telemetry.altitude * 3.2808).toFixed(0), kias: +(f.telemetry.airspeed * 1.9438).toFixed(1), climbRateFpm: +(f.telemetry.verticalSpeed * 196.85).toFixed(0) };
  // level cruise
  run(25, 'cruise', (tt, T) => { inp.throttle = 0.72; inp.pitch = holdVs(T, 0); inp.roll = holdBank(T, 0); });
  marks.cruise = { kias: +(f.telemetry.airspeed * 1.9438).toFixed(1), altFt: +(f.telemetry.altitude * 3.2808).toFixed(0) };
  // 45 degree banked turn to the right, 30 s
  const hdg0 = f.telemetry.heading;
  run(30, 'turn', (tt, T) => { inp.roll = holdBank(T, 45 * Math.PI / 180); inp.pitch = holdVs(T, 0, 0.08); inp.throttle = 0.85; });
  marks.turn = { headingChangeDeg: +(((f.telemetry.heading - hdg0) + 720) % 360).toFixed(0), altFt: +(f.telemetry.altitude * 3.2808).toFixed(0), kias: +(f.telemetry.airspeed * 1.9438).toFixed(1), bankDeg: +(f.telemetry.bank * 57.3).toFixed(1) };
  run(8, 'level', (tt, T) => { inp.roll = holdBank(T, 0); inp.pitch = holdVs(T, 0); inp.throttle = 0.7; });
  // power-off stall: idle, slowly raise the nose until the stall flag, record speed and nose drop
  let stallKias = null, stallInfo = null; let maxPitch = -99; const stallStart = t;
  run(30, 'stall', (tt, T) => {
    inp.throttle = 0.05; inp.roll = holdBank(T, 0); inp.pitch = stallKias === null ? Math.min(0.5, 0.15 + (tt % 1000) * 0) + Math.max(0, (T.airspeed * 1.9438 - 70) * -0.01) : 0.3;
    if (stallKias === null) inp.pitch = Math.max(0.1, Math.min(0.9, (0.14 - T.pitchAngle) * 2.5 + 0.2 + (tt - stallStart) * 0.01)); // hold ~8 deg nose-up and let the speed bleed off
    maxPitch = Math.max(maxPitch, T.pitchAngle);
    if (T.stalled && stallKias === null) { stallKias = +(T.airspeed * 1.9438).toFixed(1); stallInfo = { pitchAtStallDeg: +(T.pitchAngle * 57.3).toFixed(1), alphaDeg: +(T.alpha * 57.3).toFixed(1), t: +tt.toFixed(1) }; }
    if (stallInfo && !stallInfo.noseDropped && T.pitchAngle < maxPitch - 0.12) { stallInfo.noseDropped = true; stallInfo.pitchAfterDropDeg = +(T.pitchAngle * 57.3).toFixed(1); stallInfo.vsAfterDropFpm = +(T.verticalSpeed * 196.85).toFixed(0); stallInfo.tDrop = +tt.toFixed(1); }
  });
  marks.stall = { stallKias, ...(stallInfo || {}) };
  run(10, 'recover', (tt, T) => { inp.throttle = 1.0; inp.pitch = holdVs(T, 2); inp.roll = holdBank(T, 0); });
  // approach and water landing: descend at -3.5 m/s, flare below 15 m, idle at touchdown
  let touchdown = null;
  run(190, 'approach', (tt, T) => {
    inp.flaps = 1;
    const targetHdg = 140; let dh = ((targetHdg - T.heading + 540) % 360) - 180; inp.roll = holdBank(T, Math.max(-0.5, Math.min(0.5, dh * 0.02)) * (T.agl > 30 ? 1 : 0));
    const targetVs = T.agl > 60 ? -3.5 : T.agl > 15 ? -2.0 : -0.8;
    inp.pitch = holdVs(T, targetVs, 0.1);
    inp.throttle = T.agl > 60 ? 0.35 : T.agl > 15 ? 0.25 : 0.12;
    if (T.onWater && touchdown === null) { touchdown = { t: +tt.toFixed(1), kias: +(T.airspeed * 1.9438).toFixed(1), vsFpm: +(T.verticalSpeed * 196.85).toFixed(0) }; }
    if (touchdown) { inp.throttle = 0; inp.pitch = 0.2; }
  });
  marks.touchdown = touchdown;
  marks.final = { kias: +(f.telemetry.airspeed * 1.9438).toFixed(1), onWater: f.telemetry.onWater, altFt: +(f.telemetry.altitude * 3.2808).toFixed(0) };
  return { marks, log };
});
fs.mkdirSync('bench/out', { recursive: true });
fs.writeFileSync(out, JSON.stringify(result, null, 1));
console.log(JSON.stringify(result.marks, null, 1));
console.log('t | phase | KIAS | alt ft | V/S fpm | hdg | bank | pitch | alpha | stalled | water');
for (const r of result.log.filter((_, i) => i % 3 === 0)) console.log(`${r.t} | ${r.phase} | ${r.kias} | ${r.altFt} | ${r.vsFpm} | ${r.hdg} | ${r.bankDeg} | ${r.pitchDeg} | ${r.alphaDeg} | ${r.stalled} | ${r.onWater}`);
await browser.close();
