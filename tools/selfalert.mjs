// Does a hostile react to its own gunfire?  (owner: opus4)
//
// `EnemyManager._hear` filters friendly gunshots with
//
//     if (n.source === 'enemy' && n.kind === 'gunshot' && !this.facilityLoud)
//
// which has two holes. The `world:noise` payload emitted from `_fire` carries no
// shooter id at all — only `EVT.ENEMY_FIRE` does — so a hostile cannot tell its
// own shot from a comrade's even in the branch that is meant to handle friendly
// fire. And once `facilityLoud` is true the branch is skipped entirely, so a
// hostile's own muzzle report is processed as a generic loud event: awareness up
// to the heard ceiling, `lastKnownPos` overwritten with its own position, and one
// `raiseAlert` per shot.
//
// This isolates a single hostile with nobody else alive to hear anything, makes it
// fire, and reports what its own shot did to it. Run it before and after any fix.
//
//   node tools/selfalert.mjs

import { parseArgs, startServer, openGame, writeJson } from './lib/session.mjs';

const args = parseArgs();
const log = (...p) => process.stdout.write(`${p.join(' ')}\n`);

const main = async () => {
  const server = args.url
    ? { url: String(args.url), stop: async () => {}, reused: true }
    : await startServer({ port: Number(args.port ?? 5179) });
  const g = await openGame({
    url: server.url, width: 640, height: 360, quality: 'low', resolutionScale: 0.5,
  });
  const { qa, advance, page } = g;

  try {
    await qa('forcePlay', { difficulty: 'operator', loadout: { primary: 'carbine' } });
    await page.waitForFunction(() => window.__NORTHSTAR__.state === 'playing', null, { timeout: 60_000 });
    await advance(700);
    await qa('godMode', true);
    await qa('teleport', 'openoffice');
    await advance(300, { render: false });

    const result = await page.evaluate(() => {
      const game = window.__NORTHSTAR__;
      const mgr = game.enemies;

      // One hostile, nobody else alive, radio net clear. Anything that happens to
      // it after this point can only have come from itself.
      const keep = mgr.list.find((e) => e.alive);
      for (const e of mgr.list) {
        if (e === keep) continue;
        e.alive = false;
        e.health = 0;
        e.state = 'dead';
      }
      mgr.facilityLoud = false;
      mgr.alertCount = 0;
      keep.awareness = 0;
      keep.lastKnownPos = null;

      // Snapshot, fire one round from its own weapon, snapshot again. `_fire` is
      // the same call the combat state uses; the shot is aimed at nothing.
      const snapshot = () => ({
        awareness: +keep.awareness.toFixed(3),
        state: keep.state,
        alertCount: mgr.alertCount,
        facilityLoud: mgr.facilityLoud,
        lastKnownPos: keep.lastKnownPos
          ? [+keep.lastKnownPos.x.toFixed(2), +keep.lastKnownPos.y.toFixed(2), +keep.lastKnownPos.z.toFixed(2)]
          : null,
        noiseSeq: mgr.perception._seq,
      });

        const shoot = () => {
          const dir = new keep.position.constructor(-Math.sin(keep.yaw), 0, -Math.cos(keep.yaw));
          const aim = keep.position.clone().add(dir.multiplyScalar(8));
          aim.y = keep.position.y + 1.4;
          // Zero spread: this is about the noise event, not where the round lands.
          mgr._shoot(keep, aim, 0);
        // One fixed step is all `_hear` needs to poll the noise queue.
        window.advanceTime(120, { render: false });
      };

      const out = { enemyId: keep.id, position: keep.position.toArray().map((n) => +n.toFixed(2)) };

      // Case A: quiet facility. The friendly-fire branch should run.
      out.quietBefore = snapshot();
      shoot();
      out.quietAfter = snapshot();

      // Case B: loud facility. The branch is skipped entirely.
      keep.awareness = 0;
      keep.lastKnownPos = null;
      keep.engaged = false;
      mgr.facilityLoud = true;
      mgr.alertCount = 0;
      out.loudBefore = snapshot();
      shoot();
      out.loudAfter = snapshot();

      // And what three more of its own shots do to the alert counter.
      const before = mgr.alertCount;
      shoot(); shoot(); shoot();
      out.alertsFromThreeMoreShots = mgr.alertCount - before;
      out.selfPosition = keep.position.toArray().map((n) => +n.toFixed(2));
      return out;
    });

    const show = (label, a, b) => {
      log(`[selfalert] ${label}`);
      log(`[selfalert]   awareness   ${a.awareness} -> ${b.awareness}`);
      log(`[selfalert]   state       ${a.state} -> ${b.state}`);
      log(`[selfalert]   alertCount  ${a.alertCount} -> ${b.alertCount}`);
      log(`[selfalert]   lastKnownPos ${JSON.stringify(a.lastKnownPos)} -> ${JSON.stringify(b.lastKnownPos)}`);
    };

    log(`[selfalert] one hostile ${result.enemyId} at ${result.position.join(',')}, nobody else alive`);
    show('facilityLoud = false (friendly-fire branch runs):', result.quietBefore, result.quietAfter);
    show('facilityLoud = true (branch skipped):', result.loudBefore, result.loudAfter);
    log(`[selfalert] three more of its own shots added ${result.alertsFromThreeMoreShots} radio alert(s)`);
    log(`[selfalert] the hostile itself is at ${result.selfPosition.join(',')}`);

    writeJson('self-alert.json', result);
  } finally {
    await g.close();
    await server.stop();
  }
};

main().catch((err) => {
  process.stderr.write(`${err.stack || err}\n`);
  process.exit(1);
});
