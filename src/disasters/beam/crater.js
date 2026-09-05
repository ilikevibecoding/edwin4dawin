// Deterministic crater carving + destruction wave for the orbital beam.
// CraterPlan: a fixed, distance-sorted list of columns is prepared once (from the world state at start); every
// simulation tick the crater is grown (radius and depth follow the tick fraction) and blocks are removed top-down,
// innermost columns first, within the manager's edit budget.
// WavePlan: the shock front that races outward from the impact across the town; as it passes a column it strips
// the fragile top blocks (weighted by fragility and distance) and scorches the exposed ground in a decaying pattern.
// All choices depend only on (x, y, z, seed) hashes and the tick -> identical on every client.
import { BLOCKS, B, SHAPE } from '../../blocks.js';
import { hash2, hash3 } from '../../rng.js';
import { CHUNK_HEIGHT } from '../../constants.js';

const RIM_WIDTH = 4;          // ring outside the crater that gets scorched (charred wood, ash, burnt plants)
const ASH_WIDTH = 2.5;        // ring outside the crater whose ground turns to ash
const STATE_PENDING = 0, STATE_DONE = 1;

const isPlant = (def) => def.shape === SHAPE.CROSS;
const isLeaves = (id) => id === B.OAK_LEAVES || id === B.SPRUCE_LEAVES || id === B.BIRCH_LEAVES;
const isNaturalGround = (id) => id === B.GRASS || id === B.DIRT || id === B.DIRT_PATH || id === B.MUD || id === B.SAND || id === B.COARSE_DIRT || id === B.GRAVEL || id === B.FARMLAND || id === B.SNOW;

export class CraterPlan {
  // cx, cz: beam axis (block centre coordinates); R radius; D depth (blocks); groundY: y of the ground block at the centre
  constructor(manager, cx, cz, R, D, groundY, seed) {
    this.m = manager;
    this.world = manager.world;
    this.cx = cx; this.cz = cz; this.R = R; this.D = D; this.g = groundY; this.seed = seed;
    this.magmaR = Math.max(1.5, R * 0.3 + D * 0.4);
    const outer = R + RIM_WIDTH;
    const tmp = [];
    for (let x = Math.floor(cx - outer); x <= Math.ceil(cx + outer); x++) {
      for (let z = Math.floor(cz - outer); z <= Math.ceil(cz + outer); z++) {
        const dx = x + 0.5 - cx, dz = z + 0.5 - cz;
        const d = Math.sqrt(dx * dx + dz * dz);
        if (d <= outer) tmp.push([x, z, d]);
      }
    }
    // fixed order: by distance, then x, then z
    tmp.sort((a, b) => (a[2] - b[2]) || (a[0] - b[0]) || (a[1] - b[1]));
    const n = tmp.length;
    this.n = n;
    this.x = new Int32Array(n); this.z = new Int32Array(n); this.d = new Float32Array(n);
    this.top = new Int16Array(n);        // highest y that may still hold a block to remove / inspect
    this.floor = new Int16Array(n);      // final floor block y (kept, scorched); blocks above it vanish
    this.state = new Uint8Array(n);
    this.rimSurface = new Uint8Array(n); // rim columns: 1 once the surface block has been handled
    this.inner = 0;                      // number of columns inside the crater radius
    const scanTop = Math.min(CHUNK_HEIGHT - 1, groundY + 64);
    for (let i = 0; i < n; i++) {
      const [x, z, d] = tmp[i];
      this.x[i] = x; this.z[i] = z; this.d[i] = d;
      this.floor[i] = d <= R ? this.finalFloor(x, z, d) : groundY;
      if (d <= R) this.inner = i + 1;
      // highest non-air block in the column (bounded scan)
      let y = scanTop;
      while (y > this.floor[i] && this.world.getBlock(x, y, z) === B.AIR) y--;
      this.top[i] = y;
    }
    this.removed = 0;
    this.debrisThisTick = 0;
    this.onRemove = null;                // (x, y, z, id, d, rimFraction) cosmetic hook (debris)
  }

