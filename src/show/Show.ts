import * as THREE from 'three';
import { Stage, INTERIOR_ORIGIN } from './Stage';
import { Timeline, type TimelineEvent } from '../timeline/Timeline';
import { CHAPTERS, NARRATION } from '../timeline/Script';
import { CameraDirector } from '../camera/CameraDirector';
import { buildShots, fadeAt, ip } from './Shots';
import { applyBlocking, BREACH_TIME, VADER_ENTRY, type FireOrder } from './Blocking';
import {
  destroyerState,
  makeShipState,
  podOffset,
  podHeat,
  POD_LAUNCH,
  runnerState,
} from './Motion';
import { clamp, damp, faceAlong, lerp, smoothstep } from '../core/MathX';
import type { AudioBus } from '../audio/AudioTypes';
import { SILENT_BUS } from '../audio/AudioTypes';
import type { RenderSystem } from '../core/RenderSystem';
import { rng } from '../core/Rng';
import { aimAt } from '../characters/Cast';

/**
 * The director.
 *
 * Owns the timeline, drives the stage from it, and keeps every continuous
 * value (ship transforms, light levels, alert states, camera) a pure function
 * of time so that scrubbing is exact. Discrete effects and audio are attached
 * as timeline events.
 */

const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _muzzle = new THREE.Vector3();

/** Lift an interior-local point (plus an offset) into world space. */
function worldOf(local: THREE.Vector3, dx: number, dy: number, dz: number): THREE.Vector3 {
  return new THREE.Vector3(local.x + dx, local.y + dy, local.z + dz).add(INTERIOR_ORIGIN);
}

export class Show {
  readonly timeline: Timeline;
  readonly director = new CameraDirector();
  readonly stage: Stage;
  audio: AudioBus = SILENT_BUS;

  private render: RenderSystem;
  private runnerMotion = makeShipState();
  private destroyerMotion = makeShipState();
  private fireOrders: FireOrder[];
  private podLaunched = false;
  private lastTime = 0;

  constructor(render: RenderSystem, stage: Stage) {
    this.render = render;
    this.stage = stage;
    this.timeline = new Timeline(CHAPTERS);
    this.fireOrders = applyBlocking(stage);
    this.director.setShots(buildShots(stage));

    this.timeline.addEvents(this.buildEvents());
    this.timeline.onSeek(() => this.handleSeek());

    // Prime the world at t = 0 so the first rendered frame is already correct.
    this.applyContinuous(0, 1 / 60);
  }

  /* ------------------------------------------------------------- events */

