// Shared harness for the Playwright matrix. Every spec boots a fresh page through `boot()` and
// then drives the game exclusively through the deterministic interface:
//   window.render_game_to_text()  – JSON snapshot of player-relevant state
//   window.advanceTime(ms)        – steps the fixed 120 Hz simulation
//   window.__qa.*                 – teleports, spawns, virtual input, freeze/god, diagnostics
import { expect } from '@playwright/test';

export const SETTINGS_KEY = 'northstar.settings.v1';
const SEED_KEY = 'northstar.qa.settings-seeded';

// Software WebGL (SwiftShader) is the bottleneck here, not the simulation. A stepped 1/120 s
// simulation tick costs well under a millisecond, while a single 1080p software-rasterised frame
// costs tens of milliseconds and the first frame of a fresh shader permutation costs seconds.
// Quality "low" (6 fill lights, 1024 shadow map) at half resolution keeps frames affordable.
// No gameplay logic reads these settings, so behavioural assertions are unaffected.
export const TEST_SETTINGS = {
  quality: 'low',
  resolutionScale: 0.5,
  sensitivity: 1,
  invertY: false,
  fov: 75,
  crosshair: true,
  reducedMotion: false,
  subtitles: true,
  volMaster: 0,
  volEffects: 0,
  volMusic: 0,
  volUI: 0,
};

// Vite's HMR client is stubbed out per page. Several agents edit src/** while this suite runs; a
// hot update to a module without an accept handler makes Vite reload the page, which destroys the
// execution context mid-test. The stub keeps module loading intact and only removes live reload.
const VITE_CLIENT_STUB = `
export const createHotContext = () => ({
  on() {}, off() {}, send() {}, accept() {}, acceptExports() {}, dispose() {}, prune() {},
  invalidate() {}, decline() {}, data: {},
});
export const updateStyle = (id, css) => {
  let el = document.querySelector('style[data-vite-dev-id="' + id + '"]');
  if (!el) { el = document.createElement('style'); el.setAttribute('data-vite-dev-id', id); document.head.appendChild(el); }
  el.textContent = css;
};
export const removeStyle = (id) => {
  const el = document.querySelector('style[data-vite-dev-id="' + id + '"]');
  if (el) el.remove();
};
export const injectQuery = (url) => url;
export class ErrorOverlay extends HTMLElement {}
export default {};
`;

/**
 * Boots the game on a fresh page and waits for the title screen.
 * @param page Playwright page
 * @param opts.settings   extra settings written to localStorage before boot
 * @param opts.query      extra query string (defaults to the QA + deterministic test hooks)
 * @param opts.raf        keep the requestAnimationFrame loop alive (default false, see below)
 * @param opts.render     'always' to let every advanceTime() render a frame (default 'onDemand')
 * @returns Game handle
 */
