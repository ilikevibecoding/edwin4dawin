import * as THREE from 'three';
import { BoltSystem } from './Bolts';
import { DebrisSystem, ParticleSystem, flashSystem, smokeSystem, sparkSystem } from './Particles';
import type { QualitySettings } from '../core/Quality';
import { Rng, rng } from '../core/Rng';
import { getMaterials } from '../assets/Materials';

/**
 * Facade over every transient effect.
 *
 * Two scales are maintained: `space` effects are measured in tens of metres
 * and have no gravity, `interior` effects are centimetre-scale and fall.
 * The timeline only ever talks to this class.
 */

export interface ShakeEvent {
  amplitude: number;
  frequency: number;
  duration: number;
}

export class FXManager {
  readonly spaceGroup = new THREE.Group();
  readonly interiorGroup = new THREE.Group();

  readonly spaceBolts: BoltSystem;
  readonly interiorBolts: BoltSystem;
  private spaceSparks: ParticleSystem;
  private spaceFlash: ParticleSystem;
  private spaceSmoke: ParticleSystem;
  private spaceDebris: DebrisSystem;
  private interiorSparks: ParticleSystem;
  private interiorFlash: ParticleSystem;
  private interiorSmoke: ParticleSystem;
  private interiorDebris: DebrisSystem;
  private systems: ParticleSystem[] = [];
  private rngStream: Rng;

  /** Accumulated camera shake, consumed by the camera director each frame. */
  shake = { amplitude: 0, frequency: 22, time: 0 };
  private shakeDecay = 2.4;

  constructor(quality: QualitySettings) {
    this.spaceGroup.name = 'FX:space';
    this.interiorGroup.name = 'FX:interior';
    this.rngStream = rng('fx');
    const s = quality.particleScale;
    const M = getMaterials();

    this.spaceBolts = new BoltSystem(Math.round(64 * Math.max(0.5, s)));
    this.interiorBolts = new BoltSystem(Math.round(48 * Math.max(0.5, s)));
    this.spaceGroup.add(this.spaceBolts.group);
    this.interiorGroup.add(this.interiorBolts.group);

    this.spaceSparks = sparkSystem(Math.round(900 * s), 0);
    this.spaceFlash = flashSystem(Math.round(120 * s));
    this.spaceSmoke = smokeSystem(Math.round(240 * s), 0);
    this.spaceDebris = new DebrisSystem(Math.round(140 * s), M.rebelHullDark, 0);
    this.spaceGroup.add(
      this.spaceSparks.points,
      this.spaceFlash.points,
      this.spaceSmoke.points,
      this.spaceDebris.mesh,
    );

    this.interiorSparks = sparkSystem(Math.round(700 * s), -6.5);
    this.interiorFlash = flashSystem(Math.round(90 * s));
    this.interiorSmoke = smokeSystem(Math.round(320 * s), 0.35);
    this.interiorDebris = new DebrisSystem(Math.round(90 * s), M.corridorTrim, -7.5);
    this.interiorGroup.add(
      this.interiorSparks.points,
      this.interiorFlash.points,
      this.interiorSmoke.points,
      this.interiorDebris.mesh,
    );

    this.systems = [
      this.spaceSparks,
      this.spaceFlash,
      this.spaceSmoke,
      this.interiorSparks,
      this.interiorFlash,
      this.interiorSmoke,
    ];
    this.spaceSmoke.points.renderOrder = 4;
    this.interiorSmoke.points.renderOrder = 4;
  }

  setPixelScale(height: number): void {
    this.systems.forEach((s) => s.setPixelScale(height * 0.9));
  }

  /* ------------------------------------------------------------- space */

  turbolaser(from: THREE.Vector3, to: THREE.Vector3, onImpact?: (p: THREE.Vector3) => void): void {
    this.spaceBolts.spawn({
      origin: from,
      target: to,
      speed: 1250,
      color: new THREE.Color(0x6dff8a),
      length: 46,
      radius: 2.6,
      scatter: 0,
      onImpact,
    });
  }

  runnerCannon(from: THREE.Vector3, to: THREE.Vector3, onImpact?: (p: THREE.Vector3) => void): void {
    this.spaceBolts.spawn({
      origin: from,
      target: to,
      speed: 1450,
      color: new THREE.Color(0xff4a3a),
      length: 30,
      radius: 1.7,
      scatter: 0,
      onImpact,
    });
  }

