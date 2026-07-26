// AI evidence capture (Opus 3 domain, WP-015). Same harness shape as tools/capture.js, with
// scenarios that produce the behavioural evidence for docs/reports/wp-015.md:
//
//   cover-map        bake statistics + a sample of the extracted cover points
//   cover-fight      a hostile fighting from cover: screenshots + posture dump over time
//   pressure-cap     three hostiles on one target: two push, the rest hold an angle
//   corpse-chain     a patrol finds a body, escalates, investigates, searches
//   search-trace     positions over time while a hostile searches a lost contact
//   escort-underfire a hostage crouch-follows through the lobby fight into the garage
//   difficulty-ab    recruit vs veteran: time to detect, accuracy, pushers, search spots
//   ray-budget       per-hostile raycast + A*-request accounting during a building-wide fight
//   grenades         the glance at a thrown device, the blind stumble, smoke spoiling an angle
//   doors            the entry beat and patrols closing doors behind themselves
//
// Usage: SERVER=http://127.0.0.1:5286 node tools/capture-ai.js [scenario ...]
import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const SERVER = process.env.SERVER || 'http://127.0.0.1:5286';
const OUT = 'artifacts/ai';
fs.mkdirSync(OUT, { recursive: true });

// Other agents edit src/** while this runs, and a hot update to a module without an accept handler
// makes Vite reload the page, which destroys the execution context mid-scenario. Same stub as
// tests/helpers/game.js: module loading is untouched, only live reload is removed.
const VITE_CLIENT_STUB = `
export const createHotContext = () => ({
  on() {}, off() {}, send() {}, accept() {}, acceptExports() {}, dispose() {}, prune() {},
  invalidate() {}, decline() {}, data: {},
});
export const updateStyle = (id, css) => {
  let el = document.querySelector('style[data-vite-dev-id="' + id + '"]');
  if (!el) { el = document.createElement('style'); el.setAttribute('data-vite-dev-id', id); document.head.appendChild(el); }
  el.textContent = css;
};
export const removeStyle = (id) => {
  const el = document.querySelector('style[data-vite-dev-id="' + id + '"]');
  if (el) el.remove();
};
export const injectQuery = (url) => url;
export class ErrorOverlay extends HTMLElement {}
export default {};
`;

function makeHelpers(page, scenarioName, report) {
  const helpers = {
    page,
    async qa(method, ...args) {
      return page.evaluate(([m, a]) => window.__qa[m](...a), [method, args]);
    },
    async adv(ms) {
      return page.evaluate((v) => window.advanceTime(v), ms);
    },
    // Rendering is on demand: under SwiftShader a frame drawn as the only work in an event-loop
    // task costs seconds, and these scenarios step time hundreds of times. One real frame is drawn
    // immediately before each screenshot instead.
    // `detail` also writes a centred crop: a hostile 8 m away is only a few dozen pixels tall in
    // the full frame, and the posture is the whole point of these shots.
    async shot(name, detail = false) {
      await page.evaluate(() => {
        const g = window.__game;
        (g.__realRender || ((a) => g.render(a)))(1);
      });
      const file = path.join(OUT, `${scenarioName}--${name}.png`);
      await page.screenshot({ path: file, timeout: 240000 });
      report.shots.push(file);
      if (detail) {
        const crop = path.join(OUT, `${scenarioName}--${name}-detail.png`);
        await page.screenshot({
          path: crop, timeout: 240000,
          clip: { x: 660, y: 300, width: 600, height: 420 },
        });
        report.shots.push(crop);
      }
      return file;
    },
    // Spotter camera. A hostile 8 m down a corridor is a few dozen pixels tall from the player's
    // eye, and these scenarios are all about what its body is doing, so posture shots are framed
    // from a few metres away instead of from the muzzle.
    // Places the camera at an explicit point looking at another one. `__qa.camera` takes euler
    // angles, and the yaw convention is the player's: forward is -Z at yaw 0.
    async look(from, at, fov = 62) {
      await page.evaluate(([f, t, fv]) => {
        const dx = t[0] - f[0], dy = t[1] - f[1], dz = t[2] - f[2];
        const len = Math.hypot(dx, dy, dz) || 1;
        window.__qa.camera(f, (Math.atan2(-dx, -dz) * 180) / Math.PI, (Math.asin(dy / len) * 180) / Math.PI, fv);
        const vm = window.__game.mission.viewModel;
        if (vm) vm.root.visible = false;
      }, [from, at, fov]);
    },
    // A standable spot on the same floor with a clear view of `at`. An orbit camera at a fixed
    // radius happily ends up outside the building or inside a ceiling slab; the navmesh knows
    // where the interior is, so vantage points come from there. `bearing` (degrees, measured from
    // `at` towards the camera) picks which side to watch from — a cover shot has to be taken from
    // off the firing line or the obstacle hides its own occupant.
    async vantage(at, { min = 8, max = 14, eye = 1.7, bearing = null } = {}) {
      const pos = await page.evaluate(([t, lo, hi, ey, want]) => {
        const m = window.__game.mission;
        const mid = (lo + hi) / 2;
        // Glass stops movement but not sight, so a "clear view of the subject" happily selects a
        // spot out in the snow looking in through the curtain wall. Requiring the line to be
        // physically clear as well as visually clear keeps the camera in the same space as its
        // subject.
        const pick = (solid) => {
          let best = null, bestCost = Infinity;
          for (const n of m.nav.nodes) {
            if (Math.abs(n.y - t[1]) > 1.2) continue;
            const d = Math.hypot(n.x - t[0], n.z - t[2]);
            if (d < lo || d > hi) continue;
            let cost = Math.abs(d - mid) * 0.15;
            if (want != null) {
              const a = (Math.atan2(n.z - t[2], n.x - t[0]) * 180) / Math.PI;
              cost += Math.abs(((a - want + 540) % 360) - 180) / 30;
            } else cost -= d;
            if (cost >= bestCost) continue;
            const dx = t[0] - n.x, dy = t[1] + 1 - (n.y + ey), dz = t[2] - n.z;
            const len = Math.hypot(dx, dy, dz);
            const blocked = (c) => (solid ? (c.blockSight || c.blockMove) : c.blockSight)
              && c.tag !== 'enemy' && c.tag !== 'hostage' && c.tag !== 'door';
            if (m.world.raycast(n.x, n.y + ey, n.z, dx / len, dy / len, dz / len, len, blocked)) continue;
            best = [n.x, n.y + ey, n.z]; bestCost = cost;
          }
          return best;
        };
        // Falling back rather than failing: a framing from the far side of a railing still shows
        // the behaviour, and no scenario should die over a camera.
        return pick(true) || pick(false);
      }, [at, min, max, eye, bearing]);
      if (!pos) throw new Error('no vantage point with a view of ' + JSON.stringify(at));
      return pos;
    },
    // Frames one live body (hostile or hostage) from a navmesh vantage point.
    async spot(id, { min = 3.2, max = 6, fov = 58, swing = 40 } = {}) {
      const at = await page.evaluate((eid) => {
        const m = window.__game.mission;
        const e = m.enemies.find((x) => x.id === eid) || m.hostages.find((x) => x.id === eid);
        if (!e) return null;
        const a = (Math.atan2(m.player.pos.z - e.pos.z, m.player.pos.x - e.pos.x) * 180) / Math.PI;
        return { pos: [e.pos.x, e.pos.y, e.pos.z], toPlayer: a };
      }, id);
      if (!at) throw new Error('nobody with id ' + id + ' to spot');
      const from = await helpers.vantage(at.pos, { min, max, bearing: at.toPlayer + swing });
      await helpers.look(from, [at.pos[0], at.pos[1] + 0.2, at.pos[2]], fov);
      return at;
    },
    async watchOff() { await page.evaluate(() => window.__qa.cameraOff()); },
    async state() {
      return JSON.parse(await page.evaluate(() => window.render_game_to_text()));
    },
    // Teleports and makes sure the player ends up ON the floor. Several named checkpoints put the
    // capsule inside a column or on top of a desk (see docs/reports/wp-015.md), and a scenario that
    // measures distances from a player standing on furniture measures nothing.
    async standAt(name) {
      const res = await page.evaluate((nm) => {
        const m = window.__game.mission, p = m.player;
        window.__qa.teleport(nm);
        const want = p.pos.y - 0.05;
        const settle = (x, y, z) => {
          p.pos.set(x, y + 0.05, z);
          p.vel.set(0, 0, 0);
          window.advanceTime(400);
          return Math.abs(p.pos.y - y) < 0.3;
        };
        if (settle(p.pos.x, want, p.pos.z)) return { at: [p.pos.x, p.pos.y, p.pos.z], moved: 0 };
        const ox = p.pos.x, oz = p.pos.z;
        for (let ring = 1; ring <= 8; ring++) {
          for (let i = 0; i < 16; i++) {
            const a = (i / 16) * Math.PI * 2;
            const nn = m.nav.nearestNode(ox + Math.cos(a) * ring * 0.75, want, oz + Math.sin(a) * ring * 0.75);
            if (nn < 0) continue;
            const n = m.nav.nodes[nn];
            if (Math.abs(n.y - want) > 0.4) continue;
            if (settle(n.x, n.y, n.z)) {
              return { at: [p.pos.x, p.pos.y, p.pos.z], moved: +Math.hypot(n.x - ox, n.z - oz).toFixed(2) };
            }
          }
        }
        return { failed: 'could not find floor near ' + nm };
      }, name);
      if (res.failed) throw new Error(res.failed);
      if (res.moved) helpers.log(`'${name}' is not standable; moved ${res.moved} m to reach floor`);
      return res;
    },
    save(name, data) {
      const file = path.join(OUT, `${scenarioName}--${name}.json`);
      fs.writeFileSync(file, JSON.stringify(data, null, 1));
      report.data.push(file);
      return file;
    },
    async saveState(name) {
      const s = await helpers.state();
      helpers.save(name, s);
      return s;
    },
    async fireBurst(ms = 300) {
      await helpers.qa('mouse', 0, true);
      await helpers.adv(ms);
      await helpers.qa('mouse', 0, false);
    },
    log(...a) { console.log(`  [${scenarioName}]`, ...a); },
  };
  return helpers;
}

