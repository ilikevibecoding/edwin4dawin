/**
 * Targeting mode — the tablet.
 *
 * Two decisions are being made here, not one. Where the ordnance lands is the
 * obvious one; the run-in heading is the interesting one, because it decides
 * whether a 96 m carpet runs down the length of a street or across it, and whether
 * the tail of it comes back over the player's own position. Both are on screen at
 * all times as the dashed run-in axis and the footprint ellipse, so committing is
 * a decision rather than a guess.
 *
 * The view is the main camera moved to 250 m, not a second render target: the
 * render system owns final presentation through `engine.renderHook`, and taking the
 * camera over in `lateUpdate` — after the player has written it, before the render
 * reads it — gets the whole post stack applied to the tablet image for free. The
 * green CRT conversion happens in the compositor, in `TabletOverlay`.
 *
 * Input is owned outright while the tablet is up. `ctx.input.enabled` goes false,
 * which freezes the player's look and movement in one move, and this class listens
 * to the raw device itself. Anything less and the player's view spins while they
 * are looking at a map.
 */
import * as THREE from 'three';
import { clamp, damp } from '../core/MathUtils';
import type { EngineContext } from '../core/System';
import type { KillstreakDeps } from './Deps';
import { AIRSTRIKE, CLUSTER, SOUNDS } from './Tuning';
import {
  GRID_DIVISIONS,
  bearingLabel,
  bearingToDirection,
  gridColumnLabel,
  gridReference,
  normalizeBearing,
  screenToGround,
  worldToScreen,
} from './MapMath';
import { FOOTPRINT_SAMPLES, TABLET_LIMITS, TabletOverlay } from './TabletOverlay';
import { Takeover } from './Takeover';

export type TargetingKind = 'carpet' | 'cluster' | 'precision';

/** Field of view used for the tablet. Narrow, so the map reads flat. */
const TABLET_FOV = 34;
/** Tilt off vertical, radians. Enough to read as a 3D display, not enough to hide streets. */
const TABLET_TILT = 14 * (Math.PI / 180);
/** Metres of inset from the map edge the reticle may not cross. */
const EDGE_INSET = 6;
/** Degrees of run-in heading per wheel notch. */
const HEADING_STEP = 7.5;
/** Reticle travel in NDC per pixel of mouse movement. */
const RETICLE_GAIN = 0.0026;

export class Targeting {
  readonly overlay = new TabletOverlay();
  private readonly takeover: Takeover;

  active = false;
  kind: TargetingKind = 'carpet';
  heading = 0;

  onCommit: ((target: THREE.Vector3, heading: number, kind: TargetingKind) => void) | null = null;
  onAbort: (() => void) | null = null;

  private ctx: EngineContext | null = null;
  private readonly aim = new THREE.Vector3();
  private readonly direction = new THREE.Vector3();
  private readonly right = new THREE.Vector3();
  private readonly pivot = new THREE.Vector3();
  private readonly eye = new THREE.Vector3();
  private readonly playerPos = new THREE.Vector3();
  private readonly scratch = new THREE.Vector3();
  private readonly scratchB = new THREE.Vector3();
  private readonly projected = new THREE.Vector3();
  private readonly enemies: THREE.Vector3[] = [];

  private ndcX = 0;
  private ndcY = 0;
  private boot = 0;
  private confirmFlash = 0;
  private zoom = 1;
  private groundPlane = 0;
  private tooClose = false;
  private offMap = false;
  private hostiles = 0;
  private readonly motion = { x: 0, y: 0 };

  constructor(private readonly deps: KillstreakDeps) {
    this.takeover = new Takeover(deps);
  }

  init(ctx: EngineContext): void {
    this.ctx = ctx;
  }

  /** Opens the tablet. `heading` seeds the run-in from the player's own facing. */
  enter(kind: TargetingKind): void {
    const ctx = this.ctx;
    if (!ctx || this.active) return;
    this.active = true;
    this.kind = kind;
    this.boot = 0;
    this.confirmFlash = 0;
    this.zoom = 1.12;

    // Seed the run-in so the aircraft come in over the player's shoulder, which
    // is the heading a player who does not touch the wheel would want anyway.
    this.heading = normalizeBearing((this.deps.player?.yaw ?? 0) + Math.PI);

    const bounds = this.deps.world?.bounds;
    this.pivot.set(0, 0, 0);
    if (bounds) bounds.getCenter(this.pivot);
    this.groundPlane = this.deps.groundAt(this.pivot.x, this.pivot.z, 0);
    this.pivot.y = this.groundPlane;

    // Start the reticle on the player, so the first thing on screen is a target
    // relative to something known.
    this.deps.playerPosition(this.aim);
    this.aim.y = this.groundPlane;
    this.ndcX = 0;
    this.ndcY = 0;

    this.takeover.begin(ctx, { hideViewmodel: true, fov: TABLET_FOV });
    this.deps.killstreakSelection(true);

    this.overlay.mount();
    this.overlay.setOpen(true);
    this.deps.play2D(SOUNDS.tabletOpen, { volume: 0.9 });

    // Place the camera immediately so the first frame of the tablet is framed.
    this.writeCamera(ctx, true);
  }

