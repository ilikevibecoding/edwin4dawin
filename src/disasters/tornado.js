// Tornado disaster: a rotating funnel travels along a deterministic, wobbling track, tearing exposed blocks
// out of buildings from the outside in (roof-first, fragility-weighted, budgeted, journaled), hurling debris,
// townsfolk, animals and the player with a Rankine-style wind field, turning the sky into a storm overcast and
// howling. After `duration` seconds (or on stop()) the funnel ropes out over ~6 s and the forces fade.
//
// Determinism: everything in simulate() depends only on (params, seed, tick, world state). The path is a
// pure function of the tick; block picks and fragility rolls use `this.rng`; entity/player randomness comes
// from hashes of the tick so it can never desynchronise the block RNG. Visual randomness lives in render().
//
// Heading convention: degrees clockwise from north viewed from above; 0 = north (-z), 90 = east (+x),
// 180 = south (+z), 270 = west (-x).
import { Disaster } from './base.js';
import { DisasterManager } from './manager.js';
import { B, BLOCKS, SHAPE } from '../blocks.js';
import { ATLAS_TILES, CHUNK_HEIGHT } from '../constants.js';
import { hash2, hash3, clamp } from '../rng.js';
import { TornadoPath } from './tornado/path.js';
import { windAt, SWIRL_SIGN, OUTER } from './tornado/field.js';
import { FunnelVisual, STORM_COLOR } from './tornado/funnel.js';
import { DustSkirt } from './tornado/skirt.js';
import { PathPreview } from './tornado/preview.js';

const ROPE_TICKS = 120;           // rope-out length (6 s)
const TOUCHDOWN_TICKS = 60;       // funnel descends / spins up over the first 3 s
const RIP_PICKS = 32;             // candidate cells tested per tick
const TOP_PICK_SHARE = 0.6;       // share of picks aimed at the topmost block of the column (roof-first)
const SCAN_ABOVE = 24;            // blocks above the terrain surface searched for structures
const GROUND_SCOUR = 0.12;        // rip probability multiplier for the terrain surface itself
// exposure faces (index stored with each queued rip): 0 = up, 1 = +x, 2 = -x, 3 = +z, 4 = -z
const FX = [0, 1, -1, 0, 0], FY = [1, 0, 0, 0, 0], FZ = [0, 0, 0, 1, -1];
const CAPTURE_TICKS = 80;         // a player held in / on the core this long (4 s) is thrown clear...
const EJECT_TICKS = 60;           // ...and the wind lets go of them for 3 s
// Decided rips are applied in bursts every RIP_BATCH_TICKS (0.8 s). The manager answers every touched chunk
// with a full relight plus a remesh of that chunk and its 8 neighbours (~20 ms on this VM), so the number of
// distinct chunks touched per second, not the block count, sets the price. A burst therefore tears out the
// cells of ONE chunk (the one that has waited longest); a second chunk is flushed in the same burst only when
// more than RIP_OVERFLOW cells are still queued, so the cost stays at ~1.25 relights/s in normal destruction
// and never exceeds 2.5/s. Cells the funnel has left behind (> 2 radii away) are dropped instead of ripped.
const RIP_BATCH_TICKS = 16;
const PENDING_MAX = 64;           // cells waiting for a burst (x,y,z,id,face each); a full queue drops new picks
const PENDING_STRIDE = 5;
const RIP_OVERFLOW = 32;          // queued cells that justify a second chunk in the same burst
const MAX_DEBRIS_PER_BURST = 12;  // debris launched per burst tick (~15 per second on average)
const MAX_FLING_PER_TICK = 3;
const ALERT_INTERVAL = 40;        // ticks between NPC/animal alerts (2 s)
const CLOUD_DECK_Y = 120;
const DUST_RATE = 70;             // pool dust streaks per second at full intensity (the skirt carries the base)
const DUST_LIFE = 1.2;
const SKY_NEAR = 120;             // storm sky at full strength within this distance of the funnel...
const SKY_FAR = 300;              // ...and at 35 % beyond this one
const SOUND_RANGE = 220;
const BELL_RANGE = 220;
const RIP_QUEUE_MAX = 48;         // ripped cells buffered for render-side effects (x,y,z,id)

export class Tornado extends Disaster {
  static type = 'tornado';
  static label = 'Tornado';
  static description = 'A rotating funnel travels along a path, tearing up light structures and hurling debris, animals and people.';
  static schema = [
    { key: 'start', label: 'Spawn location (x, z)', type: 'position', default: [-90, 40] },
    { key: 'heading', label: 'Heading (0 = north, 90 = east)', type: 'angle', min: 0, max: 360, step: 5, default: 60, unit: 'deg' },
    { key: 'wander', label: 'Path wobble', type: 'number', min: 0, max: 1, step: 0.05, default: 0.35 },
    { key: 'radius', label: 'Funnel radius', type: 'number', min: 3, max: 25, step: 1, default: 9, unit: 'blocks' },
    { key: 'speed', label: 'Travel speed', type: 'number', min: 0, max: 12, step: 0.5, default: 3, unit: 'blocks/s' },
    { key: 'duration', label: 'Duration', type: 'number', min: 10, max: 240, step: 5, default: 75, unit: 's' },
    { key: 'intensity', label: 'Intensity', type: 'number', min: 0, max: 1, step: 0.05, default: 0.7 },
  ];

