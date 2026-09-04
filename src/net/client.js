// Multiplayer client: WebSocket connection to server/index.mjs, remote player avatars, block edit
// replication and server-synchronized disaster commands.
//
// Interface contract used by game.js and DisasterManager:
//   const net = new NetClient(game, url);  net.connect();  net.connected (bool)
//   net.tick()            - called every game tick (20/s): send player state, process queued messages
//   net.update(dt, alpha) - called every frame: interpolate/render remote players
//   net.sendBlock(x,y,z,id)   - relay a local block edit
//   net.sendCommand(cmd)      - send a disaster command; the server echoes it (with startTick/seed) and the client
//                               then calls game.disasters.apply(cmd, true) at the right tick
//   net.stats -> {bytesIn, bytesOut, msgsIn, msgsOut, players, ping}
//   game.permissions.setOnline(true, isAdmin) once the server answers the hello.
//
// Time sync: each ping/pong exchange yields an NTP-style sample of (server clock - local clock); network or
// main-thread delays can only make a sample smaller, so the largest sample in a sliding window is the best
// estimate. It gives estimatedServerTick(), which schedules commands and clocks the disaster simulation.
// While connected the disaster simulation is stepped by this
// client from a 50 ms timer following the server clock (both directions), not by the frame loop, so slow or
// paused frames (software GL, background tab) cannot desynchronize clients: game.disasters.simTick is
// wrapped at runtime for that (see _installDisasterClock; game.js could instead skip its own simTick()
// call when `game.net.drivesDisasterClock`).
import { RemotePlayers } from './remotePlayers.js';
import { CHUNK_SIZE as CS, CHUNK_HEIGHT as CH } from '../constants.js';

const TICK_MS = 50;
const POS_EVERY_TICKS = 2;           // 10 Hz
const PING_INTERVAL_MS = 2000;
const PING_FAST_MS = 250;            // ping cadence right after connecting (quick clock convergence)
const PING_FAST_FOR_MS = 4000;
const SYNC_WINDOW_MS = 12000;        // sliding window for clock offset samples
const MAX_FAST_FORWARD = 1200;       // ticks simulated for a late joiner (60 s); older history is skipped
const FF_SYNC_BUDGET_MS = 50;        // fast-forward work done synchronously on welcome ...
const FF_FRAME_BUDGET_MS = 30;       // ... then per frame until caught up
const MAX_CATCH_UP = 40;             // simulation ticks run per clock step when behind
const RECONNECT_MIN_MS = 1000;
const RECONNECT_MAX_MS = 15000;
const IMMEDIATE = new Set(['pause', 'resume', 'stop', 'set', 'reset']);
const SCHEDULED = new Set(['start', 'preview', 'replay']);

const r2 = (v) => Math.round(v * 100) / 100;
const r3 = (v) => Math.round(v * 1000) / 1000;
const normAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));

export class NetClient {
  constructor(game, url) {
    this.game = game;
    this.url = url;
    this.connected = false;
    this.stats = { bytesIn: 0, bytesOut: 0, msgsIn: 0, msgsOut: 0, players: 0, ping: 0 };
    this.id = null;
    this.admin = false;
    const params = new URLSearchParams(location.search);
    this.name = (params.get('name') || '').slice(0, 16);
    this.log = params.has('netlog');
    this.ws = null;
    this.disposed = false;
    this.remote = new RemotePlayers(game);
    this.blocks = new Map();        // "cx,cz" -> Map("x,y,z" -> [x,y,z,id]); every edit the server told us about
    this.queue = [];                // disaster commands waiting to be applied (FIFO, scheduled ones wait for startTick)
    this.pendingLog = null;         // welcome.log waiting to be replayed (late join / reconnect)
    this.replay = null;             // generator: late-join fast-forward in progress
    this.sync = null;               // {startTick, pausedTicks, pausedAt} of the running disaster
    this.clockOffset = null;        // server ms - performance.now() ms
    this.offsetSamples = [];
    this.pingMin = 0;               // best round trip seen on this connection
    this.pingSeq = 0;
    this.pingSent = new Map();
    this.lastPingAt = 0;
    this.connectedAt = 0;
    this.timer = null;
    this.drivesDisasterClock = true;
    this.clockAccum = 0;
    this.lastClockAt = 0;
    this._simTick = null;           // original DisasterManager.simTick
    this.reconnectDelay = RECONNECT_MIN_MS;
    this.reconnectTimer = null;
    this.lastPos = null;
    this.posCountdown = 0;
    this.lastDeny = null;
    this.denied = 0;
    this.serverStats = null;
    this.tickCount = 0;
    this._hookChunkGeneration();
    this._installDisasterClock();
  }