  private leave(): void {
    this.active = false;
    this.overlay.setOpen(false);
    this.takeover.end();
    this.deps.killstreakSelection(false);
  }

  /** Commits the current solution. Refused while the reticle is danger close. */
  confirm(): boolean {
    if (!this.active) return false;
    if (this.tooClose) {
      this.deps.play2D(SOUNDS.tabletDeny, { volume: 0.9 });
      this.deps.notify('FIRE MISSION REFUSED', 'DANGER CLOSE — MOVE THE TARGET OUT', 'warn');
      return false;
    }
    this.deps.play2D(SOUNDS.tabletConfirm, { volume: 1 });
    const target = this.scratch.copy(this.aim);
    const heading = this.heading;
    const kind = this.kind;
    this.leave();
    this.onCommit?.(target, heading, kind);
    return true;
  }

  cancel(): void {
    if (!this.active) return;
    this.deps.play2D(SOUNDS.tabletClose, { volume: 0.8 });
    this.leave();
    this.onAbort?.();
  }

  // -------------------------------------------------------------------------
  // Frame
  // -------------------------------------------------------------------------

  update(dt: number): void {
    if (!this.active) return;
    const ctx = this.ctx;
    if (!ctx) return;

    this.boot = Math.min(1, this.boot + dt * 3.2);
    this.confirmFlash = Math.max(0, this.confirmFlash - dt * 4);
    this.zoom = damp(this.zoom, 1, 9, dt);

    const notches = this.takeover.consumeWheel();
    if (notches !== 0) {
      this.heading = normalizeBearing(this.heading + notches * HEADING_STEP * (Math.PI / 180));
      this.deps.play2D(SOUNDS.tabletMove, { volume: 0.35, pitch: 1.1 });
    }

    const motion = this.takeover.consumeMotion(this.motion);
    if (motion.x !== 0 || motion.y !== 0) {
      const sensitivity = ctx.input.sensitivity;
      this.ndcX = clamp(this.ndcX + motion.x * RETICLE_GAIN * sensitivity, -0.98, 0.98);
      this.ndcY = clamp(this.ndcY - motion.y * RETICLE_GAIN * sensitivity, -0.94, 0.94);
    }

    this.writeCamera(ctx, false);
    this.resolveAim(ctx);
    this.buildFrame(ctx);

    const abort = this.takeover.cancelPressed || this.takeover.secondaryPressed;
    const commit = this.takeover.confirmPressed || this.takeover.primaryPressed;
    this.takeover.endFrame();

    if (abort) {
      this.cancel();
      return;
    }
    if (commit) {
      this.confirmFlash = 1;
      this.confirm();
    }
  }

  /** Called from `lateUpdate`, after the player has written the camera. */
  applyCamera(): void {
    if (!this.active || !this.ctx) return;
    this.writeCamera(this.ctx, false);
  }

  private writeCamera(ctx: EngineContext, immediate: boolean): void {
    const bounds = this.deps.world?.bounds;
    // Frame the whole area of operations with a margin, from the narrow tablet FOV.
    const extent = bounds
      ? Math.max(bounds.max.x - bounds.min.x, bounds.max.z - bounds.min.z) * 0.54
      : 80;
    const halfFov = (TABLET_FOV * 0.5 * Math.PI) / 180;
    const distance = (extent / Math.tan(halfFov)) * this.zoom;

    this.eye
      .set(0, Math.cos(TABLET_TILT), Math.sin(TABLET_TILT))
      .multiplyScalar(distance)
      .add(this.pivot);

    const camera = ctx.camera;
    camera.position.copy(this.eye);
    camera.up.set(0, 1, 0);
    camera.lookAt(this.pivot);
    if (Math.abs(camera.fov - TABLET_FOV) > 1e-3) {
      camera.fov = TABLET_FOV;
      camera.updateProjectionMatrix();
    }
    camera.updateMatrixWorld(true);
    if (immediate) camera.updateProjectionMatrix();
  }

