import * as THREE from 'three';
import { angleDelta, clamp, clamp01, Rng, TAU } from '../core/math';
import { Environment } from '../world/environment';
import { IslandField } from '../world/islands';
import { Ocean } from '../world/ocean';
import { Ship } from '../ship/ship';
import { Projectiles } from '../ship/projectiles';

export type FleetState = 'patrol' | 'approach' | 'broadside' | 'flee' | 'sinking';

export interface SkeletonShipContext {
  env: Environment;
  ocean: Ocean;
  islands: IslandField;
  target: Ship | null;
  projectiles: Projectiles;
  onCannonFire: (position: THREE.Vector3) => void;
}

/** Ideal distance to hold while trading broadsides. */
const ENGAGE_RANGE = 74;
const AGGRO_RANGE = 300;

/**
 * A skeleton crew's sloop. It sails itself: sets and trims its sails for the
 * wind, works its way to a broadside position, and fires when its guns line up.
 */
export class SkeletonShip {
  readonly ship: Ship;
  state: FleetState = 'patrol';

  private rng: Rng;
  private patrolTarget = new THREE.Vector3();
  private patrolTimer = 0;
  private fireTimer = 2;
  private reloadTimer = 0;
  private volleySide: -1 | 1 = 1;
  private shotsLeftInVolley = 0;
  private aimJitter = 0;

  constructor(x: number, z: number, seed: number) {
    this.rng = new Rng(seed);
    this.ship = new Ship({
      name: this.rng.pick(['The Rotting Grin', 'Bonecutter', 'The Drowned Oath', 'Marrow Wake']),
      sailColor: 0x4c6b46,
      hullColor: 0x3f3428,
      trimColor: 0x2f3a2c,
      emblem: 'skull',
      ghostly: true,
    });
    this.ship.place(x, z, this.rng.float(0, TAU));
    this.ship.sailAmount = 0.8;
    this.ship.anchorUp = true;
    this.ship.anchorRaise = 1;
    this.pickPatrolTarget();
  }

  get position(): THREE.Vector3 {
    return this.ship.position;
  }

  private pickPatrolTarget(): void {
    const angle = this.rng.float(0, TAU);
    const radius = this.rng.float(300, 900);
    this.patrolTarget.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
    this.patrolTimer = this.rng.float(40, 90);
  }

  update(dt: number, ctx: SkeletonShipContext): void {
    const ship = this.ship;
    if (ship.destroyed) return;

    if (ship.sinking) {
      this.state = 'sinking';
      ship.update(dt, ctx.env, ctx.ocean, ctx.islands);
      return;
    }

    const target = ctx.target;
    const distance = target ? ship.distanceTo(target.position) : Infinity;

    if (target && !target.destroyed && distance < AGGRO_RANGE) {
      this.state = distance > ENGAGE_RANGE * 1.6 ? 'approach' : 'broadside';
    } else {
      this.state = 'patrol';
    }

    switch (this.state) {
      case 'patrol':
        this.updatePatrol(dt, ctx);
        break;
      case 'approach':
        this.steerTo(target!.position, dt);
        ship.sailAmount = 1;
        break;
      case 'broadside':
        this.updateBroadside(dt, ctx, target!, distance);
        break;
      default:
        break;
    }

    // Skeletons are excellent sail trimmers.
    ship.autoTrim(ctx.env, dt * 2.2);
    this.avoidLand(dt, ctx);
    ship.update(dt, ctx.env, ctx.ocean, ctx.islands);
  }

  private updatePatrol(dt: number, ctx: SkeletonShipContext): void {
    this.patrolTimer -= dt;
    const arrived = this.ship.distanceTo(this.patrolTarget) < 90;
    if (arrived || this.patrolTimer <= 0) this.pickPatrolTarget();
    this.steerTo(this.patrolTarget, dt);
    this.ship.sailAmount = 0.75;
    void ctx;
  }

