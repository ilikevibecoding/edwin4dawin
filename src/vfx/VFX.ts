import * as THREE from 'three';
import type { EngineContext, System } from '../core/System';
import { Signals, type SurfaceKind } from '../core/Signals';
import { QUALITY } from '../core/Config';
import { RigidBody, type PhysicsSystem } from '../physics/Physics';
import type { LightingSystem } from '../render/Lighting';
import type { LevelSystem } from '../world/Level';

/**
 * GPU particle system and impact effects.
 *
 * One instanced draw call handles every particle in the game. Simulation runs
 * on the CPU into a shared attribute buffer, which at this budget is cheaper
 * than the readback/feedback machinery a full GPU sim would need in WebGL, and
 * it lets particles interact with the collision world.
 *
 * Every impact spawns a coordinated *set* of effects — a flash, a puff whose
 * colour is sampled from the surface, sparks only on hard materials, debris
 * chunks that bounce, and a decal. Real impacts are composite events; firing a
 * single generic "spark" is the fastest way to make gunplay feel cheap.
 */

interface Particle {
  life: number;
  maxLife: number;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  size: number;
  sizeGrow: number;
  rotation: number;
  rotationSpeed: number;
  color: THREE.Color;
  colorEnd: THREE.Color;
  opacity: number;
  drag: number;
  gravity: number;
  /** 0 = smoke, 1 = spark, 2 = flash, 3 = debris, 4 = blood, 5 = fire. */
  kind: number;
  /** Sparks and debris collide with the world; smoke does not. */
  collides: boolean;
  turbulence: number;
  emissive: number;
}

const SURFACE_LOOK: Record<SurfaceKind, {
  puff: THREE.Color; sparks: number; debris: number; puffCount: number; puffSize: number; sound: string;
}> = {
  concrete: { puff: new THREE.Color(0.76, 0.74, 0.70), sparks: 0.25, debris: 5, puffCount: 12, puffSize: 0.24, sound: 'impact_concrete' },
  metal:    { puff: new THREE.Color(0.55, 0.55, 0.58), sparks: 1.0,  debris: 2, puffCount: 5,  puffSize: 0.14, sound: 'impact_metal' },
  sand:     { puff: new THREE.Color(0.82, 0.72, 0.52), sparks: 0.0,  debris: 3, puffCount: 18, puffSize: 0.34, sound: 'impact_sand' },
  dirt:     { puff: new THREE.Color(0.48, 0.40, 0.30), sparks: 0.05, debris: 5, puffCount: 15, puffSize: 0.30, sound: 'impact_dirt' },
  wood:     { puff: new THREE.Color(0.62, 0.48, 0.30), sparks: 0.0,  debris: 7, puffCount: 8,  puffSize: 0.18, sound: 'impact_wood' },
  glass:    { puff: new THREE.Color(0.85, 0.92, 0.96), sparks: 0.4,  debris: 10, puffCount: 4, puffSize: 0.12, sound: 'impact_glass' },
  water:    { puff: new THREE.Color(0.75, 0.85, 0.92), sparks: 0.0,  debris: 0, puffCount: 14, puffSize: 0.26, sound: 'impact_water' },
  flesh:    { puff: new THREE.Color(0.42, 0.06, 0.05), sparks: 0.0,  debris: 4, puffCount: 10, puffSize: 0.13, sound: 'impact_flesh' },
  foliage:  { puff: new THREE.Color(0.32, 0.42, 0.18), sparks: 0.0,  debris: 6, puffCount: 6, puffSize: 0.16, sound: 'impact_foliage' },
  fabric:   { puff: new THREE.Color(0.66, 0.60, 0.46), sparks: 0.0,  debris: 3, puffCount: 9, puffSize: 0.19, sound: 'impact_fabric' },
  rubber:   { puff: new THREE.Color(0.22, 0.22, 0.24), sparks: 0.0,  debris: 2, puffCount: 5, puffSize: 0.13, sound: 'impact_rubber' },
};

export class VFXSystem implements System {
  readonly name = 'vfx';
  readonly order = 40;

