#!/usr/bin/env node
/**
 * Does the settings menu actually change anything?
 *
 * Every other part of the UI can be checked by looking at a screenshot. The
 * settings screen cannot: a slider that moves smoothly, shows the right number
 * and writes nothing to the engine photographs exactly like one that works. So
 * this drives the real controls — the same input events a mouse would produce —
 * and then reads the values back off the engine, the input latch and the Web
 * Audio graph, which is the only way to tell the two apart.
 *
 * Usage: node src/ui/dev/settingscheck.mjs
 */
import { chromium } from 'playwright';
import { spawn, execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const PORT = 4199;

async function main() {
  for (const cmd of [`fuser -k ${PORT}/tcp`, `pkill -f "vite preview.*${PORT}"`]) {
    try {
      execSync(`${cmd} 2>/dev/null || true`, { stdio: 'ignore' });
    } catch {
      /* ignore */
    }
  }
  const server = spawn(
    'npx',
    ['vite', 'preview', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1', '--outDir', 'dist-ui'],
    { cwd: ROOT, stdio: 'ignore', detached: true },
  );
  const kill = () => {
    try {
      process.kill(-server.pid, 'SIGKILL');
    } catch {
      server.kill('SIGKILL');
    }
  };
  process.on('exit', kill);
  const base = `http://127.0.0.1:${PORT}/`;
  for (let i = 0; i < 120; i++) {
    try {
      if ((await fetch(base)).ok) break;
    } catch {
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome-stable',
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--enable-unsafe-swiftshader',
      '--use-angle=swiftshader',
      '--autoplay-policy=no-user-gesture-required',
    ],
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', (e) => console.log(`[pageerror] ${e.message}`));
  await page.goto(`${base}?quality=low&capture=1`, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => window.GAME_READY === true, { timeout: 240000 });
  await page.waitForTimeout(4000);

  const report = await page.evaluate(async () => {
    const ui = window.GAME.get('ui');
    const audio = window.GAME.get('audio');
    try {
      await audio.unlock?.();
    } catch {
      /* headless has no gesture; the graph still exists */
    }
    const ctx = window.GAME.context;
    const graph = audio.engine?.graph;
    // The mixer ramps its gains rather than stepping them, so a reading taken
    // straight after a write reports the previous value.
    const settle = () => new Promise((r) => setTimeout(r, 700));
    const gain = (id) => {
      const v = graph?.buses?.get?.(id)?.gain?.value;
      return typeof v === 'number' ? +v.toFixed(4) : null;
    };
    const read = () => ({
      master: typeof graph?.master?.gain?.value === 'number' ? +graph.master.gain.value.toFixed(4) : null,
      sfx: gain('sfx'),
      weapons: gain('weapons'),
      ambience: gain('ambience'),
      music: gain('music'),
      fov: +ctx.camera.fov.toFixed(2),
      sensitivity: ctx.input.sensitivity,
      invertY: ctx.input.invertY,
    });

    ui.openMenu('settings');
    const tabs = [...document.querySelectorAll('.ob-tab')];
    const openTab = (name) => {
      for (const tab of tabs) if (tab.textContent === name) tab.click();
    };

    const slidersOn = (name) => {
      openTab(name);
      const found = {};
      for (const row of document.querySelectorAll('.ob-row')) {
        const input = row.querySelector('input[type=range]');
        const label = row.querySelector('.ob-row-name')?.textContent?.trim();
        if (input && label) found[label] = input;
      }
      return found;
    };
    const drive = (slider, value) => {
      slider.value = String(value);
      slider.dispatchEvent(new Event('input', { bubbles: true }));
    };

    const before = read();
    const all = { ...slidersOn('Gameplay'), ...slidersOn('Audio') };
    for (const [label, slider] of Object.entries(all)) {
      // Driven to an end stop rather than to a fraction of the range: a third of
      // the way along a field-of-view slider happens to be the default, and a
      // control that writes nothing then passes the test.
      const target =
        label === 'Field of view'
          ? Number(slider.max)
          : Number(slider.min) + (Number(slider.max) - Number(slider.min)) * 0.3;
      drive(slider, target);
    }

    // The mixer ducks the world buses for the duration of a pause and the menu
    // pauses the engine, so the reading that matters to a player is the one
    // taken after the menu is shut and the settings re-applied over the
    // restored trims — not the one taken while the menu is still up.
    ui.openMenu('none');
    await settle();
    await settle();
    const afterClose = read();

    // Where a bus that did not move went wrong: the mixer either refused the
    // request or accepted it and lost the parameter write.
    const stuck = {};
    for (const id of ['sfx', 'weapons', 'ambience', 'music']) {
      graph?.setBusVolume?.(id, 0.5);
    }
    await settle();
    for (const id of ['sfx', 'weapons', 'ambience', 'music']) {
      stuck[id] = { requested: 0.5, recorded: graph?.busVolumeOf?.(id) ?? null, gain: gain(id) };
    }

    // save() is debounced; give it room before asking what landed on disk.
    await new Promise((r) => setTimeout(r, 1200));
    const parsed = JSON.parse(localStorage.getItem('ob.ui.settings') ?? 'null');
    const binds = JSON.parse(localStorage.getItem('ob.ui.bindings') ?? 'null');

    return {
      controls: Object.keys(all),
      before,
      afterClose,
      directBusWrite: stuck,
      audioPublishes: {
        setMasterVolume: typeof audio.setMasterVolume === 'function',
        setBusVolume: typeof audio.setBusVolume === 'function',
        setSfxVolume: typeof audio.setSfxVolume === 'function',
      },
      persisted: parsed && {
        keys: Object.keys(parsed).length,
        masterVolume: parsed.masterVolume,
        sfxVolume: parsed.sfxVolume,
        musicVolume: parsed.musicVolume,
        fov: parsed.fov,
        sensitivity: parsed.sensitivity,
      },
      persistedBindings: binds ? Object.keys(binds).length : 0,
    };
  });

  console.log(JSON.stringify(report, null, 2));
  await browser.close();
  kill();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
