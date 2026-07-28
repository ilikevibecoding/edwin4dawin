import * as THREE from 'three';
import { Groups, hitMeta } from '../core/GameContext';
import type { ImpactEvent, SurfaceKind } from '../core/Events';
import { DecalTile } from './DecalAtlas';
import { decalOpts } from './DecalSystem';
import { Debris } from './DebrisPool';
import type { FXHost } from './FXContext';
import { Batch, type ParticleDesc } from './ParticleEngine';
import { Sprite } from './ParticleTextures';

/**
 * Bullet impacts.
 *
 * A round arriving at 800 m/s deposits its energy in under a millisecond, and
 * what comes back out is entirely a property of what it hit. Concrete throws a
 * pale cloud of pulverised cement and a few sharp chips; steel throws almost no
 * mass at all but a shower of white-hot swarf; wet sand throws a lot of mass
 * very slowly. Getting those three apart is most of what makes a wall feel like
 * a wall.
 *
 * Every recipe below is scaled by `ImpactEvent.energy` and jittered per hit, so
 * a magazine emptied into one spot never produces the same puff twice.
 */

const _tangent = new THREE.Vector3();
const _bitangent = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _reflect = new THREE.Vector3();
const _point = new THREE.Vector3();
const _normal = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _rayOrigin = new THREE.Vector3();
const _decalNormal = new THREE.Vector3();

const NEAR_SURFACE_MASK = Groups.WORLD | Groups.PROP;

function makeBasis(n: THREE.Vector3): void {
  if (Math.abs(n.y) < 0.95) _tangent.copy(_up).cross(n).normalize();
  else _tangent.set(1, 0, 0).cross(n).normalize();
  _bitangent.crossVectors(n, _tangent);
}

/** A direction inside a cone of half-angle `spread` radians about `n`. */
function cone(host: FXHost, n: THREE.Vector3, spread: number, bias = 1): void {
  const rng = host.rng;
  const cosMin = Math.cos(spread);
  const c = 1 - Math.pow(rng.next(), bias) * (1 - cosMin);
  const s = Math.sqrt(Math.max(0, 1 - c * c));
  const phi = rng.next() * Math.PI * 2;
  _dir
    .copy(n)
    .multiplyScalar(c)
    .addScaledVector(_tangent, Math.cos(phi) * s)
    .addScaledVector(_bitangent, Math.sin(phi) * s);
}

/** Common start state: at the hit point, offset a hair along the normal. */
function seed(d: ParticleDesc, host: FXHost, offset: number): ParticleDesc {
  d.reset();
  d.px = _point.x + _normal.x * offset;
  d.py = _point.y + _normal.y * offset;
  d.pz = _point.z + _normal.z * offset;
  d.seed = host.rng.next() * 64;
  return d;
}

export function playImpact(host: FXHost, evt: ImpactEvent): void {
  _point.copy(evt.point);
  _normal.copy(evt.normal);
  if (_normal.lengthSq() < 1e-6) _normal.set(0, 1, 0);
  else _normal.normalize();
  makeBasis(_normal);

  const energy = Math.max(0.12, Math.min(2.5, evt.energy));
  // Everything below the ricochet plane is wasted: sparks and chips settle on
  // whatever is under the hit, so the height is worth one query per impact.
  const ground = host.groundY(_point.x, _point.z, _point.y + 0.4, _point.y - 12);

  // Grazing hits throw their spray along the wall rather than back out of it.
  _reflect
    .copy(evt.direction)
    .addScaledVector(_normal, -2 * evt.direction.dot(_normal))
    .normalize();

  switch (evt.surface) {
    case 'metal':
      metal(host, energy, ground);
      break;
    case 'wood':
      wood(host, energy, ground);
      break;
    case 'sand':
    case 'dirt':
      granular(host, energy, ground, evt.surface);
      break;
    case 'glass':
      glass(host, energy, ground, evt);
      break;
    case 'water':
      water(host, energy);
      break;
    case 'flesh':
      flesh(host, energy, evt);
      break;
    case 'foliage':
      foliage(host, energy, ground);
      break;
    case 'fabric':
      fabric(host, energy, ground);
      break;
    case 'rubber':
      rubbery(host, energy, ground);
      break;
    default:
      masonry(host, energy, ground, evt.surface);
      break;
  }

  placeBulletDecal(host, evt, energy);
}

/* ------------------------- concrete / plaster / brick ---------------------- */

