// Tsunami / flood disaster.
//
// A wave front (a straight line perpendicular to `direction`) starts at the edge of the affected disc and
// travels across it at `speed`. Behind the front every column rises to the flood level (57 + waterHeight)
// one block per RISE_TICKS, realised as real WATER blocks placed through the manager (journaled, budgeted).
// Columns are generated pre-sorted by their distance along the travel direction, so "passed" columns are a
// prefix of the list and the fill walks it back from the front (nearest to the crest first). Blocks hit by
// the crest are destroyed with probability damage * intensity * fragility (decided by a position hash so the
// world outcome never depends on iteration order or on what the pool/loading state happens to be) and turn
// into buoyant debris riding the flow. After `duration` the water drains layer by layer (top first, far side
// first) and the disaster ends. Everything visual (crest mesh, sea sheet, foam, sound, shake) lives in
// render() and never touches world state.
import { Disaster } from './base.js';
import { DisasterManager } from './manager.js';
import { BLOCKS, B, SHAPE } from '../blocks.js';
import { TOWN_GROUND, CHUNK_HEIGHT as CH } from '../constants.js';
import { TOWN_BOUNDS } from '../worldgen.js';
import { hash3, clamp } from '../rng.js';
import { WaveVisuals } from './tsunami/waveMesh.js';

const TPS = 20;
const RISE_TICKS = 12;            // one block of water level every 0.6 s in a passed column
const MAX_DEBRIS_PER_TICK = 12;
const MAX_DESTROY_PER_TICK = 40;  // block edits reserved for crest destruction (the rest floods)
const MAX_DRAIN_VISITS = 4000;    // cells inspected per tick while draining
const MAX_FOAM = 300;             // live foam/spray particles owned by the tsunami
const UNKNOWN = -32768;
const DIRS = { west: [1, 0], east: [-1, 0], north: [0, 1], south: [0, -1] };
const EV_CRACK = 0, EV_SPLASH = 1, EV_RUMBLE = 2;

// Cells the rising water may occupy: air and things a flood simply washes over.
function fillable(id) {
  if (id === B.AIR) return true;
  const d = BLOCKS[id];
  return !d.solid && (d.replaceable || d.shape === SHAPE.CROSS || id === B.TORCH);
}

export class Tsunami extends Disaster {
  static type = 'tsunami';
  static label = 'Tsunami & Flood';
  static description = 'A wall of water rolls in from one side of the town, floods the streets and drags debris along.';
  static schema = [
    { key: 'waterHeight', label: 'Flood height (blocks above ground)', type: 'number', min: 1, max: 14, step: 1, default: 5, unit: 'blocks' },
    { key: 'waveHeight', label: 'Wave crest height', type: 'number', min: 1, max: 12, step: 1, default: 4, unit: 'blocks' },
    { key: 'direction', label: 'Direction (from)', type: 'select', options: ['west', 'east', 'north', 'south'], default: 'west' },
    { key: 'speed', label: 'Wave speed', type: 'number', min: 1, max: 20, step: 0.5, default: 6, unit: 'blocks/s' },
    { key: 'duration', label: 'Duration', type: 'number', min: 10, max: 240, step: 5, default: 60, unit: 's' },
    { key: 'damage', label: 'Structural damage', type: 'number', min: 0, max: 1, step: 0.05, default: 0.5 },
    { key: 'intensity', label: 'Intensity', type: 'number', min: 0, max: 1, step: 0.05, default: 0.7 },
    { key: 'center', label: 'Center (x, z)', type: 'position', default: [0, 0] },
    { key: 'radius', label: 'Affected radius', type: 'number', min: 20, max: 160, step: 5, default: 110, unit: 'blocks' },
  ];

