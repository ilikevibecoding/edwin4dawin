import * as THREE from 'three';
import type { Game } from '../game';
import { BENCH_VIEWS, findView, type BenchView } from './views';

/**
 * Deterministic benchmark driver exposed as window.__bench. Frames are only advanced when the
 * capture script asks, with a fixed timestep, so every capture of a view is reproducible.
 */
export class Bench {
  view: BenchView | null = null;
  readonly fixedDt = 1 / 30;
  frame = 0;
  private flying = false;

  constructor(private game: Game) {}

  list(): { id: string; name: string; description: string }[] {
    return BENCH_VIEWS.map((v) => ({ id: v.id, name: v.name, description: v.description }));
  }

  /** Configure the world for a view and pre-simulate it. Returns when the frame is stable. */
  setup(id: string): boolean {
    const v = findView(id);
    if (!v) return false;
    this.view = v;
    const g = this.game;
    g.atmos.hour = v.time;
    g.atmos.setWeather(v.weather);
    g.time = 0;
    // pre-simulate the environment (boats, cars, clouds, sky) with the plane frozen
    this.placePlane(v);
    for (let i = 0; i < Math.round(v.presim / this.fixedDt); i++) g.update(this.fixedDt, false);
    this.placePlane(v);
    this.setupCamera(v);
    g.aircraft.inputs.throttle = v.plane.throttle;
    g.aircraft.inputs.flaps = v.plane.flaps ?? 0;
    g.aircraft.inputs.pitch = v.clipInputs.pitch;
    g.aircraft.inputs.roll = v.clipInputs.roll;
    g.aircraft.inputs.yaw = v.clipInputs.yaw;
    // settle: one environment update with the plane static; the camera is then posed once more at its steady
    // flight state (not integrated: a spring step with the plane frozen would leave it a frame ahead)
    g.update(this.fixedDt, false);
    if (v.camera.mode !== 'fixed') g.flightCamera.settle(g.aircraft.flight, g.aircraft.model, this.fixedDt);
    this.followOrigin.copy(g.aircraft.flight.position);
    this.flying = false;
    this.frame = 0;
    g.metrics.reset();
    return true;
  }

  /** aircraft position at the end of setup and the fixed camera's authored position: a `follow` fixed camera is
   *  translated by the aircraft's displacement from here so the composition of the still holds through the clip */
  private readonly followOrigin = new THREE.Vector3();
  private readonly fixedPos = new THREE.Vector3();

  private placePlane(v: BenchView): void {
    const g = this.game;
    const p = v.plane;
    let pos: [number, number, number];
    if (p.fromCamera && v.camera.pos) {
      const cam = this.fixedCamera(v);
      const ndcX = p.fromCamera.screenX * 2 - 1, ndcY = 1 - p.fromCamera.screenY * 2;
      const dir = new THREE.Vector3(ndcX, ndcY, 0.5).unproject(cam).sub(cam.position).normalize();
      const world = cam.position.clone().addScaledVector(dir, p.fromCamera.distance);
      pos = [world.x, world.y, world.z];
    } else {
      pos = p.pos!;
    }
    const rad = (d: number) => (d * Math.PI) / 180;
    g.aircraft.place(pos[0], pos[1], pos[2], rad(p.headingDeg), rad(p.pitchDeg), rad(p.bankDeg), p.speed, p.throttle);
  }

  private fixedCamera(v: BenchView): THREE.PerspectiveCamera {
    const cam = new THREE.PerspectiveCamera(v.camera.fov, this.game.camera.aspect, 0.4, 60000);
    const [x, y, z] = v.camera.pos!;
    cam.position.set(x, y, z);
    const h = ((v.camera.headingDeg ?? 0) * Math.PI) / 180, pch = ((v.camera.pitchDeg ?? 0) * Math.PI) / 180;
    // heading 0 = north (-Z); camera looks down -Z by default, yaw about Y positive turns toward -X (west)
    cam.rotation.set(0, 0, 0);
    cam.rotation.order = 'YXZ';
    cam.rotation.y = -h;
    cam.rotation.x = pch;
    cam.updateMatrixWorld();
    cam.updateProjectionMatrix();
    return cam;
  }

  private setupCamera(v: BenchView): void {
    const g = this.game;
    const fc = g.flightCamera;
    fc.baseFov = v.camera.fov;
    fc.orbitPitch = 0; fc.orbitYaw = 0;
    if (v.camera.mode === 'fixed') {
      fc.mode = 'fixed';
      const c = this.fixedCamera(v);
      this.fixedPos.copy(c.position);
      g.camera.position.copy(c.position);
      g.camera.quaternion.copy(c.quaternion);
      g.camera.fov = v.camera.fov;
      g.camera.updateProjectionMatrix();
    } else {
      fc.mode = v.camera.mode;
      // the pose the camera holds in steady flight at the view's speed (the still and the clip share it)
      fc.settle(g.aircraft.flight, g.aircraft.model, this.fixedDt);
    }
  }

  private updateCamera(dt: number): void {
    const g = this.game;
    const v = this.view;
    if (v && v.camera.mode === 'fixed') {
      // a following fixed camera dollies with the aircraft, keeping its heading: the frame the still was composed
      // for holds while the world slides past (a plane placed 50 m from a static camera left the frame in ~1 s)
      if (v.camera.follow) g.camera.position.copy(this.fixedPos).add(g.aircraft.flight.position).sub(this.followOrigin);
      return;
    }
    g.flightCamera.update(g.aircraft.flight, g.aircraft.model, dt);
  }

