import * as THREE from 'three';
import type { EngineContext, System } from '../core/System';
import { Signals } from '../core/Signals';
import type { PlayerSystem } from '../player/Player';
import type { AISystem } from '../ai/AISystem';

interface Shake {
  amplitude: number;
  duration: number;
  elapsed: number;
  frequency: number;
  seed: number;
}

/**
 * Mission state, camera shake, and the moment-to-moment feedback layer.
 *
 * Camera shake lives here rather than in the player so that every source —
 * gunfire, explosions, landings, jet flybys — goes through one budget and one
 * decay curve. Multiple uncoordinated shake sources are the fastest way to
 * make a camera feel broken rather than impactful.
 */
export class GameFlowSystem implements System {
  readonly name = 'gameflow';
  readonly order = 99;

  private ctx!: EngineContext;
  private player!: PlayerSystem;
  private ai!: AISystem;

  private readonly shakes: Shake[] = [];
  private respawnTimer = -1;
  private elapsed = 0;

  private readonly offset = new THREE.Vector3();
  private readonly rotOffset = new THREE.Euler(0, 0, 0, 'YXZ');

  init(ctx: EngineContext): void {
    this.ctx = ctx;
    this.player = ctx.get<PlayerSystem>('player')!;
    this.ai = ctx.get<AISystem>('ai')!;

    Signals.on('camera:shake', ({ amplitude, duration, frequency }) => {
      // Cap the number of concurrent shakes; beyond a handful they just sum
      // into noise and the individual events stop reading.
      if (this.shakes.length > 8) this.shakes.shift();
      this.shakes.push({
        amplitude,
        duration,
        elapsed: 0,
        frequency: frequency ?? 26,
        seed: Math.random() * 1000,
      });
    });

    Signals.on('player:died', () => {
      this.respawnTimer = 3.2;
      Signals.emit('audio:music', { cue: 'defeat' });
      this.ctx.engine.pipeline.autoExposure = false;
      this.ctx.engine.pipeline.exposureTarget = 0.6;
    });

    Signals.on('actor:killed', ({ headshot }) => {
      // A very brief time dilation on a headshot. Short enough that it reads
      // as impact rather than slow motion.
      if (headshot) {
        this.ctx.time.scale = 0.72;
        window.setTimeout(() => { this.ctx.time.scale = 1; }, 90);
      }
    });
  }

  update(dt: number, ctx: EngineContext): void {
    this.elapsed += dt;

    // ---- respawn ----
    if (this.respawnTimer > 0) {
      this.respawnTimer -= ctx.time.rawDt;
      if (this.respawnTimer <= 0) {
        this.respawnTimer = -1;
        Signals.emit('player:respawn', {});
        Signals.emit('audio:music', { cue: 'combat' });
        ctx.engine.pipeline.autoExposure = true;
        ctx.engine.pipeline.resetExposure(1);
      }
    }

    // ---- adaptive exposure target from scene luminance proxy ----
    // A true histogram readback would stall the pipeline; instead the target
    // is driven by what the player is looking at: sky vs. shaded interior.
    const pitchUp = THREE.MathUtils.clamp(this.player.pitch / (Math.PI / 3), -1, 1);
    const skyBias = THREE.MathUtils.clamp(pitchUp, 0, 1);
    const pipeline = ctx.engine.pipeline;
    if (pipeline.autoExposure) {
      pipeline.exposureTarget = THREE.MathUtils.lerp(1.18, 0.72, skyBias);
    }

    // ---- music intensity ----
    // Driven by the AI director so the score follows the actual fight.
    if (this.ai.intensity > 0.55) Signals.emit('audio:music', { cue: 'danger' });
    else if (this.ai.intensity > 0.15) Signals.emit('audio:music', { cue: 'combat' });
  }

  lateUpdate(dt: number, ctx: EngineContext): void {
    // ---- camera shake ----
    this.offset.setScalar(0);
    this.rotOffset.set(0, 0, 0);

    for (let i = this.shakes.length - 1; i >= 0; i--) {
      const s = this.shakes[i];
      s.elapsed += dt;
      if (s.elapsed >= s.duration) {
        this.shakes.splice(i, 1);
        continue;
      }
      const t = s.elapsed / s.duration;
      // Exponential decay with a smooth tail; a linear fade leaves a visible
      // step when the shake ends.
      const envelope = Math.pow(1 - t, 2.2);
      const a = s.amplitude * envelope;
      const f = s.frequency;
      const p = s.elapsed * f;

      // Three decorrelated frequencies per axis keeps the motion from
      // reading as a sine wave.
      this.offset.x += Math.sin(p * 1.0 + s.seed) * a * 0.6;
      this.offset.y += Math.sin(p * 1.37 + s.seed * 1.7) * a * 0.6;
      this.offset.z += Math.sin(p * 0.81 + s.seed * 2.3) * a * 0.3;

      this.rotOffset.x += Math.sin(p * 1.11 + s.seed * 3.1) * a * 1.4;
      this.rotOffset.y += Math.sin(p * 0.93 + s.seed * 4.7) * a * 1.4;
      this.rotOffset.z += Math.sin(p * 1.29 + s.seed * 5.3) * a * 2.2;
    }

    if (this.shakes.length > 0) {
      ctx.camera.position.add(this.offset);
      ctx.camera.rotation.x += this.rotOffset.x;
      ctx.camera.rotation.y += this.rotOffset.y;
      ctx.camera.rotation.z += this.rotOffset.z;
      // The view model inherits shake at reduced amplitude, which reads as
      // the shooter absorbing the motion through their arms.
      ctx.viewCamera.position.copy(ctx.camera.position);
      ctx.viewCamera.quaternion.copy(ctx.camera.quaternion);
    }

    // ---- death camera ----
    if (!this.player.alive) {
      // Slump toward the ground and roll, rather than cutting to black.
      const t = THREE.MathUtils.clamp(1 - this.respawnTimer / 3.2, 0, 1);
      const e = t * t * (3 - 2 * t);
      ctx.camera.position.y = THREE.MathUtils.lerp(
        ctx.camera.position.y, this.player.position.y + 0.32, e * 0.6,
      );
      ctx.camera.rotation.z += e * 0.55;
      ctx.camera.rotation.x = THREE.MathUtils.lerp(ctx.camera.rotation.x, -0.25, e * 0.5);
    }

    void this.elapsed;
  }
}
