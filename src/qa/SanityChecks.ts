import * as THREE from 'three';
import { isFiniteObject } from '../core/mathx';
import type { SpaceScene } from '../scenes/SpaceScene';
import { CORRIDOR_HEIGHT } from '../assets/interior/CorridorKit';
import type { CorridorScene } from '../scenes/CorridorScene';
import type { CameraDirector } from '../camera/CameraDirector';
import type { NarrationPlayer } from '../audio/Narration';
import { CHAPTER_IDS, CHAPTER_TIMES } from '../timeline/stage';

export interface SanityIssue {
  code: string;
  severity: 'error' | 'warning';
  message: string;
}

export interface SanityReport {
  time: number;
  issues: SanityIssue[];
}

export interface SanityContext {
  time: number;
  space: SpaceScene;
  interior: CorridorScene;
  director: CameraDirector;
  narration: NarrationPlayer;
  renderer: THREE.WebGLRenderer;
  fps: number;
  interiorActive: boolean;
}

/**
 * Runtime sanity checks.
 *
 * These run every few frames while the debug overlay is open and are also
 * driven exhaustively by the automated visual tour. They are deliberately loud:
 * anything that fires here is a real defect, not a style opinion.
 */
export class SanityChecker {
  private glErrorCount = 0;
  private consoleErrors: string[] = [];
  private lowFpsFrames = 0;
  /** Guards against a timeline event being processed twice for the same time. */
  private firedEvents = new Map<string, number>();

  recordConsoleError(message: string): void {
    if (this.consoleErrors.length < 40) this.consoleErrors.push(message);
  }

  get consoleErrorCount(): number {
    return this.consoleErrors.length;
  }

  get consoleErrorMessages(): string[] {
    return [...this.consoleErrors];
  }

  /** Returns false if the same event id already fired for this timeline pass. */
  markEvent(id: string, time: number): boolean {
    const previous = this.firedEvents.get(id);
    if (previous !== undefined && Math.abs(previous - time) < 1e-6) return false;
    this.firedEvents.set(id, time);
    return true;
  }

  resetEvents(): void {
    this.firedEvents.clear();
  }

