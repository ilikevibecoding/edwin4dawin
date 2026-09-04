// Tsunami / flood disaster.
//
// A wave front (a straight line perpendicular to `direction`) starts at the edge of the affected disc and
// travels across it at up to `speed`. Every column the front passes is flooded with real WATER blocks (journaled,
// budgeted, placed through the manager): one block the moment the front passes (the toe), then up to the depth due
// at its distance behind the front - a staircase of one block per STEP_DIST blocks up to waterHeight, the same
// profile the voxel crest draws. Columns are generated pre-sorted by their distance along the travel direction, so
// the passed columns are a prefix of the list and the fill walks the prefix oldest-first: the water body is always
// a compact block behind the crest. When the per-tick edit budget cannot keep up with the demanded volume (a wide
// front), the front itself slows down (`s` never runs more than LEAD blocks ahead of the oldest unfilled column),
// so the visual crest, the destruction and the water reaching the player stay together - never 40 blocks apart.
// Blocks hit by the crest are destroyed with probability damage * intensity * fragility, decided by a position hash
// so the world outcome never depends on iteration order or on loading state. After `duration` the water drains layer
// by layer (top first, cell by cell from the far side), a final sweep removes every water cell the flood created,
// and the disaster ends. Everything visual (voxel crest mesh, far sea sheet, spray, debris, sound, shake, sky) lives
// in render() and never touches world state; debris is spawned render-side from queued destruction events, so the
// simulation's RNG is never consumed by cosmetics.
import { Disaster } from './base.js';
import { DisasterManager } from './manager.js';
import { BLOCKS, B, SHAPE } from '../blocks.js';
import { TOWN_GROUND, CHUNK_HEIGHT as CH, ATLAS_TILES } from '../constants.js';
import { TOWN_BOUNDS } from '../worldgen.js';
import { hash3, clamp } from '../rng.js';
import { TILES } from '../textures.js';
import { WaveVisuals } from './tsunami/waveMesh.js';
import { VoxelCrest, CREST_BACK, STEP_DIST, crestDepth } from './tsunami/crestMesh.js';

