/**
 * Scratch inspection pass. Not part of the release matrix; used during development to eyeball
 * arbitrary viewpoints quickly. Owner: Opus 4.
 */
import { test } from '@playwright/test';
import { boot } from './helpers/game';

const VIEWS: [string, number][] = [
  ['spawn', 0],
  ['vestibule', 0],
  ['lobby', 0],
  ['lobby-desk', Math.PI],
  ['openplan', Math.PI],
  ['openplan-north', 0],
  ['service-corridor', Math.PI * 0.5],
  ['garage', 0],
  ['loading', Math.PI],
  ['server', Math.PI],
  ['conference', 0],
  ['exec-office', 0],
  ['mezzanine', Math.PI],
  ['breakroom', Math.PI],
  ['restroom-a', Math.PI * 0.5],
  ['stairwell', 0],
  ['archive', 0],
  ['it', 0],
];

test('scratch: capture a spread of viewpoints', async ({ page }, testInfo) => {
  test.setTimeout(900_000);
  const h = await boot(page, testInfo, { quality: 'high', res: 0.55 });
  await h.qa('setMode', 'playing');
  await h.advance(100);
  for (const [v, yaw] of VIEWS) {
    await h.qa('teleport', v);
    await h.qa('setYaw', yaw);
    await h.advance(200);
    await h.shot(`scratch-${v}`);
  }
  const errs = h.errors.slice(0, 10);
  if (errs.length) console.log('CONSOLE ERRORS:', errs);
  console.log('STATS', JSON.stringify(await h.qa('stats')));
});
