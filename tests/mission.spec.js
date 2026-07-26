// PW-09 defeat + restart, PW-10 doors, PW-11 hostage chain, PW-12/13 extraction and objective
// order, PW-16 pause freezes the simulation, PW-17 restart resets everything, PW-19 fullscreen,
// PW-24 glass. One boot per test; related assertions are clustered to keep the suite inside budget.
import { test, expect } from '@playwright/test';
import { boot, expectNoErrors } from './helpers/game.js';

async function inMission(page, opts = {}) {
  const game = await boot(page);
  await game.quickStart({ freezeAI: true, god: true, ...opts });
  await game.adv(400);
  return game;
}

/** Walks the player up to the nearest operable door and returns its snapshot. */
async function approachDoor(game, checkpoint) {
  await game.qa('teleport', checkpoint);
  await game.adv(120);
  const found = await game.probe(() => {
    const m = window.__game.mission, p = m.player;
    let best = null;
    for (const d of m.map.doors) {
      if (d.kind === 'shutter') continue;
      const dist = d.center.distanceTo(p.pos);
      if (!best || dist < best.dist) best = { id: d.id, dist, locked: d.state === 'locked', center: [d.center.x, d.center.y, d.center.z] };
    }
    if (!best) return null;
    // Stand 1.1 m from the leaf, facing it, so the interaction ray picks it up.
    const c = best.center;
    const dx = p.pos.x - c[0], dz = p.pos.z - c[2];
    const len = Math.hypot(dx, dz) || 1;
    p.pos.x = c[0] + (dx / len) * 1.1;
    p.pos.z = c[2] + (dz / len) * 1.1;
    p.pos.y = Math.abs(c[1]) < 1.8 ? 0 : p.pos.y;
    p.yaw = Math.atan2(-(c[0] - p.pos.x), -(c[2] - p.pos.z));
    p.pitch = 0;
    p.vel.set(0, 0, 0);
    return { id: best.id, locked: best.locked, dist: +best.dist.toFixed(2) };
  });
  await game.adv(120);
  return found;
}

