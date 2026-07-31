/**
 * The air strike.
 *
 * One clock drives the whole thing. Every aircraft position, every release, every
 * detonation is a pure function of `clock`, seconds since the target was
 * confirmed, so the sequence is frame-rate independent, reproducible, and can be
 * scrubbed for capture. Nothing is decided mid-flight.
 *
 * Carpet timeline, in seconds from confirm (the numbers are derived in
 * `Tuning.ts`; these are what they come out as):
 *
 *   0.00  confirm. Callout, bearing, objective marker, `killstreak:airstrikeCalled`.
 *   0.55  three jets appear at 748 / 809 / 870 m out, 150 m up, in trail.
 *   1.95  lead jet at 496 m short of the carpet origin: bombs away, 130 ms apart.
 *   2.99  last bomb off the third jet's rack. Jets pitch up into the egress climb.
 *   4.70  lead jet crosses the strike centre — 40 ms before its own bombs land.
 *   4.75  first detonation, 48 m short of centre on the run-in axis.
 *   6.19  ninth detonation, 48 m beyond centre. 96 m of carpet in 1.44 s.
 *   6.60  survivors alerted, smoke column and dust haze over the corridor.
 *   8.59  aircraft recycled. Fires burn for another 16 s.
 *
 * Presentation deliberately stops at the edge of what `combat.explode` already
 * owns. That call does the radial damage with line-of-sight sampling, the
 * shrapnel, the radial impulse, the destructible damage, the fireball, the smoke,
 * the debris, the dust, the report, the screen shake, the flash, the dynamic light
 * and the AI suppression. Doubling any of it produces two explosions in the same
 * hole. What is added here is only what a blast cannot know about: the aircraft,
 * the ordnance in flight, the acoustics, and the fires left burning afterwards.
 */
import * as THREE from 'three';
import type { AircraftModel } from './models/Aircraft';
import type { OrdnanceModel } from './models/Ordnance';
import { BakedArc, bakeArc, solveRelease } from './Ballistics';
import type { KillstreakAssets } from './Assets';
import type { KillstreakDeps } from './Deps';
import type { Acoustics } from './Acoustics';
import type { Radio } from './Radio';
import { AIRSTRIKE, PRECISION, SOUNDS } from './Tuning';
import { bearingLabel, bearingToDirection, gridReference } from './MapMath';

export type StrikeKind = 'precision' | 'cluster' | 'carpet';

interface JetSlot {
  model: AircraftModel | null;
  active: boolean;
  /** Along-track coordinate at clock = 0, metres. */
  originAlong: number;
  lateral: number;
  altitude: number;
  trail: number;
  grainTimer: number;
  bombsLeft: number;
}

interface BombSlot {
  model: OrdnanceModel | null;
  arc: BakedArc;
  state: 'idle' | 'carried' | 'falling';
  releaseTime: number;
  impactTime: number;
  jet: number;
  hardpoint: number;
  trail: number;
  target: THREE.Vector3;
  tumble: number;
  tumbleRate: number;
  leavesFire: boolean;
}

const MAX_JETS = 3;
const MAX_BOMBS = 9;
/** Emission interval for the delayed jet roar. */
const GRAIN_INTERVAL = 0.26;

export class AirStrike {
  active = false;
  kind: StrikeKind = 'carpet';
  clock = 0;

  private readonly jets: JetSlot[] = [];
  private readonly bombs: BombSlot[] = [];

  private readonly centre = new THREE.Vector3();
  private readonly direction = new THREE.Vector3();
  private readonly right = new THREE.Vector3();
  private heading = 0;
  private groundY = 0;

