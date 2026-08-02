import * as THREE from 'three';
import type { Stage } from '../show/Stage';
import type { Show } from '../show/Show';
import { INTERIOR_ORIGIN } from '../show/Stage';
import { CORRIDOR_HALF_WIDTH, CORRIDOR_HEIGHT, VESTIBULE_HALF_WIDTH } from '../assets/Corridor';
import { NARRATION } from '../timeline/Script';

/**
 * Programmatic self-checks.
 *
 * These run every frame in debug mode and are also driven in bulk by the
 * headless QA tour, so a regression shows up as a named failure rather than
 * as "something looks off".
 */

export interface SanityIssue {
  code: string;
  detail: string;
  severity: 'warn' | 'error';
}

const _v = new THREE.Vector3();
const _box = new THREE.Box3();

export class SanityChecker {
  private stage: Stage;
  private show: Show;
  private camera: THREE.PerspectiveCamera;
  /** Background objects (the planet, the starfield) use their own camera. */
  private bgCamera: THREE.PerspectiveCamera | null = null;
  private frameTimes: number[] = [];
  readonly issues: SanityIssue[] = [];
  private seen = new Set<string>();

  constructor(
    stage: Stage,
    show: Show,
    camera: THREE.PerspectiveCamera,
    bgCamera?: THREE.PerspectiveCamera,
  ) {
    this.stage = stage;
    this.show = show;
    this.camera = camera;
    this.bgCamera = bgCamera ?? null;
  }

  /** Pick the camera that actually renders the given object. */
  private cameraFor(object: THREE.Object3D): THREE.PerspectiveCamera {
    let node: THREE.Object3D | null = object;
    while (node) {
      if (node === this.stage.background) return this.bgCamera ?? this.camera;
      node = node.parent;
    }
    return this.camera;
  }

  private report(code: string, detail: string, severity: 'warn' | 'error' = 'error'): void {
    const key = `${code}:${detail}`;
    if (this.seen.has(key)) return;
    this.seen.add(key);
    this.issues.push({ code, detail, severity });
  }

  clear(): void {
    this.issues.length = 0;
    this.seen.clear();
    this.frameTimes.length = 0;
  }

  recordFrame(dt: number): void {
    this.frameTimes.push(dt);
    if (this.frameTimes.length > 240) this.frameTimes.shift();
  }

  get averageFps(): number {
    if (this.frameTimes.length < 8) return 0;
    const sum = this.frameTimes.reduce((a, b) => a + b, 0);
    return this.frameTimes.length / sum;
  }

