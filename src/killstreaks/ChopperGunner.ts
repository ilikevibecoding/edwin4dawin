/**
 * Chopper gunner.
 *
 * The gunship flies itself; the player only owns the gun. That split is the whole
 * design — an orbit the player cannot steer is what makes the reward feel like
 * being *given* a platform rather than being handed a flying camera, and it is
 * what forces the interesting decision, which is choosing targets under a clock
 * while the firing arc rotates away from them.
 *
 * The camera rides the gun rather than the airframe. The traverse is applied to
 * the gun node, the camera copies the gun's world transform each frame with a
 * gunner's-eye offset behind the breech, and the result is that the barrels are
 * genuinely in shot and genuinely pointing where the rounds go, because the rounds
 * leave the modelled muzzle.
 *
 * Timeline: 4.5 s of transit with the player still on the ground and in control,
 * then the takeover, then the remainder on the gun, then control back. The player's
 * body stays where it was and stays killable, which is correct — the gunship is
 * support, not an escape.
 */
import * as THREE from 'three';
import { clamp, damp, Rng } from '../core/MathUtils';
import type { EngineContext } from '../core/System';
import { spinRotors, type GunshipModel } from './models/Aircraft';
import type { KillstreakAssets } from './Assets';
import type { KillstreakDeps } from './Deps';
import type { Acoustics } from './Acoustics';
import { CHOPPER, SOUNDS } from './Tuning';
import { GunnerOverlay } from './GunnerOverlay';
import { Takeover } from './Takeover';

type Phase = 'idle' | 'inbound' | 'gunner' | 'egress';

/** Rotor noise emission interval. */
const GRAIN_INTERVAL = 0.32;
/** Rounds between minigun report samples: 1150 rpm is 19 shots a second. */
const SOUND_EVERY = 4;
/** Traverse gain, radians per device pixel. */
const TRAVERSE_GAIN = 0.0022;
/**
 * Sense of the orbit, and the one number in this file that is not free.
 *
 * The minigun is on the port door, so the aircraft has to circle with the map on
 * its left. Circling the other way puts the gunner's whole arc over open desert
 * — which is what the first capture of this sequence photographed: thirty
 * seconds of empty ground with the town behind the gunner's shoulder. It also
 * sets the bank, because an aircraft banks into its turn and this is which way
 * the turn goes.
 */
const ORBIT_SIGN = -1;

export class ChopperGunner {
  active = false;
  /** True while the camera and the mouse belong to the door gun. */
  inControl = false;

  private readonly overlay = new GunnerOverlay();
  private readonly takeover: Takeover;
  private readonly rng = new Rng(0x9a37f1);

  private ctx: EngineContext | null = null;
  private model: GunshipModel | null = null;
  private phase: Phase = 'idle';
  private clock = 0;
  private duration = 0;

  private readonly centre = new THREE.Vector3();
  private readonly entry = new THREE.Vector3();
  private readonly position = new THREE.Vector3();
  private readonly nextPosition = new THREE.Vector3();
  private readonly velocity = new THREE.Vector3();
  private readonly scratch = new THREE.Vector3();
  private readonly muzzlePosition = new THREE.Vector3();
  private readonly fireDirection = new THREE.Vector3();
  private readonly worldQuaternion = new THREE.Quaternion();
  private readonly eye = new THREE.Vector3();
  private readonly gunRotation = new THREE.Euler(0, 0, 0, 'YXZ');
  private readonly motion = { x: 0, y: 0 };

  private entryAngle = 0;
  private groundY = 0;
  private bank = 0;
  private yaw = -1.4;
  private pitch: number = CHOPPER.pitchNeutral;
  private barrelSpin = 0;
  private spinUp = 0;
  private fireTimer = 0;
  private roundsFired = 0;
  private hits = 0;
  private heat = 0;
  private recoil = 0;
  private grainTimer = 0;

  constructor(
    private readonly deps: KillstreakDeps,
    private readonly assets: KillstreakAssets,
    private readonly acoustics: Acoustics,
  ) {
    this.takeover = new Takeover(deps);
  }

  init(ctx: EngineContext): void {
    this.ctx = ctx;
  }

  get diagnostics(): { phase: Phase; clock: number; rounds: number; hits: number } {
    return { phase: this.phase, clock: this.clock, rounds: this.roundsFired, hits: this.hits };
  }

