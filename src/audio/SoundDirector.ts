import * as THREE from 'three';
import type { AudioEngine } from './AudioEngine';
import { SfxLibrary } from './Sfx';
import { MusicEngine } from './Music';
import type { NarrationPlayer } from './Narration';
import type { SpaceScene } from '../scenes/SpaceScene';
import { BREACH_TIME, type CorridorScene } from '../scenes/CorridorScene';
import { smoothstep } from '../core/mathx';

/**
 * Sound direction.
 *
 * Owns the relationship between the master clock and everything audible:
 * which beds are running, which one-shots have already fired, and how loud the
 * score sits under the narrator. One-shot bookkeeping is a simple monotonic
 * cursor plus a "fired" guard, which is what stops a timeline scrub from
 * replaying a hundred turbolasers at once.
 */

interface OneShot {
  time: number;
  play: (position: THREE.Vector3 | undefined, scale: number) => void;
  position?: THREE.Vector3;
  /** Chase-frame local position, converted to world at fire time. */
  chaseLocal?: THREE.Vector3;
  scale: number;
  /** Interior sounds are skipped while the exterior is on screen and vice versa. */
  interior?: boolean;
}

export class SoundDirector {
  readonly sfx: SfxLibrary;
  readonly music: MusicEngine;
  private engine: AudioEngine;
  private narration: NarrationPlayer;
  private space: SpaceScene;
  private interior: CorridorScene;
  private oneShots: OneShot[] = [];
  private cursor = 0;
  private lastTime = -1;
  private listenerPos = new THREE.Vector3();
  private worldTmp = new THREE.Vector3();
  private started = false;

  constructor(
    engine: AudioEngine,
    narration: NarrationPlayer,
    space: SpaceScene,
    interior: CorridorScene,
  ) {
    this.engine = engine;
    this.narration = narration;
    this.space = space;
    this.interior = interior;
    this.sfx = new SfxLibrary(engine);
    this.music = new MusicEngine(engine);
    this.buildOneShots();
  }

  /** Called once, after the audio context has been unlocked by a gesture. */
  start(): void {
    if (this.started) return;
    this.started = true;
    this.sfx.ensureCapitalRumble();
    this.sfx.ensureRunnerEngine();
    this.sfx.ensureAlarm();
    this.sfx.ensureRespirator();
    this.sfx.ensureReentry();
  }