  /** Advance the simulation by n fixed frames (flight enabled) and render the last one. */
  /** Called after every stepped/rendered frame (main.ts refreshes the HUD from the live telemetry here). */
  onFrame: (() => void) | null = null;

  step(n = 1): void {
    const g = this.game;
    for (let i = 0; i < n; i++) {
      g.update(this.fixedDt, true);
      this.updateCamera(this.fixedDt);
      this.frame++;
    }
    this.flying = true;
    this.onFrame?.();
    g.render();
  }

  /** Render the current (frozen) state again without advancing. */
  render(): void { this.game.render(); }

  /** Render and block until the GPU (or software rasterizer) has finished, returning the wall time in ms.
   *  On a real GPU this is a true frame time; on SwiftShader it measures CPU rasterization. */
  renderSync(): number {
    const gl = this.game.renderer.getContext();
    const t0 = performance.now();
    this.game.render();
    gl.finish();
    // reading one pixel forces completion on drivers where finish() is lazy
    const px = new Uint8Array(4);
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    return performance.now() - t0;
  }

  /** Run n synchronous frames (with simulation) and return frame-time statistics. */
  profile(n = 20): { frames: number; avgMs: number; minMs: number; maxMs: number; p95Ms: number; onePercentLowMs: number } {
    const times: number[] = [];
    for (let i = 0; i < n; i++) {
      this.game.update(this.fixedDt, true);
      this.updateCamera(this.fixedDt);
      times.push(this.renderSync());
    }
    const s = times.slice().sort((a, b) => a - b);
    const avg = s.reduce((a, b) => a + b, 0) / s.length;
    return { frames: n, avgMs: avg, minMs: s[0], maxMs: s[s.length - 1], p95Ms: s[Math.floor(s.length * 0.95)], onePercentLowMs: s[s.length - 1] };
  }

  metrics(): unknown {
    const m = this.game.metrics.snapshot();
    const t = this.game.aircraft.flight.telemetry;
    const g = this.game;
    const passes = { ...g.passStats, cascades: g.shadowPassStats.calls.map((c, i) => ({ calls: c, triangles: g.shadowPassStats.triangles[i] })), reflectionHidden: g.reflection.stats.hidden };
    return { ...m, passes, frame: this.frame, flying: this.flying, telemetry: { airspeed: t.airspeed, altitude: t.altitude, heading: t.heading, alpha: t.alpha, stalled: t.stalled, onWater: t.onWater }, build: window.__build, view: this.view?.id ?? null, camera: { pos: this.game.camera.position.toArray(), quat: this.game.camera.quaternion.toArray(), fov: this.game.camera.fov } };
  }

  /** Project world point to screen-normalised coordinates (for objective landmark metrics). */
  project(x: number, y: number, z: number): [number, number] | null {
    const v = new THREE.Vector3(x, y, z).project(this.game.camera);
    if (v.z > 1) return null;
    return [(v.x + 1) / 2, (1 - v.y) / 2];
  }

  /** Landmarks used by the objective metrics script. */
  landmarks(): Record<string, [number, number] | null> {
    const g = this.game;
    const b = g.map.bridges.find((x) => x.id === 'garza-bridge')!;
    const first = b.pts[0], last = b.pts[b.pts.length - 1];
    const plane = g.aircraft.flight.position;
    const lm: Record<string, [number, number] | null> = {
      planeCentroid: this.project(plane.x, plane.y, plane.z),
      bridgeStart: this.project(first[0], 7, first[1]),
      bridgeEnd: this.project(last[0], 7, last[1]),
    };
    for (const l of g.city.landmarkPositions) lm[`landmark:${l.name}`] = this.project(l.x, l.h, l.z);
    const tb = g.map.bridges.find((x) => x.id === 'tortuga-bridge');
    if (tb) lm.bridge2End = this.project(tb.pts[tb.pts.length - 1][0], 7, tb.pts[tb.pts.length - 1][1]);
    lm.horizonCentre = this.project(g.camera.position.x + Math.sin(0) * 50000, 0, g.camera.position.z - 50000);
    // exact screen-space bounding box of the aircraft: every exterior vertex projected (a world AABB would
    // overestimate a yawed/banked aircraft by a wide margin)
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    const v = new THREE.Vector3();
    g.aircraft.model.root.updateMatrixWorld(true);
    for (const m of g.aircraft.model.exteriorMeshes) {
      if (!m.visible) continue;
      const pos = m.geometry.getAttribute('position');
      if (!pos) continue;
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld);
        const c = this.project(v.x, v.y, v.z);
        if (!c) continue;
        x0 = Math.min(x0, c[0]); y0 = Math.min(y0, c[1]); x1 = Math.max(x1, c[0]); y1 = Math.max(y1, c[1]);
      }
    }
    if (Number.isFinite(x0)) { lm.planeBoxMin = [x0, y0]; lm.planeBoxMax = [x1, y1]; }
    // true horizon row: the camera ray that is exactly horizontal in the camera's forward azimuth
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(g.camera.quaternion);
    const hz = new THREE.Vector3(fwd.x, 0, fwd.z).normalize().multiplyScalar(30000).add(g.camera.position);
    lm.horizon = this.project(hz.x, g.camera.position.y, hz.z);
    return lm;
  }
}