  /** Fast per-frame checks. */
  check(time: number): SanityIssue[] {
    const found: SanityIssue[] = [];
    const push = (code: string, detail: string, severity: 'warn' | 'error' = 'error'): void => {
      found.push({ code, detail, severity });
      this.report(code, detail, severity);
    };

    // --------------------------------------------------- NaN transforms
    const checkFinite = (o: THREE.Object3D, label: string): void => {
      const p = o.position;
      const q = o.quaternion;
      if (!Number.isFinite(p.x) || !Number.isFinite(p.y) || !Number.isFinite(p.z))
        push('nan-position', `${label} position is not finite`);
      if (!Number.isFinite(q.x) || !Number.isFinite(q.y) || !Number.isFinite(q.z) || !Number.isFinite(q.w))
        push('nan-rotation', `${label} rotation is not finite`);
    };
    checkFinite(this.camera, 'camera');
    checkFinite(this.stage.runner.root, 'runner');
    checkFinite(this.stage.destroyer.root, 'destroyer');
    checkFinite(this.stage.exteriorPod.root, 'escape pod');
    for (const c of this.stage.characters) checkFinite(c.root, c.id);

    // ----------------------------------------------------------- bounds
    const shipSpread = this.stage.runner.root.position.distanceTo(this.stage.destroyer.root.position);
    if (this.stage.space.visible && shipSpread > 12000)
      push('ships-apart', `ships ${shipSpread.toFixed(0)} units apart`, 'warn');

    // ------------------------------------------- characters on the floor
    if (this.stage.interior.visible) {
      for (const c of this.stage.characters) {
        // Characters are children of the interior root, so their transform is
        // already expressed in set-local metres.
        const y = c.root.position.y;
        if (y < -0.12) push('character-below-floor', `${c.id} at y=${y.toFixed(2)}`);
        if (y > 1.2) push('character-floating', `${c.id} at y=${y.toFixed(2)}`);
        const z = c.root.position.z;
        const x = c.root.position.x;
        const halfWidth = z > 8 ? (x > 4.0 ? 9.4 : VESTIBULE_HALF_WIDTH) : CORRIDOR_HALF_WIDTH;
        if (Math.abs(x) > halfWidth + 0.6 && !(z > 14 && z < 20 && x > 0))
          push('character-through-wall', `${c.id} at x=${x.toFixed(2)}, z=${z.toFixed(2)}`, 'warn');
      }
    }

    // ------------------------------------------- camera inside geometry
    if (this.stage.interior.visible && !this.stage.space.visible) {
      const cx = this.camera.position.x - INTERIOR_ORIGIN.x;
      const cy = this.camera.position.y - INTERIOR_ORIGIN.y;
      const cz = this.camera.position.z - INTERIOR_ORIGIN.z;
      const inBay = cx > 4.0 && cz > 14.6 && cz < 19.4;
      const half = cz > 8 ? VESTIBULE_HALF_WIDTH : CORRIDOR_HALF_WIDTH;
      if (!inBay) {
        if (Math.abs(cx) > half - 0.18)
          push('camera-in-wall', `camera x=${cx.toFixed(2)} beyond ±${(half - 0.18).toFixed(2)} at t=${time.toFixed(1)}`);
        if (cy < 0.18 || cy > CORRIDOR_HEIGHT + 0.25)
          push('camera-in-floor-ceiling', `camera y=${cy.toFixed(2)} at t=${time.toFixed(1)}`);
        if (cz < -15.4 || cz > 22.4)
          push('camera-outside-set', `camera z=${cz.toFixed(2)} at t=${time.toFixed(1)}`);
      }
    }

    // Camera should not be inside either ship's hull volume. Only the hull
    // mesh counts: beams, plumes and glows legitimately reach past the camera.
    if (this.stage.space.visible) {
      for (const [root, label, pad] of [
        [this.stage.runner.root, 'corvette', 4],
        [this.stage.destroyer.root, 'destroyer', 10],
      ] as Array<[THREE.Object3D, string, number]>) {
        const hull = root.getObjectByName('hull');
        if (!hull) continue;
        _box.setFromObject(hull);
        if (_box.isEmpty()) continue;
        _box.expandByScalar(-pad);
        if (!_box.isEmpty() && _box.containsPoint(this.camera.position))
          push('camera-in-hull', `camera inside ${label} at t=${time.toFixed(1)}`);
      }
    }

    // -------------------------------------------------- missing assets
    if (!this.stage.runner.root.parent) push('missing-asset', 'corvette detached from scene');
    if (!this.stage.destroyer.root.parent) push('missing-asset', 'destroyer detached from scene');
    if (this.stage.characters.length < 14)
      push('missing-asset', `only ${this.stage.characters.length} characters built`);

    return found;
  }

