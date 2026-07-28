import * as THREE from 'three';
import type { IRenderPipeline } from '../core/Interfaces';
import type { FXHost } from './FXContext';
import { Batch, sunBurial } from './ParticleEngine';
import { Sprite } from './ParticleTextures';

/**
 * Thrown ordnance that is not meant to kill: smoke and flashbangs.
 */

const _dir = new THREE.Vector3();
const _at = new THREE.Vector3();
const _forward = new THREE.Vector3();

/**
 * Optical depth of one radius of screening smoke. Deliberately large: a smoke
 * grenade is meant to be something you cannot see through, so the sun should
 * not be reaching the far side of one.
 */
const SMOKE_OPACITY = 2.6;


/**
 * A smoke screen.
 *
 * Two phases. For the first second the canister is a pressure vessel venting
 * through a small hole, so the smoke leaves fast, narrow and white. After that
 * it is a smouldering source feeding a cloud that grows to fill its radius and
 * then just sits there being opaque.
 *
 * The whole cloud — every puff for the full duration — is written in this one
 * call with per-puff start delays, so a screen that will still be standing
 * thirty seconds from now costs nothing per frame while it stands. Density is
 * the point of the effect, so the count is set from the volume to be filled
 * and then clamped to a share of the batch: a smoke screen must never be able
 * to starve the impacts and explosions happening inside it.
 */