function masonry(host: FXHost, energy: number, ground: number, surface: SurfaceKind): void {
  const p = host.particles;
  const d = p.desc;
  const rng = host.rng;
  const plaster = surface === 'plaster';

  // Pulverised cement: pale, low-density, expands fast then stalls in the air.
  const puffs = p.count(6 + Math.round(7 * energy));
  for (let i = 0; i < puffs; i++) {
    cone(host, _normal, 1.15, 1.6);
    const speed = rng.range(1.4, 5.2) * (0.6 + energy * 0.6);
    const tone = rng.range(0.78, 1);
    seed(d, host, 0.03)
      .velocity(_dir.x * speed, _dir.y * speed + rng.range(0.2, 1.1), _dir.z * speed)
      .colors(
        (plaster ? 0.86 : 0.72) * tone,
        (plaster ? 0.84 : 0.69) * tone,
        (plaster ? 0.8 : 0.63) * tone,
        rng.range(0.4, 0.72),
        0.5 * tone,
        0.48 * tone,
        0.45 * tone,
        0,
      )
      .sizes(rng.range(0.04, 0.09), rng.range(0.26, 0.52) * (0.7 + energy * 0.5), 0.42);
    d.life = rng.range(0.55, 1.25);
    d.drag = rng.range(3.2, 5.5);
    d.gravity = 0.05;
    d.sprite = rng.next() < 0.35 ? Sprite.SMOKE_WISP : Sprite.DUST;
    d.turbulence = 0.16;
    d.rotation = rng.range(0, Math.PI * 2);
    d.spin = rng.range(-1.4, 1.4);
    p.spawn(Batch.DUST);
  }

  // Grit: the fine stuff that sprays out flat and dies within a metre.
  const grit = p.count(5 + Math.round(9 * energy));
  for (let i = 0; i < grit; i++) {
    cone(host, _normal, 1.0, 0.7);
    const speed = rng.range(4, 13) * (0.5 + energy * 0.7);
    seed(d, host, 0.02)
      .velocity(_dir.x * speed, _dir.y * speed + rng.range(0, 1.6), _dir.z * speed)
      .colors(0.55, 0.52, 0.47, 1, 0.42, 0.4, 0.36, 1)
      .sizes(rng.range(0.012, 0.03), rng.range(0.008, 0.02), 1);
    d.life = rng.range(0.5, 1.4);
    d.drag = 0.55;
    d.gravity = 1;
    d.sprite = rng.next() < 0.5 ? Sprite.CHIP : Sprite.GRIT;
    d.groundY = ground;
    d.rotation = rng.range(0, Math.PI * 2);
    d.spin = rng.range(-16, 16);
    p.spawn(Batch.CHUNK);
  }

  // Two or three pieces big enough to watch land, with real collision.
  if (energy > 0.35 && host.debris.available) {
    const pieces = Math.min(3, 1 + Math.floor(energy * 2));
    for (let i = 0; i < pieces; i++) {
      cone(host, _normal, 0.9, 0.8);
      const speed = rng.range(2.6, 6.5) * (0.6 + energy * 0.5);
      host.debris.spawn(
        Debris.RUBBLE,
        _point.x + _normal.x * 0.05,
        _point.y + _normal.y * 0.05,
        _point.z + _normal.z * 0.05,
        _dir.x * speed,
        _dir.y * speed + 1.2,
        _dir.z * speed,
        rng.range(6, 18),
        0.5,
      );
    }
  }

  settleRing(host, ground, 0.35 + 0.5 * energy, 0.62, 0.6, 0.58, 0.52);
  host.sound('impact_concrete', _point, 0.6 + 0.4 * energy, host.rng.range(0.92, 1.1));
}

/**
 * The low ring of dust that drifts out along the floor under a hit. It is the
 * cheapest thing in this file and the one that most reliably makes an impact
 * feel like it happened in a room rather than in front of a photograph.
 */
function settleRing(
  host: FXHost,
  ground: number,
  strength: number,
  r: number,
  g: number,
  b: number,
  scale: number,
): void {
  if (ground < _point.y - 4 || ground > _point.y + 0.2) return;
  const p = host.particles;
  const d = p.desc;
  const rng = host.rng;
  const count = p.count(2 + Math.round(3 * strength));
  for (let i = 0; i < count; i++) {
    const phi = rng.next() * Math.PI * 2;
    const speed = rng.range(0.35, 1.5) * strength;
    d.reset();
    d.px = _point.x + Math.cos(phi) * rng.range(0, 0.28);
    d.py = ground + rng.range(0.02, 0.14);
    d.pz = _point.z + Math.sin(phi) * rng.range(0, 0.28);
    d.seed = rng.next() * 64;
    d.velocity(Math.cos(phi) * speed, rng.range(0.05, 0.35), Math.sin(phi) * speed)
      .colors(r * scale, g * scale, b * scale, rng.range(0.2, 0.4), r * 0.7, g * 0.7, b * 0.7, 0)
      .sizes(rng.range(0.12, 0.24), rng.range(0.55, 1.1) * strength, 0.5);
    d.life = rng.range(1.1, 2.2);
    d.drag = rng.range(1.6, 2.6);
    d.gravity = -0.02;
    d.sprite = Sprite.DUST;
    d.turbulence = 0.1;
    d.rotation = rng.range(0, Math.PI * 2);
    d.spin = rng.range(-0.6, 0.6);
    p.spawn(Batch.DUST);
  }
}

