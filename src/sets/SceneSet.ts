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
    const lights = new CharacterLights({ shadowMapSize: this.quality.shadowMapSize, shadows: this.quality.shadows, ...opts });
    this.scene.add(lights.group);
    this.characterLights = lights;
    return lights;
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
