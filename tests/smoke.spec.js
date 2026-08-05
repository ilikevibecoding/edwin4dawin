import { test, expect } from '@playwright/test';
import { boot, advance, snapshot, perf, shot } from './helpers.js';

test('boots without console errors and renders the site', async ({ page }) => {
  const errors = await boot(page);
  const snap = await snapshot(page);
  expect(snap.ready).toBe(true);
  expect(snap.phase).toBe('standby');

  await advance(page, 1.5);
  await shot(page, 'smoke-standby');

  const p = await perf(page);
  console.log('perf', JSON.stringify(p));
  expect(p.calls).toBeGreaterThan(0);
  expect(errors, 'console errors: ' + errors.join(' | ')).toEqual([]);
});