  run(ctx: SanityContext): SanityReport {
    const issues: SanityIssue[] = [];
    const { time, space, interior, director } = ctx;

    // --- NaN transforms -----------------------------------------------------
    const roots: Array<[string, THREE.Object3D]> = [
      ['chase', space.chase],
      ['runner', space.runnerPivot],
      ['destroyer', space.destroyerPivot],
      ['pod', space.podPivot],
      ['camera', director.camera],
      ['interior', interior.root],
    ];
    for (const [name, obj] of roots) {
      if (!isFiniteObject(obj)) {
        issues.push({ code: 'nan-transform', severity: 'error', message: `${name} transform contains NaN/Infinity` });
      }
    }
    for (const c of [...interior.rebels, ...interior.troopers, interior.vader, interior.leia]) {
      if (!isFiniteObject(c.group)) {
        issues.push({ code: 'nan-transform', severity: 'error', message: `${c.name} transform contains NaN` });
      }
    }

    // --- Camera bounds ------------------------------------------------------
    const cam = director.camera.position;
    if (!Number.isFinite(cam.x) || Math.abs(cam.x) > 4_000_000 || Math.abs(cam.y) > 4_000_000 || Math.abs(cam.z) > 4_000_000) {
      issues.push({ code: 'camera-bounds', severity: 'error', message: 'Camera is outside the expected world bounds' });
    }

    // --- Camera inside solid geometry --------------------------------------
    if (ctx.interiorActive) {
      // Corridor space: the camera must stay inside the tube with clearance.
      const halfWidth = Math.abs(cam.z - 26.5) < 4.2 ? 3.4 : Math.abs(cam.z - 47) < 4.6 ? 2.8 : 1.72;
      if (Math.abs(cam.x) > halfWidth - 0.22) {
        issues.push({
          code: 'camera-in-geometry', severity: 'error',
          message: `Camera x=${cam.x.toFixed(2)} is inside a corridor wall (|x| limit ${(halfWidth - 0.22).toFixed(2)})`,
        });
      }
      if (cam.y < 0.22 || cam.y > CORRIDOR_HEIGHT - 0.16) {
        issues.push({
          code: 'camera-in-geometry', severity: 'error',
          message: `Camera y=${cam.y.toFixed(2)} is inside the floor or ceiling`,
        });
      }
      if (cam.z < -16.5 || cam.z > 51.6) {
        issues.push({
          code: 'camera-in-geometry', severity: 'error',
          message: `Camera z=${cam.z.toFixed(2)} is outside the modelled corridor`,
        });
      }
    } else {
      // Exterior: the camera must not be inside either hull.
      const localRunner = space.runnerPivot.worldToLocal(cam.clone());
      if (Math.abs(localRunner.x) < 24 && Math.abs(localRunner.y) < 12 && Math.abs(localRunner.z) < 84) {
        issues.push({ code: 'camera-in-geometry', severity: 'error', message: 'Camera is inside the blockade runner hull' });
      }
      const localDestroyer = space.destroyerPivot.worldToLocal(cam.clone());
      if (Math.abs(localDestroyer.x) < 470 && localDestroyer.y > -95 && localDestroyer.y < 90 && Math.abs(localDestroyer.z) < 790) {
        issues.push({ code: 'camera-in-geometry', severity: 'error', message: 'Camera is inside the destroyer hull' });
      }
    }

    // --- Characters on the floor -------------------------------------------
    for (const c of [...interior.rebels, ...interior.troopers, interior.vader, interior.leia]) {
      const y = c.group.position.y;
      if (y < -0.05 || y > 0.6) {
        issues.push({
          code: 'character-floor', severity: 'error',
          message: `${c.name} root y=${y.toFixed(2)} is not on the deck`,
        });
      }
      // Feet should never sink through the plating.
      const hipY = c.joints.hips.getWorldPosition(new THREE.Vector3()).y;
      if (hipY < 0.25 && c.currentState !== 'down') {
        issues.push({
          code: 'character-floor', severity: 'warning',
          message: `${c.name} hips at ${hipY.toFixed(2)} m - below plausible stance`,
        });
      }
    }
    if (interior.r2.group.position.y < -0.02 || interior.r2.group.position.y > 0.5) {
      issues.push({ code: 'character-floor', severity: 'error', message: 'Astromech is not on the deck' });
    }

    // --- Objects far outside expected bounds -------------------------------
    const runnerLocal = space.runnerPivot.position;
    if (runnerLocal.length() > 600) {
      issues.push({
        code: 'object-bounds', severity: 'warning',
        message: `Corvette drifted ${runnerLocal.length().toFixed(0)} m from the chase frame`,
      });
    }
    const destroyerLocal = space.destroyerPivot.position;
    if (destroyerLocal.length() > 40_000) {
      issues.push({
        code: 'object-bounds', severity: 'warning',
        message: `Destroyer is ${(destroyerLocal.length() / 1000).toFixed(1)} km from the chase frame`,
      });
    }

    // --- Missing assets and narration cues ---------------------------------
    if (ctx.narration.cueCount === 0) {
      issues.push({ code: 'missing-asset', severity: 'error', message: 'Narration manifest is empty' });
    } else if (ctx.narration.playbackMode === 'audio' && ctx.narration.loadedCount < ctx.narration.cueCount) {
      issues.push({
        code: 'missing-asset', severity: 'warning',
        message: `${ctx.narration.cueCount - ctx.narration.loadedCount} narration clip(s) failed to decode`,
      });
    }

    // --- Particle budget ----------------------------------------------------
    if (space.particleStats.overflow) {
      issues.push({ code: 'particle-overflow', severity: 'warning', message: 'Exterior particle pool wrapped - oldest bursts were overwritten' });
    }
    if (interior.particleStats.overflow) {
      issues.push({ code: 'particle-overflow', severity: 'warning', message: 'Interior particle pool wrapped - oldest bursts were overwritten' });
    }

    // --- WebGL errors -------------------------------------------------------
    const gl = ctx.renderer.getContext();
    const err = gl.getError();
    if (err !== gl.NO_ERROR) {
      this.glErrorCount++;
      issues.push({ code: 'webgl-error', severity: 'error', message: `WebGL error 0x${err.toString(16)} (total ${this.glErrorCount})` });
    }
    if (ctx.renderer.getContext().isContextLost()) {
      issues.push({ code: 'webgl-error', severity: 'error', message: 'WebGL context lost' });
    }

    // --- Console errors -----------------------------------------------------
    if (this.consoleErrors.length > 0) {
      issues.push({
        code: 'console-error', severity: 'error',
        message: `${this.consoleErrors.length} console error(s): ${this.consoleErrors[0].slice(0, 80)}`,
      });
    }

    // --- Frame rate ---------------------------------------------------------
    if (ctx.fps > 0 && ctx.fps < 18) {
      this.lowFpsFrames++;
      if (this.lowFpsFrames > 90) {
        issues.push({ code: 'low-fps', severity: 'warning', message: `Sustained ${ctx.fps.toFixed(0)} fps - consider a lower quality preset` });
      }
    } else {
      this.lowFpsFrames = Math.max(0, this.lowFpsFrames - 2);
    }

    return { time, issues };
  }

  /**
   * One-off structural checks that do not depend on the current frame:
   * every chapter has narration, every chapter has at least one shot, and the
   * shot list covers the whole timeline with no gaps.
   */
  static validateStructure(director: CameraDirector, narration: NarrationPlayer): SanityIssue[] {
    const issues: SanityIssue[] = [];
    const shots = director.shots;

    for (let i = 0; i < shots.length - 1; i++) {
      const gap = shots[i + 1].start - shots[i].end;
      if (Math.abs(gap) > 0.001) {
        issues.push({
          code: 'shot-gap', severity: 'error',
          message: `Shot ${shots[i].id} ends at ${shots[i].end} but ${shots[i + 1].id} starts at ${shots[i + 1].start}`,
        });
      }
    }

    for (const id of CHAPTER_IDS) {
      const [a, b] = CHAPTER_TIMES[id];
      const hasShot = shots.some((s) => s.start < b && s.end > a);
      if (!hasShot) issues.push({ code: 'missing-shot', severity: 'error', message: `Chapter ${id} has no camera shot` });
      if (narration.cueCount > 0) {
        const hasCue = narration.manifestCues.some((c) => c.time >= a && c.time < b);
        if (!hasCue) issues.push({ code: 'missing-narration', severity: 'error', message: `Chapter ${id} has no narration cue` });
      }
    }

    // Narration clips must not collide with each other.
    const cues = [...narration.manifestCues].sort((x, y) => x.time - y.time);
    for (let i = 0; i < cues.length - 1; i++) {
      const end = cues[i].time + cues[i].duration;
      if (end > cues[i + 1].time + 0.05) {
        issues.push({
          code: 'narration-overlap', severity: 'warning',
          message: `Narration ${cues[i].id} overruns ${cues[i + 1].id} by ${(end - cues[i + 1].time).toFixed(2)}s`,
        });
      }
    }

    return issues;
  }
}
