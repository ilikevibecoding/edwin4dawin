// Deterministic browser-testing interface.
//   window.render_game_to_text() -> concise JSON string of player-relevant state
//   window.advanceTime(ms)       -> steps the fixed-timestep sim exactly
//   window.__qa                  -> dev/QA controls (enabled with ?qa=1)

import * as THREE from 'three';
import { Engine } from './engine.js';
import { currentMode, MODES } from './state.js';
import { injectKey, injectMouse, injectLook, forcePointerLockFlag } from './input.js';
import { roomAt, CHECKPOINTS, LEVELS } from '../world/map.js';
import { WEAPONS } from '../game/constants.js';
import { Enemy } from '../game/enemy.js';
import { setQaOverlay } from '../ui/hud.js';

let ctx = null; // {getSession, startMission, restartMission, abortToTitle, resumeGame}

export function installTestHooks(context, { qaEnabled }) {
  ctx = context;

  window.render_game_to_text = () => JSON.stringify(snapshot());
  window.advanceTime = (ms) => {
    const steps = Engine.advanceManual(ms);
    return steps;
  };

  if (qaEnabled) window.__qa = buildQaApi();
}

function snapshot() {
  const mode = currentMode();
  const out = {
    coordinateSystem: 'right-handed, units=meters. +X east, +Y up, +Z south. yawDeg: 0 faces north(-Z), 90 faces west(-X), 180 south(+Z). pitchDeg: + looks up.',
    mode,
    simTime: round(Engine.simTime, 2),
  };
  const game = ctx.getSession();
  if (!game || !game.built || (mode !== MODES.PLAYING && mode !== MODES.PAUSED && mode !== MODES.VICTORY && mode !== MODES.DEFEAT)) {
    return out;
  }
  const p = game.player;
  const room = roomAt(p.pos.x, p.pos.z, p.pos.y);
  out.player = {
    position: v3(p.pos),
    yawDeg: round(THREE.MathUtils.radToDeg(p.yaw) % 360, 1),
    pitchDeg: round(THREE.MathUtils.radToDeg(p.pitch), 1),
    velocity: v3(p.vel),
    health: Math.round(p.health),
    armor: Math.round(p.armor),
    alive: p.alive,
    moveState: p.moveState,
    grounded: p.grounded,
    crouching: p.crouchFrac > 0.5,
    room: room ? room.id : 'outside',
  };
  const ws = game.weapons.getHudState();
  out.weapon = {
    id: ws.id, name: ws.name, class: ws.cls, state: ws.state,
    mag: ws.mag, reserve: ws.reserve, ads: ws.ads,
    gadget: ws.gadget,
  };
  out.mission = {
    phase: game.phase,
    objective: game.currentObjectiveText(),
    timerSec: Math.ceil(game.missionTimeLeft),
    result: game.result ? game.result.outcome : null,
    resultReason: game.result ? game.result.reason : null,
    extractionHold: round(game.extractHold, 2),
  };
  out.hostages = game.hostages.map((h) => ({
    id: h.id, name: h.name, state: h.state, found: h.found,
    position: v3(h.pos), room: roomAt(h.pos.x, h.pos.z, h.pos.y)?.id || 'outside',
    distToPlayer: round(dist(h.pos, p.pos), 1),
  }));
  const enemies = game.enemies.filter((e) => e.alive);
  out.enemies = {
    alive: enemies.length,
    total: game.enemies.length,
    engaged: enemies.filter((e) => e.state === 'combat').length,
    nearby: enemies
      .map((e) => ({ e, d: dist(e.pos, p.pos) }))
      .filter(({ e, d }) => d < 30 || e.state === 'combat')
      .sort((a, b) => a.d - b.d)
      .slice(0, 8)
      .map(({ e, d }) => ({
        id: e.id, type: e.type, state: e.state, health: Math.round(e.health),
        position: v3(e.pos), dist: round(d, 1), seesPlayer: e.canSeePlayer,
      })),
  };
  out.doorsNearby = game.world.doors
    .map((dr) => ({ dr, d: dist(dr.center, { x: p.pos.x, y: p.pos.y + 1, z: p.pos.z }) }))
    .filter(({ d }) => d < 6)
    .sort((a, b) => a.d - b.d)
    .slice(0, 6)
    .map(({ dr, d }) => ({ id: dr.id, label: dr.label, state: dr.state, locked: dr.locked, dist: round(d, 1) }));
  out.interactable = game.currentInteractable ? game.currentInteractable.prompt : null;
  out.pickupsNearby = game.pickups
    .filter((pk) => !pk.taken)
    .map((pk) => ({ pk, d: dist({ x: pk.x, y: pk.y, z: pk.z }, p.pos) }))
    .filter(({ d }) => d < 8)
    .slice(0, 5)
    .map(({ pk, d }) => ({ id: pk.id, type: pk.type, dist: round(d, 1) }));
  out.glassBroken = game.world.glassPanes.filter((g) => g.broken).length;
  out.perf = Engine.getPerf();
  return out;
}