export async function boot(page, opts = {}) {
  const settings = { ...TEST_SETTINGS, ...(opts.settings || {}) };
  const query = opts.query ?? '?qa=1&test=1';

  await page.route('**/@vite/client', (route) => route.fulfill({
    contentType: 'application/javascript',
    body: VITE_CLIENT_STUB,
  }));
  // Seeded once per browser context, not once per navigation: an init script runs again on
  // page.reload(), and re-seeding there would wipe the settings the persistence test is checking.
  await page.addInitScript(([key, value, seeded]) => {
    if (localStorage.getItem(seeded)) return;
    localStorage.setItem(key, value);
    localStorage.setItem(seeded, '1');
  }, [SETTINGS_KEY, JSON.stringify(settings), SEED_KEY]);

  const pageErrors = [];
  page.on('pageerror', (err) => pageErrors.push(String(err.message || err)));

  const t0 = Date.now();
  await page.goto('/' + query, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__game && window.__game.state === 'title', null, { timeout: 90_000 });
  const bootMs = Date.now() - t0;

  // Two things happen here, both about determinism.
  //
  // advanceTime(1) flips Engine into manual mode. Until that happens the RAF loop is still
  // stepping the simulation from real elapsed time, so anything a test observes between entering
  // a mission and its first advanceTime() call depends on how busy the machine is. One manual
  // step early means every later step comes from the test, never from the wall clock.
  //
  // Stopping the loop then removes the idle renders. RAF only renders once manual mode is on, and
  // advanceTime() renders a frame itself, so the loop adds nothing but a continuous stream of
  // software-rasterised 1080p frames competing with the simulation for CPU. Specs that assert on
  // the render loop (PW-01) or measure frame rate pass `raf: true`.
  await page.evaluate(() => window.advanceTime(1));
  if (!opts.raf) await page.evaluate(() => { window.__game.engine.running = false; });

  // Rendering is put on demand for logic specs, and this is the single biggest thing keeping the
  // suite inside its runtime budget.
  //
  // Engine.advance() renders a frame at the end of every advanceTime() call. Under ANGLE/
  // SwiftShader a frame drawn as the only work in an event-loop task costs seconds — measured at
  // 5-15 s each on this box — while the same frames drawn back to back inside one task cost about
  // 30 ms each. A spec that steps the simulation forty times therefore spends minutes presenting
  // forty frames nobody looks at.
  //
  // So advanceTime() stops rendering and tests ask for frames explicitly. renderInfo() draws one
  // before reading renderer statistics, and expectNoErrors() draws one at the end of every test,
  // which keeps the render path exercised on every spec. Specs that are about rendering itself
  // (PW-01 frame loop, PW-20 resize, PW-25 budget) pass render: 'always'.
  if (opts.render !== 'always') {
    await page.evaluate(() => {
      const g = window.__game;
      g.__realRender = g.engine.renderFn;
      g.__framesSkipped = 0;
      g.engine.renderFn = () => { g.__framesSkipped++; };
    });
  }

  return new Game(page, { bootMs, pageErrors });
}

export class Game {
  constructor(page, meta) {
    this.page = page;
    this.bootMs = meta.bootMs;
    this.pageErrors = meta.pageErrors;
  }

  // ---- deterministic interface -------------------------------------------------
  /** Calls window.__qa[method](...args) in the page. */
  qa(method, ...args) {
    return this.page.evaluate(([m, a]) => window.__qa[m](...a), [method, args]);
  }

  /** Steps the fixed-timestep simulation by `ms` of simulated time. */
  adv(ms) {
    return this.page.evaluate((v) => window.advanceTime(v), ms);
  }

  /** Parsed window.render_game_to_text(). */
  async state() {
    return JSON.parse(await this.page.evaluate(() => window.render_game_to_text()));
  }

  /** window.__game.state ('title' | 'playing' | 'paused' | ...). */
  mode() {
    return this.page.evaluate(() => window.__game.state);
  }

  /** Reads derived values straight off the live object graph (never mutates game code). */
  probe(fn, arg) {
    return this.page.evaluate(fn, arg);
  }

  /** Draws one real frame. Needed before reading renderer statistics; see boot(). */
  renderFrame() {
    return this.page.evaluate(() => {
      const g = window.__game;
      (g.__realRender || ((a) => g.render(a)))(1);
      return g.__framesSkipped ?? 0;
    });
  }

  errors() {
    return this.page.evaluate(() => window.__consoleErrors.slice());
  }

  warnings() {
    return this.page.evaluate(() => window.__consoleWarnings.slice());
  }

  // ---- flow shortcuts ---------------------------------------------------------
  /** Jumps straight into a deterministic mission (seed 1337). */
  async quickStart({ difficulty = 'operator', primary = null, freezeAI = false, god = false } = {}) {
    await this.qa('quickStart', difficulty, primary, 1337);
    if (freezeAI) await this.qa('freezeAI', true);
    await this.qa('god', god);
    return this;
  }

