// Which quality-preset knobs actually move when quality changes?  (owner: opus4)
//
// `QUALITY_PRESETS` advertises twelve knobs per preset, and the settings menu
// lets a player switch preset at any time — including mid-mission, which is
// precisely when someone whose framerate has collapsed will reach for it.
// `Engine.applyQuality` is the only thing wired to that change, and it touches
// four of the twelve.
//
// Reading the code says the rest are build-time or dead. This proves it from the
// live scene: boot at `high`, measure every knob's observable effect, switch to
// `low`, measure again, and report which observations moved. A knob whose effect
// is identical at `low` and `high` is not doing anything for the player who
// turned the setting down.
//
//   node tools/qualityknobs.mjs

import { parseArgs, startServer, openGame, writeJson } from './lib/session.mjs';

const args = parseArgs();
const log = (...p) => process.stdout.write(`${p.join(' ')}\n`);

/**
 * For each preset field, how to observe its effect in the live scene. Anything
 * that cannot be observed at all is a knob nothing reads.
 */
const probe = () => {
  const game = window.__NORTHSTAR__;
  const engine = game.engine;
  const renderer = engine.renderer;

  const props = game.props;
  let propMeshes = 0;
  let propInstances = 0;
  game.scene?.traverse?.((n) => {
    if (!n.isMesh) return;
    if (n.isInstancedMesh) propInstances += n.count;
    else propMeshes++;
  });

  // Anisotropy actually in force on the textures the scene is sampling, not the
  // ceiling the engine would apply to a texture created from now on.
  const aniso = new Set();
  game.scene?.traverse?.((n) => {
    const mats = n.material ? (Array.isArray(n.material) ? n.material : [n.material]) : [];
    for (const m of mats) {
      for (const slot of ['map', 'normalMap', 'roughnessMap']) {
        if (m?.[slot]?.anisotropy !== undefined) aniso.add(m[slot].anisotropy);
      }
    }
  });

  // Texture scale shows up as the pixel dimensions of a generated map.
  const sizes = new Set();
  game.scene?.traverse?.((n) => {
    const mats = n.material ? (Array.isArray(n.material) ? n.material : [n.material]) : [];
    for (const m of mats) {
      const img = m?.map?.image;
      if (img?.width) sizes.add(`${img.width}x${img.height}`);
    }
  });

  return {
    shadows: renderer.shadowMap.enabled,
    shadowRefreshInterval: engine.shadowRefreshInterval ?? null,
    shadowMapSize: game.lighting?.sun?.shadow?.mapSize?.x ?? null,
    pixelRatio: +renderer.getPixelRatio().toFixed(4),
    drawingBufferWidth: renderer.domElement.width,
    bloomEnabled: game.postfx?.bloomEnabled ?? game.postfx?.bloom?.enabled ?? null,
    fxaaEnabled: game.postfx?.fxaaEnabled ?? null,
    particleScale: game.effects?.pScale ?? null,
    decalBudget: game.decals?.budget ?? null,
    maxDynamicLightsInUse: game.lighting?.poolList?.filter?.((l) => l.light?.visible)?.length ?? null,
    propCount: props?.placed?.length ?? props?.count ?? null,
    propDensityInUse: props?.density ?? null,
    propMeshes,
    propInstances,
    distinctAnisotropy: [...aniso].sort((a, b) => a - b),
    distinctTextureSizes: [...sizes].sort(),
    engineMaxAnisotropy: engine.maxAnisotropy ?? null,
  };
};

const main = async () => {
  const server = args.url
    ? { url: String(args.url), stop: async () => {}, reused: true }
    : await startServer({ port: Number(args.port ?? 5182) });

  // Boot at `high` so every knob starts at its most expensive value: anything
  // that fails to come down when we ask for `low` is the defect.
  const g = await openGame({
    url: server.url, width: 640, height: 360, quality: 'high', resolutionScale: 1,
  });
  const { qa, advance, page } = g;

  try {
    await qa('forcePlay', { difficulty: 'operator' });
    await page.waitForFunction(() => window.__NORTHSTAR__.state === 'playing', null, { timeout: 60_000 });
    await qa('teleport', 'openoffice');
    await advance(600);

    const high = await page.evaluate(probe);
    // Exactly what the settings menu does: set the preset and let the bus carry it.
    await qa('setQuality', 'low');
    await qa('setResolutionScale', 1);
    await advance(600);
    const low = await page.evaluate(probe);

    // And what a fresh boot at `low` looks like, which is the value the preset
    // is actually promising.
    await g.close();
    const g2 = await openGame({
      url: server.url, width: 640, height: 360, quality: 'low', resolutionScale: 1,
    });
    await g2.qa('forcePlay', { difficulty: 'operator' });
    await g2.page.waitForFunction(() => window.__NORTHSTAR__.state === 'playing', null, { timeout: 60_000 });
    await g2.qa('teleport', 'openoffice');
    await g2.advance(600);
    const freshLow = await g2.page.evaluate(probe);
    await g2.close();

    const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    const rows = Object.keys(high).map((key) => {
      // A row that is null everywhere says nothing about the game — this tool
      // simply failed to find the property. Keep it out of the verdicts rather
      // than reporting a probe gap as a finding.
      const unobserved = [high, low, freshLow].every((s) => s[key] === null);
      return {
        observation: key,
        atHigh: high[key],
        afterSwitchToLow: low[key],
        freshBootAtLow: freshLow[key],
        unobserved,
        movedOnSwitch: !unobserved && !same(high[key], low[key]),
        // The knob does differ between presets, but only a rebuild delivers it.
        needsRebuild: !unobserved && same(high[key], low[key]) && !same(high[key], freshLow[key]),
      };
    });

    const moved = rows.filter((r) => r.movedOnSwitch);
    const rebuild = rows.filter((r) => r.needsRebuild);
    const inert = rows.filter((r) => !r.unobserved && !r.movedOnSwitch && !r.needsRebuild);
    const unseen = rows.filter((r) => r.unobserved);

    const w = Math.max(...rows.map((r) => r.observation.length));
    log('[quality] observation'.padEnd(w + 11) + 'high            -> low (switch)   fresh low');
    for (const r of rows) {
      const flag = r.unobserved ? 'not-seen'
        : r.movedOnSwitch ? 'live    '
          : r.needsRebuild ? 'REBUILD ' : 'inert   ';
      log(`[quality] ${flag} ${r.observation.padEnd(w)}  ${String(JSON.stringify(r.atHigh)).slice(0, 15).padEnd(16)}`
        + `${String(JSON.stringify(r.afterSwitchToLow)).slice(0, 15).padEnd(16)}`
        + `${String(JSON.stringify(r.freshBootAtLow)).slice(0, 15)}`);
    }

    log('');
    log(`[quality] ${moved.length} observation(s) respond to a runtime quality change: `
      + moved.map((r) => r.observation).join(', '));
    log(`[quality] ${rebuild.length} differ between presets but only a rebuild delivers them: `
      + rebuild.map((r) => r.observation).join(', '));
    if (inert.length) {
      log(`[quality] ${inert.length} are identical at low and high however you get there: `
        + inert.map((r) => r.observation).join(', '));
    }
    if (unseen.length) {
      log(`[quality] ${unseen.length} could not be observed by this tool, so they are not a finding: `
        + unseen.map((r) => r.observation).join(', '));
    }

    writeJson('quality-knobs.json', { high, afterSwitchToLow: low, freshBootAtLow: freshLow, rows });
  } finally {
    await g.close().catch(() => {});
    await server.stop();
  }
};

main().catch((err) => {
  process.stderr.write(`${err.stack || err}\n`);
  process.exit(1);
});