  private buildOneShots(): void {
    const script = this.space.script;

    // Turbolaser and rebel muzzle reports.
    for (const cue of script.fireCues) {
      const turbo = cue.kind === 'turbolaser';
      this.oneShots.push({
        time: cue.time,
        chaseLocal: cue.position.clone(),
        scale: 180,
        play: (position, scale) => {
          if (turbo) this.sfx.turbolaser({ position, spatialScale: scale, gain: 0.85, space: 'space' });
          else this.sfx.blaster(false, { position, spatialScale: scale, gain: 0.5, space: 'space' });
        },
      });
    }

    // Hull impacts and shield absorption.
    for (const cue of script.impactCues) {
      this.oneShots.push({
        time: cue.time,
        chaseLocal: cue.position.clone(),
        scale: 140,
        play: (position, scale) => {
          if (cue.shielded) {
            this.sfx.shieldFlash(cue.strength, { position, spatialScale: scale, gain: 0.8, space: 'space' });
          } else {
            this.sfx.hullImpact(cue.strength, { position, spatialScale: scale, gain: 0.9, space: 'space' });
            this.sfx.sparks({ position, spatialScale: scale, gain: 0.5, space: 'space' });
          }
        },
      });
    }

    // Docking: clamps at 178, umbilical seal at 189.
    this.oneShots.push({
      time: 177.5, chaseLocal: new THREE.Vector3(0, 12, -6), scale: 40,
      play: (position, scale) => this.sfx.clampRelease({ position, spatialScale: scale, gain: 0.9, space: 'space' }),
    });
    this.oneShots.push({
      time: 189.2, chaseLocal: new THREE.Vector3(0, 12, -6), scale: 40,
      play: (position, scale) => {
        this.sfx.hullImpact(0.75, { position, spatialScale: scale, gain: 0.7, space: 'space' });
        this.sfx.clampRelease({ position, spatialScale: scale, gain: 0.7, space: 'space', delay: 0.4 });
      },
    });

    // --- Interior -----------------------------------------------------------
    this.oneShots.push({
      time: BREACH_TIME, interior: true, position: new THREE.Vector3(0, 1.4, -7), scale: 1,
      play: (position, scale) => this.sfx.doorBreach({ position, spatialScale: scale, gain: 1, space: 'room' }),
    });

    for (const plan of this.interior.boltAudioPlans) {
      this.oneShots.push({
        time: plan.t0, interior: true, position: plan.from.clone(), scale: 1,
        play: (position, scale) => this.sfx.blaster(plan.imperial, {
          position, spatialScale: scale, gain: plan.imperial ? 0.55 : 0.5, space: 'room',
        }),
      });
    }

    // Electrical arcing after the breach.
    for (let i = 0; i < 22; i++) {
      const t = BREACH_TIME + 2 + i * 2.1;
      this.oneShots.push({
        time: t, interior: true, position: new THREE.Vector3(-1.6, 1.3, 4), scale: 1,
        play: (position, scale) => this.sfx.sparks({ position, spatialScale: scale, gain: 0.4, space: 'room' }),
      });
    }

    // Boots: stormtrooper advance and Vader's measured walk.
    for (let i = 0; i < 46; i++) {
      const t = BREACH_TIME + 1.0 + i * 0.34;
      this.oneShots.push({
        time: t, interior: true, position: new THREE.Vector3(0, 0.1, -4 + i * 0.12), scale: 1,
        play: (position, scale) => this.sfx.footstep(true, { position, spatialScale: scale, gain: 0.34, space: 'room' }),
      });
    }
    for (let i = 0; i < 30; i++) {
      const t = 241.4 + i * 0.72;
      this.oneShots.push({
        time: t, interior: true, position: new THREE.Vector3(0, 0.1, -6 + i * 0.45), scale: 1,
        play: (position, scale) => this.sfx.footstep(true, { position, spatialScale: scale, gain: 0.5, space: 'room' }),
      });
    }

    // Droid vocalisations and servos.
    const chirps: Array<[number, 'calm' | 'urgent' | 'query']> = [
      [266.5, 'query'], [277.5, 'calm'], [288.4, 'query'], [292.5, 'calm'],
      [299.8, 'urgent'], [304.5, 'urgent'], [309.6, 'query'], [313.2, 'urgent'], [317.6, 'urgent'],
    ];
    for (const [t, mood] of chirps) {
      this.oneShots.push({
        time: t, interior: true, position: new THREE.Vector3(-1.5, 0.7, 25.5), scale: 1,
        play: (position, scale) => this.sfx.droidChirp(mood, { position, spatialScale: scale, gain: 0.7, space: 'room' }),
      });
    }
    for (let i = 0; i < 26; i++) {
      const t = 303 + i * 0.62;
      this.oneShots.push({
        time: t, interior: true, position: new THREE.Vector3(-0.7, 0.4, 30 + i * 0.7), scale: 1,
        play: (position, scale) => this.sfx.droidServo({ position, spatialScale: scale, gain: 0.4, space: 'room' }),
      });
    }

    // Console work and the data transfer.
    for (let i = 0; i < 18; i++) {
      this.oneShots.push({
        time: 272 + i * 0.55, interior: true, position: new THREE.Vector3(-3.0, 1.3, 26.5), scale: 1,
        play: (position, scale) => this.sfx.dataBlip(i, { position, spatialScale: scale, gain: 0.55, space: 'room' }),
      });
    }
    for (let i = 0; i < 22; i++) {
      this.oneShots.push({
        time: 288.5 + i * 0.48, interior: true, position: new THREE.Vector3(-2.0, 1.1, 25.8), scale: 1,
        play: (position, scale) => this.sfx.dataBlip(i + 2, { position, spatialScale: scale, gain: 0.45, space: 'room' }),
      });
    }

    // Escape pod: clamps, then launch.
    this.oneShots.push({
      time: 318.8, chaseLocal: new THREE.Vector3(-10, -4, -34), scale: 22,
      play: (position, scale) => this.sfx.clampRelease({ position, spatialScale: scale, gain: 1, space: 'space' }),
    });
    this.oneShots.push({
      time: 320.2, chaseLocal: new THREE.Vector3(-12, -6, -36), scale: 22,
      play: (position, scale) => this.sfx.podLaunch({ position, spatialScale: scale, gain: 1, space: 'space' }),
    });

    this.oneShots.sort((a, b) => a.time - b.time);
  }