  private buildEvents(): TimelineEvent[] {
    const events: TimelineEvent[] = [];
    const stage = this.stage;
    const fx = stage.fx;
    const r = rng('space-combat');

    // ---------------------------------------------------------- narration
    for (const line of NARRATION) {
      events.push({
        time: line.start,
        id: `narrate:${line.id}`,
        action: () => this.audio.narrate(line.id),
      });
    }

    // -------------------------------------------------------------- music
    const musicCues: Array<[number, Parameters<AudioBus['music']>[0], number]> = [
      [0, 'void', 0.25],
      [9, 'void', 0.5],
      [20, 'wonder', 0.55],
      [35, 'wonder', 0.8],
      [42, 'wonder', 0.5],
      [62, 'wonder', 0.4],
      [78, 'chase', 0.75],
      [89, 'chase', 1.0],
      [113, 'battle', 0.9],
      [148, 'battle', 1.0],
      [163, 'capture', 0.6],
      [176, 'capture', 0.8],
      [204, 'siege', 0.7],
      [210, 'siege', 0.55],
      [BREACH_TIME, 'battle', 1.0],
      [BREACH_TIME + 26, 'siege', 0.45],
      [VADER_ENTRY - 1.5, 'menace', 0.9],
      [288, 'tender', 0.6],
      [303, 'tender', 0.8],
      [324, 'resolve', 0.85],
      [POD_LAUNCH, 'resolve', 1.0],
      [366, 'hope', 0.9],
      [382, 'hope', 0.7],
      [395, 'hope', 0.55],
    ];
    for (const [time, mood, intensity] of musicCues) {
      events.push({
        time,
        id: `music:${time}:${mood}`,
        action: () => this.audio.music(mood, intensity),
      });
    }

    // ------------------------------------------------------ space combat
    // Ventral batteries walk their fire onto the corvette. Travel time is
    // real, so the bolts visibly cross the gap before anything happens.
    let volley = 0;
    for (let t = 114; t < 161; t += r.range(0.85, 1.7)) {
      const isHit = volley % 3 === 2 || t > 150;
      const turretIndex = volley % Math.max(1, stage.destroyer.ventralTurrets.length);
      const time = t;
      events.push({
        time,
        id: `turbolaser:${volley}`,
        action: () => {
          const turret = stage.destroyer.ventralTurrets[turretIndex];
          if (!turret) return;
          const aim = makeShipState();
          runnerState(time + 0.55, aim);
          const scatter = isHit ? 8 : r.range(60, 190);
          aim.position.x += r.spread(scatter);
          aim.position.y += r.spread(scatter * 0.5);
          this.audio.sfx('laserHeavy', { position: turret.muzzles[0].getWorldPosition(_v).clone() });
          for (const m of turret.muzzles) {
            const origin = m.getWorldPosition(new THREE.Vector3());
            fx.turbolaser(origin, aim.position.clone(), (p) => {
              if (isHit) {
                stage.runner.flashShield(p);
                fx.spaceImpact(p, 1.1, new THREE.Color(0x9fd4ff));
                this.audio.sfx('shieldFlash', { position: p.clone() });
                if (time > 143) {
                  fx.spaceImpact(p, 1.5);
                  this.audio.sfx('hullImpact', { position: p.clone(), gain: 0.9 });
                }
              } else {
                fx.spaceNearMiss(p);
              }
            });
          }
        },
      });
      volley++;
    }

    // The corvette answers with her dorsal guns.
    let reply = 0;
    for (let t = 120; t < 150; t += r.range(1.6, 3.2)) {
      const time = t;
      events.push({
        time,
        id: `runner-gun:${reply}`,
        action: () => {
          const origin = stage.runner.root.localToWorld(new THREE.Vector3(r.spread(6), 11.5, 20));
          const aim = makeShipState();
          destroyerState(time + 0.5, aim);
          aim.position.x += r.spread(220);
          aim.position.y += r.spread(90) - 40;
          aim.position.z += r.spread(400);
          this.audio.sfx('laserLight', { position: origin.clone(), gain: 0.7 });
          fx.runnerCannon(origin, aim.position, (p) => {
            fx.spaceImpact(p, 0.7, new THREE.Color(0xff9a5a));
          });
        },
      });
      reply++;
    }

    // Drive failure.
    events.push({
      time: 152.5,
      id: 'drive-hit',
      action: () => {
        const p = stage.runner.root.localToWorld(new THREE.Vector3(0, 4, 62));
        stage.fx.spaceImpact(p, 2.6);
        stage.fx.addShake(1.9);
        this.audio.sfx('explosionSmall', { position: p.clone(), gain: 1 });
        this.audio.sfx('metalStress', { gain: 0.8 });
      },
    });
    events.push({
      time: 158.5,
      id: 'drive-out',
      action: () => {
        const p = stage.runner.root.localToWorld(new THREE.Vector3(0, 0, 76));
        stage.fx.spaceImpact(p, 1.8, new THREE.Color(0x8fc9ff));
        this.audio.sfx('lowBoom', { gain: 0.8 });
      },
    });

    events.push({
      time: 178,
      id: 'tractor-on',
      action: () => this.audio.sfx('tractorBeam', { gain: 0.75 }),
    });
    events.push({
      time: 196,
      id: 'clamps',
      action: () => {
        this.audio.sfx('metalStress', { gain: 0.9 });
        stage.fx.addShake(0.8);
      },
    });

    // ---------------------------------------------------- interior combat
    for (const order of this.fireOrders) {
      events.push({
        time: order.time,
        id: `shot:${order.shooter}:${order.time.toFixed(2)}`,
        action: () => {
          const shooter = stage.characters.find((c) => c.id === order.shooter);
          if (!shooter) return;
          const muzzles = (shooter as unknown as { muzzles?: THREE.Object3D[] }).muzzles;
          if (!muzzles || muzzles.length === 0) return;
          muzzles[0].getWorldPosition(_muzzle);
          const target = ip(order.target[0], order.target[1], order.target[2], new THREE.Vector3());
          this.audio.sfx(order.color === 'red' ? 'blasterRed' : 'blasterBlue', {
            position: _muzzle.clone(),
            gain: 0.55,
          });
          fx.blasterBolt(_muzzle.clone(), target, order.color, (p) => {
            fx.interiorImpact(p, 1);
            this.audio.sfx('spark', { position: p.clone(), gain: 0.35 });
            fx.addShake(0.06);
          });
        },
      });
    }

    // Door cutting and breach.
    events.push({
      time: 224,
      id: 'door-cut',
      action: () => this.audio.sfx('doorCut', { gain: 0.8 }),
    });
    events.push({
      time: BREACH_TIME,
      id: 'door-breach',
      action: () => {
        const center = ip(0, 1.35, -14.6, new THREE.Vector3());
        stage.fx.doorBreach(center, new THREE.Vector3(0, 0.12, 1));
        this.audio.sfx('doorBreach', { gain: 1 });
        this.audio.sfx('lowBoom', { gain: 0.85 });
      },
    });

    // Character reaction sounds.
    events.push({ time: VADER_ENTRY - 2.2, id: 'vader-boom', action: () => this.audio.sfx('lowBoom', { gain: 0.7 }) });
    events.push({ time: 303.5, id: 'holo-on', action: () => this.audio.sfx('hologramOn', { gain: 0.8 }) });
    events.push({ time: 313, id: 'transfer', action: () => this.audio.sfx('dataTransfer', { gain: 0.75 }) });
    events.push({ time: 322.5, id: 'r2-chirp-1', action: () => this.audio.sfx('droidChirp', { gain: 0.8 }) });
    events.push({ time: 335.5, id: 'r2-chirp-2', action: () => this.audio.sfx('droidChirp', { gain: 0.7 }) });
    events.push({ time: 340.5, id: '3po-worried', action: () => this.audio.sfx('droidWorried', { gain: 0.7 }) });
    events.push({ time: 348.5, id: 'pod-clamps', action: () => this.audio.sfx('clampRelease', { gain: 0.9 }) });
    events.push({
      time: POD_LAUNCH,
      id: 'pod-launch',
      action: () => {
        this.audio.sfx('podLaunch', { gain: 1 });
        stage.fx.addShake(1.1);
        this.podLaunched = true;
        stage.runner.setPodLaunched(true);
      },
    });
    events.push({
      time: 374,
      id: 'entry',
      action: () => this.audio.sfx('atmosphere', { gain: 0.8 }),
    });

    return events;
  }

