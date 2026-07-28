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
  concrete: { puff: new THREE.Color(0.78, 0.755, 0.715), sparks: 0.35, debris: 6, puffCount: 10, puffSize: 0.15, loose: 0.5, sound: 'impact_concrete' },
  metal:    { puff: new THREE.Color(0.56, 0.565, 0.59),  sparks: 1.0,  debris: 3, puffCount: 3,  puffSize: 0.10, loose: 0.1, sound: 'impact_metal' },
  sand:     { puff: new THREE.Color(0.84, 0.735, 0.535), sparks: 0.0,  debris: 4, puffCount: 13, puffSize: 0.17, loose: 1.0, sound: 'impact_sand' },
  // No sparks off soil. At 0.06 this drew exactly one, and one spark is never
  // read as "a few grains of grit in the dirt were incandescent" — it is read
  // as a stray bright streak next to the impact, because a shower of them is
  // the only thing that identifies a spark as a spark.
  dirt:     { puff: new THREE.Color(0.50, 0.415, 0.315), sparks: 0.0,  debris: 6, puffCount: 12, puffSize: 0.16, loose: 0.9, sound: 'impact_dirt' },
  wood:     { puff: new THREE.Color(0.64, 0.50, 0.315),  sparks: 0.0,  debris: 9, puffCount: 5,  puffSize: 0.13, loose: 0.3, sound: 'impact_wood' },
  glass:    { puff: new THREE.Color(0.86, 0.93, 0.97),   sparks: 0.5,  debris: 12, puffCount: 3, puffSize: 0.10, loose: 0.2, sound: 'impact_glass' },
  water:    { puff: new THREE.Color(0.76, 0.86, 0.93),   sparks: 0.0,  debris: 0, puffCount: 9, puffSize: 0.20, loose: 0.6, sound: 'impact_water' },
  flesh:    { puff: new THREE.Color(0.30, 0.045, 0.035), sparks: 0.0,  debris: 0, puffCount: 6,  puffSize: 0.11, loose: 0.0, sound: 'impact_flesh' },
  foliage:  { puff: new THREE.Color(0.33, 0.43, 0.19),   sparks: 0.0,  debris: 7, puffCount: 4,  puffSize: 0.12, loose: 0.2, sound: 'impact_foliage' },
  fabric:   { puff: new THREE.Color(0.67, 0.61, 0.47),   sparks: 0.0,  debris: 3, puffCount: 6,  puffSize: 0.14, loose: 0.2, sound: 'impact_fabric' },
  rubber:   { puff: new THREE.Color(0.23, 0.23, 0.25),   sparks: 0.0,  debris: 3, puffCount: 4,  puffSize: 0.11, loose: 0.1, sound: 'impact_rubber' },
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
        // Through the bus rather than straight into `onImpact`, because the
        // decal system is a separate listener on the same signal. Calling the
        // particle path directly staged six strikes with no bullet holes under
        // any of them, and a review then spent a pass concluding the decal
        // system was dead when it had simply never been asked.
        impact: (point, normal, dir, surface) =>
          Signals.emit('bullet:impact', {
            point, normal, direction: dir, surface: surface as SurfaceKind,
            distance: 8,
          }),
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
        maxLife: 0.06,
        size: 0.12 + 0.16 * look.sparks,
        color: new THREE.Color(1.0, 0.200, 0.024),
        kind: PKind.Flash,
        emissive: 9 * look.sparks,
        fadeIn: 0,
        fadePow: 2.6,
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
      // Measured off a capture, this arrived at (165, 152, 128) against a
      // street at (186, 164, 140): three per cent of a stop apart, which is
      // why six impacts on an open road photographed as pale wisps rather than
      // as anything being hit. The error was not the level, it was the
      // *density* — a puff at 0.45 opacity is half the street showing through
      // it, so however the albedo is authored the composite lands on the
      // street's own value and the only thing left to see is the ragged alpha
      // edge, which is what a wisp is. A strike throws pulverised material that
      // is briefly opaque and self-shadowing; it is dark in its core and light
      // only at its rim, and that internal range is the whole read.
      // Two bands out of one loop: a dark, slow, dense base sitting in the
      // crater and a lighter crown lifting off it. The single band this
      // replaces was the reason six strikes on an open road photographed as
      // one three-metre bank of pale fog — measured across it, the whole cloud
      // spanned eight values out of two hundred and fifty, which is a flat
      // sheet, and a flat sheet of anything at that size is fog whatever its
      // hue. Dust is read by the range *inside* it.
      // Three eighths in the crater, five eighths in the crown. Split evenly,
      // the crown at its new alpha had too few sprites left to sum into
      // anything; the dark base only has to fill the crater and one or two of
      // it does that.
      const inner = i * 8 < count * 3;
      // The crown is authored *above* the surface's own albedo, which sounds
      // wrong and is not. A packed road and the powder ground off it are the
      // same mineral, but the road self-shadows between its grains and the
      // powder, suspended in air, does not — so the airborne fines are close to
      // the mineral's true reflectance while the surface they came from is well
      // under it. At 0.62 to 0.84 of the surface value the crown printed
      // (169, 152, 124) against a road at (185, 160, 129): darker than what it
      // was kicked off, and darker by less than a tenth of a stop, which is the
      // definition of invisible.
      // Both bands within about a stop and a half of each other. The internal
      // range was the fix and then it became the fault: at 0.09 against 1.0 the
      // two bands are eleven to one, which through this transform is literally
      // black against literally white, and six strikes on a road photographed
      // as punched holes with popcorn stuck to them. Pulverised rock is one
      // material — the core of the puff is the same powder as its crown, in its
      // own shadow — so the range inside it is the two-and-a-half to one a
      // shadowed side and a lit side of anything gives you, not an order of
      // magnitude.
      // And down again, because with the sprites shrunk to the size of the
      // event they no longer need the level to be seen. Every pass that pushed
      // the crown brighter was compensating for it being spread too thin over
      // too much road: at nine tenths of the surface albedo across a 0.4 m
      // sprite, six strikes photographed as cream foam scattered over three
      // metres of street. Small and half as bright reads as material leaving a
      // hole; large and bright reads as fog whatever its value.
      const dust = look.puff.clone()
        .multiplyScalar(inner ? 0.26 + Math.random() * 0.10 : 0.54 + Math.random() * 0.20);
      // Warmed against the surface it came off, not merely scaled down from it.
      //
      // The failure this fixes had been read as a value problem for three
      // passes and is not one. Measured off a capture, the dust arrived at
      // (175, 159, 133) at 0.24 saturation against a road at (190, 163, 132)
      // at 0.31 — barely darker, and *less* saturated, which is precisely the
      // recipe for pale grey fog whatever the albedo says. The cause is the
      // lighting model rather than the authoring: a dust puff dense enough to
      // read is optically thick, so the scattering solve extinguishes most of
      // the beam and hands the puff twice as much sky as sun, and the sky in
      // this scene is blue. An opaque road takes the beam neat and stays warm.
      //
      // So the albedo has to lean warm hard enough to survive being lit
      // mostly by the sky. This is also what pulverised sandstone does: the
      // fines that stay airborne are the iron-stained clay fraction, which is
      // redder than the aggregate the round actually hit.
      if (!inner) dust.setRGB(dust.r, dust.g * 0.90, dust.b * 0.70);
      this.field.spawn({
        // Clear of the surface, not sitting on it. A sprite's soft-particle
        // fade needs depth clearance proportional to its own radius, and a
        // 0.3 m puff spawned three centimetres off a road that the camera is
        // looking along at twenty degrees has about eight centimetres of it —
        // so the dust was drawn at a fraction of its authored alpha and six
        // strikes on an open street photographed as faint smudges. The puff
        // also physically stands off: pulverised material leaves a crater as a
        // cone, and its centroid is a hand's width clear of the surface within
        // a frame of the strike.
        position: point.clone()
          .addScaledVector(normal, 0.05 + look.puffSize * (inner ? 0.30 : 0.55)),
        velocity: dir.multiplyScalar(inner ? 0.9 + Math.random() * 2.0 : 3.4 + Math.random() * 5.6),
        // Short. A strike throws dust for about a third of a second and the
        // rest of what was on screen was six overlapping tails that never went
        // away, so a burst wrote a permanent haze down the street.
        // Brief. A crown that lives a third of a second longer than the strike
        // it came from is a bank of haze by the third round of a burst, and the
        // review frames of an automatic weapon on an open street were reading as
        // weather rather than as gunfire.
        maxLife: inner ? 0.22 + Math.random() * 0.24 : 0.24 + Math.random() * 0.28,
        size: look.puffSize * (inner ? 0.55 + Math.random() * 0.35 : 0.8 + Math.random() * 0.7),
        grow: inner ? 0.28 : 0.55,
        color: dust,
        colorEnd: dust.clone().multiplyScalar(inner ? 1.35 : 0.86),
        // Translucent crown. At two thirds to nine tenths each crown sprite was
        // its own opaque object, so a strike read as a countable cluster of
        // pale balls rather than as one puff — the eye picks four or five
        // spheres out of it instantly and a sphere is the one shape airborne
        // powder never has. Halved, the same sprites sum through each other and
        // what is left is a mass whose outline comes from where they happen to
        // overlap.
        opacity: inner ? 0.86 : 0.34 + Math.random() * 0.20,
        drag: 3.6,
        gravity: 0.9 + look.loose * 2.2,
        rotationSpeed: (Math.random() - 0.5) * 3.4,
        kind: PKind.Smoke,
        turbulence: 0.6,
        shade: inner ? 0.16 + Math.random() * 0.16 : 0.85 + Math.random() * 0.15,
        shadeEnd: inner ? 0.85 : 1.0,
        fadeIn: 0.02,
      });
    }

    // A hit on a floor also kicks a low sheet of dust outward along it.
    if (up > 0.55 && look.loose > 0.2) {
      for (let i = 0; i < Math.round(3 * b * look.loose); i++) {
        const a = Math.random() * Math.PI * 2;
        const dir = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
        this.field.spawn({
          position: point.clone().addScaledVector(normal, 0.02),
          velocity: dir.multiplyScalar(1.4 + Math.random() * 2.6),
          maxLife: 0.42 + Math.random() * 0.4,
          size: look.puffSize * 1.1,
          grow: 0.8,
          color: look.puff.clone().multiplyScalar(0.40).multiply(WARM_DUST),
          colorEnd: look.puff.clone().multiplyScalar(0.30).multiply(WARM_DUST),
          opacity: 0.62,
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
          // A dash, not a tracer. At half a metre these drew sixty-pixel spikes
          // at eight metres — longer than the dust puff they came out of and
          // straight enough to read as drawn lines. A shutter smears an
          // incandescent chip a few centimetres, and it is the *count* of them
          // that makes a strike on stone read, not the length of each.
          stretch: 0.16,
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
    // Photographed against a sunlit wall the droplets came back at a saturation
    // of one and a value in the two hundreds, which is poster paint. Whole
    // blood is a 0.03 reflectance in the green and blue and not much over 0.1
    // in the red — it is nearly black in shadow and only ever a dark crimson in
    // the sun — and the difference between those two readings is most of what
    // separates gore that looks recorded from gore that looks sprayed on.
    const arterial = new THREE.Color(0.145, 0.011, 0.008);
    const dark = new THREE.Color(0.055, 0.005, 0.004);

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
        maxLife: 0.22 + Math.random() * 0.26,
        // Small. At a quarter of a metre growing at 0.7 m/s, eleven of these
        // formed a 0.6 m crimson cloud with visible sprite edges hanging in
        // front of the target — which is neither what blood mist looks like nor
        // something a shipped game would put on screen. A wound mists a
        // hand's width of air and it is gone.
        size: 0.05 + Math.random() * 0.075,
        grow: 0.42,
        // Well under the arterial colour the droplets use. This is a *smoke*
        // particle, so the shader runs a full scattering solve on it and
        // multiplies a sunlit street's radiance into whatever albedo it is
        // given: authored above the surrounding surfaces it came out as a
        // bright pink cloud, which is both wrong and the single most
        // conspicuous thing in the frame. Blood mist in daylight is a dark,
        // low-contrast haze.
        color: arterial.clone().multiplyScalar(0.26),
        colorEnd: dark,
        opacity: 0.38,
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
        // Fine. A droplet authored at a tenth of a metre is a golf ball of
        // blood, and two dozen of them leaving a wound photographed as a spray
        // of red beads rather than as a spray. Cast-off from a rifle wound is
        // millimetre-scale; what makes it read at range is the *count* and the
        // cone it occupies, not the size of each drop.
        size: 0.014 + Math.random() * 0.030,
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

    // The gout at the wound itself. Everything above is *cast-off*, which is
    // millimetre-scale by nature, and cutting it down to that scale — correctly
    // — left the whole effect as a scatter of one- and two-pixel dots at the
    // range a target is actually engaged from. Photographed at seven metres it
    // read as a few red scratches on the wall behind rather than as anything
    // happening to the man in front of it.
    //
    // What carries a hit at range is a small, dense, dark mass at the point of
    // impact that is gone inside a fifth of a second. It is bigger than a
    // droplet and it barely moves, so it stays on the target instead of
    // decorating the scenery, and it is the one part of the effect the player
    // has to be able to see without looking for it.
    for (let i = 0; i < Math.round(7 * b); i++) {
      const dir = incoming.clone()
        .addScaledVector(randomUnit(this._v2), 0.55)
        .normalize();
      this.field.spawn({
        position: point.clone().addScaledVector(incoming, 0.03 + Math.random() * 0.04),
        velocity: dir.multiplyScalar(0.8 + Math.random() * 2.4),
        maxLife: 0.17 + Math.random() * 0.12,
        // Over the coherence threshold in the shader, so these draw as one mass
        // rather than as the scatter of specks the erosion field makes of
        // anything droplet-sized.
        size: 0.068 + Math.random() * 0.050,
        color: arterial,
        colorEnd: dark,
        opacity: 1.0,
        drag: 4.5,
        gravity: 6,
        kind: PKind.Blood,
        fadeIn: 0,
        fadePow: 2.4,
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
        // Thin. At 0.022 across and stretched half again along its own flight
        // these drew as 100 mm ribbons with hard edges, and four of them
        // radiating off a hit photographed as a scatter of torn red cloth — the
        // one read gore must never have, because cloth is an object and a
        // strand of liquid is a mark.
        size: 0.011 + Math.random() * 0.013,
        color: arterial.clone().multiplyScalar(1.2),
        colorEnd: dark,
        opacity: 0.9,
        drag: 2.2,
        gravity: 9,
        kind: PKind.Blood,
        stretch: 1.15,
        fadeIn: 0,
        fadePow: 2.4,
      });
    }

    // A wound decal on the body, and spatter on whatever is behind it. Both
    // are aligned to the round's line so the mark on the wall reads as cast
    // off *by* the hit rather than as a stamp that happened to land there.
    // Darker than the airborne droplets. A mark on a wall is a thin film of
    // liquid over the wall's own albedo and it dries almost immediately;
    // photographed at the droplets' own colour, a spatter left on sunlit
    // masonry was still reading as fresh pink paint two seconds after the hit,
    // which is the one thing that makes gore look applied rather than recorded.
    const stain = arterial.clone().multiplyScalar(0.55);
    this.decals?.spawn(point, normal, 2, 0.18 + Math.random() * 0.12, stain, 24, incoming, 1.0);
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
        stain,
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
      maxLife: 0.065,
      // The quad, not the flash. Only the star's arms are drawn inside it and
      // they reach about six tenths of its radius, so the mark on screen is
      // roughly a third of this across — trimmed to 0.36 in the same pass that
      // sharpened the star, the two changes compounded and a carbine's muzzle
      // flash came out fifteen pixels wide at three metres.
      size: 0.46 * scale,
      color: new THREE.Color(1.0, 0.135, 0.010),
      kind: PKind.Flash,
      emissive: silenced ? 8 : 40,
      fadeIn: 0,
      // Plateau, not a decay. Opacity here is one minus life raised to this
      // power, so anything under one falls off *hardest* at birth: at 0.9 the
      // flash was half gone by its second frame and down to a sixth by its
      // third. The resolve weights a fresh sample at 0.28 and blends it
      // against a history clipped to the current neighbourhood, so an effect
      // that has already collapsed by the time it has been sampled twice never
      // accumulates past a quarter of the radiance the shader emitted — which
      // is exactly the deficit measured off the captures. A cube holds it near
      // full for two frames and drops it over the following two, and three
      // frames of burning propellant is also what a camera integrating 16 ms
      // per frame records of a flash that physically lasts one.
      fadePow: 3.0,
    });
    // A second star on the same crown at its own random orientation. One
    // sprite gives a shape that is lopsided but *fixed*; crossing two of them
    // is what stops consecutive shots from stamping the same asterisk.
    this.field.spawn({
      position: muzzle.clone().addScaledVector(dir, 0.05),
      maxLife: 0.055,
      size: 0.33 * scale,
      color: new THREE.Color(1.0, 0.190, 0.020),
      kind: PKind.Flash,
      emissive: silenced ? 6 : 30,
      fadeIn: 0,
      fadePow: 2.6,
    });

    // The dark backing. This is the change that made the star legible, and it
    // is not a lighting change at all.
    //
    // The display transform cannot print a saturated flash against a sunlit
    // wall — solved offline, nothing additive clears 0.29 saturation there —
    // so the contrast has to come from what is *behind* the star rather than
    // from the star. A rifle firing produces exactly the right thing for free:
    // a dense, near-opaque plug of muzzle blast that is dark at the moment of
    // ignition and is the reason flash photographs of small arms show an amber
    // star on a black ground rather than a white smear on a bright one. Two
    // frames of it, just wider than the star, is enough.
    if (!silenced) {
      for (let i = 0; i < 3; i++) {
        this.field.spawn({
          // Hugging the crown. Thrown forward at six metres a second it had
          // travelled most of a metre by the second frame and photographed as a
          // separate brown lump *beside* the star rather than as the ground
          // behind it, which is worse than not having it: a flash needs the
          // dark thing to be co-located with it or it is just litter.
          position: muzzle.clone()
            .addScaledVector(dir, 0.015 + i * 0.03)
            .addScaledVector(randomUnit(this._v3), 0.02),
          velocity: dir.clone().multiplyScalar(1.0 + i * 0.4)
            .addScaledVector(randomUnit(this._v3), 0.5),
          // Smaller than the star, and that ordering is the whole point.
          // Measured off the capture, the arms landed at (203, 156, 134) —
          // warm, but with a blue channel two thirds of the red, because two
          // thirds of that blue is the *background* coming through an additive
          // sprite. Over a neutral grey awning that is read as pink, and no
          // ramp can fix it: the only way to take the background out of the sum
          // is to put something opaque and dark between the star and it, which
          // is what a muzzle blast physically is.
          //
          // Then it was sized to *cover* the star, which inverts the effect.
          // At 0.19 to 0.36 metres against a star drawing out to about 0.14 the
          // plug was the larger object, so what the capture showed was a dark
          // brown mushroom on the end of the barrel with an amber spark on one
          // edge of it — the exact failure the plug was added to prevent, in
          // the other direction. It has to sit inside the star's own footprint.
          // Sized to sit under the bulb and the inner arms, and no further.
          // The plug is what lets the ramp's gold band print at all — solved
          // through an offline replica of the display transform, the same
          // emission that prints (239,219,191) over a sunlit street prints
          // (227,200,153) over this, and the second of those is a colour. So
          // the useful radius is a bit over half the star's drawn radius:
          // enough that the middle of the flash is warm, little enough that the
          // arm tips run out over the street and go cream, which is the
          // gradient a flash actually photographs with.
          //
          // Both errors have now been made. At 0.19 to 0.36 m the plug was the
          // larger object and the capture was a brown mushroom with a spark on
          // it; at 0.055 there was nothing behind the star at all and the
          // capture was a fuzzy cream disc.
          maxLife: 0.085 + Math.random() * 0.045,
          size: 0.115 + i * 0.030,
          grow: 0.35,
          color: new THREE.Color(0.018, 0.0175, 0.017),
          colorEnd: new THREE.Color(0.050, 0.049, 0.048),
          opacity: 0.92,
          drag: 9,
          buoyancy: 0.4,
          rotationSpeed: (Math.random() - 0.5) * 6,
          kind: PKind.Smoke,
          turbulence: 1.4,
          shade: 0.4,
          shadeEnd: 0.8,
          fadeIn: 0,
          fadePow: 1.6,
        });
      }
    }

    // The gas cone. Propellant leaving a rifle is still burning for a couple
    // of hundred millimetres past the crown, and that plume down the bore line
    // is what makes a flash read as coming *out* of a barrel rather than
    // being a lamp stuck on the end of one.
    if (!silenced) {
      for (let i = 0; i < 3; i++) {
        const f = (i + 1) / 3;
        this.field.spawn({
          position: muzzle.clone().addScaledVector(dir, 0.06 + f * 0.20),
          maxLife: 0.050 + f * 0.016,
          size: (0.17 - f * 0.08) * scale,
          color: new THREE.Color(1.0, 0.22 - f * 0.10, 0.03 - f * 0.02),
          kind: PKind.Flash,
          emissive: 20 - f * 12,
          fadeIn: 0,
          fadePow: 2.4,
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
          emissive: 1.55,
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
          emissive: 1.45,
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
    // The light has to outlive one tick or it is not in the picture. The pool's
    // `flash` curve is a cube of remaining life, so a light asked to last
    // 55 ms is down to a third of itself by the second frame and to six per
    // cent by the third — it lands entirely inside the frame the shot was
    // fired on and contributes nothing to the two frames the flash is still
    // burning through. Linear over the same window tracks the sprite instead,
    // which is what makes the wall next to the shooter change value at all.
    //
    // Measured, and then trimmed on the strength of the measurement. A market
    // stall two metres off the muzzle went from (143, 127, 108) unlit to
    // (224, 207, 186) lit — a full stop, with the brightest texels at 246 —
    // while a wall at fifteen metres did not move at all. So the light works;
    // it was simply spending its last third of a stop on clipping the near
    // surface's texture off. Three quarters of the intensity keeps the read and
    // gives the timber somewhere to go, and pulling the radius in from fourteen
    // metres to nine puts the falloff inside the frame, which is what makes it
    // look like a source at the muzzle rather than a change of exposure.
    const sun = this.ctx.engine.pipeline.sunIntensity;
    this.lighting.spawnLight(
      muzzle.clone().addScaledVector(dir, 0.3),
      0xffb765,
      silenced ? Math.max(4, sun * 0.8) : Math.max(82, sun * 13),
      silenced ? 6 : 9,
      0.065,
      'linear',
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
    // Aged soot, and it was the single largest error in the whole sequence.
    // Photographed at 1.1 s the entire frame was a flat tan wash with no
    // column, no outline and no core in it: measured across fifteen metres of
    // it, the smoke sat within a few values of the sunlit wall behind it.
    // Detonation smoke entrains air and lightens, but it goes from a 0.03
    // albedo to something like 0.07 — it does not go to a grey card, and 0.135
    // through a scattering solve that puts most of a desert sun back out is a
    // grey card. Halved, the plume is still a dark object at two seconds.
    const sootOld = new THREE.Color(0.072, 0.068, 0.064).lerp(dust, 0.12);
    // Pulverised ground, which is most of what a charge on a street actually
    // throws into the air, and the population this sequence was missing.
    //
    // Every pass so far has treated the column as soot and reasoned carefully
    // about how dark soot is. The reasoning is right and the premise is wrong.
    // A shell detonating on a road produces a few kilograms of carbon and
    // several tonnes of powdered road, so the mass of the column is masonry and
    // earth at the ground's own albedo — which is why photographs of HE in a
    // desert town show a *light* tan column with a dark heart in it, and why
    // this one, authored uniformly at a lampblack 0.03, photographed as a flat
    // black cut-out. Measured through the plume at 450 ms, the sunlit crown came
    // back at sRGB 83 against a street at 155: the brightest part of the smoke
    // was a stop darker than the darkest part of everything around it, so there
    // was no sun side for a rim to be drawn on.
    //
    // Two populations rather than a compromise albedo between them. A single
    // mid-grey column is the flat grey card two passes were spent removing; a
    // bright majority with a dark minority *inside* it is the structure itself,
    // and it survives whatever the shading does on top of it.
    const ejecta = dust.clone().multiplyScalar(0.62);
    const ejectaOld = dust.clone().multiplyScalar(0.78);

    // ---- 0 ms: detonation flash -------------------------------------------
    // Small and brief on purpose. Sized to the blast radius and given the
    // emissive an explosion deserves, the additive flash is so much brighter
    // than the fireball behind it that it erases it: a detonation photographed
    // at forty milliseconds came out as a plain white cloud with no fire in it
    // anywhere. The flash's job is two frames of overexposure at the seat of
    // the blast — the fireball is what the frame after that is made of.
    // Five overlapping cores rather than one sprite. A single quad, however hot,
    // is a shape — and reviewed at thirty milliseconds it was a shape with a
    // recognisable outline sitting in the middle of the blast. A cluster at
    // different sizes and offsets has no outline of its own, which is the only
    // thing the first two frames of a detonation must not have.
    //
    // Held to about two frames and *plateaued* rather than decayed: an
    // exponent under one takes the alpha down hardest at birth, so an effect
    // authored to last 40 ms was already at a fifth of itself by the time the
    // shutter had sampled it twice, and the review of the 30 ms frame found a
    // faint amber smudge where the brightest thing in the sequence was supposed
    // to be. Squared holds it near full for the first frame and drops it over
    // the next two, which is also what a camera integrating 16 ms records of an
    // event that is physically over in three.
    for (let i = 0; i < 5; i++) {
      const f = i / 4;
      this.field.spawn({
        position: pos.clone().addScaledVector(randomUnit(this._v3), r * 0.13 * f),
        velocity: randomUnit(this._v2).multiplyScalar(3 * f),
        maxLife: 0.048 + f * 0.030,
        size: r * (0.34 - f * 0.13) * s,
        grow: r * 1.1,
        color: new THREE.Color(1, 1, 1),
        kind: PKind.Core,
        // Just over one, so the hub clips and the skirt does not. The ramp
        // clamps, and at one and a half everything inside half the sprite's
        // radius pinned to white — reviewed at 30 ms the core was a hard white
        // mass with a thin gold edge straight onto soot, missing the orange
        // body a detonation has between the two. Near unity the clipped region
        // shrinks to the inner third and the rest runs down through yellow into
        // the fire behind it.
        emissive: 1.05 - f * 0.30,
        opacity: 1,
        fadeIn: 0,
        fadePow: 2.0,
      });
    }
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
      // Warmer than the fire itself, on purpose. Soot lit by a fireball is
      // being lit by a very large, very close source and picks up a broad
      // spectrum off it; multiplying a near-pure orange into a 0.03 albedo
      // instead gives (0.04, 0.017, 0.005), which is maroon, and the soot skin
      // of a detonation photographed as dark red cloth rather than as smoke
      // with fire behind it.
      color: new THREE.Color(1.0, 0.56, 0.26),
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
    // Smaller parcels, more of them. A sprite whose incandescence lands above
    // about six tenths of the ramp is drawn as a flat cream disc — the ramp is
    // clamped at one, so the whole of its interior sits on the same colour and
    // only the outermost texels have any gradient left. At two metres across
    // that disc is unmistakably a quad, and three of them were the first thing
    // the eye found in every capture of a 120 ms fireball. Under a metre they
    // overlap into something with a shape instead.
    // Smaller again, and more of them. Photographed at 100 ms the ball was a
    // legible collage: eight or nine discrete lozenges, each with its own hard
    // eroded edge and its own single temperature, and the eye picks that apart
    // instantly however good the colour is. Two metres of sprite at fifteen
    // metres is forty pixels, which is a *shape*, and sorted alpha only ever
    // draws the nearest few of them. Under a metre each they stop being
    // distinguishable from their neighbours and the ball has a texture instead
    // of a parts list.
    // Where the ball is hot, as a handful of contiguous cells rather than a
    // per-parcel dice roll. This is the correction that gave the fireball a
    // structure, and the previous reasoning had it exactly backwards.
    //
    // Temperature was randomised independently per parcel, on the argument that
    // sorted alpha only ever draws the near side of the ball so a purely radial
    // temperature would hide every hot parcel behind a cool shell. True as far
    // as it goes — but independent randomness has a consequence that is worse.
    // Neighbouring parcels are neighbouring *pixels*, so uncorrelated
    // temperature paints hot and cool sprites alternately across the whole
    // silhouette, and photographed at 120 ms the fireball came back as a
    // chequerboard of gold puffs and brown puffs at identical size and
    // spacing — no core, no shell, no direction, just two colours of the same
    // blob shuffled together. The eye reads that as a texture, not as fire.
    //
    // What high-speed footage shows instead is a small number of large, joined
    // regions: the soot skin tears in a few places and what shows through the
    // tears is contiguous incandescence. So the heat is a field over bearing —
    // three lobes on random axes, re-drawn per detonation — and a parcel's
    // temperature is how near its own bearing lies to the hottest of them.
    // Neighbours then agree, the hot regions join up, and the ball has a near
    // side and a far side again.
    //
    // The exponent is what decides whether that field reads as structure or as
    // two populations. At 2.6 a dot product has to clear 0.85 before it
    // contributes anything at all, so the ball came out sorted into a handful
    // of parcels at the top of the ramp and everything else at the bottom of
    // it — and the ramp's middle, which is the orange a fireball is actually
    // made of, had nothing in it. Measured off a 120 ms capture that is a mass
    // of clipped gold spheres in brown gaps with no orange anywhere between
    // them. Nearly linear, the same three lobes give a continuous gradient from
    // core to skin and the bulk of the ball lands in the band where the display
    // transform still prints a colour.
    const cells = [0, 1, 2].map(() => randomUnit(new THREE.Vector3()));
    const cellHeat = (d: THREE.Vector3): number => {
      let near = -1;
      for (const c of cells) near = Math.max(near, d.dot(c));
      return Math.max(0, (near + 0.15) / 1.15) ** 1.4;
    };

    const fireCount = Math.round(92 * b * s);
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
        maxLife: 0.22 + (1 - shell) * 0.24 + Math.random() * 0.10,
        // Four to one in size, not two to one. Every parcel within a factor of
        // two of its neighbours gives a fireball exactly one feature size, and a
        // field with one feature size is read as a pattern however good each
        // element of it is — measured off a 120 ms capture, lobes all within a
        // few pixels of the same diameter, which is the tell. Turbulence has
        // structure at every scale; the cheapest way to imply that is to draw it
        // with sprites at every scale.
        size: r * 0.105 * (0.45 + Math.random() ** 1.7 * 1.55),
        grow: r * 0.30,
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
        // The cell field does the work; the radius term only decides how fast a
        // parcel gives its heat up, and the small random tail keeps individual
        // parcels from being perfectly flat inside a cell.
        //
        // Levels held where the previous pass put them, because those were
        // solved against the display transform and are right: measured off a
        // capture, fire under about 0.6 linear prints as brick — (134, 60, 41)
        // — and anything over about 1.5 prints as cream, while high-speed
        // footage at this age sits mostly between (183, 114, 73) and
        // (205, 165, 104) with a few clipping cores. What changed is only
        // *which* parcels get the top of that band.
        // Radius and cell field weighted about evenly, which is what puts a
        // core back in the ball. Reviewed at 120 ms with the cells carrying four
        // times the radial term, the hot region landed wherever the three random
        // axes happened to point — that capture put it along the bottom-left
        // edge with a dark centre, and a fireball whose middle is its coldest
        // part reads as a cloud of rust rather than as something burning. The
        // radial term guarantees a hot middle every time; the cells decide where
        // it tears open, which is the part that should be luck.
        //
        // The floor is up half a stop as well. At 0.50 the coolest parcels sat
        // just under the level where this transform starts printing fire as
        // brick, so the majority of the ball — which is by area its outer
        // shell — came back the colour of dried mud.
        //
        // Rebalanced toward the base term, which is the other half of taking
        // the bimodality out. A floor of 0.72 with 1.35 riding on a hard cell
        // field means a parcel is either at 0.8 or at 2.2 with almost nothing
        // in between, so however smooth the field is the *levels* are two
        // populations. Lifting the floor into the orange band and trimming the
        // cell term makes the top of the ball a continuation of the rest of it
        // rather than a separate object sitting in it.
        emissive: 1.05 + 0.80 * (1 - shell) ** 2
          + 0.95 * cellHeat(dir) + 0.30 * Math.random() ** 2,
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
    // No dedicated core sprite. Both attempts at one made the frame worse: a
    // handful of very hot fire parcels drew as flat cream discs, and the flash
    // sprite — which is the right shape for a gun and the wrong one for a
    // charge — put a legible six-pointed star in the middle of the fireball.
    // With the fire parcels carrying their own radial temperature the hottest
    // of them clip on their own, which is where a core belongs anyway: inside
    // the fire rather than in front of it.

    // Outnumbering the fire, and starting closer in. What separates footage of
    // a real detonation from a rendered one at this age is not the colour of
    // the fire — it is how little of the fire you can see. The soot is in
    // front, and the fire is the light coming through the gaps between it.
    const skinCount = Math.round(116 * b * s);
    for (let i = 0; i < skinCount; i++) {
      const dir = randomUnit(new THREE.Vector3());
      dir.y = dir.y * 0.6 + 0.32;
      dir.normalize();
      const lit = plumeShade(dir, sunDir);
      this.field.spawn({
        position: pos.clone().addScaledVector(dir, r * (0.08 + Math.random() * 0.30)),
        velocity: dir.clone().multiplyScalar((5 + Math.random() * 8) * s),
        // Held back, so the first two frames belong to the fire.
        //
        // At four milliseconds plus a forty-millisecond spread, two thirds of
        // the soot was already drawn by 30 ms and the earliest frame in the
        // staging sweep came back as a dark brown mass with a white dot in the
        // middle of it. That is the wrong frame for a detonation to open on: a
        // charge is incandescent before it is dirty, and soot in front of the
        // fire is what the *next* tenth of a second is for. Starting at twenty
        // milliseconds over a seventy-millisecond spread leaves the 30 ms frame
        // showing about a sixth of the skin, which reads as the ball beginning
        // to crust rather than as smoke that arrived with the flash.
        delay: 0.020 + Math.random() * 0.070,
        // Short-lived and slow-growing, because this is a *skin* on the
        // fireball and not the plume. At 1.35 s of life growing a quarter of the
        // blast radius per second, each of a hundred and sixteen parcels was
        // two and a half metres across by the time the column was supposed to
        // have taken over — so what a review of "the smoke column at one
        // second" was actually looking at was the fireball's skin, spread over
        // the whole street and lightened to the colour of the wall behind it.
        maxLife: 0.5 + Math.random() * 0.36,
        size: r * 0.15 * (0.7 + Math.random() * 0.6),
        grow: r * 0.12,
        color: soot,
        colorEnd: soot.clone().lerp(sootOld, 0.5),
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
    //
    // Soot, not fire, and that is the correction. A jet is gas that has already
    // escaped the reaction and expanded, so by the time it is outside the
    // silhouette it has cooled — and a *cooled* fire parcel is an opaque sprite
    // carrying the bottom of the incandescence ramp, which is a dark maroon.
    // Against the one background in the effect with nothing to hide a sprite
    // edge, a sunlit wall, fourteen of those photographed as crumpled red rags
    // hanging over the blast: the single most artificial thing in the capture.
    // Dark soot fingers read as the ball tearing, which is what they are, and
    // the incandescent part of the ejecta is already covered by the sparks.
    for (let i = 0; i < Math.round(16 * b * s); i++) {
      const dir = randomUnit(new THREE.Vector3());
      dir.y = Math.abs(dir.y) * 0.9 + 0.15;
      dir.normalize();
      this.field.spawn({
        position: pos.clone(),
        velocity: dir.clone().multiplyScalar((22 + Math.random() * 22) * s),
        delay: Math.random() * 0.025,
        maxLife: 0.45 + Math.random() * 0.35,
        // A jet is a *jet*: a narrow finger of gas outrunning the ball, not a
        // balloon. Sized at a seventh of the blast radius and grown at nearly
        // one, six of these reached a metre and a half across by the time they
        // cleared the fireball, and three pale lobes with visible sprite edges
        // sitting outside the silhouette was the most conspicuous thing in the
        // frame at 120 ms. Half the size, twice the number, and they read as
        // the ball tearing rather than as sprites leaving it.
        size: r * 0.055,
        grow: r * 0.14,
        color: soot,
        colorEnd: soot.clone().lerp(sootOld, 0.6),
        opacity: 0.94,
        drag: 4.0,
        buoyancy: 9,
        kind: PKind.Smoke,
        // Drawn along its own velocity, so it reads as a finger tearing out of
        // the ball rather than as a ball leaving it. Modest: at 1.6 the
        // billboard was three times as long as it was wide and a handful of
        // them photographed as sausages laid across the fireball — the most
        // conspicuous sprite shape in the whole sequence.
        stretch: 0.6,
        turbulence: 2.2,
        shade: plumeShade(dir, sunDir) * 0.6,
        shadeEnd: plumeShade(dir, sunDir),
        fadeIn: 0.01,
        fadePow: 1.6,
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

      // Enough of them to close the circle. Twenty parcels start overlapping and
      // are two metres apart by the time the ring has reached four, so what
      // photographed at 450 ms was not a ring at all — it was a broken, diffuse
      // wash across the road with no leading edge anywhere in it. A collar only
      // reads as a collar if it is continuous while it is expanding.
      const ringCount = Math.round(34 * b * s);
      for (let i = 0; i < ringCount; i++) {
        const a = (i / ringCount) * Math.PI * 2 + Math.random() * 0.35;
        const dir = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
        this.field.spawn({
          position: new THREE.Vector3(pos.x, groundY + 0.12, pos.z).addScaledVector(dir, r * 0.15),
          velocity: dir.clone().multiplyScalar((13 + Math.random() * 12) * s),
          delay: 0.03 + Math.random() * 0.04,
          maxLife: 1.0 + Math.random() * 1.1,
          size: r * 0.18 * (0.7 + Math.random() * 0.6),
          grow: r * 0.09,
          // Kicked-up sand is bright, but it is not four times over white:
          // taking the surface colour neat and running it through a sun this
          // strong turned the whole dust ring into a clipped sheet with no
          // form in it at all.
          // Warmed and taken down. With the soft-particle fade no longer
          // erasing ground-aligned sheets this became visible for the first
          // time, and what it looked like was a pale pink smear lying across
          // the street: a sheet lit almost entirely by a blue sky, over a warm
          // road, at a value close to the road's own. Kicked-up sand takes the
          // colour of the sand, so the albedo has to lean warm hard enough to
          // survive being lit by the sky, and it has to sit clearly under the
          // surface it came off or it reads as fog rather than as dust.
          // Lighter than the road, not darker. The warning above about a pale
          // pink smear was written before the warm bias went in and the
          // correction over-shot: at 0.28 to 0.38 of the surface albedo the ring
          // sat well *under* the road it was thrown off, so the one part of a
          // detonation that reads as overpressure photographed as a dirty stain
          // spreading out from the seat of it. A blast collar is sunlit airborne
          // sand — the brightest thing at ground level in the whole sequence.
          color: dust.clone().multiplyScalar(0.58 + Math.random() * 0.18)
            .multiply(new THREE.Color(1.0, 0.88, 0.66)),
          colorEnd: dust.clone().multiplyScalar(0.42).multiply(new THREE.Color(1.0, 0.88, 0.68)),
          opacity: 0.52,
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

      // What the collar leaves behind. The ring itself is spent inside two
      // seconds — it is overpressure, and overpressure is over — but the
      // material it carried is fines, and fines take the better part of a minute
      // to fall out of the air. Reviewed at 2.6 s the seat of the detonation was
      // spotless while the column drifted off above it, so the frame read as one
      // event that had finished rather than as one still settling, and the
      // ground had no record of anything having happened on it.
      //
      // Slow, wide, low and thin: it never has an outline of its own and is only
      // ever read as haze standing where the blast was. That it survives past
      // everything else in the sequence is the point.
      for (let i = 0; i < Math.round(11 * b * s); i++) {
        const a = Math.random() * Math.PI * 2;
        const dir = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
        this.field.spawn({
          position: new THREE.Vector3(pos.x, groundY + 0.10 + Math.random() * r * 0.22, pos.z)
            .addScaledVector(dir, r * (0.2 + Math.random() * 0.55)),
          velocity: dir.clone().multiplyScalar((1.0 + Math.random() * 2.6) * s),
          delay: 0.30 + Math.random() * 0.5,
          maxLife: 3.4 + Math.random() * 2.6,
          size: r * 0.28 * (0.7 + Math.random() * 0.7),
          grow: r * 0.05,
          color: dust.clone().multiplyScalar(0.46 + Math.random() * 0.14)
            .multiply(new THREE.Color(1.0, 0.90, 0.72)),
          colorEnd: dust.clone().multiplyScalar(0.34).multiply(new THREE.Color(1.0, 0.91, 0.76)),
          opacity: 0.18 + Math.random() * 0.10,
          drag: 1.6,
          gravity: 0.10,
          rotationSpeed: (Math.random() - 0.5) * 0.7,
          kind: PKind.GroundDust,
          turbulence: 0.5,
          shade: 0.75 + Math.random() * 0.25,
          shadeEnd: 1.0,
          fadeIn: 0.5,
          fadePow: 1.3,
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
        // Spread over the seat rather than issued from a point. Every one of
        // these leaving the same coordinate on radial headings draws a
        // perfectly symmetric asterisk once they have flown a metre — isolated
        // on the spark layer at 450 ms it was a firework, which is the wrong
        // reference entirely. Real spall comes off a crater, not a pinhole.
        position: pos.clone().addScaledVector(dir, r * 0.12 * Math.random()),
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
        position: pos.clone().addScaledVector(randomUnit(this._v3), r * 0.3 * Math.random()),
        velocity: dir.normalize().multiplyScalar((3 + Math.random() * 9) * s),
        delay: 0.05 + Math.random() * 0.2,
        maxLife: 1.1 + Math.random() * 1.8,
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
      // Soot on the inside, ground on the outside. The fuel-rich smoke is
      // produced at the seat of the charge and stays wrapped in the mass of
      // powdered road the blast lifted with it, so the dark population belongs
      // in the middle of the stack and near its base — which is also the only
      // arrangement that reads, since a dark parcel on the silhouette is a hole
      // in the column and a dark parcel behind a bright one is a shadow in it.
      // Two soot parcels in five at the base, thinning to one in five by the
      // time the last of the column has left. Measured through the plume, a
      // 46 per cent core pulled the mean of the crown down to 117 against sand
      // at 150 — the bright population was still there in the highlights but no
      // longer carried the mass, which is the failure this split was added to
      // fix, arriving from the other direction.
      const core = Math.random() < 0.40 - 0.22 * f;
      // Which side of the column a parcel is lit from, and the previous version
      // of this line is why the plume had no sun side.
      //
      // `across` is normalised, so a parcel launched almost straight up scored
      // the same full-strength bearing as one thrown out onto the flank — and
      // since the column is authored narrow, nearly all of them are launched
      // almost straight up. Shade therefore varied from 0.07 to 1.0 between
      // parcels sitting on top of each other, which is a speckle rather than a
      // gradient: measured across the column at 1.2 s, 130 on the sunward side
      // against 135 on the shadowed one, so the rim the whole scattering model
      // exists to draw was worth five values out of 255 and pointing the wrong
      // way.
      //
      // The split into soot and ejecta already knows the answer. The soot is the
      // population spawned deep in the stack, so it is the population in its own
      // shadow, and the ejecta is on the outside where the light is. Keying the
      // shade off that rather than off a bearing costs nothing and cannot
      // decorrelate, because it is the same flag that decides the albedo.
      const lit = (core
        ? 0.16 + 0.26 * plumeShade(across, sunDir)
        : plumeShade(across, sunDir)) * (1 - 0.34 * f);
      dir.x *= 0.45;
      dir.z *= 0.45;
      dir.y = Math.abs(dir.y) * 2.0 + 0.85;
      dir.normalize();
      this.field.spawn({
        position: pos.clone().addScaledVector(dir, Math.random() * r * (core ? 0.14 : 0.26)),
        velocity: dir.clone().multiplyScalar((2.0 + Math.random() * 4.0) * s),
        delay: 0.09 + f * 0.30 + Math.random() * 0.1,
        maxLife: 3.6 + Math.random() * 2.4,
        // Small enough that the plume is *made of* puffs. A parcel authored at
        // a third of the blast radius and grown at an eighth of it per second
        // ends its life seven metres across, which is the entire column: one
        // sprite covers the silhouette and the outline it presents is the
        // outline of that sprite. Twice as many at half the size costs the
        // same fill and gives the stack an edge with lobes in it.
        size: r * 0.165 * (0.6 + Math.random() * 0.75),
        grow: r * 0.055,
        color: core ? soot : ejecta,
        colorEnd: core ? sootOld : ejectaOld,
        // Varied per puff so the stack never resolves into one flat sheet of
        // uniform density, and high enough that the middle of the column is
        // genuinely opaque: a plume you can read a building through is a haze,
        // whatever colour it is.
        opacity: 0.80 + Math.random() * 0.20,
        // Slower and less agitated. Reviewed at 2.2 s the plume was a brown
        // wash spread over an entire triumphal arch with no silhouette, no core
        // and no rim — a hundred parcels each contributing a fifth of a stop
        // over eight metres of frame, which is a dirty lens rather than a column
        // of smoke. Half of that was the fade curve below; the rest was
        // transport. A parcel that keeps most of its launch speed for two
        // seconds and is shaken sideways the whole time ends up somewhere else,
        // and a plume is only an object for as long as its parcels stay
        // stacked on each other.
        drag: 1.9,
        buoyancy: 4.6,
        rotationSpeed: (Math.random() - 0.5) * 1.1,
        kind: PKind.Smoke,
        turbulence: 0.5,
        // Deep in the column the smoke shadows itself; whichever side of the
        // plume the sun is on is the side that catches it.
        shade: lit,
        shadeEnd: Math.min(1, lit + 0.25),
        fadeIn: 0.16,
        // A plateau, and the sign of this was got backwards once already.
        // Opacity is one minus normalised life raised to this power, so values
        // *above* one hold near full through the middle of a parcel's life and
        // drop at the end, and values near one are a straight linear decay from
        // birth. Reading "hold it for longer" as "reduce the exponent" took the
        // column from 0.87 of its authored density at 40 per cent of life to
        // 0.65, and the review of the 2.2 s frame found the plume had become a
        // translucent stain. Cubed-ish is what an actual dissipation looks like:
        // nothing visible happens for the first half, and then it goes.
        fadePow: 2.6,
      });
    }

    // Dirty base surge that hangs at ground level after the column has left.
    if (nearGround) {
      for (let i = 0; i < Math.round(7 * b * s); i++) {
        const a = Math.random() * Math.PI * 2;
        const d = r * (0.2 + Math.random() * 0.7);
        const dir = new THREE.Vector3(Math.cos(a), 0.25, Math.sin(a)).normalize();
        this.field.spawn({
          position: new THREE.Vector3(pos.x + Math.cos(a) * d, groundY + 0.3 + Math.random() * 0.6, pos.z + Math.sin(a) * d),
          velocity: new THREE.Vector3(Math.cos(a) * 1.6, 0.5 + Math.random(), Math.sin(a) * 1.6),
          delay: 0.2 + Math.random() * 0.5,
          maxLife: 3.2 + Math.random() * 2.6,
          size: r * 0.26,
          grow: r * 0.10,
          color: dust.clone().multiplyScalar(0.12),
          colorEnd: dust.clone().multiplyScalar(0.20),
          opacity: 0.52,
          drag: 1.2,
          buoyancy: 0.9,
          rotationSpeed: (Math.random() - 0.5) * 0.7,
          kind: PKind.Smoke,
          turbulence: 1.1,
          shade: plumeShade(dir, sunDir) * 0.85,
          shadeEnd: 1.0,
          fadeIn: 0.3,
          fadePow: 1.25,
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
      // Extinction per metre, and smaller is what lets it be denser. Integrated
      // through the middle of a three-metre core at 0.058 the volume removed
      // about a tenth of what passed through it, which is below the noise floor
      // of the capture it was supposed to be visible in — the pass was running
      // for no return at all.
      //
      // Raising the density on the old radius is what produced the smooth
      // radially-graded veil this comment used to warn about, so the radius
      // comes down with it: at two metres the ellipsoid sits entirely inside the
      // billboard smoke that is drawn over it, so nothing of its shape reaches
      // the frame and only its effect on the light does. That buys about four
      // tenths of optical depth through the base of the column, which is where a
      // shaft of sun crossing a plume is actually visible.
      radius: r * 0.32, density: 0, peak: 0.30 * s, ramp: 0.55, t: 0,
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

/**
 * Warm bias for airborne dust, applied on top of the surface's own colour.
 *
 * Airborne dust is dense enough to be optically thick, so the scattering solve
 * extinguishes most of the beam and lights the puff mostly from the sky — and
 * the sky here is blue. An opaque road beside it takes the beam neat and stays
 * warm, so a puff authored at the road's own hue photographs *cooler* than the
 * road and reads as pale grey fog. This is the correction, and it is also what
 * the fines actually are: the clay fraction that stays airborne is redder than
 * the aggregate the round hit.
 */
const WARM_DUST = new THREE.Color(1.0, 0.90, 0.70);

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
  // Wider than a Lambert term, and that is the point: this is not a surface
  // normal, it is *which side of a self-shadowing column a parcel sits on*.
  // The near side of a plume of soot receives almost nothing, so the floor is
  // low and the curve is steep — at a floor of 0.2 and a gentle exponent, a
  // parcel on the shadowed side of the stack still scored two thirds of the
  // sunlit one and the whole column photographed as a single even brown mass
  // with a rim drawn nowhere.
  return 0.07 + 0.93 * Math.min(1, Math.max(0, d * 0.62 + 0.52)) ** 2.1;
}
