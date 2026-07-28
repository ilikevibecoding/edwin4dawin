/**
 * Care package.
 *
 * The delivery is solved, the landing is simulated, and the settle is real
 * physics — three different techniques for three parts of the same drop, chosen
 * because each part has a different requirement.
 *
 * The descent model is integrated once at launch to find how far downrange a
 * crate released at 78 m and 82 m/s travels before it is over the target. That
 * lead — about 70 m, nearly all of it earned in the first second of free fall
 * before the canopy strips — is where the transport's release point goes. So the
 * transport's flight path is derived from the crate's aerodynamics rather than
 * the crate being teleported under a transport that happens to be overhead.
 *
 * The fall itself replays the same model in world space at a fixed 120 Hz
 * sub-step, so the crate lands on the point that was solved for regardless of
 * frame rate, and the semi-implicit drag form stays stable under the canopy's
 * enormous drag coefficient where an explicit step would ring.
 *
 * The last 1.3 m is Rapier. The canopy is cut, the crate becomes a dynamic body
 * with the velocity it had, and it drops onto whatever is actually there —
 * rubble, a roof, a stairwell — and settles at that angle. It is the cheapest
 * possible use of the physics system and it is the one that sells the object as
 * being in the world rather than placed on it.
 */
import * as THREE from 'three';
import { clamp, Rng } from '../core/MathUtils';
import type { KillstreakId, RigidBodyHandle } from '../core/Contracts';
import type { EngineContext } from '../core/System';
import { dragScaleForTerminal } from './Ballistics';
import { spinRotors, type AircraftModel } from './models/Aircraft';
import type { CratePackModel } from './models/Ordnance';
import type { KillstreakAssets } from './Assets';
import type { KillstreakDeps } from './Deps';
import type { Acoustics } from './Acoustics';
import { CARE_PACKAGE as TUNING, ORDNANCE_DRAG, ORDNANCE_GRAVITY, SOUNDS } from './Tuning';
import { CARE_PACKAGE_TABLE } from './Definitions';

type Phase = 'idle' | 'inbound' | 'falling' | 'grounded';

/** Descent integration step. Matches the solve, so the landing point holds. */
const SUB_STEP = 1 / 120;
/** Cap on catch-up steps per frame, so a stalled tab cannot spiral. */
const MAX_SUB_STEPS = 240;
/** Engine noise emission interval for the transport. */
const GRAIN_INTERVAL = 0.42;
/** How long the transport stays on screen after the drop. */
const EGRESS_HOLD = 7;
/** Distance in front of the player the crate is put down, metres. */
const DROP_OFFSET = 16;
/** Keep the drop point this far inside the map edge. */
const EDGE_INSET = 8;
/** Green smoke, so the marker reads as friendly at range. */
const SMOKE_COLOR = 0x74ff9c;

const CRATE_DRAG = dragScaleForTerminal(TUNING.crateSpeed);
const CANOPY_DRAG = dragScaleForTerminal(TUNING.descentRate);

export interface CarePackageContents {
  id: KillstreakId | 'ammo';
  label: string;
}

export class CarePackage {
  active = false;
  /** Set by the owning system: awards the rolled contents. */
  onGrant: ((id: KillstreakId | 'ammo') => void) | null = null;

  private ctx: EngineContext | null = null;
  private readonly rng = new Rng(0x51f3ac9);

  private transport: AircraftModel | null = null;
  private pack: CratePackModel | null = null;
  private body: RigidBodyHandle | null = null;
  private trail = -1;

  private phase: Phase = 'idle';
  private clock = 0;
  private fallClock = 0;
  private residual = 0;
  private grainTimer = 0;
  private smokeTimer = 0;
  private hold = 0;
  private groundLife = 0;
  private lead = 0;
  private fallDuration = 0;
  private groundY = 0;
  private transportGone = false;
  private markerLabel = '';

  private readonly target = new THREE.Vector3();
  private readonly release = new THREE.Vector3();
  private readonly direction = new THREE.Vector3();
  private readonly right = new THREE.Vector3();
  private readonly position = new THREE.Vector3();
  private readonly velocity = new THREE.Vector3();
  private readonly cratePosition = new THREE.Vector3();
  private readonly scratch = new THREE.Vector3();
  private readonly scratchB = new THREE.Vector3();
  private readonly solvePos = new THREE.Vector3();
  private readonly solveVel = new THREE.Vector3();
  private readonly tumbleAxis = new THREE.Vector3(0.3, 0.2, 1).normalize();
  private readonly statePayload = { position: new THREE.Vector3(), state: 'inbound' as string };

