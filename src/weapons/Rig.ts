import * as THREE from 'three';
import { Spring, clamp, damp, saturate, smoothstep } from '../core/MathUtils';
import { SequencePlayer, sampleTrack, type Sequence } from './Sequence';
import { buildSequences, type WeaponSequences } from './Sequences';
import { RIG, type Pose, type WeaponModel } from './WeaponModel';

/**
 * The procedural animation rig: eight additive layers over one base pose.
 *
 *   base      hip / ADS / sprint / lowered, blended by the aim and raise curves
 *   sway      low-frequency drift and breathing, so the gun is never dead still
 *   bob       phase-locked to the footstep cycle, with a landing dip
 *   lag       the weapon trails the mouse and springs back
 *   recoil    per-shot impulse on a spring, rotating about the shoulder
 *   sequence  reload / cycle / melee / inspect, over the root *and* the rig nodes
 *   raise     the draw and holster arc
 *   mech      bolt travel, trigger break, hammer fall — driven by state, not time
 *
 * Layers below the sequence keep running underneath it, which is the whole
 * reason a reload here does not look like a clip being played: the gun is still
 * breathing and still settling from the last shot while the magazine changes.
 *
 * Nothing in `update` allocates.
 */

export interface RigInput {
  time: number;
  /** 0..1 aim progress. */
  ads: number;
  /** 0..1 fraction of run speed. */
  speed: number;
  /** 0..1 sprint blend. */
  sprint: number;
  crouch: number;
  grounded: boolean;
  /** Seconds off the ground. */
  airborne: number;
  /** Radians per second of view movement. */
  yawRate: number;
  pitchRate: number;
  /** 0..1 exertion, which widens the breathing sway. */
  winded: number;
  holdBreath: boolean;
  /** Distance fallen on the last landing, metres per second of impact. */
  landImpact: number;
  /** Suppresses every procedural layer, for pixel measurement. */
  still: boolean;
}

const _euler = new THREE.Euler(0, 0, 0, 'ZYX');
const _quat = new THREE.Quaternion();
const _pivot = new THREE.Vector3();
const _rotated = new THREE.Vector3();

/** Channels per node: px, py, pz, rx, ry, rz. */
const STRIDE = 6;

export class WeaponRig {
  readonly model: WeaponModel;
  readonly sequences: WeaponSequences;
  readonly player = new SequencePlayer();

  /** 0 = holstered, 1 = up. */
  raise = 0;
  raiseTarget = 1;
  /** Metres the bolt is held back by the empty-magazine catch. */
  boltHold = 0;
  /** 0..1 trigger travel. */
  trigger = 0;

  private readonly nodeNames: string[] = [];
  private readonly nodeGroups: THREE.Group[] = [];
  private readonly nodeData: Float32Array;
  private readonly nodeIndex = new Map<string, number>();

  /** Recoil springs: three translational, three rotational. */
  private readonly rp = [new Spring(46, 0.7), new Spring(46, 0.7), new Spring(38, 0.55)];
  private readonly rr = [new Spring(40, 0.6), new Spring(44, 0.7), new Spring(44, 0.7)];
  private readonly lag = [new Spring(30, 0.72), new Spring(30, 0.72)];
  private readonly lagRot = [new Spring(26, 0.7), new Spring(26, 0.7)];

  /** Footstep phase, in radians, advanced by speed rather than by time. */
  private bobPhase = 0;
  private landSpring = new Spring(52, 0.5);
  private breathPhase = 0;
  private swaySeed: number;
  private currentPose: Pose = { px: 0, py: 0, pz: 0, rx: 0, ry: 0, rz: 0 };
  /** Bolt cycle: 0 = closed, counts down after each shot. */
  private boltTimer = 0;
  private boltDuration = 0.06;
  private pumpValue = 0;
  private shellVisible = false;
  private looseNode: THREE.Group | null = null;
  private magNode: THREE.Group | null = null;

  /** Field of view the viewmodel camera should use this frame. */
  vmFov = 65;

