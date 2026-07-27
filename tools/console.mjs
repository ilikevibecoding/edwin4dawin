// Every console message the game produces, grouped and attributed.  (owner: opus4)
//
// The test suite asserts *zero* console errors per scenario, which is the right
// bar but tells you nothing about warnings — and warnings are where this project
// keeps its open defects. This boots once, walks the whole mission (menus, every
// room, a firefight, both hostages, victory and defeat), and writes every
// message it saw to artifacts/console.json with a count, the emitting source file
// and a guess at the owning module.
//
//   node tools/console.mjs [--url http://127.0.0.1:5173]

import { parseArgs, startServer, openGame, writeJson } from './lib/session.mjs';

const args = parseArgs();
const log = (...p) => process.stdout.write(`${p.join(' ')}\n`);

/** Which module a message came from, for the "owner" column of the report. */
const OWNERS = [
  [/\/src\/mission\//, 'mission'],
  [/\/src\/ai\//, 'ai'],
  [/\/src\/map\//, 'map'],
  [/\/src\/weapons\//, 'weapons'],
  [/\/src\/ui\//, 'ui'],
  [/\/src\/core\//, 'core'],
  [/\/src\/physics\//, 'physics'],
  [/\/src\/props\//, 'props'],
  [/\/src\/fx\//, 'fx'],
  [/\/src\/audio\//, 'audio'],
  [/\/src\/qa\//, 'qa'],
  [/\/src\/player\//, 'player'],
];

const ownerFor = (url = '') => (OWNERS.find(([re]) => re.test(url)) || [null, 'unknown'])[1];

const main = async () => {
  const server = args.url
    ? { url: String(args.url), stop: async () => {}, reused: true }
    : await startServer({ port: Number(args.port ?? 5178) });

  // Collect *everything*, including info and debug, from before navigation.
  const seen = new Map();
  const attach = (page) => {
    page.on('console', (msg) => {
      const loc = msg.location?.() || {};
      const key = `${msg.type()}::${msg.text()}`;
      const entry = seen.get(key) || {
        type: msg.type(),
        text: msg.text(),
        source: loc.url ? loc.url.replace(/\?.*$/, '').replace(/^https?:\/\/[^/]+/, '') : null,
        line: loc.lineNumber ?? null,
        count: 0,
      };
      entry.count++;
      entry.owner = ownerFor(loc.url || '');
      seen.set(key, entry);
    });
    page.on('pageerror', (err) => {
      const key = `pageerror::${err.message}`;
      const entry = seen.get(key)
        || { type: 'pageerror', text: `${err.name}: ${err.message}`, source: null, line: null, count: 0, owner: 'unknown' };
      entry.count++;
      seen.set(key, entry);
    });
  };

  const g = await openGame({
    url: server.url, width: 1280, height: 720, quality: 'medium', resolutionScale: 0.75,
    attach,
  });
  const { qa, advance, page, state } = g;

  try {
    // Front end.
    await page.keyboard.press('Enter');
    await advance(400);
    for (const menu of ['settings', 'controls', 'briefing', 'deploy']) {
      await g.click(`#ui-root [data-menu="${menu}"]`);
      await advance(300);
      await page.keyboard.press('Escape');
      await advance(300);
    }

    // A full mission, the short way round.
    await qa('forcePlay', { difficulty: 'operator', loadout: { primary: 'carbine', secondary: 'pistol', gadget: 'flash' } });
    await page.waitForFunction(() => window.__NORTHSTAR__.state === 'playing', null, { timeout: 60_000 });
    await advance(800);
    await qa('godMode', true);

    for (const cp of await qa('listCheckpoints')) {
      await qa('teleport', cp.name);
      await advance(250, { render: false });
    }

    // A firefight, so the weapon, damage, decal and audio paths all run.
    await qa('teleport', 'openoffice');
    await qa('giveWeapon', 'carbine');
    await advance(400);
    for (let i = 0; i < 12; i++) {
      await page.evaluate(() => window.__NORTHSTAR__.input.tapAction('attack'));
      await advance(180, { render: false });
    }
    await page.evaluate(() => window.__NORTHSTAR__.input.tapAction('reload'));
    await advance(3200, { render: false });
    await qa('spawnEnemy', 'breacher', [-2, 0, 2]);
    await advance(4000, { render: false });

    // Objectives, then both endings.
    for (const obj of ['secure-hostage-a', 'secure-hostage-b', 'open-garage', 'escort-hostages']) {
      await qa('jumpToObjective', obj);
      await advance(600, { render: false });
    }
    await qa('extractHostages');
    for (let i = 0; i < 120 && (await state()).outcome !== 'victory'; i++) {
      await advance(250, { render: false });
    }
    await advance(800);

    await qa('forcePlay', { difficulty: 'blackout' });
    await advance(700);
    await qa('godMode', false);
    for (let i = 0; i < 10 && (await state()).player.alive; i++) {
      await qa('damagePlayer', 40);
      await advance(250, { render: false });
    }
    await advance(4000, { render: false });
    await qa('resetMission');
    await advance(600);
  } finally {
    const rows = Array.from(seen.values()).sort((a, b) => {
      const rank = { pageerror: 0, error: 1, warning: 2, info: 3, log: 4, debug: 5 };
      return (rank[a.type] ?? 9) - (rank[b.type] ?? 9) || b.count - a.count;
    });
    const counts = {};
    for (const r of rows) counts[r.type] = (counts[r.type] || 0) + r.count;
    writeJson('console.json', {
      generatedAt: new Date().toISOString(),
      totalsByType: counts,
      distinctMessages: rows.length,
      messages: rows,
    });

    log(`[console] ${rows.length} distinct message(s): `
      + Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(', '));
    for (const r of rows) {
      if (r.type === 'log' || r.type === 'debug') continue;
      log(`[console] ${r.type.padEnd(9)} ${String(r.owner).padEnd(8)} x${String(r.count).padEnd(3)}`
        + ` ${r.source ?? '?'}:${r.line ?? '?'}`);
      log(`[console]   ${r.text.replace(/\s+/g, ' ').slice(0, 240)}`);
    }
    await g.close();
    await server.stop();
  }
};

main().catch((err) => {
  process.stderr.write(`${err.stack || err}\n`);
  process.exit(1);
});
