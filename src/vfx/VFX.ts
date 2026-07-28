import * as THREE from 'three';
import type { EngineContext, System } from '../core/System';
import { Signals, type SurfaceKind } from '../core/Signals';
import { QUALITY } from '../core/Config';
import { RigidBody, type PhysicsSystem } from '../physics/Physics';
import type { LightingSystem } from '../render/Lighting';
import type { LevelSystem } from '../world/Level';
import { ParticleField, PKind, MAX_HOTSPOTS, type HotSpot } from './ParticleField';
import { SoftDepth } from './SoftDepth';
import { DebugStage } from './DebugStage';
import type { DecalSystem } from './Decals';

/**
 * Combat VFX: impacts, muzzle flashes, explosions, gore, shell casings.
 *
 * Every event here is a *timed set* of sub-effects rather than a single burst.
 * A detonation is a two-frame flash, then a fireball that cools from white to
 * red as it climbs, then a dust ring racing out along the ground, then debris
 * on ballistic arcs, then a smoke column that arrives late and lingers. Fire
 * all of that on the same frame and it reads as one puff; stagger it by tens
 * of milliseconds and it reads as an explosion. That scheduling is what the
 * `queue` exists for.
 *
 * Emissive intensities are expressed in multiples of `hdrUnit`, the scene
 * radiance that the analytic exposure maps to 1.0. A flash authored as "30"
 * therefore lands thirty times over white in every lighting preset, so bloom
 * and the tonemap shoulder respond to it identically at midday and at night —
 * which is the only way to author a flash once and have it read as hot in all
 * of them.
 */

interface SurfaceLook {
  puff: THREE.Color;
  /** 0..1, how much the surface throws sparks. */
  sparks: number;
  debris: number;
  puffCount: number;
  puffSize: number;
  /** 0..1, how much loose material is thrown along the ground. */
  loose: number;
  sound: string;
}

const SURFACE_LOOK: Record<SurfaceKind, SurfaceLook> = {
  concrete: { puff: new THREE.Color(0.78, 0.755, 0.715), sparks: 0.35, debris: 6, puffCount: 11, puffSize: 0.26, loose: 0.5, sound: 'impact_concrete' },
  metal:    { puff: new THREE.Color(0.56, 0.565, 0.59),  sparks: 1.0,  debris: 3, puffCount: 4,  puffSize: 0.14, loose: 0.1, sound: 'impact_metal' },
  sand:     { puff: new THREE.Color(0.84, 0.735, 0.535), sparks: 0.0,  debris: 4, puffCount: 16, puffSize: 0.36, loose: 1.0, sound: 'impact_sand' },
  dirt:     { puff: new THREE.Color(0.50, 0.415, 0.315), sparks: 0.06, debris: 6, puffCount: 14, puffSize: 0.32, loose: 0.9, sound: 'impact_dirt' },
  wood:     { puff: new THREE.Color(0.64, 0.50, 0.315),  sparks: 0.0,  debris: 9, puffCount: 7,  puffSize: 0.19, loose: 0.3, sound: 'impact_wood' },
  glass:    { puff: new THREE.Color(0.86, 0.93, 0.97),   sparks: 0.5,  debris: 12, puffCount: 3, puffSize: 0.12, loose: 0.2, sound: 'impact_glass' },
  water:    { puff: new THREE.Color(0.76, 0.86, 0.93),   sparks: 0.0,  debris: 0, puffCount: 13, puffSize: 0.27, loose: 0.6, sound: 'impact_water' },
  flesh:    { puff: new THREE.Color(0.30, 0.045, 0.035), sparks: 0.0,  debris: 0, puffCount: 6,  puffSize: 0.11, loose: 0.0, sound: 'impact_flesh' },
  foliage:  { puff: new THREE.Color(0.33, 0.43, 0.19),   sparks: 0.0,  debris: 7, puffCount: 5,  puffSize: 0.16, loose: 0.2, sound: 'impact_foliage' },
  fabric:   { puff: new THREE.Color(0.67, 0.61, 0.47),   sparks: 0.0,  debris: 3, puffCount: 8,  puffSize: 0.19, loose: 0.2, sound: 'impact_fabric' },
  rubber:   { puff: new THREE.Color(0.23, 0.23, 0.25),   sparks: 0.0,  debris: 3, puffCount: 5,  puffSize: 0.14, loose: 0.1, sound: 'impact_rubber' },
};

interface SmokeVolume {
  x: number; y: number; z: number;
  radius: number; density: number; seed: number;
  age: number; ttl: number; maxTtl: number;
  rise: number; growth: number;
  /** Density this volume works up to. */
  peak: number;
  /** Seconds spent reaching it. */
  ramp: number;
  /** Seconds since spawn. */
  t: number;
}

export class VFXSystem implements System {
  readonly name = 'vfx';
  readonly order = 40;

  private ctx!: EngineContext;
  private physics!: PhysicsSystem;
  private lighting!: LightingSystem;
  private decals: DecalSystem | null = null;

  private field!: ParticleField;
  private readonly softDepth = new SoftDepth();

  /** Deferred effect steps, sorted by fire time. */
  private readonly queue: Array<{ at: number; run: () => void }> = [];
  private clock = 0;

  private readonly smokeVolumes: SmokeVolume[] = [];
  /** Fireballs currently lighting the smoke around them. */
  private readonly hotspots: HotSpot[] = [];
  private stage: DebugStage | null = null;

  private casingPool: THREE.InstancedMesh | null = null;
  private casingBodies: RigidBody[] = [];

  /** Where each actor was last hit, so a kill can put the pool in the right place. */
  private readonly lastWound = new Map<number, THREE.Vector3>();

  private readonly budget = QUALITY.tier === 'low' ? 0.45 : QUALITY.tier === 'medium' ? 0.75 : 1;

  private hdrUnit = 2;
  private sunRadiance = new THREE.Color(1, 1, 1);
  private ambientRadiance = new THREE.Color(0.2, 0.24, 0.3);

  private readonly _v = new THREE.Vector3();
  private readonly _v2 = new THREE.Vector3();
  private readonly _v3 = new THREE.Vector3();
  private readonly _m = new THREE.Matrix4();
  private readonly _c = new THREE.Color();
  private readonly _c2 = new THREE.Color();
  private readonly wind = new THREE.Vector3(0.85, 0.02, 0.4);

  private readonly trace = (from: THREE.Vector3, dir: THREE.Vector3, len: number) =>
    this.physics.trace(from, dir, len);

  init(ctx: EngineContext): void {
    this.ctx = ctx;
    this.physics = ctx.get<PhysicsSystem>('physics')!;
    this.lighting = ctx.get<LightingSystem>('lighting')!;

    this.field = new ParticleField(ctx.scene, QUALITY.particleBudget);
    this.buildCasings(ctx);
    this.hookSceneRender(ctx);

    Signals.on('bullet:impact', (hit) => this.onImpact(hit));
    Signals.on('weapon:fire', ({ muzzleWorld, direction, silenced }) =>
      this.muzzleFlash(muzzleWorld, direction, silenced));
    Signals.on('weapon:casing', ({ position, velocity }) => this.ejectCasing(position, velocity));
    Signals.on('explosion:spawn', (e) => this.explosion(e.position, e.radius, e.scale));
    // A kill needs an aftermath, not just a ragdoll. `actor:killed` carries no
    // position, so the last wound this actor took is remembered and used as the
    // anchor — which is also the right answer visually, since the pool belongs
    // under the hit rather than under the actor's origin.
    Signals.on('actor:damaged', (d) => {
      if (d.point) this.lastWound.set(d.actorId, d.point.clone());
    });
    Signals.on('actor:killed', ({ actorId }) => {
      const at = this.lastWound.get(actorId);
      this.lastWound.delete(actorId);
      if (at) this.bleedOut(at);
    });

    if (DebugStage.enabled()) {
      this.stage = new DebugStage({
        explosion: (p, r, s) => this.explosion(p, r, s),
        muzzle: (p, d) => this.muzzleFlash(p, d, false),
        impact: (point, normal, dir, surface) =>
          this.onImpact({ point, normal, surface: surface as SurfaceKind, direction: dir }),
        advance: (seconds) => this.fastForward(seconds),
        census: () => {
          const vols = this.smokeVolumes
            .map((v) => `${v.density.toFixed(4)}@r${v.radius.toFixed(1)}`)
            .join(',');
          return `particles=${this.field.count} smoke=${this.field.countOf(PKind.Smoke)}` +
            ` dust=${this.field.countOf(PKind.GroundDust)} fire=${this.field.countOf(PKind.Fire)}` +
            ` hdrUnit=${this.hdrUnit.toFixed(3)} vols=[${vols}]`;
        },
      });
    }
  }

