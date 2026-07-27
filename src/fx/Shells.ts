import * as THREE from 'three';
import type { RigidBodyHandle } from '../core/Contracts';
import { rng } from '../core/MathUtils';
import type { EngineContext } from '../core/System';
import type { FXDeps } from './Shared';

interface CaseSpec {
  /** Case length and base radius in metres. */
  length: number;
  radius: number;
  /** Bottleneck rifle case, straight-walled pistol case, or a plastic hull. */
  profile: 'rifle' | 'pistol' | 'hull';
}

/**
 * Real case dimensions. Brass is small — a 5.56 case is 45 mm — and getting the
 * scale right is most of what makes ejected brass read as brass rather than as
 * generic gold confetti.
 */
const CASES: Record<string, CaseSpec> = {
  '5.56x45': { length: 0.045, radius: 0.0048, profile: 'rifle' },
  '5.45x39': { length: 0.04, radius: 0.0049, profile: 'rifle' },
  '7.62x51': { length: 0.051, radius: 0.0062, profile: 'rifle' },
  '.338 LM': { length: 0.063, radius: 0.0071, profile: 'rifle' },
  '9x19': { length: 0.019, radius: 0.0048, profile: 'pistol' },
  '.45 ACP': { length: 0.023, radius: 0.0059, profile: 'pistol' },
  '.44 MAG': { length: 0.033, radius: 0.0057, profile: 'pistol' },
  '12 gauge': { length: 0.07, radius: 0.0093, profile: 'hull' },
};

const NO_CASE = /blade|mm|rocket|grenade/i;
const DEFAULT_CASE: CaseSpec = { length: 0.045, radius: 0.005, profile: 'rifle' };

/**
 * Constraints on viewmodel brass, in view space where -Z is down the sights.
 *
 * A case is only 45 mm long, so it has to be close to the camera to be seen at
 * all — and close to the camera is also where it becomes a golden bar across the
 * screen. These two numbers keep it in the narrow band that works: drifting
 * forward rather than at the lens, and gone before it can reach the eye.
 */
const VIEW_EJECT_MAX_Z = -0.35;
const VIEW_EJECT_MIN_DEPTH = 0.2;

/** Cap on scheduled landings; beyond this the room is loud enough already. */
const MAX_PENDING_LANDINGS = 24;

class Landing {
  time = 0;
  x = 0;
  y = 0;
  z = 0;
  pitch = 1;
}

class Shell {
  active = false;
  view = false;
  mesh!: THREE.Mesh;
  body: RigidBodyHandle | null = null;
  readonly velocity = new THREE.Vector3();
  readonly spin = new THREE.Vector3();
  readonly spinQuat = new THREE.Quaternion();
  age = 0;
  life = 1;
  groundY = -Infinity;
  bounces = 0;
  scale = 1;
}

/**
 * Ejected brass.
 *
 * Each case is a lathed shell — base, extractor rim, a taper into the neck —
 * in a polished brass standard material, so it picks up the sun and the
 * environment map and glints as it tumbles. World brass is handed to Rapier as a
 * real rigid body so it bounces off the floor and comes to rest; the brass you
 * see out of your own weapon lives in the viewmodel scene, which is camera
 * space and therefore has no physics world, so it is integrated here against
 * gravity rotated into view space.
 */
export class ShellEjector {
  private ctx!: EngineContext;
  private readonly shells: Shell[] = [];
  /**
   * Landings scheduled at ejection time, played when their moment arrives.
   * Preallocated: at a 700 rpm cyclic rate a fresh record per shot would be a
   * dozen short-lived objects a second for the whole match.
   */
  private readonly pending: Landing[] = [];
  private pendingCount = 0;
  private readonly geometries = new Map<string, THREE.BufferGeometry>();
  private readonly brass = new THREE.MeshStandardMaterial({
    name: 'fx:brass',
    // Cartridge brass, not gold: a touch green, and rough enough from handling
    // that it reads as a glint travelling over the case rather than a mirror.
    color: 0x9c7833,
    metalness: 0.82,
    roughness: 0.36,
  });
  private readonly hull = new THREE.MeshStandardMaterial({
    name: 'fx:shotgunHull',
    color: 0x8f2018,
    metalness: 0.1,
    roughness: 0.55,
  });

  private capacity = 16;
  private physicsCap = 6;
  private physicsLive = 0;