  launch(duration: number): void {
    const scene = this.deps.scene;
    const ctx = this.ctx;
    if (!scene || !ctx || this.active) return;

    this.active = true;
    this.phase = 'inbound';
    this.clock = 0;
    this.duration = Math.max(CHOPPER.arrival + 6, duration);
    this.roundsFired = 0;
    this.hits = 0;
    this.heat = 0;
    this.recoil = 0;
    this.spinUp = 0;
    this.yaw = -1.4;
    this.pitch = CHOPPER.pitchNeutral;

    const bounds = this.deps.world?.bounds;
    this.centre.set(0, 0, 0);
    if (bounds) bounds.getCenter(this.centre);
    this.groundY = this.deps.groundAt(this.centre.x, this.centre.z, 0);
    this.centre.y = this.groundY;

    // Come in from the quarter the player is facing away from, so the gunship
    // crosses their field of view on the way to the orbit.
    this.deps.playerPosition(this.scratch);
    this.entryAngle = Math.atan2(this.scratch.z - this.centre.z, this.scratch.x - this.centre.x);
    this.orbitPoint(this.entryAngle, this.entry);
    // Transit start: straight in from well outside the orbit on the entry radial.
    const inbound = CHOPPER.arrival * CHOPPER.speed * 2.4;
    this.position
      .copy(this.entry)
      .addScaledVector(
        this.scratch.set(Math.cos(this.entryAngle), 0, Math.sin(this.entryAngle)),
        inbound,
      );

    if (!this.model) {
      this.model = this.assets.createGunship();
      // Turret order, not the default XYZ. A pintle yaws about the airframe's up
      // axis and then pitches about the gun's own transverse axis; under XYZ the
      // pitch is applied outside the yaw, so at 80 degrees off the nose it rolls
      // the sightline instead of depressing it. That is a four degree depression
      // where twenty-six was asked for, and the rounds go over the town.
      this.model.gun.rotation.order = 'YXZ';
    }
    scene.add(this.model.root);
    this.writeAirframe(0, 0);

    this.deps.announce('CHOPPER GUNNER', 'STAND BY FOR HANDOVER', 3);
    this.deps.notify('GUNSHIP INBOUND', 'TAKING THE DOOR GUN', 'reward');
  }

  update(dt: number): void {
    if (!this.active) return;
    this.clock += dt;

    switch (this.phase) {
      case 'inbound':
        if (this.clock >= CHOPPER.arrival) this.takeGun();
        break;
      case 'gunner':
        if (this.clock >= this.duration) this.releaseGun();
        break;
      case 'egress':
        if (this.clock >= this.duration + 6) {
          this.finish();
          return;
        }
        break;
      default:
        break;
    }

    this.writeAirframe(this.clock, dt);
    if (this.phase === 'gunner') this.updateGun(dt);

    this.grainTimer -= dt;
    if (this.grainTimer <= 0) {
      this.grainTimer = GRAIN_INTERVAL;
      this.acoustics.emit(
        SOUNDS.rotor,
        this.position,
        this.velocity,
        this.deps.now,
        this.inControl ? 0.5 : 0.85,
        60,
        520,
      );
    }
  }

  /**
   * Camera write happens in `lateUpdate`, after the player controller has put the
   * camera back on the player's head at order 200. Overwriting it here rather than
   * fighting for it earlier is why the handover is clean.
   */
  lateUpdate(): void {
    if (!this.inControl || !this.ctx || !this.model) return;
    const camera = this.ctx.camera;
    const gun = this.model.gun;
    const mount = this.model.doorMount;
    gun.updateWorldMatrix(true, false);
    gun.getWorldQuaternion(this.worldQuaternion);

    // Gunner's eye: back along the barrel and above the receiver, but never
    // inboard of the doorway. An eye rigidly behind the breech swings through
    // the cabin wall as soon as the gun traverses aft — the pintle sits 1.45 m
    // out and the skin is at 1.34 — and the shot becomes a photograph of the
    // inside of the fuselage. Clamping in the mount's frame keeps the barrels
    // where the player put them and keeps the eye in the door.
    this.gunRotation.set(this.pitch, this.yaw, 0);
    this.eye.set(0, 0.24, -0.66).applyEuler(this.gunRotation);
    this.eye.x = Math.min(this.eye.x, -0.15);
    mount.localToWorld(this.eye);
    camera.quaternion.copy(this.worldQuaternion);
    camera.position.copy(this.eye);

    if (this.recoil > 0.001) {
      // Kick is applied after the transform rather than baked into the traverse,
      // so the gun keeps pointing where the player put it.
      camera.rotateX(this.rng.range(-1, 1) * this.recoil * 0.012);
      camera.rotateY(this.rng.range(-1, 1) * this.recoil * 0.012);
    }
    camera.updateMatrixWorld(true);
  }

  // -------------------------------------------------------------------------
  // Flight
  // -------------------------------------------------------------------------