  constructor(manager, params, seed) {
    super(manager, params, seed);
    const p = this.params;
    const [dx, dz] = DIRS[p.direction] || DIRS.west;
    const baseY = TOWN_GROUND + 1;                       // street level: the flood is measured from here
    const floodTop = baseY + Math.round(p.waterHeight);  // y of the water surface (cells below are water)
    // frozen geometry (live 'set' commands may change speed/damage/intensity/duration only)
    this.g = {
      cx: p.center[0], cz: p.center[1], r: p.radius, dx, dz, baseY, floodTop,
      crestTop: Math.max(baseY + p.waveHeight, floodTop) + 0.4 + 0.35 * p.waveHeight,
      townEdgeS: 0,
    };
    // distance along the travel axis at which the front reaches the town rectangle
    const edge = dx > 0 ? TOWN_BOUNDS.x0 - this.g.cx : dx < 0 ? this.g.cx - TOWN_BOUNDS.x1 : dz > 0 ? TOWN_BOUNDS.z0 - this.g.cz : this.g.cz - TOWN_BOUNDS.z1;
    this.g.townEdgeS = edge + p.radius;
    this.phase = 'wave';        // wave | hold | recede | ending
    this.s = 0;                 // front distance from the start edge (blocks)
    this.prevS = 0;
    this.passedCount = 0;
    this.lowestIncomplete = 0;
    this.minBase = floodTop - 1;
    this.waveEndTick = -1;
    this.holdEndTick = this.durationTicks;
    this.drainY = floodTop - 1;
    this.drainCursor = -1;
    this.drainDone = false;
    this.endTick = -1;
    this.playerHit = false;
    this.reachedTown = false;
    this.nextRumbleTick = 0;
    this.destroyed = 0;
    this.c = null;              // column arrays (built in begin)
    this.events = [];           // flat [kind, x, y, z, ...] queued by simulate(), flushed by render()
    this.flow = [0, 0];         // scratch returned by flowFn
    this.flowFn = (x, z) => this._flowAt(x, z);
    // visuals
    this.visuals = null;
    this.anim = 0;
    this.loopOn = false;
    this.audioTimer = 0;
    this.crackTimer = 0;
    this.foamAcc = 0;
    this.foamLive = 0;
    this.seaY = baseY - 4;
    this.seaAlpha = 0;
    this._tmp = { x: 0, y: 0, z: 0 };
  }

  // ------------------------------------------------------------------ info
  warnings() {
    const p = this.params;
    const cells = Math.round(Math.PI * p.radius * p.radius * p.waterHeight);
    const w = [`Floods everything within ${p.radius} blocks of (${p.center[0]}, ${p.center[1]}) up to ${p.waterHeight} blocks deep (about ${Math.round(cells / 1000)}k water blocks, roughly ${Math.round(cells / (260 * TPS))} s to fill at the edit budget).`];
    if (p.damage * p.intensity > 0) w.push(`The ${p.waveHeight}-block crest breaks about ${Math.round(p.damage * p.intensity * 100)}% of the light structures it hits (planks, fences, glass, doors, signs).`);
    if (cells > 225000) w.push('Exceeds the block journal capacity: the flood stops growing once the journal is full.');
    return w;
  }

  get progress() {
    const g = this.g;
    if (this.phase === 'wave' || this.phase === 'hold') return Math.min(0.7, 0.7 * this.tick / Math.max(1, this.holdEndTick));
    if (this.phase === 'recede') {
      const layers = Math.max(1, (g.floodTop - 1) - this.minBase);
      const n = this.c ? this.c.n : 1;
      const f = ((g.floodTop - 1 - this.drainY) + (1 - Math.max(0, this.drainCursor) / n)) / layers;
      return 0.7 + 0.28 * clamp(f, 0, 1);
    }
    return this.done ? 1 : 0.99;
  }

  onParamsChanged() {
    // geometry is frozen for a running flood; reflect that in the params shown by the UI
    const p = this.params, g = this.g;
    p.center = [g.cx, g.cz]; p.radius = g.r; p.waterHeight = g.floodTop - g.baseY;
    for (const k of Object.keys(DIRS)) if (DIRS[k][0] === g.dx && DIRS[k][1] === g.dz) p.direction = k;
    this.holdEndTick = Math.max(this.durationTicks, this.waveEndTick >= 0 ? this.waveEndTick + 100 : 0);
  }

  // ------------------------------------------------------------------ lifecycle
  begin() {
    this._buildColumns();
    this.holdEndTick = Math.max(this.durationTicks, Math.ceil((2 * this.g.r + 12) / this.params.speed * TPS) + 100);
    this.m.debris.waterLevelFn = (x, z) => this._waterLevelAt(x, z);
    this.m.debris.forceFn = (i, out, dt) => this._debrisForce(i, out, dt);
    this._alert();
    this.m.say(`A wall of water is rolling in from the ${this.params.direction}!`);
  }