  /**
   * Maps the reticle to the ground, clamps it inside the area of operations, then
   * maps it back so the drawn reticle is always exactly on the point that would be
   * struck. Clamping in world space rather than screen space means the constraint
   * is a map boundary, not a rectangle that happens to look like one.
   */
  private resolveAim(ctx: EngineContext): void {
    const hit = screenToGround(
      ctx.camera,
      this.ndcX,
      this.ndcY,
      this.groundPlane,
      this.scratch,
      this.scratchB,
    );
    if (hit) {
      this.aim.x = this.scratch.x;
      this.aim.z = this.scratch.z;
    }

    const bounds = this.deps.world?.bounds;
    this.offMap = false;
    if (bounds) {
      const minX = bounds.min.x + EDGE_INSET;
      const maxX = bounds.max.x - EDGE_INSET;
      const minZ = bounds.min.z + EDGE_INSET;
      const maxZ = bounds.max.z - EDGE_INSET;
      const cx = clamp(this.aim.x, minX, maxX);
      const cz = clamp(this.aim.z, minZ, maxZ);
      if (cx !== this.aim.x || cz !== this.aim.z) this.offMap = true;
      this.aim.x = cx;
      this.aim.z = cz;
    }
    this.aim.y = this.deps.groundAt(this.aim.x, this.aim.z, this.groundPlane);

    // Snap the drawn reticle back onto the clamped world point.
    this.scratch.copy(this.aim);
    this.scratch.y = this.groundPlane;
    if (worldToScreen(ctx.camera, this.scratch, this.projected)) {
      this.ndcX = this.projected.x;
      this.ndcY = this.projected.y;
    }

    bearingToDirection(this.heading, this.direction).multiplyScalar(-1);
    this.right.set(-this.direction.z, 0, this.direction.x);

    this.deps.playerPosition(this.playerPos);
    const dx = this.playerPos.x - this.aim.x;
    const dz = this.playerPos.z - this.aim.z;
    this.tooClose = Math.hypot(dx, dz) < AIRSTRIKE.minSafeDistance;
  }

  private get pattern(): { long: number; wide: number; count: number; label: string } {
    switch (this.kind) {
      case 'precision':
        return { long: 12, wide: 12, count: 1, label: '1 x GP-900 PRECISION' };
      case 'cluster':
        return {
          long: CLUSTER.patternRadius,
          wide: CLUSTER.patternRadius,
          count: CLUSTER.bomblets,
          label: `${CLUSTER.bomblets} x BOMBLET · CANISTER AIRBURST`,
        };
      default: {
        const bombs = AIRSTRIKE.jets * AIRSTRIKE.bombsPerJet;
        return {
          long: ((bombs - 1) * AIRSTRIKE.impactSpacing) / 2 + AIRSTRIKE.blastRadius,
          wide: AIRSTRIKE.blastRadius + 4,
          count: bombs,
          label: `${bombs} x GP-900 · 3-SHIP CARPET`,
        };
      }
    }
  }