  constructor(
    private readonly deps: KillstreakDeps,
    private readonly assets: KillstreakAssets,
    private readonly acoustics: Acoustics,
  ) {}

  init(ctx: EngineContext): void {
    this.ctx = ctx;
  }

  get diagnostics(): {
    phase: Phase;
    clock: number;
    lead: number;
    fallDuration: number;
    onGround: boolean;
  } {
    return {
      phase: this.phase,
      clock: this.clock,
      lead: this.lead,
      fallDuration: this.fallDuration,
      onGround: this.phase === 'grounded',
    };
  }

  // -------------------------------------------------------------------------
  // Launch
  // -------------------------------------------------------------------------

  /** Drops a package. Without a target the crate goes in front of the player. */
  launch(target?: THREE.Vector3): void {
    const scene = this.deps.scene;
    if (!scene || this.active) return;

    this.active = true;
    this.phase = 'inbound';
    this.clock = 0;
    this.fallClock = 0;
    this.residual = 0;
    this.grainTimer = 0;
    this.smokeTimer = 0;
    this.hold = 0;
    this.groundLife = 0;
    this.transportGone = false;
    this.markerLabel = '';

    this.chooseTarget(target);
    this.solveDescent();

    // The run-in comes over the player's shoulder, so the transport crosses the
    // top of the frame on its way to a release point behind them and the crate
    // falls into view rather than appearing already below the canopy.
    this.release
      .copy(this.target)
      .addScaledVector(this.direction, -this.lead)
      .setY(this.groundY + TUNING.altitude);

    this.transport ??= this.assets.createTransport();
    this.transport.root.visible = true;
    scene.add(this.transport.root);
    this.writeTransport(0);

    const eta = Math.round(TUNING.approachLead + this.fallDuration);
    this.deps.announce('CARE PACKAGE INBOUND', `TOUCHDOWN IN ${eta}S`, 3);
    this.deps.play2D(SOUNDS.streakReady, { volume: 0.75, pitch: 0.92 });
    this.publish('inbound', this.target);
  }

  private chooseTarget(target?: THREE.Vector3): void {
    const yaw = this.deps.player?.yaw ?? 0;
    // Player yaw is measured about +Y from -Z, which is the direction the camera
    // looks; the transport flies that way so the drop lands ahead of the player.
    this.direction.set(-Math.sin(yaw), 0, -Math.cos(yaw));
    if (this.direction.lengthSq() < 1e-6) this.direction.set(0, 0, -1);
    this.direction.normalize();
    this.right.set(-this.direction.z, 0, this.direction.x);

    if (target) {
      this.target.copy(target);
    } else {
      this.deps.playerPosition(this.target);
      this.target.addScaledVector(this.direction, DROP_OFFSET);
    }

    const bounds = this.deps.world?.bounds;
    if (bounds) {
      this.target.x = clamp(this.target.x, bounds.min.x + EDGE_INSET, bounds.max.x - EDGE_INSET);
      this.target.z = clamp(this.target.z, bounds.min.z + EDGE_INSET, bounds.max.z - EDGE_INSET);
    }
    this.groundY = this.deps.groundAt(this.target.x, this.target.z, this.target.y);
    this.target.y = this.groundY;
  }

  /**
   * Integrates the descent once in a local frame to find the downrange lead and
   * the time of flight. Same stepper as the live fall, so the two agree.
   */
  private solveDescent(): void {
    const p = this.solvePos.set(0, TUNING.altitude, 0);
    const v = this.solveVel.set(0, 0, TUNING.speed);
    let t = 0;
    while (p.y > TUNING.handoffAltitude && t < 30) {
      this.stepFall(p, v, SUB_STEP, t);
      t += SUB_STEP;
    }
    this.lead = p.z;
    this.fallDuration = t;
  }

  /**
   * One descent sub-step. Drag is applied in the semi-implicit form
   * `v /= 1 + k|v|h`, which is exact for the decay of a quadratic drag law over
   * the step and, unlike an explicit step, cannot overshoot through zero — which
   * matters here because the inflated canopy's coefficient is three orders of
   * magnitude above a bomb's.
   */
  private stepFall(p: THREE.Vector3, v: THREE.Vector3, h: number, t: number): void {
    const scale = this.dragScaleAt(t);
    const speed = v.length();
    if (speed > 1e-5) v.multiplyScalar(1 / (1 + ORDNANCE_DRAG * scale * speed * h));
    v.y -= ORDNANCE_GRAVITY * h;
    p.addScaledVector(v, h);
  }