  beginPreview() {
    this._ensureVisuals();
    this.visuals.showDisc(this.g.cx, this.g.cz, this.g.r, this.g.floodTop + 0.05, this.game.atlas);
  }

  stop() { this.stopping = true; }

  dispose() {
    if (this.visuals) { this.visuals.dispose(); this.visuals = null; }
    if (this.loopOn) { this.game.audio.loopStop('flood'); this.loopOn = false; }
    if (this.m.debris.waterLevelFn) this.m.debris.waterLevelFn = null;
    if (this.m.debris.forceFn) this.m.debris.forceFn = null;
    this.m.effects.reset();
  }

  // ------------------------------------------------------------------ columns
  _buildColumns() {
    const { cx, cz, r, dx, dz } = this.g;
    const R = Math.ceil(r);
    const gw = 2 * R + 2;
    const x0 = Math.floor(cx) - R - 1, z0 = Math.floor(cz) - R - 1;
    const cap = Math.ceil(Math.PI * (r + 1) * (r + 1)) + gw;
    const colX = new Int16Array(cap), colZ = new Int16Array(cap), colP = new Float32Array(cap);
    const grid = new Int32Array(gw * gw).fill(-1);
    const fx = Math.floor(cx), fz = Math.floor(cz);
    let n = 0;
    // a = offset along the travel axis (start edge first), b = offset across it -> sorted by p
    for (let a = -R; a <= R; a++) {
      for (let b = -R; b <= R; b++) {
        const x = fx + a * dx - b * dz, z = fz + a * dz + b * dx;
        const ex = x + 0.5 - cx, ez = z + 0.5 - cz;
        if (ex * ex + ez * ez > r * r || n >= cap) continue;
        colX[n] = x; colZ[n] = z; colP[n] = ex * dx + ez * dz + r;
        grid[(x - x0) + (z - z0) * gw] = n;
        n++;
      }
    }
    this.c = {
      n, colX, colZ, colP, grid, gw, x0, z0,
      base: new Int16Array(n).fill(UNKNOWN),   // ground the water stands on (clamped to the flood top)
      top: new Int16Array(n),                  // highest cell processed by the fill (= water top when filled)
      passTick: new Int32Array(n).fill(-1),
    };
  }

  _colAt(x, z) {
    const c = this.c;
    if (!c) return -1;
    const gx = Math.floor(x) - c.x0, gz = Math.floor(z) - c.z0;
    if (gx < 0 || gz < 0 || gx >= c.gw || gz >= c.gw) return -1;
    return c.grid[gx + gz * c.gw];
  }

  // Natural terrain height of a column (heightmap, independent of chunk loading); caches base/top.
  _terrainOf(i) {
    const c = this.c;
    const h = this.world.gen.surfaceHeight(c.colX[i], c.colZ[i]);
    if (c.base[i] === UNKNOWN) {
      const b = clamp(h, this.g.floodTop - 1 - Math.round(this.params.waterHeight) - 12, this.g.floodTop - 1);
      c.base[i] = b; c.top[i] = b;
      if (b < this.minBase) this.minBase = b;
    }
    return h;
  }

  // ------------------------------------------------------------------ simulation (deterministic)
  simulate() {
    if (this.stopping && this.phase !== 'recede' && this.phase !== 'ending') this._startRecede();
    switch (this.phase) {
      case 'wave':
        this.prevS = this.s;
        this.s += this.params.speed / TPS;
        this._advanceFront();
        this._fill();
        if (!this.reachedTown && this.s >= this.g.townEdgeS) { this.reachedTown = true; this._queue(EV_SPLASH); this._queue(EV_RUMBLE); this.nextRumbleTick = this.tick + 80; }
        if (this.reachedTown && this.tick >= this.nextRumbleTick && this.s < 2 * this.g.r) { this._queue(EV_RUMBLE); this.nextRumbleTick = this.tick + 80; }
        if (this.s >= 2 * this.g.r + 12) {
          this.phase = 'hold'; this.waveEndTick = this.tick;
          this.holdEndTick = Math.max(this.durationTicks, this.tick + 100);
        }
        break;
      case 'hold':
        this.prevS = this.s;
        this._fill();
        if (this.tick >= this.holdEndTick) this._startRecede();
        break;
      case 'recede':
        this._drain();
        if (this.drainDone) {
          this.phase = 'ending'; this.endTick = this.tick;
          if (this.game.npcs) this.game.npcs.clearAlert();
          if (this.game.animals) this.game.animals.clearAlert();
        }
        break;
      default:
        if (this.tick - this.endTick > 80) this.done = true;
        break;
    }
    this._pushPlayer();
    if ((this.phase === 'wave' || this.phase === 'hold') && this.tick % 40 === 0) this._alert();
  }

