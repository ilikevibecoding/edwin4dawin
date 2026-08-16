import { chromium } from 'playwright';
import { existsSync } from 'node:fs';

const url = process.env.SHOT_URL || 'http://127.0.0.1:5173/';

const browser = await chromium.launch({
  headless: true,
  channel: existsSync('/usr/local/bin/google-chrome') ? 'chrome' : undefined,
  args: ['--use-gl=angle', '--use-angle=swiftshader-webgl', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const pageErrors = [];
page.on('pageerror', (err) => pageErrors.push(String(err)));
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => window.debugAPI && window.debugAPI.ready && window.app, null, { timeout: 45000 });

const result = await page.evaluate(() => {
  const app = window.app;
  const probe = { hex: null, intensity: null };
  app.sub.root.traverse((o) => {
    if (probe.hex == null && o.userData.merged && o.material && o.material.emissive) {
      probe.hex = o.material.emissive.getHex();
      probe.intensity = o.material.emissiveIntensity;
    }
  });

  window.debugAPI.resetScene();
  window.debugAPI.setPlayerEnabled(true);
  app.player.state.locked = true;
  app.player.state.ignoreLook = 0;

  const before = window.debugAPI.getPlayerState();
  for (let i = 0; i < 8; i++) app.player.look(6, 1);
  app.player.update(0.016);
  const afterSmall = window.debugAPI.getPlayerState();

  app.player.look(4000, -4000);
  app.player.update(0.016);
  const afterSpike = window.debugAPI.getPlayerState();

  window.debugAPI.lookAtInteractable('sonar');
  app.interact.update(0.016);
  const afterHover = { hex: null, intensity: null, hovered: app.interact.hovered };
  app.sub.root.traverse((o) => {
    if (afterHover.hex == null && o.userData.merged && o.material && o.material.emissive) {
      afterHover.hex = o.material.emissive.getHex();
      afterHover.intensity = o.material.emissiveIntensity;
    }
  });

  return {
    probe,
    afterHover,
    yawDelta: afterSmall.yaw - before.yaw,
    pitchDelta: afterSmall.pitch - before.pitch,
    spikeYawDelta: afterSpike.yaw - afterSmall.yaw,
    spikePitchDelta: afterSpike.pitch - afterSmall.pitch,
  };
});

const checks = {
  pageErrors: pageErrors.length === 0,
  hullUnchanged: result.probe.hex === result.afterHover.hex && result.probe.intensity === result.afterHover.intensity,
  smallLookMoves: Math.abs(result.yawDelta) > 0.01 && Math.abs(result.yawDelta) < 0.2,
  spikeClamped: Math.abs(result.spikeYawDelta) < 0.2 && Math.abs(result.spikePitchDelta) < 0.2,
};

console.log(JSON.stringify({ checks, result, pageErrors }, null, 2));
await browser.close();
if (!Object.values(checks).every(Boolean)) process.exit(1);