  private later(delay: number, run: () => void): void {
    this.queue.push({ at: this.clock + delay, run });
  }

  /**
   * Two things have to happen inside the world render that no system update
   * can do from outside it.
   *
   * The particles must not appear in the normal prepass. That pass runs the
   * whole scene through an override material, which turns every smoke quad
   * into an opaque normal-writing surface, and the occlusion pass downstream
   * then darkens the world behind a puff of dust as though it were masonry.
   *
   * And scene depth has to be copied out the instant the world pass finishes.
   * It cannot be read during that pass — it is the depth attachment of the
   * target being drawn into, so sampling it is a framebuffer feedback loop
   * that returns zero — and by the end of the frame the view-model overlay has
   * cleared it. The window between those two events is the only moment the
   * buffer holds world depth, and `onAfterRender` is the only hook inside it.
   */
  private hookSceneRender(ctx: EngineContext): void {
    type Hook = (
      renderer: THREE.WebGLRenderer,
      scene: THREE.Scene,
      camera: THREE.Camera,
      ...rest: unknown[]
    ) => void;
    const scene = ctx.scene;
    const priorBefore = scene.onBeforeRender as unknown as Hook;
    const priorAfter = scene.onAfterRender as unknown as Hook;

    (scene as unknown as { onBeforeRender: Hook }).onBeforeRender = (
      renderer, sc, camera, ...rest
    ) => {
      priorBefore.call(sc, renderer, sc, camera, ...rest);
      if (camera !== ctx.camera) return;
      this.field.setVisible(sc.overrideMaterial === null);
    };

    (scene as unknown as { onAfterRender: Hook }).onAfterRender = (
      renderer, sc, camera, ...rest
    ) => {
      priorAfter.call(sc, renderer, sc, camera, ...rest);
      if (camera !== ctx.camera) return;
      if (sc.overrideMaterial === null) {
        const pipeline = ctx.engine.pipeline;
        this.softDepth.update(
          renderer,
          pipeline.depthTextureRef,
          pipeline.internalWidth,
          pipeline.internalHeight,
          ctx.camera.near,
          ctx.camera.far,
        );
      }
      this.field.setVisible(true);
    };
  }

  private buildCasings(ctx: EngineContext): void {
    const geo = new THREE.CylinderGeometry(0.0045, 0.005, 0.024, 8);
    geo.rotateZ(Math.PI / 2);
    const level = ctx.get<LevelSystem>('level');
    const brass = level
      ? level.materials.get('gunmetal', { scale: 0.06, color: 0xd9a44e, roughness: 0.3, metalness: 1 })
      : new THREE.MeshStandardMaterial({ color: 0xc79a4a, metalness: 1, roughness: 0.28 });
    this.casingPool = new THREE.InstancedMesh(geo, brass, 64);
    this.casingPool.frustumCulled = false;
    this.casingPool.count = 0;
    this.casingPool.castShadow = false;
    this.casingPool.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.casingPool.userData.noSkyMask = true;
    ctx.scene.add(this.casingPool);
  }

  // ------------------------------------------------------------- impacts ---

  private onImpact(hit: {
    point: { x: number; y: number; z: number };
    normal: { x: number; y: number; z: number };
    surface: SurfaceKind;
    direction: { x: number; y: number; z: number };
  }): void {
    const look = SURFACE_LOOK[hit.surface] ?? SURFACE_LOOK.concrete;
    const point = new THREE.Vector3(hit.point.x, hit.point.y, hit.point.z);
    const normal = new THREE.Vector3(hit.normal.x, hit.normal.y, hit.normal.z);
    const incoming = new THREE.Vector3(hit.direction.x, hit.direction.y, hit.direction.z).normalize();

    if (hit.surface === 'flesh') {
      this.fleshHit(point, normal, incoming);
      Signals.emit('audio:oneshot', { id: look.sound, position: point.clone(), volume: 0.8 });
      return;
    }

    const b = this.budget;
    const reflected = incoming.clone().reflect(normal);
    const up = Math.max(0, normal.y);

    // ---- flash: only hard, brittle surfaces spall light -------------------
    if (look.sparks > 0.2) {
      this.field.spawn({
        position: point.clone().addScaledVector(normal, 0.02),
        maxLife: 0.05,
        size: 0.12 + 0.16 * look.sparks,
        color: new THREE.Color(1.0, 0.200, 0.024),
        kind: PKind.Flash,
        emissive: 9 * look.sparks,
        fadeIn: 0,
        fadePow: 0.8,
      });
    }

    // ---- pulverised surface: a cone off the wall, biased down the ricochet -
    const count = Math.round(look.puffCount * b);
    for (let i = 0; i < count; i++) {
      const dir = normal.clone()
        .addScaledVector(reflected, 0.45)
        .addScaledVector(randomUnit(this._v2), 0.75)
        .normalize();
      // Loose surfaces throw their spall up rather than along. Without this a
      // strike on a road stayed inside the road's own silhouette and the puff
      // had nothing but sunlit sand to be seen against.
      dir.y += 0.55 * look.loose;
      dir.normalize();
      // Above the surface's own value, but not by much. This has been wrong in
      // both directions. At the surface's face value the shader — which puts
      // roughly four into an albedo on the sunlit side — clipped the puff to
      // white and threw away the colour that identifies what was hit; pulled
      // down to a third of it, a puff off a sunlit sand road came out the same
      // value as the sand and six impacts at seven metres were invisible in the
      // capture. Airborne dust is *lighter* than the surface it came off,
      // because it catches light from the whole sky rather than from one
      // direction, and that difference is the only reason it reads at all.
      const dust = look.puff.clone().multiplyScalar(0.46 + Math.random() * 0.18);
      this.field.spawn({
        position: point.clone().addScaledVector(normal, 0.03),
        velocity: dir.multiplyScalar(2.2 + Math.random() * 4.4),
        maxLife: 0.45 + Math.random() * 0.8,
        size: look.puffSize * (0.5 + Math.random() * 0.9),
        grow: 0.7,
        color: dust,
        colorEnd: dust.clone().multiplyScalar(0.72),
        opacity: 0.42 + Math.random() * 0.24,
        drag: 3.6,
        gravity: 0.9 + look.loose * 2.2,
        rotationSpeed: (Math.random() - 0.5) * 3.4,
        kind: PKind.Smoke,
        turbulence: 0.6,
        shade: 0.8 + Math.random() * 0.2,
        fadeIn: 0.02,
      });
    }

    // A hit on a floor also kicks a low sheet of dust outward along it.
    if (up > 0.55 && look.loose > 0.2) {
      for (let i = 0; i < Math.round(4 * b * look.loose); i++) {
        const a = Math.random() * Math.PI * 2;
        const dir = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
        this.field.spawn({
          position: point.clone().addScaledVector(normal, 0.02),
          velocity: dir.multiplyScalar(1.4 + Math.random() * 2.6),
          maxLife: 0.6 + Math.random() * 0.7,
          size: look.puffSize * 1.5,
          grow: 1.3,
          color: look.puff.clone().multiplyScalar(0.58),
          colorEnd: look.puff.clone().multiplyScalar(0.40),
          opacity: 0.40,
          drag: 3.2,
          rotationSpeed: (Math.random() - 0.5) * 2,
          kind: PKind.GroundDust,
          turbulence: 0.4,
          fadeIn: 0.03,
        });
      }
    }

    // ---- sparks ------------------------------------------------------------
    if (look.sparks > 0) {
      const n = Math.round(look.sparks * 13 * b);
      for (let i = 0; i < n; i++) {
        const dir = reflected.clone()
          .addScaledVector(randomUnit(this._v2), 0.62)
          .normalize();
        this.field.spawn({
          position: point.clone().addScaledVector(normal, 0.01),
          velocity: dir.multiplyScalar(5 + Math.random() * 14),
          maxLife: 0.2 + Math.random() * 0.55,
          size: 0.016 + Math.random() * 0.014,
          color: new THREE.Color(1.0, 0.36, 0.06),
          colorEnd: new THREE.Color(0.9, 0.09, 0.01),
          drag: 1.3,
          gravity: 11,
          kind: PKind.Spark,
          collides: true,
          emissive: 2.2,
          stretch: 0.5,
          fadeIn: 0,
          fadePow: 0.6,
        });
      }
    }

    // ---- debris ------------------------------------------------------------
    for (let i = 0; i < Math.round(look.debris * b); i++) {
      const dir = normal.clone()
        .addScaledVector(reflected, 0.3)
        .addScaledVector(randomUnit(this._v2), 0.8)
        .normalize();
      this.field.spawn({
        position: point.clone().addScaledVector(normal, 0.02),
        velocity: dir.multiplyScalar(2.4 + Math.random() * 5),
        maxLife: 1.0 + Math.random() * 1.1,
        size: 0.014 + Math.random() * 0.032,
        color: look.puff.clone().multiplyScalar(0.62),
        drag: 0.45,
        gravity: 15,
        rotationSpeed: (Math.random() - 0.5) * 16,
        kind: PKind.Debris,
        collides: true,
        fadeIn: 0,
        fadePow: 4,
      });
    }

    if (look.sparks > 0.5) {
      this.lighting.spawnLight(
        point.clone().addScaledVector(normal, 0.12),
        0xffb060,
        Math.max(4, this.ctx.engine.pipeline.sunIntensity * 0.9),
        4,
        0.085,
        'flash',
      );
    }

    Signals.emit('audio:oneshot', { id: look.sound, position: point.clone(), volume: 0.75 });
  }