  _startRecede() {
    this.phase = 'recede';
    this.drainY = this.g.floodTop - 1;
    this.drainCursor = this.c ? this.c.n - 1 : -1;
    this.drainDone = !this.c;
    this.m.say('The water is receding.');
  }

  // Move the front: newly passed columns get their pass tick and are hit by the crest.
  _advanceFront() {
    const c = this.c, s = this.s;
    let debrisLeft = MAX_DEBRIS_PER_TICK, destroyLeft = MAX_DESTROY_PER_TICK;
    while (this.passedCount < c.n && c.colP[this.passedCount] <= s) {
      const i = this.passedCount++;
      c.passTick[i] = this.tick;
      const terrain = this._terrainOf(i);
      if (terrain >= this.g.floodTop || destroyLeft <= 0) continue;
      const x = c.colX[i], z = c.colZ[i];
      if (!this.world.isLoaded(x, z)) continue;
      const pBase = this.params.damage * this.params.intensity;
      if (pBase <= 0) continue;
      const band = Math.max(1, Math.round(this.params.waveHeight));
      const yTop = Math.min(CH - 1, terrain + band);
      for (let y = terrain + 1; y <= yTop; y++) {
        const id = this.world.getBlock(x, y, z);
        if (id === B.AIR || id === B.WATER) continue;
        const frag = DisasterManager.fragility(id);
        if (frag <= 0) continue;
        const taper = 1 - 0.5 * (y - terrain - 1) / band;      // the crest hits hardest at its foot
        if (hash3(x, y, z, this.seed) >= pBase * frag * taper) continue;
        if (this.m.budgetLeft <= 0 || destroyLeft <= 0) break;
        const to = y <= c.base[i] + 1 && y < this.g.floodTop ? B.WATER : B.AIR;
        if (!this.m.setBlock(x, y, z, to)) continue;
        destroyLeft--; this.destroyed++;
        const shape = BLOCKS[id].shape;
        if (shape === SHAPE.DOOR || shape === SHAPE.SALOON_DOOR) {   // take the other half of the door with it
          for (const oy of [y + 1, y - 1]) if (BLOCKS[this.world.getBlock(x, oy, z)].shape === shape && this.m.budgetLeft > 0) this.m.setBlock(x, oy, z, B.AIR);
        }
        this._queue(EV_CRACK, x + 0.5, y + 0.5, z + 0.5);
        if (debrisLeft > 0) {
          debrisLeft--;
          const g = this.g, sp = this.params.speed;
          const f = this.rand(0.7, 1.2), side = this.rand(-1.6, 1.6);
          this.m.debris.spawn(x + 0.5, y + 0.6, z + 0.5, g.dx * sp * f - g.dz * side, this.rand(2, 6), g.dz * sp * f + g.dx * side, id, this.rand(0.45, 0.75), this.rand(18, 32), { buoyant: true });
        }
      }
    }
  }

  // Raise the water behind the front, nearest columns first, within the edit budget.
  _fill() {
    const c = this.c, floodTop = this.g.floodTop, tick = this.tick, world = this.world;
    const lowest = this.lowestIncomplete;
    let newLowest = -1;
    for (let i = this.passedCount - 1; i >= lowest; i--) {
      const t = c.top[i];
      if (t >= floodTop - 1) continue;
      const due = Math.min(floodTop - 1, c.base[i] + 1 + Math.floor((tick - c.passTick[i]) / RISE_TICKS));
      if (t >= due) { newLowest = i; continue; }
      const x = c.colX[i], z = c.colZ[i];
      if (!world.isLoaded(x, z)) { newLowest = i; continue; }
      let y = t;
      while (y < due) {
        if (this.m.budgetLeft <= 0) { c.top[i] = y; return; }   // lowestIncomplete unchanged: unvisited columns remain
        y++;
        if (fillable(world.getBlock(x, y, z))) this.m.setBlock(x, y, z, B.WATER);
      }
      c.top[i] = y;
      if (y < floodTop - 1) newLowest = i;
    }
    this.lowestIncomplete = newLowest === -1 ? this.passedCount : newLowest;
  }