  /** Deploys through the real menu flow (title -> difficulty -> briefing -> loadout -> playing). */
  async deployViaMenus({ difficulty = 'operator', primary = null } = {}) {
    await this.click('start');
    await this.click('difficulty-' + difficulty);
    await this.click('to-loadout');
    if (primary) await this.click('select-' + primary);
    await this.click('deploy');
    await this.page.waitForFunction(() => window.__game.state === 'playing', null, { timeout: 30_000 });
  }

  /**
   * Clicks a menu button by its data-action. Several actions (restart, settings, to-title) appear
   * on more than one screen, so the click is scoped to the screen currently on show.
   */
  click(action) {
    return this.page.locator(`[data-action="${action}"]:visible`).first().click();
  }

  /** True when the named screen is the visible one ('hud' is the in-mission screen). */
  screenVisible(name) {
    return this.page.evaluate((n) => {
      const el = document.querySelector('#screen-' + n) || document.querySelector('#' + n);
      return !!el && el.classList.contains('visible');
    }, name);
  }

  // ---- virtual input ---------------------------------------------------------
  /** Presses a key, holds it for `ms` of simulated time, then releases it. */
  async hold(code, ms) {
    await this.qa('press', code);
    await this.adv(ms);
    await this.qa('release', code);
  }

  /** Edge-triggered tap: the press must survive at least one sim step to be sampled. */
  async tap(code, ms = 40) {
    await this.hold(code, ms);
  }

  /** Holds fire for `ms` of simulated time. */
  async fire(ms = 120) {
    await this.qa('mouse', 0, true);
    await this.adv(ms);
    await this.qa('mouse', 0, false);
    await this.adv(30);
  }

  /** Single trigger pull (enough for one round of any weapon in the arsenal). */
  async fireOnce() {
    await this.fire(25);
  }

  async aimDownSights(on = true) {
    await this.qa('mouse', 2, on);
    await this.adv(250);
  }

  // ---- world queries ---------------------------------------------------------
  /** All enemies including corpses (render_game_to_text only lists live, nearby ones). */
  enemies() {
    return this.qa('listEnemies');
  }

  enemy(id) {
    return this.page.evaluate((eid) => {
      const e = window.__game.mission.enemies.find((x) => x.id === eid);
      if (!e) return null;
      return {
        id: e.id, state: e.flashT > 0 ? 'flashed' : e.state, alive: e.alive,
        hp: Math.max(0, Math.round(e.hp)), suspicion: +e.suspicion.toFixed(2),
        pos: [+e.pos.x.toFixed(2), +e.pos.y.toFixed(2), +e.pos.z.toFixed(2)],
      };
    }, id);
  }

  /** Points the player at a world position (yaw/pitch set exactly, no look smoothing). */
  aimAtPoint([x, y, z]) {
    return this.page.evaluate(([tx, ty, tz]) => {
      const p = window.__game.mission.player;
      const dx = tx - p.pos.x, dy = ty - p.eyeY, dz = tz - p.pos.z;
      const yawDeg = (Math.atan2(-dx, -dz) * 180) / Math.PI;
      const pitchDeg = (Math.atan2(dy, Math.hypot(dx, dz)) * 180) / Math.PI;
      window.__qa.setYawPitch(yawDeg, pitchDeg);
      return { yawDeg: +yawDeg.toFixed(2), pitchDeg: +pitchDeg.toFixed(2), dist: +Math.hypot(dx, dy, dz).toFixed(2) };
    }, [x, y, z]);
  }

  /** Aims at an enemy's chest. */
  async aimAtEnemy(id) {
    const e = await this.enemy(id);
    return this.aimAtPoint([e.pos[0], e.pos[1] + 1.25, e.pos[2]]);
  }

