import * as THREE from 'three';
import { Effects } from '../game/effects';
import { IslandField } from '../world/islands';
import { Ocean } from '../world/ocean';
import { Ship } from './ship';

export type ProjectileKind = 'cannonball' | 'bullet';

interface Projectile {
  active: boolean;
  kind: ProjectileKind;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  /** The ship that fired it, so a broadside cannot hit its own hull. */
  source: Ship | null;
  friendly: boolean;
  power: number;
  mesh: THREE.Mesh | null;
}

export interface ProjectileContext {
  ships: Ship[];
  ocean: Ocean;
  islands: IslandField;
  effects: Effects;
  /** Hittable characters: skeletons and the player. */
  targets: {
    position: THREE.Vector3;
    radius: number;
    height: number;
    friendly: boolean;
    hit: (damage: number, point: THREE.Vector3) => void;
  }[];
  onShipHit: (ship: Ship, point: THREE.Vector3, power: number, friendly: boolean) => void;
  onSound: (kind: 'splash' | 'wood' | 'ground', point: THREE.Vector3) => void;
}

const GRAVITY = 9.2;
const MAX_PROJECTILES = 48;

/**
 * Pooled cannonballs and pistol shots. Cannonballs arc under gravity and punch
 * holes in hulls; bullets are fast and only hurt people.
 */
export class Projectiles {
  private pool: Projectile[] = [];
  private ballGeometry = new THREE.SphereGeometry(0.16, 10, 8);
  private bulletGeometry = new THREE.SphereGeometry(0.05, 6, 5);
  private ballMaterial = new THREE.MeshStandardMaterial({ color: 0x2a2a2c, roughness: 0.6, metalness: 0.4 });
  private bulletMaterial = new THREE.MeshBasicMaterial({ color: 0xffd9a0 });
  private group = new THREE.Group();
  private scratch = new THREE.Vector3();

  constructor(scene: THREE.Scene) {
    this.group.name = 'projectiles';
    scene.add(this.group);
    for (let i = 0; i < MAX_PROJECTILES; i++) {
      this.pool.push({
        active: false,
        kind: 'cannonball',
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        life: 0,
        source: null,
        friendly: true,
        power: 1,
        mesh: null,
      });
    }
  }

  get activeCount(): number {
    return this.pool.reduce((n, p) => n + (p.active ? 1 : 0), 0);
  }

  fire(options: {
    kind: ProjectileKind;
    position: THREE.Vector3;
    velocity: THREE.Vector3;
    source?: Ship | null;
    friendly?: boolean;
    power?: number;
  }): void {
    const slot = this.pool.find((p) => !p.active);
    if (!slot) return;

    slot.active = true;
    slot.kind = options.kind;
    slot.position.copy(options.position);
    slot.velocity.copy(options.velocity);
    slot.life = options.kind === 'cannonball' ? 9 : 2.2;
    slot.source = options.source ?? null;
    slot.friendly = options.friendly ?? true;
    slot.power = options.power ?? 1;

    if (!slot.mesh) {
      slot.mesh = new THREE.Mesh(
        options.kind === 'cannonball' ? this.ballGeometry : this.bulletGeometry,
        options.kind === 'cannonball' ? this.ballMaterial : this.bulletMaterial,
      );
      slot.mesh.castShadow = options.kind === 'cannonball';
      this.group.add(slot.mesh);
    } else {
      slot.mesh.geometry = options.kind === 'cannonball' ? this.ballGeometry : this.bulletGeometry;
      slot.mesh.material = options.kind === 'cannonball' ? this.ballMaterial : this.bulletMaterial;
    }
    slot.mesh.visible = true;
    slot.mesh.position.copy(slot.position);
  }

  update(dt: number, ctx: ProjectileContext): void {
    for (const p of this.pool) {
      if (!p.active) continue;

      p.life -= dt;
      if (p.kind === 'cannonball') p.velocity.y -= GRAVITY * dt;
      // Substep so fast shots cannot tunnel through a hull.
      const steps = Math.min(4, 1 + Math.floor(p.velocity.length() * dt / 1.2));
      const stepDt = dt / steps;
      let consumed = false;

      for (let s = 0; s < steps && !consumed; s++) {
        this.scratch.copy(p.position).addScaledVector(p.velocity, stepDt);
        p.position.copy(this.scratch);

        // People.
        for (const target of ctx.targets) {
          if (target.friendly === p.friendly) continue;
          const dx = p.position.x - target.position.x;
          const dz = p.position.z - target.position.z;
          const dy = p.position.y - (target.position.y + target.height * 0.5);
          if (dx * dx + dz * dz < target.radius * target.radius && Math.abs(dy) < target.height * 0.6) {
            target.hit(p.kind === 'cannonball' ? 100 : 34 * p.power, p.position.clone());
            ctx.effects.burst('blood', p.position, 8, { speed: 3 });
            consumed = true;
            break;
          }
        }
        if (consumed) break;

        // Hulls.
        for (const ship of ctx.ships) {
          if (ship.destroyed) continue;
          if (ship === p.source && p.life > 8.6) continue;
          if (!ship.intersectsPoint(p.position, 0.1)) continue;
          if (p.kind === 'cannonball') {
            ctx.onShipHit(ship, p.position.clone(), p.power, p.friendly);
            ctx.effects.burst('debris', p.position, 14, { speed: 6 });
            ctx.effects.burst('smoke', p.position, 6, { speed: 1.6, scale: 0.7 });
          } else {
            ctx.effects.burst('debris', p.position, 4, { speed: 3, scale: 0.6 });
          }
          ctx.onSound('wood', p.position.clone());
          consumed = true;
          break;
        }
        if (consumed) break;

        // Terrain.
        const terrain = ctx.islands.heightAt(p.position.x, p.position.z);
        if (p.position.y <= terrain) {
          ctx.effects.burst('sand', p.position, 16, { speed: 4.5, direction: new THREE.Vector3(0, 1, 0), spread: 0.8 });
          ctx.onSound('ground', p.position.clone());
          consumed = true;
          break;
        }

        // Water.
        const surface = ctx.ocean.waterHeight(p.position.x, p.position.z);
        if (p.position.y <= surface) {
          ctx.effects.burst('splash', p.position.clone().setY(surface), p.kind === 'cannonball' ? 22 : 6, {
            speed: p.kind === 'cannonball' ? 6 : 2.5,
            direction: new THREE.Vector3(0, 1, 0),
            spread: 0.7,
          });
          ctx.onSound('splash', p.position.clone().setY(surface));
          consumed = true;
          break;
        }
      }

      if (consumed || p.life <= 0) {
        p.active = false;
        if (p.mesh) p.mesh.visible = false;
        continue;
      }

      if (p.mesh) p.mesh.position.copy(p.position);
    }
  }

  /** Muzzle velocity for a cannon aiming at a given pitch, in m/s. */
  static cannonMuzzleSpeed(): number {
    return 62;
  }
}