  // Drain layer by layer from the top, far side first, only cells the flood created.
  _drain() {
    const c = this.c, world = this.world, journal = this.m.journal;
    let visits = 0;
    while (visits < MAX_DRAIN_VISITS) {
      if (this.drainY <= this.minBase) { this.drainDone = true; return; }
      if (this.drainCursor < 0) { this.drainY--; this.drainCursor = c.n - 1; continue; }
      const i = this.drainCursor;
      visits++;
      const y = this.drainY;
      if (c.base[i] === UNKNOWN || y <= c.base[i]) { this.drainCursor--; continue; }
      const x = c.colX[i], z = c.colZ[i];
      if (world.getBlock(x, y, z) !== B.WATER) { this.drainCursor--; continue; }
      const o = journal.original(x, y, z);
      if (o === undefined || o === B.WATER) { this.drainCursor--; continue; }
      if (this.m.budgetLeft <= 0) return;                      // resume at this column next tick
      this.m.setBlock(x, y, z, B.AIR);
      if (c.top[i] >= y) c.top[i] = y - 1;
      this.drainCursor--;
    }
  }

  // Current push (blocks/s) at a position, or null where there is no moving water.
  _flowAt(x, z) {
    const g = this.g;
    const ex = x - g.cx, ez = z - g.cz;
    if (ex * ex + ez * ez > g.r * g.r || this.phase === 'ending' || !this.c) return null;
    const f = this.flow;
    if (this.phase === 'recede') { f[0] = -g.dx * 1.5; f[1] = -g.dz * 1.5; return f; }
    const behind = this.s - (ex * g.dx + ez * g.dz + g.r);
    if (behind < -1) return null;
    const sp = this.params.speed * (0.9 * Math.exp(-Math.max(0, behind) / 14) + 0.08);
    f[0] = g.dx * sp; f[1] = g.dz * sp;
    return f;
  }

  // Signed distance of a point ahead of the front (negative = already flooded).
  _aheadOf(x, z) { const g = this.g; return ((x - g.cx) * g.dx + (z - g.cz) * g.dz + g.r) - this.s; }

  _pushPlayer() {
    const p = this.game.player;
    if (!p || p.dead) return;
    const f = this._flowAt(p.pos.x, p.pos.z);
    if (!f) return;
    if (p.inWater) p.addForce(f[0] * 4, 1.5, f[1] * 4);
    if (this.phase === 'wave' && !this.playerHit) {
      const ahead = this._aheadOf(p.pos.x, p.pos.z);
      if (ahead <= 0 && ahead > -2 && p.pos.y < this.g.crestTop) {
        this.playerHit = true;
        const sp = this.params.speed;
        p.impulse(this.g.dx * sp * 1.5, 5, this.g.dz * sp * 1.5);
        const dmg = Math.round(3 * this.params.intensity);
        if (dmg > 0) p.damage(dmg);
        this._queue(EV_SPLASH);
      }
    }
  }

  _alert() {
    const g = this.g;
    const k = this.s - g.r;
    const info = { kind: 'flood', x: g.cx + g.dx * k, z: g.cz + g.dz * k, radius: g.r * 2 + 40, safeY: g.floodTop, dir: [g.dx, g.dz], flowFn: this.flowFn };
    if (this.game.npcs) this.game.npcs.alert(info);
    if (this.game.animals) this.game.animals.alert(info);
  }

  _queue(kind, x = 0, y = 0, z = 0) { if (this.events.length < 96) this.events.push(kind, x, y, z); }

  // ------------------------------------------------------------------ debris hooks
  _waterLevelAt(x, z) {
    const i = this._colAt(x, z);
    if (i < 0) return -Infinity;
    const c = this.c;
    if (c.base[i] === UNKNOWN || c.top[i] <= c.base[i]) return -Infinity;
    let lvl = c.top[i] + 0.9;
    if (this.phase === 'wave') {                 // ride the crest
      const behind = this.s - c.colP[i];
      if (behind > -3 && behind < 10) lvl = Math.max(lvl, this.g.baseY + (this.g.crestTop - this.g.baseY) * Math.sin(Math.PI * clamp((behind + 3) / 13, 0, 1)));
    }
    return lvl;
  }

