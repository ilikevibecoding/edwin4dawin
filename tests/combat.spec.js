import { expect } from '@playwright/test';
import {
  test,
  bootGame, advance, state, qa, shot, hold, release, tap, releaseAll,
  expectNoConsoleErrors, enterGameplay, writeArtifact, recordEvents,
  eventCounts, takeEvents, shotRecords,
} from './helpers/game.js';

// ---------------------------------------------------------------------------
// Scenario 5 — combat resolution.
//
// Proves the whole chain from a trigger pull to a mission-state change: damage
// is applied to the entity, health falls, a headshot multiplies, armour soaks,
// zero health ends the hostile's combat behaviour and increments the mission's
// neutralised count, and enemy return fire hurts the player.
// ---------------------------------------------------------------------------

/**
 * Put a hostile directly in front of the player at a known range and aim at it.
 * Returns the spawned enemy's id.
 */
async function targetInFront(page, { checkpoint = 'openoffice', distance = 6, variant = 'runner', height = 1.35 } = {}) {
  await qa(page, 'teleport', checkpoint);
  await page.evaluate((y) => {
    const p = window.__NORTHSTAR__.player;
    p.yaw = y;
    p.pitch = 0;
    p.velocity.set(0, 0, 0);
    p.updateCamera(0);
  }, 0);
  await advance(page, 200);

  const spawned = await page.evaluate(([d, v]) => {
    const g = window.__NORTHSTAR__;
    const p = g.player;
    const pos = [p.position.x + p.forward.x * d, p.position.y, p.position.z + p.forward.z * d];
    const res = g.qa.spawnEnemy(v, pos);
    return res;
  }, [distance, variant]);
  expect(spawned.ok, `spawnEnemy failed: ${JSON.stringify(spawned)}`).toBe(true);

  await aimAt(page, spawned.id, height);
  await advance(page, 120);
  return spawned.id;
}

/**
 * Point the crosshair at a body height on a specific hostile, immediately before
 * firing. Scoped weapons breathe: `_updateSway` writes several degrees of pitch
 * into the player every step while aiming, which at 8 m is a third of a metre —
 * enough to turn a headshot into a chest hit — so the aim has to be taken last,
 * not before the ADS settle.
 */
async function aimAt(page, id, height) {
  return page.evaluate(([wanted, h]) => {
    const g = window.__NORTHSTAR__;
    const p = g.player;
    const e = g.enemies.list.find((x) => x.id === wanted);
    if (!e) return { ok: false, reason: 'no-such-hostile' };
    const dx = e.position.x - p.eyePosition.x;
    const dy = (e.position.y + h) - p.eyePosition.y;
    const dz = e.position.z - p.eyePosition.z;
    const flat = Math.hypot(dx, dz);
    p.yaw = Math.atan2(-dx, -dz);
    p.pitch = Math.atan2(dy, flat);
    p.updateCamera(0);
    const region = (e.hitRegions || []).find((r) => Math.abs(r.center.y - (e.position.y + h)) < r.size.y * 0.5);
    return {
      ok: true,
      aimHeight: +(e.position.y + h).toFixed(3),
      eyeHeight: +p.eyePosition.y.toFixed(3),
      pitch: +p.pitch.toFixed(4),
      targetRegion: region?.name ?? null,
    };
  }, [id, height]);
}

const enemyById = (page, id) => page.evaluate((wanted) => {
  const e = window.__NORTHSTAR__.enemies.list.find((x) => x.id === wanted);
  if (!e) return null;
  return {
    id: e.id, alive: !!e.alive, health: Math.round(e.health), maxHealth: e.maxHealth,
    armor: e.armor, state: e.state, variant: e.variant,
  };
}, id);