  /** Re-arm after a seek so nothing that already "happened" fires again. */
  reset(time: number): void {
    this.cursor = 0;
    while (this.cursor < this.oneShots.length && this.oneShots[this.cursor].time < time) this.cursor++;
    this.lastTime = time;
    this.music.reset();
    this.narration.stop();
  }

  update(t: number, dt: number, playing: boolean, cameraPos: THREE.Vector3, interiorActive: boolean): void {
    this.listenerPos.copy(cameraPos);
    this.sfx.setListenerPosition(cameraPos);

    if (this.lastTime < 0) this.reset(t);
    // A jump of more than half a second is a scrub, not playback.
    if (Math.abs(t - this.lastTime) > 0.5) this.reset(t);

    if (playing && this.started) {
      let fired = 0;
      while (this.cursor < this.oneShots.length && this.oneShots[this.cursor].time <= t) {
        const shot = this.oneShots[this.cursor];
        this.cursor++;
        // Never fire more than a handful in a single frame - protects the mix
        // and the CPU if the tab was throttled.
        if (fired >= 6) continue;
        if (shot.time < t - 0.6) continue;
        if (!!shot.interior !== interiorActive) continue;
        let pos: THREE.Vector3 | undefined;
        if (shot.chaseLocal) {
          pos = this.worldTmp.copy(shot.chaseLocal);
          this.space.chase.localToWorld(pos);
          pos = pos.clone();
        } else if (shot.position) {
          pos = shot.position;
        }
        shot.play(pos, shot.scale);
        fired++;
      }
    }

    this.updateBeds(t, interiorActive, playing);
    this.music.setIntensity(interiorActive ? this.interior.intensityAt(t) : this.space.intensityAt(t));
    this.music.update(t, playing);
    this.narration.update(t, playing);

    // Duck the score under narration so the words always win.
    const speaking = this.narration.cueAt(t) ? 1 : 0;
    const duckTarget = speaking ? 0.55 : 1;
    this.engine.buses.music.gain.setTargetAtTime(
      this.engine.getLevels().music * duckTarget,
      this.engine.now,
      0.35,
    );

    this.lastTime = t;
    void dt;
  }

  private updateBeds(t: number, interiorActive: boolean, playing: boolean): void {
    if (!this.started) return;
    const gate = playing ? 1 : 0.35;

    // Destroyer rumble: rises as it closes, dominant once alongside.
    const destroyerProximity = smoothstep(88, 122, t) * (1 - smoothstep(352, 372, t) * 0.6);
    this.sfx.setBedLevel('destroyer', (interiorActive ? 0.24 : 0.62) * destroyerProximity * gate, 0.6);
    if (!interiorActive) {
      const p = this.space.destroyerPivot.getWorldPosition(new THREE.Vector3());
      this.sfx.setBedPosition('destroyer', p, 220);
    }

    // Corvette drive: loud during the run, silent once the engines are gone.
    const runnerLevel = (1 - smoothstep(150, 162, t)) * (1 - smoothstep(0, 40, -t));
    this.sfx.setBedLevel('runner', (interiorActive ? 0.16 : 0.42) * runnerLevel * gate, 0.4);
    if (!interiorActive) {
      const p = this.space.runnerPivot.getWorldPosition(new THREE.Vector3());
      this.sfx.setBedPosition('runner', p, 90);
    }

    // Corridor alarm.
    const alarm = interiorActive
      ? smoothstep(196, 200, t) * (1 - smoothstep(300, 308, t) * 0.7)
      : 0;
    this.sfx.setBedLevel('alarm', 0.16 * alarm * gate, 0.5);

    // Respirator: audible only while he is in the corridor and near camera.
    const respirator = interiorActive
      ? smoothstep(240, 246, t) * (1 - smoothstep(260, 266, t))
      : 0;
    this.sfx.setBedLevel('respirator', 0.5 * respirator * gate, 0.4);

    // Atmospheric entry.
    const reentry = !interiorActive ? smoothstep(344, 366, t) : 0;
    this.sfx.setBedLevel('reentry', 0.5 * reentry * gate, 0.7);
  }
}