  _debrisForce(i, out) {
    const d = this.m.debris;
    const f = this._flowAt(d.px[i], d.pz[i]);
    if (!f) return;
    if (d.py[i] > this._waterLevelAt(d.px[i], d.pz[i]) + 0.3) return;
    const k = 2.5 * d.mass[i];
    out.x += (f[0] - d.vx[i]) * k;
    out.z += (f[1] - d.vz[i]) * k;
  }

  // ------------------------------------------------------------------ visuals (per frame)
  _ensureVisuals() {
    if (!this.visuals) {
      this.visuals = new WaveVisuals(this.game.scene, this.game.atlas);
      this.visuals.setGeometry(this.g.cx, this.g.cz, this.g.dx, this.g.dz, this.g.r, this.g.baseY, this.g.crestTop);
    }
    return this.visuals;
  }

  _backY() {
    const p = this.params;
    const lvl = Math.min(p.waterHeight, 1 + Math.floor((10 / Math.max(0.5, p.speed)) * TPS / RISE_TICKS));
    return this.g.baseY + lvl - 0.1;
  }

  render(dt, alpha, camera) {
    const paused = this.m.state === 'paused';
    if (!paused) this.anim += dt;
    const vis = this._ensureVisuals();
    if (this.preview) {
      vis.setFront(0, this._backY(), this.anim, 0.7);
      vis.setSea(this.g.baseY - 4, this.anim, 0);
      vis.setDiscTime(this.anim);
      return;
    }
    const g = this.g, p = this.game.player;
    const s = paused ? this.s : this.prevS + (this.s - this.prevS) * clamp(alpha, 0, 1);
    // crest
    let crestAlpha = 0;
    if (this.phase === 'wave') crestAlpha = Math.min(1, this.tick / 20) * clamp(1 - (s - (2 * g.r + 4)) / 8, 0, 1);
    vis.setFront(s, this._backY(), this.anim, crestAlpha);
    // far sea: rises with the wave, follows the draining level, sinks away at the end
    let seaTarget, alphaTarget = 0.85;
    if (this.phase === 'wave' || this.phase === 'hold') seaTarget = g.baseY - 4 + (g.floodTop - 0.15 - (g.baseY - 4)) * clamp(this.tick / 160, 0, 1);
    else if (this.phase === 'recede') seaTarget = this.drainY + 0.85;
    else { seaTarget = g.baseY - 4; alphaTarget = 0; }
    if (!paused) { const k = Math.min(1, dt * 1.5); this.seaY += (seaTarget - this.seaY) * k; this.seaAlpha += (alphaTarget - this.seaAlpha) * k; }
    vis.setSea(this.seaY, this.anim, this.seaAlpha);
    // environment: grey-blue storm haze while the water is up
    if (this.phase === 'wave' || this.phase === 'hold') this.m.effects.setEnvironment({ tint: [0.86, 0.9, 0.98], fogColor: [0.52, 0.6, 0.7], fogFarMul: 0.85 });
    else this.m.effects.reset();
    if (paused) return;
    // player-relative quantities
    const ahead = this._aheadOf(p.pos.x, p.pos.z);
    const perp = -(p.pos.x - g.cx) * g.dz + (p.pos.z - g.cz) * g.dx;          // player's coordinate along the front line
    const k = s - g.r;
    const halfLen = Math.sqrt(Math.max(0, g.r * g.r - k * k)) + 6;
    const fp = this._tmp;                                                     // nearest point of the front to the player
    const pc = clamp(perp, -halfLen, halfLen);
    fp.x = g.cx + g.dx * k - g.dz * pc; fp.z = g.cz + g.dz * k + g.dx * pc; fp.y = g.crestTop - 1;
    const dFront = this.phase === 'wave' ? Math.abs(ahead) : Infinity;
    if (this.phase === 'wave' && dFront < 25) this.m.effects.shake(0.35 * (1 - dFront / 25) * (0.5 + 0.5 * this.params.intensity), 4);
    this._foam(dt, s, halfLen, perp, ahead);
    this._audio(dt, dFront, fp, ahead);
    this._flushEvents(fp, p);
  }