  /** One-off checks that do not depend on the current frame. */
  checkStatic(): SanityIssue[] {
    const found: SanityIssue[] = [];
    const push = (code: string, detail: string, severity: 'warn' | 'error' = 'error'): void => {
      found.push({ code, detail, severity });
      this.report(code, detail, severity);
    };

    // Narration cue coverage: every chapter must have at least one line and
    // no two lines may overlap by more than a moment.
    const chapters = new Set(NARRATION.map((n) => n.chapter));
    for (let i = 0; i < 8; i++) {
      if (!chapters.has(i)) push('missing-narration', `chapter ${i} has no narration cue`);
    }
    for (let i = 1; i < NARRATION.length; i++) {
      const prev = NARRATION[i - 1];
      const cur = NARRATION[i];
      if (cur.start < prev.start + prev.estimate - 0.6)
        push(
          'narration-overlap',
          `${cur.id} starts at ${cur.start}s before ${prev.id} ends at ${(prev.start + prev.estimate).toFixed(1)}s`,
          'warn',
        );
    }

    // Every shot must be covered and contiguous.
    const shots = this.show.director.shotList;
    for (let i = 1; i < shots.length; i++) {
      const gap = shots[i].start - shots[i - 1].end;
      if (Math.abs(gap) > 0.001)
        push('shot-gap', `${gap.toFixed(2)}s between ${shots[i - 1].id} and ${shots[i].id}`, 'warn');
    }
    if (shots.length && Math.abs(shots[0].start) > 0.001)
      push('shot-gap', 'first shot does not start at zero', 'warn');

    // Duplicate timeline events would double-fire audio.
    const ids = new Set<string>();
    for (const e of this.show.timeline.eventsBetween(0, this.show.timeline.duration + 1)) {
      if (ids.has(e.id)) push('duplicate-event', `event id ${e.id} used twice`);
      ids.add(e.id);
    }

    // Events firing more than once per playthrough.
    this.show.timeline.fireCounts.forEach((count, id) => {
      if (count > 1) push('event-refired', `${id} fired ${count} times`, 'warn');
    });

    return found;
  }

  /** WebGL error polling — cheap, and it catches silent driver failures. */
  checkGL(renderer: THREE.WebGLRenderer): SanityIssue[] {
    const gl = renderer.getContext();
    const err = gl.getError();
    if (err !== gl.NO_ERROR) {
      const issue: SanityIssue = { code: 'webgl-error', detail: `glGetError = ${err}`, severity: 'error' };
      this.report(issue.code, issue.detail, issue.severity);
      return [issue];
    }
    return [];
  }

  /** Frame-rate watchdog. */
  checkPerformance(): SanityIssue[] {
    const fps = this.averageFps;
    if (fps > 0 && fps < 18) {
      const issue: SanityIssue = {
        code: 'low-fps',
        detail: `${fps.toFixed(1)} fps average`,
        severity: 'warn',
      };
      this.report(issue.code, issue.detail, issue.severity);
      return [issue];
    }
    return [];
  }

  /** Is `object` inside the camera frustum right now? */
  isVisible(object: THREE.Object3D): boolean {
    _box.setFromObject(object);
    if (_box.isEmpty()) return false;
    const camera = this.cameraFor(object);
    const frustum = new THREE.Frustum();
    frustum.setFromProjectionMatrix(
      new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse),
    );
    return frustum.intersectsBox(_box);
  }

  /** Fraction of the viewport height an object covers, used by checkpoints. */
  screenCoverage(object: THREE.Object3D): number {
    const camera = this.cameraFor(object);
    _box.setFromObject(object);
    if (_box.isEmpty()) return 0;
    const points: THREE.Vector3[] = [];
    for (let i = 0; i < 8; i++) {
      points.push(
        _v
          .set(
            i & 1 ? _box.max.x : _box.min.x,
            i & 2 ? _box.max.y : _box.min.y,
            i & 4 ? _box.max.z : _box.min.z,
          )
          .clone(),
      );
    }
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    let anyInFront = false;
    for (const p of points) {
      const clip = p.clone().applyMatrix4(camera.matrixWorldInverse);
      if (-clip.z > camera.near) anyInFront = true;
      const ndc = p.clone().project(camera);
      minX = Math.min(minX, ndc.x);
      maxX = Math.max(maxX, ndc.x);
      minY = Math.min(minY, ndc.y);
      maxY = Math.max(maxY, ndc.y);
    }
    if (!anyInFront) return 0;
    return Math.max(0, Math.min(2, maxY - minY)) / 2;
  }
}
