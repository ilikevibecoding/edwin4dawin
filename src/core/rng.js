// Deterministic pseudo-randomness.
//
// Every visual in this project must be reproducible frame-for-frame so the
// offline video renderer produces the same film as the live playback. Nothing
// in src/ may call Math.random(); use a seeded stream from here instead.

export class RNG {
  constructor(seed = 1) {
    this.seed(seed);
  }

  seed(s) {
    if (typeof s === 'string') {
      let h = 2166136261 >>> 0;
      for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619);
      }
      s = h;
    }
    this._s = (s >>> 0) || 1;
    return this;
  }

  // xorshift32
  next() {
    let x = this._s;
    x ^= x << 13; x >>>= 0;
    x ^= x >> 17;
    x ^= x << 5; x >>>= 0;
    this._s = x;
    return x / 4294967296;
  }

  range(a, b) { return a + (b - a) * this.next(); }
  int(a, b) { return Math.floor(this.range(a, b + 1)); }
  pick(arr) { return arr[Math.floor(this.next() * arr.length) % arr.length]; }
  sign() { return this.next() < 0.5 ? -1 : 1; }
  bool(p = 0.5) { return this.next() < p; }

  // Gaussian via Box-Muller.
  gauss(mean = 0, sd = 1) {
    const u = Math.max(1e-7, this.next());
    const v = this.next();
    return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  onSphere(radius = 1, out = { x: 0, y: 0, z: 0 }) {
    const u = this.range(-1, 1);
    const t = this.range(0, Math.PI * 2);
    const r = Math.sqrt(Math.max(0, 1 - u * u));
    out.x = radius * r * Math.cos(t);
    out.y = radius * u;
    out.z = radius * r * Math.sin(t);
    return out;
  }
}

// Shared stream for one-off decoration. Scenes that need stable independent
// noise should create their own RNG with a named seed.
export const rng = new RNG('lego-star-wars');

export function makeRng(name) {
  return new RNG(name);
}
