import * as THREE from 'three';
import { makeRng, TAU } from '../core/MathX';
import { ParticleEngine, orthoBasis } from './ParticleEngine';
import { ADD } from './ParticleTextures';

const _t = new THREE.Vector3();
const _b = new THREE.Vector3();
const _n = new THREE.Vector3();
const _d = new THREE.Vector3();

export interface SparkOpts {
  count: number;
  /** Half-angle of the spray cone, radians. */
  spread: number;
  speedMin: number;
  speedMax: number;
  sizeMin: number;
  sizeMax: number;
  lifeMin: number;
  lifeMax: number;
  gravity: number;
  drag: number;
  /** HDR start colour (bloomy). */
  r0: number; g0: number; b0: number;
  /** cool end colour. */
  r1: number; g1: number; b1: number;
  stretch: number;
  embers: number;
}

const DEFAULTS: SparkOpts = {
  count: 14,
  spread: 0.6,
  speedMin: 6,
  speedMax: 16,
  sizeMin: 0.05,
  sizeMax: 0.14,
  lifeMin: 0.25,
  lifeMax: 0.6,
  gravity: -14,
  drag: 1.2,
  r0: 9, g0: 5.5, b0: 2.2,
  r1: 3, g1: 0.7, b1: 0.15,
  stretch: 0.06,
  embers: 6,
};

/** Additive impact sparks: hot stretched streaks that arc under gravity, plus
 *  a few slow lingering embers. */
export class Sparks {
  private rng = makeRng(0x5824f);

  constructor(private engine: ParticleEngine) {}

  burst(pos: THREE.Vector3, dir: THREE.Vector3, opts?: Partial<SparkOpts>) {
    const o = { ...DEFAULTS, ...opts };
    _n.copy(dir).normalize();
    orthoBasis(_n, _t, _b);
    const rng = this.rng;

    for (let i = 0; i < o.count; i++) {
      // sample a direction within the cone about the spray axis
      const a = rng() * TAU;
      const s = Math.tan(o.spread) * Math.sqrt(rng());
      _d.copy(_n).addScaledVector(_t, Math.cos(a) * s).addScaledVector(_b, Math.sin(a) * s).normalize();
      const speed = o.speedMin + rng() * (o.speedMax - o.speedMin);

      const d = this.engine.desc.reset();
      d.px = pos.x; d.py = pos.y; d.pz = pos.z;
      d.vx = _d.x * speed; d.vy = _d.y * speed + rng() * 1.5; d.vz = _d.z * speed;
      d.r0 = o.r0; d.g0 = o.g0; d.b0 = o.b0;
      d.r1 = o.r1; d.g1 = o.g1; d.b1 = o.b1;
      d.life = o.lifeMin + rng() * (o.lifeMax - o.lifeMin);
      d.size0 = o.sizeMin + rng() * (o.sizeMax - o.sizeMin);
      d.size1 = d.size0 * 0.4;
      d.gravity = o.gravity;
      d.drag = o.drag;
      d.cell = ADD.SPARK;
      d.fadeMode = 1;
      d.stretch = true;
      d.stretchAmt = o.stretch;
      d.opacity = 1;
      this.engine.additive.spawn(d);
    }

    // slow embers that hang and cool
    for (let i = 0; i < o.embers; i++) {
      const a = rng() * TAU;
      const s = Math.tan(o.spread * 1.4) * Math.sqrt(rng());
      _d.copy(_n).addScaledVector(_t, Math.cos(a) * s).addScaledVector(_b, Math.sin(a) * s).normalize();
      const speed = o.speedMin * 0.4 + rng() * o.speedMin * 0.6;
      const d = this.engine.desc.reset();
      d.px = pos.x; d.py = pos.y; d.pz = pos.z;
      d.vx = _d.x * speed; d.vy = _d.y * speed + 1.5; d.vz = _d.z * speed;
      d.r0 = 6; d.g0 = 2.2; d.b0 = 0.5;
      d.r1 = 1.2; d.g1 = 0.2; d.b1 = 0.05;
      d.life = 0.6 + rng() * 0.9;
      d.size0 = 0.05 + rng() * 0.05;
      d.size1 = 0.02;
      d.gravity = -6;
      d.drag = 0.6;
      d.cell = ADD.EMBER;
      d.fadeMode = 1;
      this.engine.additive.spawn(d);
    }
  }

  /** A quick single bright glint — glass shards / casing catching light. */
  glint(pos: THREE.Vector3, size = 0.25, intensity = 4) {
    const d = this.engine.desc.reset();
    d.px = pos.x; d.py = pos.y; d.pz = pos.z;
    d.r0 = intensity; d.g0 = intensity; d.b0 = intensity;
    d.r1 = intensity * 0.5; d.g1 = intensity * 0.5; d.b1 = intensity * 0.6;
    d.life = 0.18 + this.rng() * 0.12;
    d.size0 = size; d.size1 = size * 0.3;
    d.cell = ADD.GLINT;
    d.fadeMode = 2;
    d.rot = this.rng() * TAU;
    this.engine.additive.spawn(d);
  }
}