  /* --------------------------------------------------------------- seek */

  private handleSeek(): void {
    const t = this.timeline.currentTime;
    this.stage.fx.reset();
    this.audio.resetTransients();
    this.audio.stopNarration();
    this.director.reset();
    this.podLaunched = t >= POD_LAUNCH;
    this.stage.runner.setPodLaunched(this.podLaunched);
    // Re-establish the mood for the section we landed in.
    const mood = moodAt(t);
    this.audio.music(mood[0], mood[1]);
    this.applyContinuous(t, 1 / 60);
  }

  /* ------------------------------------------------------------- update */

  update(dt: number): void {
    this.timeline.update(dt);
    const t = this.timeline.currentTime;
    this.applyContinuous(t, dt);
    this.lastTime = t;
  }

  get time(): number {
    return this.timeline.currentTime;
  }

  /** Everything that must be identical whether played or scrubbed to. */
  applyContinuous(t: number, dt: number): void {
    const stage = this.stage;
    const interior = t >= 210 && t < 352;
    stage.setSpaceVisible(!interior);
    stage.setInteriorVisible(interior || (t >= 205 && t < 212));
    stage.setEnvironment(interior ? 'interior' : 'space');
    // The distant matte must go too, or the breached doorway looks out onto a
    // starfield instead of into the boarding tube.
    stage.background.visible = !interior;

    this.updateShips(t, dt);
    this.updateCharacters(t, dt);
    this.updateInteriorState(t, dt);
    this.updatePod(t, dt);
    stage.prologue.update(t);
    stage.update(t, dt);

    // Camera.
    stage.fx.shake.amplitude = stage.fx.shake.amplitude;
    this.director.shakeAmplitude = stage.fx.shake.amplitude;
    this.director.update(this.render.camera, t, dt);
    // The title text rides in front of whatever camera is live.
    stage.prologue.root.position.copy(this.render.camera.position);
    stage.prologue.root.quaternion.copy(this.render.camera.quaternion);

    this.updatePost(t, dt);
    this.updateLoops(t);
  }

