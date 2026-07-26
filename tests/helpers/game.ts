/**
 * Playwright helpers for driving Northstar Rescue. Owner: Opus 4.
 *
 * Every test uses these so scenarios stay consistent: boot with console capture, drive the
 * flow to gameplay, issue short input bursts with deliberate pauses, and read the deterministic
 * text state after each burst.
 */
import { expect, type ConsoleMessage, type Page, type TestInfo } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

export const SHOT_DIR = path.resolve('artifacts/screenshots');

export interface TextState {
  schema: string;
  coordinateSystem: string;
  mode: string;
  time: { elapsed: number; missionRemaining: number; tick: number };
  player: {
    position: { x: number; y: number; z: number };
    orientation: { yaw: number; pitch: number; yawDeg: number; pitchDeg: number };
    velocity: { x: number; y: number; z: number; speed: number };
    health: number;
    armor: number;
    alive: boolean;
    movementState: string;
    crouching: boolean;
    grounded: boolean;
    room: string;
    level: number;
  };
  weapon: {
    active: string;
    name: string;
    family: string;
    state: string;
    magazine: number;
    reserve: number;
    aiming: boolean;
    spreadDeg: number;
    inventory: { id: string; magazine: number; reserve: number }[];
  };
  objectives: { id: string; label: string; status: string }[];
  hostages: {
    id: string; name: string; behaviour: string; room: string;
    position: { x: number; y: number; z: number }; health: number; secured: boolean; extracted: boolean;
  }[];
  enemies: {
    id: string; state: string; alive: boolean; health: number; room: string;
    position: { x: number; y: number; z: number }; distance: number; visibleToPlayer: boolean; canSeePlayer: boolean;
  }[];
  enemySummary: { total: number; alive: number; alerted: number; inCombat: number };
  doors: { id: string; label: string; open: boolean; locked: boolean; motion: string; amount: number }[];
  interactables: { id: string; kind: string; label: string; verb: string; distance: number; enabled: boolean; locked?: boolean }[];
  extraction: { ready: boolean; playerInside: boolean; hostagesInside: number; required: number };
  result: { outcome: string; reason: string };
  performance: { fps: number; drawCalls: number; triangles: number; quality: string; resolutionScale: number };
}

export interface Harness {
  page: Page;
  errors: string[];
  warnings: string[];
  state: () => Promise<TextState>;
  advance: (ms: number) => Promise<void>;
  shot: (name: string) => Promise<string>;
  key: (code: string, downMs?: number) => Promise<void>;
  hold: (code: string, ms: number) => Promise<void>;
  look: (dx: number, dy: number) => Promise<void>;
  mouse: (button: 'fire' | 'aim', ms: number) => Promise<void>;
  qa: (fn: string, ...args: unknown[]) => Promise<unknown>;
  expectNoErrors: () => void;
}

