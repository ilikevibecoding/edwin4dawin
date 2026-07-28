import * as THREE from 'three';
import type { ExplosionEvent, ImpactEvent, SurfaceKind, TracerEvent } from '../core/Events';
import { Groups, type GameContext } from '../core/GameContext';
import type { IPhysics, IPlayer, ISky, RaycastHit } from '../core/Interfaces';
import { registerVantages } from '../core/Vantage';
import type FXSystem from './FXSystem';

/**
 * The effects test range, active on `?showcase=fx`.
 *
 * Screenshots of particle systems are hard to compare because particles move.
 * This showcase makes them comparable: every trigger clears the world of
 * effects first, fires one thing from a fixed seed, and then fast-forwards the
 * simulation by an exact number of seconds before the frame is taken. Because
 * the particle simulation is closed-form, that fast-forward is not an
 * approximation of where the effect would have been — it is where it is.
 *
 * Four of the vantages photograph the same grenade at 0.05 s, 0.3 s, 1 s and
 * 4 s, which is the sequence worth judging: the detonation, the fireball, the
 * turn to smoke, and the column standing in the wind.
 *
 * Everything is also on `window.__FX__` for driving by hand:
 *
 *   __FX__.explode('airstrike'); __FX__.at(0.4)
 *   __FX__.impacts();            __FX__.smoke(); __FX__.at(6)
 */

interface Trigger {
  (): void;
}

const SURFACES: SurfaceKind[] = [
  'concrete',
  'metal',
  'wood',
  'sand',
  'glass',
  'flesh',
  'plaster',
  'dirt',
  'foliage',
  'fabric',
];

declare global {
  interface Window {
    __FX__?: {
      /** Clears every live effect and lets the clock run again. */
      reset(): void;
      /** Jumps to `seconds` after the trigger and holds the clock there. */
      at(seconds: number): void;
      /** Releases the hold `at` put on the clock. */
      play(): void;
      explode(source?: ExplosionEvent['source'], radius?: number): void;
      impacts(surface?: SurfaceKind): void;
      impact(surface: SurfaceKind, index?: number): void;
      smoke(radius?: number, duration?: number): void;
      flashbang(): void;
      tracers(count?: number, when?: number): void;
      muzzle(count?: number): void;
      shells(count?: number): void;
      blood(): void;
      stats(): Record<string, number | string>;
    };
  }
}

/** Where the range sits: the middle of the market street, on real geometry. */
const ORIGIN = new THREE.Vector3(0, 0, 0);

/** What counts as an obstruction when siting the range and the cameras. */
const PROBE_MASK = Groups.WORLD | Groups.PROP | Groups.GLASS;

const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _hit: RaycastHit = {
  point: new THREE.Vector3(),
  normal: new THREE.Vector3(0, 1, 0),
  distance: 0,
  object: new THREE.Object3D(),
  surface: 'concrete',
};

export class FXShowcase {
  private ctx: GameContext;
  private fx: FXSystem;
  private ground = 0;
  /** Bearing of the clear lane the range stands in, from the map origin. */
  private lane = 0;
  private laneLength = 20;
  /** Horizontal bearing toward the sun, so no camera ends up staring at it. */
  private sunBearing = 0;
  private sunElevation = 1;
  private impactWall: Array<{ point: THREE.Vector3; normal: THREE.Vector3 }> = [];
  private triggers = new Map<string, Trigger>();

  constructor(ctx: GameContext, fx: FXSystem) {
    this.ctx = ctx;
    this.fx = fx;

    const physics = ctx.tryGet<IPhysics>('physics');

    // A clear, low sun makes the lit smoke worth photographing: at noon the
    // scatter term has nowhere interesting to point.
    const sky = ctx.tryGet<ISky>('sky');
    sky?.applyPreset?.('golden');
    if (sky) {
      this.sunBearing = Math.atan2(sky.sunDirection.z, sky.sunDirection.x);
      this.sunElevation = sky.sunDirection.y;
    }

    this.placeRange(physics);
    this.probeWalls(physics);
    this.install();
    this.registerShots();
    console.log('[fx] showcase ready — window.__FX__');
  }

