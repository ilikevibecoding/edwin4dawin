#!/usr/bin/env node
// Frontier Craft multiplayer server: WebSocket relay + authority for player positions, block edits and
// synchronized disaster commands. Run with `npm run server` (env PORT, ADMIN_TOKEN, STATS_INTERVAL seconds).
//
// Protocol (JSON text frames) -------------------------------------------------------------------------
//   client -> server
//     {t:'hello', name, adminToken}                       first message; admin iff adminToken === ADMIN_TOKEN
//     {t:'pos', x,y,z,yaw,pitch,held,sneak,sprint}         player state, <= 10 Hz
//     {t:'block', x,y,z,id}                                a block edit (relayed to everyone else)
//     {t:'cmd', cmd}                                       disaster command (admins only)
//     {t:'ping', n}                                        -> {t:'pong', n, tick}
//   server -> client
//     {t:'welcome', id, tick, admin, players:[...], blocks:[[x,y,z,id],...], log:[cmd,...]}
//     {t:'players', tick, list:[{id,name,x,y,z,yaw,pitch,held,sneak,sprint}]}   10 Hz, players within 160 blocks
//     {t:'join', id, name}  {t:'leave', id}
//     {t:'block', x,y,z,id, from}
//     {t:'cmd', cmd}        broadcast to everyone incl. the sender; cmd carries id, tick, startTick, seed, by
//     {t:'tick', tick}      every second
//     {t:'pong', n, tick}
//     {t:'deny', reason, cmd?}
// The server keeps a 20 Hz tick counter since start; scheduled commands (start/preview/replay) are stamped
// startTick = tick + 10 so every client applies them on the same simulation tick.
import { WebSocketServer } from 'ws';

const PORT = parseInt(process.env.PORT || '8765', 10);
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'admin';
const STATS_INTERVAL = parseFloat(process.env.STATS_INTERVAL || '10');

const TICK_RATE = 20;
const TICK_MS = 1000 / TICK_RATE;
const PLAYERS_HZ = 10;
const INTEREST_RADIUS = 160;
const START_DELAY_TICKS = 10;
const MAX_MESSAGE_BYTES = 16 * 1024;
const MAX_BLOCKS = 200000;         // remembered block edits (latest state per cell)
const MAX_LOG = 50;                // disaster commands kept for late joiners
const MAX_NAME = 16;
const CMD_RATE_MS = 1000;          // 1 command / second / client
const BLOCK_RATE = 60;             // block edits / second / client (token bucket)
const POS_RATE = 30;               // hard ceiling on pos messages / second / client
const PARAM_LIMIT = 5000;
const WORLD_H = 128;
const DISASTER_TYPES = new Set(['tsunami', 'tornado', 'beam']);
const SCHEDULED = new Set(['start', 'preview', 'replay']);
const IMMEDIATE = new Set(['pause', 'resume', 'stop', 'set', 'reset']);
// used to auto-expire the "running" state when the admin never sends stop/reset (seconds)
const DEFAULT_DURATION = { tornado: 75, tsunami: 60, beam: 18 };
const EXPIRE_GRACE_S = 60;

const t0 = Date.now();
const tickNow = () => Math.floor((Date.now() - t0) / TICK_MS);
const stamp = () => new Date().toISOString().slice(11, 19);
const log = (...a) => console.log(`[${stamp()}]`, ...a);

const clients = new Map();          // id -> client record
let nextId = 1;
let nextCmdId = 1;
const blocks = new Map();           // "x,y,z" -> [x,y,z,id]
const cmdLog = [];                  // relayed disaster commands (capped)
const disaster = { state: 'idle', start: null, expiresTick: 0 };
const stats = { msgsIn: 0, msgsOut: 0, bytesIn: 0, bytesOut: 0, denied: 0, malformed: 0, joins: 0, leaves: 0 };

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const round = (v, d) => Math.round(v * d) / d;

function send(c, obj) {
  if (c.ws.readyState !== 1) return;
  const s = typeof obj === 'string' ? obj : JSON.stringify(obj);
  c.ws.send(s);
  c.msgsOut++; c.bytesOut += s.length;
  stats.msgsOut++; stats.bytesOut += s.length;
}
function broadcast(obj, except = null) {
  const s = JSON.stringify(obj);
  for (const c of clients.values()) if (c.ready && c !== except) send(c, s);
}
function deny(c, reason, cmd) {
  stats.denied++;
  send(c, cmd ? { t: 'deny', reason, cmd: { type: cmd.type, disaster: cmd.disaster } } : { t: 'deny', reason });
}