  // ------------------------------------------------------------------------------------ connection
  connect() {
    if (this.disposed || (this.ws && this.ws.readyState <= 1)) return;
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
    this._installDisasterClock();
    let ws;
    try { ws = new WebSocket(this.url); } catch (e) { console.warn('net: bad server url', this.url, e); this._scheduleReconnect(); return; }
    this.ws = ws;
    ws.onopen = () => { this.reconnectDelay = RECONNECT_MIN_MS; this._send({ t: 'hello', name: this.name, adminToken: this.game.permissions.adminToken }); };
    ws.onmessage = (ev) => this._onMessage(ev);
    ws.onclose = () => this._onClose(ws);
    ws.onerror = () => { /* close follows */ };
    if (!this.timer) { this.lastClockAt = performance.now(); this.clockAccum = 0; this.timer = setInterval(() => this._onTimer(), TICK_MS); }
  }

  _onClose(ws) {
    if (ws !== this.ws) return;
    const was = this.connected;
    this.connected = false;
    this.ws = null;
    this.id = null;
    this.admin = false;
    this.queue.length = 0;
    this.replay = null;
    this.pendingLog = null;
    this.clockOffset = null;
    this.offsetSamples.length = 0;
    this.pingMin = 0;
    this.sync = null;
    this.lastPos = null;
    this.pingSent.clear();
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    this.stats.players = 0;
    this.remote.clear();
    this.game.permissions.setOnline(false);
    if (this.game.disasters) this.game.disasters.serverTick = null;
    if (was && this.game.hud) this.game.hud.addMessage('Disconnected from server - reconnecting...');
    this._scheduleReconnect();
  }

  _scheduleReconnect() {
    if (this.disposed || this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => { this.reconnectTimer = null; this.connect(); }, this.reconnectDelay);
    this.reconnectDelay = Math.min(RECONNECT_MAX_MS, this.reconnectDelay * 2);
  }

  dispose() {
    this.disposed = true;
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    if (this.ws) { try { this.ws.close(1000, 'client closed'); } catch (e) { /* ignore */ } }
    this.ws = null;
    this.connected = false;
    this.remote.dispose();
    this.game.permissions.setOnline(false);
  }

  _send(obj) {
    if (!this.ws || this.ws.readyState !== 1) return false;
    const s = JSON.stringify(obj);
    this.ws.send(s);
    this.stats.msgsOut++;
    this.stats.bytesOut += s.length;
    return true;
  }

  // ------------------------------------------------------------------------------------ outgoing
  sendBlock(x, y, z, id) {
    if (!this.connected) return;
    this._rememberBlock(x, y, z, id);
    this._send({ t: 'block', x, y, z, id });
  }

  sendCommand(cmd) {
    if (!this.connected) { this.game.disasters.apply(cmd, false); return; }
    const { id, ...rest } = cmd; // the server assigns command ids
    this._send({ t: 'cmd', cmd: rest });
  }

  requestServerStats() { return this._send({ t: 'stats' }); }

