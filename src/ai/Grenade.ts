/**
 * Thrown grenades.
 *
 * A grenade is the one thing an AI can do that removes a player's cover, so it
 * has to be legible: there is an audible shout before the throw, a visible object
 * with a smoke wisp on it during the flight, and enough fuse left after it lands
 * to move. An AI grenade that arrives without warning reads as the game cheating
 * even when the throw was perfectly fair.
 *
 * Flight is integrated here rather than handed to the physics module because these
 * are short-lived, there are never more than a handful, and a dynamic rigid body
 * per grenade would evict debris from the physics budget.
 */
import * as THREE from 'three';
import type { CombatSystem, FXSystem } from '../core/Contracts';
import { COLLISION_GROUP, type Damageable } from '../core/GameTypes';
import { SFX } from './Tuning';
import type { Blackboard } from './Blackboard';

const FUSE = 2.55;
const RADIUS = 0.055;
const GRAVITY = -19.4;
const BOUNCE = 0.32;
const FRICTION = 0.66;
const BLAST_RADIUS = 5.4;
const BLAST_DAMAGE = 118;
const HIT_GROUPS = COLLISION_GROUP.STATIC | COLLISION_GROUP.DYNAMIC;

interface Live {
  active: boolean;
  fuse: number;
  owner: Damageable | null;
  mesh: THREE.Mesh;
  readonly velocity: THREE.Vector3;
  readonly position: THREE.Vector3;
  smokeTimer: number;
  resting: number;
}

export class GrenadeManager {
  private readonly items: Live[] = [];
  private geometry: THREE.SphereGeometry | null = null;
  private material: THREE.MeshStandardMaterial | null = null;
  private group: THREE.Group | null = null;
  private readonly probe = new THREE.Vector3();
  private readonly step = new THREE.Vector3();
  private readonly bounceNormal = new THREE.Vector3();

  attach(scene: THREE.Scene): void {
    if (this.group) return;
    this.group = new THREE.Group();
    this.group.name = 'ai_grenades';
    scene.add(this.group);
    // A pin body and a ribbed shell would be nicer, but a grenade in flight is
    // eight pixels across; the smoke wisp is what the player actually tracks.
    this.geometry = new THREE.SphereGeometry(RADIUS, 8, 6);
    this.material = new THREE.MeshStandardMaterial({
      color: 0x2f3b2a,
      roughness: 0.72,
      metalness: 0.25,
    });
  }

  get activeCount(): number {
    let n = 0;
    for (const item of this.items) if (item.active) n++;
    return n;
  }

  /**
   * Launches a grenade from `origin` towards `target` on a lobbed arc.
   *
   * Solves for the launch speed of a fixed-elevation throw, which is how a person
   * throws: you pick an angle that clears the obstacle and vary how hard you throw.
   */
  throwAt(
    origin: THREE.Vector3,
    target: THREE.Vector3,
    owner: Damageable | null,
    bb: Blackboard,
  ): boolean {
    if (!this.group || !this.geometry || !this.material) return false;
    const item = this.acquire();
    if (!item) return false;

    const dx = target.x - origin.x;
    const dz = target.z - origin.z;
    const flat = Math.hypot(dx, dz);
    const dy = target.y - origin.y;
    if (flat < 0.2) return false;

    // 42 degrees is a comfortable overhand lob and clears most low cover.
    const angle = flat > 16 ? 0.62 : 0.75;
    const tan = Math.tan(angle);
    const denominator = 2 * (flat * tan - dy);
    if (denominator <= 0.05) return false;
    const speed = Math.sqrt((-GRAVITY * flat * flat) / (denominator * Math.cos(angle) * Math.cos(angle)));
    if (!Number.isFinite(speed) || speed > 26) return false;

    const horizontal = speed * Math.cos(angle);
    item.position.copy(origin);
    item.velocity.set((dx / flat) * horizontal, speed * Math.sin(angle), (dz / flat) * horizontal);
    item.fuse = FUSE;
    item.owner = owner;
    item.active = true;
    item.resting = 0;
    item.smokeTimer = 0;
    item.mesh.position.copy(origin);
    item.mesh.visible = true;

    bb.play(SFX.grenadeThrow, origin, 0.8, 1);
    return true;
  }