export function playSmokeScreen(
  host: FXHost,
  position: THREE.Vector3,
  radius: number,
  duration: number,
): void {
  const p = host.particles;
  const d = p.desc;
  const rng = host.rng;

  _at.copy(position);
  const R = Math.max(0.8, radius);
  const life = Math.max(2, duration);
  const ground = host.groundY(_at.x, _at.z, _at.y + 1, _at.y - 4);

  const budget = Math.max(24, Math.floor(p.capacityOf(Batch.SMOKE) * 0.42));
  const total = Math.min(budget, p.count(Math.round(R * life * 3.4)));
  // Puffs have to outlive their own spacing or the cloud strobes — and by a
  // wide margin, because births are spread across the whole burn. At half the
  // duration only the puffs from the last few seconds are near full opacity
  // and the screen you can walk through is not a screen.
  const puffLife = Math.max(5, life * 0.75);

  // A canister reaches its full screen in about five seconds and then spends
  // the rest of its burn merely feeding it. Spreading births evenly across the
  // whole burn instead — which is what the emission curve used to do — leaves
  // the screen a third deployed at the moment anyone would actually be walking
  // through it, and it photographed as a small tan blob rather than a wall.
  const burn = Math.min(life * 0.75, 7);

  for (let i = 0; i < total; i++) {
    const u = i / Math.max(1, total - 1);
    // Front-loaded, but tailing off rather than stopping dead, so the screen
    // thins from the top instead of vanishing all at once.
    const delay = Math.pow(u, 1.7) * burn;
    // The cloud grows: early puffs are born at the canister, later ones out
    // in the body of the screen where the earlier ones have already spread.
    const fill = Math.min(1, 0.18 + u * 1.9);
    randomInBall(rng);
    const spawnR = R * fill * 0.85;

    d.reset();
    d.px = _at.x + _dir.x * spawnR;
    // Grows upward as well as outward. A screen that hugs the floor is one an
    // enemy shoots over; the useful shape is a wall about as tall as it is wide.
    d.py = Math.max(ground + 0.12, _at.y + Math.abs(_dir.y) * spawnR * 0.9 + R * 0.4 * u);
    d.pz = _at.z + _dir.z * spawnR;
    d.seed = rng.next() * 64;
    const drift = rng.range(0.15, 0.75) * (1 - u * 0.5);
    // Barely any climb, and almost no buoyancy. Screening smoke is loaded to be
    // heavy for exactly this reason — a cloud that rises is a cloud with a gap
    // under it, and the gap is at knee height where everyone is lying down.
    d.velocity(_dir.x * drift, rng.range(0.04, 0.3), _dir.z * drift);
    // Nearly white and only faintly tinted: the scatter term supplies the
    // shading, so a grey albedo here would double-darken the cloud. Alpha is
    // held near the top for most of the puff's life and retired by the batch's
    // own fade rather than ramped to nothing, which is what actually makes the
    // screen block sight instead of merely tinting it.
    const tone = rng.range(0.72, 0.92);
    d.colors(
      tone,
      tone,
      tone * 0.99,
      rng.range(0.5, 0.78),
      tone * 0.9,
      tone * 0.9,
      tone * 0.9,
      rng.range(0.34, 0.55),
    );
    // A wide spread of sizes rather than a narrow one. Three hundred puffs all
    // the same size average into a single smooth mass; a mixture of small and
    // large gives the screen billows at more than one scale, which is the
    // difference between a cloud and a cotton ball.
    d.sizes(R * rng.range(0.2, 0.45), R * rng.range(0.5, 1.3), 0.4);
    d.life = puffLife * rng.range(0.75, 1.3);
    d.drag = rng.range(0.7, 1.4);
    d.gravity = -0.004;
    d.sprite = rng.next() < 0.55 ? Sprite.SMOKE : Sprite.SMOKE_WISP;
    d.turbulence = R * 0.035;
    // How far this puff sits from the lit face of the screen it belongs to,
    // times how opaque a radius of that screen is. A canister is about as
    // optically thick as a substance gets, so the far side of even a small
    // one is in effective darkness. Measured against the full radius rather
    // than the radius reached so far, because that is what the cloud will be
    // by the time this puff has any opacity of its own.
    d.burial = sunBurial(host.sunDir, _dir.x * spawnR, _dir.y * spawnR, _dir.z * spawnR, R) *
      SMOKE_OPACITY;
    d.rotation = rng.range(0, Math.PI * 2);
    d.spin = rng.range(-0.3, 0.3);
    d.delay = delay;
    p.spawn(Batch.SMOKE);
  }

  // The initial jet: fast, narrow, and aimed up and out of the canister.
  const jet = p.count(Math.round(10 + R * 2));
  for (let i = 0; i < jet; i++) {
    _dir.set(rng.range(-1, 1), rng.range(0.6, 2.4), rng.range(-1, 1)).normalize();
    const speed = rng.range(4, 11);
    d.reset();
    d.px = _at.x;
    d.py = _at.y + 0.08;
    d.pz = _at.z;
    d.seed = rng.next() * 64;
    d.velocity(_dir.x * speed, _dir.y * speed, _dir.z * speed);
    d.colors(0.95, 0.95, 0.95, rng.range(0.4, 0.7), 0.8, 0.8, 0.8, 0);
    d.sizes(rng.range(0.1, 0.25), R * rng.range(0.35, 0.7), 0.4);
    d.life = rng.range(1.6, 3.4);
    d.drag = rng.range(2.4, 4);
    d.gravity = -0.03;
    d.sprite = Sprite.SMOKE_WISP;
    d.turbulence = 0.3;
    d.rotation = rng.range(0, Math.PI * 2);
    d.spin = rng.range(-1.4, 1.4);
    d.delay = (i / jet) * 1.1;
    p.spawn(Batch.SMOKE);
  }

  host.sound('smoke_hiss', _at, 0.8, 1);
}

/**
 * A flashbang.
 *
 * The pipeline already blanks the screen on this event by distance alone. What
 * it cannot know is whether the player was looking at it or standing behind a
 * wall, and both of those matter far more than range: a stun grenade round the
 * corner is a loud noise, and one you happened to be facing takes your sight
 * for several seconds. `flash` takes the larger of the pending intensities, so
 * refining it upward here is safe and refining it downward is not — which is
 * the right way round, because the case worth getting right is the one where
 * the player is looking straight at it.
 */
