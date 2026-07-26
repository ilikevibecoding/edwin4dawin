import * as THREE from 'three';
import type { EngineContext, System } from '../core/System';
import { Signals, type HitRegion } from '../core/Signals';
import { TUNING, QUALITY } from '../core/Config';
import type { PhysicsSystem } from '../physics/Physics';
import { damageAtRange, type WeaponDef } from './WeaponDefs';

interface Projectile {
  position: THREE.Vector3;
  prevPosition: THREE.Vector3;
  velocity: THREE.Vector3;
  def: WeaponDef;
  ownerId: number;
  isPlayer: boolean;
  distance: number;
  ttl: number;
  /** Remaining penetration budget in metres of concrete-equivalent. */
  penetration: number;
  active: boolean;
  /** Index into the tracer instance buffer, or -1. */
  tracerIndex: number;
  hasTracer: boolean;
}

const SURFACE_HARDNESS: Record<string, number> = {
  concrete: 1.0,
  metal: 1.6,
  sand: 0.55,
  dirt: 0.5,
  wood: 0.28,
  glass: 0.06,
  water: 0.9,
  flesh: 0.16,
  foliage: 0.04,
  fabric: 0.22,
  rubber: 0.4,
};

/**
 * Projectile simulation.
 *
 * Rounds are simulated as real projectiles rather than hitscan: drag from the
 * ballistic coefficient, gravity drop, and a finite time of flight. At carbine
 * ranges the difference is a few centimetres, but it is what makes long shots
 * require lead and makes the supersonic crack arrive after the muzzle report
 * at distance — both things a player feels even when they cannot name them.
 *
 * Tracers are drawn as a single instanced stretched-billboard mesh so a
 * hundred rounds in flight cost one draw call.
 */
export class BallisticsSystem implements System {
  readonly name = 'ballistics';
  readonly order = 15;

  private ctx!: EngineContext;
  private physics!: PhysicsSystem;

  private readonly pool: Projectile[] = [];
  private readonly maxProjectiles = 256;

  private tracerMesh!: THREE.InstancedMesh;
  private tracerCount = 0;
  private readonly tracerMatrix = new THREE.Matrix4();
  private readonly tracerColor = new THREE.Color();

  /** Every Nth round carries a visible tracer, as with real belt loading. */
  tracerEvery = 3;
  private shotCounter = 0;

  private readonly _v1 = new THREE.Vector3();
  private readonly _v2 = new THREE.Vector3();
  private readonly _q = new THREE.Quaternion();
  private readonly _up = new THREE.Vector3(0, 1, 0);

  init(ctx: EngineContext): void {
    this.ctx = ctx;
    this.physics = ctx.get<PhysicsSystem>('physics')!;

    for (let i = 0; i < this.maxProjectiles; i++) {
      this.pool.push({
        position: new THREE.Vector3(),
        prevPosition: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        def: null as unknown as WeaponDef,
        ownerId: -1,
        isPlayer: false,
        distance: 0,
        ttl: 0,
        penetration: 0,
        active: false,
        tracerIndex: -1,
        hasTracer: false,
      });
    }

    this.buildTracerMesh(ctx);
  }

