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
import { getSetting, setSetting, allSettings, qualityPreset } from './settings.js';
import { openGallery, closeGallery, galleryShow, galleryInfo, galleryCatalog } from './gallery.js';

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
    kills: game.kills,
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
    blinded: enemies.filter((e) => e.blindTimer > 0).length,
    stuckRescues: game.enemies.reduce((sum, e) => sum + (e.stuckRescues || 0), 0),
    nearby: enemies
      .map((e) => ({ e, d: dist(e.pos, p.pos) }))
      .filter(({ e, d }) => d < 30 || e.state === 'combat')
      .sort((a, b) => a.d - b.d)
      .slice(0, 8)
      .map(({ e, d }) => ({
        id: e.id, type: e.type, state: e.state, health: Math.round(e.health),
        position: v3(e.pos), dist: round(d, 1), seesPlayer: e.canSeePlayer,
        blinded: e.blindTimer > 0,
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
  out.glassCracked = game.world.glassPanes.filter((g) => !g.broken && g.hits > 0).length;
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
    // stage an enemy's heading (test geometry only: same setter the AI uses)
    faceEnemy: (id, x, z) => {
      const e = S()?.enemies.find((en) => en.id === id);
      if (!e) return false;
      e.faceToward({ x, z });
      e.yaw = e.targetYaw;
      e.visTimer = 0;
      return true;
    },
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

    // ---- settings (localStorage-backed; drives the same appliers as the menu)
    setSetting: (k, v) => { setSetting(k, v); return getSetting(k); },
    getSetting: (k) => getSetting(k),
    settings: () => allSettings(),
    qualityPreset: () => qualityPreset(),

    // ---- renderer/camera introspection
    cameraFov: () => round(Engine.camera.fov, 3),
    cameraAspect: () => round(Engine.camera.aspect, 4),
    rendererInfo: () => {
      const r = Engine.renderer;
      const size = r.getSize(new THREE.Vector2());
      const buf = r.getDrawingBufferSize(new THREE.Vector2());
      return {
        cssWidth: size.x, cssHeight: size.y,
        drawingBufferWidth: buf.x, drawingBufferHeight: buf.y,
        pixelRatio: round(r.getPixelRatio(), 3),
        shadowsEnabled: r.shadowMap.enabled,
        shadowMapSize: qualityPreset().shadowMapSize,
        quality: getSetting('quality'),
        resolutionScale: getSetting('resolutionScale'),
      };
    },

    // ---- world/AI introspection (read-only, additive to render_game_to_text)
    enemies: () => (S()?.enemies || []).map((e) => ({
      id: e.id, type: e.type, alive: e.alive, state: e.state,
      health: Math.round(e.health), position: v3(e.pos),
      yawDeg: round(THREE.MathUtils.radToDeg(e.yaw) % 360, 1),
      facing: [round(-Math.sin(e.yaw), 3), 0, round(-Math.cos(e.yaw), 3)],
      seesPlayer: e.canSeePlayer, blinded: e.blindTimer > 0,
      blindTimer: round(e.blindTimer, 2), stuckRescues: e.stuckRescues,
      flinchTimer: round(e.flinchTimer, 2),
    })),
    playerFlash: () => round(S()?.playerFlash ?? 0, 3),
    // does deployed smoke sit between two points (the same test the AI uses)?
    smokeBlocks: (a, b) => S()?.smokeBlocks(
      { x: a[0], y: a[1], z: a[2] }, { x: b[0], y: b[1], z: b[2] },
    ) ?? null,
    glassPanes: (prefix = '') => (S()?.world.glassPanes || [])
      .filter((p) => p.id.startsWith(prefix))
      .map((p) => ({
        id: p.id, style: p.style, hits: p.hits, broken: p.broken,
        dir: p.dir, line: p.line, a: round(p.a, 2), b: round(p.b, 2),
        center: [round(p.dir === 'x' ? (p.a + p.b) / 2 : p.line, 2), round((p.y0 + p.y1) / 2, 2), round(p.dir === 'x' ? p.line : (p.a + p.b) / 2, 2)],
        blocksSight: !!p.collider.blocksSight,
        blocksMove: !!p.collider.blocksMove,
      })),
    propAnchors: (propId = null, limit = 40) => {
      const g = S(); if (!g) return [];
      const p = g.player.pos;
      return g.world.propAnchors
        .filter((a) => !propId || a.propId === propId)
        .map((a) => ({ assetId: a.assetId, propId: a.propId, room: a.room, position: [a.x, round(a.y, 2), a.z], dist: round(dist(a, p), 1) }))
        .sort((x, y) => x.dist - y.dist)
        .slice(0, limit);
    },
    lineOfSight: (a, b) => S()?.world.lineOfSight(a[0], a[1], a[2], b[0], b[1], b[2]) ?? null,
    collidersNear: (x, z, radius = 4, y = 0) => (S()?.world.colliders || [])
      .filter((c) => c.blocksMove && !c.noStand
        && c.x1 > x - radius && c.x0 < x + radius && c.z1 > z - radius && c.z0 < z + radius
        && c.y1 > y - 1 && c.y0 < y + 2.4)
      .map((c) => ({
        kind: c.kind, surface: c.surface, assetId: c.assetId || null,
        box: [round(c.x0, 2), round(c.y0, 2), round(c.z0, 2), round(c.x1, 2), round(c.y1, 2), round(c.z1, 2)],
        top: round(c.y1, 2), height: round(c.y1 - c.y0, 2),
      }))
      .sort((a, b) => a.top - b.top),

    // ---- asset gallery (dev)
    openGallery: () => openGallery(),
    closeGallery: () => closeGallery(),
    galleryShow: (idOrIndex) => galleryShow(idOrIndex),
    galleryInfo: () => galleryInfo(),
    galleryCatalog: () => galleryCatalog(),

    showAssetIds: (v = true) => showAssetIds(v),
    showCollision: (v = true) => debugCollision(v),
    showNav: (v = true, level = 'g') => debugNav(v, level),
    overlay: (text) => setQaOverlay(text),
    doorById: (id) => { const d = S()?.world.doors.find((d) => d.id === id); if (d) return { id: d.id, state: d.state, locked: d.locked }; return null; },
    openDoor: (id) => { S()?.world.doors.find((d) => d.id === id)?.setOpen(true, 'qa'); },
    unlockDoor: (id) => { S()?.world.doors.find((d) => d.id === id)?.unlock(); },
  };
  return api;
}

// Nearest prop anchors printed into the QA overlay, refreshed every sim step.
// Only ever active while explicitly enabled from the QA API.
let assetIdStop = null;
function showAssetIds(v) {
  if (assetIdStop) { assetIdStop(); assetIdStop = null; setQaOverlay(''); }
  if (!v) return;
  assetIdStop = Engine.addUpdater(() => {
    const g = ctx.getSession();
    if (!g || !g.built) { setQaOverlay('ASSET IDS — no session'); return; }
    const p = g.player.pos;
    const rows = g.world.propAnchors
      .map((a) => ({ a, d: dist(a, p) }))
      .sort((x, y) => x.d - y.d)
      .slice(0, 10)
      .map(({ a, d }) => `${String(a.assetId).padEnd(9)} ${String(a.propId).padEnd(24)} ${d.toFixed(1)}m`);
    setQaOverlay([`ASSET IDS — nearest ${rows.length} props`, ...rows].join('\n'));
  }, 120);
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