function playerState(c) {
  const p = c.pos;
  return { id: c.id, name: c.name, x: p.x, y: p.y, z: p.z, yaw: p.yaw, pitch: p.pitch, held: p.held, sneak: p.sneak, sprint: p.sprint };
}

// ------------------------------------------------------------------------------------------ disasters
function clampParams(params) {
  if (!params || typeof params !== 'object' || Array.isArray(params)) return {};
  const out = {};
  let n = 0;
  for (const [k, v] of Object.entries(params)) {
    if (++n > 32 || typeof k !== 'string' || k.length > 32) break;
    if (isNum(v)) out[k] = clamp(v, -PARAM_LIMIT, PARAM_LIMIT);
    else if (typeof v === 'boolean') out[k] = v;
    else if (typeof v === 'string') out[k] = v.slice(0, 32);
    else if (Array.isArray(v) && v.length <= 4 && v.every(isNum)) out[k] = v.map((x) => clamp(x, -PARAM_LIMIT, PARAM_LIMIT));
  }
  return out;
}

function pushLog(cmd) {
  cmdLog.push(cmd);
  while (cmdLog.length > MAX_LOG) {
    // never drop the start command of the disaster that is still running
    const i = cmdLog.findIndex((c) => c !== disaster.start);
    if (i < 0) break;
    cmdLog.splice(i, 1);
  }
}

function expectedEndTick(cmd) {
  const p = cmd.params || {};
  const dur = isNum(p.duration) ? p.duration : (DEFAULT_DURATION[cmd.disaster] || 60);
  const charge = isNum(p.chargeTime) ? p.chargeTime : (cmd.disaster === 'beam' ? 10 : 0);
  return cmd.startTick + Math.round((dur + charge + EXPIRE_GRACE_S) * TICK_RATE);
}

function refreshDisasterState(tick) {
  if (disaster.state === 'running' && tick > disaster.expiresTick) {
    log(`disaster ${disaster.start ? disaster.start.disaster : ''} expired (no stop/reset received) -> idle`);
    disaster.state = 'idle';
  }
}

function handleCommand(c, raw) {
  const tick = tickNow();
  refreshDisasterState(tick);
  if (!c.admin) return deny(c, 'Disaster controls require administrator permission.', raw);
  if (!raw || typeof raw !== 'object' || typeof raw.type !== 'string') return deny(c, 'Malformed command.');
  const type = raw.type;
  if (!SCHEDULED.has(type) && !IMMEDIATE.has(type)) return deny(c, `Unknown command type "${type.slice(0, 20)}".`, raw);
  const now = Date.now();
  if (now - c.lastCmdAt < CMD_RATE_MS) return deny(c, 'Too many commands (limit 1 per second).', raw);
  c.lastCmdAt = now;

  const cmd = { type, id: nextCmdId++, tick, by: c.id };
  if (type === 'start' || type === 'preview') {
    if (!DISASTER_TYPES.has(raw.disaster)) return deny(c, 'Unknown disaster type.', raw);
    if (disaster.state === 'running') return deny(c, `A ${disaster.start.disaster} is already running; stop or reset it first.`, raw);
    cmd.disaster = raw.disaster;
    cmd.params = clampParams(raw.params);
    cmd.seed = isNum(raw.seed) ? (raw.seed >>> 0) : (Math.random() * 0x100000000) >>> 0;
    cmd.startTick = tick + START_DELAY_TICKS;
  } else if (type === 'replay') {
    const last = raw.command && typeof raw.command === 'object' && DISASTER_TYPES.has(raw.command.disaster) ? raw.command : disaster.start;
    if (!last) return deny(c, 'Nothing to replay.', raw);
    cmd.disaster = last.disaster;
    cmd.command = { type: 'start', disaster: last.disaster, params: clampParams(last.params), seed: isNum(last.seed) ? (last.seed >>> 0) : cmd.id };
    cmd.seed = cmd.command.seed;
    cmd.params = cmd.command.params;
    cmd.startTick = tick + START_DELAY_TICKS;
  } else if (type === 'set') {
    cmd.params = clampParams(raw.params);
    if (raw.disaster && DISASTER_TYPES.has(raw.disaster)) cmd.disaster = raw.disaster;
  } else if (type === 'pause' || type === 'resume') {
    if (disaster.state !== 'running') return deny(c, 'No disaster is running.', raw);
  }

  // server-side state machine: one disaster at a time
  switch (type) {
    case 'start': case 'replay':
      disaster.state = 'running';
      disaster.start = type === 'start' ? cmd : { ...cmd.command, startTick: cmd.startTick, id: cmd.id, tick: cmd.tick };
      disaster.expiresTick = expectedEndTick(disaster.start);
      break;
    case 'stop': case 'reset':
      disaster.state = 'idle';
      disaster.start = null;
      break;
    default: break;
  }
  pushLog(cmd);
  broadcast({ t: 'cmd', cmd });
  log(`cmd #${cmd.id} ${type}${cmd.disaster ? ' ' + cmd.disaster : ''} by ${c.name}#${c.id}${cmd.startTick != null ? ` startTick=${cmd.startTick}` : ''}${cmd.seed != null ? ` seed=${cmd.seed}` : ''} -> ${disaster.state}`);
}