  /** Bare crate until the static line strips the pack, then the canopy inflates. */
  private dragScaleAt(t: number): number {
    const since = t - TUNING.deployDelay;
    if (since <= 0) return CRATE_DRAG;
    // Inflation squared: a canopy fills from the skirt up, so its drag comes on
    // gently and then all at once, which is what makes the snatch read.
    const inflation = Math.min(1, since / TUNING.inflateTime);
    return CRATE_DRAG + (CANOPY_DRAG - CRATE_DRAG) * inflation * inflation;
  }

  // -------------------------------------------------------------------------
  // Frame
  // -------------------------------------------------------------------------

  update(dt: number): void {
    if (!this.active) return;
    this.clock += dt;

    if (!this.transportGone) {
      this.writeTransport(dt);
      if (this.clock > TUNING.approachLead + EGRESS_HOLD) this.retireTransport();
    }

    switch (this.phase) {
      case 'inbound':
        if (this.clock >= TUNING.approachLead) this.releaseCrate();
        break;
      case 'falling':
        this.updateFall(dt);
        break;
      case 'grounded':
        this.updateGround(dt);
        break;
      default:
        break;
    }
  }

  private writeTransport(dt: number): void {
    const model = this.transport;
    if (!model) return;
    const along = TUNING.speed * (this.clock - TUNING.approachLead);
    this.scratch.copy(this.release).addScaledVector(this.direction, along);
    model.root.position.copy(this.scratch);
    this.scratchB.copy(this.scratch).addScaledVector(this.direction, 10);
    model.root.lookAt(this.scratchB);
    // A loaded transport on a drop run holds wings level and rides a little
    // nose-high; the wallow is the airframe, not the pilot.
    model.root.rotateZ(Math.sin(this.clock * 0.9) * 0.02);
    model.root.rotateX(-0.02);
    model.root.updateMatrixWorld(true);
    spinRotors(model, dt, 46);
    if (model.strobe) model.strobe.visible = (this.clock * 1.2) % 1 < 0.12;

    this.grainTimer -= dt;
    if (this.grainTimer <= 0) {
      this.grainTimer = GRAIN_INTERVAL;
      this.scratchB.copy(this.direction).multiplyScalar(TUNING.speed);
      this.acoustics.emit(
        SOUNDS.jetDistant,
        this.scratch,
        this.scratchB,
        this.deps.now,
        0.5,
        130,
        900,
      );
    }
  }

  private retireTransport(): void {
    this.transportGone = true;
    if (this.trail >= 0) {
      this.assets.trails.release(this.trail);
      this.trail = -1;
    }
    this.transport?.root.removeFromParent();
  }

  private releaseCrate(): void {
    const scene = this.deps.scene;
    if (!scene) return;
    this.phase = 'falling';
    this.fallClock = 0;
    this.residual = 0;

    this.pack ??= this.assets.createCratePack();
    const pack = this.pack;
    // Restore the rig if a previous package left the crate parented to the scene.
    if (pack.crate.parent !== pack.root) {
      pack.root.add(pack.crate);
      pack.crate.position.set(0, 0, 0);
      pack.crate.quaternion.identity();
    }
    pack.chute.visible = false;
    pack.chute.scale.set(0.12, 0.12, 0.12);
    pack.root.rotation.set(0, 0, 0);

    // Out of the cargo door rather than out of the centre of the fuselage.
    const door = this.transport?.hardpoints[0];
    if (door) door.getWorldPosition(this.position);
    else this.position.copy(this.release);
    this.velocity.copy(this.direction).multiplyScalar(TUNING.speed);

    pack.root.position.copy(this.position);
    scene.add(pack.root);
    pack.root.updateMatrixWorld(true);

    this.cratePosition.copy(this.position);
    this.trail = this.assets.trails.attach(pack.crate, {
      width: 0.35,
      growth: 1.4,
      maxAge: 2.4,
      spacing: 2.5,
    });

    this.deps.notify('PACKAGE AWAY', 'CHUTE DEPLOYING', 'info');
  }