export function playFlashbang(
  host: FXHost,
  position: THREE.Vector3,
  pipeline: IRenderPipeline | undefined,
): number {
  const p = host.particles;
  const d = p.desc;
  const rng = host.rng;
  const camera = host.ctx.camera;

  _at.copy(position);

  // The bang itself, which everyone sees regardless of where they are looking.
  d.reset();
  d.px = _at.x;
  d.py = _at.y;
  d.pz = _at.z;
  d.seed = rng.next() * 64;
  d.r0 = 5200;
  d.g0 = 3600;
  d.b0 = 26;
  d.a0 = 1;
  d.r1 = 0;
  d.g1 = 1;
  d.b1 = 1;
  d.a1 = 0.3;
  d.sizes(0.5, 3.4, 0.35);
  d.life = 0.12;
  d.drag = 7;
  d.gravity = 0;
  d.sprite = Sprite.FLASH;
  d.rotation = rng.range(0, Math.PI * 2);
  p.spawn(Batch.FIRE);

  const puffs = p.count(9);
  for (let i = 0; i < puffs; i++) {
    _dir.set(rng.range(-1, 1), rng.range(-0.3, 1.2), rng.range(-1, 1)).normalize();
    const speed = rng.range(2.5, 8);
    d.reset();
    d.px = _at.x;
    d.py = _at.y;
    d.pz = _at.z;
    d.seed = rng.next() * 64;
    d.velocity(_dir.x * speed, _dir.y * speed, _dir.z * speed);
    d.colors(0.9, 0.9, 0.88, rng.range(0.3, 0.55), 0.7, 0.7, 0.68, 0);
    d.sizes(0.14, rng.range(0.9, 1.8), 0.42);
    d.life = rng.range(0.9, 2);
    d.drag = 3.4;
    d.gravity = -0.05;
    d.sprite = Sprite.SMOKE_WISP;
    d.turbulence = 0.3;
    d.rotation = rng.range(0, Math.PI * 2);
    d.spin = rng.range(-1.5, 1.5);
    p.spawn(Batch.SMOKE);
  }

  host.light(_at, 0xffffff, 5200, 42, 0.14);

  const eye = camera.position;
  const distance = Math.max(0.35, _at.distanceTo(eye));
  _dir.copy(_at).sub(eye).multiplyScalar(1 / distance);
  camera.getWorldDirection(_forward);
  const facing = _forward.dot(_dir);

  // Nothing through a wall. `lineOfSight` is the cheap segment test the AI
  // uses, which is exactly the question being asked here.
  const clear = host.physics ? host.physics.lineOfSight(eye, _at) : true;
  if (!clear) {
    host.sound('flashbang_muffled', _at, 0.8, 1);
    return 0;
  }

  // Peripheral vision still takes a hit; only the back of the head does not.
  const angular = facing > 0 ? 0.35 + 0.65 * facing * facing : Math.max(0, 0.35 + facing * 0.35);
  const range = Math.max(0, 1 - distance / 16);
  const intensity = Math.min(1.6, angular * (0.25 + 1.45 * range * range));
  if (intensity <= 0.02) return 0;

  pipeline?.flash(0xfffaf0, intensity, 0.8 + 4.2 * intensity);
  host.addConcussion(0.5 * intensity, 0.35 * intensity);
  host.sound('flashbang', _at, 1, 1);
  host.ctx.events.emit('audio:duck', { amount: 0.85 * intensity, duration: 3.5 * intensity });
  return intensity;
}

/** Uniform point inside the unit ball, written into `_dir`. */
function randomInBall(rng: { next(): number }): void {
  const z = rng.next() * 2 - 1;
  const a = rng.next() * Math.PI * 2;
  const r = Math.sqrt(Math.max(0, 1 - z * z));
  const scale = Math.cbrt(rng.next());
  _dir.set(Math.cos(a) * r * scale, z * scale, Math.sin(a) * r * scale);
}