  private orbitPoint(angle: number, out: THREE.Vector3): THREE.Vector3 {
    return out.set(
      this.centre.x + Math.cos(angle) * CHOPPER.orbitRadius,
      this.groundY + CHOPPER.altitude,
      this.centre.z + Math.sin(angle) * CHOPPER.orbitRadius,
    );
  }

  /**
   * Position at clock `t`: a straight, descending run-in easing onto a level
   * orbit. Analytic, so the heading and the bank can both be read off a finite
   * difference of the same function rather than integrated.
   */
  private samplePath(t: number, out: THREE.Vector3): THREE.Vector3 {
    if (t >= CHOPPER.arrival) {
      const angle =
        this.entryAngle +
        (ORBIT_SIGN * (t - CHOPPER.arrival) * CHOPPER.speed) / CHOPPER.orbitRadius;
      return this.orbitPoint(angle, out);
    }
    const u = clamp(Math.max(t, 0) / CHOPPER.arrival, 0, 1);
    const eased = u * u * (3 - 2 * u);
    const inbound = CHOPPER.arrival * CHOPPER.speed * 2.4 * (1 - eased);
    this.orbitPoint(this.entryAngle, out);
    out.x += Math.cos(this.entryAngle) * inbound;
    out.z += Math.sin(this.entryAngle) * inbound;
    // Descend onto station rather than arriving at orbit height.
    out.y += (1 - eased) * 40;
    return out;
  }

  private writeAirframe(t: number, dt: number): void {
    const model = this.model;
    if (!model) return;

    this.samplePath(t, this.position);
    this.samplePath(t + 0.12, this.nextPosition);
    this.velocity.copy(this.nextPosition).sub(this.position).multiplyScalar(1 / 0.12);

    model.root.position.copy(this.position);
    model.root.lookAt(this.nextPosition);

    // Bank into the turn: a helicopter in a level circle is banked, and the amount
    // is set by the turn rate, not chosen.
    const target =
      this.phase === 'inbound'
        ? 0
        : ORBIT_SIGN *
          Math.atan((CHOPPER.speed * CHOPPER.speed) / (CHOPPER.orbitRadius * 9.81));
    this.bank = damp(this.bank, target, 2.2, Math.max(dt, 1e-4));
    model.root.rotateZ(this.bank);
    // Nose-down in the transit, level in the orbit.
    model.root.rotateX(this.phase === 'inbound' ? -0.12 : -0.03);
    model.root.updateMatrixWorld(true);

    spinRotors(model, dt, 26);
  }

  // -------------------------------------------------------------------------
  // The gun
  // -------------------------------------------------------------------------

  private takeGun(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    this.phase = 'gunner';
    this.inControl = true;
    this.takeover.begin(ctx, { hideViewmodel: true, fov: 58 });
    this.overlay.mount();
    this.overlay.setOpen(true);
    this.deps.scopeOverlay('thermal', 1);
    this.deps.announce('YOU HAVE THE GUN', 'LMB FIRE · ESC HAND BACK', 2.4);
    this.deps.play2D(SOUNDS.tabletOpen, { volume: 0.7, pitch: 0.8 });
  }

  private releaseGun(): void {
    if (!this.inControl) return;
    this.inControl = false;
    this.phase = 'egress';
    this.overlay.setOpen(false);
    this.takeover.end();
    this.deps.scopeOverlay('none', 0);
    this.deps.notify(
      'GUN HANDED BACK',
      `${this.roundsFired} ROUNDS · ${this.hits} HITS`,
      'info',
    );
  }

