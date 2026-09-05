// DisasterManager: command-driven, deterministic disaster simulation with budgets and full restore.
//
// Commands ({type, disaster, params, seed, startTick, id}) are the single source of truth. In single player
// they apply immediately; with a network client attached (`manager.net`) local admin commands are sent to the
// server, which stamps the authoritative startTick/seed and echoes them to every client, so all clients run
// the same deterministic simulation on the same tick timeline.
import { BlockJournal } from './journal.js';
import { DebrisSystem } from './debris.js';
import { Effects } from './effects.js';
import { BLOCKS, B } from '../blocks.js';
import { CHUNK_SIZE as CS } from '../constants.js';

export const BUDGET = {
  editsPerTick: 400,        // block edits applied per simulation tick (fixed for all clients: part of the deterministic simulation)
  relightPerFrame: 3,       // chunks fully relit per frame
  remeshPerFrame: 3,        // chunk meshes rebuilt per frame (disaster-dirty chunks)
  maxDebris: 600,
  restorePerTick: 320,      // blocks restored per tick during reset
  maxJournal: 250000,       // hard cap on journaled cells
};

let commandCounter = 1;

export class DisasterManager {
  constructor(game) {
    this.game = game;
    this.world = game.world;
    this.registry = new Map();
    this.active = null;
    this.activeType = null;
    this.state = 'idle'; // idle | preview | running | paused | finished | restoring
    this.tick = 0;
    this.journal = new BlockJournal();
    this.debris = new DebrisSystem(game.scene, game.world, game.atlas, 1800, BUDGET.maxDebris);
    this.effects = new Effects();
    this.net = null;                // network client (optional); must implement sendCommand(cmd)
    this.permissions = game.permissions;
    this.log = [];                  // applied commands (for replay / late joiners)
    this.lastCommand = null;        // last start command (for replay)
    this.editsThisTick = 0;
    this.touched = new Set();       // chunk keys touched since last relight pass
    this.relightQueue = [];
    this.restoreIter = null;
    this.listeners = new Set();     // UI callbacks: fn(status)
    this.pendingStart = null;       // command waiting for its startTick (network)
    this.serverTick = null;         // estimated server tick (set by net client)
    this.stats = { edits: 0, restored: 0, debrisSpawned: 0 };
    this.messages = [];             // recent status messages for the UI
  }

  register(cls) { this.registry.set(cls.type, cls); }
  types() { return [...this.registry.keys()]; }
  schema(type) { const c = this.registry.get(type); return c ? c.schema : []; }
  defaults(type) { const c = this.registry.get(type); return c ? c.defaults() : {}; }