  /**
   * Flesh hits. A round leaves a body along its own axis, so the spray is a
   * tight cone downrange of the wound rather than a symmetric puff — that
   * directionality is the whole of the feedback, because it tells the player
   * from across the street which way the target was facing when it connected.
   */
  private fleshHit(point: THREE.Vector3, normal: THREE.Vector3, incoming: THREE.Vector3): void {
    const b = this.budget;
    // Blood is a dark, very saturated liquid, not a paint. Authored at 0.42
    // it came off a sunlit wall at pure primary red — the brightest, most
    // saturated thing anywhere in the frame, which is neither tasteful nor
    // what a camera records.
    const arterial = new THREE.Color(0.22, 0.016, 0.011);
    const dark = new THREE.Color(0.085, 0.007, 0.006);

    // The mist. Kept to the exit side and to the first tenth of a second: a
    // cloud hanging around the target is both wrong and tasteless, whereas a
    // brief dark puff on the far side of a hit is the read the player needs
    // and is gone before it can be dwelt on.
    for (let i = 0; i < Math.round(11 * b); i++) {
      const dir = incoming.clone()
        .addScaledVector(randomUnit(this._v2), 0.85)
        .addScaledVector(normal, -0.25)
        .normalize();
      this.field.spawn({
        position: point.clone().addScaledVector(incoming, 0.06),
        velocity: dir.multiplyScalar(1.4 + Math.random() * 3.6),
        maxLife: 0.26 + Math.random() * 0.3,
        size: 0.10 + Math.random() * 0.14,
        grow: 0.7,
        // Well under the arterial colour the droplets use. This is a *smoke*
        // particle, so the shader runs a full scattering solve on it and
        // multiplies a sunlit street's radiance into whatever albedo it is
        // given: authored above the surrounding surfaces it came out as a
        // bright pink cloud, which is both wrong and the single most
        // conspicuous thing in the frame. Blood mist in daylight is a dark,
        // low-contrast haze.
        color: arterial.clone().multiplyScalar(0.40),
        colorEnd: dark,
        opacity: 0.5,
        drag: 5.2,
        gravity: 3.0,
        rotationSpeed: (Math.random() - 0.5) * 4,
        kind: PKind.Smoke,
        turbulence: 0.3,
        shade: 1.0,
        fadeIn: 0.01,
      });
    }

    // Droplets carried downrange along the bullet's line. The count and the
    // spread are the whole of the feedback: seven droplets in a tight cone is
    // indistinguishable at twenty metres from no effect at all, which is the
    // range most of these are seen from.
    for (let i = 0; i < Math.round(24 * b); i++) {
      const wide = i % 3 === 0;
      const dir = incoming.clone()
        .addScaledVector(randomUnit(this._v2), wide ? 0.75 : 0.34)
        .normalize();
      this.field.spawn({
        position: point.clone().addScaledVector(incoming, 0.05),
        velocity: dir.multiplyScalar((wide ? 2 : 4) + Math.random() * 11),
        maxLife: 0.5 + Math.random() * 0.7,
        size: 0.03 + Math.random() * 0.07,
        color: arterial,
        colorEnd: dark,
        opacity: 0.95,
        drag: 1.1,
        gravity: 13,
        kind: PKind.Blood,
        collides: true,
        stretch: 0.45,
        fadeIn: 0,
        fadePow: 3.5,
      });
    }

    // Two or three long threads on the exit line. Droplets alone read as a
    // scatter of dots; it is the streaks that say a round went through
    // something and carried it out the other side.
    for (let i = 0; i < Math.round(4 * b); i++) {
      const dir = incoming.clone()
        .addScaledVector(randomUnit(this._v2), 0.16)
        .normalize();
      this.field.spawn({
        position: point.clone().addScaledVector(incoming, 0.08),
        velocity: dir.multiplyScalar(9 + Math.random() * 9),
        maxLife: 0.28 + Math.random() * 0.22,
        size: 0.022 + Math.random() * 0.02,
        color: arterial.clone().multiplyScalar(1.2),
        colorEnd: dark,
        opacity: 0.9,
        drag: 2.2,
        gravity: 9,
        kind: PKind.Blood,
        stretch: 1.5,
        fadeIn: 0,
        fadePow: 2.4,
      });
    }

    // A wound decal on the body, and spatter on whatever is behind it. Both
    // are aligned to the round's line so the mark on the wall reads as cast
    // off *by* the hit rather than as a stamp that happened to land there.
    this.decals?.spawn(point, normal, 2, 0.18 + Math.random() * 0.12, arterial, 24, incoming, 1.0);
    const behind = this.physics.trace(
      this._v3.copy(point).addScaledVector(incoming, 0.12),
      incoming,
      3.4,
    );
    if (behind.hit) {
      const wall = new THREE.Vector3(behind.normal.x, behind.normal.y, behind.normal.z);
      this.decals?.spawn(
        new THREE.Vector3(behind.point.x, behind.point.y, behind.point.z),
        wall,
        2,
        0.40 + Math.random() * 0.40,
        arterial,
        34,
        incoming,
        1.7,
      );
    }
  }

