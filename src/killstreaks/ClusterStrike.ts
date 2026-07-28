/**
 * The cluster strike.
 *
 * Structurally the opposite of the carpet. The carpet is a fire-control problem
 * solved backwards — nine bombs are told where to land and when, and the release
 * schedule is derived from that. The cluster is a forward problem: one store is
 * dropped, its fuze fires at a barometric height, and whatever it happens to be
 * doing at that instant is what the twenty-four bomblets inherit. So the burst
 * point is *found* by integrating the dispenser down to 105 m rather than chosen,
 * and the pattern is laid around wherever that turns out to be.
 *
 * Only the last leg is solved. Each bomblet is given a point on the pattern and a
 * descent time, and its dispense velocity is solved from those — which is the
 * right way round, because a burster charge genuinely does throw each submunition
 * at its own velocity. The worst delta from the dispenser's own velocity is
 * reported in `diagnostics`, and if it ever climbed past about 40 m/s the claim
 * that this is a burster rather than a fudge would stop being true.
 *
 * Timeline from confirm, as it comes out:
 *
 *   0.00  callout, marker, `killstreak:airstrikeCalled`.
 *   0.00  the delivery aircraft appears 528 m out at 205 m, running in at 168 m/s.
 *   1.90  canister off the centreline station.
 *   4.02  fuze fires at 105 m, 153 m short of the pattern centre and 38 m/s.
 *         Casing splits, burster throws twenty-four bomblets, drogues stream.
 *   7.02  first detonation.
 *   9.42  last detonation. Twenty-four blasts in 2.4 s over a 35 m radius.
 *   9.77  dust and smoke over the pattern, survivors alerted.
 *  11.62  recycled.
 */
import * as THREE from 'three';
import { Rng } from '../core/MathUtils';
import type { AircraftModel } from './models/Aircraft';
import type { BombletModel, OrdnanceModel } from './models/Ordnance';
import {
  BakedArc,
  bakeArc,
  dragForFallTime,
  simulateFor,
  simulateToAltitude,
  solveRelease,
} from './Ballistics';
import type { KillstreakAssets } from './Assets';
import type { KillstreakDeps } from './Deps';
import type { Acoustics } from './Acoustics';
import type { Radio } from './Radio';
import { CLUSTER, ORDNANCE_DRAG, ORDNANCE_GRAVITY, SOUNDS } from './Tuning';
import { bearingLabel, bearingToDirection, gridReference } from './MapMath';

interface BombletSlot {
  model: BombletModel | null;
  arc: BakedArc;
  active: boolean;
  detonated: boolean;
  impactTime: number;
  trail: number;
  spin: number;
  spinRate: number;
  drogueDelay: number;
  leavesFire: boolean;
  readonly target: THREE.Vector3;
}

/** Golden angle: an even, non-repeating spiral with no visible rings. */
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
/** Emission interval for the delayed jet roar. */
const GRAIN_INTERVAL = 0.28;
/** Bomblets that get a visible drogue ribbon; the rest are too small to matter. */
const TRAILED_BOMBLETS = 12;

const canisterDragScale = ORDNANCE_GRAVITY / (CLUSTER.canisterSpeed * CLUSTER.canisterSpeed) / ORDNANCE_DRAG;
const drogueDragScale = ORDNANCE_GRAVITY / (CLUSTER.drogueSpeed * CLUSTER.drogueSpeed) / ORDNANCE_DRAG;

export class ClusterStrike {
  active = false;
  clock = 0;

  private readonly bomblets: BombletSlot[] = [];
  private readonly rng = new Rng(0x51c7e2);

  private jet: AircraftModel | null = null;
  private jetActive = false;
  private jetTrail = -1;
  private grainTimer = 0;

  private canister: OrdnanceModel | null = null;
  private canisterState: 'idle' | 'carried' | 'falling' = 'idle';
  private canisterTrail = -1;
  private readonly canisterArc = new BakedArc();
  private canisterSpin = 0;

  private readonly centre = new THREE.Vector3();
  private readonly direction = new THREE.Vector3();
  private readonly right = new THREE.Vector3();
  private readonly burstPoint = new THREE.Vector3();
  private readonly burstVelocity = new THREE.Vector3();
  private readonly releasePoint = new THREE.Vector3();
  private heading = 0;
  private groundY = 0;
  private originAlong = 0;

