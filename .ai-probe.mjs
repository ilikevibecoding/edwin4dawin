#!/usr/bin/env node
/* Scratch diagnostic driver for the AI showcase. Not part of the deliverable. */
import puppeteer from 'puppeteer-core';
import { existsSync } from 'node:fs';

const CHROME = ['/usr/local/bin/google-chrome', '/usr/bin/google-chrome'].find((p) => existsSync(p));
const which = process.argv[2] ?? 'fire';

const browser = await puppeteer.launch({
  executablePath: CHROME,
  args: [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu-sandbox',
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--disable-dev-shm-usage',
    '--mute-audio',
    '--window-size=640,360',
  ],
  protocolTimeout: 600000,
  defaultViewport: { width: 640, height: 360 },
});
const page = await browser.newPage();
page.setDefaultTimeout(600000);
page.on('pageerror', (e) => console.log('  page error:', e.message));
page.on('console', (m) => {
  if (m.type() === 'error') console.log('  page err:', m.text());
});
await page.goto('http://127.0.0.1:5173/?showcase=ai&capture=1&quality=medium', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__GAME__?.ready === true && window.__AI__, { timeout: 240000, polling: 250 });
const range = Number(process.argv[3] ?? 20);
await page.evaluate((r) => { window.__RANGE__ = r; }, range);
console.log('ready');