  spaceImpact(point: THREE.Vector3, scale = 1, color = new THREE.Color(0xffc46a)): void {
    const r = this.rngStream;
    this.spaceFlash.spawn({
      position: point,
      velocity: new THREE.Vector3(),
      color: color.clone().multiplyScalar(2.6),
      size: 90 * scale,
      life: 0.28,
      growth: 1.6,
    });
    for (let i = 0; i < Math.round(26 * scale); i++) {
      this.spaceSparks.spawn({
        position: point,
        velocity: new THREE.Vector3(r.spread(1), r.spread(1), r.spread(1)).normalize().multiplyScalar(r.range(18, 78) * scale),
        color: new THREE.Color().setHSL(0.09 + r.next() * 0.05, 1, 0.65),
        size: r.range(6, 16) * scale,
        life: r.range(0.4, 1.3),
      });
    }
    for (let i = 0; i < Math.round(7 * scale); i++) {
      this.spaceSmoke.spawn({
        position: point,
        velocity: new THREE.Vector3(r.spread(1), r.spread(1), r.spread(1)).multiplyScalar(r.range(6, 22)),
        color: new THREE.Color(0.22, 0.2, 0.19),
        size: r.range(18, 46) * scale,
        life: r.range(0.9, 1.8),
        growth: 2.2,
        rotation: r.range(0, 6.28),
        spin: r.spread(0.7),
      });
    }
    for (let i = 0; i < Math.round(5 * scale); i++) {
      this.spaceDebris.spawn(
        point,
        new THREE.Vector3(r.spread(1), r.spread(1), r.spread(1)).normalize().multiplyScalar(r.range(8, 34)),
        new THREE.Vector3(r.range(0.6, 2.4), r.range(0.4, 1.6), r.range(0.8, 3.2)),
        r.range(2.5, 5),
        r,
      );
    }
    this.addShake(0.5 * scale);
  }

  /** A miss: a brief flare with no debris. */
  spaceNearMiss(point: THREE.Vector3): void {
    this.spaceFlash.spawn({
      position: point,
      velocity: new THREE.Vector3(),
      color: new THREE.Color(0x9dffb0),
      size: 45,
      life: 0.16,
      growth: 1.2,
    });
    this.addShake(0.12);
  }

  hullVent(point: THREE.Vector3, direction: THREE.Vector3, intensity = 1): void {
    const r = this.rngStream;
    for (let i = 0; i < Math.round(3 * intensity); i++) {
      this.spaceSmoke.spawn({
        position: point,
        velocity: direction
          .clone()
          .multiplyScalar(r.range(24, 60))
          .add(new THREE.Vector3(r.spread(7), r.spread(7), r.spread(7))),
        color: new THREE.Color(0.34, 0.32, 0.3),
        size: r.range(10, 26),
        life: r.range(0.8, 1.7),
        growth: 3.2,
        rotation: r.range(0, 6.28),
        spin: r.spread(0.5),
      });
    }
    if (r.bool(0.4)) {
      this.spaceSparks.spawn({
        position: point,
        velocity: direction.clone().multiplyScalar(r.range(20, 50)),
        color: new THREE.Color(0xffb060),
        size: r.range(5, 12),
        life: r.range(0.3, 0.9),
      });
    }
  }

  /* ---------------------------------------------------------- interior */

  blasterBolt(
    from: THREE.Vector3,
    to: THREE.Vector3,
    color: 'red' | 'blue',
    onImpact?: (p: THREE.Vector3) => void,
  ): void {
    this.interiorBolts.spawn({
      origin: from,
      target: to,
      speed: 42,
      color: new THREE.Color(color === 'red' ? 0xff3a22 : 0x54c8ff),
      length: 0.85,
      radius: 0.035,
      scatter: 0.16,
      onImpact,
    });
  }

  interiorImpact(point: THREE.Vector3, scale = 1, color = new THREE.Color(0xffb060)): void {
    const r = this.rngStream;
    this.interiorFlash.spawn({
      position: point,
      velocity: new THREE.Vector3(),
      color: color.clone().multiplyScalar(2.2),
      size: 1.1 * scale,
      life: 0.16,
      growth: 1.4,
    });
    for (let i = 0; i < Math.round(14 * scale); i++) {
      this.interiorSparks.spawn({
        position: point,
        velocity: new THREE.Vector3(r.spread(1), r.range(-0.2, 1), r.spread(1)).normalize().multiplyScalar(r.range(1.2, 5)),
        color: new THREE.Color().setHSL(0.08 + r.next() * 0.05, 1, 0.68),
        size: r.range(0.05, 0.14) * scale,
        life: r.range(0.25, 0.85),
      });
    }
    if (r.bool(0.5)) {
      this.interiorSmoke.spawn({
        position: point,
        velocity: new THREE.Vector3(r.spread(0.3), r.range(0.2, 0.7), r.spread(0.3)),
        color: new THREE.Color(0.26, 0.25, 0.24),
        size: r.range(0.5, 1.1) * scale,
        life: r.range(1.4, 2.6),
        growth: 2.4,
        rotation: r.range(0, 6.28),
        spin: r.spread(0.5),
      });
    }
  }