  _sendPos(force = false) {
    const p = this.game.player;
    if (!p) return;
    const held = this.game.inventory ? this.game.inventory.held : null;
    const s = { t: 'pos', x: r2(p.pos.x), y: r2(p.pos.y), z: r2(p.pos.z), yaw: r3(normAngle(p.yaw)), pitch: r3(p.pitch), held: held ? held.id : 0, sneak: !!p.sneaking, sprint: !!p.sprinting };
    const l = this.lastPos;
    if (!force && l && l.x === s.x && l.y === s.y && l.z === s.z && l.yaw === s.yaw && l.pitch === s.pitch && l.held === s.held && l.sneak === s.sneak && l.sprint === s.sprint) return;
    this.lastPos = s;
    this._send(s);
  }

  // ------------------------------------------------------------------------------------ incoming
  _onMessage(ev) {
    const data = ev.data;
    if (typeof data !== 'string') return;
    this.stats.msgsIn++;
    this.stats.bytesIn += data.length;
    let m;
    try { m = JSON.parse(data); } catch (e) { return; }
    if (!m || typeof m !== 'object') return;
    switch (m.t) {
      case 'welcome': this._onWelcome(m); break;
      case 'players': if (Array.isArray(m.list)) this.remote.onList(m.list); break;
      case 'join': this.remote.onJoin(m.id, m.name); if (this.game.hud) this.game.hud.addMessage(`${m.name} joined the frontier.`); break;
      case 'leave': { const p = this.remote.players.get(m.id); if (p && this.game.hud) this.game.hud.addMessage(`${p.name} left.`); this.remote.onLeave(m.id); break; }
      case 'block': this._applyBlock(m.x, m.y, m.z, m.id, true); this.remote.swing(m.from); break;
      case 'cmd': if (m.cmd && typeof m.cmd === 'object') { this.queue.push(m.cmd); if (this.log) console.log('[net] cmd', JSON.stringify(m.cmd)); } break;
      case 'tick': if (this.clockOffset === null) this._addOffsetSample(m.tick * TICK_MS - performance.now()); break;
      case 'pong': {
        const sent = this.pingSent.get(m.n);
        if (sent !== undefined && Number.isFinite(m.tick)) {
          this.pingSent.delete(m.n);
          const now = performance.now();
          const rtt = now - sent;
          this.stats.ping = this.stats.ping ? this.stats.ping * 0.7 + rtt * 0.3 : rtt;
          this.pingMin = this.pingMin ? Math.min(this.pingMin, rtt) : rtt;
          // NTP-style: the server stamped its tick midway through the round trip
          this._addOffsetSample(m.tick * TICK_MS - (sent + now) / 2);
        }
        break;
      }
      case 'deny': this.denied++; this.lastDeny = m.reason; if (this.game.hud) this.game.hud.addMessage('Server: ' + m.reason); break;
      case 'stats': this.serverStats = m; break;
      default: break;
    }
  }

  _onWelcome(m) {
    this.id = m.id;
    this.admin = !!m.admin;
    this.connected = true;
    this.connectedAt = performance.now();
    this.clockOffset = null;
    this.offsetSamples.length = 0;
    this.pingMin = 0;
    this._addOffsetSample(m.tick * TICK_MS - performance.now()); // first (conservative) estimate; pongs refine it
    this.game.permissions.setOnline(true, this.admin);
    if (Array.isArray(m.players)) this.remote.onList(m.players);
    if (Array.isArray(m.blocks)) {
      for (const b of m.blocks) if (Array.isArray(b) && b.length >= 4) this._applyBlock(b[0], b[1], b[2], b[3], false);
      if (m.blocks.length) this.game.terrain.remeshDirty(64, this.game.player.pos.x, this.game.player.pos.z);
    }
    // disaster state: a reconnecting client resets first, then replays the server's log
    const d = this.game.disasters;
    this.queue.length = 0;
    this.sync = null;
    if (d && d.state !== 'idle') d.apply({ type: 'reset' }, true);
    this.pendingLog = Array.isArray(m.log) ? m.log : [];
    this.lastClockAt = performance.now();
    this.clockAccum = 0;
    this._sendPos(true);
    this.lastPingAt = 0;
    const others = Array.isArray(m.players) ? m.players.length : 0;
    if (this.game.hud) this.game.hud.addMessage(`Connected to ${this.url}${this.admin ? ' as administrator' : ''} (${others} other player${others === 1 ? '' : 's'} nearby).`);
    if (this.log) console.log('[net] welcome', JSON.stringify({ id: m.id, tick: m.tick, admin: m.admin, players: others, blocks: m.blocks ? m.blocks.length : 0, log: m.log ? m.log.length : 0 }));
  }