/** Boot the game with console monitoring and wait until it is interactive. */
export async function boot(
  page: Page,
  testInfo: TestInfo,
  opts: { quality?: string; seed?: number; qa?: boolean; res?: number } = {},
): Promise<Harness> {
  const errors: string[] = [];
  const warnings: string[] = [];

  page.on('console', (msg: ConsoleMessage) => {
    const t = msg.type();
    const text = msg.text();
    if (t === 'error') errors.push(text);
    else if (t === 'warning') warnings.push(text);
  });
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  page.on('requestfailed', (req) => {
    const f = req.failure();
    // Favicon-style optional requests still count: nothing should 404 in this build.
    errors.push(`requestfailed: ${req.url()} ${f?.errorText ?? ''}`);
  });

  const params = new URLSearchParams();
  params.set('quality', opts.quality ?? 'low');
  params.set('test', '1');
  if (opts.res !== undefined) params.set('res', String(opts.res));
  if (opts.seed !== undefined) params.set('seed', String(opts.seed));
  if (opts.qa) params.set('qa', '1');

  await page.goto(`/?${params.toString()}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => (window as never as { __northstarReady?: boolean }).__northstarReady === true, {
    timeout: 120_000,
  });

  const h: Harness = {
    page,
    errors,
    warnings,
    state: async () => page.evaluate(() => (window as never as { render_game_to_text: () => string }).render_game_to_text())
      .then((s) => JSON.parse(s as unknown as string) as TextState),
    advance: async (ms: number) => {
      await page.evaluate((m) => (window as never as { advanceTime: (n: number) => void }).advanceTime(m), ms);
    },
    shot: async (name: string) => {
      fs.mkdirSync(SHOT_DIR, { recursive: true });
      const file = path.join(SHOT_DIR, `${name}.png`);
      // Force a fresh frame so the capture can never race the compositor.
      await page.evaluate(() => (window as never as { __ns: { render: () => void } }).__ns.render());
      await page.screenshot({ path: file });
      await testInfo.attach(name, { path: file, contentType: 'image/png' });
      return file;
    },
    key: async (code: string, downMs = 60) => {
      await page.evaluate((c) => (window as never as { __ns: { key: (a: string, b: boolean) => void } }).__ns.key(c, true), code);
      await h.advance(downMs);
      await page.evaluate((c) => (window as never as { __ns: { key: (a: string, b: boolean) => void } }).__ns.key(c, false), code);
      await h.advance(40);
    },
    hold: async (code: string, ms: number) => {
      await page.evaluate((c) => (window as never as { __ns: { key: (a: string, b: boolean) => void } }).__ns.key(c, true), code);
      await h.advance(ms);
      await page.evaluate((c) => (window as never as { __ns: { key: (a: string, b: boolean) => void } }).__ns.key(c, false), code);
    },
    look: async (dx: number, dy: number) => {
      await page.evaluate(([x, y]) =>
        (window as never as { __ns: { look: (a: number, b: number) => void } }).__ns.look(x, y), [dx, dy]);
    },
    mouse: async (button, ms) => {
      await page.evaluate((b) => (window as never as { __ns: { mouse: (a: string, d: boolean) => void } }).__ns.mouse(b, true), button);
      await h.advance(ms);
      await page.evaluate((b) => (window as never as { __ns: { mouse: (a: string, d: boolean) => void } }).__ns.mouse(b, false), button);
      await h.advance(60);
    },
    qa: async (fn: string, ...args: unknown[]) =>
      page.evaluate(([f, a]) => {
        const q = (window as never as { __ns: Record<string, (...x: unknown[]) => unknown> }).__ns;
        return q[f as string](...(a as unknown[]));
      }, [fn, args] as [string, unknown[]]),
    expectNoErrors: () => {
      const filtered = errors.filter((e) => !isIgnorableConsoleError(e));
      expect(filtered, `console errors:\n${filtered.join('\n')}`).toEqual([]);
    },
  };
  return h;
}

/** Nothing should be ignorable in this build; the list exists to document that. */
function isIgnorableConsoleError(_e: string): boolean {
  return false;
}

/** Drive the flow from the title screen into gameplay. */
export async function enterGameplay(
  h: Harness,
  opts: { difficulty?: string; primary?: string; utility?: string } = {},
): Promise<void> {
  await h.page.click('#screen-title [data-action="begin-mission"]');
  await h.page.waitForSelector('#screen-difficulty.active');
  if (opts.difficulty) await h.page.click(`[data-difficulty="${opts.difficulty}"]`);
  await h.page.click('#screen-difficulty [data-action="continue"]');
  await h.page.waitForSelector('#screen-briefing.active');
  await h.page.click('#screen-briefing [data-action="continue"]');
  await h.page.waitForSelector('#screen-loadout.active');
  if (opts.primary) await h.page.click(`[data-group="primary"] [data-weapon="${opts.primary}"]`);
  if (opts.utility) await h.page.click(`[data-group="utility"] [data-weapon="${opts.utility}"]`);
  await h.page.click('#screen-loadout [data-action="deploy"]');
  await h.page.waitForSelector('#hud.active', { timeout: 60_000 });
  await h.advance(200);
}

export function fmt(n: number, digits = 2): string {
  return n.toFixed(digits);
}