  private readonly worldRoot = new THREE.Group();
  private readonly viewRoot = new THREE.Group();
  private readonly gravity = new THREE.Vector3(0, -1, 0);
  private readonly tmpQuat = new THREE.Quaternion();
  private readonly tmpVec = new THREE.Vector3();
  private readonly tmpVec2 = new THREE.Vector3();
  private readonly rayOptions = { maxDistance: 3.5 };
  private readonly down = new THREE.Vector3(0, -1, 0);

  constructor(private readonly deps: FXDeps) {}

  init(ctx: EngineContext): void {
    this.ctx = ctx;
    const tier = ctx.config.tier;
    this.capacity = tier === 'low' ? 6 : tier === 'medium' ? 12 : 18;
    this.physicsCap = tier === 'low' ? 0 : tier === 'medium' ? 4 : 6;

    this.worldRoot.name = 'fx:shells';
    this.worldRoot.matrixAutoUpdate = false;
    this.viewRoot.name = 'fx:viewShells';
    this.viewRoot.matrixAutoUpdate = false;
    ctx.scene.add(this.worldRoot);
    ctx.viewScene.add(this.viewRoot);
  }

  get roots(): readonly THREE.Object3D[] {
    return [this.worldRoot, this.viewRoot];
  }

  get liveCount(): number {
    let n = 0;
    for (const s of this.shells) if (s.active) n++;
    return n;
  }

  get drawCalls(): number {
    return this.liveCount;
  }

  eject(
    position: THREE.Vector3,
    velocity: THREE.Vector3,
    caliber: string,
    inViewmodelScene: boolean,
  ): void {
    if (NO_CASE.test(caliber) && !CASES[caliber]) return;
    const spec = CASES[caliber] ?? DEFAULT_CASE;
    const shell = this.acquire();
    if (!shell) return;

    const geometry = this.geometryFor(spec);

    if (!shell.mesh) {
      shell.mesh = new THREE.Mesh(geometry, spec.profile === 'hull' ? this.hull : this.brass);
      shell.mesh.castShadow = false;
      shell.mesh.receiveShadow = false;
    } else {
      shell.mesh.geometry = geometry;
      shell.mesh.material = spec.profile === 'hull' ? this.hull : this.brass;
    }

    const mesh = shell.mesh;
    mesh.position.copy(position);
    mesh.quaternion.set(rng.range(-1, 1), rng.range(-1, 1), rng.range(-1, 1), rng.range(-1, 1));
    mesh.quaternion.normalize();
    mesh.scale.setScalar(1);
    mesh.visible = true;
    mesh.matrixAutoUpdate = true;

    shell.active = true;
    shell.view = inViewmodelScene;
    shell.age = 0;
    shell.bounces = 0;
    shell.scale = 1;
    shell.velocity.copy(velocity);
    // Brass leaves the ejection port spinning hard about its short axes.
    shell.spin.set(rng.range(-26, 26), rng.range(-12, 12), rng.range(-26, 26));
    shell.body = null;
    shell.groundY = -Infinity;

    if (inViewmodelScene) {
      // Off the edge of the frame in well under a second.
      shell.life = 0.55;
      // The ejection port is ahead of the shooter's eye and real brass is thrown
      // out and slightly *back*, which in view space means straight at the lens.
      // Left alone, a 45 mm case drifts to within a hand's width of the near
      // plane and fills the screen with a brass wall. Biasing the case forward
      // keeps it clear of the camera while it exits to the side, which is what
      // it visibly does in every shipped first-person view.
      if (shell.velocity.z > VIEW_EJECT_MAX_Z) shell.velocity.z = VIEW_EJECT_MAX_Z;
      this.viewRoot.add(mesh);
      // The case itself lives in camera space, but the floor it lands on does
      // not, so the ping is scheduled from where the port actually is in the
      // world. Your own brass ringing off the concrete beside you is half of
      // what makes a weapon feel like it is in a room.
      this.tmpVec.copy(position).applyMatrix4(this.ctx.camera.matrixWorld);
      this.tmpVec2.copy(shell.velocity).transformDirection(this.ctx.camera.matrixWorld);
      this.scheduleImpactSound(this.tmpVec, this.tmpVec2, spec);
      return;
    }

    shell.life = 7;
    this.worldRoot.add(mesh);

    const physics = this.deps.physics;
    if (physics && physics.ready && this.physicsLive < this.physicsCap) {
      mesh.updateWorldMatrix(true, false);
      this.tmpVec.set(spec.radius, spec.length * 0.5, spec.radius);
      shell.body = physics.createRigidBody(
        mesh,
        { kind: 'box', halfExtents: this.tmpVec },
        {
          // A brass case is a few grams; Rapier is happier with a floor on that.
          mass: 0.02,
          restitution: 0.42,
          friction: 0.45,
          userData: { kind: 'debris' },
        },
      );
      shell.body.setVelocity(velocity);
      this.tmpVec.copy(shell.spin).multiplyScalar(2e-5);
      shell.body.applyTorqueImpulse(this.tmpVec);
      this.physicsLive++;
    } else {
      shell.groundY = this.probeGround(position);
    }

    this.scheduleImpactSound(position, velocity, spec);
  }