  private updateShips(t: number, dt: number): void {
    const stage = this.stage;
    runnerState(t, this.runnerMotion);
    destroyerState(t, this.destroyerMotion);

    stage.runner.root.position.copy(this.runnerMotion.position);
    faceAlong(stage.runner.root, this.runnerMotion.velocity, this.runnerMotion.bank, 1);
    // Once she is disabled the corvette drifts slightly nose-high.
    const dead = smoothstep(152, 176, t);
    stage.runner.root.rotateX(dead * 0.045 * Math.sin(t * 0.21));
    stage.runner.root.rotateZ(dead * 0.06 * Math.sin(t * 0.17 + 1.1));
    stage.runner.enginePower = 1 - smoothstep(150, 160, t);
    stage.runner.damage = smoothstep(146, 162, t);
    stage.runner.root.visible = t > 76;

    stage.destroyer.root.position.copy(this.destroyerMotion.position);
    faceAlong(stage.destroyer.root, this.destroyerMotion.velocity, this.destroyerMotion.bank * 0.2, 1);
    stage.destroyer.enginePower = 1;
    stage.destroyer.root.visible = t > 84;

    // Turrets track the corvette while the guns are hot.
    if (t > 104 && t < 168) {
      stage.destroyer.aimTurretsAt(stage.runner.root.position, dt, Math.abs(t - this.lastTime) > 0.5);
    } else if (t >= 168) {
      _v.copy(stage.runner.root.position).add(new THREE.Vector3(0, 60, -300));
      stage.destroyer.aimTurretsAt(_v, dt, true);
    }

    // Tractor beam.
    const tractor = smoothstep(176, 186, t) * (1 - smoothstep(340, 352, t));
    stage.destroyer.tractorBeam = tractor;
    if (tractor > 0.01) stage.destroyer.aimTractor(stage.runner.root.position);

    // Venting hull damage after the drive dies.
    if (t > 152 && t < 240 && stage.space.visible) {
      const ventA = stage.runner.anchors.damageA.getWorldPosition(_v);
      stage.fx.hullVent(ventA, _v2.set(0.4, 1, 0.2).normalize(), 0.5);
      if (t > 158) {
        const ventB = stage.runner.anchors.damageC.getWorldPosition(_v);
        stage.fx.hullVent(ventB, _v2.set(0, -1, 0.3).normalize(), 0.35);
      }
    }
  }