  update(dt: number, bb: Blackboard): void {
    const physics = bb.physics;
    const combat = bb.combat;
    for (const item of this.items) {
      if (!item.active) continue;
      item.fuse -= dt;
      if (item.fuse <= 0) {
        this.detonate(item, combat, bb.fx);
        continue;
      }

      item.velocity.y += GRAVITY * dt;
      const distance = item.velocity.length() * dt;
      if (distance > 1e-4 && physics && physics.ready) {
        this.step.copy(item.velocity).normalize();
        const hit = physics.spherecast(item.position, this.step, RADIUS, {
          maxDistance: distance + 0.02,
          groups: HIT_GROUPS,
        });
        if (hit && hit.distance <= distance + 0.02) {
          // Copy immediately: the raycast records live in a ring buffer.
          this.bounceNormal.copy(hit.normal);
          this.probe.copy(hit.point).addScaledVector(this.bounceNormal, RADIUS * 1.05);
          item.position.copy(this.probe);
          const along = item.velocity.dot(this.bounceNormal);
          item.velocity.addScaledVector(this.bounceNormal, -along * (1 + BOUNCE));
          item.velocity.multiplyScalar(FRICTION);
          if (item.velocity.lengthSq() < 0.35) {
            item.resting += dt;
            item.velocity.multiplyScalar(0.3);
          }
          bb.play(SFX.grenadePin, item.position, 0.35, 1.4);
        } else {
          item.position.addScaledVector(item.velocity, dt);
        }
      } else {
        item.position.addScaledVector(item.velocity, dt);
      }

      item.mesh.position.copy(item.position);
      item.mesh.rotation.x += dt * 9;
      item.mesh.rotation.z += dt * 7;

      item.smokeTimer -= dt;
      if (item.smokeTimer <= 0 && bb.fx) {
        item.smokeTimer = 0.09;
        bb.fx.smoke(item.position, 0.18, 0.8, 0xb9b4a8);
      }
    }
  }

  private detonate(item: Live, combat: CombatSystem | null, fx: FXSystem | null): void {
    item.active = false;
    item.mesh.visible = false;
    if (combat) {
      combat.explode({
        position: item.position,
        radius: BLAST_RADIUS,
        damage: BLAST_DAMAGE,
        falloff: 'quadratic',
        source: item.owner,
        kind: 'grenade',
        impulse: 620,
        screenShake: 0.55,
      });
    } else {
      fx?.explosion(item.position, BLAST_RADIUS, 'grenade');
    }
    item.owner = null;
  }

  private acquire(): Live | null {
    for (const item of this.items) if (!item.active) return item;
    if (this.items.length >= 8 || !this.geometry || !this.material || !this.group) return null;
    const mesh = new THREE.Mesh(this.geometry, this.material);
    mesh.castShadow = false;
    mesh.frustumCulled = false;
    mesh.visible = false;
    this.group.add(mesh);
    const item: Live = {
      active: false,
      fuse: 0,
      owner: null,
      mesh,
      velocity: new THREE.Vector3(),
      position: new THREE.Vector3(),
      smokeTimer: 0,
      resting: 0,
    };
    this.items.push(item);
    return item;
  }

  /** Physics may not have been up when a grenade was requested; nothing leaks. */
  clear(): void {
    for (const item of this.items) {
      item.active = false;
      item.owner = null;
      item.mesh.visible = false;
    }
  }

  dispose(): void {
    this.clear();
    this.group?.removeFromParent();
    this.geometry?.dispose();
    this.material?.dispose();
    this.items.length = 0;
    this.group = null;
    this.geometry = null;
    this.material = null;
  }
}