  /* ------------------------------ geometry ------------------------------- */

  /**
   * Stands the range on the flattest, most open ground the level has.
   *
   * The map origin is inside a fountain basin, and a blast set off in a basin
   * hides every stage that hugs the floor — the dust ring, the scorch, the
   * settling grit — behind a stone wall a metre away. Worse, the first clear
   * bearing out of it runs straight past a palm, and a trunk two metres from
   * the lens is a black bar down the middle of every frame.
   *
   * So the site is searched for rather than assumed. Candidates on a polar
   * grid are rejected unless the floor is level across the width of the
   * fireball, there is headroom for the column, and the horizon is open in
   * most directions; the survivors are ranked by how far the eye can see. It
   * costs a few hundred rays once, at startup, and it is the difference
   * between photographing an explosion and photographing a wall.
   */
  private placeRange(physics: IPhysics | undefined): void {
    const base = physics?.groundHeight?.(0, 0, 60) ?? 0;
    this.ground = base;
    ORIGIN.set(0, base, 0);
    if (!physics?.raycastInto || !physics.groundHeight) return;

    let bestScore = -1;

    for (let ring = 0; ring < SITE_RINGS.length; ring++) {
      const radius = SITE_RINGS[ring];
      const spokes = radius === 0 ? 1 : 20;
      for (let s = 0; s < spokes; s++) {
        const a = (s / spokes) * Math.PI * 2;
        const x = Math.cos(a) * radius;
        const z = Math.sin(a) * radius;

        // Rooftops are flat and gloriously open and completely unrepresentative
        // of where a grenade goes off, so anything much above the street is out.
        const floor = physics.groundHeight(x, z, base + 40);
        if (floor === null || floor > base + 1.6 || floor < base - 4) continue;

        // Level across the width of the ring, or the dust runs uphill into a
        // kerb and the crater decal folds over an edge.
        let flat = true;
        for (let f = 0; f < FLAT_OFFSETS.length && flat; f++) {
          const o = FLAT_OFFSETS[f];
          const h = physics.groundHeight(x + o[0], z + o[1], floor + 12);
          if (h === null || Math.abs(h - floor) > 0.45) flat = false;
        }
        if (!flat) continue;

        // Headroom for the column.
        _v.set(x, floor + 0.5, z);
        _dir.set(0, 1, 0);
        if (physics.raycastInto(_v, _dir, 22, _hit, PROBE_MASK)) continue;

        // Openness. A site is only worth using if the eye can stand well back
        // on at least one bearing, so both the mean and the best matter.
        _v.set(x, floor + 1.7, z);
        let total = 0;
        let laneReach = 0;
        let laneAngle = 0;
        let blocked = 0;
        for (let i = 0; i < SITE_SPOKES; i++) {
          const b = (i / SITE_SPOKES) * Math.PI * 2;
          _dir.set(Math.cos(b), 0, Math.sin(b));
          const clear = physics.raycastInto(_v, _dir, 45, _hit, PROBE_MASK) ? _hit.distance : 45;
          total += Math.min(clear, 30);
          if (clear < 5) blocked++;
          if (clear > laneReach) {
            laneReach = clear;
            laneAngle = b;
          }
        }
        // More than a third of the horizon in arm's reach means a corner.
        if (blocked > SITE_SPOKES / 3) continue;

        const score = total / SITE_SPOKES + Math.min(laneReach, 34) * 0.8 - radius * 0.12;
        if (score > bestScore) {
          bestScore = score;
          this.lane = laneAngle;
          this.laneLength = laneReach;
          this.ground = floor;
          ORIGIN.set(x, floor, z);
        }
      }
    }
  }