  // ------------------------------------------------------------------------------------ blocks
  _rememberBlock(x, y, z, id) {
    const key = `${Math.floor(x / CS)},${Math.floor(z / CS)}`;
    let m = this.blocks.get(key);
    if (!m) { m = new Map(); this.blocks.set(key, m); }
    m.set(`${x},${y},${z}`, [x, y, z, id]);
  }

  _applyBlock(x, y, z, id, remesh) {
    if (!Number.isInteger(x) || !Number.isInteger(y) || !Number.isInteger(z) || !Number.isInteger(id)) return;
    if (y < 0 || y >= CH) return;
    this._rememberBlock(x, y, z, id);
    const world = this.game.world;
    if (!world.isLoaded(x, z)) return; // applied when the chunk generates (see _hookChunkGeneration)
    if (!world.setBlock(x, y, z, id)) return;
    if (remesh) this.game.terrain.remeshDirtyNear(x, z);
    if (this.game.npcs) this.game.npcs.onWorldChanged(x, y, z);
  }

  // Server edits overlay freshly generated chunks (after the local save's overlay, so the server wins).
  _hookChunkGeneration() {
    const terrain = this.game.terrain;
    if (!terrain) return;
    const prev = terrain.onChunkGenerated;
    terrain.onChunkGenerated = (c) => {
      if (prev) prev(c);
      const m = this.blocks.get(`${c.cx},${c.cz}`);
      if (!m) return;
      for (const [x, y, z, id] of m.values()) c.blocks[((x & 15) * CS + (z & 15)) * CH + y] = id;
    };
  }

  // ------------------------------------------------------------------------------------ time sync
  // offset = server ms - local ms. Delays (network, a stalled main thread processing the message late) only
  // ever lower a sample, so the largest sample within the window is the estimate.
  _addOffsetSample(offset) {
    if (!Number.isFinite(offset)) return;
    const now = performance.now();
    const q = this.offsetSamples;
    q.push({ offset, t: now });
    while (q.length > 1 && now - q[0].t > SYNC_WINDOW_MS) q.shift();
    let best = -Infinity;
    for (const s of q) if (s.offset > best) best = s.offset;
    this.clockOffset = best;
  }

  // Fractional server tick right now (null until the first server message)
  estimatedServerTick() { return this.clockOffset === null ? null : (performance.now() + this.clockOffset) / TICK_MS; }
  get serverTick() { const e = this.estimatedServerTick(); return e === null ? null : Math.floor(e); }
  get replaying() { return !!this.replay || !!this.pendingLog; }

  // Simulation tick the running disaster should be at according to the server clock
  _expectedDisasterTick() {
    if (!this.sync) return null;
    if (this.sync.pausedAt !== null) return Math.floor(this.sync.pausedAt - this.sync.startTick - this.sync.pausedTicks);
    const est = this.estimatedServerTick();
    return est === null ? null : Math.floor(est - this.sync.startTick - this.sync.pausedTicks);
  }

  // ------------------------------------------------------------------------------------ disaster clock
  _installDisasterClock() {
    const d = this.game.disasters;
    if (!d || this._simTick) return;
    const orig = d.simTick.bind(d);
    this._simTick = orig;
    d.simTick = () => { if (this.connected && this.drivesDisasterClock) return; orig(); };
  }