// ---------------------------------------------------------------------------
export const SCENARIOS = {
  // 1. The baked cover map: how many points, how they are distributed, what one looks like.
  async 'cover-map'(h) {
    await h.qa('quickStart', 'operator');
    await h.qa('freezeAI', true);
    const stats = await h.page.evaluate(() => {
      const nav = window.__game.mission.nav;
      const cm = nav.cover;
      const byFloor = { ground: 0, upper: 0 };
      let full = 0;
      for (let i = 0; i < cm.count; i++) {
        if (cm.full[i]) full++;
        if (cm.y[i] > 2.4) byFloor.upper++; else byFloor.ground++;
      }
      const sample = [];
      for (let i = 0; i < cm.count && sample.length < 12; i += Math.max(1, Math.floor(cm.count / 12))) {
        sample.push(cm.entry(i));
      }
      return {
        navNodes: nav.nodes.length,
        navBakeMs: +nav.navMs.toFixed(1),
        coverBakeMs: +cm.buildMs.toFixed(1),
        totalBakeMs: +nav.bakeMs.toFixed(1),
        obstaclesConsidered: cm.obstacles,
        coverPoints: cm.count,
        fullHeight: full,
        lowHeight: cm.count - full,
        byFloor,
        coarseCells: cm.grid.size,
        sample,
      };
    });
    h.log(`cover points: ${stats.coverPoints} (${stats.fullHeight} full / ${stats.lowHeight} low), `
      + `bake ${stats.coverBakeMs} ms on top of ${stats.navBakeMs} ms of nav`);
    h.save('stats', stats);
  },

  // 2. A hostile that has to fight from cover, watched over ~20 s of exchanged fire.
  //
  // The hostile is given an absurd health pool: the point of the scenario is the posture rhythm,
  // and a trooper that takes an honest magazine dies before it has tucked twice.
  async 'cover-fight'(h) {
    await h.qa('quickStart', 'operator');
    await h.qa('god', true);
    const setup = await h.page.evaluate(() => {
      const m = window.__game.mission, p = m.player;
      // Everybody else stands still so the trace is about one hostile.
      for (const e of m.enemies) e.frozen = true;

      // The geometry comes out of the cover map rather than a checkpoint: the named spots in the
      // cubicle field all land on a desk or inside a column (see docs/reports/wp-015.md). Take a
      // full-height cover point on the upper floor and stand the player on the far side of the
      // obstacle it belongs to, so the hostile has something real to fight from.
      const cm = m.nav.cover;
      const settle = (pos) => {
        p.pos.set(pos[0], pos[1] + 0.05, pos[2]);
        p.vel.set(0, 0, 0);
        window.advanceTime(400);
        return Math.abs(p.pos.y - pos[1]) < 0.35;
      };
      let anchor = -1, tries = 0;
      for (let i = 0; i < cm.count && anchor < 0; i++) {
        if (!cm.full[i] || Math.abs(cm.y[i] - 3.6) > 0.3) continue;
        if (cm.x[i] < 2 || cm.x[i] > 26 || cm.z[i] < 2 || cm.z[i] > 19) continue;   // the open office
        const stand = [cm.x[i] + cm.dirX[i] * 8.5, cm.y[i], cm.z[i] + cm.dirZ[i] * 8.5];
        const nn = m.nav.nearestNode(stand[0], stand[1], stand[2]);
        if (nn < 0) continue;
        const n = m.nav.nodes[nn];
        if (Math.hypot(n.x - stand[0], n.z - stand[2]) > 0.7 || Math.abs(n.y - stand[1]) > 0.3) continue;
        tries++;
        if (!settle([n.x, n.y, n.z])) continue;
        if (!cm.protects(i, p.pos.x, p.pos.z)) continue;
        anchor = i;
      }
      if (anchor < 0) return { failed: 'no usable cover geometry found in the open office', tries };

      // Spawn it at the lean-out position of that point: it can see the player from there, and it
      // still has to decide to step back behind the obstacle on its own.
      const spawn = [
        cm.x[anchor] + cm.latX[anchor] * cm.peek[anchor],
        cm.y[anchor],
        cm.z[anchor] + cm.latZ[anchor] * cm.peek[anchor],
      ];
      const eid = window.__qa.spawnEnemy('trooper', spawn);
      const e = m.enemies.find((x) => x.id === eid);
      e.frozen = false;
      e.hp = 1e7;                     // survive the whole exchange
      e.yaw = Math.atan2(-(p.pos.x - e.pos.x), -(p.pos.z - e.pos.z));
      e.guardYaw = e.yaw;
      e.lastKnown = p.pos.clone();
      e._enterCombat(false);
      // Point the player at its chest so the bursts land on and around the cover.
      window.__cf = {
        eid,
        aim() {
          const q = m.enemies.find((x) => x.id === eid);
          const dx = q.pos.x - p.pos.x, dz = q.pos.z - p.pos.z;
          p.yaw = Math.atan2(-dx, -dz);
          p.pitch = Math.atan2(q.pos.y + 1.25 - p.eyeY, Math.hypot(dx, dz));
        },
        sample() {
          const q = m.enemies.find((x) => x.id === eid);
          return {
            t: +m.timer.toFixed(2), state: q.state, role: q.role,
            cover: q.cover, coverKind: q.cover >= 0 ? (cm.full[q.cover] ? 'full' : 'low') : 'none',
            inCover: q.inCover, tucked: q.tucked, peeking: q.peeking,
            suppress: +q.suppress.toFixed(2), mag: q.mag, reloading: q.reloadT > 0, rays: q.rays,
            pos: [+q.pos.x.toFixed(2), +q.pos.y.toFixed(2), +q.pos.z.toFixed(2)],
            coverPos: q.cover >= 0 ? [+q.coverPos.x.toFixed(2), +q.coverPos.z.toFixed(2)] : null,
            peekPos: q.cover >= 0 ? [+q.coverPeek.x.toFixed(2), +q.coverPeek.z.toFixed(2)] : null,
            playerHp: Math.round(m.player.health),
          };
        },
        stops: {
          inCover: (s) => s.inCover,
          tucked: (s) => s.inCover && s.tucked,
          leaning: (s) => s.inCover && !s.tucked && s.cover >= 0,
        },
        // Steps the sim in 100 ms chunks, keeping the player on target and the trigger down in
        // bursts, until `stop` matches or the time runs out. Returns the samples it collected.
        run(seconds, stop) {
          const want = stop ? this.stops[stop] : null;
          const out = [];
          const chunks = Math.round(seconds * 10);
          for (let i = 0; i < chunks; i++) {
            this.aim();
            window.__qa.mouse(0, i % 6 < 2);      // 200 ms on, 400 ms off
            window.advanceTime(100);
            const s = this.sample();
            out.push(s);
            if (want && want(s)) { window.__qa.mouse(0, false); return { samples: out, matched: true }; }
          }
          window.__qa.mouse(0, false);
          return { samples: out, matched: false };
        },
      };
      return {
        eid,
        player: [+p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)],
        anchorCoverPoint: cm.entry(anchor),
        spawnedAt: [+e.pos.x.toFixed(2), +e.pos.y.toFixed(2), +e.pos.z.toFixed(2)],
        distance: +Math.hypot(e.pos.x - p.pos.x, e.pos.z - p.pos.z).toFixed(2),
      };
    });
    if (setup.failed) throw new Error(setup.failed + ' (' + setup.tries + ' candidates settled)');
    h.log('player at', JSON.stringify(setup.player), '- hostile at', JSON.stringify(setup.spawnedAt),
      `(${setup.distance} m apart, anchored on cover point ${setup.anchorCoverPoint.index})`);

    const trace = [];
    const leg = (seconds, stop) => h.page.evaluate(
      ([s, k]) => window.__cf.run(s, k), [seconds, stop]);

    // 1) settle into cover, 2) catch it tucked, 3) catch it leaning out, 4) let it run on.
    let r = await leg(4, 'inCover');
    trace.push(...r.samples);
    h.log('reached cover after', r.samples.length / 10, 's:', r.matched);
    r = await leg(6, 'tucked');
    trace.push(...r.samples);
    if (r.matched) {
      await h.spot(setup.eid, { min: 3.5, max: 6.5, swing: 68 });
      await h.shot('tucked');
    }
    r = await leg(6, 'leaning');
    trace.push(...r.samples);
    if (r.matched) {
      await h.spot(setup.eid, { min: 3.5, max: 6.5, swing: 68 });
      await h.shot('leaning-out');
    }
    r = await leg(10, null);
    trace.push(...r.samples);
    await h.watchOff();
    await h.shot('fight', true);        // back to the player's eye: this is what the fight looks like

    h.save('trace', { setup, samples: trace });
    const inCover = trace.filter((s) => s.inCover).length;
    const tucked = trace.filter((s) => s.tucked).length;
    h.log(`posture: ${trace.map((s) => (s.inCover ? (s.tucked ? 'T' : 'P') : '.')).join('')}`);
    h.log(`in cover ${inCover}/${trace.length} samples (${tucked} of them tucked), `
      + `cover kinds used: ${[...new Set(trace.filter((s) => s.cover >= 0).map((s) => s.coverKind))].join(',') || 'none'}, `
      + `suppression peaked at ${Math.max(...trace.map((s) => s.suppress))}`);
  },

  // 3. Pressure cap: more hostiles than push tokens, so the extras hold angles.
  async 'pressure-cap'(h) {
    await h.qa('quickStart', 'operator');
    await h.qa('god', true);
    // The mezzanine gallery: the only interior big enough to put five hostiles on sightlines to the
    // same target without them standing on top of each other.
    await h.standAt('mezz-south');
    const ids = await h.page.evaluate(() => {
      const m = window.__game.mission, p = m.player;
      // Freeze the room first so only the scripted group is engaged. (Killing them instead would
      // leave four bodies in the lobby and the corpse-discovery chain would run on top of this.)
      for (const e of m.enemies) e.frozen = true;
      const eye = { x: p.pos.x, y: p.eyeY, z: p.pos.z };
      const out = [];
      // Ring the player, but only where a hostile can stand AND see him: one that loses contact
      // drops out of combat and out of the token pool, which is a different test.
      // The lobby is only a few metres across, so the ring stays tight — but never inside 4.5 m,
      // where squad.js forces a push regardless of the token budget (knife range overrides it).
      const taken = [];
      for (let ri = 0; ri < 8 && out.length < 5; ri++) {
        const radius = 4.6 + ri * 0.45;
        for (let i = 0; i < 24 && out.length < 5; i++) {
          const a = (i / 24) * Math.PI * 2;
          const at = [p.pos.x + Math.cos(a) * radius, p.pos.y, p.pos.z + Math.sin(a) * radius];
          const nn = m.nav.nearestNode(at[0], at[1], at[2]);
          if (nn < 0) continue;
          const n = m.nav.nodes[nn];
          if (Math.hypot(n.x - at[0], n.z - at[2]) > 1.0 || Math.abs(n.y - p.pos.y) > 0.4) continue;
          if (taken.some((t) => Math.hypot(t[0] - n.x, t[1] - n.z) < 2.2)) continue;   // spread them out
          const dx = eye.x - n.x, dy = eye.y - (n.y + 1.6), dz = eye.z - n.z;
          const len = Math.hypot(dx, dy, dz);
          if (m.world.raycast(n.x, n.y + 1.6, n.z, dx / len, dy / len, dz / len, len,
            (c) => c.blockSight && c.tag !== 'enemy')) continue;
          const id = window.__qa.spawnEnemy('trooper', [n.x, n.y, n.z]);
          const e = m.enemies.find((x) => x.id === id);
          e.frozen = false;
          e.hp = 1e7;                  // the cap is the subject, not the gunfight
          e.yaw = Math.atan2(-(p.pos.x - e.pos.x), -(p.pos.z - e.pos.z));
          e.lastKnown = p.pos.clone();
          e._enterCombat(false);
          taken.push([n.x, n.z]);
          out.push(id);
        }
      }
      return out;
    });
    h.log('engaged hostiles:', ids.length);
    const dump = [];
    for (let i = 0; i < 10; i++) {
      await h.adv(800);
      dump.push(await h.page.evaluate((eids) => {
        const m = window.__game.mission;
        const hostiles = eids.map((id) => {
          const e = m.enemies.find((x) => x.id === id);
          if (!e) return null;
          return {
            id, role: e.role, state: e.state,
            dist: +e.pos.distanceTo(m.player.pos).toFixed(2),
            bearing: Math.round(Math.atan2(e.pos.z - m.player.pos.z, e.pos.x - m.player.pos.x) * 57.3),
            flank: e.flankBearing == null ? null : Math.round(e.flankBearing * 57.3),
            cover: e.cover >= 0, tucked: e.tucked,
          };
        }).filter(Boolean);
        // Only hostiles actually in contact hold a token; the rest are not in the pool at all.
        const engaged = hostiles.filter((x) => x.state === 'combat');
        return {
          t: +m.timer.toFixed(2),
          maxPushers: m.difficulty.ai.maxPushers,
          engaged: engaged.length,
          pushers: engaged.filter((x) => x.role === 'push').length,
          holders: engaged.filter((x) => x.role === 'hold').length,
          hostiles,
        };
      }, ids));
    }
    // The ring is 20 m across, so no interior camera holds all five. The frame is put on the two
    // hostiles holding push tokens — the pair closing while the rest sit on their angles is the
    // part of the cap that reads visually; tokens.json carries the whole group.
    const centre = await h.page.evaluate((eids) => {
      const m = window.__game.mission;
      const pts = eids.map((id) => m.enemies.find((x) => x.id === id)).filter((e) => e && e.role === 'push');
      const use = pts.length ? pts.map((e) => e.pos) : [m.player.pos];
      const c = use.reduce((a, p) => [a[0] + p.x, a[1] + p.y, a[2] + p.z], [0, 0, 0]);
      return c.map((v) => v / use.length);
    }, ids);
    await h.look(await h.vantage(centre, { min: 5, max: 8 }), centre, 86);
    await h.shot('pressure');
    await h.watchOff();
    h.save('tokens', dump);
    const last = dump[dump.length - 1];
    h.log('roles:', last.hostiles.map((x) => `${x.id.slice(-6)}:${x.role}@${x.dist}m/${x.state}`).join('  '));
    h.log(`cap ${last.maxPushers}: of ${last.engaged} engaged, ${last.pushers} push and ${last.holders} hold`);
    const breaches = dump.filter((d) => d.pushers > d.maxPushers);
    h.log('samples over the cap:', breaches.length);
    h.log('holder bearings:', JSON.stringify(dump.map((d) => d.hostiles.filter((x) => x.role === 'hold').map((x) => x.flank))));
  },

  // 4. Corpse discovery: a patrol walks into a body and escalates.
  async 'corpse-chain'(h) {
    await h.qa('quickStart', 'operator');
    await h.qa('god', true);
    const setup = await h.page.evaluate(() => {
      const m = window.__game.mission;
      // Kill a lobby patrol quietly, then park one of its neighbours where it can see the body.
      const victim = m.enemies.find((e) => e.id === 'e-lobby-1') || m.enemies[0];
      const witness = m.enemies.find((e) => e.alive && e !== victim && Math.abs(e.pos.y - victim.pos.y) < 1);
      victim.hp = 1;
      victim.damage(9999, null, 'setup');
      // Stand the witness about 7 m off with a clear view of the body — on a real nav node, or it
      // spends the scenario wedged in a planter instead of walking over to look.
      const body = victim.pos;
      let stand = null;
      for (let ri = 0; ri < 6 && !stand; ri++) {
        const radius = 7 - ri * 0.6;
        for (let i = 0; i < 24 && !stand; i++) {
          const a = (i / 24) * Math.PI * 2;
          const nn = m.nav.nearestNode(body.x + Math.cos(a) * radius, body.y, body.z + Math.sin(a) * radius);
          if (nn < 0) continue;
          const n = m.nav.nodes[nn];
          if (Math.abs(n.y - body.y) > 0.4) continue;
          const d = Math.hypot(n.x - body.x, n.z - body.z);
          if (d < 4.5 || d > 9) continue;
          const dx = body.x - n.x, dy = body.y + 0.35 - (n.y + 1.6), dz = body.z - n.z;
          const len = Math.hypot(dx, dy, dz);
          if (m.world.raycast(n.x, n.y + 1.6, n.z, dx / len, dy / len, dz / len, len,
            (c) => c.blockSight && c.tag !== 'enemy')) continue;
          // A nav node clears a 0.24 m radius but a body needs 0.37, so plenty of nodes next to
          // furniture push the occupant up onto it. Only keep a spot it actually settles on.
          witness.pos.set(n.x, n.y, n.z);
          witness.state = 'guard';
          window.advanceTime(400);
          if (Math.abs(witness.pos.y - n.y) > 0.3) continue;
          stand = [n.x, n.y, n.z];
        }
      }
      if (!stand) return { failed: 'nowhere with a clear view of the body' };
      witness.pos.set(stand[0], stand[1], stand[2]);
      witness.yaw = Math.atan2(-(body.x - witness.pos.x), -(body.z - witness.pos.z));
      witness.state = 'patrol';
      witness.patrol = [[stand[0], stand[1], stand[2]]];
      witness.suspicion = 0;
      witness.knownBodies.clear();
      window.__qa.teleport('janitor');
      return {
        victim: victim.id, witness: witness.id,
        witnessAt: stand.map((v) => +v.toFixed(2)),
        body: [+victim.pos.x.toFixed(1), +victim.pos.y.toFixed(1), +victim.pos.z.toFixed(1)],
      };
    });
    if (setup.failed) throw new Error(setup.failed);
    h.log('victim', setup.victim, 'witness', setup.witness,
      `at ${JSON.stringify(setup.witnessAt)}, body at ${JSON.stringify(setup.body)}`);
    const trace = [];
    const shot = new Set();
    for (let i = 0; i < 45; i++) {
      const s = await h.page.evaluate((wid) => {
        const m = window.__game.mission;
        const e = m.enemies.find((x) => x.id === wid);
        window.advanceTime(1000);
        return {
          t: +m.timer.toFixed(2), state: e.state, suspicion: +e.suspicion.toFixed(2),
          knownBodies: [...e.knownBodies], wary: +e.wary.toFixed(0),
          searchQueue: e.searchQueue.length,
          pos: [+e.pos.x.toFixed(2), +e.pos.z.toFixed(2)],
        };
      }, setup.witness);
      trace.push(s);
      // One frame per stage of the escalation, taken as it happens. Framed on the midpoint of the
      // pair so the body and the hostile reacting to it are both in the picture.
      if ((s.state === 'investigate' || s.state === 'search') && !shot.has(s.state)) {
        const mid = await h.page.evaluate(([a, b]) => {
          const m = window.__game.mission;
          const p = m.enemies.find((x) => x.id === a), q = m.enemies.find((x) => x.id === b);
          return [(p.pos.x + q.pos.x) / 2, Math.min(p.pos.y, q.pos.y), (p.pos.z + q.pos.z) / 2];
        }, [setup.victim, setup.witness]);
        await h.look(await h.vantage(mid, { min: 4.5, max: 8 }), mid, 78);
        await h.shot(s.state === 'investigate' ? 'found-body' : 'searching');
        shot.add(s.state);
      }
    }
    await h.watchOff();
    // The body position travels with the samples: the closest-approach number in the report is only
    // checkable against the artifact if the thing being approached is in it.
    h.save('trace', { setup, samples: trace });
    const chain = trace.filter((s, i) => i === 0 || s.state !== trace[i - 1].state);
    h.log('state chain:', chain.map((s) => `${s.t}s ${s.state}`).join(' -> '));
    h.log('reached the body:',
      Math.min(...trace.map((s) => Math.hypot(s.pos[0] - setup.body[0], s.pos[1] - setup.body[2]))).toFixed(2), 'm at closest');
    h.log('remembered bodies at the end:', JSON.stringify(trace[trace.length - 1].knownBodies),
      '- wary for', trace[trace.length - 1].wary, 's more');
  },

  // 5. Search pattern: positions over time after the contact is broken.
  async 'search-trace'(h) {
    await h.qa('quickStart', 'operator');
    await h.qa('god', true);
    await h.standAt('lobby');
    await h.adv(700);
    const id = await h.page.evaluate(() => {
      const m = window.__game.mission, p = m.player;
      // The rest of the building stands still. Otherwise the hostiles upstairs pick the player up
      // when he vanishes there, and their shouts and gunfire keep calling the subject away from its
      // own search — correct behaviour, but it is information propagation evidence, not this.
      for (const e of m.enemies) e.frozen = true;
      const f = p.forwardVec();
      const nn = m.nav.nearestNode(p.pos.x + f.x * 6, p.pos.y, p.pos.z + f.z * 6);
      if (nn < 0) return null;
      const n = m.nav.nodes[nn];
      const id = window.__qa.spawnEnemy('trooper', [n.x, n.y, n.z]);
      const e = m.enemies.find((x) => x.id === id);
      e.frozen = false;
      e.yaw = Math.atan2(-(p.pos.x - e.pos.x), -(p.pos.z - e.pos.z));
      e.guardYaw = e.yaw;
      return id;
    });
    if (!id) throw new Error('no floor 6 m in front of the lobby checkpoint');
    await h.adv(3000);
    const engaged = await h.page.evaluate((eid) => {
      const e = window.__game.mission.enemies.find((x) => x.id === eid);
      return { state: e.state, lastKnown: [+e.lastKnown.x.toFixed(1), +e.lastKnown.z.toFixed(1)] };
    }, id);
    h.log('engaged:', JSON.stringify(engaged));
    // Vanish upstairs. Everything after this is the search.
    await h.qa('teleport', 'conference');
    const trace = [];
    let shotCrouch = false, shotSearch = false;
    // Stepped from here in 500 ms slices so a crouch check — about a second long — can be caught
    // while it is happening rather than reconstructed from the trace afterwards.
    for (let i = 0; i < 110; i++) {               // 55 s: long enough to see it give up and go wary
      const s = await h.page.evaluate((eid) => {
        const m = window.__game.mission;
        const e = m.enemies.find((x) => x.id === eid);
        window.advanceTime(500);
        const spot = e.searchQueue[0];
        return {
          t: +m.timer.toFixed(2), state: e.state,
          pos: [+e.pos.x.toFixed(2), +e.pos.z.toFixed(2)],
          yaw: Math.round(e.yaw * 57.3),
          queue: e.searchQueue.length, pause: +e.searchPause.toFixed(2),
          stall: +e.searchStallT.toFixed(2),
          spot: spot ? [+spot.x.toFixed(2), +spot.z.toFixed(2)] : null,
          toSpot: spot ? +e.pos.distanceTo(spot).toFixed(2) : null,
          fromCover: !!e.searchCover[0],
          crouch: e.crouchCheckT > 0, wary: +e.wary.toFixed(0), hunting: e.hunting,
        };
      }, id);
      trace.push(s);
      if (!shotSearch && s.state === 'search' && s.queue > 0) {
        await h.spot(id, { min: 3.4, max: 7 });
        await h.shot('searching');
        shotSearch = true;
      }
      if (!shotCrouch && s.crouch) {
        await h.spot(id, { min: 3.4, max: 7 });
        await h.shot('crouch-check');
        shotCrouch = true;
      }
    }
    await h.watchOff();
    h.save('trace', { lastKnown: engaged.lastKnown, samples: trace });
    const visited = trace.filter((s, i) => i === 0 || s.state !== trace[i - 1].state);
    h.log('state chain:', visited.map((s) => `${s.t}s ${s.state}`).join(' -> '));
    const travelled = trace.reduce((a, s, i) => a + (i ? Math.hypot(s.pos[0] - trace[i - 1].pos[0], s.pos[1] - trace[i - 1].pos[1]) : 0), 0);
    h.log(`search spots queued: ${Math.max(...trace.map((s) => s.queue))}, `
      + `${trace.filter((s) => s.crouch).length} crouch-check samples, `
      + `${+travelled.toFixed(1)} m walked, wary at the end: ${trace[trace.length - 1].wary} s`);
  },

  // 6. Escort under fire: hostage crouch-follows through the lobby fight to the garage.
  async 'escort-underfire'(h) {
    await h.qa('quickStart', 'operator');
    await h.qa('god', true);
    await h.page.evaluate(() => {
      const m = window.__game.mission;
      for (const hh of m.hostages) { hh.discovered = true; if (hh.state === 'captive') hh.interact(); }
    });
    await h.standAt('lobby');
    await h.page.evaluate(() => {
      const m = window.__game.mission, p = m.player;
      for (const hh of m.hostages) hh.pos.set(p.pos.x + 1.2, p.pos.y, p.pos.z + 1.2);
    });
    await h.adv(600);
    const trace = [];
    const probe = (label) => h.page.evaluate((lbl) => {
      const m = window.__game.mission;
      return {
        label: lbl, t: +m.timer.toFixed(2),
        fighting: m.enemies.filter((e) => e.alive && e.state === 'combat').length,
        hostages: m.hostages.map((x) => ({
          id: x.id, state: x.state, crouched: !!x.crouched,
          danger: +x.dangerT.toFixed(1), frozen: +x.freezeT.toFixed(2),
          dist: +x.pos.distanceTo(m.player.pos).toFixed(2),
          pos: [+x.pos.x.toFixed(2), +x.pos.y.toFixed(2), +x.pos.z.toFixed(2)],
        })),
      };
    }, label);

    // Start a fight in the lobby, then walk the route with the hostages in tow.
    await h.fireBurst(500);
    await h.adv(2500);
    trace.push(await probe('lobby-fight'));
    await h.shot('lobby-fight');
    let crouchSeen = trace[0].hostages.some((x) => x.crouched);
    let frozenSeen = false;
    let shotCrouch = false;
    const route = [['lobby', 3], ['sec', 6], ['sc-mid', 7], ['sc-west', 7], ['garage', 12]];
    for (const [wp, sec] of route) {
      await h.standAt(wp);
      for (let i = 0; i < sec; i++) {
        await h.adv(1000);
        const s = await probe(wp);
        if (s.hostages.some((x) => x.crouched)) crouchSeen = true;
        if (s.hostages.some((x) => x.frozen > 0)) frozenSeen = true;
        if (i === sec - 1) trace.push(s);
        // The posture shot has to be taken while the hostage is actually down and moving.
        const down = s.hostages.find((x) => x.crouched && x.state === 'following');
        if (!shotCrouch && down) {
          await h.spot(down.id, { min: 3, max: 6 });
          await h.shot('crouch-follow');
          await h.watchOff();
          shotCrouch = true;
        }
      }
    }
    await h.adv(8000);
    trace.push(await probe('garage'));
    await h.shot('garage');
    const s = await h.saveState('final');
    h.save('trace', { crouchSeen, frozenSeen, samples: trace });
    h.log('crouch-follow observed:', crouchSeen, ' flinch observed:', frozenSeen);
    h.log('final hostage states:', JSON.stringify(s.hostages.map((x) => x.state + '@' + x.pos)));
    h.log('objectives:', JSON.stringify(s.objectives.map((o) => o.id + ':' + o.state)));
  },

  // 7. Difficulty A/B: identical setup on recruit and veteran.
  async 'difficulty-ab'(h) {
    const results = {};
    for (const diff of ['recruit', 'operator', 'veteran']) {
      await h.qa('quickStart', diff);
      await h.qa('god', true);
      await h.standAt('lobby');
      await h.adv(700);
      const r = await h.page.evaluate(async (d) => {
        const m = window.__game.mission, p = m.player;
        const f = p.forwardVec();
        // One hostile, fixed geometry, facing the player: measure how long it takes to engage.
        // The rest of the roster is frozen, or the lobby patrols answer the shout and their rounds
        // land in the same damage total.
        for (const e of m.enemies) e.frozen = true;
        const id = window.__qa.spawnEnemy('trooper', [p.pos.x + f.x * 9, p.pos.y, p.pos.z + f.z * 9]);
        const e = m.enemies.find((x) => x.id === id);
        e.frozen = false;
        e.yaw = Math.atan2(-(p.pos.x - e.pos.x), -(p.pos.z - e.pos.z));
        e.guardYaw = e.yaw;
        const t0 = m.timer;
        let detect = null, engage = null;
        for (let i = 0; i < 120 && engage == null; i++) {
          window.advanceTime(50);
          if (detect == null && e.suspicion > 0.42) detect = +(m.timer - t0).toFixed(2);
          if (e.state === 'combat') engage = +(m.timer - t0).toFixed(2);
        }
        // Now let it shoot at a pinned player for 12 s and count what lands.
        p.godMode = false;
        p.health = 1e6; p.armor = 0;
        const hp0 = p.health;
        const shots0 = e.mag;
        let reloads = 0;
        const magSize = e.mag;
        let prevMag = e.mag;
        const posture = { tucked: 0, peeking: 0, inCover: 0, samples: 0 };
        for (let i = 0; i < 120; i++) {
          window.advanceTime(100);
          p.pos.set(p.pos.x, p.pos.y, p.pos.z);
          p.vel.set(0, 0, 0);
          if (e.mag > prevMag) reloads++;
          prevMag = e.mag;
          posture.samples++;
          if (e.inCover) posture.inCover++;
          if (e.tucked) posture.tucked++; else if (e.state === 'combat') posture.peeking++;
        }
        const fired = shots0 - e.mag + reloads * magSize;
        const damage = hp0 - p.health;
        p.godMode = true;
        p.health = 100;
        return {
          difficulty: d,
          hostiles: m.enemies.length,
          detectSec: detect, engageSec: engage,
          reactionScalar: m.difficulty.enemyReaction,
          suspicionFuse: m.difficulty.ai.suspicionFuse,
          maxPushers: m.difficulty.ai.maxPushers,
          searchSpots: m.difficulty.ai.searchSpots,
          shoutRadius: m.difficulty.ai.shoutRadius,
          corpseRadius: m.difficulty.ai.corpseRadius,
          roundsFired: fired,
          damageDealt: +damage.toFixed(1),
          damagePerRound: fired ? +(damage / fired).toFixed(2) : 0,
          posture,
        };
      }, diff);
      results[diff] = r;
      h.log(`${diff}: engage ${r.engageSec}s, ${r.roundsFired} rounds -> ${r.damageDealt} dmg `
        + `(${r.damagePerRound}/round), pushers ${r.maxPushers}, `
        + `tucked ${r.posture.tucked}/${r.posture.samples}`);
    }
    h.save('ab', results);
  },

  // 8. Perf accounting: raycasts per hostile per step and A* requests during a full alarm.
  async 'ray-budget'(h) {
    await h.qa('quickStart', 'operator');
    await h.qa('god', true);
    const stats = await h.page.evaluate(() => {
      const m = window.__game.mission;
      window.__qa.teleport('cubes-west');
      const target = m.player.pos.clone();
      for (const e of m.enemies) {
        if (!e.alive) continue;
        e.lastKnown = target.clone();
        e._enterCombat(false);
      }
      window.advanceTime(2000);

      // Count raycasts by wrapping the world, and A* requests by wrapping findPath.
      const realRay = m.world.raycast.bind(m.world);
      const realFind = m.findPath.bind(m);
      let rays = 0, paths = 0;
      m.world.raycast = (...a) => { rays++; return realRay(...a); };
      m.findPath = (...a) => { paths++; return realFind(...a); };
      const worst = new Map();
      const seconds = 4;
      const stepsPerSample = 12;
      let steps = 0;
      const t0 = performance.now();
      for (let i = 0; i < (seconds * 120) / stepsPerSample; i++) {
        window.advanceTime((1000 / 120) * stepsPerSample);
        steps += stepsPerSample;
        for (const e of m.enemies) {
          if (!e.alive) continue;
          worst.set(e.id, Math.max(worst.get(e.id) || 0, e.rays));
        }
      }
      const wall = performance.now() - t0;
      m.world.raycast = realRay;
      m.findPath = realFind;
      const live = m.enemies.filter((e) => e.alive).length;
      let over = [];
      for (const [id, r] of worst) if (r > 2) over.push({ id, rays: r });
      return {
        liveHostiles: live, steps,
        raysTotal: rays,
        raysPerHostilePerStep: +(rays / live / steps).toFixed(3),
        worstObservedRaysInAStep: Math.max(...worst.values()),
        hostilesOverBudget: over,
        pathRequests: paths,
        pathsPerHostilePerSec: +(paths / live / seconds).toFixed(2),
        simMsPerStep: +(wall / steps).toFixed(3),
      };
    });
    h.log(`rays ${stats.raysPerHostilePerStep}/hostile/step (worst single step ${stats.worstObservedRaysInAStep}), `
      + `A* ${stats.pathsPerHostilePerSec}/hostile/s, sim ${stats.simMsPerStep} ms/step`);
    h.save('perf', stats);
  },

  // 9. Grenade reactions: the glance at a device skittering past, the blind stumble away from a
  //    flash, and a smoke cloud on the firing line making a hostile give up its cover.
  async 'grenades'(h) {
    await h.qa('quickStart', 'operator');
    await h.qa('god', true);
    await h.standAt('mezz-south');
    const setup = await h.page.evaluate(() => {
      const m = window.__game.mission, p = m.player;
      for (const e of m.enemies) e.frozen = true;
      const f = p.forwardVec();
      const at = [p.pos.x + f.x * 8, p.pos.y, p.pos.z + f.z * 8];
      const nn = m.nav.nearestNode(at[0], at[1], at[2]);
      if (nn < 0) return { failed: 'no floor 8 m ahead' };
      const n = m.nav.nodes[nn];
      const eid = window.__qa.spawnEnemy('trooper', [n.x, n.y, n.z]);
      const e = m.enemies.find((x) => x.id === eid);
      e.frozen = false;
      e.hp = 1e7;
      // Looking away, so a glance towards the device is measurable as a change in facing.
      e.yaw = Math.atan2(-(p.pos.x - e.pos.x), -(p.pos.z - e.pos.z)) + Math.PI;
      e.guardYaw = e.yaw;
      e.state = 'guard';

      // Throws the selected device on the real code path, then parks it next to the hostile so the
      // reaction is measured against a known geometry instead of against a ballistic arc.
      window.__gr = {
        eid,
        place(slot, offset) {
          window.__qa.selectSlot(slot);
          window.advanceTime(600);
          window.__qa.mouse(0, true);
          window.advanceTime(120);
          window.__qa.mouse(0, false);
          for (let i = 0; i < 40 && !m.projectiles.length; i++) window.advanceTime(50);
          const pr = m.projectiles[0];
          if (!pr) return null;
          const q = m.enemies.find((x) => x.id === eid);
          pr.pos.set(q.pos.x + offset[0], q.pos.y + 0.1, q.pos.z + offset[1]);
          pr.vel.set(0, 0, 0);
          pr.mesh.position.copy(pr.pos);
          return { def: pr.def.id, fuse: +pr.fuse.toFixed(2) };
        },
        sample() {
          const q = m.enemies.find((x) => x.id === eid);
          return {
            t: +m.timer.toFixed(2), state: q.state,
            yaw: Math.round(q.yaw * 57.3), glance: +q.glanceT.toFixed(2),
            flash: +q.flashT.toFixed(2), stumble: +q.stumbleT.toFixed(2),
            suspicion: +q.suspicion.toFixed(2), cover: q.cover, tucked: q.tucked,
            pos: [+q.pos.x.toFixed(2), +q.pos.z.toFixed(2)],
            devices: m.projectiles.length,
          };
        },
        run(seconds) {
          const out = [];
          for (let i = 0; i < seconds * 10; i++) { window.advanceTime(100); out.push(this.sample()); }
          return out;
        },
      };
      return { eid, hostile: [+n.x.toFixed(2), +n.y.toFixed(2), +n.z.toFixed(2)] };
    });
    if (setup.failed) throw new Error(setup.failed);

    // --- a device bounces past: a glance, no state change -------------------
    const bounce = await h.page.evaluate(() => {
      const g = window.__gr;
      const before = g.sample();
      const dev = g.place(5, [1.6, 1.6]);            // smoke canister, unfused, 2.3 m away
      const after = g.run(1.2);
      return { dev, before, after };
    });
    const glanced = bounce.after.filter((s) => s.glance > 0).length;
    const turned = Math.abs(((bounce.after[bounce.after.length - 1].yaw - bounce.before.yaw) + 540) % 360 - 180);
    h.log(`device ${bounce.dev && bounce.dev.def}: glance samples ${glanced}, `
      + `turned ${turned}° towards it, state ${bounce.before.state} -> ${bounce.after[bounce.after.length - 1].state}`);
    await h.spot(setup.eid, { min: 3, max: 5.5 });
    await h.shot('glance');

    // --- the smoke goes off on the firing line ------------------------------
    const smoke = await h.page.evaluate(() => {
      const m = window.__game.mission, g = window.__gr;
      const q = m.enemies.find((x) => x.id === g.eid);
      q.lastKnown = m.player.pos.clone();
      q._enterCombat(false);
      const settle = g.run(3);                        // let it pick cover and start the rhythm
      const coverBefore = q.cover;
      const smoked = g.run(4);                        // the canister from the first phase pops here
      return { coverBefore, coverAfter: q.cover, settle, smoked };
    });
    h.log(`smoke on the angle: cover ${smoke.coverBefore} -> ${smoke.coverAfter}`
      + (smoke.coverBefore !== smoke.coverAfter ? ' (moved)' : ' (held)'));
    await h.spot(setup.eid, { min: 3.5, max: 7 });
    await h.shot('smoke');

    // --- flashbang: blind, cower, stumble away ------------------------------
    const burst = await h.page.evaluate(() => {
      const g = window.__gr;
      const dev = g.place(4, [1.2, 0.8]);             // dazzler, close enough to blind it
      return { dev, during: g.run(0.6) };             // stops mid-stumble for the shot
    });
    await h.spot(setup.eid, { min: 3, max: 5.5 });
    await h.shot('flashed');
    await h.watchOff();
    const flash = await h.page.evaluate((b) => ({
      dev: b.dev, during: b.during.concat(window.__gr.run(3.4)),
    }), burst);
    const blind = flash.during.filter((s) => s.flash > 0);
    const stumbling = flash.during.filter((s) => s.stumble > 0);
    const moved = blind.length
      ? Math.hypot(blind[blind.length - 1].pos[0] - blind[0].pos[0], blind[blind.length - 1].pos[1] - blind[0].pos[1])
      : 0;
    // The blind timer outlasts the capture window, so the peak and the remainder say more than the
    // number of samples that happened to catch it.
    h.log(`flash: blind timer peaked at ${Math.max(0, ...blind.map((s) => s.flash)).toFixed(2)} s with `
      + `${(blind.length ? blind[blind.length - 1].flash : 0).toFixed(2)} s still left at the end of the trace, `
      + `stumbled for ${(stumbling.length / 10).toFixed(1)} s, moved ${moved.toFixed(2)} m away from the burst`);
    await h.spot(setup.eid, { min: 3, max: 5.5 });
    await h.shot('blinded');            // still blind, no longer stumbling: the cower it settles into
    await h.watchOff();
    h.save('trace', { setup, bounce, smoke, flash });
  },

  // 10. Door tactics: the entry beat and patrols closing doors behind themselves.
  async 'doors'(h) {
    await h.qa('quickStart', 'operator');
    await h.qa('god', true);
    await h.qa('teleport', 'janitor');
    const trace = await h.page.evaluate(() => {
      const m = window.__game.mission;
      // Drive one hostile at a closed door from a few metres out and watch the beat.
      const door = m.map.doors.find((d) => d.kind !== 'shutter' && d.state === 'closed' && Math.abs(d.center.y) < 1.8);
      const id = window.__qa.spawnEnemy('trooper',
        [door.center.x + (door.axis === 'z' ? 3 : 0), 0, door.center.z + (door.axis === 'z' ? 0 : 3)]);
      const e = m.enemies.find((x) => x.id === id);
      e.state = 'investigate';
      e.suspicion = 0.9;
      e.investigatePos = door.center.clone().add({ x: door.axis === 'z' ? -3 : 0, y: 0, z: door.axis === 'z' ? 0 : -3 });
      const samples = [];
      for (let i = 0; i < 80; i++) {
        window.advanceTime(100);
        samples.push({
          t: +m.timer.toFixed(2), doorState: door.state,
          pause: +e.doorPauseT.toFixed(2), entryBoost: +e.entryT.toFixed(2),
          opened: e.openedDoors.length,
          dist: +e.pos.distanceTo(door.center).toFixed(2),
        });
      }
      // Now let it patrol and see whether it shuts the door it opened.
      e.state = 'patrol';
      e.patrol = [[e.pos.x, e.pos.y, e.pos.z], [door.center.x + 4, 0, door.center.z + 4]];
      const closeSamples = [];
      for (let i = 0; i < 80; i++) {
        window.advanceTime(250);
        closeSamples.push({ t: +m.timer.toFixed(2), doorState: door.state, remembered: e.openedDoors.length });
      }
      return { door: door.id, samples, closeSamples };
    });
    const paused = trace.samples.filter((s) => s.pause > 0).length;
    const boosted = trace.samples.filter((s) => s.entryBoost > 0).length;
    const closed = trace.closeSamples.some((s) => s.doorState === 'closing' || s.doorState === 'closed');
    h.log(`door ${trace.door}: paused for ${paused} samples, entry boost for ${boosted}, `
      + `patrol closed it again: ${closed}`);
    h.save('trace', trace);
  },
};