/* --------------------------------- metal ---------------------------------- */

function metal(host: FXHost, energy: number, ground: number): void {
  const p = host.particles;
  const d = p.desc;
  const rng = host.rng;

  // Swarf: white-hot at birth, cooling along the Planckian locus. The lifetime
  // spread is what turns a burst into a shower rather than a starburst.
  const sparks = p.count(10 + Math.round(20 * energy));
  for (let i = 0; i < sparks; i++) {
    // Biased toward the ricochet direction, not the surface normal.
    _dir.copy(_reflect).addScaledVector(_normal, 0.35).normalize();
    makeBasisAround(_dir);
    cone(host, _dir, 0.85, 0.55);
    const speed = rng.range(5, 22) * (0.5 + energy * 0.75);
    seed(d, host, 0.015).velocity(
      _dir.x * speed,
      _dir.y * speed + rng.range(0, 2.2),
      _dir.z * speed,
    );
    d.r0 = rng.range(2700, 3100);
    d.g0 = rng.range(1500, 1850);
    d.b0 = rng.range(12, 26) * (0.55 + energy * 0.6);
    d.a0 = 1;
    d.r1 = 1;
    d.g1 = 0.45;
    d.b1 = 0.16;
    d.a1 = 1;
    d.sizes(rng.range(0.012, 0.03), rng.range(0.006, 0.016), 1);
    d.life = rng.range(0.25, 0.95);
    d.drag = rng.range(0.8, 2.2);
    d.gravity = 1;
    d.sprite = Sprite.SPARK;
    d.stretch = rng.range(0.012, 0.03);
    d.groundY = ground;
    p.spawn(Batch.SPARK);
  }
  makeBasis(_normal);

  // A handful of slow embers that outlive the shower and bounce twice.
  const embers = p.count(2 + Math.round(4 * energy));
  for (let i = 0; i < embers; i++) {
    cone(host, _normal, 1.3, 0.8);
    const speed = rng.range(1.5, 5);
    seed(d, host, 0.02).velocity(_dir.x * speed, _dir.y * speed + 1.5, _dir.z * speed);
    d.r0 = rng.range(2200, 2500);
    d.g0 = 1250;
    d.b0 = rng.range(5, 11);
    d.a0 = 1;
    d.r1 = 1;
    d.g1 = 0.35;
    d.b1 = 0.1;
    d.a1 = 1;
    d.sizes(rng.range(0.014, 0.026), rng.range(0.01, 0.018), 1);
    d.life = rng.range(0.9, 1.9);
    d.drag = 1.1;
    d.gravity = 1;
    d.sprite = Sprite.EMBER;
    d.stretch = 0.008;
    d.groundY = ground;
    p.spawn(Batch.SPARK);
  }

  // The flash at the point of contact: over in three frames.
  seed(d, host, 0.01).velocity(_normal.x * 0.4, _normal.y * 0.4, _normal.z * 0.4);
  d.r0 = 3600;
  d.g0 = 2300;
  d.b0 = 4 + 7 * energy;
  d.a0 = 1;
  d.r1 = 0.15;
  d.g1 = 0.6;
  d.b1 = 0.3;
  d.a1 = 0.5;
  d.sizes(0.1 + 0.16 * energy, 0.03, 1.6);
  d.life = 0.06;
  d.drag = 6;
  d.gravity = 0;
  d.sprite = Sprite.FLASH;
  d.rotation = rng.range(0, Math.PI * 2);
  p.spawn(Batch.FIRE);

  // Vaporised metal leaves a thin grey wisp, not a dust cloud.
  const wisps = p.count(1 + Math.round(2 * energy));
  for (let i = 0; i < wisps; i++) {
    cone(host, _normal, 0.8, 1.4);
    const speed = rng.range(0.8, 2.4);
    seed(d, host, 0.03)
      .velocity(_dir.x * speed, _dir.y * speed + 0.7, _dir.z * speed)
      .colors(0.32, 0.31, 0.3, 0.3, 0.26, 0.25, 0.24, 0)
      .sizes(0.05, rng.range(0.3, 0.55), 0.45);
    d.life = rng.range(0.5, 1);
    d.drag = 3;
    d.gravity = -0.08;
    d.sprite = Sprite.SMOKE_WISP;
    d.rotation = rng.range(0, Math.PI * 2);
    d.spin = rng.range(-1, 1);
    p.spawn(Batch.DUST);
  }

  host.light(_point, 0xffc477, 6 + 14 * energy, 3.2, 0.07);
  host.sound('impact_metal', _point, 0.55 + 0.45 * energy, rng.range(0.9, 1.15));
}