  doorBreach(center: THREE.Vector3, forward: THREE.Vector3): void {
    const r = this.rngStream;
    this.interiorFlash.spawn({
      position: center,
      velocity: new THREE.Vector3(),
      color: new THREE.Color(0xffd0a0).multiplyScalar(3),
      size: 6,
      life: 0.4,
      growth: 2,
    });
    for (let i = 0; i < 90; i++) {
      this.interiorSparks.spawn({
        position: center.clone().add(new THREE.Vector3(r.spread(1.2), r.spread(1.1), 0)),
        velocity: forward
          .clone()
          .multiplyScalar(r.range(3, 12))
          .add(new THREE.Vector3(r.spread(3), r.spread(3), r.spread(1))),
        color: new THREE.Color().setHSL(0.07 + r.next() * 0.05, 1, 0.7),
        size: r.range(0.06, 0.2),
        life: r.range(0.5, 1.5),
      });
    }
    for (let i = 0; i < 40; i++) {
      this.interiorSmoke.spawn({
        position: center.clone().add(new THREE.Vector3(r.spread(1.2), r.spread(1.2), r.spread(0.4))),
        velocity: forward
          .clone()
          .multiplyScalar(r.range(1.5, 6))
          .add(new THREE.Vector3(r.spread(1.4), r.range(0, 1.4), r.spread(0.8))),
        color: new THREE.Color(0.34, 0.33, 0.32),
        size: r.range(1.2, 2.6),
        life: r.range(3, 6),
        growth: 2.6,
        rotation: r.range(0, 6.28),
        spin: r.spread(0.4),
      });
    }
    for (let i = 0; i < 26; i++) {
      this.interiorDebris.spawn(
        center.clone().add(new THREE.Vector3(r.spread(1.2), r.spread(1.1), 0)),
        forward
          .clone()
          .multiplyScalar(r.range(3, 11))
          .add(new THREE.Vector3(r.spread(2.5), r.range(0.5, 4), r.spread(1))),
        new THREE.Vector3(r.range(0.05, 0.22), r.range(0.04, 0.16), r.range(0.05, 0.2)),
        r.range(2.5, 5),
        r,
      );
    }
    this.addShake(1.5);
  }

  /** Persistent smoke source, called every frame while a fire burns. */
  emitSmoke(point: THREE.Vector3, rate: number, dt: number): void {
    const r = this.rngStream;
    if (r.next() > rate * dt) return;
    this.interiorSmoke.spawn({
      position: point.clone().add(new THREE.Vector3(r.spread(0.2), 0, r.spread(0.2))),
      velocity: new THREE.Vector3(r.spread(0.25), r.range(0.35, 0.85), r.spread(0.25)),
      color: new THREE.Color(0.3, 0.29, 0.28),
      size: r.range(0.55, 1.2),
      life: r.range(3, 6),
      growth: 2.8,
      rotation: r.range(0, 6.28),
      spin: r.spread(0.3),
    });
  }

  emitSparkShower(point: THREE.Vector3, rate: number, dt: number): void {
    const r = this.rngStream;
    if (r.next() > rate * dt) return;
    for (let i = 0; i < 5; i++) {
      this.interiorSparks.spawn({
        position: point,
        velocity: new THREE.Vector3(r.spread(0.8), r.range(-1.4, -0.2), r.spread(0.8)).multiplyScalar(r.range(1, 3.4)),
        color: new THREE.Color().setHSL(0.11, 1, 0.72),
        size: r.range(0.04, 0.1),
        life: r.range(0.3, 0.9),
      });
    }
  }

  /* -------------------------------------------------------------- shake */

  addShake(amplitude: number): void {
    this.shake.amplitude = Math.min(2.5, this.shake.amplitude + amplitude);
  }

  update(dt: number): void {
    this.spaceBolts.update(dt);
    this.interiorBolts.update(dt);
    this.spaceSparks.update(dt);
    this.spaceFlash.update(dt);
    this.spaceSmoke.update(dt);
    this.spaceDebris.update(dt);
    this.interiorSparks.update(dt);
    this.interiorFlash.update(dt);
    this.interiorSmoke.update(dt);
    this.interiorDebris.update(dt);
    this.shake.amplitude = Math.max(0, this.shake.amplitude - this.shakeDecay * dt * (0.4 + this.shake.amplitude));
    this.shake.time += dt;
  }

  reset(): void {
    this.spaceBolts.reset();
    this.interiorBolts.reset();
    this.spaceSparks.reset();
    this.spaceFlash.reset();
    this.spaceSmoke.reset();
    this.spaceDebris.reset();
    this.interiorSparks.reset();
    this.interiorFlash.reset();
    this.interiorSmoke.reset();
    this.interiorDebris.reset();
    this.shake.amplitude = 0;
    this.rngStream.reset();
  }

  get liveParticles(): number {
    return this.systems.reduce((n, s) => n + s.active, 0);
  }
}
