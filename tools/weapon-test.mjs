#!/usr/bin/env node
/**
 * Headless numeric tests for the weapon system.
 *
 * Boots the weapon showcase in the same headless Chrome the screenshot harness
 * uses and drives the system frame by frame through `window.__WEAPONS__`.
 *
 * Nothing here hard-codes a tuning number. Every expectation is derived from
 * the `WeaponStats` block the game is actually running on, so a stat change
 * moves the expectation with it and a *behaviour* change is what fails. Where
 * a behaviour follows from a model rather than a constant — the penetration
 * ledger, the falloff curve, the spread bloom — the model is exercised through
 * the very object the game uses, not through a copy of it.
 *
 * Usage:
 *   node tools/weapon-test.mjs
 *   node tools/weapon-test.mjs --url http://127.0.0.1:5173/ --verbose
 *   node tools/weapon-test.mjs --align 1920x1080   # extra ADS alignment size
 */
import puppeteer from 'puppeteer-core';
import { existsSync } from 'node:fs';

const argv = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const v = argv[i + 1];
  return v && !v.startsWith('--') ? v : true;
};

const OPTS = {
  url: String(arg('url', 'http://127.0.0.1:5173/')),
  timeout: Number(arg('timeout', 600000)),
  bootTimeout: Number(arg('boot-timeout', 180000)),
  verbose: !!arg('verbose', false),
  align: String(arg('align', '')),
};

const CHROME = ['/usr/local/bin/google-chrome', '/usr/bin/google-chrome'].find((p) =>
  existsSync(p),
);
if (!CHROME) {
  console.error('No Chrome binary found.');
  process.exit(1);
}

const LAUNCH_ARGS = [
  '--headless=new',
  '--no-sandbox',
  '--disable-gpu-sandbox',
  '--use-gl=angle',
  '--use-angle=swiftshader',
  '--enable-unsafe-swiftshader',
  '--disable-dev-shm-usage',
  '--disable-software-rasterizer-fallback-warning',
  '--force-color-profile=srgb',
  '--hide-scrollbars',
  '--mute-audio',
  '--disable-background-timer-throttling',
  '--disable-renderer-backgrounding',
  '--disable-backgrounding-occluded-windows',
  '--window-size=1280,720',
  '--renderer-process-limit=1',
];

/* ------------------------------ assertions ------------------------------ */

let passed = 0;
const failures = [];
let group = '';

function section(name) {
  group = name;
  console.log(`\n${name}`);
}

function record(pass, label, detail) {
  if (pass) {
    passed++;
    console.log(`  PASS  ${label}${detail ? `  (${detail})` : ''}`);
  } else {
    failures.push(`${group} / ${label}${detail ? `  (${detail})` : ''}`);
    console.log(`  FAIL  ${label}${detail ? `  (${detail})` : ''}`);
  }
}

const f = (v, digits = 4) => (typeof v === 'number' ? v.toFixed(digits) : String(v));
const note = (text) => console.log(`  NOTE  ${text}`);

const ok = (label, condition, detail) => record(!!condition, label, detail);

function eq(label, actual, expected, unit = '') {
  record(actual === expected, label, `got ${actual}${unit}, want ${expected}${unit}`);
}

function near(label, actual, expected, tolerance, unit = '') {
  if (typeof actual !== 'number' || !Number.isFinite(actual)) {
    record(false, label, `got ${String(actual)}, want ${f(expected)}${unit}`);
    return;
  }
  record(
    Math.abs(actual - expected) <= tolerance,
    label,
    `got ${f(actual)}${unit}, want ${f(expected)}${unit} +/- ${f(tolerance)}`,
  );
}

function below(label, actual, limit, unit = '') {
  record(actual < limit, label, `got ${f(actual)}${unit}, limit < ${f(limit)}${unit}`);
}

function above(label, actual, limit, unit = '') {
  record(actual > limit, label, `got ${f(actual)}${unit}, limit > ${f(limit)}${unit}`);
}