  _foam(dt, s, halfLen, perp, ahead) {
    if (this.phase !== 'wave' || Math.abs(ahead) > 90 || this.foamLive >= MAX_FOAM) { this.foamLive = Math.max(0, this.foamLive - dt * 220); return; }
    const g = this.g, parts = this.game.particles, sp = this.params.speed;
    const rate = 120 + 120 * this.params.intensity;
    this.foamAcc += rate * dt;
    let n = Math.min(8, Math.floor(this.foamAcc));
    this.foamAcc -= n;
    const k = s - g.r;
    while (n-- > 0) {
      const along = clamp(perp + (Math.random() - 0.5) * 80, -halfLen, halfLen);
      const d = k + Math.random() * 3 - 1;
      const x = g.cx + g.dx * d - g.dz * along, z = g.cz + g.dz * d + g.dx * along;
      const y = g.crestTop - Math.random() * 1.5;
      const f = sp * (0.9 + Math.random() * 0.7), side = (Math.random() - 0.5) * 4;
      const vx = g.dx * f - g.dz * side, vz = g.dz * f + g.dx * side;
      if (Math.random() < 0.5) parts.spawn(x, y, z, vx, 0.5 + Math.random() * 3.5, vz, 0.15 + Math.random() * 0.15, 0.5 + Math.random() * 0.4, 0, [0, 0, 0, 1], [0.96, 0.98, 1], 1);
      else parts.spawn(x, y, z, vx * 0.6, 0.8 + Math.random() * 1.5, vz * 0.6, 0.5 + Math.random() * 0.4, 0.8 + Math.random() * 0.6, 1, [0, 0, 0, 1], [0.94, 0.97, 1], 0.6);
      this.foamLive++;
    }
    this.foamLive = Math.max(0, this.foamLive - dt * 220);   // ~ average particle lifetime turnover
  }

  _audio(dt, dFront, fp, ahead) {
    const audio = this.game.audio;
    if (!this.loopOn) {
      if (!audio.ctx || this.phase === 'ending') return;
      audio.loopStart('flood', { kind: 'noise', filter: 'lowpass', cutoff: 500, gain: 0 });
      this.loopOn = true;
    }
    this.audioTimer += dt;
    if (this.audioTimer < 0.1) return;
    this.audioTimer = 0;
    let gain = 0, cutoff = 400, pan = 0;
    const inten = 0.6 + 0.4 * this.params.intensity;
    if (this.phase === 'wave') {
      const near = clamp(1 - dFront / 140, 0, 1);
      gain = 0.55 * near * near * inten + (ahead < 0 ? 0.08 : 0);
      cutoff = 250 + 1800 * clamp(1 - dFront / 60, 0, 1);
      pan = audio.spatial(fp, 400)[1];
    } else if (this.phase === 'hold') { gain = 0.12 * inten; cutoff = 600; }
    else if (this.phase === 'recede') { gain = 0.18 * inten; cutoff = 900; }
    else { audio.loopStop('flood', 2); this.loopOn = false; return; }
    if (this.game.player.inWater && this.phase !== 'ending') gain += 0.06;
    audio.loopSet('flood', { gain, cutoff, pan });
  }

  _flushEvents(fp, player) {
    const ev = this.events;
    if (!ev.length) return;
    const audio = this.game.audio, parts = this.game.particles;
    this.crackTimer -= 0.016;
    for (let i = 0; i < ev.length; i += 4) {
      const kind = ev[i];
      if (kind === EV_CRACK) {
        const x = ev[i + 1], y = ev[i + 2], z = ev[i + 3];
        const d = Math.hypot(x - player.pos.x, z - player.pos.z);
        if (d > 45) continue;
        if (this.crackTimer <= 0) { audio.crack({ x, y, z }); this.crackTimer = 0.15; }
        if (this.foamLive < MAX_FOAM) for (let n = 0; n < 4; n++) { parts.spawn(x, y, z, (Math.random() - 0.5) * 4, 1 + Math.random() * 3, (Math.random() - 0.5) * 4, 0.2, 0.6, 0, [0, 0, 0, 1], [0.96, 0.98, 1], 1); this.foamLive++; }
      } else if (kind === EV_SPLASH) audio.splashBig(fp);
      else if (kind === EV_RUMBLE) { audio.rumble(fp, 0.8); this.m.effects.shake(0.25, 2); }
    }
    ev.length = 0;
  }
}