  onChange(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  _notify() { const s = this.status(); for (const fn of this.listeners) fn(s); }
  say(text) { this.messages.push(text); if (this.messages.length > 6) this.messages.shift(); this.game.hud.addMessage(text); }

  status() {
    const a = this.active;
    return {
      state: this.state, type: this.activeType, tick: this.tick, elapsed: this.tick / 20,
      progress: a ? a.progress : 0, params: a ? a.params : null, seed: a ? a.seed : null,
      journal: this.journal.size, debris: this.debris.count, edits: this.stats.edits, restored: this.stats.restored,
      restoreProgress: this.restoreIter ? this.restoreProgress : null, admin: this.isAdmin(), online: !!(this.net && this.net.connected),
      messages: this.messages.slice(),
    };
  }

  isAdmin() { return !this.permissions || this.permissions.isAdmin(); }

  // ---------------------------------------------------------------- commands
  // Issue a command locally (from the admin UI). Returns {ok, reason}.
  command(cmd) {
    if (!this.isAdmin()) return { ok: false, reason: 'Disaster controls require administrator permission.' };
    const c = { ...cmd, id: cmd.id || commandCounter++ };
    if (c.type === 'start' || c.type === 'preview' || c.type === 'replay') {
      if (!this.registry.has(c.disaster || this.activeType)) return { ok: false, reason: 'Unknown disaster type.' };
    }
    if (this.net && this.net.connected) { this.net.sendCommand(c); return { ok: true, pending: true }; }
    return this.apply(c, false);
  }

  // Apply a command (locally or received from the server). fromNetwork commands already carry startTick/seed.
  apply(cmd, fromNetwork = false) {
    const cls = this.registry.get(cmd.disaster || this.activeType);
    switch (cmd.type) {
      case 'preview': {
        if (!cls) return { ok: false, reason: 'no disaster' };
        this._disposeActive();
        this.active = new cls(this, cmd.params || {}, cmd.seed ?? 1);
        this.activeType = cls.type;
        this.active.preview = true;
        this.active.beginPreview();
        this.state = 'preview';
        break;
      }
      case 'start': {
        if (!cls) return { ok: false, reason: 'no disaster' };
        if (this.state === 'restoring') return { ok: false, reason: 'restore in progress' };
        this._disposeActive();
        const seed = cmd.seed ?? ((Date.now() ^ (Math.random() * 1e9)) >>> 0);
        this.active = new cls(this, cmd.params || {}, seed);
        this.activeType = cls.type;
        this.tick = 0;
        this.editsThisTick = 0;
        this.lastCommand = { ...cmd, seed, params: this.active.params };
        this.active.begin();
        this.state = 'running';
        this.say(`${cls.label} started (seed ${seed}).`);
        break;
      }
      case 'pause': if (this.state === 'running') { this.state = 'paused'; this.say('Disaster paused.'); } break;
      case 'resume': if (this.state === 'paused') { this.state = 'running'; this.say('Disaster resumed.'); } break;
      case 'stop': {
        if (this.active && (this.state === 'running' || this.state === 'paused')) { this.active.stop(); this.state = 'finished'; this.say('Disaster stopped.'); }
        else if (this.state === 'preview') { this._disposeActive(); this.state = 'idle'; }
        break;
      }
      case 'set': { // live parameter change (e.g. intensity slider) - applied deterministically at this tick
        if (this.active && cmd.params) { const cls2 = this.active.constructor; Object.assign(this.active.params, cls2.clampParams({ ...this.active.params, ...cmd.params })); if (this.active.onParamsChanged) this.active.onParamsChanged(); }
        break;
      }
      case 'reset': { // restore the world and clear everything
        if (this.active) { this.active.stop(); this._disposeActive(); }
        this.debris.clear();
        this.effects.reset();
        this.beginRestore();
        break;
      }
      case 'replay': {
        const last = cmd.command || this.lastCommand;
        if (!last) return { ok: false, reason: 'nothing to replay' };
        this.pendingReplay = { ...last, type: 'start', id: commandCounter++ };
        if (this.active) { this.active.stop(); this._disposeActive(); }
        this.debris.clear();
        this.effects.reset();
        this.beginRestore();
        break;
      }
      default: return { ok: false, reason: 'unknown command ' + cmd.type };
    }
    this.log.push({ ...cmd, appliedTick: this.tick, fromNetwork });
    if (this.log.length > 200) this.log.shift();
    this._notify();
    return { ok: true };
  }

  _disposeActive() {
    if (this.active) { try { this.active.dispose(); } catch (e) { console.warn(e); } }
    this.active = null;
    this.debris.forceFn = null;
    this.debris.waterLevelFn = null;
    this.effects.reset();
    if (this.game.npcs) this.game.npcs.clearAlert();
    if (this.game.animals) this.game.animals.clearAlert();
  }

  // ---------------------------------------------------------------- world edits (journaled, budgeted)
  // Returns true if applied. Never call world.setBlock directly from a disaster.
  setBlock(x, y, z, id) {
    if (this.active && this.active.preview) return false;
    if (this.editsThisTick >= BUDGET.editsPerTick) return false;
    if (!this.world.isLoaded(x, z)) return false;
    const old = this.world.getBlock(x, y, z);
    if (old === id) return false;
    if (old === B.BEDROCK) return false;
    if (!this.journal.has(x, y, z)) {
      if (this.journal.size >= BUDGET.maxJournal) return false;
      this.journal.record(x, y, z, old);
      if (this.game.save) this.game.save.onDisasterEdit(x, y, z);
    }
    this.world.setBlockRaw(x, y, z, id);
    this.touched.add(this.world.chunkKeyAt(x, z));
    this.editsThisTick++;
    this.stats.edits++;
    return true;
  }
  get budgetLeft() { return BUDGET.editsPerTick - this.editsThisTick; }

  // ---------------------------------------------------------------- restore
  beginRestore() {
    if (this.journal.size === 0) { this.state = this.pendingReplay ? 'idle' : 'idle'; this._finishRestore(); return; }
    this.state = 'restoring';
    this.restoreTotal = this.journal.size;
    this.restoreDone = 0;
    this.restoreIter = this.journal.restoreBatches(BUDGET.restorePerTick);
    this.say(`Restoring ${this.restoreTotal} blocks...`);
    this._notify();
  }
  get restoreProgress() { return this.restoreTotal ? this.restoreDone / this.restoreTotal : 1; }

  _restoreStep() {
    const r = this.restoreIter.next();
    if (r.done) { this._finishRestore(); return; }
    for (const e of r.value) {
      if (!this.world.isLoaded(e.x, e.z)) continue;
      if (this.world.getBlock(e.x, e.y, e.z) !== e.orig) { this.world.setBlockRaw(e.x, e.y, e.z, e.orig); this.touched.add(this.world.chunkKeyAt(e.x, e.z)); this.stats.restored++; }
      this.restoreDone++;
    }
  }
  _finishRestore() {
    this.restoreIter = null;
    this.journal.clear();
    if (this.game.save) this.game.save.clearDisasterCells();
    this.state = 'idle';
    if (this.game.npcs) this.game.npcs.clearAlert();
    if (this.game.animals) this.game.animals.clearAlert();
    this.say('Area restored.');
    if (this.pendingReplay) { const c = this.pendingReplay; this.pendingReplay = null; this.apply(c, false); }
    this._notify();
  }

  // ---------------------------------------------------------------- simulation (20 TPS)
  simTick() {
    this.editsThisTick = 0;
    if (this.state === 'restoring') { this._restoreStep(); return; }
    if (this.state === 'running' && this.active) {
      this.tick++;
      this.active.tick = this.tick;
      try { this.active.simulate(); } catch (e) { console.error('disaster tick failed', e); this.active.stop(); this.state = 'finished'; }
      if (this.active.done) { this.state = 'finished'; this.say(`${this.active.constructor.label} ended.`); this._notify(); }
      // deterministic testing aid: pause exactly at a given tick
      if (this.pauseAtTick && this.tick >= this.pauseAtTick && this.state === 'running') { this.state = 'paused'; this.pauseAtTick = null; this._notify(); }
      if ((this.tick & 15) === 0) this._notify();
    } else if (this.state === 'finished' && this.active) {
      // let visuals wind down; the disaster sets done when quiet
      this.active.tick = ++this.tick;
      if (!this.active.done) { try { this.active.simulate(); } catch (e) { this.active.done = true; } }
    }
  }

  // ---------------------------------------------------------------- per frame
  update(dt, alpha, camera) {
    this.effects.update(dt);
    if (this.active) {
      try { this.active.render(dt, alpha, camera); } catch (e) { console.error('disaster render failed', e); this._disposeActive(); this.state = 'idle'; }
    }
    if (this.state !== 'paused') this.debris.update(dt, camera);
    this._flushChunks();
  }

  // Relight + remesh chunks touched by bulk edits, within per-frame budgets.
  // - a chunk that keeps receiving edits is relit once it has been quiet for 2 frames (or when the queue is long),
  //   not every frame;
  // - after a relight only the neighbours whose shared border light actually changed are remeshed
  //   (a full relight used to dirty all 8 neighbours = up to 9 remeshes per touched chunk);
  // - the relight budget adapts to the last frame time.
  _flushChunks() {
    this.frameNo = (this.frameNo || 0) + 1;
    if (!this.pendingRelight) this.pendingRelight = new Map();
    for (const k of this.touched) this.pendingRelight.set(k, this.frameNo);
    this.touched.clear();
    // time-based budget: while the disaster runs keep relighting cheap; afterwards catch up faster so no stale
    // water/light lingers on slow machines. At least one chunk per frame always makes progress.
    const running = this.state === 'running';
    const maxMs = running ? 5 : 9, maxN = running ? BUDGET.relightPerFrame : BUDGET.relightPerFrame * 2;
    const urgent = this.pendingRelight.size > 12;
    const t0 = performance.now();
    let n = 0;
    for (const [key, lastTouch] of this.pendingRelight) {
      if (n >= maxN || (n >= 1 && performance.now() - t0 > maxMs)) break;
      if (!urgent && this.frameNo - lastTouch < 2) continue; // still being edited: coalesce
      this.pendingRelight.delete(key);
      const c = this.world.chunks.get(key);
      if (!c || !c.generated) continue;
      const before = this._borderSnapshot(c);
      this.world.relightChunk(c, false);
      this._dirtyChangedNeighbors(c, before);
      n++;
    }
    if (n > 0 || this.pendingRelight.size === 0) this.game.terrain.remeshDirty(BUDGET.remeshPerFrame, this.game.player.pos.x, this.game.player.pos.z);
    if (n > 0 && this.game.npcs) this.game.npcs.onBulkWorldChange();
  }

  // Copies the four border columns of sky+block light (used to detect which neighbours need a remesh)
  _borderSnapshot(c) {
    const H = c.sky.length / (CS * CS);
    const grab = (arr, lx, lz) => arr.slice((lx * CS + lz) * H, (lx * CS + lz) * H + H);
    const snap = { west: [], east: [], north: [], south: [] };
    for (let k = 0; k < CS; k++) {
      snap.west.push(grab(c.sky, 0, k), grab(c.light, 0, k)); snap.east.push(grab(c.sky, CS - 1, k), grab(c.light, CS - 1, k));
      snap.north.push(grab(c.sky, k, 0), grab(c.light, k, 0)); snap.south.push(grab(c.sky, k, CS - 1), grab(c.light, k, CS - 1));
    }
    return snap;
  }
  _dirtyChangedNeighbors(c, before) {
    const H = c.sky.length / (CS * CS);
    const same = (a, arr, lx, lz) => { const o = (lx * CS + lz) * H; for (let i = 0; i < H; i++) if (a[i] !== arr[o + i]) return false; return true; };
    const changed = { west: false, east: false, north: false, south: false };
    for (let k = 0; k < CS && !(changed.west && changed.east && changed.north && changed.south); k++) {
      if (!changed.west && (!same(before.west[k * 2], c.sky, 0, k) || !same(before.west[k * 2 + 1], c.light, 0, k))) changed.west = true;
      if (!changed.east && (!same(before.east[k * 2], c.sky, CS - 1, k) || !same(before.east[k * 2 + 1], c.light, CS - 1, k))) changed.east = true;
      if (!changed.north && (!same(before.north[k * 2], c.sky, k, 0) || !same(before.north[k * 2 + 1], c.light, k, 0))) changed.north = true;
      if (!changed.south && (!same(before.south[k * 2], c.sky, k, CS - 1) || !same(before.south[k * 2 + 1], c.light, k, CS - 1))) changed.south = true;
    }
    const mark = (dx, dz) => { const n = this.world.getChunk(c.cx + dx, c.cz + dz); if (n) n.dirty = true; };
    if (changed.west) { mark(-1, 0); if (changed.north) mark(-1, -1); if (changed.south) mark(-1, 1); }
    if (changed.east) { mark(1, 0); if (changed.north) mark(1, -1); if (changed.south) mark(1, 1); }
    if (changed.north) mark(0, -1);
    if (changed.south) mark(0, 1);
  }

  // Convenience for disasters: iterate blocks in a disc at a y range calling fn(x,y,z,id)
  forEachBlockInDisc(cx, cz, radius, y0, y1, fn) {
    const r2 = radius * radius;
    for (let x = Math.floor(cx - radius); x <= Math.ceil(cx + radius); x++) for (let z = Math.floor(cz - radius); z <= Math.ceil(cz + radius); z++) {
      const dx = x + 0.5 - cx, dz = z + 0.5 - cz;
      if (dx * dx + dz * dz > r2) continue;
      for (let y = y0; y <= y1; y++) { const id = this.world.getBlock(x, y, z); if (id !== B.AIR) fn(x, y, z, id); }
    }
  }

  // Estimated number of non-air blocks that would be affected in a disc (for warnings)
  countBlocksInDisc(cx, cz, radius, y0, y1) { let n = 0; this.forEachBlockInDisc(cx, cz, radius, y0, y1, () => n++); return n; }

  // Structural weakness used by all disasters: lower = destroyed more easily (0..1)
  static fragility(id) {
    const d = BLOCKS[id];
    if (!d || id === B.AIR || id === B.BEDROCK || id === B.WATER) return 0;
    if (d.shape !== 0) return 1.0;                                 // plants, fences, slabs, doors, signs...
    switch (d.sound) {
      case 'glass': return 1.0; case 'cloth': return 0.95; case 'grass': return 0.9; case 'wood': return 0.7;
      case 'gravel': case 'sand': return 0.6; case 'metal': return 0.4; default: return 0.3;              // stone/brick
    }
  }
  static chunkKey(x, z) { return Math.floor(x / CS) * 100000 + Math.floor(z / CS); }
}
