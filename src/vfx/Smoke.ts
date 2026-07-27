import * as THREE from 'three';
import { makeRng, TAU, randomInCircle } from '../core/MathX';
import { ParticleEngine } from './ParticleEngine';
import { ALP } from './ParticleTextures';

const SMOKE_FRAMES = 8;

export interface PuffOpts {
  vx: number; vy: number; vz: number;
  size0: number; size1: number;
  life: number;
  gravity: number;
  drag: number;
  /** grey/brown tint (multiplied by scene light in-shader). */
  r0: number; g0: number; b0: number;
  r1: number; g1: number; b1: number;
  opacity: number;
  turb: number;
  cell: number;
  frames: number;
  fadeMode: number;
  delay: number;
  rotSpeed: number;
}

const EMIT_SMOKE = 0;
const EMIT_FIRE = 1;

interface Emitter {
  active: boolean;
  kind: number;
  x: number; y: number; z: number;
  radius: number;
  tEnd: number;
  acc: number;
  rate: number;
  strength: number;
  windx: number;
  windz: number;
  seed: number;
}

/** Lit, soft, turbulent smoke + dust, plus a small pool of persistent emitters
 *  for plumes, rising columns and lingering fire. */
export class Smoke {
  private rng = makeRng(0x1d2c3);
  private emitters: Emitter[] = [];

  constructor(private engine: ParticleEngine) {
    for (let i = 0; i < 12; i++) {
      this.emitters.push({
        active: false, kind: 0, x: 0, y: 0, z: 0, radius: 1,
        tEnd: 0, acc: 0, rate: 0, strength: 1, windx: 0, windz: 0, seed: 0,
      });
    }
  }

  private puff(px: number, py: number, pz: number, o: PuffOpts) {
    const d = this.engine.desc.reset();
    d.px = px; d.py = py; d.pz = pz;
    d.vx = o.vx; d.vy = o.vy; d.vz = o.vz;
    d.r0 = o.r0; d.g0 = o.g0; d.b0 = o.b0;
    d.r1 = o.r1; d.g1 = o.g1; d.b1 = o.b1;
    d.life = o.life;
    d.size0 = o.size0; d.size1 = o.size1;
    d.gravity = o.gravity;
    d.drag = o.drag;
    d.rot = this.rng() * TAU;
    d.rotSpeed = o.rotSpeed;
    d.cell = o.cell; d.frames = o.frames; d.fadeMode = o.fadeMode;
    d.lit = true; d.soft = true; d.turb = o.turb > 0;
    d.turbAmt = o.turb;
    d.opacity = o.opacity;
    d.delay = o.delay;
    this.engine.alpha.spawn(d);
    this.engine.markSoft(o.life + o.delay);
  }

  /** A soft smoke puff (single). */
  smokePuff(pos: THREE.Vector3, size: number, life: number, rise = 1.2, delay = 0, tint = 0.26) {
    const [ox, oz] = randomInCircle(this.rng);
    this.puff(pos.x + ox * size * 0.2, pos.y, pos.z + oz * size * 0.2, {
      vx: ox * 0.5, vy: rise, vz: oz * 0.5,
      size0: size * 0.5, size1: size * 1.7,
      life, gravity: 0.35, drag: 0.7,
      r0: tint, g0: tint, b0: tint * 0.98,
      r1: tint * 0.5, g1: tint * 0.5, b1: tint * 0.5,
      opacity: 0.9, turb: 0.25, cell: ALP.SMK0, frames: SMOKE_FRAMES,
      fadeMode: 0, delay, rotSpeed: (this.rng() - 0.5) * 0.6,
    });
  }

  /** Expanding dust cloud (impact / kickup / explosion ground wave). */
  dust(
    pos: THREE.Vector3,
    strength: number,
    dir: THREE.Vector3 | null,
    tint: [number, number, number],
    count = 8,
    outward = 0,
    delay = 0
  ) {
    const rng = this.rng;
    for (let i = 0; i < count; i++) {
      const [ox, oz] = randomInCircle(rng);
      let vx = ox * (0.6 + strength * 0.4);
      let vz = oz * (0.6 + strength * 0.4);
      if (dir) {
        vx += dir.x * outward * (0.6 + rng() * 0.8);
        vz += dir.z * outward * (0.6 + rng() * 0.8);
      }
      const size = strength * (0.7 + rng() * 0.8);
      this.puff(pos.x + ox * strength * 0.3, pos.y + rng() * 0.15, pos.z + oz * strength * 0.3, {
        vx, vy: 0.5 + rng() * strength * 0.5, vz,
        size0: size * 0.5, size1: size * (1.8 + rng()),
        life: 0.9 + rng() * 1.2 + strength * 0.15,
        gravity: 0.1, drag: 1.1,
        r0: tint[0], g0: tint[1], b0: tint[2],
        r1: tint[0] * 0.6, g1: tint[1] * 0.6, b1: tint[2] * 0.6,
        opacity: 0.85, turb: 0.15,
        cell: rng() < 0.5 ? ALP.DUST : ALP.PUFF, frames: 1,
        fadeMode: 3, delay, rotSpeed: (rng() - 0.5) * 0.5,
      });
    }
  }