  private ctx!: EngineContext;
  private physics!: PhysicsSystem;
  private lighting!: LightingSystem;

  private particles: Particle[] = [];
  private mesh!: THREE.InstancedMesh;
  private capacity = 0;

  private attrColor!: THREE.InstancedBufferAttribute;
  private attrParams!: THREE.InstancedBufferAttribute; // x=opacity, y=kind, z=rotation, w=emissive

  /** Persistent smoke volumes handed to the volumetric pass. */
  private readonly smokeVolumes: Array<{
    x: number; y: number; z: number; radius: number; density: number; seed: number; age: number; ttl: number; maxTtl: number;
  }> = [];

  private readonly casings: Array<{ body: RigidBody; mesh: THREE.Mesh }> = [];
  private casingPool: THREE.InstancedMesh | null = null;
  private casingBodies: RigidBody[] = [];
  private casingMatrices: THREE.Matrix4[] = [];

  private readonly _v = new THREE.Vector3();
  private readonly _v2 = new THREE.Vector3();
  private readonly _m = new THREE.Matrix4();
  private readonly _q = new THREE.Quaternion();
  private readonly _c = new THREE.Color();

  init(ctx: EngineContext): void {
    this.ctx = ctx;
    this.physics = ctx.get<PhysicsSystem>('physics')!;
    this.lighting = ctx.get<LightingSystem>('lighting')!;

    this.capacity = QUALITY.particleBudget;
    this.buildMesh(ctx);
    this.buildCasings(ctx);

    Signals.on('bullet:impact', (hit) => this.onImpact(hit));
    Signals.on('weapon:fire', ({ muzzleWorld, direction, silenced }) =>
      this.muzzleFlash(muzzleWorld, direction, silenced));
    Signals.on('weapon:casing', ({ position, velocity }) => this.ejectCasing(position, velocity));
    Signals.on('explosion:spawn', (e) => this.explosion(e.position, e.radius, e.scale));
  }