  private releaseTime = 0;
  private burstTime = 0;
  /** Local-frame descent solution: fall time, along-track carry, state at burst. */
  private canisterFall = 0;
  private canisterCarry = 0;
  private burstRun = 0;
  private burstSink = 0;
  private lastImpact = 0;
  private despawnTime = 0;
  private burstDone = false;
  private aftermathDone = false;
  private worstDelta = 0;
  private worstResidual = 0;
  private bombletLead = 0;

  private readonly scratchPos = new THREE.Vector3();
  private readonly scratchVel = new THREE.Vector3();
  private readonly scratchLook = new THREE.Vector3();
  private readonly scratchA = new THREE.Vector3();
  private readonly impactPayload = { position: new THREE.Vector3() };
  private readonly calledPayload = { origin: new THREE.Vector3(), heading: 0 };

  constructor(
    private readonly deps: KillstreakDeps,
    private readonly assets: KillstreakAssets,
    private readonly acoustics: Acoustics,
    private readonly radio: Radio,
  ) {
    for (let i = 0; i < CLUSTER.bomblets; i++) {
      this.bomblets.push({
        model: null,
        arc: new BakedArc(),
        active: false,
        detonated: false,
        impactTime: 0,
        trail: -1,
        spin: 0,
        spinRate: 0,
        drogueDelay: 0,
        leavesFire: false,
        target: new THREE.Vector3(),
      });
    }
  }

  get diagnostics(): {
    clock: number;
    burstTime: number;
    burstAltitude: number;
    burstSpeed: number;
    lead: number;
    firstImpact: number;
    lastImpact: number;
    dispenseDelta: number;
    residual: number;
  } {
    return {
      clock: this.clock,
      burstTime: this.burstTime,
      burstAltitude: this.burstPoint.y - this.groundY,
      burstSpeed: Math.hypot(this.burstVelocity.x, this.burstVelocity.z),
      lead: this.bombletLead,
      firstImpact: this.burstTime + CLUSTER.descentMin,
      lastImpact: this.lastImpact,
      dispenseDelta: this.worstDelta,
      residual: this.worstResidual,
    };
  }

  // -------------------------------------------------------------------------
  // Launch
  // -------------------------------------------------------------------------

  call(target: THREE.Vector3, heading: number): void {
    if (this.active) this.abort();

    this.active = true;
    this.clock = 0;
    this.burstDone = false;
    this.aftermathDone = false;
    this.heading = heading;
    this.centre.copy(target);
    this.groundY = this.deps.groundAt(target.x, target.z, target.y);
    this.centre.y = this.groundY;

    bearingToDirection(heading, this.direction).multiplyScalar(-1);
    this.right.set(-this.direction.z, 0, this.direction.x);

    this.releaseTime = CLUSTER.firstRelease;
    this.schedule();

    this.lastImpact = this.burstTime + CLUSTER.descentMax;
    this.despawnTime = this.lastImpact + CLUSTER.egressHold;
    this.announceLaunch();
  }