  constructor(manager, params, seed) {
    super(manager, params, seed);
    this.track = new TornadoPath(this.params, this.rng);                    // draws its wobble constants from the seeded RNG
    this.position = { x: this.params.start[0], z: this.params.start[1] };   // funnel centre (simulation)
    this.prevPosition = { x: this.position.x, z: this.position.z };
    this.path = this.track.waypoints(0, this.durationTicks, 20);           // predicted track (1 s steps) for UI/preview
    this.groundY = this.groundAt(this.position.x, this.position.z) + 1;
    this.ropeStart = -1;      // tick at which rope-out began (-1 = not yet)
    this.rope = 0;            // 0..1 rope-out progress (simulation)
    this.strength = 0;        // force multiplier (touchdown ramp * rope fade)
    this.flung = 0;
    this.gustX = 0; this.gustZ = 0; this.gustMag = 0;
    this.captured = 0;        // consecutive-ish ticks the player has spent inside the core
    this.ejectUntil = 0;      // tick until which the wind ignores a thrown-out player
    this.ripQueue = [];       // flattened [x,y,z,id,...] consumed by render()
    this.pending = [];        // flattened [x,y,z,id,face,...] rips decided but not yet applied (see RIP_BATCH_TICKS)
    this.spawned = 0;         // debris launched in the current burst
    this.ripCount = 0;
    // visuals / audio state (render side)
    this.visual = null;
    this.skirt = null;
    this.previewMesh = null;
    this.vtime = 0;
    this.rx = this.position.x; this.rz = this.position.z;
    this.baseY = this.groundY;
    this.ropeSmooth = 1;      // 1 = not touched down / roped out (the funnel descends from this)
    this.dustAcc = 0;
    this.envTimer = 0; this.soundTimer = 0; this.rumbleTimer = 1.5; this.bellTimer = 1.0; this.crackTimer = 0;
    this.windLoop = null;
    this.playerDist = 1e9;
    // preallocated scratch (no per-frame allocations in hot loops)
    this._wind = { x: 0, y: 0, z: 0 };
    this._uv = [0, 0, 0, 1];
    this._chipUv = [0, 0, 0, 0];
    this._col = [0.6, 0.5, 0.36];
    this._white = [1, 1, 1];
    this._sndPos = { x: 0, y: 0, z: 0 };
    this._forceFn = (i, out, dt) => this.debrisForce(i, out, dt);
    this._flingNpc = (npc, d) => this.fling(this.game.npcs, npc, d, 1);
    this._flingAnimal = (a, d) => this.fling(this.game.animals, a, d, 0.9);
    this._tint = [1, 1, 1];
    this._sky = [0, 0, 0];
    this._vs = { x: 0, z: 0, baseY: 0, topY: CLOUD_DECK_Y, radius: 9, rope: 1, time: 0, fade: 0, deckFade: 0, day: 1, sky: this._sky, swayX: 0, swayZ: 0 };
    this.envReset = false;
  }

  // After the rope-out completes: hide the funnel, silence the wind and restore the lighting.
  finishVisuals() {
    if (this.visual) this.visual.group.visible = false;
    if (this.skirt) this.skirt.mesh.visible = false;
    if (this.windLoop) { this.game.audio.loopStop('wind', 1.0); this.windLoop = null; }
    if (!this.envReset) { this.m.effects.reset(); this.envReset = true; }
    this.ripQueue.length = 0;
  }

  // ------------------------------------------------------------------------------------------ helpers
  // Terrain ground height (top solid block) ignoring buildings: pure function of (x, z).
  groundAt(x, z) {
    const gen = this.game.gen;
    if (gen && gen.surfaceHeight) return gen.surfaceHeight(Math.floor(x), Math.floor(z));
    const s = this.world.surfaceY(Math.floor(x), Math.floor(z));
    return s < 0 ? 56 : s;
  }

  // Outside-in exposure. A block can only be torn out through a face whose neighbouring cell is open air that
  // lies under the sky (no solid block anywhere above it up to yTop). Interior air under a roof does not
  // count, so shelves, floors and inner walls survive until the roof over them is gone, while roofs, false
  // fronts, porches, signs, fences and facades go first. Uses block data only: the light arrays are refreshed
  // per frame, not per tick, and would break determinism. Returns the face index (see FX/FY/FZ) or -1.
  exposedFace(x, y, z, yTop) {
    const w = this.world;
    if (this.skyOpen(x, y + 1, z, yTop)) return 0;
    for (let f = 1; f < 5; f++) {
      const nx = x + FX[f], nz = z + FZ[f];
      if (!BLOCKS[w.getBlock(nx, y, nz)].solid && this.skyOpen(nx, y, nz, yTop)) return f;
    }
    return -1;
  }

