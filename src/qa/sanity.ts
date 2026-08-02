import * as THREE from 'three';
import type { Stage } from '../stage/Stage';
import { isFiniteObject } from '../core/math';

/**
 * Runtime sanity checks.
 *
 * These run continuously (throttled) while the app is playing and are also
 * evaluated at every QA checkpoint. Failures are surfaced in the debug overlay
 * and collected by the headless capture script rather than being swallowed.
 */

export interface SanityIssue {
  severity: 'warn' | 'error';
  code: string;
  detail: string;
}

export interface SanityOptions {
  /** Objects further than this from the origin are reported. */
  spaceBound: number;
  interiorBound: number;
}

const DEFAULTS: SanityOptions = { spaceBound: 400000, interiorBound: 240 };

const _v = new THREE.Vector3();
const _box = new THREE.Box3();
const _frustum = new THREE.Frustum();
const _mat = new THREE.Matrix4();

export class SanityChecker {
  private stage: Stage;
  private opts: SanityOptions;
  private issues: SanityIssue[] = [];
  private frameTimes: number[] = [];
  private lastLongFrameReport = 0;

  constructor(stage: Stage, opts: Partial<SanityOptions> = {}) {
    this.stage = stage;
    this.opts = { ...DEFAULTS, ...opts };
  }

  get current(): SanityIssue[] {
    return this.issues;
  }

  clear(): void {
    this.issues = [];
  }

  recordFrame(dt: number): void {
    this.frameTimes.push(dt);
    if (this.frameTimes.length > 120) this.frameTimes.shift();
  }

  get averageFps(): number {
    if (this.frameTimes.length === 0) return 0;
    const sum = this.frameTimes.reduce((a, b) => a + b, 0);
    return this.frameTimes.length / Math.max(1e-5, sum);
  }

  /** Full sweep. Cheap enough to run a few times a second. */
  run(camera: THREE.PerspectiveCamera, elapsed: number): SanityIssue[] {
    const issues: SanityIssue[] = [];
    const bound = this.stage.location === 'space' ? this.opts.spaceBound : this.opts.interiorBound;

    // --- NaN and out-of-bounds transforms ----------------------------------
    const root = this.stage.location === 'space' ? this.stage.spaceRoot : this.stage.interiorRoot;
    root.traverse((obj) => {
      if (!isFiniteObject(obj)) {
        issues.push({ severity: 'error', code: 'nan-transform', detail: obj.name || obj.type });
        return;
      }
      if (obj.parent === root || obj.parent === this.stage.scene) {
        obj.getWorldPosition(_v);
        if (_v.length() > bound) {
          issues.push({
            severity: 'warn',
            code: 'out-of-bounds',
            detail: `${obj.name || obj.type} at ${_v.length().toFixed(0)}`,
          });
        }
      }
    });

    if (!Number.isFinite(camera.position.x) || !Number.isFinite(camera.position.y) || !Number.isFinite(camera.position.z)) {
      issues.push({ severity: 'error', code: 'nan-camera', detail: 'camera position is not finite' });
    }

    // --- camera inside solid geometry --------------------------------------
    if (this.stage.location === 'space') {
      // The only "solid" thing at this scale that matters is the planet.
      const planetCentre = this.stage.planetPivot.position;
      const d = camera.position.distanceTo(planetCentre);
      if (d < this.stage.planet.radius * 1.02) {
        issues.push({ severity: 'error', code: 'camera-inside-planet', detail: `d=${d.toFixed(0)}` });
      }
      for (const ship of [this.stage.destroyer.root, this.stage.runner.root]) {
        if (!ship.visible) continue;
        _box.setFromObject(ship);
        if (_box.containsPoint(camera.position)) {
          issues.push({ severity: 'warn', code: 'camera-inside-ship', detail: ship.name });
        }
      }
    } else {
      const c = camera.position;
      const inside = c.x > -12 && c.x < 43 && c.y > 0.1 && c.y < 3.0 && c.z > -6 && c.z < 21;
      if (!inside) {
        issues.push({
          severity: 'warn',
          code: 'camera-outside-corridor',
          detail: `(${c.x.toFixed(1)}, ${c.y.toFixed(1)}, ${c.z.toFixed(1)})`,
        });
      }
      // --- characters below the floor --------------------------------------
      for (const ch of this.stage.allCharacters) {
        if (!ch.root.visible) continue;
        if (ch.root.position.y < -0.05) {
          issues.push({
            severity: 'error',
            code: 'character-below-floor',
            detail: `${ch.displayName} y=${ch.root.position.y.toFixed(2)}`,
          });
        }
        if (ch.root.position.y > 0.4) {
          issues.push({
            severity: 'warn',
            code: 'character-floating',
            detail: `${ch.displayName} y=${ch.root.position.y.toFixed(2)}`,
          });
        }
      }
    }

    // --- frame pacing --------------------------------------------------------
    const fps = this.averageFps;
    if (fps > 0 && fps < 18 && elapsed - this.lastLongFrameReport > 5) {
      this.lastLongFrameReport = elapsed;
      issues.push({ severity: 'warn', code: 'low-fps', detail: `${fps.toFixed(1)} fps` });
    }

    this.issues = issues;
    return issues;
  }

  /** Is a named object currently inside the camera frustum? */
  static isOnScreen(object: THREE.Object3D, camera: THREE.PerspectiveCamera): boolean {
    if (!object.visible) return false;
    camera.updateMatrixWorld();
    _mat.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    _frustum.setFromProjectionMatrix(_mat);
    _box.setFromObject(object);
    if (_box.isEmpty()) return false;
    return _frustum.intersectsBox(_box);
  }

  /** Fraction of the vertical frame an object occupies (0..1+). */
  static screenCoverage(object: THREE.Object3D, camera: THREE.PerspectiveCamera): number {
    _box.setFromObject(object);
    if (_box.isEmpty()) return 0;
    const corners: THREE.Vector3[] = [];
    for (let i = 0; i < 8; i++) {
      corners.push(
        new THREE.Vector3(
          i & 1 ? _box.max.x : _box.min.x,
          i & 2 ? _box.max.y : _box.min.y,
          i & 4 ? _box.max.z : _box.min.z,
        ),
      );
    }
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    let anyInFront = false;
    for (const c of corners) {
      const p = c.clone().applyMatrix4(camera.matrixWorldInverse);
      if (p.z < 0) anyInFront = true;
      const proj = c.clone().project(camera);
      minX = Math.min(minX, proj.x);
      maxX = Math.max(maxX, proj.x);
      minY = Math.min(minY, proj.y);
      maxY = Math.max(maxY, proj.y);
    }
    if (!anyInFront) return 0;
    return Math.max((maxX - minX) / 2, (maxY - minY) / 2);
  }
}
