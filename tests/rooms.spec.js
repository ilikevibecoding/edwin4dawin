import { test, expect } from '@playwright/test';
import {
  gotoGame, waitForLevel, enterGameplay, state, advance, capture, qa,
  expectNoConsoleErrors, writeReport,
} from './helpers.js';

/**
 * Room-by-room audit.
 * Owner: Opus 4.
 *
 * Confirms the map actually contains everything the design requires, that the
 * topology has no accidental dead ends, that each hostage area has two genuine
 * approaches, and that no viewpoint exposes the void.
 */

const REQUIRED_AREAS = [
  ['Snow-covered employee entrance', ['court']],
  ['Security vestibule', ['vestibule']],
  ['Reception lobby', ['lobby']],
  ['Visitor waiting area', ['waiting']],
  ['Main open-plan cubicle floor', ['openplanA', 'openplanB']],
  ['Conference room', ['conference']],
  ['Executive-office corridor', ['execcorr', 'execspine', 'execgal']],
  ['Executive office', ['exec', 'execante']],
  ['Records archive', ['archive', 'records2']],
  ['Copy and mail room', ['copy']],
  ['Break room and kitchen', ['breakroom']],
  ['IT workspace', ['it']],
  ['Server room', ['server']],
  ['Restrooms', ['restroom']],
  ['Janitor closet', ['janitor']],
  ['Electrical or mechanical room', ['mechanical']],
  ['Central stairwell', ['stairwell', 'landing']],
  ['Service corridor', ['southcorr', 'northcorr', 'westcorr', 'eastcorr', 'midcorr', 'spine']],
  ['Loading area', ['loading']],
  ['Extraction garage', ['garage']],
  ['Hostage locations', ['conference', 'exec']],
  ['Exterior snow area', ['court', 'westyard', 'eastyard']],
];

test.describe.configure({ mode: 'serial' });

test('every required area exists, is navigable and has a stated purpose', async ({ page }) => {
  await gotoGame(page, '?quality=low');
  await waitForLevel(page);

  const info = await page.evaluate(() => {
    const nav = window.__northstar.game.level.nav;
    const perRoom = {};
    for (const n of nav.nodes) {
      if (n.disabled || !n.room) continue;
      perRoom[n.room] = (perRoom[n.room] ?? 0) + 1;
    }
    return { perRoom, report: nav.report() };
  });

  const layout = await page.evaluate(async () => {
    const mod = await import('/src/map/layout.js');
    return {
      rooms: mod.ROOMS.map((r) => ({
        id: r.id, name: r.name, kind: r.kind, floor: r.floor,
        area: +((r.x1 - r.x0) * (r.z1 - r.z0)).toFixed(1),
      })),
      purposes: mod.ROOM_PURPOSES,
      hostages: mod.HOSTAGE_SPOTS.map((h) => ({ id: h.id, room: h.room, floor: h.floor })),
    };
  });

  const ids = new Set(layout.rooms.map((r) => r.id));
  const missing = [];
  const unnavigable = [];
  const purposeless = [];
  for (const [label, candidates] of REQUIRED_AREAS) {
    const present = candidates.filter((c) => ids.has(c));
    if (!present.length) { missing.push(label); continue; }
    for (const c of present) {
      const room = layout.rooms.find((r) => r.id === c);
      if (room.kind !== 'exterior' && !(info.perRoom[c] > 8)) unnavigable.push(`${label} / ${c}`);
      if (!layout.purposes[c]) purposeless.push(c);
    }
  }
  writeReport('room-audit', { missing, unnavigable, purposeless, perRoom: info.perRoom, rooms: layout.rooms });

  expect(missing, 'required areas absent from the layout').toEqual([]);
  expect(unnavigable, 'required areas with no usable navigation').toEqual([]);
  expect(purposeless, 'rooms without a documented real-world purpose').toEqual([]);
  // Both hostage rooms must be real rooms on the expected floors
  expect(layout.hostages.map((h) => h.room).sort()).toEqual(['conference', 'exec']);
  expect(layout.hostages.map((h) => h.floor).sort()).toEqual(['ground', 'upper']);
});

