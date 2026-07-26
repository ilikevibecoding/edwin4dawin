// Nav connectivity diagnostic
export async function run(page) {
  await page.evaluate(() => window.__qa.quickStart('operator'));
  const tests = [
    ['exec', 'exec-corr'],
    ['exec-corr', 'stair-a1'],
    ['stair-a1', 'stair-a'],
    ['stair-a', 'lobby'],
    ['exec', 'garage'],
    ['server', 'garage'],
    ['cubes', 'garage'],
    ['plaza', 'exec'],
  ];
  for (const [a, b] of tests) {
    const r = await page.evaluate(([x, y]) => {
      const t0 = performance.now();
      const p = window.__qa.navPath(x, y);
      return { ok: !!p, wp: p ? p.waypoints : 0, ms: +(performance.now() - t0).toFixed(1) };
    }, [a, b]);
    console.log(`  nav ${a} -> ${b}:`, JSON.stringify(r));
  }
  const stats = await page.evaluate(() => window.__qa.navStats());
  console.log('  nav stats:', JSON.stringify(stats));
  for (const spot of [['garage', 7, 0, 6], ['stair-a-mid', 30.5, 1.8, 16], ['stair-a-flight1', 29, 0.9, 19], ['stair-a-f0', 32.5, 0, 22], ['lobby', 17, 0, 28]]) {
    const nodes = await page.evaluate(([x, y, z]) => window.__qa.navNodesNear(x, y, z, 1.2), spot.slice(1));
    console.log(`  nodes near ${spot[0]}:`, JSON.stringify(nodes.slice(0, 5)));
  }
}
