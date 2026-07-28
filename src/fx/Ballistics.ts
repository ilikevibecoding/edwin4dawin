import * as THREE from 'three';
import type { MuzzleFlashEvent, TracerEvent } from '../core/Events';
import { Debris } from './DebrisPool';
import type { FXHost } from './FXContext';
import { Batch } from './ParticleEngine';
import { Sprite } from './ParticleTextures';

/**
 * Everything that happens between the trigger and the target: muzzle flash,
 * tracers, ejected brass and near misses.
 *
 * The tracer is the interesting one. It is a single particle with no gravity
 * and no drag, so the closed form reduces to `p = origin + direction * speed *
 * t` and its lifetime is exactly the time of flight — which means the streak
 * genuinely travels the distance rather than appearing along it, and a round
 * fired at a wall forty metres away takes the forty-five milliseconds it should
 * to get there, with no per-frame work of any kind.
 */

const _dir = new THREE.Vector3();
const _origin = new THREE.Vector3();
const _to = new THREE.Vector3();
const _tangent = new THREE.Vector3();
const _bitangent = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _muzzle = new THREE.Vector3();
const _closest = new THREE.Vector3();

/** Muzzle state carried between `weapon:fire` and `fx:muzzleflash`. */
export class MuzzleState {
  suppressed = false;
  /** 0..1 barrel heat, driven by rate of fire; scales the smoke. */
  heat = 0;
  private sinceShot = 0;

  shot(suppressed: boolean): void {
    this.suppressed = suppressed;
    this.heat = Math.min(1, this.heat + (suppressed ? 0.14 : 0.09));
    this.sinceShot = 0;
  }

  update(dt: number): void {
    this.sinceShot += dt;
    // Holds while the trigger is down, bleeds off in a couple of seconds after.
    if (this.sinceShot > 0.25) this.heat = Math.max(0, this.heat - dt * 0.55);
  }

  reset(): void {
    this.heat = 0;
    this.suppressed = false;
  }
}

function basisAround(axis: THREE.Vector3): void {
  if (Math.abs(axis.y) < 0.95) _tangent.copy(_up).cross(axis).normalize();
  else _tangent.set(1, 0, 0).cross(axis).normalize();
  _bitangent.crossVectors(axis, _tangent);
}

/* ------------------------------ muzzle flash -------------------------------- */