/* --------------------------------- main --------------------------------- */

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    args: LAUNCH_ARGS,
    protocolTimeout: OPTS.timeout,
    defaultViewport: { width: 1280, height: 720, deviceScaleFactor: 1 },
  });
  const page = await browser.newPage();
  page.setDefaultTimeout(OPTS.timeout);

  const logs = [];
  page.on('console', (msg) => {
    const text = `[${msg.type()}] ${msg.text()}`;
    logs.push(text);
    if (OPTS.verbose || msg.type() === 'error') console.log('  page', text);
  });
  page.on('pageerror', (err) => {
    logs.push(`[pageerror] ${err.message}`);
    console.log('  page [pageerror]', err.message);
  });

  const url = new URL(OPTS.url);
  url.searchParams.set('showcase', 'weapons');
  // Capture mode parks the engine so nothing steps behind the test's back.
  url.searchParams.set('capture', '1');

  console.log(`Loading ${url.href} ...`);
  await page.goto(url.href, { waitUntil: 'domcontentloaded', timeout: OPTS.timeout });

  const overlay = await page
    .evaluate(() => {
      const el = document.querySelector('vite-error-overlay');
      return el ? (el.shadowRoot?.querySelector('.message')?.textContent ?? 'vite error') : null;
    })
    .catch(() => null);
  if (overlay) {
    console.error('Build error:\n', overlay);
    await browser.close();
    process.exit(1);
  }

  try {
    await page.waitForFunction(() => window.__GAME__?.ready === true && !!window.__WEAPONS__, {
      timeout: OPTS.bootTimeout,
      polling: 200,
    });
  } catch {
    console.error('Weapon system never came up. Recent console output:');
    for (const l of logs.slice(-40)) console.error('   ', l);
    await browser.close();
    process.exit(1);
  }

  const call = (fn, ...args) => page.evaluate(fn, ...args);
  const ids = await call(() => window.__WEAPONS__.list());
  const STATS = {};
  for (const id of ids) STATS[id] = await call((i) => window.__WEAPONS__.stats(i), id);
  const TRIS = await call(() => window.__WEAPONS__.triangles());

  /**
   * Selects a weapon and puts it in a known state: full magazine, full reserve,
   * every procedural layer parked, trigger up, recoil dice rewound. Every case
   * below starts here so no test can inherit another's leftovers.
   */
  const select = (id, opts = {}) =>
    call(
      ([i, o, s]) => {
        const W = window.__WEAPONS__;
        W.lineup(false);
        W.select(i);
        W.setStill(true);
        W.setAds(o.ads ?? 0);
        W.release();
        W.reseed();
        if (o.mode) W.setFireMode(o.mode);
        W.setAmmo(o.mag ?? s.magSize, o.reserve ?? s.reserveAmmo);
        W.spreadReset();
        return W.info();
      },
      [id, opts, STATS[id]],
    );

  /** Holds the trigger for `seconds` and reports how many rounds left. */
  const holdFire = (seconds, dt = 1 / 240) =>
    call(
      ([s, h]) => {
        const W = window.__WEAPONS__;
        const before = W.info().shotsFired;
        W.hold(true);
        W.step(s, h);
        W.hold(false);
        W.step(1 / 240, 1 / 240);
        const info = W.info();
        return { fired: info.shotsFired - before, info };
      },
      [seconds, dt],
    );

  /* ============================= inventory ============================== */

  section('Loadout');
  eq('five weapons are built', ids.length, 5);
  for (const id of ids) {
    const t = TRIS[id];
    below(`${id} is inside the 60k triangle budget`, t, 60000, ' tris');
  }
  note(
    `triangles: ${ids.map((i) => `${i} ${TRIS[i].toLocaleString()}`).join(', ')}` +
      ` (total ${Object.values(TRIS).reduce((a, b) => a + b, 0).toLocaleString()})`,
  );

  /* ============================== fire rate ============================= */

  section('Cyclic rate matches rpm');

  for (const id of ['rifle', 'smg', 'pistol']) {
    const s = STATS[id];
    const mode = s.fireModes?.includes('auto') ? 'auto' : 'semi';
    // Semi-automatics need a fresh pull per round, so only the automatics can
    // be measured by holding; the pistol is measured by rate-limited pulls.
    if (mode === 'auto') {
      const seconds = 3;
      // The magazine must not be what stops the burst, so top it up as it runs.
      await select(id, { mode: 'auto' });
      const res = await call(
        ([sec, h]) => {
          const W = window.__WEAPONS__;
          const before = W.info().shotsFired;
          W.hold(true);
          const steps = Math.round(sec / h);
          for (let i = 0; i < steps; i++) {
            W.step(h, h);
            if (W.info().mag < 4) W.setAmmo(999, 999);
          }
          W.hold(false);
          return { fired: W.info().shotsFired - before, times: W.shotTimes(64) };
        },
        [seconds, 1 / 240],
      );
      const expected = Math.floor((seconds * s.rpm) / 60) + 1;
      near(`${id} fires ${expected} rounds in ${seconds}s at ${s.rpm} rpm`, res.fired, expected, 1, '');
      // Measure the rate from the shot timestamps rather than by counting in a
      // window: a window quantises the answer to one round, which at three
      // seconds is 20 rpm of error the weapon is not responsible for.
      const t = res.times;
      const measured = ((t.length - 1) * 60) / (t[t.length - 1] - t[0]);
      near(`${id} mean cyclic rate over ${t.length} rounds`, measured, s.rpm, s.rpm * 0.01, ' rpm');
      let jitter = 0;
      for (let i = 1; i < t.length; i++) {
        jitter = Math.max(jitter, Math.abs(t[i] - t[i - 1] - 60 / s.rpm));
      }
      below(`  and no interval is off by more than a frame`, jitter, 1 / 240 + 1e-6, ' s');
    } else {
      const period = 60 / s.rpm;
      const pullTrain = (gap, shots) =>
        call(
          ([g, n, h]) => {
            const W = window.__WEAPONS__;
            const before = W.info().shotsFired;
            for (let i = 0; i < n; i++) {
              W.pull();
              W.step(h, h);
              W.release();
              W.step(Math.max(h, g - h), h);
              if (W.info().mag < 2) W.setAmmo(999, 999);
            }
            return W.info().shotsFired - before;
          },
          [gap, shots, 1 / 480],
        );
      await select(id, { mode: 'semi' });
      eq(`${id} semi at its cyclic period fires every pull`, await pullTrain(period * 1.05, 12), 12);
      await select(id, { mode: 'semi' });
      const tooFast = await pullTrain(period * 0.4, 12);
      below(`${id} pulls faster than the cyclic rate are rate limited`, tooFast, 12);
      above(`  and are limited to the cyclic rate, not blocked`, tooFast, 4);
    }
  }

  /* ============================= fire modes ============================= */

  section('Fire modes');

  {
    const s = STATS.rifle;
    await select('rifle', { mode: 'semi' });
    const held = await holdFire(1.0);
    eq('semi fires exactly one round for a held trigger', held.fired, 1);

    await select('rifle', { mode: 'semi' });
    const pulls = await call(() => {
      const W = window.__WEAPONS__;
      const before = W.info().shotsFired;
      for (let i = 0; i < 5; i++) {
        W.pull();
        W.step(1 / 120, 1 / 240);
        W.release();
        W.step(0.2, 1 / 240);
      }
      return W.info().shotsFired - before;
    });
    eq('semi fires once per fresh trigger pull', pulls, 5);

    await select('rifle', { mode: 'burst' });
    const burst = await holdFire(1.0);
    eq(`burst fires exactly burstCount (${s.burstCount})`, burst.fired, s.burstCount);

    await select('rifle', { mode: 'burst' });
    const twoBursts = await call(() => {
      const W = window.__WEAPONS__;
      const before = W.info().shotsFired;
      W.pull();
      W.step(0.6, 1 / 240);
      W.release();
      W.step(0.3, 1 / 240);
      W.pull();
      W.step(0.6, 1 / 240);
      W.release();
      W.step(0.1, 1 / 240);
      return W.info().shotsFired - before;
    });
    eq('two pulls fire two bursts', twoBursts, s.burstCount * 2);

    await select('rifle', { mode: 'burst', mag: 2, reserve: 0 });
    const shortBurst = await holdFire(1.0);
    eq('a burst cannot fire more rounds than the magazine holds', shortBurst.fired, 2);
  }

  {
    // The bolt gun and the pump gun must work their action between rounds, and
    // must not fire again on a trigger the shooter never let go of.
    for (const id of ['sniper', 'shotgun']) {
      const s = STATS[id];
      await select(id);
      const held = await holdFire(2.5);
      eq(`${id} (${s.fireMode}) fires once for a trigger held through the cycle`, held.fired, 1);

      await select(id);
      const pumped = await call(
        ([gap, n]) => {
          const W = window.__WEAPONS__;
          const before = W.info().shotsFired;
          for (let i = 0; i < n; i++) {
            W.pull();
            W.step(1 / 240, 1 / 240);
            W.release();
            W.step(gap, 1 / 240);
          }
          return W.info().shotsFired - before;
        },
        [(60 / s.rpm) * 1.3, 4],
      );
      eq(`${id} fires once per pull once the action is worked`, pumped, 4);

      await select(id);
      const rushed = await call(
        ([gap, n]) => {
          const W = window.__WEAPONS__;
          const before = W.info().shotsFired;
          for (let i = 0; i < n; i++) {
            W.pull();
            W.step(1 / 240, 1 / 240);
            W.release();
            W.step(gap, 1 / 240);
          }
          return W.info().shotsFired - before;
        },
        [(60 / s.rpm) * 0.25, 4],
      );
      below(`${id} cannot be fired faster than the action can be worked`, rushed, 4);
    }
  }

  /* ========================= ammunition accounting ====================== */

  section('Magazine and reserve accounting');

  for (const id of ids) {
    const s = STATS[id];
    const shellByShell = id === 'shotgun';
    // Empty the magazine, reload, and account for every round.
    const spent = Math.max(1, Math.min(7, s.magSize - 1));
    await select(id, { mag: s.magSize - spent, reserve: s.reserveAmmo });
    const res = await call(() => {
      const W = window.__WEAPONS__;
      const before = W.info();
      W.reload();
      W.step(12, 1 / 120);
      return { before, after: W.info() };
    });
    eq(`${id} reload tops the magazine back up`, res.after.mag, s.magSize);
    eq(
      `${id} reload takes exactly the rounds it loaded from reserve`,
      res.before.reserve - res.after.reserve,
      spent,
    );
    ok(
      `${id} total rounds are conserved across a reload`,
      res.before.mag + res.before.reserve === res.after.mag + res.after.reserve,
      `${res.before.mag}+${res.before.reserve} -> ${res.after.mag}+${res.after.reserve}`,
    );
    if (shellByShell) {
      // A partial reserve must stop the shell loop rather than invent shells.
      await select(id, { mag: 0, reserve: 3 });
      const partial = await call(() => {
        const W = window.__WEAPONS__;
        W.reload();
        W.step(12, 1 / 120);
        return W.info();
      });
      eq('shotgun stops loading when the reserve runs out (mag)', partial.mag, 3);
      eq('shotgun stops loading when the reserve runs out (reserve)', partial.reserve, 0);
    }
  }

  {
    // Firing dry then reloading must not conjure or lose a round.
    const s = STATS.rifle;
    await select('rifle', { mode: 'auto', reserve: 0 });
    const empty = await call(() => {
      const W = window.__WEAPONS__;
      W.hold(true);
      W.step(4, 1 / 240);
      W.hold(false);
      W.step(0.5, 1 / 120);
      return W.info();
    });
    eq('firing to empty leaves the magazine at zero', empty.mag, 0);
    above('the bolt is held back on an empty magazine', empty.boltHold, 0, ' m');

    await select('rifle', { mode: 'auto' });
    const res = await call(() => {
      const W = window.__WEAPONS__;
      const start = W.info();
      W.hold(true);
      W.step(2.9, 1 / 240);
      W.hold(false);
      const dry = W.info();
      W.step(8, 1 / 120);
      return { start, dry, after: W.info() };
    });
    eq('the magazine empties before the auto-reload kicks in', res.dry.mag, 0);
    eq('reserve is untouched by firing', res.dry.reserve, s.reserveAmmo);
    eq('an empty weapon reloads itself', res.after.mag, s.magSize);
    eq('the auto reload draws a full magazine from reserve', res.after.reserve, s.reserveAmmo - s.magSize);
    eq('the bolt releases on reload', res.after.boltHold, 0);
  }

  {
    await select('rifle', { mag: STATS.rifle.magSize, reserve: 0 });
    const res = await call(() => {
      const W = window.__WEAPONS__;
      W.reload();
      W.step(4, 1 / 120);
      return W.info();
    });
    eq('a full magazine with no reserve does not reload', res.mag, STATS.rifle.magSize);
    eq('  and the action stays idle', res.action, 'none');

    await select('rifle', { mag: 3, reserve: 0 });
    const dry = await call(() => {
      const W = window.__WEAPONS__;
      W.reload();
      W.step(4, 1 / 120);
      return W.info();
    });
    eq('an empty reserve cannot refill the magazine', dry.mag, 3);
  }

  /* ============================== falloff =============================== */

  section('Damage falloff');

  for (const id of ['rifle', 'sniper', 'shotgun']) {
    const s = STATS[id];
    const mid = (s.falloffStart + s.falloffEnd) / 2;
    const probe = await call(
      ([i, ranges]) => ranges.map((r) => window.__WEAPONS__.damageAt(r, i)),
      [id, [0, s.falloffStart, mid, s.falloffEnd, s.falloffEnd * 2]],
    );
    near(`${id} full damage inside falloffStart`, probe[1], s.damage, 1e-6);
    near(`${id} half way is the midpoint of the ramp`, probe[2], s.damage * (1 + s.falloffMin) / 2, 1e-6);
    near(`${id} floors at falloffMin past falloffEnd`, probe[3], s.damage * s.falloffMin, 1e-6);
    eq(`${id} stays at the floor beyond falloffEnd`, probe[4], probe[3]);
    ok(`${id} the curve is monotonically decreasing`, probe.every((v, i) => i === 0 || v <= probe[i - 1] + 1e-9));
  }

  /* ============================ penetration ============================= */

  section('Wall penetration');

  {
    // Cost per metre, relative to concrete, straight from the table the trace
    // uses; the expectation is derived, not written down twice.
    const concrete = await call(() => window.__WEAPONS__.cost('concrete', 1));
    const wood = await call(() => window.__WEAPONS__.cost('wood', 1));
    const metal = await call(() => window.__WEAPONS__.cost('metal', 1));
    near('concrete is the unit of the penetration budget', concrete, 1, 1e-9);
    below('wood costs less than concrete', wood, concrete);
    above('metal costs more than concrete', metal, concrete);
    near('cost is linear in thickness', await call(() => window.__WEAPONS__.cost('concrete', 0.35)), 0.35, 1e-9);
  }

  for (const id of ['rifle', 'sniper', 'pistol']) {
    const s = STATS[id];
    const plyThickness = 0.02;
    const sheets = 16;
    const woodCost = await call(([t]) => window.__WEAPONS__.cost('wood', t), [plyThickness]);
    const layers = Array.from({ length: sheets }, () => ({
      surface: 'wood',
      thickness: plyThickness,
      distance: 0,
    }));
    const res = await call(([i, l]) => window.__WEAPONS__.penetrate(l, i), [id, layers]);
    // A round carries on while it has budget left: k sheets are pierced while
    // penetration - k * cost is still positive.
    const expectedPierced = Math.min(sheets, Math.max(0, Math.ceil(s.penetration / woodCost) - 1));
    eq(
      `${id} pierces ${expectedPierced} of ${sheets} ${plyThickness * 1000} mm ply sheets`,
      res.pierced,
      expectedPierced,
    );
    eq(
      `  ${id} stops after the sheet that used up its budget`,
      res.damage.length,
      Math.min(sheets, expectedPierced + 1),
    );
    near(`${id} first sheet takes full damage`, res.damage[0], s.damage, 1e-6);
    for (let i = 1; i < res.damage.length; i++) {
      const want = s.damage * Math.max(0, (s.penetration - i * woodCost) / s.penetration);
      near(`  ${id} sheet ${i + 1} damage falls with the remaining budget`, res.damage[i], want, 1e-6);
    }
  }

  {
    // A 200 mm concrete wall is the reference stop: only the .338 goes through.
    const wall = [{ surface: 'concrete', thickness: 0.2, distance: 0 }];
    for (const id of ids) {
      const s = STATS[id];
      const res = await call(([i, l]) => window.__WEAPONS__.penetrate(l, i), [id, wall]);
      const shouldPass = s.penetration > 0.2;
      eq(
        `${id} ${shouldPass ? 'punches' : 'does not punch'} 200 mm of concrete`,
        res.pierced,
        shouldPass ? 1 : 0,
      );
    }
    const rifleGlass = await call(() =>
      window.__WEAPONS__.penetrate([{ surface: 'glass', thickness: 0.006, distance: 0 }], 'rifle'),
    );
    eq('glass barely slows a rifle round', rifleGlass.pierced, 1);
    above(
      'and leaves it more than 99% of its budget',
      rifleGlass.energy / STATS.rifle.penetration,
      0.99,
    );
  }

  {
    // Falloff and penetration compose: damage is the product of both terms.
    const s = STATS.rifle;
    const distance = (s.falloffStart + s.falloffEnd) / 2;
    const cost = await call(() => window.__WEAPONS__.cost('wood', 0.04));
    const [res, falloff] = await call(
      ([d]) => [
        window.__WEAPONS__.penetrate(
          [
            { surface: 'wood', thickness: 0.04, distance: d },
            { surface: 'wood', thickness: 0.04, distance: d },
          ],
          'rifle',
        ),
        window.__WEAPONS__.damageAt(d, 'rifle'),
      ],
      [distance],
    );
    near('entry damage is the falloff curve alone', res.damage[0], falloff, 1e-6);
    near(
      'exit damage is falloff times the remaining energy',
      res.damage[1],
      falloff * ((s.penetration - cost) / s.penetration),
      1e-6,
    );
  }

  /* =============================== spread =============================== */

  section('Spread');

  {
    await select('rifle', { ads: 1 });
    const still = await call(() =>
      window.__WEAPONS__.spreadStep(1.5, { ads: 1, speed: 0, crouch: 0, grounded: true }),
    );
    const s = STATS.rifle;
    near('a stationary ADS cone settles on adsSpread exactly', still, s.adsSpread, 1e-6, ' rad');

    const afterShots = await call(() => {
      const W = window.__WEAPONS__;
      for (let i = 0; i < 8; i++) W.spreadShot(1);
      return W.spreadStep(1 / 120, { ads: 1, speed: 0, crouch: 0, grounded: true }, 1 / 120);
    });
    above('sustained fire blooms the cone', afterShots, still * 1.5, ' rad');

    const recovered = await call(() =>
      window.__WEAPONS__.spreadStep(2.5, { ads: 1, speed: 0, crouch: 0, grounded: true }),
    );
    near('and it recovers to the base when the trigger is released', recovered, still, still * 0.05, ' rad');

    const hip = await call(() =>
      window.__WEAPONS__.spreadStep(1.5, { ads: 0, speed: 0, crouch: 0, grounded: true }),
    );
    near('a stationary hip cone settles on hipSpread', hip, s.hipSpread, 1e-6, ' rad');
    above('the hip cone is far wider than the ADS cone', hip / still, 10);

    const moving = await call(() =>
      window.__WEAPONS__.spreadStep(1.5, { ads: 0, speed: 1, crouch: 0, grounded: true }),
    );
    above('moving widens the cone', moving, hip * 1.5, ' rad');

    const crouched = await call(() =>
      window.__WEAPONS__.spreadStep(1.5, { ads: 0, speed: 0, crouch: 1, grounded: true }),
    );
    below('crouching tightens it', crouched, hip, ' rad');

    const airborne = await call(() =>
      window.__WEAPONS__.spreadStep(1.5, { ads: 0, speed: 0, crouch: 0, grounded: false }),
    );
    above('jumping wrecks it', airborne, hip * 2, ' rad');

    const settled = await call(() => {
      const W = window.__WEAPONS__;
      W.spreadReset();
      return W.spreadStep(1.5, { ads: 1, speed: 0, crouch: 1, grounded: true });
    });
    below('a still crouched ADS is tighter than adsSpread', settled, s.adsSpread, ' rad');
    below('  and inside two milliradians', settled, 0.002, ' rad');

    // The pin-accurate first shot is the point of the whole model: the sniper
    // aimed and still must be under a tenth of a milliradian.
    await select('sniper', { ads: 1 });
    const sniper = await call(() =>
      window.__WEAPONS__.spreadStep(2, { ads: 1, speed: 0, crouch: 0, grounded: true }),
    );
    near('the sniper aimed and still is exactly adsSpread', sniper, STATS.sniper.adsSpread, 1e-9, ' rad');
    below('  which is under a fifth of a milliradian', sniper, 0.0002, ' rad');
    await select('rifle');
  }

  /* =========================== ADS alignment ============================ */

  section('ADS sight alignment');

  const sizes = [[1280, 720], [960, 540], [800, 450]];
  if (OPTS.align) {
    const [w, h] = OPTS.align.split('x').map(Number);
    if (w && h) sizes.push([w, h]);
  }

  const alignment = {};
  for (const id of ids) {
    await call((i) => {
      const W = window.__WEAPONS__;
      W.lineup(false);
      W.select(i);
      W.setStill(true);
      W.setAds(1);
      W.step(1.5, 1 / 120);
      return null;
    }, id);
    let worst = 0;
    for (const [w, h] of sizes) {
      const p = await call(([ww, hh]) => window.__WEAPONS__.sightPixel(ww, hh), [w, h]);
      // Both ends of the sight line, so this measures the sight picture rather
      // than the pose: the rear notch and the front post have to project onto
      // the same pixel, and that pixel has to be the centre of the frame.
      worst = Math.max(worst, p.rearErr, p.frontErr);
      if (OPTS.verbose) {
        note(
          `${id} @ ${w}x${h}: rear (${f(p.x, 2)}, ${f(p.y, 2)}) ${f(p.rearErr, 3)} px, ` +
            `front (${f(p.frontX, 2)}, ${f(p.frontY, 2)}) ${f(p.frontErr, 3)} px`,
        );
      }
    }
    alignment[id] = worst;
    below(`${id} sights land on screen centre at full ADS`, worst, 0.5, ' px');
  }
  note(
    `worst alignment error: ${Math.max(...Object.values(alignment)).toFixed(4)} px ` +
      `across ${sizes.length} resolutions`,
  );

  {
    // The sight must be centred *through* the transition too, not just at the end.
    await call(() => {
      const W = window.__WEAPONS__;
      W.select('rifle');
      W.setStill(true);
      W.setAds(1);
      W.step(1.5, 1 / 120);
      return null;
    });
    const drift = await call(() => {
      const W = window.__WEAPONS__;
      let worst = 0;
      for (let i = 0; i <= 20; i++) {
        W.setAds(1);
        W.step(1 / 120, 1 / 120);
        const p = W.sightPixel(1280, 720);
        worst = Math.max(worst, p.rearErr, p.frontErr);
      }
      return worst;
    });
    below('alignment holds while the rig keeps updating', drift, 0.5, ' px');
  }

  /* ============================ sprint block ============================ */

  section('Fire gating');

  {
    await select('rifle', { mode: 'auto' });
    const res = await call(() => {
      const W = window.__WEAPONS__;
      const before = W.info().shotsFired;
      W.system.setVisible(false);
      W.hold(true);
      W.step(0.5, 1 / 240);
      W.hold(false);
      const hidden = W.info().shotsFired - before;
      W.system.setVisible(true);
      W.step(0.4, 1 / 240);
      const mid = W.info().shotsFired;
      W.hold(true);
      W.step(0.5, 1 / 240);
      W.hold(false);
      return { hidden, shown: W.info().shotsFired - mid };
    });
    eq('a holstered weapon cannot fire', res.hidden, 0);
    above('and fires again once it is back up', res.shown, 1);
  }

  {
    await select('rifle', { mode: 'auto', mag: 10 });
    const res = await call(() => {
      const W = window.__WEAPONS__;
      const before = W.info().shotsFired;
      W.reload();
      W.step(0.4, 1 / 240);
      const mid = W.info();
      W.hold(true);
      W.step(0.6, 1 / 240);
      W.hold(false);
      const during = W.info().shotsFired - before;
      W.step(6, 1 / 120);
      return { during, mid, after: W.info() };
    });
    eq('the reload is running', res.mid.action, 'reload');
    above('  and reports its progress', res.mid.reloadProgress, 0);
    eq('the trigger is dead during a reload', res.during, 0);
    eq('and the reload still completes', res.after.mag, STATS.rifle.magSize);
  }

  /* ============================ fire mode cycle ========================= */

  section('Fire mode selector');

  {
    const s = STATS.rifle;
    const seen = await call(([n]) => {
      const W = window.__WEAPONS__;
      W.select('rifle');
      const out = [W.info().fireMode];
      for (let i = 0; i < n; i++) out.push(W.cycleFireMode());
      return out;
    }, [s.fireModes.length]);
    eq('the selector returns to where it started', seen[0], seen[seen.length - 1]);
    ok(
      'the selector visits every listed mode',
      s.fireModes.every((m) => seen.includes(m)),
      `saw ${seen.join(' -> ')}`,
    );
    const single = await call(() => {
      const W = window.__WEAPONS__;
      W.select('sniper');
      return { before: W.info().fireMode, after: W.cycleFireMode() };
    });
    eq('a bolt gun has nothing to select', single.after, single.before);
  }

  /* ============================== recoil ================================ */

  section('Recoil pattern');

  {
    const s = STATS.rifle;
    const pattern = await call(() => window.__WEAPONS__.pattern('rifle'));
    const spray = async (rounds) => {
      await select('rifle', { mode: 'auto' });
      return call(
        ([n]) => {
          const W = window.__WEAPONS__;
          W.hold(true);
          // Stop on the round count rather than on a duration, so the sample is
          // exactly n and not n plus whatever the last frame managed to squeeze.
          for (let i = 0; i < 4000 && W.patternIndex() < n; i++) W.step(1 / 480, 1 / 480);
          W.hold(false);
          return { kicks: W.kicks(n), index: W.patternIndex() };
        },
        [rounds],
      );
    };
    const rounds = 12;
    const a = await spray(rounds);
    const b = await spray(rounds);
    eq('a spray walks one pattern entry per round', a.index, rounds);
    eq('  and logs one kick per round', a.kicks.length, rounds);
    ok(
      'the same spray from the same seed is identical',
      JSON.stringify(a.kicks) === JSON.stringify(b.kicks),
    );
    // The vertical kick is the pattern times recoilVertical, jittered +/-10%.
    let worst = 0;
    for (let i = 0; i < rounds; i++) {
      const want = s.recoilVertical * pattern[Math.min(i, pattern.length - 1)][0];
      worst = Math.max(worst, Math.abs(a.kicks[i][0] - want) / want);
    }
    below('every kick sits inside the pattern +/-10% jitter band', worst, 0.1 + 1e-9);
    ok(
      'the pattern climbs before it drifts, as authored',
      a.kicks[3][0] > a.kicks[0][0] * 1.3,
      `shot 1 ${f(a.kicks[0][0], 5)} rad, shot 4 ${f(a.kicks[3][0], 5)} rad`,
    );

    // Coming off the trigger long enough must rewind the pattern.
    await select('rifle', { mode: 'auto' });
    const rewound = await call(() => {
      const W = window.__WEAPONS__;
      W.hold(true);
      W.step(0.5, 1 / 240);
      W.hold(false);
      const after = W.patternIndex();
      W.step(1.0, 1 / 240);
      return { after, rested: W.patternIndex() };
    });
    above('firing advances the pattern', rewound.after, 3);
    eq('and it rewinds once the shooter comes off the trigger', rewound.rested, 0);
  }

  /* ------------------------------- report ------------------------------- */

  const errors = logs.filter((l) => l.startsWith('[error]') || l.startsWith('[pageerror]'));
  if (errors.length) {
    console.log(`\n${errors.length} console error(s):`);
    for (const e of errors.slice(0, 20)) console.log('   ', e);
  }

  console.log(`\n${passed} passed, ${failures.length} failed`);
  if (failures.length) {
    console.log('\nFailures:');
    for (const fail of failures) console.log('  -', fail);
  }

  await browser.close();
  process.exit(failures.length ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