/** Rebuilds the tangent frame around an arbitrary axis. */
function makeBasisAround(axis: THREE.Vector3): void {
  if (Math.abs(axis.y) < 0.95) _tangent.copy(_up).cross(axis).normalize();
  else _tangent.set(1, 0, 0).cross(axis).normalize();
  _bitangent.crossVectors(axis, _tangent);
}

/* ---------------------------------- wood ----------------------------------- */

function wood(host: FXHost, energy: number, ground: number): void {
  const p = host.particles;
  const d = p.desc;
  const rng = host.rng;

  const splinters = p.count(6 + Math.round(10 * energy));
  for (let i = 0; i < splinters; i++) {
    cone(host, _normal, 0.95, 0.7);
    const speed = rng.range(3.5, 11) * (0.55 + energy * 0.6);
    const tone = rng.range(0.7, 1.1);
    seed(d, host, 0.02)
      .velocity(_dir.x * speed, _dir.y * speed + rng.range(0.2, 2), _dir.z * speed)
      .colors(0.42 * tone, 0.29 * tone, 0.16 * tone, 1, 0.3 * tone, 0.2 * tone, 0.11 * tone, 1)
      .sizes(rng.range(0.02, 0.055), rng.range(0.018, 0.05), 1);
    d.life = rng.range(0.7, 1.8);
    d.drag = rng.range(1.2, 3);
    d.gravity = 1;
    d.sprite = Sprite.SPLINTER;
    d.groundY = ground;
    d.rotation = rng.range(0, Math.PI * 2);
    d.spin = rng.range(-22, 22);
    p.spawn(Batch.CHUNK);
  }

  const dust = p.count(3 + Math.round(5 * energy));
  for (let i = 0; i < dust; i++) {
    cone(host, _normal, 1.1, 1.5);
    const speed = rng.range(1, 3.4);
    seed(d, host, 0.03)
      .velocity(_dir.x * speed, _dir.y * speed + 0.5, _dir.z * speed)
      .colors(0.62, 0.5, 0.33, rng.range(0.3, 0.55), 0.42, 0.34, 0.22, 0)
      .sizes(rng.range(0.04, 0.09), rng.range(0.25, 0.5), 0.45);
    d.life = rng.range(0.5, 1.1);
    d.drag = 3.6;
    d.gravity = 0.1;
    d.sprite = Sprite.DUST;
    d.rotation = rng.range(0, Math.PI * 2);
    d.spin = rng.range(-1.2, 1.2);
    p.spawn(Batch.DUST);
  }

  if (energy > 0.45 && host.debris.available) {
    cone(host, _normal, 0.8, 0.8);
    const speed = rng.range(3, 7);
    host.debris.spawn(
      Debris.SPLINTER,
      _point.x + _normal.x * 0.06,
      _point.y + _normal.y * 0.06,
      _point.z + _normal.z * 0.06,
      _dir.x * speed,
      _dir.y * speed + 1.4,
      _dir.z * speed,
      rng.range(10, 26),
      0.6,
    );
  }

  host.sound('impact_wood', _point, 0.55 + 0.4 * energy, rng.range(0.9, 1.12));
}

/* ------------------------------- sand / dirt -------------------------------- */