  // bowl profile: depth D at the centre, 0 at the radius, with a little per-column jitter towards the rim
  shape(d) { const u = Math.min(1, d / this.R); return Math.pow(Math.max(0, 1 - u * u), 0.85); }
  finalFloor(x, z, d) {
    const jitter = (hash2(x, z, this.seed) - 0.5) * 1.8 * Math.min(1, d / this.R);
    return Math.max(1, Math.round(this.g - this.D * this.shape(d) + jitter));
  }

  // Estimated number of blocks the finished crater removes (for warnings()).
  estimateRemoved() {
    let n = 0;
    for (let i = 0; i < this.inner; i++) {
      const x = this.x[i], z = this.z[i];
      for (let y = this.top[i]; y > this.floor[i]; y--) if (this.world.getBlock(x, y, z) !== B.AIR) n++;
    }
    return n;
  }

  // Grow the crater to fraction f (0..1) of its final size and apply edits within the manager's budget, leaving
  // `reserve` edits of this tick's budget untouched (shared with the destruction wave).
  // rNow = current radius, depthK = current depth fraction. Returns true when everything is finished.
  step(f, reserve = 0) {
    const m = this.m;
    const rNow = this.R * Math.pow(Math.min(1, f), 0.7);
    const depthK = Math.min(1, f / 0.5);
    const depthFinal = depthK >= 1;
    this.debrisThisTick = 0;
    let allDone = true;
    for (let i = 0; i < this.n; i++) {
      if (m.budgetLeft <= reserve) return false;
      const d = this.d[i], x = this.x[i], z = this.z[i];
      if (i >= this.inner) {
        // rim column: scorch when the crater edge gets close
        if (this.state[i] === STATE_DONE) continue;
        if (rNow < d - 3) return false;
        if (!this.dressRim(i, x, z, d, reserve)) return false;
        this.state[i] = STATE_DONE;
        continue;
      }
      if (d > rNow) { allDone = false; break; }
      // the bowl deepens towards this column's final (jittered) floor as depthK grows
      const floorNow = Math.max(this.floor[i], Math.round(this.g - (this.g - this.floor[i]) * depthK));
      while (this.top[i] > floorNow) {
        if (m.budgetLeft <= reserve) return false;
        const y = this.top[i];
        const id = this.world.getBlock(x, y, z);
        if (id !== B.AIR && id !== B.BEDROCK) {
          m.setBlock(x, y, z, B.AIR);
          this.removed++;
          if (this.onRemove) this.onRemove(x, y, z, id, d, rNow);
        }
        this.top[i] = y - 1;
      }
      if (this.state[i] === STATE_PENDING) {
        if (depthFinal && this.top[i] <= this.floor[i]) {
          if (m.budgetLeft < 3 + reserve) return false;
          this.dressFloor(i, x, z, d);
          this.state[i] = STATE_DONE;
        } else allDone = false;
      }
    }
    if (!allDone) return false;
    for (let i = this.inner; i < this.n; i++) if (this.state[i] !== STATE_DONE) return false;
    return true;
  }

  // Crater floor: scorched stone, with a glowing magma pool near the centre.
  dressFloor(i, x, z, d) {
    let y = this.floor[i];
    for (let k = 0; k < 4 && y > 1; k++, y--) {
      const id = this.world.getBlock(x, y, z);
      if (id === B.AIR || id === B.WATER) continue;
      if (id === B.BEDROCK) return;
      const def = BLOCKS[id];
      if (def.shape !== SHAPE.CUBE) { this.m.setBlock(x, y, z, B.AIR); continue; }
      // solid pool at the centre thinning out to scattered glowing cracks across the inner floor
      const pMagma = d < this.magmaR ? 1.8 * (1 - d / this.magmaR) : d < this.R * 0.75 ? 0.06 : 0;
      const magma = pMagma > 0 && hash2(x, z, this.seed + 7) < pMagma;
      this.m.setBlock(x, y, z, magma ? B.MAGMA : B.SCORCHED_STONE);
      if (magma && pMagma > 1.2 && this.m.budgetLeft > 0) this.m.setBlock(x, y - 1, z, B.MAGMA);
      return;
    }
  }