  /**
   * Works the geometry backwards from the pattern centre through two forward
   * integrations: how far the dispenser travels from release to burst, and how far
   * a nominal bomblet is then carried from the burst. Both are pure functions of
   * the drag model, so the aircraft's release point falls out exactly.
   *
   * Both integrations run in a flat local frame — +Z along the run-in axis, origin
   * on the pattern centre — because drag and gravity depend only on velocity and
   * on which way is down. Only the endpoints are lifted into world space.
   */
  private schedule(): void {
    this.canisterDescent();

    // Nominal bomblet: mid-drag, mid-descent, launched with whatever the canister
    // is doing at the burst. Its carry distance is the lead the burst needs.
    const nominalDescent = (CLUSTER.descentMin + CLUSTER.descentMax) * 0.5;
    this.scratchPos.set(0, CLUSTER.burstAltitude, 0);
    this.scratchVel.set(0, this.burstSink, this.burstRun);
    simulateFor(
      this.scratchPos,
      this.scratchVel,
      nominalDescent,
      drogueDragScale,
      this.scratchLook,
      this.scratchA,
    );
    this.bombletLead = this.scratchLook.z;
    this.placeGeometry();

    const golden = GOLDEN_ANGLE;
    const times: number[] = [];
    for (let i = 0; i < CLUSTER.bomblets; i++) {
      times.push(
        CLUSTER.descentMin +
          ((CLUSTER.descentMax - CLUSTER.descentMin) * i) / (CLUSTER.bomblets - 1),
      );
    }
    // Shuffle so the pattern pops at random across the whole area rather than
    // sweeping predictably from one edge to the other.
    for (let i = times.length - 1; i > 0; i--) {
      const j = this.rng.int(0, i);
      const t = times[i];
      times[i] = times[j];
      times[j] = t;
    }

    this.worstDelta = 0;
    this.worstResidual = 0;
    const fireEvery = Math.max(1, Math.round(CLUSTER.bomblets / CLUSTER.fireCount));

    for (let i = 0; i < CLUSTER.bomblets; i++) {
      const slot = this.bomblets[i];
      // Sunflower placement: sqrt radius spreads by area, so the middle of the
      // pattern is not denser than the edge.
      const radius = CLUSTER.patternRadius * Math.sqrt((i + 0.5) / CLUSTER.bomblets);
      const angle = i * golden;
      slot.target
        .copy(this.centre)
        .addScaledVector(this.direction, Math.cos(angle) * radius)
        .addScaledVector(this.right, Math.sin(angle) * radius);
      slot.target.y = this.deps.groundAt(slot.target.x, slot.target.z, this.groundY);

      const descent = times[i];
      slot.impactTime = this.burstTime + descent;
      slot.active = false;
      slot.detonated = false;
      slot.trail = -1;
      slot.spin = this.rng.range(0, Math.PI * 2);
      slot.spinRate = this.rng.range(1.4, 3.6);
      // A drogue that streams late is why this bomblet falls fast; make the model
      // agree with the number the solver was handed.
      slot.drogueDelay = this.rng.range(0.05, 0.3) * (descent < nominalDescent ? 2.4 : 1);
      slot.leavesFire = i % fireEvery === 0;

      const dragScale = dragForFallTime(this.burstPoint.y - slot.target.y, descent);
      const solution = solveRelease(
        this.burstPoint,
        slot.target,
        descent,
        dragScale,
        this.burstVelocity,
        10,
      );
      bakeArc(this.burstPoint, solution.velocity, descent, dragScale, slot.arc);
      this.worstDelta = Math.max(this.worstDelta, solution.delta);
      this.worstResidual = Math.max(this.worstResidual, solution.residual);
    }
  }

  /** Integrates the dispenser from release down through its barometric fuze height. */
  private canisterDescent(): void {
    this.scratchPos.set(0, CLUSTER.releaseAltitude, 0);
    this.scratchVel.set(0, 0, CLUSTER.speed);
    this.canisterFall = simulateToAltitude(
      this.scratchPos,
      this.scratchVel,
      CLUSTER.burstAltitude,
      canisterDragScale,
      this.scratchLook,
      this.scratchA,
    );
    this.canisterCarry = this.scratchLook.z;
    this.burstRun = this.scratchA.z;
    this.burstSink = this.scratchA.y;
    this.burstTime = this.releaseTime + this.canisterFall;
  }

  /** Lifts the solved local geometry into world space and bakes the canister arc. */
  private placeGeometry(): void {
    const burstAlong = -this.bombletLead;
    const releaseAlong = burstAlong - this.canisterCarry;
    this.originAlong = releaseAlong - CLUSTER.speed * this.releaseTime;

    this.burstPoint.copy(this.centre).addScaledVector(this.direction, burstAlong);
    this.burstPoint.y = this.groundY + CLUSTER.burstAltitude;
    this.releasePoint.copy(this.centre).addScaledVector(this.direction, releaseAlong);
    this.releasePoint.y = this.groundY + CLUSTER.releaseAltitude;
    this.burstVelocity.copy(this.direction).multiplyScalar(this.burstRun);
    this.burstVelocity.y = this.burstSink;

    this.scratchVel.copy(this.direction).multiplyScalar(CLUSTER.speed);
    bakeArc(
      this.releasePoint,
      this.scratchVel,
      this.canisterFall,
      canisterDragScale,
      this.canisterArc,
    );
  }

  private jetPosition(t: number, out: THREE.Vector3): THREE.Vector3 {
    const along = this.originAlong + CLUSTER.speed * t;
    out.copy(this.centre).addScaledVector(this.direction, along);
    out.y = this.groundY + CLUSTER.releaseAltitude + this.climb(t);
    return out;
  }

