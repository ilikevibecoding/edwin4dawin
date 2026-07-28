import * as THREE from 'three';
import { headingToDir, headingToRight, UP } from './Common';
import type { Afterburner, AfterburnerSet, DistortionField } from './Exhaust';
import type { JetAssets, JetInstance } from './models/Jet';
import { CONTRAIL, VORTEX, type TrailSystem } from './Trails';

/**
 * How the jets fly.
 *
 * The run is scripted, but the flight is not animated: the aircraft integrates
 * a state — position, heading, bank, climb — from a small set of commands, so
 * the bank angle and the turn rate are the same number seen twice and the
 * aeroplane cannot roll one way while turning the other. That coupling is the
 * whole of why a scripted flypast reads as an aircraft rather than as a mesh on
 * a spline, and it costs four lines:
 *
 *   ω = g·tan(φ) / V
 *
 * A coordinated turn's yaw rate is entirely determined by how far it is banked
 * and how fast it is going. Command a bank, get a turn. Command a pull-up, get
 * the pitch attitude that goes with the climb rate. Nothing else is authored.
 *
 * The profile in three acts:
 *
 *   run-in   straight, level, wings rocking a degree or so in the thermals,
 *            burner at military power. Ends at the last release.
 *   pull-up  full afterburner, climbing at twenty-five metres a second, rolling
 *            into eighty degrees of bank away from the target.
 *   egress   the turn continues until the aircraft is a mile out and small.
 *
 * Everything that trails off it — contrail, wingtip vortices, exhaust
 * distortion — is hung on anchors in the model and follows for free.
 */

/** Metres per second. Slow for a fast jet, and deliberately so; see below. */
export const RUN_SPEED = 88;

const _pos = new THREE.Vector3();
const _fwd = new THREE.Vector3();
const _right = new THREE.Vector3();
const _look = new THREE.Vector3();
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _qRoll = new THREE.Quaternion();
const _scale = new THREE.Vector3(1, 1, 1);
const _world = new THREE.Vector3();
const _tmp = new THREE.Vector3();
const _fwdZ = new THREE.Vector3(0, 0, 1);

export interface JetLaunch {
  /** Where the aircraft starts, in world space. */
  x: number;
  y: number;
  z: number;
  /** Compass heading it flies, in radians. */
  heading: number;
  speed: number;
  /** Seconds from launch until the pull-up starts. */
  pullUpAt: number;
  /** +1 breaks right, -1 breaks left. */
  breakDir: number;
  /** Lateral offset from the leader, in metres. Positive is to the right. */
  formationRight: number;
  formationUp: number;
  /** Metres behind the leader. */
  formationBack: number;
  /** Whether this aircraft lays a contrail. */
  contrail: boolean;
}

export class Jet {
  readonly instance: JetInstance;
  readonly burners: Afterburner[] = [];

  active = false;
  age = 0;
  /** Seconds of flight before the pull-up begins. */
  pullUpAt = 6;
  speed = RUN_SPEED;

  readonly position = new THREE.Vector3();
  readonly velocity = new THREE.Vector3();
  heading = 0;
  bank = 0;
  pitch = 0;
  throttle = 0.55;

  private breakDir = 1;
  private contrailIndex = -1;
  private vortexIndex: [number, number] = [-1, -1];
  private trails: TrailSystem;
  private seed = 0;

  constructor(
    parent: THREE.Object3D,
    assets: JetAssets,
    burners: AfterburnerSet,
    trails: TrailSystem,
    seed: number,
  ) {
    this.instance = assets.instantiate(`killstreak.jet.${seed}`);
    this.instance.root.visible = false;
    parent.add(this.instance.root);
    this.trails = trails;
    this.seed = seed;

    for (let i = 0; i < this.instance.nozzles.length; i++) {
      const burner = burners.make(0.42, 9.5);
      parent.add(burner.mesh);
      this.burners.push(burner);
    }
  }

  launch(opts: JetLaunch): void {
    this.active = true;
    this.age = 0;
    this.speed = opts.speed;
    this.pullUpAt = opts.pullUpAt;
    this.breakDir = opts.breakDir;
    this.heading = opts.heading;
    this.bank = 0;
    this.pitch = 0;
    this.throttle = 0.62;

    headingToDir(opts.heading, _fwd);
    headingToRight(opts.heading, _right);
    this.position
      .set(opts.x, opts.y, opts.z)
      .addScaledVector(_right, opts.formationRight)
      .addScaledVector(_fwd, -opts.formationBack)
      .addScaledVector(UP, opts.formationUp);
    this.velocity.copy(_fwd).multiplyScalar(this.speed);

    this.contrailIndex = opts.contrail ? this.trails.acquire(CONTRAIL) : -1;
    this.vortexIndex[0] = this.trails.acquire(VORTEX);
    this.vortexIndex[1] = this.trails.acquire(VORTEX);
    this.instance.root.visible = true;
    this.writeTransform();
  }