  private updateCharacters(t: number, dt: number): void {
    const stage = this.stage;
    for (const c of stage.characters) c.update(t, dt);

    // Weapons point at plausible targets rather than straight ahead.
    const doorPoint = ip(0, 1.25, -14.6, _v);
    for (const rebel of stage.rebels) {
      const s = rebel.state;
      if (s === 'aim' || s === 'fire') aimAt(rebel, doorPoint, dt);
      rebel.lookAtTarget = s === 'down' || s === 'fall' ? null : doorPoint;
    }
    const aftPoint = ip(0, 1.25, 4, _v2);
    for (const trooper of stage.troopers) {
      const s = trooper.state;
      if (s === 'aim' || s === 'fire') aimAt(trooper, aftPoint, dt);
    }

    // Vader looks down the corridor; the troopers look at him when he passes.
    // Look-at targets are consumed in world space, so lift the set-local
    // character transforms out of the interior root first.
    if (t > VADER_ENTRY) {
      const vaderHead = worldOf(stage.vader.root.position, 0, 1.7, 0);
      for (const trooper of stage.troopers) {
        if (trooper.root.position.distanceTo(stage.vader.root.position) < 5)
          trooper.lookAtTarget = vaderHead;
      }
    }
    stage.vader.saberActive = 0;

    // Droid attention.
    stage.r2.domeTarget =
      t < 300 ? 0.5 : t < 322 ? -0.7 : t < 336 ? 0.2 : t < 344 ? -1.2 : 0;
    stage.r2.projecting = smoothstep(311, 314, t) * (1 - smoothstep(320, 323, t));
    stage.leia.lookAtTarget =
      t > 296 && t < 319
        ? ip(-3.4, 1.7, 18.5, new THREE.Vector3())
        : t >= 319 && t < 332
          ? worldOf(stage.r2.root.position, 0, 0.85, 0)
          : t >= 344
            ? ip(0, 1.5, 0, new THREE.Vector3())
            : null;
    stage.threepio.lookAtTarget =
      t < 330
        ? worldOf(stage.leia.root.position, 0, 1.3, 0)
        : worldOf(stage.r2.root.position, 0, 0.8, 0);

    // The droids disappear into the pod once they board.
    const boarded = t > 350.4;
    stage.r2.root.visible = !boarded;
    stage.threepio.root.visible = !boarded;
  }

  private updateInteriorState(t: number, dt: number): void {
    const stage = this.stage;
    const corridor = stage.corridor;

    corridor.alertLevel = smoothstep(196, 206, t) * (1 - smoothstep(398, 404, t));
    // Cutting torch -> burst -> aftermath, mapped onto the door's 0..1 input.
    const cut = smoothstep(222, BREACH_TIME - 0.4, t) * 0.54;
    const burst = smoothstep(BREACH_TIME - 0.05, BREACH_TIME + 0.55, t) * 0.46;
    corridor.breachProgress = clamp(cut + burst, 0, 1);

    const presence = smoothstep(VADER_ENTRY - 4, VADER_ENTRY + 4, t) * (1 - smoothstep(350, 362, t));
    corridor.vaderPresence = presence;
    stage.vaderKey.intensity = presence * 9;
    stage.vaderKey.position.copy(stage.vader.root.position).add(new THREE.Vector3(0, 2.2, 1.4));

    stage.boardingGlow.intensity =
      smoothstep(222, BREACH_TIME, t) * 5 * (1 - smoothstep(BREACH_TIME + 12, BREACH_TIME + 26, t)) +
      smoothstep(BREACH_TIME, BREACH_TIME + 1, t) * 6 * (1 - smoothstep(BREACH_TIME + 20, 300, t));

    corridor.podBayDoor.open = smoothstep(340, 343, t) * (1 - smoothstep(350, 351.4, t));
    corridor.vestibuleDoor.open = smoothstep(286, 288.6, t) * (1 - smoothstep(291, 293, t));

    stage.plans.intensity = smoothstep(302.6, 305.5, t) * (1 - smoothstep(319, 322, t));
    stage.plans.transfer = smoothstep(312, 320, t);
    // Visible data stream into the droid's dome; this is the plot point, so it
    // has to read in a single frame.
    const downlink = smoothstep(311.5, 313.5, t) * (1 - smoothstep(319.5, 321.5, t));
    if (downlink > 0.01) {
      stage.r2.root.getWorldPosition(_v);
      _v.y += 0.92;
      stage.plans.aimDownlink(_v, downlink);
    } else {
      stage.plans.aimDownlink(_v.set(0, 0, 0), 0);
    }

    // Persistent damage: smoke near the ruined door, sparks from a torn conduit.
    if (stage.interior.visible) {
      if (t > BREACH_TIME && t < 356) {
        stage.fx.emitSmoke(ip(0.4, 0.3, -14.2, _v), 7, dt);
        stage.fx.emitSmoke(ip(-0.8, 0.2, -12.4, _v), 4, dt);
      }
      if (t > 206) {
        stage.fx.emitSparkShower(ip(1.42, 2.42, -9.4, _v), 0.55, dt);
        stage.fx.emitSparkShower(ip(-1.44, 2.5, 2.6, _v), 0.35, dt);
      }
      if (t > 300 && t < 356) stage.fx.emitSmoke(ip(-1.2, 0.25, 6.5, _v), 2.2, dt);
    }

    stage.interiorPod.clampRelease = smoothstep(348.4, 350.2, t);
    stage.interiorPod.thrust = 0;
    stage.interiorPod.root.visible = t < 351.2;
  }

