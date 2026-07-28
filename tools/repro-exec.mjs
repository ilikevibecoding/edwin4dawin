// Reproduce the reported block: reach the executive office (hostage B) on the
// mezzanine. Real movement input, steering toward waypoints, opening doors.
//
// Simulation steps run with { render: false } because a rendered frame costs
// 1-2 s under SwiftShader and the physics does not need one.
import { chromium } from '@playwright/test';

const b = await chromium.launch({ channel: 'chromium',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 640, height: 360 } });
p.on('pageerror', (e) => console.log('PAGEERROR:', e.message));
p.on('console', (m) => { if (m.type() === 'error') console.log('ERR:', m.text().slice(0, 140)); });

await p.goto('http://127.0.0.1:5173/?qa=1', { waitUntil: 'domcontentloaded' });
const t0 = Date.now();
while (Date.now() - t0 < 300000) {
  if (await p.evaluate(() => globalThis.__NORTHSTAR__?.levelReady === true).catch(() => 0)) break;
  await new Promise((r) => setTimeout(r, 2000));
}
await p.evaluate(() => globalThis.__NORTHSTAR__.startMission({
  difficulty: 'operator', loadout: { primary: 'carbine', secondary: 'pistol', gadget: 'flash' } }));
const t1 = Date.now();
while (Date.now() - t1 < 60000) {
  if (await p.evaluate(() => globalThis.__NORTHSTAR__?.state === 'playing')) break;
  await new Promise((r) => setTimeout(r, 500));
}
await p.evaluate(() => { globalThis.__NORTHSTAR_QA__?.freezeAI?.(true); globalThis.__NORTHSTAR_QA__?.godMode?.(true); });
console.log('in gameplay\n');

const goTo = (x, z, ms, label) => p.evaluate(({ x, z, ms, label }) => {
  const g = globalThis.__NORTHSTAR__;
  const from = g.player.position.clone();
  let best = Infinity, stuckFor = 0; const opened = [];
  const step = 100;
  g.input.setActionState('forward', true);
  for (let t = 0; t < ms; t += step) {
    const dx = x - g.player.position.x;
    const dz = z - g.player.position.z;
    g.player.yaw = Math.atan2(-dx, -dz); // yaw 0 faces -Z
    g.player.pitch = 0;
    globalThis.advanceTime(step, { render: false });
    const d = Math.hypot(x - g.player.position.x, z - g.player.position.z);
    if (d < 0.45) break;
    if (d < best - 0.02) { best = d; stuckFor = 0; } else { stuckFor += step; }
    if (stuckFor > 600) {
      const it = g.findInteractable?.();
      if (it && it.kind === 'door' && !opened.includes(it.id)) {
        g.input.tapAction('use');
        opened.push(it.id);
        for (let k = 0; k < 14; k++) globalThis.advanceTime(step, { render: false });
        stuckFor = 0;
      } else if (stuckFor > 2500) break;
    }
  }
  g.input.setActionState('forward', false);
  globalThis.advanceTime(200, { render: false });
  const to = g.player.position;
  const dist = Math.hypot(x - to.x, z - to.z);
  return { label, to: [+to.x.toFixed(2), +to.y.toFixed(2), +to.z.toFixed(2)],
    remaining: +dist.toFixed(2), arrived: dist < 0.6,
    room: g.currentRoom()?.id ?? null, opened, moved: +from.distanceTo(to).toFixed(2) };
}, { x, z, ms, label });

const show = (r) => console.log(
  `  ${r.arrived ? 'ok     ' : 'BLOCKED'} ${r.label.padEnd(38)} at ${JSON.stringify(r.to)} room=${String(r.room).padEnd(13)} ${r.remaining}m short${r.opened.length ? `  [opened ${r.opened.join(',')}]` : ''}`);

const blockers = (x, y, z, r = 0.45) => p.evaluate(({ x, y, z, r }) => {
  const g = globalThis.__NORTHSTAR__;
  return g.collision.query({ x: x - r, y: y + 0.4, z: z - r }, { x: x + r, y: y + 1.6, z: z + r })
    .filter((c) => c.enabled)
    .map((c) => `${c.tag} x[${c.min.x.toFixed(2)},${c.max.x.toFixed(2)}] y[${c.min.y.toFixed(2)},${c.max.y.toFixed(2)}] z[${c.min.z.toFixed(2)},${c.max.z.toFixed(2)}]`);
}, { x, y, z, r });

const tp = (name) => p.evaluate((n) => { globalThis.__NORTHSTAR__.teleport(n); globalThis.advanceTime(400, { render: false }); }, name);

console.log('=== A: the whole ground-to-hostage-B route on foot ===');
await tp('lobby');
show(await goTo(11.6, -5.4, 7000, 'east through the lobby arch'));
show(await goTo(14.5, -2.35, 7000, 'to the foot of the central flight'));
show(await goTo(14.5, -7.6, 12000, 'up the flight'));
show(await goTo(12.2, -6.5, 6000, 'west onto the mezzanine landing'));
show(await goTo(9.0, -6.5, 6000, 'through the arch into the exec corridor'));
show(await goTo(-9.6, -6.4, 18000, 'west along the exec corridor'));
show(await goTo(-12.5, -6.4, 9000, 'through the exec door'));
let s = await p.evaluate(() => globalThis.render_game_to_text());
console.log('  final:', s.player?.room, s.player?.position);

console.log('\n=== B: isolate the upper floor only (start on the landing) ===');
await tp('upperlanding');
show(await goTo(9.0, -6.5, 8000, 'through the arch into the exec corridor'));
show(await goTo(-9.6, -6.4, 18000, 'west along the exec corridor'));
show(await goTo(-12.5, -6.4, 9000, 'through the exec door'));
s = await p.evaluate(() => globalThis.render_game_to_text());
console.log('  final:', s.player?.room, s.player?.position);
console.log('  in the exec doorway (-11, 4, -6.4):', JSON.stringify(await blockers(-11, 4, -6.4)));
console.log('  mid corridor  (0, 4, -6.4):', JSON.stringify(await blockers(0, 4, -6.4)));
console.log('  corridor west end (-10, 4, -6.4):', JSON.stringify(await blockers(-10, 4, -6.4)));

console.log('\n=== C: the west stair flank ===');
await tp('upperweststair');
show(await goTo(-19.6, -2.4, 8000, 'south along the stair head'));
show(await goTo(-17.5, -2.4, 8000, 'east through the fire door into the archive'));
show(await goTo(-14.0, -4.6, 9000, 'north through the archive door into the exec office'));
s = await p.evaluate(() => globalThis.render_game_to_text());
console.log('  final:', s.player?.room, s.player?.position);

await b.close();