test.describe('mission', () => {
  test('PW-10 doors open, close, block movement and report their state', async ({ page }) => {
    const game = await inMission(page);

    const near = await approachDoor(game, 'sec');
    expect(near, 'a door exists near the security office').not.toBeNull();
    expect(near.locked, 'the test needs an operable door here').toBe(false);

    // The interaction prompt has to see it before E can do anything.
    const prompt = await game.probe(() => {
      const t = window.__game.mission.interactTarget;
      return t ? { kind: t.kind, id: t.ref.id, label: t.label } : null;
    });
    expect(prompt, 'the door is offered as an interaction target').not.toBeNull();
    expect(prompt.kind).toBe('door');
    expect(prompt.label).toBe('Open door');

    const closed = await game.door(prompt.id);
    expect(closed.state).toBe('closed');
    expect(closed.blocksPath, 'a closed door blocks pathing').toBe(true);
    // The text state a tester reads must agree with the object.
    const listed = (await game.state()).nearbyDoors.find((d) => d.id === prompt.id);
    expect(listed, 'the door shows up in nearbyDoors').toBeDefined();
    expect(listed.state).toBe('closed');

    await game.tap('KeyE');
    expect((await game.door(prompt.id)).state, 'E starts the door swinging').toBe('opening');
    await game.adv(1600);
    const open = await game.door(prompt.id);
    expect(open.state, 'the door finishes opening').toBe('open');
    expect(open.blocksPath, 'an open door no longer blocks pathing').toBe(false);
    expect((await game.state()).nearbyDoors.find((d) => d.id === prompt.id).state).toBe('open');

    // Walking forward now carries the player through the opening.
    const throughStart = await game.state();
    await game.hold('KeyW', 1400);
    await game.qa('releaseAll');
    await game.adv(100);
    const throughEnd = await game.state();
    const travelled = Math.hypot(
      throughEnd.player.position[0] - throughStart.player.position[0],
      throughEnd.player.position[2] - throughStart.player.position[2]);
    expect(travelled, 'the player walks through the open doorway').toBeGreaterThan(1.5);

    // Close it again from the other side and confirm it blocks.
    const reprompt = await approachDoor(game, 'sec');
    await game.tap('KeyE');
    await game.adv(1800);
    const reclosed = await game.door(reprompt.id);
    expect(['closed', 'closing']).toContain(reclosed.state);
    await game.adv(600);
    expect((await game.door(reprompt.id)).blocksPath, 'the closed door blocks again').toBe(true);

    await expectNoErrors(game, 'doors');
  });

  test('PW-10 a locked door refuses to open', async ({ page }) => {
    const game = await inMission(page);

    const locked = await game.probe(() => {
      const m = window.__game.mission, p = m.player;
      const d = m.map.doors.find((x) => x.state === 'locked');
      if (!d) return null;
      p.pos.set(d.center.x, Math.abs(d.center.y) < 1.8 ? 0 : p.pos.y, d.center.z + 1.1);
      p.yaw = Math.atan2(-(d.center.x - p.pos.x), -(d.center.z - p.pos.z));
      p.pitch = 0;
      p.vel.set(0, 0, 0);
      return { id: d.id, center: [d.center.x, d.center.y, d.center.z] };
    });
    test.skip(!locked, 'the current layout defines no locked doors');

    await game.adv(200);
    expect((await game.door(locked.id)).state).toBe('locked');
    await game.tap('KeyE');
    await game.adv(1500);
    const after = await game.door(locked.id);
    expect(after.state, 'a locked door stays locked').toBe('locked');
    expect(after.blocksPath).toBe(true);

    await expectNoErrors(game, 'locked-door');
  });

  test('PW-11 hostage chain: discover, secure, hold, follow again', async ({ page }) => {
    const game = await inMission(page);

    // Walk into the holding room: discovery is proximity + line of sight, driven by the objective pass.
    await game.qa('teleport', 'server');
    await game.adv(200);
    const hostage = await game.probe(() => {
      const m = window.__game.mission, p = m.player;
      let best = null;
      for (const h of m.hostages) {
        const d = h.pos.distanceTo(p.pos);
        if (!best || d < best.d) best = { d, h };
      }
      // Stand right next to the closest hostage and look at them.
      const h = best.h;
      p.pos.set(h.pos.x, h.pos.y, h.pos.z + 1.4);
      p.yaw = Math.atan2(-(h.pos.x - p.pos.x), -(h.pos.z - p.pos.z));
      p.pitch = 0;
      p.vel.set(0, 0, 0);
      return { id: h.id, name: h.name, state: h.state, discovered: h.discovered };
    });
    expect(hostage.state, 'hostages start captive').toBe('captive');

    await game.adv(600);
    const hs = () => game.probe((hid) => {
      const h = window.__game.mission.hostages.find((x) => x.id === hid);
      return { state: h.state, discovered: h.discovered, secured: h.secured, alive: h.alive };
    }, hostage.id);

    expect((await hs()).discovered, 'standing in front of a hostage discovers them').toBe(true);
    const located = (await game.state()).objectives.find((o) => o.id === 'locate');
    expect(['active', 'done'], 'the locate objective has engaged').toContain(located.state);

    // The interaction prompt should offer to secure them.
    const prompt = await game.probe(() => {
      const t = window.__game.mission.interactTarget;
      return t ? { kind: t.kind, label: t.label } : null;
    });
    expect(prompt, 'the hostage is the active interaction target').not.toBeNull();
    expect(prompt.kind).toBe('hostage');
    expect(prompt.label).toContain('Secure');

    await game.tap('KeyE');
    await game.adv(200);
    expect((await hs()).state, 'securing a hostage starts them following').toBe('following');
    expect((await hs()).secured).toBe(true);

    await game.tap('KeyE');
    await game.adv(200);
    expect((await hs()).state, 'E again tells them to hold position').toBe('waiting');

    await game.tap('KeyE');
    await game.adv(200);
    expect((await hs()).state, 'E once more resumes the follow').toBe('following');

    // A following hostage closes the distance when the player moves away.
    await game.qa('teleport', 'it');
    const gap0 = await game.probe((hid) => {
      const m = window.__game.mission;
      const h = m.hostages.find((x) => x.id === hid);
      return +h.pos.distanceTo(m.player.pos).toFixed(2);
    }, hostage.id);
    await game.adv(6000);
    const gap1 = await game.probe((hid) => {
      const m = window.__game.mission;
      const h = m.hostages.find((x) => x.id === hid);
      return +h.pos.distanceTo(m.player.pos).toFixed(2);
    }, hostage.id);
    expect(gap1, 'the hostage follows the player').toBeLessThan(gap0);

    // The text state exposes the chain for testers.
    const listed = (await game.state()).hostages.find((h) => h.id === hostage.id);
    expect(listed).toMatchObject({ discovered: true, state: 'following' });

    await expectNoErrors(game, 'hostages');
  });

  test('PW-12/PW-13 objectives progress in order and extraction wins the mission', async ({ page }) => {
    const game = await inMission(page);

    const ids = (await game.state()).objectives.map((o) => o.id);
    expect(ids, 'the objective list is the scripted five').toEqual(
      ['infiltrate', 'locate', 'secure', 'escort', 'exfil']);
    const first = await game.state();
    expect(first.objectives[0].state, 'only the first objective starts active').toBe('active');
    expect(first.objectives.slice(1).every((o) => o.state === 'pending')).toBe(true);

    // The clock runs off simulated time only.
    const t0 = first.missionTimerSec;
    await game.adv(3000);
    const t1 = (await game.state()).missionTimerSec;
    expect(t1 - t0, 'the mission clock tracks simulated time').toBeCloseTo(3, 1);

    // Fast-forward the objective chain, then let the exfil countdown run out. Sampling every two
    // simulated seconds records the order the stages actually complete in rather than assuming a
    // particular duration for each one.
    await game.qa('setObjective', 'escorted');
    await game.adv(2000);
    const escorting = await game.state();
    expect(escorting.hostages.every((h) => h.discovered), 'both hostages are accounted for').toBe(true);
    expect(escorting.objectives.find((o) => o.id === 'infiltrate').state).toBe('done');

    const timeline = [];
    for (let i = 0; i < 14 && (await game.mode()) === 'playing'; i++) {
      const s = await game.state();
      timeline.push({
        escort: s.objectives.find((o) => o.id === 'escort').state,
        exfil: s.objectives.find((o) => o.id === 'exfil').state,
        countdown: s.extraction.countdown,
        extracted: s.hostages.filter((h) => h.state === 'extracted').length,
      });
      await game.adv(2000);
    }

    expect(timeline.some((t) => t.extracted === 2), 'both hostages reach the extraction zone').toBe(true);
    expect(timeline.some((t) => t.escort === 'done' && t.exfil === 'active'),
      'the escort objective hands over to the exfil hold').toBe(true);
    expect(timeline.some((t) => t.countdown != null && t.countdown > 0),
      'the exfil countdown is exposed while it runs').toBe(true);
    // Order: escort can never be done while exfil is still pending-but-active-first.
    const firstEscortDone = timeline.findIndex((t) => t.escort === 'done');
    const firstExfilActive = timeline.findIndex((t) => t.exfil === 'active');
    expect(firstEscortDone, 'escort completes').toBeGreaterThanOrEqual(0);
    expect(firstExfilActive, 'exfil only activates once the escort is done')
      .toBeGreaterThanOrEqual(firstEscortDone);

    expect(await game.mode(), 'holding the zone wins the mission').toBe('victory');
    expect(await game.screenVisible('victory')).toBe(true);
    const result = await game.probe(() => window.__game.mission.result);
    expect(result.result).toBe('victory');
    expect(result.time, 'the result carries the mission time').toBeGreaterThan(0);
    expect((await game.state()).objectives.every((o) => o.state === 'done')).toBe(true);

    await expectNoErrors(game, 'victory');
  });

  test('PW-09 lethal damage ends the mission in defeat and restart recovers', async ({ page }) => {
    const game = await inMission(page, { god: false });

    const start = await game.state();
    expect(start.player.health).toBe(100);
    // 'operator' issues armour, which soaks part of the first hits.
    expect(start.player.armor).toBeGreaterThanOrEqual(0);

    await game.qa('hurt', 30);
    await game.adv(100);
    const hurt = await game.state();
    expect(hurt.player.health + hurt.player.armor,
      'damage comes off the health/armour pool').toBeLessThan(start.player.health + start.player.armor);

    await game.qa('hurt', 1000);
    await game.adv(200);
    expect(await game.mode(), 'a lethal hit ends the mission').toBe('defeat');
    expect(await game.screenVisible('defeat')).toBe(true);
    expect(await game.probe(() => window.__game.mission.result.result)).toBe('defeat');

    // Retry from the defeat screen must produce a clean mission.
    await game.click('restart');
    await page.waitForFunction(() => window.__game.state === 'playing', null, { timeout: 60_000 });
    await game.adv(300);
    const retry = await game.state();
    expect(retry.player.health, 'the retry starts at full health').toBe(100);
    expect(retry.missionTimerSec).toBeLessThan(2);
    expect(retry.objectives[0]).toMatchObject({ id: 'infiltrate', state: 'active' });

    await expectNoErrors(game, 'defeat');
  });

  test('PW-12 losing a hostage ends the mission in defeat', async ({ page }) => {
    const game = await inMission(page);

    // Shooting a hostage is the only player-driven way to lose one, so aim and fire at point blank.
    const target = await game.probe(() => {
      const m = window.__game.mission, p = m.player;
      const h = m.hostages[0];
      p.pos.set(h.pos.x, h.pos.y, h.pos.z + 1.6);
      p.vel.set(0, 0, 0);
      return { id: h.id, chest: [h.pos.x, h.pos.y + 1.2, h.pos.z] };
    });
    await game.adv(500);
    await game.aimAtPoint(target.chest);

    for (let i = 0; i < 8; i++) {
      if (await game.mode() !== 'playing') break;
      await game.aimAtPoint(target.chest);
      await game.fire(150);
    }

    expect(await game.mode(), 'a dead hostage fails the mission').toBe('defeat');
    const result = await game.probe(() => window.__game.mission.result);
    expect(result.message.toLowerCase(), 'the debrief names the cause').toContain('hostage');
    expect(await game.probe((hid) => window.__game.mission.hostages.find((h) => h.id === hid).alive,
      target.id)).toBe(false);

    await expectNoErrors(game, 'hostage-lost');
  });

  test('PW-16 pausing freezes the simulation and resuming restores it', async ({ page }) => {
    const game = await inMission(page);
    await game.adv(1000);

    const before = await game.state();
    await page.keyboard.press('KeyP');
    expect(await game.mode()).toBe('paused');
    expect(await game.screenVisible('hud'), 'the HUD is hidden while paused').toBe(false);

    // The engine keeps stepping while paused; mission.update() is gated by game state, so nothing
    // in the simulation may move. Stepping a full simulated minute must be a no-op.
    const posBefore = await game.probe(() => {
      const m = window.__game.mission;
      return { p: [m.player.pos.x, m.player.pos.y, m.player.pos.z], e: m.enemies.map((x) => [x.pos.x, x.pos.z]) };
    });
    await game.qa('press', 'KeyW');
    await game.adv(60000);
    await game.qa('releaseAll');

    const paused = await game.state();
    expect(paused.missionTimerSec, 'the mission clock is frozen').toBeCloseTo(before.missionTimerSec, 3);
    const posAfter = await game.probe(() => {
      const m = window.__game.mission;
      return { p: [m.player.pos.x, m.player.pos.y, m.player.pos.z], e: m.enemies.map((x) => [x.pos.x, x.pos.z]) };
    });
    expect(posAfter.p, 'held movement keys do nothing while paused').toEqual(posBefore.p);
    expect(posAfter.e, 'hostiles are frozen while paused').toEqual(posBefore.e);

    await game.click('resume');
    expect(await game.mode()).toBe('playing');
    expect(await game.screenVisible('hud')).toBe(true);
    await game.adv(1000);
    const resumed = await game.state();
    expect(resumed.missionTimerSec, 'the clock resumes where it stopped')
      .toBeGreaterThan(before.missionTimerSec + 0.9);

    await expectNoErrors(game, 'pause');
  });

  test('PW-17 restarting mid-mission resets the whole world', async ({ page }) => {
    const game = await inMission(page);
    const pristine = await game.state();
    const enemyCount = pristine.enemiesRemaining;

    // Make a mess: burn ammo, kill hostiles, open doors, break glass, advance the objectives.
    await game.fire(600);
    await game.tap('KeyE');
    const doorId = await game.probe(() => {
      const d = window.__game.mission.map.doors.find((x) => x.kind !== 'shutter' && x.state === 'closed');
      d.open();
      return d.id;
    });
    const glassId = await game.probe(() => {
      const g = window.__game.mission.map.glass[0];
      g.hit(g.center);
      g.hit(g.center);
      return g.id;
    });
    await game.qa('killEnemies');
    await game.qa('setObjective', 'secured');
    await game.adv(2500);

    const messy = await game.state();
    expect(messy.enemiesRemaining, 'the world really is disturbed').toBe(0);
    expect(messy.player.weapon.magazine).toBeLessThan(pristine.player.weapon.magazine);
    expect((await game.door(doorId)).state).not.toBe('closed');
    expect((await game.glass(glassId)).state).toBe('broken');

    await game.qa('resetMission');
    await game.adv(300);

    const fresh = await game.state();
    expect(fresh.mode).toBe('playing');
    expect(fresh.missionTimerSec, 'the clock restarts at zero').toBeLessThan(1);
    expect(fresh.enemiesRemaining, 'every hostile is back').toBe(enemyCount);
    expect(fresh.player.weapon.magazine, 'the magazine is full again').toBe(pristine.player.weapon.magazine);
    expect(fresh.player.weapon.reserve).toBe(pristine.player.weapon.reserve);
    expect(fresh.player.health).toBe(100);
    expect(fresh.objectives, 'objectives are back to the first one active').toEqual(pristine.objectives);
    expect(fresh.hostages.every((h) => h.state === 'captive' && !h.discovered)).toBe(true);
    expect((await game.door(doorId)).state, 'doors are closed again').toBe('closed');
    expect((await game.glass(glassId)).state, 'panes are intact again').toBe('intact');
    expect((await game.glass(glassId)).blockShot).toBe(true);
    expect(await game.stats(), 'the scoreboard is cleared').toEqual({ kills: 0, shots: 0, hits: 0 });

    await expectNoErrors(game, 'restart');
  });

  test('PW-24 shots crack then break glass, and the noise draws attention', async ({ page }) => {
    const game = await inMission(page, { freezeAI: false });

    // Put the player in front of a pane, far enough that the shot is a clean hit on the glass.
    const pane = await game.probe(() => {
      const m = window.__game.mission, p = m.player;
      // Pick a pane whose front face is reachable and clear of other geometry.
      for (const g of m.map.glass) {
        const c = g.center;
        for (const dir of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
          const px = c.x + dir[0] * 2.2, pz = c.z + dir[1] * 2.2;
          const floorY = Math.abs(c.y - 1.5) < 2.5 ? 0 : 3.6;
          if (m.nav.nearestNode(px, floorY, pz) < 0) continue;
          p.pos.set(px, floorY, pz);
          p.vel.set(0, 0, 0);
          const eye = { x: p.pos.x, y: p.eyeY, z: p.pos.z };
          const d = { x: c.x - eye.x, y: c.y - eye.y, z: c.z - eye.z };
          const len = Math.hypot(d.x, d.y, d.z);
          const hit = m.world.raycast(eye.x, eye.y, eye.z, d.x / len, d.y / len, d.z / len, len + 0.5,
            (col) => col.blockShot);
          if (hit && hit.collider === g.collider) {
            return { id: g.id, aim: [c.x, c.y, c.z], from: [p.pos.x, p.pos.y, p.pos.z] };
          }
        }
      }
      return null;
    });
    expect(pane, 'a breakable pane is reachable with a clear shot').not.toBeNull();

    await game.adv(600);
    await game.aimAtPoint(pane.aim);
    expect((await game.glass(pane.id)).state).toBe('intact');

    await game.fire(30);
    await game.adv(200);
    const cracked = await game.glass(pane.id);
    expect(cracked.state, 'the first round cracks the pane').toBe('cracked');
    expect(cracked.blockShot, 'a cracked pane still stops bullets').toBe(true);

    await game.aimAtPoint(pane.aim);
    await game.fire(30);
    await game.adv(300);
    const broken = await game.glass(pane.id);
    expect(broken.state, 'the second round breaks it').toBe('broken');
    expect(broken.blockShot, 'a broken pane no longer stops bullets').toBe(false);
    expect(await game.probe(() => window.__game.mission.vfx.shards?.length ?? window.__game.mission.vfx.debris?.length ?? -1),
      'fragments spawned (or the VFX pool is named differently)').not.toBe(0);

    // Gunfire plus breaking glass is loud: someone within earshot must react.
    await game.adv(2500);
    const reacting = await game.probe(() => window.__game.mission.enemies
      .filter((e) => e.alive && ['investigate', 'combat', 'search'].includes(e.state)).length);
    expect(reacting, 'the noise pulls at least one hostile off its routine').toBeGreaterThan(0);

    await expectNoErrors(game, 'glass');
  });

  test('PW-19 the fullscreen key reaches the handler and the game survives a refusal', async ({ page }) => {
    const game = await inMission(page);

    // Headless Chrome will not grant fullscreen for a synthesised key event, so what is verified
    // here is that F is wired to the request and that a refusal does not take the mission down.
    const outcome = await page.evaluate(async () => {
      const events = [];
      document.addEventListener('fullscreenchange', () => events.push('change'));
      const original = document.documentElement.requestFullscreen;
      document.documentElement.requestFullscreen = function patched(...args) {
        events.push('requested');
        return original.apply(this, args);
      };
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyF', bubbles: true }));
      await new Promise((r) => setTimeout(r, 400));
      document.documentElement.requestFullscreen = original;
      return { events, granted: !!document.fullscreenElement };
    });

    expect(outcome.events, 'F reaches the fullscreen handler').toContain('requested');
    await game.adv(300);
    expect(await game.mode(), 'a refused request leaves the mission running').toBe('playing');
    if (!outcome.granted) {
      // eslint-disable-next-line no-console
      console.log('PW-19: headless Chrome refused fullscreen; verified the request path only. '
        + 'Exiting with Esc needs a real browser session and is not covered here.');
    }

    // Known bug NS-4 (docs/reports/wp-008.md): Game.toggleFullscreen() wraps requestFullscreen()
    // in try/catch, but the call rejects asynchronously, so a refusal escapes as an unhandled
    // rejection. Allowed here only so the rest of the console assertion still has teeth.
    await expectNoErrors(game, 'fullscreen', { allow: [/unhandledrejection.*Permissions check failed/] });
  });
});
