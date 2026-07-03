// Full-loop smoke test with real pointer interactions:
// HOME -> tap chest 3x -> rewards -> Okay -> HOME -> Battle -> deploy card ->
// force finish -> RESULT -> Continue -> HOME. Fails on any console error.
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 360, height: 640 } });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));

  await page.goto('http://localhost:8360', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);

  const st = () => page.evaluate(() => window.__game.state);
  const assert = async (cond, msg) => { if (!cond) { console.error('FAIL: ' + msg); await browser.close(); process.exit(1); } };

  await assert((await st()) === 'HOME', 'starts at HOME');

  // 1. open ready chest with taps
  await page.click('.chest-slot.ready');
  await page.waitForTimeout(500);
  await assert((await st()) === 'CHEST_OPENING', 'chest overlay opened');
  for (let i = 0; i < 3; i++) { await page.mouse.click(180, 330); await page.waitForTimeout(350); }
  await page.waitForTimeout(2600);
  const okVisible = await page.evaluate(() => document.getElementById('btn-chest-ok')?.classList.contains('show'));
  await assert(okVisible, 'Okay button appeared after rewards');
  await page.click('#btn-chest-ok');
  await page.waitForTimeout(500);
  await assert((await st()) === 'HOME', 'returned HOME after chest');
  const slot0Empty = await page.evaluate(() => document.querySelectorAll('.chest-slot.empty').length);
  await assert(slot0Empty === 3, 'opened chest slot became empty (3 empties now)');

  // 2. battle (force: the button has a CSS pulse animation)
  await page.click('#btn-battle', { force: true });
  await page.waitForTimeout(700);
  await assert((await st()) === 'BATTLE', 'battle started');

  // select a unit card (not the spell) and tap own half
  await page.evaluate(() => { window.__game.battle.sides.player.elixir = 10; });
  const cardBox = await page.evaluateHandle(() =>
    [...document.querySelectorAll('.card')].find((c) => c.dataset.card !== 'fireball'));
  await cardBox.asElement().dispatchEvent('pointerdown');
  await page.waitForTimeout(250);
  const sel = await page.evaluate(() => document.querySelectorAll('.card.selected').length);
  await assert(sel === 1, 'card selected');
  await page.mouse.click(180, 400); // deploy in own half (arena y within canvas)
  await page.waitForTimeout(400);
  const unitCount = await page.evaluate(() => window.__game.battle.units.filter(u => u.side === 'player').length);
  await assert(unitCount >= 1, `player unit deployed (got ${unitCount})`);

  // let the sim run a bit with AI
  await page.evaluate(() => window.__game.fastForward(30));
  await page.waitForTimeout(300);
  const enemyUnits = await page.evaluate(() => window.__game.battle.units.filter(u => u.side === 'enemy').length +
    window.__game.battle.units.filter(u => u.side === 'enemy' && u.dead).length);
  console.log('enemy units seen after 30s:', enemyUnits);

  // 3. force a king-tower win -> RESULT
  await page.evaluate(() => {
    const b = window.__game.battle;
    b.applyDamage(b.sides.enemy.towers.king, 99999, null);
  });
  await page.waitForTimeout(3600); // result appears at 1.4s, third crown pops at ~2.6s
  await assert((await st()) === 'RESULT', 'result screen shown after king down');
  const crowns = await page.evaluate(() => document.querySelectorAll('.crown-slot.earned').length);
  await assert(crowns === 3, `3 crowns for king kill (got ${crowns})`);

  // 4. chest earned into empty slot, continue -> HOME
  await page.click('#btn-continue');
  await page.waitForTimeout(600);
  await assert((await st()) === 'HOME', 'back HOME after continue');
  const readyCount = await page.evaluate(() => document.querySelectorAll('.chest-slot.ready').length);
  await assert(readyCount === 1, 'reward chest landed in a slot');

  await browser.close();
  if (errors.length) { console.error('CONSOLE ERRORS:\n' + errors.join('\n')); process.exit(1); }
  console.log('e2e ok — full loop, zero console errors');
})();