  private buildMesh(ctx: EngineContext): void {
    // A camera-facing quad. Soft-particle depth fade is applied in the shader
    // so smoke does not slice through geometry.
    const geo = new THREE.PlaneGeometry(1, 1);

    const colors = new Float32Array(this.capacity * 3);
    const params = new Float32Array(this.capacity * 4);
    this.attrColor = new THREE.InstancedBufferAttribute(colors, 3);
    this.attrParams = new THREE.InstancedBufferAttribute(params, 4);
    this.attrColor.setUsage(THREE.DynamicDrawUsage);
    this.attrParams.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('aColor', this.attrColor);
    geo.setAttribute('aParams', this.attrParams);

    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: THREE.NormalBlending,
      side: THREE.DoubleSide,
      uniforms: {
        uTime: { value: 0 },
        tDepth: { value: null },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uNear: { value: 0.05 },
        uFar: { value: 3000 },
        uSunDirection: { value: new THREE.Vector3(0, 1, 0) },
        uSunColor: { value: new THREE.Color(1, 1, 1) },
        uAmbient: { value: new THREE.Color(0.3, 0.36, 0.46) },
      },
      vertexShader: /* glsl */ `
        attribute vec3 aColor;
        attribute vec4 aParams;
        varying vec3 vColor;
        varying vec4 vParams;
        varying vec2 vUv;
        varying vec3 vWorldNormalish;
        varying float vViewDepth;

        void main() {
          vColor = aColor;
          vParams = aParams;
          vUv = uv;

          // Billboard in view space, then apply the per-particle roll.
          float c = cos(aParams.z);
          float s = sin(aParams.z);
          vec2 rotated = vec2(position.x * c - position.y * s, position.x * s + position.y * c);

          vec4 center = modelViewMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
          float scale = length(vec3(instanceMatrix[0].xyz));
          vec4 mv = center + vec4(rotated * scale, 0.0, 0.0);
          vViewDepth = -mv.z;

          // A cheap normal that points from the particle centre outward gives
          // smoke enough shading variation to read as volumetric.
          vWorldNormalish = normalize(vec3(rotated, 0.55));

          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec3 vColor;
        varying vec4 vParams;
        varying vec2 vUv;
        varying vec3 vWorldNormalish;
        varying float vViewDepth;

        uniform sampler2D tDepth;
        uniform vec2 uResolution;
        uniform float uNear;
        uniform float uFar;
        uniform vec3 uSunDirection;
        uniform vec3 uSunColor;
        uniform vec3 uAmbient;
        uniform float uTime;

        float hash(vec2 p) {
          uvec2 q = uvec2(ivec2(p * 512.0)) * uvec2(1597334673u, 3812015801u);
          uint n = (q.x ^ q.y) * 1597334673u;
          return float(n) * (1.0 / 4294967296.0);
        }

        float noise(vec2 p) {
          vec2 i = floor(p); vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          return mix(mix(hash(i), hash(i + vec2(1,0)), f.x),
                     mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x), f.y);
        }

        float fbm(vec2 p) {
          float v = 0.0, a = 0.5;
          for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
          return v;
        }

        void main() {
          vec2 p = vUv - 0.5;
          float r = length(p) * 2.0;
          int kind = int(vParams.y + 0.5);

          float alpha = vParams.x;
          vec3 color = vColor;

          if (kind == 0 || kind == 5) {
            // Smoke / fire: a noisy, soft-edged blob. The noise is what stops
            // every puff from reading as an identical circle.
            float n = fbm(vUv * 3.4 + vec2(uTime * 0.08, 0.0));
            float mask = 1.0 - smoothstep(0.25, 0.95, r + (n - 0.5) * 0.55);
            alpha *= mask;
            // Sun-side lighting so smoke has a bright rim and dark core.
            float ndl = max(dot(normalize(vWorldNormalish), normalize(uSunDirection)), 0.0);
            vec3 lit = uAmbient + uSunColor * pow(ndl, 1.4) * (kind == 5 ? 0.2 : 0.85);
            color *= lit;
            if (kind == 5) color += vColor * 3.0 * (1.0 - r);
          } else if (kind == 1) {
            // Spark: a stretched hot streak.
            float streak = 1.0 - smoothstep(0.0, 0.5, abs(p.y) * 5.0);
            float head = 1.0 - smoothstep(0.0, 1.0, r);
            alpha *= streak * head;
            color *= 1.0 + (1.0 - r) * 6.0;
          } else if (kind == 2) {
            // Muzzle flash: hot core with radial spikes.
            float ang = atan(p.y, p.x);
            float spikes = 0.55 + 0.45 * pow(abs(cos(ang * 3.0 + 0.7)), 3.0);
            float core = 1.0 - smoothstep(0.0, spikes, r);
            alpha *= pow(core, 1.6);
            color *= 1.0 + core * 9.0;
          } else if (kind == 3) {
            // Debris chunk: a hard-edged irregular quad.
            float mask = 1.0 - step(0.5 + (hash(vUv * 4.0) - 0.5) * 0.3, r);
            alpha *= mask;
            float ndl = max(dot(normalize(vWorldNormalish), normalize(uSunDirection)), 0.0);
            color *= uAmbient + uSunColor * ndl;
          } else {
            // Blood: dense core, ragged edge.
            float n = fbm(vUv * 5.0);
            alpha *= 1.0 - smoothstep(0.3, 0.7, r + (n - 0.5) * 0.4);
          }

          if (alpha < 0.004) discard;

          // Soft particles: fade where the quad intersects world geometry.
          vec2 screenUv = gl_FragCoord.xy / uResolution;
          float sceneDepthRaw = texture2D(tDepth, screenUv).x;
          float z = sceneDepthRaw * 2.0 - 1.0;
          float sceneDepth = (2.0 * uNear * uFar) / (uFar + uNear - z * (uFar - uNear));
          float fade = clamp((sceneDepth - vViewDepth) / 0.55, 0.0, 1.0);
          alpha *= fade;

          color *= 1.0 + vParams.w;
          gl_FragColor = vec4(color, alpha);
        }
      `,
    });

    this.mesh = new THREE.InstancedMesh(geo, mat, this.capacity);
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.renderOrder = 500;
    this.mesh.name = 'particles';
    ctx.scene.add(this.mesh);
  }

  private buildCasings(ctx: EngineContext): void {
    const geo = new THREE.CylinderGeometry(0.0045, 0.005, 0.024, 8);
    geo.rotateZ(Math.PI / 2);
    const level = ctx.get<LevelSystem>('level');
    // Brass with a fine machining texture reads far better than flat metal
    // when a casing tumbles past the camera catching the sun.
    const brass = level
      ? level.materials.get('gunmetal', {
          scale: 0.06,
          color: 0xd9a44e,
          roughness: 0.3,
          metalness: 1,
        })
      : new THREE.MeshStandardMaterial({ color: 0xc79a4a, metalness: 1, roughness: 0.28 });
    this.casingPool = new THREE.InstancedMesh(geo, brass, 64);
    this.casingPool.frustumCulled = false;
    this.casingPool.count = 0;
    this.casingPool.castShadow = false;
    this.casingPool.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    ctx.scene.add(this.casingPool);
  }

  // ------------------------------------------------------------- spawning --

  private spawn(p: Partial<Particle> & { position: THREE.Vector3 }): void {
    if (this.particles.length >= this.capacity) {
      // Recycle the oldest smoke rather than dropping the new effect: a
      // missing muzzle flash is far more noticeable than one fewer dust puff.
      let oldest = -1;
      let oldestAge = -1;
      for (let i = 0; i < this.particles.length; i++) {
        const q = this.particles[i];
        if (q.kind !== 0) continue;
        const age = 1 - q.life / q.maxLife;
        if (age > oldestAge) { oldestAge = age; oldest = i; }
      }
      if (oldest >= 0) this.particles.splice(oldest, 1);
      else return;
    }

    this.particles.push({
      life: p.maxLife ?? 1,
      maxLife: p.maxLife ?? 1,
      position: p.position.clone(),
      velocity: p.velocity?.clone() ?? new THREE.Vector3(),
      size: p.size ?? 0.2,
      sizeGrow: p.sizeGrow ?? 0,
      rotation: p.rotation ?? Math.random() * Math.PI * 2,
      rotationSpeed: p.rotationSpeed ?? 0,
      color: p.color?.clone() ?? new THREE.Color(1, 1, 1),
      colorEnd: p.colorEnd?.clone() ?? p.color?.clone() ?? new THREE.Color(1, 1, 1),
      opacity: p.opacity ?? 1,
      drag: p.drag ?? 1.2,
      gravity: p.gravity ?? 0,
      kind: p.kind ?? 0,
      collides: p.collides ?? false,
      turbulence: p.turbulence ?? 0,
      emissive: p.emissive ?? 0,
    });
  }

  private onImpact(hit: {
    point: { x: number; y: number; z: number };
    normal: { x: number; y: number; z: number };
    surface: SurfaceKind;
    direction: { x: number; y: number; z: number };
  }): void {
    const look = SURFACE_LOOK[hit.surface] ?? SURFACE_LOOK.concrete;
    const point = this._v.set(hit.point.x, hit.point.y, hit.point.z);
    const normal = this._v2.set(hit.normal.x, hit.normal.y, hit.normal.z);

    // ---- flash ----
    if (look.sparks > 0.2) {
      this.spawn({
        position: point.clone().addScaledVector(normal, 0.02),
        maxLife: 0.055,
        size: 0.16 * look.sparks,
        color: new THREE.Color(1.0, 0.85, 0.5),
        kind: 2,
        opacity: 1,
        emissive: 4,
      });
    }

    // ---- dust puff ----
    const count = Math.round(look.puffCount * (QUALITY.tier === 'low' ? 0.4 : 1));
    for (let i = 0; i < count; i++) {
      const dir = normal.clone()
        .addScaledVector(randomUnit(this._v2.clone()), 0.85)
        .normalize();
      this.spawn({
        position: point.clone().addScaledVector(normal, 0.03),
        velocity: dir.multiplyScalar(1.2 + Math.random() * 2.4),
        maxLife: 0.55 + Math.random() * 0.7,
        size: look.puffSize * (0.5 + Math.random() * 0.8),
        sizeGrow: 1.5,
        color: look.puff.clone().multiplyScalar(0.9 + Math.random() * 0.3),
        colorEnd: look.puff.clone().multiplyScalar(0.55),
        opacity: 0.55,
        drag: 3.2,
        gravity: hit.surface === 'sand' || hit.surface === 'dirt' ? 1.6 : 0.4,
        rotationSpeed: (Math.random() - 0.5) * 3,
        kind: hit.surface === 'flesh' ? 4 : 0,
        turbulence: 0.5,
      });
    }

    // ---- sparks ----
    if (look.sparks > 0) {
      const n = Math.round(look.sparks * 14);
      const incoming = new THREE.Vector3(hit.direction.x, hit.direction.y, hit.direction.z);
      const reflected = incoming.clone().reflect(normal);
      for (let i = 0; i < n; i++) {
        const dir = reflected.clone()
          .addScaledVector(randomUnit(this._v2.clone()), 0.7)
          .normalize();
        this.spawn({
          position: point.clone().addScaledVector(normal, 0.01),
          velocity: dir.multiplyScalar(4 + Math.random() * 12),
          maxLife: 0.22 + Math.random() * 0.5,
          size: 0.03 + Math.random() * 0.045,
          sizeGrow: -0.6,
          color: new THREE.Color(1.0, 0.66, 0.22),
          colorEnd: new THREE.Color(0.8, 0.14, 0.02),
          opacity: 1,
          drag: 1.4,
          gravity: 9,
          kind: 1,
          collides: true,
          emissive: 5,
        });
      }
    }

    // ---- debris ----
    for (let i = 0; i < look.debris; i++) {
      const dir = normal.clone().addScaledVector(randomUnit(this._v2.clone()), 0.8).normalize();
      this.spawn({
        position: point.clone().addScaledVector(normal, 0.02),
        velocity: dir.multiplyScalar(2 + Math.random() * 5),
        maxLife: 1.1 + Math.random() * 0.8,
        size: 0.016 + Math.random() * 0.03,
        color: look.puff.clone().multiplyScalar(0.7),
        opacity: 1,
        drag: 0.6,
        gravity: 14,
        rotationSpeed: (Math.random() - 0.5) * 14,
        kind: 3,
        collides: true,
      });
    }

    // Impact light on hard surfaces — brief, but it lights the wall you shot.
    if (look.sparks > 0.5) {
      this.lighting.spawnLight(point.clone().addScaledVector(normal, 0.1), 0xffb060, 3.2, 3.5, 0.09, 'flash');
    }

    Signals.emit('audio:oneshot', { id: look.sound, position: point.clone(), volume: 0.75 });
  }

  private muzzleFlash(muzzle: THREE.Vector3, direction: THREE.Vector3, silenced: boolean): void {
    const scale = silenced ? 0.28 : 1;

    // Core flash.
    this.spawn({
      position: muzzle.clone(),
      maxLife: 0.042,
      size: 0.34 * scale,
      color: new THREE.Color(1.0, 0.86, 0.58),
      kind: 2,
      opacity: 1,
      emissive: 8,
      rotation: Math.random() * Math.PI * 2,
    });
    this.spawn({
      position: muzzle.clone().addScaledVector(direction, 0.06),
      maxLife: 0.032,
      size: 0.2 * scale,
      color: new THREE.Color(1.0, 0.96, 0.86),
      kind: 2,
      opacity: 1,
      emissive: 12,
    });

    // Unburnt powder and gas.
    for (let i = 0; i < (silenced ? 10 : 6); i++) {
      const dir = direction.clone()
        .addScaledVector(randomUnit(this._v2.clone()), 0.35)
        .normalize();
      this.spawn({
        position: muzzle.clone(),
        velocity: dir.multiplyScalar(2.5 + Math.random() * 5),
        maxLife: 0.32 + Math.random() * 0.4,
        size: 0.06 + Math.random() * 0.08,
        sizeGrow: 2.6,
        color: new THREE.Color(0.62, 0.6, 0.58),
        colorEnd: new THREE.Color(0.42, 0.42, 0.44),
        opacity: silenced ? 0.4 : 0.22,
        drag: 4.5,
        gravity: -0.4,
        rotationSpeed: (Math.random() - 0.5) * 4,
        kind: 0,
        turbulence: 1,
      });
    }

    // Sparks from the muzzle brake.
    if (!silenced) {
      for (let i = 0; i < 5; i++) {
        const dir = direction.clone().addScaledVector(randomUnit(this._v2.clone()), 0.55).normalize();
        this.spawn({
          position: muzzle.clone(),
          velocity: dir.multiplyScalar(6 + Math.random() * 9),
          maxLife: 0.12 + Math.random() * 0.16,
          size: 0.02,
          color: new THREE.Color(1.0, 0.72, 0.3),
          colorEnd: new THREE.Color(0.7, 0.2, 0.05),
          opacity: 1,
          drag: 2,
          gravity: 6,
          kind: 1,
          emissive: 4,
        });
      }
    }

    this.lighting.spawnLight(
      muzzle.clone().addScaledVector(direction, 0.3),
      0xffc070,
      silenced ? 3 : 16,
      silenced ? 5 : 14,
      0.055,
      'flash',
    );
  }

  private ejectCasing(position: THREE.Vector3, velocity: THREE.Vector3): void {
    if (!this.casingPool) return;
    if (this.casingBodies.length >= 48) {
      this.casingBodies.shift();
      this.casingMatrices.shift();
    }
    const body = new RigidBody();
    body.position.copy(position);
    body.velocity.copy(velocity);
    body.angularVelocity.set(
      (Math.random() - 0.5) * 30,
      (Math.random() - 0.5) * 30,
      (Math.random() - 0.5) * 30,
    );
    body.radius = 0.008;
    body.restitution = 0.42;
    body.friction = 0.5;
    body.ttl = 9;
    body.onBounce = (speed, _n, surface) => {
      if (speed > 0.9) {
        Signals.emit('audio:oneshot', {
          id: 'casing_' + (surface === 'sand' || surface === 'dirt' ? 'soft' : 'hard'),
          position: body.position.clone(),
          volume: Math.min(0.35, speed * 0.09),
          pitch: 0.85 + Math.random() * 0.4,
        });
      }
    };
    this.physics.addBody(body);
    this.casingBodies.push(body);
    this.casingMatrices.push(new THREE.Matrix4());
  }

  /** Public: spawn an explosion's visual payload. */
  explosion(position: THREE.Vector3, radius: number, scale: number): void {
    const budget = QUALITY.tier === 'low' ? 0.4 : 1;

    // Fireball core.
    for (let i = 0; i < Math.round(18 * budget * scale); i++) {
      const dir = randomUnit(new THREE.Vector3());
      this.spawn({
        position: position.clone().addScaledVector(dir, Math.random() * radius * 0.3),
        velocity: dir.clone().multiplyScalar(4 + Math.random() * 14 * scale),
        maxLife: 0.28 + Math.random() * 0.34,
        size: radius * 0.32 * (0.5 + Math.random()),
        sizeGrow: 2.4,
        color: new THREE.Color(1.0, 0.62, 0.16),
        colorEnd: new THREE.Color(0.5, 0.1, 0.02),
        opacity: 1,
        drag: 2.6,
        gravity: -3.4,
        rotationSpeed: (Math.random() - 0.5) * 5,
        kind: 5,
        emissive: 7,
        turbulence: 1.4,
      });
    }

    // Smoke column.
    for (let i = 0; i < Math.round(30 * budget * scale); i++) {
      const dir = randomUnit(new THREE.Vector3());
      dir.y = Math.abs(dir.y) * 1.6 + 0.3;
      this.spawn({
        position: position.clone().addScaledVector(dir, Math.random() * radius * 0.5),
        velocity: dir.normalize().multiplyScalar(2 + Math.random() * 8 * scale),
        maxLife: 2.4 + Math.random() * 3.4,
        size: radius * 0.42 * (0.6 + Math.random()),
        sizeGrow: 2.0,
        color: new THREE.Color(0.24, 0.22, 0.21),
        colorEnd: new THREE.Color(0.46, 0.45, 0.44),
        opacity: 0.72,
        drag: 1.1,
        gravity: -1.5,
        rotationSpeed: (Math.random() - 0.5) * 1.6,
        kind: 0,
        turbulence: 1.8,
      });
    }

    // Ground dust ring — the part that reads as "shockwave".
    for (let i = 0; i < Math.round(24 * budget * scale); i++) {
      const a = (i / (24 * scale)) * Math.PI * 2 + Math.random() * 0.3;
      const dir = new THREE.Vector3(Math.cos(a), 0.12, Math.sin(a));
      this.spawn({
        position: position.clone().add(new THREE.Vector3(0, 0.2, 0)),
        velocity: dir.multiplyScalar(9 + Math.random() * 12 * scale),
        maxLife: 1.4 + Math.random() * 1.4,
        size: radius * 0.34,
        sizeGrow: 3.2,
        color: new THREE.Color(0.68, 0.6, 0.46),
        colorEnd: new THREE.Color(0.5, 0.45, 0.38),
        opacity: 0.5,
        drag: 2.4,
        gravity: 0.6,
        rotationSpeed: (Math.random() - 0.5) * 2,
        kind: 0,
        turbulence: 1.1,
      });
    }

    // Debris and sparks.
    for (let i = 0; i < Math.round(26 * budget * scale); i++) {
      const dir = randomUnit(new THREE.Vector3());
      dir.y = Math.abs(dir.y) + 0.2;
      this.spawn({
        position: position.clone(),
        velocity: dir.normalize().multiplyScalar(9 + Math.random() * 22 * scale),
        maxLife: 1.6 + Math.random() * 1.4,
        size: 0.04 + Math.random() * 0.09,
        color: new THREE.Color(0.4, 0.36, 0.32),
        opacity: 1,
        drag: 0.4,
        gravity: 16,
        rotationSpeed: (Math.random() - 0.5) * 20,
        kind: 3,
        collides: true,
      });
    }

    this.lighting.spawnLight(
      position.clone().add(new THREE.Vector3(0, 1, 0)),
      0xff9838,
      120 * scale,
      radius * 4,
      0.55,
      'flicker',
    );

    // Persistent volumetric smoke for the shader-based fog.
    this.smokeVolumes.push({
      x: position.x, y: position.y + radius * 0.4, z: position.z,
      radius: radius * 1.5,
      density: 0.09 * scale,
      seed: Math.random() * 100,
      age: 0,
      ttl: 9,
      maxTtl: 9,
    });
    if (this.smokeVolumes.length > 6) this.smokeVolumes.shift();
  }

  // ------------------------------------------------------------- update ----

  update(dt: number, ctx: EngineContext): void {
    const alive: Particle[] = [];
    const wind = this._v2.set(0.8, 0.05, 0.35);

    for (const p of this.particles) {
      p.life -= dt;
      if (p.life <= 0) continue;

      p.velocity.y -= p.gravity * dt;
      p.velocity.multiplyScalar(Math.max(0, 1 - p.drag * dt));

      if (p.turbulence > 0) {
        const t = ctx.time.elapsed * 1.4;
        p.velocity.x += Math.sin(t + p.position.z * 0.9) * p.turbulence * dt * 1.6;
        p.velocity.z += Math.cos(t * 1.13 + p.position.x * 0.9) * p.turbulence * dt * 1.6;
        p.velocity.addScaledVector(wind, p.turbulence * dt * 0.5);
      }

      if (p.collides) {
        const step = this._v.copy(p.velocity).multiplyScalar(dt);
        const len = step.length();
        if (len > 1e-5) {
          const dir = step.divideScalar(len);
          const hit = this.physics.trace(p.position, dir, len + 0.02);
          if (hit.hit) {
            p.position.copy(hit.point).addScaledVector(hit.normal, 0.01);
            const vn = p.velocity.dot(hit.normal);
            p.velocity.addScaledVector(hit.normal, -vn * 1.42);
            p.velocity.multiplyScalar(0.42);
            p.rotationSpeed *= 0.5;
          } else {
            p.position.addScaledVector(dir, len);
          }
        }
      } else {
        p.position.addScaledVector(p.velocity, dt);
      }

      p.rotation += p.rotationSpeed * dt;
      p.size += p.sizeGrow * dt * p.size * 0.6;
      alive.push(p);
    }
    this.particles = alive;

    // ---- write instance buffers ----
    const camPos = ctx.camera.position;
    // Sort back-to-front so alpha blending is correct. Only the smoke needs
    // it, but sorting everything is simpler and the counts are modest.
    this.particles.sort(
      (a, b) => b.position.distanceToSquared(camPos) - a.position.distanceToSquared(camPos),
    );

    const n = Math.min(this.particles.length, this.capacity);
    for (let i = 0; i < n; i++) {
      const p = this.particles[i];
      const t = 1 - p.life / p.maxLife;

      this._m.compose(p.position, this._q.identity(), this._v.setScalar(p.size));
      this.mesh.setMatrixAt(i, this._m);

      this._c.copy(p.color).lerp(p.colorEnd, t);
      this.attrColor.setXYZ(i, this._c.r, this._c.g, this._c.b);

      // Fade in fast, out slow; a linear fade makes particles pop on spawn.
      const fadeIn = Math.min(t / 0.08, 1);
      const fadeOut = 1 - Math.pow(t, p.kind === 1 || p.kind === 2 ? 0.7 : 1.9);
      this.attrParams.setXYZW(
        i,
        p.opacity * fadeIn * fadeOut,
        p.kind,
        p.rotation,
        p.emissive * (1 - t),
      );
    }
    this.mesh.count = n;
    if (n > 0) {
      this.mesh.instanceMatrix.needsUpdate = true;
      this.attrColor.needsUpdate = true;
      this.attrParams.needsUpdate = true;
    }

    const mat = this.mesh.material as THREE.ShaderMaterial;
    mat.uniforms.uTime.value = ctx.time.elapsed;
    mat.uniforms.tDepth.value = ctx.engine.pipeline.depthTextureRef;
    (mat.uniforms.uResolution.value as THREE.Vector2).set(
      ctx.engine.pipeline.internalWidth,
      ctx.engine.pipeline.internalHeight,
    );
    mat.uniforms.uNear.value = ctx.camera.near;
    mat.uniforms.uFar.value = ctx.camera.far;
    (mat.uniforms.uSunDirection.value as THREE.Vector3).copy(this.lighting.sky.sunDirection);
    (mat.uniforms.uSunColor.value as THREE.Color).copy(ctx.engine.pipeline.sunColor)
      .multiplyScalar(ctx.engine.pipeline.sunIntensity * 0.25);

    // ---- casings ----
    if (this.casingPool) {
      let c = 0;
      for (const body of this.casingBodies) {
        if (body.dead) continue;
        this._m.compose(body.position, body.quaternion, this._v.setScalar(1));
        this.casingPool.setMatrixAt(c++, this._m);
      }
      this.casingPool.count = c;
      if (c > 0) this.casingPool.instanceMatrix.needsUpdate = true;
      this.casingBodies = this.casingBodies.filter((b) => !b.dead);
    }

    // ---- volumetric smoke ----
    for (let i = this.smokeVolumes.length - 1; i >= 0; i--) {
      const s = this.smokeVolumes[i];
      s.ttl -= dt;
      s.age = 1 - s.ttl / s.maxTtl;
      s.radius += dt * 1.4;
      s.y += dt * 0.55;
      s.density *= Math.max(0, 1 - dt * 0.22);
      if (s.ttl <= 0) this.smokeVolumes.splice(i, 1);
    }
    ctx.engine.pipeline.setSmokeVolumes(this.smokeVolumes);
  }

  get particleCount(): number {
    return this.particles.length;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
    this.casingPool?.geometry.dispose();
    void this.casings;
  }
}

function randomUnit(out: THREE.Vector3): THREE.Vector3 {
  const z = Math.random() * 2 - 1;
  const a = Math.random() * Math.PI * 2;
  const r = Math.sqrt(Math.max(0, 1 - z * z));
  return out.set(r * Math.cos(a), r * Math.sin(a), z);
}