  private buildTracerMesh(ctx: EngineContext): void {
    // A quad stretched along local Z and always facing the camera. The shader
    // fades the tail and pushes the head hot so the tracer reads as a
    // burning particle rather than a coloured line.
    const geo = new THREE.PlaneGeometry(1, 1, 1, 1);
    geo.rotateY(Math.PI / 2);

    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      uniforms: {
        uCoreColor: { value: new THREE.Color(1.0, 0.72, 0.32) },
        uTipColor: { value: new THREE.Color(1.0, 0.96, 0.85) },
        uIntensity: { value: 14 },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        varying float vFade;
        attribute float aFade;
        void main() {
          vUv = uv;
          vFade = aFade;
          vec4 mv = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec2 vUv;
        varying float vFade;
        uniform vec3 uCoreColor;
        uniform vec3 uTipColor;
        uniform float uIntensity;
        void main() {
          // vUv.x runs tail -> head along the stretched quad.
          float along = vUv.x;
          float across = abs(vUv.y - 0.5) * 2.0;
          float radial = 1.0 - across;
          radial = pow(max(radial, 0.0), 2.2);
          float lengthFade = pow(along, 2.6);
          float a = radial * lengthFade * vFade;
          vec3 c = mix(uCoreColor, uTipColor, pow(along, 4.0));
          gl_FragColor = vec4(c * uIntensity * a, a);
        }
      `,
    });

    this.tracerMesh = new THREE.InstancedMesh(geo, mat, this.maxProjectiles);
    this.tracerMesh.frustumCulled = false;
    this.tracerMesh.count = 0;
    this.tracerMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    const fades = new Float32Array(this.maxProjectiles);
    geo.setAttribute('aFade', new THREE.InstancedBufferAttribute(fades, 1));
    this.tracerMesh.name = 'tracers';
    ctx.scene.add(this.tracerMesh);
  }

  fireProjectile(opts: {
    origin: THREE.Vector3;
    direction: THREE.Vector3;
    def: WeaponDef;
    ownerId: number;
    isPlayer: boolean;
  }): void {
    const p = this.pool.find((x) => !x.active);
    if (!p) return;

    p.active = true;
    p.position.copy(opts.origin);
    p.prevPosition.copy(opts.origin);
    p.velocity.copy(opts.direction).normalize().multiplyScalar(opts.def.muzzleVelocity);
    p.def = opts.def;
    p.ownerId = opts.ownerId;
    p.isPlayer = opts.isPlayer;
    p.distance = 0;
    p.ttl = 3.5;
    p.penetration = opts.def.penetration;
    p.hasTracer = this.shotCounter++ % this.tracerEvery === 0;
  }

  fixedUpdate(dt: number): void {
    for (const p of this.pool) {
      if (!p.active) continue;
      this.stepProjectile(p, dt);
    }
  }

  private stepProjectile(p: Projectile, dt: number): void {
    p.ttl -= dt;
    if (p.ttl <= 0) {
      p.active = false;
      return;
    }

    p.prevPosition.copy(p.position);

    // Drag: F = -k*v^2, with k derived from the ballistic coefficient.
    // A higher BC means a longer, heavier bullet that sheds velocity slowly.
    const speed = p.velocity.length();
    const dragK = 0.00042 / Math.max(p.def.ballisticCoefficient, 0.01);
    const drag = dragK * speed * speed;
    this._v1.copy(p.velocity).normalize().multiplyScalar(-drag * dt);
    p.velocity.add(this._v1);
    p.velocity.y -= TUNING.gravity * dt;

    this._v2.copy(p.velocity).multiplyScalar(dt);
    const stepLen = this._v2.length();
    if (stepLen < 1e-6) return;

    const dir = this._v1.copy(this._v2).divideScalar(stepLen);
    const hit = this.physics.trace(p.position, dir, stepLen, p.ownerId);

    if (hit.hit) {
      p.position.copy(hit.point);
      p.distance += hit.distance;
      this.onImpact(p, hit.point, hit.normal, hit.surface, hit.actorId, hit.region, dir);
    } else {
      p.position.add(this._v2);
      p.distance += stepLen;

      // Supersonic crack: notify anything nearby that a round went past.
      if (!p.isPlayer && speed > TUNING.speedOfSound) {
        const cam = this.ctx.camera.position;
        const d = p.position.distanceTo(cam);
        if (d < 3.2) {
          Signals.emit('bullet:whizby', { position: p.position.clone(), speed });
          const pipeline = this.ctx.engine.pipeline;
          pipeline.suppression = Math.min(1, pipeline.suppression + (1 - d / 3.2) * 0.35);
        }
      }
    }
  }

  private onImpact(
    p: Projectile,
    point: THREE.Vector3,
    normal: THREE.Vector3,
    surface: string,
    actorId: number | undefined,
    region: HitRegion | undefined,
    direction: THREE.Vector3,
  ): void {
    const def = p.def;
    const damage = damageAtRange(def, p.distance);

    if (actorId !== undefined) {
      const mult =
        region === 'head' ? def.headshotMultiplier :
        region === 'arm' || region === 'leg' ? def.limbMultiplier : 1;
      Signals.emit('actor:damaged', {
        actorId,
        amount: damage * mult,
        cause: 'bullet',
        region,
        attackerId: p.ownerId,
        point: point.clone(),
        direction: direction.clone(),
      });
      // Rounds keep going through soft targets with most of their energy.
      p.penetration -= 0.1;
      if (p.penetration > 0) {
        p.position.addScaledVector(direction, 0.35);
        p.velocity.multiplyScalar(0.82);
        return;
      }
      p.active = false;
      Signals.emit('bullet:impact', {
        point: { x: point.x, y: point.y, z: point.z },
        normal: { x: normal.x, y: normal.y, z: normal.z },
        surface: 'flesh',
        direction: { x: direction.x, y: direction.y, z: direction.z },
        distance: p.distance,
        actorId,
        region,
      });
      return;
    }

    Signals.emit('bullet:impact', {
      point: { x: point.x, y: point.y, z: point.z },
      normal: { x: normal.x, y: normal.y, z: normal.z },
      surface: surface as never,
      direction: { x: direction.x, y: direction.y, z: direction.z },
      distance: p.distance,
    });

    // ---- penetration ----
    const hardness = SURFACE_HARDNESS[surface] ?? 1;
    const angleFactor = Math.max(0.25, -direction.dot(normal));
    const cost = 0.12 * hardness / angleFactor;
    p.penetration -= cost;

    if (p.penetration > 0) {
      // Push through the surface and continue with reduced velocity and a
      // small deflection — a penetrating round is never perfectly stable.
      p.position.addScaledVector(direction, 0.06 + cost * 0.4);
      p.velocity.multiplyScalar(0.62);
      p.velocity.x += (Math.random() - 0.5) * 8;
      p.velocity.y += (Math.random() - 0.5) * 8;
      p.velocity.z += (Math.random() - 0.5) * 8;
      return;
    }

    // ---- ricochet ----
    // Shallow impacts on hard surfaces skip rather than stopping.
    const incidence = Math.acos(THREE.MathUtils.clamp(-direction.dot(normal), -1, 1));
    if (incidence > 1.25 && hardness > 0.8 && Math.random() < 0.35) {
      p.velocity.reflect(normal).multiplyScalar(0.42);
      p.velocity.x += (Math.random() - 0.5) * 14;
      p.velocity.y += (Math.random() - 0.5) * 14;
      p.velocity.z += (Math.random() - 0.5) * 14;
      p.penetration = 0.01;
      p.ttl = Math.min(p.ttl, 1.1);
      Signals.emit('audio:oneshot', { id: 'ricochet', position: point.clone(), volume: 0.5 });
      return;
    }

    p.active = false;
  }

  update(_dt: number, ctx: EngineContext): void {
    // Rebuild the tracer instance buffer from the live projectiles.
    let count = 0;
    const fadeAttr = this.tracerMesh.geometry.getAttribute('aFade') as THREE.InstancedBufferAttribute;
    const camPos = ctx.camera.position;

    for (const p of this.pool) {
      if (!p.active || !p.hasTracer) continue;
      if (count >= this.maxProjectiles) break;

      this._v1.copy(p.position).sub(p.prevPosition);
      const segLen = this._v1.length();
      if (segLen < 1e-5) continue;

      // Stretch the billboard over the distance travelled this frame, with a
      // floor so slow rounds still show, and a ceiling so it never becomes a
      // laser across the whole map.
      const length = THREE.MathUtils.clamp(segLen * 5.5, 0.6, 9);
      const mid = this._v2.copy(p.prevPosition).addScaledVector(this._v1, 0.5);

      const forward = this._v1.divideScalar(segLen);
      // Orient +X along travel, and roll the quad to face the camera.
      const toCam = new THREE.Vector3().subVectors(camPos, mid).normalize();
      const right = new THREE.Vector3().crossVectors(forward, toCam).normalize();
      if (right.lengthSq() < 1e-6) right.copy(this._up);
      const up = new THREE.Vector3().crossVectors(right, forward).normalize();
      const basis = new THREE.Matrix4().makeBasis(forward, up, right);
      this._q.setFromRotationMatrix(basis);

      this.tracerMatrix.compose(
        mid,
        this._q,
        new THREE.Vector3(length, 0.055, 1),
      );
      this.tracerMesh.setMatrixAt(count, this.tracerMatrix);

      // Tracers dim as the round slows and the phosphor burns out.
      const life = THREE.MathUtils.clamp(p.velocity.length() / p.def.muzzleVelocity, 0, 1);
      const near = THREE.MathUtils.smoothstep(p.distance, 0.6, 4.0);
      fadeAttr.setX(count, life * near);

      p.tracerIndex = count;
      count++;
    }

    this.tracerMesh.count = count;
    this.tracerCount = count;
    if (count > 0) {
      this.tracerMesh.instanceMatrix.needsUpdate = true;
      fadeAttr.needsUpdate = true;
    }
    void QUALITY;
    void this.tracerColor;
  }

  get liveProjectiles(): number {
    return this.pool.reduce((n, p) => n + (p.active ? 1 : 0), 0);
  }

  get liveTracers(): number {
    return this.tracerCount;
  }

  dispose(): void {
    this.tracerMesh.geometry.dispose();
    (this.tracerMesh.material as THREE.Material).dispose();
  }
}