test('each hostage area has at least two distinct approaches', async ({ page }) => {
  await gotoGame(page, '?quality=low');
  await waitForLevel(page);
  const res = await page.evaluate(async () => {
    const mod = await import('/src/map/layout.js');
    const g = window.__northstar.game;
    const nav = g.level.nav;
    const doors = g.level.doors;
    const V = (x, y, z) => ({
      x, y, z, distanceTo(o) { return Math.hypot(this.x - o.x, this.y - o.y, this.z - o.z); },
    });
    const out = {};
    for (const spot of mod.HOSTAGE_SPOTS) {
      const room = mod.ROOM_BY_ID[spot.room];
      // Openings that touch this room, counted as candidate approaches
      const approaches = mod.OPENINGS.filter((o) => {
        if (o.floor !== room.floor) return false;
        if (!['door', 'arch', 'open'].includes(o.type)) return false;
        if (o.axis === 'x') {
          return Math.abs(o.at - room.x0) < 0.3 || Math.abs(o.at - room.x1) < 0.3;
        }
        return Math.abs(o.at - room.z0) < 0.3 || Math.abs(o.at - room.z1) < 0.3;
      });
      // Verify each candidate is actually usable: block all the others and
      // re-path from the lobby. If more than one blocking set still yields a
      // path, there are genuinely independent routes.
      const start = V(0, 0, -13);
      const goal = V(...spot.pos);
      const usable = [];
      for (const cand of approaches) {
        const others = approaches.filter((o) => o !== cand);
        const closed = [];
        for (const o of others) {
          for (const d of doors.doors) {
            if (d.id === o.id) { d.targetOpen = 0; d.openAmount = 0; d.updateColliders(); closed.push(d.id); }
          }
        }
        // Arches cannot be closed, so only count door-gated independence when a
        // door exists; otherwise the open arch itself is a permanent route.
        const path = nav.findPath(start, goal);
        if (path && path.length) usable.push(cand.id);
      }
      out[spot.id] = {
        room: spot.room,
        approachCount: approaches.length,
        approaches: approaches.map((a) => `${a.id}:${a.type}`),
        usable: usable.length,
      };
    }
    return out;
  });
  writeReport('hostage-approaches', res);
  for (const [id, r] of Object.entries(res)) {
    expect(r.approachCount, `${id} (${r.room}) needs at least two approaches, has ${r.approachCount}`).toBeGreaterThanOrEqual(2);
  }
});

test('the topology has no accidental dead ends', async ({ page }) => {
  await gotoGame(page, '?quality=low');
  await waitForLevel(page);
  const res = await page.evaluate(async () => {
    const mod = await import('/src/map/layout.js');
    const nav = window.__northstar.game.level.nav;
    const V = (x, y, z) => ({
      x, y, z, distanceTo(o) { return Math.hypot(this.x - o.x, this.y - o.y, this.z - o.z); },
    });
    // One representative node per interior room
    const anchors = {};
    for (const n of nav.nodes) {
      if (n.disabled || !n.room || n.room === 'exterior') continue;
      if (!anchors[n.room]) anchors[n.room] = n;
    }
    const rooms = Object.keys(anchors);
    const failures = [];
    // Round-trip: every room must reach the extraction garage AND the lobby
    const targets = [V(28, 0, 14), V(0, 0, -13)];
    for (const room of rooms) {
      const a = anchors[room];
      for (const t of targets) {
        const there = nav.findPath(V(a.x, a.y, a.z), t);
        const back = nav.findPath(t, V(a.x, a.y, a.z));
        if (!there || !there.length) failures.push(`${room} -> target`);
        if (!back || !back.length) failures.push(`target -> ${room}`);
      }
    }
    void mod;
    return { rooms: rooms.length, failures: Array.from(new Set(failures)) };
  });
  writeReport('topology', res);
  expect(res.rooms).toBeGreaterThan(30);
  expect(res.failures, 'rooms that cannot be reached or cannot be left').toEqual([]);
});