  private updatePod(t: number, dt: number): void {
    void dt;
    const stage = this.stage;
    const pod = stage.exteriorPod;
    const visible = t >= POD_LAUNCH - 0.6;
    pod.root.visible = visible;
    if (!visible) return;

    podOffset(t, _v);
    stage.runner.root.localToWorld(_v);
    pod.root.position.copy(_v);

    podOffset(t + 0.12, _v2);
    stage.runner.root.localToWorld(_v2);
    _v2.sub(pod.root.position);
    if (_v2.lengthSq() > 1e-6) faceAlong(pod.root, _v2.normalize(), 0, 1);

    pod.thrust = smoothstep(POD_LAUNCH + 1.9, POD_LAUNCH + 3.4, t) * (1 - smoothstep(390, 400, t));
    pod.clampRelease = 1;
    pod.entryHeat = podHeat(t);
    pod.cameraDistance = this.render.camera.position.distanceTo(pod.root.position);
  }

  private updatePost(t: number, dt: number): void {
    const post = this.render.post.settings;
    const pose = this.director.pose;
    const fade = fadeAt(t);
    post.fadeAmount = fade.amount;
    post.fadeColor.copy(fade.color);

    const interior = t >= 210 && t < 352;
    const targetExposure = interior ? 1.06 : 1.0;
    post.exposure = damp(post.exposure, targetExposure, 3, dt);
    post.bloomStrength = damp(post.bloomStrength, interior ? 0.5 : 0.68, 3, dt);
    post.bloomThreshold = interior ? 0.92 : 0.8;
    post.vignette = interior ? 0.42 : 0.34;
    post.saturation = interior ? 0.98 : 1.06;
    post.dofStrength = damp(post.dofStrength, pose.dof, 4, dt);
    post.dofFocus = damp(post.dofFocus, pose.focus, 5, dt);
    post.dofRange = damp(post.dofRange, pose.focusRange, 5, dt);
    // The prologue sits in pure darkness; lift the floor slightly afterwards.
    post.lift = t < 42 ? 0 : 0.004;
    this.render.bgParallax = t < 42 ? 0 : 0.015;
  }