  weapon() {
    return this.page.evaluate(() => {
      const a = window.__game.mission.player.arsenal;
      return {
        id: a.current.def.id, slot: a.active, previous: a.previous, state: a.state,
        stateDur: +a.stateDur.toFixed(3),
        mag: a.current.mag === Infinity ? 'inf' : a.current.mag,
        reserve: a.current.reserve === Infinity ? 'inf' : a.current.reserve,
        aiming: a.isAiming,
      };
    });
  }

  stats() {
    return this.page.evaluate(() => ({ ...window.__game.mission.stats }));
  }

  door(id) {
    return this.page.evaluate((did) => {
      const d = window.__game.mission.map.doorById(did);
      return d ? { ...d.textState(), blocksPath: d.blocksPath, center: [d.center.x, d.center.y, d.center.z] } : null;
    }, id);
  }

  /** Nearest breakable pane to the player on the same floor. */
  nearestGlass() {
    return this.page.evaluate(() => {
      const m = window.__game.mission, p = m.player;
      let best = null;
      for (const g of m.map.glass) {
        if (Math.abs(g.center.y - p.pos.y) > 3) continue;
        const d = Math.hypot(g.center.x - p.pos.x, g.center.z - p.pos.z);
        if (!best || d < best.dist) best = { id: g.id, dist: +d.toFixed(2), state: g.state, center: [g.center.x, g.center.y, g.center.z] };
      }
      return best;
    });
  }

  glass(id) {
    return this.page.evaluate((gid) => {
      const g = window.__game.mission.map.glass.find((x) => x.id === gid);
      return g ? { id: g.id, state: g.state, hp: g.hp, blockShot: g.collider.blockShot } : null;
    }, id);
  }

  /** Renderer configuration and per-frame statistics, sampled from a freshly drawn frame. */
  async renderInfo() {
    await this.renderFrame();
    return this.page.evaluate(() => {
      const r = window.__game.renderer;
      const info = r.renderer.info;
      const canvas = r.renderer.domElement;
      return {
        pixelRatio: r.renderer.getPixelRatio(),
        canvas: [canvas.width, canvas.height],
        css: [canvas.clientWidth, canvas.clientHeight],
        aspect: +r.camera.aspect.toFixed(4),
        fov: +r.camera.fov.toFixed(2),
        shadowMap: window.__game.mission.map.lights.sun.shadow.mapSize.x,
        shadowsEnabled: r.renderer.shadowMap.enabled,
        drawCalls: info.render.calls,
        triangles: info.render.triangles,
        programs: info.programs.length,
      };
    });
  }
}

/**
 * Fails with the captured messages attached, so the report shows what actually happened.
 * `allow` takes regexes for known open bugs; each one must cite an entry in
 * docs/reports/wp-008.md so an allowance can never quietly become permanent.
 */
export async function expectNoErrors(game, label = 'console', { allow = [] } = {}) {
  // Draw one real frame first: specs run with rendering on demand (see boot()), and this is what
  // keeps a broken render path from passing unnoticed in every non-rendering spec.
  await game.renderFrame();
  const keep = (msg) => !allow.some((re) => re.test(msg));
  const errors = (await game.errors()).filter(keep);
  expect(errors, `${label}: window.__consoleErrors should be empty`).toEqual([]);
  expect(game.pageErrors.filter(keep), `${label}: uncaught page errors`).toEqual([]);
}

/** Drives a control on the settings screen the way a player would (real DOM events). */
export async function setSetting(page, key, value) {
  const locator = page.locator(`[data-setting="${key}"]`);
  const kind = await locator.evaluate((el) => (el.tagName === 'SELECT' ? 'select' : el.type));
  if (kind === 'select') {
    await locator.selectOption(String(value));
  } else if (kind === 'checkbox') {
    await locator.setChecked(!!value);
  } else {
    // Range inputs: mirror what a drag produces — set the value, then fire input + change.
    await locator.evaluate((el, v) => {
      el.value = String(v);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }, value);
  }
}

export function readSettings(page) {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key) || '{}'), SETTINGS_KEY);
}