  private jetCount = 0;
  private bombCount = 0;
  private spawnTime = 0;
  private despawnTime = 0;
  private lastImpact = 0;
  private aftermathDone = false;
  private rumbleDone = false;
  private solverResidual = 0;
  private ejectorDelta = 0;

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
    for (let i = 0; i < MAX_JETS; i++) {
      this.jets.push({
        model: null,
        active: false,
        originAlong: 0,
        lateral: 0,
        altitude: 0,
        trail: -1,
        grainTimer: 0,
        bombsLeft: 0,
      });
    }
    for (let i = 0; i < MAX_BOMBS; i++) {
      this.bombs.push({
        model: null,
        arc: new BakedArc(),
        state: 'idle',
        releaseTime: 0,
        impactTime: 0,
        jet: 0,
        hardpoint: 0,
        trail: -1,
        target: new THREE.Vector3(),
        tumble: 0,
        tumbleRate: 0,
        leavesFire: false,
      });
    }
  }

  /** Diagnostics for the dev harness and the final report. */
  get diagnostics(): {
    kind: StrikeKind;
    clock: number;
    firstImpact: number;
    lastImpact: number;
    residual: number;
    ejectorDelta: number;
    bombs: number;
  } {
    return {
      kind: this.kind,
      clock: this.clock,
      firstImpact: this.bombCount > 0 ? this.bombs[0].impactTime : 0,
      lastImpact: this.lastImpact,
      residual: this.solverResidual,
      ejectorDelta: this.ejectorDelta,
      bombs: this.bombCount,
    };
  }

  // -------------------------------------------------------------------------
  // Launch
  // -------------------------------------------------------------------------

  /**
   * `heading` is the compass bearing the aircraft approach *from*, matching the
   * contract, so the run-in axis points from that bearing through the target.
   */
  call(target: THREE.Vector3, heading: number, kind: StrikeKind): void {
    if (this.active) this.abort();

    this.active = true;
    this.kind = kind;
    this.clock = 0;
    this.aftermathDone = false;
    this.rumbleDone = false;
    this.heading = heading;
    this.centre.copy(target);
    this.groundY = this.deps.groundAt(target.x, target.z, target.y);
    this.centre.y = this.groundY;

    // The jets fly from the bearing toward the target, so the run-in axis is the
    // reverse of the bearing vector.
    bearingToDirection(heading, this.direction).multiplyScalar(-1);
    this.right.set(-this.direction.z, 0, this.direction.x);

    const precision = kind === 'precision';
    this.jetCount = precision ? 1 : AIRSTRIKE.jets;
    this.bombCount = precision ? 1 : AIRSTRIKE.jets * AIRSTRIKE.bombsPerJet;

    this.scheduleFormation();
    this.scheduleBombs();

    this.spawnTime = AIRSTRIKE.firstRelease - AIRSTRIKE.approachLead;
    this.lastImpact = this.bombs[this.bombCount - 1].impactTime;
    this.despawnTime = this.lastImpact + AIRSTRIKE.egressHold;

    this.announceLaunch();
  }

  /** Formation geometry: line astern, laterally and vertically staggered. */
  private scheduleFormation(): void {
    // The lead's along-track coordinate at the moment of its first release. The
    // required 160 m/s average ground speed over a 2.8 s fall is what sets it.
    const releaseAlong =
      this.carpetOffset(0) - 160 * AIRSTRIKE.baseFallTime;

    for (let j = 0; j < this.jetCount; j++) {
      const slot = this.jets[j];
      slot.originAlong =
        releaseAlong - AIRSTRIKE.speed * AIRSTRIKE.firstRelease - AIRSTRIKE.trail * j;
      // Lead centred, wingmen echeloned left and right, stacked in height so
      // three aircraft resolve as three rather than as one blur.
      slot.lateral = j === 0 ? 0 : (j === 1 ? 1 : -1) * AIRSTRIKE.lateralOffset;
      slot.altitude =
        AIRSTRIKE.altitude + (j === 0 ? 0 : (j === 1 ? -1 : 1) * AIRSTRIKE.altitudeStagger);
      slot.bombsLeft = this.kind === 'precision' ? 1 : AIRSTRIKE.bombsPerJet;
      slot.grainTimer = 0;
      slot.active = false;
    }
  }

  /** Ground offset of detonation `i` along the run-in axis. */
  private carpetOffset(index: number): number {
    if (this.kind === 'precision') return 0;
    const half = (this.bombCount - 1) / 2;
    return (index - half) * AIRSTRIKE.impactSpacing;
  }

  /**
   * Assigns each bomb a target and a time, then solves the release that connects
   * the two. The solve is done here rather than at release because the aircraft
   * path is closed form: the position the store leaves the rack from is known to
   * the millimetre nine bombs and four seconds ahead of time.
   */
  private scheduleBombs(): void {
    let worstResidual = 0;
    let worstDelta = 0;

    for (let i = 0; i < this.bombCount; i++) {
      const bomb = this.bombs[i];
      const jetIndex = Math.min(
        this.jetCount - 1,
        Math.floor(i / Math.max(1, AIRSTRIKE.bombsPerJet)),
      );
      const stationIndex = i % Math.max(1, AIRSTRIKE.bombsPerJet);
      bomb.jet = jetIndex;
      bomb.hardpoint = stationIndex;
      bomb.releaseTime = AIRSTRIKE.firstRelease + AIRSTRIKE.releaseInterval * i;
      bomb.impactTime =
        AIRSTRIKE.firstRelease + AIRSTRIKE.baseFallTime + AIRSTRIKE.impactInterval * i;
      bomb.state = 'idle';
      bomb.trail = -1;
      bomb.tumble = i * 0.7;
      bomb.tumbleRate = 1.6 + (i % 3) * 0.35;
      // Four of the nine craters keep burning; all nine would be a wall of fire.
      bomb.leavesFire =
        this.kind === 'precision' ||
        i % Math.max(1, Math.round(this.bombCount / AIRSTRIKE.fireCount)) === 0;

      const offset = this.carpetOffset(i);
      bomb.target
        .copy(this.centre)
        .addScaledVector(this.direction, offset);
      bomb.target.y = this.deps.groundAt(bomb.target.x, bomb.target.z, this.groundY);

      this.jetPosition(jetIndex, bomb.releaseTime, this.scratchPos);
      this.hardpointOffset(stationIndex, this.scratchA);
      this.scratchPos.add(this.scratchA);

      const flightTime = bomb.impactTime - bomb.releaseTime;
      this.scratchVel.copy(this.direction).multiplyScalar(AIRSTRIKE.speed);
      const solution = solveRelease(
        this.scratchPos,
        bomb.target,
        flightTime,
        1,
        this.scratchVel,
      );
      bakeArc(this.scratchPos, solution.velocity, flightTime, 1, bomb.arc);
      worstResidual = Math.max(worstResidual, solution.residual);
      worstDelta = Math.max(worstDelta, solution.delta);
    }

    this.solverResidual = worstResidual;
    this.ejectorDelta = worstDelta;
  }

  /** World position of jet `j` at strike-clock time `t`. */
  private jetPosition(j: number, t: number, out: THREE.Vector3): THREE.Vector3 {
    const slot = this.jets[j];
    const along = slot.originAlong + AIRSTRIKE.speed * t;
    out
      .copy(this.centre)
      .addScaledVector(this.direction, along)
      .addScaledVector(this.right, slot.lateral);
    out.y = this.groundY + slot.altitude + this.climb(t);
    return out;
  }

  /**
   * Egress climb. The formation holds level through the release and then pulls up
   * off the target, which is both what a strike package actually does and the
   * thing that sells the aircraft as being flown rather than dragged along a rail.
   */
  private climb(t: number): number {
    const lastRelease =
      AIRSTRIKE.firstRelease + AIRSTRIKE.releaseInterval * Math.max(0, this.bombCount - 1);
    const since = t - lastRelease;
    if (since <= 0) return 0;
    // 18 m/s of climb reached over 1.2 s, held after: a 6 degree climb at 180 m/s.
    const rate = 18 * Math.min(1, since / 1.2);
    return 0.5 * rate * Math.min(since, 1.2) + Math.max(0, since - 1.2) * 18;
  }

  private hardpointOffset(station: number, out: THREE.Vector3): THREE.Vector3 {
    const jet = this.jets[0].model;
    const node = jet?.hardpoints[station];
    if (!node) return out.set(0, -0.6, 0);
    // The airframe is level and pointed down the run-in axis at release, so a
    // local offset rotates by heading alone.
    out
      .copy(this.direction)
      .multiplyScalar(node.position.z)
      .addScaledVector(this.right, node.position.x);
    out.y = node.position.y;
    return out;
  }

  private announceLaunch(): void {
    const label = bearingLabel(this.heading);
    const grid = gridReference(this.centre, this.deps.world?.bounds ?? null);
    this.deps.marker('killstreak:airstrike', this.centre, `STRIKE ${grid}`);

    this.calledPayload.origin.copy(this.centre);
    this.calledPayload.heading = this.heading;
    this.deps.emit('killstreak:airstrikeCalled', this.calledPayload);

    const name =
      this.kind === 'precision' ? 'PRECISION STRIKE' : 'AIRSTRIKE';
    this.deps.announce(`${name} INBOUND`, `BEARING ${label} · GRID ${grid}`, 3.2);
    this.radio.play([
      {
        at: 0,
        // Squelch only: the audio module answers `killstreak:airstrikeCalled`
        // with the voice line, and two of them is a stutter.
        sound: SOUNDS.radioSquelch,
        text: 'HAMMER 1-1: STRIKE INBOUND',
        sub: `BEARING ${label} · GRID ${grid}`,
      },
      {
        at: AIRSTRIKE.firstRelease - 1.1,
        sound: 'radio_strike_ten_seconds',
        text: 'HAMMER 1-1: RUNNING IN',
        sub: 'KEEP YOUR HEADS DOWN',
        kind: 'warn',
      },
      {
        at: AIRSTRIKE.firstRelease + 0.1,
        sound: 'radio_strike_away',
        text: 'HAMMER 1-1: ROUNDS AWAY',
        kind: 'warn',
      },
      {
        at: this.bombs[this.bombCount - 1].impactTime + 0.9,
        sound: 'radio_strike_effect',
        text: 'HAMMER 1-1: GOOD EFFECT ON TARGET',
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

    this.updateJets(dt);
    this.updateBombs();
    this.updateAftermath();

    if (this.clock >= this.despawnTime) this.finish();
  }

  private updateJets(dt: number): void {
    const scene = this.deps.scene;
    if (!scene) return;
    const withinWindow = this.clock >= this.spawnTime && this.clock < this.despawnTime;

    for (let j = 0; j < this.jetCount; j++) {
      const slot = this.jets[j];
      if (withinWindow && !slot.active) this.spawnJet(j);
      if (!slot.active || !slot.model) continue;
      if (!withinWindow) {
        this.retireJet(j);
        continue;
      }

      const model = slot.model;
      this.jetPosition(j, this.clock, this.scratchPos);
      // Facing comes from the analytic path a tenth of a second ahead, which
      // includes the climb, so the nose lifts through the pull-up.
      this.jetPosition(j, this.clock + 0.1, this.scratchLook);
      model.root.position.copy(this.scratchPos);
      model.root.lookAt(this.scratchLook);

      // Formation jitter plus a lazy roll: dead-straight aircraft read as props.
      const wobble = Math.sin(this.clock * 1.7 + j * 2.1) * 0.035;
      model.root.rotateZ(wobble);
      model.root.updateMatrixWorld(true);

      // Afterburner: lit hard on the run-in, harder still on the egress climb.
      const climbing = this.climb(this.clock) > 0.5;
      const throttle = climbing ? 1.35 : 0.9;
      for (const burner of model.burners) {
        burner.scale.set(0.85 + throttle * 0.2, 0.85 + throttle * 0.2, throttle);
        burner.visible = true;
      }
      if (model.strobe) {
        model.strobe.visible = (this.clock * 1.4 + j * 0.4) % 1 < 0.14;
      }

      slot.grainTimer -= dt;
      if (slot.grainTimer <= 0) {
        slot.grainTimer = GRAIN_INTERVAL;
        this.scratchVel.copy(this.direction).multiplyScalar(AIRSTRIKE.speed);
        this.deps.playerEye(this.scratchA);
        const distance = this.scratchA.distanceTo(this.scratchPos);
        this.acoustics.emit(
          distance > 420 ? SOUNDS.jetDistant : SOUNDS.jetPass,
          this.scratchPos,
          this.scratchVel,
          this.deps.now,
          j === 0 ? 1 : 0.8,
          160,
          1500,
        );
      }
    }
  }

  private spawnJet(j: number): void {
    const scene = this.deps.scene;
    if (!scene) return;
    const slot = this.jets[j];
    slot.model ??= this.assets.createJet();
    slot.active = true;
    slot.grainTimer = 0;
    this.jetPosition(j, this.clock, this.scratchPos);
    slot.model.root.position.copy(this.scratchPos);
    slot.model.root.visible = true;
    scene.add(slot.model.root);
    slot.model.root.updateMatrixWorld(true);

    // Engine contrail through the fx system's own pool, on the port wingtip, plus
    // the module's ribbon pool on the starboard one. Two sources rather than one
    // because fx holds four contrail slots in total and three jets plus nine
    // bombs would evict each other.
    const duration = this.despawnTime - this.clock + 1;
    const tips = slot.model.wingtips;
    if (tips[0]) this.deps.fx?.contrail(tips[0], duration);
    if (tips[1]) {
      slot.trail = this.assets.trails.attach(tips[1], {
        width: 0.8,
        growth: 1.1,
        maxAge: 9,
        spacing: 6,
      });
    }

    // Hang this jet's stick on its pylons so the ordnance is visibly there before
    // it is visibly gone.
    for (let i = 0; i < this.bombCount; i++) {
      const bomb = this.bombs[i];
      if (bomb.jet !== j || bomb.state !== 'idle') continue;
      const node = slot.model.hardpoints[bomb.hardpoint];
      if (!node) continue;
      bomb.model ??= this.assets.createBomb();
      bomb.model.root.position.set(0, -0.28, 0);
      bomb.model.root.rotation.set(0, 0, 0);
      bomb.model.root.visible = true;
      node.add(bomb.model.root);
      bomb.state = 'carried';
    }
  }

  private retireJet(j: number): void {
    const slot = this.jets[j];
    if (slot.trail >= 0) this.assets.trails.release(slot.trail);
    slot.trail = -1;
    slot.active = false;
    if (slot.model) slot.model.root.removeFromParent();
  }

  private updateBombs(): void {
    const scene = this.deps.scene;
    if (!scene) return;

    for (let i = 0; i < this.bombCount; i++) {
      const bomb = this.bombs[i];
      if (bomb.state === 'idle' || !bomb.model) continue;

      if (bomb.state === 'carried') {
        if (this.clock < bomb.releaseTime) continue;
        // Off the rack: reparent to the world and take over from the baked arc.
        bomb.arc.sample(0, this.scratchPos);
        scene.add(bomb.model.root);
        bomb.model.root.position.copy(this.scratchPos);
        bomb.state = 'falling';
        bomb.trail = this.assets.trails.attach(bomb.model.root, {
          width: 0.22,
          growth: 0.5,
          maxAge: 4.5,
          spacing: 5,
        });
        continue;
      }

      const t = this.clock - bomb.releaseTime;
      if (t >= bomb.arc.duration) {
        this.detonate(bomb);
        continue;
      }

      bomb.arc.sample(t, this.scratchPos);
      bomb.arc.velocity(t, this.scratchVel);
      bomb.model.root.position.copy(this.scratchPos);
      this.scratchLook.copy(this.scratchPos).add(this.scratchVel);
      bomb.model.root.lookAt(this.scratchLook);
      // A free-fall store is stable but not rigid: it hunts a couple of degrees
      // about the velocity vector and rolls slowly on the way down.
      bomb.tumble += bomb.tumbleRate * 0.016;
      bomb.model.root.rotateX(Math.sin(bomb.tumble) * 0.045);
      bomb.model.root.rotateZ(bomb.tumble * 0.6);
    }
  }

  private detonate(bomb: BombSlot): void {
    const combat = this.deps.combat;
    const fx = this.deps.fx;
    const precision = this.kind === 'precision';
    const radius = precision ? PRECISION.blastRadius : AIRSTRIKE.blastRadius;

    // Ground the crater: the assigned aim point already sits on the terrain, but
    // resample in case a destructible has changed the surface since the schedule
    // was solved.
    this.scratchPos.copy(bomb.target);
    this.scratchPos.y = this.deps.groundAt(bomb.target.x, bomb.target.z, bomb.target.y) + 0.35;

    if (bomb.trail >= 0) this.assets.trails.release(bomb.trail);
    bomb.trail = -1;
    bomb.model?.root.removeFromParent();
    bomb.state = 'idle';

    combat?.explode({
      position: this.scratchPos,
      radius,
      damage: precision ? PRECISION.blastDamage : AIRSTRIKE.blastDamage,
      falloff: 'quadratic',
      source: this.deps.playerEntity,
      kind: 'airstrike',
      impulse: precision ? PRECISION.blastImpulse : AIRSTRIKE.blastImpulse,
      screenShake: precision ? PRECISION.blastShake : AIRSTRIKE.blastShake,
    });

    this.impactPayload.position.copy(this.scratchPos);
    this.deps.emit('killstreak:airstrikeImpact', this.impactPayload);

    // Fire is the one presentation element `explode` does not cover, and it is
    // what makes a struck block still look struck twenty seconds later.
    if (bomb.leavesFire && fx) {
      fx.fire(
        this.scratchPos,
        precision ? PRECISION.fireRadius : AIRSTRIKE.fireRadius,
        precision ? PRECISION.fireDuration : AIRSTRIKE.fireDuration,
      );
    }

    this.oneShotRumble();
  }

  /**
   * A single low rumble for a strike that lands away from the player.
   *
   * `explode` gates its own shake on proximity — closeness is zero past about two
   * and a half radii — which is right for a grenade and wrong for nine 900 kg
   * bombs a hundred metres off. This adds the felt component of a distant salvo
   * exactly once, and only in the range where the per-blast shake contributes
   * nothing, so nothing is doubled.
   */
  private oneShotRumble(): void {
    if (this.rumbleDone) return;
    this.rumbleDone = true;
    const render = this.deps.render;
    if (!render) return;
    this.deps.playerEye(this.scratchA);
    const distance = this.scratchA.distanceTo(this.centre);
    if (distance < 40 || distance > 400) return;
    const strength = 0.55 * (1 - (distance - 40) / 360);
    render.addScreenShake(strength, 1.5 + strength * 1.5, 7);
  }

  private updateAftermath(): void {
    if (this.aftermathDone || this.clock < this.lastImpact + 0.35) return;
    this.aftermathDone = true;
    const fx = this.deps.fx;
    const spread = this.kind === 'precision' ? 8 : (this.bombCount * AIRSTRIKE.impactSpacing) / 2;

    // A column and a haze over the whole corridor, which is a different thing
    // from the nine per-crater plumes `explode` already put up.
    if (fx) {
      fx.smoke(this.centre, spread * 0.5, 16, 0x2f2a25);
      for (let i = -1; i <= 1; i++) {
        this.scratchPos
          .copy(this.centre)
          .addScaledVector(this.direction, i * spread * 0.66);
        this.scratchPos.y = this.deps.groundAt(this.scratchPos.x, this.scratchPos.z, this.groundY);
        fx.dust(this.scratchPos, spread * 0.5, 1.1);
      }
    }

    // Survivors know exactly where that came from.
    this.deps.ai?.alertAll(this.centre, spread + 70, 1);
  }

  private finish(): void {
    for (let j = 0; j < MAX_JETS; j++) this.retireJet(j);
    for (const bomb of this.bombs) {
      if (bomb.trail >= 0) this.assets.trails.release(bomb.trail);
      bomb.trail = -1;
      bomb.model?.root.removeFromParent();
      bomb.state = 'idle';
    }
    this.deps.marker('killstreak:airstrike', null);
    this.active = false;
    this.clock = 0;
  }

  /** Tears the sequence down immediately, e.g. on dispose or a level change. */
  abort(): void {
    if (!this.active) return;
    this.radio.clear();
    this.finish();
  }

  dispose(): void {
    this.abort();
    for (const slot of this.jets) {
      slot.model?.dispose();
      slot.model = null;
    }
    for (const bomb of this.bombs) {
      bomb.model?.dispose();
      bomb.model = null;
    }
  }
}