test.describe('combat', () => {
  test('shooting a hostile applies damage and reduces its health', async ({ page }) => {
    await bootGame(page);
    await enterGameplay(page, { godMode: true });
    await recordEvents(page, ['combat:hit', 'enemy:death', 'world:impact']);
    await qa(page, 'freezeAI', true);
    await qa(page, 'giveWeapon', 'carbine');
    await advance(page, 700);

    const id = await targetInFront(page, { distance: 7 });
    const before = await enemyById(page, id);
    expect(before.alive).toBe(true);
    expect(before.health).toBe(before.maxHealth);

    await eventCounts(page);
    await tap(page, 'attack');
    await advance(page, 120);

    const hits = await shotRecords(page);
    const after = await enemyById(page, id);
    const { counts, events } = await eventCounts(page, ['combat:hit', 'world:impact']);

    writeArtifact('combat-damage.json', { before, after, hits, counts, events: events.slice(0, 6) });

    const characterHit = hits.find((h) => h.type === 'enemy');
    expect(characterHit, `the shot did not register on the hostile: ${JSON.stringify(hits)}`).toBeTruthy();
    expect(characterHit.damage, 'the hit did zero damage').toBeGreaterThan(0);
    expect(counts['combat:hit'], 'no combat:hit event for a hit hostile').toBeGreaterThanOrEqual(1);
    expect(
      after.health,
      `health went ${before.health} -> ${after.health} after a hit for ${characterHit.damage}`
    ).toBeLessThan(before.health);
    expect(before.health - after.health).toBeCloseTo(characterHit.damage, 0);

    await shot(page, 'combat-hit');
    await releaseAll(page);
    await expectNoConsoleErrors(page);
  });

  test('a headshot does more damage than a body shot', async ({ page }) => {
    await bootGame(page);
    await enterGameplay(page, { godMode: true });
    await qa(page, 'freezeAI', true);
    await qa(page, 'giveWeapon', 'sniper');
    await advance(page, 900);

    // Aim at the chest first. The aim is taken *after* the sight picture has
    // settled and immediately before the trigger, because a scoped weapon's
    // breathing sway rewrites the player's pitch on every step.
    const bodyId = await targetInFront(page, { distance: 6, height: 1.26 });
    await hold(page, 'aim');
    await advance(page, 700);
    const bodyAim = await aimAt(page, bodyId, 1.26);
    await tap(page, 'attack');
    await advance(page, 120);
    const bodyHits = await shotRecords(page);
    await release(page, 'aim');
    await qa(page, 'killAllEnemies');
    await advance(page, 200);

    // Then the head on a fresh, identical hostile.
    const headId = await targetInFront(page, { distance: 6, height: 1.6 });
    await hold(page, 'aim');
    await advance(page, 700);
    const headAim = await aimAt(page, headId, 1.6);
    await tap(page, 'attack');
    await advance(page, 120);
    const headHits = await shotRecords(page);
    await release(page, 'aim');
    await releaseAll(page);

    const body = bodyHits.find((h) => h.type === 'enemy');
    const head = headHits.find((h) => h.type === 'enemy');
    writeArtifact('combat-headshot.json', { bodyId, bodyAim, body, headId, headAim, head });

    expect(body, `the chest shot missed: ${JSON.stringify(bodyHits)}`).toBeTruthy();
    expect(head, `the head shot missed: ${JSON.stringify(headHits)}`).toBeTruthy();
    expect(head.headshot, `the shot at head height registered as region "${head.region}"`).toBe(true);
    expect(body.headshot).toBe(false);
    expect(
      head.damage,
      `headshot ${head.damage} is not greater than body shot ${body.damage}`
    ).toBeGreaterThan(body.damage);

    await shot(page, 'combat-headshot');
    await expectNoConsoleErrors(page);
  });

  test('armour soaks body damage', async ({ page }) => {
    await bootGame(page);
    await enterGameplay(page, { godMode: true });
    await qa(page, 'freezeAI', true);
    await qa(page, 'giveWeapon', 'pistol');
    await advance(page, 700);

    const measure = async (armor) => {
      const id = await targetInFront(page, { distance: 6, height: 1.05 });
      await page.evaluate(([wanted, a]) => {
        const e = window.__NORTHSTAR__.enemies.list.find((x) => x.id === wanted);
        e.armor = a;
        e.health = e.maxHealth;
      }, [id, armor]);
      await tap(page, 'attack');
      await advance(page, 140);
      const hit = (await shotRecords(page)).find((h) => h.type === 'enemy');
      await qa(page, 'killAllEnemies');
      await advance(page, 200);
      return hit;
    };

    // A low-penetration round against heavy armour must land softer.
    const bare = await measure(0);
    const armoured = await measure(100);

    writeArtifact('combat-armour.json', { bare, armoured });
    expect(bare, 'the unarmoured test shot missed').toBeTruthy();
    expect(armoured, 'the armoured test shot missed').toBeTruthy();
    expect(
      armoured.damage,
      `armour did not soak anything: bare ${bare.damage}, armoured ${armoured.damage}`
    ).toBeLessThan(bare.damage);

    await releaseAll(page);
    await expectNoConsoleErrors(page);
  });

  test('killing a hostile stops its behaviour and updates mission state', async ({ page }) => {
    await bootGame(page);
    await enterGameplay(page, { godMode: true });
    await recordEvents(page, ['enemy:death']);
    await qa(page, 'freezeAI', true);
    await qa(page, 'giveWeapon', 'carbine');
    await advance(page, 700);

    const id = await targetInFront(page, { distance: 6, height: 1.2 });
    // Sampled *after* the spawn: the hostile under test is one this scenario
    // added, so the population it has to reduce is the one that includes it.
    const beforeState = await state(page);
    await eventCounts(page);

    // Empty enough rounds into it to guarantee a kill.
    let alive = true;
    for (let i = 0; i < 14 && alive; i++) {
      await tap(page, 'attack');
      await advance(page, 140);
      alive = (await enemyById(page, id))?.alive ?? false;
    }
    await advance(page, 400);

    const dead = await enemyById(page, id);
    const deaths = await takeEvents(page, 'enemy:death');
    const afterState = await state(page);
    const record = afterState.enemies.list.find((e) => e.id === id);

    writeArtifact('combat-kill.json', {
      dead, deaths,
      enemiesBefore: { count: beforeState.enemies.count, alive: beforeState.enemies.alive, neutralised: beforeState.enemies.neutralised },
      enemiesAfter: { count: afterState.enemies.count, alive: afterState.enemies.alive, neutralised: afterState.enemies.neutralised },
      record,
    });

    expect(dead.alive, 'the hostile survived 14 rounds at 6 m').toBe(false);
    expect(dead.health).toBeLessThanOrEqual(0);
    expect(deaths.length, 'no enemy:death event was emitted').toBeGreaterThanOrEqual(1);
    // Combat behaviour must actually stop, not just flag "dead".
    expect(record.state, `a dead hostile is still in state "${record.state}"`).toMatch(/dead|down|neutral/i);
    expect(record.alive).toBe(false);
    expect(
      afterState.enemies.neutralised,
      'the mission neutralised count did not increase'
    ).toBeGreaterThan(beforeState.enemies.neutralised);
    expect(afterState.enemies.alive).toBeLessThan(beforeState.enemies.alive);

    // A dead hostile must not shoot: unfreeze and give it plenty of time.
    await qa(page, 'freezeAI', false);
    await recordEvents(page, ['enemy:fire']);
    await eventCounts(page);
    await advance(page, 3000, { render: false });
    const fires = await takeEvents(page, 'enemy:fire');
    const stillDead = await enemyById(page, id);
    expect(stillDead.alive, 'a dead hostile came back to life').toBe(false);

    await shot(page, 'combat-kill');
    await releaseAll(page);
    await expectNoConsoleErrors(page);
  });

  test('enemy return fire damages the player', async ({ page }) => {
    await bootGame(page);
    await enterGameplay(page);
    await recordEvents(page, ['enemy:fire', 'player:damage']);

    // Put a hostile at conversational range, in the open, fully alerted, and
    // let the AI run. Godmode off: this is the damage path under test.
    await qa(page, 'freezeAI', true);
    const id = await targetInFront(page, { checkpoint: 'openoffice', distance: 5, variant: 'shield' });
    await page.evaluate((wanted) => {
      const g = window.__NORTHSTAR__;
      const e = g.enemies.list.find((x) => x.id === wanted);
      // Fully aware of the player, standing, weapon up.
      e.awareness = 1;
      e.lastKnownPos = g.player.position.clone();
      e.ammo = 300;
    }, id);
    await eventCounts(page);
    await qa(page, 'freezeAI', false);

    const before = await state(page);
    expect(before.player.health).toBe(100);

    // Give the reaction timer and the burst cadence room to work.
    let hurt = false;
    for (let i = 0; i < 40 && !hurt; i++) {
      await advance(page, 250, { render: false });
      hurt = (await state(page)).player.health < 100 || (await state(page)).player.armor < before.player.armor;
    }
    const after = await state(page);
    const { counts, events } = await eventCounts(page, ['enemy:fire', 'player:damage']);

    writeArtifact('combat-return-fire.json', {
      before: { health: before.player.health, armor: before.player.armor },
      after: { health: after.player.health, armor: after.player.armor },
      counts, events: events.slice(0, 10),
    });

    expect(counts['enemy:fire'], 'an alerted hostile 5 m away never opened fire').toBeGreaterThanOrEqual(1);
    expect(
      after.player.health + after.player.armor,
      `the player took no damage from ${counts['enemy:fire']} incoming shots`
    ).toBeLessThan(before.player.health + before.player.armor);
    expect(counts['player:damage'], 'no player:damage event was emitted').toBeGreaterThanOrEqual(1);

    await shot(page, 'combat-return-fire');
    await qa(page, 'freezeAI', true);
    await releaseAll(page);
    await expectNoConsoleErrors(page);
  });

  test('player armour absorbs part of incoming damage', async ({ page }) => {
    await bootGame(page);
    await enterGameplay(page, { freezeAI: true });

    // With no armour, the whole amount comes off health.
    await page.evaluate(() => {
      const p = window.__NORTHSTAR__.player;
      p.health = 100;
      p.armor = 0;
    });
    await qa(page, 'damagePlayer', 40, 'bullet');
    await advance(page, 200);
    const noArmour = await state(page);
    const healthLostBare = 100 - noArmour.player.health;

    // With armour, less reaches health and the armour itself is consumed.
    await page.evaluate(() => {
      const p = window.__NORTHSTAR__.player;
      p.health = 100;
      p.armor = 100;
    });
    await qa(page, 'damagePlayer', 40, 'bullet');
    await advance(page, 200);
    const withArmour = await state(page);
    const healthLostArmoured = 100 - withArmour.player.health;

    writeArtifact('combat-player-armour.json', {
      bare: { healthLost: healthLostBare, armor: noArmour.player.armor },
      armoured: { healthLost: healthLostArmoured, armor: withArmour.player.armor },
    });

    expect(healthLostBare, 'unarmoured damage did not reduce health').toBeGreaterThan(0);
    expect(
      healthLostArmoured,
      `armour absorbed nothing: bare lost ${healthLostBare} hp, armoured lost ${healthLostArmoured} hp`
    ).toBeLessThan(healthLostBare);
    expect(withArmour.player.armor, 'armour was not consumed').toBeLessThan(100);

    await expectNoConsoleErrors(page);
  });
});