  /**
   * Brass hits the floor a beat after it leaves the gun, and the ping is what
   * makes the room feel real. The flight is ballistic and known at ejection
   * time, so the landing is timed analytically rather than waiting on a contact
   * callback that Rapier is not wired to deliver.
   */
  private scheduleImpactSound(
    position: THREE.Vector3,
    velocity: THREE.Vector3,
    spec: CaseSpec,
  ): void {
    const groundY = this.probeGround(position);
    if (!Number.isFinite(groundY)) return;
    const drop = position.y - groundY;
    if (drop <= 0.02) return;
    const g = 9.81;
    const t = (velocity.y + Math.sqrt(Math.max(0, velocity.y * velocity.y + 2 * g * drop))) / g;

    if (this.pendingCount >= MAX_PENDING_LANDINGS) return;
    let landing = this.pending[this.pendingCount];
    if (!landing) {
      landing = new Landing();
      this.pending.push(landing);
    }
    this.pendingCount++;
    landing.time = this.deps.now + t;
    landing.x = position.x + velocity.x * t;
    landing.y = groundY;
    landing.z = position.z + velocity.z * t;
    landing.pitch = spec.profile === 'hull' ? 0.7 : 1.6 - spec.length * 6;
  }

  private probeGround(position: THREE.Vector3): number {
    const world = this.deps.world;
    if (world) {
      const y = world.sampleGround(position.x, position.z);
      if (y !== null && position.y - y < 4) return y;
    }
    const physics = this.deps.physics;
    if (physics && physics.ready) {
      const hit = physics.raycast(position, this.down, this.rayOptions);
      if (hit) return hit.point.y;
    }
    return -Infinity;
  }

  update(dt: number): void {
    if (dt <= 0) return;
    const now = this.deps.now;

    for (let i = this.pendingCount - 1; i >= 0; i--) {
      const p = this.pending[i];
      if (p.time > now) continue;
      this.tmpVec.set(p.x, p.y, p.z);
      this.deps.play('shell_bounce', this.tmpVec, 0.4, p.pitch * rng.range(0.94, 1.07));
      // Swap the tail down into the hole; order does not matter here.
      const last = --this.pendingCount;
      if (i !== last) {
        const tail = this.pending[last];
        this.pending[last] = p;
        this.pending[i] = tail;
      }
    }

    // View space is camera space, so world gravity has to be rotated into it.
    this.ctx.camera.getWorldQuaternion(this.tmpQuat).invert();
    this.gravity.set(0, -1, 0).applyQuaternion(this.tmpQuat);

    for (const shell of this.shells) {
      if (!shell.active) continue;
      shell.age += dt;
      if (shell.age >= shell.life) {
        this.retire(shell);
        continue;
      }

      // Physics owns the transform of a registered body; touching it fights the
      // interpolator.
      if (!shell.body) this.integrate(shell, dt);

      // Shrink out over the last stretch rather than vanishing mid-frame.
      const remaining = shell.life - shell.age;
      if (remaining < 0.35) {
        shell.mesh.scale.setScalar(shell.scale * Math.max(0.02, remaining / 0.35));
      }
    }
  }

