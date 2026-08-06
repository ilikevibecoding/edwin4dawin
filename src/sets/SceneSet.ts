import * as THREE from 'three';
import { applyEnvironment, buildNightSky, HazeField, setupFog, type SkyOptions } from '../render/Atmosphere';
import { RainSystem } from '../render/Rain';
import { WetFloor, REFLECTION_LAYER } from '../render/WetFloor';
import { Tex } from '../render/SharedTextures';
import { createKit, type Kit } from './Kit';
import type { Actor } from '../actors/Actor';
import type { QualitySettings } from '../core/Quality';
import type { LightShaft } from '../render/Volumetric';
import { CharacterLights } from '../render/CharacterLights';
import type { Shot } from '../cine/Framing';

const UP = new THREE.Vector3(0, 1, 0);

interface HazeOptions {
  color?: THREE.ColorRepresentation;
  radius?: number;
  height?: number;
  scale?: number;
  opacity?: number;
}

/**
 * Base class for the game's environments. Owns the scene graph, weather,
 * lighting atmosphere and the actor list, and gives subclasses a small number of
 * hooks so each chapter only has to describe its own geometry and lights.
 */
export abstract class SceneSet {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly kit: Kit = createKit();
  readonly actors = new Map<string, Actor>();

  rain: RainSystem | null = null;
  /** Portrait rig that follows whoever is currently playing the scene. */
  characterLights: CharacterLights | null = null;
  wetFloor: WetFloor | null = null;
  haze: HazeField | null = null;
  protected shafts: LightShaft[] = [];
  protected updatables: ((dt: number, time: number) => void)[] = [];
  protected sky: THREE.DataTexture | null = null;

  constructor(protected quality: QualitySettings) {
    this.camera = new THREE.PerspectiveCamera(35, 16 / 9, 0.08, 600);
    this.camera.position.set(0, 1.7, 4);
  }

  // ------------------------------------------------------------------- helpers

  protected initSky(renderer: THREE.WebGLRenderer, opts: SkyOptions & { envIntensity?: number; backgroundIntensity?: number; rotationY?: number } = {}): void {
    this.sky = buildNightSky({ size: this.quality.envMapSize * 2, ...opts });
    applyEnvironment(this.scene, renderer, this.sky, {
      envIntensity: opts.envIntensity ?? 1,
      backgroundIntensity: opts.backgroundIntensity ?? 1,
      rotationY: opts.rotationY,
    });
  }

  protected initFog(color: THREE.ColorRepresentation, density: number): void {
    setupFog(this.scene, color, density);
  }

  protected initRain(opts: { groundY?: number; boxSize?: number; color?: THREE.ColorRepresentation; intensity?: number } = {}): RainSystem {
    const rain = new RainSystem({
      count: this.quality.rainCount,
      splashCount: this.quality.splashCount,
      groundY: opts.groundY ?? 0,
      boxSize: opts.boxSize ?? 44,
      color: opts.color,
    });
    rain.setIntensity(opts.intensity ?? 1, true);
    this.scene.add(rain.group);
    this.rain = rain;
    return rain;
  }

  protected initWetFloor(opts: { planeY?: number; wetness?: number; strength?: number } = {}): WetFloor {
    const floor = new WetFloor(Tex.ripple, {
      planeY: opts.planeY ?? 0,
      wetness: opts.wetness ?? 1,
      reflectionStrength: opts.strength ?? 0.9,
      resolutionScale: this.quality.reflectionScale,
      enabled: this.quality.planarReflections,
    });
    this.wetFloor = floor;
    if (this.rain) floor.excludeFromReflection(this.rain.group);
    return floor;
  }

  protected initHaze(count: number, opts: HazeOptions = {}): HazeField {
    const haze = new HazeField(count, { texture: Tex.softGlow, ...opts });
    this.scene.add(haze.group);
    this.haze = haze;
    if (this.wetFloor) this.wetFloor.excludeFromReflection(haze.group);
    return haze;
  }

  protected initCharacterLights(opts: Parameters<typeof CharacterLights.prototype.setColors> extends never ? never : ConstructorParameters<typeof CharacterLights>[0] = {}): CharacterLights {
    // The portrait key only casts when the tier can afford a fourth shadow map:
    // on a software rasteriser each one is a full extra scene pass.
    const lights = new CharacterLights({
      shadowMapSize: this.quality.shadowMapSize,
      shadows: this.quality.shadows && this.quality.shadowLights > 2,
      ...opts,
    });
    this.scene.add(lights.group);
    this.characterLights = lights;
    return lights;
  }

  // ------------------------------------------------------------- camera safety

  private occluders: THREE.Mesh[] | null = null;
  private readonly ray = new THREE.Raycaster();