  // true when every cell of column (x, z) from y up to yTop is non-solid (the cell can see the sky)
  skyOpen(x, y, z, yTop) {
    const w = this.world;
    for (let yy = y; yy <= yTop; yy++) if (BLOCKS[w.getBlock(x, yy, z)].solid) return false;
    return true;
  }

  // Highest rippable block of the column within (g, yTop]; g (the terrain surface) when nothing stands there.
  columnTop(x, z, g, yTop) {
    const w = this.world;
    for (let y = yTop; y > g; y--) { const id = w.getBlock(x, y, z); if (id !== B.AIR && id !== B.WATER) return y; }
    return g;
  }

  queued(x, y, z) {
    const p = this.pending;
    for (let i = 0; i < p.length; i += PENDING_STRIDE) if (p[i] === x && p[i + 1] === y && p[i + 2] === z) return true;
    return false;
  }

  warnings() {
    const p = this.params;
    const out = [`Travels ${p.speed * p.duration | 0} blocks from (${p.start[0]}, ${p.start[1]}) heading ${p.heading}° (0 = north, 90 = east); core radius ${p.radius}, influence to ${p.radius * OUTER} blocks.`];
    const town = this.game.town;
    if (town && town.buildings) {
      const hit = new Set();
      for (let i = 0; i < this.path.length; i += 2) {
        const wp = this.path[i];
        for (const b of town.buildings) {
          if (!b.bounds || !b.name || hit.has(b.name)) continue;
          if (wp.x > b.bounds.x0 - p.radius && wp.x < b.bounds.x1 + p.radius && wp.z > b.bounds.z0 - p.radius && wp.z < b.bounds.z1 + p.radius) hit.add(b.name);
        }
      }
      if (hit.size) { const names = [...hit]; out.push(`Threatens ${names.slice(0, 6).join(', ')}${names.length > 6 ? ` and ${names.length - 6} more` : ''}.`); }
      else out.push('The predicted track misses every building.');
    }
    return out;
  }

  // ------------------------------------------------------------------------------------------ lifecycle
  begin() {
    this.track.positionAt(0, this.position);
    this.prevPosition.x = this.position.x; this.prevPosition.z = this.position.z;
    this.rx = this.position.x; this.rz = this.position.z;
    this.groundY = this.groundAt(this.position.x, this.position.z) + 1;
    this.baseY = this.groundY;
    this.m.debris.forceFn = this._forceFn;
    this.alertEntities();
  }

  beginPreview() { this.buildPreview(); }

  buildPreview() {
    if (this.previewMesh) this.previewMesh.dispose();
    this.previewMesh = new PathPreview(this.game.scene, this.path, this.params.radius, (x, z) => this.groundAt(x, z) + 1);
  }

  // Live parameter change ('set' command): re-anchor the track at the current position so it stays continuous.
  onParamsChanged() {
    this.track.speed = this.params.speed;
    this.track.wander = this.params.wander;
    this.track.anchor(this.position.x, this.position.z, this.params.heading, this.tick);
    this.path = this.track.waypoints(this.tick, Math.max(this.tick, this.durationTicks), 20);
    if (this.preview) this.buildPreview();
  }

  stop() { this.stopping = true; }

  dispose() {
    if (this.visual) { this.visual.dispose(); this.visual = null; }
    if (this.skirt) { this.skirt.dispose(); this.skirt = null; }
    if (this.previewMesh) { this.previewMesh.dispose(); this.previewMesh = null; }
    if (this.m.debris.forceFn === this._forceFn) this.m.debris.forceFn = null;
    this.m.effects.reset();
    if (this.windLoop) { this.game.audio.loopStop('wind', 0.8); this.windLoop = null; }
    this.ripQueue.length = 0;
    this.pending.length = 0;
  }

  // ------------------------------------------------------------------------------------------ simulation (20 TPS)
  simulate() {
    this.prevPosition.x = this.position.x; this.prevPosition.z = this.position.z;
    if (this.ropeStart < 0 && (this.stopping || this.tick >= this.durationTicks)) this.ropeStart = this.tick;
    if (this.ropeStart >= 0) {
      this.rope = clamp((this.tick - this.ropeStart) / ROPE_TICKS, 0, 1);
      if (this.tick - this.ropeStart >= ROPE_TICKS) { this.done = true; this.strength = 0; return; }
    }
    const touchdown = clamp(this.tick / TOUCHDOWN_TICKS, 0, 1);
    const fade = 1 - this.rope;
    this.strength = touchdown * fade * fade;
    this.track.positionAt(this.tick, this.position);
    this.groundY = this.groundAt(this.position.x, this.position.z) + 1;

    if (this.tick % ALERT_INTERVAL === 1 && this.rope < 0.5) this.alertEntities();
    this.pushPlayer();
    this.flung = 0;
    if (this.strength > 0.05) {
      const r = this.params.radius;
      if (this.game.npcs) this.game.npcs.eachNear(this.position.x, this.position.z, r, this._flingNpc);
      if (this.game.animals) this.game.animals.eachNear(this.position.x, this.position.z, r, this._flingAnimal);
    }
    if (this.rope < 0.6) this.ripBlocks(touchdown * (1 - this.rope / 0.6));
    else if (this.tick % RIP_BATCH_TICKS === 0) this.applyRips();       // drain what is left while roping out
  }