  constructor(model: WeaponModel, seed = 1) {
    this.model = model;
    this.vmFov = model.vmFovHip;
    this.swaySeed = seed * 12.9898;
    for (const [name, group] of model.nodes) {
      this.nodeIndex.set(name, this.nodeNames.length);
      this.nodeNames.push(name);
      this.nodeGroups.push(group);
      group.userData.restX = group.position.x;
      group.userData.restY = group.position.y;
      group.userData.restZ = group.position.z;
    }
    this.nodeData = new Float32Array(this.nodeNames.length * STRIDE);
    this.sequences = buildSequences(model);
    this.bindSequence(this.sequences.reload);
    this.bindSequence(this.sequences.reloadEmpty);
    this.bindSequence(this.sequences.reloadStart);
    this.bindSequence(this.sequences.reloadShell);
    this.bindSequence(this.sequences.reloadEnd);
    this.bindSequence(this.sequences.cycle);
    this.bindSequence(this.sequences.melee);
    this.bindSequence(this.sequences.inspect);
    this.bindSequence(this.sequences.throwGrenade);
    this.looseNode = model.nodes.get(RIG.loose) ?? null;
    this.magNode = model.nodes.get(RIG.magazine) ?? null;
    if (this.looseNode) this.looseNode.visible = false;
  }

  private bindSequence(sequence: Sequence | null): void {
    if (!sequence) return;
    for (const t of sequence.tracks) {
      t.nodeIndex = t.node === '' ? -1 : (this.nodeIndex.get(t.node) ?? -2);
    }
  }

  /* ------------------------------ impulses ------------------------------ */

  /**
   * One shot. `up`/`side` are the pattern's direction for this round, already
   * in radians of view kick, so the visual recoil is in step with where the
   * bullets actually go.
   */
  fire(up: number, side: number, cyclePeriod: number, ads: number): void {
    const damped = 1 - 0.35 * ads;
    this.rp[2].impulse(2.1 * damped * (0.6 + up * 26));
    this.rp[1].impulse(0.34 * damped * (0.5 + up * 14));
    this.rp[0].impulse(side * 5.5 * damped);
    this.rr[0].impulse(9.5 * damped * (0.35 + up * 22));
    this.rr[1].impulse(-side * 90 * damped);
    this.rr[2].impulse(side * 130 * damped + 1.6 * damped);
    this.boltDuration = clamp(cyclePeriod * 0.62, 0.035, 0.16);
    this.boltTimer = this.boltDuration;
    this.trigger = 1;
  }

  /** A pump stroke or a bolt throw; returns false when one is already running. */
  workAction(): boolean {
    const s = this.sequences.cycle;
    if (!s) return false;
    this.player.play(s);
    return true;
  }

  land(impact: number): void {
    this.landSpring.impulse(-clamp(impact, 0, 9) * 0.55);
  }

  /* ------------------------------- frame -------------------------------- */