function buildQaApi() {
  const S = () => ctx.getSession();
  const api = {
    state: () => JSON.parse(window.render_game_to_text()),
    perf: () => Engine.getPerf(),

    startMission: (opts = {}) => ctx.startMission({
      difficulty: opts.difficulty || 'operator',
      loadout: {
        primary: opts.primary || 'ridgeline',
        secondary: 'vireo',
        melee: 'talon',
        gadget: opts.gadget || 'flash',
      },
    }),
    resetMission: () => ctx.restartMission(),
    abortToTitle: () => ctx.abortToTitle(),
    resume: () => ctx.resumeGame(),

    listCheckpoints: () => Object.keys(CHECKPOINTS),
    teleport: (name) => {
      const cp = CHECKPOINTS[name];
      if (!cp || !S()) return false;
      S().player.setSpawn(cp.x, cp.y, cp.z, cp.yaw);
      return true;
    },
    teleportTo: (x, y, z, yawDeg = 0) => { S()?.player.setSpawn(x, y, z, yawDeg); },

    setWeapon: (id) => {
      const g = S(); if (!g || !WEAPONS[id]) return false;
      const w = WEAPONS[id];
      if (w.slot === 'primary' || w.slot === 'secondary') {
        g.weapons.slots[w.slot] = id;
        g.weapons.ammo[id] = { mag: w.mag, reserve: w.reserve };
        g.weapons.switchTo(w.slot === 'primary' ? 'primary' : 'secondary');
      } else if (w.slot === 'gadget') {
        g.weapons.slots.gadget = id;
        g.weapons.gadgetCount = w.count;
        g.weapons.switchTo('gadget');
      } else g.weapons.switchTo('melee');
      return true;
    },
    giveAmmo: () => S()?.weapons.addReserveAmmo(1),
    god: (v = true) => { const g = S(); if (g) g.player.takeDamage = v ? () => {} : Object.getPrototypeOf(g.player).takeDamage.bind(g.player); },

    spawnEnemy: (type = 'trooper', x, z, level = 'g') => {
      const g = S(); if (!g) return null;
      const px = x ?? g.player.pos.x + 4, pz = z ?? g.player.pos.z;
      const e = new Enemy(g, { id: `qa_${type}_${g.enemies.length}`, type, patrol: [[px, pz]], level });
      g.enemies.push(e);
      g.entityGroup.add(e.body.group);
      return e.id;
    },
    killEnemies: () => { for (const e of S()?.enemies || []) if (e.alive) e.die(false); },
    freezeAI: (v = true) => { const g = S(); if (g) g.aiFrozen = v; },
    revealAll: (v = true) => { const g = S(); if (g) g.qaRevealAll = v; },

    freeHostage: (id) => { const h = S()?.hostages.find((h) => h.id === id); if (h && h.state === 'bound') { h.found = true; h.interact(); } },
    teleportHostagesToExtraction: () => {
      const g = S(); if (!g) return;
      for (const h of g.hostages) {
        if (h.state === 'bound') { h.found = true; h.state = 'following'; h.body.setCrouch(0); }
        h.pos.set(g.extraction.x + (Math.random() - 0.5), g.extraction.y, g.extraction.z + (Math.random() - 0.5));
      }
    },
    winMission: () => S()?.winMission(),
    failMission: (r = 'killed') => S()?.failMission(r),

    setLighting: (name) => S()?.lighting.setScenario(name),

    // input injection (drives the exact same input state as real events)
    press: (code, down = true) => injectKey(code, down),
    tap: (code) => { injectKey(code, true); Engine.advanceManual(50); injectKey(code, false); },
    mouse: (btn, down) => injectMouse(btn, down),
    look: (dx, dy) => injectLook(dx, dy),
    lookYawPitch: (yawDeg, pitchDeg) => {
      const g = S(); if (!g) return;
      g.player.yaw = THREE.MathUtils.degToRad(yawDeg);
      g.player.pitch = THREE.MathUtils.degToRad(pitchDeg);
    },
    lookAt: (x, y, z) => {
      const g = S(); if (!g) return;
      const pe = g.player.eyePos;
      const dx = x - pe.x, dy = (y ?? pe.y) - pe.y, dz = z - pe.z;
      g.player.yaw = Math.atan2(-dx, -dz);
      g.player.pitch = Math.atan2(dy, Math.hypot(dx, dz));
    },
    forcePointerLock: () => forcePointerLockFlag(true),

    showCollision: (v = true) => debugCollision(v),
    showNav: (v = true, level = 'g') => debugNav(v, level),
    overlay: (text) => setQaOverlay(text),
    doorById: (id) => { const d = S()?.world.doors.find((d) => d.id === id); if (d) return { id: d.id, state: d.state, locked: d.locked }; return null; },
    openDoor: (id) => { S()?.world.doors.find((d) => d.id === id)?.setOpen(true, 'qa'); },
    unlockDoor: (id) => { S()?.world.doors.find((d) => d.id === id)?.unlock(); },
  };
  return api;
}