  private updateFall(dt: number): void {
    const pack = this.pack;
    if (!pack) return;

    // Fixed-step catch-up: the landing point is a solved quantity and must not
    // depend on how long the last frame took.
    this.residual += dt;
    let steps = 0;
    while (this.residual >= SUB_STEP && steps < MAX_SUB_STEPS) {
      this.stepFall(this.position, this.velocity, SUB_STEP, this.fallClock);
      this.fallClock += SUB_STEP;
      this.residual -= SUB_STEP;
      steps++;
      if (this.position.y <= this.groundY + TUNING.handoffAltitude) break;
    }
    if (steps >= MAX_SUB_STEPS) this.residual = 0;

    const since = this.fallClock - TUNING.deployDelay;
    if (since >= 0 && !pack.chute.visible) this.deployChute();

    pack.root.position.copy(this.position);
    if (since < 0) {
      // Free fall: the crate tumbles off the ramp.
      pack.crate.rotateOnAxis(this.tumbleAxis, dt * 2.6);
      this.cratePosition.copy(this.position);
    } else {
      const inflation = Math.min(1, since / TUNING.inflateTime);
      const eased = inflation * inflation * (3 - 2 * inflation);
      pack.chute.scale.setScalar(0.12 + 0.88 * eased);

      // Pendulum under the canopy, damped out as the ground comes up so the
      // crate arrives on the point that was solved for.
      const altitude = this.position.y - this.groundY;
      const decay = clamp(altitude / 26, 0, 1);
      const swing = Math.sin(since * 1.9) * 0.9 * decay;
      const swingB = Math.cos(since * 1.35) * 0.5 * decay;
      this.scratch
        .copy(this.right)
        .multiplyScalar(swing)
        .addScaledVector(this.direction, swingB);
      pack.crate.position.copy(this.scratch);
      // Keep the rigging straight: the crate hangs along the line to the canopy.
      pack.crate.rotation.set(
        Math.atan2(swingB, 3.2),
        0,
        -Math.atan2(swing, 3.2),
      );
      this.cratePosition.copy(this.position).add(this.scratch);
    }
    pack.root.updateMatrixWorld(true);

    if (this.position.y <= this.groundY + TUNING.handoffAltitude) this.touchdown();
  }

  private deployChute(): void {
    const pack = this.pack;
    if (!pack) return;
    pack.chute.visible = true;
    pack.crate.rotation.set(0, 0, 0);
    this.deps.play(SOUNDS.chuteDeploy, this.position, { volume: 0.85, refDistance: 24 });
    if (this.trail >= 0) {
      this.assets.trails.release(this.trail);
      this.trail = -1;
    }
  }

  /**
   * Cuts the canopy and hands the crate to the physics system. The crate keeps
   * its velocity, so it drops the last metre onto whatever is under it — which
   * may be a roof, and that is a feature.
   */
  private touchdown(): void {
    const scene = this.deps.scene;
    const pack = this.pack;
    if (!scene || !pack) return;
    this.phase = 'grounded';
    this.groundLife = 0;
    this.hold = 0;
    this.smokeTimer = 0;

    pack.chute.visible = false;
    // Reparent to the scene so the body writes a world transform into an object
    // whose parent is the identity, and so the rig can be reset for the next drop.
    scene.attach(pack.crate);
    pack.crate.getWorldPosition(this.cratePosition);
    pack.root.removeFromParent();

    const physics = this.deps.physics;
    if (physics?.ready) {
      try {
        this.body = physics.createRigidBody(
          pack.crate,
          { kind: 'box', halfExtents: pack.halfExtents },
          {
            mass: 140,
            restitution: 0.04,
            friction: 0.92,
            ccd: true,
            userData: { kind: 'dynamic', surface: 'metal', object3D: pack.crate },
          },
        );
        this.body.setVelocity(this.velocity);
      } catch (err) {
        console.warn('[killstreaks] care package body failed; settling kinematically', err);
        this.body = null;
      }
    }
    if (!this.body) {
      // No physics: sit it on the terrain and level it.
      this.cratePosition.y = this.deps.groundAt(
        this.cratePosition.x,
        this.cratePosition.z,
        this.groundY,
      ) + pack.halfExtents.y;
      pack.crate.position.copy(this.cratePosition);
      pack.crate.rotation.set(0, 0, 0);
      pack.crate.updateMatrixWorld(true);
    }

    this.deps.play(SOUNDS.crateLand, this.cratePosition, { volume: 1, refDistance: 20 });
    this.deps.fx?.dust(this.cratePosition, 3.2, 0.7);
    this.deps.notify('PACKAGE DOWN', 'HOLD F TO OPEN', 'reward');
    this.publish('landed', this.cratePosition);
  }