  /** Pull-off after the store is gone, as with the carpet. */
  private climb(t: number): number {
    const since = t - this.releaseTime;
    if (since <= 0) return 0;
    const ramp = Math.min(since, 1.4);
    return 0.5 * 15 * ramp * (ramp / 1.4) + Math.max(0, since - 1.4) * 15;
  }

  private announceLaunch(): void {
    const label = bearingLabel(this.heading);
    const grid = gridReference(this.centre, this.deps.world?.bounds ?? null);
    this.deps.marker('killstreak:cluster', this.centre, `CLUSTER ${grid}`);

    this.calledPayload.origin.copy(this.centre);
    this.calledPayload.heading = this.heading;
    this.deps.emit('killstreak:airstrikeCalled', this.calledPayload);

    this.deps.announce('CLUSTER STRIKE INBOUND', `BEARING ${label} · GRID ${grid}`, 3.2);
    this.radio.play([
      {
        at: 0,
        // The audio module plays the voice off `killstreak:airstrikeCalled`.
        sound: SOUNDS.radioSquelch,
        text: 'ARCLIGHT 2-1: CLUSTER INBOUND',
        sub: `BEARING ${label} · GRID ${grid}`,
      },
      {
        at: this.releaseTime + 0.1,
        sound: 'radio_strike_away',
        text: 'ARCLIGHT 2-1: STORE AWAY',
        sub: `AIRBURST ${CLUSTER.burstAltitude} M`,
        kind: 'warn',
      },
      {
        at: this.burstTime + 0.2,
        sound: 'radio_strike_ten_seconds',
        text: 'ARCLIGHT 2-1: CANISTER OPEN',
        sub: `${CLUSTER.bomblets} SUBMUNITIONS`,
        kind: 'warn',
      },
      {
        at: this.lastImpact + 0.8,
        sound: 'radio_strike_effect',
        text: 'ARCLIGHT 2-1: TARGET SATURATED',
        kind: 'reward',
      },
    ]);
  }

  // -------------------------------------------------------------------------
  // Frame
  // -------------------------------------------------------------------------

  update(dt: number): void {
    if (!this.active) return;
    this.clock += dt;
    this.radio.update(dt);

    this.updateJet(dt);
    this.updateCanister(dt);
    this.updateBomblets(dt);
    this.updateAftermath();

    if (this.clock >= this.despawnTime) this.finish();
  }

  private updateJet(dt: number): void {
    const scene = this.deps.scene;
    if (!scene) return;
    const visible = this.clock < this.burstTime + 1.6;

    if (!visible) {
      if (this.jetActive) this.retireJet();
      return;
    }
    if (!this.jetActive) {
      this.jet ??= this.assets.createJet();
      this.jetActive = true;
      this.grainTimer = 0;
      scene.add(this.jet.root);
      const tips = this.jet.wingtips;
      if (tips[0]) this.deps.fx?.contrail(tips[0], this.burstTime + 2.6 - this.clock);
      if (tips[1]) {
        this.jetTrail = this.assets.trails.attach(tips[1], {
          width: 0.9,
          growth: 1.2,
          maxAge: 9,
          spacing: 6,
        });
      }
      // The canister hangs on the centreline station until it is released.
      const station = this.jet.hardpoints[this.jet.hardpoints.length - 1];
      if (station && this.canisterState === 'idle') {
        this.canister ??= this.assets.createCanister();
        this.canister.root.position.set(0, -0.34, 0);
        this.canister.root.rotation.set(0, 0, 0);
        this.canister.root.visible = true;
        station.add(this.canister.root);
        this.canisterState = 'carried';
      }
    }

    const jet = this.jet;
    if (!jet) return;
    this.jetPosition(this.clock, this.scratchPos);
    this.jetPosition(this.clock + 0.1, this.scratchLook);
    jet.root.position.copy(this.scratchPos);
    jet.root.lookAt(this.scratchLook);
    jet.root.rotateZ(Math.sin(this.clock * 1.3) * 0.03);
    jet.root.updateMatrixWorld(true);

    const throttle = this.clock > this.releaseTime ? 1.3 : 0.85;
    for (const burner of jet.burners) {
      burner.scale.set(0.85 + throttle * 0.2, 0.85 + throttle * 0.2, throttle);
      burner.visible = true;
    }
    if (jet.strobe) jet.strobe.visible = (this.clock * 1.3) % 1 < 0.13;

    this.grainTimer -= dt;
    if (this.grainTimer <= 0) {
      this.grainTimer = GRAIN_INTERVAL;
      this.scratchVel.copy(this.direction).multiplyScalar(CLUSTER.speed);
      this.deps.playerEye(this.scratchA);
      const distance = this.scratchA.distanceTo(this.scratchPos);
      this.acoustics.emit(
        distance > 420 ? SOUNDS.jetDistant : SOUNDS.jetPass,
        this.scratchPos,
        this.scratchVel,
        this.deps.now,
        0.85,
        180,
        1600,
      );
    }
  }