function granular(host: FXHost, energy: number, ground: number, surface: SurfaceKind): void {
  const p = host.particles;
  const d = p.desc;
  const rng = host.rng;
  const sandy = surface === 'sand';
  const r = sandy ? 0.78 : 0.44;
  const g = sandy ? 0.66 : 0.34;
  const b = sandy ? 0.44 : 0.24;

  // A plume, not a puff: narrow and fast at the top, broad and slow at the
  // base, because the displaced grain leaves at every angle at once.
  const plume = p.count(9 + Math.round(13 * energy));
  for (let i = 0; i < plume; i++) {
    const tall = i < plume * 0.4;
    cone(host, _normal, tall ? 0.5 : 1.35, tall ? 2.2 : 0.9);
    const speed = (tall ? rng.range(3.5, 8) : rng.range(0.8, 3.2)) * (0.6 + energy * 0.6);
    const tone = rng.range(0.82, 1.12);
    seed(d, host, 0.02)
      .velocity(_dir.x * speed, _dir.y * speed + (tall ? rng.range(1, 3) : 0.3), _dir.z * speed)
      .colors(r * tone, g * tone, b * tone, rng.range(0.45, 0.8), r * 0.62, g * 0.6, b * 0.58, 0)
      .sizes(
        rng.range(0.06, 0.16),
        rng.range(0.35, 0.95) * (tall ? 1.2 : 1.6) * (0.7 + energy * 0.5),
        0.5,
      );
    d.life = rng.range(0.7, 1.7);
    d.drag = rng.range(2.4, 4.4);
    d.gravity = 0.18;
    d.sprite = rng.next() < 0.4 ? Sprite.SMOKE_WISP : Sprite.DUST;
    d.turbulence = 0.2;
    d.rotation = rng.range(0, Math.PI * 2);
    d.spin = rng.range(-1.1, 1.1);
    p.spawn(Batch.DUST);
  }

  // Displaced clumps: heavier and slower than concrete grit, and they land.
  const clumps = p.count(4 + Math.round(8 * energy));
  for (let i = 0; i < clumps; i++) {
    cone(host, _normal, 0.85, 0.9);
    const speed = rng.range(2.5, 7.5) * (0.6 + energy * 0.5);
    const tone = rng.range(0.7, 1);
    seed(d, host, 0.02)
      .velocity(_dir.x * speed, _dir.y * speed + rng.range(0.5, 2.4), _dir.z * speed)
      .colors(r * tone * 0.85, g * tone * 0.85, b * tone * 0.85, 1, r * 0.55, g * 0.5, b * 0.45, 1)
      .sizes(rng.range(0.025, 0.07), rng.range(0.02, 0.055), 1);
    d.life = rng.range(0.8, 1.6);
    d.drag = 0.4;
    d.gravity = 1;
    d.sprite = rng.next() < 0.5 ? Sprite.CHIP : Sprite.GRIT;
    d.groundY = ground;
    d.rotation = rng.range(0, Math.PI * 2);
    d.spin = rng.range(-12, 12);
    p.spawn(Batch.CHUNK);
  }

  settleRing(host, ground, 0.6 + 0.7 * energy, r, g, b, 0.85);
  host.sound(sandy ? 'impact_sand' : 'impact_dirt', _point, 0.5 + 0.4 * energy, rng.range(0.9, 1.1));
}

/* --------------------------------- glass ------------------------------------ */

function glass(host: FXHost, energy: number, ground: number, evt: ImpactEvent): void {
  const p = host.particles;
  const d = p.desc;
  const rng = host.rng;
  const breakable = evt.target ? hitMeta(evt.target).breakable === true : false;
  const scale = breakable ? 2.4 : 1;

  const shards = p.count(Math.round((7 + 11 * energy) * scale));
  for (let i = 0; i < shards; i++) {
    // A pane sprays forward through the hole as well as back out of it.
    if (rng.next() < 0.55) _dir.copy(evt.direction).addScaledVector(_normal, -0.2).normalize();
    else _dir.copy(_normal);
    makeBasisAround(_dir);
    cone(host, _dir, breakable ? 1.1 : 0.75, 0.8);
    const speed = rng.range(1.5, 7) * (0.5 + energy * 0.6);
    seed(d, host, 0.01)
      .velocity(_dir.x * speed, _dir.y * speed + rng.range(-0.3, 1.4), _dir.z * speed)
      .colors(2.6, 3.4, 3.8, 0.85, 1.1, 1.5, 1.7, 0.5)
      .sizes(rng.range(0.02, 0.06), rng.range(0.015, 0.05), 1);
    d.life = rng.range(0.8, 2);
    d.drag = 0.7;
    d.gravity = 1;
    d.sprite = Sprite.SHARD;
    d.groundY = ground;
    d.rotation = rng.range(0, Math.PI * 2);
    d.spin = rng.range(-14, 14);
    p.spawn(Batch.CHUNK);
  }
  makeBasis(_normal);

  // Glass dust: the white bloom right at the hole.
  const bloom = p.count(2 + Math.round(4 * energy));
  for (let i = 0; i < bloom; i++) {
    cone(host, _normal, 1.2, 1.6);
    const speed = rng.range(0.6, 2.4);
    seed(d, host, 0.02)
      .velocity(_dir.x * speed, _dir.y * speed, _dir.z * speed)
      .colors(1.1, 1.25, 1.35, rng.range(0.2, 0.4), 0.7, 0.8, 0.9, 0)
      .sizes(0.04, rng.range(0.16, 0.34), 0.5);
    d.life = rng.range(0.3, 0.7);
    d.drag = 5;
    d.gravity = 0.2;
    d.sprite = Sprite.DUST;
    p.spawn(Batch.DUST);
  }

  if (host.debris.available) {
    const pieces = breakable ? 5 : energy > 0.4 ? 2 : 1;
    for (let i = 0; i < pieces; i++) {
      cone(host, _normal, 1.0, 0.9);
      const speed = rng.range(1.5, 5.5);
      host.debris.spawn(
        Debris.SHARD,
        _point.x + _normal.x * 0.04,
        _point.y + _normal.y * 0.04,
        _point.z + _normal.z * 0.04,
        _dir.x * speed,
        _dir.y * speed + 0.6,
        _dir.z * speed,
        rng.range(6, 20),
        0.7,
      );
    }
  }

  host.sound(breakable ? 'glass_shatter' : 'impact_glass', _point, 0.6 + 0.4 * energy, rng.range(0.94, 1.08));
}