  update(dt: number, input: RigInput, onEvent: (name: string) => void): void {
    const model = this.model;
    const data = this.nodeData;
    data.fill(0);

    this.player.update(dt, onEvent);

    // ---- base pose ------------------------------------------------------
    const ads = input.ads;
    const sprint = input.sprint * (1 - ads);
    const hip = model.hipPose;
    const p = this.currentPose;
    blend(p, hip, model.adsPose, ads);
    blend(p, p, model.sprintPose, sprint);
    blend(p, p, model.loweredPose, 1 - saturate(this.raise));

    let px = p.px;
    let py = p.py;
    let pz = p.pz;
    let rx = p.rx;
    let ry = p.ry;
    let rz = p.rz;

    if (!input.still) {
      // ---- idle sway and breathing --------------------------------------
      this.breathPhase += dt * (input.holdBreath ? 0.35 : 1.15 + input.winded * 1.4);
      const t = input.time + this.swaySeed;
      // Two incommensurate frequencies per axis: the drift never repeats, which
      // is what stops a "living" idle from turning into a visible loop.
      const driftX = Math.sin(t * 0.31) * 0.6 + Math.sin(t * 0.77 + 1.3) * 0.4;
      const driftY = Math.sin(t * 0.27 + 2.1) * 0.6 + Math.sin(t * 0.62 + 0.4) * 0.4;
      const breath = Math.sin(this.breathPhase * Math.PI * 2) * (input.holdBreath ? 0.12 : 1);
      const wind = 1 + input.winded * 1.8;
      const hipAmp = (1 - ads) * (1 + input.speed * 0.9) * wind;
      const adsAmp = ads * (0.1 + 0.9 * input.winded) * (input.holdBreath ? 0.12 : 1);
      const amp = hipAmp + adsAmp;
      px += driftX * 0.0035 * amp;
      py += (driftY * 0.0028 + breath * 0.0022) * amp;
      ry += driftX * 0.019 * amp;
      rx += (driftY * 0.014 + breath * 0.011) * amp;
      rz += driftX * 0.012 * amp;

      // ---- walk / sprint bob --------------------------------------------
      // Phase advances with distance travelled, so the cycle stays locked to
      // the footstep no matter how the speed changes.
      const stride = input.sprint > 0.5 ? 8.4 : 6.6;
      this.bobPhase += dt * input.speed * stride;
      if (this.bobPhase > Math.PI * 4) this.bobPhase -= Math.PI * 4;
      const bobAmp = input.speed * (1 - ads * 0.86) * (1 - input.crouch * 0.35);
      const s1 = Math.sin(this.bobPhase);
      const c1 = Math.cos(this.bobPhase * 0.5);
      px += c1 * 0.0155 * bobAmp;
      py += -Math.abs(s1) * 0.011 * bobAmp;
      pz += s1 * 0.004 * bobAmp;
      rz += c1 * 0.045 * bobAmp;
      rx += Math.abs(s1) * 0.026 * bobAmp;
      ry += c1 * 0.03 * bobAmp;

      // ---- look lag ------------------------------------------------------
      // The weapon has mass: it trails a fast turn and springs back. Clamped so
      // a flick does not throw the gun off the side of the screen.
      const yaw = clamp(input.yawRate, -9, 9);
      const pitch = clamp(input.pitchRate, -9, 9);
      this.lag[0].target = clamp(-yaw * 0.011, -0.05, 0.05);
      this.lag[1].target = clamp(pitch * 0.009, -0.04, 0.04);
      this.lagRot[0].target = clamp(pitch * 0.055, -0.2, 0.2);
      this.lagRot[1].target = clamp(-yaw * 0.06, -0.24, 0.24);
      const lagScale = 1 - ads * 0.72;
      px += this.lag[0].update(dt) * lagScale;
      py += this.lag[1].update(dt) * lagScale;
      rx += this.lagRot[0].update(dt) * lagScale;
      ry += this.lagRot[1].update(dt) * lagScale;
      rz += this.lagRot[1].value * 0.5 * lagScale;

      // ---- airborne and landing ------------------------------------------
      const air = smoothstep(0, 0.35, input.airborne);
      py += air * 0.012 * (1 - ads * 0.7);
      rx -= air * 0.055 * (1 - ads * 0.7);
      const landing = this.landSpring.update(dt);
      py += landing * 0.02;
      rx += landing * 0.09;
    } else {
      this.landSpring.update(dt);
      this.lag[0].update(dt);
      this.lag[1].update(dt);
      this.lagRot[0].update(dt);
      this.lagRot[1].update(dt);
    }

    // ---- recoil ----------------------------------------------------------
    for (const s of this.rp) s.update(dt);
    for (const s of this.rr) s.update(dt);
    const kx = this.rp[0].value * 0.01;
    const ky = this.rp[1].value * 0.01;
    const kz = this.rp[2].value * 0.01;
    const krx = this.rr[0].value * 0.01;
    const kry = this.rr[1].value * 0.001;
    const krz = this.rr[2].value * 0.001;
    px += kx;
    py += ky;
    pz += kz;
    rx += krx;
    ry += kry;
    rz += krz;

    // ---- sequence layer --------------------------------------------------
    const seq = this.player.current;
    if (seq) {
      const w = this.player.weight;
      const st = Math.min(1, this.player.time / this.player.duration);
      for (const tr of seq.tracks) {
        const idx = tr.nodeIndex ?? -2;
        if (idx === -2) continue;
        const v = sampleTrack(tr, st) * w;
        if (idx === -1) {
          switch (tr.channel) {
            case 0:
              px += v;
              break;
            case 1:
              py += v;
              break;
            case 2:
              pz += v;
              break;
            case 3:
              rx += v;
              break;
            case 4:
              ry += v;
              break;
            default:
              rz += v;
          }
        } else {
          data[idx * STRIDE + tr.channel] += v;
        }
      }
    }

    // ---- mechanical nodes -------------------------------------------------
    if (this.boltTimer > 0) {
      this.boltTimer -= dt;
      const u = 1 - Math.max(0, this.boltTimer) / this.boltDuration;
      // Fast out, slower back: a bolt slams rearward and is returned by a spring.
      const travel = u < 0.42 ? u / 0.42 : 1 - (u - 0.42) / 0.58;
      this.addNode(RIG.bolt, 2, model.boltTravel * travel * travel * (3 - 2 * travel));
      this.addNode(RIG.charge, 2, model.chargeTravel * travel * 0.18);
    }
    if (this.boltHold > 0) this.addNode(RIG.bolt, 2, this.boltHold);
    this.trigger = damp(this.trigger, 0, 16, dt);
    this.addNode(RIG.trigger, 3, -this.trigger * model.triggerPull);
    this.addNode(RIG.hammer, 3, (1 - this.trigger) * 0.95);
    if (this.pumpValue !== 0) this.addNode(RIG.pump, 2, this.pumpValue);

    // ---- raise / holster --------------------------------------------------
    this.raise = damp(this.raise, this.raiseTarget, 13, dt);

    // ---- compose -----------------------------------------------------------
    _euler.set(rx, ry, rz, 'ZYX');
    _quat.setFromEuler(_euler);
    // Rotate about the shoulder rather than about the model origin: it is why
    // recoil reads as the gun pivoting into you instead of spinning in place.
    _pivot.set(0, -0.02, 0.2);
    _rotated.copy(_pivot).applyQuaternion(_quat);
    model.root.quaternion.copy(_quat);
    model.root.position.set(
      px + _pivot.x - _rotated.x,
      py + _pivot.y - _rotated.y,
      pz + _pivot.z - _rotated.z,
    );

    for (let i = 0; i < this.nodeGroups.length; i++) {
      const g = this.nodeGroups[i];
      const o = i * STRIDE;
      const ud = g.userData;
      g.position.set(
        (ud.restX as number) + data[o],
        (ud.restY as number) + data[o + 1],
        (ud.restZ as number) + data[o + 2],
      );
      g.rotation.set(data[o + 3], data[o + 4], data[o + 5]);
    }

    // ---- viewmodel field of view -------------------------------------------
    // Eased on the same curve as the base pose, so the sight picture grows in
    // step with the gun coming up instead of racing it.
    const fovT = ads * ads * (3 - 2 * ads);
    this.vmFov = model.vmFovHip + (model.vmFovAds - model.vmFovHip) * fovT;
  }