  alertEntities() {
    const info = { kind: 'tornado', x: this.position.x, z: this.position.z, radius: 120, awayRadius: Math.max(40, this.params.radius * OUTER) };
    if (this.game.npcs) this.game.npcs.alert(info);
    if (this.game.animals) this.game.animals.alert(info);
  }

  // Deterministic block ripping inside the core cylinder, outside in and fragility-weighted. Every tick
  // RIP_PICKS columns are drawn; most picks aim at the topmost block of the column (roof, false front, porch
  // roof, fence, sign), the rest at a random height where only blocks with an exposed outdoor face qualify
  // (facades, windows, balconies) - see exposedFace(). Cells that fail their fragility roll are queued and
  // torn out chunk by chunk every RIP_BATCH_TICKS ticks (applyRips), which bounds the manager's relight/remesh
  // work per second while the rip rate stays the same.
  ripBlocks(mult) {
    const R = this.params.radius, I = this.params.intensity * mult;
    if (I <= 0) return;
    const cx = this.position.x, cz = this.position.z;
    const rng = this.rng, world = this.world, pending = this.pending;
    for (let k = 0; k < RIP_PICKS; k++) {
      const u = rng.next(), a = rng.next() * Math.PI * 2, rr = R * Math.sqrt(u);
      const x = Math.floor(cx + rr * Math.cos(a)), z = Math.floor(cz + rr * Math.sin(a));
      const g = this.groundAt(x, z);
      const yTop = Math.min(CHUNK_HEIGHT - 2, g + SCAN_ABOVE);
      const top = this.columnTop(x, z, g, yTop);
      const roofPick = rng.next() < TOP_PICK_SHARE || top <= g;
      const y = roofPick ? top : g + Math.floor(rng.next() * (top - g + 1));
      if (y < 1) continue;
      const id = world.getBlock(x, y, z);
      if (id === B.AIR || id === B.WATER || id === B.BEDROCK) continue;
      const face = roofPick ? 0 : this.exposedFace(x, y, z, yTop);
      if (face < 0) continue;
      const dx = x + 0.5 - cx, dz = z + 0.5 - cz;
      const d = Math.sqrt(dx * dx + dz * dz);
      let pr = DisasterManager.fragility(id) * I * (1 - d / R);
      if (y <= g) pr *= GROUND_SCOUR;                   // scours the ground only occasionally
      if (pr <= rng.next()) continue;
      // full queue = budget hit: drop the pick
      if (pending.length < PENDING_MAX * PENDING_STRIDE && !this.queued(x, y, z)) pending.push(x, y, z, id, face);
    }
    if (this.tick % RIP_BATCH_TICKS === 0) this.applyRips();
  }

  // Tear out queued cells: the chunk of the oldest queued cell is flushed (all of its cells), plus the next
  // oldest chunk when the queue is still long. Cells of other chunks stay queued in order for the next burst.
  applyRips() {
    const pending = this.pending;
    if (!pending.length) return;
    this.spawned = 0;
    this.flushChunk(pending[0] >> 4, pending[2] >> 4);
    if (pending.length > RIP_OVERFLOW * PENDING_STRIDE) this.flushChunk(pending[0] >> 4, pending[2] >> 4);
  }

