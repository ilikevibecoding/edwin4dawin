// Deterministic RNG (mulberry32) so a seed reproduces the same island.
export class RNG {
  constructor(seed = 1) {
    this.s = seed >>> 0;
  }
  next() {
    let t = (this.s += 0x6d2b79f5) | 0;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  range(a, b) {
    return a + (b - a) * this.next();
  }
  int(a, b) {
    return Math.floor(this.range(a, b + 1));
  }
  pick(arr) {
    return arr[Math.floor(this.next() * arr.length)];
  }
  chance(p) {
    return this.next() < p;
  }
  // Weighted pick: entries [[value, weight], ...]
  weighted(entries) {
    let total = 0;
    for (const e of entries) total += e[1];
    let r = this.next() * total;
    for (const e of entries) {
      r -= e[1];
      if (r <= 0) return e[0];
    }
    return entries[entries.length - 1][0];
  }
}

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;

export function smoothstep(e0, e1, x) {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
}

export function wrapAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

export function angleLerp(a, b, t) {
  return a + wrapAngle(b - a) * t;
}

// Integer-lattice hash to [0, 1)
export function hash2(x, y) {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

export function valueNoise(x, y) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const fx = x - xi;
  const fy = y - yi;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const a = hash2(xi, yi);
  const b = hash2(xi + 1, yi);
  const c = hash2(xi, yi + 1);
  const d = hash2(xi + 1, yi + 1);
  return lerp(lerp(a, b, sx), lerp(c, d, sx), sy);
}

export function fbm(x, y, octaves = 3) {
  let amp = 0.5;
  let sum = 0;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += valueNoise(x, y) * amp;
    norm += amp;
    x = x * 2.03 + 17.1;
    y = y * 2.03 + 9.7;
    amp *= 0.5;
  }
  return sum / norm;
}

export function dist2(ax, az, bx, bz) {
  const dx = ax - bx;
  const dz = az - bz;
  return Math.sqrt(dx * dx + dz * dz);
}

export function aabbIntersects(a, b, pad = 0) {
  return (
    a.minX - pad < b.maxX && a.maxX + pad > b.minX &&
    a.minY - pad < b.maxY && a.maxY + pad > b.minY &&
    a.minZ - pad < b.maxZ && a.maxZ + pad > b.minZ
  );
}

export function makeBox(minX, minY, minZ, maxX, maxY, maxZ, extra) {
  return Object.assign({ minX, minY, minZ, maxX, maxY, maxZ }, extra);
}

export function unionBounds(boxes) {
  const b = { minX: Infinity, minY: Infinity, minZ: Infinity, maxX: -Infinity, maxY: -Infinity, maxZ: -Infinity };
  for (const x of boxes) {
    b.minX = Math.min(b.minX, x.minX);
    b.minY = Math.min(b.minY, x.minY);
    b.minZ = Math.min(b.minZ, x.minZ);
    b.maxX = Math.max(b.maxX, x.maxX);
    b.maxY = Math.max(b.maxY, x.maxY);
    b.maxZ = Math.max(b.maxZ, x.maxZ);
  }
  return b;
}

// Slab test: segment (a -> b) against an AABB. Returns t in [0,1] of entry or null.
export function segmentAABB(ax, ay, az, bx, by, bz, box) {
  let tmin = 0;
  let tmax = 1;
  const d = [bx - ax, by - ay, bz - az];
  const o = [ax, ay, az];
  const mins = [box.minX, box.minY, box.minZ];
  const maxs = [box.maxX, box.maxY, box.maxZ];
  for (let i = 0; i < 3; i++) {
    if (Math.abs(d[i]) < 1e-9) {
      if (o[i] < mins[i] || o[i] > maxs[i]) return null;
    } else {
      const inv = 1 / d[i];
      let t1 = (mins[i] - o[i]) * inv;
      let t2 = (maxs[i] - o[i]) * inv;
      if (t1 > t2) [t1, t2] = [t2, t1];
      if (t1 > tmin) tmin = t1;
      if (t2 < tmax) tmax = t2;
      if (tmin > tmax) return null;
    }
  }
  return tmin;
}

export function formatTime(sec) {
  sec = Math.max(0, Math.ceil(sec));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