export function playMuzzleFlash(host: FXHost, evt: MuzzleFlashEvent, state: MuzzleState): void {
  const p = host.particles;
  const d = p.desc;
  const rng = host.rng;

  _muzzle.copy(evt.position);
  _dir.copy(evt.direction);
  if (_dir.lengthSq() < 1e-6) _dir.set(0, 0, -1);
  else _dir.normalize();
  basisAround(_dir);

  const suppressed = state.suppressed;
  const scale = Math.max(0.25, evt.scale) * (suppressed ? 0.34 : 1);

  // Two or three lobes at different rotations and sizes. A single sprite reads
  // as a decal stuck on the barrel; the asymmetry is the whole trick, and it
  // has to be re-rolled every shot or a held trigger looks like a strobe.
  const lobes = suppressed ? 1 : 2 + (rng.next() < 0.45 ? 1 : 0);
  for (let i = 0; i < lobes; i++) {
    const forward = 0.04 + i * 0.05 * scale;
    d.reset();
    d.px = _muzzle.x + _dir.x * forward;
    d.py = _muzzle.y + _dir.y * forward;
    d.pz = _muzzle.z + _dir.z * forward;
    d.seed = rng.next() * 64;
    d.velocity(_dir.x * 2.5, _dir.y * 2.5, _dir.z * 2.5);
    d.r0 = suppressed ? 2700 : rng.range(3500, 3950);
    d.g0 = suppressed ? 1800 : 2400;
    d.b0 = (i === 0 ? 11 : 6) * scale * (suppressed ? 0.35 : 1);
    d.a0 = 1;
    d.r1 = 0.12;
    d.g1 = 0.7;
    d.b1 = 0.42;
    d.a1 = 0.35;
    const size = scale * (i === 0 ? rng.range(0.2, 0.3) : rng.range(0.28, 0.46));
    d.sizes(size, size * rng.range(1.15, 1.7), 0.5);
    d.life = i === 0 ? 0.032 : rng.range(0.038, 0.055);
    d.drag = 9;
    d.gravity = 0;
    d.sprite = i === 0 ? Sprite.FLASH : rng.next() < 0.5 ? Sprite.FIRE : Sprite.FLASH;
    d.rotation = rng.range(0, Math.PI * 2);
    d.spin = rng.range(-12, 12);
    p.spawn(Batch.FIRE);
  }

  // Unburnt powder blown out of the muzzle. A cold barrel produces almost none;
  // half a magazine later the gun sits in its own haze.
  const smokeCount = p.count(Math.round((suppressed ? 3 : 1) + state.heat * (suppressed ? 7 : 4)));
  for (let i = 0; i < smokeCount; i++) {
    const spread = rng.range(0, 0.28);
    const phi = rng.next() * Math.PI * 2;
    const speed = rng.range(0.9, 3.4) * scale;
    d.reset();
    d.px = _muzzle.x + _dir.x * rng.range(0.02, 0.2);
    d.py = _muzzle.y + _dir.y * rng.range(0.02, 0.2);
    d.pz = _muzzle.z + _dir.z * rng.range(0.02, 0.2);
    d.seed = rng.next() * 64;
    d.velocity(
      _dir.x * speed + (_tangent.x * Math.cos(phi) + _bitangent.x * Math.sin(phi)) * spread,
      _dir.y * speed + (_tangent.y * Math.cos(phi) + _bitangent.y * Math.sin(phi)) * spread + 0.3,
      _dir.z * speed + (_tangent.z * Math.cos(phi) + _bitangent.z * Math.sin(phi)) * spread,
    );
    const tone = rng.range(0.26, 0.44);
    d.colors(tone, tone * 0.98, tone * 0.95, rng.range(0.12, 0.3) * (0.5 + state.heat), tone * 1.2, tone * 1.2, tone * 1.2, 0);
    d.sizes(rng.range(0.05, 0.1) * scale, rng.range(0.3, 0.75) * (0.6 + state.heat * 0.8), 0.45);
    d.life = rng.range(0.7, 1.9) * (0.6 + state.heat * 0.7);
    d.drag = rng.range(2.2, 3.8);
    d.gravity = -0.06;
    d.sprite = Sprite.SMOKE_WISP;
    d.turbulence = 0.18;
    d.rotation = rng.range(0, Math.PI * 2);
    d.spin = rng.range(-1.2, 1.2);
    d.delay = rng.range(0, 0.05);
    p.spawn(Batch.SMOKE);
  }

  // A few grains of burning powder thrown clear of the crown.
  if (!suppressed) {
    const grains = p.count(3);
    for (let i = 0; i < grains; i++) {
      const phi = rng.next() * Math.PI * 2;
      const spread = rng.range(0.5, 2.2);
      const speed = rng.range(3, 9) * scale;
      d.reset();
      d.px = _muzzle.x + _dir.x * 0.05;
      d.py = _muzzle.y + _dir.y * 0.05;
      d.pz = _muzzle.z + _dir.z * 0.05;
      d.seed = rng.next() * 64;
      d.velocity(
        _dir.x * speed + (_tangent.x * Math.cos(phi) + _bitangent.x * Math.sin(phi)) * spread,
        _dir.y * speed + (_tangent.y * Math.cos(phi) + _bitangent.y * Math.sin(phi)) * spread,
        _dir.z * speed + (_tangent.z * Math.cos(phi) + _bitangent.z * Math.sin(phi)) * spread,
      );
      d.r0 = rng.range(2500, 2900);
      d.g0 = 1400;
      d.b0 = rng.range(4, 9);
      d.a0 = 1;
      d.r1 = 1;
      d.g1 = 0.4;
      d.b1 = 0.12;
      d.a1 = 1;
      d.sizes(0.015, 0.008, 1);
      d.life = rng.range(0.15, 0.45);
      d.drag = 2.5;
      d.gravity = 1;
      d.sprite = Sprite.SPARK;
      d.stretch = 0.014;
      d.groundY = -1e6;
      p.spawn(Batch.SPARK);
    }
  }

  host.light(
    _muzzle,
    suppressed ? 0xffb066 : 0xffd9a0,
    (suppressed ? 6 : 34) * scale,
    suppressed ? 3.5 : 7,
    0.045,
  );
}

/* --------------------------------- tracers ---------------------------------- */