  private buildFrame(ctx: EngineContext): void {
    const f = this.overlay.frame;
    const camera = ctx.camera;
    const w = f.cssWidth;
    const h = f.cssHeight;
    const toScreenX = (ndc: number): number => (ndc * 0.5 + 0.5) * w;
    const toScreenY = (ndc: number): number => (-ndc * 0.5 + 0.5) * h;

    f.boot = this.boot;
    f.confirmFlash = this.confirmFlash;
    f.reticleX = toScreenX(this.ndcX);
    f.reticleY = toScreenY(this.ndcY);
    f.headingDeg = (this.heading * 180) / Math.PI;
    f.headingText = bearingLabel(this.heading);
    f.gridText = gridReference(this.aim, this.deps.world?.bounds ?? null);
    f.tooClose = this.tooClose;
    f.offMap = this.offMap;

    const range = Math.hypot(this.playerPos.x - this.aim.x, this.playerPos.z - this.aim.z);
    f.rangeText = `${Math.round(range)} M`;

    const pattern = this.pattern;
    f.ordnanceText = pattern.label;

    // Own position.
    this.scratch.copy(this.playerPos);
    this.scratch.y = this.groundPlane;
    if (worldToScreen(camera, this.scratch, this.projected)) {
      f.playerX = toScreenX(this.projected.x);
      f.playerY = toScreenY(this.projected.y);
    } else {
      f.playerX = -1;
    }

    // Run-in axis: from well before the target to well past it.
    const axisLength = pattern.long + 46;
    this.scratch
      .copy(this.aim)
      .addScaledVector(this.direction, -axisLength);
    this.scratch.y = this.groundPlane;
    worldToScreen(camera, this.scratch, this.projected);
    f.runInAX = toScreenX(this.projected.x);
    f.runInAY = toScreenY(this.projected.y);
    this.scratch.copy(this.aim).addScaledVector(this.direction, axisLength);
    this.scratch.y = this.groundPlane;
    worldToScreen(camera, this.scratch, this.projected);
    f.runInBX = toScreenX(this.projected.x);
    f.runInBY = toScreenY(this.projected.y);

    // Footprint: the ellipse the ordnance actually covers, projected properly so
    // it foreshortens with the tilt rather than being drawn as a screen-space oval.
    f.footprintCount = FOOTPRINT_SAMPLES;
    for (let i = 0; i < FOOTPRINT_SAMPLES; i++) {
      const a = (i / FOOTPRINT_SAMPLES) * Math.PI * 2;
      this.scratch
        .copy(this.aim)
        .addScaledVector(this.direction, Math.cos(a) * pattern.long)
        .addScaledVector(this.right, Math.sin(a) * pattern.wide);
      this.scratch.y = this.groundPlane;
      worldToScreen(camera, this.scratch, this.projected);
      f.footprint[i * 2] = toScreenX(this.projected.x);
      f.footprint[i * 2 + 1] = toScreenY(this.projected.y);
    }

    // One tick per aim point, which is how the player sees the walk length.
    if (this.kind === 'carpet') {
      const bombs = pattern.count;
      f.aimPointCount = Math.min(bombs, 16);
      const half = (bombs - 1) / 2;
      for (let i = 0; i < f.aimPointCount; i++) {
        this.scratch
          .copy(this.aim)
          .addScaledVector(this.direction, (i - half) * AIRSTRIKE.impactSpacing);
        this.scratch.y = this.groundPlane;
        worldToScreen(camera, this.scratch, this.projected);
        f.aimPoints[i * 2] = toScreenX(this.projected.x);
        f.aimPoints[i * 2 + 1] = toScreenY(this.projected.y);
      }
    } else {
      f.aimPointCount = 0;
    }

    this.buildGrid(camera, f, toScreenX, toScreenY);
    this.buildRings(camera, f, toScreenX, toScreenY);
    this.buildLandmarks(camera, f, toScreenX, toScreenY);
    this.buildBlips(camera, f, toScreenX, toScreenY, pattern);
    f.hostileCount = this.hostiles;

    this.overlay.render(ctx.time.deltaUnscaled);
  }

  private buildGrid(
    camera: THREE.Camera,
    f: import('./TabletOverlay').TabletFrame,
    sx: (n: number) => number,
    sy: (n: number) => number,
  ): void {
    const bounds = this.deps.world?.bounds;
    if (!bounds) {
      f.gridLineCount = 0;
      f.gridLabelCount = 0;
      return;
    }
    const minX = bounds.min.x;
    const maxX = bounds.max.x;
    const minZ = bounds.min.z;
    const maxZ = bounds.max.z;
    let lines = 0;
    let labels = 0;

    const project = (x: number, z: number): void => {
      this.scratch.set(x, this.groundPlane, z);
      worldToScreen(camera, this.scratch, this.projected);
    };

    for (let i = 0; i <= GRID_DIVISIONS && lines < TABLET_LIMITS.gridLines - 1; i++) {
      const t = i / GRID_DIVISIONS;
      const x = minX + (maxX - minX) * t;
      project(x, minZ);
      const ax = sx(this.projected.x);
      const ay = sy(this.projected.y);
      project(x, maxZ);
      f.gridLines[lines * 4] = ax;
      f.gridLines[lines * 4 + 1] = ay;
      f.gridLines[lines * 4 + 2] = sx(this.projected.x);
      f.gridLines[lines * 4 + 3] = sy(this.projected.y);
      lines++;

      const z = minZ + (maxZ - minZ) * t;
      project(minX, z);
      const bx = sx(this.projected.x);
      const by = sy(this.projected.y);
      project(maxX, z);
      f.gridLines[lines * 4] = bx;
      f.gridLines[lines * 4 + 1] = by;
      f.gridLines[lines * 4 + 2] = sx(this.projected.x);
      f.gridLines[lines * 4 + 3] = sy(this.projected.y);
      lines++;

      if (i < GRID_DIVISIONS && labels < TABLET_LIMITS.gridLines - 2) {
        const cellX = minX + ((maxX - minX) * (i + 0.5)) / GRID_DIVISIONS;
        project(cellX, minZ + 3);
        f.gridLabels[labels * 2] = sx(this.projected.x);
        f.gridLabels[labels * 2 + 1] = sy(this.projected.y) - 10;
        f.gridLabelText[labels] = gridColumnLabel(i);
        labels++;

        const cellZ = minZ + ((maxZ - minZ) * (i + 0.5)) / GRID_DIVISIONS;
        project(minX + 3, cellZ);
        f.gridLabels[labels * 2] = sx(this.projected.x) - 12;
        f.gridLabels[labels * 2 + 1] = sy(this.projected.y);
        f.gridLabelText[labels] = String(i + 1);
        labels++;
      }
    }

    f.gridLineCount = lines;
    f.gridLabelCount = labels;
  }