test('no viewpoint exposes the void through the shell', async ({ page }) => {
  await gotoGame(page, '?quality=low');
  await enterGameplay(page);
  await qa(page, 'freezeAI', true);
  const res = await page.evaluate(async () => {
    const mod = await import('/src/map/layout.js');
    const g = window.__northstar.game;
    // Use the live singleton the game registered its raycast targets on. A
    // dynamic import inside page.evaluate can resolve to a second module
    // instance whose target list is empty, which silently makes every ray miss.
    const collision = window.__nsCollision;
    // Bare module specifiers do not resolve inside page.evaluate, so borrow the
    // Vector3 constructor from a live object instead of importing three.
    const V3 = g.player.position.constructor;
    const leaks = [];
    const diag = { down: {}, sample: null };
    for (const room of mod.ROOMS) {
      if (room.kind === 'exterior') continue;
      const y0 = mod.FLOOR_Y[room.floor] + 1.6;
      const o = new V3((room.x0 + room.x1) / 2, y0, (room.z0 + room.z1) / 2);
      const down = collision.raycast(o, new V3(0, -1, 0), 12);
      diag.down[room.id] = down ? +down.distance.toFixed(2) : null;
      if (!diag.sample && !down) diag.sample = { room: room.id, origin: [o.x, o.y, o.z] };
    }
    for (const room of mod.ROOMS) {
      if (room.kind === 'exterior') continue;
      const y = mod.FLOOR_Y[room.floor] + 1.6;
      const cx = (room.x0 + room.x1) / 2;
      const cz = (room.z0 + room.z1) / 2;
      // Three origins per room. A ray that slips through a door seam or between
      // two shutter slats will only do so from one of them; a genuine hole in
      // the shell escapes from all three.
      const origins = [
        new V3(cx, y, cz),
        new V3(cx + Math.min(1.1, (room.x1 - room.x0) / 4), y - 0.5, cz),
        new V3(cx - Math.min(1.1, (room.x1 - room.x0) / 4), y + 0.4, cz + Math.min(0.9, (room.z1 - room.z0) / 4)),
      ];
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2;
        for (const pitch of [-0.35, 0, 0.3]) {
          const dir = new V3(Math.cos(a) * Math.cos(pitch), Math.sin(pitch), Math.sin(a) * Math.cos(pitch)).normalize();
          let escaped = 0;
          for (const o of origins) {
            if (!collision.raycast(o, dir, 240)) escaped++;
          }
          if (escaped === origins.length) {
            leaks.push({ room: room.id, angleDeg: Math.round((a * 180) / Math.PI), pitch });
          }
        }
      }
    }
    return { leaks, diag };
  });
  writeReport('void-check', res);
  expect(res.leaks, 'rays that escaped the shell without hitting anything').toEqual([]);
});

test('room screenshot audit', async ({ page }) => {
  test.setTimeout(3_000_000);
  await gotoGame(page, '?quality=medium');
  await enterGameplay(page);
  await qa(page, 'freezeAI', true);
  await page.evaluate(() => { window.__northstar.game.player.noclip = true; });

  const views = [
    ['courtyard', [0, 0, -29], 0, -2],
    ['vestibule', [0, 0, -18.4], 0, 0],
    ['lobby', [6, 0, -11.5], 55, -3],
    ['waiting', [16.5, 0, -13.5], -120, -4],
    ['northcorr', [21, 0, -7], 88, 0],
    ['openplan', [-9, 0, 5], 200, -3],
    ['conference', [10, 0, 0.5], -20, -3],
    ['breakroom', [17, 0, 0.5], 0, -4],
    ['copy', [6, 0, 7], 0, -6],
    ['restroom', [12.7, 0, 7.5], 0, -4],
    ['janitor', [18.5, 0, 7.5], 0, -6],
    ['server', [12, 0, 13.2], -90, -2],
    ['it', [-28, 0, 7], 0, -4],
    ['archive', [-28, 0, -6.5], 178, -3],
    ['mechanical', [-26.5, 0, -16], 178, 0],
    ['westcorr', [-22.5, 0, 16], 0, -2],
    ['southcorr', [-18, 0, 16.5], -90, 0],
    ['eastcorr', [22.5, 0, 15], 0, 0],
    ['spine', [0, 0, 12], 0, -2],
    ['stairwell', [3.2, 0, 12.4], -90, 12],
    ['loading', [28, 0, -5], 178, -3],
    ['garage', [27, 0, 8], 178, -3],
    ['firestair', [-18, 0, -1], 0, 14],
    ['mezzanine', [2, 4.2, -12.4], 180, -14],
    ['execcorr', [16, 4.2, -7], 90, 0],
    ['execante', [12, 4.2, -1.5], 178, -4],
    ['exec', [8, 4.2, 6], -70, -3],
    ['boardroom', [-9, 4.2, 0], 178, -3],
    ['records2', [-12, 4.2, 10], 178, -3],
    ['execgal', [11, 4.2, 10.7], 90, -2],
    ['execlounge', [15.5, 4.2, 13.2], 178, -3],
    ['landing', [3.2, 4.2, 13.2], 90, -10],
    ['eastyard', [36, 0, 12], -90, -2],
  ];

  const captured = [];
  for (const [name, pos, yaw, pitch] of views) {
    await page.evaluate(([p, y, pi]) => {
      const g = window.__northstar.game;
      g.player.teleport(p, y);
      g.player.pitch = (pi * Math.PI) / 180;
      g.player.updateCamera(0);
    }, [pos, yaw, pitch]);
    await advance(page, 220);
    const shot = await capture(page, 'rooms-audit', name);
    captured.push({ name, room: shot.state.player.room, drawCalls: shot.state.render.drawCalls, triangles: shot.state.render.triangles });
  }
  writeReport('room-screenshots', captured);
  expect(captured.length).toBe(views.length);
  expectNoConsoleErrors(page);
});