export function playTracer(host: FXHost, evt: TracerEvent): void {
  const p = host.particles;
  const d = p.desc;
  const rng = host.rng;

  _origin.copy(evt.origin);
  _to.copy(evt.end).sub(_origin);
  const distance = _to.length();
  if (distance < 0.35) return;
  _dir.copy(_to).multiplyScalar(1 / distance);

  const speed = Math.max(120, evt.speed);
  const flight = Math.min(distance / speed, 1.2);
  // Bigger bores burn a bigger, longer-lived trace.
  const gauge = Math.min(2, Math.max(0.6, evt.caliber / 7.62));

  d.reset();
  d.px = _origin.x;
  d.py = _origin.y;
  d.pz = _origin.z;
  d.seed = rng.next() * 64;
  d.velocity(_dir.x * speed, _dir.y * speed, _dir.z * speed);
  // Bright enough to bloom, but no brighter. A trace element genuinely does
  // outshine a sunlit wall by a couple of orders of magnitude, and authoring it
  // that way is exactly how to end up with white ribbons: the tone curve
  // desaturates everything far above the exposure key, so at forty the amber
  // and the green were indistinguishable. Held one to two stops over instead,
  // the core still clips to white and the alpha falloff around it keeps the
  // colour — which is what a tracer looks like on film.
  if (evt.fromPlayer) {
    // Warm amber, and dimmer: it is two feet from the player's eye at t=0 and
    // should not be the brightest thing on screen.
    d.colors(26 * gauge, 7 * gauge, 0.9 * gauge, 1, 8.5 * gauge, 1.7 * gauge, 0.2 * gauge, 1);
  } else {
    // Incoming fire is green and deliberately brighter. Legibility beats
    // realism here: a round the player cannot see is a round they cannot dodge.
    d.colors(2.6 * gauge, 21 * gauge, 4.8 * gauge, 1, 0.75 * gauge, 7 * gauge, 1.6 * gauge, 1);
  }
  // A tracer is not drawn at the width of the projectile — the trace compound
  // burns an envelope several times the bore and the lens flares it further —
  // but nor is it drawn fat. Sized for the bore it came out sub-pixel and the
  // resolve threw the whole burst away; sized generously it came out as a row
  // of glow sticks hanging in the street. What it wants is thin and long: two
  // pixels across and several metres of streak, which is what a tracer
  // measures in gun-camera footage.
  d.sizes(0.05 * gauge, 0.024 * gauge, 1);
  d.life = flight;
  d.drag = 0;
  d.gravity = 0;
  d.sprite = Sprite.SPARK;
  d.stretch = 0.009 * gauge;
  p.spawn(Batch.TRACER);
}

/* -------------------------------- whiz-by ------------------------------------ */

/**
 * A round passing close to the camera.
 *
 * Returns the miss distance so the caller can pick a sound, and paints a very
 * faint disturbance along the path: not the round itself, which is long gone,
 * but the two or three metres of displaced air the ear has already reported.
 */
export function nearMiss(host: FXHost, evt: TracerEvent, eye: THREE.Vector3): number {
  _origin.copy(evt.origin);
  _to.copy(evt.end).sub(_origin);
  const lengthSq = _to.lengthSq();
  if (lengthSq < 1e-4) return Infinity;

  _closest.copy(eye).sub(_origin);
  const t = Math.max(0, Math.min(1, _closest.dot(_to) / lengthSq));
  _closest.copy(_origin).addScaledVector(_to, t);
  const miss = _closest.distanceTo(eye);
  // Ignore the muzzle end of the player's own shots and anything not close.
  if (miss > 3 || (t < 0.04 && evt.fromPlayer)) return miss;

  const p = host.particles;
  const d = p.desc;
  const rng = host.rng;
  const speed = Math.max(120, evt.speed);
  const strength = 1 - miss / 3;

  _dir.copy(_to).multiplyScalar(1 / Math.sqrt(lengthSq));
  for (let i = 0; i < 2; i++) {
    d.reset();
    const back = 1.5 + i * 2.5;
    d.px = _closest.x - _dir.x * back;
    d.py = _closest.y - _dir.y * back;
    d.pz = _closest.z - _dir.z * back;
    d.seed = rng.next() * 64;
    d.velocity(_dir.x * speed, _dir.y * speed, _dir.z * speed);
    const v = 0.5 * strength;
    d.colors(v, v, v * 1.05, 0.16 * strength, v * 0.4, v * 0.4, v * 0.42, 0);
    d.sizes(0.02, 0.05, 1);
    d.life = 0.05;
    d.drag = 0;
    d.gravity = 0;
    d.sprite = Sprite.STREAK;
    d.stretch = 0.006;
    p.spawn(Batch.TRACER);
  }
  return miss;
}

/* ------------------------------ shell casings -------------------------------- */

export function ejectShell(
  host: FXHost,
  position: THREE.Vector3,
  velocity: THREE.Vector3,
  caliber: number,
): number {
  const rng = host.rng;
  const scale = Math.max(0.5, Math.min(2, caliber / 7.62));
  const ground = host.groundY(position.x, position.z, position.y + 0.5, position.y - 3);

  host.debris.spawn(
    Debris.BRASS,
    position.x,
    position.y,
    position.z,
    velocity.x + rng.range(-0.4, 0.4),
    velocity.y + rng.range(-0.2, 0.5),
    velocity.z + rng.range(-0.4, 0.4),
    rng.range(18, 44) * scale,
  );

  // Time to the floor, so the ting lands with the casing rather than with the
  // shot. Solved rather than polled: the pool has no collision callback and a
  // parabola does not need one.
  const drop = Math.max(0, position.y - ground);
  const vy = velocity.y;
  const fall = (vy + Math.sqrt(Math.max(0, vy * vy + 19.62 * drop))) / 9.81;
  return fall;
}