/* --------------------------------- water ------------------------------------ */

function water(host: FXHost, energy: number): void {
  const p = host.particles;
  const d = p.desc;
  const rng = host.rng;

  // The column: a narrow spike of white water that collapses back on itself.
  const column = p.count(5 + Math.round(8 * energy));
  for (let i = 0; i < column; i++) {
    cone(host, _up, 0.28, 2.4);
    const speed = rng.range(3.5, 9) * (0.6 + energy * 0.6);
    seed(d, host, 0.02)
      .velocity(_dir.x * speed * 0.35, speed, _dir.z * speed * 0.35)
      .colors(1.35, 1.5, 1.55, rng.range(0.5, 0.85), 0.8, 0.95, 1.05, 0)
      .sizes(rng.range(0.06, 0.16), rng.range(0.2, 0.5), 0.7);
    d.life = rng.range(0.45, 0.95);
    d.drag = 1.3;
    d.gravity = 1;
    d.sprite = rng.next() < 0.5 ? Sprite.SMOKE_WISP : Sprite.DUST;
    p.spawn(Batch.DUST);
  }

  const droplets = p.count(8 + Math.round(14 * energy));
  for (let i = 0; i < droplets; i++) {
    cone(host, _up, 0.95, 0.6);
    const speed = rng.range(2, 8) * (0.5 + energy * 0.7);
    seed(d, host, 0.01)
      .velocity(_dir.x * speed, _dir.y * speed + rng.range(1, 3), _dir.z * speed)
      .colors(1.2, 1.4, 1.5, 0.8, 0.9, 1.1, 1.2, 0.4)
      .sizes(rng.range(0.012, 0.032), rng.range(0.01, 0.026), 1);
    d.life = rng.range(0.5, 1.2);
    d.drag = 0.35;
    d.gravity = 1;
    d.sprite = Sprite.BLOOD;
    d.stretch = 0.02;
    d.groundY = _point.y;
    p.spawn(Batch.BLOOD);
  }

  if (host.decals) {
    const ripple = 0.5 + 1.4 * energy;
    const o = decalOpts(DecalTile.RIPPLE, ripple);
    o.depth = 0.25;
    o.opacity = 0.6;
    o.rotation = rng.range(0, Math.PI * 2);
    o.normalStrength = 0.5;
    o.glossScale = 1.4;
    o.angleMin = 0.6;
    o.fadeIn = 0.1;
    o.growTo = ripple * 2.4;
    o.ttl = 1.4;
    o.fadeOut = 1.1;
    host.decals.place(_point, _up, o);
  }
  host.sound('impact_water', _point, 0.5 + 0.4 * energy, rng.range(0.9, 1.1));
}

/* --------------------------------- flesh ------------------------------------ */

function flesh(host: FXHost, energy: number, evt: ImpactEvent): void {
  bloodSpray(host, _point, evt.direction, energy, false);
  host.sound('impact_flesh', _point, 0.6 + 0.4 * energy, host.rng.range(0.92, 1.08));
}

/**
 * Blood. Restrained: a short spray along the line of travel, a fine mist that
 * catches the light for a fraction of a second, and a mark on the first thing
 * behind the target. Lethal hits get the mist and the volume, not more gore.
 */