  // Step the simulation: a running, server-scheduled disaster follows the server clock exactly (catching up
  // or waiting); other states (restoring, finished wind-down, locally started) run at a steady 20 Hz.
  _clockTick() {
    const d = this.game.disasters;
    const now = performance.now();
    if (!d || !this._simTick || !this.drivesDisasterClock) { this.lastClockAt = now; return; }
    if (this.replay || this.pendingLog) { this.lastClockAt = now; this.clockAccum = 0; return; }
    if (d.state === 'running' && this.sync) {
      const expected = this._expectedDisasterTick();
      if (expected !== null) {
        let n = Math.min(expected - d.tick, MAX_CATCH_UP);
        if (this.log && n > 2) console.log(`[net] clock: catching up ${n} ticks`);
        while (n-- > 0 && d.state === 'running') this._simTick();
      }
      this.clockAccum = 0;
    } else {
      this.clockAccum = Math.min(this.clockAccum + (now - this.lastClockAt), TICK_MS * MAX_CATCH_UP);
      while (this.clockAccum >= TICK_MS) { this.clockAccum -= TICK_MS; this._simTick(); }
    }
    this.lastClockAt = now;
  }

  // ------------------------------------------------------------------------------------ per tick
  tick() {
    this.tickCount++;
    const d = this.game.disasters;
    if (d) d.serverTick = this.serverTick;
    if (!this.connected) return;
    const now = performance.now();
    const pingEvery = now - this.connectedAt < PING_FAST_FOR_MS ? PING_FAST_MS : PING_INTERVAL_MS;
    if (now - this.lastPingAt >= pingEvery) {
      this.lastPingAt = now;
      const n = ++this.pingSeq;
      this.pingSent.set(n, now);
      if (this.pingSent.size > 8) this.pingSent.delete(this.pingSent.keys().next().value);
      this._send({ t: 'ping', n });
    }
    if (--this.posCountdown <= 0) { this.posCountdown = POS_EVERY_TICKS; this._sendPos(); }
    this.stats.players = this.remote.activeCount(now);
    this._advanceDisasters();
  }

  _onTimer() {
    if (!this.connected) return;
    this._advanceDisasters();
  }

  _advanceDisasters() {
    const d = this.game.disasters;
    if (!d) return;
    if (this.pendingLog && d.state !== 'restoring') { const l = this.pendingLog; this.pendingLog = null; this._startReplay(l); }
    if (!this.replay) this._processQueue();
    this._clockTick();
  }

  _processQueue() {
    const d = this.game.disasters;
    while (this.queue.length) {
      const cmd = this.queue[0];
      if (SCHEDULED.has(cmd.type)) {
        const est = this.estimatedServerTick();
        if (est === null || est < cmd.startTick) break;
        if (d.state === 'restoring') break; // a start right after a reset waits for the restore, then catches up
      }
      this.queue.shift();
      this._applyCommand(cmd);
    }
  }

  _applyCommand(cmd) {
    const d = this.game.disasters;
    const r = d.apply(cmd, true);
    if (!r || !r.ok) console.warn('net: command not applied:', cmd.type, r && r.reason);
    const at = Number.isFinite(cmd.tick) ? cmd.tick : this.estimatedServerTick();
    switch (cmd.type) {
      case 'start': this.sync = r && r.ok ? { startTick: cmd.startTick, pausedTicks: 0, pausedAt: null } : null; break;
      case 'preview': case 'stop': case 'reset': case 'replay': this.sync = null; break;
      case 'pause': if (this.sync && this.sync.pausedAt === null) this.sync.pausedAt = at; break;
      case 'resume': if (this.sync && this.sync.pausedAt !== null) { this.sync.pausedTicks += Math.max(0, at - this.sync.pausedAt); this.sync.pausedAt = null; } break;
      default: break;
    }
    if (this.log) console.log(`[net] applied ${cmd.type} at est ${this.serverTick} -> ${d.state}`);
  }

