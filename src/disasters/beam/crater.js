// Deterministic crater carving for the orbital beam. A fixed, distance-sorted list of columns is prepared
// once (from the world state at start); every simulation tick the crater is grown (radius and depth follow
// the tick fraction) and blocks are removed top-down, innermost columns first, within the manager's edit
// budget. All choices depend only on (x, z, seed) hashes and the tick -> identical on every client.
import { BLOCKS, B, SHAPE } from '../../blocks.js';
import { hash2 } from '../../rng.js';
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
    this.magmaR = Math.max(1.5, R * 0.22 + D * 0.35);
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

  // Grow the crater to fraction f (0..1) of its final size and apply edits within the manager's budget.
  // rNow = current radius, depthK = current depth fraction. Returns true when everything is finished.
  step(f) {
    const m = this.m;
    const rNow = this.R * Math.pow(Math.min(1, f), 0.7);
    const depthK = Math.min(1, f / 0.5);
    const depthFinal = depthK >= 1;
    this.debrisThisTick = 0;
    let allDone = true;
    for (let i = 0; i < this.n; i++) {
      if (m.budgetLeft <= 0) return false;
      const d = this.d[i], x = this.x[i], z = this.z[i];
      if (i >= this.inner) {
        // rim column: scorch when the crater edge gets close
        if (this.state[i] === STATE_DONE) continue;
        if (rNow < d - 3) return false;
        if (!this.dressRim(i, x, z, d)) return false;
        this.state[i] = STATE_DONE;
        continue;
      }
      if (d > rNow) { allDone = false; break; }
      const floorNow = Math.max(this.floor[i], Math.round(this.g - this.D * depthK * this.shape(d)));
      while (this.top[i] > floorNow) {
        if (m.budgetLeft <= 0) return false;
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
          if (m.budgetLeft < 3) return false;
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
      const pMagma = Math.max(0, 1.6 * (1 - d / this.magmaR));
      const magma = pMagma > 0 && hash2(x, z, this.seed + 7) < pMagma;
      this.m.setBlock(x, y, z, magma ? B.MAGMA : B.SCORCHED_STONE);
      if (magma && pMagma > 1.2 && this.m.budgetLeft > 0) this.m.setBlock(x, y - 1, z, B.MAGMA);
      return;
    }
  }

  // Ring outside the crater: wood chars, leaves and plants burn away, the ground turns to ash with a low
  // ragged ash lip right at the edge. Resumable (uses top[i] as the scan cursor); returns false when the
  // budget ran out before the column was finished.
  dressRim(i, x, z, d) {
    const m = this.m;
    const minY = this.g - 6;
    while (this.top[i] >= minY) {
      if (m.budgetLeft < 2) return false;
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