  private integrate(shell: Shell, dt: number): void {
    const mesh = shell.mesh;
    const v = shell.velocity;
    const g = shell.view ? this.gravity : this.down;
    v.addScaledVector(g, 9.81 * dt);
    const drag = 1 - Math.min(0.5, 0.6 * dt);
    v.multiplyScalar(drag);
    mesh.position.addScaledVector(v, dt);

    // Tumble: small-angle rotation applied in the body's own frame.
    this.tmpVec.copy(shell.spin).multiplyScalar(dt * 0.5);
    shell.spinQuat.set(this.tmpVec.x, this.tmpVec.y, this.tmpVec.z, 1).normalize();
    mesh.quaternion.multiply(shell.spinQuat);

    // Last line of defence for viewmodel brass: whatever velocity the weapon
    // asked for, a case that has crossed into the near-plane region is retired
    // rather than shown a few centimetres from the eye.
    if (shell.view && mesh.position.z > -VIEW_EJECT_MIN_DEPTH) {
      this.retire(shell);
      return;
    }

    if (!shell.view && mesh.position.y <= shell.groundY + 0.004) {
      mesh.position.y = shell.groundY + 0.004;
      if (Math.abs(v.y) < 0.25 || shell.bounces > 3) {
        v.set(0, 0, 0);
        shell.spin.multiplyScalar(0.2);
      } else {
        shell.bounces++;
        v.y = Math.abs(v.y) * 0.4;
        v.x *= 0.68;
        v.z *= 0.68;
        shell.spin.multiplyScalar(0.55);
      }
    }
  }

  private retire(shell: Shell): void {
    shell.active = false;
    if (shell.body) {
      shell.body.destroy();
      shell.body = null;
      this.physicsLive = Math.max(0, this.physicsLive - 1);
    }
    shell.mesh.visible = false;
    shell.mesh.removeFromParent();
  }

  private acquire(): Shell | null {
    for (const s of this.shells) if (!s.active) return s;
    if (this.shells.length < this.capacity) {
      const s = new Shell();
      this.shells.push(s);
      return s;
    }
    // Saturated: the oldest case is the one furthest from the action.
    let oldest = this.shells[0];
    for (const s of this.shells) if (s.age > oldest.age) oldest = s;
    this.retire(oldest);
    return oldest;
  }

  /**
   * A lathed case profile: base, extractor rim, body, and either a bottleneck
   * shoulder for rifle brass or a straight wall for pistol brass. The mouth is
   * domed over — at 5 mm across, an open case reads as a hole, not as depth.
   *
   * The profile must stay monotonic in y. A lathe derives its normals from the
   * direction of travel along the profile, so a mouth that folds back down to
   * the axis inverts the cap and the case renders as an open pipe with its
   * interior showing through.
   */
  private geometryFor(spec: CaseSpec): THREE.BufferGeometry {
    const key = `${spec.profile}:${spec.length}:${spec.radius}`;
    const cached = this.geometries.get(key);
    if (cached) return cached;

    const l = spec.length;
    const r = spec.radius;
    const points: THREE.Vector2[] = [];
    points.push(new THREE.Vector2(0, 0));
    points.push(new THREE.Vector2(r * 0.88, l * 0.004));
    points.push(new THREE.Vector2(r * 1.1, l * 0.03));
    points.push(new THREE.Vector2(r * 0.97, l * 0.075));
    if (spec.profile === 'rifle') {
      points.push(new THREE.Vector2(r, l * 0.58));
      points.push(new THREE.Vector2(r * 0.82, l * 0.76));
      points.push(new THREE.Vector2(r * 0.66, l * 0.87));
      points.push(new THREE.Vector2(r * 0.64, l * 0.95));
    } else if (spec.profile === 'pistol') {
      points.push(new THREE.Vector2(r, l * 0.65));
      points.push(new THREE.Vector2(r * 0.98, l * 0.95));
    } else {
      points.push(new THREE.Vector2(r * 1.02, l * 0.22));
      points.push(new THREE.Vector2(r, l * 0.9));
      points.push(new THREE.Vector2(r * 0.94, l * 0.95));
    }
    // Dome the mouth shut, radius shrinking while y keeps climbing.
    const mouth = points[points.length - 1].x;
    points.push(new THREE.Vector2(mouth * 0.78, l * 0.978));
    points.push(new THREE.Vector2(mouth * 0.44, l * 0.995));
    points.push(new THREE.Vector2(0, l));

    const geometry = new THREE.LatheGeometry(points, 12);
    // Spin about the centre of mass, not about the base.
    geometry.translate(0, -l * 0.5, 0);
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
    this.geometries.set(key, geometry);
    return geometry;
  }

  clear(): void {
    for (const s of this.shells) if (s.active) this.retire(s);
    this.pendingCount = 0;
    this.physicsLive = 0;
  }

  dispose(): void {
    this.clear();
    for (const g of this.geometries.values()) g.dispose();
    this.geometries.clear();
    this.brass.dispose();
    this.hull.dispose();
    this.worldRoot.removeFromParent();
    this.viewRoot.removeFromParent();
  }
}
