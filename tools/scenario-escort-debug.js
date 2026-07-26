export async function run(page) {
  await page.evaluate(() => {
    window.__qa.quickStart('operator');
    window.__qa.freezeAI(true);
    window.__qa.god(true);
    window.__qa.teleport([45.0, 3.6, 21.0], 0);
  });
  await page.evaluate(() => window.advanceTime(600));
  await page.evaluate(() => { window.__qa.press('KeyE'); window.advanceTime(120); window.__qa.release('KeyE'); });
  await page.evaluate(() => { window.__qa.teleport('stair-a1'); window.advanceTime(8000); });
  await page.evaluate(() => { window.__qa.teleport('lobby'); });
  for (let i = 0; i < 12; i++) {
    await page.evaluate(() => window.advanceTime(1000));
    const info = await page.evaluate(() => {
      const m = window.__game.mission;
      const h = m.hostages[1];
      return {
        hostage: [+h.pos.x.toFixed(2), +h.pos.y.toFixed(2), +h.pos.z.toFixed(2)],
        state: h.state,
        pathLen: h.path ? h.path.length : null,
        pathIdx: h.pathIdx,
        path: h.path ? h.path.slice(Math.max(0, h.pathIdx - 1), h.pathIdx + 3).map((p) => [+p.x.toFixed(1), +p.y.toFixed(1), +p.z.toFixed(1)]) : null,
        repath: h._dbgRepath,
        stuck: +h.stuckT.toFixed(2),
      };
    });
    console.log('  t+' + (i + 1) + 's:', JSON.stringify(info));
  }
  await page.evaluate(() => { window.__hdbg = 8; window.advanceTime(200); });
  const frames = await page.evaluate(() => window.__consoleWarnings.filter((w) => w.includes('hframe')).slice(0, 8));
  for (const f of frames) console.log(' ', f.slice(0, 320));
}