  private updateGround(dt: number): void {
    const pack = this.pack;
    if (!pack) return;
    this.groundLife += dt;
    pack.crate.getWorldPosition(this.cratePosition);

    this.smokeTimer -= dt;
    if (this.smokeTimer <= 0) {
      this.smokeTimer = TUNING.smokeInterval;
      this.scratch.copy(this.cratePosition).setY(this.cratePosition.y + 0.5);
      this.deps.fx?.smoke(this.scratch, 1.5, TUNING.smokeInterval + 2.4, SMOKE_COLOR);
    }

    this.updatePrompt(dt);
    if (this.groundLife >= TUNING.lifetime) this.expire();
  }

  private updatePrompt(dt: number): void {
    const ctx = this.ctx;
    this.deps.playerPosition(this.scratch);
    const range = this.scratch.distanceTo(this.cratePosition);
    const inRange = range <= TUNING.useRange;

    if (inRange && ctx?.input.isDown('use')) {
      this.hold += dt;
      if (this.hold >= TUNING.useTime) {
        this.collect();
        return;
      }
    } else {
      this.hold = Math.max(0, this.hold - dt * 2.5);
    }

    const label = inRange
      ? this.hold > 0
        ? `OPENING ${Math.round((this.hold / TUNING.useTime) * 100)}%`
        : 'HOLD F TO OPEN'
      : `CARE PACKAGE ${Math.round(range)}M`;
    if (label !== this.markerLabel) {
      this.markerLabel = label;
      this.deps.marker('killstreak:package', this.cratePosition, label);
    }
    const remaining = TUNING.lifetime - this.groundLife;
    if (remaining < 10 && remaining + dt >= 10) {
      this.deps.notify('PACKAGE EXPIRING', '10 SECONDS', 'warn');
    }
  }

  private collect(): void {
    const roll = this.roll();
    this.deps.play(SOUNDS.crateOpen, this.cratePosition, { volume: 1, refDistance: 18 });
    this.deps.fx?.smoke(this.cratePosition, 2.2, 3.5, SMOKE_COLOR);
    this.publish('collected', this.cratePosition);
    this.deps.announce('PACKAGE SECURED', roll.label, 2.6);
    this.onGrant?.(roll.id);
    this.finish();
  }

  /** Weighted draw from the loot table. */
  private roll(): CarePackageContents {
    let total = 0;
    for (const entry of CARE_PACKAGE_TABLE) total += entry.weight;
    let pick = this.rng.next() * total;
    for (const entry of CARE_PACKAGE_TABLE) {
      pick -= entry.weight;
      if (pick > 0) continue;
      if (entry.id === 'ammo') {
        this.deps.weapons?.giveAmmo(120);
        return { id: 'ammo', label: 'AMMUNITION RESUPPLY' };
      }
      return { id: entry.id, label: entry.id.replace('_', ' ').toUpperCase() };
    }
    this.deps.weapons?.giveAmmo(120);
    return { id: 'ammo', label: 'AMMUNITION RESUPPLY' };
  }

  private expire(): void {
    this.deps.notify('PACKAGE LOST', undefined, 'warn');
    this.publish('lost', this.cratePosition);
    this.finish();
  }

  private publish(state: string, position: THREE.Vector3): void {
    this.statePayload.state = state;
    this.statePayload.position.copy(position);
    this.deps.emit('killstreak:carePackage', this.statePayload);
  }

  private finish(): void {
    this.active = false;
    this.phase = 'idle';
    this.markerLabel = '';
    this.deps.marker('killstreak:package', null);
    this.retireTransport();
    this.transportGone = false;

    this.body?.destroy();
    this.body = null;
    const pack = this.pack;
    if (pack) {
      pack.crate.removeFromParent();
      pack.root.add(pack.crate);
      pack.crate.position.set(0, 0, 0);
      pack.crate.quaternion.identity();
      pack.crate.scale.set(1, 1, 1);
      pack.chute.visible = true;
      pack.chute.scale.set(1, 1, 1);
      pack.root.removeFromParent();
    }
  }

  abort(): void {
    if (!this.active) return;
    this.finish();
  }

  dispose(): void {
    this.abort();
    this.transport?.dispose();
    this.pack?.dispose();
    this.transport = null;
    this.pack = null;
    this.ctx = null;
  }
}