const probes = {
  fire: () => {
    const api = window.__AI__;
    api.clear();
    const anchor = api.anchor();
    const id = api.spawn(anchor[0], anchor[1], anchor[2], 0, 'regular');
    const want = Number(window.__RANGE__ ?? 20);
    let spot = null;
    for (let r = want; r >= 8 && !spot; r -= 1) {
      const s = api.openGround(id, r);
      if (s && Math.hypot(s[0] - anchor[0], s[2] - anchor[2]) >= want - 1.5) spot = s;
    }
    if (!spot) spot = api.openGround(id, want);
    if (!spot) return { error: 'no open ground' };
    api.setPlayer(spot[0], spot[1], spot[2]);
    api.resetPlayerDamage();
    api.step(0.2);
    api.force(id, 'engage');
    const frames = [];
    for (let i = 0; i < 42; i++) {
      api.step(1 / 6);
      const a = api.agent(id);
      const d = api.playerDamage();
      frames.push({
        t: +((i + 1) / 6).toFixed(2),
        state: a.state,
        trace: a.trace,
        vis: a.visible ? 1 : 0,
        con: a.contact ? 1 : 0,
        aware: +a.awareness.toFixed(2),
        wf: a.wantsFire ? 1 : 0,
        shots: a.shots,
        mag: a.magazine,
        rel: a.reloading ? 1 : 0,
        eng: +a.engageTime.toFixed(2),
        spread: +((a.spread * 180) / Math.PI).toFixed(2),
        cov: a.cover,
        duck: a.duck ?? null,
        peek: a.peeking ? 1 : 0,
        sup: +(a.suppression ?? 0).toFixed(2),
        dmg: +d.total.toFixed(0),
        hits: d.hits,
        dist: +Math.hypot(a.position[0] - spot[0], a.position[2] - spot[2]).toFixed(1),
      });
    }
    return { spot, frames };
  },

  warm: () => {
    const api = window.__AI__;
    const anchor = api.anchor();
    const runs = [];
    for (const warm of [false, true]) {
      if (warm) {
        // Roughly what the test file has done to the world by the time it gets
        // to the shooting section.
        api.clear();
        for (let i = 0; i < 6; i++) {
          const id = api.spawn(anchor[0] - 2 + (i % 3) * 1.6, anchor[1], anchor[2] - 2 + Math.floor(i / 3) * 1.6, 0);
          api.force(id, 'engage');
        }
        api.setPlayer(anchor[0] + 18, anchor[1], anchor[2]);
        api.step(3);
        api.clear();
        const victim = api.spawn(anchor[0], anchor[1], anchor[2], 0);
        api.setPlayer(anchor[0] + 6, anchor[1], anchor[2]);
        api.step(0.4);
        api.damage(victim, 500, true);
        api.step(6);
      }
      api.clear();
      const id = api.spawn(anchor[0], anchor[1], anchor[2], 0, 'regular');
      const spot = api.openGround(id, 20);
      if (!spot) {
        runs.push({ warm, error: 'no open ground' });
        continue;
      }
      api.setPlayer(spot[0], spot[1], spot[2]);
      api.resetPlayerDamage();
      api.step(0.2);
      api.force(id, 'engage');
      api.step(7);
      const a = api.agent(id);
      runs.push({
        warm,
        spot: spot.map((v) => +v.toFixed(1)),
        range: +Math.hypot(spot[0] - anchor[0], spot[2] - anchor[2]).toFixed(1),
        shots: a.shots,
        state: a.state,
        trace: a.trace,
        cover: a.cover,
        visible: a.visible,
        away: +Math.hypot(a.position[0] - spot[0], a.position[2] - spot[2]).toFixed(1),
        damage: api.playerDamage(),
      });
    }
    return { anchor: anchor.map((v) => +v.toFixed(1)), runs };
  },

  shot: () => {
    const api = window.__AI__;
    const THREE = window.__GAME__.THREE;
    const physics = window.__GAME__.engine.get('physics');
    const ai = window.__GAME__.engine.get('ai');
    api.clear();
    const anchor = api.anchor();
    const id = api.spawn(anchor[0], anchor[1], anchor[2], 0, 'regular');
    const spot = api.openGround(id, 20);
    if (!spot) return { error: 'no open ground' };
    api.setPlayer(spot[0], spot[1], spot[2]);
    api.resetPlayerDamage();
    api.step(0.2);
    api.force(id, 'engage');
    api.step(2);
    const a = ai.byId(id);
    const muzzle = a.rig.muzzle;
    const aim = a.aimPoint;
    const dir = new THREE.Vector3().copy(aim).sub(muzzle).normalize();
    const out = {
      spot,
      shots: a.shots,
      damage: api.playerDamage(),
      muzzle: [muzzle.x, muzzle.y, muzzle.z].map((v) => +v.toFixed(2)),
      aim: [aim.x, aim.y, aim.z].map((v) => +v.toFixed(2)),
      toAim: +muzzle.distanceTo(aim).toFixed(2),
      rays: [],
    };
    for (const [name, mask] of [['all', undefined], ['world+prop', 1 | 2]]) {
      const hit = physics.raycast(muzzle, dir, 220, mask, a.ignoreList);
      out.rays.push({
        mask: name,
        hit: hit ? +hit.distance.toFixed(2) : null,
        object: hit ? hit.object.name || hit.object.type : null,
        surface: hit ? hit.surface : null,
        entityId: hit ? hit.entityId : null,
      });
    }
    const noIgnore = physics.raycast(muzzle, dir, 220);
    out.noIgnore = noIgnore
      ? { d: +noIgnore.distance.toFixed(2), o: noIgnore.object.name || noIgnore.object.type }
      : null;
    return out;
  },

  cover: () => {
    const api = window.__AI__;
    api.clear();
    const anchor = api.anchor();
    api.setPlayer(anchor[0] + 18, anchor[1], anchor[2]);
    const ids = [];
    for (let i = 0; i < 6; i++) {
      const id = api.spawn(anchor[0] - 2 + (i % 3) * 1.6, anchor[1], anchor[2] - 2 + Math.floor(i / 3) * 1.6, 0);
      api.force(id, 'engage');
      ids.push(id);
    }
    const frames = [];
    for (let i = 0; i < 12; i++) {
      api.step(0.5);
      frames.push(
        api.agents().map((a) => ({
          id: a.id,
          st: a.state,
          cov: a.cover,
          cd: +a.coverDistance.toFixed(2),
          at: a.atCover,
          inC: a.inCover,
          ps: a.pathState,
          pc: a.pathCount,
          pi: a.pathIndex,
          d2g: +a.distanceToGoal.toFixed(2),
          ar: +a.arriveRadius.toFixed(2),
          stuck: +a.stuck.toFixed(2),
          v: +Math.hypot(a.velocity[0], a.velocity[2]).toFixed(2),
        })),
      );
    }
    return { frames };
  },

  frames: () => {
    const api = window.__AI__;
    api.clear();
    const anchor = api.anchor();
    api.setPlayer(anchor[0] + 18, anchor[1], anchor[2]);
    const id = api.spawn(anchor[0], anchor[1], anchor[2], 0);
    api.force(id, 'engage');
    const out = [];
    for (let i = 0; i < 90; i++) {
      api.stepFrames(1);
      const a = api.agent(id);
      out.push(
        `${i} ${a.trace} ps=${a.pathState}(${a.pathWhy}) pc=${a.pathCount} pi=${a.pathIndex} cov=${a.cover} d2g=${a.distanceToGoal.toFixed(2)} hasGoal=${a.hasGoal} v=${Math.hypot(a.velocity[0], a.velocity[2]).toFixed(2)} vis=${a.visible} wp=${a.waypoint ? a.waypoint.map((v) => v.toFixed(1)).join(',') : '-'} p=${a.position.map((v) => v.toFixed(1)).join(',')} g=${a.goal.map((v) => v.toFixed(1)).join(',')}`,
      );
    }
    return out;
  },

  cpath: () => {
    const api = window.__AI__;
    api.clear();
    const anchor = api.anchor();
    api.setPlayer(anchor[0] + 18, anchor[1], anchor[2]);
    const id = api.spawn(anchor[0], anchor[1], anchor[2], 0);
    api.force(id, 'engage');
    api.stepFrames(20);
    const a = api.agent(id);
    const p = api.path(a.position[0], a.position[1], a.position[2], a.goal[0], a.goal[1], a.goal[2]);
    const ai = window.__GAME__.engine.get('ai');
    const agent = ai.agentList.find((x) => x.id === id);
    const own = [];
    const THREE = window.__GAME__.THREE;
    const v = new THREE.Vector3();
    for (let i = 0; i < agent.path.count; i++) {
      agent.path.point(i, v);
      own.push([+v.x.toFixed(2), +v.y.toFixed(2), +v.z.toFixed(2)]);
    }
    return {
      agent: a.position.map((x) => +x.toFixed(2)),
      goal: a.goal.map((x) => +x.toFixed(2)),
      ownPath: own,
      ownComplete: agent.path.complete,
      freshPath: p ? p.points.map((q) => q.map((x) => +x.toFixed(2))) : null,
      freshComplete: p ? p.complete : null,
    };
  },

  sight: () => {
    const api = window.__AI__;
    api.clear();
    const anchor = api.anchor();
    const physics = window.__GAME__.engine.get('physics');
    const THREE = window.__GAME__.THREE;
    const eye = new THREE.Vector3(anchor[0], anchor[1] + 1.6, anchor[2]);
    const dir = new THREE.Vector3();
    let bearing = null;
    for (let i = 0; i < 96 && !bearing; i++) {
      const angle = (i / 96) * Math.PI * 2;
      dir.set(Math.cos(angle), 0, Math.sin(angle));
      const hit = physics.raycast(eye, dir, 26);
      if (!hit) bearing = { angle, x: dir.x, z: dir.z };
    }
    const px = anchor[0] + bearing.x * 20;
    const pz = anchor[2] + bearing.z * 20;
    api.setPlayer(px, anchor[1], pz);
    const id = api.spawn(anchor[0], anchor[1], anchor[2], Math.atan2(bearing.x, bearing.z), 'regular');
    api.force(id, 'engage');
    api.step(0.2);
    const a = api.agent(id);
    const world = window.__GAME__.engine.get('world');
    const from = new THREE.Vector3(a.position[0], a.position[1] + 1.62, a.position[2]);
    const ai = window.__GAME__.engine.get('ai');
    const agent = ai.agentList.find((x) => x.id === id);
    const ignore = agent.ignoreList;
    const results = [];
    for (const dy of [1.12, 1.6, 0.5, 0]) {
      const to = new THREE.Vector3(px, anchor[1] + dy, pz);
      const d = new THREE.Vector3().subVectors(to, from);
      const len = d.length();
      d.normalize();
      const hit = physics.raycast(from, d, len, 0xffffffff, ignore);
      const hitStatic = physics.raycast(from, d, len, 1 | 2, ignore);
      results.push({
        dy,
        los: physics.lineOfSight(from, to),
        losIgnore: physics.lineOfSight(from, to, ignore),
        hit: hit ? { dist: +hit.distance.toFixed(2), surface: hit.surface, y: +hit.point.y.toFixed(2) } : null,
        hitStatic: hitStatic ? { dist: +hitStatic.distance.toFixed(2), surface: hitStatic.surface, y: +hitStatic.point.y.toFixed(2) } : null,
        len: +len.toFixed(2),
      });
    }
    const ignoreNames = ignore.map((o) => o.name || o.type);
    return {
      anchor,
      agentPos: a.position,
      heading: a.heading,
      target: [px, anchor[1], pz],
      groundAtTarget: world.terrainHeight ? world.terrainHeight(px, pz) : null,
      walkableAtTarget: world.isWalkable(px, pz),
      groundHeight: physics.groundHeight ? physics.groundHeight(px, pz) : null,
      ignoreNames,
      results,
    };
  },

  ragdoll: () => {
    const api = window.__AI__;
    const NAMES = ['pelv', 'chst', 'head', 'elbL', 'hndL', 'elbR', 'hndR', 'kneL', 'ftL', 'kneR', 'ftR'];
    api.clear();
    const anchor = api.anchor();
    const id = api.spawn(anchor[0], anchor[1], anchor[2], 0);
    api.setPlayer(anchor[0] + 6, anchor[1], anchor[2]);
    api.step(0.4);
    api.damage(id, 500, true);
    const frames = [];
    let prev = api.ragdoll(id);
    const dt = 1 / 30;
    for (let i = 0; i < 160; i++) {
      api.step(dt);
      const r = api.ragdoll(id);
      let drift = 0;
      let worst = -1;
      for (let k = 0; k < r.points.length; k++) {
        const d = Math.hypot(
          r.points[k][0] - prev.points[k][0],
          r.points[k][1] - prev.points[k][1],
          r.points[k][2] - prev.points[k][2],
        );
        if (d > drift) {
          drift = d;
          worst = k;
        }
      }
      let hi = -1;
      let hiY = -Infinity;
      for (let k = 0; k < r.points.length; k++) {
        if (r.points[k][1] > hiY) {
          hiY = r.points[k][1];
          hi = k;
        }
      }
      frames.push({
        t: +((i + 1) * dt).toFixed(2),
        age: +r.age.toFixed(2),
        set: r.settled ? 1 : 0,
        drift: +(drift * 1000).toFixed(0),
        worst: NAMES[worst],
        hi: NAMES[hi],
        minY: +(Math.min(...r.points.map((p) => p[1])) - anchor[1]).toFixed(3),
        maxY: +(hiY - anchor[1]).toFixed(3),
        dx: +(r.points[0][0] - anchor[0]).toFixed(2),
        dz: +(r.points[0][2] - anchor[2]).toFixed(2),
      });
      prev = r;
    }
    const last = api.ragdoll(id);
    const final = {};
    for (let k = 0; k < last.points.length; k++) {
      final[NAMES[k]] = [
        +(last.points[k][0] - anchor[0]).toFixed(3),
        +(last.points[k][1] - anchor[1]).toFixed(3),
        +(last.points[k][2] - anchor[2]).toFixed(3),
      ];
    }
    const settleAt = frames.find((f) => f.set)?.t ?? null;
    return { groundY: anchor[1], settleAt, final, frames };
  },
};

const out = await page.evaluate(`(${probes[which].toString()})()`);
console.log(JSON.stringify(out, null, 1));
await browser.close();
