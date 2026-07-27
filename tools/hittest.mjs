// Why is a hidden screen winning the hit test?  (owner: opus4)
//
// `menuprobe.mjs` showed `document.elementFromPoint` at the centre of the menu's
// Deploy button returning a difficulty card that belongs to a screen without the
// `visible` class — which the stylesheet puts at `visibility: hidden`, and a
// hidden subtree is not supposed to be hit-testable at all.
//
// ANSWER: the DOM and the stylesheet are both right; the *compositor* is stale.
// `advanceTime` renders WebGL synchronously outside any animation frame, so with
// the game's rAF loop stopped headless Chromium never paints, and it keeps
// serving hit-test regions — and a frozen CSS opacity transition — from the last
// frame it did paint. Awaiting a real `requestAnimationFrame` fixes both.
//
// This tool proves it: it dumps the stack before and after a forced frame.
//
//   node tools/hittest.mjs [--url http://127.0.0.1:5173]

import { parseArgs, startServer, openGame, writeJson } from './lib/session.mjs';

const args = parseArgs();
const log = (...p) => process.stdout.write(`${p.join(' ')}\n`);

const dumpSource = () => {
  const target = document.querySelector('#ui-root [data-menu="deploy"]');
  const r = target.getBoundingClientRect();
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;
  const chain = (node) => {
    const parts = [];
    for (let n = node; n && n !== document.documentElement; n = n.parentElement) {
      parts.push(`${n.tagName.toLowerCase()}${n.className ? `.${String(n.className).trim().split(/\s+/).join('.')}` : ''}`);
    }
    return parts.join(' < ');
  };
  const top = document.elementFromPoint(cx, cy);
  return {
    state: window.__NORTHSTAR__?.state,
    point: [cx | 0, cy | 0],
    reachable: !!top && (top === target || target.contains(top)),
    stack: document.elementsFromPoint(cx, cy).slice(0, 4).map(chain),
    screens: Array.from(document.querySelectorAll('#ui-root .screen')).map((n) => {
      const cs = getComputedStyle(n);
      return { cls: n.className, visibility: cs.visibility, opacity: cs.opacity };
    }),
  };
};

const main = async () => {
  const server = args.url ? { url: args.url, stop: async () => {} } : await startServer({ port: 5176 });
  const session = await openGame({
    url: server.url, width: 1280, height: 720, quality: 'low', resolutionScale: 0.5,
  });
  const { page, advance, qa } = session;

  const paint = (n = 2) => page.evaluate((count) => new Promise((resolve) => {
    let left = count;
    const tick = () => { left -= 1; if (left <= 0) resolve(); else requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  }), n);

  const show = (label, d) => {
    log(`--- ${label}: state=${d.state} reachable=${d.reachable}`);
    for (const line of d.stack) log(`      ${line}`);
    const menu = d.screens.find((s) => s.cls.includes('screen-menu'));
    const diff = d.screens.find((s) => s.cls.includes('screen-difficulty'));
    log(`      menu: opacity=${menu.opacity} visibility=${menu.visibility}`);
    log(`      difficulty: opacity=${diff?.opacity} visibility=${diff?.visibility}`);
  };

  try {
    await qa('softReset', { state: 'title' });
    await advance(200);
    await page.keyboard.press('Enter');
    await advance(400);
    // Build the difficulty screen, then leave it: only a screen that has been
    // shown once has any DOM to get in the way.
    await page.locator('#ui-root [data-menu="deploy"]').first().click({ force: true });
    await advance(400);
    await page.keyboard.press('Escape');
    await advance(600);

    const before = await page.evaluate(dumpSource);
    show('no frame painted since Escape', before);

    await paint(2);
    const after = await page.evaluate(dumpSource);
    show('after two forced animation frames', after);

    // And the thing the spec actually needs: click Deploy, land on difficulty,
    // then reach a card. How many frames that takes is the number the harness'
    // retry loop has to be able to afford.
    await page.locator('#ui-root [data-menu="deploy"]').first().click({ force: true });
    await advance(400);
    const state = await page.evaluate(() => window.__NORTHSTAR__?.state);
    const probeCard = () => page.evaluate(() => {
      const n = document.querySelector('#ui-root [data-difficulty="recruit"]');
      if (!n) return { reachable: false, stack: ['no such element'] };
      const r = n.getBoundingClientRect();
      const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      const chain = (node) => {
        const parts = [];
        for (let x = node; x && x !== document.documentElement; x = x.parentElement) {
          parts.push(`${x.tagName.toLowerCase()}${x.className ? `.${String(x.className).trim().split(/\s+/).join('.')}` : ''}`);
        }
        return parts.join(' < ');
      };
      return {
        reachable: !!top && (top === n || n.contains(top)),
        rect: [r.left | 0, r.top | 0, r.width | 0, r.height | 0],
        stack: document.elementsFromPoint(r.left + r.width / 2, r.top + r.height / 2).slice(0, 4).map(chain),
      };
    });

    let card = await probeCard();
    let frames = 0;
    const t0 = Date.now();
    while (!card.reachable && frames < 40) {
      await paint(2);
      frames += 2;
      card = await probeCard();
    }
    log(`--- deploy click landed on "${state}"; recruit card reachable=${card.reachable}`
      + ` after ${frames} forced frames (${Date.now() - t0} ms), rect=${JSON.stringify(card.rect)}`);
    for (const line of card.stack) log(`      ${line}`);

    writeJson('hittest.json', { before, after, state, card, framesToReachCard: frames });
    if (!after.reachable || state !== 'difficulty' || !card.reachable) {
      log('*** still broken');
      process.exitCode = 1;
    } else {
      log('*** a forced animation frame is the fix');
    }
  } finally {
    await session.close();
    await server.stop();
  }
};

main().catch((err) => {
  process.stderr.write(`${err.stack || err}\n`);
  process.exit(1);
});
