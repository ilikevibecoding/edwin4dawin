import { test } from '@playwright/test';
import { boot } from './helpers/game';

test('perf probe', async ({ page }, testInfo) => {
  test.setTimeout(600_000);
  const h = await boot(page, testInfo, { quality: 'high', res: 0.3 });
  await h.qa('setMode', 'playing');
  await h.qa('teleport', 'lobby');
  await h.advance(200);
  for (const q of ['high', 'medium'] as const) {
    await h.qa('setQuality', q);
    await h.advance(60);
    let line = '';
    for (const deg of [88, 89, 89.5, 89.9, 90, 90.1, 90.5, 91, 92, 180, 270]) {
      await h.qa('setYaw', (deg * Math.PI) / 180);
      await h.advance(20);
      const lum = (await h.qa('luminance')) as { mean: number };
      line += `${deg}:${lum.mean.toFixed(0)} `;
    }
    console.log(`FINE-${q}`, line);
  }
});