  // ------------------------------------------------------------------------------------ late join
  // Rebuild the disaster state from the server's command log: the last start/preview not followed by a
  // stop/reset is applied, then the simulation is fast-forwarded to the current server tick, honouring
  // pause/resume/set commands at the ticks they were issued.
  _startReplay(log) {
    let startIdx = -1;
    for (let k = 0; k < log.length; k++) {
      const c = log[k];
      if (!c || typeof c !== 'object') continue;
      if (c.type === 'stop' || c.type === 'reset') startIdx = -1;
      else if (SCHEDULED.has(c.type)) startIdx = k;
    }
    if (startIdx < 0) return;
    let S = log[startIdx];
    if (S.type === 'replay') S = S.command ? { ...S.command, type: 'start', id: S.id, tick: S.tick, startTick: S.startTick } : null;
    if (!S) return;
    const events = log.slice(startIdx + 1).filter((c) => c && (c.type === 'pause' || c.type === 'resume' || c.type === 'set'));
    const est = this.estimatedServerTick();
    if (est === null || est < S.startTick) { this.queue.unshift(S, ...events); return; } // not due yet: normal scheduling
    if (S.type === 'preview') { this._applyCommand(S); for (const e of events) this._applyCommand(e); return; }
    if (S.type !== 'start') return;
    const gen = this._replayGen(S, events);
    const t0 = performance.now();
    let step = gen.next();
    while (!step.done && performance.now() - t0 < FF_SYNC_BUDGET_MS) step = gen.next();
    if (!step.done) this.replay = gen;
  }

  *_replayGen(S, events) {
    const d = this.game.disasters;
    const simTick = this._simTick || d.simTick.bind(d);
    this._applyCommand(S);
    if (d.state !== 'running' || !this.sync) { this.sync = null; return; }
    // positions (in simulation ticks) at which the immediate commands were issued
    let pausedTicks = 0, pausedAt = null;
    const timeline = [];
    for (const ev of events) {
      const evTick = Number.isFinite(ev.tick) ? Math.max(ev.tick, S.startTick) : S.startTick;
      const pos = Math.max(0, Math.floor(evTick - S.startTick - pausedTicks - (pausedAt !== null ? evTick - pausedAt : 0)));
      timeline.push({ ev, pos });
      if (ev.type === 'pause' && pausedAt === null) pausedAt = evTick;
      if (ev.type === 'resume' && pausedAt !== null) { pausedTicks += evTick - pausedAt; pausedAt = null; }
    }
    this.sync = { startTick: S.startTick, pausedTicks, pausedAt };
    const total = this._expectedDisasterTick() || 0;
    const jump = Math.max(0, total - MAX_FAST_FORWARD);
    if (jump > 0 && d.active) { d.tick = jump; d.active.tick = jump; }
    const t0 = performance.now();
    let budgetStart = t0;
    let n = 0;
    const overBudget = () => performance.now() - budgetStart > FF_FRAME_BUDGET_MS;
    for (const { ev, pos } of timeline) {
      while (d.state === 'running' && d.tick < pos) {
        simTick(); n++;
        if (overBudget()) { yield; budgetStart = performance.now(); }
      }
      const r = d.apply(ev, true);
      if ((!r || !r.ok) && this.log) console.log('[net] replay event rejected', ev.type);
    }
    while (d.state === 'running') {
      const target = this._expectedDisasterTick();
      if (target === null || d.tick >= target) break;
      simTick(); n++;
      if (overBudget()) { yield; budgetStart = performance.now(); }
    }
    if (this.log) console.log(`[net] late-join replay: ${S.disaster} seed ${S.seed}, fast-forwarded ${n} ticks (skipped ${jump}) in ${(performance.now() - t0).toFixed(0)} ms -> tick ${d.tick}`);
  }

  // ------------------------------------------------------------------------------------ per frame
  update(dt) {
    if (this.replay) {
      const step = this.replay.next();
      if (step.done) this.replay = null;
    }
    this.remote.update(dt);
  }
}
