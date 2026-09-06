#!/usr/bin/env node
/**
 * Live-link verification: loads the deployed build in headless Chrome, checks that the served build id
 * matches the one we just built, renders the reference benchmark view, flies the aircraft for a few
 * seconds of fixed-step simulation and checks telemetry, then writes a screenshot + JSON report.
 *
 *   node bench/scripts/verify-live.mjs <url> <expectedBuildId> [outDir]
 */
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';

const [url, expected, outDir = 'bench/out/live'] = process.argv.slice(2);
if (!url || !expected) { console.error('usage: verify-live.mjs <url> <expectedBuildId> [outDir]'); process.exit(2); }
fs.mkdirSync(outDir, { recursive: true });
const browser = await puppeteer.launch({
  // the machine-wide Chrome slot gate can hold a launch for minutes; never time out on it
  timeout: 1800000,
  executablePath: process.env.CHROME_PATH || '/usr/local/bin/google-chrome', headless: true,
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--window-size=1280,720'],
  defaultViewport: { width: 1280, height: 720, deviceScaleFactor: 1 }, protocolTimeout: 1200000,
});
const page = await browser.newPage();
await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36');
const logs = [];
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
page.on('requestfailed', (r) => logs.push(`[requestfailed] ${r.url()} ${r.failure()?.errorText}`));
const report = { url, expected, ok: false, checks: {} };
const t0 = Date.now();
try {
  const sep = url.includes('?') ? '&' : '?';
  let resp = await page.goto(`${url}${sep}bench=water-landing&w=1280&h=720&quality=low&freeze=1`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  report.checks.httpStatus = resp?.status();
  // githack shows a one-time "External Content Notice" for HTML entry points; click through like a user would
  for (let attempt = 0; attempt < 6; attempt++) {
    const title = await page.title();
    if (title.includes('External Content')) {
      report.checks.interstitial = true;
      await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 120000 }).catch(() => null), page.click('button.url-action-button')]);
    } else if (title.includes('Error 429')) {
      report.checks.rateLimited = (report.checks.rateLimited || 0) + 1;
      await new Promise((r) => setTimeout(r, 70000));
      resp = await page.goto(`${url}${sep}bench=water-landing&w=1280&h=720&quality=low&freeze=1`, { waitUntil: 'domcontentloaded', timeout: 180000 });
    } else break;
  }
  report.checks.finalTitle = await page.title();
  await page.waitForFunction('window.__benchReady === true', { timeout: 900000, polling: 250 });
  report.checks.loadMs = Date.now() - t0;
  const build = await page.evaluate(() => window.__build);
  report.checks.servedBuild = build;
  report.checks.buildMatches = build === expected;
  // takeoff test: full throttle from the water-landing view state (plane at 5 m, 29 m/s, flaps down)
  const tele = await page.evaluate(() => {
    const g = window.__game;
    g.aircraft.inputs.throttle = 1.0;
    g.aircraft.inputs.pitch = 0.25;
    const before = { ...g.aircraft.flight.telemetry };
    window.__bench.step(600); // 20 s at 30 Hz: touch down (4-5 m/s tailwind here), accelerate on the step, lift off
    const mid = { ...g.aircraft.flight.telemetry };
    window.__bench.step(300); // 10 s more: climb out with the elevator held
    const after = { ...g.aircraft.flight.telemetry };
    return { before: { airspeed: before.airspeed, altitude: before.altitude }, mid: { airspeed: mid.airspeed, altitude: mid.altitude }, after: { airspeed: after.airspeed, altitude: after.altitude, heading: after.heading, stalled: after.stalled } };
  });
  report.checks.flight = tele;
  report.checks.climbed = tele.after.altitude > 25;
  report.checks.accelerated = Math.max(tele.mid.airspeed, tele.after.airspeed) > 30 && !tele.after.stalled; // flying above the 28.9 m/s stall speed with the elevator held
  await page.screenshot({ path: path.join(outDir, 'live_flight.png') });
  const m = await page.evaluate(() => window.__bench.metrics());
  report.checks.drawCalls = m.calls;
  report.checks.triangles = m.triangles;
  report.checks.consoleErrors = logs.filter((l) => l.startsWith('[error]') || l.startsWith('[pageerror]') || l.startsWith('[requestfailed]')).filter((l) => !l.includes('favicon'));
  report.ok = report.checks.buildMatches && report.checks.climbed && report.checks.accelerated && report.checks.consoleErrors.length === 0;
} catch (e) {
  report.error = String(e);
}
report.logs = logs.slice(0, 30);
fs.writeFileSync(path.join(outDir, 'live_report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ...report, logs: undefined }, null, 2));
await browser.close();
process.exit(report.ok ? 0 : 1);
