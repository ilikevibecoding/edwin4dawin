// Screenshot harness: drives the game into 5 canonical states and saves PNGs.
// Usage: node tools/capture.js <iterDir> [--url http://localhost:8360]
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const outDir = process.argv[2] || 'artifacts/scratch';
const urlArg = process.argv.indexOf('--url');
const BASE = urlArg > -1 ? process.argv[urlArg + 1] : 'http://localhost:8360';

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 360, height: 640 },
    deviceScaleFactor: 2,
  });

  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));

  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900); // font + first paint

  const shot = (name) => page.screenshot({ path: path.join(outDir, name) });

  /* ---------- 1. HOME ---------- */
  await page.evaluate(() => window.__game.goto('HOME'));
  await page.waitForTimeout(700);
  await shot('1-home.png');

  /* ---------- 2. CHEST mid-burst ---------- */
  await page.evaluate(() => window.__game.goto('CHEST'));
  await page.waitForTimeout(420); // mid-burst: rays + particles, rewards flying in
  await shot('2-chest-burst.png');
  // let rewards finish then close via the Okay button
  await page.waitForTimeout(1900);
  await shot('2b-chest-rewards.png');
  await page.evaluate(() => document.getElementById('btn-chest-ok')?.click());
  await page.waitForTimeout(400);

  /* ---------- 3. BATTLE ~10s in with units on both sides ---------- */
  await page.evaluate(() => {
    window.__game.goto('BATTLE');
    const b = window.__game.battle;
    // wave 1: enemy ogre push down the right lane; player archers set up defense
    b.sides.player.elixir = 10; b.sides.enemy.elixir = 10;
    b.playCard('player', 'archer', 268, 344);
    b.playCard('enemy', 'ogre', 256, 190);
    b.sides.enemy.elixir = 10;
    b.playCard('enemy', 'archer', 256, 150);
    window.__game.fastForward(4.8);
    // wave 2: player counterpush — knight up the left bridge, imps mob the ogre
    b.sides.player.elixir = 10; b.sides.enemy.elixir = 10;
    b.playCard('player', 'knight', 104, 330);
    b.playCard('player', 'imp', 232, 330);
    window.__game.fastForward(3.9);
    b.sides.player.elixir = 6.4;
  });
  await page.waitForTimeout(650);
  await shot('3-battle-mid.png');

  /* ---------- 4. BATTLE tower destruction (via real fireball) ---------- */
  await page.evaluate(() => {
    const b = window.__game.battle;
    const tw = b.sides.enemy.towers.left;
    tw.hp = 100; // one fireball tick will finish it
    b.sides.player.elixir = 10;
    b.playCard('player', 'fireball', tw.x, tw.y - 10);
    window.__game.fastForward(0.78); // most of the flight; explosion lands live
  });
  await page.waitForTimeout(170); // catch flash + debris + fresh rubble
  await shot('4-battle-towerdown.png');

  /* ---------- 5. RESULT ---------- */
  await page.evaluate(() => window.__game.goto('RESULT', { result: 'win', crowns: [2, 1] }));
  await page.waitForTimeout(2300); // banner + crowns + chest drop all landed
  await shot('5-result.png');

  await browser.close();

  if (errors.length) {
    console.error('CONSOLE ERRORS:\n' + errors.join('\n'));
    process.exit(1);
  }
  console.log(`ok -> ${outDir}`);
})();