  /**
   * Static geometry the camera must not end up behind.
   *
   * Actors are excluded on purpose: an over-the-shoulder shot is *meant* to sit
   * behind someone's head. Glows, sprites and rain are excluded because they are
   * not solid. Everything else — walls, plant, parapets, the stairwell house —
   * counts, and a shot placed inside one produces a black frame.
   */
  private collectOccluders(): THREE.Mesh[] {
    const skip = new Set<THREE.Object3D>();
    if (this.rain) skip.add(this.rain.group);
    if (this.haze) skip.add(this.haze.group);
    for (const s of this.shafts) skip.add(s.mesh);
    for (const a of this.actors.values()) skip.add(a.root);
    const out: THREE.Mesh[] = [];
    const walk = (o: THREE.Object3D): void => {
      if (skip.has(o) || !o.visible) return;
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh && !(mesh as unknown as THREE.SkinnedMesh).isSkinnedMesh) {
        const mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
        const solid = mat && !(mat as THREE.Material).transparent;
        if (solid && mesh.userData.noCameraCollide !== true) out.push(mesh);
      }
      for (const c of o.children) walk(c);
    };
    walk(this.scene);
    return out;
  }

  /** Drops the cached occluder list; call after changing set geometry. */
  invalidateOccluders(): void {
    this.occluders = null;
  }

  /**
   * Pulls a camera position in until it has line of sight to what it is aiming
   * at. Shots are composed from actor positions and hand-placed viewpoints, and
   * either can drift into a wall when staging changes; without this the result
   * is a frame of solid black or a blurred close-up of a prop's inside face.
   */
  clearCamera(shot: Shot, minDistance = 0.5): void {
    const offset = new THREE.Vector3().subVectors(shot.position, shot.target);
    const far = offset.length();
    if (far < minDistance) return;
    if (!this.occluders) this.occluders = this.collectOccluders();

    // Anyone the shot is not built around is an obstacle. Standing a camera
    // inside a bystander produces a frame of unreadable limbs, and the troopers
    // on the roof stand close enough together for a clean single on one of them
    // to land inside another.
    const crowd: THREE.Vector3[] = [];
    for (const a of this.actors.values()) {
      if (shot.subjects?.includes(a)) continue;
      crowd.push(a.getChestPosition(new THREE.Vector3()));
    }

    const candidate = new THREE.Vector3();
    const swings = [0, 0.4, -0.4, 0.85, -0.85, 1.35, -1.35];
    let fallback: THREE.Vector3 | null = null;
    for (const swing of swings) {
      candidate.copy(offset).applyAxisAngle(UP, swing).add(shot.target);
      const clamped = this.firstClearDistance(shot.target, candidate, minDistance);
      const position = clamped.position;
      if (!fallback) fallback = position.clone();
      if (clamped.blocked) continue;
      if (crowd.some((p) => p.distanceTo(position) < 0.62)) continue;
      shot.position.copy(position);
      return;
    }
    if (fallback) shot.position.copy(fallback);
  }

  /** Distance along target -> position that still has line of sight. */
  private firstClearDistance(
    target: THREE.Vector3,
    position: THREE.Vector3,
    minDistance: number
  ): { position: THREE.Vector3; blocked: boolean } {
    const dir = new THREE.Vector3().subVectors(position, target);
    const far = dir.length();
    dir.divideScalar(far);
    // Start a little way out so geometry at the aim point itself — the floor an
    // insert is framing, the prop being examined — is not treated as an occluder.
    const skin = 0.3;
    this.ray.set(new THREE.Vector3().copy(target).addScaledVector(dir, skin), dir);
    this.ray.near = 0;
    this.ray.far = Math.max(0.001, far - skin);
    const hits = this.ray.intersectObjects(this.occluders ?? [], false);
    if (!hits.length) return { position: position.clone(), blocked: false };
    const distance = Math.max(minDistance, skin + hits[0].distance - 0.15);
    return {
      position: new THREE.Vector3().copy(target).addScaledVector(dir, Math.min(distance, far)),
      blocked: true,
    };
  }

  /** Points the portrait rig at a subject, keeping the key off the camera axis. */
  lightSubject(subject: THREE.Vector3, opts: { keySide?: number; height?: number } = {}): void {
    this.characterLights?.aim(subject, this.camera.getWorldPosition(new THREE.Vector3()), opts);
  }

  protected addShaft(shaft: LightShaft, reflectable = false): LightShaft {
    this.shafts.push(shaft);
    if (!reflectable) this.wetFloor?.excludeFromReflection(shaft.mesh);
    return shaft;
  }

  /** Marks geometry as visible in wet-floor reflections. */
  protected reflect(obj: THREE.Object3D): void {
    obj.traverse((o) => o.layers.enable(REFLECTION_LAYER));
  }

  addActor(key: string, actor: Actor, opts: { reflect?: boolean } = {}): Actor {
    this.actors.set(key, actor);
    this.scene.add(actor.root);
    if (opts.reflect !== false) this.reflect(actor.root);
    return actor;
  }

  actor(key: string): Actor {
    const a = this.actors.get(key);
    if (!a) throw new Error(`actor '${key}' not in set`);
    return a;
  }

  hasActor(key: string): boolean {
    return this.actors.has(key);
  }

  onUpdate(fn: (dt: number, time: number) => void): void {
    this.updatables.push(fn);
  }

  // --------------------------------------------------------------------- frame

  update(dt: number, time: number): void {
    for (const a of this.actors.values()) a.update(dt, time);
    for (const fn of this.updatables) fn(dt, time);
    // The renderer refreshes world matrices on its way to drawing, but the frame
    // also projects world points (the investigation reticle) and raycasts against
    // the set (camera clearance) before anything is drawn — and during a
    // fast-forward nothing is drawn at all. Doing it here keeps a simulated frame
    // and a rendered frame in agreement, which is what makes a resumed capture
    // continue the same film rather than a similar one.
    this.scene.updateMatrixWorld(true);
    const camPos = this.camera.getWorldPosition(new THREE.Vector3());
    for (const s of this.shafts) s.update(time, camPos);
    this.rain?.update(dt, this.camera);
    this.haze?.update(time);
  }

  /** Runs before the main frame is composed (mirror pass). */
  preRender(renderer: THREE.WebGLRenderer, time: number): void {
    this.wetFloor?.render(renderer, this.scene, this.camera, time);
  }

  dispose(): void {
    this.rain?.dispose();
    this.wetFloor?.dispose();
    this.haze?.dispose();
    for (const s of this.shafts) s.dispose();
    for (const a of this.actors.values()) a.dispose();
    this.scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
    });
  }
}