  /** Finds real vertical surfaces around the origin to shoot at. */
  private probeWalls(physics: IPhysics | undefined): void {
    this.impactWall.length = 0;
    if (!physics?.raycast) return;
    const eye = _v.set(ORIGIN.x, this.ground + 1.5, ORIGIN.z);
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      _dir.set(Math.cos(a), 0, Math.sin(a));
      const hit = physics.raycast(eye, _dir, 26);
      if (!hit || hit.distance < 3) continue;
      this.impactWall.push({ point: hit.point.clone(), normal: hit.normal.clone() });
      if (this.impactWall.length >= 12) break;
    }
  }

  /* ------------------------------ triggers -------------------------------- */

  private install(): void {
    const fx = this.fx;

    const reset = (): void => {
      fx.setFrozen(false);
      fx.clear();
      // Decals outlive a match on purpose, so `IFX.clear` leaves them alone.
      // Between two shots of the range they are just the previous shot's
      // crater sitting in the middle of this one.
      fx.decals?.clear();
      this.ctx.tryGet<IPlayer>('player')?.setFrozen?.(true);
    };

    /**
     * Fast-forwards to an exact age and stops the clock there.
     *
     * The harness steps several frames after posing so exposure and the
     * temporal history converge; without the freeze those frames would carry a
     * 50 ms fireball to 150 ms and the four-shot explosion sequence would be
     * photographing the wrong moments.
     */
    const at = (seconds: number): void => {
      fx.setFrozen(true);
      fx.advance(seconds);
    };

    const explode = (source: ExplosionEvent['source'] = 'grenade', radius?: number): void => {
      const isBomb = source === 'airstrike';
      _explosion.position.set(ORIGIN.x, this.ground + (isBomb ? 0.5 : 0.35), ORIGIN.z);
      _explosion.radius = radius ?? (isBomb ? 14 : source === 'barrel' ? 5 : 6);
      _explosion.damage = isBomb ? 260 : 120;
      _explosion.scale = 1;
      _explosion.source = source;
      this.ctx.events.emit('fx:explosion', _explosion);
    };

    const impact = (surface: SurfaceKind, index = 0): void => {
      const wall = this.impactWall[index % Math.max(1, this.impactWall.length)];
      if (wall) {
        _impact.point.copy(wall.point);
        _impact.normal.copy(wall.normal);
      } else {
        // No geometry found: shoot the floor so the showcase still works.
        _impact.point.set(ORIGIN.x + index * 0.5, this.ground + 0.01, ORIGIN.z);
        _impact.normal.set(0, 1, 0);
      }
      _impact.direction.copy(_impact.normal).multiplyScalar(-1);
      _impact.surface = surface;
      _impact.energy = 1;
      this.ctx.events.emit('fx:impact', _impact);
    };

    /** One of every surface, spread along the nearest wall or the floor. */
    const impacts = (only?: SurfaceKind): void => {
      const list = only ? [only] : SURFACES;
      const wall = this.impactWall[0];
      for (let i = 0; i < list.length; i++) {
        if (wall) {
          // Fan the hits across the face of the wall so each is legible.
          _v.copy(wall.normal).cross(UP).normalize();
          const spread = (i - (list.length - 1) / 2) * 0.55;
          _impact.point.copy(wall.point).addScaledVector(_v, spread);
          _impact.point.y = this.ground + 1.35;
          _impact.normal.copy(wall.normal);
        } else {
          const spread = (i - (list.length - 1) / 2) * 0.7;
          _impact.point.set(ORIGIN.x + spread, this.ground + 0.01, ORIGIN.z);
          _impact.normal.set(0, 1, 0);
        }
        _impact.direction.copy(_impact.normal).multiplyScalar(-1);
        _impact.surface = list[i];
        _impact.energy = 0.85 + (i % 3) * 0.2;
        this.ctx.events.emit('fx:impact', _impact);
      }
    };

    const smoke = (radius = 4.5, duration = 18): void => {
      _smoke.position.set(ORIGIN.x, this.ground + 0.2, ORIGIN.z);
      _smoke.radius = radius;
      _smoke.duration = duration;
      this.ctx.events.emit('fx:smoke', _smoke);
    };

    const flashbang = (): void => {
      _flash.position.set(ORIGIN.x, this.ground + 1.2, ORIGIN.z);
      this.ctx.events.emit('fx:flashbang', _flash);
    };

    /**
     * A tracer exchange, staged so that it photographs.
     *
     * A round flying straight down the camera axis foreshortens to a dot. That
     * is not a bug — it is what your own tracers look like, and the shader is
     * doing exactly the right thing — but a frame full of them tells you
     * nothing about the effect, and the first attempt at this shot produced
     * sixteen glowing balls indistinguishable from the street lamps behind
     * them. So the burst is staged from the flank of a firefight: most of it
     * crosses the frame, where a streak has length, with a few running
     * downrange for contrast.
     *
     * Each round is positioned by working backwards from where it should be
     * when the shutter opens rather than from where it was fired, so the
     * visible part of the flight lands in open air instead of inside whichever
     * building the muzzle happened to be pointing at.
     */
    const tracers = (count = 22, when = 0.03): void => {
      const camera = this.ctx.camera;
      camera.getWorldDirection(_forward);
      _side.crossVectors(_forward, UP).normalize();
      const speed = 780;
      const travelled = speed * when;

      for (let i = 0; i < count; i++) {
        const u = count > 1 ? i / (count - 1) : 0;
        const outgoing = i % 2 === 0;

        // Where the round is at the instant being photographed. Rising with
        // range so the burst fans across the frame instead of stacking into a
        // single band at eye level.
        _v.copy(camera.position)
          .addScaledVector(_forward, 10 + u * 22)
          .addScaledVector(_side, Math.sin(u * 9.1 + (outgoing ? 0 : 2.1)) * 3.4)
          .addScaledVector(UP, -1.1 + u * 2.2 + Math.sin(u * 5.7) * 0.9);

        // Angled across the view rather than along it, and the two sides cross
        // in opposite directions so the exchange reads as an exchange.
        _dir
          .copy(_forward)
          .multiplyScalar(outgoing ? 0.6 : -0.5)
          .addScaledVector(_side, (outgoing ? 0.9 : -0.75) * (0.55 + 0.5 * Math.cos(u * 4.3)))
          .addScaledVector(UP, 0.13 * Math.sin(u * 3.1) + (outgoing ? 0.04 : -0.05))
          .normalize();

        _tracer.origin.copy(_v).addScaledVector(_dir, -travelled);
        _tracer.end.copy(_v).addScaledVector(_dir, 24);
        _tracer.speed = speed;
        _tracer.caliber = 7.62;
        _tracer.fromPlayer = outgoing;
        this.ctx.events.emit('fx:tracer', _tracer);
      }
    };

    /**
     * A burst, photographed from beside the shooter rather than behind the gun.
     *
     * A muzzle a metre from the lens fills half the frame with white, which is
     * what firing a rifle genuinely looks like and tells you nothing about the
     * flash. Three metres out and pointed across the view, the lobe structure,
     * the hot core and the powder smoke the previous rounds left are all
     * legible in the same frame.
     */
    const muzzle = (count = 6): void => {
      const camera = this.ctx.camera;
      camera.getWorldDirection(_forward);
      _side.crossVectors(_forward, UP).normalize();
      _v.copy(camera.position).addScaledVector(_forward, 3.4).addScaledVector(UP, -0.3);
      _dir.copy(_forward).multiplyScalar(0.5).addScaledVector(_side, 0.87).normalize();
      for (let i = 0; i < count; i++) {
        _muzzleEvent.position.copy(_v);
        _muzzleEvent.direction.copy(_dir);
        _muzzleEvent.scale = 1;
        this.ctx.events.emit('weapon:fire', _fire);
        this.ctx.events.emit('fx:muzzleflash', _muzzleEvent);
        // Space the shots so the barrel heats and the smoke builds.
        if (i < count - 1) fx.advance(0.09);
      }
    };

    const shells = (count = 10): void => {
      const camera = this.ctx.camera;
      camera.getWorldDirection(_dir);
      for (let i = 0; i < count; i++) {
        _shell.position
          .copy(camera.position)
          .addScaledVector(_dir, 0.7)
          .addScaledVector(UP, -0.15);
        _v.crossVectors(_dir, UP).normalize();
        _shell.velocity.copy(_v).multiplyScalar(-2.6).addScaledVector(UP, 1.8);
        _shell.caliber = 5.56;
        this.ctx.events.emit('fx:shell', _shell);
        if (i < count - 1) fx.advance(0.1);
      }
    };

    const blood = (): void => {
      // Sprayed away from the camera, down the lane: a spray coming at the
      // lens is a red screen, and the mist behind the target is the shot.
      const cos = Math.cos(this.lane);
      const sin = Math.sin(this.lane);
      _bloodEvent.position.set(ORIGIN.x, this.ground + 1.45, ORIGIN.z);
      _bloodEvent.direction.set(cos, 0.22, sin).normalize();
      _bloodEvent.amount = 1.6;
      this.ctx.events.emit('fx:blood', _bloodEvent);
      _death.id = 1;
      _death.position.set(ORIGIN.x + cos * 0.4, this.ground + 1.05, ORIGIN.z + sin * 0.4);
      _death.headshot = true;
      _death.impulse.copy(_bloodEvent.direction);
      _death.weapon = 'showcase';
      this.ctx.events.emit('enemy:death', _death);
    };

    this.triggers.set('reset', reset);
    this.triggers.set('explode', () => explode());
    this.triggers.set('impacts', () => impacts());
    this.triggers.set('smoke', () => smoke());
    this.triggers.set('tracers', () => tracers());

    window.__FX__ = {
      reset,
      at,
      play: () => fx.setFrozen(false),
      explode,
      impacts,
      impact,
      smoke,
      flashbang,
      tracers,
      muzzle,
      shells,
      blood,
      stats: () => ({
        particles: fx.particleCount,
        capacity: fx.particleCapacity,
        decals: fx.decals?.count ?? 0,
        preset: this.ctx.quality.preset,
      }),
    };
  }

  /* ------------------------------- vantages -------------------------------- */

  /**
   * A camera stood off from the blast on the cleanest bearing available.
   *
   * Two failure modes have to be avoided and they pull in opposite directions.
   * Backing far enough away to frame an airstrike column puts the lens inside
   * the building on that side of the street; hugging the blast to stay out of
   * the walls loses the column. Worse than either is the near miss — a camera
   * with clear line of sight to the fireball that happens to be standing
   * behind a palm, which reads as a black bar down the middle of the frame and
   * ruins the shot without ever occluding the subject.
   *
   * The bearing is therefore chosen per shot, not once: candidates around the
   * lane are scored on how much of the requested standoff they allow and, more
   * heavily, on how much geometry sits in the near field of the resulting
   * view. That last term is what a line-of-sight test alone cannot see.
   */
  private eye(distance: number, height: number, lookHeight = 1.5, bearing?: number): THREE.Vector3 {
    const physics = this.ctx.tryGet<IPhysics>('physics');
    const out = new THREE.Vector3(
      ORIGIN.x - Math.cos(this.lane) * distance,
      this.ground + height,
      ORIGIN.z - Math.sin(this.lane) * distance,
    );
    if (!physics?.raycastInto) return out;

    let bestScore = -Infinity;

    for (let i = 0; i < BEARING_OFFSETS.length; i++) {
      // Back down the lane by default, fanning out from there — unless the
      // caller has pinned a bearing, which the explosion sequence does so its
      // four frames are the same photograph at four times rather than four
      // photographs.
      const a = bearing ?? this.lane + Math.PI + BEARING_OFFSETS[i];
      const dx = Math.cos(a);
      const dz = Math.sin(a);

      // How far back this bearing lets the camera stand. The margin keeps the
      // near plane off the wall rather than flush against it.
      _v.set(ORIGIN.x, this.ground + height, ORIGIN.z);
      _dir.set(dx, 0, dz);
      let reach = distance;
      if (physics.raycastInto(_v, _dir, distance + 0.9, _hit, PROBE_MASK)) {
        reach = _hit.distance - 0.9;
      }
      if (reach < 2.5) {
        if (bearing !== undefined) break;
        continue;
      }

      const floor = physics.groundHeight?.(
        ORIGIN.x + dx * reach,
        ORIGIN.z + dz * reach,
        this.ground + 25,
      );
      const y = (floor === null || floor === undefined ? this.ground : floor) + height;
      _v2.set(ORIGIN.x + dx * reach, y, ORIGIN.z + dz * reach);

      // Staring down a low sun. Some backlight is exactly what a smoke or dust
      // effect wants — the forward-scattering lobe is most of why it reads as a
      // volume — but past about sixty degrees off the solar azimuth the disc
      // itself is in frame, the auto-exposure keys to it and the street goes
      // black behind a shapeless glare. Three-quarter backlight is allowed;
      // pointing straight at it is not.
      const facingSun =
        -Math.cos(a - this.sunBearing) * Math.max(0, 1 - this.sunElevation * 2);
      const score =
        -this.clutter(physics, _v2, lookHeight) * 6 -
        (distance - reach) * 1.4 -
        Math.max(0, facingSun - 0.45) * 22;
      if (score > bestScore) {
        bestScore = score;
        out.copy(_v2);
      }
      if (bearing !== undefined) break;
    }
    return out;
  }

  /** The bearing `eye` would settle on, for shots that must share a viewpoint. */
  private bearingFor(distance: number, height: number, lookHeight: number): number {
    const chosen = this.eye(distance, height, lookHeight);
    return Math.atan2(chosen.z - ORIGIN.z, chosen.x - ORIGIN.x);
  }

  /**
   * An aim point out along the axis the camera is already standing on.
   *
   * Rounds have to be photographed in flight, which means the lens needs depth
   * in front of it. Aiming at a bearing computed from the range's own lane put
   * the camera side-on to it and the whole burst behind a wall — every tracer
   * depth-tested away before it had travelled ten metres. Extending the axis
   * the camera was *placed* on cannot make that mistake, because that axis was
   * chosen for being clear.
   */
  private downrange(from: THREE.Vector3, metres = 40): THREE.Vector3 {
    _dir.set(ORIGIN.x - from.x, 0, ORIGIN.z - from.z);
    if (_dir.lengthSq() < 1e-6) _dir.set(1, 0, 0);
    _dir.normalize();
    let reach = metres;
    const physics = this.ctx.tryGet<IPhysics>('physics');
    if (physics?.raycastInto && physics.raycastInto(from, _dir, metres, _hit, PROBE_MASK)) {
      reach = Math.max(6, _hit.distance);
    }
    return new THREE.Vector3(
      from.x + _dir.x * reach,
      from.y - 0.05,
      from.z + _dir.z * reach,
    );
  }

  /**
   * Fraction of the frame filled by something within a few metres of the lens.
   *
   * A fan of rays over roughly the horizontal field of view, weighted so a
   * trunk at two metres counts for far more than a crate at six. Cheap, and it
   * measures the thing that actually ruins a photograph.
   */
  private clutter(physics: IPhysics, from: THREE.Vector3, lookHeight: number): number {
    _v.set(ORIGIN.x, this.ground + lookHeight, ORIGIN.z).sub(from);
    const base = Math.atan2(_v.z, _v.x);
    const span = Math.min(_v.length(), 30);
    let sum = 0;
    for (let i = 0; i < CLUTTER_YAW.length; i++) {
      for (let j = 0; j < CLUTTER_PITCH.length; j++) {
        const yaw = base + CLUTTER_YAW[i];
        const pitch = CLUTTER_PITCH[j];
        _dir.set(Math.cos(yaw), Math.tan(pitch), Math.sin(yaw)).normalize();
        if (!physics.raycastInto(from, _dir, span, _hit, PROBE_MASK)) continue;
        // Everything nearer than the blast is in the way; how much depends on
        // how close, since a near object subtends far more of the frame.
        const d = _hit.distance;
        if (d > span * 0.85) continue;
        sum += 1 / (1 + d * d * 0.25);
      }
    }
    return sum / (CLUTTER_YAW.length * CLUTTER_PITCH.length);
  }

  /**
   * Registers a shot.
   *
   * The camera is posed here as well as by the harness, and deliberately so:
   * `Vantage.setup` runs *before* the harness applies the pose, and several
   * triggers — tracers passing the player's ear, a muzzle flash a metre in
   * front of the lens — are defined relative to where the camera is standing.
   * Applying the same pose first means the trigger and the photograph agree.
   */
  private shot(
    name: string,
    position: THREE.Vector3,
    lookAt: THREE.Vector3,
    fov: number,
    note: string,
    run: () => void,
  ): void {
    const camera = this.ctx.camera;
    registerVantages([
      {
        name,
        position,
        lookAt,
        fov,
        hideViewmodel: true,
        note,
        setup: () => {
          camera.position.copy(position);
          camera.lookAt(lookAt);
          camera.fov = fov;
          camera.updateProjectionMatrix();
          camera.updateMatrixWorld(true);
          window.__FX__?.reset();
          // Held before the trigger, not after: a blast light handed to the
          // lighting rig at its true duration goes on burning through the
          // fast-forward, and a four-second-old crater comes out floodlit.
          this.fx.setFrozen(true);
          run();
        },
      },
    ]);
  }

  private registerShots(): void {
    const g = this.ground;
    const api = (): NonNullable<Window['__FX__']> => window.__FX__!;

    const target = (h: number): THREE.Vector3 => new THREE.Vector3(ORIGIN.x, g + h, ORIGIN.z);
    const view = (distance: number, height: number, look = 1.5): THREE.Vector3 =>
      this.eye(distance, height, look);

    // One tripod for the whole sequence. Letting each frame pick its own
    // bearing produced four correctly framed photographs of four different
    // streets, which is useless for judging how an explosion evolves.
    const blastBearing = this.bearingFor(14, 1.8, 3);

    const blast = (label: string, seconds: number, height: number, look: number): void => {
      this.shot(
        label,
        this.eye(14, height, look, blastBearing),
        target(look),
        55,
        `Grenade blast at t=${seconds}s from the same tripod.`,
        () => {
          api().explode('grenade');
          api().at(seconds);
        },
      );
    };

    blast('fx_explosion_early', 0.05, 1.7, 1.6);
    blast('fx_explosion_mid', 0.3, 1.7, 2.2);
    blast('fx_explosion_late', 1.0, 1.8, 3.4);
    blast('fx_explosion_settle', 4.0, 2.0, 5.5);

    this.shot(
      'fx_airstrike',
      view(32, 4, 10),
      target(10),
      62,
      'Airstrike bomb at t=1.2s: wider ring, taller column.',
      () => {
        api().explode('airstrike');
        api().at(1.2);
      },
    );

    this.shot(
      'fx_barrel',
      view(9, 1.7, 2.4),
      target(2.4),
      55,
      'Fuel barrel at t=0.45s: rolling fireball, heavy soot.',
      () => {
        api().explode('barrel');
        api().at(0.45);
      },
    );

    // The impact wall is real level geometry, so the framing has to be derived
    // from whatever the probe actually found rather than assumed.
    const wall = this.impactWall[0];
    const wallLook = wall
      ? new THREE.Vector3(wall.point.x, g + 1.35, wall.point.z)
      : target(0.05);
    const wallEye = wall
      ? wallLook.clone().addScaledVector(wall.normal, 3.6).setY(g + 1.55)
      : new THREE.Vector3(ORIGIN.x, g + 2.4, ORIGIN.z + 3.2);

    this.shot(
      'fx_impacts',
      wallEye,
      wallLook,
      50,
      'One impact per surface across the nearest wall, at t=0.12s.',
      () => {
        api().impacts();
        api().at(0.12);
      },
    );

    this.shot(
      'fx_impacts_settled',
      wallEye,
      wallLook,
      50,
      'Same wall at t=1.4s: decals, settled dust, resting debris.',
      () => {
        api().impacts();
        api().at(1.4);
      },
    );

    this.shot(
      'fx_smoke',
      view(16, 1.7, 2.4),
      target(2.4),
      58,
      'Smoke screen fully deployed at t=7s: lit, soft, sight-blocking.',
      () => {
        api().smoke(5, 20);
        api().at(7);
      },
    );

    this.shot(
      'fx_smoke_deploy',
      view(11, 1.7, 1.6),
      target(1.6),
      58,
      'Smoke canister at t=1.1s: the pressurised jet phase.',
      () => {
        api().smoke(5, 20);
        api().at(1.1);
      },
    );

    const tracerEye = view(9, 1.6, 1.5);
    this.shot(
      'fx_tracers',
      tracerEye,
      this.downrange(tracerEye),
      62,
      'Outgoing amber and incoming green traces mid-flight.',
      () => {
        api().tracers(22, 0.03);
        api().at(0.03);
      },
    );

    const muzzleEye = view(6, 1.6, 1.5);
    this.shot(
      'fx_muzzle',
      muzzleEye,
      this.downrange(muzzleEye),
      62,
      'Sixth shot of a burst: flash plus the smoke the first five left.',
      () => {
        api().muzzle(6);
        api().at(0.012);
      },
    );

    this.shot(
      'fx_gore',
      view(3.2, 1.6, 1.4),
      target(1.4),
      52,
      'Lethal hit at t=0.18s: spray, mist, and the mark behind it.',
      () => {
        api().blood();
        api().at(0.18);
      },
    );

    this.shot(
      'fx_flashbang',
      view(6, 1.6, 1.2),
      target(1.2),
      60,
      'Flashbang detonating in the open with clear line of sight.',
      () => {
        api().flashbang();
        api().at(0.05);
      },
    );
  }

  update(): void {
    /* The showcase is entirely trigger-driven; nothing to step. */
  }

  dispose(): void {
    if (window.__FX__) delete window.__FX__;
    this.triggers.clear();
  }
}