let dbgCol = null;
function debugCollision(v) {
  const g = ctx.getSession();
  if (dbgCol) { Engine.scene.remove(dbgCol); dbgCol = null; }
  if (!v || !g) return;
  const positions = [];
  for (const c of g.world.colliders) {
    if (!c.blocksMove) continue;
    pushBoxEdges(positions, c);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  dbgCol = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.35 }));
  Engine.scene.add(dbgCol);
}

let dbgNav = null;
function debugNav(v, level) {
  const g = ctx.getSession();
  if (dbgNav) { Engine.scene.remove(dbgNav); dbgNav = null; }
  if (!v || !g) return;
  const grid = g.nav.grids[level];
  const pts = [];
  for (let j = 0; j < grid.h; j += 1) {
    for (let i = 0; i < grid.w; i += 1) {
      const val = grid.cells[j * grid.w + i];
      if (val === 255) continue;
      pts.push(grid.x0 + (i + 0.5) * 0.5, LEVELS[level].y + 0.06, grid.z0 + (j + 0.5) * 0.5);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  dbgNav = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0x33aaff, size: 0.09 }));
  Engine.scene.add(dbgNav);
}

function pushBoxEdges(arr, b) {
  const c = [[b.x0, b.y0, b.z0], [b.x1, b.y0, b.z0], [b.x1, b.y0, b.z1], [b.x0, b.y0, b.z1],
    [b.x0, b.y1, b.z0], [b.x1, b.y1, b.z0], [b.x1, b.y1, b.z1], [b.x0, b.y1, b.z1]];
  const E = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
  for (const [a, bb] of E) { arr.push(...c[a], ...c[bb]); }
}

function v3(v) { return [round(v.x, 2), round(v.y, 2), round(v.z, 2)]; }
function round(n, d) { const f = 10 ** d; return Math.round(n * f) / f; }
function dist(a, b) { const dx = a.x - b.x, dy = (a.y ?? 0) - (b.y ?? 0), dz = a.z - b.z; return Math.sqrt(dx * dx + dy * dy + dz * dz); }