// ------------------------------------------------------------------------------------------ messages
function handleHello(c, m) {
  if (c.ready) return deny(c, 'Already joined.');
  let name = typeof m.name === 'string' ? m.name.replace(/[^\w \-.'!]/g, '').trim().slice(0, MAX_NAME) : '';
  if (!name) name = `Player${c.id}`;
  c.name = name;
  c.admin = typeof m.adminToken === 'string' && m.adminToken.length > 0 && m.adminToken === ADMIN_TOKEN;
  c.ready = true;
  const tick = tickNow();
  refreshDisasterState(tick);
  const players = [];
  for (const o of clients.values()) if (o !== c && o.ready && o.hasPos) players.push(playerState(o));
  send(c, { t: 'welcome', id: c.id, tick, admin: c.admin, players, blocks: [...blocks.values()], log: cmdLog.slice() });
  broadcast({ t: 'join', id: c.id, name: c.name }, c);
  stats.joins++;
  log(`join ${c.name}#${c.id} (${c.addr})${c.admin ? ' [admin]' : ''} - ${clients.size} online`);
}

function handlePos(c, m) {
  const now = Date.now();
  if (now - c.posWindowStart >= 1000) { c.posWindowStart = now; c.posCount = 0; }
  if (++c.posCount > POS_RATE) return;
  if (!isNum(m.x) || !isNum(m.y) || !isNum(m.z)) return;
  const p = c.pos;
  p.x = round(clamp(m.x, -1e6, 1e6), 100); p.y = round(clamp(m.y, -64, 512), 100); p.z = round(clamp(m.z, -1e6, 1e6), 100);
  p.yaw = isNum(m.yaw) ? round(m.yaw, 1000) : 0;
  p.pitch = isNum(m.pitch) ? round(clamp(m.pitch, -1.6, 1.6), 1000) : 0;
  p.held = Number.isInteger(m.held) ? clamp(m.held, 0, 255) : 0;
  p.sneak = !!m.sneak;
  p.sprint = !!m.sprint;
  c.hasPos = true;
}

function handleBlock(c, m) {
  const now = Date.now();
  // token bucket: BLOCK_RATE per second, burst of BLOCK_RATE
  c.blockTokens = Math.min(BLOCK_RATE, c.blockTokens + (now - c.blockTokensAt) * BLOCK_RATE / 1000);
  c.blockTokensAt = now;
  if (c.blockTokens < 1) { if (!c.blockWarned) { c.blockWarned = true; deny(c, 'Too many block edits (limit 60 per second).'); } return; }
  c.blockTokens -= 1; c.blockWarned = false;
  if (!Number.isInteger(m.x) || !Number.isInteger(m.y) || !Number.isInteger(m.z) || !Number.isInteger(m.id)) return;
  if (m.y < 0 || m.y >= WORLD_H || Math.abs(m.x) > 1e6 || Math.abs(m.z) > 1e6 || m.id < 0 || m.id > 255) return;
  const key = `${m.x},${m.y},${m.z}`;
  if (!blocks.has(key) && blocks.size >= MAX_BLOCKS) { const first = blocks.keys().next().value; blocks.delete(first); }
  blocks.set(key, [m.x, m.y, m.z, m.id]);
  broadcast({ t: 'block', x: m.x, y: m.y, z: m.z, id: m.id, from: c.id }, c);
}

function onMessage(c, data, isBinary) {
  stats.msgsIn++; c.msgsIn++;
  const len = data.length;
  stats.bytesIn += len; c.bytesIn += len;
  if (isBinary || len > MAX_MESSAGE_BYTES) { stats.malformed++; return; }
  let m;
  try { m = JSON.parse(data.toString()); } catch (e) { stats.malformed++; return; }
  if (!m || typeof m !== 'object' || typeof m.t !== 'string') { stats.malformed++; return; }
  if (m.t === 'hello') return handleHello(c, m);
  if (!c.ready) return deny(c, 'Send hello first.');
  switch (m.t) {
    case 'pos': return handlePos(c, m);
    case 'block': return handleBlock(c, m);
    case 'cmd': return handleCommand(c, m.cmd);
    case 'ping': return send(c, { t: 'pong', n: isNum(m.n) ? m.n : 0, tick: tickNow() });
    case 'stats': return c.admin ? send(c, { t: 'stats', tick: tickNow(), clients: clients.size, ...stats }) : deny(c, 'Administrator permission required.');
    default: stats.malformed++; return;
  }
}

// ------------------------------------------------------------------------------------------ server
const wss = new WebSocketServer({ port: PORT, maxPayload: MAX_MESSAGE_BYTES, perMessageDeflate: false });

wss.on('connection', (ws, req) => {
  const id = nextId++;
  const now = Date.now();
  const c = {
    id, ws, addr: (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '?').toString(), name: `Player${id}`, admin: false, ready: false,
    hasPos: false, pos: { x: 0, y: 0, z: 0, yaw: 0, pitch: 0, held: 0, sneak: false, sprint: false },
    lastCmdAt: 0, blockTokens: BLOCK_RATE, blockTokensAt: now, blockWarned: false, posWindowStart: now, posCount: 0,
    msgsIn: 0, msgsOut: 0, bytesIn: 0, bytesOut: 0, alive: true, lastListEmpty: true,
  };
  clients.set(id, c);
  ws.on('message', (data, isBinary) => { try { onMessage(c, data, isBinary); } catch (e) { log('message handler failed', e); } });
  ws.on('pong', () => { c.alive = true; });
  ws.on('error', (e) => log(`socket error #${id}: ${e.message}`));
  ws.on('close', () => {
    clients.delete(id);
    if (c.ready) {
      stats.leaves++;
      broadcast({ t: 'leave', id });
      log(`leave ${c.name}#${id} - ${clients.size} online (in ${c.msgsIn} msgs/${c.bytesIn} B, out ${c.msgsOut} msgs/${c.bytesOut} B)`);
    }
  });
  // a client that never says hello is dropped
  setTimeout(() => { if (!c.ready && ws.readyState === 1) ws.close(4000, 'no hello'); }, 10000);
});

// players broadcast at 10 Hz with interest management
setInterval(() => {
  const tick = tickNow();
  const list = [...clients.values()].filter((c) => c.ready && c.hasPos);
  for (const c of clients.values()) {
    if (!c.ready) continue;
    const near = [];
    for (const o of list) {
      if (o === c) continue;
      if (!c.hasPos) { near.push(playerState(o)); continue; }
      const dx = o.pos.x - c.pos.x, dz = o.pos.z - c.pos.z;
      if (dx * dx + dz * dz <= INTEREST_RADIUS * INTEREST_RADIUS) near.push(playerState(o));
    }
    // skip repeated empty lists (saves idle traffic); one empty list tells the client everyone went out of range
    if (near.length === 0 && c.lastListEmpty) continue;
    c.lastListEmpty = near.length === 0;
    send(c, { t: 'players', tick, list: near });
  }
}, 1000 / PLAYERS_HZ);

// tick sync every second + connection liveness every 15 s
setInterval(() => {
  refreshDisasterState(tickNow());
  broadcast({ t: 'tick', tick: tickNow() });
}, 1000);
setInterval(() => {
  for (const c of clients.values()) {
    if (!c.alive) { log(`timeout ${c.name}#${c.id}`); c.ws.terminate(); continue; }
    c.alive = false;
    try { c.ws.ping(); } catch (e) { /* ignore */ }
  }
}, 15000);

function statsLine() {
  return `[stats] tick=${tickNow()} clients=${clients.size} msgsIn=${stats.msgsIn} msgsOut=${stats.msgsOut} bytesIn=${stats.bytesIn} bytesOut=${stats.bytesOut} denied=${stats.denied} malformed=${stats.malformed} blocks=${blocks.size} log=${cmdLog.length} disaster=${disaster.state}`;
}
if (STATS_INTERVAL > 0) setInterval(() => log(statsLine()), STATS_INTERVAL * 1000);

function shutdown(sig) {
  log(`${sig} received, shutting down`);
  log(statsLine());
  for (const c of clients.values()) { try { c.ws.close(1001, 'server shutdown'); } catch (e) { /* ignore */ } }
  wss.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 500).unref();
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGUSR2', () => log(statsLine()));

wss.on('listening', () => log(`Frontier Craft server listening on ws://0.0.0.0:${PORT} (admin token ${ADMIN_TOKEN === 'admin' ? 'is the default "admin" - set ADMIN_TOKEN' : 'set'}, ${TICK_RATE} Hz tick)`));
wss.on('error', (e) => { log(`server error: ${e.message}`); process.exit(1); });
