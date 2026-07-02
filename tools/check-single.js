// Smoke-tests the single-file build over file:// (the double-click scenario).
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const file = 'file://' + path.join(__dirname, '..', 'dist', 'arena-rumble.html');
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 360, height: 640 } });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));

  await page.goto(file);
  await page.waitForTimeout(900);

  const ok = async (cond, name) => {
    if (!cond) { console.error('FAIL:', name); process.exit(1); }
    console.log('ok:', name);
  };

  await ok(await page.isVisible('#btn-battle'), 'home renders (battle button visible)');
  await ok(await page.evaluate(() => document.fonts.check('16px "Lilita One"')), 'embedded font loaded');

  // chest overlay opens and closes
  await page.evaluate(() => window.__game.goto('CHEST'));
  await page.waitForTimeout(2600);
  await ok(await page.isVisible('#btn-chest-ok'), 'chest rewards shown');
  await page.evaluate(() => document.getElementById('btn-chest-ok').click());
  await page.waitForTimeout(400);

  // battle simulates and reaches a result
  await page.evaluate(() => {
    window.__game.goto('BATTLE');
    const b = window.__game.battle;
    b.sides.player.elixir = 10;
    b.playCard('player', 'knight', 104, 330);
    window.__game.fastForward(3);
  });
  await page.waitForTimeout(300);
  await ok(await page.evaluate(() => window.__game.battle.units.length > 0), 'unit deployed in battle');
  await page.evaluate(() => { window.__game.battle.sides.enemy.towers.king.hp = 1; window.__game.battle.applyDamage(window.__game.battle.sides.enemy.towers.king, 10); });
  await page.waitForTimeout(2600);
  await ok(await page.isVisible('#btn-continue'), 'result screen reached');

  await browser.close();
  if (errors.length) {
    console.error('CONSOLE ERRORS:\n' + errors.join('\n'));
    process.exit(1);
  }
  console.log('single-file ok — runs from file:// with zero console errors');
})();