export function bloodSpray(
  host: FXHost,
  at: THREE.Vector3,
  direction: THREE.Vector3,
  amount: number,
  lethal: boolean,
): void {
  const p = host.particles;
  const d = p.desc;
  const rng = host.rng;
  const scale = Math.max(0.2, Math.min(3, amount)) * (lethal ? 1.7 : 1);

  _dir.copy(direction);
  if (_dir.lengthSq() < 1e-6) _dir.set(0, 1, 0);
  else _dir.normalize();
  const axis = _decalNormal.copy(_dir);
  makeBasisAround(axis);
  const ground = host.groundY(at.x, at.z, at.y + 0.3, at.y - 3);

  const drops = p.count(Math.round(6 + 10 * scale));
  for (let i = 0; i < drops; i++) {
    cone(host, axis, 0.75, 0.7);
    const speed = rng.range(2, 9) * (0.5 + scale * 0.4);
    d.reset();
    d.px = at.x;
    d.py = at.y;
    d.pz = at.z;
    d.seed = rng.next() * 64;
    d.velocity(_dir.x * speed, _dir.y * speed + rng.range(0.4, 2.2), _dir.z * speed)
      .colors(0.32, 0.022, 0.016, 1, 0.14, 0.012, 0.01, 0.85)
      .sizes(rng.range(0.014, 0.038), rng.range(0.01, 0.03), 1);
    d.life = rng.range(0.6, 1.4);
    d.drag = 0.5;
    d.gravity = 1;
    d.sprite = Sprite.BLOOD;
    d.stretch = rng.range(0.012, 0.03);
    d.groundY = ground;
    d.rotation = rng.range(0, Math.PI * 2);
    p.spawn(Batch.BLOOD);
  }

  // The mist: what actually reads on camera, and the only part that needs to
  // be lit — backlit it goes bright pink, which is the whole effect.
  const mist = p.count(Math.round(3 + 7 * scale));
  for (let i = 0; i < mist; i++) {
    cone(host, axis, 0.9, 1.3);
    const speed = rng.range(0.8, 3.6) * (0.6 + scale * 0.4);
    d.reset();
    d.px = at.x;
    d.py = at.y;
    d.pz = at.z;
    d.seed = rng.next() * 64;
    d.velocity(_dir.x * speed, _dir.y * speed + 0.4, _dir.z * speed)
      // Thin. The dust batch has a strong forward lobe, so backlit mist is
      // already several times brighter than its albedo suggests; at the alpha
      // this used to carry, a lethal hit with the sun behind it produced a
      // glowing orange cloud the size of the body.
      .colors(0.5, 0.085, 0.075, rng.range(0.16, 0.32), 0.22, 0.045, 0.04, 0)
      .sizes(rng.range(0.035, 0.085), rng.range(0.16, 0.38) * scale, 0.5);
    d.life = rng.range(0.25, 0.6);
    d.drag = 4.5;
    d.gravity = 0.4;
    d.sprite = Sprite.SMOKE_WISP;
    d.rotation = rng.range(0, Math.PI * 2);
    d.spin = rng.range(-2, 2);
    p.spawn(Batch.DUST);
  }

  // Find something behind the wound to paint.
  const physics = host.physics;
  const decals = host.decals;
  if (physics?.raycastInto && decals) {
    _rayOrigin.copy(at).addScaledVector(_dir, 0.05);
    if (physics.raycastInto(_rayOrigin, _dir, 3.2 + 2 * scale, host.hit, NEAR_SURFACE_MASK)) {
      const size = 0.22 + 0.4 * scale;
      const tile = rng.next() < 0.5 ? DecalTile.BLOOD_SPLAT_A : DecalTile.BLOOD_SPLAT_B;
      const o = decalOpts(tile, size);
      o.depth = Math.max(0.14, size * 0.5);
      o.opacity = 0.95;
      o.rotation = rng.range(0, Math.PI * 2);
      o.normalStrength = 0.55;
      o.glossScale = 1.5;
      o.angleMin = 0.1;
      o.fadeIn = 0.14;
      o.growTo = size * 1.35;
      decals.place(host.hit.point, host.hit.normal, o);
    }
  }
}

/* ---------------------------- foliage / fabric ------------------------------- */

function foliage(host: FXHost, energy: number, ground: number): void {
  const p = host.particles;
  const d = p.desc;
  const rng = host.rng;

  const leaves = p.count(4 + Math.round(8 * energy));
  for (let i = 0; i < leaves; i++) {
    cone(host, _normal, 1.4, 0.6);
    const speed = rng.range(1, 4.5);
    const tone = rng.range(0.6, 1.2);
    seed(d, host, 0.03)
      .velocity(_dir.x * speed, _dir.y * speed + rng.range(0, 1.2), _dir.z * speed)
      .colors(0.1 * tone, 0.2 * tone, 0.06 * tone, 1, 0.08 * tone, 0.13 * tone, 0.04 * tone, 1)
      .sizes(rng.range(0.03, 0.075), rng.range(0.03, 0.07), 1);
    d.life = rng.range(1.4, 3);
    // Leaves flutter: heavy drag plus turbulence rather than a ballistic arc.
    d.drag = rng.range(2.5, 4.5);
    d.gravity = 1;
    d.sprite = Sprite.LEAF;
    d.turbulence = 0.5;
    d.groundY = ground;
    d.rotation = rng.range(0, Math.PI * 2);
    d.spin = rng.range(-8, 8);
    p.spawn(Batch.CHUNK);
  }
  host.sound('impact_foliage', _point, 0.4 + 0.3 * energy, rng.range(0.9, 1.15));
}