  private updateLoops(t: number): void {
    const stage = this.stage;
    const a = this.audio;
    const camera = this.render.camera;

    const runnerDist = camera.position.distanceTo(stage.runner.root.position);
    const destroyerDist = camera.position.distanceTo(stage.destroyer.root.position);
    const inSpace = stage.space.visible;

    const runnerEngine = inSpace
      ? clamp(1 - runnerDist / 1400, 0, 1) * stage.runner.enginePower * 0.9
      : 0;
    const destroyerRumble = inSpace ? clamp(1 - destroyerDist / 4200, 0, 1) * 0.85 : 0.18;
    a.loop('runnerEngine', runnerEngine);
    a.loop('destroyerRumble', destroyerRumble);

    const interior = stage.interior.visible;
    a.loop('corridorTone', interior ? 0.5 : 0);
    a.loop('alarmLoop', interior ? stage.corridor.alertLevel * 0.42 : 0);
    a.loop('fire', interior && t > BREACH_TIME && t < 356 ? 0.32 : 0);
    a.loop(
      'respirator',
      interior ? smoothstep(VADER_ENTRY - 1, VADER_ENTRY + 3, t) * (1 - smoothstep(348, 358, t)) * 0.6 : 0,
    );
    const podActive = t > POD_LAUNCH && t < 396;
    a.loop('podEngine', podActive && !interior ? stage.exteriorPod.thrust * 0.5 : 0);
    a.loop('entryRumble', clamp(podHeat(t), 0, 1) * 0.75);
  }

  /* ----------------------------------------------------------- helpers */

  /** Used by the QA harness and the debug overlay. */
  describe(): {
    time: number;
    chapter: string;
    shot: string;
    beat: string;
  } {
    const t = this.timeline.currentTime;
    return {
      time: t,
      chapter: this.timeline.chapter.title,
      shot: this.director.currentShotLabel,
      beat: beatAt(t),
    };
  }
}

/** Music mood in effect at an arbitrary time (used after a scrub). */
export function moodAt(t: number): [Parameters<AudioBus['music']>[0], number] {
  if (t < 20) return ['void', 0.4];
  if (t < 42) return ['wonder', 0.7];
  if (t < 78) return ['wonder', 0.45];
  if (t < 113) return ['chase', 0.95];
  if (t < 163) return ['battle', 0.95];
  if (t < 210) return ['capture', 0.7];
  if (t < BREACH_TIME) return ['siege', 0.55];
  if (t < BREACH_TIME + 26) return ['battle', 1];
  if (t < VADER_ENTRY - 1.5) return ['siege', 0.45];
  if (t < 288) return ['menace', 0.9];
  if (t < 324) return ['tender', 0.7];
  if (t < 366) return ['resolve', 0.9];
  return ['hope', 0.8];
}

/** Human-readable narrative beat, shown in the debug overlay. */
export function beatAt(t: number): string {
  if (t < 3) return 'darkness';
  if (t < 36) return 'prologue text';
  if (t < 42) return 'title card';
  if (t < 62) return 'planet establishing';
  if (t < 78) return 'bright limb, silence';
  if (t < 89) return 'corvette enters';
  if (t < 113) return 'destroyer reveal';
  if (t < 131) return 'battle profile';
  if (t < 148) return 'chase and near misses';
  if (t < 163) return 'shields fail';
  if (t < 176) return 'drive dead';
  if (t < 192) return 'tractor beam';
  if (t < 204) return 'held beneath the wedge';
  if (t < 210) return 'push to the hull';
  if (t < 223) return 'defenders take positions';
  if (t < BREACH_TIME) return 'cutting the door';
  if (t < BREACH_TIME + 7) return 'breach';
  if (t < BREACH_TIME + 26) return 'firefight';
  if (t < VADER_ENTRY) return 'aftermath';
  if (t < 288) return 'the dark lord';
  if (t < 297) return 'princess moves aft';
  if (t < 312) return 'plans projected';
  if (t < 324) return 'data transfer';
  if (t < 332) return 'boarders push aft';
  if (t < 343) return 'droids run for the pod';
  if (t < POD_LAUNCH) return 'boarding the pod';
  if (t < 362) return 'pod away';
  if (t < 374) return 'falling clear';
  if (t < 382) return 'atmospheric entry';
  if (t < 395) return 'the ships remain';
  return 'closing card';
}

export { INTERIOR_ORIGIN, lerp };
