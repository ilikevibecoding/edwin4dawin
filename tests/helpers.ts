import { expect, type Page } from '@playwright/test';

export interface GameState {
  coords: string;
  mode: string;
  tick: number;
  time: number;
  player: {
    pos: [number, number, number];
    yaw: number;
    pitch: number;
    vel: [number, number, number];
    health: number;
    armor: number;
    alive: boolean;
    moveState: string;
    crouched: boolean;
    onGround: boolean;
    room: string | null;
  } | null;
  weapon: { id: string; name: string; mag: number; reserve: number; phase: string; aim: number } | null;
  mission: {
    phase: string;
    timeLeft: number;
    extractCountdown: number | null;
    objectives: Record<string, string>;
    enemiesAlive: number;
    kills: number;
    loseReason: string | null;
  } | null;
  hostages: { id: string; name: string; pos: [number, number, number]; state: string }[];
  enemies: { id: string; pos: [number, number, number]; state: string; health: number; suspicion: number }[];
  visibleEnemies: string[];
  nearbyDoors: { id: string; state: string; open: number }[];
  nearestInteractable: { id: string; prompt: string } | null;
  outcome: string | null;
  perf: { fps: number; calls: number; triangles: number };
  assets: number;
}

export function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(String(err)));
  return errors;
}

export async function launchGame(page: Page, params = '?test=1&mode=playing&quality=low&seed=1337'): Promise<void> {
  await page.goto(`/${params}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof (window as never as Record<string, unknown>).render_game_to_text === 'function', null, { timeout: 45_000 });
  await page.waitForFunction(() => !document.getElementById('boot-overlay'), null, { timeout: 45_000 });
}

export async function state(page: Page): Promise<GameState> {
  const raw = await page.evaluate(() => (window as never as { render_game_to_text(): string }).render_game_to_text());
  return JSON.parse(raw) as GameState;
}

/** advance simulation deterministically (chunked to keep evaluate calls snappy) */
export async function adv(page: Page, ms: number): Promise<void> {
  let remaining = ms;
  while (remaining > 0) {
    const chunk = Math.min(4000, remaining);
    await page.evaluate((c) => (window as never as { advanceTime(ms: number): void }).advanceTime(c), chunk);
    remaining -= chunk;
  }
}

export async function qa<T = unknown>(page: Page, script: string): Promise<T> {
  return page.evaluate((s) => {
    const q = (window as never as Record<string, unknown>).__qa as Record<string, unknown>;
    // eslint-disable-next-line no-new-func
    return new Function('__qa', `return (${s});`)(q) as unknown;
  }, script) as Promise<T>;
}

export async function hold(page: Page, action: string, ms: number): Promise<void> {
  await qa(page, `__qa.input.down('${action}')`);
  await adv(page, ms);
  await qa(page, `__qa.input.up('${action}')`);
  await adv(page, 20);
}

export async function tap(page: Page, action: string): Promise<void> {
  await qa(page, `__qa.input.down('${action}')`);
  await adv(page, 30);
  await qa(page, `__qa.input.up('${action}')`);
  await adv(page, 20);
}

export async function teleport(page: Page, checkpoint: string): Promise<void> {
  const ok = await qa<boolean>(page, `__qa.teleport('${checkpoint}')`);
  expect(ok).toBe(true);
  await adv(page, 60);
}

export function expectNoErrors(errors: string[]): void {
  const filtered = errors.filter((e) => !e.includes('GPU stall') && !e.includes('Automatic fallback to software WebGL'));
  expect(filtered, `console errors:\n${filtered.join('\n')}`).toHaveLength(0);
}