  private updateGun(dt: number): void {
    const model = this.model;
    if (!model) return;

    const sensitivity = this.ctx?.input.sensitivity ?? 1;
    const motion = this.takeover.consumeMotion(this.motion);
    this.yaw = clamp(
      this.yaw + motion.x * TRAVERSE_GAIN * sensitivity,
      CHOPPER.yawMin,
      CHOPPER.yawMax,
    );
    this.pitch = clamp(
      this.pitch + motion.y * TRAVERSE_GAIN * sensitivity,
      CHOPPER.pitchMin,
      CHOPPER.pitchMax,
    );
    model.gun.rotation.set(this.pitch, this.yaw, 0);
    model.gun.updateMatrixWorld(true);

    const firing = this.takeover.primaryDown && this.heat < 1;
    // The barrels come up to speed before the first round and coast down after
    // the trigger is released.
    this.spinUp = damp(this.spinUp, firing ? 1 : 0, firing ? 6 : 2.4, dt);
    this.barrelSpin += dt * this.spinUp * 46;
    model.barrels.rotation.z = this.barrelSpin % (Math.PI * 2);

    this.recoil = Math.max(0, this.recoil - dt * 6);
    this.heat = clamp(this.heat + (firing ? dt * 0.11 : -dt * 0.26), 0, 1);

    const interval = 60 / CHOPPER.rpm;
    this.fireTimer -= dt;
    if (firing && this.spinUp > 0.55) {
      // Catch up on a long frame rather than letting the rate of fire drop with
      // the frame rate, but never spend more than a frame's worth of rounds.
      let budget = Math.ceil(dt / interval) + 1;
      while (this.fireTimer <= 0 && budget-- > 0) {
        this.fireTimer += interval;
        this.fireRound(model);
      }
    } else if (this.fireTimer < 0) {
      this.fireTimer = 0;
    }

    this.overlay.frame.yaw = this.yaw;
    this.overlay.frame.pitch = this.pitch;
    this.overlay.frame.heat = this.heat;
    this.overlay.frame.firing = firing;
    this.overlay.frame.rounds = this.roundsFired;
    this.overlay.frame.hits = this.hits;
    this.overlay.frame.altitude = this.position.y - this.groundY;
    this.overlay.frame.remaining = Math.max(0, this.duration - this.clock);
    this.overlay.frame.groundRange = this.measureRange(model);
    this.overlay.render(this.ctx?.time.deltaUnscaled ?? dt);

    if (this.takeover.cancelPressed || this.takeover.secondaryPressed) {
      this.takeover.endFrame();
      this.releaseGun();
      return;
    }
    this.takeover.endFrame();
  }

  private fireRound(model: GunshipModel): void {
    const combat = this.deps.combat;
    model.muzzle.getWorldPosition(this.muzzlePosition);
    model.muzzle.getWorldDirection(this.fireDirection);
    // Cone of fire: a door gun on a pintle is not a precision instrument, and the
    // scatter is what makes the tracer stream read as a stream.
    this.fireDirection.x += this.rng.gaussian(0, CHOPPER.spread);
    this.fireDirection.y += this.rng.gaussian(0, CHOPPER.spread);
    this.fireDirection.z += this.rng.gaussian(0, CHOPPER.spread);
    this.fireDirection.normalize();

    const tracer = this.roundsFired % 3 === 0;
    const result = combat?.fireBullet({
      origin: this.muzzlePosition,
      direction: this.fireDirection,
      damage: CHOPPER.damage,
      falloffStart: CHOPPER.falloffStart,
      falloffEnd: CHOPPER.falloffEnd,
      minDamageScale: CHOPPER.minDamageScale,
      penetrationPower: CHOPPER.penetrationPower,
      attacker: this.deps.playerEntity,
      weaponId: 'chopper_minigun',
      tracer,
      tracerColor: 0xffd070,
      impulse: CHOPPER.impulse,
    });
    if (result?.target) this.hits++;

    this.roundsFired++;
    this.recoil = Math.min(1, this.recoil + 0.22);
    this.deps.fx?.muzzleFlash(this.muzzlePosition, this.fireDirection, 1.4, false, false);
    if (this.roundsFired % SOUND_EVERY === 0) {
      this.deps.play(SOUNDS.minigun, this.muzzlePosition, {
        volume: 0.85,
        pitch: 0.96 + this.rng.next() * 0.08,
        refDistance: 40,
        maxDistance: 600,
      });
    }
  }

  /** Slant range from the muzzle to whatever the gun is pointing at. */
  private measureRange(model: GunshipModel): number {
    const physics = this.deps.physics;
    model.muzzle.getWorldPosition(this.muzzlePosition);
    model.muzzle.getWorldDirection(this.fireDirection);
    if (physics?.ready) {
      const hit = physics.raycast(this.muzzlePosition, this.fireDirection, { maxDistance: 500 });
      if (hit) return hit.distance;
    }
    // No collider in the way: fall back to where the line meets the terrain plane.
    if (this.fireDirection.y >= -1e-3) return 0;
    return (this.muzzlePosition.y - this.groundY) / -this.fireDirection.y;
  }

  private finish(): void {
    if (this.inControl) this.releaseGun();
    this.overlay.setOpen(false);
    this.active = false;
    this.phase = 'idle';
    this.model?.root.removeFromParent();
    this.deps.notify('GUNSHIP OFF STATION', undefined, 'info');
  }

  abort(): void {
    if (!this.active) return;
    this.finish();
  }

  dispose(): void {
    this.abort();
    this.overlay.unmount();
    this.model?.dispose();
    this.model = null;
    this.ctx = null;
  }
}