const UP = new THREE.Vector3(0, 1, 0);
const _forward = new THREE.Vector3();
const _side = new THREE.Vector3();

/** Distances from the map origin swept when siting the range. */
const SITE_RINGS = [0, 6, 11, 16, 22, 29, 37];
const SITE_SPOKES = 16;
/** Points sampled around a candidate site to confirm the floor is level. */
const FLAT_OFFSETS: Array<[number, number]> = [
  [2.5, 0],
  [-2.5, 0],
  [0, 2.5],
  [0, -2.5],
  [1.8, 1.8],
  [-1.8, -1.8],
];
/** Bearings tried either side of the lane when standing a camera off. */
const BEARING_OFFSETS = [0, 0.26, -0.26, 0.52, -0.52, 0.85, -0.85, 1.3, -1.3];
/** A fan over the frame, used to find geometry sitting in front of the lens. */
const CLUTTER_YAW = [-0.42, -0.28, -0.14, 0, 0.14, 0.28, 0.42];
const CLUTTER_PITCH = [-0.2, -0.05, 0.1, 0.25];

const _explosion: ExplosionEvent = {
  position: new THREE.Vector3(),
  radius: 6,
  damage: 120,
  scale: 1,
  source: 'grenade',
};

const _impact: ImpactEvent = {
  point: new THREE.Vector3(),
  normal: new THREE.Vector3(0, 1, 0),
  surface: 'concrete',
  direction: new THREE.Vector3(0, -1, 0),
  energy: 1,
};

const _tracer: TracerEvent = {
  origin: new THREE.Vector3(),
  end: new THREE.Vector3(),
  speed: 780,
  caliber: 7.62,
  fromPlayer: true,
};

const _smoke = { position: new THREE.Vector3(), radius: 4.5, duration: 18 };
const _flash = { position: new THREE.Vector3() };
const _muzzleEvent = {
  position: new THREE.Vector3(),
  direction: new THREE.Vector3(0, 0, -1),
  scale: 1,
};
const _fire = {
  weaponId: 'showcase',
  origin: new THREE.Vector3(),
  direction: new THREE.Vector3(0, 0, -1),
  ammoLeft: 30,
  suppressed: false,
};
const _shell = {
  position: new THREE.Vector3(),
  velocity: new THREE.Vector3(),
  caliber: 5.56,
};
const _bloodEvent = {
  position: new THREE.Vector3(),
  direction: new THREE.Vector3(0, 0, 1),
  amount: 1.5,
};
const _death = {
  id: 1,
  position: new THREE.Vector3(),
  headshot: false,
  impulse: new THREE.Vector3(0, 0, 1),
  weapon: 'showcase',
};
