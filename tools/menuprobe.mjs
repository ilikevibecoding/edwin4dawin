// Diagnose the menu back-stack.  (owner: opus4)
//
// `menu-flow.spec.js`'s Escape scenario fails intermittently at the *second*
// visit to the difficulty screen: sometimes the deploy button does not open it
// at all, sometimes it opens and the cards are unclickable. Both smell like a
// screen that has not finished transitioning, so this walks the exact chain and
// prints the UI's own view of the world at every step: which screens are built,
// which are `.visible`, what the manager thinks the state is, and whether the
// element the spec is about to click is hittable.
//
//   node tools/menuprobe.mjs [--url http://127.0.0.1:5173] [--rounds 3]

import { parseArgs, startServer, openGame, writeJson } from './lib/session.mjs';

const args = parseArgs();
const rounds = Number(args.rounds || 3);

const log = (...parts) => process.stdout.write(`${parts.join(' ')}\n`);

/** Everything the UI knows about itself, in one round trip. */
const probe = (page) => page.evaluate(() => {
  const g = window.__NORTHSTAR__;
  const ui = g?.ui;
  const screens = [];
  for (const node of document.querySelectorAll('#ui-root .screen')) {
    const style = getComputedStyle(node);
    screens.push({
      cls: node.className,
      visible: node.classList.contains('visible'),
      opacity: +style.opacity,
      display: style.display,
      pointerEvents: style.pointerEvents,
      rect: (() => { const r = node.getBoundingClientRect(); return [r.width | 0, r.height | 0]; })(),
    });
  }
  const hit = (sel) => {
    const node = document.querySelector(sel);
    if (!node) return { sel, found: false };
    const r = node.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const top = document.elementFromPoint(cx, cy);
    return {
      sel,
      found: true,
      rect: [r.left | 0, r.top | 0, r.width | 0, r.height | 0],
      inViewport: r.top >= 0 && r.left >= 0
        && r.bottom <= window.innerHeight && r.right <= window.innerWidth,
      opacity: +getComputedStyle(node).opacity,
      pointerEvents: getComputedStyle(node).pointerEvents,
      topElement: top ? `${top.tagName.toLowerCase()}.${top.className}`.slice(0, 60) : null,
      isSelf: top === node || node.contains(top),
    };
  };
  return {
    state: g?.state ?? null,
    uiState: ui?.state ?? null,
    active: ui?.active?.id ?? null,
    levelReady: ui?.levelReady ?? null,
    returnState: ui?._returnState ?? null,
    briefingMode: ui?._briefingMode ?? null,
    visibleScreens: screens.filter((s) => s.visible).map((s) => s.cls),
    screens,
    deploy: hit('#ui-root [data-menu="deploy"]'),
    recruit: hit('#ui-root [data-difficulty="recruit"]'),
    continueBtn: hit('#ui-root .screen-difficulty .btn.primary'),
  };
});

const main = async () => {
  const server = args.url ? { url: args.url, stop: async () => {} } : await startServer({ port: 5175 });
  const session = await openGame({
    url: server.url, width: 1280, height: 720, quality: 'low', resolutionScale: 0.5,
  });
  const { page, advance, qa } = session;
  const record = [];

  try {
    await qa('softReset', { state: 'title' });
    await advance(200);
    await page.keyboard.press('Enter');
    await advance(400);
    log(`[start] state=${(await probe(page)).state}`);

    // The spec's loop: open a screen, Escape back to the menu, repeat. The last
    // entry is deploy, which is the one that then has to be reopened.
    const chain = ['settings', 'controls', 'briefing', 'deploy'];
    for (let round = 0; round < rounds; round++) {
      for (const menu of chain) {
        await page.locator(`#ui-root [data-menu="${menu}"]`).first().click({ force: true });
        await advance(300);
        const opened = await probe(page);
        await page.keyboard.press('Escape');
        await advance(300);
        const back = await probe(page);
        log(`[r${round}] ${menu.padEnd(9)} opened=${String(opened.state).padEnd(10)}`
          + ` escapedTo=${String(back.state).padEnd(6)} visible=${back.visibleScreens.join(',')}`);
        record.push({ round, menu, opened: opened.state, back: back.state, visible: back.visibleScreens });
      }

      // Now the failing part: reopen deploy and try to pick a card.
      const beforeDeploy = await probe(page);
      log(`[r${round}] before reopen: state=${beforeDeploy.state} deploy=`
        + `${JSON.stringify(beforeDeploy.deploy)}`);
      await page.locator('#ui-root [data-menu="deploy"]').first().click({ force: true });
      await advance(300);
      const afterDeploy = await probe(page);
      log(`[r${round}] after reopen:  state=${afterDeploy.state} visible=${afterDeploy.visibleScreens.join(',')}`);
      log(`[r${round}]   recruit=${JSON.stringify(afterDeploy.recruit)}`);
      record.push({ round, step: 'reopen-deploy', beforeDeploy, afterDeploy });

      if (afterDeploy.state !== 'difficulty') {
        log(`[r${round}] *** deploy did not open the difficulty screen`);
        // Push it there so the round can finish and the next one still measures.
        await qa('softReset', { state: 'title' });
        await advance(200);
        await page.keyboard.press('Enter');
        await advance(400);
        continue;
      }

      await page.locator('#ui-root [data-difficulty="recruit"]').first().click({ force: true });
      await advance(250);
      const picked = await probe(page);
      log(`[r${round}]   after card click: state=${picked.state}`
        + ` selected=${await page.evaluate(() => document.querySelector('#ui-root .difficulty-card.selected')?.dataset?.difficulty ?? null)}`);
      record.push({ round, step: 'pick-card', state: picked.state });

      await page.keyboard.press('Escape');
      await advance(300);
      log(`[r${round}]   escaped to ${(await probe(page)).state}`);
    }
  } finally {
    writeJson('menuprobe.json', record);
    await session.close();
    await server.stop();
  }
};

main().catch((err) => {
  process.stderr.write(`${err.stack || err}\n`);
  process.exit(1);
});