  update(dt: number, time: number, distortion: DistortionField | null): void {
    if (!this.active) return;
    this.age += dt;

    const sincePull = this.age - this.pullUpAt;
    let climb = 0;
    let targetBank = 0;
    let targetThrottle = 0.62;

    if (sincePull < 0) {
      // Holding the run-in. A dead-steady aeroplane looks dead, so the wings
      // rock through a degree and a half on a period no one can count.
      targetBank = Math.sin(this.age * 0.9 + this.seed) * 0.026;
      // High military power rather than cruise. A laden aircraft flying a low
      // pass at 170 knots would really be somewhere near here, and it is also
      // the throttle at which the nozzles start to glow — which is the whole
      // reason the engine bays were modelled.
      targetThrottle = 0.78;
    } else {
      // Pull-up and break. Full reheat, because this is the moment the
      // afterburner is supposed to be seen.
      const u = Math.min(1, sincePull / 2.6);
      climb = 27 * u * u * (1 - 0.25 * Math.max(0, sincePull - 4) * 0.1);
      targetBank = 1.36 * this.breakDir * Math.min(1, sincePull / 1.9);
      targetThrottle = 1;
    }

    // First-order lags on both, so the aeroplane has inertia: a roll rate of
    // about ninety degrees a second, which is right for a loaded strike jet.
    const rollRate = 1 - Math.exp(-dt * 1.9);
    this.bank += (targetBank - this.bank) * rollRate;
    this.throttle += (targetThrottle - this.throttle) * (1 - Math.exp(-dt * 3.2));

    // The coupling: a banked aeroplane turns, and the rate follows from the
    // bank and the speed alone.
    //
    // Only the break turns it, though. The wing rock on the run-in is a degree
    // and a half of display and nothing else, because a pilot holding a
    // bombing run holds a *track*: feeding the rock into the turn-rate
    // coupling integrates a sinusoid into a cosine, and the aircraft arrives
    // over the target two and a half metres off the line it was aimed down —
    // which was enough to walk a stick of seven out of the street and into the
    // awnings on one side of it.
    const turning = sincePull < 0 ? 0 : this.bank;
    this.heading += ((9.81 * Math.tan(turning)) / Math.max(20, this.speed)) * dt;
    this.pitch = Math.asin(Math.max(-0.6, Math.min(0.6, climb / Math.max(20, this.speed))));

    headingToDir(this.heading, _fwd);
    const horizontal = Math.sqrt(Math.max(0, this.speed * this.speed - climb * climb));
    this.velocity.set(_fwd.x * horizontal, climb, _fwd.z * horizontal);
    this.position.addScaledVector(this.velocity, dt);

    this.writeTransform();
    this.layTrails(distortion, time);
  }

  private writeTransform(): void {
    // The model's nose runs down -Z, so a camera-convention lookAt basis points
    // it along the velocity without a flip; roll is then applied about that
    // same axis, negated because a right-wing-down bank is a negative rotation
    // about +Z when +Z is aft.
    headingToDir(this.heading, _fwd);
    _look
      .copy(this.position)
      .addScaledVector(_fwd, Math.cos(this.pitch) * 10)
      .addScaledVector(UP, Math.sin(this.pitch) * 10);
    _m.lookAt(this.position, _look, UP);
    _q.setFromRotationMatrix(_m);
    _qRoll.setFromAxisAngle(_fwdZ, -this.bank);
    _q.multiply(_qRoll);

    const root = this.instance.root;
    root.position.copy(this.position);
    root.quaternion.copy(_q);
    root.updateMatrix();
    root.updateMatrixWorld(true);
  }