  private addNode(name: string, channel: number, value: number): void {
    const i = this.nodeIndex.get(name);
    if (i === undefined) return;
    this.nodeData[i * STRIDE + channel] += value;
  }

  setShellVisible(visible: boolean): void {
    this.shellVisible = visible;
    if (this.looseNode) this.looseNode.visible = visible;
  }

  get shellShown(): boolean {
    return this.shellVisible;
  }

  setMagVisible(visible: boolean): void {
    if (this.magNode) this.magNode.visible = visible;
  }

  setPump(value: number): void {
    this.pumpValue = value;
  }

  reset(): void {
    this.player.stop();
    for (const s of this.rp) s.reset();
    for (const s of this.rr) s.reset();
    for (const s of this.lag) s.reset();
    for (const s of this.lagRot) s.reset();
    this.landSpring.reset();
    this.boltTimer = 0;
    this.trigger = 0;
    this.pumpValue = 0;
    this.setShellVisible(false);
    this.setMagVisible(true);
  }
}

function blend(out: Pose, a: Pose, b: Pose, t: number): void {
  if (t <= 0) {
    if (out !== a) {
      out.px = a.px;
      out.py = a.py;
      out.pz = a.pz;
      out.rx = a.rx;
      out.ry = a.ry;
      out.rz = a.rz;
    }
    return;
  }
  // Ease so the aim transition has weight at both ends rather than a linear ramp.
  const e = t >= 1 ? 1 : t * t * (3 - 2 * t);
  out.px = a.px + (b.px - a.px) * e;
  out.py = a.py + (b.py - a.py) * e;
  out.pz = a.pz + (b.pz - a.pz) * e;
  out.rx = a.rx + (b.rx - a.rx) * e;
  out.ry = a.ry + (b.ry - a.ry) * e;
  out.rz = a.rz + (b.rz - a.rz) * e;
}