const TPS = 20;
const LEAD = 4.5;                 // max distance the crest may run ahead of the oldest unfilled column (blocks)
const MAX_DESTROY_PER_TICK = 40;  // block edits reserved for crest destruction (the rest floods)
const MAX_DRAIN_VISITS = 4000;    // cells inspected per tick while draining
const SWEEP_COLUMNS = 1500;       // columns re-checked per tick by the slow sweeps (late-loaded chunks, final drain)
const MAX_FOAM = 170;             // live spray particles owned by the tsunami
const UNKNOWN = -32768;
const DIRS = { west: [1, 0], east: [-1, 0], north: [0, 1], south: [0, -1] };
const EV_CRACK = 0, EV_SPLASH = 1, EV_RUMBLE = 2;
const EV_STRIDE = 5, EV_MAX = 40 * EV_STRIDE;
const WHITE = [1, 1, 1];
// overcast storm: slate haze that the sky dome, horizon and fog share (skyMix keeps it daylight, not night)
const ENV_STORM = { tint: [0.86, 0.9, 0.98], fogColor: [0.52, 0.6, 0.7], fogFarMul: 0.85, skyColor: [0.5, 0.55, 0.63], skyMix: 0.45, cloudAlpha: 0.7 };
const ENV_RECEDE = { tint: [0.93, 0.95, 1], fogColor: [0.6, 0.68, 0.78], fogFarMul: 0.95, skyColor: [0.55, 0.6, 0.68], skyMix: 0.2, cloudAlpha: 0.9 };
// debris budget (visual): pieces per second the flood may launch and the share of the shared pool it may occupy
const DEBRIS_RATE = 28, DEBRIS_BURST = 10, DEBRIS_POOL_SHARE = 0.92, DEBRIS_LIFE_MIN = 120, DEBRIS_LIFE_MAX = 200;

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
    const crestTop = Math.max(baseY + p.waveHeight, floodTop) + 0.4 + 0.35 * p.waveHeight;
    // frozen geometry (live 'set' commands may change speed/damage/intensity/duration only)
    this.g = {
      cx: p.center[0], cz: p.center[1], r: p.radius, dx, dz, baseY, floodTop, crestTop,
      depth: floodTop - baseY,                           // flood depth in blocks
      lip: crestTop - floodTop,                          // how far the breaking crest rises above the flood surface
      townEdgeS: 0,
    };
    // distance along the travel axis at which the front reaches the town rectangle
    const edge = dx > 0 ? TOWN_BOUNDS.x0 - this.g.cx : dx < 0 ? this.g.cx - TOWN_BOUNDS.x1 : dz > 0 ? TOWN_BOUNDS.z0 - this.g.cz : this.g.cz - TOWN_BOUNDS.z1;
    this.g.townEdgeS = edge + p.radius;
    this.phase = 'wave';        // wave | hold | recede | ending
    this.s = 0;                 // front distance from the start edge (blocks)
    this.prevS = 0;
    this.passedCount = 0;       // columns the front has passed (prefix of the sorted list)
    this.hitPtr = 0;            // next column the crest has not dealt with yet (destruction)
    this.toePtr = 0;            // next passed column without its first block of water
    this.fillPtr = 0;           // oldest passed column that is not yet at full depth
    this.sweepPtr = 0;          // slow re-check of all passed columns (chunks loaded after the front passed)
    this.minBase = floodTop - 1;
    this.waveEndTick = -1;
    this.holdEndTick = this.durationTicks;
    this.destroyLeft = 0;       // per-tick destruction allowance (reset every tick)
    this.drainY = floodTop - 1;
    this.drainCell = -1;        // cell being drained (walks the sweep order backwards: far side first)
    this.drainJ = -1;           // position in that cell's list (far side first)
    this.drainSweep = -1;       // >= 0: final pass removing every flood water cell still standing
    this.drainDone = false;
    this.endTick = -1;
    this.playerHit = false;
    this.reachedTown = false;
    this.nextRumbleTick = 0;
    this.destroyed = 0;
    this.c = null;              // column arrays (built in begin)
    this.events = [];           // flat [kind, x, y, z, id, ...] queued by simulate(), flushed by render()
    this.flow = [0, 0];         // scratch returned by flowFn
    this.flow2 = [0, 0];        // scratch returned by the NPC flow (ceiling escape)
    this.flowFn = (x, z) => this._flowAt(x, z);
    this.npcFlowFn = (x, z) => this._npcFlow(x, z);
    // visuals
    this.visuals = null;
    this.crest = null;
    this.anim = 0;
    this.envState = 0;          // 0 clear, 1 storm, 2 receding
    this.loopOn = false;
    this.audioTimer = 0;
    this.crackTimer = 0;
    this.foamAcc = 0;
    this.foamLive = 0;
    this.seaY = baseY - 4;
    this.seaAlpha = 0;
    this.crestFade = 1;         // 1 = crest fully shown; eased toward 0 when the camera is inside it / indoors
    this.debrisAcc = DEBRIS_BURST;
    this._tmp = { x: 0, y: 0, z: 0 };
    this._evPos = { x: 0, y: 0, z: 0 };
    this._uv = [0, 0, 0, 0];
    const [su, sv, ss] = this._tile(TILES.snow ?? 0), [wu, wv, ws] = this._tile(TILES.water ?? 0);
    this._snow = [su, sv, ss]; this._water = [wu, wv, ws];
  }

  _tile(index) { const ts = 1 / ATLAS_TILES; return [(index % ATLAS_TILES) * ts, Math.floor(index / ATLAS_TILES) * ts, ts]; }

  // ------------------------------------------------------------------ info
  warnings() {
    const p = this.params;
    const cells = Math.round(Math.PI * p.radius * p.radius * p.waterHeight);
    const w = [`Floods everything within ${p.radius} blocks of (${p.center[0]}, ${p.center[1]}) up to ${p.waterHeight} blocks deep (about ${Math.round(cells / 1000)}k water blocks, roughly ${Math.round(cells / (260 * TPS))} s to fill at the edit budget; a wide front slows the wave down to what the budget can fill).`];
    if (p.damage * p.intensity > 0) w.push(`The ${p.waveHeight}-block crest breaks about ${Math.round(p.damage * p.intensity * 100)}% of the light structures it hits (planks, fences, glass, doors, signs).`);
    if (cells > 225000) w.push('Exceeds the block journal capacity: the flood stops growing once the journal is full.');
    return w;
  }

  get progress() {
    const g = this.g;
    if (this.phase === 'wave' || this.phase === 'hold') return Math.min(0.7, 0.7 * this.tick / Math.max(1, this.holdEndTick));
    if (this.phase === 'recede') {
      if (this.drainSweep >= 0) return 0.97 + 0.01 * (this.c ? this.drainSweep / Math.max(1, this.c.n) : 1);
      const layers = Math.max(1, (g.floodTop - 1) - this.minBase);
      const c = this.c;
      let within = 1;
      if (c && this.drainCell >= 0) { const len = c.cells[this.drainCell].length; within = (c.S - 1 - this.drainCell + (len ? 1 - Math.max(0, this.drainJ) / len : 1)) / c.S; }
      const f = ((g.floodTop - 1 - this.drainY) + within) / layers;
      return 0.7 + 0.27 * clamp(f, 0, 1);
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
    const g = this.g;
    this.visuals.showDisc(g.cx, g.cz, g.r, g.floodTop + 0.05, this.game.atlas, g.dx, g.dz, this.params.speed, this.params.damage * this.params.intensity);
  }

  stop() { this.stopping = true; }

  dispose() {
    if (this.visuals) { this.visuals.dispose(); this.visuals = null; }
    if (this.crest) { this.crest.dispose(); this.crest = null; }
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
    const colX = new Int16Array(cap), colZ = new Int16Array(cap), colP = new Float32Array(cap), colCell = new Int32Array(cap);
    const grid = new Int32Array(gw * gw).fill(-1);
    const fx = Math.floor(cx), fz = Math.floor(cz);
    // cells = the chunks the disc overlaps (local chunk grid); used by the drain (cell-wise, far side first)
    const ccx0 = Math.floor((fx - R - 1) / 16), ccz0 = Math.floor((fz - R - 1) / 16);
    const ccw = Math.floor((fx + R + 1) / 16) - ccx0 + 1, cch = Math.floor((fz + R + 1) / 16) - ccz0 + 1;
    const count = new Int32Array(ccw * cch);
    const firstP = new Float32Array(ccw * cch).fill(Infinity), firstB = new Float32Array(ccw * cch);
    let n = 0;
    // a = offset along the travel axis (start edge first), b = offset across it -> sorted by p
    for (let a = -R; a <= R; a++) {
      for (let b = -R; b <= R; b++) {
        const x = fx + a * dx - b * dz, z = fz + a * dz + b * dx;
        const ex = x + 0.5 - cx, ez = z + 0.5 - cz;
        if (ex * ex + ez * ez > r * r || n >= cap) continue;
        const p = ex * dx + ez * dz + r;
        colX[n] = x; colZ[n] = z; colP[n] = p;
        const cell = (Math.floor(x / 16) - ccx0) + (Math.floor(z / 16) - ccz0) * ccw;
        colCell[n] = cell; count[cell]++;
        if (p < firstP[cell]) { firstP[cell] = p; firstB[cell] = b; }
        grid[(x - x0) + (z - z0) * gw] = n;
        n++;
      }
    }
    // sweep order of the non-empty cells: nearest the start edge first, then across (a total order -> deterministic)
    const ids = [];
    for (let cell = 0; cell < count.length; cell++) if (count[cell]) ids.push(cell);
    ids.sort((p, q) => (firstP[p] - firstP[q]) || (firstB[p] - firstB[q]));
    const S = ids.length, cells = [], pos = new Int32Array(count.length);
    for (let k = 0; k < S; k++) { cells.push(new Int32Array(count[ids[k]])); pos[ids[k]] = k; }
    count.fill(0);
    // per-cell column lists keep the global order (start edge first)
    for (let i = 0; i < n; i++) { const k = pos[colCell[i]]; colCell[i] = k; cells[k][count[k]++] = i; }
    this.c = {
      n, colX, colZ, colP, colCell, grid, gw, x0, z0, S, cells,
      base: new Int16Array(n).fill(UNKNOWN),   // ground the water stands on (clamped to the flood top)
      top: new Int16Array(n),                  // highest cell processed by the fill (= water top when filled)
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
      case 'wave': {
        this.prevS = this.s;
        let next = this.s + this.params.speed / TPS;
        // the crest never outruns the water body: at most LEAD blocks ahead of the oldest unfilled column
        if (this.fillPtr < this.passedCount) next = Math.min(next, Math.max(this.s, this.c.colP[this.fillPtr] + LEAD));
        this.s = next;
        this._advanceFront();
        this._fill();
        if (!this.reachedTown && this.s >= this.g.townEdgeS) { this.reachedTown = true; this._queue(EV_SPLASH); this._queue(EV_RUMBLE); this.nextRumbleTick = this.tick + 80; }
        if (this.reachedTown && this.tick >= this.nextRumbleTick && this.s < 2 * this.g.r) { this._queue(EV_RUMBLE); this.nextRumbleTick = this.tick + 80; }
        if (this.s >= 2 * this.g.r + 12) {
          this.phase = 'hold'; this.waveEndTick = this.tick;
          this.holdEndTick = Math.max(this.durationTicks, this.tick + 100);
        }
        break;
      }
      case 'hold':
        this.prevS = this.s;
        this._fill();
        this._sweepFill();
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
    this.drainCell = this.c ? this.c.S - 1 : -1;
    this.drainJ = this.c ? this.c.cells[this.drainCell].length - 1 : -1;
    this.drainSweep = -1;
    this.drainDone = !this.c;
    this.m.say('The water is receding.');
  }

  // Move the front: newly passed columns get their ground level (the crest hits and floods them in _fill).
  _advanceFront() {
    const c = this.c, s = this.s;
    while (this.passedCount < c.n && c.colP[this.passedCount] <= s) this._terrainOf(this.passedCount++);
  }

  // Water surface (block y) due `behind` blocks behind the front: street level + a staircase of one block per
  // STEP_DIST blocks up to the flood top. Absolute, so dips fill deeper and humps later, like a real surge.
  _dueTop(behind) { return behind < 0 ? this.g.baseY - 1 : Math.min(this.g.floodTop - 1, this.g.baseY - 1 + Math.min(this.g.depth, 1 + Math.floor(behind / STEP_DIST))); }

  // Three passes per tick over the passed columns, all oldest-first (global order = distance along the travel axis):
  //  A. the crest's work: destruction of fragile blocks in the columns it just reached (MAX_DESTROY_PER_TICK edits);
  //  B. the toe: one block of water in every column the front has passed (one edit per column, so it is never
  //     starved by the body) - the street under the visual foot is wet the moment the crest arrives;
  //  C. the body: every column is raised to the depth due at its distance behind the front, stopping when the tick's
  //     edit budget is spent. fillPtr ends at the oldest column that is still short, which paces the front.
  _fill() {
    const c = this.c, world = this.world, full = this.g.floodTop - 1;
    this.destroyLeft = MAX_DESTROY_PER_TICK;
    let j = this.hitPtr;
    for (; j < this.passedCount && this.destroyLeft > 0 && this.m.budgetLeft > 0; j++) if (!this._hitColumn(j)) break;
    this.hitPtr = j;
    let k = this.toePtr;
    for (; k < this.passedCount && this.m.budgetLeft > 0; k++) {
      const b = c.base[k];
      if (c.top[k] > b || b >= full) continue;
      const x = c.colX[k], z = c.colZ[k];
      if (!world.isLoaded(x, z)) continue;
      if (fillable(world.getBlock(x, b + 1, z))) this.m.setBlock(x, b + 1, z, B.WATER);
      c.top[k] = b + 1;
    }
    this.toePtr = k;
    let ptr = -1, i = this.fillPtr;
    for (; i < this.passedCount; i++) {
      const t = c.top[i];
      if (t >= full) continue;
      const x = c.colX[i], z = c.colZ[i];
      if (!world.isLoaded(x, z)) continue;                      // cannot be filled now: never holds the front back
      const due = Math.max(c.base[i], this._dueTop(this.s - c.colP[i]));
      if (t >= due) { if (ptr < 0) ptr = i; continue; }         // staircase band: waiting for the front to move on
      if (this.m.budgetLeft <= 0) { if (ptr < 0) ptr = i; break; }
      let y = t;
      while (y < due && this.m.budgetLeft > 0) { y++; if (fillable(world.getBlock(x, y, z))) this.m.setBlock(x, y, z, B.WATER); }
      c.top[i] = y;
      if (y < full && ptr < 0) ptr = i;
      if (this.m.budgetLeft <= 0) break;
    }
    this.fillPtr = ptr >= 0 ? ptr : i;
  }

  // Hold phase: slowly re-check every column so chunks that were loaded after the front passed still flood.
  _sweepFill() {
    const c = this.c, world = this.world, full = this.g.floodTop - 1;
    let k = this.sweepPtr;
    for (let n = 0; n < SWEEP_COLUMNS && this.m.budgetLeft > 0; n++, k = (k + 1) % Math.max(1, this.passedCount)) {
      if (k >= this.passedCount) break;
      const t = c.top[k];
      if (t >= full) continue;
      const x = c.colX[k], z = c.colZ[k];
      if (!world.isLoaded(x, z)) continue;
      let y = t;
      while (y < full && this.m.budgetLeft > 0) { y++; if (fillable(world.getBlock(x, y, z))) this.m.setBlock(x, y, z, B.WATER); }
      c.top[k] = y;
    }
    this.sweepPtr = k;
  }

  // The crest hits a column: fragile blocks in surface..surface+waveHeight break (into water inside the body).
  // Returns false when the tick's destruction allowance ran out before the column was finished.
  _hitColumn(i) {
    const c = this.c, terrain = this._terrainOf(i);
    if (terrain >= this.g.floodTop) return true;
    const x = c.colX[i], z = c.colZ[i];
    if (!this.world.isLoaded(x, z)) return true;
    const pBase = this.params.damage * this.params.intensity;
    if (pBase <= 0) return true;
    const band = Math.max(1, Math.round(this.params.waveHeight));
    const yTop = Math.min(CH - 1, terrain + band);
    for (let y = terrain + 1; y <= yTop; y++) {
      const id = this.world.getBlock(x, y, z);
      if (id === B.AIR || id === B.WATER) continue;
      const frag = DisasterManager.fragility(id);
      if (frag <= 0) continue;
      const taper = 1 - 0.5 * (y - terrain - 1) / band;      // the crest hits hardest at its foot
      if (hash3(x, y, z, this.seed) >= pBase * frag * taper) continue;
      if (this.m.budgetLeft <= 0 || this.destroyLeft <= 0) return false;
      if (!this.m.setBlock(x, y, z, y <= c.top[i] ? B.WATER : B.AIR)) continue;   // inside the water body it becomes water
      this.destroyLeft--; this.destroyed++;
      const shape = BLOCKS[id].shape;
      if (shape === SHAPE.DOOR || shape === SHAPE.SALOON_DOOR) {   // take the other half of the door with it
        if (BLOCKS[this.world.getBlock(x, y + 1, z)].shape === shape && this.m.budgetLeft > 0) this.m.setBlock(x, y + 1, z, B.AIR);
        if (BLOCKS[this.world.getBlock(x, y - 1, z)].shape === shape && this.m.budgetLeft > 0) this.m.setBlock(x, y - 1, z, B.AIR);
      }
      this._queue(EV_CRACK, x + 0.5, y + 0.5, z + 0.5, id);
    }
    return true;
  }

  // Drain layer by layer from the top; within a layer cell by cell from the far side; only water the flood created.
  // When the layers are gone a final sweep walks every column and clears any flood water still standing (columns
  // whose chunk was not loaded when their layer was drained, water left by late destruction) before the end.
  _drain() {
    const c = this.c, world = this.world, journal = this.m.journal, full = this.g.floodTop - 1;
    if (this.drainSweep >= 0) {
      let k = this.drainSweep;
      for (let n = 0; n < SWEEP_COLUMNS && k < c.n; n++, k++) {
        const b = c.base[k];
        if (b === UNKNOWN) continue;
        const x = c.colX[k], z = c.colZ[k];
        if (!world.isLoaded(x, z)) continue;
        for (let y = b + 1; y <= full; y++) {
          if (world.getBlock(x, y, z) !== B.WATER) continue;
          const o = journal.original(x, y, z);
          if (o === undefined || o === B.WATER) continue;
          if (this.m.budgetLeft <= 0) { this.drainSweep = k; return; }
          this.m.setBlock(x, y, z, B.AIR);
        }
        c.top[k] = b;
      }
      this.drainSweep = k;
      if (k >= c.n) this.drainDone = true;
      return;
    }
    let visits = 0;
    while (visits < MAX_DRAIN_VISITS) {
      if (this.drainY <= this.minBase) { this.drainSweep = 0; return; }
      if (this.drainJ < 0) {                                     // cell finished: next cell, or next layer down
        if (--this.drainCell < 0) { this.drainCell = c.S - 1; this.drainY--; }
        this.drainJ = c.cells[this.drainCell].length - 1;
        continue;
      }
      const i = c.cells[this.drainCell][this.drainJ], y = this.drainY;
      visits++;
      if (c.base[i] === UNKNOWN || y <= c.base[i]) { this.drainJ--; continue; }
      const x = c.colX[i], z = c.colZ[i];
      if (world.getBlock(x, y, z) !== B.WATER) { if (c.top[i] >= y) c.top[i] = y - 1; this.drainJ--; continue; }
      const o = journal.original(x, y, z);
      if (o === undefined || o === B.WATER) { this.drainJ--; continue; }
      if (this.m.budgetLeft <= 0) return;                        // resume at this column next tick
      this.m.setBlock(x, y, z, B.AIR);
      if (c.top[i] >= y) c.top[i] = y - 1;
      this.drainJ--;
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

  // Flow for swimming townsfolk: the current, plus a nudge toward open water when their head is under a ceiling
  // (a flooded room), so they drift to the doorway instead of bobbing against the roof.
  _npcFlow(x, z) {
    const f = this._flowAt(x, z);
    const world = this.world, yTop = this.g.floodTop, bx = Math.floor(x), bz = Math.floor(z);
    const ceiling = (cx, cz) => BLOCKS[world.getBlock(cx, yTop, cz)].solid || BLOCKS[world.getBlock(cx, yTop + 1, cz)].solid;
    if (this.phase === 'ending' || !ceiling(bx, bz)) return f;
    let bestX = 0, bestZ = 0, bestD = Infinity;
    for (let r = 1; r <= 6 && bestD === Infinity; r++) {                  // ring search for the nearest open cell
      for (let k = -r; k <= r; k++) {
        for (let side = 0; side < 4; side++) {
          const ox = side < 2 ? k : (side === 2 ? -r : r), oz = side < 2 ? (side === 0 ? -r : r) : k;
          if (ceiling(bx + ox, bz + oz)) continue;
          const d = ox * ox + oz * oz;
          if (d < bestD) { bestD = d; bestX = ox; bestZ = oz; }
        }
      }
    }
    if (bestD === Infinity) return f;
    const len = Math.sqrt(bestD), out = this.flow2;
    out[0] = (bestX / len) * 1.8 + (f ? f[0] * 0.3 : 0);
    out[1] = (bestZ / len) * 1.8 + (f ? f[1] * 0.3 : 0);
    return out;
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
    const info = { kind: 'flood', x: g.cx + g.dx * k, z: g.cz + g.dz * k, radius: g.r * 2 + 40, awayRadius: g.r, safeY: g.floodTop, dir: [g.dx, g.dz], flowFn: this.npcFlowFn };
    if (this.game.npcs) this.game.npcs.alert(info);
    if (this.game.animals) this.game.animals.alert({ ...info, flowFn: this.flowFn });
  }

  _queue(kind, x = 0, y = 0, z = 0, id = 0) { if (this.events.length < EV_MAX) this.events.push(kind, x, y, z, id); }

  // ------------------------------------------------------------------ debris hooks
  _waterLevelAt(x, z) {
    const i = this._colAt(x, z);
    if (i < 0) return -Infinity;
    const c = this.c;
    if (c.base[i] === UNKNOWN || c.top[i] <= c.base[i]) return -Infinity;
    let lvl = c.top[i] + 0.9;
    if (this.phase === 'wave') {                 // ride the crest
      const behind = this.s - c.colP[i];
      if (behind > -1 && behind < CREST_BACK) lvl = Math.max(lvl, this.g.baseY + crestDepth(behind, this.g.depth, this.g.lip) - 0.1);
    }
    return lvl;
  }

  _debrisForce(i, out) {
    const d = this.m.debris;
    // pieces resting far from the camera give their slot back early; near ones stay deposited for their full life
    if (d.camera) {
      const cx = d.px[i] - d.camera.position.x, cz = d.pz[i] - d.camera.position.z;
      if (cx * cx + cz * cz > 100 * 100 && d.life[i] - d.age[i] > 12) d.life[i] = d.age[i] + 6 + 4 * ((i * 7) % 5) / 5;
    }
    const f = this._flowAt(d.px[i], d.pz[i]);
    if (!f) return;
    if (d.py[i] > this._waterLevelAt(d.px[i], d.pz[i]) + 0.3) return;
    const k = 2.5 * d.mass[i];
    out.x += (f[0] - d.vx[i]) * k;
    out.z += (f[1] - d.vz[i]) * k;
  }

  // Render-side debris launch for a destroyed block: budgeted per second, likelier near the camera, and when the
  // shared pool is full the piece that is farthest from the camera (weighted by age) gives up its slot.
  _spawnDebris(x, y, z, id, camDist) {
    const d = this.m.debris;
    if (this.debrisAcc < 1) return;
    const pNear = camDist < 40 ? 1 : camDist > 120 ? 0.1 : 1 - 0.9 * (camDist - 40) / 80;
    if (Math.random() > pNear) return;
    if (d.count >= Math.floor(d.max * DEBRIS_POOL_SHARE)) {
      if (!d.camera) return;
      const cx = d.camera.position.x, cz = d.camera.position.z;
      let worst = -1, worstScore = -1;
      for (let k = 0; k < 24; k++) {
        const j = Math.floor(Math.random() * d.count);
        const dx = d.px[j] - cx, dz = d.pz[j] - cz;
        const score = (dx * dx + dz * dz + 25) * (1 + d.age[j] / 20);
        if (score > worstScore) { worstScore = score; worst = j; }
      }
      if (worst < 0) return;
      d.remove(worst);
    }
    this.debrisAcc -= 1;
    const g = this.g, sp = this.params.speed;
    const f = 0.7 + Math.random() * 0.5, side = (Math.random() - 0.5) * 3.2;
    const size = 0.45 + Math.random() * 0.3, life = DEBRIS_LIFE_MIN + Math.random() * (DEBRIS_LIFE_MAX - DEBRIS_LIFE_MIN);
    if (d.spawn(x, y + 0.1, z, g.dx * sp * f - g.dz * side, 2 + Math.random() * 4, g.dz * sp * f + g.dx * side, id, size, life, { buoyant: true }) >= 0) this.m.stats.debrisSpawned++;
  }

  // ------------------------------------------------------------------ visuals (per frame)
  _ensureVisuals() {
    if (!this.visuals) {
      this.visuals = new WaveVisuals(this.game.scene, this.game.atlas);
      this.visuals.setGeometry(this.g.cx, this.g.cz, this.g.dx, this.g.dz, this.g.r, this.g.baseY);
    }
    return this.visuals;
  }

  _ensureCrest() {
    if (!this.crest) this.crest = new VoxelCrest(this.game.scene, this.game.atlas, this.world, this.m);
    return this.crest;
  }

  render(dt, alpha, camera) {
    const paused = this.m.state === 'paused';
    if (!paused) this.anim += dt;
    const vis = this._ensureVisuals();
    if (this.preview) {
      vis.setSea(this.g.baseY - 4, this.anim, 0);
      vis.setDiscTime(this.anim);
      return;
    }
    const g = this.g, p = this.game.player;
    const s = paused ? this.s : this.prevS + (this.s - this.prevS) * clamp(alpha, 0, 1);
    // player-relative quantities
    const ahead = this._aheadOf(p.pos.x, p.pos.z);
    const perp = -(p.pos.x - g.cx) * g.dz + (p.pos.z - g.cz) * g.dx;          // player's coordinate along the front line
    const k = s - g.r;
    const halfLen = Math.sqrt(Math.max(0, g.r * g.r - k * k)) + 6;
    // crest: voxel strip clipped against the world; hidden while the camera is inside it, under water or indoors
    let crestAlpha = 0;
    if (this.phase === 'wave') crestAlpha = Math.min(1, this.tick / 20) * clamp(1 - (s - (2 * g.r + 4)) / 8, 0, 1);
    const eyeY = p.pos.y + p.eyeHeight;
    const inside = ahead < 1.2 && ahead > -(CREST_BACK + 1) && eyeY < g.crestTop + 0.6;
    const fadeTarget = (inside || p.eyeUnderwater || this._indoors(p.pos.x, eyeY, p.pos.z)) ? 0 : 1;
    if (!paused) this.crestFade += (fadeTarget - this.crestFade) * Math.min(1, dt * 7);
    const crest = this._ensureCrest();
    crest.update(dt, {
      s, cx: g.cx, cz: g.cz, dx: g.dx, dz: g.dz, r: g.r, baseY: g.baseY, depth: g.depth, lip: g.lip, time: this.anim,
      camX: camera.position.x, camZ: camera.position.z, alpha: crestAlpha * this.crestFade, paused,
    });
    // far sea: rises with the wave, follows the draining level, sinks away at the end
    let seaTarget, alphaTarget = 0.85;
    if (this.phase === 'wave' || this.phase === 'hold') seaTarget = g.baseY - 4 + (g.floodTop - 0.15 - (g.baseY - 4)) * clamp(this.tick / 160, 0, 1);
    else if (this.phase === 'recede') seaTarget = this.drainY + 0.85;
    else { seaTarget = g.baseY - 4; alphaTarget = 0; }
    if (!paused) { const kk = Math.min(1, dt * 1.5); this.seaY += (seaTarget - this.seaY) * kk; this.seaAlpha += (alphaTarget - this.seaAlpha) * kk; }
    vis.setSea(this.seaY, this.anim, this.seaAlpha);
    // environment: overcast storm while the water is up, thinning as it recedes, clear again at the end
    const env = (this.phase === 'wave' || this.phase === 'hold') ? 1 : this.phase === 'recede' ? 2 : 0;
    if (env !== this.envState) { this.envState = env; if (env === 1) this.m.effects.setEnvironment(ENV_STORM); else if (env === 2) this.m.effects.setEnvironment(ENV_RECEDE); else this.m.effects.reset(); }
    if (paused) return;
    const fp = this._tmp;                                                     // nearest point of the front to the player
    const pc = clamp(perp, -halfLen, halfLen);
    fp.x = g.cx + g.dx * k - g.dz * pc; fp.z = g.cz + g.dz * k + g.dx * pc; fp.y = g.crestTop - 1;
    const dFront = this.phase === 'wave' ? Math.abs(ahead) : Infinity;
    if (this.phase === 'wave' && dFront < 25) this.m.effects.shake(0.35 * (1 - dFront / 25) * (0.5 + 0.5 * this.params.intensity), 4);
    this.debrisAcc = Math.min(DEBRIS_BURST, this.debrisAcc + DEBRIS_RATE * dt);
    this._foam(dt, s, halfLen, perp, ahead, camera);
    this._audio(dt, dFront, fp, ahead);
    this._flushEvents(fp, p, camera);
  }

  // A solid block within 10 blocks above the eye: the camera is under a roof / ceiling.
  _indoors(x, y, z) {
    const bx = Math.floor(x), bz = Math.floor(z), y0 = Math.floor(y) + 1;
    for (let yy = y0; yy < y0 + 10 && yy < CH; yy++) if (BLOCKS[this.world.getBlock(bx, yy, bz)].solid) return true;
    return false;
  }

  // Spray at the lip: small textured chips (snow tile = foam, water tile = drops), never spawned right at the
  // camera and shrunk when close so they read as spray instead of filling the screen.
  _foam(dt, s, halfLen, perp, ahead, camera) {
    if (this.phase !== 'wave' || Math.abs(ahead) > 90 || this.foamLive >= MAX_FOAM || this.crestFade < 0.3) { this.foamLive = Math.max(0, this.foamLive - dt * 160); return; }
    const g = this.g, parts = this.game.particles, sp = this.params.speed;
    const rate = 70 + 70 * this.params.intensity;
    this.foamAcc += rate * dt;
    let n = Math.min(6, Math.floor(this.foamAcc));
    this.foamAcc -= n;
    const k = s - g.r, cam = camera.position, uv = this._uv;
    const lipY = g.baseY + g.depth + Math.max(0.5, g.lip) - 0.3;
    while (n-- > 0) {
      const along = clamp(perp + (Math.random() - 0.5) * 70, -halfLen, halfLen);
      const d = k - 3 - Math.random() * 4;                                   // on the lip, 3-7 blocks behind the foot
      const x = g.cx + g.dx * d - g.dz * along, z = g.cz + g.dz * d + g.dx * along;
      const y = lipY + Math.random() * 0.8;
      const dcx = x - cam.x, dcz = z - cam.z, camDist = Math.sqrt(dcx * dcx + dcz * dcz);
      if (camDist < 2.5) continue;
      const near = Math.min(1, camDist / 8);
      const f = sp * (0.8 + Math.random() * 0.5), side = (Math.random() - 0.5) * 3;
      const vx = g.dx * f - g.dz * side, vz = g.dz * f + g.dx * side;
      const tile = Math.random() < 0.6 ? this._snow : this._water;
      const sub = tile[2] / 4;
      uv[0] = tile[0] + Math.floor(Math.random() * 3) * sub; uv[1] = tile[1] + Math.floor(Math.random() * 3) * sub; uv[2] = sub; uv[3] = 0;
      parts.spawn(x, y, z, vx, 2 + Math.random() * 4, vz, (0.14 + Math.random() * 0.14) * near, 0.45 + Math.random() * 0.4, 0, uv, WHITE, 1);
      this.foamLive++;
    }
    this.foamLive = Math.max(0, this.foamLive - dt * 160);   // ~ average particle lifetime turnover
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

  // Destruction events -> chips of the broken block + foam, crack sounds and debris (all camera-relative, visual only).
  _flushEvents(fp, player, camera) {
    const ev = this.events;
    if (!ev.length) return;
    const audio = this.game.audio, parts = this.game.particles, at = this._evPos, uv = this._uv;
    const cam = camera.position;
    this.crackTimer -= 0.016;
    for (let i = 0; i < ev.length; i += EV_STRIDE) {
      const kind = ev[i];
      if (kind === EV_CRACK) {
        const x = ev[i + 1], y = ev[i + 2], z = ev[i + 3], id = ev[i + 4];
        const dcx = x - cam.x, dcz = z - cam.z, d = Math.sqrt(dcx * dcx + dcz * dcz);
        if (d > 130) continue;
        this._spawnDebris(x, y, z, id, d);
        if (d > 60) continue;
        if (this.crackTimer <= 0) { at.x = x; at.y = y; at.z = z; audio.crack(at); this.crackTimer = 0.15; }
        if (this.foamLive < MAX_FOAM && d > 2) {
          const def = BLOCKS[id], tile = def && def.tex ? def.tex[2] : (TILES.oak_planks ?? 0);
          const ts = 1 / ATLAS_TILES, tu = (tile % ATLAS_TILES) * ts, tv = Math.floor(tile / ATLAS_TILES) * ts, sub = ts / 4;
          const near = Math.min(1, d / 8);
          for (let n = 0; n < 4; n++) {
            const foam = n === 3, t = foam ? this._snow : null;
            uv[0] = (foam ? t[0] : tu) + Math.floor(Math.random() * 3) * sub; uv[1] = (foam ? t[1] : tv) + Math.floor(Math.random() * 3) * sub; uv[2] = sub; uv[3] = 0;
            parts.spawn(x + (Math.random() - 0.5) * 0.6, y + (Math.random() - 0.5) * 0.6, z + (Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 4 + this.g.dx * 2, 1 + Math.random() * 3, (Math.random() - 0.5) * 4 + this.g.dz * 2, (0.12 + Math.random() * 0.08) * near, 0.6 + Math.random() * 0.4, 0, uv, WHITE, 1);
            this.foamLive++;
          }
        }
      } else if (kind === EV_SPLASH) audio.splashBig(fp);
      else if (kind === EV_RUMBLE) { audio.rumble(fp, 0.8); this.m.effects.shake(0.25, 2); }
    }
    ev.length = 0;
  }
}