// ---------------------------------------------------------------------------
const wanted = process.argv.slice(2);
const names = wanted.length ? wanted : Object.keys(SCENARIOS);

const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-dev-shm-usage'],
});

let failures = 0;
for (const name of names) {
  const fn = SCENARIOS[name];
  if (!fn) { console.error('unknown scenario:', name); failures++; continue; }
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  page.setDefaultTimeout(240000);
  const report = { shots: [], data: [], errors: [] };
  page.on('pageerror', (e) => report.errors.push('pageerror: ' + e.message));
  console.log(`SCENARIO ${name}`);
  try {
    await page.route('**/@vite/client', (route) => route.fulfill({
      contentType: 'application/javascript', body: VITE_CLIENT_STUB,
    }));
    await page.goto(SERVER + '/?qa=1&test=1', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__game && window.__game.state === 'title', null, { timeout: 120000 });
    await page.evaluate(() => {
      window.advanceTime(1);              // hand the fixed step over to the script
      const g = window.__game;
      g.engine.running = false;           // stop the RAF loop drawing frames nobody looks at
      g.__realRender = g.engine.renderFn;
      g.__framesSkipped = 0;
      g.engine.renderFn = () => { g.__framesSkipped++; };
    });
    await fn(makeHelpers(page, name, report));
    const errs = await page.evaluate(() => window.__consoleErrors);
    report.errors.push(...errs);
    if (report.errors.length) {
      failures++;
      console.log(`  ERRORS(${report.errors.length}):`, JSON.stringify(report.errors.slice(0, 6), null, 1));
    } else {
      console.log(`  ok — ${report.shots.length} shots, ${report.data.length} dumps`);
    }
  } catch (e) {
    failures++;
    console.error(`  FAILED: ${e.message.split('\n')[0]}`);
    try { await page.screenshot({ path: path.join(OUT, `${name}--FAILED.png`) }); } catch { /* ignore */ }
  }
  await page.close();
}
await browser.close();
console.log(failures ? `DONE with ${failures} failing scenario(s)` : 'DONE all scenarios passed');
process.exit(failures ? 1 : 0);