  /**
   * Circles the target at cannon range, keeping the hull side-on so the guns
   * bear, and fires a rolling volley whenever the aim is good.
   */
  private updateBroadside(dt: number, ctx: SkeletonShipContext, target: Ship, distance: number): void {
    const ship = this.ship;
    const toTarget = Math.atan2(target.position.z - ship.position.z, target.position.x - ship.position.x);

    // Hold station off the target's beam: aim for a heading tangent to the circle.
    const closing = distance > ENGAGE_RANGE ? 1 : distance < ENGAGE_RANGE * 0.6 ? -1 : 0;
    const tangent = toTarget + (this.volleySide > 0 ? Math.PI / 2 : -Math.PI / 2);
    const desired = tangent - closing * 0.55 * this.volleySide;
    const delta = angleDelta(ship.heading, desired);
    ship.helmInput = clamp(-delta * 1.4, -1, 1);
    ship.sailAmount = distance > ENGAGE_RANGE * 1.2 ? 1 : 0.65;

    // Fire when the target sits within the arc of the loaded side.
    const relative = angleDelta(ship.heading, toTarget);
    const broadsideError = Math.abs(Math.abs(relative) - Math.PI / 2);
    this.fireTimer -= dt;
    this.reloadTimer -= dt;

    if (this.shotsLeftInVolley > 0 && this.reloadTimer <= 0) {
      this.fireCannon(ctx, target, relative > 0 ? 1 : -1);
      this.shotsLeftInVolley--;
      this.reloadTimer = 0.45;
    } else if (
      this.shotsLeftInVolley <= 0 &&
      this.fireTimer <= 0 &&
      broadsideError < 0.5 &&
      distance < 130
    ) {
      this.shotsLeftInVolley = 2;
      this.fireTimer = this.rng.float(4.5, 8);
      this.aimJitter = this.rng.float(-0.035, 0.035);
      this.volleySide = relative > 0 ? 1 : -1;
    }
  }

  private fireCannon(ctx: SkeletonShipContext, target: Ship, side: number): void {
    const ship = this.ship;
    const candidates = ship.model.cannons.filter((c) => c.side === (side > 0 ? 1 : -1));
    if (candidates.length === 0) return;
    const cannon = this.rng.pick(candidates);

    // Lead the target and lob the shot with a ballistic arc.
    const muzzle = cannon.muzzle.getWorldPosition(new THREE.Vector3());
    const aimPoint = target.position
      .clone()
      .addScaledVector(target.velocity, ship.distanceTo(target.position) / Projectiles.cannonMuzzleSpeed())
      .setY(target.position.y + 0.9);
    const toAim = aimPoint.clone().sub(muzzle);
    const horizontal = Math.hypot(toAim.x, toAim.z);
    const speed = Projectiles.cannonMuzzleSpeed();
    // Solve the low-arc launch angle for the required range.
    const g = 9.2;
    const disc = speed ** 4 - g * (g * horizontal * horizontal + 2 * -toAim.y * speed * speed);
    const pitch = disc > 0 ? Math.atan((speed * speed - Math.sqrt(disc)) / (g * horizontal)) : 0.08;

    const dir = new THREE.Vector3(toAim.x, 0, toAim.z).normalize();
    const velocity = dir
      .clone()
      .multiplyScalar(Math.cos(pitch + this.aimJitter))
      .add(new THREE.Vector3(0, Math.sin(pitch + this.aimJitter), 0))
      .normalize()
      .multiplyScalar(speed);

    ctx.projectiles.fire({
      kind: 'cannonball',
      position: muzzle,
      velocity,
      source: ship,
      friendly: false,
      power: 1,
    });
    ctx.onCannonFire(muzzle);

    // Point the gun where it just shot, for show.
    cannon.elevation.rotation.x = -pitch;
  }

  private steerTo(target: THREE.Vector3, dt: number): void {
    this.ship.steerTowards(target, dt);
  }

  /** Crude look-ahead so the fleet does not beach itself constantly. */
  private avoidLand(dt: number, ctx: SkeletonShipContext): void {
    const ship = this.ship;
    const ahead = ship.forward.multiplyScalar(38).add(ship.position);
    const depth = -ctx.islands.heightAt(ahead.x, ahead.z);
    if (depth < 6) {
      const port = ship.position.clone().addScaledVector(ship.forward, 26).addScaledVector(ship.starboard, -22);
      const starboard = ship.position.clone().addScaledVector(ship.forward, 26).addScaledVector(ship.starboard, 22);
      const portDepth = -ctx.islands.heightAt(port.x, port.z);
      const starboardDepth = -ctx.islands.heightAt(starboard.x, starboard.z);
      ship.helmInput = starboardDepth > portDepth ? 1 : -1;
      if (depth < 2.5) ship.sailAmount = clamp01(ship.sailAmount - dt);
    }
  }

  get sinkingOrGone(): boolean {
    return this.ship.destroyed;
  }

  dispose(): void {
    this.ship.dispose();
  }
}