  private buildRings(
    camera: THREE.Camera,
    f: import('./TabletOverlay').TabletFrame,
    sx: (n: number) => number,
    sy: (n: number) => number,
  ): void {
    // The 25 m ring is the one that matters: inside it the mission is refused.
    const radii = [AIRSTRIKE.minSafeDistance, 50, 100, 150];
    const samples = TABLET_LIMITS.ringSamples;
    f.ringCount = Math.min(radii.length, TABLET_LIMITS.rings);
    for (let r = 0; r < f.ringCount; r++) {
      const radius = radii[r];
      f.ringRadii[r] = radius;
      for (let i = 0; i < samples; i++) {
        const a = (i / samples) * Math.PI * 2;
        this.scratch.set(
          this.playerPos.x + Math.cos(a) * radius,
          this.groundPlane,
          this.playerPos.z + Math.sin(a) * radius,
        );
        worldToScreen(camera, this.scratch, this.projected);
        const o = (r * samples + i) * 2;
        f.rings[o] = sx(this.projected.x);
        f.rings[o + 1] = sy(this.projected.y);
      }
    }
  }

  private buildLandmarks(
    camera: THREE.Camera,
    f: import('./TabletOverlay').TabletFrame,
    sx: (n: number) => number,
    sy: (n: number) => number,
  ): void {
    const landmarks = this.deps.world?.getLandmarks();
    let count = 0;
    if (landmarks) {
      for (const [name, position] of landmarks) {
        if (count >= TABLET_LIMITS.labels) break;
        // Derived markers (roof access, collapse points) are for the AI, not for
        // a fire mission, and they triple the label count.
        if (name.includes('_collapse') || name.includes('_roof')) continue;
        this.scratch.set(position.x, this.groundPlane, position.z);
        if (!worldToScreen(camera, this.scratch, this.projected)) continue;
        f.labels[count * 2] = sx(this.projected.x);
        f.labels[count * 2 + 1] = sy(this.projected.y);
        f.labelText[count] = name.replace(/_/g, ' ').toUpperCase();
        count++;
      }
    }
    f.labelCount = count;
  }

  private buildBlips(
    camera: THREE.Camera,
    f: import('./TabletOverlay').TabletFrame,
    sx: (n: number) => number,
    sy: (n: number) => number,
    pattern: { long: number; wide: number },
  ): void {
    const ai = this.deps.ai;
    let count = 0;
    let inside = 0;
    if (ai) {
      ai.getEnemyPositions(this.enemies);
      for (const position of this.enemies) {
        if (count >= TABLET_LIMITS.blips) break;
        this.scratch.set(position.x, this.groundPlane, position.z);
        if (!worldToScreen(camera, this.scratch, this.projected)) continue;
        f.blips[count * 3] = sx(this.projected.x);
        f.blips[count * 3 + 1] = sy(this.projected.y);
        f.blips[count * 3 + 2] = 1;
        count++;

        // Elliptical containment against the footprint, in run-in axis space.
        const dx = position.x - this.aim.x;
        const dz = position.z - this.aim.z;
        const along = (dx * this.direction.x + dz * this.direction.z) / pattern.long;
        const across = (dx * this.right.x + dz * this.right.z) / pattern.wide;
        if (along * along + across * across <= 1) inside++;
      }
    }
    f.blipCount = count;
    this.hostiles = inside;
  }

  dispose(): void {
    if (this.active) this.leave();
    this.overlay.unmount();
    this.ctx = null;
  }
}