  // Ring outside the crater: wood chars, leaves and plants burn away, the ground turns to ash with a low
  // ragged ash lip right at the edge. Resumable (uses top[i] as the scan cursor); returns false when the
  // budget ran out before the column was finished.
  dressRim(i, x, z, d, reserve = 0) {
    const m = this.m;
    const minY = this.g - 6;
    while (this.top[i] >= minY) {
      if (m.budgetLeft < 2 + reserve) return false;
      const y = this.top[i];
      const id = this.world.getBlock(x, y, z);
      if (id !== B.AIR) {
        const def = BLOCKS[id];
        if (isLeaves(id) || isPlant(def)) m.setBlock(x, y, z, B.AIR);
        else if (def.shape === SHAPE.CUBE && def.sound === 'wood') { if (hash2(x, y, this.seed + z) < 0.9) m.setBlock(x, y, z, B.CHARRED_PLANKS); }
        else if (!this.rimSurface[i] && def.solid && isNaturalGround(id)) {
          this.rimSurface[i] = 1;
          const h = hash2(x, z, this.seed + 3);
          const ashP = d <= this.R + 1.2 ? 0.95 : d <= this.R + ASH_WIDTH ? 0.55 : 0.12;
          if (h < ashP) {
            m.setBlock(x, y, z, B.ASH);
            if (d <= this.R + 1.2 && h < 0.45 && this.world.getBlock(x, y + 1, z) === B.AIR) m.setBlock(x, y + 1, z, B.ASH);
          }
        } else if (def.solid && def.opaque) this.rimSurface[i] = 1;
      }
      this.top[i] = y - 1;
    }
    return true;
  }
}

export const CRATER_RIM_WIDTH = RIM_WIDTH;

// The expanding ring of destruction. Columns between rInner (the beam's own column, vaporised by the crater
// anyway) and waveR are processed in distance order as the front reaches them. Inside the crater plan's zone
// (d <= craterR + RIM_WIDTH) only the fragile stuff (roofs, glass, fences, plants) is thrown so the impact reads
// as one blast while the beam keeps eating the rest; outside it the top `peel` blocks of each column may be
// removed (probability = fragility x falloff) and natural ground turns to ash / coarse dirt / dirt with a
// probability that decays toward the wave radius. `front` is the radius actually reached (budget-limited), which
// the visuals follow so the dust wall and the flying blocks stay together.
export class WavePlan {
  constructor(manager, cx, cz, rInner, craterR, waveR, groundY, seed, strength) {
    this.m = manager;
    this.world = manager.world;
    this.cx = cx; this.cz = cz; this.craterR = craterR; this.craterOuter = craterR + RIM_WIDTH; this.waveR = waveR;
    this.g = groundY; this.seed = seed; this.strength = strength;
    this.scanTop = Math.min(CHUNK_HEIGHT - 1, groundY + 48);
    this.minY = groundY - 4;
    const tmp = [];
    const r0 = Math.max(0, rInner);
    for (let x = Math.floor(cx - waveR); x <= Math.ceil(cx + waveR); x++) {
      for (let z = Math.floor(cz - waveR); z <= Math.ceil(cz + waveR); z++) {
        const dx = x + 0.5 - cx, dz = z + 0.5 - cz;
        const d = Math.sqrt(dx * dx + dz * dz);
        if (d > r0 && d <= waveR) tmp.push([x, z, d]);
      }
    }
    tmp.sort((a, b) => (a[2] - b[2]) || (a[0] - b[0]) || (a[1] - b[1]));
    const n = tmp.length;
    this.n = n;
    this.x = new Int32Array(n); this.z = new Int32Array(n); this.d = new Float32Array(n);
    for (let i = 0; i < n; i++) { this.x[i] = tmp[i][0]; this.z[i] = tmp[i][1]; this.d[i] = tmp[i][2]; }
    this.next = 0;             // first unprocessed column
    this.front = r0;           // radius actually reached
    this.removed = 0; this.scorched = 0;
    this.onRemove = null;      // (x, y, z, id, d, power) cosmetic hook (debris)
    this.done = n === 0;
  }