  private retireJet(): void {
    if (this.jetTrail >= 0) this.assets.trails.release(this.jetTrail);
    this.jetTrail = -1;
    this.jetActive = false;
    this.jet?.root.removeFromParent();
  }

  private updateCanister(dt: number): void {
    const scene = this.deps.scene;
    const canister = this.canister;
    if (!scene || !canister || this.canisterState === 'idle') return;

    if (this.canisterState === 'carried') {
      if (this.clock < this.releaseTime) return;
      scene.add(canister.root);
      canister.root.position.copy(this.releasePoint);
      this.canisterState = 'falling';
      this.canisterTrail = this.assets.trails.attach(canister.root, {
        width: 0.3,
        growth: 0.6,
        maxAge: 5,
        spacing: 5,
      });
      return;
    }

    const t = this.clock - this.releaseTime;
    if (t >= this.canisterArc.duration) {
      this.burst();
      return;
    }
    this.canisterArc.sample(t, this.scratchPos);
    this.canisterArc.velocity(t, this.scratchVel);
    canister.root.position.copy(this.scratchPos);
    this.scratchLook.copy(this.scratchPos).add(this.scratchVel);
    canister.root.lookAt(this.scratchLook);
    // A retarded dispenser spins up on its fins as it slows, which is both true
    // and the tell that this store is not a plain bomb.
    this.canisterSpin += dt * (3 + 14 * (1 - Math.min(1, this.scratchVel.length() / CLUSTER.speed)));
    canister.root.rotateZ(this.canisterSpin);
  }

  /** The fuze fires: casing gone, bomblets out, drogues streaming. */
  private burst(): void {
    if (this.burstDone) return;
    this.burstDone = true;
    const scene = this.deps.scene;

    if (this.canisterTrail >= 0) this.assets.trails.release(this.canisterTrail);
    this.canisterTrail = -1;
    this.canister?.root.removeFromParent();
    this.canisterState = 'idle';

    // Not `explode`: an airburst dispenser charge is a crack and a grey puff, and
    // it does no damage. Wiring it through the blast path would put a fireball and
    // a shockwave 105 m up in the air.
    const fx = this.deps.fx;
    fx?.smoke(this.burstPoint, 5.5, 4.5, 0x6e6a63);
    fx?.dust(this.burstPoint, 7, 0.35);
    this.deps.render?.requestDynamicLight(this.burstPoint, 0xfff0c8, 220, 90, 0.22);
    this.deps.play(SOUNDS.canisterBurst, this.burstPoint, {
      volume: 1,
      refDistance: 60,
      maxDistance: 700,
    });

    if (!scene) return;
    for (let i = 0; i < CLUSTER.bomblets; i++) {
      const slot = this.bomblets[i];
      slot.model ??= this.assets.createBomblet();
      slot.arc.sample(0, this.scratchPos);
      slot.model.root.position.copy(this.scratchPos);
      slot.model.drogue.scale.setScalar(0.01);
      slot.model.root.visible = true;
      scene.add(slot.model.root);
      slot.active = true;
      if (i % Math.max(1, Math.round(CLUSTER.bomblets / TRAILED_BOMBLETS)) === 0) {
        slot.trail = this.assets.trails.attach(slot.model.root, {
          width: 0.1,
          growth: 0.35,
          maxAge: 3.2,
          spacing: 3.5,
        });
      }
    }
  }

  private updateBomblets(dt: number): void {
    for (let i = 0; i < CLUSTER.bomblets; i++) {
      const slot = this.bomblets[i];
      if (!slot.active || !slot.model) continue;
      const t = this.clock - this.burstTime;
      if (t >= slot.arc.duration) {
        this.detonate(slot);
        continue;
      }

      slot.arc.sample(t, this.scratchPos);
      slot.arc.velocity(t, this.scratchVel);
      const model = slot.model;
      model.root.position.copy(this.scratchPos);
      this.scratchLook.copy(this.scratchPos).add(this.scratchVel);
      model.root.lookAt(this.scratchLook);
      slot.spin += slot.spinRate * dt;
      model.root.rotateZ(slot.spin);

      // Ribbon streaming: it inflates over 150 ms once the delay is up, and the
      // canopy is what turns a shower of dots into a recognisable submunition.
      const deploy = Math.min(1, Math.max(0, (t - slot.drogueDelay) / 0.15));
      model.drogue.scale.setScalar(0.01 + deploy * 0.99);
    }
  }

