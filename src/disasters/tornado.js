// Tornado disaster: a rotating funnel travels along a deterministic, wobbling track, tearing exposed blocks
// out of buildings (fragility-weighted, budgeted, journaled), hurling debris, townsfolk, animals and the
// player with a Rankine-style wind field, darkening the sky and howling. After `duration` seconds (or on
// stop()) the funnel ropes out over ~6 s and the forces fade.
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
import { ATLAS_TILES } from '../constants.js';
import { hash2, hash3, clamp } from '../rng.js';
import { TornadoPath } from './tornado/path.js';
import { windAt, SWIRL_SIGN, OUTER } from './tornado/field.js';
import { FunnelVisual } from './tornado/funnel.js';
import { PathPreview } from './tornado/preview.js';

const ROPE_TICKS = 120;           // rope-out length (6 s)
const TOUCHDOWN_TICKS = 60;       // funnel descends / spins up over the first 3 s
const RIP_PICKS = 24;             // candidate cells tested per tick
const MAX_DEBRIS_PER_TICK = 10;
const MAX_FLING_PER_TICK = 3;
const ALERT_INTERVAL = 40;        // ticks between NPC/animal alerts (2 s)
const CLOUD_DECK_Y = 120;
const DUST_RATE = 200;            // dust particles per second at full intensity (life 1.2 s -> <= 240 live)
const DUST_LIFE = 1.2;
const LIGHT_RANGE = 150;          // blocks: sky darkening / fog range
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
    this.ripQueue = [];       // flattened [x,y,z,id,...] consumed by render()
    this.ripCount = 0;
    // visuals / audio state (render side)
    this.visual = null;
    this.previewMesh = null;
    this.vtime = 0;
    this.rx = this.position.x; this.rz = this.position.z;
    this.baseY = this.groundY;
    this.ropeSmooth = 0;
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
    this._fog = [0, 0, 0];
    this._vs = { x: 0, z: 0, baseY: 0, topY: CLOUD_DECK_Y, radius: 9, rope: 1, time: 0, fade: 0, swayX: 0, swayZ: 0 };
    this.envReset = false;
  }

  // After the rope-out completes: hide the funnel, silence the wind and restore the lighting.
  finishVisuals() {
    if (this.visual) this.visual.group.visible = false;
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

  exposed(x, y, z) {
    const w = this.world;
    return !BLOCKS[w.getBlock(x, y + 1, z)].opaque || !BLOCKS[w.getBlock(x, y - 1, z)].opaque || !BLOCKS[w.getBlock(x + 1, y, z)].opaque
      || !BLOCKS[w.getBlock(x - 1, y, z)].opaque || !BLOCKS[w.getBlock(x, y, z + 1)].opaque || !BLOCKS[w.getBlock(x, y, z - 1)].opaque;
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
    if (this.previewMesh) { this.previewMesh.dispose(); this.previewMesh = null; }
    if (this.m.debris.forceFn === this._forceFn) this.m.debris.forceFn = null;
    this.m.effects.reset();
    if (this.windLoop) { this.game.audio.loopStop('wind', 0.8); this.windLoop = null; }
    this.ripQueue.length = 0;
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
  }

  alertEntities() {
    const info = { kind: 'tornado', x: this.position.x, z: this.position.z, radius: 120, awayRadius: Math.max(40, this.params.radius * OUTER) };
    if (this.game.npcs) this.game.npcs.alert(info);
    if (this.game.animals) this.game.animals.alert(info);
  }

  // Deterministic block ripping inside the core cylinder (surface .. surface + 10), fragility-weighted.
  ripBlocks(mult) {
    const R = this.params.radius, I = this.params.intensity * mult;
    if (I <= 0) return;
    const cx = this.position.x, cz = this.position.z;
    const rng = this.rng, world = this.world;
    let spawned = 0;
    for (let k = 0; k < RIP_PICKS; k++) {
      const u = rng.next(), a = rng.next() * Math.PI * 2, rr = R * Math.sqrt(u);
      const x = Math.floor(cx + rr * Math.cos(a)), z = Math.floor(cz + rr * Math.sin(a));
      const g = this.groundAt(x, z);
      const y = g + Math.floor(rng.next() * 11);
      if (y < 1 || y > 126) continue;
      const id = world.getBlock(x, y, z);
      if (id === B.AIR || id === B.WATER || id === B.BEDROCK) continue;
      if (!this.exposed(x, y, z)) continue;
      const dx = x + 0.5 - cx, dz = z + 0.5 - cz;
      const d = Math.sqrt(dx * dx + dz * dz);
      let pr = DisasterManager.fragility(id) * I * (1 - d / R);
      if (y <= g) pr *= 0.3;                            // scours the ground only occasionally
      if (pr <= rng.next()) continue;
      if (!this.m.setBlock(x, y, z, B.AIR)) continue;
      this.ripCount++;
      if (this.ripQueue.length < RIP_QUEUE_MAX * 4) this.ripQueue.push(x, y, z, id);
      const def = BLOCKS[id];
      if (spawned < MAX_DEBRIS_PER_TICK && def.shape !== SHAPE.CROSS && def.shape !== SHAPE.TORCH && def.shape !== SHAPE.RAIL) {
        spawned++;
        const h = hash3(x, y, z, this.seed);
        const r = Math.max(0.5, d), ux = dx / r, uz = dz / r;
        const vt = 12 + 8 * h, vy = 7 + 6 * (1 - h);
        const tx = SWIRL_SIGN * uz, tz = -SWIRL_SIGN * ux;
        const size = def.shape === SHAPE.CUBE ? 0.7 + 0.15 * h : 0.45;
        this.m.debris.spawn(x + 0.5, y + 0.5, z + 0.5, tx * vt - ux * 2, vy, tz * vt - uz * 2, id, size, 9 + h * 5, { force: true });
        this.m.stats.debrisSpawned++;
      }
    }
  }

  // Player: follows the wind (pulled around and lifted inside the core), buffeted by gusts outside it.
  pushPlayer() {
    const pl = this.game.player;
    if (!pl || pl.dead) { this.playerDist = 1e9; return; }
    const R = this.params.radius, I = this.params.intensity;
    const dx = pl.pos.x - this.position.x, dz = pl.pos.z - this.position.z, dy = pl.pos.y - (this.groundY - 1);
    this.playerDist = Math.sqrt(dx * dx + dz * dz);
    if (this.tick % 10 === 0) { const a = hash2(this.tick, 11, this.seed) * Math.PI * 2; this.gustX = Math.cos(a); this.gustZ = Math.sin(a); this.gustMag = 12 + 18 * hash2(this.tick, 13, this.seed); }
    const w = this._wind;
    const env = windAt(dx, dz, dy, R, I, this.strength, w);
    if (env <= 0) return;
    const q = this.playerDist / R;
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
    const ropeEnd = clamp((this.rope - 0.7) / 0.3, 0, 1);      // last 30 % of the rope-out: fade everything
    const fade = Math.min(1, (this.tick + alpha) / 30) * (1 - ropeEnd);
    const vx = (this.position.x - this.prevPosition.x) * 20, vz = (this.position.z - this.prevPosition.z) * 20;
    const t = this.vtime;
    const vs = this._vs;
    vs.x = this.rx; vs.z = this.rz; vs.baseY = this.baseY; vs.topY = CLOUD_DECK_Y; vs.radius = p.radius; vs.rope = this.ropeSmooth; vs.time = t; vs.fade = fade;
    vs.swayX = 2.5 * Math.sin(t * 0.6) - vx * 1.2 + this.ropeSmooth * 6 * Math.sin(t * 0.9);
    vs.swayZ = 2.5 * Math.cos(t * 0.45) - vz * 1.2 + this.ropeSmooth * 6 * Math.cos(t * 0.7);
    this.visual.update(vs);

    const cam = camera.position;
    const cdx = cam.x - this.rx, cdz = cam.z - this.rz;
    const camDist = Math.sqrt(cdx * cdx + cdz * cdz);
    if (!paused) {
      this.spawnDust(dt, camDist, fade * (1 - this.ropeSmooth));
      this.flushRipEffects(camDist);
    }
    this.updateEnvironment(dt, camDist, fade);
    this.updateAudio(dt, camDist, fade, paused);
    if (camDist < p.radius * 2.5 && this.strength > 0.1) this.m.effects.shake(0.04 + 0.22 * p.intensity * (1 - camDist / (p.radius * 2.5)) * this.strength, 3);
  }

  spawnDust(dt, camDist, fade) {
    if (camDist > 220 || fade <= 0.02) return;
    const P = this.game.particles;
    const R = this.params.radius;
    this.dustAcc += dt * DUST_RATE * (0.35 + 0.65 * this.params.intensity) * fade;
    let n = Math.floor(this.dustAcc);
    if (n <= 0) return;
    this.dustAcc -= n;
    if (n > 12) n = 12;
    const col = this._col;
    for (let i = 0; i < n; i++) {
      const ang = Math.random() * Math.PI * 2, rr = R * (0.5 + Math.random() * 1.1);
      const ux = Math.cos(ang), uz = Math.sin(ang);
      const x = this.rx + ux * rr, z = this.rz + uz * rr, y = this.baseY + 0.1 + Math.random() * Math.random() * 3;
      const vt = 8 + 8 * Math.random(), vo = 1 + 3 * Math.random(), vy = 1 + 3 * Math.random();
      const shade = 0.8 + 0.4 * Math.random();
      col[0] = 0.62 * shade; col[1] = 0.52 * shade; col[2] = 0.38 * shade;
      // mostly puffy "smoke"-kind particles (grow + fade) with a few thin "dust"-kind streaks
      const puff = (i & 3) !== 3;
      P.spawn(x, y, z, SWIRL_SIGN * uz * vt + ux * vo, vy, -SWIRL_SIGN * ux * vt + uz * vo, puff ? 1.0 + 0.9 * Math.random() : 0.7 + 0.5 * Math.random(), DUST_LIFE, puff ? 1 : 2, this._uv, col, 0.5);
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

  // Sky darkening, dusty tint and denser brown fog while the player is within LIGHT_RANGE.
  updateEnvironment(dt, camDist, fade) {
    this.envTimer -= dt;
    if (this.envTimer > 0) return;
    this.envTimer = 0.1;
    const fx = this.m.effects;
    if (camDist >= LIGHT_RANGE || fade <= 0.01) { fx.reset(); return; }
    const k = Math.pow(1 - camDist / LIGHT_RANGE, 0.6) * (0.55 + 0.45 * this.params.intensity) * fade;
    const tint = this._tint;
    tint[0] = 1 + (0.78 - 1) * k; tint[1] = 1 + (0.74 - 1) * k; tint[2] = 1 + (0.7 - 1) * k;
    const sky = this.game.sky ? this.game.sky.fogColor : null;
    const fog = this._fog;
    const sr = sky ? sky.r : 0.75, sg = sky ? sky.g : 0.85, sb = sky ? sky.b : 1.0;
    fog[0] = sr + (0.42 - sr) * k; fog[1] = sg + (0.4 - sg) * k; fog[2] = sb + (0.37 - sb) * k;
    fx.setEnvironment({ skyLightMul: 1 - 0.45 * k, tint, fogColor: fog, fogFarMul: 1 - 0.4 * k });
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