  // Estimated number of blocks the wave will throw / scorch (for warnings()); cheap: uses expected values.
  estimate() {
    let thrown = 0, scorched = 0;
    for (let i = 0; i < this.n; i++) {
      const d = this.d[i];
      if (d <= this.craterOuter) { thrown += 0.3; continue; }
      const u = this.falloff(d);
      thrown += 0.35 * Math.pow(1 - u, 1.5); scorched += 0.1 + 0.9 * Math.pow(1 - u, 1.4);
    }
    return { thrown: Math.round(thrown), scorched: Math.round(scorched) };
  }

  falloff(d) { const u = (d - this.craterR) / Math.max(1, this.waveR - this.craterR); return u < 0 ? 0 : u > 1 ? 1 : u; }

  // Advance the front to (at most) radius rNow, processing columns in order within the edit budget minus `reserve`.
  // Returns true once every column has been processed.
  step(rNow, reserve = 0) {
    const m = this.m;
    while (this.next < this.n && this.d[this.next] <= rNow) {
      if (m.budgetLeft <= reserve + 4) return false; // out of budget: the front stays at the last processed column
      this.column(this.next);
      this.front = this.d[this.next];
      this.next++;
    }
    if (this.next >= this.n) { this.front = this.waveR; this.done = true; return true; }
    this.front = Math.max(this.front, Math.min(rNow, this.d[this.next])); // caught up with the target radius
    return false;
  }

  column(i) {
    const x = this.x[i], z = this.z[i], d = this.d[i];
    const world = this.world, m = this.m, seed = this.seed;
    const u = this.falloff(d);
    const inside = d <= this.craterOuter;
    const power = Math.pow(1 - u, 1.5) * (0.45 + 0.55 * this.strength);
    let y = this.scanTop;
    while (y > this.minY && world.getBlock(x, y, z) === B.AIR) y--;
    if (y <= this.minY) return;
    // peel the top blocks: fragile materials first, fewer the farther out
    const peel = inside ? 2 : u < 0.3 ? 3 : u < 0.65 ? 2 : 1;
    let k = 0;
    while (k < peel && y > this.minY) {
      const id = world.getBlock(x, y, z);
      if (id === B.AIR) { y--; continue; }
      const def = BLOCKS[id];
      const frag = m.constructor.fragility(id);
      if (frag <= 0) break;
      const p = inside ? (frag >= 0.6 ? 0.55 * (0.5 + 0.5 * this.strength) : 0) : frag * power * (k === 0 ? 1 : 0.55);
      if (p > 0 && hash3(x, y, z, seed + 11) < p) {
        m.setBlock(x, y, z, B.AIR);
        this.removed++;
        if (this.onRemove) this.onRemove(x, y, z, id, d, power);
        y--; k++;
        continue;
      }
      if (def.shape === SHAPE.CUBE) break; // a surviving full block shields what is below
      y--; k++;
    }
    if (inside) return;
    // scorch the exposed natural ground in a pattern that thins out toward the wave radius
    while (y > this.minY && world.getBlock(x, y, z) === B.AIR) y--;
    if (y <= this.minY) return;
    const id = world.getBlock(x, y, z);
    if (!isNaturalGround(id)) return;
    const h = hash2(x, z, seed + 3);
    const ps = 0.1 + 0.9 * Math.pow(1 - u, 1.4);
    if (h >= ps) return;
    let nb;
    if (u < 0.22) nb = B.ASH;
    else if (u < 0.5) nb = h < ps * 0.45 ? B.ASH : B.COARSE_DIRT;
    else nb = h < ps * 0.35 ? B.COARSE_DIRT : B.DIRT;
    if (id === B.SAND || id === B.GRAVEL) nb = u < 0.3 ? B.ASH : id;
    if (nb !== id && m.setBlock(x, y, z, nb)) this.scorched++;
  }
}
