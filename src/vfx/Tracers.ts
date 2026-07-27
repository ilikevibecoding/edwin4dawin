import * as THREE from 'three';
import { clamp } from '../core/MathX';
import { ParticleEngine } from './ParticleEngine';
import { ADD } from './ParticleTextures';

const _dir = new THREE.Vector3();

/**
 * Tracer rounds: an HDR emissive stretched streak with a dimmer, longer trail,
 * travelling at the round's real speed (GPU-integrated, not instant) and
 * fading over distance. A touch of turbulence reads as heat-shimmer.
 */
export class Tracers {
  constructor(private engine: ParticleEngine) {}

  fire(from: THREE.Vector3, to: THREE.Vector3, speed: number, thickness = 1) {
    _dir.subVectors(to, from);
    const dist = _dir.length();
    if (dist < 0.01) return;
    _dir.multiplyScalar(1 / dist);

    // capture-friendly travel speed cap so the streak isn't off-screen instantly
    const v = clamp(speed, 40, 260);
    const life = clamp(dist / v, 0.05, 1.2);
    const w = 0.04 * thickness;

    // bright hot core
    const c = this.engine.desc.reset();
    c.px = from.x; c.py = from.y; c.pz = from.z;
    c.vx = _dir.x * v; c.vy = _dir.y * v; c.vz = _dir.z * v;
    c.r0 = 10; c.g0 = 7; c.b0 = 3.5;
    c.r1 = 4; c.g1 = 1.6; c.b1 = 0.5;
    c.life = life;
    c.size0 = w; c.size1 = w * 0.7;
    c.cell = ADD.SPARK;
    c.fadeMode = 1;
    c.stretch = true;
    c.stretchAmt = 0.02;
    c.opacity = 1;
    this.engine.additive.spawn(c);

    // dimmer, longer trail
    const t = this.engine.desc.reset();
    t.px = from.x; t.py = from.y; t.pz = from.z;
    t.vx = _dir.x * v; t.vy = _dir.y * v; t.vz = _dir.z * v;
    t.r0 = 3.5; t.g0 = 1.8; t.b0 = 0.7;
    t.r1 = 0.8; t.g1 = 0.3; t.b1 = 0.1;
    t.life = life * 1.05;
    t.size0 = w * 1.8; t.size1 = w;
    t.cell = ADD.SPARK;
    t.fadeMode = 1;
    t.stretch = true;
    t.stretchAmt = 0.05;
    t.turb = true;
    t.turbAmt = 0.03;
    t.opacity = 0.5;
    this.engine.additive.spawn(t);
  }
}