  private detonate(slot: BombletSlot): void {
    if (slot.detonated) return;
    slot.detonated = true;
    slot.active = false;
    if (slot.trail >= 0) this.assets.trails.release(slot.trail);
    slot.trail = -1;
    slot.model?.root.removeFromParent();

    // The blast goes where the submunition actually is, not where the solver
    // aimed it. Under a drogue the shooting method leaves several metres on the
    // fastest bomblets — the drag is high enough that the lateral velocity it
    // needs has largely bled off by the time it matters — and a detonation that
    // does not come from the object the player watched fall is a worse error
    // than a pattern a few metres wider than nominal, which is in any case what
    // a real dispenser produces.
    slot.arc.sample(slot.arc.duration, this.scratchPos);
    this.scratchPos.y =
      this.deps.groundAt(this.scratchPos.x, this.scratchPos.z, slot.target.y) + 0.3;

    this.deps.combat?.explode({
      position: this.scratchPos,
      radius: CLUSTER.blastRadius,
      damage: CLUSTER.blastDamage,
      falloff: 'quadratic',
      source: this.deps.playerEntity,
      // Grenade-scale FX: twenty-four airstrike fireballs in two seconds would
      // exhaust the particle budget and read as one white screen anyway.
      kind: 'grenade',
      impulse: CLUSTER.blastImpulse,
      screenShake: CLUSTER.blastShake,
    });

    if (slot.leavesFire) {
      // `world` turns this event into an 8.5 m destruction sphere, which is right
      // for a 900 kg bomb and four times too much for one bomblet. Five events
      // spread across the pattern is the proportionate amount of collapsed
      // masonry for twenty-four submunitions.
      this.impactPayload.position.copy(this.scratchPos);
      this.deps.emit('killstreak:airstrikeImpact', this.impactPayload);
      this.deps.fx?.fire(this.scratchPos, CLUSTER.fireRadius, CLUSTER.fireDuration);
    }
  }

  private updateAftermath(): void {
    if (this.aftermathDone || this.clock < this.lastImpact + 0.35) return;
    this.aftermathDone = true;
    const fx = this.deps.fx;
    if (fx) {
      fx.smoke(this.centre, CLUSTER.patternRadius * 0.4, 14, 0x332e28);
      for (let i = 0; i < 3; i++) {
        const angle = i * 2.1;
        this.scratchPos
          .copy(this.centre)
          .addScaledVector(this.direction, Math.cos(angle) * CLUSTER.patternRadius * 0.6)
          .addScaledVector(this.right, Math.sin(angle) * CLUSTER.patternRadius * 0.6);
        this.scratchPos.y = this.deps.groundAt(this.scratchPos.x, this.scratchPos.z, this.groundY);
        fx.dust(this.scratchPos, CLUSTER.patternRadius * 0.4, 0.9);
      }
    }
    this.deps.ai?.alertAll(this.centre, CLUSTER.patternRadius + 70, 1);
  }

  private finish(): void {
    this.retireJet();
    if (this.canisterTrail >= 0) this.assets.trails.release(this.canisterTrail);
    this.canisterTrail = -1;
    this.canister?.root.removeFromParent();
    this.canisterState = 'idle';
    for (const slot of this.bomblets) {
      if (slot.trail >= 0) this.assets.trails.release(slot.trail);
      slot.trail = -1;
      slot.model?.root.removeFromParent();
      slot.active = false;
    }
    this.deps.marker('killstreak:cluster', null);
    this.active = false;
    this.clock = 0;
  }

  abort(): void {
    if (!this.active) return;
    this.radio.clear();
    this.finish();
  }

  dispose(): void {
    this.abort();
    this.jet?.dispose();
    this.jet = null;
    this.canister?.dispose();
    this.canister = null;
    for (const slot of this.bomblets) {
      slot.model?.dispose();
      slot.model = null;
    }
  }
}