  // Set every queued cell of chunk (kx, kz) to AIR (journaled, budgeted) and launch debris from the exposed
  // face outward, tangentially, so it starts in open air and orbits the funnel; the remaining cells are
  // compacted in place (no allocation).
  flushChunk(kx, kz) {
    const pending = this.pending, world = this.world;
    const cx = this.position.x, cz = this.position.z;
    const stale2 = 4 * this.params.radius * this.params.radius;
    let w = 0;
    for (let i = 0; i < pending.length; i += PENDING_STRIDE) {
      const x = pending[i], y = pending[i + 1], z = pending[i + 2], id = pending[i + 3], face = pending[i + 4];
      if ((x >> 4) !== kx || (z >> 4) !== kz) {
        pending[w] = x; pending[w + 1] = y; pending[w + 2] = z; pending[w + 3] = id; pending[w + 4] = face; w += PENDING_STRIDE;
        continue;
      }
      const dx = x + 0.5 - cx, dz = z + 0.5 - cz;
      if (dx * dx + dz * dz > stale2) continue;         // the funnel has moved on
      if (world.getBlock(x, y, z) !== id) continue;     // already gone
      if (!this.m.setBlock(x, y, z, B.AIR)) continue;
      this.ripCount++;
      if (this.ripQueue.length < RIP_QUEUE_MAX * 4) this.ripQueue.push(x, y, z, id);
      const def = BLOCKS[id];
      if (this.spawned < MAX_DEBRIS_PER_BURST && def.shape !== SHAPE.CROSS && def.shape !== SHAPE.TORCH && def.shape !== SHAPE.RAIL) {
        this.spawned++;
        const h = hash3(x, y, z, this.seed);
        const r = Math.max(0.5, Math.sqrt(dx * dx + dz * dz)), ux = dx / r, uz = dz / r;
        const vt = 12 + 8 * h, vy = 7 + 6 * (1 - h);
        const tx = SWIRL_SIGN * uz, tz = -SWIRL_SIGN * ux;
        const size = def.shape === SHAPE.CUBE ? 0.7 + 0.15 * h : 0.45;
        const fx = FX[face], fy = FY[face], fz = FZ[face];
        this.m.debris.spawn(x + 0.5 + fx * 0.8, y + 0.5 + fy * 0.8, z + 0.5 + fz * 0.8, tx * vt - ux * 2 + fx * 5, vy + fy * 3, tz * vt - uz * 2 + fz * 5, id, size, 8 + h * 4, { force: true });
        this.m.stats.debrisSpawned++;
      }
    }
    pending.length = w;
  }

  // Player: follows the wind (pulled around and lifted inside the core), buffeted by gusts outside it. A player
  // held in or on the core wall for CAPTURE_TICKS is thrown clear and ignored by the wind for EJECT_TICKS, so
  // nobody is ground down in place; while the wind carries them their accumulated fall distance is capped so
  // being dropped costs at most ~1 HP. Damage per capture is therefore bounded (a few HP).
  pushPlayer() {
    const pl = this.game.player;
    if (!pl || pl.dead) { this.playerDist = 1e9; this.captured = 0; return; }
    const R = this.params.radius, I = this.params.intensity;
    const dx = pl.pos.x - this.position.x, dz = pl.pos.z - this.position.z, dy = pl.pos.y - (this.groundY - 1);
    this.playerDist = Math.sqrt(dx * dx + dz * dz);
    if (this.tick % 10 === 0) { const a = hash2(this.tick, 11, this.seed) * Math.PI * 2; this.gustX = Math.cos(a); this.gustZ = Math.sin(a); this.gustMag = 12 + 18 * hash2(this.tick, 13, this.seed); }
    const w = this._wind;
    const env = windAt(dx, dz, dy, R, I, this.strength, w);
    if (env <= 0) { this.captured = 0; return; }
    if (env > 0.2 && pl.fallDistance > 4.5) pl.fallDistance = 4.5;
    const q = this.playerDist / R;
    const r = Math.max(0.5, this.playerDist), ux = dx / r, uz = dz / r;
    if (this.tick < this.ejectUntil) {                  // thrown out: shoved outward until safely down and clear
      if (!pl.onGround || q < 1.5) pl.addForce(ux * 30, 0, uz * 30);
      return;
    }
    const held = q < 1.25 && this.strength > 0.3;
    this.captured = held ? this.captured + 1 : Math.max(0, this.captured - 2);
    if (this.captured >= CAPTURE_TICKS) {
      this.captured = 0;
      this.ejectUntil = this.tick + EJECT_TICKS;
      const h = hash2(this.tick, 19, this.seed);
      pl.impulse(ux * 20 + SWIRL_SIGN * uz * 10 * h, 2, uz * 20 - SWIRL_SIGN * ux * 10 * h);
      return;
    }
    const lift = dy < 4 ? 1 : dy > 10 ? 0 : 1 - (dy - 4) / 6;   // tossed, not launched into orbit
    w.y *= lift;
    const vx = pl.vel.x * 20, vy = pl.vel.y * 20, vz = pl.vel.z * 20;
    const k = 2.2 + 1.3 * I;
    const gust = env * this.strength * Math.min(1, q / 0.8) * this.gustMag * I;
    pl.addForce((w.x - vx) * k + this.gustX * gust, (w.y - vy) * k * (w.y > vy ? 1 : 0.3), (w.z - vz) * k + this.gustZ * gust);
    if (this.tick % 30 === 0 && q < 0.8 && this.strength > 0.3) {
      const roll = hash2(this.tick, 17, this.seed);
      if (roll < 0.6) pl.damage(roll < 0.2 ? 2 : 1);
    }
  }