  private layTrails(distortion: DistortionField | null, time: number): void {
    const inst = this.instance;

    // Nozzle glow tracks the throttle: the cans go from a dull heat stain at
    // military power to something the tone mapper has to work at in reheat.
    const glow = this.throttle * this.throttle;
    for (let i = 0; i < inst.nozzleGlow.length; i++) {
      const mat = inst.nozzleGlow[i].material as THREE.MeshBasicMaterial;
      mat.color.setRGB(2.6 * glow + 0.05, 0.95 * glow + 0.03, 0.42 * glow + 0.02);
    }

    for (let i = 0; i < inst.nozzles.length && i < this.burners.length; i++) {
      inst.nozzles[i].getWorldPosition(_world);
      const burner = this.burners[i];
      burner.mesh.position.copy(_world);
      burner.mesh.quaternion.copy(inst.root.quaternion);
      burner.mesh.updateMatrix();
      burner.mesh.updateMatrixWorld(true);
      burner.set(Math.max(0, this.throttle - 0.45) * 1.9, time);

      if (distortion) {
        // The shimmer sits behind the plume, not on it, and it is wide and
        // short because the shear layer spreads faster than the core burns.
        inst.root.getWorldDirection(_tmp);
        distortion.add(
          _world.x + _tmp.x * 7,
          _world.y + _tmp.y * 7,
          _world.z + _tmp.z * 7,
          4.5,
          0.55 + this.throttle * 0.7,
          2.4,
          0.9,
          this.seed * 31 + i * 7,
        );
      }
    }

    if (this.contrailIndex >= 0) {
      inst.spine.getWorldPosition(_world);
      this.trails.lay(this.contrailIndex, _world.x, _world.y, _world.z);
    }
    // Vortices are shed hard in a pull-up and barely at all in level flight:
    // it is the lift coefficient that condenses them, so the cue is the g, and
    // the g is the bank.
    const loading = Math.abs(this.bank) > 0.35 || this.age > this.pullUpAt;
    for (let i = 0; i < 2; i++) {
      const index = this.vortexIndex[i];
      if (index < 0) continue;
      if (!loading) continue;
      inst.wingtips[i].getWorldPosition(_world);
      this.trails.lay(index, _world.x, _world.y, _world.z);
    }
  }

  /** World transform of a hardpoint, for a store that is still hanging on it. */
  hardpoint(index: number, out: THREE.Matrix4): boolean {
    const points = this.instance.hardpoints;
    if (index < 0 || index >= points.length) return false;
    out.copy(points[index].matrixWorld);
    return true;
  }

  get hardpointCount(): number {
    return this.instance.hardpoints.length;
  }

  /** How far right of the centreline a station hangs, in metres. */
  stationOffset(index: number): number {
    const points = this.instance.hardpoints;
    if (index < 0 || index >= points.length) return 0;
    return points[index].position.x;
  }

  /** Distance from a point, for the flyby event and for audio panning. */
  distanceTo(p: THREE.Vector3): number {
    return this.position.distanceTo(p);
  }

  stand(): void {
    if (!this.active) return;
    this.active = false;
    this.instance.root.visible = false;
    for (const burner of this.burners) burner.set(0, 0);
    if (this.contrailIndex >= 0) this.trails.release(this.contrailIndex);
    this.trails.release(this.vortexIndex[0]);
    this.trails.release(this.vortexIndex[1]);
    this.contrailIndex = -1;
    this.vortexIndex[0] = -1;
    this.vortexIndex[1] = -1;
  }
}

/**
 * The flight.
 *
 * Three airframes, allocated once at boot and never again. A strike uses two or
 * three of them; the pool is never grown, because an airstrike that allocates a
 * fourth aeroplane mid-run is a compile and an upload at the worst moment in
 * the game.
 */
export class JetFlight {
  private readonly group = new THREE.Group();
  readonly jets: Jet[] = [];

  constructor(
    scene: THREE.Object3D,
    assets: JetAssets,
    burners: AfterburnerSet,
    trails: TrailSystem,
    count: number,
  ) {
    this.group.name = 'killstreak.flight';
    this.group.matrixAutoUpdate = false;
    scene.add(this.group);
    for (let i = 0; i < count; i++) {
      this.jets.push(new Jet(this.group, assets, burners, trails, i));
    }
  }

  update(dt: number, time: number, distortion: DistortionField | null): void {
    for (const jet of this.jets) jet.update(dt, time, distortion);
  }

  get activeCount(): number {
    let n = 0;
    for (const jet of this.jets) if (jet.active) n++;
    return n;
  }

  clear(): void {
    for (const jet of this.jets) jet.stand();
  }

  dispose(): void {
    this.clear();
    this.group.removeFromParent();
  }
}

/** Lead position on the run-in at a given time before the first release. */
export function runInPoint(
  heading: number,
  target: THREE.Vector3,
  altitude: number,
  metresBefore: number,
  out: THREE.Vector3,
): THREE.Vector3 {
  headingToDir(heading, _pos);
  return out.set(
    target.x - _pos.x * metresBefore,
    altitude,
    target.z - _pos.z * metresBefore,
  );
}