  // -------------------------------------------------------------------------
  // Persistent emitters
  // -------------------------------------------------------------------------

  private acquire(): Emitter {
    let e = this.emitters.find((x) => !x.active);
    if (e) return e;
    e = this.emitters[0];
    for (const x of this.emitters) if (x.tEnd < e.tEnd) e = x;
    return e;
  }

  /** Rising, wind-drifted smoke column that persists for `duration` seconds. */
  startPlume(pos: THREE.Vector3, radius: number, duration: number, strength = 1) {
    const e = this.acquire();
    e.active = true; e.kind = EMIT_SMOKE;
    e.x = pos.x; e.y = pos.y; e.z = pos.z;
    e.radius = radius; e.strength = strength;
    e.tEnd = this.engine.now() + duration;
    e.acc = 0; e.rate = 8 + radius * 4;
    e.windx = 0.5 + this.rng() * 0.6;
    e.windz = (this.rng() - 0.5) * 0.8;
    e.seed = this.rng() * 100;
  }

  /** Lingering ground fire (flames + dark smoke). Pair with a fireLight. */
  startFire(pos: THREE.Vector3, radius: number, duration: number) {
    const e = this.acquire();
    e.active = true; e.kind = EMIT_FIRE;
    e.x = pos.x; e.y = pos.y; e.z = pos.z;
    e.radius = radius; e.strength = 1;
    e.tEnd = this.engine.now() + duration;
    e.acc = 0; e.rate = 14 + radius * 10;
    e.windx = 0; e.windz = 0;
    e.seed = this.rng() * 100;
  }

  update(dt: number) {
    const now = this.engine.now();
    for (const e of this.emitters) {
      if (!e.active) continue;
      if (now >= e.tEnd) { e.active = false; continue; }
      e.acc += e.rate * dt;
      let guard = 0;
      while (e.acc >= 1 && guard < 40) {
        e.acc -= 1; guard++;
        if (e.kind === EMIT_SMOKE) this.emitColumnPuff(e);
        else this.emitFire(e);
      }
    }
  }

  private emitColumnPuff(e: Emitter) {
    const rng = this.rng;
    const [ox, oz] = randomInCircle(rng);
    const r = e.radius;
    const tint = 0.2;
    this.puff(e.x + ox * r * 0.5, e.y + 0.2, e.z + oz * r * 0.5, {
      vx: ox * 0.3 + e.windx, vy: 1.4 + rng() * 1.2, vz: oz * 0.3 + e.windz,
      size0: r * 0.6, size1: r * (2.2 + rng()),
      life: 3.5 + rng() * 3 + r * 0.3,
      gravity: 0.5, drag: 0.5,
      r0: tint, g0: tint, b0: tint,
      r1: tint * 0.4, g1: tint * 0.4, b1: tint * 0.4,
      opacity: 0.8, turb: 0.5,
      cell: ALP.SMK0, frames: SMOKE_FRAMES, fadeMode: 0,
      delay: 0, rotSpeed: (rng() - 0.5) * 0.4,
    });
  }

  private emitFire(e: Emitter) {
    const rng = this.rng;
    const r = e.radius;
    const [ox, oz] = randomInCircle(rng);
    // flame lick (additive, HDR, hot -> cool via texture colour)
    const d = this.engine.desc.reset();
    d.px = e.x + ox * r * 0.6; d.py = e.y + 0.05; d.pz = e.z + oz * r * 0.6;
    d.vx = ox * 0.4; d.vy = 1.6 + rng() * 1.6; d.vz = oz * 0.4;
    d.r0 = 6; d.g0 = 3.4; d.b0 = 1.2;
    d.r1 = 2.2; d.g1 = 0.7; d.b1 = 0.2;
    d.life = 0.4 + rng() * 0.4;
    d.size0 = r * (0.5 + rng() * 0.4); d.size1 = r * 0.25;
    d.gravity = 1.5; d.drag = 0.4;
    d.cell = 8; d.frames = 8; d.fadeMode = 5; // ADD.FIRE0..7 flipbook
    d.turb = true; d.turbAmt = 0.2;
    d.opacity = 0.95;
    this.engine.additive.spawn(d);

    // occasional dark smoke rising off the fire
    if (rng() < 0.5) {
      this.puff(e.x + ox * r * 0.4, e.y + r * 0.6, e.z + oz * r * 0.4, {
        vx: ox * 0.2, vy: 1.6 + rng(), vz: oz * 0.2,
        size0: r * 0.7, size1: r * 2.2,
        life: 2.2 + rng() * 2,
        gravity: 0.5, drag: 0.5,
        r0: 0.12, g0: 0.11, b0: 0.1,
        r1: 0.05, g1: 0.05, b1: 0.05,
        opacity: 0.75, turb: 0.4,
        cell: ALP.SMK0, frames: SMOKE_FRAMES, fadeMode: 0,
        delay: 0, rotSpeed: (rng() - 0.5) * 0.4,
      });
    }
  }
}