  // NPCs / animals inside the core get flung tangentially + upward (a few per tick; airborne ones are
  // topped up every 4th tick so they orbit before being thrown clear).
  fling(mgr, e, d, scale) {
    if (this.flung >= MAX_FLING_PER_TICK) return;
    if (e.air && (this.tick & 3) !== 0) return;
    const r = Math.max(0.5, d);
    const ux = (e.pos.x - this.position.x) / r, uz = (e.pos.z - this.position.z) / r;
    const h = hash2(this.tick, this.flung, this.seed);
    let vt = (8 + 8 * h) * scale * this.strength, vy = (6 + 6 * (1 - h)) * scale * this.strength;
    if (e.air) { vt *= 0.35; vy *= 0.4; }
    mgr.applyImpulse(e, SWIRL_SIGN * uz * vt - ux * 1.5, vy, -SWIRL_SIGN * ux * vt - uz * 1.5);
    this.flung++;
  }

  // Debris force field (called by DebrisSystem per debris per frame): drag toward the wind velocity, gain
  // inversely proportional to mass so light wood follows the swirl while stone lags and gets flung out.
  debrisForce(i, out, dt) {
    const d = this.m.debris;
    const w = this._wind;
    const env = windAt(d.px[i] - this.rx, d.pz[i] - this.rz, d.py[i] - this.baseY, this.params.radius, this.params.intensity, this.strength, w);
    if (env <= 0) return;
    const m = Math.max(0.2, d.mass[i]);
    let k = 2.1 / m;                       // per-second follow gain (0.35 reference mass * 6)
    const kmax = 0.8 / Math.max(dt, 1e-3);
    if (k > kmax) k = kmax;
    const g = k * m * env;
    out.x = (w.x - d.vx[i]) * g;
    out.y = (w.y - d.vy[i]) * g;
    out.z = (w.z - d.vz[i]) * g;
  }

  // ------------------------------------------------------------------------------------------ per frame
  render(dt, alpha, camera) {
    if (this.preview) { if (!this.previewMesh) this.buildPreview(); return; }
    if (this.done) { this.finishVisuals(); return; }
    if (!this.visual) this.visual = new FunnelVisual(this.game.scene);
    if (!this.skirt) this.skirt = new DustSkirt(this.game.scene);
    const paused = this.m.state === 'paused';
    const p = this.params;
    const a = paused ? 1 : alpha;
    this.rx = this.prevPosition.x + (this.position.x - this.prevPosition.x) * a;
    this.rz = this.prevPosition.z + (this.position.z - this.prevPosition.z) * a;
    if (!paused) this.vtime += dt * (0.7 + 0.6 * p.intensity);
    this.baseY += (this.groundY - this.baseY) * Math.min(1, dt * 3);
    const touchdown = clamp((this.tick + alpha) / TOUCHDOWN_TICKS, 0, 1);
    const ropeTarget = Math.max(this.rope, 1 - touchdown);
    this.ropeSmooth += (ropeTarget - this.ropeSmooth) * Math.min(1, dt * 4);
    const ropeEnd = clamp((this.rope - 0.7) / 0.3, 0, 1);      // last 30 % of the rope-out: the funnel body fades
    const fade = Math.min(1, (this.tick + alpha) / 30) * (1 - ropeEnd);
    // storm presence: builds over the first 2 s, blends out across the WHOLE rope-out (deck, overcast, sky, fog)
    const envFade = Math.min(1, (this.tick + alpha) / 160) * (1 - this.rope);
    const day = this.game.sky ? this.game.sky.dayFactor : 1;
    const sky = this.stormSkyColor(day);
    const vx = (this.position.x - this.prevPosition.x) * 20, vz = (this.position.z - this.prevPosition.z) * 20;
    const t = this.vtime;
    const vs = this._vs;
    vs.x = this.rx; vs.z = this.rz; vs.baseY = this.baseY; vs.topY = CLOUD_DECK_Y; vs.radius = p.radius; vs.rope = this.ropeSmooth; vs.time = t;
    vs.fade = fade; vs.deckFade = envFade; vs.day = 0.4 + 0.6 * day; vs.sky = sky;
    vs.swayX = 2.5 * Math.sin(t * 0.6) - vx * 1.2 + this.ropeSmooth * 6 * Math.sin(t * 0.9);
    vs.swayZ = 2.5 * Math.cos(t * 0.45) - vz * 1.2 + this.ropeSmooth * 6 * Math.cos(t * 0.7);
    this.visual.update(vs);
    // ground contact: the skirt lifts and thins with the rope-out
    const contact = fade * (1 - this.ropeSmooth);
    this.skirt.update(this.rx, this.baseY, this.rz, p.radius, t * 1.6, contact * contact * (0.7 + 0.3 * p.intensity), this.ropeSmooth * 20, vs.day);

    const cam = camera.position;
    const cdx = cam.x - this.rx, cdz = cam.z - this.rz;
    const camDist = Math.sqrt(cdx * cdx + cdz * cdz);
    if (!paused) {
      this.spawnDust(dt, camDist, contact);
      this.flushRipEffects(camDist);
    }
    this.updateEnvironment(dt, camDist, envFade, sky);
    this.updateAudio(dt, camDist, fade, paused);
    if (camDist < p.radius * 2.5 && this.strength > 0.1) this.m.effects.shake(0.04 + 0.22 * p.intensity * (1 - camDist / (p.radius * 2.5)) * this.strength, 3);
  }