function fabric(host: FXHost, energy: number, ground: number): void {
  const p = host.particles;
  const d = p.desc;
  const rng = host.rng;

  const fibres = p.count(3 + Math.round(6 * energy));
  for (let i = 0; i < fibres; i++) {
    cone(host, _normal, 1.1, 0.7);
    const speed = rng.range(0.8, 3.5);
    const tone = rng.range(0.55, 0.9);
    seed(d, host, 0.02)
      .velocity(_dir.x * speed, _dir.y * speed + 0.4, _dir.z * speed)
      .colors(tone * 0.6, tone * 0.55, tone * 0.45, 1, tone * 0.4, tone * 0.36, tone * 0.3, 0.6)
      .sizes(rng.range(0.012, 0.03), rng.range(0.01, 0.024), 1);
    d.life = rng.range(1, 2.2);
    d.drag = 3.2;
    d.gravity = 1;
    d.sprite = Sprite.SPLINTER;
    d.turbulence = 0.3;
    d.groundY = ground;
    d.spin = rng.range(-10, 10);
    p.spawn(Batch.CHUNK);
  }

  const dust = p.count(2 + Math.round(4 * energy));
  for (let i = 0; i < dust; i++) {
    cone(host, _normal, 1.2, 1.5);
    const speed = rng.range(0.5, 2);
    seed(d, host, 0.03)
      .velocity(_dir.x * speed, _dir.y * speed + 0.3, _dir.z * speed)
      .colors(0.55, 0.5, 0.42, rng.range(0.25, 0.45), 0.38, 0.35, 0.3, 0)
      .sizes(0.05, rng.range(0.2, 0.42), 0.5);
    d.life = rng.range(0.5, 1.1);
    d.drag = 4;
    d.gravity = 0.05;
    d.sprite = Sprite.DUST;
    p.spawn(Batch.DUST);
  }
  host.sound('impact_fabric', _point, 0.4 + 0.3 * energy, rng.range(0.9, 1.12));
}

function rubbery(host: FXHost, energy: number, ground: number): void {
  const p = host.particles;
  const d = p.desc;
  const rng = host.rng;
  const bits = p.count(3 + Math.round(6 * energy));
  for (let i = 0; i < bits; i++) {
    cone(host, _normal, 0.9, 0.8);
    const speed = rng.range(1.5, 5);
    seed(d, host, 0.02)
      .velocity(_dir.x * speed, _dir.y * speed + 0.8, _dir.z * speed)
      .colors(0.045, 0.045, 0.05, 1, 0.03, 0.03, 0.035, 1)
      .sizes(rng.range(0.015, 0.04), rng.range(0.012, 0.032), 1);
    d.life = rng.range(0.7, 1.5);
    d.drag = 1.4;
    d.gravity = 1;
    d.sprite = Sprite.CHIP;
    d.groundY = ground;
    d.spin = rng.range(-12, 12);
    p.spawn(Batch.CHUNK);
  }
  host.sound('impact_rubber', _point, 0.45 + 0.3 * energy, rng.range(0.88, 1.1));
}

/* --------------------------------- decals ------------------------------------ */

function placeBulletDecal(host: FXHost, evt: ImpactEvent, energy: number): void {
  const decals = host.decals;
  if (!decals) return;
  // Flesh takes no hole; the spray already painted whatever was behind it.
  if (evt.surface === 'flesh' || evt.surface === 'water') return;

  _decalNormal.copy(_normal);
  const rng = host.rng;
  // Larger than the hole a 5.56 actually punches. Every shooter does this and
  // it is not laziness: at any sane engagement distance a true-scale hole is
  // two pixels of slightly darker wall, so the player gets no feedback on where
  // their rounds are landing. The spall ring around a real hole is about this
  // wide anyway, which is the excuse.
  const size = (0.135 + 0.105 * Math.min(1, energy)) * rng.range(0.85, 1.2);
  decals.add(_point, _decalNormal, size, 'bullet', evt.surface);
}