  /**
   * The aftermath of a kill: a pool that spreads under the body over the first
   * few seconds.
   *
   * A corpse with no mark on the ground under it is the detail that most
   * reliably gives away a game with no gore budget, and it is nearly free —
   * three decals on a timer, each larger and offset a little downhill of the
   * last, read as liquid finding its level. Spawning one big stamp at the
   * moment of death does not: it appears fully formed while the body is still
   * falling, which is the one thing blood never does.
   */
  private bleedOut(wound: THREE.Vector3): void {
    const down = this.physics.trace(this._v.copy(wound).addScaledVector(UP_ONE, 0.15), DOWN, 2.6);
    if (!down.hit) return;
    const floor = new THREE.Vector3(down.point.x, down.point.y, down.point.z);
    const normal = new THREE.Vector3(down.normal.x, down.normal.y, down.normal.z);
    const drift = new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).normalize();
    const pool = new THREE.Color(0.17, 0.011, 0.008);
    for (let i = 0; i < 3; i++) {
      const f = i / 2;
      this.later(0.35 + i * 0.9, () => {
        this.decals?.spawn(
          floor.clone().addScaledVector(drift, f * 0.22),
          normal,
          2,
          0.34 + f * 0.42,
          pool,
          52 + i * 7,
          drift,
          1.0 + f * 0.5,
        );
      });
    }
  }

  // -------------------------------------------------------- muzzle flash ---

  private muzzleFlash(muzzle: THREE.Vector3, direction: THREE.Vector3, silenced: boolean): void {
    const scale = silenced ? 0.3 : 1;
    const b = this.budget;
    const dir = direction.clone().normalize();
    const side = this._v2.set(0, 1, 0).cross(dir).normalize();
    if (!Number.isFinite(side.x) || side.lengthSq() < 0.1) side.set(1, 0, 0);

    // Three or four frames of white-hot gas at the crown, then it is gone.
    // A real flash is under a millisecond and the instinct is to author it at
    // two frames, but the composite runs temporal anti-aliasing: an effect
    // that exists in two frames out of the history buffer's window is blended
    // against several that do not have it, and measured off a capture the
    // brightest pixel of a 40 ms flash came back at half the radiance the
    // shader emitted. Held to about 55 ms it survives the resolve, and that is
    // still short enough to read as a gunshot rather than as a flare.
    this.field.spawn({
      position: muzzle.clone().addScaledVector(dir, 0.03),
      maxLife: 0.055,
      // The quad, not the flash. Only the star's arms are drawn inside it and
      // they reach about six tenths of its radius, so the mark on screen is
      // roughly a third of this across — trimmed to 0.36 in the same pass that
      // sharpened the star, the two changes compounded and a carbine's muzzle
      // flash came out fifteen pixels wide at three metres.
      size: 0.52 * scale,
      color: new THREE.Color(1.0, 0.135, 0.010),
      kind: PKind.Flash,
      emissive: silenced ? 8 : 40,
      fadeIn: 0,
      fadePow: 0.9,
    });
    // A second star on the same crown at its own random orientation. One
    // sprite gives a shape that is lopsided but *fixed*; crossing two of them
    // is what stops consecutive shots from stamping the same asterisk.
    this.field.spawn({
      position: muzzle.clone().addScaledVector(dir, 0.05),
      maxLife: 0.044,
      size: 0.35 * scale,
      color: new THREE.Color(1.0, 0.190, 0.020),
      kind: PKind.Flash,
      emissive: silenced ? 6 : 30,
      fadeIn: 0,
      fadePow: 0.8,
    });

    // The gas cone. Propellant leaving a rifle is still burning for a couple
    // of hundred millimetres past the crown, and that plume down the bore line
    // is what makes a flash read as coming *out* of a barrel rather than
    // being a lamp stuck on the end of one.
    if (!silenced) {
      for (let i = 0; i < 3; i++) {
        const f = (i + 1) / 3;
        this.field.spawn({
          position: muzzle.clone().addScaledVector(dir, 0.06 + f * 0.20),
          maxLife: 0.042 + f * 0.016,
          size: (0.17 - f * 0.08) * scale,
          color: new THREE.Color(1.0, 0.22 - f * 0.10, 0.03 - f * 0.02),
          kind: PKind.Flash,
          emissive: 20 - f * 12,
          fadeIn: 0,
          fadePow: 0.8,
        });
      }
    }

    // Expanding propellant gas: a short jet that cools from white to orange
    // to nothing inside a tenth of a second.
    if (!silenced) {
      // Small and brief. Growing these at three metres a second over a tenth
      // of a second put a half-metre ball of opaque burning gas on the end of
      // the barrel — isolated on the fire layer it was the largest single
      // object in the frame, and in the composite it was the flat olive lozenge
      // hanging off every shot. Propellant leaving a carbine is a hand-sized
      // puff that is dark before it has travelled its own length.
      for (let i = 0; i < Math.round(6 * b); i++) {
        const jet = dir.clone()
          .addScaledVector(randomUnit(this._v3), 0.26)
          .normalize();
        this.field.spawn({
          position: muzzle.clone().addScaledVector(dir, 0.02 + Math.random() * 0.05),
          velocity: jet.multiplyScalar(7 + Math.random() * 14),
          maxLife: 0.042 + Math.random() * 0.035,
          size: 0.035 + Math.random() * 0.05,
          grow: 0.85,
          color: new THREE.Color(1, 0.7, 0.35),
          kind: PKind.Fire,
          emissive: 0.85,
          drag: 9,
          buoyancy: 3,
          opacity: 0.6,
          fadeIn: 0,
          fadePow: 1.6,
        });
      }
      // Sideways blast from the brake ports.
      for (let i = 0; i < 2; i++) {
        const s = i === 0 ? 1 : -1;
        this.field.spawn({
          position: muzzle.clone().addScaledVector(dir, 0.02),
          velocity: side.clone().multiplyScalar(s * (5 + Math.random() * 4)).addScaledVector(dir, 3),
          maxLife: 0.04,
          size: 0.045,
          grow: 1.1,
          color: new THREE.Color(1, 0.66, 0.3),
          kind: PKind.Fire,
          emissive: 0.8,
          drag: 12,
          opacity: 0.55,
          fadeIn: 0,
          fadePow: 1.6,
        });
      }
    }

    // Unburnt powder. Deliberately thin: a rifle throws a wisp, and the
    // temptation to make it read on a still is what turns a burst into a
    // bonfire — four shots' worth of it and the shooter is standing in a
    // smokescreen with a white cloud where his flash should be.
    for (let i = 0; i < Math.round((silenced ? 8 : 4) * b); i++) {
      const jet = dir.clone().addScaledVector(randomUnit(this._v3), 0.38).normalize();
      this.field.spawn({
        position: muzzle.clone(),
        velocity: jet.multiplyScalar(2 + Math.random() * 4.5),
        maxLife: 0.4 + Math.random() * 0.55,
        size: 0.055 + Math.random() * 0.075,
        grow: 0.62,
        // Propellant smoke is a light grey *object*, and the shader puts most
        // of the sun's radiance through whatever albedo it is handed: authored
        // at the 0.55 a grey card measures, it came out of the tonemap as a
        // clipped white puff hanging off the muzzle and read as steam.
        // Isolated on the smoke layer alone this was a pale peach cloud half a
        // metre across hanging off the barrel — brighter than the sunlit wall
        // behind it, which no quantity of smoke ever is. The albedo is what
        // was wrong: the scattering solve puts most of a desert sun through
        // it, and the frame is then metered up a further stop on top.
        color: new THREE.Color(0.085, 0.083, 0.082),
        colorEnd: new THREE.Color(0.062, 0.062, 0.065),
        opacity: silenced ? 0.30 : 0.13,
        drag: 4.2,
        buoyancy: 1.1,
        rotationSpeed: (Math.random() - 0.5) * 4,
        kind: PKind.Smoke,
        turbulence: 1.1,
        shade: 1,
        fadeIn: 0.02,
      });
    }

    if (!silenced) {
      for (let i = 0; i < Math.round(6 * b); i++) {
        const jet = dir.clone().addScaledVector(randomUnit(this._v3), 0.5).normalize();
        this.field.spawn({
          position: muzzle.clone(),
          velocity: jet.multiplyScalar(7 + Math.random() * 11),
          maxLife: 0.1 + Math.random() * 0.2,
          size: 0.014,
          color: new THREE.Color(1.0, 0.34, 0.055),
          colorEnd: new THREE.Color(0.8, 0.10, 0.012),
          drag: 2.2,
          gravity: 7,
          kind: PKind.Spark,
          emissive: 1.5,
          stretch: 0.34,
          fadeIn: 0,
          fadePow: 0.7,
        });
      }
    }

    // The light has to be referenced to the sun or it disappears at noon and
    // blinds at night. Six times the beam at a metre is about right for a
    // rifle: it visibly bounces off a wall you are standing next to in
    // daylight, without turning the street white.
    const sun = this.ctx.engine.pipeline.sunIntensity;
    this.lighting.spawnLight(
      muzzle.clone().addScaledVector(dir, 0.3),
      0xffc078,
      silenced ? Math.max(3, sun * 0.6) : Math.max(40, sun * 8),
      silenced ? 6 : 20,
      0.055,
      'flash',
    );
  }

  // ---------------------------------------------------------- explosions ---

  /** Spawns a staged detonation. `radius` is the damage radius in metres. */
  explosion(position: THREE.Vector3, radius: number, scale: number): void {
    const b = this.budget;
    const s = Math.max(0.4, scale);
    const r = radius;
    const pos = position.clone();
    const sun = this.ctx.engine.pipeline.sunIntensity;
    const sunDir = this.ctx.engine.pipeline.sunDirection;

    // Ground colour, so a blast on sand throws sand and a blast on tarmac
    // throws grey. Sampled by tracing down from the seat of the explosion.
    const down = this.physics.trace(this._v.copy(pos).setY(pos.y + 0.5), DOWN, 4);
    const groundLook = SURFACE_LOOK[down.hit ? down.surface : 'sand'] ?? SURFACE_LOOK.sand;
    const dust = groundLook.puff.clone();
    const groundY = down.hit ? down.point.y : pos.y;
    const nearGround = pos.y - groundY < r * 0.7;

    // Fresh detonation smoke is soot: near-black, and it only lightens as it
    // entrains air on the way up. Authoring it grey is the reason most
    // home-made explosions read as a dust puff instead of a blast.
    //
    // These are albedos, and the shader multiplies about four into them on the
    // sunlit side, so anything much above 0.3 comes out of the tonemap as
    // white. A plume that had aged to 0.6 was rendering as a bank of steam
    // over the whole street — the lightening with age is real, but it goes
    // from very dark to merely dark, not to bright.
    // Lampblack is a 0.04 albedo. Detonation smoke is not pure carbon — it
    // entrains whatever the blast lifted off the ground — but it is far closer
    // to that than to the 0.19 this used to carry, which is a grey card, and
    // a grey card in direct sun is *supposed* to photograph as middle grey.
    // That is how a plume of soot ended up the same value as the sandstone
    // behind it and read as a stain on the frame rather than as an object in
    // front of it.
    const soot = new THREE.Color(0.030, 0.027, 0.025).lerp(dust, 0.035);
    const sootOld = new THREE.Color(0.135, 0.128, 0.121).lerp(dust, 0.16);

    // ---- 0 ms: detonation flash -------------------------------------------
    // Small and brief on purpose. Sized to the blast radius and given the
    // emissive an explosion deserves, the additive flash is so much brighter
    // than the fireball behind it that it erases it: a detonation photographed
    // at forty milliseconds came out as a plain white cloud with no fire in it
    // anywhere. The flash's job is two frames of overexposure at the seat of
    // the blast — the fireball is what the frame after that is made of.
    this.field.spawn({
      position: pos.clone(),
      maxLife: 0.042,
      size: r * 0.5 * s,
      color: new THREE.Color(1.0, 0.240, 0.030),
      kind: PKind.Flash,
      emissive: 22 * s,
      fadeIn: 0,
      fadePow: 1.4,
    });
    this.field.spawn({
      position: pos.clone(),
      maxLife: 0.085,
      size: r * 0.3 * s,
      color: new THREE.Color(1.0, 0.160, 0.014),
      kind: PKind.Flash,
      emissive: 10 * s,
      fadeIn: 0,
      fadePow: 1.6,
    });
    // No drawn shock front. A compression wave is a refraction of the world
    // behind it, and every attempt to stand in for that with an additive shell
    // put a hard white hoop across the street — a ten-metre plastic dome that
    // was, by some distance, the worst thing in the frame. What actually sells
    // the overpressure is the dust ring leaving the ground below, so that is
    // all that is left of it.
    this.lighting.spawnLight(
      pos.clone().add(UP_HALF),
      0xffc074,
      Math.max(120, sun * 24) * s,
      r * 8,
      0.09,
      'flash',
    );
    // The fireball as a light source for the smoke it is producing. Without
    // this the column stays sky-grey while the fire it is made of burns
    // inside it.
    this.pushHotspot({
      position: pos.clone().addScaledVector(UP_ONE, r * 0.25),
      color: new THREE.Color(1.0, 0.42, 0.13),
      intensity: 2.2 * s,
      radius: r * 2.2,
      life: 0.45,
      maxLife: 0.45,
    });

    // ---- 0-40 ms: fireball -------------------------------------------------
    // Hot in the middle, cooling toward the skin. Authoring every parcel at
    // the same temperature is what turns a fireball into a white disc: the
    // outer shell has to already be dropping into the oranges while the core
    // is still clipping, or there is no shape to see.
    // Deliberately outnumbered by the soot below. High-speed footage of a real
    // detonation at a tenth of a second is a dense, near-black mass with fire
    // showing through the gaps in it and burning out of the base — not a
    // glowing ball. Authoring it the other way round is what produced a frame
    // where a bright orange sphere at fourteen metres tinted an entire street
    // salmon through the bloom, which is a self-inflicted wound: the fix is
    // not a weaker fireball, it is a fireball with smoke in front of it.
    const fireCount = Math.round(64 * b * s);
    for (let i = 0; i < fireCount; i++) {
      const dir = randomUnit(new THREE.Vector3());
      dir.y = dir.y * 0.7 + 0.30;
      dir.normalize();
      // Stratified rather than random so the core is guaranteed to be filled:
      // scattering the depth uniformly leaves gaps that read as a hollow
      // shell of flame with daylight showing through the middle of the blast.
      const depth = (i + 0.5) / fireCount;
      const shell = depth ** 0.65;
      // Compact. The previous spread put the outermost parcels 2.5 m from the
      // seat before they had moved at all and then threw them outward at
      // twenty-six metres a second, so a tenth of a second in the ball was
      // nine metres across and forty sprites had to cover it — measured off a
      // capture, the middle of the fireball was letting fifty-five per cent of
      // the sunlit wall behind it through, and a half-transparent orange over
      // grey masonry is precisely the salmon the last six passes kept chasing
      // through the colour ramp. A fireball is opaque. It gets that way by
      // being small enough for the sprites it is made of to overlap.
      this.field.spawn({
        position: pos.clone().addScaledVector(dir, shell * r * 0.16),
        velocity: dir.clone().multiplyScalar((1.5 + shell * 7 + Math.random() * 2.5) * s),
        delay: Math.random() * 0.025,
        // Short. A charge this size is luminous for a couple of tenths of a
        // second and is soot for the rest of the event; parcels still glowing
        // half a second later turn what should be a dark rising column into a
        // lantern, which is the one thing that stops a detonation reading as a
        // sequence rather than as a light that fades.
        maxLife: 0.30 + (1 - shell) * 0.30 + Math.random() * 0.12,
        size: r * 0.34 * (0.62 + Math.random() * 0.5),
        grow: r * 0.62,
        color: soot,
        opacity: 0.97,
        drag: 3.0,
        buoyancy: 12,
        rotationSpeed: (Math.random() - 0.5) * 4,
        kind: PKind.Fire,
        // The *distribution* of heat across the ball, which matters far more
        // than its level and took three captures to get right.
        //
        // Authored low, every parcel landed in the maroon end of the ramp and
        // the ball was rust-coloured; tripled, the bulk of it cleared the tone
        // curve's shoulder together and the ball was a white hole in the
        // frame. The reason neither works is a hard property of this display
        // transform: solved numerically against it, the most saturated orange
        // it can reproduce sits around 0.4 linear, and there is no input at all
        // that renders as a *bright* saturated orange — past about 1.5
        // everything is cream. Fire that reads as fire here has to be mostly
        // deep red with a small fraction of clipping cores torn through it,
        // which is also what high-speed footage of HE actually shows.
        //
        // The random term does the work, and it has to be uncorrelated with
        // depth: sorted alpha compositing only ever draws the near side of the
        // ball, so a temperature authored purely by radius shows its coolest
        // shell and hides every hot parcel behind it. A fifth power puts the
        // median parcel near a fifth of the ramp, one in ten at amber and one
        // in fifty clipping.
        emissive: 0.26 + 0.22 * (1 - shell) ** 2 + 1.10 * Math.random() ** 5.0,
        turbulence: 1.6,
        shade: plumeShade(dir, sunDir),
        fadeIn: 0.006,
        fadePow: 1.7,
      });
    }
    // The soot skin, forming on the outside of the ball almost immediately.
    // This is the part that actually carries the shape of a detonation: a
    // hard, dark, ragged edge with the fire behind it, rather than a glowing
    // halo with nothing to stop it.
    // The seat of the blast: a few parcels held at the top of the ramp for the
    // first tenth of a second. Spread across the whole ball, the fraction of
    // parcels hot enough to clip is either too small to find (one in fifty of
    // sixty-four is less than one) or, if the distribution is widened until it
    // is reliable, large enough to bleach the ball. A handful of dedicated
    // ones costs nothing and puts the clipping core where a detonation
    // actually has it — at the bottom centre, where the charge was.
    for (let i = 0; i < Math.round(6 * b * s); i++) {
      const dir = randomUnit(new THREE.Vector3());
      dir.y = dir.y * 0.5 + 0.22;
      dir.normalize();
      this.field.spawn({
        position: pos.clone().addScaledVector(dir, r * 0.07),
        velocity: dir.clone().multiplyScalar((2 + Math.random() * 4) * s),
        maxLife: 0.38 + Math.random() * 0.12,
        size: r * 0.085 * (0.7 + Math.random() * 0.5),
        grow: r * 0.34,
        color: soot,
        opacity: 0.98,
        drag: 3.4,
        buoyancy: 10,
        rotationSpeed: (Math.random() - 0.5) * 4,
        kind: PKind.Fire,
        // Well past the top of the ramp, so these are still clipping a fifth
        // of a second in and are deep orange by a third. Authored just under
        // it they spent their whole life in the cream band instead, which put
        // a large pale patch at the seat of the blast — brighter than the
        // fireball around it but not hot enough to read as a core.
        emissive: 2.6 + Math.random() * 1.4,
        turbulence: 1.2,
        shade: 1,
        fadeIn: 0,
        fadePow: 1.4,
      });
    }

    // Outnumbering the fire, and starting closer in. What separates footage of
    // a real detonation from a rendered one at this age is not the colour of
    // the fire — it is how little of the fire you can see. The soot is in
    // front, and the fire is the light coming through the gaps between it.
    const skinCount = Math.round(52 * b * s);
    for (let i = 0; i < skinCount; i++) {
      const dir = randomUnit(new THREE.Vector3());
      dir.y = dir.y * 0.6 + 0.32;
      dir.normalize();
      const lit = plumeShade(dir, sunDir);
      this.field.spawn({
        position: pos.clone().addScaledVector(dir, r * (0.14 + Math.random() * 0.26)),
        velocity: dir.clone().multiplyScalar((5 + Math.random() * 8) * s),
        delay: 0.004 + Math.random() * 0.040,
        maxLife: 0.75 + Math.random() * 0.6,
        size: r * 0.21 * (0.7 + Math.random() * 0.6),
        grow: r * 0.24,
        color: soot,
        colorEnd: sootOld,
        opacity: 0.97,
        drag: 2.6,
        buoyancy: 7,
        rotationSpeed: (Math.random() - 0.5) * 3,
        kind: PKind.Smoke,
        turbulence: 2.0,
        shade: lit * 0.75,
        shadeEnd: lit,
        fadeIn: 0.012,
        fadePow: 1.8,
      });
    }
    // A handful of jets punching out of the ball, which is what stops a
    // fireball from being a sphere.
    for (let i = 0; i < Math.round(6 * b * s); i++) {
      const dir = randomUnit(new THREE.Vector3());
      dir.y = Math.abs(dir.y) * 0.9 + 0.15;
      dir.normalize();
      this.field.spawn({
        position: pos.clone(),
        velocity: dir.clone().multiplyScalar((24 + Math.random() * 24) * s),
        delay: Math.random() * 0.025,
        maxLife: 0.3 + Math.random() * 0.28,
        size: r * 0.15,
        grow: r * 0.85,
        color: soot,
        opacity: 0.92,
        drag: 4.5,
        buoyancy: 9,
        kind: PKind.Fire,
        emissive: 0.85,
        turbulence: 2.2,
        shade: plumeShade(dir, sunDir),
        fadeIn: 0,
        fadePow: 1.5,
      });
    }

    // ---- 20 ms: ground shockwave and base surge ----------------------------
    if (nearGround) {
      // The overpressure sheet leaving the ground. Sized to the crater, not to
      // the street: at a growth of nearly three radii a second this reached
      // nineteen metres across inside a second and laid a flat brown wash over
      // the entire frame — every surface in the shot came back a stop down and
      // a quarter more saturated, which reads as a dirty lens rather than as a
      // blast. A shock ring is a *ring*; what makes it read is the speed of
      // its leading edge, not the area it covers.
      this.field.spawn({
        position: new THREE.Vector3(pos.x, groundY + 0.06, pos.z),
        maxLife: 0.62,
        delay: 0.02,
        size: r * 0.5 * s,
        grow: r * 1.35,
        color: dust.clone().multiplyScalar(0.34),
        colorEnd: dust.clone().multiplyScalar(0.22),
        opacity: 0.55,
        rotationSpeed: (Math.random() - 0.5) * 0.4,
        kind: PKind.ShockRing,
        fadeIn: 0.03,
        fadePow: 1.7,
      });

      const ringCount = Math.round(20 * b * s);
      for (let i = 0; i < ringCount; i++) {
        const a = (i / ringCount) * Math.PI * 2 + Math.random() * 0.35;
        const dir = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
        this.field.spawn({
          position: new THREE.Vector3(pos.x, groundY + 0.12, pos.z).addScaledVector(dir, r * 0.15),
          velocity: dir.clone().multiplyScalar((13 + Math.random() * 12) * s),
          delay: 0.03 + Math.random() * 0.04,
          maxLife: 1.0 + Math.random() * 1.1,
          size: r * 0.20 * (0.7 + Math.random() * 0.6),
          grow: r * 0.20,
          // Kicked-up sand is bright, but it is not four times over white:
          // taking the surface colour neat and running it through a sun this
          // strong turned the whole dust ring into a clipped sheet with no
          // form in it at all.
          color: dust.clone().multiplyScalar(0.30 + Math.random() * 0.10),
          colorEnd: dust.clone().multiplyScalar(0.22),
          opacity: 0.42,
          drag: 3.4,
          gravity: 0.4,
          rotationSpeed: (Math.random() - 0.5) * 1.6,
          kind: PKind.GroundDust,
          turbulence: 1.0,
          shade: 0.7 + Math.random() * 0.3,
          shadeEnd: 1.0,
          fadeIn: 0.05,
        });
      }
    }

    // ---- 30-120 ms: debris, sparks, embers ---------------------------------
    for (let i = 0; i < Math.round(24 * b * s); i++) {
      const dir = randomUnit(new THREE.Vector3());
      dir.y = Math.abs(dir.y) * 1.1 + 0.25;
      dir.normalize();
      this.field.spawn({
        position: pos.clone().addScaledVector(dir, r * 0.2),
        velocity: dir.multiplyScalar((8 + Math.random() * 20) * s),
        delay: 0.02 + Math.random() * 0.05,
        maxLife: 1.6 + Math.random() * 1.6,
        size: 0.035 + Math.random() * 0.1,
        color: dust.clone().multiplyScalar(0.42),
        drag: 0.35,
        gravity: 17,
        rotationSpeed: (Math.random() - 0.5) * 22,
        kind: PKind.Debris,
        collides: true,
        fadeIn: 0,
        fadePow: 5,
      });
    }
    for (let i = 0; i < Math.round(18 * b * s); i++) {
      const dir = randomUnit(new THREE.Vector3());
      dir.y = Math.abs(dir.y) * 0.9 + 0.1;
      this.field.spawn({
        position: pos.clone(),
        velocity: dir.normalize().multiplyScalar((14 + Math.random() * 30) * s),
        delay: Math.random() * 0.04,
        maxLife: 0.35 + Math.random() * 0.75,
        size: 0.022,
        color: new THREE.Color(1.0, 0.66, 0.24),
        colorEnd: new THREE.Color(0.85, 0.15, 0.02),
        drag: 1.0,
        gravity: 12,
        kind: PKind.Spark,
        emissive: 6,
        stretch: 0.8,
        fadeIn: 0,
        fadePow: 0.7,
      });
    }
    for (let i = 0; i < Math.round(10 * b * s); i++) {
      const dir = randomUnit(new THREE.Vector3());
      dir.y = Math.abs(dir.y) + 0.3;
      this.field.spawn({
        position: pos.clone(),
        velocity: dir.normalize().multiplyScalar((3 + Math.random() * 9) * s),
        delay: 0.05 + Math.random() * 0.2,
        maxLife: 1.4 + Math.random() * 2.2,
        size: 0.035 + Math.random() * 0.03,
        color: new THREE.Color(1.0, 0.30, 0.045),
        colorEnd: new THREE.Color(0.6, 0.05, 0.006),
        drag: 1.6,
        gravity: 3.2,
        buoyancy: 2.4,
        kind: PKind.Ember,
        emissive: 1.3,
        turbulence: 1.4,
        fadeIn: 0.05,
        fadePow: 1.4,
      });
    }

    // ---- 120-500 ms: the column --------------------------------------------
    // Deliberately late. Smoke that appears on the same frame as the flash is
    // the single loudest tell that an explosion was spawned rather than
    // detonated: in reality the soot is a *product* of the fireball, so it has
    // to arrive behind it and keep arriving for a while.
    // Authored as a *column*, not a cloud. Sideways velocity, generous growth
    // and heavy turbulence between them turned two seconds of smoke into a
    // twenty-metre bank of fog lying across the street; a real plume is
    // narrow, taller than it is wide, and keeps a recognisable stack shape
    // for as long as it is worth looking at.
    const smokeCount = Math.round(78 * b * s);
    for (let i = 0; i < smokeCount; i++) {
      const f = i / smokeCount;
      const dir = randomUnit(new THREE.Vector3());
      // Which side of the column a parcel is on, kept before the launch
      // direction is folded upward. Shading off the launch direction instead
      // is a trap: once the column is authored to actually rise, every parcel
      // in it points within thirty degrees of straight up, every one of them
      // scores as fully sunlit, and the whole plume flattens into one evenly
      // exposed sheet — which is the difference between smoke and fog.
      const across = this._v2.set(dir.x, dir.y * 0.3, dir.z).normalize();
      // Parcels launched first end up at the top of the stack, in clear air;
      // the ones still arriving are down inside the shadow of everything
      // above them.
      const lit = plumeShade(across, sunDir) * (1 - 0.34 * f);
      dir.x *= 0.45;
      dir.z *= 0.45;
      dir.y = Math.abs(dir.y) * 2.0 + 0.85;
      dir.normalize();
      this.field.spawn({
        position: pos.clone().addScaledVector(dir, Math.random() * r * 0.26),
        velocity: dir.clone().multiplyScalar((2.0 + Math.random() * 4.0) * s),
        delay: 0.11 + f * 0.36 + Math.random() * 0.1,
        maxLife: 3.2 + Math.random() * 3.2,
        // Small enough that the plume is *made of* puffs. A parcel authored at
        // a third of the blast radius and grown at an eighth of it per second
        // ends its life seven metres across, which is the entire column: one
        // sprite covers the silhouette and the outline it presents is the
        // outline of that sprite. Twice as many at half the size costs the
        // same fill and gives the stack an edge with lobes in it.
        size: r * 0.185 * (0.6 + Math.random() * 0.75),
        grow: r * 0.075,
        color: soot,
        colorEnd: sootOld,
        // Varied per puff so the stack never resolves into one flat sheet of
        // uniform density, and high enough that the middle of the column is
        // genuinely opaque: a plume you can read a building through is a haze,
        // whatever colour it is.
        opacity: 0.74 + Math.random() * 0.26,
        drag: 1.35,
        buoyancy: 4.6,
        rotationSpeed: (Math.random() - 0.5) * 1.1,
        kind: PKind.Smoke,
        turbulence: 0.85,
        // Deep in the column the smoke shadows itself; whichever side of the
        // plume the sun is on is the side that catches it.
        shade: lit,
        shadeEnd: Math.min(1, lit + 0.25),
        fadeIn: 0.16,
        fadePow: 2.2,
      });
    }

    // Dirty base surge that hangs at ground level after the column has left.
    if (nearGround) {
      for (let i = 0; i < Math.round(10 * b * s); i++) {
        const a = Math.random() * Math.PI * 2;
        const d = r * (0.2 + Math.random() * 0.7);
        const dir = new THREE.Vector3(Math.cos(a), 0.25, Math.sin(a)).normalize();
        this.field.spawn({
          position: new THREE.Vector3(pos.x + Math.cos(a) * d, groundY + 0.3 + Math.random() * 0.6, pos.z + Math.sin(a) * d),
          velocity: new THREE.Vector3(Math.cos(a) * 1.6, 0.5 + Math.random(), Math.sin(a) * 1.6),
          delay: 0.2 + Math.random() * 0.5,
          maxLife: 3.5 + Math.random() * 3,
          size: r * 0.42,
          grow: r * 0.22,
          color: dust.clone().multiplyScalar(0.16),
          colorEnd: dust.clone().multiplyScalar(0.34),
          opacity: 0.44,
          drag: 1.2,
          buoyancy: 0.9,
          rotationSpeed: (Math.random() - 0.5) * 0.7,
          kind: PKind.Smoke,
          turbulence: 1.1,
          shade: plumeShade(dir, sunDir) * 0.85,
          shadeEnd: 1.0,
          fadeIn: 0.3,
          fadePow: 2.0,
        });
      }
    }

    // ---- staged light ------------------------------------------------------
    this.later(0.06, () => {
      this.lighting.spawnLight(
        pos.clone().add(UP_ONE),
        0xff8c34,
        Math.max(40, sun * 7) * s,
        r * 5,
        0.85,
        'flicker',
      );
    });

    // ---- volumetric smoke --------------------------------------------------
    // One small ellipsoid at the foot of the column, and only as a *garnish*.
    //
    // The fog pass composites against the depth of the solid world, so a
    // volume in front of the plume also lies in front of every particle in it
    // and cannot be occluded by them. Sized to the plume it therefore stops
    // being the smoke's participating medium and becomes a smooth, radially
    // graded sheet hung over everything behind it — a twenty-metre veil with
    // no structure in it, which is precisely what a raymarched ellipsoid
    // looks like and precisely what was drowning three detonations and an
    // entire triumphal arch. Kept down to the dense core it does the one job
    // billboards genuinely cannot: it takes a shaft of sun across the base of
    // the column.
    this.pushSmokeVolume({
      x: pos.x, y: pos.y + r * 0.4, z: pos.z,
      // Extinction per metre. At 0.014 across a three-metre core the volume
      // absorbed four per cent of what passed through it, which is nothing at
      // all — the pass was running for no visible return. Four times that is
      // still only about a sixth of a stop through the middle of it, which is
      // the level where it reads as the shaft of sun the billboards cannot
      // draw rather than as a sheet hung in front of them.
      radius: r * 0.5, density: 0, peak: 0.058 * s, ramp: 0.8, t: 0,
      seed: Math.random() * 100,
      age: 0, ttl: 6, maxTtl: 6, rise: 0.8, growth: 0.45,
    });
  }

  /**
   * Registers a fireball as a light on the particle field. The shader carries
   * a fixed handful, so a new blast displaces the dimmest rather than the
   * oldest — a grenade going off at the edge of frame must not steal the light
   * out of the airstrike filling the middle of it.
   */
  private pushHotspot(h: HotSpot): void {
    this.hotspots.push(h);
    while (this.hotspots.length > MAX_HOTSPOTS) {
      let weakest = 0;
      for (let i = 1; i < this.hotspots.length; i++) {
        if (this.hotspots[i].intensity < this.hotspots[weakest].intensity) weakest = i;
      }
      this.hotspots.splice(weakest, 1);
    }
  }

  private pushSmokeVolume(v: SmokeVolume): void {
    this.smokeVolumes.push(v);
    // The pass takes six. Drop the faintest rather than the oldest, so a fresh
    // blast never deletes the big column that is dominating the frame. Ranked
    // on what a volume is *heading* for, since one that has only just been
    // lit still has no density of its own to be judged on.
    while (this.smokeVolumes.length > 6) {
      let weakest = 0;
      for (let i = 1; i < this.smokeVolumes.length; i++) {
        const w = this.smokeVolumes[weakest];
        const c = this.smokeVolumes[i];
        if (Math.max(c.density, c.peak * 0.5) < Math.max(w.density, w.peak * 0.5)) weakest = i;
      }
      this.smokeVolumes.splice(weakest, 1);
    }
  }

  // ------------------------------------------------------------- casings ---

  private ejectCasing(position: THREE.Vector3, velocity: THREE.Vector3): void {
    if (!this.casingPool) return;
    if (this.casingBodies.length >= 48) this.casingBodies.shift();

    const body = new RigidBody();
    body.position.copy(position);
    body.velocity.copy(velocity);
    body.angularVelocity.set(
      (Math.random() - 0.5) * 34,
      (Math.random() - 0.5) * 34,
      (Math.random() - 0.5) * 34,
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
  }

  // -------------------------------------------------------------- update ---

  /**
   * Advances the whole effect system without rendering.
   *
   * The capture harness freezes the world a fixed number of ticks after the
   * scenario starts, so an effect can only ever be photographed at one age and
   * anything with a two-second tail is never seen at all. Stepping the
   * simulation forward here lets a review frame hold a detonation at 40 ms
   * next to one at two seconds. Simulation only — nothing here draws.
   */
  fastForward(seconds: number): void {
    const step = 1 / 60;
    let remaining = seconds;
    while (remaining > 1e-4) {
      const dt = Math.min(step, remaining);
      remaining -= dt;
      this.clock += dt;
      this.runQueue();
      this.field.simulate(dt, this.clock, this.wind, this.trace);
      this.ageVolumes(dt);
    }
  }

  private runQueue(): void {
    for (let i = this.queue.length - 1; i >= 0; i--) {
      if (this.queue[i].at <= this.clock) {
        const step = this.queue[i];
        this.queue.splice(i, 1);
        step.run();
      }
    }
  }

  update(dt: number, ctx: EngineContext): void {
    if (!this.decals) this.decals = ctx.get<DecalSystem>('decals') ?? null;
    this.clock += dt;
    this.runQueue();

    this.stage?.update(dt, ctx);

    this.field.simulate(dt, ctx.time.elapsed, this.wind, this.trace);
    this.field.publish(ctx.camera);

    this.ageHotspots(dt);

    this.solveLightingUniforms(ctx);

    // ---- casings -----------------------------------------------------------
    if (this.casingPool) {
      let c = 0;
      for (const body of this.casingBodies) {
        if (body.dead) continue;
        this._m.compose(body.position, body.quaternion, ONE);
        this.casingPool.setMatrixAt(c++, this._m);
      }
      this.casingPool.count = c;
      if (c > 0) this.casingPool.instanceMatrix.needsUpdate = true;
      this.casingBodies = this.casingBodies.filter((b) => !b.dead);
    }

    this.ageVolumes(dt);
    ctx.engine.pipeline.setSmokeVolumes(this.smokeVolumes);
  }

  private ageVolumes(dt: number): void {
    for (let i = this.smokeVolumes.length - 1; i >= 0; i--) {
      const v = this.smokeVolumes[i];
      v.ttl -= dt;
      v.t += dt;
      v.age = 1 - v.ttl / v.maxTtl;
      v.radius += dt * v.growth;
      v.y += dt * v.rise;
      v.x += dt * this.wind.x * 0.35;
      v.z += dt * this.wind.z * 0.35;
      // Fades up with the column rather than with the flash, then thins out.
      const rise = v.ramp > 0 ? Math.min(1, v.t / v.ramp) : 1;
      v.density = v.peak * rise * rise * Math.max(0, 1 - v.age) ** 1.5;
      if (v.ttl <= 0) this.smokeVolumes.splice(i, 1);
    }
  }

  /**
   * A fireball's light dies faster than the fireball does: the flame front is
   * opaque, so once the outside has cooled it stops illuminating anything even
   * though the smoke it produced is still climbing.
   */
  private ageHotspots(dt: number): void {
    for (let i = this.hotspots.length - 1; i >= 0; i--) {
      const h = this.hotspots[i];
      h.life -= dt;
      if (h.life <= 0) { this.hotspots.splice(i, 1); continue; }
      h.intensity *= Math.max(0, 1 - dt * 4.5);
      h.radius += dt * h.radius * 0.6;
    }
  }

  /**
   * Solves the particle shader's light rig from the same quantities the world
   * is lit by, so smoke is exposed correctly in every preset rather than
   * carrying a hand-tuned constant that only works at mid-morning.
   */
  private solveLightingUniforms(ctx: EngineContext): void {
    const pipeline = ctx.engine.pipeline;
    const sunDir = pipeline.sunDirection;

    // three's directional light is an irradiance, and a Lambert surface
    // re-emits it divided by PI; that is the radiance the smoke has to match.
    this.sunRadiance.copy(pipeline.sunColor).multiplyScalar(pipeline.sunIntensity / Math.PI);
    const sunLum = 0.2126 * this.sunRadiance.r + 0.7152 * this.sunRadiance.g + 0.0722 * this.sunRadiance.b;

    // Ambient comes from the same sun-to-sky ratio the renderer meters with.
    const ambLum = sunLum / Math.max(pipeline.sunOverAmbient, 0.05);
    const hemi = this.lighting.hemi;
    this._c2.copy(hemi.color).lerp(this._c.copy(hemi.groundColor), 0.4);
    const hueLum = Math.max(
      0.2126 * this._c2.r + 0.7152 * this._c2.g + 0.0722 * this._c2.b,
      1e-4,
    );
    this.ambientRadiance.copy(this._c2).multiplyScalar((ambLum * 1.25) / hueLum);

    // Radiance that the analytic exposure maps to display white.
    this.hdrUnit = THREE.MathUtils.clamp(1 / Math.max(pipeline.grade.exposure, 1e-4), 0.05, 400);

    this._v3.copy(sunDir).transformDirection(ctx.camera.matrixWorldInverse);
    this.field.setUniforms({
      depth: this.softDepth.texture,
      width: pipeline.internalWidth,
      height: pipeline.internalHeight,
      sunWorld: sunDir,
      sunView: this._v3,
      sunColor: this.sunRadiance,
      ambient: this.ambientRadiance,
      hdrUnit: this.hdrUnit,
      time: ctx.time.elapsed,
      hotspots: this.hotspots,
    });
  }

  get particleCount(): number {
    return this.field.count;
  }

  dispose(): void {
    this.field.dispose();
    this.softDepth.dispose();
    this.casingPool?.geometry.dispose();
  }
}

const DOWN = new THREE.Vector3(0, -1, 0);
const UP_HALF = new THREE.Vector3(0, 0.5, 0);
const UP_ONE = new THREE.Vector3(0, 1, 0);
const ONE = new THREE.Vector3(1, 1, 1);

function randomUnit(out: THREE.Vector3): THREE.Vector3 {
  const z = Math.random() * 2 - 1;
  const a = Math.random() * Math.PI * 2;
  const r = Math.sqrt(Math.max(0, 1 - z * z));
  return out.set(r * Math.cos(a), r * Math.sin(a), z);
}

/**
 * How much sun a parcel of a plume gets, from where it sits in the plume.
 *
 * The shader shadows each puff against itself, which gives one billboard a
 * bright rim and a dark core; this shadows the puffs against *each other*, so
 * the whole column has a lit side and a shaded one instead of forty
 * independently lit balls stacked in a heap. Parcels thrown toward the sun
 * come out of the ball in front of the ones thrown away from it.
 */
function plumeShade(offset: THREE.Vector3, sunDir: THREE.Vector3): number {
  const d = offset.dot(sunDir);
  return 0.2 + 0.8 * Math.min(1, Math.max(0, d * 0.5 + 0.55)) ** 1.4;
}