  // Overcast colour (shared with the deck) scaled by daylight so a night storm stays dark.
  stormSkyColor(day) {
    const s = 0.4 + 0.6 * day, c = this._sky;
    c[0] = STORM_COLOR[0] * s; c[1] = STORM_COLOR[1] * s; c[2] = STORM_COLOR[2] * s;
    return c;
  }

  // Thin, fast dust streaks from the shared pool around the skirt (the skirt itself is instanced, see skirt.js).
  spawnDust(dt, camDist, fade) {
    if (camDist > 220 || fade <= 0.02) return;
    const P = this.game.particles;
    const R = this.params.radius;
    this.dustAcc += dt * DUST_RATE * (0.35 + 0.65 * this.params.intensity) * fade;
    let n = Math.floor(this.dustAcc);
    if (n <= 0) return;
    this.dustAcc -= n;
    if (n > 8) n = 8;
    const col = this._col;
    for (let i = 0; i < n; i++) {
      const ang = Math.random() * Math.PI * 2, rr = R * (0.7 + Math.random() * 1.2);
      const ux = Math.cos(ang), uz = Math.sin(ang);
      const x = this.rx + ux * rr, z = this.rz + uz * rr, y = this.baseY + 0.1 + Math.random() * Math.random() * 4;
      const vt = 10 + 10 * Math.random(), vo = 1 + 3 * Math.random(), vy = 1 + 4 * Math.random();
      const shade = 0.8 + 0.4 * Math.random();
      col[0] = 0.62 * shade; col[1] = 0.52 * shade; col[2] = 0.38 * shade;
      P.spawn(x, y, z, SWIRL_SIGN * uz * vt + ux * vo, vy, -SWIRL_SIGN * ux * vt + uz * vo, 0.5 + 0.5 * Math.random(), DUST_LIFE, 2, this._uv, col, 0.5);
    }
  }

  // Ripped blocks -> chip particles + crack sounds near the player (visual side of ripBlocks).
  flushRipEffects(camDist) {
    const q = this.ripQueue;
    if (!q.length) return;
    const P = this.game.particles, audio = this.game.audio;
    const cam = this.game.camera.position;
    const uv = this._chipUv;
    for (let i = 0; i < q.length; i += 4) {
      const x = q[i], y = q[i + 1], z = q[i + 2], id = q[i + 3];
      const ddx = x - cam.x, ddz = z - cam.z;
      const d2 = ddx * ddx + ddz * ddz;
      if (d2 < 90 * 90) {
        const tile = BLOCKS[id].tex[2];
        const ts = 1 / ATLAS_TILES, tu = (tile % ATLAS_TILES) * ts, tv = Math.floor(tile / ATLAS_TILES) * ts;
        const sub = ts / 4;
        for (let k = 0; k < 5; k++) {
          uv[0] = tu + Math.floor(Math.random() * 3) * sub; uv[1] = tv + Math.floor(Math.random() * 3) * sub; uv[2] = sub; uv[3] = 0;
          P.spawn(x + Math.random(), y + Math.random(), z + Math.random(), (Math.random() - 0.5) * 6, 2 + Math.random() * 5, (Math.random() - 0.5) * 6, 0.14 + Math.random() * 0.08, 0.7 + Math.random() * 0.6, 0, uv, this._white, 1);
        }
        if (d2 < 60 * 60 && this.crackTimer <= 0 && audio.ctx) { this._sndPos.x = x; this._sndPos.y = y; this._sndPos.z = z; audio.crack(this._sndPos); this.crackTimer = 0.18 + Math.random() * 0.15; }
      }
    }
    q.length = 0;
  }

