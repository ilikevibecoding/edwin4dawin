// Wave-2 and audit-wave mechanics (WP-016): weapon pickups from fallen hostiles, the extraction
// countdown chip, deterministic recoil patterns, and the difficulty A/B behaviour of perception.
//
// Everything here is driven through the same deterministic interface as the rest of the matrix —
// render_game_to_text(), advanceTime(), window.__qa — so nothing depends on wall-clock timing.
import { test, expect } from '@playwright/test';
import { boot, expectNoErrors } from './helpers/game.js';

test.describe('mechanics', () => {
  test('WP-016 a fallen hostile leaves a weapon that E takes, inheriting its ammunition', async ({ page }) => {
    const game = await boot(page);
    // The LR-8 goes in deliberately: a trooper carries the HC-4, and the pickup prompt is
    // suppressed for the weapon already in hand unless it is nearly dry (mission.js), so starting
    // on a different primary is what makes this a swap rather than a top-up.
    await game.quickStart({ primary: 'meridian-lr8', freezeAI: true, god: true });
    await game.qa('teleport', 'lobby');
    await game.adv(900); // finish the draw
    const start = await game.weapon();
    expect(start.id, 'the mission starts on the chosen primary').toBe('meridian-lr8');

    const id = await game.qa('spawnEnemy', 'trooper');
    await game.adv(60);
    // A hostile that had been shooting before it went down: 18 of 30 rounds left. A full magazine
    // would be indistinguishable from a freshly issued weapon, and inheritance is the point.
    await game.probe((eid) => { window.__game.mission.enemies.find((x) => x.id === eid).mag = 18; }, id);

    for (let i = 0; i < 6 && (await game.enemy(id)).alive; i++) {
      await game.aimAtEnemy(id);
      await game.fire(40);
      await game.adv(1600); // 45 rpm plus the 1.05 s bolt cycle
    }
    const dead = await game.enemy(id);
    expect(dead.alive, 'the trooper is down').toBe(false);

    // The weapon is tossed clear of the body over ~0.4 s and then rests flat on the floor.
    await game.adv(1500);
    const drop = await game.probe((eid) => {
      const e = window.__game.mission.enemies.find((x) => x.id === eid);
      const dw = e.rig.droppedWeapon;
      if (!dw) return null;
      dw.obj.updateWorldMatrix(true, false);
      const m = dw.obj.matrixWorld.elements;
      return { pos: [+m[12].toFixed(2), +m[13].toFixed(2), +m[14].toFixed(2)], visible: dw.obj.visible, taken: !!e.weaponTaken };
    }, id);
    expect(drop, 'the corpse drops its weapon').not.toBeNull();
    expect(drop.visible).toBe(true);
    expect(drop.taken, 'nothing has taken it yet').toBe(false);

    // Walk to it. Held W with the view kept on the weapon, in 150 ms slices, until the prompt
    // appears — the pickup radius is 1.9 m and the approach is real movement through the collision
    // world, not a teleport.
    const walk = await game.probe((w) => {
      const qa = window.__qa, m = window.__game.mission, p = m.player;
      const face = () => { p.yaw = Math.atan2(-(w[0] - p.pos.x), -(w[2] - p.pos.z)); p.pitch = 0; };
      const dist = () => +Math.hypot(p.pos.x - w[0], p.pos.z - w[2]).toFixed(2);
      const from = dist();
      qa.press('KeyW');
      const trail = [];
      for (let i = 0; i < 24; i++) {
        face();
        window.advanceTime(150);
        trail.push(dist());
        if (m.interactTarget && m.interactTarget.kind === 'pickup') break;
      }
      qa.releaseAll();
      window.advanceTime(60);
      return { from, to: dist(), steps: trail.length };
    }, drop.pos);
    expect(walk.to, 'the player walked up to the dropped weapon').toBeLessThan(walk.from);

    const prompt = (await game.state()).interactable;
    expect(prompt, 'standing over a dropped weapon offers it').not.toBeNull();
    expect(prompt.kind).toBe('pickup');
    expect(prompt.label, 'the prompt names the weapon on the floor').toBe('Take Halcyon HC-4');

    await game.tap('KeyE');
    await game.adv(700); // the new weapon has to be drawn
    const taken = await game.weapon();
    expect(taken.id, 'E swaps the primary for the one on the floor').toBe('halcyon-hc4');
    expect(taken.slot, 'it lands in the primary slot').toBe(2);
    expect(taken.state).toBe('idle');
    expect(taken.mag, 'the magazine is inherited from the fallen hostile').toBe(18);
    expect(taken.reserve, 'the body yields a reserve as well').toBe(30);
    expect((await game.state()).player.weapon.id, 'the text state agrees').toBe('halcyon-hc4');
    expect(await game.probe(() => Object.values(window.__game.mission.player.arsenal.slots)
      .map((w) => w.def.id)), 'the LR-8 was replaced, not stacked')
      .not.toContain('meridian-lr8');

    // The weapon is consumed: the pickup is gone from the world and from the prompt, because the
    // player is now carrying that same weapon with ammunition in it.
    const after = await game.probe((eid) => {
      const m = window.__game.mission;
      const e = m.enemies.find((x) => x.id === eid);
      return {
        taken: !!e.weaponTaken,
        visible: e.rig.droppedWeapon.obj.visible,
        prompt: m.interactTarget ? m.interactTarget.kind : null,
      };
    }, id);
    expect(after.taken).toBe(true);
    expect(after.visible, 'the floor model is removed once taken').toBe(false);
    expect(after.prompt, 'the same weapon is not offered twice').not.toBe('pickup');

    // Firing it proves the inherited ammunition is real state, not a display value.
    await game.fire(200);
    expect((await game.weapon()).mag, 'the inherited rounds are the rounds that fire').toBeLessThan(18);

    await expectNoErrors(game, 'weapon-pickup');
  });

  test('WP-016 the extraction countdown chip appears on the HUD while the exfil objective is held', async ({ page }) => {
    const game = await boot(page);
    await game.quickStart({ freezeAI: true, god: true });
    await game.adv(400);

    const chip = page.locator('#hud .extract-chip');
    await expect(chip, 'no chip before the climax').toBeHidden();

    // Both hostages into the garage, which hands the escort objective over to the exfil hold.
    await game.qa('setObjective', 'escorted');
    await game.adv(2000);

    // The countdown only runs while the player is standing in the zone, and victory fires when it
    // reaches zero, so the DOM is sampled in short slices while the chip is up.
    let sample = null;
    for (let i = 0; i < 24 && (await game.mode()) === 'playing'; i++) {
      const s = await game.state();
      const exfil = s.objectives.find((o) => o.id === 'exfil');
      if (exfil.state === 'active' && s.extraction.countdown != null) {
        sample = {
          countdown: s.extraction.countdown,
          display: await chip.evaluate((el) => getComputedStyle(el).display),
          text: (await chip.textContent()).trim(),
          objective: exfil.label,
        };
        break;
      }
      await game.adv(500);
    }

    expect(sample, 'the exfil hold started with the player in the zone').not.toBeNull();
    expect(sample.display, 'the chip is laid out, not hidden').toBe('flex');
    expect(sample.text, 'the chip states what to do').toContain('Hold the extraction zone');
    // The HUD is refreshed at 30 Hz, so the number on the chip is the ceiling of the countdown as
    // it was up to a tick ago: one second of slack, not more.
    const shown = +sample.text.replace(/[^0-9]/g, '');
    expect(shown, 'the chip counts down from the four-second hold').toBeGreaterThan(0);
    expect(shown, 'and never shows more than the hold itself').toBeLessThanOrEqual(4);
    expect(Math.abs(shown - Math.ceil(sample.countdown)),
      'the chip agrees with the countdown in the text state').toBeLessThanOrEqual(1);
    expect(sample.objective, 'the objective row carries the same number').toContain('Hold the extraction zone');
    await expect(chip).toBeVisible();

    // Stepping out of the zone drops the countdown, and the chip goes with it.
    await game.qa('teleport', 'sc-west');
    await game.adv(600);
    expect((await game.state()).extraction.countdown, 'leaving the zone clears the countdown').toBeNull();
    await expect(chip, 'the chip only exists while the hold is live').toBeHidden();

    await expectNoErrors(game, 'extraction-chip');
  });

  test('WP-016 recoil is deterministic: identical bursts from the same seed land identically', async ({ page }) => {
    const game = await boot(page);
    await game.quickStart({ freezeAI: true, god: true });
    await game.adv(400);

    // One burst, taken from a fresh mission reset (seed 1337) so the mission rng — which feeds the
    // pattern's lateral jitter — starts from the same place every time. The whole burst runs in one
    // page call: what is being compared is the simulation, and CDP round trips have no business in
    // the sample.
    const burst = (shots) => game.probe((n) => {
      const qa = window.__qa, g = window.__game;
      qa.resetMission();
      qa.freezeAI(true);
      qa.god(true);
      qa.teleport('lobby');
      window.advanceTime(900); // finish the draw
      qa.setYawPitch(90, 0);
      const a = g.mission.player.arsenal;
      const p = g.mission.player;
      qa.mouse(0, true);
      // 640 rpm is one round every 93.75 ms; 40 ms slices resolve each shot without straddling two.
      for (let i = 0; i < n * 3 && a.recoilIndex < n; i++) window.advanceTime(40);
      qa.mouse(0, false);
      const deg = (rad) => +((rad * 180) / Math.PI).toFixed(6);
      const text = JSON.parse(window.render_game_to_text());
      return {
        text: {
          yawDeg: text.player.yawDeg,
          pitchDeg: text.player.pitchDeg,
          forward: text.player.forward,
          recoilStep: text.player.weapon.recoilStep,
          spreadDeg: text.player.weapon.spreadDeg,
          magazine: text.player.weapon.magazine,
        },
        view: { yawDeg: deg(p.viewYaw), pitchDeg: deg(p.viewPitch) },
        offset: { pitchDeg: deg(a.recoilPitch), yawDeg: deg(a.recoilYaw) },
        parts: {
          kickPitch: deg(a.kickPitch), kickYaw: deg(a.kickYaw),
          climbPitch: deg(a.climbPitch), climbYaw: deg(a.climbYaw),
          heat: +a.heat.toFixed(6),
        },
      };
    }, shots);

    const first = await burst(6);
    const second = await burst(6);

    expect(first.text.recoilStep, 'the burst walked six steps of the pattern').toBe(6);
    expect(first.offset.pitchDeg, 'the pattern actually kicked the view up').toBeGreaterThan(0.5);
    expect(first.offset.yawDeg, 'and pushed it sideways').not.toBe(0);
    expect(second, 'an identical burst after an identical reset lands identically').toEqual(first);

    // Negative control: the comparison above would also pass if the sample were constant. A
    // shorter burst has to land somewhere else, otherwise nothing is being measured.
    const shorter = await burst(3);
    expect(shorter.text.recoilStep).toBe(3);
    expect(shorter.offset, 'three shots do not land where six do').not.toEqual(first.offset);
    expect(shorter.text.forward, 'and the reported aim differs with it').not.toEqual(first.text.forward);

    await expectNoErrors(game, 'recoil-determinism');
  });

  test('WP-016 difficulty A/B: a veteran hostile acquires an exposed player faster than a recruit one', async ({ page }) => {
    const game = await boot(page);

    // One measurement per difficulty on the same page: quickStart() re-deploys the mission, so the
    // roster and every hostile is rebuilt from the difficulty being tested.
    const measure = async (difficulty) => {
      await game.quickStart({ difficulty, god: true });
      await game.qa('teleport', 'lobby');
      await game.adv(700);
      const roster = (await game.state()).enemiesRemaining;
      // The rest of the roster is held still, one hostile at a time rather than through
      // mission.aiFrozen, which would freeze the subject too. Wave-2 hostiles shout contacts to
      // each other and discover bodies, so a live patrol — or a corpse, had the roster been shot
      // instead of frozen — would promote the subject for reasons that have nothing to do with its
      // own eyes, which is exactly what this test is trying to time.
      const id = await game.qa('spawnEnemy', 'trooper');
      await game.probe((eid) => {
        const m = window.__game.mission;
        for (const e of m.enemies) e.frozen = e.id !== eid;
        const e = m.enemies.find((x) => x.id === eid);
        e.yaw = Math.atan2(-(m.player.pos.x - e.pos.x), -(m.player.pos.z - e.pos.z));
        e.guardYaw = e.yaw;
      }, id);

      // Stand still in the open in front of it and time the promotion to combat.
      const run = await game.probe((eid) => {
        const m = window.__game.mission, p = m.player;
        const e = m.enemies.find((x) => x.id === eid);
        const at = { x: p.pos.x, y: p.pos.y, z: p.pos.z };
        const t0 = m.timer;
        const startDist = +e.pos.distanceTo(p.pos).toFixed(2);
        let seen = 0;
        for (let i = 0; i < 160; i++) {
          p.pos.set(at.x, at.y, at.z);
          p.vel.set(0, 0, 0);
          seen = Math.max(seen, e._seePlayer());
          window.advanceTime(50);
          if (e.state === 'combat') break;
        }
        return {
          combatAfterSec: e.state === 'combat' ? +(m.timer - t0).toFixed(2) : null,
          state: e.state,
          suspicion: +e.suspicion.toFixed(2),
          exposure: +seen.toFixed(2),
          startDist,
        };
      }, id);
      return { roster, ...run };
    };

    const recruit = await measure('recruit');
    const veteran = await measure('veteran');

    // eslint-disable-next-line no-console
    console.log(`WP-016 difficulty A/B: recruit ${recruit.combatAfterSec} s (roster ${recruit.roster}), `
      + `veteran ${veteran.combatAfterSec} s (roster ${veteran.roster}), `
      + `stand-off ${recruit.startDist}/${veteran.startDist} m`);

    expect(veteran.startDist, 'both tiers were timed from the same stand-off distance')
      .toBeCloseTo(recruit.startDist, 1);

    for (const [name, r] of [['recruit', recruit], ['veteran', veteran]]) {
      expect(r.exposure, `${name}: the player is visible to the hostile`).toBeGreaterThan(0);
      expect(r.state, `${name}: an exposed player is eventually engaged`).toBe('combat');
      expect(r.combatAfterSec, `${name}: acquisition is not instant`).toBeGreaterThan(0);
    }

    // The perception fuse is 1.5 x 1.35 on recruit against 0.7 x 0.85 on veteran, so veteran should
    // reach combat several times sooner. The assertion allows a wide margin: what matters is the
    // direction and that the two tiers are genuinely distinguishable, not the exact ratio.
    expect(veteran.combatAfterSec, 'veteran reacts faster than recruit')
      .toBeLessThan(recruit.combatAfterSec * 0.75);
    // enemyCount 0.7 against 1.25 gates the roster in src/map/layout.js.
    expect(veteran.roster, 'veteran fields more hostiles than recruit').toBeGreaterThan(recruit.roster);

    await expectNoErrors(game, 'difficulty-ab');
  });
});