  // Storm sky. skyMix blends the dome, horizon, fog colour, sun/moon/stars and the vanilla cloud colour toward
  // the deck colour and cloudAlpha thins the block clouds under the deck, so the funnel stands under an
  // overcast that matches its own cloud deck. The fog colour is deliberately NOT overridden and the terrain is
  // darkened through the sky tint instead of skyLightMul: game.js darkens the fog (but not the dome) with
  // skyLightMul, which is what produced the grey band at the horizon. Presence is full within SKY_NEAR blocks
  // of the funnel and 35 % beyond SKY_FAR; it ramps in with the touchdown and blends out across the whole
  // rope-out (envFade), after which finishVisuals() resets the effects.
  updateEnvironment(dt, camDist, envFade, sky) {
    this.envTimer -= dt; this.envAcc = (this.envAcc || 0) + dt;
    if (this.envTimer > 0) return;
    const step = this.envAcc; this.envAcc = 0;
    this.envTimer = 0.1;
    const fx = this.m.effects;
    if (envFade <= 0.002) { fx.reset(); return; }
    const I = this.params.intensity;
    const far = clamp((camDist - SKY_NEAR) / (SKY_FAR - SKY_NEAR), 0, 1);
    const gone = clamp((camDist - SKY_FAR) / 300, 0, 1);          // nothing left of the storm sky ~600 blocks out
    const presence = (1 - 0.65 * far * far * (3 - 2 * far)) * (1 - gone) * envFade;
    const mix = presence * (0.85 + 0.15 * I);
    // the dust darkening of the terrain is a daytime effect; at night the world is already dark
    const day = this.game.sky ? this.game.sky.dayFactor : 1;
    const dark = presence * (0.55 + 0.45 * I) * clamp((day - 0.15) / 0.3, 0, 1);
    const tint = this._tint;
    tint[0] = 1 + (0.42 - 1) * dark; tint[1] = 1 + (0.4 - 1) * dark; tint[2] = 1 + (0.385 - 1) * dark;
    fx.setEnvironment({ skyColor: sky, skyMix: mix, cloudAlpha: 1 - 0.9 * mix, skyLightMul: 1, tint, fogColor: null, fogNearMul: 1 - 0.2 * presence, fogFarMul: 1 - 0.2 * presence });
    this.updateLightning(presence, day, step);
  }

  // Lightning: the storm sky flashes bright for a moment (the override colour snaps up and eases back), the
  // world gets a short cool flash and thunder rumbles. Cosmetic only (render side), more frequent at night
  // where it is what silhouettes the funnel.
  updateLightning(presence, day, step) {
    if (presence < 0.25) return;
    this.lightningTimer = (this.lightningTimer === undefined ? 4 : this.lightningTimer) - step;
    if (this.lightningTimer > 0) return;
    const night = 1 - clamp((day - 0.1) / 0.4, 0, 1);
    this.lightningTimer = (night > 0.5 ? 5 : 11) + Math.random() * (night > 0.5 ? 7 : 14);
    const fx = this.m.effects;
    const k = 0.55 + 0.35 * night;
    fx.override.skyColor.setRGB(0.55 + 0.35 * k, 0.6 + 0.32 * k, 0.75 + 0.25 * k);
    fx.flash(0.22 + 0.2 * night, 0.35, [0.8, 0.85, 1]);
    const audio = this.game.audio;
    if (audio && audio.ctx) { this._sndPos.x = this.rx; this._sndPos.y = this.baseY + 40; this._sndPos.z = this.rz; audio.rumble(this._sndPos, 0.8); }
  }

  updateAudio(dt, camDist, fade, paused) {
    const audio = this.game.audio;
    if (this.crackTimer > 0) this.crackTimer -= dt;
    if (!audio || !audio.ctx) return;
    if (!this.windLoop) this.windLoop = audio.loopStart('wind', { kind: 'noise', filter: 'lowpass', cutoff: 300, q: 0.7, gain: 0 });
    this.soundTimer -= dt;
    if (this.soundTimer <= 0) {
      this.soundTimer = 0.1;
      const I = this.params.intensity;
      const near = clamp(1 - camDist / SOUND_RANGE, 0, 1);
      const gain = Math.pow(near, 1.4) * (0.35 + 0.65 * I) * fade * (paused ? 0.4 : 1);
      this._sndPos.x = this.rx; this._sndPos.y = this.baseY + 8; this._sndPos.z = this.rz;
      const sp = audio.spatialFor(this._sndPos, SOUND_RANGE);
      audio.loopSet('wind', { gain, cutoff: 180 + 700 * near * (0.5 + 0.5 * I), pan: sp.pan }, 0.2);
    }
    if (paused) return;
    this.rumbleTimer -= dt;
    if (this.rumbleTimer <= 0) {
      this.rumbleTimer = 3 + Math.random() * 2;
      if (camDist < 140 && fade > 0.2) { this._sndPos.x = this.rx; this._sndPos.y = this.baseY + 4; this._sndPos.z = this.rz; audio.rumble(this._sndPos, 0.3 + 0.6 * this.params.intensity * (1 - camDist / 140)); }
    }
    this.bellTimer -= dt;
    if (this.bellTimer <= 0) {
      this.bellTimer = 4;
      const church = this.game.town && this.game.town.church && this.game.town.church.door;
      if (church && this.rope < 0.5 && fade > 0.3) {
        const ddx = church.x - this.rx, ddz = church.z - this.rz;
        if (ddx * ddx + ddz * ddz < BELL_RANGE * BELL_RANGE) { this._sndPos.x = church.x + 0.5; this._sndPos.y = church.y + 8; this._sndPos.z = church.z + 0.5; audio.bell(this._sndPos); }
      }
    }
  }
}
